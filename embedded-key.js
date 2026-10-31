/* ==========================================================================
   CLAVE DE TMDB INCLUIDA EN LA APP
   Al compilar (npm run build → scripts/embed-tmdb-key.js) la clave se cifra y se guarda en
   assets/data.bin, que va dentro del instalador: así la app trae TMDB funcionando en
   cualquier PC sin que nadie tenga que poner su clave. Ese archivo no se sube a GitHub.
   Ojo: es una ofuscación. La app tiene que poder descifrarla sola, así que alguien con
   tiempo podría sacarla del instalador; solo evita que se lea a simple vista.
   ========================================================================== */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'assets', 'data.bin');
const SECRET = crypto.createHash('sha256').update('hiy-series/tmdb/v1').digest();

// [iv (12) | tag (16) | datos cifrados]
function encode(key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SECRET, iv);
  const data = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

function decode(buf) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', SECRET, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

let cached;
// La clave incluida al compilar, o '' si no hay (o el archivo está dañado)
function readEmbeddedKey() {
  if (cached === undefined) {
    try {
      cached = fs.existsSync(FILE) ? decode(fs.readFileSync(FILE)).trim() : '';
    } catch {
      cached = '';
    }
  }
  return cached;
}

function writeEmbeddedKey(key) {
  fs.writeFileSync(FILE, encode(key));
}

function removeEmbeddedKey() {
  fs.rmSync(FILE, { force: true });
}

module.exports = { readEmbeddedKey, writeEmbeddedKey, removeEmbeddedKey, FILE };
