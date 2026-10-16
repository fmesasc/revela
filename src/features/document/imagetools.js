// What «Editar imagen» does to the picture itself (ui/dialogs/imageedit.js), each one step to undo:
// - extend: more picture around it, to a shape or a margin, filled with a blurred copy of it, its edges mirrored or a
//   colour — without AI (the AI's way is Editar con IA ▸ Ampliar por los bordes);
// - split into layers (Canva's «Magic Grab»): the main subject cut out (the same AI as «Quitar fondo») on top, and under
//   it the picture with the subject's place filled from what is around it, both where the picture was.

import { BG_REMOVAL } from '../../core/vendor.js';
import { commit, currentSlide, state } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { t } from '../../i18n/index.js';
import { boxBlur } from '../../render/imagelook.js';

const MAX = 4096;                                        // (the longest side made: a browser's canvas limit is not far)
export function loadPicture(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(t('No se pudo leer la imagen'))); i.src = src; });
}
const canvasOf = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) });
// (A photo stays a JPEG — a fraction of the size —; anything that may be see-through, a PNG.)
const encode = (c, src) => (/^data:image\/jpe?g/i.test(src || '') ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png'));

// The part of the picture in sight in its box (its fit, focus and crop): [sx, sy, sw, sh] in the picture's pixels,
// where it is drawn in the box [x, y, w, h], and k: slide pixels per picture pixel.
export function visiblePart(b, iw, ih) {
  const fit = b.fit || 'contain';
  let w = b.w, h = b.h, x = 0, y = 0;
  if (fit !== 'fill') {
    const k = fit === 'cover' ? Math.max(b.w / iw, b.h / ih) : Math.min(b.w / iw, b.h / ih);
    w = iw * k; h = ih * k;
    const fx = fit === 'cover' ? (b.focusX ?? 50) / 100 : 0.5, fy = fit === 'cover' ? (b.focusY ?? 50) / 100 : 0.5;
    x = (b.w - w) * fx; y = (b.h - h) * fy;
  }
  const c = b.crop || {}, L = Math.max(x, b.w * (c.left || 0) / 100), T = Math.max(y, b.h * (c.top || 0) / 100);
  const R = Math.min(x + w, b.w * (1 - (c.right || 0) / 100)), B = Math.min(y + h, b.h * (1 - (c.bottom || 0) / 100));
  const kx = iw / w, ky = ih / h;
  return { src: [(L - x) * kx, (T - y) * ky, Math.max(1, (R - L) * kx), Math.max(1, (B - T) * ky)], box: [L, T, R - L, B - T], k: w / iw };
}

export const EXTEND_RATIOS = [['16:9', 'Panorámica 16:9 (la diapositiva)'], ['4:3', '4:3'], ['1:1', 'Cuadrada'], ['3:2', '3:2'], ['9:16', 'Vertical 9:16'], ['margin', 'Un margen alrededor']];
export const EXTEND_FILLS = [['blur', 'La misma imagen, desenfocada'], ['mirror', 'Sus bordes, como en un espejo'], ['color', 'Un color'], ['none', 'Nada (transparente)']];
// The new size around a sw×sh picture: [W, H, left, top] (null: it already has that shape).
export function extendSize(sw, sh, { ratio = '16:9', margin = 15 } = {}) {
  if (ratio === 'margin') { const m = Math.round(Math.max(sw, sh) * Math.max(1, Math.min(100, +margin || 0)) / 100); return [sw + 2 * m, sh + 2 * m, m, m]; }
  const [a, c] = String(ratio).split(':').map(Number), r = a / c; if (!(r > 0)) return null;
  if (Math.abs(sw / sh - r) / r < 0.01) return null;
  const W = Math.round(Math.max(sw, sh * r)), H = Math.round(Math.max(sh, sw / r));
  return [W, H, Math.round((W - sw) / 2), Math.round((H - sh) / 2)];
}
// The picture (its part [sx, sy, sw, sh]) on a larger canvas → { canvas, pad: [left, top], k (scale applied) }.
// max: the longest side (a smaller one for the dialog's preview).
// A blur of colour and transparency together (premultiplied): boxBlur leaves the transparency sharp — right for a
// cut-out's outline, but a see-through logo blurred so stayed readable.
export function blurAll(d, W, H, r) {
  const n = W * H, pm = new Float32Array(n * 4), al = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; for (let ch = 0; ch < 3; ch++) pm[i * 4 + ch] = d[i * 4 + ch] * a; al[i * 4] = d[i * 4 + 3]; }
  boxBlur(pm, W, H, r); boxBlur(al, W, H, r);
  for (let i = 0; i < n; i++) { const A = al[i * 4], u = A > 0 ? 255 / A : 0; for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = pm[i * 4 + ch] * u; d[i * 4 + 3] = A; }
  return d;
}
export function extendCanvas(img, part, opts = {}) {
  const [sx, sy, sw, sh] = part, size = extendSize(sw, sh, opts); if (!size) return null;
  const s = Math.min(1, (opts.max || MAX) / Math.max(size[0], size[1])), [W, H, L, T] = size.map(v => v * s), w = sw * s, h = sh * s;
  const c = canvasOf(W, H), g = c.getContext('2d');
  if (opts.fill === 'color') { g.fillStyle = /^#[0-9a-f]{6}$/i.test(opts.color || '') ? opts.color : '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
  else if (opts.fill === 'mirror') {
    // (Copies all round, every other one turned over: each edge goes on as its reflection.)
    const nx = Math.ceil(L / w) + 1, ny = Math.ceil(T / h) + 1;
    for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      g.save(); g.translate(L + i * w + (i % 2 ? w : 0), T + j * h + (j % 2 ? h : 0)); g.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
      g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); g.restore();
    }
  } else if (opts.fill !== 'none') {
    // (Blurred: the picture filling it all, drawn small, blurred and enlarged — the same in every browser; blurred
    // enough that a logo's letters, filling it, can't be read.)
    const sm = canvasOf(Math.max(8, c.width / 24), Math.max(8, c.height / 24)), q = sm.getContext('2d'), kk = Math.max(sm.width / sw, sm.height / sh);
    q.drawImage(img, sx, sy, sw, sh, (sm.width - sw * kk) / 2, (sm.height - sh * kk) / 2, sw * kk, sh * kk);
    const d = q.getImageData(0, 0, sm.width, sm.height); blurAll(d.data, sm.width, sm.height, Math.max(2, Math.round(Math.min(sm.width, sm.height) * 0.12))); q.putImageData(d, 0, 0);
    g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, c.width, c.height);
  }
  g.drawImage(img, sx, sy, sw, sh, L, T, w, h);
  return { canvas: c, pad: [L / s, T / s], k: s };
}
// Extend picture `id` (as it is seen: its crop and fit) → true, or false when it already had that shape. Its box grows
// around it, the picture staying where and as big as it was (smaller if the whole would not fit the slide).
export async function extendImage(id, opts) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'image') return false;
  const img = await loadPicture(b.src), iw = img.naturalWidth, ih = img.naturalHeight;
  const v = visiblePart(b, iw, ih), made = extendCanvas(img, v.src, opts); if (!made) return false;
  // (Transparent margins, or a see-through picture: a PNG — a JPEG would make them black.)
  const src = opts.fill === 'none' || seeThrough(img) > 0.03 ? made.canvas.toDataURL('image/png') : encode(made.canvas, b.src), { w: SW, h: SH } = state.deck.size;
  let k = v.k / made.k, w = made.canvas.width * k, h = made.canvas.height * k;
  let x = b.x + v.box[0] - made.pad[0] * v.k, y = b.y + v.box[1] - made.pad[1] * v.k;
  const fit = Math.min(1, SW / w, SH / h);
  if (fit < 1) { const cx = x + w / 2, cy = y + h / 2; w *= fit; h *= fit; x = cx - w / 2; y = cy - h / 2; }
  commit(() => {
    b.src = src; b.fit = 'contain';
    for (const p of ['crop', 'uncropped', 'focusX', 'focusY', 'ratio']) delete b[p];
    Object.assign(b, { x: Math.round(Math.min(SW - w, Math.max(0, x))), y: Math.round(Math.min(SH - h, Math.max(0, y))), w: Math.round(w), h: Math.round(h) });
  });
  return true;
}

// ---- Layers ----------------------------------------------------------------------------------------------------
// The subject alone (a PNG data URL, the picture's size): the background removal's AI. (A test or a plug-in may put
// another in its place.)
export const layerKit = {
  cutout: src => import(BG_REMOVAL).then(m => m.removeBackground(src))
    .then(blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); })),
};
// The holes (weight 0) filled from what is around them («push-pull»): halved again and again, each pixel the mean of
// the known ones under it, then back up, each hole taking the coarser level's colour — smooth, without a seam.
// d: RGBA (0…255), known: 0…1 per pixel.
export function fillHoles(d, known, W, H) {
  const levels = [{ w: W, h: H, c: Float32Array.from({ length: W * H * 4 }, (_, i) => d[i] * known[i >> 2]), a: Float32Array.from(known) }];
  while (levels.at(-1).w > 1 || levels.at(-1).h > 1) {
    const p = levels.at(-1), w = Math.ceil(p.w / 2), h = Math.ceil(p.h / 2), c = new Float32Array(w * h * 4), a = new Float32Array(w * h);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, o = (y >> 1) * w + (x >> 1);
      a[o] += p.a[i] / 4; for (let ch = 0; ch < 4; ch++) c[o * 4 + ch] += p.c[i * 4 + ch] / 4;
    }
    levels.push({ w, h, c, a });
  }
  const top = levels.at(-1); if (top.a[0] > 0) for (let ch = 0; ch < 4; ch++) top.c[ch] /= top.a[0]; top.a[0] = 1;
  for (let L = levels.length - 2; L >= 0; L--) {
    const p = levels[L], q = levels[L + 1];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, a = p.a[i]; if (a >= 1) { if (a > 1) { for (let ch = 0; ch < 4; ch++) p.c[i * 4 + ch] /= a; p.a[i] = 1; } continue; }
      // (The coarser level read between its pixels, so that its squares don't show.)
      const fx = Math.min(q.w - 1, Math.max(0, (x - 0.5) / 2)), fy = Math.min(q.h - 1, Math.max(0, (y - 0.5) / 2));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(q.w - 1, x0 + 1), y1 = Math.min(q.h - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
      for (let ch = 0; ch < 4; ch++) {
        const at = (xx, yy) => q.c[(yy * q.w + xx) * 4 + ch];
        const v = (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) + (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty;
        p.c[i * 4 + ch] = p.c[i * 4 + ch] + (1 - a) * v;
      }
      p.a[i] = 1;
    }
  }
  const c = levels[0].c; for (let i = 0; i < d.length; i++) d[i] = c[i];
  return d;
}
// The picture's two layers → { subject, background } (data URLs, the picture's size), or an error if nothing stands out.
// The AI sees the picture squared and on white: it squeezes whatever it gets into a square (a wide logo came out
// smudged), and a see-through part reaches it as black (its gaps came out as black lines). What it keeps is then
// limited to what the picture shows — a picture with no background of its own has nothing to separate.
// The subject alone, the picture's size (W×H: its own, or smaller), as the AI sees it so (squared, on white).
export async function subjectCanvas(img, W = img.naturalWidth, H = img.naturalHeight) {
  const S = Math.max(W, H), sq = canvasOf(S, S), sg = sq.getContext('2d'); sg.fillStyle = '#fff'; sg.fillRect(0, 0, S, S);
  sg.drawImage(img, (S - W) / 2, (S - H) / 2, W, H);
  const cut = await layerKit.cutout(sq.toDataURL('image/png')).then(loadPicture), k = cut.naturalWidth / S;
  const top = canvasOf(W, H), tg = top.getContext('2d');
  tg.drawImage(cut, (S - W) / 2 * k, (S - H) / 2 * k, W * k, H * k, 0, 0, W, H);
  tg.globalCompositeOperation = 'destination-in'; tg.drawImage(img, 0, 0, W, H); tg.globalCompositeOperation = 'source-over';
  return top;
}
// How much of a picture is see-through (0…1): a logo or a cut-out has no background of its own to take away.
export function seeThrough(img) {
  const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = canvasOf(w, h), g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 20) n++;
  return n / (w * h);
}
// «Quitar fondo» (a still picture): the subject alone as a PNG data URL — the AI seeing it as Capas does —, or an
// error when there is nothing to take away.
export async function cutoutPicture(src) {
  const img = await loadPicture(src), top = await subjectCanvas(img), W = img.naturalWidth, H = img.naturalHeight;
  const m = top.getContext('2d').getImageData(0, 0, W, H).data, base = canvasOf(W, H), g = base.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data; let on = 0, shown = 0;
  for (let i = 3; i < d.length; i += 4) { if (m[i] > 20) on++; if (d[i] > 20) shown++; }
  if (on < shown * 0.003) throw new Error(t('No se ha encontrado nada que separar del fondo.'));
  if (on > shown * 0.97 && shown < W * H * 0.97) throw new Error(t('Esta imagen ya no tiene fondo: no hay nada que separar.'));
  return top.toDataURL('image/png');
}
export async function pictureLayers(src) {
  const img = await loadPicture(src), W = img.naturalWidth, H = img.naturalHeight, n = W * H;
  const top = await subjectCanvas(img), base = canvasOf(W, H), tg = top.getContext('2d');
  const g = base.getContext('2d'); g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, W, H), d = px.data, m = tg.getImageData(0, 0, W, H).data;
  let on = 0, shown = 0; for (let i = 0; i < n; i++) { if (m[i * 4 + 3] > 20) on++; if (d[i * 4 + 3] > 20) shown++; }
  if (on < shown * 0.003) throw new Error(t('No se ha encontrado nada que separar del fondo.'));
  if (on > shown * 0.97) throw new Error(shown < n * 0.97 ? t('Esta imagen ya no tiene fondo: no hay nada que separar.') : t('No se ha encontrado nada que separar del fondo.'));
  // (The subject's place a little larger, so that its outline — a halo of its colours — goes too.)
  const r = Math.max(2, Math.round(Math.min(W, H) * 0.012)), grow = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) grow[i * 4] = m[i * 4 + 3] > 20 ? 255 : 0;
  boxBlur(grow, W, H, r, 1);
  const known = new Float32Array(n); for (let i = 0; i < n; i++) known[i] = grow[i * 4] > 4 ? 0 : 1;
  // (Filled premultiplied: a see-through neighbour gives its transparency, not its hidden colour — black, a grey smudge.)
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; d[i * 4] *= a; d[i * 4 + 1] *= a; d[i * 4 + 2] *= a; }
  const f = fillHoles(Float32Array.from(d), known, W, H);
  for (let i = 0; i < n; i++) { const a = f[i * 4 + 3], u = a > 0 ? 255 / a : 0; d[i * 4] = f[i * 4] * u; d[i * 4 + 1] = f[i * 4 + 1] * u; d[i * 4 + 2] = f[i * 4 + 2] * u; d[i * 4 + 3] = a; }
  g.putImageData(px, 0, 0);
  return { subject: top.toDataURL('image/png'), background: encode(base, src) };
}
// Split picture `id`: the picture becomes its background (it keeps its animations, links…), and a copy with the subject
// alone goes on top, in the same place — both selected, not grouped, so that one click takes the subject on its own.
// → the subject's id.
export async function splitLayers(id) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'image') return null;
  const { subject, background } = await pictureLayers(b.src);
  const top = { ...structuredClone(b), id: uid(), src: subject, animation: null };
  for (const p of ['anims', 'link', 'zoomable', 'pano']) delete top[p];
  commit(() => {
    const s = currentSlide(), i = s.blocks.indexOf(b); if (i < 0) return;
    b.src = background; s.blocks.splice(i + 1, 0, top);
    state.ui.selection = top.id; state.ui.multi = [b.id, top.id];
  });
  return top.id;
}

// ---- Pixel tools: each makes a new picture, one step to undo -----------------------------------------------------
// - straighten: turned a little, enlarged so that no corner is left empty (Lightroom's «Enderezar»);
// - hideArea: what is painted, blurred or in big squares (a pupil's face or name on a photo of the class);
// - eraseArea: what is painted, filled from what is around it (the same fill as Capas' hole);
// - retouchCutout: after «Quitar fondo», more taken away, or given back from the picture it was;
// - blurBackground, selectiveColour: with the subject's mask (the same AI as «Quitar fondo»): portrait mode, and the
//   background in black and white;
// - recolour: one colour of the picture (its hue, give or take) made another;
// - photoColours: its few main colours, for the theme.
// A painted mask is a canvas of any size (the brush's), laid over the whole picture.

const pictureOf = id => currentSlide().blocks.find(x => x.id === id && x.type === 'image') || null;
export async function pixelsOf(src, max = MAX) {
  const img = await loadPicture(src), k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * k)), H = Math.max(1, Math.round(img.naturalHeight * k));
  const c = canvasOf(W, H), g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
  return { img, c, g, W, H, data: g.getImageData(0, 0, W, H) };
}
// The mask at W×H: 0…1 per pixel (its alpha).
export function maskWeights(mask, W, H) {
  const c = canvasOf(W, H), g = c.getContext('2d'); g.drawImage(mask, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255;
  return out;
}
const painted = w => { for (let i = 0; i < w.length; i += 7) if (w[i] > 0.01) return true; return w.some(v => v > 0.01); };
// The new pixels, as the picture's new source (JPEG stays JPEG unless asked for transparency); one step.
async function setPixels(id, P, png = false) {
  const b = pictureOf(id); if (!b) return null;
  P.g.putImageData(P.data, 0, 0);
  const src = png ? P.c.toDataURL('image/png') : encode(P.c, b.src);
  commit(() => { b.src = src; });
  return src;
}

// Enderezar: deg (−45…45), the picture's own size kept.
export const straightenZoom = (deg, W, H) => { const a = Math.abs(deg) * Math.PI / 180; return Math.cos(a) + Math.max(W / H, H / W) * Math.sin(a); };
export async function straightenImage(id, deg) {
  const b = pictureOf(id); deg = Math.max(-45, Math.min(45, +deg || 0)); if (!b || !deg) return null;
  const img = await loadPicture(b.src), k0 = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  // (A see-through picture — a logo —: its corners need no filling, and filling them took a long one ×2 and more,
  // leaving pieces: the object is turned instead, as a whole.)
  if (seeThrough(img) > 0.03) { commit(() => { b.rotation = Math.round(((+b.rotation || 0) + deg + 540) % 360 - 180); }); return b.src; }
  const W = Math.round(img.naturalWidth * k0), H = Math.round(img.naturalHeight * k0), c = canvasOf(W, H), g = c.getContext('2d'), k = straightenZoom(deg, W, H);
  g.imageSmoothingQuality = 'high'; g.translate(W / 2, H / 2); g.rotate(deg * Math.PI / 180); g.scale(k, k); g.drawImage(img, -W / 2, -H / 2, W, H);
  const src = encode(c, b.src); commit(() => { b.src = src; }); return src;
}

// Difuminar o pixelar: strength 0…100 (how big the blur or the squares are, from the picture's size).
export function hideData(data, w, { mode = 'blur', strength = 60 } = {}) {
  // (Premultiplied, with its transparency blurred too: black letters on a see-through logo, blurred as colour alone,
  // stayed black letters — nothing changed.)
  const d = data.data, W = data.width, H = data.height, L = Math.max(W, H), n = W * H;
  const pm = new Float32Array(n * 4), al = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; for (let ch = 0; ch < 3; ch++) pm[i * 4 + ch] = d[i * 4 + ch] * a; al[i * 4] = d[i * 4 + 3]; }
  if (mode === 'pixel') {
    const s = Math.max(4, Math.round(L * (0.012 + strength / 100 * 0.05)));
    for (let y0 = 0; y0 < H; y0 += s) for (let x0 = 0; x0 < W; x0 += s) {
      const x1 = Math.min(W, x0 + s), y1 = Math.min(H, y0 + s), k = (x1 - x0) * (y1 - y0), m = [0, 0, 0, 0];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * W + x; for (let ch = 0; ch < 3; ch++) m[ch] += pm[i * 4 + ch]; m[3] += al[i * 4]; }
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * W + x; for (let ch = 0; ch < 3; ch++) pm[i * 4 + ch] = m[ch] / k; al[i * 4] = m[3] / k; }
    }
  } else { const r = Math.max(3, Math.round(L * (0.008 + strength / 100 * 0.03))); boxBlur(pm, W, H, r); boxBlur(al, W, H, r); }
  for (let i = 0; i < n; i++) {
    const a = w[i]; if (!(a > 0)) continue;
    const A = al[i * 4], u = A > 0 ? 255 / A : 0;
    for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = d[i * 4 + ch] * (1 - a) + pm[i * 4 + ch] * u * a;
    d[i * 4 + 3] = d[i * 4 + 3] * (1 - a) + A * a;
  }
  return data;
}
export async function hideArea(id, mask, opts) {
  const b = pictureOf(id); if (!b) return null;
  const P = await pixelsOf(b.src), w = maskWeights(mask, P.W, P.H); if (!painted(w)) return null;
  hideData(P.data, w, opts); return setPixels(id, P);
}
// Borrar: what is painted (a little more, so that its outline goes too) filled from around it.
export function eraseData(data, w) {
  const W = data.width, H = data.height, grow = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < w.length; i++) grow[i * 4] = w[i] > 0.05 ? 255 : 0;
  boxBlur(grow, W, H, Math.max(1, Math.round(Math.min(W, H) * 0.004)), 1);
  const known = new Float32Array(W * H); for (let i = 0; i < known.length; i++) known[i] = grow[i * 4] > 4 ? 0 : 1;
  // (Premultiplied, as Capas' hole: a see-through neighbour gives its transparency, not its hidden colour.)
  const d = data.data, f = Float32Array.from(d, (v, i) => ((i & 3) === 3 ? v : v * d[i | 3] / 255));
  fillHoles(f, known, W, H);
  for (let i = 0; i < d.length; i += 4) { const a = f[i + 3], u = a > 0 ? 255 / a : 0; d[i] = f[i] * u; d[i + 1] = f[i + 1] * u; d[i + 2] = f[i + 2] * u; d[i + 3] = a; }
  return data;
}
export async function eraseArea(id, mask) {
  const b = pictureOf(id); if (!b) return null;
  const P = await pixelsOf(b.src), w = maskWeights(mask, P.W, P.H); if (!painted(w)) return null;
  // (A picture with see-through parts — a logo, a cut-out —: what is painted goes, as with an eraser. Filled from
  // around it, it was a smudge of half its colours and half the transparency.)
  if (seeThrough(P.img) > 0.03) { const d = P.data.data; for (let i = 0; i < w.length; i++) d[i * 4 + 3] *= 1 - w[i]; return setPixels(id, P, true); }
  eraseData(P.data, w); return setPixels(id, P);
}
// The pictures a background was taken from (this session's: the deck would double its size keeping them), so that
// «Retocar el recorte» can give some of it back. id → the picture before.
export const cutoutOrigins = new Map();
// mode 'erase': more made see-through; 'restore': the picture before, where painted.
export async function retouchCutout(id, mask, mode = 'erase') {
  const b = pictureOf(id); if (!b) return null;
  const P = await pixelsOf(b.src), w = maskWeights(mask, P.W, P.H), d = P.data.data; if (!painted(w)) return null;
  if (mode === 'restore') {
    const from = cutoutOrigins.get(id); if (!from) return null;
    const o = await loadPicture(from), oc = canvasOf(P.W, P.H), og = oc.getContext('2d'); og.drawImage(o, 0, 0, P.W, P.H);
    const od = og.getImageData(0, 0, P.W, P.H).data;
    for (let i = 0; i < w.length; i++) { const a = w[i]; if (a > 0) for (let ch = 0; ch < 4; ch++) d[i * 4 + ch] = d[i * 4 + ch] * (1 - a) + od[i * 4 + ch] * a; }
  } else for (let i = 0; i < w.length; i++) d[i * 4 + 3] *= 1 - w[i];
  return setPixels(id, P, true);
}

// The subject's mask (subjectCanvas: the background removal's AI): 0…1 per pixel at W×H. One per picture this session.
const masks = new Map();
export async function subjectMask(src, W, H) {
  if (!masks.has(src)) masks.set(src, loadPicture(src).then(img => subjectCanvas(img)).catch(e => { masks.delete(src); throw e; }));
  const cut = await masks.get(src), c = canvasOf(W, H), g = c.getContext('2d'); g.drawImage(cut, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
  let on = 0; for (let i = 0; i < a.length; i++) { a[i] = d[i * 4 + 3] / 255; if (a[i] > 0.1) on++; }
  if (on < a.length * 0.003) throw new Error(t('No se ha encontrado nada que separar del fondo.'));
  // (What the picture shows: a logo with no background of its own has nothing to blur or turn grey around it.)
  // (Counted at the same size and threshold as the mask: on a small copy a thin logo's edges counted for more.)
  const pc = canvasOf(W, H), pg = pc.getContext('2d'); pg.drawImage(await loadPicture(src), 0, 0, W, H);
  const pd = pg.getImageData(0, 0, W, H).data; let shown = 0; for (let i = 3; i < pd.length; i += 4) if (pd[i] > 25) shown++;
  if (on > shown * 0.97) throw new Error(shown < a.length * 0.97 ? t('Esta imagen ya no tiene fondo: no hay nada que separar.') : t('No se ha encontrado nada que separar del fondo.'));
  return a;
}
// Portrait mode: the background blurred (its subject's place first filled from around it, so that no halo of the
// subject is blurred into it), the subject sharp on top. strength 0…100.
export function blurBackgroundData(data, a, strength = 60) {
  const W = data.width, H = data.height, d = data.data, bg = new Uint8ClampedArray(d), known = new Float32Array(W * H);
  const grow = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < a.length; i++) grow[i * 4] = a[i] > 0.08 ? 255 : 0;
  boxBlur(grow, W, H, Math.max(2, Math.round(Math.min(W, H) * 0.01)), 1);
  for (let i = 0; i < known.length; i++) known[i] = grow[i * 4] > 4 ? 0 : 1;
  fillHoles(bg, known, W, H);
  boxBlur(bg, W, H, Math.max(2, Math.round(Math.max(W, H) * (0.004 + Math.max(0, Math.min(100, strength)) / 100 * 0.025))));
  for (let i = 0; i < a.length; i++) for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = d[i * 4 + ch] * a[i] + bg[i * 4 + ch] * (1 - a[i]);
  return data;
}
export function selectiveData(data, a) {
  const d = data.data;
  for (let i = 0; i < a.length; i++) {
    const y = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2], k = a[i];
    for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = d[i * 4 + ch] * k + y * (1 - k);
  }
  return data;
}
export async function subjectEffect(id, kind, strength) {
  const b = pictureOf(id); if (!b) return null;
  const src = b.src, P = await pixelsOf(src), a = await subjectMask(src, P.W, P.H);
  if (kind === 'blur') blurBackgroundData(P.data, a, strength); else selectiveData(P.data, a);
  return setPixels(id, P);
}

// Cambiar un color: the pixels whose hue is near `from`'s (tolerance 0…100), turned to `to`'s hue — their light and
// how colourful they are kept, so that shading stays; the greys are left alone.
const hsl = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn; if (!dd) return [0, 0, l];
  const s = dd / (1 - Math.abs(2 * l - 1) || 1), h = mx === r ? ((g - b) / dd + 6) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [h * 60, s, l];
};
const fromHsl = (h, s, l) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, k = Math.floor(((h % 360) + 360) % 360 / 60);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k]; return [r + m, g + m, b + m]; };
const rgbOf = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export function recolourData(data, { from = '#ff0000', to = '#0000ff', tolerance = 40 } = {}) {
  const d = data.data, [h0, s0, l0] = hsl(...rgbOf(from)), [h1, s1] = hsl(...rgbOf(to)), tk = Math.max(0, Math.min(100, tolerance)) / 100, tol = 4 + tk * 56;
  const satK = s0 > 0.05 ? Math.min(2, s1 / s0) : 1;
  for (let i = 0; i < d.length; i += 4) {
    const [h, s, l] = hsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255); if (s < 0.08) continue;
    // (Near in hue above all; and not too far in how light and how colourful, so that a brown is not the sand.)
    const dh = Math.abs(((h - h0 + 540) % 360) - 180), near = Math.max(0, 1 - (Math.abs(s - s0) + Math.abs(l - l0)) / (0.45 + tk * 0.6));
    const w = Math.min(1, Math.max(0, (tol - dh) / (tol * 0.35))) * Math.min(1, (s - 0.08) / 0.12) * Math.min(1, near * 2);
    if (w <= 0) continue;
    // (The new colour whole, mixed with the old by how near it was: turned only part of the way, a hue went through
    // the ones between — an orange half-way to blue was a red smear on a yellow dog.)
    const [r, g, b] = fromHsl(h + ((h1 - h0 + 540) % 360 - 180), Math.min(1, s * satK), l);
    d[i] += (r * 255 - d[i]) * w; d[i + 1] += (g * 255 - d[i + 1]) * w; d[i + 2] += (b * 255 - d[i + 2]) * w;
  }
  return data;
}
export async function recolour(id, opts) {
  const b = pictureOf(id); if (!b) return null;
  const P = await pixelsOf(b.src); recolourData(P.data, opts); return setPixels(id, P);
}

// Colores de la foto: its main colours (k-means on a small copy, the see-through left out), the commonest first.
export async function photoColours(src, n = 6) {
  const P = await pixelsOf(src, 72), d = P.data.data, px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return [];
  // (Seeds far apart: the first the mean, each next the pixel farthest from those chosen — the same every time.)
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const mean = [0, 1, 2].map(ch => px.reduce((s, p) => s + p[ch], 0) / px.length), cs = [mean];
  while (cs.length < n) { let best = null, bd = -1; for (const p of px) { const m = Math.min(...cs.map(c => dist(p, c))); if (m > bd) { bd = m; best = p; } } if (bd < 200) break; cs.push([...best]); }
  let count = [];
  for (let it = 0; it < 8; it++) {
    const sum = cs.map(() => [0, 0, 0]); count = cs.map(() => 0);
    for (const p of px) { let k = 0, m = Infinity; cs.forEach((c, j) => { const v = dist(p, c); if (v < m) { m = v; k = j; } }); count[k]++; for (let ch = 0; ch < 3; ch++) sum[k][ch] += p[ch]; }
    cs.forEach((c, j) => { if (count[j]) for (let ch = 0; ch < 3; ch++) c[ch] = sum[j][ch] / count[j]; });
  }
  const hx = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  return cs.map((c, j) => [hx(c), count[j]]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
