/* ==========================================================================
   DESCARGA DE MODELOS DE TRADUCCIÓN
   Baja de Hugging Face los modelos Marian (ONNX cuantizados) que usa metadata.js
   para traducir en local. Se guardan en models/ y no se vuelven a bajar si ya están.
   Uso: npm run models (también lo llama scripts/prestart.js antes de npm start)
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const MODELS = ['Xenova/opus-mt-en-es', 'Xenova/opus-mt-es-en'];
const FILES = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx'
];
const MODELS_DIR = path.join(__dirname, '..', 'models');

const targetPath = (model, file) => path.join(MODELS_DIR, model, file);
const exists = (p) => fs.existsSync(p) && fs.statSync(p).size > 0;

// Archivos que todavía faltan, como [modelo, archivo]
function missingFiles() {
  return MODELS.flatMap(m => FILES.map(f => [m, f])).filter(([m, f]) => !exists(targetPath(m, f)));
}

async function download(model, file) {
  const dest = targetPath(model, file);
  const url = `https://huggingface.co/${model}/resolve/main/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const total = Number(res.headers.get('content-length')) || 0;
  const label = `${model}/${file}`;
  let done = 0;
  let lastPct = -1;
  const body = Readable.fromWeb(res.body);
  body.on('data', (chunk) => {
    done += chunk.length;
    const pct = total ? Math.floor(done / total * 100) : -1;
    if (pct !== lastPct && process.stdout.isTTY) {
      lastPct = pct;
      process.stdout.write(`\r↓ ${label} ${pct >= 0 ? pct + '%' : (done / 1048576).toFixed(1) + ' MB'}   `);
    }
  });

  // Se escribe en .part y se renombra: si se corta a medias, se repite
  const tmp = `${dest}.part`;
  await pipeline(body, fs.createWriteStream(tmp));
  fs.renameSync(tmp, dest);
  if (process.stdout.isTTY) process.stdout.write('\r');
  console.log(`✓ ${label} (${(done / 1048576).toFixed(1)} MB)          `);
}

async function downloadModels() {
  const missing = missingFiles();
  if (!missing.length) return;
  console.log(`Descargando modelos de traducción (${missing.length} archivos, ~220 MB la primera vez)...`);
  for (const [model, file] of missing) await download(model, file);
  console.log('Modelos listos en models/');
}

module.exports = { downloadModels, missingFiles };

if (require.main === module) {
  downloadModels().catch((err) => {
    console.error('Error descargando modelos:', err.message);
    process.exit(1);
  });
}
