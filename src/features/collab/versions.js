// Version history (PowerPoint/Google Slides/OnlyOffice "Version history"),
// kept in this browser's IndexedDB: automatic snapshots while you edit and
// named versions you save yourself. Restoring first saves the current state,
// so nothing is lost.

import { state, subscribe, replaceDeck, snapshot } from '../../core/store.js';
import { approxSize } from '../../core/model.js';
import { verPut, verGet, verDel, verAll } from '../../core/idb.js';

const AUTO_EVERY = 5 * 60 * 1000;     // at most one automatic snapshot every 5 minutes of editing
const AUTO_KEEP = 30;                 // automatic snapshots kept (named ones are never pruned)
let lastAuto = 0, lastSig = '';

const sig = d => `${d.slides.length}|${d.savedAt || ''}`;
export async function saveVersion(name = '', auto = false) {
  const deck = snapshot(state.deck);
  const v = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: Date.now(), name, auto,
    title: deck.name || '', slides: deck.slides.length, deck };
  await verPut(v);
  if (auto) await prune();
  return v.id;
}
async function prune() {
  const keep = approxSize(state.deck) > 20e6 ? 3 : AUTO_KEEP;     // big decks: fewer automatic copies
  const autos = (await verAll()).filter(v => v.auto).sort((a, b) => b.time - a.time);
  for (const v of autos.slice(keep)) await verDel(v.id);
}
// Newest first, without the (possibly large) decks.
export async function listVersions() {
  return (await verAll()).sort((a, b) => b.time - a.time).map(({ deck, ...meta }) => meta);
}
export async function restoreVersion(id) {
  const v = await verGet(id); if (!v) return false;
  await saveVersion('', true);                               // keep what we had before restoring
  replaceDeck(structuredClone(v.deck));
  return true;
}
export const versionDeck = async id => (await verGet(id))?.deck || null;
export const deleteVersion = id => verDel(id);

// Automatic snapshots: after edits, at most every AUTO_EVERY.
export function startAutoVersions() {
  subscribe(() => {
    const now = Date.now(), s = sig(state.deck);
    if (s === lastSig || now - lastAuto < AUTO_EVERY) return;
    lastSig = s; lastAuto = now;
    saveVersion('', true).catch(() => {});
  });
  lastAuto = Date.now();                                     // first snapshot after 5 minutes of work
}
