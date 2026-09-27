// Rich‑text formatting for the selected text block. Formatting acts on the live
// selection inside the editable element via execCommand; font size and colour
// fall back to block‑level styling when there is no selection.

import { commit, selectedBlock } from '../core/store.js';

function editable() {
  const b = selectedBlock();
  if (!b || b.type !== 'text') return null;
  const el = document.querySelector(`.block[data-id="${b.id}"] .rich`);
  return el ? { b, el } : null;
}

export function exec(cmd) {
  const ctx = editable(); if (!ctx) return;
  ctx.el.focus();
  document.execCommand(cmd, false, null);
  commit(() => { ctx.b.html = ctx.el.innerHTML; }, { history: false });
}

export function color(value) {
  const ctx = editable(); if (!ctx) return;
  ctx.el.focus();
  document.execCommand('foreColor', false, value);
  commit(() => { ctx.b.html = ctx.el.innerHTML; }, { history: false });
}

export function fontSize(delta) {
  const ctx = editable(); if (!ctx) return;
  commit(() => {
    ctx.b.fontSize = Math.max(8, (ctx.b.fontSize || 40) + delta);
    ctx.el.style.fontSize = ctx.b.fontSize + 'px';
  });
}
