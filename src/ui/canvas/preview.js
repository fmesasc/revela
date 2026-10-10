// Animation preview in the editor (Animations ▸ Preview): plays the slide's
// entrance, emphasis and exit effects in order on the canvas.

import { openPdf, pageImage, pdfTransform } from '../../features/content/files.js';
import { currentSlide } from '../../core/store.js';
import { animTimeline, animEntries, EFFECT_KF, motionFrames, SIZE_FX, animScale, MEDIA_FX } from '../../features/animation/transitions.js';
import { mediaStepInEditor } from './mediaview.js';
import { FX, fxVars, fxMask, FX_KF_CSS, FX_PROPS_CSS } from '../../features/animation/fxcatalog.js';

// PowerPoint's other effects (fxcatalog.js) in the editor: their keyframes, once.
function fxStyles() {
  if (typeof document === 'undefined' || document.getElementById('rv-fx-kf')) return;
  const st = document.createElement('style'); st.id = 'rv-fx-kf'; st.textContent = FX_PROPS_CSS + '\n' + FX_KF_CSS; document.head.appendChild(st);
}
// Its options as CSS variables on the object (a direction, a colour), and its mask while it plays; undone after.
function fxSetup(el, anim, dur = 600, delay = 0) {
  const f = FX[anim.effect]; if (!f) return () => {};
  fxStyles();
  const vars = fxVars(anim).split(';').filter(Boolean).map(x => x.split(/:(.*)/s).slice(0, 2));
  vars.forEach(([k, v]) => el.style.setProperty(k, v));
  const m = fxMask(anim.effect); if (m) { el.style.maskImage = m; el.style.webkitMaskImage = m; }
  // (Fill and line colour change the shape's drawing — its SVG —, as in the presentation: seen here too.)
  const prop = anim.effect === 'fill-color' ? 'fill' : anim.effect === 'line-color' ? 'stroke' : null, col = vars.find(([k]) => k === '--fx-color')?.[1];
  const parts = prop ? [...el.querySelectorAll('svg :is(polygon,path,rect,ellipse,circle,line,polyline)')].filter(p => (p.getAttribute(prop) || 'none') !== 'none' && p.getAttribute(prop) !== 'transparent') : [];
  const t = parts.length ? setTimeout(() => parts.forEach(p => { p.style.transition = `${prop} ${dur}ms ease`; p.style[prop] = col; }), delay) : null;
  return () => { clearTimeout(t); parts.forEach(p => { p.style.transition = ''; p.style[prop] = ''; });
    vars.forEach(([k]) => el.style.removeProperty(k)); if (m) { el.style.maskImage = ''; el.style.webkitMaskImage = ''; } };
}
import { stage } from './canvas.js';
import { model3dRuntime } from '../../io/runtime/model3d.js';
import { soundRuntime } from '../../io/runtime/sounds.js';

let models3d = null;                              // walking 3D models (their clip while they move)
function walkIn(el, dur, delay) {
  const mv = el.querySelector('model-viewer[data-move-clip]'); if (!mv) return;
  models3d ||= model3dRuntime();
  setTimeout(() => models3d.move(mv, dur, el), delay);
}

// ---- Animation preview -----------------------------------------------------
export const KEYFRAME = EFFECT_KF;
// "Draw": the outlines trace themselves (PowerPoint's ink replay), the fill comes at the end.
const DRAW = [{ strokeDasharray: '1', strokeDashoffset: '1', fillOpacity: 0 }, { fillOpacity: 0, offset: 0.7 }, { strokeDasharray: '1', strokeDashoffset: '0', fillOpacity: 1 }];
function drawIn(el, dur, delay) {
  const parts = el.querySelectorAll('svg .rvd');
  if (!parts.length) return false;
  const out = [...parts].map(p => p.animate(DRAW, { duration: dur, delay, easing: 'ease-in-out', fill: 'backwards' }));
  return out;
}
// A PDF's "page and zoom" step, previewed: its page drawn, then moved and enlarged
// as in the presentation (and put back as it was at the end).
let pdfState = new WeakMap();
function pdfStepPreview(el, b, a, when, dur, restore) {
  const img = el.querySelector('.file-blk img'); if (!img) return;
  if (!pdfState.has(img)) {
    pdfState.set(img, { src: img.src, t: '' }); img.style.transformOrigin = '0 0';
    restore.push(() => { img.src = pdfState.get(img).src; img.style.transition = ''; img.style.transform = ''; pdfState.delete(img); });
  }
  const page = openPdf(b.src).then(pdf => pageImage(pdf, +a.page || 1, 1400));
  setTimeout(async () => {
    const im = await page; if (!pdfState.has(img)) return;
    if (img.src !== im.src) { img.style.transition = 'none'; img.src = im.src; }
    const tr = pdfTransform(b.w, b.h, im.w / im.h, { x: +(a.zx ?? 0.5), y: +(a.zy ?? 0.5), s: +a.zs || 1 });
    // (The picture covers the box, the page contained in it: the same move and scale as the presentation's layer.)
    requestAnimationFrame(() => { img.style.transition = `transform ${dur}ms ease-in-out`; img.style.transform = `translate(${tr.tx}px, ${tr.ty}px) scale(${tr.s})`; });
  }, when);
}
// The animation's sound, as it starts (the same sounds as in the presentation).
let snd = null;
function soundOf(anim, delay) { if (anim.sound) setTimeout(() => (snd ||= soundRuntime()).play(anim.sound, anim.soundSrc), delay); }
export function animateEl(el, anim, dur, delay) {
  const effect = anim.effect;
  soundOf(anim, delay);
  if (effect === 'draw' && drawIn(el, dur, delay)) return;
  if (effect === 'path') {                        // motion path: along it (turning, if so) and back
    const model = !!el.querySelector('model-viewer');
    el.animate(motionFrames(anim).map(([x, y, r]) => ({ translate: `${x}px ${y}px`, rotate: model ? '0deg' : `${r}deg` })),
      { duration: dur, delay, easing: 'ease-in-out', fill: 'none' });
    walkIn(el, dur, delay);
    return;
  }
  const kf = KEYFRAME[effect] || 'rvIn', undo = fxSetup(el, anim, dur, delay);
  if (SIZE_FX.includes(effect)) el.style.setProperty('--anim-scale', animScale(anim));
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = `${kf} ${dur}ms ease ${delay}ms ${FX[effect]?.reverse ? 'reverse ' : ''}both`;
  walkIn(el, dur, delay);
  // (A colour change is seen a moment before going back.)
  const done = () => { el.style.animation = ''; setTimeout(undo, FX[effect]?.colour ? 600 : 0); el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
}
// A named CSS animation's keyframes (to play several on one object, added up).
const kfCache = new Map();
function keyframesOf(name) {
  if (kfCache.has(name)) return kfCache.get(name);
  fxStyles();
  const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;animation:${name} 1s`; stage.appendChild(d);
  const kf = d.getAnimations()[0]?.effect?.getKeyframes().map(({ offset, computedOffset, easing, composite, ...k }) => ({ offset, ...k })) || [];
  d.remove(); kfCache.set(name, kf); return kf;
}
// Play the slide's animations in order, in the editor. An object with several
// plays them one after another, each adding to where the previous left it.
export function playAnimations() {
  // Clicks play one after another; inside a click, the timeline gives each start.
  const slide = currentSlide(), tl = animTimeline(slide);
  const ends = new Map();                       // step → when it finishes
  for (const { step, delay, dur } of tl.values()) ends.set(step, Math.max(ends.get(step) || 0, delay + dur));
  const offset = new Map(); let acc = 0;
  for (const st of [...ends.keys()].sort((a, b) => a - b)) { offset.set(st, acc); acc += ends.get(st); }
  const played = [], restore = [];
  for (const { b, a, i, key } of animEntries(slide)) {
    const at = tl.get(key); if (!at) continue;
    const el = stage.querySelector(`.block[data-id="${b.id}"]`); if (!el) continue;
    const when = offset.get(at.step) + at.delay;
    if (a.effect === 'pdfview') { soundOf(a, when); pdfStepPreview(el, b, a, when, at.dur, restore); continue; }
    if (MEDIA_FX.includes(a.effect)) { soundOf(a, when); setTimeout(() => mediaStepInEditor(b.id, a.effect), when); continue; }
    if (!b.anims?.length) { animateEl(el, a, at.dur, when); continue; }
    // A sequence: every step kept (added up) until the end, then all undone.
    const opts = { duration: at.dur, delay: when, easing: 'ease-in-out', fill: 'forwards', composite: i ? 'add' : 'replace' };
    soundOf(a, when);
    if (a.effect === 'draw' && drawIn(el, at.dur, when)) continue;
    if (a.effect === 'clip3d') {
      const mv = el.querySelector('model-viewer'); models3d ||= model3dRuntime();
      if (mv) setTimeout(() => models3d.clip(mv, a.clip || '*', !!a.once), when);
      continue;
    }
    const model = !!el.querySelector('model-viewer');
    const frames = a.effect === 'path' ? motionFrames(a).map(([x, y, r]) => ({ translate: `${x}px ${y}px`, rotate: model ? '0deg' : `${r}deg` }))
      : SIZE_FX.includes(a.effect) ? [{ transform: 'none' }, { transform: `scale(${animScale(a)})` }]
      : keyframesOf(KEYFRAME[a.effect] || 'rvIn');
    const undo = fxSetup(el, a, at.dur, when); restore.push(undo);
    played.push(el.animate(FX[a.effect]?.reverse ? [...frames].reverse().map((k, n, all) => ({ ...k, offset: k.offset == null ? null : 1 - k.offset })) : frames, opts));
    walkIn(el, at.dur, when);
  }
  if (played.length || restore.length) setTimeout(() => { played.forEach(p => p.cancel()); restore.forEach(f => f()); }, acc + 1200);
}
