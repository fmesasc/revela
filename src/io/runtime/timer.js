// Countdown timers in the presentation: runs as source embedded in the exported
// page (toString), so it imports nothing. A timer starts when its slide is shown
// (or with a click, if it doesn't start by itself); a click pauses and resumes
// it, or starts it again once it has finished. Leaving the slide resets it.
// At the end: its closing text, and three beeps if it has sound.
export function timerRuntime() {
  var state = new WeakMap();
  function fmt(s) { s = Math.max(0, Math.ceil(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = ('0' + (s % 60)).slice(-2);
    return h ? h + ':' + ('0' + m).slice(-2) + ':' + x : ('0' + m).slice(-2) + ':' + x; }
  function paint(el, left) {
    var total = +el.getAttribute('data-secs') || 1, svg = el.querySelector('svg'), txt = el.querySelector('.rv-t-txt');
    if (svg) svg.style.setProperty('--p', Math.max(0, left / total).toFixed(4));
    if (txt) txt.textContent = left > 0 ? fmt(left) : (el.getAttribute('data-end') || fmt(0));
    el.classList.toggle('rv-t-low', left > 0 && left <= Math.max(5, total * 0.1));
    el.classList.toggle('rv-t-done', left <= 0);
  }
  function beep() {
    try { var A = window.AudioContext || window.webkitAudioContext, ctx = new A();
      [0, 0.35, 0.7].forEach(function (t) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3); });
    } catch (e) {}
  }
  function tick(el) {
    var s = state.get(el); if (!s || !s.running) return;
    var left = s.left - (performance.now() - s.t0) / 1000;
    paint(el, left);
    if (left <= 0) { s.running = false; s.left = 0; if (el.hasAttribute('data-sound')) beep(); return; }
    s.raf = requestAnimationFrame(function () { tick(el); });
  }
  function start(el) { var s = state.get(el); if (s.left <= 0) s.left = +el.getAttribute('data-secs'); s.running = true; s.t0 = performance.now(); tick(el); }
  function pause(el) { var s = state.get(el); s.left -= (performance.now() - s.t0) / 1000; s.running = false; cancelAnimationFrame(s.raf); }
  function reset(el) { var s = state.get(el); if (s) { cancelAnimationFrame(s.raf); s.running = false; } state.set(el, { left: +el.getAttribute('data-secs'), running: false }); paint(el, +el.getAttribute('data-secs')); }
  function all() { return [].slice.call(document.querySelectorAll('[data-timer]')); }
  all().forEach(function (el) {
    reset(el);
    el.addEventListener('click', function (e) { e.stopPropagation(); var s = state.get(el); if (s.running) pause(el); else start(el); });
  });
  function shown(slide) { all().forEach(function (el) { reset(el); if (slide && slide.contains(el) && el.hasAttribute('data-auto')) start(el); }); }
  if (window.Reveal) { Reveal.on('ready', function (e) { shown(e.currentSlide); }); Reveal.on('slidechanged', function (e) { shown(e.currentSlide); }); if (Reveal.isReady()) shown(Reveal.getCurrentSlide()); }
  return { start: start, pause: pause, reset: reset };
}
