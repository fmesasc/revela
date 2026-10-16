// A picture's look beyond PowerPoint's four corrections (Imagen ▸ «Editar imagen», ui/dialogs/imageedit.js):
// - b.adj.warmth (−100…100), b.adj.hue (−180…180°), b.adj.sharpen (−100 softer … 100 sharper), b.adj.vignette (0…100);
// - b.fx = { name, amount (0…100), dark, light }: a filter of the gallery below (Canva's and Instagram's), at that
//   strength; dark and light are a duotone's two colours.
// All of it but the sharpness and the vignette is one colour matrix, so it draws the same everywhere: an SVG filter
// (url(#id) after the four CSS ones, render/svg.js imgFilter) in the editor, the thumbnails and the presentation, and the
// same sums on the pixels (applyLook) where there is no CSS filter: html2canvas (PDF, PNG) and «Guardar como imagen».
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

// What the look does, in numbers (null: nothing beyond the four corrections). w, h: the box, so that the
// softness and the vignette are the same size in the editor, a thumbnail and the presentation.
export function lookSpec(b) {
  const a = b?.adj || {}, f = FILTER[b?.fx?.name], t = f ? Math.max(0, Math.min(100, b.fx.amount ?? 100)) / 100 : 0;
  let m = chain(...(a.hue ? [hueMatrix(+a.hue)] : []), ...(a.warmth ? [warm(+a.warmth / 100)] : []));
  if (f && t) { const fm = f[2](b.fx); m = mul(fm.map((v, i) => I[i] + (v - I[i]) * t), m); }
  const sharp = Math.max(-100, Math.min(100, +a.sharpen || 0)) / 100, vig = Math.min(1, Math.max(0, +a.vignette || 0) / 100 + (f?.[3] || 0) * t);
  const plain = m.every((v, i) => Math.abs(v - I[i]) < 1e-4);
  if (plain && !sharp && !vig) return null;
  const r = v => Math.round(v * 1e4) / 1e4;
  return { m: plain ? null : m.map(r), sharp: r(sharp), vig: r(vig), w: Math.round(b.w || 100), h: Math.round(b.h || 100) };
}
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const specs = new Map();                                 // (id → spec: the export bakes a picture from its filter's id)
export function lookId(b) {
  const s = lookSpec(b); if (!s) return '';
  const id = 'rvl-' + hash(JSON.stringify(s)); specs.set(id, s); return id;
}
export const specOf = id => specs.get(id) || null;
const blurOf = s => (s.sharp < 0 ? -s.sharp * 0.01 * Math.min(s.w, s.h) : 0);   // (softer: up to 1 % of the box)
const VIG_START = 0.45, vigEnd = v => 1 - 0.8 * v;                                // (from 45 % of the way to the corners)

// The <filter> element (an SVG one; ids from lookId).
export function lookFilter(id, s) {
  if (!s) return '';
  let p = '', last = 'SourceGraphic';
  if (s.m) { p += `<feColorMatrix type="matrix" values="${s.m.join(' ')}" result="m"/>`; last = 'm'; }
  if (s.sharp > 0) { const k = s.sharp; p += `<feConvolveMatrix in="${last}" order="3" kernelMatrix="0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0" edgeMode="duplicate" preserveAlpha="true" result="s"/>`; last = 's'; }
  // (Softer: blurred over itself, so that the edges, which the blur makes see-through, keep the picture.)
  if (s.sharp < 0) { p += `<feGaussianBlur in="${last}" stdDeviation="${Math.round(blurOf(s) * 100) / 100}" result="bl"/><feMerge result="s"><feMergeNode in="${last}"/><feMergeNode in="bl"/></feMerge>`; last = 's'; }
  if (s.vig) {
    const g = Math.round(vigEnd(s.vig) * 255), svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><radialGradient id="g" r="0.7071"><stop offset="${VIG_START}" stop-color="#fff"/><stop offset="1" stop-color="rgb(${g},${g},${g})"/></radialGradient><rect width="10" height="10" fill="url(#g)"/></svg>`;
    p += `<feImage href="data:image/svg+xml,${encodeURIComponent(svg)}" x="0" y="0" width="${s.w}" height="${s.h}" preserveAspectRatio="none" result="v"/><feComposite in="${last}" in2="v" operator="arithmetic" k1="1"/>`;
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

// The same on pixels (ImageData of the picture drawn in its box at `scale` px per slide px; or of the picture itself,
// with scale its pixels per slide px). Colour, then sharpness or softness, then the vignette, as the SVG filter.
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
  return data;
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
