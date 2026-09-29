// 3D objects (model-viewer) and how they move:
// - the model's own animations (a robot dancing, a fox running…): which one
//   (clip; '*' = the first), looping or once, and its speed;
// - turning by itself (autoRotate) at a speed and direction (spin, °/s);
// - a camera movement when its slide appears (motion): swing, zoom in, a full
//   turn, float up and down, or look from above.
// - walking (walk): while the object moves on the slide (its motion path, or
//   any animation of it) one clip plays — "Walk" — and it turns towards where
//   it goes; on arrival another clip (once, then back to rest, or for good)
//   and, if wanted, it turns to face the audience.
// The same attributes are used in the editor and in the exported presentation;
// the camera movements and walking run with model3dRuntime (embedded as source).

export const MOTIONS_3D = [
  ['none', 'Ninguno'], ['swing', 'Balanceo'], ['zoom', 'Acercar al entrar'], ['orbit', 'Vuelta completa al entrar'],
  ['float', 'Flotar'], ['top', 'Desde arriba al entrar'],
];

// Where the camera looks from (PowerPoint's "3D model views").
import { readModel, writeGLB } from './autorig.js';

export const VIEWS_3D = [['', 'Libre'], ['front', 'De frente'], ['three', 'Tres cuartos'], ['side', 'De lado'], ['back', 'Por detrás'], ['top', 'Desde arriba'], ['low', 'Desde abajo']];
const ORBITS = { front: '0deg 75deg auto', three: '35deg 70deg auto', side: '90deg 75deg auto', back: '180deg 75deg auto', top: '0deg 8deg auto', low: '20deg 115deg auto' };

// model-viewer attributes for a block, as [name, value] pairs ('' = boolean).
export function modelAttrs(b) {
  const a = [['src', b.src || ''], ['camera-controls', ''], ['shadow-intensity', '1'], ['interaction-prompt', 'none']];
  if (ORBITS[b.view]) a.push(['camera-orbit', ORBITS[b.view]]);
  const walk = b.walk?.clip ? b.walk : null;
  if (b.autoRotate !== false && (b.motion || 'none') === 'none' && !walk) {
    a.push(['auto-rotate', ''], ['auto-rotate-delay', '0']);
    if (b.spin) a.push(['rotation-per-second', `${b.spin}deg`]);
  }
  if (b.clip) {
    a.push(['autoplay', '']);
    if (b.clip !== '*') a.push(['animation-name', b.clip]);
    if (b.clipOnce) a.push(['data-once', '']);
    if (b.clipSpeed && b.clipSpeed !== 1) a.push(['data-speed', String(b.clipSpeed)]);
  }
  if (walk) {
    if (!b.clip && walk.clip !== '*') a.push(['animation-name', walk.clip]);          // still, on its first frame, until it moves
    a.push(['data-move-clip', walk.clip], ['animation-crossfade-duration', '350']);
    if (walk.end) a.push(['data-end-clip', walk.end]);
    if (walk.end && walk.endOnce) a.push(['data-end-once', '']);
    if (walk.face !== false) a.push(['data-face', '']);
    if (walk.look !== false) a.push(['data-look', '']);
  }
  if (b.motion && b.motion !== 'none') a.push(['data-motion', b.motion]);
  return a;
}
export const modelAttrsHTML = b => modelAttrs(b).map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)).join('');

// Presentation side: once per <model-viewer>, speed/once of its animation, and
// the camera movement each time its slide is shown (reveal.js events).
export function model3dRuntime() {
  var timers = new WeakMap();
  function setup(mv) {
    if (mv.__rv) return; mv.__rv = true;
    mv.addEventListener('load', function () {
      var sp = parseFloat(mv.getAttribute('data-speed')); if (sp) mv.timeScale = sp;
      if (mv.hasAttribute('data-once') && mv.hasAttribute('autoplay')) { mv.pause(); mv.play({ repetitions: 1 }); }
    });
  }
  // Walking: the clip while it moves, turning towards where it goes (by
  // turning the camera round it: model-viewer eases that), then the arrival.
  var walks = new WeakMap();
  function clipName(mv, n) { var list = mv.availableAnimations || []; return n === '*' ? list[0] : (list.indexOf(n) >= 0 ? n : null); }
  function playClip(mv, n, once) { n = clipName(mv, n); if (!n) { mv.pause(); return; } mv.animationName = n; mv.play(once ? { repetitions: 1 } : undefined); }
  function rest(mv) { var idle = mv.hasAttribute('autoplay') ? (mv.getAttribute('animation-name') || '*') : null; if (idle) playClip(mv, idle); else mv.pause(); }
  function turn(mv, yaw) { var o = (mv.getAttribute('camera-orbit') || '0deg 75deg auto').split(' '); mv.cameraOrbit = (parseFloat(o[0]) - yaw).toFixed(1) + 'deg ' + (o[1] || '75deg') + ' auto'; }
  function offset(el) { var v = getComputedStyle(el).translate; if (!v || v === 'none') return [0, 0]; var p = v.split(' '); return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0]; }
  function move(mv, dur, el) {
    var clip = mv.getAttribute('data-move-clip'); if (!clip) return;
    var w = walks.get(mv), now0 = performance.now();
    if (w && now0 - w.t0 < 80) return;                   // (several properties start together)
    if (w) cancelAnimationFrame(w.raf);
    w = { t0: now0 }; walks.set(mv, w); el = el || mv;
    playClip(mv, clip);
    var last = null, face = mv.hasAttribute('data-face'), yaw = null;
    (function step(now) {
      var p = offset(el);
      if (face && last) { var dx = p[0] - last[0], dy = p[1] - last[1];
        if (Math.hypot(dx, dy) > 0.4) { var y = Math.atan2(dx, dy) * 180 / Math.PI; if (yaw === null || Math.abs(((y - yaw + 540) % 360) - 180) > 2) { yaw = y; turn(mv, y); } } }
      last = p;
      if (now - w.t0 < dur) w.raf = requestAnimationFrame(step); else arrive(mv);
    })(now0);
  }
  function arrive(mv) {
    walks.delete(mv);
    if (mv.hasAttribute('data-look')) turn(mv, 0);
    var end = mv.getAttribute('data-end-clip');
    if (!end) { rest(mv); return; }
    var once = mv.hasAttribute('data-end-once');
    playClip(mv, end, once);
    if (once) mv.addEventListener('finished', function () { rest(mv); }, { once: true });
  }
  function secs(v) { v = String(v || '').split(',')[0].trim(); return v.slice(-2) === 'ms' ? parseFloat(v) : parseFloat(v) * 1000 || 0; }
  // In the presentation it moves by CSS (a transition of its position, or the
  // keyframes of a curved path): it walks from when that starts, for as long.
  document.addEventListener('transitionstart', function (e) {
    var mv = e.target; if (mv.tagName !== 'MODEL-VIEWER' || !mv.hasAttribute('data-move-clip')) return;
    if (['translate', 'opacity', 'transform'].indexOf(e.propertyName) < 0) return;
    move(mv, secs(getComputedStyle(mv).transitionDuration));
  }, true);
  document.addEventListener('animationstart', function (e) {
    var mv = e.target; if (mv.tagName !== 'MODEL-VIEWER' || !mv.hasAttribute('data-move-clip')) return;
    move(mv, secs(getComputedStyle(mv).animationDuration));
  }, true);
  function stop(mv) { var t = timers.get(mv); if (t) { cancelAnimationFrame(t.raf); clearInterval(t.iv); } timers.delete(mv); mv.style.transform = ''; }
  function start(mv) {
    stop(mv);
    var m = mv.getAttribute('data-motion'), t = {}, t0 = performance.now();
    timers.set(mv, t);
    if (m === 'swing') { var side = 1; mv.cameraOrbit = '-35deg 75deg auto'; t.iv = setInterval(function () { side = -side; mv.cameraOrbit = (35 * side) + 'deg 75deg auto'; }, 2200); }
    else if (m === 'zoom') { mv.interpolationDecay = 200; mv.cameraOrbit = '0deg 75deg 300%'; mv.jumpCameraToGoal && mv.jumpCameraToGoal(); requestAnimationFrame(function () { mv.cameraOrbit = '0deg 75deg auto'; }); }
    else if (m === 'top') { mv.interpolationDecay = 300; mv.cameraOrbit = '0deg 5deg auto'; mv.jumpCameraToGoal && mv.jumpCameraToGoal(); requestAnimationFrame(function () { mv.cameraOrbit = '30deg 75deg auto'; }); }
    else if (m === 'orbit') {
      (function step(now) { var k = Math.min(1, (now - t0) / 4000), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        mv.cameraOrbit = (e * 360) + 'deg 75deg auto'; mv.jumpCameraToGoal && mv.jumpCameraToGoal(); if (k < 1) t.raf = requestAnimationFrame(step); })(t0);
    } else if (m === 'float') {
      (function step(now) { mv.style.transform = 'translateY(' + (Math.sin((now - t0) / 700) * 14).toFixed(1) + 'px)'; t.raf = requestAnimationFrame(step); })(t0);
    }
  }
  function enter(slide) {
    document.querySelectorAll('model-viewer').forEach(function (mv) {
      setup(mv);
      if (!mv.hasAttribute('data-motion')) return;
      if (slide && slide.contains(mv)) start(mv); else stop(mv);
    });
  }
  if (window.Reveal) { Reveal.on('ready', function (e) { enter(e.currentSlide); }); Reveal.on('slidechanged', function (e) { enter(e.currentSlide); }); if (Reveal.isReady()) enter(Reveal.getCurrentSlide()); }
  return { start: start, stop: stop, move: move };
}

// The model as a file to keep: one .glb with everything in it (meshes,
// textures, animations). A .gltf with its data inside becomes a .glb too.
export async function modelFile(b) {
  const name = (String(b.alt || b.caption || 'modelo').split(' — ')[0].replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'modelo') + '.glb';
  let src = b.src || '';
  if (!/^data:model\/gltf-binary/.test(src)) src = writeGLB(await readModel(src));
  const bin = atob(src.slice(src.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return { blob: new Blob([u8], { type: 'model/gltf-binary' }), name };
}
