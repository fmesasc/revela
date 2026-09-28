// Figure/table captions and the auto‑generated list of figures. A caption is
// text under a block ("Figure N: …"); numbers are assigned across the whole deck
// so the list of figures stays consistent.

import { t } from '../i18n.js';

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
export function visibleIndexMap(deck) {
  const m = new Map(); let vi = 0;
  (deck.slides || []).forEach((s, i) => { if (!s.hidden) { m.set(i, vi); vi++; } });
  return m;
}
export const figIndexTitle = kind => (kind === 'tables' ? 'Índice de tablas' : 'Índice de figuras');
export const figuresMap = deck => new Map(collectFigures(deck).map(f => [f.id, f]));
export const captionLine = f => `${t(f.label)} ${f.num}: ${f.caption}`;
