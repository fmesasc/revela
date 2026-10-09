// Central application store: the document plus transient UI state, a small
// history stack for undo/redo, and a subscription mechanism so the UI re-renders
// after every committed change.

import { emptyDeck, loadDeck, saveDeck, flushSave } from './model.js';

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
  // `slideSel` is the set of slide ids selected in the slides panel (the current
  // slide, the one on the canvas, is among them); `slideAnchor` is where a
  // Shift+click range starts. One slide or none: just the current one.
  ui: { slideIndex: 0, selection: null, multi: [], slideSel: [], slideAnchor: null, showGuides: false, activeTab: 'home', zoom: 1, snap: true },
};

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
// What the change being drawn touched: { doc } — the document's content (or another document), or only the screen
// (selection, tab, zoom, panels). Listeners that redraw costly parts (the slides panel) skip them for the screen.
let change = { doc: true }, shown = [-1, -1];
export const lastChange = () => change;
function notify() {
  change = { doc: version !== shown[0] || epoch !== shown[1] }; shown = [version, epoch];
  for (const fn of listeners) fn();
}

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
  pruneSlideSel();
};

// ---- Slides selected in the panel (PowerPoint: Ctrl/Shift+click on thumbnails) ----
// Ids that no longer exist (deleted, undone, removed by a co-author) are dropped;
// if the current slide is not among the rest, the selection collapses to it.
function pruneSlideSel() {
  const u = state.ui, sel = u.slideSel; if (!sel?.length) return;
  const have = new Set(state.deck.slides.map(s => s.id)), cur = state.deck.slides[u.slideIndex]?.id;
  const kept = sel.filter(id => have.has(id));
  u.slideSel = kept.length > 1 && kept.includes(cur) ? kept : [];
  if (u.slideAnchor && !have.has(u.slideAnchor)) u.slideAnchor = null;
}
// The selected slides' indices, in deck order; just the current one when
// fewer than two are selected (or in the master view).
export function selectedSlideIndices() {
  const u = state.ui;
  if (u.editMaster || !(u.slideSel?.length > 1)) return state.deck.slides[u.slideIndex] ? [u.slideIndex] : [];
  const ids = new Set(u.slideSel);
  return state.deck.slides.map((s, i) => (ids.has(s.id) ? i : -1)).filter(i => i >= 0);
}
// What slide-level commands act on: the selected slides, or the current one
// (in the master view: the master or layout being edited).
export const targetSlides = () => (state.ui.editMaster ? [currentSlide()].filter(Boolean) : selectedSlideIndices().map(i => state.deck.slides[i]));
export const slideSelCount = () => selectedSlideIndices().length;
export const isSlideSelected = id => (state.ui.slideSel?.length > 1 ? state.ui.slideSel.includes(id) : state.deck.slides[state.ui.slideIndex]?.id === id);
// Select these slides (ids); `current` (an index) is the one shown on the canvas.
export function setSlideSel(ids, current = null) {
  const u = state.ui;
  if (current != null) u.slideIndex = current;
  const cur = state.deck.slides[u.slideIndex]?.id;
  u.slideSel = ids.length > 1 ? [...new Set([...ids, ...(ids.includes(cur) ? [] : [cur])])] : [];
}

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
// Each comparison and copy walks the whole deck (on a big one, milliseconds each on a slow machine): an edit used to
// take four comparisons and three copies. Now one copy per step, taken once the edit is drawn (`base` null until
// then: settle() takes it when something needs it sooner), and what the comparisons found answers for saving, the
// watchers and the undo button. The copy last saved (`persisted`) is often that same object: `toBase` marks that it
// will be (it can't be compared until then). Neither copy is ever changed in place: whatever would make one of them
// the document or change it (undo, redo, applyRemote) lets `persisted` go first.
let toBase = false;
function settle() {
  if (base) return;
  base = snapshot(state.deck);
  if (toBase) { persisted = base; toBase = false; }
}
// Record what changed since the last step as a step of its own. later: its copy is taken after drawing (settle).
export function checkpoint(later = false) {
  settle();
  if (same(base, state.deck)) return false;
  past.push(base);
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
  base = later ? null : snapshot(state.deck);
  return true;
}
// Who wants to know what each edit changed (track changes): fn(before, after).
// Not told of remote changes, undo/redo or edits made with { track: false }.
const editWatchers = new Set();
export const onEdit = fn => { editWatchers.add(fn); return () => editWatchers.delete(fn); };
export function commit(fn, { history = true, force = false, comment = false, track = true } = {}) {
  // A deck marked as final is read-only: edits are refused (selection and
  // other UI changes, which don't record history, still work). So is a shared
  // one opened to view (or only to comment: then comments are allowed).
  const lock = state.ui.lock;
  if ((state.deck.final || (lock && !(lock === 'comment' && comment))) && history && !force) { window.dispatchEvent(new Event('revela:readonly')); return; }
  settle();
  const before = history && track && editWatchers.size ? base : null;   // (the last step: with what was typed since)
  const start = base, wasSaved = persisted === start;
  const typed = history && checkpoint();          // changes made in place before are a step of their own
  if (fn) fn();
  clampSlide();
  const made = history && checkpoint(true);
  // (Different from the last step: from the copy saved too, when that was it. Without a change in place, the
  // document is now its new step, which is the copy saved.)
  save(made || (typed && wasSaved));
  notify();
  // What drawing it filled in (default styles created on first use…) belongs to this step.
  if (history) { if (base && !toBase) base = snapshot(state.deck); else { base = null; settle(); } }
  // (Different from `before` when exactly one of the two found a change; when both did, the edit may have undone
  // what was typed: compared.)
  if (before && (typed !== made || (typed && !same(before, state.deck)))) editWatchers.forEach(w => { try { w(before, state.deck); } catch {} });
}

export function mutate(fn) { commit(fn, { history: false }); }

// Changes that follow from the last one (made by a listener after it, like
// slides following their layout): part of the same undo step.
export function amend(fn) {
  settle();
  if (fn) fn();
  clampSlide(); base = snapshot(state.deck);
  save(); notify();
}
// Whether there is something to undo / redo (the buttons are off otherwise). (Asked at every redraw: the
// comparison only when the document's content or the last step changed since it was last made.)
let undoable = { at: null };
export const canUndo = () => {
  if (past.length) return true;
  settle();
  if (undoable.at !== version || undoable.base !== base) undoable = { at: version, base, v: !same(base, state.deck) };
  return undoable.v;
};
export const canRedo = () => future.length > 0;
export function undo() {
  checkpoint();                       // changes not recorded yet are undone first
  if (!past.length) return;
  future.push(base);                  // (the document as it is: checkpoint just made sure)
  state.deck = past.pop();
  if (persisted === state.deck) persisted = null;   // (the document now: it can't be what was saved)
  clampSlide(); save(); notify();
  base = snapshot(state.deck);
}
export function redo() {
  if (!future.length) return;
  settle();
  past.push(snapshot(state.deck));
  state.deck = future.pop();
  if (persisted === state.deck) persisted = null;
  clampSlide(); save(); notify();
  base = snapshot(state.deck);
}

// Whether changes are kept in this browser (not while editing someone else's
// shared document: that copy is theirs).
let persist = true;
export const setPersist = on => { persist = !!on; };
// The document's version: it goes up only when its content changes (not with
// selection, tabs or zoom), so saving — here, to Drive, as a version — happens
// only then, instead of serialising the whole deck at every click.
let version = 0, persisted = base;
export const docVersion = () => version;
// changed: known to differ from what was saved (commit's comparisons), and then the document is the step being
// recorded (`base`: its copy, or the one about to be taken), which is what was saved.
function save(changed = false) {
  if (!changed) { settle(); if (same(persisted, state.deck)) return; }
  version++;
  if (!changed) persisted = snapshot(state.deck);
  else if (base) persisted = base;
  else { persisted = null; toBase = true; }
  persist && saveDeck(state.deck);
}
// Changes made by someone else (co-editing): applied to the document and to
// the undo history, so undoing only undoes one's own changes. No undo step.
export function applyRemote(fn) {
  settle();
  const cur = state.deck.slides[state.ui.slideIndex]?.id;
  if (persisted === base || past.includes(persisted) || future.includes(persisted)) persisted = snapshot(persisted);   // (it stays as saved)
  fn(state.deck); fn(base); past.forEach(fn); future.forEach(fn);
  // (The slide on the canvas stays the same one, wherever their change moved it.)
  const i = state.deck.slides.findIndex(s => s.id === cur); if (i >= 0) state.ui.slideIndex = i;
  clampSlide(); save(); notify();
}
// A newer copy of the same document (from another tab or the disk): no undo step.
// Which document is open: it changes when another one replaces it (not with
// edits or undo), so what is linked to a file (Drive) knows it is still the same.
let epoch = 0;
export const docEpoch = () => epoch;
// What every deck from outside goes through before it is used (the editor
// sets its sanitizer: nothing in a document may run code).
let deckFilter = d => d;
export const setDeckFilter = fn => { deckFilter = fn; };
// sameDocument: a newer copy of this very document (not another one).
// Before another document replaces this one (not a newer copy of the same): what keeps it — Drive,
// Revela's cloud, this browser's copies — gets the chance to keep its last changes first (the deck
// given is the outgoing one, untouched). first: run before the others (to see where it was saved).
const beforeReplace = [];
export function onBeforeReplace(fn, { first = false } = {}) { first ? beforeReplace.unshift(fn) : beforeReplace.push(fn); return () => { const i = beforeReplace.indexOf(fn); if (i >= 0) beforeReplace.splice(i, 1); }; }
// (Its last changes still waiting to be written in this browser are written first: model.saveDeck waits a second.)
const leaving = () => { const old = state.deck; flushSave(); for (const fn of [...beforeReplace]) { try { fn(old); } catch (e) { console.error(e); } } };
export function adoptDeck(deck, { sameDocument = false } = {}) {
  if (!sameDocument) { leaving(); epoch++; }
  deck = deckFilter(deck);
  state.deck = deck; state.ui.slideIndex = 0; state.ui.slideSel = []; base = snapshot(deck); past.length = 0; future.length = 0;
  version++; persisted = base; toBase = false;           // (already saved where it came from)
  notify();
}
export function replaceDeck(deck) {
  // Another deck: leave the master view too (it would edit a master that isn't there).
  leaving(); epoch++;
  // (Also from a presentation marked as final: that protects it, not the app.)
  deck = deckFilter(deck);
  commit(() => { state.deck = deck; state.ui.slideIndex = 0; state.ui.selection = null; state.ui.multi = []; state.ui.slideSel = []; state.ui.slidePick = false; state.ui.navFocus = false; state.ui.editMaster = false; }, { force: true });
}
