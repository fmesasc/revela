// Canvas mode (like Prezi), optional: the slides are frames on one large
// canvas — each with a position, a size and a turn — and presenting flies
// the camera from one to the next (moving, zooming, turning). A small frame
// inside a big one gives Prezi's zoom-in. Everything else stays the same:
// each frame is a normal slide (edited, animated, with notes as always).
//
// deck.canvas = { on, bg }   slide.frame = { x, y, s, r }
//   x, y: centre of the frame on the canvas (in slide pixels); s: scale
//   (1 = the slide's size); r: turn in degrees.

import { state, commit, currentSlide } from '../../core/store.js';

export const canvasOn = (deck = state.deck) => !!deck.canvas?.on;

// Where new frames go: a spiral around the first, so the canvas feels like one.
export function defaultFrame(i, { w, h } = state.deck.size) {
  if (i === 0) return { x: 0, y: 0, s: 1, r: 0 };
  const ring = Math.ceil((Math.sqrt(i + 1) - 1) / 2), a = i * 2.39996;       // golden angle
  return { x: Math.round(Math.cos(a) * w * 1.35 * ring), y: Math.round(Math.sin(a) * h * 1.6 * ring), s: 1, r: 0 };
}
export const frameOf = (slide, i, size) => slide.frame || defaultFrame(i, size);

export function setCanvasMode(on) {
  commit(() => {
    const d = state.deck;
    if (!on) { if (d.canvas) d.canvas.on = false; return; }
    d.canvas = { bg: '#0d1117', ...d.canvas, on: true };
    d.slides.forEach((s, i) => { if (!s.frame) s.frame = defaultFrame(i, d.size); });
  });
}
export function setCanvasBg(bg) { commit(() => { (state.deck.canvas ||= { on: false }).bg = bg; }); }
export function setFrame(slideId, props, history = true) {
  const s = state.deck.slides.find(x => x.id === slideId); if (!s) return;
  commit(() => { s.frame = { ...frameOf(s, state.deck.slides.indexOf(s)), ...props }; }, { history });
}
// A new slide in canvas mode: its frame where the view is looking, at that size.
export function frameForNew(view) {
  return view ? { x: Math.round(view.x), y: Math.round(view.y), s: +(view.s || 1).toFixed(3), r: 0 } : defaultFrame(state.deck.slides.length);
}

// ---- Geometry (plain numbers, also embedded in the presentation) ---------------------
// A 2D matrix [a, b, c, d, e, f] (as CSS matrix()) mapping the slide's own
// pixels to canvas pixels: translate to the centre, turn, scale.
export function frameMatrix(f, w, h) {
  const t = (f.r || 0) * Math.PI / 180, s = f.s || 1, cos = Math.cos(t) * s, sin = Math.sin(t) * s;
  // translate(x,y) · rotate · scale · translate(-w/2,-h/2)
  return [cos, sin, -sin, cos, f.x - (cos * w / 2 - sin * h / 2), f.y - (sin * w / 2 + cos * h / 2)];
}
export const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
export function inv(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}
export const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
export const css = m => `matrix(${m.map(v => +v.toFixed(6)).join(',')})`;
// All frames' corners → the box around the whole canvas.
export function bounds(frames, w, h) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames) for (const [px, py] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const [X, Y] = apply(frameMatrix(f, w, h), px, py); x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  return { x0, y0, x1, y1 };
}
// The camera that shows a box (the whole canvas) in a w×h view, with a margin.
export function fitView(b, w, h, margin = 0.9) {
  const k = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) * margin, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  return [k, 0, 0, k, w / 2 - k * cx, h / 2 - k * cy];
}

// ---- Presentation side (embedded as source with the frames) -------------------------
// Every section keeps its frame on the canvas; the camera is the inverse of
// the current frame. "O" shows the whole canvas; a click on a frame goes there.
export function canvasRuntime(frames, w, h) {
  var sections = [].slice.call(document.querySelectorAll('.reveal .slides > section'));
  var M = frames.map(function (f) { return frameMatrix(f, w, h); }), overview = false;
  // Smaller frames on top of bigger ones (a detail inside its frame stays visible).
  frames.map(function (f, i) { return [f.s || 1, i]; }).sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; })
    .forEach(function (p, k) { if (sections[p[1]]) sections[p[1]].style.setProperty('z-index', String(20 + k), 'important'); });
  function place(view) { sections.forEach(function (s, i) { if (M[i]) s.style.transform = css(mul(view, M[i])); }); }
  function go(i) { overview = false; document.documentElement.classList.remove('rv-canvas-overview'); if (M[i]) place(inv(M[i])); }
  function all() { overview = true; document.documentElement.classList.add('rv-canvas-overview'); place(fitView(bounds(frames, w, h), w, h)); }
  Reveal.on('ready', function () { go(Reveal.getIndices().h); });
  Reveal.on('slidechanged', function (e) { go(e.indexh); });
  if (Reveal.isReady()) go(Reveal.getIndices().h);
  // O: the whole canvas (instead of the slide mosaic, whose handler comes later on the same window).
  window.addEventListener('keydown', function (e) {
    if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA/.test(e.target.tagName || '')) {
      e.preventDefault(); e.stopImmediatePropagation(); overview ? go(Reveal.getIndices().h) : all();
    }
  }, true);
  sections.forEach(function (s, i) { s.addEventListener('click', function () { if (overview) { Reveal.slide(i); go(i); } }); });
}
// What the runtime needs besides itself (as source, no imports in the page).
export const canvasRuntimeDeps = () => `var mul=${mul};var inv=${inv};var apply=${apply};var css=${css};\n${frameMatrix}\n${bounds}\n${fitView}\n${canvasRuntime}`;

export const currentFrame = () => { const s = currentSlide(); return s ? frameOf(s, state.deck.slides.indexOf(s)) : null; };
