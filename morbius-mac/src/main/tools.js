// E-010 Tool Surface — every host-touching agent capability lives here.
// E-011 Permission Chokepoint — checkPermission() gates every call.
// E-003 Local devices, E-004 Doctor probes, E-005 PMAgent, E-002 Sync, E-012 Activity log.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
const { paths } = require('./paths');

function expandTilde(p) {
  if (!p) return p;
  if (p === '~' || p.startsWith('~/')) return path.join(os.homedir(), p.slice(p === '~' ? 1 : 2));
  return p;
}

// E-005: PMAgent repo discovery — try common locations
function findPMAgentRoot() {
  const candidates = [
    process.env.PMAGENT_ROOT,
    path.join(os.homedir(), 'PMAgent'),
    path.join(os.homedir(), 'pmagent'),
    path.join(os.homedir(), 'Morbius', 'PMAgent'),
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

// ---------- Permission policy ----------
const PERMISSION_CATEGORIES = {
  // Auto-approved under "default" mode
  read: ['readFile', 'readTestCase', 'listDevices', 'captureScreenshot', 'tailLog',
         'runMaestroFlow', 'classify', 'runProbe', 'checkEnvironment',
         'pullFromGithub', 'readPMAgentSpec', 'pullFromPMAgent'],
  // Prompt under "default" mode
  shell:       ['runShellCommand'],
  destructive: ['writeFile', 'editFile', 'writeTestCase', 'commitToGithub',
                'publishToPMAgent', 'uploadScreenshot', 'fileBug'],
};

function toolCategory(name) {
  for (const [k, v] of Object.entries(PERMISSION_CATEGORIES)) if (v.includes(name)) return k;
  return 'unknown';
}

function loadPermissionRules() {
  try { return JSON.parse(fs.readFileSync(paths.permissions, 'utf8')).rules || []; }
  catch { return []; }
}
function savePermissionRules(rules) {
  fs.writeFileSync(paths.permissions, JSON.stringify({ rules }, null, 2));
}

let permissionMode = 'default'; // default | acceptEdits | plan | bypassPermissions | dryRun | batch

function ruleMatches(rule, tool, args) {
  if (rule.tool !== tool) return false;
  // No matchArg → rule applies tool-wide.
  // matchArg is a non-empty substring that must appear in JSON-serialized args.
  if (rule.matchArg == null || rule.matchArg === '') return true;
  return JSON.stringify(args || {}).includes(rule.matchArg);
}

function appendAudit(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  fs.appendFile(paths.audit, line, () => {});
}

// pending prompts keyed by id; resolved by renderer
const pendingPrompts = new Map();

function checkPermission(win, tool, args, reasoning) {
  if (permissionMode === 'bypassPermissions') return Promise.resolve({ decision: 'allow' });
  // dryRun: read-only tools allowed; everything else returns a simulated allow that the impl interprets
  if (permissionMode === 'dryRun' && toolCategory(tool) !== 'read') {
    return Promise.resolve({ decision: 'dryRun' });
  }
  if (permissionMode === 'plan' && toolCategory(tool) !== 'read') {
    return Promise.resolve({ decision: 'deny', reason: 'plan-mode' });
  }

  const cat = toolCategory(tool);
  if (permissionMode === 'default' && cat === 'read') {
    return Promise.resolve({ decision: 'allow' });
  }

  const rules = loadPermissionRules();
  const match = rules.find(r => ruleMatches(r, tool, args));
  if (match) return Promise.resolve({ decision: match.allow ? 'allow' : 'deny', reason: 'rule' });

  // batch mode: queue the call for offline review instead of prompting inline.
  // The caller is auto-denied for now; user later reviews and re-runs from the queue.
  if (permissionMode === 'batch' && cat !== 'read') {
    try {
      const approvals = require('./approvals');
      approvals.enqueue({ tool, args, projectId: null, conversationId: null, reasoning });
    } catch {}
    return Promise.resolve({ decision: 'deny', reason: 'queued-for-review' });
  }

  return new Promise(resolve => {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pendingPrompts.set(id, resolve);
    if (win && !win.isDestroyed()) {
      win.webContents.send('permission:prompt', {
        promptId: id, tool, args, category: cat, reasoning: reasoning || ''
      });
    }
  });
}

function getPermissionMode() { return permissionMode; }

function resolvePrompt(promptId, choice) {
  const r = pendingPrompts.get(promptId);
  if (!r) return { ok: false };
  pendingPrompts.delete(promptId);
  if (choice === 'always-allow' || choice === 'always-deny') {
    const rules = loadPermissionRules();
    // payload stashed elsewhere — for simplicity, we store the rule on accept
    // (caller passes tool/args via the resolveWithRule helper)
  }
  r({ decision: (choice === 'allow' || choice === 'always-allow') ? 'allow' : 'deny',
      persisted: choice.startsWith('always-') });
  return { ok: true };
}

// ---------- Activity stream ----------
function logActivity(win, projectId, entry) {
  const out = { ts: new Date().toISOString(), ...entry };
  const file = path.join(paths.projectsDir, projectId, 'agent-activity.jsonl');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(out) + '\n');
  } catch {}
  if (win && !win.isDestroyed()) win.webContents.send('activity:append', out);
}

// ---------- Helpers ----------
function run(cmd, args, timeoutMs = 12000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, stdout: stdout?.toString() || '', stderr: stderr?.toString() || '' });
    });
  });
}

// ---------- Tool implementations ----------
const tools = {
  // E-003
  async listDevices() {
    const devices = [];
    // iOS via xcrun
    const ios = await run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
    if (ios.ok && ios.stdout) {
      try {
        const j = JSON.parse(ios.stdout);
        for (const runtime of Object.keys(j.devices || {})) {
          for (const d of j.devices[runtime]) {
            if (d.state === 'Booted') devices.push({
              platform: 'ios', name: d.name, udid: d.udid,
              os: runtime.split('.').pop(), state: 'booted',
            });
          }
        }
      } catch {}
    }
    // Android via adb
    const adb = await run('adb', ['devices']);
    if (adb.ok) {
      for (const line of adb.stdout.split('\n').slice(1)) {
        const m = line.match(/^(\S+)\s+(device|offline)/);
        if (m) devices.push({
          platform: 'android', name: m[1], udid: m[1], os: '', state: m[2] === 'device' ? 'booted' : 'cold'
        });
      }
    }
    // Fallback so the UI always has content during demo
    if (devices.length === 0) {
      devices.push({ platform: 'ios', name: 'iPhone 15 Pro (mock)', udid: 'MOCK-IOS-1', os: 'iOS 17.4', state: 'booted' });
      devices.push({ platform: 'android', name: 'Pixel 7 (mock)', udid: 'MOCK-AND-1', os: 'Android 14', state: 'cold' });
    }
    return { devices };
  },

  // E-003
  async runMaestroFlow({ flowPath, deviceId }) {
    // Just spawn maestro if present; otherwise return mock result
    const which = await run('which', ['maestro']);
    if (!which.ok || !which.stdout.trim()) {
      // Mocked run to keep the UI useful without the binary installed
      await new Promise(r => setTimeout(r, 600));
      return { ok: true, mocked: true, duration: 1.2, output: '[mocked] Maestro not installed — synthetic pass' };
    }
    const args = ['test', flowPath || ''];
    if (deviceId) args.push('--device', deviceId);
    const res = await run('maestro', args, 60000);
    return { ok: res.ok, output: (res.stdout + res.stderr).slice(0, 4000) };
  },

  // E-003
  async captureScreenshot({ deviceId, outPath }) {
    const screenshotsDir = path.join(paths.dataDir, 'screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });
    const out = outPath || path.join(screenshotsDir, `shot-${Date.now()}.png`);
    if (deviceId && deviceId.startsWith('MOCK')) return { ok: true, path: out, mocked: true };
    const res = await run('xcrun', ['simctl', 'io', deviceId || 'booted', 'screenshot', out]);
    return { ok: res.ok, path: out };
  },

  // E-003
  async tailLog({ device = 'system', lines = 40 }) {
    const res = await run('log', ['show', '--last', '1m', '--style', 'compact'], 5000);
    return { lines: res.stdout.split('\n').slice(-lines).join('\n') };
  },

  // E-010
  async runShellCommand({ cmd }) {
    return new Promise(resolve => {
      const child = spawn('/bin/sh', ['-c', cmd || 'echo ok'], { timeout: 30000 });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => stdout += d.toString());
      child.stderr.on('data', d => stderr += d.toString());
      child.on('close', code => resolve({ ok: code === 0, code, stdout, stderr }));
    });
  },

  // FS — accept ~ for home dir
  async readFile({ filePath }) {
    try { return { ok: true, contents: fs.readFileSync(expandTilde(filePath), 'utf8') }; }
    catch (e) { return { ok: false, error: String(e) }; }
  },
  async writeFile({ filePath, contents }) {
    try {
      const p = expandTilde(filePath);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, contents);
      return { ok: true, path: p };
    } catch (e) { return { ok: false, error: String(e) }; }
  },
  async editFile({ filePath, search, replace }) {
    try {
      const p = expandTilde(filePath);
      const src = fs.readFileSync(p, 'utf8');
      const next = src.split(search).join(replace);
      fs.writeFileSync(p, next);
      return { ok: true, changed: src !== next };
    } catch (e) { return { ok: false, error: String(e) }; }
  },

  // E-002 — Real git ops via simple-git when a repo is present at repoRoot.
  // Falls back to mocked success if no .git dir found.
  async commitToGithub({ message, files = [], push = false }) {
    const simpleGit = require('simple-git');
    const { repoRoot } = require('./data-scan');
    const root = repoRoot();
    if (!root || !fs.existsSync(path.join(root, '.git'))) {
      return { ok: true, sha: 'local-' + Date.now().toString(16), mocked: true, reason: 'no .git at ' + root };
    }
    try {
      const git = simpleGit(root);
      // Add only the named files; if none provided, stage everything tracked-as-modified
      if (Array.isArray(files) && files.length) {
        await git.add(files);
      } else {
        await git.add(['-A']);
      }
      const status = await git.status();
      if (!status.staged.length) return { ok: true, sha: null, nothingToCommit: true };
      const commit = await git.commit(message || 'morbius: agent commit');
      let pushResult = null;
      if (push && (process.env.GITHUB_TOKEN || fs.existsSync(path.join(os.homedir(), '.morbius', '.github_pat')))) {
        try { pushResult = await git.push(); } catch (e) { pushResult = { error: String(e) }; }
      }
      return { ok: true, sha: commit.commit, branch: commit.branch, files: status.staged, push: pushResult };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async pullFromGithub() {
    const simpleGit = require('simple-git');
    const { repoRoot } = require('./data-scan');
    const root = repoRoot();
    if (!root || !fs.existsSync(path.join(root, '.git'))) return { ok: true, mocked: true };
    try {
      const git = simpleGit(root);
      const status = await git.pull();
      return { ok: true, status };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async readTestCase({ id }) {
    // List tests in default project as a stand-in
    const projDir = path.join(paths.projectsDir, 'mygrant-glass');
    const testsDir = path.join(projDir, 'tests');
    if (!fs.existsSync(testsDir)) return { ok: true, tests: [], matched: 0 };
    const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.md'));
    return { ok: true, tests: files, matched: files.length, id };
  },
  async writeTestCase({ id, contents }) {
    const f = path.join(paths.projectsDir, 'mygrant-glass', 'tests', `${id}.md`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, contents || '');
    return { ok: true, path: f };
  },
  async uploadScreenshot({ filePath }) {
    return { ok: true, mocked: true, key: `screenshots/${path.basename(filePath || 'x.png')}` };
  },

  // E-004 — environment doctor probes
  async runProbe({ id }) {
    if (id === 'xcrun') {
      const r = await run('xcrun', ['--version']);
      return { id, ok: r.ok, detail: r.stdout.trim() || r.stderr.trim() || 'not found' };
    }
    if (id === 'adb') {
      const r = await run('adb', ['--version']);
      return { id, ok: r.ok, detail: (r.stdout.split('\n')[0] || r.stderr).trim() };
    }
    if (id === 'jdk') {
      const r = await run('java', ['-version']);
      return { id, ok: r.ok, detail: (r.stderr.split('\n')[0] || r.stdout).trim() };
    }
    if (id === 'maestro') {
      const r = await run('maestro', ['--version']);
      return { id, ok: r.ok, detail: r.stdout.trim() || r.stderr.trim() || 'not found' };
    }
    if (id === 'node') {
      return { id, ok: true, detail: process.versions.node };
    }
    if (id === 'anthropic-key') {
      const sidecar = path.join(os.homedir(), '.morbius', '.anthropic_key');
      const fromFile = fs.existsSync(sidecar);
      const fromEnv = !!process.env.ANTHROPIC_API_KEY;
      const ok = fromEnv || fromFile;
      return { id, ok, detail: ok ? (fromEnv ? 'env (ANTHROPIC_API_KEY)' : 'sidecar file') : 'not configured' };
    }
    if (id === 'github-pat') {
      const sidecar = path.join(os.homedir(), '.morbius', '.github_pat');
      const fromFile = fs.existsSync(sidecar);
      const fromEnv = !!process.env.GITHUB_TOKEN;
      const ok = fromEnv || fromFile;
      return { id, ok, detail: ok ? (fromEnv ? 'env (GITHUB_TOKEN)' : 'sidecar file') : 'not configured' };
    }
    return { id, ok: false, detail: 'unknown probe' };
  },
  async checkEnvironment() {
    const ids = ['xcrun', 'adb', 'jdk', 'maestro', 'node', 'anthropic-key', 'github-pat'];
    const probes = await Promise.all(ids.map(id => tools.runProbe({ id })));
    return { probes };
  },

  // E-005 — PMAgent integration.
  // Looks for a sibling PMAgent repo at ~/PMAgent or ~/pmagent (case variants).
  // Bridge contract from web-app E-023: per-epic folders contain T-NNN-NNN-*.md test files.
  async readPMAgentSpec({ epicId }) {
    const root = findPMAgentRoot();
    if (!root) return { ok: true, exists: false, epicId, mocked: true, reason: 'PMAgent dir not found' };
    if (!epicId) {
      // List available epics
      const epics = fs.readdirSync(root, { withFileTypes: true })
        .filter(d => d.isDirectory() && /^[Ee]-/.test(d.name))
        .map(d => d.name);
      return { ok: true, exists: true, root, epics };
    }
    const epicDir = path.join(root, epicId);
    if (!fs.existsSync(epicDir)) return { ok: true, exists: false, epicId, root };
    const files = fs.readdirSync(epicDir).filter(f => f.endsWith('.md'));
    const spec = {};
    for (const f of files) {
      if (f.toLowerCase().startsWith('readme') || f.toLowerCase().startsWith('spec') || f.toLowerCase().startsWith('e-')) {
        spec.spec = fs.readFileSync(path.join(epicDir, f), 'utf8').slice(0, 6000);
        spec.specFile = f;
        break;
      }
    }
    const tests = files.filter(f => /^T-/i.test(f));
    return { ok: true, exists: true, epicId, root: epicDir, files, tests, ...spec };
  },
  async pullFromPMAgent() {
    const root = findPMAgentRoot();
    if (!root) return { ok: true, mocked: true };
    const simpleGit = require('simple-git');
    if (!fs.existsSync(path.join(root, '.git'))) return { ok: true, mocked: false, noGit: true };
    try { const git = simpleGit(root); const r = await git.pull(); return { ok: true, status: r }; }
    catch (e) { return { ok: false, error: String(e) }; }
  },
  async publishToPMAgent({ target, items, project }) {
    // target may be:
    //   "<epicId>"                   → write into epics/<epicId>/
    //   "<project>/epics/<epicId>"   → projects/<project>/epics/<epicId>/
    //   "<project>/QA"               → projects/<project>/incoming-QA/
    // Anything else → projects/<project || 'untriaged'>/incoming/
    const root = findPMAgentRoot();
    if (!root) return { ok: true, target, mocked: true, reason: 'PMAgent dir not found' };

    const proj = project || (target || '').split('/')[0] || 'untriaged';
    const projectsRoot = fs.existsSync(path.join(root, 'projects')) ? path.join(root, 'projects') : root;
    const projDir = path.join(projectsRoot, proj);

    // Pick the destination folder
    let outDir;
    const targetParts = (target || '').split('/').filter(Boolean);
    const lastSeg = targetParts[targetParts.length - 1] || '';
    const epicLike = /^E-\d{3}/.test(lastSeg);

    if (epicLike) {
      // Find the matching epic folder under projects/<proj>/epics/
      const epicsDir = path.join(projDir, 'epics');
      if (fs.existsSync(epicsDir)) {
        const match = fs.readdirSync(epicsDir, { withFileTypes: true })
          .find(d => d.isDirectory() && d.name.startsWith(lastSeg.slice(0, 5)));
        outDir = match ? path.join(epicsDir, match.name) : path.join(epicsDir, lastSeg);
      } else {
        outDir = path.join(root, lastSeg);
      }
    } else {
      outDir = path.join(projDir, 'incoming-' + (lastSeg || 'qa'));
    }
    fs.mkdirSync(outDir, { recursive: true });

    const written = [];
    for (const it of (items || [])) {
      const id = it.id || 'T-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-' + Math.random().toString(36).slice(2, 6);
      const slug = (it.title || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
      const fname = id + '-' + slug + '.md';
      const body = '---\n' +
                   'id: ' + id + '\n' +
                   'kind: ' + (it.kind || 'note') + '\n' +
                   'title: "' + (it.title || '').replace(/"/g, '\\"') + '"\n' +
                   'source: morbius-mac\n' +
                   'project: ' + proj + '\n' +
                   'ts: ' + new Date().toISOString() + '\n' +
                   '---\n\n' + (it.body || '');
      fs.writeFileSync(path.join(outDir, fname), body);
      written.push(fname);
    }
    return { ok: true, target, project: proj, root: outDir, written, count: written.length };
  },

  // Classification (mocked, deterministic for demo)
  async classify({ runId, output = '' }) {
    const severity = /element not found|crash|exception/i.test(output) ? 'P0' : /flaky|retry/i.test(output) ? 'P3' : 'P2';
    return { ok: true, runId, severity, hypothesis: `${severity} ${severity === 'P0' ? 'regression' : severity === 'P3' ? 'flake' : 'minor'}` };
  },

  async fileBug({ title, severity = 'P2' }) {
    const id = 'CH-' + Math.floor(1000 + Math.random() * 9000);
    return { ok: true, id, title, severity, mocked: true };
  },

  // E-002 sync status
  async syncStatus() {
    return { ok: true, status: 'synced', dirty: 0, mocked: true };
  },
};

// ---------- IPC ----------
function registerToolHandlers(ipcMain, getWin) {
  ipcMain.handle('tool:call', async (_e, { tool, args, projectId = 'mygrant-glass', reasoning, callId }) => {
    const win = getWin();
    const id = callId || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logActivity(win, projectId, { callId: id, tool, args, status: 'running' });

    let decision = 'allow';
    if (toolCategory(tool) !== 'read' || permissionMode === 'plan') {
      const r = await checkPermission(win, tool, args, reasoning);
      decision = r.decision;
    }
    if (decision !== 'allow') {
      const denial = { callId: id, tool, args, status: 'denied' };
      logActivity(win, projectId, denial);
      appendAudit({ tool, args, decision: 'deny' });
      return { ok: false, denied: true, callId: id };
    }

    const impl = tools[tool];
    if (!impl) {
      const err = { callId: id, tool, args, status: 'fail', error: 'unknown tool' };
      logActivity(win, projectId, err);
      return { ok: false, error: 'unknown tool', callId: id };
    }

    const start = Date.now();
    let result;
    try { result = await impl(args || {}); }
    catch (e) { result = { ok: false, error: String(e) }; }
    const durationMs = Date.now() - start;

    const status = result?.ok === false ? 'fail' : 'pass';
    logActivity(win, projectId, { callId: id, tool, args, status, durationMs, result });
    appendAudit({ tool, args, decision: 'allow', status, durationMs });
    return { ok: true, callId: id, durationMs, result, status };
  });

  ipcMain.handle('permission:resolve', async (_e, { promptId, choice, tool, args }) => {
    if (choice === 'always-allow' || choice === 'always-deny') {
      const rules = loadPermissionRules();
      // For shell + writeFile + editFile, scope the rule to the specific argument
      // so "Always allow rm node_modules" doesn't authorize "rm -rf /".
      const SCOPED = { runShellCommand: 'cmd', writeFile: 'filePath', editFile: 'filePath' };
      const argKey = SCOPED[tool];
      const matchArg = argKey && args && args[argKey] ? String(args[argKey]).slice(0, 200) : '';
      rules.push({
        tool,
        matchArg,
        allow: choice === 'always-allow',
        created: new Date().toISOString(),
      });
      savePermissionRules(rules);
    }
    return resolvePrompt(promptId, choice);
  });

  ipcMain.handle('permission:list', async () => ({ rules: loadPermissionRules(), mode: permissionMode }));
  ipcMain.handle('permission:remove-rule', async (_e, { index }) => {
    const rules = loadPermissionRules();
    rules.splice(index, 1);
    savePermissionRules(rules);
    return { ok: true, rules };
  });
  ipcMain.handle('permission:set-mode', async (_e, { mode }) => {
    if (['default', 'acceptEdits', 'plan', 'bypassPermissions'].includes(mode)) permissionMode = mode;
    return { ok: true, mode: permissionMode };
  });

  ipcMain.handle('activity:recent', async (_e, { projectId = 'mygrant-glass', limit = 200 } = {}) => {
    const f = path.join(paths.projectsDir, projectId, 'agent-activity.jsonl');
    if (!fs.existsSync(f)) return { entries: [] };
    const lines = fs.readFileSync(f, 'utf8').trim().split('\n').slice(-limit);
    return { entries: lines.filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) };
  });
}

// Expose internals to tool-bridge.js (in-process invocation by agent.js)
global.__morbius_tools_internals__ = {
  _impls: tools,
  _checkPermission: checkPermission,
  _logActivity: logActivity,
  _appendAudit: appendAudit,
  _toolCategory: toolCategory,
};

module.exports = { registerToolHandlers, toolCategory, PERMISSION_CATEGORIES, getPermissionMode };
