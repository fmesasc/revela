// Central application store: the document plus transient UI state, a small
// history stack for undo/redo, and a subscription mechanism so the UI re-renders
// after every committed change.

import { emptyDeck, loadDeck, saveDeck } from './model.js';

const listeners = new Set();
const past = [];
const future = [];
const HISTORY_LIMIT = 60;

export const state = {
  deck: loadDeck() || emptyDeck(),
  ui: { slideIndex: 0, selection: null, showGuides: false, activeTab: 'home' },
};

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { for (const fn of listeners) fn(); }

// Read helpers.
export const currentSlide = () => state.deck.slides[state.ui.slideIndex];
export const selectedBlock = () => {
  const s = currentSlide();
  return s ? s.blocks.find(b => b.id === state.ui.selection) || null : null;
};
export const clampSlide = () => {
  state.ui.slideIndex = Math.max(0, Math.min(state.ui.slideIndex, state.deck.slides.length - 1));
};

// `commit` records history, persists, and re-renders. `mutate` is for tiny,
// high-frequency changes (dragging) that should persist and render but not spam
// the undo stack.
export function commit(fn, { history = true } = {}) {
  if (history) {
    past.push(JSON.stringify(state.deck));
    if (past.length > HISTORY_LIMIT) past.shift();
    future.length = 0;
  }
  if (fn) fn();
  clampSlide();
  saveDeck(state.deck);
  notify();
}

export function mutate(fn) { commit(fn, { history: false }); }

export function undo() {
  if (!past.length) return;
  future.push(JSON.stringify(state.deck));
  state.deck = JSON.parse(past.pop());
  clampSlide(); saveDeck(state.deck); notify();
}
export function redo() {
  if (!future.length) return;
  past.push(JSON.stringify(state.deck));
  state.deck = JSON.parse(future.pop());
  clampSlide(); saveDeck(state.deck); notify();
}

export function replaceDeck(deck) {
  commit(() => { state.deck = deck; state.ui.slideIndex = 0; state.ui.selection = null; });
}
