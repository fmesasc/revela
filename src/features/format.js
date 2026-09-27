// Text formatting for the selected text block.
//
// Two kinds of formatting:
//  - Character formatting (bold, italic, colour, …) acts on the current text
//    selection through execCommand.
//  - Box-level formatting (alignment, font family, font size) applies to the
//    whole text box, so it works whether or not text is selected — matching
//    what people expect from PowerPoint and OnlyOffice.

import { commit, selectedBlock } from '../core/store.js';

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
export const color = v => exec('foreColor', v);
export const highlight = v => exec('hiliteColor', v);
export function link() {
  const c = ctx(); if (!c) return;
  const url = prompt('Dirección del enlace (URL):', 'https://');
  if (url) exec('createLink', url);
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
  commit(() => { c.b.fontFamily = value; });
}
export function setFontSize(px) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.fontSize = Math.max(8, px); });
}
export function fontSize(delta) {
  const c = ctx(); if (!c) return;
  commit(() => { c.b.fontSize = Math.max(8, (c.b.fontSize || 40) + delta); });
}
