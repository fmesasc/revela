// 3D objects (model-viewer) and how they move:
// - the model's own animations (a robot dancing, a fox running…): which one
//   (clip; '*' = the first), looping or once, and its speed;
// - turning by itself (autoRotate) at a speed and direction (spin, °/s);
// - a camera movement when its slide appears (motion): swing, zoom in, a full
//   turn, float up and down, or look from above.
// The same attributes are used in the editor and in the exported presentation;
// the camera movements run with model3dRuntime (embedded as source).

export const MOTIONS_3D = [
  ['none', 'Ninguno'], ['swing', 'Balanceo'], ['zoom', 'Acercar al entrar'], ['orbit', 'Vuelta completa al entrar'],
  ['float', 'Flotar'], ['top', 'Desde arriba al entrar'],
];

// model-viewer attributes for a block, as [name, value] pairs ('' = boolean).
export function modelAttrs(b) {
  const a = [['src', b.src || ''], ['camera-controls', ''], ['shadow-intensity', '1'], ['interaction-prompt', 'none']];
  if (b.autoRotate !== false && (b.motion || 'none') === 'none') {
    a.push(['auto-rotate', ''], ['auto-rotate-delay', '0']);
    if (b.spin) a.push(['rotation-per-second', `${b.spin}deg`]);
  }
  if (b.clip) {
    a.push(['autoplay', '']);
    if (b.clip !== '*') a.push(['animation-name', b.clip]);
    if (b.clipOnce) a.push(['data-once', '']);
    if (b.clipSpeed && b.clipSpeed !== 1) a.push(['data-speed', String(b.clipSpeed)]);
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
  return { start: start, stop: stop };
}
