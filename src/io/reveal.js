// Generate a self‑contained reveal.js presentation from the deck, and the
// present / export / save-load helpers.

import { state, commit } from '../core/store.js';
import { shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, connectorSVG, iconSVG, wordartCSS, tableRowsHTML, inkSVG, tableClass, tableVars, tableCSS, escSvg, SERIES_COLOURS, chartSeries } from '../ui/shape.js';
import { googleFontLinks } from '../features/fonts.js';
import { t, currentLang } from '../i18n.js';
import { alertDialog, confirmDialog } from '../ui/dialog.js';
import { collectFigures, figuresMap, captionLine, figIndexTitle, slidePaths } from '../features/captions.js';
import { INK_CSS, inkJS } from './ink.js';
import { deckFg, deckBodyFont, currentPalette } from '../features/palettes.js';
import { tallyVotes, pollResultsHTML, VOTE_URL, savedVotes } from '../features/poll.js';
import { parseChartGrid } from '../features/blocks.js';
import { animTimeline, EFFECT_KF, EFFECT_KF_CSS, isEntrance, customTransitionCSS, pathKeyframesCSS } from '../features/transitions.js';
import { masterBlocksFor, isEmptyPlaceholder } from '../features/master.js';

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
    + (b.animation.effect === 'path' ? `--dx:${b.animation.dx || 0}px;--dy:${b.animation.dy || 0}px;--pk:rvP${b.id};` : '') : '');

// Custom entrance effects that reveal.js doesn't provide (used only if present).
const CUSTOM_KF = {
  spin: ['rvSpin', '@keyframes rvSpin{from{opacity:0;transform:rotate(-200deg) scale(.6)}to{opacity:1;transform:none}}'],
  flip: ['rvFlip', '@keyframes rvFlip{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:none}}'],
  bounce: ['rvBounce', '@keyframes rvBounce{0%{opacity:0;transform:translateY(-60px)}60%{opacity:1;transform:translateY(12px)}80%{transform:translateY(-6px)}100%{transform:none}}'],
};
// One keyframe set per object with a motion path (curves are sampled).
const pathKeyframes = deck => deck.slides.flatMap(s => s.blocks.filter(b => b.animation?.effect === 'path'))
  .map(b => pathKeyframesCSS('rvP' + b.id, b.animation)).join('\n');
// Speech recognition language from the interface language.
const speechLang = () => ({ es: 'es-ES', en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ca: 'ca-ES', gl: 'gl-ES', nl: 'nl-NL', eu: 'eu-ES', ar: 'ar-SA' }[currentLang()] || 'es-ES');
const usedTransitions = deck => new Set([deck.defaultTransition, ...deck.slides.flatMap(s => [s.transition, s.transitionOut])].filter(Boolean));
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
    return src + ` class="rv-trig${isEntrance(effect) ? ' rv-in' : ''}" data-trig="${trigger}" data-kf="${effect === 'path' ? 'rvP' + b.id : EFFECT_KF[effect] || 'rvIn'}"`
      + ` data-dur="${duration ?? 500}" data-del="${delay ?? 0}"`;
  const cls = effect === 'path' ? (b.animation.pathShape && b.animation.pathShape !== 'line' ? 'rv-pathc' : 'rv-path') : effect;
  return src + ` class="fragment ${cls}" data-fragment-index="${order}"`;
}
// Live camera for Cameo objects: asked for only when a slide that has one is
// shown, and shared by all of them.
const CAMERA_JS = `(function(){var st=null,asked=false;
 function fill(slide){var vs=slide&&slide.querySelectorAll('video[data-camera]');if(!vs||!vs.length)return;
  function put(){vs.forEach(function(v){if(v.srcObject!==st){v.srcObject=st;v.play&&v.play().catch(function(){});}});}
  if(st)return put();if(asked)return;asked=true;
  navigator.mediaDevices&&navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(function(s){st=s;put();}).catch(function(){});}
 Reveal.on('ready',function(e){fill(e.currentSlide);});Reveal.on('slidechanged',function(e){fill(e.currentSlide);});
 if(Reveal.isReady())fill(Reveal.getCurrentSlide());})();`;
// Live polls: host a PeerJS peer, show the QR on every poll, tally votes and
// repaint the results as they arrive; the current slide's poll is sent to the
// phones. Loaded only when the deck has polls.
function pollJS(accents) {
  return `(function(){
 var tally=${tallyVotes.toString()};
 var render=${pollResultsHTML.toString()};
 var VOTE=${JSON.stringify(VOTE_URL)}, ACC=${JSON.stringify(accents)}, votes={}, conns=[], peer=null, code='';
 var AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 function all(){return [].slice.call(document.querySelectorAll('.rv-poll'));}
 function def(el){try{return JSON.parse(el.getAttribute('data-poll'));}catch(e){return null;}}
 function load(id){try{return JSON.parse(localStorage.getItem('revela.poll.'+id))||{};}catch(e){return {};}}
 function store(id){try{localStorage.setItem('revela.poll.'+id,JSON.stringify(votes[id]));}catch(e){}}
 function paint(el){var p=def(el);if(!p)return;var v=votes[p.pollId]||(votes[p.pollId]=load(p.pollId));el.querySelector('.rv-poll-res').innerHTML=render(p,tally(p,v),ACC);}
 function current(){var s=Reveal.getCurrentSlide(),el=s&&s.querySelector('.rv-poll');var p=el&&def(el);return p?{pollId:p.pollId,kind:p.kind,question:p.question,options:p.options}:null;}
 function send(c,m){try{if(c.open)c.send(m);}catch(e){}}
 function qaList(p){var r=tally(p,votes[p.pollId]||(votes[p.pollId]=load(p.pollId)));return (r.questions||[]).map(function(q){return {id:q.id,text:q.text,up:q.up};});}
 function broadcastQA(p){var cur=current();if(!cur||cur.pollId!==p.pollId)return;conns.forEach(function(c){send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function broadcast(){var p=current();conns.forEach(function(c){send(c,{type:'poll',poll:p});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function js(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});}
 function clean(p,a){if(p.kind==='word')return String(a||'').slice(0,60);if(p.kind==='multi')return (Array.isArray(a)?a:[]).map(Number).filter(function(x){return x>=0&&x<p.options.length;}).slice(0,20);
  var n=+a;return p.kind==='rating'?(n>=1&&n<=5?Math.round(n):null):(n>=0&&n<p.options.length?n:null);}
 function start(tries){code='';for(var i=0;i<5;i++)code+=AB[Math.floor(Math.random()*AB.length)];
  peer=new Peer('revela-vote-'+code);
  peer.on('open',function(){var url=VOTE+'?c='+code;all().forEach(function(el){el.querySelector('.rv-poll-code').textContent=code;
    el.querySelector('.rv-poll-url').textContent=url.replace(/^https?:\\/\\//,'').replace(/\\?.*$/,'');
    if(window.QRCode)QRCode.toCanvas(el.querySelector('canvas'),url,{width:220,margin:1},function(){});});});
  peer.on('connection',function(c){conns.push(c);
    c.on('open',function(){var p=current();send(c,{type:'poll',poll:p});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});
    c.on('data',function(d){if(!d||d.type!=='vote')return;var el=all().filter(function(e){var p=def(e);return p&&p.pollId===d.pollId;})[0];if(!el)return;
      var p=def(el),who=String(d.voter).slice(0,40),V=votes[p.pollId]||(votes[p.pollId]=load(p.pollId));
      if(p.kind==='qa'){var a=d.answer||{};
        if(a.ask){var txt=String(a.ask).trim().slice(0,200);if(!txt)return;var n=Object.keys(V).filter(function(k){return V[k].by===who;}).length;if(n>=5)return;
          var id='q:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);V[id]={t:txt,by:who,time:Date.now(),up:{}};}
        else if(a.up&&V[a.up]){if(V[a.up].up[who])delete V[a.up].up[who];else V[a.up].up[who]=1;}else return;
        store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});broadcastQA(p);return;}
      var a2=clean(p,d.answer);if(a2===null||a2==='')return;V[who]=a2;
      store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});});
    c.on('close',function(){conns=conns.filter(function(x){return x!==c;});});});
  peer.on('error',function(e){if(e.type==='unavailable-id'&&tries<5){peer.destroy();start(tries+1);}});}
 all().forEach(paint);
 js('https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js').catch(function(){}).then(function(){return js('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js');}).then(function(){start(0);});
 Reveal.on('slidechanged',broadcast);
})();`;
}
// Live data while presenting: dashboards reload every N minutes; charts linked
// to a CSV re-fetch it every N seconds and redraw with the editor's own code.
function liveDataJS() {
  return `(function(){
 ${escSvg.toString().replace(/^/, 'var escSvg=')};
 var SERIES_COLOURS=${JSON.stringify(SERIES_COLOURS)};
 ${chartSeries.toString()}
 ${chartSVG.toString()}
 ${parseChartGrid.toString()}
 document.querySelectorAll('iframe[data-refresh-min]').forEach(function(f){var m=+f.dataset.refreshMin;if(m>0)setInterval(function(){f.src=f.src;},m*60000);});
 document.querySelectorAll('.rv-live-chart').forEach(function(el){var b;try{b=JSON.parse(el.getAttribute('data-chart'));}catch(e){return;}
  function load(){fetch(b.dataUrl,{cache:'no-store'}).then(function(r){return r.ok?r.text():Promise.reject();}).then(function(t){
    var g=parseChartGrid(t);if(!g.data.length)return;b.data=g.data;b.series=g.series.length?g.series:undefined;if(g.names[0])b.seriesName=g.names[0];
    el.innerHTML=chartSVG(b);}).catch(function(){});}
  load();if(b.refreshSec>0)setInterval(load,b.refreshSec*1000);});
})();`;
}
// Click-to-enlarge images: a full-screen view; click or Esc closes it.
const LIGHTBOX_JS = `(function(){var box=null;
 function close(){if(box){box.remove();box=null;}}
 document.addEventListener('click',function(e){var im=e.target.closest('img[data-lightbox]');if(!im||box)return;e.preventDefault();e.stopPropagation();
  box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  var big=document.createElement('img');big.src=im.src;big.alt=im.alt;big.style.cssText='max-width:94vw;max-height:94vh;object-fit:contain;box-shadow:0 10px 40px #000';
  box.appendChild(big);box.addEventListener('click',close);document.body.appendChild(box);},true);
 window.addEventListener('keydown',function(e){if(box&&e.key==='Escape'){close();e.stopImmediatePropagation();e.preventDefault();}},true);
 var st=document.createElement('style');st.textContent='img[data-lightbox]{cursor:zoom-in}';document.head.appendChild(st);})();`;
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
// What a slide shows: the master's objects (unless hidden) under its own, and
// no empty placeholders.
const blocksOf = (s, deck = state.deck) => [...masterBlocksFor(s, deck), ...s.blocks].filter(b => !isEmptyPlaceholder(b));

function ariaAttrs(b) {
  if (b.decorative) return ' aria-hidden="true"';
  const alt = (b.alt || '').trim(); if (!alt) return '';
  if (b.type === 'model') return ` alt="${esc(alt)}"`;
  if (b.type === 'embed') return ` title="${esc(alt)}"`;
  if (b.type === 'video' || b.type === 'audio') return ` aria-label="${esc(alt)}"`;
  if (['shape', 'chart', 'icon', 'ink', 'math'].includes(b.type)) return ` role="img" aria-label="${esc(alt)}"`;
  return '';
}

// An object's opening tag may get a class from its animation and another from
// its type (code, poll, live chart): merge them into one attribute.
function mergeClasses(html) {
  const end = html.indexOf('>'); if (end < 0) return html;
  const tag = html.slice(0, end), cls = [...tag.matchAll(/\sclass="([^"]*)"/g)].map(m => m[1]);
  if (cls.length < 2) return html;
  let first = true;
  const merged = tag.replace(/\sclass="[^"]*"/g, () => (first ? (first = false, ` class="${cls.join(' ')}"`) : ''));
  return merged + html.slice(end);
}
function blockHTML(b, slide) { return mergeClasses(blockHTMLRaw(b, slide)); }
function blockHTMLRaw(b, slide) {
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
    return `<img${a} src="${b.src}"${b.zoomable ? ' data-lightbox' : ''} alt="${b.decorative ? '' : esc(b.alt || '')}" style="${box(b)}object-fit:${b.fit || 'contain'};`
      + `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)}">`;
  if (b.type === 'video')
    return `<video${a} src="${b.src}" controls style="${box(b)}object-fit:contain"></video>`;
  if (b.type === 'poll')     // live poll: question, live results and the QR to vote
    return `<div${a} class="rv-poll" data-poll="${esc(JSON.stringify({ pollId: b.pollId, kind: b.kind, display: b.display, question: b.question, options: b.options }))}" `
      + `style="${box(b)}display:grid;grid-template-columns:1fr auto;gap:1em;font-size:${b.fontSize || 32}px">`
      + `<div style="display:flex;flex-direction:column;min-width:0"><div style="font-weight:700;margin-bottom:.5em">${esc(b.question || '')}</div>`
      + `<div class="rv-poll-res" style="flex:1;min-height:0"></div></div>`
      + `<div style="text-align:center;font-size:18px;align-self:center"><canvas width="220" height="220" style="background:#fff;border-radius:8px"></canvas>`
      + `<div class="rv-poll-url" style="margin-top:6px;opacity:.8"></div><div>Código <b class="rv-poll-code" style="letter-spacing:3px">·····</b></div></div></div>`;
  if (b.type === 'camera')   // Cameo: filled with the presenter's camera when the slide is shown
    return `<video${a} data-camera autoplay muted playsinline style="${box(b)}object-fit:cover;background:#223;`
      + `border-radius:${b.shape === 'circle' ? '50%' : b.shape === 'rounded' ? '14%' : '0'}${b.mirror !== false ? ';scale:-1 1' : ''}"></video>`;
  if (b.type === 'audio')
    return `<audio${a} src="${b.src}" controls style="${box(b)}"></audio>`;
  if (b.type === 'embed')
    return `<iframe${a} src="${b.src}" referrerpolicy="no-referrer"${b.refreshMin ? ` data-refresh-min="${+b.refreshMin}"` : ''} `
      + `sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" `
      + `style="${box(b)}border:0;background:#fff"></iframe>`;
  if (b.type === 'shape')
    return `<div${a} style="${box(b)}">${shapeSVG(b)}</div>`;
  if (b.type === 'chart')
    return `<div${a}${b.dataUrl ? ` class="rv-live-chart" data-chart="${esc(JSON.stringify({ ...b, data: undefined, series: undefined }))}"` : ''} style="${box(b)}">${chartSVG(b)}</div>`;
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
    const ln = b.lineSteps ? ` data-line-numbers="${esc(b.lineSteps)}"` : (b.showLines ? ' data-line-numbers=""' : '');
    const start = b.lineStart > 1 ? ` data-ln-start-from="${+b.lineStart}"` : '';
    // Morph between slides: the <pre> needs its own data-id for reveal's code animation.
    const morph = slide && slide.autoAnimate ? ` data-id="code-${b.id}"` : '';
    return `<div${a} class="rv-code${b.scroll === false ? ' no-scroll' : ''}" style="${box(b)}"><pre${morph} style="margin:0;height:100%;width:100%;font-size:${b.fontSize || 22}px">`
      + `<code class="language-${b.lang || 'plaintext'}" data-trim${ln}${start}>${esc(b.code || '')}</code></pre></div>`;
  }
  return '';
}

function figIndexExport(b, deck) {
  const figs = collectFigures(deck, b.kind);
  const vis = slidePaths(deck);
  return `<div style="${box(b)}font-size:${b.fontSize || 28}px"><b>${esc(t(figIndexTitle(b.kind)))}</b>`
    + `<ul style="margin:.4em 0 0;padding-left:1.4em">`
    + figs.map(f => `<li><a href="#/${vis.get(f.slide) ?? '0/0'}" style="color:inherit;text-decoration:none">${esc(captionLine(f))}</a></li>`).join('')
    + `</ul></div>`;
}
function slideRefExport(b, originSlide, deck) {
  const target = deck.slides.find(s => s.id === b.target) || deck.slides[0];
  if (!target) return '';
  const { w, h } = deck.size; const scale = b.w / w;
  const vis = slidePaths(deck);
  const ti = vis.get(deck.slides.indexOf(target)) ?? '0/0';
  const oi = vis.get(deck.slides.indexOf(originSlide)) ?? '0/0';
  const inner = target.blocks.filter(x => x.type !== 'slideref').map(bl => blockHTML(bl, target)).join('');
  const ret = b.returnBack ? ` data-zoom-return="1" data-target="${ti}" data-origin="${oi}"` : '';
  return `<a class="slide-zoom" href="#/${ti}"${ret} style="${box(b)}display:block;overflow:hidden;`
    + `border:1px solid #ffffff88;border-radius:6px;background:${target.background}">`
    + `<div style="width:${w}px;height:${h}px;transform:scale(${scale});transform-origin:top left;position:relative">${inner}</div></a>`;
}
// The slide's own background drawn on the stage: none under a video / web
// background (so it shows), and a separate layer when it has an opacity.
export const stageBackground = s => (s.bgVideo || s.bgIframe || (s.bgOpacity ?? 100) < 100 ? 'transparent' : s.background);
export const bgLayer = s => ((s.bgOpacity ?? 100) < 100 && !s.bgVideo && !s.bgIframe
  ? `<div style="position:absolute;inset:0;background:${s.background};opacity:${s.bgOpacity / 100};pointer-events:none"></div>` : '');
function slideHTML(s, deck, figMap) {
  // Entry/exit can differ (reveal's "x-in y-out"); speed can be set per slide.
  const tin = s.transition || deck.defaultTransition || 'slide';
  const trans = s.transitionOut && s.transitionOut !== tin ? ` data-transition="${tin}-in ${s.transitionOut}-out"`
    : s.transition ? ` data-transition="${s.transition}"` : '';
  const speed = s.transitionSpeed ? ` data-transition-speed="${s.transitionSpeed}"` : '';
  const auto = s.autoSlide ? ` data-autoslide="${s.autoSlide}"` : '';
  const solid = /^(#|rgb)/.test(s.background || '');
  // Media backgrounds (reveal.js): video, web page, plus the background's own transition.
  const bg = (solid ? ` data-background-color="${s.background}"` : '')
    + (s.bgVideo ? ` data-background-video="${esc(s.bgVideo)}"${s.bgVideoLoop !== false ? ' data-background-video-loop' : ''}${s.bgVideoMuted !== false ? ' data-background-video-muted' : ''}` : '')
    + (s.bgIframe ? ` data-background-iframe="${esc(s.bgIframe)}"${s.bgInteractive ? ' data-background-interactive' : ''}` : '')
    + (s.bgTransition ? ` data-background-transition="${s.bgTransition}"` : '')
    + (s.uncounted ? ' data-visibility="uncounted"' : '');
  const tl = animTimeline(s);
  const inner = blocksOf(s, deck).map(b0 => {
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
  const aa = (s.autoAnimate ? ' data-auto-animate' : '') + (s.aaDuration ? ` data-auto-animate-duration="${+s.aaDuration}"` : '') + (s.aaDelay ? ` data-auto-animate-delay="${+s.aaDelay}"` : '');
  return `<section${trans}${speed}${auto}${bg}${aa}>`
    + `<div class="stage${s.bgIframe && s.bgInteractive ? ' pass' : ''}" style="background:${stageBackground(s)}">${bgLayer(s)}${inner}</div>${notes}</section>`;
}

// Where the slide number sits, as CSS for reveal's .slide-number element.
const SLIDENUM_POS = {
  br: 'right:8px;bottom:8px;top:auto;left:auto',
  bl: 'left:8px;bottom:8px;top:auto;right:auto',
  tr: 'right:8px;top:8px;bottom:auto;left:auto',
  tl: 'left:8px;top:8px;bottom:auto;right:auto',
};

// inApp: presenting inside the editor from a blob: URL, where the address bar
// can't be rewritten — keep hash navigation (links) but don't write history.
export const slidePathsFor = deck => slidePaths(deck);
// Presentation settings (Transitions ▸ Settings): reveal.js options.
export const rv = deck => deck.reveal || {};
export const REVEAL_DEFAULTS = { controls: true, controlsLayout: 'bottom-right', progress: true, navigationMode: 'default', view: 'slides',
  mouseWheel: false, shuffle: false, hideInactiveCursor: true, jumpToSlide: true, previewLinks: false, rtl: false, center: true,
  autoAnimateDuration: 1.0, autoAnimateEasing: 'ease', autoSlideStoppable: true, fragmentInURL: true, zoom: true, search: true, parallax: '' };
function revealOptions(deck, inApp) {
  const o = { ...REVEAL_DEFAULTS, ...rv(deck) }, J = JSON.stringify;
  return `controls:${!!o.controls}, controlsLayout:${J(o.controlsLayout)}, progress:${!!o.progress}, navigationMode:${J(o.navigationMode)},
   mouseWheel:${!!o.mouseWheel}, shuffle:${!!o.shuffle}, hideInactiveCursor:${!!o.hideInactiveCursor}, jumpToSlide:${!!o.jumpToSlide},
   previewLinks:${!!o.previewLinks}, rtl:${!!o.rtl}, autoAnimateDuration:${+o.autoAnimateDuration || 1}, autoAnimateEasing:${J(o.autoAnimateEasing)},
   autoSlideStoppable:${!!o.autoSlideStoppable}, fragmentInURL:${!inApp && !!o.fragmentInURL},${o.view === 'scroll' ? " view:'scroll', scrollProgress:true," : ''}
   ${o.parallax ? `parallaxBackgroundImage:${J(o.parallax)}, parallaxBackgroundSize:${J(o.parallaxSize || '')},` : ''}`;
}
export function buildHTML(deck = state.deck, { inApp = false } = {}) {
  const { w, h } = deck.size;
  const figMap = figuresMap(deck);
  // Vertical stacks: a slide marked `vertical` goes below the previous visible one.
  const groups = [];
  for (const s of deck.slides.filter(x => !x.hidden)) {
    if (s.vertical && groups.length) groups[groups.length - 1].push(s); else groups.push([s]);
  }
  const paths = slidePaths(deck), flat = [...paths.values()];
  const slides = groups.map(g => (g.length > 1 ? `<section>\n${g.map(s => slideHTML(s, deck, figMap)).join('\n')}\n</section>` : slideHTML(g[0], deck, figMap))).join('\n')
    // Links typed as a slide number (#/N, N = position in the deck) → reveal's h/v.
    .replace(/href="#\/(\d+)"/g, (m, n) => `href="#/${flat[+n] || n}"`);
  const sn = deck.slideNumber || { show: false };
  const snPos = SLIDENUM_POS[sn.position] || SLIDENUM_POS.br;
  const hasCode = deck.slides.some(s => s.blocks.some(b => b.type === 'code'));
  const hasMath = deck.slides.some(s => s.blocks.some(b => b.type === 'math'));
  const hasInlineMath = deck.slides.some(s => s.blocks.some(b => b.type === 'text' && /\$[^$]/.test(b.html || '')));
  const hasZoomReturn = deck.slides.some(s => s.blocks.some(b => b.type === 'slideref' && b.returnBack));
  const katexNeeded = hasMath || hasInlineMath;
  const hasTrig = deck.slides.some(s => s.blocks.some(b => b.animation?.trigger));
  const hasCam = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'camera'));
  const hasPoll = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'poll'));
  const hasZoomable = deck.slides.some(s => s.blocks.some(b => b.type === 'image' && b.zoomable));
  const hasLive = deck.slides.some(s => s.blocks.some(b => (b.type === 'chart' && b.dataUrl) || (b.type === 'embed' && b.refreshMin)));
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
 .reveal .stage.pass{pointer-events:none} .reveal .stage.pass>*{pointer-events:auto}
 .reveal .rv-code pre{box-shadow:none}
 .reveal .rv-code pre code{max-height:100%;height:100%;box-sizing:border-box;overflow:auto;scrollbar-width:thin;scrollbar-color:#6668 transparent}
 .reveal .rv-code.no-scroll pre code{overflow:hidden}
 .deck-footer{position:fixed;left:12px;bottom:8px;z-index:30;font-size:14px;opacity:.7;color:#fff;mix-blend-mode:difference}
 ${customEffectCSS(deck)}
 ${customTransitionCSS(usedTransitions(deck))}
 .reveal .slides section .fragment.rv-path{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-path.visible{translate:var(--dx) var(--dy)}
 .reveal .slides section .fragment.rv-pathc{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-pathc.visible{animation:var(--pk) var(--anim-dur,600ms) ease-in-out var(--anim-del,0ms) both}
 ${pathKeyframes(deck)}
 ${hasTrig ? `[data-bid]{cursor:pointer} .rv-trig.rv-in:not(.on){opacity:0} ${EFFECT_KF_CSS.replace(/\n/g, ' ')}` : ''}
 ${INK_CSS}
</style></head><body>
<div class="reveal"><div class="slides">
${slides}
</div>${footerText}${logoHTML}</div>
<script src="${REVEAL}/dist/reveal.js"></script>
<script src="${REVEAL}/plugin/notes/notes.js"></script>
${rv(deck).zoom !== false ? `<script src="${REVEAL}/plugin/zoom/zoom.js"></script>` : ''}
${rv(deck).search !== false ? `<script src="${REVEAL}/plugin/search/search.js"></script>` : ''}
${hasCode ? `<script src="${REVEAL}/plugin/highlight/highlight.js"></script>` : ''}
<script>
 Reveal.initialize({ width:${w}, height:${h}, margin:0.03, hash:${inApp ? 'false' : 'true'}, respondToHashChanges:true, loop:${deck.loop ? 'true' : 'false'},
   slideNumber:${sn.show ? `'${sn.format || 'c'}'` : 'false'},
   transition:'${deck.defaultTransition}', transitionSpeed:'${deck.transitionSpeed}',
   ${revealOptions(deck, inApp)}
   plugins:[ RevealNotes${hasCode ? ', RevealHighlight' : ''}${rv(deck).zoom !== false ? ', RevealZoom' : ''}${rv(deck).search !== false ? ', RevealSearch' : ''} ] });
 ${hasMath ? 'window.addEventListener("load",function(){window.katex&&document.querySelectorAll(".math[data-latex]").forEach(function(el){try{katex.render(el.getAttribute("data-latex"),el,{throwOnError:false,displayMode:true});}catch(e){}});});' : ''}
 ${hasInlineMath ? 'window.addEventListener("load",function(){window.renderMathInElement&&renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false});});' : ''}
 ${hasTrig ? TRIGGER_JS : ''}
 ${hasCam ? CAMERA_JS : ''}
 ${hasPoll ? pollJS(currentPalette(deck).accents) : ''}
 ${hasLive ? liveDataJS() : ''}
 ${hasZoomable ? LIGHTBOX_JS : ''}
 ${inkJS(w, h, { pen: t('Lápiz'), hl: t('Resaltador'), laser: t('Puntero láser'), color: t('Color de la tinta'), erase: t('Borrar la tinta de la diapositiva'),
   cc: t('Subtítulos en directo'), lang: speechLang(), ccWarn: t('Los subtítulos usan el reconocimiento de voz del navegador: en Chrome y Edge el audio se envía a su servicio de voz. ¿Activarlos?') })}
 ${hasZoomReturn ? '(function(){var p=null;document.addEventListener("click",function(e){var a=e.target.closest("a.slide-zoom[data-zoom-return]");if(a){p={t:a.dataset.target,o:a.dataset.origin.split("/"),arrived:false};}});Reveal.on("slidechanged",function(ev){if(!p)return;if(ev.indexh+"/"+(ev.indexv||0)===p.t){p.arrived=true;return;}if(p.arrived){var o=p.o;p=null;setTimeout(function(){Reveal.slide(+o[0],+o[1]);},0);}});})();' : ''}
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
export function present({ rehearse = false, fullscreen = true, onEnd = null } = {}) {
  const deck = rehearse ? { ...state.deck, slides: state.deck.slides.map(s => ({ ...s, autoSlide: 0 })) } : state.deck;
  const url = URL.createObjectURL(new Blob([buildHTML(deck, { inApp: true })], { type: 'text/html' }));

  const overlay = document.createElement('div');
  overlay.id = 'present-overlay';
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.allow = 'fullscreen; autoplay; xr-spatial-tracking; clipboard-write; camera; microphone';
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
    onEnd?.();
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
      if (rehearse) Rv.on('slidechanged', () => lap(Rv.getSlidePastCount()));
    }
    else if (++tries > 60) clearInterval(hook);
  }, 100);

  // Try true OS full screen; if the browser blocks it, the overlay still covers
  // the whole viewport so the presentation fills the window either way.
  if (fullscreen) Promise.resolve(overlay.requestFullscreen?.()).catch(() => {});
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
    `<div class="page" style="background:${s.background}">${blocksOf(s, deck).map(b => blockHTML(b, s)).join('')}</div>`).join('\n');
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
    + `<div class="page" style="background:${s.background};transform:scale(${k})">${blocksOf(s, deck).map(b => blockHTML(b, s)).join('')}</div></div>`
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
export function slideInnerHTML(slide, deck = state.deck) { return blocksOf(slide, deck).map(b => blockHTML(b, slide)).join(''); }

const H2C = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const loadScript = (src, global) => new Promise((res, rej) => {
  if (window[global]) return res();
  const sc = document.createElement('script'); sc.src = src; sc.onload = res;
  sc.onerror = () => rej(new Error(t('No se pudo cargar ') + src.split('/npm/')[1])); document.head.appendChild(sc);
});

// Fill in what the exported page draws with scripts, for rasterising: KaTeX
// equations (block and inline) and poll results.
async function hydrateStatic(root, deck) {
  if (root.querySelector('.math[data-latex]') || /\$[^$]/.test(root.textContent)) {
    if (!document.querySelector('link[data-katex]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `${KATEX}/katex.min.css`; l.dataset.katex = '1'; document.head.appendChild(l);
    }
    await loadScript(`${KATEX}/katex.min.js`, 'katex');
    root.querySelectorAll('.math[data-latex]').forEach(el => { try { window.katex.render(el.dataset.latex, el, { throwOnError: false, displayMode: true }); } catch {} });
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
  holder.innerHTML = `<style>*{box-sizing:border-box}${tableCSS()}</style>` + blockHTML({ ...b, x: 0, y: 0, rotation: 0, animation: null }, { ...slide, blocks: [b] });
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
    await loadScript(H2C, 'html2canvas');
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
    + `img,video,model-viewer,iframe{width:100%;height:100%}${tableCSS()}</style>`
    + slideInnerHTML(s, deck);
  document.body.appendChild(holder);
  try {
    await hydrateStatic(holder, deck);
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
