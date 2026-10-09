// Help while writing on a slide:
//  - «/» at the start of an empty line of a text box: a small menu to insert something there (a picture, a
//    table, a list…), Notion and Google Docs style. Esc or typing anything else closes it and leaves the «/».
//    (Outside text, «/» opens the command search: ui/shell/palette.js.)
//  - Ctrl+Z right after an automatic list (features/document/autocorrect.js) brings back what was typed.
//  - A text box whose text doesn't fit, without «Reducir si no cabe»: a small button on it to turn it on, and for
//    the whole presentation at once.
import { state, commit, amend, currentSlide, selectedBlock, selectedBlocks, subscribe } from '../../core/store.js';
import { lineBeforeCaret, undoAutoList } from '../../features/document/autocorrect.js';
import { styleKind } from '../../features/document/master.js';
import { shrinkToFit } from '../canvas/content.js';
import { overflowFits } from '../canvas/fittext.js';
import { ACTIONS } from '../ribbon/actions.js';
import { openPalette } from './palette.js';
import { toast } from './toast.js';
import { t } from '../../i18n/index.js';

const editingRich = () => { const a = document.activeElement; return a?.isContentEditable && a.classList.contains('rich') && a.closest('#stage .block') ? a : null; };
const blockOf = rich => currentSlide()?.blocks.find(x => x.id === rich?.closest('.block')?.dataset.id);
const stored = rich => rich.dispatchEvent(new InputEvent('input', { bubbles: true }));   // (the text box keeps what is shown: content.js)

// ---- «/» menu ----------------------------------------------------------------------------------------------
// [key, icon, name, what it does once the «/» is gone]. Lists stay in the text; the rest leave it and insert.
const run = id => () => ACTIONS[id]?.();
export const SLASH = [
  ['image', 'image', 'Imagen', run('insert-image')], ['table', 'table', 'Tabla', run('insert-table')], ['chart', 'bar_chart', 'Gráfico', run('insert-chart')],
  ['bullets', 'format_list_bulleted', 'Lista con viñetas', null, 'insertUnorderedList'], ['numbers', 'format_list_numbered', 'Lista numerada', null, 'insertOrderedList'],
  ['math', 'functions', 'Ecuación', run('insert-math')], ['code', 'code', 'Código', run('insert-code')], ['icon', 'interests', 'Icono', run('insert-online-icon')],
  ['poll', 'how_to_vote', 'Votación', run('insert-poll')], ['more', 'search', 'Más comandos…', () => openPalette()],
];
let menu = null, active = 0, menuRich = null;
export const slashOpen = () => !!menu;
export function closeSlash() { menu?.remove(); menu = null; menuRich = null; }
function openSlash(rich) {
  closeSlash(); menuRich = rich; active = 0;
  menu = document.createElement('div'); menu.id = 'slash-menu'; menu.className = 'popup-menu slash-menu'; menu.setAttribute('role', 'listbox');
  menu.innerHTML = SLASH.map(([k, icon, name], i) => `<button type="button" role="option" data-slash="${k}" aria-selected="${i === 0}"><i class="ms">${icon}</i><span>${t(name)}</span></button>`).join('')
    + `<p class="slash-help">${t('Esc o sigue escribiendo para cerrar')}</p>`;
  document.body.appendChild(menu);
  const s = getSelection(), r = s.rangeCount ? s.getRangeAt(0).getBoundingClientRect() : rich.getBoundingClientRect();
  const top = (r.bottom || rich.getBoundingClientRect().top) + 6, left = r.left || rich.getBoundingClientRect().left;
  menu.style.left = Math.max(8, Math.min(left, innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = (top + menu.offsetHeight > innerHeight - 8 ? Math.max(8, top - menu.offsetHeight - 30) : top) + 'px';
  menu.addEventListener('mousedown', e => e.preventDefault());                 // (the text keeps the caret)
  menu.addEventListener('click', e => { const k = e.target.closest('[data-slash]')?.dataset.slash; if (k) pickSlash(k); });
}
function setActive(i) { active = (i + SLASH.length) % SLASH.length; menu.querySelectorAll('[data-slash]').forEach((b, j) => b.setAttribute('aria-selected', String(j === active))); }
export function pickSlash(k) {
  const item = SLASH.find(x => x[0] === k), rich = menuRich; closeSlash(); if (!item || !rich) return;
  rich.focus(); document.execCommand('delete');                               // (the «/» goes)
  if (item[4]) { document.execCommand(item[4]); stored(rich); return; }       // (a list, there)
  stored(rich); rich.blur();                                                   // (what was typed, one undo step)
  item[3]();
}

// ---- «Reducir si no cabe» ------------------------------------------------------------------------------------
// On (shrinking it now if it doesn't fit, in the same undo step), or off (back to its size).
export function toggleShrink(id) {
  const b = currentSlide()?.blocks.find(x => x.id === id); if (!b) return;
  if (b.shrink) { commit(() => { delete b.shrink; delete b.fit; if (b.shrinkBase) { b.fontSize = b.shrinkBase; delete b.shrinkBase; } }); return; }
  commit(() => { b.shrink = true; });
  const rich = document.querySelector(`#stage .block[data-id="${id}"] .rich`);
  if (rich && shrinkToFit(b, rich)) amend();
}
// Every text placeholder of the presentation (titles, subtitles, body text): on, and made smaller now where the
// text doesn't fit. One undo step. → how many boxes.
export async function shrinkAllPlaceholders() {
  const d = state.deck, pairs = [];
  for (const s of d.slides) for (const b of s.blocks) if (styleKind(b) && !b.shrink && !b.wordart) pairs.push([b, s]);
  if (!pairs.length) { toast(t('El texto ya se reduce si no cabe en toda la presentación.')); return 0; }
  const fits = await overflowFits(d, pairs);
  if (state.deck !== d) return 0;                                            // (another presentation meanwhile)
  commit(() => {
    for (const [b] of pairs) b.shrink = true;
    for (const [b, c] of fits) { if (b.fontSize != null && c.fontSize < b.fontSize) { b.shrinkBase = b.fontSize; b.fontSize = c.fontSize; } else if (c.fit) b.fit = c.fit; b.html = c.html; }
  });
  toast(t('«Reducir si no cabe» activado en {n} cuadros de texto.').replace('{n}', pairs.length));
  return pairs.length;
}

// ---- The hint on a box whose text doesn't fit --------------------------------------------------------------
let hint = null;
function overflowing() {
  const b = selectedBlock(); if (!b || selectedBlocks().length > 1 || state.ui.editMaster || state.deck.final || state.ui.lock) return null;
  if (b.type !== 'text' || b.shrink || b.wordart || b.curve || b.vertical || b.locked) return null;
  const el = document.querySelector(`#stage .block[data-id="${b.id}"]`), rich = el?.querySelector('.rich');
  return rich && rich.scrollHeight > rich.clientHeight + 2 ? { b, el } : null;
}
export function refreshOverflowHint() {
  const o = overflowing();
  if (!o) { hint?.remove(); hint = null; return null; }
  if (!hint) {
    hint = document.createElement('div'); hint.id = 'overflow-hint'; hint.className = 'overflow-hint';
    hint.addEventListener('mousedown', e => e.preventDefault());
    hint.addEventListener('click', e => {
      const k = e.target.closest('[data-of]')?.dataset.of; if (!k) return;
      if (k === 'one') toggleShrink(hint.dataset.id); else shrinkAllPlaceholders();
    });
    document.body.appendChild(hint);
  }
  const ph = !!styleKind(o.b);
  if (hint.dataset.id !== o.b.id || hint.dataset.ph !== String(ph)) {
    hint.dataset.id = o.b.id; hint.dataset.ph = String(ph);
    hint.innerHTML = `<i class="ms">warning</i><span>${t('El texto no cabe')}</span><button type="button" data-of="one"><i class="ms">compress</i>${t('Reducir si no cabe')}</button>`
      + (ph ? `<button type="button" data-of="all" class="of-all">${t('En toda la presentación')}</button>` : '');
  }
  const r = o.el.getBoundingClientRect();
  hint.style.left = Math.max(8, Math.min(r.left, innerWidth - hint.offsetWidth - 8)) + 'px';
  hint.style.top = Math.min(r.bottom + 6, innerHeight - hint.offsetHeight - 8) + 'px';
  return hint;
}

export function initTextAids() {
  document.addEventListener('input', e => {
    const rich = e.target.closest?.('.rich'); if (!rich || rich !== editingRich()) return;
    if (menu) closeSlash();                                                    // (typing on: the «/» stays as written)
    if (e.inputType === 'insertText' && e.data === '/' && lineBeforeCaret(rich) === '/') openSlash(rich);
    requestAnimationFrame(refreshOverflowHint);
  });
  document.addEventListener('keydown', e => {
    const rich = editingRich();
    // Ctrl+Z right after an automatic list: the characters as typed.
    if (rich && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && undoAutoList(rich)) { e.preventDefault(); e.stopPropagation(); stored(rich); return; }
    if (!menu) return;
    if (!rich || rich !== menuRich) { closeSlash(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); pickSlash(SLASH[active][0]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSlash(); }
    else if (e.key.length > 1 && !/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) closeSlash();   // (Backspace, arrows to the side…)
  }, true);
  document.addEventListener('focusout', () => setTimeout(() => { if (menu && editingRich() !== menuRich) closeSlash(); }));
  subscribe(() => requestAnimationFrame(refreshOverflowHint));
  window.addEventListener('resize', () => refreshOverflowHint());
  document.getElementById('canvas-wrap')?.addEventListener('scroll', () => refreshOverflowHint(), { passive: true });
}
