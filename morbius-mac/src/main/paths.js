// File-based persistence layout — mirrors arch.md "Data Layout".
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

const appSupport = app.getPath('userData'); // .../Application Support/Morbius
const home = os.homedir();

const paths = {
  dataDir:       appSupport,
  projectsDir:   path.join(appSupport, 'projects'),
  permissions:   path.join(appSupport, 'permissions.json'),
  audit:         path.join(appSupport, 'audit.jsonl'),
  workspace:     path.join(home, '.morbius'),
  memoryDir:     path.join(home, '.morbius', 'memory'),
  skillsDir:     path.join(home, '.morbius', 'skills'),
  mcpConfig:     path.join(home, '.morbius', 'mcp.json'),
};

function ensureDataDirs() {
  for (const d of [paths.dataDir, paths.projectsDir, paths.workspace, paths.memoryDir, paths.skillsDir]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
  if (!fs.existsSync(paths.permissions)) {
    fs.writeFileSync(paths.permissions, JSON.stringify({ rules: [] }, null, 2));
  }
  // Seed built-in skills so they show in the palette
  const builtins = require('./builtin-skills');
  for (const skill of builtins) {
    const f = path.join(paths.skillsDir, `${skill.slash.replace(/^\//, '')}.md`);
    if (!fs.existsSync(f)) {
      const front = `---\nslash: ${skill.slash}\ndesc: ${skill.desc}\ntools: ${JSON.stringify(skill.tools)}\ncost: ${skill.cost}\n---\n\n${skill.body || ''}\n`;
      fs.writeFileSync(f, front);
    }
  }
  // Seed memory index
  const mem = path.join(paths.memoryDir, 'MEMORY.md');
  if (!fs.existsSync(mem)) {
    fs.writeFileSync(mem, '# Morbius Agent Memory\n\n- (empty — entries will be added by the agent)\n');
  }
  // Seed a default project so the UI has something to show
  const defaultProj = path.join(paths.projectsDir, 'mygrant-glass');
  if (!fs.existsSync(defaultProj)) {
    fs.mkdirSync(path.join(defaultProj, 'conversations'), { recursive: true });
    fs.writeFileSync(path.join(defaultProj, 'agent-activity.jsonl'), '');
    fs.writeFileSync(path.join(defaultProj, 'config.json'), JSON.stringify({
      id: 'mygrant-glass',
      name: 'mygrant-glass',
      workspace: 'RF',
      flowsDir: '',
      created: new Date().toISOString(),
    }, null, 2));
  }
}

module.exports = { paths, ensureDataDirs };
