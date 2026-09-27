// Generate a self‑contained reveal.js presentation from the deck, and the
// present / export / save-load helpers.

import { state } from '../core/store.js';

const REVEAL = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0';
const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

const box = b => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;`
  + `height:${b.h}px;transform:rotate(${b.rotation || 0}deg);`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = s => (String(s).trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'presentacion');

function animAttrs(b) {
  if (!b.animation) return '';
  const { effect, order } = b.animation;
  return ` class="fragment ${effect}" data-fragment-index="${order}"`;
}

function blockHTML(b) {
  const a = animAttrs(b);
  if (b.type === 'text')
    return `<div${a} style="${box(b)}font-size:${b.fontSize || 40}px;`
      + `text-align:${b.textAlign || 'left'};${b.fontFamily ? `font-family:${b.fontFamily};` : ''}">`
      + `${b.html || ''}</div>`;
  if (b.type === 'model')
    return `<model-viewer${a} src="${b.src}" camera-controls ${b.autoRotate !== false ? 'auto-rotate' : ''} `
      + `shadow-intensity="1" style="${box(b)}background:transparent"></model-viewer>`;
  if (b.type === 'image')
    return `<img${a} src="${b.src}" style="${box(b)}object-fit:${b.fit || 'contain'}">`;
  if (b.type === 'video')
    return `<video${a} src="${b.src}" controls style="${box(b)}object-fit:contain"></video>`;
  if (b.type === 'embed')
    return `<iframe${a} src="${b.src}" referrerpolicy="no-referrer" `
      + `sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" `
      + `style="${box(b)}border:0;background:#fff"></iframe>`;
  return '';
}

function slideHTML(s) {
  const trans = s.transition ? ` data-transition="${s.transition}"` : '';
  const inner = s.blocks.map(blockHTML).join('\n');
  return `<section${trans} data-background-color="${s.background}">`
    + `<div class="stage">${inner}</div></section>`;
}

// Where the slide number sits, as CSS for reveal's .slide-number element.
const SLIDENUM_POS = {
  br: 'right:8px;bottom:8px;top:auto;left:auto',
  bl: 'left:8px;bottom:8px;top:auto;right:auto',
  tr: 'right:8px;top:8px;bottom:auto;left:auto',
  tl: 'left:8px;top:8px;bottom:auto;right:auto',
};

export function buildHTML(deck = state.deck) {
  const { w, h } = deck.size;
  const slides = deck.slides.filter(s => !s.hidden).map(slideHTML).join('\n');
  const sn = deck.slideNumber || { show: false };
  const snPos = SLIDENUM_POS[sn.position] || SLIDENUM_POS.br;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(deck.name || 'Presentación')}</title>
<link rel="stylesheet" href="${REVEAL}/dist/reveal.css">
<link rel="stylesheet" href="${REVEAL}/dist/theme/${deck.theme}.css">
<script type="module" src="${MODEL_VIEWER}"></script>
<style>
 .reveal .stage{position:relative;width:${w}px;height:${h}px;margin:0 auto}
 .reveal .stage>*{overflow-wrap:anywhere}
 .reveal section{height:100%}
 .reveal .slide-number{${snPos}}
</style></head><body>
<div class="reveal"><div class="slides">
${slides}
</div></div>
<script src="${REVEAL}/dist/reveal.js"></script>
<script>
 Reveal.initialize({ width:${w}, height:${h}, margin:0.03, controls:true,
   progress:true, hash:true, slideNumber:${sn.show ? `'${sn.format || 'c'}'` : 'false'},
   transition:'${deck.defaultTransition}', transitionSpeed:'${deck.transitionSpeed}' });
</script></body></html>`;
}

export function present() {
  const win = window.open('', '_blank');
  if (!win) { alert('Permite las ventanas emergentes para presentar.'); return; }
  win.document.write(buildHTML());
  win.document.close();
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportHTML() {
  download(new Blob([buildHTML()], { type: 'text/html' }), slug(state.deck.name) + '.html');
}
export function saveProject() {
  download(new Blob([JSON.stringify(state.deck, null, 2)], { type: 'application/json' }),
    slug(state.deck.name) + '.revela.json');
}
