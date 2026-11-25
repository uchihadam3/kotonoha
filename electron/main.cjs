// KOTONOHA — janela do aplicativo de desktop (Windows, Linux, macOS)
const { app, BrowserWindow, Menu, shell, protocol, net, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// protocolo próprio (app://) para o save ficar num lugar fixo e o jogo carregar como num site
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);
const ROOT = path.join(__dirname, '..', 'dist');

let win;
function create() {
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 900, minHeight: 560,
    backgroundColor: '#0a0b14', title: 'KOTONOHA', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
  });
  Menu.setApplicationMenu(null);
  win.loadURL('app://kotonoha/index.html');
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // F11 alterna a tela cheia
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // o reconhecimento de voz e o microfone precisam de permissão
  win.webContents.session.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media' || permission === 'fullscreen'));
}
ipcMain.on('toggle-fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });

const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('app', (req) => {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (!p || p === '/') p = '/index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) return new Response('proibido', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    create();
  });
  app.on('window-all-closed', () => app.quit());
}
