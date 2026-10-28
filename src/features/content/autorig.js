// Automatic skeleton ("rig") for a 3D model that has none, so it can walk:
// like Mixamo, simplified. From the model's shape it guesses what it is (a
// person, a four-legged animal, a bird, a dragon, a fish, a snake, a spider, an
// octopus or just an object) and proposes where the joints go; the user adjusts
// them, and the mesh is bound to the bones (each vertex to the nearest ones) and
// given animations made here: rest, walk, run, fly, swim, slither, bounce…
// The result is an ordinary glTF with a skin and animations (all in one GLB).
//
// Conventions: the character faces +Z (glTF's front), +Y is up, its left is +X.
// Joints are points in the model's space; bones go from a joint to its child.

import { readModel, writeGLB, readAccessor, addAccessor } from './gltf.js';

export { readModel, writeGLB };                 // (as before, for the dialog and tests)

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
// [name, parent]; the end of each bone is its first child, or a tip.
const sides = f => [...f('L'), ...f('R')];
const range = (n, f) => Array.from({ length: Math.max(0, n) }, (_, i) => f(i + 1));
const PERSON = [['hips', null], ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'],
  ['armL', 'chest'], ['forearmL', 'armL'], ['handL', 'forearmL'], ['armR', 'chest'], ['forearmR', 'armR'], ['handR', 'forearmR'],
  ['thighL', 'hips'], ['shinL', 'thighL'], ['footL', 'shinL'], ['thighR', 'hips'], ['shinR', 'thighR'], ['footR', 'shinR']];
const HEM = [['hemF', 'hips'], ['hemFt', 'hemF'], ['hemB', 'hips'], ['hemBt', 'hemB'], ['hemL', 'hips'], ['hemLt', 'hemL'], ['hemR', 'hips'], ['hemRt', 'hemR']];
const ANIMAL = [['hips', null], ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'], ['tail', 'hips'],
  ['legFL', 'chest'], ['kneeFL', 'legFL'], ['pawFL', 'kneeFL'], ['legFR', 'chest'], ['kneeFR', 'legFR'], ['pawFR', 'kneeFR'],
  ['legBL', 'hips'], ['kneeBL', 'legBL'], ['pawBL', 'kneeBL'], ['legBR', 'hips'], ['kneeBR', 'legBR'], ['pawBR', 'kneeBR']];
const WINGS = sides(s => [['wing' + s, 'chest'], ['wing2' + s, 'wing' + s], ['wingTip' + s, 'wing2' + s]]);

// The kinds of model: label, icon, the view its joints are edited in, the clip
// it moves with along a path (and the one when it arrives), and what can be counted.
export const KINDS = {
  person: { label: 'Persona (dos piernas)', icon: 'accessibility_new', view: 'front', move: 'Walk', end: 'Wave' },
  animal: { label: 'Animal (cuatro patas)', icon: 'pets', view: 'side', move: 'Walk' },
  bird: { label: 'Pájaro', icon: 'flutter_dash', view: 'side', move: 'Fly' },
  winged: { label: 'Dragón (patas y alas)', icon: 'local_fire_department', view: 'side', move: 'Fly' },
  fish: { label: 'Pez', icon: 'set_meal', view: 'side', move: 'Swim', count: { key: 'tail', label: 'Partes de la cola', options: [2, 3, 4, 5], def: 3 } },
  snake: { label: 'Serpiente o gusano', icon: 'gesture', view: 'top', move: 'Slither', count: { key: 'segs', label: 'Segmentos', options: [6, 8, 10, 12, 16], def: 10 } },
  spider: { label: 'Araña o insecto', icon: 'pest_control', view: 'top', move: 'Walk', count: { key: 'legs', label: 'Patas', options: [6, 8], def: 8 } },
  octopus: { label: 'Pulpo o medusa', icon: 'waves', view: 'top', move: 'Swim', count: { key: 'arms', label: 'Tentáculos', options: [4, 5, 6, 8, 10], def: 8 } },
  object: { label: 'Objeto (sin patas)', icon: 'deployed_code', view: 'front', move: 'Bounce', count: { key: 'bends', label: 'Partes que se doblan', options: [0, 1, 2, 3], def: 2 } },
};
const LIMITS = { tail: [1, 6], segs: [4, 24], legs: [4, 10], arms: [3, 12], bends: [0, 4] };
// How many segments, legs, tentacles…: from the options ({ legs: 6 }), or counted in the joints.
export function countOf(kind, src = {}) {
  const c = KINDS[kind]?.count; if (!c) return 0;
  let n = src[c.key] == null ? NaN : +src[c.key];
  if (Array.isArray(src.hips)) {
    const rx = { tail: /^tail\d+$/, segs: /^(body|tail)\d+$/, legs: /^leg\d+L$/, arms: /^arm\d+a$/, bends: /^bend\d+$/ }[c.key];
    n = Object.keys(src).filter(k => rx.test(k)).length; n = c.key === 'segs' ? n + 2 : c.key === 'legs' ? n * 2 : n;
  }
  if (!Number.isFinite(n)) n = c.def;
  const [lo, hi] = LIMITS[c.key]; n = Math.max(lo, Math.min(hi, Math.round(n)));
  return c.key === 'legs' ? n - n % 2 : n;
}
// The skeleton of a kind: [name, parent], parents first.
export function skeletonOf(kind, src = {}) {
  const n = countOf(kind, src);
  switch (kind) {
    case 'animal': return ANIMAL;
    case 'winged': return [...ANIMAL, ...WINGS];
    case 'bird': return [['hips', null], ['chest', 'hips'], ['neck', 'chest'], ['head', 'neck'], ['tail', 'hips'], ...WINGS,
      ...sides(s => [['thigh' + s, 'hips'], ['shin' + s, 'thigh' + s], ['foot' + s, 'shin' + s]])];
    case 'fish': return [['hips', null], ['chest', 'hips'], ['head', 'chest'], ...range(n, i => ['tail' + i, i > 1 ? 'tail' + (i - 1) : 'hips']),
      ['finL', 'chest'], ['finR', 'chest'], ['finTop', 'hips']];
    case 'snake': {                                              // n joints: the tail's tip … the middle (hips) … the head
      const back = Math.floor((n - 1) / 2), fwd = n - 2 - back;
      return [['hips', null], ...range(fwd, i => ['body' + i, i > 1 ? 'body' + (i - 1) : 'hips']), ['head', fwd ? 'body' + fwd : 'hips'],
        ...range(back, i => ['tail' + i, i > 1 ? 'tail' + (i - 1) : 'hips'])];
    }
    case 'spider': return [['hips', null], ['head', 'hips'], ['abdomen', 'hips'],
      ...sides(s => range(n / 2, i => [['leg' + i + s, 'hips'], ['knee' + i + s, 'leg' + i + s], ['foot' + i + s, 'knee' + i + s]]).flat())];
    case 'octopus': return [['hips', null], ['head', 'hips'], ...range(n, i => [['arm' + i + 'a', 'hips'], ['arm' + i + 'b', 'arm' + i + 'a'], ['arm' + i + 'c', 'arm' + i + 'b']]).flat()];
    case 'object': return [['hips', null], ...range(n, i => ['bend' + i, i > 1 ? 'bend' + (i - 1) : 'hips'])];
    default: return src && src.hemF ? [...PERSON, ...HEM] : PERSON;   // (a person in a tunic or a dress has four more bones hanging from the hips)
  }
}
// (each kind with its usual counts)
export const SKELETONS = Object.fromEntries(Object.keys(KINDS).map(k => [k, skeletonOf(k)]));
export const JOINT_LABELS = { hips: 'Cadera', spine: 'Espalda', chest: 'Pecho', neck: 'Cuello', head: 'Cabeza', tail: 'Cola',
  armL: 'Hombro izq.', forearmL: 'Codo izq.', handL: 'Mano izq.', armR: 'Hombro der.', forearmR: 'Codo der.', handR: 'Mano der.',
  thighL: 'Cadera izq.', shinL: 'Rodilla izq.', footL: 'Tobillo izq.', thighR: 'Cadera der.', shinR: 'Rodilla der.', footR: 'Tobillo der.',
  legFL: 'Pata del. izq.', kneeFL: 'Rodilla del. izq.', pawFL: 'Pie del. izq.', legFR: 'Pata del. der.', kneeFR: 'Rodilla del. der.', pawFR: 'Pie del. der.',
  legBL: 'Pata tras. izq.', kneeBL: 'Rodilla tras. izq.', pawBL: 'Pie tras. izq.', legBR: 'Pata tras. der.', kneeBR: 'Rodilla tras. der.', pawBR: 'Pie tras. der.',
  wingL: 'Ala izq.', wing2L: 'Codo del ala izq.', wingTipL: 'Punta del ala izq.', wingR: 'Ala der.', wing2R: 'Codo del ala der.', wingTipR: 'Punta del ala der.',
  finL: 'Aleta izq.', finR: 'Aleta der.', finTop: 'Aleta de arriba', abdomen: 'Abdomen',
  hemF: 'Falda: delante', hemFt: 'Falda: bajo delante', hemB: 'Falda: detrás', hemBt: 'Falda: bajo detrás', hemL: 'Falda: lado izq.', hemLt: 'Falda: bajo izq.', hemR: 'Falda: lado der.', hemRt: 'Falda: bajo der.' };
const NUMBERED = [[/^tail(\d+)$/, 'Cola {n}'], [/^body(\d+)$/, 'Cuerpo {n}'], [/^bend(\d+)$/, 'Doblez {n}'],
  [/^leg(\d+)L$/, 'Pata {n} izq.'], [/^leg(\d+)R$/, 'Pata {n} der.'], [/^knee(\d+)L$/, 'Rodilla {n} izq.'], [/^knee(\d+)R$/, 'Rodilla {n} der.'],
  [/^foot(\d+)L$/, 'Pie {n} izq.'], [/^foot(\d+)R$/, 'Pie {n} der.'], [/^arm(\d+)a$/, 'Tentáculo {n}'], [/^arm(\d+)b$/, 'Tentáculo {n} (medio)'], [/^arm(\d+)c$/, 'Tentáculo {n} (punta)']];
// A joint's name for people (tr: the translation function).
export function jointLabel(name, kind = 'person', tr = s => s) {
  if (name === 'hips') return tr(['person', 'animal', 'bird', 'winged'].includes(kind) ? 'Cadera' : kind === 'object' ? 'Base' : 'Centro');
  if (JOINT_LABELS[name]) return tr(JOINT_LABELS[name]);
  for (const [rx, s] of NUMBERED) { const m = name.match(rx); if (m) return tr(s).replace('{n}', m[1]); }
  return name;
}
// The mirror of a joint (to move both sides together).
export const mirrorOf = n => (/[LR]$/.test(n) ? n.slice(0, -1) + (n.endsWith('L') ? 'R' : 'L') : null);

// Vertices near a plane slice of the model (for the proposal): their x range and centre.
// keep(x, y, z): only some of them.
function slab(shape, axis, lo, hi, keep = null) {
  let n = 0, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], sum = [0, 0, 0];
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += 3) {
    const v = pos[k + axis]; if (v < lo || v > hi || (keep && !keep(pos[k], pos[k + 1], pos[k + 2]))) continue;
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
export function proposeJoints(shape, kind = 'person', opts = {}) {
  if (PROPOSE[kind]) return PROPOSE[kind](shape, countOf(kind, opts));
  const { min, max } = shape.box, H = max[1] - min[1], W = max[0] - min[0], D = max[2] - min[2];
  const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, y = f => min[1] + H * f, J = {};
  if (kind === 'person') {
    const prof = profile(shape), found = personFromBody(prof, shape) || personFromProfile(prof, shape);
    if (found) return addHem(shape, found, H);   // (snapInside(shape, found, H) tidies the drawing but measured worse on the walk: 4,5 % → 4,9 % of stretched edges)
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

// Where each leg is at some heights, from the vertices themselves (x and z): two clusters if there are two legs there.
// A silhouette from the front cannot tell the legs apart when the figure stands in mid-stride (one foot ahead of the other),
// and then both feet land at the same place. → [{ x, z } | null, { x, z } | null] per level: L (the one at +X, or ahead) first.
export function legCentres(shape, ys, H) {
  const pts = ys.map(() => []);
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += 3) for (let i = 0; i < ys.length; i++) if (Math.abs(pos[k + 1] - ys[i]) < H * 0.012) pts[i].push(pos[k], pos[k + 2]);
  const two = (P) => {
    const n = P.length / 2; if (n < 40) return null;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); z0 = Math.min(z0, P[i + 1]); z1 = Math.max(z1, P[i + 1]); }
    const ax = x1 - x0 >= z1 - z0 ? 0 : 1;                                  // split along the longer extent, then settle with 2-means
    let a = [ax ? (x0 + x1) / 2 : x0 + (x1 - x0) * 0.25, ax ? z0 + (z1 - z0) * 0.25 : (z0 + z1) / 2], b = [ax ? (x0 + x1) / 2 : x0 + (x1 - x0) * 0.75, ax ? z0 + (z1 - z0) * 0.75 : (z0 + z1) / 2];
    let na = 0, nb = 0;
    for (let it = 0; it < 8; it++) {
      let sa = [0, 0], sb = [0, 0]; na = nb = 0;
      for (let i = 0; i < P.length; i += 2) { const da = (P[i] - a[0]) ** 2 + (P[i + 1] - a[1]) ** 2, db = (P[i] - b[0]) ** 2 + (P[i + 1] - b[1]) ** 2;
        if (da <= db) { sa[0] += P[i]; sa[1] += P[i + 1]; na++; } else { sb[0] += P[i]; sb[1] += P[i + 1]; nb++; } }
      if (!na || !nb) return null; a = [sa[0] / na, sa[1] / na]; b = [sb[0] / nb, sb[1] / nb];
    }
    const sep = Math.hypot(a[0] - b[0], a[1] - b[1]);
    return sep > H * 0.045 && Math.min(na, nb) / n > 0.25 ? [{ x: a[0], z: a[1] }, { x: b[0], z: b[1] }] : null;
  };
  const found = pts.map(two), out = [];
  let prev = null;
  // From the ground up, so each leg keeps its side: L is the one nearer the previous L (the first level: larger x, or the one ahead).
  for (let i = 0; i < found.length; i++) {
    const f = found[i]; if (!f) { out.push([null, null]); continue; }
    let L, R;
    if (!prev) { [L, R] = Math.abs(f[0].x - f[1].x) > H * 0.01 ? (f[0].x > f[1].x ? [f[0], f[1]] : [f[1], f[0]]) : (f[0].z > f[1].z ? [f[0], f[1]] : [f[1], f[0]]); }
    else { const d = (p, q) => Math.hypot(p.x - q.x, p.z - q.z); [L, R] = d(f[0], prev[0]) + d(f[1], prev[1]) <= d(f[1], prev[0]) + d(f[0], prev[1]) ? [f[0], f[1]] : [f[1], f[0]]; }
    out.push([L, R]); prev = [L, R];
  }
  return out;
}


// A tunic or a dress that covers the legs: four bones hang from the hips (front, back and the two sides) down to the hem, inside the
// cloth, and swing as the legs push it — so the cloth is carried by them and not torn between the two legs.
function addHem(shape, J, H) {
  const hipsY = J.hips[1], cr = J.crotchY; if (cr == null || hipsY - cr < H * 0.15) return J;   // (jeans and suits: the legs part right under the hips; only a tunic or a dress hides them for long)
  const yh = cr + H * 0.02, yw = hipsY - H * 0.015; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += 3) if (Math.abs(pos[k + 1] - yh) < H * 0.03) { x0 = Math.min(x0, pos[k]); x1 = Math.max(x1, pos[k]); z0 = Math.min(z0, pos[k + 2]); z1 = Math.max(z1, pos[k + 2]); }
  if (!isFinite(x0) || x1 - x0 < H * 0.12) return J;
  const cx = J.hips[0], cz = (z0 + z1) / 2, rx = Math.min(x1 - cx, cx - x0), rz = Math.min(z1 - cz, cz - z0), at = (dx, dz, f) => [cx + dx * f, yw + (yh - yw) * (f > 0.6 ? 1 : 0), cz + dz * f];
  const out = { ...J };
  for (const [k, dx, dz] of [['F', 0, rz], ['B', 0, -rz], ['L', rx, 0], ['R', -rx, 0]]) { out['hem' + k] = [cx + dx * 0.55, yw, cz + dz * 0.55]; out['hem' + k + 't'] = [cx + dx * 0.8, yh, cz + dz * 0.8]; }
  Object.defineProperty(out, 'crotchY', { value: cr, enumerable: false });
  return out;
}
// A standing person from the body's proportions, adjusted by what the silhouette shows. The slices alone (personFromProfile)
// fail with loose clothes — a tunic or a dress hides the crotch, so hips, knees and arms land in the wrong places —; the
// proportions of a body don't: head, shoulders, hips, knees and ankles are at known heights of a standing person, and the
// silhouette only has to say how wide, where the neck is, and where each leg and arm is. Null when it is not a standing
// person with its feet down (a T pose goes on to the slices).
// Heights are fractions of the whole height, for an adult (a child has a bigger head and shorter legs: `kid`).
const BODY = { adult: { shoulder: 0.82, chest: 0.72, spine: 0.62, hips: 0.52, thigh: 0.5, knee: 0.285, ankle: 0.045, elbow: 0.63, wrist: 0.47, armDrop: 0.19, headTop: 1 },
  kid: { shoulder: 0.76, chest: 0.67, spine: 0.58, hips: 0.47, thigh: 0.45, knee: 0.255, ankle: 0.045, elbow: 0.58, wrist: 0.42, armDrop: 0.18, headTop: 1 } };
function personFromBody(prof, shape) {
  const { min, max } = shape.box, H = max[1] - min[1], n = prof.length, cx = (min[0] + max[0]) / 2;
  if (!(H > 0) || H < (max[0] - min[0]) * 0.9 || H < (max[2] - min[2]) * 1.2) return null;       // (lying down, or a wide object)
  const row = f => prof[Math.max(0, Math.min(n - 1, Math.round(f * n - 0.5)))];
  const ext = L => (L.pieces.length ? [Math.min(...L.pieces.map(p => p.a)), Math.max(...L.pieces.map(p => p.b))] : null);
  const width = L => { const e = ext(L); return e ? e[1] - e[0] : 0; };
  const mainOf = L => L.pieces.reduce((b, p) => (!b || Math.abs(p.mid - cx) < Math.abs(b.mid - cx) ? p : b), null);
  // A T pose: arms out at the shoulders, wider than the person is tall × 0.6 — the slices do that one.
  if (width(row(0.8)) > H * 0.62) return null;
  // The neck: the narrowest slice (of the whole silhouette) between 0.78 and 0.93 of the height; the head is above it.
  let neckF = 0.86, w = Infinity;
  for (let f = 0.78; f <= 0.93; f += 1 / n) { const k = width(row(f)); if (k > 0 && k < w * 0.97) { w = k; neckF = f; } }
  const headH = (1 - neckF) * H, kid = headH > H * 0.17;
  const P = kid ? BODY.kid : BODY.adult, y = f => min[1] + H * f, zOf = f => mainOf(row(f))?.z ?? (min[2] + max[2]) / 2;
  const neckY = y(Math.min(P.shoulder + 0.05, Math.max(neckF, P.shoulder + 0.02)));
  const J = {};
  // Where the legs part: the highest slice with two pieces, one on each side of the middle (below it, a tunic or a dress covers them as one).
  let crotchF = 0; for (let f = 0.05; f < P.hips + 0.05; f += 1 / n) { const L = row(f).pieces; if (L.some(p => p.mid > cx) && L.some(p => p.mid < cx) && !L.some(p => p.a < cx && p.b > cx)) crotchF = f; else if (crotchF > 0.2) break; }
  Object.defineProperty(J, 'crotchY', { value: y(crotchF || P.hips), enumerable: false });
  J.hips = [cx, y(P.hips), zOf(P.hips)]; J.spine = [cx, y(P.spine), zOf(P.spine)]; J.chest = [cx, y(P.chest), zOf(P.chest)];
  J.neck = [cx, neckY, zOf(neckF)]; J.head = [cx, neckY + (max[1] - neckY) * 0.5, zOf(Math.min(0.97, (neckF + 1) / 2))];
  // Shoulders: half of the silhouette's width where the shoulders are, less the arm; arms hang from there (a little out: an A pose).
  const sw = width(row(P.shoulder - 0.02)), armW = H * 0.075, shX = Math.max(H * 0.07, Math.min(sw / 2 - armW / 2, H * 0.2));
  // The legs: the piece on each side at the knee and near the ground (the nearest to the middle on that side).
  const legAt = (f, sd) => row(f).pieces.filter(p => (p.mid - cx) * sd > 0).sort((a, b) => Math.abs(a.mid - cx) - Math.abs(b.mid - cx))[0];
  for (const [s, sd] of [['L', 1], ['R', -1]]) {
    const sh = [cx + sd * shX, y(P.shoulder), zOf(P.shoulder)];
    // The hand hangs where the silhouette's edge is at the wrists — or, if the arm is inside the body, a little out of the shoulder.
    const wr = row(P.wrist), e = ext(wr), edge = e ? (sd > 0 ? e[1] : e[0]) : cx + sd * (shX + armW);
    const wx = (edge - sd * armW * 0.5 - cx) * sd > shX * 0.8 ? edge - sd * armW * 0.5 : cx + sd * Math.min(shX * 1.15, shX + armW * 0.4);
    const hand = [wx, y(P.wrist - 0.04), zOf(P.wrist)], elbow = [(sh[0] + wx) / 2 + sd * armW * 0.15, y(P.elbow), zOf(P.elbow)];
    J['arm' + s] = sh; J['forearm' + s] = elbow; J['hand' + s] = hand;
    const hip = legAt(P.thigh - 0.03, sd) || legAt(P.knee + 0.05, sd), knee = legAt(P.knee, sd) || hip, foot = legAt(0.06, sd) || knee;
    const hx = hip ? hip.mid : cx + sd * H * 0.07, kx = knee ? knee.mid : hx, fx = foot ? foot.mid : kx;
    J['thigh' + s] = [Math.abs(hx - cx) < H * 0.03 ? cx + sd * H * 0.05 : hx, y(P.thigh), hip?.z ?? zOf(P.thigh)];
    J['shin' + s] = [kx, y(P.knee), knee?.z ?? zOf(P.knee)];
    J['foot' + s] = [fx, y(P.ankle), foot?.z ?? zOf(0.06)];
  }
  // Legs seen from the vertices (a stride hides one from the front): knee and ankle at each leg's own centre.
  const lc = legCentres(shape, [y(P.ankle + 0.015), y(P.knee)], H);
  if (lc[0][0] && lc[0][1]) {
    for (const [i, s] of [[0, 'L'], [1, 'R']]) {
      const a = lc[0][i], k = lc[1][i] || { x: a.x, z: a.z };
      J['foot' + s] = [a.x, y(P.ankle), a.z]; J['shin' + s] = [k.x, y(P.knee), k.z];
    }
    // The hip joints are symmetric about the body's middle (a leg stepping out doesn't move its hip): as far from it as the legs' mean spread says.
    const sp = [J.shinL[0] - cx, cx - J.shinR[0]].map(d => Math.max(H * 0.045, Math.min(H * 0.10, d * 0.8))), mean = (sp[0] + sp[1]) / 2;
    J.thighL[0] = cx + 0.5 * mean + (1 - 0.5) * sp[0]; J.thighR[0] = cx - (0.5 * mean + (1 - 0.5) * sp[1]);
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

// ---- The other kinds, from the shape -------------------------------------------------------
const dims = ({ box: { min, max } }) => ({ min, max, W: max[0] - min[0] || 1e-6, H: max[1] - min[1] || 1e-6, D: max[2] - min[2] || 1e-6,
  cx: (min[0] + max[0]) / 2, cy: (min[1] + max[1]) / 2, cz: (min[2] + max[2]) / 2 });
const mirrorX = (p, cx) => [2 * cx - p[0], p[1], p[2]];
const quant = (a, q) => { if (!a.length) return NaN; const s = Float64Array.from(a).sort(); return s[Math.round(q * (s.length - 1))]; };
const centroid = P => (P.length ? scale(P.reduce(add, [0, 0, 0]), 1 / P.length) : null);
// The vertices that pass a test, as [x, y, z] (about 20 000 at most, evenly picked).
function points(shape, keep) {
  let total = 0; for (const { pos } of shape.parts) total += pos.length / 3;
  const step = 3 * Math.max(1, Math.floor(total / 20000)), out = [];
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += step) if (keep(pos[k], pos[k + 1], pos[k + 2])) out.push([pos[k], pos[k + 1], pos[k + 2]]);
  return out;
}
// The widest piece of the slice at a fraction f of a profile (its middle: the body's).
const widest = (prof, f) => prof[Math.max(0, Math.min(prof.length - 1, Math.round(f * prof.length - 0.5)))].pieces.reduce((b, p) => (!b || p.w > b.w ? p : b), null);
// Copy the left joints (x > centre) to the right.
const mirrorLeft = (J, names, cx) => { for (const n of names) J[mirrorOf(n)] = mirrorX(J[n], cx); return J; };

// Wings from the sides of the chest: spread (reaching far out) or folded along the back.
function addWings(shape, J, half) {
  const { min, H, W, D, cx } = dims(shape), by = J.chest[1];
  let tip = null;
  for (const p of points(shape, (x, y) => x > cx + half && y > min[1] + H * 0.15)) if (!tip || p[0] > tip[0]) tip = p;
  if (tip && tip[0] - cx > half * 2.2) {
    J.wingL = [cx + half * 0.7, by + H * 0.05, J.chest[2]]; J.wingTipL = [tip[0] - W * 0.03, tip[1], tip[2]]; J.wing2L = lerp(J.wingL, J.wingTipL, 0.45);
  } else {
    J.wingL = [cx + half * 0.8, by + H * 0.06, J.chest[2]]; J.wing2L = [cx + half * 0.9, by + H * 0.03, lerp(J.chest, J.hips, 0.8)[2]];
    J.wingTipL = [cx + half * 0.9, by, min[2] + D * 0.12];
  }
  return mirrorLeft(J, ['wingL', 'wing2L', 'wingTipL'], cx);
}

// A bird: a body along Z (head ahead and up), two legs under it, wings at its sides.
function proposeBird(shape) {
  const { min, W, H, D, cx } = dims(shape), z = f => min[2] + D * f, y = f => min[1] + H * f;
  const half = Math.max(W * 0.1, D * 0.16), core = x => Math.abs(x - cx) <= half, J = {};
  const ys = points(shape, (x, yy, zz) => core(x) && zz > z(0.25) && zz < z(0.7) && yy > y(0.2)).map(p => p[1]);
  const by = ys.length ? quant(ys, 0.5) : y(0.5), belly = ys.length ? quant(ys, 0.08) : y(0.35), top = ys.length ? quant(ys, 0.95) : y(0.7);
  J.hips = [cx, by, z(0.4)]; J.chest = [cx, by + (top - by) * 0.25, z(0.6)];
  const front = centroid(points(shape, (x, yy, zz) => core(x) && zz > z(0.75) && yy > by));
  J.head = front ? [cx, front[1], front[2]] : [cx, y(0.85), z(0.88)]; J.neck = lerp(J.chest, J.head, 0.5);
  const back = centroid(points(shape, (x, yy, zz) => core(x) && zz < z(0.12) && yy > y(0.2)));
  J.tail = lerp(J.hips, [cx, back ? back[1] : by, z(0.02)], 0.35);                // (its bone reaches the tip)
  const foot = groundContacts(shape).sort((a, b) => b.cells - a.cells).slice(0, 2).find(c => c.x > cx);
  const lx = foot ? foot.x : cx + half * 0.45, lz = foot ? foot.z : z(0.45);
  J.thighL = [cx + (lx - cx) * 0.7, belly + (by - belly) * 0.3, J.hips[2]]; J.footL = [lx, y(0.03), lz];
  J.shinL = [lx, lerp(J.footL, J.thighL, 0.45)[1], lz - D * 0.04];
  mirrorLeft(J, ['thighL', 'shinL', 'footL'], cx);
  return addWings(shape, J, half);
}
// A dragon: a four-legged animal with wings.
function proposeWinged(shape) {
  const { D, cx } = dims(shape), J = proposeJoints(shape, 'animal');
  // (the wings widen the model: the legs' sides from where they touch the ground)
  const feet = groundContacts(shape).map(c => Math.abs(c.x - cx)), legX = feet.length >= 2 ? quant(feet, 0.5) : D * 0.08;
  for (const n of Object.keys(J)) if (/^(leg|knee|paw)/.test(n)) J[n][0] = cx + (n.endsWith('L') ? legX : -legX);
  return addWings(shape, J, Math.max(legX * 1.5, D * 0.06));
}
// A fish: a spine along Z, the tail in n parts, side fins and one on top.
function proposeFish(shape, n) {
  const { min, D, cx, cy } = dims(shape), z = f => min[2] + D * f, py = profile(shape, 48, 2, 1), px = profile(shape, 48, 2, 0);
  const at = f => { const p = widest(py, f); return p ? [p.z, p.mid, z(f)] : [cx, cy, z(f)]; };
  const J = { hips: at(0.5), chest: at(0.68), head: at(0.86) };
  for (let i = 1; i <= n; i++) J['tail' + i] = at(0.5 - 0.44 * i / n);
  const w = widest(px, 0.64), h = widest(py, 0.64), hw = w ? w.w / 2 : D * 0.05;
  J.finL = [J.chest[0] + hw * 0.8, J.chest[1] - (h ? h.w : D * 0.2) * 0.15, z(0.64)]; J.finR = mirrorX(J.finL, J.chest[0]);
  const top = widest(py, 0.5); J.finTop = [J.hips[0], J.hips[1] + ((top ? top.b : J.hips[1]) - J.hips[1]) * 0.6, z(0.5)];
  return J;
}
// A snake (worm, eel…): n joints along its body, following its bends, head at +Z.
function proposeSnake(shape, n) {
  const { min, D, cx, cy } = dims(shape), back = Math.floor((n - 1) / 2), J = {}, prof = profile(shape, 64, 2, 1);
  for (let i = 0; i < n; i++) {
    const f = 0.03 + 0.94 * i / (n - 1), zz = min[2] + D * f, s = widest(prof, f), p = s ? [s.z, s.mid, zz] : [cx, cy, zz];
    J[i < back ? 'tail' + (back - i) : i === back ? 'hips' : i === n - 1 ? 'head' : 'body' + (i - back)] = p;
  }
  return J;
}
// A spider or an insect: a body along Z (head ahead, abdomen behind) and n legs
// arching up from its sides down to the ground.
function proposeSpider(shape, n) {
  const { min, max, W, H, D, cx, cz } = dims(shape), pairs = n / 2, J = {};
  const body = slab(shape, 2, min[2], max[2], (x, y) => Math.abs(x - cx) < W * 0.1 && y > min[1] + H * 0.15);
  const back = body ? body.min[2] : cz - D * 0.25, front = body ? body.max[2] : cz + D * 0.25, by = body ? (body.min[1] + body.max[1]) / 2 : min[1] + H * 0.5;
  const bl = front - back, bw = Math.max(bl * 0.15, W * 0.04);
  J.hips = [cx, by, back + bl * 0.6]; J.head = [cx, by, back + bl * 0.9]; J.abdomen = [cx, by, back + bl * 0.2];
  const feet = groundContacts(shape).filter(c => c.x > cx + bw).sort((a, b) => b.z - a.z);
  for (let i = 1; i <= pairs; i++) {
    const a = (25 + 130 * (i - 1) / Math.max(1, pairs - 1)) * deg, f = feet.length === pairs ? feet[i - 1] : null;
    const root = [cx + bw, by, J.hips[2] + bw * 1.6 * Math.cos(a)];
    const foot = f ? [f.x, min[1] + H * 0.03, f.z] : [cx + Math.sin(a) * W * 0.45, min[1] + H * 0.03, J.hips[2] + Math.cos(a) * D * 0.45];
    const knee = lerp(root, foot, 0.4); knee[1] = by + (max[1] - by) * 0.6;
    J['leg' + i + 'L'] = root; J['knee' + i + 'L'] = knee; J['foot' + i + 'L'] = foot;
    mirrorLeft(J, ['leg' + i + 'L', 'knee' + i + 'L', 'foot' + i + 'L'], cx);
  }
  return J;
}
// An octopus (or a jellyfish): a body on top, n tentacles around it, down to the ground.
function proposeOctopus(shape, n) {
  const { min, W, H, D, cx, cz } = dims(shape), y = f => min[1] + H * f;
  const top = slab(shape, 1, y(0.45), y(1)), hx = top ? top.mid[0] : cx, hz = top ? top.mid[2] : cz;
  const J = { hips: [hx, y(0.3), hz], head: [hx, top ? top.min[1] + (top.max[1] - top.min[1]) * 0.6 : y(0.8), hz] };
  // Where the tentacles touch the ground (when there are as many), else evenly around.
  const feet = groundContacts(shape).map(c => ({ ...c, ang: Math.atan2(c.x - hx, c.z - hz), r: Math.hypot(c.far[0] - hx, c.far[1] - hz) })).sort((a, b) => a.ang - b.ang);
  const R = Math.min(W, D) * 0.45;
  for (let i = 1; i <= n; i++) {
    const f = feet.length === n ? feet[i - 1] : null, ang = f ? f.ang : 2 * Math.PI * (i - 1) / n, r = f ? f.r : R;
    const at = (k, yy) => [hx + Math.sin(ang) * r * k, yy, hz + Math.cos(ang) * r * k];
    J['arm' + i + 'a'] = at(0.2, y(0.2)); J['arm' + i + 'b'] = at(0.5, y(0.08)); J['arm' + i + 'c'] = at(0.8, y(0.04));
  }
  return J;
}
// An object: a root at its base and n joints up its middle (where it bends).
function proposeObject(shape, n) {
  const { min, H, cx, cz } = dims(shape), J = { hips: [cx, min[1], cz] };
  for (let i = 1; i <= n; i++) {
    const yy = min[1] + H * i / (n + 1), s = slab(shape, 1, yy - H * 0.05, yy + H * 0.05);
    J['bend' + i] = [s ? (s.min[0] + s.max[0]) / 2 : cx, yy, s ? (s.min[2] + s.max[2]) / 2 : cz];
  }
  return J;
}
const PROPOSE = { bird: proposeBird, winged: proposeWinged, fish: proposeFish, snake: proposeSnake, spider: proposeSpider, octopus: proposeOctopus, object: proposeObject };

// ---- What the model is (a free guess from its shape) -----------------------------------------
// The separate pieces where the model meets the ground (feet, paws, tentacles…), seen
// from above: a cut just over its lowest point, drawn in a grid, its connected parts.
export function groundContacts(shape) {
  const { min, W, H, D } = dims(shape), cell = Math.max(W, D) / 64, nx = Math.ceil(W / cell) + 1, nz = Math.ceil(D / cell) + 1;
  const cut = y0 => {
    const grid = new Uint8Array(nx * nz);
    const mark = (x, z) => { const i = Math.floor((x - min[0]) / cell), j = Math.floor((z - min[2]) / cell); if (i >= 0 && j >= 0 && i < nx && j < nz) grid[j * nx + i] = 1; };
    for (const { pos, idx } of shape.parts) {
      if (!idx) continue;
      for (let t = 0; t < idx.length; t += 3) {
        const v = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3], pts = [];
        for (const [p, q] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) {
          const a = pos[p + 1] - y0, b = pos[q + 1] - y0; if ((a < 0) === (b < 0)) continue;
          const k = a / (a - b); pts.push([pos[p] + (pos[q] - pos[p]) * k, pos[p + 2] + (pos[q + 2] - pos[p + 2]) * k]);
        }
        if (pts.length < 2) continue;
        const [[x0, z0], [x1, z1]] = pts, steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / cell * 2) + 1;
        for (let s = 0; s <= steps; s++) mark(x0 + (x1 - x0) * s / steps, z0 + (z1 - z0) * s / steps);
      }
    }
    const seen = new Uint8Array(nx * nz), comps = [];
    for (let s0 = 0; s0 < grid.length; s0++) {
      if (!grid[s0] || seen[s0]) continue;
      const stack = [s0], c = { cells: 0, x: 0, z: 0, min: [Infinity, Infinity], max: [-Infinity, -Infinity], far: null }, cells = [];
      seen[s0] = 1;
      while (stack.length) {
        const s = stack.pop(), i = s % nx, j = (s - i) / nx, x = min[0] + (i + 0.5) * cell, z = min[2] + (j + 0.5) * cell;
        c.cells++; c.x += x; c.z += z; cells.push([x, z]);
        c.min = [Math.min(c.min[0], x), Math.min(c.min[1], z)]; c.max = [Math.max(c.max[0], x), Math.max(c.max[1], z)];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj, o = jj * nx + ii;
          if (ii >= 0 && jj >= 0 && ii < nx && jj < nz && grid[o] && !seen[o]) { seen[o] = 1; stack.push(o); }
        }
      }
      c.x /= c.cells; c.z /= c.cells;
      const ctr = [min[0] + W / 2, min[2] + D / 2];                // (its point farthest from the middle)
      c.far = cells.reduce((b, p) => (Math.hypot(p[0] - ctr[0], p[1] - ctr[1]) > Math.hypot(b[0] - ctr[0], b[1] - ctr[1]) ? p : b), cells[0]);
      comps.push(c);
    }
    return comps;
  };
  // Three heights; the middle answer.
  const cuts = [0.03, 0.06, 0.1].map(f => cut(min[1] + H * f)), order = [0, 1, 2].sort((a, b) => cuts[a].length - cuts[b].length);
  return cuts[cuts[1].length === cuts[order[1]].length ? 1 : order[1]];
}

// The two ends of the model along an axis (the outer fifth of each): how high they
// reach and how thick they are (to tell the head from the tail).
function ends(shape, axis) {
  const { min, max } = shape.box, len = max[axis] - min[axis], side = 2 - axis;
  const stat = (lo, hi) => {
    const P = points(shape, (...p) => p[axis] >= lo && p[axis] <= hi), cuts = [];
    // Thickness: the mean cross-section (width × height) of thin slices across the band.
    for (let i = 0; i < 6; i++) {
      const a = lo + (hi - lo) * i / 6, b = lo + (hi - lo) * (i + 1) / 6, S = P.filter(p => p[axis] >= a && p[axis] <= b);
      if (S.length > 1) cuts.push((Math.max(...S.map(p => p[side])) - Math.min(...S.map(p => p[side]))) * (Math.max(...S.map(p => p[1])) - Math.min(...S.map(p => p[1]))));
    }
    return { n: P.length, top: P.length ? Math.max(...P.map(p => p[1])) : -Infinity, wide: cuts.length ? cuts.reduce((s, c) => s + c, 0) / cuts.length : 0 };
  };
  return { lo: stat(min[axis] + len * 0.08, min[axis] + len * 0.3), hi: stat(max[axis] - len * 0.3, max[axis] - len * 0.08),
    loTop: stat(min[axis], min[axis] + len * 0.25).top, hiTop: stat(max[axis] - len * 0.25, max[axis]).top };
}
// The turn (degrees, as modelShape takes it) that brings a head lying along an axis, at its + or − end, to +Z.
const yawFor = (axis, plus) => (axis === 2 ? (plus ? 0 : 180) : (plus ? 270 : 90));

// A guess at what the model is: { kind, confidence 0–1, yaw (to face +Z), opts (counts), contacts }.
export function detectKind(shape) {
  const { W, H, D } = dims(shape), feet = groundContacts(shape), n = feet.length;
  const L = Math.max(W, D), B = Math.min(W, D), long = W > D ? 0 : 2;
  // Upright: how deep the body is, half way up, against its height (a person's trunk is thin; a bird's body long).
  const mid = slab(shape, 1, shape.box.min[1] + H * 0.5, shape.box.min[1] + H * 0.75), ex = mid ? mid.max[0] - mid.min[0] : W, ez = mid ? mid.max[2] - mid.min[2] : D;
  const upright = Math.round(Math.min(ex, ez) / H * 100) / 100, facing = ez <= ex ? 0 : 90;
  // The head right over the feet (a person, however chubby) or ahead of them (a bird, an animal).
  const headOver = axis => { const top = centroid(points(shape, (...p) => p[1] > shape.box.max[1] - H * 0.15)), at = feet.reduce((s, c) => s + (axis ? c.z : c.x), 0) / (n || 1);
    return top && n ? Math.abs(top[axis] - at) / (axis ? D : W) : 1; };
  const out = (kind, confidence, yaw = 0, opts = {}) => ({ kind, confidence: Math.round(Math.max(0.1, Math.min(0.95, confidence)) * 100) / 100, yaw, opts, contacts: n, upright });
  const spread = axis => (n ? Math.max(...feet.map(c => (axis ? c.z : c.x))) - Math.min(...feet.map(c => (axis ? c.z : c.x))) : 0);
  const thicker = axis => { const e = ends(shape, axis); return e.hi.wide >= e.lo.wide; };   // the + end is the thicker one
  const higher = axis => { const e = ends(shape, axis); return e.hiTop >= e.loTop; };
  // Long and low: a snake, a worm, an eel.
  const thin = L / Math.max(B, H);
  if (thin > 3.5 && H < 0.45 * L) return out('snake', 0.55 + (thin - 3.5) * 0.05, yawFor(long, thicker(long)));
  // What lies on the ground and isn't a creature: the points of contact of a ship, an engine or a cell are not feet. Feet are small
  // (a person's two cover under 8 % of the footprint) and, with six or more legs, come in mirrored pairs.
  const cell = Math.max(W, D) / 64, footArea = Math.max(0, ...feet.map(c => c.cells)) * cell * cell / (W * D || 1);
  const mirrored = () => { const cx0 = feet.reduce((a, c) => a + c.x, 0) / n, cz0 = feet.reduce((a, c) => a + c.z, 0) / n, tol = L * 0.07;
    const has = (x, z) => feet.some(c => Math.hypot(c.x - x, c.z - z) < tol);
    const score = f => feet.filter(c => has(...f(c))).length / n;
    return Math.max(score(c => [2 * cx0 - c.x, c.z]), score(c => [c.x, 2 * cz0 - c.z]), score(c => [2 * cx0 - c.x, 2 * cz0 - c.z])); };
  if (n >= 5 && mirrored() < 0.75) return out('object', 0.5);
  if (n === 2 && footArea > 0.09) return out('object', 0.5);
  if (n >= 5) {
    if (n >= 9 || H > 0.7 * L) return out('octopus', 0.45 + (n >= 8 ? 0.1 : 0), 0, { arms: n >= 4 && n <= 12 ? n : 8 });
    // Legs spread more across the body than along it; the abdomen is the thicker end.
    const across = spread(0) >= spread(1) ? 0 : 2, along = 2 - across;
    return out('spider', 0.65, yawFor(along, !thicker(along)), { legs: n >= 7 ? 8 : 6 });
  }
  if (n === 2) {
    const across = Math.abs(feet[0].x - feet[1].x) >= Math.abs(feet[0].z - feet[1].z) ? 0 : 2, along = 2 - across, depth = along ? D : W;
    if (H > 2.2 * depth || upright < 0.4 || headOver(along) < 0.22) return out('person', 0.5 + Math.max(0, Math.min(0.4, (0.4 - upright) * 1.5)), across === 0 ? 0 : 90);
    return out('bird', 0.55, yawFor(along, higher(along)));
  }
  if (n === 3 || n === 4) {
    const along = spread(0) > spread(1) ? 0 : 2, across = 2 - along, lenExt = along ? D : W, sideExt = across ? D : W;
    const head = higher(along);
    if (n === 3 && headOver(along) < 0.12 && headOver(across) < 0.12) return out('person', 0.45, facing);
    if (sideExt > Math.max(2.5 * spread(across), 0.75 * lenExt)) return out('winged', 0.55, yawFor(along, head));
    // Furniture and vehicles: legs (wheels) right at the ends, or the middle higher than both ends.
    const { min, max } = shape.box, pos = feet.map(c => (along ? c.z : c.x)), lo = min[along], hi = max[along];
    const over = Math.max(Math.min(...pos) - lo, hi - Math.max(...pos)) / lenExt, e = ends(shape, along);
    if (over < 0.12 || Math.max(e.loTop, e.hiTop) < shape.box.min[1] + 0.8 * H) return out('object', 0.45);
    return out('animal', n === 4 ? 0.7 : 0.5, yawFor(along, head));
  }
  // Nothing (or one piece) on the ground: a fish if long and flat sideways, a statue-like person if tall.
  if (L > 1.8 * H && L > 2 * B && H > 1.1 * B) return out('fish', 0.5, yawFor(long, thicker(long)));
  if (H > 2 * L || (upright < 0.3 && H > 1.2 * L)) return out('person', 0.4, facing);
  return out('object', 0.5);
}

// ---- Binding the mesh to the bones ---------------------------------------------------------
// Each bone: from its joint to its child (the first), or a short tip for the ends.
function bones(kind, J, list = skeletonOf(kind, J)) {
  return list.map(([name, parent]) => {
    const kids = list.filter(([, p]) => p === name).map(([n]) => n);
    const main = kids.find(k => !/^(arm|thigh|leg|tail|wing|fin|abdomen)/.test(k)) || kids[0];
    let end;
    if (main) end = J[main];
    else {                                                       // the ends: a tip beyond the joint
      const from = parent ? J[parent] : J[name], dir = sub(J[name], from), l = Math.hypot(...dir) || 1, d = norm(dir);
      const reach = name === 'tail' ? 2 : /^hem[FBLR]t$/.test(name) ? 0.05 : /^(paw|foot)/.test(name) ? 0.4 : /^(tail|arm)\d/.test(name) ? 0.9 : /^bend/.test(name) ? 0.8 : 0.5;
      end = name === 'head' ? add(J[name], kind === 'person' ? [0, l * 1.2, 0] : scale(d, l * (['animal', 'winged', 'bird', 'spider'].includes(kind) ? 1.5 : 0.8)))
        : add(J[name], scale(d, l * reach));
      if (/^foot[LR]$/.test(name)) end = add(J[name], [0, 0, l * 0.5]);
    }
    return { name, a: J[name], b: end };
  });
}
// Up to four bones per vertex, the nearest ones weighing most (smooth bends at
// the joints). Plain loops over typed arrays: models can have 100 000+ vertices.
// cx: the middle line of the body (x): a limb's bones belong to one side of it, so a vertex far on the other side doesn't follow
// them — two legs close together (a child, a dress) would otherwise drag each other's cloth along.
export function bindWeights(pos, B, H, cx = null, hipY = null, geo = null) {
  const n = pos.length / 3, nb = B.length, joints = new Uint8Array(n * 4), weights = new Float32Array(n * 4), eps = H * 0.004;
  const A = new Float64Array(nb * 3), D = new Float64Array(nb * 3), L2 = new Float64Array(nb);
  B.forEach((bn, j) => { for (let c = 0; c < 3; c++) { A[j * 3 + c] = bn.a[c]; D[j * 3 + c] = bn.b[c] - bn.a[c]; } L2[j] = D[j * 3] ** 2 + D[j * 3 + 1] ** 2 + D[j * 3 + 2] ** 2 || 1; });
  const bd = new Float64Array(4), bj = new Int32Array(4), nearJ = new Uint8Array(n), nearD = new Float32Array(n);
  const side = B.map(bn => (cx != null && /^(arm|forearm|hand|thigh|shin|foot|leg|knee|paw|wing)/.test(bn.name) ? (/L$/.test(bn.name) ? 1 : /R$/.test(bn.name) ? -1 : 0) : 0));
  const thighy = B.map(bn => /^(thigh|shin|foot)[LR]$/.test(bn.name));
  for (let k = 0; k < n; k++) {
    const px = pos[k * 3], py = pos[k * 3 + 1], pz = pos[k * 3 + 2], gv = geo ? geo.at(px, py, pz) : -1;
    bd.fill(Infinity); bj.fill(0);
    for (let j = 0; j < nb; j++) {                           // distance to the bone (a segment)
      const ax = px - A[j * 3], ay = py - A[j * 3 + 1], az = pz - A[j * 3 + 2], dx = D[j * 3], dy = D[j * 3 + 1], dz = D[j * 3 + 2];
      const t = Math.max(0, Math.min(1, (ax * dx + ay * dy + az * dz) / L2[j]));
      let d = Math.hypot(ax - dx * t, ay - dy * t, az - dz * t);
      if (gv >= 0) { const g = geo.dist(j, gv); d = isFinite(g) ? Math.max(d, g) : d * 4 + H * 0.2; }   // (through the body, not through the air)
      if (hipY != null && thighy[j] && py > hipY - H * 0.015) d *= 1 + 1.4 * Math.min(1, (py - (hipY - H * 0.015)) / (H * 0.08));   // (the belt and what is above the hips follow the trunk, not the thighs)
      if (side[j]) { const away = -(px - cx) * side[j] / (H * 0.05); if (away > 0.2) d *= 1 + 1.5 * Math.min(1, away); }   // (on the other side of the body)
      if (d >= bd[3]) continue;
      let at = 3; while (at > 0 && bd[at - 1] > d) { bd[at] = bd[at - 1]; bj[at] = bj[at - 1]; at--; }
      bd[at] = d; bj[at] = j;
    }
    nearJ[k] = bj[0]; nearD[k] = bd[0];
    const cut = bd[0] * 1.6 + H * 0.02; let sum = 0;
    for (let c = 0; c < 4; c++) { const w = bd[c] > cut || !isFinite(bd[c]) ? 0 : 1 / Math.pow(bd[c] + eps, 4); weights[k * 4 + c] = w; joints[k * 4 + c] = bj[c]; sum += w; }
    for (let c = 0; c < 4; c++) weights[k * 4 + c] /= sum || 1;
  }
  return { joints, weights, near: { joint: nearJ, dist: nearD } };
}


// The surface as a graph of welded points (a model comes with every seam doubled): wid[k] is vertex k's point, and A[e]–B[e]
// are the edges between points; len is their mean length.
function weldGraph(pos, idx, q) {
  const n = pos.length / 3, key = new Map(), wid = new Int32Array(n); let m = 0;
  for (let k = 0; k < n; k++) {
    const h = Math.round(pos[k * 3] / q) + ',' + Math.round(pos[k * 3 + 1] / q) + ',' + Math.round(pos[k * 3 + 2] / q);
    let id = key.get(h); if (id === undefined) { id = m++; key.set(h, id); } wid[k] = id;
  }
  const seen = new Set(), A = [], B = []; let len = 0;
  for (let t = 0; t + 2 < idx.length; t += 3) for (let e = 0; e < 3; e++) {
    const i = idx[t + e], j = idx[t + (e + 1) % 3], a = wid[i], b = wid[j]; if (a === b) continue;
    const k2 = a < b ? a * m + b : b * m + a; if (seen.has(k2)) continue; seen.add(k2); A.push(a); B.push(b);
    len += Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2]);
  }
  return { wid, m, A, B, len: A.length ? len / A.length : 0 };
}

// Weights smoothed over the surface: a loose tunic, a skirt or a cape follows its neighbours instead of whichever bone is
// nearest, so it opens with the legs instead of tearing or swelling. Welded by position (a model comes with every seam
// doubled); `radius` (in model units) is how far along the surface the blend reaches.
export function smoothWeights(pos, idx, joints, weights, nb, radius) {
  const n = pos.length / 3; if (!idx || !idx.length || !n) return { joints, weights };
  const { wid, m, A, B, len: step } = weldGraph(pos, idx, radius / 12 || 1e-4); if (!A.length) return { joints, weights };
  const iters = Math.max(1, Math.min(60, Math.round((radius / step) ** 2 / 1.5)));
  let cur = new Float32Array(m * nb), nxt = new Float32Array(m * nb); const cnt = new Float32Array(m);
  for (let k = 0; k < n; k++) { const id = wid[k]; cnt[id]++; for (let c = 0; c < 4; c++) cur[id * nb + joints[k * 4 + c]] += weights[k * 4 + c]; }
  for (let id = 0; id < m; id++) if (cnt[id] > 1) for (let b = 0; b < nb; b++) cur[id * nb + b] /= cnt[id];
  const deg = new Float32Array(m); for (let e = 0; e < A.length; e++) { deg[A[e]]++; deg[B[e]]++; }
  for (let it = 0; it < iters; it++) {
    nxt.fill(0);
    for (let e = 0; e < A.length; e++) { const a = A[e] * nb, b = B[e] * nb; for (let c = 0; c < nb; c++) { nxt[a + c] += cur[b + c]; nxt[b + c] += cur[a + c]; } }
    for (let id = 0; id < m; id++) { const d = deg[id] || 1, o = id * nb; for (let c = 0; c < nb; c++) cur[o + c] = 0.5 * cur[o + c] + 0.5 * (deg[id] ? nxt[o + c] / d : cur[o + c]); }
  }
  // Back to four influences per vertex: the biggest, renormalised.
  const J2 = new Uint8Array(n * 4), W2 = new Float32Array(n * 4);
  for (let k = 0; k < n; k++) {
    const o = wid[k] * nb, best = [[-1, 0], [-1, 0], [-1, 0], [-1, 0]];
    for (let c = 0; c < nb; c++) { const w = cur[o + c]; if (w <= best[3][1]) continue; let at = 3; while (at > 0 && best[at - 1][1] < w) { best[at] = best[at - 1]; at--; } best[at] = [c, w]; }
    let sum = 0; for (let c = 0; c < 4; c++) sum += best[c][1];
    for (let c = 0; c < 4; c++) { J2[k * 4 + c] = Math.max(0, best[c][0]); W2[k * 4 + c] = sum ? best[c][1] / sum : (c ? 0 : 1); }
  }
  return { joints: J2, weights: W2 };
}


// ---- Distances through the body's volume (geodesic voxel binding) -------------------------------------------------------
// The straight-line distance from a vertex to a bone ignores the body: the cloth of a tunic is nearer the other leg than its
// own, an arm hanging against the trunk is as near the trunk's bone. Here the model is voxelised (its surface, and what is inside
// it), and each bone's distance is measured walking through the voxels (Dionne & de Lasa, 2013): what is far *inside the
// shape* from a bone is far, however close it is in a straight line. Works with open or broken meshes too: then it walks over
// the surface alone. → { at(vertexPos) → voxel, dist(bone, voxel) → distance in model units } or null (too big or empty).
export function volumeDistances(shape, B, H) {
  const { min, max } = shape.box, cell = H / 90, pad = 2;
  const nx = Math.ceil((max[0] - min[0]) / cell) + 2 * pad + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 2 * pad + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 2 * pad + 1, N = nx * ny * nz;
  if (N > 1.5e6 || !B.length) return null;   // (a bigger grid would weigh too much in a browser tab)
  const vi = (x, y, z) => ((Math.floor((x - min[0]) / cell) + pad) * ny + Math.floor((y - min[1]) / cell) + pad) * nz + Math.floor((z - min[2]) / cell) + pad;
  const ok = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz;
  const surf = new Uint8Array(N);                                       // 1: the surface
  const mark = (x, y, z) => { const i = Math.floor((x - min[0]) / cell) + pad, j = Math.floor((y - min[1]) / cell) + pad, k = Math.floor((z - min[2]) / cell) + pad; if (ok(i, j, k)) surf[(i * ny + j) * nz + k] = 1; };
  for (const { pos, idx } of shape.parts) {
    if (!idx) continue;
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const e = Math.max(Math.hypot(pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]), Math.hypot(pos[b] - pos[c], pos[b + 1] - pos[c + 1], pos[b + 2] - pos[c + 2]), Math.hypot(pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]));
      const st = Math.max(1, Math.ceil(e / (cell * 0.6)));
      for (let u = 0; u <= st; u++) for (let v = 0; v <= st - u; v++) { const w = st - u - v, fu = u / st, fv = v / st, fw = w / st;
        mark(pos[a] * fu + pos[b] * fv + pos[c] * fw, pos[a + 1] * fu + pos[b + 1] * fv + pos[c + 1] * fw, pos[a + 2] * fu + pos[b + 2] * fv + pos[c + 2] * fw); }
    }
  }
  // Outside = reachable from the corner without crossing the surface (6 neighbours); allowed = the surface and what is inside.
  const outside = new Uint8Array(N), stack = new Int32Array(N); let sp = 0;
  stack[sp++] = 0; outside[0] = 1;
  while (sp) { const c = stack[--sp], k = c % nz, j = ((c - k) / nz) % ny, i = ((c - k) / nz - j) / ny;
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const ii = i + di, jj = j + dj, kk = k + dk; if (!ok(ii, jj, kk)) continue; const o = (ii * ny + jj) * nz + kk; if (!outside[o] && !surf[o]) { outside[o] = 1; stack[sp++] = o; } } }
  const allowed = new Uint8Array(N); let nAllowed = 0; for (let i = 0; i < N; i++) if (!outside[i]) { allowed[i] = 1; nAllowed++; }
  if (!nAllowed) return null;
  // One 3-4-5 chamfer distance per bone (Dial's buckets), from the voxels the bone passes through (snapped to the nearest allowed one).
  const offs = []; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) { const m = Math.abs(di) + Math.abs(dj) + Math.abs(dk); if (m) offs.push([di, dj, dk, m === 1 ? 3 : m === 2 ? 4 : 5, (di * ny + dj) * nz + dk]); }
  const near = (i, j, k) => { for (let r = 0; r <= 6; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) for (let dk = -r; dk <= r; dk++) { if (Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)) !== r) continue; const ii = i + di, jj = j + dj, kk = k + dk; if (ok(ii, jj, kk) && allowed[(ii * ny + jj) * nz + kk]) return (ii * ny + jj) * nz + kk; } return -1; };
  const D = B.map(bn => {
    const dist = new Uint16Array(N).fill(65535), len = Math.hypot(bn.b[0] - bn.a[0], bn.b[1] - bn.a[1], bn.b[2] - bn.a[2]), steps = Math.max(1, Math.ceil(len / (cell * 0.5)));
    const buckets = [[]];
    for (let s = 0; s <= steps; s++) { const f = s / steps, i = Math.floor((bn.a[0] + (bn.b[0] - bn.a[0]) * f - min[0]) / cell) + pad, j = Math.floor((bn.a[1] + (bn.b[1] - bn.a[1]) * f - min[1]) / cell) + pad, k = Math.floor((bn.a[2] + (bn.b[2] - bn.a[2]) * f - min[2]) / cell) + pad;
      const o = near(i, j, k); if (o >= 0 && dist[o] !== 0) { dist[o] = 0; buckets[0].push(o); } }
    for (let d = 0; d < buckets.length; d++) { const bk = buckets[d]; if (!bk) continue;
      for (let q = 0; q < bk.length; q++) { const c = bk[q]; if (dist[c] !== d) continue; const k = c % nz, j = ((c - k) / nz) % ny, i = ((c - k) / nz - j) / ny;
        for (const [di, dj, dk, w, off] of offs) { const ii = i + di, jj = j + dj, kk = k + dk; if (!ok(ii, jj, kk)) continue; const o = c + off; if (!allowed[o]) continue; const nd = d + w; if (nd < dist[o]) { dist[o] = nd; (buckets[nd] ||= []).push(o); } } }
      buckets[d] = null; }
    return dist;
  });
  return { at: (x, y, z) => vi(x, y, z), dist: (b, v) => { const d = D[b][v]; return d === 65535 ? Infinity : d * cell / 3; } };
}


// ---- Weights by heat diffusion (Baran & Popović 2007; the «automatic weights» of Blender and Maya) --------------------------
// Each bone is a heat source on the model's surface: its weights solve (L + H) w = H p, with L the surface's cotangent Laplacian,
// p = 1 where that bone is the nearest one and H = 1 / d² (d: the distance to the nearest bone, through the body: volumeDistances).
// Smooth, positive and without the tears of «nearest bone»: measured with Blender's own implementation on the same skeleton and
// the same walk, 27–43 % fewer stretched or squashed edges. A few seconds on a model of 70 000 vertices: for the final model, not
// for every drag of a joint. near: { joint: Uint8Array (nearest bone per vertex), dist: Float32Array (its distance) }.
export function heatWeights(pos, idx, nb, H, near, onFail = null) {
  const n = pos.length / 3;
  const { wid, m } = weldGraph(pos, idx, H * 0.0025);
  const rep = new Int32Array(m); for (let k = 0; k < n; k++) rep[wid[k]] = k;
  const px = i => pos[rep[i] * 3], py = i => pos[rep[i] * 3 + 1], pz = i => pos[rep[i] * 3 + 2];
  // Cotangent weights per edge and the area of each point.
  const ew = new Map(), area = new Float64Array(m);
  const addE = (a, b, w) => { const k = a < b ? a * m + b : b * m + a; ew.set(k, (ew.get(k) || 0) + w); };
  for (let t = 0; t + 2 < idx.length; t += 3) {
    const a = wid[idx[t]], b = wid[idx[t + 1]], c = wid[idx[t + 2]]; if (a === b || b === c || a === c) continue;
    const A = [px(a), py(a), pz(a)], Bv = [px(b), py(b), pz(b)], C = [px(c), py(c), pz(c)];
    const cotAt = (P, Q, R) => { const u = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]], v = [R[0] - P[0], R[1] - P[1], R[2] - P[2]], cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...cr);
      return l < 1e-14 ? 0 : (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / l; };
    const ar = Math.hypot((Bv[1] - A[1]) * (C[2] - A[2]) - (Bv[2] - A[2]) * (C[1] - A[1]), (Bv[2] - A[2]) * (C[0] - A[0]) - (Bv[0] - A[0]) * (C[2] - A[2]), (Bv[0] - A[0]) * (C[1] - A[1]) - (Bv[1] - A[1]) * (C[0] - A[0])) / 2;
    area[a] += ar / 3; area[b] += ar / 3; area[c] += ar / 3;
    addE(b, c, 0.5 * cotAt(A, Bv, C)); addE(a, c, 0.5 * cotAt(Bv, A, C)); addE(a, b, 0.5 * cotAt(C, A, Bv));
  }
  // CSR adjacency (negative cotangents are dropped: they only make the system lose its positivity).
  const deg = new Int32Array(m + 1), E = []; for (const [k, w] of ew) if (w > 1e-9) { const a = Math.floor(k / m), b = k - a * m; E.push([a, b, w]); deg[a + 1]++; deg[b + 1]++; }
  for (let i = 0; i < m; i++) deg[i + 1] += deg[i];
  const nbr = new Int32Array(deg[m]), wt = new Float64Array(deg[m]), fill = deg.slice(0, m), diagL = new Float64Array(m);
  for (const [a, b, w] of E) { nbr[fill[a]] = b; wt[fill[a]++] = w; nbr[fill[b]] = a; wt[fill[b]++] = w; diagL[a] += w; diagL[b] += w; }
  const nearest = new Int32Array(m), dist = new Float64Array(m);
  for (let i = 0; i < m; i++) { nearest[i] = near.joint[rep[i]]; dist[i] = Math.max(near.dist[rep[i]], H * 0.004); }
  const Hd = new Float64Array(m), diag = new Float64Array(m); for (let i = 0; i < m; i++) { Hd[i] = area[i] / (dist[i] * dist[i]); diag[i] = diagL[i] + Hd[i] || 1; }
  const W = new Float32Array(m * nb), mv = (x, out) => { for (let i = 0; i < m; i++) { let s = diag[i] * x[i]; for (let e = deg[i]; e < deg[i + 1]; e++) s -= wt[e] * x[nbr[e]]; out[i] = s; } };
  const x = new Float64Array(m), r = new Float64Array(m), z = new Float64Array(m), pp = new Float64Array(m), Ap = new Float64Array(m), rhs = new Float64Array(m);
  for (let j = 0; j < nb; j++) {
    let any = false; for (let i = 0; i < m; i++) { rhs[i] = nearest[i] === j ? Hd[i] : 0; if (rhs[i]) any = true; } if (!any) continue;
    let bn = 0; for (let i = 0; i < m; i++) { x[i] = nearest[i] === j ? 1 : 0; bn += rhs[i] * rhs[i]; }
    mv(x, Ap); let rz = 0; for (let i = 0; i < m; i++) { r[i] = rhs[i] - Ap[i]; z[i] = r[i] / diag[i]; pp[i] = z[i]; rz += r[i] * z[i]; }
    for (let it = 0; it < 150 && rz > 1e-8 * (bn || 1); it++) {
      mv(pp, Ap); let pAp = 0; for (let i = 0; i < m; i++) pAp += pp[i] * Ap[i]; const al = rz / (pAp || 1);
      let rz2 = 0; for (let i = 0; i < m; i++) { x[i] += al * pp[i]; r[i] -= al * Ap[i]; z[i] = r[i] / diag[i]; rz2 += r[i] * z[i]; }
      const be = rz2 / (rz || 1); rz = rz2; for (let i = 0; i < m; i++) pp[i] = z[i] + be * pp[i];
    }
    for (let i = 0; i < m; i++) W[i * nb + j] = Math.max(0, x[i]);
  }
  // Back to four influences per vertex.
  const J2 = new Uint8Array(n * 4), W2 = new Float32Array(n * 4);
  for (let k = 0; k < n; k++) {
    const o = wid[k] * nb, best = [[-1, 0], [-1, 0], [-1, 0], [-1, 0]];
    for (let c = 0; c < nb; c++) { const w = W[o + c]; if (w <= best[3][1]) continue; let at = 3; while (at > 0 && best[at - 1][1] < w) { best[at] = best[at - 1]; at--; } best[at] = [c, w]; }
    let sum = 0; for (let c = 0; c < 4; c++) sum += best[c][1];
    if (!sum) { J2[k * 4] = near.joint[k]; W2[k * 4] = 1; continue; }
    for (let c = 0; c < 4; c++) { J2[k * 4 + c] = Math.max(0, best[c][0]); W2[k * 4 + c] = best[c][1] / sum; }
  }
  return { joints: J2, weights: W2 };
}


// Joints that fall outside the body (an arm joint at the edge of a shoulder, a hand beyond a cape) are brought to the nearest voxel
// inside the model: a skeleton whose bones leave the mesh binds the cloth to the wrong bones.
export function snapInside(shape, J, H) {
  const { min, max } = shape.box, cell = H / 90, pad = 2;
  const nx = Math.ceil((max[0] - min[0]) / cell) + 2 * pad + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 2 * pad + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 2 * pad + 1, N = nx * ny * nz;
  if (N > 1.5e6) return J;
  const ok = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz, at = (i, j, k) => (i * ny + j) * nz + k;
  const surf = new Uint8Array(N), mark = (x, y, z) => { const i = Math.floor((x - min[0]) / cell) + pad, j = Math.floor((y - min[1]) / cell) + pad, k = Math.floor((z - min[2]) / cell) + pad; if (ok(i, j, k)) surf[at(i, j, k)] = 1; };
  for (const { pos, idx } of shape.parts) { if (!idx) continue;
    for (let t = 0; t + 2 < idx.length; t += 3) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3, e = Math.max(Math.hypot(pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]), Math.hypot(pos[b] - pos[c], pos[b + 1] - pos[c + 1], pos[b + 2] - pos[c + 2]), Math.hypot(pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2])), st = Math.max(1, Math.ceil(e / (cell * 0.6)));
      for (let u = 0; u <= st; u++) for (let v = 0; v <= st - u; v++) { const fu = u / st, fv = v / st, fw = (st - u - v) / st; mark(pos[a] * fu + pos[b] * fv + pos[c] * fw, pos[a + 1] * fu + pos[b + 1] * fv + pos[c + 1] * fw, pos[a + 2] * fu + pos[b + 2] * fv + pos[c + 2] * fw); } } }
  const outside = new Uint8Array(N), stack = new Int32Array(N); let sp = 0; stack[sp++] = 0; outside[0] = 1;
  while (sp) { const c = stack[--sp], k = c % nz, j = ((c - k) / nz) % ny, i = ((c - k) / nz - j) / ny;
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const ii = i + di, jj = j + dj, kk = k + dk; if (!ok(ii, jj, kk)) continue; const o = at(ii, jj, kk); if (!outside[o] && !surf[o]) { outside[o] = 1; stack[sp++] = o; } } }
  const inside = (i, j, k) => ok(i, j, k) && !outside[at(i, j, k)] && !surf[at(i, j, k)];       // (really inside: not on the skin)
  let any = false; for (let i = 0; i < N; i++) if (!outside[i] && !surf[i]) { any = true; break; } if (!any) return J;   // (an open mesh has no inside)
  const out = {};
  for (const [name, p] of Object.entries(J)) {
    if (!/^(arm|forearm|hand|shin|foot)/.test(name)) { out[name] = p; continue; }       // (the middle line — hips, spine, chest, neck, head — stays where the proportions put it)
    const i0 = Math.floor((p[0] - min[0]) / cell) + pad, j0 = Math.floor((p[1] - min[1]) / cell) + pad, k0 = Math.floor((p[2] - min[2]) / cell) + pad;
    if (inside(i0, j0, k0)) { out[name] = p; continue; }
    let best = null;
    for (let r = 1; r <= 4 && !best; r++) { let bd = Infinity;       // (at most 4 voxels ≈ 4 % of the height: a nudge, not a move)
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) for (let dk = -r; dk <= r; dk++) { if (Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)) !== r) continue;
        if (inside(i0 + di, j0 + dj, k0 + dk)) { const d = di * di + 2 * dj * dj + dk * dk; if (d < bd) { bd = d; best = [min[0] + (i0 + di - pad + 0.5) * cell, min[1] + (j0 + dj - pad + 0.5) * cell, min[2] + (k0 + dk - pad + 0.5) * cell]; } } } }
    out[name] = best || p;
  }
  for (const k of Object.getOwnPropertyNames(J)) if (!(k in out)) Object.defineProperty(out, k, { value: J[k], enumerable: false });
  return out;
}



// How far a person walking with the Walk clip advances in one cycle, in heights of its body: the planted foot goes back relative to the
// body by D during the 60 % of the cycle that it is down, so the body goes D / 0.6 ahead per cycle (a walk that doesn't skate). The
// player uses it to play the clip as fast as the object moves along its path.
export function walkStride(J, H) {
  const z = t => A_posedFootZ(J, H, t);
  return Math.max(0.2, (z(0) - z(0.6)) / 0.6 / H);
}
function A_posedFootZ(J, H, t) { const q = posedJoints('person', J, 'Walk', t, H); return q.footL[2]; }

// ---- Weights refined by looking at the movement ---------------------------------------------------------------------------
// The skeleton is posed (walking, running, waving…) and every vertex gets a score: how much the edges around it stretch or squash.
// Where it is high — loose cloth between the legs, a cape, the crook of an elbow — the weights are blended with the neighbours'
// until it isn't: the cloth stops following one bone and goes with the surface around it. Directly lowers what tools/rig-metrics.mjs
// counts. poses: [bone matrices (as arrays of 16, in the order of the bones)] for each sampled pose.
export function refineWeights(pos, idx, joints, weights, nb, poses, H, { rounds = 5, limit = 0.22, lambda = 0.6 } = {}) {
  const n = pos.length / 3, { wid, m, A, B } = weldGraph(pos, idx, H * 0.0025); if (!A.length || !poses.length) return { joints, weights };
  const rep = new Int32Array(m); for (let k = 0; k < n; k++) rep[wid[k]] = k;
  let cur = new Float32Array(m * nb); const cnt = new Float32Array(m);
  for (let k = 0; k < n; k++) { const id = wid[k]; cnt[id]++; for (let c = 0; c < 4; c++) cur[id * nb + joints[k * 4 + c]] += weights[k * 4 + c]; }
  for (let id = 0; id < m; id++) if (cnt[id] > 1) for (let b = 0; b < nb; b++) cur[id * nb + b] /= cnt[id];
  const deg = new Int32Array(m + 1); for (let e = 0; e < A.length; e++) { deg[A[e] + 1]++; deg[B[e] + 1]++; } for (let i = 0; i < m; i++) deg[i + 1] += deg[i];
  const nbr = new Int32Array(deg[m]), fill = deg.slice(0, m); for (let e = 0; e < A.length; e++) { nbr[fill[A[e]]++] = B[e]; nbr[fill[B[e]]++] = A[e]; }
  const restLen = new Float32Array(nbr.length); for (let i = 0; i < m; i++) for (let e = deg[i]; e < deg[i + 1]; e++) { const a = rep[i] * 3, b = rep[nbr[e]] * 3; restLen[e] = Math.hypot(pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]); }
  const D = poses.map(() => new Float32Array(m * 3)), score = new Float32Array(m);
  for (let r = 0; r < rounds; r++) {
    poses.forEach((M, p) => { const out = D[p];
      for (let i = 0; i < m; i++) { const x = pos[rep[i] * 3], y = pos[rep[i] * 3 + 1], z = pos[rep[i] * 3 + 2]; let ox = 0, oy = 0, oz = 0;
        for (let b = 0; b < nb; b++) { const w = cur[i * nb + b]; if (w < 1e-4) continue; const T = M[b]; ox += w * (T[0] * x + T[4] * y + T[8] * z + T[12]); oy += w * (T[1] * x + T[5] * y + T[9] * z + T[13]); oz += w * (T[2] * x + T[6] * y + T[10] * z + T[14]); }
        out[i * 3] = ox; out[i * 3 + 1] = oy; out[i * 3 + 2] = oz; } });
    score.fill(0); let bad = 0;
    for (let i = 0; i < m; i++) { let s = 0, c = 0;
      for (let e = deg[i]; e < deg[i + 1]; e++) { const l0 = restLen[e]; if (l0 < 1e-7) continue; const j = nbr[e];
        for (let p = 0; p < D.length; p++) { const d = D[p], l = Math.hypot(d[i * 3] - d[j * 3], d[i * 3 + 1] - d[j * 3 + 1], d[i * 3 + 2] - d[j * 3 + 2]) / l0; s += Math.abs(l - 1); c++; } }
      score[i] = c ? s / c : 0; if (score[i] > limit) bad++; }
    if (!bad) break;
    // The bad points take their neighbours' weights (a few passes, so the blend reaches a bit around them).
    for (let pass = 0; pass < 3; pass++) {
      const next = new Float32Array(cur);
      for (let i = 0; i < m; i++) { const f = score[i] > limit ? lambda : score[i] > limit * 0.6 ? lambda * 0.4 : 0; if (!f || deg[i + 1] === deg[i]) continue;
        for (let b = 0; b < nb; b++) { let a = 0; for (let e = deg[i]; e < deg[i + 1]; e++) a += cur[nbr[e] * nb + b]; next[i * nb + b] = (1 - f) * cur[i * nb + b] + f * a / (deg[i + 1] - deg[i]); } }
      cur = next;
    }
  }
  const J2 = new Uint8Array(n * 4), W2 = new Float32Array(n * 4);
  for (let k = 0; k < n; k++) {
    const o = wid[k] * nb, best = [[-1, 0], [-1, 0], [-1, 0], [-1, 0]];
    for (let c = 0; c < nb; c++) { const w = cur[o + c]; if (w <= best[3][1]) continue; let at = 3; while (at > 0 && best[at - 1][1] < w) { best[at] = best[at - 1]; at--; } best[at] = [c, w]; }
    let sum = 0; for (let c = 0; c < 4; c++) sum += best[c][1];
    if (!sum) { J2[k * 4] = joints[k * 4]; W2[k * 4] = 1; continue; }
    for (let c = 0; c < 4; c++) { J2[k * 4 + c] = Math.max(0, best[c][0]); W2[k * 4 + c] = best[c][1] / sum; }
  }
  return { joints: J2, weights: W2 };
}
// The skinning matrix of every bone (in the order of `list`) at time t (0..1) of a clip.
function poseMatrices(kind, J, list, clip, t, H) {
  const pose = poseOf(kind, J, clip, t, H, list), L = localTurns(list, pose.P), world = {};
  return list.map(([name, parent]) => {
    const local = M4.trs(parent ? sub(J[name], J[parent]) : add(J[name], [0, pose.lift, 0]), L[name]);
    world[name] = parent ? M4.mul(world[parent], local) : local;
    return M4.mul(world[name], M4.trs(scale(J[name], -1)));
  });
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
  // The foot doesn't follow the shin's tilt: it keeps flat on the ground, toe up a little at the heel strike (the shin leaning
  // forward) and toe down as it pushes off (the shin leaning back).
  const foot = (s, swing, knee) => { const a = swing - knee, pitch = a > 0 ? -0.4 * a : -0.75 * a; P['foot' + s] = Q.axis(X, Math.max(-18, Math.min(32, pitch))); };
  const arm = (s, dir, fore) => { P['arm' + s] = limbTo(J, 'arm' + s, 'forearm' + s, dir); P['forearm' + s] = limbTo(J, 'forearm' + s, 'hand' + s, fore || dir); P['hand' + s] = P['forearm' + s]; };
  const body = (bend = 0, twist = 0, side = 0) => { const q = Q.mul(Q.axis(Y, twist), Q.mul(Q.axis(X, bend), Q.axis(Z, side))); P.spine = q; P.chest = q; P.neck = q; P.head = q; };
  if (clip === 'Walk') {
    // A human gait, by its known curves (heel strike at the start of the cycle): the hip goes from flexed to extended and back; the knee
    // bends a little to take the weight and a lot to bring the leg forward; the foot lands on its heel, rolls flat and leaves by the toes;
    // the arms swing against the legs with the elbow more bent when they are forward; the pelvis turns against the shoulders and the
    // head stays looking ahead. The pelvis is raised or lowered so the foot that is down is always on the ground (that gives the bob).
    const bump = (x, c, w) => { const d = (((x - c + 0.5) % 1) + 1) % 1 - 0.5; return Math.exp(-(d * d) / (2 * w * w)); };
    const hipA = f => 3 + 22 * Math.cos(2 * Math.PI * (f - 0.02));
    const kneeA = f => 4 + 14 * bump(f, 0.12, 0.06) + 56 * bump(f, 0.72, 0.09);
    const toeDown = f => -14 * bump(f, 0.0, 0.04) + 30 * bump(f, 0.58, 0.07) - 6 * bump(f, 0.82, 0.08);
    for (const [s, off] of [['L', 0], ['R', 0.5]]) {
      const f = (t + off) % 1, hv = hipA(f);
      leg(s, hv, kneeA(f)); P['foot' + s] = Q.axis(X, toeDown(f));
      const sw = -17 * Math.cos(2 * Math.PI * (f - 0.02)), flex = 14 + 14 * Math.max(0, sw / 17);
      arm(s, downOut(S[s], 9, sw), downOut(S[s], 7, sw + flex));
    }
    const c = Math.cos(2 * Math.PI * (t - 0.02));
    body(3, 5 * c, 1.5 * Math.sin(2 * Math.PI * t));
    P.neck = Q.axis(Y, 2.5 * c); P.head = NONE;
    P.hips = Q.mul(Q.axis(Y, -5 * c), Q.axis(Z, 2.5 * Math.sin(2 * Math.PI * t)));
    const footY = s => { const T = add(J.hips, Q.rotate(P.hips, sub(J['thigh' + s], J.hips))), k = add(T, Q.rotate(P['thigh' + s], sub(J['shin' + s], J['thigh' + s])));
      return add(k, Q.rotate(P['shin' + s], sub(J['foot' + s], J['shin' + s])))[1]; };
    lift = Math.min(J.footL[1], J.footR[1]) - Math.min(footY('L'), footY('R'));
  } else if (clip === 'Run') {
    // A run: a short flight with both feet in the air; the knee folds up behind during the swing, the arms are bent at the elbow and
    // pump, the body leans forward, and the pelvis bounces (up in the flight, twice per cycle).
    const bump = (x, c, w) => { const d = (((x - c + 0.5) % 1) + 1) % 1 - 0.5; return Math.exp(-(d * d) / (2 * w * w)); };
    const hipA = f => 3 + 30 * Math.cos(2 * Math.PI * (f - 0.04));
    const kneeA = f => 20 + 12 * bump(f, 0.1, 0.06) + 78 * bump(f, 0.8, 0.1);   // (the most folded as the thigh passes under the body, going forward)
    const toeDown = f => -8 * bump(f, 0.0, 0.04) + 38 * bump(f, 0.55, 0.07) - 10 * bump(f, 0.85, 0.08);
    for (const [s, off] of [['L', 0], ['R', 0.5]]) {
      const f = (t + off) % 1; leg(s, hipA(f), kneeA(f)); P['foot' + s] = Q.axis(X, toeDown(f));
      const sw = -38 * Math.cos(2 * Math.PI * (f - 0.04)); arm(s, downOut(S[s], 10, sw), downOut(S[s], 6, sw + 85));
    }
    const c = Math.cos(2 * Math.PI * (t - 0.04));
    body(10, 7 * c, 2 * Math.sin(2 * Math.PI * t)); P.neck = Q.axis(Y, 3 * c); P.head = Q.axis(X, -6);
    P.hips = Q.mul(Q.axis(Y, -7 * c), Q.axis(Z, 3 * Math.sin(2 * Math.PI * t)));
    lift = H * 0.045 * (0.5 + 0.5 * Math.cos(4 * Math.PI * (t - 0.04 - 0.25))) - H * 0.03;
  } else if (clip === 'Idle') {
    leg('L', 0, 2); leg('R', 0, 2);
    arm('L', downOut(1, 9 + 2 * Math.sin(ph)), downOut(1, 8, 12)); arm('R', downOut(-1, 9 + 2 * Math.sin(ph)), downOut(-1, 8, 12));
    body(1.5 * Math.sin(ph), 0, 1 * Math.sin(ph)); lift = H * 0.004 * Math.sin(ph);
  } else if (clip === 'Wave') {
    // The upper arm out to the side at about the shoulder's height, the forearm up and waving; the other arm relaxed, the weight shifting a little.
    const sh = Math.sin(ph * 0.5);
    leg('L', 2 * sh, 3 + 2 * Math.max(0, sh)); leg('R', -2 * sh, 3 + 2 * Math.max(0, -sh)); foot('L', 2 * sh, 3); foot('R', -2 * sh, 3);
    arm('L', downOut(1, 9 + 2 * Math.sin(ph), 4 * sh), downOut(1, 7, 14));
    const w = 26 * Math.sin(ph * 2);
    arm('R', downOut(-1, 14, 12), norm([-0.15 - Math.sin(w * deg) * 0.6, 0.5 + 0.1 * Math.cos(w * deg), 0.85]));   // (a friendly wave: the upper arm stays down, the forearm rises in front and waves; a high arm drags the side of a tunic along)
    body(0, 3 * Math.sin(ph * 0.5), -3); P.hips = Q.axis(Z, 2 * sh);
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
// The turn raising a limb (from joint a towards b) by d degrees about its horizontal
// hinge: whatever way it points out from the body, positive lifts it.
function raise(J, a, b, d) {
  const v = sub(J[b], J[a]), k = [-v[2], 0, v[0]], l = Math.hypot(k[0], k[2]);
  return Q.axis(l > 1e-9 ? [k[0] / l, 0, k[2] / l] : J[b][0] >= J[a][0] ? Z : [0, 0, -1], d);
}
const NONE = [0, 0, 0, 1];
// Both wings: the inner part raised a1 degrees, the outer one a2 (in all).
function flap(P, J, a1, a2) {
  for (const s of 'LR') { P['wing' + s] = raise(J, 'wing' + s, 'wing2' + s, a1); P['wing2' + s] = raise(J, 'wing2' + s, 'wingTip' + s, a2); P['wingTip' + s] = P['wing2' + s]; }
}
function wingedPose(J, clip, t, H) {
  const fly = clip === 'Fly', { P, lift } = animalPose(J, fly ? 'Idle' : clip, t, H), ph = t * 2 * Math.PI;
  if (!fly) { const a = clip === 'Idle' ? 3 * Math.sin(ph) : 6 * Math.sin(ph * 2); flap(P, J, a, a); return { P, lift }; }
  const a = 45 * Math.sin(ph);
  flap(P, J, a, a + 20 * Math.sin(ph - 0.9));
  for (const s of 'LR') {                                       // legs tucked back
    P['legF' + s] = Q.axis(X, 30); P['kneeF' + s] = Q.axis(X, 85); P['pawF' + s] = P['kneeF' + s];
    P['legB' + s] = Q.axis(X, 55); P['kneeB' + s] = Q.axis(X, 70); P['pawB' + s] = P['kneeB' + s];
  }
  P.neck = Q.axis(X, 5 * Math.sin(ph * 2)); P.head = P.neck; P.tail = Q.axis(Y, 12 * Math.sin(ph));
  return { P, lift: H * (0.2 - 0.03 * Math.cos(ph)) };
}
function birdPose(J, clip, t, H) {
  const P = {}, ph = t * 2 * Math.PI; let lift = 0;
  const legs = (sl, kl, sr, kr) => { for (const [s, sw, kn] of [['L', sl, kl], ['R', sr, kr]]) { P['thigh' + s] = Q.axis(X, -sw); P['shin' + s] = Q.axis(X, kn - sw); P['foot' + s] = P['shin' + s]; } };
  if (clip === 'Fly') {
    const a = 42 * Math.sin(ph); flap(P, J, a, a + 18 * Math.sin(ph - 0.9)); legs(-50, 20, -50, 20);
    P.tail = Q.axis(X, 6 * Math.sin(ph)); P.neck = Q.axis(X, -4 * Math.sin(ph)); P.head = P.neck;
    lift = H * (0.18 - 0.03 * Math.cos(ph));
  } else if (clip === 'Walk') {
    legs(18 * Math.sin(ph), 26 * Math.max(0, Math.sin(ph + 0.6)), -18 * Math.sin(ph), 26 * Math.max(0, Math.sin(ph + Math.PI + 0.6)));
    const bob = Q.axis(X, 10 * Math.sin(ph * 2)); P.neck = bob; P.head = bob; P.tail = Q.axis(X, -5 * Math.sin(ph * 2));
    flap(P, J, 3, 3); lift = H * 0.015 * Math.abs(Math.sin(ph));
  } else if (clip === 'Hop') {
    const up = Math.max(0, Math.sin(ph)), cr = Math.max(0, -Math.sin(ph));
    legs(15 * cr - 20 * up, 40 * cr, 15 * cr - 20 * up, 40 * cr); flap(P, J, 22 * up, 30 * up);
    P.tail = Q.axis(X, -10 * up); lift = H * (0.14 * up - 0.03 * cr);
  } else {                                                       // Idle: looks around, pecks
    const look = Q.axis(Y, 25 * Math.sin(ph)), peck = Q.axis(X, 18 * Math.max(0, Math.sin(ph * 2 - 1)) ** 3);
    P.neck = look; P.head = Q.mul(look, peck); P.tail = Q.axis(Y, 8 * Math.sin(ph * 3));
    flap(P, J, 2 * Math.sin(ph), 2 * Math.sin(ph)); lift = H * 0.004 * Math.sin(ph * 2);
  }
  return { P, lift };
}
// A wave along the body, stronger towards the tail.
function fishPose(J, clip, t, H, list) {
  const P = {}, ph = t * 2 * Math.PI, n = list.filter(([k]) => /^tail\d/.test(k)).length, A = clip === 'Swim' ? 22 : 7;
  P.hips = Q.axis(Y, A * 0.25 * Math.sin(ph)); P.chest = Q.axis(Y, A * 0.15 * Math.sin(ph + 0.8)); P.head = Q.axis(Y, -A * 0.2 * Math.sin(ph + 1.6));
  for (let i = 1; i <= n; i++) P['tail' + i] = Q.axis(Y, A * (0.5 + i / n) * Math.sin(ph - 1.1 * i));
  const f = (clip === 'Swim' ? 18 : 28) * Math.sin(ph * 2);
  P.finL = raise(J, 'chest', 'finL', f); P.finR = raise(J, 'chest', 'finR', f); P.finTop = P.hips;
  return { P, lift: H * 0.03 * Math.sin(ph) };
}
// The joints of a chain from the tail's tip to the head.
const snakeChain = list => [...list.filter(([k]) => /^tail\d/.test(k)).map(([k]) => k).reverse(), 'hips', ...list.filter(([k]) => /^body\d/.test(k)).map(([k]) => k), 'head'];
function snakePose(J, clip, t, H, list) {
  const P = {}, ph = t * 2 * Math.PI, chain = snakeChain(list), n = chain.length, go = clip === 'Slither';
  chain.forEach((k, i) => { P[k] = Q.axis(Y, (go ? 30 : 9) * Math.cos(2 * Math.PI * (go ? 1.3 : 0.8) * i / (n - 1) - ph)); });
  P.head = Q.mul(P.head, Q.axis(X, go ? -6 : -12 - 6 * Math.sin(ph)));
  return { P, lift: 0 };
}
// Legs in two alternating groups (a tripod for six, four and four for eight).
function spiderPose(J, clip, t, H, list) {
  const P = {}, ph = t * 2 * Math.PI, pairs = list.filter(([k]) => /^leg\d+L$/.test(k)).length, walk = clip === 'Walk';
  for (let i = 1; i <= pairs; i++) for (const [s, sd] of [['L', 1], ['R', -1]]) {
    const off = ((i + (s === 'L' ? 0 : 1)) % 2) * Math.PI, sw = (walk ? 16 : 3) * Math.sin(ph + off);
    const up = walk ? 22 * Math.max(0, Math.cos(ph + off)) : 2 * Math.max(0, Math.sin(ph * 2 + i));
    const q = Q.mul(Q.axis(Y, -sd * sw), raise(J, 'leg' + i + s, 'knee' + i + s, up));
    P['leg' + i + s] = q; P['knee' + i + s] = q; P['foot' + i + s] = q;
  }
  P.abdomen = Q.axis(X, (walk ? 3 : 5) * Math.sin(ph)); P.head = walk ? NONE : Q.axis(Y, 6 * Math.sin(ph));
  return { P, lift: walk ? H * 0.015 * Math.abs(Math.sin(ph * 2)) : H * 0.005 * Math.sin(ph) };
}
// Tentacles open and close together (swimming), or each one sways on its own.
function octopusPose(J, clip, t, H, list) {
  const P = {}, ph = t * 2 * Math.PI, n = list.filter(([k]) => /^arm\d+a$/.test(k)).length, swim = clip === 'Swim';
  for (let i = 1; i <= n; i++) {
    const o = 2 * Math.PI * i / n, arm = k => 'arm' + i + k;
    const a = swim ? 28 * Math.sin(ph) : 7 * Math.sin(ph + o * 2), b = a + (swim ? 22 : 9) * Math.sin(ph - 0.7 + (swim ? 0 : o)), c = b + (swim ? 22 : 10) * Math.sin(ph - 1.4 + (swim ? 0 : o));
    const sway = swim ? NONE : Q.axis(Y, 6 * Math.sin(ph + o));
    P[arm('a')] = Q.mul(sway, raise(J, 'hips', arm('a'), a)); P[arm('b')] = Q.mul(sway, raise(J, 'hips', arm('a'), b)); P[arm('c')] = Q.mul(sway, raise(J, 'hips', arm('a'), c));
  }
  P.head = Q.axis(X, (swim ? 6 : 3) * Math.sin(ph - 0.5));
  return { P, lift: swim ? H * 0.12 * (1 + Math.sin(ph - 1.2)) / 2 : H * 0.01 * Math.sin(ph) };
}
// An object: bounces, wobbles, spins or squashes (its base stays put); scale: the root's.
function objectPose(J, clip, t, H, list) {
  const P = {}, ph = t * 2 * Math.PI, n = list.length - 1; let lift = 0, sy = 1;
  const bend = (ax, amp, lag) => { for (let i = 1; i <= n; i++) P['bend' + i] = Q.axis(ax, amp * i * Math.sin(ph - lag * i)); };
  if (clip === 'Bounce') { const h = 4 * t * (1 - t), c = Math.max(0, 1 - h * 5); lift = H * 0.3 * h; sy = 1 - 0.2 * c + 0.06 * h * (1 - c); bend(X, 2, 0.5); }
  else if (clip === 'Wobble') { P.hips = Q.axis(Z, (n ? 4 : 9) * Math.sin(ph)); bend(Z, 7, 0.6); }
  else if (clip === 'Spin') { P.hips = Q.axis(Y, 360 * t); lift = H * 0.03 * Math.sin(ph); }
  else if (clip === 'Squash') sy = 1 + 0.18 * Math.sin(ph);
  else { sy = 1 + 0.02 * Math.sin(ph); bend(X, 1.5, 0.4); }
  const sx = 1 / Math.sqrt(sy);
  return { P, lift, scale: [sx, sy, sx] };
}
const POSES = { person: personPose, animal: animalPose, winged: wingedPose, bird: birdPose, fish: fishPose, snake: snakePose, spider: spiderPose, octopus: octopusPose, object: objectPose };
export const CLIPS = { person: [['Idle', 2.4], ['Walk', 1.1], ['Run', 0.7], ['Wave', 1.4], ['Jump', 1.2], ['Cheer', 1.2], ['Dance', 1.6]], animal: [['Idle', 2.6], ['Walk', 1.1], ['Run', 0.6], ['Jump', 1.0]],
  bird: [['Idle', 2.4], ['Walk', 0.9], ['Hop', 0.7], ['Fly', 0.6]], winged: [['Idle', 2.6], ['Walk', 1.1], ['Run', 0.6], ['Fly', 1.0]],
  fish: [['Idle', 2.8], ['Swim', 1.1]], snake: [['Idle', 3], ['Slither', 1.6]], spider: [['Idle', 2.4], ['Walk', 0.8]], octopus: [['Idle', 3], ['Swim', 1.6]],
  object: [['Idle', 2.4], ['Bounce', 0.9], ['Wobble', 1.4], ['Spin', 2], ['Squash', 1.2]] };
export const CLIP_LABELS = { Idle: 'Reposo', Walk: 'Andar', Run: 'Correr', Wave: 'Saludar', Jump: 'Saltar', Cheer: 'Celebrar', Dance: 'Bailar',
  Fly: 'Volar', Hop: 'Dar saltitos', Swim: 'Nadar', Slither: 'Reptar', Bounce: 'Botar', Wobble: 'Bambolearse', Spin: 'Girar', Squash: 'Estirar y encoger' };
const poseOf = (kind, J, clip, t, H, list) => (POSES[kind] || personPose)(J, clip, t, H, list);

// World turns per joint → the local ones glTF wants (each relative to its parent).
function localTurns(list, P) {
  const W = {}, L = {};
  for (const [name, parent] of list) { W[name] = P[name] || (parent ? W[parent] : NONE); L[name] = parent ? Q.mul(Q.inv(W[parent]), W[name]) : W[name]; }
  return L;
}


// Weights as normalised bytes (a quarter of the size, and glTF allows it), summing exactly to 255 for each vertex.
function quantWeights(w) {
  const q = new Uint8Array(w.length);
  for (let k = 0; k < w.length; k += 4) {
    let sum = 0, big = 0; for (let c = 0; c < 4; c++) { q[k + c] = Math.round(Math.max(0, w[k + c]) * 255); sum += q[k + c]; if (q[k + c] > q[k + big]) big = c; }
    q[k + big] += 255 - sum;
  }
  return q;
}
// The GLB without what nothing uses any more (the model's own meshes that were flattened and bound, their accessors and buffers):
// buildRig adds the skinned copy next to the original, which would double the file.
function compactGLB(out) {
  const { json, bin } = out, acc = json.accessors || [], bvs = json.bufferViews || [], usedA = new Set();
  const useA = i => { if (i != null) usedA.add(i); };
  for (const m of json.meshes || []) for (const p of m.primitives || []) { for (const a of Object.values(p.attributes || {})) useA(a); useA(p.indices); for (const t of p.targets || []) for (const a of Object.values(t)) useA(a); }
  for (const sk of json.skins || []) useA(sk.inverseBindMatrices);
  for (const an of json.animations || []) for (const sm of an.samplers || []) { useA(sm.input); useA(sm.output); }
  const aMap = new Map(), accNew = []; [...usedA].sort((a, b) => a - b).forEach(i => { aMap.set(i, accNew.length); accNew.push(acc[i]); });
  const usedB = new Set(); for (const a of accNew) { if (a.bufferView != null) usedB.add(a.bufferView); if (a.sparse) { usedB.add(a.sparse.indices.bufferView); usedB.add(a.sparse.values.bufferView); } }
  for (const im of json.images || []) if (im.bufferView != null) usedB.add(im.bufferView);
  const bMap = new Map(), bvNew = [], chunks = []; let off = 0;
  [...usedB].sort((a, b) => a - b).forEach(i => {
    const bv = bvs[i], len = Math.ceil(bv.byteLength / 4) * 4, c = new Uint8Array(len); c.set(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
    bMap.set(i, bvNew.length); bvNew.push({ ...bv, byteOffset: off }); chunks.push(c); off += len;
  });
  const nb = new Uint8Array(off); let at = 0; for (const c of chunks) { nb.set(c, at); at += c.length; }
  for (const a of accNew) { if (a.bufferView != null) a.bufferView = bMap.get(a.bufferView); if (a.sparse) { a.sparse.indices.bufferView = bMap.get(a.sparse.indices.bufferView); a.sparse.values.bufferView = bMap.get(a.sparse.values.bufferView); } }
  for (const im of json.images || []) if (im.bufferView != null) im.bufferView = bMap.get(im.bufferView);
  const R = i => (i == null ? i : aMap.get(i));
  for (const m of json.meshes || []) for (const p of m.primitives || []) { for (const k of Object.keys(p.attributes || {})) p.attributes[k] = R(p.attributes[k]); p.indices = R(p.indices); for (const t of p.targets || []) for (const k of Object.keys(t)) t[k] = R(t[k]); if (p.indices == null) delete p.indices; }
  for (const sk of json.skins || []) sk.inverseBindMatrices = R(sk.inverseBindMatrices);
  for (const an of json.animations || []) for (const sm of an.samplers || []) { sm.input = R(sm.input); sm.output = R(sm.output); }
  json.accessors = accNew; json.bufferViews = bvNew; return { json, bin: nb };
}

// ---- Putting it together ----------------------------------------------------------------------
// The model with a skeleton at J (joints) and the animations: a GLB data URL.
// opts.heat: weights by heat diffusion (a few seconds: for the final model); otherwise the quick ones (for the preview while joints are dragged).
export function buildRig(g, shape, kind, J, opts = {}) {
  const json = structuredClone(g.json), out = { json, bin: g.bin.slice() }, list = skeletonOf(kind, J);
  const H = shape.box.max[1] - shape.box.min[1], B = bones(kind, J, list);
  delete json.skins; json.animations = [];
  for (const n of json.nodes) { delete n.skin; delete n.weights; delete n.mesh; }   // (the old ones, left out of the scene: their meshes are replaced by the skinned copies)
  json.meshes = [];
  // Joints: nodes with only a position (their parent's offset).
  const base = json.nodes.length, idx = Object.fromEntries(list.map(([n], i) => [n, base + i]));
  list.forEach(([name, parent]) => json.nodes.push({ name, translation: parent ? sub(J[name], J[parent]) : J[name], children: list.filter(([, p]) => p === name).map(([n]) => idx[n]) }));
  for (const n of json.nodes.slice(base)) if (!n.children.length) delete n.children;
  const ibm = new Float32Array(list.length * 16);
  list.forEach(([name], i) => ibm.set(M4.trs(scale(J[name], -1)), i * 16));
  json.skins = [{ joints: list.map(([n]) => idx[n]), skeleton: idx.hips, inverseBindMatrices: addAccessor(out, ibm, 'MAT4') }];
  // Every mesh, flattened into the model's space, bound to the bones.
  const meshNodes = [];
  let geo = null; try { geo = volumeDistances(shape, B, H); } catch { geo = null; }
  let poses = null;
  shape.parts.forEach(({ prim, pos, nor }) => {
    const bound = bindWeights(pos, B, H, J.hips[0], kind === 'person' ? J.thighL?.[1] ?? null : null, geo), pidx = shape.parts.find(x => x.pos === pos)?.idx;
    let { joints, weights } = bound;
    if (opts.heat && pidx) { try { ({ joints, weights } = heatWeights(pos, pidx, B.length, H, bound.near)); } catch { ({ joints, weights } = smoothWeights(pos, pidx, bound.joints, bound.weights, B.length, H * 0.03)); }
      if (opts.refine === true) {   // (off: measured no better than the heat weights alone, a little worse)
        try { poses ||= [['Walk', [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]], ['Run', [0.2, 0.6]], ['Wave', [0.3, 0.7]], ['Jump', [0.5]]].filter(([c]) => CLIPS[kind].some(x => x[0] === c)).flatMap(([c, ts]) => ts.map(t => poseMatrices(kind, J, list, c, t, H)));
        ({ joints, weights } = refineWeights(pos, pidx, joints, weights, B.length, poses, H)); } catch { /* the weights as they were */ } } }
    else ({ joints, weights } = smoothWeights(pos, pidx, joints, weights, B.length, H * 0.03));
    if (kind === 'person' && opts.torso !== false && J.armL && J.armR) {   // (the cloth of the trunk, beside an arm that hangs against it, doesn't go up with the arm)
      const arms = B.map(b => /^(arm|forearm|hand)[LR]$/.test(b.name)), sp = B.findIndex(b => b.name === 'spine'), hp = B.findIndex(b => b.name === 'hips'), ch = B.findIndex(b => b.name === 'chest');
      const half = Math.min(J.armL[0] - J.hips[0], J.hips[0] - J.armR[0]) - H * 0.03, top = J.armL[1] - H * 0.08, low = J.handL[1] - H * 0.02;
      if (sp >= 0 && hp >= 0 && ch >= 0 && half > H * 0.04) for (let k = 0; k < pos.length / 3; k++) { const y = pos[k * 3 + 1];
        // (below the hand there is no arm: what the arms' weights spread down the cloth goes with the trunk — else the hem is dragged up with the hand)
        if (y > top || (y >= low && Math.abs(pos[k * 3] - J.hips[0]) > half)) continue;
        const to = y > J.hips[1] ? sp : hp; let moved = 0;
        for (let c = 0; c < 4; c++) if (arms[joints[k * 4 + c]]) { moved += weights[k * 4 + c]; weights[k * 4 + c] = 0; }
        if (!moved) continue;
        let at = -1; for (let c = 0; c < 4; c++) if (joints[k * 4 + c] === to) at = c;
        if (at < 0) { at = [0, 1, 2, 3].reduce((m, c) => (weights[k * 4 + c] < weights[k * 4 + m] ? c : m), 0); joints[k * 4 + at] = to; weights[k * 4 + at] = 0; }
        weights[k * 4 + at] += moved; }
    }
    if (kind === 'person' && opts.armReach === true && J.armL && J.armR) {   // (off: measured worse on every clip)   // (cloth that is not within an arm's reach doesn't go up with it: the flap of a tunic beside a hanging arm)
      const chain = [['armL', 'forearmL'], ['forearmL', 'handL'], ['handL', null], ['armR', 'forearmR'], ['forearmR', 'handR'], ['handR', null]], idxOf = n => B.findIndex(b => b.name === n);
      const segs = chain.map(([a, b]) => ({ j: idxOf(a), A: J[a], D: b ? sub(J[b], J[a]) : [0, -H * 0.08, 0] })).filter(x => x.j >= 0), sp = idxOf('spine'), hp = idxOf('hips');
      const R0 = H * 0.06, R1 = H * 0.10;
      if (sp >= 0 && hp >= 0) for (let k = 0; k < pos.length / 3; k++) {
        const px = pos[k * 3], py = pos[k * 3 + 1], pz = pos[k * 3 + 2]; let moved = 0;
        for (let c = 0; c < 4; c++) { const sg = segs.find(x => x.j === joints[k * 4 + c]); if (!sg || !weights[k * 4 + c]) continue;
          const L2 = sg.D[0] ** 2 + sg.D[1] ** 2 + sg.D[2] ** 2 || 1, t = Math.max(0, Math.min(1, ((px - sg.A[0]) * sg.D[0] + (py - sg.A[1]) * sg.D[1] + (pz - sg.A[2]) * sg.D[2]) / L2));
          const d = Math.hypot(px - sg.A[0] - sg.D[0] * t, py - sg.A[1] - sg.D[1] * t, pz - sg.A[2] - sg.D[2] * t);
          if (d > R0) { const keep = Math.max(0, 1 - (d - R0) / (R1 - R0)); moved += weights[k * 4 + c] * (1 - keep); weights[k * 4 + c] *= keep; } }
        if (!moved) continue;
        const to = py > J.hips[1] ? sp : hp; let at = -1; for (let c = 0; c < 4; c++) if (joints[k * 4 + c] === to) at = c;
        if (at < 0) { at = [0, 1, 2, 3].reduce((m, c) => (weights[k * 4 + c] < weights[k * 4 + m] ? c : m), 0); joints[k * 4 + at] = to; weights[k * 4 + at] = 0; }
        weights[k * 4 + at] += moved; }
    }
    if (kind === 'person' && J.hemF) {                                    // (below the hem the legs are bare: the cloth bones have no pull there)
      const hem = B.map(b => /^hem[FBLR]t?$/.test(b.name)), below = J.crotchY - H * 0.012;
      for (let k = 0; k < pos.length / 3; k++) { if (pos[k * 3 + 1] > below) continue;
        let moved = 0, big = -1; for (let c = 0; c < 4; c++) { if (hem[joints[k * 4 + c]]) { moved += weights[k * 4 + c]; weights[k * 4 + c] = 0; } else if (big < 0 || weights[k * 4 + c] > weights[k * 4 + big]) big = c; }
        if (moved && big >= 0) weights[k * 4 + big] += moved; }
    }
    if (kind === 'person' && !J.hemF && J.crotchY != null && J.hips[1] - J.crotchY > H * 0.04) {   // (a tunic or a dress covers the legs: loose cloth between the legs and the hips)
      // Cloth that wraps both legs would be torn apart as they part: it follows the pelvis, with only a part of the legs' pull.
      const hi = B.findIndex(b => b.name === 'hips'), legs = B.map(b => /^(thigh|shin|foot)[LR]$/.test(b.name)), keep = 0.4;
      if (hi >= 0) for (let k = 0; k < pos.length / 3; k++) { const y = pos[k * 3 + 1]; if (y < J.crotchY - H * 0.02 || y > J.hips[1]) continue;
        let moved = 0; for (let c = 0; c < 4; c++) if (legs[joints[k * 4 + c]]) { const w = weights[k * 4 + c]; weights[k * 4 + c] = w * keep; moved += w * (1 - keep); }
        if (moved) { let at = -1; for (let c = 0; c < 4; c++) if (joints[k * 4 + c] === hi) at = c; if (at < 0) { at = weights[k * 4 + 3] === Math.min(...[0, 1, 2, 3].map(c => weights[k * 4 + c])) ? 3 : [0, 1, 2, 3].reduce((m, c) => (weights[k * 4 + c] < weights[k * 4 + m] ? c : m), 0); joints[k * 4 + at] = hi; weights[k * 4 + at] = 0; } weights[k * 4 + at] += moved; } }
    }
    if (kind === 'person' && J.footL && J.footR) {              // (the soles and heels follow only their foot: the shin and the foot turn differently, the shoe would stretch between them)
      const fi = [B.findIndex(b => b.name === 'footL'), B.findIndex(b => b.name === 'footR')], top = Math.max(J.footL[1], J.footR[1]) + H * 0.04, nv = pos.length / 3;   // (the shoe rises above the ankle: all of it is the foot's)
      const idxArr = shape.parts.find(x => x.pos === pos)?.idx;
      if (fi[0] >= 0 && fi[1] >= 0) {
        // Each shoe is a piece of the surface of its own: the one foot that most of its points lean to gets all of it (two shoes
        // side by side in a stride would otherwise be shared out by distance to the bones, and each stretched towards the other).
        let comp = null;
        if (idxArr) {
          const g = weldGraph(pos, idxArr, H * 0.0025), up = new Int32Array(g.m).map((_, i) => i), low = new Uint8Array(g.m);
          const find = x => { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
          for (let k = 0; k < nv; k++) if (pos[k * 3 + 1] < top) low[g.wid[k]] = 1;
          for (let e = 0; e < g.A.length; e++) if (low[g.A[e]] && low[g.B[e]]) up[find(g.A[e])] = find(g.B[e]);
          const sum = new Map();
          for (let k = 0; k < nv; k++) if (low[g.wid[k]]) {
            const r = find(g.wid[k]), t = sum.get(r) || { l: 0, r: 0, x: 0, n: 0 };
            for (let c = 0; c < 4; c++) { if (joints[k * 4 + c] === fi[0]) t.l += weights[k * 4 + c]; else if (joints[k * 4 + c] === fi[1]) t.r += weights[k * 4 + c]; }
            t.x += pos[k * 3]; t.n++; sum.set(r, t);
          }
          comp = k => { const t = sum.get(find(g.wid[k])); return !t ? -1 : Math.abs(t.l - t.r) > 1e-6 * t.n ? (t.l > t.r ? 0 : 1) : (t.x / t.n > J.hips[0] ? 0 : 1); };
        }
        for (let k = 0; k < nv; k++) if (pos[k * 3 + 1] < top) {
          const own = comp ? comp(k) : -1, side = own >= 0 ? own : pos[k * 3] > J.hips[0] ? 0 : 1, f = fi[side], fade = Math.min(1, (top - pos[k * 3 + 1]) / (H * 0.01));
          // (a blend at the edge, so the ankle doesn't show a seam: the foot's share grows towards the ground)
          for (let c = 0; c < 4; c++) { weights[k * 4 + c] *= 1 - fade; if (joints[k * 4 + c] === f) weights[k * 4 + c] += fade; }
          if (![0, 1, 2, 3].some(c => joints[k * 4 + c] === f && weights[k * 4 + c] > 0)) { joints[k * 4 + 3] = f; weights[k * 4 + 3] = fade; }
        }
      }
    }
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < pos.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], pos[k + c]); mx[c] = Math.max(mx[c], pos[k + c]); }
    const attributes = { ...prim.attributes, POSITION: addAccessor(out, pos, 'VEC3', { min: mn, max: mx }), JOINTS_0: addAccessor(out, joints, 'VEC4'), WEIGHTS_0: addAccessor(out, quantWeights(weights), 'VEC4', { normalized: true }) };
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
    let size = null;
    for (let i = 0; i < n; i++) {
      const pose = poseOf(kind, J, clip, i / (n - 1), H, list), L = localTurns(list, pose.P);
      for (const [nm] of list) rot[nm].set(L[nm], i * 4);
      hip.set(add(J.hips, [0, pose.lift, 0]), i * 3);
      if (pose.scale) (size ||= new Float32Array(n * 3)).set(pose.scale, i * 3);
    }
    const samplers = [], channels = [];
    const channel = (node, path, output, type) => { samplers.push({ input, output: addAccessor(out, output, type), interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node, path } }); };
    for (const [nm] of list) channel(idx[nm], 'rotation', rot[nm], 'VEC4');
    channel(idx.hips, 'translation', hip, 'VEC3');
    if (size) channel(idx.hips, 'scale', size, 'VEC3');
    json.animations.push({ name: clip, samplers, channels });
  }
  return writeGLB(compactGLB(out));
}
// A tiny preview of the pose (for tests and the editor): where a joint ends up at time t of a clip.
export function posedJoints(kind, J, clip, t, H) {
  const list = skeletonOf(kind, J), { P, lift, scale: S } = poseOf(kind, J, clip, t, H, list), L = localTurns(list, P), W = {}, pos = {};
  for (const [name, parent] of list) {
    if (!parent) { W[name] = L[name]; pos[name] = add(J[name], [0, lift, 0]); continue; }
    W[name] = Q.mul(W[parent], L[name]); pos[name] = add(pos[parent], Q.rotate(W[parent], sub(J[name], J[parent])));
  }
  if (S) {                                                       // (the root's scale, along its own axes)
    const r = pos.hips, q = W.hips;
    for (const [name] of list) { const d = Q.rotate(Q.inv(q), sub(pos[name], r)); pos[name] = add(r, Q.rotate(q, [d[0] * S[0], d[1] * S[1], d[2] * S[2]])); }
  }
  return pos;
}

// ---- Flat views (to edit the joints, and to show the model to the AI) ------------------------
// front: x right, y up; side: z right (the head of a model facing +Z), y up; top: x right, z down.
export const VIEWS = { front: { u: 0, v: 1, sv: 1, depth: 2 }, side: { u: 2, v: 1, sv: 1, depth: 0 }, top: { u: 0, v: 2, sv: -1, depth: 1 } };
// How a view of the model fits a square of size px (pad: the margin).
export function projectView(shape, name, size, pad = 30) {
  const V = VIEWS[name], { min, max } = shape.box, w = max[V.u] - min[V.u] || 1e-6, h = max[V.v] - min[V.v] || 1e-6, k = Math.min((size - pad * 2) / w, (size - pad * 2) / h);
  return { ...V, name, size, k, ox: size / 2 - k * (min[V.u] + max[V.u]) / 2, oy: size / 2 + V.sv * k * (min[V.v] + max[V.v]) / 2 };
}
export const toView = (view, p) => [view.ox + p[view.u] * view.k, view.oy - view.sv * p[view.v] * view.k];
// The model's triangles in a view, far to near, each with a shade (how much it faces us).
export function viewTriangles(shape, view) {
  const tris = [], d = view.depth;
  for (const { pos, idx } of shape.parts) {
    if (!idx) continue;
    for (let i = 0; i < idx.length; i += 3) {
      const P = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3].map(o => [pos[o], pos[o + 1], pos[o + 2]]);
      const n = cross(sub(P[1], P[0]), sub(P[2], P[0])), l = Math.hypot(...n) || 1;
      tris.push([P.map(p => toView(view, p)), 55 + Math.abs(n[d] / l) * 150 | 0, (P[0][d] + P[1][d] + P[2][d]) / 3]);
    }
  }
  return tris.sort((a, b) => a[2] - b[2]);
}

// ---- Joints from hints (the AI's), held to the mesh ----------------------------------------
// The middle of the vertices around p (within r): inside the limb rather than on its skin.
export function snapToMesh(shape, p, r) {
  let n = 0; const s = [0, 0, 0];
  for (const { pos } of shape.parts) for (let k = 0; k < pos.length; k += 3) {
    const dx = pos[k] - p[0], dy = pos[k + 1] - p[1], dz = pos[k + 2] - p[2];
    if (dx * dx + dy * dy + dz * dz <= r * r) { n++; s[0] += pos[k]; s[1] += pos[k + 1]; s[2] += pos[k + 2]; }
  }
  return n ? lerp(p, scale(s, 1 / n), 0.7) : p;
}
// Points marked on the flat views ({ front: { head: [x, y] } }, 0–1 of each picture)
// → partial positions in the model ({ head: { 0: x, 1: y } }; averaged where views agree).
export function pointsFromViews(views, marks = {}) {
  const sum = {};
  for (const [v, pts] of Object.entries(marks || {})) {
    const view = views[v]; if (!view || !pts) continue;
    for (const [name, xy] of Object.entries(pts)) {
      const sx = xy[0] * view.size, sy = xy[1] * view.size, c = (sum[name] ||= {});
      for (const [axis, val] of [[view.u, (sx - view.ox) / view.k], [view.v, (view.oy - sy) / (view.sv * view.k)]]) (c[axis] ||= []).push(val);
    }
  }
  return Object.fromEntries(Object.entries(sum).map(([n, c]) => [n, Object.fromEntries(Object.entries(c).map(([a, vals]) => [a, vals.reduce((s, x) => s + x, 0) / vals.length]))]));
}
// Landmarks (names the AI knows) → this kind's joints.
const LANDMARK = {
  person: { head: 'head', neck: 'neck', hips: 'hips', handL: 'handL', handR: 'handR', footL: 'footL', footR: 'footR' },
  animal: { head: 'head', neck: 'neck', hips: 'hips', frontFootL: 'pawFL', frontFootR: 'pawFR', backFootL: 'pawBL', backFootR: 'pawBR' },
  bird: { head: 'head', neck: 'neck', hips: 'hips', footL: 'footL', footR: 'footR', wingTipL: 'wingTipL', wingTipR: 'wingTipR' },
  fish: { head: 'head', hips: 'hips' }, snake: { head: 'head', hips: 'hips' }, spider: { head: 'head', hips: 'hips' }, octopus: { head: 'head' }, object: {},
};
LANDMARK.winged = { ...LANDMARK.animal, wingTipL: 'wingTipL', wingTipR: 'wingTipR' };
// Move the proposed joints to the hinted points (turn: degrees the model was turned since the
// hints were made), filling what a hint lacks from the proposal, held inside the mesh.
export function seedJoints(shape, kind, J, hints = {}, turn = 0) {
  const out = structuredClone(J), q = Q.axis(Y, turn), r = Math.max(...sub(shape.box.max, shape.box.min)) * 0.06, cx = (shape.box.min[0] + shape.box.max[0]) / 2;
  const map = { ...LANDMARK[kind] }, chain = kind === 'snake' ? snakeChain(skeletonOf(kind, J)) : null, tails = Object.keys(J).filter(k => /^tail\d+$/.test(k));
  if (kind === 'snake') map.tailTip = chain[0]; else if (kind === 'fish' && tails.length) map.tailTip = 'tail' + tails.length;
  const moved = new Set();
  for (const [mark, name] of Object.entries(map)) {
    const h = hints[mark]; if (!h || !out[name]) continue;
    const old = Q.rotate(Q.inv(q), out[name]), p = [0, 1, 2].map(a => (Number.isFinite(h[a]) ? h[a] : old[a]));
    out[name] = snapToMesh(shape, Q.rotate(q, p), r); moved.add(name);
  }
  // One side hinted, not the other: its mirror.
  for (const name of moved) { const m = mirrorOf(name); if (m && out[m] && !moved.has(m)) out[m] = [2 * cx - out[name][0], out[name][1], out[name][2]]; }
  // A tail's tip hinted (animals, birds): their tail joint a third of the way there.
  if (hints.tailTip && /^(animal|winged|bird)$/.test(kind)) {
    const h = hints.tailTip, old = Q.rotate(Q.inv(q), out.tail), tip = Q.rotate(q, [0, 1, 2].map(a => (Number.isFinite(h[a]) ? h[a] : old[a])));
    out.tail = lerp(out.hips, tip, 0.35);
  }
  return out;
}
