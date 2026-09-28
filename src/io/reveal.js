// Generate a self‑contained reveal.js presentation from the deck, and the
// present / export / save-load helpers.

import { state, commit } from '../core/store.js';
import { shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, connectorSVG, iconSVG, wordartCSS, tableRowsHTML, inkSVG, tableClass, tableVars, tableCSS } from '../ui/shape.js';
import { googleFontLinks } from '../features/fonts.js';
import { t } from '../i18n.js';
import { alertDialog, confirmDialog } from '../ui/dialog.js';
import { collectFigures, figuresMap, captionLine, figIndexTitle, visibleIndexMap } from '../features/captions.js';
import { INK_CSS, inkJS } from './ink.js';
import { deckFg, deckBodyFont } from '../features/palettes.js';
import { animTimeline, EFFECT_KF, EFFECT_KF_CSS, isEntrance } from '../features/transitions.js';

const REVEAL = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0';
const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist';

const tf = b => `rotate(${b.rotation || 0}deg)${b.flipH ? ' scaleX(-1)' : ''}${b.flipV ? ' scaleY(-1)' : ''}`;
// Animated blocks use the individual rotate/scale properties so that the
// `transform` of reveal's fragment effects (fade-up, motion paths…) and of the
// keyframes composes with the block's own rotation instead of replacing it.
const tfCSS = b => b.animation
  ? `${b.rotation ? `rotate:${b.rotation}deg;` : ''}${b.flipH || b.flipV ? `scale:${b.flipH ? -1 : 1} ${b.flipV ? -1 : 1};` : ''}`
  : `transform:${tf(b)};`;
const box = b => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;`
  + `height:${b.h}px;${tfCSS(b)}`
  + (b.opacity != null && b.opacity < 100 ? `opacity:${b.opacity / 100};` : '')
  + (b.animation ? `transition-duration:${b.animation.duration ?? 500}ms;transition-delay:${b.animation.delay ?? 0}ms;`
    + `--anim-dur:${b.animation.duration ?? 500}ms;--anim-del:${b.animation.delay ?? 0}ms;`
    + (b.animation.effect === 'path' ? `--dx:${b.animation.dx || 0}px;--dy:${b.animation.dy || 0}px;` : '') : '');

// Custom entrance effects that reveal.js doesn't provide (used only if present).
const CUSTOM_KF = {
  spin: ['rvSpin', '@keyframes rvSpin{from{opacity:0;transform:rotate(-200deg) scale(.6)}to{opacity:1;transform:none}}'],
  flip: ['rvFlip', '@keyframes rvFlip{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:none}}'],
  bounce: ['rvBounce', '@keyframes rvBounce{0%{opacity:0;transform:translateY(-60px)}60%{opacity:1;transform:translateY(12px)}80%{transform:translateY(-6px)}100%{transform:none}}'],
};
function customEffectCSS(deck) {
  const used = new Set();
  deck.slides.forEach(s => s.blocks.forEach(b => { if (b.animation && CUSTOM_KF[b.animation.effect]) used.add(b.animation.effect); }));
  if (!used.size) return '';
  return [...used].map(e => `.reveal .fragment.${e}{opacity:0} .reveal .fragment.${e}.visible{opacity:1;animation:${CUSTOM_KF[e][0]} var(--anim-dur,600ms) ease var(--anim-del,0ms) both}`
    + CUSTOM_KF[e][1]).join('\n');
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = s => (String(s).trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'presentacion');

function animAttrs(b, slide) {
  // An object that triggers animations of others gets an id to be clicked.
  const src = slide && slide.blocks.some(x => x.animation?.trigger === b.id) ? ` data-bid="${b.id}"` : '';
  if (!b.animation) return src;
  const { effect, order, trigger, duration, delay } = b.animation;
  if (trigger && slide?.blocks.some(x => x.id === trigger))       // played on click of another object
    return src + ` class="rv-trig${isEntrance(effect) ? ' rv-in' : ''}" data-trig="${trigger}" data-kf="${EFFECT_KF[effect] || 'rvIn'}"`
      + ` data-dur="${duration ?? 500}" data-del="${delay ?? 0}"`;
  const cls = effect === 'path' ? 'rv-path' : effect;
  return src + ` class="fragment ${cls}" data-fragment-index="${order}"`;
}
const TRIGGER_JS = `(function(){
 function play(el){el.style.animation='none';void el.offsetWidth;
  el.style.animation=el.dataset.kf+' '+el.dataset.dur+'ms ease '+el.dataset.del+'ms both';el.classList.add('on');}
 document.addEventListener('click',function(e){var s=e.target.closest('[data-bid]');if(!s)return;
  s.closest('section').querySelectorAll('[data-trig="'+s.dataset.bid+'"]').forEach(play);});
 Reveal.on('slidechanged',function(ev){if(ev.previousSlide)ev.previousSlide.querySelectorAll('.rv-trig').forEach(function(el){
  el.style.animation='';el.classList.remove('on');});});
})();`;

// Accessibility of each object in the presentation: its alt text as the
// accessible name, or hidden from screen readers when marked decorative.
function ariaAttrs(b) {
  if (b.decorative) return ' aria-hidden="true"';
  const alt = (b.alt || '').trim(); if (!alt) return '';
  if (b.type === 'model') return ` alt="${esc(alt)}"`;
  if (b.type === 'embed') return ` title="${esc(alt)}"`;
  if (b.type === 'video' || b.type === 'audio') return ` aria-label="${esc(alt)}"`;
  if (['shape', 'chart', 'icon', 'ink', 'math'].includes(b.type)) return ` role="img" aria-label="${esc(alt)}"`;
  return '';
}

function blockHTML(b, slide) {
  // When the slide uses Auto‑Animate, a stable data-id lets reveal.js match and
  // morph the same object between consecutive slides (PowerPoint's "Morph").
  const a = animAttrs(b, slide) + (slide && slide.autoAnimate ? ` data-id="${b.id}"` : '') + ariaAttrs(b);
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
      + `${b.radius ? `border-radius:${b.radius}px;` : ''}box-sizing:border-box;`
      + `${b.vAlign ? `display:flex;flex-direction:column;justify-content:${{ top: 'flex-start', middle: 'center', bottom: 'flex-end' }[b.vAlign]};` : ''}`
      + `${b.fontWeight ? `font-weight:${b.fontWeight};` : ''}${b.fontStyle ? `font-style:${b.fontStyle};` : ''}`
      + `${b.columns > 1 ? `column-count:${b.columns};column-gap:32px;` : ''}`
      + `${b.wordart ? wordartCSS(b.wordart) : ''}">`
      + `${b.html || ''}</div>`;
  if (b.type === 'model')
    return `<model-viewer${a} src="${b.src}" camera-controls ${b.autoRotate !== false ? 'auto-rotate' : ''} `
      + `shadow-intensity="1" style="${box(b)}background:transparent"></model-viewer>`;
  if (b.type === 'image')
    return `<img${a} src="${b.src}" alt="${b.decorative ? '' : esc(b.alt || '')}" style="${box(b)}object-fit:${b.fit || 'contain'};`
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
  if (b.type === 'icon')
    return `<div${a} style="${box(b)}">${iconSVG(b)}</div>`;
  if (b.type === 'ink')
    return `<div${a} style="${box(b)}">${inkSVG(b)}</div>`;
  if (b.type === 'math')
    return `<div${a} class="math" data-latex="${esc(b.latex || '')}" style="${box(b)}display:flex;align-items:center;justify-content:center"></div>`;
  if (b.type === 'table')
    return `<div${a} style="${box(b)}"><table class="${tableClass(b)}" style="${tableVars(b)}">`
      + tableRowsHTML(b) + `</table></div>`;
  if (b.type === 'code') {
    // data-line-numbers drives reveal's animated line highlighting; a value like
    // "1|2-3|4" steps through line groups, empty just numbers the lines.
    const ln = b.lineSteps ? ` data-line-numbers="${b.lineSteps}"` : (b.showLines ? ' data-line-numbers=""' : '');
    return `<div${a} style="${box(b)}"><pre style="margin:0;height:100%;font-size:${b.fontSize || 22}px">`
      + `<code class="language-${b.lang || 'plaintext'}"${ln}>${esc(b.code || '')}</code></pre></div>`;
  }
  return '';
}

function figIndexExport(b, deck) {
  const figs = collectFigures(deck, b.kind);
  const vis = visibleIndexMap(deck);
  return `<div style="${box(b)}font-size:${b.fontSize || 28}px"><b>${esc(t(figIndexTitle(b.kind)))}</b>`
    + `<ul style="margin:.4em 0 0;padding-left:1.4em">`
    + figs.map(f => `<li><a href="#/${vis.get(f.slide) ?? 0}" style="color:inherit;text-decoration:none">${esc(captionLine(f))}</a></li>`).join('')
    + `</ul></div>`;
}
function slideRefExport(b, originSlide, deck) {
  const target = deck.slides.find(s => s.id === b.target) || deck.slides[0];
  if (!target) return '';
  const { w, h } = deck.size; const scale = b.w / w;
  const vis = visibleIndexMap(deck);
  const ti = vis.get(deck.slides.indexOf(target)) ?? 0;
  const oi = vis.get(deck.slides.indexOf(originSlide)) ?? 0;
  const inner = target.blocks.filter(x => x.type !== 'slideref').map(bl => blockHTML(bl, target)).join('');
  const ret = b.returnBack ? ` data-zoom-return="1" data-target="${ti}" data-origin="${oi}"` : '';
  return `<a class="slide-zoom" href="#/${ti}"${ret} style="${box(b)}display:block;overflow:hidden;`
    + `border:1px solid #ffffff88;border-radius:6px;background:${target.background}">`
    + `<div style="width:${w}px;height:${h}px;transform:scale(${scale});transform-origin:top left;position:relative">${inner}</div></a>`;
}
function slideHTML(s, deck, figMap) {
  // Entry/exit can differ (reveal's "x-in y-out"); speed can be set per slide.
  const tin = s.transition || deck.defaultTransition || 'slide';
  const trans = s.transitionOut && s.transitionOut !== tin ? ` data-transition="${tin}-in ${s.transitionOut}-out"`
    : s.transition ? ` data-transition="${s.transition}"` : '';
  const speed = s.transitionSpeed ? ` data-transition-speed="${s.transitionSpeed}"` : '';
  const auto = s.autoSlide ? ` data-autoslide="${s.autoSlide}"` : '';
  const solid = /^(#|rgb)/.test(s.background || '');
  const bg = solid ? ` data-background-color="${s.background}"` : '';
  const tl = animTimeline(s);
  const inner = s.blocks.map(b0 => {
    // Effective start time within the click ("with/after previous" resolved).
    const b = b0.animation && tl.has(b0.id) ? { ...b0, animation: { ...b0.animation, delay: tl.get(b0.id).delay } } : b0;
    if (b.type === 'figindex') return figIndexExport(b, deck);
    if (b.type === 'slideref') return slideRefExport(b, s, deck);
    let html = blockHTML(b, s);
    const f = figMap.get(b.id);
    if (f) html += `<div class="caption" style="position:absolute;left:${b.x}px;top:${b.y + b.h + 4}px;width:${b.w}px;`
      + `text-align:center;font-style:italic;font-size:16px;opacity:.85">${esc(captionLine(f))}</div>`;
    return html;
  }).join('\n');
  const notes = s.notes ? `<aside class="notes">${esc(s.notes)}</aside>` : '';
  const aa = s.autoAnimate ? ' data-auto-animate' : '';
  return `<section${trans}${speed}${auto}${bg}${aa}>`
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
  const figMap = figuresMap(deck);
  const slides = deck.slides.filter(s => !s.hidden).map(s => slideHTML(s, deck, figMap)).join('\n');
  const sn = deck.slideNumber || { show: false };
  const snPos = SLIDENUM_POS[sn.position] || SLIDENUM_POS.br;
  const hasCode = deck.slides.some(s => s.blocks.some(b => b.type === 'code'));
  const hasMath = deck.slides.some(s => s.blocks.some(b => b.type === 'math'));
  const hasInlineMath = deck.slides.some(s => s.blocks.some(b => b.type === 'text' && /\$[^$]/.test(b.html || '')));
  const hasZoomReturn = deck.slides.some(s => s.blocks.some(b => b.type === 'slideref' && b.returnBack));
  const katexNeeded = hasMath || hasInlineMath;
  const hasTrig = deck.slides.some(s => s.blocks.some(b => b.animation?.trigger));
  const ft = deck.footer || { show: false };
  const footerText = ft.show
    ? `<div class="deck-footer">${esc(ft.text || '')}${ft.date ? (ft.text ? ' · ' : '') + new Date().toLocaleDateString('es') : ''}</div>`
    : '';
  const lg = deck.logo || {};
  const LOGO_POS = { br: 'right:16px;bottom:16px', bl: 'left:16px;bottom:16px', tr: 'right:16px;top:16px', tl: 'left:16px;top:16px' };
  const logoHTML = lg.src
    ? `<img class="deck-logo" src="${lg.src}" style="position:fixed;${LOGO_POS[lg.position] || LOGO_POS.br};height:${lg.size || 120}px;z-index:31;pointer-events:none">`
    : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(deck.name || 'Presentación')}</title>
<link rel="stylesheet" href="${REVEAL}/dist/reveal.css">
<link rel="stylesheet" href="${REVEAL}/dist/theme/${deck.theme}.css">
${googleFontLinks(deck)}
${hasCode ? `<link rel="stylesheet" href="${REVEAL}/plugin/highlight/monokai.css">` : ''}
${katexNeeded ? `<link rel="stylesheet" href="${KATEX}/katex.min.css">` : ''}
<script type="module" src="${MODEL_VIEWER}"></script>
${katexNeeded ? `<script defer src="${KATEX}/katex.min.js"></script>` : ''}
${hasInlineMath ? `<script defer src="${KATEX}/contrib/auto-render.min.js"></script>` : ''}
<style>
 .reveal .stage{position:relative;width:${w}px;height:${h}px;margin:0 auto;color:${deckFg(deck)};${deckBodyFont(deck) ? `font-family:${deckBodyFont(deck)};` : ''}}
 .reveal .stage>*{overflow-wrap:anywhere}
 .reveal .stage ul{list-style-type:var(--bullet,disc)}
 .reveal .stage ol{list-style-type:var(--num,decimal)}
 .reveal section{height:100%}
 .reveal .slide-number{${snPos}}
 ${tableCSS('.reveal ')}
 .deck-footer{position:fixed;left:12px;bottom:8px;z-index:30;font-size:14px;opacity:.7;color:#fff;mix-blend-mode:difference}
 ${customEffectCSS(deck)}
 .reveal .slides section .fragment.rv-path{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-path.visible{translate:var(--dx) var(--dy)}
 ${hasTrig ? `[data-bid]{cursor:pointer} .rv-trig.rv-in:not(.on){opacity:0} ${EFFECT_KF_CSS.replace(/\n/g, ' ')}` : ''}
 ${INK_CSS}
</style></head><body>
<div class="reveal"><div class="slides">
${slides}
</div>${footerText}${logoHTML}</div>
<script src="${REVEAL}/dist/reveal.js"></script>
<script src="${REVEAL}/plugin/notes/notes.js"></script>
${hasCode ? `<script src="${REVEAL}/plugin/highlight/highlight.js"></script>` : ''}
<script>
 Reveal.initialize({ width:${w}, height:${h}, margin:0.03, controls:true,
   progress:true, hash:true, loop:${deck.loop ? 'true' : 'false'},
   slideNumber:${sn.show ? `'${sn.format || 'c'}'` : 'false'},
   transition:'${deck.defaultTransition}', transitionSpeed:'${deck.transitionSpeed}',
   plugins:[ RevealNotes${hasCode ? ', RevealHighlight' : ''} ] });
 ${hasMath ? 'window.addEventListener("load",function(){window.katex&&document.querySelectorAll(".math[data-latex]").forEach(function(el){try{katex.render(el.getAttribute("data-latex"),el,{throwOnError:false,displayMode:true});}catch(e){}});});' : ''}
 ${hasInlineMath ? 'window.addEventListener("load",function(){window.renderMathInElement&&renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false});});' : ''}
 ${hasTrig ? TRIGGER_JS : ''}
 ${inkJS(w, h, { pen: t('Lápiz'), hl: t('Resaltador'), laser: t('Puntero láser'), color: t('Color de la tinta'), erase: t('Borrar la tinta de la diapositiva') })}
 ${hasZoomReturn ? '(function(){var p=null;document.addEventListener("click",function(e){var a=e.target.closest("a.slide-zoom[data-zoom-return]");if(a){p={t:+a.dataset.target,o:+a.dataset.origin,arrived:false};}});Reveal.on("slidechanged",function(ev){if(!p)return;if(ev.indexh===p.t){p.arrived=true;return;}if(p.arrived){var o=p.o;p=null;setTimeout(function(){Reveal.slide(o);},0);}});})();' : ''}
</script></body></html>`;
}

// Present inside a full‑screen overlay in this same page. Because the click on
// "Presentar" is a user gesture in this document, requestFullscreen() is allowed
// here (a freshly opened tab cannot go full screen on its own). The deck loads
// from a blob URL so reveal.js keeps working history/hash and the speaker view.
// The presentation currently on screen (for the phone remote), or null.
export let activePresent = null;

// rehearse: PowerPoint's "Rehearse Timings" — time each slide while presenting
// (without the current auto-advance), then offer to save the times as each
// slide's auto-advance.
export function present({ rehearse = false } = {}) {
  const deck = rehearse ? { ...state.deck, slides: state.deck.slides.map(s => ({ ...s, autoSlide: 0 })) } : state.deck;
  const url = URL.createObjectURL(new Blob([buildHTML(deck)], { type: 'text/html' }));

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

  // Rehearsal clock: time on the current slide and total.
  const times = [], t0 = performance.now(); let cur = 0, since = t0, clock = null, tick = null;
  if (rehearse) {
    clock = document.createElement('div'); clock.id = 'rehearse-clock'; overlay.appendChild(clock);
    const fmt = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    tick = setInterval(() => { const n = performance.now(); clock.textContent = `${fmt(n - since)} · ${t('Total')} ${fmt(n - t0)}`; }, 250);
  }
  const lap = next => { const n = performance.now(); times[cur] = (times[cur] || 0) + (n - since); since = n; cur = next; };
  activePresent = { frame, overlay, rehearse, times, lap };
  const notifySlide = () => window.dispatchEvent(new CustomEvent('revela:present-slide'));
  const end = () => {
    if (rehearse) { clearInterval(tick); lap(cur); offerRehearsal(times); }
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
    if (Rv && Rv.isReady?.()) {
      clearInterval(hook); Rv.on('slidechanged', notifySlide); notifySlide();
      if (rehearse) Rv.on('slidechanged', ev => lap(ev.indexh));
    }
    else if (++tries > 60) clearInterval(hook);
  }, 100);

  // Try true OS full screen; if the browser blocks it, the overlay still covers
  // the whole viewport so the presentation fills the window either way.
  Promise.resolve(overlay.requestFullscreen?.()).catch(() => {});
  frame.focus();
}

// Save rehearsed times (visible slides, in order) as each slide's auto-advance.
export function applyRehearsal(times, deck = state.deck) {
  const vis = deck.slides.filter(s => !s.hidden);
  commit(() => vis.forEach((s, i) => { if (times[i] > 0) s.autoSlide = Math.max(1000, Math.round(times[i] / 1000) * 1000); }));
}
function offerRehearsal(times) {
  const total = Math.round(times.reduce((a, b) => a + (b || 0), 0) / 1000);
  if (!total) return;
  confirmDialog(t('Tiempo total de la presentación: ') + `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}. `
    + t('¿Guardar los intervalos para que las diapositivas avancen solas?')).then(ok => { if (ok) applyRehearsal(times); });
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
 .page{position:relative;width:${w}px;height:${h}px;overflow:hidden;color:${deckFg(deck)};${deckBodyFont(deck) ? `font-family:${deckBodyFont(deck)};` : ''}page-break-after:always}
 .page:last-child{page-break-after:auto}
 .page>*{overflow-wrap:anywhere}
 model-viewer,img,video,iframe{width:100%;height:100%}
 ${tableCSS()}
</style></head>
<body onload="setTimeout(function(){window.print();},400)">
${pages}
</body></html>`;
}

// Handouts and notes pages (PowerPoint "Print > Handouts / Notes Pages"):
// A4 portrait pages with n slides each, lines to write on for 3 per page, or
// one slide with its speaker notes. Slides are the same inline HTML, scaled.
export const HANDOUT_LAYOUTS = { notes: [1, 1], 1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [2, 2], 6: [2, 3], 9: [3, 3] };
export function buildHandoutHTML(deck = state.deck, layout = 6) {
  const { w, h } = deck.size;
  const [cols, rows] = HANDOUT_LAYOUTS[layout] || HANDOUT_LAYOUTS[6];
  const per = cols * rows, MM = 3.7795, GAP = 8, AW = 186, AH = layout === 'notes' ? 120 : 253;
  const cellW = layout == 3 ? 92 : (AW - (cols - 1) * GAP) / cols;
  const cellH = (AH - (rows - 1) * GAP) / rows;
  const sw = Math.min(cellW, cellH * w / h), k = (sw * MM / w).toFixed(4);
  const vis = deck.slides.filter(s => !s.hidden);
  const thumb = (s, n) => `<div class="cell"><div class="thumb" style="width:${sw.toFixed(2)}mm;height:${(sw * h / w).toFixed(2)}mm">`
    + `<div class="page" style="background:${s.background};transform:scale(${k})">${s.blocks.map(b => blockHTML(b, s)).join('')}</div></div>`
    + `${layout === 'notes' ? '' : `<span class="n">${n}</span>`}</div>`;
  const pages = [];
  for (let i = 0; i < vis.length; i += per) {
    const chunk = vis.slice(i, i + per);
    const body = layout === 'notes'
      ? thumb(chunk[0], i + 1) + `<div class="notes">${esc(chunk[0].notes || '')}</div>`
      : `<div class="grid${layout == 3 ? ' lined' : ''}" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">`
        + chunk.map((s, j) => thumb(s, i + j + 1) + (layout == 3 ? '<div class="lines"></div>' : '')).join('') + '</div>';
    pages.push(`<section class="sheet"><header>${esc(deck.name || '')}</header>${body}<footer>${pages.length + 1}</footer></section>`);
  }
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(deck.name || 'Presentación')}</title>
${googleFontLinks(deck)}
<style>
 @page{size:A4 portrait;margin:0}
 *{box-sizing:border-box} html,body{margin:0;font-family:system-ui,sans-serif;color:#222;background:#fff}
 .sheet{width:210mm;height:297mm;padding:12mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}
 .sheet:last-child{page-break-after:auto}
 header,footer{font-size:9pt;color:#777;height:6mm} footer{text-align:right;margin-top:auto}
 .grid{flex:1;display:grid;gap:${GAP}mm;min-height:0}
 .grid.lined{grid-template-columns:${cellW}mm 1fr !important}
 .cell{display:flex;align-items:center;justify-content:center;position:relative;min-height:0}
 .cell .n{position:absolute;left:0;top:0;font-size:8pt;color:#999}
 .thumb{position:relative;overflow:hidden;border:1px solid #bbb}
 .page{position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;color:${deckFg(deck)};${deckBodyFont(deck) ? `font-family:${deckBodyFont(deck)};` : ''}}
 .page>*{overflow-wrap:anywhere}
 .page img,.page video,.page iframe,.page model-viewer{width:100%;height:100%}
 .lines{background:repeating-linear-gradient(transparent 0 9mm,#bbb 9mm calc(9mm + 1px));margin:4mm 0}
 .notes{white-space:pre-wrap;font-size:12pt;line-height:1.5;margin-top:10mm;flex:1}
 ${tableCSS()}
</style></head>
<body onload="setTimeout(function(){window.print();},400)">
${pages.join('\n')}
</body></html>`;
}

export function exportHandout(layout) {
  const win = window.open('', '_blank');
  if (!win) { alertDialog(t('Permite las ventanas emergentes para exportar a PDF.')); return; }
  win.document.write(buildHandoutHTML(state.deck, layout));
  win.document.close();
}

export function exportPDF() {
  const win = window.open('', '_blank');
  if (!win) { alertDialog(t('Permite las ventanas emergentes para exportar a PDF.')); return; }
  win.document.write(buildPrintHTML());
  win.document.close();
}

// The inline‑styled blocks of a slide (self‑contained, no external CSS).
export function slideInnerHTML(slide) { return slide.blocks.map(b => blockHTML(b, slide)).join(''); }

const H2C = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const loadScript = (src, global) => new Promise((res, rej) => {
  if (window[global]) return res();
  const sc = document.createElement('script'); sc.src = src; sc.onload = res;
  sc.onerror = () => rej(new Error(t('No se pudo cargar ') + src.split('/npm/')[1])); document.head.appendChild(sc);
});

// Rasterise one slide with html2canvas. 3D models and web embeds can't be
// rasterised (they come out blank); everything else does.
export async function slideImageBlob(s, type = 'png', deck = state.deck) {
  const { w, h } = deck.size;
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;overflow:hidden;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'};background:${s.background}`;
  holder.innerHTML = `<style>*{box-sizing:border-box}ul{list-style-type:var(--bullet,disc)}ol{list-style-type:var(--num,decimal)}`
    + `img,video,model-viewer,iframe{width:100%;height:100%}${tableCSS()}</style>`
    + slideInnerHTML(s);
  document.body.appendChild(holder);
  try {
    await loadScript(H2C, 'html2canvas');
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
    alertDialog(t('No se pudo exportar la imagen: ') + e.message);
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
export const exportPNG = () => exportImages({ type: 'png' });
export function saveProject() {
  download(new Blob([JSON.stringify(state.deck, null, 2)], { type: 'application/json' }),
    slug(state.deck.name) + '.revela.json');
}
