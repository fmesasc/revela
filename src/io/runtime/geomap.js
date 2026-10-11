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
    + '.rvm-credit{position:absolute;right:calc(34px - var(--rvm-r,0px));bottom:calc(6px - var(--rvm-b,0px));max-width:calc(100% - 48px);padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.7);color:#333;'
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
    + '.rvm-off{position:absolute;right:calc(8px - var(--rvm-r,0px));top:calc(8px - var(--rvm-t,0px));padding:3px 9px;border-radius:10px;background:rgba(20,24,30,.72);color:#fff;font:12px/1.3 system-ui,sans-serif;z-index:3;pointer-events:none}'
    + '.rvm-wait{position:absolute;left:calc(10px - var(--rvm-l,0px));bottom:calc(10px - var(--rvm-b,0px));width:18px;height:18px;border-radius:50%;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;'
    + 'box-shadow:0 0 4px rgba(0,0,0,.4);animation:rvmSpin .9s linear infinite;z-index:3;pointer-events:none}@keyframes rvmSpin{to{transform:rotate(360deg)}}'
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
      // (MapLibre reads the tiles of streets and names in one worker, outside Safari: plenty for a map that stays put,
      // a queue in a flight, where each zoom level brings new ones — even with them all in the browser's cache, a
      // street map flying Madrid → Rome → Tokyo → New York still lacked 29 % of its tiles at each frame; with two
      // workers 8 %, with four 6 % (2026-10-11). One per core — the browser counts each core twice where it runs two
      // threads —, leaving one free for the page, up to four; two at most on a small device. Before its first map.)
      if (!ml.__rvWorkers && ml.setWorkerCount && ml.getWorkerCount && ml.getWorkerCount() < 2) {
        var cores = Math.floor((navigator.hardwareConcurrency || 4) / 2);
        ml.__rvWorkers = 1; try { ml.setWorkerCount(Math.max(1, Math.min(small ? 2 : 4, cores - 1 || 1))); } catch (e) {}
      }
      // (Arabic place names need their letters joined and laid right to left: MapLibre's plugin, once, when used.)
      if (cfg && cfg.lang === 'ar' && rtl && ml.getRTLTextPluginStatus && ml.getRTLTextPluginStatus() === 'unavailable') { try { ml.setRTLTextPlugin(rtl, true); } catch (e) {} }
      return ml;
    });
  }
  // The place names in the deck's language, where the map has them.
  function localNames(m, lang) {
    var name = ['coalesce', ['get', 'name:' + lang], ['get', 'name:latin'], ['get', 'name']];
    (m.getStyle().layers || []).forEach(function (l) {
      var tf = l.type === 'symbol' && l.layout && l.layout['text-field'];
      if (tf && /"name/.test(JSON.stringify(tf)) && !/"ref"/.test(JSON.stringify(tf))) try { m.setLayoutProperty(l.id, 'text-field', name); } catch (e) {}
    });
  }
  // (A phone or a computer with little memory: two workers, and the flight ahead fetched only as far as its first
  // half — the rest as it flies, over the floor where it must; see fetchAhead().)
  var small = !!((navigator.deviceMemory && navigator.deviceMemory <= 4) || (window.matchMedia && matchMedia('(pointer: coarse)').matches));
  var later = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
  // (In the speaker view's previews — reveal.js loads the presentation there with ?receiver — nothing is fetched
  // ahead: the presentation itself does it, into the same browser.)
  var receiver = /[?&]receiver\b/.test(location.search);
  var reduced = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var ease = function (f) { return f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; };
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ── A floor under every map: the whole world at its coarsest — 1024 pixels round, zoom 1 of tiles of 512, zoom 2
  // of 256 — always held by the map, for each of its sources, so that wherever a flight is and whatever tile it
  // still lacks, MapLibre has something of the place to show, blurred, and never the empty background. (MapLibre
  // stands in for a missing tile only a coarser one it holds in view: one it has let go, even still in memory, it
  // doesn't take back for a tile that is loading — MapLibre 5.24, TileManager._updateRetainedTiles —, and in a
  // flight across the world it holds none of the places it passes over.) So these few tiles are asked for along
  // with the ones the view needs, at every frame: loaded once, kept, drawn under the others — where those are there
  // they cover them, and the tiles are drawn clipped to their own square. Three copies of the world side by side,
  // for a view across the date line (the globe, too, counts them so: measured). Uses MapLibre's inner workings
  // (its version is fixed in core/vendor.js): if they change, the map works as before, without its floor. Measured,
  // 2026-10-11: the stops look the same to the pixel with and without it.
  function floor(m) {
    var tms = (m.style && m.style.tileManagers) || {};
    Object.keys(tms).forEach(function (id) {
      var tm = tms[id], src = tm.getSource && tm.getSource(), orig = tm._updateRetainedTiles;
      if (tm._rvFloor || typeof orig !== 'function' || !src || !/^(vector|raster|raster-dem)$/.test(src.type)) return;
      tm._rvFloor = 1;
      var pinned = null;
      tm._updateRetainedTiles = function (ideal, zoom) {
        if (this.map && this.map._rvCoarse != null && this.transform && this.transform.zoom < this.map._rvCoarse) ideal = coarser(ideal);
        if (ideal.length && ideal[0] && ideal[0].constructor && ideal[0].scaledTo) {
          if (!pinned) {
            var Id = ideal[0].constructor, top = Math.max(src.minzoom || 0, Math.min(src.maxzoom == null ? 22 : src.maxzoom, (src.tileSize || 512) >= 512 ? 1 : 2));
            pinned = [];
            [-1, 0, 1].forEach(function (w) {
              for (var z = src.minzoom || 0; z <= top; z++) for (var x = 0; x < 1 << z; x++) for (var y = 0; y < 1 << z; y++) pinned.push(new Id(z, w, z, x, y));
            });
          }
          ideal = ideal.concat(pinned);
          tm._rvPinned = pinned;
        }
        var kept = orig.call(this, ideal, zoom);
        // (One that failed — the server busy a moment — asked for again, every few seconds: MapLibre wouldn't.)
        if (pinned) for (var i = 0, now = Date.now(); i < pinned.length; i++) {
          var t = this._inViewTiles.getTileById(pinned[i].key);
          if (t && t.state === 'errored' && now - (t._rvRetry || 0) > 3000) { t._rvRetry = now; try { this._reloadTile(pinned[i].key, 'reloading'); } catch (e) {} }
        }
        return kept;
      };
      // (Room in its memory for the flight ahead — fetchAhead() —, over what MapLibre keeps for the view itself.)
      var size = tm.updateCacheSize;
      // (Added as MapLibre sets its size — not after: setting it smaller first would let the flight's tiles go.)
      if (typeof size === 'function') tm.updateCacheSize = function (tr) {
        var cache = this._outOfViewCache, set = cache.setMaxSize, own = cache.hasOwnProperty('setMaxSize'), room = this._rvRoom || 0;
        cache.setMaxSize = function (n) { return set.call(cache, n + room); };
        try { size.call(this, tr); } finally { if (own) cache.setMaxSize = set; else delete cache.setMaxSize; }
      };
    });
  }

  // Whether the floor is all there (each of its tiles in, or failed): a flight waits for it too.
  function floorIn(m) {
    var tms = (m.style && m.style.tileManagers) || {};
    return Object.keys(tms).every(function (id) {
      var tm = tms[id];
      // (Only the sources shown now: one the style hides at this zoom — a relief shading of the whole world, on the
      // street map — holds no tiles, its floor neither.)
      return !tm._rvPinned || !(tm.used || tm.usedForTerrain) || tm._rvPinned.every(function (p) { var t = tm._inViewTiles.getTileById(p.key); return t && (t.hasData() || t.state === 'errored'); });
    });
  }
  // In the middle of a flight — a zoom level or more under both its ends —, each tile one level coarser: a quarter of
  // the tiles where the view sweeps fastest, too fast for the eye to tell; the flight's ends, sharp as ever.
  // (Measured: the satellite's flights asked for some 600 tiles each, and a click 1 s after landing waited 4 s.)
  function coarser(ideal) {
    var out = [], seen = {};
    ideal.forEach(function (t) {
      var u = t.overscaledZ > 0 && t.scaledTo ? t.scaledTo(t.overscaledZ - 1) : t;
      if (!seen[u.key]) { seen[u.key] = 1; out.push(u); }
    });
    return out;
  }
  // ── The flight ahead, fetched into the map itself. A map shows sharp only the tiles it holds — maps can't share
  // them, and the browser's cache alone isn't enough: with every tile there, a flight still lacked a fifth of them,
  // the map reading them too late (2026-10-11) —. So once at a stop, the map works out every tile the next flight
  // will ask for, frame by frame, and fetches them all at once into its own memory, where MapLibre takes them from
  // in the flight. Working them out moves nothing on screen: the camera is put at each point of the flight and back
  // within one task — no frame is drawn meanwhile —, MapLibre's own flyTo placed there (its easing run at once, to
  // that point) and its own choice of tiles asked for each source (TileManager.update, with the view's relief and
  // tilt); fetching them doesn't show them either: they go straight to the memory MapLibre keeps the tiles it has
  // let go in (_outOfViewCache), with room made for them, and leave it, the oldest first, once the flight has landed.
  // Only those: nothing the flight won't show is fetched (and no hidden map, as before: a WebGL context and its
  // tiles less). Measured (2026-10-12, Madrid → Rome → Tokyo → New York → Rio, tilted, with relief, the cache
  // empty), against rehearsing each flight point by point on the map itself under a still of it, as before: a click
  // 1 s after landing waited 1.7 s on average instead of 8.5 (street map), 3.1 instead of 9.5 (satellite), 4 at most
  // instead of 10–12 (globe); 8 s after, nothing; 40–75 % fewer tiles asked for; never a hole. Uses MapLibre's inner
  // workings (5.24, fixed in core/vendor.js); if they change, the map flies as before, over its floor.
  //
  // The tiles of a source the map's view, as it is now, asks for (what TileManager.update would load), not loading them.
  function wanted(m, tm, id, terrain, lod) {
    var got = null, fake = Object.create(tm), z = m.getZoom(), lays = (m.style && m.style._layers) || {};
    fake._updateRetainedTiles = function (ideal) { got = ideal; return {}; };
    fake._cleanUpRasterTiles = fake._cleanUpVectorTiles = fake.updateCacheSize = fake.handleWrapJump = fake.fire = function () {};
    // (Only where the style shows the source at that zoom; the relief, by its own flag.)
    fake.used = Object.keys(lays).some(function (k) { var l = lays[k]; return l.source === id && !(l.isHidden && l.isHidden(z)); });
    try { tm.update.call(fake, m.transform, terrain); } catch (e) { return []; }
    return got ? (z < lod ? coarser(got) : got) : [];
  }
  // How many points of a flight to work out: one every `step` screenfuls of its way. (Its length, S, as MapLibre's
  // flyTo works it out — van Wijk and Nuij's optimal path —, which moves at an even pace for the eye along it:
  // points evenly spread on it are as far apart on screen, low or high.)
  function points(a, b, span, rho, step) {
    var px = function (c, lon) { var s = 512 * Math.pow(2, a.z), la = Math.max(-85, Math.min(85, c[1])) * Math.PI / 180;
      return [(lon + 180) / 360 * s, (Math.PI - Math.log(Math.tan(Math.PI / 4 + la / 2))) / (2 * Math.PI) * s]; };
    var dl = b.c[0] - a.c[0]; while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
    var p = px(a.c, a.c[0]), q = px(b.c, a.c[0] + dl), u1 = Math.sqrt(Math.pow(q[0] - p[0], 2) + Math.pow(q[1] - p[1], 2));
    var w0 = span, w1 = span / Math.pow(2, b.z - a.z), r2 = rho * rho;
    var r = function (end) { var x = (w1 * w1 - w0 * w0 + (end ? -1 : 1) * r2 * r2 * u1 * u1) / (2 * (end ? w1 : w0) * r2 * u1); return Math.log(Math.sqrt(x * x + 1) - x); };
    var S = u1 < 1e-6 ? Math.abs(Math.log(w1 / w0)) / rho : (r(true) - r(false)) / rho;
    return Math.ceil((isFinite(S) ? S : 2) / step);
  }
  // Every tile of the flight from the map's view to `to` (camera), each source's in the order the flight needs them.
  // n points along it; worked out a few at a time (a task each), so the page never stalls; → a promise.
  function flightTiles(m, to, curve, n, alive) {
    var tms = m.style.tileManagers, ids = Object.keys(tms).filter(function (id) { return tms[id]._rvFloor; }), out = {}, seen = {};
    ids.forEach(function (id) { out[id] = []; seen[id] = {}; });
    var p = m.getCenter(), from = { center: [p.lng, p.lat], zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() }, i = 0;
    var lod = Math.min(from.zoom, to.zoom) - 1;
    return new Promise(function (ok) {
      (function chunk() {
        if (!alive() || m.isMoving()) return ok(null);
        var end = Math.min(n, i + 12);
        m._ease = function (frame, finish, o) { frame(o.easing(1)); finish(); };     // (the flight, put at its point at once)
        // (Nor a word of it to anyone: the markers would follow each point — and on relief each asks the graphics
        // card whether it is hidden behind a mountain, waiting for its answer: seconds, measured.)
        m.fire = function () { return m; };
        try {
          for (; i < end; i++) {
            var f = (i + 1) / n;
            m.jumpTo(from);
            if (f < 1) m.flyTo(Object.assign({}, to, { duration: 1, curve: curve, essential: true, easing: function () { return f; } })); else m.jumpTo(to);
            ids.forEach(function (id) {
              wanted(m, tms[id], id, m.terrain, lod).forEach(function (t) { if (!seen[id][t.key]) { seen[id][t.key] = 1; out[id].push(t); } });
            });
          }
        } finally { delete m._ease; delete m.fire; m.jumpTo(from); }
        if (i < n) setTimeout(chunk, 0); else ok(out);
      })();
    });
  }
  // Fetch tiles into a source's memory (not into the view); job.left counts them down, job.ok() once all are in.
  function fetchInto(tm, list, job) {
    var any = tm._inViewTiles.getAllTiles()[0], Tile = any && any.constructor, cache = tm._outOfViewCache;
    if (!Tile) return;
    var pend = tm._rvPending || (tm._rvPending = {});
    list.forEach(function (id) {
      var key = id.wrapped().key;
      if (tm._inViewTiles.getTileById(id.key) || cache.has(id) || pend[key]) return;
      var tile = pend[key] = new Tile(id, tm._source.tileSize * id.overscaleFactor());
      job.left++; job.asked++;
      tm._loadTile(tile, id.key, tile.state).then(function () {
        delete pend[key];
        // (Not sent to the graphics card ahead of time, as MapLibre does when it first draws a tile: done from here,
        // it made every frame of the flight cost twice as much — 60 frames a flight instead of 180, measured.)
        if (tile.hasData() && !tm._inViewTiles.getTileById(id.key) && !cache.has(id)) cache.add(id, tile, tile.getExpiryTimeout());
        else if (!tm._inViewTiles.getTileById(id.key)) try { tm._unloadTile(tile); } catch (e) {}
        if (!--job.left && job.ok) job.ok();
      });
    });
  }

  // One map in its box: { el, cfg, cur, map, ready, go(k, animate, dur), view(), update(cfg), capture(k), destroy() }.
  // opts: interactive (drag, zoom, turn), keyboard, capture (keeps its picture to be read), onMove(view).
  function mount(el, cfg, opts) {
    opts = opts || {}; styles();
    var c = { el: el, cfg: cfg, cur: 0, map: null, failed: false, dead: false, markers: [], token: 0, warms: opts.warm !== false && !opts.capture };
    var box = document.createElement('div'); box.className = 'rvm-live'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';      // (MapLibre's own CSS makes its box position:relative)
    box.style.background = cfg.look === 'map' ? '#e8e8e0' : '#05070d';
    var note = document.createElement('div'); note.className = 'rvm-note'; note.setAttribute('aria-live', 'polite');
    var credit = document.createElement('div'); credit.className = 'rvm-credit'; credit.textContent = cfg.short || ''; credit.hidden = true;
    el.appendChild(box); el.appendChild(note); el.appendChild(credit);
    // Zoom is kept for the block's own size (cfg.w × cfg.h): a smaller or bigger box shows the same area — all of it,
    // and more around it if the box took another proportion (a slide adapted to the screen: screenfit.js).
    var zk = function () { return Math.log2(Math.max(1e-3, Math.min((el.clientWidth || cfg.w) / cfg.w, (el.clientHeight || cfg.h) / cfg.h))); };
    var pr = function () {
      if (opts.pixelRatio) return opts.pixelRatio;
      // (As many pixels as the screen shows of it: a slide shrunk to a phone's width needs no more than the phone has.)
      var k = (window.devicePixelRatio || 1) * ((window.Reveal && Reveal.getScale && Reveal.getScale()) || 1);
      return Math.max(1, Math.min(3, k, 4096 / Math.max(1, box.clientWidth || el.clientWidth || cfg.w)));
    };
    // ── A map over the whole slide (data-bleed: io/formats/html.js) on a screen of another proportion — a 16:9 slide
    // on a 16:10 screen —: the map goes on to the screen's edges, as a background would,
    // instead of bands of the slide's background around it (Francisco, 2026-10-12). Its box grows past the slide
    // by as much on each side (so its middle, and the view of each stop, stay just where they were: what is extra is
    // more map around); its credits and the sign that it is offline or waiting go to the screen's real corners
    // (--rvm-*), the stop's note stays on the slide. Not with black bands chosen (data-fit="bands"), nor in the
    // editor, nor for the pictures.
    function bleed() {
      var ex = [0, 0, 0, 0], root = window.Reveal && Reveal.getScale && el.hasAttribute('data-bleed') && !opts.capture && el.closest('.reveal');
      // (Not in reveal.js's scroll view — a phone held upright —: there the slides are read one after the other, a page
      // each, and a map the height of several screens would be too much for a phone; it stays in its box.)
      if (root && root.getAttribute('data-fit') !== 'bands' && !(Reveal.isScrollView && Reveal.isScrollView())) {
        var st = el.closest('.stage') || el.parentElement, k = Reveal.getScale() || 1, rc = Reveal.getConfig() || {};
        var mx = Math.max(0, (root.offsetWidth / k - (rc.width || st.offsetWidth)) / 2), my = Math.max(0, (root.offsetHeight / k - (rc.height || st.offsetHeight)) / 2);
        var sr = st.getBoundingClientRect(), er = el.getBoundingClientRect(), sk = sr.width / (st.offsetWidth || 1) || 1;
        ex = [mx + (er.left - sr.left) / sk, my + (er.top - sr.top) / sk, mx + (sr.right - er.right) / sk, my + (sr.bottom - er.bottom) / sk].map(function (v) { return Math.max(0, Math.round(v)); });
      }
      var hx = Math.max(ex[0], ex[2]), hy = Math.max(ex[1], ex[3]);
      box.style.left = -hx + 'px'; box.style.top = -hy + 'px';
      box.style.width = hx ? 'calc(100% + ' + 2 * hx + 'px)' : '100%'; box.style.height = hy ? 'calc(100% + ' + 2 * hy + 'px)' : '100%';
      ['l', 't', 'r', 'b'].forEach(function (n, i) { el.style.setProperty('--rvm-' + n, ex[i] + 'px'); });
      el.style.overflow = hx || hy ? 'visible' : 'hidden';
      if (hx || hy) el.setAttribute('data-bled', ''); else el.removeAttribute('data-bled');
    }
    bleed();
    // (Its box resized under it — a slide adapted to the screen's proportion stretches a map that spans it:
    // screenfit.js —: the map follows, its centre and zoom kept, so what is new is more map around.)
    if (window.ResizeObserver && !opts.capture) { c.ro = new ResizeObserver(function () { if (!c.dead) c.resize(); }); c.ro.observe(el); }
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
      localNames(m, cf.lang);
      // (Raster tiles cross-fade with the coarser ones under them, which fades those out — the floor too: shown at once.)
      (m.getStyle().layers || []).forEach(function (l) { if (l.type === 'raster') try { m.setPaintProperty(l.id, 'raster-fade-duration', 0); } catch (e) {} });
      if (!opts.capture) floor(m);
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
      m.on('moveend', function (e) { if (e && e.originalEvent && c.settled) ahead(300); });   // (moved by hand: from there)
      markers(ml);
      return new Promise(function (ok) {
        var done = false, t = setTimeout(function () { if (!done) offline(true); }, navigator.onLine === false ? 0 : 12000);
        m.on('load', function () {
          done = true; clearTimeout(t); offline(false); el.classList.add('rvm-on'); c.go(c.cur, false);
          // (MapLibre opens its compact credits at first: closed to their ⓘ, the short line says who to thank.)
          var at = box.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show');
          credit.hidden = !cfg.short; ok(c);
          // (Its first view loaded, the flight ahead: fetchAhead().)
          m.once('idle', function () { c.settled = true; ahead(0); });
        });
        m.on('error', function () { if (!done && navigator.onLine === false) offline(true); });
      });
    }, function () { offline(true); return c; });
    shot(0);
    // ── The next flight, its tiles fetched into this map's memory as soon as it is at a stop (fetchAhead(), above):
    // in the flight MapLibre finds them there. A click before they are all in waits for them — a small sign says so —
    // at most WAIT ms; then it flies anyway, over the floor (floor()) where a tile is still missing.
    var job = null, WAIT = 4000;
    var camNow = function () { var m = c.map, p = m.getCenter(); return { center: [p.lng, p.lat], zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() }; };
    var camKey = function (a) { return [a.center[0], a.center[1], a.zoom, a.pitch, a.bearing].map(function (v) { return Math.round(v * 1e4) / 1e4; }).join(','); };
    var camOf = function (s) { return { center: s.c, zoom: s.z + zk(), pitch: s.p || 0, bearing: s.b || 0 }; };
    var fetches = function () { return c.warms && !reduced() && navigator.onLine !== false; };
    function sign(on) {
      var n = el.querySelector(':scope > .rvm-wait');
      if (on && !n) { n = document.createElement('div'); n.className = 'rvm-wait'; n.setAttribute('aria-hidden', 'true'); el.appendChild(n); el.setAttribute('aria-busy', 'true'); }
      if (!on && n) { n.remove(); el.removeAttribute('aria-busy'); }
    }
    // (The fetches still on their way, given up.)
    function drop() {
      var m = c.map, tms = (m && m.style && m.style.tileManagers) || {};
      Object.keys(tms).forEach(function (id) {
        var tm = tms[id], pend = tm._rvPending || {};
        Object.keys(pend).forEach(function (k) { var t = pend[k]; delete pend[k]; t.aborted = true; try { tm._abortTile(t); tm._unloadTile(t); } catch (e) {} });
      });
      job = null;
    }
    // (The room made for a flight's tiles, given back: the oldest of them go first.)
    function free() {
      var m = c.map, tms = (m && m.style && m.style.tileManagers) || {};
      Object.keys(tms).forEach(function (id) { var tm = tms[id]; if (tm._rvRoom) { tm._rvRoom = 0; if (tm.transform) tm.updateCacheSize(tm.transform); } });
    }
    // The flight from where the map is to `to`: its tiles worked out — a point every tenth of a screenful of its way —
    // and fetched, room made for them. → { key, ready: a promise, once they are in }.
    function fetchAhead(to) {
      var m = c.map, from = camNow(), key = camKey(from) + '>' + camKey(to);
      if (job && job.key === key) return job;
      var j = job = { key: key, left: 0, asked: 0 };
      var n = Math.min(240, Math.max(24, points({ c: from.center, z: from.zoom }, { c: to.center, z: to.zoom }, Math.max(el.clientWidth || cfg.w, el.clientHeight || cfg.h), cfg.curve || 1.42, 0.1)));
      j.ready = flightTiles(m, to, cfg.curve || 1.42, n, function () { return job === j && !c.dead; }).then(function (sets) {
        if (!sets || job !== j || c.dead) return;
        var tms = m.style.tileManagers;
        Object.keys(sets).forEach(function (id) {
          var tm = tms[id], list = sets[id];
          if (!tm || !list.length) return;
          if (small) list = list.slice(0, Math.ceil(list.length / 2));      // (in the order the flight needs them)
          tm._rvRoom = Math.ceil(list.length * 1.5);
          if (tm.transform) tm.updateCacheSize(tm.transform);
          fetchInto(tm, list, j);
        });
        if (j.left) return new Promise(function (ok) { j.ok = ok; });
      });
      return j;
    }
    // After arriving, the next flight. (ms: after a moment — moved by hand, once it is left still.)
    function ahead(ms) {
      clearTimeout(c.at);
      c.at = setTimeout(function () {
        var m = c.map, s = cfg.stops[c.cur + 1];
        if (c.dead || !m || !s || !fetches()) return;
        if (m.isMoving()) return ahead(300);
        fetchAhead(camOf(s));
      }, ms || 0);
    }
    // Go to stop k: flying (dur ms; the line to it drawn on the way, if it is the next one), or at once.
    // → a promise, once there.
    c.go = function (k, animate, dur) {
      k = Math.max(0, Math.min(cfg.stops.length - 1, k | 0));
      var prev = c.cur, me = ++c.token; c.cur = k; shot(k);
      var m = c.map, s = cfg.stops[k]; if (!m || !s || !el.classList.contains('rvm-on')) { showNote(k, true); return Promise.resolve(); }
      var to = camOf(s);
      dur = dur || 3000;
      c.arriving = false; sign(false);
      if (!animate || reduced()) {
        m.stop(); m.jumpTo(to); paint(k); showNote(k, true);
        if (c.settled) { free(); job = null; ahead(0); }
        return Promise.resolve();
      }
      c.arriving = true;
      showNote(k, false); paint(k === prev + 1 ? prev : k);
      var fly = function () {
        if (me !== c.token) return;
        sign(false);
        c.flight = Date.now();
        // (Tiles still on their way, given up: the flight's own requests would queue behind them — and the flight
        // asks for the very same ones, nearest first.)
        if (job && job.left) drop();
        m._rvCoarse = Math.min(m.getZoom(), to.zoom) - 1;             // (coarser(): as the tiles were worked out)
        m.flyTo(Object.assign(to, { duration: dur, curve: cfg.curve || 1.42 }));
        var t0 = performance.now();
        return new Promise(function (ok) {
          (function step() {
            if (me !== c.token) { m._rvCoarse = null; return ok(); }
            var f = Math.min(1, (performance.now() - t0) / dur);
            if (k === prev + 1) paint(k, ease(f) || 0.001);
            if (f < 1) requestAnimationFrame(step);
            else { m._rvCoarse = null; m.triggerRepaint(); paint(k); showNote(k, true); ok(); free(); job = null; ahead(0); }
          })();
        });
      };
      // (A click while it flies: on from where it is, at once — over the floor where it must.)
      if (!fetches() || m.isMoving()) return fly();
      var t = setTimeout(function () { if (me === c.token) sign(true); }, 300), t0 = Date.now();
      // (And the floor: on a slow computer the map may still be fetching it when the presenter clicks.)
      var floorReady = function () { return floorIn(m) || Date.now() - t0 > WAIT ? Promise.resolve() : later(100).then(floorReady); };
      return Promise.race([fetchAhead(to).ready.then(floorReady), later(WAIT)]).then(function () { clearTimeout(t); return fly(); });
    };
    // Where the map is looking now, in the block's terms (for «Usar la vista actual»).
    c.view = function () {
      var m = c.map; if (!m) return null; var v = camNow();
      return { lon: +v.center[0].toFixed(5), lat: +v.center[1].toFixed(5), zoom: +(v.zoom - zk()).toFixed(2), pitch: +v.pitch.toFixed(1), bearing: +v.bearing.toFixed(1) };
    };
    // New settings (the dialog, as they are edited): a new style if the look changed, else the line and the markers.
    c.update = function (next) {
      var restyle = JSON.stringify([next.style, next.proj, next.dem, next.lang]) !== JSON.stringify([cfg.style, cfg.proj, cfg.dem, cfg.lang]);
      cfg = c.cfg = next; credit.textContent = cfg.short || ''; box.style.background = cfg.look === 'map' ? '#e8e8e0' : '#05070d';
      c.cur = Math.min(c.cur, Math.max(0, cfg.stops.length - 1));
      if (!c.map) return;
      // (Edited in the dialog: what was being warmed is no longer the trip; warmed again once the edits pause.)
      // (Edited in the dialog: the flight ahead is another; fetched again once the edits pause.)
      job = null; free();
      if (c.settled) ahead(1500);
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
    c.resize = function () { bleed(); if (c.map) { try { c.map.setPixelRatio(pr()); } catch (e) {} c.map.resize(); } };
    c.destroy = function () {
      c.dead = true; c.token++; if (c.ro) c.ro.disconnect(); mounted = mounted.filter(function (x) { return x !== c; }); clearTimeout(c.at); job = null;
      if (c.map) try { c.map.remove(); } catch (e) {}
      box.remove(); note.remove(); credit.remove(); el.classList.remove('rvm-on', 'rvm-offline'); el.style.overflow = 'hidden'; el.removeAttribute('data-bled'); var n = el.querySelector(':scope > .rvm-off'); if (n) n.remove();
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
    el._rvm = mount(el, cfg, { interactive: true, warm: !receiver });
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
    // (A map on the next slide, started now — reveal.js has it laid out already —: its first view loaded and its
    // first flight fetched before it is shown. Not in the speaker view's previews: the presentation does it.)
    var all = Reveal.getSlides(), next = all[all.indexOf(slide) + 1];
    if (next && !receiver) next.querySelectorAll('[data-geomap]').forEach(function (el) { ensure(el); });
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
