const { app, BrowserWindow, Menu, dialog, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

// ──────────────────────────────────────────────
// Chromium flags — deben aplicarse ANTES de app.ready
// Previenen el crash del Network Service al usar webSecurity:false
// con peticiones a localhost (bug conocido en Electron >= 28)
// ──────────────────────────────────────────────
app.commandLine.appendSwitch('disable-features', 'NetworkServiceInProcess2');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
// Fuerza el Network Service dentro del proceso principal (más estable en dev)
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess');

let mainWindow = null;
let serverProcess = null;

const SERVER_PORT = 3000;
const APP_URL = `http://localhost:${SERVER_PORT}`;
// Duración de la entrada del logo en splash.html (public/js/splash.js)
const SPLASH_INTRO_MS = 1900;

// ──────────────────────────────────────────────
// 0. Carpeta de datos del usuario
// ──────────────────────────────────────────────
// En la app instalada el código va dentro de app.asar, que es de solo lectura: los datos
// (data/ y media/) se guardan en %APPDATA%\HIY Series. La primera vez se copia ahí el
// data/ que trae el instalador. En desarrollo se sigue usando la carpeta del proyecto.
function getUserDir() {
  if (!app.isPackaged) return __dirname;
  const userDir = app.getPath('userData');
  const dataDir = path.join(userDir, 'data');
  if (!fs.existsSync(dataDir)) {
    // Se copia a una carpeta temporal y se renombra: si se corta a medias, se repite
    const tmpDir = `${dataDir}.tmp`;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    copyDir(path.join(__dirname, 'data'), tmpDir);
    fs.renameSync(tmpDir, dataDir);
  }
  return userDir;
}

// Copia recursiva que también sabe leer desde app.asar
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(src)) return;
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.writeFileSync(to, fs.readFileSync(from));
  }
}

// ──────────────────────────────────────────────
// 1. Start Express server as a child process
// ──────────────────────────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const userDir = getUserDir();
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
      env: { ...process.env, PORT: SERVER_PORT, HIY_USER_DIR: userDir },
      silent: true
    });
    connectTmdbKey(serverProcess, userDir);

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg);
      if (msg.includes('localhost:')) {
        resolve(); // Server is ready
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', reject);
    // Si el servidor se cierra (p. ej. puerto ocupado), no seguir esperando
    serverProcess.on('exit', () => resolve());

    // Fallback: en un arranque en frío (disco lento) el servidor puede tardar más
    setTimeout(resolve, 15000);
  });
}

// ──────────────────────────────────────────────
// 1b. Clave de TMDB cifrada
// ──────────────────────────────────────────────
// La clave no va en config.json: se cifra con Windows (safeStorage → DPAPI, ligada a tu
// usuario de Windows en este PC) y se guarda en un archivo de nombre genérico dentro de data/.
// Copiado a otro PC o usuario no se puede descifrar (se toma como "sin clave").
// El servidor la recibe descifrada por el canal del proceso hijo y la tiene solo en memoria.
const TMDB_KEY_FILE = 'sys.dat';

function readTmdbKey(userDir) {
  const file = path.join(userDir, 'data', TMDB_KEY_FILE);
  try {
    if (!fs.existsSync(file) || !safeStorage.isEncryptionAvailable()) return '';
    return safeStorage.decryptString(fs.readFileSync(file));
  } catch (err) {
    console.warn('[TMDB] No se pudo descifrar la clave guardada:', err.message);
    return '';
  }
}

// key vacía: borra el archivo. Devuelve false si Windows no puede cifrar.
function writeTmdbKey(userDir, key) {
  const file = path.join(userDir, 'data', TMDB_KEY_FILE);
  if (!key) {
    fs.rmSync(file, { force: true });
    return true;
  }
  if (!safeStorage.isEncryptionAvailable()) return false;
  fs.writeFileSync(`${file}.tmp`, safeStorage.encryptString(key));
  fs.renameSync(`${file}.tmp`, file);
  return true;
}

function connectTmdbKey(proc, userDir) {
  // safeStorage solo funciona con la app lista; el servidor arranca antes, en paralelo
  proc.on('message', async (msg) => {
    if (!msg || msg.type !== 'tmdb-key-save') return;
    await app.whenReady();
    let ok = false;
    try {
      ok = writeTmdbKey(userDir, String(msg.key || '').trim());
    } catch (err) {
      console.error('[TMDB] No se pudo guardar la clave cifrada:', err.message);
    }
    if (proc.connected) proc.send({ type: 'tmdb-key-saved', id: msg.id, ok });
  });
  app.whenReady().then(() => {
    const key = readTmdbKey(userDir);
    if (key && proc.connected) proc.send({ type: 'tmdb-key', key });
  });
}

// ──────────────────────────────────────────────
// 2. Create the main desktop window
// ──────────────────────────────────────────────
function createWindow(serverReady = Promise.resolve()) {
  // Only set icon if the file actually exists
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const iconExists = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'HIY Series',
    backgroundColor: '#141414',
    // Se muestra en 'ready-to-show' (con la animación ya dibujada): mostrarla antes
    // dejaba ver un destello blanco al abrir
    show: false,
    ...(iconExists ? { icon: iconPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow loading local video files via file:// in renderer
    },
    frame: true,
    // Sin la barra de menú (HIY Series · Biblioteca · Vista); tampoco aparece con Alt
    autoHideMenuBar: false
  });

  // Mientras el servidor termina de arrancar se ve la animación del logo (desde el disco).
  // Cuando está listo y la entrada del logo terminó, se carga la app; ?splash=1 le dice
  // que siga mostrando el logo ya armado hasta que el catálogo esté dibujado.
  mainWindow.loadFile(path.join(__dirname, 'public', 'splash.html'));
  const introDone = new Promise(r => setTimeout(r, SPLASH_INTRO_MS));
  Promise.all([serverReady, introDone]).then(() => {
    if (mainWindow) mainWindow.loadURL(`${APP_URL}/?splash=1`);
  });

  // Bring window to front
  const showWindow = () => {
    if (!mainWindow || mainWindow.isVisible()) return;
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    setTimeout(() => {
      if (mainWindow) mainWindow.setAlwaysOnTop(false);
    }, 500);
  };
  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] Window ready, showing and bringing to front...');
    showWindow();
  });
  // Si 'ready-to-show' no llega (p. ej. el renderer se cayó al cargar), mostrarla igual:
  // si no, la app quedaba abierta pero invisible y no se podía volver a abrir
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('[Electron] La ventana no avisó que estaba lista; mostrándola igual');
      showWindow();
    }
  }, 6000);

  // Recuperación automática si el Network Service crashea en mitad de la sesión
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Electron] Render process gone:', details.reason, '— recargando...');
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(`${APP_URL}/?splash=1`);
    }, 1500);
  });

  app.on('child-process-gone', (event, details) => {
    if (details.type === 'Utility' && details.serviceName === 'network') {
      console.warn('[Electron] Network Service crasheó — reiniciando ventana en 2s...');
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL(`${APP_URL}/?splash=1`);
      }, 2000);
    }
  });

  // El servidor aún no responde: reintentar en vez de dejar la ventana en blanco
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // -3 = navegación cancelada (p. ej. al recargar): no es un error real
    if (!isMainFrame || errorCode === -3) return;
    console.error('[Electron] Failed to load:', errorCode, errorDescription, '- reintentando...');
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(`${APP_URL}/?splash=1`);
    }, 1000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // El menú se crea igual, pero oculto: así siguen funcionando sus atajos
  // (F11, Ctrl+O, Ctrl+R, Ctrl+0, Ctrl+Shift+I, Ctrl+Q) sin que se vea la barra
  buildMenu();
  mainWindow.setMenuBarVisibility(false);
}

// ──────────────────────────────────────────────
// 3. Native Application Menu
// ──────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'HIY Series',
      submenu: [
        { label: 'Acerca de HIY Series', role: 'about' },
        { type: 'separator' },
        { label: 'Salir', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Biblioteca',
      submenu: [
        {
          label: '📂 Agregar Carpeta de Series...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Selecciona la carpeta con tus series (MP4, MKV, WEBM)',
              properties: ['openDirectory'],
              buttonLabel: 'Escanear esta carpeta'
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const folderPath = result.filePaths[0];
              mainWindow.webContents.send('scan-folder', folderPath);
            }
          }
        },
        { type: 'separator' },
        {
          label: '🔄 Recargar Catálogo',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.reload()
        }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        {
          label: 'Pantalla Completa',
          accelerator: 'F11',
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen())
        },
        {
          label: 'Restablecer Zoom',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom'
        },
        { type: 'separator' },
        {
          label: 'Herramientas de Desarrollo',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ──────────────────────────────────────────────
// 4. IPC: Handle folder scan triggered from menu
// ──────────────────────────────────────────────
ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona la carpeta con tus series (MP4, MKV, WEBM)',
    properties: ['openDirectory'],
    buttonLabel: 'Escanear esta carpeta'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Reportar un error: se abre en el navegador del sistema (no en una ventana de la app).
// Solo páginas de este repositorio: la interfaz no puede abrir cualquier dirección.
const GITHUB_REPO_URL = 'https://github.com/itsvnzla/hiy-series/';
ipcMain.handle('open-github', async (_event, url) => {
  if (typeof url !== 'string' || !url.startsWith(GITHUB_REPO_URL)) return false;
  await shell.openExternal(url);
  return true;
});

// ──────────────────────────────────────────────
// 5. App Lifecycle
// ──────────────────────────────────────────────
// Una sola instancia: si la app ya está abierta, se trae al frente en vez de abrir otra
// (la segunda no podría usar el puerto 3000)
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      // También si seguía oculta (no llegó a mostrarse al arrancar)
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// El servidor arranca en cuanto se ejecuta main.js, en paralelo con Electron
const serverReady = app.hasSingleInstanceLock()
  ? startServer().catch(err => console.error('[Server] No se pudo iniciar:', err))
  : Promise.resolve();

app.whenReady().then(() => {
  if (!app.hasSingleInstanceLock()) return;
  console.log('Starting HIY Series...');
  createWindow(serverReady);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill the Express server when the window closes
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
