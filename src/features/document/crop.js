// Cropping a picture as in PowerPoint (ui/canvas/imagecrop.js draws it): the whole picture shows faint, a frame
// on it is dragged by its edges and corners, and what's left in the frame becomes the picture — its box, that
// part's size and place, nothing around it.
//
// The part kept is a picture of its own (b.src, fit 'fill'): it shows the same everywhere — editor, presentation,
// PowerPoint, PDF, pictures — with nothing new to understand. The whole one stays in b.uncropped { src, l, t, r, b }
// (the fractions cut from each side), so cropping again starts from the whole picture, and Restablecer brings it
// back. b.uncropped.sig: the signature of the part kept; when the picture is changed otherwise (background removed,
// replaced) they no longer match and the new one is the whole picture.
//
// Coordinates here are the box's own (0,0 its top-left corner, unrotated, unflipped), in slide pixels.
import { commit, currentSlide } from '../../core/store.js';
import { shortSig } from '../../core/text.js';
import { isGif } from '../live/media.js';

const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
// Its earlier crop, if it's still that picture.
const kept = b => (b.uncropped?.src && b.fit === 'fill' && !b.crop && b.uncropped.sig === shortSig(b.src || '') ? b.uncropped : null);
// An animated GIF would stop moving (only its first frame is kept), and a picture in a device frame is framed by
// the device: those keep the dialog's crop (ui/dialogs/object.js openImageCrop).
export const canCropOnSlide = b => b?.type === 'image' && !!b.src && !b.device && !isGif(b);

// → { src (the whole picture), nw, nh, D (where the whole one is, in the box), C (the frame now) }
export async function cropStart(b) {
  const u = kept(b);
  if (u) {
    const img = await loadImg(u.src), W = b.w / (1 - u.l - u.r), H = b.h / (1 - u.t - u.b);
    return { src: u.src, nw: img.naturalWidth, nh: img.naturalHeight, D: { x: -u.l * W, y: -u.t * H, w: W, h: H }, C: { x: 0, y: 0, w: b.w, h: b.h } };
  }
  const img = await loadImg(b.src), nw = img.naturalWidth || b.w, nh = img.naturalHeight || b.h, R = nw / nh, boxR = b.w / b.h;
  const fx = (b.focusX ?? 50) / 100, fy = (b.focusY ?? 50) / 100;
  let D = { x: 0, y: 0, w: b.w, h: b.h };
  if (b.fit === 'cover') {
    if (R > boxR) { D.w = b.h * R; D.x = -(D.w - b.w) * fx; } else { D.h = b.w / R; D.y = -(D.h - b.h) * fy; }
  } else if (b.fit !== 'fill') {
    if (R > boxR) { D.h = b.w / R; D.y = (b.h - D.h) / 2; } else { D.w = b.h * R; D.x = (b.w - D.w) / 2; }
  }
  // (The edges an older crop hid: that's where the frame starts.)
  const c = b.crop || {}, x0 = Math.max(D.x, b.w * (c.left || 0) / 100), x1 = Math.min(D.x + D.w, b.w * (1 - (c.right || 0) / 100));
  const y0 = Math.max(D.y, b.h * (c.top || 0) / 100), y1 = Math.min(D.y + D.h, b.h * (1 - (c.bottom || 0) / 100));
  return { src: b.src, nw, nh, D, C: x1 - x0 > 4 && y1 - y0 > 4 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { ...D } };
}

// A rectangle of the box (its own coordinates) on the slide: its box there, turned and flipped as the picture is.
export function boxOnSlide(b, r) {
  let dx = r.x + r.w / 2 - b.w / 2, dy = r.y + r.h / 2 - b.h / 2;
  if (b.flipH) dx = -dx; if (b.flipV) dy = -dy;
  const a = (b.rotation || 0) * Math.PI / 180, cx = b.x + b.w / 2 + dx * Math.cos(a) - dy * Math.sin(a), cy = b.y + b.h / 2 + dx * Math.sin(a) + dy * Math.cos(a);
  return { x: Math.round(cx - r.w / 2), y: Math.round(cy - r.h / 2), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) };
}

// The part of the whole picture (fractions l, t, r, b) as a picture of its own, at its own resolution.
export async function cutPicture(src, f) {
  const img = await loadImg(src), W = img.naturalWidth, H = img.naturalHeight;
  // (An SVG has no pixels of its own: drawn at least as big as it shows, twice for sharp screens.)
  const svg = /^data:image\/svg|\.svg(\?|$)/i.test(src), k = svg ? Math.max(1, 2 * 1600 / Math.max(W, H)) : 1;
  const x = W * f.l, y = H * f.t, w = Math.max(1, W * (1 - f.l - f.r)), h = Math.max(1, H * (1 - f.t - f.b));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
  return /^data:image\/jpe?g/.test(src) ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
}

// The frame C on the whole picture D (box coordinates) becomes the picture. All of it: back to the whole one.
export async function applyCrop(id, { src, D, C }) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b) return false;
  const r4 = v => Math.max(0, Math.min(1, Math.round(v * 1e4) / 1e4));
  const f = { l: r4((C.x - D.x) / D.w), t: r4((C.y - D.y) / D.h), r: r4((D.x + D.w - C.x - C.w) / D.w), b: r4((D.y + D.h - C.y - C.h) / D.h) };
  const whole = f.l + f.t + f.r + f.b < 0.002, box = boxOnSlide(b, C);
  if (whole && !kept(b) && !b.crop && b.fit !== 'cover') return false;          // (nothing cut, as it was)
  const cut = whole ? src : await cutPicture(src, f);
  commit(() => {
    Object.assign(b, box, { src: cut, fit: 'fill' });
    delete b.crop; delete b.focusX; delete b.focusY; delete b.ratio;
    if (whole) delete b.uncropped; else b.uncropped = { src, ...f, sig: shortSig(cut) };
  });
  return true;
}

// Restablecer: the whole picture again, where it was (its box grows around the part that was kept).
export async function uncrop(id) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'image') return;
  const u = kept(b);
  if (!u) { commit(() => { delete b.crop; delete b.focusX; delete b.focusY; }); return; }
  const W = b.w / (1 - u.l - u.r), H = b.h / (1 - u.t - u.b), box = boxOnSlide(b, { x: -u.l * W, y: -u.t * H, w: W, h: H });
  commit(() => { Object.assign(b, box, { src: u.src, fit: 'fill' }); delete b.uncropped; delete b.crop; delete b.ratio; });
}
