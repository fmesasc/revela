// Every dialog (any .modal-backdrop) behaves as one: announced as a dialog,
// focus goes into it on opening and back where it was on closing, Tab stays
// inside, and Esc closes it as its Cancel or ✕ would. Esc also closes the
// small menus (popovers, popup menus, the context menu) before anything else.

import { t } from '../../i18n/index.js';
import { openPop, closePopover } from '../ribbon/popovers.js';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"], math-field';
const shown = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const boxOf = back => back.querySelector(':scope > .modal, :scope > .home, :scope > div') || back;
const focusables = box => [...box.querySelectorAll(FOCUSABLE)].filter(el => shown(el) && !el.closest('[hidden], [inert]'));
// The dialog on top (the last one added paints over the others).
export const topModal = () => [...document.querySelectorAll('.modal-backdrop')].filter(shown).pop() || null;

let n = 0;
function prepare(back) {
  if (back.dataset.dlg) return;
  back.dataset.dlg = '1';
  const from = document.activeElement;
  back._returnFocus = from && from !== document.body && !back.contains(from) ? from : null;
  const box = boxOf(back);
  if (!box.hasAttribute('role')) box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const h = box.querySelector('h2, h3');
  if (h && !box.hasAttribute('aria-labelledby') && !box.hasAttribute('aria-label')) { h.id ||= `dlg-title-${++n}`; box.setAttribute('aria-labelledby', h.id); }
  // (The ✕ is read out as "multiplication sign" otherwise.)
  box.querySelectorAll('.modal-close').forEach(b => { if (!b.hasAttribute('aria-label')) b.setAttribute('aria-label', t('Cerrar')); if (!b.title) b.title = t('Cerrar'); });
  if (!box.hasAttribute('tabindex')) box.tabIndex = -1;
  // After the dialog's own code has run (it may focus a field of its own).
  requestAnimationFrame(() => {
    if (!back.isConnected || back.contains(document.activeElement)) return;
    (box.querySelector('[autofocus]') || box.querySelector('.dlg-ok') || box).focus({ preventScroll: true });
  });
}
function restore(back) {
  const to = back._returnFocus, a = document.activeElement;
  if (!to?.isConnected || (a && a !== document.body && a.isConnected)) return;
  const under = topModal();
  if (under && !under.contains(to)) { boxOf(under).focus({ preventScroll: true }); return; }
  to.focus({ preventScroll: true });
}

function closeTop(e) {
  const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  const ctx = document.getElementById('context-menu');
  if (ctx && !ctx.hidden) { ctx.hidden = true; return stop(); }
  const menu = [...document.querySelectorAll('.popup-menu')].pop();
  if (menu) { menu.remove(); return stop(); }
  if (openPop) { closePopover(); return stop(); }
  const top = topModal();
  const btn = top && (top.querySelector('.dlg-cancel') || top.querySelector('.modal-close') || top.querySelector('.dlg-ok'));
  if (btn) { btn.click(); stop(); }
}
function trapTab(e) {
  const top = topModal(); if (!top) return;
  const list = focusables(boxOf(top)), a = document.activeElement;
  if (!list.length) { e.preventDefault(); return; }
  const i = list.indexOf(a), first = list[0], last = list[list.length - 1];
  if (!top.contains(a) || a === boxOf(top)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (!e.shiftKey && i === list.length - 1) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && i === 0) { e.preventDefault(); last.focus(); }
}

// Before the editor's own keys (so Esc that closes a menu doesn't also deselect).
export function initModalKeys() {
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing) return;
    if (e.key === 'Escape') closeTop(e);
    else if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) trapTab(e);
  });
  // A click outside a dialog doesn't close it: only its ✕ (or Esc, or its own buttons) does. Closing on a click outside
  // lost what was half done in it — a stray click, or selecting text to copy and letting go outside (that click lands
  // on the backdrop) —, and many can't be opened again as they were. (Before the dialogs' own «click on the backdrop»
  // listeners: the click stops here. Not the command palette or the start screen, whose outside is part of them.)
  document.addEventListener('click', e => {
    const b = e.target;
    if (b?.nodeType === 1 && b.classList.contains('modal-backdrop') && !b.matches('.home-screen, .cmdp-back') && b.querySelector('.modal-close')) e.stopImmediatePropagation();
  }, true);
  const isBack = x => x.nodeType === 1 && x.classList.contains('modal-backdrop');
  new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(x => { if (isBack(x)) prepare(x); });
      m.removedNodes.forEach(x => { if (isBack(x) && x.dataset.dlg) restore(x); });
    }
  }).observe(document.body, { childList: true });
  document.querySelectorAll('body > .modal-backdrop').forEach(prepare);
}
