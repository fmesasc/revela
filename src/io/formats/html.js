// The deck as a self-contained reveal.js presentation (HTML export and the
// document shown when presenting), and each object's inline HTML, reused by
// the print and image exports.

import { embedSandbox } from '../../features/document/sanitize.js';
import { esc, jsData } from '../../core/text.js';
import { morphPlan, morphSig } from '../../features/animation/morph.js';
export { morphPlan, morphSig };                // (for tests and older callers)
import { state } from '../../core/store.js';
import { REVEAL, KATEX, MODEL_VIEWER, GIFUCT } from '../../core/vendor.js';
import { download, slug } from '../files.js';
import { TRIGGER_JS, CAMERA_JS, pollJS, liveDataJS, LIGHTBOX_JS, overviewJS } from '../runtime/scripts.js';
import { createMediaPlayer, revelaMediaRuntime } from '../runtime/media.js';
import { needsPlayer, mediaConfig } from '../../features/live/media.js';
import { modelAttrsHTML, bleedBox } from '../../features/content/model3d.js';
import { model3dRuntime } from '../runtime/model3d.js';
import { timerRuntime } from '../runtime/timer.js';
import { safeURL } from '../../features/document/sanitize.js';
import { canvasRuntimeDeps } from '../runtime/canvas.js';
import { canvasOn, frameOf } from '../../features/design/canvasmode.js';
import { shadowCSS, borderCSS, levelCSS, textPadding, webCardHTML, mathTeX, mathCSS, shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, connectorSVG, iconSVG, wordartCSS, tableRowsHTML, inkSVG, timerSVG, curvedTextSVG, deviceCSS, shapeTextHTML, hasShapeText, wrapFor, wrapAttrs, wrapVars, WRAP_CSS, tableClass, tableVars, tableCSS } from '../../render/svg.js';
import { googleFontLinks } from '../../features/design/fonts.js';
import { t, speechLang } from '../../i18n/index.js';
import { collectFigures, figuresMap, captionLine, figIndexTitle, slidePaths } from '../../features/document/captions.js';
import { INK_CSS, inkJS } from '../runtime/ink.js';
import { deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { animTimeline, EFFECT_KF, EFFECT_KF_CSS, isEntrance, customTransitionCSS, transitionName, isShapeTransition, pathKeyframesCSS, pathTurns, animsOf, animKey, offsetBefore } from '../../features/animation/transitions.js';
import { masterBlocksFor, isEmptyPlaceholder, styled, levelVars } from '../../features/document/master.js';


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
  + (b.shadow ? `filter:${shadowCSS(b)};` : '')
  + animVars(b);
// Timing (and motion path) of one of an object's animations (its first by
// default), also for its caption and for the layers of the next ones.
const cssKey = key => String(key).replace(/[^\w-]/g, '_');
const animVars = (b, a = b.animation, key = b.id) => (a ? `transition-duration:${a.duration ?? 500}ms;transition-delay:${a.delay ?? 0}ms;`
    + `--anim-dur:${a.duration ?? 500}ms;--anim-del:${a.delay ?? 0}ms;`
    + (a.effect === 'path' ? `--dx:${a.dx || 0}px;--dy:${a.dy || 0}px;--pk:rvP${cssKey(key)};` : '') : '');

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
function customEffectCSS(deck) {
  const used = new Set();
  deck.slides.forEach(s => s.blocks.forEach(b => animsOf(b).forEach(a => { if (CUSTOM_KF[a.effect]) used.add(a.effect); })));
  if (!used.size) return '';
  return [...used].map(e => `.reveal .fragment.${e}{opacity:0} .reveal .fragment.${e}.visible{opacity:1;animation:${CUSTOM_KF[e][0]} var(--anim-dur,600ms) ease var(--anim-del,0ms) both}`
    + CUSTOM_KF[e][1]).join('\n');
}

export { esc };

// Objects that are links: a click (or Enter) goes to the slide or opens the page.
const LINK_JS = `(function(){function go(el){var g=el.getAttribute('data-goto'),h=el.getAttribute('data-href');
if(h){window.open(h,'_blank','noopener');return;}
var s=Reveal.getSlides(),i=s.indexOf(Reveal.getCurrentSlide()),t=null;
if(g==='next')t=s[i+1];else if(g==='prev')t=s[i-1];else if(g==='first')t=s[0];else if(g==='last')t=s[s.length-1];
else if(g&&g.indexOf('slide:')===0){var id=g.slice(6);for(var k=0;k<s.length;k++)if(s[k].getAttribute('data-rv-id')===id)t=s[k];}
if(t){var x=Reveal.getIndices(t);Reveal.slide(x.h,x.v,0);}}
document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.slides [data-goto],.slides [data-href]');if(el){e.preventDefault();e.stopPropagation();go(el);}},true);
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&document.activeElement&&document.activeElement.matches&&document.activeElement.matches('[data-goto],[data-href]')){e.preventDefault();go(document.activeElement);}},true);})();`;

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

function animAttrs(b, slide, a = b.animation, key = b.id) {
  // An object that triggers animations of others gets an id to be clicked.
  const src = slide && slide.blocks.some(x => animsOf(x).some(y => y.trigger === b.id)) ? ` data-bid="${b.id}"` : '';
  if (!a) return src;
  const { effect, order, trigger, duration, delay } = a;
  const clip = effect === 'clip3d' ? ` data-clip="${esc(a.clip || '*')}"${a.once ? ' data-clip-once' : ''}` : '';
  if (trigger && slide?.blocks.some(x => x.id === trigger))       // played on click of another object
    return src + ` class="rv-trig${isEntrance(effect) ? ' rv-in' : ''}" data-trig="${trigger}" data-kf="${effect === 'path' ? 'rvP' + cssKey(key) : EFFECT_KF[effect] || 'rvIn'}"`
      + ` data-dur="${duration ?? 500}" data-del="${delay ?? 0}"` + clip;
  const cls = effect === 'path' ? ((a.pathShape && a.pathShape !== 'line') || (pathTurns(a) && b.type !== 'model') ? 'rv-pathc' : 'rv-path') : effect;
  return src + ` class="fragment ${cls}" data-fragment-index="${order}"` + clip;
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
export const blocksOf = (s, deck = state.deck) => [...masterBlocksFor(s, deck), ...s.blocks.map(b => styled(b, s, deck))].filter(b => !isEmptyPlaceholder(b) && !(b.backdrop && canvasOn(deck)));

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
export function blockHTML(b, slide) { return mergeClasses(blockHTMLRaw(b, slide)); }

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
// page, or to a slide — next, previous, first, last or one of them (by its id).
const GOTO = new Set(['next', 'prev', 'first', 'last']);
const linkAttrs = b => (b.type === 'text' || b.type === 'connector' ? '' : (b.href && safeURL(b.href) && /^(https?|mailto):/i.test(b.href) ? ` data-href="${esc(b.href)}"` : '')
  + (b.goto ? ` data-goto="${esc(GOTO.has(b.goto) ? b.goto : 'slide:' + b.goto)}"` : '') + (b.href || b.goto ? ' role="link" tabindex="0"' : ''));
function blockHTMLRaw(b, slide) {
  // When the slide uses Auto‑Animate, a stable data-id lets reveal.js match and
  // morph the same object between consecutive slides (PowerPoint's "Morph").
  // Morph: the object matches its twin on the next slide by id — except text
  // morphing by words/characters, where the words themselves match (morphText).
  const byText = !!b.byText;
  const a = animAttrs(b, slide) + (b.morphId && !byText ? ` data-id="${esc(b.morphId)}"` : '') + ariaAttrs(b) + linkAttrs(b);
  if (b.type === 'connector') {
    const { w, h } = state.deck.size;
    const from = slide && slide.blocks.find(x => x.id === b.from);
    const to = slide && slide.blocks.find(x => x.id === b.to);
    return `<div${a} style="${box(b)}pointer-events:none">${connectorSVG(b, from, to, w, h)}</div>`;
  }
  if (b.type === 'text') {
    const wr = wrapFor(b, slide);
    return `<div${a}${b.levels ? ' class="lv"' : ''}${wrapAttrs(wr)} style="${box(b)}${wrapVars(wr)}font-size:${b.fontSize || 40}px;${b.color ? `color:${b.color};` : ''}${b.levels ? levelVars(b) : ''}`
      + `text-align:${b.textAlign || 'left'};${b.fontFamily ? `font-family:${b.fontFamily};` : ''}`
      + `${b.lineHeight ? `line-height:${b.lineHeight};` : ''}`
      + `${b.letterSpacing ? `letter-spacing:${b.letterSpacing}px;` : ''}`
      + `padding:${textPadding(b)};`
      + `${b.dir === 'rtl' ? 'direction:rtl;' : ''}`
      + `${b.vertical ? 'writing-mode:vertical-rl;' : ''}`
      + `${b.bullet ? `--bullet:${b.bullet};` : ''}`
      + `${b.numStyle ? `--num:${b.numStyle};` : ''}`
      + `${b.bg ? `background:${b.bg};` : ''}${b.borderColor ? `border:${borderCSS(b.borderColor, b.borderDash)};` : ''}`
      + `${b.radius ? `border-radius:${b.radius}px;` : ''}box-sizing:border-box;`
      + `${b.vAlign ? `display:flex;flex-direction:column;justify-content:${{ top: 'flex-start', middle: 'center', bottom: 'flex-end' }[b.vAlign]};` : ''}`
      + `${b.fontWeight ? `font-weight:${b.fontWeight};` : ''}${b.fontStyle ? `font-style:${b.fontStyle};` : ''}`
      + `${b.columns > 1 ? `column-count:${b.columns};column-gap:32px;` : ''}`
      + `${b.wordart ? wordartCSS(b.wordart) : ''}">`
      + `${b.curve ? curvedTextSVG(b) : b.html || ''}</div>`;
  }
  if (b.type === 'model')
    return `<model-viewer${a}${modelAttrsHTML(b)} style="${box(bleedBox(b))}background:transparent${bleedBox(b) !== b ? ';pointer-events:none' : ''}"></model-viewer>`;
  // Video / GIF with segments, autoplay, loop, mute or a colour key: the media
  // player draws it; each segment after the first automatic one is a click.
  if (needsPlayer(b)) {
    const cfg = mediaConfig(b), first = cfg.autoplay ? 1 : 0;
    // No segments and not automatic: one click plays it all (data-seg -1).
    const segs = cfg.segments.length ? cfg.segments.slice(first).map((_, k) => k + first) : cfg.autoplay ? [] : [-1];
    const clicks = segs.map((n, k) => `<span class="fragment rv-seg" data-seg-of="rvm-${b.id}" data-seg="${n}"${b.animation && !b.animation.trigger ? ` data-fragment-index="${b.animation.order + k + 1}"` : ''} style="display:none"></span>`).join('');
    return `<div${a} id="rvm-${b.id}" data-media="${esc(JSON.stringify(cfg))}" style="${box(b)}${b.type === 'image' ? `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)};${deviceCSS(b)}` : ''}"></div>${clicks}`;
  }
  if (b.type === 'image')
    return `<img${a} src="${esc(b.src || '')}"${b.zoomable ? ' data-lightbox' : ''} alt="${b.decorative ? '' : esc(b.alt || '')}" style="${box(b)}object-fit:${b.fit || 'contain'};`
      + `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)};${deviceCSS(b)}">`;
  if (b.type === 'video')
    return `<video${a} src="${esc(b.src || '')}" controls style="${box(b)}object-fit:contain"></video>`;
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
  // Sound: on its slide (reveal.js plays it on arrival with data-autoplay) or, if
  // it keeps playing over the next slides, a speaker button here and the sound
  // itself outside the slides (below: bgmHTML), so changing slide doesn't stop it.
  if (b.type === 'audio') {
    if (b.until) return b.hideIcon ? '' : `<button${a} type="button" data-bgm-btn="${esc(b.id)}" style="${box(b)}background:none;border:0;cursor:pointer;font-size:${Math.round(Math.min(b.w, b.h) * 0.6)}px;line-height:1;padding:0">🔊</button>`;
    return `<audio${a} src="${esc(b.src || '')}" controls${b.autoplay ? ' data-autoplay' : ''}${b.loop ? ' loop' : ''} style="${box(b)}${b.hideIcon ? 'visibility:hidden;' : ''}"></audio>`;
  }
  if (b.type === 'embed' && b.display === 'card')
    return `<a${a} class="rv-webcard" href="${esc(b.src || '')}" target="_blank" rel="noopener" style="${box(b)}display:block;text-decoration:none">${webCardHTML(b, t('Abrir la web'))}</a>`;
  if (b.type === 'embed')
    return `<iframe${a} src="${esc(b.src || '')}" referrerpolicy="strict-origin-when-cross-origin"${b.refreshMin ? ` data-refresh-min="${+b.refreshMin}"` : ''} `
      + `sandbox="${embedSandbox(b.src)}" `
      + `style="${box(b)}border:0;background:#fff"></iframe>`;
  if (b.type === 'shape')
    return `<div${a} style="${box(b)}">${shapeSVG(b)}${hasShapeText(b) && b.html ? shapeTextHTML(b) : ''}</div>`;
  if (b.type === 'chart')
    return `<div${a}${b.dataUrl ? ` class="rv-live-chart" data-chart="${esc(JSON.stringify({ ...b, data: undefined, series: undefined }))}"` : ''} style="${box(b)}">${chartSVG(b)}</div>`;
  if (b.type === 'icon')
    return `<div${a} style="${box(b)}">${iconSVG(b)}</div>`;
  if (b.type === 'ink')
    return `<div${a} style="${box(b)}">${inkSVG(b)}</div>`;
  if (b.type === 'timer')                          // counts down with io/runtime/timer.js
    return `<div${a} data-timer role="timer" data-secs="${Math.max(1, Math.round(+b.seconds || 300))}"${b.auto !== false ? ' data-auto' : ''}${b.sound !== false ? ' data-sound' : ''}`
      + ` data-end="${esc(b.endText ?? t('¡Tiempo!'))}" style="${box(b)}cursor:pointer">${timerSVG(b)}</div>`;
  if (b.type === 'math')
    return `<div${a} class="math" data-latex="${esc(mathTeX(b))}" style="${box(b)}display:flex;align-items:center;${mathCSS(b)}"></div>`;
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

function slideHTML(s, deck, figMap, plan = morphPlan(deck)) {
  // Entry/exit can differ (reveal's "x-in y-out"); speed can be set per slide.
  const tin = ownTransition(s) || deck.defaultTransition || 'slide';
  // As in PowerPoint, a shape reveal (wipe, circle…) belongs to the slide that
  // comes in: the one before leaves with it too, keeping the rest of the screen.
  const vis = deck.slides.filter(x => !x.hidden), next = vis[vis.indexOf(s) + 1];
  const nextIn = next && (ownTransition(next) || deck.defaultTransition);
  const tout = s.transitionOut || (isShapeTransition(nextIn) ? nextIn : null);
  const trans = tout && tout !== tin ? ` data-transition="${tin}-in ${tout}-out"`
    : s.transition || tout ? ` data-transition="${tin}"` : '';
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
  const morphCounts = {};
  const inner = blocksOf(s, deck).map(b00 => {
    const mid = plan.marked.has(s.id) ? plan.key(s, b00) : null;
    const b01 = mid ? { ...b00, morphId: mid } : b00;
    const tm = plan.textMode(s);
    const b0 = tm && b00.type === 'text' ? { ...b01, byText: true, html: morphText(b00.html, tm, morphCounts) } : b01;
    // Effective start time within the click ("with/after previous" resolved).
    const b = b0.animation && tl.has(b0.id) ? { ...b0, animation: { ...b0.animation, delay: tl.get(b0.id).delay } } : b0;
    if (b.type === 'figindex') return figIndexExport(b, deck);
    if (b.type === 'slideref') return slideRefExport(b, s, deck);
    let html = blockHTML(b, s);
    const f = figMap.get(b.id);
    // (The caption goes with its object: it appears, leaves or moves along with it.)
    if (f) html += `<div${animAttrs(b, s).replace(/ data-bid="[^"]*"/, '')} style="position:absolute;left:${b.x}px;top:${b.y + b.h + 4}px;width:${b.w}px;`
      + `text-align:center;font-style:italic;font-size:16px;${animVars(b)}"><span class="caption" style="opacity:.85">${esc(captionLine(f))}</span></div>`;
    return b0.anims?.length ? stepLayers(html, b0, s, tl) : html;
  }).join('\n');
  const notes = s.notes ? `<aside class="notes">${esc(s.notes)}</aside>` : '';
  const aa = (plan.marked.has(s.id) ? ' data-auto-animate' : '') + (s.aaDuration ? ` data-auto-animate-duration="${+s.aaDuration}"` : '') + (s.aaDelay ? ` data-auto-animate-delay="${+s.aaDelay}"` : '');
  return `<section${trans}${speed}${auto}${bg}${aa} data-rv-id="${esc(s.id)}">`
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
  const o = { ...REVEAL_DEFAULTS, ...rv(deck) }, J = jsData;
  return `controls:${!!o.controls}, controlsLayout:${J(o.controlsLayout)}, progress:${!!o.progress}, navigationMode:${J(o.navigationMode)},
   mouseWheel:${!!o.mouseWheel}, shuffle:${!!o.shuffle}, hideInactiveCursor:${!!o.hideInactiveCursor}, jumpToSlide:${!!o.jumpToSlide},
   previewLinks:${!!o.previewLinks}, rtl:${!!o.rtl}, autoAnimateDuration:${+o.autoAnimateDuration || 1}, autoAnimateEasing:${J(o.autoAnimateEasing)},
   autoSlideStoppable:${!!o.autoSlideStoppable}, fragmentInURL:${!inApp && !!o.fragmentInURL},${o.view === 'scroll' ? " view:'scroll', scrollProgress:true," : ''}
   ${o.parallax ? `parallaxBackgroundImage:${J(o.parallax)}, parallaxBackgroundSize:${J(o.parallaxSize || '')},` : ''}`;
}
export function buildHTML(deck = state.deck, opts = {}) {
  return dedupeMedia(buildHTMLRaw(deck, opts));
}
function buildHTMLRaw(deck, { inApp = false } = {}) {
  const { w, h } = deck.size;
  const figMap = figuresMap(deck);
  // Vertical stacks: a slide marked `vertical` goes below the previous visible one.
  const groups = [];
  const canvas = canvasOn(deck);                        // canvas mode: frames on one canvas, no stacks
  for (const s of deck.slides.filter(x => !x.hidden)) {
    if (s.vertical && groups.length && !canvas) groups[groups.length - 1].push(s); else groups.push([s]);
  }
  const paths = slidePaths(deck), flat = [...paths.values()];
  const plan = morphPlan(deck);
  // Background sound: from its slide up to another (or the end), in reveal's order of slides.
  const vis = deck.slides.filter(x => !x.hidden);
  const bgmHTML = vis.flatMap((s, i) => s.blocks.filter(b => b.type === 'audio' && b.until && b.src).map(b => {
    const j = b.until === 'end' ? vis.length - 1 : vis.findIndex(x => x.id === b.until);
    return `<audio data-bgm="${esc(b.id)}" data-from="${i}" data-to="${Math.max(i, j < 0 ? i : j)}" src="${esc(b.src)}"${b.loop ? ' loop' : ''} preload="auto"></audio>`;
  })).join('');
  const slides = groups.map(g => (g.length > 1 ? `<section>\n${g.map(s => slideHTML(s, deck, figMap, plan)).join('\n')}\n</section>` : slideHTML(g[0], deck, figMap, plan))).join('\n')
    // Links typed as a slide number (#/N, N = position in the deck) → reveal's h/v.
    .replace(/href="#\/(\d+)"/g, (m, n) => `href="#/${flat[+n] || n}"`);
  const sn = deck.slideNumber || { show: false };
  const snPos = SLIDENUM_POS[sn.position] || SLIDENUM_POS.br;
  const hasCode = deck.slides.some(s => s.blocks.some(b => b.type === 'code'));
  const hasMath = deck.slides.some(s => s.blocks.some(b => b.type === 'math'));
  const hasInlineMath = deck.slides.some(s => s.blocks.some(b => b.type === 'text' && /\$[^$]/.test(b.html || '')));
  const hasZoomReturn = deck.slides.some(s => s.blocks.some(b => b.type === 'slideref' && b.returnBack));
  const katexNeeded = hasMath || hasInlineMath;
  const hasTrig = deck.slides.some(s => s.blocks.some(b => animsOf(b).some(a => a.trigger)));
  const hasCam = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'camera'));
  const hasPoll = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'poll'));
  const hasZoomable = deck.slides.some(s => s.blocks.some(b => b.type === 'image' && b.zoomable));
  const hasMedia = deck.slides.some(s => !s.hidden && s.blocks.some(needsPlayer));
  const hasTimer = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'timer'));
  const hasModel3d = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'model' && (b.motion || b.clip || b.walk || animsOf(b).some(a => a.effect === 'clip3d'))));
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
 .reveal .rv-code pre{box-shadow:none}
 .reveal .rv-code pre code{max-height:100%;height:100%;box-sizing:border-box;overflow:auto;scrollbar-width:thin;scrollbar-color:#6668 transparent}
 .reveal .rv-code.no-scroll pre code{overflow:hidden}
 .deck-footer{position:fixed;left:12px;bottom:8px;z-index:30;font-size:14px;opacity:.7;color:#fff;mix-blend-mode:difference}
 ${customEffectCSS(deck)}
 ${customTransitionCSS(usedTransitions(deck), deck.size)}
 .reveal .slides section .fragment.rv-path{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-path.visible{translate:var(--dx) var(--dy)}
 .reveal .slides section .fragment.spin360,.reveal .slides section .fragment.clip3d,.reveal .slides section .fragment.draw{opacity:1;visibility:inherit}
 .reveal .fragment.draw .rvd{stroke-dasharray:1;stroke-dashoffset:1;fill-opacity:0}
 .reveal .fragment.draw.visible .rvd{animation:rvDraw var(--anim-dur,1500ms) ease-in-out var(--anim-del,0ms) forwards}
 @keyframes rvDraw{70%{fill-opacity:0}to{stroke-dashoffset:0;fill-opacity:1}}
 [data-goto],[data-href]{cursor:pointer}
 [data-timer].rv-t-low .rv-t-txt,[data-timer].rv-t-low .rv-t-bar{fill:#ff5252} [data-timer].rv-t-low .rv-t-arc{stroke:#ff5252}
 [data-timer].rv-t-done svg{animation:rvBlink 1s ease-in-out 3} @keyframes rvBlink{50%{opacity:.25}}
 ${WRAP_CSS}
 .reveal .slides section .fragment.spin360.visible{animation:rvTurn var(--anim-dur,600ms) ease-in-out var(--anim-del,0ms) both}
 @keyframes rvTurn{from{transform:rotate(0)}to{transform:rotate(360deg)}}
 .reveal .slides section .rv-step{pointer-events:none}.reveal .slides section .rv-step>*{pointer-events:auto}
 .reveal .slides section .fragment.rv-pathc{opacity:1;visibility:inherit}
 .reveal .slides section .fragment.rv-pathc.visible{animation:var(--pk) var(--anim-dur,600ms) ease-in-out var(--anim-del,0ms) both}
 ${pathKeyframes(deck)}
 ${hasTrig ? `[data-bid]{cursor:pointer} .rv-trig.rv-in:not(.on){opacity:0} ${EFFECT_KF_CSS.replace(/\n/g, ' ')}` : ''}
 ${INK_CSS}
 ${canvas ? `.reveal.rv-canvas{background:${deck.canvas.bg || '#0d1117'}} .reveal.rv-canvas .backgrounds{display:none}
 .reveal.rv-canvas .slides>section{display:block!important;visibility:visible!important;opacity:1!important;top:0!important;left:0!important;clip-path:none!important;transform-origin:0 0!important;
   transition:transform var(--rv-fly,1.4s) cubic-bezier(.65,0,.35,1)!important;pointer-events:none}
 .reveal.rv-canvas .slides>section.present{pointer-events:auto}
 html.rv-canvas-overview .reveal.rv-canvas .slides>section{pointer-events:auto;cursor:zoom-in}
 .reveal.rv-canvas .rv-world{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;z-index:1;pointer-events:none;transition:transform var(--rv-fly,1.4s) cubic-bezier(.65,0,.35,1)}` : ''}
</style></head><body>
<div class="reveal${canvas ? ' rv-canvas' : ''}"><div class="slides">${canvas && deck.canvas.image?.src ? `<div class="rv-world"><img alt="" src="${esc(deck.canvas.image.src)}" style="max-width:none;max-height:none;margin:0;position:absolute;left:${deck.canvas.image.x}px;top:${deck.canvas.image.y}px;width:${deck.canvas.image.w}px;height:${deck.canvas.image.h}px"></div>` : ''}
${slides}
</div>${footerText}${logoHTML}</div>${bgmHTML}
<script src="${REVEAL}/dist/reveal.js"></script>
<script src="${REVEAL}/plugin/notes/notes.js"></script>
${rv(deck).zoom !== false ? `<script src="${REVEAL}/plugin/zoom/zoom.js"></script>` : ''}
${rv(deck).search !== false ? `<script src="${REVEAL}/plugin/search/search.js"></script>` : ''}
${hasCode ? `<script src="${REVEAL}/plugin/highlight/highlight.js"></script>` : ''}
<script>
 Reveal.initialize({ width:${w}, height:${h}, margin:0.03, hash:${inApp ? 'false' : 'true'}, respondToHashChanges:true, loop:${deck.loop ? 'true' : 'false'},
   slideNumber:${sn.show ? jsData(sn.format || 'c') : 'false'},
   transition:${jsData(deck.defaultTransition)}, transitionSpeed:${jsData(deck.transitionSpeed)},
   ${revealOptions(deck, inApp)}${canvas ? " center:false, viewDistance:1000, mobileViewDistance:1000, backgroundTransition:'none'," : ''}
   plugins:[ RevealNotes${hasCode ? ', RevealHighlight' : ''}${rv(deck).zoom !== false ? ', RevealZoom' : ''}${rv(deck).search !== false ? ', RevealSearch' : ''} ] });
 ${hasMath ? 'window.addEventListener("load",function(){window.katex&&document.querySelectorAll(".math[data-latex]").forEach(function(el){try{katex.render(el.getAttribute("data-latex"),el,{throwOnError:false,displayMode:true});}catch(e){}});});' : ''}
 ${hasInlineMath ? 'window.addEventListener("load",function(){window.renderMathInElement&&renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false});});' : ''}
 ${hasTrig ? TRIGGER_JS : ''}
 ${hasCam ? CAMERA_JS : ''}
 ${hasPoll ? pollJS(currentPalette(deck).accents) : ''}
 ${hasLive ? liveDataJS() : ''}
 ${hasZoomable ? LIGHTBOX_JS : ''}
 ${canvas ? `${canvasRuntimeDeps()}\ncanvasRuntime(${JSON.stringify(groups.map(g => frameOf(g[0], deck.slides.indexOf(g[0]), deck.size)))}, ${w}, ${h});` : ''}
 ${hasModel3d ? `(${model3dRuntime.toString()})();` : ''}
 ${hasTimer ? `(${timerRuntime.toString()})();` : ''}
 ${bgmHTML ? BGM_JS : ''}
 ${/ data-(goto|href)="/.test(slides) ? LINK_JS : ''}
 ${hasMedia ? `${createMediaPlayer.toString()}\n${revelaMediaRuntime.toString()}\nrevelaMediaRuntime(${JSON.stringify(GIFUCT)});` : ''}
 ${inkJS(w, h, { pen: t('Lápiz'), hl: t('Resaltador'), laser: t('Puntero láser'), color: t('Color de la tinta'), erase: t('Borrar la tinta de la diapositiva'),
   cc: t('Subtítulos en directo'), lang: speechLang(), ccWarn: t('Los subtítulos usan el reconocimiento de voz del navegador: en Chrome y Edge el audio se envía a su servicio de voz. ¿Activarlos?') })}
 ${overviewJS(groups.map(g => (deck.sections || []).find(x => x.id === g[0].sectionId)?.name || ''),
   { title: t('Vista general'), help: t('Flechas e Intro, o clic, para ir · Esc para cerrar') })}
 ${hasZoomReturn ? '(function(){var p=null;document.addEventListener("click",function(e){var a=e.target.closest("a.slide-zoom[data-zoom-return]");if(a){p={t:a.dataset.target,o:a.dataset.origin.split("/"),arrived:false};}});Reveal.on("slidechanged",function(ev){if(!p)return;if(ev.indexh+"/"+(ev.indexv||0)===p.t){p.arrived=true;return;}if(p.arrived){var o=p.o;p=null;setTimeout(function(){Reveal.slide(+o[0],+o[1]);},0);}});})();' : ''}
</script></body></html>`;
}

// The same embedded picture or model used several times (a logo on the master,
// a slide and its Morph twin) is written once: a table read before the slides
// start gives each element its source. The file stays self-contained.
function dedupeMedia(html) {
  const RE = / src="(data:[^"]{2000,})"/g, count = new Map();
  for (const m of html.matchAll(RE)) count.set(m[1], (count.get(m[1]) || 0) + 1);
  const ids = new Map([...count].filter(([, n]) => n > 1).map(([u], i) => [u, 'm' + i]));
  if (!ids.size) return html;
  const out = html.replace(RE, (m, u) => (ids.has(u) ? ` data-rv-src="${ids.get(u)}"` : m));
  const table = `<script>(function(){var M=${jsData(Object.fromEntries([...ids].map(([u, k]) => [k, u])))};`
    + `document.querySelectorAll('[data-rv-src]').forEach(function(el){el.setAttribute('src',M[el.getAttribute('data-rv-src')]);});})();</script>\n`;
  return out.replace(/<script src="[^"]*\/dist\/reveal\.js"><\/script>/, x => table + x);
}

export function exportHTML() {
  download(new Blob([buildHTML()], { type: 'text/html' }), slug(state.deck.name) + '.html');
}

// The inline‑styled blocks of a slide (self‑contained, no external CSS).
export function slideInnerHTML(slide, deck = state.deck) { return blocksOf(slide, deck).map(b => blockHTML(b, slide)).join(''); }
