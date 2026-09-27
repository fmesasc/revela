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

// Object entrance animation: effect + order (0 = appears with the slide).
export function setAnimation(effect) {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const order = 1 + currentSlide().blocks.filter(x => x.animation).length;
    b.animation = { effect, order };
  });
}
export function clearAnimation() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { b.animation = null; });
}
