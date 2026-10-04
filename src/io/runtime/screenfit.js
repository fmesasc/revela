// The slides on a screen of another proportion, inside the presentation
// (features/design/screenfit.js has the modes). Runs as source embedded in the
// exported page (toString), so it imports nothing: fitSize, adaptLayout and
// connectorPath come as arguments.
//  bands — every slide background boxed to the slide, black around it;
//  fill  — reveal's backgrounds (full screen) get the slide's gradient, or its
//          picture blurred and darkened; video and web backgrounds stay boxed,
//          dark around them;
//  adapt — fill, and the slides take the screen's proportion: reveal's size and
//          every object (data-fid/data-fb, laid out by adaptLayout) again on
//          each resize; connectors redrawn from their ends.
export function screenFitRuntime(mode, W, H, fitSize, adaptLayout, connectorPath) {
  var root = document.querySelector('.reveal'), cur = { w: W, h: H }, timer = null;
  if (!root || !window.Reveal) return;
  function num(v) { return parseFloat(v) || 0; }
  // The slide's box on screen (reveal centres it, scaled to fit, no margin).
  function box() {
    var rw = root.offsetWidth || innerWidth, rh = root.offsetHeight || innerHeight, k = Math.min(rw / cur.w, rh / cur.h);
    return { l: (rw - cur.w * k) / 2, t: (rh - cur.h * k) / 2, w: cur.w * k, h: cur.h * k };
  }
  function boxed(el, b) {
    el.style.left = b.l + 'px'; el.style.top = b.t + 'px'; el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
    el.style.boxShadow = '0 0 0 100vmax #000';
  }
  function backgrounds() {
    var b = box();
    Reveal.getSlides().forEach(function (s) {
      var bg = Reveal.getSlideBackground(s), kind = s.getAttribute('data-fill');
      if (!bg) return;
      if (mode === 'bands' || kind === 'm') { boxed(bg, b); return; }
      var st = s.querySelector(':scope>.stage'), c = bg.querySelector('.slide-background-content') || bg, css = st && st.style.background;
      if (!css || c.getAttribute('data-fill-done') === css) return;
      c.style.background = css;
      if (kind === 'i') { c.style.backgroundSize = 'cover'; c.style.backgroundPosition = 'center'; c.style.filter = 'blur(28px) brightness(.55)'; c.style.transform = 'scale(1.15)'; }
      c.setAttribute('data-fill-done', css);
    });
  }
  // Each slide's objects on the new size.
  function relayout() {
    [].forEach.call(document.querySelectorAll('.reveal .slides section>.stage'), function (st) {
      st.style.width = cur.w + 'px'; st.style.height = cur.h + 'px';
      var els = [].slice.call(st.querySelectorAll('[data-fid]')), byId = {};
      var items = els.map(function (el) {
        var f = (el.getAttribute('data-fb') || '').split(',').map(Number);
        if (!el._fx0) el._fx0 = { l: num(el.style.left), t: num(el.style.top), w: num(el.style.width), h: num(el.style.height) };
        var it = { id: el.getAttribute('data-fid'), x: f[0], y: f[1], w: f[2], h: f[3], kind: el.getAttribute('data-fx') || '', group: el.getAttribute('data-fg') || '' };
        byId[it.id] = it; return it;
      });
      var out = adaptLayout(items, W, H, cur.w, cur.h);
      els.forEach(function (el, i) {
        var it = items[i], r = out[it.id], o = el._fx0; if (!r) return;
        el.style.left = (o.l + r.x - it.x) + 'px'; el.style.top = (o.t + r.y - it.y) + 'px';
        el.style.width = (o.w + r.w - it.w) + 'px'; el.style.height = (o.h + r.h - it.h) + 'px';
        // (a picture stretched with the slide is cropped, never squashed)
        if (el.tagName === 'IMG' && r.w - it.w > 1 && getComputedStyle(el).objectFit === 'fill') el.style.objectFit = 'cover';
        // Its caption under it; the layers of its next animations turn about its new centre.
        var cap = st.querySelector('[data-fcap="' + it.id + '"]');
        if (cap) { cap.style.left = r.x + 'px'; cap.style.top = (r.y + r.h + 4) + 'px'; cap.style.width = r.w + 'px'; }
        var dx = r.x + r.w / 2 - it.x - it.w / 2, dy = r.y + r.h / 2 - it.y - it.h / 2;
        for (var p = el.parentElement; p && p !== st; p = p.parentElement) if (p.classList.contains('rv-step')) {
          if (!p._fx0) { var t = (p.style.transformOrigin || '0px 0px').split(' '); p._fx0 = [num(t[0]), num(t[1])]; }
          p.style.transformOrigin = (p._fx0[0] + dx) + 'px ' + (p._fx0[1] + dy) + 'px';
        }
        var ends = (el.getAttribute('data-fc') || '').split(' ');
        if (it.kind === 'conn' && out[ends[0]] && out[ends[1]]) {
          var svg = el.querySelector('svg'), d = connectorPath(ends[2] || '', out[ends[0]], out[ends[1]]);
          if (svg) { svg.setAttribute('viewBox', '0 0 ' + cur.w + ' ' + cur.h); [].forEach.call(svg.querySelectorAll(':scope>path'), function (q) { q.setAttribute('d', d); }); }
        }
      });
    });
  }
  function fit() {
    if (mode === 'adapt') {
      var n = fitSize(W, H, root.offsetWidth || innerWidth, root.offsetHeight || innerHeight);
      if (n.w !== cur.w || n.h !== cur.h) { cur = n; relayout(); Reveal.configure({ width: n.w, height: n.h }); }
    }
    backgrounds();
  }
  function later() { clearTimeout(timer); timer = setTimeout(fit, 120); }
  root.setAttribute('data-fit', mode);
  if (Reveal.isReady()) fit(); else Reveal.on('ready', fit);
  Reveal.on('resize', backgrounds); Reveal.on('slidechanged', backgrounds);
  window.addEventListener('resize', later);
}
