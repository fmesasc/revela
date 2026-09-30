// PDFs in the presentation: drawn with pdf.js (sharp at any zoom), with a small
// bar to leaf through them and zoom (buttons, Ctrl + wheel, double click, drag
// to move), and "page and zoom" animation steps (.pdfview fragments, or clicks
// on a trigger) that take them to a page and a part of it. Going back undoes
// the steps: the state shown is always the latest step that is visible.
// Runs as source in the exported page (toString): it imports nothing.
export function pdfRuntime(lib) {
  var docs = new Map(), pdfjs = null;
  function load() {
    if (!pdfjs) pdfjs = import(lib + '/pdf.min.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = lib + '/pdf.worker.min.mjs'; return m; });
    return pdfjs;
  }
  function bytes(src) { var b = atob(src.slice(src.indexOf(',') + 1)), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function docOf(el) {
    if (!docs.has(el)) docs.set(el, load().then(function (m) { return m.getDocument({ data: bytes(el.getAttribute('data-src')) }).promise; }));
    return docs.get(el);
  }
  function secs(v) { v = String(v || '').trim(); return v.slice(-2) === 'ms' ? parseFloat(v) : parseFloat(v) * 1000 || 0; }
  function initial(el) { return { page: +el.getAttribute('data-page') || 1, x: 0.5, y: 0.5, s: 1 }; }

  // One PDF on a slide: its layer (moved and scaled), its page, its bar.
  function setup(el) {
    if (el._pdf) return el._pdf;
    var layer = document.createElement('div'); layer.className = 'rv-pdf-layer';
    layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0;will-change:transform';
    var bar = document.createElement('div'); bar.className = 'rv-pdf-bar';
    bar.innerHTML = '<button data-a="prev" title="◀">◀</button><span></span><button data-a="next" title="▶">▶</button>'
      + '<button data-a="out" title="−">−</button><button data-a="in" title="+">+</button><button data-a="fit" title="⤢">⤢</button><button data-a="open" title="↗">↗</button>';
    el.appendChild(layer); el.appendChild(bar);
    var st = { el: el, layer: layer, bar: bar, cur: initial(el), canvas: null, drawn: 0, res: 0, pages: 0 };
    el._pdf = st;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; e.stopPropagation();
      var a = b.getAttribute('data-a'), c = st.cur;
      if (a === 'prev') go(st, { page: Math.max(1, c.page - 1), x: 0.5, y: 0.5, s: 1 }, 300);
      else if (a === 'next') go(st, { page: Math.min(st.pages || c.page + 1, c.page + 1), x: 0.5, y: 0.5, s: 1 }, 300);
      else if (a === 'in') go(st, { page: c.page, x: c.x, y: c.y, s: Math.min(8, c.s * 1.5) }, 250);
      else if (a === 'out') go(st, { page: c.page, x: c.x, y: c.y, s: Math.max(1, c.s / 1.5) }, 250);
      else if (a === 'fit') go(st, { page: c.page, x: 0.5, y: 0.5, s: 1 }, 250);
      else if (a === 'open') { var u = URL.createObjectURL(new Blob([bytes(el.getAttribute('data-src'))], { type: 'application/pdf' })); window.open(u, '_blank', 'noopener'); }
    });
    // Zoom where the pointer is (Ctrl + wheel, double click); drag to move when zoomed.
    function at(e) { var r = el.getBoundingClientRect(), k = r.width / el.offsetWidth; return geo(st, (e.clientX - r.left) / k, (e.clientY - r.top) / k); }
    el.addEventListener('wheel', function (e) { if (!e.ctrlKey) return; e.preventDefault(); var p = at(e), s = Math.min(8, Math.max(1, st.cur.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); go(st, { page: st.cur.page, x: p.x, y: p.y, s: s }, 120); }, { passive: false });
    el.addEventListener('dblclick', function (e) { if (e.target.closest('.rv-pdf-bar')) return; e.stopPropagation(); var p = at(e); go(st, st.cur.s > 1.01 ? { page: st.cur.page, x: 0.5, y: 0.5, s: 1 } : { page: st.cur.page, x: p.x, y: p.y, s: 2.5 }, 300); });
    var drag = null;
    el.addEventListener('pointerdown', function (e) { if (st.cur.s <= 1.01 || e.target.closest('.rv-pdf-bar')) return; e.stopPropagation(); drag = { x: e.clientX, y: e.clientY, c: st.cur }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return; var r = el.getBoundingClientRect(), k = r.width / el.offsetWidth, g = geo(st, 0, 0);
      go(st, { page: drag.c.page, s: drag.c.s, x: drag.c.x - (e.clientX - drag.x) / k / (g.pw * drag.c.s), y: drag.c.y - (e.clientY - drag.y) / k / (g.ph * drag.c.s) }, 0);
    });
    el.addEventListener('pointerup', function () { drag = null; });
    ['touchstart', 'mousedown'].forEach(function (t) { el.addEventListener(t, function (e) { if (st.cur.s > 1.01 || e.target.closest('.rv-pdf-bar')) e.stopPropagation(); }); });
    return st;
  }
  // Where the page sits in the box at zoom 1 (contained), and a point of the box as a point of the page.
  function geo(st, bx, by) {
    var W = st.el.offsetWidth, H = st.el.offsetHeight, r = st.ratio || 0.77, k = Math.min(W / r, H), pw = k * r, ph = k, ox = (W - pw) / 2, oy = (H - ph) / 2;
    var c = st.cur, tx = W / 2 - (ox + c.x * pw) * c.s, ty = H / 2 - (oy + c.y * ph) * c.s;
    return { W: W, H: H, pw: pw, ph: ph, ox: ox, oy: oy, x: ((bx - tx) / c.s - ox) / pw, y: ((by - ty) / c.s - oy) / ph };
  }
  function transform(st) {
    var g = geo(st, 0, 0), c = st.cur;
    // (Zoomed in, the page doesn't leave empty space it could fill.)
    var tx = g.W / 2 - (g.ox + c.x * g.pw) * c.s, ty = g.H / 2 - (g.oy + c.y * g.ph) * c.s;
    if (g.pw * c.s > g.W) tx = Math.min(-g.ox * c.s, Math.max(g.W - (g.ox + g.pw) * c.s, tx)); else tx = (g.W - g.pw * c.s) / 2 - g.ox * c.s;
    if (g.ph * c.s > g.H) ty = Math.min(-g.oy * c.s, Math.max(g.H - (g.oy + g.ph) * c.s, ty)); else ty = (g.H - g.ph * c.s) / 2 - g.oy * c.s;
    return 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + c.s.toFixed(3) + ')';
  }
  // Draw the page (again, sharper, when zoomed further than it was drawn for).
  function draw(st) {
    var c = st.cur, want = Math.min(4, Math.max(1.5, c.s)) * (window.devicePixelRatio || 1);
    if (st.drawn === c.page && st.res >= want - 0.01) return Promise.resolve();
    return docOf(st.el).then(function (doc) {
      st.pages = doc.numPages; c.page = Math.min(Math.max(1, c.page), doc.numPages);
      return doc.getPage(c.page);
    }).then(function (p) {
      var v1 = p.getViewport({ scale: 1 }); st.ratio = v1.width / v1.height;
      var g = geo(st, 0, 0), vp = p.getViewport({ scale: g.pw * want / v1.width }), cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      cv.style.cssText = 'position:absolute;left:' + g.ox + 'px;top:' + g.oy + 'px;width:' + g.pw + 'px;height:' + g.ph + 'px;background:#fff';
      var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      return p.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        if (st.canvas) st.canvas.remove(); st.layer.appendChild(cv); st.canvas = cv; st.drawn = c.page; st.res = want;
        st.el.style.backgroundImage = 'none';
      });
    });
  }
  function label(st) { st.bar.querySelector('span').textContent = st.cur.page + (st.pages ? ' / ' + st.pages : ''); }
  // Go to a state (page and zoom), in `dur` ms.
  function go(st, to, dur) {
    var newPage = to.page !== st.cur.page;
    st.cur = { page: to.page, x: Math.min(1, Math.max(0, to.x)), y: Math.min(1, Math.max(0, to.y)), s: Math.min(8, Math.max(1, to.s)) };
    var apply = function () { st.layer.style.transition = dur ? 'transform ' + dur + 'ms ease-in-out' : 'none'; st.layer.style.transform = transform(st); label(st); };
    if (newPage) { st.layer.style.transition = 'none'; draw(st).then(apply, function () {}); }
    else { apply(); draw(st).then(function () { st.layer.style.transform = transform(st); }, function () {}); }
  }
  // The steps: the state is the latest visible step's (by click order), or the start.
  function stepsOf(el) {
    var sec = el.closest('section'); if (!sec) return [];
    return [].slice.call(sec.querySelectorAll('[data-pdfgo]')).filter(function (f) { return f === el || f.contains(el); });
  }
  function settle(el, dur) {
    var st = setup(el), shown = stepsOf(el).filter(function (f) { return f.classList.contains('visible') || f.classList.contains('on'); });
    shown.sort(function (a, b) { return (+a.getAttribute('data-fragment-index') || 0) - (+b.getAttribute('data-fragment-index') || 0) || (a.compareDocumentPosition(b) & 4 ? -1 : 1); });
    var last = shown[shown.length - 1], to = initial(el);
    if (last) { var g = JSON.parse(last.getAttribute('data-pdfgo')); to = { page: +g.page || st.cur.page, x: g.x == null ? 0.5 : +g.x, y: g.y == null ? 0.5 : +g.y, s: +g.s || 1 }; }
    var wait = last && dur ? secs(getComputedStyle(last).getPropertyValue('--anim-del')) : 0, d = last && dur ? secs(getComputedStyle(last).getPropertyValue('--anim-dur')) || 600 : 0;
    setTimeout(function () { go(st, to, d); }, wait);
  }
  function inSlide(slide) { if (slide) slide.querySelectorAll('[data-pdf]').forEach(function (el) { settle(el, false); }); }
  function fromFragments(e) {
    (e.fragments || [e.fragment]).forEach(function (f) {
      if (!f.hasAttribute('data-pdfgo')) return;
      var el = f.matches('[data-pdf]') ? f : f.querySelector('[data-pdf]'); if (el) settle(el, true);
    });
  }
  if (window.Reveal) {
    Reveal.on('ready', function (e) { inSlide(e.currentSlide); });
    Reveal.on('slidechanged', function (e) { inSlide(e.currentSlide); });
    Reveal.on('fragmentshown', fromFragments); Reveal.on('fragmenthidden', fromFragments);
    Reveal.on('resize', function () { document.querySelectorAll('[data-pdf]').forEach(function (el) { if (el._pdf) go(el._pdf, el._pdf.cur, 0); }); });
    // Steps played by clicking another object.
    document.addEventListener('click', function (e) {
      var s = e.target.closest && e.target.closest('[data-bid]'); if (!s) return;
      setTimeout(function () { s.closest('section').querySelectorAll('[data-trig="' + s.getAttribute('data-bid') + '"][data-pdfgo]').forEach(function (f) {
        var el = f.matches('[data-pdf]') ? f : f.querySelector('[data-pdf]'); if (el) settle(el, true); }); }, 0);
    });
    if (Reveal.isReady()) inSlide(Reveal.getCurrentSlide());
  }
  return { setup: setup, go: go, settle: settle };
}
