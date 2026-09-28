// Online media libraries (PowerPoint "Stock images / Online pictures / Icons",
// Google Slides "Search the web"), opt-in per service:
// - Openverse (openverse.org, by WordPress): openly licensed images, with the
//   attribution the licence requires kept as the picture's caption.
// - Iconify (iconify.design): 200 000+ icons from open icon sets, as SVG.
// Only the search words are sent; nothing from the presentation.

import { state, commit, currentSlide } from '../core/store.js';
import { uid } from '../core/model.js';

const OK = 'revela.consent.';
export const consented = svc => { try { return localStorage.getItem(OK + svc) === '1'; } catch { return false; } };
export const giveConsent = svc => { try { localStorage.setItem(OK + svc, '1'); } catch {} };

// ---- Openverse ---------------------------------------------------------------
export async function searchImages(q, page = 1, { commercial = false } = {}) {
  const u = new URL('https://api.openverse.org/v1/images/');
  u.searchParams.set('q', q); u.searchParams.set('page', page); u.searchParams.set('page_size', 20);            // anonymous requests allow at most 20
  if (commercial) u.searchParams.set('license_type', 'commercial');
  const r = await fetch(u); if (!r.ok) throw new Error('Openverse ' + r.status);
  const d = await r.json();
  return (d.results || []).map(x => ({ id: x.id, title: x.title || '', url: x.url, thumb: x.thumbnail, width: x.width, height: x.height,
    creator: x.creator || '', license: `${(x.license || '').toUpperCase()} ${x.license_version || ''}`.trim(), licenseUrl: x.license_url,
    source: x.foreign_landing_url, attribution: x.attribution || '' }));
}
const toDataURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
async function fetchImage(url) { const r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error(r.status); return toDataURL(await r.blob()); }

// Insert (embedded, so it works offline): the original if its host allows it,
// otherwise Openverse's CORS-enabled thumbnail.
export async function insertStockImage(img) {
  let src; try { src = await fetchImage(img.url); } catch { src = await fetchImage(img.thumb); }
  const { w: W, h: H } = state.deck.size, ar = (img.width && img.height) ? img.width / img.height : 4 / 3;
  let w = W * 0.6, h = w / ar; if (h > H * 0.7) { h = H * 0.7; w = h * ar; }
  const credit = `${img.title ? '«' + img.title + '» ' : ''}${img.creator ? '— ' + img.creator + ' ' : ''}(${img.license})`.trim();
  const b = { id: uid(), type: 'image', src, fit: 'contain', alt: img.title.slice(0, 125), caption: credit, credit: img.attribution,
    x: Math.round((W - w) / 2), y: Math.round((H - h) / 2) - 20, w: Math.round(w), h: Math.round(h), rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}

// ---- Iconify -------------------------------------------------------------------
export async function searchIcons(q) {
  const r = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=96`);
  if (!r.ok) throw new Error('Iconify ' + r.status);
  const d = await r.json();
  return { icons: d.icons || [], collections: d.collections || {} };
}
export const iconPreview = (name, color = '#333333') => `https://api.iconify.design/${name.replace(':', '/')}.svg?color=${encodeURIComponent(color)}`;
export async function insertOnlineIcon(name, color = '#ffffff', license = null) {
  const r = await fetch(`https://api.iconify.design/${name.replace(':', '/')}.svg?color=${encodeURIComponent(color)}&width=512&height=512`);
  if (!r.ok) throw new Error('Iconify ' + r.status);
  const svg = await r.text();
  const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  const b = { id: uid(), type: 'image', src, fit: 'contain', alt: name.split(':')[1].replace(/-/g, ' '), decorative: false,
    ...(license && /CC-BY/i.test(license.spdx || '') && { credit: `${name} — ${license.title}` }),
    x: 560, y: 280, w: 160, h: 160, rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}
