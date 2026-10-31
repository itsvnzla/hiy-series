/* ==========================================================================
   NETFLIX SERIES HUB - MAIN APP FRONTEND LOGIC
   ========================================================================== */

// Logo de la app (el mismo de la barra superior), para las insignias de las tarjetas
const BRAND_LOGO_SVG = `<svg viewBox="0 0 111 30" aria-hidden="true"><path d="M105.062 14.28L111 30H101.46L98.54 22.02H98.34L95.5 30H86L91.94 14.28V0h13.122v14.28zM72.04 0h13.3v30h-13.3V0zm-17.7 13.06h-9.92V0H31.14v30h13.28v-11.4h9.92v11.4h13.28V0H54.34v13.06zM22.5 0H9.22v30H22.5V0zM0 0v30h9.22V0H0z"/></svg>`;

// Íconos del botón Mi Lista: "+" para agregar, "✓" cuando ya está en la lista
const MYLIST_ICON_ADD = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
const MYLIST_ICON_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

// Clave de localStorage propia del perfil activo ("subs_on" → "subs_on:p1ab2"), para que cada
// perfil recuerde lo suyo en este equipo. Sin perfil, la clave de siempre.
function hiyProfileKey(key) {
  const id = window.app && window.app.settings && window.app.settings.profile && window.app.settings.profile.id;
  return id ? `${key}:${id}` : key;
}

class NetflixApp {
  constructor() {
    this.seriesList = [];
    this.progressMap = {};
    // Miniaturas y vista previa de episodios (public/js/episode-media.js)
    this.media = new EpisodeMedia();

    // Elements
    this.navbar = document.getElementById('navbar');
    this.searchInput = document.getElementById('searchInput');

    // Hero
    this.heroSection = document.getElementById('heroSection');
    this.heroTitle = document.getElementById('heroTitle');
    this.heroDesc = document.getElementById('heroDesc');
    this.heroMatch = document.getElementById('heroMatch');
    this.heroRating = document.getElementById('heroRating');
    this.heroFormats = document.getElementById('heroFormats');
    this.heroPlayBtn = document.getElementById('heroPlayBtn');
    this.heroInfoBtn = document.getElementById('heroInfoBtn');

    // Rows
    this.cardsContinueWatching = document.getElementById('cardsContinueWatching');
    this.rowContinueWatching = document.getElementById('rowContinueWatching');
    this.cardsTrending = document.getElementById('cardsTrending');
    this.cardsLocal = document.getElementById('cardsLocal');
    this.homeGenreRows = document.getElementById('homeGenreRows');
    this.countTrending = document.getElementById('countTrending');

    // Modals
    this.seriesModal = document.getElementById('seriesModal');
    this.closeSeriesModal = document.getElementById('closeSeriesModal');
    this.modalBanner = document.getElementById('modalBanner');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalDesc = document.getElementById('modalDesc');
    this.modalCast = document.getElementById('modalCast');
    this.modalCreator = document.getElementById('modalCreator');
    this.modalGenres = document.getElementById('modalGenres');
    this.modalPlayBtn = document.getElementById('modalPlayBtn');
    this.seasonSelect = document.getElementById('seasonSelect');
    this.episodesList = document.getElementById('episodesList');

    // Scan Modal
    this.scanModal = document.getElementById('scanModal');
    this.openScanBtn = document.getElementById('openScanBtn');
    this.closeScanModal = document.getElementById('closeScanModal');
    this.scanForm = document.getElementById('scanForm');
    this.folderPathInput = document.getElementById('folderPathInput');

    // Vista Series
    this.seriesPage = document.getElementById('seriesPage');
    this.seriesGrid = document.getElementById('seriesGrid');
    this.seriesRowsContainer = document.getElementById('seriesRowsContainer');
    this.seriesSort = document.getElementById('seriesSort');
    this.seriesPageCount = document.getElementById('seriesPageCount');
    this.seriesEmpty = document.getElementById('seriesEmpty');
    this.btnResetFilters = document.getElementById('btnResetFilters');

    // Billboard de Series
    this.seriesBillboard = document.getElementById('seriesBillboard');
    this.seriesBillboardBackdrop = document.getElementById('seriesBillboardBackdrop');
    this.seriesBillboardTitle = document.getElementById('seriesBillboardTitle');
    this.seriesBillboardMatch = document.getElementById('seriesBillboardMatch');
    this.seriesBillboardRating = document.getElementById('seriesBillboardRating');
    this.seriesBillboardSeasons = document.getElementById('seriesBillboardSeasons');
    this.seriesBillboardFormat = document.getElementById('seriesBillboardFormat');
    this.seriesBillboardDesc = document.getElementById('seriesBillboardDesc');
    this.seriesBillboardPlayBtn = document.getElementById('seriesBillboardPlayBtn');
    this.seriesBillboardInfoBtn = document.getElementById('seriesBillboardInfoBtn');

    // Dropdown y Modos de Vista
    this.genreDropdownWrapper = document.getElementById('genreDropdownWrapper');
    this.genreDropdownBtn = document.getElementById('genreDropdownBtn');
    this.genreDropdownMenu = document.getElementById('genreDropdownMenu');
    this.genreDropdownGrid = document.getElementById('genreDropdownGrid');
    this.genreDropdownLabel = document.getElementById('genreDropdownLabel');
    this.sortDropdown = document.getElementById('sortDropdown');
    this.sortDropdownBtn = document.getElementById('sortDropdownBtn');
    this.sortDropdownMenu = document.getElementById('sortDropdownMenu');
    this.sortDropdownLabel = document.getElementById('sortDropdownLabel');
    this.btnViewGrid = document.getElementById('btnViewGrid');
    this.btnViewRows = document.getElementById('btnViewRows');

    this.seriesViewMode = 'grid'; // 'grid' | 'rows'
    this.currentView = 'home';
    this.activeGenre = 'all';

    // Vista Mi Lista
    this.myList = []; // ids de series, la más reciente primero
    this.myListPage = document.getElementById('myListPage');
    this.myListGrid = document.getElementById('myListGrid');
    this.searchPage = document.getElementById('searchPage');
    this.searchGrid = document.getElementById('searchGrid');
    this.myListEmpty = document.getElementById('myListEmpty');
    this.myListCount = document.getElementById('myListCount');
    this.btnExploreSeries = document.getElementById('btnExploreSeries');
    this.modalMyListBtn = document.getElementById('modalMyListBtn');
    this.heroMyListBtn = document.getElementById('heroMyListBtn');
    this.seriesBillboardMyListBtn = document.getElementById('seriesBillboardMyListBtn');

    // Editar información de una serie
    this.editModal = document.getElementById('editModal');
    this.editForm = document.getElementById('editForm');
    this.modalEditBtn = document.getElementById('modalEditBtn');
    this.editingSeries = null;

    // Perfil y configuración (data/config.json vía /api/settings)
    this.settingsModal = document.getElementById('settingsModal');
    this.settings = null;

    // Perfiles (/api/profiles) y la pantalla "¿Quién está viendo?"
    this.profileGate = document.getElementById('profileGate');
    this.profiles = [];
    this.profilesSupported = false;

    this.activeSeries = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupRowScrolling();
    try {
      await this.loadProfiles();
      // Al abrir la app (no al recargarla en la misma sesión): entrar con el perfil de inicio
      let resumed = false;
      try { resumed = !!sessionStorage.getItem('hiy-profile-session'); } catch (_) { /* sin almacenamiento */ }
      if (!resumed) await this.selectDefaultProfile();
      await this.loadSettings();
      await this.loadCatalog();
      await this.loadProgress();
      await this.loadMyList();
      this.render();
      // Con la pantalla de carga todavía puesta: dejar listos todos los pósters para que
      // al bajar por las filas no se trabe cargándolos uno por uno
      await this.preloadImages();
    } finally {
      // Catálogo dibujado (o falló): quitar la pantalla de carga (public/js/splash.js)
      if (window.hiySplash) window.hiySplash.done();
    }

    // ¿Quién está viendo? (o crear el primer perfil). No se pregunta otra vez al recargar
    // la app en la misma sesión (p. ej. al cambiar de idioma).
    if (this.profilesSupported && this.needsProfileGate()) {
      await this.openProfileGate(this.profiles.length ? 'pick' : 'create');
    }
    // Completar en segundo plano la información de las series locales que no la tienen
    this.watchMetadata(true);

    // ¿Hay videos nuevos en las carpetas de las series? Al abrir y al volver a la app
    this.checkNewVideos();
    window.addEventListener('focus', () => this.checkNewVideos());
  }

  // Carga y decodifica los pósters de todas las tarjetas y el banner principal.
  // Como mucho espera maxMs (p. ej. si una imagen de internet no responde).
  async preloadImages(maxMs = 10000) {
    const imgs = [...document.querySelectorAll('img.card-img')];
    const ready = (img) => (img.complete ? Promise.resolve() : new Promise(res => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    })).then(() => (img.naturalWidth ? img.decode().catch(() => {}) : null));

    const tasks = imgs.map(ready);
    const bg = (this.heroSection.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/) || [])[1];
    if (bg) {
      const banner = new Image();
      banner.src = bg;
      tasks.push(banner.decode().catch(() => {}));
    }

    let done = 0;
    tasks.forEach(task => task.then(() => {
      done++;
      if (window.hiySplash && window.hiySplash.progress) window.hiySplash.progress(done / tasks.length);
    }));
    await Promise.race([Promise.all(tasks), new Promise(res => setTimeout(res, maxMs))]);
  }

  /* ---------- Videos nuevos o borrados en series ya registradas ---------- */
  // Se avisa dentro de la ficha de la serie, encima de la lista de capítulos

  // force: revisar ya (al abrir una ficha), aunque se haya revisado hace poco
  async checkNewVideos(force = false) {
    if (this.newVideosChecking) return;
    // Sin force, como mucho una revisión cada 20 s (el foco puede ir y volver muchas veces)
    if (!force && Date.now() - (this.newVideosCheckedAt || 0) < 20000) return;
    this.newVideosChecking = true;
    try {
      const { changes = [] } = await (await fetch('/api/library/new-videos')).json();
      this.newVideosCheckedAt = Date.now();
      this.libraryChanges = Object.fromEntries(changes.map(c => [c.id, c]));
      // Si hay una ficha abierta, mostrar (o quitar) su aviso
      if (this.seriesModal.classList.contains('active') && this.activeSeries) {
        this.renderSeriesChanges(this.activeSeries);
      }
    } catch (err) {
      console.warn('No se pudo revisar si hay videos nuevos:', err);
    } finally {
      this.newVideosChecking = false;
    }
  }

  // "Ahora no" guarda qué cambios se ignoraron; si aparecen otros, se vuelve a avisar
  newVideosKey(change) {
    return `${change.id}|+${change.newFiles.map(f => f.path).join('|')}|-${change.missingFiles.map(f => f.path).join('|')}`;
  }

  getDismissedNewVideos() {
    try { return JSON.parse(localStorage.getItem('hiy-dismissed-new-videos') || '[]'); } catch { return []; }
  }

  renderSeriesChanges(series) {
    const panel = document.getElementById('seriesChanges');
    const change = this.libraryChanges && this.libraryChanges[series.id];
    const key = change ? this.newVideosKey(change) : '';
    if (!change || this.getDismissedNewVideos().includes(key)) {
      panel.hidden = true;
      panel.dataset.key = '';
      return;
    }
    if (!panel.hidden && panel.dataset.key === key) return; // ya se muestra este mismo aviso

    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const added = change.newFiles.length;
    const removed = change.missingFiles.length;

    const plural = (n, one, many) => (n === 1 ? one : many.replace('#', n));

    // Textos según lo que pasó: capítulos nuevos, que ya no están o las dos cosas
    let title, sub, button;
    if (change.allMissing) {
      title = change.folderGone ? 'La carpeta de esta serie ya no está' : 'Esta serie se quedó sin videos';
      sub = change.folderGone
        ? 'Se borró o se movió a otro lugar. Si la moviste, vuelve a escanearla desde «Escanear PC».'
        : `Se borraron ${plural(removed, 'su único video', 'sus # videos')} de la carpeta.`;
      button = 'Quitar de la biblioteca';
    } else if (added && removed) {
      title = `${plural(added, '1 capítulo nuevo', '# capítulos nuevos')} y ${plural(removed, '1 que ya no está', '# que ya no están')}`;
      sub = 'Tu lista no coincide con lo que hay ahora en la carpeta.';
      button = 'Actualizar lista';
    } else if (added) {
      title = plural(added, '1 capítulo nuevo', '# capítulos nuevos');
      sub = plural(added, 'Está en la carpeta pero todavía no aparece en tu lista.', 'Están en la carpeta pero todavía no aparecen en tu lista.');
      button = 'Agregar a la lista';
    } else {
      title = plural(removed, '1 capítulo ya no está', '# capítulos ya no están');
      sub = plural(removed, 'Se borró o se movió de la carpeta.', 'Se borraron o se movieron de la carpeta.');
      button = 'Quitar de la lista';
    }

    // Filas como las de la lista de episodios: primero los nuevos y luego los que ya no están
    const files = [
      ...change.newFiles.map(f => ({ ...f, kind: 'added' })),
      ...(change.allMissing ? [] : change.missingFiles.map(f => ({ ...f, kind: 'removed' })))
    ];
    const shown = files.slice(0, 4);
    const folderName = change.folderPath.split(/[\\/]/).filter(Boolean).pop() || change.folderPath;
    const row = (f) => {
      const meta = f.kind === 'added'
        ? [f.size ? this.formatBytes(f.size) : '', f.addedAt ? this.timeAgo(f.addedAt) : ''].filter(Boolean).join(' · ')
        : 'Se quitará de la lista';
      return `
        <li class="sc-row is-${f.kind}">
          <span class="sc-num">${f.season > 1 ? `<small>T${f.season}</small>` : ''}${f.episode || '–'}</span>
          <span class="sc-file">
            <span class="sc-name" title="${esc(f.path)}">${esc(f.name)}</span>
            <span class="sc-meta">${f.format ? `<span class="format-badge format-${esc(f.format)}">${esc(f.format)}</span>` : ''}${esc(meta)}</span>
          </span>
          <span class="sc-tag">${f.kind === 'added' ? 'Nuevo' : 'Ya no está'}</span>
        </li>`;
    };

    panel.className = `series-changes${change.allMissing ? ' is-gone' : ''}`;
    panel.dataset.key = key;
    panel.innerHTML = `
      <div class="sc-head">
        <span class="sc-eyebrow"><span class="sc-dot"></span>Cambios en la carpeta</span>
        <span class="sc-folder" title="${esc(change.folderPath)}"><i data-lucide="folder"></i>${esc(folderName)}</span>
      </div>
      <h4 class="sc-title">${title}</h4>
      <p class="sc-sub">${sub}</p>
      ${shown.length ? `<ol class="sc-rows">${shown.map(row).join('')}</ol>` : ''}
      ${files.length > shown.length ? `<p class="sc-more">y ${plural(files.length - shown.length, '1 archivo más', '# archivos más')}</p>` : ''}
      <div class="sc-foot">
        <button type="button" class="sc-apply nv-update">${button}</button>
        <button type="button" class="sc-ignore nv-dismiss">Ahora no</button>
        <span class="sc-note"><i data-lucide="shield-check"></i>Tus archivos no se tocan</span>
      </div>`;

    panel.querySelector('.nv-dismiss').addEventListener('click', () => {
      const dismissed = this.getDismissedNewVideos().filter(k => !k.startsWith(`${change.id}|`));
      dismissed.push(key);
      try { localStorage.setItem('hiy-dismissed-new-videos', JSON.stringify(dismissed)); } catch { /* sin almacenamiento */ }
      panel.hidden = true;
    });
    panel.querySelector('.nv-update').addEventListener('click', (e) => this.addNewVideos(change, e.currentTarget));

    panel.hidden = false;
    if (window.lucide) lucide.createIcons({ root: panel });
  }

  async addNewVideos(change, btn) {
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="toast-spinner"></span> Actualizando…';
    try {
      const data = await (await fetch(`/api/series/${encodeURIComponent(change.id)}/sync-videos`, { method: 'POST' })).json();
      if (!data.success) throw new Error(data.error);
      if (this.libraryChanges) delete this.libraryChanges[change.id];
      document.getElementById('seriesChanges').hidden = true;
      if (data.seriesRemoved) {
        this.showToast(`Se quitó «${change.title}» de tu biblioteca`);
        if (this.seriesModal.classList.contains('active') && this.activeSeries && this.activeSeries.id === change.id) {
          this.seriesModal.classList.remove('active');
        }
      } else {
        const done = [];
        if (data.added) done.push(data.added === 1 ? 'se agregó 1 capítulo' : `se agregaron ${data.added} capítulos`);
        if (data.removed) done.push(data.removed === 1 ? 'se quitó 1 capítulo' : `se quitaron ${data.removed} capítulos`);
        const msg = done.join(' y ') || 'la lista ya estaba al día';
        this.showToast(`«${change.title}»: ${msg}`);
      }
      await this.loadCatalog();
      this.render();
      if (data.seriesRemoved) return;
      // Si la ficha de esa serie está abierta, mostrar ya los capítulos nuevos
      if (this.seriesModal.classList.contains('active') && this.activeSeries && this.activeSeries.id === change.id) {
        const updated = this.seriesList.find(s => s.id === change.id);
        if (updated) {
          // Volver a dibujar la ficha (puede haber una temporada nueva) sin perder dónde estaba
          const season = this.seasonSelect.value;
          const content = this.seriesModal.querySelector('.modal-content');
          const scroll = content.scrollTop;
          this.openSeriesModal(updated);
          if ([...this.seasonSelect.options].some(o => o.value === season)) {
            this.seasonSelect.value = season;
            this.renderEpisodes(updated, parseInt(season, 10));
          }
          content.scrollTop = scroll;
        }
      }
    } catch (err) {
      console.error('Error agregando videos nuevos:', err);
      this.showToast('No se pudo actualizar la lista de capítulos', 'error');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  /* ---------- Metadatos automáticos (descripción, géneros, póster) ---------- */

  // start = true: pide al servidor que empiece a buscar. Luego sigue el progreso
  // y, al terminar, recarga el catálogo para mostrar la información nueva.
  async watchMetadata(start) {
    if (this.metadataWatching) return;
    this.metadataWatching = true;
    try {
      let status = start
        ? await (await fetch('/api/metadata/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
          })).json()
        : await (await fetch('/api/metadata/status')).json();

      if (!status.running) return;

      while (status.running) {
        this.showProgressToast(
          `Buscando información de las series… ${status.done}/${status.total}` +
          (status.current ? `<br><small>${String(status.current).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</small>` : '')
        );
        await new Promise(r => setTimeout(r, 1500));
        status = await (await fetch('/api/metadata/status')).json();
      }

      this.hideProgressToast();
      await this.loadCatalog();
      this.render();
      if (status.total > 0) {
        this.showToast(status.found > 0
          ? `Información actualizada: ${status.found} de ${status.total} series`
          : 'No se encontró información para las series nuevas', status.found > 0 ? 'info' : 'error');
      }
    } catch (err) {
      // Servidor sin la función de metadatos (p. ej. si no se reinició la app)
      console.warn('Metadatos no disponibles:', err);
      this.hideProgressToast();
    } finally {
      this.metadataWatching = false;
    }
  }

  // Aviso fijo que se actualiza en el lugar (en vez de apilar avisos)
  showProgressToast(html) {
    if (!this.progressToast) {
      this.progressToast = document.createElement('div');
      this.progressToast.className = 'toast toast-progress';
      document.getElementById('toastContainer').appendChild(this.progressToast);
    }
    this.progressToast.innerHTML = `<span class="toast-spinner"></span><span>${html}</span>`;
  }

  hideProgressToast() {
    if (this.progressToast) {
      this.progressToast.remove();
      this.progressToast = null;
    }
  }

  bindEvents() {
    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
      this.navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Search Input: esperar a que se deje de escribir un momento (cada búsqueda vuelve a
    // dibujar todas las tarjetas; hacerlo en cada tecla trababa la app)
    let searchTimer = null;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this.handleSearch(e.target.value), 150);
    });

    // Menú superior: "Series" y "Favoritos" abren su propia vista; "Inicio" vuelve arriba del todo
    this.navLinks = {
      navHome: null
    };
    ['navHome', 'navSeries', 'navMyList'].forEach(id => {
      document.getElementById(id).addEventListener('click', (e) => {
        e.preventDefault();
        // e.detail === 0 → se activó con el teclado (Enter)
        const fromKeyboard = e.detail === 0;
        // Salir de los resultados: se borra la búsqueda (si no, Series/Favoritos saldrían filtrados)
        if (this.currentView === 'search') this.searchInput.value = '';
        if (id === 'navSeries') {
          this.showSeriesPage(fromKeyboard);
        } else if (id === 'navMyList') {
          this.showMyListPage(fromKeyboard);
        } else {
          if (this.currentView !== 'home') this.showView('home');
          this.goToSection(id, fromKeyboard);
        }
      });
    });

    // Vista Series: controles y eventos
    if (this.seriesSort) {
      this.seriesSort.addEventListener('change', () => this.renderSeriesContent());
    }
    if (this.btnViewGrid && this.btnViewRows) {
      this.btnViewGrid.addEventListener('click', () => this.setSeriesViewMode('grid'));
      this.btnViewRows.addEventListener('click', () => this.setSeriesViewMode('rows'));
    }
    if (this.genreDropdownBtn) {
      this.genreDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGenreDropdown();
      });
    }
    // Editar información de una serie
    this.bindEditModal();

    // Menú del perfil y ventana de configuración
    this.bindSettings();
    this.bindProfileGate();
    this.bindPhotoCropper();

    // Al cerrarse la ficha (por cualquier vía) se detiene la vista previa del episodio
    // y se descartan las miniaturas pendientes de esa ficha (si no, al abrir y cerrar fichas
    // rápido la cola crecía y seguía leyendo videos en segundo plano, dando tirones)
    new MutationObserver(() => {
      if (!this.seriesModal.classList.contains('active')) {
        this.media.stopPreview();
        this.media.clearThumbnailQueue();
      }
    }).observe(this.seriesModal, { attributes: true, attributeFilter: ['class'] });

    // Mi Lista vacía → "Explorar series"
    if (this.btnExploreSeries) {
      this.btnExploreSeries.addEventListener('click', (e) => {
        this.showSeriesPage(e.detail === 0);
      });
    }

    // Menú "Ordenar"
    this.buildSortDropdown();
    if (this.sortDropdownBtn) {
      this.sortDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSortDropdown();
      });
    }

    document.addEventListener('click', (e) => {
      if (this.genreDropdownWrapper && !this.genreDropdownWrapper.contains(e.target)) {
        this.closeGenreDropdown();
      }
      if (this.sortDropdown && !this.sortDropdown.contains(e.target)) {
        this.closeSortDropdown();
      }
    });
    if (this.btnResetFilters) {
      this.btnResetFilters.addEventListener('click', () => {
        this.activeGenre = 'all';
        this.searchInput.value = '';
        if (this.seriesSort) this.seriesSort.value = 'default';
        this.showSeriesPage();
      });
    }

    // Clic en el logo = volver al inicio
    document.querySelector('.logo').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('navHome').click();
    });

    // Modals Close
    this.closeSeriesModal.addEventListener('click', () => this.seriesModal.classList.remove('active'));
    this.closeScanModal.addEventListener('click', () => this.closeScanWizard());

    this.openScanBtn.addEventListener('click', () => this.openFolderScanner());

    // Ventana de escaneo: buscar en todo el PC o elegir la carpeta a mano
    document.getElementById('scanAutoBtn').addEventListener('click', () => this.startDiscover());
    document.getElementById('scanManualBtn').addEventListener('click', () => this.chooseFolderManually());
    document.getElementById('scanResultsManualBtn').addEventListener('click', () => this.chooseFolderManually());
    document.getElementById('scanStopBtn').addEventListener('click', () => this.stopDiscover());
    document.getElementById('scanToggleAllBtn').addEventListener('click', () => this.toggleAllDiscovered());
    document.getElementById('scanAddBtn').addEventListener('click', () => this.addDiscoveredFolders());
    this.scanModal.querySelectorAll('[data-scan-back]').forEach(btn =>
      btn.addEventListener('click', () => this.setScanStep('choose')));
    this.scanModal.querySelectorAll('[data-scan-help]').forEach(btn =>
      btn.addEventListener('click', () => this.setScanStep('help')));
    document.getElementById('helpStartBtn').addEventListener('click', () => this.startDiscover());
    document.getElementById('helpManualBtn').addEventListener('click', () => this.chooseFolderManually());
    document.getElementById('scanResults').addEventListener('change', () => this.updateDiscoverSelection());

    // Listen for scan triggered from Electron native menu
    if (window.electronAPI) {
      window.electronAPI.onScanFolder((folderPath) => {
        this.triggerScanFromPath(folderPath);
      });
    }

    // Scan Form Submit
    this.scanForm.addEventListener('submit', (e) => this.handleScan(e));

    // Season Dropdown Change
    this.seasonSelect.addEventListener('change', (e) => {
      const sNum = parseInt(e.target.value, 10);
      this.renderEpisodes(this.activeSeries, sNum);
    });

    // Atajos de teclado (flechas / Enter / Escape)
    document.addEventListener('keydown', (e) => this.handleKeyNav(e));

    // Al mover el mouse se quita la selección del teclado (evita 2 tarjetas resaltadas)
    this.hoveredCard = null;
    let lastX = null, lastY = null;
    document.addEventListener('mousemove', (e) => {
      // Ignorar eventos sintéticos por scroll (el puntero no se movió)
      if (e.screenX === lastX && e.screenY === lastY) return;
      lastX = e.screenX;
      lastY = e.screenY;
      document.body.classList.remove('keyboard-nav');
      const active = document.activeElement;
      if (active && (active.classList.contains('card') || active.classList.contains('episode-item') ||
          active.classList.contains('genre-dropdown-item') || active === this.genreDropdownBtn ||
          active.classList.contains('view-btn') ||
          active.classList.contains('sort-dropdown-item') || active === this.sortDropdownBtn ||
          active.classList.contains('btn-mylist') || active === this.btnExploreSeries ||
          active.closest('.nav-links') || active === this.openScanBtn)) active.blur();
    });
    document.addEventListener('mouseover', (e) => {
      this.hoveredCard = e.target.closest ? e.target.closest('.card') : null;
    });

    // Modal Background Click Close
    this.seriesModal.addEventListener('click', (e) => {
      if (e.target === this.seriesModal) this.seriesModal.classList.remove('active');
    });
    this.scanModal.addEventListener('click', (e) => {
      if (e.target === this.scanModal) this.closeScanWizard();
    });
  }

  goToSection(navId, fromKeyboard) {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.id === navId));

    const rowId = this.navLinks[navId];
    if (!rowId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const row = document.getElementById(rowId);
    if (!row || row.offsetParent === null || !row.querySelector('.card')) {
      this.showToast('No hay series en esta sección', 'error');
      return;
    }

    if (fromKeyboard) {
      document.body.classList.add('keyboard-nav');
      this.focusCard(row.querySelector('.card'));
    }
    row.closest('.category-row').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // Elementos del menú superior en orden de izquierda a derecha
  getNavItems() {
    return [
      ...document.querySelectorAll('.nav-links a'),
      this.searchInput,
      this.openScanBtn
    ];
  }

  focusNavItem(el) {
    if (!el) return;
    document.body.classList.add('keyboard-nav');
    el.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bajar del menú a las tarjetas (desde el buscador, a los resultados)
  focusFirstRow(preferRowId) {
    if (this.currentView === 'search') {
      document.body.classList.add('keyboard-nav');
      const play = document.getElementById('searchTopPlay');
      if (!document.getElementById('searchTop').hidden) play.focus({ preventScroll: true });
      else {
        const chip = document.querySelector('#searchEmptyChips .search-chip');
        if (chip) chip.focus({ preventScroll: true });
      }
      return;
    }
    if (this.currentView === 'mylist') {
      document.body.classList.add('keyboard-nav');
      const first = this.myListGrid.querySelector('.card');
      if (first) this.focusCard(first);
      else if (this.btnExploreSeries && !this.myListEmpty.hidden) this.btnExploreSeries.focus({ preventScroll: true });
      return;
    }
    if (this.currentView === 'series') {
      document.body.classList.add('keyboard-nav');
      const first = this.getSeriesPageCards()[0];
      if (first) this.focusCard(first);
      else if (this.genreDropdownBtn) this.genreDropdownBtn.focus({ preventScroll: true });
      return;
    }
    const preferred = preferRowId && document.getElementById(preferRowId);
    const rows = Array.from(document.querySelectorAll('.row-cards'))
      .filter(r => r.offsetParent !== null && r.querySelector('.card'));
    const row = (preferred && rows.includes(preferred)) ? preferred : rows[0];
    if (!row) return;
    document.body.classList.add('keyboard-nav');
    this.focusCard(row.querySelector('.card'));
  }

  handleNavbarKeys(e, current) {
    const items = this.getNavItems();
    const idx = items.indexOf(current);
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      this.focusNavItem(items[idx - 1]);
    } else if (e.key === 'ArrowRight' && idx < items.length - 1) {
      e.preventDefault();
      this.focusNavItem(items[idx + 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusFirstRow();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
    } else if (e.key === 'Escape') {
      current.blur();
    }
    // Enter: los enlaces y botones ya lo manejan solos
  }

  handleKeyNav(e) {
    // Pantalla de perfiles: tiene sus propias teclas (ver bindProfileGate)
    if (!this.profileGate.hidden) return;

    // El reproductor tiene sus propios atajos
    const playerOverlay = document.getElementById('playerOverlay');
    if (playerOverlay && playerOverlay.classList.contains('active')) return;

    // Buscador: se puede escribir normal; ↓ baja a los resultados, ←/→ en los bordes salen al menú
    if (e.target === this.searchInput && !document.querySelector('.modal.active')) {
      const input = this.searchInput;
      const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
      const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        this.focusFirstRow();
      } else if (e.key === 'ArrowLeft' && atStart) {
        e.preventDefault();
        this.handleNavbarKeys(e, input);
      } else if (e.key === 'ArrowRight' && atEnd) {
        e.preventDefault();
        this.handleNavbarKeys(e, input);
      } else if (e.key === 'Escape') {
        input.blur();
      }
      return;
    }

    // No interferir mientras se escribe
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    // Atajo "/" para ir directo al buscador
    if (e.key === '/' && !document.querySelector('.modal.active')) {
      e.preventDefault();
      this.focusNavItem(this.searchInput);
      return;
    }

    // Menú superior (Inicio, Series, Favoritos, buscador, Escanear PC)
    if (!document.querySelector('.modal.active') && this.getNavItems().includes(document.activeElement)) {
      this.handleNavbarKeys(e, document.activeElement);
      return;
    }

    const openModal = document.querySelector('.modal.active');
    if (openModal) {
      // Ventana de carga: no se puede cerrar ni usar el teclado hasta que termine
      if (openModal.id === 'loadingModal') {
        e.preventDefault();
        return;
      }
      // Configuración: Esc la cierra sin guardar; el resto de teclas son del formulario
      if (openModal === this.settingsModal) {
        if (e.key === 'Escape') this.closeSettings();
        return;
      }
      // Editor: Esc cancela y vuelve a la ficha de la serie
      if (openModal === this.editModal) {
        if (e.key === 'Escape') this.closeEditModal(true);
        return;
      }
      if (e.key === 'Escape') {
        if (openModal === this.scanModal) {
          this.closeScanWizard();
          return;
        }
        openModal.classList.remove('active');
        // Volver a la tarjeta desde la que se abrió
        if (openModal === this.seriesModal && this.lastOpenedCard && this.lastOpenedCard.isConnected) {
          this.focusCard(this.lastOpenedCard);
        }
        return;
      }
      if (openModal === this.seriesModal) this.handleModalKeyNav(e);
      return;
    }

    // Bloquear Ctrl+A (seleccionar todo) fuera de los campos de texto
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      return;
    }

    if (e.altKey || e.ctrlKey || e.metaKey) return;

    // L = agregar / quitar de Mi Lista la tarjeta seleccionada (o la que está bajo el mouse)
    if (e.key.toLowerCase() === 'l') {
      const target = (document.activeElement && document.activeElement.classList.contains('card'))
        ? document.activeElement
        : (this.hoveredCard && this.hoveredCard.isConnected ? this.hoveredCard : null);
      const series = target && this.seriesList.find(s => s.id === target.dataset.seriesId);
      if (series) {
        e.preventDefault();
        this.toggleMyList(series, target.querySelector('.btn-card-mylist'));
      }
      return;
    }

    // Vista Mi Lista: cuadrícula; ↑ desde la primera línea sube al menú
    if (this.currentView === 'mylist') {
      const toNav = () => this.focusNavItem(document.getElementById('navMyList'));
      if (document.activeElement === this.btnExploreSeries) {
        if (e.key === 'ArrowUp') { e.preventDefault(); toNav(); }
        return;
      }
      this.handleGridKeys(e, Array.from(this.myListGrid.querySelectorAll('.card')), toNav);
      return;
    }

    // Vista Resultados: cuadrícula; ↑ desde la primera línea vuelve al buscador
    if (this.currentView === 'search') {
      this.handleGridKeys(e, Array.from(this.searchGrid.querySelectorAll('.card')), () => this.focusNavItem(this.searchInput));
      return;
    }

    // Vista Series: si no la maneja (modo filas), sigue con la navegación por filas de abajo
    if (this.currentView === 'series' && this.handleSeriesPageKeys(e)) return;

    const rows = Array.from(document.querySelectorAll('.row-cards'))
      .filter(r => r.offsetParent !== null && r.querySelector('.card'));
    if (rows.length === 0) return;

    const current = document.activeElement && document.activeElement.classList.contains('card')
      ? document.activeElement
      : null;

    if (e.key === 'Enter' && current) {
      e.preventDefault();
      this.lastOpenedCard = current;
      current.click();
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    document.body.classList.add('keyboard-nav'); // apaga el hover del mouse mientras se usa el teclado

    // Sin tarjeta seleccionada: empezar por la que está bajo el mouse, o la primera
    if (!current) {
      const hovered = this.hoveredCard && this.hoveredCard.isConnected && this.hoveredCard.offsetParent !== null
        ? this.hoveredCard
        : null;
      this.focusCard(hovered || rows[0].querySelector('.card'));
      return;
    }

    const row = current.parentElement;
    const cards = Array.from(row.querySelectorAll('.card'));
    const idx = cards.indexOf(current);
    const rowIdx = rows.indexOf(row);

    if (e.key === 'ArrowLeft' && idx > 0) {
      this.focusCard(cards[idx - 1]);
    } else if (e.key === 'ArrowRight' && idx < cards.length - 1) {
      this.focusCard(cards[idx + 1]);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const targetRow = rows[rowIdx + (e.key === 'ArrowDown' ? 1 : -1)];
      if (!targetRow) {
        if (e.key === 'ArrowUp') {
          if (this.currentView === 'series') {
            // En Series (modo filas) subir a la barra de controles
            this.focusSeriesSubnav(this.genreDropdownBtn);
          } else {
            // Subir al menú, a la opción que está activa
            this.focusNavItem(document.querySelector('.nav-links a.active') || this.getNavItems()[0]);
          }
        }
        return;
      }
      // Ir a la tarjeta visualmente más cercana en la otra fila
      const x = current.getBoundingClientRect().left;
      const targetCards = Array.from(targetRow.querySelectorAll('.card'));
      const closest = targetCards.reduce((best, c) =>
        Math.abs(c.getBoundingClientRect().left - x) < Math.abs(best.getBoundingClientRect().left - x) ? c : best
      );
      this.focusCard(closest);
    }
  }

  handleModalKeyNav(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    // L = agregar / quitar esta serie de Mi Lista
    if (e.key.toLowerCase() === 'l' && this.activeSeries) {
      e.preventDefault();
      this.toggleMyList(this.activeSeries, this.modalMyListBtn);
      return;
    }

    // E = editar la información de la serie
    if (e.key.toLowerCase() === 'e' && this.activeSeries) {
      e.preventDefault();
      this.openEditModal(this.activeSeries);
      return;
    }

    // Botones de arriba (en fila: Reproducir · Favoritos · Editar) y episodios (en columna)
    const buttons = [this.modalPlayBtn, this.modalMyListBtn, this.modalEditBtn]
      .filter(b => b && b.offsetParent !== null);
    const episodes = [...this.episodesList.querySelectorAll('.episode-item')];
    const current = document.activeElement;
    const btnIdx = buttons.indexOf(current);
    const epIdx = episodes.indexOf(current);

    // Enter en un episodio lo reproduce (los botones ya responden solos a Enter)
    if (e.key === 'Enter') {
      if (current && current.classList.contains('episode-item')) {
        e.preventDefault();
        current.click();
      }
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    document.body.classList.add('keyboard-nav');

    // Nada seleccionado todavía: empezar por "Reproducir"
    if (btnIdx === -1 && epIdx === -1) {
      this.focusModalItem(buttons[0]);
      return;
    }

    // En los botones: ←/→ pasan de uno a otro, ↓ baja a los episodios
    if (btnIdx !== -1) {
      if (e.key === 'ArrowLeft' && btnIdx > 0) {
        this.focusModalItem(buttons[btnIdx - 1]);
      } else if (e.key === 'ArrowRight' && btnIdx < buttons.length - 1) {
        this.focusModalItem(buttons[btnIdx + 1]);
      } else if (e.key === 'ArrowDown' && episodes.length) {
        this.lastModalButton = current; // para volver a este mismo botón con ↑
        this.focusModalItem(episodes[0]);
      }
      return;
    }

    // En los episodios: ←/→ cambian de temporada
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const sel = this.seasonSelect;
      const next = sel.selectedIndex + (e.key === 'ArrowRight' ? 1 : -1);
      if (next < 0 || next >= sel.options.length) return;
      sel.selectedIndex = next;
      sel.dispatchEvent(new Event('change'));
      this.showToast(sel.options[next].textContent);
      this.focusModalItem(this.episodesList.querySelector('.episode-item'));
      return;
    }

    // ↑/↓ entre episodios; ↑ desde el primero vuelve al botón de arriba en el que se estaba
    if (e.key === 'ArrowDown' && epIdx < episodes.length - 1) {
      this.focusModalItem(episodes[epIdx + 1]);
    } else if (e.key === 'ArrowUp') {
      if (epIdx > 0) {
        this.focusModalItem(episodes[epIdx - 1]);
      } else {
        const back = buttons.includes(this.lastModalButton) ? this.lastModalButton : buttons[0];
        this.focusModalItem(back);
      }
    }
  }

  focusModalItem(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    const content = this.seriesModal.querySelector('.modal-content');
    if (el === this.modalPlayBtn) {
      content.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Como scrollIntoView({ block: 'nearest' }), pero sin salir de la ficha: scrollIntoView
    // también movía la página que está detrás
    const MARGIN = 16;
    for (let box = el.parentElement; box; box = box.parentElement) {
      const scrolls = /(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight;
      if (scrolls) {
        const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
        let delta = 0;
        if (r.top < b.top + MARGIN) delta = r.top - b.top - MARGIN;
        else if (r.bottom > b.bottom - MARGIN) delta = r.bottom - b.bottom + MARGIN;
        if (delta) box.scrollBy({ top: delta, behavior: 'smooth' });
      }
      if (box === content) break;
    }
  }

  focusCard(card) {
    if (!card) return;
    card.focus({ preventScroll: true });

    // Cuadrícula de la vista Series: solo desplazar la página si la tarjeta no se ve
    if (card.closest('.series-grid')) {
      const rect = card.getBoundingClientRect();
      // La barra de Series queda fija arriba; la tarjeta debe verse por debajo de ella
      const bar = document.getElementById('seriesSubnav');
      const topLimit = bar ? Math.max(90, bar.getBoundingClientRect().bottom + 10) : 90;
      if (rect.top < topLimit || rect.bottom > window.innerHeight - 10) {
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }

    // Centrar la fila en pantalla y desplazar la tarjeta dentro de la fila
    const section = card.closest('.category-row');
    if (section) {
      const rect = section.getBoundingClientRect();
      // En Series (modo filas) también hay que dejar libre la barra fija
      const bar = this.currentView === 'series' ? document.getElementById('seriesSubnav') : null;
      const topLimit = bar ? Math.max(80, bar.getBoundingClientRect().bottom) : 80;
      if (rect.top < topLimit || rect.bottom > window.innerHeight) {
        section.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    const row = card.parentElement;
    const cardLeft = card.offsetLeft; // .row-cards es position: relative
    const pad = 60;
    // Se compara con el destino de la animación en curso (no con la posición actual):
    // con la flecha pisada la fila ya va en camino
    const anim = this.rowAnims && this.rowAnims.get(row);
    const from = anim ? anim.target : row.scrollLeft;
    if (cardLeft - pad < from) {
      this.scrollRowTo(row, cardLeft - pad, card);
    } else if (cardLeft + card.offsetWidth + pad > from + row.clientWidth) {
      this.scrollRowTo(row, cardLeft + card.offsetWidth + pad - row.clientWidth, card);
    } else if (anim) {
      anim.card = card;
    }
  }

  /**
   * Desplaza una fila hasta `target` con una sola animación que se va actualizando.
   * Antes cada pulsación lanzaba un scrollTo suave nuevo que reiniciaba el anterior: con la
   * flecha pisada (~30 por segundo) la fila nunca alcanzaba a la selección y el recuadro
   * blanco quedaba fuera de la vista. Además, `card` nunca se deja salir de la fila.
   */
  scrollRowTo(row, target, card) {
    if (!this.rowAnims) this.rowAnims = new WeakMap();
    const max = row.scrollWidth - row.clientWidth;
    target = Math.max(0, Math.min(max, target));

    const EASE = 0.2;   // fracción del camino por cuadro de 60 fps
    const EDGE = 16;    // margen para el borde blanco y el zoom de la tarjeta

    // Posición más cercana a `pos` con la que la tarjeta seleccionada se ve entera
    const keepVisible = (pos, c) => {
      if (!c || !c.isConnected) return pos;
      const left = c.offsetLeft, right = left + c.offsetWidth;
      pos = Math.min(Math.max(pos, right + EDGE - row.clientWidth), left - EDGE);
      // Primera / última tarjeta: el margen no puede pedir más allá del borde de la fila
      return Math.max(0, Math.min(row.scrollWidth - row.clientWidth, pos));
    };

    let a = this.rowAnims.get(row);
    if (a) {
      a.target = target;
      a.card = card;
    } else {
      a = { target, card, pos: row.scrollLeft, last: row.scrollLeft, time: performance.now() };
      this.rowAnims.set(row, a);
    }
    // Si la tarjeta nueva ya quedó fuera de la vista, corregir ahora mismo (no en el
    // próximo cuadro): así nunca se dibuja un cuadro sin el recuadro de selección
    const fixed = keepVisible(a.pos, card);
    if (fixed !== a.pos) {
      a.pos = fixed;
      row.scrollTo({ left: a.pos, behavior: 'instant' });
      a.last = row.scrollLeft;
    }
    if (a.running) return; // la animación ya en marcha sigue hacia el destino nuevo
    a.running = true;

    const step = (now) => {
      // Otro movimiento (rueda, arrastre con el mouse): se le cede el control
      if (Math.abs(row.scrollLeft - a.last) > 2) {
        this.rowAnims.delete(row);
        return;
      }
      const k = 1 - Math.pow(1 - EASE, (now - a.time) / (1000 / 60));
      a.time = now;
      // La tarjeta seleccionada siempre a la vista, aunque la animación vaya detrás
      a.pos = keepVisible(a.pos + (a.target - a.pos) * k, a.card);
      if (Math.abs(a.target - a.pos) < 0.5) a.pos = a.target;
      // 'instant': el scroll-behavior: smooth del CSS no debe animar cada cuadro por su cuenta
      row.scrollTo({ left: a.pos, behavior: 'instant' });
      a.last = row.scrollLeft;
      if (a.pos === a.target) {
        this.rowAnims.delete(row);
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  setupSingleRowScrolling(container) {
    if (!container || container.dataset.scrollInitialized) return;
    container.dataset.scrollInitialized = 'true';
    const row = container.querySelector('.row-cards');
    if (!row) return;

    // Flechas izquierda / derecha
    const left = document.createElement('button');
    left.className = 'row-arrow left hidden';
    left.innerHTML = '&#8249;';
    left.title = 'Anterior';
    const right = document.createElement('button');
    right.className = 'row-arrow right';
    right.innerHTML = '&#8250;';
    right.title = 'Siguiente';
    container.append(left, right);

    const step = () => Math.max(row.clientWidth * 0.8, 240);
    left.addEventListener('click', () => row.scrollBy({ left: -step(), behavior: 'smooth' }));
    right.addEventListener('click', () => row.scrollBy({ left: step(), behavior: 'smooth' }));

    const updateArrows = () => {
      const max = row.scrollWidth - row.clientWidth;
      left.classList.toggle('hidden', row.scrollLeft <= 2);
      right.classList.toggle('hidden', row.scrollLeft >= max - 2);
    };
    row.addEventListener('scroll', updateArrows, { passive: true });
    // ResizeObserver en vez de window 'resize': se va junto con la fila cuando se vuelve a
    // dibujar (antes cada fila nueva dejaba un listener en window que nunca se quitaba)
    new ResizeObserver(updateArrows).observe(row);
    new MutationObserver(updateArrows).observe(row, { childList: true });

    // La rueda del mouse (vertical → horizontal, con movimiento suave) la maneja smooth-scroll.js

    // Arrastrar con el mouse. Los listeners de window solo existen mientras se arrastra
    // (antes cada fila dejaba los suyos para siempre y se acumulaban al navegar)
    let startX = 0, startScroll = 0, moved = false;
    const onMove = (e) => {
      const dx = e.pageX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        row.classList.add('dragging');
      }
      if (moved) row.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      row.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    row.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      moved = false;
      startX = e.pageX;
      startScroll = row.scrollLeft;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
    row.addEventListener('click', (e) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    }, true);
    row.addEventListener('dragstart', (e) => e.preventDefault());

    updateArrows();
  }

  setupRowScrolling() {
    document.querySelectorAll('.row-container').forEach(container => {
      this.setupSingleRowScrolling(container);
    });
  }

  async loadCatalog() {
    try {
      const res = await fetch('/api/series');
      this.seriesList = await res.json();
    } catch (err) {
      console.error('Error cargando catálogo:', err);
      this.showToast('Error conectando con el servidor', 'error');
    }
  }

  async loadProgress() {
    try {
      const res = await fetch('/api/progress');
      this.progressMap = await res.json();
    } catch (err) {
      console.error('Error cargando progreso:', err);
    }
  }

  render() {
    if (!this.seriesList || this.seriesList.length === 0) return;

    // Banner principal: una de tus series, distinta cada vez que se abre la app
    this.renderHero(this.pickFeatured('home'));

    // Render Categories
    this.renderRow(this.cardsTrending, this.seriesList);
    this.countTrending.textContent = `(${this.seriesList.length})`;

    // Filter Local Files
    const localSeries = this.seriesList.filter(s => 
      s.genres.includes('Medios Locales') || s.seasons.some(sn => sn.episodes.some(ep => ep.localPath))
    );
    this.renderRow(this.cardsLocal, localSeries.length > 0 ? localSeries : this.seriesList);

    // Una fila por género, sin repetir series entre ellas
    this.renderHomeGenreRows();

    // Continue Watching Row
    this.renderContinueWatching();

    // Si se está en la vista Series (p. ej. tras escanear), actualizarla también
    if (this.currentView === 'series') {
      this.renderSeriesBillboard();
      this.renderGenreDropdown();
      this.renderSeriesContent();
    }
    if (this.currentView === 'mylist') this.renderMyListPage();
    if (this.currentView === 'search') this.renderSearchPage();

    if (window.lucide) lucide.createIcons();
  }

  /**
   * Elige la serie destacada de un banner (antes siempre era la de ejemplo marcada como
   * "featured"). Prefiere tus series del PC que ya tienen imagen y descripción, y no repite
   * la de la última vez que se abrió la app. Durante la sesión se mantiene la misma
   * (render() se llama a menudo: al editar, al terminar de buscar información...).
   * key: banner ('home', 'genre:Acción'...). filter: limitar a ciertas series (opcional).
   */
  pickFeatured(key, filter = () => true) {
    if (!this.featuredPicks) this.featuredPicks = {};
    const list = this.seriesList.filter(filter);
    const kept = list.find(s => s.id === this.featuredPicks[key]);
    if (kept) return kept;
    if (!list.length) return null;

    const isLocal = s => (s.seasons || []).some(sn => (sn.episodes || []).some(ep => ep.localPath));
    let pool = list.filter(s => isLocal(s) && s.banner && s.description);
    if (!pool.length) pool = list.filter(isLocal);
    if (!pool.length) pool = list;

    const storageKey = `lastFeatured:${key}`;
    let last = null;
    try { last = localStorage.getItem(storageKey); } catch (_) { /* sin almacenamiento */ }
    if (pool.length > 1) pool = pool.filter(s => s.id !== last);

    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.featuredPicks[key] = pick.id;
    try { localStorage.setItem(storageKey, pick.id); } catch (_) { /* sin almacenamiento */ }
    return pick;
  }

  renderHero(series) {
    if (!series) return;
    this.heroSection.style.backgroundImage = `url('${series.banner}')`;
    this.heroTitle.textContent = series.title;
    this.heroDesc.textContent = series.description;
    this.heroMatch.textContent = series.match || '98% Coincidencia';
    this.heroRating.textContent = series.rating || '16+';

    // Format list badge
    const formats = new Set();
    series.seasons.forEach(sn => sn.episodes.forEach(ep => formats.add((ep.format || 'mp4').toUpperCase())));
    this.heroFormats.textContent = Array.from(formats).join(' • ') || 'MP4 • MKV • WEBM';

    this.heroPlayBtn.onclick = () => {
      const firstEp = series.seasons[0]?.episodes[0];
      if (firstEp && window.player) {
        window.player.playEpisode(series, firstEp);
      }
    };

    this.heroInfoBtn.onclick = () => this.openSeriesModal(series);

    if (this.heroMyListBtn) {
      this.setMyListButton(this.heroMyListBtn, series);
      this.heroMyListBtn.onclick = () => this.toggleMyList(series, this.heroMyListBtn);
    }
  }

  renderRow(container, list) {
    container.innerHTML = '';
    list.forEach(series => container.appendChild(this.createSeriesCard(series)));
  }

  /**
   * Reparte las series en filas de género para el inicio, cada serie en UNA sola fila.
   * Se usa el género más específico de cada serie ("Anime" y "Animación" casi todas lo son,
   * solo cuentan si no hay otro) y se equilibran las filas: cada serie va a la fila de sus
   * géneros que lleve menos. Las filas de menos de 3 se reparten o van a "Más de tu biblioteca".
   */
  buildGenreRows(series) {
    const IGNORE = new Set(['Medios Locales']);
    const BROAD = new Set(['Anime', 'Animación']);
    const MIN_ROW = 3;

    const genresOf = (s) => {
      const all = (s.genres || []).filter(g => !IGNORE.has(g));
      const specific = all.filter(g => !BROAD.has(g));
      return specific.length ? specific : all;
    };
    const counts = {};
    series.forEach(s => genresOf(s).forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
    const candidatesOf = (s) => genresOf(s).filter(g => counts[g] >= MIN_ROW);

    const rows = {};
    const leftovers = [];
    // Primero las series con menos opciones, para que no se queden sin fila
    [...series]
      .sort((a, b) => candidatesOf(a).length - candidatesOf(b).length)
      .forEach(s => {
        const cands = candidatesOf(s);
        if (!cands.length) { leftovers.push(s); return; }
        // A igualdad, gana el primer género de la serie (el principal)
        const g = cands.reduce((best, c) => ((rows[c] || []).length < (rows[best] || []).length ? c : best));
        (rows[g] = rows[g] || []).push(s);
      });

    Object.keys(rows).forEach(g => {
      if (rows[g].length >= MIN_ROW) return;
      rows[g].forEach(s => {
        const other = candidatesOf(s).find(c => c !== g && rows[c] && rows[c].length >= MIN_ROW);
        if (other) rows[other].push(s); else leftovers.push(s);
      });
      delete rows[g];
    });

    const out = Object.entries(rows)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([genre, list]) => ({ genre, list }));
    if (leftovers.length) out.push({ genre: 'Más de tu biblioteca', list: leftovers });
    return out;
  }

  renderHomeGenreRows() {
    if (!this.homeGenreRows) return;
    this.homeGenreRows.innerHTML = '';
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.buildGenreRows(this.seriesList).forEach(({ genre, list }) => {
      const section = document.createElement('section');
      section.className = 'category-row';
      section.innerHTML = `
        <h2 class="category-title">${esc(genre)} <span class="count">(${list.length})</span></h2>
        <div class="row-container">
          <div class="row-cards"></div>
        </div>`;
      this.renderRow(section.querySelector('.row-cards'), list);
      this.homeGenreRows.appendChild(section);
      this.setupSingleRowScrolling(section.querySelector('.row-container'));
    });
  }

  createSeriesCard(series) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.dataset.seriesId = series.id;

    // Determine format badge
    const formats = new Set();
    series.seasons.forEach(sn => sn.episodes.forEach(ep => formats.add((ep.format || 'mp4').toLowerCase())));
    const fmtArray = Array.from(formats);
    const mainFmt = fmtArray.length === 1 ? fmtArray[0] : 'multi';
    const firstEp = series.seasons[0]?.episodes[0];

    card.innerHTML = `
      <div class="card-top-badges">
        <span class="card-n-badge${this.isMovie(series) ? ' is-movie' : ''}"><span class="n-symbol">${BRAND_LOGO_SVG}</span> ${this.typeLabel(series)}</span>
        <span class="format-badge format-${mainFmt}">${mainFmt.toUpperCase()}</span>
      </div>
      <img class="card-img" src="${series.poster}" alt="${series.title}" decoding="async">
      <div class="card-overlay">
        <h3 class="card-title">${series.title}</h3>
        <div class="card-meta">
          <span class="hero-match">${series.match || '98% Coincidencia'}</span>
          <span class="meta-rating">${series.rating || '16+'}</span>
          <span style="font-size: 12px; color: #bbb;">${this.isMovie(series) ? (series.year || 'Película') : `${series.seasonsCount || (series.seasons || []).length} Temp`}</span>
        </div>
        <div class="card-genres">${(series.genres || []).slice(0, 3).join(' • ')}</div>
        <div class="card-actions">
          <button class="btn-card-play" title="Reproducir">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="btn-card-mylist" type="button"></button>
          <button class="btn-card-info" title="Más información">
            <svg class="lucide lucide-info" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      this.lastOpenedCard = card;
      this.openSeriesModal(series);
    });

    const playBtn = card.querySelector('.btn-card-play');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (firstEp && window.player) {
          window.player.playEpisode(series, firstEp);
        }
      });
    }

    const myListBtn = card.querySelector('.btn-card-mylist');
    this.setMyListButton(myListBtn, series);
    myListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMyList(series, myListBtn);
    });

    const infoBtn = card.querySelector('.btn-card-info');
    if (infoBtn) {
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.lastOpenedCard = card;
        this.openSeriesModal(series);
      });
    }

    card.addEventListener('mouseenter', () => {
      this.hoveredCard = card;
    });
    card.addEventListener('mouseleave', () => {
      if (this.hoveredCard === card) this.hoveredCard = null;
    });

    return card;
  }

  /* ---------- Editar información de una serie ---------- */

  bindEditModal() {
    if (!this.editModal) return;
    const $ = (id) => document.getElementById(id);

    this.modalEditBtn.addEventListener('click', () => {
      if (this.activeSeries) this.openEditModal(this.activeSeries);
    });
    $('closeEditModal').addEventListener('click', () => this.closeEditModal(true));
    $('editCancelBtn').addEventListener('click', () => this.closeEditModal(true));
    this.editModal.addEventListener('click', (e) => {
      if (e.target === this.editModal) this.closeEditModal(true);
    });
    this.editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEdits();
    });

    // "Restaurar automático": marca el campo para que vuelva a ser automático al guardar
    this.editForm.querySelectorAll('.edit-reset').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.closest('.edit-field');
        const name = field.dataset.field;
        if (this.editReset.has(name)) {
          this.editReset.delete(name);
          field.classList.remove('resetting');
          btn.textContent = btn.dataset.label;
        } else {
          this.editReset.add(name);
          field.classList.add('resetting');
          btn.dataset.label = btn.dataset.label || btn.textContent;
          btn.textContent = 'Deshacer';
        }
      });
    });

    // Imágenes: subir desde el PC o pegar un enlace
    [['poster', 1000, 1500], ['banner', 1920, 1080]].forEach(([kind, maxW, maxH]) => {
      const cap = kind[0].toUpperCase() + kind.slice(1);
      const fileInput = $(`edit${cap}File`);
      const urlInput = $(`edit${cap}Url`);
      const preview = $(`edit${cap}Preview`);

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        fileInput.value = '';
        if (!file) return;
        try {
          const dataUrl = await this.resizeImageFile(file, maxW, maxH);
          this.editPending[kind] = dataUrl;
          urlInput.value = '';
          preview.style.backgroundImage = `url('${dataUrl}')`;
        } catch (err) {
          this.showToast('No se pudo leer esa imagen', 'error');
        }
      });

      urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        if (/^https?:\/\/\S+$/i.test(url)) {
          this.editPending[kind] = url;
          preview.style.backgroundImage = `url('${url.replace(/'/g, '%27')}')`;
        } else if (!url && typeof this.editPending[kind] === 'string' && !this.editPending[kind].startsWith('data:')) {
          this.editPending[kind] = null;
          preview.style.backgroundImage = `url('${this.editingSeries[kind] || ''}')`;
        }
      });
    });
  }

  // Géneros para mostrar/editar (sin la etiqueta interna "Medios Locales")
  editableGenres(series) {
    return (series.genres || []).filter(g => g !== 'Medios Locales');
  }

  openEditModal(series) {
    this.editingSeries = series;
    this.editPending = { poster: null, banner: null };
    this.editReset = new Set();
    const $ = (id) => document.getElementById(id);
    const locked = new Set(series.lockedFields || []);

    $('editTitle').value = series.title || '';
    $('editResearch').checked = true;
    $('editType').value = this.isMovie(series) ? 'movie' : 'series';
    $('editDescription').value = series.description || '';
    $('editGenres').value = this.editableGenres(series).join(', ');
    $('editPosterUrl').value = '';
    $('editBannerUrl').value = '';
    $('editPosterPreview').style.backgroundImage = `url('${series.poster || ''}')`;
    $('editBannerPreview').style.backgroundImage = `url('${series.banner || series.poster || ''}')`;

    this.editForm.querySelectorAll('.edit-field').forEach(f => {
      f.classList.toggle('locked', locked.has(f.dataset.field));
      f.classList.remove('resetting');
      const btn = f.querySelector('.edit-reset');
      if (btn && btn.dataset.label) btn.textContent = btn.dataset.label;
    });

    // La ficha se cierra mientras se edita y se vuelve a abrir al terminar
    this.seriesModal.classList.remove('active');
    this.editModal.classList.add('active');
    this.editModal.querySelector('.modal-content').scrollTop = 0;
    requestAnimationFrame(() => $('editTitle').focus());
  }

  closeEditModal(reopenSeries) {
    this.editModal.classList.remove('active');
    if (reopenSeries && this.editingSeries) {
      // Reabrir la ficha con los datos actuales de la serie
      const current = this.seriesList.find(s => s.id === this.editingSeries.id) || this.editingSeries;
      this.openSeriesModal(current);
    }
    this.editingSeries = null;
  }

  async saveEdits() {
    const s = this.editingSeries;
    if (!s) return;
    const $ = (id) => document.getElementById(id);
    const edits = {};

    const title = $('editTitle').value.trim();
    const description = $('editDescription').value.trim();
    const genres = $('editGenres').value.split(',').map(g => g.trim()).filter(Boolean);

    if (!title) {
      this.showToast('El título no puede estar vacío', 'error');
      $('editTitle').focus();
      return;
    }
    // Solo se envía (y se bloquea) lo que realmente cambió
    if (title !== (s.title || '')) edits.title = title;
    if (description !== (s.description || '').trim()) edits.description = description;
    if (genres.join('|') !== this.editableGenres(s).join('|')) edits.genres = genres;
    const type = $('editType').value;
    if (type !== (this.isMovie(s) ? 'movie' : 'series')) edits.type = type;
    if (this.editPending.poster) edits.poster = this.editPending.poster;
    if (this.editPending.banner) edits.banner = this.editPending.banner;

    // Un campo marcado para restaurar no se envía como edición
    this.editReset.forEach(f => delete edits[f]);
    const reset = [...this.editReset];

    if (!Object.keys(edits).length && !reset.length) {
      this.closeEditModal(true);
      return;
    }

    // Cambió el título y está marcado "Buscar la serie con este nombre":
    // buscarla y completar su información (el título pasa a ser el oficial)
    if ('title' in edits && $('editResearch').checked) {
      return this.researchWithTitle(s, edits, reset);
    }

    const btn = $('editSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      const res = await fetch(`/api/series/${encodeURIComponent(s.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits, reset })
      });
      const data = await res.json().catch(() => ({}));
      // 404 sin mensaje propio: el servidor en marcha es una versión anterior sin esta función
      if (res.status === 404 && !data.error) {
        throw new Error('cierra y vuelve a abrir la app para activar la edición');
      }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      // Actualizar la serie en memoria y redibujar todo
      const idx = this.seriesList.findIndex(x => x.id === s.id);
      if (idx !== -1) this.seriesList[idx] = data.series;
      this.render();
      // El título escrito en inglés se guardó traducido al español
      const translated = 'title' in edits && data.series.title !== String(edits.title).trim();
      this.showToast(reset.length ? 'Cambios guardados. Restaurando lo automático…'
        : translated ? `Cambios guardados. Título en español: «${data.series.title}»` : 'Cambios guardados');
      this.closeEditModal(true);

      // Lo restaurado se recupera en segundo plano; al terminar se recarga el catálogo
      if (data.refreshing) this.watchMetadata(false);
    } catch (err) {
      this.showToast(`No se pudo guardar: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  }

  // Busca la información de la serie con el título nuevo (edits.title), mostrando la ventana
  // "Cargando nueva información…". Los demás cambios de `edits` se guardan como editados a mano.
  async researchWithTitle(series, edits, reset = []) {
    const title = edits.title;
    const loading = document.getElementById('loadingModal');
    document.getElementById('loadingText').textContent = `Buscando «${title}»`;
    this.editModal.classList.remove('active');
    this.editingSeries = null;
    loading.classList.add('active');
    const started = Date.now();

    let updated = null;
    let research = null;
    let error = null;
    try {
      const res = await fetch(`/api/series/${encodeURIComponent(series.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits, reset, research: true })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 && !data.error) throw new Error('cierra y vuelve a abrir la app para activar la edición');
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      updated = data.series;
      research = data.research;
    } catch (err) {
      error = err;
    }

    // Mostrar la ventana al menos un momento para que no sea un parpadeo
    const wait = 700 - (Date.now() - started);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    loading.classList.remove('active');

    if (error) {
      this.showToast(`No se pudo actualizar: ${error.message}`, 'error');
      this.openSeriesModal(series);
      return;
    }

    const idx = this.seriesList.findIndex(x => x.id === series.id);
    if (idx !== -1) this.seriesList[idx] = updated;
    this.render();
    this.openSeriesModal(updated);

    if (research && research.found) {
      const extra = research.year ? ` (${research.year})` : '';
      this.showToast(`Información actualizada: «${updated.title}»${extra}`);
    } else {
      this.showToast(`No se encontró información para «${title}». Se guardó el título como «${updated.title}».`, 'error');
    }
  }

  // Reduce una imagen del PC (para no guardar fotos enormes) y la devuelve como data URL
  resizeImageFile(file, maxW, maxH) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('No es una imagen'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Imagen no válida'));
      };
      img.src = url;
    });
  }

  /* ---------- Mi Lista (favoritos) ---------- */

  async loadMyList() {
    // Copia local por si el servidor no responde (p. ej. si no se reinició tras actualizar)
    let local = [];
    try { local = JSON.parse(localStorage.getItem(hiyProfileKey('myList')) || '[]'); } catch (_) { local = []; }

    try {
      const res = await fetch('/api/mylist');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.myList = data.map(item => item.id);
      this.myListServerOk = true;

      // Si el servidor está vacío pero hay favoritos guardados localmente
      // (agregados antes de reiniciar la app), se pasan al servidor.
      if (this.myList.length === 0 && local.length > 0) {
        this.myList = local;
        for (const id of [...local].reverse()) {
          await fetch('/api/mylist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seriesId: id })
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Mi Lista: usando copia local.', err);
      this.myList = local;
      this.myListServerOk = false;
    }
    this.saveMyListLocal();
  }

  saveMyListLocal() {
    try { localStorage.setItem(hiyProfileKey('myList'), JSON.stringify(this.myList)); } catch (_) { /* sin almacenamiento */ }
  }

  isInMyList(seriesId) {
    return this.myList.includes(seriesId);
  }

  // Pone el ícono y el texto correctos en un botón de Mi Lista
  setMyListButton(btn, series) {
    if (!btn || !series) return;
    const inList = this.isInMyList(series.id);
    btn.dataset.seriesId = series.id;
    btn.classList.toggle('in-list', inList);
    btn.title = inList ? 'Quitar de Favoritos (L)' : 'Agregar a Favoritos (L)';
    btn.setAttribute('aria-pressed', inList);
    if (btn.classList.contains('btn-card-mylist')) {
      btn.innerHTML = inList ? MYLIST_ICON_CHECK : MYLIST_ICON_ADD;
    } else {
      btn.innerHTML = `${inList ? MYLIST_ICON_CHECK : MYLIST_ICON_ADD}<span>Favoritos</span>`;
    }
  }

  // Actualiza todos los botones de Mi Lista que hay en pantalla
  refreshMyListButtons() {
    document.querySelectorAll('.btn-card-mylist, .btn-mylist').forEach(btn => {
      const series = this.seriesList.find(s => s.id === btn.dataset.seriesId);
      if (series) this.setMyListButton(btn, series);
    });
  }

  async toggleMyList(series, sourceBtn) {
    if (!series) return;
    const adding = !this.isInMyList(series.id);

    // Se actualiza al instante y luego se guarda
    if (adding) this.myList.unshift(series.id);
    else this.myList = this.myList.filter(id => id !== series.id);
    this.saveMyListLocal();
    this.refreshMyListButtons();

    if (sourceBtn) {
      sourceBtn.classList.remove('mylist-pop');
      void sourceBtn.offsetWidth;
      sourceBtn.classList.add('mylist-pop');
    }
    this.showToast(adding ? `"${series.title}" se agregó a Favoritos` : `"${series.title}" se quitó de Favoritos`);

    if (this.currentView === 'mylist') {
      if (adding) this.renderMyListPage();
      else this.removeFromMyListPage(series.id);
    }

    try {
      const res = adding
        ? await fetch('/api/mylist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seriesId: series.id })
          })
        : await fetch(`/api/mylist/${encodeURIComponent(series.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Queda guardado en la copia local
      console.warn('Mi Lista: no se pudo guardar en el servidor.', err);
    }
  }

  // En la vista Mi Lista, la tarjeta quitada se desvanece y la selección pasa a la vecina
  removeFromMyListPage(seriesId) {
    const card = this.myListGrid.querySelector(`.card[data-series-id="${CSS.escape(seriesId)}"]`);
    if (!card) return this.renderMyListPage();
    const cards = Array.from(this.myListGrid.querySelectorAll('.card'));
    const idx = cards.indexOf(card);
    const hadFocus = card.contains(document.activeElement);
    card.classList.add('removing');
    setTimeout(() => {
      this.renderMyListPage();
      if (hadFocus) {
        const rest = Array.from(this.myListGrid.querySelectorAll('.card'));
        const next = rest[Math.min(idx, rest.length - 1)];
        if (next) this.focusCard(next);
        else if (this.btnExploreSeries) this.btnExploreSeries.focus({ preventScroll: true });
      }
    }, 300);
  }

  showMyListPage(fromKeyboard) {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.id === 'navMyList'));
    this.showView('mylist');
    this.renderMyListPage();
    if (fromKeyboard) {
      document.body.classList.add('keyboard-nav');
      const first = this.myListGrid.querySelector('.card');
      if (first) this.focusCard(first);
      else if (this.btnExploreSeries) this.btnExploreSeries.focus({ preventScroll: true });
    }
  }

  renderMyListPage() {
    if (!this.myListGrid) return;
    // Mantener el orden de Mi Lista (la más reciente primero) e ignorar series que ya no existen
    const q = this.searchInput.value.toLowerCase().trim();
    const all = this.myList
      .map(id => this.seriesList.find(s => s.id === id))
      .filter(Boolean);
    const list = all.filter(s => !q ||
      s.title.toLowerCase().includes(q) ||
      (s.genres || []).some(g => g.toLowerCase().includes(q)));

    this.myListGrid.innerHTML = '';
    list.forEach(s => this.myListGrid.appendChild(this.createSeriesCard(s)));
    this.myListGrid.hidden = list.length === 0;
    this.myListEmpty.hidden = all.length > 0;

    if (all.length === 0) {
      this.myListCount.textContent = '';
    } else if (list.length !== all.length) {
      this.myListCount.textContent = `Mostrando ${list.length} de ${all.length}`;
    } else {
      this.myListCount.textContent = `${all.length} ${all.length === 1 ? 'serie' : 'series'}`;
    }
    if (window.lucide) lucide.createIcons({ root: this.myListGrid });
  }

  /* ---------- Vista: Todas las Series (Estilo Oficial Netflix) ---------- */

  showView(view) {
    this.currentView = view; // 'home' | 'series' | 'mylist' | 'search'
    const isHome = view === 'home';
    this.heroSection.style.display = isHome ? '' : 'none';
    document.querySelector('.main-content').style.display = isHome ? '' : 'none';
    this.seriesPage.hidden = view !== 'series';
    if (this.myListPage) this.myListPage.hidden = view !== 'mylist';
    if (this.searchPage) this.searchPage.hidden = view !== 'search';
    this.closeGenreDropdown();
    this.closeSortDropdown();
    // Salto inmediato: con 'smooth' la animación quedaba a medias al cambiar el alto
    // de la página y el destacado aparecía cortado debajo de la barra.
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  showSeriesPage(fromKeyboard) {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.id === 'navSeries'));
    this.showView('series');
    this.renderSeriesBillboard();
    this.renderGenreDropdown();
    this.renderSeriesContent();
    if (window.lucide) lucide.createIcons();
    if (fromKeyboard) {
      document.body.classList.add('keyboard-nav');
      const firstCard = this.getSeriesPageCards()[0];
      if (firstCard) this.focusCard(firstCard);
    }
  }

  renderSeriesBillboard() {
    if (!this.seriesBillboard || !this.seriesList || this.seriesList.length === 0) return;
    
    // Todas: la misma serie que el banner de Inicio. Con un género: una de ese género
    const candidate = this.activeGenre === 'all'
      ? this.pickFeatured('home')
      : this.pickFeatured(`genre:${this.activeGenre}`, s => this.matchesGenreFilter(s)) || this.seriesList[0];

    if (!candidate) {
      this.seriesBillboard.style.display = 'none';
      return;
    }
    this.seriesBillboard.style.display = 'flex';

    if (this.seriesBillboardBackdrop) {
      this.seriesBillboardBackdrop.style.backgroundImage = `url('${candidate.banner || candidate.poster}')`;
    }
    if (this.seriesBillboardTitle) {
      this.seriesBillboardTitle.textContent = candidate.title;
    }
    if (this.seriesBillboardMatch) {
      this.seriesBillboardMatch.textContent = candidate.match || '98% Coincidencia';
    }
    if (this.seriesBillboardRating) {
      this.seriesBillboardRating.textContent = candidate.rating || '16+';
    }
    if (this.seriesBillboardSeasons) {
      const sCount = candidate.seasonsCount || candidate.seasons.length;
      this.seriesBillboardSeasons.textContent = this.isMovie(candidate)
        ? 'Película'
        : `${sCount} Temporada${sCount > 1 ? 's' : ''}`;
    }
    // "SERIE" / "PELÍCULA" junto al logo
    const badgeType = this.seriesBillboard.querySelector('.badge-type');
    if (badgeType) badgeType.textContent = this.typeLabel(candidate);
    if (this.seriesBillboardDesc) {
      this.seriesBillboardDesc.textContent = candidate.description;
    }

    // Formato
    const formats = new Set();
    candidate.seasons.forEach(sn => sn.episodes.forEach(ep => formats.add((ep.format || 'mp4').toUpperCase())));
    if (this.seriesBillboardFormat) {
      this.seriesBillboardFormat.textContent = Array.from(formats).join(' • ') || 'ULTRA HD';
    }

    // Botones
    if (this.seriesBillboardPlayBtn) {
      this.seriesBillboardPlayBtn.onclick = () => {
        const firstEp = candidate.seasons[0]?.episodes[0];
        if (firstEp && window.player) {
          window.player.playEpisode(candidate, firstEp);
        }
      };
    }
    if (this.seriesBillboardInfoBtn) {
      this.seriesBillboardInfoBtn.onclick = () => this.openSeriesModal(candidate);
    }
    if (this.seriesBillboardMyListBtn) {
      this.setMyListButton(this.seriesBillboardMyListBtn, candidate);
      this.seriesBillboardMyListBtn.onclick = () => this.toggleMyList(candidate, this.seriesBillboardMyListBtn);
    }
  }

  /* ---------- Tipo: película o serie ---------- */

  isMovie(series) {
    return !!series && series.type === 'movie';
  }

  typeLabel(series) {
    return this.isMovie(series) ? 'PELÍCULA' : 'SERIE';
  }

  // Filtros especiales del menú Géneros (por tipo)
  static get TYPE_FILTERS() {
    return { __series: 'Solo series', __movie: 'Solo películas' };
  }

  // ¿La serie pasa el filtro elegido en "Géneros"? (un género, o "Solo series"/"Solo películas")
  matchesGenreFilter(series, filter = this.activeGenre) {
    if (filter === 'all') return true;
    if (filter === '__movie') return this.isMovie(series);
    if (filter === '__series') return !this.isMovie(series);
    return (series.genres || []).includes(filter);
  }

  genreFilterLabel(filter = this.activeGenre) {
    if (filter === 'all') return 'Géneros';
    return NetflixApp.TYPE_FILTERS[filter] || filter;
  }

  renderGenreDropdown() {
    if (!this.genreDropdownGrid) return;
    const counts = {};
    this.seriesList.forEach(s => (s.genres || []).forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
    const movies = this.seriesList.filter(s => this.isMovie(s)).length;
    const typeCounts = { __series: this.seriesList.length - movies, __movie: movies };
    // Si el filtro elegido ya no tiene títulos (p. ej. tras escanear), volver a "Todos"
    const available = NetflixApp.TYPE_FILTERS[this.activeGenre] ? typeCounts[this.activeGenre] : counts[this.activeGenre];
    if (this.activeGenre !== 'all' && !available) this.activeGenre = 'all';
    const genres = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'es'));

    this.genreDropdownGrid.innerHTML = '';

    const typeItems = Object.entries(NetflixApp.TYPE_FILTERS)
      .filter(([value]) => typeCounts[value] > 0)
      .map(([value, label]) => [value, `${label} (${typeCounts[value]})`]);

    [['all', `Todos (${this.seriesList.length})`], ...typeItems, ...genres.map(g => [g, `${g} (${counts[g]})`])].forEach(([value, label]) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'genre-dropdown-item' + (this.activeGenre === value ? ' active' : '');
      item.textContent = label;
      item.addEventListener('click', (e) => {
        const fromKeyboard = e.detail === 0;
        this.selectGenre(value);
        this.closeGenreDropdown();
        // Con teclado, volver al botón "Géneros" para seguir navegando
        if (fromKeyboard && this.genreDropdownBtn) this.genreDropdownBtn.focus({ preventScroll: true });
      });
      this.genreDropdownGrid.appendChild(item);
    });

    if (this.genreDropdownLabel) {
      this.genreDropdownLabel.textContent = this.genreFilterLabel();
    }
  }

  // Crea las opciones del menú "Ordenar" a partir del <select> oculto
  buildSortDropdown() {
    if (!this.sortDropdownMenu || !this.seriesSort) return;
    this.sortDropdownMenu.innerHTML = '';
    Array.from(this.seriesSort.options).forEach(opt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sort-dropdown-item';
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      item.addEventListener('click', (e) => {
        const fromKeyboard = e.detail === 0;
        if (this.seriesSort.value !== opt.value) {
          this.seriesSort.value = opt.value;
          this.seriesSort.dispatchEvent(new Event('change'));
        }
        this.syncSortDropdown();
        this.closeSortDropdown();
        if (fromKeyboard) this.sortDropdownBtn.focus({ preventScroll: true });
      });
      this.sortDropdownMenu.appendChild(item);
    });
    this.syncSortDropdown();
  }

  // Muestra en el botón y en el menú la opción que está elegida
  syncSortDropdown() {
    if (!this.sortDropdownMenu || !this.seriesSort) return;
    const value = this.seriesSort.value;
    this.sortDropdownMenu.querySelectorAll('.sort-dropdown-item').forEach(i => {
      i.classList.toggle('active', i.dataset.value === value);
    });
    const opt = this.seriesSort.selectedOptions[0];
    if (this.sortDropdownLabel && opt) this.sortDropdownLabel.textContent = opt.textContent;
  }

  toggleSortDropdown(force) {
    if (!this.sortDropdown) return;
    const isOpen = this.sortDropdown.classList.toggle('open', typeof force === 'boolean' ? force : undefined);
    this.sortDropdownBtn.setAttribute('aria-expanded', isOpen);
    if (isOpen) this.closeGenreDropdown();
  }

  closeSortDropdown() {
    if (!this.sortDropdown) return;
    this.sortDropdown.classList.remove('open');
    if (this.sortDropdownBtn) this.sortDropdownBtn.setAttribute('aria-expanded', 'false');
  }

  toggleGenreDropdown() {
    if (!this.genreDropdownWrapper) return;
    this.closeSortDropdown();
    const isOpen = this.genreDropdownWrapper.classList.toggle('open');
    if (this.genreDropdownBtn) this.genreDropdownBtn.setAttribute('aria-expanded', isOpen);
  }

  closeGenreDropdown() {
    if (!this.genreDropdownWrapper) return;
    this.genreDropdownWrapper.classList.remove('open');
    if (this.genreDropdownBtn) this.genreDropdownBtn.setAttribute('aria-expanded', 'false');
  }

  selectGenre(genre) {
    this.activeGenre = genre;
    if (this.genreDropdownLabel) {
      this.genreDropdownLabel.textContent = this.genreFilterLabel(genre);
    }
    this.renderGenreDropdown();
    this.renderSeriesBillboard();
    this.renderSeriesContent();
  }

  getFilteredSeriesList() {
    const q = this.searchInput.value.toLowerCase().trim();
    let list = this.seriesList.filter(s =>
      this.matchesGenreFilter(s) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        (s.genres || []).some(g => g.toLowerCase().includes(q)) ||
        (s.description || '').toLowerCase().includes(q))
    );

    const episodeCount = s => s.seasons.reduce((n, sn) => n + (sn.episodes || []).length, 0);
    const sortVal = this.seriesSort ? this.seriesSort.value : 'default';
    switch (sortVal) {
      case 'az': list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'es')); break;
      case 'za': list = [...list].sort((a, b) => b.title.localeCompare(a.title, 'es')); break;
      case 'seasons': list = [...list].sort((a, b) => b.seasons.length - a.seasons.length); break;
      case 'episodes': list = [...list].sort((a, b) => episodeCount(b) - episodeCount(a)); break;
      case 'year': list = [...list].sort((a, b) => (b.year || 0) - (a.year || 0)); break;
      default:
        list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }
    return list;
  }

  setSeriesViewMode(mode) {
    this.seriesViewMode = mode;
    if (this.btnViewGrid) this.btnViewGrid.classList.toggle('active', mode === 'grid');
    if (this.btnViewRows) this.btnViewRows.classList.toggle('active', mode === 'rows');
    this.renderSeriesContent();
  }

  renderSeriesContent() {
    this.syncSortDropdown(); // p. ej. "Restablecer filtros" vuelve a "Sugerencias para ti"
    const list = this.getFilteredSeriesList();
    const total = this.seriesList.length;

    if (this.seriesPageCount) {
      this.seriesPageCount.textContent = list.length === total
        ? `${total} series en tu biblioteca`
        : `Mostrando ${list.length} de ${total} series`;
    }

    if (this.seriesViewMode === 'rows') {
      if (this.seriesGrid) this.seriesGrid.hidden = true;
      if (this.seriesRowsContainer) this.seriesRowsContainer.hidden = false;
      this.renderSeriesRows(list);
    } else {
      if (this.seriesGrid) this.seriesGrid.hidden = false;
      if (this.seriesRowsContainer) this.seriesRowsContainer.hidden = true;
      this.renderSeriesGrid(list);
    }
    if (window.lucide) lucide.createIcons();
  }

  renderSeriesGrid(list = this.getFilteredSeriesList()) {
    if (!this.seriesGrid) return;
    this.seriesGrid.innerHTML = '';
    list.forEach(s => this.seriesGrid.appendChild(this.createSeriesCard(s)));
    if (this.seriesEmpty) this.seriesEmpty.hidden = list.length > 0;
  }

  renderSeriesRows(list = this.getFilteredSeriesList()) {
    if (!this.seriesRowsContainer) return;
    this.seriesRowsContainer.innerHTML = '';

    if (list.length === 0) {
      if (this.seriesEmpty) this.seriesEmpty.hidden = false;
      return;
    }
    if (this.seriesEmpty) this.seriesEmpty.hidden = true;

    // Agrupar por género
    const genreMap = {};
    list.forEach(s => {
      (s.genres || ['Otras']).forEach(g => {
        if (!genreMap[g]) genreMap[g] = [];
        genreMap[g].push(s);
      });
    });

    const genres = Object.keys(genreMap).sort((a, b) => genreMap[b].length - genreMap[a].length);
    genres.forEach(g => {
      // Con un filtro de tipo ("Solo películas"...) se muestran todas las filas de géneros
      if (this.activeGenre === 'all' || NetflixApp.TYPE_FILTERS[this.activeGenre] || this.activeGenre === g) {
        const rowSection = document.createElement('section');
        rowSection.className = 'category-row';
        rowSection.innerHTML = `
          <h2 class="category-title">${g} <span class="count">(${genreMap[g].length})</span></h2>
          <div class="row-container">
            <div class="row-cards"></div>
          </div>
        `;
        const rowCards = rowSection.querySelector('.row-cards');
        genreMap[g].forEach(s => rowCards.appendChild(this.createSeriesCard(s)));
        this.seriesRowsContainer.appendChild(rowSection);
        this.setupSingleRowScrolling(rowSection.querySelector('.row-container'));
      }
    });
  }

  // Tarjetas visibles de la vista Series (cuadrícula o filas, según el modo)
  getSeriesPageCards() {
    const container = this.seriesViewMode === 'rows' ? this.seriesRowsContainer : this.seriesGrid;
    return container ? Array.from(container.querySelectorAll('.card')) : [];
  }

  // Botones de la barra de Series que se recorren con ← / →
  getSeriesSubnavItems() {
    return [this.genreDropdownBtn, this.btnViewGrid, this.btnViewRows, this.sortDropdownBtn].filter(Boolean);
  }

  focusSeriesSubnav(el) {
    if (!el) return;
    document.body.classList.add('keyboard-nav');
    el.focus({ preventScroll: true });
    // Mostrar la barra (es fija al bajar, pero arriba del todo está debajo del destacado)
    const bar = document.getElementById('seriesSubnav');
    if (bar && bar.getBoundingClientRect().top > window.innerHeight - 80) {
      bar.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  // Atajos de la vista Series. Devuelve true si ya manejó la tecla.
  handleSeriesPageKeys(e) {
    const current = document.activeElement;
    const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
    const menuOpen = this.genreDropdownWrapper && this.genreDropdownWrapper.classList.contains('open');
    const menuItems = this.genreDropdownGrid ? Array.from(this.genreDropdownGrid.querySelectorAll('.genre-dropdown-item')) : [];
    const activeMenuItem = () => menuItems.find(i => i.classList.contains('active')) || menuItems[0];

    // --- Menú "Ordenar" abierto (lista vertical) ---
    if (this.sortDropdown && this.sortDropdown.classList.contains('open')) {
      const sortItems = Array.from(this.sortDropdownMenu.querySelectorAll('.sort-dropdown-item'));
      const sIdx = sortItems.indexOf(current);
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSortDropdown();
        this.sortDropdownBtn.focus({ preventScroll: true });
        return true;
      }
      if (isArrow) {
        e.preventDefault();
        document.body.classList.add('keyboard-nav');
        if (sIdx === -1) {
          (sortItems.find(i => i.classList.contains('active')) || sortItems[0]).focus({ preventScroll: true });
        } else if (e.key === 'ArrowDown' && sIdx < sortItems.length - 1) {
          sortItems[sIdx + 1].focus({ preventScroll: true });
        } else if (e.key === 'ArrowUp') {
          if (sIdx > 0) sortItems[sIdx - 1].focus({ preventScroll: true });
          else {
            this.closeSortDropdown();
            this.sortDropdownBtn.focus({ preventScroll: true });
          }
        }
        return true;
      }
      return sIdx !== -1 || current === this.sortDropdownBtn; // Enter: lo maneja el botón
    }

    // --- Menú de géneros abierto ---
    if (menuOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeGenreDropdown();
        this.genreDropdownBtn.focus({ preventScroll: true });
        return true;
      }
      const itemIdx = menuItems.indexOf(current);
      if (isArrow) {
        e.preventDefault();
        document.body.classList.add('keyboard-nav');
        if (itemIdx === -1) {
          if (activeMenuItem()) activeMenuItem().focus({ preventScroll: true });
          return true;
        }
        const cols = 3; // .genre-dropdown-grid tiene 3 columnas
        let next = itemIdx;
        if (e.key === 'ArrowLeft') next = itemIdx - 1;
        if (e.key === 'ArrowRight') next = itemIdx + 1;
        if (e.key === 'ArrowDown') next = itemIdx + cols;
        if (e.key === 'ArrowUp') next = itemIdx - cols;
        if (next < 0 && e.key === 'ArrowUp') {
          this.closeGenreDropdown();
          this.genreDropdownBtn.focus({ preventScroll: true });
        } else if (menuItems[next]) {
          menuItems[next].focus({ preventScroll: true });
        }
        return true;
      }
      return itemIdx !== -1 || current === this.genreDropdownBtn; // Enter: lo maneja el botón
    }

    // --- Barra de Series (Géneros / Cuadrícula / Filas) ---
    const subnav = this.getSeriesSubnavItems();
    const subIdx = subnav.indexOf(current);
    if (subIdx !== -1) {
      if (current === this.genreDropdownBtn && e.key === 'Enter') {
        // Abrir el menú y entrar en él
        e.preventDefault();
        this.toggleGenreDropdown();
        if (activeMenuItem()) activeMenuItem().focus({ preventScroll: true });
        return true;
      }
      if (current === this.sortDropdownBtn && e.key === 'Enter') {
        // Abrir "Ordenar" y entrar en la opción elegida
        e.preventDefault();
        document.body.classList.add('keyboard-nav');
        this.toggleSortDropdown(true);
        const items = Array.from(this.sortDropdownMenu.querySelectorAll('.sort-dropdown-item'));
        const target = items.find(i => i.classList.contains('active')) || items[0];
        if (target) target.focus({ preventScroll: true });
        return true;
      }
      if (!isArrow) return e.key === 'Enter'; // Enter en Cuadrícula/Filas: lo maneja el botón
      e.preventDefault();
      document.body.classList.add('keyboard-nav');
      if (e.key === 'ArrowLeft' && subIdx > 0) this.focusSeriesSubnav(subnav[subIdx - 1]);
      else if (e.key === 'ArrowRight' && subIdx < subnav.length - 1) this.focusSeriesSubnav(subnav[subIdx + 1]);
      else if (e.key === 'ArrowUp') this.focusNavItem(document.getElementById('navSeries'));
      else if (e.key === 'ArrowDown') {
        const first = this.getSeriesPageCards()[0];
        if (first) this.focusCard(first);
      }
      return true;
    }

    // --- Vista de filas: se usa la misma navegación que en el inicio ---
    if (this.seriesViewMode === 'rows') return false;

    // --- Cuadrícula ---
    // Desde la primera línea (o sin tarjetas), ↑ sube a la barra (botón "Géneros")
    return this.handleGridKeys(e, this.getSeriesPageCards(), () => this.focusSeriesSubnav(this.genreDropdownBtn));
  }

  // Navegación con flechas en una cuadrícula de tarjetas (vista Series y Mi Lista).
  // onExitTop: qué hacer al subir desde la primera línea. Devuelve true si manejó la tecla.
  handleGridKeys(e, cards, onExitTop) {
    const current = document.activeElement;
    const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);

    if (e.key === 'Enter' && current && current.classList.contains('card')) {
      e.preventDefault();
      this.lastOpenedCard = current;
      current.click();
      return true;
    }

    if (!isArrow) return false;
    e.preventDefault();
    document.body.classList.add('keyboard-nav');

    const idx = cards.indexOf(current);
    if (idx === -1) {
      const hovered = this.hoveredCard && cards.includes(this.hoveredCard) ? this.hoveredCard : null;
      if (hovered || cards[0]) this.focusCard(hovered || cards[0]);
      else onExitTop();
      return true;
    }

    if (e.key === 'ArrowLeft' && idx > 0) {
      this.focusCard(cards[idx - 1]);
    } else if (e.key === 'ArrowRight' && idx < cards.length - 1) {
      this.focusCard(cards[idx + 1]);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Buscar la tarjeta de la línea de arriba/abajo más cercana horizontalmente.
      // offsetTop/offsetLeft no cambian con el efecto de agrandar la tarjeta seleccionada.
      const down = e.key === 'ArrowDown';
      const candidates = cards.filter(c => down ? c.offsetTop > current.offsetTop + 5 : c.offsetTop < current.offsetTop - 5);
      if (candidates.length === 0) {
        if (!down) onExitTop();
        return true;
      }
      // Solo la línea inmediatamente siguiente/anterior
      const lineTop = down
        ? Math.min(...candidates.map(c => c.offsetTop))
        : Math.max(...candidates.map(c => c.offsetTop));
      const line = candidates.filter(c => Math.abs(c.offsetTop - lineTop) < 5);
      const closest = line.reduce((best, c) =>
        Math.abs(c.offsetLeft - current.offsetLeft) < Math.abs(best.offsetLeft - current.offsetLeft) ? c : best
      );
      this.focusCard(closest);
    }
    return true;
  }

  renderContinueWatching() {
    const activeEpIds = Object.keys(this.progressMap).filter(id => {
      const p = this.progressMap[id];
      return p.percentage > 2 && p.percentage < 95;
    });

    if (activeEpIds.length === 0) {
      this.rowContinueWatching.style.display = 'none';
      return;
    }

    this.rowContinueWatching.style.display = 'block';
    this.cardsContinueWatching.innerHTML = '';

    activeEpIds.forEach(epId => {
      const prog = this.progressMap[epId];
      // Find series & episode
      let foundSeries = null;
      let foundEp = null;
      let foundSeason = 1;

      for (const s of this.seriesList) {
        for (const sn of s.seasons) {
          for (const ep of sn.episodes) {
            if (ep.id === epId) {
              foundSeries = s;
              foundEp = ep;
              foundSeason = sn.seasonNumber || 1;
              break;
            }
          }
        }
      }

      if (foundSeries && foundEp) {
        const card = document.createElement('div');
        card.className = 'card card-continue';
        card.tabIndex = 0;
        card.style.height = '280px';
        // Miniatura real del capítulo; si aún no existe, el banner mientras se captura
        const needsThumb = this.media.needsThumbnail(foundEp);
        const thumbSrc = needsThumb ? (foundSeries.banner || foundSeries.poster) : (foundEp.thumbnail || foundSeries.poster);
        const epLabel = this.isMovie(foundSeries) ? '' : `T${foundSeason}:E${foundEp.episodeNumber || 1} `;
        card.innerHTML = `
          <img class="card-img" src="${thumbSrc}" alt="${foundEp.title}" data-thumb-ep="${foundEp.id}">
          <div class="card-overlay" style="opacity: 1; background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 100%);">
            <h3 class="card-title">${foundSeries.title}</h3>
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">${epLabel}${foundEp.title}</p>
            
            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-bottom: 8px; overflow: hidden;">
              <div style="width: ${prog.percentage}%; height: 100%; background: var(--netflix-red);"></div>
            </div>

            <div class="card-actions">
              <button class="btn-card-play" title="Continuar">
                <i data-lucide="play" style="fill: currentColor; width: 14px; height: 14px;"></i>
              </button>
              <span style="font-size: 11px; color: var(--accent-green); margin-left: auto;">${prog.percentage}% visto</span>
            </div>
          </div>
        `;

        card.addEventListener('click', () => {
          this.media.stopPreview();
          if (window.player) window.player.playEpisode(foundSeries, foundEp, prog.currentTime);
        });

        // Vista previa en movimiento desde donde se dejó (mouse o teclado)
        const startPreview = () => this.media.schedulePreview(card, foundEp, {
          startAt: prog.currentTime,
          before: card.querySelector('.card-overlay')
        });
        card.addEventListener('mouseenter', startPreview);
        card.addEventListener('mouseleave', () => this.media.stopPreview());
        card.addEventListener('focus', startPreview);
        // Al perder la selección del teclado, seguir si el mouse está encima
        card.addEventListener('blur', () => { if (!card.matches(':hover')) this.media.stopPreview(); });

        this.cardsContinueWatching.appendChild(card);
        if (needsThumb) this.media.queueThumbnail(foundSeries, foundEp);
      }
    });
    // También se llama sola al cerrar el reproductor (sin pasar por render())
    if (window.lucide) lucide.createIcons({ root: this.cardsContinueWatching });
  }

  openSeriesModal(series) {
    this.activeSeries = series;
    this.modalBanner.style.backgroundImage = `url('${series.banner}')`;
    this.modalTitle.textContent = series.title;
    this.modalDesc.textContent = series.description;
    this.modalCast.textContent = (series.cast || []).join(', ') || 'No especificado';
    this.modalCreator.textContent = series.creator || 'Desconocido';
    this.modalGenres.textContent = (series.genres || []).join(', ');
    const modalType = document.getElementById('modalType');
    if (modalType) modalType.textContent = this.isMovie(series) ? 'Película' : 'Serie';

    // Películas: sin "Episodios" ni selector de temporada
    const movie = this.isMovie(series);
    const files = (series.seasons || []).reduce((n, sn) => n + (sn.episodes || []).length, 0);
    this.seriesModal.classList.toggle('is-movie', movie);
    const epHeader = this.seriesModal.querySelector('.episodes-section-header h3');
    if (epHeader) epHeader.textContent = movie ? (files > 1 ? 'Partes' : 'Archivo') : 'Episodios';

    // Play first episode button ("Reproducir" en películas, "Reproducir E1" en series)
    this.modalPlayBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg> ${this.isMovie(series) ? 'Reproducir' : 'Reproducir E1'}`;
    this.modalPlayBtn.onclick = () => {
      const ep1 = series.seasons[0]?.episodes[0];
      if (ep1 && window.player) {
        window.player.playEpisode(series, ep1);
      }
    };

    // Agregar / quitar de Mi Lista
    if (this.modalMyListBtn) {
      this.setMyListButton(this.modalMyListBtn, series);
      this.modalMyListBtn.onclick = () => this.toggleMyList(series, this.modalMyListBtn);
    }

    // Populate Season Dropdown
    this.seasonSelect.innerHTML = '';
    series.seasons.forEach((sn, idx) => {
      const opt = document.createElement('option');
      opt.value = sn.seasonNumber || (idx + 1);
      opt.textContent = sn.title || `Temporada ${idx + 1}`;
      this.seasonSelect.appendChild(opt);
    });

    const initialSeason = series.seasons[0]?.seasonNumber || 1;
    this.renderEpisodes(series, initialSeason);

    // Aviso de videos nuevos o borrados: lo ya sabido al instante y luego se revisa otra vez
    this.renderSeriesChanges(series);
    this.checkNewVideos(true);

    this.seriesModal.classList.add('active');
    this.seriesModal.querySelector('.modal-content').scrollTop = 0;
    if (window.lucide) lucide.createIcons();

    // Dejar el foco en "Reproducir" para poder seguir con el teclado
    requestAnimationFrame(() => this.modalPlayBtn.focus({ preventScroll: true }));
  }

  renderEpisodes(series, seasonNumber) {
    this.media.stopPreview();
    this.episodesList.innerHTML = '';
    const season = series.seasons.find(sn => (sn.seasonNumber || 1) === seasonNumber) || series.seasons[0];
    
    if (!season || !season.episodes) return;

    season.episodes.forEach(ep => {
      const item = document.createElement('div');
      item.className = 'episode-item';
      item.tabIndex = 0;
      item.dataset.epId = ep.id;
      const fmt = (ep.format || 'mp4').toUpperCase();
      // Sin miniatura real todavía: se muestra el banner mientras se captura un fotograma del video
      const needsThumb = this.media.needsThumbnail(ep);
      const thumbSrc = needsThumb ? (series.banner || series.poster) : (ep.thumbnail || series.poster);

      item.innerHTML = `
        <span class="ep-num">${ep.episodeNumber}</span>
        <div class="ep-thumb-wrapper${needsThumb ? ' loading' : ''}">
          <img class="ep-thumb" src="${thumbSrc}" alt="${ep.title}" data-thumb-ep="${ep.id}" loading="lazy" decoding="async">
          <div class="ep-play-icon">
            <i data-lucide="play" style="fill: #fff; width: 24px; height: 24px;"></i>
          </div>
        </div>
        <div class="ep-details">
          <div class="ep-header">
            <span class="ep-title">${ep.title}</span>
            <span class="format-badge format-${fmt.toLowerCase()}">${fmt}</span>
          </div>
          <p class="ep-desc">${ep.description}</p>
        </div>
        <span class="ep-duration">${ep.duration}</span>
      `;

      item.addEventListener('click', () => {
        this.media.stopPreview();
        if (window.player) {
          const prog = this.progressMap[ep.id];
          const startAt = prog ? prog.currentTime : 0;
          window.player.playEpisode(series, ep, startAt);
        }
      });

      // Vista previa en movimiento al pasar el mouse o al seleccionarlo con el teclado
      const wrapper = item.querySelector('.ep-thumb-wrapper');
      item.addEventListener('mouseenter', () => this.media.schedulePreview(wrapper, ep));
      item.addEventListener('mouseleave', () => this.media.stopPreview());
      item.addEventListener('focus', () => this.media.schedulePreview(wrapper, ep));
      // Al perder la selección del teclado, seguir si el mouse está encima
      item.addEventListener('blur', () => { if (!item.matches(':hover')) this.media.stopPreview(); });

      this.episodesList.appendChild(item);
      if (needsThumb) this.media.queueThumbnail(series, ep);
    });

    if (window.lucide) lucide.createIcons({ root: this.episodesList });
  }

  playNextEpisode(series, currentEp) {
    if (!series) return;
    let foundCurrent = false;

    for (const sn of series.seasons) {
      for (const ep of sn.episodes) {
        if (foundCurrent) {
          this.showToast(`Reproduciendo siguiente: ${ep.title}`);
          if (window.player) window.player.playEpisode(series, ep);
          return;
        }
        if (ep.id === currentEp.id) {
          foundCurrent = true;
        }
      }
    }
    this.showToast('Has llegado al final de la temporada');
  }

  handleSearch(query) {
    // En la vista Series el buscador filtra el contenido (cuadrícula o filas)
    if (this.currentView === 'series') {
      this.renderSeriesContent();
      return;
    }
    // En Mi Lista filtra los favoritos
    if (this.currentView === 'mylist') {
      this.renderMyListPage();
      return;
    }

    // Desde el inicio: los resultados se abren en su propia vista
    if (!query.trim()) {
      if (this.currentView === 'search') this.leaveSearch();
      return;
    }
    if (this.currentView !== 'search') {
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
      this.showView('search');
    }
    this.renderSearchPage();
  }

  // Sin acentos ni mayúsculas: "accion" encuentra "Acción"
  normalizeText(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  renderSearchPage() {
    if (!this.searchGrid) return;
    const raw = this.searchInput.value.trim();
    const q = this.normalizeText(raw);
    const n = (s) => this.normalizeText(s);

    // Primero las que coinciden por nombre, luego por género y al final por descripción
    const score = (s) => {
      if (n(s.title).includes(q)) return n(s.title).startsWith(q) ? 0 : 1;
      if ((s.genres || []).some(g => n(g).includes(q))) return 2;
      if (n(s.description).includes(q)) return 3;
      return -1;
    };
    const results = this.seriesList
      .map(s => ({ s, rank: score(s) }))
      .filter(r => r.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.s.title.localeCompare(b.s.title))
      .map(r => r.s);

    const $ = (id) => document.getElementById(id);
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    $('searchTitle').textContent = `Resultados para «${raw}»`;
    $('searchCount').textContent = results.length ? plural(results.length, 'serie', 'series') : '';
    $('searchEmptyTitle').textContent = `No encontramos nada para «${raw}»`;
    $('searchEmpty').hidden = results.length > 0;

    // Géneros útiles (sin "Medios Locales" ni los que tiene casi todo, como "Anime")
    const SKIP = new Set(['Medios Locales', 'Anime', 'Animación']);
    const genreCount = (list) => {
      const counts = {};
      list.forEach(s => (s.genres || []).forEach(g => { if (!SKIP.has(g)) counts[g] = (counts[g] || 0) + 1; }));
      return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    };
    const chips = (container, genres) => {
      container.innerHTML = genres.map(g =>
        `<button type="button" class="search-chip${n(g) === q ? ' is-active' : ''}" data-genre="${this.escapeHtml(g)}">${this.escapeHtml(g)}</button>`).join('');
      container.querySelectorAll('.search-chip').forEach(btn => btn.addEventListener('click', () => {
        this.searchInput.value = btn.dataset.genre;
        this.renderSearchPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }));
    };
    chips($('searchEmptyChips'), results.length ? [] : genreCount(this.seriesList).slice(0, 8));

    // Mejor resultado
    const top = results[0];
    $('searchTop').hidden = !top;
    if (top) this.renderSearchTop(top);

    // Otros resultados
    const rest = results.slice(1);
    $('searchMore').hidden = rest.length === 0;
    $('searchMoreCount').textContent = rest.length ? `(${rest.length})` : '';
    this.searchGrid.innerHTML = '';
    rest.forEach(s => this.searchGrid.appendChild(this.createSeriesCard(s)));

    // Parecidas: las que comparten más géneros con el mejor resultado (sin repetir resultados)
    const related = [];
    if (top) {
      const topGenres = new Set((top.genres || []).filter(g => !SKIP.has(g)));
      const inResults = new Set(results.map(s => s.id));
      this.seriesList
        .filter(s => !inResults.has(s.id))
        .map(s => ({ s, shared: (s.genres || []).filter(g => topGenres.has(g)).length }))
        .filter(r => r.shared > 0)
        .sort((a, b) => b.shared - a.shared || a.s.title.localeCompare(b.s.title))
        .slice(0, 14)
        .forEach(r => related.push(r.s));
    }
    $('searchRelated').hidden = related.length === 0;
    if (top) $('searchRelatedTitle').textContent = `Porque buscaste «${raw}»: parecidas a ${top.title}`;
    this.renderRow($('searchRelatedCards'), related);
    this.setupSingleRowScrolling($('searchRelated').querySelector('.row-container'));

    if (window.lucide) lucide.createIcons({ root: this.searchPage });
  }

  // "[AnimeOnlineNinja] BLUELOCK Latino 01.mp4" → "Latino 01": sin etiquetas entre
  // corchetes, sin extensión y sin repetir el nombre de la serie
  cleanEpisodeTitle(title, series) {
    const original = String(title || '');
    let t = original
      .replace(/\.(mp4|mkv|webm)$/i, '')
      .replace(/\[[^\]]*\]|\([^)]*(?:p|rip|web|sub|dub)[^)]*\)/gi, ' ')
      .replace(/[._]+/g, ' ');
    const names = [series.title, series.folderName].filter(Boolean);
    names.forEach(name => {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
      t = t.replace(new RegExp(esc, 'i'), ' ');
    });
    t = t.replace(/\s{2,}/g, ' ').replace(/^[\s\-–:]+|[\s\-–:]+$/g, '');
    // "S01E03 Yo fui una abominación" → "Yo fui una abominación" (el número ya se muestra aparte)
    const withoutCode = t.replace(/^S\d+\s*E\d+[\s\-–:]*/i, '');
    if (withoutCode) t = withoutCode;
    return t || original.replace(/\.(mp4|mkv|webm)$/i, '');
  }

  escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  renderSearchTop(series) {
    const $ = (id) => document.getElementById(id);
    $('searchTopBg').style.backgroundImage = `url('${series.banner || series.poster}')`;
    $('searchTopAmbient').style.backgroundImage = `url('${series.poster || series.banner}')`;
    $('searchTopPoster').src = series.poster;
    $('searchTopPoster').alt = series.title;
    $('searchTopTitle').textContent = series.title;
    $('searchTopDesc').textContent = series.description || '';

    const seasons = (series.seasons || []).length;
    const episodes = (series.seasons || []).reduce((n, sn) => n + (sn.episodes || []).length, 0);
    const formats = new Set();
    (series.seasons || []).forEach(sn => (sn.episodes || []).forEach(ep => formats.add((ep.format || 'mp4').toUpperCase())));
    const genres = (series.genres || []).filter(g => g !== 'Medios Locales').slice(0, 3);
    const parts = [
      series.match ? `<span class="hero-match">${this.escapeHtml(series.match)}</span>` : '',
      series.year ? `<span>${series.year}</span>` : '',
      this.isMovie(series)
        ? '<span>Película</span>'
        : `<span>${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'} · ${episodes} ${episodes === 1 ? 'episodio' : 'episodios'}</span>`,
      formats.size ? `<span class="search-top-formats">${[...formats].join(' · ')}</span>` : '',
      genres.length ? `<span class="search-top-genres">${genres.map(g => this.escapeHtml(g)).join(' • ')}</span>` : ''
    ];
    $('searchTopMeta').innerHTML = parts.filter(Boolean).join('');

    // Creador y reparto, si se conocen
    const credits = [];
    if (series.creator) credits.push(`<b>Creador:</b> ${this.escapeHtml(series.creator)}`);
    if ((series.cast || []).length) credits.push(`<b>Reparto:</b> ${series.cast.slice(0, 3).map(c => this.escapeHtml(c)).join(', ')}`);
    $('searchTopCredits').innerHTML = credits.join('<span class="dot">·</span>');
    $('searchTopCredits').hidden = credits.length === 0;

    // Número de cada episodio. Si los guardados se repiten (escaneos viejos ponían 1 a todos),
    // se saca del nombre del archivo ("Latino 04" → 4) o, si no hay, del orden en la temporada.
    const numbersOk = (series.seasons || []).every(sn => {
      const nums = (sn.episodes || []).map(ep => ep.episodeNumber);
      return new Set(nums).size === nums.length;
    });
    const epNumber = (ep, season) => {
      if (numbersOk && ep.episodeNumber) return ep.episodeNumber;
      const fromName = this.cleanEpisodeTitle(ep.title, series)
        .replace(/\b(480|720|1080|2160)p?\b|\b(19|20)\d{2}\b/gi, ' ').match(/\d{1,4}/);
      if (fromName) return parseInt(fromName[0], 10);
      const sn = (series.seasons || []).find(x => (x.seasonNumber || 1) === season);
      return sn ? sn.episodes.indexOf(ep) + 1 : 1;
    };

    // Dónde va: el último episodio que se vio (o el siguiente si ya se terminó)
    const flat = (series.seasons || []).flatMap(sn => (sn.episodes || []).map(ep => ({ ep, season: sn.seasonNumber || 1 })));
    let resumeIdx = -1, resumePct = 0, lastTime = 0;
    flat.forEach(({ ep }, i) => {
      const p = this.progressMap && this.progressMap[ep.id];
      const t = p && p.updatedAt ? Date.parse(p.updatedAt) : 0;
      if (p && p.percentage > 2 && t >= lastTime) { lastTime = t; resumeIdx = i; resumePct = p.percentage; }
    });
    let startIdx = 0, label = 'Reproducir', pct = 0;
    if (resumeIdx >= 0) {
      const finished = resumePct >= 95;
      startIdx = finished ? Math.min(resumeIdx + 1, flat.length - 1) : resumeIdx;
      const { ep, season } = flat[startIdx];
      const code = this.isMovie(series) ? '' : ` T${season}:E${epNumber(ep, season)}`;
      label = finished && startIdx !== resumeIdx ? `Siguiente${code}` : `Continuar${code}`;
      pct = finished && startIdx !== resumeIdx ? 0 : resumePct;
    }
    const playBtn = $('searchTopPlay');
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg> ${label}` +
      (pct ? `<span class="stp-progress"><i style="width:${pct}%"></i></span>` : '');
    playBtn.onclick = () => {
      const target = flat[startIdx];
      if (target && window.player) window.player.playEpisode(series, target.ep);
    };

    $('searchTopInfo').onclick = () => this.openSeriesModal(series);
    const myBtn = $('searchTopMyList');
    this.setMyListButton(myBtn, series);
    myBtn.onclick = () => this.toggleMyList(series, myBtn);

    // Entrada: el banner se acerca despacio y el texto sube (solo al cambiar de serie)
    const card = $('searchTop');
    if (card.dataset.seriesId !== series.id) {
      card.dataset.seriesId = series.id;
      card.classList.remove('is-entering');
      void card.offsetWidth;
      card.classList.add('is-entering');
    }
  }

  // Al borrar la búsqueda (o ir a otra sección) se vuelve al inicio
  leaveSearch() {
    if (this.searchInput.value) this.searchInput.value = '';
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.id === 'navHome'));
    this.showView('home');
  }

  openFolderScanner() {
    // La primera vez que se pulsa "Escanear PC" se abre directo el tutorial;
    // las siguientes, la pantalla de elegir (el tutorial sigue en "¿Primera vez? Ver tutorial")
    let seen = true;
    try { seen = localStorage.getItem('hiy-scan-tutorial-seen') === '1'; } catch (_) { /* sin almacenamiento */ }
    if (!seen) {
      try { localStorage.setItem('hiy-scan-tutorial-seen', '1'); } catch (_) { /* sin almacenamiento */ }
    }
    this.scanModal.classList.add('active');
    this.setScanStep(seen ? 'choose' : 'help');
  }

  closeScanWizard() {
    if (this.scanModal.dataset.step === 'searching') this.stopDiscover(true);
    if (window.HiyTutorial) HiyTutorial.stop();
    this.scanModal.classList.remove('active');
  }

  setScanStep(step) {
    this.scanModal.dataset.step = step;
    this.scanModal.querySelector('.scan-wizard').scrollTop = 0;
    // La animación del tutorial empieza desde el principio al abrirlo
    if (window.HiyTutorial) step === 'help' ? HiyTutorial.start() : HiyTutorial.stop();
    const first = this.scanModal.querySelector(`.scan-step[data-step="${step}"] button, .scan-step[data-step="${step}"] input`);
    // En la primera pantalla no se enfoca nada: con el mouse se veía una opción ya "marcada"
    if (first && step !== 'searching' && step !== 'choose') setTimeout(() => first.focus({ preventScroll: true }), 50);
  }

  async chooseFolderManually() {
    // En la app de escritorio se usa el selector de carpetas de Windows
    if (window.electronAPI) {
      const folderPath = await window.electronAPI.openFolderDialog();
      if (folderPath) {
        this.scanModal.classList.remove('active');
        await this.triggerScanFromPath(folderPath);
      }
    } else {
      this.setScanStep('manual');
    }
  }

  async startDiscover() {
    this.setScanStep('searching');
    document.getElementById('scanCurrent').textContent = 'Preparando…';
    document.getElementById('scanDirsCount').textContent = '0';
    document.getElementById('scanFoundCount').textContent = '0';
    try {
      const res = await fetch('/api/discover/start', { method: 'POST' });
      this.renderDiscoverProgress(await res.json());
    } catch (err) {
      console.error('Discover error:', err);
      this.showToast('Error al conectar con el servidor', 'error');
      this.setScanStep('choose');
      return;
    }
    clearInterval(this.discoverTimer);
    this.discoverTimer = setInterval(() => this.pollDiscover(), 500);
  }

  async pollDiscover() {
    try {
      const status = await (await fetch('/api/discover/status')).json();
      if (this.scanModal.dataset.step !== 'searching') return;
      this.renderDiscoverProgress(status);
      if (!status.running) {
        clearInterval(this.discoverTimer);
        this.showDiscoverResults(status.found);
      }
    } catch (err) {
      console.error('Discover status error:', err);
    }
  }

  renderDiscoverProgress(status) {
    document.getElementById('scanDirsCount').textContent = status.scannedDirs.toLocaleString('es');
    document.getElementById('scanFoundCount').textContent = status.found.length.toLocaleString('es');
    document.getElementById('scanCurrent').textContent = status.current || 'Terminando…';
  }

  // quiet: se cerró la ventana, no hace falta mostrar resultados
  async stopDiscover(quiet = false) {
    clearInterval(this.discoverTimer);
    try {
      await fetch('/api/discover/stop', { method: 'POST' });
      if (quiet) return;
      // Esperar a que el servidor termine las lecturas en curso
      document.getElementById('scanCurrent').textContent = 'Deteniendo…';
      let status;
      do {
        await new Promise(r => setTimeout(r, 200));
        status = await (await fetch('/api/discover/status')).json();
      } while (status.running);
      this.showDiscoverResults(status.found);
    } catch (err) {
      console.error('Discover stop error:', err);
    }
  }

  formatBytes(bytes) {
    const gb = bytes / 1024 ** 3;
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  // "hace 5 min", "hace 2 h", "ayer", "hace 3 días" o la fecha
  timeAgo(ms) {
    const min = Math.floor((Date.now() - ms) / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'ayer';
    if (d < 7) return `hace ${d} días`;
    return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  showDiscoverResults(found) {
    this.discovered = found;
    const list = document.getElementById('scanResults');
    const empty = !found.length;
    document.getElementById('scanEmpty').hidden = !empty;
    document.getElementById('scanResultsManualBtn').hidden = !empty;
    document.getElementById('scanAddBtn').hidden = empty;
    document.querySelector('#scanModal .scan-toolbar').hidden = empty;
    document.getElementById('scanResultsTitle').textContent = empty
      ? 'Búsqueda terminada'
      : `Encontramos ${found.length} ${found.length === 1 ? 'carpeta' : 'carpetas'} con videos`;

    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    list.innerHTML = found.map((f, i) => `
      <li>
        <label class="scan-result${f.inLibrary ? ' in-library' : ''}">
          <input type="checkbox" data-index="${i}" ${f.inLibrary ? '' : 'checked'}>
          <span class="scan-check"><i data-lucide="check"></i></span>
          <span class="scan-result-icon"><i data-lucide="${f.inLibrary ? 'folder-check' : 'folder'}"></i></span>
          <span class="scan-result-info">
            <strong>${esc(f.name)}</strong>
            <small title="${esc(f.path)}">${esc(f.parent)}</small>
          </span>
          <span class="scan-result-meta">
            ${f.inLibrary ? '<em class="scan-badge"><i data-lucide="circle-check"></i> Ya en tu biblioteca</em>' : ''}
            <span><i data-lucide="film"></i> ${f.videos} ${f.videos === 1 ? 'video' : 'videos'}</span>
            <span>${this.formatBytes(f.bytes)} · ${f.formats.map(x => x.toUpperCase()).join(' · ')}</span>
          </span>
        </label>
      </li>`).join('');

    this.setScanStep('results');
    if (window.lucide) lucide.createIcons({ root: this.scanModal });
    this.updateDiscoverSelection();
  }

  discoverChecks() {
    return [...document.querySelectorAll('#scanResults input[type="checkbox"]')];
  }

  updateDiscoverSelection() {
    const checks = this.discoverChecks();
    const n = checks.filter(c => c.checked).length;
    const addBtn = document.getElementById('scanAddBtn');
    addBtn.disabled = n === 0;
    addBtn.querySelector('span').textContent = n ? `Agregar ${n} ${n === 1 ? 'carpeta' : 'carpetas'}` : 'Marca alguna carpeta';
    document.getElementById('scanSelectedInfo').textContent = `${n} de ${checks.length} marcadas`;
    document.getElementById('scanToggleAllBtn').textContent = n === checks.length ? 'Desmarcar todas' : 'Marcar todas';
  }

  toggleAllDiscovered() {
    const checks = this.discoverChecks();
    const all = checks.every(c => c.checked);
    checks.forEach(c => { c.checked = !all; });
    this.updateDiscoverSelection();
  }

  async addDiscoveredFolders() {
    const folders = this.discoverChecks().filter(c => c.checked).map(c => this.discovered[c.dataset.index]);
    if (!folders.length) return;
    const addBtn = document.getElementById('scanAddBtn');
    addBtn.disabled = true;

    let added = 0, failed = 0;
    for (const [i, f] of folders.entries()) {
      addBtn.querySelector('span').textContent = `Agregando ${i + 1} de ${folders.length}…`;
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: f.path, single: true })
        });
        const data = await res.json();
        if (data.success) added += data.foundSeriesCount; else failed++;
      } catch (err) {
        console.error('Scan error:', err);
        failed++;
      }
    }

    this.scanModal.classList.remove('active');
    this.showToast(`¡Listo! Se agregaron ${added} ${added === 1 ? 'serie' : 'series'} a tu biblioteca.`);
    if (failed) this.showToast(`${failed} ${failed === 1 ? 'carpeta no se pudo' : 'carpetas no se pudieron'} agregar`, 'error');
    await this.loadCatalog();
    this.render();
    // El servidor ya empezó a buscar la información de las series nuevas
    this.watchMetadata(false);
  }

  async triggerScanFromPath(folderPath) {
    this.showToast(`Escaneando: ${folderPath}`);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
      const data = await res.json();

      if (data.success) {
        this.showToast(`¡Escaneo completado! Se encontraron ${data.foundSeriesCount} series nuevas.`);
        await this.loadCatalog();
        this.render();
        // El servidor ya empezó a buscar la información de las series nuevas
        this.watchMetadata(false);
      } else {
        this.showToast(data.error || 'Error escaneando carpeta', 'error');
      }
    } catch (err) {
      console.error('Scan error:', err);
      this.showToast('Error al conectar con el servidor', 'error');
    }
  }

  async handleScan(e) {
    e.preventDefault();
    const pathVal = this.folderPathInput.value.trim();

    if (!pathVal) {
      this.showToast('Por favor ingresa una ruta de carpeta válida', 'error');
      return;
    }

    const btn = document.getElementById('submitScanBtn');
    btn.disabled = true;
    btn.textContent = 'Escaneando archivos MP4, MKV, WEBM...';

    try {
      await this.triggerScanFromPath(pathVal);
      this.scanModal.classList.remove('active');
      this.folderPathInput.value = '';
    } catch (err) {
      console.error('Scan submit error:', err);
      this.showToast('Error al conectar con el servidor', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="folder-search"></i> Escanear Archivos';
      if (window.lucide) lucide.createIcons();
    }
  }

  /* ---------- Perfiles: "¿Quién está viendo?" ---------- */

  async loadProfiles() {
    try {
      const res = await fetch('/api/profiles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.profiles = data.profiles;
      this.activeProfileId = data.activeId;
      this.defaultProfileId = data.defaultId || null;
      this.profileColors = data.colors;
      this.maxProfiles = data.max;
      this.profileSuggested = data.suggested || {};
      this.profilesSupported = true;
    } catch (err) {
      // Servidor de una versión anterior (sin perfiles): la app sigue con un solo perfil
      console.warn('No se pudieron cargar los perfiles:', err);
      this.profilesSupported = false;
    }
  }

  // Hay un perfil de inicio ("iniciar siempre con este perfil"): entrar con él sin preguntar
  async selectDefaultProfile() {
    if (!this.defaultProfileId || this.activeProfileId === this.defaultProfileId) return;
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(this.defaultProfileId)}/select`, { method: 'POST' });
      if (res.ok) this.activeProfileId = this.defaultProfileId;
    } catch (err) {
      console.warn('No se pudo abrir el perfil de inicio:', err);
    }
  }

  needsProfileGate() {
    if (!this.profiles.length) return true;
    if (this.defaultProfileId) return false;
    let chosen = null;
    try { chosen = sessionStorage.getItem('hiy-profile-session'); } catch (_) { /* sin almacenamiento */ }
    return chosen !== this.settings.profile.id;
  }

  avatarBackground(color) {
    return `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 70%, #000) 100%)`;
  }

  bindProfileGate() {
    const $ = (id) => document.getElementById(id);

    $('pgGrid').addEventListener('click', (e) => {
      const tile = e.target.closest('[data-profile]');
      if (!tile) return;
      if (tile.dataset.profile === '__add') {
        this.showProfileForm(null);
        return;
      }
      const p = this.profiles.find(x => x.id === tile.dataset.profile);
      if (!p) return;
      if (this.profileGate.classList.contains('managing')) this.showProfileForm(p);
      else this.chooseProfile(p, { ask: true });
    });
    $('pgManageBtn').addEventListener('click', () =>
      this.setProfileManaging(!this.profileGate.classList.contains('managing')));

    $('pgForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProfileForm();
    });
    $('pgCancelBtn').addEventListener('click', () => this.showProfilePicker());
    $('pgName').addEventListener('input', () => this.updateProfileFormPreview());
    $('pgColors').addEventListener('click', (e) => {
      const swatch = e.target.closest('[data-color]');
      if (!swatch) return;
      this.pgDraftColor = swatch.dataset.color;
      this.updateProfileFormPreview();
    });
    $('pgDeleteBtn').addEventListener('click', (e) =>
      this.confirmAction(e.currentTarget, () => this.deleteProfile(this.pgEditing)));

    // Foto del perfil: se encuadra en "Ajustar foto" y se guarda al pulsar Guardar / Crear perfil.
    // El archivo original se recuerda para poder volver a ajustarla con toda su calidad.
    $('pgPhotoFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const photo = await this.pickProfilePhoto(file, this.pgDraftColor);
      if (photo === undefined) return;
      this.pgPhotoSource = file;
      this.pgDraftPhoto = photo;
      this.updateProfileFormPreview();
    });
    $('pgPhotoAdjust').addEventListener('click', async () => {
      const current = this.pgDraftPhoto !== undefined ? this.pgDraftPhoto : this.pgEditing && this.pgEditing.photo;
      const photo = await this.pickProfilePhoto(this.pgPhotoSource || current, this.pgDraftColor);
      if (photo === undefined) return;
      this.pgDraftPhoto = photo;
      this.updateProfileFormPreview();
    });
    $('pgPhotoRemove').addEventListener('click', () => {
      this.pgDraftPhoto = null;
      this.pgPhotoSource = null;
      this.updateProfileFormPreview();
    });

    // Esc: del formulario vuelve a la lista; de "Administrar" sale; si se abrió desde el menú, se cierra
    document.addEventListener('keydown', (e) => {
      if (this.profileGate.hidden || e.key !== 'Escape') return;
      if (this.profileGate.dataset.step === 'form') {
        if (this.profiles.length) this.showProfilePicker();
      } else if (this.profileGate.classList.contains('managing')) {
        this.setProfileManaging(false);
      } else if (this.profileGateCancelable) {
        this.closeProfileGate();
      }
    });
  }

  // mode: 'pick' (elegir) | 'create' (crear el primero). Se resuelve al elegir un perfil.
  openProfileGate(mode = 'pick', { cancelable = false } = {}) {
    this.profileGateCancelable = cancelable;
    this.profileGate.hidden = false;
    document.body.classList.add('profile-gate-open');
    if (mode === 'create') this.showProfileForm(null);
    else this.showProfilePicker();
    if (window.lucide) lucide.createIcons({ root: this.profileGate });
    return new Promise(resolve => { this.profileGateResolve = resolve; });
  }

  closeProfileGate() {
    this.profileGate.hidden = true;
    this.profileGate.classList.remove('managing');
    document.body.classList.remove('profile-gate-open');
    const resolve = this.profileGateResolve;
    this.profileGateResolve = null;
    if (resolve) resolve();
  }

  setProfileManaging(on) {
    this.profileGate.classList.toggle('managing', on);
    document.getElementById('pgPickTitle').textContent = on ? 'Administrar perfiles' : '¿Quién está viendo?';
    document.getElementById('pgManageBtn').textContent = on ? 'Listo' : 'Administrar perfiles';
  }

  showProfilePicker() {
    this.profileGate.dataset.step = 'pick';
    const esc = (s) => this.escapeHtml(s);
    const pencil = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    const tiles = this.profiles.map(p => `
      <button type="button" class="pg-tile" data-profile="${esc(p.id)}">
        <span class="user-avatar pg-avatar${p.photo ? ' has-photo' : ''}" style="${this.avatarStyle(p)}">
          <span>${esc((p.name.trim()[0] || 'P').toUpperCase())}</span>
          <span class="pg-edit-badge">${pencil}</span>
        </span>
        <span class="pg-name">${esc(p.name)}</span>
      </button>`);
    if (this.profiles.length < (this.maxProfiles || 5)) {
      tiles.push(`
        <button type="button" class="pg-tile is-add" data-profile="__add">
          <span class="pg-avatar pg-add-avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></span>
          <span class="pg-name">Agregar perfil</span>
        </button>`);
    }
    document.getElementById('pgGrid').innerHTML = tiles.join('');
    this.setProfileManaging(this.profileGate.classList.contains('managing'));
    // Con el teclado se puede elegir directamente (Tab / Enter)
    const first = this.profileGate.querySelector('.pg-tile');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
  }

  // p: perfil a editar, o null para crear uno nuevo
  showProfileForm(p) {
    const $ = (id) => document.getElementById(id);
    const isFirst = !this.profiles.length;
    this.pgEditing = p;
    this.pgDraftPhoto = undefined; // undefined: sin cambios · null: quitarla · data URL: foto nueva
    this.pgPhotoSource = null;
    this.profileGate.dataset.step = 'form';

    $('pgFormTitle').textContent = p ? 'Editar perfil' : (isFirst ? 'Crea tu perfil' : 'Agregar perfil');
    $('pgFormLead').hidden = !!p;
    $('pgName').value = p ? p.name : (isFirst ? (this.profileSuggested.name || '') : '');

    const used = new Set(this.profiles.map(x => x.color));
    const colors = this.profileColors || ['#E50914'];
    this.pgDraftColor = p ? p.color
      : (isFirst && this.profileSuggested.color) || colors.find(c => !used.has(c)) || colors[0];
    $('pgColors').innerHTML = colors.map(c =>
      `<button type="button" class="settings-color" role="radio" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`
    ).join('');
    $('pgLanguage').value = p ? p.language : (window.hiyI18n ? window.hiyI18n.lang : 'es');

    $('pgDeleteBtn').hidden = !p || this.profiles.length < 2;
    this.resetConfirm($('pgDeleteBtn'));
    $('pgCancelBtn').hidden = isFirst;
    $('pgSaveBtn').textContent = p ? 'Guardar' : 'Crear perfil';
    this.updateProfileFormPreview();
    if (window.lucide) lucide.createIcons({ root: this.profileGate });
    setTimeout(() => $('pgName').focus(), 50);
  }

  updateProfileFormPreview() {
    const name = document.getElementById('pgName').value.trim() || 'P';
    const photo = this.pgDraftPhoto !== undefined ? this.pgDraftPhoto : (this.pgEditing && this.pgEditing.photo) || null;
    this.paintAvatar(document.getElementById('pgAvatarPreview'), name, this.pgDraftColor, photo);
    document.getElementById('pgPhotoRemove').hidden = !photo;
    document.getElementById('pgPhotoAdjust').hidden = !photo;
    document.querySelectorAll('#pgColors .settings-color').forEach(sw => {
      const on = sw.dataset.color === this.pgDraftColor;
      sw.classList.toggle('active', on);
      sw.setAttribute('aria-checked', String(on));
    });
  }

  async saveProfileForm() {
    const $ = (id) => document.getElementById(id);
    const name = $('pgName').value.trim();
    if (!name) {
      this.showToast('Escribe un nombre para el perfil', 'error');
      $('pgName').focus();
      return;
    }
    const editing = this.pgEditing;
    const body = { name, color: this.pgDraftColor, language: $('pgLanguage').value };
    if (this.pgDraftPhoto !== undefined) body.photo = this.pgDraftPhoto;
    const btn = $('pgSaveBtn');
    btn.disabled = true;
    try {
      const res = await fetch(editing ? `/api/profiles/${encodeURIComponent(editing.id)}` : '/api/profiles', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const wasFirst = !this.profiles.length;
      await this.loadProfiles();

      if (wasFirst) {
        // Primer perfil: se entra directo con él
        await this.chooseProfile(data.profile, { ask: true });
        return;
      }
      // Se editó el perfil que está en uso: actualizar la barra (y el idioma, si cambió)
      if (editing && this.settings.profile.id === editing.id) {
        await this.loadSettings();
      }
      this.showProfilePicker();
    } catch (err) {
      this.showToast(`No se pudo guardar: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async deleteProfile(p) {
    if (!p) return;
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const wasActive = this.settings.profile.id === p.id;
      await this.loadProfiles();
      if (wasActive) {
        // Se borró el perfil en uso: hay que elegir otro (ya no se puede cerrar sin elegir)
        try { sessionStorage.removeItem('hiy-profile-session'); } catch (_) { /* sin almacenamiento */ }
        this.profileGateCancelable = false;
        await this.loadSettings();
      }
      this.showToast(`Perfil «${p.name}» eliminado`);
      this.showProfilePicker();
    } catch (err) {
      this.showToast(`No se pudo borrar: ${err.message}`, 'error');
    }
  }

  // ask: preguntar si se quiere iniciar siempre con este perfil (al elegirlo en "¿Quién está viendo?")
  async chooseProfile(p, { ask = false } = {}) {
    try {
      if (ask) await this.askDefaultProfile(p);
      // Ya es el perfil en uso (p. ej. se abrió desde el menú): solo cerrar
      if (this.profileGateCancelable && this.settings.profile.id === p.id) {
        this.closeProfileGate();
        return;
      }
      const res = await fetch(`/api/profiles/${encodeURIComponent(p.id)}/select`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.activeProfileId = p.id;
      // Antes de cargar la configuración: si el idioma es otro, la app se recarga y no vuelve a preguntar
      try { sessionStorage.setItem('hiy-profile-session', p.id); } catch (_) { /* sin almacenamiento */ }
      await this.applyActiveProfile();
      this.closeProfileGate();
    } catch (err) {
      this.showToast(`No se pudo abrir el perfil: ${err.message}`, 'error');
    }
  }

  /**
   * "¿Quieres iniciar siempre con este perfil?". No se pregunta si ya es el perfil de inicio
   * ni si para ese perfil ya se contestó que no. Sí → al abrir la app se entra directo con él
   * (se puede cambiar en Configuración → Perfil). Se resuelve al contestar.
   */
  askDefaultProfile(p) {
    const declinedKey = `hiy-default-declined:${p.id}`;
    let declined = false;
    try { declined = localStorage.getItem(declinedKey) === '1'; } catch (_) { /* sin almacenamiento */ }
    if (this.defaultProfileId === p.id || declined) return Promise.resolve();

    const $ = (id) => document.getElementById(id);
    const dialog = $('pgAsk');
    this.paintAvatar($('pgAskAvatar'), p.name, p.color, p.photo);
    $('pgAskText').textContent = `Al abrir la app entrarás directo como «${p.name}». Puedes cambiarlo cuando quieras en Configuración → Perfil.`;
    dialog.hidden = false;
    setTimeout(() => $('pgAskYes').focus(), 50);

    return new Promise((resolve) => {
      const finish = async (answer) => {
        document.removeEventListener('keydown', onKey, true);
        $('pgAskYes').onclick = $('pgAskNo').onclick = null;
        dialog.hidden = true;
        if (answer === 'yes') {
          await this.setDefaultProfile(p.id);
        } else if (answer === 'no') {
          try { localStorage.setItem(declinedKey, '1'); } catch (_) { /* sin almacenamiento */ }
        }
        resolve();
      };
      // Esc: seguir sin contestar (se volverá a preguntar la próxima vez)
      const onKey = (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        finish(null);
      };
      document.addEventListener('keydown', onKey, true);
      $('pgAskYes').onclick = () => finish('yes');
      $('pgAskNo').onclick = () => finish('no');
    });
  }

  // id: perfil con el que iniciar siempre, o null para volver a preguntar al abrir la app
  async setDefaultProfile(id) {
    try {
      const res = await fetch('/api/profiles-default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      this.defaultProfileId = data.defaultId;
      if (id) {
        try { localStorage.removeItem(`hiy-default-declined:${id}`); } catch (_) { /* sin almacenamiento */ }
      }
      return true;
    } catch (err) {
      this.showToast(`No se pudo guardar: ${err.message}`, 'error');
      return false;
    }
  }

  // Vuelve a cargar lo que es de cada perfil y redibuja la app
  async applyActiveProfile() {
    await this.loadSettings();
    await this.loadProgress();
    await this.loadMyList();
    if (window.player) window.player.prefsApplied = false;
    this.render();
    this.refreshMyListButtons();
    if (this.currentView === 'mylist') this.renderMyListPage();
  }

  /* ---------- Perfil y configuración ---------- */

  async loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.settings = await res.json();
    } catch (err) {
      // Servidor de una versión anterior (sin /api/settings): valores por defecto
      console.warn('No se pudo cargar la configuración:', err);
      this.settings = {
        profile: { name: 'Perfil Principal', color: '#E50914' },
        playback: { autoplayNext: true, speed: 1, volume: 1 },
        library: { translateTitles: true },
        language: window.hiyI18n ? window.hiyI18n.lang : 'es',
        tmdb: { hasKey: false, fromEnv: false, hint: '' },
        colors: ['#E50914'],
        speeds: [0.75, 1, 1.25, 1.5, 2]
      };
    }
    // El idioma guardado en config.json manda (p. ej. si se borró el almacenamiento local):
    // si no coincide con el de la página, se recarga en el idioma correcto
    if (window.hiyI18n && this.settings.language && this.settings.language !== window.hiyI18n.lang) {
      window.hiyI18n.setLang(this.settings.language);
    }
    this.renderProfile();
  }

  // Avatar: la foto del perfil o, si no tiene, la inicial del nombre sobre el color elegido
  paintAvatar(el, name, color, photo = null) {
    el.style.background = photo ? `center / cover no-repeat url("${photo}")` : this.avatarBackground(color);
    el.classList.toggle('has-photo', !!photo);
    el.querySelector('span').textContent = (String(name).trim()[0] || 'P').toUpperCase();
  }

  // Lo mismo, para los avatares que se arman como HTML (lista de perfiles, menú)
  avatarStyle(p) {
    return p.photo
      ? `background: center / cover no-repeat url(&quot;${this.escapeHtml(p.photo)}&quot;)`
      : `background: ${this.avatarBackground(p.color)}`;
  }

  /* ---------- Ajustar foto: arrastrar, barras de posición y zoom ----------
     El cuadro es el avatar. this.crop guarda el tamaño de la foto en pantalla (base × zoom) y
     dónde está su esquina (x, y) respecto al cuadro. La foto nunca se sale de los bordes: siempre
     llena el cuadro, así que solo se mueve en el sentido en que sobra foto (o al acercarla). */

  bindPhotoCropper() {
    const $ = (id) => document.getElementById(id);
    const viewport = $('pcViewport');
    this.photoCropper = $('photoCropper');

    viewport.addEventListener('pointerdown', (e) => {
      if (!this.crop) return;
      viewport.setPointerCapture(e.pointerId);
      this.crop.drag = { px: e.clientX, py: e.clientY, x: this.crop.x, y: this.crop.y };
      viewport.classList.add('dragging');
    });
    viewport.addEventListener('pointermove', (e) => {
      const c = this.crop;
      if (!c || !c.drag) return;
      c.x = c.drag.x + (e.clientX - c.drag.px);
      c.y = c.drag.y + (e.clientY - c.drag.py);
      this.renderCrop();
    });
    const endDrag = () => {
      if (this.crop) this.crop.drag = null;
      viewport.classList.remove('dragging');
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // Rueda del mouse: zoom hacia donde está el puntero
    viewport.addEventListener('wheel', (e) => {
      if (!this.crop) return;
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      this.setCropZoom(this.crop.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    $('pcZoom').addEventListener('input', (e) => this.setCropZoom(parseFloat(e.target.value)));
    // Barras de posición: qué punto de la foto (0–100 %) queda en el centro del cuadro
    $('pcPosX').addEventListener('input', (e) => this.setCropPosition('x', parseFloat(e.target.value)));
    $('pcPosY').addEventListener('input', (e) => this.setCropPosition('y', parseFloat(e.target.value)));
    $('pcReset').addEventListener('click', () => this.resetCrop());
    $('pcCancel').addEventListener('click', () => this.closePhotoCropper(null));
    $('pcApply').addEventListener('click', () => this.closePhotoCropper(this.cropToDataUrl()));
    this.photoCropper.addEventListener('click', (e) => {
      if (e.target === this.photoCropper) this.closePhotoCropper(null);
    });

    // Teclado (antes que los demás atajos: el editor está encima de todo)
    document.addEventListener('keydown', (e) => {
      if (this.photoCropper.hidden || !this.crop) return;
      const step = e.shiftKey ? 30 : 8;
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (e.key === 'Escape') {
        this.closePhotoCropper(null);
      } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
        this.closePhotoCropper(this.cropToDataUrl());
      } else if (moves[e.key] && e.target.type !== 'range') {
        this.crop.x += moves[e.key][0];
        this.crop.y += moves[e.key][1];
        this.renderCrop();
      } else if (e.key === '+' || e.key === '-') {
        this.setCropZoom(this.crop.zoom * (e.key === '+' ? 1.1 : 1 / 1.1));
      } else {
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }

  // source: un archivo elegido, o la URL de la foto actual. fill: color de fondo (el del perfil)
  // para lo que quede vacío. Se resuelve con la foto recortada (data URL) al pulsar Aplicar,
  // o con null si se cancela.
  openPhotoCropper(source, fill = '#141414') {
    return new Promise((resolve, reject) => {
      const isFile = source instanceof File;
      if (isFile && !source.type.startsWith('image/')) return reject(new Error('No es una imagen'));
      const url = isFile ? URL.createObjectURL(source) : source;
      const img = document.getElementById('pcImage');
      img.onload = () => {
        img.onload = img.onerror = null;
        this.photoCropper.hidden = false;
        const viewport = document.getElementById('pcViewport');
        viewport.style.background = fill;
        this.crop = { img, url: isFile ? url : null, size: viewport.clientWidth, fill, resolve };
        this.resetCrop();
        if (window.lucide) lucide.createIcons({ root: this.photoCropper });
        viewport.focus({ preventScroll: true });
      };
      img.onerror = () => {
        img.onload = img.onerror = null;
        if (isFile) URL.revokeObjectURL(url);
        reject(new Error('Imagen no válida'));
      };
      img.src = url;
    });
  }

  closePhotoCropper(result) {
    const c = this.crop;
    if (!c) return;
    this.crop = null;
    this.photoCropper.hidden = true;
    if (c.url) URL.revokeObjectURL(c.url);
    c.resolve(result);
  }

  // Foto centrada y del tamaño justo para cubrir el cuadro
  resetCrop() {
    const c = this.crop;
    const { naturalWidth: w, naturalHeight: h } = c.img;
    c.base = c.size / Math.min(w, h);
    c.zoom = 1;
    c.x = (c.size - w * c.base) / 2;
    c.y = (c.size - h * c.base) / 2;
    this.renderCrop();
  }

  // Zoom alrededor de un punto del cuadro (por defecto, el centro): ese punto no se mueve
  setCropZoom(zoom, fx = this.crop.size / 2, fy = this.crop.size / 2) {
    const c = this.crop;
    const next = Math.min(4, Math.max(1, zoom));
    const old = c.base * c.zoom;
    const scale = c.base * next;
    c.x = fx - ((fx - c.x) / old) * scale;
    c.y = fy - ((fy - c.y) / old) * scale;
    c.zoom = next;
    this.renderCrop();
  }

  // axis 'x' | 'y', pct: 0 = se ve el borde de arriba / izquierdo de la foto,
  // 100 = el de abajo / derecho (dentro de lo que sobra fuera del cuadro)
  setCropPosition(axis, pct) {
    const c = this.crop;
    const scale = c.base * c.zoom;
    const extra = (axis === 'x' ? c.img.naturalWidth : c.img.naturalHeight) * scale - c.size;
    c[axis] = -(pct / 100) * Math.max(0, extra);
    this.renderCrop();
  }

  renderCrop() {
    const c = this.crop;
    const $ = (id) => document.getElementById(id);
    const scale = c.base * c.zoom;
    const w = c.img.naturalWidth * scale;
    const h = c.img.naturalHeight * scale;
    // Sin salirse de los bordes: la foto siempre llena todo el cuadro
    const extraX = Math.max(0, w - c.size);
    const extraY = Math.max(0, h - c.size);
    c.x = Math.min(0, Math.max(-extraX, c.x));
    c.y = Math.min(0, Math.max(-extraY, c.y));
    Object.assign(c.img.style, { width: `${w}px`, height: `${h}px`, transform: `translate(${c.x}px, ${c.y}px)` });

    // Barras: desactivadas en el sentido en que no sobra foto (hay que acercarla primero)
    const canX = extraX >= 1;
    const canY = extraY >= 1;
    $('pcZoom').value = c.zoom;
    $('pcPosX').disabled = !canX;
    $('pcPosY').disabled = !canY;
    $('pcPosX').value = canX ? (-c.x / extraX) * 100 : 50;
    $('pcPosY').value = canY ? (-c.y / extraY) * 100 : 50;
    const note = $('pcNote');
    note.hidden = canX && canY;
    note.textContent = !canY && !canX ? 'Acerca con el zoom para poder moverla.'
      : !canY ? 'La foto ya ocupa todo el alto: acerca con el zoom para moverla arriba o abajo.'
      : 'La foto ya ocupa todo el ancho: acerca con el zoom para moverla a los lados.';
  }

  // Lo que se ve en el cuadro, como foto de 320×320 px (el fondo solo es por si la foto
  // tiene partes transparentes)
  cropToDataUrl(out = 320) {
    const c = this.crop;
    const k = out / c.size;
    const scale = c.base * c.zoom;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = c.fill;
    ctx.fillRect(0, 0, out, out);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c.img, c.x * k, c.y * k, c.img.naturalWidth * scale * k, c.img.naturalHeight * scale * k);
    return canvas.toDataURL('image/jpeg', 0.88);
  }

  // Elegir / ajustar la foto desde un formulario. source: archivo nuevo o foto actual.
  // Devuelve la foto recortada, o undefined si se canceló.
  async pickProfilePhoto(source, fill) {
    try {
      const result = await this.openPhotoCropper(source, fill);
      return result || undefined;
    } catch (_) {
      this.showToast('No se pudo leer esa imagen', 'error');
      return undefined;
    }
  }

  renderProfile() {
    const { id, name, color, photo } = this.settings.profile;
    const btn = document.getElementById('profileAvatarBtn');
    this.paintAvatar(btn, name, color, photo);
    btn.title = name;
    this.paintAvatar(document.getElementById('profileMenuAvatar'), name, color, photo);
    document.getElementById('profileMenuName').textContent = name;

    // Menú: los demás perfiles, para cambiar con un clic
    const esc = (s) => this.escapeHtml(s);
    document.getElementById('profileMenuOthers').innerHTML = this.profiles
      .filter(p => p.id !== id)
      .map(p => `
        <button type="button" class="profile-menu-item profile-menu-other" role="menuitem" data-switch-profile="${esc(p.id)}">
          <span class="user-avatar is-small${p.photo ? ' has-photo' : ''}" style="${this.avatarStyle(p)}"><span>${esc((p.name.trim()[0] || 'P').toUpperCase())}</span></span>
          ${esc(p.name)}
        </button>`).join('');
    document.getElementById('profileMenuSwitch').hidden = !this.profilesSupported;
  }

  bindSettings() {
    const $ = (id) => document.getElementById(id);
    const wrapper = $('profileMenuWrapper');
    const avatarBtn = $('profileAvatarBtn');
    this.profileMenu = $('profileMenu');

    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleProfileMenu();
    });
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) this.toggleProfileMenu(false);
    });
    wrapper.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.profileMenu.classList.contains('open')) return;
      e.stopPropagation();
      this.toggleProfileMenu(false);
      avatarBtn.focus();
    });
    this.profileMenu.querySelectorAll('[data-settings-tab]').forEach(item =>
      item.addEventListener('click', () => {
        this.toggleProfileMenu(false);
        this.openSettings(item.dataset.settingsTab);
      }));
    // Cambiar de perfil: directo desde la lista del menú, o con la pantalla "¿Quién está viendo?"
    $('profileMenuOthers').addEventListener('click', (e) => {
      const item = e.target.closest('[data-switch-profile]');
      const p = item && this.profiles.find(x => x.id === item.dataset.switchProfile);
      if (!p) return;
      this.toggleProfileMenu(false);
      this.profileGateCancelable = false;
      this.chooseProfile(p).then(() => this.showToast(`Hola, ${p.name}`));
    });
    $('profileMenuSwitch').addEventListener('click', () => {
      this.toggleProfileMenu(false);
      this.openProfileGate('pick', { cancelable: true });
    });
    $('profileMenuMyList').addEventListener('click', () => {
      this.toggleProfileMenu(false);
      if (this.currentView === 'search') this.searchInput.value = '';
      this.showMyListPage();
    });

    // Ventana de configuración
    this.settingsModal.querySelectorAll('.settings-tab').forEach(tab =>
      tab.addEventListener('click', () => this.showSettingsTab(tab.dataset.tab)));
    $('closeSettingsModal').addEventListener('click', () => this.closeSettings());
    $('settingsCancelBtn').addEventListener('click', () => this.closeSettings());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });
    $('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // Vista previa del perfil mientras se edita
    $('settingsName').addEventListener('input', () => this.updateSettingsPreview());
    $('settingsColors').addEventListener('click', (e) => {
      const swatch = e.target.closest('[data-color]');
      if (!swatch) return;
      this.settingsDraftColor = swatch.dataset.color;
      this.updateSettingsPreview();
    });
    $('settingsPhotoFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const photo = await this.pickProfilePhoto(file, this.settingsDraftColor);
      if (photo === undefined) return;
      this.settingsPhotoSource = file;
      this.settingsDraftPhoto = photo;
      this.updateSettingsPreview();
    });
    $('settingsPhotoAdjust').addEventListener('click', async () => {
      const current = this.settingsDraftPhoto !== undefined ? this.settingsDraftPhoto : this.settings.profile.photo;
      const photo = await this.pickProfilePhoto(this.settingsPhotoSource || current, this.settingsDraftColor);
      if (photo === undefined) return;
      this.settingsDraftPhoto = photo;
      this.updateSettingsPreview();
    });
    $('settingsPhotoRemove').addEventListener('click', () => {
      this.settingsDraftPhoto = null;
      this.settingsPhotoSource = null;
      this.updateSettingsPreview();
    });
    $('settingsVolume').addEventListener('input', (e) => {
      $('settingsVolumeText').textContent = `${Math.round(e.target.value * 100)}%`;
    });
    $('settingsTmdbToggle').addEventListener('click', () => {
      const input = $('settingsTmdbKey');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    $('settingsRefreshBtn').addEventListener('click', () => this.refreshAllMetadata());
    $('settingsClearProgress').addEventListener('click', (e) =>
      this.confirmAction(e.currentTarget, () => this.clearProgress()));
    $('settingsClearMyList').addEventListener('click', (e) =>
      this.confirmAction(e.currentTarget, () => this.clearMyList()));
    // Ayuda
    $('settingsReportBug').addEventListener('click', () =>
      this.openGitHub('https://github.com/itsvnzla/hiy-series/issues/new?template=reportar-error.yml'));
    $('settingsOpenIssues').addEventListener('click', () =>
      this.openGitHub('https://github.com/itsvnzla/hiy-series/issues'));
  }

  // En el navegador del sistema (en Electron, a través de main.js); en un navegador, en otra pestaña
  async openGitHub(url) {
    try {
      if (window.electronAPI && window.electronAPI.openGitHub) await window.electronAPI.openGitHub(url);
      else window.open(url, '_blank', 'noopener');
      this.showToast('Se abrió GitHub en tu navegador');
    } catch (err) {
      console.error('No se pudo abrir GitHub:', err);
      this.showToast('No se pudo abrir el navegador', 'error');
    }
  }

  toggleProfileMenu(force) {
    const open = typeof force === 'boolean' ? force : !this.profileMenu.classList.contains('open');
    this.profileMenu.classList.toggle('open', open);
    document.getElementById('profileAvatarBtn').setAttribute('aria-expanded', String(open));
    if (open) {
      const episodes = this.seriesList.reduce((n, s) => n + (s.seasons || []).reduce((m, sn) => m + sn.episodes.length, 0), 0);
      document.getElementById('profileMenuStats').textContent =
        `${this.seriesList.length} títulos · ${episodes} episodios`;
    }
  }

  openSettings(tab = 'profile') {
    const $ = (id) => document.getElementById(id);
    const s = this.settings;

    // Perfil
    $('settingsName').value = s.profile.name;
    this.settingsDraftColor = s.profile.color;
    this.settingsDraftPhoto = undefined; // undefined: sin cambios · null: quitarla · data URL: foto nueva
    this.settingsPhotoSource = null;
    // La foto se guarda en la carpeta del perfil: sin perfiles (servidor anterior) no hay foto
    $('settingsPhotoActions').hidden = !s.profile.id;
    $('settingsLanguage').value = window.hiyI18n ? window.hiyI18n.lang : (s.language || 'es');
    // Perfil de inicio (solo con perfiles)
    $('settingsDefaultRow').hidden = !this.profilesSupported || !s.profile.id;
    $('settingsDefaultProfile').checked = !!s.profile.id && this.defaultProfileId === s.profile.id;
    $('settingsColors').innerHTML = s.colors.map(c =>
      `<button type="button" class="settings-color" role="radio" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`
    ).join('');
    this.updateSettingsPreview();

    // Reproducción
    $('settingsAutoplay').checked = s.playback.autoplayNext;
    let subsOn = false;
    try { subsOn = localStorage.getItem(hiyProfileKey('subs_on')) === '1'; } catch (_) { /* sin almacenamiento */ }
    $('settingsSubs').checked = subsOn;
    $('settingsSpeed').innerHTML = s.speeds.map(v =>
      `<option value="${v}"${v === s.playback.speed ? ' selected' : ''}>${v === 1 ? 'Normal (1x)' : `${v}x`}</option>`
    ).join('');
    $('settingsVolume').value = s.playback.volume;
    $('settingsVolumeText').textContent = `${Math.round(s.playback.volume * 100)}%`;

    // Biblioteca
    $('settingsTranslateTitles').checked = s.library.translateTitles;
    const key = $('settingsTmdbKey');
    key.value = '';
    key.type = 'password';
    key.disabled = s.tmdb.fromEnv;
    key.placeholder = s.tmdb.hasKey ? `Clave guardada (${s.tmdb.hint}). Escribe una nueva para cambiarla` : 'Pega aquí tu clave de API';
    $('settingsTmdbHint').textContent = s.tmdb.fromEnv
      ? 'La clave viene de la variable de entorno TMDB_API_KEY y no se puede cambiar desde aquí.'
      : 'Con ella la información (descripción, géneros, pósters) llega en español. Es gratuita en themoviedb.org. Déjala vacía para no cambiarla.';

    this.renderSettingsStats();
    this.settingsModal.querySelectorAll('.btn-danger').forEach(b => this.resetConfirm(b));
    this.showSettingsTab(tab);
    this.settingsModal.classList.add('active');
    if (window.lucide) lucide.createIcons({ root: this.settingsModal });
  }

  closeSettings() {
    this.settingsModal.classList.remove('active');
  }

  showSettingsTab(tab) {
    this.settingsModal.querySelectorAll('.settings-tab').forEach(t => {
      const on = t.dataset.tab === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    this.settingsModal.querySelectorAll('.settings-panel').forEach(p => {
      p.hidden = p.dataset.panel !== tab;
    });
    // "Datos" y "Ayuda" se aplican al momento: no hay nada que guardar
    document.querySelector('.settings-actions').hidden = tab === 'data' || tab === 'help';
  }

  updateSettingsPreview() {
    const name = document.getElementById('settingsName').value.trim() || this.settings.profile.name;
    const photo = this.settingsDraftPhoto !== undefined ? this.settingsDraftPhoto : this.settings.profile.photo || null;
    this.paintAvatar(document.getElementById('settingsAvatarPreview'), name, this.settingsDraftColor, photo);
    document.getElementById('settingsPhotoRemove').hidden = !photo;
    document.getElementById('settingsPhotoAdjust').hidden = !photo;
    document.getElementById('settingsNamePreview').textContent = name;
    document.querySelectorAll('#settingsColors .settings-color').forEach(sw => {
      const on = sw.dataset.color === this.settingsDraftColor;
      sw.classList.toggle('active', on);
      sw.setAttribute('aria-checked', String(on));
    });
  }

  renderSettingsStats() {
    const episodes = this.seriesList.reduce((n, s) => n + (s.seasons || []).reduce((m, sn) => m + sn.episodes.length, 0), 0);
    const watching = Object.values(this.progressMap).filter(p => p.percentage > 2 && p.percentage < 95).length;
    const seen = Object.values(this.progressMap).filter(p => p.percentage >= 95).length;
    const stats = [
      [this.seriesList.length, 'títulos'],
      [episodes, 'episodios'],
      [this.myList.length, 'favoritos'],
      [watching, 'a medias'],
      [seen, 'vistos']
    ];
    document.getElementById('settingsStats').innerHTML = stats
      .map(([n, label]) => `<div><b>${n}</b><span>${label}</span></div>`).join('');
  }

  async saveSettings() {
    const $ = (id) => document.getElementById(id);
    const name = $('settingsName').value.trim();
    if (!name) {
      this.showSettingsTab('profile');
      $('settingsName').focus();
      this.showToast('Escribe un nombre para el perfil', 'error');
      return;
    }

    const body = {
      profile: {
        name,
        color: this.settingsDraftColor,
        ...(this.settingsDraftPhoto !== undefined ? { photo: this.settingsDraftPhoto } : {})
      },
      playback: {
        autoplayNext: $('settingsAutoplay').checked,
        speed: parseFloat($('settingsSpeed').value),
        volume: parseFloat($('settingsVolume').value)
      },
      library: { translateTitles: $('settingsTranslateTitles').checked },
      language: $('settingsLanguage').value
    };
    const key = $('settingsTmdbKey').value.trim();
    if (key && !this.settings.tmdb.fromEnv) body.tmdbApiKey = key;

    const btn = $('settingsSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 && !data.error) throw new Error('cierra y vuelve a abrir la app para activar la configuración');
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      // Los subtítulos los recuerda el reproductor en este equipo
      try { localStorage.setItem(hiyProfileKey('subs_on'), $('settingsSubs').checked ? '1' : '0'); } catch (_) { /* sin almacenamiento */ }
      this.settings = data.settings;
      // "Iniciar siempre con este perfil": activarlo, o quitarlo si este era el de inicio
      const profileId = this.settings.profile.id;
      if (this.profilesSupported && profileId) {
        const wantDefault = $('settingsDefaultProfile').checked;
        if (wantDefault !== (this.defaultProfileId === profileId)) {
          await this.setDefaultProfile(wantDefault ? profileId : null);
        }
      }
      // El nombre o el color del perfil pudieron cambiar: la lista de perfiles también
      if (this.profilesSupported) await this.loadProfiles();
      // Otro idioma: se recarga la app para dibujarla entera en el idioma nuevo
      if (window.hiyI18n && body.language !== window.hiyI18n.lang && window.hiyI18n.setLang(body.language)) return;
      this.renderProfile();
      if (window.player && window.player.applyPreferences) window.player.applyPreferences(true);
      this.closeSettings();
      this.showToast('Configuración guardada');
      if (data.refreshing) this.watchMetadata(false);
    } catch (err) {
      this.showToast(`No se pudo guardar: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  }

  // Botón peligroso: el primer clic pide confirmación, el segundo (en 4 s) ejecuta
  confirmAction(btn, action) {
    if (btn.classList.contains('confirming')) {
      this.resetConfirm(btn);
      action();
      return;
    }
    btn.dataset.label = btn.innerHTML;
    btn.classList.add('confirming');
    btn.textContent = btn.dataset.confirm;
    btn.confirmTimer = setTimeout(() => this.resetConfirm(btn), 4000);
  }

  resetConfirm(btn) {
    clearTimeout(btn.confirmTimer);
    if (!btn.classList.contains('confirming')) return;
    btn.classList.remove('confirming');
    btn.innerHTML = btn.dataset.label;
  }

  async refreshAllMetadata() {
    try {
      const res = await fetch('/api/metadata/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.closeSettings();
      this.showToast('Buscando de nuevo la información de tus series…');
      this.watchMetadata(false);
    } catch (err) {
      this.showToast(`No se pudo iniciar la búsqueda: ${err.message}`, 'error');
    }
  }

  async clearProgress() {
    try {
      const res = await fetch('/api/progress', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.progressMap = {};
      try {
        Object.keys(localStorage).filter(k => k.startsWith('prog_')).forEach(k => localStorage.removeItem(k));
      } catch (_) { /* sin almacenamiento */ }
      this.render();
      this.renderSettingsStats();
      this.showToast('Historial de "Continuar viendo" borrado');
    } catch (err) {
      this.showToast(`No se pudo borrar: ${err.message}`, 'error');
    }
  }

  async clearMyList() {
    try {
      const res = await fetch('/api/mylist', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.myList = [];
      this.saveMyListLocal();
      this.refreshMyListButtons();
      if (this.currentView === 'mylist') this.renderMyListPage();
      this.renderSettingsStats();
      this.showToast('Favoritos vaciados');
    } catch (err) {
      this.showToast(`No se pudo vaciar: ${err.message}`, 'error');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = type === 'error' ? 'toast toast-error' : 'toast';
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="width: 18px; height: 18px;"></i> <span>${message}</span>`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons({ root: toast });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new NetflixApp();
});
