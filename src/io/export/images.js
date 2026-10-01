// Slides and objects as images (html2canvas): PNG/JPG export, a zip of all
// slides, and pictures of objects other formats can't draw natively.

import { state } from '../../core/store.js';
import { KATEX, HTML2CANVAS, JSZIP, loadScript } from '../../core/vendor.js';
import { alertUser } from '../../core/notify.js';
import { tableCSS, levelCSS } from '../../render/svg.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { tallyVotes, pollResultsHTML, savedVotes } from '../../features/live/poll.js';
import { t } from '../../i18n/index.js';
import { blockHTML, slideInnerHTML } from '../formats/html.js';
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
  root.querySelectorAll('.rv-poll').forEach(el => {
    try { const p = JSON.parse(el.getAttribute('data-poll')); el.querySelector('.rv-poll-res').innerHTML = pollResultsHTML(p, tallyVotes(p, savedVotes(p.pollId)), currentPalette(deck).accents); } catch {}
  });
}

// One object as a PNG data URL (for formats that can't draw it natively).
export async function blockImage(b, slide, deck = state.deck) {
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${b.w}px;height:${b.h}px;overflow:hidden;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}${tableCSS()}${levelCSS()}</style>` + blockHTML({ ...b, x: 0, y: 0, rotation: 0, animation: null }, { ...slide, blocks: [b] });
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    await loadScript(HTML2CANVAS, 'html2canvas');
    const c = await window.html2canvas(holder, { width: b.w, height: b.h, scale: 2, useCORS: true, logging: false, backgroundColor: null });
    return c.toDataURL('image/png');
  } finally { holder.remove(); }
}

// Rasterise one slide with html2canvas. 3D models and web embeds can't be
// rasterised (they come out blank); everything else does.
export async function slideImageBlob(s, type = 'png', deck = state.deck) {
  const { w, h } = deck.size;
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;overflow:hidden;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'};background:${s.background}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}ul{list-style-type:var(--bullet,disc)}ol{list-style-type:var(--num,decimal)}`
    + `img,video,model-viewer,iframe{width:100%;height:100%}${tableCSS()}${levelCSS()}</style>`
    + slideInnerHTML(s, deck);
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    await loadScript(HTML2CANVAS, 'html2canvas');
    // JPG has no transparency: paint the page colour underneath.
    const canvas = await window.html2canvas(holder, { width: w, height: h, scale: 2, useCORS: true, logging: false,
      backgroundColor: type === 'jpg' ? '#ffffff' : null });
    return await new Promise(res => canvas.toBlob(res, type === 'jpg' ? 'image/jpeg' : 'image/png', 0.92));
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
