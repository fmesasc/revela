// Minimal IndexedDB wrapper (no library): a "kv" store for the autosaved deck
// and a "versions" store for the version history. IndexedDB holds large decks
// (images, video) that don't fit in localStorage's ~5 MB.

const DB = 'revela', VER = 1;
let dbp = null;
function db() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB'));
  return (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('versions')) d.createObjectStore('versions', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
}
const tx = async (store, mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode), req = fn(t.objectStore(store));
    t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
};
export const kvGet = key => tx('kv', 'readonly', s => s.get(key));
export const kvSet = (key, val) => tx('kv', 'readwrite', s => s.put(val, key));
export const verPut = v => tx('versions', 'readwrite', s => s.put(v));
export const verGet = id => tx('versions', 'readonly', s => s.get(id));
export const verDel = id => tx('versions', 'readwrite', s => s.delete(id));
export const verAll = () => tx('versions', 'readonly', s => s.getAll());
// Every version, one at a time (fn(v), synchronous: keep only what's needed of it). Never all at once: a version saved
// by an older Revela holds a whole presentation with its files inside — with a 400 MB deck, several of them read
// together (getAll) were gigabytes, and Chrome killed the tab («Aw, Snap!», error code 4) soon after opening.
export const verEach = fn => tx('versions', 'readonly', s => { const r = s.openCursor(); r.onsuccess = () => { const c = r.result; if (c) { fn(c.value); c.continue(); } }; return null; });
// The versions without their decks (newest first is up to the caller).
export async function verMeta() { const out = []; await verEach(({ deck, ...meta }) => out.push(meta)); return out; }
