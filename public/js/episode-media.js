/* ==========================================================================
   Miniaturas reales y vista previa de los episodios
   (separado de NetflixApp en app.js; no depende del estado de la app)
   ========================================================================== */

class EpisodeMedia {
  constructor() {
    this.thumbQueue = [];
    this.thumbFailed = new Set();
    this.thumbBusy = false;
    this.previewTimer = null;
    this.previewVideo = null;
  }

  // URL para reproducir un episodio (igual que el reproductor)
  streamUrl(ep) {
    if (ep.localPath) return `/api/stream?localPath=${encodeURIComponent(ep.localPath)}`;
    if (ep.videoUrl && !/^https?:\/\//i.test(ep.videoUrl)) return `/api/stream?file=${encodeURIComponent(ep.videoUrl)}`;
    return ep.videoUrl || null;
  }

  // Episodio local que aún no tiene una miniatura sacada de su propio video
  needsThumbnail(ep) {
    return !!ep.localPath && !String(ep.thumbnail || '').startsWith('/images/thumbs/');
  }

  // Captura las miniaturas de una en una (para no leer muchos videos a la vez)
  queueThumbnail(series, ep) {
    if (this.thumbFailed.has(ep.id) || this.thumbQueue.some(q => q.ep.id === ep.id)) return;
    this.thumbQueue.push({ series, ep });
    this.processThumbnailQueue();
  }

  // Descarta las miniaturas pendientes (la que se está capturando termina igual)
  clearThumbnailQueue() {
    this.thumbQueue.length = 0;
  }

  async processThumbnailQueue() {
    if (this.thumbBusy) return;
    this.thumbBusy = true;
    while (this.thumbQueue.length) {
      // Pausa entre capturas: deja terminar la animación de la ficha y no satura la app
      await new Promise(r => setTimeout(r, 400));
      if (!this.thumbQueue.length) break;
      const { series, ep } = this.thumbQueue.shift();
      if (!this.needsThumbnail(ep)) continue;
      try {
        const dataUrl = await this.captureVideoFrame(this.streamUrl(ep));
        const res = await fetch('/api/thumbnails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seriesId: series.id, episodeId: ep.id, dataUrl })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        ep.thumbnail = data.thumbnail;
        // Mostrar la miniatura nueva donde esté este episodio (ficha, Continuar Viendo...)
        document.querySelectorAll(`img[data-thumb-ep="${CSS.escape(ep.id)}"]`).forEach(img => {
          img.src = data.thumbnail;
          const loading = img.closest('.loading');
          if (loading) loading.classList.remove('loading');
        });
      } catch (err) {
        // Formato que el navegador no puede leer (p. ej. HEVC) o archivo inaccesible: se deja el banner
        console.warn(`Miniatura no disponible para "${ep.title}":`, err.message);
        this.thumbFailed.add(ep.id);
        document.querySelectorAll(`img[data-thumb-ep="${CSS.escape(ep.id)}"]`).forEach(img => {
          const loading = img.closest('.loading');
          if (loading) loading.classList.remove('loading');
        });
      }
    }
    this.thumbBusy = false;
  }

  /**
   * Abre el video en segundo plano, salta a ~15% del capítulo y captura ese fotograma.
   * Si sale casi negro (intro, fundido), prueba más adelante. Devuelve un data URL JPEG.
   */
  captureVideoFrame(src, width = 480) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error('sin video'));
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;
      const points = [0.15, 0.35, 0.6];
      let attempt = 0;

      const cleanup = () => {
        clearTimeout(timer);
        video.removeAttribute('src');
        video.load();
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error('tiempo agotado')); }, 20000);

      video.addEventListener('loadedmetadata', () => {
        const d = video.duration;
        video.currentTime = Number.isFinite(d) && d > 0 ? Math.min(d * points[0], d - 1) : 5;
      });
      video.addEventListener('seeked', () => {
        if (!video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.round(width * video.videoHeight / video.videoWidth);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // ¿Fotograma casi negro? Probar en otro punto del video
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        for (let i = 0; i < px.length; i += 160) sum += px[i] + px[i + 1] + px[i + 2];
        const brightness = sum / (px.length / 160) / 3;
        if (brightness < 18 && ++attempt < points.length && Number.isFinite(video.duration)) {
          video.currentTime = video.duration * points[attempt];
          return;
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        cleanup();
        resolve(dataUrl);
      });
      video.addEventListener('error', () => {
        cleanup();
        reject(new Error('el navegador no puede leer este video'));
      });
      video.src = src;
    });
  }

  /**
   * Empieza la vista previa tras un momento (para no cargar videos al pasar el mouse de largo).
   * opts.startAt: segundo desde el que reproducir (por defecto, el 30% del capítulo).
   * opts.before: elemento delante del cual colocar el video (p. ej. el texto de la tarjeta).
   */
  schedulePreview(wrapper, ep, opts = {}) {
    this.stopPreview();
    const src = this.streamUrl(ep);
    if (!src) return;
    this.previewTimer = setTimeout(() => {
      const video = document.createElement('video');
      video.className = 'ep-preview';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.addEventListener('loadedmetadata', () => {
        const d = video.duration;
        if (opts.startAt > 0 && (!Number.isFinite(d) || opts.startAt < d - 5)) {
          video.currentTime = opts.startAt; // desde donde se dejó
        } else if (Number.isFinite(d) && d > 20) {
          video.currentTime = d * 0.3;      // desde un punto intermedio del capítulo
        }
        video.play().catch(() => {});
      });
      video.addEventListener('playing', () => video.classList.add('visible'));
      video.addEventListener('error', () => this.stopPreview());
      video.src = src;
      if (opts.before && opts.before.parentNode === wrapper) wrapper.insertBefore(video, opts.before);
      else wrapper.appendChild(video);
      this.previewVideo = video;
    }, 550);
  }

  stopPreview() {
    clearTimeout(this.previewTimer);
    if (this.previewVideo) {
      this.previewVideo.pause();
      this.previewVideo.removeAttribute('src');
      this.previewVideo.load();
      this.previewVideo.remove();
      this.previewVideo = null;
    }
  }
}
