import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { loadAllTestCases, loadAllBugs, loadAllCategories, loadAllRuns, loadProjectRegistry, saveProjectRegistry, loadProjectConfig, saveProjectConfig, getDataDir, updateTestCaseById, updateBugById, writeBug } from './parsers/markdown.js';
import { parseMaestroYaml, stepsToHtml } from './parsers/maestro-yaml.js';
import { detectFlakyTests, calculateCategoryHealth, findCoverageGaps, buildActivityFeed } from './analyzer.js';
import type { TestCase, Bug, Category, CategoryHealth, TestStatus, ProjectConfig, ProjectRegistry } from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');

// Active test runs (in-memory tracking)
const activeRuns = new Map<string, {
  testId: string;
  platform: string;
  status: 'running' | 'passed' | 'failed';
  startTime: number;
  endTime?: number;
  output: string;
}>();

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

      // Spawn Claude Code with the morbius agent
      const child = spawn('claude', [
        '--agent', 'morbius',
        '--print',
        userMessage,
      ], {
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      activeProcesses.set(ws, child);

      child.stdout.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'chunk', content: chunk.toString() }));
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'chunk', content: chunk.toString() }));
        }
      });

      child.on('close', (code) => {
        activeProcesses.delete(ws);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'done', exitCode: code }));
        }
      });

      child.on('error', (err) => {
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

  server.listen(port, () => {
    console.log(`\n  Morbius Dashboard`);
    console.log(`  Local:   http://localhost:${port}\n`);
  });
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

      // Check Maestro CLI
      try {
        const ver = execSync('maestro --version 2>/dev/null || echo "not found"', { timeout: 5000 }).toString().trim();
        checks.maestro = { ok: !ver.includes('not found'), detail: ver.includes('not found') ? 'Not installed' : ver };
      } catch {
        checks.maestro = { ok: false, detail: 'Not installed' };
      }

      // Check Android emulator/device
      try {
        const devices = execSync('adb devices 2>/dev/null | grep -v "List" | grep -v "^$" || echo ""', { timeout: 5000 }).toString().trim();
        const hasDevice = devices.length > 0 && !devices.includes('not found');
        checks.android = { ok: hasDevice, detail: hasDevice ? devices.split('\n')[0].split('\t')[0] : 'No device' };
      } catch {
        checks.android = { ok: false, detail: 'adb not available' };
      }

      // Check iOS simulator
      try {
        const sims = execSync('xcrun simctl list devices booted 2>/dev/null | grep "Booted" || echo ""', { timeout: 5000 }).toString().trim();
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

          // Spawn maestro test
          const child = spawn('maestro', ['test', flowPath], { env, cwd: process.cwd() });

          let output = '';
          child.stdout.on('data', (data: Buffer) => {
            output += data.toString();
            const run = activeRuns.get(runId);
            if (run) run.output = output;
          });
          child.stderr.on('data', (data: Buffer) => {
            output += data.toString();
            const run = activeRuns.get(runId);
            if (run) run.output = output;
          });

          child.on('close', (code) => {
            const run = activeRuns.get(runId);
            if (run) {
              run.status = code === 0 ? 'passed' : 'failed';
              run.endTime = Date.now();
              run.output = output;
            }
            // Update test status
            updateTestCaseById(testId, { status: code === 0 ? 'pass' : 'fail' }, dir, 'maestro-run');

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

      if (androidPath) { scanMaestroDir(androidPath, 'android'); scanSharedFlows(androidPath, 'android'); }
      if (iosPath) { scanMaestroDir(iosPath, 'ios'); scanSharedFlows(iosPath, 'ios'); }

      json(res, {
        androidPath,
        iosPath,
        categories,
        totalFlows: categories.reduce((sum, c) => sum + c.flows.length, 0),
      });
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

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function serveScreenshot(pathname: string, res: http.ServerResponse): void {
  const filePath = path.resolve(DATA_DIR, pathname.replace(/^\//, ''));
  // Security: ensure resolved path is under DATA_DIR
  if (!filePath.startsWith(path.resolve(DATA_DIR))) {
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
  const mimeTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morbius — QA Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${generateCSS()}</style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="app">
    <nav id="sidebar">
      <div class="sidebar-header">
        <span class="logo">M</span>
        <div style="flex:1">
          <div class="logo-text">Morbius</div>
          <div class="project-switcher" id="projectSwitcher" onclick="toggleProjectMenu()">
            <span id="activeProjectName" style="font-size:11px;color:var(--text-tertiary)">No project</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      </div>
      <!-- Project Menu Dropdown -->
      <div id="projectMenu" class="project-menu hidden"></div>
      <!-- New Project Modal -->
      <div id="newProjectModal" class="hidden">
        <div class="cmd-backdrop" onclick="closeNewProjectModal()"></div>
        <div class="cmd-dialog" style="width:480px;max-height:80vh;overflow-y:auto">
          <div style="padding:24px 24px 0">
            <div style="font-size:17px;font-weight:600;margin-bottom:4px">New Project</div>
            <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:20px">Set up a new app for QA testing</div>
          </div>
          <div style="padding:0 24px 24px">
            <div class="form-group">
              <label class="form-label">Project Name *</label>
              <input type="text" id="np-name" class="form-input" placeholder="e.g., Micro-Air ConnectRV">
            </div>
            <div class="form-group">
              <label class="form-label">App ID</label>
              <input type="text" id="np-appid" class="form-input" placeholder="e.g., com.microair.connectrv.dev">
            </div>
            <div class="form-group">
              <label class="form-label">Excel Test Plan Path</label>
              <input type="text" id="np-excel" class="form-input" placeholder="/path/to/QA Plan.xlsx">
            </div>
            <div class="form-group">
              <label class="form-label">Maestro Android Tests Path</label>
              <input type="text" id="np-android" class="form-input" placeholder="/path/to/android-tests/">
            </div>
            <div class="form-group">
              <label class="form-label">Maestro iOS Tests Path</label>
              <input type="text" id="np-ios" class="form-input" placeholder="/path/to/ios-tests/">
            </div>
            <div class="form-group">
              <label class="form-label">Required Environment Variables</label>
              <input type="text" id="np-env" class="form-input" placeholder="TEST_EMAIL, TEST_PASSWORD, TEST_HUB_NAME">
              <span style="font-size:10px;color:var(--text-tertiary)">Comma-separated list of env vars needed for tests</span>
            </div>
            <div class="form-group">
              <label class="form-label">Prerequisites / Notes</label>
              <textarea id="np-prereqs" class="form-input" rows="3" placeholder="e.g., Physical device required for Bluetooth tests&#10;Gmail OTP script must be running"></textarea>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
              <button class="btn-secondary" onclick="closeNewProjectModal()">Cancel</button>
              <button class="btn-primary" onclick="createProject()">Create Project</button>
            </div>
          </div>
        </div>
      </div>
      <div class="nav-items">
        <a class="nav-item active" data-view="dashboard" onclick="navigate('dashboard')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>Dashboard</span>
        </a>
        <a class="nav-item" data-view="tests" onclick="navigate('tests')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span>Test Cases</span>
        </a>
        <a class="nav-item" data-view="bugs" onclick="navigate('bugs')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
          <span>Bugs</span>
        </a>
        <a class="nav-item" data-view="devices" onclick="navigate('devices')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          <span>Devices</span>
        </a>
        <a class="nav-item" data-view="runs" onclick="navigate('runs')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Runs</span>
        </a>
        <a class="nav-item" data-view="maestro" onclick="navigate('maestro')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          <span>Maestro Tests</span>
        </a>
        <a class="nav-item" data-view="appmap" onclick="navigate('appmap')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/></svg>
          <span>App Map</span>
        </a>
      </div>
      <div class="sidebar-categories" id="sidebarCategories"></div>
      <div class="sidebar-prereqs" onclick="openPrerequisites()" style="cursor:pointer">
        <div class="sidebar-cat-header" style="display:flex;align-items:center;justify-content:space-between">Prerequisites <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        <div class="prereq-item"><span class="prereq-dot prereq-ok"></span>Node.js 18+</div>
        <div class="prereq-item"><span class="prereq-dot" id="prereq-maestro"></span>Maestro CLI</div>
        <div class="prereq-item"><span class="prereq-dot" id="prereq-excel"></span>Excel Test Plan</div>
        <div class="prereq-item"><span class="prereq-dot" id="prereq-data"></span>Data Imported</div>
      </div>
    </nav>

    <main id="content">
      <div id="topbar">
        <div class="breadcrumb" id="breadcrumb">Dashboard</div>
        <div class="topbar-actions">
          <div class="health-indicators" id="healthIndicators">
            <span class="health-badge" id="health-maestro" title="Maestro CLI"><span class="health-dot"></span>Maestro</span>
            <span class="health-badge" id="health-android" title="Android Device"><span class="health-dot"></span>Android</span>
            <span class="health-badge" id="health-ios" title="iOS Simulator"><span class="health-dot"></span>iOS</span>
          </div>
          <button class="cmd-k" onclick="openSearch()" title="Search (Cmd+K)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
          <button class="chat-toggle-btn" onclick="toggleChat()" title="Chat with Morbius">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
      <div id="view-container"></div>
      <!-- Chat Drawer -->
      <div id="chat-drawer" class="chat-drawer">
        <div class="chat-header">
          <span class="chat-title">Morbius Agent</span>
          <button class="chat-close" onclick="toggleChat()">✕</button>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="chat-welcome">
            <div class="chat-welcome-title">Chat with Morbius</div>
            <div class="chat-welcome-text">Ask me to run tests, check status, create bugs, or anything else.</div>
            <div class="chat-suggestions" id="chatSuggestions">
              <button class="chat-suggestion" onclick="sendChatMessage('Show me failing tests')">Show failing tests</button>
              <button class="chat-suggestion" onclick="sendChatMessage('Run pre-flight check')">Run pre-flight check</button>
              <button class="chat-suggestion" onclick="sendChatMessage('What is the overall health?')">Overall health?</button>
              <button class="chat-suggestion" onclick="sendChatMessage('What bugs are open?')">Open bugs?</button>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <input type="text" class="chat-input" id="chatInput" placeholder="Ask Morbius anything..." onkeydown="if(event.key==='Enter')sendChat()">
          <button class="chat-send" onclick="sendChat()" id="chatSend">→</button>
        </div>
      </div>
    </main>

    <!-- Detail Panel (slides in from right) -->
    <div id="detail-overlay" class="hidden" onclick="closeDetail()"></div>
    <div id="detail-panel" class="hidden">
      <div id="detail-content"></div>
    </div>

    <!-- Command Palette -->
    <div id="cmd-palette" class="hidden">
      <div class="cmd-backdrop" onclick="closeSearch()"></div>
      <div class="cmd-dialog">
        <input type="text" id="cmd-input" placeholder="Search tests, bugs, or actions..." oninput="handleSearch(this.value)">
        <div id="cmd-results"></div>
      </div>
    </div>
  </div>

  <script>${generateJS()}</script>
</body>
</html>`;
}

function generateCSS(): string {
  return `
    :root {
      /* Zinc scale — exact Tailwind values */
      --bg: #09090B;
      --surface: #18181B;
      --elevated: #1F1F23;
      --border: #27272A;
      --border-subtle: #1E1E22;
      --text: #FAFAFA;
      --text-secondary: #A1A1AA;
      --text-tertiary: #71717A;
      --accent: #E4E4E7;
      /* Status — desaturated, professional */
      --pass: #4ADE80;
      --fail: #F87171;
      --flaky: #FACC15;
      --not-run: #71717A;
      --in-progress: #60A5FA;
      /* Layout */
      --sidebar-width: 240px;
      --topbar-height: 48px;
      --panel-width: 480px;
      /* Radius — tight like Linear */
      --radius: 6px;
      --radius-sm: 4px;
      --radius-lg: 8px;
      /* Typography */
      --font: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
      font-variation-settings: 'opsz' 14;
      font-size: 13px;
      line-height: 1.6;
      letter-spacing: -0.011em;
    }

    #app { display: flex; height: 100vh; }

    /* ===== Sidebar ===== */
    #sidebar {
      width: var(--sidebar-width);
      background: var(--surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      user-select: none;
    }
    .sidebar-header {
      padding: 20px 20px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 24px; height: 24px;
      background: var(--text);
      color: var(--bg);
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: -0.02em;
    }
    .logo-text { font-weight: 600; font-size: 14px; letter-spacing: -0.02em; }

    .nav-items { padding: 4px 8px; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      color: var(--text-tertiary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: color 120ms ease, background 120ms ease;
      letter-spacing: -0.01em;
    }
    .nav-item svg { opacity: 0.5; transition: opacity 150ms; }
    .nav-item:hover { color: var(--text-secondary); background: var(--elevated); }
    .nav-item:hover svg { opacity: 0.8; }
    .nav-item.active { color: var(--text); background: var(--elevated); }
    .nav-item.active svg { opacity: 1; }

    .sidebar-categories {
      padding: 6px 10px;
      margin-top: 4px;
      border-top: 1px solid var(--border-subtle);
      overflow-y: auto;
      flex: 1;
    }
    .sidebar-cat-header {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      padding: 14px 10px 6px;
    }
    .sidebar-cat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 120ms ease;
    }
    .sidebar-cat-item:hover { background: var(--elevated); color: var(--text-secondary); }
    .cat-health-bar {
      flex: 1;
      height: 2px;
      background: var(--border-subtle);
      border-radius: 1px;
      overflow: hidden;
    }
    .cat-health-fill { height: 100%; background: var(--pass); border-radius: 1px; transition: width 500ms cubic-bezier(0.4,0,0.2,1); }
    .cat-count { font-size: 10px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

    /* ===== Main Content ===== */
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg);
    }

    #topbar {
      height: var(--topbar-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
      background: var(--bg);
    }
    .breadcrumb { font-size: 12px; font-weight: 500; color: var(--text-tertiary); letter-spacing: 0; }
    .topbar-actions { display: flex; align-items: center; gap: 8px; }
    .cmd-k {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-tertiary);
      font-size: 12px;
      font-family: var(--font);
      cursor: pointer;
      transition: all 150ms ease;
    }
    .cmd-k:hover { border-color: var(--text-tertiary); color: var(--text-secondary); background: var(--surface); }
    .cmd-k kbd {
      font-family: var(--font);
      font-size: 10px;
      color: var(--text-tertiary);
      background: var(--elevated);
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
    }

    #view-container {
      flex: 1;
      overflow: auto;
      padding: 28px 32px;
    }

    /* ===== Kanban Board ===== */
    .kanban-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .kanban-title { font-size: 20px; font-weight: 600; letter-spacing: -0.025em; }
    .kanban-filters {
      display: flex;
      gap: 4px;
      background: var(--surface);
      padding: 3px;
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
    }
    .filter-chip {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 500;
      font-family: var(--font);
      letter-spacing: 0;
      border: none;
      background: transparent;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 150ms ease;
    }
    .filter-chip:hover { color: var(--text-secondary); background: var(--elevated); }
    .filter-chip.active { background: var(--text); color: var(--bg); }
    .type-filters {
      margin: 8px 0 0 0;
      background: transparent;
      border: none;
      padding: 0;
      gap: 6px;
    }
    .type-chip {
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 11px;
      background: var(--surface);
    }
    .type-chip.active {
      background: var(--text);
      color: var(--bg);
      border-color: var(--text);
    }
    .type-chip:hover:not(.active) {
      border-color: var(--text-tertiary);
      background: var(--elevated);
    }
    .type-icon { font-size: 10px; }
    .sort-bar {
      margin: 4px 0 0 0;
      background: transparent;
      border: none;
      padding: 0;
      gap: 4px;
      align-items: center;
    }
    .sort-label {
      font-size: 10px;
      color: var(--text-tertiary);
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 0 8px 0 4px;
    }

    /* Move buttons on cards */
    .card { position: relative; }
    .card-actions {
      position: absolute;
      top: 6px;
      right: 6px;
      display: flex;
      gap: 2px;
      opacity: 0;
      transition: opacity 150ms ease;
    }
    .card:hover .card-actions { opacity: 1; }
    .move-btn {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      background: var(--surface);
      color: var(--text-tertiary);
      font-size: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
    }
    .move-btn:hover { background: var(--elevated); color: var(--text); border-color: var(--text-tertiary); }

    /* Changelog */
    .changelog-list { display: flex; flex-direction: column; gap: 4px; }
    .changelog-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      padding: 4px 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .changelog-ts { color: var(--text-tertiary); min-width: 110px; font-family: var(--font-mono); font-size: 10px; }
    .changelog-field { color: var(--text-secondary); font-weight: 600; min-width: 60px; }
    .changelog-change { color: var(--text-secondary); flex: 1; }
    .changelog-actor {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 8px;
      background: var(--elevated);
      color: var(--text-tertiary);
    }

    /* Run Test buttons & status */
    .btn-run {
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--pass);
      background: transparent;
      color: var(--pass);
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font);
      cursor: pointer;
      transition: all 150ms ease;
    }
    .btn-run:hover { background: var(--pass); color: var(--bg); }
    .run-status-box { margin-top: 8px; }
    .run-spinner {
      font-size: 12px;
      color: var(--text-secondary);
      padding: 8px 12px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      animation: pulse 1.5s ease infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .run-pass {
      font-size: 13px;
      font-weight: 600;
      color: var(--pass);
      padding: 8px 12px;
      background: rgba(69, 224, 168, 0.1);
      border-radius: var(--radius-sm);
      border: 1px solid var(--pass);
    }
    .run-fail {
      font-size: 13px;
      font-weight: 600;
      color: var(--fail);
      padding: 8px 12px;
      background: rgba(229, 72, 77, 0.1);
      border-radius: var(--radius-sm);
      border: 1px solid var(--fail);
    }
    .run-error {
      font-size: 12px;
      color: var(--fail);
      padding: 8px 12px;
      background: rgba(229, 72, 77, 0.05);
      border-radius: var(--radius-sm);
    }

    /* Chat Drawer */
    .chat-toggle-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: transparent;
      color: var(--text-tertiary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
    }
    .chat-toggle-btn:hover { border-color: var(--text-tertiary); color: var(--text); background: var(--surface); }
    .chat-toggle-btn.active { border-color: var(--pass); color: var(--pass); }
    .chat-drawer {
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: var(--bg);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transition: right 250ms ease;
      z-index: 1000;
    }
    .chat-drawer.open { right: 0; }
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .chat-title { font-weight: 600; font-size: 14px; color: var(--text); }
    .chat-close {
      width: 28px; height: 28px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: 14px;
    }
    .chat-close:hover { color: var(--text); background: var(--surface); }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-welcome { text-align: center; padding: 40px 0; }
    .chat-welcome-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .chat-welcome-text { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
    .chat-suggestions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .chat-suggestion {
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid var(--border-subtle);
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 11px;
      cursor: pointer;
      font-family: var(--font);
      transition: all 150ms ease;
    }
    .chat-suggestion:hover { border-color: var(--text-tertiary); color: var(--text); }
    .chat-msg {
      max-width: 90%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
    }
    .chat-msg.user {
      align-self: flex-end;
      background: var(--text);
      color: var(--bg);
      border-bottom-right-radius: 4px;
    }
    .chat-msg.assistant {
      align-self: flex-start;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border-subtle);
      border-bottom-left-radius: 4px;
      white-space: pre-wrap;
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .chat-msg.thinking {
      align-self: flex-start;
      background: var(--surface);
      color: var(--text-tertiary);
      border: 1px solid var(--border-subtle);
      border-bottom-left-radius: 4px;
      animation: pulse 1.5s ease infinite;
    }
    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }
    .chat-input {
      flex: 1;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      font-family: var(--font);
      outline: none;
    }
    .chat-input:focus { border-color: var(--text-tertiary); }
    .chat-send {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      border: none;
      background: var(--text);
      color: var(--bg);
      font-size: 16px;
      cursor: pointer;
      font-weight: 700;
    }
    .chat-send:hover { opacity: 0.8; }
    .chat-send:disabled { opacity: 0.3; cursor: not-allowed; }

    /* App Map */
    .appmap-container {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 32px;
      overflow-x: auto;
      min-height: 400px;
    }
    .appmap-container .mermaid { text-align: center; }
    .appmap-container .mermaid svg { max-width: 100%; height: auto; }
    .appmap-zoom-controls { display: flex; align-items: center; gap: 4px; }
    .appmap-zoom-btn {
      width: 28px; height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 16px; font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 150ms ease;
    }
    .appmap-zoom-btn:hover { border-color: var(--text-tertiary); color: var(--text); background: var(--elevated); }

    .kanban-board {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 24px;
      height: calc(100vh - var(--topbar-height) - 145px);
      scroll-behavior: smooth;
    }
    .kanban-column {
      min-width: 300px;
      max-width: 300px;
      display: flex;
      flex-direction: column;
    }
    .column-header {
      padding: 0 4px 12px;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .column-title {
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
    }
    .column-count {
      font-size: 11px;
      color: var(--text-tertiary);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      background: var(--elevated);
      padding: 1px 7px;
      border-radius: 10px;
    }
    .column-health {
      margin-top: 8px;
      height: 2px;
      background: var(--border-subtle);
      border-radius: 1px;
      overflow: hidden;
    }
    .column-health-fill { height: 100%; background: var(--pass); border-radius: 1px; transition: width 500ms cubic-bezier(0.4,0,0.2,1); }

    .column-cards {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 2px 4px 2px 0;
    }
    .column-cards::-webkit-scrollbar { width: 3px; }
    .column-cards::-webkit-scrollbar-track { background: transparent; }
    .column-cards::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .column-cards::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

    /* ===== Cards ===== */
    .card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: 12px 14px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease;
      position: relative;
    }
    .card::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 2px;
      border-radius: 0 2px 2px 0;
      opacity: 0.7;
    }
    .card.status-pass::before { background: var(--pass); }
    .card.status-fail::before { background: var(--fail); }
    .card.status-flaky::before { background: var(--flaky); }
    .card.status-not-run::before { background: var(--not-run); opacity: 0.25; }
    .card.status-in-progress::before { background: var(--in-progress); }

    .card:hover {
      background: var(--elevated);
      border-color: var(--border);
    }
    .card:active { background: var(--surface); }
    .card-id { font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px; font-weight: 500; letter-spacing: 0; font-variant-numeric: tabular-nums; }
    .card-title { font-size: 13px; font-weight: 500; line-height: 1.45; margin-bottom: 8px; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; letter-spacing: -0.01em; }
    .card:hover .card-title { color: var(--text); }
    .card-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-tertiary); }

    /* ===== Status Pills ===== */
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 1px 7px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 18px;
    }
    .pill-pass { background: rgba(74,222,128,0.10); color: var(--pass); }
    .pill-fail { background: rgba(248,113,113,0.10); color: var(--fail); }
    .pill-flaky { background: rgba(250,204,21,0.10); color: var(--flaky); }
    .pill-not-run { background: rgba(113,113,122,0.15); color: var(--not-run); }
    .pill-in-progress { background: rgba(96,165,250,0.10); color: var(--in-progress); }

    /* Bug card screenshot */
    .card-thumbnail {
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      margin: 8px 0;
    }

    /* Priority dots */
    .priority-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .priority-P1 { background: var(--fail); }
    .priority-P2 { background: var(--flaky); }
    .priority-P3 { background: var(--text-tertiary); }
    .priority-P4 { background: var(--border); }

    /* ===== Detail Panel ===== */
    #detail-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100;
      transition: opacity 200ms ease;
    }
    #detail-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: var(--panel-width);
      height: 100vh;
      background: var(--surface);
      border-left: 1px solid var(--border);
      z-index: 101;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    #detail-panel.open { transform: translateX(0); }
    #detail-overlay.open { opacity: 1; }
    .hidden { display: none !important; }

    .detail-header {
      padding: 24px 28px;
      border-bottom: 1px solid var(--border-subtle);
      position: relative;
    }
    .detail-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: var(--elevated);
      border: 1px solid var(--border);
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      transition: all 120ms;
    }
    .detail-close:hover { background: var(--border); color: var(--text); }
    .detail-id { font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px; font-weight: 500; letter-spacing: 0; }
    .detail-title { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 12px; line-height: 1.4; padding-right: 40px; }
    .detail-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .detail-tag {
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--elevated);
      color: var(--text-tertiary);
      border: 1px solid var(--border-subtle);
      transition: all 120ms;
    }
    .detail-tag:hover { color: var(--text-secondary); border-color: var(--border); }

    .detail-section {
      padding: 18px 28px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .detail-section-title {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-tertiary);
      margin-bottom: 10px;
    }
    .detail-steps {
      font-size: 13px;
      line-height: 1.8;
      color: var(--text-secondary);
    }
    .detail-steps ol { padding-left: 20px; }
    .detail-steps li { margin-bottom: 6px; padding-left: 4px; }

    /* ===== Code Block ===== */
    .yaml-block {
      background: var(--bg);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: 14px 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.7;
      overflow-x: auto;
      color: var(--text-tertiary);
      white-space: pre;
      max-height: 300px;
      overflow-y: auto;
    }
    .yaml-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
    .yaml-toggle svg { transition: transform 200ms; }
    .yaml-toggle.open svg { transform: rotate(180deg); }

    /* Device results table */
    .device-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .device-table th {
      text-align: left;
      padding: 6px 8px;
      font-weight: 500;
      color: var(--text-tertiary);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .device-table td {
      padding: 8px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    /* Selector warnings */
    .warning-box {
      background: rgba(245,166,35,0.08);
      border: 1px solid rgba(245,166,35,0.3);
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 8px;
    }
    .warning-title { color: var(--flaky); font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .warning-text { color: var(--text-secondary); font-size: 12px; line-height: 1.5; }

    /* ===== Dashboard ===== */
    .dash-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .dash-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: 20px 22px;
      transition: border-color 150ms ease;
    }
    .dash-card:hover { border-color: var(--border); }
    .dash-card-title {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-tertiary);
      margin-bottom: 14px;
    }
    .dash-health-big {
      font-size: 48px;
      font-weight: 600;
      letter-spacing: -0.04em;
      margin-bottom: 4px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .dash-health-sub { font-size: 13px; color: var(--text-tertiary); margin-top: 6px; font-weight: 400; }
    .dash-cat-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 5px 0;
    }
    .dash-cat-name { font-size: 12px; width: 140px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dash-cat-bar {
      flex: 1;
      height: 4px;
      background: var(--border-subtle);
      border-radius: 2px;
      overflow: hidden;
    }
    .dash-cat-fill { height: 100%; background: var(--pass); border-radius: 2px; transition: width 500ms cubic-bezier(0.4,0,0.2,1); }
    .dash-cat-pct { font-size: 11px; color: var(--text-tertiary); width: 36px; text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }

    /* Device Matrix */
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .matrix-table th {
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-align: center;
      border-bottom: 1px solid var(--border);
    }
    .matrix-table th:first-child { text-align: left; }
    .matrix-table td {
      padding: 8px 12px;
      text-align: center;
      border-bottom: 1px solid var(--border-subtle);
    }
    .matrix-table td:first-child { text-align: left; color: var(--text-secondary); }
    .matrix-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .matrix-dot.pass { background: var(--pass); }
    .matrix-dot.fail { background: var(--fail); }
    .matrix-dot.flaky { background: var(--flaky); }
    .matrix-dot.not-run { background: var(--not-run); border: 1px solid var(--border); }

    /* ===== Command Palette ===== */
    #cmd-palette { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding-top: 18vh; }
    .cmd-backdrop { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    .cmd-dialog {
      position: relative;
      width: 560px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.3);
    }
    #cmd-input {
      width: 100%;
      padding: 16px 20px;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text);
      font-family: var(--font);
      font-size: 15px;
      font-weight: 400;
      outline: none;
      letter-spacing: -0.2px;
    }
    #cmd-input::placeholder { color: var(--text-tertiary); }
    #cmd-results { max-height: 320px; overflow-y: auto; padding: 4px 0; }
    .cmd-result {
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-secondary);
      transition: all 80ms;
    }
    .cmd-result:hover { background: var(--elevated); color: var(--text); }
    .cmd-result-type { font-size: 9px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; width: 36px; flex-shrink: 0; }

    /* ===== Scrollbar ===== */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--border); }

    /* ===== Sparkline ===== */
    .sparkline { display: flex; gap: 3px; align-items: center; }
    .spark-dot { width: 7px; height: 7px; border-radius: 50%; opacity: 0.85; }
    .spark-dot.pass { background: var(--pass); }
    .spark-dot.fail { background: var(--fail); }
    .spark-dot.flaky { background: var(--flaky); }

    /* ===== Project Switcher ===== */
    .project-switcher {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 2px 0;
      transition: all 120ms;
    }
    .project-switcher:hover span { color: var(--text-secondary) !important; }
    .project-menu {
      position: absolute;
      left: 10px;
      right: 10px;
      top: 72px;
      background: var(--elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 50;
      overflow: hidden;
    }
    .project-menu-item {
      padding: 8px 14px;
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 80ms;
    }
    .project-menu-item:hover { background: var(--border-subtle); color: var(--text); }
    .project-menu-item.active { color: var(--text); }
    .project-menu-item.active::after { content: '✓'; font-size: 12px; color: var(--pass); }
    .project-menu-divider { height: 1px; background: var(--border-subtle); margin: 4px 0; }
    .project-menu-action { color: var(--text-tertiary); font-size: 11px; }
    .project-menu-action:hover { color: var(--text); }

    /* ===== Form Elements ===== */
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
      letter-spacing: 0.2px;
    }
    .form-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      outline: none;
      transition: border-color 150ms;
    }
    .form-input:focus { border-color: var(--text-tertiary); }
    .form-input::placeholder { color: var(--text-tertiary); }
    textarea.form-input { resize: vertical; line-height: 1.5; }
    .btn-primary {
      padding: 8px 20px;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: var(--radius-sm);
      font-family: var(--font);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary {
      padding: 8px 20px;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-family: var(--font);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 120ms;
    }
    .btn-secondary:hover { border-color: var(--text-tertiary); color: var(--text); }

    /* ===== New Project Modal ===== */
    #newProjectModal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 200;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
    }

    /* ===== Prerequisites ===== */
    .sidebar-prereqs {
      padding: 8px 10px 16px;
      border-top: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .prereq-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 10px;
      font-size: 11px;
      color: var(--text-tertiary);
    }
    .prereq-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--text-tertiary);
      flex-shrink: 0;
    }
    .prereq-dot.prereq-ok { background: var(--pass); }
    .prereq-dot.prereq-warn { background: var(--flaky); }
    .prereq-dot.prereq-fail { background: var(--fail); }
    .sidebar-prereqs:hover { background: var(--elevated); border-radius: var(--radius); margin: 0 4px; padding: 8px 6px 16px; }

    /* Prerequisite detail panel */
    .prereq-detail-list { display: flex; flex-direction: column; gap: 2px; }
    .prereq-detail-item {
      padding: 12px 14px;
      background: var(--bg);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      margin-bottom: 6px;
    }
    .prereq-detail-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 4px;
    }
    .prereq-detail-desc {
      font-size: 12px;
      color: var(--text-tertiary);
      line-height: 1.5;
      padding-left: 14px;
    }
    .prereq-detail-desc code, .prereq-detail-check code {
      font-family: var(--font-mono);
      font-size: 11px;
      background: var(--elevated);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }
    .prereq-detail-check {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 6px;
      padding-left: 14px;
    }

    /* ===== Selection ===== */
    ::selection { background: rgba(250,250,250,0.15); }

    /* ===== Maestro Tests View ===== */
    .maestro-category { margin-bottom: 32px; }
    .maestro-cat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .maestro-cat-name { font-size: 14px; font-weight: 600; letter-spacing: -0.2px; }
    .maestro-cat-count { font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
    .maestro-cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
    }
    .maestro-flow-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: 14px 16px;
      cursor: pointer;
      transition: all 150ms cubic-bezier(0.4,0,0.2,1);
    }
    .maestro-flow-card:hover {
      background: var(--elevated);
      border-color: var(--border);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .mf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .mf-id {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-tertiary);
      letter-spacing: 0.3px;
      font-variant-numeric: tabular-nums;
    }
    .mf-platforms { display: flex; gap: 3px; }
    .mf-platform {
      width: 18px; height: 18px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .mf-android { background: rgba(52,211,153,0.15); color: var(--pass); }
    .mf-ios { background: rgba(96,165,250,0.15); color: var(--in-progress); }
    .mf-none { background: var(--border-subtle); color: var(--text-tertiary); opacity: 0.3; }
    .mf-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      line-height: 1.4;
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .maestro-flow-card:hover .mf-name { color: var(--text); }
    .mf-meta {
      display: flex;
      gap: 10px;
      font-size: 11px;
      color: var(--text-tertiary);
    }

    /* Maestro Steps in detail */
    .maestro-steps-list {
      padding-left: 20px;
      font-size: 13px;
      line-height: 1.8;
    }
    .maestro-steps-list li { padding: 2px 0 2px 4px; color: var(--text-secondary); }
    .maestro-steps-list li.step-verify { color: var(--pass); }
    .maestro-steps-list li.step-flow { color: var(--in-progress); }
    .maestro-steps-list li.step-action { color: var(--text-secondary); }

    /* Env vars grid */
    .mf-env-grid { display: flex; flex-direction: column; gap: 4px; }
    .mf-env-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .mf-env-key {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-tertiary);
      background: var(--bg);
      padding: 2px 8px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
    }
    .mf-env-val { color: var(--text-tertiary); font-size: 11px; }

    /* ===== Code Platform Tabs ===== */
    .code-platform-tabs {
      display: flex;
      gap: 2px;
      background: var(--bg);
      padding: 2px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }
    .code-tab {
      padding: 3px 10px;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--text-tertiary);
      font-family: var(--font);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 100ms;
      letter-spacing: 0.3px;
    }
    .code-tab:hover { color: var(--text-secondary); }
    .code-tab.active { background: var(--elevated); color: var(--text); }

    .mf-filename {
      font-size: 9px;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      opacity: 0.5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 160px;
    }

    /* ===== Jira Badge ===== */
    .jira-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 3px;
      background: #2684FF;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      flex-shrink: 0;
      vertical-align: middle;
    }

    /* ===== Health Indicators (topbar) ===== */
    .health-indicators {
      display: flex;
      gap: 6px;
      margin-right: 12px;
    }
    .health-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: var(--text-tertiary);
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      cursor: default;
      transition: all 150ms;
    }
    .health-badge:hover { border-color: var(--border); }
    .health-badge.live { color: var(--text-secondary); border-color: rgba(52,211,153,0.3); }
    .health-badge.offline { color: var(--text-tertiary); }
    .health-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-tertiary);
      flex-shrink: 0;
    }
    .health-badge.live .health-dot { background: var(--pass); box-shadow: 0 0 6px rgba(52,211,153,0.5); }
    .health-badge.offline .health-dot { background: var(--fail); }

    /* ===== Status Dropdown ===== */
    .status-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 50;
      min-width: 180px;
      background: var(--elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      padding: 4px;
      margin-top: 4px;
    }
    .status-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 80ms;
    }
    .status-option:hover { background: var(--border-subtle); }
    .status-option.active { background: var(--border-subtle); }
    .status-clickable { cursor: pointer; position: relative; }
    .status-clickable:hover { opacity: 0.8; }

    /* ===== Toast ===== */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--text);
      color: var(--bg);
      padding: 10px 24px;
      border-radius: var(--radius);
      font-size: 13px;
      font-weight: 500;
      opacity: 0;
      transition: all 200ms cubic-bezier(0.16,1,0.3,1);
      z-index: 300;
      pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* ===== Animations ===== */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .dash-card { animation: slideUp 300ms ease both; }
    .dash-card:nth-child(2) { animation-delay: 50ms; }
    .dash-card:nth-child(3) { animation-delay: 100ms; }
    .dash-card:nth-child(4) { animation-delay: 150ms; }
    .dash-card:nth-child(5) { animation-delay: 200ms; }
    .dash-card:nth-child(6) { animation-delay: 250ms; }
    .card { animation: fadeIn 200ms ease both; }
  `;
}

function generateJS(): string {
  return `
    // State
    let currentView = 'dashboard';
    let allTests = [];
    let allBugs = [];
    let allCategories = [];
    let activeFilter = 'all';
    let activeTypeFilter = 'all';
    let activeSortField = localStorage.getItem('morbius-sort-field') || 'id';
    let activeSortDir = localStorage.getItem('morbius-sort-dir') || 'asc';
    let deviceSortField = localStorage.getItem('morbius-device-sort') || 'name';
    let deviceSortDir = localStorage.getItem('morbius-device-sort-dir') || 'asc';
    let searchIndex = null;
    let projectRegistry = { activeProject: '', projects: [] };

    // Initialize
    async function init() {
      await loadProjects();
      await loadData();
      navigate('dashboard');
      setupKeyboardShortcuts();
      checkPrereqs();
    }

    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        projectRegistry = await res.json();
        updateProjectSwitcher();
      } catch {}
    }

    function updateProjectSwitcher() {
      const nameEl = document.getElementById('activeProjectName');
      if (!nameEl) return;
      const active = projectRegistry.projects.find(p => p.id === projectRegistry.activeProject);
      nameEl.textContent = active ? active.name : (projectRegistry.projects.length > 0 ? 'Select project' : 'No project');
    }

    function toggleProjectMenu() {
      const menu = document.getElementById('projectMenu');
      if (menu.classList.contains('hidden')) {
        let html = '';
        for (const p of projectRegistry.projects) {
          const isActive = p.id === projectRegistry.activeProject;
          html += '<div class="project-menu-item' + (isActive ? ' active' : '') + '" onclick="switchProject(\\'' + p.id + '\\')">' + esc(p.name) + '</div>';
        }
        html += '<div class="project-menu-divider"></div>';
        html += '<div class="project-menu-item project-menu-action" onclick="openNewProjectModal()">+ New Project</div>';
        menu.innerHTML = html;
        menu.classList.remove('hidden');
      } else {
        menu.classList.add('hidden');
      }
    }

    async function switchProject(projectId) {
      document.getElementById('projectMenu').classList.add('hidden');
      try {
        await fetch('/api/projects/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });
        await loadProjects();
        await loadData();
        navigate(currentView);
        checkPrereqs();
      } catch (err) {
        console.error('Failed to switch project:', err);
      }
    }

    function openNewProjectModal() {
      document.getElementById('projectMenu').classList.add('hidden');
      document.getElementById('newProjectModal').classList.remove('hidden');
      document.getElementById('np-name').focus();
    }

    function closeNewProjectModal() {
      document.getElementById('newProjectModal').classList.add('hidden');
    }

    async function createProject() {
      const name = document.getElementById('np-name').value.trim();
      if (!name) { document.getElementById('np-name').style.borderColor = 'var(--fail)'; return; }

      const envStr = document.getElementById('np-env').value.trim();
      const envVars = {};
      if (envStr) {
        envStr.split(',').map(s => s.trim()).filter(Boolean).forEach(v => { envVars[v] = ''; });
      }

      const prereqsStr = document.getElementById('np-prereqs').value.trim();
      const prerequisites = prereqsStr ? prereqsStr.split('\\n').filter(Boolean) : [];

      const config = {
        name,
        appId: document.getElementById('np-appid').value.trim() || undefined,
        excel: { source: document.getElementById('np-excel').value.trim() || '' },
        maestro: {
          androidPath: document.getElementById('np-android').value.trim() || undefined,
          iosPath: document.getElementById('np-ios').value.trim() || undefined,
        },
        env: Object.keys(envVars).length > 0 ? envVars : undefined,
        prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      };

      try {
        const res = await fetch('/api/projects/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        const result = await res.json();
        if (result.ok) {
          closeNewProjectModal();
          await loadProjects();
          await loadData();
          navigate('dashboard');
          checkPrereqs();
        }
      } catch (err) {
        console.error('Failed to create project:', err);
      }
    }

    function checkPrereqs() {
      const dataEl = document.getElementById('prereq-data');
      if (dataEl) dataEl.classList.add(allTests.length > 0 ? 'prereq-ok' : 'prereq-warn');

      const excelEl = document.getElementById('prereq-excel');
      if (excelEl) excelEl.classList.add(allCategories.some(c => c.sheet) ? 'prereq-ok' : 'prereq-warn');

      const maestroEl = document.getElementById('prereq-maestro');
      if (maestroEl) maestroEl.classList.add(allTests.length > 0 ? 'prereq-ok' : 'prereq-warn');

      // Fetch live system health
      checkSystemHealth();
    }

    async function checkSystemHealth() {
      try {
        const res = await fetch('/api/health');
        const health = await res.json();

        const maestroBadge = document.getElementById('health-maestro');
        const androidBadge = document.getElementById('health-android');
        const iosBadge = document.getElementById('health-ios');

        if (maestroBadge) {
          maestroBadge.className = 'health-badge ' + (health.maestro?.ok ? 'live' : 'offline');
          maestroBadge.title = 'Maestro CLI: ' + (health.maestro?.detail || 'unknown');
        }
        if (androidBadge) {
          androidBadge.className = 'health-badge ' + (health.android?.ok ? 'live' : 'offline');
          androidBadge.title = 'Android: ' + (health.android?.detail || 'unknown');
        }
        if (iosBadge) {
          iosBadge.className = 'health-badge ' + (health.ios?.ok ? 'live' : 'offline');
          iosBadge.title = 'iOS: ' + (health.ios?.detail || 'unknown');
        }
      } catch {}
    }

    async function loadData() {
      try {
        const [testsRes, bugsRes, catsRes] = await Promise.all([
          fetch('/api/tests'),
          fetch('/api/bugs'),
          fetch('/api/categories'),
        ]);
        allTests = await testsRes.json();
        allBugs = await bugsRes.json();
        allCategories = await catsRes.json();
        renderSidebarCategories();
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }

    function renderSidebarCategories() {
      const el = document.getElementById('sidebarCategories');
      let html = '<div class="sidebar-cat-header">Categories</div>';
      for (const cat of allCategories) {
        const tests = allTests.filter(t => t.category === cat.id);
        const passed = tests.filter(t => t.status === 'pass').length;
        const pct = tests.length > 0 ? Math.round((passed / tests.length) * 100) : 0;
        html += '<div class="sidebar-cat-item" onclick="filterCategory(\\'' + cat.id + '\\')">' +
          '<span style="flex-shrink:0">' + cat.name + '</span>' +
          '<div class="cat-health-bar"><div class="cat-health-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="cat-count">' + tests.length + '</span>' +
          '</div>';
      }
      el.innerHTML = html;
    }

    function navigate(view) {
      currentView = view;
      activeFilter = 'all';
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const navEl = document.querySelector('[data-view="' + view + '"]');
      if (navEl) navEl.classList.add('active');

      const container = document.getElementById('view-container');
      const breadcrumb = document.getElementById('breadcrumb');

      switch (view) {
        case 'dashboard':
          breadcrumb.textContent = 'Dashboard';
          renderDashboard(container);
          break;
        case 'tests':
          breadcrumb.textContent = 'Test Cases';
          renderTestBoard(container);
          break;
        case 'bugs':
          breadcrumb.textContent = 'Bugs';
          renderBugBoard(container);
          break;
        case 'devices':
          breadcrumb.textContent = 'Device Matrix';
          renderDeviceMatrix(container);
          break;
        case 'runs':
          breadcrumb.textContent = 'Runs';
          renderRuns(container);
          break;
        case 'maestro':
          breadcrumb.textContent = 'Maestro Tests';
          renderMaestroTests(container);
          break;
        case 'appmap':
          breadcrumb.textContent = 'App Map';
          renderAppMap(container);
          break;
      }
    }

    function filterCategory(catId) {
      navigate('tests');
      // Scroll to column
      setTimeout(() => {
        const col = document.querySelector('[data-category="' + catId + '"]');
        if (col) col.scrollIntoView({ behavior: 'smooth', inline: 'start' });
      }, 100);
    }

    // ==========================================
    // Dashboard View
    // ==========================================
    async function renderDashboard(container) {
      // Load full dashboard data from API (includes analyzer results)
      let dashData;
      try {
        const res = await fetch('/api/dashboard');
        dashData = await res.json();
      } catch { dashData = null; }

      const total = allTests.length;
      const passed = allTests.filter(t => t.status === 'pass').length;
      const failed = allTests.filter(t => t.status === 'fail').length;
      const flaky = allTests.filter(t => t.status === 'flaky').length;
      const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

      // Category health rows
      let catRows = '';
      const catData = dashData?.categories ?? [];
      if (catData.length > 0) {
        for (const ch of catData) {
          const name = ch.category?.name ?? ch.category?.id ?? '';
          catRows += '<div class="dash-cat-row">' +
            '<span class="dash-cat-name">' + esc(name) + '</span>' +
            '<div class="dash-cat-bar"><div class="dash-cat-fill" style="width:' + ch.percentage + '%"></div></div>' +
            '<span class="dash-cat-pct">' + ch.percentage + '%</span>' +
            '</div>';
        }
      } else {
        for (const cat of allCategories) {
          const tests = allTests.filter(t => t.category === cat.id);
          const p = tests.filter(t => t.status === 'pass').length;
          const cpct = tests.length > 0 ? Math.round((p / tests.length) * 100) : 0;
          catRows += '<div class="dash-cat-row">' +
            '<span class="dash-cat-name">' + esc(cat.name) + '</span>' +
            '<div class="dash-cat-bar"><div class="dash-cat-fill" style="width:' + cpct + '%"></div></div>' +
            '<span class="dash-cat-pct">' + cpct + '%</span>' +
            '</div>';
        }
      }

      // Recent bugs list
      let bugList = '';
      const recentBugs = allBugs.slice(0, 6);
      for (const bug of recentBugs) {
        bugList += '<div class="dash-cat-row" style="cursor:pointer" onclick="openBugDetail(\\'' + bug.id + '\\')">' +
          '<span class="' + pillClass(bug.status === 'open' ? 'fail' : bug.status === 'fixed' ? 'pass' : 'flaky') + '" style="font-size:10px">' + bug.status.toUpperCase() + '</span>' +
          '<span style="font-size:13px;color:var(--text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(bug.title) + '</span>' +
          '<span style="font-size:11px;color:var(--text-tertiary)">' + bug.id + '</span>' +
          '</div>';
      }

      // Flaky tests section
      let flakyHtml = '';
      const flakyTests = dashData?.flakyTests ?? [];
      if (flakyTests.length > 0) {
        for (const ft of flakyTests.slice(0, 5)) {
          let sparkline = '<div class="sparkline">';
          for (const s of (ft.recentResults || [])) {
            sparkline += '<span class="spark-dot ' + s + '"></span>';
          }
          sparkline += '</div>';
          flakyHtml += '<div class="dash-cat-row" style="cursor:pointer" onclick="openTestDetail(\\'' + ft.testId + '\\')">' +
            '<span class="dash-cat-name" style="width:auto;flex:1">' + esc(ft.testId) + ' ' + esc(ft.testTitle) + '</span>' +
            sparkline +
            '<span style="font-size:11px;color:var(--flaky)">' + Math.round(ft.score * 100) + '%</span>' +
            '</div>';
        }
      } else {
        flakyHtml = '<span style="font-size:13px;color:var(--text-tertiary)">No flaky tests detected</span>';
      }

      // Device coverage
      let deviceHtml = '';
      const deviceCoverage = dashData?.deviceCoverage ?? [];
      for (const dc of deviceCoverage) {
        const name = dc.device?.name ?? dc.device?.id ?? '';
        deviceHtml += '<div class="dash-cat-row">' +
          '<span class="dash-cat-name">' + esc(name) + '</span>' +
          '<div class="dash-cat-bar"><div class="dash-cat-fill" style="width:' + dc.percentage + '%"></div></div>' +
          '<span class="dash-cat-pct">' + dc.percentage + '%</span>' +
          '</div>';
      }

      // Coverage gaps
      let gapsHtml = '';
      const gaps = dashData?.coverageGaps ?? [];
      if (gaps.length > 0) {
        for (const gap of gaps) {
          gapsHtml += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
            '<span style="color:var(--flaky)">⚠</span>' +
            '<span style="font-size:12px;color:var(--text-secondary)">' + esc(gap) + '</span>' +
            '</div>';
        }
      }

      // Build the full dashboard
      container.innerHTML =
        '<div class="kanban-header"><h1 class="kanban-title">Dashboard</h1></div>' +
        '<div class="dash-grid">' +
          // Row 1: Health + Recent Bugs
          '<div class="dash-card">' +
            '<div class="dash-card-title">Overall Health</div>' +
            '<div class="dash-health-big" style="color:' + (pct >= 80 ? 'var(--pass)' : pct >= 50 ? 'var(--flaky)' : 'var(--fail)') + '">' + pct + '%</div>' +
            '<div class="dash-health-sub">' + passed + ' of ' + total + ' tests passing</div>' +
            '<div style="display:flex;gap:16px;margin-top:12px">' +
              '<span style="font-size:12px"><span style="color:var(--fail)">' + failed + '</span> failed</span>' +
              '<span style="font-size:12px"><span style="color:var(--flaky)">' + flaky + '</span> flaky</span>' +
              '<span style="font-size:12px"><span style="color:var(--text-tertiary)">' + allBugs.length + '</span> bugs</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card">' +
            '<div class="dash-card-title">Recent Bugs</div>' +
            (bugList || '<span style="font-size:13px;color:var(--text-tertiary)">No bugs yet</span>') +
          '</div>' +
          // Row 2: Categories + Flaky Tests
          '<div class="dash-card">' +
            '<div class="dash-card-title">By Category</div>' +
            catRows +
          '</div>' +
          '<div class="dash-card">' +
            '<div class="dash-card-title">Flaky Tests</div>' +
            flakyHtml +
          '</div>' +
          // Row 3: Device Coverage + Coverage Gaps
          '<div class="dash-card">' +
            '<div class="dash-card-title">Device Coverage</div>' +
            (deviceHtml || '<span style="font-size:13px;color:var(--text-tertiary)">No device data yet</span>') +
          '</div>' +
          '<div class="dash-card">' +
            '<div class="dash-card-title">Coverage Gaps</div>' +
            (gapsHtml || '<span style="font-size:13px;color:var(--text-tertiary)">No gaps detected</span>') +
          '</div>' +
        '</div>';
    }

    // ==========================================
    // Test Case Kanban Board
    // ==========================================
    function renderTestBoard(container) {
      const filters = [
        { key: 'all', label: 'All' },
        { key: 'pass', label: 'PASS' },
        { key: 'fail', label: 'FAIL' },
        { key: 'flaky', label: 'FLAKY' },
        { key: 'in-progress', label: 'IN PROGRESS' },
        { key: 'not-run', label: 'NOT RUN' },
        { key: 'has-yaml', label: 'HAS YAML' },
      ];
      let filterHtml = '<div class="kanban-filters">';
      for (const f of filters) {
        const count = f.key === 'all' ? allTests.length :
          f.key === 'has-yaml' ? allTests.filter(t => t.maestroFlow).length :
          allTests.filter(t => t.status === f.key).length;
        const showCount = f.key !== 'all' && count > 0;
        filterHtml += '<button class="filter-chip' + (activeFilter === f.key ? ' active' : '') + '" onclick="setFilter(\\'' + f.key + '\\')">' +
          f.label + (showCount ? ' <span style="opacity:0.6;margin-left:2px">' + count + '</span>' : '') +
        '</button>';
      }
      filterHtml += '</div>';

      // Test type filter row
      const typeFilters = [
        { key: 'all', label: 'All Types' },
        { key: 'Happy Path', label: 'Happy Path', icon: '✓' },
        { key: 'Flow', label: 'Flow', icon: '→' },
        { key: 'Detour', label: 'Detour', icon: '↩' },
        { key: 'Negative', label: 'Negative', icon: '✗' },
        { key: 'Edge Case', label: 'Edge Case', icon: '◇' },
      ];
      let typeFilterHtml = '<div class="kanban-filters type-filters">';
      for (const tf of typeFilters) {
        const count = tf.key === 'all' ? allTests.length :
          allTests.filter(t => t.scenario === tf.key).length;
        const showCount = tf.key !== 'all' && count > 0;
        typeFilterHtml += '<button class="filter-chip type-chip' + (activeTypeFilter === tf.key ? ' active' : '') + '" onclick="setTypeFilter(\\'' + tf.key + '\\')">' +
          (tf.icon ? '<span class="type-icon">' + tf.icon + '</span> ' : '') +
          tf.label + (showCount ? ' <span style="opacity:0.6;margin-left:2px">' + count + '</span>' : '') +
        '</button>';
      }
      typeFilterHtml += '</div>';

      const sortOptions = [
        { key: 'id', label: 'ID' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'name', label: 'Name' },
        { key: 'scenario', label: 'Type' },
      ];
      let sortHtml = '<div class="kanban-filters sort-bar"><span class="sort-label">Sort:</span>';
      for (const s of sortOptions) {
        const isActive = activeSortField === s.key;
        const arrow = isActive ? (activeSortDir === 'asc' ? ' \\u2191' : ' \\u2193') : '';
        sortHtml += '<button class="filter-chip' + (isActive ? ' active' : '') + '" onclick="setSort(\\'' + s.key + '\\')">' +
          s.label + arrow + '</button>';
      }
      sortHtml += '</div>';

      let columnsHtml = '';
      for (const cat of allCategories) {
        let tests = allTests.filter(t => t.category === cat.id);
        // Apply status filter
        if (activeFilter === 'has-yaml') {
          tests = tests.filter(t => t.maestroFlow);
        } else if (activeFilter !== 'all') {
          tests = tests.filter(t => t.status === activeFilter);
        }
        // Apply type filter
        if (activeTypeFilter !== 'all') {
          tests = tests.filter(t => t.scenario === activeTypeFilter);
        }
        tests = sortTests(tests, activeSortField, activeSortDir);

        // Hide empty columns when filters are active
        if ((activeFilter !== 'all' || activeTypeFilter !== 'all') && tests.length === 0) continue;

        const allCatTests = allTests.filter(t => t.category === cat.id);
        const passed = allCatTests.filter(t => t.status === 'pass').length;
        const pct = allCatTests.length > 0 ? Math.round((passed / allCatTests.length) * 100) : 0;

        let cardsHtml = '';
        for (const test of tests) {
          const devices = test.deviceResults ? test.deviceResults.length : 0;
          const bugs = allBugs.filter(b => b.linkedTest === test.id).length;
          cardsHtml += '<div class="card status-' + test.status + '" onclick="openTestDetail(\\'' + test.id + '\\')">' +
            '<div class="card-actions">' +
              '<button class="move-btn" onclick="moveCard(\\'' + test.id + '\\', \\'up\\', event)" title="Move up">↑</button>' +
              '<button class="move-btn" onclick="moveCard(\\'' + test.id + '\\', \\'down\\', event)" title="Move down">↓</button>' +
            '</div>' +
            '<div class="card-id">' + esc(test.id) + '</div>' +
            '<div class="card-title">' + esc(test.title) + '</div>' +
            '<div class="card-meta">' +
              '<span class="' + pillClass(test.status) + '">' + statusLabel(test.status) + '</span>' +
              (devices > 0 ? '<span>' + devices + ' devices</span>' : '') +
              (bugs > 0 ? '<span>' + bugs + ' bug' + (bugs > 1 ? 's' : '') + '</span>' : '') +
            '</div>' +
          '</div>';
        }

        columnsHtml += '<div class="kanban-column" data-category="' + cat.id + '">' +
          '<div class="column-header">' +
            '<div class="column-title"><span>' + esc(cat.name) + '</span><span class="column-count">' + tests.length + '</span></div>' +
            '<div class="column-health"><div class="column-health-fill" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div class="column-cards">' + cardsHtml + '</div>' +
        '</div>';
      }

      container.innerHTML =
        '<div class="kanban-header"><h1 class="kanban-title">Test Cases</h1>' + filterHtml + '</div>' +
        typeFilterHtml +
        sortHtml +
        '<div class="kanban-board">' + columnsHtml + '</div>';
    }

    function setFilter(f) {
      activeFilter = f;
      renderTestBoard(document.getElementById('view-container'));
    }

    function setTypeFilter(t) {
      activeTypeFilter = t;
      renderTestBoard(document.getElementById('view-container'));
    }

    function sortTests(tests, field, dir) {
      const sorted = [...tests];
      sorted.sort(function(a, b) {
        let cmp = 0;
        if (field === 'id') {
          const numA = parseFloat(a.id.replace(/[^0-9.]/g, '')) || 0;
          const numB = parseFloat(b.id.replace(/[^0-9.]/g, '')) || 0;
          cmp = numA - numB;
        } else if (field === 'status') {
          const w = { fail: 0, flaky: 1, 'in-progress': 2, 'not-run': 3, pass: 4 };
          cmp = (w[a.status] ?? 5) - (w[b.status] ?? 5);
        } else if (field === 'priority') {
          cmp = (a.priority || 'P4').localeCompare(b.priority || 'P4');
        } else if (field === 'name') {
          cmp = (a.title || '').localeCompare(b.title || '');
        } else if (field === 'scenario') {
          cmp = (a.scenario || '').localeCompare(b.scenario || '');
        }
        return dir === 'desc' ? -cmp : cmp;
      });
      return sorted;
    }

    function setSort(field) {
      if (activeSortField === field) {
        activeSortDir = activeSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        activeSortField = field;
        activeSortDir = 'asc';
      }
      localStorage.setItem('morbius-sort-field', activeSortField);
      localStorage.setItem('morbius-sort-dir', activeSortDir);
      renderTestBoard(document.getElementById('view-container'));
    }

    async function moveCard(testId, direction, evt) {
      if (evt) evt.stopPropagation();
      try {
        await fetch('/api/test/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: testId, direction: direction })
        });
        await loadData();
        renderTestBoard(document.getElementById('view-container'));
      } catch (err) {
        console.error('Reorder failed:', err);
      }
    }

    async function runTest(testId, platform) {
      const statusId = 'run-status-' + testId.replace(/\\./g, '-');
      const statusEl = document.getElementById(statusId);
      if (statusEl) statusEl.innerHTML = '<div class="run-spinner">Running on ' + platform + '...</div>';
      try {
        const res = await fetch('/api/test/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, platform })
        });
        const data = await res.json();
        if (data.error) {
          if (statusEl) statusEl.innerHTML = '<div class="run-error">' + esc(data.error) + '</div>';
          return;
        }
        pollRunStatus(data.runId, testId, statusId);
      } catch (err) {
        if (statusEl) statusEl.innerHTML = '<div class="run-error">Failed to start: ' + err + '</div>';
      }
    }

    function pollRunStatus(runId, testId, statusId) {
      const statusEl = document.getElementById(statusId);
      const startTime = Date.now();
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/test/run/' + runId + '/status');
          const data = await res.json();
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          if (data.status === 'running') {
            if (statusEl) statusEl.innerHTML = '<div class="run-spinner">Running... ' + elapsed + 's</div>';
          } else {
            clearInterval(interval);
            const icon = data.status === 'passed' ? '✓' : '✗';
            const cls = data.status === 'passed' ? 'run-pass' : 'run-fail';
            if (statusEl) statusEl.innerHTML = '<div class="' + cls + '">' + icon + ' ' + data.status.toUpperCase() + ' (' + elapsed + 's)</div>';
            await loadData();
            // Don't re-render full board, just update the detail if open
          }
        } catch {
          clearInterval(interval);
          if (statusEl) statusEl.innerHTML = '<div class="run-error">Lost connection to server</div>';
        }
      }, 2000);
    }

    // ==========================================
    // Chat
    // ==========================================
    let chatWs = null;
    let chatOpen = false;

    function toggleChat() {
      chatOpen = !chatOpen;
      const drawer = document.getElementById('chat-drawer');
      const btn = document.querySelector('.chat-toggle-btn');
      if (chatOpen) {
        drawer.classList.add('open');
        if (btn) btn.classList.add('active');
        document.getElementById('chatInput').focus();
        if (!chatWs || chatWs.readyState !== WebSocket.OPEN) connectChat();
      } else {
        drawer.classList.remove('open');
        if (btn) btn.classList.remove('active');
      }
    }

    function connectChat() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      chatWs = new WebSocket(protocol + '//' + location.host + '/ws/chat');
      chatWs.onclose = () => { chatWs = null; };
      chatWs.onerror = () => { chatWs = null; };
    }

    function sendChat() {
      const input = document.getElementById('chatInput');
      const msg = input.value.trim();
      if (!msg) return;
      sendChatMessage(msg);
      input.value = '';
    }

    function sendChatMessage(msg) {
      if (!chatOpen) toggleChat();
      const container = document.getElementById('chatMessages');
      // Clear welcome if present
      const welcome = container.querySelector('.chat-welcome');
      if (welcome) welcome.remove();

      // Add user message
      container.innerHTML += '<div class="chat-msg user">' + esc(msg) + '</div>';

      // Add thinking indicator
      const thinkingId = 'thinking-' + Date.now();
      container.innerHTML += '<div class="chat-msg thinking" id="' + thinkingId + '">Morbius is thinking...</div>';
      container.scrollTop = container.scrollHeight;

      // Connect if needed
      if (!chatWs || chatWs.readyState !== WebSocket.OPEN) {
        connectChat();
        chatWs.onopen = () => { sendToWs(msg, thinkingId); };
      } else {
        sendToWs(msg, thinkingId);
      }
    }

    function sendToWs(msg, thinkingId) {
      let responseContent = '';
      const container = document.getElementById('chatMessages');

      chatWs.send(JSON.stringify({ message: msg }));

      const handler = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const thinking = document.getElementById(thinkingId);

          if (data.type === 'chunk') {
            responseContent += data.content;
            if (thinking) {
              thinking.className = 'chat-msg assistant';
              thinking.id = '';
              thinking.textContent = responseContent;
            }
            container.scrollTop = container.scrollHeight;
          } else if (data.type === 'done') {
            if (thinking && !responseContent) {
              thinking.className = 'chat-msg assistant';
              thinking.textContent = '(No output)';
            }
            chatWs.removeEventListener('message', handler);
            container.scrollTop = container.scrollHeight;
            document.getElementById('chatSend').disabled = false;
          } else if (data.type === 'error') {
            if (thinking) {
              thinking.className = 'chat-msg assistant';
              thinking.textContent = 'Error: ' + data.content;
            }
            chatWs.removeEventListener('message', handler);
            document.getElementById('chatSend').disabled = false;
          }
        } catch {}
      };

      chatWs.addEventListener('message', handler);
      document.getElementById('chatSend').disabled = true;
    }

    // ==========================================
    // Bug Board
    // ==========================================
    function renderBugBoard(container) {
      const statuses = ['open', 'investigating', 'fixed', 'closed'];
      const statusLabels = { open: 'Open', investigating: 'Investigating', fixed: 'Fixed', closed: 'Closed' };

      let columnsHtml = '';
      for (const status of statuses) {
        const bugs = allBugs.filter(b => b.status === status);
        let cardsHtml = '';
        for (const bug of bugs) {
          const thumbHtml = bug.thumbnail
            ? '<img class="card-thumbnail" src="/' + bug.thumbnail + '" alt="screenshot">'
            : '';
          const isJira = bug.source === 'jira';
          const jiraBadge = isJira ? '<span class="jira-badge" title="From Jira">J</span> ' : '';
          const bugDisplayId = isJira ? (bug.jiraKey || bug.id) : bug.id;
          cardsHtml += '<div class="card status-' + (status === 'open' ? 'fail' : status === 'fixed' ? 'pass' : 'flaky') + '" onclick="openBugDetail(\\'' + bug.id + '\\')">' +
            '<div class="card-id">' + jiraBadge + esc(bugDisplayId) + ' <span class="priority-dot priority-' + bug.priority + '"></span></div>' +
            '<div class="card-title">' + esc(bug.title) + '</div>' +
            thumbHtml +
            '<div class="card-meta">' +
              (bug.linkedTest ? '<span>' + esc(bug.linkedTest) + '</span>' : '') +
              (bug.device ? '<span>' + esc(bug.device) + '</span>' : '') +
              (bug.assignee ? '<span>' + esc(bug.assignee) + '</span>' : '') +
            '</div>' +
          '</div>';
        }

        columnsHtml += '<div class="kanban-column">' +
          '<div class="column-header">' +
            '<div class="column-title"><span>' + statusLabels[status] + '</span><span class="column-count">' + bugs.length + '</span></div>' +
          '</div>' +
          '<div class="column-cards">' + cardsHtml + '</div>' +
        '</div>';
      }

      container.innerHTML =
        '<div class="kanban-header"><h1 class="kanban-title">Bugs</h1><button class="btn-primary" style="font-size:12px;padding:6px 16px" onclick="openCreateBugModal()">+ Report Bug</button></div>' +
        '<div class="kanban-board">' + columnsHtml + '</div>';
    }

    // ==========================================
    // Device Matrix
    // ==========================================
    function setDeviceSort(field) {
      if (deviceSortField === field) {
        deviceSortDir = deviceSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        deviceSortField = field;
        deviceSortDir = 'asc';
      }
      localStorage.setItem('morbius-device-sort', deviceSortField);
      localStorage.setItem('morbius-device-sort-dir', deviceSortDir);
      renderDeviceMatrix(document.getElementById('view-container'));
    }

    async function renderDeviceMatrix(container) {
      try {
        const res = await fetch('/api/device-matrix');
        const data = await res.json();

        // Device matrix sort bar
        const deviceSortOptions = [
          { key: 'id', label: 'Test ID' },
          { key: 'name', label: 'Name' },
          { key: 'passRate', label: 'Pass Rate' },
        ];
        let deviceSortHtml = '<div class="kanban-filters sort-bar"><span class="sort-label">Sort:</span>';
        for (const s of deviceSortOptions) {
          const isActive = deviceSortField === s.key;
          const arrow = isActive ? (deviceSortDir === 'asc' ? ' \\u2191' : ' \\u2193') : '';
          deviceSortHtml += '<button class="filter-chip' + (isActive ? ' active' : '') + '" onclick="setDeviceSort(\\'' + s.key + '\\')">' +
            s.label + arrow + '</button>';
        }
        deviceSortHtml += '</div>';

        // Sort matrix rows
        const sortedMatrix = [...data.matrix];
        sortedMatrix.sort(function(a, b) {
          let cmp = 0;
          if (deviceSortField === 'id') {
            const numA = parseFloat(a.id.replace(/[^0-9.]/g, '')) || 0;
            const numB = parseFloat(b.id.replace(/[^0-9.]/g, '')) || 0;
            cmp = numA - numB;
          } else if (deviceSortField === 'name') {
            cmp = (a.title || '').localeCompare(b.title || '');
          } else if (deviceSortField === 'passRate') {
            const passA = a.devices.filter(function(d) { return d.status === 'pass'; }).length / (a.devices.length || 1);
            const passB = b.devices.filter(function(d) { return d.status === 'pass'; }).length / (b.devices.length || 1);
            cmp = passA - passB;
          }
          return deviceSortDir === 'desc' ? -cmp : cmp;
        });

        let headerHtml = '<tr><th style="min-width:200px">Test Case</th>';
        for (const d of data.devices) {
          headerHtml += '<th>' + esc(d.name) + '</th>';
        }
        headerHtml += '</tr>';

        let rowsHtml = '';
        for (const row of sortedMatrix) {
          rowsHtml += '<tr><td><span style="color:var(--text-tertiary);font-size:11px">' + esc(row.id) + '</span> ' + esc(row.title) + '</td>';
          for (const cell of row.devices) {
            rowsHtml += '<td><span class="matrix-dot ' + cell.status + '" title="' + cell.status + '"></span></td>';
          }
          rowsHtml += '</tr>';
        }

        container.innerHTML =
          '<div class="kanban-header"><h1 class="kanban-title">Device Matrix</h1></div>' +
          deviceSortHtml +
          '<table class="matrix-table">' + headerHtml + rowsHtml + '</table>';
      } catch (err) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Failed to load device matrix</p>';
      }
    }

    // ==========================================
    // Maestro Tests View (Live from local folder)
    // ==========================================
    let maestroPlatform = 'android'; // active platform filter
    let maestroCache = null;         // cache API response

    async function renderMaestroTests(container) {
      try {
        const res = await fetch('/api/maestro-tests');
        maestroCache = await res.json();
        const data = maestroCache;

        if (data.totalFlows === 0) {
          container.innerHTML =
            '<div class="kanban-header"><h1 class="kanban-title">Maestro Tests</h1></div>' +
            '<div class="dash-card" style="max-width:600px">' +
              '<div style="text-align:center;padding:40px">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' +
                '<p style="color:var(--text-secondary);margin-top:16px;font-size:14px">No Maestro flows found</p>' +
              '</div>' +
            '</div>';
          return;
        }

        renderMaestroContent(container, data);
      } catch (err) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Failed to load Maestro tests: ' + err + '</p>';
      }
    }

    function renderMaestroContent(container, data) {
      const totalAndroid = data.categories.reduce((s, c) => s + c.flows.filter(f => f.platform === 'android').length, 0);
      const totalIos = data.categories.reduce((s, c) => s + c.flows.filter(f => f.platform === 'ios').length, 0);
      const platformCount = maestroPlatform === 'android' ? totalAndroid : totalIos;
      const platformPath = maestroPlatform === 'android' ? data.androidPath : data.iosPath;

      // Platform toggle
      const toggleHtml = '<div class="kanban-filters" style="margin-left:auto">' +
        '<button class="filter-chip' + (maestroPlatform === 'android' ? ' active' : '') + '" onclick="setMaestroPlatform(\\'android\\')">' +
          '<span style="margin-right:4px">🤖</span> Android <span style="margin-left:4px;opacity:0.6">' + totalAndroid + '</span>' +
        '</button>' +
        '<button class="filter-chip' + (maestroPlatform === 'ios' ? ' active' : '') + '" onclick="setMaestroPlatform(\\'ios\\')">' +
          '<span style="margin-right:4px">🍎</span> iOS <span style="margin-left:4px;opacity:0.6">' + totalIos + '</span>' +
        '</button>' +
      '</div>';

      // Source path indicator
      const pathHtml = platformPath ?
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;padding:10px 14px;background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius)">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:var(--pass);flex-shrink:0"></span>' +
          '<span style="font-size:11px;color:var(--text-tertiary)">Reading from</span>' +
          '<span style="font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">' + esc(platformPath) + '</span>' +
          '<span style="font-size:11px;color:var(--text-tertiary);margin-left:auto">' + platformCount + ' flows</span>' +
        '</div>' : '';

      // Filter flows by platform and build categories
      let categoriesHtml = '';
      for (const cat of data.categories) {
        const platformFlows = cat.flows.filter(f => f.platform === maestroPlatform);
        if (platformFlows.length === 0) continue;

        let flowCardsHtml = '';
        for (const flow of platformFlows) {
          const warnings = flow.warnings || 0;
          const refs = flow.referencedFlows?.length || 0;

          flowCardsHtml += '<div class="maestro-flow-card" onclick="openMaestroFlowDetail(\\'' + esc(flow.qaPlanId || flow.name) + '\\', \\'' + esc(cat.slug) + '\\')">' +
            '<div class="mf-header">' +
              (flow.qaPlanId ? '<span class="mf-id">' + esc(flow.qaPlanId) + '</span>' : '') +
              '<span class="mf-filename">' + esc(flow.fileName || '') + '</span>' +
            '</div>' +
            '<div class="mf-name">' + esc(flow.name) + '</div>' +
            '<div class="mf-meta">' +
              '<span>' + flow.stepsCount + ' steps</span>' +
              (refs > 0 ? '<span>' + refs + ' sub-flows</span>' : '') +
              (Object.keys(flow.envVars || {}).length > 0 ? '<span>' + Object.keys(flow.envVars).length + ' env vars</span>' : '') +
              (warnings > 0 ? '<span style="color:var(--flaky)">⚠ ' + warnings + '</span>' : '') +
            '</div>' +
          '</div>';
        }

        categoriesHtml += '<div class="maestro-category">' +
          '<div class="maestro-cat-header">' +
            '<span class="maestro-cat-name">' + esc(cat.name) + '</span>' +
            '<span class="maestro-cat-count">' + platformFlows.length + ' flows</span>' +
          '</div>' +
          '<div class="maestro-cat-grid">' + flowCardsHtml + '</div>' +
        '</div>';
      }

      container.innerHTML =
        '<div class="kanban-header">' +
          '<h1 class="kanban-title">Maestro Tests</h1>' +
          toggleHtml +
        '</div>' +
        pathHtml +
        categoriesHtml;
    }

    function setMaestroPlatform(platform) {
      maestroPlatform = platform;
      if (maestroCache) {
        renderMaestroContent(document.getElementById('view-container'), maestroCache);
      }
    }

    async function openMaestroFlowDetail(key, catSlug) {
      try {
        if (!maestroCache) {
          const res = await fetch('/api/maestro-tests');
          maestroCache = await res.json();
        }
        const data = maestroCache;
        const cat = data.categories.find(c => c.slug === catSlug);
        if (!cat) return;

        const androidFlow = cat.flows.find(f => (f.qaPlanId || f.name) === key && f.platform === 'android');
        const iosFlow = cat.flows.find(f => (f.qaPlanId || f.name) === key && f.platform === 'ios');
        const flow = maestroPlatform === 'ios' ? (iosFlow || androidFlow) : (androidFlow || iosFlow);
        if (!flow) return;

        // Detail panel with platform tabs for code
        let html = '<div class="detail-header">' +
          '<button class="detail-close" onclick="closeDetail()">✕</button>' +
          (flow.qaPlanId ? '<div class="detail-id">' + esc(flow.qaPlanId) + ' · Maestro Flow</div>' : '<div class="detail-id">Maestro Flow</div>') +
          '<div class="detail-title">' + esc(flow.name) + '</div>' +
          '<div class="detail-tags">' +
            (androidFlow ? '<span class="detail-tag" style="border-color:var(--pass);color:var(--pass)">Android</span>' : '') +
            (iosFlow ? '<span class="detail-tag" style="border-color:var(--in-progress);color:var(--in-progress)">iOS</span>' : '') +
            flow.tags.map(t => '<span class="detail-tag">' + esc(t) + '</span>').join('') +
          '</div>' +
        '</div>';

        // Human-readable steps
        if (flow.steps && flow.steps.length > 0) {
          html += '<div class="detail-section">' +
            '<div class="detail-section-title">Steps (Human Readable)</div>' +
            '<ol class="maestro-steps-list">';
          for (const step of flow.steps) {
            const stepClass = step.action === 'assertVisible' || step.action === 'assertTrue' ? 'step-verify' :
                              step.action === 'runFlow' ? 'step-flow' : 'step-action';
            html += '<li class="' + stepClass + '">' + esc(step.humanReadable) + '</li>';
          }
          html += '</ol></div>';
        }

        // YAML Code — with platform tabs if both exist
        const hasBoth = androidFlow && iosFlow;
        html += '<div class="detail-section">';
        html += '<div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">' +
          '<span>YAML Code</span>';
        if (hasBoth) {
          html += '<div class="code-platform-tabs">' +
            '<button class="code-tab active" id="codeTabAndroid" onclick="switchCodeTab(\\'android\\')">Android</button>' +
            '<button class="code-tab" id="codeTabIos" onclick="switchCodeTab(\\'ios\\')">iOS</button>' +
          '</div>';
        }
        html += '</div>';

        if (androidFlow) {
          html += '<div class="yaml-block code-block-android" id="codeAndroid">' + esc(androidFlow.rawYaml || 'YAML not available') + '</div>';
        }
        if (iosFlow) {
          html += '<div class="yaml-block code-block-ios" id="codeIos" style="' + (hasBoth ? 'display:none' : '') + '">' + esc(iosFlow.rawYaml || 'YAML not available') + '</div>';
        }
        html += '</div>';

        // Selector warnings
        const warnings = flow.selectorWarnings || [];
        if (warnings.length > 0) {
          let warningsHtml = '';
          for (const w of warnings) {
            warningsHtml += '<div class="warning-box"><div class="warning-title">⚠ Line ' + w.line + '</div><div class="warning-text">' + esc(w.command) + '<br>' + esc(w.issue) + '</div></div>';
          }
          html += '<div class="detail-section"><div class="detail-section-title">Selector Warnings</div>' + warningsHtml + '</div>';
        }

        // Env vars
        if (flow.envVars && Object.keys(flow.envVars).length > 0) {
          let envHtml = '<div class="mf-env-grid">';
          for (const [k, v] of Object.entries(flow.envVars)) {
            envHtml += '<div class="mf-env-item"><span class="mf-env-key">' + esc(k) + '</span><span class="mf-env-val">' + esc(String(v) || '${' + k + '}') + '</span></div>';
          }
          envHtml += '</div>';
          html += '<div class="detail-section"><div class="detail-section-title">Environment Variables</div>' + envHtml + '</div>';
        }

        // Sub-flows
        if (flow.referencedFlows && flow.referencedFlows.length > 0) {
          let refsHtml = '';
          for (const ref of flow.referencedFlows) {
            const refName = ref.split('/').pop().replace('.yaml', '').replace(/_/g, ' ');
            refsHtml += '<div style="padding:4px 0;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:6px">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' +
              esc(refName) + '</div>';
          }
          html += '<div class="detail-section"><div class="detail-section-title">Sub-Flows</div>' + refsHtml + '</div>';
        }

        // File paths
        html += '<div class="detail-section"><div class="detail-section-title">File Paths</div>';
        if (androidFlow) html += '<div style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);padding:3px 0;word-break:break-all">Android: ' + esc(androidFlow.filePath) + '</div>';
        if (iosFlow) html += '<div style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);padding:3px 0;word-break:break-all">iOS: ' + esc(iosFlow.filePath) + '</div>';
        html += '</div>';

        showDetail(html);
      } catch (err) {
        console.error('Failed to load flow detail:', err);
      }
    }

    function switchCodeTab(platform) {
      const androidBlock = document.getElementById('codeAndroid');
      const iosBlock = document.getElementById('codeIos');
      const androidTab = document.getElementById('codeTabAndroid');
      const iosTab = document.getElementById('codeTabIos');
      if (platform === 'android') {
        if (androidBlock) androidBlock.style.display = 'block';
        if (iosBlock) iosBlock.style.display = 'none';
        if (androidTab) androidTab.classList.add('active');
        if (iosTab) iosTab.classList.remove('active');
      } else {
        if (androidBlock) androidBlock.style.display = 'none';
        if (iosBlock) iosBlock.style.display = 'block';
        if (androidTab) androidTab.classList.remove('active');
        if (iosTab) iosTab.classList.add('active');
      }
    }

    // ==========================================
    // Runs View
    // ==========================================
    async function renderRuns(container) {
      try {
        const res = await fetch('/api/runs');
        const runs = await res.json();

        if (runs.length === 0) {
          container.innerHTML =
            '<div class="kanban-header"><h1 class="kanban-title">Runs</h1></div>' +
            '<div class="dash-card" style="max-width:600px">' +
              '<div style="text-align:center;padding:40px">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                '<p style="color:var(--text-secondary);margin-top:16px;font-size:14px">No test runs yet</p>' +
                '<p style="color:var(--text-tertiary);font-size:12px;margin-top:4px">Run <code style="background:var(--elevated);padding:2px 6px;border-radius:3px">morbius ingest &lt;maestro-output-dir&gt;</code> to capture results</p>' +
              '</div>' +
            '</div>';
          return;
        }

        let rowsHtml = '';
        for (const run of runs) {
          const summary = run.summary || { total: 0, passed: 0, failed: 0 };
          const pct = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
          const devicesStr = (run.devices || []).join(', ');
          const ts = run.timestamp ? new Date(run.timestamp).toLocaleString() : '';

          rowsHtml += '<tr style="cursor:pointer" onclick="toggleRunDetail(this, \\'' + run.id + '\\')">' +
            '<td style="font-weight:500;color:var(--text)">' + esc(run.id) + '</td>' +
            '<td style="color:var(--text-tertiary)">' + esc(ts) + '</td>' +
            '<td>' +
              '<div style="display:flex;align-items:center;gap:8px">' +
                '<div class="dash-cat-bar" style="width:80px"><div class="dash-cat-fill" style="width:' + pct + '%;background:' + (pct >= 80 ? 'var(--pass)' : pct >= 50 ? 'var(--flaky)' : 'var(--fail)') + '"></div></div>' +
                '<span style="font-size:12px">' + summary.passed + '/' + summary.total + '</span>' +
              '</div>' +
            '</td>' +
            '<td><span style="color:var(--fail)">' + (summary.failed || 0) + ' failed</span></td>' +
            '<td style="color:var(--text-tertiary)">' + esc(devicesStr) + '</td>' +
          '</tr>';
        }

        container.innerHTML =
          '<div class="kanban-header"><h1 class="kanban-title">Runs</h1></div>' +
          '<table class="matrix-table">' +
            '<tr><th style="text-align:left">Run</th><th style="text-align:left">Timestamp</th><th style="text-align:left">Results</th><th style="text-align:left">Failures</th><th style="text-align:left">Devices</th></tr>' +
            rowsHtml +
          '</table>';
      } catch (err) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Failed to load runs</p>';
      }
    }

    function toggleRunDetail(rowEl, runId) {
      // Simple expand/collapse for run details (future: show per-test results)
      const existing = rowEl.nextElementSibling;
      if (existing && existing.classList.contains('run-detail-row')) {
        existing.remove();
        return;
      }
      // For now, just highlight
      rowEl.style.background = rowEl.style.background ? '' : 'var(--elevated)';
    }

    // ==========================================
    // Detail Panels
    // ==========================================
    async function openTestDetail(id) {
      try {
        const res = await fetch('/api/test/' + encodeURIComponent(id));
        const test = await res.json();

        let html = '<div class="detail-header">' +
          '<button class="detail-close" onclick="closeDetail()">✕</button>' +
          '<div class="detail-id">' + esc(test.id) + ' · ' + esc(test.scenario) + '</div>' +
          '<div class="detail-title">' + esc(test.title) + '</div>' +
          '<div class="detail-tags">' +
            '<span class="' + pillClass(test.status) + ' status-clickable" onclick="toggleStatusDropdown(this, \\'test\\', \\'' + test.id + '\\', \\'' + test.status + '\\')" title="Click to change status">' + statusLabel(test.status) + ' ▾</span>' +
            '<span class="detail-tag">' + esc(test.category) + '</span>' +
            (test.platforms || []).map(p => '<span class="detail-tag">' + esc(p) + '</span>').join('') +
          '</div>' +
        '</div>';

        // Run Test buttons
        const hasAndroid = !!test.maestroFlowAndroid;
        const hasIos = !!test.maestroFlowIos;
        const hasGeneric = !!test.maestroFlow;
        if (hasAndroid || hasIos || hasGeneric) {
          let runBtns = '';
          if (hasAndroid) runBtns += '<button class="btn-run" onclick="runTest(\\'' + test.id + '\\', \\'android\\')">▶ Run Android</button>';
          if (hasIos) runBtns += '<button class="btn-run" onclick="runTest(\\'' + test.id + '\\', \\'ios\\')">▶ Run iOS</button>';
          if (!hasAndroid && !hasIos && hasGeneric) runBtns += '<button class="btn-run" onclick="runTest(\\'' + test.id + '\\', \\'android\\')">▶ Run Test</button>';
          html += '<div class="detail-section"><div class="detail-section-title">Run Test</div>' +
            '<div style="display:flex;gap:8px">' + runBtns + '</div>' +
            '<div id="run-status-' + test.id.replace(/\\./g, '-') + '" class="run-status-box"></div>' +
          '</div>';
        }

        // Steps
        if (test.steps) {
          html += '<div class="detail-section">' +
            '<div class="detail-section-title">Steps</div>' +
            '<div class="detail-steps">' + formatStepsHtml(test.steps) + '</div>' +
          '</div>';
        }

        // Expected Result
        if (test.acceptanceCriteria) {
          html += '<div class="detail-section">' +
            '<div class="detail-section-title">Expected Result</div>' +
            '<div style="font-size:13px;color:var(--text-secondary);line-height:1.6">' + esc(test.acceptanceCriteria) + '</div>' +
          '</div>';
        }

        // Maestro YAML (collapsible)
        if (test.maestroYaml) {
          html += '<div class="detail-section">' +
            '<div class="detail-section-title yaml-toggle" onclick="toggleYaml(this)">Maestro YAML <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>' +
            '<div class="yaml-block" style="display:none">' + esc(test.maestroYaml) + '</div>' +
          '</div>';
        }

        // Device Results
        if (test.deviceResults && test.deviceResults.length > 0) {
          let tableHtml = '<table class="device-table"><tr><th>Device</th><th>Status</th><th>Run</th></tr>';
          for (const dr of test.deviceResults) {
            tableHtml += '<tr><td>' + esc(dr.device) + '</td><td><span class="' + pillClass(dr.status) + '">' + statusLabel(dr.status) + '</span></td><td style="color:var(--text-tertiary)">' + esc(dr.run || '') + '</td></tr>';
          }
          tableHtml += '</table>';
          html += '<div class="detail-section"><div class="detail-section-title">Device Results</div>' + tableHtml + '</div>';
        }

        // Selector Warnings
        if (test.selectorWarnings && test.selectorWarnings.length > 0) {
          let warningsHtml = '';
          for (const w of test.selectorWarnings) {
            warningsHtml += '<div class="warning-box"><div class="warning-title">⚠ Line ' + w.line + '</div><div class="warning-text">' + esc(w.command) + '<br>' + esc(w.issue) + '</div></div>';
          }
          html += '<div class="detail-section"><div class="detail-section-title">Selector Warnings</div>' + warningsHtml + '</div>';
        }

        // Linked Bugs
        const linkedBugs = allBugs.filter(b => b.linkedTest === test.id);
        if (linkedBugs.length > 0) {
          let bugsHtml = '';
          for (const bug of linkedBugs) {
            bugsHtml += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer" onclick="openBugDetail(\\'' + bug.id + '\\')">' +
              '<span class="' + pillClass(bug.status === 'open' ? 'fail' : 'pass') + '">' + bug.status + '</span>' +
              '<span style="font-size:13px;color:var(--text-secondary)">' + esc(bug.title) + '</span>' +
            '</div>';
          }
          html += '<div class="detail-section"><div class="detail-section-title">Linked Bugs (' + linkedBugs.length + ')</div>' + bugsHtml + '</div>';
        }

        // Notes
        // Editable notes + Report Bug button
        html += '<div class="detail-section"><div class="detail-section-title">Notes</div>' +
          '<textarea class="form-input" rows="3" placeholder="Add notes..." oninput="debounceSaveNotes(\\'test\\', \\'' + test.id + '\\', this.value)">' + esc(test.notes || '') + '</textarea></div>';
        // Changelog
        if (test.changelog && test.changelog.length > 0) {
          let changelogHtml = '<div class="changelog-list">';
          const recent = test.changelog.slice(-20).reverse();
          for (const entry of recent) {
            const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() + ' ' + new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            changelogHtml += '<div class="changelog-entry">' +
              '<span class="changelog-ts">' + esc(ts) + '</span>' +
              '<span class="changelog-field">' + esc(entry.field) + '</span>' +
              '<span class="changelog-change">' + esc(entry.oldValue) + ' → ' + esc(entry.newValue) + '</span>' +
              '<span class="changelog-actor">' + esc(entry.actor) + '</span>' +
            '</div>';
          }
          changelogHtml += '</div>';
          html += '<div class="detail-section"><div class="detail-section-title">Changelog</div>' + changelogHtml + '</div>';
        }

        html += '<div class="detail-section" style="border:none"><button class="btn-secondary" style="width:100%" onclick="closeDetail();openCreateBugModal(\\'' + test.id + '\\')">Report Bug for This Test</button></div>';
        showDetail(html);
      } catch (err) {
        console.error('Failed to load test detail:', err);
      }
    }

    async function openBugDetail(id) {
      try {
        const res = await fetch('/api/bug/' + encodeURIComponent(id));
        const bug = await res.json();

        const isJira = bug.source === 'jira';
        const bugDisplayId = isJira ? (bug.jiraKey || bug.id) : bug.id;

        let html = '<div class="detail-header">' +
          '<button class="detail-close" onclick="closeDetail()">✕</button>' +
          '<div class="detail-id">' + (isJira ? '<span class="jira-badge">J</span> ' : '') + esc(bugDisplayId) + ' <span class="priority-dot priority-' + bug.priority + '"></span></div>' +
          '<div class="detail-title">' + esc(bug.title) + '</div>' +
          '<div class="detail-tags">' +
            '<span class="' + pillClass(bug.status === 'open' ? 'fail' : bug.status === 'fixed' ? 'pass' : 'flaky') + ' status-clickable" onclick="toggleStatusDropdown(this, \\'bug\\', \\'' + bug.id + '\\', \\'' + bug.status + '\\')" title="Click to change status">' + bug.status.toUpperCase() + ' ▾</span>' +
            (bug.category ? '<span class="detail-tag">' + esc(bug.category) + '</span>' : '') +
            (bug.device ? '<span class="detail-tag">' + esc(bug.device) + '</span>' : '') +
            (bug.linkedTest ? '<span class="detail-tag" style="cursor:pointer" onclick="openTestDetail(\\'' + bug.linkedTest + '\\')">' + esc(bug.linkedTest) + '</span>' : '') +
            (bug.assignee ? '<span class="detail-tag" style="border-color:var(--in-progress);color:var(--in-progress)">' + esc(bug.assignee) + '</span>' : '') +
          '</div>' +
        '</div>';

        // Jira link
        if (isJira && bug.jiraUrl) {
          html += '<div class="detail-section" style="padding:10px 28px;border-bottom:1px solid var(--border-subtle)">' +
            '<a href="' + esc(bug.jiraUrl) + '" target="_blank" style="font-size:12px;color:var(--in-progress);text-decoration:none;display:flex;align-items:center;gap:6px">' +
              '<span class="jira-badge">J</span> Open in Jira →' +
            '</a>' +
          '</div>';
        }

        // Screenshot
        if (bug.screenshot) {
          html += '<div class="detail-section">' +
            '<div class="detail-section-title">Screenshot</div>' +
            '<img src="/' + bug.screenshot + '" style="width:100%;border-radius:6px;border:1px solid var(--border)" alt="failure screenshot">' +
          '</div>';
        }

        // Failure Reason
        if (bug.failureReason) {
          html += '<div class="detail-section"><div class="detail-section-title">Failure Reason</div><div class="yaml-block">' + esc(bug.failureReason) + '</div></div>';
        }

        // Steps to Reproduce
        if (bug.stepsToReproduce) {
          html += '<div class="detail-section"><div class="detail-section-title">Steps to Reproduce</div><div class="detail-steps">' + formatStepsHtml(bug.stepsToReproduce) + '</div></div>';
        }

        // Selector Analysis
        if (bug.selectorAnalysis && bug.selectorAnalysis.length > 0) {
          let warningsHtml = '';
          for (const w of bug.selectorAnalysis) {
            warningsHtml += '<div class="warning-box"><div class="warning-title">⚠ Line ' + w.line + '</div><div class="warning-text">' + esc(w.command) + '<br>' + esc(w.issue) + '</div></div>';
          }
          html += '<div class="detail-section"><div class="detail-section-title">Selector Analysis</div>' + warningsHtml + '</div>';
        }

        // Notes
        html += '<div class="detail-section"><div class="detail-section-title">Notes</div>' +
          '<textarea class="form-input" rows="3" placeholder="Add investigation notes..." oninput="debounceSaveNotes(\\'bug\\', \\'' + bug.id + '\\', this.value)">' + esc(bug.notes || '') + '</textarea></div>';

        showDetail(html);
      } catch (err) {
        console.error('Failed to load bug detail:', err);
      }
    }

    function showDetail(html) {
      document.getElementById('detail-content').innerHTML = html;
      document.getElementById('detail-overlay').classList.remove('hidden');
      document.getElementById('detail-panel').classList.remove('hidden');
      requestAnimationFrame(() => {
        document.getElementById('detail-overlay').classList.add('open');
        document.getElementById('detail-panel').classList.add('open');
      });
    }

    function closeDetail() {
      document.getElementById('detail-panel').classList.remove('open');
      document.getElementById('detail-overlay').classList.remove('open');
      setTimeout(() => {
        document.getElementById('detail-overlay').classList.add('hidden');
        document.getElementById('detail-panel').classList.add('hidden');
      }, 200);
    }

    function toggleYaml(el) {
      el.classList.toggle('open');
      const block = el.nextElementSibling;
      block.style.display = block.style.display === 'none' ? 'block' : 'none';
    }

    // ==========================================
    // App Map (Mermaid)
    // ==========================================
    async function renderAppMap(container) {
      try {
        const res = await fetch('/api/appmap');
        const data = await res.json();

        if (!data.appMap) {
          container.innerHTML =
            '<div style="padding:40px;text-align:center">' +
              '<h1 style="font-size:22px;font-weight:600;letter-spacing:-0.5px;margin-bottom:12px">App Map</h1>' +
              '<div style="color:var(--text-tertiary);font-size:14px;margin-bottom:24px">' +
                'No app map generated yet for <strong>' + esc(data.projectDisplayName || 'this project') + '</strong>.' +
              '</div>' +
              '<div style="color:var(--text-tertiary);font-size:13px;padding:20px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--border-subtle);display:inline-block;text-align:left">' +
                'Run the <code style="color:var(--pass);font-family:var(--font-mono)">morbius-app-map</code> skill in Claude Code to explore the app and generate a navigation chart.' +
              '</div>' +
            '</div>';
          return;
        }

        const mapId = 'mermaid-' + Date.now();
        container.innerHTML =
          '<div style="padding:24px 32px">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">' +
              '<h1 style="font-size:22px;font-weight:600;letter-spacing:-0.5px">App Map</h1>' +
              '<span style="font-size:12px;color:var(--text-tertiary);background:var(--surface);padding:4px 12px;border-radius:20px;border:1px solid var(--border-subtle)">' + esc(data.projectDisplayName || data.projectName) + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-tertiary);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">' +
              '<div style="display:flex;gap:16px">' +
                '<span><span style="display:inline-block;width:10px;height:10px;background:#34D399;border-radius:2px;margin-right:4px"></span> Automated (has Maestro flow)</span>' +
                '<span><span style="display:inline-block;width:10px;height:10px;background:var(--border);border-radius:2px;margin-right:4px"></span> Not automated yet</span>' +
              '</div>' +
              '<div class="appmap-zoom-controls">' +
                '<button class="appmap-zoom-btn" onclick="appmapZoom(-0.2)" title="Zoom Out (-)">−</button>' +
                '<span id="appmapZoomLevel" style="font-size:11px;color:var(--text-tertiary);min-width:40px;text-align:center">100%</span>' +
                '<button class="appmap-zoom-btn" onclick="appmapZoom(0.2)" title="Zoom In (+)">+</button>' +
                '<button class="appmap-zoom-btn" onclick="appmapZoom(0, true)" title="Reset Zoom" style="font-size:10px;padding:4px 8px">Fit</button>' +
              '</div>' +
            '</div>' +
            '<div class="appmap-container" id="appmapContainer"><pre class="mermaid" id="' + mapId + '">' + data.appMap + '</pre></div>' +
          '</div>';

        // Re-run Mermaid on the new element
        if (typeof mermaid !== 'undefined') {
          mermaid.initialize({
            theme: 'dark',
            securityLevel: 'loose',
            themeVariables: {
              darkMode: true,
              background: '#09090B',
              primaryColor: '#27272A',
              primaryTextColor: '#FAFAFA',
              primaryBorderColor: '#3F3F46',
              lineColor: '#52525B',
              secondaryColor: '#1C1C20',
              tertiaryColor: '#0F0F12',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
            }
          });
          mermaid.run({ nodes: [document.getElementById(mapId)] });
        }
      } catch (err) {
        container.innerHTML = '<div style="padding:40px;color:var(--fail)">Failed to load app map: ' + err + '</div>';
      }
    }

    let appmapScale = 1;
    function appmapZoom(delta, reset) {
      if (reset) {
        appmapScale = 1;
      } else {
        appmapScale = Math.max(0.3, Math.min(3, appmapScale + delta));
      }
      const container = document.getElementById('appmapContainer');
      if (container) {
        const svg = container.querySelector('svg');
        if (svg) {
          svg.style.transform = 'scale(' + appmapScale + ')';
          svg.style.transformOrigin = 'top center';
          svg.style.transition = 'transform 200ms ease';
        }
      }
      const label = document.getElementById('appmapZoomLevel');
      if (label) label.textContent = Math.round(appmapScale * 100) + '%';
    }

    // Keyboard zoom for app map
    document.addEventListener('keydown', function(e) {
      if (currentView !== 'appmap') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); appmapZoom(0.2); }
      if (e.key === '-') { e.preventDefault(); appmapZoom(-0.2); }
      if (e.key === '0') { e.preventDefault(); appmapZoom(0, true); }
    });

    // ==========================================
    // Search / Command Palette
    // ==========================================
    function openSearch() {
      document.getElementById('cmd-palette').classList.remove('hidden');
      document.getElementById('cmd-input').value = '';
      document.getElementById('cmd-input').focus();
      handleSearch('');
    }

    function closeSearch() {
      document.getElementById('cmd-palette').classList.add('hidden');
    }

    function handleSearch(query) {
      const results = document.getElementById('cmd-results');
      if (!query) {
        // Show recent / all tests
        let html = '';
        for (const test of allTests.slice(0, 10)) {
          html += '<div class="cmd-result" onclick="closeSearch();openTestDetail(\\'' + test.id + '\\')">' +
            '<span class="cmd-result-type">TEST</span>' +
            '<span>' + esc(test.id) + ' — ' + esc(test.title) + '</span>' +
          '</div>';
        }
        results.innerHTML = html;
        return;
      }

      const q = query.toLowerCase();
      let html = '';

      // Search tests
      const matchedTests = allTests.filter(t =>
        t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      ).slice(0, 8);
      for (const test of matchedTests) {
        html += '<div class="cmd-result" onclick="closeSearch();openTestDetail(\\'' + test.id + '\\')">' +
          '<span class="cmd-result-type">TEST</span>' +
          '<span>' + esc(test.id) + ' — ' + esc(test.title) + '</span>' +
        '</div>';
      }

      // Search bugs
      const matchedBugs = allBugs.filter(b =>
        b.id.toLowerCase().includes(q) || b.title.toLowerCase().includes(q) || b.device.toLowerCase().includes(q)
      ).slice(0, 5);
      for (const bug of matchedBugs) {
        html += '<div class="cmd-result" onclick="closeSearch();openBugDetail(\\'' + bug.id + '\\')">' +
          '<span class="cmd-result-type">BUG</span>' +
          '<span>' + esc(bug.id) + ' — ' + esc(bug.title) + '</span>' +
        '</div>';
      }

      results.innerHTML = html || '<div style="padding:16px;color:var(--text-tertiary);font-size:13px">No results found</div>';
    }

    // ==========================================
    // Keyboard Shortcuts
    // ==========================================
    function setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Cmd+K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          const palette = document.getElementById('cmd-palette');
          if (palette.classList.contains('hidden')) openSearch();
          else closeSearch();
          return;
        }

        // Escape
        if (e.key === 'Escape') {
          const palette = document.getElementById('cmd-palette');
          if (!palette.classList.contains('hidden')) { closeSearch(); return; }
          const panel = document.getElementById('detail-panel');
          if (!panel.classList.contains('hidden')) { closeDetail(); return; }
        }

        // Don't trigger shortcuts when typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Number keys for navigation
        if (e.key === '1') navigate('dashboard');
        if (e.key === '2') navigate('tests');
        if (e.key === '3') navigate('bugs');
        if (e.key === '4') navigate('devices');
        if (e.key === '5') navigate('runs');
        if (e.key === '6') navigate('maestro');
        if (e.key === '7') navigate('appmap');
        if (e.key === '?' || (e.shiftKey && e.key === '/')) { showShortcutHelp(); return; }
        if (e.key === '/') { e.preventDefault(); openSearch(); }
      });
    }

    // ==========================================
    // ==========================================
    // Shortcut Help
    // ==========================================
    function openPrerequisites() {
      const activeProject = projectRegistry.projects.find(p => p.id === projectRegistry.activeProject);
      const projectName = activeProject?.name || 'Morbius';
      const prereqs = activeProject?.prerequisites || [];
      const envVars = activeProject?.env ? Object.keys(activeProject.env) : [];
      const appId = activeProject?.appId || '';

      let html = '<div class="detail-header">' +
        '<button class="detail-close" onclick="closeDetail()">✕</button>' +
        '<div class="detail-id">Setup Guide</div>' +
        '<div class="detail-title">Prerequisites for ' + esc(projectName) + '</div>' +
      '</div>';

      // System requirements
      html += '<div class="detail-section">' +
        '<div class="detail-section-title">System Requirements</div>' +
        '<div class="prereq-detail-list">' +
          '<div class="prereq-detail-item">' +
            '<div class="prereq-detail-name"><span class="prereq-dot prereq-ok"></span>Node.js 18+</div>' +
            '<div class="prereq-detail-desc">Required to run Morbius. <a href="https://nodejs.org" style="color:var(--text-secondary)" target="_blank">Download →</a></div>' +
            '<div class="prereq-detail-check"><code>node --version</code></div>' +
          '</div>' +
          '<div class="prereq-detail-item">' +
            '<div class="prereq-detail-name"><span class="prereq-dot" style="background:var(--pass)"></span>Maestro CLI</div>' +
            '<div class="prereq-detail-desc">Mobile UI testing framework. Required for running test flows.</div>' +
            '<div class="prereq-detail-check"><code>curl -Ls "https://get.maestro.mobile.dev" | bash</code></div>' +
          '</div>' +
          '<div class="prereq-detail-item">' +
            '<div class="prereq-detail-name"><span class="prereq-dot" style="background:var(--pass)"></span>Android Emulator or iOS Simulator</div>' +
            '<div class="prereq-detail-desc">At least one device must be running to execute Maestro tests.</div>' +
            '<div class="prereq-detail-check"><code>maestro list-devices</code> or use Maestro MCP</div>' +
          '</div>' +
          '<div class="prereq-detail-item">' +
            '<div class="prereq-detail-name"><span class="prereq-dot" style="background:var(--pass)"></span>Excel Test Plan (.xlsx)</div>' +
            '<div class="prereq-detail-desc">Your QA test cases in Excel format. Each sheet = one category, each row = one test case.</div>' +
            '<div class="prereq-detail-check"><code>morbius import "path/to/plan.xlsx"</code></div>' +
          '</div>' +
        '</div>' +
      '</div>';

      // App-specific
      if (appId || prereqs.length > 0) {
        html += '<div class="detail-section">' +
          '<div class="detail-section-title">Project-Specific (' + esc(projectName) + ')</div>';
        if (appId) {
          html += '<div class="prereq-detail-item">' +
            '<div class="prereq-detail-name"><span class="prereq-dot" style="background:var(--pass)"></span>App Installed on Device</div>' +
            '<div class="prereq-detail-desc">Bundle ID: <code>' + esc(appId) + '</code></div>' +
            '<div class="prereq-detail-check">Verify: <code>adb shell pm list packages | grep ' + esc(appId.split('.').pop() || '') + '</code></div>' +
          '</div>';
        }
        for (const p of prereqs) {
          html += '<div class="prereq-detail-item">' +
            '<div class="prereq-detail-name"><span class="prereq-dot" style="background:var(--flaky)"></span>' + esc(p) + '</div>' +
          '</div>';
        }
        html += '</div>';
      }

      // Env vars
      if (envVars.length > 0) {
        html += '<div class="detail-section">' +
          '<div class="detail-section-title">Environment Variables</div>' +
          '<div class="prereq-detail-desc" style="margin-bottom:12px">Set these before running Maestro tests:</div>';
        let envBlock = '';
        for (const v of envVars) {
          envBlock += 'export ' + v + '="your_value_here"\\n';
        }
        html += '<div class="yaml-block">' + esc(envBlock.replace(/\\n/g, '\\n')) + '</div>';
        html += '</div>';
      }

      // Quick start
      html += '<div class="detail-section">' +
        '<div class="detail-section-title">Quick Start Commands</div>' +
        '<div class="yaml-block">' +
          '# 1. Install dependencies\\n' +
          'npm install && npm run build\\n\\n' +
          '# 2. Import Excel test plan\\n' +
          'morbius import "path/to/QA Plan.xlsx"\\n\\n' +
          '# 3. Link Maestro YAML flows\\n' +
          'morbius sync\\n\\n' +
          '# 4. Validate everything\\n' +
          'morbius validate\\n\\n' +
          '# 5. Start dashboard\\n' +
          'morbius serve' +
        '</div>' +
      '</div>';

      showDetail(html);
    }

    function showShortcutHelp() {
      const shortcuts = [
        ['1', 'Dashboard'],
        ['2', 'Test Cases'],
        ['3', 'Bugs'],
        ['4', 'Device Matrix'],
        ['5', 'Runs'],
        ['/', 'Search'],
        ['⌘K', 'Command Palette'],
        ['Esc', 'Close panel'],
        ['?', 'This help'],
      ];
      let rows = '';
      for (const [key, desc] of shortcuts) {
        rows += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle)">' +
          '<span style="color:var(--text-secondary);font-size:13px">' + desc + '</span>' +
          '<kbd style="font-family:inherit;font-size:12px;color:var(--text-tertiary);background:var(--bg);padding:2px 8px;border-radius:4px;border:1px solid var(--border)">' + key + '</kbd>' +
          '</div>';
      }
      const html = '<div class="detail-header">' +
        '<button class="detail-close" onclick="closeDetail()">✕</button>' +
        '<div class="detail-title">Keyboard Shortcuts</div>' +
        '</div>' +
        '<div class="detail-section">' + rows + '</div>';
      showDetail(html);
    }

    // ==========================================
    // Interactive: Status Editing, Notes, Bug Creation
    // ==========================================
    async function updateTestStatus(testId, newStatus) {
      try {
        const res = await fetch('/api/test/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: testId, status: newStatus }),
        });
        if (res.ok) {
          showToast('Status updated to ' + newStatus.toUpperCase());
          await loadData();
          // Re-render current view
          if (currentView === 'tests') renderTestBoard(document.getElementById('view-container'));
        }
      } catch (err) { console.error(err); }
    }

    async function updateBugStatus(bugId, newStatus) {
      try {
        const res = await fetch('/api/bug/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bugId, status: newStatus }),
        });
        if (res.ok) {
          showToast('Bug status updated to ' + newStatus.toUpperCase());
          await loadData();
          if (currentView === 'bugs') renderBugBoard(document.getElementById('view-container'));
        }
      } catch (err) { console.error(err); }
    }

    async function saveNotes(type, id, notes) {
      const endpoint = type === 'test' ? '/api/test/update' : '/api/bug/update';
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, notes }),
        });
        showToast('Notes saved');
      } catch (err) { console.error(err); }
    }

    let notesDebounce = null;
    function debounceSaveNotes(type, id, notes) {
      if (notesDebounce) clearTimeout(notesDebounce);
      notesDebounce = setTimeout(() => saveNotes(type, id, notes), 800);
    }

    function renderStatusDropdown(currentStatus, entityType, entityId) {
      const statuses = entityType === 'bug'
        ? ['open', 'investigating', 'fixed', 'closed']
        : ['pass', 'fail', 'flaky', 'in-progress', 'not-run'];
      const handler = entityType === 'bug' ? 'updateBugStatus' : 'updateTestStatus';

      let html = '<div class="status-dropdown">';
      for (const s of statuses) {
        const isActive = s === currentStatus;
        html += '<div class="status-option' + (isActive ? ' active' : '') + '" onclick="event.stopPropagation();' + handler + '(\\'' + entityId + '\\', \\'' + s + '\\')">' +
          '<span class="' + pillClass(s === 'open' ? 'fail' : s === 'investigating' ? 'flaky' : s === 'fixed' ? 'pass' : s === 'closed' ? 'not-run' : s) + '">' + statusLabel(s === 'open' ? 'fail' : s) + '</span>' +
          '<span style="font-size:12px;color:var(--text-secondary)">' + s.replace('-', ' ') + '</span>' +
          (isActive ? '<span style="color:var(--pass);font-size:12px">✓</span>' : '') +
        '</div>';
      }
      html += '</div>';
      return html;
    }

    function toggleStatusDropdown(el, entityType, entityId, currentStatus) {
      event.stopPropagation();
      const existing = document.querySelector('.status-dropdown');
      if (existing) { existing.remove(); return; }

      const dropdown = document.createElement('div');
      dropdown.innerHTML = renderStatusDropdown(currentStatus, entityType, entityId);
      el.style.position = 'relative';
      el.appendChild(dropdown.firstChild);

      // Close on click outside
      setTimeout(() => {
        document.addEventListener('click', function closer() {
          document.querySelector('.status-dropdown')?.remove();
          document.removeEventListener('click', closer);
        }, { once: true });
      }, 10);
    }

    // Create Bug Modal
    function openCreateBugModal(linkedTest) {
      const tests = allTests;
      const test = linkedTest ? tests.find(t => t.id === linkedTest) : null;

      let html = '<div style="padding:24px 24px 0">' +
        '<div style="font-size:17px;font-weight:600;margin-bottom:4px">Report Bug</div>' +
        '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:20px">Create a bug ticket for a failed test</div>' +
      '</div><div style="padding:0 24px 24px">' +
        '<div class="form-group"><label class="form-label">Title *</label>' +
          '<input type="text" id="cb-title" class="form-input" placeholder="e.g., Login fails on Pixel 7" value="' + (test ? esc(test.title) + ' - failure' : '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Linked Test Case</label>' +
          '<input type="text" id="cb-test" class="form-input" value="' + esc(linkedTest || '') + '" placeholder="e.g., TC-2.01"></div>' +
        '<div class="form-group"><label class="form-label">Device</label>' +
          '<select id="cb-device" class="form-input"><option value="iphone">iPhone</option><option value="android-phone">Android Phone</option><option value="ipad">iPad</option><option value="android-tab">Android Tablet</option></select></div>' +
        '<div class="form-group"><label class="form-label">Priority</label>' +
          '<select id="cb-priority" class="form-input"><option value="P1">P1 — Critical</option><option value="P2" selected>P2 — High</option><option value="P3">P3 — Medium</option></select></div>' +
        '<div class="form-group"><label class="form-label">Failure Reason</label>' +
          '<textarea id="cb-reason" class="form-input" rows="3" placeholder="What happened?"></textarea></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn-secondary" onclick="closeDetail()">Cancel</button>' +
          '<button class="btn-primary" onclick="submitCreateBug()">Create Bug</button>' +
        '</div></div>';

      showDetail('<div class="detail-header"><button class="detail-close" onclick="closeDetail()">✕</button><div class="detail-title">Report Bug</div></div>' + html);
    }

    async function submitCreateBug() {
      const title = document.getElementById('cb-title')?.value?.trim();
      if (!title) { document.getElementById('cb-title').style.borderColor = 'var(--fail)'; return; }

      const data = {
        title,
        linkedTest: document.getElementById('cb-test')?.value?.trim() || '',
        device: document.getElementById('cb-device')?.value || 'unknown',
        priority: document.getElementById('cb-priority')?.value || 'P2',
        failureReason: document.getElementById('cb-reason')?.value?.trim() || '',
        category: allTests.find(t => t.id === document.getElementById('cb-test')?.value?.trim())?.category || 'unknown',
      };

      try {
        const res = await fetch('/api/bugs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.ok) {
          closeDetail();
          showToast('Bug ' + result.bug.id + ' created');
          await loadData();
          if (currentView === 'bugs') renderBugBoard(document.getElementById('view-container'));
        }
      } catch (err) { console.error(err); }
    }

    // Toast notifications
    function showToast(message) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
      }, 2500);
    }

    // Utilities
    // ==========================================
    function esc(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function pillClass(status) {
      return 'pill pill-' + (status || 'not-run');
    }

    function statusLabel(status) {
      const labels = { pass: 'PASS', fail: 'FAIL', flaky: 'FLAKY', 'not-run': 'NOT RUN', 'in-progress': 'IN PROGRESS' };
      return labels[status] || status.toUpperCase();
    }

    function formatStepsHtml(text) {
      if (!text) return '';
      const lines = text.split('\\n').filter(l => l.trim());
      const isNumbered = lines.some(l => /^\\d+[.)\\s]/.test(l.trim()));
      if (isNumbered) {
        return '<ol>' + lines.map(l => '<li>' + esc(l.replace(/^\\d+[.)\\s]+/, '').trim()) + '</li>').join('') + '</ol>';
      }
      return '<p>' + esc(text) + '</p>';
    }

    // Start
    init();
  `;
}
