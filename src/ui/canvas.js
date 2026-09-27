// The editing canvas: renders the current slide and provides comfortable
// direct manipulation — drag from anywhere on a block, snap to alignment
// guides, resize from the corners, edit text on double‑click.

import { state, commit, mutate, currentSlide, selectedBlock } from '../core/store.js';
import { shapeSVG, shapeSig } from './shape.js';

const SNAP = 7; // snapping threshold, in canvas pixels
let stage;

export function initCanvas() {
  stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', e => {
    if (e.target === stage) { commit(() => (state.ui.selection = null), { history: false }); }
  });
}

const factor = () => state.deck.size.w / stage.getBoundingClientRect().width;

let lastSignature = '';

// The signature captures everything that requires a full rebuild (which slide,
// which blocks in which order, and the slide size). Selection, position, size,
// text and other in‑place edits do NOT change it, so they are reconciled onto
// the existing DOM instead of rebuilding it. Rebuilding on selection was what
// broke double‑click‑to‑edit and mid‑drag interaction.
function signature(slide) {
  return slide.id + '|' + slide.blocks.map(b => b.id).join(',')
    + '|' + state.deck.size.w + 'x' + state.deck.size.h;
}

export function renderCanvas() {
  const slide = currentSlide();
  const { w, h } = state.deck.size;
  stage.style.width = w + 'px';
  stage.style.height = h + 'px';
  stage.style.background = slide.background;
  stage.classList.toggle('guides', state.ui.showGuides);

  const sig = signature(slide);
  if (sig !== lastSignature) {
    stage.innerHTML = '';
    for (const b of slide.blocks) stage.appendChild(blockEl(b));
    lastSignature = sig;
  } else {
    for (const b of slide.blocks) reconcile(b);
  }
}

// Update an existing block element from the model without recreating it, so
// interaction (editing, dragging) is never interrupted.
function reconcile(b) {
  const el = stage.querySelector(`.block[data-id="${b.id}"]`);
  if (!el) return;
  el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
  el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
  el.style.transform = `rotate(${b.rotation || 0}deg)`;
  el.classList.toggle('selected', b.id === state.ui.selection);
  el.classList.toggle('animated', !!b.animation);
  if (b.type === 'text') {
    const rich = el.querySelector('.rich');
    if (rich) {
      // Box-level styles are safe to apply even while editing (no caret impact).
      rich.style.fontSize = (b.fontSize || 40) + 'px';
      rich.style.textAlign = b.textAlign || 'left';
      rich.style.fontFamily = b.fontFamily || '';
      rich.style.lineHeight = b.lineHeight || '';
      rich.style.letterSpacing = b.letterSpacing ? b.letterSpacing + 'px' : '';
      if (!el.classList.contains('editing') && rich.innerHTML !== (b.html || '')) rich.innerHTML = b.html || '';
    }
  } else if (b.type === 'image') {
    const img = el.querySelector('img'); if (img && img.getAttribute('src') !== b.src) img.src = b.src;
  } else if (b.type === 'model') {
    const mv = el.querySelector('model-viewer'); if (mv && mv.getAttribute('src') !== b.src) mv.setAttribute('src', b.src);
  } else if (b.type === 'video') {
    const v = el.querySelector('video'); if (v && v.getAttribute('src') !== b.src) v.src = b.src;
  } else if (b.type === 'embed') {
    const f = el.querySelector('iframe'); if (f && f.getAttribute('src') !== b.src) f.src = b.src;
  } else if (b.type === 'shape') {
    const d = el.querySelector('.shape'); const sig = shapeSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = shapeSVG(b); }
  }
}

function blockEl(b) {
  const el = document.createElement('div');
  el.className = 'block' + (b.id === state.ui.selection ? ' selected' : '')
    + (b.animation ? ' animated' : '');
  el.dataset.id = b.id;
  el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`
    + `transform:rotate(${b.rotation || 0}deg)`;
  el.appendChild(content(b));

  // Selection chrome.
  const del = document.createElement('button');
  del.className = 'handle-del'; del.textContent = '×'; del.title = 'Borrar';
  del.addEventListener('pointerdown', e => e.stopPropagation());
  del.addEventListener('click', e => { e.stopPropagation();
    commit(() => { currentSlide().blocks = currentSlide().blocks.filter(x => x.id !== b.id);
      state.ui.selection = null; }); });
  el.appendChild(del);
  for (const c of ['nw', 'ne', 'sw', 'se']) {
    const hd = document.createElement('div');
    hd.className = 'handle-size ' + c;
    hd.addEventListener('pointerdown', ev => startResize(ev, b, el, c));
    el.appendChild(hd);
  }

  el.addEventListener('pointerdown', ev => startDrag(ev, b, el));
  if (b.type === 'text') setupText(b, el);
  else if (b.type === 'model') setupModel(el);
  else if (b.type === 'embed') setupEmbed(el);
  return el;
}

function content(b) {
  if (b.type === 'text') {
    const d = document.createElement('div');
    d.className = 'rich';
    d.style.fontSize = (b.fontSize || 40) + 'px';
    d.style.textAlign = b.textAlign || 'left';
    if (b.fontFamily) d.style.fontFamily = b.fontFamily;
    if (b.lineHeight) d.style.lineHeight = b.lineHeight;
    if (b.letterSpacing) d.style.letterSpacing = b.letterSpacing + 'px';
    d.innerHTML = b.html || '';
    return d;
  }
  if (b.type === 'model') {
    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', b.src || ''); mv.setAttribute('camera-controls', '');
    if (b.autoRotate !== false) mv.setAttribute('auto-rotate', '');
    mv.setAttribute('shadow-intensity', '1'); mv.setAttribute('interaction-prompt', 'none');
    mv.style.pointerEvents = 'none'; // dragging the body moves the block…
    return mv;
  }
  if (b.type === 'shape') {
    const d = document.createElement('div'); d.className = 'shape';
    d.dataset.sig = shapeSig(b); d.innerHTML = shapeSVG(b); return d;
  }
  if (b.type === 'image') { const i = document.createElement('img'); i.src = b.src; i.draggable = false; return i; }
  if (b.type === 'video') { const v = document.createElement('video'); v.src = b.src; v.controls = true; return v; }
  if (b.type === 'embed') {
    const f = document.createElement('iframe');
    f.src = b.src || '';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation');
    f.setAttribute('referrerpolicy', 'no-referrer');
    f.setAttribute('loading', 'lazy');
    f.style.pointerEvents = 'none'; // dragging the body moves the block; double‑click to interact
    return f;
  }
  return document.createElement('div');
}

// Double‑click enters content mode: text becomes editable, a model can be
// orbited. Clicking elsewhere leaves it.
function setupText(b, el) {
  const rich = el.querySelector('.rich');
  el.addEventListener('dblclick', () => {
    rich.contentEditable = 'true'; rich.focus(); el.classList.add('editing');
  });
  rich.addEventListener('input', () => { b.html = rich.innerHTML; }); // no re-render: keep the caret
  rich.addEventListener('blur', () => {
    rich.contentEditable = 'false'; el.classList.remove('editing');
    commit(() => { b.html = rich.innerHTML; }, { history: false });
  });
}
function setupModel(el) {
  const mv = el.querySelector('model-viewer');
  el.addEventListener('dblclick', () => { mv.style.pointerEvents = 'auto'; el.classList.add('editing'); });
  el.addEventListener('pointerleave', () => { mv.style.pointerEvents = 'none'; el.classList.remove('editing'); });
}
// A web page embed behaves like a model: drag the frame to move it, double‑click
// to interact with the page, move the pointer away to release it.
function setupEmbed(el) {
  const f = el.querySelector('iframe');
  el.addEventListener('dblclick', () => { f.style.pointerEvents = 'auto'; el.classList.add('editing'); });
  el.addEventListener('pointerleave', () => { f.style.pointerEvents = 'none'; el.classList.remove('editing'); });
}

function exitEdit(el) {
  const rich = el.querySelector('.rich'); if (rich) rich.blur();
  el.classList.remove('editing');
}

function startDrag(ev, b, el) {
  if (el.classList.contains('editing')) {
    if (ev.target.closest('.rich, model-viewer, iframe')) return; // over the content: keep editing
    exitEdit(el);                                          // grabbed the frame: leave edit and move
  }
  ev.stopPropagation();
  commit(() => (state.ui.selection = b.id), { history: false });
  const f = factor(), sx = ev.clientX, sy = ev.clientY, ox = b.x, oy = b.y;
  el.setPointerCapture(ev.pointerId); el.classList.add('dragging');
  const onMove = e => {
    let nx = Math.round(ox + (e.clientX - sx) * f);
    let ny = Math.round(oy + (e.clientY - sy) * f);
    const snapped = applySnap(b, nx, ny);
    b.x = snapped.x; b.y = snapped.y;
    el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
  };
  const onUp = () => {
    el.releasePointerCapture(ev.pointerId); el.classList.remove('dragging');
    el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp);
    clearGuides();
    commit(() => {}, { history: false });
  };
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp);
}

function startResize(ev, b, el, corner) {
  ev.stopPropagation();
  const f = factor(), sx = ev.clientX, sy = ev.clientY, o = { x: b.x, y: b.y, w: b.w, h: b.h };
  el.setPointerCapture?.(ev.pointerId);
  const ratio = o.w / o.h;
  const onMove = e => {
    const dx = (e.clientX - sx) * f, dy = (e.clientY - sy) * f;
    if (corner.includes('e')) b.w = Math.max(30, Math.round(o.w + dx));
    if (corner.includes('s')) b.h = Math.max(20, Math.round(o.h + dy));
    if (corner.includes('w')) { b.w = Math.max(30, Math.round(o.w - dx)); b.x = Math.round(o.x + dx); }
    if (corner.includes('n')) { b.h = Math.max(20, Math.round(o.h - dy)); b.y = Math.round(o.y + dy); }
    if (e.shiftKey) {                       // hold Shift to keep the aspect ratio
      b.h = Math.round(b.w / ratio);
      if (corner.includes('n')) b.y = Math.round(o.y + o.h - b.h);
    }
    el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
    commit(() => {}, { history: false });
  };
  document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}

// ---- Alignment guides + snapping -----------------------------------------
function applySnap(b, x, y) {
  const { w, h } = state.deck.size;
  const others = currentSlide().blocks.filter(o => o.id !== b.id);
  const vTargets = [w / 2, 0, w];                    // slide centre + edges (x)
  const hTargets = [h / 2, 0, h];                    // slide centre + edges (y)
  for (const o of others) { vTargets.push(o.x, o.x + o.w, o.x + o.w / 2); hTargets.push(o.y, o.y + o.h, o.y + o.h / 2); }

  clearGuides();
  // Snap each axis to the single closest target (across box edges/centre and
  // every candidate line). Picking the nearest — rather than the first within
  // range — keeps centring smooth instead of jumping between guides.
  const best = (vals, targets) => {
    let win = null;
    for (const val of vals) for (const t of targets) {
      const d = Math.abs(val - t);
      if (d < SNAP && (!win || d < win.d)) win = { d, delta: t - val, at: t };
    }
    return win;
  };
  const bv = best([x, x + b.w / 2, x + b.w], vTargets);
  if (bv) { x += bv.delta; drawGuide('v', bv.at); }
  const bh = best([y, y + b.h / 2, y + b.h], hTargets);
  if (bh) { y += bh.delta; drawGuide('h', bh.at); }
  return { x: Math.round(x), y: Math.round(y) };
}
function drawGuide(dir, at) {
  const g = document.createElement('div');
  g.className = 'guide ' + dir;
  if (dir === 'v') g.style.left = at + 'px'; else g.style.top = at + 'px';
  stage.appendChild(g);
}
function clearGuides() { stage.querySelectorAll('.guide').forEach(g => g.remove()); }

// ---- Keyboard nudging ------------------------------------------------------
export function nudge(dx, dy) {
  const b = selectedBlock(); if (!b) return;
  commit(() => { b.x += dx; b.y += dy; });
}
