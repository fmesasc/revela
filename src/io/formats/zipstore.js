// A zip archive made of Blobs and read through Blob slices — never the whole of it in memory. Written with its files
// stored as they are (no compression: pictures, videos and 3D models are compressed already, and the presentation's
// text is small); read stored or deflated (a package re-zipped by another program). The Blob it makes is put
// together from the files' own Blobs — those of the browser's database are kept on disk —, so a package of
// gigabytes costs no more memory than its index. Without ZIP64: up to 4 GB and 65 535 files (more: an error that says
// so). Used by io/formats/package.js (.revela).

const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
// CRC-32 of some bytes, carried on from `crc` (start: 0).
export function crc32(bytes, crc = 0) {
  let c = ~crc >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
// A Blob's CRC-32, read a piece at a time.
export async function blobCrc(blob, piece = 8 << 20) {
  let crc = 0;
  for (let at = 0; at < blob.size; at += piece) crc = crc32(new Uint8Array(await blob.slice(at, at + piece).arrayBuffer()), crc);
  return crc;
}

const LIMIT = 0xffffffff;
const enc = new TextEncoder(), dec = new TextDecoder();
// (MS-DOS time and date: now — what each file's date says is of no use here.)
function dosNow() { const d = new Date(); return [(d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()]; }

// files: [{ name, blob }] in order → a Blob (application/zip, or `type`). onProgress(done, total): bytes checked.
export async function zipBlobs(files, { type = 'application/zip', onProgress } = {}) {
  if (files.length > 0xffff) throw new Error('zip: too many files');
  const total = files.reduce((n, f) => n + f.blob.size, 0); let done = 0;
  const parts = [], central = [], [time, date] = dosNow(); let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), size = f.blob.size, crc = await blobCrc(f.blob);
    done += size; onProgress?.(done, total);
    if (size > LIMIT || offset > LIMIT) throw new Error('zip: too big');
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(h.buffer, name, f.blob);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(c.buffer, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((n, p) => n + p.byteLength, 0);
  if (offset > LIMIT) throw new Error('zip: too big');
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, e.buffer], { type });
}

// A zip's files: Map name → { size, method, read: () → Blob (its bytes, as stored), text: () → Promise<string> }.
// src: a Blob or File (or anything with size and slice(a, b) → Blob). Throws if it isn't a zip.
export async function unzipIndex(src) {
  const tail = Math.min(src.size, 65557), end = new DataView(await src.slice(src.size - tail).arrayBuffer());
  let at = -1;
  for (let i = end.byteLength - 22; i >= 0; i--) if (end.getUint32(i, true) === 0x06054b50) { at = i; break; }
  if (at < 0) throw new Error('zip: not a zip');
  const count = end.getUint16(at + 10, true), cdSize = end.getUint32(at + 12, true), cdAt = end.getUint32(at + 16, true);
  const cd = new DataView(await src.slice(cdAt, cdAt + cdSize).arrayBuffer());
  const out = new Map();
  for (let p = 0, k = 0; k < count && p + 46 <= cd.byteLength; k++) {
    if (cd.getUint32(p, true) !== 0x02014b50) throw new Error('zip: broken index');
    const method = cd.getUint16(p + 10, true), csize = cd.getUint32(p + 20, true), size = cd.getUint32(p + 24, true);
    const n = cd.getUint16(p + 28, true), m = cd.getUint16(p + 30, true), c = cd.getUint16(p + 32, true), local = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, n));
    p += 46 + n + m + c;
    const data = async () => {
      const h = new DataView(await src.slice(local, local + 30).arrayBuffer());
      if (h.getUint32(0, true) !== 0x04034b50) throw new Error('zip: broken entry');
      const start = local + 30 + h.getUint16(26, true) + h.getUint16(28, true);
      return src.slice(start, start + csize);
    };
    // (Deflated — another program re-zipped it —: inflated by the browser, piece by piece.)
    const read = async (type = '') => {
      // (A piece of a file the desktop app reads a part at a time — ui/shell/desktop.js —: made a Blob first.)
      const got = await data(), raw = got instanceof Blob ? got : await got.blob();
      if (method === 0) return type ? raw.slice(0, raw.size, type) : raw;
      if (method === 8 && typeof DecompressionStream === 'function') return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob().then(b => (type ? b.slice(0, b.size, type) : b));
      throw new Error('zip: unsupported compression');
    };
    out.set(name, { size, method, read, text: async () => (await read()).text() });
  }
  return out;
}
