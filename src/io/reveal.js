// Generate a self‑contained reveal.js presentation from the deck, and the
// present / export / save-load helpers.

import { state } from '../core/store.js';
import { shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, connectorSVG } from '../ui/shape.js';
import { googleFontLinks } from '../features/fonts.js';

const REVEAL = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0';
const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
const HLJS = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0';

const tf = b => `rotate(${b.rotation || 0}deg)${b.flipH ? ' scaleX(-1)' : ''}${b.flipV ? ' scaleY(-1)' : ''}`;
const box = b => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;`
  + `height:${b.h}px;transform:${tf(b)};`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = s => (String(s).trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'presentacion');

function animAttrs(b) {
  if (!b.animation) return '';
  const { effect, order } = b.animation;
  return ` class="fragment ${effect}" data-fragment-index="${order}"`;
}

function blockHTML(b, slide) {
  const a = animAttrs(b);
  if (b.type === 'connector') {
    const { w, h } = state.deck.size;
    const from = slide && slide.blocks.find(x => x.id === b.from);
    const to = slide && slide.blocks.find(x => x.id === b.to);
    return `<div${a} style="${box(b)}pointer-events:none">${connectorSVG(b, from, to, w, h)}</div>`;
  }
  if (b.type === 'text')
    return `<div${a} style="${box(b)}font-size:${b.fontSize || 40}px;`
      + `text-align:${b.textAlign || 'left'};${b.fontFamily ? `font-family:${b.fontFamily};` : ''}`
      + `${b.lineHeight ? `line-height:${b.lineHeight};` : ''}`
      + `${b.letterSpacing ? `letter-spacing:${b.letterSpacing}px;` : ''}`
      + `${b.indent ? `padding-left:${b.indent}px;` : ''}`
      + `${b.dir === 'rtl' ? 'direction:rtl;' : ''}`
      + `${b.vertical ? 'writing-mode:vertical-rl;' : ''}`
      + `${b.bullet ? `--bullet:${b.bullet};` : ''}`
      + `${b.numStyle ? `--num:${b.numStyle};` : ''}`
      + `${b.bg ? `background:${b.bg};` : ''}${b.borderColor ? `border:2px solid ${b.borderColor};` : ''}`
      + `${b.radius ? `border-radius:${b.radius}px;` : ''}box-sizing:border-box;">`
      + `${b.html || ''}</div>`;
  if (b.type === 'model')
    return `<model-viewer${a} src="${b.src}" camera-controls ${b.autoRotate !== false ? 'auto-rotate' : ''} `
      + `shadow-intensity="1" style="${box(b)}background:transparent"></model-viewer>`;
  if (b.type === 'image')
    return `<img${a} src="${b.src}" alt="${esc(b.alt || '')}" style="${box(b)}object-fit:${b.fit || 'contain'};`
      + `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)}">`;
  if (b.type === 'video')
    return `<video${a} src="${b.src}" controls style="${box(b)}object-fit:contain"></video>`;
  if (b.type === 'audio')
    return `<audio${a} src="${b.src}" controls style="${box(b)}"></audio>`;
  if (b.type === 'embed')
    return `<iframe${a} src="${b.src}" referrerpolicy="no-referrer" `
      + `sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" `
      + `style="${box(b)}border:0;background:#fff"></iframe>`;
  if (b.type === 'shape')
    return `<div${a} style="${box(b)}">${shapeSVG(b)}</div>`;
  if (b.type === 'chart')
    return `<div${a} style="${box(b)}">${chartSVG(b)}</div>`;
  if (b.type === 'table')
    return `<div${a} style="${box(b)}"><table class="tbl${b.header ? ' has-header' : ''}" style="--stroke:${b.stroke || '#fff'}">`
      + b.rows.map(row => `<tr>${row.map(c => `<td>${c || ''}</td>`).join('')}</tr>`).join('')
      + `</table></div>`;
  if (b.type === 'code')
    return `<div${a} style="${box(b)}"><pre style="margin:0;height:100%;font-size:${b.fontSize || 22}px">`
      + `<code class="language-${b.lang || 'plaintext'}">${esc(b.code || '')}</code></pre></div>`;
  return '';
}

function slideHTML(s) {
  const trans = s.transition ? ` data-transition="${s.transition}"` : '';
  const auto = s.autoSlide ? ` data-autoslide="${s.autoSlide}"` : '';
  const solid = /^(#|rgb)/.test(s.background || '');
  const bg = solid ? ` data-background-color="${s.background}"` : '';
  const inner = s.blocks.map(b => blockHTML(b, s)).join('\n');
  const notes = s.notes ? `<aside class="notes">${esc(s.notes)}</aside>` : '';
  return `<section${trans}${auto}${bg}>`
    + `<div class="stage" style="background:${s.background}">${inner}</div>${notes}</section>`;
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
  const hasCode = deck.slides.some(s => s.blocks.some(b => b.type === 'code'));
  const ft = deck.footer || { show: false };
  const footerText = ft.show
    ? `<div class="deck-footer">${esc(ft.text || '')}${ft.date ? (ft.text ? ' · ' : '') + new Date().toLocaleDateString('es') : ''}</div>`
    : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(deck.name || 'Presentación')}</title>
<link rel="stylesheet" href="${REVEAL}/dist/reveal.css">
<link rel="stylesheet" href="${REVEAL}/dist/theme/${deck.theme}.css">
${googleFontLinks(deck)}
${hasCode ? `<link rel="stylesheet" href="${HLJS}/styles/github-dark.min.css">` : ''}
<script type="module" src="${MODEL_VIEWER}"></script>
${hasCode ? `<script src="${HLJS}/highlight.min.js"></script>` : ''}
<style>
 .reveal .stage{position:relative;width:${w}px;height:${h}px;margin:0 auto}
 .reveal .stage>*{overflow-wrap:anywhere}
 .reveal .stage ul{list-style-type:var(--bullet,disc)}
 .reveal .stage ol{list-style-type:var(--num,decimal)}
 .reveal section{height:100%}
 .reveal .slide-number{${snPos}}
 .reveal table.tbl{border-collapse:collapse;width:100%;height:100%;margin:0}
 .reveal table.tbl td{border:1px solid var(--stroke,#fff);padding:.15em .4em;vertical-align:top}
 .reveal table.tbl.has-header tr:first-child td{font-weight:700;background:rgba(127,127,127,.25)}
 .deck-footer{position:fixed;left:12px;bottom:8px;z-index:30;font-size:14px;opacity:.7;color:#fff;mix-blend-mode:difference}
</style></head><body>
<div class="reveal"><div class="slides">
${slides}
</div>${footerText}</div>
<script src="${REVEAL}/dist/reveal.js"></script>
<script src="${REVEAL}/plugin/notes/notes.js"></script>
<script>
 Reveal.initialize({ width:${w}, height:${h}, margin:0.03, controls:true,
   progress:true, hash:true, loop:${deck.loop ? 'true' : 'false'},
   slideNumber:${sn.show ? `'${sn.format || 'c'}'` : 'false'},
   transition:'${deck.defaultTransition}', transitionSpeed:'${deck.transitionSpeed}',
   plugins:[ RevealNotes ] });
 ${hasCode ? 'window.hljs && document.querySelectorAll("pre code").forEach(el=>hljs.highlightElement(el));' : ''}
</script></body></html>`;
}

// Present inside a full‑screen overlay in this same page. Because the click on
// "Presentar" is a user gesture in this document, requestFullscreen() is allowed
// here (a freshly opened tab cannot go full screen on its own). The deck loads
// from a blob URL so reveal.js keeps working history/hash and the speaker view.
// The presentation currently on screen (for the phone remote), or null.
export let activePresent = null;

export function present() {
  const url = URL.createObjectURL(new Blob([buildHTML()], { type: 'text/html' }));

  const overlay = document.createElement('div');
  overlay.id = 'present-overlay';
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.allow = 'fullscreen; autoplay; xr-spatial-tracking; clipboard-write';
  overlay.appendChild(frame);

  const close = document.createElement('button');
  close.id = 'present-close'; close.title = 'Salir (Esc)'; close.textContent = '✕';
  overlay.appendChild(close);
  document.body.appendChild(overlay);

  activePresent = { frame, overlay };
  const notifySlide = () => window.dispatchEvent(new CustomEvent('revela:present-slide'));
  const end = () => {
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('keydown', onKey);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    overlay.remove();
    URL.revokeObjectURL(url);
    activePresent = null; notifySlide();
  };
  const onFs = () => { if (!document.fullscreenElement) end(); };
  const onKey = e => { if (e.key === 'Escape') end(); };
  close.addEventListener('click', end);
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('keydown', onKey);

  // Once reveal.js has initialised inside the frame, relay its slide changes so
  // the phone remote (if connected) can follow along.
  let tries = 0;
  const hook = setInterval(() => {
    const Rv = frame.contentWindow.Reveal;
    if (Rv && Rv.isReady?.()) { clearInterval(hook); Rv.on('slidechanged', notifySlide); notifySlide(); }
    else if (++tries > 60) clearInterval(hook);
  }, 100);

  // Try true OS full screen; if the browser blocks it, the overlay still covers
  // the whole viewport so the presentation fills the window either way.
  Promise.resolve(overlay.requestFullscreen?.()).catch(() => {});
  frame.focus();
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

// A print‑oriented document: one slide per page, sized to the deck. The user
// prints it and chooses "Save as PDF" (works in every browser, no plugins).
export function buildPrintHTML(deck = state.deck) {
  const { w, h } = deck.size;
  const pages = deck.slides.filter(s => !s.hidden).map(s =>
    `<div class="page" style="background:${s.background}">${s.blocks.map(b => blockHTML(b, s)).join('')}</div>`).join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(deck.name || 'Presentación')}</title>
${googleFontLinks(deck)}
<script type="module" src="${MODEL_VIEWER}"></script>
<style>
 @page{size:${w}px ${h}px;margin:0}
 *{box-sizing:border-box} html,body{margin:0}
 .page{position:relative;width:${w}px;height:${h}px;overflow:hidden;color:#fff;page-break-after:always}
 .page:last-child{page-break-after:auto}
 .page>*{overflow-wrap:anywhere}
 model-viewer,img,video,iframe{width:100%;height:100%}
 table.tbl{border-collapse:collapse;width:100%;height:100%}
 table.tbl td{border:1px solid var(--stroke,#333);padding:.15em .4em;vertical-align:top}
</style></head>
<body onload="setTimeout(function(){window.print();},400)">
${pages}
</body></html>`;
}

export function exportPDF() {
  const win = window.open('', '_blank');
  if (!win) { alert('Permite las ventanas emergentes para exportar a PDF.'); return; }
  win.document.write(buildPrintHTML());
  win.document.close();
}
export function saveProject() {
  download(new Blob([JSON.stringify(state.deck, null, 2)], { type: 'application/json' }),
    slug(state.deck.name) + '.revela.json');
}
