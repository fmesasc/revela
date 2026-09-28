// The deck as a self-contained reveal.js presentation (HTML export and the
// document shown when presenting), and each object's inline HTML, reused by
// the print and image exports.

import { state } from '../../core/store.js';
import { REVEAL, KATEX, MODEL_VIEWER, GIFUCT } from '../../core/vendor.js';
import { download, slug } from '../files.js';
import { TRIGGER_JS, CAMERA_JS, pollJS, liveDataJS, LIGHTBOX_JS, overviewJS } from '../runtime/scripts.js';
import { createMediaPlayer, revelaMediaRuntime } from '../runtime/media.js';
import { needsPlayer, mediaConfig } from '../../features/live/media.js';
import { shadowCSS, borderCSS, levelCSS, textPadding, webCardHTML, mathTeX, mathCSS, shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, connectorSVG, iconSVG, wordartCSS, tableRowsHTML, inkSVG, tableClass, tableVars, tableCSS } from '../../render/svg.js';
import { googleFontLinks } from '../../features/design/fonts.js';
import { t, speechLang } from '../../i18n/index.js';
import { collectFigures, figuresMap, captionLine, figIndexTitle, slidePaths } from '../../features/document/captions.js';
import { INK_CSS, inkJS } from '../runtime/ink.js';
import { deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { animTimeline, EFFECT_KF, EFFECT_KF_CSS, isEntrance, customTransitionCSS, transitionName, isShapeTransition, pathKeyframesCSS } from '../../features/animation/transitions.js';
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
const ownTransition = s => s.transition && transitionName(s.transition, s.transitionDir);
const usedTransitions = deck => new Set([deck.defaultTransition, ...deck.slides.flatMap(s => [ownTransition(s), s.transitionOut])].filter(Boolean));
function customEffectCSS(deck) {
  const used = new Set();
  deck.slides.forEach(s => s.blocks.forEach(b => { if (b.animation && CUSTOM_KF[b.animation.effect]) used.add(b.animation.effect); }));
  if (!used.size) return '';
  return [...used].map(e => `.reveal .fragment.${e}{opacity:0} .reveal .fragment.${e}.visible{opacity:1;animation:${CUSTOM_KF[e][0]} var(--anim-dur,600ms) ease var(--anim-del,0ms) both}`
    + CUSTOM_KF[e][1]).join('\n');
}

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

// Accessibility of each object in the presentation: its alt text as the
// accessible name, or hidden from screen readers when marked decorative.
// What a slide shows: the master's objects (unless hidden) under its own, and
// no empty placeholders.
export const blocksOf = (s, deck = state.deck) => [...masterBlocksFor(s, deck), ...s.blocks.map(b => styled(b, s, deck))].filter(b => !isEmptyPlaceholder(b));

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
function blockHTMLRaw(b, slide) {
  // When the slide uses Auto‑Animate, a stable data-id lets reveal.js match and
  // morph the same object between consecutive slides (PowerPoint's "Morph").
  // Morph: the object matches its twin on the next slide by id — except text
  // morphing by words/characters, where the words themselves match (morphText).
  const byText = !!b.byText;
  const a = animAttrs(b, slide) + (b.morphId && !byText ? ` data-id="${esc(b.morphId)}"` : '') + ariaAttrs(b);
  if (b.type === 'connector') {
    const { w, h } = state.deck.size;
    const from = slide && slide.blocks.find(x => x.id === b.from);
    const to = slide && slide.blocks.find(x => x.id === b.to);
    return `<div${a} style="${box(b)}pointer-events:none">${connectorSVG(b, from, to, w, h)}</div>`;
  }
  if (b.type === 'text')
    return `<div${a}${b.levels ? ' class="lv"' : ''} style="${box(b)}font-size:${b.fontSize || 40}px;${b.color ? `color:${b.color};` : ''}${b.levels ? levelVars(b) : ''}`
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
      + `${b.html || ''}</div>`;
  if (b.type === 'model')
    return `<model-viewer${a} src="${b.src}" camera-controls ${b.autoRotate !== false ? 'auto-rotate' : ''} `
      + `shadow-intensity="1" style="${box(b)}background:transparent"></model-viewer>`;
  // Video / GIF with segments, autoplay, loop, mute or a colour key: the media
  // player draws it; each segment after the first automatic one is a click.
  if (needsPlayer(b)) {
    const cfg = mediaConfig(b), first = cfg.autoplay ? 1 : 0;
    // No segments and not automatic: one click plays it all (data-seg -1).
    const segs = cfg.segments.length ? cfg.segments.slice(first).map((_, k) => k + first) : cfg.autoplay ? [] : [-1];
    const clicks = segs.map((n, k) => `<span class="fragment rv-seg" data-seg-of="rvm-${b.id}" data-seg="${n}"${b.animation && !b.animation.trigger ? ` data-fragment-index="${b.animation.order + k + 1}"` : ''} style="display:none"></span>`).join('');
    return `<div${a} id="rvm-${b.id}" data-media="${esc(JSON.stringify(cfg))}" style="${box(b)}${b.type === 'image' ? `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)};` : ''}"></div>${clicks}`;
  }
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
  if (b.type === 'embed' && b.display === 'card')
    return `<a${a} class="rv-webcard" href="${esc(b.src || '')}" target="_blank" rel="noopener" style="${box(b)}display:block;text-decoration:none">${webCardHTML(b, t('Abrir la web'))}</a>`;
  if (b.type === 'embed')
    return `<iframe${a} src="${b.src}" referrerpolicy="strict-origin-when-cross-origin"${b.refreshMin ? ` data-refresh-min="${+b.refreshMin}"` : ''} `
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
// Morph (PowerPoint's "Morph", reveal.js auto-animate). Like PowerPoint, it is
// set on the slide it goes INTO; the previous one is marked too (reveal needs
// both). Objects pair up: the same object (duplicated slide), else the same
// kind with the same content (text, picture, shape and colour…), else the same
// placeholder, else the only one of its kind on both slides. Paired objects
// share a morph id; the chain carries on to the next slide.
const plainOf = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const morphSig = b => b.type + '|' + ({ text: plainOf(b.html), image: b.src, shape: `${b.shape}|${b.fill}`, icon: b.icon, math: b.latex, code: b.code,
  chart: b.chartType, table: JSON.stringify(b.rows), video: b.src }[b.type] ?? '');
export function morphPlan(deck) {
  const vis = deck.slides.filter(s => !s.hidden), marked = new Set(), keys = new Map(), textMode = new Map();
  const k = (s, b) => `${s.id}:${b.id}`;
  vis.forEach((s, i) => {
    if (!s.autoAnimate) return;
    marked.add(s.id); if (vis[i - 1]) marked.add(vis[i - 1].id);
    // Morphing by words/characters splits the text of both slides the same way.
    if (s.morphBy) { textMode.set(s.id, s.morphBy); if (vis[i - 1] && !textMode.has(vis[i - 1].id)) textMode.set(vis[i - 1].id, s.morphBy); }
  });
  vis.forEach((s, i) => {
    if (!marked.has(s.id)) return;
    for (const b of s.blocks) keys.set(k(s, b), b.id);
    const prev = vis[i - 1];
    if (!s.autoAnimate || !prev) return;
    const free = new Set(prev.blocks), take = (b, p) => { keys.set(k(s, b), keys.get(k(prev, p)) || p.id); free.delete(p); };
    const pending = [];
    for (const b of s.blocks) { const p = prev.blocks.find(x => x.id === b.id); if (p) take(b, p); else pending.push(b); }
    const rules = [(b, p) => morphSig(b) === morphSig(p), (b, p) => b.type === p.type && b.ph && b.ph === p.ph,
      (b, p) => b.type === p.type && s.blocks.filter(x => x.type === b.type).length === 1 && prev.blocks.filter(x => x.type === b.type).length === 1];
    for (const rule of rules) for (const b of [...pending]) {
      const p = [...free].find(x => rule(b, x)); if (p) { take(b, p); pending.splice(pending.indexOf(b), 1); }
    }
  });
  return { marked, key: (s, b) => keys.get(k(s, b)), textMode: s => textMode.get(s.id) || null };
}

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
    if (f) html += `<div class="caption" style="position:absolute;left:${b.x}px;top:${b.y + b.h + 4}px;width:${b.w}px;`
      + `text-align:center;font-style:italic;font-size:16px;opacity:.85">${esc(captionLine(f))}</div>`;
    return html;
  }).join('\n');
  const notes = s.notes ? `<aside class="notes">${esc(s.notes)}</aside>` : '';
  const aa = (plan.marked.has(s.id) ? ' data-auto-animate' : '') + (s.aaDuration ? ` data-auto-animate-duration="${+s.aaDuration}"` : '') + (s.aaDelay ? ` data-auto-animate-delay="${+s.aaDelay}"` : '');
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
  const plan = morphPlan(deck);
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
  const hasTrig = deck.slides.some(s => s.blocks.some(b => b.animation?.trigger));
  const hasCam = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'camera'));
  const hasPoll = deck.slides.some(s => !s.hidden && s.blocks.some(b => b.type === 'poll'));
  const hasZoomable = deck.slides.some(s => s.blocks.some(b => b.type === 'image' && b.zoomable));
  const hasMedia = deck.slides.some(s => !s.hidden && s.blocks.some(needsPlayer));
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
 ${hasMedia ? `${createMediaPlayer.toString()}\n${revelaMediaRuntime.toString()}\nrevelaMediaRuntime(${JSON.stringify(GIFUCT)});` : ''}
 ${inkJS(w, h, { pen: t('Lápiz'), hl: t('Resaltador'), laser: t('Puntero láser'), color: t('Color de la tinta'), erase: t('Borrar la tinta de la diapositiva'),
   cc: t('Subtítulos en directo'), lang: speechLang(), ccWarn: t('Los subtítulos usan el reconocimiento de voz del navegador: en Chrome y Edge el audio se envía a su servicio de voz. ¿Activarlos?') })}
 ${overviewJS(groups.map(g => (deck.sections || []).find(x => x.id === g[0].sectionId)?.name || ''),
   { title: t('Vista general'), help: t('Flechas e Intro, o clic, para ir · Esc para cerrar') })}
 ${hasZoomReturn ? '(function(){var p=null;document.addEventListener("click",function(e){var a=e.target.closest("a.slide-zoom[data-zoom-return]");if(a){p={t:a.dataset.target,o:a.dataset.origin.split("/"),arrived:false};}});Reveal.on("slidechanged",function(ev){if(!p)return;if(ev.indexh+"/"+(ev.indexv||0)===p.t){p.arrived=true;return;}if(p.arrived){var o=p.o;p=null;setTimeout(function(){Reveal.slide(+o[0],+o[1]);},0);}});})();' : ''}
</script></body></html>`;
}

export function exportHTML() {
  download(new Blob([buildHTML()], { type: 'text/html' }), slug(state.deck.name) + '.html');
}

// The inline‑styled blocks of a slide (self‑contained, no external CSS).
export function slideInnerHTML(slide, deck = state.deck) { return blocksOf(slide, deck).map(b => blockHTML(b, slide)).join(''); }
