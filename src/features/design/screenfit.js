// Fitting the slides to a screen of another proportion when presenting
// (Ver ▸ Ajuste a la pantalla, and the presentation settings), deck.reveal.fit:
//   'bands' — the slide letterboxed in black;
//   'fill'  — the bands show the slide's own background carried out (default);
//   'adapt' — the slide takes the screen's proportion and its objects are laid
//             out again on it, never distorted.
// fitSize and adaptLayout also run inside the presentation (embedded with
// toString() by io/runtime/screenfit.js): they use nothing from outside.

import { state, commit } from '../../core/store.js';
import { canvasOn } from './canvasmode.js';

export const FIT_MODES = ['fill', 'bands', 'adapt'];
export const FIT_LABELS = { bands: 'Franjas negras', fill: 'Rellenar con el fondo', adapt: 'Adaptar a la pantalla' };

// The deck's choice, and the mode it presents with (canvas mode has no single
// slide to adapt: it fills).
export const fitChoice = (deck = state.deck) => (FIT_MODES.includes(deck.reveal?.fit) ? deck.reveal.fit : 'fill');
export function fitMode(deck = state.deck) {
  const mode = fitChoice(deck);
  return mode === 'adapt' && canvasOn(deck) ? 'fill' : mode;
}
export function setFitMode(mode) {
  if (!FIT_MODES.includes(mode)) return;
  commit(() => {
    const r = { ...(state.deck.reveal || {}) };
    if (mode === 'fill') delete r.fit; else r.fit = mode;
    if (Object.keys(r).length) state.deck.reveal = r; else delete state.deck.reveal;
  });
}

// The slide's logical size on a vw×vh screen: the height kept and the width
// grown to the screen's proportion, or the width kept on a narrower screen.
export function fitSize(W, H, vw, vh) {
  const a = vw / vh;
  if (!(a > 0) || !isFinite(a) || Math.abs(a - W / H) < 0.004) return { w: W, h: H };
  return a > W / H ? { w: Math.round(H * a), h: H } : { w: W, h: Math.round(W / a) };
}

// Where each object goes on the W2×H2 slide. items: [{ id, x, y, w, h, kind, group }]
// (kind 'text' may widen, 'conn' spans the slide and is redrawn from its ends).
// Per axis: an object spanning ≥ 90 % of the slide stretches with it; any other
// keeps its size and puts its centre at the same fraction of the new slide
// (scaled down evenly only if it would no longer fit). A group moves as one,
// its members laid out the same way inside it. A text box widens with the
// slide if that doesn't make it overlap anything it didn't overlap before.
// → { id: { x, y, w, h } }
export function adaptLayout(items, W, H, W2, H2) {
  const SPAN = 0.9, out = {};
  const r4 = v => Math.round(v * 100) / 100;
  // One rectangle from frame f (x, y, w, h) to frame g.
  function map(r, f, g) {
    const kx = g.w / f.w, ky = g.h / f.h, spanX = r.w >= SPAN * f.w, spanY = r.h >= SPAN * f.h;
    let w = spanX ? r.w * kx : r.w, h = spanY ? r.h * ky : r.h;
    // (only if it would no longer fit: scaled evenly by the smaller factor)
    if ((!spanX && w > g.w) || (!spanY && h > g.h)) { const k = Math.min(kx, ky, g.w / r.w, g.h / r.h); if (!spanX) w = r.w * k; if (!spanY) h = r.h * k; }
    const cx = g.x + (r.x + r.w / 2 - f.x) * kx, cy = g.y + (r.y + r.h / 2 - f.y) * ky;
    let x = spanX ? g.x + (r.x - f.x) * kx : cx - w / 2, y = spanY ? g.y + (r.y - f.y) * ky : cy - h / 2;
    // (one against an edge — a footer, a side band — stays against it)
    if (!spanX && r.x <= f.x + 1) x = g.x + r.x - f.x; else if (!spanX && r.x + r.w >= f.x + f.w - 1) x = g.x + g.w - w + (r.x + r.w - f.x - f.w);
    if (!spanY && r.y <= f.y + 1) y = g.y + r.y - f.y; else if (!spanY && r.y + r.h >= f.y + f.h - 1) y = g.y + g.h - h + (r.y + r.h - f.y - f.h);
    // (what was inside the frame stays inside)
    if (r.x >= f.x - 0.5 && r.x + r.w <= f.x + f.w + 0.5) x = Math.max(g.x, Math.min(x, g.x + g.w - w));
    if (r.y >= f.y - 0.5 && r.y + r.h <= f.y + f.h + 0.5) y = Math.max(g.y, Math.min(y, g.y + g.h - h));
    return { x, y, w, h, spanX, spanY };
  }
  const slide0 = { x: 0, y: 0, w: W, h: H }, slide1 = { x: 0, y: 0, w: W2, h: H2 };
  const units = [], groups = {};
  for (const it of items) {
    if (it.kind === 'conn') continue;
    if (it.group) { (groups[it.group] = groups[it.group] || []).push(it); continue; }
    units.push({ ids: [it.id], r: it, text: it.kind === 'text' });
  }
  for (const g in groups) {
    const m = groups[g], x = Math.min(...m.map(i => i.x)), y = Math.min(...m.map(i => i.y));
    const r = { x, y, w: Math.max(...m.map(i => i.x + i.w)) - x, h: Math.max(...m.map(i => i.y + i.h)) - y };
    units.push({ ids: m.map(i => i.id), r, members: m });
  }
  for (const u of units) {
    u.n = map(u.r, slide0, slide1);
    if (u.members) for (const i of u.members) { const n = map(i, { ...u.r, w: u.r.w || 1, h: u.r.h || 1 }, u.n); out[i.id] = { x: r4(n.x), y: r4(n.y), w: r4(n.w), h: r4(n.h) }; }
    else out[u.r.id] = { x: r4(u.n.x), y: r4(u.n.y), w: r4(u.n.w), h: r4(u.n.h) };
  }
  // Text boxes wider with the slide, where there's room. (An object spanning the
  // slide in both directions is a backdrop, never in the way.)
  const hit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
  const kx = W2 / W;
  if (kx > 1.001) for (const u of units) {
    if (!u.text || u.n.spanX) continue;
    const r = u.r, c = out[r.id], w = r.w * kx, wide = { x: c.x + c.w / 2 - w / 2, y: c.y, w, h: c.h };
    if (wide.x < 0 || wide.x + w > W2 + 0.5) continue;
    const others = units.filter(o => o !== u && !(o.n.spanX && o.n.spanY));
    // (no new overlaps, and still inside what it sat on — a card, a panel)
    const inside = (a, b) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
    if (others.some(o => (hit(r, o.r) ? inside(r, o.r) && !inside(wide, o.n) : o.ids.some(id => hit(wide, out[id]))))) continue;
    out[r.id] = { x: r4(wide.x), y: c.y, w: r4(w), h: c.h };
  }
  // Connectors: over the whole slide (their line is drawn again from their ends).
  for (const it of items) if (it.kind === 'conn') {
    const n = it.x <= 1 && it.y <= 1 && it.w >= W - 1 && it.h >= H - 1 ? slide1 : map(it, slide0, slide1);
    out[it.id] = { x: r4(n.x), y: r4(n.y), w: r4(n.w), h: r4(n.h) };
  }
  return out;
}
