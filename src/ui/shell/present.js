import { state, commit } from '../../core/store.js';
import { session } from '../../core/session.js';
import { buildHTML } from '../../io/formats/html.js';
import { t } from '../../i18n/index.js';
import { confirmDialog } from '../dialogs/dialog.js';

// Present inside a full‑screen overlay in this same page. Because the click on
// "Presentar" is a user gesture in this document, requestFullscreen() is allowed
// here (a freshly opened tab cannot go full screen on its own). The deck loads
// from a blob URL so reveal.js keeps working history/hash and the speaker view.
// rehearse: PowerPoint's "Rehearse Timings" — time each slide while presenting
// (without the current auto-advance), then offer to save the times as each
// slide's auto-advance.
export function present({ rehearse = false, fullscreen = true, onEnd = null } = {}) {
  const deck = rehearse ? { ...state.deck, slides: state.deck.slides.map(s => ({ ...s, autoSlide: 0 })) } : state.deck;
  const url = URL.createObjectURL(new Blob([buildHTML(deck, { inApp: true })], { type: 'text/html' }));

  const overlay = document.createElement('div');
  overlay.id = 'present-overlay';
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.allow = 'fullscreen; autoplay; xr-spatial-tracking; clipboard-write; camera; microphone';
  overlay.appendChild(frame);

  const close = document.createElement('button');
  close.id = 'present-close'; close.title = t('Salir (Esc)'); close.textContent = '✕';
  overlay.appendChild(close);
  document.body.appendChild(overlay);

  // Rehearsal clock: time on the current slide and total.
  const times = [], t0 = performance.now(); let cur = 0, since = t0, clock = null, tick = null;
  if (rehearse) {
    clock = document.createElement('div'); clock.id = 'rehearse-clock'; overlay.appendChild(clock);
    const fmt = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    tick = setInterval(() => { const n = performance.now(); clock.textContent = `${fmt(n - since)} · ${t('Total')} ${fmt(n - t0)}`; }, 250);
  }
  const lap = next => { const n = performance.now(); times[cur] = (times[cur] || 0) + (n - since); since = n; cur = next; };
  session.present = { frame, overlay, rehearse, times, lap };
  const notifySlide = () => window.dispatchEvent(new CustomEvent('revela:present-slide'));
  const end = () => {
    clearInterval(hook);
    if (rehearse) { clearInterval(tick); lap(cur); offerRehearsal(times); }
    onEnd?.();
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('keydown', onKey);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    overlay.remove();
    URL.revokeObjectURL(url);
    session.present = null; notifySlide();
  };
  const onFs = () => { if (!document.fullscreenElement) end(); };
  const onKey = e => { if (e.key === 'Escape') end(); };
  close.addEventListener('click', end);
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('keydown', onKey);

  // Once reveal.js has initialised inside the frame, relay its slide changes so
  // the phone remote (if connected) can follow along.
  let tries = 0;
  const hook = setInterval(() => {
    const Rv = frame.contentWindow?.Reveal;
    if (Rv && Rv.isReady?.()) {
      clearInterval(hook); Rv.on('slidechanged', notifySlide); notifySlide();
      if (rehearse) Rv.on('slidechanged', () => lap(Rv.getSlidePastCount()));
    }
    else if (++tries > 60) clearInterval(hook);
  }, 100);

  // Try true OS full screen; if the browser blocks it, the overlay still covers
  // the whole viewport so the presentation fills the window either way.
  if (fullscreen) Promise.resolve(overlay.requestFullscreen?.()).catch(() => {});
  frame.focus();
}

// Save rehearsed times (visible slides, in order) as each slide's auto-advance.
export function applyRehearsal(times, deck = state.deck) {
  const vis = deck.slides.filter(s => !s.hidden);
  commit(() => vis.forEach((s, i) => { if (times[i] > 0) s.autoSlide = Math.max(1000, Math.round(times[i] / 1000) * 1000); }));
}
function offerRehearsal(times) {
  const total = Math.round(times.reduce((a, b) => a + (b || 0), 0) / 1000);
  if (!total) return;
  confirmDialog(t('Tiempo total de la presentación: ') + `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}. `
    + t('¿Guardar los intervalos para que las diapositivas avancen solas?')).then(ok => { if (ok) applyRehearsal(times); });
}
