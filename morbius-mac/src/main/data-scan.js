// Reads the existing sibling morbius repo's data/ tree so the Mac app shows real
// test cases, bugs, runs, and flows in its secondary views.
const fs = require('fs');
const path = require('path');

function repoRoot() {
  // Climb out of morbius-mac/ until we find a data/projects.json
  let dir = path.resolve(__dirname, '..', '..', '..');
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'data', 'projects.json'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

function listProjects() {
  const root = repoRoot();
  if (!root) return [];
  const f = path.join(root, 'data', 'projects.json');
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return (j.projects || []).map(p => ({
      id: p.id,
      name: p.name || p.id,
      appId: p.appId,
      path: path.join(root, 'data', p.id),
    }));
  } catch { return []; }
}

function readFrontmatter(file) {
  try {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.startsWith('---')) return { title: path.basename(file, '.md'), status: 'unknown' };
    const end = src.indexOf('\n---', 3);
    if (end < 0) return { title: path.basename(file, '.md'), status: 'unknown' };
    const fm = src.slice(3, end).trim();
    const out = {};
    for (const line of fm.split('\n')) {
      const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    out.title = out.title || path.basename(file, '.md');
    return out;
  } catch { return { title: path.basename(file, '.md'), status: 'unknown' }; }
}

function listDirOfMd(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d, depth = 0) => {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name.endsWith('.md')) {
        const fm = readFrontmatter(full);
        out.push({ file: entry.name, path: path.relative(dir, full), ...fm });
      }
    }
  };
  walk(dir);
  return out;
}

function listTests(projectId) {
  const root = repoRoot();
  if (!root) return [];
  return listDirOfMd(path.join(root, 'data', projectId, 'tests'))
    .filter(t => /^tc-/i.test(t.file) || t.id || t.category || /^tc/i.test(t.id || ''));
}
function listBugs(projectId) {
  const root = repoRoot();
  if (!root) return [];
  return listDirOfMd(path.join(root, 'data', projectId, 'bugs'))
    // Bug files have a severity, status, or jira-id frontmatter, or filename starts with bug-/jira-/MA-/CH-
    .filter(b =>
      /^(bug|jira|ma|ch)[-_]/i.test(b.file) ||
      b.severity || b.priority || b.jira || b.status);
}
function listRuns(projectId) {
  const root = repoRoot();
  if (!root) return [];
  return listDirOfMd(path.join(root, 'data', projectId, 'runs'))
    .filter(r => /^r-/i.test(r.file) || r.runId || r.flow || r.status);
}
function listFlows(projectId) {
  const root = repoRoot();
  if (!root) return [];
  // Each entry: { name, absPath, sub } — `sub` is the platform folder if any (android/ios)
  const seen = new Map();
  if (projectId) {
    const projDir = path.join(root, 'data', projectId, 'flows');
    if (fs.existsSync(projDir)) {
      const walk = (d, sub = '') => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) walk(full, sub ? sub + '/' + entry.name : entry.name);
          else if (/\.ya?ml$/.test(entry.name)) {
            const key = (sub ? sub + '/' : '') + entry.name;
            if (!seen.has(key)) seen.set(key, { name: entry.name, absPath: full, sub });
          }
        }
      };
      walk(projDir);
    }
  }
  if (seen.size === 0) {
    const dir = path.join(root, 'flows');
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (/\.ya?ml$/.test(f)) seen.set(f, { name: f, absPath: path.join(dir, f), sub: '' });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function readProjectConfig(projectId) {
  const root = repoRoot();
  if (!root || !projectId) return null;
  const f = path.join(root, 'data', projectId, 'config.json');
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

function registerDataHandlers(ipcMain) {
  ipcMain.handle('data:projects', () => ({ projects: listProjects(), root: repoRoot() }));
  ipcMain.handle('data:tests',    (_e, { projectId }) => ({ items: listTests(projectId) }));
  ipcMain.handle('data:bugs',     (_e, { projectId }) => ({ items: listBugs(projectId) }));
  ipcMain.handle('data:runs',     (_e, { projectId }) => ({ items: listRuns(projectId) }));
  ipcMain.handle('data:flows',    (_e, { projectId } = {}) => ({ items: listFlows(projectId) }));
  ipcMain.handle('data:appmap',   (_e, { projectId }) => {
    const cfg = readProjectConfig(projectId);
    return { appMap: cfg?.appMap || null, project: cfg?.name || projectId };
  });
  ipcMain.handle('data:project-config', (_e, { projectId }) => ({ config: readProjectConfig(projectId) }));
}

module.exports = { registerDataHandlers, repoRoot };
