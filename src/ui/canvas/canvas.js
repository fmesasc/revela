// The editing canvas: renders the current slide and provides comfortable
// direct manipulation — drag from anywhere on a block, snap to alignment
// guides, resize from the corners, edit text on double‑click.

import { blobURL, withBlobs, pruneBlobs } from '../../io/formats/blobmedia.js';
import { diagramHTML, diagramSig } from '../../render/diagrams.js';
import { diagramOpts } from '../../features/document/blocks.js';
import { openDiagramText } from '../dialogs/diagram.js';
import { openFile } from '../../features/content/files.js';
import { shortSig } from '../../core/text.js';
import { opacityOf } from '../../core/model.js';
import { embedSandbox } from '../../features/document/sanitize.js';
import { cleanClasses } from '../../features/design/devmode.js';
import { state, commit, currentSlide, selectedBlock, isSelected, setSelection, docVersion } from '../../core/store.js';
import { lockSVG, lockSig } from '../../render/svg.js';
import { shadowCSS, levelCSS, shapeSVG, shapeSig, chartSVG, chartSig, iconSVG, iconSig, inkSVG, timerSVG, curvedTextSVG, hasShapeText, shapeTextStyle, wrapFor, timerSig, inkSig, tableClass, tableVars } from '../../render/svg.js';
import { figuresMap, captionLine } from '../../features/document/captions.js';
import { blockPreview } from '../shell/preview.js';
import { t } from '../../i18n/index.js';
import { deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { motionPoints, motionFrames, pathTurns, animsOf, offsetBefore } from '../../features/animation/transitions.js';
import { drawPathHandles } from './pathdraw.js';
import { blockLabel } from '../../features/document/a11y.js';
import { pollEditorHTML } from '../../features/live/poll.js';
import { masterBlocksFor, PH_PROMPT, styled, viewBackground } from '../../features/document/master.js';
import { stageBackground } from '../../io/formats/html.js';
import { styleRich, paintWebCard, paintMath, pollSig, renderSlideRef, figIndexHTML, connectorHTML, applyImgStyle, applyModelAttrs, content, hostOf, hasInlineMath, renderInlineMath, paintCode, setupCode, tableSig, fillTable, fileSig, paintFile, paintTabs, setupTable, setupText, setupMath, setupModel, setupEmbed } from './content.js';
import { mediaViewCurrent } from './mediaview.js';
import { cameraViewCurrent, syncCameras } from './cameraview.js';
import { syncPuppet } from './puppetview.js';
import { paintMagnify, setupMagnify } from './magnifyview.js';
import { addGuideFromRuler, drawPGuides, startMarquee, startDrag, startRotate, startResize } from './interact.js';
import { initHover } from './hover.js';

export const findBlock = id => currentSlide().blocks.find(x => x.id === id);

// "Marked as final": no direct manipulation (the banner flashes to say why).
export const readOnly = () => { if (!state.deck.final && !state.ui.lock) return false; window.dispatchEvent(new Event('revela:readonly')); return true; };
export let stage;

export function initCanvas() {
  stage = document.getElementById('stage');
  // Master text levels (sizes and bullets per list level) on the canvas.
  const lv = document.createElement('style'); lv.textContent = levelCSS('#stage '); document.head.appendChild(lv);
  stage.addEventListener('pointerdown', e => {
    if (e.target === stage) startMarquee(e);
  });
  // Click a ruler to drop a placeable guide.
  document.getElementById('ruler-h')?.addEventListener('pointerdown', e => addGuideFromRuler(e, 'v'));
  document.getElementById('ruler-v')?.addEventListener('pointerdown', e => addGuideFromRuler(e, 'h'));
  initHover();
}

// The text of a flipped shape, flipped back: the shape mirrors, its words don't.
export const unflip = b => (b.flipH || b.flipV ? `scale(${b.flipH ? -1 : 1},${b.flipV ? -1 : 1})` : '');
// CSS transform for a block: rotation plus optional mirror flips.
export function transformOf(b) {
  let t = `rotate(${b.rotation || 0}deg)`;
  if (b.flipH) t += ' scaleX(-1)';
  if (b.flipV) t += ' scaleY(-1)';
  return t;
}

let lastSignature = '', prunedAt = -1, prunedTime = 0;

// The signature captures everything that requires a full rebuild (which slide,
// which blocks in which order, and the slide size). Selection, position, size,
// text and other in‑place edits do NOT change it, so they are reconciled onto
// the existing DOM instead of rebuilding it. Rebuilding on selection was what
// broke double‑click‑to‑edit and mid‑drag interaction.
function signature(slide) {
  // (A web page shown as a card instead of a frame is a different element.)
  return slide.id + '|' + slide.blocks.map(b => b.id + (b.display === 'card' ? ':card' : '')).join(',')
    + '|' + state.deck.size.w + 'x' + state.deck.size.h;
}

export function renderCanvas() {
  const slide = currentSlide();
  const { w, h } = state.deck.size;
  stage.style.width = w + 'px';
  stage.style.height = h + 'px';
  // (A layout without a background of its own shows its master's.)
  stage.style.background = withBlobs((slide.background ? stageBackground(slide) : null) || (state.ui.editMaster ? viewBackground(slide) : null) || state.deck.slides[state.ui.slideIndex]?.background || '#101317');
  // (Now and then, the addresses of files no longer in the presentation are let go.)
  if (docVersion() !== prunedAt && Date.now() - prunedTime > 15000) { prunedAt = docVersion(); prunedTime = Date.now(); pruneBlobs(state.deck); }
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
    // (Magnifiers again, now that what they show of the canvas — equations, code — is on it.)
    for (const b of slide.blocks) if (b.type === 'magnify') paintMagnify(stage.querySelector(`.block[data-id="${b.id}"]`), b);
  } else {
    for (const b of slide.blocks) reconcile(b);
  }
  drawPGuides();
  drawLogo();
  drawCaptions();
  drawMotionPath();
  drawMasterLayer();
  drawBgMedia(slide);
  sideHandles();
  fitPictureBox();
  syncCameras(stage);
  syncPuppet(stage, slide);
  // Screen readers: name the slide and announce the selected object.
  stage.setAttribute('aria-label', `${t('Diapositiva')} ${state.ui.slideIndex + 1} / ${state.deck.slides.length}`);
  const sel = selectedBlock(), sr = document.getElementById('sr-status');
  const msg = sel ? `${t('Seleccionado')}: ${blockLabel(sel, t)}` : '';
  if (sr && sr.textContent !== msg) sr.textContent = msg;
}

// The side handles only where there's room on screen: on a thin object they'd cover the
// middle, where it is grabbed to move it.
function sideHandles() {
  for (const el of stage.querySelectorAll('.block.selected')) {
    const hd = el.querySelector('.handle-size.nw'); if (!hd) continue;   // (a corner: always shown)
    const r = el.getBoundingClientRect(), k = hd.getBoundingClientRect().width * 3.5;
    el.classList.toggle('thin-h', r.height < k); el.classList.toggle('thin-w', r.width < k);
  }
}

// A whole picture ("contain") in a box of another proportion shows bands around it, and its
// handles stand off its edges: selected, the box takes the picture's own shape (what shows
// doesn't change, only the box). Once the picture has loaded; not cropped, framed or deformed ones.
function fitPictureBox() {
  const b = selectedBlock();
  if (!b || b.type !== 'image' || (b.fit || 'contain') !== 'contain' || b.device || b.crop || b.locked || state.ui.lock || state.deck.final) return;
  const img = stage.querySelector(`.block[data-id="${b.id}"] img`); if (!img) return;
  if (!img.complete || !img.naturalWidth) { img.addEventListener('load', () => { if (selectedBlock() === b) fitPictureBox(); }, { once: true }); return; }
  const r = img.naturalWidth / img.naturalHeight; if (!(r > 0) || !(b.w > 0 && b.h > 0) || Math.abs(b.w / b.h - r) / r < 0.01) return;
  const w = Math.round(Math.min(b.w, b.h * r)), h = Math.round(w / r);
  commit(() => { Object.assign(b, { x: Math.round(b.x + (b.w - w) / 2), y: Math.round(b.y + (b.h - h) / 2), w, h }); }, { history: false });
}

// Video / web page / translucent image behind the slide (Design ▸ Format background).
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
  else if (slide.bgIframe) { const f = document.createElement('iframe'); f.src = slide.bgIframe; f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); f.setAttribute('sandbox', embedSandbox(slide.bgIframe, 'allow-scripts')); el.appendChild(f); }
  else { el.style.background = withBlobs(slide.background); el.style.opacity = slide.bgOpacity / 100; }
}

// Master objects, drawn (not editable) under the slide's own objects.
function drawMasterLayer() {
  const blocks = state.ui.editMaster ? [] : masterBlocksFor(currentSlide());
  const sig = shortSig(blocks);
  let layer = stage.querySelector('.master-layer');
  if (!blocks.length) { layer?.remove(); return; }
  if (!layer) { layer = document.createElement('div'); layer.className = 'master-layer'; }
  if (stage.firstChild !== layer) stage.insertBefore(layer, stage.firstChild);
  if (layer.dataset.sig === sig) return;
  layer.dataset.sig = sig; layer.innerHTML = '';
  for (const b of blocks) layer.appendChild(blockPreview(b));
}

// Font size that makes a text box's content fill it (reveal's r-fit-text):
// binary search on the real rendering. `shrinkOnly` never grows it (past `top`: by default its own size).
export function fitFontSize(b, shrinkOnly = false, top = null) {
  const el = stage.querySelector(`.block[data-id="${b.id}"] .rich`); if (!el) return b.fontSize || 40;
  const probe = el.cloneNode(true); probe.removeAttribute('contenteditable');
  Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', left: '-99999px', top: '0', width: b.w + 'px', height: 'auto', display: 'block' });
  stage.appendChild(probe);
  const fits = size => { probe.style.fontSize = size + 'px'; probe.style.columnCount = ''; return probe.scrollHeight <= b.h + 1 && probe.scrollWidth <= b.w + 1; };
  let lo = 8, hi = shrinkOnly ? (top || b.fontSize || 40) : 400;
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

// Dashed guides of the selected object's motion paths (one after another, each
// from where the previous one leaves it), numbered when there are several.
function drawMotionPath() {
  stage.querySelectorAll('.motion-path, .mp-h').forEach(n => n.remove());
  const b = selectedBlock(); if (!b) return;
  const all = animsOf(b), paths = all.map((a, i) => [a, i]).filter(([a]) => a.effect === 'path' && (a.dx || a.dy || a.points));
  if (!paths.length) return;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'motion-path'); svg.setAttribute('width', 1); svg.setAttribute('height', 1);
  svg.style.left = '0px'; svg.style.top = '0px';
  let body = `<defs><marker id="mp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">`
    + `<path d="M0,0 L10,5 L0,10 z" fill="#e0873b"/></marker></defs>`;
  for (const [a, i] of paths) {
    const [ox, oy] = offsetBefore(b, i), x1 = b.x + b.w / 2 + ox, y1 = b.y + b.h / 2 + oy, x2 = x1 + (a.dx || 0), y2 = y1 + (a.dy || 0);
    const pts = motionPoints(a).map(([x, y]) => `${(x1 + x).toFixed(1)},${(y1 + y).toFixed(1)}`).join(' ');
    body += `<polyline points="${pts}" fill="none" stroke="#e0873b" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#mp-arrow)"/>`
      // Where it ends (turned as it will be, if it turns on the way).
      + `<rect x="${x2 - b.w / 2}" y="${y2 - b.h / 2}" width="${b.w}" height="${b.h}" fill="none" stroke="#e0873b" stroke-width="2" stroke-dasharray="4 4" opacity=".7"`
      + `${pathTurns(a) && b.type !== 'model' ? ` transform="rotate(${(i ? 0 : b.rotation || 0) + motionFrames(a).at(-1)[2]} ${x2} ${y2})"` : ''}/>`
      + (paths.length > 1 ? `<circle cx="${x1 + 16}" cy="${y1 - 16}" r="12" fill="#e0873b"/><text x="${x1 + 16}" y="${y1 - 11}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="system-ui">${paths.findIndex(p => p[1] === i) + 1}</text>` : '');
  }
  svg.innerHTML = body;
  stage.appendChild(svg);
  for (const [, i] of paths) drawPathHandles(b, i);
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
  if (el._src !== logo.src) { el.src = logo.src; el._src = logo.src; }
  el.style.height = (logo.size || 120) + 'px';
  const p = logo.position || 'br', m = '16px';
  for (const s of ['left', 'right', 'top', 'bottom']) el.style[s] = '';
  el.style[p.includes('r') ? 'right' : 'left'] = m;
  el.style[p[0] === 'b' ? 'bottom' : 'top'] = m;
}

// Update an existing block element from the model without recreating it, so
// interaction (editing, dragging) is never interrupted.
// Text inside a shape: a text layer over it, edited like a text box (double-click, or type).
function paintShapeText(el, b) {
  if (!hasShapeText(b)) { el.querySelector(':scope > .shape-text')?.remove(); return; }
  let rich = el.querySelector(':scope > .shape-text');
  if (!rich) { rich = document.createElement('div'); rich.className = 'rich shape-text'; rich.spellcheck = true; el.insertBefore(rich, el.firstElementChild?.nextSibling || null); }
  styleRich(rich, shapeTextStyle(b));
  rich.style.transform = unflip(b);                          // (a flipped shape — a speech bubble pointing the other way —: its text reads as before)
  if (!el.classList.contains('editing') && rich.dataset.msrc !== (b.html || '')) { rich.innerHTML = b.html || ''; rich.dataset.msrc = b.html || ''; }
}
// Text wrapping round a picture marked "text around": a gap in its lines (see wrapFor).
function paintWrap(el, b) {
  const rich = el.querySelector(':scope > .rich'); if (!rich) return;
  const w = wrapFor(b, currentSlide());
  if (w) { rich.dataset.wrap = w.side; rich.style.setProperty('--ww', w.w + 'px'); rich.style.setProperty('--wh', w.h + 'px'); rich.style.setProperty('--wt', w.top + 'px'); }
  else if (rich.dataset.wrap) delete rich.dataset.wrap;
}
// Curved text: the words along an arc over the box (the text itself, hidden, is what is edited).
function paintCurve(el, b) {
  let arc = el.querySelector(':scope > .curve-arc');
  el.classList.toggle('curved', !!b.curve);
  if (!b.curve) { arc?.remove(); return; }
  const st = styled(b, currentSlide()), sig = JSON.stringify([b.curve, b.html, b.w, b.h, st.fontSize, st.color, st.fontFamily, st.fontWeight]);
  if (!arc) { arc = document.createElement('div'); arc.className = 'curve-arc'; el.appendChild(arc); }
  if (arc.dataset.sig === sig) return;
  arc.dataset.sig = sig; arc.innerHTML = curvedTextSVG({ ...b, fontSize: st.fontSize, fontWeight: st.fontWeight });
  Object.assign(arc.style, { color: st.color || '', fontFamily: st.fontFamily || '' });
}
function reconcile(b) {
  const el = stage.querySelector(`.block[data-id="${b.id}"]`);
  if (!el) return;
  // After undo/redo the objects are other copies: the element's handlers
  // (drag, resize, typing) hold the old one, so it is made again.
  if (el._b !== b) { el.replaceWith(blockEl(b)); return; }
  el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
  el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
  el.style.transform = transformOf(b);
  el.style.opacity = opacityOf(b) < 1 ? opacityOf(b) : '';
  el.style.filter = shadowCSS(b);
  el.classList.toggle('selected', isSelected(b.id));
  el.setAttribute('aria-label', blockLabel(b, t));
  // Comment marker on objects with open comments.
  const nc = (currentSlide().comments || []).filter(c => c.blockId === b.id && !c.resolved).length;
  let badge = el.querySelector(':scope > .cm-badge');
  if (nc && !badge) { badge = document.createElement('span'); badge.className = 'cm-badge'; el.appendChild(badge); }
  if (badge) { if (nc) badge.textContent = nc; else badge.remove(); }
  el.classList.toggle('animated', !!b.animation || !!b.anims?.length);
  el.classList.toggle('locked', !!b.locked);
  el.classList.toggle('is-hidden', !!b.hidden);
  // (Its own classes, for the deck's CSS — developer mode —: the ones it had off, the ones it has now on.)
  const cls = b.cls ? cleanClasses(b.cls) : '';
  if ((el._cls || '') !== cls) { if (el._cls) el.classList.remove(...el._cls.split(' ')); if (cls) el.classList.add(...cls.split(' ')); el._cls = cls; }
  el.classList.toggle('linked', !!(b.href || b.goto || b.popup || b.tip) && b.type !== 'text');
  el.classList.toggle('is-pano', !!b.pano && b.type === 'image'); el.classList.toggle('is-drag', !!b.dragLive);
  // A colour key switched on or off, or a new source for a keyed one: new view.
  if ((b.type === 'image' || b.type === 'video') && !mediaViewCurrent(el, b)) el.firstElementChild.replaceWith(content(b));
  if (b.type === 'text') {
    const rich = el.querySelector('.rich');
    if (rich) {
      styleRich(rich, styled(b, currentSlide()));
      if (b.ph) rich.dataset.ph = t(PH_PROMPT[b.ph] || PH_PROMPT.body); else delete rich.dataset.ph;
      // Not editing: show the (math‑rendered) HTML; re‑render only when it changed.
      if (!el.classList.contains('editing') && (rich.dataset.msrc !== (b.html || '') || rich.dataset.tabsig !== JSON.stringify(b.tabs || []))) {
        rich.innerHTML = b.html || ''; rich.dataset.msrc = b.html || '';
        if (hasInlineMath(b.html)) renderInlineMath(rich);
        paintTabs(rich, b);
      }
    }
    paintCurve(el, b); paintWrap(el, b);
  } else if (b.type === 'image') {
    const pv = el.querySelector(':scope > .media-player'); if (pv) applyImgStyle(pv, b);
    const img = el.querySelector('img'); if (img) { if (img._src !== b.src) { img.src = blobURL(b.src); img._src = b.src; } applyImgStyle(img, b); }
  } else if (b.type === 'model') {
    const mv = el.querySelector('model-viewer'); if (mv) applyModelAttrs(mv, b);
  } else if (b.type === 'video') {
    const v = el.querySelector('video'); if (v && v._src !== b.src) { v.src = blobURL(b.src); v._src = b.src; }
    if (v && (v._poster || '') !== (b.poster || '')) { v.poster = b.poster ? blobURL(b.poster) : ''; v._poster = b.poster || ''; }
  } else if (b.type === 'audio') {
    const a2 = el.querySelector('audio'); if (a2 && a2._src !== b.src) { a2.src = blobURL(b.src); a2._src = b.src; }
  } else if (b.type === 'embed') {
    const card = el.querySelector('.webcard'); if (card) paintWebCard(card, b);
    const f = el.querySelector('iframe');
    if (f && b.srcdoc != null) { if (f._srcdoc !== b.srcdoc) { f.srcdoc = b.srcdoc; f._srcdoc = b.srcdoc; } f.style.background = b.transparent ? 'transparent' : '#fff'; }
    else if (f && f.getAttribute('src') !== b.src) f.src = b.src;
    const u = el.querySelector('.embed-url'); if (u) u.textContent = hostOf(b.src);
    const o = el.querySelector('.embed-open'); if (o && o.getAttribute('href') !== b.src) o.href = b.src;
  } else if (b.type === 'shape') {
    const d = el.querySelector('.shape'); const sig = shapeSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = shapeSVG(b); }
    paintShapeText(el, b);
  } else if (b.type === 'diagram') {
    const d = el.querySelector('.diagram-blk'), sig = diagramSig(b) + JSON.stringify(diagramOpts());
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = diagramHTML(b, diagramOpts()); }
  } else if (b.type === 'file') {
    const d = el.querySelector('.file-blk'); if (d && d.dataset.sig !== fileSig(b)) paintFile(d, b);
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
    if (!cameraViewCurrent(el, b)) el.firstElementChild.replaceWith(content(b));   // (its look changed, or live on/off)
  } else if (b.type === 'ink') {
    const d = el.querySelector('.ink-blk'); const sig = inkSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = inkSVG(b); }
  } else if (b.type === 'icon') {
    const d = el.querySelector('.icon-blk'); const sig = iconSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = iconSVG(b); }
  } else if (b.type === 'math') {
    const d = el.querySelector('.math-blk'); if (d) paintMath(d, b);
  } else if (b.type === 'lock') {
    const d = el.querySelector('.lock-blk'); const sig = lockSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = lockSVG(b); }
  } else if (b.type === 'timer') {
    const d = el.querySelector('.timer-blk'); const sig = timerSig(b);
    if (d && d.dataset.sig !== sig) { d.dataset.sig = sig; d.innerHTML = timerSVG(b); }
  } else if (b.type === 'figindex') {
    const d = el.querySelector('.figindex'); if (d) { d.style.fontSize = (b.fontSize || 28) + 'px'; d.innerHTML = figIndexHTML(b); }
  } else if (b.type === 'slideref') {
    const d = el.querySelector('.slideref'); if (d) renderSlideRef(d, b);
  } else if (b.type === 'magnify') paintMagnify(el, b);
}

function blockEl(b) {
  const el = document.createElement('div');
  el.className = 'block' + (isSelected(b.id) ? ' selected' : '')
    + (b.animation ? ' animated' : '') + (b.locked ? ' locked' : '') + (b.hidden ? ' is-hidden' : '') + (b.type === 'connector' ? ' __conn' : '') + (b.type === 'magnify' ? ' __mag' : '') + (b.cls ? ' ' + cleanClasses(b.cls) : '');
  el._cls = b.cls ? cleanClasses(b.cls) : '';
  el.dataset.id = b.id; el._b = b;
  el.setAttribute('role', 'group'); el.setAttribute('aria-label', blockLabel(b, t));
  el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
  el.style.transform = transformOf(b);
  if (opacityOf(b) < 1) el.style.opacity = opacityOf(b);
  if (b.shadow) el.style.filter = shadowCSS(b);
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
  for (const c of ['nw', 'ne', 'sw', 'se', 'n', 'e', 's', 'w']) {   // (corners, then sides: one dimension)
    const hd = document.createElement('div');
    hd.className = 'handle-size ' + c;
    hd.addEventListener('pointerdown', ev => startResize(ev, b, el, c));
    el.appendChild(hd);
  }

  el.addEventListener('pointerdown', ev => startDrag(ev, b, el));
  if (b.type === 'text') { setupText(b, el); paintCurve(el, b); paintWrap(el, b); }
  else if (hasShapeText(b)) { paintShapeText(el, b); setupText(b, el); }
  else if (b.type === 'model') setupModel(el);
  else if (b.type === 'embed') setupEmbed(el);
  else if (b.type === 'file') el.addEventListener('dblclick', () => openFile(el._b));
  else if (b.type === 'diagram') el.addEventListener('dblclick', () => openDiagramText(el._b));
  // (As in PowerPoint and Slides: double-click a chart for its data, a poll for its question and options.)
  else if (b.type === 'chart') el.addEventListener('dblclick', () => { if (!state.deck.final && !state.ui.lock) import('../dialogs/object.js').then(m => m.openChartData(el._b)); });
  else if (b.type === 'poll') el.addEventListener('dblclick', () => { if (!state.deck.final && !state.ui.lock) import('../dialogs/poll.js').then(m => m.openPollEditor(el._b)); });   // (double-click: its text)   // (double-click: open or download it)
  // (Double-click a picture: crop it on the slide, as in PowerPoint.)
  else if (b.type === 'image') el.addEventListener('dblclick', e => { if (!e.target.closest('.handle-size,.handle-rot')) import('./imagecrop.js').then(m => m.startImageCrop(el._b)); });
  else if (b.type === 'table') setupTable(el, b);
  else if (b.type === 'code') setupCode(el, b);
  else if (b.type === 'math') setupMath(el, b);
  else if (b.type === 'magnify') setupMagnify(el, b);
  return el;
}
