// Tab stops (PowerPoint's ruler: left, centre, right and decimal tabs). CSS only
// has evenly spaced tabs, so each tab character is given the width that takes
// the text after it to its stop: measured, in order, as it is laid out. Stops
// are in px from the text's left edge; past the last one, every 96 px (an inch,
// PowerPoint's default). Runs as source in the exported presentation
// (toString), so it imports nothing; the editor uses the same code.
export function tabRuntime() {
  var STEP = 96;
  function blockOf(n, root) { while (n && n !== root && !/^(P|DIV|LI|H\d)$/.test(n.nodeName)) n = n.parentNode; return n || root; }
  // Undo a previous layout: the tab characters back as plain text.
  function clear(root) {
    root.querySelectorAll('span.rv-tab').forEach(function (s) { s.replaceWith(document.createTextNode(s.textContent)); });   // (anything typed into one stays)
    root.normalize();
  }
  function layout(root, stops) {
    clear(root);
    stops = (stops || []).slice().sort(function (a, b) { return a.pos - b.pos; });
    // Every tab character in its own span, to be given a width.
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), texts = [], n;
    while ((n = walker.nextNode())) if (n.nodeValue.indexOf('\t') >= 0) texts.push(n);
    var tabs = [];
    texts.forEach(function (t) {
      var parts = t.nodeValue.split('\t'), frag = document.createDocumentFragment();
      parts.forEach(function (p, i) {
        if (p) frag.appendChild(document.createTextNode(p));
        if (i < parts.length - 1) { var s = document.createElement('span'); s.className = 'rv-tab'; s.textContent = '\t'; s.style.cssText = 'display:inline-block;white-space:pre;width:0'; frag.appendChild(s); tabs.push(s); }
      });
      t.replaceWith(frag);
    });
    if (!tabs.length) return 0;
    var box = root.getBoundingClientRect(), k = box.width / (root.offsetWidth || box.width || 1) || 1;
    var left = box.left + (parseFloat(getComputedStyle(root).paddingLeft) || 0) * k;
    tabs.forEach(function (s, i) {
      var x = (s.getBoundingClientRect().left - left) / k;
      var stop = null; for (var j = 0; j < stops.length; j++) if (stops[j].pos > x + 0.5) { stop = stops[j]; break; }
      if (!stop) { s.style.width = (Math.floor(x / STEP + 1) * STEP - x) + 'px'; return; }
      // What follows, up to the next tab or the end of its paragraph: its width (to the decimal sign, for decimal tabs).
      var r = document.createRange(), blk = blockOf(s, root), next = tabs[i + 1] && blk.contains(tabs[i + 1]) ? tabs[i + 1] : null;
      r.setStartAfter(s); if (next) r.setEndBefore(next); else r.setEnd(blk, blk.childNodes.length);
      var seg = r.toString(), w = r.getBoundingClientRect().width / k;
      if (stop.align === 'decimal') {
        var m = seg.search(/[.,]\d/); if (m >= 0) { var r2 = document.createRange(), walk = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT), c = 0, t2, done = false;
          r2.setStartAfter(s);
          while (!done && (t2 = walk.nextNode())) { if (!r.intersectsNode(t2)) continue; var off = t2 === r.startContainer ? r.startOffset : 0, len = t2.nodeValue.length - off;
            if (c + len >= m) { r2.setEnd(t2, off + (m - c)); done = true; } else c += len; }
          if (done) w = r2.getBoundingClientRect().width / k; }
      }
      var room = stop.pos - x - (stop.align === 'right' || stop.align === 'decimal' ? w : stop.align === 'center' ? w / 2 : 0);
      s.style.width = Math.max(0, room) + 'px';
    });
    return tabs.length;
  }
  function all() {
    document.querySelectorAll('[data-tabs]').forEach(function (el) {
      if (!el.offsetParent) return;                               // (not shown now: laid out when it is)
      var stops = []; try { stops = JSON.parse(el.getAttribute('data-tabs')) || []; } catch (e) {}
      layout(el, stops);
    });
  }
  if (window.Reveal && document.querySelector('[data-tabs]')) {
    var run = function () { requestAnimationFrame(all); };
    if (Reveal.isReady()) run(); else Reveal.on('ready', run);
    Reveal.on('slidechanged', run); Reveal.on('resize', run);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);   // (widths change when the fonts arrive)
  }
  return { layout: layout, clear: clear };
}
