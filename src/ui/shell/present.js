import { state, commit } from '../../core/store.js';
import { deckIn } from '../../features/document/languages.js';
import { slidePaths } from '../../features/document/captions.js';
import { session } from '../../core/session.js';
import { buildHTML } from '../../io/formats/html.js';
import { attachLive } from './broadcast.js';
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
// lang: in another language of a multilingual presentation (features/document/languages.js).
export function present({ rehearse = false, fullscreen = true, onEnd = null, onRehearsal = null, fromCurrent = false, selfPaced = false, answer = null, live = null, lang = null } = {}) {
  const startAt = fromCurrent ? slidePaths(state.deck).get(state.ui.slideIndex) : null;
  const deck0 = lang ? deckIn(state.deck, lang) : state.deck;
  const deck = rehearse ? { ...deck0, slides: deck0.slides.map(s => ({ ...s, autoSlide: 0 })) } : deck0;
  window.__revelaAnswer = selfPaced && answer ? answer : undefined;
  const url = URL.createObjectURL(new Blob([buildHTML(deck, { inApp: true, selfPaced })], { type: 'text/html' }));

  const opener = document.activeElement;                  // (where the focus goes back to)
  const overlay = document.createElement('div');
  overlay.id = 'present-overlay';
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.allow = 'fullscreen; autoplay; xr-spatial-tracking; clipboard-write; camera; microphone';
  overlay.appendChild(frame);

  // (Top right, always findable: the speaker view — notes, the next slide, the time — and the way out.)
  const bar = document.createElement('div'); bar.id = 'present-bar';
  bar.innerHTML = `<button type="button" id="present-notes" title="${t('Vista del moderador: notas, siguiente diapositiva y tiempo (S)')}"><i class="ms">co_present</i><span>${t('Vista del moderador')}</span></button>`
    + `<button type="button" id="present-prompter" title="${t('Las notas de cada diapositiva, grandes y desplazándose solas, en una ventana aparte: ponla junto a la cámara al grabar o en una videollamada')}"><i class="ms">subtitles</i><span>${t('Apuntador')}</span></button>`
    + `<button type="button" id="present-close" title="${t('Salir (Esc)')}"><i class="ms">close</i><span>${t('Salir')}</span></button>`;
  const close = bar.querySelector('#present-close');
  bar.querySelector('#present-notes').addEventListener('click', () => { frame.contentWindow?.Reveal?.getPlugin?.('notes')?.open?.(); frame.focus(); });
  bar.querySelector('#present-prompter').addEventListener('click', () => { import('./prompter.js').then(m => m.openPrompter()); frame.focus(); });
  overlay.appendChild(bar);
  document.body.appendChild(overlay);
  // (A live broadcast — «Emitir en directo»: broadcast.js —: its room follows this presentation until it ends.)
  const stopLive = live ? attachLive(frame, live, overlay) : null;

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
    clearInterval(hook); stopLive?.();
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
      // (reveal.js's speaker view, which only speaks English: its words in the interface's language.)
      const W = frame.contentWindow, open0 = W.open.bind(W);
      W.open = (...args) => { const w = open0(...args); if (w) { translateSpeakerView(w); if (session.present) session.present.speaker = w; } return w; };
      // (Esc inside the slides — where the keys go —: out of the overview first, then out of the presentation,
      // also without full screen, where the browser doesn't take it.)
      // (The top bar stays out of sight while presenting: it shows only with the pointer brought to the top
      // right corner on purpose — or a tap there, or the keyboard —, and goes again two seconds later.)
      let hideT = 0;
      const near = (x, y) => y < 110 && x > W.innerWidth - 460;
      const showBar = on => { clearTimeout(hideT); bar.classList.toggle('show', on); if (on) hideT = setTimeout(() => bar.matches(':hover, :focus-within') || bar.classList.remove('show'), 2000); };
      W.addEventListener('mousemove', e => { if (near(e.clientX, e.clientY)) showBar(true); }, { passive: true });
      W.addEventListener('touchstart', e => { const p = e.touches[0]; if (p && near(p.clientX, p.clientY)) showBar(true); }, { passive: true });
      bar.addEventListener('mouseleave', () => showBar(false));
      frame.contentWindow.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || document.fullscreenElement || Rv.isOverview?.()) return;
        e.preventDefault(); e.stopImmediatePropagation(); end();
      }, true);
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

// reveal.js's speaker view (plugin/notes) in the interface's language: its fixed words, and the layout
// label it rewrites when the layout changes.
export function translateSpeakerView(w) {
  const words = { 'Upcoming': t('Siguiente'), 'Time ': t('Tiempo') + ' ', 'Click to Reset': t('Clic para reiniciar'), 'Notes': t('Notas'),
    'Pacing – Time to finish current slide': t('Ritmo: tiempo para acabar esta diapositiva'), 'Default': t('Predeterminada'), 'Wide': t('Ancha'),
    'Tall': t('Alta'), 'Notes only': t('Solo notas') };
  const run = () => {
    const d = w.document; if (!d?.getElementById('upcoming-slide')) return false;     // (still blank: the plugin writes it after opening)
    if (/Speaker View/.test(d.title)) d.title = t('Vista del moderador');
    const walk = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      const v = n.nodeValue, k = v.trim();
      if (words[k] || words[k + ' ']) n.nodeValue = v.replace(k, (words[k] || words[k + ' ']).trim());
      else if (/^Layout(: .*)?$/.test(k)) n.nodeValue = v.replace(/^(\s*)Layout(: (.*))?/, (m, sp, x, name) => `${sp}${t('Disposición')}${name ? ': ' + (words[name] || name) : ''}`);
    }
    return true;
  };
  // (Once its page is there; then again whenever the plugin writes the layout's name anew.)
  let tries = 0;
  const wait = setInterval(() => {
    try {
      if (!run()) { if (++tries > 50) clearInterval(wait); return; }
      clearInterval(wait);
      const opts = { subtree: true, childList: true, characterData: true };
      const o = new w.MutationObserver(() => { o.disconnect(); run(); o.observe(w.document.body, opts); });
      o.observe(w.document.body, opts);
    } catch { clearInterval(wait); }
  }, 200);
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
