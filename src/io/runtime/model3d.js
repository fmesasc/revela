// 3D objects inside the presentation (and in the editor's previews): runs as
// source embedded in the exported page (toString), so it imports nothing.

// Presentation side: once per <model-viewer>, speed/once of its animation, and
// the camera movement each time its slide is shown (reveal.js events).
export function model3dRuntime() {
  var timers = new WeakMap();
  // The 3D library itself, from the other CDN if the first one hasn't answered after 8 s (a network that blocks jsDelivr).
  setTimeout(function () {
    if (window.customElements && !customElements.get('model-viewer') && document.querySelector('model-viewer') && !document.querySelector('script[data-rv-mirror]')) {
      var m = document.createElement('script'); m.type = 'module'; m.setAttribute('data-rv-mirror', ''); m.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js'; document.head.appendChild(m);
    }
  }, 8000);
  // No WebGL at all (or none that works): model-viewer throws and leaves its box empty — its picture instead, never nothing.
  var NOGL = (function () { try { var g = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); if (!g) return true; var l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); return false; } catch (e) { return true; } })();
  // (Its own box, so that its animations — fragments, paths — go on working: the picture is its background.)
  function flat(mv) {
    if (mv.__flat) return; mv.__flat = true;
    var p = mv.getAttribute('data-poster') || mv.getAttribute('poster'); if (!p) return;
    var k = parseFloat(mv.getAttribute('data-bleed')) || 1;
    mv.style.setProperty('background', 'center / ' + (k > 1 ? (100 / k).toFixed(1) + '% auto' : 'contain') + ' no-repeat url("' + p.replace(/["\\]/g, '') + '")', 'important');
    mv.style.pointerEvents = 'none'; mv.setAttribute('role', 'img'); if (mv.getAttribute('alt')) mv.setAttribute('aria-label', mv.getAttribute('alt'));
  }
  // A graphics context the browser took away (too many, a driver reset) and did not give back within 2.5 s: the models on
  // the page are asked for again — twice at most —, which makes model-viewer draw them on a fresh one.
  (function () {
    var timer = 0, times = 0;
    document.addEventListener('webglcontextlost', function (e) {
      if (!e.target || e.target.tagName !== 'CANVAS' || !document.querySelector('model-viewer')) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (times++ >= 2) return;
        [].forEach.call(document.querySelectorAll('model-viewer'), function (mv) {
          var src = mv.getAttribute('src'); if (!src) return;
          mv.removeAttribute('src'); setTimeout(function () { if (mv.isConnected && !mv.getAttribute('src')) mv.setAttribute('src', src); }, 80);
        });
      }, 2500);
    }, true);
    document.addEventListener('webglcontextrestored', function () { clearTimeout(timer); }, true);
  })();
  function setup(mv) {
    if (mv.__rv) return; mv.__rv = true;
    if (NOGL) { flat(mv); return; }
    mv.__spin = mv.hasAttribute('auto-rotate');             // (its own turning: an arrival "facing the audience" stops it, only there)
    // Its picture until it has loaded (a slow connection), in the model's own box.
    // (Not a photo — JPEG, with its own background: a grey box on the slide.)
    var p = mv.getAttribute('data-poster');
    if (p && !/^data:image\/jpe?g|\.jpe?g(\?|#|$)/i.test(p) && !mv.loaded && !mv.querySelector('[slot="poster"]')) {
      var k = parseFloat(mv.getAttribute('data-bleed')) || 1, m = ((1 - 1 / k) * 50).toFixed(2) + '%', d = document.createElement('div');
      d.slot = 'poster'; d.style.cssText = 'position:absolute;inset:' + m + ';background:center/contain no-repeat;pointer-events:none';
      d.style.backgroundImage = 'url("' + p.replace(/["\\]/g, '') + '")'; mv.appendChild(d);
    }
    // A model that failed to come (a connection that dropped, a server that was busy): asked for again, up to three times,
    // each time after twice as long; meanwhile its picture stays where it is.
    mv.addEventListener('error', function () {
      var n = mv.__tries = (mv.__tries || 0) + 1, src = mv.getAttribute('src'); if (n > 3 || !src) return;
      setTimeout(function () {
        if (!mv.isConnected || mv.loaded || mv.getAttribute('src') !== src) return;
        mv.removeAttribute('src'); setTimeout(function () { if (mv.isConnected && !mv.getAttribute('src')) mv.setAttribute('src', src); }, 60);
      }, 1500 * Math.pow(2, n - 1));
    });
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
    // A pose that is the end of another clip («Death_A_Pose», of «Death_A»): that clip, once, and it stays at its end.
    // (The pose itself has no length: looped, its time went NaN; once, the model stood up again — either way, standing.)
    var base = n.replace(/[_ ]?pose$/i, '');
    if (base !== n && (mv.availableAnimations || []).indexOf(base) >= 0) { n = base; once = true; }
    // (A pose — a clip of no length, «Death_A_Pose» —: played once, it stays put; looped, its time went NaN and the
    // model was left halfway between the fall and its pose, standing.)
    var go = function () { if (mv.__clip === k) mv.play(once ? { repetitions: 1 } : undefined); };
    if (mv.animationName !== n && mv.updateComplete) { mv.animationName = n; mv.updateComplete.then(go); } else { mv.animationName = n; go(); }
  }
  // After a clip played once, back to rest — only if that clip is still the one playing and it is what ended: an
  // earlier one, cut short by the next and fading out, ended later and sent the model back to rest in the middle of
  // the next (a warrior's fall left half lying, half standing).
  function afterOnce(mv, fn) {
    var k = mv.__clip;
    function h() {
      if (mv.__clip !== k) { mv.removeEventListener('finished', h); return; }
      if (mv.duration && mv.currentTime < mv.duration - 0.1) return;
      mv.removeEventListener('finished', h); fn();
    }
    mv.addEventListener('finished', h);
  }
  function rest(mv) { var idle = mv.hasAttribute('autoplay') ? (mv.getAttribute('animation-name') || '*') : null; mv.__step = false; if (idle) playClip(mv, idle); else mv.pause(); }
  // The camera's distance: further away when the view has room around the model (data-bleed).
  function R(mv, pct) { var k = parseFloat(mv.getAttribute('data-bleed')) || 1; return pct ? Math.round(pct * k) + '%' : (k === 1 ? 'auto' : Math.round(105 * k) + '%'); }
  // Facing its way: the camera where the model's front shows that way — whatever the view it was given (from the side,
  // its way was added to that view, and walking right it looked at us) —; null: back to its own view.
  function turn(mv, yaw) { var o = (mv.getAttribute('camera-orbit') || '0deg 75deg auto').split(' '); mv.cameraOrbit = (yaw == null ? parseFloat(o[0]) || 0 : -yaw).toFixed(1) + 'deg ' + (o[1] || '75deg') + ' ' + R(mv); }
  function offset(el) { var v = getComputedStyle(el).translate; if (!v || v === 'none') return [0, 0]; var p = v.split(' '); return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0]; }
  function move(mv, dur, el) {
    var clip = mv.getAttribute('data-move-clip'); if (!clip) return;
    var w = walks.get(mv), now0 = performance.now();
    if (w && now0 - w.t0 < 80) return;                   // (several properties start together)
    if (w) cancelAnimationFrame(w.raf);
    w = { t0: now0 }; walks.set(mv, w); el = el || mv;
    playClip(mv, clip);
    var last = null, face = mv.hasAttribute('data-face'), yaw = null, stride = parseFloat(mv.getAttribute('data-stride')) || 0, lastT = now0, vs = 0;
    (function step(now) {
      var p = offset(el);
      // The clip plays as fast as the object goes: the body's height on the slide × the stride (heights per cycle) over the clip's length, so
      // the feet don't skate. (Smoothed: the speed of a path is not even.)
      if (stride && last && now > lastT) { var v = Math.hypot(p[0] - last[0], p[1] - last[1]) / ((now - lastT) / 1000); vs = vs ? vs * 0.85 + v * 0.15 : v;
        var fig = (mv.offsetHeight || 0) * 0.88 * 1.5 / (parseFloat(mv.getAttribute('data-bleed')) || 1), len = mv.duration || 1.1, v1 = stride * fig / len;
        if (v1 > 1 && vs > 2) mv.timeScale = Math.max(0.5, Math.min(2.4, vs / v1)); }
      lastT = now;
      if (face && last) { var dx = p[0] - last[0], dy = p[1] - last[1];
        if (Math.hypot(dx, dy) > 0.4) { var y = Math.atan2(dx, dy) * 180 / Math.PI; if (yaw === null || Math.abs(((y - yaw + 540) % 360) - 180) > 2) { yaw = y; turn(mv, y); } } }
      last = p;
      if (now - w.t0 < dur) w.raf = requestAnimationFrame(step); else arrive(mv);
    })(now0);
  }
  function arrive(mv) {
    walks.delete(mv); if (mv.hasAttribute('data-stride')) mv.timeScale = parseFloat(mv.getAttribute('data-speed')) || 1;
    if (mv.hasAttribute('data-look')) turn(mv, null);
    if (mv.__step) return;                                // (a step "after the previous" already plays its own: a wave on arrival)
    var end = mv.getAttribute('data-end-clip');
    if (!end) { rest(mv); return; }
    var once = mv.hasAttribute('data-end-once');
    playClip(mv, end, once);
    if (once) afterOnce(mv, function () { rest(mv); });
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
      if (once) afterOnce(mv, function () { if (mv.__step) rest(mv); });
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
  // Phones and low-memory devices: each 3D model holds a live WebGL context, and iOS Safari kills the tab
  // ("this webpage was reloaded…") after a few at once. So there we load fewer around the current slide and
  // release the rest (they fall back to their poster until the slide is near again).
  // The same on a computer that is slow though it isn't a phone (Francisco, 2026-10-30: «en ordenadores menos potentes el 3D a
  // veces se muestra y a veces no»): four cores or fewer, little memory, or WebGL drawn by the processor (SwiftShader,
  // llvmpipe: no graphics card). Settable: ?perf=lite|full in the address, or localStorage 'revela.perf'.
  var SOFT = (function () {
    try {
      var cv = document.createElement('canvas'), g = cv.getContext('webgl2') || cv.getContext('webgl'); if (!g) return false;
      var x = g.getExtension('WEBGL_debug_renderer_info'), r = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL) || '') : '';
      var l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(r);
    } catch (e) { return false; }
  })();
  var PERF = (function () { try { var q = /[?&]perf=(lite|full)\b/.exec(location.search); return q ? q[1] : (localStorage.getItem('revela.perf') || ''); } catch (e) { return ''; } })();
  var LEAN = PERF === 'lite' || (PERF !== 'full' && (SOFT || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4))) || (PERF !== 'full' && (function () {
    try {
      return (navigator.deviceMemory && navigator.deviceMemory <= 4)
        || /iP(hone|od|ad)/.test(navigator.userAgent)
        || (/\bMac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)      // iPadOS pretends to be a Mac
        || (window.matchMedia && matchMedia('(pointer: coarse)').matches && Math.min(screen.width || 9999, screen.height || 9999) <= 820);
    } catch (e) { return false; }
  })());
  // The models of this slide and the next ones load now, not when they come into
  // view (model-viewer waits for that): else a slide arrives with an empty box.
  // On lean devices, only the current slide and the next (not the one before too).
  // The current slide's models first: on a slow connection the next slides' (up to 20 MB of them) were taking the line
  // from it, and the slide arrived with its pictures only. The next ones start when these are in (or have failed), or
  // after 6 s — a model that never comes mustn't hold the others back.
  var preToken = 0;
  function preload(slide) {
    var all = window.Reveal ? Reveal.getSlides() : [], i = all.indexOf(slide), token = ++preToken;
    var win = LEAN ? all.slice(i, i + 2) : all.slice(Math.max(0, i - 1), i + 3);
    var eager = function (mv) { if (mv.getAttribute('loading') !== 'eager') mv.setAttribute('loading', 'eager'); };
    var mine = slide ? [].slice.call(slide.querySelectorAll('model-viewer')) : [];
    mine.forEach(eager);
    var go = function () {
      if (token !== preToken) return;
      win.forEach(function (s) { s.querySelectorAll('model-viewer:not([loading="eager"])').forEach(eager); });
    };
    var waiting = mine.filter(function (mv) { return !mv.loaded && mv.getAttribute('src'); });
    if (!waiting.length) { go(); return; }
    var left = waiting.length, fin = function () { if (left > 0) { left = 0; go(); } };
    waiting.forEach(function (mv) { var h = function () { if (--left === 0) go(); }; mv.addEventListener('load', h, { once: true }); mv.addEventListener('error', h, { once: true }); });
    setTimeout(fin, 6000);
  }
  // Keep only the slides next to the current one with their models loaded; the rest give up their WebGL
  // context (src removed → the poster shows). When a slide comes back within reach, its models load again.
  function trim(slide) {
    if (!LEAN || !window.Reveal) return;
    var all = Reveal.getSlides(), i = all.indexOf(slide);
    all.forEach(function (s, k) {
      var near = Math.abs(k - i) <= 1;
      s.querySelectorAll('model-viewer').forEach(function (mv) {
        if (near) {
          if (mv.__src3d && !mv.getAttribute('src')) { mv.setAttribute('loading', 'eager'); mv.setAttribute('src', mv.__src3d); mv.__src3d = null; }
        } else {
          var cur = mv.getAttribute('src');
          if (cur) { mv.__src3d = cur; try { mv.src = null; } catch (e) {} mv.removeAttribute('src'); }
        }
      });
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
    trim(slide);
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
    // (Only its own corner of that canvas: model-viewer's is as big as the largest model on the page — 480 × 300 for a
    // 180 × 225 one — and draws each in its top left; the whole of it, shrunk into the box, showed a small second figure.)
    var k = src.width / (parseFloat(src.style.width) || src.width);
    var sw = Math.min(src.width, Math.round((old.offsetWidth || src.width) * k)), sh = Math.min(src.height, Math.round((old.offsetHeight || src.height) * k));
    if (!sw || !sh) return;
    var c = document.createElement('canvas'); c.width = sw; c.height = sh;
    try { c.getContext('2d').drawImage(src, 0, 0, sw, sh, 0, 0, sw, sh); } catch (e) { return; }
    c.setAttribute('aria-hidden', 'true'); c.className = 'rv-bridge';
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5';
    mv.appendChild(c);
    // (Until it has drawn itself where it shows: loaded is not enough — a model draws only once it is in view, and a
    // slide coming in from the side showed its box empty, then the figure, for a few frames.)
    var gone = function () { var n = 0; (function tick() { if (++n < 4) requestAnimationFrame(tick); else c.remove(); })(); };
    var drawn = function () { if (mv.modelIsVisible) gone(); else mv.addEventListener('model-visibility', function seen(e) { if (e.detail && e.detail.visible) { mv.removeEventListener('model-visibility', seen); gone(); } }); };
    if (mv.loaded) drawn(); else mv.addEventListener('load', drawn, { once: true });
    setTimeout(function () { c.remove(); }, 8000);
  }
  function alike(a, b) {
    return ['camera-orbit', 'animation-name', 'data-bleed', 'auto-rotate'].every(function (k) { return a.getAttribute(k) === b.getAttribute(k); })
      && a.style.width === b.style.width && a.style.height === b.style.height;
  }
  function handoff(prev, cur) {
    var handed = new Map();
    if (!prev || !cur || prev === cur) return handed;
    [].slice.call(cur.querySelectorAll('model-viewer')).forEach(function (mv) {
      var how = mv.getAttribute('data-arrive') || 'keep'; if (how === 'reset') return;
      var old = partner(mv, prev); if (!old || !old.loaded) return;
      // (Without Morph, only the same object — its data-id, a duplicated slide —: another model of the same file kept
      // that one's angle and lost its own view — a character sheet's four views, all alike. But the same model shown
      // the same way — same file, size, view and clip, the slide after — has the other one's picture until it draws:
      // it came in empty, then popped in, a different figure for a moment.)
      if (!morphs(prev, cur) && !(mv.getAttribute('data-id') && old.getAttribute('data-id') === mv.getAttribute('data-id'))) { if (alike(mv, old)) bridge(mv, old); return; }
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
  return { enter: enter, handoff: handoff, start: start, stop: stop, move: move, step: clipStep, clip: function (mv, name, once) { playClip(mv, name, once); if (once) afterOnce(mv, function () { rest(mv); }); }, lean: LEAN, nogl: NOGL, preload: preload };
}
