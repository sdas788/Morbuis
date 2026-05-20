// E-006 — Auto-update via electron-updater + GitHub Releases.
// Only runs in packaged production builds; bypassed when launched via `npm start`.

const path = require('path');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (e) {
  // electron-updater not installed in this dev sandbox; safe to ignore
}

function send(win, channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function isPackaged() {
  try { return require('electron').app.isPackaged; } catch { return false; }
}

function init(getWin) {
  if (!autoUpdater) return; // dep not available
  if (!isPackaged()) {
    // Skip in dev so we don't try to compare to GitHub Releases during local runs
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update',     () => send(getWin(), 'updater:status', { state: 'checking' }));
  autoUpdater.on('update-available',  (info) => send(getWin(), 'updater:status', { state: 'available', version: info?.version }));
  autoUpdater.on('update-not-available', () => send(getWin(), 'updater:status', { state: 'current' }));
  autoUpdater.on('download-progress', (p)   => send(getWin(), 'updater:progress', { percent: p.percent, transferred: p.transferred, total: p.total }));
  autoUpdater.on('update-downloaded',  (info) => send(getWin(), 'updater:status', { state: 'downloaded', version: info?.version }));
  autoUpdater.on('error',              (err)  => send(getWin(), 'updater:status', { state: 'error', error: err?.message || String(err) }));

  // Kick off the first check after 30s so window paint isn't blocked
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 30_000);
  // Then every 4 hours
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600 * 1000);
}

function registerUpdaterHandlers(ipcMain) {
  ipcMain.handle('updater:check', async () => {
    if (!autoUpdater) return { ok: false, reason: 'electron-updater not installed' };
    if (!isPackaged()) return { ok: false, reason: 'dev mode (not packaged)' };
    try { const r = await autoUpdater.checkForUpdates(); return { ok: true, version: r?.updateInfo?.version }; }
    catch (e) { return { ok: false, error: String(e) }; }
  });
  ipcMain.handle('updater:install', async () => {
    if (!autoUpdater) return { ok: false };
    autoUpdater.quitAndInstall();
    return { ok: true };
  });
}

module.exports = { init, registerUpdaterHandlers };
