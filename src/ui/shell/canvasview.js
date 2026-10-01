// Canvas view (canvas mode, like Prezi): all the frames on the canvas, to
// arrange them — drag to move, the corner to resize, the round handle to turn;
// drag the empty canvas to move around, the wheel to zoom; double-click a
// frame to edit that slide. The dashed line is the path the presentation
// follows (the slide order).

import { popupMenu } from './menu.js';
import { shortSig } from '../../core/text.js';
import { state, subscribe, commit } from '../../core/store.js';
import * as slides from '../../features/document/slides.js';
import { frameOf, setFrame, frameMatrix, mul, inv, apply, css, bounds, fitView, setCanvasBg, frameForNew, setCanvasImage, moveCanvasImage, applyCanvasDesign } from '../../features/design/canvasmode.js';
import { CANVAS_DESIGNS, canvasDesign } from '../../features/design/canvasdesigns.js';
import { confirmDialog } from '../dialogs/dialog.js';
import { masterBlocksFor, styled, isEmptyPlaceholder } from '../../features/document/master.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { blockPreview } from './preview.js';
import { t } from '../../i18n/index.js';

let el = null, view = null, unsub = null, moveImage = false;
const cache = new Map();                                    // slide id → { sig, node }
export const canvasViewOpen = () => !!el;

export function toggleCanvasView(on = !el) {
  if (!on) { unsub?.(); el?.remove(); el = null; return; }
  if (el) return;
  const wrap = document.getElementById('canvas-wrap');
  wrap.style.position = 'relative';
  el = document.createElement('div'); el.id = 'canvas-view';
  el.innerHTML = `<div class="cv-world"></div><svg class="cv-over"></svg>
    <div class="cv-bar"><button type="button" class="mini2" data-cv="add"><i class="ms">add</i> ${t('Añadir marco')}</button>
      <button type="button" class="mini2" data-cv="fit"><i class="ms">fit_screen</i> ${t('Ver todo')}</button>
      <label class="cv-bg" title="${t('Fondo del lienzo')}"><i class="ms">format_color_fill</i><input type="color" data-cv="bg"></label>
      <button type="button" class="mini2" data-cv="image"><i class="ms">landscape</i> ${t('Imagen del lienzo')}</button>
      <button type="button" class="mini2 cv-move" data-cv="move" hidden><i class="ms">open_with</i> ${t('Mover la imagen')}</button>
      <button type="button" class="mini2" data-cv="close"><i class="ms">close</i> ${t('Volver a la diapositiva')}</button></div>
    <p class="cv-help">${t('Arrastra los marcos para colocarlos; la esquina cambia el tamaño y el círculo los gira. Rueda: acercar. Doble clic: editar la diapositiva.')}</p>`;
  wrap.appendChild(el);
  view = null;
  unsub = subscribe(paint);
  el.addEventListener('pointerdown', down);
  el.addEventListener('wheel', wheel, { passive: false });
  el.addEventListener('dblclick', e => { const f = e.target.closest('.cv-frame'); if (f) { slides.goToSlide(+f.dataset.i); toggleCanvasView(false); } });
  el.querySelector('.cv-bar').addEventListener('click', e => {
    const b = e.target.closest('[data-cv]')?.dataset.cv;
    if (b === 'close') toggleCanvasView(false);
    else if (b === 'fit') { view = null; paint(); }
    else if (b === 'add') addFrame();
    else if (b === 'image') imageMenu(e.target.closest('[data-cv]'));
    else if (b === 'move') { moveImage = !moveImage; e.target.closest('[data-cv]').classList.toggle('on', moveImage); el.classList.toggle('cv-moving', moveImage); }
  });
  el.querySelector('[data-cv="bg"]').addEventListener('input', e => setCanvasBg(e.target.value));
  paint();
}

const size = () => state.deck.size;
const frames = () => state.deck.slides.map((s, i) => frameOf(s, i, size()));
const box = () => ({ W: el.clientWidth, H: el.clientHeight });
const scaleOf = m => Math.hypot(m[0], m[1]);

function frameNode(s) {
  const sig = shortSig([s.blocks, s.background, s.layoutId, state.deck.master, deckFg()]);
  let c = cache.get(s.id);
  if (!c || c.sig !== sig) {
    const { w, h } = size(), node = document.createElement('div');
    node.className = 'cv-frame';
    node.style.cssText = `width:${w}px;height:${h}px;background:${s.background || 'transparent'};color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
    // (Not the canvas picture's piece: the frame shows the real picture under it, wherever it is dragged.)
    for (const b of [...masterBlocksFor(s), ...s.blocks.map(x => styled(x, s))]) if (!isEmptyPlaceholder(b) && !b.backdrop) node.appendChild(blockPreview(b, s));
    const num = document.createElement('span'); num.className = 'cv-num'; node.appendChild(num);
    c = { sig, node }; cache.set(s.id, c);
  }
  return c.node;
}

function paint() {
  if (!el) return;
  const { w, h } = size(), { W, H } = box(), fs = frames();
  if (!view) {                          // all the frames, in the space between the buttons and the help
    const bar = el.querySelector('.cv-bar'), help = el.querySelector('.cv-help');
    const top = bar ? bar.offsetTop + bar.offsetHeight + 8 : 0, bottom = help ? help.offsetHeight + 12 : 0;
    view = fitView(bounds(fs, w, h), W, Math.max(80, H - top - bottom), 0.9); view[5] += top;
  }
  el.style.background = state.deck.canvas?.bg || '#0d1117';
  el.querySelector('[data-cv="bg"]').value = state.deck.canvas?.bg || '#0d1117';
  const world = el.querySelector('.cv-world');
  world.style.transform = css(view);
  const img = state.deck.canvas?.image;
  el.querySelector('.cv-move').hidden = !img;
  let pic = world.querySelector(':scope > .cv-pic');
  if (img?.src) { if (!pic) { pic = document.createElement('img'); pic.className = 'cv-pic'; pic.alt = ''; } if (pic.getAttribute('src') !== img.src) pic.src = img.src;
    Object.assign(pic.style, { left: img.x + 'px', top: img.y + 'px', width: img.w + 'px', height: img.h + 'px' }); } else pic = null;
  const nodes = state.deck.slides.map((s, i) => {
    const n = frameNode(s);
    n.dataset.i = i; n.style.transform = css(frameMatrix(fs[i], w, h));
    n.classList.toggle('active', i === state.ui.slideIndex);
    n.style.zIndex = String(Math.round(1000 - Math.log2(fs[i].s || 1) * 50));
    n.querySelector('.cv-num').textContent = i + 1;
    return n;
  });
  world.replaceChildren(...(pic ? [pic] : []), ...nodes);
  // Overlay in screen space: the path, and the handles of the current frame.
  const svg = el.querySelector('.cv-over'), sc = p => apply(view, p[0], p[1]);
  const centres = fs.map(f => sc([f.x, f.y]));
  let out = `<polyline class="cv-path" points="${centres.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}"/>`;
  const i = state.ui.slideIndex, f = fs[i];
  if (f) {
    const M = mul(view, frameMatrix(f, w, h)), corners = [[0, 0], [w, 0], [w, h], [0, h]].map(p => apply(M, p[0], p[1]));
    const top = apply(M, w / 2, 0), up = apply(M, w / 2, -h * 0.12);
    out += `<polygon class="cv-sel" points="${corners.map(p => p.join(',')).join(' ')}"/><line class="cv-sel" x1="${top[0]}" y1="${top[1]}" x2="${up[0]}" y2="${up[1]}"/>`
      + `<circle class="cv-h" data-h="rot" cx="${up[0]}" cy="${up[1]}" r="8"/><rect class="cv-h" data-h="scale" x="${corners[2][0] - 7}" y="${corners[2][1] - 7}" width="14" height="14"/>`;
  }
  svg.innerHTML = out;
}

function addFrame() {
  const { w } = size(), { W, H } = box(), iv = inv(view), [cx, cy] = apply(iv, W / 2, H / 2);
  slides.addSlide();
  const s = state.deck.slides[state.ui.slideIndex];
  setFrame(s.id, frameForNew({ x: cx, y: cy, s: (W * 0.4) / (w * scaleOf(view)) }));
}

// ---- Dragging --------------------------------------------------------------------
function down(e) {
  if (e.button !== 0 || e.target.closest('.cv-bar')) return;
  const { w, h } = size(), start = [e.clientX, e.clientY], r0 = el.getBoundingClientRect();
  const local = ev => [ev.clientX - r0.left, ev.clientY - r0.top];
  const handle = e.target.closest('.cv-h')?.dataset.h, frameEl = e.target.closest('.cv-frame');
  let move;
  const img = state.deck.canvas?.image;
  if (moveImage && img) {                                   // move the canvas's picture
    const i0 = { ...img }, k = scaleOf(view), p0 = local(e);
    move = ev => { const p = local(ev); moveCanvasImage({ x: Math.round(i0.x + (p[0] - p0[0]) / k), y: Math.round(i0.y + (p[1] - p0[1]) / k) }, false); };
  } else if (handle || frameEl) {
    const i = handle ? state.ui.slideIndex : +frameEl.dataset.i, s = state.deck.slides[i];
    if (!handle && i !== state.ui.slideIndex) slides.goToSlide(i);
    const f0 = { ...frameOf(s, i, size()) }, c = apply(view, f0.x, f0.y), p0 = local(e);
    move = ev => {
      const p = local(ev);
      if (handle === 'scale') {
        const d0 = Math.hypot(p0[0] - c[0], p0[1] - c[1]) || 1, d = Math.hypot(p[0] - c[0], p[1] - c[1]);
        setFrame(s.id, { s: Math.max(0.02, +(f0.s * d / d0).toFixed(4)) }, false);
      } else if (handle === 'rot') {
        const a0 = Math.atan2(p0[1] - c[1], p0[0] - c[0]), a = Math.atan2(p[1] - c[1], p[0] - c[0]);
        let r = f0.r + (a - a0) * 180 / Math.PI; if (ev.shiftKey) r = Math.round(r / 15) * 15;
        setFrame(s.id, { r: Math.round(((r + 540) % 360) - 180) }, false);
      } else {
        const iv = inv([view[0], view[1], view[2], view[3], 0, 0]), [dx, dy] = apply(iv, p[0] - p0[0], p[1] - p0[1]);
        setFrame(s.id, { x: Math.round(f0.x + dx), y: Math.round(f0.y + dy) }, false);
      }
    };
  } else {
    const v0 = [...view];
    move = ev => { view = [v0[0], v0[1], v0[2], v0[3], v0[4] + ev.clientX - start[0], v0[5] + ev.clientY - start[1]]; paint(); };
  }
  el.setPointerCapture?.(e.pointerId);
  const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); commit(() => {}); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  e.preventDefault();
}
function wheel(e) {
  e.preventDefault();
  const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015);
  const img = state.deck.canvas?.image;
  if (moveImage && img) {                                   // scale the picture around the pointer
    const [wx, wy] = apply(inv(view), x, y);
    moveCanvasImage({ x: Math.round(wx - (wx - img.x) * f), y: Math.round(wy - (wy - img.y) * f), w: Math.round(img.w * f), h: Math.round(img.h * f) }, false);
    clearTimeout(wheel.t); wheel.t = setTimeout(() => commit(() => {}), 400);
    return;
  }
  view = mul([f, 0, 0, f, x - f * x, y - f * y], view);
  paint();
}

// The canvas's picture: a ready-made design (optionally placing the slides
// along its route), a picture of one's own, or none.
function imageMenu(anchor) {
  popupMenu(anchor, { id: 'cv-menu', attr: 'd',
    html: Object.entries(CANVAS_DESIGNS).map(([k, [l]]) => `<button data-d="${k}"><i class="ms">image</i>${t(l)}</button>`).join('')
      + `<button data-d="upload"><i class="ms">upload</i>${t('Subir una imagen…')}</button>`
      + (state.deck.canvas?.image ? `<button data-d="none"><i class="ms">hide_image</i>${t('Quitar la imagen')}</button>` : ''),
    onPick: async k => {
    if (k === 'none') { setCanvasImage(null); return; }
    if (k === 'upload') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader();
        rd.onload = () => { const im = new Image(); im.onload = () => { setCanvasImage(rd.result, { w: im.naturalWidth, h: im.naturalHeight }); view = null; paint(); }; im.src = rd.result; }; rd.readAsDataURL(f); };
      inp.click(); return;
    }
    const d = canvasDesign(k);
    const place = await confirmDialog(t('¿Colocar también las diapositivas a lo largo del recorrido del diseño? (La primera mostrará todo el lienzo.)'));
    applyCanvasDesign(d, { placeFrames: place }); view = null; paint();
    } });
}
