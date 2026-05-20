// E-010 — MCP (Model Context Protocol) hosting.
// Reads ~/.morbius/mcp.json, spawns each declared server over stdio,
// discovers their tools, and exposes them through the agent's tool surface.
//
// mcp.json shape:
// {
//   "servers": {
//     "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/sdas/Documents"], "enabled": true },
//     "github":     { "command": "uvx", "args": ["mcp-server-github"], "env": { "GITHUB_TOKEN": "$GITHUB_TOKEN" }, "enabled": false }
//   }
// }

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const CONFIG_PATH = path.join(os.homedir(), '.morbius', 'mcp.json');
const DEFAULT_CONFIG = {
  servers: {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', path.join(os.homedir(), 'Downloads')],
      enabled: false,
      description: 'Filesystem access scoped to ~/Downloads. Toggle enabled and restart to use.',
    },
  },
};

// In-memory registry — { serverId → { client, tools, status, version, source, error } }
const registry = new Map();

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    try { fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true }); fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2)); }
    catch {}
    return DEFAULT_CONFIG;
  }
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return { servers: {} }; }
}

function expandEnv(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$(\w+)/g, (_, name) => process.env[name] || '');
}

async function spawnServer(id, def) {
  const cmd = expandEnv(def.command);
  const args = (def.args || []).map(expandEnv);
  const env = { ...process.env };
  if (def.env) for (const [k, v] of Object.entries(def.env)) env[k] = expandEnv(v);

  const transport = new StdioClientTransport({ command: cmd, args, env });
  const client = new Client(
    { name: 'morbius-mac', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  // 8-second connect timeout — fail fast if server is broken
  await Promise.race([
    client.connect(transport),
    new Promise((_, reject) => setTimeout(() => reject(new Error('connect timeout')), 8000)),
  ]);
  const toolsRes = await client.listTools();
  return { client, transport, tools: toolsRes?.tools || [] };
}

async function loadAll() {
  // Shut down anything currently running
  for (const [id, entry] of registry) {
    try { await entry.client?.close?.(); } catch {}
  }
  registry.clear();

  const cfg = readConfig();
  for (const [id, def] of Object.entries(cfg.servers || {})) {
    if (def.enabled === false) {
      registry.set(id, { status: 'disabled', source: def.command + ' ' + (def.args || []).join(' '), tools: [], description: def.description });
      continue;
    }
    try {
      const { client, tools } = await spawnServer(id, def);
      registry.set(id, {
        status: 'ok',
        version: '—',
        source: def.command + ' ' + (def.args || []).join(' '),
        tools,
        client,
        description: def.description,
      });
    } catch (e) {
      registry.set(id, {
        status: 'fail',
        source: def.command + ' ' + (def.args || []).join(' '),
        tools: [],
        error: e?.message || String(e),
        description: def.description,
      });
    }
  }
}

// Tool schemas for the SDK — keyed as `mcp__<server>__<tool>` so they don't collide
// with the 19 built-ins.
function listMcpToolSchemas() {
  const out = [];
  for (const [id, entry] of registry) {
    if (entry.status !== 'ok') continue;
    for (const t of entry.tools) {
      out.push({
        name: 'mcp__' + id + '__' + t.name,
        description: '[' + id + ' MCP] ' + (t.description || t.name),
        input_schema: t.inputSchema || { type: 'object', properties: {} },
      });
    }
  }
  return out;
}

async function invokeMcpTool(fullName, args) {
  const m = fullName.match(/^mcp__([^_]+(?:_[^_]+)*)__(.+)$/);
  if (!m) return { ok: false, status: 'fail', error: 'malformed MCP tool name: ' + fullName };
  const [, serverId, toolName] = m;
  const entry = registry.get(serverId);
  if (!entry) return { ok: false, status: 'fail', error: 'unknown MCP server: ' + serverId };
  if (entry.status !== 'ok') return { ok: false, status: 'fail', error: serverId + ' MCP not running' };
  try {
    const res = await entry.client.callTool({ name: toolName, arguments: args || {} });
    return { ok: true, status: 'pass', result: res, content: res?.content };
  } catch (e) {
    return { ok: false, status: 'fail', error: e?.message || String(e) };
  }
}

function listForUi() {
  const out = [];
  for (const [id, entry] of registry) {
    out.push({
      id,
      status: entry.status,
      tools: entry.tools.length,
      source: entry.source,
      error: entry.error,
      description: entry.description,
    });
  }
  return out;
}

function isMcpTool(name) {
  return typeof name === 'string' && name.startsWith('mcp__');
}

function configPath() { return CONFIG_PATH; }

function registerMcpHandlers(ipcMain) {
  ipcMain.handle('mcp:list',     async () => ({ servers: listForUi(), configPath: CONFIG_PATH }));
  ipcMain.handle('mcp:reload',   async () => { await loadAll(); return { ok: true, servers: listForUi() }; });
  ipcMain.handle('mcp:open-config', async () => {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    }
    return { ok: true, path: CONFIG_PATH };
  });
}

module.exports = { loadAll, listMcpToolSchemas, invokeMcpTool, listForUi, isMcpTool, configPath, registerMcpHandlers };
