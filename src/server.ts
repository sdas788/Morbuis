import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { loadAllTestCases, loadTestCaseMarkdownBody, loadAllBugs, loadAllCategories, loadAllRuns, loadProjectRegistry, saveProjectRegistry, loadProjectConfig, saveProjectConfig, getDataDir, updateTestCaseById, updateBugById, writeBug, writeBugImpact, readBugImpact, writeHealingProposal, readHealingProposal, loadAllHealingProposals, writeTestCase as writeTestCaseToDisk, writeAppMapNarrative, readAppMapNarrative, loadAutomationPlan, saveAutomationPlan } from './parsers/markdown.js';
import type { AutomationPlan, AutomationCandidate, ProposedFlow } from './types.js';
import { importExcel, parseExcelFile, writeParsedExcel, type ParsedExcel } from './parsers/excel.js';
import { parsePMAgentProject, publishTestPlansToPMAgent, recomputeSourceChecksum, type PMAgentParseResult } from './parsers/pmagent.js';
import { runAgentTask } from './runners/web-agent.js';
import { parseMaestroYaml, stepsToHtml, replaceSelector as replaceSelectorInFlow, replaceSelectorInText } from './parsers/maestro-yaml.js';
import { parseCalculatorConfig, buildCoverageMatrix, findFiles } from './parsers/calculator-config.js';
import { detectFlakyTests, calculateCategoryHealth, findCoverageGaps, buildActivityFeed } from './analyzer.js';
import type { TestCase, Bug, BugImpact, BugImpactRelatedTest, Category, CategoryHealth, TestStatus, ProjectConfig, ProjectRegistry, MaestroRunRecord, LatestRunPointer, RepairRun, SuiteRun, HealingProposal, HealingState, AppMapNarrative, AppMapPerFlow } from './types.js';
import { DATA_DIR } from './data-dir.js';

// Server port (set when startServer is called, used in sync-all self-call)
let serverPort = 3000;

// Active test runs (in-memory tracking)
const activeRuns = new Map<string, {
  testId: string;
  platform: string;
  status: 'running' | 'passed' | 'failed' | 'canceled';
  startTime: number;
  endTime?: number;
  output: string;
  child?: ChildProcess;
  canceled?: boolean;
}>();

// Active run stream subscribers: runId → Set of WebSocket connections
const runStreamSubscribers = new Map<string, Set<WebSocket>>();

// Repair runs
const repairRuns = new Map<string, RepairRun>();

// Suite runs
const suiteRuns = new Map<string, SuiteRun>();

function getActiveProjectDir(): string {
  const registry = loadProjectRegistry();
  if (registry.activeProject) {
    return path.join(DATA_DIR, registry.activeProject);
  }
  // Fallback: if no project set but data/tests exists (legacy), use root data dir
  if (fs.existsSync(path.join(DATA_DIR, 'tests'))) return DATA_DIR;
  return DATA_DIR;
}

export function startServer(port: number): void {
  serverPort = port;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    // API routes
    if (pathname.startsWith('/api/')) {
      handleApi(pathname, url, req, res);
      return;
    }

    // Screenshot serving
    if (pathname.startsWith('/screenshots/')) {
      serveScreenshot(pathname, res);
      return;
    }

    // Media serving (videos + screenshots from project mediaPath — outside Morbius repo)
    if (pathname.startsWith('/media/')) {
      serveMedia(pathname, res);
      return;
    }

    // App bundle — compiled once at startup, served as its own resource so it can
    // load with defer (HTML paints the shell immediately) and revalidate cheaply.
    if (pathname === '/app.js') {
      const js = getCompiledDashboardJS();
      if (js !== null) {
        if (req.headers['if-none-match'] === getCompiledDashboardETag()) {
          res.writeHead(304);
          res.end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'ETag': getCompiledDashboardETag() });
        res.end(js);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('precompile unavailable — page is on the inline Babel fallback');
      }
      return;
    }

    // Serve the SPA
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHtml());
  });

  // WebSocket server for Claude Code chat bridge
  // Use noServer:true and dispatch upgrades manually so multiple WSS instances
  // sharing the same HTTP server don't collide. (When two WSS use {server, path},
  // the first one to register sends HTTP 400 for paths that don't match its filter
  // before the second one can claim the socket — that's why /ws/run-stream returned
  // 400 even though the endpoint was registered. Bug fix 2026-04-30.)
  const wss = new WebSocketServer({ noServer: true });
  const activeProcesses = new Map<WebSocket, ChildProcess>();

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const msg = data.toString();
      let parsed: { message?: string } = {};
      try { parsed = JSON.parse(msg); } catch { parsed = { message: msg }; }
      const userMessage = parsed.message ?? msg;

      // Kill any existing process for this connection
      const existing = activeProcesses.get(ws);
      if (existing) {
        existing.kill('SIGTERM');
        activeProcesses.delete(ws);
      }

      // Spawn Claude Code CLI
      const child = spawn('claude', [
        '--print',
        '--model', 'claude-sonnet-4-6',
        userMessage,
      ], {
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Don't wait for stdin — close it immediately so claude doesn't block
      child.stdin.end();

      activeProcesses.set(ws, child);

      // 120s timeout — kill if claude hangs
      const wsTimeout = setTimeout(() => {
        child.kill('SIGTERM');
        activeProcesses.delete(ws);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', content: 'Request timed out after 120s' }));
        }
      }, 120_000);

      child.stdout.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'chunk', content: chunk.toString() }));
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        // stderr = tool-use status lines — send as info, not error
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'info', content: chunk.toString() }));
        }
      });

      child.on('close', (code) => {
        clearTimeout(wsTimeout);
        activeProcesses.delete(ws);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'done', exitCode: code }));
        }
      });

      child.on('error', (err) => {
        clearTimeout(wsTimeout);
        activeProcesses.delete(ws);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', content: err.message }));
        }
      });
    });

    ws.on('close', () => {
      const existing = activeProcesses.get(ws);
      if (existing) {
        existing.kill('SIGTERM');
        activeProcesses.delete(ws);
      }
    });
  });

  // WebSocket server for live run log streaming (noServer + manual dispatch — see bug fix note above)
  const runStreamWss = new WebSocketServer({ noServer: true });

  // Single upgrade dispatcher — routes WS upgrades to the correct WSS based on path
  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://x').pathname;
    if (pathname === '/ws/chat') {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    } else if (pathname === '/ws/run-stream') {
      runStreamWss.handleUpgrade(req, socket, head, (ws) => runStreamWss.emit('connection', ws, req));
    } else {
      socket.destroy();
    }
  });

  runStreamWss.on('connection', (ws) => {
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && msg.runId) {
          if (!runStreamSubscribers.has(msg.runId)) {
            runStreamSubscribers.set(msg.runId, new Set());
          }
          runStreamSubscribers.get(msg.runId)!.add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', runId: msg.runId }));
        }
      } catch { /* ignore malformed */ }
    });
    ws.on('close', () => {
      // Remove from all subscriber sets
      for (const [runId, subs] of runStreamSubscribers) {
        subs.delete(ws);
        if (subs.size === 0) runStreamSubscribers.delete(runId);
      }
    });
  });

  server.listen(port, () => {
    console.log(`\n  Morbius Dashboard`);
    console.log(`  Local:    http://localhost:${port}`);
    console.log(`  data dir: ${DATA_DIR}\n`);
    // S-013-004: start the replay queue ticker (60s) once the HTTP server is up.
    startJiraReplayTimer();
  });
}

// Broadcast a message to all WebSocket subscribers for a runId
function broadcastRunEvent(runId: string, payload: object): void {
  const subs = runStreamSubscribers.get(runId);
  if (!subs) return;
  const msg = JSON.stringify(payload);
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// Parse failure info from Maestro stdout
function parseFailureInfo(output: string): { failingStep: string | null; errorLine: string | null } {
  const lines = output.split('\n');
  let failingStep: string | null = null;
  let errorLine: string | null = null;

  for (const line of lines) {
    // Maestro failure line patterns
    if (line.includes('No visible element found') ||
        line.includes('AssertionError') ||
        line.includes('Element not found') ||
        line.includes('Timeout waiting') ||
        line.includes('FAILED')) {
      if (!errorLine) errorLine = line.trim();
    }
    // Step identifier lines (contain 'tapOn', 'scrollUntilVisible', etc.)
    if (line.match(/\s+(tapOn|scrollUntilVisible|assertVisible|inputText|swipe)\s*[:{]/)) {
      failingStep = line.trim();
    }
  }
  return { failingStep, errorLine };
}

// Classify a Maestro failure into a user-friendly category + hint.
// Falls through to 'unknown' if no pattern matches — UI then shows raw stack only.
type FailureClassification = {
  category: string;
  label: string;
  hint: string;
} | null;
function classifyFailure(output: string): FailureClassification {
  const o = output;
  // Maestro driver gRPC failure — covers all known variants:
  //   - "Connection refused: localhost:7001"           (driver never started — APK not installed)
  //   - "UNAVAILABLE: io exception" + MaestroDriverGrpc (driver crashed mid-run)
  //   - "Command failed (tcp:7001): closed"           (driver crashed on instrumentation start — common on API 36)
  //   - "io.grpc.StatusRuntimeException: UNAVAILABLE" + tcp:7001 anywhere
  if (
    /Connection refused.*7001/.test(o) ||
    /Command failed \(tcp:7001\)/.test(o) ||
    (/UNAVAILABLE/.test(o) && /MaestroDriverGrpc|tcp:7001/.test(o))
  ) {
    // Detect the API-36-specific failure (driver instrument-launches then crashes)
    const apiMismatch = /Process crashed|PACKAGE_FULLY_REMOVED.*dev\.mobile\.maestro/.test(o)
      || /API 3[6-9]/.test(o); // future-proof against API 37/38
    return {
      category: 'driver-not-running',
      label: apiMismatch
        ? 'Maestro driver crashed on this Android version'
        : 'Maestro driver not connected to the device',
      hint: apiMismatch
        ? 'The Maestro driver crashes on this Android API level (commonly Android 16 / API 36). Maestro 2.5.x does not yet support API 36. Fix: create an emulator with API 33 or 34 — `sdkmanager "system-images;android-34;google_apis;arm64-v8a"` then `avdmanager create avd -n MaestroTest -k "system-images;android-34;google_apis;arm64-v8a"`.'
        : 'The Maestro Android driver is not reachable. Try: (1) `maestro studio` once to bootstrap the driver, (2) restart the emulator, (3) `adb forward tcp:7001 tcp:7001`, or (4) check that the emulator API level is supported by your Maestro version (`maestro --version`).',
    };
  }
  // No device connected at all
  if (/No connected devices|No devices? found|Device not found/i.test(o)) {
    return {
      category: 'no-device',
      label: 'No device or emulator connected',
      hint: 'Start an emulator in Android Studio (or boot a simulator with `xcrun simctl boot <udid>`) before running. Verify with `adb devices` (Android) or `xcrun simctl list devices booted` (iOS).',
    };
  }
  // Maestro CLI itself missing (won't usually fire — spawn errors first — but still good to catch)
  if (/maestro: command not found|spawn maestro ENOENT/.test(o)) {
    return {
      category: 'maestro-missing',
      label: 'Maestro CLI not installed',
      hint: 'Install with: `curl -Ls "https://get.maestro.mobile.dev" | bash`, then add `~/.maestro/bin` to your PATH.',
    };
  }
  // App APK install failed
  if (/INSTALL_FAILED|Failed to install/i.test(o)) {
    return {
      category: 'install-failed',
      label: 'App install failed',
      hint: 'The APK or .app could not be installed. Common causes: signature mismatch with previously installed version (uninstall first), insufficient device storage, or Play Protect blocking the install.',
    };
  }
  // Test app not found
  if (/(App|Bundle).*not installed|launchApp.*failed/i.test(o)) {
    return {
      category: 'app-not-installed',
      label: 'Target app not installed on device',
      hint: 'The app under test (`appId` in the YAML) is not installed on the emulator. Install the APK/.app first, or add an `installApp` step at the top of the flow.',
    };
  }
  // Element selector miss (most common runtime failure)
  if (/(No visible element found|Element not found|Timeout.*element)/i.test(o)) {
    return {
      category: 'element-not-found',
      label: 'Element selector did not resolve',
      hint: 'The selector in the failing step did not match anything visible on screen. Common causes: app screen changed (selector drift — try Self-Healing if E-017 is wired), wait too short, element off-screen, or different locale/strings.',
    };
  }
  // Assertion failed (assertVisible, assertNotVisible)
  if (/AssertionError|assert.*failed/i.test(o)) {
    return {
      category: 'assertion-failed',
      label: 'Assertion failed',
      hint: 'An `assertVisible` or similar check did not pass. The test ran but the expected condition was not met — likely a real bug in the app, not a flow issue.',
    };
  }
  // Plain timeout
  if (/Timeout waiting|TimeoutException/i.test(o)) {
    return {
      category: 'timeout',
      label: 'Step timed out',
      hint: 'A step exceeded its wait budget. Either the app is genuinely slow (network, animation), or the awaited element will not appear (selector drift). Bump the wait or fix the selector.',
    };
  }
  return null;
}

// Pull Maestro's own debug folder path (it prints "Debug output (logs & screenshots): /path")
function parseDebugFolder(output: string): string | null {
  const m = output.match(/Debug output[^\n]*?:\s*(\S+)/);
  return m ? m[1].trim() : null;
}

// Live device fleet — what's actually booted on this host right now.
// Used by:
//   - /api/health (mobile readiness)
//   - /api/devices/fleet (Devices tab — fleet snapshot card)
//   - resolveDeviceSlug() to attribute a Maestro run to a configured device
//
// All shell-outs are wrapped with a 5s timeout and try/catch — never hangs the caller.
// Returns empty arrays if adb/xcrun aren't installed or no devices are booted.
export type LiveDevice = {
  platform: 'android' | 'ios';
  name: string;          // human-readable: "Medium_Phone_API_36" or "iPhone 15 Pro"
  udid: string;          // emulator-5554 or a UUID
  model?: string;        // Android only: "sdk_gphone64_arm64" from adb -l
  apiLevel?: string;     // Android only: "36"
  osVersion?: string;    // iOS only: "17.4"
  configMatch?: string;  // Device.id slug from ProjectConfig.devices, if matched
};
export type LiveFleet = { android: LiveDevice[]; ios: LiveDevice[] };

function getExecEnv(): NodeJS.ProcessEnv {
  // Mirror the PATH-extension trick used in /api/health — Maestro/adb may live
  // outside the parent shell's PATH (e.g. ~/.maestro/bin, Android SDK platform-tools).
  const HOME = os.homedir();
  const extendedPath = [
    process.env.PATH,
    `${HOME}/.maestro/bin`,
    `${HOME}/Library/Android/sdk/platform-tools`,
    ...(() => { try { const nvmDir = `${HOME}/.nvm/versions/node`; return fs.existsSync(nvmDir) ? fs.readdirSync(nvmDir).map((v: string) => `${nvmDir}/${v}/bin`) : []; } catch { return []; } })(),
  ].filter(Boolean).join(':');
  return { ...process.env, PATH: extendedPath };
}

function getLiveDeviceFleet(configured: Array<{ id: string; name: string; platform: 'ios' | 'android' }> = []): LiveFleet {
  const env = getExecEnv();
  const fleet: LiveFleet = { android: [], ios: [] };

  // --- Android: adb devices -l prints "<udid>  <state>  product:<x> model:<y> device:<z>"
  try {
    const out = execSync('adb devices -l 2>/dev/null', { timeout: 5000, env }).toString();
    for (const line of out.split('\n')) {
      const m = line.match(/^(\S+)\s+device\b(.*)$/);
      if (!m) continue;
      const udid = m[1];
      const tail = m[2] || '';
      const modelMatch = tail.match(/model:(\S+)/);
      const productMatch = tail.match(/product:(\S+)/);
      // Try to grab API level via getprop (cheap, ~50ms). Best-effort, don't block fleet.
      let apiLevel: string | undefined;
      try {
        apiLevel = execSync(`adb -s ${udid} shell getprop ro.build.version.sdk 2>/dev/null`, { timeout: 2000, env }).toString().trim() || undefined;
      } catch { /* ignore */ }
      fleet.android.push({
        platform: 'android',
        name: productMatch?.[1] || modelMatch?.[1] || udid,
        udid,
        model: modelMatch?.[1],
        apiLevel,
      });
    }
  } catch { /* adb not installed or no daemon */ }

  // --- iOS: xcrun simctl list devices booted -j returns a JSON tree
  try {
    const out = execSync('xcrun simctl list devices booted -j 2>/dev/null', { timeout: 5000, env }).toString();
    const parsed = JSON.parse(out) as { devices?: Record<string, Array<{ udid: string; name: string; state: string }>> };
    for (const [runtime, devs] of Object.entries(parsed.devices || {})) {
      // runtime example: "com.apple.CoreSimulator.SimRuntime.iOS-17-4"
      const osMatch = runtime.match(/iOS[-_](\d+)[-_](\d+)/);
      const osVersion = osMatch ? `${osMatch[1]}.${osMatch[2]}` : undefined;
      for (const d of devs) {
        if (d.state !== 'Booted') continue;
        fleet.ios.push({
          platform: 'ios',
          name: d.name,
          udid: d.udid,
          osVersion,
        });
      }
    }
  } catch { /* xcrun not installed */ }

  // Match each live device to a configured slug (by platform + name heuristic).
  // First-match wins; multiple emulators of the same platform map to the same slug
  // (acceptable for v1 — single-device sessions are the norm).
  const matchOne = (live: LiveDevice): string | undefined => {
    const candidates = configured.filter(c => c.platform === live.platform);
    if (candidates.length === 1) return candidates[0].id;          // unambiguous
    if (candidates.length === 0) return undefined;                 // no config of this platform
    // Try a name-substring match; fall back to first candidate
    const lowerLive = live.name.toLowerCase();
    const named = candidates.find(c => lowerLive.includes(c.name.toLowerCase()) || lowerLive.includes(c.id.toLowerCase()));
    return (named ?? candidates[0]).id;
  };
  fleet.android.forEach(d => { d.configMatch = matchOne(d); });
  fleet.ios.forEach(d => { d.configMatch = matchOne(d); });

  return fleet;
}

// Resolve the configured device slug for a Maestro spawn. Best-effort:
// returns undefined if no booted device of the requested platform matches config.
function resolveDeviceSlug(platform: string): string | undefined {
  if (platform !== 'android' && platform !== 'ios') return undefined;
  const reg = loadProjectRegistry();
  const project = reg.projects.find(p => p.id === reg.activeProject);
  const configured = (project?.devices || []).map(d => ({ id: d.id, name: d.name, platform: d.platform }));
  if (configured.length === 0) return undefined;
  const fleet = getLiveDeviceFleet(configured);
  const list = platform === 'android' ? fleet.android : fleet.ios;
  return list[0]?.configMatch;
}

// Capture screenshot from connected device/emulator
async function captureScreenshot(platform: string, runId: string, testId: string, projectDir: string): Promise<string | null> {
  try {
    const screenshotDir = path.join(projectDir, 'screenshots', runId);
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotFile = path.join(screenshotDir, testId.replace(/[^a-zA-Z0-9-_]/g, '_') + '.png');
    const relPath = path.join('screenshots', runId, testId.replace(/[^a-zA-Z0-9-_]/g, '_') + '.png');

    if (platform === 'android') {
      execSync(`adb shell screencap -p /sdcard/morbius_tmp.png && adb pull /sdcard/morbius_tmp.png "${screenshotFile}" && adb shell rm /sdcard/morbius_tmp.png`, { timeout: 10000 });
    } else if (platform === 'ios') {
      execSync(`xcrun simctl io booted screenshot "${screenshotFile}"`, { timeout: 10000 });
    } else {
      return null;
    }

    return fs.existsSync(screenshotFile) ? relPath : null;
  } catch {
    return null; // non-fatal
  }
}

// Write run record to disk
function writeRunRecord(record: MaestroRunRecord, projectDir: string): void {
  try {
    const runsDir = path.join(projectDir, 'runs');
    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(path.join(runsDir, record.runId + '.json'), JSON.stringify(record, null, 2));
    // Write latest pointer
    const latestPointer: LatestRunPointer = {
      runId: record.runId,
      screenshotPath: record.screenshotPath ?? null,
      status: record.status,
      failingStep: record.failingStep ?? null,
      errorLine: record.errorLine ?? null,
      timestamp: record.endTime ?? new Date().toISOString(),
      failureCategory: record.failureCategory,
      friendlyError: record.friendlyError,
      hint: record.hint,
      device: record.device,
    };
    fs.writeFileSync(
      path.join(runsDir, record.testId.replace(/[^a-zA-Z0-9-_]/g, '_') + '-latest.json'),
      JSON.stringify(latestPointer, null, 2)
    );
  } catch { /* non-fatal */ }
}

function handleApi(pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const dir = getActiveProjectDir();

  try {
    // --- System Health Check (runs real commands) ---
    if (pathname === '/api/health') {
      const checks: Record<string, { ok: boolean; detail: string }> = {};

      // Extend PATH to find tools installed via homebrew, nvm, maestro, android sdk
      const HOME = process.env.HOME ?? '';
      const extendedPath = [
        process.env.PATH,
        '/opt/homebrew/bin',
        '/usr/local/bin',
        `${HOME}/.maestro/bin`,
        `${HOME}/Library/Android/sdk/platform-tools`,
        // Find nvm node path dynamically
        ...(() => { try { const fs = require('fs'); const nvmDir = `${HOME}/.nvm/versions/node`; return fs.existsSync(nvmDir) ? fs.readdirSync(nvmDir).map((v: string) => `${nvmDir}/${v}/bin`) : []; } catch { return []; } })(),
      ].filter(Boolean).join(':');
      const execEnv = { ...process.env, PATH: extendedPath };

      // Check Maestro CLI
      try {
        const ver = execSync('maestro --version 2>/dev/null || echo "not found"', { timeout: 5000, env: execEnv }).toString().trim();
        checks.maestro = { ok: !ver.includes('not found'), detail: ver.includes('not found') ? 'Not installed' : ver };
      } catch {
        checks.maestro = { ok: false, detail: 'Not installed' };
      }

      // Check Android emulator/device
      try {
        const devices = execSync('adb devices 2>/dev/null | grep -v "List" | grep -v "^$" || echo ""', { timeout: 5000, env: execEnv }).toString().trim();
        const hasDevice = devices.length > 0 && !devices.includes('not found');
        checks.android = { ok: hasDevice, detail: hasDevice ? devices.split('\n')[0].split('\t')[0] : 'No device' };
      } catch {
        checks.android = { ok: false, detail: 'adb not available' };
      }

      // Check iOS simulator
      try {
        const sims = execSync('xcrun simctl list devices booted 2>/dev/null | grep "Booted" || echo ""', { timeout: 5000, env: execEnv }).toString().trim();
        const hasSim = sims.length > 0;
        const simName = hasSim ? sims.match(/\s+(.+?)\s+\(/)?.[1] ?? 'Booted' : 'None running';
        checks.ios = { ok: hasSim, detail: simName };
      } catch {
        checks.ios = { ok: false, detail: 'Xcode tools not available' };
      }

      // E-024 / S-024-007: web project health checks. Always returned alongside
      // mobile checks; UI renders only the slice matching the active project's type.
      try {
        const pluginPath = `${HOME}/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/playwright`;
        const ok = fs.existsSync(pluginPath);
        checks.playwright = { ok, detail: ok ? 'plugin installed' : 'not installed (~/.claude/plugins/.../playwright)' };
      } catch {
        checks.playwright = { ok: false, detail: 'check failed' };
      }
      try {
        // Heuristic: Claude in Chrome connects via the user's browser extension. We can't directly probe the bridge from here,
        // but we can detect whether Chrome itself is running on the host as a coarse readiness signal.
        const ps = execSync('ps -A 2>/dev/null | grep -i "Google Chrome" | grep -v grep | head -1 || echo ""', { timeout: 3000, env: execEnv }).toString().trim();
        const ok = ps.length > 0;
        checks.chrome = { ok, detail: ok ? 'Chrome running (extension status not probed)' : 'Chrome not running' };
      } catch {
        checks.chrome = { ok: false, detail: 'check failed' };
      }
      // Reachability of the active project's webUrl, when configured.
      // Uses Node's built-in http/https with a short timeout so it can't hang the
      // whole /api/health response. The probe runs as a Promise so we don't need to
      // make the outer request handler async.
      const reg = loadProjectRegistry();
      const proj = reg.projects.find(p => p.id === reg.activeProject) as { projectType?: string; webUrl?: string } | undefined;
      if (proj?.projectType === 'web' && proj.webUrl) {
        const u = proj.webUrl;
        const probe = new Promise<number>((resolve) => {
          try {
            // The top-level `http` import is in scope; for https URLs we use a fetch fallback
            // since adding an https import here would touch a lot of code for one check.
            if (u.startsWith('https:')) {
              fetch(u, { method: 'GET', signal: AbortSignal.timeout(3000) })
                .then(r => resolve(r.status))
                .catch(() => resolve(0));
              return;
            }
            const req = http.get(u, { timeout: 3000 }, (resp) => {
              resolve(resp.statusCode ?? 0);
              resp.resume(); // drain to let the connection close cleanly
            });
            req.on('error', () => resolve(0));
            req.on('timeout', () => { req.destroy(); resolve(0); });
          } catch { resolve(0); }
        });
        probe.then(status => {
          const ok = status >= 200 && status < 400;
          checks.targetUrl = { ok, detail: status > 0 ? `${u} (HTTP ${status})` : `${u} unreachable` };
          json(res, checks);
        }).catch(() => {
          checks.targetUrl = { ok: false, detail: `${u} probe failed` };
          json(res, checks);
        });
        return;
      }

      json(res, checks);
      return;
    }

    // --- Project Management ---
    if (pathname === '/api/projects') {
      const registry = loadProjectRegistry();
      json(res, registry);
    } else if (pathname === '/api/projects/switch' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const { projectId } = JSON.parse(body);
          const registry = loadProjectRegistry();
          if (!registry.projects.find(p => p.id === projectId)) {
            res.writeHead(404); res.end('{"error":"Project not found"}'); return;
          }
          registry.activeProject = projectId;
          saveProjectRegistry(registry);
          json(res, { ok: true, activeProject: projectId });
        } catch { res.writeHead(400); res.end('{"error":"Invalid request"}'); }
      });
      return;
    } else if (pathname === '/api/projects/create' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const config = JSON.parse(body) as ProjectConfig;
          config.id = config.id || slugify(config.name);
          config.created = new Date().toISOString().split('T')[0];
          config.devices = config.devices || [
            { id: 'ipad', name: 'iPad', platform: 'ios' },
            { id: 'iphone', name: 'iPhone', platform: 'ios' },
            { id: 'android-tab', name: 'Android Tablet', platform: 'android' },
            { id: 'android-phone', name: 'Android Phone', platform: 'android' },
          ];
          saveProjectConfig(config);
          const registry = loadProjectRegistry();
          if (!registry.projects.find(p => p.id === config.id)) {
            registry.projects.push(config);
          }
          registry.activeProject = config.id;
          saveProjectRegistry(registry);
          json(res, { ok: true, project: config });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;
    }

    // --- Data APIs (scoped to active project) ---
    else if (pathname === '/api/tests') {
      json(res, loadAllTestCases(dir));
    } else if (pathname === '/api/bugs') {
      json(res, loadAllBugs(dir));
    } else if (pathname === '/api/categories') {
      json(res, loadAllCategories(dir));
    } else if (pathname === '/api/runs') {
      json(res, loadAllRuns(dir));
    } else if (pathname === '/api/dashboard') {
      json(res, buildDashboardData(dir));
    } else if (pathname.startsWith('/api/test/') && req.method === 'GET' && !pathname.includes('/update') && !pathname.includes('/reorder') && !pathname.includes('/run')) {
      const id = decodeURIComponent(pathname.replace('/api/test/', ''));
      const tests = loadAllTestCases(dir);
      const test = tests.find(t => t.id === id);
      if (!test) { res.writeHead(404); res.end('{"error":"Not found"}'); return; }

      let maestroHtml = '';
      let maestroYaml = '';
      let selectorWarnings: { line: number; command: string; issue: string }[] = [];
      if (test.maestroFlow && fs.existsSync(test.maestroFlow)) {
        try {
          const flow = parseMaestroYaml(test.maestroFlow);
          maestroHtml = stepsToHtml(flow.steps);
          maestroYaml = fs.readFileSync(test.maestroFlow, 'utf-8');
          selectorWarnings = flow.selectorWarnings;
        } catch { /* skip */ }
      }

      const markdownBody = loadTestCaseMarkdownBody(id, dir);

      // Phase 3: source-drift vs the PMAgent AC/test-plan this card was imported from.
      let drift = 'none';
      const src = (test as any).pmagentSource;
      if ((test as any).pmagentLocked) {
        drift = 'pinned';
      } else if (src && src.sourcePath) {
        if (!fs.existsSync(src.sourcePath)) {
          drift = 'source-missing';
        } else {
          const live = recomputeSourceChecksum(src.sourcePath, src.acIndex);
          drift = live == null ? 'source-missing' : (live === src.sourceChecksum ? 'in-sync' : 'drifted');
        }
      }

      json(res, { ...test, maestroHtml, maestroYaml, selectorWarnings, markdownBody, drift });
    } else if (pathname.startsWith('/api/bug/') && req.method === 'GET' && !pathname.includes('/update') && !pathname.includes('/create') && !pathname.includes('/impact')) {
      const id = decodeURIComponent(pathname.replace('/api/bug/', ''));
      const bugs = loadAllBugs(dir);
      const bug = bugs.find(b => b.id === id);
      if (!bug) { res.writeHead(404); res.end('{"error":"Not found"}'); return; }
      json(res, bug);
    } else if (pathname === '/api/device-matrix') {
      const tests = loadAllTestCases(dir);
      const devices = getDeviceList();
      const matrix = tests.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        devices: devices.map(d => {
          const result = t.deviceResults.find(dr => dr.device === d.id);
          return { device: d.id, name: d.name, status: result?.status ?? 'not-run' };
        }),
      }));
      json(res, { devices, matrix });

    // --- Update APIs ---
    } else if (pathname === '/api/test/update' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const { id, status, priority, notes } = JSON.parse(body);
          if (!id) { res.writeHead(400); res.end('{"error":"id required"}'); return; }
          const ok = updateTestCaseById(id, { status, priority, notes }, dir);
          if (ok) json(res, { ok: true });
          else { res.writeHead(404); res.end('{"error":"Test not found"}'); }
        } catch { res.writeHead(400); res.end('{"error":"Invalid request"}'); }
      });
      return;
    } else if (pathname === '/api/test/reorder' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const { id, direction } = JSON.parse(body);
          if (!id || !direction) { res.writeHead(400); res.end('{"error":"id and direction required"}'); return; }

          // Load all tests, find the target and its category siblings
          const allTests = loadAllTestCases(dir);
          const target = allTests.find(t => t.id === id);
          if (!target) { res.writeHead(404); res.end('{"error":"Test not found"}'); return; }

          const siblings = allTests
            .filter(t => t.category === target.category)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

          const idx = siblings.findIndex(t => t.id === id);
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= siblings.length) {
            json(res, { ok: true, message: 'Already at boundary' });
            return;
          }

          const swapTest = siblings[swapIdx];
          const targetOrder = target.order ?? (idx + 1);
          const swapOrder = swapTest.order ?? (swapIdx + 1);

          updateTestCaseById(id, { order: swapOrder }, dir, 'dashboard-reorder');
          updateTestCaseById(swapTest.id, { order: targetOrder }, dir, 'dashboard-reorder');
          json(res, { ok: true });
        } catch { res.writeHead(400); res.end('{"error":"Invalid request"}'); }
      });
      return;
    } else if (pathname === '/api/bug/update' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const { id, status, priority, notes } = JSON.parse(body);
          if (!id) { res.writeHead(400); res.end('{"error":"id required"}'); return; }
          const ok = updateBugById(id, { status, priority, notes }, dir);
          if (!ok) { res.writeHead(404); res.end('{"error":"Bug not found"}'); return; }
          // S-013-003: fire-and-forget Jira write-back. Failures self-enqueue in the replay queue.
          pushBugWriteback(id, dir, { status, priority, notes });
          json(res, { ok: true });
        } catch { res.writeHead(400); res.end('{"error":"Invalid request"}'); }
      });
      return;
    } else if (pathname === '/api/test/run' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const { testId, platform } = JSON.parse(body);
          if (!testId || !platform) { res.writeHead(400); res.end('{"error":"testId and platform required"}'); return; }

          const tests = loadAllTestCases(dir);
          const test = tests.find(t => t.id === testId);
          if (!test) { res.writeHead(404); res.end('{"error":"Test not found"}'); return; }

          // Resolve flow path: direct frontmatter link first, then the automation-plan fallback.
          let flowPath = '';
          if (platform === 'android') flowPath = (test as any).maestroFlowAndroid || test.maestroFlow || '';
          else if (platform === 'ios') flowPath = (test as any).maestroFlowIos || test.maestroFlow || '';
          else flowPath = test.maestroFlow || '';

          if (!flowPath || !fs.existsSync(flowPath)) {
            const planned = resolvePlannedFlowPath(testId, platform, dir);
            if (planned) flowPath = planned;
          }

          if (!flowPath || !fs.existsSync(flowPath)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No Maestro flow linked for ' + testId + ' on ' + platform + ' — link one or add it to the automation plan.' }));
            return;
          }

          // Check Maestro CLI
          try { execSync('maestro --version', { stdio: 'pipe' }); } catch {
            res.writeHead(400);
            res.end('{"error":"Maestro CLI not installed"}');
            return;
          }

          // Generate run ID and start
          const runId = 'run-' + Date.now();
          const config = loadProjectConfig(dir);
          const env = { ...process.env, ...(config?.env ?? {}) };

          activeRuns.set(runId, {
            testId,
            platform,
            status: 'running',
            startTime: Date.now(),
            output: '',
          });

          // Update test to in-progress
          updateTestCaseById(testId, { status: 'in-progress' }, dir, 'maestro-run');

          // Create log file
          const runsDir = path.join(dir, 'runs');
          fs.mkdirSync(runsDir, { recursive: true });
          const logStream = fs.createWriteStream(path.join(runsDir, runId + '.log'), { flags: 'a' });
          const startTime = new Date().toISOString();

          // Spawn maestro test
          const child = spawn('maestro', ['test', flowPath], { env, cwd: process.cwd() });

          let output = '';
          child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            output += chunk;
            logStream.write(chunk);
            const run = activeRuns.get(runId);
            if (run) run.output = output;
            broadcastRunEvent(runId, { type: 'log', runId, data: chunk });
          });
          child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            output += chunk;
            logStream.write(chunk);
            const run = activeRuns.get(runId);
            if (run) run.output = output;
            broadcastRunEvent(runId, { type: 'log', runId, data: chunk });
          });

          child.on('close', async (code) => {
            logStream.end();
            const status = code === 0 ? 'pass' : 'fail';
            const run = activeRuns.get(runId);
            if (run) {
              run.status = status === 'pass' ? 'passed' : 'failed';
              run.endTime = Date.now();
              run.output = output;
            }
            updateTestCaseById(testId, { status }, dir, 'maestro-run');

            const { failingStep, errorLine } = parseFailureInfo(output);
            // Capture screenshot on BOTH pass and fail so users see the final app state every run.
            // Falls back gracefully (returns null) if the device isn't reachable.
            const screenshotPath = await captureScreenshot(platform, runId, testId, dir);
            const classification = status !== 'pass' ? classifyFailure(output) : null;
            const debugFolder = parseDebugFolder(output);
            // Resolve which configured device this run targeted (best-effort — undefined if no match)
            const deviceSlug = resolveDeviceSlug(platform);

            const record: MaestroRunRecord = {
              runId, testId, platform: platform as any,
              runner: 'maestro',
              target: platform as 'android' | 'ios',
              status: status as any,
              startTime, endTime: new Date().toISOString(),
              durationMs: run ? run.endTime! - run.startTime : 0,
              exitCode: code ?? 1, failingStep, errorLine, screenshotPath,
              failureCategory: classification?.category,
              friendlyError: classification?.label,
              hint: classification?.hint,
              debugFolder: debugFolder ?? undefined,
              device: deviceSlug,
            };
            writeRunRecord(record, dir);
            broadcastRunEvent(runId, {
              type: 'done', runId, status, failingStep, errorLine, screenshotPath,
              failureCategory: classification?.category,
              friendlyError: classification?.label,
              hint: classification?.hint,
              debugFolder,
              device: deviceSlug,
            });

            // S-017-001: on failure, ask the classifier whether this looks like a selector miss.
            // If so, enqueue a healing pipeline (snapshot → Claude → validate). Fire-and-forget.
            if (status === 'fail') {
              enqueueHealingFromFailure({ runId, testId, flowPath, platform, output, failingStep, errorLine, projectDir: dir });
            }

            // Auto-cleanup after 5 minutes
            setTimeout(() => activeRuns.delete(runId), 5 * 60 * 1000);
          });

          json(res, { ok: true, runId });
        } catch { res.writeHead(400); res.end('{"error":"Invalid request"}'); }
      });
      return;
    } else if (pathname.startsWith('/api/test/run/') && pathname.endsWith('/status') && req.method === 'GET') {
      const runId = pathname.replace('/api/test/run/', '').replace('/status', '');
      const run = activeRuns.get(runId);
      if (!run) { res.writeHead(404); res.end('{"error":"Run not found"}'); return; }
      json(res, {
        runId,
        testId: run.testId,
        platform: run.platform,
        status: run.status,
        elapsed: Date.now() - run.startTime,
        output: run.output.slice(-500),
      });
    } else if (pathname === '/api/bugs/create' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const data = JSON.parse(body);
          const bugsDir = path.join(dir, 'bugs');
          fs.mkdirSync(bugsDir, { recursive: true });

          // Generate next bug ID
          const existing = fs.existsSync(bugsDir) ? fs.readdirSync(bugsDir).filter(f => f.endsWith('.md')) : [];
          let maxNum = 0;
          for (const f of existing) {
            const m = f.match(/bug-(\d+)/i);
            if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
          }
          const bugId = `BUG-${String(maxNum + 1).padStart(3, '0')}`;

          const bug = {
            id: bugId,
            title: data.title || 'Untitled bug',
            status: 'open' as const,
            priority: data.priority || 'P2',
            category: data.category || 'unknown',
            linkedTest: data.linkedTest || '',
            device: data.device || 'unknown',
            failureReason: data.failureReason || '',
            stepsToReproduce: data.stepsToReproduce || '',
            selectorAnalysis: [],
            notes: data.notes || '',
            created: new Date().toISOString().split('T')[0],
            updated: new Date().toISOString().split('T')[0],
          };

          writeBug(bug, bugsDir);
          json(res, { ok: true, bug });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;

    } else if (pathname === '/api/appmap') {
      const registry = loadProjectRegistry();
      const projectId = registry.activeProject;
      // Read config.json directly to get appMap field
      const configPath = path.join(DATA_DIR, projectId, 'config.json');
      let appMap: string | null = null;
      let projectDisplayName = projectId;
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const cfg = JSON.parse(raw);
        appMap = cfg.appMap ?? null;
        projectDisplayName = cfg.name ?? projectId;
      } catch {}
      json(res, {
        appMap,
        projectName: projectId,
        projectDisplayName,
      });
      return;

    // ── E-029: QA Plan view — PMAgent QA/Flow/Release plan docs ───────────
    } else if (pathname === '/api/plans' && req.method === 'GET') {
      json(res, loadPlansIndex(dir) || { generatedAt: '', items: [], releases: [] });
    } else if (pathname.startsWith('/api/plans/') && req.method === 'GET') {
      const id = decodeURIComponent(pathname.replace('/api/plans/', ''));
      const idx = loadPlansIndex(dir);
      const item = idx?.items.find(i => i.id === id);
      if (!item) { res.writeHead(404); res.end('{"error":"Plan not found"}'); return; }
      let body = '';
      let sections: Array<{ level: number; heading: string; content: string }> = [];
      // Guard against path traversal — item.file must be a bare *.md basename (no separators / ..).
      if (/^[A-Za-z0-9_.-]+\.md$/.test(item.file) && !item.file.includes('..')) {
        try {
          const raw = fs.readFileSync(path.join(dir, 'plans', item.file), 'utf-8');
          const ix = raw.search(/^##\s/m);   // drop the H1 + header block; keep from first section
          body = ix >= 0 ? raw.slice(ix) : raw;
          sections = extractPlanSections(body);   // structured H2/H3 sections for the detail cards
        } catch { /* body stays empty */ }
      }
      json(res, { ...item, body, sections });

    // ── E-028: Automation Planner ─────────────────────────────────────────
    } else if (pathname === '/api/automation-plan' && req.method === 'GET') {
      const registry = loadProjectRegistry();
      const projectId = registry.activeProject;
      const cfg = loadProjectConfig(projectId);
      const tests = loadAllTestCases(dir);
      const plan: AutomationPlan = loadAutomationPlan(projectId) || { projectId, updatedAt: '', candidates: [], flows: [] };
      // Lightweight test projection for the triage list.
      const testRows = tests.map(t => ({
        id: t.id, title: t.title, category: t.category,
        priority: t.priority, scenario: t.scenario,
        tags: t.tags, platforms: t.platforms,
      }));
      const byDecision = { automate: 0, manual: 0, blocked: 0, defer: 0, untriaged: 0 };
      const triaged = new Set(plan.candidates.map(c => c.testId));
      for (const t of tests) {
        const c = plan.candidates.find(x => x.testId === t.id);
        if (!c) byDecision.untriaged++;
        else byDecision[c.decision]++;
      }
      const flowsByStatus = plan.flows.reduce((m: Record<string, number>, f) => { m[f.status] = (m[f.status] || 0) + 1; return m; }, {});
      const blockedFlows = plan.flows.filter(f => (f.blockers || []).length > 0).length;
      // Include any on-disk generated YAML so the board can show a flow's Maestro plan on click.
      const flowsDir = path.join(dir, 'flows');
      const flowFiles: Record<string, { path: string; yaml: string }> = {};
      for (const f of plan.flows) {
        const fp = path.join(flowsDir, f.id + '.yaml');
        if (fs.existsSync(fp)) { try { flowFiles[f.id] = { path: fp, yaml: fs.readFileSync(fp, 'utf-8') }; } catch { /* skip */ } }
      }
      json(res, {
        projectId,
        tests: testRows,
        candidates: plan.candidates,
        flows: plan.flows,
        flowFiles,
        personas: cfg?.testAccounts || [],
        summary: {
          totalTests: tests.length,
          triaged: triaged.size,
          byDecision,
          totalFlows: plan.flows.length,
          flowsByStatus,
          automatableNow: plan.flows.length - blockedFlows,
          blockedFlows,
        },
      });
      return;
    } else if (pathname === '/api/automation-plan/candidate' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const registry = loadProjectRegistry();
          const projectId = registry.activeProject;
          const incoming = JSON.parse(body) as AutomationCandidate;
          if (!incoming.testId || !incoming.decision) { res.writeHead(400); res.end('{"ok":false,"error":"testId + decision required"}'); return; }
          const plan: AutomationPlan = loadAutomationPlan(projectId) || { projectId, updatedAt: '', candidates: [], flows: [] };
          const i = plan.candidates.findIndex(c => c.testId === incoming.testId);
          if (i >= 0) plan.candidates[i] = { ...plan.candidates[i], ...incoming };
          else plan.candidates.push(incoming);
          plan.updatedAt = new Date().toISOString();
          saveAutomationPlan(plan);
          json(res, { ok: true, candidate: plan.candidates.find(c => c.testId === incoming.testId) });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;
    } else if (pathname === '/api/automation-plan/flow' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const registry = loadProjectRegistry();
          const projectId = registry.activeProject;
          const incoming = JSON.parse(body) as ProposedFlow;
          if (!incoming.id) { res.writeHead(400); res.end('{"ok":false,"error":"flow id required"}'); return; }
          const plan: AutomationPlan = loadAutomationPlan(projectId) || { projectId, updatedAt: '', candidates: [], flows: [] };
          const i = plan.flows.findIndex(f => f.id === incoming.id);
          if (i >= 0) plan.flows[i] = { ...plan.flows[i], ...incoming };
          else plan.flows.push(incoming);
          plan.updatedAt = new Date().toISOString();
          saveAutomationPlan(plan);
          json(res, { ok: true, flow: plan.flows.find(f => f.id === incoming.id) });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;
    } else if (pathname === '/api/automation-plan/scaffold' && req.method === 'POST') {
      readBody(req, async (body) => {
        try {
          const registry = loadProjectRegistry();
          const projectId = registry.activeProject;
          const { flowId } = JSON.parse(body) as { flowId?: string };
          const plan = loadAutomationPlan(projectId);
          const flow = plan?.flows.find(f => f.id === flowId);
          if (!plan || !flow) { res.writeHead(404); res.end('{"ok":false,"error":"flow not found"}'); return; }
          if ((flow.blockers || []).length > 0) { res.writeHead(409); res.end(JSON.stringify({ ok: false, error: 'flow has blockers: ' + flow.blockers!.join('; ') })); return; }
          const cfg = loadProjectConfig(projectId);
          const persona = (cfg?.testAccounts || []).find(p => p.key === flow.personaKey);
          // Gather the covered test cases' real markdown bodies (the planning artifact's substance).
          const caseDocs = flow.testIds.map(id => {
            const body = loadTestCaseMarkdownBody(id, dir) || '(no body)';
            return '### ' + id + '\n' + body.slice(0, 1800);
          }).join('\n\n');
          const personaLine = persona
            ? 'Persona: ' + persona.label + '. Use env interpolation for credentials: '
              + Object.entries(persona.envKeys).map(([k, v]) => k + '=${' + v + '}').join(', ')
              + (persona.programId ? '. Program ID: ' + persona.programId : '')
            : 'Persona: (none assigned).';
          const prompt = [
            'You are the Morbius flow-author agent. Write ONE Maestro YAML flow that covers the test cases below as a single feature-area journey.',
            'Output ONLY the YAML (no prose, no markdown fences).',
            '',
            'appId: ' + (cfg?.appId || '(unknown)'),
            'Flow id/name: ' + flow.id + ' — ' + flow.name,
            'Platforms: ' + (flow.platforms || []).join(', '),
            personaLine,
            '',
            'RULES:',
            '- React Native app: begin with `- stopApp`, `- clearState`, `- launchApp` (clearState as a separate step, NOT inside launchApp).',
            '- Interpolate credentials only via ${ENV_NAME}; never inline secrets.',
            '- This app sets NO testIDs — prefer `tapOn: { text: ... }` and `id:` resource-ids; selectors are best-effort and the self-healing loop will repair misses.',
            '- Cover ALL listed cases in this one flow; add `# QA Plan ID: <id>` comments per section.',
            '- Use extendedWaitUntil for screen transitions; avoid fixed sleeps and coordinates.',
            '',
            'APP NAVIGATION MAP (mermaid):',
            (cfg?.appMap || '(none)').slice(0, 2500),
            '',
            'TEST CASES TO COVER:',
            caseDocs,
          ].join('\n');
          flow.status = 'scaffolded';
          plan.updatedAt = new Date().toISOString();
          saveAutomationPlan(plan);
          const ai = await askClaude(prompt, { timeoutMs: 280_000, kind: 'other', projectId });
          if (!ai.ok) {
            json(res, { ok: false, flow, error: 'agent generation failed: ' + (ai.error || 'no output') + ' — flow left as scaffolded.' });
            return;
          }
          const aiText = ai.text || '';
          if (!aiText.trim()) {
            json(res, { ok: false, flow, error: 'agent returned empty output — flow left as scaffolded.' });
            return;
          }
          // Strip accidental code fences.
          let yaml = aiText.trim().replace(/^```ya?ml\s*/i, '').replace(/```$/i, '').trim();
          const flowsDir = path.join(dir, 'flows');
          fs.mkdirSync(flowsDir, { recursive: true });
          const filePath = path.join(flowsDir, flow.id + '.yaml');
          fs.writeFileSync(filePath, yaml + '\n', 'utf-8');
          flow.status = 'written';
          plan.updatedAt = new Date().toISOString();
          saveAutomationPlan(plan);
          json(res, {
            ok: true, flow, path: filePath, yaml,
            generatedBy: 'askClaude', durationMs: ai.durationMs,
            next: 'DRAFT written. Run it via the Maestro run pipeline; selector misses route to the E-017 self-healing loop. For production-grade selectors, refine with the interactive morbius-write-flows skill (live Maestro MCP exploration).',
          });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;
    } else if (pathname === '/api/appmap/narrative' && req.method === 'GET') {
      // E-027 S-027-001: read the project-level AppMap narrative.
      const registry = loadProjectRegistry();
      const projectId = registry.activeProject;
      const projectDir = path.join(DATA_DIR, projectId);
      const narrative = readAppMapNarrative(projectDir);
      json(res, { narrative });
      return;

    } else if (pathname === '/api/appmap/narrative/generate' && req.method === 'POST') {
      // E-027 S-027-002: kick the generation pipeline. Replies with the new narrative.
      const registry = loadProjectRegistry();
      const projectId = registry.activeProject;
      const t0 = Date.now();
      generateAppMapNarrative(projectId).then(result => {
        if (!result.ok) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: result.error, preservedExisting: result.preservedExisting, durationMs: Date.now() - t0 }));
          return;
        }
        json(res, { ok: true, narrative: result.narrative, durationMs: Date.now() - t0 });
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err), durationMs: Date.now() - t0 }));
      });
      return;

    } else if (pathname === '/api/runs/media' && req.method === 'GET') {
      // List all ingested media runs for the active project
      const registry = loadProjectRegistry();
      const project = registry.projects.find(p => p.id === registry.activeProject);
      const mediaPath = (project as any)?.mediaPath as string | undefined;
      if (!mediaPath) {
        json(res, { error: 'No mediaPath configured', runs: [] });
        return;
      }
      json(res, { mediaPath, runs: listMediaRuns(mediaPath) });
      return;

    } else if (pathname === '/api/runs/ingest-latest' && req.method === 'POST') {
      // Copy the most recent ~/.maestro/tests/<timestamp>/ into the project's mediaPath
      const registry = loadProjectRegistry();
      const project = registry.projects.find(p => p.id === registry.activeProject);
      const mediaPath = (project as any)?.mediaPath as string | undefined;
      if (!mediaPath) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No mediaPath configured for this project' }));
        return;
      }
      try {
        const run = ingestLatestMaestroRun(mediaPath);
        if (!run) {
          json(res, { ok: false, message: 'No Maestro test runs found in ~/.maestro/tests/' });
        } else {
          json(res, { ok: true, run });
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;

    } else if (pathname === '/api/coverage') {
      // Calculator coverage matrix — cross-reference calculatorConfig.json vs Maestro YAMLs + test files
      const registry = loadProjectRegistry();
      const project = registry.projects.find(p => p.id === registry.activeProject);
      const codebasePath = (project as any)?.codebasePath;

      if (!codebasePath) {
        json(res, { error: 'No codebasePath set for this project', calculators: [] });
        return;
      }

      const configPath = path.join(codebasePath, 'scripts', 'calculatorConfig.json');
      if (!fs.existsSync(configPath)) {
        json(res, { error: `calculatorConfig.json not found at ${configPath}`, calculators: [] });
        return;
      }

      const calculators = parseCalculatorConfig(configPath);
      const dir = getActiveProjectDir();

      // Gather all YAML flows (android + ios)
      const androidPath = project?.maestro?.androidPath;
      const iosPath = project?.maestro?.iosPath;
      const yamlPaths: string[] = [];
      if (androidPath) yamlPaths.push(...findFiles(androidPath, '.yaml'), ...findFiles(androidPath, '.yml'));
      if (iosPath) yamlPaths.push(...findFiles(iosPath, '.yaml'), ...findFiles(iosPath, '.yml'));

      // Gather all test case markdown files
      const testFiles = findFiles(path.join(dir, 'tests'), '.md');

      const coverage = buildCoverageMatrix(calculators, yamlPaths, testFiles);
      const totalFields = coverage.reduce((s, c) => s + c.totalFields, 0);
      const coveredTotal = coverage.reduce((s, c) => s + c.coveredFields.length, 0);

      json(res, {
        codebasePath,
        configPath,
        calculators: coverage,
        summary: {
          totalCalculators: coverage.length,
          totalFields,
          coveredFields: coveredTotal,
          overallPct: totalFields === 0 ? 0 : Math.round((coveredTotal / totalFields) * 100),
        },
      });
      return;

    } else if (pathname === '/api/test/run-web' && req.method === 'POST') {
      // E-024 / S-024-004: Run a web test via the agent-orchestrated browser-MCP runner.
      // Body: { testId, mode?: 'headless' | 'visual' }
      // Reads the project's webUrl, builds a prompt from the test case, calls runAgentTask
      // with the right MCP backend, parses structured JSON result, writes RunRecord to disk.
      readBody(req, (body) => {
        try {
          const { testId, mode } = JSON.parse(body) as { testId?: string; mode?: 'headless' | 'visual' };
          if (!testId) { res.writeHead(400); res.end('{"ok":false,"error":"testId required"}'); return; }
          const runMode: 'headless' | 'visual' = mode === 'visual' ? 'visual' : 'headless';

          const tests = loadAllTestCases(dir);
          const test = tests.find(t => t.id === testId);
          if (!test) { res.writeHead(404); res.end(JSON.stringify({ ok: false, error: 'Test not found: ' + testId })); return; }

          // Resolve target URL from the active project's config
          const registry = loadProjectRegistry();
          const project = registry.projects.find(p => p.id === registry.activeProject);
          const projectType = (project?.projectType as 'mobile' | 'web' | 'api' | undefined) ?? 'mobile';
          const webUrl = project?.webUrl ?? '';
          if (projectType !== 'web' || !webUrl) {
            res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'Active project is not configured for web (projectType=' + projectType + ', webUrl=' + (webUrl || '?') + '). Set both in Settings → Workspace.' })); return;
          }

          // Build the agent prompt from the test case + base URL.
          const promptLines: string[] = [];
          promptLines.push('You are a QA agent driving a web browser via MCP tools to execute a test case.');
          promptLines.push('');
          promptLines.push('Base URL: ' + webUrl);
          promptLines.push('Test case ID: ' + test.id);
          promptLines.push('Title: ' + test.title);
          promptLines.push('');
          promptLines.push('## Steps');
          promptLines.push((test.steps || '(no steps recorded — use the title + acceptance criteria as the spec)'));
          if (test.acceptanceCriteria) {
            promptLines.push('');
            promptLines.push('## Expected Result / Acceptance Criteria');
            promptLines.push(test.acceptanceCriteria);
          }
          promptLines.push('');
          promptLines.push('## Instructions');
          promptLines.push('1. Navigate to the Base URL.');
          promptLines.push('2. Execute the steps using the available browser MCP tools.');
          if (runMode === 'headless') {
            promptLines.push('3. Use the Playwright MCP tools (mcp__playwright__*) to drive a headless Chromium.');
            promptLines.push('   Take a screenshot at the start and at the end of the test.');
          } else {
            promptLines.push('3. Use the Claude in Chrome tools (mcp__Claude_in_Chrome__*) to drive a real Chrome window.');
            promptLines.push('   Take screenshots at key transition points.');
          }
          promptLines.push('4. Verify each Then/Expected statement after the corresponding action.');
          promptLines.push('');
          promptLines.push('## Output');
          promptLines.push('Reply with ONLY a JSON object (no prose, no fences):');
          promptLines.push('{');
          promptLines.push('  "status": "pass" | "fail" | "error",');
          promptLines.push('  "stepsExecuted": <number>,');
          promptLines.push('  "screenshots": ["<path-or-data-uri>", ...],');
          promptLines.push('  "errorLine": "<short failure summary, only if status != pass>",');
          promptLines.push('  "domSnapshot": "<optional: brief text of the final page state>"');
          promptLines.push('}');

          const runId = (runMode === 'visual' ? 'web-vis-' : 'web-' ) + Date.now();
          const startTime = new Date().toISOString();
          // Mark the test in-progress for live UI feedback
          updateTestCaseById(testId, { status: 'in-progress' }, dir, runMode === 'visual' ? 'web-visual-run' : 'web-headless-run');

          // Fire-and-forget the agent run, but stream the final result back to the caller
          // when it finishes. The endpoint stays open until the agent returns or times out.
          void (async () => {
            const t0 = Date.now();
            const r = await runAgentTask({
              mode: 'cli-subprocess',
              prompt: promptLines.join('\n'),
              mcps: [runMode === 'visual' ? 'claude-in-chrome' : 'playwright-mcp'],
              timeoutMs: 5 * 60 * 1000,
            });
            const endTime = new Date().toISOString();
            const durationMs = Date.now() - t0;

            // Parse the agent's structured JSON output
            const agent = (r.json && typeof r.json === 'object') ? r.json as Record<string, unknown> : {};
            const status = (typeof agent.status === 'string' && ['pass','fail','error'].includes(agent.status)) ? agent.status as 'pass'|'fail'|'error' : (r.ok ? 'error' : 'error');
            const screenshots = Array.isArray(agent.screenshots) ? agent.screenshots.filter((s): s is string => typeof s === 'string') : [];
            const errorLine = typeof agent.errorLine === 'string' ? agent.errorLine : (r.error || null);
            const domSnapshot = typeof agent.domSnapshot === 'string' ? agent.domSnapshot : undefined;

            const record = {
              runId, testId,
              runner: runMode === 'visual' ? 'web-visual' as const : 'web-headless' as const,
              target: 'web' as const,
              status,
              startTime, endTime, durationMs,
              errorLine,
              screenshots,
              targetUrl: webUrl,
              domSnapshot,
            };
            try {
              const runsDir = path.join(dir, 'runs');
              fs.mkdirSync(runsDir, { recursive: true });
              fs.writeFileSync(path.join(runsDir, runId + '.json'), JSON.stringify(record, null, 2));
              // Latest pointer so kanban thumbnails can find it (S-024-002 generic shape)
              fs.writeFileSync(
                path.join(runsDir, testId.replace(/[^a-zA-Z0-9-_]/g, '_') + '-latest.json'),
                JSON.stringify({
                  runId, screenshotPath: screenshots[0] ?? null,
                  status, failingStep: null, errorLine, timestamp: endTime,
                }, null, 2)
              );
            } catch (err) { console.error('[web-run] failed to write record:', err); }

            // Update the test case status from in-progress → outcome
            updateTestCaseById(testId, { status: status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'flaky' }, dir, runMode === 'visual' ? 'web-visual-run' : 'web-headless-run');

            json(res, {
              ok: r.ok && status !== 'error',
              runId, status,
              screenshotCount: screenshots.length,
              durationMs,
              errorLine: errorLine || undefined,
              targetUrl: webUrl,
            });
          })().catch(err => {
            res.writeHead(500); res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;

    } else if (pathname === '/api/test/run-mcp' && req.method === 'POST') {
      // Run a Maestro flow via Claude CLI → MCP (more reliable than direct maestro subprocess)
      readBody(req, (body) => {
        try {
          const { testId, platform, deviceId } = JSON.parse(body);
          if (!testId || !platform) { res.writeHead(400); res.end('{"error":"testId and platform required"}'); return; }

          const tests = loadAllTestCases(dir);
          const test = tests.find(t => t.id === testId);
          if (!test) { res.writeHead(404); res.end('{"error":"Test not found"}'); return; }

          let flowPath = '';
          if (platform === 'android') flowPath = (test as any).maestroFlowAndroid || test.maestroFlow || '';
          else if (platform === 'ios') flowPath = (test as any).maestroFlowIos || test.maestroFlow || '';
          else flowPath = test.maestroFlow || '';

          if (!flowPath || !fs.existsSync(flowPath)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No Maestro flow found for ' + platform + (flowPath ? ' (missing: ' + flowPath + ')' : '') }));
            return;
          }

          const runId = 'run-mcp-' + Date.now();
          updateTestCaseById(testId, { status: 'in-progress' }, dir, 'maestro-run');
          activeRuns.set(runId, { testId, platform, status: 'running', startTime: Date.now(), output: '' });

          const deviceArg = deviceId ? ` on device ${deviceId}` : '';
          const message = `Run the Maestro flow at path "${flowPath}"${deviceArg}. Use mcp__maestro__run_flow_files with the exact path. After it completes, reply with ONLY a JSON object on the last line: {"status":"pass"} or {"status":"fail","error":"reason"}`;

          const child = spawn('claude', ['--print', '--model', 'claude-sonnet-4-6', message], {
            cwd: process.cwd(),
            env: { ...process.env, FORCE_COLOR: '0' },
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          child.stdin.end();

          const runsDir = path.join(dir, 'runs');
          fs.mkdirSync(runsDir, { recursive: true });
          const logStream = fs.createWriteStream(path.join(runsDir, runId + '.log'), { flags: 'a' });
          const startTime = new Date().toISOString();

          let output = '';
          child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            output += chunk;
            logStream.write(chunk);
            broadcastRunEvent(runId, { type: 'log', runId, data: chunk });
          });
          child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            output += chunk;
            logStream.write(chunk);
          });

          const runTimeout = setTimeout(() => {
            child.kill('SIGTERM');
            const run = activeRuns.get(runId);
            if (run) { run.status = 'failed'; run.endTime = Date.now(); run.output = 'Timed out after 120s'; }
            updateTestCaseById(testId, { status: 'fail' }, dir, 'maestro-run');
            setTimeout(() => activeRuns.delete(runId), 5 * 60 * 1000);
          }, 120_000);

          child.on('close', async (code) => {
            clearTimeout(runTimeout);
            logStream.end();
            // Try to parse JSON result from last line of output
            let status: 'pass' | 'fail' = code === 0 ? 'pass' : 'fail';
            const lines = output.trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const parsed = JSON.parse(lines[i].trim());
                if (parsed.status === 'pass' || parsed.status === 'fail') {
                  status = parsed.status;
                  break;
                }
              } catch { /* not JSON */ }
            }
            const run = activeRuns.get(runId);
            if (run) { run.status = status === 'pass' ? 'passed' : 'failed'; run.endTime = Date.now(); run.output = output; }
            updateTestCaseById(testId, { status }, dir, 'maestro-run');

            const { failingStep, errorLine } = parseFailureInfo(output);
            const screenshotPath = await captureScreenshot(platform, runId, testId, dir);
            const classification = status !== 'pass' ? classifyFailure(output) : null;
            const debugFolder = parseDebugFolder(output);
            const deviceSlug = resolveDeviceSlug(platform);
            const record: MaestroRunRecord = {
              runId, testId, platform: platform as any,
              runner: 'maestro',
              target: platform as 'android' | 'ios',
              status: status as any,
              startTime, endTime: new Date().toISOString(),
              durationMs: run ? run.endTime! - run.startTime : 0,
              exitCode: code ?? 1, failingStep, errorLine, screenshotPath,
              failureCategory: classification?.category,
              friendlyError: classification?.label,
              hint: classification?.hint,
              debugFolder: debugFolder ?? undefined,
              device: deviceSlug,
            };
            writeRunRecord(record, dir);
            broadcastRunEvent(runId, {
              type: 'done', runId, status, failingStep, errorLine, screenshotPath,
              failureCategory: classification?.category,
              friendlyError: classification?.label,
              hint: classification?.hint,
              debugFolder,
              device: deviceSlug,
            });

            // Auto-ingest media from latest Maestro run into project mediaPath
            try {
              const activeRegistry = loadProjectRegistry();
              const activeProject = activeRegistry.projects.find(p => p.id === activeRegistry.activeProject);
              const mediaPath = (activeProject as any)?.mediaPath as string | undefined;
              if (mediaPath) ingestLatestMaestroRun(mediaPath);
            } catch { /* non-fatal — don't block test result */ }

            setTimeout(() => activeRuns.delete(runId), 5 * 60 * 1000);
          });

          json(res, { ok: true, runId, method: 'mcp' });
        } catch { res.writeHead(400); res.end('{"error":"Invalid request"}'); }
      });
      return;

    } else if (pathname === '/api/flow/run' && req.method === 'POST') {
      // Run a Maestro YAML file directly by path (from Maestro Tests view)
      readBody(req, (body) => {
        try {
          const { filePath, platform } = JSON.parse(body);
          if (!filePath || !fs.existsSync(filePath)) {
            res.writeHead(400); res.end(JSON.stringify({ error: 'Flow file not found: ' + filePath })); return;
          }

          const runId = 'run-flow-' + Date.now();
          const safeId = path.basename(filePath, '.yaml').replace(/[^a-zA-Z0-9-_]/g, '_');

          const runsDir = path.join(dir, 'runs');
          fs.mkdirSync(runsDir, { recursive: true });
          const logStream = fs.createWriteStream(path.join(runsDir, runId + '.log'), { flags: 'a' });
          const startTime = new Date().toISOString();

          const child = spawn('maestro', ['test', filePath], {
            env: { ...process.env },
            cwd: process.cwd(),
          });

          activeRuns.set(runId, { testId: safeId, platform, status: 'running', startTime: Date.now(), output: '', child });

          let output = '';
          child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            output += chunk;
            logStream.write(chunk);
            broadcastRunEvent(runId, { type: 'log', runId, data: chunk });
            const run = activeRuns.get(runId);
            if (run) run.output = output;
          });
          child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            output += chunk;
            logStream.write(chunk);
            broadcastRunEvent(runId, { type: 'log', runId, data: chunk });
            const run = activeRuns.get(runId);
            if (run) run.output = output;
          });

          child.on('close', async (code, signal) => {
            logStream.end();
            const run = activeRuns.get(runId);
            const wasCanceled = run?.canceled === true;
            const status: 'pass' | 'fail' | 'canceled' =
              wasCanceled ? 'canceled' : (code === 0 ? 'pass' : 'fail');
            if (run) {
              run.status = status === 'pass' ? 'passed' : status === 'canceled' ? 'canceled' : 'failed';
              run.endTime = Date.now();
              run.output = output;
              run.child = undefined;
            }
            const { failingStep, errorLine } = parseFailureInfo(output);
            const screenshotPath = status !== 'canceled' ? await captureScreenshot(platform, runId, safeId, dir) : null;
            const classification = status === 'fail' ? classifyFailure(output) : null;
            const debugFolder = parseDebugFolder(output);
            const deviceSlug = resolveDeviceSlug(platform);
            const record: MaestroRunRecord = {
              runId, testId: safeId, platform: platform as any,
              runner: 'maestro',
              target: platform as 'android' | 'ios',
              status: status as any,
              startTime, endTime: new Date().toISOString(),
              durationMs: run ? (run.endTime! - run.startTime) : 0,
              exitCode: code ?? (signal ? 130 : 1), failingStep, errorLine, screenshotPath,
              failureCategory: classification?.category,
              friendlyError: classification?.label,
              hint: classification?.hint,
              debugFolder: debugFolder ?? undefined,
              device: deviceSlug,
            };
            writeRunRecord(record, dir);
            broadcastRunEvent(runId, {
              type: 'done', runId, status, failingStep, errorLine, screenshotPath,
              failureCategory: classification?.category,
              friendlyError: classification?.label,
              hint: classification?.hint,
              debugFolder,
              device: deviceSlug,
            });
            setTimeout(() => activeRuns.delete(runId), 5 * 60 * 1000);
          });

          json(res, { ok: true, runId });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;

    } else if (pathname.startsWith('/api/flow/run/') && pathname.endsWith('/cancel') && req.method === 'POST') {
      // Stop a running Maestro flow. Kills the child process — the close handler
      // then broadcasts a 'done' event with status:'canceled' so the UI unsticks.
      const runId = pathname.replace('/api/flow/run/', '').replace('/cancel', '');
      const run = activeRuns.get(runId);
      if (!run) { res.writeHead(404); res.end(JSON.stringify({ error: 'Run not found' })); return; }
      if (run.status !== 'running') { json(res, { ok: true, alreadyFinished: true }); return; }
      run.canceled = true;
      try {
        run.child?.kill('SIGTERM');
        // Hard-kill safety net if SIGTERM is ignored (some maestro sub-processes hang)
        setTimeout(() => { try { run.child?.kill('SIGKILL'); } catch { /* already dead */ } }, 3000);
      } catch { /* already exited */ }
      json(res, { ok: true });
      return;

    } else if (pathname === '/api/maestro-tests') {
      // Read LIVE from the local Maestro folders
      const registry = loadProjectRegistry();
      const project = registry.projects.find(p => p.id === registry.activeProject);
      const androidPath = project?.maestro?.androidPath;
      const iosPath = project?.maestro?.iosPath;

      const categories: Array<{
        name: string;
        slug: string;
        flows: Array<{
          name: string;
          qaPlanId: string | null;
          filePath: string;
          fileName: string;
          platform: string;
          tags: string[];
          stepsCount: number;
          steps: Array<{ action: string; humanReadable: string }>;
          envVars: Record<string, string>;
          warnings: number;
          selectorWarnings: Array<{ line: number; command: string; issue: string }>;
          referencedFlows: string[];
          rawYaml: string;
        }>;
      }> = [];

      function scanMaestroDir(dir: string, platform: string) {
        if (!dir || !fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name === 'shared' || entry.name === 'scripts' || entry.name === 'archive' || entry.name === '_archive') continue;
          const catDir = path.join(dir, entry.name);
          const files = fs.readdirSync(catDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

          let cat = categories.find(c => c.slug === entry.name);
          if (!cat) {
            cat = {
              name: entry.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              slug: entry.name,
              flows: [],
            };
            categories.push(cat);
          }

          for (const file of files) {
            const filePath = path.join(catDir, file);
            try {
              const rawYaml = fs.readFileSync(filePath, 'utf-8');
              const flow = parseMaestroYaml(filePath);
              cat.flows.push({
                name: flow.name || file.replace('.yaml', '').replace(/_/g, ' '),
                qaPlanId: flow.qaPlanId,
                filePath,
                fileName: file,
                platform,
                tags: flow.tags,
                stepsCount: flow.steps.length,
                steps: flow.steps.map(s => ({ action: s.action, humanReadable: s.humanReadable })),
                envVars: flow.envVars,
                warnings: flow.selectorWarnings.length,
                selectorWarnings: flow.selectorWarnings,
                referencedFlows: flow.referencedFlows,
                rawYaml,
              });
            } catch { /* skip malformed */ }
          }
        }
      }

      // Also scan shared flows
      function scanSharedFlows(dir: string, platform: string) {
        const sharedDir = path.join(dir, 'shared');
        if (!fs.existsSync(sharedDir)) return;
        const files = fs.readdirSync(sharedDir).filter(f => f.endsWith('.yaml'));
        let cat = categories.find(c => c.slug === 'shared');
        if (!cat) { cat = { name: 'Shared Flows', slug: 'shared', flows: [] }; categories.push(cat); }
        for (const file of files) {
          const filePath = path.join(sharedDir, file);
          try {
            const rawYaml = fs.readFileSync(filePath, 'utf-8');
            const flow = parseMaestroYaml(filePath);
            cat.flows.push({
              name: flow.name || file.replace('.yaml', '').replace(/_/g, ' '),
              qaPlanId: flow.qaPlanId,
              filePath,
              fileName: file,
              platform,
              tags: flow.tags,
              stepsCount: flow.steps.length,
              steps: flow.steps.map(s => ({ action: s.action, humanReadable: s.humanReadable })),
              envVars: flow.envVars,
              warnings: flow.selectorWarnings.length,
              selectorWarnings: flow.selectorWarnings,
              referencedFlows: flow.referencedFlows,
              rawYaml,
            });
          } catch { /* skip */ }
        }
      }

      const pathErrors: string[] = [];
      if (androidPath) {
        if (!fs.existsSync(androidPath)) {
          pathErrors.push(`Android path not found: ${androidPath}`);
        } else {
          scanMaestroDir(androidPath, 'android');
          scanSharedFlows(androidPath, 'android');
        }
      }
      if (iosPath) {
        if (!fs.existsSync(iosPath)) {
          pathErrors.push(`iOS path not found: ${iosPath}`);
        } else {
          scanMaestroDir(iosPath, 'ios');
          scanSharedFlows(iosPath, 'ios');
        }
      }

      // E-028: surface Automation-Planner draft flows (data/<project>/flows/*.yaml) in the
      // Maestro tab too, independent of the external Maestro paths (which may not exist yet).
      const draftDir = path.join(dir, 'flows');
      if (fs.existsSync(draftDir)) {
        const draftFiles = fs.readdirSync(draftDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        if (draftFiles.length) {
          let cat = categories.find(c => c.slug === 'automation-plan');
          if (!cat) { cat = { name: 'Automation Plan (drafts)', slug: 'automation-plan', flows: [] }; categories.push(cat); }
          for (const file of draftFiles) {
            const filePath = path.join(draftDir, file);
            try {
              const rawYaml = fs.readFileSync(filePath, 'utf-8');
              const flow = parseMaestroYaml(filePath);
              cat.flows.push({
                name: flow.name || file.replace(/\.ya?ml$/, '').replace(/_/g, ' '),
                qaPlanId: flow.qaPlanId, filePath, fileName: file, platform: 'android',
                tags: flow.tags, stepsCount: flow.steps.length,
                steps: flow.steps.map(s => ({ action: s.action, humanReadable: s.humanReadable })),
                envVars: flow.envVars, warnings: flow.selectorWarnings.length,
                selectorWarnings: flow.selectorWarnings, referencedFlows: flow.referencedFlows, rawYaml,
              });
            } catch { /* skip */ }
          }
        }
      }

      json(res, {
        androidPath,
        iosPath,
        pathErrors: pathErrors.length > 0 ? pathErrors : undefined,
        categories,
        totalFlows: categories.reduce((sum, c) => sum + c.flows.length, 0),
      });
    } else if (pathname === '/api/runs/latest-all') {
      const runsDir = path.join(dir, 'runs');
      const result: Record<string, LatestRunPointer> = {};
      if (fs.existsSync(runsDir)) {
        const files = fs.readdirSync(runsDir).filter(f => f.endsWith('-latest.json'));
        for (const f of files) {
          try {
            const pointer = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8')) as LatestRunPointer;
            // Index by testId (reversed safe transform: replace _ with - for display, but keep raw)
            const safeTestId = f.replace('-latest.json', '');
            result[safeTestId] = pointer;
          } catch { /* skip */ }
        }
      }
      json(res, result);

    } else if (pathname.startsWith('/api/runs/') && pathname.endsWith('/latest')) {
      // Get latest run pointer for a test
      const testId = decodeURIComponent(pathname.replace('/api/runs/', '').replace('/latest', ''));
      const safeTestId = testId.replace(/[^a-zA-Z0-9-_]/g, '_');
      const pointerPath = path.join(dir, 'runs', safeTestId + '-latest.json');
      if (fs.existsSync(pointerPath)) {
        json(res, JSON.parse(fs.readFileSync(pointerPath, 'utf-8')));
      } else {
        res.writeHead(404); res.end('{"error":"No run record found"}');
      }

    } else if (pathname.startsWith('/api/runs/') && pathname.endsWith('/history')) {
      // Get run history for a test
      const testId = decodeURIComponent(pathname.replace('/api/runs/', '').replace('/history', ''));
      const runsDir = path.join(dir, 'runs');
      if (!fs.existsSync(runsDir)) { json(res, []); return; }
      const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json') && !f.endsWith('-latest.json'));
      const history: MaestroRunRecord[] = [];
      for (const f of files) {
        try {
          const rec = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8')) as MaestroRunRecord;
          if (rec.testId === testId) history.push(rec);
        } catch { /* skip */ }
      }
      history.sort((a, b) => b.startTime.localeCompare(a.startTime));
      json(res, history.slice(0, 20)); // last 20 runs

    // ── 2026-04-30 Runs/Devices redesign endpoints ────────────────────────
    } else if (pathname === '/api/runs/all') {
      // GET /api/runs/all?limit=100&status=&runner=&device=&since=
      // Returns all RunRecords for the active project, newest first, with optional filters.
      // Used by the Runs tab's day-grouped run stream and DeviceCard "View all runs on this device".
      const u = new URL(req.url || '', 'http://localhost');
      const limit = Math.min(parseInt(u.searchParams.get('limit') || '100', 10) || 100, 500);
      const statusFilter = u.searchParams.get('status'); // 'pass' | 'fail' | 'error' | null
      const runnerFilter = u.searchParams.get('runner'); // 'maestro' | 'web-headless' | 'web-visual' | 'manual' | null
      const deviceFilter = u.searchParams.get('device'); // device slug | 'unknown' | null
      const since = u.searchParams.get('since');         // ISO datetime; runs with startTime >= since
      const runsDir = path.join(dir, 'runs');
      if (!fs.existsSync(runsDir)) { json(res, []); return; }
      const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json') && !f.endsWith('-latest.json'));
      const all: MaestroRunRecord[] = [];
      for (const f of files) {
        try {
          const rec = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8')) as MaestroRunRecord;
          if (statusFilter && rec.status !== statusFilter) continue;
          if (runnerFilter && rec.runner !== runnerFilter) continue;
          if (deviceFilter) {
            if (deviceFilter === 'unknown' && rec.device) continue;
            if (deviceFilter !== 'unknown' && rec.device !== deviceFilter) continue;
          }
          if (since && rec.startTime < since) continue;
          all.push(rec);
        } catch { /* skip malformed */ }
      }
      all.sort((a, b) => b.startTime.localeCompare(a.startTime));
      json(res, all.slice(0, limit));
      return;

    } else if (pathname.match(/^\/api\/run\/[^/]+\/log$/) && req.method === 'GET') {
      // GET /api/run/:runId/log — returns the .log file (text/plain).
      // Lazy-loaded by RunDetailPanel's "Show step log" expand.
      const runId = decodeURIComponent(pathname.replace('/api/run/', '').replace('/log', ''));
      // Path-traversal guard: runId must be a simple identifier (no slashes / dots)
      if (!/^[a-zA-Z0-9_-]+$/.test(runId)) {
        res.writeHead(400); res.end('{"error":"Invalid runId"}'); return;
      }
      const logPath = path.join(dir, 'runs', runId + '.log');
      if (!fs.existsSync(logPath)) {
        res.writeHead(404); res.end('{"error":"Log not found"}'); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      fs.createReadStream(logPath).pipe(res);
      return;

    } else if (pathname.match(/^\/api\/run\/[^/]+\/debug-folder\/list$/) && req.method === 'GET') {
      // GET /api/run/:runId/debug-folder/list — list files in Maestro's ~/.maestro/tests/<timestamp>/
      // Lazy-loaded by RunDetailPanel's "Show debug folder" expand.
      const runId = decodeURIComponent(pathname.replace('/api/run/', '').replace('/debug-folder/list', ''));
      if (!/^[a-zA-Z0-9_-]+$/.test(runId)) {
        res.writeHead(400); res.end('{"error":"Invalid runId"}'); return;
      }
      // Find the run record to get debugFolder pointer
      const recPath = path.join(dir, 'runs', runId + '.json');
      if (!fs.existsSync(recPath)) { res.writeHead(404); res.end('{"error":"Run not found"}'); return; }
      let debugFolder: string | undefined;
      try {
        const rec = JSON.parse(fs.readFileSync(recPath, 'utf-8')) as MaestroRunRecord;
        debugFolder = rec.debugFolder;
      } catch {
        res.writeHead(500); res.end('{"error":"Run record unreadable"}'); return;
      }
      if (!debugFolder) { json(res, { folder: null, files: [] }); return; }
      // Path-traversal guard: must resolve under ~/.maestro/tests/
      const resolved = path.resolve(debugFolder);
      const allowedRoot = path.resolve(os.homedir(), '.maestro/tests');
      if (!resolved.startsWith(allowedRoot)) {
        res.writeHead(403); res.end('{"error":"Debug folder outside allowed root"}'); return;
      }
      if (!fs.existsSync(resolved)) { json(res, { folder: debugFolder, files: [] }); return; }
      try {
        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const files = entries.map(e => {
          const full = path.join(resolved, e.name);
          let size = 0; let mtime = '';
          try { const st = fs.statSync(full); size = st.size; mtime = st.mtime.toISOString(); } catch { /* ignore */ }
          return { name: e.name, size, mtime, isDir: e.isDirectory() };
        }).sort((a, b) => a.name.localeCompare(b.name));
        json(res, { folder: debugFolder, files });
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Failed to list folder', detail: String(e) }));
      }
      return;

    } else if (pathname.match(/^\/api\/run\/[^/]+\/debug-folder\/file$/) && req.method === 'GET') {
      // GET /api/run/:runId/debug-folder/file?name=<name>
      // Serves a single file from the run's debug folder. Used to render screenshots inline.
      const runId = decodeURIComponent(pathname.replace('/api/run/', '').replace('/debug-folder/file', ''));
      const u = new URL(req.url || '', 'http://localhost');
      const name = u.searchParams.get('name') || '';
      if (!/^[a-zA-Z0-9_-]+$/.test(runId) || !/^[a-zA-Z0-9._\- ()]+$/.test(name)) {
        res.writeHead(400); res.end('{"error":"Invalid runId or filename"}'); return;
      }
      const recPath = path.join(dir, 'runs', runId + '.json');
      if (!fs.existsSync(recPath)) { res.writeHead(404); res.end('{"error":"Run not found"}'); return; }
      let debugFolder: string | undefined;
      try {
        const rec = JSON.parse(fs.readFileSync(recPath, 'utf-8')) as MaestroRunRecord;
        debugFolder = rec.debugFolder;
      } catch { res.writeHead(500); res.end('{"error":"Run record unreadable"}'); return; }
      if (!debugFolder) { res.writeHead(404); res.end('{"error":"No debug folder for run"}'); return; }
      const resolved = path.resolve(debugFolder, name);
      const allowedRoot = path.resolve(os.homedir(), '.maestro/tests');
      if (!resolved.startsWith(allowedRoot)) { res.writeHead(403); res.end('{"error":"Outside allowed root"}'); return; }
      if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
        res.writeHead(404); res.end('{"error":"File not found"}'); return;
      }
      const ext = path.extname(resolved).toLowerCase();
      const mime: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
        '.json': 'application/json', '.html': 'text/html', '.txt': 'text/plain', '.log': 'text/plain',
      };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      fs.createReadStream(resolved).pipe(res);
      return;

    } else if (pathname === '/api/devices/fleet') {
      // GET /api/devices/fleet — live fleet snapshot + per-configured-device stats.
      // Powers the Devices tab's FleetSnapshot card and per-device cards.
      const reg = loadProjectRegistry();
      const project = reg.projects.find(p => p.id === reg.activeProject);
      const configured = (project?.devices || []).map(d => ({ id: d.id, name: d.name, platform: d.platform }));
      const live = getLiveDeviceFleet(configured);

      // Compute per-device stats by reading all RunRecords once
      const runsDir = path.join(dir, 'runs');
      const allRuns: MaestroRunRecord[] = [];
      if (fs.existsSync(runsDir)) {
        const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json') && !f.endsWith('-latest.json'));
        for (const f of files) {
          try {
            const rec = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8')) as MaestroRunRecord;
            allRuns.push(rec);
          } catch { /* skip */ }
        }
      }
      const tests = loadAllTestCases(dir);
      const titleById = new Map(tests.map(t => [t.id, t.title]));

      type DeviceStats = {
        totalRuns: number;
        passRate: number;        // 0-100
        passCount: number;
        failCount: number;
        lastRunAt: string | null;
        lastRunStatus: string | null;
        lastScreenshotPath: string | null;
        topFailingTests: Array<{ testId: string; title: string; failCount: number; lastFriendlyError?: string }>;
      };
      const computeStats = (deviceSlug: string | undefined): DeviceStats => {
        const matched = allRuns.filter(r => deviceSlug === undefined ? !r.device : r.device === deviceSlug);
        if (matched.length === 0) {
          return { totalRuns: 0, passRate: 0, passCount: 0, failCount: 0, lastRunAt: null, lastRunStatus: null, lastScreenshotPath: null, topFailingTests: [] };
        }
        matched.sort((a, b) => b.startTime.localeCompare(a.startTime));
        const passCount = matched.filter(r => r.status === 'pass').length;
        const failCount = matched.filter(r => r.status === 'fail').length;
        const totalRuns = matched.length;
        const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0;

        // Top 3 failing tests by recent fail count
        const failByTest = new Map<string, { failCount: number; lastFriendlyError?: string }>();
        for (const r of matched) {
          if (r.status !== 'fail') continue;
          const cur = failByTest.get(r.testId) || { failCount: 0 };
          cur.failCount++;
          if (!cur.lastFriendlyError && r.friendlyError) cur.lastFriendlyError = r.friendlyError;
          failByTest.set(r.testId, cur);
        }
        const topFailingTests = [...failByTest.entries()]
          .map(([testId, v]) => ({ testId, title: titleById.get(testId) || testId, ...v }))
          .sort((a, b) => b.failCount - a.failCount)
          .slice(0, 3);

        return {
          totalRuns,
          passRate,
          passCount,
          failCount,
          lastRunAt: matched[0].endTime || matched[0].startTime,
          lastRunStatus: matched[0].status,
          lastScreenshotPath: matched[0].screenshotPath || null,
          topFailingTests,
        };
      };

      // Build the response — live fleet + each configured device with its stats and isLive flag
      const liveSlugMatches = new Set<string>();
      [...live.android, ...live.ios].forEach(d => { if (d.configMatch) liveSlugMatches.add(d.configMatch); });

      const configuredWithStats = configured.map(d => ({
        ...d,
        isLive: liveSlugMatches.has(d.id),
        stats: computeStats(d.id),
      }));

      // Also include "unknown" pseudo-device covering legacy/web/manual runs without a device slug
      const unknownStats = computeStats(undefined);

      json(res, {
        live,
        configured: configuredWithStats,
        unknown: unknownStats.totalRuns > 0 ? unknownStats : null,
      });
      return;

    // ── E-017 Self-Healing Selectors ──────────────────────────────────────
    } else if (pathname === '/api/healing' && req.method === 'GET') {
      // List all proposals; query ?state= filter optional
      const u = new URL(req.url || '', 'http://localhost');
      const stateFilter = u.searchParams.get('state');
      const all = loadAllHealingProposals(dir);
      const filtered = stateFilter ? all.filter(p => p.state === stateFilter) : all;
      json(res, { ok: true, proposals: filtered });
      return;

    } else if (pathname.match(/^\/api\/healing\/[^/]+$/) && req.method === 'GET') {
      const id = decodeURIComponent(pathname.split('/')[3]);
      const p = readHealingProposal(id, dir);
      if (!p) { res.writeHead(404); res.end('{"error":"Proposal not found"}'); return; }
      // Include the hierarchy snapshot text inline (capped) so the UI can show it
      let hierarchyText: string | undefined;
      if (p.hierarchySnapshotPath && fs.existsSync(p.hierarchySnapshotPath)) {
        try { hierarchyText = fs.readFileSync(p.hierarchySnapshotPath, 'utf-8').slice(0, 80_000); } catch { /* ignore */ }
      }
      json(res, { ok: true, proposal: p, hierarchyText });
      return;

    } else if (pathname === '/api/healing/propose' && req.method === 'POST') {
      // Manual trigger: { runId, testId, flowPath, platform, failedSelector, errorLine? }
      readBody(req, (body) => {
        try {
          const o = JSON.parse(body) as { runId?: string; testId?: string; flowPath?: string; platform?: string; failedSelector?: string; errorLine?: string };
          if (!o.testId || !o.flowPath || !o.failedSelector) { res.writeHead(400); res.end('{"error":"testId, flowPath, failedSelector required"}'); return; }
          const id = healingShortId();
          const now = new Date().toISOString();
          const proposal: HealingProposal = {
            id, runId: o.runId || 'manual-' + Date.now(), testId: o.testId, flowPath: o.flowPath,
            platform: o.platform || 'android', failedSelector: o.failedSelector,
            errorLine: o.errorLine, state: 'requested', createdAt: now, updatedAt: now,
          };
          writeHealingProposal(proposal, dir);
          void runHealingPipeline(id, dir).catch(err => console.error('[healing] manual pipeline crashed:', err));
          json(res, { ok: true, id });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;

    } else if (pathname.match(/^\/api\/healing\/[^/]+\/modify$/) && req.method === 'POST') {
      // S-017-005 "Modify": store an edited selector before approval
      const id = decodeURIComponent(pathname.split('/')[3]);
      readBody(req, (body) => {
        try {
          const { selector } = JSON.parse(body) as { selector?: string };
          if (!selector || !selector.trim()) { res.writeHead(400); res.end('{"error":"selector required"}'); return; }
          const cur = readHealingProposal(id, dir);
          if (!cur) { res.writeHead(404); res.end('{"error":"Proposal not found"}'); return; }
          const next: HealingProposal = { ...cur, modifiedSelector: selector.trim(), updatedAt: new Date().toISOString() };
          writeHealingProposal(next, dir);
          json(res, { ok: true, proposal: next });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;

    } else if (pathname.match(/^\/api\/healing\/[^/]+\/approve$/) && req.method === 'POST') {
      // S-017-006: apply the approved selector to the YAML on disk.
      const id = decodeURIComponent(pathname.split('/')[3]);
      const cur = readHealingProposal(id, dir);
      if (!cur) { res.writeHead(404); res.end('{"error":"Proposal not found"}'); return; }
      const sel = (cur.modifiedSelector || cur.proposedSelector || '').trim();
      if (!sel) { res.writeHead(400); res.end('{"error":"No selector to apply"}'); return; }
      if (!cur.flowPath || !fs.existsSync(cur.flowPath)) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Flow path missing: ' + cur.flowPath })); return;
      }
      // First mark approved so the audit trail shows the user click even if the write fails
      writeHealingProposal({ ...cur, state: 'approved', updatedAt: new Date().toISOString() }, dir);
      try {
        const out = replaceSelectorInFlow(cur.flowPath, cur.failedSelector, sel);
        if (!out.replaced) {
          // S-017-006 AC4: keep state=approved so user can retry
          res.writeHead(409); res.end(JSON.stringify({ ok: false, error: 'Selector "' + cur.failedSelector + '" not found in flow YAML', preservedState: 'approved' })); return;
        }
        const applied: HealingProposal = { ...cur, state: 'applied', appliedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        writeHealingProposal(applied, dir);
        // Append a row to the test case's changelog so the human edit is auditable
        try {
          updateTestCaseById(cur.testId, {} as Partial<TestCase>, dir, 'self-heal: ' + cur.failedSelector + ' → ' + sel + ' (proposal ' + id + ')');
        } catch (err) { console.warn('[healing] failed to record test changelog:', err); }
        json(res, { ok: true, proposal: applied });
      } catch (err) {
        // S-017-006 AC4: write failure → leave at 'approved' so the user can retry
        res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(err), preservedState: 'approved' })); return;
      }
      return;

    } else if (pathname.match(/^\/api\/healing\/[^/]+\/reject$/) && req.method === 'POST') {
      const id = decodeURIComponent(pathname.split('/')[3]);
      const cur = readHealingProposal(id, dir);
      if (!cur) { res.writeHead(404); res.end('{"error":"Proposal not found"}'); return; }
      writeHealingProposal({ ...cur, state: 'rejected', updatedAt: new Date().toISOString() }, dir);
      json(res, { ok: true });
      return;

    // ── E-016 / S-016-003: Jira webhook receiver ──────────────────────────
    } else if (pathname === '/api/webhook/jira' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          // Jira webhook payload: { webhookEvent, issue: { key, fields: { status: { name } } } }
          const payload = JSON.parse(body) as { webhookEvent?: string; issue?: { key?: string; fields?: { status?: { name?: string } } } };
          const jiraKey = payload.issue?.key;
          const newJiraStatus = payload.issue?.fields?.status?.name;
          if (!jiraKey) { res.writeHead(400); res.end('{"error":"issue.key missing"}'); return; }
          // Find local bug by jiraKey across the active project
          const bugs = loadAllBugs(dir);
          const bug = bugs.find(b => b.jiraKey === jiraKey || b.id === jiraKey);
          if (!bug) {
            // 200 OK with note — Jira is not interested in our 4xx, and an unknown key isn't an error.
            json(res, { ok: true, note: 'No local bug for ' + jiraKey });
            return;
          }
          const isStatusChange = !!newJiraStatus && newJiraStatus !== bug.jiraStatus;
          const isInteresting = (payload.webhookEvent || '').includes('issue_updated') || isStatusChange;
          if (isInteresting) {
            triggerImpactRegen(bug.id, dir, 'jira-webhook: ' + (payload.webhookEvent || 'updated') + (isStatusChange ? ' → ' + newJiraStatus : ''));
            json(res, { ok: true, enqueued: bug.id, reason: 'status-change' });
          } else {
            json(res, { ok: true, skipped: bug.id, reason: 'no relevant change' });
          }
        } catch (err) {
          res.writeHead(400); res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;

    // ── E-016 Bug-Impact AI ───────────────────────────────────────────────
    } else if (pathname.match(/^\/api\/bug\/[^/]+\/impact$/) && req.method === 'GET') {
      const bugId = decodeURIComponent(pathname.split('/')[3]);
      const impact = readBugImpact(bugId, dir);
      json(res, { ok: true, impact, errorsLast10: bugImpactErrors.filter(e => e.bugId === bugId).slice(-3) });
      return;

    } else if (pathname.match(/^\/api\/bug\/[^/]+\/impact\/generate$/) && req.method === 'POST') {
      const bugId = decodeURIComponent(pathname.split('/')[3]);
      void (async () => {
        const r = await generateBugImpact(bugId, dir);
        if (r.ok) json(res, { ok: true, impact: r.impact });
        else { res.writeHead(502); res.end(JSON.stringify({ ok: false, error: r.error, preservedExisting: r.preservedExisting })); }
      })();
      return;

    } else if (pathname.match(/^\/api\/bug\/[^/]+\/impact\/flag$/) && req.method === 'POST') {
      // S-016-005: capture a "not relevant" flag against a related-test row.
      // Stored as a sidecar JSON next to the impact file so the impact.md stays clean for diffs.
      const bugId = decodeURIComponent(pathname.split('/')[3]);
      readBody(req, (body) => {
        try {
          const { testId, kind, reason } = JSON.parse(body) as { testId?: string; kind?: 'rerun' | 'manualVerify'; reason?: string };
          if (!testId || !kind) { res.writeHead(400); res.end('{"error":"testId and kind required"}'); return; }
          const flagsPath = path.join(dir, 'bugs', bugId, 'impact-flags.json');
          let flags: Array<{ testId: string; kind: string; reason: string; flaggedAt: string }> = [];
          try { if (fs.existsSync(flagsPath)) flags = JSON.parse(fs.readFileSync(flagsPath, 'utf-8')); } catch { /* fresh */ }
          // Toggle: if already flagged with same kind+testId, remove it.
          const idx = flags.findIndex(f => f.testId === testId && f.kind === kind);
          if (idx >= 0) flags.splice(idx, 1);
          else flags.push({ testId, kind, reason: reason || '', flaggedAt: new Date().toISOString() });
          fs.mkdirSync(path.dirname(flagsPath), { recursive: true });
          fs.writeFileSync(flagsPath, JSON.stringify(flags, null, 2));
          json(res, { ok: true, flags });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;

    } else if (pathname.match(/^\/api\/bug\/[^/]+\/impact\/flags$/) && req.method === 'GET') {
      const bugId = decodeURIComponent(pathname.split('/')[3]);
      const flagsPath = path.join(dir, 'bugs', bugId, 'impact-flags.json');
      let flags: unknown[] = [];
      try { if (fs.existsSync(flagsPath)) flags = JSON.parse(fs.readFileSync(flagsPath, 'utf-8')); } catch { /* none */ }
      json(res, { ok: true, flags });
      return;

    // ── E-023 / S-023-003: PMAgent preview (parse + counts, no write) ─────
    } else if (pathname === '/api/pmagent/preview' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const o = JSON.parse(body) as { pmagentSlug?: string; pmagentPath?: string };
          const slug = (o.pmagentSlug || '').trim();
          if (!slug) { res.writeHead(400); res.end('{"ok":false,"error":"pmagentSlug required"}'); return; }
          const resolved = resolvePMAgentPath(slug, o.pmagentPath);
          if (!resolved || !fs.existsSync(resolved)) {
            res.writeHead(404); res.end(JSON.stringify({ ok: false, error: 'PMAgent path not found: ' + (resolved || '?') })); return;
          }
          const r = parsePMAgentProject(resolved, slug);
          const sample = r.parsed.categories
            .flatMap(c => c.testCases.slice(0, 2).map(tc => ({
              id: tc.id, title: tc.title, category: c.name, scenario: tc.scenario,
              storyId: tc.pmagentSource?.storyId, acIndex: tc.pmagentSource?.acIndex,
            })))
            .slice(0, 5);
          json(res, {
            ok: true,
            resolvedPath: resolved,
            categories: r.parsed.categories.map(c => ({ id: c.id, name: c.name, sheet: c.sheet, count: c.testCases.length })),
            totalTestCases: r.parsed.totalTestCases,
            skippedSheets: r.parsed.skippedSheets,
            warnings: r.warnings.slice(0, 10),
            sample,
          });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;

    // ── E-023 / S-023-003: PMAgent transfer ───────────────────────────────
    } else if (pathname === '/api/pmagent/transfer' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const o = JSON.parse(body) as { pmagentSlug?: string; pmagentPath?: string; morbiusProjectId?: string; createIfMissing?: boolean; force?: boolean };
          if (!o.pmagentSlug) { res.writeHead(400); res.end('{"ok":false,"error":"pmagentSlug required"}'); return; }
          void (async () => {
            const r = await runPMAgentTransfer({
              pmagentSlug: o.pmagentSlug!,
              pmagentPathOverride: o.pmagentPath,
              morbiusProjectId: o.morbiusProjectId,
              createIfMissing: o.createIfMissing,
              force: o.force,
            });
            if (r.ok) json(res, r);
            else { res.writeHead(400); res.end(JSON.stringify(r)); }
          })();
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;

    // ── E-023: PMAgent publish-back — render Morbius test cases as T-*.md test plans ─
    } else if (pathname === '/api/pmagent/publish-test-plans' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const o = JSON.parse(body) as { pmagentSlug?: string; pmagentPath?: string; morbiusProjectId?: string; force?: boolean };
          if (!o.pmagentSlug) { res.writeHead(400); res.end('{"ok":false,"error":"pmagentSlug required"}'); return; }
          const resolved = resolvePMAgentPath(o.pmagentSlug, o.pmagentPath);
          if (!resolved || !fs.existsSync(resolved)) {
            res.writeHead(404); res.end(JSON.stringify({ ok: false, error: 'PMAgent path not found: ' + (resolved || '?') })); return;
          }
          const morbiusProjectId = o.morbiusProjectId?.trim() || (loadProjectRegistry().projects.find(p => p.pmagentSlug === o.pmagentSlug)?.id) || o.pmagentSlug.trim();
          const morbiusDir = path.join(getDataRoot(), morbiusProjectId);
          if (!fs.existsSync(morbiusDir)) {
            res.writeHead(404); res.end(JSON.stringify({ ok: false, error: 'Morbius project dir not found: ' + morbiusDir })); return;
          }
          const tests = loadAllTestCases(morbiusDir);
          const sourced = tests.filter(t => t.pmagentSource && t.pmagentSource.slug === o.pmagentSlug);
          if (sourced.length === 0) {
            res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'No Morbius test cases with pmagent_source.slug=' + o.pmagentSlug + '. Run /api/pmagent/transfer first.' })); return;
          }
          const result = publishTestPlansToPMAgent({
            slug: o.pmagentSlug.trim(),
            pmagentPath: resolved,
            morbiusTestCases: sourced,
            force: !!o.force,
          });
          if (!result.ok) { res.writeHead(500); res.end(JSON.stringify(result)); return; }
          json(res, { ...result, morbiusProjectId, sourceTestCases: sourced.length });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;

    // ── E-023 / S-023-001: PMAgent path stat check ────────────────────────
    } else if (pathname === '/api/pmagent/test-path' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const { pmagentSlug, pmagentPath: pathOverride } = JSON.parse(body) as { pmagentSlug?: string; pmagentPath?: string };
          const home = process.env.PMAGENT_HOME || '/Users/sdas/PMAgent';
          let resolvedPath = '';
          if (pathOverride && pathOverride.trim()) resolvedPath = pathOverride.trim();
          else if (pmagentSlug && pmagentSlug.trim()) resolvedPath = path.join(home, 'projects', pmagentSlug.trim());
          else { res.writeHead(400); res.end('{"ok":false,"error":"Provide pmagentSlug or pmagentPath"}'); return; }
          if (!fs.existsSync(resolvedPath)) {
            res.writeHead(404); res.end(JSON.stringify({ ok: false, error: 'Path does not exist: ' + resolvedPath, resolvedPath })); return;
          }
          const stat = fs.statSync(resolvedPath);
          if (!stat.isDirectory()) {
            res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'Not a directory: ' + resolvedPath, resolvedPath })); return;
          }
          const epicsDir = path.join(resolvedPath, 'epics');
          let epicCount = 0, storyCount = 0;
          if (fs.existsSync(epicsDir)) {
            const epics = fs.readdirSync(epicsDir).filter(n => /^E-\d+/.test(n));
            epicCount = epics.length;
            for (const e of epics) {
              const sub = path.join(epicsDir, e);
              if (!fs.statSync(sub).isDirectory()) continue;
              storyCount += fs.readdirSync(sub).filter(n => /^S-\d+-\d+.*\.md$/.test(n) && !n.endsWith('.v2.md')).length;
            }
          }
          json(res, { ok: true, resolvedPath, epicCount, storyCount });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: String(err) })); }
      });
      return;

    } else if (pathname === '/api/jira/errors' && req.method === 'GET') {
      // S-013-001: ring buffer of last 20 Jira errors. Newest last.
      json(res, { errors: getJiraErrors() });
      return;

    } else if (pathname === '/api/jira/health' && req.method === 'GET') {
      // S-013-002: aggregated health for the Settings panel
      json(res, computeJiraHealth(dir));
      return;

    } else if (pathname === '/api/jira/queue' && req.method === 'GET') {
      // S-013-004: the replay queue (used by the Settings panel + manual retry UI)
      const state = loadJiraSyncState(dir);
      json(res, { queue: state.queue, attachmentHashes: state.attachmentHashes });
      return;

    } else if (pathname === '/api/jira/queue/replay' && req.method === 'POST') {
      // Force an immediate replay tick (useful for manual "retry now" from the UI)
      void (async () => {
        const result = await replayJiraQueue(dir);
        json(res, { ok: true, ...result });
      })();
      return;

    } else if (pathname.match(/^\/api\/jira\/queue\/[^/]+\/retry$/) && req.method === 'POST') {
      const itemId = pathname.split('/')[4];
      const state = loadJiraSyncState(dir);
      const item = state.queue.find(q => q.id === itemId);
      if (!item) { res.writeHead(404); res.end('{"error":"Queue item not found"}'); return; }
      // Reset attempts so it runs immediately on next replay (or now)
      item.attempts = Math.max(0, item.attempts - 5);
      item.stuck = false;
      item.lastFailedAt = new Date(0).toISOString();
      saveJiraSyncState(dir, state);
      void (async () => {
        const r = await retryJiraQueueItem(item, dir);
        if (r.ok) {
          // remove from queue
          const s2 = loadJiraSyncState(dir);
          s2.queue = s2.queue.filter(q => q.id !== itemId);
          saveJiraSyncState(dir, s2);
        }
        json(res, { ok: r.ok, code: r.ok ? undefined : r.code, message: r.ok ? undefined : r.message });
      })();
      return;

    } else if (pathname.match(/^\/api\/jira\/queue\/[^/]+\/discard$/) && req.method === 'POST') {
      const itemId = pathname.split('/')[4];
      const state = loadJiraSyncState(dir);
      const before = state.queue.length;
      state.queue = state.queue.filter(q => q.id !== itemId);
      if (state.queue.length === before) { res.writeHead(404); res.end('{"error":"Queue item not found"}'); return; }
      saveJiraSyncState(dir, state);
      json(res, { ok: true, removed: itemId });
      return;

    } else if (pathname.startsWith('/api/bugs/') && pathname.endsWith('/sync-jira') && req.method === 'POST') {
      const bugId = decodeURIComponent(pathname.replace('/api/bugs/', '').replace('/sync-jira', ''));
      (async () => {
        const result = await syncBugFromJira(bugId, dir);
        if (!result.ok) {
          // Map error codes to HTTP status. AUTH/CONFIG → 401/400 so UI can react.
          const httpStatus = result.code === 'AUTH' || result.code === 'PERMISSION' ? 401
                            : result.code === 'NOT_FOUND' ? 404
                            : result.code === 'CONFIG' ? 400
                            : result.code === 'RATE_LIMIT' ? 429
                            : 502;
          res.writeHead(httpStatus); res.end(JSON.stringify({ ok: false, code: result.code, message: result.message }));
          return;
        }
        json(res, { ok: true, ...result.data });
      })();
      return;

    } else if (pathname === '/api/bugs/sync-all' && req.method === 'POST') {
      // S-013-001: synchronous, await each, surface per-bug results. No more silent loop.
      const bugs = loadAllBugs(dir);
      const jiraBugs = bugs.filter(b => b.jiraKey);
      (async () => {
        const results: Array<{ id: string; jiraKey?: string; ok: boolean; code?: JiraErrorCode; message?: string }> = [];
        let succeeded = 0, failed = 0;
        for (const b of jiraBugs) {
          const r = await syncBugFromJira(b.id, dir);
          if (r.ok) { succeeded++; results.push({ id: b.id, jiraKey: b.jiraKey, ok: true }); }
          else      { failed++;    results.push({ id: b.id, jiraKey: b.jiraKey, ok: false, code: r.code, message: r.message }); }
        }
        json(res, { ok: failed === 0, total: jiraBugs.length, succeeded, failed, results });
      })();
      return;

    // ── F3a: Excel preview (S-014-002) — parse only, no disk write ────────
    } else if (pathname === '/api/excel/preview' && req.method === 'POST') {
      const tmpPath = path.join(os.tmpdir(), `morbius-preview-${Date.now()}.xlsx`);
      readRawBody(req, (buf) => {
        try {
          if (!buf || buf.length === 0) { res.writeHead(400); res.end('{"error":"Empty upload"}'); return; }
          fs.writeFileSync(tmpPath, buf);
          const parsed = parseExcelFile(tmpPath);
          try { fs.unlinkSync(tmpPath); } catch {}
          // Return a UI-friendly summary plus a small sample
          const sampleSize = 5;
          const sample = parsed.categories
            .flatMap(c => c.testCases.slice(0, 2).map(tc => ({
              id: tc.id, title: tc.title, category: c.name, scenario: tc.scenario, status: tc.status,
            })))
            .slice(0, sampleSize);
          json(res, {
            ok: true,
            categories: parsed.categories.map(c => ({ name: c.name, slug: c.id, sheet: c.sheet, count: c.testCases.length })),
            totalTestCases: parsed.totalTestCases,
            skippedSheets: parsed.skippedSheets,
            sample,
          });
        } catch (err) {
          try { fs.unlinkSync(tmpPath); } catch {}
          res.writeHead(400); res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
        }
      });
      return;

    // ── F3: Excel re-import via file upload ───────────────────────────────
    } else if (pathname === '/api/excel/import' && req.method === 'POST') {
      const tmpPath = path.join(os.tmpdir(), `morbius-upload-${Date.now()}.xlsx`);
      readRawBody(req, (buf) => {
        try {
          fs.writeFileSync(tmpPath, buf);
          const result = importExcel(tmpPath, dir);
          try { fs.unlinkSync(tmpPath); } catch {}
          json(res, { ok: true, categories: result.categories, testCases: result.testCases, skipped: result.skippedSheets });
        } catch (err) {
          try { fs.unlinkSync(tmpPath); } catch {}
          res.writeHead(500); res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;

    // ── F4: Partial-update active project config ──────────────────────────
    } else if (pathname === '/api/config/update' && req.method === 'POST') {
      readBody(req, (body) => {
        try {
          const updates = JSON.parse(body);
          const registry = loadProjectRegistry();
          const proj = registry.projects.find((p: any) => p.id === registry.activeProject);
          if (!proj) { res.writeHead(404); res.end('{"error":"Active project not found"}'); return; }
          // Deep-merge top-level keys (maestro, env, jira, runSettings)
          const projAny = proj as Record<string, any>;
          for (const key of Object.keys(updates)) {
            if (updates[key] !== null && typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
              projAny[key] = { ...(projAny[key] || {}), ...updates[key] };
            } else {
              projAny[key] = updates[key];
            }
          }
          saveProjectRegistry(registry);
          json(res, { ok: true });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
      return;

    // ── F5: Create Jira issue from a Morbius bug ──────────────────────────
    } else if (pathname.match(/^\/api\/bugs\/[^/]+\/create-jira$/) && req.method === 'POST') {
      const bugId = pathname.split('/')[3];
      const bugs = loadAllBugs(dir);
      const bug = bugs.find(b => b.id === bugId);
      if (!bug) { res.writeHead(404); res.end('{"error":"Bug not found"}'); return; }

      const cfg = getJiraCfg();
      if (!cfg.ok) { res.writeHead(400); res.end(JSON.stringify({ ok: false, code: cfg.code, message: cfg.message })); return; }
      if (!cfg.projectKey) { res.writeHead(400); res.end(JSON.stringify({ ok: false, code: 'CONFIG', message: 'Jira projectKey not set in Settings → Integrations' })); return; }

      const PRIORITY_MAP: Record<string, string> = { P0:'Highest', P1:'High', P2:'Medium', P3:'Low' };
      const payload = {
        fields: {
          project: { key: cfg.projectKey },
          summary: `[${bug.id}] ${bug.title}`,
          description: {
            type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text',
              text: [
                `Device: ${bug.device || '—'}`,
                `Priority: ${bug.priority || '—'}`,
                bug.linkedTest ? `Linked test: ${bug.linkedTest}` : '',
                bug.failureReason ? `\nFailure: ${bug.failureReason}` : '',
              ].filter(Boolean).join(' | ')
            }] }]
          },
          issuetype: { name: 'Bug' },
          priority: { name: PRIORITY_MAP[bug.priority] || 'Medium' },
        }
      };

      (async () => {
        const r = await jiraCall<{ key: string; self: string }>({
          url: `${jiraApiBase(cfg)}/rest/api/3/issue`,
          method: 'POST',
          body: payload,
          email: cfg.email, token: cfg.token, bugId,
        });
        if (!r.ok) {
          const httpStatus = r.code === 'AUTH' || r.code === 'PERMISSION' ? 401
                            : r.code === 'NOT_FOUND' ? 404
                            : r.code === 'RATE_LIMIT' ? 429
                            : 502;
          res.writeHead(httpStatus); res.end(JSON.stringify({ ok: false, code: r.code, message: r.message })); return;
        }
        const jiraKey = r.data.key;
        const jiraUrl = `https://${cfg.cloudId}.atlassian.net/browse/${jiraKey}`;
        updateBugById(bugId, { jiraKey, jiraUrl, jiraStatus: 'Open' } as Partial<Bug>, dir, 'morbius');
        json(res, { ok: true, jiraKey, jiraUrl });
      })();
      return;

    } else {
      res.writeHead(404);
      res.end('{"error":"Not found"}');
    }
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
}

function json(res: http.ServerResponse, data: unknown): void {
  res.writeHead(200);
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage, cb: (body: string) => void): void {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => cb(body));
}

function readRawBody(req: http.IncomingMessage, cb: (buf: Buffer) => void): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => cb(Buffer.concat(chunks)));
}

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Jira sync instrumentation (S-013-001)
// Single chokepoint for every Jira REST call:
//   • Standardized Basic auth (email + API token — Atlassian Cloud REST v3)
//   • Distinct error codes per failure mode (AUTH/PERMISSION/NOT_FOUND/CONFLICT/RATE_LIMIT/SERVER/NETWORK/BAD_REQUEST)
//   • Exponential backoff retry, max 3 attempts, retryable failures only
//   • Ring buffer of last 20 errors readable via /api/jira/errors
// ─────────────────────────────────────────────────────────────────────────────

type JiraErrorCode = 'AUTH' | 'PERMISSION' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMIT'
                   | 'SERVER' | 'NETWORK' | 'BAD_REQUEST' | 'CONFIG' | 'PARSE';

interface JiraErrorEntry {
  ts: string;            // ISO timestamp
  code: JiraErrorCode;
  message: string;
  url: string;
  method: string;
  status?: number;
  attempt: number;
  bugId?: string;
  retryable: boolean;
}

const JIRA_ERROR_BUFFER_SIZE = 20;
const jiraErrorBuffer: JiraErrorEntry[] = [];

function recordJiraError(e: JiraErrorEntry): void {
  jiraErrorBuffer.push(e);
  while (jiraErrorBuffer.length > JIRA_ERROR_BUFFER_SIZE) jiraErrorBuffer.shift();
  // Always log to stderr so operators tailing logs see every failure.
  console.error(`[jira] ${e.code} ${e.method} ${e.url} → ${e.status ?? '-'} (attempt ${e.attempt}${e.bugId ? ', bug=' + e.bugId : ''}): ${e.message}`);
}

function getJiraErrors(): JiraErrorEntry[] { return [...jiraErrorBuffer]; }

function classifyJiraStatus(status: number): { code: JiraErrorCode; retryable: boolean } {
  if (status === 401) return { code: 'AUTH', retryable: false };
  if (status === 403) return { code: 'PERMISSION', retryable: false };
  if (status === 404) return { code: 'NOT_FOUND', retryable: false };
  if (status === 409) return { code: 'CONFLICT', retryable: false };
  if (status === 429) return { code: 'RATE_LIMIT', retryable: true };
  if (status >= 500) return { code: 'SERVER', retryable: true };
  return { code: 'BAD_REQUEST', retryable: false };
}

interface JiraSuccess<T> { ok: true; status: number; data: T; }
interface JiraFailure  { ok: false; code: JiraErrorCode; status?: number; message: string; }
type JiraResult<T> = JiraSuccess<T> | JiraFailure;

async function jiraCall<T = unknown>(opts: {
  url: string;
  method?: string;
  body?: unknown;
  email: string;
  token: string;
  bugId?: string;
}): Promise<JiraResult<T>> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {
    'Authorization': `Basic ${Buffer.from(`${opts.email}:${opts.token}`).toString('base64')}`,
    'Accept': 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const init: { method: string; headers: Record<string, string>; body?: string } = { method, headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  const MAX_ATTEMPTS = 3;
  let lastFailure: JiraFailure | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(opts.url, init);
      if (resp.ok) {
        const data = await resp.json().catch(() => ({})) as T;
        return { ok: true, status: resp.status, data };
      }
      const cls = classifyJiraStatus(resp.status);
      const errText = await resp.text().catch(() => '');
      const message = (errText ? errText.slice(0, 400) : resp.statusText) || `HTTP ${resp.status}`;
      recordJiraError({
        ts: new Date().toISOString(),
        code: cls.code,
        message, url: opts.url, method, status: resp.status,
        attempt, bugId: opts.bugId, retryable: cls.retryable,
      });
      lastFailure = { ok: false, code: cls.code, status: resp.status, message };
      if (!cls.retryable || attempt === MAX_ATTEMPTS) return lastFailure;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      recordJiraError({
        ts: new Date().toISOString(),
        code: 'NETWORK',
        message, url: opts.url, method,
        attempt, bugId: opts.bugId, retryable: true,
      });
      lastFailure = { ok: false, code: 'NETWORK', message };
      if (attempt === MAX_ATTEMPTS) return lastFailure;
    }
    // Exponential backoff: 500ms, 1500ms (only between retries)
    await new Promise(r => setTimeout(r, 500 * Math.pow(3, attempt - 1)));
  }
  return lastFailure ?? { ok: false, code: 'NETWORK', message: 'retry exhausted' };
}

interface JiraCfgOk { ok: true; cloudId: string; email: string; token: string; projectKey?: string; baseUrl?: string; }
interface JiraCfgMissing { ok: false; code: 'CONFIG'; missing: string[]; message: string; }
type JiraCfgResult = JiraCfgOk | JiraCfgMissing;

function getJiraCfg(): JiraCfgResult {
  const registry = loadProjectRegistry();
  const project = registry.projects.find(p => p.id === registry.activeProject);
  const cfg = (project as { jira?: { cloudId?: string; email?: string; token?: string; projectKey?: string; baseUrl?: string } } | undefined)?.jira;
  const missing: string[] = [];
  if (!cfg?.cloudId) missing.push('cloudId');
  if (!cfg?.email)   missing.push('email');
  if (!cfg?.token)   missing.push('token');
  if (missing.length) {
    const message = `Jira not configured (missing: ${missing.join(', ')}). Set them in Settings → Integrations.`;
    return { ok: false, code: 'CONFIG', missing, message };
  }
  return { ok: true, cloudId: cfg!.cloudId!, email: cfg!.email!, token: cfg!.token!, projectKey: cfg!.projectKey, baseUrl: cfg!.baseUrl };
}

function jiraApiBase(cfg: JiraCfgOk): string {
  return cfg.baseUrl || `https://api.atlassian.com/ex/jira/${cfg.cloudId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side Claude bridge (E-006/Guardrail #5: reuse Claude Code CLI, no SDK).
// Used by E-016 (Bug-Impact AI) and E-017 (Self-Healing Selectors).
// Spawns `claude --print --model <m> <prompt>`, captures stdout, returns text.
// ─────────────────────────────────────────────────────────────────────────────

interface AskClaudeOpts {
  timeoutMs?: number;
  model?: string;
  cwd?: string;
  kind?: AgentActivityKind;   // E-027 S-027-005: tag the call so we can roll up time-on-task per surface
  projectId?: string;          // E-027 S-027-005: which project's activity log gets the entry
}

interface AskClaudeOk { ok: true; text: string; durationMs: number; }
interface AskClaudeErr { ok: false; error: string; durationMs: number; }
type AskClaudeResult = AskClaudeOk | AskClaudeErr;

// ─────────────────────────────────────────────────────────────────────────────
// E-027 / S-027-005: per-project Agent Activity Log (JSONL)
// File: data/{projectId}/agent-activity.json — one JSON object per line.
// Rolled to agent-activity-archive.json past 1000 entries to keep reads cheap.
// ─────────────────────────────────────────────────────────────────────────────

type AgentActivityKind = 'bug-impact' | 'appmap-narrative' | 'healing' | 'other';

interface AgentActivityEntry {
  at: string;            // ISO timestamp
  kind: AgentActivityKind;
  durationMs: number;
  projectId: string;
  ok: boolean;
}

const AGENT_ACTIVITY_MAX_ENTRIES = 1000;

function agentActivityPath(projectDir: string): string {
  return path.join(projectDir, 'agent-activity.json');
}
function agentActivityArchivePath(projectDir: string): string {
  return path.join(projectDir, 'agent-activity-archive.json');
}

function appendAgentActivity(entry: AgentActivityEntry): void {
  if (!entry.projectId) return;
  const projectDir = path.join(DATA_DIR, entry.projectId);
  try {
    fs.mkdirSync(projectDir, { recursive: true });
    const file = agentActivityPath(projectDir);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8');

    // Rotate if too big — read line count cheaply, move oldest lines to archive.
    const stat = fs.statSync(file);
    if (stat.size > 100_000) {                  // skip the line count walk unless file is sizable
      const text = fs.readFileSync(file, 'utf-8');
      const lines = text.split('\n').filter(Boolean);
      if (lines.length > AGENT_ACTIVITY_MAX_ENTRIES) {
        const keep = lines.slice(-AGENT_ACTIVITY_MAX_ENTRIES);
        const archive = lines.slice(0, lines.length - AGENT_ACTIVITY_MAX_ENTRIES);
        fs.appendFileSync(agentActivityArchivePath(projectDir), archive.join('\n') + '\n', 'utf-8');
        fs.writeFileSync(file, keep.join('\n') + '\n', 'utf-8');
      }
    }
  } catch (err) {
    console.error('[agent-activity] append failed:', err);
  }
}

function readAgentActivity(projectDir: string, kindFilter?: AgentActivityKind): AgentActivityEntry[] {
  const file = agentActivityPath(projectDir);
  if (!fs.existsSync(file)) return [];
  try {
    const text = fs.readFileSync(file, 'utf-8');
    const out: AgentActivityEntry[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as AgentActivityEntry;
        if (!kindFilter || e.kind === kindFilter) out.push(e);
      } catch { /* skip corrupt line */ }
    }
    return out;
  } catch (err) {
    console.error('[agent-activity] read failed:', err);
    return [];
  }
}

async function askClaude(prompt: string, opts: AskClaudeOpts = {}): Promise<AskClaudeResult> {
  const t0 = Date.now();
  const model = opts.model || 'claude-sonnet-4-6';
  const timeoutMs = opts.timeoutMs ?? 180_000;
  return new Promise<AskClaudeResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const settle = (r: AskClaudeResult) => {
      if (settled) return;
      settled = true;
      // E-027 S-027-005: auto-log every Claude call that was tagged with kind+projectId.
      if (opts.kind && opts.projectId) {
        appendAgentActivity({
          at: new Date().toISOString(),
          kind: opts.kind,
          durationMs: r.durationMs,
          projectId: opts.projectId,
          ok: r.ok,
        });
      }
      resolve(r);
    };
    let child: ChildProcess;
    try {
      child = spawn('claude', ['--print', '--model', model, prompt], {
        cwd: opts.cwd || process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      return settle({ ok: false, error: 'spawn failed: ' + (err instanceof Error ? err.message : String(err)), durationMs: Date.now() - t0 });
    }
    child.stdin?.end();
    const to = setTimeout(() => { child.kill('SIGTERM'); settle({ ok: false, error: `timeout after ${timeoutMs}ms`, durationMs: Date.now() - t0 }); }, timeoutMs);
    child.stdout?.on('data', (b: Buffer) => { stdout += b.toString(); });
    child.stderr?.on('data', (b: Buffer) => { stderr += b.toString(); });
    child.on('close', (code) => {
      clearTimeout(to);
      const dur = Date.now() - t0;
      if (code === 0 && stdout.trim()) settle({ ok: true, text: stdout, durationMs: dur });
      else {
        // The Claude CLI prints auth/usage errors to stdout (e.g. "Failed to authenticate. API Error: 401")
        // and reserves stderr for crashes. Include both so callers see the real diagnostic.
        const detail = (stderr || stdout || '').trim().slice(0, 400);
        settle({ ok: false, error: 'claude exited ' + code + (detail ? ' — ' + detail : ''), durationMs: dur });
      }
    });
    child.on('error', (err) => { clearTimeout(to); settle({ ok: false, error: err.message, durationMs: Date.now() - t0 }); });
  });
}

// Extract a JSON object from Claude's response (handles ```json fences and prose-wrapped JSON).
function extractJson<T = unknown>(text: string): { ok: true; data: T } | { ok: false; error: string } {
  if (!text) return { ok: false, error: 'empty response' };
  // Strip ```json ... ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  // Find first { or [ and last matching close
  const firstObj = candidate.indexOf('{');
  const firstArr = candidate.indexOf('[');
  let start = -1, openCh = '', closeCh = '';
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) { start = firstObj; openCh = '{'; closeCh = '}'; }
  else if (firstArr >= 0) { start = firstArr; openCh = '['; closeCh = ']'; }
  if (start < 0) return { ok: false, error: 'no JSON found in response' };
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === openCh) depth++;
    else if (c === closeCh) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return { ok: false, error: 'unbalanced JSON in response' };
  try {
    return { ok: true, data: JSON.parse(candidate.slice(start, end + 1)) as T };
  } catch (err) {
    return { ok: false, error: 'JSON.parse failed: ' + (err instanceof Error ? err.message : String(err)) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// E-016 / S-016-002 + S-016-005: Bug-Impact AI generation
// Builds a context window from the bug + linked test + sibling tests + recent
// runs + Maestro YAML, asks Claude for a JSON BugImpact, persists if valid,
// preserves the prior impact file on failure.
// ─────────────────────────────────────────────────────────────────────────────

const BUG_IMPACT_ERROR_BUFFER_SIZE = 10;
const bugImpactErrors: Array<{ ts: string; bugId: string; reason: string; durationMs: number }> = [];
function recordBugImpactError(e: { bugId: string; reason: string; durationMs: number }) {
  bugImpactErrors.push({ ts: new Date().toISOString(), ...e });
  while (bugImpactErrors.length > BUG_IMPACT_ERROR_BUFFER_SIZE) bugImpactErrors.shift();
  console.error('[bug-impact] ' + e.bugId + ' failed (' + e.durationMs + 'ms): ' + e.reason);
}

interface ImpactContext {
  bug: Bug;
  linkedTest: TestCase | null;
  siblingTests: TestCase[];   // in same category, excluding the linked test
  recentRuns: MaestroRunRecord[];  // for the linked test, last 5
  maestroYaml: string | null;
}

function buildImpactContext(bugId: string, projectDir: string): { ok: true; ctx: ImpactContext } | { ok: false; error: string } {
  const bugs = loadAllBugs(projectDir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug) return { ok: false, error: 'Bug ' + bugId + ' not found' };

  const tests = loadAllTestCases(projectDir);
  const linked = bug.linkedTest ? tests.find(t => t.id === bug.linkedTest) || null : null;
  const siblings = linked ? tests.filter(t => t.category === linked.category && t.id !== linked.id).slice(0, 20) : [];

  // Recent runs for the linked test
  let recentRuns: MaestroRunRecord[] = [];
  if (linked) {
    const runsDir = path.join(projectDir, 'runs');
    if (fs.existsSync(runsDir)) {
      const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json') && !f.endsWith('-latest.json'));
      for (const f of files) {
        try {
          const rec = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8')) as MaestroRunRecord;
          if (rec.testId === linked.id) recentRuns.push(rec);
        } catch { /* skip */ }
      }
      recentRuns.sort((a, b) => b.startTime.localeCompare(a.startTime));
      recentRuns = recentRuns.slice(0, 5);
    }
  }

  // Maestro YAML for the linked test
  let maestroYaml: string | null = null;
  const yamlPath = (linked as TestCase & { maestroFlow?: string } | null)?.maestroFlow;
  if (yamlPath && fs.existsSync(yamlPath)) {
    try { maestroYaml = fs.readFileSync(yamlPath, 'utf-8').slice(0, 4000); } catch { /* skip */ }
  }

  return { ok: true, ctx: { bug, linkedTest: linked, siblingTests: siblings, recentRuns, maestroYaml } };
}

function buildImpactPrompt(ctx: ImpactContext): string {
  const { bug, linkedTest, siblingTests, recentRuns, maestroYaml } = ctx;

  const lines: string[] = [];
  lines.push('You are a QA impact-analysis agent for the Morbius dashboard. A bug has had its state change in the issue tracker. Your job is to produce a SHORT, FACT-BASED triage plan for the QA lead.');
  lines.push('');
  lines.push('Output ONLY a single JSON object — no prose, no explanation, no code fences. Schema:');
  lines.push('{');
  lines.push('  "riskScore": <number 0.0..1.0 — confidence the fix could regress related areas>,');
  lines.push('  "rerun": [ {"testId": "<TC-X>", "rationale": "<one short sentence — why rerun>"} ],');
  lines.push('  "manualVerify": [ {"testId": "<TC-Y>", "rationale": "<one short sentence — why human verification beats auto-rerun>"} ],');
  lines.push('  "reproNarrative": "<3–8 line numbered list, paste-ready for a tester. No headings, no boilerplate.>"');
  lines.push('}');
  lines.push('');
  lines.push('Rules:');
  lines.push('- Only reference test IDs that appear in the context. Do not invent IDs.');
  lines.push('- riskScore: <0.3 = low (cosmetic/isolated), 0.3–0.7 = medium (shared screen/state), >0.7 = high (auth, payments, data integrity).');
  lines.push('- Empty arrays are valid when nothing is relevant.');
  lines.push('');
  lines.push('## Bug');
  lines.push('id: ' + bug.id);
  lines.push('title: ' + bug.title);
  lines.push('status: ' + bug.status + (bug.jiraStatus ? ' (jira: ' + bug.jiraStatus + ')' : ''));
  lines.push('priority: ' + bug.priority);
  lines.push('device: ' + (bug.device || '—'));
  if (bug.failureReason)    lines.push('failureReason: ' + bug.failureReason);
  if (bug.stepsToReproduce) lines.push('stepsToReproduce: ' + bug.stepsToReproduce.slice(0, 600));
  if (bug.notes)            lines.push('notes: ' + bug.notes.slice(0, 400));
  lines.push('');

  if (linkedTest) {
    lines.push('## Linked Test (' + linkedTest.id + ')');
    lines.push('title: ' + linkedTest.title);
    lines.push('category: ' + linkedTest.category);
    lines.push('scenario: ' + linkedTest.scenario);
    if (linkedTest.steps)              lines.push('steps:\n' + linkedTest.steps.slice(0, 600));
    if (linkedTest.acceptanceCriteria) lines.push('acceptance:\n' + linkedTest.acceptanceCriteria.slice(0, 400));
    lines.push('');
  } else {
    lines.push('## Linked Test');
    lines.push('(none — bug has no linkedTest field; produce reproNarrative only and return empty arrays for rerun + manualVerify, with riskScore reflecting bug priority alone)');
    lines.push('');
  }

  if (siblingTests.length > 0) {
    lines.push('## Sibling Tests (same category, candidates for rerun)');
    for (const t of siblingTests) {
      lines.push('- ' + t.id + ' [' + t.status + '] — ' + t.title);
    }
    lines.push('');
  }

  if (recentRuns.length > 0) {
    lines.push('## Recent runs of linked test (newest first)');
    for (const r of recentRuns) {
      lines.push('- ' + r.startTime + ' on ' + r.platform + ': ' + r.status + (r.failingStep ? ' (failing: ' + r.failingStep + ')' : ''));
    }
    lines.push('');
  }

  if (maestroYaml) {
    lines.push('## Linked Maestro YAML (truncated)');
    lines.push('```yaml');
    lines.push(maestroYaml);
    lines.push('```');
    lines.push('');
  }

  lines.push('Respond with the JSON object only.');
  return lines.join('\n');
}

interface RawImpactResponse {
  riskScore?: unknown;
  rerun?: unknown;
  manualVerify?: unknown;
  reproNarrative?: unknown;
}

function validateRawImpact(raw: RawImpactResponse, knownTestIds: Set<string>): { ok: true; rerun: BugImpactRelatedTest[]; manualVerify: BugImpactRelatedTest[]; reproNarrative: string; riskScore: number } | { ok: false; error: string } {
  const score = typeof raw.riskScore === 'number' ? raw.riskScore : Number(raw.riskScore);
  if (!Number.isFinite(score) || score < 0 || score > 1) return { ok: false, error: 'riskScore must be a number 0..1' };
  const narr = typeof raw.reproNarrative === 'string' ? raw.reproNarrative.trim() : '';
  const coerce = (arr: unknown, label: string): BugImpactRelatedTest[] => {
    if (!Array.isArray(arr)) return [];
    const out: BugImpactRelatedTest[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const id = typeof obj.testId === 'string' ? obj.testId.trim() : '';
      const rationale = typeof obj.rationale === 'string' ? obj.rationale.trim() : '';
      if (!id) continue;
      // Loose validation — Claude sometimes returns IDs that aren't in our set; warn but keep them.
      // This avoids dropping a useful suggestion just because of an ID format quirk.
      if (id && !knownTestIds.has(id)) {
        console.warn('[bug-impact] ' + label + ' references unknown testId: ' + id);
      }
      out.push({ testId: id, rationale: rationale || '(no rationale)' });
    }
    return out;
  };
  return {
    ok: true,
    rerun: coerce(raw.rerun, 'rerun'),
    manualVerify: coerce(raw.manualVerify, 'manualVerify'),
    reproNarrative: narr,
    riskScore: score,
  };
}

// S-016-003: dedupe regen storms (webhook + polling can both fire). 60s window.
const recentImpactRegen = new Map<string, number>();   // bugId → epoch ms
function shouldSkipImpactRegen(bugId: string): boolean {
  const last = recentImpactRegen.get(bugId);
  return !!last && (Date.now() - last) < 60_000;
}
function noteImpactRegen(bugId: string): void { recentImpactRegen.set(bugId, Date.now()); }

// Fire-and-forget regen + bug changelog row. Used by webhook + polling sync.
function triggerImpactRegen(bugId: string, projectDir: string, reason: string): void {
  if (shouldSkipImpactRegen(bugId)) {
    console.log('[bug-impact] skipping regen for ' + bugId + ' (within 60s dedupe window)');
    return;
  }
  noteImpactRegen(bugId);
  void (async () => {
    const r = await generateBugImpact(bugId, projectDir);
    if (r.ok) {
      // Append a row to the bug's changelog
      try {
        updateBugById(bugId, {} as Partial<Bug>, projectDir, 'impact-regenerated: ' + reason);
      } catch (err) {
        console.error('[bug-impact] failed to record changelog row for ' + bugId + ':', err);
      }
    }
  })();
}

async function generateBugImpact(bugId: string, projectDir: string): Promise<{ ok: true; impact: BugImpact } | { ok: false; error: string; preservedExisting: boolean }> {
  const ctxRes = buildImpactContext(bugId, projectDir);
  if (!ctxRes.ok) {
    recordBugImpactError({ bugId, reason: ctxRes.error, durationMs: 0 });
    const existing = readBugImpact(bugId, projectDir);
    return { ok: false, error: ctxRes.error, preservedExisting: !!existing };
  }
  const prompt = buildImpactPrompt(ctxRes.ctx);
  // E-027 S-027-005: tag for activity log. projectId is the basename of projectDir.
  const projectIdFromDir = path.basename(projectDir);
  const res = await askClaude(prompt, { timeoutMs: 180_000, kind: 'bug-impact', projectId: projectIdFromDir });
  if (!res.ok) {
    recordBugImpactError({ bugId, reason: res.error, durationMs: res.durationMs });
    const existing = readBugImpact(bugId, projectDir);
    return { ok: false, error: res.error, preservedExisting: !!existing };
  }
  const json = extractJson<RawImpactResponse>(res.text);
  if (!json.ok) {
    recordBugImpactError({ bugId, reason: 'parse: ' + json.error + ' — preview: ' + res.text.slice(0, 200), durationMs: res.durationMs });
    const existing = readBugImpact(bugId, projectDir);
    return { ok: false, error: 'Could not parse Claude response: ' + json.error, preservedExisting: !!existing };
  }
  const knownIds = new Set(loadAllTestCases(projectDir).map(t => t.id));
  const v = validateRawImpact(json.data, knownIds);
  if (!v.ok) {
    recordBugImpactError({ bugId, reason: 'validate: ' + v.error, durationMs: res.durationMs });
    const existing = readBugImpact(bugId, projectDir);
    return { ok: false, error: v.error, preservedExisting: !!existing };
  }
  const impact: BugImpact = {
    bugId,
    generatedAt: new Date().toISOString(),
    bugStatus: ctxRes.ctx.bug.status,
    riskScore: v.riskScore,
    rerun: v.rerun,
    manualVerify: v.manualVerify,
    reproNarrative: v.reproNarrative,
    generatedBy: 'claude',
    modelDurationMs: res.durationMs,
  };
  writeBugImpact(impact, projectDir);
  return { ok: true, impact };
}

// ─────────────────────────────────────────────────────────────────────────────
// E-027 / S-027-002 + S-027-003: AppMap Narrative generation
// Mirrors the BugImpact pipeline: build context → askClaude → extractJson →
// validate → persist. Single project-level file, overwritten on regen.
// ─────────────────────────────────────────────────────────────────────────────

interface AppMapFlowInfo {
  flowId: string;             // basename without .yaml
  fileName: string;
  filePath: string;
  platform: 'android' | 'ios';
  name: string;
  qaPlanId: string | null;
  tags: string[];
  stepsCount: number;
  warnings: number;
}

interface AppMapNarrativeContext {
  projectId: string;
  projectName: string;
  appMap: string | null;        // Mermaid flowchart string from ProjectConfig
  flows: AppMapFlowInfo[];      // collapsed by flowId (one entry per unique flow basename)
  testCasesTotal: number;
  testCasesByCategory: Array<{ category: string; count: number }>;
  recentRuns: Array<{ id: string; timestamp: string; testIds: string[]; passed: number; failed: number }>;
  flowToTestIds: Record<string, string[]>;   // flowId → matching test IDs (by maestroFlow path or qaPlanId)
  flowDurationMs: Record<string, number>;    // flowId → sum of durationMs from last 3 matching runs
}

function collectFlowInventory(project: ProjectConfig): AppMapFlowInfo[] {
  const out: AppMapFlowInfo[] = [];
  const seen = new Map<string, AppMapFlowInfo>();
  const dirs: Array<{ dir?: string; platform: 'android' | 'ios' }> = [
    { dir: project.maestro?.androidPath, platform: 'android' },
    { dir: project.maestro?.iosPath, platform: 'ios' },
  ];
  for (const { dir, platform } of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    const subdirs = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of subdirs) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'shared' || entry.name === 'scripts' || entry.name === 'archive' || entry.name === '_archive') continue;
      const catDir = path.join(dir, entry.name);
      const files = fs.readdirSync(catDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      for (const file of files) {
        const filePath = path.join(catDir, file);
        const flowId = file.replace(/\.ya?ml$/i, '');
        try {
          const flow = parseMaestroYaml(filePath);
          const info: AppMapFlowInfo = {
            flowId,
            fileName: file,
            filePath,
            platform,
            name: flow.name || flowId.replace(/_/g, ' '),
            qaPlanId: flow.qaPlanId,
            tags: flow.tags ?? [],
            stepsCount: flow.steps.length,
            warnings: flow.selectorWarnings.length,
          };
          if (!seen.has(flowId)) { seen.set(flowId, info); out.push(info); }
        } catch { /* skip malformed */ }
      }
    }
  }
  return out;
}

function buildAppMapNarrativeContext(projectId: string): { ok: true; ctx: AppMapNarrativeContext } | { ok: false; error: string } {
  const registry = loadProjectRegistry();
  const registryEntry = registry.projects.find(p => p.id === projectId);
  if (!registryEntry) return { ok: false, error: 'project not found: ' + projectId };
  // The Mermaid string lives in per-project config.json (not in the top-level registry).
  const fullConfig = loadProjectConfig(projectId) ?? registryEntry;
  const project: ProjectConfig = { ...registryEntry, ...fullConfig };

  const projectDir = path.join(DATA_DIR, projectId);
  const tests = loadAllTestCases(projectDir);
  const runs = loadAllRuns(projectDir);
  const flows = collectFlowInventory(project);

  // Map flowId → matching test IDs. Match strategies (in order):
  //   1. exact maestroFlow basename match
  //   2. qaPlanId match (e.g., flow says "QA Plan ID: 1.10", test category prefix matches)
  const flowToTestIds: Record<string, string[]> = {};
  for (const flow of flows) {
    const ids: string[] = [];
    const flowBase = flow.flowId.toLowerCase();
    for (const t of tests) {
      const candidates = [t.maestroFlow, (t as TestCase & { maestroFlowAndroid?: string }).maestroFlowAndroid, (t as TestCase & { maestroFlowIos?: string }).maestroFlowIos]
        .filter((p): p is string => !!p);
      for (const p of candidates) {
        const base = path.basename(p, path.extname(p)).toLowerCase();
        if (base === flowBase) { ids.push(t.id); break; }
      }
      if (flow.qaPlanId && t.id.includes(flow.qaPlanId)) {
        if (!ids.includes(t.id)) ids.push(t.id);
      }
    }
    flowToTestIds[flow.flowId] = ids;
  }

  // Compute flow duration: sum of last 3 runs' durationMs across matching test IDs.
  const flowDurationMs: Record<string, number> = {};
  for (const flowId of Object.keys(flowToTestIds)) {
    const matchIds = new Set(flowToTestIds[flowId]);
    const matchedResults: Array<{ ts: string; dur: number }> = [];
    for (const run of runs) {
      for (const r of run.results) {
        if (matchIds.has(r.test) && typeof r.durationMs === 'number') {
          matchedResults.push({ ts: run.timestamp, dur: r.durationMs });
        }
      }
    }
    matchedResults.sort((a, b) => b.ts.localeCompare(a.ts));
    flowDurationMs[flowId] = matchedResults.slice(0, 3).reduce((s, r) => s + r.dur, 0);
  }

  // Bucket test cases by category
  const catCounts = new Map<string, number>();
  for (const t of tests) catCounts.set(t.category, (catCounts.get(t.category) || 0) + 1);
  const testCasesByCategory = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // Trim runs to most recent 30
  const recentRuns = runs
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 30)
    .map(run => ({
      id: run.id,
      timestamp: run.timestamp,
      testIds: run.results.map(r => r.test),
      passed: run.summary.passed,
      failed: run.summary.failed,
    }));

  return {
    ok: true,
    ctx: {
      projectId,
      projectName: project.name,
      appMap: project.appMap ?? null,
      flows,
      testCasesTotal: tests.length,
      testCasesByCategory,
      recentRuns,
      flowToTestIds,
      flowDurationMs,
    },
  };
}

function buildAppMapPrompt(ctx: AppMapNarrativeContext, strict = false): string {
  const lines: string[] = [];
  lines.push('You are a senior QA engineer who has personally walked through this app. The Morbius dashboard is asking you to explain the team\'s current automation strategy: out of all the test cases in the catalog, why these specific Maestro flows are automated, what you learned along the way, and what the runs reveal.');
  lines.push('');
  lines.push('Output ONLY a single JSON object — no prose outside it, no code fences. Schema:');
  lines.push('{');
  lines.push('  "whyTheseFlows": "<markdown BULLETED LIST. 4-6 bullets, each 1-2 sentences. Lead each bullet with a SHORT BOLDED label (e.g. **Critical-path coverage:**) followed by the explanation. MUST cite at least one specific flow filename (e.g. `01_login.yaml`) and at least one test case category. No boilerplate.>",');
  lines.push('  "whatTheAgentLearned": "<markdown BULLETED LIST. 3-5 bullets, each 1-2 sentences. Lead with a short bolded label. MUST reference a specific flow tag, selector warning, or run outcome — something a human couldn\'t guess from outside.>",');
  lines.push('  "perFlow": [');
  lines.push('    { "flowId": "<flowId from inventory>", "whyPicked": "<1-2 sentences specific to this flow. Plain prose, no markdown bullets.>", "lastRunsSummary": "<1-2 sentences citing real runs, OR exactly the string \\"No runs yet\\" if no runs exist for this flow>" }');
  lines.push('  ]');
  lines.push('}');
  lines.push('');
  lines.push('Format rules:');
  lines.push('- whyTheseFlows + whatTheAgentLearned are bulleted lists in markdown. Use `- **Label:** ...` for each bullet.');
  lines.push('- perFlow.whyPicked + perFlow.lastRunsSummary are short plain-prose strings (NOT bulleted).');
  lines.push('- Reference flowId values exactly as they appear in the inventory below.');
  lines.push('- "perFlow" array MUST contain one entry per flow listed in the inventory. Same order is fine.');
  lines.push('- Reject generic phrases. If a flow\'s purpose is genuinely "happy path", say which screens it covers and why those screens matter for this project specifically.');
  if (strict) {
    lines.push('- STRICT MODE (retry): Your previous output was rejected as too generic. You MUST cite at least 2 specific flow filenames in whyTheseFlows and at least 1 selectorWarning OR run failure in whatTheAgentLearned. Do not use the words "ensure quality", "core functionality", "important to test".');
  }
  lines.push('');

  lines.push('## Project');
  lines.push('id: ' + ctx.projectId);
  lines.push('name: ' + ctx.projectName);
  lines.push('flows automated: ' + ctx.flows.length);
  lines.push('test cases total: ' + ctx.testCasesTotal);
  lines.push('coverage: ' + (ctx.testCasesTotal > 0 ? ((ctx.flows.length / ctx.testCasesTotal) * 100).toFixed(1) : '0.0') + '%');
  lines.push('');

  if (ctx.appMap) {
    lines.push('## AppMap (Mermaid flowchart of the app)');
    lines.push('```mermaid');
    lines.push(ctx.appMap.slice(0, 4000));
    lines.push('```');
    lines.push('');
  } else {
    lines.push('## AppMap');
    lines.push('(none configured for this project)');
    lines.push('');
  }

  lines.push('## Flow Inventory (the flows we have automated)');
  for (const f of ctx.flows) {
    const matchedTests = ctx.flowToTestIds[f.flowId] || [];
    lines.push(`- flowId=${f.flowId} platform=${f.platform} steps=${f.stepsCount} warnings=${f.warnings} qaPlanId=${f.qaPlanId ?? '-'} tags=[${f.tags.join(',')}] linkedTests=[${matchedTests.join(',') || 'none'}]`);
    lines.push(`  name: ${f.name}`);
  }
  lines.push('');

  lines.push('## Test Cases by Category (' + ctx.testCasesTotal + ' total)');
  for (const c of ctx.testCasesByCategory.slice(0, 20)) {
    lines.push(`- ${c.category}: ${c.count}`);
  }
  lines.push('');

  if (ctx.recentRuns.length > 0) {
    lines.push('## Recent Runs (last ' + ctx.recentRuns.length + ', newest first)');
    for (const r of ctx.recentRuns.slice(0, 15)) {
      lines.push(`- ${r.id} @ ${r.timestamp} — passed=${r.passed} failed=${r.failed} tests=[${r.testIds.slice(0, 8).join(',')}${r.testIds.length > 8 ? ',…' : ''}]`);
    }
    lines.push('');
  } else {
    lines.push('## Recent Runs');
    lines.push('(no runs recorded yet)');
    lines.push('');
  }

  return lines.join('\n');
}

interface RawAppMapResponse {
  whyTheseFlows?: string;
  whatTheAgentLearned?: string;
  perFlow?: Array<{ flowId?: string; whyPicked?: string; lastRunsSummary?: string }>;
}

const GENERIC_PHRASES = [
  'login is important',
  'ensure quality',
  'core functionality',
  'important to test',
  'critical to test',
];

function isGenericNarrative(why: string, learned: string, flowIds: string[]): boolean {
  const text = (why + ' ' + learned).toLowerCase();
  for (const p of GENERIC_PHRASES) if (text.includes(p)) return true;
  if (why.length < 80) return true;
  // Must reference at least one flowId in whyTheseFlows
  const cited = flowIds.some(id => why.toLowerCase().includes(id.toLowerCase()));
  if (!cited) return true;
  return false;
}

async function generateAppMapNarrative(projectId: string): Promise<{ ok: true; narrative: AppMapNarrative } | { ok: false; error: string; preservedExisting: boolean }> {
  const projectDir = path.join(DATA_DIR, projectId);
  const ctxRes = buildAppMapNarrativeContext(projectId);
  if (!ctxRes.ok) {
    const existing = readAppMapNarrative(projectDir);
    return { ok: false, error: ctxRes.error, preservedExisting: !!existing };
  }
  const ctx = ctxRes.ctx;

  // Empty-state guard: project with no flows skips Claude entirely.
  if (ctx.flows.length === 0) {
    return { ok: false, error: 'No flows yet — nothing to narrate. Add Maestro YAMLs to the project first.', preservedExisting: !!readAppMapNarrative(projectDir) };
  }

  // First attempt
  let prompt = buildAppMapPrompt(ctx, false);
  let res = await askClaude(prompt, { timeoutMs: 180_000, kind: 'appmap-narrative', projectId });
  if (!res.ok) {
    const existing = readAppMapNarrative(projectDir);
    return { ok: false, error: res.error, preservedExisting: !!existing };
  }
  let parsed = extractJson<RawAppMapResponse>(res.text);
  if (!parsed.ok) {
    const existing = readAppMapNarrative(projectDir);
    return { ok: false, error: 'Could not parse Claude response: ' + parsed.error, preservedExisting: !!existing };
  }

  let qualityFlag: 'generic' | undefined;
  let why = (parsed.data.whyTheseFlows || '').trim();
  let learned = (parsed.data.whatTheAgentLearned || '').trim();
  const flowIds = ctx.flows.map(f => f.flowId);
  let durationMs = res.durationMs;

  // Lint + retry once if generic
  if (isGenericNarrative(why, learned, flowIds)) {
    const strictPrompt = buildAppMapPrompt(ctx, true);
    const retry = await askClaude(strictPrompt, { timeoutMs: 180_000, kind: 'appmap-narrative', projectId });
    durationMs += retry.durationMs;
    if (retry.ok) {
      const retryParsed = extractJson<RawAppMapResponse>(retry.text);
      if (retryParsed.ok) {
        const retryWhy = (retryParsed.data.whyTheseFlows || '').trim();
        const retryLearned = (retryParsed.data.whatTheAgentLearned || '').trim();
        if (!isGenericNarrative(retryWhy, retryLearned, flowIds)) {
          why = retryWhy;
          learned = retryLearned;
          parsed = retryParsed;
        } else {
          qualityFlag = 'generic';
        }
      } else {
        qualityFlag = 'generic';
      }
    } else {
      qualityFlag = 'generic';
    }
  }

  // Build perFlow array — one entry per inventory flow. If Claude omitted or
  // misnamed a flow, fill with an empty placeholder so the array is dense.
  const perFlowInput = parsed.data.perFlow ?? [];
  const perFlowMap = new Map<string, { whyPicked: string; lastRunsSummary: string }>();
  for (const p of perFlowInput) {
    if (!p?.flowId) continue;
    perFlowMap.set(String(p.flowId), {
      whyPicked: String(p.whyPicked ?? '').trim(),
      lastRunsSummary: String(p.lastRunsSummary ?? '').trim() || 'No runs yet',
    });
  }

  // Proportional slice of generation time per flow (equal split).
  const sliceMs = ctx.flows.length > 0 ? Math.round(durationMs / ctx.flows.length) : 0;

  const perFlow: AppMapPerFlow[] = ctx.flows.map(f => {
    const claudeBit = perFlowMap.get(f.flowId) ?? { whyPicked: '', lastRunsSummary: '' };
    const runDur = ctx.flowDurationMs[f.flowId] || 0;
    const summary = ctx.flowToTestIds[f.flowId]?.length && runDur > 0
      ? (claudeBit.lastRunsSummary || 'See run history')
      : 'No runs yet';
    return {
      flowId: f.flowId,
      whyPicked: claudeBit.whyPicked || ('Automated — see ' + f.fileName),
      lastRunsSummary: summary,
      agentTimeMs: runDur + sliceMs,
    };
  });

  const flowsCovered = ctx.flows.length;
  const testCasesTotal = ctx.testCasesTotal;
  const coveragePct = testCasesTotal > 0 ? Math.round((flowsCovered / testCasesTotal) * 1000) / 10 : 0;
  const runMs = perFlow.reduce((s, p) => s + Math.max(0, p.agentTimeMs - sliceMs), 0);
  // E-027 S-027-005: cumulative generation time from agent-activity log (this kind only).
  // The just-completed call is already appended by askClaude's settle hook.
  const activity = readAgentActivity(projectDir, 'appmap-narrative');
  const cumulativeGenerationMs = activity.reduce((s, e) => s + (e.durationMs || 0), 0) || durationMs;

  const narrative: AppMapNarrative = {
    projectId,
    generatedAt: new Date().toISOString(),
    generatedBy: 'claude',
    modelDurationMs: durationMs,
    flowsCovered,
    testCasesTotal,
    coveragePct,
    qualityFlag,
    whyTheseFlows: why || '_(empty)_',
    whatTheAgentLearned: learned || '_(empty)_',
    timeOnTask: {
      generationMs: cumulativeGenerationMs,
      runMs,
      totalMs: cumulativeGenerationMs + runMs,
    },
    perFlow,
  };

  writeAppMapNarrative(narrative, projectDir);
  return { ok: true, narrative };
}

// ─────────────────────────────────────────────────────────────────────────────
// E-017 Self-Healing Selectors
// ─────────────────────────────────────────────────────────────────────────────

// S-017-001: classify a Maestro failure. Returns null if not a selector miss.
// Selector misses are the high-leverage target — assertion/network/crash failures
// have different remediation paths and should NOT enter the healing pipeline.
interface SelectorMiss {
  failedSelector: string;
  failureLine?: number;
}
function classifySelectorMiss(output: string, failingStep: string | null, errorLine: string | null): SelectorMiss | null {
  if (!output) return null;
  const blob = (errorLine || '') + '\n' + output;
  // Maestro selector-miss signatures:
  //   "No visible element found"  ← canonical
  //   "Element not found"
  //   "Timeout waiting for element"
  const isSelector = /No visible element found|Element not found|Timeout waiting for element/i.test(blob);
  if (!isSelector) return null;
  // Don't treat assertion failures as selector misses — assertVisible is its own AC.
  if (/AssertionError/i.test(blob) && !/No visible element/i.test(blob)) return null;
  // Try to extract the selector from the error line. Maestro typically prints e.g.:
  //   "tapOn: Welcome" or "assertVisible: Welcome to ConnectRV"
  // First check the structured failingStep, then fall back to regexes.
  let selector = '';
  if (failingStep) {
    const m = failingStep.match(/^\s*(?:tapOn|assertVisible|inputText|scrollUntilVisible|longPressOn|swipe)\s*[:{]?\s*(?:text\s*[:=]\s*)?["']?([^"'{}\n]+?)["']?\s*[}]?$/);
    if (m && m[1]) selector = m[1].trim();
  }
  if (!selector) {
    // Try a looser match against the full blob
    const m = blob.match(/(?:visible element|matching).{0,40}["']?([^"'\n]{2,80})["']?/);
    if (m && m[1]) selector = m[1].trim().replace(/[\s.;,]+$/, '');
  }
  if (!selector) selector = '(unknown)';
  return { failedSelector: selector };
}

// S-017-002: capture the device's view hierarchy via the Maestro CLI.
// Falls back gracefully if the command is unavailable or no device is connected.
async function captureViewHierarchy(): Promise<{ ok: true; xml: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const settle = (r: { ok: true; xml: string } | { ok: false; error: string }) => { if (!settled) { settled = true; resolve(r); } };
    let child: ChildProcess;
    try {
      child = spawn('maestro', ['hierarchy'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      return settle({ ok: false, error: 'spawn maestro hierarchy failed: ' + (err instanceof Error ? err.message : String(err)) });
    }
    const to = setTimeout(() => { child.kill('SIGTERM'); settle({ ok: false, error: 'maestro hierarchy timeout (15s)' }); }, 15_000);
    child.stdout?.on('data', (b: Buffer) => { stdout += b.toString(); });
    child.stderr?.on('data', (b: Buffer) => { stderr += b.toString(); });
    child.on('close', (code) => {
      clearTimeout(to);
      if (code === 0 && stdout.trim()) settle({ ok: true, xml: stdout });
      else settle({ ok: false, error: 'maestro hierarchy exited ' + code + (stderr ? ' — ' + stderr.slice(0, 300) : '') });
    });
    child.on('error', (err) => { clearTimeout(to); settle({ ok: false, error: err.message }); });
  });
}

// Truncate hierarchy snapshot around the failed selector (S-017-002 AC3 — large snapshots).
function truncateHierarchy(xml: string, failedSelector: string, maxBytes = 80_000): string {
  if (xml.length <= maxBytes) return xml;
  // Find the first occurrence of the failed selector text and slice a window around it.
  const idx = xml.toLowerCase().indexOf(failedSelector.toLowerCase());
  if (idx < 0) return xml.slice(0, maxBytes) + '\n\n<!-- TRUNCATED — selector text not found in snapshot -->';
  const half = Math.floor(maxBytes / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(xml.length, idx + half);
  return (start > 0 ? '<!-- TRUNCATED HEAD -->\n' : '') + xml.slice(start, end) + (end < xml.length ? '\n<!-- TRUNCATED TAIL -->' : '');
}

function healingShortId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

// S-017-001 hook: enqueue a healing request when a run fails on a selector miss.
// Fire-and-forget — runs the snapshot + Claude proposal + validate pipeline in the background.
function enqueueHealingFromFailure(opts: {
  runId: string; testId: string; flowPath: string; platform: string;
  output: string; failingStep: string | null; errorLine: string | null;
  projectDir: string;
}): void {
  const miss = classifySelectorMiss(opts.output, opts.failingStep, opts.errorLine);
  if (!miss) {
    console.log('[healing] run ' + opts.runId + ' failure was not a selector miss — skipping');
    return;
  }
  const id = healingShortId();
  const now = new Date().toISOString();
  const proposal: HealingProposal = {
    id, runId: opts.runId, testId: opts.testId, flowPath: opts.flowPath,
    platform: opts.platform, failedSelector: miss.failedSelector, failureLine: miss.failureLine,
    errorLine: opts.errorLine || undefined,
    state: 'requested', createdAt: now, updatedAt: now,
  };
  writeHealingProposal(proposal, opts.projectDir);
  console.log('[healing] enqueued ' + id + ' for ' + opts.testId + ' selector="' + miss.failedSelector + '"');
  // Fire the pipeline
  void (async () => {
    try { await runHealingPipeline(id, opts.projectDir); }
    catch (err) { console.error('[healing] pipeline crashed for ' + id + ':', err); }
  })();
}

// S-017-002 + S-017-003 + S-017-004: the full healing pipeline for one proposal.
async function runHealingPipeline(id: string, projectDir: string): Promise<void> {
  const update = (patch: Partial<HealingProposal>) => {
    const cur = readHealingProposal(id, projectDir);
    if (!cur) return null;
    const next = { ...cur, ...patch, updatedAt: new Date().toISOString() } as HealingProposal;
    writeHealingProposal(next, projectDir);
    return next;
  };

  // === Snapshot ===
  let p = update({ state: 'snapshotting' });
  if (!p) return;
  const snap = await captureViewHierarchy();
  if (!snap.ok) {
    update({ state: 'error', errorReason: 'snapshot: ' + snap.error });
    console.error('[healing] ' + id + ' snapshot failed: ' + snap.error);
    return;
  }
  const truncated = truncateHierarchy(snap.xml, p.failedSelector);
  const snapPath = path.join(projectDir, 'healing', 'proposal-' + id + '.hierarchy.txt');
  fs.writeFileSync(snapPath, truncated);
  p = update({ hierarchySnapshotPath: snapPath });
  if (!p) return;

  // === Claude proposal ===
  const prompt = buildHealingPrompt(p, truncated);
  const ai = await askClaude(prompt, { timeoutMs: 120_000 });
  if (!ai.ok) {
    update({ state: 'error', errorReason: 'claude: ' + ai.error });
    return;
  }
  const json = extractJson<{ proposedSelector?: unknown; rationale?: unknown; confidence?: unknown }>(ai.text);
  if (!json.ok) {
    update({ state: 'error', errorReason: 'parse: ' + json.error, rawClaudeResponse: ai.text });
    return;
  }
  const data = json.data;
  const proposedSelector = typeof data.proposedSelector === 'string' ? data.proposedSelector.trim() : '';
  const confidence = Number.isFinite(Number(data.confidence)) ? Math.max(0, Math.min(1, Number(data.confidence))) : 0;
  const rationale = typeof data.rationale === 'string' ? data.rationale.trim() : '';
  if (!proposedSelector) {
    update({ state: 'error', errorReason: 'no proposedSelector in response', rawClaudeResponse: ai.text });
    return;
  }
  p = update({ state: 'proposed', proposedSelector, confidence, rationale });
  if (!p) return;
  // S-017-003 AC2: low-confidence stays in queue but flagged. We surface it as 'validated' = false
  // only after the validation step; until then it carries `confidence < 0.5` in the record.

  // === Validate via re-run ===
  p = update({ state: 'validating' });
  if (!p) return;
  const valid = await validateHealingProposal(p, projectDir);
  if (valid.error) {
    update({ state: 'error', errorReason: 'validate: ' + valid.error });
    return;
  }
  update({
    state: valid.passed ? 'validated' : 'invalidated',
    validationRunId: valid.runId,
  });
}

function buildHealingPrompt(p: HealingProposal, hierarchy: string): string {
  const lines: string[] = [];
  lines.push('You are a Maestro selector self-healer. A test flow failed because a UI selector no longer matches an element on the screen. Your job is to propose a new selector that DOES match an element in the captured view hierarchy.');
  lines.push('');
  lines.push('Output ONLY a single JSON object — no prose, no fences. Schema:');
  lines.push('{');
  lines.push('  "proposedSelector": "<exact text or attribute that Maestro can match — e.g. \\"Sign in\\" or \\"id:loginBtn\\">",');
  lines.push('  "confidence": <0.0..1.0 — how sure you are this is the same UI element with renamed text/attrs>,');
  lines.push('  "rationale": "<one sentence: why this is the right replacement>"');
  lines.push('}');
  lines.push('');
  lines.push('Rules:');
  lines.push('- The proposed selector MUST appear in the hierarchy below (text, content-desc, resource-id, or accessibility label).');
  lines.push('- Prefer the same matching strategy the original selector used (text → text, id → id).');
  lines.push('- If you are not confident the new selector is the same UI element, set confidence < 0.5 and explain in rationale.');
  lines.push('- If no plausible match exists, set proposedSelector to "" and confidence to 0.');
  lines.push('');
  lines.push('## Failed selector');
  lines.push('value: ' + p.failedSelector);
  if (p.errorLine) lines.push('errorLine: ' + p.errorLine);
  lines.push('');
  lines.push('## Captured view hierarchy (truncated around failure)');
  lines.push('```');
  lines.push(hierarchy.slice(0, 60_000));
  lines.push('```');
  lines.push('');
  lines.push('Respond with the JSON object only.');
  return lines.join('\n');
}

// S-017-004 — validate by re-running the flow with the proposed selector substituted.
// Implementation: write a temp copy of the YAML with single-occurrence replacement,
// invoke `maestro test` synchronously, return pass/fail.
async function validateHealingProposal(p: HealingProposal, projectDir: string): Promise<{ passed: boolean; runId?: string; error?: string }> {
  const sel = (p.modifiedSelector || p.proposedSelector || '').trim();
  if (!sel) return { passed: false, error: 'no selector to validate' };
  if (!p.flowPath || !fs.existsSync(p.flowPath)) return { passed: false, error: 'flow path missing: ' + p.flowPath };

  let yaml: string;
  try { yaml = fs.readFileSync(p.flowPath, 'utf-8'); }
  catch (err) { return { passed: false, error: 'read flow failed: ' + (err instanceof Error ? err.message : String(err)) }; }

  const patched = replaceSelectorInText(yaml, p.failedSelector, sel);
  if (!patched.replaced) return { passed: false, error: 'failed selector "' + p.failedSelector + '" not found in flow YAML' };

  const tmpPath = path.join(os.tmpdir(), 'morbius-heal-' + p.id + '-' + Date.now() + '.yaml');
  fs.writeFileSync(tmpPath, patched.text);

  const validationRunId = 'heal-' + p.id + '-' + Date.now();
  const config = loadProjectConfig(projectDir);
  const env = { ...process.env, ...(config?.env ?? {}) };
  return new Promise((resolve) => {
    let output = '';
    let settled = false;
    const settle = (r: { passed: boolean; runId?: string; error?: string }) => {
      if (!settled) { settled = true; try { fs.unlinkSync(tmpPath); } catch { /* ignore */ } resolve(r); }
    };
    let child: ChildProcess;
    try { child = spawn('maestro', ['test', tmpPath], { env, cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (err) { return settle({ passed: false, error: 'spawn failed: ' + (err instanceof Error ? err.message : String(err)) }); }
    const to = setTimeout(() => { child.kill('SIGTERM'); settle({ passed: false, runId: validationRunId, error: 'validation run timeout (5min)' }); }, 5 * 60 * 1000);
    child.stdout?.on('data', (b: Buffer) => { output += b.toString(); });
    child.stderr?.on('data', (b: Buffer) => { output += b.toString(); });
    child.on('close', (code) => {
      clearTimeout(to);
      // Persist the validation log for the operator
      try {
        const runsDir = path.join(projectDir, 'runs');
        fs.mkdirSync(runsDir, { recursive: true });
        fs.writeFileSync(path.join(runsDir, validationRunId + '.log'), output);
      } catch { /* ignore */ }
      settle({ passed: code === 0, runId: validationRunId });
    });
    child.on('error', (err) => { clearTimeout(to); settle({ passed: false, runId: validationRunId, error: err.message }); });
  });
}

// S-017-006: pure-text + file-IO selector replacement now lives in src/parsers/maestro-yaml.ts
// (`replaceSelectorInText` and `replaceSelector(flowPath, oldSel, newSel)`). Imported above as
// `replaceSelectorInText` and `replaceSelectorInFlow` (the file wrapper, atomic via tmpfile+rename).
async function syncBugFromJira(bugId: string, dir: string): Promise<JiraResult<{
  jiraStatus: string; jiraAssignee: string; jiraPriority: string;
  jiraLastComment: string; newStatus: string;
}>> {
  const bugs = loadAllBugs(dir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug) return { ok: false, code: 'NOT_FOUND', message: `Bug ${bugId} not found locally` };
  if (!bug.jiraKey) return { ok: false, code: 'CONFIG', message: `Bug ${bugId} has no jiraKey` };

  const cfg = getJiraCfg();
  if (!cfg.ok) return { ok: false, code: 'CONFIG', message: cfg.message };

  const url = `${jiraApiBase(cfg)}/rest/api/3/issue/${encodeURIComponent(bug.jiraKey)}?fields=summary,status,assignee,priority,comment,labels,description`;
  const r = await jiraCall<{ fields: Record<string, unknown> }>({
    url, method: 'GET', email: cfg.email, token: cfg.token, bugId,
  });
  if (!r.ok) return r;

  const fields = (r.data.fields ?? {}) as Record<string, unknown>;
  const status = fields.status as { name?: string } | undefined;
  const assignee = fields.assignee as { displayName?: string } | undefined;
  const priority = fields.priority as { name?: string } | undefined;
  const commentField = fields.comment as { comments?: Array<{ body?: { content?: Array<{ content?: Array<{ text?: string }> }> } }> } | undefined;

  const jiraStatus = status?.name ?? '';
  const jiraAssignee = assignee?.displayName ?? '';
  const jiraPriority = priority?.name ?? '';
  const comments = commentField?.comments ?? [];
  const last = comments[comments.length - 1];
  const jiraLastComment = last?.body?.content?.[0]?.content?.[0]?.text ?? '';
  const jiraLastSynced = new Date().toISOString();

  let newStatus = bug.status;
  if (['Done', 'Resolved', 'Closed'].includes(jiraStatus)) newStatus = 'fixed';
  else if (jiraStatus === 'In Progress') newStatus = 'investigating';

  const priorJiraStatus = bug.jiraStatus;
  const statusChanged = jiraStatus && jiraStatus !== priorJiraStatus;

  updateBugById(bugId, {
    status: newStatus,
    jiraStatus, jiraAssignee, jiraPriority, jiraLastComment, jiraLastSynced,
    assignee: jiraAssignee || bug.assignee,
  } as Partial<Bug>, dir);

  // S-016-003 polling fallback: if the Jira status changed (compared to last-seen state),
  // trigger an impact regen. The 60s dedupe in triggerImpactRegen prevents storms when both
  // webhook and polling fire for the same change.
  if (statusChanged) {
    triggerImpactRegen(bugId, dir, 'jira-poll-status-change: ' + priorJiraStatus + ' → ' + jiraStatus);
  }

  noteJiraSuccess(dir);
  return { ok: true, status: 200, data: { jiraStatus, jiraAssignee, jiraPriority, jiraLastComment, newStatus } };
}

// ─────────────────────────────────────────────────────────────────────────────
// E-023 / S-023-003: PMAgent transfer pipeline
// Parses a PMAgent project (read-only via parsePMAgentProject), diffs against the
// recorded sync state, history-preserves existing on-disk Morbius test cases, writes
// only changed test cases via writeTestCase + writeCategory.
// State file: data/{projectId}/pmagent-sync-state.json
// ─────────────────────────────────────────────────────────────────────────────

interface PMAgentSyncState {
  pmagentSlug: string;
  pmagentPath: string;
  lastSyncAt: string;
  importedTestIds: string[];
  checksums: Record<string, string>;   // <storyId>:<acIndex> → checksum
  // sourceMap is regenerated on each sync; not persisted to disk in v1 (we recompute it
  // by re-parsing PMAgent on every transfer). Future optimization if parsing is slow.
}

function pmagentSyncStatePath(projectDir: string): string {
  return path.join(projectDir, 'pmagent-sync-state.json');
}

function loadPMAgentSyncState(projectDir: string): PMAgentSyncState | null {
  try {
    const p = pmagentSyncStatePath(projectDir);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as PMAgentSyncState;
  } catch (err) { console.error('[pmagent-sync] failed to read state:', err); return null; }
}

function savePMAgentSyncState(projectDir: string, state: PMAgentSyncState): void {
  try { fs.writeFileSync(pmagentSyncStatePath(projectDir), JSON.stringify(state, null, 2)); }
  catch (err) { console.error('[pmagent-sync] failed to save state:', err); }
}

function resolvePMAgentPath(slug: string | undefined, override: string | undefined): string | null {
  if (override && override.trim()) return override.trim();
  if (slug && slug.trim()) {
    const home = process.env.PMAGENT_HOME || '/Users/sdas/PMAgent';
    return path.join(home, 'projects', slug.trim());
  }
  return null;
}

// ── E-029: QA Plan import — bring PMAgent's QA / Flow / Release plan docs into Morbius ──
// PMAgent's QA tab shows an orientation layer ABOVE the story test cases: the QA Plan operating
// doc (qa-testplan.md), Flow Plans (TF-NNN), and Release Plans (TR-NNN). The test-case importer
// only walked epics/, so these never came over — leaving the QA team with cards but no roadmap.
// We copy them verbatim into <projectDir>/plans/ (same format) + write an index for the view.
interface PlanItem {
  type: 'qa' | 'flow' | 'release' | 'release-def' | 'userflow';
  id: string;                         // 'qa-plan' | 'TF-001' | 'TR-001' | 'R-001' | 'UF-001'
  title: string;
  fields: Record<string, string>;     // parsed **Key:** header block
  file: string;
  storyIds: string[];                 // S-NNN-NNN stories this plan covers (for execution overlay)
  ufId?: string;                      // flow plan → its User Flow (TF Flow: field)
  flowId?: string;                    // matched Morbius Maestro flow (shared stories) for focused jump
  flowGraph?: string;                 // mermaid screen-flow graph (User Flows) for inline render
}
interface PlansIndex {
  generatedAt: string;
  items: PlanItem[];
  releases: Array<{ id: string; title: string; trId: string | null }>;   // release roadmap (present/missing TR)
}

function parsePlanDoc(raw: string): { title: string; fields: Record<string, string> } {
  const lines = raw.split('\n');
  const h1 = lines.find(l => /^#\s+/.test(l)) || '';
  const title = h1.replace(/^#\s+/, '')
    .replace(/^(?:Flow|Release|Story|Project)?\s*Test Plan:\s*/i, '')
    .replace(/^(?:Release|User Flow):\s*/i, '')
    .trim();
  const fields: Record<string, string> = {};
  for (const l of lines) {
    if (/^##\s/.test(l)) break;       // header block ends at the first section
    const m = l.match(/^\*\*([^*]+?):\*\*\s*(.+)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  return { title, fields };
}

function planMetaFromFile(file: string): { type: PlanItem['type']; id: string } | null {
  if (/^qa-testplan\.md$/i.test(file)) return { type: 'qa', id: 'qa-plan' };
  let m = file.match(/^(TF-\d{3})/i); if (m) return { type: 'flow', id: m[1].toUpperCase() };
  m = file.match(/^(TR-\d{3})/i); if (m) return { type: 'release', id: m[1].toUpperCase() };
  m = file.match(/^(UF-\d{3})/i); if (m) return { type: 'userflow', id: m[1].toUpperCase() };
  m = file.match(/^(R-\d{3})/i); if (m) return { type: 'release-def', id: m[1].toUpperCase() };
  return null;
}

function importPMAgentPlans(pmagentPath: string, projectDir: string): number {
  const realRoot = fs.existsSync(pmagentPath) ? fs.realpathSync(pmagentPath) : pmagentPath;
  const plansDir = path.join(projectDir, 'plans');
  const items: PlanItem[] = [];
  let copied = 0;
  for (const sub of ['qa', 'releases', 'flows']) {
    const srcDir = path.join(realRoot, sub);
    if (!fs.existsSync(srcDir)) continue;
    for (const file of fs.readdirSync(srcDir)) {
      if (!file.endsWith('.md')) continue;
      const meta = planMetaFromFile(file);
      if (!meta) continue;
      let raw: string;
      try { raw = fs.readFileSync(path.join(srcDir, file), 'utf-8'); } catch { continue; }
      fs.mkdirSync(plansDir, { recursive: true });
      try { fs.writeFileSync(path.join(plansDir, file), raw); copied++; } catch { continue; }
      const { title, fields } = parsePlanDoc(raw);
      const storyIds = Array.from(new Set((raw.match(/\bS-\d{3}-\d{3}\b/g) || []).map(s => s.toUpperCase())));
      const ufMatch = (fields.Flow || '').match(/UF-\d{3}/i);   // a Flow Plan's linked User Flow
      const mmd = raw.match(/```mermaid\s*([\s\S]*?)```/);        // screen-flow graph (User Flows)
      items.push({ type: meta.type, id: meta.id, title: title || meta.id, fields, file, storyIds, ufId: ufMatch ? ufMatch[0].toUpperCase() : undefined, flowGraph: mmd ? mmd[1].trim() : undefined });
    }
  }
  if (!items.length) return 0;

  // Match each plan to a written Morbius Maestro flow (by shared stories) so the hub's
  // "Automation → Maestro" jump can land on the exact flow. Stories derived from flow testIds.
  try {
    const plan = loadAutomationPlan(path.basename(projectDir));
    const written = ((plan && plan.flows) || []).filter(fl => fl.status === 'written' || fl.status === 'passing');
    const flowStories = (fl: { testIds?: string[] }) => new Set((fl.testIds || []).map(t => {
      const m = t.match(/-(\d{3})-(\d{3})-/); return m ? 'S-' + m[1] + '-' + m[2] : '';
    }).filter(Boolean));
    const stories = written.map(fl => ({ id: fl.id, st: flowStories(fl) }));
    for (const it of items) {
      const hit = stories.find(s => (it.storyIds || []).some(sid => s.st.has(sid)));
      if (hit) it.flowId = hit.id;
    }
  } catch { /* no flow match */ }
  // Release roadmap: every R-NNN definition, and whether a matching TR-NNN plan exists yet.
  const releases = items.filter(i => i.type === 'release-def').map(r => {
    const num = r.id.replace(/^R-/, '');
    const tr = items.find(i => i.type === 'release' && i.id === 'TR-' + num);
    return { id: r.id, title: r.title, trId: tr ? tr.id : null };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const index: PlansIndex = { generatedAt: new Date().toISOString(), items, releases };
  try { fs.writeFileSync(path.join(plansDir, 'plans.json'), JSON.stringify(index, null, 2)); } catch { /* skip */ }
  return copied;
}

// Split a plan-doc body into ordered H2/H3 sections so the QA Plan detail can render the
// decision-critical content (Scope, Journeys, Execution order, ITCs, Screens…) as scannable
// cards instead of one 20k-char wall. Each section = text from its heading to the next H2/H3.
function extractPlanSections(body: string): Array<{ level: number; heading: string; content: string }> {
  const heads: Array<{ level: number; heading: string; start: number; end: number }> = [];
  const re = /^(#{2,3})[ \t]+(.+?)[ \t]*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    heads.push({ level: m[1].length, heading: m[2].trim(), start: m.index, end: m.index + m[0].length });
  }
  const out: Array<{ level: number; heading: string; content: string }> = [];
  for (let i = 0; i < heads.length; i++) {
    const contentEnd = i + 1 < heads.length ? heads[i + 1].start : body.length;
    const content = body.slice(heads[i].end, contentEnd).trim();
    if (content || heads[i].level === 2) out.push({ level: heads[i].level, heading: heads[i].heading, content });
  }
  return out;
}

function loadPlansIndex(projectDir: string): PlansIndex | null {
  try {
    const p = path.join(projectDir, 'plans', 'plans.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as PlansIndex;
  } catch { return null; }
}

interface TransferResult {
  ok: true;
  morbiusProjectId: string;
  categoriesCreated: number;
  testCasesCreated: number;
  testCasesUpdated: number;
  testCasesUntouched: number;
  testCasesSkippedLocked: number;
  durationMs: number;
}

interface TransferError { ok: false; error: string; durationMs: number; }

async function runPMAgentTransfer(opts: {
  pmagentSlug: string;
  pmagentPathOverride?: string;
  morbiusProjectId?: string;
  createIfMissing?: boolean;
  force?: boolean;
}): Promise<TransferResult | TransferError> {
  const t0 = Date.now();
  const slug = opts.pmagentSlug.trim();
  if (!slug) return { ok: false, error: 'pmagentSlug required', durationMs: 0 };

  const resolvedPath = resolvePMAgentPath(slug, opts.pmagentPathOverride);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return { ok: false, error: 'PMAgent path not found: ' + (resolvedPath || '?'), durationMs: Date.now() - t0 };
  }

  // Parse PMAgent project (read-only)
  const parseRes = parsePMAgentProject(resolvedPath, slug);
  const parsed = parseRes.parsed;

  // Resolve target Morbius project
  const registry = loadProjectRegistry();
  let projectId = opts.morbiusProjectId?.trim() || '';
  if (!projectId) {
    // Derive from PMAgent's brief.md H1 if present, fallback to slug
    let derivedName = slug;
    const briefPath = path.join(resolvedPath, 'brief.md');
    if (fs.existsSync(briefPath)) {
      try {
        const briefHead = fs.readFileSync(briefPath, 'utf-8').split('\n').find(l => /^#\s+/.test(l)) || '';
        const m = briefHead.match(/^#\s+(?:Product Brief:\s*)?(.+)$/);
        if (m) derivedName = m[1].trim();
      } catch { /* fallback to slug */ }
    }
    projectId = slugify(derivedName) || slug;
  }

  // E-024 / S-024-001 AC3: derive projectType from PMAgent's brief.md if a "Project Type:" line is present.
  let derivedType: 'mobile' | 'web' | 'api' | undefined;
  let derivedWebUrl: string | undefined;
  try {
    const briefPath = path.join(resolvedPath, 'brief.md');
    if (fs.existsSync(briefPath)) {
      const brief = fs.readFileSync(briefPath, 'utf-8');
      const m = brief.match(/^\*\*Project Type:\*\*\s*(mobile|web|api)\b/im) || brief.match(/^Project Type:\s*(mobile|web|api)\b/im);
      if (m) derivedType = m[1].toLowerCase() as 'mobile' | 'web' | 'api';
      const u = brief.match(/^\*\*(?:Web ?URL|Base ?URL|App ?URL):\*\*\s*(\S+)/im) || brief.match(/^(?:Web ?URL|Base ?URL|App ?URL):\s*(\S+)/im);
      if (u) derivedWebUrl = u[1].trim();
    }
  } catch { /* fallback to defaults */ }

  let projectConfig = registry.projects.find(p => p.id === projectId);
  if (!projectConfig) {
    if (opts.createIfMissing === false) {
      return { ok: false, error: 'Morbius project not found: ' + projectId + ' (createIfMissing=false)', durationMs: Date.now() - t0 };
    }
    projectConfig = {
      id: projectId,
      name: projectId === slug ? slug : projectId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      created: new Date().toISOString().split('T')[0],
      devices: [
        { id: 'ipad', name: 'iPad', platform: 'ios' },
        { id: 'iphone', name: 'iPhone', platform: 'ios' },
        { id: 'android-tab', name: 'Android Tablet', platform: 'android' },
        { id: 'android-phone', name: 'Android Phone', platform: 'android' },
      ],
      pmagentSlug: slug,
      projectType: derivedType ?? 'mobile',
    };
    if (derivedWebUrl) projectConfig.webUrl = derivedWebUrl;
    registry.projects.push(projectConfig);
    registry.activeProject = projectId;
    saveProjectRegistry(registry);
  } else if (!projectConfig.pmagentSlug) {
    // Stamp the slug if the project exists but isn't yet linked
    projectConfig.pmagentSlug = slug;
    if (derivedType && !projectConfig.projectType) projectConfig.projectType = derivedType;
    if (derivedWebUrl && !projectConfig.webUrl) projectConfig.webUrl = derivedWebUrl;
    saveProjectRegistry(registry);
  }

  const projectDir = path.join(getDataRoot(), projectId);
  fs.mkdirSync(projectDir, { recursive: true });

  // E-029: also bring over the QA / Flow / Release plan docs (the orientation layer above
  // the story test cases) — copied verbatim into <projectDir>/plans/ for the QA Plan view.
  try { importPMAgentPlans(resolvedPath, projectDir); } catch (err) { console.warn('[pmagent] plan import skipped:', err); }

  // Onboarding: ensure a config.json stub exists so the project is fully onboarded
  // (appId / maestro paths / personas to be filled in). Without this, pmagent-synced
  // projects had test cases but no config — they couldn't run flows or pass `morbius doctor`.
  if (!loadProjectConfig(projectId)) {
    saveProjectConfig({
      id: projectId,
      name: projectConfig.name,
      created: projectConfig.created,
      devices: projectConfig.devices,
      pmagentSlug: slug,
      projectType: projectConfig.projectType ?? 'mobile',
      appId: '',
      maestro: { androidPath: '', iosPath: '' },
      env: {},
      testAccounts: [],
      ...(projectConfig.webUrl ? { webUrl: projectConfig.webUrl } : {}),
    });
  }

  // Diff against prior sync state
  const priorState = loadPMAgentSyncState(projectDir);
  const priorChecksums = priorState?.checksums ?? {};

  // Index existing test cases on disk so we can preserve history[] + changelog[]
  const existingTests = loadAllTestCases(projectDir);
  const existingById = new Map(existingTests.map(t => [t.id, t]));

  // Migration note: the old ID scheme leaked a hyphen ("TC-CH--001-..."). With the
  // fix, re-synced IDs change (e.g. TC-CH--001 → TC-CHM-001), orphaning the old files.
  if (existingTests.some(t => t.id.includes('--'))) {
    console.warn('[pmagent] NOTE: existing IDs contain "--" (legacy slug bug). Re-sync will re-key them; delete orphaned old-ID .md files under ' + projectDir + '/tests after this run.');
  }

  let categoriesCreated = 0;
  let created = 0, updated = 0, untouched = 0, skippedLocked = 0;
  const importedIds: string[] = [];

  for (const cat of parsed.categories) {
    // Always (re)write category sidecar — cheap + idempotent
    const categoryDir = path.join(projectDir, 'tests', cat.id);
    fs.mkdirSync(categoryDir, { recursive: true });
    // writeCategory exists in markdown.ts but isn't exported in this version of the bundle; call writeCategoryFile directly via the existing path used by writeParsedExcel
    // → reuse via writeParsedExcel-style block: we can just write the YAML inline
    const catYamlPath = path.join(categoryDir, '_category.yaml');
    const catYaml = 'id: ' + cat.id + '\nname: ' + JSON.stringify(cat.name) + '\nsheet: ' + JSON.stringify(cat.sheet) + '\norder: ' + cat.order + '\n';
    if (!fs.existsSync(catYamlPath) || fs.readFileSync(catYamlPath, 'utf-8') !== catYaml) {
      fs.writeFileSync(catYamlPath, catYaml);
      if (!fs.existsSync(catYamlPath)) categoriesCreated++; // best-effort signal
    }
    if (!existingTests.some(t => t.category === cat.id)) categoriesCreated++;

    for (const tc of cat.testCases) {
      importedIds.push(tc.id);
      const ck = tc.pmagentSource!.storyId + ':' + tc.pmagentSource!.acIndex;
      const newChecksum = tc.pmagentSource!.sourceChecksum;
      const priorChecksum = priorChecksums[ck];
      const existing = existingById.get(tc.id);

      // History preservation: graft existing on-disk runtime state into the new card
      if (existing) {
        if (existing.pmagentLocked) { skippedLocked++; untouched++; continue; }
        tc.history = existing.history ?? [];
        tc.deviceResults = existing.deviceResults ?? [];
        tc.status = existing.status ?? tc.status;          // user-edited status survives
        tc.maestroFlow = existing.maestroFlow;
        tc.maestroFlowAndroid = existing.maestroFlowAndroid;
        tc.maestroFlowIos = existing.maestroFlowIos;
        tc.changelog = existing.changelog;
        tc.created = existing.created || tc.created;
        // notes → keep local; user-curated
        tc.notes = existing.notes ?? tc.notes;
      }

      if (!existing) {
        writeTestCaseToDisk(tc, categoryDir);
        created++;
      } else if (priorChecksum === newChecksum && !opts.force) {
        // Source unchanged AND test case not locked → no-op
        untouched++;
      } else {
        // Source changed (or force): overwrite body, history already grafted above
        const writtenPath = writeTestCaseToDisk(tc, categoryDir);
        // Cleanup: writeTestCase derives filenames from `id-titleSlug.md`. When the title
        // changes (e.g. parser quality fix), the new file has a different name and the
        // old file becomes an orphan. Delete sibling files with the same id prefix.
        try {
          const idPrefix = tc.id.toLowerCase() + '-';
          const writtenName = path.basename(writtenPath);
          for (const f of fs.readdirSync(categoryDir)) {
            if (f.toLowerCase().startsWith(idPrefix) && f !== writtenName) {
              fs.unlinkSync(path.join(categoryDir, f));
            }
          }
        } catch (err) { console.warn('[pmagent-sync] orphan cleanup skipped for ' + tc.id + ':', err); }
        updated++;
      }
    }
  }

  // Persist sync state
  const newState: PMAgentSyncState = {
    pmagentSlug: slug,
    pmagentPath: resolvedPath,
    lastSyncAt: new Date().toISOString(),
    importedTestIds: importedIds,
    checksums: parsed.checksums,
  };
  savePMAgentSyncState(projectDir, newState);

  return {
    ok: true,
    morbiusProjectId: projectId,
    categoriesCreated,
    testCasesCreated: created,
    testCasesUpdated: updated,
    testCasesUntouched: untouched,
    testCasesSkippedLocked: skippedLocked,
    durationMs: Date.now() - t0,
  };
}

// Helper: get the base data dir (where projects/<id> live).
function getDataRoot(): string {
  return DATA_DIR;
}

// ─────────────────────────────────────────────────────────────────────────────
// S-013-004: Per-project Jira sync state + replay queue
// File: data/{projectId}/jira-sync-state.json
// ─────────────────────────────────────────────────────────────────────────────

type JiraQueueKind = 'sync-bug' | 'writeback-status' | 'writeback-comment' | 'writeback-priority' | 'writeback-attachment';

interface JiraQueueItem {
  id: string;
  kind: JiraQueueKind;
  bugId: string;
  payload?: Record<string, unknown>;
  attempts: number;
  firstFailedAt: string;
  lastFailedAt: string;
  lastError: { code: JiraErrorCode; message: string; status?: number };
  stuck: boolean;
}

interface JiraSyncState {
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  queue: JiraQueueItem[];
  attachmentHashes: Record<string, string[]>;  // bugId → [sha256, …]
}

const EMPTY_SYNC_STATE: JiraSyncState = { lastSuccessAt: null, lastErrorAt: null, queue: [], attachmentHashes: {} };

function jiraSyncStatePath(projectDir: string): string {
  return path.join(projectDir, 'jira-sync-state.json');
}

function loadJiraSyncState(projectDir: string): JiraSyncState {
  try {
    const p = jiraSyncStatePath(projectDir);
    if (!fs.existsSync(p)) return JSON.parse(JSON.stringify(EMPTY_SYNC_STATE));
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<JiraSyncState>;
    return {
      lastSuccessAt: parsed.lastSuccessAt ?? null,
      lastErrorAt: parsed.lastErrorAt ?? null,
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      attachmentHashes: parsed.attachmentHashes ?? {},
    };
  } catch (err) {
    console.error('[jira] failed to load sync-state:', err);
    return JSON.parse(JSON.stringify(EMPTY_SYNC_STATE));
  }
}

function saveJiraSyncState(projectDir: string, state: JiraSyncState): void {
  try { fs.writeFileSync(jiraSyncStatePath(projectDir), JSON.stringify(state, null, 2)); }
  catch (err) { console.error('[jira] failed to save sync-state:', err); }
}

function noteJiraSuccess(projectDir: string): void {
  const s = loadJiraSyncState(projectDir);
  s.lastSuccessAt = new Date().toISOString();
  saveJiraSyncState(projectDir, s);
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

const STUCK_ATTEMPT_THRESHOLD = 10;
const STUCK_AGE_MS = 24 * 3600 * 1000;

function maybeMarkStuck(item: JiraQueueItem): void {
  if (!item.stuck
      && item.attempts > STUCK_ATTEMPT_THRESHOLD
      && (Date.now() - new Date(item.firstFailedAt).getTime()) > STUCK_AGE_MS) {
    item.stuck = true;
  }
}

function enqueueJiraReplay(projectDir: string, kind: JiraQueueKind, bugId: string, failure: JiraFailure, payload?: Record<string, unknown>): void {
  // Only enqueue retryable errors (NETWORK / RATE_LIMIT / SERVER). Terminal codes are not worth retrying.
  const retryable = failure.code === 'NETWORK' || failure.code === 'RATE_LIMIT' || failure.code === 'SERVER';
  if (!retryable) return;
  const s = loadJiraSyncState(projectDir);
  const now = new Date().toISOString();
  // Dedupe: same kind + bugId merges
  const existing = s.queue.find(q => q.kind === kind && q.bugId === bugId);
  if (existing) {
    existing.attempts++;
    existing.lastFailedAt = now;
    existing.lastError = { code: failure.code, message: failure.message, status: failure.status };
    if (payload) existing.payload = payload;
    maybeMarkStuck(existing);
  } else {
    s.queue.push({
      id: shortId(), kind, bugId, payload,
      attempts: 1, firstFailedAt: now, lastFailedAt: now,
      lastError: { code: failure.code, message: failure.message, status: failure.status },
      stuck: false,
    });
  }
  s.lastErrorAt = now;
  saveJiraSyncState(projectDir, s);
}

async function replayJiraQueue(projectDir: string): Promise<{ replayed: number; succeeded: number }> {
  const s = loadJiraSyncState(projectDir);
  if (s.queue.length === 0) return { replayed: 0, succeeded: 0 };
  const now = Date.now();
  const remaining: JiraQueueItem[] = [];
  let replayed = 0, succeeded = 0;
  for (const item of s.queue) {
    if (item.stuck) { remaining.push(item); continue; }
    // Backoff: 2^attempts seconds, capped at 1h. Skip if last attempt too recent.
    const backoffMs = Math.min(Math.pow(2, item.attempts) * 1000, 3600 * 1000);
    if (now - new Date(item.lastFailedAt).getTime() < backoffMs) { remaining.push(item); continue; }
    replayed++;
    let ok = false;
    try {
      const r = await retryJiraQueueItem(item, projectDir);
      ok = r.ok;
    } catch (err) {
      console.error('[jira] replay threw:', err);
      ok = false;
    }
    if (ok) {
      succeeded++;
      // success → drop from queue
    } else {
      item.attempts++;
      item.lastFailedAt = new Date().toISOString();
      maybeMarkStuck(item);
      remaining.push(item);
    }
  }
  s.queue = remaining;
  saveJiraSyncState(projectDir, s);
  return { replayed, succeeded };
}

async function retryJiraQueueItem(item: JiraQueueItem, projectDir: string): Promise<JiraResult<unknown>> {
  switch (item.kind) {
    case 'sync-bug':              return await syncBugFromJira(item.bugId, projectDir);
    case 'writeback-status':      return await pushBugStatusToJira(item.bugId, projectDir, String(item.payload?.status ?? ''));
    case 'writeback-priority':    return await pushBugPriorityToJira(item.bugId, projectDir, String(item.payload?.priority ?? ''));
    case 'writeback-comment':     return await pushBugCommentToJira(item.bugId, projectDir, String(item.payload?.text ?? ''));
    case 'writeback-attachment':  return await pushBugAttachmentToJira(item.bugId, projectDir, String(item.payload?.relPath ?? ''));
  }
  return { ok: false, code: 'BAD_REQUEST', message: `Unknown queue kind: ${(item as JiraQueueItem).kind}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// S-013-003: Jira write-back (status, priority, comment, attachment)
// ─────────────────────────────────────────────────────────────────────────────

const MORBIUS_TO_JIRA_STATUS: Record<string, string[]> = {
  // Morbius status → ordered list of acceptable Jira target status names
  'open':          ['Open', 'To Do', 'Backlog', 'Reopened'],
  'investigating': ['In Progress', 'In Review'],
  'fixed':         ['Done', 'Resolved', 'Closed'],
  'wont-fix':      ["Won't Do", 'Closed', "Won't Fix"],
};

const MORBIUS_TO_JIRA_PRIORITY: Record<string, string> = {
  'P0': 'Highest', 'P1': 'High', 'P2': 'Medium', 'P3': 'Low',
};

async function pushBugStatusToJira(bugId: string, projectDir: string, morbiusStatus: string): Promise<JiraResult<unknown>> {
  const bugs = loadAllBugs(projectDir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug?.jiraKey) return { ok: false, code: 'CONFIG', message: `Bug ${bugId} not linked to Jira` };
  const cfg = getJiraCfg();
  if (!cfg.ok) return { ok: false, code: 'CONFIG', message: cfg.message };
  const targets = MORBIUS_TO_JIRA_STATUS[morbiusStatus] || [];
  if (targets.length === 0) return { ok: false, code: 'BAD_REQUEST', message: `Unmapped Morbius status: ${morbiusStatus}` };

  // Fetch available transitions
  const tUrl = `${jiraApiBase(cfg)}/rest/api/3/issue/${encodeURIComponent(bug.jiraKey)}/transitions`;
  const tRes = await jiraCall<{ transitions: Array<{ id: string; name: string; to: { name: string } }> }>({
    url: tUrl, method: 'GET', email: cfg.email, token: cfg.token, bugId,
  });
  if (!tRes.ok) {
    enqueueJiraReplay(projectDir, 'writeback-status', bugId, tRes, { status: morbiusStatus });
    return tRes;
  }
  const transition = tRes.data.transitions.find(t => targets.includes(t.to?.name));
  if (!transition) {
    return { ok: false, code: 'BAD_REQUEST', message: `No Jira transition matches Morbius "${morbiusStatus}" (tried: ${targets.join(', ')})` };
  }

  const postRes = await jiraCall<unknown>({
    url: tUrl, method: 'POST',
    body: { transition: { id: transition.id } },
    email: cfg.email, token: cfg.token, bugId,
  });
  if (!postRes.ok) {
    enqueueJiraReplay(projectDir, 'writeback-status', bugId, postRes, { status: morbiusStatus });
    return postRes;
  }
  noteJiraSuccess(projectDir);
  return { ok: true, status: postRes.status, data: { transitionId: transition.id, target: transition.to.name } };
}

async function pushBugPriorityToJira(bugId: string, projectDir: string, morbiusPriority: string): Promise<JiraResult<unknown>> {
  const bugs = loadAllBugs(projectDir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug?.jiraKey) return { ok: false, code: 'CONFIG', message: `Bug ${bugId} not linked to Jira` };
  const cfg = getJiraCfg();
  if (!cfg.ok) return { ok: false, code: 'CONFIG', message: cfg.message };
  const jiraName = MORBIUS_TO_JIRA_PRIORITY[morbiusPriority];
  if (!jiraName) return { ok: false, code: 'BAD_REQUEST', message: `Unmapped priority: ${morbiusPriority}` };

  const r = await jiraCall<unknown>({
    url: `${jiraApiBase(cfg)}/rest/api/3/issue/${encodeURIComponent(bug.jiraKey)}`,
    method: 'PUT',
    body: { fields: { priority: { name: jiraName } } },
    email: cfg.email, token: cfg.token, bugId,
  });
  if (!r.ok) { enqueueJiraReplay(projectDir, 'writeback-priority', bugId, r, { priority: morbiusPriority }); return r; }
  noteJiraSuccess(projectDir);
  return r;
}

async function pushBugCommentToJira(bugId: string, projectDir: string, text: string): Promise<JiraResult<unknown>> {
  if (!text || !text.trim()) return { ok: false, code: 'BAD_REQUEST', message: 'Empty comment' };
  const bugs = loadAllBugs(projectDir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug?.jiraKey) return { ok: false, code: 'CONFIG', message: `Bug ${bugId} not linked to Jira` };
  const cfg = getJiraCfg();
  if (!cfg.ok) return { ok: false, code: 'CONFIG', message: cfg.message };

  // Atlassian Document Format (ADF) v1
  const body = {
    body: { type: 'doc', version: 1, content: [{
      type: 'paragraph', content: [{ type: 'text', text: `[Morbius] ${text}` }],
    }]}
  };
  const r = await jiraCall<unknown>({
    url: `${jiraApiBase(cfg)}/rest/api/3/issue/${encodeURIComponent(bug.jiraKey)}/comment`,
    method: 'POST', body,
    email: cfg.email, token: cfg.token, bugId,
  });
  if (!r.ok) { enqueueJiraReplay(projectDir, 'writeback-comment', bugId, r, { text }); return r; }
  noteJiraSuccess(projectDir);
  return r;
}

async function pushBugAttachmentToJira(bugId: string, projectDir: string, relPath: string): Promise<JiraResult<unknown>> {
  if (!relPath) return { ok: false, code: 'BAD_REQUEST', message: 'No attachment path' };
  const bugs = loadAllBugs(projectDir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug?.jiraKey) return { ok: false, code: 'CONFIG', message: `Bug ${bugId} not linked to Jira` };
  const cfg = getJiraCfg();
  if (!cfg.ok) return { ok: false, code: 'CONFIG', message: cfg.message };

  const abs = path.isAbsolute(relPath) ? relPath : path.join(projectDir, relPath);
  if (!fs.existsSync(abs)) return { ok: false, code: 'NOT_FOUND', message: `File not found: ${abs}` };

  // Hash for dedupe
  const buf = fs.readFileSync(abs);
  const sha256 = require('node:crypto').createHash('sha256').update(buf).digest('hex');
  const state = loadJiraSyncState(projectDir);
  const seen = state.attachmentHashes[bugId] || [];
  if (seen.includes(sha256)) return { ok: true, status: 200, data: { skipped: 'already-uploaded', sha256 } };

  // Multipart upload via FormData (Node 20+ has it built in)
  const fileName = path.basename(abs);
  const blob = new Blob([buf]);
  const form = new FormData();
  form.append('file', blob, fileName);

  const url = `${jiraApiBase(cfg)}/rest/api/3/issue/${encodeURIComponent(bug.jiraKey)}/attachments`;
  const headers: Record<string, string> = {
    'Authorization': `Basic ${Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64')}`,
    'Accept': 'application/json',
    'X-Atlassian-Token': 'no-check', // required for attachments
  };

  // Manual call (jiraCall serializes JSON; multipart needs FormData passthrough)
  try {
    const resp = await fetch(url, { method: 'POST', headers, body: form as unknown as RequestInit['body'] });
    if (!resp.ok) {
      const cls = classifyJiraStatus(resp.status);
      const errText = await resp.text().catch(() => '');
      const message = (errText ? errText.slice(0, 400) : resp.statusText) || `HTTP ${resp.status}`;
      recordJiraError({ ts: new Date().toISOString(), code: cls.code, message, url, method: 'POST', status: resp.status, attempt: 1, bugId, retryable: cls.retryable });
      const failure: JiraFailure = { ok: false, code: cls.code, status: resp.status, message };
      enqueueJiraReplay(projectDir, 'writeback-attachment', bugId, failure, { relPath });
      return failure;
    }
    // Persist the hash so we don't re-upload
    const after = loadJiraSyncState(projectDir);
    after.attachmentHashes[bugId] = [...(after.attachmentHashes[bugId] || []), sha256];
    saveJiraSyncState(projectDir, after);
    noteJiraSuccess(projectDir);
    return { ok: true, status: resp.status, data: { sha256, fileName } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordJiraError({ ts: new Date().toISOString(), code: 'NETWORK', message, url, method: 'POST', attempt: 1, bugId, retryable: true });
    const failure: JiraFailure = { ok: false, code: 'NETWORK', message };
    enqueueJiraReplay(projectDir, 'writeback-attachment', bugId, failure, { relPath });
    return failure;
  }
}

// Fire-and-forget orchestrator called from /api/bug/update.
function pushBugWriteback(bugId: string, projectDir: string, changes: { status?: string; priority?: string; notes?: string; screenshot?: string }): void {
  const bugs = loadAllBugs(projectDir);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug?.jiraKey) return; // not linked → nothing to do (silent)

  void (async () => {
    try {
      if (changes.status)    await pushBugStatusToJira(bugId, projectDir, changes.status);
      if (changes.priority)  await pushBugPriorityToJira(bugId, projectDir, changes.priority);
      if (changes.notes)     await pushBugCommentToJira(bugId, projectDir, changes.notes);
      if (changes.screenshot)await pushBugAttachmentToJira(bugId, projectDir, changes.screenshot);
      else if (bug.screenshot) await pushBugAttachmentToJira(bugId, projectDir, bug.screenshot);
    } catch (err) {
      console.error('[jira] writeback orchestrator threw:', err);
    }
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// S-013-002: Health computation
// ─────────────────────────────────────────────────────────────────────────────

interface JiraHealth {
  status: 'healthy' | 'degraded' | 'broken' | 'unconfigured';
  configured: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  queueCount: number;
  stuckCount: number;
  errorsLast5: JiraErrorEntry[];
  remediation: string | null;
}

function computeJiraHealth(projectDir: string): JiraHealth {
  const cfg = getJiraCfg();
  const state = loadJiraSyncState(projectDir);
  const errors = getJiraErrors();
  const errorsLast5 = errors.slice(-5).reverse();
  const stuckCount = state.queue.filter(q => q.stuck).length;
  const queueCount = state.queue.length;

  if (!cfg.ok) {
    return {
      status: 'unconfigured', configured: false,
      lastSuccessAt: state.lastSuccessAt, lastErrorAt: state.lastErrorAt,
      queueCount, stuckCount, errorsLast5,
      remediation: `Set ${cfg.missing.join(', ')} in Settings → Integrations → Jira.`,
    };
  }

  const lastErr = state.lastErrorAt ? new Date(state.lastErrorAt).getTime() : 0;
  const lastSucc = state.lastSuccessAt ? new Date(state.lastSuccessAt).getTime() : 0;
  const errorAgeMin = lastErr ? (Date.now() - lastErr) / 60000 : Infinity;

  let status: JiraHealth['status'] = 'healthy';
  let remediation: string | null = null;

  // Broken: an error newer than the latest success AND it's recent (<5 min) OR there's a stuck item
  if ((lastErr > lastSucc && errorAgeMin < 5) || stuckCount > 0) {
    status = 'broken';
    if (stuckCount > 0) remediation = `${stuckCount} item(s) stuck in the replay queue. Retry or discard them in Settings → Jira → Queue.`;
    else if (errorsLast5[0]?.code === 'AUTH') remediation = 'Auth failed (401). Re-test credentials in Settings → Integrations.';
    else if (errorsLast5[0]?.code === 'PERMISSION') remediation = 'Permission denied (403). Check the API token has project access.';
    else if (errorsLast5[0]?.code === 'RATE_LIMIT') remediation = 'Rate limit hit (429). Will retry automatically with backoff.';
    else remediation = 'Recent sync failures. See errors below for details.';
  } else if (queueCount > 0 || (lastErr && errorAgeMin < 60)) {
    status = 'degraded';
    remediation = queueCount > 0 ? `${queueCount} item(s) in replay queue.` : 'Recent transient errors; recovery in progress.';
  }

  return { status, configured: true, lastSuccessAt: state.lastSuccessAt, lastErrorAt: state.lastErrorAt, queueCount, stuckCount, errorsLast5, remediation };
}

// Background ticker — runs every 60s for the active project's queue.
let jiraReplayTimer: ReturnType<typeof setInterval> | null = null;
function startJiraReplayTimer(): void {
  if (jiraReplayTimer) return;
  jiraReplayTimer = setInterval(() => {
    try {
      const dir = getDataDir();   // active project dir
      // Only run if there's something to replay; cheap check.
      const state = loadJiraSyncState(dir);
      if (state.queue.length === 0) return;
      void replayJiraQueue(dir).catch(err => console.error('[jira] replay tick failed:', err));
    } catch (err) {
      console.error('[jira] replay timer tick error:', err);
    }
  }, 60_000);
}

function serveScreenshot(pathname: string, res: http.ServerResponse): void {
  // Try in active project dir first (for run screenshots), then fall back to DATA_DIR root
  const projectDir = getActiveProjectDir();
  const relativePath = pathname.replace(/^\//, '');

  const candidates = [
    path.resolve(projectDir, relativePath),
    path.resolve(DATA_DIR, relativePath),
  ];

  for (const filePath of candidates) {
    // Security: ensure resolved path is under DATA_DIR
    if (!filePath.startsWith(path.resolve(DATA_DIR))) continue;
    if (!fs.existsSync(filePath)) continue;

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

function serveMedia(pathname: string, res: http.ServerResponse): void {
  const registry = loadProjectRegistry();
  const project = registry.projects.find(p => p.id === registry.activeProject);
  const mediaPath = (project as any)?.mediaPath as string | undefined;

  if (!mediaPath) {
    res.writeHead(404);
    res.end('No mediaPath configured for this project');
    return;
  }

  // Strip leading /media/ and resolve under mediaPath
  const relative = pathname.replace(/^\/media\//, '');
  const filePath = path.resolve(mediaPath, relative);

  // Security: stay under mediaPath
  if (!filePath.startsWith(path.resolve(mediaPath))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  const contentType = mimeTypes[ext] ?? 'application/octet-stream';

  // Support HTTP Range requests for video seeking
  const stat = fs.statSync(filePath);
  const rangeHeader = res.req?.headers?.range ?? (res as any)._req?.headers?.range;
  if (rangeHeader && ext === '.mp4') {
    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  }
}

interface MediaRun {
  timestamp: string;
  videos: string[];
  screenshots: string[];
  sizeMb: number;
}

/**
 * Copy latest ~/.maestro/tests/<timestamp>/ into <mediaPath>/runs/<timestamp>/
 * Returns the run metadata, or null if nothing to copy.
 */
function ingestLatestMaestroRun(mediaPath: string): MediaRun | null {
  const HOME = process.env.HOME ?? '';
  const maestroTestsDir = path.join(HOME, '.maestro', 'tests');
  if (!fs.existsSync(maestroTestsDir)) return null;

  // Find most recent timestamp dir
  const entries = fs.readdirSync(maestroTestsDir)
    .filter(e => /^\d{4}-\d{2}-\d{2}_\d{6}$/.test(e))
    .sort()
    .reverse();
  if (entries.length === 0) return null;

  const timestamp = entries[0];
  const srcDir = path.join(maestroTestsDir, timestamp);
  const destDir = path.join(mediaPath, 'runs', timestamp);

  // Already ingested
  if (fs.existsSync(destDir)) {
    return buildMediaRunMeta(destDir, timestamp);
  }

  // Copy videos
  const videos: string[] = [];
  const srcVideos = path.join(srcDir, 'videos');
  if (fs.existsSync(srcVideos)) {
    const destVideos = path.join(destDir, 'videos');
    fs.mkdirSync(destVideos, { recursive: true });
    for (const f of fs.readdirSync(srcVideos).filter(f => f.endsWith('.mp4'))) {
      fs.copyFileSync(path.join(srcVideos, f), path.join(destVideos, f));
      videos.push(f);
    }
  }

  // Copy screenshots (in per-flow subdirs or root)
  const screenshots: string[] = [];
  const destScreenshots = path.join(destDir, 'screenshots');
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'videos') {
      const subScreenshotsDir = path.join(srcDir, entry.name, 'screenshots');
      if (fs.existsSync(subScreenshotsDir)) {
        fs.mkdirSync(destScreenshots, { recursive: true });
        for (const f of fs.readdirSync(subScreenshotsDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f))) {
          const dest = path.join(destScreenshots, `${entry.name}_${f}`);
          fs.copyFileSync(path.join(subScreenshotsDir, f), dest);
          screenshots.push(`${entry.name}_${f}`);
        }
      }
    }
  }

  return buildMediaRunMeta(destDir, timestamp);
}

function buildMediaRunMeta(runDir: string, timestamp: string): MediaRun {
  const videos = fs.existsSync(path.join(runDir, 'videos'))
    ? fs.readdirSync(path.join(runDir, 'videos')).filter(f => f.endsWith('.mp4'))
    : [];
  const screenshots = fs.existsSync(path.join(runDir, 'screenshots'))
    ? fs.readdirSync(path.join(runDir, 'screenshots')).filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    : [];

  // Calculate total size
  let totalBytes = 0;
  const walkDir = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isFile()) totalBytes += fs.statSync(p).size;
      else if (e.isDirectory()) walkDir(p);
    }
  };
  walkDir(runDir);

  return { timestamp, videos, screenshots, sizeMb: Math.round(totalBytes / 1024 / 1024 * 10) / 10 };
}

/**
 * List all ingested run directories for the active project's mediaPath.
 */
function listMediaRuns(mediaPath: string): MediaRun[] {
  const runsDir = path.join(mediaPath, 'runs');
  if (!fs.existsSync(runsDir)) return [];
  return fs.readdirSync(runsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{6}$/.test(e.name))
    .sort((a, b) => b.name.localeCompare(a.name)) // newest first
    .map(e => buildMediaRunMeta(path.join(runsDir, e.name), e.name));
}

function buildDashboardData(dir?: string) {
  const tests = loadAllTestCases(dir);
  const bugs = loadAllBugs(dir);
  const categories = loadAllCategories(dir);
  const runs = loadAllRuns(dir);

  const catHealth = calculateCategoryHealth(categories, tests);

  const totalTests = tests.length;
  const totalPassed = tests.filter(t => t.status === 'pass').length;

  const devices = getDeviceList();
  const deviceCoverage = devices.map(d => {
    const withDevice = tests.filter(t => t.deviceResults.some(dr => dr.device === d.id));
    const passedOnDevice = withDevice.filter(t => t.deviceResults.find(dr => dr.device === d.id)?.status === 'pass').length;
    return {
      device: d,
      total: withDevice.length,
      passed: passedOnDevice,
      percentage: withDevice.length > 0 ? Math.round((passedOnDevice / withDevice.length) * 100) : 0,
    };
  });

  const flakyTests = detectFlakyTests(tests, runs);
  const coverageGaps = findCoverageGaps(tests, categories, devices.map(d => d.id));
  const recentActivity = buildActivityFeed(bugs, runs);

  // E-027 trust pass: surface real run count so the dashboard can hide
  // synthetic placeholder visuals (sparkline, "vs prev period" delta) when
  // there's no real run history to compare against.
  const runCount = runs.length;

  return {
    overallHealth: { total: totalTests, passed: totalPassed, percentage: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0 },
    runCount,
    categories: catHealth,
    flakyTests,
    deviceCoverage,
    recentBugs: bugs.slice(0, 10),
    recentActivity,
    coverageGaps,
  };
}

function getDeviceList() {
  // Honesty: reflect the ACTIVE project's configured devices, not a fixed default — otherwise
  // the device matrix and dashboard invent phantom "missing 100%" coverage gaps for hardware
  // the project never targets (e.g. Road Scholar tests only iPhone + Android Phone). Falls back
  // to the standard four when a project has no devices configured.
  try {
    const registry = loadProjectRegistry();
    const project = registry.projects.find(p => p.id === registry.activeProject);
    const devices = project && Array.isArray(project.devices) ? project.devices : [];
    if (devices.length) {
      return devices.map(d => ({
        id: d.id,
        name: d.name,
        platform: (d.platform === 'ios' ? 'ios' : 'android') as 'ios' | 'android',
      }));
    }
  } catch { /* fall through to default */ }
  return [
    { id: 'ipad', name: 'iPad', platform: 'ios' as const },
    { id: 'iphone', name: 'iPhone', platform: 'ios' as const },
    { id: 'android-tab', name: 'Android Tablet', platform: 'android' as const },
    { id: 'android-phone', name: 'Android Phone', platform: 'android' as const },
  ];
}

// Phase 2 (executability): when a test card carries no direct maestroFlow link, fall back to
// the automation plan's flow→testIds mapping and resolve data/<project>/flows/<flowId>.yaml.
// Keeps the card↔flow link in the (already-authoritative) automation plan instead of forcing
// machine-specific paths into committed test-card frontmatter.
function resolvePlannedFlowPath(testId: string, platform: string, dir: string): string | null {
  try {
    const projectId = path.basename(dir);
    const plan = loadAutomationPlan(projectId);
    if (!plan) return null;
    for (const f of plan.flows) {
      if (!f.testIds.includes(testId)) continue;
      if (platform && f.platforms.length && !f.platforms.includes(platform)) continue;
      const candidate = path.join(dir, 'flows', f.id + '.yaml');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch { /* fall through → no planned flow */ }
  return null;
}

// ============================================================
// HTML Generation — Vercel-style Monochrome Dashboard
// ============================================================

// Pre-transpile the dashboard JSX once at first request and cache it, so the
// browser gets plain JS + production React instead of pulling Babel standalone
// and re-transpiling ~500KB of JSX on every page load (was >1.4s to first
// render on localhost). null = transform failed → serve the legacy in-browser
// Babel path so a syntax slip never blanks the dashboard.
let compiledDashboardJS: string | null | undefined;
let compiledDashboardETag = '"morbius-app"';
function getCompiledDashboardJS(): string | null {
  if (compiledDashboardJS === undefined) {
    try {
      // createRequire: this file compiles to ESM, where bare require() doesn't exist.
      const esbuild = createRequire(import.meta.url)('esbuild') as typeof import('esbuild');
      compiledDashboardJS = esbuild.transformSync(generateJS(), { loader: 'jsx', target: 'es2020' }).code;
      compiledDashboardETag = '"app-' + compiledDashboardJS.length.toString(36) + '"';
    } catch (err) {
      console.error('[morbius] JSX precompile failed — falling back to in-browser Babel:', err instanceof Error ? err.message : err);
      compiledDashboardJS = null;
    }
  }
  return compiledDashboardJS;
}
function getCompiledDashboardETag(): string { return compiledDashboardETag; }

function generateHtml(): string {
  const compiledJS = getCompiledDashboardJS();
  // Compiled path: everything defers — the HTML paints its CSS shell immediately and
  // scripts execute in order before DOMContentLoaded. Fallback path keeps the legacy
  // synchronous order (Babel standalone needs the inline text/babel script in place).
  const appScripts = compiledJS !== null
    ? `<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin defer></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin defer></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js" defer></script>
<script src="/app.js" defer></script>`
    : `<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin></script>
<script type="text/babel">${generateJS()}</script>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Morbius — QA Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${generateCSS()}</style>
</head>
<body>
<div id="root"></div>
<script>
// E-027 / S-027-006: designer-grade Mermaid theme — Morbius monochrome palette,
// Inter typography, hairline borders, status accent strip on flow nodes (added
// post-render in AppMapView).
// Wrapped in DOMContentLoaded so mermaid can load deferred (it's ~3MB and only
// the App Map view uses it) — deferred scripts finish before this event fires.
window.addEventListener('DOMContentLoaded', function () {
  if (!window.mermaid) return;
  window.mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
  themeVariables: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    background: '#0A0A0A',
    primaryColor: '#111111',
    primaryTextColor: '#F4F4F5',
    primaryBorderColor: '#2A2A2D',
    secondaryColor: '#0E0E10',
    secondaryBorderColor: '#1F1F22',
    tertiaryColor: '#0F0F12',
    tertiaryBorderColor: '#1F1F22',
    lineColor: '#3A3A3F',
    textColor: '#E5E5E7',
    labelTextColor: '#A1A1AA',
    edgeLabelBackground: '#0A0A0A',
    clusterBkg: 'rgba(255,255,255,0.015)',
    clusterBorder: '#1F1F22',
    titleColor: '#F4F4F5',
    nodeBorder: '#2A2A2D',
  },
  flowchart: {
    curve: 'basis',
    htmlLabels: true,
    padding: 14,
    nodeSpacing: 38,
    rankSpacing: 56,
    diagramPadding: 16,
    useMaxWidth: true,
  },
  themeCSS: [
    "g.node rect, g.node polygon, g.node circle, g.node ellipse, g.node path { stroke-width: 1px !important; rx: 8; ry: 8; transition: all 180ms ease-out; }",
    "g.node .label, g.node foreignObject div { font-family: Inter, ui-sans-serif, system-ui, sans-serif !important; font-weight: 500; letter-spacing: -0.005em; }",
    "g.node:hover rect, g.node:hover polygon, g.node:hover circle, g.node:hover ellipse, g.node:hover path { fill: #161618 !important; stroke: #4A4A50 !important; filter: drop-shadow(0 1px 0 rgba(255,255,255,0.04)); }",
    "g.cluster rect { stroke-width: 1px !important; rx: 12; ry: 12; }",
    ".cluster-label, .cluster .nodeLabel { font-size: 10.5px !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #71717A !important; fill: #71717A !important; font-weight: 600 !important; }",
    "g.edgeLabel rect, g.edgeLabel foreignObject div { background: rgba(10,10,10,0.92) !important; color: #A1A1AA !important; font-size: 10.5px !important; padding: 1px 6px !important; border-radius: 4px !important; }",
    "g.edgePath path.path { stroke-width: 1.4px !important; }",
    ".marker { fill: #4A4A50 !important; stroke: #4A4A50 !important; }",
    // Status accents — applied via .status-* classes added in post-render decoration.
    "g.node.status-covered rect, g.node.status-covered polygon, g.node.status-covered path { stroke: #45E0A8 !important; stroke-width: 1.5px !important; filter: drop-shadow(-3px 0 0 #45E0A8); }",
    "g.node.status-flaky rect, g.node.status-flaky polygon, g.node.status-flaky path { stroke: #F5A623 !important; stroke-width: 1.5px !important; filter: drop-shadow(-3px 0 0 #F5A623); }",
    "g.node.status-fail rect, g.node.status-fail polygon, g.node.status-fail path { stroke: #E5484D !important; stroke-width: 1.5px !important; filter: drop-shadow(-3px 0 0 #E5484D); }",
    "g.node.status-covered:hover rect, g.node.status-covered:hover polygon, g.node.status-covered:hover path { filter: drop-shadow(-4px 0 0 #45E0A8) drop-shadow(0 1px 0 rgba(255,255,255,0.04)); }",
    "g.node.flow-clickable { cursor: pointer; }",
  ].join(' '),
  });
});
</script>
<script>
window.__TWEAKS__ = {
  "theme": "dark",
  "accent": "violet",
  "layout": "sidebar",
  "density": "balanced",
  "cardStyle": "elevated"
};
</script>
${appScripts}
</body>
</html>`;
}

function generateCSS(): string {
  return `
/* ==========================================================================
   Morbius Dashboard — design tokens
   ========================================================================== */

:root {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  color-scheme: dark;

  /* Dark palette (default).
     Design intent (v2 re-grade): deep near-black base the way Linear/Vercel sit
     (L 0.13, not 0.16 — lighter dark themes read "admin template"), a tight
     elevation ramp, and hairline WHITE-ALPHA borders instead of opaque grays —
     alpha borders blend correctly over every surface and are the single
     biggest "refined" lever in a dark UI. Neutrals carry a whisper of violet
     (hue 275, chroma ≤0.01) so surfaces feel intentional, never purple. */
  --bg: oklch(0.13 0.007 275);
  --bg-elev: oklch(0.165 0.008 275);
  --bg-elev-2: oklch(0.2 0.009 275);
  --bg-hover: oklch(0.225 0.01 275);
  --bg-sunken: oklch(0.105 0.006 275);
  --border: oklch(1 0 0 / 0.08);
  --border-strong: oklch(1 0 0 / 0.15);
  --fg: oklch(0.955 0.002 275);
  --fg-muted: oklch(0.77 0.006 275);
  --fg-dim: oklch(0.62 0.008 275);
  --fg-faint: oklch(0.5 0.008 275);

  /* Status — deepened a step from the v1 neons; soft backgrounds are now
     alpha of the status color itself, so pill/tint pairs stay in lockstep. */
  --ok: oklch(0.7 0.145 160);
  --ok-bg: oklch(0.7 0.145 160 / 0.12);
  --fail: oklch(0.64 0.19 24);
  --fail-bg: oklch(0.64 0.19 24 / 0.12);
  --warn: oklch(0.76 0.135 80);
  --warn-bg: oklch(0.76 0.135 80 / 0.12);
  --info: oklch(0.69 0.125 240);
  --info-bg: oklch(0.69 0.125 240 / 0.12);

  /* Accent — indigo-violet, pulled down from the v1 candy violet; overridable */
  --accent: oklch(0.63 0.16 285);
  --accent-contrast: oklch(0.99 0 0);
  --accent-soft: oklch(0.63 0.16 285 / 0.15);

  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  /* Elevation: cards barely lift (sm), dropdowns float (md), overlays pop (pop) */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 16px -4px rgb(0 0 0 / 0.4), 0 1px 4px rgb(0 0 0 / 0.3);
  --shadow-pop: 0 16px 50px -12px rgb(0 0 0 / 0.6), 0 4px 14px -6px rgb(0 0 0 / 0.45);

  --row-gap: 14px;
  --pad: 20px;
}

[data-theme="light"] {
  color-scheme: light;
  /* Light: neutral-cool paper, not the v1 warm hue-90 cream — a yellow-tinted
     base fights the violet accent and reads consumer, not tooling. */
  --bg: oklch(0.984 0.001 260);
  --bg-elev: oklch(1 0 0);
  --bg-elev-2: oklch(0.972 0.002 260);
  --bg-hover: oklch(0.945 0.003 260);
  --bg-sunken: oklch(0.958 0.002 260);
  --border: oklch(0 0 0 / 0.09);
  --border-strong: oklch(0 0 0 / 0.17);
  --fg: oklch(0.215 0.012 275);
  --fg-muted: oklch(0.43 0.01 275);
  --fg-dim: oklch(0.52 0.008 275);
  --fg-faint: oklch(0.62 0.006 275);

  --ok: oklch(0.545 0.135 160);
  --ok-bg: oklch(0.545 0.135 160 / 0.12);
  --fail: oklch(0.55 0.195 24);
  --fail-bg: oklch(0.55 0.195 24 / 0.1);
  --warn: oklch(0.6 0.125 80);
  --warn-bg: oklch(0.6 0.125 80 / 0.14);
  --info: oklch(0.53 0.125 245);
  --info-bg: oklch(0.53 0.125 245 / 0.1);

  --accent: oklch(0.51 0.16 285);
  --accent-soft: oklch(0.51 0.16 285 / 0.12);

  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.06);
  --shadow-md: 0 4px 16px -6px rgb(0 0 0 / 0.1), 0 1px 4px rgb(0 0 0 / 0.05);
  --shadow-pop: 0 16px 50px -12px rgb(0 0 0 / 0.18), 0 4px 14px -6px rgb(0 0 0 / 0.1);
}

/* Accent presets — soft tints derive from the accent itself (alpha), matching the status pattern */
[data-accent="violet"] { --accent: oklch(0.63 0.16 285); --accent-soft: oklch(0.63 0.16 285 / 0.15); }
[data-accent="violet"][data-theme="light"] { --accent: oklch(0.51 0.16 285); --accent-soft: oklch(0.51 0.16 285 / 0.12); }
[data-accent="green"] { --accent: oklch(0.7 0.145 160); --accent-soft: oklch(0.7 0.145 160 / 0.15); }
[data-accent="green"][data-theme="light"] { --accent: oklch(0.545 0.135 160); --accent-soft: oklch(0.545 0.135 160 / 0.12); }
[data-accent="amber"] { --accent: oklch(0.76 0.135 80); --accent-soft: oklch(0.76 0.135 80 / 0.15); }
[data-accent="amber"][data-theme="light"] { --accent: oklch(0.6 0.125 80); --accent-soft: oklch(0.6 0.125 80 / 0.12); }
[data-accent="blue"] { --accent: oklch(0.69 0.125 240); --accent-soft: oklch(0.69 0.125 240 / 0.15); }
[data-accent="blue"][data-theme="light"] { --accent: oklch(0.53 0.125 245); --accent-soft: oklch(0.53 0.125 245 / 0.12); }

/* Density */
[data-density="compact"] { --row-gap: 10px; --pad: 14px; }
[data-density="sparse"] { --row-gap: 20px; --pad: 28px; }

/* ==========================================================================
   Base
   ========================================================================== */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--fg);
  font-size: 13.5px;
  line-height: 1.45;
  letter-spacing: -0.005em;
  font-feature-settings: "cv11", "ss01", "ss03";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#root { min-height: 100%; display: flex; flex-direction: column; }

a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
input, textarea, select { font: inherit; color: inherit; }
code, pre, .mono { font-family: var(--font-mono); }

/* ==========================================================================
   App shell
   ========================================================================== */
.app {
  display: grid;
  grid-template-columns: 232px 1fr;
  grid-template-rows: 48px 1fr;
  height: 100vh;
  min-height: 0;
}
.app[data-layout="topnav"] {
  grid-template-columns: 1fr;
  grid-template-rows: 48px 44px 1fr;
}

/* Topbar */
.topbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px 0 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  position: relative;
  z-index: 10;
}
.topbar .brand {
  display: flex; align-items: center; gap: 8px;
  width: auto;
  padding-left: 2px;
}
.brand-mark {
  display: grid; place-items: center;
}

.topbar .project-switcher {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 6px;
  background: transparent; border: 1px solid transparent;
  color: var(--fg-muted);
  font-size: 12.5px;
}
.topbar .project-switcher:hover { background: var(--bg-hover); color: var(--fg); }

.topbar .search {
  flex: 1; max-width: 520px; margin-inline: auto;
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--fg-dim);
  font-size: 12.5px;
  cursor: text;
}
.topbar .search:hover { border-color: var(--border-strong); }
.topbar .search .kbd { margin-left: auto; }

.topbar-right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.topbar-right .icon-btn { width: 30px; height: 30px; }

.kbd {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 1px 5px; border-radius: 4px;
  background: var(--bg-elev-2); border: 1px solid var(--border);
  color: var(--fg-muted);
  font-family: var(--font-mono); font-size: 10.5px; line-height: 1.4;
}

.status-pills {
  display: flex; gap: 6px; align-items: center;
  padding-right: 10px; margin-right: 6px;
  border-right: 1px solid var(--border);
  height: 30px;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 7px; border-radius: 5px;
  font-size: 11px; color: var(--fg-muted);
  background: transparent;
  font-variant-numeric: tabular-nums;
  /* Trust pass: pills are now <button>s. Strip default browser chrome. */
  border: 1px solid transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
button.status-pill:hover { background: var(--bg-hover); color: var(--fg); }
button.status-pill.fail:hover { border-color: var(--fail); }
button.status-pill.ok:hover { border-color: var(--ok); }
.status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--fg-faint); }
.status-pill.ok .dot { background: var(--ok); box-shadow: 0 0 0 3px oklch(from var(--ok) l c h / 0.18); }
.status-pill.fail .dot { background: var(--fail); box-shadow: 0 0 0 3px oklch(from var(--fail) l c h / 0.18); }

/* Sidebar */
.sidebar {
  grid-row: 2 / -1;
  border-right: 1px solid var(--border);
  background: var(--bg);
  padding: 10px 8px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}
.app[data-layout="topnav"] .sidebar { display: none; }

.sidebar .nav-group { display: flex; flex-direction: column; gap: 1px; }
.sidebar .nav-group-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-faint);
  padding: 8px 10px 4px;
  font-weight: 600;
}
.sidebar .nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 6px 9px;
  border-radius: 6px;
  color: var(--fg-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: background .1s ease, color .1s ease;
}
.sidebar .nav-item:hover { background: var(--bg-hover); color: var(--fg); }
.sidebar .nav-item.active { background: var(--bg-elev); color: var(--fg); }
.sidebar .nav-item.active::before {
  content: ''; position: absolute; left: -8px; top: 6px; bottom: 6px;
  width: 2px; border-radius: 0 2px 2px 0;
  background: var(--accent);
}
.sidebar .nav-item .count {
  margin-left: auto; font-family: var(--font-mono); font-size: 11px;
  color: var(--fg-faint);
  font-variant-numeric: tabular-nums;
}
/* Shortcut hints reveal on hover only — rendered inline at rest they read as
   counts ("Bugs 3" when 3 is the hotkey), which makes real counts untrustworthy. */
.sidebar .nav-item .kbd { margin-left: auto; opacity: 0; transition: opacity 120ms ease; }
.sidebar .nav-item:hover .kbd, .sidebar .nav-item.active .kbd { opacity: 1; }
.sidebar .nav-item.active .count { color: var(--fg-muted); }

.sidebar-footer {
  margin-top: auto; padding: 10px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
}
.avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), oklch(from var(--accent) l c calc(h + 40)));
  display: grid; place-items: center;
  font-weight: 600; font-size: 11.5px; color: var(--accent-contrast);
}
.avatar.avatar-muted {
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  color: var(--fg-muted);
}
.sidebar-footer .who { display: flex; flex-direction: column; line-height: 1.2; }
.sidebar-footer .who .name { font-size: 12.5px; font-weight: 500; }
.sidebar-footer .who .role { font-size: 11px; color: var(--fg-faint); }

/* Topnav layout */
.topnav-tabs {
  display: flex; align-items: center; gap: 2px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  overflow-x: auto;
}
.topnav-tabs .nav-item {
  position: relative;
  padding: 10px 12px;
  color: var(--fg-muted); font-size: 13px; font-weight: 500;
  border-radius: 0;
  display: flex; align-items: center; gap: 8px;
  white-space: nowrap;
  cursor: pointer;
}
.topnav-tabs .nav-item:hover { color: var(--fg); }
.topnav-tabs .nav-item.active { color: var(--fg); }
.topnav-tabs .nav-item.active::after {
  content: ''; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px;
  background: var(--accent); border-radius: 2px 2px 0 0;
}

/* Main */
.main {
  overflow: auto;
  min-width: 0;
  background: var(--bg);
  display: flex; flex-direction: column;
}
.view-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky; top: 0; z-index: 4;
}
.view-header h1 {
  font-size: 17px; font-weight: 600; margin: 0; letter-spacing: -0.01em;
  display: flex; align-items: center; gap: 10px;
}
.view-header .crumb { color: var(--fg-dim); font-weight: 500; font-size: 12.5px; }
.view-header .sub { color: var(--fg-muted); font-size: 12.5px; margin-top: 3px; }
.view-header .actions { display: flex; gap: 6px; align-items: center; }

.view-body { padding: 18px 24px 32px; flex: 1; min-width: 0; }
.view-body.pad-sm { padding: 14px 16px 24px; }

/* ==========================================================================
   Primitives
   ========================================================================== */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--fg);
  font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .1s ease, border-color .1s ease;
}
.btn:hover { background: var(--bg-hover); border-color: var(--border-strong); }
.btn.ghost { background: transparent; border-color: transparent; color: var(--fg-muted); }
.btn.ghost:hover { background: var(--bg-hover); color: var(--fg); border-color: transparent; }
/* Primary: subtle vertical gradient + inset top highlight — the "finished key cap"
   read that flat fills lack. Hover lightens the gradient instead of filter:brightness
   (which also brightens the label and looks like a glow, not a state). */
.btn.primary {
  background: linear-gradient(to bottom, oklch(from var(--accent) calc(l + 0.05) c h), var(--accent));
  border-color: oklch(from var(--accent) calc(l - 0.07) c h);
  color: var(--accent-contrast); font-weight: 600;
  box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18), 0 1px 2px rgb(0 0 0 / 0.25);
}
.btn.primary:hover {
  background: linear-gradient(to bottom, oklch(from var(--accent) calc(l + 0.08) c h), oklch(from var(--accent) calc(l + 0.02) c h));
  border-color: oklch(from var(--accent) calc(l - 0.05) c h);
}
.btn.danger { color: var(--fail); }
.btn.sm { padding: 3px 7px; font-size: 11.5px; border-radius: 5px; }
.btn:active:not(:disabled) { background: var(--bg-elev-2); }
.btn.primary:active:not(:disabled) {
  background: oklch(from var(--accent) calc(l - 0.03) c h);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.2);
}
.btn:disabled, .btn[disabled] { opacity: 0.5; cursor: not-allowed; }
.btn:disabled:hover { background: var(--bg-elev); border-color: var(--border); }
.btn.ghost:disabled:hover { background: transparent; border-color: transparent; }

.icon-btn {
  width: 28px; height: 28px;
  border-radius: 6px;
  display: inline-grid; place-items: center;
  color: var(--fg-muted);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--fg); }
.icon-btn.active { background: var(--bg-elev); color: var(--fg); border-color: var(--border); }

/* Card */
.card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
[data-card="flat"] .card { background: var(--bg-elev); border-color: transparent; }
/* Elevated = hairline lift + 1px inner light edge along the top (catch-light), not a
   floating drop shadow — heavy shadows on every card flatten the hierarchy for overlays. */
[data-card="elevated"] .card { box-shadow: var(--shadow-sm), inset 0 1px 0 oklch(1 0 0 / 0.04); border-color: var(--border); }
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
}
.card-header h3 {
  margin: 0; font-size: 12px; font-weight: 600;
  color: var(--fg-muted); letter-spacing: 0.02em;
  text-transform: uppercase;
}
.card-body { padding: 14px; }
.card-body.plain { padding: 0; }

/* Tag / pill */
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px; font-weight: 500;
  background: var(--bg-elev-2); color: var(--fg-muted);
  border: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .9; }
.pill.sq { border-radius: 5px; }
.pill.ok { color: var(--ok); background: var(--ok-bg); border-color: transparent; }
.pill.fail { color: var(--fail); background: var(--fail-bg); border-color: transparent; }
.pill.warn { color: var(--warn); background: var(--warn-bg); border-color: transparent; }
.pill.info { color: var(--info); background: var(--info-bg); border-color: transparent; }
.pill.accent { color: var(--accent); background: var(--accent-soft); border-color: transparent; }
.pill.neutral { color: var(--fg-muted); }

/* Hero metric */
.metric {
  display: flex; flex-direction: column; gap: 3px;
}
.metric .label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--fg-faint); font-weight: 600;
}
.metric .value {
  font-family: var(--font-mono); font-size: 26px; font-weight: 600;
  letter-spacing: -0.02em; color: var(--fg);
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
}
.metric .delta { font-size: 12px; color: var(--fg-muted); display: flex; align-items: center; gap: 5px; }
.metric .delta.up { color: var(--ok); }
.metric .delta.down { color: var(--fail); }

/* Status dot */
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.status-dot.pass { background: var(--ok); box-shadow: 0 0 0 3px oklch(from var(--ok) l c h / 0.15); }
.status-dot.fail { background: var(--fail); box-shadow: 0 0 0 3px oklch(from var(--fail) l c h / 0.15); }
.status-dot.flaky { background: var(--warn); box-shadow: 0 0 0 3px oklch(from var(--warn) l c h / 0.15); }
.status-dot.running { background: var(--info); animation: pulse 1.2s infinite; }
.status-dot.none { background: var(--fg-faint); }

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 oklch(from var(--info) l c h / 0.5); }
  50% { box-shadow: 0 0 0 5px oklch(from var(--info) l c h / 0); }
}

/* Grid utilities */
.grid { display: grid; gap: var(--row-gap); }
.grid.g-12 { grid-template-columns: repeat(12, 1fr); }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-5 { grid-column: span 5; }
.col-6 { grid-column: span 6; }
.col-7 { grid-column: span 7; }
.col-8 { grid-column: span 8; }
.col-9 { grid-column: span 9; }
.col-12 { grid-column: span 12; }

.row { display: flex; gap: 10px; align-items: center; }
.row.between { justify-content: space-between; }
.row.wrap { flex-wrap: wrap; }
.stack { display: flex; flex-direction: column; gap: 10px; }

.divider { height: 1px; background: var(--border); margin: 0; }
.vr { width: 1px; height: 18px; background: var(--border); }

/* ==========================================================================
   Dashboard-specific
   ========================================================================== */
.hero-stats {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-elev);
}
.hero-stats .cell {
  padding: 16px 18px;
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 118px;
  position: relative;
}
.hero-stats .cell:last-child { border-right: 0; }
.hero-stats .cell .mini-bar {
  display: flex; align-items: flex-end; gap: 2px; height: 26px; margin-top: 6px;
}
.hero-stats .cell .mini-bar span {
  flex: 1; background: var(--accent-soft); border-radius: 1px;
  min-width: 2px;
}
.hero-stats .cell .mini-bar span.hi { background: var(--accent); }

/* Category health */
.health-row {
  display: grid; grid-template-columns: 1fr 42px 160px 42px;
  gap: 10px; align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.health-row:last-child { border-bottom: 0; }
.health-row:hover { background: var(--bg-hover); }
.health-row .name { font-size: 12.5px; font-weight: 500; display: flex; align-items: center; gap: 8px; min-width: 0; }
.health-row .name .label-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.health-row .pct { font-family: var(--font-mono); font-size: 12px; color: var(--fg-muted); text-align: right; }
.health-row .count { font-family: var(--font-mono); font-size: 11px; color: var(--fg-faint); text-align: right; }
.bar {
  height: 6px; border-radius: 3px; background: var(--bg-sunken); overflow: hidden; display: flex;
}
.bar span { display: block; height: 100%; }
.bar .pass { background: var(--ok); }
.bar .fail { background: var(--fail); }
.bar .flaky { background: var(--warn); }
.bar .none { background: var(--fg-faint); opacity: .3; }

/* Sparkline */
.sparkline { width: 100%; height: 56px; display: block; }

/* Activity feed */
.activity-item {
  display: grid; grid-template-columns: 16px 1fr auto;
  gap: 10px; align-items: flex-start;
  padding: 9px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 12.5px;
}
.activity-item:last-child { border-bottom: 0; }
.activity-item .act-icon { margin-top: 2px; color: var(--fg-dim); }
.activity-item .act-time { font-family: var(--font-mono); font-size: 11px; color: var(--fg-faint); }
.activity-item .act-body strong { font-weight: 600; color: var(--fg); }
.activity-item .act-body .sub { color: var(--fg-muted); font-size: 11.5px; display: block; margin-top: 1px; }
.activity-item .act-body .mono { color: var(--fg-muted); font-size: 11.5px; }

/* Table */
.tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; }
.tbl th {
  text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--fg-faint); font-weight: 600;
  padding: 8px 12px; border-bottom: 1px solid var(--border);
  background: var(--bg-elev);
  position: sticky; top: 0;
}
.tbl td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--fg);
  vertical-align: middle;
}
.tbl tr { transition: background .08s ease; }
.tbl tr:hover td { background: var(--bg-hover); cursor: pointer; }
.tbl .id { font-family: var(--font-mono); color: var(--fg-muted); font-size: 12px; }

/* ==========================================================================
   Kanban
   ========================================================================== */
.kanban-toolbar {
  display: flex; flex-direction: column;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 62px; background: var(--bg); z-index: 3;
}
.kt-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 0;
}
.kt-row + .kt-row {
  border-top: 1px solid var(--border);
}
.kt-search {
  width: 160px; flex-shrink: 0;
  padding: 4px 10px; outline: none;
  background: var(--bg-elev);
}
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; border-radius: 999px;
  font-size: 11.5px; font-weight: 500;
  color: var(--fg-muted);
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  white-space: nowrap;
}
.chip:hover { border-color: var(--border-strong); color: var(--fg); }
.chip.active { background: var(--bg-elev-2); color: var(--fg); border-color: var(--border-strong); }
.chip .n { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-faint); }
.chip.active .n { color: var(--fg-muted); }

.kanban {
  display: flex; gap: 14px;
  padding: 16px 24px 24px;
  overflow-x: auto;
  min-height: calc(100vh - 48px - 62px - 56px);
  align-items: flex-start;
}
.kanban-col {
  /* Trust pass: 240px lets all 5 status columns fit on a 1440px laptop without horizontal scroll. */
  flex: 1 1 240px;
  min-width: 240px;
  max-width: 320px;
  display: flex; flex-direction: column;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: calc(100vh - 48px - 62px - 56px - 16px);
  overflow: hidden;
}
.kanban-col-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elev);
}
.kanban-col-head .title {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 600; color: var(--fg);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.kanban-col-body {
  padding: 8px; display: flex; flex-direction: column; gap: 7px;
  overflow-y: auto;
  flex: 1;
}

.tc-card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 11px;
  cursor: pointer;
  display: flex; flex-direction: column; gap: 6px;
  transition: border-color .12s ease, background .12s ease, box-shadow .12s ease;
}
.tc-card:hover {
  border-color: var(--border-strong);
  background: oklch(from var(--bg-elev) calc(l + 0.012) c h);
  box-shadow: var(--shadow-sm);
}
.tc-card .head { display: flex; align-items: center; gap: 6px; }
.tc-card .tc-id { font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); }
.tc-card h4 { margin: 0; font-size: 12.5px; font-weight: 500; line-height: 1.35; color: var(--fg); }
.tc-card .meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* Compact row */
.tc-row {
  display: grid; grid-template-columns: 70px 1fr auto auto;
  gap: 10px; align-items: center;
  padding: 7px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg-elev);
  font-size: 12.5px;
  cursor: pointer;
}
.tc-row:hover { border-color: var(--border-strong); }
.tc-row .tc-id { font-family: var(--font-mono); font-size: 11px; color: var(--fg-muted); }

/* ==========================================================================
   QA split-panel (PMAgent-style: left plan list + right document)
   ========================================================================== */
.qa-master {
  display: flex;
  height: calc(100vh - 48px - 62px - 56px);
  border-top: 1px solid var(--border);
}
.qa-list {
  width: 300px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  background: var(--bg-sunken);
}
.qa-coverage-bar { padding: 12px 14px; border-bottom: 1px solid var(--border); }
.qa-coverage-label {
  font-size: 10px; color: var(--fg-faint);
  text-transform: uppercase; letter-spacing: 0.1em;
  font-family: var(--font-mono); margin-bottom: 6px;
}
.qa-bar-track { height: 4px; border-radius: 3px; background: var(--bg-elev-2); overflow: hidden; }
.qa-bar-fill { height: 100%; border-radius: 3px; transition: width .2s ease; }
.qa-coverage-summary { font-size: 10px; color: var(--fg-faint); font-family: var(--font-mono); margin-top: 6px; }
.qa-section-label {
  font-size: 10px; color: var(--fg-faint);
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 10px 14px 4px;
  display: flex; align-items: center;
}
.qa-plan-item {
  padding: 7px 14px; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  border-left: 2px solid transparent;
}
.qa-plan-item:hover { background: var(--bg-elev); }
.qa-plan-item.active { background: var(--bg-elev); border-left-color: var(--accent); }
.qa-plan-dot { display: inline-flex; flex-shrink: 0; }
.qa-plan-id { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-faint); flex-shrink: 0; }
.qa-plan-label {
  font-size: 12.5px; color: var(--fg);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.qa-detail { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.qa-detail-empty { align-items: center; justify-content: center; }
.qa-detail-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
}
.qa-detail-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.qa-detail-body { padding: 18px 20px; overflow-y: auto; flex: 1; }
.qa-meta-grid {
  display: flex; flex-wrap: wrap; gap: 8px 22px;
  padding-bottom: 16px; margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.qa-meta { display: flex; flex-direction: column; gap: 2px; }
.qa-meta .k {
  font-size: 9.5px; color: var(--fg-faint);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.qa-meta span:last-child { font-size: 12.5px; color: var(--fg); }
.md-doc { font-size: 13px; line-height: 1.65; color: var(--fg-muted); }
.md-doc h1, .md-doc h2, .md-doc h3 { color: var(--fg); margin: 18px 0 8px; }
.md-doc h1 { font-size: 17px; } .md-doc h2 { font-size: 14px; } .md-doc h3 { font-size: 12.5px; }
.md-doc code { font-family: var(--font-mono); font-size: 11.5px; background: var(--bg-elev); padding: 1px 5px; border-radius: 4px; }
.md-doc table { border-collapse: collapse; font-size: 12px; margin: 10px 0; }
.md-doc th, .md-doc td { border: 1px solid var(--border); padding: 5px 9px; text-align: left; }
.md-doc th { background: var(--bg-elev); }
.md-doc ul, .md-doc ol { padding-left: 20px; }

/* Automation Planner (E-028) */
.ap-chip { font-size: 10px; padding: 1px 7px; border: 1px solid var(--border); border-radius: 10px; }
.ap-chip b { font-family: var(--font-mono); }
.ap-row { display: flex; align-items: center; gap: 8px; padding: 7px 14px; border-bottom: 1px solid var(--bg-elev); }
.ap-row:hover { background: var(--bg-elev); }
.ap-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ap-row-title { font-size: 12.5px; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-row-meta { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--fg-faint); margin-top: 2px; }
.ap-select { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; padding: 3px 5px; cursor: pointer; }
.ap-flow { border: 1px solid var(--border); border-radius: 8px; padding: 11px 13px; cursor: pointer; }
.ap-flow:hover { border-color: var(--border-strong); }
.ap-flow.active { border-color: var(--accent); background: var(--bg-elev); }
.ap-flow-head { display: flex; align-items: center; gap: 8px; }
.ap-flow-id { font-size: 11px; color: var(--fg-faint); }
.ap-flow-name { font-size: 13.5px; font-weight: 600; flex: 1; }
.ap-flow-status { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 9px; border: 1px solid var(--border); color: var(--fg-faint); }
.ap-flow-status[data-st="passing"] { color: #45E0A8; border-color: #45E0A8; }
.ap-flow-status[data-st="written"] { color: #3B82F6; border-color: #3B82F6; }
.ap-flow-status[data-st="scaffolded"] { color: #F5A623; border-color: #F5A623; }
.ap-flow-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 7px; }
.ap-flow-rat { font-size: 11.5px; color: var(--fg-muted); margin-top: 7px; line-height: 1.5; }
.ap-tc { font-size: 9.5px; color: var(--fg-faint); background: var(--bg-elev); padding: 1px 5px; border-radius: 4px; }
.ap-blocker { font-size: 11px; color: #F5A623; margin-top: 8px; }
.ap-legend { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; display: flex; flex-direction: column; gap: 7px; }
.ap-legend-row { display: flex; gap: 8px; font-size: 11px; }
.ap-legend-key { color: var(--fg); font-weight: 600; min-width: 110px; }
.ap-legend-meta { color: var(--fg-muted); }
.ap-legend-meta code { font-family: var(--font-mono); font-size: 10px; color: var(--accent); }
.ap-draft { margin-top: 8px; font-size: 11px; }
.ap-draft summary { cursor: pointer; color: var(--fg-muted); }
.ap-yaml { background: var(--bg-sunken); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-family: var(--font-mono); font-size: 10.5px; line-height: 1.5; overflow-x: auto; max-height: 320px; white-space: pre; margin-top: 6px; }

/* ==========================================================================
   Device matrix
   ========================================================================== */
.matrix {
  width: 100%; border-collapse: separate; border-spacing: 0;
  font-size: 12.5px;
}
.matrix th, .matrix td { padding: 7px 10px; border-bottom: 1px solid var(--border); text-align: center; }
.matrix th:first-child, .matrix td:first-child { text-align: left; }
.matrix th { background: var(--bg-elev); position: sticky; top: 0; z-index: 1; font-weight: 600; font-size: 11px; color: var(--fg-muted); }
.matrix tbody tr:hover td { background: var(--bg-hover); }
.matrix .cell-dot { display: inline-block; width: 16px; height: 16px; border-radius: 4px; }
.matrix .cell-dot.pass { background: var(--ok-bg); box-shadow: inset 0 0 0 1.5px var(--ok); }
.matrix .cell-dot.fail { background: var(--fail-bg); box-shadow: inset 0 0 0 1.5px var(--fail); }
.matrix .cell-dot.flaky { background: var(--warn-bg); box-shadow: inset 0 0 0 1.5px var(--warn); }
.matrix .cell-dot.none { background: transparent; box-shadow: inset 0 0 0 1px var(--border); }

/* ==========================================================================
   Right panel (detail) + chat drawer
   ========================================================================== */
.drawer-backdrop {
  position: fixed; inset: 0; background: oklch(0 0 0 / 0.35);
  backdrop-filter: blur(2px);
  z-index: 40; animation: fade .15s ease;
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes slidein { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.drawer {
  position: fixed; right: 0; top: 0; bottom: 0;
  width: min(560px, 100vw);
  background: var(--bg);
  border-left: 1px solid var(--border);
  z-index: 41;
  display: flex; flex-direction: column;
  animation: slidein .2s ease;
  box-shadow: var(--shadow-pop);
}
.drawer-head {
  padding: 12px 18px;
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid var(--border);
}
.drawer-head .dr-id { font-family: var(--font-mono); color: var(--fg-muted); font-size: 12px; }
.drawer-head h2 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
.drawer-body { padding: 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px; }
.drawer-body .sec-title {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-faint);
  margin-bottom: 8px;
}
.drawer-body .pair {
  display: grid; grid-template-columns: 100px 1fr; gap: 10px;
  padding: 6px 0; font-size: 12.5px;
  border-bottom: 1px dashed var(--border);
}
.drawer-body .pair:last-child { border-bottom: 0; }
.drawer-body .pair .k { color: var(--fg-faint); }

.yaml-block {
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--fg-muted);
  white-space: pre;
  overflow-x: auto;
}
.yaml-block .k { color: var(--accent); }
.yaml-block .s { color: var(--ok); }
.yaml-block .c { color: var(--fg-faint); font-style: italic; }

/* Chat */
.chat-drawer {
  position: fixed; right: 12px; bottom: 12px;
  width: 400px; height: 560px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex; flex-direction: column;
  z-index: 50;
  box-shadow: var(--shadow-pop);
  overflow: hidden;
  animation: slidein .2s ease;
}
.chat-drawer .chat-head {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px;
}
.chat-drawer .chat-body {
  flex: 1; overflow-y: auto;
  padding: 14px; display: flex; flex-direction: column; gap: 12px;
  background: var(--bg);
}
.chat-msg { display: flex; gap: 9px; font-size: 12.5px; line-height: 1.5; }
.chat-msg.user { flex-direction: row-reverse; }
.chat-msg .bubble {
  padding: 8px 11px; border-radius: 10px;
  max-width: 80%;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}
.chat-msg.user .bubble { background: var(--accent-soft); border-color: transparent; }
.chat-msg .bubble p { margin: 0; }
.chat-msg .bubble code {
  background: var(--bg-sunken); padding: 1px 5px; border-radius: 4px;
  font-size: 11px;
}
.chat-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--accent); color: var(--accent-contrast);
  font-size: 11px; font-weight: 600;
  flex-shrink: 0;
}
.chat-msg.user .chat-avatar { background: var(--bg-elev-2); color: var(--fg-muted); border: 1px solid var(--border); }

.chat-composer {
  padding: 10px; border-top: 1px solid var(--border);
  background: var(--bg-elev);
}
.chat-composer textarea {
  width: 100%;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px; font-size: 12.5px; resize: none;
  min-height: 60px;
  outline: none;
}
.chat-composer textarea:focus { border-color: var(--accent); }
.chat-composer .row { margin-top: 8px; justify-content: space-between; }
.chips-row { display: flex; gap: 4px; padding: 0 10px 8px; flex-wrap: wrap; }
.chips-row .chip { font-size: 11px; padding: 3px 7px; }

/* Command palette */
.cmd-backdrop {
  position: fixed; inset: 0; background: oklch(0 0 0 / 0.3);
  backdrop-filter: blur(3px);
  z-index: 60; display: grid; place-items: flex-start center; padding-top: 120px;
}
.cmd {
  width: min(560px, 94vw);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.cmd input {
  border: 0; outline: 0;
  padding: 14px 16px; font-size: 14px;
  background: transparent; color: var(--fg);
  border-bottom: 1px solid var(--border);
}
.cmd-list { max-height: 320px; overflow-y: auto; padding: 6px; }
.cmd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 7px; font-size: 13px;
  color: var(--fg-muted);
  cursor: pointer;
}
.cmd-item.active, .cmd-item:hover { background: var(--bg-hover); color: var(--fg); }
.cmd-item .kbd { margin-left: auto; }

/* Tweaks panel */
.tweaks-panel {
  position: fixed; right: 16px; bottom: 16px;
  width: 280px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  z-index: 55;
  overflow: hidden;
  animation: slidein .2s ease;
}
.tweaks-panel .tw-head {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 600; font-size: 12px;
}
.tweaks-panel .tw-body { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
.tw-row { display: flex; flex-direction: column; gap: 6px; }
.tw-row .lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-faint); font-weight: 600; }
.tw-seg {
  display: flex; background: var(--bg); border: 1px solid var(--border); border-radius: 7px;
  padding: 2px;
}
.tw-seg button {
  flex: 1; padding: 4px 8px; border-radius: 5px;
  font-size: 11.5px; color: var(--fg-muted);
}
.tw-seg button.active { background: var(--bg-elev-2); color: var(--fg); }

.swatch {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
  display: inline-block;
}
.swatch.active { border-color: var(--fg); }

/* Scrollbars */
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb {
  background: oklch(from var(--border-strong) l c h / 0.7);
  border-radius: 99px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: var(--border-strong);
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-corner { background: transparent; }

/* Small screens */
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .hero-stats { grid-template-columns: repeat(2, 1fr); }
  .hero-stats .cell { border-bottom: 1px solid var(--border); }
}

/* === Settings === */
/* ==========================================================================
   Settings view
   ========================================================================== */
.st-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  height: calc(100vh - 112px);
  margin: -8px 0 -24px;
  border-top: 1px solid var(--border);
}
.st-rail {
  border-right: 1px solid var(--border);
  padding: 18px 14px;
  display: flex; flex-direction: column; gap: 12px;
  background: var(--bg);
  position: sticky; top: 0;
  overflow-y: auto;
}
.st-scope {
  display: grid; grid-template-columns: 1fr 1fr;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
}
.st-scope-b {
  appearance: none; background: transparent; border: 0; color: var(--fg-muted);
  font: inherit; font-size: 12px; font-weight: 500;
  padding: 6px 8px; border-radius: 6px; cursor: pointer;
}
.st-scope-b.on { background: var(--bg-elev-2); color: var(--fg); box-shadow: var(--shadow-sm); }

.st-rail-nav {
  display: flex; flex-direction: column; gap: 1px;
  margin-top: 4px;
}
.st-rail-item {
  appearance: none; background: transparent; border: 0; color: var(--fg-muted);
  font: inherit; font-size: 12.5px;
  display: flex; align-items: center; gap: 9px;
  padding: 7px 9px; border-radius: 6px; cursor: pointer;
  text-align: left;
}
.st-rail-item:hover { background: var(--bg-elev); color: var(--fg); }
.st-rail-item.active {
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  color: var(--fg);
  box-shadow: inset 2px 0 0 var(--accent);
}
.st-rail-item > span:first-of-type { flex: 1; }
.st-rail-item .count {
  font-family: var(--font-mono); font-size: 10.5px;
  color: var(--fg-faint);
  background: var(--bg-sunken); padding: 1px 6px; border-radius: 4px;
}

.st-rail-foot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  display: flex; flex-direction: column; gap: 3px;
}

.st-body {
  overflow-y: auto;
  padding: 24px 32px 120px;
  background: var(--bg-sunken);
}
.st-content {
  max-width: 920px;
  margin: 0 auto;
  display: flex; flex-direction: column; gap: 18px;
}

.st-card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 22px;
}
.st-card.danger {
  border-color: color-mix(in oklab, var(--fail) 45%, var(--border));
  background: color-mix(in oklab, var(--fail) 4%, var(--bg-elev));
}
.st-card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.st-card-title {
  font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin: 0;
}
.st-card-desc {
  font-size: 12.5px; color: var(--fg-muted);
  margin: 4px 0 0; max-width: 62ch; line-height: 1.5;
}
.st-card-body { display: flex; flex-direction: column; gap: 14px; }

.st-divider {
  height: 1px; background: var(--border);
  margin: 18px 0 14px;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 11.5px; font-weight: 500; color: var(--fg-muted);
  letter-spacing: 0.01em;
}
.field-hint { font-size: 11px; color: var(--fg-faint); }
.inp {
  appearance: none;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  color: var(--fg);
  font: inherit; font-size: 12.5px;
  padding: 7px 10px; border-radius: 6px;
  outline: none;
  transition: border-color 120ms;
}
.inp:focus { border-color: var(--accent); }
.inp.mono { font-family: var(--font-mono); font-size: 12px; }
.inp.sm { padding: 4px 7px; font-size: 12px; }
textarea.inp { font-family: inherit; resize: vertical; line-height: 1.5; }
select.inp { padding-right: 24px; }

/* Toggle */
.toggle {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0;
}
.toggle-copy { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.toggle-label { font-size: 12.5px; font-weight: 500; }
.toggle-hint { font-size: 11px; color: var(--fg-muted); }
.toggle-switch {
  position: relative; width: 34px; height: 20px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition: background 160ms;
  flex-shrink: 0;
}
.toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--fg-muted);
  transition: transform 160ms, background 160ms;
}
.toggle-switch.on { background: var(--accent); border-color: var(--accent); }
.toggle-switch.on .toggle-knob { transform: translateX(14px); background: var(--accent-contrast); }

/* Segmented */
.seg {
  display: inline-flex;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 3px;
  gap: 3px;
}
.seg-b {
  appearance: none; background: transparent; border: 0; color: var(--fg-muted);
  font: inherit; font-size: 12px; font-weight: 500;
  padding: 5px 10px; border-radius: 5px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  text-transform: capitalize;
}
.seg-b.on { background: var(--bg-elev-2); color: var(--fg); box-shadow: var(--shadow-sm); }

/* Profile */
.st-profile { display: flex; gap: 20px; align-items: flex-start; }
.st-avatar-lg {
  position: relative;
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 40%, var(--bg)));
  display: grid; place-items: center;
  color: var(--accent-contrast);
  font-family: var(--font-mono); font-weight: 700; font-size: 22px;
  flex-shrink: 0;
}
.st-avatar-edit {
  position: absolute; bottom: -4px; right: -4px;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--bg-elev); border: 1px solid var(--border);
  color: var(--fg); display: grid; place-items: center;
  cursor: pointer;
}

/* Envs */
.st-envs { display: flex; flex-direction: column; gap: 6px; }
.st-env {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center; gap: 12px;
  padding: 10px 12px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.env-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--fg-muted);
  flex-shrink: 0;
}
.env-dot.ok { background: var(--ok); box-shadow: 0 0 8px color-mix(in oklab, var(--ok) 60%, transparent); }
.env-dot.warn { background: var(--warn); }
.env-dot.info { background: var(--info); }
.env-dot.fail { background: var(--fail); }
.st-env-name { font-size: 12.5px; font-weight: 600; }
.st-env-url { font-size: 11.5px; color: var(--fg-muted); margin-top: 2px; }
.st-add { align-self: flex-start; margin-top: 4px; }

/* Table */
.st-table { width: 100%; border-collapse: collapse; }
.st-table th {
  text-align: left;
  font-size: 11px; font-weight: 500;
  color: var(--fg-faint);
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 0 8px 8px; border-bottom: 1px solid var(--border);
}
.st-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  vertical-align: middle;
}
.st-table tr:last-child td { border-bottom: 0; }

.st-invites { display: flex; flex-direction: column; gap: 6px; }
.st-invite {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border: 1px dashed var(--border); border-radius: 7px;
  background: var(--bg-sunken);
}

/* Integrations */
.st-integ-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
}
.st-integ {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center; gap: 12px;
  padding: 12px; border-radius: 10px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  transition: border-color 120ms;
}
.st-integ.connected { border-color: color-mix(in oklab, var(--ok) 30%, var(--border)); }
.st-integ:hover { border-color: var(--border-strong); }
.st-logo {
  width: 36px; height: 36px; border-radius: 8px;
  display: grid; place-items: center;
  color: white;
  font-family: var(--font-mono); font-weight: 700; font-size: 14px;
  flex-shrink: 0;
}
.st-logo-sm {
  width: 16px; height: 16px; border-radius: 4px;
  display: grid; place-items: center;
  color: white; font-size: 9px; font-family: var(--font-mono); font-weight: 700;
}
.st-integ-action { flex-shrink: 0; }

.st-mapping { display: flex; flex-direction: column; gap: 8px; }
.st-map-row {
  display: grid;
  grid-template-columns: 140px 14px 140px 1fr;
  align-items: center; gap: 10px;
  padding: 8px 10px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 12px;
}
.st-map-col { font-weight: 500; color: var(--fg-muted); }
.st-map-chips { display: flex; gap: 4px; flex-wrap: wrap; }

/* MCP */
.st-mcp {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  align-items: flex-start;
}
.st-mcp-list { display: flex; flex-direction: column; gap: 6px; }
.st-mcp-item {
  padding: 10px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 120ms;
}
.st-mcp-item:hover { border-color: var(--border-strong); }
.st-mcp-item.active {
  border-color: var(--accent);
  background: color-mix(in oklab, var(--accent) 8%, var(--bg-sunken));
}
.st-mcp-item.error { border-color: color-mix(in oklab, var(--fail) 40%, var(--border)); }
.st-mcp-cmd {
  font-size: 11px; color: var(--fg-faint);
  margin-top: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.st-mcp-detail {
  padding: 14px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.st-mcp-config {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px; padding: 10px 12px;
  font-size: 11.5px; line-height: 1.7;
}
.st-mcp-line { white-space: pre; }
.tk-key { color: var(--accent); }
.tk-str { color: var(--ok); }
.tk-num { color: var(--warn); }

.st-mcp-tools {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;
}
.st-mcp-tool {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  align-items: center; gap: 8px;
  padding: 5px 8px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px;
}
.st-mcp-tool .toggle { padding: 0; }
.st-mcp-tool .toggle-switch { width: 26px; height: 15px; }
.st-mcp-tool .toggle-knob { width: 10px; height: 10px; }
.st-mcp-tool .toggle-switch.on .toggle-knob { transform: translateX(11px); }

/* Devices */
.st-devices {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
}
.st-device {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.st-device-icon {
  width: 40px; height: 40px; border-radius: 8px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  display: grid; place-items: center;
  color: var(--fg-muted);
  flex-shrink: 0;
}

/* Env vars */
.st-env-vars { display: flex; flex-direction: column; gap: 4px; }
.st-env-var {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 10px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
}

/* Slider */
.st-slider {
  appearance: none;
  width: 100%; height: 4px;
  background: var(--bg-sunken); border-radius: 2px;
  outline: none;
}
.st-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-elev);
}
.st-slider::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-elev);
}

/* Notifications matrix */
.st-notif {
  border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
  background: var(--bg-sunken);
}
.st-notif-head, .st-notif-row {
  display: grid;
  grid-template-columns: 1fr 110px 110px 110px;
  align-items: center; gap: 12px;
  padding: 10px 14px;
}
.st-notif-head {
  background: var(--bg-elev-2);
  border-bottom: 1px solid var(--border);
  font-size: 11px; color: var(--fg-muted); font-weight: 500;
}
.st-notif-row {
  border-bottom: 1px solid var(--border);
}
.st-notif-row:last-child { border-bottom: 0; }
.st-cell { display: grid; place-items: center; }
.st-check {
  width: 18px; height: 18px; border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg);
  display: grid; place-items: center;
  cursor: pointer;
  color: transparent;
}
.st-check.on {
  background: var(--accent); border-color: var(--accent);
  color: var(--accent-contrast);
}
.st-check svg { width: 11px; height: 11px; }

/* Appearance swatches */
.st-swatch {
  width: 32px; height: 32px; border-radius: 8px;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: transform 120ms, border-color 120ms;
}
.st-swatch:hover { transform: scale(1.08); }
.st-swatch.on { border-color: var(--fg); box-shadow: 0 0 0 2px var(--bg-elev), 0 0 0 4px var(--fg); }

/* Webhooks */
.st-webhooks { display: flex; flex-direction: column; gap: 6px; }
.st-webhook {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 7px;
}

/* Plan */
.st-plan {
  display: grid; grid-template-columns: 1fr 1.2fr; gap: 24px;
  align-items: center;
  padding: 16px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.st-plan-meter { display: flex; flex-direction: column; gap: 4px; }

/* Danger */
.st-danger-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border);
}
.st-danger-row:last-child { border-bottom: 0; }
.btn.danger {
  color: var(--fail);
  border-color: color-mix(in oklab, var(--fail) 40%, var(--border));
}
.btn.danger:hover {
  background: color-mix(in oklab, var(--fail) 12%, transparent);
}
.btn.danger-solid {
  background: var(--fail); color: white; border-color: var(--fail);
}

@media (max-width: 900px) {
  .st-shell { grid-template-columns: 1fr; }
  .st-rail { display: none; }
  .st-integ-grid, .st-devices, .st-mcp { grid-template-columns: 1fr; }
  .st-mcp-tools { grid-template-columns: 1fr; }
  .st-plan { grid-template-columns: 1fr; }
}


/* ====== ⌘K Search Modal ====== */
.srch-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 80px;
}
.srch-modal {
  width: 560px; max-width: calc(100vw - 32px);
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: var(--shadow-pop);
  overflow: hidden; display: flex; flex-direction: column;
}
.srch-input-row {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid var(--border);
}
.srch-input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 14px; color: var(--fg); font-family: var(--font-sans);
}
.srch-input::placeholder { color: var(--fg-faint); }
.srch-results { max-height: 400px; overflow-y: auto; padding: 6px 0; }
.srch-group-label {
  padding: 8px 14px 4px; font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-faint);
}
.srch-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; cursor: pointer; transition: background 0.1s;
}
.srch-item:hover, .srch-item.active { background: var(--bg-hover); }
.srch-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.srch-label { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.srch-sub { font-size: 11px; color: var(--fg-faint); margin-top: 1px; font-family: var(--font-mono); }
.srch-type {
  font-size: 10px; padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
  background: var(--bg-elev); border: 1px solid var(--border);
  color: var(--fg-muted); font-weight: 500; letter-spacing: 0.04em;
}
.srch-empty {
  padding: 24px 16px; text-align: center; color: var(--fg-muted); font-size: 13px;
}
.srch-hint {
  padding: 28px 16px; text-align: center; color: var(--fg-muted);
  font-size: 12.5px; display: flex; flex-direction: column; align-items: center;
}

/* ====== Maestro Run Log ====== */
.run-log-block {
  border: 1px solid var(--border); border-radius: 8px;
  overflow: hidden; margin-bottom: 14px;
}
.run-log-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}
.run-log-pre {
  margin: 0; padding: 10px 12px; max-height: 220px; overflow-y: auto;
  font-family: var(--font-mono); font-size: 11px; line-height: 1.6;
  color: var(--fg-muted); background: var(--bg-elev);
  white-space: pre-wrap; word-break: break-all;
}

/* ====== E-027: AppMap Narrative Prose ====== */
.narrative-prose p { margin: 0 0 12px 0; }
.narrative-prose p:last-child { margin-bottom: 0; }
.narrative-prose strong { color: var(--fg); font-weight: 600; }
.narrative-prose em { color: var(--fg); font-style: italic; }
.narrative-prose code,
.narrative-prose .mono {
  font-family: var(--font-mono);
  font-size: 0.92em;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--fg);
  white-space: nowrap;
}
.narrative-prose ul {
  margin: 0; padding: 0; list-style: none;
}
.narrative-prose ol { margin: 4px 0 12px 0; padding-left: 22px; }
.narrative-prose ul li {
  position: relative;
  padding: 8px 0 8px 18px;
  border-bottom: 1px solid var(--border);
  line-height: 1.6;
}
.narrative-prose ul li:last-child { border-bottom: none; }
.narrative-prose ul li:before {
  content: ""; position: absolute; left: 0; top: 16px;
  width: 6px; height: 1px; background: var(--fg-faint);
}
.narrative-prose ul li strong:first-child {
  display: inline; color: var(--fg); margin-right: 2px;
}
.narrative-prose ol li { margin: 3px 0; line-height: 1.6; }
.narrative-prose a { color: var(--accent); text-decoration: none; border-bottom: 1px dotted currentColor; }
.narrative-prose a:hover { color: var(--fg); }
/* Section accents — theme-aware tints. The 2px left bar in JSX already uses
   --accent / --warn / --ok directly; these tokens drive label colors + hover bg. */
.appmap-section-violet-label { color: var(--accent); }
.appmap-section-amber-label { color: var(--warn); }
.appmap-section-green-label { color: var(--ok); }

/* ====== Excel Import Upload Zone ====== */
.st-upload-zone {
  border: 1.5px dashed var(--border);
  border-radius: 10px;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  font-size: 13px;
  color: var(--fg-muted);
  background: var(--bg-elev);
  transition: border-color 0.15s, background 0.15s;
  cursor: default;
}
.st-upload-zone svg {
  width: 28px; height: 28px;
  color: var(--fg-faint);
  margin-bottom: 2px;
}
.st-upload-zone .link {
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
}
.st-upload-zone.drag-over {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-elev));
}
.st-upload-status {
  margin-top: 6px;
  font-size: 12px;
}

/* ====== Kanban category swimlane labels ====== */
.kanban-cat-section {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.kanban-cat-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -8px -8px 0;
  padding: 10px 12px 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg-muted);
  position: sticky;
  top: -8px;
  background: var(--bg-sunken);
  z-index: 1;
}
.kanban-cat-section + .kanban-cat-section .kanban-cat-label {
  margin-top: 0;
}
.kanban-cat-count {
  font-size: 10px;
  font-weight: 500;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 6px;
  color: var(--fg-muted);
}
.kanban-cat-div {
  height: 1px;
  background: var(--border);
  margin: 6px 0 8px;
  opacity: 0.5;
}

/* ====== Live indicator & spin ====== */
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
.live-pill {
  gap: 6px;
  color: var(--ok);
  border-color: color-mix(in srgb, var(--ok) 30%, transparent);
}
.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ok);
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}

/* ==========================================================================
   Production polish — selection, focus, segmented chip groups, empty states.
   Kept last on purpose: the :focus-visible reset must win source order against
   per-component "outline: none" rules of equal specificity.
   ========================================================================== */
::selection { background: oklch(from var(--accent) l c h / 0.35); }

:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid oklch(from var(--accent) l c h / 0.8);
  outline-offset: 1px;
}

/* Segmented chip group — visually bind related chips (e.g. Ready / Needs
   review / All scope) so they don't read as part of the adjacent filter row. */
.chip-group {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px;
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: 999px;
}
.chip-group .chip { border-color: transparent; }
.chip-group .chip:hover { border-color: transparent; background: var(--bg-hover); }
.chip-group .chip.active { background: var(--bg-elev-2); border-color: var(--border-strong); }

/* Empty state — shared look for "nothing here yet" slots (kanban columns,
   run stream, matrices). Quietly informative, never a bare void. */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
  padding: 22px 14px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--fg-dim);
  font-size: 12px;
  text-align: center;
  line-height: 1.5;
}
.empty-state .es-hint { color: var(--fg-faint); font-size: 11.5px; }

/* Drawer + board detail heads: id/status/actions on row 1, full title wraps on its
   own row — inline nowrap-ellipsis squeezed long titles to "Sa…" next to the Run buttons. */
.drawer-head, .qa-detail-head { flex-wrap: wrap; row-gap: 4px; }
.drawer-head h2, .qa-detail-head h2 {
  flex-basis: 100%; order: 10;
  white-space: normal; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* ⌘K modal entrance */
@keyframes pop-in { from { opacity: 0; transform: scale(0.985) translateY(-4px); } to { opacity: 1; transform: none; } }
.srch-modal { animation: pop-in 140ms cubic-bezier(0.2, 0.9, 0.3, 1); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

  `;
}

function generateJS(): string {
  return `
// ===== new_data.jsx =====
// data.jsx — real API data loader (replaces mock data)

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days === 1) return 'yesterday';
  if (days < 30) return days + 'd ago';
  return new Date(iso).toLocaleDateString();
}

function seeded(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function generateRunHistory(currentRate, total) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const variance = (seeded(i + 99) - 0.5) * 18;
    const rate = Math.max(0, Math.min(100, Math.round(currentRate + variance)));
    const pass = Math.round(total * rate / 100);
    const fail = Math.floor((total - pass) * 0.6);
    const flaky = Math.max(0, total - pass - fail);
    return {
      date: d,
      label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      total, pass, fail, flaky, rate,
    };
  });
}

function getFlowStatus(qaPlanId, testCases) {
  if (!qaPlanId) return 'not-run';
  const tc = testCases.find(t => t.id === qaPlanId);
  return tc ? tc.status : 'not-run';
}

async function loadMorbiusData() {
  const [testsRes, bugsRes, dashRes, maestroRes, projectsRes, planRes, plansRes] = await Promise.all([
    fetch('/api/tests'),
    fetch('/api/bugs'),
    fetch('/api/dashboard'),
    fetch('/api/maestro-tests'),
    fetch('/api/projects'),
    fetch('/api/automation-plan'),
    fetch('/api/plans'),
  ]);

  const testsRaw    = testsRes.ok    ? await testsRes.json()    : [];
  const bugsRaw     = bugsRes.ok     ? await bugsRes.json()     : [];
  const dash        = dashRes.ok     ? await dashRes.json()     : {};
  const maestroRaw  = maestroRes.ok  ? await maestroRes.json()  : {};
  const projData    = projectsRes.ok ? await projectsRes.json() : {};
  const planData    = planRes.ok     ? await planRes.json()     : {};
  const PLANS       = plansRes.ok    ? await plansRes.json()     : { items: [], releases: [] };

  // Phase 2: which cards can't run yet. Flow blockers carry the human reason (e.g. "Firebase
  // allowedGroups: add test group ID"); candidate.decision==='blocked' marks the card. testId → reason.
  const blockedMap = {};
  (planData.flows || []).forEach(f => {
    const reason = (f.blockers || []).join('; ');
    if (reason) (f.testIds || []).forEach(tid => { if (!blockedMap[tid]) blockedMap[tid] = reason; });
  });
  (planData.candidates || []).forEach(c => {
    if (c.decision !== 'blocked' || blockedMap[c.testId]) return;
    let reason = c.reason || '';
    if (!reason && c.flowId) {
      const f = (planData.flows || []).find(x => x.id === c.flowId);
      if (f && (f.blockers || []).length) reason = f.blockers.join('; ');
    }
    blockedMap[c.testId] = reason || 'Blocked in automation plan';
  });

  // Phase 3: which cards actually have a runnable flow — a direct link or a written automation-plan
  // flow (one with on-disk YAML). Used for honest per-card automation coverage.
  const writtenFlowIds = new Set(Object.keys(planData.flowFiles || {}));
  const automatedSet = new Set();
  (planData.flows || []).forEach(f => {
    if (writtenFlowIds.has(f.id) || f.status === 'written' || f.status === 'passing') {
      (f.testIds || []).forEach(tid => automatedSet.add(tid));
    }
  });

  // ── Test Cases ──────────────────────────────────────────────
  const TEST_CASES = (testsRaw || []).map(t => ({
    id: t.id,
    // Imported titles all carry a "— Test Plan" suffix: zero information, repeated
    // 203× in every table/list/card. Strip at the projection so every surface benefits;
    // the markdown on disk is untouched.
    title: (t.title || '').replace(/\\s*—\\s*Test Plan\\s*$/i, ''),
    cat: t.category || '',
    type: t.scenario || 'Flow',
    status: t.status || 'not-run',
    priority: t.priority || 'P3',
    yaml: !!(t.maestroFlowAndroid || t.maestroFlowIos || t.maestroFlow),
    devices: Object.fromEntries(
      (t.deviceResults || []).map(dr => [dr.device, dr.status || 'not-run'])
    ),
    lastRun: timeAgo(t.updated || t.created),
    owner: t.owner || 'SD',
    blocked: !!blockedMap[t.id],
    blockedReason: blockedMap[t.id] || '',
    automated: !!(t.maestroFlowAndroid || t.maestroFlowIos || t.maestroFlow) || automatedSet.has(t.id),
    story: (t.pmagentSource && t.pmagentSource.storyId) ? String(t.pmagentSource.storyId).toUpperCase() : '',
  }));

  // ── Bugs ────────────────────────────────────────────────────
  const BUGS = (bugsRaw || []).map(b => ({
    id: b.id,
    jira: b.jiraKey || null,
    title: b.title || '',
    status: b.status || 'open',
    priority: b.priority || 'P3',
    linkedTest: b.linkedTest || null,
    device: b.device || 'Unknown',
    assignee: b.assignee || 'SD',
    created: timeAgo(b.created),
    failureReason: b.failureReason || '',
  }));

  // ── Categories (from dashboard aggregation) ─────────────────
  const CATEGORIES = (dash.categories || []).map(c => ({
    slug: c.category ? c.category.id : (c.id || ''),
    name: c.category ? c.category.name : (c.name || ''),
    prefix: String(c.category ? (c.category.order || 0) : (c.order || 0)),
  })).filter(c => c.slug);

  // ── Maestro Flows ────────────────────────────────────────────
  // Flatten categories → flows, dedup android+ios into single entry
  const flowMap = new Map();
  for (const cat of (maestroRaw.categories || [])) {
    for (const f of (cat.flows || [])) {
      const base = f.fileName ? f.fileName.replace(/\\.yaml$/, '') : f.name;
      const cleanName = (f.name || base).replace(/\\s*\\((?:Android|iOS|android|ios)\\)\\s*$/, '');
      if (!flowMap.has(base)) {
        flowMap.set(base, {
          id: base,
          name: cleanName || base,
          tcs: f.qaPlanId ? [f.qaPlanId] : [],
          steps: f.stepsCount || 0,
          status: getFlowStatus(f.qaPlanId, TEST_CASES),
          android: f.platform === 'android',
          ios: f.platform === 'ios',
          androidFilePath: f.platform === 'android' ? (f.filePath || '') : '',
          iosFilePath: f.platform === 'ios' ? (f.filePath || '') : '',
          androidYaml: f.platform === 'android' ? (f.rawYaml || '') : '',
          iosYaml: f.platform === 'ios' ? (f.rawYaml || '') : '',
        });
      } else {
        const ex = flowMap.get(base);
        if (f.platform === 'android') {
          ex.android = true;
          if (f.filePath) ex.androidFilePath = f.filePath;
          if (f.rawYaml && !ex.androidYaml) ex.androidYaml = f.rawYaml;
        }
        if (f.platform === 'ios') {
          ex.ios = true;
          if (f.filePath) ex.iosFilePath = f.filePath;
          if (f.rawYaml && !ex.iosYaml) ex.iosYaml = f.rawYaml;
        }
        if (f.qaPlanId && !ex.tcs.includes(f.qaPlanId)) ex.tcs.push(f.qaPlanId);
        if (f.stepsCount && !ex.steps) ex.steps = f.stepsCount;
      }
    }
  }
  const MAESTRO_FLOWS = [...flowMap.values()];

  // ── Run History ──────────────────────────────────────────────
  // Only synthesize a sparkline-friendly RUN_HISTORY if real runs exist.
  // When the project has zero runs, expose an empty array so the dashboard
  // shows an honest "no run history yet" empty state instead of a wavy
  // placeholder that erodes trust (per E-027 trust pass).
  const overallRate = dash.overallHealth ? dash.overallHealth.percentage : 75;
  const hasRealRuns = (dash.runCount || 0) > 0;
  const RUN_HISTORY = hasRealRuns ? generateRunHistory(overallRate, TEST_CASES.length || 50) : [];

  // ── Activity ─────────────────────────────────────────────────
  const iconMap = {
    bug_opened: 'bug', test_failed: 'fail', test_flaky: 'warn',
    run_completed: 'run', status_changed: 'edit',
  };
  const ACTIVITY = (dash.recentActivity || []).map(a => ({
    when: timeAgo(a.timestamp),
    who: a.actor || 'system',
    what: (a.type || '').replace(/_/g, ' '),
    target: a.id || '',
    detail: a.title || '',
    icon: iconMap[a.type] || 'spark',
  }));

  // ── Projects ─────────────────────────────────────────────────
  const PROJECTS = projData.projects || [];
  const ACTIVE_PROJECT = projData.activeProject || '';
  const ACTIVE_PROJECT_CONFIG = PROJECTS.find(p => p.id === ACTIVE_PROJECT) || null;

  // ── Sample YAML ──────────────────────────────────────────────
  let SAMPLE_YAML = '';
  for (const cat of (maestroRaw.categories || [])) {
    for (const f of (cat.flows || [])) {
      if (f.rawYaml) { SAMPLE_YAML = f.rawYaml; break; }
    }
    if (SAMPLE_YAML) break;
  }
  if (!SAMPLE_YAML) {
    SAMPLE_YAML = 'appId: com.example.app\\n---\\n- launchApp\\n- assertVisible: "Home"';
  }

  window.MORBIUS = {
    TEST_CASES, BUGS, CATEGORIES, MAESTRO_FLOWS,
    RUN_HISTORY, ACTIVITY, SAMPLE_YAML,
    PROJECTS, ACTIVE_PROJECT, ACTIVE_PROJECT_CONFIG,
    PLANS,
  };
}

window.loadMorbiusData = loadMorbiusData;


// ===== icons.jsx =====
// icons.jsx — minimal set of inline SVG icons
const _ic = (path, stroke = 1.6, fill = "none") => (props) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props} dangerouslySetInnerHTML={{__html: path}}></svg>
);

const Icon = {
  dashboard: _ic('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  tests: _ic('<path d="M9 2h6v6l4 8a4 4 0 0 1-3.6 5.6H8.6A4 4 0 0 1 5 16l4-8V2z"/><path d="M9 2h6"/>'),
  bug: _ic('<rect x="7" y="6" width="10" height="13" rx="5"/><path d="M12 6V4m-3 2V4m6 2V4m-9 10H3m18 0h-3m-15-5h3m12 0h3M6 18l-2 2m14-2 2 2"/>'),
  devices: _ic('<rect x="2" y="4" width="14" height="11" rx="1.5"/><rect x="16" y="8" width="6" height="12" rx="1.5"/><path d="M9 15v3m-3 0h6"/>'),
  runs: _ic('<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z" fill="currentColor"/>'),
  maestro: _ic('<path d="M4 4h16v4H4z"/><path d="M4 10h10v4H4z"/><path d="M4 16h16v4H4z"/>'),
  search: _ic('<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>'),
  chat: _ic('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  settings: _ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  play: _ic('<path d="M6 3v18l15-9z" fill="currentColor"/>', 0, "currentColor"),
  plus: _ic('<path d="M12 5v14M5 12h14"/>'),
  chevron: _ic('<path d="m9 6 6 6-6 6"/>'),
  chevronDown: _ic('<path d="m6 9 6 6 6-6"/>'),
  close: _ic('<path d="M18 6 6 18M6 6l12 12"/>'),
  filter: _ic('<path d="M3 4h18l-7 9v7l-4-2v-5L3 4z"/>'),
  sort: _ic('<path d="M3 6h18M6 12h12M10 18h4"/>'),
  check: _ic('<path d="m5 12 5 5L20 7"/>'),
  warn: _ic('<path d="M12 2 2 20h20L12 2zM12 9v5M12 18v.01"/>'),
  fail: _ic('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>'),
  kbd: _ic('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'),
  more: _ic('<circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/>', 0, "currentColor"),
  sun: _ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>'),
  moon: _ic('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  edit: _ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  sync: _ic('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>'),
  import: _ic('<path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  spark: _ic('<path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 5L21 10l-5 2.5L14 18l-2.5-5L6 11l5.5-2L13 3z"/>'),
  zap: _ic('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  clock: _ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  tag: _ic('<path d="M20 12 12 20l-9-9V3h8l9 9z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>'),
  link: _ic('<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1"/>'),
  android: _ic('<path d="M6 8a6 6 0 0 1 12 0v8H6V8zM4 10v6M20 10v6M9 19v2M15 19v2M9 5.5 8 4M15 5.5l1-1.5"/>'),
  apple: _ic('<path d="M12 4c-.3-1.5 1-3 2.5-3 .2 1.6-1 3-2.5 3zm5 6c0-2.8 2.5-4 2.5-4-1-1.7-3-2-4-2-1.5 0-3 1-4 1s-2.5-1-4-1C5 4 2 6 2 10c0 6 4 11 6 11 1 0 2-1 4-1s3 1 4 1c1.5 0 3-2.5 4-4.5-3-1.2-3-4.3-3-6.5z"/>'),
  sidebar: _ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
  layout: _ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>'),
  appmap: _ic('<rect x="3" y="3" width="6" height="4" rx="1"/><rect x="15" y="3" width="6" height="4" rx="1"/><rect x="9" y="17" width="6" height="4" rx="1"/><path d="M6 7v4h12V7M12 11v6"/>'),
  healing: _ic('<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="2"/>'),
};

window.Icon = Icon;


// ===== ui.jsx =====
// ui.jsx — shared UI primitives

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function StatusDot({ status }) {
  const map = { pass: "pass", fail: "fail", flaky: "flaky", "in-progress": "running", "not-run": "none" };
  return <span className={\`status-dot \${map[status] || "none"}\`} />;
}

function StatusPill({ status, sm }) {
  const map = {
    pass: { klass: "ok", label: "Pass" },
    fail: { klass: "fail", label: "Fail" },
    flaky: { klass: "warn", label: "Flaky" },
    "in-progress": { klass: "info", label: "Running" },
    "not-run": { klass: "neutral", label: "Not run" },
    open: { klass: "fail", label: "Open" },
    investigating: { klass: "warn", label: "Investigating" },
    fixed: { klass: "ok", label: "Fixed" },
    closed: { klass: "neutral", label: "Closed" },
  };
  const m = map[status] || { klass: "neutral", label: status };
  return (
    <span className={\`pill sq \${m.klass}\`}>
      <span className="dot" /> {m.label}
    </span>
  );
}

function Kbd({ children }) { return <span className="kbd">{children}</span>; }

function MiniBar({ run }) {
  // Simple sparkline from run history
  const max = Math.max(...run.map(r => r.total));
  return (
    <div className="mini-bar">
      {run.map((r, i) => {
        const h = Math.max(10, Math.round((r.pass / max) * 100));
        return <span key={i} className={r.rate > 85 ? "hi" : ""} style={{ height: h + "%" }} />;
      })}
    </div>
  );
}

function Sparkline({ data, height = 56, accent = true }) {
  const w = 320;
  const h = height;
  const pad = 4;
  const max = Math.max(...data.map(d => d.rate));
  const min = Math.min(...data.map(d => d.rate));
  const range = Math.max(1, max - min);
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (d.rate - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? \`M\${p[0]},\${p[1]}\` : \`L\${p[0]},\${p[1]}\`)).join(" ");
  const fill = \`\${path} L\${pts[pts.length-1][0]},\${h} L\${pts[0][0]},\${h} Z\`;
  return (
    <svg className="sparkline" viewBox={\`0 0 \${w} \${h}\`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 2.6 : 0} fill="var(--accent)" />
      ))}
    </svg>
  );
}

function HealthBar({ pass, fail, flaky, notRun }) {
  const total = pass + fail + flaky + notRun;
  return (
    <div className="bar" title={\`\${pass} pass · \${fail} fail · \${flaky} flaky · \${notRun} not run\`}>
      <span className="pass" style={{ width: (pass/total*100)+"%" }} />
      <span className="flaky" style={{ width: (flaky/total*100)+"%" }} />
      <span className="fail" style={{ width: (fail/total*100)+"%" }} />
      <span className="none" style={{ width: (notRun/total*100)+"%" }} />
    </div>
  );
}

function Avatar({ initials, size = 22, muted = size <= 20 }) {
  // Small avatars live in dense data surfaces (tables, kanban cards, drawer pairs)
  // where a column of saturated gradient circles outshouts the actual data — those
  // render neutral. The gradient identity mark stays for profile-scale avatars.
  return <div className={muted ? "avatar avatar-muted" : "avatar"} style={{ width: size, height: size, fontSize: Math.round(size*0.44) }}>{initials}</div>;
}

function Empty({ title, hint }) {
  return (
    <div style={{padding: "40px 20px", textAlign: "center", color: "var(--fg-muted)"}}>
      <div style={{fontSize:14, fontWeight:500, color:"var(--fg)"}}>{title}</div>
      {hint && <div style={{fontSize:12.5, marginTop:6}}>{hint}</div>}
    </div>
  );
}

Object.assign(window, { StatusDot, StatusPill, Kbd, MiniBar, Sparkline, HealthBar, Avatar, Empty });


// ===== views.jsx =====
// views.jsx — main views

const { useState: vS, useMemo: vM } = React;

// ===== Dashboard =====
function DashboardView({ onSelectTest, onSelectBug, onNavigate }) {
  const { TEST_CASES, BUGS, RUN_HISTORY, ACTIVITY, CATEGORIES, MAESTRO_FLOWS } = window.MORBIUS;

  const totals = vM(() => {
    const c = { pass:0, fail:0, flaky:0, "not-run":0, "in-progress":0 };
    TEST_CASES.forEach(t => c[t.status] = (c[t.status]||0)+1);
    // Pass rate (hero): of tests that have actually run, how many passed?
    // This is what a QA lead reads when they see "Pass rate". Excludes
    // not-run + in-progress so the number reflects current quality, not catalog gaps.
    const executed = c.pass + c.fail + c.flaky;
    const passRate = executed > 0 ? Math.round((c.pass / executed) * 100) : 0;
    // Executed coverage: how much of the catalog has run at all?
    const executedPct = TEST_CASES.length > 0 ? Math.round((executed / TEST_CASES.length) * 100) : 0;
    return { ...c, total: TEST_CASES.length, executed, passRate, executedPct, rate: passRate };
  }, []);

  const catHealth = vM(() => CATEGORIES.map(c => {
    const inCat = TEST_CASES.filter(t => t.cat === c.slug);
    if (!inCat.length) return null;
    const pass = inCat.filter(t => t.status==="pass").length;
    const fail = inCat.filter(t => t.status==="fail").length;
    const flaky = inCat.filter(t => t.status==="flaky").length;
    const notRun = inCat.length - pass - fail - flaky;
    return { ...c, total:inCat.length, pass, fail, flaky, notRun, pct: Math.round((pass/inCat.length)*100) };
  }).filter(Boolean).sort((a,b) => a.pct - b.pct), []);

  const flaky = TEST_CASES.filter(t => t.status==="flaky");
  const openBugs = BUGS.filter(b => b.status==="open" || b.status==="investigating");

  // Computed delta: average of last 7 days vs first 7 days of run history.
  // Only meaningful when real run history exists — otherwise we'd show a
  // placeholder "+0%" against synthetic data, which the trust pass kills.
  const hasRealRunHistory = Array.isArray(RUN_HISTORY) && RUN_HISTORY.length > 0;
  const avgRate = arr => arr.length ? Math.round(arr.reduce((s,r)=>s+r.rate,0)/arr.length) : 0;
  const firstHalf = hasRealRunHistory ? RUN_HISTORY.slice(0, Math.floor(RUN_HISTORY.length/2)) : [];
  const secondHalf = hasRealRunHistory ? RUN_HISTORY.slice(Math.ceil(RUN_HISTORY.length/2)) : [];
  const ratesDelta = avgRate(secondHalf) - avgRate(firstHalf);
  const deltaStr = hasRealRunHistory ? ((ratesDelta >= 0 ? '+' : '') + ratesDelta + '% vs prev period') : '';
  const deltaClass = ratesDelta >= 0 ? 'up' : 'down';

  // Bug priority breakdown
  const p0 = openBugs.filter(b => b.priority==='P0').length;
  const p1 = openBugs.filter(b => b.priority==='P1').length;
  const p2 = openBugs.filter(b => b.priority==='P2').length;
  const priorityParts = [p0 && p0+' P0', p1 && p1+' P1', p2 && p2+' P2'].filter(Boolean);
  const priorityLabel = priorityParts.length ? priorityParts.join(' · ') : 'no critical bugs';
  const jiraLinked = openBugs.filter(b => b.jira).length;

  // Coverage: % of test cases that actually have a runnable flow (direct link or a written
  // automation-plan flow) — true per-card automation, not the old flow-count vs card-count proxy.
  const flowCount = (MAESTRO_FLOWS||[]).length;
  const automatedCount = TEST_CASES.filter(t => t.automated).length;
  const coveragePct = TEST_CASES.length > 0 ? Math.round(automatedCount / TEST_CASES.length * 100) : 0;
  const coverageLabel = automatedCount + '/' + TEST_CASES.length + ' cases automated · ' + flowCount + ' flows';

  const iconFor = { fail:Icon.fail, run:Icon.play, bug:Icon.bug, edit:Icon.edit, sync:Icon.sync, check:Icon.check, warn:Icon.warn, import:Icon.import };

  return (
    <React.Fragment>
      <div className="hero-stats" style={{marginBottom:"var(--row-gap)"}}>
        <div className="cell">
          <div className="metric">
            <div className="label">Pass rate</div>
            {/* Em-dash until something has run — a red "0%" before the first run
                reads as "everything is failing", which is false. */}
            {totals.executed > 0
              ? <div className="value">{totals.passRate}<span style={{fontSize:16, color:"var(--fg-muted)"}}>%</span></div>
              : <div className="value" style={{color:"var(--fg-dim)"}}>—</div>
            }
            {totals.executed > 0
              ? <div className="delta"><span style={{color:"var(--fg-faint)"}}>{totals.executed} of {totals.total} tests executed ({totals.executedPct}%)</span></div>
              : <div className="delta"><span style={{color:"var(--fg-faint)"}}>No tests executed yet — {totals.total} in catalog</span></div>
            }
          </div>
          {hasRealRunHistory ? <Sparkline data={RUN_HISTORY}/> : (
            <div style={{fontSize:10.5, color:"var(--fg-faint)", padding:"6px 0", textAlign:"right", fontStyle:"italic"}}>
              No run history yet
            </div>
          )}
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Tests</div>
            <div className="value">{totals.total}</div>
            <div className="delta" style={{display:'flex', flexWrap:'wrap', gap:'4px 10px', fontSize:11}}>
              <span><span style={{color:"var(--ok)"}}>●</span> {totals.pass} pass</span>
              <span><span style={{color:"var(--fail)"}}>●</span> {totals.fail} fail</span>
              <span><span style={{color:"var(--warn)"}}>●</span> {totals.flaky} flaky</span>
              <span><span style={{color:"var(--fg-faint)"}}>○</span> {totals["not-run"] + totals["in-progress"]} not run</span>
            </div>
          </div>
          {hasRealRunHistory ? <MiniBar run={RUN_HISTORY}/> : null}
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Flaky</div>
            {/* Status colors mean "needs attention" — a zero is calm, keep it neutral. */}
            <div className="value" style={totals.flaky > 0 ? {color:"var(--warn)"} : undefined}>{totals.flaky}</div>
            <div className="delta">{flaky.length} flaky tests</div>
          </div>
          {flaky[0] && <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6}}>Top offender · <span className="mono">{flaky[0].id}</span></div>}
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Open bugs</div>
            <div className="value" style={openBugs.length > 0 ? {color:"var(--fail)"} : undefined}>{openBugs.length}</div>
            <div className="delta">{priorityLabel}</div>
          </div>
          {jiraLinked > 0 && <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6}}>{jiraLinked} linked to Jira</div>}
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Coverage</div>
            <div className="value">{coveragePct}<span style={{fontSize:16, color:"var(--fg-muted)"}}>%</span></div>
            <div className="delta">{coverageLabel}</div>
          </div>
          {/* E-024 / S-024-008: coverage pills match the project type — Android/iOS for mobile, browser variants for web */}
          {(() => {
            const projectType = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.projectType || 'mobile';
            if (projectType === 'web') {
              return (
                <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6, display:'flex', gap:6, flexWrap:'wrap'}}>
                  <span className="pill sq accent"><span className="dot"/>Headless</span>
                  <span className="pill sq accent"><span className="dot"/>Visual</span>
                </div>
              );
            }
            if (projectType === 'api') {
              return <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6}}><span className="pill sq" style={{color:'var(--fg-muted)'}}>API · v1 not implemented</span></div>;
            }
            return <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6}}><span className="pill sq accent"><span className="dot"/>Android · iOS</span></div>;
          })()}
        </div>
      </div>

      <div className="grid g-12">
        <div className="col-8">
          <div className="card">
            <div className="card-header">
              <h3>Category health</h3>
              <div className="row">
                <span className="pill">{catHealth.length} categories</span>
                <button className="btn ghost sm"><Icon.sort/> Sort</button>
              </div>
            </div>
            <div className="card-body plain">
              {catHealth.slice(0,12).map(c => (
                <div className="health-row" key={c.slug}>
                  <div className="name">
                    {/* Gray until the category has actually executed something — 10 red
                        dots on a fresh import is alarm fatigue, not signal. */}
                    <StatusDot status={(c.pass + c.fail + c.flaky) === 0 ? "none" : c.pct>90?"pass":c.pct>70?"flaky":"fail"}/>
                    <span className="label-text">{c.name}</span>
                  </div>
                  <div className="pct">{c.pct}%</div>
                  <HealthBar pass={c.pass} fail={c.fail} flaky={c.flaky} notRun={c.notRun}/>
                  <div className="count">{c.total}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid g-12" style={{marginTop:"var(--row-gap)"}}>
            <div className="col-6">
              <div className="card">
                <div className="card-header"><h3>Flaky tests</h3><span className={\`pill \${flaky.length > 0 ? "warn" : ""}\`}><span className="dot"/>{flaky.length}</span></div>
                <div className="card-body plain">
                  {flaky.slice(0,6).map(t => (
                    <div key={t.id} className="health-row" style={{gridTemplateColumns:"78px 1fr auto"}} onClick={()=>onSelectTest(t)}>
                      <div className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{t.id}</div>
                      <div className="name"><span className="label-text">{t.title}</span></div>
                      <StatusDot status={t.status}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card">
                <div className="card-header"><h3>Recent bugs</h3><span className={\`pill \${openBugs.length > 0 ? "fail" : ""}\`}><span className="dot"/>{openBugs.length} open</span></div>
                <div className="card-body plain">
                  {BUGS.slice(0,6).map(b => (
                    <div key={b.id} className="health-row" style={{gridTemplateColumns:"auto 1fr auto"}} onClick={()=>onSelectBug(b)}>
                      <div className="row" style={{gap:5}}>
                        <span className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{b.id}</span>
                        {b.jira && <span className="pill sq accent" style={{fontSize:9, padding:"0 4px"}}>J</span>}
                      </div>
                      <div className="name" style={{minWidth:0}}><span className="label-text">{b.title}</span></div>
                      <StatusPill status={b.status}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="card">
            <div className="card-header"><h3>Activity</h3><button className="icon-btn"><Icon.more/></button></div>
            <div className="card-body">
              {ACTIVITY.map((a,i) => {
                const IC = iconFor[a.icon] || Icon.spark;
                return (
                  <div className="activity-item" key={i}>
                    <div className="act-icon"><IC/></div>
                    <div className="act-body">
                      <span><strong>{a.who}</strong> {a.what} <span className="mono">{a.target}</span></span>
                      <span className="sub">{a.detail}</span>
                    </div>
                    <span className="act-time">{a.when}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{marginTop:"var(--row-gap)"}}>
            <div className="card-header"><h3>Quick actions</h3></div>
            <div className="card-body" style={{display:"flex", flexDirection:"column", gap:8}}>
              {/* E-024 / S-024-008: web project routes Run All to Test Cases (no batch suite runner in v1); mobile keeps Maestro */}
              {window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.projectType === 'web'
                ? <button className="btn" style={{justifyContent:"flex-start"}} onClick={()=>onNavigate&&onNavigate('tests')}><Icon.play/> Run web tests</button>
                : <button className="btn" style={{justifyContent:"flex-start"}} onClick={()=>onNavigate&&onNavigate('maestro')}><Icon.play/> Run all flows</button>}
              <button className="btn" style={{justifyContent:"flex-start"}} onClick={()=>onNavigate&&onNavigate('bugs')}><Icon.sync/> Sync Jira</button>
              <button className="btn" style={{justifyContent:"flex-start"}} onClick={()=>onNavigate&&onNavigate('settings','workspace')}><Icon.import/> Import Excel</button>
              <button className="btn" style={{justifyContent:"flex-start"}} onClick={()=>onNavigate&&onNavigate('tests')}><Icon.plus/> New test case</button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ===== Tests Kanban =====
function TestsView({ onSelectTest, rowMode, setRowMode, focusStory, onNavigate }) {
  const { TEST_CASES, CATEGORIES, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;
  const [statusFilter, setStatusFilter] = vS("All");
  const [typeFilter, setTypeFilter] = vS("All");
  const [query, setQuery] = vS("");
  const [scope, setScope] = vS("ready");   // working set: ready | review | all
  // Cross-nav focus from the QA Plan hub: pin to one story's cards (shown across all epics).
  const [storyFilter, setStoryFilter] = vS(focusStory || null);
  aE(() => { if (focusStory) { setStoryFilter(focusStory); setScope("all"); } }, [focusStory]);

  const [selId, setSelId] = vS(null);

  // ── Triage Shelf (QA legibility) ───────────────────────────────────────────
  // A project may declare reviewEpics (category-slug prefixes) for raw / un-curated
  // imports — e.g. over-shredded PMAgent epics. Those cards are "needs review": kept on
  // disk but excluded from the default Ready worklist so the curated plans don't drown.
  // No reviewEpics (every other project) → reviewCount 0 → the toggle + shelf never render
  // and this view behaves exactly as it did before.
  const reviewEpics = (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.reviewEpics) || [];
  const needsReview = t => reviewEpics.some(p => (t.cat || "").startsWith(p));
  const reviewCount = vM(() => TEST_CASES.filter(needsReview).length, [TEST_CASES, reviewEpics.join("|")]);
  const hasReview = reviewCount > 0;
  const effScope = hasReview ? scope : "all";   // nothing to review → show everything

  const filtered = TEST_CASES.filter(t =>
    (statusFilter==="All" || t.status===statusFilter) &&
    (typeFilter==="All" || t.type===typeFilter) &&
    (effScope==="all" || (effScope==="ready" ? !needsReview(t) : needsReview(t))) &&
    (!storyFilter || t.story === storyFilter) &&
    (!query || (t.title+" "+t.id).toLowerCase().includes(query.toLowerCase()))
  );

  // byCat[catSlug] = [tests] — story plans grouped under their epic
  const byCat = vM(() => {
    const m = {};
    filtered.forEach(t => {
      if (!m[t.cat]) m[t.cat] = [];
      m[t.cat].push(t);
    });
    return m;
  }, [filtered]);

  // Selected plan for the right panel — defaults to the first visible item.
  const selectedTest = vM(
    () => filtered.find(t => t.id === selId) || filtered[0] || null,
    [filtered, selId]
  );

  // Ordered list of categories that actually appear (preserving CATEGORIES order)
  const catOrder = vM(() => {
    const all = new Set(filtered.map(t => t.cat));
    const ordered = CATEGORIES.filter(c => all.has(c.slug));
    // Also include any cat slugs not in CATEGORIES registry (fallback)
    const extra = [...all].filter(s => !ordered.find(c => c.slug === s));
    return [...ordered, ...extra.map(s => ({ slug: s, name: s }))];
  }, [filtered]);

  // Trust pass: chips at the top double as the at-a-glance summary AND the filter.
  // All 5 statuses are listed so "159 cases · 82 pass" reconciles inline regardless
  // of what scrolls off the kanban horizontally.
  const statusCounts = [
    { k:"All", n:TEST_CASES.length, l:"All" },
    { k:"pass", n:TEST_CASES.filter(t=>t.status==="pass").length, l:"Pass" },
    { k:"fail", n:TEST_CASES.filter(t=>t.status==="fail").length, l:"Fail" },
    { k:"flaky", n:TEST_CASES.filter(t=>t.status==="flaky").length, l:"Flaky" },
    { k:"in-progress", n:TEST_CASES.filter(t=>t.status==="in-progress").length, l:"In progress" },
    { k:"not-run", n:TEST_CASES.filter(t=>t.status==="not-run").length, l:"Not run" },
  ];

  return (
    <React.Fragment>
      <div className="kanban-toolbar">
        {/* Row 1: status pills + working-set toggle */}
        <div className="kt-row">
          <div className="row" style={{gap:6}}>
            {statusCounts.map(o => (
              <button key={o.k} className={\`chip \${statusFilter===o.k?"active":""}\`} onClick={()=>setStatusFilter(o.k)}>
                {o.k!=="All" && <StatusDot status={o.k}/>} {o.l} <span className="n">{o.n}</span>
              </button>
            ))}
          </div>
          {hasReview && (
            <React.Fragment>
              <div style={{flex:1}}/>
              {/* Scope is a different axis than status — bind these chips into a
                  segmented group so its "All" doesn't read as a duplicate of the
                  status row's "All". */}
              <div className="chip-group" title="Working-set scope">
                {[
                  {k:"ready",  l:"Ready",        n:TEST_CASES.length - reviewCount},
                  {k:"review", l:"Needs review", n:reviewCount},
                  {k:"all",    l:"All",          n:TEST_CASES.length},
                ].map(o => (
                  <button key={o.k} className={\`chip \${scope===o.k?"active":""}\`} onClick={()=>setScope(o.k)} title={o.k==="review" ? "Raw / un-curated imports — kept on disk, excluded from the Ready worklist" : ""}>
                    {o.l} <span className="n">{o.n}</span>
                  </button>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
        {/* Row 2: type filters + search */}
        <div className="kt-row">
          <div className="row" style={{gap:6}}>
            {["All","Happy Path","Flow","Detour","Negative","Edge Case"].map(t => (
              <button key={t} className={\`chip \${typeFilter===t?"active":""}\`} onClick={()=>setTypeFilter(t)}>{t}</button>
            ))}
          </div>
          {storyFilter && (
            <button className="chip active" style={{marginLeft:8}} onClick={()=>setStoryFilter(null)} title="Clear story filter — show all test cases">
              Story {storyFilter} ✕
            </button>
          )}
          <div style={{flex:1}}/>
          <input className="chip kt-search" placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)}/>
        </div>
      </div>

      {rowMode ? (
        <div className="view-body">
          <div className="card">
            <div className="card-body plain" style={{overflow:"auto"}}>
              <table className="tbl">
                <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Status</th><th>Priority</th><th>Owner</th><th>Last run</th></tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} onClick={()=>onSelectTest(t)}>
                      <td className="id">{t.id}</td>
                      <td>{t.title}</td>
                      <td><span className="pill">{t.type}</span></td>
                      <td><StatusPill status={t.status}/></td>
                      <td><span className="pill">{t.priority}</span></td>
                      <td><Avatar initials={t.owner} size={20}/></td>
                      {/* A "Not run" test with a "3d ago" last-run is a visible contradiction —
                          lastRun here is import metadata, not an execution timestamp. */}
                      <td className="id">{t.status === "not-run" ? "—" : t.lastRun}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        (() => {
          // Execution coverage: how many visible plans have actually run.
          const total = filtered.length;
          const ran = filtered.filter(t => t.status !== "not-run").length;
          const passCount = filtered.filter(t => t.status === "pass").length;
          const allPass = total > 0 && passCount === total;
          const pct = total ? Math.round(ran / total * 100) : 0;
          // Epics (categories) that actually have visible plans, in registry order.
          const visibleCats = catOrder.filter(c => (byCat[c.slug || c] || []).length > 0);
          return (
            <div className="qa-master">
              <div className="qa-list">
                <div className="qa-coverage-bar">
                  <div className="qa-coverage-label">test coverage</div>
                  <div className="qa-bar-track">
                    <div className="qa-bar-fill" style={{width: pct + "%", background: allPass ? "var(--ok)" : "var(--warn)"}}/>
                  </div>
                  <div className="qa-coverage-summary">{ran}/{total} run · {passCount} pass</div>
                </div>
                {visibleCats.length === 0 && (
                  <div style={{padding:"16px 12px", color:"var(--fg-faint)", fontSize:12.5}}>No test plans match.</div>
                )}
                {visibleCats.map(cat => {
                  const slug = cat.slug || cat;
                  const catName = cat.name || slug;
                  const tests = byCat[slug] || [];
                  return (
                    <React.Fragment key={slug}>
                      <div className="qa-section-label">
                        <span>{catName}</span>
                        <span style={{color:"var(--fg-faint)", fontWeight:400, marginLeft:4}}>({tests.length})</span>
                      </div>
                      {tests.map(t => (
                        <div
                          key={t.id}
                          className={\`qa-plan-item \${selectedTest && selectedTest.id===t.id ? "active" : ""}\`}
                          onClick={()=>setSelId(t.id)}
                        >
                          <span className="qa-plan-dot"><StatusDot status={t.status}/></span>
                          <span className="qa-plan-id">{t.id}</span>
                          <span className="qa-plan-label">{t.title}</span>
                          {t.blocked && <span title={t.blockedReason} style={{marginLeft:"auto", flexShrink:0, fontSize:11}}>⛔</span>}
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
                {effScope === "ready" && hasReview && (
                  <div
                    className="qa-section-label"
                    onClick={()=>setScope("review")}
                    style={{cursor:"pointer", marginTop:8, borderTop:"1px dashed var(--border)", paddingTop:10, color:"var(--warn)"}}
                    title="Raw / un-curated imports — click to review"
                  >
                    <span>⚠ Needs review — raw import</span>
                    <span style={{color:"var(--fg-faint)", fontWeight:400, marginLeft:4}}>({reviewCount}) ›</span>
                  </div>
                )}
              </div>
              <TestPlanDetail test={selectedTest} onOpenFull={onSelectTest} onNavigate={onNavigate}/>
            </div>
          );
        })()
      )}
    </React.Fragment>
  );
}

// ===== E-028: Automation Planner =====
// Planning stage: decide which test cases become Maestro flows and how they group,
// BEFORE any YAML is written. Left = per-case triage; right = proposed feature-area flows.
const DECISIONS = ["automate", "manual", "blocked", "defer"];
const DECISION_LABEL = { automate:"Automate", manual:"Manual", blocked:"Blocked", defer:"Defer", untriaged:"—" };
const DECISION_COLOR = { automate:"#45E0A8", manual:"#888", blocked:"#E5484D", defer:"#F5A623", untriaged:"var(--fg-faint)" };

function AutomationPlanView() {
  const { CATEGORIES } = window.MORBIUS;
  const [data, setData] = useState(null);
  const [selFlowId, setSelFlowId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [personaFilter, setPersonaFilter] = useState("all");
  const [showPersonas, setShowPersonas] = useState(false);
  const [genResult, setGenResult] = useState({});   // flowId -> { yaml, path, error }

  const load = () => fetch('/api/automation-plan').then(r => r.json()).then(setData).catch(() => setData({ error: true }));
  useEffect(() => { load(); }, []);

  const candFor = (id) => (data.candidates || []).find(c => c.testId === id);

  const setDecision = async (testId, decision) => {
    setSaving(true);
    const existing = candFor(testId) || {};
    await fetch('/api/automation-plan/candidate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...existing, testId, decision }),
    });
    await load();
    setSaving(false);
  };

  const scaffold = async (flowId) => {
    setSaving(true);
    setGenResult(g => ({ ...g, [flowId]: { generating: true } }));
    try {
      const r = await fetch('/api/automation-plan/scaffold', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId }),
      });
      const j = await r.json();
      setGenResult(g => ({ ...g, [flowId]: j.ok ? { yaml: j.yaml, path: j.path, ms: j.durationMs } : { error: j.error || 'failed' } }));
    } catch (e) {
      setGenResult(g => ({ ...g, [flowId]: { error: String(e) } }));
    }
    await load();
    setSaving(false);
  };

  if (!data) return <div className="qa-detail qa-detail-empty"><div style={{color:"var(--fg-faint)"}}>Loading plan…</div></div>;
  if (data.error) return <div className="qa-detail qa-detail-empty"><div style={{color:"var(--fg-faint)"}}>No automation plan yet.</div></div>;

  const s = data.summary || {};
  const tests = data.tests || [];
  const flows = data.flows || [];
  const personas = data.personas || [];
  const selFlow = flows.find(f => f.id === selFlowId) || flows[0] || null;

  // Group tests by epic/category (preserve CATEGORIES order, then extras)
  const cats = (() => {
    const seen = new Set(tests.map(t => t.category));
    const ordered = CATEGORIES.filter(c => seen.has(c.slug));
    const extra = [...seen].filter(sl => !ordered.find(c => c.slug === sl));
    return [...ordered, ...extra.map(sl => ({ slug: sl, name: sl }))];
  })();

  const personaLabel = (key) => { const p = personas.find(x => x.key === key); return p ? p.label : (key || '—'); };
  const personaOf = (testId) => { const c = candFor(testId); return c && c.feasibility ? c.feasibility.personaKey : undefined; };

  return (
    <div className="qa-master">
      {/* LEFT — triage list */}
      <div className="qa-list" style={{width:360}}>
        <div className="qa-coverage-bar">
          <div className="qa-coverage-label">automation coverage</div>
          <div className="qa-bar-track">
            <div className="qa-bar-fill" style={{width:(s.totalTests? Math.round((s.byDecision.automate||0)/s.totalTests*100):0)+"%", background:"#45E0A8"}}/>
          </div>
          <div className="qa-coverage-summary">
            {s.totalTests} cases → {s.totalFlows} flows · {s.automatableNow} now · {s.blockedFlows} blocked
          </div>
          <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
            {DECISIONS.map(d => (
              <span key={d} className="ap-chip" style={{borderColor:DECISION_COLOR[d], color:DECISION_COLOR[d]}}>
                {DECISION_LABEL[d]} <b>{(s.byDecision && s.byDecision[d]) || 0}</b>
              </span>
            ))}
            <span className="ap-chip" style={{color:"var(--fg-faint)"}}>Untriaged <b>{(s.byDecision && s.byDecision.untriaged) || 0}</b></span>
          </div>
          {/* Persona filter + legend */}
          <div style={{display:"flex", alignItems:"center", gap:8, marginTop:10}}>
            <span style={{fontSize:10, color:"var(--fg-faint)", textTransform:"uppercase", letterSpacing:"0.08em"}}>Persona</span>
            <select className="ap-select" value={personaFilter} onChange={e => setPersonaFilter(e.target.value)} style={{flex:1}}>
              <option value="all">All personas</option>
              {personas.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button className="btn ghost sm" style={{padding:"2px 8px"}} onClick={() => setShowPersonas(v => !v)}>{showPersonas ? "Hide" : "Legend"}</button>
          </div>
          {showPersonas && (
            <div className="ap-legend">
              {personas.map(p => (
                <div key={p.key} className="ap-legend-row">
                  <span className="ap-legend-key">{p.label}</span>
                  <span className="ap-legend-meta">
                    <code>{p.key}</code>{p.programId ? " · program " + p.programId : ""}
                    {p.notes ? <span style={{display:"block", color:"var(--fg-faint)"}}>{p.notes}</span> : null}
                    <span style={{display:"block", color:"var(--fg-faint)", fontSize:9.5}}>creds: {Object.values(p.envKeys || {}).join(", ")}</span>
                  </span>
                </div>
              ))}
              {personas.length === 0 && <div style={{color:"var(--fg-faint)", fontSize:11}}>No personas in config.testAccounts.</div>}
            </div>
          )}
        </div>
        {cats.map(cat => {
          const slug = cat.slug || cat;
          const rows = tests.filter(t => t.category === slug && (personaFilter === "all" || personaOf(t.id) === personaFilter));
          if (!rows.length) return null;
          return (
            <React.Fragment key={slug}>
              <div className="qa-section-label"><span>{cat.name || slug}</span><span style={{color:"var(--fg-faint)", marginLeft:4}}>({rows.length})</span></div>
              {rows.map(t => {
                const c = candFor(t.id);
                const dec = c ? c.decision : 'untriaged';
                return (
                  <div key={t.id} className="ap-row">
                    <span className="ap-dot" style={{background:DECISION_COLOR[dec]}}/>
                    <div style={{flex:1, minWidth:0}}>
                      <div className="ap-row-title">{t.title}</div>
                      <div className="ap-row-meta">
                        <span className="mono">{t.id}</span>
                        <span className="pill" style={{fontSize:9, padding:"0 4px"}}>{t.priority}</span>
                        {c && c.feasibility && c.feasibility.gatedByConfig && <span title={c.feasibility.gatedByConfig}>🔒</span>}
                        {c && c.feasibility && c.feasibility.personaKey && <span title={'persona: '+personaLabel(c.feasibility.personaKey)}>👤</span>}
                        {c && c.feasibility && c.feasibility.selectorRisk === 'high' && <span title="high selector risk">⚠️</span>}
                        {c && c.feasibility && c.feasibility.destructive && <span title="destructive">🧨</span>}
                      </div>
                    </div>
                    <select className="ap-select" value={dec} disabled={saving}
                      onChange={e => setDecision(t.id, e.target.value)}
                      style={{color:DECISION_COLOR[dec]}}>
                      <option value="untriaged">—</option>
                      {DECISIONS.map(d => <option key={d} value={d}>{DECISION_LABEL[d]}</option>)}
                    </select>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* RIGHT — proposed flows */}
      <div className="qa-detail">
        <div className="qa-detail-head">
          <h2 style={{flex:1}}>Proposed flows <span className="pill" style={{fontSize:11}}>{flows.length}</span></h2>
          <span style={{fontSize:11, color:"var(--fg-faint)"}}>Stage 1 — planning. YAML is written last.</span>
        </div>
        <div className="qa-detail-body">
          {(() => {
            const shown = [...flows].filter(f => personaFilter === "all" || f.personaKey === personaFilter).sort((a,b)=>(a.runOrder||0)-(b.runOrder||0));
            if (shown.length === 0) return <div style={{color:"var(--fg-faint)", fontSize:13}}>No flows{personaFilter!=="all" ? " for persona “"+personaLabel(personaFilter)+"”" : " planned yet"}.</div>;
            return (
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
            {shown.map(f => {
              const blocked = (f.blockers || []).length > 0;
              const gr = genResult[f.id];
              const ff = (data.flowFiles || {})[f.id];
              const yamlText = (gr && gr.yaml) || (ff && ff.yaml);
              const yamlPath = (gr && gr.path) || (ff && ff.path);
              const isSel = selFlow && selFlow.id === f.id;
              return (
                <div key={f.id} className={"ap-flow" + (selFlow && selFlow.id===f.id ? " active":"")} onClick={() => setSelFlowId(f.id)}>
                  <div className="ap-flow-head">
                    <span className="mono ap-flow-id">{f.id}</span>
                    <span className="ap-flow-name">{f.name}</span>
                    <span className="ap-flow-status" data-st={f.status}>{f.status}</span>
                  </div>
                  <div className="ap-flow-meta">
                    <span className="pill" style={{fontSize:10}}>{f.priority}</span>
                    <span className="pill" style={{fontSize:10}}>{(f.platforms||[]).join(' · ')}</span>
                    <span className="pill" style={{fontSize:10}}>👤 {personaLabel(f.personaKey)}</span>
                    <span style={{fontSize:10.5, color:"var(--fg-faint)"}}>{f.featureArea}</span>
                  </div>
                  {f.rationale && <div className="ap-flow-rat">{f.rationale}</div>}
                  <div style={{display:"flex", gap:4, flexWrap:"wrap", marginTop:6}}>
                    {(f.testIds||[]).map(id => <span key={id} className="mono ap-tc">{id}</span>)}
                  </div>
                  {blocked && <div className="ap-blocker">🔒 Blocked: {f.blockers.join('; ')}</div>}
                  <div style={{marginTop:8, display:"flex", gap:8, alignItems:"center"}}>
                    <button className="btn sm" disabled={blocked || saving || (gr && gr.generating)}
                      onClick={(e) => { e.stopPropagation(); scaffold(f.id); }}>
                      {gr && gr.generating ? 'Generating…' : blocked ? 'Blocked' : f.status==='planned' ? 'Generate draft (agent) →' : 'Re-generate'}
                    </button>
                    {!blocked && <span style={{fontSize:10, color:"var(--fg-faint)"}}>askClaude → draft YAML → run + E-017 heal</span>}
                  </div>
                  {gr && gr.error && <div className="ap-blocker" style={{color:"#E5484D"}}>✕ {gr.error}</div>}
                  {yamlText && (
                    <details className="ap-draft" open={isSel} onClick={e => e.stopPropagation()}>
                      <summary>📄 Maestro YAML → <span className="mono">{yamlPath}</span> {gr && gr.ms ? "("+Math.round(gr.ms/1000)+"s)" : ""} · also in the Maestro tab</summary>
                      <pre className="ap-yaml">{yamlText}</pre>
                    </details>
                  )}
                </div>
              );
            })}
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ===== Test plan detail (right panel of the QA split-view) =====
// Mirrors PMAgent's QAPlanDetail: meta header + full markdown document, with
// Morbius's execution signal (status, Maestro flow, run history) appended.
// Curated PMAgent test plans get pasted into the card body TWICE — once under "## Steps"
// and again under "## Expected Result" (the 2nd copy often truncated mid-word). When the
// "# Test Plan:" marker appears more than once, keep only the first block and drop the
// dangling "## Expected Result" heading that introduced the dup. No marker / single copy →
// returned unchanged (safe no-op for shredded or non-plan bodies).
function dedupeTestPlanBody(md) {
  if (!md || typeof md !== "string") return md;
  const marker = "# Test Plan:";
  const first = md.indexOf(marker);
  if (first < 0) return md;
  const second = md.indexOf(marker, first + marker.length);
  if (second < 0) return md;
  const head = md.slice(0, second).replace(/\\n#{1,6}[ \\t]*Expected Result[ \\t]*\\n+\\s*$/i, "\\n");
  return head.replace(/\\s+$/, "");
}

function TestPlanDetail({ test, onOpenFull, onNavigate }) {
  const { CATEGORIES } = window.MORBIUS;
  const [detail, setDetail] = useState(null);
  const [runs, setRuns] = useState(null);
  const testId = test ? test.id : null;

  useEffect(() => {
    if (!testId) { setDetail(null); setRuns(null); return; }
    let cancelled = false;
    setDetail(null); setRuns(null);
    (async () => {
      try {
        const [dRes, hRes] = await Promise.all([
          fetch('/api/test/' + encodeURIComponent(testId)),
          fetch('/api/runs/' + encodeURIComponent(testId) + '/history'),
        ]);
        const d = await dRes.json();
        const h = await hRes.json();
        if (!cancelled) {
          setDetail(d && typeof d === 'object' ? d : null);
          setRuns(Array.isArray(h) ? h : []);
        }
      } catch {
        if (!cancelled) { setDetail(null); setRuns([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [testId]);

  if (!test) {
    return (
      <div className="qa-detail qa-detail-empty">
        <div style={{color:"var(--fg-faint)", fontSize:13}}>Select a test plan to view its document.</div>
      </div>
    );
  }

  const fmtTime = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return '—'; }
  };
  const catName = (CATEGORIES.find(c => c.slug === test.cat) || {}).name || test.cat;
  const storyId = (detail && detail.pmagentSource && detail.pmagentSource.storyId)
    || (detail && Array.isArray(detail.tags) ? (detail.tags.find(t => /^s-/i.test(t)) || '').toUpperCase() : '')
    || '—';
  const platforms = detail && Array.isArray(detail.platforms) && detail.platforms.length ? detail.platforms.join(', ') : '—';
  const bodyHtml = detail && detail.markdownBody ? mdToHtml(dedupeTestPlanBody(detail.markdownBody)) : '';
  // Round-trip: which QA plans cover this card's story → jump back to the QA Plan view.
  const coveringPlans = (() => {
    const items = (window.MORBIUS && window.MORBIUS.PLANS && window.MORBIUS.PLANS.items) || [];
    if (!storyId || storyId === '—') return [];
    const sid = String(storyId).toUpperCase();
    return items.filter(p => p.type !== 'release-def' && (p.storyIds || []).includes(sid));
  })();

  // Phase 3: source-drift display (computed server-side in /api/test/:id).
  const driftInfo = (() => {
    const d = detail && detail.drift;
    if (!d || d === 'none') return null;
    const map = {
      'in-sync':        { label:'In sync',        klass:'ok',      banner:null },
      'drifted':        { label:'Drifted',        klass:'warn',    banner:{ color:'warn', text:'Source drifted — the PMAgent AC / test-plan changed since this card was imported. Re-pull from PMAgent to update.' } },
      'source-missing': { label:'Source missing', klass:'fail',    banner:{ color:'fail', text:'Source missing — the PMAgent source file for this card was moved or deleted.' } },
      'pinned':         { label:'Pinned',         klass:'neutral', banner:null },
    };
    return map[d] || { label:d, klass:'neutral', banner:null };
  })();
  const srcBase = detail && detail.pmagentSource && detail.pmagentSource.sourcePath ? detail.pmagentSource.sourcePath.split('/').pop() : '';

  return (
    <div className="qa-detail" data-testid="qa-right-panel">
      <div className="qa-detail-head">
        <span className="dr-id">{test.id}</span>
        <StatusPill status={test.status}/>
        <h2>{test.title}</h2>
        <RunButtons test={test} onRunFinished={() => setRuns(null)}/>
        <FileBugButton test={test}/>
        {onOpenFull && <button className="btn ghost sm" onClick={() => onOpenFull(test)} title="Open full detail drawer">Full</button>}
      </div>
      <div className="qa-detail-body">
        {test.blocked && (
          <div style={{margin:"0 0 14px", padding:"9px 12px", borderRadius:6, background:"rgba(245,166,35,0.10)", border:"1px solid var(--warn)", color:"var(--warn)", fontSize:12, display:"flex", gap:8, alignItems:"flex-start"}}>
            <span>⛔</span><span><strong>Blocked</strong> — {test.blockedReason || "see Automation Plan"}</span>
          </div>
        )}
        {driftInfo && driftInfo.banner && (
          <div style={{margin:"0 0 14px", padding:"9px 12px", borderRadius:6, background:"var(--bg-elev)", border:"1px solid var(--" + driftInfo.banner.color + ")", color:"var(--" + driftInfo.banner.color + ")", fontSize:12, display:"flex", gap:8, alignItems:"flex-start"}}>
            <span>⚠</span><span>{driftInfo.banner.text}</span>
          </div>
        )}
        <div className="qa-meta-grid">
          <div className="qa-meta"><span className="k">Story</span><span className="mono">{storyId}</span></div>
          <div className="qa-meta"><span className="k">Epic</span><span>{catName}</span></div>
          <div className="qa-meta"><span className="k">Scenario</span><span>{test.type}</span></div>
          <div className="qa-meta"><span className="k">Priority</span><span>{test.priority}</span></div>
          <div className="qa-meta"><span className="k">Platforms</span><span>{platforms}</span></div>
          {driftInfo && (
            <div className="qa-meta">
              <span className="k">Sync</span>
              <span title={srcBase ? ('Source: ' + srcBase) : ''}><span className={\`pill sq \${driftInfo.klass}\`} style={{fontSize:10}}>{driftInfo.label}</span></span>
            </div>
          )}
        </div>

        {coveringPlans.length > 0 && onNavigate && (
          <div style={{margin:"12px 0 4px", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
            <span style={{fontSize:10.5, color:"var(--fg-faint)", textTransform:"uppercase", letterSpacing:.5, fontWeight:600, marginRight:2}}>In QA plans</span>
            {coveringPlans.map(p => (
              <button key={p.id} className="chip" onClick={()=>onNavigate("plans", { plan: p.id })} title={p.title}>{p.id}</button>
            ))}
          </div>
        )}

        {detail === null ? (
          <div style={{fontSize:12, color:"var(--fg-faint)", padding:"12px 0"}}>Loading…</div>
        ) : bodyHtml ? (
          <div className="md-doc" dangerouslySetInnerHTML={{__html: bodyHtml}}/>
        ) : (
          <div style={{fontSize:12.5, color:"var(--fg-faint)", padding:"12px 0"}}>No document content.</div>
        )}

        {detail && detail.maestroHtml && (
          <section style={{marginTop:18}}>
            <div className="sec-title">Maestro flow</div>
            <div className="maestro-flow-host" style={{fontSize:12, lineHeight:1.6}} dangerouslySetInnerHTML={{__html: detail.maestroHtml}}/>
          </section>
        )}

        <section style={{marginTop:18}}>
          <div className="sec-title">Run history{runs ? ' · ' + Math.min(runs.length, 10) : ''}</div>
          {runs === null ? (
            <div style={{fontSize:12, color:"var(--fg-faint)"}}>Loading…</div>
          ) : runs.length === 0 ? (
            <div style={{fontSize:12, color:"var(--fg-faint)"}}>No runs recorded yet.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:3}}>
              {runs.slice(0, 10).map(r => (
                <div key={r.runId} style={{display:'flex', alignItems:'center', gap:8, padding:"6px 8px", borderRadius:4, background:'var(--bg-elev)'}}>
                  <StatusDot status={r.status}/>
                  <span className="mono" style={{fontSize:11, color:'var(--fg-muted)', minWidth:120}}>{fmtTime(r.startTime)}</span>
                  <span style={{flex:1, fontSize:11.5}}>{r.failingStep || (r.status === 'pass' ? 'All steps passed' : '—')}</span>
                  <span style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5}}>{r.target || r.platform || r.runner || ''}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ===== Bugs =====
function BugsView({ onSelectBug }) {
  const { BUGS } = window.MORBIUS;
  const cols = [
    { key:"open", label:"Open", dot:"fail" },
    { key:"investigating", label:"Investigating", dot:"flaky" },
    { key:"fixed", label:"Fixed", dot:"pass" },
    { key:"closed", label:"Closed", dot:"none" },
  ];
  return (
    <div className="kanban">
      {cols.map(col => {
        const items = BUGS.filter(b => b.status === col.key);
        return (
          <div className="kanban-col" key={col.key}>
            <div className="kanban-col-head">
              <div className="title"><StatusDot status={col.dot==="none"?"none":col.dot}/> {col.label} <span className="pill" style={{fontSize:10, padding:"0 5px"}}>{items.length}</span></div>
            </div>
            <div className="kanban-col-body">
              {items.length === 0 && (
                <div className="empty-state">
                  <span>No {col.label.toLowerCase()} bugs</span>
                  {col.key === "open" && <span className="es-hint">File one with Report bug, or from a failing run</span>}
                </div>
              )}
              {items.map(b => (
                <div key={b.id} className="tc-card" onClick={()=>onSelectBug(b)}>
                  <div className="head">
                    <span className="tc-id">{b.id}</span>
                    {b.jira && <span className="pill accent" style={{fontSize:10, padding:"1px 5px"}}>J · {b.jira}</span>}
                    <span className={\`pill \${b.priority==="P0"?"fail":b.priority==="P1"?"warn":""}\`} style={{marginLeft:"auto", fontSize:10, padding:"1px 5px"}}>{b.priority}</span>
                  </div>
                  <h4>{b.title}</h4>
                  <div className="meta">
                    {b.linkedTest && <span className="pill" style={{fontSize:10}}><Icon.link/> {b.linkedTest}</span>}
                    <span className="pill" style={{fontSize:10}}>{b.device}</span>
                    <Avatar initials={b.assignee} size={18}/>
                    <span style={{marginLeft:"auto", fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--fg-faint)"}}>{b.created}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Devices =====
// 2026-04-30: Devices tab redesign — fleet snapshot (live emulators/sims) +
// per-device cards (pass rate, top failing tests, last run thumbnail) + the
// existing coverage matrix as a tertiary section. Powers the "is this useful?"
// answer for PMs/devs by surfacing real data.
function DevicesView() {
  const { TEST_CASES, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;
  const [fleet, setFleet] = vS(null);
  const [loading, setLoading] = vS(true);

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/devices/fleet')
      .then(r => r.json())
      .then(data => { setFleet(data); setLoading(false); })
      .catch(() => { setFleet({ live: { android: [], ios: [] }, configured: [] }); setLoading(false); });
  }, []);

  // Static config fallback for the coverage matrix (existing behavior preserved)
  const configDevices = (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.devices)
    ? ACTIVE_PROJECT_CONFIG.devices.map(d => ({ id: d.id, name: d.name, plat: d.platform || d.plat || 'android' }))
    : [
        { id:"iphone", name:"iPhone", plat:"ios" },
        { id:"android-phone", name:"Android Phone", plat:"android" },
      ];

  const fmtRelative = (iso) => {
    if (!iso) return '—';
    try {
      const ms = Date.now() - new Date(iso).getTime();
      if (ms < 60000) return 'just now';
      if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
      if (ms < 86400000) return Math.floor(ms / 3600000) + 'h ago';
      return Math.floor(ms / 86400000) + 'd ago';
    } catch { return iso; }
  };

  const liveAndroid = fleet?.live?.android || [];
  const liveIos = fleet?.live?.ios || [];
  const configured = fleet?.configured || [];
  const liveCount = liveAndroid.length + liveIos.length;

  return (
    <React.Fragment>
      {/* 1. Fleet snapshot — what's connected RIGHT NOW */}
      <div className="card" style={{marginBottom:"var(--row-gap)"}}>
        <div className="card-header">
          <h3>Live fleet</h3>
          <span className="pill" style={{fontSize:10}}>
            <span className="dot" style={{background: liveCount > 0 ? 'var(--status-pass, #45E0A8)' : 'var(--fg-faint)'}}/>
            {liveCount > 0 ? liveCount + ' connected' : 'none connected'}
          </span>
        </div>
        <div className="card-body" style={{padding:'10px 14px'}}>
          {loading && <div style={{color:'var(--fg-faint)', fontSize:12}}>Discovering devices…</div>}
          {!loading && liveCount === 0 && (
            <div style={{color:'var(--fg-faint)', fontSize:12, padding:'8px 0'}}>
              No emulators or simulators connected. Start an Android emulator (Android Studio, Device Manager) or boot an iOS simulator (xcrun simctl boot &lt;udid&gt;) to attribute runs to devices.
            </div>
          )}
          {!loading && liveCount > 0 && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10}}>
              {liveAndroid.map(d => (
                <div key={d.udid} style={{padding:'10px 12px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-elev)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <Icon.android/>
                    <span style={{fontSize:13, fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{d.name}</span>
                    <span className="pill" style={{fontSize:9, background:'var(--status-pass, #45E0A8)', color:'#000'}}>LIVE</span>
                  </div>
                  <div style={{fontSize:10.5, color:'var(--fg-muted)', display:'grid', gridTemplateColumns:'auto 1fr', gap:'2px 8px'}}>
                    <span style={{color:'var(--fg-faint)'}}>UDID</span><span className="mono">{d.udid}</span>
                    {d.model && <><span style={{color:'var(--fg-faint)'}}>Model</span><span className="mono">{d.model}</span></>}
                    {d.apiLevel && <><span style={{color:'var(--fg-faint)'}}>API</span><span className="mono">{d.apiLevel}</span></>}
                    <span style={{color:'var(--fg-faint)'}}>Config</span>
                    <span>{d.configMatch ? <span className="mono" style={{color:'var(--status-pass, #45E0A8)'}}>{d.configMatch} ✓</span> : <span style={{color:'var(--fg-faint)'}}>unmatched</span>}</span>
                  </div>
                </div>
              ))}
              {liveIos.map(d => (
                <div key={d.udid} style={{padding:'10px 12px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-elev)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <Icon.apple/>
                    <span style={{fontSize:13, fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{d.name}</span>
                    <span className="pill" style={{fontSize:9, background:'var(--status-pass, #45E0A8)', color:'#000'}}>LIVE</span>
                  </div>
                  <div style={{fontSize:10.5, color:'var(--fg-muted)', display:'grid', gridTemplateColumns:'auto 1fr', gap:'2px 8px'}}>
                    <span style={{color:'var(--fg-faint)'}}>UDID</span><span className="mono">{d.udid}</span>
                    {d.osVersion && <><span style={{color:'var(--fg-faint)'}}>iOS</span><span className="mono">{d.osVersion}</span></>}
                    <span style={{color:'var(--fg-faint)'}}>Config</span>
                    <span>{d.configMatch ? <span className="mono" style={{color:'var(--status-pass, #45E0A8)'}}>{d.configMatch} ✓</span> : <span style={{color:'var(--fg-faint)'}}>unmatched</span>}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Per-device cards — pass rate + top failing tests + last run */}
      <div className="card" style={{marginBottom:"var(--row-gap)"}}>
        <div className="card-header"><h3>Configured devices</h3></div>
        <div className="card-body" style={{padding:'12px 14px'}}>
          {!loading && configured.length === 0 && (
            <div style={{color:'var(--fg-faint)', fontSize:12, padding:'8px 0'}}>
              No devices configured. Add devices in Settings → Devices.
            </div>
          )}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:12}}>
            {configured.map(d => {
              const stats = d.stats || { totalRuns: 0, passRate: 0, passCount: 0, failCount: 0, lastRunAt: null, lastRunStatus: null, lastScreenshotPath: null, topFailingTests: [] };
              const accent = stats.passRate >= 80 ? 'var(--status-pass, #45E0A8)'
                : stats.passRate >= 50 ? 'var(--status-flaky, #F5A623)'
                : 'var(--status-fail, #E5484D)';
              return (
                <div key={d.id} style={{padding:'12px 14px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-elev)', display:'flex', flexDirection:'column', gap:10}}>
                  {/* Header: name + platform icon + live dot */}
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    {d.platform === 'ios' ? <Icon.apple/> : <Icon.android/>}
                    <span style={{fontSize:14, fontWeight:600, flex:1}}>{d.name}</span>
                    {d.isLive ? (
                      <span style={{fontSize:9, padding:'2px 6px', borderRadius:3, background:'var(--status-pass, #45E0A8)', color:'#000', fontWeight:600}}>LIVE</span>
                    ) : (
                      <span style={{fontSize:9, padding:'2px 6px', borderRadius:3, background:'transparent', color:'var(--fg-faint)', border:'1px solid var(--border)'}}>OFFLINE</span>
                    )}
                  </div>

                  {/* Pass rate big number + run count */}
                  {stats.totalRuns === 0 ? (
                    <div style={{padding:'14px 0', textAlign:'center'}}>
                      <div style={{fontSize:13, color:'var(--fg-muted)', marginBottom:4}}>No runs yet</div>
                      <div style={{fontSize:11, color:'var(--fg-faint)'}}>Run a test from the Maestro tab to populate.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{display:'flex', alignItems:'baseline', gap:10}}>
                        <span style={{fontSize:32, fontWeight:600, color:accent, lineHeight:1}}>{stats.passRate}<span style={{fontSize:14, color:'var(--fg-muted)'}}>%</span></span>
                        <span style={{fontSize:11, color:'var(--fg-faint)'}}>pass · {stats.totalRuns} runs</span>
                      </div>
                      <div style={{fontSize:10.5, color:'var(--fg-faint)'}}>
                        <span style={{color:'var(--status-pass, #45E0A8)'}}>{stats.passCount} pass</span>
                        {' · '}
                        <span style={{color:'var(--status-fail, #E5484D)'}}>{stats.failCount} fail</span>
                        {stats.lastRunAt && <> · last run {fmtRelative(stats.lastRunAt)}</>}
                      </div>

                      {/* Top failing tests */}
                      {stats.topFailingTests && stats.topFailingTests.length > 0 && (
                        <div style={{marginTop:4}}>
                          <div style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4}}>Top failing tests</div>
                          {stats.topFailingTests.map(t => (
                            <div key={t.testId} style={{padding:'4px 0', fontSize:11, borderBottom:'1px solid var(--border)'}}>
                              <div style={{display:'flex', alignItems:'center', gap:6}}>
                                <span style={{flex:1, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.title}</span>
                                <span style={{fontSize:10, padding:'1px 5px', background:'var(--status-fail, #E5484D)', color:'#fff', borderRadius:3}}>{t.failCount}×</span>
                              </div>
                              {t.lastFriendlyError && (
                                <div style={{fontSize:10, color:'var(--fg-faint)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                  {t.lastFriendlyError}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Last run thumbnail */}
                      {stats.lastScreenshotPath && (
                        <a href={'/'+stats.lastScreenshotPath} target="_blank" rel="noreferrer"
                          style={{display:'block', marginTop:4}}>
                          <img src={'/'+stats.lastScreenshotPath} alt="Last run"
                            style={{width:'100%', maxHeight:120, objectFit:'cover', borderRadius:4, border:'1px solid var(--border)', cursor:'zoom-in'}}/>
                        </a>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Coverage matrix — kept from previous design */}
      <div className="card">
        <div className="card-header"><h3>Coverage matrix</h3><span style={{fontSize:11, color:'var(--fg-faint)'}}>{TEST_CASES.length} tests × {configDevices.length} devices</span></div>
        <div className="card-body plain" style={{overflow:"auto", maxHeight:560}}>
          <table className="matrix">
            <thead>
              <tr>
                <th>Test</th>
                {configDevices.map(d => <th key={d.id}>{d.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {TEST_CASES.map((t, i) => (
                <tr key={t.id + '__' + i}>
                  <td><span className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{t.id}</span> &nbsp; {t.title}</td>
                  {configDevices.map(d => (
                    <td key={d.id}><span className={\`cell-dot \${!t.devices[d.id] || t.devices[d.id]==="not-run" ? "none" : t.devices[d.id]}\`} title={t.devices[d.id] || "not run"}/></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </React.Fragment>
  );
}

// ===== Runs =====
// 2026-04-30: Real run stream — replaces the old sparkline-only Runs tab.
// Lazy-loads /api/runs/all with filters, groups by day, expands via RunDetailPanel.
function RunsView() {
  const { RUN_HISTORY, TEST_CASES, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;
  const [runs, setRuns] = vS([]);
  const [loading, setLoading] = vS(true);
  const [limit, setLimit] = vS(100);
  const [statusFilter, setStatusFilter] = vS('all');         // all|pass|fail|error
  const [runnerFilter, setRunnerFilter] = vS('all');         // all|maestro|web-headless|web-visual|manual
  const [deviceFilter, setDeviceFilter] = vS('all');         // all|<slug>|unknown
  const [sinceFilter, setSinceFilter] = vS('all');           // all|today|7d|30d
  const [expandedId, setExpandedId] = vS(null);

  const titleById = React.useMemo(() => {
    const m = new Map();
    (TEST_CASES || []).forEach(t => m.set(t.id, t.title));
    return m;
  }, [TEST_CASES]);

  const configuredDevices = (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.devices) || [];

  // Build query string from filters
  const buildQuery = () => {
    const p = new URLSearchParams();
    p.set('limit', String(limit));
    if (statusFilter !== 'all') p.set('status', statusFilter);
    if (runnerFilter !== 'all') p.set('runner', runnerFilter);
    if (deviceFilter !== 'all') p.set('device', deviceFilter);
    if (sinceFilter !== 'all') {
      const now = new Date();
      let since = null;
      if (sinceFilter === 'today') {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (sinceFilter === '7d') {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (sinceFilter === '30d') {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (since) p.set('since', since);
    }
    return p.toString();
  };

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/runs/all?' + buildQuery())
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setRuns([]); setLoading(false); });
  }, [statusFilter, runnerFilter, deviceFilter, sinceFilter, limit]);

  // Group by day. Today / Yesterday / YYYY-MM-DD
  const groups = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today.getTime() - 86400000);
    const fmtDayLabel = (d) => {
      const dd = new Date(d); dd.setHours(0,0,0,0);
      if (dd.getTime() === today.getTime()) return 'Today';
      if (dd.getTime() === yesterday.getTime()) return 'Yesterday';
      return dd.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
    };
    const byKey = new Map();
    runs.forEach(r => {
      const dateKey = (r.startTime || '').slice(0, 10);
      if (!byKey.has(dateKey)) byKey.set(dateKey, { key: dateKey, label: fmtDayLabel(r.startTime), runs: [] });
      byKey.get(dateKey).runs.push(r);
    });
    return [...byKey.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [runs]);

  const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit', second:'2-digit' }); } catch { return iso; } };
  const fmtDur = (ms) => {
    if (!ms || ms < 0) return '—';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
    return m + 'm ' + s + 's';
  };

  const FilterChip = ({active, onClick, children}) => (
    <button onClick={onClick}
      style={{padding:'4px 10px', fontSize:11, lineHeight:1.4,
        background: active ? 'var(--accent-soft, var(--bg-elev))' : 'transparent',
        color: active ? 'var(--accent, var(--fg))' : 'var(--fg-muted)',
        border:'1px solid ' + (active ? 'var(--accent, var(--border))' : 'var(--border)'), borderRadius:4,
        cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit', marginRight:4, marginBottom:4}}>
      {children}
    </button>
  );

  // Counts for filter labels
  const statusCounts = React.useMemo(() => {
    const c = { all: runs.length, pass: 0, fail: 0, error: 0 };
    runs.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [runs]);

  return (
    <React.Fragment>
      {/* Run trend sparkline (kept from previous design) */}
      {Array.isArray(RUN_HISTORY) && RUN_HISTORY.length > 0 && (
        <div className="card" style={{marginBottom:"var(--row-gap)"}}>
          <div className="card-header">
            <h3>{'Run trend · ' + (RUN_HISTORY[0]?.label?.replace(/^\\w+,\\s*/,'') || '') + ' – ' + (RUN_HISTORY[RUN_HISTORY.length-1]?.label?.replace(/^\\w+,\\s*/,'') || '')}</h3>
            <span className="pill accent"><span className="dot"/>CI + Local</span>
          </div>
          <div className="card-body"><Sparkline data={RUN_HISTORY} height={120}/></div>
        </div>
      )}

      {/* Filters bar */}
      <div className="card" style={{marginBottom:"var(--row-gap)"}}>
        <div className="card-body" style={{padding:'10px 14px'}}>
          <div style={{display:'flex', flexWrap:'wrap', alignItems:'center', gap:14}}>
            <div>
              <div style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4}}>Status</div>
              <FilterChip active={statusFilter==='all'} onClick={()=>setStatusFilter('all')}>All ({statusCounts.all})</FilterChip>
              <FilterChip active={statusFilter==='pass'} onClick={()=>setStatusFilter('pass')}>Pass ({statusCounts.pass})</FilterChip>
              <FilterChip active={statusFilter==='fail'} onClick={()=>setStatusFilter('fail')}>Fail ({statusCounts.fail})</FilterChip>
              <FilterChip active={statusFilter==='error'} onClick={()=>setStatusFilter('error')}>Error ({statusCounts.error})</FilterChip>
            </div>
            <div>
              <div style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4}}>Runner</div>
              <FilterChip active={runnerFilter==='all'} onClick={()=>setRunnerFilter('all')}>All</FilterChip>
              <FilterChip active={runnerFilter==='maestro'} onClick={()=>setRunnerFilter('maestro')}>Maestro</FilterChip>
              <FilterChip active={runnerFilter==='web-headless'} onClick={()=>setRunnerFilter('web-headless')}>Web headless</FilterChip>
              <FilterChip active={runnerFilter==='web-visual'} onClick={()=>setRunnerFilter('web-visual')}>Web visual</FilterChip>
              <FilterChip active={runnerFilter==='manual'} onClick={()=>setRunnerFilter('manual')}>Manual</FilterChip>
            </div>
            {configuredDevices.length > 0 && (
              <div>
                <div style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4}}>Device</div>
                <FilterChip active={deviceFilter==='all'} onClick={()=>setDeviceFilter('all')}>All</FilterChip>
                {configuredDevices.map(d => (
                  <FilterChip key={d.id} active={deviceFilter===d.id} onClick={()=>setDeviceFilter(d.id)}>{d.name}</FilterChip>
                ))}
                <FilterChip active={deviceFilter==='unknown'} onClick={()=>setDeviceFilter('unknown')}>Unknown</FilterChip>
              </div>
            )}
            <div>
              <div style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4}}>Since</div>
              <FilterChip active={sinceFilter==='all'} onClick={()=>setSinceFilter('all')}>All time</FilterChip>
              <FilterChip active={sinceFilter==='today'} onClick={()=>setSinceFilter('today')}>Today</FilterChip>
              <FilterChip active={sinceFilter==='7d'} onClick={()=>setSinceFilter('7d')}>7 days</FilterChip>
              <FilterChip active={sinceFilter==='30d'} onClick={()=>setSinceFilter('30d')}>30 days</FilterChip>
            </div>
          </div>
        </div>
      </div>

      {/* Run stream */}
      <div className="card">
        <div className="card-header">
          <h3>Run stream{runs.length > 0 && <span style={{fontWeight:400, color:'var(--fg-faint)', marginLeft:8, fontSize:12}}>· {runs.length} runs</span>}</h3>
          {loading && <span className="pill" style={{fontSize:10}}>Loading…</span>}
        </div>
        <div className="card-body" style={{padding:'8px 12px'}}>
          {!loading && runs.length === 0 && (
            <div className="empty-state" style={{margin:'8px 2px'}}>
              <span>No runs match the current filters</span>
              <span className="es-hint">Run a test from the Maestro tab or the Test Drawer to populate this stream</span>
            </div>
          )}
          {groups.map(group => (
            <div key={group.key} style={{marginBottom:14}}>
              <div style={{fontSize:11, fontWeight:600, color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:0.5, padding:'8px 4px 6px', borderBottom:'1px solid var(--border)', marginBottom:6}}>
                {group.label} <span style={{color:'var(--fg-faint)', fontWeight:400, marginLeft:6}}>· {group.runs.length}</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:3}}>
                {group.runs.map(r => (
                  <React.Fragment key={r.runId}>
                    <div onClick={() => setExpandedId(id => id === r.runId ? null : r.runId)}
                      style={{display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:4, cursor:'pointer',
                        background: expandedId===r.runId ? 'var(--bg-hover)' : 'var(--bg-elev)',
                        border:'1px solid ' + (expandedId===r.runId ? 'var(--border)' : 'transparent')}}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = expandedId===r.runId ? 'var(--bg-hover)' : 'var(--bg-elev)'}>
                      <StatusDot status={r.status}/>
                      <span className="mono" style={{fontSize:11, color:'var(--fg-muted)', minWidth:80}}>{fmtTime(r.startTime)}</span>
                      {/* Screenshot thumbnail (or placeholder) */}
                      {r.screenshotPath ? (
                        <img src={'/'+r.screenshotPath} alt=""
                          style={{width:38, height:38, objectFit:'cover', borderRadius:3, border:'1px solid var(--border)', flexShrink:0}}/>
                      ) : (
                        <div style={{width:38, height:38, borderRadius:3, border:'1px solid var(--border)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-faint)', fontSize:14, flexShrink:0}}>—</div>
                      )}
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:12, color:'var(--fg)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                          {titleById.get(r.testId) || r.testId}
                        </div>
                        {r.friendlyError && (
                          <div style={{fontSize:10.5, color:'var(--status-fail, #E5484D)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2}}>
                            {r.friendlyError}
                          </div>
                        )}
                      </div>
                      <span style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, minWidth:80, textAlign:'right'}}>
                        {r.runner === 'web-headless' ? 'web · headless' : r.runner === 'web-visual' ? 'web · visual' : (r.target || r.platform || r.runner || '—')}
                      </span>
                      {r.device && (
                        <span style={{fontSize:10, color:'var(--fg-muted)', padding:'2px 6px', border:'1px solid var(--border)', borderRadius:3}}>
                          {r.device}
                        </span>
                      )}
                      <span className="mono" style={{fontSize:10.5, color:'var(--fg-faint)', minWidth:50, textAlign:'right'}}>{fmtDur(r.durationMs)}</span>
                      <Icon.chevronDown style={{transform: expandedId===r.runId ? 'rotate(180deg)' : 'none', transition:'transform 120ms', opacity:0.6, flexShrink:0}}/>
                    </div>
                    {expandedId === r.runId && (
                      <div style={{padding:'4px 0'}}>
                        <RunDetailPanel run={r}/>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {!loading && runs.length >= limit && (
            <div style={{textAlign:'center', padding:'10px 0'}}>
              <button onClick={() => setLimit(l => l + 100)}
                style={{padding:'6px 14px', fontSize:11, background:'transparent', color:'var(--fg-muted)',
                  border:'1px solid var(--border)', borderRadius:4, cursor:'pointer', fontFamily:'inherit'}}>
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

// ===== Maestro =====
function MaestroView({ focusFlow }) {
  const { MAESTRO_FLOWS, SAMPLE_YAML } = window.MORBIUS;
  const [platform, setPlatform] = vS("android");
  const [selected, setSelected] = vS(MAESTRO_FLOWS[0] || null);
  aE(() => { if (focusFlow) { const f = (MAESTRO_FLOWS || []).find(x => x.id === focusFlow); if (f) setSelected(f); } }, [focusFlow]);
  // Run state: { [flowId]: { status:'running'|'pass'|'fail', logs:'', runId } }
  const [runState, setRunState] = vS({});

  if (!MAESTRO_FLOWS.length) {
    return (
      <div className="card" style={{padding:40, textAlign:"center", color:"var(--fg-muted)"}}>
        No Maestro flows found for this project.
      </div>
    );
  }

  const visibleFlows = MAESTRO_FLOWS.filter(f => platform==="android" ? f.android : f.ios);
  const activeSelected = selected || MAESTRO_FLOWS[0];

  async function triggerRun(flow, plat) {
    const filePath = plat === 'android' ? flow.androidFilePath : flow.iosFilePath;
    if (!filePath) {
      setRunState(s => ({...s, [flow.id]: { status:'error', logs:'No file path found for this flow on '+plat+'. Check project config.', runId:null }}));
      return;
    }
    setRunState(s => ({...s, [flow.id]: { status:'running', logs:'Connecting to Maestro…\\n', runId:null }}));
    try {
      const res = await fetch('/api/flow/run', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ filePath, platform: plat }),
      });
      const { runId, error } = await res.json();
      if (error || !runId) {
        setRunState(s => ({...s, [flow.id]: { status:'error', logs:'Server error: '+(error||'no runId'), runId:null }}));
        return;
      }
      setRunState(s => ({...s, [flow.id]: { status:'running', logs:'Run started · '+runId+'\\n', runId }}));
      // Subscribe to run stream
      const port = location.port || '3000';
      const ws = new WebSocket('ws://'+location.hostname+':'+port+'/ws/run-stream');
      let gotDone = false;
      ws.onopen = () => ws.send(JSON.stringify({ type:'subscribe', runId }));
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'log') {
          setRunState(s => ({...s, [flow.id]: { ...s[flow.id], logs: (s[flow.id]?.logs||'') + data.data }}));
        } else if (data.type === 'done') {
          gotDone = true;
          setRunState(s => ({...s, [flow.id]: {
            ...s[flow.id],
            status: data.status,
            logs: (s[flow.id]?.logs||'') + '\\n─── ' + data.status.toUpperCase() + ' ───\\n',
            // Capture friendly classification + screenshot for the inline result card
            failureCategory: data.failureCategory,
            friendlyError: data.friendlyError,
            hint: data.hint,
            screenshotPath: data.screenshotPath,
            debugFolder: data.debugFolder,
            failingStep: data.failingStep,
            errorLine: data.errorLine,
            device: data.device,
          }}));
          ws.close();
        }
      };
      ws.onerror = () => setRunState(s => ({...s, [flow.id]: { ...s[flow.id], status:'error', logs:(s[flow.id]?.logs||'')+'WebSocket error\\n' }}));
      // If the socket closes without a 'done' event, unstick the UI rather than
      // leaving it spinning forever. (Server restart, network blip, etc.)
      ws.onclose = () => {
        if (gotDone) return;
        setRunState(s => {
          const cur = s[flow.id];
          if (!cur || cur.status !== 'running') return s;
          return { ...s, [flow.id]: { ...cur, status:'error', logs:(cur.logs||'')+'\\nConnection lost before test finished. The run may still be in progress on the server — check the Runs tab.\\n' } };
        });
      };
    } catch(err) {
      setRunState(s => ({...s, [flow.id]: { status:'error', logs:'Failed to start run: '+String(err), runId:null }}));
    }
  }

  async function cancelRun(flow) {
    const cur = runState[flow.id];
    if (!cur || !cur.runId || cur.status !== 'running') return;
    setRunState(s => ({...s, [flow.id]: { ...s[flow.id], logs:(s[flow.id]?.logs||'')+'\\nStopping run…\\n' }}));
    try {
      await fetch('/api/flow/run/'+cur.runId+'/cancel', { method:'POST' });
    } catch(err) {
      setRunState(s => ({...s, [flow.id]: { ...s[flow.id], logs:(s[flow.id]?.logs||'')+'Cancel failed: '+String(err)+'\\n' }}));
    }
  }

  return (
    <div className="grid g-12" style={{gap:"var(--row-gap)"}}>
      <div className="col-4">
        <div className="card">
          <div className="card-header">
            <h3>Flows · {MAESTRO_FLOWS.length}</h3>
            <div className="row" style={{gap:4}}>
              <button className={\`chip \${platform==="android"?"active":""}\`} onClick={()=>setPlatform("android")}><Icon.android/></button>
              <button className={\`chip \${platform==="ios"?"active":""}\`} onClick={()=>setPlatform("ios")}><Icon.apple/></button>
            </div>
          </div>
          <div className="card-body plain" style={{maxHeight:640, overflow:"auto"}}>
            {visibleFlows.length === 0
              ? <div style={{padding:"20px 14px", color:"var(--fg-faint)", fontSize:12}}>No {platform} flows yet.</div>
              : visibleFlows.map(f => (
              <div key={f.id}
                style={{display:"grid", gridTemplateColumns:"auto 1fr auto", gap:10, alignItems:"center",
                        padding:"10px 14px", cursor:"pointer",
                        borderBottom:"1px solid var(--border)",
                        background: activeSelected && activeSelected.id===f.id ? "var(--bg-hover)" : undefined}}
                onClick={()=>setSelected(f)}>
                <StatusDot status={f.status}/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:500}}>{f.name}</div>
                  <div className="mono" style={{fontSize:10.5, color:"var(--fg-faint)"}}>{f.id}.yaml · {f.steps} steps</div>
                </div>
                {f.tcs[0] && <span className="pill" style={{fontSize:10}}>{f.tcs[0]}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-8">
        {activeSelected && (
        <div className="card">
          <div className="card-header">
            <h3>{activeSelected.name}</h3>
            <div className="row" style={{gap:6}}>
              <span className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{activeSelected.id}.yaml</span>
              {runState[activeSelected.id]?.status === 'running'
                ? <StatusPill status="flaky"/>
                : runState[activeSelected.id]?.status === 'pass' || runState[activeSelected.id]?.status === 'fail'
                  ? <StatusPill status={runState[activeSelected.id].status}/>
                  : <StatusPill status={activeSelected.status}/>}
              {runState[activeSelected.id]?.status === 'running' && (
                <button
                  className="btn sm"
                  style={{background:'var(--status-fail, #E5484D)', color:'#fff', borderColor:'transparent'}}
                  onClick={() => cancelRun(activeSelected)}
                  title="Stop the running test">
                  ◼ Stop
                </button>
              )}
              {activeSelected.android && (
                <button
                  className={\`btn sm \${runState[activeSelected.id]?.status==='running' ? 'ghost' : 'primary'}\`}
                  disabled={runState[activeSelected.id]?.status==='running'}
                  onClick={() => triggerRun(activeSelected, 'android')}>
                  <Icon.android/> {runState[activeSelected.id]?.status==='running' ? 'Running…' : 'Run Android'}
                </button>
              )}
              {activeSelected.ios && (
                <button
                  className="btn ghost sm"
                  disabled={runState[activeSelected.id]?.status==='running'}
                  onClick={() => triggerRun(activeSelected, 'ios')}>
                  <Icon.apple/> Run iOS
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            {activeSelected.tcs.length > 0 && (
            <div className="row wrap" style={{gap:6, marginBottom:14}}>
              {activeSelected.tcs.map(tc => <span key={tc} className="pill"><Icon.link/> {tc}</span>)}
            </div>
            )}
            {runState[activeSelected.id] && (
              <div className="run-log-block">
                <div className="run-log-header">
                  <span className="mono" style={{fontSize:10.5}}>
                    {runState[activeSelected.id].status === 'running' ? '● Running…' :
                     runState[activeSelected.id].status === 'pass' ? '✓ Passed' :
                     runState[activeSelected.id].status === 'fail' ? '✗ Failed' :
                     runState[activeSelected.id].status === 'canceled' ? '◼ Stopped' : '! Error'}
                  </span>
                  <button className="icon-btn" onClick={()=>setRunState(s=>{const n={...s};delete n[activeSelected.id];return n;})}><Icon.close/></button>
                </div>
                <RunResultCard run={runState[activeSelected.id]}/>
                <RunLogDisplay logs={runState[activeSelected.id].logs}/>
              </div>
            )}
            <YamlBlock yaml={(platform === 'ios' ? activeSelected.iosYaml : activeSelected.androidYaml) || activeSelected.iosYaml || activeSelected.androidYaml || SAMPLE_YAML}/>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Shows the result of a run in a friendly format above the raw log:
//   - Pass: green check + screenshot if available
//   - Fail with classification: friendly label + remediation hint + screenshot + raw failing step
//   - Fail without classification: raw failing step + screenshot
//   - Running: nothing (waits for done event)
function RunResultCard({ run }) {
  if (!run || run.status === 'running' || run.status === 'error' || run.status === 'canceled') return null;
  const isPass = run.status === 'pass';
  const accent = isPass ? 'var(--status-pass, #45E0A8)' : 'var(--status-fail, #E5484D)';
  const bgTint = isPass ? 'rgba(69,224,168,0.06)' : 'rgba(229,72,77,0.06)';

  return (
    <div style={{
      padding:'10px 12px', margin:'6px 8px', borderRadius:6,
      border:'1px solid '+accent, background: bgTint, fontSize:12.5, lineHeight:1.5,
    }}>
      {/* Friendly headline + remediation hint (only on fail with classification) */}
      {!isPass && run.friendlyError && (
        <>
          <div style={{fontWeight:600, color:accent, marginBottom:4}}>
            ✗ {run.friendlyError}
          </div>
          {run.hint && <div style={{color:'var(--fg-muted)', marginBottom:8}}>{run.hint}</div>}
        </>
      )}
      {!isPass && !run.friendlyError && run.failingStep && (
        <div style={{fontWeight:600, color:accent, marginBottom:4}}>
          ✗ Failed at: <span className="mono" style={{fontWeight:400}}>{run.failingStep}</span>
        </div>
      )}
      {isPass && <div style={{fontWeight:600, color:accent, marginBottom:6}}>✓ Run completed successfully</div>}

      {/* Screenshot — both pass (final state) and fail (state when it broke) */}
      {run.screenshotPath && (
        <div style={{marginTop:8}}>
          <a href={'/'+run.screenshotPath} target="_blank" rel="noreferrer">
            <img src={'/'+run.screenshotPath}
              alt={isPass ? 'Final state screenshot' : 'State at failure'}
              style={{maxWidth:'100%', maxHeight:360, borderRadius:4, border:'1px solid var(--border)', cursor:'zoom-in'}}/>
          </a>
          <div style={{fontSize:10.5, color:'var(--fg-faint)', marginTop:4}}>
            {isPass ? 'Final state' : 'State at failure'} · click to open full size · <span className="mono">{run.screenshotPath}</span>
          </div>
        </div>
      )}

      {/* Failing step + error line on fail (raw) — only show if we didn't already show friendlyError */}
      {!isPass && run.friendlyError && run.failingStep && (
        <div style={{marginTop:8, fontSize:11, color:'var(--fg-muted)'}}>
          <span style={{color:'var(--fg-faint)'}}>Failing step:</span> <span className="mono">{run.failingStep}</span>
        </div>
      )}
      {!isPass && run.errorLine && (
        <div style={{marginTop:6, padding:8, background:'var(--bg-elev)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--fg-muted)', whiteSpace:'pre-wrap', overflow:'auto', maxHeight:120}}>
          {run.errorLine}
        </div>
      )}

      {/* Maestro debug folder pointer — useful for jumping into Maestro's own per-step screenshots */}
      {run.debugFolder && (
        <div style={{marginTop:6, fontSize:10.5, color:'var(--fg-faint)'}}>
          Maestro debug: <span className="mono">{run.debugFolder}</span>
        </div>
      )}
    </div>
  );
}

function RunLogDisplay({ logs }) {
  const ref = React.useRef(null);
  const [collapsed, setCollapsed] = React.useState(true);
  React.useEffect(() => {
    if (ref.current && !collapsed) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs, collapsed]);
  if (!logs) return null;
  // NOTE: this function is embedded inside a backtick template literal, so any
  // backslash-n must be doubly escaped (see split call below).
  const lineCount = logs.split('\\n').length;
  return (
    <div>
      <div style={{padding:'6px 12px', fontSize:10.5, color:'var(--fg-faint)', display:'flex', alignItems:'center', gap:10, borderTop:'1px solid var(--border)'}}>
        <button onClick={()=>setCollapsed(c=>!c)}
          style={{
            padding:'3px 10px', fontSize:11, lineHeight:1.4,
            background:'transparent', color:'var(--fg-muted)',
            border:'1px solid var(--border)', borderRadius:4,
            cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit',
          }}>
          {collapsed ? '▸ Show raw output' : '▾ Hide raw output'}
        </button>
        <span style={{color:'var(--fg-faint)', whiteSpace:'nowrap'}}>{lineCount} lines</span>
      </div>
      {!collapsed && (
        <pre ref={ref} className="run-log-pre">
          {logs || ''}
        </pre>
      )}
    </div>
  );
}

function YamlBlock({ yaml }) {
  const html = yaml
    .replace(/#.*$/gm, m => \`<span class="c">\${m}</span>\`)
    .replace(/^(\\s*-?\\s*)([a-zA-Z_][a-zA-Z0-9_]*):/gm, (_, s, k) => \`\${s}<span class="k">\${k}</span>:\`)
    .replace(/"([^"]+)"/g, '"<span class="s">$1</span>"');
  return <div className="yaml-block" dangerouslySetInnerHTML={{__html: html}}/>;
}

// 2026-04-30: Shared run-detail panel — used by TestDrawer's per-test history and the
// new Runs tab's day-grouped stream. Renders friendly classification card, metadata
// table, inline screenshots, lazy-loaded step log, and lazy-loaded Maestro debug folder.
function RunDetailPanel({ run, onSelectTest }) {
  const r = run;
  const [showLog, setShowLog] = React.useState(false);
  const [logText, setLogText] = React.useState(null);
  const [logErr, setLogErr] = React.useState(null);
  const [showDebug, setShowDebug] = React.useState(false);
  const [debugList, setDebugList] = React.useState(null);
  const [debugErr, setDebugErr] = React.useState(null);

  const loadLog = async () => {
    setShowLog(s => !s);
    if (logText !== null) return;
    try {
      const res = await fetch('/api/run/' + encodeURIComponent(r.runId) + '/log');
      if (!res.ok) { setLogErr('Log not found (' + res.status + ')'); return; }
      const text = await res.text();
      setLogText(text);
    } catch (e) { setLogErr(String(e)); }
  };

  const loadDebug = async () => {
    setShowDebug(s => !s);
    if (debugList !== null) return;
    try {
      const res = await fetch('/api/run/' + encodeURIComponent(r.runId) + '/debug-folder/list');
      if (!res.ok) { setDebugErr('Debug folder unavailable (' + res.status + ')'); return; }
      const data = await res.json();
      setDebugList(data);
    } catch (e) { setDebugErr(String(e)); }
  };

  const fmtDur = (ms) => {
    if (!ms || ms < 0) return '—';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
    return m + 'm ' + s + 's';
  };

  return (
    <div style={{padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:4, fontSize:11.5, lineHeight:1.6}}>
      {/* Friendly classification card on top — only when classifier produced one */}
      {r.friendlyError && (
        <div style={{padding:'8px 10px', marginBottom:10, borderRadius:4, border:'1px solid var(--status-fail, #E5484D)', background:'rgba(229,72,77,0.06)'}}>
          <div style={{fontWeight:600, color:'var(--status-fail, #E5484D)'}}>✗ {r.friendlyError}</div>
          {r.hint && <div style={{color:'var(--fg-muted)', marginTop:4, fontSize:11}}>{r.hint}</div>}
        </div>
      )}

      {/* Metadata grid */}
      <div className="pair"><span className="k">Run ID</span><span className="mono">{r.runId}</span></div>
      {r.testId && (
        <div className="pair"><span className="k">Test</span>
          {onSelectTest
            ? <a onClick={() => onSelectTest(r.testId)} style={{cursor:'pointer', color:'var(--accent)', textDecoration:'underline'}}>{r.testId}</a>
            : <span className="mono">{r.testId}</span>}
        </div>
      )}
      {r.runner && <div className="pair"><span className="k">Runner</span><span className="mono">{r.runner}</span></div>}
      {(r.target || r.platform) && <div className="pair"><span className="k">Target</span><span className="mono">{r.target || r.platform}</span></div>}
      {r.device && <div className="pair"><span className="k">Device</span><span className="mono">{r.device}</span></div>}
      <div className="pair"><span className="k">Started</span><span className="mono">{r.startTime}</span></div>
      {r.endTime && <div className="pair"><span className="k">Ended</span><span className="mono">{r.endTime}</span></div>}
      {typeof r.durationMs === 'number' && <div className="pair"><span className="k">Duration</span><span className="mono">{fmtDur(r.durationMs)}</span></div>}
      {typeof r.exitCode === 'number' && <div className="pair"><span className="k">Exit code</span><span className="mono">{r.exitCode}</span></div>}
      {r.targetUrl && <div className="pair"><span className="k">Target URL</span><span className="mono">{r.targetUrl}</span></div>}
      {r.failingStep && <div className="pair"><span className="k">Failing step</span><span style={{color:'var(--status-fail, #E5484D)'}}>{r.failingStep}</span></div>}
      {r.errorLine && <div style={{marginTop:6, padding:8, background:'var(--bg-elev)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--fg-muted)', whiteSpace:'pre-wrap', maxHeight:120, overflow:'auto'}}>{r.errorLine}</div>}

      {/* Single screenshot — both pass and fail */}
      {r.screenshotPath && (
        <div style={{marginTop:10}}>
          <a href={'/'+r.screenshotPath} target="_blank" rel="noreferrer">
            <img src={'/'+r.screenshotPath} alt="Run screenshot"
              style={{maxWidth:'100%', maxHeight:280, borderRadius:4, border:'1px solid var(--border)', cursor:'zoom-in'}}/>
          </a>
          <div style={{fontSize:10, color:'var(--fg-faint)', marginTop:2}}>
            {r.status === 'pass' ? 'Final state' : 'State at failure'} · click to open full size · <span className="mono">{r.screenshotPath}</span>
          </div>
        </div>
      )}

      {/* Multi-screenshot grid (web runs) */}
      {Array.isArray(r.screenshots) && r.screenshots.length > 0 && (
        <div style={{marginTop:10, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:6}}>
          {r.screenshots.map((s, i) => (
            <a key={i} href={'/'+s} target="_blank" rel="noreferrer" title={s}>
              <img src={'/'+s} alt={'Step '+(i+1)}
                style={{width:'100%', maxHeight:160, objectFit:'cover', borderRadius:4, border:'1px solid var(--border)', cursor:'zoom-in'}}/>
            </a>
          ))}
        </div>
      )}

      {/* Lazy step log toggle */}
      <div style={{marginTop:10, paddingTop:8, borderTop:'1px solid var(--border)'}}>
        <button onClick={loadLog}
          style={{padding:'4px 10px', fontSize:11, lineHeight:1.4,
            background:'transparent', color:'var(--fg-muted)',
            border:'1px solid var(--border)', borderRadius:4,
            cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit'}}>
          {showLog ? '▾ Hide step log' : '▸ Show step log'}
        </button>
        {showLog && (
          <div style={{marginTop:6}}>
            {logErr && <div style={{color:'var(--status-fail, #E5484D)', fontSize:11}}>{logErr}</div>}
            {!logErr && logText === null && <div style={{color:'var(--fg-faint)', fontSize:11}}>Loading…</div>}
            {!logErr && logText !== null && (
              <pre style={{background:'var(--bg-elev)', padding:8, borderRadius:4, fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--fg-muted)', whiteSpace:'pre-wrap', maxHeight:320, overflow:'auto', margin:0}}>
                {logText}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Lazy debug folder browser — only show button if debugFolder is set */}
      {r.debugFolder && (
        <div style={{marginTop:8}}>
          <button onClick={loadDebug}
            style={{padding:'4px 10px', fontSize:11, lineHeight:1.4,
              background:'transparent', color:'var(--fg-muted)',
              border:'1px solid var(--border)', borderRadius:4,
              cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit'}}>
            {showDebug ? '▾ Hide Maestro debug folder' : '▸ Show Maestro debug folder'}
          </button>
          <div style={{fontSize:10, color:'var(--fg-faint)', marginTop:3}}>
            <span className="mono">{r.debugFolder}</span>
          </div>
          {showDebug && (
            <div style={{marginTop:6}}>
              {debugErr && <div style={{color:'var(--status-fail, #E5484D)', fontSize:11}}>{debugErr}</div>}
              {!debugErr && debugList === null && <div style={{color:'var(--fg-faint)', fontSize:11}}>Loading…</div>}
              {!debugErr && debugList && Array.isArray(debugList.files) && debugList.files.length === 0 && (
                <div style={{color:'var(--fg-faint)', fontSize:11}}>Folder is empty.</div>
              )}
              {!debugErr && debugList && Array.isArray(debugList.files) && debugList.files.length > 0 && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:6}}>
                  {debugList.files.map(f => {
                    const fileUrl = '/api/run/' + encodeURIComponent(r.runId) + '/debug-folder/file?name=' + encodeURIComponent(f.name);
                    const isImage = /\\.(png|jpe?g|gif)$/i.test(f.name);
                    return (
                      <a key={f.name} href={fileUrl} target="_blank" rel="noreferrer" title={f.name + ' · ' + f.size + 'B'}
                        style={{display:'block', padding:6, background:'var(--bg-elev)', border:'1px solid var(--border)', borderRadius:4, fontSize:10, color:'var(--fg-muted)', textDecoration:'none', overflow:'hidden'}}>
                        {isImage ? (
                          <img src={fileUrl} alt={f.name}
                            style={{width:'100%', maxHeight:120, objectFit:'cover', borderRadius:3, marginBottom:4}}/>
                        ) : (
                          <div style={{height:80, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', borderRadius:3, marginBottom:4, fontSize:18, color:'var(--fg-faint)'}}>
                            📄
                          </div>
                        )}
                        <div style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{f.name}</div>
                        <div style={{color:'var(--fg-faint)'}}>{f.size > 1024 ? (f.size/1024).toFixed(1)+'KB' : f.size+'B'}</div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


Object.assign(window, { DashboardView, TestsView, BugsView, DevicesView, RunsView, MaestroView, YamlBlock, RunDetailPanel });


// ===== chat.jsx =====
// chat.jsx
const { useState: cS, useRef: cR, useEffect: cE } = React;

function ChatDrawer({ open, onClose }) {
  const [msgs, setMsgs] = cS([
    { role:"assistant", text:"Hey — I'm Morbius. I can run flows, triage failures, or spin up bugs. What are we tackling?" },
  ]);
  const [draft, setDraft] = cS("");
  const [connected, setConnected] = cS(false);
  const [streaming, setStreaming] = cS(false);
  const wsRef = cR(null);
  const scroll = cR(null);
  cE(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [msgs, open]);

  // Open WebSocket on mount; close on unmount. Reconnects when the drawer re-opens.
  cE(() => {
    if (!open) return;
    const port = location.port || '3000';
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = proto + '//' + location.hostname + ':' + port + '/ws/chat';
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setStreaming(false); };
    ws.onerror = () => {
      setConnected(false); setStreaming(false);
      setMsgs(m => [...m, { role:"assistant", text:"⚠ WebSocket connection failed. Is the Morbius server running?" }]);
    };
    ws.onmessage = (e) => {
      let evt; try { evt = JSON.parse(e.data); } catch { return; }
      if (evt.type === 'chunk') {
        // Append to the trailing assistant message (the streaming one)
        setMsgs(m => {
          const last = m[m.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            return [...m.slice(0, -1), { ...last, text: last.text + evt.content }];
          }
          return [...m, { role:'assistant', text: evt.content, streaming: true }];
        });
      } else if (evt.type === 'info') {
        // Tool-use status — render as a faded prefix line, but only if the streaming bubble is empty
        setMsgs(m => {
          const last = m[m.length - 1];
          if (last && last.role === 'assistant' && last.streaming && !last.text) {
            return [...m.slice(0, -1), { ...last, info: (last.info||'') + evt.content }];
          }
          return m;
        });
      } else if (evt.type === 'done') {
        setStreaming(false);
        setMsgs(m => {
          const last = m[m.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            const trimmed = (last.text || '').trim() || (last.info ? '(no response)' : '(empty)');
            return [...m.slice(0, -1), { role:'assistant', text: trimmed }];
          }
          return m;
        });
      } else if (evt.type === 'error') {
        setStreaming(false);
        setMsgs(m => [...m, { role:'assistant', text: '⚠ ' + (evt.content || 'error') }]);
      }
    };
    return () => { try { ws.close(); } catch {} wsRef.current = null; };
  }, [open]);

  if (!open) return null;
  const send = () => {
    if (!draft.trim() || streaming) return;
    const q = draft.trim();
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setMsgs(m => [...m, { role:'user', text:q }, { role:'assistant', text:'⚠ Not connected. Try reopening the chat.' }]);
      setDraft("");
      return;
    }
    setMsgs(m => [...m, { role:'user', text:q }, { role:'assistant', text:'', streaming: true, info:'' }]);
    setDraft("");
    setStreaming(true);
    ws.send(JSON.stringify({ message: q }));
  };
  const suggestions = ["Run all flows on Android","Re-run failing tests","Show today's failures","Summarize flaky trends"];

  return (
    <div className="chat-drawer">
      <div className="chat-head">
        <div className="chat-avatar">M</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:12.5, fontWeight:600}}>Morbius Agent</div>
          <div style={{fontSize:10.5, color:"var(--fg-faint)"}}>
            <StatusDot status={connected?"pass":"fail"}/> {connected ? "connected via Claude Code" : "disconnected"}
            {streaming ? " · streaming…" : ""}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon.close/></button>
      </div>
      <div className="chat-body" ref={scroll}>
        {msgs.map((m, i) => (
          <div key={i} className={\`chat-msg \${m.role}\`}>
            <div className="chat-avatar">{m.role==="assistant"?"M":"U"}</div>
            <div className="bubble">
              {m.info && !m.text ? <p style={{opacity:0.6, fontStyle:'italic', fontSize:11}}>{m.info}</p> : null}
              <p style={{whiteSpace:'pre-wrap'}}>{m.text}{m.streaming && !m.text ? '…' : ''}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="chips-row">
        {suggestions.map(s => <button key={s} className="chip" onClick={()=>setDraft(s)}>{s}</button>)}
      </div>
      <div className="chat-composer">
        <textarea value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={streaming ? "Streaming response…" : "Ask Morbius to run, triage, or explain…"}
          disabled={streaming}/>
        <div className="row">
          <div className="row" style={{gap:4}}>
            <button className="chip"><Icon.link/> Attach</button>
            <button className="chip"><Icon.play/> /run</button>
          </div>
          <button className="btn primary sm" onClick={send} disabled={streaming || !connected}>
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatDrawer });


// ===== tweaks.jsx =====
// tweaks.jsx
const { useState: tS, useEffect: tE } = React;

function TweaksPanel({ tweaks, setTweak }) {
  const [active, setActive] = tS(false);
  tE(() => {
    const h = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setActive(true);
      if (e.data.type === "__deactivate_edit_mode") setActive(false);
    };
    window.addEventListener("message", h);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch {}
    return () => window.removeEventListener("message", h);
  }, []);
  if (!active) return null;

  const seg = (key, label, opts) => (
    <div className="tw-row">
      <div className="lbl">{label}</div>
      <div className="tw-seg">
        {opts.map(o => (
          <button key={o.v} className={tweaks[key]===o.v?"active":""} onClick={()=>setTweak(key, o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );

  const accents = [
    { v:"violet", c:"oklch(0.68 0.17 285)" },
    { v:"green", c:"oklch(0.72 0.16 155)" },
    { v:"amber", c:"oklch(0.78 0.15 75)" },
    { v:"blue", c:"oklch(0.72 0.15 235)" },
  ];

  return (
    <div className="tweaks-panel">
      <div className="tw-head">
        <span>Tweaks</span>
        <span className="pill accent"><span className="dot"/>live</span>
      </div>
      <div className="tw-body">
        {seg("theme", "Theme", [{v:"dark",l:"Dark"},{v:"light",l:"Light"}])}
        <div className="tw-row">
          <div className="lbl">Accent</div>
          <div className="row" style={{gap:8}}>
            {accents.map(a => (
              <span key={a.v} className={\`swatch \${tweaks.accent===a.v?"active":""}\`} style={{background:a.c}} onClick={()=>setTweak("accent", a.v)} title={a.v}/>
            ))}
          </div>
        </div>
        {seg("layout", "Layout", [{v:"sidebar",l:"Sidebar"},{v:"topnav",l:"Top nav"}])}
        {seg("density", "Density", [{v:"compact",l:"Compact"},{v:"balanced",l:"Balanced"},{v:"sparse",l:"Sparse"}])}
        {seg("cardStyle", "Cards", [{v:"bordered",l:"Bordered"},{v:"flat",l:"Flat"},{v:"elevated",l:"Elevated"}])}
      </div>
    </div>
  );
}

Object.assign(window, { TweaksPanel });


// ===== settings.jsx =====
// settings.jsx — Morbius Settings view
// Single-page anchored sections with a sticky in-page rail.

const { useState: sS, useEffect: sE, useMemo: sM, useRef: sR } = React;

// ---- Helpers ----
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle">
      <span className="toggle-copy">
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
      <span
        className={\`toggle-switch \${checked ? "on" : ""}\`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="toggle-knob"/>
      </span>
    </label>
  );
}

function Field({ label, hint, children, width }) {
  return (
    <div className="field" style={width ? {maxWidth: width} : null}>
      <label className="field-label">{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="inp" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={typeof o === "string" ? o : o.v} value={typeof o === "string" ? o : o.v}>{typeof o === "string" ? o : o.l}</option>)}
    </select>
  );
}

function SettingsCard({ title, desc, actions, children, tone }) {
  return (
    <div className={\`st-card \${tone || ""}\`}>
      {(title || actions) && (
        <div className="st-card-head">
          <div>
            {title && <h3 className="st-card-title">{title}</h3>}
            {desc && <p className="st-card-desc">{desc}</p>}
          </div>
          {actions && <div className="row" style={{gap:8}}>{actions}</div>}
        </div>
      )}
      <div className="st-card-body">{children}</div>
    </div>
  );
}

// ---- Section: Profile ----
function ProfileSection() {
  const stored = (() => { try { return JSON.parse(localStorage.getItem('morbius-profile') || 'null'); } catch { return null; } })();
  const [name, setName] = sS(stored?.name || "Saurabh Deshpande");
  const [email, setEmail] = sS(stored?.email || "sdas@redfoundry.com");
  const [role, setRole] = sS(stored?.role || "qa-lead");
  const [tz, setTz] = sS(stored?.tz || "America/Chicago");
  const [saved, setSaved] = sS(false);

  const initials = name.trim().split(/\\s+/).filter(Boolean).map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U';

  const save = () => {
    const data = { name, email, role, tz };
    localStorage.setItem('morbius-profile', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('morbius-profile-saved', { detail: data }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <SettingsCard
      title="Profile"
      desc="How you appear across Morbius — shown on test owners, comments and bug assignees."
      actions={
        <button className={\`btn sm \${saved ? 'ghost' : 'primary'}\`} onClick={save} style={saved ? {color:'var(--ok)', borderColor:'var(--ok)'} : {}}>
          {saved ? <React.Fragment><Icon.check/> Saved</React.Fragment> : 'Save changes'}
        </button>
      }
    >
      <div className="st-profile">
        <div className="st-avatar-lg">
          <span>{initials}</span>
          <button className="st-avatar-edit"><Icon.edit/></button>
        </div>
        <div className="grid g-12" style={{flex:1, gap:14}}>
          <div className="col-6"><Field label="Full name"><input className="inp" value={name} onChange={e=>setName(e.target.value)}/></Field></div>
          <div className="col-6"><Field label="Display email"><input className="inp" value={email} onChange={e=>setEmail(e.target.value)}/></Field></div>
          <div className="col-6"><Field label="Role"><Select value={role} onChange={setRole} options={[{v:"qa-lead",l:"QA Lead"},{v:"qa",l:"QA Engineer"},{v:"dev",l:"Developer"},{v:"pm",l:"Product Manager"}]}/></Field></div>
          <div className="col-6"><Field label="Timezone"><Select value={tz} onChange={setTz} options={["America/Chicago","America/Los_Angeles","America/New_York","Europe/London","Asia/Tokyo","Asia/Kolkata"]}/></Field></div>
        </div>
      </div>
      <div className="st-divider"/>
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-4"><Toggle checked={true} onChange={()=>{}} label="Two-factor auth" hint="TOTP via Authy · enrolled"/></div>
        <div className="col-4"><Toggle checked={true} onChange={()=>{}} label="Session everywhere" hint="3 active sessions"/></div>
        <div className="col-4"><Toggle checked={false} onChange={()=>{}} label="Passkeys" hint="Faster sign-in on this device"/></div>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Workspace ----
function WorkspaceSection() {
  const cfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG || {};
  const projects = window.MORBIUS?.PROJECTS || [];

  // E-024 / S-024-001: live-editable projectType + webUrl. Persists via /api/config/update.
  const [projectType, setProjectType] = sS(cfg.projectType || 'mobile');
  const [webUrl, setWebUrl] = sS(cfg.webUrl || '');
  const [saved, setSaved] = sS(false);
  const saveProjectType = async (next, urlNext) => {
    setProjectType(next);
    if (urlNext !== undefined) setWebUrl(urlNext);
    await fetch('/api/config/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectType: next, webUrl: urlNext !== undefined ? urlNext : webUrl }),
    });
    if (window.MORBIUS?.ACTIVE_PROJECT_CONFIG) {
      window.MORBIUS.ACTIVE_PROJECT_CONFIG.projectType = next;
      if (urlNext !== undefined) window.MORBIUS.ACTIVE_PROJECT_CONFIG.webUrl = urlNext;
    }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  return (
    <SettingsCard
      title="Workspace"
      desc={"Project-level config for " + (cfg.name || "this project") + ". Stored in data/projects.json."}
    >
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-4"><Field label="Active project"><span className="inp" style={{display:"block", padding:"7px 10px", fontSize:12.5, color:"var(--accent)", fontWeight:600}}>{cfg.name || "—"}</span></Field></div>
        <div className="col-4"><Field label="Package ID"><input className="inp mono" defaultValue={cfg.appId || ""} readOnly/></Field></div>
        <div className="col-4"><Field label="Project ID"><input className="inp mono" defaultValue={window.MORBIUS?.ACTIVE_PROJECT || ""} readOnly/></Field></div>
        {/* E-024 / S-024-001: project type + web URL */}
        <div className="col-4">
          <Field label="Project type" hint="Drives which runner is used. Mobile = Maestro; Web = browser MCP; API = reserved.">
            <Select value={projectType} onChange={v => saveProjectType(v, webUrl)} options={[
              { v: 'mobile', l: 'Mobile (Maestro)' },
              { v: 'web', l: 'Web (browser MCP)' },
              { v: 'api', l: 'API (reserved)' },
            ]}/>
          </Field>
        </div>
        {projectType === 'web' && (
          <div className="col-8">
            <Field label="Base URL" hint="Web-app entry point. Used as the target for browser-MCP runs.">
              <input className="inp mono" value={webUrl} placeholder="http://localhost:9000"
                onChange={e => setWebUrl(e.target.value)}
                onBlur={() => saveProjectType(projectType, webUrl)}/>
            </Field>
          </div>
        )}
        <div className="col-12"><Field label="All projects" hint="Switch projects from the sidebar dropdown"><div className="row wrap" style={{gap:6}}>{projects.map(p => <span key={p.id} className={"pill " + (p.id === window.MORBIUS?.ACTIVE_PROJECT ? "accent" : "")}><span className="dot" style={{background: p.id === window.MORBIUS?.ACTIVE_PROJECT ? "var(--accent)" : "var(--fg-faint)"}}/>{p.name}</span>)}</div></Field></div>
      </div>
      {saved && <div className="row" style={{gap:6, marginTop:6}}><span className="pill sq ok" style={{fontSize:10.5}}><Icon.check/> saved</span></div>}
      <div className="st-divider"/>
      <div className="sec-title" style={{marginBottom:8}}>Environments</div>
      <div className="st-envs">
        {[
          {name:"production", url:"api.microair.com", color:"ok", badge:"Live"},
          {name:"staging", url:"stg.microair.com", color:"warn", badge:"Pre-release"},
          {name:"dev", url:"dev.microair.local", color:"info", badge:"Local"},
        ].map(e => (
          <div key={e.name} className="st-env">
            <div className="row" style={{gap:8}}>
              <span className={\`env-dot \${e.color}\`}/>
              <div>
                <div className="st-env-name mono">{e.name}</div>
                <div className="st-env-url mono">{e.url}</div>
              </div>
            </div>
            <span className={\`pill sq \${e.color === "ok" ? "ok" : e.color === "warn" ? "warn" : ""}\`}>{e.badge}</span>
            <button className="icon-btn"><Icon.more/></button>
          </div>
        ))}
        <button className="btn ghost sm st-add"><Icon.plus/> Add environment</button>
      </div>
      <div className="st-divider"/>
      <ExcelImportCard/>
    </SettingsCard>
  );
}

function ExcelImportCard() {
  const cfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG || {};
  const [dragging, setDragging] = sS(false);
  const [status, setStatus] = sS(null); // null | 'uploading' | {ok,categories,testCases,error}

  async function uploadFile(file) {
    if (!file || !file.name.endsWith('.xlsx')) {
      setStatus({ error: 'Please select a .xlsx file.' }); return;
    }
    setStatus('uploading');
    try {
      const res = await fetch('/api/excel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': file.name },
        body: file,
      });
      const result = await res.json();
      setStatus(result);
      if (result.ok && window.loadMorbiusData) {
        await window.loadMorbiusData();
        window.dispatchEvent(new CustomEvent('morbius-data-reloaded'));
      }
    } catch(err) {
      setStatus({ error: String(err) });
    }
  }

  return (
    <div>
      <div className="sec-title" style={{marginBottom:8}}>Re-import from Excel</div>
      {cfg.excel?.source && (
        <div className="mono" style={{fontSize:11, color:'var(--fg-faint)', marginBottom:8}}>
          Current source: {cfg.excel.source.split('/').pop()}
        </div>
      )}
      <div
        className={\`st-upload-zone\${dragging ? ' drag-over' : ''}\`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files[0]); }}
      >
        <Icon.import/>
        <div style={{fontSize:13}}>
          Drop <strong>.xlsx</strong> here or{' '}
          <label style={{color:'var(--accent)', cursor:'pointer', textDecoration:'underline'}}>
            browse
            <input type="file" accept=".xlsx" hidden onChange={e => uploadFile(e.target.files[0])}/>
          </label>
        </div>
        <div style={{fontSize:11, color:'var(--fg-faint)'}}>Existing test cases will be updated in-place</div>
      </div>
      {status === 'uploading' && (
        <div className="row" style={{gap:8, marginTop:8}}>
          <span className="pill warn">Importing…</span>
        </div>
      )}
      {status?.ok && (
        <div className="row" style={{gap:8, marginTop:8}}>
          <span className="pill sq ok"><Icon.check/> {status.testCases} tests across {status.categories} categories imported</span>
          {status.skipped?.length > 0 && <span className="pill">{status.skipped.length} sheets skipped</span>}
        </div>
      )}
      {status?.error && (
        <div style={{marginTop:8, fontSize:12, color:'var(--fail)'}}>{status.error}</div>
      )}
    </div>
  );
}

// ---- Jira Config Form ----
// S-013-002: Jira sync health panel — polls /api/jira/health every 15s, manual "Sync now" + per-queue-item retry/discard.
function JiraHealthPanel() {
  const [health, setHealth] = sS(null);
  const [queue, setQueue] = sS([]);
  const [busy, setBusy] = sS(false);
  const [actionMsg, setActionMsg] = sS(null);

  const refresh = async () => {
    try {
      const [h, q] = await Promise.all([
        fetch('/api/jira/health').then(r => r.json()),
        fetch('/api/jira/queue').then(r => r.json()),
      ]);
      setHealth(h);
      setQueue(Array.isArray(q.queue) ? q.queue : []);
    } catch (e) { /* keep stale */ }
  };

  sE(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const syncNow = async () => {
    setBusy(true); setActionMsg(null);
    try {
      const r = await fetch('/api/bugs/sync-all', { method: 'POST' }).then(r => r.json());
      // Also kick the replay queue immediately
      await fetch('/api/jira/queue/replay', { method: 'POST' });
      setActionMsg(\`Synced: \${r.succeeded || 0}/\${r.total || 0} succeeded, \${r.failed || 0} failed\`);
    } catch (e) {
      setActionMsg('Sync failed: ' + String(e));
    }
    setBusy(false);
    refresh();
  };

  const retryItem = async (id) => {
    setBusy(true);
    await fetch('/api/jira/queue/' + encodeURIComponent(id) + '/retry', { method: 'POST' });
    setBusy(false); refresh();
  };
  const discardItem = async (id) => {
    setBusy(true);
    await fetch('/api/jira/queue/' + encodeURIComponent(id) + '/discard', { method: 'POST' });
    setBusy(false); refresh();
  };

  if (!health) return <div style={{fontSize:12, color:'var(--fg-muted)'}}>Loading sync health…</div>;

  const toneFor = (s) => s === 'healthy' ? 'pass' : s === 'degraded' ? 'flaky' : s === 'broken' ? 'fail' : 'none';
  const fmtTime = (iso) => {
    if (!iso) return 'never';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return Math.floor(diff) + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return new Date(iso).toLocaleString();
  };

  return (
    <div style={{marginBottom:18}}>
      <div className="sec-title" style={{marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span>Sync health</span>
        <button className="btn ghost sm" onClick={syncNow} disabled={busy || !health.configured}>
          <Icon.sync/> {busy ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      <div className="row wrap" style={{gap:14, marginBottom:10}}>
        <span className={\`pill sq \${toneFor(health.status)}\`} style={{textTransform:'uppercase', fontSize:10.5, letterSpacing:0.5}}>
          <span className="dot"/>{health.status}
        </span>
        <span style={{fontSize:11.5, color:'var(--fg-muted)'}}>Last success: <span className="mono">{fmtTime(health.lastSuccessAt)}</span></span>
        <span style={{fontSize:11.5, color:'var(--fg-muted)'}}>Last error: <span className="mono">{fmtTime(health.lastErrorAt)}</span></span>
        <span style={{fontSize:11.5, color:'var(--fg-muted)'}}>Queue: <span className="mono">{health.queueCount}</span>{health.stuckCount > 0 ? <span className="mono" style={{color:'var(--status-fail, #E5484D)'}}> · {health.stuckCount} stuck</span> : null}</span>
      </div>

      {health.remediation && (
        <div style={{padding:'8px 10px', background:'var(--bg-elev, #161616)', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--fg-muted)', marginBottom:10}}>
          {health.remediation}
        </div>
      )}

      {actionMsg && <div style={{fontSize:11.5, color:'var(--fg-muted)', marginBottom:10}}>{actionMsg}</div>}

      {health.errorsLast5 && health.errorsLast5.length > 0 && (
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Recent errors</div>
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            {health.errorsLast5.map((e, i) => (
              <div key={i} className="mono" style={{fontSize:11, color:'var(--fg-muted)', padding:'4px 8px', background:'var(--bg-elev, #161616)', borderRadius:4}}>
                <span style={{color:'var(--status-fail, #E5484D)'}}>{e.code}</span>
                {e.status ? <span> {e.status}</span> : null}
                <span style={{color:'var(--fg-faint)'}}> · {fmtTime(e.ts)}</span>
                {e.bugId ? <span style={{color:'var(--fg-faint)'}}> · {e.bugId}</span> : null}
                <span> · {e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div>
          <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Replay queue ({queue.length})</div>
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            {queue.map((q) => (
              <div key={q.id} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--bg-elev, #161616)', borderRadius:4, fontSize:11.5}}>
                <span className="mono" style={{color: q.stuck ? 'var(--status-fail, #E5484D)' : 'var(--fg-muted)'}}>
                  {q.stuck ? 'STUCK' : 'PENDING'}
                </span>
                <span className="mono" style={{color:'var(--fg-muted)'}}>{q.kind}</span>
                <span className="mono">{q.bugId}</span>
                <span style={{flex:1, color:'var(--fg-faint)'}}>×{q.attempts} · {q.lastError?.code} {q.lastError?.message?.slice(0, 80) || ''}</span>
                <button className="btn ghost sm" onClick={() => retryItem(q.id)} disabled={busy}>Retry</button>
                <button className="btn ghost sm" onClick={() => discardItem(q.id)} disabled={busy}>Discard</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// E-023 / S-023-001: PMAgent project link + filesystem stat check.
function PMAgentConfigForm() {
  const cfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG || {};
  const [slug, setSlug] = sS(cfg.pmagentSlug || '');
  const [pathOverride, setPathOverride] = sS(cfg.pmagentPath || '');
  const [saved, setSaved] = sS(false);
  const [testing, setTesting] = sS(false);
  const [testResult, setTestResult] = sS(null);

  const save = async () => {
    await fetch('/api/config/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pmagentSlug: slug.trim() || undefined, pmagentPath: pathOverride.trim() || undefined }),
    });
    if (window.MORBIUS?.ACTIVE_PROJECT_CONFIG) {
      window.MORBIUS.ACTIVE_PROJECT_CONFIG.pmagentSlug = slug.trim() || undefined;
      window.MORBIUS.ACTIVE_PROJECT_CONFIG.pmagentPath = pathOverride.trim() || undefined;
    }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const testPath = async () => {
    if (!slug.trim() && !pathOverride.trim()) { setTestResult({ ok: false, msg: 'Set a slug or override path first.' }); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch('/api/pmagent/test-path', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmagentSlug: slug.trim(), pmagentPath: pathOverride.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({ ok: true, msg: 'Path resolved · ' + (data.epicCount ?? 0) + ' epics, ' + (data.storyCount ?? 0) + ' stories at ' + (data.resolvedPath || '?') });
      } else {
        setTestResult({ ok: false, msg: data.error || ('HTTP ' + res.status) });
      }
    } catch (e) { setTestResult({ ok: false, msg: 'Network error: ' + String(e) }); }
    setTesting(false);
  };

  return (
    <div>
      <div className="sec-title" style={{marginBottom:10}}>PMAgent link</div>
      <div className="grid g-12" style={{gap:12}}>
        <div className="col-6">
          <Field label="PMAgent slug" hint="The folder name under PMAgent's projects/ — e.g. morbius">
            <input className="inp mono" value={slug} placeholder="morbius" onChange={e=>setSlug(e.target.value)}/>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Path override (optional)" hint="Defaults to $PMAGENT_HOME/projects/<slug>">
            <input className="inp mono" value={pathOverride} placeholder="/Users/sdas/PMAgent/projects/morbius" onChange={e=>setPathOverride(e.target.value)}/>
          </Field>
        </div>
      </div>
      <div className="row" style={{gap:8, marginTop:12}}>
        <button className="btn ghost sm" onClick={testPath} disabled={testing}>
          {testing ? 'Checking…' : <React.Fragment><Icon.check/> Test path</React.Fragment>}
        </button>
        <button className={\`btn sm \${saved ? 'ghost' : 'primary'}\`} onClick={save} style={saved ? {color:'var(--ok)',borderColor:'var(--ok)'} : {}}>
          {saved ? <React.Fragment><Icon.check/> Saved</React.Fragment> : 'Save link'}
        </button>
        {testResult && (
          <span className={\`pill sq \${testResult.ok ? 'ok' : 'fail'}\`}>
            {testResult.ok ? <Icon.check/> : null} {testResult.msg}
          </span>
        )}
      </div>
    </div>
  );
}

function JiraConfigForm() {
  const cfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.jira || {};
  const [cloudId, setCloudId] = sS(cfg.cloudId || '');
  const [email, setEmail] = sS(cfg.email || '');
  const [token, setToken] = sS(cfg.token || '');
  const [projectKey, setProjectKey] = sS(cfg.projectKey || '');
  const [saved, setSaved] = sS(false);
  const [testing, setTesting] = sS(false);
  const [testResult, setTestResult] = sS(null);

  const save = async () => {
    await fetch('/api/config/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jira: { cloudId, email, token, projectKey } }),
    });
    // Update window.MORBIUS so the integration card reflects new state immediately
    if (window.MORBIUS?.ACTIVE_PROJECT_CONFIG) {
      window.MORBIUS.ACTIVE_PROJECT_CONFIG.jira = { cloudId, email, token, projectKey };
    }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const testConnection = async () => {
    if (!cloudId || !token) { setTestResult({ ok: false, msg: 'Fill in Cloud ID and API token first.' }); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(\`https://api.atlassian.com/ex/jira/\${cloudId}/rest/api/3/myself\`, {
        headers: { 'Authorization': 'Basic ' + btoa(email + ':' + token), 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({ ok: true, msg: 'Connected as ' + (data.displayName || data.emailAddress || 'user') });
      } else {
        setTestResult({ ok: false, msg: 'Auth failed ('+res.status+') — check your email and API token.' });
      }
    } catch(e) {
      setTestResult({ ok: false, msg: 'Network error: ' + String(e) });
    }
    setTesting(false);
  };

  return (
    <div>
      <JiraHealthPanel/>
      <div className="sec-title" style={{marginBottom:10}}>Jira credentials</div>
      <div className="grid g-12" style={{gap:12}}>
        <div className="col-6">
          <Field label="Cloud ID" hint="Your Atlassian subdomain (e.g. mycompany)">
            <input className="inp mono" value={cloudId} placeholder="mycompany" onChange={e=>setCloudId(e.target.value)}/>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Project key" hint="Jira project key (e.g. MA, STS)">
            <input className="inp mono" value={projectKey} placeholder="MA" onChange={e=>setProjectKey(e.target.value.toUpperCase())}/>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Atlassian email">
            <input className="inp" type="email" value={email} placeholder="you@company.com" onChange={e=>setEmail(e.target.value)}/>
          </Field>
        </div>
        <div className="col-6">
          <Field label="API token" hint={<span>Generate at <span className="mono" style={{fontSize:10.5}}>id.atlassian.com/manage-profile/security/api-tokens</span></span>}>
            <input className="inp mono" type="password" value={token} placeholder="••••••••••••••••" onChange={e=>setToken(e.target.value)}/>
          </Field>
        </div>
      </div>
      <div className="row" style={{gap:8, marginTop:12}}>
        <button className="btn ghost sm" onClick={testConnection} disabled={testing}>
          {testing ? 'Testing…' : <React.Fragment><Icon.sync/> Test connection</React.Fragment>}
        </button>
        <button className={\`btn sm \${saved ? 'ghost' : 'primary'}\`} onClick={save} style={saved ? {color:'var(--ok)',borderColor:'var(--ok)'} : {}}>
          {saved ? <React.Fragment><Icon.check/> Saved</React.Fragment> : 'Save credentials'}
        </button>
        {testResult && (
          <span className={\`pill sq \${testResult.ok ? 'ok' : 'fail'}\`}>
            {testResult.ok ? <Icon.check/> : null} {testResult.msg}
          </span>
        )}
      </div>
    </div>
  );
}

// ---- Section: Integrations ----
function IntegrationsSection() {
  const jiraCfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.jira || {};
  const excelSrc = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.excel?.source || '';
  const integrations = [
    { k:"jira", name:"Jira", sub: jiraCfg.cloudId ? jiraCfg.cloudId+'.atlassian.net · '+jiraCfg.projectKey : "Not configured", connected:!!jiraCfg.cloudId, events:"bug-sync", time: jiraCfg.cloudId ? "configured" : "",
      logo: <div className="st-logo" style={{background:"#1d4ed8"}}>J</div> },
    { k:"slack", name:"Slack", sub:"Not connected", connected:false,
      logo: <div className="st-logo" style={{background:"#4A154B"}}>S</div> },
    { k:"github", name:"GitHub", sub:"Not connected", connected:false,
      logo: <div className="st-logo" style={{background:"#0d1117"}}>G</div> },
    { k:"bstack", name:"BrowserStack", sub:"Not connected", connected:false,
      logo: <div className="st-logo" style={{background:"#e77c22"}}>B</div> },
    { k:"excel", name:"Excel / Sheets", sub: excelSrc ? excelSrc.split('/').pop()+' · read-only' : "No source configured", connected:!!excelSrc, events:"test import", time: excelSrc ? "imported" : "",
      logo: <div className="st-logo" style={{background:"#107c41"}}>X</div> },
    { k:"tf", name:"TestFlight", sub:"Not connected", connected:false,
      logo: <div className="st-logo" style={{background:"#0071e3"}}>TF</div> },
  ];
  return (
    <SettingsCard
      title="Integrations"
      desc="Connect Morbius to your stack. Secrets are stored in HashiCorp Vault."
      actions={<button className="btn ghost sm"><Icon.plus/> Browse directory</button>}
    >
      <div className="st-integ-grid">
        {integrations.map(i => (
          <div key={i.k} className={\`st-integ \${i.connected ? "connected" : ""}\`}>
            {i.logo}
            <div style={{minWidth:0, flex:1}}>
              <div className="row between" style={{gap:8}}>
                <div style={{fontWeight:600, fontSize:13}}>{i.name}</div>
                {i.connected
                  ? <span className="pill sq ok"><span className="dot"/>connected</span>
                  : <span className="pill sq">disabled</span>}
              </div>
              <div style={{fontSize:11.5, color:"var(--fg-muted)", marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{i.sub}</div>
              {i.connected && (
                <div className="row" style={{gap:6, marginTop:8}}>
                  <span className="pill">{i.events}</span>
                  <span className="mono" style={{fontSize:10.5, color:"var(--fg-faint)"}}>{i.time}</span>
                </div>
              )}
            </div>
            <button className="btn ghost sm st-integ-action">{i.connected ? "Configure" : "Connect"}</button>
          </div>
        ))}
      </div>

      <div className="st-divider"/>
      <JiraConfigForm/>
      <div className="st-divider"/>
      <PMAgentConfigForm/>
      <div className="st-divider"/>
      <div className="sec-title" style={{marginBottom:8}}>Jira field mapping</div>
      <div className="st-mapping">
        {[
          ["Morbius status", "Jira status", ["Open","Triage","In progress","Closed"]],
          ["Morbius priority", "Jira priority", ["P0 → Blocker","P1 → Critical","P2 → Major","P3 → Minor"]],
          ["Bug category", "Jira label", ["auto-mapped from 26 categories"]],
        ].map(([l, r, rows], i) => (
          <div key={i} className="st-map-row">
            <div className="st-map-col">{l}</div>
            <Icon.chevron/>
            <div className="st-map-col">{r}</div>
            <div className="st-map-chips">
              {rows.map(x => <span key={x} className="pill sq">{x}</span>)}
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

// ---- Section: MCP ----
function MCPSection() {
  const servers = [
    { name:"morbius-context", transport:"stdio", cmd:"/usr/local/bin/morbius-mcp", tools:8, status:"connected", latency:"12ms", since:"running 4d",
      tools_list:["get_test_cases","get_bugs","get_devices","run_suite","get_run","search_yaml","lookup_jira","summarize_run"] },
    { name:"maestro-local", transport:"stdio", cmd:"maestro mcp --flows ./maestro", tools:5, status:"connected", latency:"9ms", since:"running 4d",
      tools_list:["list_flows","run_flow","get_flow_yaml","record_flow","validate_yaml"] },
    { name:"jira-mcp", transport:"sse", cmd:"https://mcp.atlassian.com/sse", tools:12, status:"connected", latency:"181ms", since:"running 2d",
      tools_list:["search_issues","create_issue","update_status","add_comment","get_project"] },
    { name:"browserstack-mcp", transport:"http", cmd:"https://bs-mcp.example/api", tools:0, status:"error", latency:"—", since:"auth failed",
      tools_list:[] },
  ];
  const [openName, setOpenName] = sS("morbius-context");
  return (
    <SettingsCard
      title="MCP servers"
      desc="Model Context Protocol endpoints that power Morbius — the agent (and Claude inside Morbius) can call any tool surfaced here."
      actions={<React.Fragment>
        <button className="btn ghost sm"><Icon.sync/> Scan</button>
        <button className="btn primary sm"><Icon.plus/> Add server</button>
      </React.Fragment>}
    >
      <div className="st-mcp">
        <div className="st-mcp-list">
          {servers.map(s => (
            <div
              key={s.name}
              className={\`st-mcp-item \${openName === s.name ? "active" : ""} \${s.status}\`}
              onClick={() => setOpenName(s.name)}
            >
              <div className="row between">
                <div className="row" style={{gap:8, minWidth:0}}>
                  <span className={\`env-dot \${s.status === "connected" ? "ok" : "fail"}\`}/>
                  <span className="mono" style={{fontSize:12.5, fontWeight:600}}>{s.name}</span>
                </div>
                <span className="pill sq">{s.transport}</span>
              </div>
              <div className="mono st-mcp-cmd">{s.cmd}</div>
              <div className="row between" style={{marginTop:6, fontSize:11, color:"var(--fg-muted)"}}>
                <span>{s.tools} tools</span>
                <span>{s.latency} · {s.since}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="st-mcp-detail">
          {(() => {
            const s = servers.find(x => x.name === openName) || servers[0];
            return (
              <React.Fragment>
                <div className="row between" style={{marginBottom:10}}>
                  <div>
                    <div className="mono" style={{fontSize:14, fontWeight:600}}>{s.name}</div>
                    <div style={{fontSize:11.5, color:"var(--fg-muted)", marginTop:2}}>
                      {s.status === "connected"
                        ? <span className="row" style={{gap:6}}><StatusDot status="pass"/>Connected · {s.latency} roundtrip</span>
                        : <span className="row" style={{gap:6}}><StatusDot status="fail"/>Auth failed — check credentials</span>}
                    </div>
                  </div>
                  <div className="row" style={{gap:6}}>
                    <button className="btn ghost sm"><Icon.sync/> Reconnect</button>
                    <button className="btn ghost sm">Logs</button>
                    <button className="btn ghost sm"><Icon.more/></button>
                  </div>
                </div>

                <div className="st-mcp-config mono">
                  <div className="st-mcp-line"><span className="tk-key">transport</span>: <span className="tk-str">"{s.transport}"</span></div>
                  <div className="st-mcp-line"><span className="tk-key">command</span>: <span className="tk-str">"{s.cmd}"</span></div>
                  <div className="st-mcp-line"><span className="tk-key">env</span>:</div>
                  <div className="st-mcp-line" style={{paddingLeft:18}}><span className="tk-key">MCP_LOG_LEVEL</span>: <span className="tk-str">"info"</span></div>
                  <div className="st-mcp-line" style={{paddingLeft:18}}><span className="tk-key">MORBIUS_PROJECT</span>: <span className="tk-str">"microair-connectrv"</span></div>
                  <div className="st-mcp-line"><span className="tk-key">timeout_ms</span>: <span className="tk-num">30000</span></div>
                  <div className="st-mcp-line"><span className="tk-key">auto_reconnect</span>: <span className="tk-num">true</span></div>
                </div>

                <div className="sec-title" style={{margin:"14px 0 8px"}}>Exposed tools · {s.tools_list.length}</div>
                {s.tools_list.length ? (
                  <div className="st-mcp-tools">
                    {s.tools_list.map(t => (
                      <div key={t} className="st-mcp-tool">
                        <Icon.zap/>
                        <span className="mono" style={{fontSize:11.5}}>{t}</span>
                        <Toggle checked={true} onChange={()=>{}} label="" hint=""/>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:12, color:"var(--fg-faint)", padding:"10px 0"}}>No tools surfaced — server is not responding.</div>
                )}

                <div className="st-divider"/>
                <div className="grid g-12" style={{gap:10}}>
                  <div className="col-6"><Toggle checked={true} onChange={()=>{}} label="Available to agent" hint="Morbius can invoke these tools"/></div>
                  <div className="col-6"><Toggle checked={false} onChange={()=>{}} label="Require approval" hint="Prompt before each tool call"/></div>
                </div>
              </React.Fragment>
            );
          })()}
        </div>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Devices ----
function DevicesSettings() {
  const cfgDevices = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.devices || [];
  const devices = cfgDevices.map(d => ({
    n: d.name, os: d.platform === "ios" ? "iOS" : "Android",
    status: "idle", last: "—", tag: d.platform === "ios" ? "iOS" : "Android",
    plat: d.platform,
  }));
  return (
    <SettingsCard
      title="Devices"
      desc="Registered test targets. Local USB + BrowserStack cloud shown side-by-side."
      actions={<React.Fragment>
        <button className="btn ghost sm"><Icon.sync/> Rescan USB</button>
        <button className="btn primary sm"><Icon.plus/> Add device</button>
      </React.Fragment>}
    >
      <div className="st-devices">
        {devices.map(d => (
          <div key={d.n} className="st-device">
            <div className="st-device-icon">
              {d.plat === "ios" || d.n.includes("iPhone") || d.n.includes("iPad") ? <Icon.apple/> : <Icon.android/>}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div className="row between"><span style={{fontWeight:600, fontSize:13}}>{d.n}</span><span className="pill">{d.tag}</span></div>
              <div style={{fontSize:11.5, color:"var(--fg-muted)", marginTop:2}}>{d.os}</div>
              <div className="row" style={{gap:8, marginTop:8}}>
                <span className={\`pill sq \${d.status === "idle" ? "ok" : d.status === "booting" ? "warn" : ""}\`}>
                  <span className="dot"/>{d.status}
                </span>
                <span className="mono" style={{fontSize:10.5, color:"var(--fg-faint)"}}>{d.last}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="st-divider"/>
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-6"><Toggle checked={true} onChange={()=>{}} label="Auto-detect new USB devices" hint="Polls adb/idevice every 30s"/></div>
        <div className="col-6"><Toggle checked={false} onChange={()=>{}} label="Mirror to BrowserStack" hint="Parallel cloud run per local run"/></div>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Maestro ----
function MaestroSettings() {
  const maestroCfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.maestro || {};
  const rawEnv = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.env || {};
  const [shards, setShards] = sS(String(maestroCfg.parallelShards || '4'));
  const [retry, setRetry] = sS(String(maestroCfg.retryOnFlake ?? 2));
  const [androidPath, setAndroidPath] = sS(maestroCfg.androidPath || './maestro');
  const [iosPath, setIosPath] = sS(maestroCfg.iosPath || './maestro');
  const [envVars, setEnvVars] = sS(Object.entries(rawEnv).map(([k,v]) => ({ k, v: String(v) })));
  const [saved, setSaved] = sS(false);

  const save = async () => {
    const env = Object.fromEntries(envVars.filter(e => e.k.trim()).map(e => [e.k.trim(), e.v]));
    await fetch('/api/config/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maestro: { parallelShards: +shards, retryOnFlake: +retry, androidPath, iosPath }, env }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const updateEnvRow = (i, field, val) => setEnvVars(rows => rows.map((r, idx) => idx === i ? {...r, [field]: val} : r));
  const removeEnvRow = (i) => setEnvVars(rows => rows.filter((_, idx) => idx !== i));

  return (
    <SettingsCard
      title="Maestro defaults"
      desc="Applies to every flow run unless overridden at the flow level."
      actions={
        <button className={\`btn sm \${saved ? 'ghost' : 'primary'}\`} onClick={save} style={saved ? {color:'var(--ok)',borderColor:'var(--ok)'} : {}}>
          {saved ? <React.Fragment><Icon.check/> Saved</React.Fragment> : 'Save'}
        </button>
      }
    >
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-4"><Field label="Parallel shards" hint="Per-device concurrency cap">
          <Select value={shards} onChange={setShards} options={["1","2","4","8","16"]}/>
        </Field></div>
        <div className="col-4"><Field label="Retry on flake">
          <Select value={retry} onChange={setRetry} options={[{v:"0",l:"No retry"},{v:"1",l:"1 retry"},{v:"2",l:"2 retries"},{v:"3",l:"3 retries"}]}/>
        </Field></div>
        <div className="col-6"><Field label="Android flows path" hint="Absolute path to .yaml files">
          <input className="inp mono" value={androidPath} onChange={e=>setAndroidPath(e.target.value)}/>
        </Field></div>
        <div className="col-6"><Field label="iOS flows path">
          <input className="inp mono" value={iosPath} onChange={e=>setIosPath(e.target.value)}/>
        </Field></div>
      </div>
      <div className="st-divider"/>
      <div className="sec-title" style={{marginBottom:8}}>Environment variables</div>
      <div className="st-env-vars">
        {envVars.map((row, i) => (
          <div key={i} className="st-env-var">
            <input className="inp mono" style={{width:200, fontSize:11.5}} placeholder="KEY" value={row.k} onChange={e=>updateEnvRow(i,'k',e.target.value)}/>
            <span style={{color:'var(--fg-faint)'}}>═</span>
            <input className="inp mono" style={{flex:1, fontSize:11.5}} placeholder="value" value={row.v} onChange={e=>updateEnvRow(i,'v',e.target.value)}/>
            <button className="icon-btn" onClick={()=>removeEnvRow(i)}><Icon.close/></button>
          </div>
        ))}
        <button className="btn ghost sm st-add" onClick={()=>setEnvVars(r=>[...r,{k:'',v:''}])}>
          <Icon.plus/> Add variable
        </button>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Test Runs ----
function TestRunsSettings() {
  const stored = (() => { try { return JSON.parse(localStorage.getItem('morbius-run-settings') || 'null'); } catch { return null; } })();
  const [threshold, setThreshold] = sS(stored?.threshold ?? 15);
  const [autoFile, setAutoFile] = sS(stored?.autoFile ?? true);
  const [recordFailed, setRecordFailed] = sS(stored?.recordFailed ?? true);
  const [blockCI, setBlockCI] = sS(stored?.blockCI ?? false);
  const [saved, setSaved] = sS(false);

  const save = () => {
    localStorage.setItem('morbius-run-settings', JSON.stringify({ threshold, autoFile, recordFailed, blockCI }));
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  return (
    <SettingsCard
      title="Test runs"
      desc="Scheduling, retries, flaky threshold and failure handling."
      actions={
        <button className={\`btn sm \${saved ? 'ghost' : 'primary'}\`} onClick={save} style={saved ? {color:'var(--ok)',borderColor:'var(--ok)'} : {}}>
          {saved ? <React.Fragment><Icon.check/> Saved</React.Fragment> : 'Save'}
        </button>
      }
    >
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-6">
          <Field label="Full suite schedule" hint="Cron · America/Chicago"><input className="inp mono" defaultValue={stored?.suiteSchedule || "0 2 * * *"}/></Field>
        </div>
        <div className="col-6">
          <Field label="Smoke schedule"><input className="inp mono" defaultValue={stored?.smokeSchedule || "0 */4 * * *"}/></Field>
        </div>
        <div className="col-12">
          <Field label={<span>Flaky threshold · <span className="mono" style={{color:"var(--accent)"}}>{threshold}%</span></span>}
            hint="Tests failing this % of the last 10 runs are marked flaky.">
            <input type="range" min="5" max="50" value={threshold} onChange={e=>setThreshold(+e.target.value)} className="st-slider"/>
          </Field>
        </div>
      </div>
      <div className="st-divider"/>
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-4"><Toggle checked={autoFile} onChange={setAutoFile} label="Auto-file bugs" hint="P0/P1 fails → Jira"/></div>
        <div className="col-4"><Toggle checked={recordFailed} onChange={setRecordFailed} label="Record failed runs" hint="Video + adb logcat"/></div>
        <div className="col-4"><Toggle checked={blockCI} onChange={setBlockCI} label="Block CI on P0 fail" hint="Fail the GitHub Actions check"/></div>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Notifications ----
const NOTIF_EVENTS = [
  { key: "suite_run",    name: "Suite run completes", cadence: "digest",    def: [true,  true,  true]  },
  { key: "p0_bug",       name: "P0 / P1 bug filed",   cadence: "immediate", def: [true,  true,  true]  },
  { key: "flaky_test",   name: "Flaky test detected",  cadence: "immediate", def: [true,  false, true]  },
  { key: "jira_change",  name: "Jira status change",   cadence: "event",     def: [false, true,  false] },
  { key: "device_off",   name: "Device goes offline",  cadence: "immediate", def: [false, true,  true]  },
  { key: "weekly_report",name: "Weekly report",         cadence: "digest",    def: [true,  false, false] },
];

function loadNotifState() {
  try {
    const raw = localStorage.getItem('morbius-notifications');
    if (raw) return JSON.parse(raw);
  } catch {}
  const def = {};
  NOTIF_EVENTS.forEach(e => { def[e.key] = e.def; });
  return def;
}

function NotificationsSection() {
  const [matrix, setMatrix] = sS(loadNotifState);
  const [quietFrom, setQuietFrom] = sS(() => { try { return JSON.parse(localStorage.getItem('morbius-notif-meta') || 'null')?.quietFrom || '22:00'; } catch { return '22:00'; }});
  const [quietTo, setQuietTo] = sS(() => { try { return JSON.parse(localStorage.getItem('morbius-notif-meta') || 'null')?.quietTo || '08:00'; } catch { return '08:00'; }});
  const [digest, setDigest] = sS(() => { try { return JSON.parse(localStorage.getItem('morbius-notif-meta') || 'null')?.digest || 'daily'; } catch { return 'daily'; }});

  const toggle = (eventKey, col) => {
    setMatrix(prev => {
      const next = { ...prev, [eventKey]: [...prev[eventKey]] };
      next[eventKey][col] = !next[eventKey][col];
      localStorage.setItem('morbius-notifications', JSON.stringify(next));
      return next;
    });
  };

  const saveMeta = (from, to, dg) => {
    localStorage.setItem('morbius-notif-meta', JSON.stringify({ quietFrom: from, quietTo: to, digest: dg }));
  };

  return (
    <SettingsCard
      title="Notifications"
      desc="Route events to the channel that fits. Quiet hours apply to Slack & email."
    >
      <div className="st-notif">
        <div className="st-notif-head">
          <div>Event</div>
          <div className="row" style={{gap:6, justifyContent:"center"}}><Icon.chat/><span>In-app</span></div>
          <div className="row" style={{gap:6, justifyContent:"center"}}><Icon.tag/><span>Email</span></div>
          <div className="row" style={{gap:6, justifyContent:"center"}}><div className="st-logo-sm" style={{background:"#4A154B"}}>S</div><span>Slack</span></div>
        </div>
        {NOTIF_EVENTS.map((ev) => {
          const row = matrix[ev.key] || ev.def;
          return (
            <div key={ev.key} className="st-notif-row">
              <div>
                <div style={{fontSize:13, fontWeight:500}}>{ev.name}</div>
                <div style={{fontSize:11, color:"var(--fg-faint)"}}>{ev.cadence}</div>
              </div>
              <div className="st-cell"><Checkbox checked={row[0]} onChange={() => toggle(ev.key, 0)}/></div>
              <div className="st-cell"><Checkbox checked={row[1]} onChange={() => toggle(ev.key, 1)}/></div>
              <div className="st-cell"><Checkbox checked={row[2]} onChange={() => toggle(ev.key, 2)}/></div>
            </div>
          );
        })}
      </div>
      <div className="st-divider"/>
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-6">
          <Field label="Quiet hours">
            <div className="row" style={{gap:8}}>
              <input className="inp mono" value={quietFrom} onChange={e => { setQuietFrom(e.target.value); saveMeta(e.target.value, quietTo, digest); }} style={{width:90}}/>
              <span style={{color:"var(--fg-faint)"}}>→</span>
              <input className="inp mono" value={quietTo} onChange={e => { setQuietTo(e.target.value); saveMeta(quietFrom, e.target.value, digest); }} style={{width:90}}/>
            </div>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Digest frequency">
            <Select value={digest} onChange={v => { setDigest(v); saveMeta(quietFrom, quietTo, v); }} options={[{v:"realtime",l:"Realtime"},{v:"hourly",l:"Hourly"},{v:"daily",l:"Daily at 9am"},{v:"weekly",l:"Weekly"}]}/>
          </Field>
        </div>
      </div>
    </SettingsCard>
  );
}

function Checkbox({ checked, onChange }) {
  const [on, setOn] = sS(checked);
  const handleClick = () => {
    setOn(!on);
    onChange && onChange(!on);
  };
  return (
    <span className={\`st-check \${on ? "on" : ""}\`} onClick={handleClick}>
      {on && <Icon.check/>}
    </span>
  );
}

// ---- Section: Appearance ----
function AppearanceSection({ tweaks, setTweak }) {
  const accents = [
    { k:"violet", c:"oklch(0.68 0.17 285)" },
    { k:"green", c:"oklch(0.72 0.16 155)" },
    { k:"blue", c:"oklch(0.72 0.15 235)" },
    { k:"amber", c:"oklch(0.78 0.15 75)" },
  ];
  return (
    <SettingsCard
      title="Appearance"
      desc="Personal visual preferences. Also accessible from the Tweaks panel."
    >
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-6">
          <Field label="Theme">
            <div className="seg">
              <button className={\`seg-b \${(tweaks.theme||"dark")==="dark"?"on":""}\`} onClick={()=>setTweak("theme","dark")}><Icon.moon/> Dark</button>
              <button className={\`seg-b \${tweaks.theme==="light"?"on":""}\`} onClick={()=>setTweak("theme","light")}><Icon.sun/> Light</button>
            </div>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Accent">
            <div className="row" style={{gap:8, flexWrap:"wrap"}}>
              {accents.map(a => (
                <button key={a.k}
                  className={\`st-swatch \${(tweaks.accent||"violet")===a.k?"on":""}\`}
                  onClick={()=>setTweak("accent", a.k)}
                  style={{background:a.c}}
                  title={a.k}
                />
              ))}
            </div>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Density">
            <div className="seg">
              {["compact","balanced","sparse"].map(d => (
                <button key={d} className={\`seg-b \${(tweaks.density||"balanced")===d?"on":""}\`} onClick={()=>setTweak("density",d)}>{d}</button>
              ))}
            </div>
          </Field>
        </div>
        <div className="col-6">
          <Field label="Card style">
            <div className="seg">
              {["bordered","flat","elevated"].map(s => (
                <button key={s} className={\`seg-b \${(tweaks.cardStyle||"bordered")===s?"on":""}\`} onClick={()=>setTweak("cardStyle",s)}>{s}</button>
              ))}
            </div>
          </Field>
        </div>
        <div className="col-12">
          <Field label="Navigation layout">
            <div className="seg">
              <button className={\`seg-b \${(tweaks.layout||"sidebar")==="sidebar"?"on":""}\`} onClick={()=>setTweak("layout","sidebar")}><Icon.sidebar/> Sidebar</button>
              <button className={\`seg-b \${tweaks.layout==="topnav"?"on":""}\`} onClick={()=>setTweak("layout","topnav")}><Icon.layout/> Top nav</button>
            </div>
          </Field>
        </div>
      </div>
    </SettingsCard>
  );
}

// ---- Section: API keys & webhooks ----
function APISection() {
  const keys = [
    { name:"ci-github-actions", created:"Mar 14, 2026", lastUsed:"2m ago", scopes:["run:write","read"] },
    { name:"mcp-local", created:"Jan 08, 2026", lastUsed:"1d ago", scopes:["read","tools:exec"] },
    { name:"analytics-export", created:"Nov 22, 2025", lastUsed:"never", scopes:["read"] },
  ];
  return (
    <SettingsCard
      title="API keys & webhooks"
      desc="Machine credentials for CI, MCP and external services."
      actions={<button className="btn primary sm"><Icon.plus/> New key</button>}
    >
      <table className="st-table">
        <thead><tr><th>Name</th><th>Scopes</th><th>Created</th><th>Last used</th><th></th></tr></thead>
        <tbody>
          {keys.map(k => (
            <tr key={k.name}>
              <td className="mono" style={{fontSize:12.5}}>{k.name}</td>
              <td><div className="row" style={{gap:4, flexWrap:"wrap"}}>{k.scopes.map(s => <span key={s} className="pill sq">{s}</span>)}</div></td>
              <td style={{fontSize:12, color:"var(--fg-muted)"}}>{k.created}</td>
              <td style={{fontSize:12, color:"var(--fg-muted)"}}>{k.lastUsed}</td>
              <td style={{textAlign:"right"}}><button className="icon-btn"><Icon.more/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="st-divider"/>
      <div className="sec-title" style={{marginBottom:8}}>Outbound webhooks</div>
      <div className="st-webhooks">
        <div className="st-webhook">
          <div className="row" style={{gap:10, minWidth:0}}>
            <span className="env-dot ok"/>
            <div style={{minWidth:0}}>
              <div className="mono" style={{fontSize:12}}>https://hooks.microair.com/morbius/runs</div>
              <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:2}}>run.completed, bug.created — 12 deliveries today</div>
            </div>
          </div>
          <button className="icon-btn"><Icon.more/></button>
        </div>
        <button className="btn ghost sm st-add"><Icon.plus/> Add webhook</button>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Data & privacy ----
function DataSection() {
  return (
    <SettingsCard
      title="Data & privacy"
      desc="Retention, exports, and audit trail."
    >
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-4"><Field label="Run artifact retention"><Select value="90" onChange={()=>{}} options={[{v:"30",l:"30 days"},{v:"90",l:"90 days"},{v:"180",l:"180 days"},{v:"365",l:"1 year"},{v:"forever",l:"Forever"}]}/></Field></div>
        <div className="col-4"><Field label="Video / screenshots"><Select value="failed" onChange={()=>{}} options={[{v:"all",l:"Keep all"},{v:"failed",l:"Only failed runs"},{v:"none",l:"Never"}]}/></Field></div>
        <div className="col-4"><Field label="PII scrubbing"><Select value="on" onChange={()=>{}} options={[{v:"on",l:"Automatic"},{v:"manual",l:"Manual only"},{v:"off",l:"Disabled"}]}/></Field></div>
      </div>
      <div className="st-divider"/>
      <div className="row" style={{gap:8}}>
        <button className="btn ghost sm"><Icon.import/> Export workspace</button>
        <button className="btn ghost sm">View audit log</button>
        <button className="btn ghost sm">Data processing agreement</button>
      </div>
    </SettingsCard>
  );
}

// ---- Section: Billing ----
function BillingSection() {
  return (
    <SettingsCard
      title="Billing & plan"
      desc="Current plan, usage and invoices."
    >
      <div className="st-plan">
        <div>
          <div className="row" style={{gap:8, marginBottom:6}}>
            <span className="pill sq accent"><span className="dot"/>Team</span>
            <span style={{fontSize:12, color:"var(--fg-muted)"}}>Renews Apr 22, 2026</span>
          </div>
          <div style={{fontSize:24, fontWeight:700, letterSpacing:"-0.02em"}}>$199 <span style={{fontSize:13, color:"var(--fg-faint)", fontWeight:400}}>/ month</span></div>
          <div style={{fontSize:12, color:"var(--fg-muted)", marginTop:4}}>5 seats · unlimited runs · 90-day retention</div>
        </div>
        <div className="st-plan-meter">
          <div className="row between" style={{fontSize:12}}><span>Device minutes</span><span className="mono">3,420 / 10,000</span></div>
          <div className="bar mini"><div style={{width:"34%", background:"var(--accent)"}}/></div>
          <div className="row between" style={{fontSize:12, marginTop:10}}><span>Storage</span><span className="mono">48 GB / 200 GB</span></div>
          <div className="bar mini"><div style={{width:"24%", background:"var(--ok)"}}/></div>
        </div>
      </div>
      <div className="st-divider"/>
      <div className="row" style={{gap:8}}>
        <button className="btn primary sm">Upgrade plan</button>
        <button className="btn ghost sm">Update payment method</button>
        <button className="btn ghost sm">Download invoices</button>
      </div>
    </SettingsCard>
  );
}

// ---- Danger zone ----
function DangerZone() {
  return (
    <SettingsCard tone="danger" title="Danger zone" desc="Irreversible actions. We'll ask you to type the project name to confirm.">
      <div className="st-danger-row">
        <div>
          <div style={{fontWeight:600, fontSize:13}}>Reset test history</div>
          <div style={{fontSize:12, color:"var(--fg-muted)"}}>Clears all run artifacts, keeps test definitions.</div>
        </div>
        <button className="btn ghost sm danger">Reset history</button>
      </div>
      <div className="st-danger-row">
        <div>
          <div style={{fontWeight:600, fontSize:13}}>Archive workspace</div>
          <div style={{fontSize:12, color:"var(--fg-muted)"}}>Read-only mode. Can be restored by an owner.</div>
        </div>
        <button className="btn ghost sm danger">Archive</button>
      </div>
      <div className="st-danger-row">
        <div>
          <div style={{fontWeight:600, fontSize:13, color:"var(--fail)"}}>Delete workspace</div>
          <div style={{fontSize:12, color:"var(--fg-muted)"}}>Permanent. All data purged within 7 days.</div>
        </div>
        <button className="btn ghost sm danger-solid">Delete…</button>
      </div>
    </SettingsCard>
  );
}

// ---- Main Settings view ----
function SettingsView({ tweaks, setTweak }) {
  const [scope, setScope] = sS("workspace");
  const [active, setActive] = sS("profile");
  const bodyRef = sR(null);

  const sections = [
    { k:"profile", l:"Profile", ic:Icon.settings, scope:"personal" },
    { k:"workspace", l:"Workspace", ic:Icon.dashboard, scope:"workspace" },
    // team section removed — single-user localhost
    { k:"integrations", l:"Integrations", ic:Icon.link, scope:"workspace" },
    { k:"mcp", l:"MCP servers", ic:Icon.zap, scope:"workspace", badge:"4" },
    { k:"devices", l:"Devices", ic:Icon.devices, scope:"workspace" },
    { k:"maestro", l:"Maestro", ic:Icon.maestro, scope:"workspace" },
    { k:"runs", l:"Test runs", ic:Icon.runs, scope:"workspace" },
    { k:"notifs", l:"Notifications", ic:Icon.chat, scope:"personal" },
    { k:"appearance", l:"Appearance", ic:Icon.sun, scope:"personal" },
    { k:"api", l:"API & webhooks", ic:Icon.kbd, scope:"workspace" },
    { k:"data", l:"Data & privacy", ic:Icon.import, scope:"workspace" },
    // billing removed — localhost, no subscription needed
  ];
  const visible = sections.filter(s => scope === "all" || s.scope === scope);

  // Scroll-spy
  sE(() => {
    const root = bodyRef.current;
    if (!root) return;
    const onScroll = () => {
      const anchors = root.querySelectorAll("[data-sec]");
      let cur = active;
      const top = root.scrollTop + 140;
      anchors.forEach(a => { if (a.offsetTop <= top) cur = a.dataset.sec; });
      if (cur !== active) setActive(cur);
    };
    root.addEventListener("scroll", onScroll);
    return () => root.removeEventListener("scroll", onScroll);
  }, [active, scope]);

  const jump = (k) => {
    const el = bodyRef.current?.querySelector(\`[data-sec="\${k}"]\`);
    if (el) bodyRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    setActive(k);
  };

  return (
    <div className="st-shell">
      <aside className="st-rail">
        <div className="st-scope">
          <button className={\`st-scope-b \${scope==="personal"?"on":""}\`} onClick={()=>setScope("personal")}>Personal</button>
          <button className={\`st-scope-b \${scope==="workspace"?"on":""}\`} onClick={()=>setScope("workspace")}>Workspace</button>
        </div>
        <nav className="st-rail-nav">
          {visible.map(s => (
            <button key={s.k} className={\`st-rail-item \${active===s.k?"active":""}\`} onClick={()=>jump(s.k)}>
              <s.ic/>
              <span>{s.l}</span>
              {s.badge && <span className="count">{s.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="st-rail-foot">
          <div className="mono" style={{fontSize:10.5, color:"var(--fg-faint)"}}>Morbius · localhost</div>
          <div className="mono" style={{fontSize:10.5, color:"var(--fg-faint)"}}>{window.MORBIUS?.ACTIVE_PROJECT || "no project"}</div>
        </div>
      </aside>

      <div className="st-body" ref={bodyRef}>
        <div className="st-content">
          {visible.find(s => s.k === "profile") && <section data-sec="profile"><ProfileSection/></section>}
          {visible.find(s => s.k === "workspace") && <section data-sec="workspace"><WorkspaceSection/></section>}
          {/* team management hidden for single-user localhost */}
          {visible.find(s => s.k === "integrations") && <section data-sec="integrations"><IntegrationsSection/></section>}
          {visible.find(s => s.k === "mcp") && <section data-sec="mcp"><MCPSection/></section>}
          {visible.find(s => s.k === "devices") && <section data-sec="devices"><DevicesSettings/></section>}
          {visible.find(s => s.k === "maestro") && <section data-sec="maestro"><MaestroSettings/></section>}
          {visible.find(s => s.k === "runs") && <section data-sec="runs"><TestRunsSettings/></section>}
          {visible.find(s => s.k === "notifs") && <section data-sec="notifs"><NotificationsSection/></section>}
          {visible.find(s => s.k === "appearance") && <section data-sec="appearance"><AppearanceSection tweaks={tweaks} setTweak={setTweak}/></section>}
          {visible.find(s => s.k === "api") && <section data-sec="api"><APISection/></section>}
          {visible.find(s => s.k === "data") && <section data-sec="data"><DataSection/></section>}
          {/* billing hidden for localhost */}
          {scope === "workspace" && <section data-sec="danger"><DangerZone/></section>}
        </div>
      </div>
    </div>
  );
}

window.SettingsView = SettingsView;


// ===== new_app.jsx =====
// app.jsx — shell, routing, detail panels, tweaks wiring

const { useState: aS, useEffect: aE, useMemo: aM, useCallback: aC } = React;

function useHealth() {
  const [health, setHealth] = aS(null);
  const [polling, setPolling] = aS(false);
  const refresh = React.useCallback(async () => {
    setPolling(true);
    try {
      const r = await fetch('/api/health');
      const j = await r.json();
      setHealth(j);
    } catch { /* keep prior */ }
    setPolling(false);
  }, []);
  aE(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/health');
        const j = await r.json();
        if (!cancelled) setHealth(j);
      } catch { /* keep prior value */ }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return { health, refresh, polling };
}

// ===== Detail drawer (test + bug) =====
// S-015-003: Inline changelog accordion — collapsed by default; cap render at 20 entries (the AC's
// "pagination or virtual scrolling prevents performance issues" — at 20 a flat list is the cheapest fix).
function ChangelogAccordion({ entries, fmtTime }) {
  const [open, setOpen] = aS(false);
  const last20 = (entries || []).slice(-20).reverse(); // newest first
  const count = (entries || []).length;
  const truncated = count > 20;
  return (
    <section>
      <div
        className="sec-title"
        onClick={() => count > 0 && setOpen(o => !o)}
        style={{display:'flex', alignItems:'center', gap:6, cursor: count > 0 ? 'pointer' : 'default', userSelect:'none'}}
      >
        <span>Changelog · {count}</span>
        {count > 0 && (
          <Icon.chevronDown style={{transform: open ? 'rotate(180deg)' : 'none', transition:'transform 120ms', opacity:0.6, marginLeft:'auto'}}/>
        )}
      </div>
      {count === 0 ? (
        <div style={{fontSize:12, color:'var(--fg-faint)'}}>No edits recorded.</div>
      ) : open ? (
        <div style={{display:'flex', flexDirection:'column', gap:3}}>
          {truncated && (
            <div style={{fontSize:11, color:'var(--fg-faint)', padding:'4px 0'}}>
              Showing newest 20 of {count} entries.
            </div>
          )}
          {last20.map((e, i) => (
            <div key={i} style={{padding:'5px 8px', background:'var(--bg-elev)', borderRadius:4, fontSize:11.5, display:'flex', alignItems:'center', gap:8, lineHeight:1.5}}>
              <span className="mono" style={{color:'var(--fg-faint)', minWidth:110}}>{fmtTime(e.timestamp)}</span>
              <span className="mono" style={{color:'var(--fg-muted)', minWidth:80}}>{e.field}</span>
              <span style={{flex:1, minWidth:0}}>
                <span style={{color:'var(--fg-faint)', textDecoration:'line-through'}}>{e.oldValue || '∅'}</span>
                <span style={{color:'var(--fg-muted)', margin:'0 4px'}}>→</span>
                <span>{e.newValue || '∅'}</span>
              </span>
              <span style={{color:'var(--fg-faint)', fontSize:10.5}}>{e.actor || '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// Phase 2: one-tap bug capture — creates a BUG pre-linked to this test, ready to enrich in the
// Bugs view. Device defaults to the project's first configured device; a blocked card seeds the
// failure reason from its blocker.
function FileBugButton({ test }) {
  const [busy, setBusy] = aS(false);
  const [done, setDone] = aS(null);   // {id} on success | {err} on failure
  const cfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG || {};
  const fileBug = async () => {
    setBusy(true); setDone(null);
    try {
      const r = await fetch('/api/bugs/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '[' + test.id + '] ' + (test.title || 'Bug'),
          priority: test.priority || 'P2',
          category: test.cat || 'unknown',
          linkedTest: test.id,
          device: (cfg.devices && cfg.devices[0] && cfg.devices[0].id) || 'unknown',
          failureReason: test.blocked ? test.blockedReason : '',
        }),
      });
      const j = await r.json();
      if (j.ok && j.bug) setDone({ id: j.bug.id });
      else setDone({ err: j.error || ('HTTP ' + r.status) });
    } catch (e) { setDone({ err: String(e) }); }
    setBusy(false);
  };
  if (done && done.id) {
    return <span className="pill sq ok" style={{fontSize:10.5}} title="Created — open the Bugs tab to triage">🐛 {done.id} ✓</span>;
  }
  return (
    <React.Fragment>
      <button className="btn ghost sm" onClick={fileBug} disabled={busy} title="Create a bug linked to this test case">
        <Icon.bug/> {busy ? 'Filing…' : 'Bug'}
      </button>
      {done && done.err && <span className="pill sq fail" style={{fontSize:10.5}}>✗ {done.err}</span>}
    </React.Fragment>
  );
}

// E-024 / S-024-004 + S-024-005: Run buttons gated by project type.
// - mobile → existing Android/iOS buttons (legacy behavior; placeholder until wired)
// - web    → "Run headless" + "Run visual" via /api/test/run-web
// - api    → reserved (no v1 runner) — disabled with hint
function RunButtons({ test, onRunFinished }) {
  const cfg = window.MORBIUS?.ACTIVE_PROJECT_CONFIG || {};
  const projectType = cfg.projectType || 'mobile';
  const [busy, setBusy] = aS(null);   // null | 'headless' | 'visual'
  const [lastResult, setLastResult] = aS(null);

  const runWeb = async (mode) => {
    setBusy(mode); setLastResult(null);
    try {
      const r = await fetch('/api/test/run-web', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, mode }),
      });
      const j = await r.json();
      setLastResult({ ok: j.ok, msg: j.ok
        ? '✓ ' + (j.status || '?') + ' · ' + (j.screenshotCount || 0) + ' 📸 · ' + Math.round((j.durationMs || 0)/1000) + 's'
        : '✗ ' + (j.errorLine || j.error || ('HTTP ' + r.status))
      });
      if (onRunFinished) onRunFinished();
    } catch (e) { setLastResult({ ok: false, msg: '✗ ' + String(e) }); }
    setBusy(null);
  };

  // mobile — fire a Maestro run on the chosen platform, then watch the run stream for the
  // 'done' event (mirrors the Maestro view). Graceful pill on the no-flow / CLI-missing 400.
  const runMobile = async (platform) => {
    setBusy(platform); setLastResult(null);
    try {
      const r = await fetch('/api/test/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, platform }),
      });
      const j = await r.json();
      if (!r.ok || !j.runId) {
        setLastResult({ ok: false, msg: '✗ ' + (j.error || ('HTTP ' + r.status)) });
        setBusy(null);
        return;
      }
      const port = location.port || '3000';
      const ws = new WebSocket('ws://' + location.hostname + ':' + port + '/ws/run-stream');
      let done = false;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', runId: j.runId }));
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.type === 'done') {
          done = true;
          setLastResult({ ok: d.status === 'pass',
            msg: (d.status === 'pass' ? '✓ pass' : '✗ ' + (d.friendlyError || d.failingStep || 'fail')) + (d.device ? ' · ' + d.device : '') });
          setBusy(null);
          if (onRunFinished) onRunFinished();
          ws.close();
        }
      };
      ws.onerror = () => { if (!done) { setLastResult({ ok: false, msg: '✗ stream error — check Runs tab' }); setBusy(null); } };
      ws.onclose = () => { if (!done) { setBusy(null); if (onRunFinished) onRunFinished(); } };
    } catch (e) {
      setLastResult({ ok: false, msg: '✗ ' + String(e) });
      setBusy(null);
    }
  };

  if (projectType === 'web') {
    if (!cfg.webUrl) {
      return <span className="pill sq" style={{fontSize:10.5, color:'var(--warn)'}} title="Set webUrl in Settings → Workspace">no webUrl</span>;
    }
    return (
      <React.Fragment>
        <button className={\`btn sm \${busy === 'headless' ? 'ghost' : ''}\`} onClick={() => runWeb('headless')} disabled={!!busy}
          title={'Run headless via Claude + Playwright MCP against ' + cfg.webUrl}>
          <Icon.play/> {busy === 'headless' ? 'Running…' : 'Run headless'}
        </button>
        <button className="btn ghost sm" onClick={() => runWeb('visual')} disabled={!!busy}
          title="Run visual via Claude in Chrome (debug)">
          {busy === 'visual' ? 'Running…' : 'Visual'}
        </button>
        {lastResult && (
          <span className={\`pill sq \${lastResult.ok ? 'ok' : 'fail'}\`} style={{fontSize:10.5}}>{lastResult.msg}</span>
        )}
      </React.Fragment>
    );
  }
  if (projectType === 'api') {
    return <button className="btn sm" disabled title="API runner not implemented in v1"><Icon.play/> Run (api: TBD)</button>;
  }
  // mobile — per-platform Maestro run against the project's configured device platforms.
  const mobPlatforms = [...new Set((cfg.devices || []).map(d => d.platform || 'android'))];
  const runPlats = ['ios','android'].filter(p => mobPlatforms.includes(p));
  const platLabel = { ios: 'iOS', android: 'Android' };
  return (
    <React.Fragment>
      {/* Two side-by-side accent-filled buttons read as competing primaries —
          per-platform runs are peer actions; the suite-level CTA lives in the topbar. */}
      {(runPlats.length ? runPlats : ['android']).map(p => (
        <button key={p} className={\`btn sm \${busy === p ? 'ghost' : ''}\`} onClick={() => runMobile(p)} disabled={!!busy}
          title={'Run the linked Maestro flow on ' + (platLabel[p] || p)}>
          <Icon.play/> {busy === p ? 'Running…' : ('Run ' + (platLabel[p] || p))}
        </button>
      ))}
      {lastResult && (
        <span className={\`pill sq \${lastResult.ok ? 'ok' : 'fail'}\`} style={{fontSize:10.5}}>{lastResult.msg}</span>
      )}
    </React.Fragment>
  );
}

function TestDrawer({ test, onClose, onSelectBug, setView }) {
  // Hooks first — early return must come AFTER hook calls (Rules of Hooks).
  const [runs, setRuns] = aS(null);
  const [expandedRunId, setExpandedRunId] = aS(null);
  // S-015-002: detail fetched from /api/test/:id — gives maestroHtml + maestroYaml + selectorWarnings
  const [detail, setDetail] = aS(null);
  const testId = test?.id;
  aE(() => {
    if (!testId) { setRuns(null); setExpandedRunId(null); setDetail(null); return; }
    let cancelled = false;
    setRuns(null); setExpandedRunId(null); setDetail(null);
    (async () => {
      try {
        const [hRes, dRes] = await Promise.all([
          fetch('/api/runs/' + encodeURIComponent(testId) + '/history'),
          fetch('/api/test/' + encodeURIComponent(testId)),
        ]);
        const h = await hRes.json();
        const d = await dRes.json();
        if (!cancelled) {
          setRuns(Array.isArray(h) ? h : []);
          setDetail(d && typeof d === 'object' ? d : null);
        }
      } catch {
        if (!cancelled) { setRuns([]); setDetail(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [testId]);

  if (!test) return null;
  const { BUGS } = window.MORBIUS;
  const linked = BUGS.filter(b => b.linkedTest === test.id);

  const fmtTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  };
  const fmtDur = (ms) => {
    if (!ms || ms <= 0) return '—';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms/1000).toFixed(1) + 's';
    return Math.floor(ms/60000) + 'm ' + Math.floor((ms%60000)/1000) + 's';
  };

  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head">
          {/* Row 1: id + status + actions. The title gets its own full-width row below
              (CSS order:10 + 2-line clamp) — squeezed between buttons it truncated to "S…". */}
          <span className="dr-id">{test.id}</span>
          <StatusPill status={test.status}/>
          <span style={{flex:1}}/>
          {/* E-024 / S-024-004 + S-024-005: project-type-aware Run buttons */}
          <RunButtons test={test} onRunFinished={() => setRuns(null)}/>
          <FileBugButton test={test}/>
          <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close"><Icon.close/></button>
          <h2>{test.title}</h2>
        </div>
        <div className="drawer-body">
          <section>
            <div className="sec-title">Overview</div>
            <div className="pair"><span className="k">Type</span><span>{test.type}</span></div>
            <div className="pair"><span className="k">Priority</span><span>{test.priority}</span></div>
            <div className="pair"><span className="k">Owner</span><span className="row" style={{gap:6}}><Avatar initials={test.owner} size={18}/> {test.owner}</span></div>
            <div className="pair"><span className="k">Last run</span><span className="mono">{test.status === "not-run" ? "—" : test.lastRun}</span></div>
            <div className="pair"><span className="k">YAML</span><span>{test.yaml ? <span className="pill sq accent"><span className="dot"/>linked</span> : <span className="pill">unlinked</span>}</span></div>
          </section>

          {/* S-015-002: real Steps from detail.steps (markdown body from Excel), not a hardcoded placeholder.
              The in-memory TEST_CASES projection (line ~4544) strips steps/acceptanceCriteria — so we
              source from /api/test/:id (the detail state) which has the full markdown. */}
          <section>
            <div className="sec-title">Steps</div>
            {/* Render as markdown through the same pipeline as the board's right panel —
                these fields ARE markdown (curated PMAgent plans), and raw "**ID:**" text
                in the drawer was the loudest unpolished surface in the app. Imports often
                stuff the same plan into both steps and acceptanceCriteria; suppress the
                AC copy when it's just the steps doc again. */}
            {detail === null ? (
              <div style={{fontSize:12, color:"var(--fg-faint)"}}>Loading…</div>
            ) : detail.steps ? (
              <div className="md-doc" style={{fontSize:12.5}} dangerouslySetInnerHTML={{__html: mdToHtml(dedupeTestPlanBody(detail.steps))}}/>
            ) : (
              <div style={{fontSize:12, color:"var(--fg-faint)"}}>No steps recorded.</div>
            )}
            {(() => {
              const ac = detail?.acceptanceCriteria;
              if (!ac) return null;
              const norm = s => String(s).replace(/\\s+/g, ' ').trim().slice(0, 120);
              if (detail.steps && norm(ac) === norm(detail.steps)) return null;
              return (
                <div style={{marginTop:10}}>
                  <div style={{fontSize:11, color:"var(--fg-faint)", textTransform:'uppercase', letterSpacing:0.5, marginBottom:4}}>Acceptance criteria</div>
                  <div className="md-doc" style={{fontSize:12.5}} dangerouslySetInnerHTML={{__html: mdToHtml(dedupeTestPlanBody(ac))}}/>
                </div>
              );
            })()}
          </section>

          {/* S-015-002: Maestro flow — rendered human-readable steps via stepsToHtml (server-side parsed) */}
          <section>
            <div className="sec-title">Flow</div>
            {detail === null ? (
              <div style={{fontSize:12, color:"var(--fg-faint)"}}>Loading…</div>
            ) : detail.maestroHtml ? (
              <React.Fragment>
                <div className="maestro-flow-host" style={{fontSize:12, lineHeight:1.6}} dangerouslySetInnerHTML={{__html: detail.maestroHtml}}/>
                {Array.isArray(detail.selectorWarnings) && detail.selectorWarnings.length > 0 && (
                  <div style={{marginTop:10, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-elev)'}}>
                    <div style={{fontSize:11, color:'var(--warn, #F5A623)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Selector warnings · {detail.selectorWarnings.length}</div>
                    {detail.selectorWarnings.slice(0, 5).map((w, i) => (
                      <div key={i} style={{fontSize:11.5, color:'var(--fg-muted)', marginBottom:3}}>
                        <span className="mono" style={{color:'var(--fg-faint)'}}>L{w.line}</span> · <span className="mono">{w.command}</span> · {w.issue}
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ) : (
              <div style={{padding:'12px 14px', border:'1px dashed var(--border)', borderRadius:6, fontSize:12.5, color:'var(--fg-muted)', lineHeight:1.6}}>
                <div style={{fontWeight:600, color:'var(--fg)', marginBottom:4}}>No automated flow yet</div>
                This test case isn't linked to a Maestro YAML flow. AppMap v2 (E-018) surfaces automation candidates with one-click YAML scaffolding{setView ? <React.Fragment> — <span style={{color:'var(--accent)', cursor:'pointer', textDecoration:'underline'}} onClick={() => { onClose && onClose(); setView('appmap'); }}>open App Map</span></React.Fragment> : null}.
              </div>
            )}
          </section>

          {Object.keys(test.devices || {}).length > 0 && (
            <section>
              <div className="sec-title">Device coverage</div>
              <div className="grid g-12" style={{gap:8}}>
                {Object.entries(test.devices).map(([k, v]) => (
                  <div className="col-6" key={k}>
                    <div className="row" style={{gap:8, padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, background:"var(--bg-elev)"}}>
                      <span className={\`cell-dot \${v==="not-run"?"none":v}\`} style={{width:14,height:14,borderRadius:3,display:"inline-block"}}/>
                      <span style={{fontSize:12.5}}>{k.replace(/-/g," ")}</span>
                      <span style={{marginLeft:"auto", fontSize:11, color:"var(--fg-muted)"}}>{v}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* S-015-001: Linked bugs — clickable rows open the BugDrawer (in-place, test context preserved) */}
          <section>
            <div className="sec-title">Linked bugs · {linked.length}</div>
            {linked.length ? linked.map(b => (
              <div
                className="row between"
                key={b.id}
                onClick={() => onSelectBug && onSelectBug(b)}
                style={{padding:"8px 0", borderBottom:"1px dashed var(--border)", cursor: onSelectBug ? 'pointer' : 'default'}}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elev)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div className="row" style={{gap:8, minWidth:0}}>
                  <span className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{b.id}</span>
                  <span style={{fontSize:12.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{b.title}</span>
                </div>
                <StatusPill status={b.status}/>
              </div>
            )) : <div style={{fontSize:12, color:"var(--fg-faint)"}}>No bugs linked.</div>}
          </section>

          {/* S-015-003: Inline changelog accordion — last 20 entries from detail.changelog */}
          <ChangelogAccordion entries={detail?.changelog || []} fmtTime={fmtTime}/>

          {/* S-015-001: Run history — real per-test runs from /api/runs/:testId/history, last 10 newest first */}
          <section>
            <div className="sec-title">Run history{runs ? ' · ' + Math.min(runs.length, 10) : ''}</div>
            {runs === null ? (
              <div style={{fontSize:12, color:"var(--fg-faint)"}}>Loading…</div>
            ) : runs.length === 0 ? (
              <div style={{fontSize:12, color:"var(--fg-faint)"}}>No runs recorded yet.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:3}}>
                {runs.slice(0, 10).map(r => (
                  <React.Fragment key={r.runId}>
                    <div
                      onClick={() => setExpandedRunId(id => id === r.runId ? null : r.runId)}
                      style={{display:'flex', alignItems:'center', gap:8, padding:"6px 8px", borderRadius:4, cursor:'pointer', background: expandedRunId===r.runId ? 'var(--bg-hover)' : 'var(--bg-elev)'}}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = expandedRunId===r.runId ? 'var(--bg-hover)' : 'var(--bg-elev)'}
                    >
                      {/* E-024 / S-024-002: render generic RunRecord — show runner badge + targetUrl/screenshot count for web runs, failingStep for Maestro */}
                      <StatusDot status={r.status}/>
                      <span className="mono" style={{fontSize:11, color:'var(--fg-muted)', minWidth:120}}>{fmtTime(r.startTime)}</span>
                      <span style={{fontSize:10, color:'var(--fg-faint)', minWidth:80, textTransform:'uppercase', letterSpacing:0.5}}>
                        {r.runner === 'web-headless' ? 'web · headless' : r.runner === 'web-visual' ? 'web · visual' : (r.target || r.platform || r.runner || '—')}
                      </span>
                      <span style={{flex:1, fontSize:11.5}}>
                        {r.failingStep
                          ? r.failingStep
                          : (r.targetUrl
                              ? <span className="mono" style={{color:'var(--fg-muted)'}}>{r.targetUrl} · {(r.screenshots && r.screenshots.length) || 0} 📸</span>
                              : (r.status === 'pass' ? 'All steps passed' : '—'))}
                      </span>
                      <span className="mono" style={{fontSize:10.5, color:'var(--fg-faint)'}}>{fmtDur(r.durationMs)}</span>
                      <Icon.chevronDown style={{transform: expandedRunId===r.runId ? 'rotate(180deg)' : 'none', transition:'transform 120ms', opacity:0.6}}/>
                    </div>
                    {expandedRunId === r.runId && (
                      <RunDetailPanel run={r}/>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </React.Fragment>
  );
}

// S-016-004: Impact panel — fetches /api/bug/:id/impact, allows regenerate, shows
// rerun/manualVerify/narrative with rationale + flag-as-not-relevant per row.
// Risk score uses the green/yellow/red band from S-016-005.
function BugImpactPanel({ bugId, onSelectTest }) {
  const [impact, setImpact] = aS(null);
  const [flags, setFlags] = aS([]);
  const [loading, setLoading] = aS(true);
  const [generating, setGenerating] = aS(false);
  const [error, setError] = aS(null);

  const refresh = async () => {
    if (!bugId) return;
    try {
      const [iRes, fRes] = await Promise.all([
        fetch('/api/bug/' + encodeURIComponent(bugId) + '/impact').then(r => r.json()),
        fetch('/api/bug/' + encodeURIComponent(bugId) + '/impact/flags').then(r => r.json()),
      ]);
      setImpact(iRes?.impact || null);
      setFlags(Array.isArray(fRes?.flags) ? fRes.flags : []);
      setLoading(false);
    } catch (e) { setError(String(e)); setLoading(false); }
  };

  aE(() => { setLoading(true); setImpact(null); setFlags([]); setError(null); refresh(); }, [bugId]);

  const regenerate = async () => {
    setGenerating(true); setError(null);
    try {
      const r = await fetch('/api/bug/' + encodeURIComponent(bugId) + '/impact/generate', { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.error || ('Generation failed: HTTP ' + r.status)); }
      else { setImpact(j.impact); }
    } catch (e) { setError(String(e)); }
    setGenerating(false);
    refresh();
  };

  const flagToggle = async (testId, kind) => {
    try {
      const r = await fetch('/api/bug/' + encodeURIComponent(bugId) + '/impact/flag', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, kind, reason: '' }),
      });
      const j = await r.json();
      if (j.ok) setFlags(j.flags || []);
    } catch { /* keep stale */ }
  };
  const isFlagged = (testId, kind) => flags.some(f => f.testId === testId && f.kind === kind);

  const fmtTime = (iso) => {
    if (!iso) return '—';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)   return Math.floor(diff) + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return new Date(iso).toLocaleString();
  };

  const riskBand = (score) => {
    if (score < 0.3) return { label: 'Low',    cls: 'ok',    color: 'var(--ok, #45E0A8)' };
    if (score < 0.7) return { label: 'Medium', cls: 'warn',  color: 'var(--warn, #F5A623)' };
    return                  { label: 'High',   cls: 'fail',  color: 'var(--fail, #E5484D)' };
  };

  const renderRow = (row, kind, accent) => {
    const flagged = isFlagged(row.testId, kind);
    return (
      <div key={kind + '-' + row.testId}
        style={{display:'flex', alignItems:'flex-start', gap:8, padding:'6px 8px', borderRadius:4, background: 'var(--bg-elev)', borderLeft: '3px solid ' + accent, marginBottom:4, opacity: flagged ? 0.4 : 1}}>
        <span className="mono" style={{fontSize:11, color:'var(--fg-muted)', minWidth:80, paddingTop:1, cursor: onSelectTest ? 'pointer' : 'default', textDecoration: onSelectTest ? 'underline' : 'none'}}
              onClick={() => onSelectTest && onSelectTest(row.testId)}>{row.testId}</span>
        <span style={{flex:1, fontSize:11.5, lineHeight:1.5, textDecoration: flagged ? 'line-through' : 'none'}}>{row.rationale || '—'}</span>
        <button className="btn ghost sm" style={{padding:'2px 6px', fontSize:10.5}} onClick={() => flagToggle(row.testId, kind)} title={flagged ? 'Unflag' : 'Flag as not relevant'}>
          {flagged ? '↩ Unflag' : '✕ Flag'}
        </button>
      </div>
    );
  };

  if (loading) return <section><div className="sec-title">Impact</div><div style={{fontSize:12, color:'var(--fg-faint)'}}>Loading…</div></section>;

  if (!impact) {
    return (
      <section>
        <div className="sec-title" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <span>Impact</span>
          <button className="btn primary sm" onClick={regenerate} disabled={generating}>
            {generating ? 'Generating…' : <React.Fragment><Icon.spark/> Generate impact</React.Fragment>}
          </button>
        </div>
        {error && <div style={{padding:'8px 10px', border:'1px solid var(--fail, #E5484D)', borderRadius:6, color:'var(--fail, #E5484D)', fontSize:12, marginTop:6}}>{error}</div>}
        <div style={{fontSize:12, color:'var(--fg-faint)', marginTop:6}}>
          No impact analysis yet. Click <strong>Generate impact</strong> to ask Claude for related tests, manual-verify candidates, and a repro narrative.
        </div>
      </section>
    );
  }

  const band = riskBand(impact.riskScore || 0);
  const pct = Math.round((impact.riskScore || 0) * 100);

  return (
    <section>
      <div className="sec-title" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span>Impact</span>
        <button className="btn ghost sm" onClick={regenerate} disabled={generating}>
          <Icon.sync/> {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10, padding:'8px 10px', background:'var(--bg-elev)', borderRadius:6}}>
        <div style={{display:'flex', flexDirection:'column', gap:2}}>
          <span style={{fontSize:10.5, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5}}>Risk</span>
          <span className={'pill sq ' + band.cls} style={{fontSize:11}}><span className="dot"/>{band.label}</span>
        </div>
        <div style={{flex:1, display:'flex', alignItems:'center', gap:8}}>
          <div style={{flex:1, height:6, background:'var(--bg)', borderRadius:3, overflow:'hidden'}}>
            <div style={{width: pct + '%', height:'100%', background: band.color, transition:'width 240ms'}}/>
          </div>
          <span className="mono" style={{fontSize:11, color:'var(--fg-muted)', minWidth:40}}>{pct}%</span>
        </div>
        <div style={{fontSize:10.5, color:'var(--fg-faint)'}}>
          Generated {fmtTime(impact.generatedAt)}
          {impact.modelDurationMs ? <span> · {(impact.modelDurationMs/1000).toFixed(1)}s</span> : null}
        </div>
      </div>

      {error && <div style={{padding:'8px 10px', border:'1px solid var(--fail, #E5484D)', borderRadius:6, color:'var(--fail, #E5484D)', fontSize:12, marginBottom:10}}>{error}</div>}

      <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6, marginTop:4, color:'var(--fail, #E5484D)'}}>
        Tests to rerun · {impact.rerun?.length || 0}
      </div>
      {(impact.rerun?.length || 0) === 0
        ? <div style={{fontSize:12, color:'var(--fg-faint)', marginBottom:10}}>None.</div>
        : <div style={{marginBottom:12}}>{impact.rerun.map(r => renderRow(r, 'rerun', 'var(--fail, #E5484D)'))}</div>
      }

      <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6, color:'var(--warn, #F5A623)'}}>
        Manual verify · {impact.manualVerify?.length || 0}
      </div>
      {(impact.manualVerify?.length || 0) === 0
        ? <div style={{fontSize:12, color:'var(--fg-faint)', marginBottom:10}}>None.</div>
        : <div style={{marginBottom:12}}>{impact.manualVerify.map(r => renderRow(r, 'manualVerify', 'var(--warn, #F5A623)'))}</div>
      }

      <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Repro narrative</div>
      <div style={{fontSize:12, color:'var(--fg-muted)', whiteSpace:'pre-wrap', lineHeight:1.6, padding:'8px 10px', background:'var(--bg-elev)', borderRadius:4}}>
        {impact.reproNarrative || '_None._'}
      </div>
    </section>
  );
}

function BugDrawer({ bug, onClose, onSelectTest }) {
  if (!bug) return null;
  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head">
          <span className="dr-id">{bug.id}</span>
          {bug.jira && <span className="pill sq accent"><span className="dot"/>Jira · {bug.jira}</span>}
          <span className={\`pill sq \${bug.priority==="P1"?"fail":bug.priority==="P2"?"warn":""}\`}>{bug.priority}</span>
          <StatusPill status={bug.status}/>
          <span style={{flex:1}}/>
          <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close"><Icon.close/></button>
          <h2>{bug.title}</h2>
        </div>
        <div className="drawer-body">
          <section>
            <div className="pair"><span className="k">Device</span><span>{bug.device}</span></div>
            <div className="pair"><span className="k">Assignee</span><span className="row" style={{gap:6}}><Avatar initials={bug.assignee} size={18}/> {bug.assignee}</span></div>
            {bug.linkedTest && <div className="pair"><span className="k">Linked test</span><span className="mono">{bug.linkedTest}</span></div>}
            <div className="pair"><span className="k">Created</span><span className="mono">{bug.created}</span></div>
          </section>

          {/* S-016-004: Impact panel */}
          <BugImpactPanel bugId={bug.id} onSelectTest={onSelectTest}/>

          {bug.failureReason && (
            <section>
              <div className="sec-title">Failure reason</div>
              <div className="yaml-block">{bug.failureReason}</div>
            </section>
          )}

          <section>
            <div className="sec-title">Expected vs actual</div>
            <div className="grid g-12" style={{gap:10}}>
              <div className="col-6"><div style={{padding:12, border:"1px solid var(--border)", borderRadius:8, background:"var(--bg-elev)"}}>
                <div style={{fontSize:10.5, color:"var(--ok)", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:4}}>Expected</div>
                <div style={{fontSize:12.5}}>Feature behaves as specified in the test case.</div>
              </div></div>
              <div className="col-6"><div style={{padding:12, border:"1px solid var(--fail)", borderRadius:8, background:"var(--fail-bg)"}}>
                <div style={{fontSize:10.5, color:"var(--fail)", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:4}}>Actual</div>
                <div style={{fontSize:12.5}}>{bug.failureReason || "Unexpected behavior observed."}</div>
              </div></div>
            </div>
          </section>

          <section>
            <div className="sec-title">Activity</div>
            <div className="activity-item">
              <div className="act-icon"><Icon.bug/></div>
              <div className="act-body"><span><strong>{bug.assignee}</strong> created this bug</span><span className="sub">from {bug.linkedTest || "manual entry"}</span></div>
              <span className="act-time">{bug.created}</span>
            </div>
            {bug.jira && <div className="activity-item">
              <div className="act-icon"><Icon.sync/></div>
              <div className="act-body"><span><strong>System</strong> synced to Jira as <span className="mono">{bug.jira}</span></span></div>
              <span className="act-time">synced</span>
            </div>}
          </section>
        </div>
      </aside>
    </React.Fragment>
  );
}

// ===== Shell =====

// E-023 / S-023-003: Modal that runs /api/pmagent/preview then commits via /api/pmagent/transfer.
function TransferFromPMAgentModal({ onClose, onTransferred }) {
  const [slug, setSlug] = aS('');
  const [phase, setPhase] = aS('input'); // 'input' | 'previewing' | 'preview' | 'transferring' | 'error' | 'done'
  const [preview, setPreview] = aS(null);
  const [transferResult, setTransferResult] = aS(null);
  const [error, setError] = aS(null);

  const runPreview = async () => {
    if (!slug.trim()) { setError('PMAgent slug required'); setPhase('error'); return; }
    setError(null); setPhase('previewing');
    try {
      const r = await fetch('/api/pmagent/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmagentSlug: slug.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.error || ('HTTP ' + r.status)); setPhase('error'); return; }
      setPreview(j); setPhase('preview');
    } catch (e) { setError(String(e)); setPhase('error'); }
  };

  const runTransfer = async () => {
    setPhase('transferring'); setError(null);
    try {
      const r = await fetch('/api/pmagent/transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmagentSlug: slug.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.error || ('HTTP ' + r.status)); setPhase('error'); return; }
      setTransferResult(j); setPhase('done');
    } catch (e) { setError(String(e)); setPhase('error'); }
  };

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'grid', placeItems: 'center' };
  const card = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 'min(720px, 92vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-md)' };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:14, fontWeight:600}}>Transfer from PMAgent</div>
            <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>Pull a PMAgent project's QA plan (epics + stories + test plans) into Morbius.</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon.close/></button>
        </div>

        <div style={{padding:'16px 18px', overflow:'auto', flex:1}}>
          {(phase === 'input' || phase === 'previewing' || phase === 'error') && (
            <Field label="PMAgent slug" hint="The folder name under PMAgent's projects/ — e.g. morbius">
              <input className="inp mono" value={slug} placeholder="morbius" onChange={e=>setSlug(e.target.value)} disabled={phase==='previewing'} autoFocus/>
            </Field>
          )}

          {phase === 'previewing' && (
            <div className="row" style={{gap:8, marginTop:12}}><span className="pill warn">Parsing…</span></div>
          )}

          {phase === 'preview' && preview && (
            <div style={{marginTop:14}}>
              <div className="row wrap" style={{gap:10, marginBottom:12, fontSize:12}}>
                <span className="pill sq ok"><Icon.check/> {preview.totalTestCases} test cases</span>
                <span className="pill sq">{(preview.categories || []).length} categories</span>
                {preview.skippedSheets?.length > 0 && <span className="pill">{preview.skippedSheets.length} skipped</span>}
                <span className="mono" style={{fontSize:10.5, color:'var(--fg-faint)'}}>{preview.resolvedPath}</span>
              </div>
              <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Categories</div>
              <div style={{display:'flex', flexDirection:'column', gap:3, marginBottom:14, maxHeight:200, overflow:'auto'}}>
                {(preview.categories || []).map(c => (
                  <div key={c.id} className="row between" style={{padding:'5px 8px', background:'var(--bg-elev)', borderRadius:4, fontSize:12}}>
                    <span>{c.name} <span className="mono" style={{color:'var(--fg-faint)', fontSize:10.5}}>· {c.sheet}</span></span>
                    <span className="mono" style={{color:'var(--fg-muted)'}}>{c.count}</span>
                  </div>
                ))}
              </div>
              {preview.sample?.length > 0 && (
                <React.Fragment>
                  <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Sample test cases</div>
                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                    {preview.sample.map(s => (
                      <div key={s.id} style={{padding:'5px 8px', background:'var(--bg-elev)', borderRadius:4, fontSize:12, display:'flex', alignItems:'center', gap:8}}>
                        <span className="mono" style={{color:'var(--fg-muted)', fontSize:10.5}}>{s.id}</span>
                        <span style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.title}</span>
                        <span style={{color:'var(--fg-faint)', fontSize:10.5}}>{s.storyId} · AC {(s.acIndex ?? 0) + 1}</span>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              )}
              {preview.skippedSheets?.length > 0 && (
                <div style={{marginTop:12, fontSize:11.5, color:'var(--fg-muted)'}}>
                  Skipped: <span className="mono">{preview.skippedSheets.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {phase === 'transferring' && (
            <div className="row" style={{gap:8, marginTop:12}}><span className="pill warn">Transferring…</span></div>
          )}

          {phase === 'done' && transferResult && (
            <div style={{marginTop:14, padding:'12px 14px', border:'1px solid var(--ok, #45E0A8)', borderRadius:6, background:'rgba(69,224,168,0.08)'}}>
              <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>✓ Transferred to project: <code>{transferResult.morbiusProjectId}</code></div>
              <div style={{fontSize:12, color:'var(--fg-muted)', lineHeight:1.6}}>
                {transferResult.testCasesCreated} created · {transferResult.testCasesUpdated} updated · {transferResult.testCasesUntouched} untouched{transferResult.testCasesSkippedLocked ? ' · ' + transferResult.testCasesSkippedLocked + ' locked-skipped' : ''}
                <br/>{transferResult.durationMs}ms
              </div>
            </div>
          )}

          {phase === 'error' && error && (
            <div style={{marginTop:12, padding:'8px 10px', border:'1px solid var(--fail, #E5484D)', borderRadius:6, color:'var(--fail, #E5484D)', fontSize:12, lineHeight:1.5}}>
              {error}
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8}}>
          <button className="btn ghost sm" onClick={onClose} disabled={phase==='previewing' || phase==='transferring'}>{phase === 'done' ? 'Close' : 'Cancel'}</button>
          {(phase === 'input' || phase === 'error') && <button className="btn primary sm" onClick={runPreview} disabled={!slug.trim()}>Preview</button>}
          {phase === 'preview' && (
            <React.Fragment>
              <button className="btn ghost sm" onClick={() => setPhase('input')}>Back</button>
              <button className="btn primary sm" onClick={runTransfer}><Icon.check/> Confirm transfer</button>
            </React.Fragment>
          )}
          {phase === 'done' && <button className="btn primary sm" onClick={onTransferred}>Done · open project</button>}
        </div>
      </div>
    </div>
  );
}

// S-014-001 + S-014-002: New-project modal with drag-drop Excel + parsed preview before commit.
function NewProjectModal({ onClose, onCreated }) {
  const [name, setName] = aS('');
  const [appId, setAppId] = aS('');
  const [file, setFile] = aS(null);
  const [dragging, setDragging] = aS(false);
  const [phase, setPhase] = aS('input'); // 'input' | 'parsing' | 'preview' | 'committing' | 'error'
  const [preview, setPreview] = aS(null); // { categories, totalTestCases, skippedSheets, sample }
  const [error, setError] = aS(null);

  const slugPreview = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const canPreview = !!file && phase === 'input';
  const canCommit = phase === 'preview' && name.trim().length > 0 && preview && preview.totalTestCases > 0;

  async function pickFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please choose a .xlsx file (got: ' + f.name + ')'); setPhase('error'); return;
    }
    setFile(f); setError(null); setPhase('parsing');
    try {
      const res = await fetch('/api/excel/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': f.name },
        body: f,
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setError(j.error || ('Preview failed: HTTP ' + res.status)); setPhase('error'); return; }
      setPreview(j); setPhase('preview');
    } catch (e) { setError(String(e)); setPhase('error'); }
  }

  async function commit() {
    if (!canCommit) return;
    setPhase('committing'); setError(null);
    try {
      // 1. Create the project (auto-activates per /api/projects/create)
      const cRes = await fetch('/api/projects/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), appId: appId.trim() || undefined }),
      });
      const cJson = await cRes.json();
      if (!cRes.ok || !cJson.ok) { setError(cJson.error || ('Project create failed: HTTP ' + cRes.status)); setPhase('error'); return; }
      // 2. Import the Excel into the now-active new project
      const iRes = await fetch('/api/excel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': file.name },
        body: file,
      });
      const iJson = await iRes.json();
      if (!iRes.ok || !iJson.ok) {
        // Project was created but import failed — surface clearly so user can retry/delete.
        setError('Project "' + name.trim() + '" created, but Excel import failed: ' + (iJson.error || ('HTTP ' + iRes.status)) + '. The empty project remains. You can re-import from Settings → Excel or delete it manually.');
        setPhase('error'); return;
      }
      onCreated();
    } catch (e) { setError(String(e)); setPhase('error'); }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
    zIndex: 100, display: 'grid', placeItems: 'center',
  };
  const card = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
    width: 'min(720px, 92vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow-md)',
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:14, fontWeight:600}}>New project</div>
            <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>Drop an Excel test plan to onboard a new app — no CLI required.</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon.close/></button>
        </div>

        <div style={{padding:'16px 18px', overflow:'auto', flex:1}}>
          <div className="grid g-12" style={{gap:12, marginBottom:14}}>
            <div className="col-7">
              <Field label="Project name" hint={slugPreview ? <span>Slug: <span className="mono">{slugPreview}</span></span> : null}>
                <input className="inp" value={name} placeholder="e.g. Acme Mobile" onChange={e=>setName(e.target.value)} disabled={phase==='committing'}/>
              </Field>
            </div>
            <div className="col-5">
              <Field label="App ID (optional)" hint="Reverse-DNS bundle id">
                <input className="inp mono" value={appId} placeholder="com.acme.mobile" onChange={e=>setAppId(e.target.value)} disabled={phase==='committing'}/>
              </Field>
            </div>
          </div>

          {phase !== 'preview' && phase !== 'committing' && (
            <div
              className={\`st-upload-zone\${dragging ? ' drag-over' : ''}\`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
            >
              <Icon.import/>
              <div style={{fontSize:13}}>
                Drop <strong>.xlsx</strong> here or{' '}
                <label style={{color:'var(--accent)', cursor:'pointer', textDecoration:'underline'}}>
                  browse
                  <input type="file" accept=".xlsx" hidden onChange={e => pickFile(e.target.files[0])}/>
                </label>
              </div>
              <div style={{fontSize:11, color:'var(--fg-faint)'}}>
                {file ? <span className="mono">{file.name} · {(file.size/1024).toFixed(1)} KB</span> : 'Test cases will be parsed and previewed before commit'}
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div className="row" style={{gap:8, marginTop:12, fontSize:12.5, color:'var(--fg-muted)'}}>
              <span className="pill warn">Parsing…</span>
            </div>
          )}

          {phase === 'preview' && preview && (
            <div style={{marginTop:14}}>
              <div className="row wrap" style={{gap:10, marginBottom:12, fontSize:12}}>
                <span className="pill sq ok"><Icon.check/> {preview.totalTestCases} test cases</span>
                <span className="pill sq">{preview.categories.length} categories</span>
                {preview.skippedSheets?.length > 0 && <span className="pill">{preview.skippedSheets.length} sheets skipped</span>}
              </div>

              <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Categories</div>
              <div style={{display:'flex', flexDirection:'column', gap:3, marginBottom:14, maxHeight:180, overflow:'auto'}}>
                {preview.categories.map(c => (
                  <div key={c.slug} className="row between" style={{padding:'5px 8px', background:'var(--bg-elev)', borderRadius:4, fontSize:12}}>
                    <span>{c.name} <span className="mono" style={{color:'var(--fg-faint)', fontSize:10.5}}>· {c.slug}</span></span>
                    <span className="mono" style={{color:'var(--fg-muted)'}}>{c.count}</span>
                  </div>
                ))}
              </div>

              {preview.sample?.length > 0 && (
                <React.Fragment>
                  <div style={{fontSize:11, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6}}>Sample test cases</div>
                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                    {preview.sample.map(s => (
                      <div key={s.id} style={{padding:'5px 8px', background:'var(--bg-elev)', borderRadius:4, fontSize:12, display:'flex', alignItems:'center', gap:8}}>
                        <StatusDot status={s.status}/>
                        <span className="mono" style={{color:'var(--fg-muted)', fontSize:10.5}}>{s.id}</span>
                        <span style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.title}</span>
                        <span style={{color:'var(--fg-faint)', fontSize:10.5}}>{s.category}</span>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              )}

              {preview.skippedSheets?.length > 0 && (
                <div style={{marginTop:12, fontSize:11.5, color:'var(--fg-muted)'}}>
                  Skipped sheets: <span className="mono">{preview.skippedSheets.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {phase === 'committing' && (
            <div className="row" style={{gap:8, marginTop:12, fontSize:12.5, color:'var(--fg-muted)'}}>
              <span className="pill warn">Creating project + importing test cases…</span>
            </div>
          )}

          {phase === 'error' && error && (
            <div style={{marginTop:12, padding:'8px 10px', border:'1px solid var(--status-fail, #E5484D)', borderRadius:6, color:'var(--status-fail, #E5484D)', fontSize:12, lineHeight:1.5}}>
              {error}
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8}}>
          <button className="btn ghost sm" onClick={onClose} disabled={phase==='committing'}>Cancel</button>
          {phase === 'preview' && (
            <button className="btn ghost sm" onClick={() => { setFile(null); setPreview(null); setPhase('input'); }}>
              Replace file
            </button>
          )}
          {phase !== 'preview' && phase !== 'committing' && (
            <button className="btn primary sm" disabled={!canPreview} onClick={() => file && pickFile(file)}>
              Preview
            </button>
          )}
          {phase === 'preview' && (
            <button className="btn primary sm" disabled={!canCommit} onClick={commit}>
              <Icon.check/> Commit Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ view, setView, onProjectSwitch }) {
  const { TEST_CASES, BUGS, MAESTRO_FLOWS, PROJECTS, ACTIVE_PROJECT, ACTIVE_PROJECT_CONFIG, PLANS } = window.MORBIUS;
  const [showProjects, setShowProjects] = aS(false);
  const { health } = useHealth();

  // Profile — reads from localStorage, updates live when Settings saves
  const loadProfile = () => { try { return JSON.parse(localStorage.getItem('morbius-profile') || 'null'); } catch { return null; } };
  const [profile, setProfile] = aS(loadProfile);
  aE(() => {
    const h = (e) => setProfile(e.detail);
    window.addEventListener('morbius-profile-saved', h);
    return () => window.removeEventListener('morbius-profile-saved', h);
  }, []);
  const ROLE_LABELS = { 'qa-lead':'QA Lead', 'qa':'QA Engineer', 'dev':'Developer', 'pm':'Product Manager' };
  const profileInitials = profile?.name
    ? profile.name.trim().split(/\\s+/).filter(Boolean).map(w => w[0]).join('').slice(0,2).toUpperCase()
    : 'SD';
  const profileDisplayName = profile?.name
    ? (() => { const parts = profile.name.trim().split(/\\s+/).filter(Boolean); return parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : ''); })()
    : 'Saurabh D.';
  const profileRole = ROLE_LABELS[profile?.role] || 'QA Lead';

  const openBugs = BUGS.filter(b => b.status === 'open' || b.status === 'investigating').length;
  const devices = ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.devices ? ACTIVE_PROJECT_CONFIG.devices.length : 4;

  // E-024 / S-024-007: hide nav items that don't apply to the active project type.
  // Web projects don't have Maestro flows or device emulators; hiding those entries
  // removes confusion for QA leads working a web engagement.
  const projectType = ACTIVE_PROJECT_CONFIG?.projectType || 'mobile';
  const isWeb = projectType === 'web';
  const allItems = [
    { k:"dashboard", l:"Dashboard", ic:Icon.dashboard, n:null, kb:"1", showFor: 'all' },
    { k:"tests", l:"Test Cases", ic:Icon.tests, n:TEST_CASES.length, kb:"2", showFor: 'all' },
    { k:"plans", l:"QA Plan", ic:Icon.tag, n:(PLANS && PLANS.items ? (PLANS.items.filter(p=>p.type!=='release-def').length || null) : null), kb:null, showFor: 'all' },  // E-029 orientation layer (QA/Flow/Release plans from PMAgent)
    { k:"bugs", l:"Bugs", ic:Icon.bug, n:openBugs || null, kb:"3", showFor: 'all' },
    { k:"devices", l:"Devices", ic:Icon.devices, n:devices, kb:"4", showFor: 'mobile' },
    { k:"runs", l:"Runs", ic:Icon.runs, n:null, kb:"5", showFor: 'all' },
    { k:"maestro", l:"Maestro", ic:Icon.maestro, n:MAESTRO_FLOWS.length || null, kb:"6", showFor: 'mobile' },
    { k:"automation-plan", l:"Automation Plan", ic:Icon.spark, n:null, kb:"7", showFor: 'mobile' },  // E-028 planning stage
    { k:"appmap", l:"App Map", ic:Icon.appmap, n:null, kb:"8", showFor: 'all' },
    { k:"healing", l:"Healing", ic:Icon.healing, n:null, kb:"9", showFor: 'mobile' },  // E-017 self-healing is Maestro-flow specific
  ];
  const items = allItems.filter(i => i.showFor === 'all' || (isWeb ? i.showFor === 'web' : i.showFor === 'mobile'));

  const projName = ACTIVE_PROJECT_CONFIG ? ACTIVE_PROJECT_CONFIG.name : (ACTIVE_PROJECT || 'No project');
  const appId = ACTIVE_PROJECT_CONFIG ? (ACTIVE_PROJECT_CONFIG.appId || ACTIVE_PROJECT || '') : '';

  const [showNewProject, setShowNewProject] = aS(false);
  const [showTransferPMA, setShowTransferPMA] = aS(false);

  async function switchProject(id) {
    setShowProjects(false);
    try {
      await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      await window.loadMorbiusData();
      onProjectSwitch();
    } catch(e) {
      console.warn('Project switch failed', e);
    }
  }

  function openNewProject() {
    setShowProjects(false);
    setShowNewProject(true);
  }

  return (
    <aside className="sidebar">
      {/* E-024 / S-024-007: project pill with explicit type identity.
          - Color band on the left edge (4px) so peripheral vision identifies type
          - Avatar tile colored by type
          - Type label as a chunky pill under the project name (not a tiny corner badge) */}
      {(() => {
        const typeMeta = (ACTIVE_PROJECT_CONFIG?.projectType === 'web')
          ? { label: '🌐 WEB',    accent: '#7C5CFF',  desc: ACTIVE_PROJECT_CONFIG?.webUrl || 'no url set' }
          : (ACTIVE_PROJECT_CONFIG?.projectType === 'api')
          ? { label: '⚙ API',    accent: '#A8A29E',  desc: 'API runner reserved (no v1 implementation)' }
          : { label: '📱 MOBILE', accent: '#F5A623',  desc: appId || 'no appId' };
        return (
      <div className="nav-group">
        <div className="nav-group-label">Project · <span style={{color: typeMeta.accent, fontWeight:700, letterSpacing:0.5}}>{typeMeta.label}</span></div>
        <div style={{position:'relative'}}>
          <div onClick={() => setShowProjects(s => !s)}
            style={{display:"flex", alignItems:"stretch", gap:9, padding:"6px 9px 6px 6px", borderRadius:6,
                    background:"var(--bg-elev)", border:"1px solid var(--border)", borderLeft: '4px solid ' + typeMeta.accent, cursor:"pointer"}}>
            <div style={{width:22, height:22, alignSelf:'center', borderRadius:5, background:typeMeta.accent, display:"grid",
                         placeItems:"center", color:"#0A0A0A", fontFamily:"var(--font-mono)", fontWeight:700, fontSize:11}}>
              {projName.charAt(0).toUpperCase()}
            </div>
            <div style={{minWidth:0, flex:1, display:'flex', flexDirection:'column', justifyContent:'center'}}>
              <div style={{fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{projName}</div>
              <div style={{fontSize:10.5, color:"var(--fg-faint)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} title={typeMeta.desc}>{typeMeta.desc}</div>
            </div>
            <Icon.chevronDown style={{alignSelf:'center'}}/>
          </div>
          {showProjects && (
            <div style={{position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:20,
                         background:'var(--bg-elev)', border:'1px solid var(--border)', borderRadius:8,
                         boxShadow:'var(--shadow-md)', overflow:'hidden'}}>
              {PROJECTS.map(p => (
                <div key={p.id}
                  onClick={() => switchProject(p.id)}
                  style={{padding:'8px 12px', cursor:'pointer', fontSize:12.5,
                          background: p.id === ACTIVE_PROJECT ? 'var(--bg-hover)' : undefined,
                          fontWeight: p.id === ACTIVE_PROJECT ? 600 : undefined}}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = p.id === ACTIVE_PROJECT ? 'var(--bg-hover)' : ''}>
                  {p.name}
                </div>
              ))}
              {/* S-014-001: + New project entry */}
              <div onClick={openNewProject}
                style={{padding:'8px 12px', cursor:'pointer', fontSize:12.5, borderTop:'1px solid var(--border)',
                        color:'var(--accent)', display:'flex', alignItems:'center', gap:6}}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <Icon.plus/> New project…
              </div>
              {/* S-023-003: Transfer from PMAgent entry */}
              <div onClick={() => { setShowProjects(false); setShowTransferPMA(true); }}
                style={{padding:'8px 12px', cursor:'pointer', fontSize:12.5, borderTop:'1px solid var(--border)',
                        color:'var(--accent)', display:'flex', alignItems:'center', gap:6}}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <Icon.import/> Transfer from PMAgent…
              </div>
            </div>
          )}
        </div>
      </div>
        );
      })()}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={async () => { setShowNewProject(false); await window.loadMorbiusData(); onProjectSwitch(); }}/>}
      {showTransferPMA && <TransferFromPMAgentModal onClose={() => setShowTransferPMA(false)} onTransferred={async () => { setShowTransferPMA(false); await window.loadMorbiusData(); onProjectSwitch(); }}/>}

      <div className="nav-group">
        <div className="nav-group-label">Workspace</div>
        {items.map(i => (
          <div key={i.k} className={'nav-item ' + (view===i.k?'active':'')} onClick={()=>setView(i.k)}>
            <i.ic/><span>{i.l}</span>
            {i.n != null ? <span className="count">{i.n}</span> : <span className="kbd">{i.kb}</span>}
          </div>
        ))}
      </div>

      <div className="nav-group">
        <div className="nav-group-label">Integrations</div>
        <div className="nav-item" onClick={()=>{ setView('bugs'); setTimeout(()=>{ const b=document.querySelector('.btn.ghost.sm'); b&&b.click(); },200); }}>
          <Icon.sync/><span>Jira sync</span><span className="pill sq accent" style={{padding:"1px 5px"}}><span className="dot"/></span>
        </div>
        <div className="nav-item" onClick={()=>{ setView('settings'); setTimeout(()=>{ const el=document.querySelector('[data-sec="workspace"]'); el&&el.scrollIntoView({behavior:'smooth',block:'start'}); },120); }}>
          <Icon.import/><span>Excel</span>
        </div>
      </div>

      {/* E-024 / S-024-007: Run status — different checks per project type so the user
          isn't shown irrelevant signals (Maestro CLI for a web project, etc.) */}
      <div className="nav-group">
        <div className="nav-group-label">Run status · {ACTIVE_PROJECT_CONFIG?.projectType === 'web' ? 'web' : (ACTIVE_PROJECT_CONFIG?.projectType === 'api' ? 'api' : 'mobile')}</div>
        <div style={{padding:"6px 10px", fontSize:11.5, color:"var(--fg-muted)", display:"flex", flexDirection:"column", gap:7}}>
          {(ACTIVE_PROJECT_CONFIG?.projectType === 'web'
            ? [
                { key:"playwright", label:"Playwright MCP" },
                { key:"chrome", label:"Chrome" },
                { key:"targetUrl", label:"Target URL" },
              ]
            : [
                { key:"maestro", label:"Maestro CLI" },
                { key:"android", label:"Android" },
                { key:"ios", label:"iOS" },
              ]
          ).map(({ key, label }) => {
            const c = health ? health[key] : null;
            const dot = health == null ? "none" : (c && c.ok ? "pass" : "fail");
            const detail = health == null ? "checking…" : (c ? c.detail : "—");
            return (
              <div key={key} className="row between">
                <span className="row" style={{gap:7}}><StatusDot status={dot}/>{label}</span>
                <span className="mono" style={{fontSize:10.5, color:"var(--fg-faint)", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={detail}>{detail}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="avatar">{profileInitials}</div>
        <div className="who"><div className="name">{profileDisplayName}</div><div className="role">{profileRole}</div></div>
        <button className="icon-btn" onClick={() => setView("settings")} title="Settings (7)"><Icon.settings/></button>
      </div>
    </aside>
  );
}

function Topnav({ view, setView }) {
  const items = [
    ["dashboard","Dashboard",Icon.dashboard],
    ["tests","Test Cases",Icon.tests],
    ["bugs","Bugs",Icon.bug],
    ["devices","Devices",Icon.devices],
    ["runs","Runs",Icon.runs],
    ["maestro","Maestro",Icon.maestro],
    ["appmap","App Map",Icon.appmap],
    ["healing","Healing",Icon.healing],
  ];
  return (
    <nav className="topnav-tabs">
      {items.map(([k,l,Ic]) => (
        <div key={k} className={'nav-item ' + (view===k?'active':'')} onClick={()=>setView(k)}>
          <Ic/>{l}
        </div>
      ))}
    </nav>
  );
}

function LogoMark({ size = 28, title = "Morbius" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      role="img" aria-label={title} style={{ color: "var(--accent)", display: "block" }}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5"
            fill="color-mix(in oklab, currentColor 14%, transparent)"
            stroke="color-mix(in oklab, currentColor 36%, transparent)" strokeWidth="1"/>
      <path d="M6 23 L6 9 L11 16 L16 9 L16 23"
        stroke="currentColor" strokeWidth="2.25"
        strokeLinecap="square" strokeLinejoin="miter" fill="none"/>
      <circle cx="21" cy="19" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="21" y1="16.25" x2="21" y2="21.75" stroke="currentColor" strokeWidth="1" opacity="0.75"/>
      <line x1="18.25" y1="19" x2="23.75" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.75"/>
      <line x1="24.6" y1="22.6" x2="27" y2="25" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square"/>
    </svg>
  );
}

function Topbar({ view, theme, setTheme, onChat, onSearch, layout, onSync, onRunSuite, onSettings, refreshing }) {
  const { health, refresh: refreshHealth, polling: healthPolling } = useHealth();
  const pillClass = (key) => {
    if (health == null) return "status-pill";
    const c = health[key];
    return "status-pill " + (c && c.ok ? "ok" : "fail");
  };
  const pillTitle = (key) => {
    if (health == null) return "Health-checking…";
    const c = health[key];
    if (!c) return "—";
    return (c.ok ? "✓ " : "✗ ") + c.detail + (c.ok ? "" : "  ·  Click to retry");
  };
  const onPillClick = (key) => () => {
    if (healthPolling) return;
    refreshHealth();
  };
  return (
    <header className="topbar">
      <div className="brand">
        <LogoMark/>
      </div>

      <div className="search" onClick={onSearch} style={{cursor:'pointer'}}>
        <Icon.search/>
        <span style={{flex:1, color:'var(--fg-faint)'}}>Search tests, bugs, flows…</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-right">
        {/* E-024 / S-024-007: topbar status pills dispatch by project type.
            2026-04-30: moved to right cluster (alongside Settings/Sync/Run buttons)
            so the brand sits cleanly on the left and tool-readiness lives near the actions. */}
        <div className="status-pills">
          {(window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.projectType === 'web') ? (
            <React.Fragment>
              <button type="button" className={pillClass("playwright")} title={pillTitle("playwright")} onClick={onPillClick("playwright")}><span className="dot"/>Playwright</button>
              <button type="button" className={pillClass("chrome")} title={pillTitle("chrome")} onClick={onPillClick("chrome")}><span className="dot"/>Chrome</button>
              <button type="button" className={pillClass("targetUrl")} title={pillTitle("targetUrl")} onClick={onPillClick("targetUrl")}><span className="dot"/>URL</button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <button type="button" className={pillClass("maestro")} title={pillTitle("maestro")} onClick={onPillClick("maestro")}><span className="dot"/>Maestro</button>
              <button type="button" className={pillClass("android")} title={pillTitle("android")} onClick={onPillClick("android")}><span className="dot"/>Android</button>
              <button type="button" className={pillClass("ios")} title={pillTitle("ios")} onClick={onPillClick("ios")}><span className="dot"/>iOS</button>
            </React.Fragment>
          )}
        </div>
        <button className="icon-btn" onClick={onSettings} title="Settings"><Icon.settings/></button>
        <button className="icon-btn" onClick={() => setTheme(theme==="dark"?"light":"dark")} title="Toggle theme">
          {theme==="dark" ? <Icon.sun/> : <Icon.moon/>}
        </button>
        <button className="btn ghost sm" onClick={onSync} disabled={refreshing} title="Reload all data from server">
          <span style={refreshing ? {display:'inline-block', animation:'spin 0.8s linear infinite'} : {}}><Icon.sync/></span>
          {refreshing ? 'Syncing…' : 'Sync'}
        </button>
        {/* E-024 / S-024-008: Run-suite button label + destination depend on project type */}
        {(() => {
          const isWeb = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.projectType === 'web';
          const isApi = window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.projectType === 'api';
          if (isApi) return <button className="btn sm" disabled title="API runner not implemented in v1"><Icon.play/> Run suite</button>;
          return (
            <button className="btn sm" onClick={onRunSuite}
              title={isWeb ? "Open Test Cases — run web tests one at a time via the agent (no batch suite runner in v1)" : "Go to Maestro and run all flows"}>
              <Icon.play/> {isWeb ? 'Run tests' : 'Run suite'}
            </button>
          );
        })()}
        {/* AI assistant entry — accent-tinted but quiet. A filled accent button in the
            corner outcompetes Run suite, and the brand mark already owns the violet. */}
        <button className="btn sm" onClick={onChat} style={{color:"var(--accent)", borderColor:"oklch(from var(--accent) l c h / 0.35)"}}>
          <Icon.chat/> Morbius
        </button>
      </div>
    </header>
  );
}

// ===== ⌘K Search Modal =====
function SearchModal({ index, onClose, setView, setSelTest, setSelBug }) {
  const [q, setQ] = aS('');
  const [cursor, setCursor] = aS(0);
  const inputRef = React.useRef(null);
  aE(() => { inputRef.current?.focus(); }, []);

  const results = q.trim().length < 1 ? [] : index.filter(item =>
    (item.label + ' ' + item.id + ' ' + (item.sub||'')).toLowerCase().includes(q.toLowerCase())
  );
  const groups = [
    { type:'test',  label:'Test Cases', items: results.filter(r=>r.type==='test').slice(0,5) },
    { type:'bug',   label:'Bugs',       items: results.filter(r=>r.type==='bug').slice(0,5)  },
    { type:'flow',  label:'Flows',      items: results.filter(r=>r.type==='flow').slice(0,5) },
  ].filter(g => g.items.length > 0);
  const flat = groups.flatMap(g => g.items);

  const select = (item) => {
    if (item.type==='test') { setView('tests'); setSelTest(item.ref); }
    else if (item.type==='bug') { setView('bugs'); setSelBug(item.ref); }
    else if (item.type==='flow') { setView('maestro'); }
    onClose();
  };

  const statusDot = { pass:'var(--ok)', fail:'var(--fail)', flaky:'var(--warn)' };
  const typeLabel = { test:'Test', bug:'Bug', flow:'Flow' };

  return (
    <div className="srch-overlay" onClick={onClose}>
      <div className="srch-modal" onClick={e=>e.stopPropagation()}
        onKeyDown={e=>{
          if (e.key==='ArrowDown'){e.preventDefault();setCursor(c=>Math.min(c+1,flat.length-1));}
          else if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>Math.max(c-1,0));}
          else if(e.key==='Enter'&&flat[cursor]){select(flat[cursor]);}
          else if(e.key==='Escape'){onClose();}
        }}>
        <div className="srch-input-row">
          <Icon.search style={{flexShrink:0, color:'var(--fg-muted)'}}/>
          <input ref={inputRef} className="srch-input"
            placeholder="Search tests, bugs, flows…"
            value={q} onChange={e=>{setQ(e.target.value);setCursor(0);}}/>
          {q && <button className="icon-btn" style={{padding:2}} onClick={()=>setQ('')}><Icon.close/></button>}
          <span className="kbd" style={{cursor:'pointer'}} onClick={onClose}>Esc</span>
        </div>

        {groups.length > 0 && (
          <div className="srch-results">
            {groups.map(g => (
              <div key={g.type}>
                <div className="srch-group-label">{g.label}</div>
                {g.items.map(item => {
                  const fi = flat.indexOf(item);
                  return (
                    <div key={item.id} className={\`srch-item \${fi===cursor?'active':''}\`}
                      onClick={()=>select(item)} onMouseEnter={()=>setCursor(fi)}>
                      <span className="srch-dot" style={{background:statusDot[item.status]||'var(--fg-faint)'}}/>
                      <div style={{minWidth:0,flex:1}}>
                        <div className="srch-label">{highlightMatch(item.label, q)}</div>
                        <div className="srch-sub">{item.id} · {item.sub}</div>
                      </div>
                      <span className="srch-type">{typeLabel[item.type]}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {q.trim().length > 0 && groups.length === 0 && (
          <div className="srch-empty">No results for "<strong>{q}</strong>"</div>
        )}
        {q.trim().length === 0 && (
          <div className="srch-hint">
            <Icon.search style={{opacity:0.3, width:24, height:24, marginBottom:8}}/>
            <div>Type to search across all tests, bugs and flows</div>
            <div className="row" style={{gap:12,marginTop:10,justifyContent:'center'}}>
              <span><span className="kbd">↑↓</span> navigate</span>
              <span><span className="kbd">↵</span> open</span>
              <span><span className="kbd">Esc</span> close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightMatch(text, q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return React.createElement(React.Fragment, null,
    text.slice(0, idx),
    React.createElement('mark', {style:{background:'var(--accent)',color:'var(--accent-contrast)',borderRadius:2,padding:'0 1px'}}, text.slice(idx, idx+q.length)),
    text.slice(idx+q.length)
  );
}

function ViewHeader({ title, sub, actions }) {
  return (
    <div className="view-header">
      <div>
        <h1>{title}</h1>
        <div className="sub">{sub}</div>
      </div>
      <div className="actions">{actions}</div>
    </div>
  );
}

// ===== App Map (Mermaid) =====
// v1: locked to Mermaid's dark theme — matches the app's dark-first design.
// E-027 helpers — formatters for the narrative panel
function fmtMs(ms) {
  if (!ms || ms < 0) return '0ms';
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + 'm ' + s + 's';
}
function fmtRelTime(iso) {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'never';
  const diffMs = Date.now() - t;
  if (diffMs < 60000) return 'just now';
  if (diffMs < 3600000) return Math.floor(diffMs / 60000) + 'm ago';
  if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + 'h ago';
  return Math.floor(diffMs / 86400000) + 'd ago';
}
// Render Claude's markdown narrative to HTML. Falls back to a tiny inline
// transformer if marked CDN didn't load (offline / firewall).
function mdToHtml(src) {
  if (!src) return '';
  if (window.marked && typeof window.marked.parse === 'function') {
    try { return window.marked.parse(src, { breaks: true, gfm: true }); } catch { /* fall through */ }
  }
  // Minimal fallback — bold, inline code, paragraph breaks.
  // Backticks must be escaped because this whole function lives inside generateJS()'s template literal.
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escape(src)
    .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\`([^\`]+)\`/g, '<code class="mono">$1</code>')
    .replace(/\\n\\n/g, '</p><p>')
    .replace(/^/, '<p>') + '</p>';
}
// Stat card for the metrics strip. Fixed layout, tabular-figure font.
function StatCard({label, value, sub, accent}) {
  return (
    <div style={{padding:'14px 18px', borderRight:'1px solid var(--border)'}}>
      <div style={{fontSize:10, color:'var(--fg-faint)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6, fontWeight:600}}>{label}</div>
      <div style={{fontSize:22, fontWeight:600, color: accent || 'var(--fg)', fontFeatureSettings:'"tnum" 1', lineHeight:1.1}}>{value}</div>
      {sub && <div style={{fontSize:11, color:'var(--fg-faint)', marginTop:4}}>{sub}</div>}
    </div>
  );
}

function AppMapView() {
  const [state, setState] = aS({ loading: true, appMap: null, projectDisplayName: '', error: null });
  const [renderError, setRenderError] = aS(null);
  const [zoom, setZoom] = aS(1);
  const hostRef = React.useRef(null);
  const renderIdRef = React.useRef(0);
  const ZOOM_MIN = 0.25, ZOOM_MAX = 4, ZOOM_STEP = 0.2;
  const clampZoom = (z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

  // E-027: narrative panel state
  const [narrative, setNarrative] = aS(null);          // AppMapNarrative | null
  const [narrativeLoading, setNarrativeLoading] = aS(true);
  const [generating, setGenerating] = aS(false);
  const [generateError, setGenerateError] = aS(null);
  const [expandedFlow, setExpandedFlow] = aS(null);     // flowId | null

  const loadNarrative = React.useCallback(async () => {
    try {
      const r = await fetch('/api/appmap/narrative');
      const j = await r.json();
      setNarrative(j.narrative || null);
    } catch (e) {
      setNarrative(null);
    } finally {
      setNarrativeLoading(false);
    }
  }, []);

  const generateNarrative = async () => {
    setGenerating(true); setGenerateError(null);
    try {
      const r = await fetch('/api/appmap/narrative/generate', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) {
        setGenerateError(j.error || 'Generation failed');
      } else {
        setNarrative(j.narrative);
      }
    } catch (e) {
      setGenerateError(String(e && e.message || e));
    }
    setGenerating(false);
  };

  aE(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/appmap');
        const j = await r.json();
        if (!cancelled) setState({ loading: false, appMap: j.appMap, projectDisplayName: j.projectDisplayName || j.projectName || '', error: null });
      } catch (e) {
        if (!cancelled) setState({ loading: false, appMap: null, projectDisplayName: '', error: String(e && e.message || e) });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  aE(() => { loadNarrative(); }, [loadNarrative]);

  aE(() => {
    if (state.loading || !state.appMap || !hostRef.current || !window.mermaid) return;
    const host = hostRef.current;
    const id = 'appmap-svg-' + (++renderIdRef.current);
    let cancelled = false;
    (async () => {
      try {
        // S-027-006: strip inline style+linkStyle directives so our themeCSS owns
        // the look. Fill colors baked into the raw Mermaid source override the
        // theme and break the monochrome aesthetic.
        // NOTE: this code lives inside generateJS()'s template literal, so all
        // regex backslashes need to survive one level of template-literal escaping.
        const cleanedAppMap = state.appMap
          .replace(/^\\s*style\\s+\\S+[^\\n]*$/gim, '')
          .replace(/^\\s*linkStyle\\s+[^\\n]*$/gim, '');
        const { svg } = await window.mermaid.render(id, cleanedAppMap);
        if (cancelled) return;
        host.innerHTML = svg;
        const svgEl = host.querySelector('svg');
        if (svgEl) {
          svgEl.style.display = 'block';
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
        // S-027-006 post-render decoration: tag nodes with status classes based
        // on whether their semantic ID matches an automated flow's basename or
        // tag/qaPlanId. Fuzzy match: lowercase the node text and look for any
        // flowId substring overlap (works for nodes like "LOGIN" → "01_login").
        if (narrative && narrative.perFlow && narrative.perFlow.length > 0) {
          const flowMeta = narrative.perFlow.map(f => ({
            flowId: f.flowId,
            slug: f.flowId.toLowerCase().replace(/^\\d+_/, ''),  // strip leading "01_"
            hasRuns: f.lastRunsSummary && f.lastRunsSummary !== 'No runs yet',
          }));
          const nodes = svgEl ? svgEl.querySelectorAll('g.node') : [];
          nodes.forEach(node => {
            const label = (node.textContent || '').toLowerCase();
            // Match node label words against flow slugs (any substring overlap)
            const match = flowMeta.find(f => {
              if (!f.slug) return false;
              const parts = f.slug.split(/[_\\-]/).filter(p => p.length >= 4);
              return parts.some(p => label.includes(p));
            });
            if (match) {
              node.classList.add('flow-clickable');
              node.classList.add(match.hasRuns ? 'status-covered' : 'status-covered'); // covered always; status-fail/flaky only with run data later
              node.dataset.flowId = match.flowId;
              node.style.cursor = 'pointer';
            }
          });
        }
        setRenderError(null);
      } catch (e) {
        if (cancelled) return;
        setRenderError(String(e && e.message || e));
        host.innerHTML = '';
      }
    })();
    return () => { cancelled = true; };
  }, [state.loading, state.appMap, narrative]);

  // S-027-006: click on decorated node → expand the matching accordion row.
  // Effect depends on state.appMap and narrative so the listener (re)attaches
  // once the chart host div is mounted and after each Mermaid re-render.
  aE(() => {
    const host = hostRef.current;
    if (!host) return;
    const handler = (e) => {
      let el = e.target;
      while (el && el !== host) {
        if (el.classList && el.classList.contains('flow-clickable')) {
          const fid = el.dataset && el.dataset.flowId;
          if (fid) {
            setExpandedFlow(fid);
            setTimeout(() => {
              const row = document.querySelector('[data-flow-row="' + fid + '"]');
              if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 60);
          }
          return;
        }
        el = el.parentElement;
      }
    };
    host.addEventListener('click', handler);
    return () => host.removeEventListener('click', handler);
  }, [state.appMap, narrative]);

  if (state.loading) return <Empty title="Loading App Map…"/>;
  if (state.error) return <Empty title="Failed to load App Map" hint={state.error}/>;

  // ── Mermaid card (top layer) ──
  const chartCard = state.appMap ? (
    <div className="card" style={{marginBottom:14}}>
      <div className="card-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <h3>App Map · {state.projectDisplayName}</h3>
        {!renderError && (
          <div className="row" style={{gap:6}}>
            <button className="btn ghost sm" title="Zoom out" onClick={() => setZoom(z => clampZoom(z - ZOOM_STEP))} disabled={zoom <= ZOOM_MIN + 1e-6}>−</button>
            <span className="mono" style={{fontSize:11.5, color:'var(--fg-muted)', minWidth:42, textAlign:'center'}}>{Math.round(zoom * 100)}%</span>
            <button className="btn ghost sm" title="Zoom in" onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))} disabled={zoom >= ZOOM_MAX - 1e-6}>+</button>
            <button className="btn ghost sm" title="Reset zoom" onClick={() => setZoom(1)} disabled={Math.abs(zoom - 1) < 1e-6}>Reset</button>
          </div>
        )}
      </div>
      <div className="card-body" style={{padding:0}}>
        {renderError ? (
          <div style={{padding:16}}>
            <div style={{fontSize:13, color:'var(--status-fail, #E5484D)', marginBottom:8}}>Mermaid render error: {renderError}</div>
            <pre style={{fontSize:11.5, background:'var(--surface-2, #161616)', padding:12, borderRadius:6, overflow:'auto', maxHeight:'50vh', color:'var(--fg-muted)'}}>{state.appMap}</pre>
          </div>
        ) : (
          <div
            style={{
              padding:16,
              overflow:'auto',
              maxHeight:'70vh',
              background: 'var(--bg-sunken)',
              backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
            onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))); } }}
          >
            <div ref={hostRef} style={{transform:'scale(' + zoom + ')', transformOrigin:'top left', transition:'transform 160ms cubic-bezier(0.4, 0, 0.2, 1)'}}/>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="card" style={{marginBottom:14}}>
      <div className="card-header"><h3>App Map · {state.projectDisplayName}</h3></div>
      <div className="card-body" style={{padding:0}}>
        {/* S-027-006 empty state — dot-grid background + primary CTA. */}
        <div style={{
          padding:'56px 24px',
          textAlign:'center',
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}>
          <div style={{fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:6}}>No App Map yet</div>
          <div style={{fontSize:12.5, color:'var(--fg-muted)', maxWidth:480, margin:'0 auto', lineHeight:1.6}}>
            Add a Mermaid flowchart to <code style={{color:'var(--fg)'}}>data/{'<project>'}/config.json</code> under the
            {' '}<code style={{color:'var(--fg)'}}>appMap</code> field, then this page renders the screen graph and the
            automation rationale below it.
          </div>
        </div>
      </div>
    </div>
  );

  // ── Narrative panel (middle layer) — E-027 S-027-004 ──
  const narrativeCard = (() => {
    const hasN = !!narrative;
    const headerRight = (
      <div className="row" style={{gap:10, alignItems:'center'}}>
        {hasN && <span className="mono" style={{fontSize:11, color:'var(--fg-faint)'}}>updated {fmtRelTime(narrative.generatedAt)}</span>}
        <button className="btn ghost sm" disabled={generating} onClick={generateNarrative}>
          {generating ? 'Working…' : (hasN ? 'Refresh' : 'Generate')}
        </button>
      </div>
    );
    return (
      <div className="card" style={{marginBottom:14, overflow:'hidden'}}>
        <div className="card-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'baseline', gap:10}}>
            <h3 style={{margin:0}}>Automation rationale</h3>
            <span style={{fontSize:11, color:'var(--fg-faint)', fontWeight:400}}>why these flows, what runs reveal</span>
          </div>
          {hasN && headerRight}
        </div>
        <div className="card-body" style={{padding:0}}>
          {narrativeLoading
            ? <div style={{padding:24, fontSize:12, color:'var(--fg-faint)'}}>Loading narrative…</div>
            : !hasN
              ? (
                <div style={{padding:'40px 24px', textAlign:'center'}}>
                  <div style={{fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:6}}>No rationale generated yet</div>
                  <div style={{fontSize:12.5, color:'var(--fg-muted)', maxWidth:480, margin:'0 auto 18px', lineHeight:1.6}}>
                    Claude reads every flow, test case, and recent run, then explains — in scannable bullets — why these specific flows out of the full catalog, what runs reveal, and what was learned along the way.
                  </div>
                  <button className="btn primary sm" onClick={generateNarrative} disabled={generating}>
                    {generating ? 'Generating…' : 'Generate rationale'}
                  </button>
                  {generateError && (
                    <div style={{marginTop:18, fontSize:12, color:'var(--status-fail, #E5484D)', whiteSpace:'pre-wrap'}}>{generateError}</div>
                  )}
                </div>
              )
              : (
                <div>
                  {narrative.qualityFlag === 'generic' && (
                    <div style={{margin:'14px 24px 0', fontSize:11.5, color:'var(--warn)', padding:'8px 12px', background:'var(--warn-bg)', border:'1px solid var(--warn)', borderRadius:6}}>
                      ⚠ The agent's response was flagged as generic. Consider regenerating or adding more context.
                    </div>
                  )}

                  {/* Stats strip — 4 cards across the full panel width */}
                  <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', borderBottom:'1px solid var(--border)', background:'var(--bg-sunken)'}}>
                    <StatCard
                      label="Flows automated"
                      value={String(narrative.flowsCovered)}
                      sub={'of ' + narrative.testCasesTotal + ' test cases'}
                      accent="var(--ok)"
                    />
                    <StatCard
                      label="Coverage"
                      value={narrative.coveragePct + '%'}
                      sub="of catalog"
                    />
                    <StatCard
                      label="Agent generation"
                      value={fmtMs(narrative.timeOnTask?.generationMs || 0)}
                      sub="cumulative across runs"
                    />
                    <StatCard
                      label="Time in runs"
                      value={fmtMs(narrative.timeOnTask?.runMs || 0)}
                      sub={(narrative.timeOnTask?.runMs || 0) > 0 ? 'last 3 per flow' : 'no runs yet'}
                    />
                  </div>

                  {/* Two-section narrative — quiet section labels, accent strip on the left, scannable bulleted body */}
                  <div style={{padding:'24px', display:'grid', gridTemplateColumns:'1fr', gap:28}}>
                    <section style={{borderLeft:'2px solid var(--accent)', paddingLeft:18}}>
                      <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:10}}>
                        <div className="appmap-section-violet-label" style={{fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase'}}>Why these flows</div>
                        <div style={{fontSize:11, color:'var(--fg-faint)', fontWeight:400}}>project-level rationale</div>
                      </div>
                      <div className="narrative-prose"
                           style={{fontSize:13, lineHeight:1.7, color:'var(--fg-muted)'}}
                           dangerouslySetInnerHTML={{__html: mdToHtml(narrative.whyTheseFlows || '_(empty)_')}} />
                    </section>

                    <section style={{borderLeft:'2px solid var(--warn)', paddingLeft:18}}>
                      <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:10}}>
                        <div className="appmap-section-amber-label" style={{fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase'}}>What the agent learned</div>
                        <div style={{fontSize:11, color:'var(--fg-faint)', fontWeight:400}}>observations from runs + flow inspection</div>
                      </div>
                      <div className="narrative-prose"
                           style={{fontSize:13, lineHeight:1.7, color:'var(--fg-muted)'}}
                           dangerouslySetInnerHTML={{__html: mdToHtml(narrative.whatTheAgentLearned || '_(empty)_')}} />
                    </section>

                    {generateError && (
                      <div style={{fontSize:12, color:'var(--status-fail, #E5484D)', whiteSpace:'pre-wrap'}}>{generateError}</div>
                    )}
                  </div>
                </div>
              )
          }
        </div>
      </div>
    );
  })();

  // ── Per-flow accordion (bottom layer) — E-027 S-027-004 ──
  const accordionCard = narrative && narrative.perFlow && narrative.perFlow.length > 0 ? (
    <div className="card">
      <div className="card-header" style={{display:'flex', alignItems:'baseline', gap:10}}>
        <h3 style={{margin:0}}>Per-flow detail</h3>
        <span style={{fontSize:11, color:'var(--fg-faint)', fontWeight:400}}>{narrative.perFlow.length} automated · click a row to expand, or click a node in the chart above</span>
      </div>
      <div className="card-body" style={{padding:0}}>
        {narrative.perFlow.map((f, i) => {
          const open = expandedFlow === f.flowId;
          const noRuns = f.lastRunsSummary === 'No runs yet';
          const accentBar = open ? 'var(--accent)' : (noRuns ? 'var(--border)' : 'var(--ok)');
          return (
            <div key={f.flowId} data-flow-row={f.flowId}
              style={{borderTop: i === 0 ? 'none' : '1px solid var(--border)', borderLeft: '3px solid ' + accentBar, transition:'border-color 160ms'}}>
              <div onClick={() => setExpandedFlow(open ? null : f.flowId)}
                style={{display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center',
                        padding:'12px 18px', cursor:'pointer', fontSize:13,
                        background: open ? 'var(--accent-soft)' : 'transparent',
                        transition:'background 160ms'}}
                onMouseEnter={e => { if (!open) e.currentTarget.style.background='var(--bg-hover)'; }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.background=''; }}>
                <span className="mono" style={{fontSize:11, color:'var(--fg-faint)', width:14, textAlign:'center'}}>{open ? '▾' : '▸'}</span>
                <span className="mono" style={{minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5, color:'var(--fg)'}}>{f.flowId}</span>
                <span className="mono" style={{fontSize:10.5, color: noRuns ? 'var(--fg-faint)' : 'var(--fg-muted)', minWidth:54, textAlign:'right'}}>
                  {noRuns ? '—' : fmtMs(f.agentTimeMs)}
                </span>
                <span style={{
                  fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600, letterSpacing:0.3,
                  background: noRuns ? 'var(--bg-elev)' : 'var(--ok-bg)',
                  border: '1px solid ' + (noRuns ? 'var(--border)' : 'var(--ok)'),
                  color: noRuns ? 'var(--fg-faint)' : 'var(--ok)',
                  textTransform:'uppercase',
                  minWidth:62, textAlign:'center',
                }}>
                  {noRuns ? 'no runs' : 'has runs'}
                </span>
              </div>
              {open && (
                <div style={{padding:'8px 18px 22px 36px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, fontSize:12.5,
                             background: 'var(--bg-sunken)'}}>
                  <div>
                    <div className="appmap-section-violet-label" style={{fontSize:10, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6, fontWeight:600}}>Why picked</div>
                    <div className="narrative-prose" style={{color:'var(--fg)', lineHeight:1.65}}
                         dangerouslySetInnerHTML={{__html: mdToHtml(f.whyPicked || '_(none)_')}} />
                  </div>
                  <div>
                    <div className={noRuns ? '' : 'appmap-section-green-label'}
                         style={{fontSize:10, color: noRuns ? 'var(--fg-faint)' : undefined, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6, fontWeight:600}}>Last runs summary</div>
                    <div className="narrative-prose" style={{color: noRuns ? 'var(--fg-faint)' : 'var(--fg)', lineHeight:1.65, fontStyle: noRuns ? 'italic' : 'normal'}}
                         dangerouslySetInnerHTML={{__html: mdToHtml(f.lastRunsSummary)}} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div>
      {chartCard}
      {narrativeCard}
      {accordionCard}
    </div>
  );
}

// ===== E-017 / S-017-005: Healing Queue View =====
// Lists proposals; default filter shows validated (ready for human approval).
// Each card shows: failed → proposed selector with diff styling, confidence band,
// flow path, validation runId, rationale; buttons: Approve, Modify, Reject.
function HealingQueueView() {
  const [proposals, setProposals] = aS(null);
  const [showAll, setShowAll] = aS(false);  // when off, hide invalidated/error/applied
  const [busyId, setBusyId] = aS(null);
  const [editingId, setEditingId] = aS(null);
  const [editValue, setEditValue] = aS('');
  const [error, setError] = aS(null);

  const refresh = async () => {
    try {
      const r = await fetch('/api/healing').then(r => r.json());
      setProposals(Array.isArray(r.proposals) ? r.proposals : []);
    } catch (e) { setError(String(e)); setProposals([]); }
  };
  aE(() => { refresh(); const id = setInterval(refresh, 8000); return () => clearInterval(id); }, []);

  const approve = async (p) => {
    setBusyId(p.id); setError(null);
    try {
      const r = await fetch('/api/healing/' + encodeURIComponent(p.id) + '/approve', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) setError(j.error || ('Approve failed: HTTP ' + r.status));
    } catch (e) { setError(String(e)); }
    setBusyId(null); refresh();
  };
  const reject = async (p) => {
    setBusyId(p.id);
    try { await fetch('/api/healing/' + encodeURIComponent(p.id) + '/reject', { method: 'POST' }); }
    catch (e) { setError(String(e)); }
    setBusyId(null); refresh();
  };
  const startModify = (p) => { setEditingId(p.id); setEditValue(p.modifiedSelector || p.proposedSelector || ''); };
  const saveModify = async (p) => {
    setBusyId(p.id);
    try {
      const r = await fetch('/api/healing/' + encodeURIComponent(p.id) + '/modify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selector: editValue }),
      });
      const j = await r.json();
      if (!r.ok) setError(j.error || ('Modify failed: HTTP ' + r.status));
    } catch (e) { setError(String(e)); }
    setBusyId(null); setEditingId(null); refresh();
  };

  const confidenceBand = (c) => {
    if (typeof c !== 'number') return { label: 'Unknown', cls: 'none', color: 'var(--fg-muted)' };
    if (c < 0.5)  return { label: 'Low — review carefully',  cls: 'fail', color: 'var(--fail, #E5484D)' };
    if (c < 0.8)  return { label: 'Medium', cls: 'warn', color: 'var(--warn, #F5A623)' };
    return                { label: 'High',   cls: 'ok',   color: 'var(--ok, #45E0A8)' };
  };

  const stateBadge = (state) => {
    const map = {
      requested: { color:'var(--fg-faint)', label:'Requested' },
      snapshotting: { color:'var(--fg-muted)', label:'Snapshotting' },
      proposed: { color:'var(--fg-muted)', label:'Proposed' },
      validating: { color:'var(--warn, #F5A623)', label:'Validating' },
      validated: { color:'var(--ok, #45E0A8)', label:'Validated' },
      invalidated: { color:'var(--fail, #E5484D)', label:'Invalidated' },
      error: { color:'var(--fail, #E5484D)', label:'Error' },
      approved: { color:'var(--accent)', label:'Approved' },
      applied: { color:'var(--ok, #45E0A8)', label:'Applied' },
      rejected: { color:'var(--fg-faint)', label:'Rejected' },
    };
    const m = map[state] || { color:'var(--fg-muted)', label: state };
    return <span className="pill sq" style={{fontSize:10.5, color: m.color, borderColor: m.color}}><span className="dot" style={{background: m.color}}/>{m.label}</span>;
  };

  if (proposals === null) return <div className="card"><div className="card-body"><div style={{fontSize:12, color:'var(--fg-faint)'}}>Loading…</div></div></div>;

  // Default filter: validated only. When showAll is on, show everything except rejected (clutter).
  const visible = proposals.filter(p => showAll || p.state === 'validated' || p.state === 'approved');

  return (
    <div>
      <div className="row" style={{marginBottom:12, gap:8, alignItems:'center'}}>
        <span className="pill sq">{visible.length} proposal{visible.length===1?'':'s'} {showAll ? '' : '(validated only — toggle to see all)'}</span>
        <label style={{fontSize:12, color:'var(--fg-muted)', display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}/>
          Show invalidated, errors, applied
        </label>
        <button className="btn ghost sm" style={{marginLeft:'auto'}} onClick={refresh}><Icon.sync/> Refresh</button>
      </div>

      {error && <div style={{padding:'8px 10px', border:'1px solid var(--fail, #E5484D)', borderRadius:6, color:'var(--fail, #E5484D)', fontSize:12, marginBottom:12}}>{error}</div>}

      {visible.length === 0 ? (
        <div className="card"><div className="card-body" style={{padding:'32px 24px'}}>
          <div style={{fontSize:14, fontWeight:600, marginBottom:8}}>{proposals.length === 0 ? 'No healing proposals yet' : 'No validated proposals to review'}</div>
          {proposals.length === 0 ? (
            <div style={{fontSize:12.5, color:'var(--fg-muted)', lineHeight:1.7, maxWidth:640}}>
              <div style={{marginBottom:10}}>
                Self-healing kicks in when a Maestro flow fails because a selector no longer matches an element on screen
                — for example, after the app rewords a button or restructures a screen.
              </div>
              <div style={{marginBottom:10}}><b style={{color:'var(--fg)'}}>How proposals appear here:</b></div>
              <ol style={{margin:'0 0 10px 18px', padding:0, lineHeight:1.7}}>
                <li>Run a Maestro flow (Maestro tab → Run a flow, or Dashboard → Run suite).</li>
                <li>If the run fails on a missing selector, Morbius captures the screen hierarchy.</li>
                <li>Claude proposes a replacement selector, validates it on the same screen, and posts the proposal here for your review.</li>
              </ol>
              <div style={{fontSize:11.5, color:'var(--fg-faint)'}}>
                You can also trigger a proposal manually with <code className="mono" style={{background:'var(--bg-elev)', border:'1px solid var(--border)', padding:'1px 5px', borderRadius:4}}>POST /api/healing/propose</code>.
              </div>
            </div>
          ) : (
            <div style={{fontSize:12.5, color:'var(--fg-muted)', lineHeight:1.7}}>
              You have {proposals.length} proposal{proposals.length===1?'':'s'} but none are <b style={{color:'var(--fg)'}}>validated</b> yet.
              Toggle "Show invalidated, errors, applied" above to see what the pipeline tried and why it didn't produce a clean candidate.
            </div>
          )}
        </div></div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {visible.map(p => {
            const sel = p.modifiedSelector || p.proposedSelector || '';
            const band = confidenceBand(p.confidence);
            const isEditing = editingId === p.id;
            const canApprove = (p.state === 'validated' || p.state === 'proposed' || (p.state === 'invalidated' && showAll)) && !!sel;
            return (
              <div key={p.id} className="card" style={{borderLeft: '3px solid ' + band.color}}>
                <div className="card-header" style={{display:'flex', alignItems:'center', gap:8}}>
                  {stateBadge(p.state)}
                  <span className="mono" style={{fontSize:11, color:'var(--fg-muted)'}}>{p.id}</span>
                  <span className="mono" style={{fontSize:11.5}}>{p.testId}</span>
                  <span style={{fontSize:11, color:'var(--fg-faint)', flex:1, textAlign:'right'}}>{p.platform}</span>
                </div>
                <div className="card-body" style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={{fontSize:11, color:'var(--fg-faint)'}}>
                    <span className="mono">{p.flowPath?.split('/').slice(-3).join('/')}</span>
                  </div>

                  {/* Diff: failed selector → proposed selector */}
                  <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--bg-elev)', borderRadius:4}}>
                    <span style={{fontSize:10.5, color:'var(--fg-faint)', minWidth:60, textTransform:'uppercase', letterSpacing:0.5}}>Failed</span>
                    <code style={{fontSize:12, padding:'2px 6px', background:'rgba(229,72,77,0.12)', border:'1px solid rgba(229,72,77,0.4)', borderRadius:3, textDecoration:'line-through', color:'var(--fail, #E5484D)'}}>{p.failedSelector}</code>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--bg-elev)', borderRadius:4}}>
                    <span style={{fontSize:10.5, color:'var(--fg-faint)', minWidth:60, textTransform:'uppercase', letterSpacing:0.5}}>Proposed</span>
                    {isEditing ? (
                      <input className="inp mono" value={editValue} onChange={e => setEditValue(e.target.value)} style={{flex:1, fontSize:12}}/>
                    ) : (
                      <code style={{fontSize:12, padding:'2px 6px', background:'rgba(69,224,168,0.12)', border:'1px solid rgba(69,224,168,0.4)', borderRadius:3, color:'var(--ok, #45E0A8)'}}>{sel || '(none)'}</code>
                    )}
                    {p.modifiedSelector && !isEditing && <span className="pill sq" style={{fontSize:10}}>edited</span>}
                  </div>

                  {p.confidence !== undefined && p.confidence !== null && (
                    <div style={{display:'flex', alignItems:'center', gap:8, fontSize:11.5}}>
                      <span style={{color:'var(--fg-faint)', minWidth:80, textTransform:'uppercase', letterSpacing:0.5, fontSize:10.5}}>Confidence</span>
                      <div style={{flex:1, height:6, background:'var(--bg)', borderRadius:3, overflow:'hidden'}}>
                        <div style={{width: Math.round(p.confidence*100) + '%', height:'100%', background: band.color}}/>
                      </div>
                      <span className="mono" style={{minWidth:42, color:'var(--fg-muted)'}}>{Math.round(p.confidence*100)}%</span>
                      <span className={'pill sq ' + band.cls} style={{fontSize:10.5}}>{band.label}</span>
                    </div>
                  )}

                  {p.rationale && (
                    <div style={{fontSize:11.5, color:'var(--fg-muted)', lineHeight:1.5, padding:'6px 10px', background:'var(--bg-elev)', borderRadius:4, fontStyle:'italic'}}>
                      "{p.rationale}"
                    </div>
                  )}

                  {p.errorReason && (
                    <div style={{fontSize:11.5, color:'var(--fail, #E5484D)', lineHeight:1.5, padding:'6px 10px', border:'1px solid var(--fail, #E5484D)', borderRadius:4}}>
                      <strong>Error:</strong> {p.errorReason}
                    </div>
                  )}

                  <div className="row" style={{gap:6, marginTop:4}}>
                    {isEditing ? (
                      <React.Fragment>
                        <button className="btn primary sm" onClick={() => saveModify(p)} disabled={busyId === p.id || !editValue.trim()}>Save edit</button>
                        <button className="btn ghost sm" onClick={() => { setEditingId(null); }}>Cancel</button>
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <button className="btn primary sm" onClick={() => approve(p)} disabled={busyId === p.id || !canApprove || p.state === 'applied'}>
                          {p.state === 'applied' ? <React.Fragment><Icon.check/> Applied</React.Fragment> : <React.Fragment><Icon.check/> Approve and apply</React.Fragment>}
                        </button>
                        <button className="btn ghost sm" onClick={() => startModify(p)} disabled={busyId === p.id || p.state === 'applied' || p.state === 'rejected'}>Modify</button>
                        <button className="btn ghost sm" onClick={() => reject(p)} disabled={busyId === p.id || p.state === 'rejected' || p.state === 'applied'} style={{color:'var(--fg-muted)'}}>Reject</button>
                      </React.Fragment>
                    )}
                    {p.appliedAt && <span style={{fontSize:10.5, color:'var(--fg-faint)', marginLeft:'auto'}}>Applied {new Date(p.appliedAt).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== App =====
// ===== E-029: QA Plan view — the orientation layer (QA / Flow / Release plans from PMAgent) =====
// Mirrors PMAgent's QA tab in Morbius's own design: master/detail, native badges + meta strip,
// markdown body rendered through Morbius's themed .md-doc. Reuses qa-master / qa-meta-grid / mdToHtml.

// D2 — render a User Flow's mermaid screen-flow graph inline (reuses the global mermaid the App Map uses).
// Zoom/pan viewport: wheel-to-zoom (toward cursor), drag-to-pan, and +/−/fit controls,
// styled to the Morbius monochrome system. The diagram lives in a fixed-height framed
// viewport instead of an unbounded scroll box, so big screen-flows stay legible.
let __mmdSeq = 0;
const MMD_MIN = 0.3, MMD_MAX = 4;
const mmdClamp = (s) => Math.min(MMD_MAX, Math.max(MMD_MIN, s));
function MermaidBlock({ code }) {
  const wrapRef = React.useRef(null);
  const hostRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const sizeRef = React.useRef({ w: 0, h: 0 });
  const [view, setView] = aS({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = aS(false);
  const [err, setErr] = aS(false);

  // Center the diagram in the viewport at a scale that fits (never upscales past 1x).
  const fitView = React.useCallback(() => {
    const wrap = wrapRef.current; const { w, h } = sizeRef.current;
    if (!wrap || !w || !h) { setView({ scale: 1, x: 0, y: 0 }); return; }
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const scale = mmdClamp(Math.min(1, Math.min(cw / w, ch / h) * 0.96));
    setView({ scale, x: (cw - w * scale) / 2, y: (ch - h * scale) / 2 });
  }, []);

  // Render the mermaid source → SVG, normalize it to its intrinsic px size, then fit.
  aE(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!code || !host) return;
    setErr(false);
    if (!window.mermaid) { host.textContent = code; return; }
    const id = "mmd-" + (++__mmdSeq);
    Promise.resolve(window.mermaid.render(id, code))
      .then(out => {
        if (cancelled || !host) return;
        host.innerHTML = (out && out.svg) || "";
        const svg = host.querySelector("svg");
        if (svg) {
          const vb = svg.viewBox && svg.viewBox.baseVal;
          let w = vb && vb.width ? vb.width : 0, h = vb && vb.height ? vb.height : 0;
          if ((!w || !h) && svg.getBBox) { try { const b = svg.getBBox(); w = w || b.width; h = h || b.height; } catch (e) {} }
          sizeRef.current = { w: w || 640, h: h || 360 };
          svg.removeAttribute("style");
          svg.setAttribute("width", sizeRef.current.w);
          svg.setAttribute("height", sizeRef.current.h);
          svg.style.display = "block";
        }
        fitView();
      })
      .catch(() => { if (!cancelled) { setErr(true); if (host) host.innerHTML = ""; } });
    return () => { cancelled = true; };
  }, [code, fitView]);

  // Wheel-to-zoom toward the cursor. Native non-passive listener so preventDefault works
  // (React's synthetic wheel handler is passive and can't stop the page from scrolling).
  aE(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setView(v => {
        const ns = mmdClamp(v.scale * factor);
        const k = ns / v.scale;
        return { scale: ns, x: cx - k * (cx - v.x), y: cy - k * (cy - v.y) };
      });
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {}
  };
  const onPointerMove = (e) => {
    const d = dragRef.current; if (!d) return;
    setView(v => ({ ...v, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
  };
  const endDrag = () => { dragRef.current = null; setDragging(false); };
  const zoomBy = (f) => setView(v => {
    const wrap = wrapRef.current; const cw = wrap ? wrap.clientWidth / 2 : 0, ch = wrap ? wrap.clientHeight / 2 : 0;
    const ns = mmdClamp(v.scale * f); const k = ns / v.scale;
    return { scale: ns, x: cw - k * (cw - v.x), y: ch - k * (ch - v.y) };
  });

  if (!code) return null;
  if (err) return <div style={{fontSize:12, color:"var(--fg-faint)", padding:"8px 0"}}>Screen-flow diagram could not render.</div>;

  const ctrlBtn = { width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-elev)", color:"var(--fg-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer", fontSize:14, lineHeight:1, fontFamily:"var(--font-mono)", userSelect:"none" };
  return (
    <div style={{position:"relative", height:380, border:"1px solid var(--border)", borderRadius:8, background:"var(--bg-app)", overflow:"hidden", margin:"6px 0"}}>
      <div ref={wrapRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
        onDoubleClick={fitView}
        style={{position:"absolute", inset:0, cursor: dragging ? "grabbing" : "grab", touchAction:"none"}}>
        <div ref={hostRef} style={{position:"absolute", left:0, top:0, transformOrigin:"0 0", transform:\`translate(\${view.x}px, \${view.y}px) scale(\${view.scale})\`}}/>
      </div>
      <div style={{position:"absolute", top:8, right:8, display:"flex", alignItems:"center", gap:4}}>
        <span style={{minWidth:38, textAlign:"center", fontSize:10, color:"var(--fg-faint)", fontFamily:"var(--font-mono)"}}>{Math.round(view.scale * 100)}%</span>
        <div title="Zoom out" onClick={()=>zoomBy(1/1.2)} style={ctrlBtn}>−</div>
        <div title="Zoom in" onClick={()=>zoomBy(1.2)} style={ctrlBtn}>+</div>
        <div title="Fit to view" onClick={fitView} style={{...ctrlBtn, fontSize:12}}>⤢</div>
      </div>
      <div style={{position:"absolute", bottom:6, left:10, fontSize:9.5, color:"var(--fg-faint)", pointerEvents:"none", fontFamily:"var(--font-mono)"}}>scroll to zoom · drag to pan · double-click to fit</div>
    </div>
  );
}

// Phase C — execution overlay: roll up Morbius run status for the stories a plan covers.
// This is the truth PMAgent's QA tab can't show ("plan exists" vs "does it pass").
function planExecRollup(storyIds) {
  const tc = (window.MORBIUS && window.MORBIUS.TEST_CASES) || [];
  const set = new Set((storyIds || []).map(s => String(s).toUpperCase()));
  const r = { total: 0, pass: 0, fail: 0, flaky: 0, notRun: 0 };
  for (const t of tc) {
    if (!t.story || !set.has(t.story)) continue;
    r.total++;
    if (t.status === 'pass') r.pass++;
    else if (t.status === 'fail') r.fail++;
    else if (t.status === 'flaky') r.flaky++;
    else r.notRun++;
  }
  return r;
}
function ExecBar({ roll, compact }) {
  if (!roll || !roll.total) return null;
  const seg = (n, c) => n > 0 ? <span style={{flex: n, background: c}}/> : null;
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:6, flexShrink:0}}>
      <span style={{display:'inline-flex', width: compact ? 48 : 120, height: 6, borderRadius: 3, overflow:'hidden', background:'var(--bg-app)'}}>
        {seg(roll.pass, 'var(--ok)')}{seg(roll.flaky, 'var(--warn)')}{seg(roll.fail, 'var(--fail)')}{seg(roll.notRun, 'var(--border)')}
      </span>
      <span style={{fontSize:10, color: roll.pass === roll.total ? 'var(--ok)' : 'var(--fg-faint)', fontFamily:'var(--font-mono)'}}>{roll.pass}/{roll.total}</span>
    </span>
  );
}

// Collapsible card rendering ONE parsed plan section (markdown → themed .md-doc), lazy-rendered.
// This is the fix for the "too limited" detail: decision-critical sections (Scope, Journeys,
// Execution order, ITCs, Screens) become scannable cards instead of one collapsed 20k wall.
function SectionCard({ heading, content, defaultOpen }) {
  const [open, setOpen] = aS(!!defaultOpen);
  return (
    <div style={{border:"1px solid var(--border)", borderRadius:6, marginBottom:8, overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{cursor:"pointer", padding:"8px 12px", display:"flex", alignItems:"center", gap:8, background:"var(--bg-elev)"}}>
        <span style={{color:"var(--fg-faint)", fontSize:10, width:8, flexShrink:0}}>{open ? "▾" : "▸"}</span>
        <span style={{fontSize:12, fontWeight:600, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{heading}</span>
      </div>
      {open && (content
        ? <div className="md-doc" style={{padding:"4px 14px 12px"}} dangerouslySetInnerHTML={{__html: mdToHtml(content)}}/>
        : <div style={{padding:"8px 14px", fontSize:12, color:"var(--fg-faint)"}}>(no detail)</div>)}
    </div>
  );
}

function PlanDetail({ detail, items, onSelectPlan, onNavigate }) {
  const [showDoc, setShowDoc] = aS(false);
  if (!detail) {
    return <div className="qa-detail qa-detail-empty"><div style={{color:"var(--fg-faint)", fontSize:13}}>Select a plan to view it.</div></div>;
  }
  if (detail.error) {
    return <div className="qa-detail qa-detail-empty"><div style={{color:"var(--fg-faint)", fontSize:13}}>Couldn't load this plan.</div></div>;
  }
  const f = detail.fields || {};
  const TYPE = { qa:"QA PLAN", flow:"FLOW PLAN", release:"RELEASE PLAN", "release-def":"RELEASE", userflow:"USER FLOW" };
  const metaKeys = ["Version","Stage","Status","Flow","Release","Type","Style","Owner","Updated"];
  const metas = metaKeys.filter(k => f[k]);
  const bodyHtml = detail.body ? mdToHtml(detail.body) : "";
  const clean = v => (v||"").replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, "$1");
  const allItems = items || [];

  // Parsed plan sections → scannable cards (the "too limited" fix). Per type: which headings open
  // by default (the decision layer) and which to keep out of the cards (raw-doc-only long tail).
  const sectionList = detail.sections || [];
  const SECTION_CFG = {
    flow:          { open: ["scope"],                                              hide: ["maestro implementation", "run log", "change log", "how to read"] },
    qa:            { open: ["suite index", "execution order", "backend dependencies"], hide: ["authoring conventions", "maintaining", "change log"] },
    release:       { open: ["release goal"],                                        hide: ["change log"] },
    userflow:      { open: ["overview", "entry point"],                            hide: ["stories covered"] },
    "release-def": { open: ["overview", "theme", "phases", "goal", "what", "stop-line", "scope"], hide: ["change log", "open questions"] },
  };
  const secCfg = SECTION_CFG[detail.type] || { open: [], hide: [] };
  const lcH = s => (s || "").toLowerCase();
  const planSections = sectionList.filter(s => !secCfg.hide.some(h => lcH(s.heading).includes(h)));
  const sectionOpen = h => secCfg.open.some(o => lcH(h).includes(o));
  const sectionGroupTitle = { flow: "Scope & journeys", qa: "Suite operating manual", release: "Validation journeys & details", userflow: "Screens", "release-def": "Release scope & phases" }[detail.type] || "Plan content";

  // Connections: this plan's stories → Morbius test cases (the live board).
  const tc = (window.MORBIUS && window.MORBIUS.TEST_CASES) || [];
  const storyIds = detail.storyIds || [];
  const planCards = tc.filter(c => c.story && storyIds.includes(c.story));
  const roll = planExecRollup(storyIds);
  const automatedCount = planCards.filter(c => c.automated).length;
  const stories = storyIds.slice().sort().map(sid => {
    const cs = planCards.filter(c => c.story === sid);
    let st = "none";
    if (cs.length) {
      if (cs.every(c => c.status === "pass")) st = "pass";
      else if (cs.some(c => c.status === "fail")) st = "fail";
      else if (cs.some(c => c.status === "flaky")) st = "flaky";
      else st = "not-run";
    }
    const blk = cs.find(c => c.blocked);
    return { sid, count: cs.length, st, blocked: !!blk, blockedReason: blk ? blk.blockedReason : "", title: cs[0] ? cs[0].title.replace(/\\s*—\\s*Test Plan\\s*$/i, "") : "" };
  });
  const blockedStoryCount = stories.filter(s => s.blocked).length;

  // Plan → plan cross-links.
  let crossTitle = null, crossPlans = [];
  if (detail.type === "qa") { crossTitle = "Flow plans in this suite"; crossPlans = allItems.filter(i => i.type === "flow"); }
  else if (detail.type === "release") { crossTitle = "Covered by flow plans"; crossPlans = allItems.filter(i => i.type === "flow" && (i.storyIds||[]).some(s => storyIds.includes(s))); }
  else if (detail.type === "flow") { crossTitle = "In release plans"; crossPlans = allItems.filter(i => i.type === "release" && (i.storyIds||[]).some(s => storyIds.includes(s))); }
  else if (detail.type === "userflow") { crossTitle = "Flow plan"; crossPlans = allItems.filter(i => i.type === "flow" && i.ufId === detail.id); }
  // A Flow Plan's linked User Flow (the screen map / journey).
  const linkedUf = (detail.type === "flow" && detail.ufId) ? allItems.find(i => i.type === "userflow" && i.id === detail.ufId) : null;

  const Section = ({ title, children }) => (
    <div style={{margin:"0 0 16px"}}>
      {title && <div style={{fontSize:10.5, color:"var(--fg-faint)", textTransform:"uppercase", letterSpacing:.5, fontWeight:600, marginBottom:8}}>{title}</div>}
      {children}
    </div>
  );

  return (
    <div className="qa-detail" data-testid="plan-detail">
      <div className="qa-detail-head">
        <span className="pill sq accent" style={{fontSize:10}}>{TYPE[detail.type] || "PLAN"}</span>
        <span className="dr-id">{detail.id}</span>
        <h2 style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{detail.title}</h2>
      </div>
      <div className="qa-detail-body">
        {roll.total > 0 && (
          <div style={{margin:"0 0 14px", padding:"10px 12px", borderRadius:6, border:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
            <span style={{fontSize:10.5, color:"var(--fg-faint)", textTransform:"uppercase", letterSpacing:.5, fontWeight:600}}>{detail.type === "release" ? "Release readiness" : "Execution"}</span>
            <ExecBar roll={roll}/>
            <span style={{fontSize:11, color:"var(--fg-muted)"}}>{roll.pass} pass · {roll.fail} fail · {roll.flaky} flaky · {roll.notRun} not run — {roll.total} cases · {automatedCount} automated{blockedStoryCount > 0 ? " · " : ""}{blockedStoryCount > 0 && <span style={{color:"var(--warn)"}}>⛔ {blockedStoryCount} blocked</span>}</span>
          </div>
        )}

        {metas.length > 0 && (
          <div className="qa-meta-grid" style={{marginBottom:16}}>
            {metas.map(k => <div className="qa-meta" key={k}><span className="k">{k}</span><span>{clean(f[k])}</span></div>)}
          </div>
        )}

        {planSections.length > 0 && (
          <Section title={sectionGroupTitle}>
            <div>
              {planSections.map((s, i) => <SectionCard key={i} heading={s.heading} content={s.content} defaultOpen={sectionOpen(s.heading)}/>)}
            </div>
          </Section>
        )}

        {stories.length > 0 && (
          <Section title={"Covered stories (" + stories.length + ") — click to open in Test Cases"}>
            <div style={{display:"flex", flexDirection:"column", gap:1}}>
              {stories.map(s => (
                <div key={s.sid} className="qa-plan-item" style={{cursor:"pointer"}} onClick={()=>onNavigate && onNavigate("tests", { story: s.sid })}>
                  <span className="qa-plan-dot"><StatusDot status={s.st}/></span>
                  <span className="qa-plan-id">{s.sid}</span>
                  <span className="qa-plan-label" style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{s.title}</span>
                  {s.blocked && <span title={s.blockedReason} style={{flexShrink:0, fontSize:11}}>⛔</span>}
                  <span style={{fontSize:10, color:"var(--fg-faint)", fontFamily:"var(--font-mono)", flexShrink:0}}>{s.count} {s.count===1?"case":"cases"} ›</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {planCards.length > 0 && (
          <Section title="Automation">
            <div style={{display:"flex", alignItems:"center", gap:10, fontSize:12, color:"var(--fg-muted)"}}>
              <span>{automatedCount}/{planCards.length} cases have a Maestro flow</span>
              {detail.flowId
                ? <button className="btn ghost sm" onClick={()=>onNavigate && onNavigate("maestro", { flow: detail.flowId })}>→ Maestro · {detail.flowId}</button>
                : <span style={{fontSize:11, color:"var(--fg-faint)"}}>no automated flow written yet</span>}
            </div>
          </Section>
        )}

        {linkedUf && (
          <Section title="User flow (screens)">
            <button className="chip" onClick={()=>onSelectPlan && onSelectPlan(linkedUf.id)} title={linkedUf.title}>{linkedUf.id} · {linkedUf.title}</button>
            {onNavigate && <button className="btn ghost sm" style={{marginLeft:6}} onClick={()=>onNavigate("appmap")}>→ App Map</button>}
          </Section>
        )}

        {detail.type === "userflow" && (
          <Section title="Screen flow">
            {detail.flowGraph
              ? <MermaidBlock code={detail.flowGraph}/>
              : <span style={{fontSize:12, color:"var(--fg-faint)"}}>No screen-flow graph in this user flow.</span>}
            {onNavigate && <button className="btn ghost sm" style={{marginTop:6}} onClick={()=>onNavigate("appmap")}>→ Open App Map</button>}
          </Section>
        )}

        {crossPlans.length > 0 && (
          <Section title={crossTitle}>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {crossPlans.map(p => (
                <button key={p.id} className="chip" onClick={()=>onSelectPlan && onSelectPlan(p.id)} title={p.title}>{p.id} · {p.title.length>22 ? p.title.slice(0,22)+"…" : p.title}</button>
              ))}
            </div>
          </Section>
        )}

        {bodyHtml && (
          <div>
            <button className="btn ghost sm" onClick={()=>setShowDoc(v=>!v)} style={{marginBottom:10}}>{showDoc ? "▾ Hide raw document" : "▸ Full plan document (raw)"}</button>
            {showDoc && <div className="md-doc" dangerouslySetInnerHTML={{__html: bodyHtml}}/>}
          </div>
        )}
      </div>
    </div>
  );
}

function PlansView({ onNavigate, focusPlan }) {
  const { PLANS, TEST_CASES, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;
  const idx = PLANS || { items: [], releases: [] };
  const items = idx.items || [];
  const qaPlan = items.find(i => i.type === "qa");
  const flows = items.filter(i => i.type === "flow").sort((a,b)=>a.id.localeCompare(b.id));
  const userflows = items.filter(i => i.type === "userflow").sort((a,b)=>a.id.localeCompare(b.id));
  const releases = idx.releases || [];
  const releasePlansCount = releases.filter(r => r.trId).length;
  const missingCount = releases.filter(r => !r.trId).length;
  const trItem = id => items.find(i => i.type === "release" && i.id === id);
  // Phase C: overall passing across the planned suite — stories covered by FLOW + RELEASE plans.
  // (The QA Plan operating doc indexes nearly every story, so it's excluded from this denominator.)
  const allStoryIds = Array.from(new Set(items.filter(i => i.type === "flow" || i.type === "release").flatMap(i => i.storyIds || [])));
  const overall = planExecRollup(allStoryIds);

  const slug = (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.pmagentSlug) || "";
  const [pushing, setPushing] = aS(false);
  const [pushMsg, setPushMsg] = aS(null);
  const pushFromPMAgent = async () => {
    if (!slug || pushing) return;
    setPushing(true); setPushMsg(null);
    try {
      const r = await fetch("/api/pmagent/transfer", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ pmagentSlug: slug }) });
      const j = await r.json();
      if (j.ok) { setPushMsg("✓ plans refreshed from PMAgent"); await window.loadMorbiusData(); }
      else setPushMsg("✗ " + (j.error || ("HTTP " + r.status)));
    } catch (e) { setPushMsg("✗ " + String(e)); }
    setPushing(false);
  };

  const firstId = (qaPlan && qaPlan.id) || (flows[0] && flows[0].id) || null;
  const [selId, setSelId] = aS(focusPlan || firstId);
  const [detail, setDetail] = aS(null);
  aE(() => { if (focusPlan) setSelId(focusPlan); }, [focusPlan]);   // cross-nav: open a specific plan

  aE(() => {
    if (!selId) { setDetail(null); return; }
    let cancelled = false; setDetail(null);
    fetch("/api/plans/" + encodeURIComponent(selId))
      .then(r => r.json())
      .then(d => { if (!cancelled) setDetail(d && typeof d === "object" ? d : { error: true }); })
      .catch(() => { if (!cancelled) setDetail({ error: true }); });
    return () => { cancelled = true; };
  }, [selId]);

  if (!items.length) {
    return (
      <div className="view-body">
        <div className="card" style={{padding:40, textAlign:"center", color:"var(--fg-muted)", lineHeight:1.6}}>
          No QA plans imported yet.<br/>
          {slug
            ? <button className="btn primary sm" style={{marginTop:12}} onClick={pushFromPMAgent} disabled={pushing}>{pushing ? "Pushing…" : "↻ Push from PMAgent"}</button>
            : <span>Link this project to a PMAgent slug, then push — the QA Plan, Flow Plans, and Release Plans come over with the test cases.</span>}
          {pushMsg && <div style={{marginTop:10, fontSize:12, color: pushMsg[0]==="✓" ? "var(--ok)" : "var(--fail)"}}>{pushMsg}</div>}
        </div>
      </div>
    );
  }

  const Row = ({ id, label, sub, on, dim, roll, onClick }) => (
    <div className={"qa-plan-item " + (selId===id ? "active" : "")}
         onClick={dim ? undefined : onClick}
         style={dim ? {opacity:.5, cursor:"default"} : {cursor:"pointer"}}>
      <span style={{width:8, height:8, borderRadius:"50%", flexShrink:0, marginRight:2, background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--border)"}}/>
      <span className="qa-plan-id">{label}</span>
      <span className="qa-plan-label" style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{sub}</span>
      {roll && roll.total > 0 && <ExecBar roll={roll} compact={true}/>}
    </div>
  );

  return (
    <div className="qa-master">
      <div className="qa-list">
        <div className="qa-coverage-bar">
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8}}>
            <div className="qa-coverage-label">QA plan suite</div>
            {slug && <button className="btn ghost sm" onClick={pushFromPMAgent} disabled={pushing} title={"Re-import QA / Flow / Release plans from PMAgent (" + slug + ")"}>{pushing ? "Pushing…" : "↻ Push"}</button>}
          </div>
          <div className="qa-coverage-summary">{flows.length} flow plans · {releasePlansCount}/{releases.length} releases planned{missingCount ? " · " + missingCount + " without a plan" : ""}</div>
          {overall.total > 0 && (
            <div className="qa-coverage-summary" style={{display:"flex", alignItems:"center", gap:6, marginTop:5}}>
              <ExecBar roll={overall}/> <span>cases passing across planned stories</span>
            </div>
          )}
          {pushMsg && <div className="qa-coverage-summary" style={{marginTop:5, color: pushMsg[0]==="✓" ? "var(--ok)" : "var(--fail)"}}>{pushMsg}</div>}
        </div>

        {qaPlan && (
          <React.Fragment>
            <div className="qa-section-label"><span>QA PLAN</span></div>
            <Row id={qaPlan.id} label={qaPlan.fields.Version ? "v"+qaPlan.fields.Version : "plan"} sub={qaPlan.title} on={true} onClick={()=>setSelId(qaPlan.id)}/>
          </React.Fragment>
        )}

        {flows.length > 0 && (
          <React.Fragment>
            <div className="qa-section-label"><span>FLOW PLANS</span><span style={{color:"var(--fg-faint)", fontWeight:400, marginLeft:4}}>({flows.length})</span></div>
            {flows.map(fp => <Row key={fp.id} id={fp.id} label={fp.id} sub={fp.title} on={true} roll={planExecRollup(fp.storyIds)} onClick={()=>setSelId(fp.id)}/>)}
          </React.Fragment>
        )}

        {userflows.length > 0 && (
          <React.Fragment>
            <div className="qa-section-label"><span>USER FLOWS</span><span style={{color:"var(--fg-faint)", fontWeight:400, marginLeft:4}}>({userflows.length})</span></div>
            {userflows.map(uf => <Row key={uf.id} id={uf.id} label={uf.id} sub={uf.title} on={true} roll={planExecRollup(uf.storyIds)} onClick={()=>setSelId(uf.id)}/>)}
          </React.Fragment>
        )}

        {releases.length > 0 && (
          <React.Fragment>
            <div className="qa-section-label"><span>RELEASE PLANS</span></div>
            {releases.map(r => r.trId
              ? <Row key={r.id} id={r.trId} label={r.trId} sub={r.title} on={true} roll={planExecRollup((trItem(r.trId)||{}).storyIds)} onClick={()=>setSelId(r.trId)}/>
              : <Row key={r.id} id={r.id} label={"TR-"+r.id.replace(/^R-/,"")} sub={r.title + " — no plan yet"} on={false} dim={true}/>)}
          </React.Fragment>
        )}

        <div className="qa-section-label"><span>STORY PLANS</span></div>
        <div className="qa-plan-item" onClick={()=>onNavigate && onNavigate("tests")} style={{cursor:"pointer"}}>
          <span style={{width:8, height:8, borderRadius:"50%", flexShrink:0, marginRight:2, background:"var(--fg-faint)"}}/>
          <span className="qa-plan-id">{TEST_CASES.length}</span>
          <span className="qa-plan-label">test cases → open Test Cases ›</span>
        </div>
      </div>
      <PlanDetail detail={detail} items={items} onSelectPlan={setSelId} onNavigate={onNavigate}/>
    </div>
  );
}

function App() {
  const initialTweaks = aM(() => {
    const saved = (()=>{try{return JSON.parse(localStorage.getItem("morbius-tweaks")||"null")}catch{return null}})();
    return { ...(window.__TWEAKS__||{}), ...(saved||{}) };
  }, []);
  const [tweaks, setTweaks] = aS(initialTweaks);
  // Validate the persisted view key — a stale/renamed key from an older build used
  // to land on a "Settings" header over an empty body. Unknown → dashboard.
  const KNOWN_VIEWS = ["dashboard","tests","plans","bugs","devices","runs","maestro","automation-plan","appmap","healing","settings"];
  const [view, setView] = aS(() => {
    const saved = localStorage.getItem("morbius-view");
    return KNOWN_VIEWS.includes(saved) ? saved : "dashboard";
  });
  const [navFilter, setNavFilter] = aS(null);   // {story}|{flow} — filtered cross-nav from the QA Plan hub
  const [chatOpen, setChatOpen] = aS(false);
  const [searchOpen, setSearchOpen] = aS(false);
  const [selTest, setSelTest] = aS(null);
  const [selBug, setSelBug] = aS(null);
  const [rowMode, setRowMode] = aS(false);
  const [jiraSyncing, setJiraSyncing] = aS(false);
  const [jiraSyncMsg, setJiraSyncMsg] = aS(null);
  const [refreshing, setRefreshing] = aS(false);
  const [lastRefresh, setLastRefresh] = aS(new Date());
  // updateKey forces remount of view components on project switch,
  // which clears all useMemo caches and reads fresh window.MORBIUS data
  const [updateKey, forceUpdate] = aS(0);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await window.loadMorbiusData();
      forceUpdate(k => k + 1);
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  aE(() => { localStorage.setItem("morbius-view", view); }, [view]);

  aE(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme || "dark";
    root.dataset.accent = tweaks.accent || "violet";
    root.dataset.density = tweaks.density || "balanced";
    root.dataset.card = tweaks.cardStyle || "bordered";
    root.dataset.layout = tweaks.layout || "sidebar";
  }, [tweaks]);

  const setTweak = aC((k, v) => {
    setTweaks(prev => {
      const next = { ...prev, [k]: v };
      try {
        localStorage.setItem("morbius-tweaks", JSON.stringify(next));
        window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
      } catch {}
      return next;
    });
  }, []);
  const setTheme = (t) => setTweak("theme", t);

  aE(() => {
    const map = {"1":"dashboard","2":"tests","3":"bugs","4":"devices","5":"runs","6":"maestro","7":"automation-plan","8":"appmap","9":"healing"};
    const h = (e) => {
      // ⌘K / Ctrl+K — open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s); return; }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (map[e.key]) setView(map[e.key]);
      if (e.key === "Escape") { setSelTest(null); setSelBug(null); setChatOpen(false); setSearchOpen(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const { TEST_CASES, BUGS, MAESTRO_FLOWS, CATEGORIES, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;

  // Search index — flat list for ⌘K modal
  const searchIndex = aM(() => [
    ...TEST_CASES.map(t => ({ type:'test', id:t.id, label:t.title, sub:t.cat||'', status:t.status, ref:t })),
    ...BUGS.map(b => ({ type:'bug', id:b.id, label:b.title, sub:(b.priority||'')+'·'+(b.device||''), status:b.status, ref:b })),
    ...MAESTRO_FLOWS.map(f => ({ type:'flow', id:f.id, label:f.name, sub:(f.steps||0)+' steps', status:f.status, ref:f })),
  ], [updateKey]);
  const projName = ACTIVE_PROJECT_CONFIG ? ACTIVE_PROJECT_CONFIG.name : 'Dashboard';
  // Trust-pass alignment: count only categories that have at least one test.
  // Dashboard's Category Health widget already filters empty categories, so
  // matching that rule here makes Dashboard / Test Cases agree on a single number.
  const nonEmptyCatSlugs = new Set(TEST_CASES.map(t => t.cat));
  const catCount = CATEGORIES.filter(c => nonEmptyCatSlugs.has(c.slug)).length;

  const heading = {
    dashboard: { t:"Dashboard", s:'Suite health across ' + TEST_CASES.length + ' cases · ' + projName },
    tests: { t:"Test Cases", s:TEST_CASES.length + ' cases across ' + catCount + ' categories' },
    plans: { t:"QA Plan", s:"Test strategy, flow plans and release readiness · " + projName },
    bugs: { t:"Bugs", s:BUGS.filter(b=>b.status==='open'||b.status==='investigating').length + ' open · ' + BUGS.filter(b=>b.jira).length + ' linked to Jira' },
    devices: { t:"Devices", s:'Coverage across ' + (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.devices ? ACTIVE_PROJECT_CONFIG.devices.length : 4) + ' targets' },
    runs: { t:"Runs", s:"Run trend and history" },
    maestro: { t:"Maestro", s:MAESTRO_FLOWS.length + ' YAML flows · Android + iOS' },
    "automation-plan": { t:"Automation Plan", s:"Decide which test cases become Maestro flows — before writing YAML" },
    appmap: { t:"App Map", s:"Screen flow for " + projName },
    healing: { t:"Healing Queue", s:"Self-heal proposals from failed Maestro runs" },
    settings: { t:"Settings", s:"Workspace & personal preferences" },
  }[view] || { t:"Dashboard", s:"" };

  // Human-readable "last refreshed X ago"
  const sinceRefresh = (() => {
    const diff = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    return Math.floor(diff/3600) + 'h ago';
  })();

  const headerActions = view === "dashboard" ? (
    <React.Fragment>
      <span className="pill sq live-pill" title={'Last refreshed ' + lastRefresh.toLocaleTimeString()}>
        <span className="live-dot"/>{sinceRefresh}
      </span>
      <button className="btn sm" onClick={refreshData} disabled={refreshing}
        style={refreshing ? {opacity:0.6} : {}}>
        <span style={refreshing ? {display:'inline-block', animation:'spin 0.8s linear infinite'} : {}}><Icon.sync/></span>
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
      <button className="btn primary sm" onClick={() => setView('maestro')}><Icon.play/> Run suite</button>
    </React.Fragment>
  ) : view === "tests" ? (
    <React.Fragment>
      <div className="seg" style={{marginRight:2}}>
        <button className={\`seg-b \${!rowMode?"on":""}\`} onClick={()=>setRowMode(false)}><Icon.dashboard/> Board</button>
        <button className={\`seg-b \${rowMode?"on":""}\`} onClick={()=>setRowMode(true)}><Icon.sort/> List</button>
      </div>
      <button className="btn primary sm"><Icon.plus/> New test</button>
    </React.Fragment>
  ) : view === "bugs" ? (
    <React.Fragment>
      <button
        className={\`btn ghost sm \${jiraSyncing ? 'loading' : ''}\`}
        disabled={jiraSyncing}
        onClick={async () => {
          setJiraSyncing(true);
          setJiraSyncMsg(null);
          try {
            const res = await fetch('/api/bugs/sync-all', { method: 'POST' });
            const data = res.ok ? await res.json() : { error: 'Failed' };
            setJiraSyncMsg(data.error ? '✕ ' + data.error : '✓ ' + (data.synced || 0) + ' synced');
          } catch(e) {
            setJiraSyncMsg('✕ Network error');
          }
          setJiraSyncing(false);
          setTimeout(() => setJiraSyncMsg(null), 3000);
        }}
      >
        <Icon.sync/> {jiraSyncing ? 'Syncing…' : jiraSyncMsg || 'Sync Jira'}
      </button>
      <button className="btn primary sm"><Icon.plus/> Report bug</button>
    </React.Fragment>
  ) : view === "maestro" ? (
    <button className="btn primary sm"><Icon.play/> Run all</button>
  ) : null;

  let body;
  // Navigate to a view, optionally scrolling to a section anchor
  const handleNavigate = (target, opts) => {
    setView(target);
    const o = typeof opts === "string" ? { anchor: opts } : (opts || {});
    setNavFilter((o.story || o.flow || o.plan) ? o : null);   // remember a story/flow/plan focus for the target view
    if (o.anchor) {
      setTimeout(() => {
        const el = document.querySelector(\`[data-sec="\${o.anchor}"]\`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };
  // Manual nav (sidebar / topnav) clears any cross-nav filter so views aren't stuck filtered.
  const navTo = (v) => { setNavFilter(null); setView(v); };

  if (view === "dashboard") body = <DashboardView key={updateKey} onSelectTest={setSelTest} onSelectBug={setSelBug} onNavigate={handleNavigate}/>;
  else if (view === "tests") body = <TestsView key={updateKey} onSelectTest={setSelTest} rowMode={rowMode} setRowMode={setRowMode} focusStory={view==="tests" && navFilter ? navFilter.story : null} onNavigate={handleNavigate}/>;
  else if (view === "plans") body = <PlansView key={updateKey} onNavigate={handleNavigate} focusPlan={view==="plans" && navFilter ? navFilter.plan : null}/>;
  else if (view === "bugs") body = <BugsView key={updateKey} onSelectBug={setSelBug}/>;
  else if (view === "devices") body = <DevicesView key={updateKey}/>;
  else if (view === "runs") body = <RunsView key={updateKey}/>;
  else if (view === "maestro") body = <MaestroView key={updateKey} focusFlow={view==="maestro" && navFilter ? navFilter.flow : null}/>;
  else if (view === "automation-plan") body = <AutomationPlanView key={updateKey}/>;
  else if (view === "appmap") body = <AppMapView key={updateKey}/>;
  else if (view === "healing") body = <HealingQueueView key={updateKey}/>;
  else if (view === "settings") body = <SettingsView tweaks={tweaks} setTweak={setTweak}/>;
  else body = <DashboardView key={updateKey} onSelectTest={setSelTest} onSelectBug={setSelBug} onNavigate={handleNavigate}/>;  // unknown view → never a blank main

  return (
    <div className="app" data-layout={tweaks.layout || "sidebar"}>
      <Topbar view={view} theme={tweaks.theme||"dark"} setTheme={setTheme} onChat={() => setChatOpen(o => !o)} onSearch={() => setSearchOpen(true)} layout={tweaks.layout} onSync={refreshData} onRunSuite={() => setView(window.MORBIUS?.ACTIVE_PROJECT_CONFIG?.projectType === 'web' ? 'tests' : 'maestro')} onSettings={() => setView("settings")} refreshing={refreshing}/>
      {tweaks.layout === "topnav"
        ? <Topnav view={view} setView={navTo}/>
        : <Sidebar view={view} setView={navTo} onProjectSwitch={() => { setView('dashboard'); forceUpdate(k=>k+1); }}/>}
      <main className="main">
        {view !== "settings" && <ViewHeader title={heading.t} sub={heading.s} actions={headerActions}/>}
        {view === "tests" || view === "bugs" ? body : view === "settings" ? body : <div className="view-body">{body}</div>}
      </main>

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)}/>
      <TestDrawer test={selTest} onClose={() => setSelTest(null)} onSelectBug={setSelBug} setView={navTo}/>
      <BugDrawer bug={selBug} onClose={() => setSelBug(null)} onSelectTest={(testId) => { const t = window.MORBIUS?.TEST_CASES?.find(t => t.id === testId); if (t) { setSelBug(null); setSelTest(t); } }}/>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak}/>
      {searchOpen && <SearchModal index={searchIndex} onClose={()=>setSearchOpen(false)} setView={navTo} setSelTest={setSelTest} setSelBug={setSelBug}/>}
    </div>
  );
}

// Mount after real data loads
loadMorbiusData()
  .catch(err => {
    console.warn('[Morbius] data load failed, using empty state', err);
    window.MORBIUS = {
      TEST_CASES: [], BUGS: [], CATEGORIES: [], MAESTRO_FLOWS: [],
      RUN_HISTORY: [], ACTIVITY: [], SAMPLE_YAML: '',
      PROJECTS: [], ACTIVE_PROJECT: '', ACTIVE_PROJECT_CONFIG: null,
    };
  })
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
  });

  `;
}
