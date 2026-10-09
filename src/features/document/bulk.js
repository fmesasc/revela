// «Generar desde una hoja» (as Canva's Bulk Create): diplomas, name cards, certificates… The author writes
// placeholders — {{nombre}}, {{nota}} — in a slide's texts; each row of a spreadsheet makes a copy of the chosen
// slides with its values in them. Values are text: escaped into the slides' HTML, never read as HTML.

import { state, commit } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { cloneSlide } from './slides.js';

export const MAX_ROWS = 500, MAX_SLIDES = 1000;           // (each copy carries its pictures: past that, too heavy to keep)
const PH = /\{\{\s*([^{}<>]{1,60}?)\s*\}\}/g;
// A placeholder's or a column's name, compared without case, accents, spaces or punctuation: {{Nombre }} = «NOMBRE».
export const phKey = s => String(s || '').replace(/&nbsp;|&#160;/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');

// Where a slide has text: its boxes and shapes, its tables' cells, its notes and its objects' alternative text.
const texts = s => s.blocks.flatMap(b => [b.html, b.alt, ...(b.type === 'table' ? (b.rows || []).flat() : [])]).concat(s.notes).filter(x => typeof x === 'string');
// The placeholders in these slides, in the order they first appear: [{ key, name }] (name: as written the first time).
export function placeholdersIn(slides) {
  const seen = new Map();
  for (const s of slides) for (const x of texts(s)) for (const m of x.matchAll(PH)) { const k = phKey(m[1]); if (k && !seen.has(k)) seen.set(k, m[1].replace(/&nbsp;|&#160;/g, ' ').trim()); }
  return [...seen].map(([key, name]) => ({ key, name }));
}
// Each placeholder → the column with the same name (or -1): { key: index }.
export function autoMap(phs, header) {
  const cols = (header || []).map(phKey);
  return Object.fromEntries(phs.map(p => [p.key, cols.indexOf(p.key)]));
}

// A copy that shares the strings (a big picture is not copied once per row) — plain data, as the deck is.
const shared = v => (Array.isArray(v) ? v.map(shared) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shared(x)])) : v);
// The slides for one row: each placeholder with a column becomes its value (in HTML, escaped, line breaks kept);
// one without a column stays as it is, to be seen.
export function fillSlides(slides, row, map) {
  const val = key => (map[key] >= 0 ? String(row[map[key]] ?? '') : null);
  const sub = (x, html) => x.replace(PH, (m, name) => { const v = val(phKey(name)); return v == null ? m : html ? esc(v).replace(/\r?\n/g, '<br>') : v; });
  return slides.map(src => {
    const s = cloneSlide(src, shared);
    if (typeof s.notes === 'string') s.notes = sub(s.notes, false);
    for (const b of s.blocks) {
      if (typeof b.html === 'string') b.html = sub(b.html, true);
      if (typeof b.alt === 'string') b.alt = sub(b.alt, false);
      if (b.type === 'table' && Array.isArray(b.rows)) b.rows = b.rows.map(r => r.map(c => (typeof c === 'string' ? sub(c, true) : c)));
    }
    return s;
  });
}

// rows: the data rows (no header). → the new slides, in order: the chosen slides for row 1, then for row 2…
export function bulkSlides(slides, rows, map) {
  const per = Math.max(1, slides.length), n = Math.min(rows.length, MAX_ROWS, Math.floor(MAX_SLIDES / per));
  return rows.slice(0, n).flatMap(r => fillSlides(slides, r, map));
}
// The rows that will be used, at most: what fits the limits for this many slides per row.
export const rowLimit = per => Math.min(MAX_ROWS, Math.floor(MAX_SLIDES / Math.max(1, per)));

// Put them in the presentation, after its last slide. → how many slides.
export function addBulk(made) {
  if (!made.length) return 0;
  commit(() => {
    state.ui.slideIndex = state.deck.slides.length; state.deck.slides.push(...made);
    state.ui.selection = null; state.ui.multi = []; state.ui.slideSel = [];
  });
  return made.length;
}
// A presentation with only these slides and this one's design (master, layouts, theme): a new one, or just for the PDF.
export const deckWith = (made, deck = state.deck, name = deck.name) =>
  ({ ...shared({ ...deck, slides: [] }), name, sections: [], slides: made.map(s => ({ ...s, sectionId: null })) });
