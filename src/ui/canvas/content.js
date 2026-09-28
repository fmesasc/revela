// What each object shows on the canvas and how it is edited in place: text,
// equations (KaTeX), code (highlight.js), tables, embeds, 3D models, slide links.

import { state, commit } from '../../core/store.js';
import { webCardHTML, webCardSig, mathTeX, mathCSS, mathSig, shapeSVG, shapeSig, imgFilter, imgOpacity, imgClip, chartSVG, chartSig, connectorSVG, iconSVG, iconSig, applyWordart, tableSpan, inkSVG, inkSig, tableClass, tableVars } from '../../render/svg.js';
import { collectFigures, captionLine, figIndexTitle } from '../../features/document/captions.js';
import { blockPreview } from '../shell/preview.js';
import { t } from '../../i18n/index.js';
import { setEmbedDisplay } from '../../features/document/blocks.js';
import { currentPalette } from '../../features/design/palettes.js';
import { cameraRadius } from '../../features/live/media.js';
import { pollEditorHTML, savedVotes } from '../../features/live/poll.js';
import { PH_PROMPT, isEmptyPlaceholder } from '../../features/document/master.js';
import { autocorrectAtCaret } from '../../features/document/autocorrect.js';
import { KATEX, HIGHLIGHT, loadScript, loadStyle } from '../../core/vendor.js';
import { findBlock, readOnly, fitFontSize } from './canvas.js';
import { openMath } from '../dialogs/object.js';

export const pollSig = b => JSON.stringify([b.kind, b.display, b.question, b.options, b.fontSize, savedVotes(b.pollId)]);
export function renderSlideRef(wrap, b) {
  wrap.innerHTML = '';
  const target = state.deck.slides.find(s => s.id === b.target) || state.deck.slides[0];
  if (!target) return;
  const { w, h } = state.deck.size;
  const inner = document.createElement('div'); inner.className = 'sr-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${b.w / w});transform-origin:top left;position:relative;background:${target.background}`;
  for (const bl of target.blocks) if (bl.type !== 'slideref') inner.appendChild(blockPreview(bl));
  wrap.appendChild(inner);
}
export function figIndexHTML(b) {
  const figs = collectFigures(state.deck, b && b.kind);
  return `<b>${t(figIndexTitle(b && b.kind))}</b><ul>` + figs.map(f => `<li>${captionLine(f)}</li>`).join('') + `</ul>`;
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
}
export function content(b) {
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
    const d = document.createElement('div'); d.className = 'math-blk'; paintMath(d, b); return d;
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
    const c = document.createElement('code'); pre.appendChild(c); paintCode(c, b);
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
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation');
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
    commit(() => { b.code = code.textContent; }, { history: false });
    paintCode(code, b);
  });
}
export const tableSig = b => b.rows.length + 'x' + (b.rows[0]?.length || 0) + '|' + JSON.stringify(b.merges || []);
export function tableContent(b) {
  const t = document.createElement('table'); t.className = tableClass(b);
  t.dataset.sig = tableSig(b); t.style.cssText = tableVars(b);
  fillTable(t, b);
  return t;
}
export function fillTable(t, b) {
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
export function setupTable(el, b) {
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
    commit(() => { b.html = rich.innerHTML; }, { history: false });
  });
}
// An equation is edited in the equation editor: double-click opens it.
export function setupMath(el, b) {
  el.addEventListener('dblclick', e => { if (readOnly()) return; e.stopPropagation(); openMath(b); });
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
