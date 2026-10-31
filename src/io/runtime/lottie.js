// Lottie animations inside the presentation (and in the editor's previews): runs as source embedded in the exported page
// (toString), so it imports nothing.
//
// Each object is <div data-lottie='{…}' data-lo="1" data-sp="1" data-tr="auto|click" data-still="12">, its still picture inside.
// lottie-web's light build is loaded (once) when its slide, or the one after, is shown; the animation starts when its slide is
// (a restart each time), or on a click when the object says «al hacer clic»; it waits while it is off screen or the tab is hidden,
// and with «Reducir movimiento» on (the system's, or Ver ▸ Efectos) it stays on its still frame, with the badge that says so.

export function lottieRuntime(LIB, L) {
  var lib = null, all = [];
  var FX = function () { return window.__rvFX; };
  function mirror() { var i = LIB.indexOf('/npm/'); return i > 0 && /jsdelivr/.test(LIB) ? 'https://unpkg.com/' + LIB.slice(i + 5) : ''; }
  function inject(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { window.lottie ? ok(window.lottie) : ko(); }; s.onerror = function () { s.remove(); ko(); };
      document.head.appendChild(s);
    });
  }
  function load() {
    if (window.lottie) return Promise.resolve(window.lottie);
    // (From the other CDN once, if the first doesn't answer.)
    if (!lib) lib = inject(LIB).catch(function () { var m = mirror(); return m ? inject(m) : Promise.reject(); });
    return lib;
  }
  var reduced = function () { var F = FX(); return F ? F.reduced() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var lite = function () { var F = FX(); return !!(F && F.perf() === 'lite'); };
  var num = function (el, k, d) { var v = parseFloat(el.getAttribute(k)); return isFinite(v) ? v : d; };
  var inSlide = function (el) {
    var R = window.Reveal; if (!R || !R.getCurrentSlide) return true;
    var cur = R.getCurrentSlide(); if (!cur || !cur.contains(el)) return false;
    var f = el.closest('.fragment'); return !f || f.classList.contains('visible') || (f.classList.contains('current-fragment'));
  };

  function badge(st, on) {
    var F = FX(); if (!F || !st.el.isConnected) return;
    F.mark(st.el, on ? [{ k: 'motion', why: L.why }] : []);
  }
  function stillFrame(st) { try { st.anim.goToAndStop(num(st.el, 'data-still', 0), true); } catch (e) {} }

  function build(st) {
    if (st.anim || st.loading) return;
    st.loading = true;
    load().then(function (lot) {
      st.loading = false; var el = st.el; if (!el.isConnected || st.anim) return;
      var data; try { data = JSON.parse(el.getAttribute('data-lottie')); } catch (e) { return; }
      var poster = el.querySelector('img');
      st.anim = lot.loadAnimation({ container: el, renderer: 'svg', loop: false, autoplay: false, animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', hideOnTransparent: true } });
      st.anim.addEventListener('DOMLoaded', function () { if (poster) poster.remove(); });
      if (lite() && st.anim.setSubframe) st.anim.setSubframe(false);
      st.anim.setSpeed(num(el, 'data-sp', 1));
      stillFrame(st); st.fresh = true;
      el.querySelectorAll(':scope > svg').forEach(function (s) { s.setAttribute('aria-hidden', 'true'); s.style.pointerEvents = 'none'; });
      update(st);
    }).catch(function () {
      st.loading = false; var F = FX(); if (F && st.el.isConnected) F.mark(st.el, [{ k: 'offline', label: L.offline, why: L.whyOffline }]);
    });
  }
  function play(st) {
    var a = st.anim; if (!a) return;
    a.loop = st.el.getAttribute('data-lo') !== '0'; a.setSpeed(num(st.el, 'data-sp', 1));
    a.goToAndPlay(0, true); st.playing = true;
  }
  // What this object should be doing now.
  function update(st) {
    var el = st.el; if (!el.isConnected) return;
    var shown = inSlide(el), act = shown && st.vis && !document.hidden, rd = reduced();
    if (shown && !st.shown) { st.shown = true; st.started = false; st.clicked = false; st.paused = false; }
    if (!shown && st.shown) { st.shown = false; if (st.anim) { st.anim.pause(); st.playing = false; } }
    if (!st.anim) { if (shown || st.near) build(st); return; }
    if (rd) { if (st.playing || st.rd !== true) { st.anim.pause(); st.playing = false; stillFrame(st); } st.rd = true; badge(st, shown); return; }
    if (st.rd) { st.rd = false; badge(st, false); st.started = false; }
    if (!shown) return;
    if (st.mode === 'auto') {
      if (!st.started && act) { st.started = true; play(st); }
      else if (st.started && st.playing && !act) { st.anim.pause(); st.paused = true; }
      else if (st.started && st.paused && act) { st.anim.play(); st.paused = false; }
    } else if (!st.started) { st.started = true; stillFrame(st); }
    else if (st.clicked && !act) { st.anim.pause(); st.paused = true; }
    else if (st.clicked && st.paused && act) { st.anim.play(); st.paused = false; }
  }
  function hook(el) {
    var st = { el: el, vis: true, mode: el.getAttribute('data-tr') === 'click' ? 'click' : 'auto' };
    el.__lt = st; all.push(st);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { st.vis = es[es.length - 1].isIntersecting; update(st); }).observe(el);
    if (st.mode === 'click') {
      el.setAttribute('role', 'button'); el.tabIndex = 0; el.style.cursor = 'pointer';
      var go = function (e) {
        if (e.target.closest && e.target.closest('.rvfx-badge,.rvfx-pop')) return;
        e.stopPropagation();
        if (!st.anim || reduced()) return;
        st.clicked = true; st.started = true; st.paused = false; play(st);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    }
    return st;
  }
  function sweep() {
    var R = window.Reveal, cur = R && R.getCurrentSlide && R.getCurrentSlide();
    var slides = R && R.getSlides ? R.getSlides() : [], i = slides.indexOf(cur), nxt = i >= 0 ? slides[i + 1] : null;
    [].forEach.call(document.querySelectorAll('[data-lottie]'), function (el) { if (!el.__lt) hook(el); });
    all.forEach(function (st) { st.near = !!(nxt && nxt.contains(st.el)); update(st); });
  }
  var R = window.Reveal;
  if (R && R.on) { ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach(function (n) { R.on(n, function () { setTimeout(sweep, 0); }); }); if (R.isReady && R.isReady()) sweep(); }
  else sweep();
  document.addEventListener('visibilitychange', function () { all.forEach(update); });
  var F = FX(); if (F && F.subs) F.subs.push(function () { all.forEach(function (st) { st.started = false; update(st); }); });
  return { sweep: sweep };
}
