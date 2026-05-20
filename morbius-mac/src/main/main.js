// Morbius Mac — Electron main process.
// Owns: window lifecycle, native menus, IPC routing.
// All agent tools live in src/main/tools/*.

const { app, BrowserWindow, Menu, ipcMain, shell, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { registerToolHandlers } = require('./tools');
const { registerAgentHandlers } = require('./agent');
const { registerDataHandlers } = require('./data-scan');
const { registerApprovalHandlers } = require('./approvals');
const updater = require('./updater');
const mcp = require('./mcp');
const { ensureDataDirs, paths } = require('./paths');
const { buildMenu } = require('./menu');

let mainWindow = null;

function createWindow() {
  ensureDataDirs();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#07080a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
    title: 'Morbius',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app:ready', { paths, home: os.homedir() });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerToolHandlers(ipcMain, () => mainWindow);
  registerAgentHandlers(ipcMain, () => mainWindow);
  registerDataHandlers(ipcMain);
  registerApprovalHandlers(ipcMain);
  updater.registerUpdaterHandlers(ipcMain);
  mcp.registerMcpHandlers(ipcMain);
  updater.init(() => mainWindow);
  // Boot MCP servers in the background; don't block window load
  mcp.loadAll().catch((e) => console.warn('MCP loadAll failed:', e?.message));

  // Generic OS bridges used by renderer
  ipcMain.handle('os:openExternal', async (_e, url) => {
    await shell.openExternal(url);
    return { ok: true };
  });
  ipcMain.handle('os:notify', async (_e, { title, body }) => {
    if (Notification.isSupported()) new Notification({ title, body }).show();
    return { ok: true };
  });
  ipcMain.handle('os:openDataFolder', async () => {
    await shell.openPath(paths.dataDir);
    return { ok: true };
  });
  ipcMain.handle('os:pickFile', async (_e, opts = {}) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: opts.filters || [],
    });
    return { canceled: res.canceled, files: res.filePaths };
  });

  Menu.setApplicationMenu(buildMenu(() => mainWindow));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
