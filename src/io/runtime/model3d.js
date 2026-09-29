// 3D objects inside the presentation (and in the editor's previews): runs as
// source embedded in the exported page (toString), so it imports nothing.

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
  // The camera's distance: further away when the view has room around the model (data-bleed).
  function R(mv, pct) { var k = parseFloat(mv.getAttribute('data-bleed')) || 1; return pct ? Math.round(pct * k) + '%' : (k === 1 ? 'auto' : Math.round(105 * k) + '%'); }
  function turn(mv, yaw) { var o = (mv.getAttribute('camera-orbit') || '0deg 75deg auto').split(' '); mv.cameraOrbit = (parseFloat(o[0]) - yaw).toFixed(1) + 'deg ' + (o[1] || '75deg') + ' ' + R(mv); }
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
  // (Or a layer around it, for its next animations.)
  function walker(el) { if (el.tagName === 'MODEL-VIEWER') return el.hasAttribute('data-move-clip') ? el : null;
    return el.classList && el.classList.contains('rv-step') && !el.hasAttribute('data-clip') ? el.querySelector('model-viewer[data-move-clip]') : null; }
  document.addEventListener('transitionstart', function (e) {
    var mv = walker(e.target); if (!mv) return;
    if (['translate', 'opacity', 'transform'].indexOf(e.propertyName) < 0) return;
    move(mv, secs(getComputedStyle(e.target).transitionDuration), e.target);
  }, true);
  document.addEventListener('animationstart', function (e) {
    var mv = walker(e.target); if (!mv || !/^rvP/.test(e.animationName)) return;
    move(mv, secs(getComputedStyle(e.target).animationDuration), e.target);
  }, true);
  // A step that plays one of the model's own animations (once, then back to rest, or on).
  function clipStep(f, show) {
    var name = f.getAttribute('data-clip'); if (!name) return;
    var mv = f.tagName === 'MODEL-VIEWER' ? f : f.querySelector('model-viewer'); if (!mv) return;
    if (!show) { rest(mv); return; }
    setTimeout(function () {
      var once = f.hasAttribute('data-clip-once'); playClip(mv, name, once);
      if (once) mv.addEventListener('finished', function () { rest(mv); }, { once: true });
    }, secs(getComputedStyle(f).getPropertyValue('--anim-del')));
  }
  function stop(mv) { var t = timers.get(mv); if (t) { cancelAnimationFrame(t.raf); clearInterval(t.iv); } timers.delete(mv); mv.style.transform = ''; }
  function start(mv) {
    stop(mv);
    var m = mv.getAttribute('data-motion'), t = {}, t0 = performance.now();
    timers.set(mv, t);
    if (m === 'swing') { var side = 1; mv.cameraOrbit = '-35deg 75deg ' + R(mv); t.iv = setInterval(function () { side = -side; mv.cameraOrbit = (35 * side) + 'deg 75deg ' + R(mv); }, 2200); }
    else if (m === 'zoom') { mv.interpolationDecay = 200; mv.cameraOrbit = '0deg 75deg ' + R(mv, 300); mv.jumpCameraToGoal && mv.jumpCameraToGoal(); requestAnimationFrame(function () { mv.cameraOrbit = '0deg 75deg ' + R(mv); }); }
    else if (m === 'top') { mv.interpolationDecay = 300; mv.cameraOrbit = '0deg 5deg ' + R(mv); mv.jumpCameraToGoal && mv.jumpCameraToGoal(); requestAnimationFrame(function () { mv.cameraOrbit = '30deg 75deg ' + R(mv); }); }
    else if (m === 'orbit') {
      (function step(now) { var k = Math.min(1, (now - t0) / 4000), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        mv.cameraOrbit = (e * 360) + 'deg 75deg ' + R(mv); mv.jumpCameraToGoal && mv.jumpCameraToGoal(); if (k < 1) t.raf = requestAnimationFrame(step); })(t0);
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
  // With room around it, only the model's own box (the middle of the view) takes the
  // pointer to turn it; around, clicks reach what is under (a link, a button).
  if (window.Reveal) document.addEventListener('pointermove', function (e) {
    document.querySelectorAll('model-viewer[data-bleed]').forEach(function (mv) {
      var k = parseFloat(mv.getAttribute('data-bleed')) || 1, r = mv.getBoundingClientRect(), mx = r.width * (1 - 1 / k) / 2, my = r.height * (1 - 1 / k) / 2;
      var inside = e.clientX > r.left + mx && e.clientX < r.right - mx && e.clientY > r.top + my && e.clientY < r.bottom - my;
      mv.style.pointerEvents = inside ? 'auto' : 'none';
    });
  }, { passive: true });
  if (window.Reveal) { Reveal.on('ready', function (e) { enter(e.currentSlide); }); Reveal.on('slidechanged', function (e) { enter(e.currentSlide); }); if (Reveal.isReady()) enter(Reveal.getCurrentSlide());
    Reveal.on('fragmentshown', function (e) { (e.fragments || [e.fragment]).forEach(function (f) { clipStep(f, true); }); });
    Reveal.on('fragmenthidden', function (e) { (e.fragments || [e.fragment]).forEach(function (f) { clipStep(f, false); }); }); }
  return { start: start, stop: stop, move: move, clip: function (mv, name, once) { playClip(mv, name, once); if (once) mv.addEventListener('finished', function () { rest(mv); }, { once: true }); } };
}
