/* ==========================================================================
   PREPARACIÓN ANTES DE "npm start"
   npm lo ejecuta solo (script "prestart"). Deja todo listo la primera vez:
     1. Dependencias: si falta node_modules (o Electron), corre "npm install".
     2. Modelos de traducción: si faltan, los descarga (scripts/download-models.js).
   Si ya está todo, no hace nada y la app arranca al instante.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// 1. Dependencias (sin ellas la app no puede arrancar: aquí un error sí detiene)
if (!fs.existsSync(path.join(ROOT, 'node_modules', 'electron'))) {
  console.log('Instalando dependencias (solo la primera vez)...');
  execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
}

// 2. Modelos (sin ellos solo falta la traducción: un error avisa pero no detiene)
const { downloadModels } = require('./download-models');
downloadModels().catch((err) => {
  console.warn(`\n⚠ No se pudieron descargar los modelos de traducción: ${err.message}`);
  console.warn('  La app funciona igual, pero sin traducir descripciones. Reintenta con: npm run models\n');
});
