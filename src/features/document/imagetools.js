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
export const EXTEND_FILLS = [['blur', 'La misma imagen, desenfocada'], ['mirror', 'Sus bordes, como en un espejo'], ['color', 'Un color']];
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
  } else {
    // (Blurred: the picture filling it all, drawn small, blurred and enlarged — the same in every browser.)
    const sm = canvasOf(Math.max(8, c.width / 16), Math.max(8, c.height / 16)), q = sm.getContext('2d'), kk = Math.max(sm.width / sw, sm.height / sh);
    q.drawImage(img, sx, sy, sw, sh, (sm.width - sw * kk) / 2, (sm.height - sh * kk) / 2, sw * kk, sh * kk);
    const d = q.getImageData(0, 0, sm.width, sm.height); boxBlur(d.data, sm.width, sm.height, 2); q.putImageData(d, 0, 0);
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
  const src = encode(made.canvas, b.src), { w: SW, h: SH } = state.deck.size;
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
export async function pictureLayers(src) {
  const [img, cut] = await Promise.all([loadPicture(src), layerKit.cutout(src).then(loadPicture)]);
  const W = img.naturalWidth, H = img.naturalHeight, top = canvasOf(W, H), base = canvasOf(W, H);
  top.getContext('2d').drawImage(cut, 0, 0, W, H);
  const g = base.getContext('2d'); g.drawImage(img, 0, 0);
  const m = top.getContext('2d').getImageData(0, 0, W, H).data, n = W * H;
  let on = 0; for (let i = 0; i < n; i++) if (m[i * 4 + 3] > 20) on++;
  if (on < n * 0.003 || on > n * 0.97) throw new Error(t('No se ha encontrado nada que separar del fondo.'));
  // (The subject's place a little larger, so that its outline — a halo of its colours — goes too.)
  const r = Math.max(2, Math.round(Math.min(W, H) * 0.012)), grow = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) grow[i * 4] = m[i * 4 + 3] > 20 ? 255 : 0;
  boxBlur(grow, W, H, r, 1);
  const known = new Float32Array(n); for (let i = 0; i < n; i++) known[i] = grow[i * 4] > 4 ? 0 : 1;
  const px = g.getImageData(0, 0, W, H); fillHoles(px.data, known, W, H); g.putImageData(px, 0, 0);
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
