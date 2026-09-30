// What each object shows on the canvas and how it is edited in place: text,
// equations (KaTeX), code (highlight.js), tables, embeds, 3D models, slide links.

import { sizeText } from '../../features/content/files.js';
import { fileIconHTML } from '../../render/svg.js';
import { shortSig } from '../../core/text.js';
import { esc } from '../../core/text.js';
import { shownRows } from '../../core/formulas.js';
import { embedSandbox } from '../../features/document/sanitize.js';
import { state, commit, amend, currentSlide } from '../../core/store.js';
import { borderCSS, tableColsHTML, cellBg, textPadding, webCardHTML, webCardSig, mathTeX, mathCSS, mathSig, shapeSVG, shapeSig, imgFilter, imgOpacity, imgClip, chartSVG, chartSig, connectorSVG, iconSVG, iconSig, applyWordart, tableSpan, inkSVG, timerSVG, deviceStyle, timerSig, inkSig, tableClass, tableVars } from '../../render/svg.js';
import { collectFigures, captionLine, figIndexTitle } from '../../features/document/captions.js';
import { blockPreview } from '../shell/preview.js';
import { t, currentLang } from '../../i18n/index.js';
import { setEmbedDisplay } from '../../features/document/blocks.js';
import { currentPalette } from '../../features/design/palettes.js';
import { cameraRadius } from '../../features/live/media.js';
import { pollEditorHTML, savedVotes } from '../../features/live/poll.js';
import { PH_PROMPT, isEmptyPlaceholder, styled, levelVars, fillPlaceholder } from '../../features/document/master.js';
import { tableBlock, chartBlock } from '../../core/model.js';
import { autocorrectAtCaret } from '../../features/document/autocorrect.js';
import { KATEX, HIGHLIGHT, loadScript, loadStyle } from '../../core/vendor.js';
import { findBlock, readOnly, fitFontSize } from './canvas.js';
import { openMath } from '../dialogs/object.js';
import { keyedView, mediaView } from './mediaview.js';
import { modelAttrs, modelBleed } from '../../features/content/model3d.js';

export const pollSig = b => JSON.stringify([b.kind, b.display, b.question, b.options, b.fontSize, savedVotes(b.pollId)]);
export function renderSlideRef(wrap, b) {
  const target = state.deck.slides.find(s => s.id === b.target) || state.deck.slides[0];
  // Redrawn only when the target slide (or this zoom's size) changed.
  const sig = shortSig([target?.id, target?.blocks, target?.background, b.w, state.deck.size]);
  if (wrap.dataset.sig === sig) return;
  wrap.dataset.sig = sig; wrap.innerHTML = '';
  if (!target) return;
  const { w, h } = state.deck.size;
  const inner = document.createElement('div'); inner.className = 'sr-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${b.w / w});transform-origin:top left;position:relative;background:${target.background}`;
  for (const bl of target.blocks) if (bl.type !== 'slideref') inner.appendChild(blockPreview(bl));
  wrap.appendChild(inner);
}
export function figIndexHTML(b) {
  const figs = collectFigures(state.deck, b && b.kind);
  return `<b>${t(figIndexTitle(b && b.kind))}</b><ul>` + figs.map(f => `<li>${esc(captionLine(f))}</li>`).join('') + `</ul>`;
}
export const connectorHTML = b => {
  const { w, h } = state.deck.size;
  return connectorSVG(b, findBlock(b.from), findBlock(b.to), w, h);
};
export function applyImgStyle(img, b) {
  img.style.objectFit = b.fit || 'contain';
  img.style.filter = imgFilter(b);
  img.style.opacity = imgOpacity(b);
  img.style.clipPath = imgClip(b);
  // Inside a device (phone, laptop…): its frame; none → back as it was.
  const dev = deviceStyle(b) || {};
  for (const k of ['border', 'borderTop', 'borderBottom', 'borderRadius', 'background', 'backgroundOrigin', 'boxShadow', 'boxSizing']) img.style[k] = '';
  Object.assign(img.style, dev);                       // (cleared first: a side left empty would undo the whole border)
}
// Box-level look of a text object (safe while editing: no caret impact). `b`
// has its inherited formatting filled in (master.styled).
export function styleRich(rich, b) {
  rich.style.fontSize = (b.fontSize || 40) + 'px';
  rich.style.textAlign = b.textAlign || 'left';
  rich.style.fontFamily = b.fontFamily || '';
  rich.style.lineHeight = b.lineHeight || '';
  rich.style.letterSpacing = b.letterSpacing ? b.letterSpacing + 'px' : '';
  rich.style.padding = textPadding(b);
  rich.dir = b.dir || '';
  rich.style.writingMode = b.vertical ? 'vertical-rl' : '';
  rich.style.setProperty('--bullet', b.bullet || 'disc');
  rich.style.setProperty('--num', b.numStyle || 'decimal');
  rich.style.background = b.bg || '';
  rich.style.border = b.borderColor ? borderCSS(b.borderColor, b.borderDash) : '';
  rich.style.borderRadius = (b.radius || 0) + 'px';
  const vj = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[b.vAlign];
  rich.style.display = vj ? 'flex' : ''; rich.style.flexDirection = vj ? 'column' : '';
  rich.style.justifyContent = vj || '';
  applyWordart(rich, b.wordart);
  if (!b.wordart) rich.style.color = b.color || '';        // after WordArt, which resets it
  if (!b.wordart) rich.style.fontWeight = b.fontWeight || '';
  rich.style.fontStyle = b.fontStyle || '';
  rich.style.columnCount = b.columns > 1 ? b.columns : '';
  rich.style.columnGap = b.columns > 1 ? '32px' : '';
  // Body levels from the master (sizes and bullets per nesting level).
  rich.classList.toggle('lv', !!b.levels);
  for (let i = 1; i <= 5; i++) ['--l', '--b', '--c'].forEach(v => rich.style.removeProperty(v + i));
  if (b.levels) for (const decl of levelVars(b).split(';').filter(Boolean)) { const [k, ...v] = decl.split(':'); rich.style.setProperty(k, v.join(':')); }
}
function fillMediaPlaceholder(b) {
  if (b.ph === 'table') return fillPlaceholder(b.id, tableBlock({ fontSize: 22 }));
  if (b.ph === 'chart') return fillPlaceholder(b.id, chartBlock());
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => fillPlaceholder(b.id, { type: 'image', src: r.result, fit: 'cover', alt: '' }); r.readAsDataURL(f); };
  inp.click();
}
export function content(b) {
  if (b.type === 'text') {
    const d = document.createElement('div');
    d.className = 'rich';
    d.spellcheck = true;
    if (b.ph) d.dataset.ph = t(PH_PROMPT[b.ph] || PH_PROMPT.body);
    styleRich(d, styled(b, currentSlide()));
    d.innerHTML = b.html || ''; d.dataset.msrc = b.html || '';
    if (hasInlineMath(b.html)) renderInlineMath(d);
    return d;
  }
  if (b.type === 'model') {
    const mv = document.createElement('model-viewer');
    applyModelAttrs(mv, b);
    if (!b.poster) mv.addEventListener('load', () => capturePoster(mv, b.id), { once: true });
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
    const d = document.createElement('div'); d.className = 'math-blk'; paintMath(d, b); return d;
  }
  if (b.type === 'timer') {
    const d = document.createElement('div'); d.className = 'timer-blk'; d.dataset.sig = timerSig(b); d.innerHTML = timerSVG(b); return d;
  }
  if (b.type === 'figindex') {
    const d = document.createElement('div'); d.className = 'figindex';
    d.style.fontSize = (b.fontSize || 28) + 'px'; d.innerHTML = figIndexHTML(b); return d;
  }
  if (b.type === 'slideref') {
    const d = document.createElement('div'); d.className = 'slideref'; renderSlideRef(d, b); return d;
  }
  if (b.type === 'table') return tableContent(b);
  if (b.type === 'file') { const d = document.createElement('div'); d.className = 'file-blk'; paintFile(d, b); return d; }
  if (b.type === 'chart') {
    const d = document.createElement('div'); d.className = 'chart';
    d.dataset.sig = chartSig(b); d.innerHTML = chartSVG(b); return d;
  }
  if (b.type === 'code') {
    const pre = document.createElement('pre'); pre.className = 'code'; pre.style.fontSize = (b.fontSize || 22) + 'px';
    const c = document.createElement('code'); pre.appendChild(c); paintCode(c, b);
    return pre;
  }
  if (keyedView(b)) { const d = mediaView(b); if (b.type === 'image') applyImgStyle(d, b); return d; }
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
  if (b.type === 'placeholder') {
    // An empty picture/table/chart placeholder: click to fill it (not exported).
    const d = document.createElement('div'); d.className = 'ph-media';
    const [icon, label] = { picture: ['image', 'Haz clic para insertar una imagen'], table: ['table', 'Haz clic para insertar una tabla'], chart: ['bar_chart', 'Haz clic para insertar un gráfico'] }[b.ph] || ['add', ''];
    d.innerHTML = `<button type="button" class="ph-media-btn"><i class="ms">${icon}</i><span>${t(label)}</span></button>`;
    const btn = d.querySelector('button');
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => { e.stopPropagation(); if (!readOnly() && !state.ui.editMaster) fillMediaPlaceholder(b); });
    return d;
  }
  return document.createElement('div');
}
export const hostOf = u => { try { return new URL(u).host || u; } catch { return u; } };
// KaTeX for equation blocks, loaded on demand.
export function ensureKatex() {
  loadStyle(`${KATEX}/katex.min.css`);
  return loadScript(`${KATEX}/katex.min.js`, 'katex');
}
export const ensureKatexAuto = () => ensureKatex().then(() => loadScript(`${KATEX}/contrib/auto-render.min.js`, 'renderMathInElement'));
// Render inline $...$ / $$...$$ inside a text element (only when not editing).
export const hasInlineMath = html => /\$[^$]/.test(html || '');
export function renderInlineMath(el) {
  ensureKatexAuto().then(() => {
    try {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
      });
    } catch {}
  }).catch(() => {});
}
export function renderMath(el, latex) {
  el.dataset.latex = latex || '';
  ensureKatex().then(() => {
    try { window.katex.render(latex || '', el, { throwOnError: false, displayMode: true }); }
    catch { el.textContent = latex || ''; }
  }).catch(() => { el.textContent = latex || ''; });
}
// An equation block with its formatting; repainted only when something changed.
export function paintMath(d, b) {
  const sig = mathSig(b); if (d.dataset.sig === sig) return;
  d.dataset.sig = sig; d.style.cssText = mathCSS(b); renderMath(d, mathTeX(b));
}
// Public helper used by the visual equation editor's live preview.
export function renderLatex(el, latex) { renderMath(el, latex); }
// A web embed: a small bar (site + open‑in‑new‑tab) over the iframe. The bar is
// also the fallback when a site refuses to be embedded (X‑Frame‑Options / CSP) —
// Google, most banks and many others always do, and nothing client‑side can
// override that, so at least the link stays reachable.
export function embedContent(b) {
  if (b.display === 'card') {
    const card = document.createElement('div'); card.className = 'webcard';
    paintWebCard(card, b); return card;
  }
  const wrap = document.createElement('div'); wrap.className = 'embed';
  const bar = document.createElement('div'); bar.className = 'embed-bar';
  const url = document.createElement('span'); url.className = 'embed-url'; url.textContent = hostOf(b.src);
  const open = document.createElement('a'); open.className = 'embed-open';
  open.href = b.src; open.target = '_blank'; open.rel = 'noopener';
  open.textContent = 'Abrir ↗'; open.title = 'Abrir en una pestaña nueva';
  open.addEventListener('pointerdown', e => e.stopPropagation());
  // Many sites forbid being shown inside other pages (X-Frame-Options): the
  // browser shows an error and nothing can override it. Offer the card.
  const asCard = document.createElement('button'); asCard.className = 'embed-card';
  asCard.textContent = t('¿No se ve? Mostrar como tarjeta');
  asCard.title = t('Algunas webs no permiten mostrarse dentro de otras páginas: se mostrará una tarjeta que la abre');
  asCard.addEventListener('pointerdown', e => e.stopPropagation());
  asCard.addEventListener('click', e => { e.stopPropagation(); setEmbedDisplay(b.id, 'card'); });
  bar.append(url, asCard, open);
  const f = document.createElement('iframe');
  f.src = b.src || '';
  f.setAttribute('sandbox', embedSandbox(b.src));
  // Only our origin, not the page: YouTube and other players refuse to play
  // without it ("Error 153").
  f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  f.setAttribute('loading', 'lazy');
  f.style.pointerEvents = 'none'; // dragging the body moves the block; double‑click to interact
  wrap.append(bar, f);
  return wrap;
}
export function paintWebCard(card, b) {
  const sig = webCardSig(b); if (card.dataset.sig === sig) return;
  card.dataset.sig = sig; card.innerHTML = webCardHTML(b, t('Abrir la web'));
  // In the editor the card is dragged like any object; its button opens the page.
  const btn = [...card.querySelectorAll('span')].find(s => s.textContent.endsWith('↗'));
  if (!btn) return;
  btn.style.cursor = 'pointer'; btn.classList.add('webcard-open');
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', e => { e.stopPropagation(); window.open(b.src, '_blank', 'noopener'); });
}
// Code blocks edit as plain text on double‑click.
// Syntax colouring in the editor (highlight.js, loaded on first use).
export function loadHljs() {
  loadStyle(`${HIGHLIGHT}/styles/atom-one-dark.min.css`);
  return loadScript(`${HIGHLIGHT}/highlight.min.js`, 'hljs');
}
export function paintCode(c, b) {
  const src = b.code || '';
  c.dataset.src = src; c.dataset.lang = b.lang || ''; c.textContent = src;
  loadHljs().then(h => {
    if (c.dataset.src !== src || c.isContentEditable) return;
    try { c.innerHTML = (b.lang && b.lang !== 'plaintext' && h.getLanguage(b.lang)) ? h.highlight(src, { language: b.lang }).value : h.highlightAuto(src).value; c.classList.add('hljs'); } catch {}
  }).catch(() => {});
}
export function setupCode(el, b) {
  const code = el.querySelector('code');
  el.addEventListener('dblclick', () => { if (readOnly()) return; el.classList.add('editing'); code.textContent = b.code || ''; code.contentEditable = 'true'; code.focus(); });
  code.addEventListener('input', () => { b.code = code.textContent; });
  code.addEventListener('blur', () => {
    code.contentEditable = 'false'; el.classList.remove('editing');
    commit(() => { b.code = code.textContent; });
    paintCode(code, b);
  });
}
// An attached file: a PDF's page (with a badge saying it is a PDF and which page), or its icon.
export const fileSig = b => [b.display, b.poster?.length, b.page, b.name].join('|');
export function paintFile(d, b) {
  d.dataset.sig = fileSig(b);
  d.innerHTML = b.display !== 'icon' && b.poster
    ? `<img src="${b.poster}" draggable="false" alt=""><span class="file-badge"><i class="ms">${b.display === 'viewer' ? 'menu_book' : 'picture_as_pdf'}</i>${b.pages > 1 ? ` ${b.page || 1}/${b.pages}` : ''}</span>`
    : fileIconHTML(b, sizeText(b.bytes || 0, currentLang()));
}
export const tableSig = b => b.rows.length + 'x' + (b.rows[0]?.length || 0) + '|' + JSON.stringify([b.merges || [], b.colW, b.rowH, b.cellBg]);
export function tableContent(b) {
  const t = document.createElement('table'); t.className = tableClass(b);
  t.dataset.sig = tableSig(b); t.style.cssText = tableVars(b);
  fillTable(t, b);
  return t;
}
export function fillTable(t, b) {
  t.innerHTML = tableColsHTML(b);
  const span = tableSpan(b), shown = shownRows(b);
  b.rows.forEach((row, r) => {
    const tr = t.insertRow(); if (b.rowH?.[r]) tr.style.height = b.rowH[r] + 'px';
    row.forEach((cell, c) => {
      const sp = span(r, c); if (!sp) return;              // covered by a merged cell
      const td = tr.insertCell(); td.innerHTML = shown[r][c] || ''; td.dataset.r = r; td.dataset.c = c;
      if (shown[r][c] !== cell) td.classList.add('formula');                  // (its result; the formula itself while editing)
      if (cellBg(b, r, c)) td.style.background = cellBg(b, r, c);
      if (sp.cs > 1) td.colSpan = sp.cs; if (sp.rs > 1) td.rowSpan = sp.rs;
    });
  });
}
// The formulas' results again, in every cell but the one being written in.
function refreshFormulas(t, b) {
  const shown = shownRows(b);
  t.querySelectorAll('td').forEach(td => {
    const r = +td.dataset.r, c = +td.dataset.c;
    if (td === document.activeElement) return;
    if (shown[r][c] !== b.rows[r][c]) { if (td.innerHTML !== shown[r][c]) td.innerHTML = shown[r][c]; td.classList.remove('src'); td.classList.add('formula'); }
    else if (td.matches('.formula, .src')) { td.classList.remove('formula', 'src'); if (td.innerHTML !== (b.rows[r][c] || '')) td.innerHTML = b.rows[r][c] || ''; }
  });
}
// Cells edit on double‑click (like text boxes); Esc / clicking away saves.
export function setupTable(el, b) {
  el.addEventListener('dblclick', e => {
    if (!e.target.closest('td')) return;
    el.classList.add('editing');
    el.querySelectorAll('.tbl td').forEach(td => (td.contentEditable = 'true'));
    e.target.closest('td').focus();
  });
  // A formula cell shows its formula while the caret is in it, and the results come back when it leaves.
  el.addEventListener('focusin', e => { const td = e.target.closest?.('td.formula'); if (td) { td.innerHTML = b.rows[+td.dataset.r][+td.dataset.c] || ''; td.classList.replace('formula', 'src'); } });
  el.addEventListener('focusout', e => { if (e.target.closest?.('td')) setTimeout(() => { const t = el.querySelector('.tbl'); if (t) refreshFormulas(t, b); }, 0); });
  el.addEventListener('input', e => { const td = e.target.closest('td'); if (td) b.rows[+td.dataset.r][+td.dataset.c] = td.innerHTML; });
  el.addEventListener('focusout', () => setTimeout(() => {
    if (!el.contains(document.activeElement)) {
      el.classList.remove('editing');
      el.querySelectorAll('.tbl td').forEach(td => (td.contentEditable = 'false'));
      commit(() => {});
    }
  }, 0));
}
// Start editing a text box without the mouse (just inserted, Enter, F2, or
// typing over it): all its text selected, or the caret at the end.
export function editText(id, { selectAll = true } = {}) {
  const el = document.querySelector(`#stage .block[data-id="${id}"]`), rich = el?.querySelector('.rich'); if (!rich) return false;
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  const r = document.createRange(); r.selectNodeContents(rich); if (!selectAll) r.collapse(false);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  return true;
}
// Double‑click enters content mode: text becomes editable, a model can be
// orbited. Clicking elsewhere leaves it.
export function setupText(b, el) {
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
    // "Shrink text on overflow": reduce the size while it doesn't fit.
    if (b.shrink && (rich.scrollHeight > rich.clientHeight + 1)) { b.fontSize = fitFontSize(b, true); rich.style.fontSize = b.fontSize + 'px'; }
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
    commit(() => { b.html = rich.innerHTML; });   // what was typed is one undo step
  });
}
// An equation is edited in the equation editor: double-click opens it.
export function setupMath(el, b) {
  el.addEventListener('dblclick', e => { if (readOnly()) return; e.stopPropagation(); openMath(b); });
}
// The model's attributes (source, turning, animation) from the block; only
// what changed is touched, so the view doesn't reload.
export function applyModelAttrs(mv, b) {
  const want = new Map(modelAttrs(b));
  for (const name of ['auto-rotate', 'auto-rotate-delay', 'rotation-per-second', 'autoplay', 'animation-name', 'data-once', 'data-speed', 'data-motion', 'camera-orbit', 'data-bleed'])
    if (!want.has(name) && mv.hasAttribute(name)) mv.removeAttribute(name);   // only ours: model-viewer adds its own
  for (const [k, v] of want) if (mv.getAttribute(k) !== v) mv.setAttribute(k, v);
  const sp = b.clipSpeed || 1; if (mv.timeScale !== sp) mv.timeScale = sp;
  // Room around it: the view overflows the box by as much on every side.
  const k = modelBleed(b), m = `${-(k - 1) * 50}%`;
  mv.style.position = k > 1 ? 'absolute' : ''; mv.style.inset = k > 1 ? `${m} ${m}` : '';
  mv.style.width = mv.style.height = k > 1 ? `${k * 100}%` : '';
}
// A picture of the model once it has loaded (its "poster"): the thumbnails, the
// gallery and PowerPoint (which has no 3D) show it instead of a placeholder.
// Only the model's own box, not the room around it; small.
async function capturePoster(mv, id) {
  await new Promise(r => setTimeout(r, 700));                      // (the first frames drawn)
  const b = currentSlide()?.blocks.find(x => x.id === id); if (!b || b.poster || !mv.isConnected || !mv.toDataURL) return;
  try {
    const img = new Image(); img.src = mv.toDataURL('image/png'); await img.decode();
    const k = modelBleed(b), sw = img.width / k, sh = img.height / k, s = Math.min(1, 240 / Math.max(sw, sh));
    const c = document.createElement('canvas'); c.width = Math.round(sw * s); c.height = Math.round(sh * s);
    c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, c.width, c.height);
    const poster = c.toDataURL('image/png');                       // (PNG: transparent, and PowerPoint reads it)
    // (Part of the step that is already there: not a step of its own that an undo would take first.)
    if (poster.length > 200) amend(() => { const x = currentSlide()?.blocks.find(y => y.id === id); if (x && !x.poster) x.poster = poster; });
  } catch {}
}
export function setupModel(el) {
  const mv = el.querySelector('model-viewer');
  el.addEventListener('dblclick', () => { mv.style.pointerEvents = 'auto'; el.classList.add('editing'); });
  el.addEventListener('pointerleave', () => { mv.style.pointerEvents = 'none'; el.classList.remove('editing'); });
}
// A web page embed behaves like a model: drag the frame to move it, double‑click
// to interact with the page, move the pointer away to release it.
export function setupEmbed(el) {
  const f = el.querySelector('iframe'); if (!f) return;
  el.addEventListener('dblclick', () => { f.style.pointerEvents = 'auto'; el.classList.add('editing'); });
  el.addEventListener('pointerleave', () => { f.style.pointerEvents = 'none'; el.classList.remove('editing'); });
}
export function exitEdit(el) {
  const rich = el.querySelector('.rich'); if (rich) rich.blur();
  el.classList.remove('editing');
}
