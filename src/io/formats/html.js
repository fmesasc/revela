// The deck as a self-contained reveal.js presentation (HTML export and the
// document shown when presenting), and each object's inline HTML, reused by
// the print and image exports.

import { registerCodeLangs } from '../../render/codelangs.js';
import { diagramHTML } from '../../render/diagrams.js';
import { pdfRuntime } from '../runtime/pdf.js';
import { tabRuntime } from '../runtime/tabs.js';
import { embedSandbox } from '../../features/document/sanitize.js';
import { scopedCSS, cleanClasses } from '../../features/design/devmode.js';
import { esc, jsData } from '../../core/text.js';
import { opacityOf } from '../../core/model.js';
import { wordartSize } from '../../render/textfit.js';
import { morphPlan, morphSig } from '../../features/animation/morph.js';
export { morphPlan, morphSig };                // (for tests and older callers)
import { state } from '../../core/store.js';
import { REVEAL, KATEX, MODEL_VIEWER, GIFUCT, PDFJS, VISION, SELFIE_MODEL, POSE_MODEL, FACE_MODEL, PANNELLUM } from '../../core/vendor.js';
import { download, slug } from '../files.js';
import { TRIGGER_JS, pollJS, liveDataJS, LIGHTBOX_JS, overviewJS } from '../runtime/scripts.js';
import { ACTIVITIES, publicActivity, gradeAnswer, gradeActivity, pollLabels } from '../../features/live/poll.js';
import { selfPacedRuntime } from '../runtime/selfpaced.js';
import { activityGame, GAME_WORDS } from '../runtime/games.js';
import { lockSHA256, lockNorm, lockRuntime, LOCK_CSS } from '../runtime/lock.js';
import { lockSVG, lockCodes, lockDigits } from '../../render/svg.js';
import { slideTitle } from '../../features/document/a11y.js';
import { blobMedia } from './blobmedia.js';
import { createMediaPlayer, revelaMediaRuntime, askInVideo } from '../runtime/media.js';
import { needsPlayer, mediaConfig, cameraSegment, cameraBoxCSS, cameraInnerHTML } from '../../features/live/media.js';
import { createCameraEngine, revelaCameraRuntime } from '../runtime/camera.js';
import { modelAttrsHTML, bleedBox, edgeCSS } from '../../features/content/model3d.js';
import { model3dRuntime } from '../runtime/model3d.js';
import { puppetBones, puppetMorph, puppetSolve, puppetMirror, createPuppet, revelaPuppetRuntime } from '../runtime/puppet.js';
import { timerRuntime } from '../runtime/timer.js';
import { screenFitRuntime } from '../runtime/screenfit.js';
import { fitMode, fitSize, adaptLayout } from '../../features/design/screenfit.js';
import { soundRuntime } from '../runtime/sounds.js';
import { safeURL } from '../../features/document/sanitize.js';
import { canvasRuntimeDeps } from '../runtime/canvas.js';
import { canvasOn, frameOf } from '../../features/design/canvasmode.js';
import { shadowCSS, borderCSS, levelCSS, textPadding, webCardHTML, mathTeX, mathCSS, shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, chartTableHTML, connectorSVG, connectorPath, iconSVG, wordartCSS, tableRowsHTML, inkSVG, timerSVG, curvedTextSVG, deviceCSS, shapeTextHTML, hasShapeText, wrapFor, wrapAttrs, wrapVars, WRAP_CSS, tableClass, tableVars, tableCSS, fileIconHTML, imgFocus } from '../../render/svg.js';
import { googleFontLinks } from '../../features/design/fonts.js';
import { t, speechLang, currentLang } from '../../i18n/index.js';
import { sizeText } from '../../features/content/files.js';
import { collectFigures, figuresMap, captionLine, figIndexTitle, slidePaths } from '../../features/document/captions.js';
import { INK_CSS, inkJS } from '../runtime/ink.js';
import { READING_CSS, readingJS } from '../runtime/reading.js';
import { deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { fxVars, fxPresentationCSS, fxParagraphCSS, isFx, FX } from '../../features/animation/fxcatalog.js';
const FX_REV = e => !!FX[e]?.reverse;
import { animTimeline, animEntries, EFFECT_KF, EFFECT_KF_CSS, EMPHASIS_FX, SIZE_FX, animScale, isEntrance, MEDIA_FX, customTransitionCSS, transitionName, isShapeTransition, pathKeyframesCSS, pathTurns, animsOf, animKey, offsetBefore } from '../../features/animation/transitions.js';
import { masterBlocksFor, isEmptyPlaceholder, styled, levelVars, layoutOf } from '../../features/document/master.js';
import { magOverlaySVG, magFrameSVG, magViewCSS, magInsetCSS, magOrigin, underArea, viewOf, MAG_SKIP } from '../../features/document/magnify.js';
import { watermarkPage } from '../../features/document/watermark.js';


const tf = b => `rotate(${b.rotation || 0}deg)${b.flipH ? ' scaleX(-1)' : ''}${b.flipV ? ' scaleY(-1)' : ''}`;
// Animated blocks use the individual rotate/scale properties so that the
// `transform` of reveal's fragment effects (fade-up, motion paths…) and of the
// keyframes composes with the block's own rotation instead of replacing it.
const tfCSS = b => b.animation
  ? `${b.rotation ? `rotate:${b.rotation}deg;` : ''}${b.flipH || b.flipV ? `scale:${b.flipH ? -1 : 1} ${b.flipV ? -1 : 1};` : ''}`
  : `transform:${tf(b)};`;
const box = b => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;`
  + `height:${b.h}px;${tfCSS(b)}`
  + (opacityOf(b) < 1 ? `opacity:${+opacityOf(b).toFixed(3)};` : '')
  + (b.shadow ? `filter:${shadowCSS(b)};` : '')
  + animVars(b);
// Timing (and motion path) of one of an object's animations (its first by
// default), also for its caption and for the layers of the next ones.
const cssKey = key => String(key).replace(/[^\w-]/g, '_');
const animVars = (b, a = b.animation, key = b.id) => (a ? `transition-duration:${a.duration ?? 500}ms;transition-delay:${a.delay ?? 0}ms;`
    + `--anim-dur:${a.duration ?? 500}ms;--anim-del:${a.delay ?? 0}ms;` + (SIZE_FX.includes(a.effect) ? `--anim-scale:${animScale(a)};` : '')
    + (a.effect === 'path' ? `--dx:${a.dx || 0}px;--dy:${a.dy || 0}px;--pk:rvP${cssKey(key)};` : '') + fxVars(a) : '');

// Custom entrance effects that reveal.js doesn't provide (used only if present).
const CUSTOM_KF = {
  spin: ['rvSpin', '@keyframes rvSpin{from{opacity:0;transform:rotate(-200deg) scale(.6)}to{opacity:1;transform:none}}'],
  flip: ['rvFlip', '@keyframes rvFlip{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:none}}'],
  bounce: ['rvBounce', '@keyframes rvBounce{0%{opacity:0;transform:translateY(-60px)}60%{opacity:1;transform:translateY(12px)}80%{transform:translateY(-6px)}100%{transform:none}}'],
};
// One keyframe set per object with a motion path (curves are sampled).
// (a 3D model turns to face its way instead; the next animations turn their layer, not the object).
const pathKeyframes = deck => deck.slides.flatMap(s => s.blocks.flatMap(b => animsOf(b).map((a, i) => [b, a, i]))).filter(([, a]) => a.effect === 'path')
  .map(([b, a, i]) => pathKeyframesCSS('rvP' + cssKey(animKey(b, i)), a, i ? 0 : b.rotation || 0, b.type !== 'model')).join('\n');
const ownTransition = s => s.transition && transitionName(s.transition, s.transitionDir);
const usedTransitions = deck => new Set([deck.defaultTransition, ...deck.slides.flatMap(s => [ownTransition(s), s.transitionOut])].filter(Boolean));
// Emphasis that hides nothing (pulse, teeter, jump, color-pulse): seen before its click, played on it.
function emphasisCSS(deck) {
  const used = new Set(deck.slides.flatMap(s => s.blocks.flatMap(b => animsOf(b).map(a => a.effect))).filter(e => EMPHASIS_FX.includes(e)));
  if (!used.size) return '';
  const kf = EFFECT_KF_CSS.split('\n').filter(l => [...used].some(e => l.startsWith(`@keyframes ${EFFECT_KF[e]}{`)));
  return [...used].map(e => `.reveal .slides section .fragment.${e}{opacity:1;visibility:inherit} .reveal .slides section .fragment.${e}.visible{animation:${EFFECT_KF[e]} var(--anim-dur,600ms) ease-in-out var(--anim-del,0ms) both}`).join(' ') + ' ' + kf.join(' ');
}
// PowerPoint's other effects (fxcatalog.js): the ones used, and an emphasis on some paragraphs of a text only.
function fxCSS(deck) {
  const used = new Set(), paras = [];
  deck.slides.forEach(s => s.blocks.forEach(b => animsOf(b).forEach((a, i) => {
    if (!isFx(a.effect)) return; used.add(a.effect);
    if (Array.isArray(a.paras) && a.paras.length) paras.push(fxParagraphCSS(a.effect, cssKey(animKey(b, i)), a.paras));
  })));
  return [fxPresentationCSS(used), ...paras].filter(Boolean).join('\n');
}
function customEffectCSS(deck) {
  const used = new Set();
  deck.slides.forEach(s => s.blocks.forEach(b => animsOf(b).forEach(a => { if (CUSTOM_KF[a.effect]) used.add(a.effect); })));
  if (!used.size) return '';
  return [...used].map(e => `.reveal .fragment.${e}{opacity:0} .reveal .fragment.${e}.visible{opacity:1;animation:${CUSTOM_KF[e][0]} var(--anim-dur,600ms) ease var(--anim-del,0ms) both}`
    + CUSTOM_KF[e][1]).join('\n');
}

export { esc };

// Objects that are links: a click (or Enter) goes to the slide or opens the page.
// The bar of a PDF when presenting: shown while the pointer is over it (always on touch screens).
const PDF_CSS = `.rv-pdf-bar{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:2px;align-items:center;padding:3px 6px;border-radius:20px;`
  + `background:rgba(20,24,30,.8);color:#fff;font:16px/1 system-ui,sans-serif;opacity:0;transition:opacity .2s;z-index:3;white-space:nowrap}`
  + `[data-pdf]:hover .rv-pdf-bar,[data-pdf]:focus-within .rv-pdf-bar{opacity:1} @media (hover:none){.rv-pdf-bar{opacity:.85}}`
  + `.rv-pdf-bar button{background:none;border:0;color:#fff;font:inherit;padding:6px 9px;cursor:pointer;border-radius:14px;margin:0}.rv-pdf-bar button:hover{background:rgba(255,255,255,.2)}`
  + `.rv-pdf-bar span{min-width:52px;text-align:center;font-size:14px}`;
// Attached files: a click downloads the file (a PDF's page opens it in a new
// tab); the PDF viewer loads it in its frame. From their data, as blobs.
const FILE_JS = `(function(){function blob(el){var s=el.getAttribute('data-src'),i=s.indexOf(','),m=s.slice(5,i).split(';')[0],b=atob(s.slice(i+1)),a=new Uint8Array(b.length);
for(var k=0;k<b.length;k++)a[k]=b.charCodeAt(k);return URL.createObjectURL(new Blob([a],{type:m}));}
function act(el){var u=blob(el);if(el.hasAttribute('data-open')){window.open(u,'_blank','noopener');}else{var a=document.createElement('a');a.href=u;a.download=el.getAttribute('data-name')||'';document.body.appendChild(a);a.click();a.remove();}}
document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('[data-file]');if(el){e.stopPropagation();act(el);}},true);
document.addEventListener('keydown',function(e){var el=e.target.closest&&e.target.closest('[data-file]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();act(el);}});
document.querySelectorAll('[data-file-view]').forEach(function(el){el.querySelector('iframe').src=blob(el)+'#view=FitH';});})();`;
// Objects moved by hand while presenting (b.dragLive: ClassPoint's draggable objects — sort, place, match on the board).
const DRAG_JS = `(function(){var cur=null,sx=0,sy=0,ox=0,oy=0,k=1,moved=false;
document.addEventListener('pointerdown',function(e){var el=e.target.closest&&e.target.closest('.slides section.present [data-drag]');if(!el||e.button>0)return;
 e.preventDefault();e.stopPropagation();cur=el;moved=false;k=Reveal.getScale()||1;sx=e.clientX;sy=e.clientY;ox=parseFloat(el.style.left)||0;oy=parseFloat(el.style.top)||0;el.style.zIndex=50;el.style.cursor='grabbing';},true);
document.addEventListener('pointermove',function(e){if(!cur)return;e.preventDefault();moved=true;cur.style.left=(ox+(e.clientX-sx)/k)+'px';cur.style.top=(oy+(e.clientY-sy)/k)+'px';},true);
document.addEventListener('pointerup',function(){if(cur)cur.style.cursor='';cur=null;},true);
document.addEventListener('click',function(e){if(moved&&e.target.closest&&e.target.closest('[data-drag]')){e.stopPropagation();e.preventDefault();moved=false;}},true);})();`;
// 360° photos: Pannellum, loaded the first time a slide with one is shown; each one started when its slide is.
const PANO_JS = `(function(){var lib=null;function load(){if(lib)return lib;var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(PANNELLUM + '.css')};document.head.appendChild(l);
lib=new Promise(function(ok,ko){var s=document.createElement('script');s.src=${JSON.stringify(PANNELLUM + '.js')};s.onload=ok;s.onerror=ko;document.head.appendChild(s);});return lib;}
function show(sec){if(!sec)return;[].slice.call(sec.querySelectorAll('[data-pano]:not([data-on])')).forEach(function(el){el.setAttribute('data-on','');
 load().then(function(){window.pannellum.viewer(el,{type:'equirectangular',panorama:el.getAttribute('data-pano'),autoLoad:true,showFullscreenCtrl:false,keyboardZoom:false,disableKeyboardCtrl:true,compass:false});}).catch(function(){});});}
Reveal.on('ready',function(e){show(e.currentSlide);});Reveal.on('slidechanged',function(e){show(e.currentSlide);});if(Reveal.isReady())show(Reveal.getCurrentSlide());})();`;
const LINK_JS = `(function(){var hist=[],cur=null;
function seen(){var c=Reveal.getCurrentSlide();if(cur&&cur!==c&&!back){hist.push(cur);if(hist.length>50)hist.shift();}back=false;cur=c;}var back=false;
Reveal.on('ready',seen);Reveal.on('slidechanged',seen);if(Reveal.isReady())seen();
function esc(x){return String(x).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var pop=null,from=null;function shut(){if(!pop)return;pop.remove();pop=null;if(from&&from.focus)from.focus();from=null;}
function popup(el){var d;try{d=JSON.parse(el.getAttribute('data-popup'));}catch(e){return;}shut();from=el;
pop=document.createElement('div');pop.className='rv-pop';pop.innerHTML='<div class="rv-pop-box" role="dialog" aria-modal="true"'+(d.title?' aria-label="'+esc(d.title)+'"':'')+'><button type="button" class="rv-pop-x" aria-label="✕">✕</button>'+(d.title?'<h2>'+esc(d.title)+'</h2>':'')+String(d.text||'').split(/\\n{2,}/).map(function(p){return '<p>'+esc(p).replace(/\\n/g,'<br>')+'</p>';}).join('')+'</div>';
pop.addEventListener('click',function(e){e.stopPropagation();if(e.target===pop||e.target.closest('.rv-pop-x'))shut();});(document.querySelector('.reveal')||document.body).appendChild(pop);pop.querySelector('.rv-pop-x').focus();}
function go(el){if(el.hasAttribute('data-popup')){popup(el);return;}var g=el.getAttribute('data-goto'),h=el.getAttribute('data-href');
if(h){window.open(h,'_blank','noopener');return;}
var s=Reveal.getSlides(),i=s.indexOf(Reveal.getCurrentSlide()),t=null;
if(g==='next')t=s[i+1];else if(g==='prev')t=s[i-1];else if(g==='first')t=s[0];else if(g==='last')t=s[s.length-1];
else if(g==='back'){t=hist.pop()||null;back=!!t;}
else if(g&&g.indexOf('slide:')===0){var id=g.slice(6);for(var k=0;k<s.length;k++)if(s[k].getAttribute('data-rv-id')===id)t=s[k];}
if(t){var x=Reveal.getIndices(t);Reveal.slide(x.h,x.v,0);}}
var tip=null;function hide(){if(tip){tip.remove();tip=null;}}
function show(el){hide();tip=document.createElement('div');tip.className='rv-tip';tip.setAttribute('role','tooltip');tip.textContent=el.getAttribute('data-tip');document.body.appendChild(tip);
var r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,x=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2)),y=r.top-h-10<8?r.bottom+10:r.top-h-10;tip.style.left=x+'px';tip.style.top=y+'px';}
document.addEventListener('mouseover',function(e){var el=e.target.closest&&e.target.closest('.slides [data-tip]');if(el)show(el);else hide();});
document.addEventListener('focusin',function(e){var el=e.target.closest&&e.target.closest('.slides [data-tip]');if(el)show(el);else hide();});
Reveal.on('slidechanged',function(){hide();shut();});
document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.slides [data-goto],.slides [data-href],.slides [data-popup]');
if(el){e.preventDefault();e.stopPropagation();hide();go(el);return;}
var t=e.target.closest&&e.target.closest('.slides [data-tip]');if(t&&matchMedia('(hover: none)').matches){e.stopPropagation();tip?hide():show(t);}},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pop){e.preventDefault();e.stopImmediatePropagation();shut();return;}
if(e.key==='Enter'&&document.activeElement&&document.activeElement.matches&&document.activeElement.matches('[data-goto],[data-href],[data-popup]')){e.preventDefault();go(document.activeElement);}},true);})();`;

// Background sound over several slides: it plays while the current slide is in
// its range and stops (back to the start) outside it; its button pauses and resumes it.
const BGM_JS = `(function(){var list=[].slice.call(document.querySelectorAll('audio[data-bgm]'));
function au(id){return document.querySelector('audio[data-bgm="'+id+'"]');}
function btns(){document.querySelectorAll('[data-bgm-btn]').forEach(function(b){var a=au(b.getAttribute('data-bgm-btn'));b.textContent=a&&!a.paused?'\u{1F50A}':'\u{1F508}';});}
function upd(){var i=Reveal.getSlides().indexOf(Reveal.getCurrentSlide());list.forEach(function(a){var on=i>=+a.getAttribute('data-from')&&i<=+a.getAttribute('data-to');
if(on){if(a.paused&&!a.ended&&!a.hasAttribute('data-off'))a.play().catch(function(){});}else{a.pause();a.currentTime=0;a.removeAttribute('data-off');}});btns();}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-bgm-btn]');if(!b)return;e.stopPropagation();var a=au(b.getAttribute('data-bgm-btn'));if(!a)return;
if(a.paused){a.removeAttribute('data-off');a.play().catch(function(){});}else{a.pause();a.setAttribute('data-off','');}},true);
list.forEach(function(a){a.addEventListener('play',btns);a.addEventListener('pause',btns);});
Reveal.on('ready',upd);Reveal.on('slidechanged',upd);if(Reveal.isReady())upd();})();`;

// Slides whose first animation starts by itself: on arriving (forwards), their first step plays.
const START_JS = `(function(){function go(){var s=Reveal.getCurrentSlide(),f=Reveal.getIndices().f;
if(s&&s.hasAttribute('data-rv-start')&&(f===undefined||f<0))setTimeout(function(){if(Reveal.getCurrentSlide()===s)Reveal.nextFragment();},60);}
Reveal.on('slidechanged',go);Reveal.on('ready',go);if(Reveal.isReady())go();})();`;

// A PDF's "page and zoom" step: the page, the point of it in the middle (0-1) and how much it is enlarged.
const pdfStep = a => ({ page: Math.max(1, Math.round(+a.page || 1)), x: +(+(a.zx ?? 0.5)).toFixed(4), y: +(+(a.zy ?? 0.5)).toFixed(4), s: Math.min(8, Math.max(1, +a.zs || 1)) });
function animAttrs(b, slide, a = b.animation, key = b.id) {
  // An object that triggers animations of others gets an id to be clicked.
  const src = slide && slide.blocks.some(x => animsOf(x).some(y => y.trigger === b.id)) ? ` data-bid="${b.id}"` : '';
  if (!a) return src;
  const { effect, order, trigger, duration, delay } = a;
  const clip = (effect === 'clip3d' ? ` data-clip="${esc(a.clip || '*')}"${a.once ? ' data-clip-once' : ''}` : '')
    + (effect === 'pdfview' ? ` data-pdfgo="${esc(JSON.stringify(pdfStep(a)))}"` : '')
    + (MEDIA_FX.includes(effect) ? ` data-mfx="${effect}"` : '')
    + (a.sound ? ` data-sound="${esc(a.sound)}"${a.sound === 'custom' && a.soundSrc && /^(data:audio\/|blob:)/.test(a.soundSrc) ? ` data-sound-src="${esc(a.soundSrc)}"` : ''}` : '');
  if (trigger && slide?.blocks.some(x => x.id === trigger))       // played on click of another object
    return src + ` class="rv-trig${isEntrance(effect) ? ' rv-in' : ''}${isFx(effect) ? ' ' + effect : ''}"${FX_REV(effect) ? ' data-rev' : ''} data-trig="${trigger}" data-kf="${effect === 'path' ? 'rvP' + cssKey(key) : effect === 'pdfview' || MEDIA_FX.includes(effect) ? 'none' : EFFECT_KF[effect] || 'rvIn'}"`
      + ` data-dur="${duration ?? 500}" data-del="${delay ?? 0}"` + clip;
  const cls = effect === 'path' ? ((a.pathShape && a.pathShape !== 'line') || (pathTurns(a) && b.type !== 'model') ? 'rv-pathc' : 'rv-path') : effect;
  // (An emphasis on some paragraphs only: its rule finds them by this key — fxParagraphCSS.)
  const fxp = isFx(effect) && Array.isArray(a.paras) && a.paras.length ? ` data-fxp="${cssKey(key)}"` : '';
  return src + ` class="fragment ${cls}" data-fragment-index="${order}"` + fxp + clip;
}
// An object's next animations: each one a layer around it (the last one
// outermost), so they add up — it goes somewhere, then from there somewhere
// else, turns about where it is by then, plays a 3D clip…
function stepLayers(html, b, slide, tl) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  (b.anims || []).forEach((a0, n) => {
    const i = n + 1, key = animKey(b, i), at = tl.get(key), a = at ? { ...a0, delay: at.delay } : a0, [ox, oy] = offsetBefore(b, i);
    const attrs = animAttrs(b, slide, a, key).replace(/ data-bid="[^"]*"/, '').replace('class="', 'class="rv-step ');
    html = `<div${attrs} style="position:absolute;left:0;top:0;width:0;height:0;overflow:visible;transform-origin:${Math.round(cx + ox)}px ${Math.round(cy + oy)}px;${animVars(b, a, key)}">${html}</div>`;
  });
  return html;
}

// Accessibility of each object in the presentation: its alt text as the
// accessible name, or hidden from screen readers when marked decorative.
// What a slide shows: the master's objects (unless hidden) under its own, and
// no empty placeholders.
// (In canvas mode the canvas's picture is one layer that moves with the camera, not a copy per slide.)
export const blocksOf = (s, deck = state.deck) => [...masterBlocksFor(s, deck), ...s.blocks.map(b => styled(b, s, deck))].filter(b => !b.hidden && !isEmptyPlaceholder(b) && !(b.backdrop && canvasOn(deck)));

// A 3D model's picture, shown while it loads and wherever it can't be drawn live
// (the overview, slides saved as images). A library thumbnail (assets/…) as a full address.
function posterAttr(b) {
  const p = String(b.poster || '');
  if (!/^(data:image\/|https?:)/i.test(p) && (/^[a-z][a-z0-9+.-]*:/i.test(p) || !p)) return '';
  let u = p; if (!/^(data|https?):/i.test(p)) try { u = new URL(p, document.baseURI).href; } catch { return ''; }
  return safeURL(u) ? ` data-poster="${esc(u)}"` : '';
}
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
export function blockHTML(b, slide) {
  const html = blockHTMLRaw(b, slide), cls = b.cls && cleanClasses(b.cls);            // (its classes, for the deck's CSS: developer mode)
  return mergeClasses(cls ? html.replace(/^<([a-z][\w-]*)/i, `<$1 class="${cls}"`) : html);
}

// Morph by words or characters: every word (or letter) becomes an inline box
// whose data-id is the word itself and its occurrence on the slide ("de" #1,
// "de" #2…), so reveal.js moves each one to where the same word is on the next
// slide; unmatched ones fade. Letters keep their word together when wrapping.
// counts: per slide, shared by all its text boxes.
export function morphText(html, by, counts) {
  if (!html || /\$/.test(html)) return html;           // inline math is typeset from the raw text
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const id = key => { const n = (counts[key] = (counts[key] || 0) + 1); return `${by === 'chars' ? 'c' : 'w'}:${encodeURIComponent(key)}:${n}`; };
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 1) { if (!/^(CODE|PRE|SCRIPT|STYLE)$/.test(child.tagName)) walk(child); continue; }
      if (child.nodeType !== 3 || !child.textContent.trim()) continue;
      const frag = document.createDocumentFragment();
      for (const part of child.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
        if (by === 'chars') {
          const word = document.createElement('span'); word.style.whiteSpace = 'nowrap';
          for (const ch of part) { const s = document.createElement('span'); s.className = 'rv-m'; s.dataset.id = id(ch.toLowerCase() === ch ? ch : ch); s.textContent = ch; word.appendChild(s); }
          frag.appendChild(word);
        } else { const s = document.createElement('span'); s.className = 'rv-m'; s.dataset.id = id(part); s.textContent = part; frag.appendChild(s); }
      }
      child.replaceWith(frag);
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}
// An object that is a link (PowerPoint's "Link" / action settings): to a web
// page, or to a slide — next, previous, first, last, back to the one before (a menu, a branching path, an escape
// room) or one of them (by its id) —, or that opens a window with information (b.popup: { title, text }). And words
// shown on hovering or touching it (b.tip), as Genially's interactive elements.
const GOTO = new Set(['next', 'prev', 'first', 'last', 'back']);
const linkAttrs = b => (b.type === 'text' || b.type === 'connector' || b.type === 'lock' ? '' : (b.href && safeURL(b.href) && /^(https?|mailto):/i.test(b.href) ? ` data-href="${esc(b.href)}"` : '')
  + (b.goto ? ` data-goto="${esc(GOTO.has(b.goto) ? b.goto : 'slide:' + b.goto)}"` : '')
  + (b.popup && (b.popup.title || b.popup.text) ? ` data-popup="${esc(JSON.stringify({ title: String(b.popup.title || '').slice(0, 200), text: String(b.popup.text || '').slice(0, 4000) }))}"` : '')
  + (b.tip ? ` data-tip="${esc(String(b.tip).slice(0, 300))}"` : '')
  + (b.href || b.goto || b.popup ? ` role="${b.popup ? 'button' : 'link'}" tabindex="0"` : b.tip ? ' tabindex="0"' : ''));
// A code lock's settings for the page (io/runtime/lock.js): never its codes, a salted SHA-256 of each — the page's
// source doesn't give the answer away. Where it leads when opened: the next slide or one of them (by its id).
function lockAttrs(b) {
  const salt = String(b.salt || b.id), str = (v, n) => String(v ?? '').slice(0, n);
  const to = b.openTo === 'next' ? 'next' : b.openTo ? 'slide:' + b.openTo : '';
  const cfg = { s: salt, h: [...new Set(lockCodes(b).map(c => lockSHA256(salt + ':' + lockNorm(c))))], n: lockDigits(b), hint: str(b.hint, 500),
    fail: str(b.fail, 200), ok: str(b.okText, 200), tries: Math.max(0, Math.min(99, Math.round(+b.tries || 0))), to };
  return ` data-lock="${esc(JSON.stringify(cfg))}" data-lock-id="${esc(b.id)}"${b.gate ? ' data-gate' : ''} role="button" tabindex="0" aria-label="${esc(t('Candado') + (b.hint ? ': ' + str(b.hint, 300) : ''))}"`;
}
// «Start when another ends», if that can happen: the other one is still on the slide, it ends (it doesn't loop
// without segments) and it doesn't wait — itself, or along a chain — for this one. Else it's a click, as before.
function waitsFor(b, slide) {
  const seen = new Set([b.id]);
  for (let id = b.afterVideo; id; ) {
    const o = slide?.blocks.find(x => x.id === id);
    if (!o || seen.has(id) || (o.loop && !o.segments?.length)) return false;
    if (o.autoplay || !o.afterVideo) return true;
    seen.add(id); id = o.afterVideo;
  }
  return false;
}
function blockHTMLRaw(b, slide) {
  // When the slide uses Auto‑Animate, a stable data-id lets reveal.js match and
  // morph the same object between consecutive slides (PowerPoint's "Morph").
  // Morph: the object matches its twin on the next slide by id — except text
  // morphing by words/characters, where the words themselves match (morphText).
  const byText = !!b.byText;
  const a = animAttrs(b, slide) + (b.morphId && !byText ? ` data-id="${esc(b.morphId)}"` : '') + ariaAttrs(b) + linkAttrs(b) + (b.dragLive && !b.locked ? ' data-drag data-prevent-swipe' : '');
  if (b.type === 'connector') {
    const { w, h } = state.deck.size;
    const from = slide && slide.blocks.find(x => x.id === b.from);
    const to = slide && slide.blocks.find(x => x.id === b.to);
    return `<div${a} style="${box(b)}pointer-events:none">${connectorSVG(b, from, to, w, h)}</div>`;
  }
  if (b.type === 'magnify') return magnifyHTML(b, slide, a);
  if (b.type === 'text') {
    const wr = wrapFor(b, slide);
    const tabbed = !b.curve && /\t/.test(b.html || '');         // (tab stops laid out by tabRuntime)
    // Morph of plain text (no box of its own): what travels is the text itself —
    // a box as tight as the words — so it glides and grows evenly from where it
    // was, whatever the alignment in its frame (the frame would stretch it, and a
    // change of alignment would make it jump).
    const tight = b.morphId && !byText && !b.bg && !b.borderColor && !b.curve && !(b.columns > 1) && !b.vertical && !tabbed;
    const ta = { center: 'center', right: 'flex-end', justify: 'stretch' }[b.textAlign] || 'flex-start';
    // (Text Art goes on the moving text, not on the still frame: painted on the frame, clipped to the
    // letters, it would show at once where the text ends up while the text itself glides there unseen.)
    const art = b.wordart ? wordartCSS(b.wordart, b.wordartColor) : '';
    const inner = html => (tight ? `<div class="rv-mt" data-id="${esc(b.morphId)}" style="display:inline-block;max-width:100%;vertical-align:top;${b.vAlign ? `align-self:${ta};` : ''}${art}">${html}</div>` : html);
    return `<div${tight ? a.replace(/ data-id="[^"]*"/, '') : a}${b.levels ? ' class="lv"' : ''}${wrapAttrs(wr)}${tabbed ? ` data-tabs="${esc(JSON.stringify(b.tabs || []))}"` : ''} style="${box(b)}${wrapVars(wr)}${tabbed ? 'white-space:pre-wrap;tab-size:96px;' : ''}font-size:${wordartSize(b)}px;${b.color ? `color:${b.color};` : ''}${b.levels ? levelVars(b) : ''}`
      + `text-align:${b.textAlign || 'left'};${b.fontFamily ? `font-family:${b.fontFamily};` : ''}`
      + `${b.lineHeight ? `line-height:${b.lineHeight};` : ''}${b.noWrap ? 'white-space:nowrap;' : ''}`
      + `${b.letterSpacing ? `letter-spacing:${b.letterSpacing}px;` : ''}`
      + `padding:${textPadding(b)};`
      + `${b.dir === 'rtl' ? 'direction:rtl;' : ''}`
      + `${b.vertical ? 'writing-mode:vertical-rl;' : ''}`
      + `${b.bullet ? `--bullet:${b.bullet};` : ''}`
      + `${b.numStyle ? `--num:${b.numStyle};` : ''}`
      + `${b.bg ? `background:${b.bg};` : ''}${b.borderColor ? `border:${borderCSS(b.borderColor, b.borderDash)};` : ''}`
      + `${b.radius ? `border-radius:${b.radius}px;` : ''}box-sizing:border-box;`
      + `${b.vAlign ? `align-content:${{ top: 'start', middle: 'center', bottom: 'end' }[b.vAlign]};` : ''}`   // (on the block itself: bold words stay in their line)
      + `${b.fontWeight ? `font-weight:${b.fontWeight};` : ''}${b.fontStyle ? `font-style:${b.fontStyle};` : ''}`
      + `${b.columns > 1 ? `column-count:${b.columns};column-gap:32px;` : ''}`
      + `${tight ? '' : art}">`
      + `${b.curve ? curvedTextSVG(b) : inner(b.html || '')}</div>`;
  }
  if (b.type === 'model')
    return `<model-viewer${a}${modelAttrsHTML(b)}${posterAttr(b)} style="${box(bleedBox(b))}background:transparent;${edgeCSS(b)}${bleedBox(b) !== b ? 'pointer-events:none' : ''}"></model-viewer>`;
  // Video / GIF with segments, autoplay, loop, mute or a colour key: the media
  // player draws it; each segment after the first automatic one is a click.
  if (needsPlayer(b)) {
    const cfg = mediaConfig(b);
    if (cfg.after && !waitsFor(b, slide)) delete cfg.after;
    // (It starts by itself, or when the other one ends: its first segment is that, not a click.)
    const first = cfg.autoplay || cfg.after ? 1 : 0;
    // No segments, not automatic and no steps of its own: one click plays it all (data-seg -1).
    const segs = cfg.segments.length ? cfg.segments.slice(first).map((_, k) => k + first) : cfg.autoplay || cfg.after || cfg.steps ? [] : [-1];
    const clicks = segs.map((n, k) => `<span class="fragment rv-seg" data-seg-of="rvm-${b.id}" data-seg="${n}"${b.animation && !b.animation.trigger ? ` data-fragment-index="${b.animation.order + k + 1}"` : ''} style="display:none"></span>`).join('');
    return `<div${a} id="rvm-${b.id}" data-media="${esc(JSON.stringify(cfg))}" style="${box(b)}${b.type === 'image' ? `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)};${deviceCSS(b)}` : ''}"></div>${clicks}`;
  }
  // A 360° photo: walked through by dragging, while presenting (PANO_JS); its flat picture until it loads.
  if (b.type === 'image' && b.pano && b.src)
    return `<div${a} data-pano="${esc(b.src)}" data-prevent-swipe role="img" aria-label="${esc(b.alt || '')}" style="${box(b)}overflow:hidden;background:#000 url('${esc(b.src)}') center/cover"></div>`;
  if (b.type === 'image')
    return `<img${a} src="${esc(b.src || '')}"${b.zoomable ? ' data-lightbox' : ''} alt="${b.decorative ? '' : esc(b.alt || '')}" style="${box(b)}object-fit:${b.fit || 'contain'};${b.fit === 'cover' && (b.focusX != null || b.focusY != null) ? `object-position:${imgFocus(b)};` : ''}`
      + `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)};${deviceCSS(b)}">`;
  if (b.type === 'video')
    return `<video${a} data-vid="${b.id}" src="${esc(b.src || '')}"${b.poster && /^(data:image\/|https:|blob:)/.test(b.poster) ? ` poster="${esc(b.poster)}"` : ''} controls preload="metadata" style="${box(b)}object-fit:contain"></video>`;
  if (b.type === 'poll')     // live poll: question, live results and the QR to vote
    return `<div${a} class="rv-poll" data-poll="${esc(JSON.stringify({ pollId: b.pollId, kind: b.kind, display: b.display, question: b.question, options: b.options, ...(b.kind === 'quiz' && { correct: b.correct || [0], time: b.time || 20, ...(b.mode && b.mode !== 'speed' && { mode: b.mode }) }), ...(ACTIVITIES.includes(b.kind) && { text: b.text, points: b.points, image: b.image }), ...(b.kind === 'wheel' && { time: b.time ?? 150 }),
      ...(b.kind === 'number' && { min: b.min, max: b.max, step: b.step, unit: b.unit, answer: b.answer }), ...(b.kind === 'image' && { images: b.images }), ...((b.kind === 'point' || b.kind === 'draw') && { image: b.image }), ...(b.kind === 'open' && b.rubric && { rubric: b.rubric }), ...(b.kind === 'qa' && b.moderate && { moderate: true }), ...(['qa', 'word', 'open'].includes(b.kind) && b.clean && { clean: true }) }))}" `
      + `style="${box(b)}display:grid;grid-template-columns:1fr auto;gap:1em;font-size:${b.fontSize || 32}px${/^#[0-9a-f]{3,8}$/i.test(b.color || '') ? ';color:' + b.color : ''}">`
      + `<div style="display:flex;flex-direction:column;min-width:0"><div style="font-weight:700;margin-bottom:.5em">${esc(b.question || '')}</div>`
      + `<div class="rv-poll-res" style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center"></div></div>`
      + `<div class="rv-poll-qr" style="text-align:center;font-size:18px;align-self:center"><canvas width="220" height="220" style="background:#fff;border-radius:8px"></canvas>`
      + `<div class="rv-poll-url" style="margin-top:6px;opacity:.8"></div><div>Código <b class="rv-poll-code" style="letter-spacing:3px">·····</b></div></div></div>`;
  if (b.type === 'camera')   // Cameo: filled with the presenter's camera when the slide is shown (io/runtime/camera.js)
    return `<div${a} data-camera-box${cameraSegment(b) ? ` data-bg="${cameraSegment(b)}"` : ''} style="${box(b)}${esc(cameraBoxCSS(b))}">${cameraInnerHTML(b)}</div>`;
  // Sound: on its slide (reveal.js plays it on arrival with data-autoplay) or, if
  // it keeps playing over the next slides, a speaker button here and the sound
  // itself outside the slides (below: bgmHTML), so changing slide doesn't stop it.
  if (b.type === 'audio') {
    if (b.until) return b.hideIcon ? '' : `<button${a} type="button" data-bgm-btn="${esc(b.id)}" style="${box(b)}background:none;border:0;cursor:pointer;font-size:${Math.round(Math.min(b.w, b.h) * 0.6)}px;line-height:1;padding:0">🔊</button>`;
    return `<audio${a} src="${esc(b.src || '')}" controls${b.autoplay ? ' data-autoplay' : ''}${b.loop ? ' loop' : ''} style="${box(b)}${b.hideIcon ? 'visibility:hidden;' : ''}"></audio>`;
  }
  if (b.type === 'embed' && b.display === 'card')
    return `<a${a} class="rv-webcard" href="${esc(b.src || '')}" target="_blank" rel="noopener" style="${box(b)}display:block;text-decoration:none">${webCardHTML(b, t('Abrir la web'))}</a>`;
  // (An HTML object — developer mode, ui/dialogs/devmode.js —: its own page in a sandbox with no origin: its scripts
  // run, but can't reach the presentation, its storage or the viewer's cookies.)
  if (b.type === 'embed' && b.srcdoc != null)
    return `<iframe${a} srcdoc="${esc(b.srcdoc)}" sandbox="allow-scripts allow-popups" style="${box(b)}border:0;background:${b.transparent ? 'transparent' : '#fff'}"${b.transparent ? ' allowtransparency="true"' : ''}></iframe>`;
  if (b.type === 'embed')
    return `<iframe${a} src=""${esc(b.src || '')}" referrerpolicy="strict-origin-when-cross-origin"${b.refreshMin ? ` data-refresh-min="${+b.refreshMin}"` : ''} `
      + `sandbox="${embedSandbox(b.src)}" `
      + `style="${box(b)}border:0;background:#fff"></iframe>`;
  if (b.type === 'shape')
    return `<div${a} style="${box(b)}">${shapeSVG(b)}${hasShapeText(b) && b.html ? shapeTextHTML(b) : ''}</div>`;
  if (b.type === 'chart')
    return `<div${a}${b.dataUrl ? ` class="rv-live-chart" data-chart="${esc(JSON.stringify({ ...b, data: undefined, series: undefined }))}"` : ''} role="figure" aria-label="${esc(chartCaption(b))}" style="${box(b)}">`
      + `${chartSVG(b).replace('<svg ', '<svg aria-hidden="true" ')}${chartTableHTML(b, chartCaption(b))}</div>`;
  if (b.type === 'icon')
    return `<div${a} style="${box(b)}">${iconSVG(b)}</div>`;
  if (b.type === 'ink')
    return `<div${a} style="${box(b)}">${inkSVG(b)}</div>`;
  if (b.type === 'timer')                          // counts down with io/runtime/timer.js
    return `<div${a} data-timer role="timer" data-secs="${Math.max(1, Math.round(+b.seconds || 300))}"${b.auto !== false ? ' data-auto' : ''}${b.sound !== false ? ' data-sound' : ''}`
      + ` data-end="${esc(b.endText ?? t('¡Tiempo!'))}" style="${box(b)}cursor:pointer">${timerSVG(b)}</div>`;
  if (b.type === 'lock') return `<div${a}${lockAttrs(b)} style="${box(b)}">${lockSVG(b)}</div>`;
  if (b.type === 'math')
    return `<div${a} class="math" data-latex="${esc(mathTeX(b))}" style="${box(b)}display:flex;align-items:center;${mathCSS(b)}"></div>`;
  if (b.type === 'diagram') {
    // "One by one": each item (its shapes and words) a click of its own, after the slide's other steps.
    let inner = diagramHTML(b, { accents: currentPalette(state.deck).accents, fg: deckFg(state.deck), back: slide?.background || currentPalette(state.deck).bg, step: !!b.oneByOne });
    if (b.oneByOne) {
      const base = b.animation && !b.animation.trigger ? b.animation.order : Math.max(0, ...(slide?.blocks || []).flatMap(x => animsOf(x)).map(x => +x.order || 0)) + 1;
      inner = inner.replace(/ data-dg="(-?\d+)"/g, (m, k) => (+k < 0 ? '' : ` class="fragment fade-in" data-fragment-index="${base + +k}"`));
    }
    return `<div${a} style="${box(b)}">${inner}</div>`;
  }
  if (b.type === 'file' && safeURL(b.src || '')) {                 // opened or downloaded by FILE_JS
    const src = ` data-src="${esc(b.src)}" data-name="${esc(b.name || 'archivo')}"`;
    if (b.display === 'viewer' && b.poster) return `<div${a} data-file-view${src} style="${box(b)}background:#fff url('${esc(b.poster)}') center/contain no-repeat"><iframe title="${esc(b.name || '')}" style="width:100%;height:100%;border:0;display:block"></iframe></div>`;
    // A PDF's page: leafed through and zoomed when presenting, and by its "page and zoom" steps (pdfRuntime).
    if (b.display === 'page' && b.poster && /^data:application\/pdf/.test(b.src))
      return `<div${a} data-pdf${src} data-page="${Math.max(1, +b.page || 1)}" role="document" aria-label="${esc(b.name || 'PDF')}" style="${box(b)}overflow:hidden;background:#fff url('${esc(b.poster)}') center/contain no-repeat"></div>`;
    const pdf = b.display === 'page' && b.poster, label = `${t(pdf ? 'Abrir' : 'Descargar')} ${b.name || ''}`;
    return `<div${a} data-file${pdf ? ' data-open' : ''}${src} role="button" tabindex="0" aria-label="${esc(label)}" title="${esc(label)}" style="${box(b)}cursor:pointer">`
      + (pdf ? `<img src="${esc(b.poster)}" alt="" style="width:100%;height:100%;object-fit:contain;display:block">` : fileIconHTML(b, sizeText(b.bytes || 0, currentLang()))) + `</div>`;
  }
  if (b.type === 'table')
    return `<div${a} style="${box(b)}"><table class="${tableClass(b)}" style="${tableVars(b)}">`
      + tableRowsHTML(b) + `</table></div>`;
  if (b.type === 'code') {
    // data-line-numbers drives reveal's animated line highlighting; a value like
    // "1|2-3|4" steps through line groups, empty just numbers the lines.
    const ln = b.lineSteps ? ` data-line-numbers="${esc(b.lineSteps)}"` : (b.showLines ? ' data-line-numbers=""' : '');
    const start = b.lineStart > 1 ? ` data-ln-start-from="${+b.lineStart}"` : '';
    // Morph between slides: the <pre> needs its own data-id for reveal's code animation.
    const morph = b.morphId ? ` data-id="code-${esc(b.morphId)}"` : '';
    return `<div${a} class="rv-code${b.scroll === false ? ' no-scroll' : ''}" style="${box(b)}"><pre${morph} style="margin:0;height:100%;width:100%;font-size:${b.fontSize || 22}px">`
      + `<code class="language-${b.lang || 'plaintext'}" data-trim${ln}${start}>${esc(b.code || '')}</code></pre></div>`;
  }
  return '';
}

// A magnifier: the lines and the area's frame over the slide, under its box;
// the box with the slide's objects under the area, enlarged; its frame. An
// entrance grows it out of the area.
function magnifyHTML(b, slide, a = '', deck = state.deck) {
  const { w: W, h: H } = deck.size, accent = currentPalette(deck).accents[0];
  return `<div${a} class="rv-mag" style="${box(b)}transform-origin:${magOrigin(b)}">`
    + `<div style="position:absolute;left:${-b.x}px;top:${-b.y}px;width:${W}px;height:${H}px;pointer-events:none">${magOverlaySVG(b, W, H, accent)}</div>`
    + magnifyInsetHTML(b, slide, deck)
    + `<div style="position:absolute;inset:0;pointer-events:none">${magFrameSVG(b, accent)}</div></div>`;
}
// What the box shows: a copy of the objects under the area (still: no
// animations, links or live parts), scaled. Web pages, polls, cameras, timers,
// sounds and slide zooms are left out; 3D models and videos show their picture.
const STILL = { animation: null, anims: null, morphId: null, href: null, goto: null, decorative: true, zoomable: false, dataUrl: null, refreshMin: null, oneByOne: false, lineSteps: null };
function magCloneHTML(o, slide, deck, chain) {
  if (MAG_SKIP.includes(o.type)) return '';
  // Another magnifier: its box as it is (what it enlarges, and its frame), enlarged in turn.
  if (o.type === 'magnify') return `<div style="${box({ ...o, ...STILL })}">${magnifyInsetHTML(o, slide, deck, chain)}<div style="position:absolute;inset:0;pointer-events:none">${magFrameSVG(o, currentPalette(deck).accents[0])}</div></div>`;
  const pic = src => (src && safeURL(src) ? `<img src="${esc(src)}" alt="" style="${box({ ...o, ...STILL })}object-fit:contain">` : '');
  if (o.type === 'model') return pic(o.poster);
  if (o.type === 'video') return pic(o.poster) || `<div style="${box({ ...o, ...STILL })}background:#000"></div>`;
  if (o.type === 'file' && o.display === 'viewer') return pic(o.poster);
  if (o.type === 'image' && needsPlayer(o))
    return `<img src="${esc(o.src || '')}" alt="" style="${box({ ...o, ...STILL })}object-fit:${o.fit || 'contain'};filter:${imgFilter(o)};opacity:${imgOpacity(o)};clip-path:${imgClip(o)};${deviceCSS(o)}">`;
  if (needsPlayer(o)) return '';
  return blockHTML({ ...o, ...STILL }, slide).replace(/ data-bid="[^"]*"/g, '');
}
export function magnifyInsetHTML(b, slide, deck = state.deck, chain = []) {
  const { w: W, h: H } = deck.size, ch = [...chain, b.id];
  const under = slide ? underArea(blocksOf(slide, deck), viewOf(b), ch) : [];
  return `<div class="rv-mag-in" style="${magInsetCSS(b)}"><div aria-hidden="true" style="${magViewCSS(b)};width:${W}px;height:${H}px;background:${slide ? stageBackground(slide) : 'transparent'}">`
    + `${slide ? bgLayer(slide) : ''}${under.map(o => magCloneHTML(o, slide, deck, ch)).join('')}</div></div>`;
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

// On a screen of another proportion (features/design/screenfit.js): what the
// bands show of the slide's background — its gradient (g) or picture (i)
// carried out to the screen's edges; a video or web page (m) stays boxed.
function fillAttrs(s, fit) {
  if (fit === 'bands') return '';
  if (s.bgVideo || s.bgIframe) return ' data-fill="m"';
  const bg = String(s.background || '');
  const kind = /url\(/i.test(bg) ? 'i' : /gradient\(/i.test(bg) ? 'g' : '';
  return kind ? ` data-fill="${kind}"` : '';             // (the background itself: the stage's, not a second copy)
}
// Adapting to the screen: each object says what it is and where (in slide
// pixels), for io/runtime/screenfit.js to lay it out again.
function fitAttrs(html, b) {
  const kind = b.type === 'connector' ? 'conn' : b.type === 'text' && !b.vertical ? 'text' : '';
  const at = ` data-fid="${esc(b.id)}" data-fb="${[b.x, b.y, b.w, b.h].map(v => +(+v || 0).toFixed(2)).join(',')}"`
    + (kind ? ` data-fx="${kind}"` : '') + (b.groupId ? ` data-fg="${esc(b.groupId)}"` : '')
    + (kind === 'conn' ? ` data-fc="${esc(`${b.from} ${b.to} ${b.route || ''}`)}"` : '');
  return html.replace(/^<([a-zA-Z][\w-]*)/, (m, tag) => `<${tag}${at}`);
}

// The master's own objects a slide shows (not its layout's), visible: the first of blocksOf.
const backOf = (s, deck) => { const lay = new Set((layoutOf(s, deck)?.blocks || []).map(b => b.id));
  return masterBlocksFor(s, deck).filter(b => !b.hidden && !isEmptyPlaceholder(b)).filter(b => !lay.has(b.id)); };
// The background kept still («Animar el fondo con la transición» off, the default — deck.animateBg —): between two
// slides that show the same background — its colour, gradient or picture and the master's objects (a pattern, a band
// of logos) —, only the content changes, as one expects of a template: a fade no longer dims the
// background half-way (two half-transparent copies of it), a push no longer carries it away, and Morph no longer fades
// the master's objects in again (they matched nothing, so reveal.js faded them in: a flash of whatever lay under them).
// Such slides get data-bgk (the background's number); one copy of each background waits in .rv-bd, under the slides,
// and BD_JS shows it — hiding the slides' own copies — while the slide left and the one coming share it. A slide whose
// background differs from both neighbours, or is a video or a web page, keeps it inside (it changes with its transition).
// (A layout's own objects — a line under the title of one layout only — stay with the content, above the still master:
// two layouts of one master share its background.)
// → { of: slide id → number, layers: [{ bg, html }] }.
export function backdropPlan(deck, fit = fitMode(deck)) {
  const out = { of: new Map(), layers: [] };
  if (deck.animateBg || canvasOn(deck) || fit === 'adapt') return out;
  const vis = deck.slides.filter(x => !x.hidden), known = new Map();
  const keyOf = s => {
    if (s.bgVideo || s.bgIframe) return null;
    const mb = backOf(s, deck);
    // (Master objects that move or play — an animation, a video, a camera, a poll — belong to each slide.)
    if (mb.some(b => animsOf(b).length || needsPlayer(b) || ['video', 'audio', 'camera', 'poll', 'embed', 'model', 'timer', 'lock'].includes(b.type))) return null;
    return `${stageBackground(s)}\n${bgLayer(s)}${mb.map(b => blockHTML(b, s)).join('')}`;
  };
  const keys = vis.map(keyOf);
  vis.forEach((s, i) => {
    const k = keys[i]; if (k == null || (k !== keys[i - 1] && k !== keys[i + 1])) return;
    if (!known.has(k)) { known.set(k, out.layers.length); out.layers.push({ bg: stageBackground(s), html: k.slice(k.indexOf('\n') + 1) }); }
    out.of.set(s.id, known.get(k));
  });
  return out;
}
// Which background shows (see backdropPlan): the slides' own while one with another background comes or goes, else the
// still copy. (Not when printing: every page has its own.) Also the exact duration of a PowerPoint transition
// (data-rv-dur, ms: the later slide's, on both the slide leaving and the one coming, so a fade crosses evenly).
// (Its first look waits for reveal.js to be ready, not for its 'ready' event: a page that can't write its address —
// shown from srcdoc — never sends it.)
const BD_JS = `(function(){var root=document.querySelector('.reveal');
function k(s){return s&&s.getAttribute('data-bgk');}
function printing(){try{return (Reveal.isPrintView&&Reveal.isPrintView())||/print-pdf/.test(location.search);}catch(e){return false;}}
function show(a,b){if(printing()||Reveal.isOverview()){root.removeAttribute('data-bd');return;}var kb=k(b);if(kb!=null&&(!a||k(a)===kb))root.setAttribute('data-bd',kb);else root.removeAttribute('data-bd');}
function dur(a,b){var all=Reveal.getSlides(),later=a&&all.indexOf(a)>all.indexOf(b)?a:b,d=later&&later.getAttribute('data-rv-dur');
[a,b].forEach(function(s){if(s)s.style.transitionDuration=d?d+'ms':'';});}
Reveal.on('ready',function(e){show(null,e.currentSlide);});
Reveal.on('slidechanged',function(e){dur(e.previousSlide,e.currentSlide);show(e.previousSlide,e.currentSlide);});
Reveal.on('overviewshown',function(){root.removeAttribute('data-bd');});Reveal.on('overviewhidden',function(){show(null,Reveal.getCurrentSlide());});
(function first(){if(Reveal.isReady())show(null,Reveal.getCurrentSlide());else setTimeout(first,50);})();})();`;
const backdropCSS = (bd, w, h) => (bd.layers.length ? `.reveal .slides>.rv-bd{position:absolute;left:0;top:0;width:${w}px;height:${h}px;z-index:0;pointer-events:none}
 .reveal .slides>.rv-bd>.rv-bd-k{display:none;position:absolute;left:0;top:0;margin:0}
 ${bd.layers.map((l, i) => `.reveal[data-bd="${i}"] .slides>.rv-bd>[data-k="${i}"]{display:block}`
    + ` .reveal[data-bd="${i}"] .slides section[data-bgk="${i}"]>.stage{background:transparent!important}`
    + ` .reveal[data-bd="${i}"] .slides section[data-bgk="${i}"]>.stage>.rv-bgl{opacity:0}`).join('\n ')}` : '');
const backdropHTML = bd => (bd.layers.length ? `<div class="rv-bd" aria-hidden="true">${bd.layers.map((l, i) =>
  `<div class="stage rv-bd-k" data-k="${i}" style="background:${l.bg}">${l.html.replace(/ data-id="[^"]*"/g, '')}</div>`).join('')}</div>` : '');

function slideHTML(s, deck, figMap, plan = morphPlan(deck), fit = fitMode(deck), bd = backdropPlan(deck, fit)) {
  // Entry/exit can differ (reveal's "x-in y-out"); speed can be set per slide.
  const tin = ownTransition(s) || deck.defaultTransition || 'slide';
  // As in PowerPoint, a transition belongs to the slide that comes in: the one before leaves with it too — a shape
  // reveal (wipe, circle…) keeping the rest of the screen, a fade crossing over evenly. (Before, only shape reveals: a
  // slide with no transition of its own vanished at once while the next one faded in over white — a flash on every
  // fade after a Morph slide, as imported from PowerPoint.) With Morph next, reveal.js's own way.
  const vis = deck.slides.filter(x => !x.hidden), next = vis[vis.indexOf(s) + 1];
  const nextIn = next && (ownTransition(next) || deck.defaultTransition);
  const tout = s.transitionOut || (isShapeTransition(nextIn) || (next?.transition && !next.autoAnimate) ? nextIn : null);
  const trans = tout && tout !== tin ? ` data-transition="${tin}-in ${tout}-out"`
    : s.transition || tout ? ` data-transition="${tin}"` : '';
  const speed = s.transitionSpeed ? ` data-transition-speed="${s.transitionSpeed}"` : '';
  // (An exact duration from PowerPoint, applied by BD_JS to this slide and the one it replaces.)
  const exact = +s.transitionDur > 0 && s.transition && !s.transitionSpeed ? ` data-rv-dur="${Math.round(Math.min(10000, +s.transitionDur))}"` : '';
  const auto = s.autoSlide ? ` data-autoslide="${s.autoSlide}"` : '';
  const solid = /^(#|rgb)/.test(s.background || '');
  // Media backgrounds (reveal.js): video, web page, plus the background's own transition.
  const bg = (solid ? ` data-background-color="${s.background}"` : '')
    + (s.bgVideo ? ` data-background-video="${esc(s.bgVideo)}"${s.bgVideoLoop !== false ? ' data-background-video-loop' : ''}${s.bgVideoMuted !== false ? ' data-background-video-muted' : ''}` : '')
    + (s.bgIframe ? ` data-background-iframe="${esc(s.bgIframe)}"${s.bgInteractive ? ' data-background-interactive' : ''}` : '')
    + (s.bgTransition ? ` data-background-transition="${s.bgTransition}"` : '')
    + (s.uncounted ? ' data-visibility="uncounted"' : '')
    + fillAttrs(s, fit);
  const tl = animTimeline(s);
  const morphCounts = {};
  // (Objects a code lock shows once it is opened: hidden until then — io/runtime/lock.js.)
  const lockHides = new Map(s.blocks.filter(x => x.type === 'lock').flatMap(l => (Array.isArray(l.reveal) ? l.reveal : []).map(id => [id, l.id])));
  // The master's objects, then the layout's, come first (blocksOf): with a still background (backdropPlan) the master's
  // go, with the slide's background, in a layer of their own (.rv-bgl) that hides while the still copy shows.
  const bk = bd.of.get(s.id), nMaster = masterBlocksFor(s, deck).filter(b => !b.hidden && !isEmptyPlaceholder(b) && !(b.backdrop && canvasOn(deck))).length;
  const nBack = bk != null ? backOf(s, deck).length : 0;
  const parts = blocksOf(s, deck).map((b00, bi) => {
    // (With Morph, the master's objects are the same on both slides: matched by their own id, they stay where they
    // are — unmatched, reveal.js faded them in again on every Morph.)
    const mid = plan.marked.has(s.id) ? plan.key(s, b00) || (bi < nMaster ? 'm-' + b00.id : null) : null;
    const b01 = mid ? { ...b00, morphId: mid } : b00;
    const tm = plan.textMode(s);
    const b0 = tm && b00.type === 'text' ? { ...b01, byText: true, html: morphText(b00.html, tm, morphCounts) } : b01;
    // Effective start time within the click ("with/after previous" resolved).
    const b = b0.animation && tl.has(b0.id) ? { ...b0, animation: { ...b0.animation, delay: tl.get(b0.id).delay } } : b0;
    const adapt = fit === 'adapt' ? h => fitAttrs(h, b) : h => h;
    if (b.type === 'figindex') return adapt(figIndexExport(b, deck));
    if (b.type === 'slideref') return adapt(slideRefExport(b, s, deck));
    let html = adapt(blockHTML(b, s));
    if (lockHides.has(b.id)) html = html.replace(/^<([a-zA-Z][\w-]*)/, (m, tag) => `<${tag} data-lock-hide="${esc(lockHides.get(b.id))}"`);
    const f = figMap.get(b.id);
    // (The caption goes with its object: it appears, leaves or moves along with it.)
    if (f) html += `<div${animAttrs(b, s).replace(/ data-bid="[^"]*"/, '')}${fit === 'adapt' ? ` data-fcap="${esc(b.id)}"` : ''} style="position:absolute;left:${b.x}px;top:${b.y + b.h + 4}px;width:${b.w}px;`
      + `text-align:center;font-style:italic;font-size:16px;${animVars(b)}"><span class="caption" style="opacity:.85">${esc(captionLine(f))}</span></div>`;
    return b0.anims?.length ? stepLayers(html, b0, s, tl) : html;
  });
  const inner = bk != null ? `<div class="rv-bgl" style="position:absolute;inset:0">${bgLayer(s)}${parts.slice(0, nBack).join('\n')}</div>${parts.slice(nBack).join('\n')}`
    : bgLayer(s) + parts.join('\n');
  const notes = (s.notes ? `<aside class="notes">${esc(s.notes)}</aside>` : '')
    // Voice-over: plays when the slide is shown (reveal.js's data-autoplay).
    + (s.narration?.src && /^data:audio\/|^https:\/\/|^blob:/.test(s.narration.src) ? `<audio class="rv-narration" data-autoplay src="${esc(s.narration.src)}" preload="auto"></audio>` : '');
  // (Marked only because the next one morphs, it doesn't morph from the one before — reveal.js morphs any two marked
  // neighbours —: it comes in with its own transition, as in PowerPoint, where Morph is the incoming slide's.)
  const aa = (plan.marked.has(s.id) ? ' data-auto-animate' + (s.autoAnimate ? '' : ' data-auto-animate-restart') : '') + (s.aaDuration ? ` data-auto-animate-duration="${+s.aaDuration}"` : '') + (s.aaDelay ? ` data-auto-animate-delay="${+s.aaDelay}"` : '');
  // (A first animation "with/after previous" plays on its own when the slide comes in, as in PowerPoint.)
  const first = animEntries(s).find(e => !e.a.trigger), start = first && ['withPrev', 'afterPrev'].includes(first.a.start) ? ' data-rv-start' : '';
  return `<section${trans}${speed}${exact}${auto}${bg}${aa}${start}${bk != null ? ` data-bgk="${bk}"` : ''} data-rv-id="${esc(s.id)}">`
    + `<div class="stage${s.bgIframe && s.bgInteractive ? ' pass' : ''}" style="background:${stageBackground(s)}">${inner}</div>${notes}</section>`;
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
  autoAnimateDuration: 1.0, autoAnimateEasing: 'ease', autoSlideStoppable: true, fragmentInURL: true, zoom: true, search: true, parallax: '', fit: 'fill' };
// Morph (reveal.js auto-animate) with objects turned or flipped. reveal measures each pair by its bounding box (turned:
// the box of the turned shape) and ends with «transform: none» on the arriving object, which stays until the next
// slide — so a turned object arrived straight (going back from a slide where an arrow points right to one where it
// points up: still pointing right), and in the wrong place. For those pairs Revela gives the animation itself: from the
// other object's centre, turn and size to its own (the shortest way round, as PowerPoint), with the individual
// translate / rotate / scale properties — and the object's own transform off meanwhile (its rotation is in «rotate»).
// The rest, reveal's own way. ES5: it runs in the exported presentation.
const AA_MATCHER = `function(fromSlide,toSlide){var pairs=this.getAutoAnimatePairs(fromSlide,toSlide),styles=Reveal.getConfig().autoAnimateStyles||[];
 function at(e){var x=0,y=0;while(e&&e.tagName!=='SECTION'){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}return {x:x,y:y};}
 function look(e){var t=(e.style.transform||'').trim(),m=/^(?:rotate\\((-?[\\d.]+)deg\\))?\\s*(scaleX\\(-1\\))?\\s*(scaleY\\(-1\\))?$/.exec(t);if(!m)return null;
  var own=!!t,r=own?+(m[1]||0):parseFloat(e.style.rotate)||0,sc=String(e.style.scale||'').split(/\\s+/),fx=own?(m[2]?-1:1):(+sc[0]||1),fy=own?(m[3]?-1:1):(+(sc[1]||sc[0])||1);
  return {own:own,r:r,fx:fx,fy:fy};}
 pairs.forEach(function(p){var a=p.from,b=p.to;if(p.options||!a||!b||!a.style||!b.style)return;var A=look(a),B=look(b);if(!A||!B)return;
  if(!A.r&&!B.r&&A.fx>0&&A.fy>0&&B.fx>0&&B.fy>0)return;
  var pa=at(a),pb=at(b),w=b.offsetWidth||1,h=b.offsetHeight||1,dx=(pa.x+a.offsetWidth/2)-(pb.x+w/2),dy=(pa.y+a.offsetHeight/2)-(pb.y+h/2),r1=B.r+((((A.r-B.r)%360)+540)%360-180);
  var st=styles.concat([{property:'translate',from:dx+'px '+dy+'px',to:'0px 0px'},{property:'rotate',from:r1+'deg',to:B.r+'deg'},
   {property:'scale',from:(a.offsetWidth/w*A.fx)+' '+(a.offsetHeight/h*A.fy),to:B.fx+' '+B.fy}]);
  if(B.own)st.push({property:'transform',from:'none',to:'none'});
  p.options={translate:false,scale:false,styles:st};});
 return pairs;}`;
function revealOptions(deck, inApp) {
  const o = { ...REVEAL_DEFAULTS, ...rv(deck) }, J = jsData;
  return `controls:${!!o.controls}, controlsLayout:${J(o.controlsLayout)}, progress:${!!o.progress}, navigationMode:${J(o.navigationMode)},
   mouseWheel:${!!o.mouseWheel}, shuffle:${!!o.shuffle}, hideInactiveCursor:${!!o.hideInactiveCursor}, jumpToSlide:${!!o.jumpToSlide},
   previewLinks:${!!o.previewLinks}, rtl:${!!o.rtl}, autoAnimateDuration:${+o.autoAnimateDuration || 1}, autoAnimateEasing:${J(o.autoAnimateEasing)},
   autoAnimateStyles:['opacity','color','background-color','padding','border-width','border-color','border-radius','outline','outline-offset'],
   autoAnimateMatcher:${AA_MATCHER},
   autoSlideStoppable:${!!o.autoSlideStoppable}, fragmentInURL:${!inApp && !!o.fragmentInURL},${o.view === 'scroll' ? " view:'scroll', scrollProgress:true," : ''}
   ${o.parallax ? `parallaxBackgroundImage:${J(o.parallax)}, parallaxBackgroundSize:${J(o.parallaxSize || '')},` : ''}`;
}
// A chart's name for screen readers: its kind and its series («Barras: Ventas, Costes»), else the first label.
const CHART_KINDS = { bar: 'Barras', stacked: 'Barras apiladas', stacked100: 'Barras apiladas al 100 %', hbar: 'Barras horizontales', histogram: 'Histograma', line: 'Líneas', area: 'Área',
  stackedArea: 'Áreas apiladas', pie: 'Circular', doughnut: 'Dona', scatter: 'Dispersión', radar: 'Radar', bubble: 'Burbujas', treemap: 'Rectángulos (treemap)', waterfall: 'Cascada', funnel: 'Embudo', map: 'Mapa' };
const chartCaption = b => `${t('Gráfico')} · ${t(CHART_KINDS[b.chartType || 'bar'] || 'Barras')}: ${[b.seriesName, ...(b.series || []).map(x => x.name)].filter(Boolean).join(', ') || (b.data || []).slice(0, 4).map(d => d.label).join(', ')}`;

export function buildHTML(deck = state.deck, opts = {}) {
  // (Shown in this window: its big pictures, videos and sounds as blob: addresses, io/formats/blobmedia.js.)
  return dedupeMedia(buildHTMLRaw(opts.inApp ? blobMedia(deck) : deck, opts));
}
// (Reveal is set to fill the screen as the editor shows the slide: no margin, and no cap on how far it
// grows — reveal.js stops at 2× by default, which left wide borders on large or high-resolution screens.)
// noCopy: the viewer of one shared without copies (apps/view: «solo presentar», or the owner's setting) — nothing to
// select, drag out, copy or print. (What a screen shows can always be photographed.)
// who: the viewer's email, for a watermark that asks for it (apps/view, after a tracked link asked for it).
function buildHTMLRaw(deck, { inApp = false, selfPaced = false, noCopy = false, who = '' } = {}) {
  const { w, h } = deck.size;
  const figMap = figuresMap(deck);
  // Vertical stacks: a slide marked `vertical` goes below the previous visible one.
  const groups = [];
  const canvas = canvasOn(deck);                        // canvas mode: frames on one canvas, no stacks
  const fit = fitMode(deck);                            // on a screen of another proportion
  for (const s of deck.slides.filter(x => !x.hidden)) {
    if (s.vertical && groups.length && !canvas) groups[groups.length - 1].push(s); else groups.push([s]);
  }
  const paths = slidePaths(deck), flat = [...paths.values()];
  const plan = morphPlan(deck), bd = backdropPlan(deck, fit);
  // Background sound: from its slide up to another (or the end), in reveal's order of slides.
  const vis = deck.slides.filter(x => !x.hidden);
  const bgmHTML = vis.flatMap((s, i) => s.blocks.filter(b => b.type === 'audio' && b.until && b.src).map(b => {
    const j = b.until === 'end' ? vis.length - 1 : vis.findIndex(x => x.id === b.until);
    return `<audio data-bgm="${esc(b.id)}" data-from="${i}" data-to="${Math.max(i, j < 0 ? i : j)}" src="${esc(b.src)}"${b.loop ? ' loop' : ''} preload="auto"></audio>`;
  })).join('');
  const slides = groups.map(g => (g.length > 1 ? `<section>\n${g.map(s => slideHTML(s, deck, figMap, plan, fit, bd)).join('\n')}\n</section>` : slideHTML(g[0], deck, figMap, plan, fit, bd))).join('\n')
    // Links typed as a slide number (#/N, N = position in the deck) → reveal's h/v.
    .replace(/href="#\/(\d+)"/g, (m, n) => `href="#/${flat[+n] || n}"`);
  const sn = deck.slideNumber || { show: false };
  const snPos = SLIDENUM_POS[sn.position] || SLIDENUM_POS.br;
  const hasCode = deck.slides.some(s => s.blocks.some(b => b.type === 'code'));
  const hasMath = deck.slides.some(s => s.blocks.some(b => b.type === 'math')) || / class="math" data-latex=/.test(slides);   // (also one in the master)
  const hasInlineMath = deck.slides.some(s => s.blocks.some(b => b.type === 'text' && /\$[^$]/.test(b.html || '')));
  const hasZoomReturn = deck.slides.some(s => s.blocks.some(b => b.type === 'slideref' && b.returnBack));
  const katexNeeded = hasMath || hasInlineMath;
  const hasTrig = deck.slides.some(s => s.blocks.some(b => animsOf(b).some(a => a.trigger)));
  const hasCam = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'camera'));
  const hasPoll = !!deck.classroom || deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'poll'));
  const hasZoomable = deck.slides.some(s => s.blocks.some(b => b.type === 'image' && b.zoomable));
  const hasMedia = deck.slides.some(s => !s.hidden && s.blocks.some(needsPlayer));
  const hasTimer = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'timer'));
  const hasLock = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'lock'));
  const hasModel3d = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'model'));
  const hasPuppet = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'model' && b.puppet));   // (a model following the presenter: io/runtime/puppet.js)   // (also for a model that carries on to the next slide)
  const hasLive = deck.slides.some(s => s.blocks.some(b => (b.type === 'chart' && b.dataUrl) || (b.type === 'embed' && b.refreshMin)));
  const ft = deck.footer || { show: false };
  const footerText = ft.show
    ? `<div class="deck-footer">${esc(ft.text || '')}${ft.date ? (ft.text ? ' · ' : '') + new Date().toLocaleDateString('es') : ''}</div>`
    : '';
  const lg = deck.logo || {};
  const LOGO_POS = { br: 'right:16px;bottom:16px', bl: 'left:16px;bottom:16px', tr: 'right:16px;top:16px', tl: 'left:16px;top:16px' };
  const logoHTML = lg.src
    ? `<img class="deck-logo" src="${esc(lg.src)}" style="position:fixed;${LOGO_POS[lg.position] || LOGO_POS.br};height:${lg.size || 120}px;z-index:31;pointer-events:none">`
    : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(deck.name || 'Presentación')}</title>
<style>aside.notes{display:none}</style>
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
 .rv-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}   /* (for screen readers only: a chart's data) */
 /* What the slide shows must match the editor: reveal.js themes give images a
    margin, border and white background, text a 1.3 line height and lists an
    inline-block box. Not inside Revela's objects. */
 .reveal .stage{line-height:normal}
 .reveal .stage img,.reveal .stage video,.reveal .stage iframe{margin:0;border:0;background:none;box-shadow:none;max-width:none;max-height:none}
 .reveal .stage ul,.reveal .stage ol{display:block;text-align:inherit;margin:1em 0;padding-left:40px}
 .reveal .stage table.tbl{line-height:normal}
 .reveal .stage .rv-m{display:inline-block}
 ${levelCSS('.reveal ')}
 .reveal .stage ul{list-style-type:var(--bullet,disc)}
 .reveal .stage ol{list-style-type:var(--num,decimal)}
 .reveal section{height:100%}
 .reveal .slide-number{${snPos}}
 ${tableCSS('.reveal ')}
 .reveal .stage.pass{pointer-events:none} .reveal .stage.pass>*{pointer-events:auto}
 .reveal .math .katex-display{margin:0}
 model-viewer::part(default-progress-bar){display:none}
 .reveal .rv-code pre{box-shadow:none}
 .reveal .rv-code pre code{max-height:100%;height:100%;box-sizing:border-box;overflow:auto;scrollbar-width:thin;scrollbar-color:#6668 transparent}
 .reveal .rv-code.no-scroll pre code{overflow:hidden}
 .deck-footer{position:fixed;left:12px;bottom:8px;z-index:30;font-size:14px;opacity:.7;color:#fff;mix-blend-mode:difference}
 ${customEffectCSS(deck)}
 ${fxCSS(deck)}
 ${customTransitionCSS(usedTransitions(deck), deck.size)}
 ${backdropCSS(bd, w, h)}
 .reveal .slides section .fragment.rv-path{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-path.visible{translate:var(--dx) var(--dy)}
 .reveal .slides section .fragment.spin360,.reveal .slides section .fragment.clip3d,.reveal .slides section .fragment.pdfview,.reveal .slides section .fragment.draw,.reveal .slides section .fragment[data-mfx]{opacity:1;visibility:inherit}
 .reveal .fragment.draw .rvd{stroke-dasharray:1;stroke-dashoffset:1;fill-opacity:0}
 .reveal .fragment.draw.visible .rvd{animation:rvDraw var(--anim-dur,1500ms) ease-in-out var(--anim-del,0ms) forwards}
 @keyframes rvDraw{70%{fill-opacity:0}to{stroke-dashoffset:0;fill-opacity:1}}
 [data-goto],[data-href],[data-popup]{cursor:pointer}
 [data-drag]{cursor:grab;touch-action:none}
 .rv-pop{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.45);animation:rvPopIn .2s ease both} @keyframes rvPopIn{from{opacity:0}to{opacity:1}}
 .rv-pop-box{position:relative;max-width:min(680px,88vw);max-height:80vh;overflow:auto;background:#fff;color:#1d1f24;border-radius:14px;padding:28px 32px;box-shadow:0 18px 60px rgba(0,0,0,.35);text-align:start;font:400 22px/1.45 system-ui,sans-serif}
 .rv-pop-box h2{font-size:30px;margin:0 0 12px;color:inherit;text-transform:none;line-height:1.2}
 .rv-pop-box p{margin:0 0 .7em}
 .rv-pop-x{position:absolute;top:10px;inset-inline-end:12px;border:0;background:none;font-size:22px;cursor:pointer;color:#555}
 .rv-tip{position:fixed;z-index:61;max-width:320px;padding:8px 12px;border-radius:8px;background:#1d1f24;color:#fff;font:400 15px/1.35 system-ui,sans-serif;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.3)}
 [data-timer].rv-t-low .rv-t-txt,[data-timer].rv-t-low .rv-t-bar{fill:#ff5252} [data-timer].rv-t-low .rv-t-arc{stroke:#ff5252}
 [data-timer].rv-t-done svg{animation:rvBlink 1s ease-in-out 3} @keyframes rvBlink{50%{opacity:.25}}
 ${WRAP_CSS}
 .reveal .slides section .fragment.spin360.visible{animation:rvTurn var(--anim-dur,600ms) ease-in-out var(--anim-del,0ms) both}
 @keyframes rvTurn{from{transform:rotate(0)}to{transform:rotate(360deg)}}
 ${emphasisCSS(deck)}
 .reveal .slides section .rv-step{pointer-events:none}.reveal .slides section .rv-step>*{pointer-events:auto}
 .reveal .slides section .fragment.rv-pathc{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-pathc.visible{animation:var(--pk) var(--anim-dur,600ms) ease-in-out var(--anim-del,0ms) both}
 ${pathKeyframes(deck)}
 ${/ data-pdf[ >]/.test(slides) ? PDF_CSS : ''}
 ${hasTrig ? `[data-bid]{cursor:pointer} .rv-trig.rv-in:not(.on){opacity:0} ${EFFECT_KF_CSS.replace(/\n/g, ' ')}` : ''}
 ${INK_CSS}
 ${hasLock ? LOCK_CSS : ''}
 ${READING_CSS}
 ${canvas ? '' : fit === 'bands' ? '.reveal-viewport{background:#000!important} .reveal .slides section>.stage{clip-path:inset(0)}'
    : '.reveal .slides section[data-fill=g]>.stage{background:transparent!important}'}
 ${canvas ? `.reveal.rv-canvas{background:${deck.canvas.bg || '#0d1117'}} .reveal.rv-canvas .backgrounds{display:none}
 .reveal.rv-canvas .slides>section{display:block!important;visibility:visible!important;opacity:1!important;top:0!important;left:0!important;clip-path:none!important;transform-origin:0 0!important;
   transition:transform var(--rv-fly,1.4s) cubic-bezier(.65,0,.35,1)!important;pointer-events:none}
 .reveal.rv-canvas .slides>section.present{pointer-events:auto}
 html.rv-canvas-overview .reveal.rv-canvas .slides>section{pointer-events:auto;cursor:zoom-in}
 .reveal.rv-canvas .rv-world{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;z-index:1;pointer-events:none;transition:transform var(--rv-fly,1.4s) cubic-bezier(.65,0,.35,1)}` : ''}${noCopy ? '\n .reveal{-webkit-user-select:none;user-select:none} .reveal img{-webkit-user-drag:none} @media print{body{display:none!important}}' : ''}
</style>${deck.css ? `\n<style>/* the presentation's own CSS (developer mode) */\n${scopedCSS(deck.css, '.reveal .stage')}</style>` : ''}</head><body>
<div class="reveal${canvas ? ' rv-canvas' : ''}" data-fit="${fit}"><div class="slides">${canvas && deck.canvas.image?.src ? `<div class="rv-world"><img alt="" src="${esc(deck.canvas.image.src)}" style="max-width:none;max-height:none;margin:0;position:absolute;left:${deck.canvas.image.x}px;top:${deck.canvas.image.y}px;width:${deck.canvas.image.w}px;height:${deck.canvas.image.h}px"></div>` : ''}${backdropHTML(bd)}
${slides}
</div>${footerText}${logoHTML}</div>${watermarkPage(deck, who)}${bgmHTML}
<script src="${REVEAL}/dist/reveal.js"></script>
<script src="${REVEAL}/plugin/notes/notes.js"></script>
${rv(deck).zoom !== false ? `<script src="${REVEAL}/plugin/zoom/zoom.js"></script>` : ''}
${rv(deck).search !== false ? `<script src="${REVEAL}/plugin/search/search.js"></script>` : ''}
${hasCode ? `<script src="${REVEAL}/plugin/highlight/highlight.js"></script>` : ''}
<script>
 ${hasCode ? `try{(${registerCodeLangs.toString()})(RevealHighlight().hljs);}catch(e){}` : ''}
 Reveal.initialize({ width:${w}, height:${h}, margin:0, minScale:0.05, maxScale:20, hash:${inApp ? 'false' : 'true'}, respondToHashChanges:true, loop:${deck.loop ? 'true' : 'false'},
   slideNumber:${sn.show ? jsData(sn.format || 'c') : 'false'},
   transition:${jsData(deck.defaultTransition)}, transitionSpeed:${jsData(deck.transitionSpeed)},
   ${revealOptions(deck, inApp)}${canvas ? " center:false, viewDistance:1000, mobileViewDistance:1000, backgroundTransition:'none'," : ''}
   plugins:[ RevealNotes${hasCode ? ', RevealHighlight' : ''}${rv(deck).zoom !== false ? ', RevealZoom' : ''}${rv(deck).search !== false ? ', RevealSearch' : ''} ] });
 ${hasMath ? 'window.addEventListener("load",function(){window.katex&&document.querySelectorAll(".math[data-latex]").forEach(function(el){try{katex.render(el.getAttribute("data-latex"),el,{throwOnError:false,displayMode:true,strict:"ignore"});}catch(e){el.textContent=el.getAttribute("data-latex");}});});' : ''}
 ${hasInlineMath ? 'window.addEventListener("load",function(){window.renderMathInElement&&renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false});});' : ''}
 ${hasTrig ? TRIGGER_JS : ''}
 ${hasCam ? `${createCameraEngine.toString()}\n${revelaCameraRuntime.toString()}\nrevelaCameraRuntime(${JSON.stringify(VISION)}, ${JSON.stringify(SELFIE_MODEL)});` : ''}
 ${hasPuppet ? `${hasCam ? '' : createCameraEngine.toString()}\n${[puppetBones, puppetMorph, puppetSolve, puppetMirror, createPuppet, revelaPuppetRuntime].join('\n')}\nrevelaPuppetRuntime(${JSON.stringify(VISION)}, ${JSON.stringify(POSE_MODEL)}, ${JSON.stringify(FACE_MODEL)});` : ''}
 ${hasPoll && !selfPaced ? pollJS(currentPalette(deck).accents, { classroom: !!deck.classroom, labels: pollLabels(), teams: Array.isArray(deck.teams) ? deck.teams.slice(0, 8) : [], starStep: +deck.starStep || 5 }) : ''}
 ${selfPaced && hasPoll ? `(${selfPacedRuntime})(${publicActivity}, (function () { var gradeActivity = ${gradeActivity}; return ${gradeAnswer}; })(), ${JSON.stringify({ check: t('Comprobar'), allRight: t('¡Todo bien!'), partly: t('{n} % de aciertos'),
   wrong: t('No es correcto'), sent: t('Nota enviada'), failed: t('No se pudo enviar la respuesta. Inténtalo otra vez.'), live: t('Esta votación es en directo, con quien presenta.'),
   game: Object.fromEntries(Object.entries(GAME_WORDS).map(([k, v]) => [k, t(v)])) })}${deck.slides.some(s => s.blocks.some(b => b.type === 'poll' && ['crossword', 'wordsearch', 'memory', 'wheel'].includes(b.kind))) ? `, ${activityGame}` : ''});` : ''}
 ${hasLive ? liveDataJS() : ''}
 ${hasZoomable ? LIGHTBOX_JS : ''}
 ${canvas ? `${canvasRuntimeDeps()}\ncanvasRuntime(${JSON.stringify(groups.map(g => frameOf(g[0], deck.slides.indexOf(g[0]), deck.size)))}, ${w}, ${h});` : ''}
 ${hasModel3d ? `(${model3dRuntime.toString()})();` : ''}
 ${hasTimer ? `(${timerRuntime.toString()})();` : ''}
 ${hasLock ? `window.rvLock=(${lockRuntime})(${lockSHA256}, ${lockNorm}, ${jsData({ title: t('Candado'), code: t('Código'), digit: t('Cifra {n}'), open: t('Abrir'), close: t('Cerrar'),
   opened: t('¡Abierto!'), wrong: t('Ese no es el código.'), left: t('Quedan {n} intentos'), noMore: t('No quedan intentos.'), gate: t('Abre el candado para seguir.') })}, ${!inApp || selfPaced});` : ''}
 ${canvas ? '' : `(${screenFitRuntime})(${jsData(fit)}, ${w}, ${h}, ${fitSize}, ${adaptLayout}, ${connectorPath});`}
 ${/ data-sound="/.test(slides) ? `(${soundRuntime.toString()})();` : ''}
 ${/ data-tabs="/.test(slides) ? `(${tabRuntime.toString()})();` : ''}
 ${/ data-pdf[ >]/.test(slides) ? `(${pdfRuntime.toString()})(${JSON.stringify(PDFJS)});` : ''}
 ${bgmHTML ? BGM_JS : ''}
 ${/ data-rv-start[ >]/.test(slides) ? START_JS : ''}
 ${bd.layers.length || / data-rv-dur="/.test(slides) ? BD_JS : ''}
 ${/ data-(goto|href|popup|tip)="/.test(slides) ? LINK_JS : ''}
 ${/ data-drag[ >]/.test(slides) ? DRAG_JS : ''}
 ${/ data-pano="/.test(slides) ? PANO_JS : ''}
 ${/ data-file(-view)?[ >]/.test(slides) ? FILE_JS : ''}
 ${hasMedia ? `${createMediaPlayer.toString()}\n${askInVideo.toString()}\nwindow.__rvVideoWords=${JSON.stringify({ go: t('Continuar') + ' ▶' })};\n${revelaMediaRuntime.toString()}\nrevelaMediaRuntime(${JSON.stringify(GIFUCT)});` : ''}
 ${inkJS(w, h, { pen: t('Lápiz'), hl: t('Resaltador'), laser: t('Puntero láser'), color: t('Color de la tinta'), erase: t('Borrar la tinta de la diapositiva'),
   cc: t('Subtítulos en directo'), read: t('Modo lectura'), zin: t('Acercar'), zout: t('Alejar'), zreset: t('Tamaño normal'), pick: t('Elegir a alguien al azar'), grade: t('Corregir con IA las respuestas'), mod: t('Moderar las preguntas'), next: t('Siguiente'), prev: t('Anterior'), go: t('Ir a la diapositiva'), overview: t('Vista general'),
   titles: deck.slides.filter(s => !s.hidden).map(s => slideTitle(s)), arrow: t('Puntero normal'), black: t('Pantalla en negro'), white: t('Pantalla en blanco'), full: t('Pantalla completa'), end: t('Terminar la presentación'), lang: speechLang(), ccWarn: t('Los subtítulos usan el reconocimiento de voz del navegador: en Chrome y Edge el audio se envía a su servicio de voz. ¿Activarlos?') })}
 ${readingJS({ read: t('Modo lectura'), listen: t('Leer en voz alta'), stop: t('Parar'), bigger: t('Letra más grande'), smaller: t('Letra más pequeña'), close: t('Cerrar'),
   img: t('Imagen'), q: t('Pregunta'), slide: t('Diapositiva'), empty: t('Esta diapositiva no tiene texto.') })}
 ${overviewJS(groups.map(g => (deck.sections || []).find(x => x.id === g[0].sectionId)?.name || ''),
   { title: t('Vista general'), help: t('Flechas e Intro, o clic, para ir · Esc para cerrar') })}
 ${hasZoomReturn ? '(function(){var p=null;document.addEventListener("click",function(e){var a=e.target.closest("a.slide-zoom[data-zoom-return]");if(a){p={t:a.dataset.target,o:a.dataset.origin.split("/"),arrived:false};}});Reveal.on("slidechanged",function(ev){if(!p)return;if(ev.indexh+"/"+(ev.indexv||0)===p.t){p.arrived=true;return;}if(p.arrived){var o=p.o;p=null;setTimeout(function(){Reveal.slide(+o[0],+o[1]);},0);}});})();' : ''}
 ${noCopy ? "['copy','cut','contextmenu','dragstart'].forEach(function(n){document.addEventListener(n,function(e){e.preventDefault();});});document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&/^[psc]$/i.test(e.key))e.preventDefault();});" : ''}
</script></body></html>`;
}

// The same embedded picture or model used several times (a logo on the master,
// a slide and its Morph twin) is written once: a table read before the slides
// start gives each element its source. The file stays self-contained.
function dedupeMedia(html) {
  // (Found by hand, not with a regular expression: a picture of several MB inside a pattern
  // overflows the regex engine's stack — "Maximum call stack size exceeded".)
  const hits = [];
  for (const at of ['src', 'data-poster']) {
    const key = ` ${at}="data:`;
    for (let i = html.indexOf(key); i >= 0; i = html.indexOf(key, i + 1)) {
      const from = i + at.length + 3, to = html.indexOf('"', from);
      if (to < 0) break;
      if (to - from >= 2000) hits.push({ at, i, from, to });
      i = to;
    }
  }
  const count = new Map();
  for (const h of hits) { h.u = html.slice(h.from, h.to); count.set(h.u, (count.get(h.u) || 0) + 1); }
  const ids = new Map([...count].filter(([, n]) => n > 1).map(([u], i) => [u, 'm' + i]));
  if (!ids.size) return html;
  hits.sort((a, b) => a.i - b.i);
  const parts = []; let last = 0;
  for (const h of hits) {
    if (!ids.has(h.u)) continue;
    parts.push(html.slice(last, h.i), ` data-rv-${h.at === 'src' ? 'src' : 'poster'}="${ids.get(h.u)}"`);
    last = h.to + 1;
  }
  parts.push(html.slice(last));
  const out = parts.join('');
  const table = `<script>(function(){var M=${jsData(Object.fromEntries([...ids].map(([u, k]) => [k, u])))};`
    + `document.querySelectorAll('[data-rv-src]').forEach(function(el){el.setAttribute('src',M[el.getAttribute('data-rv-src')]);});`
    + `document.querySelectorAll('[data-rv-poster]').forEach(function(el){el.setAttribute('data-poster',M[el.getAttribute('data-rv-poster')]);});})();</script>\n`;
  const r = out.search(/<script src="[^"]*\/dist\/reveal\.js"><\/script>/);
  return r < 0 ? out : out.slice(0, r) + table + out.slice(r);
}

// The page to keep and open anywhere — a USB stick in a classroom without internet —: reveal.js, its
// plugins and styles inside it (fetched now). → whether it could be made so (else it needs a connection;
// 3D models, maps, fonts and videos from the internet always do).
export async function exportHTML() {
  const { html, offline } = await offlineHTML(buildHTML());
  download(new Blob([html], { type: 'text/html' }), slug(state.deck.name) + '.html');
  return offline;
}
const inlined = new Map();
async function fetchText(url) {
  if (!inlined.has(url)) inlined.set(url, fetch(url).then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status)))));
  return inlined.get(url);
}
// A page's reveal.js scripts and styles, put inside it (relative addresses in the styles made absolute).
export async function offlineHTML(html) {
  const esc$ = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tags = [...html.matchAll(new RegExp(`<script src="(${esc$(REVEAL)}[^"]+)"></script>|<link rel="stylesheet" href="(${esc$(REVEAL)}[^"]+)">`, 'g'))];
  try {
    const parts = await Promise.all(tags.map(async m => {
      const url = m[1] || m[2], text = await fetchText(url);
      if (m[1]) return `<script>${text.replace(/<\/script/gi, '<\\/script')}</script>`;
      return `<style>${text.replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+)\1\)/g, (x, q, u) => `url(${new URL(u, url).href})`).replace(/<\/style/gi, '<\\/style')}</style>`;
    }));
    let i = 0; return { html: html.replace(new RegExp(tags.map(m => esc$(m[0])).join('|') || '$^', 'g'), () => parts[i++]), offline: true };
  } catch { return { html, offline: false }; }
}

// The inline‑styled blocks of a slide (self‑contained, no external CSS).
export function slideInnerHTML(slide, deck = state.deck) { return blocksOf(slide, deck).map(b => blockHTML(b, slide)).join(''); }
