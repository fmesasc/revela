// Version history (PowerPoint/Google Slides/OnlyOffice "Version history"),
// kept in this browser's IndexedDB: automatic snapshots while you edit and
// named versions you save yourself. Restoring first saves the current state,
// so nothing is lost.

import { state, subscribe, replaceDeck, snapshot, docVersion, docEpoch, onBeforeReplace } from '../../core/store.js';
import { approxSize, isBlankDeck } from '../../core/model.js';
import { verPut, verGet, verDel, verAll } from '../../core/idb.js';
import { dehydrate, hydrate, hasRefs } from '../../core/mediastore.js';

const AUTO_EVERY = 5 * 60 * 1000;     // at most one automatic snapshot every 5 minutes of editing
const AUTO_KEEP = 30;                 // automatic snapshots kept (named ones are never pruned)
let lastAuto = 0, lastSig = '';

const sig = () => docVersion();                    // (the content's version: not the save time, which changes with every click)
export async function saveVersion(name = '', auto = false, kind = null) {
  // (Its big files once, apart: core/mediastore.js. A version is no longer another whole copy of them.)
  const deck = await dehydrate(snapshot(state.deck)).catch(() => snapshot(state.deck));
  const v = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: Date.now(), name, auto, ...(kind && { kind }),
    title: deck.name || '', slides: deck.slides.length, deck };
  await verPut(v);
  if (auto) await prune();
  return v.id;
}
async function prune() {
  const keep = approxSize(state.deck) > 20e6 ? 3 : AUTO_KEEP;     // big decks: fewer automatic copies
  const autos = (await verAll()).filter(v => v.auto && v.kind !== 'before').sort((a, b) => b.time - a.time);
  for (const v of autos.slice(keep)) await verDel(v.id);
}
// Newest first, without the (possibly large) decks.
export async function listVersions() {
  return (await verAll()).sort((a, b) => b.time - a.time).map(({ deck, ...meta }) => meta);
}
export async function restoreVersion(id) {
  const v = await verGet(id); if (!v) return false;
  await saveVersion('', true, 'before');                     // keep what we had before restoring (not pruned with the automatic ones)
  const deck = hasRefs(v.deck) ? await hydrate(v.deck) : structuredClone(v.deck);
  restoring = true; replaceDeck(deck);       // (that copy is the one: not a second from keepBeforeReplacing)
  return true;
}
export const versionDeck = async id => { const d = (await verGet(id))?.deck; return d ? (hasRefs(d) ? hydrate(d) : d) : null; };
export const deleteVersion = id => verDel(id);

// Before another document replaces this one: a copy of it, if it changed since it was opened (so
// nothing is lost to a misclick, with or without an account). Kept apart (kind 'before', the last 20).
// onKept tells the interface (to offer it back).
const BEFORE_KEEP = 20;
let seenEpoch = -1, openedAt = 0, restoring = false;
const kept = new Set();
export const onKept = fn => { kept.add(fn); return () => kept.delete(fn); };
export function keepBeforeReplacing() {
  const look = () => { if (docEpoch() !== seenEpoch) { seenEpoch = docEpoch(); openedAt = docVersion(); } };
  subscribe(look); look();
  onBeforeReplace(old => {
    if (restoring) { restoring = false; return; }
    if (docVersion() === openedAt || isBlankDeck(old)) return;
    const snap = snapshot(old), v = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: Date.now(), name: '', auto: true, kind: 'before',
      title: snap.name || '', slides: snap.slides.length };
    dehydrate(snap).catch(() => snap).then(deck => verPut({ ...v, deck })).then(async () => {
      const before = (await verAll()).filter(x => x.kind === 'before').sort((a, b) => b.time - a.time);
      for (const x of before.slice(BEFORE_KEEP)) await verDel(x.id);
      kept.forEach(fn => { try { fn({ id: v.id, title: v.title }); } catch {} });
    }).catch(() => {});
  });
}

// Automatic snapshots: after edits, at most every AUTO_EVERY.
export function startAutoVersions() {
  subscribe(() => {
    const now = Date.now(), s = sig();
    if (s === lastSig || now - lastAuto < AUTO_EVERY) return;
    lastSig = s; lastAuto = now;
    saveVersion('', true).catch(() => {});
  });
  lastAuto = Date.now(); lastSig = sig();                   // first snapshot after 5 minutes of work (with changes)
}
