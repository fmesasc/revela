// The editing canvas: renders the current slide and provides comfortable
// direct manipulation — drag from anywhere on a block, snap to alignment
// guides, resize from the corners, edit text on double‑click.

import { state, commit, currentSlide, selectedBlock, isSelected, setSelection } from '../../core/store.js';
import { shapeSVG, shapeSig, chartSVG, chartSig, iconSVG, iconSig, applyWordart, inkSVG, inkSig, tableClass, tableVars } from '../../render/svg.js';
import { figuresMap, captionLine } from '../../features/document/captions.js';
import { blockPreview } from '../shell/preview.js';
import { t } from '../../i18n/index.js';
import { deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { motionPoints } from '../../features/animation/transitions.js';
import { blockLabel } from '../../features/document/a11y.js';
import { cameraRadius } from '../../features/live/media.js';
import { pollEditorHTML } from '../../features/live/poll.js';
import { masterBlocksFor, PH_PROMPT } from '../../features/document/master.js';
import { stageBackground } from '../../io/formats/html.js';
import { pollSig, renderSlideRef, figIndexHTML, connectorHTML, applyImgStyle, content, hostOf, hasInlineMath, renderInlineMath, renderMath, paintCode, setupCode, tableSig, fillTable, setupTable, setupText, setupMath, setupModel, setupEmbed } from './content.js';
import { addGuideFromRuler, drawPGuides, startMarquee, startDrag, startRotate, startResize } from './interact.js';

export const findBlock = id => currentSlide().blocks.find(x => x.id === id);

// "Marked as final": no direct manipulation (the banner flashes to say why).
export const readOnly = () => { if (!state.deck.final) return false; window.dispatchEvent(new Event('revela:readonly')); return true; };
export let stage;

export function initCanvas() {
  stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', e => {
    if (e.target === stage) startMarquee(e);
  });
  // Click a ruler to drop a placeable guide.
  document.getElementById('ruler-h')?.addEventListener('pointerdown', e => addGuideFromRuler(e, 'v'));
  document.getElementById('ruler-v')?.addEventListener('pointerdown', e => addGuideFromRuler(e, 'h'));
}

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
  stage.style.background = (slide.background ? stageBackground(slide) : null) || state.deck.slides[state.ui.slideIndex]?.background || '#101317';
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
  drawBgMedia(slide);
  const banner = document.getElementById('master-banner');
  if (banner) banner.hidden = !state.ui.editMaster;
  // Screen readers: name the slide and announce the selected object.
  stage.setAttribute('aria-label', `${t('Diapositiva')} ${state.ui.slideIndex + 1} / ${state.deck.slides.length}`);
  const sel = selectedBlock(), sr = document.getElementById('sr-status');
  const msg = sel ? `${t('Seleccionado')}: ${blockLabel(sel, t)}` : '';
  if (sr && sr.textContent !== msg) sr.textContent = msg;
}

// Video / web page / translucent image behind the slide (Design ▸ Advanced background).
function drawBgMedia(slide) {
  const want = slide.bgVideo ? 'v:' + slide.bgVideo : slide.bgIframe ? 'i:' + slide.bgIframe
    : (slide.bgOpacity ?? 100) < 100 ? 'o:' + slide.bgOpacity + slide.background : '';
  let el = stage.querySelector('.bg-media');
  if (!want) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'bg-media'; }
  if (stage.firstChild !== el) stage.insertBefore(el, stage.firstChild);
  if (el.dataset.k === want) return;
  el.dataset.k = want; el.innerHTML = ''; el.style.cssText = '';
  if (slide.bgVideo) { const v = document.createElement('video'); Object.assign(v, { src: slide.bgVideo, muted: true, loop: true, autoplay: true, playsInline: true }); el.appendChild(v); v.play?.().catch(() => {}); }
  else if (slide.bgIframe) { const f = document.createElement('iframe'); f.src = slide.bgIframe; f.setAttribute('referrerpolicy', 'no-referrer'); f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); el.appendChild(f); }
  else { el.style.background = slide.background; el.style.opacity = slide.bgOpacity / 100; }
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

// Font size that makes a text box's content fill it (reveal's r-fit-text):
// binary search on the real rendering. `shrinkOnly` never grows it.
export function fitFontSize(b, shrinkOnly = false) {
  const el = stage.querySelector(`.block[data-id="${b.id}"] .rich`); if (!el) return b.fontSize || 40;
  const probe = el.cloneNode(true); probe.removeAttribute('contenteditable');
  Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', left: '-99999px', top: '0', width: b.w + 'px', height: 'auto', display: 'block' });
  stage.appendChild(probe);
  const fits = size => { probe.style.fontSize = size + 'px'; probe.style.columnCount = ''; return probe.scrollHeight <= b.h + 1 && probe.scrollWidth <= b.w + 1; };
  let lo = 8, hi = shrinkOnly ? (b.fontSize || 40) : 400;
  if (shrinkOnly && fits(hi)) { probe.remove(); return hi; }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fits(mid)) lo = mid; else hi = mid; }
  probe.remove();
  return lo;
}
export function fitTextToBox(b) { const size = fitFontSize(b); commit(() => { b.fontSize = size; }); }

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
    if (c && !el.classList.contains('editing') && (c.dataset.src !== (b.code || '') || c.dataset.lang !== (b.lang || ''))) paintCode(c, b);
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
  del.className = 'handle-del'; del.title = t('Borrar'); del.setAttribute('aria-label', t('Borrar'));
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
  else if (b.type === 'math') setupMath(el, b);
  return el;
}
