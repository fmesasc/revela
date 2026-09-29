// STL (the 3D printing format: just triangles, binary or text) → a glTF
// binary, so it shows like any other 3D model. STL is usually Z-up: it is
// turned to glTF's Y-up. One plain material, normals per face.

import { writeGLB } from './autorig.js';

export function parseSTL(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  const n = u8.length >= 84 ? dv.getUint32(80, true) : 0;
  const binary = u8.length >= 84 && 84 + n * 50 === u8.length;
  if (binary) {
    if (!n) throw new Error('empty');
    const out = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let k = 0; k < 9; k++) out[i * 9 + k] = dv.getFloat32(o + k * 4, true); }
    return out;
  }
  const pos = [], text = new TextDecoder().decode(u8), re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g; let m;
  while ((m = re.exec(text))) pos.push(+m[1], +m[2], +m[3]);
  if (pos.length < 9) throw new Error('empty');
  return Float32Array.from(pos.slice(0, pos.length - pos.length % 9));
}
export function stlToGLB(buf, color = [0.78, 0.8, 0.84]) {
  const raw = parseSTL(buf), count = raw.length / 3, pos = new Float32Array(raw.length), nor = new Float32Array(raw.length);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {                       // (x, y, z) Z-up → (x, z, -y) Y-up
    const x = raw[i * 3], y = raw[i * 3 + 1], z = raw[i * 3 + 2];
    pos[i * 3] = x; pos[i * 3 + 1] = z; pos[i * 3 + 2] = -y;
    for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], pos[i * 3 + c]); max[c] = Math.max(max[c], pos[i * 3 + c]); }
  }
  for (let t = 0; t < count; t += 3) {
    const a = pos.subarray(t * 3, t * 3 + 3), b = pos.subarray(t * 3 + 3, t * 3 + 6), c = pos.subarray(t * 3 + 6, t * 3 + 9);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...n) || 1;
    for (let k = 0; k < 3; k++) nor.set([n[0] / l, n[1] / l, n[2] / l], (t + k) * 3);
  }
  const bin = new Uint8Array(pos.byteLength + nor.byteLength);
  bin.set(new Uint8Array(pos.buffer)); bin.set(new Uint8Array(nor.buffer), pos.byteLength);
  const json = { asset: { version: '2.0', generator: 'Revela (STL)' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0.05, roughnessFactor: 0.7 } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength }, { buffer: 0, byteOffset: pos.byteLength, byteLength: nor.byteLength }],
    accessors: [{ bufferView: 0, componentType: 5126, count, type: 'VEC3', min, max }, { bufferView: 1, componentType: 5126, count, type: 'VEC3' }] };
  return writeGLB({ json, bin });
}
