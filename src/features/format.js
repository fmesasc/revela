// Rich‑text formatting for the selected text block. Formatting acts on the live
// selection inside the editable element via execCommand; font size falls back to
// block‑level styling when there is no selection.

import { commit, selectedBlock } from '../core/store.js';

function editable() {
  const b = selectedBlock();
  if (!b || b.type !== 'text') return null;
  const el = document.querySelector(`.block[data-id="${b.id}"] .rich`);
  return el ? { b, el } : null;
}

// Ensure the block is in edit mode so the command has a caret/selection to work
// on, then run it and persist the resulting HTML.
export function exec(cmd, value = null) {
  const ctx = editable(); if (!ctx) return;
  enterEdit(ctx.el);
  document.execCommand(cmd, false, value);
  commit(() => { ctx.b.html = ctx.el.innerHTML; }, { history: false });
}

export const color = v => exec('foreColor', v);
export const highlight = v => exec('hiliteColor', v);

export function fontSize(delta) {
  const ctx = editable(); if (!ctx) return;
  commit(() => {
    ctx.b.fontSize = Math.max(8, (ctx.b.fontSize || 40) + delta);
    ctx.el.style.fontSize = ctx.b.fontSize + 'px';
  });
}

export function link() {
  const ctx = editable(); if (!ctx) return;
  const url = prompt('Dirección del enlace (URL):', 'https://');
  if (url) exec('createLink', url);
}

// Transform the selected text's case in place.
export function changeCase(mode) {
  const ctx = editable(); if (!ctx) return;
  enterEdit(ctx.el);
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const text = range.toString();
  const transformed =
    mode === 'upper' ? text.toUpperCase() :
    mode === 'lower' ? text.toLowerCase() :
    text.replace(/\b\w/g, c => c.toUpperCase());        // title case
  document.execCommand('insertText', false, transformed);
  commit(() => { ctx.b.html = ctx.el.innerHTML; }, { history: false });
}

function enterEdit(el) {
  if (el.getAttribute('contenteditable') !== 'true') {
    el.contentEditable = 'true';
    el.closest('.block')?.classList.add('editing');
  }
  // Only focus if not already focused — re-focusing can collapse the selection.
  if (document.activeElement !== el) el.focus();
}
