/* ==========================================================================
   DESPLAZAMIENTO SUAVE CON LA RUEDA DEL MOUSE
   La rueda mueve a saltos fijos (~100 px por "clic"). Aquí cada clic suma a un destino
   y la posición se acerca a él cuadro a cuadro, así varios clics seguidos se encadenan
   en un solo movimiento fluido.
     - Página y paneles con scroll (fichas, modales): vertical. La rueda siempre baja la
       página aunque el mouse pase por encima de una fila (antes la fila "atrapaba" la
       rueda y se movían las series de lado según dónde quedara el puntero).
     - Filas de tarjetas (.row-cards): Shift + rueda las mueve en horizontal.
   No se toca: touchpads (ya son suaves), Ctrl + rueda (zoom), el reproductor y los
   controles que usan la rueda por su cuenta.
   ========================================================================== */

(() => {
  // Fracción del camino que se recorre en cada cuadro de 60 fps (más alto = más rápido)
  const EASE = 0.16;
  const LINE_PX = 40;
  const SKIP = '.player-overlay, input[type="range"], select, textarea, [data-native-scroll]';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.scrollingElement || document.documentElement;
  const anims = new Map(); // "elemento|eje" → { el, axis, pos, target, last, raf }

  // La rueda clásica manda saltos grandes y enteros; el touchpad, muchos deltas pequeños
  function isMouseWheel(e) {
    if (e.deltaMode !== 0) return true;
    return Math.abs(e.deltaY) >= 40 && Math.abs(e.deltaX) < 1;
  }

  const maxScroll = (el, axis) =>
    axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
  const getPos = (el, axis) => (axis === 'y' ? el.scrollTop : el.scrollLeft);

  function scrollable(el, axis) {
    if (el === root) {
      // Un modal abierto bloquea la página con overflow: hidden
      const blocked = [document.documentElement, document.body]
        .some(n => getComputedStyle(n)[axis === 'y' ? 'overflowY' : 'overflowX'] === 'hidden');
      return !blocked && maxScroll(el, axis) > 0;
    }
    const ov = getComputedStyle(el)[axis === 'y' ? 'overflowY' : 'overflowX'];
    return /(auto|scroll)/.test(ov) && maxScroll(el, axis) > 0;
  }

  // ¿Puede moverse más en esa dirección? (cuenta lo que falta de una animación en curso)
  function hasRoom(el, axis, dir) {
    const a = anims.get(el);
    const pos = a && a.axis === axis ? a.target : getPos(el, axis);
    return dir < 0 ? pos > 0.5 : pos < maxScroll(el, axis) - 0.5;
  }

  // Elemento que debe moverse en vertical, desde donde está el mouse hacia arriba.
  // Con una ventana abierta (ficha de la serie, editor...) solo se busca dentro de ella:
  // al llegar al final de los capítulos la página de atrás ya no se mueve
  function findTarget(start, dir, modal) {
    if (modal && !modal.contains(start)) start = modal;
    for (let el = start; el && el !== document; el = el.parentElement) {
      if (el === document.body || el === document.documentElement || el === modal) break;
      if (scrollable(el, 'y') && hasRoom(el, 'y', dir)) return { el, axis: 'y' };
    }
    if (modal) return null;
    return scrollable(root, 'y') && hasRoom(root, 'y', dir) ? { el: root, axis: 'y' } : null;
  }

  function animate(el, axis, delta) {
    let a = anims.get(el);
    if (!a || a.axis !== axis) {
      if (a) cancelAnimationFrame(a.raf);
      const pos = getPos(el, axis);
      a = { el, axis, pos, target: pos, last: pos, raf: 0, time: 0 };
      anims.set(el, a);
    }
    a.target = Math.max(0, Math.min(maxScroll(el, axis), a.target + delta));
    if (a.raf) return;

    a.time = performance.now();
    const step = (now) => {
      // Si algo más movió el scroll (barra, teclado, scrollIntoView), se le cede el control
      if (Math.abs(getPos(el, axis) - a.last) > 2) {
        anims.delete(el);
        return;
      }
      // Igual de rápido a 60 o a 144 Hz
      const k = 1 - Math.pow(1 - EASE, (now - a.time) / (1000 / 60));
      a.time = now;
      a.pos += (a.target - a.pos) * k;
      if (Math.abs(a.target - a.pos) < 0.5) a.pos = a.target;
      // 'instant' evita que el scroll-behavior: smooth del CSS anime cada cuadro por su cuenta
      el.scrollTo({ [axis === 'y' ? 'top' : 'left']: a.pos, behavior: 'instant' });
      a.last = getPos(el, axis);
      if (a.pos === a.target) {
        anims.delete(el);
        return;
      }
      a.raf = requestAnimationFrame(step);
    };
    a.raf = requestAnimationFrame(step);
  }

  // Shift + rueda sobre una fila: moverla de lado, con el mismo movimiento suave.
  // (Según el sistema, Chromium entrega Shift + rueda como deltaX o como deltaY)
  function shiftWheelOnRow(e) {
    const row = e.target.closest && e.target.closest('.row-cards');
    if (!row) return;
    let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) delta *= LINE_PX;
    else if (e.deltaMode === 2) delta *= row.clientWidth;
    if (!delta || !scrollable(row, 'x') || !hasRoom(row, 'x', Math.sign(delta))) return;
    e.preventDefault();
    animate(row, 'x', delta);
  }

  window.addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.ctrlKey) return;
    if (e.target.closest && e.target.closest(SKIP)) return;
    if (e.shiftKey) {
      shiftWheelOnRow(e);
      return;
    }
    const modal = document.querySelector('.modal.active');

    // Touchpad: ya es suave por sí solo (el gesto lateral mueve las filas de forma nativa).
    // Solo se frena cuando el gesto movería la página que está detrás de una ventana
    if (!isMouseWheel(e)) {
      if (modal && Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
          !findTarget(e.target, Math.sign(e.deltaY), modal)) {
        e.preventDefault();
      }
      return;
    }

    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= LINE_PX;
    else if (e.deltaMode === 2) delta *= root.clientHeight;
    const target = findTarget(e.target, Math.sign(delta), modal);
    if (!target) {
      // Ventana abierta y nada que mover dentro: no dejar que la rueda llegue a la página
      if (modal) e.preventDefault();
      return;
    }

    e.preventDefault();
    animate(target.el, target.axis, delta);
  }, { passive: false });
})();
