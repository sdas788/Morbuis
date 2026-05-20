// E-001 + E-015: native menu, matches design.md "Menu Bar" section.
const { app, Menu, shell } = require('electron');

function send(win, channel, payload = {}) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function buildMenu(getWin) {
  const tpl = [
    {
      label: 'Morbius',
      submenu: [
        { role: 'about', label: 'About Morbius' },
        { type: 'separator' },
        { label: 'Preferences…', accelerator: 'Cmd+,', click: () => send(getWin(), 'nav:view', { view: 'settings' }) },
        { label: 'Check for Updates…', click: () => send(getWin(), 'nav:check-update') },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Conversation', accelerator: 'Cmd+N', click: () => send(getWin(), 'nav:new-conversation') },
        { label: 'Open Workspace…', accelerator: 'Cmd+O', click: () => send(getWin(), 'nav:open-workspace') },
        { label: 'Switch Project…', accelerator: 'Cmd+P', click: () => send(getWin(), 'nav:switch-project') },
        { type: 'separator' },
        { label: 'Sync Now', accelerator: 'Cmd+R', click: () => send(getWin(), 'nav:sync-now') },
        { type: 'separator' },
        { label: 'Import from Excel…', accelerator: 'Cmd+I', click: () => send(getWin(), 'nav:import-xlsx') },
        { label: 'Transfer from PMAgent…', accelerator: 'Shift+Cmd+T', click: () => send(getWin(), 'nav:pmagent-transfer') },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Chat',         accelerator: 'Cmd+1', click: () => send(getWin(), 'nav:view', { view: 'chat' }) },
        { label: 'Overview',     accelerator: 'Cmd+2', click: () => send(getWin(), 'nav:view', { view: 'dashboard' }) },
        { label: 'Tests',        accelerator: 'Cmd+3', click: () => send(getWin(), 'nav:view', { view: 'tests' }) },
        { label: 'Bugs',         accelerator: 'Cmd+4', click: () => send(getWin(), 'nav:view', { view: 'bugs' }) },
        { label: 'Devices',      accelerator: 'Cmd+5', click: () => send(getWin(), 'nav:view', { view: 'devices' }) },
        { label: 'Runs',         accelerator: 'Cmd+6', click: () => send(getWin(), 'nav:view', { view: 'runs' }) },
        { label: 'Flows',        accelerator: 'Cmd+7', click: () => send(getWin(), 'nav:view', { view: 'flows' }) },
        { label: 'AppMap',       accelerator: 'Cmd+8', click: () => send(getWin(), 'nav:view', { view: 'appmap' }) },
        { label: 'Healing',      accelerator: 'Cmd+9', click: () => send(getWin(), 'nav:view', { view: 'healing' }) },
        { type: 'separator' },
        { label: 'Skills',       click: () => send(getWin(), 'nav:view', { view: 'skills' }) },
        { label: 'Doctor',       accelerator: 'Shift+Cmd+D', click: () => send(getWin(), 'nav:view', { view: 'doctor' }) },
        { label: 'Permissions',  accelerator: 'Shift+Cmd+P', click: () => send(getWin(), 'nav:view', { view: 'permissions' }) },
        { label: 'Approvals',    accelerator: 'Shift+Cmd+A', click: () => send(getWin(), 'nav:view', { view: 'approvals' }) },
        { label: 'MCP Servers',  accelerator: 'Shift+Cmd+M', click: () => send(getWin(), 'nav:view', { view: 'mcp' }) },
        { label: 'Settings',     accelerator: 'Cmd+,',       click: () => send(getWin(), 'nav:view', { view: 'settings' }) },
        { type: 'separator' },
        { label: 'Toggle Light/Dark', accelerator: 'Shift+Cmd+L', click: () => send(getWin(), 'nav:toggle-theme') },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Run',
      submenu: [
        { label: 'Run Active Flow',  accelerator: 'Cmd+Return',       click: () => send(getWin(), 'run:active') },
        { label: 'Run Full Suite',   accelerator: 'Shift+Cmd+Return', click: () => send(getWin(), 'run:suite') },
        { type: 'separator' },
        { label: 'Halt Agent (Kill Switch)', accelerator: 'Cmd+.', click: () => send(getWin(), 'agent:kill') },
        { label: 'Halt Agent (alt)',         accelerator: 'Cmd+Escape', click: () => send(getWin(), 'agent:kill') },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://docs.maestro.dev/llms.txt') },
        { label: 'Report Issue', click: () => shell.openExternal('https://github.com/anthropics/claude-code/issues') },
        { label: 'Open Data Folder', click: () => send(getWin(), 'os:openDataFolder') },
        { label: 'Run First-Launch Setup Again', click: () => send(getWin(), 'nav:first-launch') },
      ],
    },
  ];
  return Menu.buildFromTemplate(tpl);
}

module.exports = { buildMenu };
