// The kit the example presentations are built with (templates/*.js and
// examples.js): a deck from a palette and a font pair (master styles, layouts,
// decorations), slides from layouts, and small builders for every kind of
// object — text, cards, shapes, icons, 3D models (Revela's library and NASA's),
// charts, tables, code, equations, diagrams, polls and activities, timers —
// and for animations (several per object, in order, drawn paths).
//
import { emptyDeck, uid, chartBlock, tableBlock, codeBlock, mathBlock } from '../../../core/model.js';
import { PALETTES, pairStacks } from '../../design/palettes.js';
import { ensureLayouts, masterStyles, newSlideBlocks } from '../../document/master.js';
import { pollBlock } from '../../live/poll.js';
import { placeOnDesign } from '../../design/canvasmode.js';
import { canvasDesign } from '../../design/canvasdesigns.js';
import { LIBRARY_3D } from '../library3d.js';
import { NASA_3D } from '../nasa3d.js';
import { normalizeAnim } from '../../animation/transitions.js';

// ---- Small builders ------------------------------------------------------------
// ul('a', ['a1', 'a2'], 'b'): an array right after an item nests under it.
export const ul = (...items) => '<ul>' + items.map((it, i) => (Array.isArray(it) ? ''
  : `<li>${it}${Array.isArray(items[i + 1]) ? ul(...items[i + 1]) : ''}</li>`)).join('') + '</ul>';
export const base = (x, y, w, h) => ({ id: uid(), x, y, w, h, rotation: 0, animation: null });
export const text = (html, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'text', html, fontSize: 28, ...props });
export const card = (html, x, y, w, h, bg, props = {}) => text(html, x, y, w, h, { bg, radius: 18, pad: [24, 26, 24, 26], fontSize: 30, ...props });
export const shape = (kind, x, y, w, h, fill, props = {}) => ({ ...base(x, y, w, h), type: 'shape', shape: kind, fill, stroke: fill, strokeWidth: 0, ...props });
export const icon = (name, x, y, size, color) => ({ ...base(x, y, size, size), type: 'icon', icon: name, color, decorative: true });
export const anim = (b, order, effect = 'fade-up') => ({ ...b, animation: { effect, order, duration: 500, delay: 0 } });
export const big = (n, label, x, y, color, fg) => text(`<div style="font-size:96px;font-weight:800;color:${color};line-height:1.05">${n}</div><div>${label}</div>`, x, y, 340, 220, { fontSize: 30, textAlign: 'center', color: fg });

// A deck: palette + font pair → master styles, decorations and the layouts.
export function build({ name, palette, fonts, decor = () => [], title = {}, body = {} }, slides) {
  const p = PALETTES[palette], st = pairStacks(fonts);
  const deck = emptyDeck();
  Object.assign(deck, { name, palette, fontPair: fonts, bodyFont: st.body });
  deck.master = { id: 'master', background: null, blocks: decor(p).map(b => ({ ...b, decorative: true })) };
  const s = masterStyles(deck);
  Object.assign(s.title, { size: 52, font: st.heading, color: p.accents[0], bold: true, ...title });
  Object.assign(s.subtitle, { size: 34, font: st.body, color: p.fg });
  Object.assign(s.body, { size: 36, font: st.body, color: p.fg, ...body });
  // Sizes that read well projected: 36 / 30 / 26 / 24 / 22 px by level.
  [36, 30, 26, 24, 22].forEach((z, i) => { s.body.levels[i].size = i ? z : s.body.size; });
  ensureLayouts(deck);
  deck.slides = slides.map(sl => slide(deck, p, sl));
  return deck;
}
// (extra: objects over the placeholders; back: under them — glows, bands, decoration behind the title.)
export function slide(deck, p, { layout = 'titleContent', title, subtitle, body, body2, notes = '', extra = [], back = [], transition = null, bg, ...rest }) {
  const lay = deck.layouts.find(l => l.id === layout);
  const blocks = newSlideBlocks(lay);
  const bodies = [body, body2];
  for (const b of blocks) {
    if (b.ph === 'title' && title != null) b.html = title;
    else if (b.ph === 'subtitle' && subtitle != null) b.html = subtitle;
    else if (b.ph === 'body') b.html = bodies.shift() ?? '';
  }
  return { id: uid(), layoutId: lay.id, background: bg || p.bg, sectionId: null, transition, hidden: false, notes, autoSlide: 0,
    blocks: [...back, ...blocks.filter(b => b.html), ...extra], ...rest };
}
// A 3D model from the library (loaded from its address: needs a connection), with its credit.
export const lib3d = id => LIBRARY_3D.find(m => m.id === id);
export const model = (id, x, y, w, h, props = {}) => { const m = lib3d(id);
  // (Its credit as a caption only when the licence asks for it: CC0 doesn't.)
  const credit = m.licenses.every(l => l === 'CC0-1.0') ? {} : { caption: m.credit };
  return { ...base(x, y, w, h), type: 'model', src: m.src, poster: m.thumb, alt: m.label, ...credit, autoRotate: false, view: 'front', ...(m.rest && { clip: m.rest }), ...props }; };
// Animations: { effect, start: 'click' | 'withPrev' | 'afterPrev', … } in play order (seq); the click numbers come after.
let seq = 0;
export const A = (effect, props = {}) => ({ effect, order: 1, seq: ++seq, start: 'click', duration: effect === 'path' ? 2000 : 600, delay: 0, ...props });
export const withAnims = (b, first, ...more) => ({ ...b, animation: first, ...(more.length && { anims: more }) });
// A path through points (relative to where the object is), smooth and at even speed.
// (A path starts where the object is: [0,0] first, added if missing — otherwise it would jump to the first point.)
export const path = (points, props = {}) => { const pts = points[0]?.[0] === 0 && points[0]?.[1] === 0 ? points : [[0, 0], ...points];
  return A('path', { pathShape: 'custom', points: pts, dx: pts.at(-1)[0], dy: pts.at(-1)[1], ...props }); };
export const numbered = deck => { deck.slides.forEach(sl => normalizeAnim(sl)); return deck; };
export const bar = (p, i = 0) => [shape('rect', 0, 0, 1280, 12, p.accents[i]), shape('rect', 0, 708, 1280, 12, p.accents[i])];
// A soft light behind things: a round gradient from a colour into the background.
export const glow = (x, y, d, color, bg, opacity = 70) => shape('ellipse', x, y, d, d, color, { fill2: bg, gradType: 'radial', opacity });
// A diagram (SmartArt-style), written as an outline.
export const dg = (layout, outline, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'diagram', layout, colors: 'colorful', text: outline, ...props });
export const timer = (seconds, x, y, size, props = {}) => ({ ...base(x, y, size, size), type: 'timer', seconds, style: 'ring', auto: true, sound: true, ...props });
// A made-up app screen (SVG), to show inside a phone or a laptop.
export const appScreen = (w, h, color, title, rows = 4) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#f5f6fa"/>`
  + `<rect width="${w}" height="${h * 0.16}" fill="${color}"/><text x="${w * 0.07}" y="${h * 0.105}" font-family="sans-serif" font-size="${h * 0.045}" font-weight="700" fill="#fff">${title}</text>`
  + Array.from({ length: rows }, (_, i) => { const y = h * 0.2 + i * h * 0.19;
    return `<rect x="${w * 0.06}" y="${y}" width="${w * 0.88}" height="${h * 0.16}" rx="${h * 0.02}" fill="#fff" stroke="#e1e4ec"/>`
      + `<circle cx="${w * 0.17}" cy="${y + h * 0.08}" r="${h * 0.045}" fill="${color}" opacity="${1 - i * 0.18}"/>`
      + `<rect x="${w * 0.3}" y="${y + h * 0.05}" width="${w * 0.5}" height="${h * 0.025}" rx="${h * 0.012}" fill="#cfd4df"/>`
      + `<rect x="${w * 0.3}" y="${y + h * 0.095}" width="${w * 0.33}" height="${h * 0.02}" rx="${h * 0.01}" fill="#e3e6ee"/>`; }).join('') + '</svg>');

export { emptyDeck, uid, chartBlock, tableBlock, codeBlock, mathBlock, PALETTES, pairStacks, ensureLayouts, masterStyles, newSlideBlocks, pollBlock, placeOnDesign, canvasDesign, LIBRARY_3D, normalizeAnim };
// A NASA model (NASA 3D Resources: free, no copyright; loaded from its address).
export const nasa = (id, x, y, w, h, props = {}) => { const m = NASA_3D.find(n => n.id === id);
  if (!m) throw new Error('NASA model not found: ' + id);
  return { ...base(x, y, w, h), type: 'model', src: m.src, poster: m.thumb, alt: m.name, caption: `${m.name} — NASA`, autoRotate: true, view: 'three', ...props }; };
