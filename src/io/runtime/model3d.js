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
  function stop(mv) { var t = timers.get(mv); if (t) { cancelAnimationFrame(t.raf); clearInterval(t.iv); clearTimeout(t.iv); } timers.delete(mv); mv.style.transform = ''; }
  // smooth: the model came from the slide before (Morph) and has just arrived —
  // the movement starts from where it is, with no jump of the camera.
  // delay: a slide still coming in — the camera takes its starting place now
  // (far, or above) and the movement plays once the slide is in.
  function start(mv, smooth, delay) {
    stop(mv);
    var m = mv.getAttribute('data-motion'), t = {}, t0 = performance.now(), o = smooth && orbitOf(mv), th = o ? o.t : 0;
    timers.set(mv, t);
    if (m === 'swing') { var side = 1; mv.cameraOrbit = '-35deg 75deg ' + R(mv); t.iv = setInterval(function () { side = -side; mv.cameraOrbit = (35 * side) + 'deg 75deg ' + R(mv); }, 2200); }
    else if (m === 'zoom') { mv.interpolationDecay = 200; if (!smooth) { mv.cameraOrbit = '0deg 75deg ' + R(mv, 300); mv.jumpCameraToGoal && mv.jumpCameraToGoal(); }
      t.iv = setTimeout(function () { mv.cameraOrbit = (smooth ? th.toFixed(1) : '0') + 'deg 75deg ' + R(mv); }, Math.max(20, delay || 0)); }
    else if (m === 'top') {
      mv.interpolationDecay = 300;
      if (smooth) { mv.cameraOrbit = th.toFixed(1) + 'deg 5deg ' + R(mv); t.iv = setTimeout(function () { mv.cameraOrbit = '30deg 75deg ' + R(mv); }, 900); }
      else { mv.cameraOrbit = '0deg 5deg ' + R(mv); mv.jumpCameraToGoal && mv.jumpCameraToGoal(); t.iv = setTimeout(function () { mv.cameraOrbit = '30deg 75deg ' + R(mv); }, Math.max(20, delay || 0)); }
    }
    else if (m === 'orbit') {
      (function step(now) { var k = Math.min(1, (now - t0) / 4000), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        mv.cameraOrbit = (th + e * 360) + 'deg 75deg ' + R(mv); mv.jumpCameraToGoal && mv.jumpCameraToGoal(); if (k < 1) t.raf = requestAnimationFrame(step); })(t0);
    } else if (m === 'float') {
      (function step(now) { mv.style.transform = 'translateY(' + (Math.sin((now - t0) / 700) * 14).toFixed(1) + 'px)'; t.raf = requestAnimationFrame(step); })(t0);
    }
  }
  // handed: models that came from the slide before → how long until they arrive.
  // While they travel, a "zoom in on arrival" first takes the camera back (the
  // model shrinks as it moves), then zooms in once it is there; the other
  // movements start when it has arrived.
  function enter(slide, handed) {
    document.querySelectorAll('model-viewer').forEach(function (mv) {
      setup(mv);
      if (!mv.hasAttribute('data-motion')) return;
      if (!(slide && slide.contains(mv))) { stop(mv); return; }
      var wait = handed && handed.get(mv);
      if (wait == null) {                                   // (a slide coming in with a transition: once it's in)
        var tw = handed ? slideIn(slide) : 0, m = mv.getAttribute('data-motion');
        if (!tw || m === 'zoom' || m === 'top') { start(mv, false, tw); return; }
        stop(mv); timers.set(mv, { iv: setTimeout(function () { start(mv); }, tw) }); return;
      }
      stop(mv);
      if (mv.getAttribute('data-motion') === 'zoom' && ['front', 'view', 'turn'].indexOf(mv.getAttribute('data-arrive')) < 0) {   // (those take it back themselves)
        var go = function () { var o = orbitOf(mv); mv.interpolationDecay = wait * 0.45; mv.cameraOrbit = (o ? o.t.toFixed(1) + 'deg ' + o.p.toFixed(1) + 'deg ' : '0deg 75deg ') + R(mv, 300); };
        // (After the camera has been put where the model was — that jump happens on the next frame.)
        var later = function () { setTimeout(go, 80); };
        if (mv.loaded) later(); else mv.addEventListener('load', later, { once: true });
      }
      var t = { iv: setTimeout(function () { start(mv, true); }, wait) }; timers.set(mv, t);
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
  // The same model on the slide before (Morph pairs them by data-id; else the same
  // file): it arrives with the angle and turning it had, and then, as chosen
  // (data-arrive), stays so, turns to face the audience, goes to this slide's
  // view, or takes a full turn on the way ('reset': starts afresh).
  function orbitOf(mv) { try { var o = mv.getCameraOrbit(); return { t: o.theta * 180 / Math.PI, p: o.phi * 180 / Math.PI }; } catch (e) { return null; } }
  function partner(mv, prev) {
    var id = mv.getAttribute('data-id'), src = mv.getAttribute('src');
    if (id) { var byId = prev.querySelector('model-viewer[data-id="' + id.replace(/"/g, '') + '"]'); if (byId) return byId; }
    return [].slice.call(prev.querySelectorAll('model-viewer')).filter(function (x) { return x.getAttribute('src') === src; })[0] || null;
  }
  // How long a slide takes to come in (its transition; reveal.js's speeds).
  function slideIn(sec) {
    var tr = (sec.getAttribute('data-transition') || (window.Reveal && Reveal.getConfig().transition) || 'slide').split(' ')[0].replace(/-in$/, '');
    if (tr === 'none' || sec.hasAttribute('data-auto-animate')) return 0;
    var sp = sec.getAttribute('data-transition-speed') || (window.Reveal && Reveal.getConfig().transitionSpeed) || 'default';
    return { fast: 400, slow: 1200 }[sp] || 800;
  }
  function travel(cur) {
    if (!cur.hasAttribute('data-auto-animate')) return 0;
    var d = parseFloat(cur.getAttribute('data-auto-animate-duration')) || (window.Reveal && Reveal.getConfig().autoAnimateDuration) || 1;
    return d * 1000;
  }
  function handoff(prev, cur) {
    var handed = new Map();
    if (!prev || !cur || prev === cur) return handed;
    [].slice.call(cur.querySelectorAll('model-viewer')).forEach(function (mv) {
      var how = mv.getAttribute('data-arrive') || 'keep'; if (how === 'reset') return;
      var old = partner(mv, prev); if (!old || !old.loaded) return;
      handed.set(mv, Math.max(travel(cur), how === 'turn' ? 2400 + 150 : how === 'keep' ? 0 : 1400 + 150));   // (its own movement starts once the arrival is over)
      var o = orbitOf(old), spin = typeof old.turntableRotation === 'number' ? old.turntableRotation : 0;
      var own = (mv.getAttribute('camera-orbit') || '0deg 75deg auto').split(' '), ownT = parseFloat(own[0]) || 0, ownP = own[1] || '75deg';
      var zoomIn = mv.getAttribute('data-motion') === 'zoom';
      function apply() {
        mv.interpolationDecay = 180;
        if (o) { mv.cameraOrbit = o.t.toFixed(1) + 'deg ' + o.p.toFixed(1) + 'deg ' + R(mv); if (mv.jumpCameraToGoal) mv.jumpCameraToGoal(); }
        if (mv.resetTurntableRotation) mv.resetTurntableRotation(spin);
        if (how === 'keep') return;
        var t0 = performance.now(), dur = how === 'turn' ? 2400 : 1400, from = o ? o.t : ownT, to = how === 'front' ? 0 : ownT;
        if (how === 'turn') to += to >= from ? 360 : -360;
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          if (mv.resetTurntableRotation) mv.resetTurntableRotation(spin * (1 - e));
          // (With "zoom in on arrival", the camera also goes back while it travels: then it zooms in.)
          mv.cameraOrbit = (from + (to - from) * e).toFixed(1) + 'deg ' + (how === 'front' ? '75deg' : ownP) + ' ' + (zoomIn ? R(mv, 105 + 195 * e) : R(mv));
          if (mv.jumpCameraToGoal) mv.jumpCameraToGoal();
          if (k < 1) requestAnimationFrame(step);
          else if (how === 'front') { mv.removeAttribute('auto-rotate'); mv.autoRotate = false; }   // (and it stays facing the audience)
        })(t0);
      }
      if (mv.loaded) apply(); else mv.addEventListener('load', apply, { once: true });
    });
    return handed;
  }
  if (window.Reveal) { Reveal.on('ready', function (e) { enter(e.currentSlide); }); Reveal.on('slidechanged', function (e) { enter(e.currentSlide, handoff(e.previousSlide, e.currentSlide)); }); if (Reveal.isReady()) enter(Reveal.getCurrentSlide());
    Reveal.on('fragmentshown', function (e) { (e.fragments || [e.fragment]).forEach(function (f) { clipStep(f, true); }); });
    Reveal.on('fragmenthidden', function (e) { (e.fragments || [e.fragment]).forEach(function (f) { clipStep(f, false); }); }); }
  return { enter: enter, handoff: handoff, start: start, stop: stop, move: move, clip: function (mv, name, once) { playClip(mv, name, once); if (once) mv.addEventListener('finished', function () { rest(mv); }, { once: true }); } };
}
