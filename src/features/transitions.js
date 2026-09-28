// Per‑slide transitions and per‑object entrance animations.

import { state, commit, currentSlide, selectedBlock } from '../core/store.js';

export const SLIDE_TRANSITIONS = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'];
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
  'fade-out': 'rvOut', 'fade-in-then-out': 'rvInOut', 'highlight-red': 'rvHi', 'highlight-green': 'rvHi', 'highlight-blue': 'rvHi',
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
@keyframes rvHi{0%,100%{background:transparent}50%{background:#ff3b3b66}}
@keyframes rvPath{to{translate:var(--dx,0) var(--dy,0)}}`;
// Effects that make an object appear (it starts hidden until it plays).
export const isEntrance = effect => !['fade-out', 'highlight-red', 'highlight-green', 'highlight-blue', 'strike', 'path'].includes(effect);

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
