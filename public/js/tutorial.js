// Animación "cómo preparar tus videos" de la ventana Escanear PC.
// Funciona como un video: todo se dibuja a partir del tiempo actual (render(t)),
// así se puede pausar, saltar a un capítulo o repetir sin estados raros.
(function () {
  const STAGE_W = 540;

  const CHAPTERS = [
    { start: 0, label: '1 · Carpeta' },
    { start: 3.6, label: '2 · Nombre' },
    { start: 7, label: '3 · Videos' },
    { start: 11.5, label: '4 · Escanear' },
    { start: 16.5, label: '5 · Temporadas' },
    { start: 24.5, label: '✕ Así no', bad: true }
  ];
  // Subtítulos (el capítulo "Así no" tiene uno por cada error)
  const CAPTIONS = [
    { start: 0, badge: '1', text: 'Crea una carpeta: clic derecho → Nuevo → Carpeta' },
    { start: 3.6, badge: '2', text: 'Ponle el nombre de la serie' },
    { start: 7, badge: '3', text: 'Mete los videos dentro de la carpeta' },
    { start: 11.5, badge: '4', text: 'Pulsa «Escanear PC» y ¡listo!' },
    { start: 16.5, badge: '5', text: 'Temporada 1: deja sus videos sueltos en la carpeta' },
    { start: 19.1, badge: '5', text: 'Temporada 2: crea una carpeta y mete ahí sus videos' },
    { start: 21.3, badge: '5', text: 'En la app, cada video sale en su temporada' },
    { start: 24.5, badge: '✕', bad: true, text: 'No dejes los videos sueltos y mezclados' },
    { start: 28.5, badge: '✕', bad: true, text: 'No uses un nombre cualquiera: pon el de la serie' },
    { start: 32.5, badge: '✕', bad: true, text: 'Solo se detectan videos MP4, MKV y WEBM' }
  ];
  // Escena de temporadas (segundos desde que empieza): cuándo aparece cada fila del árbol
  const SEASONS_START = 16.5;
  const TREE_ROWS = [0, 0.5, 0.8, 2.8, 3.4, 3.7];
  const S = { brace1: 1.3, brace2: 4.2, app: 4.8, showT2: 6.2 };
  // Cada error del capítulo "Así no" dura 4 s
  const DONT_START = 24.5, DONT_LEN = 4;
  const END = 36.5;

  // Momentos clave (segundos)
  const T = {
    rightClick: 1.2, menuOpen: 1.25, submenuOpen: 1.9, folderClick: 2.45, folderPop: 2.7,
    typeStart: 3.8, typeStep: 0.07, enter: 6.2,
    dragStart: 7.2, dragGap: 1.4,
    sceneSwap: 11.5, scanClick: 12.7, cardPop: 14.0, done: 14.4
  };
  const NAME = 'Mao Mao Héroes de Puro Corazón';

  // Posiciones (px dentro del escenario de 540×304)
  const FOLDER = { x: 106, y: 119 };
  const FILE_GRAB = (i) => ({ x: 378, y: 88 + 50 * i });

  // Recorrido del cursor: [tiempo, x, y]
  const path = [
    [0, 270, 250], [1.1, 150, 110],
    [1.6, 150, 110], [1.8, 200, 184], [2.0, 200, 184], [2.3, 340, 184],
    [2.7, 340, 184], [3.4, 230, 230],
    [7.0, 230, 230]
  ];
  for (let i = 0; i < 3; i++) {
    const s = T.dragStart + T.dragGap * i;
    const g = FILE_GRAB(i);
    path.push([s + 0.4, g.x, g.y], [s + 0.45, g.x, g.y], [s + 1.1, FOLDER.x, FOLDER.y], [s + 1.2, FOLDER.x, FOLDER.y]);
  }
  path.push(
    [T.sceneSwap, 300, 200], [12.5, 472, 21], [12.9, 472, 21], [14.6, 420, 255], [END, 420, 255]
  );

  const clicks = [T.rightClick, T.folderClick, T.scanClick];
  for (let i = 0; i < 3; i++) clicks.push(T.dragStart + T.dragGap * i + 0.45);

  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const easeOutBack = (p) => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function cursorAt(t) {
    if (t <= path[0][0]) return { x: path[0][1], y: path[0][2] };
    for (let i = 1; i < path.length; i++) {
      const [t1, x1, y1] = path[i];
      if (t <= t1) {
        const [t0, x0, y0] = path[i - 1];
        const p = ease(clamp01((t - t0) / (t1 - t0 || 1)));
        return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p };
      }
    }
    const last = path[path.length - 1];
    return { x: last[1], y: last[2] };
  }

  let el = null;
  let t = 0, playing = false, raf = 0, lastFrame = 0, lastChapter = -1;

  function setup() {
    if (el) return true;
    const root = document.getElementById('tuto');
    if (!root) return false;
    el = {
      root,
      frame: document.getElementById('tutoFrame'),
      stage: document.getElementById('tutoStage'),
      explorer: document.getElementById('tutoExplorer'),
      app: document.getElementById('tutoApp'),
      appBanner: document.getElementById('tutoAppBanner'),
      seasons: document.getElementById('tutoSeasons'),
      treeRows: [...root.querySelectorAll('.tt-row')],
      brace1: document.getElementById('tutoBrace1'),
      brace2: document.getElementById('tutoBrace2'),
      seasonsApp: document.getElementById('tutoSeasonsApp'),
      sselect: document.getElementById('tutoSaSelect'),
      dont: document.getElementById('tutoDont'),
      dontPanels: [...root.querySelectorAll('.tuto-dont-panel')],
      menu: document.getElementById('tutoMenu'),
      menuNew: document.getElementById('tutoMenuNew'),
      submenu: document.getElementById('tutoSubmenu'),
      folder: document.getElementById('tutoFolder'),
      folderCount: document.getElementById('tutoFolderCount'),
      name: document.getElementById('tutoName'),
      files: [...root.querySelectorAll('#tutoExplorer .tuto-file')],
      scanBtn: document.getElementById('tutoScanBtn'),
      radar: document.getElementById('tutoRadar'),
      card: document.getElementById('tutoCard'),
      done: document.getElementById('tutoDone'),
      cursor: document.getElementById('tutoCursor'),
      click: root.querySelector('.tuto-click'),
      caption: document.getElementById('tutoCaption'),
      capNum: document.getElementById('tutoCapNum'),
      capText: document.getElementById('tutoCapText'),
      replay: document.getElementById('tutoReplay'),
      play: document.getElementById('tutoPlay'),
      chapters: document.getElementById('tutoChapters')
    };

    // Capítulos (también sirven de barra de progreso)
    el.chapters.innerHTML = CHAPTERS.map((c, i) =>
      `<button type="button" class="tuto-chap${c.bad ? ' is-bad' : ''}" data-chap="${i}"><span class="tuto-chap-bar"><i></i></span><span class="tuto-chap-label">${c.label}</span></button>`
    ).join('');
    el.chapterBtns = [...el.chapters.querySelectorAll('.tuto-chap')];
    el.chapterBtns.forEach((btn, i) => btn.addEventListener('click', () => { t = CHAPTERS[i].start; play(); }));

    el.play.addEventListener('click', () => (playing ? pause() : play()));
    el.replay.addEventListener('click', () => { t = 0; play(); });
    el.stage.addEventListener('click', (e) => {
      if (e.target.closest('.tuto-replay')) return;
      playing ? pause() : play();
    });

    // El escenario se dibuja a 540px y se escala al ancho disponible
    new ResizeObserver(() => {
      el.stage.style.setProperty('--tuto-scale', el.frame.clientWidth / STAGE_W);
    }).observe(el.frame);
    return true;
  }

  function render() {
    const chap = CHAPTERS.reduce((acc, c, i) => (t >= c.start ? i : acc), 0);
    const capIdx = CAPTIONS.reduce((acc, c, i) => (t >= c.start ? i : acc), 0);
    if (capIdx !== lastChapter) {
      lastChapter = capIdx;
      const cap = CAPTIONS[capIdx];
      el.capNum.textContent = cap.badge;
      el.capText.textContent = cap.text;
      el.caption.classList.toggle('is-bad', !!cap.bad);
      el.caption.classList.remove('is-in');
      void el.caption.offsetWidth; // reinicia la animación de entrada
      el.caption.classList.add('is-in');
    }
    el.chapterBtns.forEach((btn, i) => {
      const end = i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].start : END;
      btn.querySelector('i').style.width = `${clamp01((t - CHAPTERS[i].start) / (end - CHAPTERS[i].start)) * 100}%`;
      btn.classList.toggle('is-current', i === chap);
    });

    // Cambio de escena: explorador → app
    const swap = clamp01((t - T.sceneSwap) / 0.4);
    const swapSeasons = clamp01((t - SEASONS_START) / 0.4);
    const swapDont = clamp01((t - DONT_START) / 0.4);
    el.explorer.style.opacity = 1 - swap;
    el.app.style.opacity = swap * (1 - swapSeasons);
    el.app.style.transform = `scale(${0.96 + 0.04 * swap})`;
    el.seasons.style.opacity = swapSeasons * (1 - swapDont);
    el.dont.style.opacity = swapDont;

    // Temporadas: el árbol de carpetas se arma fila por fila. Una llave verde agrupa los
    // videos sueltos (temporada 1) y una azul la carpeta "Temporada 2" con los suyos.
    const sl = t - SEASONS_START;
    el.treeRows.forEach((row, i) => {
      const p = clamp01((sl - TREE_ROWS[i]) / 0.35);
      row.style.opacity = p;
      row.style.transform = row.classList.contains('is-folder')
        ? `scale(${p > 0 ? 0.6 + 0.4 * easeOutBack(p) : 0.6})`
        : `translateX(${(1 - ease(p)) * -12}px)`;
    });
    el.treeRows[3].classList.toggle('show-new', sl >= TREE_ROWS[3] && sl < S.brace2);
    [[el.brace1, S.brace1], [el.brace2, S.brace2]].forEach(([brace, at]) => {
      const p = clamp01((sl - at) / 0.4);
      brace.style.opacity = p > 0 ? 1 : 0;
      brace.style.setProperty('--draw', ease(p));
    });

    // Después: la app muestra cada temporada y en el árbol se iluminan sus videos
    const appP = clamp01((sl - S.app) / 0.35);
    el.seasonsApp.style.opacity = appP;
    el.seasonsApp.style.transform = `translateY(${(1 - appP) * 10}px)`;
    const showT2 = sl >= S.showT2;
    el.seasonsApp.classList.toggle('is-t2', showT2);
    el.sselect.textContent = showT2 ? 'Temporada 2' : 'Temporada 1';
    el.seasons.classList.toggle('lit-t1', appP > 0 && !showT2);
    el.seasons.classList.toggle('lit-t2', showT2);

    // "Así no": un panel por error; la X roja aparece y después lo que pasaría
    el.dontPanels.forEach((panel, i) => {
      const s = DONT_START + DONT_LEN * i;
      const local = t - s;
      const on = local >= 0 && (local < DONT_LEN || i === el.dontPanels.length - 1);
      const fadeIn = clamp01(local / 0.3);
      const fadeOut = i < el.dontPanels.length - 1 ? clamp01((DONT_LEN - local) / 0.3) : 1;
      panel.style.opacity = on ? Math.min(fadeIn, fadeOut) : 0;
      panel.classList.toggle('is-shaking', on && local >= 0.3 && local < 1.1);
      const stampP = clamp01((local - 0.9) / 0.3);
      const stamp = panel.querySelector('.tuto-stamp');
      stamp.style.opacity = stampP > 0 ? 1 : 0;
      stamp.style.transform = `scale(${stampP > 0 ? 2 - easeOutBack(stampP) : 2}) rotate(-12deg)`;
      panel.querySelector('.tuto-result').style.opacity = clamp01((local - 1.6) / 0.4);
    });

    // Menú contextual
    const menuOn = t >= T.menuOpen && t < T.folderPop;
    el.menu.classList.toggle('is-open', menuOn);
    el.menuNew.classList.toggle('is-hover', t >= 1.75);
    el.submenu.classList.toggle('is-open', menuOn && t >= T.submenuOpen);

    // Carpeta nueva
    const pop = clamp01((t - T.folderPop) / 0.35);
    el.folder.style.opacity = t >= T.folderPop ? 1 : 0;

    // Archivos arrastrados a la carpeta
    const cur = cursorAt(t);
    let dropped = 0, bump = 0;
    el.files.forEach((file, i) => {
      const s = T.dragStart + T.dragGap * i;
      const grab = s + 0.45, drop = s + 1.15;
      if (t >= drop) {
        dropped++;
        bump = Math.max(bump, 1 - clamp01((t - drop) / 0.3));
        file.style.opacity = 0;
        file.style.transform = `translate(${FOLDER.x - 378}px, ${FOLDER.y - FILE_GRAB(i).y}px) scale(0.3)`;
        file.classList.remove('is-dragging');
      } else if (t >= grab) {
        file.style.opacity = 1;
        file.style.transform = `translate(${cur.x - 378}px, ${cur.y - FILE_GRAB(i).y}px)`;
        file.classList.add('is-dragging');
      } else {
        file.style.opacity = 1;
        file.style.transform = '';
        file.classList.remove('is-dragging');
      }
    });
    el.folder.style.transform = `scale(${(t >= T.folderPop ? 0.5 + 0.5 * easeOutBack(pop) : 0.5) * (1 + 0.14 * Math.sin(bump * Math.PI))})`;
    el.folderCount.textContent = dropped;
    el.folderCount.classList.toggle('is-on', dropped > 0);

    // Nombre: "Nueva carpeta" seleccionado → se escribe el nombre de la serie → Enter
    if (t < T.typeStart) {
      el.name.textContent = 'Nueva carpeta';
      el.name.className = 'tuto-name is-selected';
    } else if (t < T.enter) {
      const n = Math.min(NAME.length, Math.floor((t - T.typeStart) / T.typeStep) + 1);
      el.name.textContent = NAME.slice(0, n);
      el.name.className = 'tuto-name is-editing';
    } else {
      el.name.textContent = NAME;
      el.name.className = 'tuto-name';
    }

    // App: botón, búsqueda y la serie nueva
    el.scanBtn.classList.toggle('is-pressed', t >= T.scanClick && t < T.scanClick + 0.2);
    el.scanBtn.classList.toggle('is-hover', t >= 12.4 && t < T.cardPop);
    el.radar.style.opacity = t >= T.scanClick + 0.1 && t < T.cardPop ? 1 : 0;
    const cardP = clamp01((t - T.cardPop) / 0.45);
    el.card.style.opacity = cardP > 0 ? 1 : 0;
    el.card.style.transform = `scale(${cardP > 0 ? 0.4 + 0.6 * easeOutBack(cardP) : 0.4})`;
    el.done.style.opacity = clamp01((t - T.done) / 0.3);
    // Al aparecer la serie, su banner llena el fondo como en la pantalla de inicio
    const bannerP = clamp01((t - T.cardPop) / 0.8);
    el.appBanner.style.opacity = bannerP;
    el.appBanner.style.transform = `scale(${1.08 - 0.08 * ease(bannerP)})`;

    // Cursor y efecto de clic
    const lastClick = clicks.filter(c => c <= t).pop();
    const since = lastClick === undefined ? 99 : t - lastClick;
    const dragging = el.files.some(f => f.classList.contains('is-dragging')) && t < SEASONS_START;
    el.cursor.style.transform = `translate(${cur.x}px, ${cur.y}px) scale(${dragging || since < 0.15 ? 0.85 : 1})`;
    el.cursor.style.opacity = 1 - clamp01((t - (SEASONS_START - 0.6)) / 0.6);
    el.click.style.opacity = since < 0.45 ? 1 - since / 0.45 : 0;
    el.click.style.transform = `translate(-50%, -50%) scale(${0.3 + since * 2.4})`;

    el.root.classList.toggle('is-ended', t >= END);
    el.root.classList.toggle('is-paused', !playing);
    el.play.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  }

  function frame(now) {
    const modal = document.getElementById('scanModal');
    if (!modal || !modal.classList.contains('active')) { stop(); return; }
    if (playing) {
      t += Math.min(0.1, (now - lastFrame) / 1000);
      if (t >= END) { t = END; playing = false; }
    }
    lastFrame = now;
    render();
    raf = playing ? requestAnimationFrame(frame) : 0;
  }

  function play() {
    if (t >= END) t = 0;
    playing = true;
    if (!raf) {
      lastFrame = performance.now();
      raf = requestAnimationFrame(frame);
    }
    render();
  }

  function pause() {
    playing = false;
    render();
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  window.HiyTutorial = {
    start() {
      if (!setup()) return;
      t = 0;
      lastChapter = -1;
      play();
    },
    stop
  };
})();
