import { state, commit } from '../../core/store.js';
import { slidePaths } from '../../features/document/captions.js';
import { session } from '../../core/session.js';
import { buildHTML } from '../../io/formats/html.js';
import { t } from '../../i18n/index.js';
import { confirmDialog, alertDialog } from '../dialogs/dialog.js';

// Present inside a full‑screen overlay in this same page. Because the click on
// "Presentar" is a user gesture in this document, requestFullscreen() is allowed
// here (a freshly opened tab cannot go full screen on its own). The deck loads
// from a blob URL so reveal.js keeps working history/hash and the speaker view.
// rehearse: PowerPoint's "Rehearse Timings" — time each slide while presenting
// (without the current auto-advance), then offer to save the times as each
// slide's auto-advance.
// onRehearsal(times): what to do with the times instead of offering to save them.
// fromCurrent: start at the slide being edited (PowerPoint's "From current slide").
// selfPaced: the quizzes and activities are answered inside the slides (see
// io/runtime/selfpaced.js); answer(pollId, answer) → Promise<{ score, sent }> marks
// them elsewhere (the server, for a learning platform), else they're marked here.
export function present({ rehearse = false, fullscreen = true, onEnd = null, onRehearsal = null, fromCurrent = false, selfPaced = false, answer = null } = {}) {
  const startAt = fromCurrent ? slidePaths(state.deck).get(state.ui.slideIndex) : null;
  const deck = rehearse ? { ...state.deck, slides: state.deck.slides.map(s => ({ ...s, autoSlide: 0 })) } : state.deck;
  window.__revelaAnswer = selfPaced && answer ? answer : undefined;
  const url = URL.createObjectURL(new Blob([buildHTML(deck, { inApp: true, selfPaced })], { type: 'text/html' }));

  const opener = document.activeElement;                  // (where the focus goes back to)
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
  session.present = { frame, overlay, rehearse, times, lap, current: () => cur };
  const notifySlide = () => window.dispatchEvent(new CustomEvent('revela:present-slide'));
  const end = () => {
    clearInterval(hook);
    if (rehearse) { clearInterval(tick); lap(cur); (onRehearsal || offerRehearsal)(times); }
    onEnd?.();
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('keydown', onKey);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    overlay.remove();
    URL.revokeObjectURL(url);
    // Back to the editor: the button that started it, else the Present button, else the stage.
    const back = [opener, document.querySelector('.tb-play [data-action="present"]'), document.getElementById('stage')]
      .find(el => el && el !== document.body && el.isConnected && el.offsetParent !== null);
    if (back) { if (!back.matches('button, input, select, textarea, a[href], [tabindex]')) back.tabIndex = -1; back.focus({ preventScroll: true }); }
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
      clearInterval(hook); Rv.on('slidechanged', notifySlide);
      if (startAt) { const [h, v] = startAt.split('/').map(Number); Rv.slide(h, v); }
      notifySlide();
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

// Present in a video call (Google Meet, Microsoft Teams, Zoom…): the
// presentation in a window of its own, to choose as "a window" when sharing,
// while this tab stays free (notes, the phone remote…).
export function presentInWindow(deck = state.deck) {
  const url = URL.createObjectURL(new Blob([buildHTML(deck, { inApp: true })], { type: 'text/html' }));
  const w = window.open(url, 'revela-present', 'popup,width=1280,height=760');
  if (!w) { URL.revokeObjectURL(url); return null; }
  const done = setInterval(() => { if (w.closed) { clearInterval(done); URL.revokeObjectURL(url); } }, 2000);
  w.focus();
  return w;
}
export function openCallPresent() {
  document.getElementById('call-modal')?.remove();
  const back = document.createElement('div'); back.id = 'call-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:min(360px,94vw);max-width:min(560px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Presentar en una videollamada')}</h3>
    <p class="host-help">${t('La presentación se abre en una ventana aparte. En la llamada, comparte esa ventana: así los demás ven solo las diapositivas y tú sigues teniendo Revela a mano.')}</p>
    <ol class="call-steps">
      <li><b>Google Meet:</b> ${t('Presentar ahora ▸ Una ventana ▸ elige la de tu presentación.')}</li>
      <li><b>Microsoft Teams:</b> ${t('Compartir ▸ Ventana ▸ elige la de tu presentación.')}</li>
      <li><b>Zoom:</b> ${t('Compartir pantalla ▸ elige la ventana de tu presentación.')}</li>
    </ol>
    <p class="host-help">${t('Pasa las diapositivas con las flechas en esa ventana. Pulsa S allí para abrir las notas del orador en otra ventana, que no compartes.')}</p>
    <div class="fr-actions"><span></span><button class="fr-do call-open"><i class="ms">open_in_new</i> ${t('Abrir la ventana de presentación')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.call-open').addEventListener('click', () => {
    if (presentInWindow()) close();
    else alertDialog(t('El navegador ha bloqueado la ventana: permite las ventanas emergentes de este sitio y vuelve a intentarlo.'));
  });
}
