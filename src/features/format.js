// Text formatting for the selected text block.
//
// Two kinds of formatting:
//  - Character formatting (bold, italic, colour, …) acts on the current text
//    selection through execCommand.
//  - Box-level formatting (alignment, font family, font size) applies to the
//    whole text box, so it works whether or not text is selected — matching
//    what people expect from PowerPoint and OnlyOffice.

import { commit, selectedBlock, selectedBlocks } from '../core/store.js';
import { ensureFont } from './fonts.js';
import { t } from '../i18n.js';
import { promptDialog } from '../ui/dialog.js';

// Format painter: copy a text box's paragraph/character style and apply it.
let styleClip = null;
const STYLE_KEYS = ['fontSize', 'fontFamily', 'textAlign', 'lineHeight', 'letterSpacing',
  'indent', 'bullet', 'numStyle', 'dir', 'vertical'];
export function copyStyle() {
  const b = selectedBlock(); if (!b || b.type !== 'text') return;
  styleClip = {}; for (const k of STYLE_KEYS) if (b[k] !== undefined) styleClip[k] = b[k];
}
export function pasteStyle() {
  if (!styleClip) return;
  const bs = selectedBlocks().filter(b => b.type === 'text'); if (!bs.length) return;
  commit(() => { for (const b of bs) Object.assign(b, styleClip); });
}
export const hasStyleClip = () => !!styleClip;

function ctx() {
  const b = selectedBlock();
  if (!b || b.type !== 'text') return null;
  const el = document.querySelector(`.block[data-id="${b.id}"] .rich`);
  return el ? { b, el } : null;
}

function enterEdit(el) {
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
  promptDialog(t('Enlace: URL, nº de diapositiva o correo:'), 'https://').then(v => {
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
  const c = ctx(); if (!c) return;
  commit(() => { c.b.textAlign = value; });
}
export function fontFamily(value) {
  const c = ctx(); if (!c) return;
  ensureFont(value);
  commit(() => { c.b.fontFamily = value; });
}
export function setFontSize(px) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.fontSize = Math.max(8, px); });
}
export function lineSpacing(value) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.lineHeight = parseFloat(value) || 1.2; });
}
export function letterSpacing(px) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.letterSpacing = parseFloat(px) || 0; });
}
export function indent(px) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.indent = Math.max(0, parseFloat(px) || 0); });
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
  const c = ctx(); if (!c) return;
  commit(() => { c.b.fontSize = Math.max(8, (c.b.fontSize || 40) + delta); });
}
