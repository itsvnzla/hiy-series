/* ==========================================================================
   FOTOGRAMAS CLAVE (MP4 y MKV/WebM)
   Al saltar a un punto cualquiera el navegador decodifica desde el fotograma clave
   anterior (hasta ~5 s de video: ≈1 s de espera). Si el salto cae justo en un fotograma
   clave, la imagen aparece en ~20 ms. Aquí se leen sus tiempos del índice del archivo,
   sin decodificar nada:
     - MP4: moov → trak de video → stss/stts/ctts/elst
     - MKV/WebM: SeekHead → Cues (CueTime de la pista de video) + TimestampScale
   ========================================================================== */

const fs = require('fs');

const MAX_MOOV = 64 * 1024 * 1024; // un índice más grande no es normal
const cache = new Map(); // "ruta|tamaño|fecha" → tiempos en segundos (o null)

function readBox(buf, pos) {
  let size = buf.readUInt32BE(pos);
  const type = buf.toString('latin1', pos + 4, pos + 8);
  let header = 8;
  if (size === 1) {
    size = Number(buf.readBigUInt64BE(pos + 8));
    header = 16;
  } else if (size === 0) {
    size = buf.length - pos;
  }
  return { type, start: pos + header, end: pos + size };
}

// Hijos de una caja: [{ type, start, end }]
function children(buf, start, end) {
  const out = [];
  for (let pos = start; pos + 8 <= end;) {
    const box = readBox(buf, pos);
    if (box.end <= pos || box.end > end) break;
    out.push(box);
    pos = box.end;
  }
  return out;
}

const child = (buf, box, type) => children(buf, box.start, box.end).find(b => b.type === type);

// Busca la caja "moov" en el archivo y la lee entera (puede ir al principio o al final)
function readMoov(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const head = Buffer.alloc(16);
    for (let pos = 0; pos + 8 <= size;) {
      fs.readSync(fd, head, 0, 16, pos);
      let len = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      else if (len === 0) len = size - pos;
      if (len < 8) return null;
      if (type === 'moov') {
        if (len > MAX_MOOV) return null;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, pos);
        return buf;
      }
      pos += len;
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

// Tiempos de presentación (s) de los fotogramas clave de la pista de video
function parseKeyframes(moov) {
  const root = readBox(moov, 0);
  for (const trak of children(moov, root.start, root.end).filter(b => b.type === 'trak')) {
    const mdia = child(moov, trak, 'mdia');
    const hdlr = mdia && child(moov, mdia, 'hdlr');
    if (!hdlr || moov.toString('latin1', hdlr.start + 8, hdlr.start + 12) !== 'vide') continue;

    const mdhd = child(moov, mdia, 'mdhd');
    const timescale = moov.readUInt32BE(mdhd.start + (moov[mdhd.start] === 1 ? 20 : 12));
    const minf = child(moov, mdia, 'minf');
    const stbl = minf && child(moov, minf, 'stbl');
    if (!stbl || !timescale) return null;
    const stts = child(moov, stbl, 'stts');
    const stss = child(moov, stbl, 'stss');
    const ctts = child(moov, stbl, 'ctts');
    if (!stts || !stss) return null; // sin stss todos los fotogramas son clave: no hace falta

    // Desplazamiento de la lista de edición (el video puede empezar después del tiempo 0)
    let editShift = 0;
    const edts = child(moov, trak, 'edts');
    const elst = edts && child(moov, edts, 'elst');
    if (elst) {
      // Primera entrada con contenido (media_time = -1 es un tramo vacío)
      const v1 = moov[elst.start] === 1;
      const entries = moov.readUInt32BE(elst.start + 4);
      for (let i = 0, p = elst.start + 8; i < entries; i++, p += v1 ? 20 : 12) {
        const mediaTime = v1 ? Number(moov.readBigInt64BE(p + 8)) : moov.readInt32BE(p + 4);
        if (mediaTime !== -1) {
          editShift = mediaTime;
          break;
        }
      }
    }

    const syncCount = moov.readUInt32BE(stss.start + 4);
    const sync = new Set();
    for (let i = 0; i < syncCount; i++) sync.add(moov.readUInt32BE(stss.start + 8 + i * 4));

    // Corridas de ctts (desfase de presentación por fotogramas B)
    const cttsRuns = [];
    if (ctts) {
      const n = moov.readUInt32BE(ctts.start + 4);
      for (let i = 0; i < n; i++) {
        cttsRuns.push([moov.readUInt32BE(ctts.start + 8 + i * 8), moov.readInt32BE(ctts.start + 12 + i * 8)]);
      }
    }

    const times = [];
    let sample = 1, dts = 0, cRun = 0, cLeft = cttsRuns.length ? cttsRuns[0][0] : 0;
    const sttsCount = moov.readUInt32BE(stts.start + 4);
    for (let i = 0; i < sttsCount; i++) {
      const count = moov.readUInt32BE(stts.start + 8 + i * 8);
      const delta = moov.readUInt32BE(stts.start + 12 + i * 8);
      for (let j = 0; j < count; j++, sample++) {
        const offset = cttsRuns.length ? cttsRuns[cRun][1] : 0;
        if (sync.has(sample)) times.push(Math.max(0, (dts + offset - editShift) / timescale));
        dts += delta;
        if (cttsRuns.length && --cLeft === 0 && cRun < cttsRuns.length - 1) cLeft = cttsRuns[++cRun][0];
      }
    }
    return times.sort((a, b) => a - b);
  }
  return null;
}

/* ---------------- MKV / WebM (EBML) ---------------- */

const EBML = {
  Segment: 0x18538067, SeekHead: 0x114d9b74, Seek: 0x4dbb, SeekID: 0x53ab, SeekPosition: 0x53ac,
  Info: 0x1549a966, TimestampScale: 0x2ad7b1, Tracks: 0x1654ae6b, TrackEntry: 0xae,
  TrackNumber: 0xd7, TrackType: 0x83, Cues: 0x1c53bb6b, CuePoint: 0xbb, CueTime: 0xb3,
  CueTrackPositions: 0xb7, CueTrack: 0xf7
};

// ID de elemento: 1–4 bytes, se conserva el bit marcador
function readId(buf, pos) {
  const first = buf[pos];
  const len = first >= 0x80 ? 1 : first >= 0x40 ? 2 : first >= 0x20 ? 3 : first >= 0x10 ? 4 : 0;
  if (!len || pos + len > buf.length) return null;
  let id = 0;
  for (let i = 0; i < len; i++) id = id * 256 + buf[pos + i];
  return { id, len };
}

// Tamaño: 1–8 bytes sin el bit marcador; todo unos = desconocido (hasta el final)
function readSize(buf, pos) {
  const first = buf[pos];
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
  if (len > 8 || pos + len > buf.length) return null;
  let value = first & (0xff >> len);
  let allOnes = value === (0xff >> len);
  for (let i = 1; i < len; i++) {
    value = value * 256 + buf[pos + i];
    if (buf[pos + i] !== 0xff) allOnes = false;
  }
  return { value: allOnes ? Infinity : value, len };
}

// Elementos hijos dentro de buf[start, end)
function ebmlChildren(buf, start, end) {
  const out = [];
  for (let pos = start; pos < end;) {
    const id = readId(buf, pos);
    const size = id && readSize(buf, pos + id.len);
    if (!id || !size) break;
    const dataStart = pos + id.len + size.len;
    const dataEnd = Math.min(end, size.value === Infinity ? end : dataStart + size.value);
    out.push({ id: id.id, start: dataStart, end: dataEnd });
    pos = dataEnd;
  }
  return out;
}

const uint = (buf, el) => {
  let v = 0;
  for (let i = el.start; i < el.end; i++) v = v * 256 + buf[i];
  return v;
};

// Lee el elemento completo que empieza en `pos` del archivo: { id, data }
function readElementAt(fd, pos, maxBytes) {
  const head = Buffer.alloc(12);
  fs.readSync(fd, head, 0, 12, pos);
  const id = readId(head, 0);
  const size = id && readSize(head, id.len);
  if (!id || !size || size.value === Infinity || size.value > maxBytes) return null;
  const data = Buffer.alloc(size.value);
  fs.readSync(fd, data, 0, size.value, pos + id.len + size.len);
  return { id: id.id, data };
}

function mkvKeyframes(file) {
  const fd = fs.openSync(file, 'r');
  try {
    // Cabecera EBML + comienzo del Segment
    const head = Buffer.alloc(64 * 1024);
    const got = fs.readSync(fd, head, 0, head.length, 0);
    const top = ebmlChildren(head.subarray(0, got), 0, got);
    const segment = top.find(e => e.id === EBML.Segment);
    if (!segment) return null;
    const segStart = segment.start; // las posiciones del SeekHead son relativas a aquí

    // SeekHead(s): dónde están Info, Tracks y Cues
    const where = {};
    const readSeekHead = (buf, el) => {
      for (const seek of ebmlChildren(buf, el.start, el.end).filter(e => e.id === EBML.Seek)) {
        const parts = ebmlChildren(buf, seek.start, seek.end);
        const idEl = parts.find(e => e.id === EBML.SeekID);
        const posEl = parts.find(e => e.id === EBML.SeekPosition);
        if (idEl && posEl) where[uint(buf, idEl)] = where[uint(buf, idEl)] ?? segStart + uint(buf, posEl);
      }
    };
    for (const el of ebmlChildren(head.subarray(0, got), segStart, got)) {
      if (el.id === EBML.SeekHead) readSeekHead(head, el);
      if (el.id === 0x1f43b675) break; // primer Cluster: ya no hay cabeceras
    }
    // mkvmerge a veces deja un segundo SeekHead (con Cues) al final del archivo
    if (!where[EBML.Cues] && where[EBML.SeekHead]) {
      const extra = readElementAt(fd, where[EBML.SeekHead], 1024 * 1024);
      if (extra && extra.id === EBML.SeekHead) readSeekHead(extra.data, { start: 0, end: extra.data.length });
    }
    if (!where[EBML.Cues]) return null; // sin índice: los saltos van al punto exacto

    let scale = 1e6; // ns por tick (valor por defecto)
    const info = where[EBML.Info] && readElementAt(fd, where[EBML.Info], 1024 * 1024);
    if (info && info.id === EBML.Info) {
      const ts = ebmlChildren(info.data, 0, info.data.length).find(e => e.id === EBML.TimestampScale);
      if (ts) scale = uint(info.data, ts);
    }

    // Pista de video (los Cues pueden incluir también puntos de audio o subtítulos)
    let videoTrack = null;
    const tracks = where[EBML.Tracks] && readElementAt(fd, where[EBML.Tracks], 4 * 1024 * 1024);
    if (tracks && tracks.id === EBML.Tracks) {
      for (const entry of ebmlChildren(tracks.data, 0, tracks.data.length).filter(e => e.id === EBML.TrackEntry)) {
        const f = ebmlChildren(tracks.data, entry.start, entry.end);
        const type = f.find(e => e.id === EBML.TrackType);
        const num = f.find(e => e.id === EBML.TrackNumber);
        if (type && num && uint(tracks.data, type) === 1) { videoTrack = uint(tracks.data, num); break; }
      }
    }

    const cues = readElementAt(fd, where[EBML.Cues], MAX_MOOV);
    if (!cues || cues.id !== EBML.Cues) return null;
    const times = [];
    for (const point of ebmlChildren(cues.data, 0, cues.data.length).filter(e => e.id === EBML.CuePoint)) {
      const f = ebmlChildren(cues.data, point.start, point.end);
      const time = f.find(e => e.id === EBML.CueTime);
      if (!time) continue;
      const forVideo = videoTrack === null || f.some(e => e.id === EBML.CueTrackPositions &&
        ebmlChildren(cues.data, e.start, e.end).some(t => t.id === EBML.CueTrack && uint(cues.data, t) === videoTrack));
      if (forVideo) times.push(uint(cues.data, time) * scale / 1e9);
    }
    return times.length ? [...new Set(times)].sort((a, b) => a - b) : null;
  } finally {
    fs.closeSync(fd);
  }
}

/** Tiempos (s) de los fotogramas clave de un MP4/MKV/WebM, o null si no se pueden leer o no aplica. */
function getKeyframes(file) {
  const isMp4 = /\.(mp4|m4v|mov)$/i.test(file);
  const isMkv = /\.(mkv|webm)$/i.test(file);
  if (!isMp4 && !isMkv) return null;
  let key;
  try {
    const st = fs.statSync(file);
    key = `${file}|${st.size}|${st.mtimeMs}`;
  } catch {
    return null;
  }
  if (cache.has(key)) return cache.get(key);
  let times = null;
  try {
    if (isMkv) {
      times = mkvKeyframes(file);
    } else {
      const moov = readMoov(file);
      times = moov ? parseKeyframes(moov) : null;
    }
  } catch (err) {
    console.warn(`[keyframes] No se pudo leer ${file}: ${err.message}`);
  }
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(key, times);
  return times;
}

module.exports = { getKeyframes };
