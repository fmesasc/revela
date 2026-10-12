// Figure/table captions and the auto‑generated list of figures. A caption is
// text under a block ("Figure N: …"); numbers are assigned across the whole deck
// so the list of figures stays consistent.

import { t } from '../../i18n/index.js';
import { esc } from '../../core/text.js';

export const labelKey = b => (b.type === 'table' ? 'Tabla' : 'Figura');

// kind: 'figures' | 'tables' | anything else = both.
export function collectFigures(deck, kind) {
  const out = []; const c = { Figura: 0, Tabla: 0 };
  (deck.slides || []).forEach((s, si) => (s.blocks || []).forEach(b => {
    if (!b.caption) return;
    const label = labelKey(b); c[label]++;
    if (kind === 'figures' && label !== 'Figura') return;
    if (kind === 'tables' && label !== 'Tabla') return;
    out.push({ id: b.id, slide: si, label, num: c[label], caption: b.caption });
  }));
  return out;
}
// Deck slide index → index among visible slides (for reveal.js #/n links).
// reveal.js position of each visible slide: "h/v". A slide marked `vertical`
// goes below the previous visible one (vertical stack).
export function slidePaths(deck) {
  const m = new Map(); let h = -1, v = 0;
  (deck.slides || []).forEach((s, i) => {
    if (s.hidden) return;
    if (s.vertical && h >= 0) v++; else { h++; v = 0; }
    m.set(i, `${h}/${v}`);
  });
  return m;
}
export const figIndexTitle = kind => (kind === 'tables' ? 'Índice de tablas' : 'Índice de figuras');
export const figuresMap = deck => new Map(collectFigures(deck).map(f => [f.id, f]));
export const captionLine = f => `${t(f.label)} ${f.num}: ${f.caption}`;

// A caption as HTML, with the words that link somewhere made links (b.captionLinks: [{ text, href }] — a stock
// photo's «Photo by <name> on Unsplash», its photographer's profile and the service, as Unsplash and Pexels
// ask). Each one where its words are in the caption (in any order, the first time; a caption edited by
// hand that no longer says them keeps them as text); only https links, opened apart.
export function captionHTML(text, links) {
  const s = String(text || ''), spans = [];
  for (const l of Array.isArray(links) ? links : []) {
    const w = String(l?.text || ''), href = String(l?.href || '');
    if (!w || !/^https:\/\/[^\s"'<>]+$/.test(href)) continue;
    const at = s.indexOf(w); if (at < 0 || spans.some(x => at < x.end && at + w.length > x.at)) continue;
    spans.push({ at, end: at + w.length, href });
  }
  let out = '', from = 0;
  for (const x of spans.sort((a, b) => a.at - b.at)) {
    out += esc(s.slice(from, x.at)) + `<a href="${esc(x.href)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${esc(s.slice(x.at, x.end))}</a>`;
    from = x.end;
  }
  return out + esc(s.slice(from));
}
