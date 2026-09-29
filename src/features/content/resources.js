// Free resources, like Canva's "Elements": animated GIFs, animated stickers
// and 3D models (a curated animated library, Poly Haven's CC0 models, NASA's
// models, Wikimedia Commons' 3D prints and a Sketchfab search). Downloaded models are embedded in the presentation (it
// works offline); Sketchfab ones are shown by Sketchfab's own viewer.
// Only the search words reach each service (with consent, see stock.js).

import { plainText } from '../../core/text.js';
import { state, commit, amend, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { searchImages, insertStockImage } from './stock.js';
import { STICKERS, stickerURL, stickerThumb, STICKER_CREDIT } from './stickers.js';
import { LIBRARY_3D } from './library3d.js';
import { NASA_3D } from './nasa3d.js';
import { stlToGLB } from './stl.js';

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
export const searchStickers = q => (q ? STICKERS.filter(([, words]) => matches(words, q)) : STICKERS).map(([code, words]) => ({ code, words, thumb: stickerThumb(code) }));
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
  const b = addModelBlock({ src, caption: `${m.label.replace(/ \(.*\)$/, '')} — ${m.credit}`, animated: m.animated, credit: m.credit, clip: m.rest });
  // A character rests, and walks when it moves (give it a path, and it walks there).
  if (m.walk) amend(() => { const x = currentSlide().blocks.find(y => y.id === b.id);
    if (x) x.walk = { clip: m.walk, end: m.arrive || '', endOnce: true, face: true, look: true }; });
  return b;
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

// ---- 3D: NASA (257 models: spacecraft, rovers, rockets, planets…; free, without copyright) ----
// Searched here (the list comes with Revela); only the chosen model is downloaded.
const NASA_WORDS = { cohete: 'rocket saturn atlas ares booster launch', satelite: 'satellite', telescopio: 'telescope', asteroide: 'asteroid', cometa: 'comet', luna: 'moon lunar apollo', marte: 'mars',
  planeta: 'planet', estacion: 'station iss', traje: 'suit', astronauta: 'suit astronaut', transbordador: 'shuttle', lanzadera: 'shuttle', nave: 'shuttle capsule module gemini apollo orion', sonda: 'probe', antena: 'dish antenna', helicoptero: 'helicopter', roca: 'rock', tierra: 'earth', robot: 'rover robot', vehiculo: 'rover' };
export function searchNASA3D(q) {
  const words = norm(q).split(/\s+/).filter(Boolean).map(w => NASA_WORDS[w] || w);
  return NASA_3D.filter(m => !words.length || words.every(w => w.split(' ').some(x => norm(m.name).includes(x))))
    .map(m => ({ ...m, thumb: m.thumb || '' }));
}
export async function insertNASA3D(m) {
  const src = await toDataURL(new Blob([await download(m.src)], { type: 'model/gltf-binary' }));
  return addModelBlock({ src, caption: `${m.name} — NASA`, credit: 'NASA (NASA 3D Resources)' });
}

// ---- 3D: Wikimedia Commons (thousands of 3D prints and scans: fossils, museum pieces, anatomy…) ----
// STL files, turned into glTF here. Only the search words reach Wikimedia (with consent).
export async function searchCommons3D(q, offset = 0) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [k, v] of Object.entries({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrsearch: `filemime:application/sla ${q}`,
    gsrlimit: '24', gsroffset: String(offset), prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '240' })) u.searchParams.set(k, v);
  const r = await fetch(u); if (!r.ok) throw new Error('Wikimedia ' + r.status);
  const d = await r.json(), pages = Object.values(d.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  return { next: d.continue?.gsroffset ?? null, results: pages.map(p => { const ii = p.imageinfo?.[0] || {}, m = ii.extmetadata || {};
    return { title: p.title.replace(/^File:|\.stl$/gi, ''), url: ii.url, size: ii.size || 0, thumb: ii.thumburl || '', page: ii.descriptionurl,
      license: plainText(m.LicenseShortName?.value), artist: plainText(m.Artist?.value).slice(0, 80) }; }).filter(x => x.url) };
}
export async function insertCommons3D(m) {
  const src = stlToGLB(await (await download(m.url)).arrayBuffer());
  return addModelBlock({ src, caption: `${m.title} — ${m.artist ? m.artist + ', ' : ''}Wikimedia Commons (${m.license || 'licencia libre'})`, credit: `${m.artist || ''} (${m.license || ''}) ${m.page || ''}`.trim() });
}

// ---- Videos: Wikimedia Commons (free licences) ---------------------------------------------
// Each one comes in a smaller copy Commons makes (480p WebM, or less) when there is
// one: a short clip is a few MB and goes inside the presentation.
export async function searchCommonsVideo(q, offset = 0) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [k, v] of Object.entries({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrsearch: `filetype:video ${q}`,
    gsrlimit: '24', gsroffset: String(offset), prop: 'videoinfo', viprop: 'url|size|mime|extmetadata|derivatives', viurlwidth: '320' })) u.searchParams.set(k, v);
  const r = await fetch(u); if (!r.ok) throw new Error('Wikimedia ' + r.status);
  const d = await r.json(), pages = Object.values(d.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const pick = ders => ['480p.vp9.webm', '360p.vp9.webm', '360p.webm', '240p.vp9.webm'].map(k => ders.find(x => x.transcodekey === k)).find(Boolean);
  return { next: d.continue?.gsroffset ?? null, results: pages.map(p => { const v = p.videoinfo?.[0] || {}, m = v.extmetadata || {}, small = pick(v.derivatives || []);
    return { title: p.title.replace(/^File:|\.(webm|ogv|mpg|mpeg|mp4)$/gi, ''), url: v.url, src: small?.src || v.url, size: v.size || 0, small: !!small,
      thumb: v.thumburl || '', duration: v.duration || 0, width: small?.width || v.width, height: small?.height || v.height, page: v.descriptionurl,
      license: plainText(m.LicenseShortName?.value), artist: plainText(m.Artist?.value).slice(0, 80) }; }).filter(x => x.src) };
}
// Inside the presentation if it isn't too big (else linked: it plays with a connection).
export async function insertCommonsVideo(v, { maxEmbed = 40e6 } = {}) {
  let src = v.src;
  try { const blob = await download(v.src); if (blob.size <= maxEmbed) src = await toDataURL(blob); } catch {}
  const ar = v.width && v.height ? v.width / v.height : 16 / 9, w = 680, h = Math.round(w / ar);
  return place({ id: uid(), type: 'video', src, ...centred(w, Math.min(h, 520)), rotation: 0, animation: null, alt: v.title,
    caption: `${v.title} — ${v.artist ? v.artist + ', ' : ''}Wikimedia Commons (${v.license || 'licencia libre'})`, credit: `${v.artist || ''} (${v.license || ''}) ${v.page || ''}`.trim() });
}

// ---- Sounds: Openverse (sound effects from Freesound, music from Jamendo…) ---------------
// kind: '' all, 'music', or 'effects' (Freesound's sounds).
export async function searchAudio(q, page = 1, { kind = '', commercial = false } = {}) {
  const u = new URL('https://api.openverse.org/v1/audio/');
  u.searchParams.set('q', q); u.searchParams.set('page', page); u.searchParams.set('page_size', 20);
  if (kind === 'music') u.searchParams.set('category', 'music');
  if (kind === 'effects') u.searchParams.set('source', 'freesound');
  if (commercial) u.searchParams.set('license_type', 'commercial');
  const r = await fetch(u); if (!r.ok) throw new Error('Openverse ' + r.status);
  const d = await r.json();
  return (d.results || []).map(x => ({ id: x.id, title: x.title || '', url: x.url, duration: (x.duration || 0) / 1000, source: x.source || '',
    creator: x.creator || '', license: `${(x.license || '').toUpperCase()} ${x.license_version || ''}`.trim(), page: x.foreign_landing_url, attribution: x.attribution || '' }));
}
// Inside the presentation when its host allows it (Freesound does); if not, linked.
export async function insertAudio(a) {
  let src = a.url;
  try { src = await toDataURL(await download(a.url)); } catch {}
  return place({ id: uid(), type: 'audio', src, ...centred(440, 56), rotation: 0, animation: null, alt: a.title,
    caption: `«${a.title}» — ${a.creator ? a.creator + ' ' : ''}(${a.license})`, credit: a.attribution });
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
function addModelBlock({ src, caption, credit, animated = false, clip = null }) {
  return place({ id: uid(), type: 'model', src, caption, credit, autoRotate: !animated, ...(animated && { clip: clip || '*' }), ...centred(440, 440), rotation: 0, animation: null });
}
