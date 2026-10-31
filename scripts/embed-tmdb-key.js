/* ==========================================================================
   INCLUIR LA CLAVE DE TMDB EN EL INSTALADOR
   npm lo ejecuta solo antes de "npm run build" (script "prebuild"), con Electron.
   Toma la clave de:
     1. La variable de entorno TMDB_API_KEY, o
     2. La que guardaste en la app (data/sys.dat, cifrada con Windows: por eso hace falta
        Electron y la misma carpeta de datos que usa "npm start").
   y la deja cifrada en assets/data.bin (ver embedded-key.js). Sin clave, se compila igual.
   ========================================================================== */

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { writeEmbeddedKey, removeEmbeddedKey, FILE } = require('../embedded-key');

const ROOT = path.join(__dirname, '..');

// La misma carpeta de Electron que "npm start" (ahí está la llave que descifra sys.dat)
const pkg = require('../package.json');
app.setName(pkg.name);
app.setPath('userData', path.join(app.getPath('appData'), pkg.name));

function keyFromApp() {
  const file = path.join(ROOT, 'data', 'sys.dat');
  if (!fs.existsSync(file) || !safeStorage.isEncryptionAvailable()) return '';
  try {
    return safeStorage.decryptString(fs.readFileSync(file)).trim();
  } catch (err) {
    console.warn(`No se pudo leer la clave guardada en la app: ${err.message}`);
    return '';
  }
}

app.whenReady().then(() => {
  const key = (process.env.TMDB_API_KEY || '').trim() || keyFromApp();
  if (key) {
    writeEmbeddedKey(key);
    console.log(`✓ Clave de TMDB incluida en el instalador (••••${key.slice(-4)}) → ${path.relative(ROOT, FILE)}`);
  } else {
    removeEmbeddedKey();
    console.warn('⚠ Sin clave de TMDB: el instalador se compila sin ella (cada usuario puede poner la suya en Configuración).');
  }
  app.quit();
});
