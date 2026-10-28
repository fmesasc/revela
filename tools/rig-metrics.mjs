// Rig quality, measured: poses a rigged GLB with linear blend skinning (as model-viewer does) at six times of a clip and counts the
// mesh edges that stretch beyond 1.5x or squash under 0.55x (lower is better), with where they are (by tenths of the height).
// node tools/rig-metrics.mjs model.rig.glb [Clip]   (2026-10: romano 6,6 %, legionario 2,0 %, mujer 4,9 %, caballero 5,7 %)
const A = await import(new URL('../src/features/content/autorig.js', import.meta.url).href);
const G = await import(new URL('../src/features/content/gltf.js', import.meta.url).href);
export async function measure(glbPath, clip = 'Walk') {
  const g = await A.readModel('data:model/gltf-binary;base64,' + readFileSync(glbPath).toString('base64')), J = g.json;
  const skinNode = J.nodes.find(n => n.skin === 0), prim = J.meshes[skinNode.mesh].primitives[0];
  const P = G.readAccessor(g, prim.attributes.POSITION), JT = G.readAccessor(g, prim.attributes.JOINTS_0);
  const W = G.readAccessor(g, prim.attributes.WEIGHTS_0);   // (already normalised floats)
  const idx = G.readAccessor(g, prim.indices), ibm = G.readAccessor(g, J.skins[0].inverseBindMatrices), joints = J.skins[0].joints, n = P.length / 3;
  const anim = J.animations.find(a => a.name === clip);
  const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const trs = (t, q, s = [1, 1, 1]) => { const [x, y, z, w] = q, xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    return [(1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0, 2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0, 2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1]; };
  const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(v => -v); d = -d; } if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * t), l = Math.hypot(...r); return r.map(v => v / l); } const th = Math.acos(d), s = Math.sin(th), k1 = Math.sin((1 - t) * th) / s, k2 = Math.sin(t * th) / s; return a.map((v, i) => v * k1 + b[i] * k2); };
  const chan = {}; for (const c of anim.channels) { const s = anim.samplers[c.sampler]; (chan[c.target.node] ||= {})[c.target.path] = { t: G.readAccessor(g, s.input), v: G.readAccessor(g, s.output) }; }
  const sample = (ch, t, comps) => { const T = ch.t; let i = 0; while (i < T.length - 2 && T[i + 1] <= t) i++; const k = Math.max(0, Math.min(1, (t - T[i]) / ((T[i + 1] - T[i]) || 1))), a = Array.from(ch.v.slice(i * comps, i * comps + comps)), b = Array.from(ch.v.slice((i + 1) * comps, (i + 1) * comps + comps)); return comps === 4 ? slerp(a, b, k) : a.map((v, j) => v + (b[j] - v) * k); };
  const parent = {}; J.nodes.forEach((nd, i) => (nd.children || []).forEach(c => { parent[c] = i; }));
  const world = (i, t, memo) => { if (memo[i]) return memo[i]; const nd = J.nodes[i], ch = chan[i] || {};
    const tr = ch.translation ? sample(ch.translation, t, 3) : nd.translation || [0, 0, 0], q = ch.rotation ? sample(ch.rotation, t, 4) : nd.rotation || [0, 0, 0, 1], sc = ch.scale ? sample(ch.scale, t, 3) : nd.scale || [1, 1, 1];
    const local = trs(tr, q, sc); return (memo[i] = parent[i] != null ? mul(world(parent[i], t, memo), local) : local); };
  const dur = Math.max(...anim.samplers.map(s => G.readAccessor(g, s.input).at(-1)));
  // Edges (welded by position, one per pair) and their rest lengths.
  const key = new Map(), wid = new Int32Array(n); let m = 0, h = 0; for (let k = 0; k < n * 3; k += 3) h = Math.max(h, P[k + 1]);
  for (let k = 0; k < n; k++) { const kk = Math.round(P[k * 3] * 2000) + ',' + Math.round(P[k * 3 + 1] * 2000) + ',' + Math.round(P[k * 3 + 2] * 2000); let id = key.get(kk); if (id === undefined) { id = m++; key.set(kk, id); } wid[k] = id; }
  const rep = new Int32Array(m); for (let k = 0; k < n; k++) rep[wid[k]] = k;
  const seen = new Set(), E = []; for (let t = 0; t + 2 < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = wid[idx[t + e]], b = wid[idx[t + (e + 1) % 3]]; if (a === b) continue; const kk = a < b ? a * m + b : b * m + a; if (seen.has(kk)) continue; seen.add(kk); E.push([rep[a], rep[b]]); }
  const rest = E.map(([a, b]) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]));
  let worst = 0, bad = 0, tot = 0, stretch99 = []; const hist = new Array(10).fill(0); let ymin = 1e9; for (let k = 0; k < n * 3; k += 3) ymin = Math.min(ymin, P[k + 1]);
  const times = [0.1, 0.25, 0.4, 0.6, 0.75, 0.9];
  for (const tf of times) {
    const t = tf * dur, memo = {}, S = joints.map((jn, i) => mul(world(jn, t, memo), Array.from(ibm.slice(i * 16, i * 16 + 16))));
    const out = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { let x = 0, y = 0, z = 0; for (let c = 0; c < 4; c++) { const w = W[k * 4 + c]; if (!w) continue; const M = S[JT[k * 4 + c]], px = P[k * 3], py = P[k * 3 + 1], pz = P[k * 3 + 2]; x += w * (M[0] * px + M[4] * py + M[8] * pz + M[12]); y += w * (M[1] * px + M[5] * py + M[9] * pz + M[13]); z += w * (M[2] * px + M[6] * py + M[10] * pz + M[14]); } out[k * 3] = x; out[k * 3 + 1] = y; out[k * 3 + 2] = z; }
    E.forEach(([a, b], i) => { if (rest[i] < 1e-6) return; const r = Math.hypot(out[a * 3] - out[b * 3], out[a * 3 + 1] - out[b * 3 + 1], out[a * 3 + 2] - out[b * 3 + 2]) / rest[i]; tot++; if (r > 1.5 || r < 0.55) { bad++; const hb = Math.floor((P[a * 3 + 1] - ymin) / (h - ymin) * 10); (hist[hb] ||= 0); hist[hb]++; } stretch99.push(r); });
  }
  stretch99.sort((a, b) => a - b); const q = f => stretch99[Math.floor(f * (stretch99.length - 1))];
  return { hist: hist.join(','), edges: E.length, badPct: +(100 * bad / tot).toFixed(2), p01: +q(0.01).toFixed(2), p99: +q(0.99).toFixed(2), max: +q(1).toFixed(1), verts: n };
}
if (process.argv[1].endsWith('rig-metrics.mjs')) { const r = await measure(process.argv[2], process.argv[3] || 'Walk'); console.log(process.argv[2].split('/').pop().padEnd(22), JSON.stringify(r)); }
