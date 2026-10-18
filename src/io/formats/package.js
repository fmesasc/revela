// A presentation as one package (.revela): a zip (io/formats/zipstore.js) with
//   mimetype            «application/vnd.revela+zip» (first, as in ODF: what the file is, at a glance)
//   presentation.json   { format: 'revela-package', version: 1, files: { id: { path, type, size } }, deck }
//   files/<id>.<ext>    each big picture, video, sound or 3D model once, as it is (not as text: a third smaller)
// The deck refers to its files as «rvmedia:<id>», the id being the first half of the file's SHA-256 — as the
// browser's own store of them does (core/mediastore.js) —, so a package is put together from the files the browser
// already keeps on disk, and opening one stores them there again: a presentation of gigabytes never goes through
// memory as one text. A big presentation is downloaded as a package (project.js: past PACKAGE_MIN); a small one is
// still a .revela.json, as always. Both open on the web and in the desktop app.

import { dehydrate, mediaBlob, storeMedia, mediaId, usedRefs, MEDIA_REF } from '../../core/mediastore.js';
import { zipBlobs, unzipIndex } from './zipstore.js';

export const PACKAGE_TYPE = 'application/vnd.revela+zip';
export const PACKAGE_MIN = 50e6;                  // (bytes of the presentation as text: above, a package)
const MIN = 64 * 1024;
const isBig = v => typeof v === 'string' && v.length >= MIN && v.startsWith('data:') && v.indexOf(';base64,') > 0 && v.indexOf(';base64,') < 120;
const isId = id => /^[0-9a-f]{32}$/.test(id);
// (A file's extension from its type: «video/mp4» → mp4; «model/gltf-binary» → glb; anything odd → bin.)
const EXT = { 'model/gltf-binary': 'glb', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg', 'audio/mpeg': 'mp3', 'video/quicktime': 'mov', 'application/pdf': 'pdf' };
const extOf = type => EXT[type] || (/^[a-z]+\/([a-z0-9]{1,8})$/i.exec(type || '') || [, 'bin'])[1].toLowerCase();

const walk = async (v, fn) => {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) { const o = []; for (const x of v) o.push(await walk(x, fn)); return o; }
  if (!v || typeof v !== 'object') return v;
  const o = {}; for (const k in v) o[k] = await walk(v[k], fn); return o;
};
const blobOfURL = async d => { const at = d.indexOf(','), type = d.slice(5, at).split(';')[0]; return (await fetch(d)).blob().then(b => (b.type ? b : b.slice(0, b.size, type))); };

// The deck with its big files as references, and those files as Blobs: from the browser's store (each one read from
// disk when the package is written), or — no store: a private window — made here.
async function lighten(deck) {
  try {
    const light = await dehydrate(deck), blobs = new Map();
    for (const id of usedRefs(light, new Set())) blobs.set(id, () => mediaBlob(id));
    return { light, blobs };
  } catch {
    const blobs = new Map(), known = new Map();
    const light = await walk(deck, async v => {
      if (!isBig(v)) return v;
      let id = known.get(v);
      if (!id) { const b = await blobOfURL(v); id = await mediaId(await b.arrayBuffer()); known.set(v, id); blobs.set(id, () => b); }
      return MEDIA_REF + id;
    });
    return { light, blobs };
  }
}

// The package: a Blob. onProgress(done, total): bytes gone through (to say how far it is).
export async function packageBlob(deck, { onProgress } = {}) {
  const { light, blobs } = await lighten(deck), files = {}, entries = [];
  for (const [id, get] of blobs) {
    const b = await get(); if (!b) continue;
    const path = `files/${id}.${extOf(b.type)}`;
    files[id] = { path, type: b.type || '', size: b.size }; entries.push({ name: path, blob: b });
  }
  const doc = new Blob([JSON.stringify({ format: 'revela-package', version: 1, files, deck: light })], { type: 'application/json' });
  return zipBlobs([{ name: 'mimetype', blob: new Blob([PACKAGE_TYPE]) }, { name: 'presentation.json', blob: doc }, ...entries], { type: PACKAGE_TYPE, onProgress });
}

// Whether a file is a package: its name, else its first bytes (a zip whose first file is «mimetype»).
export async function isPackage(file) {
  if (/\.revela$/i.test(file?.name || '')) return true;
  try { const head = new Uint8Array(await file.slice(0, 38).arrayBuffer()); return head[0] === 0x50 && head[1] === 0x4b && new TextDecoder().decode(head.slice(30, 38)) === 'mimetype'; }
  catch { return false; }
}

// A package opened: → the deck, its files as data: URLs again (as the rest of the app has them). Each file is checked
// against its id — its own SHA-256 — before it is kept: a package can't put another file in place of one that other
// presentations in this browser share. One that doesn't match, or is missing, is left empty.
export async function readPackage(file, { onProgress } = {}) {
  const idx = await unzipIndex(file), main = idx.get('presentation.json');
  if (!main) throw new Error('package: no presentation.json');
  const doc = JSON.parse(await main.text());
  if (!doc || doc.format !== 'revela-package' || !doc.deck) throw new Error('package: not a Revela package');
  const mem = new Map(), list = Object.entries(doc.files || {}).filter(([id]) => isId(id));
  const total = list.reduce((n, [, f]) => n + (+f.size || 0), 0); let done = 0;
  for (const [id, f] of list) {
    const e = idx.get(String(f.path || '')); if (!e) continue;
    const blob = await e.read(String(f.type || ''));
    done += blob.size; onProgress?.(done, total);
    if (await mediaId(await blob.arrayBuffer()) !== id) continue;
    try { await storeMedia(id, blob); } catch { mem.set(id, blob); }
  }
  const read = b => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r.readAsDataURL(b); });
  const cache = new Map();
  return walk(doc.deck, async v => {
    if (typeof v !== 'string' || !v.startsWith(MEDIA_REF) || v.length > 80) return v;
    const id = v.slice(MEDIA_REF.length);
    if (!cache.has(id)) cache.set(id, (async () => { const b = mem.get(id) || await mediaBlob(id).catch(() => null); return b ? read(b) : ''; })());
    return cache.get(id);
  });
}
