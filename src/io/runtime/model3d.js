// 3D objects inside the presentation (and in the editor's previews): runs as
// source embedded in the exported page (toString), so it imports nothing.

// Presentation side: once per <model-viewer>, speed/once of its animation, and
// the camera movement each time its slide is shown (reveal.js events).
export function model3dRuntime() {
  var timers = new WeakMap();
  function setup(mv) {
    if (mv.__rv) return; mv.__rv = true;
    mv.__spin = mv.hasAttribute('auto-rotate');             // (its own turning: an arrival "facing the audience" stops it, only there)
    // Its picture until it has loaded (a slow connection), in the model's own box.
    // (Not a photo — JPEG, with its own background: a grey box on the slide.)
    var p = mv.getAttribute('data-poster');
    if (p && !/^data:image\/jpe?g|\.jpe?g(\?|#|$)/i.test(p) && !mv.loaded && !mv.querySelector('[slot="poster"]')) {
      var k = parseFloat(mv.getAttribute('data-bleed')) || 1, m = ((1 - 1 / k) * 50).toFixed(2) + '%', d = document.createElement('div');
      d.slot = 'poster'; d.style.cssText = 'position:absolute;inset:' + m + ';background:center/contain no-repeat;pointer-events:none';
      d.style.backgroundImage = 'url("' + p.replace(/["\\]/g, '') + '")'; mv.appendChild(d);
    }
    mv.addEventListener('load', function () {
      var sp = parseFloat(mv.getAttribute('data-speed')); if (sp) mv.timeScale = sp;
      if (mv.hasAttribute('data-once') && mv.hasAttribute('autoplay')) { mv.pause(); mv.play({ repetitions: 1 }); }
    });
  }
  // Walking: the clip while it moves, turning towards where it goes (by
  // turning the camera round it: model-viewer eases that), then the arrival.
  var walks = new WeakMap();
  function clipName(mv, n) { var list = mv.availableAnimations || []; return n === '*' ? list[0] : (list.indexOf(n) >= 0 ? n : null); }
  // (A new clip name is applied by model-viewer on its next update, which plays it
  // looping: "once" is asked for after that, or it would never stop.)
  function playClip(mv, n, once) {
    mv.__step = false; n = clipName(mv, n); var k = mv.__clip = {};
    if (!n) { mv.pause(); return; }
    var go = function () { if (mv.__clip === k) mv.play(once ? { repetitions: 1 } : undefined); };
    if (mv.animationName !== n && mv.updateComplete) { mv.animationName = n; mv.updateComplete.then(go); } else { mv.animationName = n; go(); }
  }
  function rest(mv) { var idle = mv.hasAttribute('autoplay') ? (mv.getAttribute('animation-name') || '*') : null; mv.__step = false; if (idle) playClip(mv, idle); else mv.pause(); }
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
    if (mv.__step) return;                                // (a step "after the previous" already plays its own: a wave on arrival)
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
      var once = f.hasAttribute('data-clip-once'); playClip(mv, name, once); mv.__step = true;
      if (once) mv.addEventListener('finished', function () { if (mv.__step) rest(mv); }, { once: true });
    }, secs(getComputedStyle(f).getPropertyValue('--anim-del')));
  }
  function stop(mv) { var t = timers.get(mv); if (t) { cancelAnimationFrame(t.raf); clearInterval(t.iv); clearTimeout(t.iv); } timers.delete(mv); mv.style.marginTop = ''; }
  // smooth: the model came from the slide before (Morph) and has just arrived —
  // the movement starts from where it is, with no jump of the camera.
  // delay: a slide still coming in — the camera takes its starting place now
  // (far, or above) and the movement plays once the slide is in.
  function start(mv, smooth, delay) {
    stop(mv);
    if (!mv.loaded) {                                       // (not there yet: the movement waits for it, not seen half over)
      var w = {}; timers.set(mv, w);
      mv.addEventListener('load', function () { if (timers.get(mv) === w) start(mv, smooth); }, { once: true }); return;
    }
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
      // (By its margin: its transform has its turn and flip, its translate the path it moves along.)
      (function step(now) { mv.style.marginTop = (Math.sin((now - t0) / 700) * 14).toFixed(1) + 'px'; t.raf = requestAnimationFrame(step); })(t0);
    }
  }
  // The models of this slide and the next ones load now, not when they come into
  // view (model-viewer waits for that): else a slide arrives with an empty box.
  function preload(slide) {
    var all = window.Reveal ? Reveal.getSlides() : [], i = all.indexOf(slide);
    all.slice(Math.max(0, i - 1), i + 3).concat(slide ? [slide] : []).forEach(function (s) {
      s.querySelectorAll('model-viewer:not([loading="eager"])').forEach(function (mv) { mv.setAttribute('loading', 'eager'); });
    });
  }
  // handed: models that came from the slide before → how long until they arrive.
  // While they travel, a "zoom in on arrival" first takes the camera back (the
  // model shrinks as it moves), then zooms in once it is there; the other
  // movements start when it has arrived.
  function enter(slide, handed, prev) {
    preload(slide);
    document.querySelectorAll('model-viewer').forEach(function (mv) {
      setup(mv);
      var here = slide && slide.contains(mv);
      if (here && mv.__spin && !mv.hasAttribute('auto-rotate') && !(handed && handed.has(mv) && mv.getAttribute('data-arrive') === 'front')) mv.setAttribute('auto-rotate', '');
      if (!mv.hasAttribute('data-motion')) return;
      if (!here) { stop(mv); return; }
      var wait = handed && handed.get(mv);
      if (wait == null) {                                   // (a slide coming in with a transition: once it's in)
        var tw = handed ? slideIn(slide, prev) : 0, m = mv.getAttribute('data-motion');
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
  // Morph between two slides: reveal.js does it only when both are marked.
  function morphs(prev, cur) { return !!(prev && cur && prev.hasAttribute('data-auto-animate') && cur.hasAttribute('data-auto-animate')); }
  // How long a slide takes to come in (its transition; reveal.js's speeds).
  function slideIn(sec, prev) {
    var tr = (sec.getAttribute('data-transition') || (window.Reveal && Reveal.getConfig().transition) || 'slide').split(' ')[0].replace(/-in$/, '');
    if (tr === 'none' || morphs(prev, sec)) return 0;
    var sp = sec.getAttribute('data-transition-speed') || (window.Reveal && Reveal.getConfig().transitionSpeed) || 'default';
    return { fast: 400, slow: 1200 }[sp] || 800;
  }
  function travel(prev, cur) {
    if (!morphs(prev, cur)) return 0;
    var d = parseFloat(cur.getAttribute('data-auto-animate-duration')) || (window.Reveal && Reveal.getConfig().autoAnimateDuration) || 1;
    return d * 1000;
  }
  // The moment of the change: the model on the new slide still shows whatever it last drew (its default
  // view, drawn while it waited hidden) until it draws again, a frame or two later — a flash of the
  // wrong pose before it takes over. Over it, a copy of the other one's last picture (which is exactly
  // what should be there), inside it (so Morph's movement carries it), until it has drawn itself.
  function bridge(mv, old) {
    var src = old.shadowRoot && old.shadowRoot.querySelector('canvas'); if (!src || !src.width || !src.height) return;
    var c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    try { c.getContext('2d').drawImage(src, 0, 0); } catch (e) { return; }
    c.setAttribute('aria-hidden', 'true'); c.className = 'rv-bridge';
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5';
    mv.appendChild(c);
    var gone = function () { var n = 0; (function tick() { if (++n < 4) requestAnimationFrame(tick); else c.remove(); })(); };
    if (mv.loaded) gone(); else { mv.addEventListener('load', gone, { once: true }); setTimeout(function () { c.remove(); }, 8000); }
  }
  function handoff(prev, cur) {
    var handed = new Map();
    if (!prev || !cur || prev === cur) return handed;
    [].slice.call(cur.querySelectorAll('model-viewer')).forEach(function (mv) {
      var how = mv.getAttribute('data-arrive') || 'keep'; if (how === 'reset') return;
      var old = partner(mv, prev); if (!old || !old.loaded) return;
      handed.set(mv, Math.max(travel(prev, cur), how === 'turn' ? 2400 + 150 : how === 'keep' ? 0 : 1400 + 150));   // (its own movement starts once the arrival is over)
      bridge(mv, old);
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
      // (Not loaded yet: its camera goes where the other one was right now, so its first picture is already that one.)
      if (!mv.loaded && o) mv.cameraOrbit = o.t.toFixed(1) + 'deg ' + o.p.toFixed(1) + 'deg ' + R(mv);
      if (mv.loaded) apply(); else mv.addEventListener('load', apply, { once: true });
    });
    return handed;
  }
  // (The first slide too, once reveal.js is ready: its «ready» may already have gone by, or come before
  // this listens — then nothing ran until the first change, so nothing was loaded ahead nor moving.)
  var begun = false;
  function begin() { if (begun) return; begun = true; enter(Reveal.getCurrentSlide()); }
  if (window.Reveal) { Reveal.on('ready', begin); Reveal.on('slidechanged', function (e) { begun = true; enter(e.currentSlide, handoff(e.previousSlide, e.currentSlide), e.previousSlide); });
    (function wait(n) { if (begun) return; if (Reveal.isReady && Reveal.isReady()) begin(); else if (n < 300) setTimeout(function () { wait(n + 1); }, 50); })(0);
    Reveal.on('fragmentshown', function (e) { (e.fragments || [e.fragment]).forEach(function (f) { clipStep(f, true); }); });
    Reveal.on('fragmenthidden', function (e) { (e.fragments || [e.fragment]).forEach(function (f) { clipStep(f, false); }); }); }
  return { enter: enter, handoff: handoff, start: start, stop: stop, move: move, step: clipStep, clip: function (mv, name, once) { playClip(mv, name, once); if (once) mv.addEventListener('finished', function () { rest(mv); }, { once: true }); } };
}
