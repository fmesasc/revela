// Spelling on the slide, as in PowerPoint: every misspelt word of every text on the visible slide gets a wavy red line —
// not only the one being written —, in its own language (features/document/proofing.js), checked with our own
// dictionaries (features/document/spelling.js). The line is a CSS Custom Highlight (::highlight(rv-spell)): it
// paints over the text without touching it, so the document's HTML stays as it is. The browser's own checker is
// turned off where ours works (two lines under the same word, in two languages, would say two things), and left on
// where it can't (a language with no dictionary here, or one that couldn't be downloaded).
//
// Also the status bar's «Idioma de corrección» (the presentation's, or the selected box's) and what the right-click
// menu offers on a marked word.

import { state, subscribe, commit, currentSlide, selectedBlocks } from '../../core/store.js';
import * as P from '../../features/document/proofing.js';
import * as S from '../../features/document/spelling.js';
import { t, currentLang } from '../../i18n/index.js';

const NAME = 'rv-spell';
let marks = [], timer = 0, supported = false;
// The objects whose text is checked (a table: each cell).
export const hasText = b => !!b && (b.type === 'text' || b.type === 'table' || (b.type === 'shape' && !!b.html));

export function initSpellcheck() {
  supported = !!(globalThis.CSS?.highlights && typeof Highlight === 'function');
  const stage = document.getElementById('stage'); if (!stage) return;
  subscribe(() => { renderSpellStatus(); later(0); });
  stage.addEventListener('input', () => later(500));             // (a moment after the last key, not at each one)
  stage.addEventListener('focusout', () => later(0));            // (the word at the caret, no longer being written)
  S.onSpellChange(() => { renderSpellStatus(); later(0); });
  window.addEventListener('revela:lang', () => { renderSpellStatus(); later(0); });
  renderSpellStatus(); later(0);
}
const later = ms => { clearTimeout(timer); timer = setTimeout(scanSlide, ms); };

// Where the caret is in a text being written (as an offset of textRuns), or -1.
function caretIn(root, segs) {
  const sel = getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed || !root.isContentEditable || !root.contains(sel.anchorNode)) return -1;
  const seg = segs.find(s => s.node === sel.anchorNode);
  return seg ? seg.at + sel.anchorOffset : -1;
}

// The visible slide, marked again (after every change, a moment after typing, when a dictionary arrives…).
export function scanSlide() {
  const stage = document.getElementById('stage'); if (!stage) return [];
  const ui = currentLang(), deck = state.deck, slide = currentSlide(), found = [];
  // (Marked as final, or a shared copy that can't be changed: nothing to correct, nothing marked.)
  const frozen = !!(deck.final || state.ui.lock);
  stage.lang = P.deckTag(deck, ui);
  for (const el of stage.querySelectorAll(':scope > .block')) {
    const b = slide?.blocks.find(x => x.id === el.dataset.id) || el._b;
    if (!hasText(b)) continue;
    const roots = b.type === 'table' ? [...el.querySelectorAll('td[data-r]')] : [...el.querySelectorAll(':scope > .rich')];
    for (const root of roots) {
      if (root.matches('.formula, .src')) continue;                  // (a formula, or its result)
      const { text, segs } = P.textRuns(root), tag = P.boxLang(b, deck, ui, text);
      const own = supported && tag !== 'none' && S.hasDict(tag) && S.dictStatus(tag) !== 'failed';
      if (tag === 'none') root.removeAttribute('lang'); else if (root.lang !== tag) root.lang = tag;
      root.spellcheck = tag !== 'none' && !own;
      if (!own || frozen) continue;
      const caret = caretIn(root, segs), tokens = P.tokenize(text);
      tokens.forEach((tk, i) => {
        if (caret >= tk.start && caret <= tk.end) return;         // (still being written)
        if (S.isBad(tag, tk.word) !== true) return;
        found.push({ range: P.rangeOf(segs, tk.start, tk.end), word: tk.word, tag, root, id: b.id, nth: P.occurrenceOf(tokens, i),
          cell: root.matches('td') ? { r: +root.dataset.r, c: +root.dataset.c } : null });
      });
    }
  }
  marks = found;
  if (supported) { if (found.length) CSS.highlights.set(NAME, new Highlight(...found.map(m => m.range))); else CSS.highlights.delete(NAME); }
  // (Their suggestions, asked already: the right-click menu then opens at once.)
  for (const m of found.slice(0, 20)) S.suggest(m.tag, m.word);
  return found;
}
// What is marked now (the tests).
export const spellMarks = () => marks.filter(m => m.root.isConnected).map(m => ({ word: m.word, tag: m.tag, id: m.id }));

// The marked word at a point of the screen, or null.
export function spellAt(x, y) {
  for (const m of marks) {
    if (!m.range.startContainer.isConnected) continue;
    for (const r of m.range.getClientRects()) if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 2 && y <= r.bottom + 2) return m;
  }
  return null;
}

// The right-click menu's first rows on a marked word: its suggestions, «Omitir todo», «Agregar al diccionario», «Idioma…».
// (Items of ui/shell/contextmenu.js: [label, run, { raw }] — a suggestion is shown as it is, not translated.)
export async function spellMenu(m, x, y) {
  const list = await Promise.race([S.suggest(m.tag, m.word), new Promise(r => setTimeout(() => r(null), 2500))]);
  const items = (list || []).slice(0, 6).map(s => [s, () => replaceMark(m, s), { raw: true, cls: 'ctx-sugg' }]);
  if (!items.length) items.push([list ? 'Sin sugerencias' : 'Buscando sugerencias…', null]);
  items.push(['Omitir todo', () => S.ignoreAll(m.tag, m.word)], ['Agregar al diccionario', () => S.addWord(m.tag, m.word)],
    ['Idioma…', () => openSpellLangs({ x, y }, m.id)], null);
  return items;
}
// The marked word replaced: typed over when its text is being written (its own undo, as any typing), else in the model.
export function replaceMark(m, s) {
  const b = currentSlide()?.blocks.find(x => x.id === m.id); if (!b) return;
  if (m.root.isConnected && m.root.isContentEditable && m.range.startContainer.isConnected) {
    m.root.focus(); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(m.range);
    document.execCommand('insertText', false, s);                 // (its input listener keeps the model)
    return;
  }
  commit(() => {
    if (m.cell) b.rows[m.cell.r][m.cell.c] = P.replaceWord(b.rows[m.cell.r][m.cell.c] || '', m.word, m.nth, s);
    else b.html = P.replaceWord(b.html || '', m.word, m.nth, s);
  });
}

// ---- The language: the status bar and its list ----
const textOf = b => { const d = document.createElement('div'); d.innerHTML = b.type === 'table' ? (b.rows || []).flat().join(' ') : b.html || ''; return d.textContent; };
// The selected objects with text (their language is the one shown and changed), or none: the presentation's.
const boxes = () => selectedBlocks().filter(hasText);
// What a setting is called: a language, «Detectar automáticamente» or «No revisar la ortografía».
const labelOf = (v, ui) => (v === 'none' ? t('No revisar la ortografía') : v === 'auto' ? t('Detectar automáticamente') : P.langLabel(v, ui));

export function renderSpellStatus() {
  const btn = document.getElementById('spell-lang'); if (!btn) return;
  const ui = currentLang(), deck = state.deck, b = boxes()[0];
  let v = b ? b.textLang || P.deckSetting(deck, ui) : P.deckSetting(deck, ui);
  if (v === 'auto' && b) v = P.boxLang(b, deck, ui, textOf(b));           // (the one it was taken to be)
  const st = v === 'none' || v === 'auto' ? v : S.dictStatus(v);
  const note = { loading: 'Descargando el diccionario…', failed: 'No se pudo descargar el diccionario: se usa el corrector del navegador.',
    missing: 'No hay diccionario para este idioma: se usa el corrector del navegador.' }[st] || 'Idioma de corrección de la ortografía';
  const icon = st === 'loading' ? 'hourglass_top' : st === 'failed' || st === 'missing' ? 'error' : st === 'none' ? 'block' : 'spellcheck';
  const name = labelOf(v, ui);
  if (btn.dataset.state === st && btn.dataset.name === name && btn.dataset.i18nt === note) return;
  btn.dataset.state = st; btn.dataset.name = name;
  btn.dataset.i18nt = note; btn.title = t(note);                    // (as the bar's other titles: i18n/index.js applyI18n)
  btn.querySelector('.ms').textContent = icon;
  btn.querySelector('bdi').textContent = name;
}

// The list of languages, at the status bar's button (or where the menu was): for the selected boxes, or for the
// presentation. `blockId`: that box (from the right-click menu).
export function openSpellLangs(at = document.getElementById('spell-lang'), blockId) {
  closeSpellLangs();
  const ui = currentLang(), deck = state.deck, slide = currentSlide();
  const targets = blockId === null ? [] : blockId ? [slide?.blocks.find(x => x.id === blockId)].filter(hasText) : boxes();
  const cur = targets.length ? targets[0].textLang || '' : P.deckSetting(deck, ui);
  const rows = [
    targets.length ? ['', t('Igual que la presentación ({l})').replace('{l}', labelOf(P.deckSetting(deck, ui), ui))] : ['auto', t('Detectar automáticamente')],
    ...P.SPELL_TAGS.map(tag => [tag, P.langLabel(tag, ui)]),
    // (A language chosen elsewhere that has no dictionary here — the presentation's, Romanian —: still shown, checked.)
    ...(cur && cur !== 'auto' && cur !== 'none' && !P.SPELL_TAGS.includes(cur) ? [[cur, P.langLabel(cur, ui)]] : []),
    ['none', t('No revisar la ortografía')],
  ];
  const menu = document.createElement('div');
  menu.id = 'spell-langs'; menu.setAttribute('role', 'menu');
  menu.innerHTML = `<div class="sl-head"></div>`;
  menu.firstChild.textContent = t(targets.length ? (targets.length > 1 ? 'Idioma de los cuadros seleccionados' : 'Idioma del cuadro seleccionado') : 'Idioma de corrección');
  for (const [v, label] of rows) {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'ctx-item'; row.dataset.lang = v; row.setAttribute('role', 'menuitemradio');
    row.setAttribute('aria-checked', String(v === cur)); row.textContent = label;
    if (v && v !== 'auto' && v !== 'none') { row.lang = v; if (!S.hasDict(v)) row.classList.add('sl-nodict'); }
    row.addEventListener('click', () => { closeSpellLangs(); setSpellLang(targets.map(x => x.id), v); });
    menu.appendChild(row);
  }
  if (targets.length) {
    const all = document.createElement('button'); all.type = 'button'; all.className = 'ctx-item sl-all'; all.textContent = t('Toda la presentación…');
    all.addEventListener('click', () => openSpellLangs(at, null));
    menu.append(Object.assign(document.createElement('div'), { className: 'ctx-sep' }), all);
  }
  document.body.appendChild(menu);
  // Above the button (the status bar is at the bottom), or at the point; whole on screen.
  const r = menu.getBoundingClientRect(), a = at instanceof Element ? at.getBoundingClientRect() : { left: at.x, top: at.y, bottom: at.y };
  let left = a.left, top = at instanceof Element ? a.top - r.height - 4 : a.top;
  if (top + r.height > innerHeight - 8) top = innerHeight - 8 - r.height;
  menu.style.left = Math.max(8, Math.min(left, innerWidth - r.width - 8)) + 'px'; menu.style.top = Math.max(8, top) + 'px';
  (menu.querySelector('[aria-checked="true"]') || menu.querySelector('.ctx-item'))?.focus();
  menu.addEventListener('keydown', e => {
    const items = [...menu.querySelectorAll('.ctx-item')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeSpellLangs(); if (at instanceof Element) at.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); }
    e.stopPropagation();                                            // (not the editor's keys: arrows would change slide)
  });
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
function outside(e) { if (!e.target.closest?.('#spell-langs')) closeSpellLangs(); }
export function closeSpellLangs() { document.getElementById('spell-langs')?.remove(); document.removeEventListener('pointerdown', outside, true); }

// The language of some boxes (none: the presentation's). '' → as the presentation.
export function setSpellLang(ids, v) {
  commit(() => {
    if (ids.length) for (const b of currentSlide().blocks.filter(x => ids.includes(x.id))) { if (v) b.textLang = v; else delete b.textLang; }
    else if (v) state.deck.textLang = v; else delete state.deck.textLang;
  });
}
