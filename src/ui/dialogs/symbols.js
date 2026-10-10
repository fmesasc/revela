// Insert ▸ Symbols and emojis: every character there is, as Google Docs' «Special characters» and Word's «Symbol»
// have them, and more.
//
//  - Categories: recently used and favourites, arrows, maths, Greek, currencies… and every emoji by its Unicode
//    group (without skin tones); Word's special characters (dashes, spaces, hyphens, marks) with their names; and
//    all of Unicode block by block (the tens of thousands of ideographs too: the grid draws only what is in view).
//  - A search by name in the app's language, Spanish and English (CLDR's names: «flecha», «corazón», «cohete»), by
//    official Unicode name («rightwards arrow») and by code (U+2192, 2192, &#8594;); a code field jumps to the
//    character in its block.
//  - Draw to find it: the drawing is compared with the characters as this browser draws them (features/content/
//    sketch.js), nothing is sent anywhere.
//  - A preview with the character big, its name, code and block; a font to see it (and insert it) in.
//
// Clicking a character inserts it where the text cursor was (in the text being edited; with none, in a new text box),
// and the dialog stays open for more; only its ✕ or Esc closes it (ui/dialogs/modalkeys.js).

import { t, currentLang } from '../../i18n/index.js';
import { esc } from '../../core/text.js';
import { selectedBlock, state } from '../../core/store.js';
import * as format from '../../features/document/format.js';
import * as blocks from '../../features/document/blocks.js';
import { FONTS, customFonts, customStack, ensureFont } from '../../features/design/fonts.js';
import * as sym from '../../features/content/symbols.js';
import { sketchIndex, drawable } from '../../features/content/sketch.js';

// The fonts the grid is drawn in when none is chosen: for symbols, the system's, then fonts with many of them; for an
// emoji, the emoji fonts first (else a black-and-white font with some of its parts, such as Symbola, would draw a
// family 👨‍👩‍👧 as three people side by side).
const UI_FONT = 'system-ui, "Segoe UI", "Segoe UI Symbol", "Noto Sans", "Noto Sans Symbols", "Noto Sans Symbols 2", "Apple Symbols", "DejaVu Sans", Symbola, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "EmojiOne Color", sans-serif';
// (Drawn as an emoji: shown as one by default, or asked to be — FE0F —, or a sequence, or a flag.)
const isEmoji = ch => /\uFE0F|\u200D|\u20E3|[\u{1F1E6}-\u{1F1FF}]|\p{Emoji_Presentation}/u.test(ch);
const ROW = 44;                                  // (a row of the grid, px: cells are square; a heading takes a row too)

function catLabel(id) {
  return ({ recent: t('Recientes y favoritos'), arrows: t('Flechas'), math: t('Matemáticas'), greek: t('Letras griegas'), currency: t('Monedas'),
    bullets: t('Viñetas y puntos'), shapes: t('Formas geométricas'), marks: t('Marcas de verificación'), stars: t('Estrellas'),
    scripts: t('Superíndices, subíndices y fracciones'), units: t('Unidades y símbolos técnicos'), music: t('Música'), games: t('Ajedrez, naipes y dados'),
    punct: t('Puntuación tipográfica'), misc: t('Otros símbolos'), smileys: t('Caras y emociones'), people: t('Personas y cuerpo'),
    nature: t('Animales y naturaleza'), food: t('Comida y bebida'), travel: t('Viajes y lugares'), activities: t('Actividades'), objects: t('Objetos'),
    emojisym: t('Símbolos emoji'), flags: t('Banderas'), special: t('Caracteres especiales'), unicode: t('Todo Unicode, por bloques') })[id] || id;
}
// (Each tab's picture: a character of its own.)
const TAB_GLYPH = { recent: '🕘', arrows: '→', math: '∑', greek: 'Ω', currency: '€', bullets: '•', shapes: '◆', marks: '✓', stars: '★', scripts: 'x²',
  units: '℃', music: '♫', games: '♞', punct: '«»', misc: '☀', smileys: '😀', people: '👋', nature: '🐻', food: '🍎', travel: '🚗', activities: '⚽',
  objects: '💡', emojisym: '❤\uFE0F', flags: '🏁', special: '¶', unicode: '文' };
// Word's «Special characters»: what is hard to type or to see, by its name.
function specials() {
  return [['—', t('Raya (guion largo)')], ['–', t('Semirraya (guion medio)')], ['‑', t('Guion de no separación')], ['\u00AD', t('Guion opcional (se ve solo al partir la palabra)')],
    ['\u00A0', t('Espacio de no separación')], ['\u202F', t('Espacio fino de no separación')], ['\u2003', t('Espacio largo (de una eme)')], ['\u2002', t('Espacio corto (de una ene)')],
    ['\u2005', t('Espacio de un cuarto de eme')], ['\u2009', t('Espacio fino')], ['\u200A', t('Espacio ultrafino')], ['\u200B', t('Espacio de ancho cero (permite partir la línea)')],
    ['\u2060', t('Unión de palabras (impide partir la línea)')], ['\u200D', t('Unión de ancho cero')], ['\u200C', t('No unión de ancho cero')],
    ['\u200E', t('Marca de izquierda a derecha')], ['\u200F', t('Marca de derecha a izquierda')],
    ['©', t('Copyright')], ['®', t('Marca registrada')], ['™', t('Marca comercial')], ['§', t('Sección')], ['¶', t('Párrafo (calderón)')], ['…', t('Puntos suspensivos')],
    ['«', t('Comillas angulares de apertura')], ['»', t('Comillas angulares de cierre')], ['“', t('Comillas dobles de apertura')], ['”', t('Comillas dobles de cierre')],
    ['‘', t('Comilla simple de apertura')], ['’', t('Comilla simple de cierre (apóstrofo)')], ['°', t('Grado')], ['·', t('Punto medio')], ['•', t('Viñeta')],
    ['†', t('Daga')], ['‡', t('Daga doble')], ['‰', t('Por mil')], ['×', t('Multiplicación')], ['÷', t('División')], ['±', t('Más o menos')], ['−', t('Signo menos')]];
}
const INVISIBLE = /^[\u00A0\u00AD\u2000-\u200F\u202F\u2060]$/;
const hex = cp => cp.toString(16).toUpperCase().padStart(4, '0');
const cpOf = ch => ch.codePointAt(0);

// ---- The text cursor, kept while the dialog has the focus (features/document/format.js: textCaret, setTextCaret) ----
const { caretOf } = format;
const richOf = id => document.querySelector(`#stage .block[data-id="${id}"] .rich`);

// ---- The dialog -------------------------------------------------------------------------------------------------
let open = null;
// at: where the text cursor was when the button was pressed (format.textCaret(), taken at once: by the time this
// module has loaded, the text may have been redrawn).
export function openSymbols(at) {
  if (open?.back.isConnected) { open.q.focus(); return open; }
  // (Where to insert: the text cursor of the text being edited, or the end of the selected text box.)
  let caret = at !== undefined ? at : format.textCaret();

  const back = document.createElement('div');
  back.className = 'modal-backdrop sym-back';
  back.innerHTML = `<div class="modal sym-dlg">
    <button class="modal-close" type="button">✕</button>
    <h3>${esc(t('Símbolos y emojis'))}</h3>
    <div class="sym-top">
      <label class="sym-search"><i class="ms" aria-hidden="true">search</i><input type="search" class="sym-q" autofocus
        placeholder="${esc(t('Buscar: flecha, corazón, euro, check…'))}" aria-label="${esc(t('Buscar un símbolo por su nombre o código'))}"></label>
      <button type="button" class="mini2 sym-draw-btn" aria-pressed="false" title="${esc(t('Dibuja el símbolo y te mostramos los más parecidos'))}"><i class="ms">draw</i> <span>${esc(t('Dibujar'))}</span></button>
      <label class="sym-codein"><span>${esc(t('Código'))}</span><input type="text" class="sym-code" spellcheck="false" autocomplete="off" placeholder="U+2192" aria-label="${esc(t('Código del carácter (U+2192, 2192 o &#8594;)'))}"></label>
      <label class="sym-fontin"><span>${esc(t('Fuente'))}</span><select class="sym-font"></select></label>
    </div>
    <div class="sym-body">
      <div class="sym-tabs" role="tablist" aria-label="${esc(t('Categorías'))}" aria-orientation="vertical"></div>
      <div class="sym-main">
        <div class="sym-pad" hidden>
          <canvas class="sym-canvas" aria-label="${esc(t('Dibuja aquí un símbolo'))}"></canvas>
          <div class="sym-pad-side"><p>${esc(t('Dibuja aquí un símbolo con el ratón, el lápiz o el dedo.'))}</p>
            <button type="button" class="mini2 sym-clear"><i class="ms">ink_eraser</i> ${esc(t('Borrar'))}</button>
            <small class="sym-pad-state" aria-live="polite"></small></div>
        </div>
        <div class="sym-blockbar" hidden><select class="sym-block" aria-label="${esc(t('Bloque Unicode'))}"></select></div>
        <div class="sym-head" aria-live="polite"></div>
        <div class="sym-grid" role="listbox" tabindex="0" aria-label="${esc(t('Símbolos'))}"><div class="sym-spacer"><div class="sym-rows"></div></div></div>
        <div class="sym-special" role="listbox" tabindex="0" aria-label="${esc(t('Caracteres especiales'))}" hidden></div>
      </div>
      <aside class="sym-preview" aria-live="polite">
        <div class="sym-big"></div>
        <b class="sym-name"></b><small class="sym-uname"></small>
        <code class="sym-codes"></code><small class="sym-blockname"></small>
        <div class="sym-actions"><button type="button" class="fr-do sym-insert">${esc(t('Insertar'))}</button>
          <button type="button" class="mini2 sym-fav" aria-pressed="false"><i class="ms">star</i> <span>${esc(t('Favorito'))}</span></button></div>
      </aside>
    </div>
    <div class="sym-status" role="status"></div>
  </div>`;
  document.body.appendChild(back);
  const $ = s => back.querySelector(s);
  const q = $('.sym-q'), grid = $('.sym-grid'), rowsEl = $('.sym-rows'), spacer = $('.sym-spacer'), head = $('.sym-head'), status = $('.sym-status');
  const tabsEl = $('.sym-tabs'), fontSel = $('.sym-font'), codeIn = $('.sym-code'), blockSel = $('.sym-block'), specialEl = $('.sym-special');
  const ui = { back, q };
  open = ui;

  // ---- State ----
  let index = null, names = {}, blocksList = null, catLabels = {};
  let tab = 'recent', items = [], rows = [], cols = 8, active = -1, current = null, font = '', searchToken = 0;
  const strokes = [], drawing = { index: null, on: false };
  const LANGS = [...new Set([currentLang(), 'es', 'en'])];
  const family = () => (font ? `${font}, ${UI_FONT}` : UI_FONT);
  const familyOf = ch => (isEmoji(ch) ? EMOJI_FONT : family());
  const say = msg => { status.textContent = msg; };

  // ---- Fonts: the text's, the document's, Revela's, and this computer's (where the browser lets list them) ----
  const fontOpts = () => {
    const b = selectedBlock(), tb = b?.type === 'text' ? b : null, mine = customFonts(state.deck).map(f => [f.name, customStack(f.name)]);
    const list = [['', t('Fuente del texto')], ...mine, ...FONTS.filter(f => f.stack).map(f => [f.name, f.stack])];
    if (tb?.fontFamily && !list.some(([, s]) => s === tb.fontFamily)) list.splice(1, 0, [tb.fontFamily.split(',')[0].replace(/['"]/g, ''), tb.fontFamily]);
    return list;
  };
  fontSel.innerHTML = fontOpts().map(([n, s]) => `<option value="${esc(s)}">${esc(n)}</option>`).join('')
    + ('queryLocalFonts' in window ? `<option value="__local">${esc(t('Fuentes de este equipo…'))}</option>` : '');
  fontSel.addEventListener('change', async () => {
    if (fontSel.value === '__local') {
      try {
        const got = [...new Set((await window.queryLocalFonts()).map(f => f.family))].sort();
        fontSel.querySelector('[value="__local"]').remove();
        const g = document.createElement('optgroup'); g.label = t('Fuentes de este equipo');
        g.innerHTML = got.map(f => `<option value="${esc(`"${f}"`)}">${esc(f)}</option>`).join('');
        fontSel.appendChild(g); fontSel.value = got.length ? `"${got[0]}"` : '';
      } catch { fontSel.value = ''; say(t('El navegador no ha dejado ver las fuentes del equipo.')); }
    }
    font = fontSel.value; if (font) ensureFont(font);
    back.style.setProperty('--sym-font', family());
  back.style.setProperty('--sym-emoji', EMOJI_FONT);
    drawing.index?.stop(); drawing.index = null;           // (the drawing compares with the glyphs of the font shown)
    if (strokes.length) recognise();
    paint(); preview(current);
  });
  back.style.setProperty('--sym-font', family());
  back.style.setProperty('--sym-emoji', EMOJI_FONT);

  // ---- Tabs ----
  const TABS = ['recent', ...sym.SYMBOL_CATS, 'special', ...sym.EMOJI_CATS, 'unicode'];
  tabsEl.innerHTML = TABS.map((id, i) => (id === 'special' || id === 'smileys' || id === 'unicode' ? '<hr aria-hidden="true">' : '')
    + `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === tab}" tabindex="${id === tab ? 0 : -1}" title="${esc(catLabel(id))}">`
    + `<span class="sym-tg" aria-hidden="true">${esc(TAB_GLYPH[id])}</span><span class="sym-tl">${esc(catLabel(id))}</span></button>`).join('');
  tabsEl.addEventListener('click', e => { const x = e.target.closest('[data-tab]'); if (x) { q.value = ''; setDrawing(false); showTab(x.dataset.tab); } });
  tabsEl.addEventListener('keydown', e => {
    const list = [...tabsEl.querySelectorAll('[data-tab]')], i = list.indexOf(document.activeElement); if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault(); const x = list[(to + list.length) % list.length]; x.focus(); q.value = ''; setDrawing(false); showTab(x.dataset.tab);
  });
  function markTab(id) {
    tabsEl.querySelectorAll('[data-tab]').forEach(x => { const on = x.dataset.tab === id; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
    tabsEl.querySelector(`[data-tab="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ---- What can be drawn here ----
  // An emoji newer than this browser's emoji font shows as boxes or as its parts: each Emoji version is tried once.
  const versionOK = new Map();
  const emojiOK = ch => { const v = index.version.get(ch); if (!v) return true;
    if (!versionOK.has(v)) { const probe = [...index.version].find(([, x]) => x === v)[0]; versionOK.set(v, drawable(probe, EMOJI_FONT, true)); }
    return versionOK.get(v); };
  const symOK = new Map();
  const shown = ch => (index.version.size && !emojiOK(ch) ? false : (symOK.has(ch) ? symOK.get(ch) : (symOK.set(ch, drawable(ch, familyOf(ch))), symOK.get(ch))));
  const ok = ch => (/\p{Extended_Pictographic}/u.test(ch) ? emojiOK(ch) : shown(ch));

  // ---- The grid: only the rows in view are drawn (a block can have 40,000 characters) ----
  // items: { ch, cp, kind, name } | { head }
  function layout() {
    cols = Math.max(4, Math.floor((grid.clientWidth - 2) / ROW) || 8);
    rows = []; let row = null;
    items.forEach((it, i) => {
      if (it.head) { rows.push({ head: it.head }); row = null; return; }
      if (!row || row.items.length >= cols) { row = { items: [] }; rows.push(row); }
      row.items.push(i);
    });
    spacer.style.height = rows.length * ROW + 'px';
    paint();
  }
  function rowOfItem(i) { for (let r = 0; r < rows.length; r++) if (rows[r].items?.includes(i)) return r; return -1; }
  function glyphHTML(it) {
    if (it.kind === 'blank' || INVISIBLE.test(it.ch)) return `<span class="sym-blank">${hex(it.cp)}</span>`;
    return esc(it.kind === 'mark' ? '◌' + it.ch : it.ch);
  }
  const titleOf = it => [itemName(it), sym.codeLabel(it.cp)].filter(Boolean).join(' · ');
  function paint() {
    const top = grid.scrollTop, h = grid.clientHeight || 400;
    const r0 = Math.max(0, Math.floor(top / ROW) - 4), r1 = Math.min(rows.length, Math.ceil((top + h) / ROW) + 4);
    let html = '';
    for (let r = r0; r < r1; r++) {
      const row = rows[r];
      if (row.head) { html += `<div class="sym-rowhead" style="top:${r * ROW}px" role="presentation">${esc(row.head)}</div>`; continue; }
      html += `<div class="sym-row" style="top:${r * ROW}px" role="presentation">` + row.items.map(i => {
        const it = items[i];
        return `<div class="sym-cell${i === active ? ' on' : ''}${isEmoji(it.ch) ? ' emo' : ''}" role="option" id="sym-o-${i}" data-i="${i}" aria-selected="${i === active}" title="${esc(titleOf(it))}" aria-label="${esc(titleOf(it) || it.ch)}">${glyphHTML(it)}</div>`;
      }).join('') + '</div>';
    }
    rowsEl.innerHTML = html;
    if (active >= 0 && grid.querySelector(`#sym-o-${active}`)) grid.setAttribute('aria-activedescendant', `sym-o-${active}`); else grid.removeAttribute('aria-activedescendant');
  }
  let raf = 0;
  grid.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); });
  const ro = new ResizeObserver(() => { const c = Math.max(4, Math.floor((grid.clientWidth - 2) / ROW) || 8); if (c !== cols) layout(); else paint(); });
  ro.observe(grid);
  function setItems(list, { keep = false } = {}) {
    items = list; active = keep ? Math.min(active, items.length - 1) : items.findIndex(it => !it.head);
    if (!keep) grid.scrollTop = 0;
    layout();
    if (active >= 0 && !keep) preview(items[active]);
  }
  const fromChars = chars => chars.map(ch => ({ ch, cp: cpOf(ch), kind: '' }));
  function itemName(it) {
    if (!it) return '';
    if (index) { const n = sym.nameIn(it.ch, index, names); if (n) return n; }
    return it.name ? it.name.toLowerCase() : '';
  }
  function moveActive(i, { scroll = true } = {}) {
    if (i < 0 || i >= items.length) return;
    while (items[i]?.head) i++;
    if (!items[i]) return;
    active = i;
    const r = rowOfItem(i);
    if (scroll && r >= 0) { const y = r * ROW; if (y < grid.scrollTop) grid.scrollTop = Math.max(0, y - ROW); else if (y + ROW > grid.scrollTop + grid.clientHeight) grid.scrollTop = y + ROW * 2 - grid.clientHeight; }
    paint(); preview(items[i]);
  }
  grid.addEventListener('keydown', e => {
    if (!items.length) return;
    const r = rowOfItem(active), row = rows[r], col = row ? row.items.indexOf(active) : 0;
    const vert = d => { let k = r + d; while (rows[k]?.head) k += Math.sign(d); const to = rows[k]; return to ? to.items[Math.min(col, to.items.length - 1)] : active; };
    const page = Math.max(1, Math.floor(grid.clientHeight / ROW) - 1);
    const rtl = getComputedStyle(grid).direction === 'rtl';
    const to = { ArrowRight: active + (rtl ? -1 : 1), ArrowLeft: active + (rtl ? 1 : -1), ArrowDown: vert(1), ArrowUp: vert(-1), PageDown: vert(page), PageUp: vert(-page),
      Home: e.ctrlKey ? 0 : row?.items[0], End: e.ctrlKey ? items.length - 1 : row?.items.at(-1) }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      let i = Math.max(0, Math.min(items.length - 1, to));
      if (items[i]?.head) i = (to < active ? i - 1 : i + 1);
      moveActive(Math.max(0, Math.min(items.length - 1, i)));
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (items[active] && !items[active].head) insert(items[active]); }
  });
  grid.addEventListener('focus', () => { if (active < 0) moveActive(items.findIndex(it => !it.head)); });
  grid.addEventListener('click', e => { const c = e.target.closest('.sym-cell'); if (!c) return; active = +c.dataset.i; paint(); preview(items[active]); insert(items[active]); });
  grid.addEventListener('mouseover', e => { const c = e.target.closest('.sym-cell'); if (c) preview(items[+c.dataset.i]); });
  grid.addEventListener('mouseleave', () => preview(items[active]));

  // ---- Preview ----
  async function preview(it) {
    current = it && !it.head ? it : null;
    const big = $('.sym-big'), nm = $('.sym-name'), un = $('.sym-uname'), codes = $('.sym-codes'), bn = $('.sym-blockname'), fav = $('.sym-fav'), ins = $('.sym-insert');
    ins.disabled = fav.disabled = !current;
    if (!current) { big.innerHTML = ''; nm.textContent = un.textContent = codes.textContent = bn.textContent = ''; return; }
    const it0 = current;
    big.innerHTML = glyphHTML(it0); big.classList.toggle('emo', isEmoji(it0.ch));
    const name = itemName(it0);
    nm.textContent = name || '';
    const cps = [...it0.ch].map(c => c.codePointAt(0));
    codes.textContent = cps.length === 1 ? `U+${hex(cps[0])} · ${cps[0]} · &#${cps[0]};` : cps.map(c => 'U+' + hex(c)).join(' ');
    const isFav = sym.isFavorite(it0.ch); fav.setAttribute('aria-pressed', String(isFav)); fav.classList.toggle('on', isFav);
    fav.title = isFav ? t('Quitar de favoritos') : t('Añadir a favoritos');
    un.textContent = ''; bn.textContent = '';
    if (cps.length === 1) {
      const info = await sym.unicodeInfo(cps[0]).catch(() => null);
      if (current !== it0) return;
      if (info) { if (fold(info.name) !== fold(name)) un.textContent = info.name; bn.textContent = `${t('Bloque')}: ${info.block}`; if (!name) nm.textContent = info.name.toLowerCase(); }
    }
  }
  const fold = s => sym.fold(s || '');
  $('.sym-insert').addEventListener('click', () => current && insert(current));
  $('.sym-fav').addEventListener('click', () => {
    if (!current) return;
    const on = sym.toggleFavorite(current.ch);
    say(on ? t('Añadido a favoritos') : t('Quitado de favoritos'));
    preview(current); if (tab === 'recent' && !q.value && !strokes.length) showTab('recent', { keep: true });
  });

  // ---- Inserting ----
  function insert(it) {
    const ch = it.ch;
    // (Into the selected text: where its cursor was, or at its end if it was chosen meanwhile.)
    const sb = selectedBlock(), el = sb && richOf(sb.id);
    if (el && caret?.id !== sb.id) { const len = el.textContent.length; caret = { id: sb.id, start: len, end: len }; }
    if (el) format.editAt(el, caret);
    let done = format.insertSymbol(ch, font);
    if (!done) {
      // (No text to write in: a new text box with the character.)
      blocks.addText(font ? `<span style="font-family:${esc(font)}">${esc(ch)}</span>` : esc(ch));
      done = !!selectedBlock();
    }
    const nb = selectedBlock(), nel = nb && richOf(nb.id);
    if (nel) {
      const c = nel.isContentEditable ? caretOf(nel) : null;
      const len = nel.textContent.length;
      caret = { id: nb.id, ...(c || { start: len, end: len }) };
    }
    sym.rememberSymbol(ch);
    say(t('Insertado: {c}').replace('{c}', INVISIBLE.test(ch) ? itemName(it) || sym.codeLabel(it.cp) : ch));
    // (Back to the dialog, where the next one is chosen.)
    (!grid.hidden ? grid : !specialEl.hidden ? specialEl : q).focus({ preventScroll: true });
  }

  // ---- Showing a tab ----
  async function showTab(id, { keep = false } = {}) {
    tab = id; markTab(id);
    const isSpecial = id === 'special', isBlocks = id === 'unicode';
    specialEl.hidden = !isSpecial; grid.hidden = isSpecial; $('.sym-blockbar').hidden = !isBlocks;
    if (isSpecial) { showSpecial(); return; }
    if (!index) return;
    if (id === 'recent') {
      const fav = sym.favoriteSymbols(), rec = sym.recentSymbols();
      head.textContent = '';
      const list = [];
      if (fav.length) list.push({ head: t('Favoritos') }, ...fromChars(fav));
      list.push({ head: t('Usados recientemente') }, ...fromChars(rec.length ? rec : ['→', '✓', '★', '•', '€', '©', '°', '…', '😀', '👍', '❤\uFE0F', '🚀']));
      setItems(list, { keep }); return;
    }
    if (isBlocks) { await showBlock(+blockSel.value || 0); return; }
    head.textContent = catLabel(id);
    setItems(fromChars((index.cats.get(id) || []).filter(ok)));
  }
  async function showBlock(start, focusCp = null) {
    tab = 'unicode'; markTab('unicode'); $('.sym-blockbar').hidden = false; specialEl.hidden = true; grid.hidden = false;
    blocksList ||= await sym.loadBlocks();
    if (!blockSel.options.length) blockSel.innerHTML = blocksList.map(b => `<option value="${b.start}">${esc(b.name)} (U+${hex(b.start)}–${hex(b.end)})</option>`).join('');
    const bl = blocksList.find(x => x.start === start) || blocksList[0];
    blockSel.value = String(bl.start);
    head.textContent = t('Cargando…');
    const list = await sym.blockEntries(bl).catch(() => null);
    if (tab !== 'unicode' || +blockSel.value !== bl.start) return;
    if (!list) { head.textContent = t('No se pudo cargar. Comprueba la conexión.'); setItems([]); return; }
    head.textContent = `${bl.name} · ${list.length.toLocaleString(currentLang())} ${t('caracteres')}`;
    setItems(list.map(e => ({ ch: String.fromCodePoint(e.cp), cp: e.cp, kind: e.kind, name: e.name })));
    if (focusCp != null) { const i = items.findIndex(it => it.cp === focusCp); if (i >= 0) moveActive(i); }
  }
  blockSel.addEventListener('change', () => showBlock(+blockSel.value));
  function showSpecial() {
    head.textContent = '';
    specialEl.innerHTML = specials().map(([ch, name], i) => `<div class="sym-sp${i === 0 ? ' on' : ''}" role="option" id="sym-sp-${i}" data-sp="${i}" aria-selected="${i === 0}">`
      + `<span class="sym-sp-g">${INVISIBLE.test(ch) ? `<span class="sym-blank">${hex(cpOf(ch))}</span>` : esc(ch)}</span><span>${esc(name)}</span><code>U+${hex(cpOf(ch))}</code></div>`).join('');
    specialEl.setAttribute('aria-activedescendant', 'sym-sp-0');
    const spItem = i => { const [ch, name] = specials()[i]; return { ch, cp: cpOf(ch), kind: INVISIBLE.test(ch) ? 'blank' : '', name, special: name }; };
    preview(spItem(0)).then(() => { if (current?.special) $('.sym-name').textContent = current.special; });
    specialEl.onclick = e => { const x = e.target.closest('[data-sp]'); if (!x) return; pick(+x.dataset.sp); insert(spItem(+x.dataset.sp)); };
    specialEl.onmouseover = e => { const x = e.target.closest('[data-sp]'); if (x) previewSp(+x.dataset.sp); };
    const pick = i => { specialEl.querySelectorAll('.sym-sp').forEach((x, k) => { x.classList.toggle('on', k === i); x.setAttribute('aria-selected', String(k === i)); });
      specialEl.setAttribute('aria-activedescendant', 'sym-sp-' + i); specialEl.querySelector(`#sym-sp-${i}`)?.scrollIntoView({ block: 'nearest' }); previewSp(i); };
    const previewSp = i => { const it = spItem(i); preview(it).then(() => { if (current === it || current?.ch === it.ch) $('.sym-name').textContent = it.special; }); };
    specialEl.onkeydown = e => {
      const n = specials().length, i = +(specialEl.getAttribute('aria-activedescendant') || 'sym-sp-0').split('-').pop();
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (to !== undefined) { e.preventDefault(); pick(Math.max(0, Math.min(n - 1, to))); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insert(spItem(i)); }
    };
  }

  // ---- Searching ----
  async function search() {
    const text = q.value.trim(), my = ++searchToken;
    if (!text) { if (!strokes.length) showTab(tab === 'search' ? 'recent' : tab); return; }
    if (!index) return;
    setDrawing(false, { keepStrokes: false });
    tab = 'search'; markTab(''); specialEl.hidden = true; grid.hidden = false; $('.sym-blockbar').hidden = true;
    const list = [], seen = new Set();
    const add = it => { if (!seen.has(it.ch)) { seen.add(it.ch); list.push(it); } };
    // A code, or a character pasted: that one first.
    const code = sym.parseCode(text);
    if (code != null) { const info = await sym.unicodeInfo(code).catch(() => null); if (my !== searchToken) return; if (info) add({ ch: String.fromCodePoint(code), cp: code, kind: info.kind, name: info.name }); }
    if ([...text].length === 1 && !/\s/.test(text)) add({ ch: text, cp: cpOf(text), kind: '' });
    const found = sym.searchNames(text, index, names, catLabels).filter(ok);
    found.forEach(ch => add({ ch, cp: cpOf(ch), kind: '' }));
    head.textContent = list.length ? t('{n} resultados').replace('{n}', list.length) : t('Buscando también en todos los nombres de Unicode…');
    setItems(list);
    // Then the official names of all of Unicode (in English), after: loaded the first time.
    if (text.length < 3 && code == null) return;
    const more = await sym.searchUnicode(text).catch(() => []);
    if (my !== searchToken) return;
    const extra = more.filter(e => !seen.has(String.fromCodePoint(e.cp)));
    if (extra.length) {
      setItems([...list, { head: t('Más caracteres de Unicode (nombre oficial en inglés)') }, ...extra.map(e => ({ ch: String.fromCodePoint(e.cp), cp: e.cp, kind: e.kind }))], { keep: true });
      if (!list.length) { active = -1; moveActive(1); }
    }
    const n = items.filter(it => !it.head).length;
    head.textContent = n ? t('{n} resultados').replace('{n}', n.toLocaleString(currentLang())) : t('Ningún símbolo coincide. Prueba con otra palabra, en español o en inglés, o dibújalo.');
    // (The official names of what was found by CLDR name, for its tooltip, are fetched as each is previewed.)
  }
  let st = 0;
  q.addEventListener('input', () => { clearTimeout(st); st = setTimeout(search, 120); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && items.length)) { e.preventDefault(); if (e.key === 'Enter' && items[active] && !items[active].head) insert(items[active]); else grid.focus(); }
  });

  // ---- A code: go to the character, in its block ----
  async function goCode() {
    const cp = sym.parseCode(codeIn.value);
    if (cp == null) { say(t('Escribe un código como U+2192, 2192 o &#8594;')); return; }
    const info = await sym.unicodeInfo(cp).catch(() => null);
    if (!info) { say(t('{c} no es un carácter que se pueda insertar').replace('{c}', sym.codeLabel(cp))); return; }
    q.value = ''; setDrawing(false);
    blocksList ||= await sym.loadBlocks();
    await showBlock(sym.blockOf(blocksList, cp).start, cp);
    say(`${sym.codeLabel(cp)} · ${info.name}`);
  }
  codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goCode(); } });
  codeIn.addEventListener('change', goCode);

  // ---- Drawing ----
  const pad = $('.sym-pad'), canvas = $('.sym-canvas'), padState = $('.sym-pad-state'), drawBtn = $('.sym-draw-btn');
  function setDrawing(on, { keepStrokes = true } = {}) {
    drawing.on = on; pad.hidden = !on; drawBtn.setAttribute('aria-pressed', String(on)); drawBtn.classList.toggle('on', on);
    if (!on && !keepStrokes) strokes.length = 0;
    if (!on) { strokes.length = 0; clearPad(); return; }
    sizePad(); ensureSketch();
  }
  drawBtn.addEventListener('click', () => {
    const on = !drawing.on; q.value = '';
    setDrawing(on);
    if (on) { tab = 'draw'; markTab(''); specialEl.hidden = true; grid.hidden = false; $('.sym-blockbar').hidden = true; head.textContent = t('Dibuja un símbolo y aquí verás los más parecidos.'); setItems([]); }
    else showTab('recent');
  });
  function sizePad() {
    const r = canvas.getBoundingClientRect(), k = devicePixelRatio || 1;
    canvas.width = Math.round((r.width || 180) * k); canvas.height = Math.round((r.height || 180) * k);
    redraw();
  }
  function clearPad() { const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); }
  function redraw() {
    const c = canvas.getContext('2d'), k = canvas.width / (canvas.getBoundingClientRect().width || 1);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.lineWidth = 4 * k; c.lineCap = c.lineJoin = 'round'; c.strokeStyle = getComputedStyle(canvas).color;
    for (const s of strokes) { c.beginPath(); s.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k))); if (s.length === 1) c.lineTo(s[0][0] * k + 0.1, s[0][1] * k); c.stroke(); }
  }
  // The characters to compare with: all of the gallery's that this browser can draw.
  function ensureSketch() {
    if (drawing.index || !index) return;
    // (Which can be drawn is checked as they are measured, a few at a time: not thousands at once.)
    drawing.index = sketchIndex(index.all, familyOf, ok);
    drawing.index.onProgress = (n, total) => {
      padState.textContent = n < total ? t('Preparando los símbolos para comparar… {p} %').replace('{p}', Math.round(100 * n / total)) : '';
      if (strokes.length && (n === total || n % 600 < 40)) recognise();
    };
  }
  let rt = 0;
  function recognise() {
    clearTimeout(rt);
    rt = setTimeout(() => {
      ensureSketch();
      if (!strokes.length || !drawing.index) return;
      const found = drawing.index.rank(strokes, 120);
      head.textContent = t('Los más parecidos a tu dibujo');
      setItems(fromChars(found));
    }, 60);
  }
  let pen = null;
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch {}
    const r = canvas.getBoundingClientRect(); pen = [[e.clientX - r.left, e.clientY - r.top]]; strokes.push(pen); redraw();
  });
  canvas.addEventListener('pointermove', e => {
    if (!pen) return;
    const r = canvas.getBoundingClientRect();
    // (Every point the pen went through since the last frame, where the browser gives them.)
    const all = e.getCoalescedEvents?.();
    for (const p of all?.length ? all : [e]) pen.push([p.clientX - r.left, p.clientY - r.top]);
    redraw();
  });
  const endPen = () => { if (!pen) return; pen = null; recognise(); };
  canvas.addEventListener('pointerup', endPen); canvas.addEventListener('pointercancel', endPen);
  $('.sym-clear').addEventListener('click', () => { strokes.length = 0; clearPad(); head.textContent = t('Dibuja un símbolo y aquí verás los más parecidos.'); setItems([]); });

  // ---- Closing ----
  const close = () => { drawing.index?.stop(); ro.disconnect(); back.remove(); if (open === ui) open = null; };
  $('.modal-close').addEventListener('click', close);
  ui.close = close;

  // ---- Loading the data, then the first tab ----
  head.textContent = t('Cargando…');
  Promise.all([sym.loadIndex(), ...LANGS.map(l => sym.loadNames(l).catch(() => null))]).then(([ix, ...ns]) => {
    if (!back.isConnected) return;
    index = ix; LANGS.forEach((l, i) => { if (ns[i]) names[l] = ns[i]; });
    // (The categories' names in the three languages: «flecha» finds every arrow.)
    for (const id of [...sym.SYMBOL_CATS, ...sym.EMOJI_CATS]) catLabels[id] = [catLabel(id)].map(fold);
    showTab(tab);
    if (q.value.trim()) search();
  }).catch(() => { head.textContent = t('No se pudo cargar. Comprueba la conexión.'); });
  // (For tests and the API: what's on show.)
  Object.assign(ui, { items: () => items, search: v => { q.value = v; return search(); }, showTab, showBlock, goCode: v => { codeIn.value = v; return goCode(); },
    draw: s => { setDrawing(true); strokes.length = 0; strokes.push(...s.map(x => x.map(p => [...p]))); redraw(); return drawing.index.ready.then(() => { clearTimeout(rt); const found = drawing.index.rank(strokes, 120); setItems(fromChars(found)); return found; }); },
    ready: () => sym.loadIndex(), insert: i => insert(items[i]), caret: () => caret });
  return ui;
}
