// Slides and objects as images (html2canvas): PNG/JPG export, a zip of all
// slides, and pictures of objects other formats can't draw natively.

import { state } from '../../core/store.js';
import { KATEX, HTML2CANVAS, JSZIP, loadScript } from '../../core/vendor.js';
import { alertUser } from '../../core/notify.js';
import { tableCSS, levelCSS } from '../../render/svg.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { tallyVotes, pollResultsHTML, savedVotes } from '../../features/live/poll.js';
import { t } from '../../i18n/index.js';
import { blockHTML, slideInnerHTML, magnifyInsetHTML } from '../formats/html.js';
import { download, slug } from '../files.js';


// Fill in what the exported page draws with scripts, for rasterising: KaTeX
// equations (block and inline) and poll results.
export async function hydrateStatic(root, deck) {
  if (root.querySelector('.math[data-latex]') || /\$[^$]/.test(root.textContent)) {
    if (!document.querySelector('link[data-katex]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `${KATEX}/katex.min.css`; l.dataset.katex = '1'; document.head.appendChild(l);
    }
    await loadScript(`${KATEX}/katex.min.js`, 'katex');
    root.querySelectorAll('.math[data-latex]').forEach(el => { try { window.katex.render(el.dataset.latex, el, { throwOnError: false, displayMode: true, strict: 'ignore' }); } catch { el.textContent = el.dataset.latex; } });
    if (/\$[^$]/.test(root.textContent)) {
      await loadScript(`${KATEX}/contrib/auto-render.min.js`, 'renderMathInElement');
      try { window.renderMathInElement(root, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch {}
    }
    await document.fonts?.ready;
  }
  // 3D models can't be rasterised: their picture instead, in the model's own box.
  const posters = [...root.querySelectorAll('model-viewer[data-poster]')].map(mv => {
    const k = parseFloat(mv.getAttribute('data-bleed')) || 1, d = document.createElement('div'), img = new Image();
    d.style.cssText = mv.style.cssText; d.style.webkitMaskImage = d.style.maskImage = 'none';
    img.crossOrigin = 'anonymous'; img.src = mv.getAttribute('data-poster'); img.alt = '';
    img.style.cssText = `position:absolute;left:${(1 - 1 / k) * 50}%;top:${(1 - 1 / k) * 50}%;width:${100 / k}%;height:${100 / k}%;object-fit:contain`;
    d.appendChild(img); mv.replaceWith(d); return img.decode().catch(() => {});
  });
  await Promise.all(posters);
  root.querySelectorAll('.rv-poll').forEach(el => {
    try { const p = JSON.parse(el.getAttribute('data-poll')); el.querySelector('.rv-poll-res').innerHTML = pollResultsHTML(p, tallyVotes(p, savedVotes(p.pollId)), currentPalette(deck).accents); } catch {}
  });
}

// html2canvas with the gradient texts right. It ignores background-clip:text (Text Art «Oro», gradient…) and
// paints the gradient as a solid bar. Those texts are drawn apart: the letters (a mask), the gradient, and the
// gradient kept only where the letters are, over the rest of the picture.
const isClipped = el => /text/.test(el.style.backgroundClip || el.style.webkitBackgroundClip || '');
// A copy of the holder with only that element in it (in the same place), on a clear background.
function alone(holder, el) {
  const path = []; for (let n = el; n !== holder; n = n.parentNode) path.unshift([...n.parentNode.children].indexOf(n));
  const copy = holder.cloneNode(true); copy.style.background = 'transparent';
  let node = copy;
  for (const i of path) {
    const keep = node.children[i];
    [...node.childNodes].forEach(c => { if (c !== keep && c.nodeName !== 'STYLE') c.remove(); });
    if (node !== copy) { node.style.background = 'transparent'; node.style.border = '0'; }
    node = keep;
  }
  document.body.appendChild(copy);
  return { copy, target: node };
}
// html2canvas ignores object-fit: a picture «contain» or «cover» in a box of another shape came out the wrong
// size (taller than its box, over the text). Each one is given here the size and place the browser draws it at.
async function fitPictures(holder) {
  for (const img of holder.querySelectorAll('img')) {
    const fit = getComputedStyle(img).objectFit; if (!['contain', 'cover', 'scale-down'].includes(fit)) continue;
    try { await img.decode(); } catch {}
    const nw = img.naturalWidth, nh = img.naturalHeight, bw = img.clientWidth, bh = img.clientHeight; if (!nw || !nh || !bw || !bh) continue;
    let k = fit === 'cover' ? Math.max(bw / nw, bh / nh) : Math.min(bw / nw, bh / nh);
    if (fit === 'scale-down') k = Math.min(1, k);
    const w = nw * k, h = nh * k, pos = getComputedStyle(img).objectPosition.split(' ').map(v => (v.endsWith('%') ? parseFloat(v) / 100 : null));
    const fx = pos[0] ?? 0.5, fy = pos[1] ?? 0.5;
    const abs = getComputedStyle(img).position === 'absolute', ol = img.offsetLeft, ot = img.offsetTop, box = document.createElement('div');
    box.style.cssText = `${abs ? `position:absolute;left:${ol}px;top:${ot}px` : 'position:relative;display:inline-block;vertical-align:top'};overflow:hidden;width:${bw}px;height:${bh}px`;
    const cs = img.getAttribute('style') || '';
    img.parentNode.insertBefore(box, img); box.appendChild(img);
    img.setAttribute('style', cs + `;position:absolute;left:${(bw - w) * fx}px;top:${(bh - h) * fy}px;width:${w}px;height:${h}px;max-width:none;max-height:none;object-fit:fill`);
  }
}
export async function rasterize(holder, opts) {
  await loadScript(HTML2CANVAS, 'html2canvas');
  await fitPictures(holder);
  const clipped = [...holder.querySelectorAll('[style]')].filter(isClipped);
  if (!clipped.length) return window.html2canvas(holder, opts);
  const saved = clipped.map(el => el.style.cssText);
  const draw = async (el, style) => {
    const { copy, target } = alone(holder, el);
    try { target.style.cssText += ';' + style; return await window.html2canvas(copy, { ...opts, backgroundColor: null }); } finally { copy.remove(); }
  };
  try {
    const parts = [];
    for (const el of clipped) {
      const mask = await draw(el, 'background:none;color:#000');
      const fill = await draw(el, 'color:transparent;-webkit-background-clip:border-box;background-clip:border-box');
      const both = Object.assign(document.createElement('canvas'), { width: fill.width, height: fill.height }), g = both.getContext('2d');   // (a new canvas: html2canvas's own keep a clip)
      g.drawImage(fill, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0);
      parts.push(both);
    }
    clipped.forEach(el => { el.style.visibility = 'hidden'; });
    const out = await window.html2canvas(holder, opts);
    const o = out.getContext('2d'); o.save(); o.setTransform(1, 0, 0, 1, 0, 0);
    parts.forEach(c => o.drawImage(c, 0, 0));
    o.restore();
    return out;
  } finally { clipped.forEach((el, i) => { el.style.cssText = saved[i]; }); }
}

// One object as a PNG data URL (for formats that can't draw it natively).
export async function blockImage(b, slide, deck = state.deck) {
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${b.w}px;height:${b.h}px;overflow:hidden;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}${tableCSS()}${levelCSS()}</style>` + blockHTML({ ...b, x: 0, y: 0, rotation: 0, animation: null }, { ...slide, blocks: [b] });
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    const c = await rasterize(holder, { width: b.w, height: b.h, scale: 2, useCORS: true, logging: false, backgroundColor: null });
    return c.toDataURL('image/png');
  } finally { holder.remove(); }
}

// What a magnifier's box shows (the slide under its area, enlarged), as a PNG
// data URL: for formats that draw its frame and lines themselves.
export async function magnifyImage(b, slide, deck = state.deck) {
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${b.w}px;height:${b.h}px;overflow:hidden;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}${tableCSS()}${levelCSS()}</style>` + magnifyInsetHTML({ ...b, insetShadow: false, border: { ...b.border, radius: 0 } }, slide, deck);
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    const c = await rasterize(holder, { width: b.w, height: b.h, scale: 2, useCORS: true, logging: false, backgroundColor: null });
    return c.toDataURL('image/png');
  } finally { holder.remove(); }
}

// Rasterise one slide with html2canvas. Web embeds can't be rasterised (they
// come out blank), 3D models come out as their picture; everything else does.
// scale: pixels per slide pixel (2 for export; small for previews); quality: JPG's.
export async function slideImageBlob(s, type = 'png', deck = state.deck, opts = {}) { return (await slidePicture(s, type, deck, opts)).blob; }
// The slide's lines of text where they are drawn (slide pixels), for a PDF whose text can be selected and
// searched over the picture: [{ text, x, y, w, h }]. Words on one line make one run.
function textRuns(holder) {
  const o = holder.getBoundingClientRect(), runs = [], walk = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (!n.textContent.trim() || n.parentElement.closest('style, script, .katex-mathml')) continue;
    const cs = getComputedStyle(n.parentElement); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = document.createRange();
    for (const m of n.textContent.matchAll(/\S+/g)) {
      r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getBoundingClientRect(); if (b.width < 1 || b.height < 1) continue;
      const w = { text: m[0], x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height };
      const last = runs.at(-1);
      // (Same line: about the same top and height, and right after the previous word.)
      if (last && Math.abs(last.y - w.y) < w.h * 0.3 && Math.abs(last.h - w.h) < w.h * 0.3 && w.x >= last.x + last.w - 2 && w.x - (last.x + last.w) < w.h * 1.5) {
        last.text += ' ' + w.text; last.w = w.x + w.w - last.x;
      } else runs.push(w);
    }
  }
  return runs.filter(t => t.x + t.w > 0 && t.y + t.h > 0 && t.x < o.width && t.y < o.height);
}
// → { blob, runs (with text: true) }.
export async function slidePicture(s, type = 'png', deck = state.deck, { scale = 2, quality = 0.92, text = false } = {}) {
  const { w, h } = deck.size;
  const holder = document.createElement('div'); holder.className = 'rst';   // (.rst: the images' size rule below must not reach html2canvas's own iframe)
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;overflow:hidden;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'};background:${s.background}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}ul{list-style-type:var(--bullet,disc)}ol{list-style-type:var(--num,decimal)}`
    + `.rst img,.rst video,.rst model-viewer,.rst iframe{width:100%;height:100%}${tableCSS()}${levelCSS()}</style>`
    + slideInnerHTML(s, deck);
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    // JPG has no transparency: paint the page colour underneath.
    const runs = text ? textRuns(holder) : null;
    const canvas = await rasterize(holder, { width: w, height: h, scale, useCORS: true, logging: false,
      backgroundColor: type === 'jpg' ? '#ffffff' : null });
    return { blob: await new Promise(res => canvas.toBlob(res, type === 'jpg' ? 'image/jpeg' : 'image/png', quality)), runs };
  } finally { holder.remove(); }
}

// Current slide, or every visible slide in a .zip (PowerPoint "Export > all slides").
export async function exportImages({ type = 'png', all = false } = {}) {
  const name = slug(state.deck.name);
  try {
    if (!all) {
      const blob = await slideImageBlob(state.deck.slides[state.ui.slideIndex], type);
      if (blob) download(blob, `${name}-${state.ui.slideIndex + 1}.${type}`);
      return;
    }
    const blob = await buildImagesZip(state.deck, type);
    download(blob, `${name}-${type}.zip`);
  } catch (e) {
    alertUser(t('No se pudo exportar la imagen: ') + e.message);
  }
}
export async function buildImagesZip(deck = state.deck, type = 'png') {
  await loadScript(JSZIP, 'JSZip');
  const zip = new window.JSZip();
  const vis = deck.slides.filter(s => !s.hidden);
  const pad = String(vis.length).length;
  for (let i = 0; i < vis.length; i++) {
    const b = await slideImageBlob(vis[i], type, deck);
    if (b) zip.file(`${t('Diapositiva')}-${String(i + 1).padStart(pad, '0')}.${type}`, b);
  }
  return zip.generateAsync({ type: 'blob' });
}
