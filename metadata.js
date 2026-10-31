/* ==========================================================================
   METADATOS AUTOMÁTICOS
   Busca descripción, géneros, año, puntuación, póster y banner de una serie
   a partir del nombre de su carpeta.

   Fuentes (en este orden):
     1. TMDB    – películas, series y anime, en español. Requiere una API key gratuita
                  (variable de entorno TMDB_API_KEY; en la app de escritorio, guardada cifrada
                  por main.js; con "node server.js" a mano, "tmdbApiKey" en data/config.json).
     2. AniList – anime. Sin clave.
     3. TVMaze  – series de todo tipo (tolera errores de escritura). Sin clave.
   Se elige el resultado cuyo título se parece más al nombre de la carpeta.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

// En la app instalada los datos van en la carpeta del usuario (ver main.js), no en app.asar
const DATA_DIR = path.join(process.env.HIY_USER_DIR || __dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const CACHE_FILE = path.join(DATA_DIR, 'metadata-cache.json');
const TRANSLATION_CACHE_FILE = path.join(DATA_DIR, 'translation-cache.json');
// Pósteres y banners descargados (se sirven en /images/...)
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// Versión de la lógica de búsqueda. Al mejorarla se sube este número y las series guardadas
// con una versión anterior se vuelven a procesar una vez (sin usar la caché vieja).
// 2: películas descartadas en carpetas con episodios, géneros de AniList en anime,
//    2.ª búsqueda en TMDB para tener el español, traducción e imágenes locales.
// 3: tipo de título (película / serie).
// 4: también se compara con el subtítulo ("Adventure Time: Fionna & Cake" → "Fionna & Cake")
//    y "and" / "y" / "&" cuentan igual.
// 5: también se guarda el título y la descripción en inglés (series.en) para la app en inglés.
const METADATA_VERSION = 5;

// Con más de estos videos en la carpeta no puede ser una película
const MAX_MOVIE_FILES = 3;

// Parecido mínimo (0–1) entre el nombre de la carpeta y el título encontrado
const MIN_SIMILARITY = 0.72;
// Si no se encontró nada, se vuelve a intentar pasados estos días
const RETRY_NOT_FOUND_DAYS = 7;
// Pausa entre búsquedas para no saturar las APIs
const REQUEST_DELAY_MS = 700;

const FORMAT_TAGS = ['MP4', 'MKV', 'WEBM'];

// Géneros en inglés (AniList / TVMaze) → español
const GENRE_ES = {
  'action': 'Acción',
  'adventure': 'Aventura',
  'comedy': 'Comedia',
  'drama': 'Drama',
  'fantasy': 'Fantasía',
  'horror': 'Terror',
  'mystery': 'Misterio',
  'psychological': 'Psicológico',
  'romance': 'Romance',
  'sci-fi': 'Ciencia Ficción',
  'science-fiction': 'Ciencia Ficción',
  'slice of life': 'Recuentos de la vida',
  'sports': 'Deportes',
  'supernatural': 'Sobrenatural',
  'thriller': 'Suspense',
  'mecha': 'Mecha',
  'music': 'Música',
  'mahou shoujo': 'Chicas mágicas',
  'ecchi': 'Ecchi',
  'anime': 'Anime',
  'children': 'Infantil',
  'family': 'Familiar',
  'crime': 'Crimen',
  'war': 'Bélico',
  'history': 'Historia',
  'western': 'Western',
  'espionage': 'Espionaje',
  'medical': 'Médico',
  'legal': 'Legal',
  'food': 'Cocina',
  'nature': 'Naturaleza',
  'travel': 'Viajes',
  'adult': 'Adultos',
  'mature': 'Adultos',
  // Géneros de series de TMDB que no vienen traducidos (un género → varios)
  'action & adventure': ['Acción', 'Aventura'],
  'sci-fi & fantasy': ['Ciencia Ficción', 'Fantasía'],
  'war & politics': ['Bélico', 'Política'],
  'kids': 'Infantil',
  'soap': 'Telenovela',
  'reality': 'Reality',
  'animation': 'Animación'
};
const SKIP_GENRES = new Set(['hentai']);

/* ---------------- Utilidades ---------------- */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`[metadata] Error leyendo ${file}:`, err.message);
  }
  return fallback;
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[metadata] Error escribiendo ${file}:`, err.message);
  }
}

// En la app de escritorio la clave no está en config.json: main.js la guarda cifrada y se la
// pasa al servidor al arrancar (ver "Clave de TMDB cifrada" en server.js). Aquí vive en memoria.
let tmdbKeyInMemory = '';
function setTmdbKey(key) {
  tmdbKeyInMemory = String(key || '').trim();
}

function getTmdbKey() {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY.trim();
  if (tmdbKeyInMemory) return tmdbKeyInMemory;
  const cfg = readJSON(CONFIG_FILE, {});
  return (cfg.tmdbApiKey || '').trim();
}

// Quita etiquetas HTML y entidades de las descripciones
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\(Source:[^)]*\)/gi, '')
    .replace(/\[Written by[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Limpia el nombre de una carpeta para buscarlo:
 * "[SubsPlease] Shingeki.no.Kyojin.S01.1080p (2013)" → { query: "Shingeki no Kyojin", year: 2013 }
 * keepSubtitle: nombre escrito por el usuario; no se quita lo que va tras " - "
 *   ("Dofus - Book I: Julith" debe seguir siendo eso, no "Dofus").
 */
function cleanFolderName(name, { keepSubtitle = false } = {}) {
  let s = String(name || '');
  const yearMatch = s.match(/[\(\[\s._-]((?:19|20)\d{2})[\)\]\s._-]?/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  s = s
    .replace(/\[[^\]]*\]/g, ' ')                 // [Grupo], [1080p]
    .replace(/\((?:19|20)\d{2}\)/g, ' ')          // (2013)
    .replace(/[._]+/g, ' ')                       // puntos y guiones bajos
    .replace(/\b(S\d{1,2}(E\d{1,3})?|Season\s*\d+|Temporada\s*\d+|Cap(i|í)tulo\s*\d+)\b/gi, ' ')
    .replace(/\b(480p|720p|1080p|2160p|4k|x264|x265|h264|h265|hevc|10bit|bluray|bdrip|web-?dl|webrip|hdtv|dual|latino|castellano|sub(s|bed)?|esp(a(n|ñ)ol)?|eng|multi|complet[ao])\b/gi, ' ')
    .replace(/\s+-\s+.*$/, m => (keepSubtitle ? m : ' ')) // " - Episode 23 (β)" y similares
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { query: s || String(name || '').trim(), year };
}

// Forma comparable de un título: minúsculas, sin acentos, sin artículos ni signos
function normalizeTitle(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^(the|el|la|los|las)\s+/, '')
    // "Fiona and Cake" = "Fiona & Cake" = "Fiona y Cake"
    .replace(/\s+(and|y)\s+/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Parecido entre 0 y 1 (1 = idéntico)
function similarity(a, b) {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return 0;
  const score = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  // La carpeta tiene el comienzo del título ("Boku no Hero" → "Boku no Hero Academia"):
  // cuenta como coincidencia fuerte aunque el título completo sea más largo
  if (x !== y && x.length >= 6 && y.startsWith(x)) return Math.max(score, 0.9);
  return score;
}

// Parte después de la franquicia: "Adventure Time: Fionna & Cake" → "Fionna & Cake".
// Así se reconoce la carpeta aunque no lleve el prefijo.
function subtitleOf(title) {
  const m = String(title).match(/^.+?(?::|\s[-–—]\s)\s*(.+)$/);
  return m && normalizeTitle(m[1]).length >= 5 ? m[1] : null;
}

// La coincidencia solo con el subtítulo vale un poco menos: si otro resultado coincide con
// su título completo, gana ese ("Final Fantasy XV" no debe preferir "Brotherhood: Final Fantasy XV")
const SUBTITLE_WEIGHT = 0.88;

function bestTitleScore(query, titles) {
  const list = titles.filter(Boolean);
  const full = list.map(t => similarity(query, t));
  const sub = list.map(subtitleOf).filter(Boolean).map(t => similarity(query, t) * SUBTITLE_WEIGHT);
  return Math.max(0, ...full, ...sub);
}

// Nombre principal, antes del subtítulo: "Dofus - Book I: Julith" → "Dofus"
function mainTitleOf(title) {
  return String(title || '').split(/:|\s[-–—]\s/)[0];
}

function mainTitleMatches(query, titles) {
  const q = mainTitleOf(query);
  return titles.filter(Boolean).some(t => similarity(q, mainTitleOf(t)) >= 0.85);
}

function translateGenres(list) {
  const out = [];
  (list || []).forEach(g => {
    const key = String(g).toLowerCase();
    if (SKIP_GENRES.has(key)) return;
    const es = GENRE_ES[key] || g;
    (Array.isArray(es) ? es : [es]).forEach(x => {
      if (!out.includes(x)) out.push(x);
    });
  });
  return out;
}

async function fetchJSON(url, options = {}, attempt = 1) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  // Demasiadas consultas seguidas (p. ej. AniList limita por minuto): esperar y reintentar
  if (res.status === 429 && attempt <= 3) {
    const retryAfter = parseInt(res.headers.get('retry-after'), 10);
    const waitMs = (Number.isFinite(retryAfter) ? retryAfter : 10 * attempt) * 1000;
    console.warn(`[metadata] ${new URL(url).host} pidió esperar ${Math.round(waitMs / 1000)} s (límite de consultas)`);
    await sleep(Math.min(waitMs, 65000));
    return fetchJSON(url, options, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).host}`);
  return res.json();
}

/* ---------------- Fuentes ---------------- */

/**
 * opts.episodes: episodios de la carpeta. Si hay varios, no puede ser una película.
 * opts.relaxed: 2.ª búsqueda por el título oficial; acepta también un resultado del
 *   mismo año entre los primeros de TMDB aunque su título esté en otro idioma.
 */
async function searchTmdb(query, year, apiKey, opts = {}) {
  const base = 'https://api.themoviedb.org/3';
  const auth = apiKey.length > 40
    ? { headers: { Authorization: `Bearer ${apiKey}` } } // token de lectura (v4)
    : null;
  const keyParam = auth ? '' : `&api_key=${encodeURIComponent(apiKey)}`;

  const search = await fetchJSON(
    `${base}/search/multi?language=es-ES&include_adult=false&query=${encodeURIComponent(query)}${keyParam}`,
    auth || {}
  );
  const candidates = (search.results || [])
    .filter(r => r.media_type === 'tv' || r.media_type === 'movie')
    // Una carpeta con muchos episodios es una serie, no una película
    // (salvo que el usuario la haya buscado a mano: él sabe lo que es)
    .filter(r => opts.manual || !(opts.episodes > MAX_MOVIE_FILES && r.media_type === 'movie'))
    .slice(0, 6)
    .map((r, index) => {
      const date = r.first_air_date || r.release_date || '';
      const y = date ? parseInt(date.slice(0, 4), 10) : null;
      const titles = [r.name, r.title, r.original_name, r.original_title];
      let score = bestTitleScore(query, titles);
      if (year && y === year) score += 0.05;
      if (opts.relaxed && year && y === year && index < 3) score = Math.max(score, 0.86);
      // Búsqueda manual: TMDB ya ordena bien por relevancia. Si el nombre principal coincide
      // ("Dofus" en "Dofus - Livre 1 : Julith"), se acepta en su orden aunque el resto del
      // título esté en otro idioma ("Book I" / "Livre 1")
      if (opts.manual && index < 3 && mainTitleMatches(query, titles)) {
        score = Math.max(score, 0.9 - index * 0.01);
      }
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return null;

  const type = best.r.media_type;
  let details = await fetchJSON(
    `${base}/${type}/${best.r.id}?language=es-ES&append_to_response=credits${keyParam}`,
    auth || {}
  );
  // Versión en inglés (para la app en inglés). Si no hay sinopsis en español, se usa la inglesa.
  let en = {};
  try {
    en = await fetchJSON(`${base}/${type}/${best.r.id}?language=en-US${keyParam}`, auth || {});
  } catch (err) {
    console.warn(`[metadata] TMDB en inglés falló para "${query}": ${err.message}`);
  }
  if (!details.overview) details.overview = en.overview;

  const img = (p, size) => (p ? `https://image.tmdb.org/t/p/${size}${p}` : null);
  const date = details.first_air_date || details.release_date || '';
  return {
    score: best.score,
    source: 'tmdb',
    sourceId: `${type}/${details.id}`,
    type: type === 'movie' ? 'movie' : 'series',
    title: details.name || details.title,
    description: details.overview || '',
    en: { title: en.name || en.title || null, description: en.overview || null },
    genres: (details.genres || []).map(g => g.name), // ya vienen en español
    year: date ? parseInt(date.slice(0, 4), 10) : null,
    rating: details.vote_average ? Math.round(details.vote_average * 10) : null,
    poster: img(details.poster_path, 'w500'),
    // 1280 px basta para el banner y pesa mucho menos que el original
    banner: img(details.backdrop_path, 'w1280') || img(details.poster_path, 'w780'),
    creator: (details.created_by || []).map(c => c.name).join(', ') ||
      ((details.credits && details.credits.crew) || []).filter(c => c.job === 'Director').map(c => c.name).join(', '),
    cast: ((details.credits && details.credits.cast) || []).slice(0, 4).map(c => c.name),
    isAnime: (details.genres || []).some(g => g.id === 16) && (details.origin_country || []).includes('JP')
  };
}

async function searchAniList(query, year, opts = {}) {
  const gql = `query ($s: String) {
    Page(perPage: 6) {
      media(search: $s, type: ANIME, sort: SEARCH_MATCH) {
        id format seasonYear averageScore genres isAdult
        title { romaji english native }
        synonyms
        description(asHtml: false)
        coverImage { extraLarge large }
        bannerImage
        studios(isMain: true) { nodes { name } }
      }
    }
  }`;
  const json = await fetchJSON('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { s: query } })
  });

  const candidates = ((json.data && json.data.Page && json.data.Page.media) || [])
    // Una carpeta con muchos episodios no puede ser una película
    .filter(m => !(opts.episodes > MAX_MOVIE_FILES && m.format === 'MOVIE'))
    .map(m => {
      let score = bestTitleScore(query, [m.title.romaji, m.title.english, ...(m.synonyms || [])]);
      if (year && m.seasonYear === year) score += 0.05;
      // Un solo video: a igual nombre, mejor la película que la serie
      if (opts.episodes === 1 && m.format === 'MOVIE') score += 0.03;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return null;
  const m = best.m;
  return {
    score: best.score,
    source: 'anilist',
    sourceId: String(m.id),
    // Formatos de AniList: MOVIE = película; TV, TV_SHORT, OVA, ONA, SPECIAL = serie
    type: m.format === 'MOVIE' ? 'movie' : 'series',
    title: m.title.english || m.title.romaji,
    // Otros nombres con los que buscarla en TMDB
    altTitles: [m.title.english, m.title.romaji].filter(Boolean),
    description: stripHtml(m.description),
    // AniList ya viene en inglés
    en: { title: m.title.english || m.title.romaji, description: stripHtml(m.description) || null },
    genres: ['Anime', ...(m.genres || [])],
    year: m.seasonYear || null,
    rating: m.averageScore || null,
    poster: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || null,
    banner: m.bannerImage || (m.coverImage && m.coverImage.extraLarge) || null,
    creator: ((m.studios && m.studios.nodes) || []).map(s => s.name).join(', '),
    cast: [],
    isAdult: !!m.isAdult,
    isAnime: true
  };
}

async function searchTvMaze(query, year) {
  const results = await fetchJSON(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
  const candidates = (results || [])
    .slice(0, 6)
    .map(({ show }) => {
      const y = show.premiered ? parseInt(show.premiered.slice(0, 4), 10) : null;
      let score = bestTitleScore(query, [show.name]);
      if (year && y === year) score += 0.05;
      return { show, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return null;
  const show = best.show;

  // Imagen de fondo horizontal para el banner (si existe)
  let banner = null;
  try {
    const images = await fetchJSON(`https://api.tvmaze.com/shows/${show.id}/images`);
    const bg = images.find(i => i.type === 'background') || images.find(i => i.type === 'banner');
    banner = bg && bg.resolutions && (bg.resolutions.original || bg.resolutions.medium) ? (bg.resolutions.original || bg.resolutions.medium).url : null;
  } catch (_) { /* sin banner */ }

  const poster = show.image ? (show.image.original || show.image.medium) : null;
  return {
    score: best.score,
    source: 'tvmaze',
    sourceId: String(show.id),
    type: 'series', // TVMaze solo tiene series
    title: show.name,
    description: stripHtml(show.summary),
    // TVMaze ya viene en inglés
    en: { title: show.name, description: stripHtml(show.summary) || null },
    genres: show.genres || [],
    year: show.premiered ? parseInt(show.premiered.slice(0, 4), 10) : null,
    rating: show.rating && show.rating.average ? Math.round(show.rating.average * 10) : null,
    poster,
    banner: banner || poster,
    creator: (show.network && show.network.name) || (show.webChannel && show.webChannel.name) || '',
    cast: [],
    isAnime: (show.genres || []).includes('Anime')
  };
}

/**
 * Busca los metadatos de un nombre de carpeta.
 * Devuelve el mejor resultado (con su "score") o null si nada se parece lo suficiente.
 */
// manual: el nombre lo escribió el usuario (se respeta completo y se confía más en TMDB)
// Si un nombre en español no da resultados ("Mao Mao héroes de puro corazón"), se traduce
// al inglés y se busca otra vez ("Mao Mao Heroes of Pure Heart").
async function lookup(folderName, opts = {}) {
  const first = await lookupOnce(folderName, opts);
  if (first.match || !isProbablySpanishTitle(first.query)) return first;

  const tried = new Set([normalizeTitle(first.query)]);
  for (const variant of spanishTranslationVariants(first.query)) {
    const en = await translateToEnglish(variant);
    if (!en || tried.has(normalizeTitle(en))) continue;
    tried.add(normalizeTitle(en));
    console.log(`[metadata] "${first.query}" sin resultados; buscando en inglés: "${en}"`);
    const second = await lookupOnce(en, opts);
    if (second.match) return { query: first.query, match: { ...second.match, searchedAs: en } };
  }
  return first;
}

async function lookupOnce(folderName, { episodes = 0, manual = false } = {}) {
  const { query, year } = cleanFolderName(folderName, { keepSubtitle: manual });
  const tmdbKey = getTmdbKey();
  const results = [];

  const sources = [
    ...(tmdbKey ? [['TMDB', () => searchTmdb(query, year, tmdbKey, { episodes, manual })]] : []),
    ['AniList', () => searchAniList(query, year, { episodes: manual ? 0 : episodes })],
    ['TVMaze', () => searchTvMaze(query, year)]
  ];

  for (const [label, fn] of sources) {
    try {
      const r = await fn();
      if (r) results.push(r);
    } catch (err) {
      console.warn(`[metadata] ${label} falló para "${query}": ${err.message}`);
    }
  }

  // Preferencia en caso de empate: TMDB (español) > AniList (anime, más datos) > TVMaze
  const priority = { tmdb: 0.04, anilist: 0.02, tvmaze: 0 };
  results.sort((a, b) => (b.score + priority[b.source]) - (a.score + priority[a.source]));
  const best = results[0];
  if (!best || best.score < MIN_SIMILARITY) return { query, match: null };

  // Encontrada en TMDB: si AniList también la reconoce (mismo año), es anime y sus
  // géneros son más precisos que los de TMDB ("Sci-Fi & Fantasy" para casi todo)
  if (best.source === 'tmdb') {
    // Ambos años deben existir y coincidir: así no se mezclan dos series distintas con el mismo nombre
    const ani = results.find(r => r.source === 'anilist' && r.score >= 0.85 &&
      r.year && best.year && Math.abs(r.year - best.year) <= 1);
    if (ani) {
      return { query, match: { ...best, genres: ani.genres, isAnime: true, isAdult: ani.isAdult } };
    }
    return { query, match: best };
  }

  // La serie la identificó AniList o TVMaze (p. ej. por un nombre mal escrito o en japonés):
  // buscar en TMDB por su título oficial para traer la información en español.
  if (tmdbKey && best.source !== 'tmdb') {
    // Probar con cada nombre conocido (inglés, japonés...)
    const titles = [...new Set([best.title, ...(best.altTitles || [])])];
    for (const t of titles) {
      try {
        const es = await searchTmdb(t, best.year, tmdbKey, { episodes, manual, relaxed: true });
        const sameYear = !best.year || !es || !es.year || Math.abs(es.year - best.year) <= 1;
        if (es && es.score >= 0.85 && sameYear) {
          return { query, match: mergeWithTmdb(best, es) };
        }
      } catch (err) {
        console.warn(`[metadata] TMDB (2.ª búsqueda) falló para "${t}": ${err.message}`);
      }
    }
  }
  return { query, match: best };
}

// Combina la serie identificada (AniList/TVMaze) con los textos en español de TMDB
function mergeWithTmdb(found, es) {
  return {
    ...found,
    source: `${found.source}+tmdb`,
    sourceId: `${found.sourceId}|${es.sourceId}`,
    type: found.type || es.type,
    title: es.title || found.title,
    description: es.description || found.description,
    en: {
      title: (es.en && es.en.title) || (found.en && found.en.title) || null,
      description: (es.en && es.en.description) || (found.en && found.en.description) || null
    },
    // En anime, los géneros de AniList son más precisos (Deportes, Psicológico...);
    // en el resto, los de TMDB (que ya vienen en español)
    genres: found.source === 'anilist'
      ? found.genres
      : (es.genres.length ? es.genres : found.genres),
    year: found.year || es.year,
    rating: es.rating || found.rating,
    poster: es.poster || found.poster,
    banner: es.banner || found.banner,
    creator: es.creator || found.creator,
    cast: es.cast && es.cast.length ? es.cast : found.cast,
    isAnime: found.isAnime || es.isAnime
  };
}

/* ---------------- Traducción al español ---------------- */
// Las descripciones que llegan en inglés (AniList/TVMaze, o TMDB sin sinopsis en español)
// se traducen en local con el modelo Marian opus-mt-en-es (Transformers.js + ONNX), que va
// dentro de la app en models/: sin internet, sin clave y sin límite diario.
// Cada traducción se guarda en data/translation-cache.json y no se vuelve a hacer.

const EN_WORDS = new Set(['the', 'and', 'of', 'to', 'is', 'in', 'his', 'her', 'he', 'she', 'with', 'that', 'for', 'are', 'was', 'who', 'they', 'their', 'from', 'when', 'which', 'has', 'have', 'an', 'into', 'after', 'will', 'its', 'by', 'but']);
const ES_WORDS = new Set(['el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'un', 'una', 'es', 'su', 'por', 'con', 'para', 'se', 'del', 'al', 'sus', 'como', 'pero', 'más', 'lo', 'le', 'ha', 'este', 'esta', 'cuando', 'sin', 'donde']);

// ¿El texto está en inglés? Cuenta palabras muy comunes de cada idioma
function isProbablyEnglish(text) {
  if (!text || text.length < 20) return false;
  const words = text.toLowerCase().match(/[a-záéíóúñü']+/g) || [];
  let en = 0, es = 0;
  words.forEach(w => {
    if (EN_WORDS.has(w)) en++;
    if (ES_WORDS.has(w)) es++;
  });
  return en >= 3 && en > es * 1.5;
}

// Divide un párrafo en trozos de hasta `max` caracteres sin cortar frases
// (el modelo traduce mejor y más rápido los textos cortos)
function splitForTranslation(paragraph, max = 450) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [paragraph];
  const chunks = [];
  let cur = '';
  for (let s of sentences) {
    // Frase más larga que el límite: cortar por palabras
    while (s.length > max) {
      const cut = s.lastIndexOf(' ', max);
      const piece = s.slice(0, cut > 0 ? cut : max);
      if (cur) { chunks.push(cur.trim()); cur = ''; }
      chunks.push(piece.trim());
      s = s.slice(piece.length);
    }
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

const TRANSLATION_MODEL = 'Xenova/opus-mt-en-es';
// Español → inglés: para buscar en inglés un título escrito en español que no se encontró
const TRANSLATION_MODEL_ES_EN = 'Xenova/opus-mt-es-en';
// En la app instalada models/ queda fuera del .asar (asarUnpack) para que ONNX pueda leerlo
const MODELS_DIR = path.join(__dirname.replace(/app\.asar(?=[\\/]|$)/, 'app.asar.unpacked'), 'models');

const translatorPromises = {};

// Carga cada modelo una sola vez (≈1–2 s) y lo reutiliza en todas las traducciones
function getTranslator(model = TRANSLATION_MODEL) {
  if (!translatorPromises[model]) {
    translatorPromises[model] = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.localModelPath = MODELS_DIR;
      env.allowLocalModels = true;
      env.allowRemoteModels = false; // nunca descargar: el modelo viene con la app
      return pipeline('translation', model, { dtype: 'q8' });
    })();
    // Si falla (modelo ausente o dañado) se podrá reintentar en la próxima traducción
    translatorPromises[model].catch(() => { delete translatorPromises[model]; });
  }
  return translatorPromises[model];
}

async function translateChunk(text, model) {
  const translate = await getTranslator(model);
  const [result] = await translate(text);
  const out = result && result.translation_text;
  if (!out) throw new Error('el modelo no devolvió traducción');
  return out;
}

/**
 * Traduce un texto del inglés al español. Devuelve el texto traducido,
 * o null si no se pudo (modelo ausente o dañado).
 */
async function translateToSpanish(text) {
  if (!text) return null;
  const cache = readJSON(TRANSLATION_CACHE_FILE, {});
  if (cache[text]) return cache[text];

  try {
    const paragraphs = text.split(/\n{2,}/);
    const translated = [];
    for (const p of paragraphs) {
      const parts = [];
      // Los saltos de línea sueltos dentro de un párrafo se vuelven espacios
      for (const chunk of splitForTranslation(p.replace(/\s*\n\s*/g, ' '))) {
        parts.push(await translateChunk(chunk));
      }
      translated.push(parts.join(' '));
    }
    const result = translated.join('\n\n');
    cache[text] = result;
    writeJSON(TRANSLATION_CACHE_FILE, cache);
    return result;
  } catch (err) {
    console.warn(`[metadata] No se pudo traducir: ${err.message}`);
    return null;
  }
}

// Palabras que se suelen escribir sin tilde en los nombres de carpeta o en la búsqueda.
// Sin la tilde el modelo se confunde ("heroes de puro corazon" → "350 pure heart").
const ES_ACCENTS = {
  heroe: 'héroe', heroes: 'héroes', corazon: 'corazón', mision: 'misión',
  cancion: 'canción', pasion: 'pasión', dragon: 'dragón', jardin: 'jardín', ultimo: 'último',
  ultima: 'última', angel: 'ángel', mas: 'más', tambien: 'también', musica: 'música',
  magico: 'mágico', magica: 'mágica', magicos: 'mágicos', magicas: 'mágicas', fantasia: 'fantasía',
  policia: 'policía', dias: 'días', arbol: 'árbol', leon: 'león', raton: 'ratón', camion: 'camión',
  espiritu: 'espíritu', espiritus: 'espíritus', publico: 'público', pequeno: 'pequeño', pequena: 'pequeña',
  nino: 'niño', nina: 'niña', ninos: 'niños', ninas: 'niñas', ano: 'año', anos: 'años', senor: 'señor',
  senora: 'señora', sueno: 'sueño', suenos: 'sueños', estacion: 'estación', nacion: 'nación',
  revolucion: 'revolución', creacion: 'creación', destruccion: 'destrucción', guardian: 'guardián',
  titan: 'titán', rapido: 'rápido', rapidos: 'rápidos', oceano: 'océano', tunel: 'túnel',
  heroina: 'heroína', camara: 'cámara', pajaro: 'pájaro', pajaros: 'pájaros', aguila: 'águila',
  ultimos: 'últimos', epico: 'épico', epica: 'épica', unico: 'único', unica: 'única', proximo: 'próximo',
  invasion: 'invasión', dimension: 'dimensión', expedicion: 'expedición', ilusion: 'ilusión',
  simbolo: 'símbolo', codigo: 'código', panico: 'pánico', jovenes: 'jóvenes'
};

// Formas de escribir un título en español para el traductor, con las tildes que faltan:
// primero "Solo la primera con mayúscula" ("La casa del búho" → "Owl house") y, si con esa
// no se encuentra, "Cada Palabra Con Mayúscula" ("Mao Mao Héroes De Puro Corazón" →
// "Mao Mao Heroes of Pure Heart"; en minúsculas el modelo daba "heroes with pure heart")
function spanishTranslationVariants(text) {
  const fixed = String(text || '').trim().replace(/[a-zñ]+/gi, (w) => ES_ACCENTS[w.toLowerCase()] || w);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  return [...new Set([cap(fixed), fixed.replace(/[^\s]+/g, cap)])].filter(Boolean);
}

/**
 * Traduce un título corto del español al inglés (con caché). Devuelve null si no se pudo.
 */
async function translateToEnglish(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const cacheKey = `es>en:${t}`;
  const cache = readJSON(TRANSLATION_CACHE_FILE, {});
  if (cache[cacheKey]) return cache[cacheKey];
  try {
    const out = (await translateChunk(t, TRANSLATION_MODEL_ES_EN)).trim().replace(/\.+$/, '');
    if (!out) return null;
    const fresh = readJSON(TRANSLATION_CACHE_FILE, {});
    fresh[cacheKey] = out;
    writeJSON(TRANSLATION_CACHE_FILE, fresh);
    return out;
  } catch (err) {
    console.warn(`[metadata] No se pudo traducir al inglés: ${err.message}`);
    return null;
  }
}

// ¿El título parece estar en español? (palabras de enlace del español, tildes o ñ)
function isProbablySpanishTitle(title) {
  const t = String(title || '').toLowerCase();
  if (/[áéíóúñ¿¡]/.test(t)) return true;
  const words = t.match(/[a-záéíóúñü']+/g) || [];
  if (words.some(w => ROMAJI_WORDS.has(w))) return false;
  return words.some(w => ES_WORDS.has(w));
}

// Palabras de enlace que delatan un título en inglés ("The Owl House", "Attack on Titan").
// Solo palabras de enlace: un nombre propio como "Chainsaw Man" se deja tal cual.
const EN_TITLE_WORDS = new Set(['the', 'of', 'and', 'on', 'in', 'at', 'a', 'an', 'to', 'my', 'your', 'our', 'his', 'her', 'their', 'with', 'from', 'for', 'is', 'are', 'into', 'under', 'over', 'beyond', 'without', 'who', 'what', 'when', 'how', 'why', 'this', 'that']);
// Partículas del japonés en romaji ("Sen to Chihiro no Kamikakushi"): no es inglés
const ROMAJI_WORDS = new Set(['no', 'wa', 'ga', 'wo', 'ni', 'e', 'kun', 'chan', 'san', 'sama']);

// ¿El título está en inglés? (los títulos son cortos: isProbablyEnglish no sirve)
function isProbablyEnglishTitle(title) {
  const t = String(title || '').trim();
  if (/[áéíóúñü¿¡]/i.test(t)) return false;
  const words = t.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length < 2) return false;
  if (words.some(w => ROMAJI_WORDS.has(w) || ES_WORDS.has(w))) return false;
  return words.some(w => EN_TITLE_WORDS.has(w));
}

/**
 * Devuelve el título en español si está en inglés; si no (o si no se pudo traducir),
 * el mismo título.
 */
// forUser: título escrito a mano. Con la app en inglés se guarda tal cual (se ve en los dos idiomas).
async function titleInSpanish(title, { forUser = false } = {}) {
  const t = String(title || '').trim();
  const cfg = readJSON(CONFIG_FILE, {});
  // Desactivado en Configuración → Biblioteca
  if (cfg.translateTitles === false) return t;
  if (forUser && cfg.language === 'en') return t;
  if (!isProbablyEnglishTitle(t)) return t;
  const es = await translateToSpanish(t);
  if (!es) return t;
  // El modelo suele cerrar con punto aunque el título no lo lleve
  const clean = /[.!?]$/.test(t) ? es.trim() : es.trim().replace(/\.+$/, '');
  return clean || t;
}

/* ---------------- Imágenes locales ---------------- */
// Cada póster/banner se descarga una sola vez a data/images y la app lo carga desde ahí
// (más rápido y funciona sin internet). El nombre lleva un hash de la URL de origen:
// si la imagen cambia, se descarga la nueva y se borra la anterior.

const isRemote = (url) => /^https?:\/\//i.test(url || '');

// ¿La imagen local ("/images/archivo.jpg") existe en el disco?
function localImageExists(url) {
  if (!url || !url.startsWith('/images/')) return false;
  return fs.existsSync(path.join(IMAGES_DIR, path.basename(url)));
}

function shortHash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/**
 * Descarga una imagen y devuelve su ruta local ("/images/<archivo>"),
 * o null si no se pudo (se seguirá usando la URL de internet).
 */
async function downloadImage(url, seriesId, kind) {
  if (!isRemote(url)) return null;
  const safeId = String(seriesId).replace(/[^a-z0-9-]/gi, '-').slice(0, 60);
  const prefix = `${safeId}-${kind}-`;
  const base = prefix + shortHash(url);

  try {
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

    // Ya descargada antes
    const existing = fs.readdirSync(IMAGES_DIR).find(f => f.startsWith(base + '.'));
    if (existing) return `/images/${existing}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!type.startsWith('image/')) throw new Error(`no es una imagen (${type || 'sin tipo'})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const file = `${base}.${IMAGE_EXT[type] || 'jpg'}`;
    fs.writeFileSync(path.join(IMAGES_DIR, file), buffer);

    // Borrar versiones anteriores de esta misma imagen
    fs.readdirSync(IMAGES_DIR)
      .filter(f => f.startsWith(prefix) && f !== file)
      .forEach(f => { try { fs.unlinkSync(path.join(IMAGES_DIR, f)); } catch (_) { /* en uso */ } });

    return `/images/${file}`;
  } catch (err) {
    console.warn(`[metadata] No se pudo descargar la imagen (${kind}) de "${seriesId}": ${err.message}`);
    return null;
  }
}

// Descarga el póster y el banner de un resultado y los cambia por las rutas locales
async function localizeImages(match, seriesId) {
  const posterUrl = isRemote(match.poster) ? match.poster : match.posterUrl;
  const bannerUrl = isRemote(match.banner) ? match.banner : match.bannerUrl;
  const poster = posterUrl ? await downloadImage(posterUrl, seriesId, 'poster') : null;
  const banner = bannerUrl
    ? (bannerUrl === posterUrl ? poster : await downloadImage(bannerUrl, seriesId, 'banner'))
    : null;
  return {
    ...match,
    posterUrl, bannerUrl,
    poster: poster || posterUrl || match.poster,
    banner: banner || bannerUrl || match.banner
  };
}

/* ---------------- Campos editados por el usuario ---------------- */
// Lo que el usuario edita a mano queda en series.lockedFields y ninguna búsqueda,
// traducción, descarga ni reescaneo lo vuelve a cambiar.
const EDITABLE_FIELDS = ['title', 'description', 'genres', 'poster', 'banner', 'type'];

// Tipo por el número de videos, cuando no hay información: 1 video = película
function guessType(series) {
  const files = (series.seasons || []).reduce((n, sn) => n + (sn.episodes || []).length, 0);
  return files === 1 ? 'movie' : 'series';
}

// La serie ya está identificada como anime (etiqueta "Anime" en sus géneros)
const isAnimeSeries = (series) => ((series && series.genres) || []).includes('Anime');

const isLocked = (series, field) => Array.isArray(series && series.lockedFields) && series.lockedFields.includes(field);

/**
 * Guarda una imagen elegida por el usuario: una imagen subida desde el PC ("data:image/...;base64,...")
 * o un enlace de internet. Devuelve la ruta local ("/images/...").
 * Usa el prefijo "<id>-user<tipo>-" para que las descargas automáticas nunca la borren.
 */
async function saveUserImage(value, seriesId, kind) {
  const safeId = String(seriesId).replace(/[^a-z0-9-]/gi, '-').slice(0, 60);
  const userKind = `user${kind}`;

  if (isRemote(value)) {
    const local = await downloadImage(value, seriesId, userKind);
    if (!local) throw new Error('No se pudo descargar la imagen de ese enlace');
    return local;
  }

  const m = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i.exec(value || '');
  if (!m) throw new Error('Formato de imagen no válido');
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > 12 * 1024 * 1024) throw new Error('La imagen pesa demasiado (máx. 12 MB)');

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const prefix = `${safeId}-${userKind}-`;
  const file = `${prefix}${shortHash(m[2].slice(0, 2000) + buffer.length)}.${IMAGE_EXT[m[1].toLowerCase()] || 'jpg'}`;
  fs.writeFileSync(path.join(IMAGES_DIR, file), buffer);
  // Borrar la imagen anterior del usuario para esta serie
  fs.readdirSync(IMAGES_DIR)
    .filter(f => f.startsWith(prefix) && f !== file)
    .forEach(f => { try { fs.unlinkSync(path.join(IMAGES_DIR, f)); } catch (_) { /* en uso */ } });
  return `/images/${file}`;
}

/**
 * Aplica los cambios hechos a mano por el usuario.
 * edits: { title, description, genres, poster, banner } (solo los que cambió) → quedan bloqueados.
 * reset: ['description', ...] → vuelven a ser automáticos (se desbloquean).
 * Devuelve { series, needsRefresh } (needsRefresh: hay que volver a buscar los valores automáticos).
 */
async function applyUserEdits(series, edits = {}, reset = []) {
  const updated = { ...series };
  const locked = new Set(series.lockedFields || []);

  for (const field of EDITABLE_FIELDS) {
    if (!(field in edits)) continue;
    let value = edits[field];

    if (field === 'title' || field === 'description') {
      value = String(value || '').trim();
      if (field === 'title' && !value) throw new Error('El título no puede estar vacío');
    } else if (field === 'genres') {
      const list = Array.isArray(value) ? value : String(value || '').split(',');
      value = [...new Set(list.map(g => String(g).trim()).filter(Boolean))].slice(0, 10);
      // Mantener la etiqueta interna de series locales (la usa la fila "Almacenamiento Local")
      if ((series.genres || []).includes('Medios Locales') && !value.includes('Medios Locales')) value.push('Medios Locales');
    } else if (field === 'poster' || field === 'banner') {
      value = await saveUserImage(value, series.id, field);
    } else if (field === 'type') {
      if (value !== 'movie' && value !== 'series') throw new Error('Tipo no válido');
    }

    updated[field] = value;
    locked.add(field);
  }

  let needsRefresh = false;
  for (const field of reset || []) {
    if (!EDITABLE_FIELDS.includes(field) || !locked.has(field)) continue;
    locked.delete(field);
    needsRefresh = true;
    // Serie sin información automática: el título vuelve a ser el nombre de la carpeta
    if (field === 'title' && !(series.metadata && series.metadata.source)) {
      updated.title = series.folderName || series.title;
    }
    // Tipo: vuelve al detectado (se recalcula al buscar; mientras, por número de videos)
    if (field === 'type') updated.type = guessType(series);
    // Quitar la imagen propia: la automática se vuelve a descargar
    if ((field === 'poster' || field === 'banner') && String(updated[field] || '').includes(`-user${field}-`)) {
      try { fs.unlinkSync(path.join(IMAGES_DIR, path.basename(updated[field]))); } catch (_) { /* ya no estaba */ }
    }
  }

  updated.lockedFields = [...locked];
  if (!updated.lockedFields.length) delete updated.lockedFields;
  return { series: updated, needsRefresh };
}

/* ---------------- Aplicar a una serie ---------------- */

// Una serie es local si alguno de sus episodios es un archivo del PC
function isLocalSeries(series) {
  return (series.seasons || []).some(sn => (sn.episodes || []).some(ep => ep.localPath)) ||
    (series.genres || []).includes('Medios Locales');
}

function applyMetadata(series, folderName, match) {
  const updated = { ...series, folderName };
  // Los formatos (MP4/MKV/WEBM) no son géneros: se quitan de las etiquetas
  const baseTags = (series.genres || []).filter(g => !FORMAT_TAGS.includes(String(g).toUpperCase()));

  if (match) {
    let genres = translateGenres(match.genres);
    // Etiqueta "Anime" primero cuando corresponde (TMDB solo dice "Animación")
    if (match.isAnime) {
      genres = ['Anime', ...genres.filter(g => g !== 'Anime' && g !== 'Animación')];
    }
    genres = genres.slice(0, 6);
    if (baseTags.includes('Medios Locales') && !genres.includes('Medios Locales')) genres.push('Medios Locales');

    // Los campos editados por el usuario no se tocan
    if (!isLocked(series, 'title')) updated.title = match.title || series.title;
    if (!isLocked(series, 'description')) updated.description = match.description || series.description;
    if (!isLocked(series, 'genres')) updated.genres = genres.length ? genres : baseTags;
    if (match.year) updated.year = match.year;
    // Valoración de la serie (0–100) mostrada como nota sobre 10: "★ 8.3"
    if (match.rating) updated.match = `★ ${(match.rating / 10).toFixed(1)}`;
    if (match.isAdult) updated.rating = '18+';
    if (!isLocked(series, 'type')) updated.type = match.type || guessType(series);
    if (match.poster && !isLocked(series, 'poster')) updated.poster = match.poster;
    if (match.banner && !isLocked(series, 'banner')) updated.banner = match.banner;
    // Título y descripción en inglés (la app en inglés los muestra; ver localizeSeries)
    if (match.en && (match.en.title || match.en.description)) {
      updated.en = { title: match.en.title || null, description: match.en.description || null };
    }
    if (match.creator) updated.creator = match.creator;
    if (match.cast && match.cast.length) updated.cast = match.cast;
    updated.metadata = {
      version: METADATA_VERSION,
      source: match.source,
      sourceId: match.sourceId,
      tmdbTried: !!getTmdbKey(),
      translated: !!match.translated, // la descripción se tradujo del inglés
      // URLs de origen de las imágenes (las locales están en data/images)
      posterUrl: match.posterUrl || (isRemote(match.poster) ? match.poster : null),
      bannerUrl: match.bannerUrl || (isRemote(match.banner) ? match.banner : null),
      matchedTitle: match.title,
      similarity: Math.min(1, Math.round(match.score * 100) / 100),
      fetchedAt: new Date().toISOString()
    };
  } else {
    if (!isLocked(series, 'genres')) updated.genres = baseTags.length ? baseTags : ['Medios Locales'];
    if (!isLocked(series, 'type')) updated.type = guessType(series);
    updated.metadata = { version: METADATA_VERSION, source: null, tmdbTried: !!getTmdbKey(), fetchedAt: new Date().toISOString() };
  }
  return updated;
}

/* ---------------- Proceso en segundo plano ---------------- */

const job = {
  running: false,
  total: 0,
  done: 0,
  found: 0,
  current: null,
  finishedAt: null
};

function getStatus() {
  return { ...job };
}

function needsMetadata(series, force) {
  if (!isLocalSeries(series)) return false;
  if (force) return true;
  if (!series.metadata) return true;
  // Procesada con una versión anterior de la búsqueda: volver a hacerlo
  if ((series.metadata.version || 1) < METADATA_VERSION) return true;
  // Se agregó una clave de TMDB: buscar una vez más para tener la información en español
  if (getTmdbKey() && !series.metadata.tmdbTried) return true;
  // Quedó en inglés (p. ej. traducida antes del modelo local o si este falló): reintentar la traducción
  // (salvo que la descripción la haya escrito el usuario)
  if (series.metadata.source && !isLocked(series, 'description') && isProbablyEnglish(series.description)) return true;
  // Imágenes aún de internet, o la copia local se borró: descargarlas (las del usuario no)
  if (series.metadata.source) {
    for (const kind of ['poster', 'banner']) {
      if (isLocked(series, kind)) continue;
      const url = series[kind];
      if (isRemote(url) || (url && url.startsWith('/images/') && !localImageExists(url))) return true;
    }
  }
  // Sin resultado la última vez: reintentar pasados unos días
  if (!series.metadata.source) {
    const age = Date.now() - new Date(series.metadata.fetchedAt || 0).getTime();
    return age > RETRY_NOT_FOUND_DAYS * 24 * 3600 * 1000;
  }
  return false;
}

/**
 * Busca los metadatos de todas las series locales que aún no los tienen.
 * dataFile: ruta de series.json. ids: limitar a estas series (opcional).
 * Devuelve false si ya había un proceso en marcha.
 */
/**
 * Busca la información de una serie con el nombre `query`, traduce la descripción si
 * viene en inglés y descarga las imágenes. Respeta los campos editados por el usuario.
 * Devuelve { query, match } (match = null si no se encontró nada).
 */
async function fetchMatch(s, query, { force = false, manual = false, onStep = () => {} } = {}) {
  const cache = readJSON(CACHE_FILE, {});
  // Con clave de TMDB se cachea aparte (los resultados sin TMDB están en inglés);
  // las búsquedas manuales también, porque se buscan con otras reglas
  const cacheKey = (getTmdbKey() ? 'tmdb:' : '') + (manual ? 'manual:' : '') +
    cleanFolderName(query, { keepSubtitle: manual }).query.toLowerCase();

  let result;
  const cached = cache[cacheKey];
  // La caché solo vale si se guardó con la versión actual de la búsqueda
  const cachedFresh = cached && cached.version === METADATA_VERSION && (cached.match ||
    Date.now() - new Date(cached.at).getTime() < RETRY_NOT_FOUND_DAYS * 24 * 3600 * 1000);
  if (cachedFresh && !force) {
    result = cached;
  } else {
    try {
      const episodes = (s.seasons || []).reduce((n, sn) => n + (sn.episodes || []).length, 0);
      result = await lookup(query, { episodes, manual });
      const fresh = readJSON(CACHE_FILE, {});
      fresh[cacheKey] = { ...result, version: METADATA_VERSION, at: new Date().toISOString() };
      writeJSON(CACHE_FILE, fresh);
    } catch (err) {
      console.warn(`[metadata] Error con "${query}": ${err.message}`);
      result = { query, match: null };
    }
    await sleep(REQUEST_DELAY_MS);
  }

  // Descripción en inglés → traducirla al español (no hace falta si el usuario escribió la suya)
  if (result.match && !isLocked(s, 'description') && isProbablyEnglish(result.match.description)) {
    onStep('traduciendo');
    const es = await translateToSpanish(result.match.description);
    if (es) result = { ...result, match: { ...result.match, description: es, translated: true } };
  }

  // Título buscado a mano que llegó en inglés (de cualquier fuente, también TMDB) → al español.
  // Salvo en el anime: ahí se conserva el nombre en inglés/romaji
  if (result.match && manual && !isLocked(s, 'title') && !result.match.isAnime) {
    const es = await titleInSpanish(result.match.title);
    if (es !== result.match.title) result = { ...result, match: { ...result.match, title: es } };
  }

  // Descargar el póster y el banner a data/images (no si el usuario puso los suyos)
  if (result.match) {
    onStep('imágenes');
    const m = { ...result.match };
    if (isLocked(s, 'poster')) { m.poster = null; m.posterUrl = null; }
    if (isLocked(s, 'banner')) { m.banner = null; m.bannerUrl = null; }
    result = { ...result, match: await localizeImages(m, s.id) };
  }
  return result;
}

/**
 * Vuelve a buscar UNA serie con el nombre que escribió el usuario y guarda lo encontrado
 * (descripción, géneros, póster, banner...). El nombre queda guardado en series.searchQuery
 * para las búsquedas automáticas futuras. Devuelve { series, match }.
 */
async function researchSeries(dataFile, seriesId, query, { titleIfNotFound = null } = {}) {
  const data = readJSON(dataFile, { series: [] });
  const s = data.series.find(x => x.id === seriesId);
  if (!s) throw new Error('Serie no encontrada');

  // El usuario pidió buscar de nuevo: consultar las APIs, no la caché
  const result = await fetchMatch(s, query, { force: true, manual: true });

  // Volver a leer antes de guardar (la búsqueda en segundo plano pudo escribir mientras tanto)
  const fresh = readJSON(dataFile, { series: [] });
  const idx = fresh.series.findIndex(x => x.id === seriesId);
  if (idx === -1) throw new Error('Serie no encontrada');
  let updated = { ...fresh.series[idx] };
  // Si no se encontró nada, se conserva la información anterior (y la búsqueda anterior)
  if (result.match) {
    updated.searchQuery = query;
    // El título (si no está bloqueado) pasa a ser el nombre oficial encontrado
    updated = applyMetadata(updated, updated.folderName || updated.title, result.match);
  } else if (titleIfNotFound) {
    // Sin resultados: se queda el título que escribió el usuario (en español si no es anime),
    // como editado a mano
    updated.title = isAnimeSeries(updated) ? titleIfNotFound : await titleInSpanish(titleIfNotFound, { forUser: true });
    updated.lockedFields = [...new Set([...(updated.lockedFields || []), 'title'])];
  }
  fresh.series[idx] = updated;
  writeJSON(dataFile, fresh);

  console.log(`[metadata] Búsqueda manual "${query}" → ${result.match ? `${result.match.title} (${result.match.source})` : 'sin coincidencia'}`);
  return { series: updated, match: result.match };
}

// force: volver a consultar las APIs aunque haya caché.
// revisit: volver a procesar las series indicadas aunque ya tengan datos, usando la caché
//          (p. ej. tras "Restaurar automático" en un campo editado).
function startRefresh(dataFile, { force = false, ids = null, revisit = false } = {}) {
  if (job.running) {
    // Ya hay una búsqueda en marcha: al terminar se vuelve a revisar (p. ej. series recién escaneadas)
    job.rerun = true;
    if (revisit && ids) job.pendingRevisit = [...new Set([...(job.pendingRevisit || []), ...ids])];
    return false;
  }
  job.rerun = false;

  const data = readJSON(dataFile, { series: [] });
  const pending = data.series.filter(s =>
    (!ids || ids.includes(s.id)) && needsMetadata(s, force || revisit)
  );

  Object.assign(job, { running: pending.length > 0, total: pending.length, done: 0, found: 0, current: null, finishedAt: null });
  if (pending.length === 0) {
    job.finishedAt = new Date().toISOString();
    return true;
  }

  (async () => {
    for (const s of pending) {
      const folderName = s.folderName || s.title;
      // Si el usuario buscó la serie con otro nombre, se usa ese
      const query = s.searchQuery || folderName;
      job.current = query;

      const result = await fetchMatch(s, query, {
        force,
        manual: !!s.searchQuery,
        onStep: (step) => { job.current = `${query} (${step})`; }
      });

      // Volver a leer el archivo justo antes de guardar (pudo cambiar mientras se buscaba)
      const fresh = readJSON(dataFile, { series: [] });
      const idx = fresh.series.findIndex(x => x.id === s.id);
      if (idx !== -1) {
        fresh.series[idx] = applyMetadata(fresh.series[idx], folderName, result.match);
        writeJSON(dataFile, fresh);
      }

      if (result.match) job.found++;
      job.done++;
      console.log(`[metadata] ${job.done}/${job.total} "${query}" → ${result.match ? `${result.match.title} (${result.match.source}, ${Math.round(result.match.score * 100)}%)` : 'sin coincidencia'}`);
    }
    job.running = false;
    job.current = null;
    job.finishedAt = new Date().toISOString();
    if (job.pendingRevisit && job.pendingRevisit.length) {
      const revisitIds = job.pendingRevisit;
      job.pendingRevisit = [];
      startRefresh(dataFile, { ids: revisitIds, revisit: true });
    } else if (job.rerun) {
      startRefresh(dataFile);
    }
  })().catch(err => {
    console.error('[metadata] Error en el proceso:', err);
    job.running = false;
  });

  return true;
}

// Campos que se conservan al volver a escanear una serie que ya tenía metadatos
const PRESERVED_FIELDS = ['title', 'description', 'en', 'genres', 'year', 'match', 'rating', 'poster', 'banner', 'creator', 'cast', 'metadata', 'folderName', 'lockedFields', 'searchQuery', 'type'];

function preserveMetadata(scanned, existing) {
  // Se conserva si ya se había encontrado su información o si el usuario editó algo.
  // Si no (p. ej. una vieja "Serie Local" sin datos), se usa lo escaneado y se vuelve a buscar.
  const hadInfo = existing && existing.metadata && existing.metadata.source;
  if (!existing || (!hadInfo && !(existing.lockedFields || []).length)) return scanned;
  const merged = { ...scanned };
  PRESERVED_FIELDS.forEach(f => {
    if (existing[f] !== undefined) merged[f] = existing[f];
  });
  return merged;
}

module.exports = {
  cleanFolderName,
  lookup,
  isProbablyEnglish,
  translateToSpanish,
  titleInSpanish,
  isAnimeSeries,
  applyUserEdits,
  researchSeries,
  startRefresh,
  getStatus,
  preserveMetadata,
  getTmdbKey,
  setTmdbKey
};
