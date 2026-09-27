// Generate a self‑contained reveal.js presentation from the deck, and the
// present / export / save-load helpers.

import { state } from '../core/store.js';

const REVEAL = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0';
const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

const box = b => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;`
  + `height:${b.h}px;transform:rotate(${b.rotation || 0}deg);`;

function animAttrs(b) {
  if (!b.animation) return '';
  const { effect, order } = b.animation;
  return ` class="fragment ${effect}" data-fragment-index="${order}"`;
}

function blockHTML(b) {
  const a = animAttrs(b);
  if (b.type === 'text')
    return `<div${a} style="${box(b)}font-size:${b.fontSize || 40}px">${b.html || ''}</div>`;
  if (b.type === 'model')
    return `<model-viewer${a} src="${b.src}" camera-controls ${b.autoRotate !== false ? 'auto-rotate' : ''} `
      + `shadow-intensity="1" style="${box(b)}background:transparent"></model-viewer>`;
  if (b.type === 'image')
    return `<img${a} src="${b.src}" style="${box(b)}object-fit:${b.fit || 'contain'}">`;
  if (b.type === 'video')
    return `<video${a} src="${b.src}" controls style="${box(b)}object-fit:contain"></video>`;
  return '';
}

function slideHTML(s) {
  const trans = s.transition ? ` data-transition="${s.transition}"` : '';
  const inner = s.blocks.map(blockHTML).join('\n');
  return `<section${trans} data-background-color="${s.background}">`
    + `<div class="stage">${inner}</div></section>`;
}

export function buildHTML(deck = state.deck) {
  const { w, h } = deck.size;
  const slides = deck.slides.map(slideHTML).join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presentación</title>
<link rel="stylesheet" href="${REVEAL}/dist/reveal.css">
<link rel="stylesheet" href="${REVEAL}/dist/theme/${deck.theme}.css">
<script type="module" src="${MODEL_VIEWER}"></script>
<style>
 .reveal .stage{position:relative;width:${w}px;height:${h}px;margin:0 auto}
 .reveal .stage>*{overflow-wrap:anywhere}
 .reveal section{height:100%}
</style></head><body>
<div class="reveal"><div class="slides">
${slides}
</div></div>
<script src="${REVEAL}/dist/reveal.js"></script>
<script>
 Reveal.initialize({ width:${w}, height:${h}, margin:0.03, controls:true,
   progress:true, hash:true, slideNumber:'c/t',
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

export function exportHTML() { download(new Blob([buildHTML()], { type: 'text/html' }), 'presentacion.html'); }
export function saveProject() {
  download(new Blob([JSON.stringify(state.deck, null, 2)], { type: 'application/json' }), 'presentacion.revela.json');
}
