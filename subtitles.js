/* ==========================================================================
   SUBTÍTULOS
   Dos fuentes para cada episodio:
     1. Archivos junto al video: "<nombre>.srt|.vtt" o "<nombre>.<idioma>.srt|.vtt".
        Los .srt se convierten a WebVTT al servirlos.
     2. Uno cargado a mano desde el reproductor. Se guarda en data/subtitles/ (ya en
        WebVTT) y queda asociado al episodio hasta que se quite.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(process.env.HIY_USER_DIR || __dirname, 'data');
const SUBS_DIR = path.join(DATA_DIR, 'subtitles');
// Nombre original de cada subtítulo cargado a mano: { [episodeId]: "archivo.srt" }
const MANUAL_INDEX = path.join(SUBS_DIR, 'manual.json');

const SUBTITLE_EXTS = ['.srt', '.vtt'];
const LANG_LABELS = {
  es: 'Español', spa: 'Español', esp: 'Español', spanish: 'Español', 'es-419': 'Español (Latinoamérica)', lat: 'Español (Latinoamérica)',
  en: 'Inglés', eng: 'Inglés', english: 'Inglés',
  ja: 'Japonés', jpn: 'Japonés', jap: 'Japonés', japanese: 'Japonés',
  pt: 'Portugués', por: 'Portugués', fr: 'Francés', fre: 'Francés', fra: 'Francés'
};

/* ---------------- Archivos junto al video ---------------- */

// Subtítulos con el mismo nombre que el video: "Ep 01.srt", "Ep 01.es.srt", "Ep 01.Spanish.vtt"
function findSidecars(videoPath) {
  if (!videoPath) return [];
  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath)).toLowerCase();
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter(name => {
      const lower = name.toLowerCase();
      return SUBTITLE_EXTS.includes(path.extname(lower)) && lower.startsWith(base + '.');
    })
    .sort()
    .map(name => {
      const tag = name.slice(base.length + 1, -path.extname(name).length).toLowerCase();
      return {
        file: path.join(dir, name),
        lang: tag.split(/[.\s_-]/)[0] || '',
        label: LANG_LABELS[tag] || LANG_LABELS[tag.split(/[.\s_-]/)[0]] || (tag ? tag.toUpperCase() : 'Archivo')
      };
    });
}

// Lee un subtítulo en UTF-8 o, si no lo es, en Windows-1252 (muchos .srt viejos)
function readText(file) {
  const buf = fs.readFileSync(file);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    text = new TextDecoder('windows-1252').decode(buf);
  }
  return text.replace(/^﻿/, '');
}

function srtToVtt(srt) {
  const body = srt
    .replace(/\r\n?/g, '\n')
    // 00:01:02,345 → 00:01:02.345
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

/* ---------------- Subtítulo cargado a mano ---------------- */

function manualFile(episodeId) {
  const key = crypto.createHash('sha1').update(String(episodeId)).digest('hex').slice(0, 16);
  return path.join(SUBS_DIR, `manual-${key}.vtt`);
}

function readManualIndex() {
  try {
    return JSON.parse(fs.readFileSync(MANUAL_INDEX, 'utf8'));
  } catch {
    return {};
  }
}

function writeManualIndex(index) {
  fs.mkdirSync(SUBS_DIR, { recursive: true });
  fs.writeFileSync(MANUAL_INDEX, JSON.stringify(index, null, 2), 'utf8');
}

/** Guarda (o reemplaza) el subtítulo cargado a mano de un episodio. `vtt` ya viene en WebVTT. */
function saveManual(episode, name, vtt) {
  fs.mkdirSync(SUBS_DIR, { recursive: true });
  const file = manualFile(episode.id);
  fs.writeFileSync(`${file}.tmp`, vtt, 'utf8');
  fs.renameSync(`${file}.tmp`, file);
  const index = readManualIndex();
  index[episode.id] = name;
  writeManualIndex(index);
}

function removeManual(episode) {
  fs.rmSync(manualFile(episode.id), { force: true });
  const index = readManualIndex();
  delete index[episode.id];
  writeManualIndex(index);
}

/* ---------------- Pistas ---------------- */

/** Pistas disponibles para un episodio ({ id, localPath }). */
function listTracks(episode) {
  const tracks = findSidecars(episode.localPath).map((s, i) => ({ id: `f${i}`, label: s.label, lang: s.lang, source: 'file' }));
  if (fs.existsSync(manualFile(episode.id))) {
    tracks.push({ id: 'manual', label: readManualIndex()[episode.id] || 'Subtítulo cargado', lang: '', source: 'manual' });
  }
  return { tracks };
}

/** Contenido WebVTT de una pista, o null si no existe. */
function readTrack(episode, id) {
  if (id === 'manual') {
    const file = manualFile(episode.id);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  }
  const sidecar = findSidecars(episode.localPath)[Number(String(id).slice(1))];
  if (!sidecar) return null;
  const text = readText(sidecar.file);
  return path.extname(sidecar.file).toLowerCase() === '.vtt' ? text : srtToVtt(text);
}

module.exports = { listTracks, readTrack, saveManual, removeManual };
