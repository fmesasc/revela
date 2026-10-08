// Teleprompter (PowerPoint's, when recording): the current slide's notes, big, scrolling up by themselves, in a window
// of their own — to put just under the camera, and out of a recording of this tab. It follows the slides: while
// presenting, the one shown; else the one being edited. Space pauses, ↑/↓ the speed, +/− the size.

import { state } from '../../core/store.js';
import { session } from '../../core/session.js';
import { t } from '../../i18n/index.js';

let win = null, timer = null;
const SPEEDS = [0, 10, 20, 30, 45, 60, 80, 110];          // (px a second; 0: still)
let speed = 3, size = 44, paused = false, shown = null;

// The notes of the slide on show: presenting, reveal.js's current slide (its <aside class="notes">); else the one edited.
export function currentNotes() {
  const Rv = session.present?.frame?.contentWindow?.Reveal;
  if (Rv?.isReady?.()) return Rv.getCurrentSlide()?.querySelector('aside.notes')?.textContent || '';
  return state.deck.slides[state.ui.slideIndex]?.notes || '';
}

export const prompterOpen = () => !!win && !win.closed;

export function openPrompter() {
  if (prompterOpen()) { win.focus(); return win; }
  win = window.open('', 'rv-prompter', 'width=960,height=380');
  if (!win) return null;
  const d = win.document;
  d.open(); d.write(`<!doctype html><html lang="${document.documentElement.lang || 'es'}"><head><meta charset="utf-8"><title></title><style>
    html,body{margin:0;height:100%;background:#111;color:#f4f4f4;font-family:system-ui,sans-serif}
    #txt{position:absolute;inset:0 0 56px;overflow:hidden;padding:0 6vw}
    #in{white-space:pre-wrap;line-height:1.35;font-weight:600;padding:40vh 0 60vh}
    #mark{position:absolute;left:0;right:0;top:30vh;border-top:2px solid #ffd34d55;pointer-events:none}
    #bar{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;gap:8px;align-items:center;justify-content:center;background:#1d1d1f;font-size:14px}
    button{font:inherit;min-width:42px;padding:8px 12px;border-radius:8px;border:1px solid #444;background:#2a2a2d;color:#eee;cursor:pointer}
    #empty{color:#999;font-weight:400}</style></head>
    <body><div id="txt"><div id="in"></div></div><div id="mark"></div><div id="bar">
    <button data-k="slower">−</button><span id="sp"></span><button data-k="faster">+</button>
    <button data-k="pause"></button><button data-k="top">⤒</button><button data-k="smaller">A−</button><button data-k="bigger">A+</button></div></body></html>`);
  d.close();
  d.title = t('Apuntador');
  d.querySelector('[data-k="top"]').title = t('Volver al principio');
  d.addEventListener('click', e => { const b = e.target.closest?.('button'); if (b) act(b.dataset.k); });
  d.addEventListener('keydown', e => {
    const k = { ' ': 'pause', ArrowUp: 'faster', ArrowDown: 'slower', '+': 'bigger', '-': 'smaller', Home: 'top' }[e.key];
    if (k) { e.preventDefault(); act(k); }
  });
  paint(true);
  // (One step a frame of the window's own clock: smooth, and it keeps its place between steps.)
  let last = performance.now(), y = 0;
  clearInterval(timer);
  timer = setInterval(() => {
    if (!prompterOpen()) return closePrompter();
    const now = performance.now(), box = win.document.getElementById('txt'), dt = (now - last) / 1000; last = now;
    if (box.dataset.reset) { y = 0; delete box.dataset.reset; }
    if (!paused && SPEEDS[speed]) { y = Math.min(y + SPEEDS[speed] * dt, box.scrollHeight - box.clientHeight); box.scrollTop = y; }
    else y = box.scrollTop;                                  // (still: where the wheel or the hand left it)
    paint(false);                                            // (and the slide's notes, should it have changed)
  }, 33);
  return win;
}

export function closePrompter() {
  clearInterval(timer); timer = null;
  if (prompterOpen()) win.close();
  win = null; shown = null;
}

function act(k) {
  if (k === 'faster') speed = Math.min(SPEEDS.length - 1, speed + 1);
  else if (k === 'slower') speed = Math.max(0, speed - 1);
  else if (k === 'pause') paused = !paused;
  else if (k === 'bigger') size = Math.min(96, size + 6);
  else if (k === 'smaller') size = Math.max(20, size - 6);
  else if (k === 'top') { const box = win.document.getElementById('txt'); box.scrollTop = 0; box.dataset.reset = '1'; }
  paint(false);
}

// The text (anew, from the top, when the slide's notes change), and the controls' state.
function paint(force) {
  const d = win.document, txt = currentNotes(), box = d.getElementById('txt'), inner = d.getElementById('in');
  if (force || txt !== shown) {
    shown = txt; box.scrollTop = 0; box.dataset.reset = '1';
    inner.innerHTML = ''; if (txt.trim()) inner.textContent = txt;
    else inner.append(Object.assign(d.createElement('span'), { id: 'empty', textContent: t('Esta diapositiva no tiene notas: escríbelas debajo de la diapositiva y aparecerán aquí.') }));
  }
  inner.style.fontSize = size + 'px';
  d.getElementById('sp').textContent = SPEEDS[speed] ? `${t('Velocidad')} ${speed}` : t('Quieto');
  d.querySelector('[data-k="pause"]').textContent = paused ? '▶' : '❚❚';
  d.querySelector('[data-k="pause"]').title = paused ? t('Seguir') : t('Pausa');
}
