// What Revela keeps in this browser, and the room it has: Archivo ▸ Espacio (ui/dialogs/storage.js). The presentation
// being edited (autosaved), its versions (features/collab/versions.js: each a light copy, its big files apart), the big
// files themselves (core/mediastore.js: each one once, as bytes, whatever refers to it) and the copies kept for working
// offline and the spelling dictionaries (Cache Storage). How much that is and how much the browser lets it use
// (navigator.storage.estimate); ways to free some; and asking the browser not to clear it by itself when the disk runs
// low (navigator.storage.persist — Safari, above all, removes a site's data after a while otherwise).
// When it goes past four fifths of what it may use, a note says so once (watchStorage), before saving fails.

import { state } from '../../core/store.js';
import { approxSize } from '../../core/model.js';
import { verEach, verDel } from '../../core/idb.js';
import { mediaUsage } from '../../core/mediastore.js';

const S = () => globalThis.navigator?.storage;

// { usage, quota, persisted, caches } in bytes (persisted: true, false, or null when the browser can't say).
export async function storageEstimate() {
  const st = S();
  const e = st?.estimate ? await st.estimate().catch(() => ({})) : {};
  const persisted = st?.persisted ? await st.persisted().catch(() => null) : null;
  return { usage: e.usage ?? null, quota: e.quota ?? null, persisted, caches: e.usageDetails?.caches ?? null };
}

// The parts: { deck, versions: { bytes, count, autos }, media: { bytes, count }, caches } — bytes, roughly (a
// presentation is measured as text; the browser's own count, in usage, is the one that counts).
export async function storageReport() {
  const est = await storageEstimate();
  const versions = { bytes: 0, count: 0, autos: 0, named: 0 };
  await verEach(v => {
    versions.count++; versions.bytes += approxSize(v.deck || {});
    if (v.auto && v.kind !== 'before') versions.autos++; else versions.named++;
  }).catch(() => {});
  const media = await mediaUsage().catch(() => ({ bytes: 0, count: 0 }));
  let caches = est.caches;
  if (caches == null && globalThis.caches?.keys) caches = await cacheBytes().catch(() => null);
  return { ...est, deck: approxSize(state.deck), versions, media, caches };
}

// (Browsers without usageDetails: the cached answers added up — their bodies read once; a few hundred files.)
async function cacheBytes() {
  let n = 0;
  for (const name of await caches.keys()) {
    const c = await caches.open(name);
    for (const req of await c.keys()) { const r = await c.match(req); if (r) n += (await r.clone().blob()).size; }
  }
  return n;
}

// Free room: the automatic versions but the newest `keep` — never the named ones (saved by hand), nor the copies of
// the presentation open before another was opened (kind 'before': maybe a whole other presentation, kept nowhere
// else) —, then the big files nothing refers to any more. → how many versions went.
export async function freeVersions(keep = 3) {
  const autos = [];
  await verEach(v => { if (v.auto && v.kind !== 'before') autos.push({ id: v.id, time: v.time }); });
  autos.sort((a, b) => b.time - a.time);
  const gone = autos.slice(keep);
  for (const v of gone) await verDel(v.id);
  const { tidyStored } = await import('../../core/model.js');
  const { dehydrate } = await import('../../core/mediastore.js');
  await tidyStored(await dehydrate(state.deck).catch(() => state.deck)).catch(() => {});
  return gone.length;
}

// The copies for working offline and the dictionaries: gone (downloaded again when needed, online). → bytes freed.
export async function clearCaches() {
  if (!globalThis.caches?.keys) return 0;
  const before = (await storageEstimate()).caches;
  for (const name of await caches.keys()) await caches.delete(name);
  return before || 0;
}

// Ask the browser to keep Revela's data even when the disk runs low. → whether it is now kept.
export async function askPersist() {
  const st = S(); if (!st?.persist) return null;
  return (await st.persisted?.().catch(() => false)) || st.persist().catch(() => false);
}

// The share of the room in use (0–1), or null.
export const share = e => (e && e.usage != null && e.quota ? e.usage / e.quota : null);

// Now and then: past four fifths of the room, one note (per session) — before saving fails.
let warned = false;
export function watchStorage(note, { every = 10 * 60e3, limit = 0.8, first = 20e3 } = {}) {
  const check = async () => {
    if (warned) return;
    const e = await storageEstimate(); const k = share(e);
    if (k != null && k >= limit) { warned = true; note(e); }
  };
  setTimeout(check, first); return setInterval(check, every);
}
export const resetWarning = () => { warned = false; };
