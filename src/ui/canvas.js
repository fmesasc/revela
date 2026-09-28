// The editing canvas: renders the current slide and provides comfortable
// direct manipulation — drag from anywhere on a block, snap to alignment
// guides, resize from the corners, edit text on double‑click.

import { state, commit, mutate, currentSlide, selectedBlock,
  selectedBlocks, selectedIds, isSelected, setSelection, toggleSelection, setMulti, selectWithGroup } from '../core/store.js';
import { shapeSVG, shapeSig, imgFilter, imgOpacity, imgClip, chartSVG, chartSig, connectorSVG, iconSVG, iconSig, applyWordart, tableSpan, inkSVG, inkSig, tableClass, tableVars } from './shape.js';
import { collectFigures, figuresMap, captionLine, figIndexTitle } from '../features/captions.js';
import { blockPreview } from './preview.js';
import { t } from '../i18n.js';
import { deckFg, deckBodyFont, currentPalette } from '../features/palettes.js';
import { animTimeline, EFFECT_KF, motionPoints } from '../features/transitions.js';
import { blockLabel } from '../features/a11y.js';
import { cameraRadius } from '../features/media.js';
import { pollEditorHTML, savedVotes } from '../features/poll.js';
const pollSig = b => JSON.stringify([b.kind, b.display, b.question, b.options, b.fontSize, savedVotes(b.pollId)]);
import { masterBlocksFor, PH_PROMPT, isEmptyPlaceholder } from '../features/master.js';
import { autocorrectAtCaret } from '../features/autocorrect.js';

function renderSlideRef(wrap, b) {
  wrap.innerHTML = '';
  const target = state.deck.slides.find(s => s.id === b.target) || state.deck.slides[0];
  if (!target) return;
  const { w, h } = state.deck.size;
  const inner = document.createElement('div'); inner.className = 'sr-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${b.w / w});transform-origin:top left;position:relative;background:${target.background}`;
  for (const bl of target.blocks) if (bl.type !== 'slideref') inner.appendChild(blockPreview(bl));
  wrap.appendChild(inner);
}

function figIndexHTML(b) {
  const figs = collectFigures(state.deck, b && b.kind);
  return `<b>${t(figIndexTitle(b && b.kind))}</b><ul>` + figs.map(f => `<li>${captionLine(f)}</li>`).join('') + `</ul>`;
}

const findBlock = id => currentSlide().blocks.find(x => x.id === id);
const connectorHTML = b => {
  const { w, h } = state.deck.size;
  return connectorSVG(b, findBlock(b.from), findBlock(b.to), w, h);
};

function applyImgStyle(img, b) {
  img.style.objectFit = b.fit || 'contain';
  img.style.filter = imgFilter(b);
  img.style.opacity = imgOpacity(b);
  img.style.clipPath = imgClip(b);
}

const SNAP = 7; // snapping threshold, in canvas pixels
// "Marked as final": no direct manipulation (the banner flashes to say why).
const readOnly = () => { if (!state.deck.final) return false; window.dispatchEvent(new Event('revela:readonly')); return true; };
let stage;

export function initCanvas() {
  stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', e => {
    if (e.target === stage) startMarquee(e);
  });
  // Click a ruler to drop a placeable guide.
  document.getElementById('ruler-h')?.addEventListener('pointerdown', e => addGuideFromRuler(e, 'v'));
  document.getElementById('ruler-v')?.addEventListener('pointerdown', e => addGuideFromRuler(e, 'h'));
}

function addGuideFromRuler(e, axis) {
  const rect = stage.getBoundingClientRect(); const f = factor();
  const pos = Math.round(axis === 'v' ? (e.clientX - rect.left) * f : (e.clientY - rect.top) * f);
  commit(() => { (state.deck.guides ||= { v: [], h: [] })[axis].push(pos); });
}

// Persistent guides (deck‑level), drawn over the slide; drag to move, double‑click to remove.
function drawPGuides() {
  stage.querySelectorAll('.pguide').forEach(g => g.remove());
  const g = state.deck.guides || { v: [], h: [] };
  ['v', 'h'].forEach(axis => (g[axis] || []).forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'pguide ' + axis;
    if (axis === 'v') el.style.left = pos + 'px'; else el.style.top = pos + 'px';
    el.addEventListener('pointerdown', ev => startGuideDrag(ev, axis, i));
    el.addEventListener('dblclick', ev => { ev.stopPropagation(); commit(() => state.deck.guides[axis].splice(i, 1)); });
    stage.appendChild(el);
  }));
}
function startGuideDrag(ev, axis, i) {
  ev.stopPropagation();
  const rect = stage.getBoundingClientRect(); const f = factor();
  const onMove = e => {
    const pos = Math.round(axis === 'v' ? (e.clientX - rect.left) * f : (e.clientY - rect.top) * f);
    state.deck.guides[axis][i] = pos; mutate(() => {});
  };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); commit(() => {}, { history: false }); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}

// Rubber‑band selection: drag on the empty canvas to select every block the
// rectangle touches (hold Shift to add to the current selection).
function startMarquee(ev) {
  const add = ev.shiftKey;
  if (!add) commit(() => setSelection(null), { history: false });
  const f = factor();
  const rect = stage.getBoundingClientRect();
  const ox = (ev.clientX - rect.left) * f, oy = (ev.clientY - rect.top) * f;
  const box = document.createElement('div'); box.className = 'marquee'; stage.appendChild(box);
  const base = new Set(selectedIds());
  const onMove = e => {
    const x = (e.clientX - rect.left) * f, y = (e.clientY - rect.top) * f;
    const l = Math.min(ox, x), t = Math.min(oy, y), w = Math.abs(x - ox), h = Math.abs(y - oy);
    box.style.cssText = `left:${l}px;top:${t}px;width:${w}px;height:${h}px`;
    const hit = currentSlide().blocks.filter(b =>
      b.x < l + w && b.x + b.w > l && b.y < t + h && b.y + b.h > t).map(b => b.id);
    const ids = new Set(add ? base : []); hit.forEach(id => ids.add(id));
    mutate(() => setMulti([...ids]));
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    box.remove();
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}

const factor = () => state.deck.size.w / stage.getBoundingClientRect().width;

// CSS transform for a block: rotation plus optional mirror flips.
export function transformOf(b) {
  let t = `rotate(${b.rotation || 0}deg)`;
  if (b.flipH) t += ' scaleX(-1)';
  if (b.flipV) t += ' scaleY(-1)';
  return t;
}

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
  stage.style.background = slide.background || state.deck.slides[state.ui.slideIndex]?.background || '#101317';
  stage.classList.toggle('editing-master', !!state.ui.editMaster);
  stage.style.color = deckFg();
  stage.style.fontFamily = deckBodyFont();
  stage.classList.toggle('guides', state.ui.showGuides);
  stage.classList.toggle('drawing', !!state.ui.drawTool);
  stage.classList.toggle('eraser', state.ui.drawTool === 'eraser');

  const sig = signature(slide);
  if (sig !== lastSignature) {
    stage.innerHTML = '';
    for (const b of slide.blocks) stage.appendChild(blockEl(b));
    lastSignature = sig;
  } else {
    for (const b of slide.blocks) reconcile(b);
  }
  drawPGuides();
  drawLogo();
  drawCaptions();
  drawMotionPath();
  drawMasterLayer();
  const banner = document.getElementById('master-banner');
  if (banner) banner.hidden = !state.ui.editMaster;
  // Screen readers: name the slide and announce the selected object.
  stage.setAttribute('aria-label', `${t('Diapositiva')} ${state.ui.slideIndex + 1} / ${state.deck.slides.length}`);
  const sel = selectedBlock(), sr = document.getElementById('sr-status');
  const msg = sel ? `${t('Seleccionado')}: ${blockLabel(sel, t)}` : '';
  if (sr && sr.textContent !== msg) sr.textContent = msg;
}

// Master objects, drawn (not editable) under the slide's own objects.
function drawMasterLayer() {
  const blocks = state.ui.editMaster ? [] : masterBlocksFor(currentSlide());
  const sig = JSON.stringify(blocks);
  let layer = stage.querySelector('.master-layer');
  if (!blocks.length) { layer?.remove(); return; }
  if (!layer) { layer = document.createElement('div'); layer.className = 'master-layer'; }
  if (stage.firstChild !== layer) stage.insertBefore(layer, stage.firstChild);
  if (layer.dataset.sig === sig) return;
  layer.dataset.sig = sig; layer.innerHTML = '';
  for (const b of blocks) layer.appendChild(blockPreview(b));
}

// Tab / Shift+Tab on the slide walk through its objects in reading order.
export function cycleSelection(dir) {
  const bs = currentSlide().blocks.filter(b => b.type !== 'connector');
  if (!bs.length) return false;
  const i = bs.findIndex(b => b.id === state.ui.selection);
  const j = i < 0 ? (dir > 0 ? 0 : bs.length - 1) : i + dir;
  if (j < 0 || j >= bs.length) { commit(() => setSelection(null), { history: false }); return false; }
  commit(() => setSelection(bs[j].id), { history: false });
  return true;
}

// Dashed guide from the selected object to where its motion path ends.
function drawMotionPath() {
  stage.querySelectorAll('.motion-path').forEach(n => n.remove());
  const b = selectedBlock(); const a = b?.animation;
  if (!a || a.effect !== 'path' || (!a.dx && !a.dy)) return;
  const x1 = b.x + b.w / 2, y1 = b.y + b.h / 2, x2 = x1 + (a.dx || 0), y2 = y1 + (a.dy || 0);
  const pts = motionPoints(a).map(([x, y]) => `${(x1 + x).toFixed(1)},${(y1 + y).toFixed(1)}`).join(' ');
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'motion-path'); svg.setAttribute('width', 1); svg.setAttribute('height', 1);
  svg.style.left = '0px'; svg.style.top = '0px';
  svg.innerHTML = `<defs><marker id="mp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">`
    + `<path d="M0,0 L10,5 L0,10 z" fill="#e0873b"/></marker></defs>`
    + `<polyline points="${pts}" fill="none" stroke="#e0873b" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#mp-arrow)"/>`
    + `<rect x="${x2 - b.w / 2}" y="${y2 - b.h / 2}" width="${b.w}" height="${b.h}" fill="none" stroke="#e0873b" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/>`;
  stage.appendChild(svg);
}

// Captions shown under captioned blocks (figures/tables).
function drawCaptions() {
  stage.querySelectorAll('.caption-ovl').forEach(n => n.remove());
  const map = figuresMap(state.deck); const slide = currentSlide();
  for (const b of slide.blocks) {
    const f = map.get(b.id); if (!f) continue;
    const el = document.createElement('div'); el.className = 'caption-ovl';
    el.style.left = b.x + 'px'; el.style.top = (b.y + b.h + 4) + 'px'; el.style.width = b.w + 'px';
    el.textContent = captionLine(f); stage.appendChild(el);
  }
}

// The deck logo, shown on every slide (branding / master).
function drawLogo() {
  const logo = state.deck.logo;
  let el = stage.querySelector('.deck-logo-ovl');
  if (!logo || !logo.src) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('img'); el.className = 'deck-logo-ovl'; stage.appendChild(el); }
  el.src = logo.src; el.style.height = (logo.size || 120) + 'px';
  const p = logo.position || 'br', m = '16px';
  for (const s of ['left', 'right', 'top', 'bottom']) el.style[s] = '';
  el.style[p.includes('r') ? 'right' : 'left'] = m;
  el.style[p[0] === 'b' ? 'bottom' : 'top'] = m;
}

// Update an existing block element from the model without recreating it, so
// interaction (editing, dragging) is never interrupted.
function reconcile(b) {
  const el = stage.querySelector(`.block[data-id="${b.id}"]`);
  if (!el) return;
  el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
  el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
  el.style.transform = transformOf(b);
  el.style.opacity = (b.opacity != null && b.opacity < 100) ? b.opacity / 100 : '';
  el.classList.toggle('selected', isSelected(b.id));
  el.setAttribute('aria-label', blockLabel(b, t));
  // Comment marker on objects with open comments.
  const nc = (currentSlide().comments || []).filter(c => c.blockId === b.id && !c.resolved).length;
  let badge = el.querySelector(':scope > .cm-badge');
  if (nc && !badge) { badge = document.createElement('span'); badge.className = 'cm-badge'; el.appendChild(badge); }
  if (badge) { if (nc) badge.textContent = nc; else badge.remove(); }
  el.classList.toggle('animated', !!b.animation);
  el.classList.toggle('locked', !!b.locked);
  if (b.type === 'text') {
    const rich = el.querySelector('.rich');
    if (rich) {
      // Box-level styles are safe to apply even while editing (no caret impact).
      rich.style.fontSize = (b.fontSize || 40) + 'px';
      rich.style.textAlign = b.textAlign || 'left';
      rich.style.fontFamily = b.fontFamily || '';
      rich.style.lineHeight = b.lineHeight || '';
      rich.style.letterSpacing = b.letterSpacing ? b.letterSpacing + 'px' : '';
      rich.style.paddingLeft = (6 + (b.indent || 0)) + 'px';
      rich.dir = b.dir || '';
      rich.style.writingMode = b.vertical ? 'vertical-rl' : '';
      rich.style.setProperty('--bullet', b.bullet || 'disc');
      rich.style.setProperty('--num', b.numStyle || 'decimal');
      rich.style.background = b.bg || '';
      rich.style.border = b.borderColor ? '2px solid ' + b.borderColor : '';
      rich.style.borderRadius = (b.radius || 0) + 'px';
      const vj = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[b.vAlign];
      rich.style.display = vj ? 'flex' : ''; rich.style.flexDirection = vj ? 'column' : '';
      rich.style.justifyContent = vj || '';
      applyWordart(rich, b.wordart);
      if (!b.wordart) rich.style.fontWeight = b.fontWeight || '';
      rich.style.fontStyle = b.fontStyle || '';
      rich.style.columnCount = b.columns > 1 ? b.columns : '';
      rich.style.columnGap = b.columns > 1 ? '32px' : '';
      if (b.ph) rich.dataset.ph = t(PH_PROMPT[b.ph] || PH_PROMPT.body); else delete rich.dataset.ph;
      // Not editing: show the (math‑rendered) HTML; re‑render only when it changed.
      if (!el.classList.contains('editing') && rich.dataset.msrc !== (b.html || '')) {
        rich.innerHTML = b.html || ''; rich.dataset.msrc = b.html || '';
        if (hasInlineMath(b.html)) renderInlineMath(rich);
      }
    }
  } else if (b.type === 'image') {
    const img = el.querySelector('img'); if (img) { if (img.getAttribute('src') !== b.src) img.src = b.src; applyImgStyle(img, b); }
  } else if (b.type === 'model') {
    const mv = el.querySelector('model-viewer'); if (mv && mv.getAttribute('src') !== b.src) mv.setAttribute('src', b.src);
  } else if (b.type === 'video') {
    const v = el.querySelector('video'); if (v && v.getAttribute('src') !== b.src) v.src = b.src;
  } else if (b.type === 'audio') {
    const a2 = el.querySelector('audio'); if (a2 && a2.getAttribute('src') !== b.src) a2.src = b.src;
  } else if (b.type === 'embed') {
    const f = el.querySelector('iframe'); if (f && f.getAttribute('src') !== b.src) f.src = b.src;
    const u = el.querySelector('.embed-url'); if (u) u.textContent = hostOf(b.src);
    const o = el.querySelector('.embed-open'); if (o && o.getAttribute('href') !== b.src) o.href = b.src;
  } else if (b.type === 'shape') {
    const d = el.querySelector('.shape'); const sig = shapeSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = shapeSVG(b); }
  } else if (b.type === 'table') {
    const t = el.querySelector('.tbl'); if (!t) return;
    const sig = tableSig(b);
    if (t.dataset.sig !== sig) { t.dataset.sig = sig; fillTable(t, b); if (el.classList.contains('editing')) t.querySelectorAll('td').forEach(td => (td.contentEditable = 'true')); }
    t.className = tableClass(b); t.style.cssText = tableVars(b);
  } else if (b.type === 'code') {
    const pre = el.querySelector('.code'), c = el.querySelector('code');
    if (pre) pre.style.fontSize = (b.fontSize || 22) + 'px';
    if (c && !el.classList.contains('editing') && c.textContent !== (b.code || '')) c.textContent = b.code || '';
  } else if (b.type === 'chart') {
    const d = el.querySelector('.chart'); const sig = chartSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = chartSVG(b); }
  } else if (b.type === 'connector') {
    const d = el.querySelector('.connector'); if (d) d.innerHTML = connectorHTML(b);  // follows its endpoints
  } else if (b.type === 'poll') {
    const d = el.querySelector('.poll-blk'); const sig = pollSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = pollEditorHTML(b, currentPalette().accents); }
  } else if (b.type === 'camera') {
    const d = el.querySelector('.camera-blk'); if (d) d.style.borderRadius = cameraRadius(b);
  } else if (b.type === 'ink') {
    const d = el.querySelector('.ink-blk'); const sig = inkSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = inkSVG(b); }
  } else if (b.type === 'icon') {
    const d = el.querySelector('.icon-blk'); const sig = iconSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = iconSVG(b); }
  } else if (b.type === 'math') {
    const d = el.querySelector('.math-blk'); if (d && d.dataset.latex !== (b.latex || '')) renderMath(d, b.latex);
  } else if (b.type === 'figindex') {
    const d = el.querySelector('.figindex'); if (d) { d.style.fontSize = (b.fontSize || 28) + 'px'; d.innerHTML = figIndexHTML(b); }
  } else if (b.type === 'slideref') {
    const d = el.querySelector('.slideref'); if (d) renderSlideRef(d, b);
  }
}

function blockEl(b) {
  const el = document.createElement('div');
  el.className = 'block' + (isSelected(b.id) ? ' selected' : '')
    + (b.animation ? ' animated' : '') + (b.locked ? ' locked' : '') + (b.type === 'connector' ? ' __conn' : '');
  el.dataset.id = b.id;
  el.setAttribute('role', 'group'); el.setAttribute('aria-label', blockLabel(b, t));
  el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
  el.style.transform = transformOf(b);
  if (b.opacity != null && b.opacity < 100) el.style.opacity = b.opacity / 100;
  el.appendChild(content(b));

  // Selection chrome.
  const del = document.createElement('button');
  del.className = 'handle-del'; del.textContent = '×'; del.title = 'Borrar';
  del.addEventListener('pointerdown', e => e.stopPropagation());
  del.addEventListener('click', e => { e.stopPropagation();
    commit(() => { currentSlide().blocks = currentSlide().blocks.filter(x => x.id !== b.id);
      state.ui.selection = null; }); });
  el.appendChild(del);
  const rot = document.createElement('div');
  rot.className = 'handle-rot'; rot.title = 'Girar (Mayús: 15°)';
  rot.addEventListener('pointerdown', ev => startRotate(ev, b, el));
  el.appendChild(rot);
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
  else if (b.type === 'table') setupTable(el, b);
  else if (b.type === 'code') setupCode(el, b);
  return el;
}

function content(b) {
  if (b.type === 'text') {
    const d = document.createElement('div');
    d.className = 'rich';
    d.spellcheck = true;
    if (b.ph) d.dataset.ph = t(PH_PROMPT[b.ph] || PH_PROMPT.body);
    d.style.fontSize = (b.fontSize || 40) + 'px';
    d.style.textAlign = b.textAlign || 'left';
    if (b.fontFamily) d.style.fontFamily = b.fontFamily;
    if (b.lineHeight) d.style.lineHeight = b.lineHeight;
    if (b.letterSpacing) d.style.letterSpacing = b.letterSpacing + 'px';
    if (b.indent) d.style.paddingLeft = (6 + b.indent) + 'px';
    if (b.dir) d.dir = b.dir;
    if (b.vertical) d.style.writingMode = 'vertical-rl';
    if (b.bullet) d.style.setProperty('--bullet', b.bullet);
    if (b.numStyle) d.style.setProperty('--num', b.numStyle);
    if (b.bg) d.style.background = b.bg;
    if (b.borderColor) d.style.border = '2px solid ' + b.borderColor;
    if (b.radius) d.style.borderRadius = b.radius + 'px';
    const vj0 = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[b.vAlign];
    if (vj0) { d.style.display = 'flex'; d.style.flexDirection = 'column'; d.style.justifyContent = vj0; }
    if (b.wordart) applyWordart(d, b.wordart);
    else if (b.fontWeight) d.style.fontWeight = b.fontWeight;
    if (b.fontStyle) d.style.fontStyle = b.fontStyle;
    if (b.columns > 1) { d.style.columnCount = b.columns; d.style.columnGap = '32px'; }
    d.innerHTML = b.html || ''; d.dataset.msrc = b.html || '';
    if (hasInlineMath(b.html)) renderInlineMath(d);
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
  if (b.type === 'connector') {
    const d = document.createElement('div'); d.className = 'connector'; d.innerHTML = connectorHTML(b); return d;
  }
  if (b.type === 'ink') {
    const d = document.createElement('div'); d.className = 'ink-blk'; d.dataset.sig = inkSig(b); d.innerHTML = inkSVG(b); return d;
  }
  if (b.type === 'icon') {
    const d = document.createElement('div'); d.className = 'icon-blk'; d.dataset.sig = iconSig(b); d.innerHTML = iconSVG(b); return d;
  }
  if (b.type === 'math') {
    const d = document.createElement('div'); d.className = 'math-blk'; renderMath(d, b.latex); return d;
  }
  if (b.type === 'figindex') {
    const d = document.createElement('div'); d.className = 'figindex';
    d.style.fontSize = (b.fontSize || 28) + 'px'; d.innerHTML = figIndexHTML(b); return d;
  }
  if (b.type === 'slideref') {
    const d = document.createElement('div'); d.className = 'slideref'; renderSlideRef(d, b); return d;
  }
  if (b.type === 'table') return tableContent(b);
  if (b.type === 'chart') {
    const d = document.createElement('div'); d.className = 'chart';
    d.dataset.sig = chartSig(b); d.innerHTML = chartSVG(b); return d;
  }
  if (b.type === 'code') {
    const pre = document.createElement('pre'); pre.className = 'code'; pre.style.fontSize = (b.fontSize || 22) + 'px';
    const c = document.createElement('code'); c.textContent = b.code || ''; pre.appendChild(c);
    return pre;
  }
  if (b.type === 'image') { const i = document.createElement('img'); i.src = b.src; i.draggable = false; applyImgStyle(i, b); return i; }
  if (b.type === 'video') { const v = document.createElement('video'); v.src = b.src; v.controls = true; return v; }
  if (b.type === 'poll') {
    const d = document.createElement('div'); d.className = 'poll-blk'; d.dataset.sig = pollSig(b); d.innerHTML = pollEditorHTML(b, currentPalette().accents); return d;
  }
  if (b.type === 'camera') {
    const d = document.createElement('div'); d.className = 'camera-blk'; d.style.borderRadius = cameraRadius(b);
    d.innerHTML = `<i class="ms">videocam</i><span>${t('Cámara en directo')}</span>`;
    return d;
  }
  if (b.type === 'audio') { const a = document.createElement('audio'); a.src = b.src; a.controls = true; return a; }
  if (b.type === 'embed') return embedContent(b);
  return document.createElement('div');
}

const hostOf = u => { try { return new URL(u).host || u; } catch { return u; } };

// KaTeX for equation blocks, loaded on demand.
const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
const KATEX_AUTO = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
let katexLoading, katexAutoLoading;
function ensureKatex() {
  if (window.katex) return Promise.resolve();
  if (!katexLoading) katexLoading = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = KATEX_CSS; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = KATEX_JS; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return katexLoading;
}
function ensureKatexAuto() {
  return ensureKatex().then(() => {
    if (window.renderMathInElement) return;
    if (!katexAutoLoading) katexAutoLoading = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = KATEX_AUTO; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    return katexAutoLoading;
  });
}
// Render inline $...$ / $$...$$ inside a text element (only when not editing).
export const hasInlineMath = html => /\$[^$]/.test(html || '');
function renderInlineMath(el) {
  ensureKatexAuto().then(() => {
    try {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
      });
    } catch {}
  }).catch(() => {});
}
function renderMath(el, latex) {
  el.dataset.latex = latex || '';
  ensureKatex().then(() => {
    try { window.katex.render(latex || '', el, { throwOnError: false, displayMode: true }); }
    catch { el.textContent = latex || ''; }
  }).catch(() => { el.textContent = latex || ''; });
}
// Public helper used by the visual equation editor's live preview.
export function renderLatex(el, latex) { renderMath(el, latex); }

// A web embed: a small bar (site + open‑in‑new‑tab) over the iframe. The bar is
// also the fallback when a site refuses to be embedded (X‑Frame‑Options / CSP) —
// Google, most banks and many others always do, and nothing client‑side can
// override that, so at least the link stays reachable.
function embedContent(b) {
  const wrap = document.createElement('div'); wrap.className = 'embed';
  const bar = document.createElement('div'); bar.className = 'embed-bar';
  const url = document.createElement('span'); url.className = 'embed-url'; url.textContent = hostOf(b.src);
  const open = document.createElement('a'); open.className = 'embed-open';
  open.href = b.src; open.target = '_blank'; open.rel = 'noopener';
  open.textContent = 'Abrir ↗'; open.title = 'Abrir en una pestaña nueva';
  open.addEventListener('pointerdown', e => e.stopPropagation());
  bar.append(url, open);
  const f = document.createElement('iframe');
  f.src = b.src || '';
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation');
  f.setAttribute('referrerpolicy', 'no-referrer');
  f.setAttribute('loading', 'lazy');
  f.style.pointerEvents = 'none'; // dragging the body moves the block; double‑click to interact
  wrap.append(bar, f);
  return wrap;
}

// Code blocks edit as plain text on double‑click.
function setupCode(el, b) {
  const code = el.querySelector('code');
  el.addEventListener('dblclick', () => { el.classList.add('editing'); code.contentEditable = 'true'; code.focus(); });
  code.addEventListener('input', () => { b.code = code.textContent; });
  code.addEventListener('blur', () => {
    code.contentEditable = 'false'; el.classList.remove('editing');
    commit(() => { b.code = code.textContent; }, { history: false });
  });
}

const tableSig = b => b.rows.length + 'x' + (b.rows[0]?.length || 0) + '|' + JSON.stringify(b.merges || []);
function tableContent(b) {
  const t = document.createElement('table'); t.className = tableClass(b);
  t.dataset.sig = tableSig(b); t.style.cssText = tableVars(b);
  fillTable(t, b);
  return t;
}
function fillTable(t, b) {
  t.innerHTML = '';
  const span = tableSpan(b);
  b.rows.forEach((row, r) => {
    const tr = t.insertRow();
    row.forEach((cell, c) => {
      const sp = span(r, c); if (!sp) return;              // covered by a merged cell
      const td = tr.insertCell(); td.innerHTML = cell || ''; td.dataset.r = r; td.dataset.c = c;
      if (sp.cs > 1) td.colSpan = sp.cs; if (sp.rs > 1) td.rowSpan = sp.rs;
    });
  });
}
// Cells edit on double‑click (like text boxes); Esc / clicking away saves.
function setupTable(el, b) {
  el.addEventListener('dblclick', e => {
    if (!e.target.closest('td')) return;
    el.classList.add('editing');
    el.querySelectorAll('.tbl td').forEach(td => (td.contentEditable = 'true'));
    e.target.closest('td').focus();
  });
  el.addEventListener('input', e => { const td = e.target.closest('td'); if (td) b.rows[+td.dataset.r][+td.dataset.c] = td.innerHTML; });
  el.addEventListener('focusout', () => setTimeout(() => {
    if (!el.contains(document.activeElement)) {
      el.classList.remove('editing');
      el.querySelectorAll('.tbl td').forEach(td => (td.contentEditable = 'false'));
      commit(() => {}, { history: false });
    }
  }, 0));
}

// Double‑click enters content mode: text becomes editable, a model can be
// orbited. Clicking elsewhere leaves it.
function setupText(b, el) {
  const rich = el.querySelector('.rich');
  el.addEventListener('dblclick', () => {
    if (readOnly()) return;
    // Show the raw source (with $…$) while editing, not the rendered math.
    if (rich.dataset.msrc !== undefined) { rich.innerHTML = b.html || ''; rich.dataset.msrc = ''; }
    rich.contentEditable = 'true'; rich.focus(); el.classList.add('editing');
  });
  rich.addEventListener('input', e => {             // no re-render: keep the caret
    if (e.inputType === 'insertText') autocorrectAtCaret(rich);
    b.html = rich.innerHTML;
    if (b.ph && isEmptyPlaceholder(b)) b.html = '';   // back to the prompt when emptied
  });
  // Tab / Shift+Tab inside a list: nest / un-nest the item (bullet levels).
  rich.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const sel = window.getSelection();
    const li = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('li');
    if (!li || !rich.contains(li)) return;
    e.preventDefault();
    document.execCommand(e.shiftKey ? 'outdent' : 'indent');
    b.html = rich.innerHTML;
  });
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
    if (ev.target.closest('.rich, model-viewer, iframe, .tbl, .code')) return; // over the content: keep editing
    exitEdit(el);                                          // grabbed the frame: leave edit and move
  }
  ev.stopPropagation();

  // Shift‑click toggles the block in the selection without moving it.
  if (ev.shiftKey) { commit(() => toggleSelection(b.id), { history: false }); return; }
  // A plain click on an unselected block selects just it; clicking one that is
  // already part of a multi‑selection keeps the group so it can be moved together.
  if (!isSelected(b.id)) commit(() => selectWithGroup(b.id), { history: false });
  if (b.locked || b.type === 'connector' || readOnly()) return;   // selected but not movable

  const movers = selectedBlocks().filter(m => m.type !== 'connector');
  const origins = new Map(movers.map(m => [m.id, { x: m.x, y: m.y }]));
  const f = factor(), sx = ev.clientX, sy = ev.clientY, ox = b.x, oy = b.y;
  try { el.setPointerCapture(ev.pointerId); } catch {} el.classList.add('dragging');
  const onMove = e => {
    const rawx = Math.round(ox + (e.clientX - sx) * f);
    const rawy = Math.round(oy + (e.clientY - sy) * f);
    const snapped = movers.length > 1 ? { x: rawx, y: rawy } : applySnap(b, rawx, rawy);
    const dx = snapped.x - ox, dy = snapped.y - oy;
    for (const m of movers) {
      const o = origins.get(m.id); m.x = o.x + dx; m.y = o.y + dy;
      const mel = stage.querySelector(`.block[data-id="${m.id}"]`);
      if (mel) { mel.style.left = m.x + 'px'; mel.style.top = m.y + 'px'; }
    }
  };
  const onUp = () => {
    try { el.releasePointerCapture(ev.pointerId); } catch {} el.classList.remove('dragging');
    el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp);
    clearGuides();
    commit(() => {}, { history: false });
  };
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp);
}

function startRotate(ev, b, el) {
  ev.stopPropagation();
  if (b.locked || readOnly()) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const base = b.rotation || 0;
  const start = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  el.setPointerCapture?.(ev.pointerId);
  const onMove = e => {
    const a = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    let rot = base + (a - start);
    if (e.shiftKey) rot = Math.round(rot / 15) * 15;
    b.rotation = Math.round(((rot % 360) + 360) % 360);
    el.style.transform = transformOf(b);
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
    commit(() => {}, { history: false });
  };
  document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}

function startResize(ev, b, el, corner) {
  ev.stopPropagation();
  if (b.locked || readOnly()) return;
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
  clearGuides();
  if (state.ui.snap === false) return { x: Math.round(x), y: Math.round(y) };  // snapping off
  const { w, h } = state.deck.size;
  const others = currentSlide().blocks.filter(o => o.id !== b.id);
  const vTargets = [w / 2, 0, w];                    // slide centre + edges (x)
  const hTargets = [h / 2, 0, h];                    // slide centre + edges (y)
  for (const o of others) { vTargets.push(o.x, o.x + o.w, o.x + o.w / 2); hTargets.push(o.y, o.y + o.h, o.y + o.h / 2); }
  (state.deck.guides?.v || []).forEach(x => vTargets.push(x));   // snap to placed guides
  (state.deck.guides?.h || []).forEach(y => hTargets.push(y));
  if (state.ui.showGuides)                                          // visible grid: 10 × 10 cells
    for (let i = 1; i < 10; i++) { vTargets.push(w * i / 10); hTargets.push(h * i / 10); }

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
  // Smart spacing: equal gaps to the neighbours in the same row / column
  // (PowerPoint's distance arrows). Wins over alignment only when closer.
  const sx = spacingSnap(b, x, y, others, 'x'), sy = spacingSnap(b, x, y, others, 'y');
  const bv = best([x, x + b.w / 2, x + b.w], vTargets);
  if (sx && (!bv || sx.d < bv.d)) { x = sx.val; drawSpacing('x', sx.marks, y + b.h / 2); }
  else if (bv) { x += bv.delta; drawGuide('v', bv.at); }
  const bh = best([y, y + b.h / 2, y + b.h], hTargets);
  if (sy && (!bh || sy.d < bh.d)) { y = sy.val; drawSpacing('y', sy.marks, x + b.w / 2); }
  else if (bh) { y += bh.delta; drawGuide('h', bh.at); }
  return { x: Math.round(x), y: Math.round(y) };
}
// Candidate positions (left/top edge) that repeat a gap already present between
// two neighbours, or centre the object between two of them.
function spacingSnap(b, x, y, others, axis) {
  const X = axis === 'x', pos = X ? x : y, size = X ? b.w : b.h;
  const lo = o => (X ? o.x : o.y), len = o => (X ? o.w : o.h);
  const cross = o => (X ? o.y < y + b.h && o.y + o.h > y : o.x < x + b.w && o.x + o.w > x);
  const row = others.filter(o => o.type !== 'connector' && cross(o)).sort((a, c) => lo(a) - lo(c));
  const gaps = [];
  for (let i = 0; i < row.length - 1; i++) {
    const g = lo(row[i + 1]) - (lo(row[i]) + len(row[i]));
    if (g > 0) gaps.push({ g, seg: [lo(row[i]) + len(row[i]), lo(row[i + 1])] });
  }
  const cands = [];
  for (const { g, seg } of gaps) for (const o of row) {
    const r = lo(o) + len(o);
    cands.push({ val: r + g, marks: [seg, [r, r + g]] });                  // after o, same gap
    cands.push({ val: lo(o) - g - size, marks: [seg, [lo(o) - g, lo(o)]] }); // before o, same gap
  }
  for (let i = 0; i < row.length - 1; i++) {                               // centred between two
    const a = lo(row[i]) + len(row[i]), c = lo(row[i + 1]), g = (c - a - size) / 2;
    if (g > 0) cands.push({ val: a + g, marks: [[a, a + g], [c - g, c]] });
  }
  let win = null;
  for (const c of cands) { const d = Math.abs(c.val - pos); if (d < SNAP && (!win || d < win.d)) win = { ...c, d }; }
  return win;
}
function drawSpacing(axis, marks, at) {
  for (const [a, c] of marks) {
    const g = document.createElement('div');
    g.className = 'guide spacing ' + axis;
    if (axis === 'x') g.style.cssText = `left:${a}px;width:${c - a}px;top:${at}px`;
    else g.style.cssText = `top:${a}px;height:${c - a}px;left:${at}px`;
    g.dataset.gap = Math.round(c - a);
    stage.appendChild(g);
  }
}
function drawGuide(dir, at) {
  const g = document.createElement('div');
  g.className = 'guide ' + dir;
  if (dir === 'v') g.style.left = at + 'px'; else g.style.top = at + 'px';
  stage.appendChild(g);
}
function clearGuides() { stage.querySelectorAll('.guide').forEach(g => g.remove()); }

// ---- Animation preview -----------------------------------------------------
const KEYFRAME = EFFECT_KF;
function animateEl(el, anim, dur, delay) {
  const effect = anim.effect;
  if (effect === 'path') {                        // motion path: slide to (dx, dy) and back
    el.animate(motionPoints(anim).map(([x, y]) => ({ translate: `${x}px ${y}px` })),
      { duration: dur, delay, easing: 'ease-in-out', fill: 'none' });
    return;
  }
  const kf = KEYFRAME[effect] || 'rvIn';
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = `${kf} ${dur}ms ease ${delay}ms both`;
  const done = () => { el.style.animation = ''; el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
}
// Play the slide's entrance animations in order, in the editor.
export function playAnimations() {
  // Clicks play one after another; inside a click, the timeline gives each start.
  const tl = animTimeline(currentSlide());
  const ends = new Map();                       // step → when it finishes
  for (const { step, delay, dur } of tl.values()) ends.set(step, Math.max(ends.get(step) || 0, delay + dur));
  const offset = new Map(); let acc = 0;
  for (const st of [...ends.keys()].sort((a, b) => a - b)) { offset.set(st, acc); acc += ends.get(st); }
  for (const [id, { step, delay, dur }] of tl) {
    const b = currentSlide().blocks.find(x => x.id === id);
    const el = stage.querySelector(`.block[data-id="${id}"]`);
    if (el && b) animateEl(el, b.animation, dur, offset.get(step) + delay);
  }
}

// ---- Keyboard nudging ------------------------------------------------------
export function nudge(dx, dy) {
  const bs = selectedBlocks().filter(b => b.type !== 'connector'); if (!bs.length) return;
  commit(() => { for (const b of bs) { b.x += dx; b.y += dy; } });
}
