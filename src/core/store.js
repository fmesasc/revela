// Central application store: the document plus transient UI state, a small
// history stack for undo/redo, and a subscription mechanism so the UI re-renders
// after every committed change.

import { emptyDeck, loadDeck, saveDeck } from './model.js';

const listeners = new Set();
const past = [];
const future = [];
const HISTORY_LIMIT = 60;
// Undo snapshots copy objects and arrays but share the strings (immutable in
// JS), so the megabytes of embedded images/video are never duplicated — a
// JSON copy per step would exhaust memory on big decks.
export function snapshot(v) {
  if (Array.isArray(v)) return v.map(snapshot);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = snapshot(v[k]); return o; }
  return v;
}

export const state = {
  deck: loadDeck() || emptyDeck(),
  // `selection` is the primary (last‑clicked) block; `multi` is the full set of
  // selected block ids (includes the primary). Single selection keeps both in sync.
  ui: { slideIndex: 0, selection: null, multi: [], showGuides: false, activeTab: 'home', zoom: 1, snap: true },
};

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { for (const fn of listeners) fn(); }

// Read helpers.
// While editing the slide master (editMaster === true) or one of its layouts
// (editMaster === its id), "the current slide" is that, so every editing
// operation works on it unchanged.
export const currentSlide = () => {
  const m = state.ui.editMaster;
  if (!m) return state.deck.slides[state.ui.slideIndex];
  return (m !== true && (state.deck.layouts?.find(l => l.id === m) || state.deck.masters?.find(x => x.id === m))) || (state.deck.master ||= { id: 'master', blocks: [], background: null });
};
export const selectedBlock = () => {
  const s = currentSlide();
  return s ? s.blocks.find(b => b.id === state.ui.selection) || null : null;
};
// All currently selected ids / blocks (falls back to the single primary).
export const selectedIds = () =>
  (state.ui.multi && state.ui.multi.length) ? state.ui.multi
    : (state.ui.selection ? [state.ui.selection] : []);
export const selectedBlocks = () => {
  const s = currentSlide(); if (!s) return [];
  const ids = new Set(selectedIds());
  return s.blocks.filter(b => ids.has(b.id));
};
export const isSelected = id => selectedIds().includes(id);

// Selection helpers keep `selection` (primary) and `multi` (set) consistent.
export function setSelection(id) { state.ui.selection = id; state.ui.multi = id ? [id] : []; }
export function toggleSelection(id) {
  const m = new Set(state.ui.multi.length ? state.ui.multi : (state.ui.selection ? [state.ui.selection] : []));
  if (m.has(id)) m.delete(id); else m.add(id);
  state.ui.multi = [...m];
  state.ui.selection = state.ui.multi[state.ui.multi.length - 1] || null;
}
export function setMulti(ids) { state.ui.multi = [...ids]; state.ui.selection = ids[ids.length - 1] || null; }
// Selecting a grouped block selects its whole group.
export function selectWithGroup(id) {
  const s = currentSlide(); const b = s && s.blocks.find(x => x.id === id);
  if (b && b.groupId) setMulti(s.blocks.filter(x => x.groupId === b.groupId).map(x => x.id));
  else setSelection(id);
}
export const clampSlide = () => {
  state.ui.slideIndex = Math.max(0, Math.min(state.ui.slideIndex, state.deck.slides.length - 1));
};

// `commit` records history, persists, and re-renders. `mutate` is for tiny,
// high-frequency changes (dragging) that should persist and render but not spam
// the undo stack.
//
// Undo steps are taken against `base`, a copy of the deck at the last step:
// changes made in place (dragging, typing, sliders) without recording become
// a step of their own at the next recorded change or when undoing. A commit
// that changes nothing adds no step.
let base = snapshot(state.deck);
// Same content? Strings are shared between copies, so this is cheap.
function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keep = k => k !== 'savedAt';          // the save time is not a change
  const ka = Object.keys(a).filter(k => a[k] !== undefined && keep(k)), kb = Object.keys(b).filter(k => b[k] !== undefined && keep(k));
  return ka.length === kb.length && ka.every(k => same(a[k], b[k]));
}
// Record what changed since the last step as a step of its own.
export function checkpoint() {
  if (same(base, state.deck)) return false;
  past.push(base);
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
  base = snapshot(state.deck);
  return true;
}
export function commit(fn, { history = true, force = false } = {}) {
  // A deck marked as final is read-only: edits are refused (selection and
  // other UI changes, which don't record history, still work).
  if (state.deck.final && history && !force) { window.dispatchEvent(new Event('revela:readonly')); return; }
  if (history) checkpoint();          // changes made in place before are a step of their own
  if (fn) fn();
  clampSlide();
  if (history) checkpoint();
  saveDeck(state.deck);
  notify();
  // What drawing it filled in (default styles created on first use…) belongs to this step.
  if (history) base = snapshot(state.deck);
}

export function mutate(fn) { commit(fn, { history: false }); }

// Changes that follow from the last one (made by a listener after it, like
// slides following their layout): part of the same undo step.
export function amend(fn) {
  if (fn) fn();
  clampSlide(); base = snapshot(state.deck);
  saveDeck(state.deck); notify();
}
export const canUndo = () => past.length > 0 || !same(base, state.deck);
export const canRedo = () => future.length > 0;
export function undo() {
  checkpoint();                       // changes not recorded yet are undone first
  if (!past.length) return;
  future.push(snapshot(state.deck));
  state.deck = past.pop();
  clampSlide(); saveDeck(state.deck); notify();
  base = snapshot(state.deck);
}
export function redo() {
  if (!future.length) return;
  past.push(snapshot(state.deck));
  state.deck = future.pop();
  clampSlide(); saveDeck(state.deck); notify();
  base = snapshot(state.deck);
}

// A newer copy of the same document (from another tab or the disk): no undo step.
export function adoptDeck(deck) {
  state.deck = deck; state.ui.slideIndex = 0; base = snapshot(deck); past.length = 0; future.length = 0;
  notify();
}
export function replaceDeck(deck) {
  // Another deck: leave the master view too (it would edit a master that isn't there).
  commit(() => { state.deck = deck; state.ui.slideIndex = 0; state.ui.selection = null; state.ui.multi = []; state.ui.editMaster = false; });
}
