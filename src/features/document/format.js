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
  const c = ctx(); if (!c) return;
  commit(() => { c.b.columns = Math.max(1, Math.min(4, parseInt(n, 10) || 1)); });
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
  if (mathFormat(cmd, value)) return;
  const c = ctx(); if (!c) return;
  enterEdit(c.el);
  document.execCommand(cmd, false, value);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
}
export function insertSymbol(ch) {
  const c = ctx(); if (!c) return;
  enterEdit(c.el);
  document.execCommand('insertText', false, ch);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
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
  const c = ctx(); if (!c) return;
  commit(() => { c.b.dir = c.b.dir === 'rtl' ? 'ltr' : 'rtl'; });
}
export function toggleVertical() {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.vertical = !c.b.vertical; });
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
  const c = ctx(); if (!c) return;
  enterEdit(c.el);
  selectAllIfCollapsed(c.el);
  document.execCommand(cmd, false, null);
  commit(() => { c.b.html = c.el.innerHTML; }, { history: false });
}

// ---- Box-level formatting (works with the box selected) -------------------
export function align(value) {
  const m = mathSel(); if (m) return commit(() => { m.textAlign = value === 'justify' ? 'center' : value; });
  const c = ctx(); if (!c) return;
  commit(() => { c.b.textAlign = value; });
}
export function fontFamily(value) {
  const c = ctx(); if (!c) return;
  ensureFont(value);
  commit(() => { c.b.fontFamily = value; });
}
export function setFontSize(px) {
  const m = mathSel(); if (m) return commit(() => { m.fontSize = Math.max(8, px); });
  const c = ctx(); if (!c) return;
  commit(() => { c.b.fontSize = Math.max(8, px); });
}
// The box's line spacing, for all its paragraphs (as PowerPoint with the box selected): their own — every paragraph
// imported from PowerPoint, or pasted, carries one (<p style="line-height:…">) — goes, or it would hide the box's.
const noLineHeight = root => root.querySelectorAll('[style*="line-height"]').forEach(e => { e.style.removeProperty('line-height'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
export function lineSpacing(value) {
  const c = ctx(); if (!c) return;
  const editing = c.el.getAttribute('contenteditable') === 'true';
  let html = c.b.html || '';
  if (editing) { noLineHeight(c.el); html = c.el.innerHTML; }
  else if (html.includes('line-height')) { const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html'); noLineHeight(d.body); html = d.body.innerHTML; }
  commit(() => { c.b.lineHeight = parseFloat(value) || 1.2; c.b.html = html; });
}
export function letterSpacing(px) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.letterSpacing = parseFloat(px) || 0; });
}
export function indent(px) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.indent = Math.max(0, parseFloat(px) || 0); });
}
export function adjustIndent(delta) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.indent = Math.max(0, (c.b.indent || 0) + delta); });
}
export function setVAlign(v) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.vAlign = v; });
}
export function setBullet(value) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.bullet = value; });
}
export function setNumStyle(value) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.numStyle = value; });
}
export function fontSize(delta) {
  const m = mathSel(); if (m) return commit(() => { m.fontSize = Math.max(8, (m.fontSize || MATH_SIZE) + delta); });
  const c = ctx(); if (!c) return;
  commit(() => { c.b.fontSize = Math.max(8, (c.b.type === 'shape' ? c.b.fontSize || 28 : styled(c.b, currentSlide()).fontSize || 40) + delta); });
}
