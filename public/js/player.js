/* ==========================================================================
   NETFLIX SERIES HUB - CUSTOM VIDEO PLAYER MODULE
   ========================================================================== */

const NETFLIX_PLAYER_ICONS = {
  play: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  rewind10: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.1 11h-1.1V11.8l-.05.02-1.29.93-.46-.66 1.9-1.39h.99v5.3zm4.27-5.4c1.37 0 2.23.95 2.23 2.37v.9c0 1.43-.86 2.37-2.23 2.37s-2.23-.95-2.23-2.37v-.9c0-1.42.86-2.37 2.23-2.37zm0 4.67c.72 0 1.13-.57 1.13-1.4v-.9c0-.83-.41-1.4-1.13-1.4s-1.13.57-1.13 1.4v.9c0 .83.41 1.4 1.13 1.4z"/></svg>`,
  forward10: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 8-8 8-8zm-1.1 11h-1.1V11.8l-.05.02-1.29.93-.46-.66 1.9-1.39h.99v5.3zm4.27-5.4c1.37 0 2.23.95 2.23 2.37v.9c0 1.43-.86 2.37-2.23 2.37s-2.23-.95-2.23-2.37v-.9c0-1.42.86-2.37 2.23-2.37zm0 4.67c.72 0 1.13-.57 1.13-1.4v-.9c0-.83-.41-1.4-1.13-1.4s-1.13.57-1.13 1.4v.9c0 .83.41 1.4 1.13 1.4z"/></svg>`,
  volumeHigh: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  volumeLow: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`,
  volumeMute: `<svg viewBox="0 0 24 24" class="ctrl-svg" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm16.59 3l2.7-2.7-1.41-1.41-2.7 2.7-2.7-2.7-1.41 1.41 2.7 2.7-2.7 2.7 1.41 1.41 2.7-2.7 2.7 2.7 1.41-1.41-2.7-2.7z"/></svg>`
};

// La miniatura de la barra salta cuando el mouse se queda quieto este tiempo (ver showScrubPreview)
const SCRUB_REST_MS = 120;

class NetflixPlayer {
  constructor() {
    this.overlay = document.getElementById('playerOverlay');
    this.controls = document.getElementById('playerControls');
    this.video = document.getElementById('mainVideo');

    // Controls
    this.btnBack = document.getElementById('btnBackPlayer');
    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.iconPlayPause = document.getElementById('iconPlayPause');
    this.btnRewind10 = document.getElementById('btnRewind10');
    this.btnForward10 = document.getElementById('btnForward10');
    this.btnMute = document.getElementById('btnMute');
    this.iconVolume = document.getElementById('iconVolume');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.btnSpeed = document.getElementById('btnSpeed');
    this.btnNextEp = document.getElementById('btnNextEp');
    this.btnFullscreen = document.getElementById('btnFullscreen');

    // Subtítulos
    this.btnSubs = document.getElementById('btnSubs');
    this.subsMenu = document.getElementById('subsMenu');
    this.subsFileInput = document.getElementById('subsFileInput');
    this.subsTracks = [];     // pistas del episodio: { id, label, lang, source: 'file' | 'manual' }
    this.subsActive = null;   // id de la pista visible, o null
    this.subsMenuOpen = false;
    this.subsBox = document.getElementById('playerSubs');

    // Audio Dolby/DTS: el servidor lo convierte a AAC y suena aquí, sincronizado con el video
    this.btnAudio = document.getElementById('btnAudio');
    this.audioMenu = document.getElementById('audioMenu');
    this.audioContainer = document.getElementById('audioContainer');
    this.audioMenuOpen = false;
    this.bridge = {
      el: new Audio(),
      active: false,   // el audio del episodio se está convirtiendo
      tracks: [],      // pistas de audio del archivo
      track: 0,        // pista elegida
      base: 0,         // segundo del video en el que empieza el audio pedido
      holding: false,  // video en pausa un instante mientras llega el audio
      resumeAfterHold: true,
      token: 0,        // cada pedido nuevo invalida los anteriores
      timer: null
    };
    this.bridge.el.preload = 'auto';

    // Scrubber
    this.progressBarWrap = document.getElementById('progressBarWrap');
    this.progressFilled = document.getElementById('progressFilled');
    this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
    this.durationDisplay = document.getElementById('durationDisplay');

    // Miniatura al pasar el mouse por la barra
    this.scrubPreview = document.getElementById('scrubPreview');
    this.scrubFrame = document.getElementById('scrubFrame');
    this.scrubTime = document.getElementById('scrubTime');
    this.scrubVideo = null;      // segundo <video>, oculto, del mismo episodio
    this.scrubCache = new Map(); // tiempo → ImageBitmap ya capturado
    this.scrubBusy = false;      // hay un salto del video oculto en curso
    this.scrubWanted = null;     // último tiempo pedido (se atiende al terminar el salto)

    // Info
    this.seriesTitle = document.getElementById('playerSeriesTitle');
    this.episodeTitle = document.getElementById('playerEpisodeTitle');
    this.formatBadge = document.getElementById('playerFormatBadge');

    // State
    this.currentEpisode = null;
    this.currentSeries = null;
    this.speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    this.currentSpeedIdx = 1;
    this.idleTimer = null;

    this.initEvents();
    this.updateVolumeIcon();
  }

  initEvents() {
    // Play/Pause
    this.btnPlayPause.addEventListener('click', () => this.togglePlay());

    // Un clic en la pantalla pausa / reanuda. La capa de controles tapa el video,
    // por eso se escucha en ella (y en el video, para cuando los controles se ocultan).
    this.controls.addEventListener('click', (e) => this.onScreenClick(e));
    this.video.addEventListener('click', (e) => this.onScreenClick(e));

    // Skip
    this.btnRewind10.addEventListener('click', () => this.skip(-10));
    this.btnForward10.addEventListener('click', () => this.skip(10));

    // Video Events
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
    this.video.addEventListener('ended', () => this.onEnded());
    this.video.addEventListener('play', () => this.updatePlayIcon(true));
    this.video.addEventListener('pause', () => this.updatePlayIcon(false));

    // Audio convertido: sigue al video (reproducir, pausar, saltar, velocidad, volumen)
    this.video.addEventListener('play', () => this.bridgeOnPlay());
    this.video.addEventListener('playing', () => this.bridgeOnPlay());
    this.video.addEventListener('pause', () => this.bridgeOnPause());
    this.video.addEventListener('waiting', () => this.bridgeOnPause());
    this.video.addEventListener('seeking', () => { if (this.bridge.active && !this.bridge.holding) this.bridge.el.pause(); });
    this.video.addEventListener('seeked', () => { if (this.bridge.active) this.bridgeStart(this.video.currentTime); });
    // La miniatura de la barra espera a que el video principal termine de saltar
    this.video.addEventListener('seeked', () => this.resumeScrub());
    this.video.addEventListener('canplay', () => this.resumeScrub());
    this.video.addEventListener('ratechange', () => this.bridgeSyncSettings());
    this.video.addEventListener('volumechange', () => this.bridgeSyncSettings());
    this.bridge.el.addEventListener('error', () => {
      if (this.bridge.active && this.bridge.el.getAttribute('src')) this.showOsd('No se pudo cargar el audio');
    });

    // Menú de idioma del audio
    if (this.btnAudio) {
      this.btnAudio.addEventListener('click', () => this.toggleAudioMenu());
      this.audioMenu.addEventListener('click', (e) => {
        const item = e.target.closest('[data-audio]');
        if (item) this.selectAudioTrack(parseInt(item.dataset.audio, 10));
      });
    }

    // Scrubber click
    this.progressBarWrap.addEventListener('click', (e) => this.seek(e));
    this.progressBarWrap.addEventListener('mousemove', (e) => this.showScrubPreview(e));
    this.progressBarWrap.addEventListener('mouseleave', () => {
      clearTimeout(this.scrubRestTimer);
      this.scrubPreview.classList.remove('show');
    });

    // Volume
    this.volumeSlider.addEventListener('input', (e) => {
      this.video.volume = e.target.value;
      this.video.muted = e.target.value == 0;
      this.updateVolumeIcon();
      this.showVolumeHud(false);
    });

    this.btnMute.addEventListener('click', () => this.toggleMute());

    // Speed
    this.btnSpeed.addEventListener('click', () => {
      this.setSpeed((this.currentSpeedIdx + 1) % this.speeds.length);
    });

    // Back & Close
    this.btnBack.addEventListener('click', () => this.close());

    // Fullscreen
    this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Next Episode
    this.btnNextEp.addEventListener('click', () => this.nextEpisode());

    // Subtítulos: el botón abre el menú; cada opción lleva data-subs
    this.btnSubs.addEventListener('click', () => this.toggleSubsMenu());
    this.subsMenu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-subs]');
      if (!item || item.disabled) return;
      if (item.dataset.subs === 'load') {
        this.subsFileInput.click(); // abre el selector de archivos del sistema
      } else if (item.dataset.subs === 'remove') {
        this.removeManualSubs();
      } else {
        this.selectSubs(item.dataset.subs === 'off' ? null : item.dataset.subs, true);
        this.toggleSubsMenu(false);
      }
    });
    this.subsFileInput.addEventListener('change', () => {
      this.loadSubsFile(this.subsFileInput.files[0]);
      this.subsFileInput.value = ''; // permite volver a elegir el mismo archivo
    });
    // Clic fuera del menú lo cierra
    document.addEventListener('click', (e) => {
      if (this.subsMenuOpen && !e.target.closest('.subs-container')) this.toggleSubsMenu(false);
    });

    // Ayuda de atajos
    document.getElementById('btnHelp').addEventListener('click', () => this.toggleHelp());
    document.getElementById('playerHelp').addEventListener('click', () => this.toggleHelp(false));

    // Doble clic en la pantalla = pantalla completa
    // (los 2 clics pausan y reanudan, así que el video queda como estaba)
    this.controls.addEventListener('dblclick', (e) => {
      if (!this.isControlTarget(e)) this.toggleFullscreen();
    });
    this.video.addEventListener('dblclick', () => this.toggleFullscreen());

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => this.handleKeys(e));

    // Mouse Idle Auto-Hide Controls
    this.overlay.addEventListener('mousemove', () => this.resetIdleTimer());
  }

  handleKeys(e) {
    if (!this.overlay.classList.contains('active')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Con la ayuda abierta, cualquier tecla (salvo ? / H) la cierra
    if (this.helpOpen && !(e.key === '?' || e.code === 'KeyH')) {
      e.preventDefault();
      this.toggleHelp(false);
      return;
    }

    let handled = true;
    switch (e.code) {
      case 'Space':
      case 'KeyK':
        this.togglePlay();
        this.flashPlayState();
        break;
      case 'ArrowLeft':
        this.skip(e.shiftKey ? -30 : -10);
        break;
      case 'ArrowRight':
        this.skip(e.shiftKey ? 30 : 10);
        break;
      case 'KeyJ':
        this.skip(-10);
        break;
      case 'KeyL':
        this.skip(10);
        break;
      case 'ArrowUp':
        this.changeVolume(0.05);
        break;
      case 'ArrowDown':
        this.changeVolume(-0.05);
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
      case 'KeyN':
        this.nextEpisode();
        break;
      case 'KeyC':
        this.toggleSubtitles();
        break;
      case 'Home':
        this.seekTo(0);
        break;
      case 'End':
        if (this.video.duration) this.seekTo(this.video.duration - 1);
        break;
      case 'Comma':
        if (e.shiftKey) this.changeSpeed(-1); // <
        else handled = false;
        break;
      case 'Period':
        if (e.shiftKey) this.changeSpeed(1); // >
        else handled = false;
        break;
      case 'Escape':
        if (this.subsMenuOpen) this.toggleSubsMenu(false);
        else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else this.close();
        break;
      default:
        handled = false;
    }

    // Números 0-9: saltar a ese porcentaje del episodio (3 = 30%)
    if (!handled && /^[0-9]$/.test(e.key) && this.video.duration) {
      this.seekTo(this.snapToKeyframe(this.video.duration * (parseInt(e.key, 10) / 10), 'before'));
      handled = true;
    }

    // Velocidad con < > aunque el teclado no use Shift+, / Shift+.
    if (!handled && (e.key === '<' || e.key === '>')) {
      this.changeSpeed(e.key === '>' ? 1 : -1);
      handled = true;
    }

    // Ayuda
    if (!handled && (e.key === '?' || e.code === 'KeyH')) {
      this.toggleHelp();
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      this.resetIdleTimer();
    }
  }

  // ¿El clic fue sobre un control (botón, barra, volumen...) y no sobre la pantalla?
  isControlTarget(e) {
    return !!e.target.closest('button, input, a, .progress-bar-wrap, .scrubber-container, .controls-row, .player-help');
  }

  onScreenClick(e) {
    if (this.isControlTarget(e)) return;
    if (this.helpOpen) {
      this.toggleHelp(false);
      return;
    }
    // Con el menú de subtítulos abierto, el clic solo lo cierra (no pausa)
    if (this.subsMenuOpen) return;
    this.togglePlay();
    this.flashPlayState();
    this.resetIdleTimer();
  }

  // Ícono grande de play/pausa que aparece y se desvanece en el centro
  flashPlayState() {
    const flash = document.getElementById('playerFlash');
    if (!flash) return;
    flash.innerHTML = this.video.paused ? NETFLIX_PLAYER_ICONS.pause : NETFLIX_PLAYER_ICONS.play;
    flash.classList.remove('animate');
    void flash.offsetWidth; // reiniciar la animación
    flash.classList.add('animate');
  }

  // Animación lateral al adelantar/retroceder; si se repite seguido, suma los segundos
  showSkip(seconds) {
    const dir = seconds > 0 ? 'right' : 'left';
    const el = document.getElementById(dir === 'right' ? 'skipRight' : 'skipLeft');
    const other = document.getElementById(dir === 'right' ? 'skipLeft' : 'skipRight');
    if (!el) return;

    if (this.skipDir === dir && el.classList.contains('show')) {
      this.skipTotal += Math.abs(seconds);
    } else {
      this.skipTotal = Math.abs(seconds);
    }
    this.skipDir = dir;

    other.classList.remove('show');
    el.querySelector('.skip-text').textContent = `${dir === 'right' ? '+' : '-'}${this.skipTotal} s`;

    // Reiniciar el "rebote" en cada pulsación
    const circle = el.querySelector('.skip-circle');
    circle.style.animation = 'none';
    void circle.offsetWidth;
    circle.style.animation = '';
    el.classList.add('show');

    clearTimeout(this.skipTimer);
    this.skipTimer = setTimeout(() => {
      el.classList.remove('show');
      this.skipDir = null;
    }, 750);
  }

  // Barra de volumen animada arriba al centro
  showVolumeHud(bump = true) {
    const hud = document.getElementById('volumeHud');
    if (!hud) return;
    const isMuted = this.video.muted || this.video.volume === 0;
    const pct = isMuted ? 0 : Math.round(this.video.volume * 100);

    hud.querySelector('.vh-icon').innerHTML = isMuted
      ? NETFLIX_PLAYER_ICONS.volumeMute
      : (this.video.volume < 0.5 ? NETFLIX_PLAYER_ICONS.volumeLow : NETFLIX_PLAYER_ICONS.volumeHigh);
    hud.querySelector('.vh-fill').style.width = `${pct}%`;
    hud.querySelector('.vh-text').textContent = isMuted ? 'Silencio' : `${pct}%`;

    if (bump) {
      hud.classList.remove('bump');
      void hud.offsetWidth;
      hud.classList.add('bump');
    }
    hud.classList.add('show');
    clearTimeout(this.volumeHudTimer);
    this.volumeHudTimer = setTimeout(() => hud.classList.remove('show'), 1100);
  }

  showOsd(text) {
    let osd = document.getElementById('playerOsd');
    if (!osd) return;
    osd.textContent = text;
    osd.classList.add('show');
    clearTimeout(this.osdTimer);
    this.osdTimer = setTimeout(() => osd.classList.remove('show'), 900);
  }

  toggleHelp(force) {
    const help = document.getElementById('playerHelp');
    if (!help) return;
    this.helpOpen = typeof force === 'boolean' ? force : !this.helpOpen;
    help.classList.toggle('show', this.helpOpen);
  }

  seekTo(time) {
    if (!isFinite(this.video.duration)) return;
    this.video.currentTime = Math.min(Math.max(0, time), this.video.duration);
    this.showOsd(`${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`);
  }

  changeVolume(delta) {
    const vol = Math.round(Math.min(1, Math.max(0, this.video.volume + delta)) * 100) / 100;
    this.video.volume = vol;
    this.video.muted = vol === 0;
    this.volumeSlider.value = vol;
    this.updateVolumeIcon();
    this.showVolumeHud();
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    if (!this.video.muted && this.video.volume === 0) {
      this.video.volume = 0.5;
      this.volumeSlider.value = 0.5;
    }
    this.updateVolumeIcon();
    this.showVolumeHud();
  }

  changeSpeed(dir) {
    const idx = Math.min(this.speeds.length - 1, Math.max(0, this.currentSpeedIdx + dir));
    this.setSpeed(idx);
  }

  setSpeed(idx) {
    this.currentSpeedIdx = idx;
    const speed = this.speeds[idx];
    this.video.playbackRate = speed;
    this.video.defaultPlaybackRate = speed; // se mantiene al pasar al siguiente episodio
    this.btnSpeed.textContent = `${speed}x`;
    this.showOsd(`Velocidad ${speed}x`);
  }

  // Velocidad y volumen iniciales de Configuración → Reproducción. Se aplican al abrir el
  // primer episodio (después se respeta lo que cambies en el reproductor), o al guardar (force).
  applyPreferences(force = false) {
    if (this.prefsApplied && !force) return;
    const pb = window.app && window.app.settings && window.app.settings.playback;
    if (!pb) return;
    this.prefsApplied = true;

    const idx = this.speeds.indexOf(pb.speed);
    this.currentSpeedIdx = idx === -1 ? this.speeds.indexOf(1) : idx;
    const speed = this.speeds[this.currentSpeedIdx];
    this.video.defaultPlaybackRate = speed;
    this.video.playbackRate = speed;
    this.btnSpeed.textContent = `${speed}x`;

    this.video.volume = pb.volume;
    this.video.muted = pb.volume === 0;
    this.volumeSlider.value = pb.volume;
    this.updateVolumeIcon();
  }

  nextEpisode() {
    if (window.app && window.app.playNextEpisode && this.currentEpisode) {
      this.saveProgress(this.video.currentTime, this.video.duration);
      window.app.playNextEpisode(this.currentSeries, this.currentEpisode);
    }
  }

  resetIdleTimer() {
    this.overlay.classList.remove('idle');
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (!this.video.paused && !this.subsMenuOpen) {
        this.overlay.classList.add('idle');
      }
    }, 3500);
  }

  playEpisode(series, episode, startPosition = 0) {
    this.bridgeReset();
    this.applyPreferences();
    this.currentSeries = series;
    this.currentEpisode = episode;
    this.loadKeyframes(episode);

    // Set Info
    this.seriesTitle.textContent = series.title;
    this.episodeTitle.textContent = `T${episode.seasonNumber || 1}:E${episode.episodeNumber || 1} - ${episode.title}`;
    
    // Format Badge
    const fmt = (episode.format || 'mp4').toUpperCase();
    this.formatBadge.textContent = fmt;
    this.formatBadge.className = `format-badge format-${fmt.toLowerCase()}`;

    // Determine Stream URL
    let streamUrl = episode.videoUrl;
    if (episode.localPath) {
      streamUrl = `/api/stream?localPath=${encodeURIComponent(episode.localPath)}`;
    } else if (!streamUrl.startsWith('http')) {
      streamUrl = `/api/stream?file=${encodeURIComponent(streamUrl)}`;
    }

    this.video.src = streamUrl;
    this.resetScrubPreview(streamUrl);
    this.overlay.classList.add('active');
    // Quitar el foco del botón/tarjeta de fondo para que Espacio/Enter no lo activen
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();

    this.video.load();
    this.video.currentTime = this.resumePosition(episode, startPosition);
    
    this.video.play().catch(err => {
      console.warn('Auto-play prevented or stream loading:', err);
    });

    this.loadSubtitles();
    this.loadAudioInfo(episode);
    this.resetIdleTimer();
  }

  // Un episodio terminado (o casi) vuelve a empezar desde el principio. Si no, al abrirlo
  // arrancaba en el último segundo, terminaba al instante y saltaba al siguiente.
  resumePosition(episode, startPosition) {
    const saved = window.app && window.app.progressMap && window.app.progressMap[episode.id];
    const duration = saved && saved.duration;
    if (!startPosition || !duration) return startPosition || 0;
    const finished = startPosition >= duration * 0.95 || duration - startPosition < 15;
    return finished ? 0 : startPosition;
  }

  /* ---------------- Subtítulos ---------------- */
  // Dos fuentes, las dos las sirve el servidor: archivos .srt/.vtt junto al video y uno
  // cargado a mano desde el menú, que se guarda para ese episodio hasta que se quite.

  subsQuery(episode = this.currentEpisode) {
    return `episodeId=${encodeURIComponent(episode.id)}`;
  }

  // Pide al servidor los subtítulos del episodio actual
  async loadSubtitles() {
    const episode = this.currentEpisode;
    this.clearTracks();
    if (!episode || !episode.id) return;

    try {
      const res = await fetch(`/api/subtitles?${this.subsQuery(episode)}`);
      if (!res.ok) return;
      const { tracks } = await res.json();
      if (this.currentEpisode !== episode) return; // se cambió de episodio mientras cargaba
      this.setTracks(tracks);
      // Si el usuario los tenía activados, se muestran solos
      if (this.subsWanted()) this.selectSubs(this.preferredSubs());
    } catch (err) {
      console.warn('No se pudieron cargar los subtítulos:', err);
    }
  }

  clearTracks() {
    this.video.querySelectorAll('track').forEach(t => t.remove());
    this.subsBox.replaceChildren();
    this.subsTracks = [];
    this.subsActive = null;
    this.renderSubs();
  }

  // Crea un <track> por pista. `v` cambia la URL para no reutilizar un subtítulo reemplazado.
  setTracks(tracks) {
    const v = Date.now();
    this.clearTracks();
    for (const t of tracks) {
      const el = document.createElement('track');
      el.kind = 'subtitles';
      el.label = t.label;
      el.srclang = t.lang || 'es';
      el.src = `/api/subtitles/track?${this.subsQuery()}&id=${encodeURIComponent(t.id)}&v=${v}`;
      el.dataset.id = t.id;
      this.video.appendChild(el);
      el.track.mode = 'disabled'; // no se descarga hasta que se elige
      this.subsTracks.push(t);
    }
    this.renderSubs();
  }

  // Archivo elegido con «Cargar subtítulos…»: .srt (se pasa a WebVTT) o .vtt.
  // Se guarda en el servidor para este episodio (reemplaza al cargado antes).
  async loadSubsFile(file) {
    const episode = this.currentEpisode;
    if (!file || !episode) return;
    if (!/\.(srt|vtt)$/i.test(file.name)) {
      this.showOsd('Usa un archivo .srt o .vtt');
      return;
    }
    const buf = await file.arrayBuffer();
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
      text = new TextDecoder('windows-1252').decode(buf); // muchos .srt viejos
    }
    text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    if (/\.srt$/i.test(file.name)) {
      text = `WEBVTT\n\n${text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').trim()}\n`;
    }
    if (!text.startsWith('WEBVTT') || !text.includes('-->')) {
      this.showOsd('El archivo no tiene subtítulos válidos');
      return;
    }

    try {
      const res = await fetch('/api/subtitles/manual', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: episode.id, name: file.name, vtt: text })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const { tracks } = await res.json();
      if (this.currentEpisode !== episode) return;
      this.setTracks(tracks);
      this.selectSubs('manual', true);
      this.toggleSubsMenu(false);
      this.showOsd('Subtítulos guardados para este episodio');
    } catch (err) {
      console.error('Guardar subtítulos:', err);
      this.showOsd('No se pudieron guardar los subtítulos');
    }
  }

  async removeManualSubs() {
    const episode = this.currentEpisode;
    if (!episode) return;
    try {
      const res = await fetch(`/api/subtitles/manual?${this.subsQuery(episode)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { tracks } = await res.json();
      if (this.currentEpisode !== episode) return;
      const keep = this.subsActive !== 'manual' ? this.subsActive : null;
      this.setTracks(tracks);
      this.selectSubs(keep);
      this.showOsd('Subtítulo quitado');
    } catch (err) {
      console.error('Quitar subtítulos:', err);
      this.showOsd('No se pudo quitar el subtítulo');
    }
  }

  subsWanted() {
    try { return localStorage.getItem(hiyProfileKey('subs_on')) === '1'; } catch { return false; }
  }

  // Preferencia: archivo en español → cualquier otro
  preferredSubs() {
    const t = this.subsTracks.find(x => x.lang.startsWith('es') || /español/i.test(x.label)) || this.subsTracks[0];
    return t ? t.id : null;
  }

  // Muestra la pista `id` (o ninguna con null). `remember` guarda la preferencia.
  // La pista elegida queda en modo 'hidden': el navegador la carga y avisa de cada frase,
  // pero el texto lo dibuja renderCues() en #playerSubs
  selectSubs(id, remember = false) {
    this.video.querySelectorAll('track').forEach(el => {
      const on = el.dataset.id === id;
      el.track.mode = on ? 'hidden' : 'disabled';
      el.track.oncuechange = on ? () => this.renderCues(el.track) : null;
      if (on) this.renderCues(el.track);
    });
    if (!id) this.subsBox.replaceChildren();
    this.subsActive = id;
    if (remember) {
      try { localStorage.setItem(hiyProfileKey('subs_on'), id ? '1' : '0'); } catch { /* sin almacenamiento */ }
    }
    this.renderSubs();
  }

  // Muestra las frases activas (getCueAsHTML respeta <i>/<b> del archivo y no ejecuta nada)
  renderCues(track) {
    const lines = [...(track.activeCues || [])].map(cue => {
      const span = document.createElement('span');
      span.appendChild(cue.getCueAsHTML());
      return span;
    });
    this.subsBox.replaceChildren(...lines.flatMap((s, i) => (i ? [document.createElement('br'), s] : [s])));
  }

  // Tecla C
  toggleSubtitles() {
    if (this.subsActive) {
      this.selectSubs(null, true);
      this.showOsd('Subtítulos desactivados');
      return;
    }
    const id = this.preferredSubs();
    if (id) {
      this.selectSubs(id, true);
      this.showOsd(`Subtítulos: ${this.subsTracks.find(t => t.id === id).label}`);
    } else {
      this.toggleSubsMenu(true); // sin pistas: abrir el menú para poder cargar uno
    }
  }

  toggleSubsMenu(force) {
    this.subsMenuOpen = typeof force === 'boolean' ? force : !this.subsMenuOpen;
    this.subsMenu.classList.toggle('show', this.subsMenuOpen);
    this.btnSubs.setAttribute('aria-expanded', String(this.subsMenuOpen));
    if (this.subsMenuOpen) this.renderSubs();
    this.resetIdleTimer();
  }

  renderSubs() {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const check = on => `<span class="subs-check">${on ? '✓' : ''}</span>`;

    // Raya roja bajo el ícono si hay subtítulos visibles
    this.btnSubs.classList.toggle('subs-on', !!this.subsActive);
    if (!this.subsMenuOpen) return;

    let html = `<h4>Subtítulos</h4>
      <button class="subs-item" data-subs="off" role="menuitemradio" aria-checked="${!this.subsActive}">${check(!this.subsActive)}Desactivados</button>`;
    for (const t of this.subsTracks) {
      const on = this.subsActive === t.id;
      const note = t.source === 'manual' ? 'Guardado para este episodio' : 'Archivo junto al video';
      html += `<button class="subs-item" data-subs="${esc(t.id)}" role="menuitemradio" aria-checked="${on}">${check(on)}<span>${esc(t.label)}<small>${note}</small></span></button>`;
    }
    const hasManual = this.subsTracks.some(t => t.source === 'manual');
    html += `<div class="subs-sep"></div>
      <button class="subs-item" data-subs="load" role="menuitem">${check(false)}<span>${hasManual ? 'Cambiar subtítulo…' : 'Cargar subtítulos…'}<small>Archivo .srt o .vtt de tu PC</small></span></button>`;
    if (hasManual) {
      html += `<button class="subs-item" data-subs="remove" role="menuitem">${check(false)}<span>Quitar subtítulo cargado</span></button>`;
    }
    this.subsMenu.innerHTML = html;
  }

  togglePlay() {
    // Esperando el audio convertido: solo se cambia lo que pasará cuando llegue
    if (this.bridge.holding) {
      this.bridge.resumeAfterHold = !this.bridge.resumeAfterHold;
      this.btnPlayPause.innerHTML = this.bridge.resumeAfterHold ? NETFLIX_PLAYER_ICONS.pause : NETFLIX_PLAYER_ICONS.play;
      return;
    }
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  }

  updatePlayIcon(isPlaying) {
    if (this.bridge.holding) return; // la pausa de espera del audio no cambia el botón
    this.btnPlayPause.innerHTML = isPlaying ? NETFLIX_PLAYER_ICONS.pause : NETFLIX_PLAYER_ICONS.play;
  }

  /* ---------------- Audio convertido (Dolby / DTS) ---------------- */
  // El video se lee directo del archivo, como siempre. Si su audio no lo puede leer el
  // reproductor, el servidor lo convierte a AAC con ffmpeg desde el segundo pedido y suena
  // en un <audio> aparte. Al saltar se pide de nuevo desde el punto nuevo; el video espera
  // un instante a que llegue para que empiecen juntos.

  async loadAudioInfo(episode) {
    const b = this.bridge;
    const token = ++b.token;
    if (!episode.localPath) return;
    let info;
    try {
      info = await (await fetch(`/api/audio/info?localPath=${encodeURIComponent(episode.localPath)}`)).json();
    } catch { return; }
    if (token !== b.token || this.currentEpisode !== episode) return;

    b.tracks = info.tracks || [];
    if (!info.needsConversion) return; // el reproductor ya lo suena solo
    const main = b.tracks.find(t => t.n === info.defaultTrack) || b.tracks[0];
    if (!info.ffmpeg) {
      this.showOsd(`Audio ${main ? main.codecName : ''} no compatible: instala ffmpeg para oírlo`);
      return;
    }

    // Idioma elegido la última vez (p. ej. siempre en inglés), si este video lo tiene
    let pref = null;
    try { pref = localStorage.getItem('hiy-audio-lang'); } catch { /* sin almacenamiento */ }
    const preferred = pref && b.tracks.find(t => t.lang === pref);
    b.track = (preferred || main).n;
    b.active = true;
    this.bridgeSyncSettings();
    this.bridgeStart(this.video.currentTime);
    this.renderAudioMenu();
    clearInterval(b.timer);
    b.timer = setInterval(() => this.bridgeCheckDrift(), 1000);
  }

  bridgePosition() {
    return this.bridge.base + this.bridge.el.currentTime;
  }

  // Pide el audio desde "at" segundos. Si el video estaba sonando, lo detiene hasta que llega.
  bridgeStart(at) {
    const b = this.bridge;
    if (!b.active || !this.currentEpisode) return;
    const token = ++b.token;
    const wasPlaying = b.holding ? b.resumeAfterHold : !this.video.paused;

    b.el.pause();
    b.base = at;
    b.el.src = `/api/audio/stream?localPath=${encodeURIComponent(this.currentEpisode.localPath)}&track=${b.track}&start=${at.toFixed(2)}`;
    this.bridgeSyncSettings();
    if (!wasPlaying) {
      b.holding = false;
      return;
    }

    b.holding = true;
    b.resumeAfterHold = true;
    this.video.pause();
    const go = () => {
      if (token !== b.token) return;
      b.el.removeEventListener('canplay', go);
      clearTimeout(fallback);
      const resume = b.resumeAfterHold;
      b.holding = false;
      if (resume) {
        b.el.play().catch(() => {});
        this.video.play().catch(() => {});
      } else {
        this.updatePlayIcon(false);
      }
    };
    b.el.addEventListener('canplay', go);
    // Si el audio tarda demasiado, seguir con el video igual (no dejarlo congelado)
    const fallback = setTimeout(go, 6000);
  }

  bridgeOnPlay() {
    const b = this.bridge;
    if (!b.active || b.holding) return;
    if (!b.el.getAttribute('src') || Math.abs(this.bridgePosition() - this.video.currentTime) > 0.35) {
      this.bridgeStart(this.video.currentTime);
    } else {
      b.el.play().catch(() => {});
    }
  }

  bridgeOnPause() {
    if (this.bridge.active && !this.bridge.holding) this.bridge.el.pause();
  }

  // Corrige el desfase: poco → acelera o frena el audio apenas; mucho → lo pide de nuevo
  bridgeCheckDrift() {
    const b = this.bridge;
    if (!b.active || b.holding || this.video.paused || b.el.paused) return;
    const drift = this.bridgePosition() - this.video.currentTime;
    if (Math.abs(drift) > 0.5) {
      this.bridgeStart(this.video.currentTime);
      return;
    }
    const rate = this.video.playbackRate;
    b.el.playbackRate = Math.abs(drift) < 0.06 ? rate : rate * (drift > 0 ? 0.96 : 1.04);
  }

  bridgeSyncSettings() {
    const el = this.bridge.el;
    el.volume = this.video.volume;
    el.muted = this.video.muted;
    el.playbackRate = this.video.playbackRate;
  }

  bridgeReset() {
    const b = this.bridge;
    b.token++;
    b.active = false;
    b.holding = false;
    b.tracks = [];
    clearInterval(b.timer);
    b.el.pause();
    if (b.el.getAttribute('src')) {
      b.el.removeAttribute('src');
      b.el.load(); // corta la conexión: el servidor detiene ffmpeg
    }
    this.toggleAudioMenu(false);
    if (this.audioContainer) this.audioContainer.hidden = true;
  }

  selectAudioTrack(n) {
    const b = this.bridge;
    const t = b.tracks.find(x => x.n === n);
    if (!t) return;
    this.toggleAudioMenu(false);
    if (n === b.track) return;
    b.track = n;
    try { if (t.lang) localStorage.setItem('hiy-audio-lang', t.lang); } catch { /* sin almacenamiento */ }
    this.showOsd(`Audio: ${t.label}`);
    this.bridgeStart(this.video.currentTime);
    this.renderAudioMenu();
  }

  toggleAudioMenu(force) {
    if (!this.audioMenu) return;
    this.audioMenuOpen = typeof force === 'boolean' ? force : !this.audioMenuOpen;
    if (this.audioMenuOpen) {
      this.toggleSubsMenu(false);
      this.renderAudioMenu();
    }
    this.audioMenu.classList.toggle('show', this.audioMenuOpen);
    this.btnAudio.setAttribute('aria-expanded', String(this.audioMenuOpen));
  }

  renderAudioMenu() {
    if (!this.audioContainer) return;
    const b = this.bridge;
    // El botón solo aparece si hay más de una pista para elegir
    this.audioContainer.hidden = !(b.active && b.tracks.length > 1);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.audioMenu.innerHTML = `<h4>Audio</h4>` + b.tracks.map(t => {
      const on = t.n === b.track;
      return `<button class="subs-item" data-audio="${t.n}" role="menuitemradio" aria-checked="${on}"><span class="subs-check">${on ? '✓' : ''}</span><span>${esc(t.label)}<small>${esc(t.codecName)}</small></span></button>`;
    }).join('');
  }

  skip(seconds) {
    // Si el video aún no cargó su duración no hacer nada (antes lo mandaba al segundo 0)
    if (!isFinite(this.video.duration)) return;
    const from = this.video.currentTime;
    const target = Math.min(Math.max(0, from + seconds), this.video.duration);
    // Al fotograma clave más cercano (el salto queda en ~10 s), sin ir en la dirección contraria
    const snapped = this.snapToKeyframe(target, 'nearest');
    const ok = seconds > 0 ? snapped > from + 1 : snapped < from - 1;
    this.video.currentTime = ok ? snapped : target;
    this.showSkip(seconds);
  }

  seek(e) {
    const rect = this.progressBarWrap.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (this.video.duration) {
      // La miniatura pendiente ya no hace falta: que el disco quede para el salto
      clearTimeout(this.scrubRestTimer);
      this.scrubWanted = null;
      this.video.currentTime = this.snapToKeyframe(pos * this.video.duration, 'before');
      // La barra y el tiempo se mueven ya, sin esperar al 'timeupdate' de cuando termine el salto
      this.progressFilled.style.width = `${(this.video.currentTime / this.video.duration) * 100}%`;
      this.currentTimeDisplay.textContent = this.formatTime(this.video.currentTime);
    }
  }

  // El video principal está saltando o esperando datos. Mientras tanto la miniatura no salta:
  // las dos leían el mismo archivo del disco y decodificaban a la vez (con AV1 eso lo hace la
  // CPU), y cada salto tardaba más del doble y el video se quedaba esperando.
  mainVideoBusy() {
    // En pausa no consume nada (si no, tras un salto en pausa la miniatura podía no volver)
    return this.video.seeking || (this.video.readyState < 3 && !this.video.paused);
  }

  resumeScrub() {
    if (this.scrubWanted && !this.scrubBusy && this.scrubVideo && this.scrubVideo.readyState >= 1 && !this.mainVideoBusy()) {
      this.scrubSeek();
    }
  }

  /* ---------------- Miniatura en la barra ---------------- */
  // Un segundo <video>, oculto y sin sonido, con el mismo episodio salta al punto que está
  // bajo el mouse y su imagen se dibuja sobre la barra. Salta al fotograma clave anterior
  // (~20–40 ms por imagen) y cada imagen se guarda para mostrarla al instante otra vez.

  resetScrubPreview(src) {
    this.scrubGen = (this.scrubGen || 0) + 1; // invalida las capturas del episodio anterior
    clearTimeout(this.scrubTimer);
    clearTimeout(this.scrubRestTimer);
    this.scrubCache.forEach(bmp => bmp.close());
    this.scrubCache.clear();
    this.scrubBusy = false;
    this.scrubWanted = null;
    this.scrubKey = null;
    this.scrubPreview.classList.remove('show');
    this.scrubPreview.classList.add('no-frame');
    if (this.scrubVideo) {
      this.scrubVideo.removeAttribute('src');
      this.scrubVideo.load();
    }
    if (!src) return;
    if (!this.scrubVideo) {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.preload = 'metadata'; // solo lee lo que hace falta para cada imagen
      v.addEventListener('loadedmetadata', () => this.resumeScrub());
      v.addEventListener('seeked', () => this.onScrubSeeked());
      this.scrubVideo = v;
    }
    this.scrubVideo.src = src;
  }

  showScrubPreview(e) {
    const dur = this.video.duration;
    if (!isFinite(dur) || !dur || !this.scrubVideo) return;
    const rect = this.progressBarWrap.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const time = pos * dur;

    // Centrada sobre el mouse, sin salirse por los lados de la barra
    const half = (this.scrubPreview.offsetWidth || 196) / 2;
    this.scrubPreview.style.left = `${Math.min(rect.width - half, Math.max(half, pos * rect.width))}px`;
    this.scrubTime.textContent = this.formatTime(time);
    this.scrubPreview.classList.add('show');

    // Sin fotogramas clave conocidos, una imagen cada 2 s (para poder reutilizarlas)
    const target = this.keyframes ? this.snapToKeyframe(time, 'before') : Math.round(time / 2) * 2;
    const key = Math.round(target * 10) / 10;
    this.scrubKey = key;
    const cached = this.scrubCache.get(key);
    clearTimeout(this.scrubRestTimer);
    if (cached) {
      this.scrubWanted = null;
      this.drawScrub(cached, cached.width, cached.height);
      return;
    }
    // Se pide la imagen cuando el mouse se detiene. Saltar con cada movimiento leía del disco
    // un trozo del video por salto (40 movimientos = ~4,5 min de video) y, si justo se hacía
    // clic, el salto del video principal tenía que esperar a ese.
    this.scrubWanted = { key, time: target };
    this.scrubRestTimer = setTimeout(() => this.resumeScrub(), SCRUB_REST_MS);
  }

  // Salta el video oculto al último punto pedido (los intermedios se descartan)
  scrubSeek() {
    const wanted = this.scrubWanted;
    this.scrubWanted = null;
    if (!wanted) return;
    this.scrubBusy = true;
    this.scrubInFlight = wanted;
    this.scrubVideo.currentTime = Math.min(wanted.time, Math.max(0, this.scrubVideo.duration - 0.1));
    // Por si el navegador no llega a avisar (video ilegible): no quedarse bloqueado
    clearTimeout(this.scrubTimer);
    this.scrubTimer = setTimeout(() => this.finishScrubSeek(), 3000);
  }

  onScrubSeeked() {
    const v = this.scrubVideo;
    const wanted = this.scrubInFlight;
    const gen = this.scrubGen;
    if (wanted && v.videoWidth) {
      const w = this.scrubFrame.width;
      const h = Math.round(w * v.videoHeight / v.videoWidth);
      // Se dibuja si es el punto bajo el mouse o si ese punto aún no tiene imagen (al mover
      // el mouse rápido, mejor la imagen más reciente que una congelada). Y se guarda.
      if (wanted.key === this.scrubKey || !this.scrubCache.has(this.scrubKey)) this.drawScrub(v, w, h);
      createImageBitmap(v, { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' })
        .then(bmp => {
          if (gen !== this.scrubGen) return bmp.close(); // ya es otro episodio
          if (this.scrubCache.size >= 400) { // ~400 imágenes de 192 px: unos 30 MB como mucho
            const [oldKey, old] = this.scrubCache.entries().next().value;
            old.close();
            this.scrubCache.delete(oldKey);
          }
          this.scrubCache.set(wanted.key, bmp);
        })
        .catch(() => { /* video de otro sitio: se muestra pero no se guarda */ });
    }
    this.finishScrubSeek();
  }

  finishScrubSeek() {
    clearTimeout(this.scrubTimer);
    this.scrubBusy = false;
    this.resumeScrub();
  }

  drawScrub(source, w, h) {
    if (this.scrubFrame.height !== h) this.scrubFrame.height = h;
    this.scrubFrame.getContext('2d').drawImage(source, 0, 0, w, h);
    this.scrubPreview.classList.remove('no-frame');
  }

  /* ---------------- Fotogramas clave ---------------- */
  // Saltar a un punto cualquiera obliga a decodificar desde el fotograma clave anterior
  // (≈1 s con video de 60 fps); caer justo en uno muestra la imagen en ~20 ms.
  // El servidor da sus tiempos leyendo el índice del MP4 (ver keyframes.js).

  async loadKeyframes(episode) {
    this.keyframes = null;
    if (!episode.localPath) return;
    try {
      const res = await fetch(`/api/keyframes?episodeId=${encodeURIComponent(episode.id)}`);
      if (!res.ok) return;
      const { keyframes } = await res.json();
      if (this.currentEpisode === episode) this.keyframes = keyframes;
    } catch {
      /* sin fotogramas clave: los saltos van al punto exacto, como siempre */
    }
  }

  // 'before': el fotograma clave anterior (no se salta nada de lo que se eligió ver).
  // 'nearest': el más cercano. Si queda muy lejos (más de 8 s antes o 3 s alrededor),
  // se usa el punto exacto.
  snapToKeyframe(time, mode) {
    const k = this.keyframes;
    if (!k || !k.length) return time;
    let lo = 0, hi = k.length - 1;
    while (lo < hi) { // último fotograma clave <= time
      const mid = (lo + hi + 1) >> 1;
      if (k[mid] <= time) lo = mid; else hi = mid - 1;
    }
    let best = k[lo] <= time ? k[lo] : k[0];
    if (mode === 'nearest' && k[lo + 1] !== undefined && k[lo + 1] - time < time - best) best = k[lo + 1];
    if (Math.abs(best - time) > (mode === 'before' ? 8 : 3)) return time;
    // +10 ms: dentro del propio fotograma clave (a 60 fps cada fotograma dura 16,7 ms)
    return best + 0.01;
  }

  onTimeUpdate() {
    if (!this.video.duration) return;
    const cur = this.video.currentTime;
    const dur = this.video.duration;
    const pct = (cur / dur) * 100;

    this.progressFilled.style.width = `${pct}%`;
    this.currentTimeDisplay.textContent = this.formatTime(cur);

    // Guardar el progreso cada 5 segundos. 'timeupdate' llega ~4 veces por segundo:
    // sin recordar el último segundo guardado, se enviaban ~4 guardados seguidos.
    const sec = Math.floor(cur);
    if (sec % 5 === 0 && sec !== this.lastSavedSecond && this.currentEpisode) {
      this.lastSavedSecond = sec;
      this.saveProgress(cur, dur);
    }
  }

  onMetadataLoaded() {
    this.durationDisplay.textContent = this.formatTime(this.video.duration || 0);
  }

  onEnded() {
    this.saveProgress(this.video.duration, this.video.duration);
    // Configuración → Reproducción: "Reproducir el siguiente episodio" desactivado
    const pb = window.app && window.app.settings && window.app.settings.playback;
    if (pb && pb.autoplayNext === false) {
      this.showOsd('Episodio terminado · N para el siguiente');
      return;
    }
    if (window.app && window.app.playNextEpisode) {
      window.app.playNextEpisode(this.currentSeries, this.currentEpisode);
    }
  }

  saveProgress(cur, dur) {
    if (!this.currentEpisode) return;
    const data = {
      episodeId: this.currentEpisode.id,
      seriesId: this.currentSeries ? this.currentSeries.id : null,
      currentTime: cur,
      duration: dur
    };

    // Store in localStorage
    localStorage.setItem(`prog_${this.currentEpisode.id}`, JSON.stringify(data));

    // Avisar a la app: si no, "Continuar viendo" y reanudar desde la ficha usaban el
    // progreso de cuando se abrió la app (mismo formato que devuelve /api/progress)
    if (window.app && window.app.progressMap) {
      window.app.progressMap[data.episodeId] = {
        currentTime: cur,
        duration: dur,
        percentage: Math.round((cur / dur) * 100) || 0,
        updatedAt: new Date().toISOString()
      };
    }

    // Store in Server API
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error('Save progress error:', err));
  }

  updateVolumeIcon() {
    const isMuted = this.video.muted || this.video.volume === 0;
    if (isMuted) {
      this.btnMute.innerHTML = NETFLIX_PLAYER_ICONS.volumeMute;
      this.btnMute.setAttribute('title', 'Reactivar audio (M) · Volumen (↑ ↓)');
    } else if (this.video.volume < 0.5) {
      this.btnMute.innerHTML = NETFLIX_PLAYER_ICONS.volumeLow;
      this.btnMute.setAttribute('title', 'Silenciar (M) · Volumen (↑ ↓)');
    } else {
      this.btnMute.innerHTML = NETFLIX_PLAYER_ICONS.volumeHigh;
      this.btnMute.setAttribute('title', 'Silenciar (M) · Volumen (↑ ↓)');
    }
    this.updateVolumeSliderStyle();
  }

  updateVolumeSliderStyle() {
    if (!this.volumeSlider) return;
    const isMuted = this.video.muted || this.video.volume === 0;
    const val = isMuted ? 0 : this.video.volume;
    const pct = Math.round(val * 100);
    this.volumeSlider.style.background = `linear-gradient(to right, #E50914 0%, #E50914 ${pct}%, rgba(255, 255, 255, 0.28) ${pct}%, rgba(255, 255, 255, 0.28) 100%)`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.overlay.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }

  close() {
    if (this.video) {
      this.saveProgress(this.video.currentTime, this.video.duration);
      this.video.pause();
    }
    this.bridgeReset();
    this.overlay.classList.remove('active');
    this.toggleHelp(false);
    this.toggleSubsMenu(false);
    this.resetScrubPreview(null); // suelta el video oculto
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
    // Actualizar "Continuar viendo" con lo que se acaba de ver
    if (window.app && window.app.renderContinueWatching) window.app.renderContinueWatching();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.player = new NetflixPlayer();
});
