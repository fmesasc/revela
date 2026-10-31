// Revela's own Lottie animations (assets/lottie/*.json): drawn here, as code, so they are ours — no licence to carry.
// Plain Lottie (shapes, trim paths, transforms; nothing lottie_light can't play): `node tools/make-lottie.mjs`.
// Colours are the deck-neutral ones below; the «color» property of the object recolours any of them.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'lottie');
mkdirSync(OUT, { recursive: true });

const hex = h => [1, 3, 5].map(i => +(parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3));
const C = { blue: '#2457d6', green: '#1f9d6b', red: '#e5484d', amber: '#f5a524', purple: '#7c5cff', teal: '#12a4b6', ink: '#64708a', pink: '#e8579a' };
const col = (h, o = 100) => ({ ty: 'fl', c: { a: 0, k: [...hex(h), 1] }, o: { a: 0, k: o }, r: 1, nm: 'Fill' });
const stroke = (h, w, o = 100) => ({ ty: 'st', c: { a: 0, k: [...hex(h), 1] }, o: { a: 0, k: o }, w: { a: 0, k: w }, lc: 2, lj: 2, nm: 'Stroke' });

// ---- animated values -------------------------------------------------------------------------------
// Easings as [out x, out y, in x, in y] (the CSS cubic-bezier(x1, y1, x2, y2)).
const EASE = { lin: [0.5, 0.5, 0.5, 0.5], out: [0, 0, 0.2, 1], in: [0.8, 0, 1, 1], io: [0.4, 0, 0.2, 1], back: [0.2, 0, 0.2, 1.4], hold: null };
// frames: [t…]; values: one per frame (number or array); eases: name per segment (or one for all).
const anim = (frames, values, eases = 'io') => ({
  a: 1,
  k: frames.map((t, n) => {
    const v = values[n], e = EASE[Array.isArray(eases) ? eases[n] ?? 'io' : eases], s = Array.isArray(v) ? v : [v];
    if (n === frames.length - 1) return { t, s };
    if (!e) return { t, s, h: 1 };
    return { t, s, o: { x: [e[0]], y: [e[1]] }, i: { x: [e[2]], y: [e[3]] } };
  }),
});
const still = v => ({ a: 0, k: v });
// A value that repeats every `period` frames: f(p) for p in [0, 1) sampled every `step` frames, shifted by `offset`.
// When f jumps at the wrap (p back to 0) the value is held until the jump.
function cycle(period, f, { step = 2, offset = 0, jump = false } = {}) {
  const frames = [], values = [], eases = [];
  const at = t => f((((t - offset) % period) + period) % period / period);
  for (let t = 0; t <= period; t += step) {
    if (jump && offset && t > 0 && t - step < offset && offset < t) { frames.push(offset - 1); values.push(at(offset - 1)); eases.push('hold'); frames.push(offset); values.push(at(offset)); eases.push('lin'); }
    frames.push(t); values.push(at(t)); eases.push('lin');
  }
  return anim(frames, values, eases);
}

// ---- shapes ------------------------------------------------------------------------------------------
const ell = (w, h = w, p = [0, 0]) => ({ ty: 'el', p: still(p), s: still([w, h]), d: 1, nm: 'Ellipse' });
const rect = (w, h, r = 0, p = [0, 0]) => ({ ty: 'rc', p: typeof p.a === 'number' ? p : still(p), s: w.a !== undefined ? w : still([w, h]), r: still(r), d: 1, nm: 'Rect' });
const path = (v, closed = false, t = null) => ({ ty: 'sh', ks: still({ i: v.map((_, n) => (t ? t[n][0] : [0, 0])), o: v.map((_, n) => (t ? t[n][1] : [0, 0])), v, c: closed }), d: 1, nm: 'Path' });
const star = (n, R, r, rot = 0) => ({ ty: 'sr', sy: 1, d: 1, pt: still(n), p: still([0, 0]), r: still(rot), ir: still(r), is: still(0), or: still(R), os: still(0), nm: 'Star' });
const trim = (end, start = still(0)) => ({ ty: 'tm', s: start, e: end, o: still(0), m: 1, nm: 'Trim' });
const tr = (o = {}) => ({ ty: 'tr', p: o.p || still([0, 0]), a: o.a || still([0, 0]), s: o.s || still([100, 100]), r: o.r || still(0), o: o.o || still(100), sk: still(0), sa: still(0) });
const group = (items, t = {}, nm = 'Group') => ({ ty: 'gr', it: [...items, tr(t)], nm, np: items.length });
const layer = (shapes, { w, h, op, p = [w / 2, h / 2], r, o, s } = {}, nm = 'Layer') => ({
  ddd: 0, ind: 1, ty: 4, nm, sr: 1, ip: 0, op, st: 0, bm: 0, ao: 0,
  ks: { o: o || still(100), r: r || still(0), p: still(p), a: still([0, 0]), s: s || still([100, 100]) }, shapes,
});
const comp = (nm, w, h, op, shapes, kw = {}) => ({ v: '5.7.0', fr: 30, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers: [layer(shapes, { w, h, op, ...kw })] });

const out = {};   // id → { json, loop, frame } (frame: the still one, as a fraction of the length)

// 1 · Check ----------------------------------------------------------------------------------------------
out.check = comp('Check', 512, 512, 66, [
  group([ell(300), trim(anim([0, 26], [0, 100], 'io')), stroke(C.green, 26)], { r: still(-90) }, 'Ring'),
  group([path([[-78, 4], [-26, 58], [84, -56]]), trim(anim([22, 42], [0, 100], 'out')), stroke(C.green, 30)], {}, 'Tick'),
], { s: anim([36, 48, 60], [[100, 100], [108, 108], [100, 100]], ['io', 'io', 'io']) });
out.check.loop = false;

// 2 · Cross ----------------------------------------------------------------------------------------------
out.cross = comp('Cross', 512, 512, 66, [
  group([ell(300), trim(anim([0, 26], [0, 100], 'io')), stroke(C.red, 26)], { r: still(-90) }, 'Ring'),
  group([path([[-70, -70], [70, 70]]), trim(anim([22, 34], [0, 100], 'out')), stroke(C.red, 30)], {}, 'Bar 1'),
  group([path([[70, -70], [-70, 70]]), trim(anim([32, 44], [0, 100], 'out')), stroke(C.red, 30)], {}, 'Bar 2'),
], { r: anim([44, 48, 52, 56, 60], [0, -6, 6, -3, 0], 'io') });
out.cross.loop = false;

// 3, 4 · Arrows ------------------------------------------------------------------------------------------
const arrow = (nm, rot) => comp(nm, 512, 512, 60, [
  group([path([[-110, 0], [100, 0]]), path([[40, -62], [104, 0], [40, 62]]), stroke(C.blue, 34)],
    { p: cycle(60, p => [Math.sin(p * Math.PI) * 34, 0], { step: 4 }) }, 'Arrow'),
], { r: still(rot) });
out['arrow-right'] = arrow('Arrow right', 0); out['arrow-right'].loop = true;
out['arrow-down'] = arrow('Arrow down', 90); out['arrow-down'].loop = true;

// 5 · Confetti -------------------------------------------------------------------------------------------
{
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = [C.blue, C.red, C.amber, C.green, C.purple, C.pink, C.teal];
  const pieces = [];
  for (let n = 0; n < 34; n++) {
    const ang = (-90 + (rnd() - 0.5) * 150) * Math.PI / 180, force = 120 + rnd() * 200, fall = 230 + rnd() * 140, spin = (rnd() < 0.5 ? -1 : 1) * (240 + rnd() * 480);
    const x0 = 0, y0 = 40, x1 = Math.cos(ang) * force, y1 = y0 + Math.sin(ang) * force * 1.15, x2 = x1 * 1.25, y2 = y1 + fall;
    const shape = n % 3 === 0 ? ell(16 + rnd() * 8) : rect(14 + rnd() * 10, 22 + rnd() * 14, 3);
    pieces.push(group([shape, col(colors[n % colors.length])], {
      p: anim([0, 26, 84], [[x0, y0], [x1, y1], [x2, y2]], ['out', 'in', 'lin']), r: anim([0, 84], [0, spin], 'lin'),
      o: anim([0, 62, 84], [100, 100, 0], 'lin'), s: anim([0, 4], [[0, 0], [100, 100]], 'out'),
    }, 'Piece ' + n));
  }
  out.confetti = comp('Confetti', 512, 512, 90, pieces, { p: [256, 300] }); out.confetti.loop = false;
}

// 6 · Loader ---------------------------------------------------------------------------------------------
{
  const dots = [];
  for (let n = 0; n < 8; n++) {
    const a = n / 8 * Math.PI * 2 - Math.PI / 2;
    dots.push(group([ell(52), col(C.blue)], {
      p: still([Math.cos(a) * 140, Math.sin(a) * 140]),
      o: cycle(40, p => 20 + 80 * Math.max(0, 1 - p * 40 / 35), { step: 5, offset: n * 5 }),
      s: cycle(40, p => { const k = 60 + 40 * Math.max(0, 1 - p * 40 / 35); return [k, k]; }, { step: 5, offset: n * 5 }),
    }, 'Dot ' + n));
  }
  out.loader = comp('Loader', 512, 512, 40, dots); out.loader.loop = true;
}

// 7 · Star -----------------------------------------------------------------------------------------------
{
  const sparks = [];
  for (let n = 0; n < 8; n++) {
    const a = n / 8 * Math.PI * 2;
    sparks.push(group([ell(22), col(C.amber)], {
      p: anim([14, 40], [[Math.cos(a) * 130, Math.sin(a) * 130], [Math.cos(a) * 215, Math.sin(a) * 215]], 'out'),
      s: anim([14, 40], [[100, 100], [20, 20]], 'out'), o: anim([14, 22, 40], [0, 100, 0], 'lin'),
    }, 'Spark ' + n));
  }
  out.star = comp('Star', 512, 512, 84, [
    ...sparks,
    group([star(5, 130, 58), col(C.amber)], {
      s: anim([0, 16, 26], [[0, 0], [118, 118], [100, 100]], ['back', 'io']), r: anim([0, 26], [-40, 0], 'out'),
    }, 'Star'),
  ]);
  out.star.loop = false;
}

// 8 · Heartbeat ------------------------------------------------------------------------------------------
out.heartbeat = comp('Heartbeat', 512, 512, 48, [
  group([path([[0, -38], [0, 130]], true, [[[-62, -100], [62, -100]], [[-170, -128], [170, -128]]].map((v, n) => (n ? [[170, -128], [-170, -128]] : [[-62, -100], [62, -100]]))), col(C.red)],
    { s: anim([0, 8, 16, 24, 34, 48], [[100, 100], [118, 118], [100, 100], [112, 112], [100, 100], [100, 100]], 'io'), a: still([0, 40]), p: still([0, 40]) }, 'Heart'),
]);
out.heartbeat.loop = true;

// 9 · Ripple -----------------------------------------------------------------------------------------------
{
  const rings = [0, 1, 2].map(n => group([ell(300), stroke(C.blue, 16)], {
    s: cycle(60, p => { const k = 1 - Math.pow(1 - p, 2); return [18 + 82 * k, 18 + 82 * k]; }, { step: 4, offset: n * 20, jump: true }),
    o: cycle(60, p => 100 * (1 - p), { step: 4, offset: n * 20, jump: true }),
  }, 'Ring ' + n));
  out.ripple = comp('Ripple', 512, 512, 60, [...rings, group([ell(58), col(C.blue)], {}, 'Dot')]); out.ripple.loop = true;
}

// 10 · Idea ----------------------------------------------------------------------------------------------
{
  const rays = [];
  for (let n = 0; n < 7; n++) {
    const a = (-185 + n * 30) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    rays.push(group([path([[c * 150, s * 150], [c * 200, s * 200]]), stroke(C.amber, 22)], {}, 'Ray ' + n));
  }
  out.idea = comp('Idea', 512, 512, 60, [
    group(rays, { o: cycle(60, p => 45 + 55 * Math.sin(p * Math.PI), { step: 4 }), s: cycle(60, p => { const k = 92 + 14 * Math.sin(p * Math.PI); return [k, k]; }, { step: 4 }) }, 'Rays'),
    group([ell(190), col(C.amber)], { s: cycle(60, p => { const k = 100 + 5 * Math.sin(p * Math.PI); return [k, k]; }, { step: 4 }), p: still([0, -10]) }, 'Bulb'),
    group([rect(110, 60, 16, [0, 105]), col(C.amber)], {}, 'Neck'),
    group([rect(112, 22, 8, [0, 150]), col(C.ink)], {}, 'Base 1'),
    group([rect(76, 20, 8, [0, 178]), col(C.ink)], {}, 'Base 2'),
  ], { p: [256, 215] });
  out.idea.loop = true;
}

// 11 · Sparkles --------------------------------------------------------------------------------------------
{
  const spots = [[-95, 40, 1, 0], [75, -75, 0.72, 20], [105, 85, 0.5, 40]];
  out.sparkles = comp('Sparkles', 512, 512, 60, spots.map(([x, y, k, off], n) => group([star(4, 100, 22), col(n === 1 ? C.purple : C.amber)], {
    p: still([x, y]), s: cycle(60, p => { const v = Math.sin(p * Math.PI) * 100 * k; return [v, v]; }, { step: 3, offset: off }),
    r: cycle(60, p => p * 90, { step: 6, offset: off, jump: true }),
  }, 'Sparkle ' + n)));
  out.sparkles.loop = true;
}

// 12 · Progress bar ----------------------------------------------------------------------------------------
{
  const W = 400, H = 48;
  out.progress = comp('Progress', 512, 160, 84, [
    group([rect(W, H, H / 2), col(C.ink, 18)], {}, 'Track'),
    group([rect(still([W, H]), 0, H / 2), col(C.blue)], {
      s: anim([0, 12, 66, 84], [[0, 100], [8, 100], [100, 100], [100, 100]], ['out', 'io', 'io']), p: still([-W / 2, 0]),
      a: still([-W / 2, 0]),
    }, 'Fill'),
  ]);
  out.progress.loop = false;
}

// 13 · Bouncing ball -----------------------------------------------------------------------------------------
out.ball = comp('Ball', 512, 512, 40, [
  group([ell(190, 30), col(C.ink, 22)], { p: still([0, 190]), s: cycle(40, p => { const k = 100 - 40 * Math.sin(p * Math.PI); return [k, k]; }, { step: 2 }), o: cycle(40, p => 100 - 45 * Math.sin(p * Math.PI), { step: 2 }) }, 'Shadow'),
  group([ell(130), col(C.red)], {
    p: cycle(40, p => { const h = Math.sin(p * Math.PI); return [0, 120 - Math.pow(h, 0.85) * 270]; }, { step: 2 }),
    s: cycle(40, p => { const g = Math.max(0, 1 - Math.min(p, 1 - p) * 14); return [100 + 18 * g, 100 - 22 * g]; }, { step: 2 }), a: still([0, 0]),
  }, 'Ball'),
]);
out.ball.loop = true;

// 14 · Clock -----------------------------------------------------------------------------------------------------
{
  const ticks = [0, 1, 2, 3].map(n => { const a = n * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); return group([path([[c * 128, s * 128], [c * 148, s * 148]]), stroke(C.ink, 14)], {}, 'Tick ' + n); });
  out.clock = comp('Clock', 512, 512, 90, [
    group([ell(340), stroke(C.blue, 26)], {}, 'Face'),
    ...ticks,
    group([path([[0, 0], [0, -76]]), stroke(C.ink, 22)], { r: anim([0, 90], [0, 360], 'lin') }, 'Hour'),
    group([path([[0, 0], [0, -118]]), stroke(C.blue, 16)], { r: anim([0, 90], [0, 1080], 'lin') }, 'Minute'),
    group([ell(34), col(C.ink)], {}, 'Pin'),
  ]);
  out.clock.loop = true;
}

// 15 · Equalizer -----------------------------------------------------------------------------------------------
{
  const spec = [[1, 0.0], [2, 0.2], [1, 0.55], [3, 0.1], [2, 0.7]], colors = [C.blue, C.teal, C.purple, C.teal, C.blue];
  out.equalizer = comp('Equalizer', 512, 512, 48, spec.map(([f, ph], n) => group([rect(50, 240, 25, [0, -120]), col(colors[n])], {
    p: still([-160 + n * 80, 140]), s: cycle(48, p => [100, 38 + 62 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (f * p + ph)))], { step: 2 }),
  }, 'Bar ' + n)));
  out.equalizer.loop = true;
}

// 16 · Gear ------------------------------------------------------------------------------------------------------
out.gear = comp('Gear', 512, 512, 90, [
  group([star(10, 170, 132), ell(104), { ...col(C.teal), r: 2 }], { r: anim([0, 90], [0, 360], 'lin') }, 'Gear'),
]);
out.gear.loop = true;

// 17 · Underline -------------------------------------------------------------------------------------------------
out.underline = comp('Underline', 512, 128, 54, [
  group([path([[-210, 6], [-60, -10], [90, 10], [210, -6]], false, [[[0, 0], [50, -12]], [[-50, 12], [50, -8]], [[-50, 8], [50, 4]], [[-50, -4], [0, 0]]]), trim(anim([0, 22], [0, 100], 'io')), stroke(C.amber, 26)], {}, 'Line'),
]);
out.underline.loop = false;

// 18 · Checklist -------------------------------------------------------------------------------------------------
{
  const rows = [0, 1, 2].map(n => {
    const y = -110 + n * 110, t0 = 8 + n * 26;
    return group([
      group([rect(70, 70, 16, [-150, y]), stroke(C.ink, 12)], {}, 'Box ' + n),
      group([path([[-174, y + 2], [-156, y + 22], [-124, y - 18]]), trim(anim([t0, t0 + 12], [0, 100], 'out')), stroke(C.green, 16)], {}, 'Tick ' + n),
      group([path([[-80, y], [150 - (n === 1 ? 50 : n === 2 ? 20 : 0), y]]), trim(anim([t0 + 4, t0 + 20], [0, 100], 'io')), stroke(C.ink, 18, 55)], {}, 'Line ' + n),
    ], {}, 'Row ' + n);
  });
  out.checklist = comp('Checklist', 512, 512, 100, rows); out.checklist.loop = false;
}

// The still frame of each (a fraction of its length): the picture of it when it doesn't move (thumbnails, «reduce motion»,
// PowerPoint), the one that says what it is.
const STILL = { check: 1, cross: 1, 'arrow-right': 0.5, 'arrow-down': 0.5, confetti: 0.3, loader: 0.1, star: 1, heartbeat: 0.17, ripple: 0.5, idea: 0.5,
  sparkles: 0.5, progress: 1, ball: 0.5, clock: 0.1, equalizer: 0.5, gear: 0, underline: 1, checklist: 1 };

// ---- writing --------------------------------------------------------------------------------------------------
const meta = {};
for (const [id, j] of Object.entries(out)) {
  const { loop, ...json } = j;
  writeFileSync(join(OUT, id + '.json'), JSON.stringify(json));
  meta[id] = { loop: !!loop, w: json.w, h: json.h, frames: json.op, still: STILL[id] };
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(meta, null, 1));
console.log(Object.keys(out).length, 'animations →', OUT);
