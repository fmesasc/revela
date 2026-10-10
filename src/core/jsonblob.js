// A value as JSON in a Blob, written in pieces: never one string of the whole.
// Why: a presentation with hundreds of MB of pictures and videos (the same file repeated on many slides counts each
// time) made JSON.stringify build one text of 2 GB, past what V8 can hold — the tab died ("Aw, Snap!", error 4 or 5)
// some seconds after opening, when the autosave to Drive started. In pieces each string is copied on its own, the
// Blob keeps the bytes outside the page's memory, and the output is the same as JSON.stringify(value).

const PIECE = 1 << 22;                                   // (pieces of ~4 M characters)

export function jsonBlob(value, type = 'application/json') {
  const parts = []; let buf = '';
  const put = s => { buf += s; if (buf.length > PIECE) { parts.push(buf); buf = ''; } };
  const skip = v => v === undefined || typeof v === 'function' || typeof v === 'symbol';
  const walk = v => {
    if (v && typeof v.toJSON === 'function') v = v.toJSON();
    if (typeof v === 'string') {
      if (v.length > PIECE) { if (buf) { parts.push(buf); buf = ''; } parts.push(JSON.stringify(v)); }
      else put(JSON.stringify(v));
    } else if (!v || typeof v !== 'object') put(skip(v) ? 'null' : JSON.stringify(v));
    else if (Array.isArray(v)) { put('['); v.forEach((x, i) => { if (i) put(','); walk(x); }); put(']'); }
    else {
      put('{'); let first = true;
      for (const k of Object.keys(v)) {
        const x = v[k]; if (skip(x)) continue;
        put((first ? '' : ',') + JSON.stringify(k) + ':'); first = false; walk(x);
      }
      put('}');
    }
  };
  walk(value);
  if (buf) parts.push(buf);
  return new Blob(parts, { type });
}
