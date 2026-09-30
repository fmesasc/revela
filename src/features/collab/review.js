// Track changes (Word's "Track Changes", OnlyOffice's review mode): while it is
// on, every edit is applied as usual and also recorded — who, when, what —
// with what it replaced, so that someone can go through them and accept each
// one (the record goes) or reject it (what it replaced comes back).
//
// The records live in the deck (deck.changes), so they travel with the file
// and reach co-editors; they are made from the same small operations as live
// collaboration (features/live/collabsync.js). Edits by the same person on the
// same objects within a minute are one change.

import { state, commit, amend, onEdit } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { diff, applyOps } from '../live/collabsync.js';
import { author } from './comments.js';

const MERGE_MS = 60e3;
const IGNORE = new Set(['changes', 'review', 'savedAt', 'signatures', 'final']);
const relevant = op => Array.isArray(op.p) && !IGNORE.has(op.p[0]) && !op.p.includes('comments');
const key = op => JSON.stringify(op.p);

export const tracking = (deck = state.deck) => !!deck.review?.on;
export const changesOf = (deck = state.deck) => deck.changes || [];
export function setTracking(on) {
  commit(() => { if (on) state.deck.review = { on: true }; else delete state.deck.review; }, { track: false });
}

// What a change touched: its slide and objects.
function targets(ops) {
  const slides = new Set(), blocks = new Set();
  for (const { p } of ops) if (p[0] === 'slides' && p[1]) { slides.add(p[1]); if (p[2] === 'blocks' && p[3] && p[3] !== '#') blocks.add(p[3]); }
  return { slides: [...slides], blocks: [...blocks] };
}
// What kind of change it is, for the list.
export function describe(c) {
  const ops = c.ops;
  const blockOp = ops.find(o => o.p[2] === 'blocks' && o.p.length === 4);
  if (ops.some(o => o.p[0] === 'slides' && o.p.length === 2 && 'v' in o)) return 'Diapositiva añadida';
  if (ops.some(o => o.p[0] === 'slides' && o.p.length === 2 && o.d)) return 'Diapositiva eliminada';
  if (blockOp && 'v' in blockOp) return 'Objeto añadido';
  if (blockOp && blockOp.d) return 'Objeto eliminado';
  if (ops.some(o => o.p.at(-1) === '#')) return 'Orden cambiado';
  const fields = new Set(ops.map(o => o.p.at(-1)));
  if (['html', 'text', 'code', 'latex'].some(f => fields.has(f))) return 'Texto cambiado';
  if ([...fields].every(f => ['x', 'y', 'w', 'h', 'rotation'].includes(f))) return 'Movido o cambiado de tamaño';
  return 'Formato cambiado';
}

// Record one edit (called with the deck before and after it).
function record(before, after) {
  if (!tracking(before) || !tracking(after)) return;
  const ops = diff(before, after).filter(relevant); if (!ops.length) return;
  const undo = diff(after, before).filter(relevant), who = author() || '', now = Date.now(), tg = targets(ops);
  amend(() => {
    const list = (state.deck.changes ||= []), last = list.at(-1);
    const same = last && last.author === who && now - last.time < MERGE_MS && tg.blocks.length && tg.blocks.every(b => last.blocks.includes(b));
    if (same) {
      // One change: the latest values, and what was there before the first edit.
      const done = new Set(last.undo.map(key));
      last.ops = [...last.ops.filter(o => !ops.some(n => key(n) === key(o))), ...ops];
      last.undo = [...last.undo, ...undo.filter(o => !done.has(key(o)))];
      last.time = now;
    } else list.push({ id: uid(), author: who, time: now, ops, undo, slides: tg.slides, blocks: tg.blocks });
  });
}
export const startTracking = () => onEdit(record);

// Keep it (the record goes) or undo it (what it replaced comes back).
export function accept(id) {
  commit(() => { state.deck.changes = changesOf().filter(c => c.id !== id); if (!state.deck.changes.length) delete state.deck.changes; }, { track: false });
}
export function reject(id) {
  const c = changesOf().find(x => x.id === id); if (!c) return;
  commit(() => {
    applyOps(state.deck, c.undo);
    state.deck.changes = changesOf().filter(x => x.id !== id); if (!state.deck.changes.length) delete state.deck.changes;
  }, { track: false });
}
export function acceptAll() { commit(() => { delete state.deck.changes; }, { track: false }); }
export function rejectAll() {
  commit(() => { for (const c of changesOf().slice().reverse()) applyOps(state.deck, c.undo); delete state.deck.changes; }, { track: false });
}
