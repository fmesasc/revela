// A picture's look beyond PowerPoint's four corrections (Imagen ▸ «Editar imagen», ui/dialogs/imageedit.js):
// - b.adj.warmth (−100…100), b.adj.hue (−180…180°), b.adj.sharpen (−100 softer … 100 sharper), b.adj.vignette (0…100);
// - Lightroom's: b.adj.exposure (−100…100: ±2 stops), highlights and shadows (−100…100), clarity (−100…100: local
//   contrast), grain (0…100), fade (0…100: the blacks lifted), and levels: black (0…120) and white (135…255) points,
//   gamma (30…300, 100 neutral) and a shift of each channel's midtones, red, green, blue (−100…100);
// - b.fx = { name, amount (0…100), dark, light }: a filter of the gallery below (Canva's and Instagram's), at that
//   strength; dark and light are a duotone's two colours;
// - b.mask = { shape, radius (0…100), feather (0…100) }: the picture in a shape (SHAPES), its edges soft;
// - b.sticker = { color, width (1…40) } and b.glow = { color, size (1…60) }: an outline and a glow around what is not
//   see-through — a cut-out's figure, or the shape of b.mask;
// - b.efx = { name, amount (0…100), kind }: a creative effect (EFFECTS: glitch, illustration, a texture, a light leak,
//   motion blur), one at a time, over the filter;
// - b.focusBlur = { x, y (0…100 % of the box), size (0…100), blur (0…100) }: all blurred but a round area, softly;
// - the shadow's style (b.shadow.style: 'curl', 'lift', 'angle'; none is the plain drop-shadow, render/svg.js
//   shadowCSS) and b.reflect = { size (5…100 % of the height), opacity (0…100), gap (px) }: drawn by the same filter,
//   past the box (its region made larger: lookPad), so that they follow what shows — the figure, the shape, the crop.
//   A picture with them has its crop in the filter too (render/svg.js imgClip): a clip-path would cut them off.
// The colour is one matrix and a tone curve (a table per channel), so it draws the same everywhere: an SVG filter
// (url(#id) after the four CSS ones, render/svg.js imgFilter) in the editor, the thumbnails and the presentation, and the
// same sums on the pixels (applyLook) where there is no CSS filter: html2canvas (PDF, PNG) and «Guardar como imagen».
// The rest (clarity, sharpness, grain, vignette, shape, outline, glow) is the same steps on both, in the box's own
// pixels: as wide in a thumbnail as on the slide. Only the grain is not the very same dots (feTurbulence on the one
// side, a seeded noise on the other), the same amount of them.
// The filter's id is a hash of what it does: the same look is one filter, wherever and however often it is drawn.

const I = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
// (4×5 matrices, as feColorMatrix's values; mul(A, B): B first, then A.)
const mul = (A, B) => { const o = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
  let s = j === 4 ? A[i * 5 + 4] : 0; for (let k = 0; k < 4; k++) s += A[i * 5 + k] * B[k * 5 + j]; o.push(s); } return o; };
const chain = (...ms) => ms.reduce((a, m) => mul(m, a), I);       // (in the order given)
const rgb = (m, off = [0, 0, 0]) => [m[0], m[1], m[2], 0, off[0], m[3], m[4], m[5], 0, off[1], m[6], m[7], m[8], 0, off[2], 0, 0, 0, 1, 0];
const diag = (r, g, b, o = 0) => rgb([r, 0, 0, 0, g, 0, 0, 0, b], [o, o, o]);
const sat = s => rgb([0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]);
const contrast = c => diag(c, c, c, (1 - c) / 2);
const bright = k => diag(k, k, k);
const lift = o => diag(1 - o, 1 - o, 1 - o, o);                  // (the blacks raised: a faded print)
const gray = rgb([0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722]);
const sepia = rgb([0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131]);
const warm = w => diag(1 + 0.2 * w, 1 + 0.04 * w, 1 - 0.24 * w);
const hex = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); const n = m ? parseInt(m[1], 16) : 0; return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const tint = (c, a) => { const [r, g, b] = hex(c); return rgb([1 - a, 0, 0, 0, 1 - a, 0, 0, 0, 1 - a], [r * a, g * a, b * a]); };
// The picture's light as a scale from one colour (its shadows) to the other (its highlights).
const duotone = (dark, light) => { const d = hex(dark), l = hex(light), L = [0.2126, 0.7152, 0.0722];
  return [0, 1, 2].flatMap(i => [...L.map(x => x * (l[i] - d[i])), 0, d[i]]).concat([0, 0, 0, 1, 0]); };
export function hueMatrix(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return rgb([0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]);
}

export const DUOTONE = { dark: '#2b1a5e', light: '#ffb38a' };
// The gallery: [id, name (Spanish: the interface translates it), its matrix, its own vignette (0…1)].
export const FILTERS = [
  ['vivid', 'Vivo', () => chain(sat(1.8), contrast(1.15))],
  ['warm', 'Cálido', () => chain(warm(0.9), sat(1.15), tint('#ff9a3c', 0.1))],
  ['cool', 'Frío', () => chain(warm(-0.9), sat(0.95), tint('#4f9dff', 0.1))],
  ['golden', 'Dorado', () => chain(warm(0.5), contrast(1.05), tint('#ffb347', 0.28))],
  ['sunset', 'Atardecer', () => chain(sat(1.15), contrast(1.08), warm(0.3), tint('#ff5e62', 0.3))],
  ['rose', 'Rosa', () => chain(sat(0.85), bright(1.05), tint('#ff5fa8', 0.35))],
  ['retro', 'Retro', () => chain(warm(0.2), sat(0.75), contrast(0.88), tint('#c8a06a', 0.28), lift(0.06)), 0.35],
  ['sepia', 'Sepia', () => sepia],
  ['bw', 'Blanco y negro', () => chain(gray, contrast(1.1))],
  ['noir', 'Noir', () => chain(gray, contrast(1.6), bright(0.92)), 0.45],
  ['faded', 'Desvaído', () => chain(sat(0.7), contrast(0.78), lift(0.1))],
  ['pastel', 'Pastel', () => chain(sat(0.65), bright(1.05), contrast(0.82), lift(0.08))],
  ['drama', 'Dramático', () => chain(sat(0.75), bright(0.95), contrast(1.45)), 0.3],
  ['cyano', 'Cianotipia', () => duotone('#0b2a5b', '#e8f1ff')],
  ['duotone', 'Duotono', fx => duotone(fx?.dark || DUOTONE.dark, fx?.light || DUOTONE.light)],
];
const FILTER = Object.fromEntries(FILTERS.map(f => [f[0], f]));

// ---- The picture's shape (b.mask) ------------------------------------------------------------------------------
// [id, name, how it takes the box ('meet': its own proportions, centred; 'fill': stretched to it), its outline in a
// 100×100 square — absolute M, L, C and Z only, so that it is scaled number by number into the box (maskPath)].
const KC = 0.5523;                                       // (a quarter circle as one cubic Bézier)
const r2 = v => Math.round(v * 100) / 100;
const CIRCLE = `M50 0C${r2(50 + 50 * KC)} 0 100 ${r2(50 - 50 * KC)} 100 50C100 ${r2(50 + 50 * KC)} ${r2(50 + 50 * KC)} 100 50 100C${r2(50 - 50 * KC)} 100 0 ${r2(50 + 50 * KC)} 0 50C0 ${r2(50 - 50 * KC)} ${r2(50 - 50 * KC)} 0 50 0Z`;
const STAR = 'M' + Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 21 : 50; return `${r2(50 + r * Math.cos(a))} ${r2(54.77 + r * Math.sin(a))}`; }).join('L') + 'Z';
export const SHAPES = [
  ['round', 'Esquinas redondeadas'],
  ['circle', 'Círculo', 'meet', CIRCLE],
  ['oval', 'Óvalo', 'fill', CIRCLE],
  ['arch', 'Arco', 'fill', 'M0 100L0 50C0 22.39 22.39 0 50 0C77.61 0 100 22.39 100 50L100 100Z'],
  ['hexagon', 'Hexágono', 'meet', 'M25 6.7L75 6.7L100 50L75 93.3L25 93.3L0 50Z'],
  ['star', 'Estrella', 'meet', STAR],
  ['heart', 'Corazón', 'meet', 'M50 92C50 92 4 64 4 34C4 16 18 6 32 6C42 6 48 12 50 18C52 12 58 6 68 6C82 6 96 16 96 34C96 64 50 92 50 92Z'],
  ['blob', 'Gota', 'fill', 'M52 3C74 3 95 16 97 40C99 62 88 81 68 92C50 101 23 96 11 79C0 62 2 37 15 19C25 7 38 3 52 3Z'],
  ['arrow', 'Flecha', 'fill', 'M0 30L62 30L62 5L100 50L62 95L62 70L0 70Z'],
];
const SHAPE = Object.fromEntries(SHAPES.map(x => [x[0], x]));
// The shape in a w×h box, m in from its edges (room for the soft edge, the outline and the glow), as path data.
export function maskPath(shape, radius, w, h, m = 0) {
  const W = Math.max(1, w - 2 * m), H = Math.max(1, h - 2 * m), S = SHAPE[shape];
  if (!S?.[3]) {                                         // (rounded corners, or the box itself)
    const r = shape === 'round' ? Math.min(W, H) / 2 * Math.max(0, Math.min(100, radius ?? 25)) / 100 : 0, q = r * (1 - KC), x = m, y = m;
    return [`M${x + r} ${y}L${x + W - r} ${y}`, r && `C${x + W - q} ${y} ${x + W} ${y + q} ${x + W} ${y + r}`, `L${x + W} ${y + H - r}`,
      r && `C${x + W} ${y + H - q} ${x + W - q} ${y + H} ${x + W - r} ${y + H}`, `L${x + r} ${y + H}`, r && `C${x + q} ${y + H} ${x} ${y + H - q} ${x} ${y + H - r}`,
      `L${x} ${y + r}`, r && `C${x} ${y + q} ${x + q} ${y} ${x + r} ${y}`, 'Z'].filter(Boolean).join('').replace(/-?\d+\.\d+/g, v => r2(+v));
  }
  let sx = W / 100, sy = H / 100, x0 = m, y0 = m;
  if (S[2] === 'meet') { const k = Math.min(sx, sy); x0 += (W - 100 * k) / 2; y0 += (H - 100 * k) / 2; sx = sy = k; }
  let i = 0; return S[3].replace(/-?[\d.]+/g, v => r2(i++ % 2 ? y0 + v * sy : x0 + v * sx));
}

// ---- The tone curve: levels, shadows and highlights, a channel's midtones, the fade -----------------------------
// One table per channel (feComponentTransfer's «table»: N + 1 values, straight lines between them), the same on pixels.
const N = 32;
const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, +v || 0));
function toneCurve(a) {
  // (Exposure: brighter as a curve that eases into white, not a product that clips — an orange doubled was a yellow.)
  const ex = cl(a.exposure, -100, 100) / 50, sh = cl(a.shadows, -100, 100) / 100, hl = cl(a.highlights, -100, 100) / 100, fade = cl(a.fade, 0, 100) / 100;
  const bp = cl(a.black, 0, 100) / 100 * 0.4, wp = 1 - cl(a.white, 0, 100) / 100 * 0.4, g = 2 ** (cl(a.mid, -100, 100) / 100);
  const ch = ['red', 'green', 'blue'].map(k => cl(a[k], -100, 100) / 100);
  if (!ex && !sh && !hl && !fade && !bp && wp === 1 && g === 1 && ch.every(v => !v)) return null;
  const c01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  return ch.map(c => Array.from({ length: N + 1 }, (_, i) => {
    const x = i / N, e = ex > 0 ? 1 - (1 - x) ** (2 ** ex) : x * 2 ** ex;
    let v = c01((e - bp) / (wp - bp)) ** (1 / g);                       // (levels: black and white points, midtones)
    // (Shadows lift or deepen the dark third, highlights the light one: two bumps that leave black and white be.)
    v = c01(v + 0.12 * 6.75 * (sh * v * (1 - v) ** 2 + hl * v * v * (1 - v)));
    v = v ** (2 ** -c);                                                     // (a channel's midtones: more of that colour)
    return Math.round((fade * 0.25 + (1 - fade * 0.25) * v) * 1e4) / 1e4;   // (faded: black is a dark grey)
  }));
}
const hexOk = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : d);

// What the look does, in numbers (null: nothing beyond the four corrections). w, h: the box, so that the
// softness, the vignette, the shape… are the same size in the editor, a thumbnail and the presentation.
export function lookSpec(b) {
  const a = b?.adj || {}, f = FILTER[b?.fx?.name], t = f ? Math.max(0, Math.min(100, b.fx.amount ?? 100)) / 100 : 0;
  let m = chain(...(a.hue ? [hueMatrix(+a.hue)] : []), ...(a.warmth ? [warm(+a.warmth / 100)] : []));
  if (f && t) { const fm = f[2](b.fx); m = mul(fm.map((v, i) => I[i] + (v - I[i]) * t), m); }
  const sharp = cl(a.sharpen, -100, 100) / 100, vig = Math.min(1, cl(a.vignette, 0, 100) / 100 + (f?.[3] || 0) * t);
  const clar = cl(a.clarity, -100, 100) / 100, grain = cl(a.grain, 0, 100) / 100, curve = toneCurve(a);
  const w = Math.round(b?.w || 100), h = Math.round(b?.h || 100), mn = Math.min(w, h);
  const stk = b?.sticker ? { c: hexOk(b.sticker.color, '#ffffff'), r: cl(b.sticker.width ?? 8, 1, 40) } : undefined;
  const glow = b?.glow ? { c: hexOk(b.glow.color, '#ffd54f'), r: cl(b.glow.size ?? 20, 1, 60) } : undefined;
  let mask;
  if (b?.mask && (b.mask.shape || b.mask.feather > 0)) {
    const fe = cl(b.mask.feather, 0, 100) / 100 * 0.06 * mn, room = 2 * fe + (stk ? stk.r : 0) + (glow ? glow.r : 0);
    mask = { d: maskPath(b.mask.shape || '', b.mask.radius, w, h, Math.min(room, mn / 3)), f: r2(fe) };
  }
  const efx = effectSpec(b?.efx, w, h), fb = focusSpec(b?.focusBlur, w, h), dec = decorSpec(b, w, h);
  const plain = m.every((v, i) => Math.abs(v - I[i]) < 1e-4);
  if (plain && !curve && !sharp && !vig && !clar && !grain && !mask && !stk && !glow && !efx && !fb && !dec) return null;
  const r = v => Math.round(v * 1e4) / 1e4;
  return { m: plain ? null : m.map(r), curve: curve || undefined, clar: clar ? r(clar) : undefined, sharp: r(sharp), vig: r(vig),
    grain: grain ? r(grain) : undefined, mask, stk, glow, efx, fb, dec, w, h };
}
// The properties that make a picture's look (copied and pasted together: «Copiar ajustes»), and none of them.
export const LOOK_PROPS = ['adj', 'fx', 'mask', 'sticker', 'glow', 'efx', 'focusBlur', 'reflect'];
export const NO_LOOK = Object.fromEntries(LOOK_PROPS.map(k => [k, null]));
export const hasLook = b => LOOK_PROPS.some(k => b?.[k]);
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const specs = new Map();                                 // (id → spec: the export bakes a picture from its filter's id)
export function lookId(b) {
  const s = lookSpec(b); if (!s) return '';
  const id = 'rvl-' + hash(JSON.stringify(s)); specs.set(id, s); return id;
}
export const specOf = id => specs.get(id) || null;
const blurOf = s => (s.sharp < 0 ? -s.sharp * 0.01 * Math.min(s.w, s.h) : 0);   // (softer: up to 1 % of the box)
const VIG_START = 0.45, vigEnd = v => 1 - 0.8 * v;                                // (from 45 % of the way to the corners)
const clarK = c => (c > 0 ? c : 0.6 * c), clarOf = s => 0.025 * Math.min(s.w, s.h);   // (local contrast: against a blur 2.5 % of the box wide)
const GRAIN = 0.5;                                                               // (the grain's strength at 100)
const STK_SIGMA = 1.9, GLOW_SIGMA = 0.5;                                         // (outline: a blur cut at 3 %: as wide as asked)

// The <filter> element (an SVG one; ids from lookId).
export function lookFilter(id, s) {
  if (!s) return '';
  let p = '', last = 'SourceGraphic';
  // (Its crop, when the filter draws past the box — a shadow's style, a reflection —: else a clip-path would cut them.)
  if (s.dec?.crop) { const [x, y, w, h] = s.dec.crop; p += `<feFlood x="${x}" y="${y}" width="${w}" height="${h}" flood-color="#fff" result="crp"/><feComposite in="SourceGraphic" in2="crp" operator="in" result="cr"/>`; last = 'cr'; }
  if (s.m) { p += `<feColorMatrix in="${last}" type="matrix" values="${s.m.join(' ')}" result="m"/>`; last = 'm'; }
  if (s.curve) { p += `<feComponentTransfer in="${last}" result="cv">${['R', 'G', 'B'].map((c, i) => `<feFunc${c} type="table" tableValues="${s.curve[i].join(' ')}"/>`).join('')}</feComponentTransfer>`; last = 'cv'; }
  if (s.efx?.n === 'illustr') [p, last] = effectSVG(s, p, last);
  // (Clarity: the picture against a wide blur of itself, the difference made larger — or smaller.)
  if (s.clar) { const k = clarK(s.clar); p += `<feGaussianBlur in="${last}" stdDeviation="${r2(clarOf(s))}" result="cb"/><feMerge result="cbm"><feMergeNode in="${last}"/><feMergeNode in="cb"/></feMerge>`
    + `<feComposite in="${last}" in2="cbm" operator="arithmetic" k2="${r2(1 + k)}" k3="${r2(-k)}" result="cl"/>`; last = 'cl'; }
  if (s.sharp > 0) { const k = s.sharp; p += `<feConvolveMatrix in="${last}" order="3" kernelMatrix="0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0" edgeMode="duplicate" preserveAlpha="true" result="s"/>`; last = 's'; }
  // (Softer: blurred over itself, so that the edges, which the blur makes see-through, keep the picture.)
  if (s.sharp < 0) { p += `<feGaussianBlur in="${last}" stdDeviation="${Math.round(blurOf(s) * 100) / 100}" result="bl"/><feMerge result="s"><feMergeNode in="${last}"/><feMergeNode in="bl"/></feMerge>`; last = 's'; }
  if (s.fb) [p, last] = focusSVG(s, p, last);
  if (s.efx?.n === 'motion') [p, last] = effectSVG(s, p, last);
  if (s.vig) {
    const g = Math.round(vigEnd(s.vig) * 255), svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><radialGradient id="g" r="0.7071"><stop offset="${VIG_START}" stop-color="#fff"/><stop offset="1" stop-color="rgb(${g},${g},${g})"/></radialGradient><rect width="10" height="10" fill="url(#g)"/></svg>`;
    p += `<feImage href="data:image/svg+xml,${encodeURIComponent(svg)}" x="0" y="0" width="${s.w}" height="${s.h}" preserveAspectRatio="none" result="v"/><feComposite in="${last}" in2="v" operator="arithmetic" k1="1" result="vg"/>`; last = 'vg';
  }
  // (Grain: a fine grey noise added, where the picture is.)
  if (s.grain) { const a = r2(s.grain * GRAIN); p += `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="nz"/><feColorMatrix in="nz" type="matrix" values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1" result="ng"/>`
    + `<feComposite in="${last}" in2="ng" operator="arithmetic" k2="1" k3="${a}" k4="${r2(-a / 2)}" result="gr0"/><feComposite in="gr0" in2="SourceAlpha" operator="in" result="gr"/>`; last = 'gr'; }
  if (s.efx && !['illustr', 'motion'].includes(s.efx.n)) [p, last] = effectSVG(s, p, last);
  if (s.mask) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" preserveAspectRatio="none"><path d="${s.mask.d}" fill="#fff"/></svg>`;
    p += `<feImage href="data:image/svg+xml,${encodeURIComponent(svg)}" x="0" y="0" width="${s.w}" height="${s.h}" preserveAspectRatio="none" result="mk"/>`
      + (s.mask.f ? `<feGaussianBlur in="mk" stdDeviation="${s.mask.f}" result="mk"/>` : '')
      + `<feComposite in="${last}" in2="mk" operator="in" result="sh"/>`; last = 'sh';
  }
  if (s.stk || s.glow) {
    p += `<feColorMatrix in="${last}" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="al"/>`;
    const nodes = [];
    if (s.glow) { p += `<feGaussianBlur in="al" stdDeviation="${r2(s.glow.r * GLOW_SIGMA)}" result="gb"/><feComponentTransfer in="gb" result="gt"><feFuncA type="linear" slope="1.6" intercept="0"/></feComponentTransfer>`
      + `<feFlood flood-color="${s.glow.c}" result="gc"/><feComposite in="gc" in2="gt" operator="in" result="gw"/>`; nodes.push('gw'); }
    if (s.stk) { p += `<feGaussianBlur in="al" stdDeviation="${r2(s.stk.r / STK_SIGMA)}" result="ob"/><feComponentTransfer in="ob" result="ot"><feFuncA type="linear" slope="50" intercept="-1"/></feComponentTransfer>`
      + `<feFlood flood-color="${s.stk.c}" result="oc"/><feComposite in="oc" in2="ot" operator="in" result="ol"/>`; nodes.push('ol'); }
    p += `<feMerge result="sg">${[...nodes, last].map(n => `<feMergeNode in="${n}"/>`).join('')}</feMerge>`; last = 'sg';
  }
  if (s.dec) [p, last] = decorSVG(s, p, last);
  // (Past the box only when something is drawn there: a shadow's style, a reflection.)
  const [L, T, R, B] = s.dec?.pad || [0, 0, 0, 0], f5 = v => Math.round(v * 1e5) / 1e5;
  return `<filter id="${id}" x="${f5(-L / s.w)}" y="${f5(-T / s.h)}" width="${f5(1 + (L + R) / s.w)}" height="${f5(1 + (T + B) / s.h)}" color-interpolation-filters="sRGB">${p}</filter>`;
}
const HOLDER = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';   // (not display:none: Chrome would drop its filters)
// The filters of these pictures, in one hidden <svg> (the presentation: io/formats/html.js buildHTML).
export function looksSVG(blocks) {
  const seen = new Map();
  for (const b of blocks) { if (b?.type !== 'image') continue; const id = lookId(b); if (id && !seen.has(id)) seen.set(id, lookFilter(id, specOf(id))); }
  return seen.size ? `<svg aria-hidden="true" width="0" height="0" style="${HOLDER}">${[...seen.values()].join('')}</svg>` : '';
}
// In the editor's page: this picture's filter, added once (the canvas and the thumbnails draw with it).
export function ensureLook(b, doc = globalThis.document) {
  const id = lookId(b); if (!id || !doc || doc.getElementById(id)) return id;
  let host = doc.getElementById('rv-looks');
  if (!host) { host = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); host.id = 'rv-looks'; host.setAttribute('aria-hidden', 'true'); host.setAttribute('style', HOLDER); doc.body.appendChild(host); }
  host.insertAdjacentHTML('beforeend', lookFilter(id, specOf(id)));
  // (A slider dragged makes one per step: the oldest go, those in sight being made again when drawn.)
  while (host.childElementCount > 400) host.firstElementChild.remove();
  return id;
}

// A pixel's grain: the same noise for the same place in the box, whatever the size it is drawn at.
const noise = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// The same on pixels (ImageData of the picture drawn in its box at `scale` px per slide px; or of the picture itself,
// with scale its pixels per slide px). In the SVG filter's order: colour, tone curve, clarity, sharpness or softness,
// vignette, grain, shape, then outline and glow.
export function applyLook(data, s, scale = 1) {
  if (!s) return data;
  const d = data.data, W = data.width, H = data.height, c = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  if (s.dec?.crop) {
    const [x, y, w, h] = s.dec.crop, x0 = Math.round(x * scale), y0 = Math.round(y * scale), x1 = Math.round((x + w) * scale), y1 = Math.round((y + h) * scale);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (xx < x0 || xx >= x1 || yy < y0 || yy >= y1) d[(yy * W + xx) * 4 + 3] = 0;
  }
  if (s.m) {
    const m = s.m;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      d[i] = 255 * c(m[0] * r + m[1] * g + m[2] * b + m[4]);
      d[i + 1] = 255 * c(m[5] * r + m[6] * g + m[7] * b + m[9]);
      d[i + 2] = 255 * c(m[10] * r + m[11] * g + m[12] * b + m[14]);
    }
  }
  if (s.curve) {
    // (feComponentTransfer's table: straight between its values.)
    const lut = s.curve.map(t => Uint8ClampedArray.from({ length: 256 }, (_, v) => { const x = v / 255 * N, k = Math.min(N - 1, Math.floor(x)); return 255 * (t[k] + (x - k) * (t[k + 1] - t[k])); }));
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[0][d[i]]; d[i + 1] = lut[1][d[i + 1]]; d[i + 2] = lut[2][d[i + 2]]; }
  }
  if (s.efx?.n === 'illustr') applyEffect(data, s, scale);
  if (s.clar) {
    const k = clarK(s.clar), bl = new Uint8ClampedArray(d); boxBlur(bl, W, H, Math.max(1, Math.round(clarOf(s) * scale)));
    for (let i = 0; i < d.length; i += 4) for (let ch = 0; ch < 3; ch++) d[i + ch] = (1 + k) * d[i + ch] - k * bl[i + ch];
  }
  if (s.sharp > 0) {
    const k = s.sharp, src = new Uint8ClampedArray(d), at = (x, y, ch) => src[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4 + ch];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let ch = 0; ch < 3; ch++)
      d[(y * W + x) * 4 + ch] = (1 + 4 * k) * at(x, y, ch) - k * (at(x - 1, y, ch) + at(x + 1, y, ch) + at(x, y - 1, ch) + at(x, y + 1, ch));
  }
  if (s.sharp < 0) boxBlur(d, W, H, Math.max(1, Math.round(blurOf(s) * scale)));   // (three box blurs of radius σ ≈ the Gaussian)
  if (s.fb) applyFocus(data, s, scale);
  if (s.efx?.n === 'motion') applyEffect(data, s, scale);
  if (s.vig) {
    const end = vigEnd(s.vig);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = Math.hypot((x + 0.5) / W - 0.5, (y + 0.5) / H - 0.5) / 0.7071;
      if (t <= VIG_START) continue;
      const f = 1 + (end - 1) * Math.min(1, (t - VIG_START) / (1 - VIG_START)), i = (y * W + x) * 4;
      d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
    }
  }
  if (s.grain) {
    const a = s.grain * GRAIN * 255 * 1.25, kx = s.w / W, ky = s.h / H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = Math.floor(x * kx), Y = Math.floor(y * ky), n = (noise(X, Y) + noise(X + 7919, Y) + noise(X, Y + 7919)) / 3 - 0.5, i = (y * W + x) * 4;
      d[i] += a * n; d[i + 1] += a * n; d[i + 2] += a * n;
    }
  }
  if (s.efx && !['illustr', 'motion'].includes(s.efx.n)) applyEffect(data, s, scale);
  if (s.mask) {
    const md = shapeMask(s.mask.d, W, H, s.w, s.h);
    if (s.mask.f) boxBlur(md, W, H, Math.max(1, Math.round(s.mask.f * W / s.w)));
    for (let i = 0; i < d.length; i += 4) d[i + 3] = d[i + 3] * md[i] / 255;
  }
  if (s.stk || s.glow) {
    // (The alpha, blurred: cut at 3 % it is the outline, as wide as asked and round at the corners; brightened, the glow.)
    const alphaBlur = sigma => { const t = new Uint8ClampedArray(d.length); for (let i = 0; i < d.length; i += 4) t[i] = d[i + 3]; boxBlur(t, W, H, Math.max(1, Math.round(sigma * scale)), 3); return t; };
    const layers = [];
    if (s.glow) { const t = alphaBlur(s.glow.r * GLOW_SIGMA); layers.push([hex(s.glow.c), i => Math.min(1, 1.6 * t[i] / 255)]); }
    if (s.stk) { const t = alphaBlur(s.stk.r / STK_SIGMA); layers.push([hex(s.stk.c), i => c(50 * t[i] / 255 - 1)]); }
    for (let i = 0; i < d.length; i += 4) {
      let R = 0, G = 0, B = 0, A = 0;                    // (premultiplied, each layer over the one before, the picture last)
      for (const [[r, g, b], al] of layers) { const a = al(i); R = r * a + R * (1 - a); G = g * a + G * (1 - a); B = b * a + B * (1 - a); A = a + A * (1 - a); }
      const a = d[i + 3] / 255; R = d[i] / 255 * a + R * (1 - a); G = d[i + 1] / 255 * a + G * (1 - a); B = d[i + 2] / 255 * a + B * (1 - a); A = a + A * (1 - a);
      if (A > 0) { d[i] = 255 * R / A; d[i + 1] = 255 * G / A; d[i + 2] = 255 * B / A; } d[i + 3] = 255 * A;
    }
  }
  return data;
}
// The shape, white on black in a W×H canvas (the box w×h drawn at that size): its red channel, 0…255, per pixel.
export function shapeMask(d, W, H, w, h) {
  const cv = Object.assign(globalThis.document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.setTransform(W / w, 0, 0, H / h, 0, 0); g.fillStyle = '#fff'; g.fill(new Path2D(d));
  return g.getImageData(0, 0, W, H).data;
}
// Three box blurs of radius r, across and down, the edges repeated (colour only: the outline of a cut-out stays sharp).
export function boxBlur(d, W, H, r, passes = 3) {
  const tmp = new Float32Array(Math.max(W, H) * 3);
  const line = (n, idx) => {
    for (let ch = 0; ch < 3; ch++) {
      let acc = 0; for (let k = -r; k <= r; k++) acc += d[idx(Math.min(n - 1, Math.max(0, k))) + ch];
      for (let p = 0; p < n; p++) {
        tmp[p * 3 + ch] = acc / (2 * r + 1);
        acc += d[idx(Math.min(n - 1, p + r + 1)) + ch] - d[idx(Math.max(0, p - r)) + ch];
      }
    }
    for (let p = 0; p < n; p++) for (let ch = 0; ch < 3; ch++) d[idx(p) + ch] = tmp[p * 3 + ch];
  };
  for (let k = 0; k < passes; k++) {
    for (let y = 0; y < H; y++) line(W, x => (y * W + x) * 4);
    for (let x = 0; x < W; x++) line(H, y => (y * W + x) * 4);
  }
}

// ---- Creative effects (b.efx) -----------------------------------------------------------------------------------
// [id, name]. Each one is the same steps in the SVG filter and on pixels, in the box's own units (a thumbnail shows
// what the slide shows): Glitch, the colours split apart and bands of the picture slid sideways; Ilustración, its
// colours in a few flat steps and its edges darkened, as a drawing (Canva's «Vectorify»); Textura, a paper, canvas,
// film grain or worn texture over it (made here, no file: a tile, the same for the filter and the pixels); Destello
// de luz, a film's light leak (glows of colour from its corners); and a motion blur, sideways.
export const EFFECTS = [['glitch', 'Glitch'], ['illustr', 'Ilustración'], ['texture', 'Textura'], ['leak', 'Destello de luz'], ['motion', 'Desenfoque de movimiento']];
export const TEXTURES = [['paper', 'Papel'], ['canvas', 'Lienzo'], ['film', 'Grano de película'], ['grunge', 'Desgastado']];
export const LEAKS = [['warm', 'Cálido'], ['rose', 'Rosa'], ['blue', 'Azul']];
const EFFECT = Object.fromEntries(EFFECTS.map(e => [e[0], e]));
const TEX = { paper: [0.45, 0.5], canvas: [0.3, 0.45], film: [0.12, 0.6], grunge: [0.6, 0.7] };   // [its tile, a part of the box's longest side; its strength at 100]
// The glows: [x, y (0…1 of the box), radius (of its longest side), colour, opacity at 100].
const LEAK = {
  warm: [[0, 0.15, 0.75, '#ff6a00', 0.85], [0.95, 0.9, 0.55, '#ffd25e', 0.7], [0.15, 1, 0.4, '#ff2d55', 0.5]],
  rose: [[1, 0, 0.8, '#ff3d8b', 0.8], [0, 1, 0.6, '#ffb36b', 0.6]],
  blue: [[0, 0, 0.8, '#3fa9ff', 0.75], [1, 1, 0.6, '#b56bff', 0.6]],
};
// (A seeded random: the same glitch and the same texture every time, everywhere.)
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// The glitch's bands: [top, height, how far slid] in the box, about one in two slid.
function glitchBands(w, h, a) {
  const R = rng(1234567), out = []; let y = 0;
  while (y < h) {
    const y1 = Math.min(h, y + Math.max(2, Math.round(h * (0.02 + R() * 0.1)))), moved = R() < 0.45;
    out.push([y, y1 - y, moved ? r2((R() * 2 - 1) * a * 0.08 * w) : 0]); y = y1;
  }
  return out;
}
function effectSpec(e, w, h) {
  if (!EFFECT[e?.name]) return undefined;
  const a = cl(e.amount ?? 70, 0, 100) / 100; if (!a) return undefined;
  const n = e.name, L = Math.max(w, h), mn = Math.min(w, h), o = { n, a: r2(a) };
  if (n === 'glitch') { o.sh = r2(a * 0.02 * w); o.bands = glitchBands(w, h, a); }
  if (n === 'illustr') { o.lv = Math.max(3, Math.round(9 - 5 * a)); o.sm = r2(0.5 + 0.004 * mn * (0.5 + a)); o.sg = r2(0.004 * mn + 0.5); o.g = r2(3 + 9 * a); }
  if (n === 'texture') { o.k = TEX[e.kind] ? e.kind : 'paper'; o.ts = r2(TEX[o.k][0] * L); o.s = r2(TEX[o.k][1] * a); }
  if (n === 'leak') o.k = LEAK[e.kind] ? e.kind : 'warm';
  if (n === 'motion') o.sg = r2(a * 0.03 * w);
  return o;
}
const svgURL = (inner, x, y, w, h) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none">${inner}</svg>`)}`;
const feImg = (inner, x, y, w, h, res) => `<feImage href="${svgURL(inner, x, y, w, h)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" result="${res}"/>`;
const leakSVG = (e, w, h) => { const M = Math.max(w, h), B = LEAK[e.k];
  return `<defs>${B.map(([x, y, r, c, o], i) => `<radialGradient id="l${i}" gradientUnits="userSpaceOnUse" cx="${r2(x * w)}" cy="${r2(y * h)}" r="${r2(r * M)}"><stop offset="0" stop-color="${c}" stop-opacity="${r2(o * e.a)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`
    + B.map((_, i) => `<rect width="${w}" height="${h}" fill="url(#l${i})"/>`).join(''); };
// One colour channel alone, with its alpha (feColorMatrix's values).
const ONLY = k => [0, 1, 2].map(i => [0, 1, 2, 3, 4].map(j => (i === k && j === k ? 1 : 0)).join(' ')).join(' ') + ' 0 0 0 1 0';
// Its filter primitives after p, from `last` → [p, the result's name].
function effectSVG(s, p, last) {
  const e = s.efx, { w, h } = s;
  if (e.n === 'glitch') {
    // (Each colour alone, red and blue slid apart, added back together (screen); then the bands, each slid as it is.)
    const only = k => `<feColorMatrix in="${last}" type="matrix" values="${ONLY(k)}" result="gc${k}"/>`;
    p += only(0) + `<feOffset in="gc0" dx="${e.sh}" dy="0" result="go0"/>` + only(1) + only(2) + `<feOffset in="gc2" dx="${-e.sh}" dy="0" result="go2"/>`
      + `<feBlend in="go0" in2="gc1" mode="screen" result="grg"/><feBlend in="grg" in2="go2" mode="screen" result="gl"/>`
      + e.bands.map(([y, bh, dx], i) => `<feOffset in="gl" dx="${dx}" dy="0" x="0" y="${y}" width="${w}" height="${bh}" result="gs${i}"/>`).join('')
      + `<feMerge result="gli">${e.bands.map((_, i) => `<feMergeNode in="gs${i}"/>`).join('')}</feMerge>`;
    return [p, 'gli'];
  }
  if (e.n === 'illustr') {
    // (Smoothed first — a photo's grain made no specks of flat colour —, its colours in lv flat steps, times its edges:
    // 1 where it is as light as around it, darker where it is darker than around it — the dark side of each edge, a line.)
    const tv = Array.from({ length: e.lv }, (_, i) => r2(i / (e.lv - 1))).join(' ');
    p += `<feGaussianBlur in="${last}" stdDeviation="${e.sm}" result="is0"/><feMerge result="is"><feMergeNode in="${last}"/><feMergeNode in="is0"/></feMerge>`; last = 'is';
    p += `<feComponentTransfer in="${last}" result="ip">${['R', 'G', 'B'].map(c => `<feFunc${c} type="discrete" tableValues="${tv}"/>`).join('')}</feComponentTransfer>`
      + `<feColorMatrix in="${last}" type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 0 1" result="il"/>`
      + `<feGaussianBlur in="il" stdDeviation="${e.sg}" result="ib"/><feComposite in="il" in2="ib" operator="arithmetic" k2="${e.g}" k3="${-e.g}" k4="1" result="ie"/>`
      + `<feComposite in="ip" in2="ie" operator="arithmetic" k1="1" result="ill"/>`;
    return [p, 'ill'];
  }
  if (e.n === 'texture') {
    const t = textureTile(e.k);
    p += `<feImage href="${t.url}" x="0" y="0" width="${e.ts}" height="${e.ts}" preserveAspectRatio="none" result="tx0"/><feTile in="tx0" result="tx"/>`
      + `<feComposite in="${last}" in2="tx" operator="arithmetic" k2="1" k3="${e.s}" k4="${r2(-e.s / 2)}" result="te0"/><feComposite in="te0" in2="${last}" operator="in" result="tex"/>`;
    return [p, 'tex'];
  }
  if (e.n === 'leak') {
    p += feImg(leakSVG(e, w, h), 0, 0, w, h, 'lk') + `<feBlend in="${last}" in2="lk" mode="screen" result="lb"/><feComposite in="lb" in2="${last}" operator="in" result="lek"/>`;
    return [p, 'lek'];
  }
  // (Motion: blurred sideways, over itself — so that its sides, which the blur makes see-through, keep the picture.)
  p += `<feGaussianBlur in="${last}" stdDeviation="${e.sg} 0" result="mb"/><feMerge result="mot"><feMergeNode in="${last}"/><feMergeNode in="mb"/></feMerge>`;
  return [p, 'mot'];
}

// The texture's tile: TILE² grey values that wrap round (no seam where it repeats), as numbers and as a PNG.
const TILE = 128, tiles = new Map();
export function textureTile(kind) {
  if (tiles.has(kind)) return tiles.get(kind);
  const T = TILE, R = rng([...kind].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)), v = new Float32Array(T * T), wrap = i => ((i % T) + T) % T;
  const noise = cells => {                              // (smooth noise on a grid that wraps round)
    const g = Array.from({ length: cells * cells }, R), sm = t => t * t * (3 - 2 * t), at = (i, j) => g[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells];
    return (x, y) => { const fx = x / T * cells, fy = y / T * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
      return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty; };
  };
  const each = f => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) v[y * T + x] = f(x, y); };
  if (kind === 'canvas') { const a = noise(16), P = 8;   // (a weave: threads P px apart, over and under in turn)
    each((x, y) => ((Math.floor(x / P) + Math.floor(y / P)) & 1 ? Math.sin(Math.PI * (y % P) / P) : Math.sin(Math.PI * (x % P) / P)) * 0.7 + 0.3 * a(x, y)); }
  else if (kind === 'film') { each(() => R()); const c = Float32Array.from(v); each((x, y) => (2 * c[y * T + x] + c[y * T + wrap(x + 1)] + c[wrap(y + 1) * T + x]) / 4); }
  else if (kind === 'grunge') { const a = noise(5), b = noise(13);
    each((x, y) => { const m = 0.65 * a(x, y) + 0.35 * b(x, y); return 0.5 - 1.2 * Math.max(0, m - 0.55) + 0.8 * Math.max(0, 0.38 - m); });
    for (let n = 0; n < 260; n++) v[Math.floor(R() * T) * T + Math.floor(R() * T)] += R() < 0.6 ? -0.35 : 0.3; }
  else { const a = noise(8), b = noise(32); each((x, y) => 0.6 * a(x, y) + 0.4 * b(x, y));   // (paper: soft clouds and fibres)
    for (let n = 0; n < 160; n++) { const x = R() * T, y = R() * T, ang = R() * Math.PI, len = 6 + R() * 24, s = (R() < 0.5 ? -1 : 1) * (0.08 + R() * 0.1);
      for (let t = 0; t < len; t++) v[wrap(Math.round(y + Math.sin(ang) * t)) * T + wrap(Math.round(x + Math.cos(ang) * t))] += s; } }
  // (About 0.5, spread alike: every texture as strong at the same amount.)
  let mean = 0; for (const x of v) mean += x; mean /= v.length;
  let sd = 0; for (const x of v) sd += (x - mean) ** 2; sd = Math.sqrt(sd / v.length) || 1;
  const q = Uint8ClampedArray.from(v, x => 255 * (0.5 + (x - mean) / (5 * sd)));
  let url = '';
  if (globalThis.document) {
    const c = Object.assign(document.createElement('canvas'), { width: T, height: T }), g = c.getContext('2d'), im = g.createImageData(T, T);
    for (let i = 0; i < q.length; i++) { im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = q[i]; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); url = c.toDataURL('image/png');
  }
  const t = { T, q, url }; tiles.set(kind, t); return t;
}

// ---- Focus (b.focusBlur): sharp inside a circle, blurred outside it, softly in between --------------------------
function focusSpec(f, w, h) {
  if (!f) return undefined; const k = cl(f.blur ?? 60, 0, 100) / 100; if (!k) return undefined;
  const L = Math.max(w, h), r0 = (0.05 + 0.55 * cl(f.size ?? 35, 0, 100) / 100) * L;
  return { x: r2(cl(f.x ?? 50, 0, 100) / 100 * w), y: r2(cl(f.y ?? 50, 0, 100) / 100 * h), r0: r2(r0), r1: r2(r0 + 0.22 * L), sg: r2(0.5 + k * 0.025 * L) };
}
function focusSVG(s, p, last) {
  const f = s.fb, { w, h } = s;
  // (The blur over the picture, so that its edges stay; then the picture where the mask is, the blur where it is not.)
  p += `<feGaussianBlur in="${last}" stdDeviation="${f.sg}" result="fb0"/><feMerge result="fb1"><feMergeNode in="${last}"/><feMergeNode in="fb0"/></feMerge>`
    + feImg(`<radialGradient id="f" gradientUnits="userSpaceOnUse" cx="${f.x}" cy="${f.y}" r="${f.r1}"><stop offset="${r2(f.r0 / f.r1)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><rect width="${w}" height="${h}" fill="url(#f)"/>`, 0, 0, w, h, 'fm')
    + `<feComposite in="${last}" in2="fm" operator="in" result="fa"/><feComposite in="fb1" in2="fm" operator="out" result="fo"/><feComposite in="fa" in2="fo" operator="arithmetic" k2="1" k3="1" result="foc"/>`;
  return [p, 'foc'];
}

// ---- The shadow's styles and the reflection: past the box ---------------------------------------------------------
// [style, name] ('' the plain one: CSS's drop-shadow, render/svg.js shadowCSS). Curvada: under the bottom corners only,
// as a page whose corners curl up; Levantada: smaller and further down, as a page lifted off the table; En ángulo: cast
// on the floor behind it, squashed and slanted — the figure's own outline (a cut-out's), its foot at the bottom.
export const SHADOW_STYLES = [['', 'Normal'], ['curl', 'Curvada'], ['lift', 'Levantada'], ['angle', 'En ángulo']];
const STYLED = ['curl', 'lift', 'angle'];
export const hasDecor = b => !!(b?.reflect || STYLED.includes(b?.shadow?.style));
// A colour as #rrggbb and its opacity (#rrggbbaa, rgba(…)).
const colourOf = c => {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c || ''); if (m) return ['#' + m[1].toLowerCase(), m[2] ? parseInt(m[2], 16) / 255 : 1];
  const r = /rgba?\(([^)]*)\)/i.exec(c || ''); if (!r) return ['#000000', 0.4];
  const v = r[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  return ['#' + v.slice(0, 3).map(x => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join(''), v[3] ?? 1];
};
const CURL = [[0, 1], [0.12, 1], [0.4, 0], [0.6, 0], [0.88, 1], [1, 1]];   // (along the bottom: [where, how dark])
const curlAt = u => { for (let i = 1; i < CURL.length; i++) if (u <= CURL[i][0]) { const [a, va] = CURL[i - 1], [b, vb] = CURL[i]; return va + (vb - va) * Math.max(0, (u - a) / (b - a)); } return 1; };
function decorSpec(b, w, h) {
  if (!hasDecor(b)) return undefined;
  const mn = Math.min(w, h), S = b.shadow, o = {}; let pad = [0, 0, 0, 0];
  const grow = (...p) => { pad = pad.map((v, i) => Math.max(v, p[i])); };
  if (b.crop) { const c = b.crop, l = (c.left || 0) / 100, t = (c.top || 0) / 100; o.crop = [r2(w * l), r2(h * t), r2(w * (1 - l - (c.right || 0) / 100)), r2(h * (1 - t - (c.bottom || 0) / 100))]; }
  const fl = o.fl = o.crop ? r2(o.crop[1] + o.crop[3]) : h;      // (the floor: the picture's bottom edge, its crop's)
  if (S) {
    const [c, op] = colourOf(S.color || '#00000066'), st = STYLED.includes(S.style) ? S.style : 'normal', f = cl(S.dist ?? 50, 0, 100) / 50, sh = { st, c, o: r2(op) };
    if (st === 'normal') { sh.x = r2(+(S.x ?? 4) || 0); sh.y = r2(+(S.y ?? 6) || 0); sh.sg = r2(Math.max(0, +(S.blur ?? 10) || 0) / 2); const m = 3 * sh.sg; grow(m - sh.x, m - sh.y, m + sh.x, m + sh.y); }
    else if (st === 'curl') { sh.sg = r2(1 + 0.012 * mn * f); sh.d = r2(1 + 0.02 * mn * f); grow(3 * sh.sg, 0, 3 * sh.sg, sh.d + 3 * sh.sg); }
    else if (st === 'lift') { sh.e = r2(0.03 * mn); sh.sg = r2(1 + 0.03 * mn * f); sh.d = r2(1 + 0.05 * mn * f); grow(3 * sh.sg, 0, 3 * sh.sg, sh.d + 3 * sh.sg); }
    else {
      // (Each point of the figure at height u above the floor: on the floor at u·q behind it, u·s to the right — drawn
      // in the filter by a displacement map, whose two colours are where each point takes its shadow from; the same
      // numbers, rounded as the map's, on the pixels.)
      const q = Math.min(0.8, 0.15 + 0.2 * f), s = 0.5 * Math.min(2, f), ox = s * fl / 2, oy = (1 - q) * fl / 2, D = Math.max(1, s * fl, (1 - q) * fl);
      const ch = v => Math.round(255 * (v / D + 0.5));
      Object.assign(sh, { q: r2(q), sg: r2(1.5 + 0.006 * mn), ox: r2(ox), oy: r2(oy), S: r2(D), r0: ch(ox), g0: ch(oy), r1: ch(-ox), g1: ch(-oy) });
      // (Room below for the picture moved down by oy before it is displaced: what leaves the filter's region is lost.)
      grow(3 * sh.sg, 0, s * fl + 3 * sh.sg, fl - h + Math.max(3 * sh.sg, oy));
    }
    o.shd = sh;
  }
  if (b.reflect) {
    const R = b.reflect, rf = { g: r2(cl(R.gap ?? 0, 0, 200)), rh: r2(Math.max(1, cl(R.size ?? 40, 5, 100) / 100 * fl)), o: r2(cl(R.opacity ?? 35, 0, 100) / 100) };
    o.refl = rf; grow(0, 0, 0, fl - h + rf.g + rf.rh);
  }
  o.pad = pad.map(v => Math.ceil(Math.max(0, v)));
  return o;
}
// How far past its box a picture is drawn: [left, top, right, bottom] in slide pixels.
export const lookPad = b => lookSpec(b)?.dec?.pad || [0, 0, 0, 0];
function decorSVG(s, p, last) {
  const D = s.dec, { w, h } = s, [L, T, R, B] = D.pad, X0 = -L, RW = w + L + R, fl = D.fl, nodes = [];
  // (What is drawn past the box comes from the picture as it is in it: its glow or outline go no further than before.)
  p += `<feFlood x="0" y="0" width="${w}" height="${h}" flood-color="#fff" result="dbx"/><feComposite in="${last}" in2="dbx" operator="in" result="pic"/>`;
  const S = D.shd;
  if (S) {
    let a = 'pic';
    if (S.st === 'lift') { p += `<feMorphology in="pic" operator="erode" radius="${S.e}" result="se"/>`; a = 'se'; }
    if (S.st === 'angle') {
      const top = r2(fl * (1 - S.q)), bh = r2(fl * S.q);
      p += `<feOffset in="pic" dx="${S.ox}" dy="${S.oy}" result="sao"/>`
        + feImg(`<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${fl}"><stop offset="0" stop-color="rgb(${S.r1},${S.g1},0)"/><stop offset="1" stop-color="rgb(${S.r0},${S.g0},0)"/></linearGradient><rect x="${X0}" y="${top}" width="${RW}" height="${bh}" fill="url(#g)"/>`, X0, top, RW, bh, 'sam')
        + `<feDisplacementMap in="sao" in2="sam" scale="${S.S}" xChannelSelector="R" yChannelSelector="G" result="sad"/>`
        + `<feFlood x="${X0}" y="${top}" width="${RW}" height="${bh}" flood-color="#fff" result="sab"/><feComposite in="sad" in2="sab" operator="in" result="sa"/>`;
      a = 'sa';
    }
    const dx = S.st === 'normal' ? S.x : 0, dy = S.st === 'normal' ? S.y : S.d || 0;
    p += `<feGaussianBlur in="${a}" stdDeviation="${S.sg}" result="sb"/><feOffset in="sb" dx="${dx}" dy="${dy}" result="so"/>`;
    let m = 'so';
    if (S.st === 'curl') {
      p += feImg(`<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0">${CURL.map(([o, v]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${v}"/>`).join('')}</linearGradient><rect x="${X0}" y="${-T}" width="${RW}" height="${h + T + B}" fill="url(#g)"/>`, X0, -T, RW, h + T + B, 'scm')
        + `<feComposite in="so" in2="scm" operator="in" result="sc"/>`; m = 'sc';
    }
    p += `<feFlood flood-color="${S.c}" flood-opacity="${S.o}" result="sf"/><feComposite in="sf" in2="${m}" operator="in" result="shd"/>`; nodes.push('shd');
  }
  if (D.refl) {
    // (The picture turned upside down under its floor: a displacement map that reads each row from as far above the
    // floor as it is below; its sideways colour, 128, is not quite the middle — that little made up by the offset.)
    const { g, rh, o } = D.refl, S2 = r2(2 * rh), y0 = r2(fl + g), y1 = r2(fl + g + rh);
    const grad = stops => `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">${stops}</linearGradient><rect x="0" y="${y0}" width="${w}" height="${rh}" fill="url(#g)"/>`;
    p += `<feOffset in="pic" dx="${Math.round(S2 * (128 / 255 - 0.5) * 1000) / 1000}" dy="${r2(g + rh)}" result="rpo"/>`
      + feImg(grad('<stop offset="0" stop-color="rgb(128,255,0)"/><stop offset="1" stop-color="rgb(128,0,0)"/>'), 0, y0, w, rh, 'rpm')
      + `<feDisplacementMap in="rpo" in2="rpm" scale="${S2}" xChannelSelector="R" yChannelSelector="G" result="rpd"/>`
      + feImg(grad(`<stop offset="0" stop-color="#fff" stop-opacity="${o}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>`), 0, y0, w, rh, 'rpf')
      + `<feComposite in="rpd" in2="rpf" operator="in" result="rfl"/>`;
    nodes.push('rfl');
  }
  p += `<feMerge result="dec">${[...nodes, 'pic'].map(n => `<feMergeNode in="${n}"/>`).join('')}</feMerge>`;
  return [p, 'dec'];
}

// ---- The same on pixels ------------------------------------------------------------------------------------------
// A Gaussian blur (σx, σy in pixels) as three box blurs, of n channels, nothing past the edges — the SVG filter's
// way: what is beyond them is transparent.
function blurF(f, W, H, n, sx, sy) {
  const rOf = s => (s > 0.3 ? Math.max(1, Math.round((Math.sqrt(4 * s * s + 1) - 1) / 2)) : 0), rx = rOf(sx), ry = rOf(sy);
  const tmp = new Float32Array(Math.max(W, H) * n);
  const line = (len, r, at) => {
    for (let c = 0; c < n; c++) {
      let acc = 0; for (let k = 0; k <= Math.min(r, len - 1); k++) acc += f[at(k) + c];
      for (let p = 0; p < len; p++) {
        tmp[p * n + c] = acc / (2 * r + 1);
        if (p + r + 1 < len) acc += f[at(p + r + 1) + c];
        if (p - r >= 0) acc -= f[at(p - r) + c];
      }
    }
    for (let p = 0; p < len; p++) for (let c = 0; c < n; c++) f[at(p) + c] = tmp[p * n + c];
  };
  for (let pass = 0; pass < 3; pass++) {
    if (rx) for (let y = 0; y < H; y++) line(W, rx, x => (y * W + x) * n);
    if (ry) for (let x = 0; x < W; x++) line(H, ry, y => (y * W + x) * n);
  }
  return f;
}
// Premultiplied (0…255 × its alpha), and back.
const toPM = d => { const f = new Float32Array(d.length); for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; f[i] = d[i] * a; f[i + 1] = d[i + 1] * a; f[i + 2] = d[i + 2] * a; f[i + 3] = d[i + 3]; } return f; };
const fromPM = (f, d) => { for (let i = 0; i < d.length; i += 4) { const a = f[i + 3], u = a > 0 ? 255 / a : 0; d[i] = f[i] * u; d[i + 1] = f[i + 1] * u; d[i + 2] = f[i + 2] * u; d[i + 3] = a; } return d; };
// b over a (premultiplied, in place in b).
const overPM = (b, a) => { for (let i = 0; i < b.length; i += 4) { const k = 1 - b[i + 3] / 255; for (let c = 0; c < 4; c++) b[i + c] += a[i + c] * k; } return b; };

function applyFocus(data, s, scale) {
  const d = data.data, W = data.width, H = data.height, f = s.fb, O = toPM(d), Bl = overPM(blurF(Float32Array.from(O), W, H, 4, f.sg * scale, f.sg * scale), O);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dist = Math.hypot((x + 0.5) / scale - f.x, (y + 0.5) / scale - f.y), m = cl((f.r1 - dist) / (f.r1 - f.r0), 0, 1), i = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) O[i + c] = O[i + c] * m + Bl[i + c] * (1 - m);
  }
  fromPM(O, d);
}
function applyEffect(data, s, scale) {
  const d = data.data, W = data.width, H = data.height, e = s.efx;
  if (e.n === 'glitch') {
    const P = toPM(d), sh = Math.round(e.sh * scale), at = (x, y) => (x < 0 || x >= W ? -1 : (y * W + x) * 4), G = new Float32Array(d.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, r = at(x - sh, y), b = at(x + sh, y);
      const a1 = r < 0 ? 0 : P[r + 3] / 255, a2 = P[i + 3] / 255, a3 = b < 0 ? 0 : P[b + 3] / 255, a12 = a1 + a2 - a1 * a2;
      G[i] = r < 0 ? 0 : P[r]; G[i + 1] = P[i + 1]; G[i + 2] = b < 0 ? 0 : P[b + 2]; G[i + 3] = 255 * (a12 + a3 - a12 * a3);
    }
    const out = new Float32Array(d.length);
    for (const [y0, bh, dx] of e.bands) {
      const k = Math.round(dx * scale);
      for (let y = Math.max(0, Math.round(y0 * scale)); y < Math.min(H, Math.round((y0 + bh) * scale)); y++) for (let x = 0; x < W; x++) {
        const xs = x - k; if (xs < 0 || xs >= W) continue; const i = (y * W + x) * 4, j = (y * W + xs) * 4;
        out[i] = G[j]; out[i + 1] = G[j + 1]; out[i + 2] = G[j + 2]; out[i + 3] = G[j + 3];
      }
    }
    fromPM(out, d);
  } else if (e.n === 'illustr') {
    { const O = toPM(d); fromPM(overPM(blurF(Float32Array.from(O), W, H, 4, e.sm * scale, e.sm * scale), O), d); }
    const n = e.lv, step = v => 255 * Math.min(n - 1, Math.floor(v / 255 * n)) / (n - 1), Lm = new Float32Array(W * H);
    for (let i = 0; i < Lm.length; i++) Lm[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    const Bl = blurF(Float32Array.from(Lm), W, H, 1, e.sg * scale, e.sg * scale);
    for (let i = 0; i < Lm.length; i++) {
      const D = cl(1 + e.g * (Lm[i] - Bl[i]), 0, 1);
      for (let c = 0; c < 3; c++) d[i * 4 + c] = step(d[i * 4 + c]) * D;
    }
  } else if (e.n === 'texture') {
    const t = textureTile(e.k), T = t.T, q = t.q, kk = T / e.ts / scale, wrap = i => ((i % T) + T) % T;
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) * kk - 0.5, y0 = Math.floor(v), ty = v - y0, r0 = wrap(y0) * T, r1 = wrap(y0 + 1) * T;
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) * kk - 0.5, x0 = Math.floor(u), tx = u - x0, a = wrap(x0), b = wrap(x0 + 1);
        const tv = ((q[r0 + a] * (1 - tx) + q[r0 + b] * tx) * (1 - ty) + (q[r1 + a] * (1 - tx) + q[r1 + b] * tx) * ty) / 255, add = 255 * e.s * (tv - 0.5), i = (y * W + x) * 4;
        d[i] += add; d[i + 1] += add; d[i + 2] += add;
      }
    }
  } else if (e.n === 'leak') {
    const M = Math.max(s.w, s.h), B = LEAK[e.k].map(([x, y, r, c, o]) => [x * s.w, y * s.h, r * M, hex(c), o * e.a]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = (x + 0.5) / scale, Y = (y + 0.5) / scale, i = (y * W + x) * 4; let lr = 0, lg = 0, lb = 0, la = 0;
      for (const [bx, by, r, [cr, cg, cb], o] of B) {
        const a = o * Math.max(0, 1 - Math.hypot(X - bx, Y - by) / r); if (!a) continue;
        lr = cr * a + lr * (1 - a); lg = cg * a + lg * (1 - a); lb = cb * a + lb * (1 - a); la = a + la * (1 - a);
      }
      if (!la) continue;
      // (Screen, premultiplied, then kept where the picture is: as feBlend and feComposite «in».)
      const sa = d[i + 3] / 255, A = sa + la - sa * la; if (!(A > 0)) continue;
      for (const [c, l] of [[0, lr], [1, lg], [2, lb]]) { const cs = d[i + c] / 255 * sa; d[i + c] = 255 * (cs + l - cs * l) / A; }
      d[i + 3] = 255 * A * sa;
    }
  } else if (e.n === 'motion') {
    const O = toPM(d); fromPM(overPM(blurF(Float32Array.from(O), W, H, 4, e.sg * scale, 0), O), d);
  }
}
// Erosion (the smallest value in a (2r+1)² square, nothing past the edges): feMorphology's.
function erode(F, W, H, r) {
  if (r < 1) return F; const tmp = new Float32Array(Math.max(W, H));
  const line = (len, at) => {
    for (let p = 0; p < len; p++) { let m = 1; for (let q = p - r; q <= p + r && m > 0; q++) { const v = q < 0 || q >= len ? 0 : F[at(q)]; if (v < m) m = v; } tmp[p] = m; }
    for (let p = 0; p < len; p++) F[at(p)] = tmp[p];
  };
  for (let y = 0; y < H; y++) line(W, x => y * W + x);
  for (let x = 0; x < W; x++) line(H, y => y * W + x);
  return F;
}
// The picture's canvas (its box at k px per slide px, its look applied: applyLook) with its shadow's style and its
// reflection, past the box → { canvas, pad: [left, top, right, bottom] in slide px }. Without them, as it was.
export function decorate(c, s, k = 1) {
  const D = s?.dec; if (!D) return { canvas: c, pad: [0, 0, 0, 0] };
  const [L, T, R, B] = D.pad, W = c.width, H = c.height, ox = Math.round(L * k), oy = Math.round(T * k);
  const OW = W + ox + Math.round(R * k), OH = H + oy + Math.round(B * k), { w } = s, fl = D.fl;
  const mk = () => Object.assign(document.createElement('canvas'), { width: OW, height: OH });
  const out = mk(), g = out.getContext('2d'), src = c.getContext('2d').getImageData(0, 0, W, H).data;
  const paste = im => { const t = mk(); t.getContext('2d').putImageData(im, 0, 0); g.drawImage(t, 0, 0); };
  const S = D.shd;
  if (S) {
    const F = new Float32Array(OW * OH), alphaAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : src[(y * W + x) * 4 + 3] / 255);
    const place = (dx, dy) => { const X = ox + Math.round(dx * k), Y = oy + Math.round(dy * k);
      for (let y = 0; y < H; y++) { const yy = y + Y; if (yy < 0 || yy >= OH) continue; for (let x = 0; x < W; x++) { const xx = x + X; if (xx >= 0 && xx < OW) F[yy * OW + xx] = src[(y * W + x) * 4 + 3] / 255; } } };
    if (S.st === 'normal') place(S.x, S.y);
    else if (S.st !== 'angle') { place(0, S.d); if (S.st === 'lift') erode(F, OW, OH, Math.round(S.e * k)); }
    else {
      const top = fl * (1 - S.q), band = fl * S.q;
      for (let y = 0; y < OH; y++) {
        const Y = (y + 0.5) / k - T; if (Y < top || Y > fl) continue;
        const t = (Y - top) / band, dx = S.S * ((S.r1 + (S.r0 - S.r1) * t) / 255 - 0.5) - S.ox, dy = S.S * ((S.g1 + (S.g0 - S.g1) * t) / 255 - 0.5) - S.oy, ys = Math.floor((Y + dy) * k);
        for (let x = 0; x < OW; x++) F[y * OW + x] = alphaAt(Math.floor(((x + 0.5) / k - L + dx) * k), ys);
      }
    }
    blurF(F, OW, OH, 1, S.sg * k, S.sg * k);
    if (S.st === 'curl') for (let x = 0; x < OW; x++) { const m = curlAt(((x + 0.5) / k - L) / w); for (let y = 0; y < OH; y++) F[y * OW + x] *= m; }
    const im = g.createImageData(OW, OH), q = im.data, [r, gg, bb] = hex(S.c).map(v => v * 255);
    for (let i = 0; i < F.length; i++) { const a = F[i] * S.o; if (a > 0) { q[i * 4] = r; q[i * 4 + 1] = gg; q[i * 4 + 2] = bb; q[i * 4 + 3] = 255 * Math.min(1, a); } }
    paste(im);
  }
  if (D.refl) {
    const { g: gap, rh, o } = D.refl, im = g.createImageData(OW, OH), q = im.data;
    for (let y = 0; y < OH; y++) {
      const Y = (y + 0.5) / k - T, t = (Y - fl - gap) / rh; if (t < 0 || t > 1) continue;
      const ys = Math.floor((2 * fl + gap - Y) * k), fade = o * (1 - t); if (ys < 0 || ys >= H) continue;
      for (let x = 0; x < W; x++) { const i = (ys * W + x) * 4, j = (y * OW + x + ox) * 4; q[j] = src[i]; q[j + 1] = src[i + 1]; q[j + 2] = src[i + 2]; q[j + 3] = src[i + 3] * fade; }
    }
    paste(im);
  }
  g.drawImage(c, ox, oy);
  return { canvas: out, pad: D.pad };
}
