// The pictures, videos and sounds kept in the presentation (data: URLs — text) as blob: addresses of their bytes,
// for what's shown in this window: the editor (its slide and thumbnails) and presenting (buildHTML inApp).
// - Presenting: a presentation with 300 MB of media made one text of 400 MB and more, past the most a browser's
//   string may hold («Invalid string length»); now the page is a few KB.
// - The editor: every <img> with the data: URL itself made the browser keep its own copy of the text, for the slide
//   and every thumbnail — hundreds of MB more —; a blob: address is the bytes once, shared by all.
// One address per file, kept while the presentation uses it (pruneBlobs lets the rest go), so presenting after editing
// is instant. Exports keep everything inside (a blob: address works only here).
//
// Found by hand (indexOf), not with regular expressions: a file of several MB in a pattern overflows the regex
// engine's stack.

const MIN = 64 * 1024, SMALL = 2000;
const B64 = new Uint8Array(128); for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=') B64[c.charCodeAt(0)] = 1;
const cache = new Map();                                 // data: URL → blob: URL
const ok = () => typeof Blob !== 'undefined' && typeof URL.createObjectURL === 'function';

// One whole data: URL → its blob: address (the same one every time), or the data: URL as it is if it's small, not
// base64, or can't be read.
export function blobURL(d) {
  if (typeof d !== 'string' || d.length < MIN || !d.startsWith('data:') || !ok()) return d;
  let u = cache.get(d); if (u) return u;
  const i = d.indexOf(','), meta = d.slice(5, i);
  if (i < 0 || !meta.endsWith(';base64')) return d;
  try {
    const bin = atob(d.slice(i + 1)), bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    u = URL.createObjectURL(new Blob([bytes], { type: meta.split(';')[0] }));
  } catch { return d; }
  cache.set(d, u); return u;
}
// Every base64 data: URL of some size in a text (a background's url(…), a text's inline image…) → blob: addresses.
// seen: collects the data: URLs found (pruneBlobs).
export function withBlobs(s, seen = null) {
  if (typeof s !== 'string' || s.length < MIN || !s.includes('data:')) return s;
  if (s.startsWith('data:') && s.indexOf('data:', 5) < 0 && s.indexOf(')') < 0) { seen?.add(s); return seen ? s : blobURL(s); }
  let out = '', last = 0;
  for (let i = s.indexOf('data:'); i >= 0;) {
    const b = s.indexOf(';base64,', i); if (b < 0) break;
    const mime = s.slice(i + 5, b);
    if (mime.length > 120 || !/^[\w.+-]+\/[\w.+-]+(;[\w.+=-]+)*$/.test(mime)) { i = s.indexOf('data:', i + 5); continue; }
    let e = b + 8; while (e < s.length && s.charCodeAt(e) < 128 && B64[s.charCodeAt(e)]) e++;
    if (e - b > SMALL) {
      const d = s.slice(i, e);
      if (seen) seen.add(d);
      else { const u = d.length >= MIN ? blobURL(d) : d; if (u !== d) { out += s.slice(last, i) + u; last = e; } }
    }
    i = s.indexOf('data:', e);
  }
  return last ? out + s.slice(last) : s;
}

// A copy of the deck with its big inline files as blob: addresses (the deck itself isn't touched).
export function blobMedia(deck) {
  if (!ok()) return deck;
  const walk = v => {
    if (typeof v === 'string') return withBlobs(v);
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    // (An attached file — a PDF shown by pages — is recognised by its data: type, and stays as it is; the whole
    // picture kept for cropping again isn't shown.)
    if (v.type === 'file') return v;
    const o = {}; for (const key in v) o[key] = key === 'uncropped' ? undefined : walk(v[key]); return o;
  };
  return walk(deck);
}
// A big picture made small, for thumbnails: drawn full size in each of a hundred thumbnails, every big photo (and an
// animated GIF, every frame) is decoded at its own size — gigabytes of graphics memory for a deck with many photos,
// enough to crash the tab. A copy at most `max` px wide (a GIF: its first frame) is made once per file, off the main
// thread where the browser can, and shared. → its blob: address, or null while it's being made (onReady then).
const smalls = new Map();                                // data: URL → { url, wait: Promise }
const SMALL_FROM = 400 * 1024;                           // (smaller pictures cost little: as they are)
export const needsSmall = d => typeof d === 'string' && d.startsWith('data:image/') && !d.startsWith('data:image/svg')
  && (d.length >= SMALL_FROM || d.startsWith('data:image/gif')) && typeof createImageBitmap === 'function' && ok();
export function smallImage(d, onReady, max = 480) {
  let e = smalls.get(d);
  if (e?.url) return e.url;
  if (!e) {
    e = { url: null };
    e.wait = (async () => {
      const bmp = await createImageBitmap(await (await fetch(blobURL(d))).blob());
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
      c.getContext('2d').drawImage(bmp, 0, 0, w, h); bmp.close?.();
      const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/png' }) : await new Promise(r => c.toBlob(r, 'image/png'));
      return (e.url = URL.createObjectURL(blob));
    })().catch(() => (e.url = blobURL(d)));           // (can't be read here: the picture itself, as before)
    smalls.set(d, e);
  }
  if (onReady) e.wait.then(onReady);
  return null;
}

// The addresses of files the deck no longer has (deleted, replaced, another presentation): let go.
export function pruneBlobs(deck) {
  if (!cache.size) return;
  const seen = new Set();
  const walk = v => { if (typeof v === 'string') withBlobs(v, seen); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') for (const k in v) walk(v[k]); };
  walk(deck);
  for (const [d, u] of cache) if (!seen.has(d)) { URL.revokeObjectURL(u); cache.delete(d); }
  for (const [d, e] of smalls) if (!seen.has(d)) { e.wait.then(u => u !== d && !cache.has(d) && URL.revokeObjectURL(u)); smalls.delete(d); }
}
