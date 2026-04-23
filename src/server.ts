import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { loadAllTestCases, loadAllBugs, loadAllCategories, loadAllRuns, loadProjectRegistry, saveProjectRegistry, loadProjectConfig, saveProjectConfig, getDataDir, updateTestCaseById, updateBugById, writeBug } from './parsers/markdown.js';
import { importExcel } from './parsers/excel.js';
import { parseMaestroYaml, stepsToHtml } from './parsers/maestro-yaml.js';
import { parseCalculatorConfig, buildCoverageMatrix, findFiles } from './parsers/calculator-config.js';
import { detectFlakyTests, calculateCategoryHealth, findCoverageGaps, buildActivityFeed } from './analyzer.js';
import type { TestCase, Bug, Category, CategoryHealth, TestStatus, ProjectConfig, ProjectRegistry, MaestroRunRecord, LatestRunPointer, RepairRun, SuiteRun } from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');

// Server port (set when startServer is called, used in sync-all self-call)
let serverPort = 3000;

// Active test runs (in-memory tracking)
const activeRuns = new Map<string, {
  testId: string;
  platform: string;
  status: 'running' | 'passed' | 'failed';
  startTime: number;
  endTime?: number;
  output: string;
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

    // Serve the SPA
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHtml());
  });

  // WebSocket server for Claude Code chat bridge
  const wss = new WebSocketServer({ server, path: '/ws/chat' });
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

  // WebSocket server for live run log streaming
  const runStreamWss = new WebSocketServer({ server, path: '/ws/run-stream' });
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
    console.log(`  Local:   http://localhost:${port}\n`);
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
      screenshotPath: record.screenshotPath,
      status: record.status,
      failingStep: record.failingStep,
      errorLine: record.errorLine,
      timestamp: record.endTime,
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

      json(res, { ...test, maestroHtml, maestroYaml, selectorWarnings });
    } else if (pathname.startsWith('/api/bug/') && req.method === 'GET' && !pathname.includes('/update') && !pathname.includes('/create')) {
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
          if (ok) json(res, { ok: true });
          else { res.writeHead(404); res.end('{"error":"Bug not found"}'); }
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

          // Resolve flow path
          let flowPath = '';
          if (platform === 'android') flowPath = (test as any).maestroFlowAndroid || test.maestroFlow || '';
          else if (platform === 'ios') flowPath = (test as any).maestroFlowIos || test.maestroFlow || '';
          else flowPath = test.maestroFlow || '';

          if (!flowPath || !fs.existsSync(flowPath)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No Maestro flow found for ' + platform + (flowPath ? ' (file missing: ' + flowPath + ')' : '') }));
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
            const screenshotPath = status === 'fail' ? await captureScreenshot(platform, runId, testId, dir) : null;

            const record: MaestroRunRecord = {
              runId, testId, platform: platform as any,
              status: status as any,
              startTime, endTime: new Date().toISOString(),
              durationMs: run ? run.endTime! - run.startTime : 0,
              exitCode: code ?? 1, failingStep, errorLine, screenshotPath,
            };
            writeRunRecord(record, dir);
            broadcastRunEvent(runId, { type: 'done', runId, status, failingStep, errorLine, screenshotPath });

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
            const screenshotPath = status === 'fail' ? await captureScreenshot(platform, runId, testId, dir) : null;
            const record: MaestroRunRecord = {
              runId, testId, platform: platform as any,
              status: status as any,
              startTime, endTime: new Date().toISOString(),
              durationMs: run ? run.endTime! - run.startTime : 0,
              exitCode: code ?? 1, failingStep, errorLine, screenshotPath,
            };
            writeRunRecord(record, dir);
            broadcastRunEvent(runId, { type: 'done', runId, status, failingStep, errorLine, screenshotPath });

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
          activeRuns.set(runId, { testId: safeId, platform, status: 'running', startTime: Date.now(), output: '' });

          const runsDir = path.join(dir, 'runs');
          fs.mkdirSync(runsDir, { recursive: true });
          const logStream = fs.createWriteStream(path.join(runsDir, runId + '.log'), { flags: 'a' });
          const startTime = new Date().toISOString();

          const child = spawn('maestro', ['test', filePath], {
            env: { ...process.env },
            cwd: process.cwd(),
          });

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
            const run = activeRuns.get(runId);
            if (run) run.output = output;
          });

          child.on('close', async (code) => {
            logStream.end();
            const status = code === 0 ? 'pass' : 'fail';
            const run = activeRuns.get(runId);
            if (run) { run.status = status === 'pass' ? 'passed' : 'failed'; run.endTime = Date.now(); run.output = output; }
            const { failingStep, errorLine } = parseFailureInfo(output);
            const screenshotPath = status === 'fail' ? await captureScreenshot(platform, runId, safeId, dir) : null;
            const record: MaestroRunRecord = {
              runId, testId: safeId, platform: platform as any, status: status as any,
              startTime, endTime: new Date().toISOString(),
              durationMs: run ? (run.endTime! - run.startTime) : 0,
              exitCode: code ?? 1, failingStep, errorLine, screenshotPath,
            };
            writeRunRecord(record, dir);
            broadcastRunEvent(runId, { type: 'done', runId, status, failingStep, errorLine, screenshotPath });
            setTimeout(() => activeRuns.delete(runId), 5 * 60 * 1000);
          });

          json(res, { ok: true, runId });
        } catch (err) { res.writeHead(400); res.end(JSON.stringify({ error: String(err) })); }
      });
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
          if (!entry.isDirectory() || entry.name === 'shared' || entry.name === 'scripts') continue;
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

    } else if (pathname.startsWith('/api/bugs/') && pathname.endsWith('/sync-jira') && req.method === 'POST') {
      const bugId = decodeURIComponent(pathname.replace('/api/bugs/', '').replace('/sync-jira', ''));
      const bugs = loadAllBugs(dir);
      const bug = bugs.find(b => b.id === bugId);
      if (!bug?.jiraKey) { res.writeHead(400); res.end('{"error":"No Jira key on this bug"}'); return; }

      const registry = loadProjectRegistry();
      const project = registry.projects.find(p => p.id === registry.activeProject);
      const jiraCfg = (project as any)?.jira as { cloudId?: string; baseUrl?: string; token?: string; projectKey?: string } | undefined;
      if (!jiraCfg?.token || !jiraCfg?.cloudId) {
        res.writeHead(400); res.end('{"error":"Jira not configured (missing token or cloudId in projects.json)"}'); return;
      }

      (async () => {
        try {
          // Fetch from Jira REST API v3
          const baseUrl = jiraCfg.baseUrl || `https://api.atlassian.com/ex/jira/${jiraCfg.cloudId}`;
          const issueUrl = `${baseUrl}/rest/api/3/issue/${bug.jiraKey}?fields=summary,status,assignee,priority,comment,labels,description`;
          const response = await fetch(issueUrl, {
            headers: {
              'Authorization': `Bearer ${jiraCfg.token}`,
              'Accept': 'application/json',
            },
          });
          if (!response.ok) {
            res.writeHead(response.status); res.end(JSON.stringify({ error: 'Jira API error: ' + response.statusText })); return;
          }
          const jiraData = await response.json() as any;
          const fields = jiraData.fields;
          const jiraStatus = fields.status?.name ?? '';
          const jiraAssignee = fields.assignee?.displayName ?? '';
          const jiraPriority = fields.priority?.name ?? '';
          const comments = fields.comment?.comments ?? [];
          const jiraLastComment = comments.length > 0 ? (comments[comments.length - 1]?.body?.content?.[0]?.content?.[0]?.text ?? '') : '';
          const jiraLastSynced = new Date().toISOString();

          // Map Jira status to Morbius bug status
          let newStatus = bug.status;
          if (['Done', 'Resolved', 'Closed'].includes(jiraStatus)) newStatus = 'fixed';
          else if (jiraStatus === 'In Progress') newStatus = 'investigating';

          updateBugById(bugId, {
            status: newStatus,
            jiraStatus, jiraAssignee, jiraPriority, jiraLastComment, jiraLastSynced,
            assignee: jiraAssignee || bug.assignee,
          } as any, dir);

          json(res, { ok: true, jiraStatus, jiraAssignee, jiraPriority, jiraLastComment, newStatus });
        } catch (err) {
          res.writeHead(500); res.end(JSON.stringify({ error: String(err) }));
        }
      })();
      return;

    } else if (pathname === '/api/bugs/sync-all' && req.method === 'POST') {
      const bugs = loadAllBugs(dir);
      const jiraBugs = bugs.filter(b => b.jiraKey);
      // Fire-and-forget sequential sync
      (async () => {
        for (const b of jiraBugs) {
          try {
            await fetch(`http://localhost:${serverPort}/api/bugs/${encodeURIComponent(b.id)}/sync-jira`, { method: 'POST' });
          } catch { /* continue */ }
        }
      })();
      json(res, { ok: true, total: jiraBugs.length, message: `Syncing ${jiraBugs.length} Jira bugs in background` });
      return;

    // ── F3: Excel re-import via file upload ───────────────────────────────
    } else if (pathname === '/api/excel/import' && req.method === 'POST') {
      const tmpPath = path.join(require('os').tmpdir(), `morbius-upload-${Date.now()}.xlsx`);
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
      const bug = bugs.find((b: any) => b.id === bugId);
      if (!bug) { res.writeHead(404); res.end('{"error":"Bug not found"}'); return; }

      const registry = loadProjectRegistry();
      const proj = registry.projects.find((p: any) => p.id === registry.activeProject) as any;
      const jiraCfg = proj?.jira;
      if (!jiraCfg?.cloudId || !jiraCfg?.token || !jiraCfg?.projectKey) {
        res.writeHead(400); res.end('{"error":"Jira not configured. Set cloudId, token and projectKey in Settings → Integrations."}'); return;
      }

      const PRIORITY_MAP: Record<string, string> = { P0:'Highest', P1:'High', P2:'Medium', P3:'Low' };
      const payload = {
        fields: {
          project: { key: jiraCfg.projectKey },
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
        try {
          const apiBase = `https://api.atlassian.com/ex/jira/${jiraCfg.cloudId}/rest/api/3`;
          const resp = await fetch(`${apiBase}/issue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${jiraCfg.email || ''}:${jiraCfg.token}`).toString('base64')}`,
            },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            const errText = await resp.text();
            res.writeHead(resp.status); res.end(JSON.stringify({ error: errText })); return;
          }
          const data = await resp.json() as { key: string; self: string };
          const jiraKey = data.key;
          const jiraUrl = `https://${jiraCfg.cloudId}.atlassian.net/browse/${jiraKey}`;
          updateBugById(bugId, { jiraKey, jiraUrl, jiraStatus: 'Open' } as any, dir, 'morbius');
          json(res, { ok: true, jiraKey, jiraUrl });
        } catch (err) {
          res.writeHead(500); res.end(JSON.stringify({ error: String(err) }));
        }
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

  return {
    overallHealth: { total: totalTests, passed: totalPassed, percentage: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0 },
    categories: catHealth,
    flakyTests,
    deviceCoverage,
    recentBugs: bugs.slice(0, 10),
    recentActivity,
    coverageGaps,
  };
}

function getDeviceList() {
  return [
    { id: 'ipad', name: 'iPad', platform: 'ios' as const },
    { id: 'iphone', name: 'iPhone', platform: 'ios' as const },
    { id: 'android-tab', name: 'Android Tablet', platform: 'android' as const },
    { id: 'android-phone', name: 'Android Phone', platform: 'android' as const },
  ];
}

// ============================================================
// HTML Generation — Vercel-style Monochrome Dashboard
// ============================================================

function generateHtml(): string {
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
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
window.mermaid && window.mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
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
<script type="text/babel">${generateJS()}</script>
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

  /* Dark palette (default) */
  --bg: oklch(0.16 0.01 270);
  --bg-elev: oklch(0.19 0.012 270);
  --bg-elev-2: oklch(0.22 0.014 270);
  --bg-hover: oklch(0.24 0.016 270);
  --bg-sunken: oklch(0.13 0.008 270);
  --border: oklch(0.28 0.012 270);
  --border-strong: oklch(0.36 0.014 270);
  --fg: oklch(0.98 0.002 270);
  --fg-muted: oklch(0.75 0.008 270);
  --fg-dim: oklch(0.56 0.01 270);
  --fg-faint: oklch(0.42 0.01 270);

  --ok: oklch(0.72 0.16 155);
  --ok-bg: oklch(0.32 0.05 155 / 0.35);
  --fail: oklch(0.68 0.22 25);
  --fail-bg: oklch(0.35 0.08 25 / 0.35);
  --warn: oklch(0.78 0.15 75);
  --warn-bg: oklch(0.38 0.05 75 / 0.35);
  --info: oklch(0.72 0.15 235);
  --info-bg: oklch(0.32 0.05 235 / 0.35);

  /* Accent — violet default; overridable */
  --accent: oklch(0.68 0.17 285);
  --accent-contrast: oklch(0.99 0 0);
  --accent-soft: oklch(0.3 0.08 285 / 0.4);

  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-md: 0 6px 24px -8px rgb(0 0 0 / 0.4), 0 2px 6px -2px rgb(0 0 0 / 0.25);

  --row-gap: 14px;
  --pad: 20px;
}

[data-theme="light"] {
  --bg: oklch(0.985 0.003 90);
  --bg-elev: oklch(1 0 0);
  --bg-elev-2: oklch(0.98 0.004 90);
  --bg-hover: oklch(0.95 0.005 90);
  --bg-sunken: oklch(0.96 0.004 90);
  --border: oklch(0.9 0.006 90);
  --border-strong: oklch(0.82 0.008 90);
  --fg: oklch(0.18 0.01 270);
  --fg-muted: oklch(0.38 0.01 270);
  --fg-dim: oklch(0.55 0.008 270);
  --fg-faint: oklch(0.7 0.006 270);

  --ok: oklch(0.58 0.16 155);
  --ok-bg: oklch(0.92 0.07 155 / 0.6);
  --fail: oklch(0.55 0.22 25);
  --fail-bg: oklch(0.94 0.07 25 / 0.6);
  --warn: oklch(0.62 0.15 75);
  --warn-bg: oklch(0.94 0.08 75 / 0.6);
  --info: oklch(0.55 0.15 235);
  --info-bg: oklch(0.93 0.06 235 / 0.5);

  --accent: oklch(0.55 0.17 285);
  --accent-soft: oklch(0.92 0.05 285 / 0.6);

  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 8px 24px -8px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.06);
}

/* Accent presets */
[data-accent="violet"] { --accent: oklch(0.68 0.17 285); --accent-soft: oklch(0.3 0.08 285 / 0.4); }
[data-accent="violet"][data-theme="light"] { --accent: oklch(0.55 0.17 285); --accent-soft: oklch(0.92 0.05 285 / 0.6); }
[data-accent="green"] { --accent: oklch(0.72 0.16 155); --accent-soft: oklch(0.3 0.06 155 / 0.4); }
[data-accent="green"][data-theme="light"] { --accent: oklch(0.56 0.15 155); --accent-soft: oklch(0.92 0.05 155 / 0.6); }
[data-accent="amber"] { --accent: oklch(0.78 0.15 75); --accent-soft: oklch(0.3 0.06 75 / 0.4); }
[data-accent="amber"][data-theme="light"] { --accent: oklch(0.62 0.15 75); --accent-soft: oklch(0.94 0.07 75 / 0.6); }
[data-accent="blue"] { --accent: oklch(0.72 0.15 235); --accent-soft: oklch(0.32 0.05 235 / 0.4); }
[data-accent="blue"][data-theme="light"] { --accent: oklch(0.55 0.15 235); --accent-soft: oklch(0.93 0.06 235 / 0.5); }

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
  padding-right: 8px; margin-right: 4px;
  border-right: 1px solid var(--border);
  height: 30px;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 7px; border-radius: 5px;
  font-size: 11px; color: var(--fg-muted);
  background: transparent;
  font-variant-numeric: tabular-nums;
}
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
.sidebar .nav-item .kbd { margin-left: auto; }
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
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast); font-weight: 600; }
.btn.primary:hover { filter: brightness(1.05); }
.btn.danger { color: var(--fail); }
.btn.sm { padding: 3px 7px; font-size: 11.5px; border-radius: 5px; }

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
[data-card="elevated"] .card { box-shadow: var(--shadow-md); border-color: var(--border); }
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
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 62px; background: var(--bg); z-index: 3;
  overflow-x: auto;
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
  flex: 0 0 300px;
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
  transition: border-color .08s ease, transform .08s ease;
}
.tc-card:hover { border-color: var(--border-strong); }
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
  box-shadow: var(--shadow-md);
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
  box-shadow: var(--shadow-md);
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
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 5px; border: 2px solid var(--bg); }
*::-webkit-scrollbar-track { background: transparent; }

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


/* === App extras === */
/* ==========================================================================
   Morbius Dashboard — design tokens
   ========================================================================== */

:root {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  /* Dark palette (default) */
  --bg: oklch(0.16 0.01 270);
  --bg-elev: oklch(0.19 0.012 270);
  --bg-elev-2: oklch(0.22 0.014 270);
  --bg-hover: oklch(0.24 0.016 270);
  --bg-sunken: oklch(0.13 0.008 270);
  --border: oklch(0.28 0.012 270);
  --border-strong: oklch(0.36 0.014 270);
  --fg: oklch(0.98 0.002 270);
  --fg-muted: oklch(0.75 0.008 270);
  --fg-dim: oklch(0.56 0.01 270);
  --fg-faint: oklch(0.42 0.01 270);

  --ok: oklch(0.72 0.16 155);
  --ok-bg: oklch(0.32 0.05 155 / 0.35);
  --fail: oklch(0.68 0.22 25);
  --fail-bg: oklch(0.35 0.08 25 / 0.35);
  --warn: oklch(0.78 0.15 75);
  --warn-bg: oklch(0.38 0.05 75 / 0.35);
  --info: oklch(0.72 0.15 235);
  --info-bg: oklch(0.32 0.05 235 / 0.35);

  /* Accent — violet default; overridable */
  --accent: oklch(0.68 0.17 285);
  --accent-contrast: oklch(0.99 0 0);
  --accent-soft: oklch(0.3 0.08 285 / 0.4);

  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-md: 0 6px 24px -8px rgb(0 0 0 / 0.4), 0 2px 6px -2px rgb(0 0 0 / 0.25);

  --row-gap: 14px;
  --pad: 20px;
}

[data-theme="light"] {
  --bg: oklch(0.985 0.003 90);
  --bg-elev: oklch(1 0 0);
  --bg-elev-2: oklch(0.98 0.004 90);
  --bg-hover: oklch(0.95 0.005 90);
  --bg-sunken: oklch(0.96 0.004 90);
  --border: oklch(0.9 0.006 90);
  --border-strong: oklch(0.82 0.008 90);
  --fg: oklch(0.18 0.01 270);
  --fg-muted: oklch(0.38 0.01 270);
  --fg-dim: oklch(0.55 0.008 270);
  --fg-faint: oklch(0.7 0.006 270);

  --ok: oklch(0.58 0.16 155);
  --ok-bg: oklch(0.92 0.07 155 / 0.6);
  --fail: oklch(0.55 0.22 25);
  --fail-bg: oklch(0.94 0.07 25 / 0.6);
  --warn: oklch(0.62 0.15 75);
  --warn-bg: oklch(0.94 0.08 75 / 0.6);
  --info: oklch(0.55 0.15 235);
  --info-bg: oklch(0.93 0.06 235 / 0.5);

  --accent: oklch(0.55 0.17 285);
  --accent-soft: oklch(0.92 0.05 285 / 0.6);

  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 8px 24px -8px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.06);
}

/* Accent presets */
[data-accent="violet"] { --accent: oklch(0.68 0.17 285); --accent-soft: oklch(0.3 0.08 285 / 0.4); }
[data-accent="violet"][data-theme="light"] { --accent: oklch(0.55 0.17 285); --accent-soft: oklch(0.92 0.05 285 / 0.6); }
[data-accent="green"] { --accent: oklch(0.72 0.16 155); --accent-soft: oklch(0.3 0.06 155 / 0.4); }
[data-accent="green"][data-theme="light"] { --accent: oklch(0.56 0.15 155); --accent-soft: oklch(0.92 0.05 155 / 0.6); }
[data-accent="amber"] { --accent: oklch(0.78 0.15 75); --accent-soft: oklch(0.3 0.06 75 / 0.4); }
[data-accent="amber"][data-theme="light"] { --accent: oklch(0.62 0.15 75); --accent-soft: oklch(0.94 0.07 75 / 0.6); }
[data-accent="blue"] { --accent: oklch(0.72 0.15 235); --accent-soft: oklch(0.32 0.05 235 / 0.4); }
[data-accent="blue"][data-theme="light"] { --accent: oklch(0.55 0.15 235); --accent-soft: oklch(0.93 0.06 235 / 0.5); }

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
  padding-right: 8px; margin-right: 4px;
  border-right: 1px solid var(--border);
  height: 30px;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 7px; border-radius: 5px;
  font-size: 11px; color: var(--fg-muted);
  background: transparent;
  font-variant-numeric: tabular-nums;
}
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
.sidebar .nav-item .kbd { margin-left: auto; }
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
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast); font-weight: 600; }
.btn.primary:hover { filter: brightness(1.05); }
.btn.danger { color: var(--fail); }
.btn.sm { padding: 3px 7px; font-size: 11.5px; border-radius: 5px; }

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
[data-card="elevated"] .card { box-shadow: var(--shadow-md); border-color: var(--border); }
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
  flex: 0 0 300px;
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
  transition: border-color .08s ease, transform .08s ease;
}
.tc-card:hover { border-color: var(--border-strong); }
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
  box-shadow: var(--shadow-md);
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
  box-shadow: var(--shadow-md);
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
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 5px; border: 2px solid var(--bg); }
*::-webkit-scrollbar-track { background: transparent; }

/* Small screens */
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .hero-stats { grid-template-columns: repeat(2, 1fr); }
  .hero-stats .cell { border-bottom: 1px solid var(--border); }
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
  border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,0.6);
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
  color: var(--pass);
  border-color: color-mix(in srgb, var(--pass) 30%, transparent);
}
.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--pass);
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
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
  const [testsRes, bugsRes, dashRes, maestroRes, projectsRes] = await Promise.all([
    fetch('/api/tests'),
    fetch('/api/bugs'),
    fetch('/api/dashboard'),
    fetch('/api/maestro-tests'),
    fetch('/api/projects'),
  ]);

  const testsRaw    = testsRes.ok    ? await testsRes.json()    : [];
  const bugsRaw     = bugsRes.ok     ? await bugsRes.json()     : [];
  const dash        = dashRes.ok     ? await dashRes.json()     : {};
  const maestroRaw  = maestroRes.ok  ? await maestroRes.json()  : {};
  const projData    = projectsRes.ok ? await projectsRes.json() : {};

  // ── Test Cases ──────────────────────────────────────────────
  const TEST_CASES = (testsRaw || []).map(t => ({
    id: t.id,
    title: t.title || '',
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
      if (!flowMap.has(base)) {
        flowMap.set(base, {
          id: base,
          name: f.name || base,
          tcs: f.qaPlanId ? [f.qaPlanId] : [],
          steps: f.stepsCount || 0,
          status: getFlowStatus(f.qaPlanId, TEST_CASES),
          android: f.platform === 'android',
          ios: f.platform === 'ios',
          androidFilePath: f.platform === 'android' ? (f.filePath || '') : '',
          iosFilePath: f.platform === 'ios' ? (f.filePath || '') : '',
          rawYaml: f.rawYaml || '',
        });
      } else {
        const ex = flowMap.get(base);
        if (f.platform === 'android') { ex.android = true; if (f.filePath) ex.androidFilePath = f.filePath; }
        if (f.platform === 'ios') { ex.ios = true; if (f.filePath) ex.iosFilePath = f.filePath; }
        if (f.qaPlanId && !ex.tcs.includes(f.qaPlanId)) ex.tcs.push(f.qaPlanId);
        if (f.stepsCount && !ex.steps) ex.steps = f.stepsCount;
        if (f.rawYaml && !ex.rawYaml) ex.rawYaml = f.rawYaml;
      }
    }
  }
  const MAESTRO_FLOWS = [...flowMap.values()];

  // ── Run History ──────────────────────────────────────────────
  const overallRate = dash.overallHealth ? dash.overallHealth.percentage : 75;
  const RUN_HISTORY = generateRunHistory(overallRate, TEST_CASES.length || 50);

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

function Avatar({ initials, size = 22 }) {
  return <div className="avatar" style={{ width: size, height: size, fontSize: Math.round(size*0.44) }}>{initials}</div>;
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
    return { ...c, total: TEST_CASES.length, rate: Math.round((c.pass/(TEST_CASES.length||1))*100) };
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

  // Computed delta: average of last 7 days vs first 7 days of run history
  const avgRate = arr => arr.length ? Math.round(arr.reduce((s,r)=>s+r.rate,0)/arr.length) : 0;
  const firstHalf = RUN_HISTORY.slice(0, Math.floor(RUN_HISTORY.length/2));
  const secondHalf = RUN_HISTORY.slice(Math.ceil(RUN_HISTORY.length/2));
  const ratesDelta = avgRate(secondHalf) - avgRate(firstHalf);
  const deltaStr = (ratesDelta >= 0 ? '+' : '') + ratesDelta + '% vs prev period';
  const deltaClass = ratesDelta >= 0 ? 'up' : 'down';

  // Bug priority breakdown
  const p0 = openBugs.filter(b => b.priority==='P0').length;
  const p1 = openBugs.filter(b => b.priority==='P1').length;
  const p2 = openBugs.filter(b => b.priority==='P2').length;
  const priorityParts = [p0 && p0+' P0', p1 && p1+' P1', p2 && p2+' P2'].filter(Boolean);
  const priorityLabel = priorityParts.length ? priorityParts.join(' · ') : 'no critical bugs';
  const jiraLinked = openBugs.filter(b => b.jira).length;

  // Coverage: % of test cases that have automation (flows / total TCs)
  const flowCount = (MAESTRO_FLOWS||[]).length;
  const coveragePct = TEST_CASES.length > 0 ? Math.round(Math.min(flowCount, TEST_CASES.length) / TEST_CASES.length * 100) : 0;
  const coverageLabel = flowCount + ' flows · ' + TEST_CASES.length + ' TCs';

  const iconFor = { fail:Icon.fail, run:Icon.play, bug:Icon.bug, edit:Icon.edit, sync:Icon.sync, check:Icon.check, warn:Icon.warn, import:Icon.import };

  return (
    <React.Fragment>
      <div className="hero-stats" style={{marginBottom:"var(--row-gap)"}}>
        <div className="cell">
          <div className="metric">
            <div className="label">{'Pass rate · ' + (RUN_HISTORY[0]?.label?.replace(/^\\w+,\\s*/,'') || '') + '–' + (RUN_HISTORY[RUN_HISTORY.length-1]?.label?.replace(/^\\w+,\\s*/,'') || '')}</div>
            <div className="value">{totals.rate}<span style={{fontSize:16, color:"var(--fg-muted)"}}>%</span></div>
            <div className={\`delta \${deltaClass}\`}><Icon.spark/> {deltaStr}</div>
          </div>
          <Sparkline data={RUN_HISTORY}/>
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Tests</div>
            <div className="value">{totals.total}</div>
            <div className="delta"><span style={{color:"var(--ok)"}}>●</span> {totals.pass} pass · <span style={{color:"var(--fail)"}}>●</span> {totals.fail} fail</div>
          </div>
          <MiniBar run={RUN_HISTORY}/>
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Flaky</div>
            <div className="value" style={{color:"var(--warn)"}}>{totals.flaky}</div>
            <div className="delta">{flaky.length} flaky tests</div>
          </div>
          {flaky[0] && <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6}}>Top offender · <span className="mono">{flaky[0].id}</span></div>}
        </div>
        <div className="cell">
          <div className="metric">
            <div className="label">Open bugs</div>
            <div className="value" style={{color:"var(--fail)"}}>{openBugs.length}</div>
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
          <div style={{fontSize:11, color:"var(--fg-faint)", marginTop:6}}><span className="pill sq accent"><span className="dot"/>Android · iOS</span></div>
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
                    <StatusDot status={c.pct>90?"pass":c.pct>70?"flaky":"fail"}/>
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
                <div className="card-header"><h3>Flaky tests</h3><span className="pill warn"><span className="dot"/>{flaky.length}</span></div>
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
                <div className="card-header"><h3>Recent bugs</h3><span className="pill fail"><span className="dot"/>{openBugs.length} open</span></div>
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
              <button className="btn" style={{justifyContent:"flex-start"}} onClick={()=>onNavigate&&onNavigate('maestro')}><Icon.play/> Run all flows</button>
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
function TestsView({ onSelectTest, rowMode, setRowMode }) {
  const { TEST_CASES, CATEGORIES } = window.MORBIUS;
  const [statusFilter, setStatusFilter] = vS("All");
  const [typeFilter, setTypeFilter] = vS("All");
  const [query, setQuery] = vS("");

  const cols = [
    { key:"pass", label:"Pass" },
    { key:"fail", label:"Fail" },
    { key:"flaky", label:"Flaky" },
    { key:"in-progress", label:"In progress" },
    { key:"not-run", label:"Not run" },
  ];
  const filtered = TEST_CASES.filter(t =>
    (statusFilter==="All" || t.status===statusFilter) &&
    (typeFilter==="All" || t.type===typeFilter) &&
    (!query || (t.title+" "+t.id).toLowerCase().includes(query.toLowerCase()))
  );

  // grouped[status] = { [catSlug]: [tests] } — preserves category order
  const grouped = vM(() => {
    const m = {};
    cols.forEach(c => { m[c.key] = {}; });
    filtered.forEach(t => {
      const col = t.status in m ? t.status : "not-run";
      if (!m[col][t.cat]) m[col][t.cat] = [];
      m[col][t.cat].push(t);
    });
    return m;
  }, [filtered]);

  // Ordered list of categories that actually appear (preserving CATEGORIES order)
  const catOrder = vM(() => {
    const all = new Set(filtered.map(t => t.cat));
    const ordered = CATEGORIES.filter(c => all.has(c.slug));
    // Also include any cat slugs not in CATEGORIES registry (fallback)
    const extra = [...all].filter(s => !ordered.find(c => c.slug === s));
    return [...ordered, ...extra.map(s => ({ slug: s, name: s }))];
  }, [filtered]);

  const statusCounts = [
    { k:"All", n:TEST_CASES.length, l:"All" },
    { k:"pass", n:TEST_CASES.filter(t=>t.status==="pass").length, l:"Pass" },
    { k:"fail", n:TEST_CASES.filter(t=>t.status==="fail").length, l:"Fail" },
    { k:"flaky", n:TEST_CASES.filter(t=>t.status==="flaky").length, l:"Flaky" },
    { k:"not-run", n:TEST_CASES.filter(t=>t.status==="not-run").length, l:"Not run" },
  ];

  return (
    <React.Fragment>
      <div className="kanban-toolbar">
        {/* Row 1: status pills */}
        <div className="kt-row">
          <div className="row" style={{gap:6}}>
            {statusCounts.map(o => (
              <button key={o.k} className={\`chip \${statusFilter===o.k?"active":""}\`} onClick={()=>setStatusFilter(o.k)}>
                {o.k!=="All" && <StatusDot status={o.k}/>} {o.l} <span className="n">{o.n}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Row 2: type filters + search */}
        <div className="kt-row">
          <div className="row" style={{gap:6}}>
            {["All","Happy Path","Flow","Detour","Negative","Edge Case"].map(t => (
              <button key={t} className={\`chip \${typeFilter===t?"active":""}\`} onClick={()=>setTypeFilter(t)}>{t}</button>
            ))}
          </div>
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
                      <td className="id">{t.lastRun}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="kanban">
          {cols.map(col => {
            const colCats = catOrder.filter(c => {
              const slug = c.slug || c;
              return grouped[col.key][slug] && grouped[col.key][slug].length > 0;
            });
            const totalInCol = Object.values(grouped[col.key]).reduce((s, arr) => s + arr.length, 0);
            return (
              <div className="kanban-col" key={col.key}>
                <div className="kanban-col-head">
                  <div className="title"><StatusDot status={col.key}/> {col.label} <span className="pill" style={{fontSize:10, padding:"0 5px"}}>{totalInCol}</span></div>
                  <button className="icon-btn" style={{width:22, height:22}}><Icon.plus/></button>
                </div>
                <div className="kanban-col-body">
                  {colCats.length === 0 && (
                    <div style={{color:"var(--fg-faint)", fontSize:12, padding:"12px 8px", textAlign:"center"}}>—</div>
                  )}
                  {colCats.map((cat, ci) => {
                    const slug = cat.slug || cat;
                    const catName = cat.name || slug;
                    const tests = grouped[col.key][slug] || [];
                    return (
                      <div className="kanban-cat-section" key={slug}>
                        <div className="kanban-cat-label">
                          <span>{catName}</span>
                          <span className="kanban-cat-count">{tests.length}</span>
                        </div>
                        {tests.map(t => (
                          <div key={t.id} className="tc-card" onClick={()=>onSelectTest(t)}>
                            <div className="head">
                              <span className="tc-id">{t.id}</span>
                              <span className="pill" style={{marginLeft:"auto", fontSize:10, padding:"1px 5px"}}>{t.priority}</span>
                            </div>
                            <h4>{t.title}</h4>
                            <div className="meta">
                              <span className="pill" style={{fontSize:10, padding:"1px 6px"}}>{t.type}</span>
                              {t.yaml && <span className="pill accent" style={{fontSize:10, padding:"1px 6px"}}><span className="dot"/>YAML</span>}
                              <span style={{marginLeft:"auto", fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--fg-faint)"}}>{t.lastRun}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </React.Fragment>
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
function DevicesView() {
  const { TEST_CASES, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;
  // Use devices from project config; fall back to a safe default if not configured
  const configDevices = (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.devices)
    ? ACTIVE_PROJECT_CONFIG.devices.map(d => ({ id: d.id, name: d.name, plat: d.platform || d.plat || 'android' }))
    : [
        { id:"iphone", name:"iPhone", plat:"ios" },
        { id:"android-phone", name:"Android Phone", plat:"android" },
      ];
  const devices = configDevices;
  const stats = devices.map(d => {
    const pass = TEST_CASES.filter(t => t.devices[d.id]==="pass").length;
    const fail = TEST_CASES.filter(t => t.devices[d.id]==="fail").length;
    const flaky = TEST_CASES.filter(t => t.devices[d.id]==="flaky").length;
    const notRun = TEST_CASES.filter(t => t.devices[d.id]==="not-run").length;
    const total = pass + fail + flaky + notRun;
    return { ...d, pass, fail, flaky, notRun, pct: Math.round((pass/(total||1))*100) };
  });
  return (
    <React.Fragment>
      <div className="grid g-12" style={{marginBottom:"var(--row-gap)"}}>
        {stats.map(s => (
          <div className={\`col-\${devices.length <= 2 ? 6 : devices.length === 3 ? 4 : 3}\`} key={s.id}>
            <div className="card">
              <div className="card-body">
                <div className="row between">
                  <div className="row" style={{gap:8}}>
                    {s.plat==="ios" ? <Icon.apple/> : <Icon.android/>}
                    <span style={{fontSize:13, fontWeight:600}}>{s.name}</span>
                  </div>
                  <span className="pill">{s.plat}</span>
                </div>
                <div className="metric" style={{marginTop:10}}>
                  <div className="value">{s.pct}<span style={{fontSize:15, color:"var(--fg-muted)"}}>%</span></div>
                </div>
                <div style={{marginTop:8}}>
                  <HealthBar pass={s.pass} fail={s.fail} flaky={s.flaky} notRun={s.notRun}/>
                </div>
                <div style={{marginTop:8, fontSize:11.5, color:"var(--fg-faint)"}}>
                  {s.pass} pass · {s.fail} fail · {s.flaky} flaky
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><h3>Coverage matrix</h3><button className="btn ghost sm"><Icon.sort/> Sort</button></div>
        <div className="card-body plain" style={{overflow:"auto", maxHeight:560}}>
          <table className="matrix">
            <thead>
              <tr>
                <th>Test</th>
                {devices.map(d => <th key={d.id}>{d.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {TEST_CASES.map(t => (
                <tr key={t.id}>
                  <td><span className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{t.id}</span> &nbsp; {t.title}</td>
                  {devices.map(d => (
                    <td key={d.id}><span className={\`cell-dot \${t.devices[d.id]==="not-run"?"none":t.devices[d.id]}\`} title={t.devices[d.id]}/></td>
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
function RunsView() {
  const { RUN_HISTORY } = window.MORBIUS;
  return (
    <React.Fragment>
      <div className="card" style={{marginBottom:"var(--row-gap)"}}>
        <div className="card-header"><h3>{'Run trend · ' + (RUN_HISTORY[0]?.label?.replace(/^\\w+,\\s*/,'') || '') + ' – ' + (RUN_HISTORY[RUN_HISTORY.length-1]?.label?.replace(/^\\w+,\\s*/,'') || '')}</h3><span className="pill accent"><span className="dot"/>CI + Local</span></div>
        <div className="card-body">
          <Sparkline data={RUN_HISTORY} height={120}/>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Recent runs</h3></div>
        <div className="card-body plain">
          <table className="tbl">
            <thead><tr><th>When</th><th>Suite</th><th>Pass</th><th>Fail</th><th>Flaky</th><th>Rate</th><th>Duration</th></tr></thead>
            <tbody>
              {[...RUN_HISTORY].reverse().map((r, i) => (
                <tr key={i}>
                  <td className="id">{r.label}</td>
                  <td>{i===0?"Full suite (auto)":"Full suite"}</td>
                  <td><span style={{color:"var(--ok)"}}>{r.pass}</span></td>
                  <td><span style={{color:"var(--fail)"}}>{r.fail}</span></td>
                  <td><span style={{color:"var(--warn)"}}>{r.flaky}</span></td>
                  <td className="id">{r.rate}%</td>
                  <td className="id" style={{color:"var(--fg-faint)"}}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </React.Fragment>
  );
}

// ===== Maestro =====
function MaestroView() {
  const { MAESTRO_FLOWS, SAMPLE_YAML } = window.MORBIUS;
  const [platform, setPlatform] = vS("android");
  const [selected, setSelected] = vS(MAESTRO_FLOWS[0] || null);
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
      ws.onopen = () => ws.send(JSON.stringify({ type:'subscribe', runId }));
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'log') {
          setRunState(s => ({...s, [flow.id]: { ...s[flow.id], logs: (s[flow.id]?.logs||'') + data.data }}));
        } else if (data.type === 'done') {
          setRunState(s => ({...s, [flow.id]: { ...s[flow.id], status: data.status, logs: (s[flow.id]?.logs||'') + '\\n─── ' + data.status.toUpperCase() + ' ───\\n' }}));
          ws.close();
        }
      };
      ws.onerror = () => setRunState(s => ({...s, [flow.id]: { ...s[flow.id], status:'error', logs:(s[flow.id]?.logs||'')+'WebSocket error\\n' }}));
    } catch(err) {
      setRunState(s => ({...s, [flow.id]: { status:'error', logs:'Failed to start run: '+String(err), runId:null }}));
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
                     runState[activeSelected.id].status === 'fail' ? '✗ Failed' : '! Error'}
                  </span>
                  <button className="icon-btn" onClick={()=>setRunState(s=>{const n={...s};delete n[activeSelected.id];return n;})}><Icon.close/></button>
                </div>
                <RunLogDisplay logs={runState[activeSelected.id].logs}/>
              </div>
            )}
            <YamlBlock yaml={activeSelected.rawYaml || SAMPLE_YAML}/>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function RunLogDisplay({ logs }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);
  return (
    <pre ref={ref} className="run-log-pre">
      {logs || ''}
    </pre>
  );
}

function YamlBlock({ yaml }) {
  const html = yaml
    .replace(/#.*$/gm, m => \`<span class="c">\${m}</span>\`)
    .replace(/^(\\s*-?\\s*)([a-zA-Z_][a-zA-Z0-9_]*):/gm, (_, s, k) => \`\${s}<span class="k">\${k}</span>:\`)
    .replace(/"([^"]+)"/g, '"<span class="s">$1</span>"');
  return <div className="yaml-block" dangerouslySetInnerHTML={{__html: html}}/>;
}


Object.assign(window, { DashboardView, TestsView, BugsView, DevicesView, RunsView, MaestroView, YamlBlock });


// ===== chat.jsx =====
// chat.jsx
const { useState: cS, useRef: cR, useEffect: cE } = React;

function ChatDrawer({ open, onClose }) {
  const [msgs, setMsgs] = cS([
    { role:"assistant", text:"Hey — I'm Morbius. I can run flows, triage failures, or spin up bugs. What are we tackling?" },
    { role:"user", text:"Why is TC-24.01 still flaky?" },
    { role:"assistant", text:"Looking at last 5 runs on Android — passed 3×, failed 1× with an alert-banner timeout, stalled once at hub sync. Likely a race between FCM delivery and the snackbar assertion. Want me to bump the wait 4s → 7s and re-run?" },
  ]);
  const [draft, setDraft] = cS("");
  const scroll = cR(null);
  cE(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [msgs, open]);

  if (!open) return null;
  const send = () => {
    if (!draft.trim()) return;
    const q = draft.trim();
    setMsgs(m => [...m, { role:"user", text:q }, { role:"assistant", text:"On it — streaming from Maestro…" }]);
    setDraft("");
  };
  const suggestions = ["Run all flows on Android","Re-run failing tests","Show today's failures","Summarize flaky trends"];

  return (
    <div className="chat-drawer">
      <div className="chat-head">
        <div className="chat-avatar">M</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:12.5, fontWeight:600}}>Morbius Agent</div>
          <div style={{fontSize:10.5, color:"var(--fg-faint)"}}><StatusDot status="pass"/> connected via Claude Code</div>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon.close/></button>
      </div>
      <div className="chat-body" ref={scroll}>
        {msgs.map((m, i) => (
          <div key={i} className={\`chat-msg \${m.role}\`}>
            <div className="chat-avatar">{m.role==="assistant"?"M":"U"}</div>
            <div className="bubble"><p>{m.text}</p></div>
          </div>
        ))}
      </div>
      <div className="chips-row">
        {suggestions.map(s => <button key={s} className="chip" onClick={()=>setDraft(s)}>{s}</button>)}
      </div>
      <div className="chat-composer">
        <textarea value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask Morbius to run, triage, or explain…"/>
        <div className="row">
          <div className="row" style={{gap:4}}>
            <button className="chip"><Icon.link/> Attach</button>
            <button className="chip"><Icon.play/> /run</button>
          </div>
          <button className="btn primary sm" onClick={send}>Send</button>
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
  return (
    <SettingsCard
      title="Workspace"
      desc={"Project-level config for " + (cfg.name || "this project") + ". Stored in data/projects.json."}
    >
      <div className="grid g-12" style={{gap:14}}>
        <div className="col-4"><Field label="Active project"><span className="inp" style={{display:"block", padding:"7px 10px", fontSize:12.5, color:"var(--accent)", fontWeight:600}}>{cfg.name || "—"}</span></Field></div>
        <div className="col-4"><Field label="Package ID"><input className="inp mono" defaultValue={cfg.appId || ""} readOnly/></Field></div>
        <div className="col-4"><Field label="Project ID"><input className="inp mono" defaultValue={window.MORBIUS?.ACTIVE_PROJECT || ""} readOnly/></Field></div>
        <div className="col-12"><Field label="All projects" hint="Switch projects from the sidebar dropdown"><div className="row wrap" style={{gap:6}}>{projects.map(p => <span key={p.id} className={"pill " + (p.id === window.MORBIUS?.ACTIVE_PROJECT ? "accent" : "")}><span className="dot" style={{background: p.id === window.MORBIUS?.ACTIVE_PROJECT ? "var(--accent)" : "var(--fg-faint)"}}/>{p.name}</span>)}</div></Field></div>
      </div>
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
  return health;
}

// ===== Detail drawer (test + bug) =====
function TestDrawer({ test, onClose }) {
  if (!test) return null;
  const { BUGS } = window.MORBIUS;
  const linked = BUGS.filter(b => b.linkedTest === test.id);
  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head">
          <span className="dr-id">{test.id}</span>
          <StatusPill status={test.status}/>
          <h2 style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{test.title}</h2>
          <button className="btn sm"><Icon.play/> Run</button>
          <button className="btn ghost sm"><Icon.bug/></button>
          <button className="icon-btn" onClick={onClose}><Icon.close/></button>
        </div>
        <div className="drawer-body">
          <section>
            <div className="sec-title">Overview</div>
            <div className="pair"><span className="k">Type</span><span>{test.type}</span></div>
            <div className="pair"><span className="k">Priority</span><span>{test.priority}</span></div>
            <div className="pair"><span className="k">Owner</span><span className="row" style={{gap:6}}><Avatar initials={test.owner} size={18}/> {test.owner}</span></div>
            <div className="pair"><span className="k">Last run</span><span className="mono">{test.lastRun}</span></div>
            <div className="pair"><span className="k">YAML</span><span>{test.yaml ? <span className="pill sq accent"><span className="dot"/>linked</span> : <span className="pill">unlinked</span>}</span></div>
          </section>

          <section>
            <div className="sec-title">Steps</div>
            <ol style={{margin:0, paddingLeft:18, fontSize:12.5, color:"var(--fg-muted)", lineHeight:1.8}}>
              <li>Open app · sign in with test account</li>
              <li>Navigate to the test scenario</li>
              <li>Execute the expected flow steps</li>
              <li>Assert the expected outcome</li>
            </ol>
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

          <section>
            <div className="sec-title">Linked bugs · {linked.length}</div>
            {linked.length ? linked.map(b => (
              <div className="row between" key={b.id} style={{padding:"8px 0", borderBottom:"1px dashed var(--border)"}}>
                <div className="row" style={{gap:8, minWidth:0}}>
                  <span className="mono" style={{fontSize:11, color:"var(--fg-muted)"}}>{b.id}</span>
                  <span style={{fontSize:12.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{b.title}</span>
                </div>
                <StatusPill status={b.status}/>
              </div>
            )) : <div style={{fontSize:12, color:"var(--fg-faint)"}}>No bugs linked.</div>}
          </section>
        </div>
      </aside>
    </React.Fragment>
  );
}

function BugDrawer({ bug, onClose }) {
  if (!bug) return null;
  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head">
          <span className="dr-id">{bug.id}</span>
          {bug.jira && <span className="pill sq accent"><span className="dot"/>Jira · {bug.jira}</span>}
          <span className={\`pill sq \${bug.priority==="P1"?"fail":bug.priority==="P2"?"warn":""}\`}>{bug.priority}</span>
          <h2 style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{bug.title}</h2>
          <StatusPill status={bug.status}/>
          <button className="icon-btn" onClick={onClose}><Icon.close/></button>
        </div>
        <div className="drawer-body">
          <section>
            <div className="pair"><span className="k">Device</span><span>{bug.device}</span></div>
            <div className="pair"><span className="k">Assignee</span><span className="row" style={{gap:6}}><Avatar initials={bug.assignee} size={18}/> {bug.assignee}</span></div>
            {bug.linkedTest && <div className="pair"><span className="k">Linked test</span><span className="mono">{bug.linkedTest}</span></div>}
            <div className="pair"><span className="k">Created</span><span className="mono">{bug.created}</span></div>
          </section>

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
function Sidebar({ view, setView, onProjectSwitch }) {
  const { TEST_CASES, BUGS, MAESTRO_FLOWS, PROJECTS, ACTIVE_PROJECT, ACTIVE_PROJECT_CONFIG } = window.MORBIUS;
  const [showProjects, setShowProjects] = aS(false);
  const health = useHealth();

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

  const items = [
    { k:"dashboard", l:"Dashboard", ic:Icon.dashboard, n:null, kb:"1" },
    { k:"tests", l:"Test Cases", ic:Icon.tests, n:TEST_CASES.length, kb:"2" },
    { k:"bugs", l:"Bugs", ic:Icon.bug, n:openBugs || null, kb:"3" },
    { k:"devices", l:"Devices", ic:Icon.devices, n:devices, kb:"4" },
    { k:"runs", l:"Runs", ic:Icon.runs, n:null, kb:"5" },
    { k:"maestro", l:"Maestro", ic:Icon.maestro, n:MAESTRO_FLOWS.length || null, kb:"6" },
    { k:"appmap", l:"App Map", ic:Icon.appmap, n:null, kb:"7" },
  ];

  const projName = ACTIVE_PROJECT_CONFIG ? ACTIVE_PROJECT_CONFIG.name : (ACTIVE_PROJECT || 'No project');
  const appId = ACTIVE_PROJECT_CONFIG ? (ACTIVE_PROJECT_CONFIG.appId || ACTIVE_PROJECT || '') : '';

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

  return (
    <aside className="sidebar">
      <div className="nav-group">
        <div className="nav-group-label">Project</div>
        <div style={{position:'relative'}}>
          <div onClick={() => setShowProjects(s => !s)}
            style={{display:"flex", alignItems:"center", gap:9, padding:"6px 9px", borderRadius:6,
                    background:"var(--bg-elev)", border:"1px solid var(--border)", cursor:"pointer"}}>
            <div style={{width:22, height:22, borderRadius:5, background:"var(--accent)", display:"grid",
                         placeItems:"center", color:"var(--accent-contrast)", fontFamily:"var(--font-mono)", fontWeight:700, fontSize:11}}>
              {projName.charAt(0).toUpperCase()}
            </div>
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{projName}</div>
              <div style={{fontSize:10.5, color:"var(--fg-faint)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{appId}</div>
            </div>
            <Icon.chevronDown/>
          </div>
          {showProjects && PROJECTS.length > 0 && (
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
            </div>
          )}
        </div>
      </div>

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

      <div className="nav-group">
        <div className="nav-group-label">Run status</div>
        <div style={{padding:"6px 10px", fontSize:11.5, color:"var(--fg-muted)", display:"flex", flexDirection:"column", gap:7}}>
          {[
            { key:"maestro", label:"Maestro CLI" },
            { key:"android", label:"Android" },
            { key:"ios", label:"iOS" },
          ].map(({ key, label }) => {
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

function Topbar({ view, theme, setTheme, onChat, onSearch, layout, onSync, onRunSuite, refreshing }) {
  const health = useHealth();
  const pillClass = (key) => {
    if (health == null) return "status-pill";
    const c = health[key];
    return "status-pill " + (c && c.ok ? "ok" : "fail");
  };
  const pillTitle = (key) => {
    if (health == null) return "checking…";
    const c = health[key];
    return c ? c.detail : "—";
  };
  return (
    <header className="topbar">
      <div className="brand">
        <LogoMark/>
      </div>

      <div className="status-pills">
        <span className={pillClass("maestro")} title={pillTitle("maestro")}><span className="dot"/>Maestro</span>
        <span className={pillClass("android")} title={pillTitle("android")}><span className="dot"/>Android</span>
        <span className={pillClass("ios")} title={pillTitle("ios")}><span className="dot"/>iOS</span>
      </div>

      <div className="search" onClick={onSearch} style={{cursor:'pointer'}}>
        <Icon.search/>
        <span style={{flex:1, color:'var(--fg-faint)'}}>Search tests, bugs, flows…</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" onClick={() => setTheme(theme==="dark"?"light":"dark")} title="Toggle theme">
          {theme==="dark" ? <Icon.sun/> : <Icon.moon/>}
        </button>
        <button className="btn ghost sm" onClick={onSync} disabled={refreshing} title="Reload all data from server">
          <span style={refreshing ? {display:'inline-block', animation:'spin 0.8s linear infinite'} : {}}><Icon.sync/></span>
          {refreshing ? 'Syncing…' : 'Sync'}
        </button>
        <button className="btn sm" onClick={onRunSuite} title="Go to Maestro and run all flows"><Icon.play/> Run suite</button>
        <button className="btn primary sm" onClick={onChat}><Icon.chat/> Morbius</button>
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
function AppMapView() {
  const [state, setState] = aS({ loading: true, appMap: null, projectDisplayName: '', error: null });
  const [renderError, setRenderError] = aS(null);
  const [zoom, setZoom] = aS(1);
  const hostRef = React.useRef(null);
  const renderIdRef = React.useRef(0);
  const ZOOM_MIN = 0.25, ZOOM_MAX = 4, ZOOM_STEP = 0.2;
  const clampZoom = (z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

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

  aE(() => {
    if (state.loading || !state.appMap || !hostRef.current || !window.mermaid) return;
    const host = hostRef.current;
    const id = 'appmap-svg-' + (++renderIdRef.current);
    let cancelled = false;
    (async () => {
      try {
        const { svg } = await window.mermaid.render(id, state.appMap);
        if (cancelled) return;
        host.innerHTML = svg;
        const svgEl = host.querySelector('svg');
        if (svgEl) svgEl.style.display = 'block';
        setRenderError(null);
      } catch (e) {
        if (cancelled) return;
        setRenderError(String(e && e.message || e));
        host.innerHTML = '';
      }
    })();
    return () => { cancelled = true; };
  }, [state.loading, state.appMap]);

  if (state.loading) return <Empty title="Loading App Map…"/>;
  if (state.error) return <Empty title="Failed to load App Map" hint={state.error}/>;
  if (!state.appMap) {
    return (
      <div className="card">
        <div className="card-header"><h3>No App Map defined</h3></div>
        <div className="card-body" style={{fontSize:13, color:'var(--fg-muted)', lineHeight:1.6}}>
          Add a Mermaid flowchart string to the <code>appMap</code> field in
          {' '}<code>data/{'<project>'}/config.json</code>.
          See <code>requirements/epics/E-006-appmap-agent-skills/S-006-001-app-navigation-map.md</code> for the expected format.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
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
            style={{padding:16, overflow:'auto', maxHeight:'calc(100vh - 220px)'}}
            onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))); } }}
          >
            <div ref={hostRef} style={{transform:'scale(' + zoom + ')', transformOrigin:'top left', transition:'transform 120ms ease-out'}}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== App =====
function App() {
  const initialTweaks = aM(() => {
    const saved = (()=>{try{return JSON.parse(localStorage.getItem("morbius-tweaks")||"null")}catch{return null}})();
    return { ...(window.__TWEAKS__||{}), ...(saved||{}) };
  }, []);
  const [tweaks, setTweaks] = aS(initialTweaks);
  const [view, setView] = aS(() => localStorage.getItem("morbius-view") || "dashboard");
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
    const map = {"1":"dashboard","2":"tests","3":"bugs","4":"devices","5":"runs","6":"maestro","7":"settings"};
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
  const catCount = CATEGORIES.length;

  const heading = {
    dashboard: { t:"Dashboard", s:'Suite health across ' + TEST_CASES.length + ' cases · ' + projName },
    tests: { t:"Test Cases", s:TEST_CASES.length + ' cases across ' + catCount + ' categories' },
    bugs: { t:"Bugs", s:BUGS.filter(b=>b.status==='open'||b.status==='investigating').length + ' open · ' + BUGS.filter(b=>b.jira).length + ' linked to Jira' },
    devices: { t:"Devices", s:'Coverage across ' + (ACTIVE_PROJECT_CONFIG && ACTIVE_PROJECT_CONFIG.devices ? ACTIVE_PROJECT_CONFIG.devices.length : 4) + ' targets' },
    runs: { t:"Runs", s:"Run trend and history" },
    maestro: { t:"Maestro", s:MAESTRO_FLOWS.length + ' YAML flows · Android + iOS' },
    appmap: { t:"App Map", s:"Screen flow for " + projName },
    settings: { t:"Settings", s:"Workspace & personal preferences" },
  }[view] || { t:"Settings", s:"" };

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
  const handleNavigate = (target, anchor) => {
    setView(target);
    if (anchor) {
      setTimeout(() => {
        const el = document.querySelector(\`[data-sec="\${anchor}"]\`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };

  if (view === "dashboard") body = <DashboardView key={updateKey} onSelectTest={setSelTest} onSelectBug={setSelBug} onNavigate={handleNavigate}/>;
  else if (view === "tests") body = <TestsView key={updateKey} onSelectTest={setSelTest} rowMode={rowMode} setRowMode={setRowMode}/>;
  else if (view === "bugs") body = <BugsView key={updateKey} onSelectBug={setSelBug}/>;
  else if (view === "devices") body = <DevicesView key={updateKey}/>;
  else if (view === "runs") body = <RunsView key={updateKey}/>;
  else if (view === "maestro") body = <MaestroView key={updateKey}/>;
  else if (view === "appmap") body = <AppMapView key={updateKey}/>;
  else if (view === "settings") body = <SettingsView tweaks={tweaks} setTweak={setTweak}/>;

  return (
    <div className="app" data-layout={tweaks.layout || "sidebar"}>
      <Topbar view={view} theme={tweaks.theme||"dark"} setTheme={setTheme} onChat={() => setChatOpen(true)} onSearch={() => setSearchOpen(true)} layout={tweaks.layout} onSync={refreshData} onRunSuite={() => setView('maestro')} refreshing={refreshing}/>
      {tweaks.layout === "topnav"
        ? <Topnav view={view} setView={setView}/>
        : <Sidebar view={view} setView={setView} onProjectSwitch={() => { setView('dashboard'); forceUpdate(k=>k+1); }}/>}
      <main className="main">
        {view !== "settings" && <ViewHeader title={heading.t} sub={heading.s} actions={headerActions}/>}
        {view === "tests" || view === "bugs" ? body : view === "settings" ? body : <div className="view-body">{body}</div>}
      </main>

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)}/>
      <TestDrawer test={selTest} onClose={() => setSelTest(null)}/>
      <BugDrawer bug={selBug} onClose={() => setSelBug(null)}/>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak}/>
      {searchOpen && <SearchModal index={searchIndex} onClose={()=>setSearchOpen(false)} setView={setView} setSelTest={setSelTest} setSelBug={setSelBug}/>}
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
