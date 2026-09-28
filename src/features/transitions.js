// Per‑slide transitions and per‑object entrance animations.

import { state, commit, currentSlide, selectedBlock } from '../core/store.js';

export const SLIDE_TRANSITIONS = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom', 'flip', 'push', 'wipe', 'rise'];
// Transitions reveal.js doesn't have, defined in CSS in the export: the old
// slide leaves with PAST and the new one comes from FUTURE (both animate).
export const CUSTOM_TRANSITIONS = {
  flip: ['transform:perspective(1600px) rotateY(-90deg);opacity:0', 'transform:perspective(1600px) rotateY(90deg);opacity:0'],
  push: ['transform:translate3d(0,-100%,0)', 'transform:translate3d(0,100%,0)'],
  wipe: ['clip-path:inset(0 100% 0 0)', 'clip-path:inset(0 0 0 100%)'],
  rise: ['transform:scale(1.25);opacity:0', 'transform:scale(.8) translate3d(0,8%,0);opacity:0'],
};
export function customTransitionCSS(names) {
  const sel = (n, st) => `.reveal .slides>section[data-transition=${n}].${st},.reveal .slides>section[data-transition~=${n}-${st === 'past' ? 'out' : 'in'}].${st},`
    + `.reveal.${n} .slides>section:not([data-transition]).${st}`;
  return [...names].filter(n => CUSTOM_TRANSITIONS[n]).map(n => `${sel(n, 'past')}{${CUSTOM_TRANSITIONS[n][0]}}${sel(n, 'future')}{${CUSTOM_TRANSITIONS[n][1]}}`).join('\n')
    + (names.has('wipe') ? '\n.reveal .slides>section{transition-property:transform-origin,transform,visibility,opacity,clip-path}' : '');
}
export const ANIMATIONS = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in'];

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
    for (const k of ['transitionOut', 'transitionSpeed']) { if (c[k]) s[k] = c[k]; else delete s[k]; }
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
// (editor preview and trigger animations). Same names as in styles.css.
export const EFFECT_KF = {
  'fade-in': 'rvIn', 'fade-up': 'rvUp', 'fade-down': 'rvDown', 'fade-left': 'rvLeft', 'fade-right': 'rvRight',
  'zoom-in': 'rvZoom', 'grow': 'rvGrow', 'shrink': 'rvShrink', 'spin': 'rvSpin', 'flip': 'rvFlip', 'bounce': 'rvBounce',
  'fade-out': 'rvOut', 'semi-fade-out': 'rvSemi', 'fade-in-then-out': 'rvInOut', 'fade-in-then-semi-out': 'rvInSemi', 'current-visible': 'rvInOut',
  'highlight-current-red': 'rvHi', 'highlight-current-green': 'rvHi', 'highlight-current-blue': 'rvHi', 'highlight-red': 'rvHi', 'highlight-green': 'rvHi', 'highlight-blue': 'rvHi',
  'strike': 'rvIn', 'path': 'rvPath',
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
@keyframes rvPath{to{translate:var(--dx,0) var(--dy,0)}}`;
// Motion paths: points (offsets from the start) along the chosen shape, ending
// at (dx, dy). 'line' is straight; 'arc' bulges to one side; 'wave' snakes;
// 'loop' makes a full turn half way.
export const PATH_SHAPES = ['line', 'arc', 'wave', 'loop'];
export function motionPoints(a, n = 24) {
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
export const pathKeyframesCSS = (name, a) => `@keyframes ${name}{${motionPoints(a).map(([x, y], i, arr) =>
  `${(i / (arr.length - 1) * 100).toFixed(1)}%{translate:${x}px ${y}px}`).join('')}}`;

// Effects that make an object appear (it starts hidden until it plays).
export const isEntrance = effect => !['fade-out', 'semi-fade-out', 'highlight-red', 'highlight-green', 'highlight-blue', 'highlight-current-red', 'highlight-current-green', 'highlight-current-blue', 'strike', 'path', 'grow', 'shrink'].includes(effect);

// Per‑object animation: effect + order (fragment index) + start + timing.
export function setAnimation(effect) {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    if (b.animation) b.animation.effect = effect;
    else b.animation = { effect, order: animatedBlocks().length + 1, start: 'click', duration: 500, delay: 0 };
    if (effect === 'path' && !b.animation.dx && !b.animation.dy) b.animation.dx = 200;
    normalizeAnim();
  });
}
// Animation painter: copy the selected object's animation onto other objects.
export function copyAnimationFrom(b = selectedBlock()) {
  if (!b || !b.animation) return null;
  const { order, trigger, ...rest } = b.animation;
  return structuredClone(rest);
}
export function pasteAnimationTo(ids, anim) {
  if (!anim) return;
  commit(() => {
    for (const id of ids) {
      const b = byId(id); if (!b || b.type === 'connector') continue;
      b.animation = { ...structuredClone(anim), order: animatedBlocks().length + 1 };
    }
    normalizeAnim();
  });
}
export function clearAnimation() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { b.animation = null; normalizeAnim(); });
}

// The slide's animated blocks, in play order.
export function animatedBlocks() {
  return currentSlide().blocks.filter(x => x.animation).sort((a, b) => a.animation.order - b.animation.order);
}
const byId = id => currentSlide().blocks.find(x => x.id === id);

export function setAnimPropForId(id, prop, value) {
  const b = byId(id); if (!b || !b.animation) return;
  commit(() => {
    if (prop === 'duration' || prop === 'delay') b.animation[prop] = Math.max(0, +value || 0);
    else if (prop === 'dx' || prop === 'dy') b.animation[prop] = Math.round(+value || 0);
    else if (prop === 'trigger' && !value) delete b.animation.trigger;
    else b.animation[prop] = value;
    if (prop === 'effect' && value === 'path' && !b.animation.dx && !b.animation.dy) b.animation.dx = 200;
    normalizeAnim();
  });
}
export function moveAnimForId(id, dir) {
  commit(() => {
    const list = animatedBlocks(); const i = list.findIndex(x => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i].animation.order, b2 = list[j].animation.order;
    list[i].animation.order = b2; list[j].animation.order = a; normalizeAnim();
  });
}
export function clearAnimationForId(id) {
  const b = byId(id); if (!b) return;
  commit(() => { b.animation = null; normalizeAnim(); });
}

// Reassign fragment indices 1..k: "with previous" and "after previous" share
// the step (click) of the animation before them.
function normalizeAnim() {
  const list = animatedBlocks(); let idx = 0;
  list.forEach((b, i) => {
    if (i === 0 || !['withPrev', 'afterPrev'].includes(b.animation.start)) idx++;
    b.animation.order = idx;
  });
}

// When each animation actually starts within its click (PowerPoint's timeline):
// "with previous" starts together with the previous one, "after previous" when
// it ends; the own delay is added on top. Returns Map id → { step, delay, dur }.
// Animations fired by a trigger object are outside the click sequence.
export function animTimeline(slide = currentSlide()) {
  const list = slide.blocks.filter(x => x.animation && !x.animation.trigger)
    .sort((a, b) => a.animation.order - b.animation.order);
  const out = new Map();
  let base = 0, prevBase = 0, prevEnd = 0, step = 0;
  list.forEach((b, i) => {
    const a = b.animation, dur = a.duration ?? 500, own = a.delay ?? 0;
    if (i === 0 || a.start === 'click' || !a.start) { step++; base = 0; }
    else if (a.start === 'withPrev') base = prevBase;
    else if (a.start === 'afterPrev') base = prevEnd;
    const delay = base + own;
    out.set(b.id, { step, delay, dur });
    prevBase = base; prevEnd = delay + dur;
  });
  return out;
}
