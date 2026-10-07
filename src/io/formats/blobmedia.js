// Presenting inside the app (and its previews: buildHTML inApp): the pictures, videos and sounds kept in the
// presentation (data: URLs — text) go to the page as blob: addresses of their bytes. A presentation with 300 MB of
// media made one text of 400 MB and more, past the most a browser's string may hold («Invalid string length» when
// presenting), and copied it several times over; now the page is a few KB, and each file is in memory once, as bytes.
// Only for pages shown in this window (a blob: address works only here): exports keep everything inside.
//
// Found by hand (indexOf), not with regular expressions: a file of several MB in a pattern overflows the regex
// engine's stack. The addresses are kept for the next time (presenting again is instant) while the presentation
// still uses them; the rest are let go.

const MIN = 64 * 1024, SMALL = 2000;
const B64 = new Uint8Array(128); for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=') B64[c.charCodeAt(0)] = 1;
let cache = new Map();                                   // data: URL → blob: URL

function blobOf(data, mime) {
  const bin = atob(data.slice(data.indexOf(',') + 1)), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime.split(';')[0] }));
}
// Every base64 data: URL of some size in a text (a picture's src, a background's url(…), a text's inline image…).
function swap(s, used) {
  let out = '', last = 0;
  for (let i = s.indexOf('data:'); i >= 0;) {
    const b = s.indexOf(';base64,', i); if (b < 0) break;
    const mime = s.slice(i + 5, b);
    if (mime.length > 120 || !/^[\w.+-]+\/[\w.+-]+(;[\w.+=-]+)*$/.test(mime)) { i = s.indexOf('data:', i + 5); continue; }
    let e = b + 8; while (e < s.length && s.charCodeAt(e) < 128 && B64[s.charCodeAt(e)]) e++;
    if (e - b > SMALL) {
      const d = s.slice(i, e);
      let u = used.get(d) || cache.get(d);
      if (!u) { try { u = blobOf(d, mime); } catch { u = null; } }
      if (u) { used.set(d, u); out += s.slice(last, i) + u; last = e; }
    }
    i = s.indexOf('data:', e);
  }
  return last ? out + s.slice(last) : s;
}

// A copy of the deck with its big inline files as blob: addresses (the deck itself isn't touched).
export function blobMedia(deck) {
  if (typeof Blob === 'undefined' || !URL.createObjectURL) return deck;
  const used = new Map();
  const walk = (v, k) => {
    if (typeof v === 'string') return v.length >= MIN && v.includes('data:') ? swap(v, used) : v;
    if (Array.isArray(v)) return v.map(x => walk(x));
    if (!v || typeof v !== 'object') return v;
    // (An attached file — a PDF shown by pages — is recognised by its data: type, and stays as it is; the whole
    // picture kept for cropping again isn't shown.)
    if (v.type === 'file') return v;
    const o = {}; for (const key in v) o[key] = key === 'uncropped' ? undefined : walk(v[key], key); return o;
  };
  const out = walk(deck);
  for (const [d, u] of cache) if (!used.has(d)) URL.revokeObjectURL(u);
  cache = used;
  return out;
}
