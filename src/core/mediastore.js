// Big files kept in this browser once each, as bytes. The pictures, videos and sounds of a presentation are inside it
// as data: URLs (text); kept as they were, every autosave wrote the whole presentation again — 400 MB every few
// seconds of typing, with 300 MB of photos —, every version was another whole copy (up to 20 «before opening another»
// and the automatic ones), and listing or pruning the versions read them all at once: enough to bring a tab down.
//
// Now the autosaved deck and every version keep only a reference («rvmedia:<id>», the id from the file's SHA-256) for
// each data: URL of MIN or more; the file itself is stored once, as a Blob (the browser keeps it on disk), in its own
// database (revela-media: not an upgrade of the other one, which another open tab could block). Read back, the
// references become the data: URLs again: for the rest of the app nothing changes. Files nothing refers to any more
// are deleted (collectGarbage).
//
// Only whole data: URLs (a picture's src, a video's…); one inside a longer text (a background's url(…)) stays there.

const DB = 'revela-media', STORE = 'media', MIN = 64 * 1024, REF = 'rvmedia:';
let dbp = null;
function db() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB'));
  return (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
  }));
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode), q = fn(t.objectStore(STORE)); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
const put = (id, blob) => tx('readwrite', s => s.put(blob, id));
const get = id => tx('readonly', s => s.get(id));
const keys = () => tx('readonly', s => s.getAllKeys());
const del = list => tx('readwrite', s => { for (const k of list) s.delete(k); });

export const isRef = v => typeof v === 'string' && v.startsWith(REF) && v.length < 80;
const isBig = v => typeof v === 'string' && v.length >= MIN && v.startsWith('data:') && v.indexOf(';base64,') > 0 && v.indexOf(';base64,') < 120;

// data: URL → { id, blob }. Remembered by the string (the same picture at the next save: not decoded or hashed again).
const known = new Map();                          // data: URL → id
let stored = null;                                // ids in the database (read once)
const recent = new Map();                         // id → when it was stored (not collected meanwhile: its deck is on its way)
async function fileOf(d) {
  const at = d.indexOf(','), mime = d.slice(5, at).split(';')[0];
  const bin = atob(d.slice(at + 1)), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return { id: [...hash.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join(''), blob: new Blob([bytes], { type: mime }) };
}
const walk = async (v, fn) => {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) { const o = []; for (const x of v) o.push(await walk(x, fn)); return o; }
  if (!v || typeof v !== 'object') return v;
  const o = {}; for (const k in v) o[k] = await walk(v[k], fn); return o;
};

// A copy of the deck with its big files as references; the files not stored yet, stored. (Throws if they can't be.)
export async function dehydrate(deck) {
  stored ||= new Set(await keys().catch(() => []));
  if (known.size > 500) known.clear();
  return walk(deck, async v => {
    if (isLive(v)) {                             // (a file the page has by its address: its reference, the file stored)
      const id = byURL.get(v), b = live.get(id)?.blob;
      if (!stored.has(id) && b) { await put(id, b); stored.add(id); recent.set(id, Date.now()); }
      return REF + id;
    }
    if (!isBig(v)) return v;
    let id = known.get(v);
    if (!id) {
      const f = await fileOf(v); id = f.id; known.set(v, id);
      if (!stored.has(id)) { await put(id, f.blob); stored.add(id); recent.set(id, Date.now()); }
    } else if (!stored.has(id)) {                // (collected meanwhile, or another tab cleared it: stored again)
      const f = await fileOf(v); await put(id, f.blob); stored.add(id); recent.set(id, Date.now());
    }
    return REF + id;
  });
}
const readURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });
// The deck with its references (and addresses: see below) as data: URLs again (each file read once). A file that isn't
// there: left empty.
export async function hydrate(deck) {
  if (!deck) return deck;
  const cache = new Map();
  return walk(deck, async v => {
    const id = isLive(v) ? byURL.get(v) : refId(v); if (!id) return v;
    if (!cache.has(id)) cache.set(id, mediaBlobOf(REF + id).then(b => (b ? readURL(b) : '')).catch(() => ''));
    const d = await cache.get(id); if (d) known.set(d, id);
    return d;
  });
}
// Whether a stored deck has references (an older one, saved with its files inside, doesn't).
export function hasRefs(v) {
  if (isRef(v)) return true;
  if (Array.isArray(v)) return v.some(hasRefs);
  if (v && typeof v === 'object') { for (const k in v) if (hasRefs(v[k])) return true; }
  return false;
}
// The files none of these stored decks refers to: deleted (not those stored in the last minutes: their deck may be on
// its way to the other database).
// (used: the references already gathered, deck by deck — usedRefs —, instead of every deck at once.)
export function usedRefs(v, used) { if (isRef(v)) used.add(v.slice(REF.length)); else if (Array.isArray(v)) v.forEach(x => usedRefs(x, used)); else if (v && typeof v === 'object') for (const k in v) usedRefs(v[k], used); return used; }
export async function collectGarbage(decks, used = new Set()) {
  (decks || []).forEach(d => usedRefs(d, used));
  for (const id of othersLive()) used.add(id);          // (in use in this page or another open tab)
  const now = Date.now(), all = await keys().catch(() => []);
  const gone = all.filter(id => !used.has(id) && !(now - (recent.get(id) || 0) < 10 * 60e3));
  if (gone.length) { await del(gone); gone.forEach(id => { stored?.delete(id); }); }
  return gone.length;
}

// How much the stored files take: their number and bytes (File ▸ Espacio — features/document/storage.js).
export async function mediaUsage() {
  const d = await db(); let bytes = 0, count = 0;
  await new Promise((res, rej) => {
    const r = d.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) return res(); count++; bytes += c.value?.size || 0; c.continue(); };
    r.onerror = () => rej(r.error);
  });
  return { bytes, count };
}

// A stored file, as a Blob (kept on disk by the browser): a package's files (io/formats/package.js) are put together
// from these, never read whole.
export const mediaBlob = id => get(id);
// A file stored under its id (a package being opened: its id checked against its bytes first — package.js).
export async function storeMedia(id, blob) {
  stored ||= new Set(await keys().catch(() => []));
  if (stored.has(id)) return;
  await put(id, blob); stored.add(id); recent.set(id, Date.now());
}
// A file's id, as dehydrate gives it: the first 16 bytes of its SHA-256, in hex.
export async function mediaId(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...hash.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const MEDIA_REF = REF, MEDIA_MIN = MIN;

// ---- Files in the open presentation as addresses, not as text (2026-10-20) ----
// A picture, video or sound opened from a PowerPoint (or a package) goes straight into this store and the presentation
// holds only its address: a blob: URL in the browser — in the desktop app, its file's own address —, which every <img>,
// <video> or fetch() takes as it is. Copying, undoing, autosaving or duplicating a slide then moves a few dozen
// characters, not hundreds of MB; the bytes are read whole only when they have to go somewhere else (an export, the
// cloud, Drive, a co-editor: portable()). Francisco: «la aplicación se tiene que optimizar muchísimo».
// Saved in this browser (dehydrate), an address becomes its reference again; read back (liveDeck), the reference
// becomes an address. Both forms — data: URLs, as before, and addresses — work everywhere.
// live: id → { type, url, blob? }; byURL: address → id.
const live = new Map(), byURL = new Map();
export const refId = v => (isRef(v) ? v.slice(REF.length) : null);
// Whether a value is the address of a registered file.
export const isLive = v => typeof v === 'string' && v.length < 300 && byURL.has(v);
// A file this page has, registered (a Blob — or, desktop, an address of its own and its type —); its entry back.
export function registerMedia(id, blob, { url = null, type = null } = {}) {
  const had = live.get(id);
  if (had && (had.url || !url)) return had;
  const e = { type: type ?? blob?.type ?? '', url: url || (blob && typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : ''), blob: blob || null };
  live.set(id, e); if (e.url) byURL.set(e.url, id); liveChanged(); return e;
}
// The address that shows a reference, or a registered address itself ('' when not registered yet — liveDeck first).
export const refURL = v => (isLive(v) ? v : live.get(refId(v))?.url || '');
// Its type («video/mp4»…), for a data: URL, a reference or an address alike; '' otherwise.
export function mediaType(v) {
  if (typeof v !== 'string') return '';
  if (v.startsWith('data:')) { const e = v.indexOf(','), m = v.slice(5, e < 0 ? Math.min(v.length, 120) : Math.min(e, 120)).split(';')[0]; return m.toLowerCase(); }
  const id = isLive(v) ? byURL.get(v) : refId(v);
  return (id && live.get(id)?.type) || '';
}
// The bytes behind a reference, an address or a data: URL (a Blob); null when none.
export async function mediaBlobOf(v) {
  const id = isLive(v) ? byURL.get(v) : refId(v);
  if (id) {
    const e = live.get(id); if (e?.blob) return e.blob;
    if (e?.url) { try { const r = await fetch(e.url); if (r.ok) return await r.blob(); } catch {} }
    return (await get(id).catch(() => null)) || null;
  }
  if (typeof v === 'string' && v.startsWith('data:')) return (await fetch(v)).blob();
  return null;
}
// A file in, its address out: stored (once: by its SHA-256) and registered — an import, a picture inserted.
export async function storeFile(blob, type = blob?.type || '') {
  const bytes = new Uint8Array(await blob.arrayBuffer()), id = await mediaId(bytes);
  const b = blob.type === type ? blob : new Blob([bytes], { type });
  await storeMedia(id, b).catch(() => {});                 // (no store — a private window —: the page still has it)
  return registerMedia(id, b).url;
}
// The same from bytes already in hand (a file read out of a PowerPoint): not copied again.
export async function storeBytes(bytes, type = '') {
  const id = await mediaId(bytes), b = new Blob([bytes], { type });
  await storeMedia(id, b).catch(() => {});
  return registerMedia(id, b).url;
}
// Every reference of a deck (or any value) as its address: the files this page doesn't have yet, read from the store
// (as Blobs: on disk, not in memory). A reference whose file isn't there stays as it is.
export async function liveDeck(v) {
  const ids = [...usedRefs(v, new Set())].filter(id => !live.has(id));
  await Promise.all(ids.map(id => get(id).then(b => { if (b) registerMedia(id, b); }).catch(() => {})));
  return mapStrings(v, s => (isRef(s) ? live.get(refId(s))?.url || s : s));
}
// A copy that can leave this page — an export, the cloud, Drive, a co-editor, another app —: references and addresses
// as data: URLs (each file read once). Without any, the value itself.
export async function portable(v) {
  if (!hasLive(v)) return v;
  const cache = new Map();
  return walk(v, async s => {
    const id = isLive(s) ? byURL.get(s) : refId(s); if (!id) return s;
    if (!cache.has(id)) cache.set(id, mediaBlobOf(REF + id).then(b => (b ? readURL(b) : '')).catch(() => ''));
    const d = await cache.get(id); if (d) known.set(d, id);
    return d || s;
  });
}
// Whether a value has addresses or references (portable() would change it).
export function hasLive(v) {
  if (typeof v === 'string') return isRef(v) || isLive(v);
  if (Array.isArray(v)) return v.some(hasLive);
  if (v && typeof v === 'object') { for (const k in v) if (hasLive(v[k])) return true; }
  return false;
}
// How many bytes its addresses and references stand for (a size check before sending: deckMB…).
export function liveBytes(v, seen = new Set()) {
  if (typeof v === 'string') { const id = isLive(v) ? byURL.get(v) : refId(v); if (id && !seen.has(id)) { seen.add(id); return live.get(id)?.blob?.size || 0; } return 0; }
  let n = 0;
  if (Array.isArray(v)) for (const x of v) n += liveBytes(x, seen);
  else if (v && typeof v === 'object') for (const k in v) n += liveBytes(v[k], seen);
  return n;
}
const mapStrings = (v, fn) => {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map(x => mapStrings(x, fn));
  if (!v || typeof v !== 'object') return v;
  const o = {}; for (const k in v) o[k] = mapStrings(v[k], fn); return o;
};
// (Other tabs mustn't delete what this one shows: each tab says, now and then, which files it has — collectGarbage
// leaves those of any tab heard from in the last minutes.)
const TAB = Math.random().toString(36).slice(2), LIVE_KEY = 'revela.media.live.';
let liveTimer = null;
function liveChanged() { if (typeof localStorage === 'undefined' || liveTimer) return; liveTimer = setTimeout(() => { liveTimer = null; sayLive(); }, 2000); }
function sayLive() { try { localStorage.setItem(LIVE_KEY + TAB, JSON.stringify({ t: Date.now(), ids: [...live.keys()] })); } catch {} }
if (typeof window !== 'undefined') { setInterval(() => { if (live.size) sayLive(); }, 60e3); window.addEventListener('pagehide', () => { try { localStorage.removeItem(LIVE_KEY + TAB); } catch {} }); }
function othersLive() {
  const ids = new Set(live.keys());
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k?.startsWith(LIVE_KEY)) continue; const o = JSON.parse(localStorage.getItem(k) || 'null');
    if (o && Date.now() - o.t < 5 * 60e3) (o.ids || []).forEach(id => ids.add(id)); else localStorage.removeItem(k); } } catch {}
  return ids;
}
