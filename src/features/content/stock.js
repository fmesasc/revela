// Online media libraries (PowerPoint "Stock images / Online pictures / Icons",
// Google Slides "Search the web"), opt-in per service:
// - Openverse (openverse.org, by WordPress): openly licensed images, with the
//   attribution the licence requires kept as the picture's caption.
// - Iconify (iconify.design): 200 000+ icons from open icon sets, as SVG.
// Only the search words are sent; nothing from the presentation.

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';

const OK = 'revela.consent.';
export const consented = svc => { try { return localStorage.getItem(OK + svc) === '1'; } catch { return false; } };
export const giveConsent = svc => { try { localStorage.setItem(OK + svc, '1'); } catch {} };

// ---- Openverse ---------------------------------------------------------------
// extension: 'gif' for animated GIFs only (also jpg, png, svg).
// Filters (Openverse's): extension 'png' | 'svg' | 'jpg' | 'gif' | 'png,svg';
// category 'photograph' | 'illustration' | 'digitized_artwork';
// aspect 'wide' | 'tall' | 'square'; size 'small' | 'medium' | 'large'.
export async function searchImages(q, page = 1, { commercial = false, extension = '', category = '', aspect = '', size = '' } = {}) {
  const u = new URL('https://api.openverse.org/v1/images/');
  u.searchParams.set('q', q); u.searchParams.set('page', page); u.searchParams.set('page_size', 20);            // anonymous requests allow at most 20
  if (commercial) u.searchParams.set('license_type', 'commercial');
  if (extension) u.searchParams.set('extension', extension);
  if (category) u.searchParams.set('category', category);
  if (aspect) u.searchParams.set('aspect_ratio', aspect);
  if (size) u.searchParams.set('size', size);
  const r = await fetch(u); if (!r.ok) throw new Error('Openverse ' + r.status);
  const d = await r.json();
  return (d.results || []).map(x => ({ id: x.id, title: x.title || '', url: x.url, thumb: x.thumbnail, previews: previewsOf(x), width: x.width, height: x.height,
    filetype: (x.filetype || (x.url || '').match(/\.(\w+)$/)?.[1] || '').toLowerCase(),
    creator: x.creator || '', license: `${(x.license || '').toUpperCase()} ${x.license_version || ''}`.trim(), licenseUrl: x.license_url,
    source: x.foreign_landing_url, attribution: x.attribution || '' }));
}
// Previews to try in turn. Wikimedia's own thumbnails come first: they keep the
// transparency of PNG and SVG files and can be read here to check it (Openverse
// can't make them for GIFs, and at times for others: it answers 424); a GIF's
// small one stays animated (120 px); an SVG's is a PNG. Openverse's thumbnail
// and then the original are the fallbacks.
const WIKIMEDIA = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/([\w-]+)\/(\w)\/(\w\w)\/([^/?#]+)$/;
export function wikimediaThumb(url, width) {
  const m = WIKIMEDIA.exec(url || ''); if (!m) return null;
  return `https://upload.wikimedia.org/wikipedia/${m[1]}/thumb/${m[2]}/${m[3]}/${m[4]}/${width}px-${m[4]}${/\.svg$/i.test(m[4]) ? '.png' : ''}`;
}
export function previewsOf(x) {
  const gif = /\.gif$/i.test(x.url || '');
  return [...new Set([wikimediaThumb(x.url, gif ? 120 : 250), x.thumbnail, x.url].filter(Boolean))];
}
// Whether a picture has a see-through background: enough clear pixels along its
// edges (a cut-out object, a logo, a drawing). null if it can't be read.
export async function hasTransparentBackground(src) {
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer'; img.src = src;
    await img.decode();
    const n = 48, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, n, n);
    const px = g.getImageData(0, 0, n, n).data; let clear = 0, all = 0;
    for (let i = 0; i < n; i++) for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i]]) { all++; if (px[(y * n + x) * 4 + 3] < 200) clear++; }
    return clear / all > 0.3;
  } catch { return null; }
}
const toDataURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
async function fetchImage(url) { const r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error(r.status); return toDataURL(await r.blob()); }

// Insert (embedded, so it works offline): the original if its host allows it,
// otherwise Openverse's CORS-enabled thumbnail.
export async function insertStockImage(img) {
  // (A very big Wikimedia original comes as its 1280 px copy, which keeps the transparency: a lighter presentation.)
  const big = img.width > 1600 && wikimediaThumb(img.url, 1280);
  let src; try { src = await fetchImage(big || img.url); } catch { try { src = await fetchImage(img.url); } catch { src = await fetchImage(img.thumb); } }
  const { w: W, h: H } = state.deck.size, ar = (img.width && img.height) ? img.width / img.height : 4 / 3;
  let w = W * 0.6, h = w / ar; if (h > H * 0.7) { h = H * 0.7; w = h * ar; }
  const credit = `${img.title ? '«' + img.title + '» ' : ''}${img.creator ? '— ' + img.creator + ' ' : ''}(${img.license})`.trim();
  const b = { id: uid(), type: 'image', src, fit: 'contain', alt: img.title.slice(0, 125), caption: credit, credit: img.attribution,
    x: Math.round((W - w) / 2), y: Math.round((H - h) / 2) - 20, w: Math.round(w), h: Math.round(h), rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}

// ---- Photos from Unsplash and Pexels (through Revela's server) ----------------------
// Used from their own servers, as Unsplash asks (so they need the internet when
// presenting), with the photographer's credit as the caption.
export function insertPhoto(ph) {
  const { w: W, h: H } = state.deck.size, ar = ph.width && ph.height ? ph.width / ph.height : 3 / 2;
  let w = W * 0.6, h = w / ar; if (h > H * 0.7) { h = H * 0.7; w = h * ar; }
  const credit = `${ph.author} / ${ph.source}`;
  const b = { id: uid(), type: 'image', src: ph.src, fit: 'cover', alt: String(ph.alt || '').slice(0, 125), caption: credit,
    credit: `${ph.author} (${ph.authorUrl}) · ${ph.source} (${ph.sourceUrl})`,
    x: Math.round((W - w) / 2), y: Math.round((H - h) / 2) - 20, w: Math.round(w), h: Math.round(h), rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}

// ---- Iconify -------------------------------------------------------------------
export async function searchIcons(q) {
  const r = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=96`);
  if (!r.ok) throw new Error('Iconify ' + r.status);
  const d = await r.json(), icons = d.icons || [];
  try { await loadIcons(icons); } catch {}                // (if that fails, the previews are Iconify's images)
  return { icons, collections: d.collections || {} };
}
// The icons' drawings, fetched in bulk (one request per icon set, not one per
// icon: Iconify limits how many requests one address can make) and drawn here.
const iconData = new Map();                               // 'prefix:name' → { body, width, height, … }
function resolveIcon(d, name, depth = 0) {
  const base = { width: d.width || 16, height: d.height || 16, left: d.left || 0, top: d.top || 0 };   // (set defaults)
  if (d.icons?.[name]) return { ...base, ...d.icons[name] };
  const al = d.aliases?.[name];
  if (!al || depth > 5) return null;
  const parent = resolveIcon(d, al.parent, depth + 1); if (!parent) return null;
  const { parent: _, ...own } = al;
  return { ...parent, ...own, rotate: ((parent.rotate || 0) + (own.rotate || 0)) % 4, hFlip: !!parent.hFlip !== !!own.hFlip, vFlip: !!parent.vFlip !== !!own.vFlip };
}
export async function loadIcons(names) {
  const by = {};
  for (const n of names) { if (iconData.has(n)) continue; const [p, i] = n.split(':'); if (p && i) (by[p] ||= []).push(i); }
  await Promise.all(Object.entries(by).map(async ([p, list]) => {
    for (let k = 0; k < list.length; k += 100) {         // (keeps the address short)
      const part = list.slice(k, k + 100);
      const r = await fetch(`https://api.iconify.design/${p}.json?icons=${part.join(',')}`);
      if (!r.ok) throw new Error('Iconify ' + r.status);
      const d = await r.json();
      for (const i of part) { const ic = resolveIcon(d, i); if (ic) iconData.set(`${p}:${i}`, ic); }
    }
  }));
  return names.filter(n => iconData.has(n)).length;
}
export function iconSVG(name, color = '#333333', size = 0) {
  const ic = iconData.get(name); if (!ic) return null;
  const { width: w, height: h } = ic, l = ic.left || 0, tp = ic.top || 0, tf = [];
  if (ic.hFlip) tf.push(`translate(${2 * l + w} 0) scale(-1 1)`);
  if (ic.vFlip) tf.push(`translate(0 ${2 * tp + h}) scale(1 -1)`);
  if (ic.rotate) tf.push(`rotate(${ic.rotate * 90} ${l + w / 2} ${tp + h / 2})`);
  const body = tf.length ? `<g transform="${tf.join(' ')}">${ic.body}</g>` : ic.body;
  const dims = size ? ` width="${size}" height="${size}"` : ` width="${w}" height="${h}"`;   // (a square, centred, like Iconify's)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${l} ${tp} ${w} ${h}"${dims} style="color:${color}" color="${color}">${body.replace(/currentColor/g, color)}</svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}
// Preview: drawn here when its drawing is loaded, otherwise Iconify's own image.
export const iconPreview = (name, color = '#333333') => iconSVG(name, color) || `https://api.iconify.design/${name.replace(':', '/')}.svg?color=${encodeURIComponent(color)}`;
// The icon as a picture stored in the deck. Some browser extensions block
// fetch() to third parties while letting images load (the previews show but
// the download fails): then the image itself is drawn to a PNG, and if even
// that is refused, the icon is linked (it needs a connection to show).
export async function iconSource(name, color = '#ffffff') {
  const local = iconSVG(name, color, 512); if (local) return local;
  const url = `https://api.iconify.design/${name.replace(':', '/')}.svg?color=${encodeURIComponent(color)}&width=512&height=512`;
  try {
    const r = await fetch(url);
    if (r.ok) return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(await r.text())));
  } catch {}
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement('canvas'); c.width = c.height = 512;
    c.getContext('2d').drawImage(img, 0, 0, 512, 512);
    return c.toDataURL('image/png');
  } catch {}
  return url;
}
export async function insertOnlineIcon(name, color = '#ffffff', license = null) {
  const src = await iconSource(name, color);
  const b = { id: uid(), type: 'image', src, fit: 'contain', alt: name.split(':')[1].replace(/-/g, ' '), decorative: false,
    ...(license && /CC-BY/i.test(license.spdx || '') && { credit: `${name} — ${license.title}` }),
    x: 560, y: 280, w: 160, h: 160, rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}
