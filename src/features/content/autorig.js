// Automatic skeleton ("rig") for a 3D model that has none, so it can walk:
// like Mixamo, simplified. From the model's shape it proposes where the joints
// go — a person (two legs) or an animal (four legs) — the user adjusts them,
// and the mesh is bound to the bones (each vertex to the nearest ones) and
// given animations made here: rest, walk, run, wave, jump, cheer…
// The result is an ordinary glTF with a skin and animations (all in one GLB).
//
// Conventions: the character faces +Z (glTF's front), +Y is up, its left is +X.
// Joints are points in the model's space; bones go from a joint to its child.

// ---- glTF in and out -----------------------------------------------------------------
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
const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function readAccessor({ json, bin }, i) {
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
function addAccessor(g, typed, type, extra = {}) {
  const pad = (4 - g.bin.length % 4) % 4, off = g.bin.length + pad, bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  const nb = new Uint8Array(off + bytes.length); nb.set(g.bin); nb.set(bytes, off); g.bin = nb;
  g.json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: bytes.length });
  const ct = typed instanceof Float32Array ? 5126 : typed instanceof Uint16Array ? 5123 : 5121;
  g.json.accessors.push({ bufferView: g.json.bufferViews.length - 1, componentType: ct, count: typed.length / COMPS[type], type, ...extra });
  return g.json.accessors.length - 1;
}

// ---- Small maths --------------------------------------------------------------------------
const M4 = {
  id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
    const [x, y, z, w] = q, xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    return [(1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0, 2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0,
      2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
  },
  point: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]],
  dir: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]],
};
const Q = {
  axis(ax, deg) { const h = deg * Math.PI / 360, s = Math.sin(h); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(h)]; },
  mul: (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  inv: q => [-q[0], -q[1], -q[2], q[3]],
  // The turn taking direction u to direction v.
  between(u, v) {
    const nu = norm(u), nv = norm(v), d = nu[0] * nv[0] + nu[1] * nv[1] + nu[2] * nv[2];
    if (d < -0.9999) { const ax = Math.abs(nu[0]) < 0.9 ? cross(nu, [1, 0, 0]) : cross(nu, [0, 1, 0]); return [...norm(ax), 0]; }
    const c = cross(nu, nv), q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(...q); return q.map(x => x / l);
  },
  rotate(q, v) { const p = Q.mul(Q.mul(q, [v[0], v[1], v[2], 0]), Q.inv(q)); return [p[0], p[1], p[2]]; },
};
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---- The model's shape, flattened (every mesh in model space, facing +Z) ---------------------
// yaw: degrees to turn it first, when it doesn't face the front.
export function modelShape(g, yaw = 0) {
  const { json } = g, scene = json.scenes?.[json.scene || 0] || { nodes: (json.nodes || []).map((_, i) => i) };
  const turn = M4.trs([0, 0, 0], Q.axis(Y, yaw)), prims = [];
  const walk = (i, parent) => {
    const n = json.nodes[i], m = M4.mul(parent, n.matrix || M4.trs(n.translation, n.rotation, n.scale));
    if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) if (p.attributes.POSITION != null) prims.push({ node: i, prim: p, world: m });
    for (const c of n.children || []) walk(c, m);
  };
  for (const i of scene.nodes) walk(i, turn);
  const parts = prims.map(({ prim, world }) => {
    const P = readAccessor(g, prim.attributes.POSITION), count = P.length / 3, pos = new Float32Array(P.length);
    for (let k = 0; k < count; k++) { const w = M4.point(world, [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]); pos.set(w, k * 3); }
    let nor = null;
    if (prim.attributes.NORMAL != null) {
      const N = readAccessor(g, prim.attributes.NORMAL); nor = new Float32Array(N.length);
      for (let k = 0; k < count; k++) nor.set(norm(M4.dir(world, [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]])), k * 3);
    }
    const idx = prim.indices != null ? readAccessor(g, prim.indices) : Float32Array.from({ length: count }, (_, k) => k);
    return { prim, pos, nor, idx: (prim.mode ?? 4) === 4 ? idx : null };
  });
  const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const { pos } of parts) for (let k = 0; k < pos.length; k += 3) for (let c = 0; c < 3; c++) { box.min[c] = Math.min(box.min[c], pos[k + c]); box.max[c] = Math.max(box.max[c], pos[k + c]); }
  if (!parts.length || !isFinite(box.min[0])) throw new Error('empty');
  return { parts, box, yaw };
}

// ---- Skeletons -------------------------------------------------------------------------------
// [name, parent, label]; the end of each bone is its first child, or a tip.
export const SKELETONS = {
  person: [['hips', null], ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'],
    ['armL', 'chest'], ['forearmL', 'armL'], ['handL', 'forearmL'], ['armR', 'chest'], ['forearmR', 'armR'], ['handR', 'forearmR'],
    ['thighL', 'hips'], ['shinL', 'thighL'], ['footL', 'shinL'], ['thighR', 'hips'], ['shinR', 'thighR'], ['footR', 'shinR']],
  animal: [['hips', null], ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'], ['tail', 'hips'],
    ['legFL', 'chest'], ['kneeFL', 'legFL'], ['pawFL', 'kneeFL'], ['legFR', 'chest'], ['kneeFR', 'legFR'], ['pawFR', 'kneeFR'],
    ['legBL', 'hips'], ['kneeBL', 'legBL'], ['pawBL', 'kneeBL'], ['legBR', 'hips'], ['kneeBR', 'legBR'], ['pawBR', 'kneeBR']],
};
export const JOINT_LABELS = { hips: 'Cadera', spine: 'Espalda', chest: 'Pecho', neck: 'Cuello', head: 'Cabeza', tail: 'Cola',
  armL: 'Hombro izq.', forearmL: 'Codo izq.', handL: 'Mano izq.', armR: 'Hombro der.', forearmR: 'Codo der.', handR: 'Mano der.',
  thighL: 'Cadera izq.', shinL: 'Rodilla izq.', footL: 'Tobillo izq.', thighR: 'Cadera der.', shinR: 'Rodilla der.', footR: 'Tobillo der.',
  legFL: 'Pata del. izq.', kneeFL: 'Rodilla del. izq.', pawFL: 'Pie del. izq.', legFR: 'Pata del. der.', kneeFR: 'Rodilla del. der.', pawFR: 'Pie del. der.',
  legBL: 'Pata tras. izq.', kneeBL: 'Rodilla tras. izq.', pawBL: 'Pie tras. izq.', legBR: 'Pata tras. der.', kneeBR: 'Rodilla tras. der.', pawBR: 'Pie tras. der.' };
// The mirror of a joint (to move both sides together).
export const mirrorOf = n => (/[LR]$/.test(n) ? n.slice(0, -1) + (n.endsWith('L') ? 'R' : 'L') : null);

// Vertices near a plane slice of the model (for the proposal): their x range and centre.
function slab(shape, axis, lo, hi) {
  let n = 0, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], sum = [0, 0, 0];
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += 3) {
    const v = pos[k + axis]; if (v < lo || v > hi) continue;
    n++; for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], pos[k + c]); mx[c] = Math.max(mx[c], pos[k + c]); sum[c] += pos[k + c]; }
  }
  return n ? { n, min: mn, max: mx, mid: sum.map(s => s / n) } : null;
}
// Centre of the vertices on one side (x > cx or < cx) within a height band.
function sideCentre(shape, lo, hi, side, cx) {
  let n = 0, s = [0, 0, 0], ext = side > 0 ? -Infinity : Infinity;
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += 3) {
    const y = pos[k + 1], x = pos[k]; if (y < lo || y > hi || (x - cx) * side <= 0) continue;
    n++; s[0] += x; s[1] += y; s[2] += pos[k + 2]; ext = side > 0 ? Math.max(ext, x) : Math.min(ext, x);
  }
  return n ? { c: s.map(v => v / n), ext } : null;
}

// The model cut in horizontal slices: at each height, the pieces across it
// (x from–to, and their middle depth) — where legs part, arms leave the body…
// axis: the one cut across (1: heights; 2: along an animal's length); across: the one measured in each slice.
export function profile(shape, n = 64, axis = 1, across = 0) {
  const { min, max } = shape.box, H = max[axis] - min[axis], levels = Array.from({ length: n }, (_, i) => min[axis] + H * (i + 0.5) / n), segs = levels.map(() => []);
  const depth = 3 - axis - across;                              // the third axis: the pieces' middle on it
  for (const { pos, idx } of shape.parts) {
    if (!idx) continue;
    for (let t = 0; t < idx.length; t += 3) {
      const v = [idx[t], idx[t + 1], idx[t + 2]].map(k => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]);
      const lo = Math.min(v[0][axis], v[1][axis], v[2][axis]), hi = Math.max(v[0][axis], v[1][axis], v[2][axis]);
      const i0 = Math.max(0, Math.ceil((lo - min[axis]) / H * n - 0.5)), i1 = Math.min(n - 1, Math.floor((hi - min[axis]) / H * n - 0.5));
      for (let i = i0; i <= i1; i++) {
        const y = levels[i], pts = [];
        for (const [a, b] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) {
          if ((a[axis] - y) * (b[axis] - y) > 0 || a[axis] === b[axis]) continue;
          const k = (y - a[axis]) / (b[axis] - a[axis]); pts.push([a[across] + (b[across] - a[across]) * k, a[depth] + (b[depth] - a[depth]) * k]);
        }
        if (pts.length >= 2) segs[i].push([Math.min(pts[0][0], pts[1][0]), Math.max(pts[0][0], pts[1][0]), (pts[0][1] + pts[1][1]) / 2]);
      }
    }
  }
  const gap = (max[across] - min[across]) * 0.015;
  return levels.map((y, i) => {
    const list = segs[i].sort((a, b) => a[0] - b[0]), out = [];
    for (const [a, b, z] of list) { const last = out.at(-1); if (last && a <= last[1] + gap) { last[1] = Math.max(last[1], b); last[2].push(z); } else out.push([a, b, [z]]); }
    return { y, pieces: out.map(([a, b, zs]) => ({ a, b, mid: (a + b) / 2, z: zs.reduce((s, z) => s + z, 0) / zs.length, w: b - a })) };
  });
}

// Where the joints probably are (the user then adjusts them).
export function proposeJoints(shape, kind = 'person') {
  const { min, max } = shape.box, H = max[1] - min[1], W = max[0] - min[0], D = max[2] - min[2];
  const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, y = f => min[1] + H * f, J = {};
  if (kind === 'person') {
    const prof = profile(shape), found = personFromProfile(prof, shape);
    if (found) return found;
    const torso = slab(shape, 1, y(0.5), y(0.62)) || { min, max, mid: [cx, 0, cz] };
    const zc = torso.mid[2], tw = Math.min(torso.max[0] - torso.min[0], W);
    J.hips = [cx, y(0.52), zc]; J.spine = [cx, y(0.62), zc]; J.chest = [cx, y(0.72), zc]; J.neck = [cx, y(0.84), zc]; J.head = [cx, y(0.9), zc];
    // Arms: stretched out (a T), or hanging down by the body.
    const band = slab(shape, 1, y(0.74), y(0.82)), span = band ? band.max[0] - band.min[0] : 0, shoulderW = Math.min(W * 0.5, H * 0.24) / 2;
    for (const [s, side] of [['L', 1], ['R', -1]]) {
      const sh = [cx + side * shoulderW, y(0.8), zc];
      let hand, elbow;
      if (span > H * 0.6) {                                    // T pose
        const tip = side > 0 ? band.max[0] : band.min[0]; hand = [tip - side * (tip - sh[0]) * 0.12, y(0.79), zc]; elbow = lerp(sh, hand, 0.5);
      } else {
        const low = sideCentre(shape, y(0.42), y(0.5), side, cx);
        hand = [low ? cx + side * Math.max(Math.abs(low.ext - cx) - W * 0.04, shoulderW * 1.1) : sh[0] + side * W * 0.1, y(0.46), zc]; elbow = [lerp(sh, hand, 0.5)[0], y(0.63), zc];
      }
      J['arm' + s] = sh; J['forearm' + s] = elbow; J['hand' + s] = hand;
      const leg = sideCentre(shape, y(0.05), y(0.35), side, cx), lx = leg ? leg.c[0] : cx + side * W * 0.12, lz = leg ? leg.c[2] : zc;
      J['thigh' + s] = [lx, y(0.5), zc]; J['shin' + s] = [lx, y(0.27), lz]; J['foot' + s] = [lx, y(0.05), lz];
    }
  } else {                                                    // animal: along Z, head at +Z
    const found = animalFromProfile(profile(shape, 64, 2, 1), shape); if (found) return found;
    const z = f => min[2] + D * f, body = slab(shape, 2, z(0.3), z(0.7)) || { min, max, mid: [cx, y(0.6), cz] };
    const top = body.max[1], belly = body.min[1], by = (top + belly) / 2, lw = Math.max((body.max[0] - body.min[0]) * 0.3, W * 0.12);
    J.hips = [cx, by, z(0.25)]; J.spine = [cx, by, z(0.5)]; J.chest = [cx, by, z(0.72)]; J.neck = [cx, by + (top - by) * 0.8, z(0.85)];
    J.head = [cx, Math.min(max[1] - H * 0.1, top + H * 0.08), z(0.93)]; J.tail = [cx, by + (top - by) * 0.5, z(0.05)];
    for (const [s, zf, side] of [['FL', 0.75, 1], ['FR', 0.75, -1], ['BL', 0.22, 1], ['BR', 0.22, -1]]) {
      const x = cx + side * lw;
      J['leg' + s] = [x, by, z(zf)]; J['knee' + s] = [x, min[1] + (belly - min[1]) * 0.5, z(zf)]; J['paw' + s] = [x, min[1] + H * 0.03, z(zf)];
    }
  }
  return J;
}

// A person from its slices: legs are where it splits in two at the bottom,
// arms where pieces stand apart from the body (or reach far out, in a T),
// the neck is the narrowest point between the shoulders and the head.
function personFromProfile(prof, shape) {
  const { min, max } = shape.box, H = max[1] - min[1], n = prof.length, cx = (min[0] + max[0]) / 2;
  const at = f => prof[Math.max(0, Math.min(n - 1, Math.round(f * n - 0.5)))];
  const body = L => L.pieces.reduce((best, p) => (!best || Math.abs(p.mid - cx) < Math.abs(best.mid - cx) ? p : best), null);
  // Legs: from the feet up, while there are two pieces either side of the middle.
  let crotch = -1;
  for (let i = Math.round(n * 0.04); i < n * 0.7; i++) {
    const P = prof[i].pieces, l = P.filter(p => p.mid > cx), r = P.filter(p => p.mid < cx);
    if (l.length && r.length && !P.some(p => p.a < cx && p.b > cx)) crotch = i; else if (crotch >= 0) break;
  }
  if (crotch < n * 0.12) return null;                         // no legs to see: fall back on proportions
  const crotchY = prof[crotch].y, J = {};
  // Arms: levels above the legs with a piece on each side apart from the body.
  let armTop = -1, armLow = -1, tpose = -1;
  const hipW = body(prof[Math.min(n - 1, crotch + 2)])?.w || H * 0.2;
  for (let i = crotch + 2; i < n - 2; i++) {
    const P = prof[i].pieces, b = body(prof[i]); if (!b) continue;
    const side = P.filter(p => p !== b && (p.mid - cx) * (p.mid - b.mid) > 0);
    if (side.some(p => p.mid > cx) && side.some(p => p.mid < cx)) { if (armLow < 0) armLow = i; armTop = i; }
    if (b.w > hipW * 2.6 && tpose < 0 && prof[i].y > crotchY + (max[1] - crotchY) * 0.3) tpose = i;
  }
  // Neck: going up from the shoulders, the first narrowing followed by a widening (the head).
  const shoulderI = armTop >= 0 ? armTop : tpose >= 0 ? tpose : Math.round(crotch + (n - crotch) * 0.55);
  let neck = -1, narrow = Infinity;
  for (let i = shoulderI + 1; i < n - 1; i++) {
    const b = body(prof[i]); if (!b) continue;
    if (b.w < narrow) { narrow = b.w; neck = i; } else if (b.w > narrow * 1.15 && neck > shoulderI) break;
  }
  if (neck >= n - 3) neck = -1;                              // (only thinner and thinner: no clear neck)
  if (neck <= shoulderI) neck = Math.min(n - 3, shoulderI + Math.max(1, Math.round((n - shoulderI) * 0.2)));
  const zAt = i => body(prof[i])?.z ?? (min[2] + max[2]) / 2, headTop = max[1];
  const neckY = prof[neck].y, shoulderY = prof[shoulderI].y;
  J.hips = [cx, crotchY + H * 0.03, zAt(crotch + 1)];
  J.chest = [cx, shoulderY - (shoulderY - crotchY) * 0.15, zAt(shoulderI)];
  J.spine = lerp(J.hips, J.chest, 0.5);
  J.neck = [cx, neckY, zAt(neck)];
  J.head = [cx, neckY + (headTop - neckY) * 0.25, zAt(Math.min(n - 1, neck + 1))];
  for (const [s, sd] of [['L', 1], ['R', -1]]) {
    const torso = body(prof[shoulderI]) || { a: cx - H * 0.1, b: cx + H * 0.1 }, edge = sd > 0 ? torso.b : torso.a;
    let hand, sh;
    if (armTop >= 0) {
      const arm = i => prof[i].pieces.filter(p => (p.mid - cx) * sd > 0 && p !== body(prof[i])).sort((a, b) => (b.mid - a.mid) * sd)[0];
      const top = arm(armTop), low = arm(armLow);
      sh = [top ? (top.mid + edge) / 2 : edge, Math.min(shoulderY + H * 0.02, neckY - H * 0.01), zAt(shoulderI)];
      hand = [low ? low.mid : edge + sd * H * 0.05, prof[armLow].y + H * 0.02, low?.z ?? zAt(armLow)];
    } else if (tpose >= 0) {
      const b = body(prof[tpose]), tip = sd > 0 ? b.b : b.a;
      sh = [cx + sd * hipW * 0.6, prof[tpose].y, zAt(tpose)]; hand = [tip - sd * Math.abs(tip - sh[0]) * 0.1, prof[tpose].y, zAt(tpose)];
    } else {
      sh = [edge - sd * H * 0.02, shoulderY, zAt(shoulderI)]; hand = [edge + sd * H * 0.02, crotchY + H * 0.02, zAt(crotch)];
    }
    J['arm' + s] = sh; J['forearm' + s] = lerp(sh, hand, 0.5); J['hand' + s] = hand;
    // Legs: the piece on this side, near the bottom and half way up.
    const leg = f => { const L = prof[Math.max(0, Math.round(f))]; return L.pieces.filter(p => (p.mid - cx) * sd > 0).sort((a, b) => Math.abs(a.mid - cx) - Math.abs(b.mid - cx))[0]; };
    const knee = leg(crotch * 0.5), foot = leg(Math.max(1, n * 0.03)), lx = knee?.mid ?? cx + sd * H * 0.08;
    J['thigh' + s] = [lx, crotchY, zAt(crotch)];
    J['shin' + s] = [lx, prof[Math.round(crotch * 0.5)].y, knee?.z ?? zAt(crotch)];
    J['foot' + s] = [foot?.mid ?? lx, min[1] + H * 0.04, foot?.z ?? zAt(0)];
  }
  return J;
}

// An animal from slices along its length: legs are where it reaches the
// ground (the front pair and the back pair), the tail is what is behind the
// back legs, the head what is ahead of the front ones.
function animalFromProfile(prof, shape) {
  const { min, max } = shape.box, H = max[1] - min[1], cx = (min[0] + max[0]) / 2, n = prof.length;
  const span = L => L.pieces.length ? [Math.min(...L.pieces.map(p => p.a)), Math.max(...L.pieces.map(p => p.b))] : null;
  const ground = min[1] + H * 0.1, touch = prof.map(L => { const s = span(L); return !!s && s[0] < ground; });
  const groups = []; touch.forEach((on, i) => { if (!on) return; const g = groups.at(-1); if (g && g[1] === i - 1) g[1] = i; else groups.push([i, i]); });
  if (groups.length < 2) return null;
  const back = groups[0], front = groups.at(-1), mid = g => prof[Math.round((g[0] + g[1]) / 2)].y;
  const zB = mid(back), zF = mid(front);
  // The body over the legs: its top and belly (the lowest point between the pairs).
  let top = -Infinity, belly = Infinity;
  for (let i = back[0]; i <= front[1]; i++) { const s = span(prof[i]); if (!s) continue; top = Math.max(top, s[1]); if (i > back[1] && i < front[0]) belly = Math.min(belly, s[0]); }
  if (!isFinite(belly)) belly = min[1] + (top - min[1]) * 0.5;
  const by = belly + (top - belly) * 0.45, legX = Math.max((max[0] - min[0]) * 0.22, H * 0.05), J = {};
  J.hips = [cx, by, zB]; J.chest = [cx, by, zF]; J.spine = lerp(J.hips, J.chest, 0.5);
  // Neck and head: ahead of the front legs, up to the snout.
  const headI = Math.min(n - 1, Math.round(front[1] + (n - 1 - front[1]) * 0.6)), hs = span(prof[headI]) || [by, top];
  J.neck = [cx, by + (top - by) * 0.7, zF + (prof[Math.min(n - 1, front[1] + 1)].y - zF) * 0.8];
  J.head = [cx, (hs[0] + hs[1]) / 2, prof[headI].y];
  // Tail: from the back of the body.
  const tailI = Math.max(0, back[0] - 1), ts = span(prof[tailI]) || [by, top];
  J.tail = [cx, Math.min(top, (ts[0] + ts[1]) / 2), prof[tailI].y];
  for (const [s, z, side] of [['FL', zF, 1], ['FR', zF, -1], ['BL', zB, 1], ['BR', zB, -1]]) {
    const x = cx + side * legX;
    J['leg' + s] = [x, by, z]; J['knee' + s] = [x, (by + min[1]) / 2 - H * 0.03, z]; J['paw' + s] = [x, min[1] + H * 0.03, z];
  }
  return J;
}

// ---- Binding the mesh to the bones ---------------------------------------------------------
// Each bone: from its joint to its child (the first), or a short tip for the ends.
function bones(kind, J) {
  const list = SKELETONS[kind];
  return list.map(([name, parent]) => {
    const kids = list.filter(([, p]) => p === name).map(([n]) => n);
    const main = kids.find(k => !/^(arm|thigh|leg|tail)/.test(k)) || kids[0];
    let end;
    if (main) end = J[main];
    else {                                                       // the ends: a tip beyond the joint
      const from = parent ? J[parent] : J[name], dir = sub(J[name], from), l = Math.hypot(...dir) || 1;
      end = name === 'head' ? add(J[name], kind === 'animal' ? scale(norm(dir), l * 1.5) : [0, l * 1.2, 0])
        : name === 'tail' ? add(J[name], scale(norm(dir), l * 2)) : add(J[name], scale(norm(dir), l * (/foot|paw/.test(name) ? 0.4 : 0.5)));
      if (/foot/.test(name)) end = add(J[name], [0, 0, l * 0.5]);
    }
    return { name, a: J[name], b: end };
  });
}
// Up to four bones per vertex, the nearest ones weighing most (smooth bends at
// the joints). Plain loops over typed arrays: models can have 100 000+ vertices.
export function bindWeights(pos, B, H) {
  const n = pos.length / 3, nb = B.length, joints = new Uint8Array(n * 4), weights = new Float32Array(n * 4), eps = H * 0.004;
  const A = new Float64Array(nb * 3), D = new Float64Array(nb * 3), L2 = new Float64Array(nb);
  B.forEach((bn, j) => { for (let c = 0; c < 3; c++) { A[j * 3 + c] = bn.a[c]; D[j * 3 + c] = bn.b[c] - bn.a[c]; } L2[j] = D[j * 3] ** 2 + D[j * 3 + 1] ** 2 + D[j * 3 + 2] ** 2 || 1; });
  const bd = new Float64Array(4), bj = new Int32Array(4);
  for (let k = 0; k < n; k++) {
    const px = pos[k * 3], py = pos[k * 3 + 1], pz = pos[k * 3 + 2];
    bd.fill(Infinity); bj.fill(0);
    for (let j = 0; j < nb; j++) {                           // distance to the bone (a segment)
      const ax = px - A[j * 3], ay = py - A[j * 3 + 1], az = pz - A[j * 3 + 2], dx = D[j * 3], dy = D[j * 3 + 1], dz = D[j * 3 + 2];
      const t = Math.max(0, Math.min(1, (ax * dx + ay * dy + az * dz) / L2[j]));
      const d = Math.hypot(ax - dx * t, ay - dy * t, az - dz * t);
      if (d >= bd[3]) continue;
      let at = 3; while (at > 0 && bd[at - 1] > d) { bd[at] = bd[at - 1]; bj[at] = bj[at - 1]; at--; }
      bd[at] = d; bj[at] = j;
    }
    const cut = bd[0] * 1.6 + H * 0.02; let sum = 0;
    for (let c = 0; c < 4; c++) { const w = bd[c] > cut || !isFinite(bd[c]) ? 0 : 1 / Math.pow(bd[c] + eps, 4); weights[k * 4 + c] = w; joints[k * 4 + c] = bj[c]; sum += w; }
    for (let c = 0; c < 4; c++) weights[k * 4 + c] /= sum || 1;
  }
  return { joints, weights };
}

// ---- Animations (made here) ------------------------------------------------------------------
// Each clip: seconds, and a pose at time t (0..1 of the loop) as world turns
// per joint (by directions for limbs, so any rest pose works) plus a hip lift.
const deg = Math.PI / 180;
function limbTo(J, a, b, dir) { return Q.between(sub(J[b], J[a]), dir); }
const downOut = (side, out = 12, fwd = 0) => norm([side * Math.sin(out * deg), -Math.cos(out * deg), Math.sin(fwd * deg)]);
function personPose(J, clip, t, H) {
  const P = {}, ph = t * 2 * Math.PI, S = { L: 1, R: -1 };
  let lift = 0;
  const leg = (s, swing, knee) => {                          // swing: forward degrees; knee: bend
    const thigh = norm([0, -Math.cos(swing * deg), Math.sin(swing * deg)]);
    P['thigh' + s] = limbTo(J, 'thigh' + s, 'shin' + s, thigh);
    const shin = norm([0, -Math.cos((swing - knee) * deg), Math.sin((swing - knee) * deg)]);
    P['shin' + s] = limbTo(J, 'shin' + s, 'foot' + s, shin);
    P['foot' + s] = P['shin' + s];
  };
  const arm = (s, dir, fore) => { P['arm' + s] = limbTo(J, 'arm' + s, 'forearm' + s, dir); P['forearm' + s] = limbTo(J, 'forearm' + s, 'hand' + s, fore || dir); P['hand' + s] = P['forearm' + s]; };
  const body = (bend = 0, twist = 0, side = 0) => { const q = Q.mul(Q.axis(Y, twist), Q.mul(Q.axis(X, bend), Q.axis(Z, side))); P.spine = q; P.chest = q; P.neck = q; P.head = q; };
  if (clip === 'Walk' || clip === 'Run') {
    const run = clip === 'Run', A = run ? 38 : 24, K = run ? 70 : 38;
    for (const [s, off] of [['L', 0], ['R', Math.PI]]) {
      const sw = A * Math.sin(ph + off), kn = K * Math.max(0, Math.sin(ph + off - Math.PI / 2 + 0.6)) * (run ? 1 : 0.9) + (run ? 12 : 4);
      leg(s, sw, kn);
      const armSw = -(run ? 40 : 22) * Math.sin(ph + off);
      arm(s, downOut(S[s], 10, armSw), downOut(S[s], 6, armSw + (run ? 70 : 20)));
    }
    body(run ? 10 : 3, 6 * Math.sin(ph), 0);
    lift = H * (run ? 0.03 : 0.012) * Math.abs(Math.cos(ph));
  } else if (clip === 'Idle') {
    leg('L', 0, 2); leg('R', 0, 2);
    arm('L', downOut(1, 9 + 2 * Math.sin(ph)), downOut(1, 8, 12)); arm('R', downOut(-1, 9 + 2 * Math.sin(ph)), downOut(-1, 8, 12));
    body(1.5 * Math.sin(ph), 0, 1 * Math.sin(ph)); lift = H * 0.004 * Math.sin(ph);
  } else if (clip === 'Wave') {
    leg('L', 0, 2); leg('R', 0, 2); arm('L', downOut(1, 9), downOut(1, 8, 10));
    const w = 22 * Math.sin(ph * 2);
    arm('R', norm([-0.55, 0.83, 0.1]), norm([-Math.sin(w * deg) * 0.9, Math.cos(w * deg), 0.1]));
    body(0, 0, -3);
  } else if (clip === 'Jump') {
    const k = t < 0.3 ? t / 0.3 : t < 0.7 ? 1 - (t - 0.3) / 0.4 : 0, up = t > 0.3 && t < 0.7 ? Math.sin((t - 0.3) / 0.4 * Math.PI) : 0;
    const crouch = t < 0.3 ? Math.sin(t / 0.3 * Math.PI) : t > 0.7 ? Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.6 : 0;
    leg('L', 30 * crouch, 60 * crouch); leg('R', 30 * crouch, 60 * crouch);
    const armUp = up > 0 ? norm([0.4, 0.9 * up - 0.3 * (1 - up), 0.1]) : downOut(1, 15, -30 * crouch);
    arm('L', armUp, armUp); arm('R', [-armUp[0], armUp[1], armUp[2]], [-armUp[0], armUp[1], armUp[2]]);
    body(15 * crouch); lift = H * (0.25 * up - 0.08 * crouch) + 0 * k;
  } else if (clip === 'Cheer') {
    const b = Math.abs(Math.sin(ph * 2));
    leg('L', 5 * b, 12 * b); leg('R', 5 * b, 12 * b);
    const up = norm([0.45, 0.88, 0.05]);
    arm('L', up, norm([0.35 + 0.15 * Math.sin(ph * 2), 0.93, 0])); arm('R', [-up[0], up[1], up[2]], norm([-0.35 - 0.15 * Math.sin(ph * 2), 0.93, 0]));
    body(-4 * b); lift = H * 0.05 * b;
  } else if (clip === 'Dance') {
    const s = Math.sin(ph * 2);
    leg('L', 8 * s, 18 * Math.max(0, s)); leg('R', -8 * s, 18 * Math.max(0, -s));
    arm('L', norm([0.8, 0.3 * s, 0.4]), norm([0.4, 0.8, 0.3])); arm('R', norm([-0.8, -0.3 * s, 0.4]), norm([-0.4, 0.8, 0.3]));
    body(0, 15 * Math.sin(ph), 8 * s); lift = H * 0.02 * Math.abs(s);
  }
  return { P, lift };
}
function animalPose(J, clip, t, H) {
  const P = {}, ph = t * 2 * Math.PI; let lift = 0;
  const leg = (s, swing, knee) => {
    P['leg' + s] = limbTo(J, 'leg' + s, 'knee' + s, norm([0, -Math.cos(swing * deg), Math.sin(swing * deg)]));
    P['knee' + s] = limbTo(J, 'knee' + s, 'paw' + s, norm([0, -Math.cos((swing + (s[0] === 'F' ? -knee : knee)) * deg), Math.sin((swing + (s[0] === 'F' ? -knee : knee)) * deg)]));
    P['paw' + s] = P['knee' + s];
  };
  if (clip === 'Walk' || clip === 'Run') {
    const run = clip === 'Run', A = run ? 34 : 20, K = run ? 45 : 25;
    // Walk: diagonal pairs; run: front and back pairs (a gallop).
    const off = run ? { FL: 0, FR: 0.3, BL: Math.PI, BR: Math.PI + 0.3 } : { FL: 0, BR: 0, FR: Math.PI, BL: Math.PI };
    for (const s of ['FL', 'FR', 'BL', 'BR']) leg(s, A * Math.sin(ph + off[s]), K * Math.max(0, Math.sin(ph + off[s] + Math.PI / 2)));
    const bob = Q.axis(X, (run ? 6 : 3) * Math.sin(ph * 2)); P.neck = bob; P.head = bob;
    P.tail = Q.axis(Y, 18 * Math.sin(ph)); lift = H * (run ? 0.04 : 0.01) * Math.abs(Math.sin(ph));
  } else if (clip === 'Idle') {
    for (const s of ['FL', 'FR', 'BL', 'BR']) leg(s, 0, 0);
    const look = Q.axis(Y, 12 * Math.sin(ph)); P.neck = look; P.head = look; P.tail = Q.axis(Y, 10 * Math.sin(ph * 2)); lift = H * 0.004 * Math.sin(ph);
  } else if (clip === 'Jump') {
    const up = t > 0.3 && t < 0.7 ? Math.sin((t - 0.3) / 0.4 * Math.PI) : 0, cr = t < 0.3 ? Math.sin(t / 0.3 * Math.PI) : 0;
    for (const s of ['FL', 'FR']) leg(s, 30 * up - 10 * cr, 30 * cr);
    for (const s of ['BL', 'BR']) leg(s, -30 * up + 10 * cr, 35 * cr);
    lift = H * (0.3 * up - 0.06 * cr); P.tail = Q.axis(X, -25 * up);
  }
  return { P, lift };
}
export const CLIPS = { person: [['Idle', 2.4], ['Walk', 1.1], ['Run', 0.7], ['Wave', 1.4], ['Jump', 1.2], ['Cheer', 1.2], ['Dance', 1.6]], animal: [['Idle', 2.6], ['Walk', 1.1], ['Run', 0.6], ['Jump', 1.0]] };
export const CLIP_LABELS = { Idle: 'Reposo', Walk: 'Andar', Run: 'Correr', Wave: 'Saludar', Jump: 'Saltar', Cheer: 'Celebrar', Dance: 'Bailar' };

// World turns per joint → the local ones glTF wants (each relative to its parent).
function localTurns(kind, P) {
  const list = SKELETONS[kind], W = {}, L = {};
  for (const [name, parent] of list) { W[name] = P[name] || (parent ? W[parent] : [0, 0, 0, 1]); L[name] = parent ? Q.mul(Q.inv(W[parent]), W[name]) : W[name]; }
  return L;
}

// ---- Putting it together ----------------------------------------------------------------------
// The model with a skeleton at J (joints) and the animations: a GLB data URL.
export function buildRig(g, shape, kind, J) {
  const json = structuredClone(g.json), out = { json, bin: g.bin.slice() }, list = SKELETONS[kind];
  const H = shape.box.max[1] - shape.box.min[1], B = bones(kind, J);
  delete json.skins; json.animations = [];
  for (const n of json.nodes) { delete n.skin; delete n.weights; }          // (the old ones, left out of the scene)
  // Joints: nodes with only a position (their parent's offset).
  const base = json.nodes.length, idx = Object.fromEntries(list.map(([n], i) => [n, base + i]));
  list.forEach(([name, parent]) => json.nodes.push({ name, translation: parent ? sub(J[name], J[parent]) : J[name], children: list.filter(([, p]) => p === name).map(([n]) => idx[n]) }));
  for (const n of json.nodes.slice(base)) if (!n.children.length) delete n.children;
  const ibm = new Float32Array(list.length * 16);
  list.forEach(([name], i) => ibm.set(M4.trs(scale(J[name], -1)), i * 16));
  json.skins = [{ joints: list.map(([n]) => idx[n]), skeleton: idx.hips, inverseBindMatrices: addAccessor(out, ibm, 'MAT4') }];
  // Every mesh, flattened into the model's space, bound to the bones.
  const meshNodes = [];
  shape.parts.forEach(({ prim, pos, nor }) => {
    const { joints, weights } = bindWeights(pos, B, H);
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < pos.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], pos[k + c]); mx[c] = Math.max(mx[c], pos[k + c]); }
    const attributes = { ...prim.attributes, POSITION: addAccessor(out, pos, 'VEC3', { min: mn, max: mx }), JOINTS_0: addAccessor(out, joints, 'VEC4'), WEIGHTS_0: addAccessor(out, weights, 'VEC4') };
    if (nor) attributes.NORMAL = addAccessor(out, nor, 'VEC3'); else delete attributes.NORMAL;
    delete attributes.TANGENT; delete attributes.JOINTS_1; delete attributes.WEIGHTS_1;
    json.meshes.push({ primitives: [{ ...prim, attributes, targets: undefined }] });
    json.nodes.push({ mesh: json.meshes.length - 1, skin: 0 });
    meshNodes.push(json.nodes.length - 1);
  });
  json.scenes = [{ nodes: [idx.hips, ...meshNodes] }]; json.scene = 0;
  // The animations, sampled.
  for (const [clip, secs] of CLIPS[kind]) {
    const n = Math.round(secs * 24) + 1, times = Float32Array.from({ length: n }, (_, i) => secs * i / (n - 1)), input = addAccessor(out, times, 'SCALAR', { min: [0], max: [secs] });
    const rot = Object.fromEntries(list.map(([nm]) => [nm, new Float32Array(n * 4)])), hip = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const { P, lift } = (kind === 'person' ? personPose : animalPose)(J, clip, i / (n - 1), H), L = localTurns(kind, P);
      for (const [nm] of list) rot[nm].set(L[nm], i * 4);
      hip.set(add(J.hips, [0, lift, 0]), i * 3);
    }
    const samplers = [], channels = [];
    for (const [nm] of list) {
      samplers.push({ input, output: addAccessor(out, rot[nm], 'VEC4'), interpolation: 'LINEAR' });
      channels.push({ sampler: samplers.length - 1, target: { node: idx[nm], path: 'rotation' } });
    }
    samplers.push({ input, output: addAccessor(out, hip, 'VEC3'), interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: idx.hips, path: 'translation' } });
    json.animations.push({ name: clip, samplers, channels });
  }
  return writeGLB(out);
}
// A tiny preview of the pose (for tests and the editor): where a joint ends up at time t of a clip.
export function posedJoints(kind, J, clip, t, H) {
  const list = SKELETONS[kind], { P, lift } = (kind === 'person' ? personPose : animalPose)(J, clip, t, H), L = localTurns(kind, P), W = {}, pos = {};
  for (const [name, parent] of list) {
    if (!parent) { W[name] = L[name]; pos[name] = add(J[name], [0, lift, 0]); continue; }
    W[name] = Q.mul(W[parent], L[name]); pos[name] = add(pos[parent], Q.rotate(W[parent], sub(J[name], J[parent])));
  }
  return pos;
}
