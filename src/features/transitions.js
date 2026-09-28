// Per‑slide transitions and per‑object entrance animations.

import { state, commit, currentSlide, selectedBlock } from '../core/store.js';

export const SLIDE_TRANSITIONS = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'];
export const ANIMATIONS = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in'];

// A slide's own transition overrides the deck default. `null` = inherit.
export function setSlideTransition(value) {
  commit(() => { currentSlide().transition = value === 'inherit' ? null : value; });
}
export function setDeckTransition(value) {
  commit(() => { state.deck.defaultTransition = value; });
}
export function setTransitionSpeed(value) {
  commit(() => { state.deck.transitionSpeed = value; });
}

// Per‑object animation: effect + order (fragment index) + start + timing.
export function setAnimation(effect) {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    if (b.animation) b.animation.effect = effect;
    else b.animation = { effect, order: animatedBlocks().length + 1, start: 'click', duration: 500, delay: 0 };
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
    b.animation[prop] = (prop === 'duration' || prop === 'delay') ? Math.max(0, +value || 0) : value;
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

// Reassign fragment indices 1..k honouring "with previous" (shared index).
function normalizeAnim() {
  const list = animatedBlocks(); let idx = 0;
  list.forEach((b, i) => {
    if (i === 0 || b.animation.start !== 'withPrev') idx++;
    b.animation.order = idx;
  });
}
