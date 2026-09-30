// Per‑slide transitions and per‑object entrance animations.

import { state, commit, currentSlide, selectedBlock } from '../../core/store.js';

// Effect options (as in PowerPoint): where the new slide comes from, or how
// it opens. The first one is the default.
export const TRANSITION_DIRS = { wipe: ['right', 'left', 'bottom', 'top'], push: ['bottom', 'top', 'right', 'left'], split: ['vertical', 'horizontal'] };
// A slide's transition with its option, as a single name ("wipe-top").
export const transitionName = (kind, dir) => (dir && TRANSITION_DIRS[kind]?.includes(dir) && dir !== TRANSITION_DIRS[kind][0] ? `${kind}-${dir}` : kind);

// Transitions reveal.js doesn't have, defined in CSS in the export: the old
// slide leaves with PAST and the new one comes from FUTURE (both animate).
const PUSH = { bottom: ['0,-100%', '0,100%'], top: ['0,100%', '0,-100%'], right: ['-100%,0', '100%,0'], left: ['100%,0', '-100%,0'] };
export const CUSTOM_TRANSITIONS = {
  flip: ['transform:perspective(1600px) rotateY(-90deg);opacity:0', 'transform:perspective(1600px) rotateY(90deg);opacity:0'],
  rise: ['transform:scale(1.25);opacity:0', 'transform:scale(.8) translate3d(0,8%,0);opacity:0'],
  // More, as PowerPoint's: a cube turning, the new one covering the old, the old falling,
  // blur, swirl, shrink, dropping from above, a flash, a page turning and a gallery.
  cube: ['transform:perspective(1400px) translate3d(-50%,0,0) rotateY(-90deg) translate3d(-50%,0,0);opacity:.4', 'transform:perspective(1400px) translate3d(50%,0,0) rotateY(90deg) translate3d(50%,0,0);opacity:.4'],
  cover: ['transform:none;opacity:1', 'transform:translate3d(100%,0,0)'],
  fall: ['transform:perspective(1200px) translate3d(0,30%,0) rotateX(-35deg) rotateZ(-6deg);opacity:0', 'opacity:0'],
  blur: ['filter:blur(18px);opacity:0', 'filter:blur(18px);opacity:0'],
  swirl: ['transform:rotate(-180deg) scale(.2);opacity:0', 'transform:rotate(180deg) scale(.2);opacity:0'],
  shrink: ['transform:scale(.55);opacity:0', 'transform:scale(1.6);opacity:0'],
  drop: ['transform:translate3d(0,12%,0);opacity:0', 'transform:translate3d(0,-110%,0)'],
  flash: ['filter:brightness(4);opacity:0', 'filter:brightness(4);opacity:0'],
  page: ['transform:perspective(1600px) rotateY(-100deg);transform-origin:0 50%;opacity:0', 'transform:perspective(1600px) rotateY(0);opacity:0'],
  gallery: ['transform:translate3d(-110%,0,0) scale(.8)', 'transform:translate3d(110%,0,0) scale(.8)'],
  ...Object.fromEntries(Object.entries(PUSH).map(([d, [past, fut]]) => [transitionName('push', d), [`transform:translate3d(${past},0)`, `transform:translate3d(${fut},0)`]])),
};
// Shape reveals: the new slide shows through a growing shape and the old one
// keeps exactly the rest (a hole of the same shape), so they never overlap.
// The shape's size is --rvt (0 → 1), a registered property reveal animates.
// Every shape starts at its right-hand point at mid height: the old slide's
// hole is joined to the frame by a horizontal seam of no width there.
const rect = (x0, y0, x1, y1) => [`${x1} 50%`, `${x1} ${y0}`, `${x0} ${y0}`, `${x0} ${y1}`, `${x1} ${y1}`];
const SHAPES = {
  'wipe': v => rect(`calc(100% - ${v} * 100%)`, '0%', '100%', '100%'),
  'wipe-left': v => rect('0%', '0%', `calc(${v} * 100%)`, '100%'),
  'wipe-top': v => rect('0%', '0%', '100%', `calc(${v} * 100%)`),
  'wipe-bottom': v => rect('0%', `calc(100% - ${v} * 100%)`, '100%', '100%'),
  'split': v => rect(`calc(50% - ${v} * 50%)`, '0%', `calc(50% + ${v} * 50%)`, '100%'),
  'split-horizontal': v => rect('0%', `calc(50% - ${v} * 50%)`, '100%', `calc(50% + ${v} * 50%)`),
  'diamond': v => [`calc(50% + ${v} * 100%) 50%`, `50% calc(50% - ${v} * 100%)`, `calc(50% - ${v} * 100%) 50%`, `50% calc(50% + ${v} * 100%)`],
  // A circle (32-sided polygon) that ends just beyond the corners; % of each side.
  'circle': (v, { w, h }) => { const R = Math.hypot(w, h) / 2 / Math.cos(Math.PI / 32);
    return Array.from({ length: 32 }, (_, i) => { const a = i / 32 * 2 * Math.PI;
      return `calc(50% + ${v} * ${(R * Math.cos(a) / w * 100).toFixed(2)}%) calc(50% + ${v} * ${(R * Math.sin(a) / h * 100).toFixed(2)}%)`; }); },
};
export const isShapeTransition = name => !!SHAPES[name];
export function customTransitionCSS(names, size = { w: 1280, h: 720 }) {
  const sel = (n, st) => `.reveal .slides>section[data-transition=${n}].${st},.reveal .slides>section[data-transition~=${n}-${st === 'past' ? 'out' : 'in'}].${st},`
    + `.reveal.${n} .slides>section:not([data-transition]).${st}`;
  const present = n => `.reveal .slides>section[data-transition=${n}].present,.reveal .slides>section[data-transition~=${n}-in].present,`
    + `.reveal .slides>section[data-transition~=${n}-out].present,.reveal.${n} .slides>section:not([data-transition]).present`;
  const used = [...names];
  const css = used.filter(n => CUSTOM_TRANSITIONS[n]).map(n => `${sel(n, 'past')}{${CUSTOM_TRANSITIONS[n][0]}}${sel(n, 'future')}{${CUSTOM_TRANSITIONS[n][1]}}`);
  // (blur and flash animate a filter too; a gallery and a cube, the new one over the old)
  if (used.some(n => n === 'blur' || n === 'flash')) css.push('.reveal .slides>section{transition-property:transform-origin,transform,visibility,opacity,filter}');
  const shaped = used.filter(n => SHAPES[n]);
  for (const n of shaped) {
    const grow = v => `polygon(${SHAPES[n](v, size).join(',')})`;
    const hole = SHAPES[n]('(1 - var(--rvt))', size);
    css.push(`${present(n)}{--rvt:1;clip-path:${grow('var(--rvt)')}}`
      + `${sel(n, 'future')}{--rvt:0;opacity:1;clip-path:${grow('var(--rvt)')}}`
      + `${sel(n, 'past')}{--rvt:0;opacity:1;clip-path:polygon(evenodd,100% 50%,100% 0%,0% 0%,0% 100%,100% 100%,100% 50%,${[...hole, hole[0]].join(',')})}`);
  }
  if (shaped.length) css.push('@property --rvt{syntax:"<number>";inherits:false;initial-value:1}',
    '.reveal .slides>section{transition-property:transform-origin,transform,visibility,opacity,--rvt}');
  return css.join('\n');
}

// A slide's own transition overrides the deck default. `null` = inherit.
export function setSlideTransition(value) {
  commit(() => { currentSlide().transition = value === 'inherit' ? null : value; });
}
export function setSlideTransOptions(props) {
  commit(() => { const s = currentSlide(); for (const [k, v] of Object.entries(props)) { if (v) s[k] = v; else delete s[k]; } });
}
// Copy this slide's transition, exit, speed and auto-advance to every slide.
export function applyTransitionToAll() {
  const c = currentSlide();
  commit(() => state.deck.slides.forEach(s => {
    s.transition = c.transition ?? null;
    for (const k of ['transitionOut', 'transitionSpeed', 'transitionDir']) { if (c[k]) s[k] = c[k]; else delete s[k]; }
    s.autoSlide = c.autoSlide || 0;
  }));
}
export function setDeckTransition(value) {
  commit(() => { state.deck.defaultTransition = value; });
}
export function setTransitionSpeed(value) {
  commit(() => { state.deck.transitionSpeed = value; });
}

// Keyframe used by each effect when it is played outside reveal's fragments
// (editor preview and trigger animations). Same names as in ui/styles/chrome.css.
export const EFFECT_KF = {
  'fade-in': 'rvIn', 'fade-up': 'rvUp', 'fade-down': 'rvDown', 'fade-left': 'rvLeft', 'fade-right': 'rvRight',
  'zoom-in': 'rvZoom', 'grow': 'rvGrow', 'shrink': 'rvShrink', 'spin': 'rvSpin', 'flip': 'rvFlip', 'bounce': 'rvBounce',
  'fade-out': 'rvOut', 'semi-fade-out': 'rvSemi', 'fade-in-then-out': 'rvInOut', 'fade-in-then-semi-out': 'rvInSemi', 'current-visible': 'rvInOut',
  'highlight-current-red': 'rvHi', 'highlight-current-green': 'rvHi', 'highlight-current-blue': 'rvHi', 'highlight-red': 'rvHi', 'highlight-green': 'rvHi', 'highlight-blue': 'rvHi',
  'strike': 'rvIn', 'path': 'rvPath', 'spin360': 'rvTurn', 'draw': 'rvIn',
};
export const EFFECT_KF_CSS = `@keyframes rvIn{from{opacity:0}to{opacity:1}}
@keyframes rvUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes rvDown{from{opacity:0;transform:translateY(-40px)}to{opacity:1;transform:none}}
@keyframes rvLeft{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
@keyframes rvRight{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes rvZoom{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes rvGrow{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@keyframes rvShrink{from{opacity:0;transform:scale(1.7)}to{opacity:1;transform:none}}
@keyframes rvSpin{from{opacity:0;transform:rotate(-200deg) scale(.6)}to{opacity:1;transform:none}}
@keyframes rvFlip{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:none}}
@keyframes rvBounce{0%{opacity:0;transform:translateY(-60px)}60%{opacity:1;transform:translateY(12px)}80%{transform:translateY(-6px)}100%{opacity:1;transform:none}}
@keyframes rvOut{from{opacity:1}to{opacity:0}}
@keyframes rvInOut{0%{opacity:0}30%,70%{opacity:1}100%{opacity:0}}
@keyframes rvSemi{from{opacity:1}to{opacity:.5}}
@keyframes rvInSemi{0%{opacity:0}30%,70%{opacity:1}100%{opacity:.5}}
@keyframes rvHi{0%,100%{background:transparent}50%{background:#ff3b3b66}}
@keyframes rvPath{to{translate:var(--dx,0) var(--dy,0)}}
@keyframes rvTurn{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;
// Motion paths: points (offsets from the start) along the chosen shape, ending
// at (dx, dy). 'line' is straight; 'arc' bulges to one side; 'wave' snakes;
// 'loop' makes a full turn half way; 'custom' is drawn by hand (a.points, the
// user's points: the curve goes smoothly through them).
export function motionPoints(a, n = 24) {
  if (a.pathShape === 'custom' && a.points?.length > 1) return samplePath(a.points, Math.min(160, Math.max(n, a.points.length * 8)));
  const dx = a.dx || 0, dy = a.dy || 0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;   // normal
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; let x = dx * t, y = dy * t;
    if (a.pathShape === 'arc') { const o = -0.35 * L * 4 * t * (1 - t); x += nx * o; y += ny * o; }
    else if (a.pathShape === 'wave') { const o = 0.15 * L * Math.sin(t * Math.PI * 4); x += nx * o; y += ny * o; }
    else if (a.pathShape === 'loop') { const r = 0.18 * L, k = Math.sin(Math.PI * t) ** 2, ang = 2 * Math.PI * t;
      x += k * (Math.sin(ang) * r * dx / L + (1 - Math.cos(ang)) * r * nx); y += k * (Math.sin(ang) * r * dy / L + (1 - Math.cos(ang)) * r * ny); }
    pts.push([+x.toFixed(1), +y.toFixed(1)]);
  }
  return pts;
}
// A smooth curve through the points (Catmull-Rom), then n+1 points evenly spaced
// along it, so the object moves at an even speed however the path was drawn.
function samplePath(P, n) {
  const dense = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    for (let k = 1; k <= 10; k++) {
      const t = k / 10, t2 = t * t, t3 = t2 * t;
      dense.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  const len = [0]; for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = len.at(-1) || 1, out = []; let j = 0;
  for (let i = 0; i <= n; i++) {
    const d = total * i / n; while (j < dense.length - 2 && len[j + 1] < d) j++;
    const k = (d - len[j]) / ((len[j + 1] - len[j]) || 1);
    out.push([+(dense[j][0] + (dense[j + 1][0] - dense[j][0]) * k).toFixed(1), +(dense[j][1] + (dense[j + 1][1] - dense[j][1]) * k).toFixed(1)]);
  }
  return out;
}
// Turning while it moves: 'follow' turns it with the path (as it bends); spin
// adds that many degrees over the way (360 = one full turn). [x, y, degrees].
export const pathTurns = a => a.effect === 'path' && (a.turn === 'follow' || +a.spin);
export function motionFrames(a, n = 24) {
  const pts = motionPoints(a, n), last = pts.length - 1;
  const dir = i => { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(last, i + 1)]; return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; };
  let prev = dir(0), acc = 0;
  return pts.map(([x, y], i) => {
    let r = 0;
    if (a.turn === 'follow') { const d = dir(i); acc += ((d - prev + 540) % 360) - 180; prev = d; r = acc; }
    r += (+a.spin || 0) * i / last;
    return [x, y, +r.toFixed(1)];
  });
}
// Keyframes of a motion path; base: the object's own turn (it keeps it).
export const pathKeyframesCSS = (name, a, base = 0, turns = true) => `@keyframes ${name}{${motionFrames(a).map(([x, y, r], i, arr) =>
  `${(i / (arr.length - 1) * 100).toFixed(1)}%{translate:${x}px ${y}px${turns && pathTurns(a) ? `;rotate:${+(base + r).toFixed(1)}deg` : ''}}`).join('')}}`;
// Drawn path: the points (offsets from the object's centre) — it starts where the object is.
// i: which of the object's animations (-1: a new one after the others, starting where the previous ones leave it).
export function setMotionPath(id, points, duration = null, i = 0) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || points.length < 2) return;
  commit(() => {
    let a;
    if (i === -1 && b.animation) { a = fresh('path', { start: 'afterPrev' }); (b.anims ||= []).push(a); }
    else a = animsOf(b)[i] || (b.animation = fresh('path'));
    Object.assign(a, { effect: 'path', pathShape: 'custom', points: points.map(([x, y]) => [Math.round(x), Math.round(y)]) });
    [a.dx, a.dy] = a.points.at(-1);
    if (duration) a.duration = duration;
    normalizeAnim();
  });
}
// Where the object is after its animations before the i-th: the sum of the paths (from its place).
export function offsetBefore(b, i) {
  let x = 0, y = 0;
  animsOf(b).slice(0, i).forEach(a => { if (a.effect === 'path') { x += a.dx || 0; y += a.dy || 0; } });
  return [x, y];
}
// A motion path from PowerPoint or LibreOffice ("M 0 0 L x y L … E", relative
// to the slide size; curves C are taken by their points): its points; more than
// one segment becomes a drawn path through them (simplified), one is a line.
export function pathFromSVG(d, size) {
  const n = (d.match(/-?[\d.]+(?:e-?\d+)?/g) || []).map(Number), pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i] * size.w, n[i + 1] * size.h]);
  if (pts.length < 2) return { dx: 0, dy: 0 };
  const rel = pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]]), end = rel.at(-1).map(Math.round);
  const simple = simplifyStroke(rel, 3);
  return simple.length > 2 ? { pathShape: 'custom', points: simple.map(p => p.map(Math.round)), dx: end[0], dy: end[1] } : { dx: end[0], dy: end[1] };
}
// Simplify a hand-drawn stroke (Ramer–Douglas–Peucker): few points, same shape, easy to adjust.
export function simplifyStroke(pts, tol = 6) {
  if (pts.length < 3) return pts.slice();
  const [a, b] = [pts[0], pts.at(-1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let far = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], d = L ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > far) { far = d; at = i; }
  }
  if (far <= tol) return [a, b];
  return [...simplifyStroke(pts.slice(0, at + 1), tol).slice(0, -1), ...simplifyStroke(pts.slice(at), tol)];
}

// Effects that make an object appear (it starts hidden until it plays).
export const isEntrance = effect => !['fade-out', 'semi-fade-out', 'highlight-red', 'highlight-green', 'highlight-blue', 'highlight-current-red', 'highlight-current-green', 'highlight-current-blue', 'strike', 'path', 'grow', 'shrink', 'clip3d', 'spin360', 'pdfview'].includes(effect);

// Per‑object animations: effect + order (fragment index, the click) + start + timing.
// An object can have several, one after another (like PowerPoint's "Add
// animation"): the first is b.animation, the others b.anims — go somewhere,
// then somewhere else, then play a 3D model's clip… seq keeps them in order.
export const animsOf = b => [b.animation, ...(b.anims || [])].filter(Boolean);
export const animKey = (b, i) => (i ? `${b.id}#${i}` : b.id);
// Every animation of a slide, in play order: { b, a, i, key }.
export function animEntries(slide = currentSlide()) {
  const out = [];
  (slide?.blocks || []).forEach((b, bi) => animsOf(b).forEach((a, i) => out.push({ b, a, i, key: animKey(b, i), k: a.seq ?? ((a.order || 0) * 1000 + bi + i * 0.001) })));
  return out.sort((x, y) => x.k - y.k);
}
const nextSeq = () => animEntries().reduce((m, e) => Math.max(m, e.a.seq ?? e.k), 0) + 1;
const fresh = (effect, props = {}) => ({ effect, order: animEntries().length + 1, seq: nextSeq(), start: 'click', duration: effect === 'path' ? 2000 : effect === 'draw' ? 1500 : 500, delay: 0,
  ...(effect === 'path' && { dx: 200, dy: 0 }), ...props });

export function setAnimation(effect) {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    if (b.animation) b.animation.effect = effect;
    else b.animation = fresh(effect);                      // (a path takes longer than a fade)
    if (effect === 'path' && !b.animation.dx && !b.animation.dy) b.animation.dx = 200;
    if (effect === 'draw' && (b.animation.duration || 0) < 1000) b.animation.duration = 1500;   // (tracing takes a while)
    normalizeAnim();
  });
}
// One more animation for the selected object, after the ones it has (by default
// right after the previous one). Returns its index.
export function addAnimation(effect, props = {}) {
  const b = selectedBlock(); if (!b) return -1;
  let idx = 0;
  commit(() => {
    if (!b.animation) { b.animation = fresh(effect, props); idx = 0; }
    else { (b.anims ||= []).push(fresh(effect, { start: 'afterPrev', ...props })); idx = b.anims.length; }
    normalizeAnim();
  });
  return idx;
}
// An imported object's animation: its first, or one more after those it has.
export function pushAnim(b, a) { if (b.animation) (b.anims ||= []).push(a); else b.animation = a; }
// Animation painter: copy the selected object's animations onto other objects.
export function copyAnimationFrom(b = selectedBlock()) {
  if (!b || !b.animation) return null;
  const clean = ({ order, trigger, seq, ...rest }) => structuredClone(rest);
  const out = clean(b.animation);
  if (b.anims?.length) out.more = b.anims.map(clean);
  return out;
}
export function pasteAnimationTo(ids, anim) {
  if (!anim) return;
  const { more, ...main } = anim;
  commit(() => {
    for (const id of ids) {
      const b = byId(id); if (!b || b.type === 'connector') continue;
      b.animation = { ...structuredClone(main), order: animEntries().length + 1, seq: nextSeq() };
      if (more?.length) b.anims = more.map((a, n) => ({ ...structuredClone(a), seq: b.animation.seq + (n + 1) * 0.01 })); else delete b.anims;
    }
    normalizeAnim();
  });
}
export function clearAnimation() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { b.animation = null; delete b.anims; normalizeAnim(); });
}

// The slide's animated blocks, in the order of their first animation.
export function animatedBlocks() {
  const seen = new Set();
  return animEntries().map(e => e.b).filter(b => !seen.has(b.id) && seen.add(b.id));
}
const byId = id => currentSlide().blocks.find(x => x.id === id);

export function setAnimPropForId(id, prop, value, i = 0) {
  const b = byId(id), a = b && animsOf(b)[i]; if (!a) return;
  commit(() => {
    if (prop === 'duration' || prop === 'delay') a[prop] = Math.max(0, +value || 0);
    else if (prop === 'dx' || prop === 'dy') { a[prop] = Math.round(+value || 0); if (a.pathShape === 'custom') scalePoints(a); }
    else if (prop === 'spin') { if (+value) a.spin = Math.round(+value); else delete a.spin; }
    else if (prop === 'turn' && !value) delete a.turn;
    else if (prop === 'points') { a.points = value; [a.dx, a.dy] = value.at(-1); }
    else if (prop === 'trigger' && !value) delete a.trigger;
    else if (prop === 'once') { if (value) a.once = true; else delete a.once; }
    else if (prop === 'sound') { if (value) a.sound = value; else { delete a.sound; delete a.soundSrc; } }
    else a[prop] = value;
    if (prop === 'effect' && value === 'path' && !a.dx && !a.dy) a.dx = 200;
    normalizeAnim();
  });
}
// A drawn path whose end is moved by number: the whole drawing stretches to the new end.
function scalePoints(a) {
  const P = a.points, [ex, ey] = P.at(-1), [nx, ny] = [a.dx || 0, a.dy || 0];
  const ang = Math.atan2(ny, nx) - Math.atan2(ey, ex), k = Math.hypot(nx, ny) / (Math.hypot(ex, ey) || 1), c = Math.cos(ang) * k, s = Math.sin(ang) * k;
  a.points = P.map(([x, y]) => [Math.round(x * c - y * s), Math.round(x * s + y * c)]); a.points[a.points.length - 1] = [nx, ny];
}
export function moveAnimForId(id, dir, i = 0) {
  commit(() => {
    const list = animEntries(), at = list.findIndex(e => e.b.id === id && e.i === i), to = at + dir;
    if (at < 0 || to < 0 || to >= list.length) return;
    list.forEach((e, n) => { e.a.seq = n + 1; });
    [list[at].a.seq, list[to].a.seq] = [list[to].a.seq, list[at].a.seq];
    normalizeAnim();
  });
}
export function clearAnimationForId(id, i = 0) {
  const b = byId(id); if (!b) return;
  commit(() => {
    if (i === 0) b.animation = b.anims?.shift() || null; else b.anims?.splice(i - 1, 1);
    if (!b.anims?.length) delete b.anims;
    normalizeAnim();
  });
}

// Reassign fragment indices 1..k: "with previous" and "after previous" share
// the step (click) of the animation before them; seq becomes 1..n.
// Click numbers and play order from the objects' animations (of a slide; the current one by default).
export function normalizeAnim(slide = currentSlide()) {
  const list = animEntries(slide); let idx = 0;
  list.forEach((e, n) => {
    if (n === 0 || !['withPrev', 'afterPrev'].includes(e.a.start)) idx++;
    e.a.order = idx; e.a.seq = n + 1;
  });
  // Each object's animations in their play order too (its paths add up in that order).
  for (const b of slide.blocks) {
    if (!b.anims?.length) continue;
    const all = animsOf(b).sort((x, y) => x.seq - y.seq);
    b.animation = all[0]; b.anims = all.slice(1);
  }
}

// When each animation actually starts within its click (PowerPoint's timeline):
// "with previous" starts together with the previous one, "after previous" when
// it ends; the own delay is added on top. Returns Map key → { step, delay, dur }
// (key: the object's id for its first animation, "id#n" for the others).
// Animations fired by a trigger object are outside the click sequence.
export function animTimeline(slide = currentSlide()) {
  const list = animEntries(slide).filter(e => !e.a.trigger);
  const out = new Map();
  let base = 0, prevBase = 0, prevEnd = 0, step = 0;
  list.forEach((e, n) => {
    const a = e.a, dur = a.duration ?? 500, own = a.delay ?? 0;
    if (n === 0 || a.start === 'click' || !a.start) { step++; base = 0; }
    else if (a.start === 'withPrev') base = prevBase;
    else if (a.start === 'afterPrev') base = prevEnd;
    const delay = base + own;
    out.set(e.key, { step, delay, dur });
    prevBase = base; prevEnd = delay + dur;
  });
  return out;
}
