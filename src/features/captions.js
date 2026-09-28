// Figure/table captions and the auto‑generated list of figures. A caption is
// text under a block ("Figure N: …"); numbers are assigned across the whole deck
// so the list of figures stays consistent.

import { t } from '../i18n.js';

export const labelKey = b => (b.type === 'table' ? 'Tabla' : 'Figura');

export function collectFigures(deck) {
  const out = []; const c = { Figura: 0, Tabla: 0 };
  (deck.slides || []).forEach((s, si) => (s.blocks || []).forEach(b => {
    if (b.caption) { const label = labelKey(b); c[label]++; out.push({ id: b.id, slide: si, label, num: c[label], caption: b.caption }); }
  }));
  return out;
}
export const figuresMap = deck => new Map(collectFigures(deck).map(f => [f.id, f]));
export const captionLine = f => `${t(f.label)} ${f.num}: ${f.caption}`;
