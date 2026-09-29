// Free resources, like Canva's "Elements": animated GIFs, animated stickers
// and 3D models (a curated animated library, Poly Haven's CC0 models and a
// Sketchfab search). Downloaded models are embedded in the presentation (it
// works offline); Sketchfab ones are shown by Sketchfab's own viewer.
// Only the search words reach each service (with consent, see stock.js).

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { searchImages, insertStockImage } from './stock.js';
import { STICKERS, stickerURL, STICKER_CREDIT } from './stickers.js';
import { LIBRARY_3D } from './library3d.js';

const toDataURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
async function download(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status + ' ' + url); return r.blob(); }
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const matches = (text, q) => norm(q).split(/\s+/).filter(Boolean).every(w => norm(text).includes(w));
function place(block) {
  commit(() => { currentSlide().blocks.push(block); state.ui.selection = block.id; state.ui.multi = [block.id]; });
  return block;
}
const centred = (w, h) => { const { w: W, h: H } = state.deck.size; return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h }; };

// ---- GIFs (Openverse, animated GIFs only) ------------------------------------------
export const searchGifs = (q, page = 1) => searchImages(q, page, { extension: 'gif' });
export const insertGif = insertStockImage;

// ---- Animated stickers (Noto) ------------------------------------------------------------
export const searchStickers = q => (q ? STICKERS.filter(([, words]) => matches(words, q)) : STICKERS).map(([code, words]) => ({ code, words, thumb: stickerURL(code, 128) }));
export async function insertSticker(code, words = '') {
  const src = await toDataURL(new Blob([await download(stickerURL(code))], { type: 'image/gif' }));
  return place({ id: uid(), type: 'image', src, fit: 'contain', alt: words.split(' ')[0] || '', credit: STICKER_CREDIT,
    ...centred(240, 240), rotation: 0, animation: null });
}

// ---- 3D: curated library (some animated) ------------------------------------------------
export const searchLibrary3D = (q, { animated = false } = {}) =>
  LIBRARY_3D.filter(m => (!animated || m.animated) && (!q || matches(`${m.label} ${m.cat} ${m.id}`, q)));
export async function insertLibraryModel(m) {
  const blob = await download(m.src);
  const src = await toDataURL(new Blob([blob], { type: 'model/gltf-binary' }));
  return addModelBlock({ src, caption: `${m.label} — ${m.credit}`, animated: m.animated, credit: m.credit });
}

// ---- 3D: Poly Haven (CC0, 500+ models) -------------------------------------------------
let polyCache = null;
export async function searchPolyHaven(q) {
  if (!polyCache) {
    const r = await fetch('https://api.polyhaven.com/assets?t=models'); if (!r.ok) throw new Error('Poly Haven ' + r.status);
    polyCache = Object.entries(await r.json()).map(([id, a]) => ({ id, name: a.name || id, text: `${a.name} ${(a.categories || []).join(' ')} ${(a.tags || []).join(' ')}`,
      thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`, authors: Object.keys(a.authors || {}).join(', ') }));
  }
  return q ? polyCache.filter(a => matches(a.text, q)) : polyCache.slice(0, 60);
}
// A glTF with separate files (.bin, textures) → one self-contained glTF (data URIs).
// where: { relative uri → its real address } when the files aren't next to it.
export async function packGltf(url, where = {}) {
  const base = url.replace(/[^/]+$/, ''), json = await (await download(url)).text(), g = JSON.parse(json);
  const inline = async (items, type) => {
    for (const it of items || []) {
      if (!it.uri || it.uri.startsWith('data:')) continue;
      const blob = await download(where[it.uri] || where[decodeURIComponent(it.uri)] || new URL(it.uri, base).href);
      it.uri = await toDataURL(new Blob([blob], { type: blob.type || type }));
    }
  };
  await inline(g.buffers, 'application/octet-stream');
  await inline(g.images, 'image/jpeg');
  return toDataURL(new Blob([JSON.stringify(g)], { type: 'model/gltf+json' }));
}
export async function insertPolyHaven(a, resolution = '1k') {
  const r = await fetch(`https://api.polyhaven.com/files/${encodeURIComponent(a.id)}`); if (!r.ok) throw new Error('Poly Haven ' + r.status);
  const files = await r.json(), gl = files.gltf?.[resolution]?.gltf || Object.values(files.gltf || {})[0]?.gltf;
  if (!gl?.url) throw new Error('Poly Haven: sin glTF');
  const where = Object.fromEntries(Object.entries(gl.include || {}).map(([k, v]) => [k, v.url]));
  const src = await packGltf(gl.url, where);
  return addModelBlock({ src, caption: `${a.name} — Poly Haven${a.authors ? ', ' + a.authors : ''} (CC0)`, credit: 'Poly Haven (CC0)' });
}

// ---- 3D: Sketchfab (search; shown with Sketchfab's viewer) -------------------------------
export async function searchSketchfab(q, { animated = false, cursor = null } = {}) {
  const u = new URL('https://api.sketchfab.com/v3/search');
  u.searchParams.set('type', 'models'); u.searchParams.set('q', q); u.searchParams.set('count', '24');
  if (animated) u.searchParams.set('animated', 'true');
  if (cursor) u.searchParams.set('cursor', cursor);
  const r = await fetch(u); if (!r.ok) throw new Error('Sketchfab ' + r.status);
  const d = await r.json();
  const thumb = m => (m.thumbnails?.images || []).filter(i => i.width >= 200).sort((a, b) => a.width - b.width)[0]?.url || m.thumbnails?.images?.[0]?.url || '';
  return { next: d.cursors?.next || null, results: (d.results || []).map(m => ({ uid: m.uid, name: m.name, user: m.user?.displayName || m.user?.username || '',
    thumb: thumb(m), animated: (m.animationCount || 0) > 0, license: m.license?.label || '', page: m.viewerUrl })) };
}
export function insertSketchfab(m) {
  const src = `https://sketchfab.com/models/${m.uid}/embed?autostart=1&preload=1&ui_theme=dark&ui_hint=0&transparent=1&animation_autoplay=1`;
  return place({ id: uid(), type: 'embed', src, display: 'frame', caption: `${m.name} — ${m.user} (Sketchfab${m.license ? ', ' + m.license : ''})`,
    alt: m.name, ...centred(760, 480), rotation: 0, animation: null });
}

// A 3D model object, ready to move (see model3d.js).
function addModelBlock({ src, caption, credit, animated = false }) {
  return place({ id: uid(), type: 'model', src, caption, credit, autoRotate: !animated, ...(animated && { clip: '*' }), ...centred(440, 440), rotation: 0, animation: null });
}
