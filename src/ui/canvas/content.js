// What each object shows on the canvas and how it is edited in place: text,
// equations (KaTeX), code (highlight.js), tables, embeds, 3D models, slide links.

import { diagramHTML, diagramSig } from '../../render/diagrams.js';
import { wordartSize } from '../../render/textfit.js';
import { diagramOpts } from '../../features/document/blocks.js';
import { showTextRuler, hideTextRuler } from './textruler.js';
import { tabRuntime } from '../../io/runtime/tabs.js';
import { sizeText } from '../../features/content/files.js';
import { fileIconHTML, imgFocus } from '../../render/svg.js';
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
import { cameraView } from './cameraview.js';
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
  img.style.objectPosition = imgFocus(b);
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
  rich.style.fontSize = wordartSize(b) + 'px';               // (Text Art: smaller if it doesn't fit, see render/textfit.js)
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
  // (Vertical alignment on the block itself — align-content —, not as a flex column, where each bold word would be a line.)
  rich.style.alignContent = { top: 'start', middle: 'center', bottom: 'end' }[b.vAlign] || '';
  applyWordart(rich, b.wordart, b.wordartColor);
  if (!b.wordart) rich.style.color = b.color || '';        // after WordArt, which resets it
  if (!b.wordart) rich.style.fontWeight = b.fontWeight || '';
  rich.style.fontStyle = b.fontStyle || '';
  rich.style.whiteSpace = /\t/.test(b.html || '') ? 'pre-wrap' : '';      // (tabs: kept, laid out at their stops)
  rich.style.tabSize = '96px';
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
// Tab stops: laid out once the text is on the page (it has to be measured).
let tabs = null;
export function paintTabs(rich, b) {
  rich.dataset.tabsig = JSON.stringify(b.tabs || []);
  if (!/\t/.test(b.html || '')) return;
  const go = () => { if (rich.isConnected && rich.contentEditable !== 'true') (tabs ||= tabRuntime()).layout(rich, b.tabs || []); };
  requestAnimationFrame(go); document.fonts?.ready.then(go);          // (again once the fonts have arrived: widths change)
}
// While writing: the stops laid out too, the caret kept where it was (by its
// place in the text, which laying out doesn't change); the model keeps plain tabs.
// (Chrome wraps a typed tab in its own <span style="white-space:pre">: unwrapped too.)
const unTab = h => h.replace(/<span class="rv-tab"[^>]*>([^<]*)<\/span>/g, '$1').replace(/<span style="white-space: ?pre;?">(\t+)<\/span>/g, '$1');
function caretOffset(root) {
  const sel = getSelection(); if (!sel.rangeCount || !root.contains(sel.anchorNode)) return -1;
  const r = document.createRange(); r.selectNodeContents(root); r.setEnd(sel.anchorNode, sel.anchorOffset); return r.toString().length;
}
function setCaret(root, n) {
  if (n < 0) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t;
  while ((t = w.nextNode())) {
    if (n <= t.nodeValue.length) {
      // (at the very end of a tab: just after it, not inside it)
      if (n === t.nodeValue.length && t.parentNode.classList?.contains('rv-tab')) { const r = document.createRange(); r.setStartAfter(t.parentNode); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r); return; }
      const r = document.createRange(); r.setStart(t, n); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r); return;
    }
    n -= t.nodeValue.length;
  }
}
export function liveTabs(rich, b) {
  if (!/\t/.test(rich.textContent)) return;
  const at = caretOffset(rich);
  (tabs ||= tabRuntime()).layout(rich, b.tabs || []);
  setCaret(rich, at);
}
let tabTimer = 0;
export function content(b) {
  if (b.type === 'text') {
    const d = document.createElement('div');
    d.className = 'rich';
    d.spellcheck = true;
    if (b.ph) d.dataset.ph = t(PH_PROMPT[b.ph] || PH_PROMPT.body);
    styleRich(d, styled(b, currentSlide()));
    d.innerHTML = b.html || ''; d.dataset.msrc = b.html || '';
    if (hasInlineMath(b.html)) renderInlineMath(d);
    paintTabs(d, b);
    return d;
  }
  if (b.type === 'model') {
    const mv = document.createElement('model-viewer');
    applyModelAttrs(mv, b);
    // While it loads: a small ring in its middle, instead of model-viewer's grey bar along its top edge.
    const busy = document.createElement('div'); busy.slot = 'progress-bar'; busy.className = 'mv-loading';
    mv.addEventListener('progress', e => busy.classList.toggle('done', (e.detail?.totalProgress ?? 0) >= 1));
    mv.addEventListener('load', () => busy.classList.add('done'));
    mv.appendChild(busy);
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
  if (b.type === 'magnify') { const d = document.createElement('div'); d.className = 'magnify'; return d; }   // (painted by magnifyview.js)
  if (b.type === 'table') return tableContent(b);
  if (b.type === 'file') { const d = document.createElement('div'); d.className = 'file-blk'; paintFile(d, b); return d; }
  if (b.type === 'diagram') { const d = document.createElement('div'); d.className = 'diagram-blk'; d.dataset.sig = diagramSig(b); d.innerHTML = diagramHTML(b, diagramOpts()); return d; }
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
  if (b.type === 'camera') return cameraView(b);
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
  const p = loadScript(`${KATEX}/katex.min.js`, 'katex');
  if (!window.katex) p.then(() => setTimeout(() => redrawPendingMath(), 0), () => {});
  return p;
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
// An equation: a mistake in the LaTeX shows the source in red, marked (and its
// message on hover) instead of an empty box; accented text (\text{Previsión},
// or "ó" typed in the formula) is drawn as is (strict: 'ignore').
export function renderMath(el, latex) {
  el.dataset.latex = latex || '';
  ensureKatex().then(() => katexInto(el, latex || '')).catch(() => { el.textContent = latex || ''; });
}
function katexInto(el, tex) {
  if (el.dataset.latex !== tex) return;              // (changed again while KaTeX was loading)
  el.classList.remove('math-error'); el.removeAttribute('title');
  try { window.katex.render(tex, el, { throwOnError: true, displayMode: true, strict: 'ignore' }); }
  catch (e) {
    try { window.katex.render(tex, el, { throwOnError: false, displayMode: true, strict: 'ignore' }); } catch { el.textContent = tex; }
    if (!el.textContent.trim()) el.textContent = tex;
    el.classList.add('math-error'); el.title = String(e?.message || e).replace(/^KaTeX parse error: /, '');
  }
}
// The first equations may be drawn while KaTeX is still loading: once it is
// there, any one left without its drawing is drawn (the editor and thumbnails).
export function redrawPendingMath(root = document) {
  if (!window.katex) return 0;
  let n = 0;
  root.querySelectorAll('.math-blk[data-latex]').forEach(el => { if (!el.querySelector('.katex, .katex-error') && !el.classList.contains('math-error')) { katexInto(el, el.dataset.latex); n++; } });
  return n;
}
// When the stylesheet arrives after the script, KaTeX measured without it: draw them again then.
document.addEventListener('load', e => {
  if (window.katex && e.target?.tagName === 'LINK' && e.target.href.includes('katex')) document.querySelectorAll('.math-blk[data-latex]').forEach(el => katexInto(el, el.dataset.latex));
}, true);
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
    const td = e.target.closest('td'); td.focus();
    if (e.isTrusted) selectWordAt(td, e.clientX, e.clientY);
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
// The word under the pointer selected, as a double-click does in any editor (the
// text only becomes editable on that double-click, so the browser doesn't; focus
// alone would leave the caret at the start). False if the point isn't in the text.
function selectWordAt(rich, x, y) {
  const pos = document.caretPositionFromPoint?.(x, y), alt = pos ? null : document.caretRangeFromPoint?.(x, y);
  const node = pos ? pos.offsetNode : alt?.startContainer, off = pos ? pos.offset : alt?.startOffset;
  if (!node || !rich.contains(node)) return false;
  const r = document.createRange();
  if (node.nodeType === Node.TEXT_NODE) {
    const s = node.nodeValue, word = /[\p{L}\p{N}_'’]/u; let a = off, z = off;
    while (a > 0 && word.test(s[a - 1])) a--;
    while (z < s.length && word.test(s[z])) z++;
    r.setStart(node, a); r.setEnd(node, z);
  } else { r.setStart(node, off); r.collapse(true); }
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  return true;
}
export function setupText(b, el) {
  const rich = el.querySelector('.rich');
  el.addEventListener('dblclick', e => {
    if (readOnly()) return;
    // Show the raw source (with $…$) while editing, not the rendered math.
    if (rich.dataset.msrc !== undefined) { rich.innerHTML = b.html || ''; rich.dataset.msrc = ''; }
    rich.contentEditable = 'true'; rich.focus(); el.classList.add('editing');
    if (e.isTrusted) selectWordAt(rich, e.clientX, e.clientY);
    showTextRuler(el, b); liveTabs(rich, b);
  });
  rich.addEventListener('input', e => {             // no re-render: keep the caret
    if (e.inputType === 'insertText') autocorrectAtCaret(rich);
    b.html = unTab(rich.innerHTML);
    if (/\t/.test(b.html)) { clearTimeout(tabTimer); tabTimer = setTimeout(() => liveTabs(rich, b), 150); }
    // "Shrink text on overflow": reduce the size while it doesn't fit.
    if (b.shrink && (rich.scrollHeight > rich.clientHeight + 1)) { b.fontSize = fitFontSize(b, true); rich.style.fontSize = b.fontSize + 'px'; }
    else if (b.wordart) rich.style.fontSize = wordartSize(b) + 'px';            // (Text Art fits as it is written)
    if (b.ph && isEmptyPlaceholder(b)) b.html = '';   // back to the prompt when emptied
  });
  // Tab / Shift+Tab inside a list: nest / un-nest the item (bullet levels);
  // elsewhere, Tab writes a tab (to the next tab stop, as in PowerPoint).
  rich.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const sel = window.getSelection();
    const li = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('li');
    if (!li || !rich.contains(li)) {
      if (e.shiftKey) return;
      e.preventDefault(); rich.style.whiteSpace = 'pre-wrap';
      document.execCommand('insertText', false, '\t'); b.html = unTab(rich.innerHTML); liveTabs(rich, b);
      return;
    }
    e.preventDefault();
    document.execCommand(e.shiftKey ? 'outdent' : 'indent');
    b.html = rich.innerHTML;
  });
  rich.addEventListener('blur', () => {
    rich.contentEditable = 'false'; el.classList.remove('editing'); hideTextRuler();
    commit(() => { b.html = unTab(rich.innerHTML); });   // what was typed is one undo step
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
  for (const name of ['auto-rotate', 'auto-rotate-delay', 'rotation-per-second', 'autoplay', 'animation-name', 'data-once', 'data-speed', 'data-motion', 'camera-orbit', 'data-bleed', 'data-arrive',
    'data-move-clip', 'data-end-clip', 'data-end-once', 'data-face', 'data-look', 'animation-crossfade-duration', 'data-puppet', 'data-puppet-mirror', 'data-puppet-preview'])
    if (!want.has(name) && mv.hasAttribute(name)) mv.removeAttribute(name);   // only ours: model-viewer adds its own
  for (const [k, v] of want) if (mv.getAttribute(k) !== v) mv.setAttribute(k, v);
  const sp = b.clipSpeed || 1; if (mv.timeScale !== sp) mv.timeScale = sp;
  // Room around it: the view overflows the box by as much on every side.
  const k = modelBleed(b), m = `${-(k - 1) * 50}%`;
  mv.style.position = k > 1 ? 'absolute' : ''; mv.style.inset = k > 1 ? `${m} ${m}` : '';
  mv.style.width = mv.style.height = k > 1 ? `${k * 100}%` : '';
  // Faded edges (or none: a faded, much bigger view).
  const fade = b.edge === 'fade' || b.edge === 'free';
  for (const p of ['maskImage', 'webkitMaskImage']) mv.style[p] = fade ? EDGE_MASK : '';
  mv.style.maskComposite = fade ? 'intersect' : ''; mv.style.webkitMaskComposite = fade ? 'source-in' : '';
}
const EDGE_MASK = 'linear-gradient(to right,transparent,#000 12%,#000 88%,transparent),linear-gradient(to bottom,transparent,#000 12%,#000 88%,transparent)';
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
