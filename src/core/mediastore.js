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
// The deck with its references as data: URLs again (each file read once). A file that isn't there: left empty.
export async function hydrate(deck) {
  if (!deck) return deck;
  const cache = new Map();
  return walk(deck, async v => {
    if (!isRef(v)) return v;
    const id = v.slice(REF.length);
    if (!cache.has(id)) cache.set(id, get(id).then(b => (b ? readURL(b) : '')).catch(() => ''));
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
  const now = Date.now(), all = await keys().catch(() => []);
  const gone = all.filter(id => !used.has(id) && !(now - (recent.get(id) || 0) < 10 * 60e3));
  if (gone.length) { await del(gone); gone.forEach(id => { stored?.delete(id); }); }
  return gone.length;
}
