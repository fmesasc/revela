// Models that need work before they can be read as plain data: meshes
// compressed with Draco or meshopt, quantized attributes (KHR_mesh_quantization),
// GPU textures (KTX2/Basis) and .gltf files with their data in other files.
// All of it is undone here, in the browser (the official decoders, from the CDN,
// only when a model needs them): the result is an ordinary glTF with one buffer,
// float attributes and its images inside, which any viewer plays.

import { DRACO, MESHOPT, loadScript } from '../../core/vendor.js';
import { b64, joinBuffers, readAccessor, ARRAYS, COMPS } from './gltf.js';

// (meshopt's: its first name, and Khronos' ratified one, the same data)
const DRACO_EXT = 'KHR_draco_mesh_compression', MESHOPT_EXTS = ['EXT_meshopt_compression', 'KHR_meshopt_compression'], QUANT = 'KHR_mesh_quantization', BASISU = 'KHR_texture_basisu';
const DONE = [DRACO_EXT, ...MESHOPT_EXTS, QUANT, BASISU];
const meshoptOf = x => MESHOPT_EXTS.map(k => x.extensions?.[k]).find(Boolean);

// ---- The decoders, loaded once ---------------------------------------------------------------
let meshopt = null, draco = null;
const meshoptDecoder = () => (meshopt ||= import(MESHOPT).then(async m => { await m.MeshoptDecoder.ready; return m.MeshoptDecoder; })
  .catch(() => { meshopt = null; throw new Error('decoder'); }));
// (wrapped: the module is a thenable, and resolving a promise with it never ends)
const dracoDecoder = () => (draco ||= Promise.all([loadScript(DRACO + 'draco_wasm_wrapper_gltf.js', 'DracoDecoderModule'),
  fetch(DRACO + 'draco_decoder_gltf.wasm').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })])
  .then(([make, wasmBinary]) => new Promise(res => make({ wasmBinary, onModuleLoaded: D => res({ D }) })))
  .catch(() => { draco = null; throw new Error('decoder'); }));

// ---- Bytes of a buffer or image: inside (data: URI) or next to the model ---------------------
async function bytesOf(uri, base) {
  if (uri.startsWith('data:')) {
    const i = uri.indexOf(','), head = uri.slice(0, i);
    return /;base64$/i.test(head) ? b64(uri.slice(i + 1)) : new TextEncoder().encode(decodeURIComponent(uri.slice(i + 1)));
  }
  let url; try { url = new URL(uri, base); } catch { throw new Error('external'); }       // (a model from a file: nowhere to look)
  if (!/^(https?|blob):$/.test(url.protocol)) throw new Error('external');
  const r = await fetch(url).catch(() => null);
  if (!r?.ok) throw new Error('external');
  return new Uint8Array(await r.arrayBuffer());
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ktx2: 'image/ktx2' };

// New data at the end of the buffer, many pieces at once (one copy, not one per piece).
function appender(g) {
  const parts = []; let end = g.bin.length;
  return {
    view(bytes) {
      end = Math.ceil(end / 4) * 4; parts.push([end, bytes]);
      g.json.bufferViews.push({ buffer: 0, byteOffset: end, byteLength: bytes.length }); end += bytes.length;
      return g.json.bufferViews.length - 1;
    },
    accessor(typed, type, extra = {}) {
      const ct = { Float32Array: 5126, Uint32Array: 5125, Uint16Array: 5123, Int16Array: 5122, Uint8Array: 5121, Int8Array: 5120 }[typed.constructor.name];
      const bufferView = this.view(new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength));
      (g.json.accessors ||= []).push({ bufferView, componentType: ct, count: typed.length / COMPS[type], type, ...extra });
      return g.json.accessors.length - 1;
    },
    done() {
      if (!parts.length) return;
      const out = new Uint8Array(end); out.set(g.bin); for (const [o, b] of parts) out.set(b, o);
      g.bin = out; g.json.buffers = [{ byteLength: end }];
    },
  };
}
const bounds = (a, n) => {
  const min = Array(n).fill(Infinity), max = Array(n).fill(-Infinity);
  for (let k = 0; k < a.length; k++) { const c = k % n; if (a[k] < min[c]) min[c] = a[k]; if (a[k] > max[c]) max[c] = a[k]; }
  return a.length ? { min, max } : {};
};
// An accessor no longer used (its data replaced): without data, so the buffer can drop it.
const emptied = a => { delete a.bufferView; delete a.byteOffset; delete a.min; delete a.max; delete a.sparse; };
const prims = json => (json.meshes || []).flatMap(m => m.primitives || []);

// ---- Draco: each compressed primitive decoded into its own accessors ---------------------------
function decodeDraco(D, bytes, wanted) {
  const dec = new D.Decoder(), kind = dec.GetEncodedGeometryType(bytes), mesh = kind === D.TRIANGULAR_MESH;
  const geo = mesh ? new D.Mesh() : new D.PointCloud();
  try {
    const st = mesh ? dec.DecodeArrayToMesh(bytes, bytes.byteLength, geo) : dec.DecodeArrayToPointCloud(bytes, bytes.byteLength, geo);
    if (!st.ok() || !geo.ptr) throw new Error('unpack');
    const n = geo.num_points(), out = { attributes: {} };
    const DT = { Float32Array: D.DT_FLOAT32, Uint32Array: D.DT_UINT32, Uint16Array: D.DT_UINT16, Int16Array: D.DT_INT16, Uint8Array: D.DT_UINT8, Int8Array: D.DT_INT8 };
    for (const [name, [id, T]] of Object.entries(wanted)) {
      const att = dec.GetAttributeByUniqueId(geo, id); if (!att?.ptr) throw new Error('unpack');
      const len = n * att.num_components(), size = len * T.BYTES_PER_ELEMENT, ptr = D._malloc(size);
      dec.GetAttributeDataArrayForAllPoints(geo, att, DT[T.name], size, ptr);
      out.attributes[name] = new T(D.HEAPF32.buffer, ptr, len).slice(); D._free(ptr);
    }
    if (mesh) {
      const len = geo.num_faces() * 3, ptr = D._malloc(len * 4);
      dec.GetTrianglesUInt32Array(geo, len * 4, ptr);
      const idx = new Uint32Array(D.HEAPF32.buffer, ptr, len).slice(); D._free(ptr);
      out.indices = n <= 65536 ? Uint16Array.from(idx) : idx;
    }
    return out;
  } finally { D.destroy(geo); D.destroy(dec); }
}
async function undraco(g) {
  const { json } = g, todo = prims(json).filter(p => p.extensions?.[DRACO_EXT]);
  if (!todo.length) return;
  const { D } = await dracoDecoder(), add = appender(g), seen = new Map(), old = new Set();
  for (const p of todo) {
    const ext = p.extensions[DRACO_EXT], key = ext.bufferView + JSON.stringify(ext.attributes) + p.indices;
    if (!seen.has(key)) {
      const v = json.bufferViews[ext.bufferView], wanted = {};
      for (const [name, id] of Object.entries(ext.attributes)) if (p.attributes[name] != null) wanted[name] = [id, ARRAYS[json.accessors[p.attributes[name]].componentType]];
      let r; try { r = decodeDraco(D, g.bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength), wanted); } catch { throw new Error('unpack'); }
      const made = { attributes: {} };
      for (const [name, data] of Object.entries(r.attributes)) {
        const a = json.accessors[p.attributes[name]];
        made.attributes[name] = add.accessor(data, a.type, { ...(a.normalized ? { normalized: true } : {}), ...(name === 'POSITION' ? bounds(data, 3) : {}) });
      }
      if (r.indices && p.indices != null) made.indices = add.accessor(r.indices, 'SCALAR');
      seen.set(key, made);
    }
    const made = seen.get(key);
    for (const [name, i] of Object.entries(made.attributes)) { old.add(p.attributes[name]); p.attributes[name] = i; }
    if (made.indices != null) { old.add(p.indices); p.indices = made.indices; }
    delete p.extensions[DRACO_EXT]; if (!Object.keys(p.extensions).length) delete p.extensions;
  }
  add.done();
  for (const i of old) emptied(json.accessors[i]);
}

// ---- Quantized attributes back to floats (as glTF without the extension wants them) -----------
// Positions, normals and tangents (and morph targets) must be floats; texture
// coordinates, colours and weights may be unsigned and normalized.
function dequantize(g) {
  const { json } = g, add = appender(g), done = new Map(), old = new Set();
  const ok = (name, a, target) => a.componentType === 5126 || (!target && /^(TEXCOORD|COLOR|WEIGHTS)_/.test(name) && a.normalized && [5121, 5123].includes(a.componentType))
    || (!target && /^JOINTS_/.test(name)) || a.bufferView == null;
  const fix = (attrs, target) => {
    for (const [name, i] of Object.entries(attrs)) {
      const a = json.accessors[i]; if (ok(name, a, target)) continue;
      if (!done.has(i)) {
        const data = readAccessor(g, i);
        done.set(i, add.accessor(data, a.type, name === 'POSITION' || target ? bounds(data, COMPS[a.type]) : {}));
      }
      old.add(i); attrs[name] = done.get(i);
    }
  };
  for (const p of prims(json)) { fix(p.attributes, false); for (const t of p.targets || []) fix(t, true); }
  add.done();
  // (the old ones only if nothing else uses them)
  const used = new Set(prims(json).flatMap(p => [...Object.values(p.attributes), ...(p.targets || []).flatMap(Object.values), p.indices]));
  for (const s of json.skins || []) used.add(s.inverseBindMatrices);
  for (const an of json.animations || []) for (const s of an.samplers) { used.add(s.input); used.add(s.output); }
  for (const i of old) if (!used.has(i)) emptied(json.accessors[i]);
}

// ---- Textures that can't be read here (KTX2/Basis, or an image not found) ------------------------
// Textures out, with every reference to them in the materials ({ index } under "…Texture", in extensions too).
function dropTextures(json, gone) {
  if (!gone.size) return;
  const map = []; let n = 0;
  json.textures.forEach((_, i) => { if (!gone.has(i)) map[i] = n++; });
  const walk = o => {
    for (const [k, v] of Object.entries(o)) {
      if (!v || typeof v !== 'object') continue;
      if (/Texture$/.test(k) && Number.isInteger(v.index)) { if (gone.has(v.index)) delete o[k]; else v.index = map[v.index]; } else walk(v);
    }
  };
  for (const m of json.materials || []) walk(m);
  json.textures = json.textures.filter((_, i) => !gone.has(i));
}
// A texture's pictures: its own and its extensions' (EXT_texture_webp…).
const sources = tx => [tx, ...Object.values(tx.extensions || {})].filter(x => x?.source != null);
// Images no texture uses, out.
function pruneImages(json) {
  const used = new Set(), map = []; let n = 0;
  for (const tx of json.textures || []) for (const x of sources(tx)) used.add(x.source);
  (json.images || []).forEach((_, i) => { if (used.has(i)) map[i] = n++; });
  for (const tx of json.textures || []) for (const x of sources(tx)) x.source = map[x.source];
  if (json.images) json.images = json.images.filter((_, i) => used.has(i));
}
// Pictures that can't be shown: GPU-compressed ones (their fallback, if they have one, stays)
// and those not found (lost: image indices). The textures left without any, out.
function dropPictures(json, lost, notes) {
  const gone = new Set();
  (json.textures || []).forEach((tx, i) => {
    if (tx.extensions?.[BASISU]) { delete tx.extensions[BASISU]; if (tx.source == null && !notes.includes('basisu')) notes.push('basisu'); }
    for (const x of sources(tx)) if (lost.has(x.source)) delete x.source;
    if (tx.extensions && !Object.keys(tx.extensions).length) delete tx.extensions;
    if (!sources(tx).length) gone.add(i);
  });
  if (lost.size) notes.push('images');
  dropTextures(json, gone); pruneImages(json);
}

// ---- Only what is used stays in the buffer ---------------------------------------------------------
function compact(g) {
  const { json } = g, used = new Set();
  for (const a of json.accessors || []) {
    if (a.bufferView != null) used.add(a.bufferView);
    if (a.sparse) { used.add(a.sparse.indices.bufferView); used.add(a.sparse.values.bufferView); }
  }
  for (const im of json.images || []) if (im.bufferView != null) used.add(im.bufferView);
  const views = [], map = [], parts = []; let end = 0;
  (json.bufferViews || []).forEach((v, i) => {
    if (!used.has(i)) return;
    end = Math.ceil(end / 4) * 4; parts.push([end, g.bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)]);
    map[i] = views.length; views.push({ ...v, buffer: 0, byteOffset: end }); end += v.byteLength;
  });
  const bin = new Uint8Array(end); for (const [o, b] of parts) bin.set(b, o);
  for (const a of json.accessors || []) {
    if (a.bufferView != null) a.bufferView = map[a.bufferView];
    if (a.sparse) { a.sparse.indices.bufferView = map[a.sparse.indices.bufferView]; a.sparse.values.bufferView = map[a.sparse.values.bufferView]; }
  }
  for (const im of json.images || []) if (im.bufferView != null) im.bufferView = map[im.bufferView];
  json.bufferViews = views; json.buffers = [{ byteLength: end }]; g.bin = bin;
}

// ---- All of it ----------------------------------------------------------------------------------
// json and the GLB's binary chunk (if any) → { json, bin, notes } like readModel's.
export async function unpack(json, glbBin, src, onStep = () => {}) {
  const notes = [], base = typeof location !== 'undefined' ? new URL(src, location.href).href : src;
  const used = json.extensionsUsed || [];
  const isFallback = b => meshoptOf(b)?.fallback;
  if ([...(json.buffers || []), ...(json.images || [])].some(x => x.uri && !x.uri.startsWith('data:'))) onStep('fetch');
  // 1. The buffers' bytes: the GLB's, data: URIs, files next to the model (a fallback has none: it is decoded).
  const datas = await Promise.all((json.buffers || []).map(b => (b.uri != null ? bytesOf(b.uri, base).catch(e => { if (isFallback(b)) return null; throw e; })
    : isFallback(b) ? null : glbBin)));
  if (used.some(e => e === DRACO_EXT || MESHOPT_EXTS.includes(e))) onStep('decode');
  // 2. meshopt: each compressed view decoded into a buffer of its own.
  const mo = (json.bufferViews || []).filter(meshoptOf);
  if (mo.length) {
    const M = await meshoptDecoder();
    for (const v of mo) {
      const e = meshoptOf(v), src8 = datas[e.buffer]; if (!src8) throw new Error('unpack');
      const out = new Uint8Array(e.count * e.byteStride);
      try { M.decodeGltfBuffer(out, e.count, e.byteStride, src8.subarray(e.byteOffset || 0, (e.byteOffset || 0) + e.byteLength), e.mode, e.filter || 'NONE'); }
      catch { throw new Error('unpack'); }
      datas.push(out); Object.assign(v, { buffer: datas.length - 1, byteOffset: 0, byteLength: out.length });
      for (const k of MESHOPT_EXTS) delete v.extensions[k];
      if (!Object.keys(v.extensions).length) delete v.extensions;
    }
  }
  // (a buffer still missing is one nothing can read)
  const refs = new Set((json.bufferViews || []).map(v => v.buffer || 0));
  datas.forEach((d, i) => { if (!d) { if (refs.has(i)) throw new Error('external'); datas[i] = new Uint8Array(0); } });
  const g = { json, bin: joinBuffers(json, datas), notes };
  json.bufferViews ||= [];
  // 3. Draco, then quantized attributes.
  await undraco(g);
  dequantize(g);
  // 4. Images: those in other files (or data: URIs) into the buffer; GPU ones (KTX2) and those not found, out.
  const typeOf = im => im.mimeType || MIME[(im.uri.match(/^data:image\/(\w+)|\.(\w+)(?:[?#]|$)/i) || []).slice(1).find(Boolean)?.toLowerCase()] || 'image/png';
  const got = new Map(), lost = new Set();
  await Promise.all((json.images || []).map(async (im, i) => {
    if (im.uri == null || typeOf(im) === 'image/ktx2') return;
    const bytes = await bytesOf(im.uri, base).catch(() => null);
    if (bytes) got.set(im, bytes); else lost.add(i);
  }));
  dropPictures(json, lost, notes);
  const add = appender(g);
  for (const im of json.images || []) if (got.has(im)) { im.mimeType = typeOf(im); im.bufferView = add.view(got.get(im)); delete im.uri; }
  add.done();
  // 5. The extensions undone, out; only the data used, in.
  for (const k of ['extensionsUsed', 'extensionsRequired']) {
    if (json[k]) json[k] = json[k].filter(e => !DONE.includes(e));
    if (!json[k]?.length) delete json[k];
  }
  for (const k of ['textures', 'images']) if (json[k] && !json[k].length) delete json[k];
  compact(g);
  return g;
}
