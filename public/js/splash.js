/* ==========================================================================
   PANTALLA DE CARGA
   Arma el logo animado dentro de <div class="splash" id="splash">. Se carga justo
   después de ese div (sin defer) para que se vea desde el primer cuadro.
   La app llama a window.hiySplash.done() cuando el catálogo ya está dibujado.
   ========================================================================== */
(function () {
  const root = document.getElementById('splash');
  if (!root) return;

  // ?splash=1 → venimos de splash.html (Electron), donde la entrada ya se vio
  const params = new URLSearchParams(location.search);
  const settled = params.has('splash');
  if (settled) {
    root.classList.add('is-settled');
    params.delete('splash');
    const qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
  }

  // Mismo dibujo que el logo de la barra de navegación, separado por letras
  const glyphs = [
    'M0 0v30h9.22V0H0zM22.5 0H9.22v30H22.5V0z',
    'M54.34 13.06h-9.92V0H31.14v30h13.28v-11.4h9.92v11.4h13.28V0H54.34v13.06z',
    'M72.04 0h13.3v30h-13.3V0z',
    'M105.062 14.28L111 30H101.46L98.54 22.02H98.34L95.5 30H86L91.94 14.28V0h13.122v14.28z'
  ];
  const word = 'SERIES'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('');

  root.setAttribute('role', 'status');
  root.setAttribute('aria-label', 'Cargando HIY Series');
  root.innerHTML = `
    <div class="splash-inner">
      <div class="splash-logo">
        <svg viewBox="0 0 111 30" aria-hidden="true">
          <defs>
            <clipPath id="splashClip">${glyphs.map(d => `<path d="${d}"/>`).join('')}</clipPath>
            <linearGradient id="splashShine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stop-color="#fff" stop-opacity="0"/>
              <stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/>
              <stop offset="1" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${glyphs.map(d => `<path class="splash-glyph" d="${d}"/>`).join('')}
          <g clip-path="url(#splashClip)">
            <g transform="skewX(-20)">
              <rect class="splash-shine" x="-40" y="-5" width="34" height="40" fill="url(#splashShine)"/>
            </g>
          </g>
        </svg>
        <div class="splash-word">${word}</div>
      </div>
      <div class="splash-bar"></div>
    </div>`;

  // La entrada dura ~1,9 s: aunque el catálogo cargue antes, se deja terminar
  const INTRO_MS = settled ? 0 : 1900;
  const start = performance.now();
  let leaving = false;

  function leave() {
    if (leaving) return;
    leaving = true;
    root.classList.add('is-leaving');
    setTimeout(() => root.remove(), 800);
  }

  window.hiySplash = {
    done() {
      setTimeout(leave, Math.max(0, INTRO_MS - (performance.now() - start)));
    },
    // Avance de 0 a 1 (pósters cargados): la barra pasa de animada a llenarse
    progress(p) {
      root.classList.add('has-progress');
      root.style.setProperty('--p', Math.max(0, Math.min(1, p)));
    }
  };

  // Por si algo falla al cargar: nunca dejar la app tapada
  setTimeout(leave, 20000);
})();
