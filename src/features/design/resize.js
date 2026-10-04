// Resize the presentation (Canva's "Magic resize", PowerPoint's "Slide size ▸
// Scale"): to another shape — 16:9, 4:3, A4, square for social media, 9:16 for
// stories — moving and scaling what is on the slides so it still fits, in one
// undo step. Positions keep their place in proportion; text boxes take the new
// width and height, with the letters scaled between keeping the same lines and
// keeping the same size; pictures, shapes and other objects keep their
// proportions; bands across the whole slide stretch with it. Going to a much
// taller shape, what was side by side in a row is stacked, one under another.
// The master, its layouts and their text styles are resized the same way.

import { state, commit } from '../../core/store.js';
import { allMasters, masterStyles } from '../document/master.js';

export const SIZES = [
  ['1280x720', '16:9 (pantalla)'], ['960x720', '4:3'], ['1280x905', 'A4 horizontal'], ['905x1280', 'A4 vertical'],
  ['1080x1080', 'Cuadrada (redes sociales)'], ['1024x1280', 'Vertical 4:5 (redes sociales)'], ['720x1280', 'Vertical 9:16 (historias)'],
];
const r = n => Math.round(n);
// How much letters grow or shrink: between the smaller stretch (same lines) and the area's (same size).
const fontScale = (sx, sy) => Math.min(1.4, Math.sqrt(Math.min(sx, sy) * Math.sqrt(sx * sy)));

function resizeBlock(b, sx, sy, W1, H1, W2, H2) {
  if (b.type === 'connector') { Object.assign(b, { x: 0, y: 0, w: W2, h: H2 }); return; }
  const cx = (b.x + b.w / 2) * sx, cy = (b.y + b.h / 2) * sy;
  const wide = b.w >= W1 * 0.95, tall = b.h >= H1 * 0.95;
  let w, h;
  if (b.type === 'text') {
    w = b.w * sx; h = b.h * sy;
    const f = fontScale(sx, sy);
    if (b.fontSize) b.fontSize = Math.max(8, r(b.fontSize * f));
    if (b.html) b.html = b.html.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, n) => `font-size:${Math.max(8, r(n * f))}px`);
  } else if (wide || tall) {                       // a band or a background: stretched
    w = wide ? b.w * sx : b.w * Math.min(sx, sy); h = tall ? b.h * sy : b.h * Math.min(sx, sy);
  } else {                                         // its own proportions, as big as fits
    const f = Math.min(Math.sqrt(sx * sy), (W2 * 0.96) / b.w, (H2 * 0.96) / b.h, Math.max(sx, sy));
    w = b.w * f; h = b.h * f;
  }
  const k = Math.max(4, r(w)) / b.w;
  b.w = Math.max(4, r(w)); b.h = Math.max(4, r(h));
  // A magnifier's area: where it was, in proportion, as much bigger as its box.
  if (b.type === 'magnify' && b.source) { const s = b.source, sx2 = (s.x + s.w / 2) * sx, sy2 = (s.y + s.h / 2) * sy; s.w = r(s.w * k); s.h = r(s.h * k); s.x = r(sx2 - s.w / 2); s.y = r(sy2 - s.h / 2); }
  // Its centre where it was, in proportion, but inside the slide (unless it was out on purpose).
  let x = cx - b.w / 2, y = cy - b.h / 2;
  if (b.x >= 0 && b.x + (b.w / sx) <= W1 + 1) x = Math.min(Math.max(0, x), Math.max(0, W2 - b.w));
  if (b.y >= 0 && b.y + (b.h / sy) <= H1 + 1) y = Math.min(Math.max(0, y), Math.max(0, H2 - b.h));
  b.x = r(x); b.y = r(y);
}

// Rows: objects side by side (their middles at about the same height, not
// overlapping across) — each such group of two or more, left to right.
function rowsOf(blocks, H1) {
  const cand = blocks.filter(b => b.type !== 'connector' && !b.decorative);
  const rows = [];
  for (const b of cand.sort((a, c) => (a.y + a.h / 2) - (c.y + c.h / 2))) {
    const cy = b.y + b.h / 2;
    const row = rows.find(rw => Math.abs(rw.cy - cy) < H1 * 0.12 && rw.items.every(o => o.x + o.w <= b.x + 4 || b.x + b.w <= o.x + 4));
    if (row) row.items.push(b); else rows.push({ cy, items: [b] });
  }
  return rows.filter(rw => rw.items.length > 1).map(rw => rw.items.sort((a, c) => a.x - c.x));
}
// A row, stacked: each object one under another, centred across, around where the row was.
function stackRow(items, sx, sy, W1, H1, W2, H2) {
  const gap = H2 * 0.025, sizes = items.map(b => {
    if (b.type === 'text') {
      const f = fontScale(sx, sy) * 1.15, w = Math.min(W2 * 0.86, Math.max(b.w * f, W2 * 0.6));
      if (b.fontSize) b.fontSize = Math.max(8, r(b.fontSize * f));
      if (b.html) b.html = b.html.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, n) => `font-size:${Math.max(8, r(n * f))}px`);
      return [w, b.h * f * (b.w / w) * 1.1];
    }
    const f = Math.min((W2 * 0.8) / b.w, (H2 * 0.3) / b.h, 1.4);
    return [b.w * f, b.h * f];
  });
  const total = sizes.reduce((a, [, h]) => a + h, 0) + gap * (items.length - 1);
  const cy = items.reduce((a, b) => a + b.y + b.h / 2, 0) / items.length * sy;
  let y = Math.min(Math.max(H2 * 0.04, cy - total / 2), Math.max(H2 * 0.04, H2 - total - H2 * 0.04));
  items.forEach((b, i) => { const [w, h] = sizes[i]; b.w = r(w); b.h = r(h); b.x = r((W2 - w) / 2); b.y = r(y); y += h + gap; });
}

// Resize (w × h); fit = false only changes the size (what PowerPoint calls "Don't scale").
export function resizeDeck(w, h, { fit = true } = {}, deck = state.deck) {
  const { w: W1, h: H1 } = deck.size; if (!w || !h || (w === W1 && h === H1)) return;
  const sx = w / W1, sy = h / H1, f = fontScale(sx, sy), taller = sy / sx > 1.4;
  commit(() => {
    deck.size = { w, h };
    if (!fit) return;
    const all = [...deck.slides, ...allMasters(deck), ...(deck.layouts || [])];
    for (const s of all) {
      const rows = taller && deck.slides.includes(s) ? rowsOf((s.blocks || []).filter(b => b.w < 0.9 * W1), H1) : [];
      const stacked = new Set(rows.flat());
      for (const b of s.blocks || []) if (!stacked.has(b)) resizeBlock(b, sx, sy, W1, H1, w, h);
      for (const row of rows) stackRow(row, sx, sy, W1, H1, w, h);
    }
    for (const m of allMasters(deck)) {                   // the text styles that placeholders inherit
      if (!m.styles) continue;
      const st = masterStyles(deck, m);
      for (const k of ['title', 'subtitle', 'body']) if (st[k]?.size) st[k].size = Math.max(8, r(st[k].size * f));
      for (const lv of st.body.levels || []) if (lv.size) lv.size = Math.max(8, r(lv.size * f));
    }
  });
}
