// The magnifier on the canvas: the box (the block, moved and resized like any
// other) showing the slide under its area live, the area's frame and the lines,
// and, selected, the area's own handles (drag it to magnify somewhere else;
// its corners keep the proportion, Shift frees it and the box follows). Also
// drawing a new one: a rectangle over what to enlarge (Esc cancels).

import { state, commit, currentSlide, isSelected, setSelection } from '../../core/store.js';
import { shortSig } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { masterBlocksFor, styled } from '../../features/document/master.js';
import { currentPalette } from '../../features/design/palettes.js';
import { underArea, viewOf, magOverlaySVG, magFrameSVG, magViewCSS, magInsetCSS, zoomLabel, clampSource, retarget, boxToSource, addMagnify } from '../../features/document/magnify.js';
import { magnifyView, blockPreview } from '../shell/preview.js';
import { stage, readOnly } from './canvas.js';
import { factor } from './interact.js';

// Equations and code as they are drawn on the canvas (typeset, highlighted); the rest as in the thumbnails.
function cloneOf(o, slide) {
  const pv = blockPreview(o, slide);
  if (o.type === 'math' || o.type === 'code') {
    const live = stage.querySelector(`.block[data-id="${o.id}"] > :first-child`);
    if (live) { const c = live.cloneNode(true); c.removeAttribute('contenteditable'); c.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable')); pv.replaceChildren(c); }
  }
  return pv;
}
const liveSig = under => under.filter(o => o.type === 'math' || o.type === 'code').map(o => stage.querySelector(`.block[data-id="${o.id}"] > :first-child`)?.innerHTML.length || 0);

export function paintMagnify(el, b) {
  const d = el.querySelector(':scope > .magnify'); if (!d) return;
  const slide = currentSlide(), { w: W, h: H } = state.deck.size, accent = currentPalette().accents[0];
  const all = [...masterBlocksFor(slide), ...slide.blocks.map(x => styled(x, slide))], under = underArea(all, viewOf(b), [b.id]);
  // What it shows changes with the objects under the area (and the slide's background); where and how big, every time.
  const sig = shortSig([slide.background, under, liveSig(under), W, H, under.filter(o => o.type === 'magnify').map(o => underArea(all, viewOf(o), [b.id, o.id]))]);
  if (d.dataset.sig !== sig || !d.querySelector('.rv-mag')) {
    d.dataset.sig = sig;
    d.replaceChildren(magnifyView(b, slide, cloneOf), handles());
  } else {
    const ovl = d.querySelector('.rv-mag-lines');
    Object.assign(ovl.style, { left: -b.x + 'px', top: -b.y + 'px' }); ovl.innerHTML = magOverlaySVG(b, W, H, accent);
    d.querySelector('.rv-mag-in').style.cssText = magInsetCSS(b);
    const view = d.querySelector('.rv-mag-view'); view.style.cssText = `${magViewCSS(b)};width:${W}px;height:${H}px;background:${slide.background || 'transparent'}`;
    d.querySelector('.rv-mag-fr').innerHTML = magFrameSVG(b, accent);
  }
  const v = viewOf(b), hs = d.querySelector('.mag-src');
  hs.style.cssText = `left:${v.x - b.x}px;top:${v.y - b.y}px;width:${v.w}px;height:${v.h}px`;
  d.querySelector('.mag-k').textContent = zoomLabel(b);
}
function handles() {
  const f = document.createDocumentFragment(), hs = document.createElement('div');
  hs.className = 'mag-src'; hs.title = t('Zona ampliada: arrástrala para ampliar otra parte');
  for (const c of ['nw', 'ne', 'sw', 'se']) { const h = document.createElement('div'); h.className = 'mag-h ' + c; h.dataset.c = c; hs.appendChild(h); }
  const k = document.createElement('span'); k.className = 'mag-k';
  f.append(hs, k);
  return f;
}

// Grabbing the area (its frame, or its handles when selected) moves or resizes it, not the box.
export function setupMagnify(el, b) {
  el.addEventListener('pointerdown', ev => {
    const hit = ev.target.closest?.('.mag-h, .mag-src, .rv-mag-src'); if (!hit) return;
    ev.stopPropagation(); ev.preventDefault();
    startSourceDrag(ev, el._b, el, hit.dataset.c || '');
  }, true);
  paintMagnify(el, b);
}
function startSourceDrag(ev, b, el, corner) {
  if (!isSelected(b.id)) commit(() => setSelection(b.id), { history: false });
  if (b.locked || readOnly()) return;
  const f = factor(), sx = ev.clientX, sy = ev.clientY, o = { ...b.source }, ratio = o.w / o.h;
  const onMove = e => {
    const dx = (e.clientX - sx) * f, dy = (e.clientY - sy) * f;
    if (!corner) b.source = clampSource({ ...o, x: o.x + dx, y: o.y + dy });
    else {
      let w = Math.max(8, o.w + (corner.includes('e') ? dx : -dx)), h = Math.max(8, o.h + (corner.includes('s') ? dy : -dy));
      if (!e.shiftKey) { if (w / o.w >= h / o.h) h = w / ratio; else w = h * ratio; }
      b.source = clampSource({ x: corner.includes('w') ? o.x + o.w - w : o.x, y: corner.includes('n') ? o.y + o.h - h : o.y, w, h });
      if (e.shiftKey) { boxToSource(b); el.style.height = b.h + 'px'; }      // (another shape: the box takes it too)
    }
    paintMagnify(el, b);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    commit(() => retarget(b));
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}

// ---- Drawing a new magnifier ---------------------------------------------------
let drawing = null;
export function cancelMagnifyDraw() { drawing?.end(); }
// within: a picture whose part is enlarged (the rectangle stays on it).
export function startMagnifyDraw({ within = null } = {}) {
  if (readOnly()) return;
  cancelMagnifyDraw();
  const over = document.createElement('div'); over.className = 'path-draw mag-draw';
  over.innerHTML = `<div class="mag-rubber" hidden></div><div class="pd-hint"><i class="ms">loupe</i> ${t('Dibuja un rectángulo sobre la zona que quieres ampliar · Esc: cancelar')}</div>`;
  stage.appendChild(over);
  const rub = over.querySelector('.mag-rubber'), { w: W, h: H } = state.deck.size;
  const at = e => { const r = stage.getBoundingClientRect(), k = factor(); return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  const lim = within ? { x0: within.x, y0: within.y, x1: within.x + within.w, y1: within.y + within.h } : { x0: 0, y0: 0, x1: W, y1: H };
  const inside = ([x, y]) => [Math.min(Math.max(x, lim.x0), lim.x1), Math.min(Math.max(y, lim.y0), lim.y1)];
  let p0 = null, rect = null;
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } };
  const end = () => { over.remove(); window.removeEventListener('keydown', key, true); drawing = null; };
  drawing = { end };
  window.addEventListener('keydown', key, true);
  over.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { over.setPointerCapture(e.pointerId); } catch {} p0 = inside(at(e)); });
  over.addEventListener('pointermove', e => {
    if (!p0) return;
    const p = inside(at(e));
    rect = { x: Math.min(p0[0], p[0]), y: Math.min(p0[1], p[1]), w: Math.abs(p[0] - p0[0]), h: Math.abs(p[1] - p0[1]) };
    rub.hidden = false; rub.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`;
  });
  over.addEventListener('pointerup', () => {
    if (!p0) return;
    end();
    // (A click: an area of an eighth of the slide's width there.)
    if (!rect || rect.w < 8 || rect.h < 8) { const w = Math.round(W / 8), h = Math.round(w * 9 / 16); rect = { x: p0[0] - w / 2, y: p0[1] - h / 2, w, h }; }
    addMagnify(rect);
  });
}
