// «Web viva»: a web page that keeps its place from one slide to another. In the page, each web object marked with the same
// `live` name is only a slot (.rv-liveslot, drawn in its slide, with its size and place); the page itself is ONE real frame,
// made once and kept alive, that this script lays over the slot of the slide being shown and hides in the others. So the web
// the presenter navigated on slide 3 is on slide 8 where it was left (not reloaded, not back at its first page), with each
// slot's own size and position; and a single web alone comes back to the same place after other slides.
// The frame sits over the slides (it can't go between the slide's objects), and what is not shown is hidden, never removed.
// (Serialised into the exported page: html.js — no imports, no closures.)
export function liveFrameRuntime() {
  var R = window.Reveal, root = document.querySelector('.reveal');
  if (!R || !root || root.classList.contains('rv-canvas')) return;          // (the endless canvas has no slot to follow)
  var frames = {}, last = {}, until = 0, raf = 0;
  var slotOf = function (slide, id) { return slide ? slide.querySelector('.rv-liveslot[data-live="' + id + '"]') : null; };
  var shown = function (el, stop) {                                             // (an object still to come in, or gone out, isn't there)
    for (var x = el; x && x !== stop; x = x.parentElement) {
      var c = getComputedStyle(x);
      if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
    }
    return true;
  };
  var make = function (id, slot) {
    if (frames[id]) return frames[id];
    var src = slot.getAttribute('data-src') || '';
    if (!/^https?:\/\//i.test(src)) return null;
    var f = document.createElement('iframe');
    f.className = 'rv-liveframe'; f.setAttribute('data-live-frame', id);
    f.setAttribute('sandbox', slot.getAttribute('data-sandbox') || 'allow-scripts allow-popups allow-forms allow-presentation');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('title', slot.getAttribute('aria-label') || '');
    f.setAttribute('allow', 'fullscreen');
    f.src = src; root.appendChild(f); frames[id] = f; return f;
  };
  // The frames of this slide and the next are made (and start loading) now; the others wait for their turn.
  var ensure = function () {
    var all = R.getSlides ? R.getSlides() : [], i = all.indexOf(R.getCurrentSlide && R.getCurrentSlide());
    [all[i], all[i + 1]].forEach(function (s) {
      if (!s) return;
      s.querySelectorAll('.rv-liveslot').forEach(function (slot) { make(slot.getAttribute('data-live'), slot); });
    });
  };
  var place = function () {
    if (R.isPrintingPDF && R.isPrintingPDF()) return;
    ensure();
    var cur = R.getCurrentSlide && R.getCurrentSlide(), o = root.getBoundingClientRect(), over = R.isOverview && R.isOverview();
    Object.keys(frames).forEach(function (id) {
      var f = frames[id], slot = over ? null : slotOf(cur, id), css;
      if (slot && shown(slot, root)) {
        var r = slot.getBoundingClientRect(), w = +slot.getAttribute('data-w') || r.width, h = +slot.getAttribute('data-h') || r.height, k = w ? r.width / w : 1;
        css = 'position:absolute;left:0;top:0;border:0;background:#fff;transform-origin:0 0;z-index:6;visibility:visible;pointer-events:auto;'
          + 'width:' + w + 'px;height:' + h + 'px;transform:translate(' + (r.left - o.left).toFixed(1) + 'px,' + (r.top - o.top).toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
      } else css = 'position:absolute;left:0;top:0;border:0;width:1px;height:1px;visibility:hidden;pointer-events:none;z-index:-1';
      if (last[id] !== css) { last[id] = css; f.style.cssText = css; }
    });
  };
  // While the slide comes in (a transition moves its slot) the frame follows it, frame by frame; then once in a while.
  var tick = function () { raf = 0; place(); if (performance.now() < until) raf = requestAnimationFrame(tick); };
  var kick = function () { until = performance.now() + 1600; if (!raf) raf = requestAnimationFrame(tick); };
  ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden', 'resize', 'overviewshown', 'overviewhidden'].forEach(function (n) { R.on(n, kick); });
  window.addEventListener('resize', kick);
  setInterval(function () { if (!document.hidden) place(); }, 250);
  if (R.isReady && R.isReady()) kick();
}
