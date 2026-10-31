const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const mime = require('mime-types');
const metadata = require('./metadata');
const subtitles = require('./subtitles');
const audio = require('./audio');
const keyframes = require('./keyframes');
const { pipeline } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta con data/ y media/: la del usuario en la app instalada (ver main.js), o la del proyecto
const USER_DIR = process.env.HIY_USER_DIR || __dirname;
const DATA_DIR = path.join(USER_DIR, 'data');

// Solo se aceptan peticiones dirigidas a este PC (localhost:PORT). Evita que una página web
// use "DNS rebinding" para hablar con el servidor como si fuera de su mismo origen.
// Sin cors(): la interfaz se sirve desde aquí mismo, así que no hace falta abrirlo a otros orígenes.
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
app.use((req, res, next) => {
  if (!ALLOWED_HOSTS.has(String(req.headers.host || '').toLowerCase())) {
    return res.status(403).send('Acceso no permitido');
  }
  next();
});
// Límite amplio para poder subir pósteres/banners desde el PC (van en base64 dentro del JSON)
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(path.join(USER_DIR, 'media')));
// Pósteres y banners descargados por metadata.js. El nombre cambia si la imagen cambia,
// así que el navegador puede guardarlos sin volver a pedirlos.
app.use('/images', express.static(path.join(DATA_DIR, 'images'), {
  maxAge: '365d',
  immutable: true
}));

const DATA_FILE = path.join(DATA_DIR, 'series.json');
// "Continuar viendo" y Favoritos: uno por perfil (ver progressFile / myListFile más abajo)

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure media directory exists
const MEDIA_DIR = path.join(USER_DIR, 'media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Helper to read JSON
function readJSON(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

// Helper to write JSON
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Ensure initial sample series if empty
function initializeSampleData() {
  const existing = readJSON(DATA_FILE, null);
  if (!existing || !existing.series || existing.series.length === 0) {
    const sampleData = {
      series: [
        {
          id: 'stranger-things',
          title: 'Cyber Chronicles: Neo Tokyo',
          match: '98% Coincidencia',
          rating: '16+',
          year: 2024,
          seasonsCount: 2,
          genres: ['Ciencia Ficción', 'Acción', 'Ciberpunk'],
          description: 'En el año 2088, una investigadora cibernética descubre una señal oculta en la red neuronal de la ciudad que podría cambiar el destino de la humanidad.',
          banner: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
          poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
          cast: ['Elena Rostova', 'Kenji Sato', 'Marcus Vance'],
          creator: 'Alex Rivera',
          featured: true,
          seasons: [
            {
              seasonNumber: 1,
              title: 'Temporada 1',
              episodes: [
                {
                  id: 'ep-cc-s1e1',
                  episodeNumber: 1,
                  title: 'Capítulo 1: El Despertar Digital',
                  duration: '45 min',
                  description: 'Elena investiga la desconexión misteriosa de la Torre Central y tropieza con un código ancestral.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                  format: 'mp4',
                  thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop'
                },
                {
                  id: 'ep-cc-s1e2',
                  episodeNumber: 2,
                  title: 'Capítulo 2: Fantasmas en el Sector 7',
                  duration: '50 min',
                  description: 'Un ciberataque masivo paraliza el transporte y obliga a Elena a aliarse con un hacker clandestino.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
                  format: 'mkv',
                  thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=500&auto=format&fit=crop'
                },
                {
                  id: 'ep-cc-s1e3',
                  episodeNumber: 3,
                  title: 'Capítulo 3: Protocolo Cero',
                  duration: '48 min',
                  description: 'Las corporaciones envían cazadores para silenciar la filtración antes del anochecer.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                  format: 'webm',
                  thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=500&auto=format&fit=crop'
                }
              ]
            },
            {
              seasonNumber: 2,
              title: 'Temporada 2',
              episodes: [
                {
                  id: 'ep-cc-s2e1',
                  episodeNumber: 1,
                  title: 'Capítulo 1: El Abismo Sintético',
                  duration: '52 min',
                  description: 'Nuevas amenazas surgen desde las profundidades del espacio virtual.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                  format: 'mp4',
                  thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop'
                }
              ]
            }
          ]
        },
        {
          id: 'shadow-realm',
          title: 'El Reino de las Sombras',
          match: '95% Coincidencia',
          rating: '18+',
          year: 2023,
          seasonsCount: 1,
          genres: ['Fantasía Épica', 'Misterio', 'Drama'],
          description: 'Cuando los viejos reyes caen, una fuerza mística despierta en el norte amenazando con sumergir al reino en la oscuridad eterna.',
          banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
          poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
          cast: ['Lord Alistair', 'Valeria Stone', 'Doran Frost'],
          creator: 'Samantha Vance',
          featured: false,
          seasons: [
            {
              seasonNumber: 1,
              title: 'Temporada 1',
              episodes: [
                {
                  id: 'ep-rs-s1e1',
                  episodeNumber: 1,
                  title: 'Episodio 1: Invierno de Sangre',
                  duration: '58 min',
                  description: 'Un presagio en el cielo marca el retorno de las bestias olvidadas.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                  format: 'mkv',
                  thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=500&auto=format&fit=crop'
                },
                {
                  id: 'ep-rs-s1e2',
                  episodeNumber: 2,
                  title: 'Episodio 2: La Corona de Cenizas',
                  duration: '55 min',
                  description: 'Traiciones en la corte del rey ponen a prueba la lealtad de la guardia.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                  format: 'webm',
                  thumbnail: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=500&auto=format&fit=crop'
                }
              ]
            }
          ]
        },
        {
          id: 'velocity-drift',
          title: 'Velocity: Código Nocturno',
          match: '99% Coincidencia',
          rating: '13+',
          year: 2024,
          seasonsCount: 1,
          genres: ['Acción', 'Carreras', 'Suspense'],
          description: 'Pilotos clandestinos compiten en las autopistas subterráneas de Los Ángeles mientras investigan un complot tecnológico.',
          banner: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1920&auto=format&fit=crop',
          poster: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=600&auto=format&fit=crop',
          cast: ['Carlos Mendoza', 'Mia Thorne', 'Jax West'],
          creator: 'David Miller',
          featured: false,
          seasons: [
            {
              seasonNumber: 1,
              title: 'Temporada 1',
              episodes: [
                {
                  id: 'ep-vd-s1e1',
                  episodeNumber: 1,
                  title: 'Episodio 1: Octanaje Máximo',
                  duration: '42 min',
                  description: 'La primera carrera de la temporada revela un nuevo competidor con tecnología militar.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                  format: 'mp4',
                  thumbnail: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=500&auto=format&fit=crop'
                }
              ]
            }
          ]
        },
        {
          id: 'deep-space-odyssey',
          title: 'Odisea Estelar: Horizonte 9',
          match: '94% Coincidencia',
          rating: '7+',
          year: 2022,
          seasonsCount: 1,
          genres: ['Ciencia Ficción', 'Aventura'],
          description: 'La tripulación de la nave Artemis navega por agujeros de gusano desconocidos en busca de un nuevo hogar.',
          banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
          poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
          cast: ['Dr. Aris Thorne', 'Sgt. Maya Lin'],
          creator: 'Hisaaki Tanaka',
          featured: false,
          seasons: [
            {
              seasonNumber: 1,
              title: 'Temporada 1',
              episodes: [
                {
                  id: 'ep-dso-s1e1',
                  episodeNumber: 1,
                  title: 'Episodio 1: Salto Hiperespacial',
                  duration: '50 min',
                  description: 'El primer viaje más allá del sistema solar enfrenta una anomalia gravitatoria.',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                  format: 'mp4',
                  thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=500&auto=format&fit=crop'
                }
              ]
            }
          ]
        }
      ]
    };
    writeJSON(DATA_FILE, sampleData);
  }
}

initializeSampleData();

// API Routes

// Con la app en inglés, el título y la descripción se envían en inglés (series.en), salvo los
// que el usuario escribió a mano: esos se ven igual en los dos idiomas. En series.json no cambia nada.
function localizeSeries(series) {
  if (!series || !series.en || readJSON(CONFIG_FILE, {}).language !== 'en') return series;
  const locked = series.lockedFields || [];
  return {
    ...series,
    title: !locked.includes('title') && series.en.title ? series.en.title : series.title,
    description: !locked.includes('description') && series.en.description ? series.en.description : series.description
  };
}

// Get all series
app.get('/api/series', (req, res) => {
  const data = readJSON(DATA_FILE, { series: [] });
  res.json(data.series.map(localizeSeries));
});

// Get single series
app.get('/api/series/:id', (req, res) => {
  const data = readJSON(DATA_FILE, { series: [] });
  const series = data.series.find(s => s.id === req.params.id);
  if (!series) {
    return res.status(404).json({ error: 'Serie no encontrada' });
  }
  res.json(localizeSeries(series));
});

// Editar una serie a mano (título, descripción, géneros, póster, banner).
// Body: { edits: { campo: valor, ... }, reset: ['campo', ...], research: true|false }
// Los campos editados quedan bloqueados: las búsquedas y traducciones automáticas no los cambian.
// Los de "reset" vuelven a ser automáticos.
// research: buscar de nuevo la información usando el título nuevo (descripción, póster, banner...).
app.put('/api/series/:id', async (req, res) => {
  const { edits = {}, reset = [], research = false } = req.body || {};
  const data = readJSON(DATA_FILE, { series: [] });
  const idx = data.series.findIndex(s => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Serie no encontrada' });
  }

  try {
    // Buscar con el título nuevo: el título no se bloquea, para que tome el nombre oficial
    const searching = research && typeof edits.title === 'string' && edits.title.trim();
    const query = searching ? edits.title.trim() : null;
    const editsToSave = { ...edits };
    const resetList = [...reset];
    if (searching) {
      delete editsToSave.title;
      resetList.push('title');
    } else if (typeof editsToSave.title === 'string' && !metadata.isAnimeSeries(data.series[idx])) {
      // Título escrito en inglés → se guarda en español (en el anime se respeta tal cual)
      editsToSave.title = await metadata.titleInSpanish(editsToSave.title, { forUser: true });
    }

    const { series, needsRefresh } = await metadata.applyUserEdits(data.series[idx], editsToSave, resetList);
    // Volver a leer antes de guardar (la búsqueda automática pudo escribir mientras tanto)
    const fresh = readJSON(DATA_FILE, { series: [] });
    const freshIdx = fresh.series.findIndex(s => s.id === req.params.id);
    fresh.series[freshIdx === -1 ? idx : freshIdx] = series;
    writeJSON(DATA_FILE, fresh);

    // Buscar de nuevo con el título nuevo y responder con la información encontrada
    if (searching) {
      const { series: researched, match } = await metadata.researchSeries(DATA_FILE, series.id, query, { titleIfNotFound: query });
      return res.json({
        success: true,
        series: localizeSeries(researched),
        research: {
          found: !!match,
          matchedTitle: match ? match.title : null,
          year: match ? match.year : null,
          source: match ? match.source : null
        }
      });
    }

    // Algún campo volvió a ser automático: recuperar su valor (desde la caché)
    if (needsRefresh) metadata.startRefresh(DATA_FILE, { ids: [series.id], revisit: true });

    res.json({ success: true, series: localizeSeries(series), refreshing: needsRefresh });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Miniatura real de un episodio (un fotograma capturado del video en la app).
// Body: { seriesId, episodeId, dataUrl: "data:image/jpeg;base64,..." }
// Se guarda en data/images/thumbs y queda en el episodio para no volver a capturarla.
app.post('/api/thumbnails', (req, res) => {
  const { seriesId, episodeId, dataUrl } = req.body || {};
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!seriesId || !episodeId || !m) {
    return res.status(400).json({ error: 'Datos de miniatura no válidos' });
  }
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'Miniatura demasiado grande' });
  }

  const data = readJSON(DATA_FILE, { series: [] });
  const series = data.series.find(s => s.id === seriesId);
  const episode = series && (series.seasons || []).flatMap(sn => sn.episodes || []).find(ep => ep.id === episodeId);
  if (!episode) {
    return res.status(404).json({ error: 'Episodio no encontrado' });
  }

  // Nombre de archivo estable a partir del id del episodio
  let h = 5381;
  for (let i = 0; i < episodeId.length; i++) h = ((h << 5) + h + episodeId.charCodeAt(i)) >>> 0;
  const dir = path.join(DATA_DIR, 'images', 'thumbs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = `${String(seriesId).replace(/[^a-z0-9-]/gi, '-').slice(0, 50)}-${h.toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(dir, file), buffer);

  episode.thumbnail = `/images/thumbs/${file}`;
  writeJSON(DATA_FILE, data);
  res.json({ success: true, thumbnail: episode.thumbnail });
});

/* ---------- Perfiles (data/config.json → profiles) ----------
   Cada perfil tiene su nombre, color, idioma y preferencias de reproducción, y su propio
   "Continuar viendo" y Favoritos en data/profiles/<id>/. La biblioteca de series es común.
   El perfil elegido queda en config.activeProfileId (la app es de una sola ventana). */
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');

// Primera vez en la app instalada: el idioma elegido en el instalador (ver main.js)
if (process.env.HIY_DEFAULT_LANG === 'es' || process.env.HIY_DEFAULT_LANG === 'en') {
  const cfg = readJSON(CONFIG_FILE, {});
  if (!cfg.language && !(cfg.profiles || []).length) {
    cfg.language = process.env.HIY_DEFAULT_LANG;
    writeJSON(CONFIG_FILE, cfg);
  }
}
const PROFILE_COLORS = ['#E50914', '#2563EB', '#16A34A', '#9333EA', '#EA580C', '#DB2777', '#0891B2', '#CA8A04'];
const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const MAX_PROFILES = 5;

function getProfiles(cfg = readJSON(CONFIG_FILE, {})) {
  return Array.isArray(cfg.profiles) ? cfg.profiles : [];
}

function activeProfile(cfg = readJSON(CONFIG_FILE, {})) {
  const list = getProfiles(cfg);
  return list.find(p => p.id === cfg.activeProfileId) || list[0] || null;
}

// Copia el idioma del perfil activo a config.language (lo usa metadata.js)
function saveConfig(cfg) {
  const p = activeProfile(cfg);
  if (p) {
    cfg.activeProfileId = p.id;
    cfg.language = p.language === 'en' ? 'en' : 'es';
  }
  writeJSON(CONFIG_FILE, cfg);
}

// Archivo del perfil activo; sin perfiles, los de siempre (data/progress.json, data/mylist.json)
function profileFile(name) {
  const p = activeProfile();
  if (!p) return path.join(DATA_DIR, name);
  const dir = path.join(PROFILES_DIR, p.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}
const progressFile = () => profileFile('progress.json');
const myListFile = () => profileFile('mylist.json');

function publicProfile(p) {
  return {
    id: p.id,
    name: p.name,
    color: PROFILE_COLORS.includes(p.color) ? p.color : PROFILE_COLORS[0],
    language: p.language === 'en' ? 'en' : 'es',
    photo: p.photo || null
  };
}

/**
 * Foto del perfil: value = "data:image/...;base64,..." (la app ya la recorta cuadrada y la achica)
 * o null / '' para quitarla. Se guarda en data/profiles/<id>/avatar-<n>.<ext>; el nombre cambia
 * con cada foto nueva para que el navegador no muestre la anterior.
 */
function saveProfilePhoto(profile, value) {
  const dir = path.join(PROFILES_DIR, profile.id);
  const removeOld = () => {
    if (profile.photoFile) {
      try { fs.unlinkSync(path.join(dir, profile.photoFile)); } catch (_) { /* ya no estaba */ }
    }
  };
  if (value === null || value === '') {
    removeOld();
    delete profile.photo;
    delete profile.photoFile;
    return;
  }
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(value));
  if (!m) throw new Error('Formato de imagen no válido');
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) throw new Error('La foto pesa demasiado (máx. 2 MB)');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = `avatar-${Date.now().toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(dir, file), buffer);
  removeOld();
  profile.photoFile = file;
  profile.photo = `/api/profiles/${profile.id}/photo/${file}`;
}

app.get('/api/profiles/:id/photo/:file', (req, res) => {
  const { id, file } = req.params;
  if (!/^[a-z0-9]+$/i.test(id) || !/^avatar-[a-z0-9]+\.(jpg|png|webp)$/i.test(file)) {
    return res.status(400).end();
  }
  const full = path.join(PROFILES_DIR, id, file);
  if (!fs.existsSync(full)) return res.status(404).end();
  // El nombre cambia con cada foto: se puede guardar en caché para siempre
  res.sendFile(full, { maxAge: '365d', immutable: true });
});

// Valida nombre y color de un perfil (al crearlo o editarlo)
function readProfileInput(body, list, ownId = null) {
  const out = {};
  if (typeof body.name === 'string' || !ownId) {
    const name = String(body.name || '').trim().slice(0, 24);
    if (!name) throw new Error('El nombre del perfil no puede estar vacío');
    if (list.some(p => p.id !== ownId && p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Ya hay un perfil con ese nombre');
    }
    out.name = name;
  }
  if (PROFILE_COLORS.includes(body.color)) out.color = body.color;
  if (body.language === 'es' || body.language === 'en') out.language = body.language;
  return out;
}

app.get('/api/profiles', (req, res) => {
  const cfg = readJSON(CONFIG_FILE, {});
  const active = activeProfile(cfg);
  const list = getProfiles(cfg);
  res.json({
    profiles: list.map(publicProfile),
    activeId: active ? active.id : null,
    // Perfil con el que se inicia siempre (sin preguntar "¿Quién está viendo?"), o null
    defaultId: list.some(p => p.id === cfg.defaultProfileId) ? cfg.defaultProfileId : null,
    colors: PROFILE_COLORS,
    max: MAX_PROFILES,
    // Para proponer nombre y color en el primer perfil (configuración de antes de los perfiles)
    suggested: { name: (cfg.profile && cfg.profile.name) || '', color: (cfg.profile && cfg.profile.color) || PROFILE_COLORS[0] },
    // Idioma de la app sin perfiles todavía (p. ej. el elegido en el instalador)
    language: cfg.language === 'en' || cfg.language === 'es' ? cfg.language : null
  });
});

// Body: { name, color, language }
app.post('/api/profiles', (req, res) => {
  const cfg = readJSON(CONFIG_FILE, {});
  const list = getProfiles(cfg);
  if (list.length >= MAX_PROFILES) return res.status(400).json({ error: `Máximo ${MAX_PROFILES} perfiles` });
  let input;
  try { input = readProfileInput(req.body || {}, list); } catch (err) { return res.status(400).json({ error: err.message }); }

  const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const isFirst = list.length === 0;
  const profile = {
    id,
    name: input.name,
    // Sin color elegido: el primero que no use otro perfil
    color: input.color || PROFILE_COLORS.find(c => !list.some(p => p.color === c)) || PROFILE_COLORS[0],
    language: input.language || (cfg.language === 'en' ? 'en' : 'es'),
    // El primer perfil hereda las preferencias de antes de que existieran los perfiles
    playback: isFirst && cfg.playback ? cfg.playback : {}
  };
  const dir = path.join(PROFILES_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  if (req.body && req.body.photo) {
    try {
      saveProfilePhoto(profile, req.body.photo);
    } catch (err) {
      fs.rmSync(dir, { recursive: true, force: true });
      return res.status(400).json({ error: err.message });
    }
  }
  if (isFirst) {
    // ...y su "Continuar viendo" y sus Favoritos
    for (const name of ['progress.json', 'mylist.json']) {
      const legacy = path.join(DATA_DIR, name);
      if (fs.existsSync(legacy)) {
        try { fs.renameSync(legacy, path.join(dir, name)); } catch (err) { console.error(`No se pudo mover ${name}:`, err); }
      }
    }
    delete cfg.profile;
    delete cfg.playback;
    cfg.activeProfileId = id;
  }
  cfg.profiles = [...list, profile];
  saveConfig(cfg);
  res.json({ success: true, profile: publicProfile(profile), activeId: activeProfile(cfg).id });
});

app.put('/api/profiles/:id', (req, res) => {
  const cfg = readJSON(CONFIG_FILE, {});
  const list = getProfiles(cfg);
  const profile = list.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
  try {
    Object.assign(profile, readProfileInput(req.body || {}, list, profile.id));
    // photo: foto nueva (data URL) o null para quitarla; sin el campo, no cambia
    if (req.body && 'photo' in req.body) saveProfilePhoto(profile, req.body.photo);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  saveConfig(cfg);
  res.json({ success: true, profile: publicProfile(profile) });
});

app.delete('/api/profiles/:id', (req, res) => {
  const cfg = readJSON(CONFIG_FILE, {});
  const list = getProfiles(cfg);
  if (!list.some(p => p.id === req.params.id)) return res.status(404).json({ error: 'Perfil no encontrado' });
  if (list.length === 1) return res.status(400).json({ error: 'No se puede borrar el único perfil' });
  cfg.profiles = list.filter(p => p.id !== req.params.id);
  if (cfg.activeProfileId === req.params.id) cfg.activeProfileId = cfg.profiles[0].id;
  if (cfg.defaultProfileId === req.params.id) delete cfg.defaultProfileId;
  saveConfig(cfg);
  // Su "Continuar viendo" y sus Favoritos (el id solo tiene letras y números)
  if (/^[a-z0-9]+$/i.test(req.params.id)) {
    try { fs.rmSync(path.join(PROFILES_DIR, req.params.id), { recursive: true, force: true }); } catch (err) {
      console.error('No se pudo borrar la carpeta del perfil:', err);
    }
  }
  res.json({ success: true, activeId: cfg.activeProfileId });
});

// Perfil de inicio. Body: { id } para iniciar siempre con ese perfil, { id: null } para
// volver a preguntar "¿Quién está viendo?" al abrir la app
app.put('/api/profiles-default', (req, res) => {
  const cfg = readJSON(CONFIG_FILE, {});
  const id = req.body && req.body.id;
  if (id) {
    if (!getProfiles(cfg).some(p => p.id === id)) return res.status(404).json({ error: 'Perfil no encontrado' });
    cfg.defaultProfileId = id;
  } else {
    delete cfg.defaultProfileId;
  }
  saveConfig(cfg);
  res.json({ success: true, defaultId: cfg.defaultProfileId || null });
});

// Elegir con qué perfil se usa la app
app.post('/api/profiles/:id/select', (req, res) => {
  const cfg = readJSON(CONFIG_FILE, {});
  const profile = getProfiles(cfg).find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
  cfg.activeProfileId = profile.id;
  saveConfig(cfg);
  res.json({ success: true, profile: publicProfile(profile) });
});

// Save progress endpoint
app.post('/api/progress', (req, res) => {
  const { episodeId, currentTime, duration } = req.body;
  if (!episodeId) {
    return res.status(400).json({ error: 'episodeId es requerido' });
  }
  const file = progressFile();
  const progressData = readJSON(file, {});
  progressData[episodeId] = {
    currentTime,
    duration,
    percentage: Math.round((currentTime / duration) * 100) || 0,
    updatedAt: new Date().toISOString()
  };
  writeJSON(file, progressData);
  res.json({ success: true, progress: progressData[episodeId] });
});

// Get progress endpoint
app.get('/api/progress', (req, res) => {
  res.json(readJSON(progressFile(), {}));
});

// Borrar todo el historial de reproducción ("Continuar viendo") del perfil activo
app.delete('/api/progress', (req, res) => {
  writeJSON(progressFile(), {});
  res.json({ success: true });
});

/* ---------- Configuración ---------- */
// Del perfil activo: nombre, color, idioma y reproducción. Comunes: títulos en español y TMDB.
// (la clave de TMDB nunca sale entera)
function publicSettings() {
  const cfg = readJSON(CONFIG_FILE, {});
  const prof = activeProfile(cfg);
  const p = prof || cfg.profile || {};
  const pb = (prof ? prof.playback : cfg.playback) || {};
  // La del usuario; si no hay, se usa la incluida en la app al compilar (no se muestra)
  const key = metadata.getUserTmdbKey();
  return {
    profile: {
      id: prof ? prof.id : null,
      name: p.name || 'Perfil Principal',
      color: PROFILE_COLORS.includes(p.color) ? p.color : PROFILE_COLORS[0],
      photo: (prof && prof.photo) || null
    },
    playback: {
      autoplayNext: pb.autoplayNext !== false,
      speed: PLAYBACK_SPEEDS.includes(pb.speed) ? pb.speed : 1,
      volume: Number.isFinite(pb.volume) ? Math.min(1, Math.max(0, pb.volume)) : 1
    },
    library: {
      translateTitles: cfg.translateTitles !== false
    },
    language: (prof ? prof.language : cfg.language) === 'en' ? 'en' : 'es',
    tmdb: {
      hasKey: !!key,
      fromEnv: !!process.env.TMDB_API_KEY,
      builtIn: !key && !!metadata.getTmdbKey(),
      hint: key ? `••••${key.slice(-4)}` : ''
    },
    colors: PROFILE_COLORS,
    speeds: PLAYBACK_SPEEDS
  };
}

app.get('/api/settings', (req, res) => {
  res.json(publicSettings());
});

// Body (todo opcional): { profile: { name, color }, playback: { autoplayNext, speed, volume },
//                         library: { translateTitles }, language: 'es' | 'en',
//                         tmdbApiKey: 'clave' | '' (quitarla) }
app.put('/api/settings', async (req, res) => {
  const { profile, playback, library, tmdbApiKey, language } = req.body || {};
  const cfg = readJSON(CONFIG_FILE, {});
  // Sin perfiles todavía, se guarda como antes (config.profile / config.playback / config.language)
  const prof = activeProfile(cfg);
  let tmdbChanged = false;

  if (profile) {
    const target = prof || (cfg.profile = { ...(cfg.profile || {}) });
    try {
      Object.assign(target, readProfileInput({ name: profile.name, color: profile.color }, getProfiles(cfg), prof ? prof.id : 'legacy'));
      // Foto (solo con perfiles: se guarda en la carpeta del perfil)
      if (prof && 'photo' in profile) saveProfilePhoto(prof, profile.photo);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  if (playback) {
    const pb = { ...((prof ? prof.playback : cfg.playback) || {}) };
    if (typeof playback.autoplayNext === 'boolean') pb.autoplayNext = playback.autoplayNext;
    if (PLAYBACK_SPEEDS.includes(playback.speed)) pb.speed = playback.speed;
    if (Number.isFinite(playback.volume)) pb.volume = Math.min(1, Math.max(0, playback.volume));
    if (prof) prof.playback = pb; else cfg.playback = pb;
  }
  if (library && typeof library.translateTitles === 'boolean') {
    cfg.translateTitles = library.translateTitles;
  }
  // Idioma de la app: 'es' | 'en' (de cada perfil)
  if (language === 'es' || language === 'en') {
    if (prof) prof.language = language; else cfg.language = language;
  }
  if (typeof tmdbApiKey === 'string') {
    const key = tmdbApiKey.trim();
    if (key && !/^[A-Za-z0-9._-]{20,400}$/.test(key)) {
      return res.status(400).json({ error: 'La clave de TMDB no tiene un formato válido' });
    }
    tmdbChanged = key !== metadata.getUserTmdbKey();
    if (SECRET_STORE) {
      // Cifrada en su propio archivo (main.js), nunca en config.json
      if (tmdbChanged) {
        if (!(await saveTmdbKey(key))) {
          return res.status(500).json({ error: 'No se pudo guardar la clave de TMDB cifrada' });
        }
        metadata.setTmdbKey(key);
      }
      delete cfg.tmdbApiKey;
    } else if (key) {
      cfg.tmdbApiKey = key;
    } else {
      delete cfg.tmdbApiKey;
    }
  }

  saveConfig(cfg);
  const hasKey = !!metadata.getTmdbKey();
  // Clave de TMDB nueva: buscar otra vez lo que falte, ahora con la información en español
  if (tmdbChanged && hasKey) metadata.startRefresh(DATA_FILE);
  res.json({ success: true, settings: publicSettings(), refreshing: tmdbChanged && hasKey });
});

/* ---------- Clave de TMDB cifrada ----------
   En la app de escritorio el servidor es un proceso hijo de main.js (process.send existe).
   Entonces la clave no se guarda en config.json: main.js la cifra con Windows (safeStorage,
   DPAPI: solo tu usuario de Windows en este PC puede leerla) en un archivo aparte y se la
   manda al servidor al arrancar; aquí queda solo en memoria.
   Con "node server.js" a mano (sin Electron) sigue en config.json, como antes. */
const SECRET_STORE = typeof process.send === 'function';
const secretSaves = new Map(); // id → resolve(ok)
let secretSaveId = 0;

// Pide a main.js que guarde (o borre, con '') la clave cifrada. Devuelve true si lo hizo.
function saveTmdbKey(key) {
  return new Promise((resolve) => {
    const id = ++secretSaveId;
    const timer = setTimeout(() => { secretSaves.delete(id); resolve(false); }, 10000);
    secretSaves.set(id, (ok) => { clearTimeout(timer); resolve(ok); });
    process.send({ type: 'tmdb-key-save', id, key });
  });
}

if (SECRET_STORE) {
  process.on('message', (msg) => {
    if (!msg) return;
    // Al arrancar: la clave guardada, ya descifrada
    if (msg.type === 'tmdb-key' && !metadata.getUserTmdbKey()) metadata.setTmdbKey(msg.key);
    if (msg.type === 'tmdb-key-saved' && secretSaves.has(msg.id)) {
      secretSaves.get(msg.id)(!!msg.ok);
      secretSaves.delete(msg.id);
    }
  });

  // Clave de antes en config.json (texto plano): pasarla al archivo cifrado y quitarla de ahí.
  // Si Windows no puede cifrar, se deja donde estaba para no perderla.
  const legacyKey = String(readJSON(CONFIG_FILE, {}).tmdbApiKey || '').trim();
  if (legacyKey) {
    metadata.setTmdbKey(legacyKey);
    saveTmdbKey(legacyKey).then((ok) => {
      if (!ok) return console.warn('No se pudo cifrar la clave de TMDB: sigue en config.json');
      const cfg = readJSON(CONFIG_FILE, {});
      delete cfg.tmdbApiKey;
      writeJSON(CONFIG_FILE, cfg);
      console.log('Clave de TMDB movida a su archivo cifrado');
    });
  }
}

// Mi Lista (favoritos): [{ id, addedAt }], el más reciente primero
// (de cada perfil)
app.get('/api/mylist', (req, res) => {
  res.json(readJSON(myListFile(), []));
});

app.post('/api/mylist', (req, res) => {
  const { seriesId } = req.body;
  if (!seriesId) {
    return res.status(400).json({ error: 'seriesId es requerido' });
  }
  const file = myListFile();
  const list = readJSON(file, []);
  if (!list.some(item => item.id === seriesId)) {
    list.unshift({ id: seriesId, addedAt: new Date().toISOString() });
    writeJSON(file, list);
  }
  res.json({ success: true, list });
});

// Vaciar todos los favoritos (Configuración → Datos)
app.delete('/api/mylist', (req, res) => {
  writeJSON(myListFile(), []);
  res.json({ success: true, list: [] });
});

app.delete('/api/mylist/:id', (req, res) => {
  const file = myListFile();
  const list = readJSON(file, []).filter(item => item.id !== req.params.id);
  writeJSON(file, list);
  res.json({ success: true, list });
});

// Metadatos automáticos (descripción, géneros, póster...) según el nombre de la carpeta
// Inicia la búsqueda en segundo plano para las series locales que aún no los tienen.
// Body opcional: { force: true } para volver a buscar todas, { ids: [...] } para algunas.
app.post('/api/metadata/refresh', (req, res) => {
  const { force = false, ids = null } = req.body || {};
  metadata.startRefresh(DATA_FILE, { force, ids });
  res.json(metadata.getStatus());
});

app.get('/api/metadata/status', (req, res) => {
  res.json({ ...metadata.getStatus(), tmdb: !!metadata.getTmdbKey() });
});

// Subtítulos (ver subtitles.js). Solo para episodios que están en la biblioteca.
function findEpisode(episodeId) {
  if (!episodeId) return null;
  const data = readJSON(DATA_FILE, { series: [] });
  for (const s of data.series || []) {
    for (const season of s.seasons || []) {
      for (const ep of season.episodes || []) {
        if (ep.id === episodeId) return { id: ep.id, localPath: ep.localPath || null };
      }
    }
  }
  return null;
}

// Rutas de los videos de la biblioteca (en minúsculas: Windows no distingue mayúsculas).
// Se vuelve a leer series.json solo cuando cambia, no en cada trozo de video.
let libraryPaths = { mtime: 0, set: new Set() };
function getLibraryPaths() {
  let mtime = 0;
  try { mtime = fs.statSync(DATA_FILE).mtimeMs; } catch {}
  if (mtime !== libraryPaths.mtime) {
    const set = new Set();
    const data = readJSON(DATA_FILE, { series: [] });
    for (const s of data.series || []) {
      for (const season of s.seasons || []) {
        for (const ep of season.episodes || []) {
          if (ep.localPath) set.add(path.resolve(ep.localPath).toLowerCase());
        }
      }
    }
    libraryPaths = { mtime, set };
  }
  return libraryPaths.set;
}

// Archivo de video que se puede servir: uno de la biblioteca o uno dentro de media/.
// Cualquier otra ruta se rechaza: sin esto se podría leer cualquier archivo del PC.
function allowedVideoPath(localPath, mediaFile) {
  if (localPath) {
    const resolved = path.resolve(String(localPath));
    return getLibraryPaths().has(resolved.toLowerCase()) && fs.existsSync(resolved) ? resolved : null;
  }
  if (mediaFile) {
    const resolved = path.resolve(MEDIA_DIR, String(mediaFile));
    const inside = resolved.toLowerCase().startsWith(path.resolve(MEDIA_DIR).toLowerCase() + path.sep);
    return inside && fs.existsSync(resolved) ? resolved : null;
  }
  return null;
}

// Pistas disponibles: archivos .srt/.vtt junto al video y el cargado a mano
app.get('/api/subtitles', (req, res) => {
  const episode = findEpisode(req.query.episodeId);
  if (!episode) return res.status(404).json({ error: 'Episodio no encontrado' });
  res.json(subtitles.listTracks(episode));
});

// Contenido WebVTT de una pista (?episodeId=...&id=f0|manual)
app.get('/api/subtitles/track', (req, res) => {
  const episode = findEpisode(req.query.episodeId);
  const vtt = episode && subtitles.readTrack(episode, req.query.id);
  if (!vtt) return res.status(404).send('Subtítulo no encontrado');
  // Sin caché: el cargado a mano se puede reemplazar manteniendo la misma URL
  res.set('Cache-Control', 'no-store').type('text/vtt; charset=utf-8').send(vtt);
});

// Guardar el subtítulo cargado a mano de un episodio. Body: { episodeId, name, vtt }
app.put('/api/subtitles/manual', (req, res) => {
  const { episodeId, name, vtt } = req.body || {};
  const episode = findEpisode(episodeId);
  if (!episode) return res.status(404).json({ error: 'Episodio no encontrado' });
  if (typeof vtt !== 'string' || !vtt.startsWith('WEBVTT') || !vtt.includes('-->')) {
    return res.status(400).json({ error: 'El archivo no tiene subtítulos válidos' });
  }
  subtitles.saveManual(episode, String(name || 'Subtítulo cargado').slice(0, 120), vtt);
  res.json(subtitles.listTracks(episode));
});

// Quitar el subtítulo cargado a mano
app.delete('/api/subtitles/manual', (req, res) => {
  const episode = findEpisode(req.query.episodeId);
  if (!episode) return res.status(404).json({ error: 'Episodio no encontrado' });
  subtitles.removeManual(episode);
  res.json(subtitles.listTracks(episode));
});

// Tiempos de los fotogramas clave del video (ver keyframes.js); null si no aplica
app.get('/api/keyframes', (req, res) => {
  const episode = findEpisode(req.query.episodeId);
  if (!episode || !episode.localPath) return res.status(404).json({ error: 'Episodio no encontrado' });
  res.json({ keyframes: keyframes.getKeyframes(episode.localPath) });
});

// Video Streaming Endpoint with HTTP 206 Partial Content support for MP4, MKV, WEBM
// Pistas de audio de un video y si hay que convertir su audio (Dolby/DTS) para oírlo
app.get('/api/audio/info', async (req, res) => {
  const filePath = allowedVideoPath(req.query.localPath);
  if (!filePath) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.json(await audio.info(filePath));
});

// Pista de audio convertida a AAC en vivo, desde el segundo "start"
app.get('/api/audio/stream', (req, res) => {
  const filePath = allowedVideoPath(req.query.localPath);
  if (!filePath) return res.status(404).send('Archivo no encontrado');
  audio.stream(req, res, filePath);
});

app.get('/api/stream', (req, res) => {
  const { videoUrl, localPath } = req.query;

  // Handle external video URL or remote sample stream
  if (videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
    return res.redirect(videoUrl);
  }

  // Handle local file streaming (.mp4, .mkv, .webm): solo videos de la biblioteca o de media/
  const filePath = allowedVideoPath(localPath, req.query.file);

  if (!filePath) {
    return res.status(404).send('Archivo de video no encontrado');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Determine Content-Type for MP4, MKV, WEBM
  let contentType = mime.lookup(filePath) || 'video/mp4';
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mkv') {
    contentType = 'video/x-matroska';
  } else if (ext === '.webm') {
    contentType = 'video/webm';
  } else if (ext === '.mp4') {
    contentType = 'video/mp4';
  }

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };

    res.writeHead(206, head);
    // pipeline (y no pipe): al saltar, el navegador cancela la petición y la lectura del
    // archivo se cierra; con pipe quedaba abierta y se acumulaba una por cada salto
    pipeline(file, res, () => {});
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    pipeline(fs.createReadStream(filePath), res, () => {});
  }
});

// Carpetas de temporada ("Temporada 2", "Season 01", "S3", "T1"): sus videos son de la serie de arriba
const SEASON_FOLDER_RE = /^(?:season|temporada|temp\.?|s|t)[\s._-]*0*(\d{1,3})\b/i;

// ──────────────────────────────────────────────
// Búsqueda automática de carpetas con videos en todo el PC
// ──────────────────────────────────────────────
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm'];
// Videos más chicos no cuentan (clips de WhatsApp, animaciones de juegos, etc.)
const DISCOVER_MIN_VIDEO_BYTES = 25 * 1024 * 1024;
const DISCOVER_MAX_DEPTH = 10;
// Carpetas del sistema y de programas: nunca tienen series y alargan mucho la búsqueda
const DISCOVER_SKIP = new Set([
  'windows', 'windows.old', 'program files', 'program files (x86)', 'programdata', 'appdata',
  'system volume information', 'recovery', 'perflogs', 'msocache', 'config.msi', 'intel', 'amd',
  'nvidia', 'drivers', 'node_modules', 'steamapps', 'proc', 'sys', 'dev', 'usr',
  'bin', 'sbin', 'etc', 'var', 'opt', 'snap', 'boot'
]);

let discoverJob = null;

function discoverRoots() {
  const home = os.homedir();
  // Primero las carpetas donde casi siempre están los videos: así aparecen resultados enseguida
  const roots = ['Videos', 'Downloads', 'Desktop', 'Documents', 'Descargas', 'Escritorio', 'Documentos', 'Vídeos']
    .map(d => path.join(home, d));
  if (process.platform === 'win32') {
    for (let c = 65; c <= 90; c++) roots.push(`${String.fromCharCode(c)}:\\`);
  } else {
    roots.push(home, '/media', '/mnt', '/Volumes');
  }
  return roots.filter(r => fs.existsSync(r));
}

async function runDiscover(job) {
  const visited = new Set();
  const stack = discoverRoots().reverse().map(dir => ({ dir, depth: 0 }));

  const worker = async () => {
    while (stack.length && !job.cancelled) {
      const { dir, depth } = stack.pop();
      const key = dir.toLowerCase();
      if (visited.has(key)) continue;
      visited.add(key);
      job.current = dir;
      job.scannedDirs++;

      let items;
      try {
        items = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        continue; // sin permiso o desconectado
      }

      for (const item of items) {
        const name = item.name;
        // Los accesos directos de carpeta (junctions) son isSymbolicLink, no isDirectory: no se siguen
        if (item.isDirectory()) {
          if (depth >= DISCOVER_MAX_DEPTH || name.startsWith('.') || name.startsWith('$') ||
              DISCOVER_SKIP.has(name.toLowerCase())) continue;
          stack.push({ dir: path.join(dir, name), depth: depth + 1 });
        } else if (item.isFile()) {
          const ext = path.extname(name).toLowerCase();
          if (!VIDEO_EXTENSIONS.includes(ext)) continue;
          let size = 0;
          try { size = (await fs.promises.stat(path.join(dir, name))).size; } catch { continue; }
          if (size < DISCOVER_MIN_VIDEO_BYTES) continue;
          const entry = job.dirs.get(dir) || { videos: 0, bytes: 0, formats: new Set() };
          entry.videos++;
          entry.bytes += size;
          entry.formats.add(ext.slice(1));
          job.dirs.set(dir, entry);
        }
      }
    }
  };

  // Varias lecturas a la vez: el disco responde mucho más rápido que de a una
  await Promise.all(Array.from({ length: 8 }, worker));
  job.running = false;
  job.current = '';
  job.finishedAt = Date.now();
}

// Junta las carpetas encontradas por serie: las de temporada se suman a la carpeta de arriba
function discoverResults(job) {
  const groups = new Map();
  for (const [dir, info] of job.dirs) {
    const seriesDir = SEASON_FOLDER_RE.test(path.basename(dir)) ? path.dirname(dir) : dir;
    const g = groups.get(seriesDir) || { videos: 0, bytes: 0, formats: new Set() };
    g.videos += info.videos;
    g.bytes += info.bytes;
    info.formats.forEach(f => g.formats.add(f));
    groups.set(seriesDir, g);
  }

  // ¿Ya está en la biblioteca? (misma carpeta que una serie guardada o que sus videos)
  const norm = (p) => path.resolve(p).toLowerCase();
  const libraryDirs = new Set();
  readJSON(DATA_FILE, { series: [] }).series.forEach(s => {
    if (s.folderPath) libraryDirs.add(norm(s.folderPath));
    (s.seasons || []).forEach(sn => (sn.episodes || []).forEach(ep => {
      if (!ep.localPath) return;
      const d = path.dirname(ep.localPath);
      libraryDirs.add(norm(d));
      if (SEASON_FOLDER_RE.test(path.basename(d))) libraryDirs.add(norm(path.dirname(d)));
    }));
  });

  return [...groups].map(([dir, g]) => ({
    path: dir,
    name: path.basename(dir) || dir,
    parent: path.dirname(dir),
    videos: g.videos,
    bytes: g.bytes,
    formats: [...g.formats].sort(),
    inLibrary: libraryDirs.has(norm(dir))
  })).sort((a, b) => a.inLibrary - b.inLibrary || b.videos - a.videos || a.name.localeCompare(b.name));
}

function discoverStatus(job) {
  return {
    running: job.running,
    scannedDirs: job.scannedDirs,
    current: job.current,
    elapsedMs: (job.finishedAt || Date.now()) - job.startedAt,
    found: discoverResults(job)
  };
}

app.post('/api/discover/start', (req, res) => {
  if (!discoverJob || !discoverJob.running) {
    discoverJob = { running: true, cancelled: false, scannedDirs: 0, current: '', startedAt: Date.now(), finishedAt: 0, dirs: new Map() };
    runDiscover(discoverJob).catch(err => {
      console.error('Discover error:', err);
      discoverJob.running = false;
    });
  }
  res.json(discoverStatus(discoverJob));
});

app.get('/api/discover/status', (req, res) => {
  if (!discoverJob) return res.json({ running: false, scannedDirs: 0, current: '', elapsedMs: 0, found: [] });
  res.json(discoverStatus(discoverJob));
});

app.post('/api/discover/stop', (req, res) => {
  if (discoverJob) discoverJob.cancelled = true;
  res.json({ success: true });
});

// Temporada y número de episodio a partir del nombre del archivo.
// folderSeason: número de la carpeta de temporada ("Temporada 2"), si el nombre no trae "S01E02".
function parseEpisodeNumbers(fileName, folderSeason) {
  let seasonNum = 1;
  let epNum = 1;
  // Regex match S01E02 or 1x02 or Season 1
  const seasonMatch = fileName.match(/S(\d+)E(\d+)/i) || fileName.match(/(\d+)x(\d+)/i);
  if (seasonMatch) {
    seasonNum = parseInt(seasonMatch[1], 10);
    epNum = parseInt(seasonMatch[2], 10);
  } else {
    if (folderSeason) seasonNum = parseInt(folderSeason, 10);
    // Sin "S01E02": usar el primer número del nombre ("01(2).mp4" → 1, "Ep 12" → 12),
    // ignorando resoluciones y años (1080, 2024...)
    const base = path.basename(fileName, path.extname(fileName)).replace(/\b(480|720|1080|2160)p?\b|\b(19|20)\d{2}\b|[xh]26[45]/gi, ' ');
    const num = base.match(/\d{1,4}/);
    if (num) epNum = parseInt(num[0], 10);
  }
  return { seasonNum, epNum };
}

// ──────────────────────────────────────────────
// Videos nuevos en series que ya están en la biblioteca
// ──────────────────────────────────────────────
const normPath = (p) => path.resolve(p).toLowerCase();
const seriesLocalPaths = (s) => (s.seasons || []).flatMap(sn => (sn.episodes || []).map(ep => ep.localPath).filter(Boolean));

// Carpeta de una serie: la guardada o, en series viejas, la carpeta común de sus videos
function seriesFolderOf(s) {
  if (s.folderPath) return s.folderPath;
  const dirs = seriesLocalPaths(s).map(p => path.dirname(p));
  if (!dirs.length) return null;
  let common = dirs[0].split(path.sep);
  for (const d of dirs.slice(1)) {
    const parts = d.split(path.sep);
    let i = 0;
    while (i < common.length && i < parts.length && common[i].toLowerCase() === parts[i].toLowerCase()) i++;
    common = common.slice(0, i);
  }
  let folder = common.join(path.sep);
  if (!folder || /^[a-z]:$/i.test(folder)) return null;
  if (SEASON_FOLDER_RE.test(path.basename(folder))) folder = path.dirname(folder);
  return folder;
}

function findNewVideos() {
  const data = readJSON(DATA_FILE, { series: [] });
  const known = new Set(data.series.flatMap(seriesLocalPaths).map(normPath));
  // Si el disco de la serie no está conectado no se revisa (sus videos no se borraron)
  const folders = data.series.map(s => ({ s, folder: seriesFolderOf(s) }))
    .filter(x => x.folder && fs.existsSync(path.parse(path.resolve(x.folder)).root));
  const seriesFolders = new Set(folders.map(x => normPath(x.folder)));
  const changes = [];

  for (const { s, folder } of folders) {
    // Capítulos cuyo archivo ya no está (borrado, movido o renombrado)
    const missingFiles = (s.seasons || []).flatMap(sn => (sn.episodes || [])
      .filter(ep => ep.localPath && !fs.existsSync(ep.localPath))
      .map(ep => ({
        name: path.basename(ep.localPath), path: ep.localPath, episodeId: ep.id,
        season: sn.seasonNumber, episode: ep.episodeNumber, format: ep.format
      })));
    const totalFiles = seriesLocalPaths(s).length;

    // Se borró la carpeta entera de la serie
    if (!fs.existsSync(folder)) {
      if (missingFiles.length) {
        changes.push({ id: s.id, title: s.title, folderPath: folder, newFiles: [], missingFiles, folderGone: true, allMissing: true });
      }
      continue;
    }

    const root = normPath(folder);
    // Si la serie tiene videos sueltos en su carpeta, sus subcarpetas (menos las de temporada)
    // pueden ser otras series: no se miran
    const hasLoose = seriesLocalPaths(s).some(p => normPath(path.dirname(p)) === root);
    const newFiles = [];

    const walk = (dir, depth) => {
      let items;
      try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (depth >= 3 || item.name.startsWith('.') || seriesFolders.has(normPath(full))) continue;
          if (hasLoose && depth === 0 && !SEASON_FOLDER_RE.test(item.name)) continue;
          walk(full, depth + 1);
        } else if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase()) &&
                   !known.has(normPath(full))) {
          // Datos para el aviso: capítulo que sería, tamaño y cuándo se copió
          const folderSeason = (path.basename(dir).match(SEASON_FOLDER_RE) || [])[1];
          const { seasonNum, epNum } = parseEpisodeNumbers(item.name, folderSeason);
          let stat = null;
          try { stat = fs.statSync(full); } catch { /* se borró mientras tanto */ }
          newFiles.push({
            name: item.name, path: full, season: seasonNum, episode: epNum,
            format: path.extname(item.name).slice(1).toLowerCase(),
            size: stat ? stat.size : 0, addedAt: stat ? Math.max(stat.mtimeMs, stat.birthtimeMs) : 0
          });
        }
      }
    };
    walk(folder, 0);

    if (newFiles.length || missingFiles.length) {
      newFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      missingFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      changes.push({
        id: s.id, title: s.title, folderPath: folder, newFiles, missingFiles,
        allMissing: missingFiles.length === totalFiles && !newFiles.length
      });
    }
  }
  return changes;
}

app.get('/api/library/new-videos', (req, res) => {
  try {
    res.json({ changes: findNewVideos() });
  } catch (err) {
    console.error('New videos check error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Pone la lista de capítulos al día con la carpeta: agrega los videos nuevos y quita los
// borrados, sin tocar los demás capítulos (se conservan sus títulos, miniaturas y progreso)
app.post('/api/series/:id/sync-videos', (req, res) => {
  const data = readJSON(DATA_FILE, { series: [] });
  const series = data.series.find(s => s.id === req.params.id);
  if (!series) return res.status(404).json({ error: 'Serie no encontrada' });

  const change = findNewVideos().find(c => c.id === series.id);
  if (!change) return res.json({ success: true, added: 0, removed: 0, seriesRemoved: false });

  // Sin ningún video: la serie se quita de la biblioteca
  if (change.allMissing) {
    data.series = data.series.filter(s => s !== series);
    writeJSON(DATA_FILE, data);
    return res.json({ success: true, added: 0, removed: change.missingFiles.length, seriesRemoved: true });
  }

  const missingIds = new Set(change.missingFiles.map(f => f.episodeId));
  series.seasons = (series.seasons || [])
    .map(sn => ({ ...sn, episodes: (sn.episodes || []).filter(ep => !missingIds.has(ep.id)) }))
    .filter(sn => sn.episodes.length);

  const seriesName = series.folderName || path.basename(change.folderPath);
  for (const file of change.newFiles) {
    const parentName = path.basename(path.dirname(file.path));
    const seasonFolder = parentName.match(SEASON_FOLDER_RE);
    const { seasonNum, epNum } = parseEpisodeNumbers(file.name, seasonFolder ? seasonFolder[1] : null);
    let season = series.seasons.find(sn => sn.seasonNumber === seasonNum);
    if (!season) {
      season = { seasonNumber: seasonNum, title: `Temporada ${seasonNum}`, episodes: [] };
      series.seasons.push(season);
    }
    const ext = path.extname(file.name).toLowerCase();
    season.episodes.push({
      id: `local-${seriesName}-${seasonNum}-${epNum}-${file.name}`,
      episodeNumber: epNum,
      title: file.name,
      duration: 'Local Video',
      description: `Archivo local (${ext}): ${file.name}`,
      localPath: file.path,
      format: ext.replace('.', ''),
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop'
    });
  }
  series.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
  series.seasons.forEach(sn => sn.episodes.sort((a, b) =>
    a.episodeNumber - b.episodeNumber || a.title.localeCompare(b.title, undefined, { numeric: true })
  ));
  series.seasonsCount = series.seasons.length;
  writeJSON(DATA_FILE, data);

  res.json({ success: true, added: change.newFiles.length, removed: change.missingFiles.length, seriesRemoved: false });
});

// Scan local directory for series (.mp4, .mkv, .webm)
// Con single: true la carpeta elegida es UNA serie (sus videos y los de sus carpetas de temporada)
app.post('/api/scan', (req, res) => {
  const targetDir = req.body.folderPath || MEDIA_DIR;
  const single = !!req.body.single;

  if (!fs.existsSync(targetDir)) {
    return res.status(404).json({ error: `La carpeta no existe: ${targetDir}` });
  }

  try {
    const supportedExtensions = ['.mp4', '.mkv', '.webm'];
    const rootDir = path.resolve(targetDir);
    // Nombre de la carpeta elegida (vacío si es la raíz de un disco, p. ej. "E:\")
    const rootName = path.basename(rootDir);

    // Helper to recursively scan folder
    function scanFolder(dir, seriesMap = {}) {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (!single || (dir === rootDir && SEASON_FOLDER_RE.test(item.name))) scanFolder(fullPath, seriesMap);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            // Deduce series name and episode info from folder/file structure
            const relative = path.relative(rootDir, fullPath);
            const pathParts = relative.split(path.sep);
            const seasonFolder = pathParts.length === 2 && pathParts[0].match(SEASON_FOLDER_RE);

            // Cada subcarpeta de la carpeta elegida es una serie. Los videos sueltos en la
            // carpeta elegida son una serie con el nombre de esa carpeta.
            let seriesName;
            let folderPath;
            if (single) {
              // Solo los videos sueltos y los de carpetas de temporada; otras subcarpetas son otras series
              if (pathParts.length > 1 && !seasonFolder) continue;
              seriesName = rootName || 'Serie Local';
              folderPath = rootDir;
            } else if (pathParts.length >= 2) {
              seriesName = pathParts[0];
              folderPath = path.join(rootDir, pathParts[0]);
            } else {
              seriesName = rootName || 'Serie Local';
              folderPath = rootDir;
            }

            // Carpeta de temporada justo encima del video ("Serie\Temporada 2\01.mp4").
            // Los videos sueltos en la carpeta de la serie son de la temporada 1.
            const parentSeason = single
              ? seasonFolder
              : pathParts.length >= 3 && pathParts[pathParts.length - 2].match(SEASON_FOLDER_RE);
            const { seasonNum, epNum } = parseEpisodeNumbers(item.name, parentSeason ? parentSeason[1] : null);
            let epTitle = item.name;

            if (!seriesMap[folderPath]) {
              seriesMap[folderPath] = {
                id: seriesName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                title: seriesName,
                folderName: seriesName, // se usa para buscar los metadatos
                folderPath,             // carpeta de la serie en el disco
                match: '100% Local',
                rating: 'HD',
                year: new Date().getFullYear(),
                // El formato (MP4/MKV/WEBM) ya está en cada episodio; los géneros reales llegan con los metadatos
                genres: ['Medios Locales'],
                description: `Serie local encontrada en ${folderPath}`,
                banner: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
                poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
                seasonsMap: {}
              };
            }

            const sMap = seriesMap[folderPath].seasonsMap;
            if (!sMap[seasonNum]) {
              sMap[seasonNum] = {
                seasonNumber: seasonNum,
                title: `Temporada ${seasonNum}`,
                episodes: []
              };
            }

            sMap[seasonNum].episodes.push({
              id: `local-${seriesName}-${seasonNum}-${epNum}-${item.name}`,
              episodeNumber: epNum,
              title: epTitle,
              duration: 'Local Video',
              description: `Archivo local (${ext}): ${item.name}`,
              localPath: fullPath,
              format: ext.replace('.', ''),
              thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop'
            });
          }
        }
      }
      return seriesMap;
    }

    const seriesMap = scanFolder(rootDir);
    const newSeriesList = Object.values(seriesMap).map(s => {
      // Temporadas y episodios en orden
      s.seasons = Object.values(s.seasonsMap).sort((a, b) => a.seasonNumber - b.seasonNumber);
      s.seasons.forEach(sn => sn.episodes.sort((a, b) =>
        a.episodeNumber - b.episodeNumber || a.title.localeCompare(b.title, undefined, { numeric: true })
      ));
      delete s.seasonsMap;
      s.seasonsCount = s.seasons.length;
      return s;
    });

    if (newSeriesList.length > 0) {
      const data = readJSON(DATA_FILE, { series: [] });
      const norm = (p) => path.resolve(p).toLowerCase();
      const localPaths = (s) => (s.seasons || []).flatMap(sn => (sn.episodes || []).map(ep => ep.localPath).filter(Boolean));
      // ¿La serie guardada es de esta carpeta? (por su folderPath o porque todos sus videos están ahí)
      const isSameFolder = (existing, folderPath) => {
        if (existing.folderPath) return norm(existing.folderPath) === norm(folderPath);
        const paths = localPaths(existing);
        const f = norm(folderPath);
        // Misma carpeta o subcarpeta suya ("E:\Last Exile 2" NO cuenta como "E:\Last Exile")
        return paths.length > 0 && paths.every(p => {
          const d = norm(path.dirname(p));
          return d === f || d.startsWith(f + path.sep);
        });
      };

      // ¿La serie guardada se movió a otra carpeta? (mismo nombre de carpeta y sus videos
      // ya no están en la ruta anterior)
      const wasMoved = (existing, ns) => {
        if (String(existing.folderName || '').toLowerCase() !== String(ns.folderName || '').toLowerCase()) return false;
        const paths = localPaths(existing);
        return paths.length > 0 && !fs.existsSync(paths[0]);
      };

      newSeriesList.forEach(ns => {
        let sameFolder = data.series.filter(x => isSameFolder(x, ns.folderPath));
        if (!sameFolder.length) sameFolder = data.series.filter(x => wasMoved(x, ns));
        if (sameFolder.length) {
          // Ya estaba: se actualiza conservando su id (favoritos), sus datos y sus ediciones
          const keep = sameFolder.find(x => x.id === ns.id) || sameFolder[0];
          ns.id = keep.id;
          // Conservar las miniaturas reales ya capturadas (por nombre de archivo del video)
          const thumbs = {};
          sameFolder.forEach(x => (x.seasons || []).forEach(sn => (sn.episodes || []).forEach(ep => {
            if (ep.localPath && ep.thumbnail && ep.thumbnail.startsWith('/images/thumbs/')) {
              thumbs[path.basename(ep.localPath).toLowerCase()] = ep.thumbnail;
            }
          })));
          ns.seasons.forEach(sn => sn.episodes.forEach(ep => {
            const t = thumbs[path.basename(ep.localPath).toLowerCase()];
            if (t) ep.thumbnail = t;
          }));
          const idx = data.series.indexOf(keep);
          data.series[idx] = metadata.preserveMetadata(ns, keep);
          // Otras entradas viejas de la misma carpeta (p. ej. una "Serie Local") se quitan
          data.series = data.series.filter(x => x === data.series[idx] || !sameFolder.includes(x));
        } else {
          // Nueva: si otro id igual es de OTRA carpeta, usar uno distinto para no pisarla
          const base = ns.id;
          let n = 2;
          while (data.series.some(x => x.id === ns.id)) ns.id = `${base}-${n++}`;
          data.series.push(ns);
        }
      });
      writeJSON(DATA_FILE, data);

      // Buscar en segundo plano la información de las series nuevas
      metadata.startRefresh(DATA_FILE, { ids: newSeriesList.map(s => s.id) });
    }

    res.json({
      success: true,
      foundSeriesCount: newSeriesList.length,
      series: newSeriesList
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Error escaneando directorio local: ' + err.message });
  }
});

// Solo en este PC (127.0.0.1): nadie más en la red puede conectarse
app.listen(PORT, '127.0.0.1', () => {
  console.log(`====================================================`);
  console.log(`🎬 HIY Series corriendo en http://localhost:${PORT}`);
  console.log(`Soporte completo para formatos de video: MP4, MKV, WEBM`);
  console.log(`====================================================`);
});
