// Canvas zoom (status bar and View tab); fits the slide on small screens.

import { state, selectedBlocks } from '../../core/store.js';

const $ = s => document.querySelector(s);

export function applyZoom() {
  const z = state.ui.zoom || 1;
  const g = document.getElementById('stage-grid');
  const sizer = document.getElementById('stage-sizer');
  if (g) { g.style.transform = `scale(${z})`; g.style.setProperty('--hz', (1 / z).toFixed(4)); }  // handles keep their on-screen size
  if (sizer) {
    // Footprint from the deck size (deterministic; offsetWidth can be 0 mid‑render).
    const rw = state.ui.showRuler ? 20 : 0;
    sizer.style.width = ((state.deck.size.w + rw) * z) + 'px';
    sizer.style.height = ((state.deck.size.h + rw) * z) + 'px';
  }
  const lbl = document.getElementById('zoom-label');
  if (lbl) lbl.textContent = Math.round(z * 100) + '%';
  const sl = document.getElementById('zoom-slider');
  if (sl && document.activeElement !== sl) sl.value = String(Math.round(z * 100));
}
// The slider in the status bar, and Ctrl + wheel (or a trackpad pinch) over the
// slide: zooms keeping what is under the pointer where it is.
export function wireZoom() {
  const sl = document.getElementById('zoom-slider');
  sl?.addEventListener('input', () => setZoom(+sl.value / 100));
  const wrap = document.getElementById('canvas-wrap');
  wrap?.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const z0 = state.ui.zoom || 1, z1 = Math.max(0.1, Math.min(3, z0 * Math.exp(-e.deltaY * 0.0025)));
    const r = wrap.getBoundingClientRect(), px = e.clientX - r.left + wrap.scrollLeft, py = e.clientY - r.top + wrap.scrollTop;
    setZoom(z1);
    const k = (state.ui.zoom || 1) / z0;
    wrap.scrollLeft = px * k - (e.clientX - r.left); wrap.scrollTop = py * k - (e.clientY - r.top);
  }, { passive: false });
  wirePan(wrap);
}
// Space + drag moves the view when the slide is bigger than its area (zoomed in), as in Figma,
// Photoshop or Keynote: a hand while Space is held, a closed hand while dragging. Not while
// typing, nor over a button that Space would press.
const canPan = w => w && (w.scrollWidth > w.clientWidth + 1 || w.scrollHeight > w.clientHeight + 1);
function wirePan(wrap) {
  if (!wrap) return;
  let held = false;
  const free = () => { const a = document.activeElement; return !a || a === document.body || (!!a.closest?.('#canvas-wrap') && !a.isContentEditable && !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  const hand = on => { held = on; wrap.classList.toggle('space-pan', on); if (!on) wrap.classList.remove('panning'); };
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey || !free() || document.querySelector('.modal-backdrop') || !canPan(wrap)) return;
    e.preventDefault(); if (!held) hand(true);
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space' && held) hand(false); });
  window.addEventListener('blur', () => { if (held) hand(false); });
  // (Capture: the hand wins over the object under it, which would otherwise be dragged.)
  wrap.addEventListener('pointerdown', e => {
    if (!held || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, l = wrap.scrollLeft, t = wrap.scrollTop;
    wrap.classList.add('panning');
    const move = m => { wrap.scrollLeft = l - (m.clientX - sx); wrap.scrollTop = t - (m.clientY - sy); };
    const up = () => { wrap.classList.remove('panning'); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); };
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true);
  }, true);
}
// «Zoom a la selección» (Figma's Shift+2): the selected objects fill the view, centred; with
// nothing selected, the whole slide fits the window.
export function zoomToSelection() {
  const bs = selectedBlocks(), wrap = document.getElementById('canvas-wrap');
  if (!bs.length || !wrap?.clientWidth) { fitZoom(); return; }
  const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y));
  const w = Math.max(...bs.map(b => b.x + b.w)) - x, h = Math.max(...bs.map(b => b.y + b.h)) - y;
  const room = 0.8;   // (some of the slide around it, and room for the handles)
  setZoom(Math.min(3, (wrap.clientWidth * room) / Math.max(w, 1), (wrap.clientHeight * room) / Math.max(h, 1)));
  const z = state.ui.zoom || 1, st = document.getElementById('stage').getBoundingClientRect(), r = wrap.getBoundingClientRect();
  wrap.scrollLeft += st.left + (x + w / 2) * z - (r.left + wrap.clientWidth / 2);
  wrap.scrollTop += st.top + (y + h / 2) * z - (r.top + wrap.clientHeight / 2);
}
// Fit to the window (as PowerPoint does) until the user picks a zoom; then theirs is kept.
let fitting = true;
export const zoomFitting = () => fitting;
export function setZoom(z, { manual = true } = {}) {
  if (manual) fitting = false;
  state.ui.zoom = Math.max(0.1, Math.min(3, Math.round(z * 100) / 100));
  applyZoom();
}
export function fitZoom() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap?.clientWidth) return;                       // hidden (the slide sorter): nothing to fit
  const rw = state.ui.showRuler ? 20 : 0, w = state.deck.size.w + rw, h = state.deck.size.h + rw;
  // Inside the area's padding (less on small screens), rounded down so that
  // no scroll bar appears for a pixel.
  const cs = getComputedStyle(wrap);
  const pw = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2, ph = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 2;
  const z = Math.min((wrap.clientWidth - pw) / w, (wrap.clientHeight - ph) / h);
  fitting = true;
  setZoom(Math.floor(z * 100) / 100, { manual: false });
}
