// Selected objects as image files: PNG or WebP (transparent or on the slide's
// background), JPG, SVG for vector objects, and a photo's original file.
//
// html2canvas draws the objects, but it ignores CSS filters and clip-path, so
// photos are first "baked": their adjustments (brightness, contrast,
// saturation, transparency) and crop are applied on a canvas, and the result
// replaces the photo. Rotation and flips are left to html2canvas.

import { state, currentSlide } from '../../core/store.js';
import { opacityOf } from '../../core/model.js';
import { HTML2CANVAS, JSZIP, loadScript } from '../../core/vendor.js';
import { tableCSS, levelCSS, shapeSVG, iconSVG, chartSVG, inkSVG } from '../../render/svg.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { t } from '../../i18n/index.js';
import { blockHTML } from '../formats/html.js';
import { hydrateStatic } from './images.js';
import { styled } from '../../features/document/master.js';
import { download, slug } from '../files.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };

// ---- Photos with their edits -------------------------------------------------

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    if (!/^(data|blob):/.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(t('No se pudo leer la imagen (puede que su web no permita copiarla).')));
    img.src = src;
  });
}

// Where object-fit puts an iw×ih picture in a W×H box.
export function fitRect(fit, iw, ih, W, H) {
  if (fit === 'fill') return [0, 0, W, H];
  const k = fit === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
  const w = iw * k, h = ih * k;
  return [(W - w) / 2, (H - h) / 2, w, h];
}

// The CSS filters brightness() contrast() saturate() and the opacity, in that
// order, on raw pixels (the same maths as the CSS filter spec), so the result
// doesn't depend on the browser supporting canvas filters.
export function applyAdjustments(data, adj = {}) {
  const br = (adj.brightness ?? 100) / 100, ct = (adj.contrast ?? 100) / 100, s = (adj.saturate ?? 100) / 100, op = (adj.opacity ?? 100) / 100;
  if (br === 1 && ct === 1 && s === 1 && op === 1) return data;
  const m = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255 * br, g = d[i + 1] / 255 * br, b = d[i + 2] / 255 * br;
    r = (r - 0.5) * ct + 0.5; g = (g - 0.5) * ct + 0.5; b = (b - 0.5) * ct + 0.5;
    r = Math.min(1, Math.max(0, r)); g = Math.min(1, Math.max(0, g)); b = Math.min(1, Math.max(0, b));
    d[i] = 255 * (m[0] * r + m[1] * g + m[2] * b);
    d[i + 1] = 255 * (m[3] * r + m[4] * g + m[5] * b);
    d[i + 2] = 255 * (m[6] * r + m[7] * g + m[8] * b);
    d[i + 3] *= op;
  }
  return data;
}

// A photo block as it looks on the slide (fit, crop, adjustments), without its
// rotation or flip, at `scale` × its size. Transparent where there is no photo.
export async function bakeImage(b, scale = 1) {
  const img = await loadImage(b.src);
  const W = Math.max(1, Math.round(b.w * scale)), H = Math.max(1, Math.round(b.h * scale));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const cr = b.crop || {};
  ctx.save();
  ctx.beginPath();
  ctx.rect(W * (cr.left || 0) / 100, H * (cr.top || 0) / 100,
    W * (1 - ((cr.left || 0) + (cr.right || 0)) / 100), H * (1 - ((cr.top || 0) + (cr.bottom || 0)) / 100));
  ctx.clip();
  ctx.drawImage(img, ...fitRect(b.fit || 'contain', img.naturalWidth, img.naturalHeight, W, H));
  ctx.restore();
  if (b.adj) ctx.putImageData(applyAdjustments(ctx.getImageData(0, 0, W, H), b.adj), 0, 0);
  return c;
}

// The photo exactly as it was inserted.
export async function originalImage(b) {
  const blob = await (await fetch(b.src)).blob();
  return { blob, ext: EXT[blob.type] || 'png' };
}

// ---- Any selection -------------------------------------------------------------

// Axis-aligned box around the objects, rotation included.
export function boundsOf(blocks) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of blocks) {
    const a = (b.rotation || 0) * Math.PI / 180, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const hw = (Math.abs(b.w * Math.cos(a)) + Math.abs(b.h * Math.sin(a))) / 2;
    const hh = (Math.abs(b.w * Math.sin(a)) + Math.abs(b.h * Math.cos(a))) / 2;
    x0 = Math.min(x0, cx - hw); y0 = Math.min(y0, cy - hh); x1 = Math.max(x1, cx + hw); y1 = Math.max(y1, cy + hh);
  }
  return { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - Math.floor(x0)), h: Math.ceil(y1 - Math.floor(y0)) };
}

// background: null (transparent), 'slide' (the slide's) or a colour.
export async function selectionCanvas(blocks, { scale = 2, background = null, slide = currentSlide(), deck = state.deck } = {}) {
  const box = boundsOf(blocks);
  const baked = await Promise.all(blocks.map(async b => (b.type === 'image' && b.src
    ? { ...b, src: (await bakeImage(b, scale)).toDataURL('image/png'), adj: null, crop: null, fit: 'fill' }
    : b)));
  const bg = background === 'slide' ? slide?.background || '#ffffff' : background;
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${box.w}px;height:${box.h}px;overflow:hidden;`
    + `color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'};${bg ? `background:${bg};` : ''}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}ul{list-style-type:var(--bullet,disc)}ol{list-style-type:var(--num,decimal)}`
    + `img,video,model-viewer,iframe{width:100%;height:100%}${tableCSS()}${levelCSS()}</style>`
    + `<div style="position:absolute;left:${-box.x}px;top:${-box.y}px;width:${deck.size.w}px;height:${deck.size.h}px">`
    + baked.map(b => blockHTML({ ...styled(b, slide, deck), animation: null }, { ...slide, blocks: baked })).join('') + '</div>';
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    await Promise.all([...holder.querySelectorAll('img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
    await loadScript(HTML2CANVAS, 'html2canvas');
    return await window.html2canvas(holder, { width: box.w, height: box.h, scale, useCORS: true, logging: false, backgroundColor: null });
  } finally { holder.remove(); }
}

const toBlob = (canvas, type) => new Promise((res, rej) =>
  canvas.toBlob(b => (b ? res(b) : rej(new Error(t('No se pudo crear la imagen.')))), type, 0.92));

// Vector objects as a standalone SVG file; null for the rest.
export function vectorSVG(b) {
  const draw = { shape: shapeSVG, icon: iconSVG, chart: chartSVG, ink: inkSVG }[b.type];
  if (!draw) return null;
  const tf = b.flipH || b.flipV ? `scale(${b.flipH ? -1 : 1} ${b.flipV ? -1 : 1})` : '';
  const inner = draw(b).replace(/<svg\b/, '<svg x="0" y="0"').replace(/\swidth="100%"/, ` width="${b.w}"`).replace(/\sheight="100%"/, ` height="${b.h}"`);
  const op = opacityOf(b) < 1 ? ` opacity="${+opacityOf(b).toFixed(3)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="0 0 ${b.w} ${b.h}">`
    + `<g${op}${tf ? ` transform="translate(${b.flipH ? b.w : 0} ${b.flipV ? b.h : 0}) ${tf}"` : ''}>${inner}</g></svg>`;
}

// One file for the given objects (together), in a format. The file name's
// extension follows what the browser really produced (WebP isn't everywhere).
export async function objectsFile(blocks, { format = 'png', scale = 2, background = null } = {}) {
  if (format === 'svg') {
    const svg = blocks.length === 1 && vectorSVG(blocks[0]);
    if (!svg) throw new Error(t('Solo las formas, iconos, gráficos y trazos se pueden guardar como SVG.'));
    return { blob: new Blob([svg], { type: 'image/svg+xml' }), ext: 'svg' };
  }
  // JPG has no transparency.
  const bg = format === 'jpg' && !background ? '#ffffff' : background;
  const canvas = await selectionCanvas(blocks, { scale, background: bg });
  const blob = await toBlob(canvas, MIME[format] || 'image/png');
  return { blob, ext: EXT[blob.type] || format };
}

const baseName = b => slug(b.alt || (b.type === 'image' ? t('Imagen') : t('Objeto')));

// What the "Save as picture" dialog does. mode: 'together' (one file),
// 'each' (a .zip with one file per object) or 'original' (the photo as inserted).
export async function exportObjects(blocks, { mode = 'together', ...opts } = {}) {
  if (!blocks.length) return;
  if (mode === 'original') {
    const { blob, ext } = await originalImage(blocks[0]);
    return download(blob, `${baseName(blocks[0])}.${ext}`);
  }
  if (mode === 'each' && blocks.length > 1) {
    await loadScript(JSZIP, 'JSZip');
    const zip = new window.JSZip(), used = new Set();
    for (const b of blocks) {
      const { blob, ext } = await objectsFile([b], opts);
      let name = baseName(b), n = 1; while (used.has(name)) name = `${baseName(b)}-${++n}`; used.add(name);
      zip.file(`${name}.${ext}`, blob);
    }
    return download(await zip.generateAsync({ type: 'blob' }), `${slug(state.deck.name)}-${t('objetos')}.zip`);
  }
  const { blob, ext } = await objectsFile(blocks, opts);
  download(blob, `${blocks.length === 1 ? baseName(blocks[0]) : slug(state.deck.name) + '-' + t('seleccion')}.${ext}`);
}
