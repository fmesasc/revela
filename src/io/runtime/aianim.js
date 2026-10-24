// The presentation side of the AI animations (features/content/aianim.js): each click — a reveal fragment .rv-aseg,
// one per stage — plays one stage and the animation stops at its end, like a video's segments; going back shows the end
// of the stage before; on coming to its slide it starts again (or, coming back from later, where its shown clicks
// leave it). What each one should show is kept and sent again when its frame (re)loads. Embedded as source in the
// exported presentation: no imports.
export function aiAnimRuntime() {
  var want = {};
  var frame = function (id) { return document.querySelector('iframe[data-rv-anim="' + id + '"]'); };
  var send = function (id, m) { want[id] = m; var f = frame(id); try { if (f && f.contentWindow) f.contentWindow.postMessage(m, '*'); } catch (e) {} };
  var shown = function (id) { return document.querySelectorAll('.rv-aseg.visible[data-aseg-of="' + id + '"]').length; };
  function enter(slide) {
    Array.prototype.forEach.call(document.querySelectorAll('iframe[data-rv-anim]'), function (f) {
      var id = f.getAttribute('data-rv-anim');
      if (!slide || !slide.contains(f)) { send(id, { rvAnim: 'pause' }); return; }
      var k = shown(id);
      send(id, k ? { rvAnim: 'at', n: k - 1 } : { rvAnim: 'reset' });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('iframe[data-rv-anim]'), function (f) {
    f.addEventListener('load', function () { var m = want[f.getAttribute('data-rv-anim')]; if (m && m.rvAnim !== 'stage') { try { f.contentWindow.postMessage(m, '*'); } catch (e) {} } });
  });
  var each = function (e, fn) { (e.fragments || [e.fragment]).forEach(function (fr) { var id = fr && fr.getAttribute && fr.getAttribute('data-aseg-of'); if (id) fn(id, +fr.getAttribute('data-aseg')); }); };
  Reveal.on('ready', function (e) { enter(e.currentSlide); });
  Reveal.on('slidechanged', function (e) { enter(e.currentSlide); });
  Reveal.on('fragmentshown', function (e) { each(e, function (id, n) { send(id, { rvAnim: 'stage', n: n }); }); });
  Reveal.on('fragmenthidden', function (e) { each(e, function (id, n) { send(id, n > 0 ? { rvAnim: 'at', n: n - 1 } : { rvAnim: 'reset' }); }); });
}
