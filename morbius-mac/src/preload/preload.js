// Bridges renderer <-> main. The renderer only sees `window.morbius`.
const { contextBridge, ipcRenderer } = require('electron');

const handlers = new Map();
function on(channel, fn) {
  const wrapped = (_e, payload) => fn(payload);
  ipcRenderer.on(channel, wrapped);
  handlers.set(channel, wrapped);
  return () => { ipcRenderer.removeListener(channel, wrapped); handlers.delete(channel); };
}

contextBridge.exposeInMainWorld('morbius', {
  // ---- tools (E-010) + permission (E-011) ----
  toolCall:    (payload) => ipcRenderer.invoke('tool:call', payload),
  resolvePermission: (payload) => ipcRenderer.invoke('permission:resolve', payload),
  listPermissions:   () => ipcRenderer.invoke('permission:list'),
  removePermissionRule: (payload) => ipcRenderer.invoke('permission:remove-rule', payload),
  setPermissionMode: (payload) => ipcRenderer.invoke('permission:set-mode', payload),

  // ---- agent (E-009/13/14) ----
  agentSend:   (payload) => ipcRenderer.invoke('agent:send', payload),
  agentMode:   () => ipcRenderer.invoke('agent:mode'),
  agentCancel: (payload) => ipcRenderer.invoke('agent:cancel', payload),
  killAgent:   () => ipcRenderer.invoke('safety:kill'),

  // ---- conversations + skills + memory ----
  conversationList: (payload) => ipcRenderer.invoke('conversation:list', payload || {}),
  conversationOpen: (payload) => ipcRenderer.invoke('conversation:open', payload),
  skillList:        () => ipcRenderer.invoke('skill:list'),
  readMemory:       () => ipcRenderer.invoke('memory:read'),
  writeMemory:      (payload) => ipcRenderer.invoke('memory:write', payload),

  // ---- activity rail (E-012) ----
  recentActivity: (payload) => ipcRenderer.invoke('activity:recent', payload || {}),

  // ---- repo data (kanban / tests / bugs / runs / flows) ----
  listProjects: () => ipcRenderer.invoke('data:projects'),
  listTests:    (payload) => ipcRenderer.invoke('data:tests', payload),
  listBugs:     (payload) => ipcRenderer.invoke('data:bugs', payload),
  listRuns:     (payload) => ipcRenderer.invoke('data:runs', payload),
  listFlows:    (payload) => ipcRenderer.invoke('data:flows', payload || {}),
  getAppMap:    (payload) => ipcRenderer.invoke('data:appmap', payload),
  getProjectConfig: (payload) => ipcRenderer.invoke('data:project-config', payload),

  // ---- MCP (E-010) ----
  mcpList:      () => ipcRenderer.invoke('mcp:list'),
  mcpReload:    () => ipcRenderer.invoke('mcp:reload'),
  mcpOpenConfig: () => ipcRenderer.invoke('mcp:open-config'),

  // ---- Approvals queue (E-015) ----
  approvalsList:    () => ipcRenderer.invoke('approvals:list'),
  approvalsResolve: (payload) => ipcRenderer.invoke('approvals:resolve', payload),
  approvalsClear:   () => ipcRenderer.invoke('approvals:clear'),

  // ---- Auto-update (E-006) ----
  updaterCheck:   () => ipcRenderer.invoke('updater:check'),
  updaterInstall: () => ipcRenderer.invoke('updater:install'),

  // ---- OS ----
  openExternal:   (url) => ipcRenderer.invoke('os:openExternal', url),
  notify:         (payload) => ipcRenderer.invoke('os:notify', payload),
  openDataFolder: () => ipcRenderer.invoke('os:openDataFolder'),
  pickFile:       (opts) => ipcRenderer.invoke('os:pickFile', opts || {}),

  // ---- events ----
  on,
});
