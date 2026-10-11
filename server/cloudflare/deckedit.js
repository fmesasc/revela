// The public API's changes to a presentation (publicapi.js: add, change or delete slides, find and replace), run by
// the document's own object (docs.js CloudDoc, op 'change') on its deck in memory: the change and what it is in
// operations (collabsync.js diff) are made there, in its turn, against the deck as it is.
//
// Why there and not in the worker: the worker used to read the whole deck from the object, change a copy and send back
// the operations — the deck travelled whole on every change (twice through JSON), the owner's account was asked twice
// whether it may change, and two changes at once were worked out on the same old deck. In the object, a change is made
// on the latest deck, and the changes that wait in its queue are written together (CloudDoc.drain).
//
// Each one changes the deck it is given (a copy: CloudDoc compares it with the original) and returns its answer, or
// throws EditError(status, message), which becomes that answer.

import { slidesFromSpecs, respecSlide, cleanSpec, MAX_SLIDES } from '../../src/features/ai/specdeck.js';

export class EditError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new EditError(status, message); };
const str = v => (v == null ? '' : String(v));
// A 1-based place (default: at the end), as a 0-based index.
export const position = (p, n) => (Number.isInteger(+p) && +p >= 1 ? Math.min(n, +p - 1) : n);

// Every text in a deck (objects' HTML, tables' cells, notes), for find-and-replace: only text between tags.
export function replaceIn(deck, find, rep) {
  let n = 0;
  const swap = html => String(html).replace(/(^|>)([^<]*)/g, (m, a, t) => { const parts = t.split(find); n += parts.length - 1; return a + parts.join(rep); });
  const escd = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f0 = find; find = escd(f0); rep = escd(rep);
  for (const s of deck.slides || []) {
    for (const b of s.blocks || []) {
      if (typeof b.html === 'string') b.html = swap(b.html);
      if (Array.isArray(b.rows)) b.rows = b.rows.map(r => r.map(c => (typeof c === 'string' ? swap(c) : c && typeof c.html === 'string' ? { ...c, html: swap(c.html) } : c)));
    }
    if (typeof s.notes === 'string' && s.notes.includes(f0)) { n += s.notes.split(f0).length - 1; s.notes = s.notes.split(f0).join(rep.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
  }
  return n;
}

export const EDITS = {
  // { specs (already with their pictures: publicapi.js findPictures), position? }
  addSlides(deck, { specs, position: p } = {}) {
    if (!Array.isArray(specs) || !specs.length || specs.length > MAX_SLIDES) fail(400, 'no slides');
    const at = position(p, deck.slides.length), made = slidesFromSpecs(deck, specs, at);
    const sec = deck.slides[at - 1]?.sectionId || null; made.forEach(s => (s.sectionId = sec));
    deck.slides.splice(at, 0, ...made);
    return { added: made.map(s => s.id) };
  },
  // { slide, spec?, notes?, hidden?, position? }
  updateSlide(deck, a = {}) {
    const s = (deck.slides || []).find(x => x.id === str(a.slide)); if (!s) fail(404, 'no such slide');
    if (a.spec) { if (!cleanSpec(a.spec)) fail(400, 'bad spec'); respecSlide(deck, s, a.spec); }
    if (typeof a.notes === 'string') s.notes = a.notes.slice(0, 20000);
    if (typeof a.hidden === 'boolean') s.hidden = a.hidden;
    if (a.position != null) { const i = deck.slides.indexOf(s); deck.slides.splice(i, 1); deck.slides.splice(position(a.position, deck.slides.length), 0, s); }
    return { ok: true };
  },
  // { slides: [ids] }
  deleteSlides(deck, { slides } = {}) {
    const ids = (Array.isArray(slides) ? slides : []).map(str);
    const keep = deck.slides.filter(s => !ids.includes(s.id));
    if (keep.length === deck.slides.length) fail(404, 'no such slide');
    if (!keep.length) fail(400, 'a deck keeps one slide at least');
    deck.slides = keep;
    return { ok: true, slides: keep.length };
  },
  // { find, replace }
  replace(deck, { find, replace } = {}) {
    if (!str(find)) fail(400, 'find is empty');
    return { changed: replaceIn(deck, str(find), str(replace)) };
  },
};
