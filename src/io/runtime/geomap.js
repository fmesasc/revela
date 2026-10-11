// Maps that fly from stop to stop (Insertar ▸ Mapa, features/content/geomap.js), live with MapLibre GL JS: the same
// code draws the map in the editor's dialog and in the presentation (exported page, presenting, the speaker view's
// previews), so what is set up is what is shown. Runs as source in the exported page (toString): it imports nothing;
// what it needs comes in its arguments and in each map's data-geomap (all of it data, worked out by the editor).
//
// In the presentation each stop after the first is a step (a .mapflyfragment, data-mapgo="k"): showing it flies
// there — the line to it drawing itself on the way —, hiding it (going back) flies back; arriving at the slide puts
// the map where its latest visible step left it, at once. Until the map has loaded — and without a connection, for
// good, with a discreet notice — the stop's picture taken in the editor stands in for it.
//
// lib: MapLibre's address without .js / .css; rtl: the plugin for right-to-left place names; words: { offline }.
export function geoMapRuntime(lib, rtl, words) {
  words = words || {};
  var gl = null, mounted = [];
  var CSS = '.rvm-live{position:absolute;inset:0;opacity:0;transition:opacity .5s}.rvm-on>.rvm-live{opacity:1}.rvm-on>.rv-map-shot{visibility:hidden!important}'
    // (The credits: a short line always in sight, the whole of them behind MapLibre's ⓘ — never a wide bar over the map.)
    + '.rvm-live .maplibregl-ctrl-attrib{font:11px/1.3 system-ui,sans-serif;text-align:end;max-width:calc(100% - 20px)}'
    + '.rvm-credit{position:absolute;right:34px;bottom:6px;max-width:calc(100% - 48px);padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.7);color:#333;'
    + 'font:10px/1.4 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:1}'
    + '.rvm-live:has(.maplibregl-compact-show) ~ .rvm-credit{visibility:hidden}'
    + '.rvm-mk{position:absolute;width:0;height:0;pointer-events:none}.rvm-mk.rvm-cur{z-index:2}'
    + '.rvm-ic{position:absolute;display:block;transition:opacity .4s}.rvm-ic>svg,.rvm-ic>img{display:block;width:100%;height:100%}'
    + '.rvm-ic>img{box-sizing:border-box;border:2px solid #fff;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.45);object-fit:cover}'
    + '.rvm-mk>span{position:absolute;transform:translateY(-50%);font:600 15px/1.2 system-ui,sans-serif;color:#1d1f24;background:rgba(255,255,255,.92);padding:3px 8px;border-radius:12px;'
    + 'box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis;transition:opacity .4s}'
    + '.rvm-mk.rvm-hide{visibility:hidden}.rvm-mk.rvm-hide>*{opacity:0}.rvm-mk.rvm-past>*{opacity:.45}'
    + '.rvm-in-drop{animation:rvmDrop .8s cubic-bezier(.3,.7,.4,1) both}.rvm-in-grow{animation:rvmGrow .5s cubic-bezier(.3,1.5,.6,1) both}'
    + '@keyframes rvmDrop{0%{transform:translateY(-60px);opacity:0}45%{transform:none;opacity:1}62%{transform:translateY(-12px)}80%{transform:none}90%{transform:translateY(-3px)}100%{transform:none}}'
    + '@keyframes rvmGrow{from{transform:scale(0);opacity:0}to{transform:none;opacity:1}}'
    + '.rvm-note{position:absolute;left:14px;top:14px;max-width:min(46%,420px);padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.94);color:#1d1f24;'
    + 'text-align:start;font:400 16px/1.35 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.3);opacity:0;transform:translateY(-8px);transition:opacity .4s,transform .4s;pointer-events:none;z-index:2}'
    + '.rvm-note.rvm-show{opacity:1;transform:none}.rvm-note b{display:block;font-size:18px;margin-bottom:2px}'
    + '.rvm-off{position:absolute;right:8px;top:8px;padding:3px 9px;border-radius:10px;background:rgba(20,24,30,.72);color:#fff;font:12px/1.3 system-ui,sans-serif;z-index:3;pointer-events:none}'
    + '@media (prefers-reduced-motion:reduce){.rvm-ic,.rvm-note,.rvm-live{transition:none}.rvm-in-drop,.rvm-in-grow{animation:none}}';
  function styles() {
    if (document.getElementById('rvm-css')) return;
    var st = document.createElement('style'); st.id = 'rvm-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function load(cfg) {
    if (!gl) gl = window.maplibregl ? Promise.resolve(window.maplibregl) : new Promise(function (ok, ko) {
      if (lib && ![].some.call(document.querySelectorAll('link[rel=stylesheet]'), function (l) { return l.href === lib + '.css'; })) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = lib + '.css'; document.head.appendChild(l);
      }
      var s = document.createElement('script'); s.src = lib + '.js';
      s.onload = function () { window.maplibregl ? ok(window.maplibregl) : ko(new Error('maplibre')); };
      s.onerror = function () { gl = null; s.remove(); ko(new Error('maplibre')); };
      document.head.appendChild(s);
    });
    return gl.then(function (ml) {
      // (Arabic place names need their letters joined and laid right to left: MapLibre's plugin, once, when used.)
      if (cfg && cfg.lang === 'ar' && rtl && ml.getRTLTextPluginStatus && ml.getRTLTextPluginStatus() === 'unavailable') { try { ml.setRTLTextPlugin(rtl, true); } catch (e) {} }
      return ml;
    });
  }
  var reduced = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var ease = function (f) { return f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; };
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // One map in its box: { el, cfg, cur, map, ready, go(k, animate, dur), view(), update(cfg), capture(k), destroy() }.
  // opts: interactive (drag, zoom, turn), keyboard, capture (keeps its picture to be read), onMove(view).
  function mount(el, cfg, opts) {
    opts = opts || {}; styles();
    var c = { el: el, cfg: cfg, cur: 0, map: null, failed: false, dead: false, markers: [], token: 0 };
    var box = document.createElement('div'); box.className = 'rvm-live'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';      // (MapLibre's own CSS makes its box position:relative)
    box.style.background = cfg.look === 'map' ? '#e8e8e0' : '#05070d';
    var note = document.createElement('div'); note.className = 'rvm-note'; note.setAttribute('aria-live', 'polite');
    var credit = document.createElement('div'); credit.className = 'rvm-credit'; credit.textContent = cfg.short || ''; credit.hidden = true;
    el.appendChild(box); el.appendChild(note); el.appendChild(credit);
    // Zoom is kept for the block's own width (cfg.w): a smaller or bigger box shows the same area.
    var zk = function () { return Math.log2(Math.max(1, el.clientWidth || cfg.w) / cfg.w); };
    var pr = function () {
      if (opts.pixelRatio) return opts.pixelRatio;
      var k = (window.devicePixelRatio || 1) * Math.max(1, (window.Reveal && Reveal.getScale && Reveal.getScale()) || 1);
      return Math.max(1, Math.min(3, k, 4096 / Math.max(1, el.clientWidth || cfg.w)));
    };
    function offline(on) {
      c.failed = on; el.classList.toggle('rvm-offline', on);
      var n = el.querySelector(':scope > .rvm-off');
      if (on && !n && words.offline && !opts.quiet) { n = document.createElement('div'); n.className = 'rvm-off'; n.textContent = words.offline; el.appendChild(n); }
      if (!on && n) n.remove();
    }
    // Without the live map: the stop's picture (or the closest one before it).
    function shot(k) {
      var list = [].slice.call(el.querySelectorAll(':scope > .rv-map-shot')), best = null;
      list.forEach(function (im) { var i = +im.getAttribute('data-k'); if (i <= k && (!best || i > +best.getAttribute('data-k'))) best = im; });
      list.forEach(function (im) { im.style.visibility = im === (best || list[0]) ? 'visible' : 'hidden'; });
    }
    function geo(k, part) {
      var lines = [];
      (cfg.segs || []).forEach(function (s, i) {
        if (i < k - (part ? 1 : 0)) lines.push(s);
        else if (part && i === k - 1) { var n = Math.max(2, Math.round(1 + part * (s.length - 1))); lines.push(s.slice(0, n)); }
      });
      return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } };
    }
    // The places the markers (and their names) take, kept free of the map's own names: an invisible label over each
    // one, the topmost of the style's labels, so MapLibre leaves the space to it and hides the base map's names there.
    function spots(k, part) {
      return { type: 'FeatureCollection', features: cfg.stops.filter(function (s, i) { return cfg.all || i < k || (i === k && !part); }).map(function (s) {
        var a = s.m || { w: 0, h: 0, ax: 0.5, ay: 0.5 }, txt = cfg.labels && s.n ? s.n : '';
        return { type: 'Feature', properties: { t: '\u2588\u2588 ' + txt, off: [-a.ax * a.w / 17, (0.5 - a.ay) * a.h / 17] },
          geometry: { type: 'Point', coordinates: s.c } };
      }) };
    }
    function paint(k, part) {
      var m = c.map; if (!m) return;
      var src = m.getSource && m.getSource('rv-route'); if (src) src.setData(geo(k, part));
      var room = m.getSource && m.getSource('rv-room'); if (room) room.setData(spots(k, part));
      // (Visited stops stay — dimmed, if so —, the next ones wait; the one arrived at comes in falling or growing.)
      c.markers.forEach(function (mk, i) {
        var e = mk.getElement(), on = cfg.all || i < k || (i === k && !part), ic = e.firstChild;
        if (on && e.classList.contains('rvm-hide') && c.arriving && cfg.arrive !== 'none' && ic && !reduced()) {
          ic.classList.remove('rvm-in-drop', 'rvm-in-grow'); void ic.offsetWidth; ic.classList.add('rvm-in-' + cfg.arrive);
        }
        e.classList.toggle('rvm-hide', !on); e.classList.toggle('rvm-cur', i === k); e.classList.toggle('rvm-past', !!cfg.dim && i < k);
      });
    }
    function showNote(k, on) {
      var s = cfg.stops[k];
      if (on && s && s.t) note.innerHTML = '<b>' + esc(s.n || '') + '</b>' + esc(s.t).replace(/\n/g, '<br>');
      note.classList.toggle('rvm-show', !!(on && s && s.t));
    }
    function markers(ml) {
      c.markers.forEach(function (mk) { mk.remove(); }); c.markers = [];
      cfg.stops.forEach(function (s, i) {
        // (A box of no size on the place; the marker's picture around it by its anchor, the name to its right.)
        var e = document.createElement('div'), a = s.m; e.className = 'rvm-mk rvm-hide';
        var html = a ? '<i class="rvm-ic" style="left:' + (-a.ax * a.w) + 'px;top:' + (-a.ay * a.h) + 'px;width:' + a.w + 'px;height:' + a.h + 'px;transform-origin:' + (a.ax * 100) + '% ' + (a.ay * 100) + '%">'
          + (a.flag ? '<img alt="" src="' + esc(a.flag) + '">' : a.svg) + '</i>' : '';
        if (cfg.labels && s.n) html += '<span style="' + (a ? 'left:' + ((1 - a.ax) * a.w + 5) + 'px;top:' + ((0.5 - a.ay) * a.h) + 'px' : 'left:0;top:0;transform:translate(-50%,-50%)') + '">' + esc(s.n) + '</span>';
        e.innerHTML = html;
        c.markers.push(new ml.Marker({ element: e, anchor: 'center' }).setLngLat(s.c).addTo(c.map));
      });
    }
    // The style's own layers, once it is there (again after a change of style): globe or flat, the atmosphere, the
    // relief, the place names in the deck's language, and the line between the stops.
    function dress() {
      var m = c.map, cf = c.cfg;
      try { m.setProjection({ type: cf.proj }); } catch (e) {}
      if (cf.proj === 'globe') try { m.setSky({ 'sky-color': '#0b1d33', 'horizon-color': '#9cc3ff', 'fog-color': '#ffffff', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.9,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] }); } catch (e) {}
      if (cf.dem) try { if (!m.getSource('rv-dem')) m.addSource('rv-dem', cf.dem); m.setTerrain({ source: 'rv-dem', exaggeration: 1.3 }); } catch (e) {}
      var name = ['coalesce', ['get', 'name:' + cf.lang], ['get', 'name:latin'], ['get', 'name']];
      (m.getStyle().layers || []).forEach(function (l) {
        var tf = l.type === 'symbol' && l.layout && l.layout['text-field'];
        if (tf && /"name/.test(JSON.stringify(tf)) && !/"ref"/.test(JSON.stringify(tf))) try { m.setLayoutProperty(l.id, 'text-field', name); } catch (e) {}
      });
      if (!m.getSource('rv-route')) m.addSource('rv-route', { type: 'geojson', data: geo(c.cur) });
      if (!m.getSource('rv-room')) m.addSource('rv-room', { type: 'geojson', data: spots(c.cur) });
      if (!m.getLayer('rv-room')) try { m.addLayer({ id: 'rv-room', type: 'symbol', source: 'rv-room', layout: { 'text-field': ['get', 't'], 'text-font': ['Noto Sans Bold'], 'text-size': 17,
        'text-anchor': 'left', 'text-offset': ['array', 'number', 2, ['get', 'off']], 'text-padding': 6, 'text-allow-overlap': true, 'text-ignore-placement': false },
        paint: { 'text-opacity': 0 } }); } catch (e) {}
      if (!m.getLayer('rv-route-casing')) m.addLayer({ id: 'rv-route-casing', type: 'line', source: 'rv-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 } });
      if (!m.getLayer('rv-route')) m.addLayer({ id: 'rv-route', type: 'line', source: 'rv-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': cf.color, 'line-width': 4 } });
      paint(c.cur);
    }
    var s0 = cfg.stops[0] || { c: [0, 25], z: 1.2, p: 0, b: 0 };
    c.ready = load(cfg).then(function (ml) {
      if (c.dead) return c;
      var m = c.map = new ml.Map({ container: box, style: cfg.style, center: s0.c, zoom: s0.z + zk(), pitch: s0.p, bearing: s0.b, maxPitch: 85,
        interactive: opts.interactive !== false, attributionControl: { compact: true }, pixelRatio: pr(), fadeDuration: opts.capture ? 0 : 300,
        canvasContextAttributes: { antialias: true, preserveDrawingBuffer: !!opts.capture } });
      if (!opts.keyboard && m.keyboard) m.keyboard.disable();            // (the arrows are the presentation's)
      m.on('style.load', dress);
      if (opts.onMove) m.on('moveend', function () { opts.onMove(c.view()); });
      markers(ml);
      return new Promise(function (ok) {
        var done = false, t = setTimeout(function () { if (!done) offline(true); }, navigator.onLine === false ? 0 : 12000);
        m.on('load', function () {
          done = true; clearTimeout(t); offline(false); el.classList.add('rvm-on'); c.go(c.cur, false);
          // (MapLibre opens its compact credits at first: closed to their ⓘ, the short line says who to thank.)
          var at = box.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show');
          credit.hidden = !cfg.short; ok(c);
        });
        m.on('error', function () { if (!done && navigator.onLine === false) offline(true); });
      });
    }, function () { offline(true); return c; });
    shot(0);
    // Go to stop k: flying (dur ms; the line to it drawn on the way, if it is the next one), or at once.
    c.go = function (k, animate, dur) {
      k = Math.max(0, Math.min(cfg.stops.length - 1, k | 0));
      var prev = c.cur, me = ++c.token; c.cur = k; shot(k);
      var m = c.map, s = cfg.stops[k]; if (!m || !s || !el.classList.contains('rvm-on')) { showNote(k, true); return; }
      var to = { center: s.c, zoom: s.z + zk(), pitch: s.p || 0, bearing: s.b || 0 };
      dur = dur || 3000;
      c.arriving = false;
      if (!animate || reduced()) { m.stop(); m.jumpTo(to); paint(k); showNote(k, true); return; }
      c.arriving = true;
      showNote(k, false); paint(k === prev + 1 ? prev : k);
      m.flyTo(Object.assign(to, { duration: dur, curve: cfg.curve || 1.42 }));
      var t0 = performance.now();
      (function step() {
        if (me !== c.token) return;
        var f = Math.min(1, (performance.now() - t0) / dur);
        if (k === prev + 1) paint(k, ease(f) || 0.001);
        if (f < 1) requestAnimationFrame(step); else { paint(k); showNote(k, true); }
      })();
    };
    // Where the map is looking now, in the block's terms (for «Usar la vista actual»).
    c.view = function () {
      var m = c.map; if (!m) return null; var p = m.getCenter();
      return { lon: +p.lng.toFixed(5), lat: +p.lat.toFixed(5), zoom: +(m.getZoom() - zk()).toFixed(2), pitch: +m.getPitch().toFixed(1), bearing: +m.getBearing().toFixed(1) };
    };
    // New settings (the dialog, as they are edited): a new style if the look changed, else the line and the markers.
    c.update = function (next) {
      var restyle = JSON.stringify([next.style, next.proj, next.dem, next.lang]) !== JSON.stringify([cfg.style, cfg.proj, cfg.dem, cfg.lang]);
      cfg = c.cfg = next; credit.textContent = cfg.short || ''; box.style.background = cfg.look === 'map' ? '#e8e8e0' : '#05070d';
      c.cur = Math.min(c.cur, Math.max(0, cfg.stops.length - 1));
      if (!c.map) return;
      if (restyle) { try { c.map.setTerrain(null); } catch (e) {} c.map.setStyle(cfg.style, { diff: false }); }
      else try { if (c.map.getLayer('rv-route')) c.map.setPaintProperty('rv-route', 'line-color', cfg.color); } catch (e) {}
      load(cfg).then(function (ml) { c.arriving = false; markers(ml); paint(c.cur); });
    };
    // The picture of stop k, as presented: the map once everything has loaded, and over it the markers, the note and
    // the credits (they are HTML on the live map: drawn here). → a JPEG data: URL, or null if it couldn't be taken.
    c.capture = function (k) {
      return c.ready.then(function () {
        var m = c.map; if (!m || c.failed) return null;
        c.go(k, false);
        return new Promise(function (ok) { var t = setTimeout(ok, 25000); m.once('idle', function () { clearTimeout(t); ok(); }); m.triggerRepaint(); });
      }).then(function () {
        var m = c.map; if (!m || c.failed) return null;
        var src = m.getCanvas(), W = src.width, H = src.height, k2 = W / Math.max(1, box.clientWidth), cv = document.createElement('canvas');
        cv.width = W; cv.height = H; var g = cv.getContext('2d'); g.drawImage(src, 0, 0);
        g.textBaseline = 'middle';
        // (The markers as on the live map: each one's picture — its SVG, or the country's flag —, then its name.)
        return Promise.all(cfg.stops.map(function (s) {
          if (!s.m) return null;
          return new Promise(function (ok) { var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
            im.src = s.m.flag || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.m.svg); });
        })).then(function (pics) {
        cfg.stops.forEach(function (s, i) {
          if (!cfg.all && i > k) return;
          var p = m.project(s.c), x = p.x * k2, y = p.y * k2, a = s.m, im = pics[i];
          if (x < -300 * k2 || y < -80 * k2 || x > W + 80 * k2 || y > H + 80 * k2) return;
          g.globalAlpha = cfg.dim && i < k ? 0.45 : 1;
          if (a && im) {
            var dx = x - a.ax * a.w * k2, dy = y - a.ay * a.h * k2, dw = a.w * k2, dh = a.h * k2;
            if (a.flag) { g.fillStyle = '#fff'; g.fillRect(dx - 2 * k2, dy - 2 * k2, dw + 4 * k2, dh + 4 * k2); }
            try { g.drawImage(im, dx, dy, dw, dh); } catch (e) {}
          }
          if (cfg.labels && s.n) {
            g.font = '600 ' + (15 * k2) + 'px system-ui,sans-serif';
            var tw = Math.min(260 * k2, g.measureText(s.n).width), h = 24 * k2, ly = y + (a ? (0.5 - a.ay) * a.h * k2 : 0);
            var lx = a ? x + ((1 - a.ax) * a.w + 5) * k2 : x - (tw + 16 * k2) / 2;
            g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); (g.roundRect ? g.roundRect(lx, ly - h / 2, tw + 16 * k2, h, h / 2) : g.rect(lx, ly - h / 2, tw + 16 * k2, h)); g.fill();
            g.fillStyle = '#1d1f24'; g.fillText(s.n, lx + 8 * k2, ly, tw);
          }
          g.globalAlpha = 1;
        });
        var s = cfg.stops[k];
        if (s && s.t) {
          var pad = 14 * k2, maxw = Math.min(W * 0.46, 420 * k2) - 28 * k2, lines = [];
          g.font = '400 ' + (16 * k2) + 'px system-ui,sans-serif';
          String(s.t).split('\n').forEach(function (par) { var line = ''; par.split(' ').forEach(function (w) { var t2 = line ? line + ' ' + w : w; if (g.measureText(t2).width > maxw && line) { lines.push(line); line = w; } else line = t2; }); lines.push(line); });
          lines = lines.slice(0, 8);
          var lh = 21.6 * k2, hh = (s.n ? 26 * k2 : 0) + lines.length * lh + 20 * k2, ww = maxw + 28 * k2, bx = pad, by = pad;
          g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); (g.roundRect ? g.roundRect(bx, by, ww, hh, 10 * k2) : g.rect(bx, by, ww, hh)); g.fill();
          g.fillStyle = '#1d1f24'; var ty = by + 10 * k2;
          if (s.n) { g.font = '700 ' + (18 * k2) + 'px system-ui,sans-serif'; g.fillText(s.n, bx + 14 * k2, ty + 12 * k2, maxw); ty += 26 * k2; }
          g.font = '400 ' + (16 * k2) + 'px system-ui,sans-serif';
          lines.forEach(function (l, i) { g.fillText(l, bx + 14 * k2, ty + lh * i + lh / 2, maxw); });
        }
        if (cfg.credit) {
          // (One small line in the corner, whatever the picture's width: smaller letters if it doesn't fit.)
          var fs = 10 * k2; g.font = fs + 'px system-ui,sans-serif'; var tw0 = g.measureText(cfg.credit).width;
          if (tw0 > W * 0.96) { fs *= W * 0.96 / tw0; g.font = fs + 'px system-ui,sans-serif'; }
          var cw = g.measureText(cfg.credit).width + fs, ch = fs * 1.5;
          g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(W - cw, H - ch, cw, ch); g.fillStyle = '#333'; g.fillText(cfg.credit, W - cw + 5 * k2, H - ch / 2);
        }
        try { return cv.toDataURL('image/jpeg', 0.85); } catch (e) { return null; }
        });
      });
    };
    c.resize = function () { if (c.map) { try { c.map.setPixelRatio(pr()); } catch (e) {} c.map.resize(); } };
    c.destroy = function () {
      c.dead = true; c.token++; mounted = mounted.filter(function (x) { return x !== c; });
      if (c.map) try { c.map.remove(); } catch (e) {}
      box.remove(); note.remove(); credit.remove(); el.classList.remove('rvm-on', 'rvm-offline'); var n = el.querySelector(':scope > .rvm-off'); if (n) n.remove();
      el._rvm = null;
    };
    mounted.push(c);
    return c;
  }

  // The presentation: each map started when its slide is shown (and let go two slides away: browsers allow only so
  // many live maps); its steps followed forwards and back, as the PDF's (io/runtime/pdf.js).
  function secs(v) { v = String(v || '').trim(); return v.slice(-2) === 'ms' ? parseFloat(v) : parseFloat(v) * 1000 || 0; }
  function ensure(el) {
    if (el._rvm) return el._rvm;
    var cfg; try { cfg = JSON.parse(el.getAttribute('data-geomap')); } catch (e) { return null; }
    if (!cfg || !cfg.stops || !cfg.stops.length) return null;
    el._rvm = mount(el, cfg, { interactive: true });
    return el._rvm;
  }
  function settle(el, animate) {
    var c = ensure(el); if (!c) return;
    var sec = el.closest('section');
    var shown = sec ? [].slice.call(sec.querySelectorAll('[data-mapgo]')).filter(function (f) {
      return (f === el || f.contains(el)) && (f.classList.contains('visible') || f.classList.contains('on'));
    }) : [];
    shown.sort(function (a, b) { return (+a.getAttribute('data-fragment-index') || 0) - (+b.getAttribute('data-fragment-index') || 0) || (a.compareDocumentPosition(b) & 4 ? -1 : 1); });
    var last = shown[shown.length - 1], k = last ? +last.getAttribute('data-mapgo') || 0 : 0;
    var dur = last ? secs(getComputedStyle(last).getPropertyValue('--anim-dur')) || 3000 : 0;
    var wait = last && animate ? secs(getComputedStyle(last).getPropertyValue('--anim-del')) : 0;
    if (wait) setTimeout(function () { c.go(k, true, dur); }, wait); else c.go(k, animate, dur);
  }
  function near(sec, cur) {
    if (!window.Reveal || !sec) return false;
    var all = Reveal.getSlides(), a = all.indexOf(sec.closest('section')), b = all.indexOf(cur);
    return a >= 0 && b >= 0 && Math.abs(a - b) <= 1;
  }
  function inSlide(slide) {
    if (!slide) return;
    mounted.slice().forEach(function (c) { if (!c.el.isConnected || !near(c.el.closest('section'), slide)) { if (!c.el.closest('.rv-dlg-map')) c.destroy(); } });
    slide.querySelectorAll('[data-geomap]').forEach(function (el) { settle(el, false); if (el._rvm) el._rvm.resize(); });
  }
  function fromFragments(e) {
    (e.fragments || [e.fragment]).forEach(function (f) {
      if (!f || !f.hasAttribute('data-mapgo')) return;
      var el = f.matches('[data-geomap]') ? f : f.querySelector('[data-geomap]'); if (el) settle(el, true);
    });
  }
  if (window.Reveal && document.querySelector('[data-geomap]')) {
    Reveal.on('ready', function (e) { inSlide(e.currentSlide); });
    Reveal.on('slidechanged', function (e) { inSlide(e.currentSlide); });
    Reveal.on('fragmentshown', fromFragments); Reveal.on('fragmenthidden', fromFragments);
    Reveal.on('resize', function () { mounted.forEach(function (c) { c.resize(); }); });
    document.addEventListener('click', function (e) {
      var s = e.target.closest && e.target.closest('[data-bid]'); if (!s) return;
      setTimeout(function () { s.closest('section').querySelectorAll('[data-trig="' + s.getAttribute('data-bid') + '"][data-mapgo]').forEach(function (f) {
        var el = f.matches('[data-geomap]') ? f : f.querySelector('[data-geomap]'); if (el) settle(el, true); }); }, 0);
    });
    if (Reveal.isReady()) inSlide(Reveal.getCurrentSlide());
  }
  return { load: load, mount: mount, settle: settle, mounted: function () { return mounted.slice(); } };
}
