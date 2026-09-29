// glTF 2.0 in and out, without a library: read a model (.glb, or .gltf with its
// data inside) into { json, bin } with a single buffer, read and add accessors,
// and write it back as one self-contained GLB (data URL). Used by the automatic
// skeleton, STL conversion and saving a model to a file.

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function toB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

// A model (data URL or address, .glb or .gltf with its data inside) → { json, bin } with a single buffer.
export async function readModel(src) {
  let bytes;
  if (src.startsWith('data:')) bytes = b64(src.slice(src.indexOf(',') + 1));
  else bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
  let json, bin = new Uint8Array(0);
  if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {       // "glTF"
    const dv = new DataView(bytes.buffer, bytes.byteOffset); let off = 12;
    while (off < bytes.length) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), chunk = bytes.subarray(off + 8, off + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004e4942) bin = chunk.slice();
      off += 8 + len;
    }
  } else json = JSON.parse(new TextDecoder().decode(bytes));
  const used = json.extensionsRequired || [];
  if (used.some(e => /draco|meshopt/i.test(e))) throw new Error('compressed');
  // Every buffer into one (the GLB's, then data: URIs), fixing the views' offsets.
  const parts = [], starts = []; let total = 0;
  (json.buffers || []).forEach((buf, i) => {
    const data = buf.uri ? (buf.uri.startsWith('data:') ? b64(buf.uri.slice(buf.uri.indexOf(',') + 1)) : null) : bin;
    if (!data) throw new Error('external');
    total = Math.ceil(total / 4) * 4; starts[i] = total; parts.push([total, data]); total += data.length;
  });
  const one = new Uint8Array(total); for (const [o, d] of parts) one.set(d, o);
  for (const v of json.bufferViews || []) { v.byteOffset = (v.byteOffset || 0) + starts[v.buffer || 0]; v.buffer = 0; }
  json.buffers = [{ byteLength: total }];
  return { json, bin: one };
}
export function writeGLB({ json, bin }) {
  json.buffers = [{ byteLength: bin.length }];
  const enc = new TextEncoder().encode(JSON.stringify(json)), jl = Math.ceil(enc.length / 4) * 4, bl = Math.ceil(bin.length / 4) * 4;
  const out = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4e4f534a, true); out.set(enc, 20); out.fill(0x20, 20 + enc.length, 20 + jl);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004e4942, true); out.set(bin, 28 + jl);
  return 'data:model/gltf-binary;base64,' + toB64(out);
}
export const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
export function readAccessor({ json, bin }, i) {
  const a = json.accessors[i], n = COMPS[a.type], out = new Float32Array(a.count * n);
  if (a.bufferView == null) return out;
  const v = json.bufferViews[a.bufferView], T = { 5126: [Float32Array, 4], 5125: [Uint32Array, 4], 5123: [Uint16Array, 2], 5122: [Int16Array, 2], 5121: [Uint8Array, 1], 5120: [Int8Array, 1] }[a.componentType];
  const size = T[1], stride = v.byteStride || n * size, base = v.byteOffset + (a.byteOffset || 0);
  const dv = new DataView(bin.buffer, bin.byteOffset);
  const get = { 4: a.componentType === 5126 ? o => dv.getFloat32(o, true) : o => dv.getUint32(o, true), 2: a.componentType === 5122 ? o => dv.getInt16(o, true) : o => dv.getUint16(o, true),
    1: a.componentType === 5120 ? o => dv.getInt8(o) : o => dv.getUint8(o) }[size];
  const norm = a.normalized ? { 5121: 255, 5120: 127, 5123: 65535, 5122: 32767 }[a.componentType] : 0;
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { const x = get(base + k * stride + c * size); out[k * n + c] = norm ? Math.max(x / norm, -1) : x; }
  return out;
}
// New data at the end of the buffer (aligned), as a view and an accessor.
export function addAccessor(g, typed, type, extra = {}) {
  const pad = (4 - g.bin.length % 4) % 4, off = g.bin.length + pad, bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  const nb = new Uint8Array(off + bytes.length); nb.set(g.bin); nb.set(bytes, off); g.bin = nb;
  g.json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: bytes.length });
  const ct = typed instanceof Float32Array ? 5126 : typed instanceof Uint16Array ? 5123 : 5121;
  g.json.accessors.push({ bufferView: g.json.bufferViews.length - 1, componentType: ct, count: typed.length / COMPS[type], type, ...extra });
  return g.json.accessors.length - 1;
}
