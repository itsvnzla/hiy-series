/* ==========================================================================
   AUDIO QUE EL REPRODUCTOR NO PUEDE LEER
   El reproductor (motor de Chrome) no decodifica AC3, E-AC3 (Dolby), DTS ni TrueHD:
   esos videos se ven pero sin sonido. Para ellos el servidor convierte la pista de
   audio elegida a AAC con ffmpeg mientras se reproduce, y el reproductor la suena
   sincronizada con el video (el video se sigue leyendo directo del archivo).
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

// Códecs de audio que Chrome reproduce por sí mismo
const NATIVE_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);
const isNative = (codec) => NATIVE_CODECS.has(codec) || /^pcm_/.test(codec);

const CODEC_NAMES = {
  ac3: 'Dolby Digital (AC3)', eac3: 'Dolby Digital Plus (E-AC3)', truehd: 'Dolby TrueHD',
  dts: 'DTS', aac: 'AAC', mp3: 'MP3', opus: 'Opus', vorbis: 'Vorbis', flac: 'FLAC'
};
const LANG_LABELS = {
  spa: 'Español', es: 'Español', lat: 'Español (Latinoamérica)', 'es-419': 'Español (Latinoamérica)',
  eng: 'Inglés', en: 'Inglés', jpn: 'Japonés', ja: 'Japonés', por: 'Portugués', pt: 'Portugués',
  fra: 'Francés', fre: 'Francés', fr: 'Francés', ita: 'Italiano', it: 'Italiano',
  deu: 'Alemán', ger: 'Alemán', de: 'Alemán', kor: 'Coreano', ko: 'Coreano',
  chi: 'Chino', zho: 'Chino', zh: 'Chino', rus: 'Ruso', ru: 'Ruso'
};

/* ---------------- Dónde está ffmpeg ---------------- */

let binaries = null;

function findBinaries() {
  if (binaries) return binaries;
  const exe = process.platform === 'win32' ? '.exe' : '';
  const dirs = [];
  if (process.env.HIY_FFMPEG_DIR) dirs.push(process.env.HIY_FFMPEG_DIR);
  // ffmpeg incluido con la app (si algún día se agrega el paquete ffmpeg-static)
  try {
    const bundled = require('ffmpeg-static');
    if (bundled) dirs.push(path.dirname(bundled.replace('app.asar', 'app.asar.unpacked')));
  } catch { /* no está instalado */ }
  (process.env.PATH || '').split(path.delimiter).forEach(d => d && dirs.push(d));
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || '';
    dirs.push(
      path.join(local, 'Programs', 'ffmpeg', 'bin'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ffmpeg', 'bin'),
      'C:\\ffmpeg\\bin'
    );
  }
  const find = (name) => {
    for (const d of dirs) {
      const p = path.join(d, name + exe);
      if (fs.existsSync(p)) return p;
    }
    return null;
  };
  binaries = { ffmpeg: find('ffmpeg'), ffprobe: find('ffprobe') };
  if (!binaries.ffmpeg) console.warn('[Audio] No se encontró ffmpeg: los videos con audio Dolby/DTS se verán sin sonido.');
  return binaries;
}

/* ---------------- Pistas de audio de un video ---------------- */

const probeCache = new Map(); // ruta → { mtime, tracks }

// Los títulos de pista suelen traer publicidad ("www.sitio.com"): esos no se muestran
const usefulTitle = (t) => t && !/www\.|https?:|\.(com|net|org|ac|io)\b/i.test(t);

function probe(filePath) {
  return new Promise((resolve) => {
    const { ffprobe } = findBinaries();
    if (!ffprobe) return resolve(null);
    let mtime = 0;
    try { mtime = fs.statSync(filePath).mtimeMs; } catch { return resolve(null); }
    const cached = probeCache.get(filePath);
    if (cached && cached.mtime === mtime) return resolve(cached.tracks);

    execFile(ffprobe, [
      '-v', 'error', '-select_streams', 'a',
      '-show_entries', 'stream=codec_name,channels:stream_tags=language,title:stream_disposition=default',
      '-of', 'json', filePath
    ], { timeout: 15000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      let streams = [];
      try { streams = JSON.parse(stdout).streams || []; } catch { return resolve(null); }
      const tracks = streams.map((s, n) => {
        const lang = String((s.tags && s.tags.language) || '').toLowerCase();
        const title = s.tags && s.tags.title;
        const langLabel = LANG_LABELS[lang] || (usefulTitle(title) ? title : `Pista ${n + 1}`);
        return {
          n,
          codec: s.codec_name,
          codecName: CODEC_NAMES[s.codec_name] || String(s.codec_name || '').toUpperCase(),
          channels: s.channels || 2,
          lang,
          label: langLabel + (s.channels > 2 ? ' 5.1' : ''),
          isDefault: !!(s.disposition && s.disposition.default),
          native: isNative(s.codec_name)
        };
      });
      probeCache.set(filePath, { mtime, tracks });
      resolve(tracks);
    });
  });
}

// Lo que necesita saber el reproductor de un video
async function info(filePath) {
  const { ffmpeg } = findBinaries();
  const tracks = (await probe(filePath)) || [];
  // La pista que el reproductor sonaría por sí mismo: la marcada por defecto, o la primera
  const main = tracks.find(t => t.isDefault) || tracks[0];
  return {
    ffmpeg: !!ffmpeg,
    probed: tracks.length > 0,
    tracks,
    defaultTrack: main ? main.n : 0,
    // Hay que convertir si la pista principal no se puede reproducir
    needsConversion: !!main && !main.native
  };
}

/* ---------------- Conversión en vivo a AAC ---------------- */

function stream(req, res, filePath) {
  const { ffmpeg } = findBinaries();
  if (!ffmpeg) return res.status(501).send('ffmpeg no está instalado');
  const track = Math.max(0, parseInt(req.query.track, 10) || 0);
  const start = Math.max(0, parseFloat(req.query.start) || 0);

  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-ss', start.toFixed(3), '-i', filePath,
    '-map', `0:a:${track}`, '-vn', '-sn', '-dn',
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
    '-f', 'adts', 'pipe:1'
  ];
  const proc = spawn(ffmpeg, args, { windowsHide: true });

  res.writeHead(200, { 'Content-Type': 'audio/aac', 'Cache-Control': 'no-store' });
  proc.stdout.pipe(res);
  proc.stderr.on('data', (d) => console.warn('[Audio] ffmpeg:', String(d).trim()));
  proc.on('error', (err) => { console.error('[Audio] No se pudo iniciar ffmpeg:', err.message); res.end(); });
  // Al saltar a otro momento o cerrar el reproductor se corta la conexión: parar ffmpeg
  const stop = () => { if (proc.exitCode === null) proc.kill('SIGKILL'); };
  req.on('close', stop);
  res.on('close', stop);
}

module.exports = { info, stream, findBinaries };
