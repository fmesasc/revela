// Text formatting for the selected text block.
//
// Two kinds of formatting:
//  - Character formatting (bold, italic, colour, …) acts on the current text
//    selection through execCommand.
//  - Box-level formatting (alignment, font family, font size) applies to the
//    whole text box, so it works whether or not text is selected — matching
//    what people expect from PowerPoint and OnlyOffice.

import { commit, selectedBlock, selectedBlocks, currentSlide } from '../../core/store.js';
import { styled } from './master.js';
import { ensureFont } from '../design/fonts.js';
import { t } from '../../i18n/index.js';
import { promptUser } from '../../core/notify.js';
import { hasShapeText, MATH_SIZE } from '../../render/svg.js';

// Format painter: copy a text box's paragraph/character style and apply it.
let styleClip = null;
const STYLE_KEYS = ['fontSize', 'fontFamily', 'textAlign', 'lineHeight', 'letterSpacing',
  'indent', 'bullet', 'numStyle', 'dir', 'vertical', 'fontWeight', 'fontStyle', 'columns'];

// Named text styles (like Word/PowerPoint "Title", "Heading", "Quote"…).
export const TEXT_STYLES = {
  title: { fontSize: 64, fontWeight: '700', fontStyle: '', lineHeight: 1.1, letterSpacing: 0, indent: 0 },
  subtitle: { fontSize: 36, fontWeight: '400', fontStyle: '', lineHeight: 1.2, letterSpacing: 0.5, indent: 0 },
  heading: { fontSize: 44, fontWeight: '700', fontStyle: '', lineHeight: 1.15, letterSpacing: 0, indent: 0 },
  body: { fontSize: 28, fontWeight: '400', fontStyle: '', lineHeight: 1.4, letterSpacing: 0, indent: 0 },
  quote: { fontSize: 30, fontWeight: '400', fontStyle: 'italic', lineHeight: 1.4, letterSpacing: 0, indent: 40 },
  caption: { fontSize: 18, fontWeight: '400', fontStyle: '', lineHeight: 1.3, letterSpacing: 0.3, indent: 0 },
};
export function applyTextStyle(name) {
  const st = TEXT_STYLES[name];
  const bs = selectedBlocks().filter(b => b.type === 'text'); if (!st || !bs.length) return;
  commit(() => { for (const b of bs) { Object.assign(b, st); b.textStyle = name; } });
}
export function setColumns(n) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.columns = Math.max(1, Math.min(4, parseInt(n, 10) || 1)); });
}
// Format painter for any object (PowerPoint's copies a shape's fill and line, a
// picture's corrections and border, a connector's line…): what each kind has
// as its look. Pasting onto another kind takes what the two have in common (a
// shape's text style onto a text box, a text box's border onto a picture…);
// what the original doesn't have is taken away, so both end up alike.
const LOOK = {
  text: [...STYLE_KEYS, 'color', 'bg', 'borderColor', 'borderDash', 'radius', 'shadow', 'vAlign'],
  shape: ['fill', 'fill2', 'gradType', 'gradAngle', 'stroke', 'strokeWidth', 'dash', 'sketch', 'shadow',
    'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'lineHeight', 'color', 'vAlign'],
  image: ['adj', 'shadow', 'radius', 'borderColor', 'borderDash', 'device'],
  connector: ['color', 'width', 'dash', 'arrow', 'arrowStart', 'route'],
  chart: ['color', 'grid', 'dataLabels'],
  table: ['header', 'banded', 'band', 'bandAlpha', 'headBg', 'headFg', 'firstCol', 'stroke', 'fontSize'],
  icon: ['color', 'shadow'],
  math: ['color', 'highlight', 'bold', 'underline', 'bg', 'borderColor', 'radius'],
};
const lookOf = type => LOOK[type] || ['shadow'];
export function copyStyle() {
  const b = selectedBlock(); if (!b) return;
  const keys = lookOf(b.type), values = {};
  for (const k of keys) if (b[k] !== undefined) values[k] = structuredClone(b[k]);
  styleClip = { type: b.type, keys, values };
}
export function pasteStyle() {
  if (!styleClip) return;
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) for (const k of lookOf(b.type)) {
    if (!styleClip.keys.includes(k)) continue;                     // (not something the original has at all)
    if (k in styleClip.values) b[k] = structuredClone(styleClip.values[k]); else delete b[k];
  } });
}
export const hasStyleClip = () => !!styleClip;

// The text being formatted: a text box's, or a shape's (text inside a shape).
function ctx() {
  const b = selectedBlock();
  if (!b || !(b.type === 'text' || hasShapeText(b))) return null;
  const el = document.querySelector(`.block[data-id="${b.id}"] .rich`);
  return el ? { b, el } : null;
}

// Several objects selected: the formatting of the ribbon goes to all of them — every text box and shape with text (as
// PowerPoint: with three boxes selected, «bigger letters» made only the first one bigger). One: as ctx() (the one
// being edited, its selected words for what acts on words).
function ctxs() {
  const bs = selectedBlocks().filter(b => b.type === 'text' || hasShapeText(b));
  if (bs.length < 2) { const c = ctx(); return c ? [c] : []; }
  return bs.map(b => ({ b, el: document.querySelector(`.block[data-id="${b.id}"] .rich`) })).filter(c => c.el);
}
// And the equations among them (their size and alignment are theirs as a whole).
const mathsSel = () => selectedBlocks().filter(b => b.type === 'math');

// An equation has no text selection inside: the ribbon's formatting applies to
// the whole equation (see mathTeX / mathCSS in render/svg.js).
function mathSel() { const b = selectedBlock(); return b && b.type === 'math' ? b : null; }
const MATH_TOGGLES = { bold: 'bold', underline: 'underline' };
function mathFormat(cmd, value) {
  const m = mathSel(); if (!m) return false;
  commit(() => {
    if (MATH_TOGGLES[cmd]) m[MATH_TOGGLES[cmd]] = !m[MATH_TOGGLES[cmd]];
    else if (cmd === 'foreColor') m.color = value;
    else if (cmd === 'hiliteColor') m.highlight = value;
    else if (cmd === 'removeFormat') ['bold', 'underline', 'color', 'highlight'].forEach(k => delete m[k]);
  });
  return true;
}

function enterEdit(el) {
  // Restore the raw source (with $…$) if inline math was rendered.
  if (el.dataset && el.dataset.msrc) { el.innerHTML = el.dataset.msrc; el.dataset.msrc = ''; }
  if (el.getAttribute('contenteditable') !== 'true') {
    el.contentEditable = 'true';
    el.closest('.block')?.classList.add('editing');
  }
  if (document.activeElement !== el) el.focus();
}

function selectAllIfCollapsed(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) {
    const r = document.createRange(); r.selectNodeContents(el);
    sel.removeAllRanges(); sel.addRange(r);
  }
}

// ---- Character formatting (needs a selection) -----------------------------
export function exec(cmd, value = null) {
  // (Several boxes: each one whole — bold, a colour… — as if all its text were selected.)
  const cs = ctxs();
  if (cs.length > 1) {
    const out = cs.map(c => {
      const was = c.el.getAttribute('contenteditable'); c.el.contentEditable = 'true';
      const sel = window.getSelection(), r = document.createRange(); r.selectNodeContents(c.el); sel.removeAllRanges(); sel.addRange(r);
      document.execCommand(cmd, false, value);
      const html = c.el.innerHTML; if (was == null) c.el.removeAttribute('contenteditable'); else c.el.setAttribute('contenteditable', was);
      return [c.b, html];
    });
    window.getSelection().removeAllRanges();
    commit(() => { for (const [b, html] of out) b.html = html; });
    return;
  }
  if (mathFormat(cmd, value)) return;
  const c = ctx(); if (!c) return;
  enterEdit(c.el);
  document.execCommand(cmd, false, value);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
}
// The text cursor in the text box being edited, as offsets in its text ({ id, start, end }; the end of the selected
// text box if it isn't being edited; null without one): it survives the box being redrawn, which a Range doesn't. For
// dialogs that take the focus and then write where the cursor was (Insert ▸ Symbols).
export function caretOf(el) {
  const s = getSelection(); if (!s.rangeCount) return null;
  const r = s.getRangeAt(0); if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) return null;
  const at = (node, off) => { const x = document.createRange(); x.selectNodeContents(el); x.setEnd(node, off); return x.toString().length; };
  return { start: at(r.startContainer, r.startOffset), end: at(r.endContainer, r.endOffset) };
}
export function textCaret() {
  const c = ctx(); if (!c) return null;
  const len = c.el.textContent.length;
  return { id: c.b.id, ...(c.el.isContentEditable && caretOf(c.el) || { start: len, end: len }) };
}
// Into a text box's editing, with the cursor there (a text box shown with its maths drawn goes back to its source first,
// as when editing it: offsets are in that).
export function editAt(el, caret) { enterEdit(el); setTextCaret(el, caret); }
export function setTextCaret(el, { start, end }) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange();
  let n = 0, node, s = null, e = null;
  while ((node = w.nextNode())) {
    const len = node.data.length;
    if (!s && start <= n + len) s = [node, start - n];
    if (!e && end <= n + len) { e = [node, end - n]; break; }
    n += len;
  }
  if (!s || !e) { r.selectNodeContents(el); r.collapse(false); } else { r.setStart(...s); r.setEnd(...e); }
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
// font: a CSS font-family list for this character only (Insert ▸ Symbols, chosen there: a symbol of another font, as
// Word does). Returns whether there was text to insert into.
export function insertSymbol(ch, font = '') {
  const c = ctx(); if (!c) return false;
  enterEdit(c.el);
  if (font) {
    ensureFont(font);
    const e = s => String(s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
    document.execCommand('insertHTML', false, `<span style="font-family:${e(font)}">${e(ch)}</span>`);
  } else document.execCommand('insertText', false, ch);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
  return true;
}
export const color = v => exec('foreColor', v);
export const highlight = v => exec('hiliteColor', v);
// Turn user input into an href: a number → slide, an address → mailto, else URL.
export function normalizeLink(input) {
  const s = (input || '').trim(); if (!s) return null;
  if (/^\d+$/.test(s)) return '#/' + (parseInt(s, 10) - 1);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'mailto:' + s;
  return s;
}
export function link() {
  const c = ctx(); if (!c) return;
  promptUser(t('Enlace: URL, nº de diapositiva o correo:'), 'https://').then(v => {
    const url = normalizeLink(v);
    if (url) exec('createLink', url);
  });
}
export function toggleDir() {
  const cs = ctxs(); if (!cs.length) return;
  const to = cs[0].b.dir === 'rtl' ? 'ltr' : 'rtl';
  commit(() => { for (const c of cs) c.b.dir = to; });
}
export function toggleVertical() {
  const cs = ctxs(); if (!cs.length) return;
  const to = !cs[0].b.vertical;
  commit(() => { for (const c of cs) c.b.vertical = to; });
}
export function changeCase(mode) {
  const c = ctx(); if (!c) return;
  enterEdit(c.el);
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return;
  const text = sel.getRangeAt(0).toString();
  const out = mode === 'upper' ? text.toUpperCase()
    : mode === 'lower' ? text.toLowerCase()
    : text.replace(/\b\w/g, ch => ch.toUpperCase());
  document.execCommand('insertText', false, out);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
}

// Lists apply to the whole box when nothing is selected.
export function list(cmd) {
  if (ctxs().length > 1) return exec(cmd);           // (several boxes: each one whole)
  const c = ctx(); if (!c) return;
  enterEdit(c.el);
  selectAllIfCollapsed(c.el);
  document.execCommand(cmd, false, null);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
}

// ---- Box-level formatting (works with the box selected) -------------------
export function align(value) {
  const cs = ctxs(), ms = mathsSel(); if (!cs.length && !ms.length) return;
  commit(() => { for (const m of ms) m.textAlign = value === 'justify' ? 'center' : value; for (const c of cs) c.b.textAlign = value; });
}
export function fontFamily(value) {
  const cs = ctxs(); if (!cs.length) return;
  ensureFont(value);
  commit(() => { for (const c of cs) c.b.fontFamily = value; });
}
// The size of the whole box (as PowerPoint with the box selected): the sizes inside it — a PowerPoint title comes as
// «MEDSIM<br><span style="font-size:36px">…</span>» — go too, or they hide the box's: its size went down to 8 and the
// title stayed at 36 (Francisco, 2026-10-19). A step up or down (A+ / A−) moves them by as much, so a title of two
// sizes keeps them apart.
const innerSizes = (c, fn) => {
  const editing = c.el?.getAttribute('contenteditable') === 'true';
  const root = editing ? c.el : (c.b.html || '').includes('font-size') ? new DOMParser().parseFromString(`<body>${c.b.html}</body>`, 'text/html').body : null;
  if (!root) return c.b.html;
  root.querySelectorAll('[style*="font-size"]').forEach(e => {
    const v = fn(e.style.fontSize);
    if (v) e.style.fontSize = v; else { e.style.removeProperty('font-size'); if (!e.getAttribute('style')) e.removeAttribute('style'); }
  });
  root.querySelectorAll('font[size]').forEach(e => e.removeAttribute('size'));
  return root.innerHTML;
};
const PX = { px: 1, pt: 4 / 3, em: 0, rem: 0, '%': 0 };
// Some words selected inside the box: the size goes to them alone, as in PowerPoint (Francisco, 2026-10-19: «¿no puedo
// tener diferentes tamaños si selecciono dentro el texto?»). The size field of the ribbon takes the focus — the words
// are no longer selected when it changes —, so the last words selected in a box being edited are kept (as offsets in
// its text) until something else is clicked.
let keptSel = null;
if (typeof document !== 'undefined') {
  document.addEventListener('selectionchange', () => {
    const s = getSelection(); if (!s.rangeCount) return;
    const n = s.getRangeAt(0).startContainer, el = (n.nodeType === 1 ? n : n.parentElement)?.closest?.('.rich[contenteditable="true"]');
    if (!el) return;                                   // (the focus in a field of the ribbon: what was selected stays)
    const at = caretOf(el);
    keptSel = !s.isCollapsed && at && at.end > at.start ? { id: el.closest('.block')?.dataset.id, ...at } : null;
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest?.('#ribbon, .rich')) keptSel = null; }, true);
}
// Whether this box has words selected (now, or kept from before the ribbon took the focus — then selected again).
function wordsSelected(c) {
  const s = getSelection();
  if (c.el.isContentEditable && s.rangeCount && !s.isCollapsed && c.el.contains(s.getRangeAt(0).commonAncestorContainer)) return true;
  if (!keptSel || keptSel.id !== c.b.id) return false;
  enterEdit(c.el); setTextCaret(c.el, keptSel);
  return !getSelection().isCollapsed;
}
// The size where the selection starts: its own (a span's), else the box's.
function sizeAtSelection(c) {
  const s = getSelection(); let n = s.rangeCount ? s.getRangeAt(0).startContainer : null;
  if (n && n.nodeType !== 1) n = n.parentElement;
  for (; n && n !== c.el; n = n.parentElement) { const m = /^([\d.]+)(px|pt)$/.exec(n.style?.fontSize || ''); if (m) return Math.round(+m[1] * PX[m[2]]); }
  return styled(c.b, currentSlide()).fontSize || 40;
}
// The selected words at this size (and those inside them that had another, too); still selected afterwards.
function sizeSelection(c, px) {
  document.execCommand('styleWithCSS', false, false);
  document.execCommand('fontSize', false, '7');
  const spans = [...c.el.querySelectorAll('font[size="7"]')].map(f => {
    const sp = document.createElement('span'); sp.style.fontSize = `${px}px`;
    while (f.firstChild) sp.appendChild(f.firstChild);
    sp.querySelectorAll('[style*="font-size"]').forEach(e => { e.style.removeProperty('font-size'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
    sp.querySelectorAll('font[size]').forEach(e => e.removeAttribute('size'));
    f.replaceWith(sp); return sp;
  });
  if (spans.length) { const r = document.createRange(); r.setStartBefore(spans[0]); r.setEndAfter(spans[spans.length - 1]); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
}
export function setFontSize(px) {
  const cs = ctxs(), ms = mathsSel(); if (!cs.length && !ms.length) return;
  if (cs.length === 1 && !ms.length && wordsSelected(cs[0])) { sizeSelection(cs[0], Math.max(8, Math.round(px))); return; }
  const out = cs.map(c => [c.b, innerSizes(c, () => '')]);
  commit(() => { for (const m of ms) m.fontSize = Math.max(8, px); for (const [b, html] of out) { b.fontSize = Math.max(8, px); if (html !== undefined) b.html = html; } });
}
// The box's line spacing, for all its paragraphs (as PowerPoint with the box selected): their own — every paragraph
// imported from PowerPoint, or pasted, carries one (<p style="line-height:…">) — goes, or it would hide the box's.
const noLineHeight = root => root.querySelectorAll('[style*="line-height"]').forEach(e => { e.style.removeProperty('line-height'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
export function lineSpacing(value) {
  const cs = ctxs(); if (!cs.length) return;
  const out = cs.map(c => {
    const editing = c.el.getAttribute('contenteditable') === 'true';
    let html = c.b.html || '';
    if (editing) { noLineHeight(c.el); html = c.el.innerHTML; }
    else if (html.includes('line-height')) { const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html'); noLineHeight(d.body); html = d.body.innerHTML; }
    return [c.b, html];
  });
  commit(() => { for (const [b, html] of out) { b.lineHeight = parseFloat(value) || 1.2; b.html = html; } });
}
export function letterSpacing(px) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.letterSpacing = parseFloat(px) || 0; });
}
export function indent(px) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.indent = Math.max(0, parseFloat(px) || 0); });
}
export function adjustIndent(delta) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.indent = Math.max(0, (c.b.indent || 0) + delta); });
}
export function setVAlign(v) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.vAlign = v; });
}
export function setBullet(value) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.bullet = value; });
}
export function setNumStyle(value) {
  const cs = ctxs(); if (!cs.length) return;
  commit(() => { for (const c of cs) c.b.numStyle = value; });
}
export function fontSize(delta) {
  // (Each one from its own size: three boxes of 20, 28 and 40 become 24, 32 and 44 — and the sizes inside each, too.)
  const cs = ctxs(), ms = mathsSel(); if (!cs.length && !ms.length) return;
  if (cs.length === 1 && !ms.length && wordsSelected(cs[0])) { sizeSelection(cs[0], Math.max(8, sizeAtSelection(cs[0]) + delta)); return; }
  const step = v => { const m = /^([\d.]+)(px|pt|em|rem|%)$/.exec(v || ''); if (!m) return ''; const k = PX[m[2]];
    return k ? `${Math.max(8, Math.round(+m[1] * k + delta))}px` : `${m[1]}${m[2]}`; };   // (relative ones follow the box's)
  const out = cs.map(c => [c.b, innerSizes(c, step)]);
  commit(() => {
    for (const m of ms) m.fontSize = Math.max(8, (m.fontSize || MATH_SIZE) + delta);
    for (const [b, html] of out) { b.fontSize = Math.max(8, (b.type === 'shape' ? b.fontSize || 28 : styled(b, currentSlide()).fontSize || 40) + delta); if (html !== undefined) b.html = html; }
  });
}
