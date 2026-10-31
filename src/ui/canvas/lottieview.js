// A Lottie object in the editor: lottie-web's light build (loaded the first time one is on a slide) draws it into its box.
// It plays in a loop (once, if it doesn't loop) unless it is set to «al hacer clic» — then its still picture — or «Reducir
// movimiento» is on (then that too, with the badge that says so). It waits while it is off screen, and takes its still
// picture once (the thumbnails, PowerPoint and the page before the player arrives use it).

import { loadScript, LOTTIE } from '../../core/vendor.js';
import { amend, currentSlide } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { fxRuntime, fxWords } from '../../io/runtime/fx.js';
import { lottieSafe, lottieOpts, lottieStillFrame } from '../../features/content/lottie.js';

const reduced = () => { const F = window.__rvFX; return F ? F.reduced() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
// What makes the picture the object's own: a new animation, colour or still frame takes a new one.
const posterSig = b => `${b.color || ''}|${b.still ?? ''}|${(b.lottie || '').length}`;

export function paintLottie(d, b) {
  d.style.cssText = 'width:100%;height:100%;position:relative;pointer-events:none';
  const data = lottieSafe(b);
  if (!data) {
    if (d._lot) { d._lot.destroy?.(); d._lot = null; }
    d._key = null; d.textContent = ''; d.classList.add('lottie-bad'); d.title = t('Esta animación no se puede mostrar.');
    return;
  }
  d.classList.remove('lottie-bad'); d.removeAttribute('title'); d._b = b;
  const key = b.lottie + '|' + (b.color || '');
  if (d._key !== key) {
    d._key = key; d._lot?.destroy?.(); d._lot = null; d.textContent = '';
    const gen = d._gen = (d._gen || 0) + 1;
    loadScript(LOTTIE, 'lottie').then(lot => {
      if (d._gen !== gen || d._lot) return;
      d._lot = lot.loadAnimation({ container: d, renderer: 'svg', loop: false, autoplay: false, animationData: JSON.parse(JSON.stringify(data)),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', hideOnTransparent: true } });
      d.querySelectorAll(':scope > svg').forEach(s => { s.style.pointerEvents = 'none'; s.setAttribute('aria-hidden', 'true'); });
      if (window.IntersectionObserver && !d._io) { d._io = new IntersectionObserver(es => { d._vis = es[es.length - 1].isIntersecting; settle(d); }); d._io.observe(d); }
      d._vis = d._vis !== false;
      settle(d, true);
    }).catch(() => {});
  } else settle(d);
}

// The player's state for the object's settings (and whether it is seen): the still picture, or playing.
function settle(d, fresh = false) {
  const lot = d._lot, b = d._b; if (!lot || !b) return;
  // (An object that left the page — another slide shown, deleted — stops: lottie keeps every animation running until told.)
  if (!d.isConnected && !fresh) { lot.destroy(); d._lot = null; d._key = null; d._io?.disconnect(); d._io = null; return; }
  const o = lottieOpts(b), data = lottieSafe(b); if (!data) return;
  const still = lottieStillFrame(b, data), rd = reduced(), sig = `${o.loop}|${o.speed}|${o.play}|${rd}|${b.still ?? ''}`;
  lot.setSpeed(o.speed); lot.loop = o.loop;
  const F = window.__rvFX || fxRuntime(fxWords(t));
  // (The badge goes on the object's own box: this one lets no pointer through, so that the object can be dragged.)
  if (rd !== d._rd) { d._rd = rd; F.mark(d.closest('.block') || d, rd ? [{ k: 'motion', why: t('Tu sistema tiene activado «Reducir movimiento»: las animaciones se muestran quietas.') }] : []); }
  if (rd || o.play === 'click') { if (d._sig !== sig || fresh) lot.goToAndStop(still, true); d._sig = sig; savePoster(d, still); return; }
  if (d._vis === false) { lot.pause(); return; }
  if (d._sig !== sig || fresh) { d._sig = sig; lot.goToAndPlay(0, true); } else lot.play();
  savePoster(d, still);
}

// The still picture, as an SVG, onto the object (once per look) — part of the step already there, not one of its own.
function savePoster(d, still) {
  const b = d._b, lot = d._lot, sig = b && posterSig(b);
  if (!b || !lot || (b.poster && b.psig === sig) || d._saving === sig || d._noPoster === sig) return;
  d._saving = sig;
  setTimeout(() => {
    try {
      const svg = d._lot === lot && d.querySelector(':scope > svg'); if (!svg || !d.isConnected) return;
      const cur = lot.currentFrame, playing = !lot.isPaused;
      lot.goToAndStop(still, true);
      let xml = new XMLSerializer().serializeToString(svg);
      if (!/xmlns=/.test(xml.slice(0, 200))) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      if (playing) lot.goToAndPlay(cur, true);
      if (xml.length > 150000) { d._noPoster = sig; return; }          // (too big to carry in the file: the page shows it without a picture before the player)
      const poster = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      amend(() => { const x = currentSlide()?.blocks.find(y => y.id === b.id); if (x && posterSig(x) === sig) { x.poster = poster; x.psig = sig; } });
    } catch {} finally { d._saving = null; }
  }, 60);
}
