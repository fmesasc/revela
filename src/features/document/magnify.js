// The magnifier ("lupa"), as in screenshot tutorials: an area of the slide (its
// source) shown enlarged in a box placed anywhere (the block itself), with a
// frame round both and the two lines that join them like a magnifying glass.
// What shows inside is the slide itself under the area, live (renderers clone
// the blocks there); this module holds the geometry: the shared proportion,
// the lines, where the box goes, which picture is under the area and which
// part of it that is, and the SVG of the frames and lines.
// Limits: a copy is still — 3D models and videos show their picture; web
// pages, polls, live cameras, timers, sounds and slide zooms aren't copied.
// Another magnifier's box under the area shows enlarged too (a zoom of the zoom),
// up to MAG_DEPTH deep, and never one that is enlarging this one.

import { state, commit, currentSlide, setSelection } from '../../core/store.js';
import { magnifyBlock } from '../../core/model.js';
import { isEmptyPlaceholder } from './master.js';

export const MAG_RED = '#e53935';
// What isn't copied into the box (live objects; see above).
export const MAG_SKIP = ['slideref', 'figindex', 'poll', 'camera', 'timer', 'lock', 'audio', 'embed'];
export const MAG_DEPTH = 3;
export const MAG_COLORS = [['#e53935', 'Rojo'], ['#fdd835', 'Amarillo'], ['accent', 'Color de acento'], ['#ffffff', 'Blanco'], ['#000000', 'Negro']];
export const MAG_LINES = [['corners', 'Esquinas'], ['center', 'Desde el centro'], ['none', 'Sin líneas']];
const MARGIN = 20, GAP = 24;                      // from the slide's edges; between the area and its box

const r1 = v => Math.round(v * 10) / 10;
export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const grow = (r, d) => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });

// Its look, with the defaults filled in.
// (Colours and numbers checked: they go into SVG and CSS as they are.)
const colorOr = (c, d) => (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(String(c || '')) ? c : d);
const num = (v, d, lo, hi) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, +v)) : d);
export function magStyle(b) {
  const bd = b.border || {};
  const color = colorOr(bd.color, MAG_RED), width = num(bd.width, 4, 0, 60);
  return { color, width, style: bd.style === 'dashed' ? 'dashed' : 'solid', radius: num(bd.radius, 0, 0, 400),
    sourceFrame: b.sourceFrame !== false, lines: ['center', 'none'].includes(b.lines) ? b.lines : 'corners',
    lineColor: colorOr(b.lineColor, color), lineWidth: num(b.lineWidth, Math.max(1, width / 2), 0.5, 40),
    lineDash: ['dashed', 'dotted'].includes(b.lineDash) ? b.lineDash : 'solid', shadow: b.insetShadow !== false };
}
// What the box really shows: the area with the box's own proportion (the
// middle of it, should they ever differ) and how much it is enlarged.
export function viewOf(b) {
  const s = b.source || { x: b.x, y: b.y, w: b.w, h: b.h };
  const k = Math.max(b.w / Math.max(1, s.w), b.h / Math.max(1, s.h)), w = b.w / k, h = b.h / k;
  return { x: s.x + (s.w - w) / 2, y: s.y + (s.h - h) / 2, w, h, k };
}
export const zoomOf = b => viewOf(b).k;
export const zoomLabel = b => '×' + (Math.round(zoomOf(b) * 10) / 10).toLocaleString('es');

// The two lines of a magnifier: the outer tangents of the two rectangles, each
// from a corner of one to a corner of the other with every corner of both on
// one side of it (so it crosses neither); of those, the shortest on each side
// (rectangles in line: the gap between them, not along their edges). None when
// one is inside the other.
export function tangentLines(a, b) {
  const P = r => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  const A = P(a), B = P(b), all = [...A, ...B], best = {};
  for (const p of A) for (const q of B) {
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy); if (len < 1e-6) continue;
    let pos = false, neg = false;
    for (const o of all) { const c = (dx * (o[1] - p[1]) - dy * (o[0] - p[0])) / len; if (c > 1e-6) pos = true; else if (c < -1e-6) neg = true; }
    if (pos === neg) continue;
    const side = pos ? 'l' : 'r';
    if (!best[side] || len < best[side].len) best[side] = { line: [p[0], p[1], q[0], q[1]], len };
  }
  return best.l && best.r ? [best.l.line, best.r.line] : [];
}
// From the area's edge to the box's, along the line between their centres.
export function centerLine(a, b) {
  if (overlaps(a, b)) return [];
  const ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
  const edge = (r, c, t) => { const dx = t[0] - c[0], dy = t[1] - c[1], s = Math.min(r.w / 2 / Math.abs(dx || 1e-9), r.h / 2 / Math.abs(dy || 1e-9)); return [c[0] + dx * s, c[1] + dy * s]; };
  return [[...edge(a, ca, cb), ...edge(b, cb, ca)]];
}
// The frames' own lines (the area's drawn just outside it, the box's just
// inside), and the lines between them.
export function magGeometry(b) {
  const st = magStyle(b), v = viewOf(b), h = st.width / 2;
  const src = st.sourceFrame && st.width ? grow(v, h) : v, box = st.width ? grow(b, -h) : { x: b.x, y: b.y, w: b.w, h: b.h };
  const lines = st.lines === 'none' ? [] : st.lines === 'center' ? centerLine(src, box) : tangentLines(src, box);
  return { st, view: v, src, box, lines };
}

const dashOf = (style, w) => (style === 'dashed' ? ` stroke-dasharray="${r1(w * 3)} ${r1(w * 2)}"` : style === 'dotted' ? ` stroke-dasharray="0.1 ${r1(w * 2)}"` : '');
const resolve = (c, accent) => (c === 'accent' ? accent || '#3f6497' : c);
// The lines and the area's frame, in slide coordinates (the renderers put this
// SVG over the whole slide, under the box).
export function magOverlaySVG(b, W, H, accent) {
  const { st, src, lines } = magGeometry(b), col = resolve(st.color, accent), lc = resolve(st.lineColor, accent);
  let s = `<svg class="rv-mag-ovl" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  for (const [x1, y1, x2, y2] of lines)
    s += `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${lc}" stroke-width="${st.lineWidth}" stroke-linecap="round"${dashOf(st.lineDash, st.lineWidth)}/>`;
  if (st.sourceFrame && st.width)
    s += `<rect class="rv-mag-src" x="${r1(src.x)}" y="${r1(src.y)}" width="${r1(src.w)}" height="${r1(src.h)}" rx="${st.radius ? r1(st.radius / Math.max(1, zoomOf(b))) : 0}" fill="none" stroke="${col}" stroke-width="${st.width}"${dashOf(st.style, st.width)}/>`;
  return s + '</svg>';
}
// The box's frame, in the box's own coordinates (over what it shows).
export function magFrameSVG(b, accent) {
  const st = magStyle(b); if (!st.width) return '';
  const h = st.width / 2;
  return `<svg class="rv-mag-frame" viewBox="0 0 ${b.w} ${b.h}" width="${b.w}" height="${b.h}" aria-hidden="true"><rect x="${h}" y="${h}" width="${Math.max(0, b.w - st.width)}" height="${Math.max(0, b.h - st.width)}" rx="${Math.max(0, st.radius - h)}" fill="none" stroke="${resolve(st.color, accent)}" stroke-width="${st.width}"${dashOf(st.style, st.width)}/></svg>`;
}
// CSS of the layer (the slide's size) that shows the area enlarged in the box.
export function magViewCSS(b) {
  const v = viewOf(b);
  return `position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(${+v.k.toFixed(5)}) translate(${r1(-v.x)}px,${r1(-v.y)}px);pointer-events:none`;
}
export const magInsetCSS = b => { const st = magStyle(b); return `position:absolute;inset:0;overflow:hidden;border-radius:${st.radius}px;${st.shadow ? 'box-shadow:0 8px 28px rgba(0,0,0,.45);' : ''}`; };
// (A zoom-in entrance grows out of the area.)
export const magOrigin = b => { const v = viewOf(b); return `${Math.round(v.x + v.w / 2 - b.x)}px ${Math.round(v.y + v.h / 2 - b.y)}px`; };

// The slide's objects that show in the area (in their order), not other magnifiers.
// chain: the magnifiers being shown, the outer first (b itself last). Without it, no magnifiers;
// with it, the other magnifiers' boxes under the area too, while not deeper than MAG_DEPTH.
export const underArea = (blocks, rect, chain = null) => blocks.filter(o => (o.type !== 'magnify' || (chain && chain.length < MAG_DEPTH && !chain.includes(o.id)))
  && !o.hidden && !isEmptyPlaceholder(o) && o.w > 0 && o.h > 0 && overlaps(o, rect));
// The picture under the area: the topmost one that covers most of it.
export function targetImage(blocks, rect) {
  let best = null, most = 0;
  for (const o of underArea(blocks, rect)) if (o.type === 'image') { const a = area(o, rect); if (a >= most && a > rect.w * rect.h * 0.5) { best = o; most = a; } }
  return best;
}
// Which part of a picture (nw × nh natural pixels) the area is, as PowerPoint's
// srcRect (fractions cut from each side), when the area lies entirely on the
// picture as shown (its fit, focus, crop; flipped, the part that flipped shows
// there); null otherwise (or turned).
export function imageCrop(img, rect, nw, nh) {
  if (!(nw > 0 && nh > 0) || img.rotation || img.device) return null;
  const R = nw / nh, bw = img.w, bh = img.h, boxR = bw / bh, fx = (img.focusX ?? 50) / 100, fy = (img.focusY ?? 50) / 100;
  const D = { x: img.x, y: img.y, w: bw, h: bh }, S = { l: 0, t: 0, r: 0, b: 0 };
  if (img.fit === 'cover') {
    if (R > boxR) { const e = 1 - boxR / R; S.l = e * fx; S.r = e - S.l; } else { const e = 1 - R / boxR; S.t = e * fy; S.b = e - S.t; }
  } else if (img.fit !== 'fill') {
    if (R > boxR) { D.h = bw / R; D.y = img.y + (bh - D.h) / 2; } else { D.w = bh * R; D.x = img.x + (bw - D.w) / 2; }
  }
  const c = img.crop || {};
  const x0 = Math.max(D.x, img.x + bw * (c.left || 0) / 100), x1 = Math.min(D.x + D.w, img.x + bw * (1 - (c.right || 0) / 100));
  const y0 = Math.max(D.y, img.y + bh * (c.top || 0) / 100), y1 = Math.min(D.y + D.h, img.y + bh * (1 - (c.bottom || 0) / 100));
  // (Flipped: the area mirrored about the picture's centre, in the picture as it is.)
  let rx = rect.x, ry = rect.y;
  if (img.flipH) rx = 2 * img.x + bw - rect.x - rect.w;
  if (img.flipV) ry = 2 * img.y + bh - rect.y - rect.h;
  const e = 0.5;
  if (rx < x0 - e || ry < y0 - e || rx + rect.w > x1 + e || ry + rect.h > y1 + e) return null;
  const u = px => S.l + (px - D.x) / D.w * (1 - S.l - S.r), v = py => S.t + (py - D.y) / D.h * (1 - S.t - S.b);
  const cl = n => Math.min(1, Math.max(0, n));
  // (Of the picture as it is: the copy is flipped like it.)
  return { l: cl(u(rx)), t: cl(v(ry)), r: cl(1 - u(rx + rect.w)), b: cl(1 - v(ry + rect.h)) };
}

// Where the box goes: as big as `zoom` times the area (less if it doesn't fit),
// inside the slide, clear of the area, over as little of the rest as possible
// (pictures under the area count less: the box usually goes on them) and,
// among equals, near the area.
export function autoPlace(src, blocks, W, H, zoom = 2, target = null) {
  const others = blocks.filter(o => o.type !== 'magnify' && o.type !== 'connector' && !o.hidden && !isEmptyPlaceholder(o));   // (an empty placeholder doesn't show)
  const ar = src.w / Math.max(1, src.h), diag = Math.hypot(W, H), keep = grow(src, GAP);
  const fit = Math.min((W - 2 * MARGIN) / src.w, (H - 2 * MARGIN) / src.h);
  for (let k = Math.min(zoom, fit); k >= 1.1; k = Math.round((k - 0.1) * 100) / 100) {
    const w = src.w * k, h = w / ar; let best = null;
    const xs = steps(MARGIN, W - MARGIN - w), ys = steps(MARGIN, H - MARGIN - h);
    for (const x of xs) for (const y of ys) {
      const r = { x, y, w, h }; if (overlaps(r, keep)) continue;
      let cover = 0;
      for (const o of others) { const a = area(r, o) / (w * h); cover += o === target || o.type === 'image' && overlaps(o, src) ? a * 0.15 : o.type === 'text' ? a * 1.5 : a; }
      const cost = cover * 1000 + Math.hypot(x + w / 2 - src.x - src.w / 2, y + h / 2 - src.y - src.h / 2) / diag * 60;
      if (!best || cost < best.cost) best = { cost, r };
    }
    if (best) return roundRect(best.r);
  }
  // No room beside it: the size of the area, in the slide's corner farthest from it.
  const w = Math.min(src.w, W - 2 * MARGIN), h = w / ar;
  const x = src.x + src.w / 2 > W / 2 ? MARGIN : W - MARGIN - w, y = src.y + src.h / 2 > H / 2 ? MARGIN : H - MARGIN - h;
  return roundRect({ x, y, w, h });
}
function steps(a, b) {
  if (b <= a) return [Math.max(0, a)];
  const n = Math.max(1, Math.ceil((b - a) / 12)), out = [];
  for (let i = 0; i <= n; i++) out.push(a + (b - a) * i / n);
  return out;
}
const roundRect = r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
// The area inside the slide, at least a few pixels.
export function clampSource(s, W = state.deck.size.w, H = state.deck.size.h) {
  const w = Math.max(8, Math.min(W, s.w)), h = Math.max(8, Math.min(H, s.h));
  return roundRect({ x: Math.min(Math.max(0, s.x), W - w), y: Math.min(Math.max(0, s.y), H - h), w, h });
}

// ---- Changes to the document ------------------------------------------------
const find = id => currentSlide().blocks.find(x => x.id === id);
// A new magnifier of that area: its box placed by itself, twice as big.
export function addMagnify(source, props = {}) {
  const { w: W, h: H } = state.deck.size, slide = currentSlide(), src = clampSource(source, W, H);
  const target = targetImage(slide.blocks, src);
  const b = magnifyBlock({ ...autoPlace(src, slide.blocks, W, H, 2, target), source: src, target: target?.id || null, ...props });
  commit(() => { currentSlide().blocks.push(b); setSelection(b.id); });
  return b;
}
// The area moved or resized: the picture under it again.
export function retarget(b, slide = currentSlide()) { b.target = targetImage(slide.blocks, viewOf(b))?.id || null; }
// Proportion kept: when one of the two rectangles takes another shape, the
// other follows (the area keeps its centre and width; the box, its top-left corner and width).
export function sourceToBox(b) {
  const s = b.source, h = s.w * b.h / b.w, cy = s.y + s.h / 2;
  Object.assign(s, clampSource({ x: s.x, y: cy - h / 2, w: s.w, h }));
}
export function boxToSource(b) { b.h = Math.max(8, Math.round(b.w * b.source.h / b.source.w)); }
// Enlarged k times: the box about its centre, kept inside the slide.
export function setZoom(id, k) {
  const b = find(id); if (!b) return;
  const { w: W, h: H } = state.deck.size, s = b.source;
  k = Math.max(1, Math.min(12, +k || 2));
  let w = s.w * k, h = s.h * k; const f = Math.min(1, W / w, H / h); w *= f; h *= f;
  commit(() => { Object.assign(b, roundRect({ x: Math.min(Math.max(0, b.x + b.w / 2 - w / 2), W - w), y: Math.min(Math.max(0, b.y + b.h / 2 - h / 2), H - h), w, h })); });
}
// Placed again by itself (at the zoom it has).
export function placeAgain(id) {
  const b = find(id); if (!b) return;
  const { w: W, h: H } = state.deck.size, slide = currentSlide();
  commit(() => { Object.assign(b, autoPlace(b.source, slide.blocks.filter(o => o !== b), W, H, zoomOf(b), targetImage(slide.blocks, b.source))); });
}
// To the other side of the area (mirrored about it), inside the slide.
export function swapSide(id) {
  const b = find(id); if (!b) return;
  const { w: W, h: H } = state.deck.size, s = b.source, cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  commit(() => {
    b.x = Math.round(Math.min(Math.max(0, 2 * cx - b.x - b.w), W - b.w));
    b.y = Math.round(Math.min(Math.max(0, 2 * cy - b.y - b.h), H - b.h));
  });
}
// Its look: border, lines, frame round the area, shadow.
export function setMagStyle(id, props) {
  const b = find(id); if (!b) return;
  commit(() => {
    for (const [k, v] of Object.entries(props)) {
      if (['color', 'width', 'style', 'radius'].includes(k)) b.border = { ...magStyle(b), ...b.border, [k]: v };
      else b[k] = v;
    }
    if (b.border) b.border = { color: b.border.color, width: b.border.width, style: b.border.style, radius: b.border.radius };
  });
}
