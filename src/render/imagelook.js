// A picture's look beyond PowerPoint's four corrections (Imagen ▸ «Editar imagen», ui/dialogs/imageedit.js):
// - b.adj.warmth (−100…100), b.adj.hue (−180…180°), b.adj.sharpen (−100 softer … 100 sharper), b.adj.vignette (0…100);
// - Lightroom's: b.adj.exposure (−100…100: ±2 stops), highlights and shadows (−100…100), clarity (−100…100: local
//   contrast), grain (0…100), fade (0…100: the blacks lifted), and levels: black (0…120) and white (135…255) points,
//   gamma (30…300, 100 neutral) and a shift of each channel's midtones, red, green, blue (−100…100);
// - b.fx = { name, amount (0…100), dark, light }: a filter of the gallery below (Canva's and Instagram's), at that
//   strength; dark and light are a duotone's two colours;
// - b.mask = { shape, radius (0…100), feather (0…100) }: the picture in a shape (SHAPES), its edges soft;
// - b.sticker = { color, width (1…40) } and b.glow = { color, size (1…60) }: an outline and a glow around what is not
//   see-through — a cut-out's figure, or the shape of b.mask.
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
  const sh = cl(a.shadows, -100, 100) / 100, hl = cl(a.highlights, -100, 100) / 100, fade = cl(a.fade, 0, 100) / 100;
  const bp = cl(a.black, 0, 100) / 100 * 0.4, wp = 1 - cl(a.white, 0, 100) / 100 * 0.4, g = 2 ** (cl(a.mid, -100, 100) / 100);
  const ch = ['red', 'green', 'blue'].map(k => cl(a[k], -100, 100) / 100);
  if (!sh && !hl && !fade && !bp && wp === 1 && g === 1 && ch.every(v => !v)) return null;
  const c01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  return ch.map(c => Array.from({ length: N + 1 }, (_, i) => {
    let v = c01((i / N - bp) / (wp - bp)) ** (1 / g);                       // (levels: black and white points, midtones)
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
  const exp = cl(a.exposure, -100, 100);
  let m = chain(...(exp ? [bright(2 ** (exp / 50))] : []), ...(a.hue ? [hueMatrix(+a.hue)] : []), ...(a.warmth ? [warm(+a.warmth / 100)] : []));
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
  const plain = m.every((v, i) => Math.abs(v - I[i]) < 1e-4);
  if (plain && !curve && !sharp && !vig && !clar && !grain && !mask && !stk && !glow) return null;
  const r = v => Math.round(v * 1e4) / 1e4;
  return { m: plain ? null : m.map(r), curve: curve || undefined, clar: clar ? r(clar) : undefined, sharp: r(sharp), vig: r(vig),
    grain: grain ? r(grain) : undefined, mask, stk, glow, w, h };
}
// The properties that make a picture's look (copied and pasted together: «Copiar ajustes»), and none of them.
export const LOOK_PROPS = ['adj', 'fx', 'mask', 'sticker', 'glow'];
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
  if (s.m) { p += `<feColorMatrix type="matrix" values="${s.m.join(' ')}" result="m"/>`; last = 'm'; }
  if (s.curve) { p += `<feComponentTransfer in="${last}" result="cv">${['R', 'G', 'B'].map((c, i) => `<feFunc${c} type="table" tableValues="${s.curve[i].join(' ')}"/>`).join('')}</feComponentTransfer>`; last = 'cv'; }
  // (Clarity: the picture against a wide blur of itself, the difference made larger — or smaller.)
  if (s.clar) { const k = clarK(s.clar); p += `<feGaussianBlur in="${last}" stdDeviation="${r2(clarOf(s))}" result="cb"/><feMerge result="cbm"><feMergeNode in="${last}"/><feMergeNode in="cb"/></feMerge>`
    + `<feComposite in="${last}" in2="cbm" operator="arithmetic" k2="${r2(1 + k)}" k3="${r2(-k)}" result="cl"/>`; last = 'cl'; }
  if (s.sharp > 0) { const k = s.sharp; p += `<feConvolveMatrix in="${last}" order="3" kernelMatrix="0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0" edgeMode="duplicate" preserveAlpha="true" result="s"/>`; last = 's'; }
  // (Softer: blurred over itself, so that the edges, which the blur makes see-through, keep the picture.)
  if (s.sharp < 0) { p += `<feGaussianBlur in="${last}" stdDeviation="${Math.round(blurOf(s) * 100) / 100}" result="bl"/><feMerge result="s"><feMergeNode in="${last}"/><feMergeNode in="bl"/></feMerge>`; last = 's'; }
  if (s.vig) {
    const g = Math.round(vigEnd(s.vig) * 255), svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><radialGradient id="g" r="0.7071"><stop offset="${VIG_START}" stop-color="#fff"/><stop offset="1" stop-color="rgb(${g},${g},${g})"/></radialGradient><rect width="10" height="10" fill="url(#g)"/></svg>`;
    p += `<feImage href="data:image/svg+xml,${encodeURIComponent(svg)}" x="0" y="0" width="${s.w}" height="${s.h}" preserveAspectRatio="none" result="v"/><feComposite in="${last}" in2="v" operator="arithmetic" k1="1" result="vg"/>`; last = 'vg';
  }
  // (Grain: a fine grey noise added, where the picture is.)
  if (s.grain) { const a = r2(s.grain * GRAIN); p += `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="nz"/><feColorMatrix in="nz" type="matrix" values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1" result="ng"/>`
    + `<feComposite in="${last}" in2="ng" operator="arithmetic" k2="1" k3="${a}" k4="${r2(-a / 2)}" result="gr0"/><feComposite in="gr0" in2="SourceAlpha" operator="in" result="gr"/>`; last = 'gr'; }
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
    p += `<feMerge>${[...nodes, last].map(n => `<feMergeNode in="${n}"/>`).join('')}</feMerge>`;
  }
  return `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">${p}</filter>`;
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
