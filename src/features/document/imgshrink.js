// Big pictures made smaller (PowerPoint's "Compress pictures"): a photo from a phone (4000 px, 6 MB)
// shows the same on a slide at 1920 px and a fraction of the weight — the presentation saves, opens,
// shares and syncs faster. Each person chooses the largest side (or none) and the quality, for this
// browser. Only pictures inside the presentation (data: URLs) in PNG, JPEG or WebP; never SVG or GIF
// (drawings and animations). Transparency is kept. A smaller picture replaces it only if it weighs less.

import { state, commit } from '../../core/store.js';

const KEY = 'revela.images';
export const SHRINK_SIZES = [0, 1280, 1920, 2560, 3840];        // (0: as they are)
export const SHRINK_DEFAULT = { max: 1920, quality: 0.85 };
export function shrinkPrefs() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && SHRINK_SIZES.includes(p.max)) return { max: p.max, quality: Math.min(0.95, Math.max(0.5, +p.quality || SHRINK_DEFAULT.quality)) }; } catch {}
  return { ...SHRINK_DEFAULT };
}
export function setShrinkPrefs(p) { try { localStorage.setItem(KEY, JSON.stringify({ ...shrinkPrefs(), ...p })); } catch {} }

const SHRINKABLE = /^data:image\/(png|jpeg|jpg|webp);base64,/i;
const bytesOf = url => Math.floor((url.length - url.indexOf(',') - 1) * 3 / 4);
const load = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('IMAGE')); i.src = src; });
// Whether a picture has see-through pixels (sampled: a small copy is enough).
function hasAlpha(img) {
  const c = document.createElement('canvas'), w = c.width = Math.min(64, img.naturalWidth), h = c.height = Math.min(64, img.naturalHeight);
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}
// The picture at most `max` px on its longest side → a smaller data URL, or null (nothing to gain).
export async function shrinkImage(src, { max = shrinkPrefs().max, quality = shrinkPrefs().quality } = {}) {
  if (!max || typeof document === 'undefined' || !SHRINKABLE.test(String(src))) return null;
  const img = await load(src), nw = img.naturalWidth, nh = img.naturalHeight;
  const k = Math.min(1, max / Math.max(nw, nh)), before = bytesOf(src);
  if (k === 1 && before < 400 * 1024) return null;                // (already small enough)
  const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
  // Halved step by step: one big jump blurs fine detail (text in a screenshot).
  let cur = img, cw = nw, ch = nh;
  while (cw / 2 >= w * 1.2) {
    const c = document.createElement('canvas'); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, c.width, c.height); cur = c; cw = c.width; ch = c.height;
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, w, h);
  // Photos as JPEG; with transparency, WebP (or PNG where the browser can't write WebP).
  let out = hasAlpha(img) ? c.toDataURL('image/webp', quality) : c.toDataURL('image/jpeg', quality);
  if (!/^data:image\/(webp|jpeg)/.test(out)) out = c.toDataURL('image/png');
  return bytesOf(out) < before * 0.9 ? out : null;
}

// Every picture of the presentation (its slides, layouts and masters), made smaller now, in one undo step
// → { done, saved } (how many, and the bytes saved). onProgress(done, total).
export async function shrinkDeckImages({ onProgress = () => {}, ...opts } = {}) {
  const deck = state.deck, all = [];
  for (const s of [...deck.slides, ...(deck.layouts || []), ...(deck.masters || []), ...(deck.master ? [deck.master] : [])]) for (const b of s.blocks || []) if (b.type === 'image' && SHRINKABLE.test(String(b.src))) all.push(b);
  const found = new Map(); let saved = 0, n = 0;
  for (const b of all) {
    try { const small = await shrinkImage(b.src, { ...shrinkPrefs(), ...opts }); if (small) { found.set(b, small); saved += bytesOf(b.src) - bytesOf(small); } } catch {}
    onProgress(++n, all.length);
  }
  if (found.size) commit(() => { for (const [b, small] of found) b.src = small; });
  return { done: found.size, saved };
}
