// «Next» while the step is still animating finishes it instead of moving on (as PowerPoint does): a click to see
// the arrow land shouldn't skip to the next point. What counts: the animations under way on the slide shown —
// entrances, emphases, exits and paths, those waiting for their delay («Después de la anterior») included — that
// have an end (a «pulse» that loops forever doesn't hold the deck). Finishing them
// leaves everything where the step ends. The keys, the arrows, the clicker, the phone remote and the presenter view
// all go through Reveal.next / right / down / nextFragment, so all of them get it.
// (Serialised into the exported page: html.js — no imports, no closures.)
export function finishStepRuntime() {
  var R = window.Reveal; if (!R || !document.getAnimations) return;
  var running = function () {
    var slide = R.getCurrentSlide();
    if (!slide) return [];
    return document.getAnimations().filter(function (a) {
      if (a.playState !== 'running') return false;
      var el = a.effect && a.effect.target; if (!el || !el.closest) return false;
      if (el === slide || !slide.contains(el) || el.tagName === 'SECTION') return false;   // (the objects' animations, not the move between slides)
      if (el.closest('[data-geomap], model-viewer, .rv-pdf-layer, .pdfview, .rv-no-finish')) return false;   // (live things with motion of their own; a PDF's page-and-zoom steps go on at each click)
      var end = a.effect.getComputedTiming().endTime;
      return isFinite(end) && end > 0;
    });
  };
  var wrap = function (name) {
    var go = R[name]; if (typeof go !== 'function') return;
    R[name] = function () {
      var list = running();
      if (list.length) { list.forEach(function (a) { try { a.finish(); } catch (e) {} }); return; }
      return go.apply(R, arguments);
    };
  };
  ['next', 'right', 'down', 'nextFragment'].forEach(wrap);
}
