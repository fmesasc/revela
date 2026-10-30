// Maps that fly from stop to stop (Insertar ▸ Mapa, features/content/geomap.js), live with MapLibre GL JS: the same
// code draws the map in the editor's dialog and in the presentation (exported page, presenting, the speaker view's
// previews), so what is set up is what is shown. Runs as source in the exported page (toString): it imports nothing;
// what it needs comes in its arguments and in each map's data-geomap (all of it data, worked out by the editor).
//
// In the presentation each stop after the first is a step (a .mapflyfragment, data-mapgo="k"): showing it flies
// there — the line to it drawing itself on the way —, hiding it (going back) flies back; arriving at the slide puts
// the map where its latest visible step left it, at once. Until the map has loaded — and without a connection, for
// good, with a discreet notice — the stop's picture taken in the editor stands in for it. At a stop the map may keep
// moving (cfg.motion: the globe turning, the camera going round, nearing slowly — motion()); the slide may start
// from the Earth seen from space or from where the previous slide's map was left (cfg.start — c.begin()); and a
// click on a marker flies there, out of turn (c.visit()).
//
// lib: MapLibre's address without .js / .css; rtl: the plugin for right-to-left place names; words: { offline }.
export function geoMapRuntime(lib, rtl, words) {
  words = words || {};
  var gl = null, mounted = [], left = null;           // (left: where the last map shown was left — c.state())
  // ── What this page has seen of its graphics, shared with the 3D models (io/runtime/model3d.js reads it): a context the
  // browser refused or took away. After the first, the light mode for the rest of the page; after the third, no live
  // maps at all — pictures (Francisco, 2026-10-30: «Web page caused context loss and was blocked»: Chrome shuts a page's
  // WebGL when it loses contexts over and over, so nothing is built again and again here: budget below, and rebuild()).
  var GS = window.__rvGS = window.__rvGS || { fails: 0, rebuilds: 0, lite: false, dead: false };
  var glFail = function () { GS.fails++; GS.lite = true; if (GS.fails > 2) GS.dead = true; };
  if (!GS.guard) {
    GS.guard = 1;
    // (MapLibre throws its «could not create a context» from inside a promise: not an uncaught error, the maps' picture.)
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason, m = String((r && r.message) || r || '');
      if (!/webglcontextcreationerror|Failed to initialize WebGL|Could not create a WebGL context/.test(m)) return;
      e.preventDefault(); glFail();
      (window.__rvMapCrash || []).forEach(function (f) { f(); });
    });
  }
  var CSS = '.rvm-live{position:absolute;inset:0;opacity:0;transition:opacity .5s}.rvm-on>.rvm-live{opacity:1}.rvm-on>.rv-map-shot{visibility:hidden!important}'
    // (The credits: a short line always in sight, the whole of them behind MapLibre's ⓘ — never a wide bar over the map.)
    // (A box whose edges fade (--rvm-mask: features/content/geomap.js mapEdgeCSS): the map and its markers fade, not
    // its credits nor the stop's note — moved in, off the faded corner.)
    // (MapLibre leaves that layer without a size — its canvas and markers are placed in it —: given the map's, or the
    // mask, sized by it, would hide everything.)
    + '.rvm-fade .maplibregl-canvas-container{position:absolute;inset:0}'
    + '.rvm-live .maplibregl-canvas-container{-webkit-mask-image:var(--rvm-mask);mask-image:var(--rvm-mask);-webkit-mask-composite:source-in;mask-composite:intersect}'
    + '.rvm-fade>.rvm-note{left:16%;top:16%}'
    + '.rvm-glide{-webkit-mask-image:var(--rvm-mask);mask-image:var(--rvm-mask);-webkit-mask-composite:source-in;mask-composite:intersect}.rvm-glide .maplibregl-canvas-container{-webkit-mask-image:none;mask-image:none}'
    + '.rvm-live .maplibregl-ctrl-attrib{font:11px/1.3 system-ui,sans-serif;text-align:end;max-width:calc(100% - 20px)}'
    + '.rvm-credit{position:absolute;right:calc(34px - var(--rvm-r,0px));bottom:calc(6px - var(--rvm-b,0px));max-width:calc(100% - 48px);padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.7);color:#333;'
    + 'font:10px/1.4 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:1}'
    + '.rvm-live:has(.maplibregl-compact-show) ~ .rvm-credit{visibility:hidden}'
    + '.rvm-mk{position:absolute;width:0;height:0;pointer-events:none}.rvm-mk.rvm-cur{z-index:2}'
    + '.rvm-ic{position:absolute;display:block;transition:opacity .4s}.rvm-ic>svg,.rvm-ic>img{display:block;width:100%;height:100%}'
    + '.rvm-ic>img{box-sizing:border-box;border:2px solid #fff;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.45);object-fit:cover}'
    + '.rvm-mk>span{position:absolute;transform:translateY(-50%);font:600 15px/1.2 system-ui,sans-serif;color:#1d1f24;background:rgba(255,255,255,.92);padding:3px 8px;border-radius:12px;'
    + 'box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis;transition:opacity .4s}'
    + '.rvm-go>.rvm-ic,.rvm-go>span{pointer-events:auto;cursor:pointer}'
    + '.rvm-mk.rvm-hide{visibility:hidden}.rvm-mk.rvm-hide>*{opacity:0}.rvm-mk.rvm-past>*{opacity:.45}'
    + '.rvm-in-drop{animation:rvmDrop .8s cubic-bezier(.3,.7,.4,1) both}.rvm-in-grow{animation:rvmGrow .5s cubic-bezier(.3,1.5,.6,1) both}'
    + '@keyframes rvmDrop{0%{transform:translateY(-60px);opacity:0}45%{transform:none;opacity:1}62%{transform:translateY(-12px)}80%{transform:none}90%{transform:translateY(-3px)}100%{transform:none}}'
    + '@keyframes rvmGrow{from{transform:scale(0);opacity:0}to{transform:none;opacity:1}}'
    // (Ripples from the place itself — a pin's tip, a dot's middle —, in the marker's colour, behind it.)
    + '.rvm-pulse::before{content:"";position:absolute;left:-18px;top:-18px;width:36px;height:36px;border-radius:50%;box-sizing:border-box;border:3px solid var(--rvm-c,#e63946);'
    + 'animation:rvmPulse 2s ease-out infinite;pointer-events:none}@keyframes rvmPulse{from{transform:scale(.25);opacity:.95}to{transform:scale(2.6);opacity:0}}'
    + '.rvm-note{position:absolute;left:14px;top:14px;max-width:min(46%,420px);padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.94);color:#1d1f24;'
    + 'text-align:start;font:400 16px/1.35 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.3);opacity:0;transform:translateY(-8px);transition:opacity .4s,transform .4s;pointer-events:none;z-index:2}'
    + '.rvm-note.rvm-show{opacity:1;transform:none}.rvm-note b{display:block;font-size:18px;margin-bottom:2px}'
    + '.rvm-off{position:absolute;right:calc(8px - var(--rvm-r,0px));top:calc(8px - var(--rvm-t,0px));padding:3px 9px;border-radius:10px;background:rgba(20,24,30,.72);color:#fff;font:12px/1.3 system-ui,sans-serif;z-index:3;pointer-events:none}'
    + '.rvm-wait{position:absolute;left:calc(10px - var(--rvm-l,0px));bottom:calc(10px - var(--rvm-b,0px));width:18px;height:18px;border-radius:50%;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;'
    + 'box-shadow:0 0 4px rgba(0,0,0,.4);animation:rvmSpin .9s linear infinite;z-index:3;pointer-events:none}@keyframes rvmSpin{to{transform:rotate(360deg)}}'
    + '@media (prefers-reduced-motion:reduce){.rvm-ic,.rvm-note,.rvm-live{transition:none}.rvm-in-drop,.rvm-in-grow{animation:none}.rvm-pulse::before{display:none}}';
  function styles() {
    if (document.getElementById('rvm-css')) return;
    var st = document.createElement('style'); st.id = 'rvm-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function load(cfg) {
    // (The library from jsDelivr, and if that doesn't answer — a network that blocks it, a bad moment — from unpkg's copy.)
    var bases = [lib, lib.replace('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/')].filter(function (b, i, a) { return a.indexOf(b) === i; });
    function attempt(i) {
      return new Promise(function (ok, ko) {
        if (![].some.call(document.querySelectorAll('link[rel=stylesheet]'), function (l) { return l.href === bases[i] + '.css'; })) {
          var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = bases[i] + '.css'; document.head.appendChild(l);
        }
        var s = document.createElement('script'); s.src = bases[i] + '.js';
        s.onload = function () { window.maplibregl ? ok(window.maplibregl) : ko(new Error('maplibre')); };
        s.onerror = function () { s.remove(); if (i + 1 < bases.length) ok(attempt(i + 1)); else { gl = null; ko(new Error('maplibre')); } };
        document.head.appendChild(s);
      });
    }
    if (!gl) gl = window.maplibregl ? Promise.resolve(window.maplibregl) : attempt(0);
    return gl.then(function (ml) {
      // (MapLibre reads the tiles of streets and names in one worker, outside Safari: plenty for a map that stays put,
      // a queue in a flight, where each zoom level brings new ones — even with them all in the browser's cache, a
      // street map flying Madrid → Rome → Tokyo → New York still lacked 29 % of its tiles at each frame; with two
      // workers 8 %, with four 6 % (2026-10-11). One per core — the browser counts each core twice where it runs two
      // threads —, leaving one free for the page, up to four; two at most on a small device. Before its first map.)
      if (!ml.__rvWorkers && ml.setWorkerCount && ml.getWorkerCount && ml.getWorkerCount() < 2) {
        var cores = Math.floor((navigator.hardwareConcurrency || 4) / 2);
        ml.__rvWorkers = 1; try { ml.setWorkerCount(Math.max(1, Math.min(small || weak() ? 2 : 4, cores - 1 || 1))); } catch (e) {}
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
  // ── What this computer is, found out once: whether it can draw WebGL at all, and whether that is done by the processor
  // (SwiftShader, llvmpipe: no graphics card — or a driver Chrome has blocked), has four cores or fewer, or little memory.
  // Such a computer gets the light mode below, as a phone does (Francisco, 2026-10-30: «en ordenadores menos potentes los
  // mapas tardan en cargar o no cargan»). Settable: ?perf=lite|full in the address, or localStorage 'revela.perf'.
  var gpuProbe = null;
  function gpu() {
    if (window.__rvGL === false || GS.dead) return { webgl: false, soft: false, renderer: '' };         // (the tests' way of having none)
    if (gpuProbe) return gpuProbe;
    gpuProbe = { webgl: false, soft: false, renderer: '' };
    try {
      var cv = document.createElement('canvas'), g = cv.getContext('webgl2') || cv.getContext('webgl') || cv.getContext('experimental-webgl');
      if (g) {
        gpuProbe.webgl = true;
        var x = g.getExtension('WEBGL_debug_renderer_info'); gpuProbe.renderer = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL) || '') : '';
        gpuProbe.soft = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(gpuProbe.renderer);
        var lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();      // (the probe's context isn't kept)
      }
    } catch (e) {}
    return gpuProbe;
  }
  var perfSet = function () { try { var q = /[?&]perf=(lite|full)\b/.exec(location.search); return q ? q[1] : (localStorage.getItem('revela.perf') || ''); } catch (e) { return ''; } };
  var weak = function () {
    var p = perfSet(); if (p === 'lite' || p === 'full') return p === 'lite';
    return !!(GS.lite || gpu().soft || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4));
  };
  var later = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
  // (In the speaker view's previews — reveal.js loads the presentation there with ?receiver — nothing is fetched
  // ahead: the presentation itself does it, into the same browser.)
  var receiver = /[?&]receiver\b/.test(location.search);
  // ── Light, on a phone (or the scroll view — a phone held upright —, or a computer with little memory): each live map
  // is a WebGL canvas with its own tiles in the graphics card's memory, and scrolling down a deck with several maps a
  // slide had eight alive at once — Safari on an iPhone closed the page («ha generado problemas repetidamente»,
  // Francisco, 2026-10-17). In the scroll view only the maps of the slide in view are alive, let go of at once;
  // presenting slide by slide, those of the next one too, unless there are many (ahead2()) — without them the
  // transition showed nothing where the map would be, and Morph had no Earth to carry (Francisco, the same day); and no relief (the heaviest: its heights and a picture of each tile drawn on them). The
  // floor under the world (coarser: zoom 1) and the next flight's tiles (half of them: small) stay — without them the
  // flights showed holes filling in on the way (Francisco, the same day): they weigh little.
  var frail = function () {
    var sv = window.Reveal && Reveal.isScrollView && Reveal.isScrollView();
    var phone = window.matchMedia && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
    return !!(sv || phone || (navigator.deviceMemory && navigator.deviceMemory <= 2));
  };
  var lite = function () { return !!(frail() || weak()); };
  // (The relief is the one effect that is dropped only where it can't be drawn: a phone, the scroll view, a graphics
  // chip that is the processor itself, or a context lost. A laptop with four cores and a real graphics chip is «weak»
  // for the tiles — fewer workers, less fetched ahead — but keeps its relief: with the light mode it would have lost
  // the 3D of every map in its slides and in the exported page, which is what that page was made to show.)
  var reliefOff = function () {
    var p = perfSet(); if (p === 'lite') return true;
    return !!(frail() || (p !== 'full' && (GS.lite || gpu().soft)));
  };
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
        // (Only while it flies — and until it has been fetched once —: kept, the whole world is drawn under the view at
        // every frame, and on relief that made a map turning at a stop go at half speed, measured. In between it waits in
        // the memory — room kept for it below —, back in an instant for the next flight: fly(), floorOn().)
        if (this.map && this.map._rvFloorOff) { tm._rvPinned = null; return orig.call(this, ideal, zoom); }
        if (this.map && this.map._rvCoarse != null && this.transform && this.transform.zoom < this.map._rvCoarse) ideal = coarser(ideal);
        if (ideal.length && ideal[0] && ideal[0].constructor && ideal[0].scaledTo) {
          if (!pinned) {
            var Id = ideal[0].constructor, top = Math.max(src.minzoom || 0, Math.min(src.maxzoom == null ? 22 : src.maxzoom, (src.tileSize || 512) >= 512 || lite() ? 1 : 2));
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
        var cache = this._outOfViewCache, set = cache.setMaxSize, own = cache.hasOwnProperty('setMaxSize'), room = (this._rvRoom || 0) + (pinned ? pinned.length : 0);
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
      // (Its floor just turned on — floorOn() —, not yet back in the view: not yet.)
      if (!tm._rvPinned) return !tm._rvFloor || !!m._rvFloorOff || !(tm.used || tm.usedForTerrain);
      return !(tm.used || tm.usedForTerrain) || tm._rvPinned.every(function (p) { var t = tm._inViewTiles.getTileById(p.key); return t && (t.hasData() || t.state === 'errored'); });
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
  function camera(m) { var p = m.getCenter(); return { center: [p.lng, p.lat], zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() }; }
  // Every tile of the flight from the map's view to `to` (camera), each source's in the order the flight needs them.
  // n points along it; worked out a few at a time (a task each), so the page never stalls; → a promise.
  function flightTiles(m, to, curve, n, alive) {
    var tms = m.style.tileManagers, ids = Object.keys(tms).filter(function (id) { return tms[id]._rvFloor; }), out = {}, seen = {};
    ids.forEach(function (id) { out[id] = []; seen[id] = {}; });
    var from = camera(m), i = 0;
    var lod = Math.min(from.zoom, to.zoom) - 1;
    return new Promise(function (ok) {
      (function chunk() {
        if (!alive() || m.isMoving()) return ok(null);
        // (A few milliseconds at a time, between frames: the map may be turning meanwhile, smoothly.)
        var t0 = performance.now(), here = camera(m);
        m._ease = function (frame, finish, o) { frame(o.easing(1)); finish(); };     // (the flight, put at its point at once)
        // (Back, after each few, to where the map is then: it may be turning meanwhile — motion() —, and the flight
        // worked out from where it was is near enough.)
        // (Nor a word of it to anyone: the markers would follow each point — and on relief each asks the graphics
        // card whether it is hidden behind a mountain, waiting for its answer: seconds, measured.)
        m.fire = function () { return m; };
        try {
          for (; i < n && (i === 0 || performance.now() - t0 < 5); i++) {
            var f = (i + 1) / n;
            m.jumpTo(from);
            if (f < 1) m.flyTo(Object.assign({}, to, { duration: 1, curve: curve, essential: true, easing: function () { return f; } })); else m.jumpTo(to);
            ids.forEach(function (id) {
              wanted(m, tms[id], id, m.terrain, lod).forEach(function (t) { if (!seen[id][t.key]) { seen[id][t.key] = 1; out[id].push(t); } });
            });
          }
        } finally { delete m._ease; delete m.fire; m.jumpTo(here); }
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

  // ── Browsers allow only so many live maps (each is a WebGL context), and take the oldest away without telling when
  // there are more: four at once, two on a computer in light mode. Room for one more is made by letting go of the
  // farthest from the slide in view (never a map of that slide, the dialog's, or one taking a picture).
  var MAXLIVE = function () { return weak() ? 2 : 4; };
  function room(me) {
    var live = mounted.filter(function (x) { return x !== me && x.map && !x.dead; });
    if (live.length < MAXLIVE()) return true;
    var all = window.Reveal && Reveal.getSlides ? Reveal.getSlides() : [], cur = window.Reveal && Reveal.getCurrentSlide ? Reveal.getCurrentSlide() : null, ci = all.indexOf(cur);
    var dist = function (x) { var s = x.el.closest && x.el.closest('section'), i = s ? all.indexOf(s) : -1; return i < 0 || ci < 0 ? 0 : Math.abs(i - ci); };
    var d0 = dist(me);
    var spare = live.filter(function (x) { return !x.keep && dist(x) > d0; }).sort(function (a, b) { return dist(b) - dist(a); });
    while (live.length >= MAXLIVE() && spare.length) { var old = spare.shift(); live = live.filter(function (x) { return x !== old; }); old.destroy(); }
    return live.length < MAXLIVE() || d0 === 0;       // (one for a slide further on than all those alive waits for its turn)
  }
  // (A context given back at once, not when the garbage is collected: a map let go of keeps its slot until then.)
  function release(cv) {
    try { var g = cv && (cv.getContext('webgl2') || cv.getContext('webgl')), l = g && g.getExtension('WEBGL_lose_context'); if (l && !g.isContextLost()) l.loseContext(); } catch (e) {}
  }

  // One map in its box: { el, cfg, cur, map, ready, go(k, animate, dur), view(), update(cfg), capture(k), destroy() }.
  // opts: interactive (drag, zoom, turn), keyboard, capture (keeps its picture to be read), onMove(view).
  function mount(el, cfg, opts) {
    opts = opts || {}; styles();
    var c = { el: el, cfg: cfg, cur: 0, map: null, failed: false, dead: false, markers: [], token: 0, warms: opts.warm !== false && !opts.capture,
      keep: !!(opts.capture || (el.closest && el.closest('.rv-dlg-map')) || !(el.closest && el.closest('section'))) };
    var box = document.createElement('div'); box.className = 'rvm-live'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';      // (MapLibre's own CSS makes its box position:relative)
    // (Behind the map, what shows while its tiles come: none for a globe without its space — cfg.clear: the slide.)
    var bg = function () { return cfg.clear ? 'transparent' : cfg.look === 'map' ? '#e8e8e0' : '#05070d'; };
    // (With its edges fading, what is behind fades too: on the map's own canvas, not on the box.)
    var paintBg = function () { box.style.background = cfg.fade ? 'transparent' : bg(); if (c.map) c.map.getCanvas().style.background = cfg.fade ? bg() : ''; el.classList.toggle('rvm-fade', !!cfg.fade); };
    var note = document.createElement('div'); note.className = 'rvm-note'; note.setAttribute('aria-live', 'polite');
    var credit = document.createElement('div'); credit.className = 'rvm-credit'; credit.textContent = cfg.short || ''; credit.hidden = true;
    el.appendChild(box); el.appendChild(note); el.appendChild(credit); paintBg();
    // Zoom is kept for the block's own size (cfg.w × cfg.h): a smaller or bigger box shows the same area — all of it,
    // and more around it if the box took another proportion (a slide adapted to the screen: screenfit.js).
    var zk = function () { return Math.log2(Math.max(1e-3, Math.min((el.clientWidth || cfg.w) / cfg.w, (el.clientHeight || cfg.h) / cfg.h))); };
    // (gov: how much of that it draws — less if the computer can't keep up: govern().)
    var gov = { k: 1, d: [], last: 0 };
    var pr = function () {
      if (opts.pixelRatio) return opts.pixelRatio;
      return Math.max(least(), full() * gov.k);
    };
    // (Never fewer than three quarters of the screen's own (CSS) pixels — nor than one per slide pixel.)
    var least = function () { return Math.min(full(), Math.max(1, 0.75 * full() / (window.devicePixelRatio || 1))); };
    var full = function () {
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
      if (c.staged) return;
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
    if (window.ResizeObserver && !opts.capture) { c.ro = new ResizeObserver(function () { if (!c.dead) { if (c.staged) c.center(); else c.resize(); } }); c.ro.observe(el); }
    // (kind 'gl': this computer can't draw the live map — the satellite picture stands in; 'load': it is still loading.)
    function offline(on, kind) {
      if (kind !== 'load') { c.failed = on; el.classList.toggle('rvm-offline', on); }
      var n = el.querySelector(':scope > .rvm-off');
      var text = kind === 'load' ? words.loading : kind === 'gl' ? (words.nogl || words.offline) : words.offline;
      if (on && text && !opts.quiet) { if (!n) { n = document.createElement('div'); n.className = 'rvm-off'; el.appendChild(n); } n.textContent = text; n.classList.toggle('rvm-loading', kind === 'load'); }
      if (!on && n) n.remove();
      if (on && kind !== 'load') staticMap();
    }
    // Without WebGL (or a map that would not start): the world's picture where the stop is, from the same satellite tiles
    // as the live look, laid out by hand — a handful of pictures, no graphics card needed.
    function staticMap() {
      if (c.dead || el.querySelector(':scope > .rvm-static') || el.querySelector(':scope > .rv-map-shot')) return;
      var s = place(c.cur) || s0, W = el.clientWidth || cfg.w, H = el.clientHeight || cfg.h, z = (s.z || 2) + zk();
      var zt = Math.max(1, Math.min(12, Math.round(z) + 1)), ts = 256 * Math.pow(2, z + 1 - zt), n = Math.pow(2, zt), lat = Math.max(-85, Math.min(85, s.c[1]));
      var fx = (s.c[0] + 180) / 360 * n, fy = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
      var cols = Math.ceil(W / ts) + 2, rows = Math.ceil(H / ts) + 2; if (cols * rows > 64 || !(ts > 4)) return;
      var d = document.createElement('div'); d.className = 'rvm-static'; d.setAttribute('aria-hidden', 'true');
      d.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;background:#05070d';
      for (var dx = -Math.ceil(cols / 2); dx <= Math.ceil(cols / 2); dx++) for (var dy = -Math.ceil(rows / 2); dy <= Math.ceil(rows / 2); dy++) {
        var tx = Math.floor(fx) + dx, ty = Math.floor(fy) + dy; if (ty < 0 || ty >= n) continue;
        var im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.draggable = false;
        im.src = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/' + zt + '/' + ty + '/' + (((tx % n) + n) % n) + '.jpg';
        im.style.cssText = 'position:absolute;max-width:none;left:' + (W / 2 + (tx - fx) * ts).toFixed(1) + 'px;top:' + (H / 2 + (ty - fy) * ts).toFixed(1) + 'px;width:' + (ts + 1).toFixed(1) + 'px;height:' + (ts + 1).toFixed(1) + 'px';
        im.onerror = function () { this.remove(); };
        d.appendChild(im);
      }
      el.insertBefore(d, box); credit.textContent = (cfg.short ? cfg.short + ' · ' : '') + 'Sentinel-2 cloudless © EOX'; credit.hidden = false;
    }
    // The map a moment of waiting is told about (not shown at once: on a fast computer it is there before it would show).
    function loading(on) {
      var n = el.querySelector(':scope > .rvm-off.rvm-loading');
      if (on && !c.failed && !n && !el.classList.contains('rvm-on')) offline(true, 'load');
      if (!on && n) n.remove();
    }
    // Start again from nothing — a style that never came, a graphics context lost for good —, twice at most; then the picture.
    function rebuild(why) {
      var tries = el._rvmTries || 0, cur = c.cur; if (c.dead) return false;
      if (tries >= 2 || GS.rebuilds >= 4 || !gpu().webgl) { offline(true, gpu().webgl ? '' : 'gl'); return false; }      // (never a loop: four starts again in all, for the page)
      el._rvmTries = tries + 1; GS.rebuilds++; c.destroy();
      var n = ensure(el); if (n) n.ready.then(function () { if (!n.dead) n.go(cur, false); });
      return true;
    }
    // A context that could not be made: no map, its picture; and once more a few seconds later — if the page hasn't given up.
    function retry() {
      if (c.dead || GS.dead || el._rvmRetried) return;
      el._rvmRetried = true; setTimeout(function () { if (!c.dead && el.isConnected && !el.classList.contains('rvm-on')) rebuild('create'); }, 4000);
    }
    function crash() {
      if (c.dead || el.classList.contains('rvm-on')) return;
      var m = c.map; c.map = null; if (m) try { var cv = m.getCanvas(); m.remove(); release(cv); } catch (e) {}
      glFail(); offline(true, 'gl'); retry();
    }
    c.crash = crash; (window.__rvMapCrash = window.__rvMapCrash || []).push(crash);
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
        e.classList.toggle('rvm-pulse', on && !opts.capture && (cfg.pulse === 'all' || (cfg.pulse === 'cur' && i === k && !part)));
      });
    }
    // (any: a stop flown to by a click on its marker — with all the stops at once, no other shows its note.)
    function showNote(k, on, any) {
      var s = cfg.stops[k]; if (cfg.home && !any) on = false;
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
        e.innerHTML = html; e.style.setProperty('--rvm-c', s.col || '#e63946');
        if (opts.interactive !== false && !opts.capture) {
          e.classList.add('rvm-go'); e.title = s.n || '';
          e.addEventListener('click', function (ev) { ev.stopPropagation(); c.visit(i); });
        }
        var mk = new ml.Marker({ element: e, anchor: 'center' }).setLngLat(s.c).addTo(c.map);
        // (On relief MapLibre asks, at every frame, whether each marker is behind a mountain — reading back from the
        // graphics card, which then has to stop and wait: the turning map went at half speed, measured. Asked only
        // with the map still — its own turning is a jump a frame, each one «the end of a move».)
        var occ = mk._updateOpacity;
        if (typeof occ === 'function') mk._updateOpacity = function () {
          var m = c.map; if (!m || !m.terrain || !(mo.on || m.isMoving())) return occ.apply(mk, arguments);
          // (Meanwhile only what costs nothing: whether it is on the far side of the globe.)
          var tr = m.transform, hid = !!(tr && tr.isLocationOccluded && tr.isLocationOccluded(mk.getLngLat())), o = String(hid ? mk._opacityWhenCovered : mk._opacity);
          if (e.style.opacity !== o) { e.style.opacity = o; e.classList.toggle('maplibregl-marker-covered', hid); }
        };
        c.markers.push(mk);
      });
    }
    // The style's own layers, once it is there (again after a change of style): globe or flat, the atmosphere, the
    // relief, the place names in the deck's language, and the line between the stops.
    function dress() {
      var m = c.map, cf = c.cfg;
      try { m.setProjection({ type: cf.proj }); } catch (e) {}
      if (cf.proj === 'globe') try { m.setSky({ 'sky-color': '#0b1d33', 'horizon-color': '#9cc3ff', 'fog-color': '#ffffff', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.9,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] }); } catch (e) {}
      if (cf.dem && !reliefOff()) try { if (!m.getSource('rv-dem')) m.addSource('rv-dem', cf.dem); m.setTerrain({ source: 'rv-dem', exaggeration: 1.3 }); } catch (e) {}
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
    // Where stop k is seen from: its own view — or, the first, with all the stops at once (cfg.home), the map's.
    var place = function (k) { return cfg.home && k === 0 ? cfg.home : cfg.stops[k]; };
    var s0 = place(0) || { c: [0, 25], z: 1.2, p: 0, b: 0 };
    // (The Earth seen from space, over the first stop: where a slide that starts from space starts.)
    var space = function () { var a = place(0) || s0; return { center: [a.c[0], a.c[1] * 0.4], zoom: (cfg.proj === 'globe' ? 1.4 : 1) + zk(), pitch: 0, bearing: 0 }; };
    // (A map started before its slide is shown — the next one's —, that starts from space: already there.)
    c.first = !!(opts.start && cfg.start === 'space' && !reduced());
    c.ready = load(cfg).then(function (ml) {
      if (c.dead) return c;
      var v0 = c.first ? space() : { center: s0.c, zoom: s0.z + zk(), pitch: s0.p, bearing: s0.b };
      // (No WebGL — or MapLibre can't start it —: not a blank box, a picture and a word about it.)
      if (!opts.capture && !gpu().webgl) { offline(true, 'gl'); return c; }
      var m;
      if (!opts.capture && !room(c)) { c.destroy(); return c; }
      try {
        m = c.map = new ml.Map({ container: box, style: cfg.style, center: v0.center, zoom: v0.zoom, pitch: v0.pitch, bearing: v0.bearing, maxPitch: 85,
          interactive: opts.interactive !== false, attributionControl: { compact: true }, pixelRatio: pr(), fadeDuration: opts.capture ? 0 : 300,
          canvasContextAttributes: { antialias: true, preserveDrawingBuffer: !!opts.capture } });
      } catch (e) { c.map = null; glFail(); offline(true, 'gl'); retry(); return c; }
      // (The context refused after all — the constructor doesn't always say so —: the picture, and once more later.)
      box.addEventListener('webglcontextcreationerror', function () { if (!c.dead) crash(); }, true);
      if (!opts.keyboard && m.keyboard) m.keyboard.disable();            // (the arrows are the presentation's)
      paintBg();
      m.on('style.load', dress);
      if (!opts.capture) m.on('render', govern);
      if (opts.onMove) m.on('moveend', function () { opts.onMove(c.view()); });
      m.on('moveend', function (e) { if (e && e.originalEvent && c.settled) ahead(300); });   // (moved by hand: from there)
      m.on('moveend', function () { if (c.follower && !mo.on && Date.now() - (c.told || 0) > 1000) { c.told = Date.now(); c.follower(); } });
      // (A hand on the map: it stops moving on its own — motion() —, and goes on a moment after it lets go.)
      var hold = function () { mo.rest = performance.now() + 2500; };
      box.addEventListener('pointerdown', hold); box.addEventListener('wheel', hold, { passive: true });
      markers(ml);
      // (A graphics context the browser took away — too many, or a driver reset — and gave no way back: the map starts again.)
      if (!opts.capture) {
        var cv = m.getCanvas(), lost = 0;
        cv.addEventListener('webglcontextlost', function () { lost = setTimeout(function () { lost = 0; if (!c.dead) rebuild('lost'); }, 2500); });
        cv.addEventListener('webglcontextrestored', function () { clearTimeout(lost); lost = 0; });
      }
      return new Promise(function (ok) {
        var done = false, again = 0, wait = setTimeout(function () { if (!done) loading(true); }, 2500),
          // (After 20 s: a style that never came starts over — but a style that is in and tiles that are only slow keep their wait.)
          t = setTimeout(function check() {
            if (done || c.dead) return;
            if (navigator.onLine === false) { offline(true); return; }
            if (m.isStyleLoaded && m.isStyleLoaded()) { t = setTimeout(check, 20000); return; }
            if (!rebuild('slow')) offline(true);
          }, navigator.onLine === false ? 0 : 20000);
        m.on('load', function () {
          done = true; clearTimeout(t); clearTimeout(wait); el._rvmTries = 0; loading(false); offline(false); var st = el.querySelector(':scope > .rvm-static'); if (st) st.remove();
          el.classList.add('rvm-on'); if (!c.first) c.go(c.cur, false);
          // (MapLibre opens its compact credits at first: closed to their ⓘ, the short line says who to thank.)
          var at = box.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show');
          credit.hidden = !cfg.short; ok(c);
          // (Its first view loaded, the flight ahead: fetchAhead().)
          m.once('idle', function () { c.settled = true; floorOn(false); ahead(0); });
        });
        // (The style — the map's own description — that didn't come: MapLibre never asks again by itself.)
        m.on('error', function (e) {
          if (done) return;
          if (navigator.onLine === false) { offline(true); return; }
          if (e && e.tile) return;
          var lag = [2500, 7000, 16000][again++]; if (lag) setTimeout(function () { if (!done && !c.dead) try { m.setStyle(cfg.style); } catch (x) {} }, lag);
        });
      });
    }, function () { offline(true); return c; });
    shot(0);
    // ── The next flight, its tiles fetched into this map's memory as soon as it is at a stop (fetchAhead(), above):
    // in the flight MapLibre finds them there. A click before they are all in waits for them — a small sign says so —
    // at most WAIT ms; then it flies anyway, over the floor (floor()) where a tile is still missing.
    var job = null, WAIT = 4000;
    var camNow = function () { return camera(c.map); };
    // (The world's floor under the view: floor() — on for a flight, off at a stop.)
    var floorOn = function (on) { var m = c.map; if (!m || !!m._rvFloorOff === !on) return; m._rvFloorOff = !on; m.triggerRepaint(); };
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
          if (small || weak()) list = list.slice(0, Math.ceil(list.length / 2));      // (in the order the flight needs them)
          tm._rvRoom = Math.ceil(list.length * 1.5);
          if (tm.transform) tm.updateCacheSize(tm.transform);
          fetchInto(tm, list, j);
        });
        if (j.left) return new Promise(function (ok) { j.ok = ok; });
      });
      return j;
    }
    // After arriving, the next flight — or the first stop's, for a slide that starts from elsewhere —; and the map's
    // own motion, if it has one. (ms: after a moment — moved by hand, once it is left still.)
    function ahead(ms) {
      clearTimeout(c.at);
      c.at = setTimeout(function () {
        var m = c.map, s = c.first ? place(0) : cfg.home ? null : cfg.stops[c.cur + 1];
        if (c.dead || !m) return;
        if (m.isMoving()) return ahead(300);
        if (!c.first && !mo.on) motion(true);                                // (arrived: it may keep moving)
        if (s && fetches()) fetchAhead(camOf(s));
      }, ms || 0);
    }
    // Go to stop k: flying (dur ms; the line to it drawn on the way, if it is the next one), or at once.
    // → a promise, once there.
    // (wait: how long it may wait for the flight's tiles — WAIT; less at a slide's start, which shouldn't seem to stall.)
    c.go = function (k, animate, dur, wait) {
      k = Math.max(0, Math.min(cfg.stops.length - 1, k | 0));
      var prev = c.cur, me = ++c.token, was = mo.on; c.cur = k; c.first = false; motion(false); mo.z = 0; shot(k);
      var m = c.map, s = cfg.stops[k]; if (!m || !s || !el.classList.contains('rvm-on')) { showNote(k, true); return Promise.resolve(); }
      var to = camOf(place(k)); c.seen = -1;
      dur = dur || 3000;
      c.arriving = false; sign(false);
      if (!animate || reduced()) {
        m.stop(); m.jumpTo(to); paint(k); showNote(k, true);
        if (c.settled) { free(); job = null; ahead(0); }
        return Promise.resolve();
      }
      c.arriving = true; c.going = me; floorOn(true);                   // (going: on its way — until it gets there)
      showNote(k, false); paint(k === prev + 1 ? prev : k);
      var fly = function () {
        if (me !== c.token) { if (c.going === me) { c.going = 0; floorOn(false); } return; }
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
            if (me !== c.token) { m._rvCoarse = null; if (c.going === me) { c.going = 0; floorOn(false); } return ok(); }
            var f = Math.min(1, (performance.now() - t0) / dur);
            if (k === prev + 1) paint(k, ease(f) || 0.001);
            if (f < 1) requestAnimationFrame(step);
            else { m._rvCoarse = null; if (c.going === me) { c.going = 0; floorOn(false); } m.triggerRepaint(); paint(k); showNote(k, true); ok(); free(); job = null; ahead(0); }
          })();
        });
      };
      // (A click while it flies: on from where it is, at once — over the floor where it must. And while it turned
      // on its own: the flight worked out from where it stopped is another one, and most of its tiles are in.)
      // (Its floor back first — a frame or a few, still —: coming back in the middle of the flight, it cost a jolt.)
      if (m.isMoving()) return fly();
      if (!fetches() || was) { var tf = Date.now(); return (function back() { return floorIn(m) || Date.now() - tf > 300 ? fly() : later(16).then(back); })(); }
      var t = setTimeout(function () { if (me === c.token) sign(true); }, 300), t0 = Date.now();
      // (And the floor: on a slow computer the map may still be fetching it when the presenter clicks.)
      var floorReady = function () { return floorIn(m) || Date.now() - t0 > WAIT ? Promise.resolve() : later(100).then(floorReady); };
      return Promise.race([fetchAhead(to).ready.then(floorReady), later(wait || WAIT)]).then(function () { clearTimeout(t); return fly(); });
    };
    // ── At a stop the map keeps moving (cfg.motion), from its arrival to the next click: the globe turning west to east,
    // as the Earth does (a flat map, sliding sideways), the camera going round the place, tilting to see it, or nearing
    // it slowly, turning a little, until it is one and a half levels closer. A frame at a time, on from wherever the
    // map is — so what a hand does to it is kept, and the motion goes on from there. Not while the map is moved by
    // hand or flies, nor on a slide out of sight, nor in the pictures; never with «reduce motion».
    var mo = { on: false, raf: 0, last: 0, rest: 0, z: 0 };
    var moves = function () { return !!(cfg.motion && (opts.motion || c.live) && !opts.capture && !reduced()); };
    function motion(on) {
      cancelAnimationFrame(mo.raf); mo.on = false; mo.last = 0;
      if (on && moves() && c.map && !c.dead) { mo.on = true; mo.raf = requestAnimationFrame(tick); }
    }
    function tick(now) {
      if (!mo.on || c.dead) return;
      mo.raf = requestAnimationFrame(tick);
      var m = c.map, dt = mo.last ? Math.min(0.1, (now - mo.last) / 1000) : 0; mo.last = now;
      if (!dt || now < mo.rest || m.isMoving() || document.hidden || (window.Reveal && el.closest('section') && !el.closest('section.present'))) return;
      var v = camNow(), k = cfg.speed || 1, s = cfg.stops[c.cur] || {};
      if (cfg.motion === 'spin') {
        // (6° a second with the whole globe in sight — a turn a minute —, as fast for the eye closer in.)
        var lon = v.center[0] - 6 * k * dt * Math.pow(2, -Math.max(0, v.zoom - zk() - 1.5));
        v.center = [(lon + 540) % 360 - 180, v.center[1]];
      } else if (cfg.motion === 'orbit') {
        v.bearing = (v.bearing + 6 * k * dt + 540) % 360 - 180;
        v.pitch += (Math.max(s.p || 0, 50) - v.pitch) * Math.min(1, dt * 0.8);
      } else if (cfg.motion === 'drift') {
        var dz = Math.min(0.08 * k * dt, 1.5 - mo.z); if (dz <= 0) return motion(false);
        mo.z += dz; v.zoom += dz; v.bearing += 1.5 * k * dt;
      } else return motion(false);
      m.jumpTo(v);
    }
    // ── Smoothness first: while it moves (on its own or flying), frames that take too long — a big screen at a high
    // pixel density, the relief seen tilted: four times the pixels, and many more tiles — make it draw fewer pixels,
    // a fifth less each time, down to least(). Measured over a second of moving
    // frames; it stays at what it came down to. (Satellite tiles are no sharper than that anyway: what it loses is little.)
    function govern() {
      var now = performance.now(), dt = now - gov.last; gov.last = now;
      if (dt > 150 || (!mo.on && !c.map.isMoving())) { gov.d.length = 0; return; }
      gov.d.push(dt); if (gov.d.length < 40) return;
      var s = gov.d.slice().sort(function (a, b) { return a - b; }), med = s[20]; gov.d.length = 0;
      if (med > 22 && full() * gov.k > least() * 1.01) { gov.k = Math.max(least() / full(), gov.k * 0.8); try { c.map.setPixelRatio(pr()); } catch (e) {} }
    }
    // The dialog's try-out: the motion on (or off) as in the presentation.
    c.moving = function (on) { c.live = !!on; motion(on && c.settled && !c.first); };
    // The slide's start (cfg.start; settle()): down to the first stop from the Earth seen from space, or from where
    // the previous slide's map was left (from: c.state() of that one). Left at this very stop, it goes on as it was —
    // as if it were the same map. → a promise, once at the first stop.
    // (k: the stop to go down to — the first, or, a slide come back to with Morph, the one its steps had reached.)
    var START_MS = 4500;
    c.begin = function (kind, from, k) {
      k = k || 0;
      var a = cfg.stops[k] && place(k);
      if (!a || reduced() || !(kind === 'space' || (kind === 'prev' && from))) { c.first = false; return c.go(k, false); }
      var me = ++c.token; c.first = true; c.cur = k; motion(false); shot(k);
      return c.ready.then(function () {
        var m = c.map; if (!m || c.failed || me !== c.token || !el.classList.contains('rvm-on')) return;
        // (Through Morph, the very same Earth: as big on the screen as it was — its box grows or shrinks round it, glide().)
        var cam = kind === 'space' ? space() : Object.assign({}, from.cam, { zoom: from.morph ? from.px : from.cam.zoom + zk() });
        // (Drawn there at once, before the screen shows it: with Morph, the box glides from the other one's — no
        // flash of this map's own first view.)
        m.stop(); m.jumpTo(cam); try { m.redraw(); } catch (e) {} c.arriving = false;
        if (kind === 'prev' && from.at && Math.abs(from.at.c[0] - a.c[0]) < 1e-4 && Math.abs(from.at.c[1] - a.c[1]) < 1e-4 && Math.abs(from.at.z - a.z) < 0.01) {
          c.first = false; paint(k); showNote(k, true); mo.z = from.z || 0; if (c.settled) { free(); job = null; ahead(0); }
          if (moves()) motion(true);
          return;
        }
        c.cur = k - 1; paint(k - 1); showNote(k, false); if (c.settled) ahead(0);
        return later(kind === 'space' ? 600 : 150).then(function () { if (me === c.token) return c.go(k, true, START_MS, 700); });
      });
    };
    // The map of the next slide, that will carry on from this one (Morph): kept looking where this one is, while it
    // waits out of sight — its tiles fetched by the time it is shown. (st: c.state() of this one.)
    c.shadow = function (st) {
      var m = c.map; if (!m || c.failed || c.dead || !st || (el.closest('section') && el.closest('section').classList.contains('present'))) return;
      m.stop(); m.jumpTo(Object.assign({}, st.cam, { zoom: st.px })); showNote(c.cur, false);
    };
    // Its canvas as big as the larger of two boxes (w × h: the other map's) — the box only shows its middle —: while it
    // waits for Morph its tiles are fetched for all of it, and while its box grows or shrinks (glide()) the canvas
    // isn't resized at every frame (each time cleared, drawn again a frame later: a blink, tiles missing).
    c.stage = function (w, h) {
      var W = Math.max(el.clientWidth, w || 0), H = Math.max(el.clientHeight, h || 0);
      c.staged = { w: W, h: H }; box.style.width = W + 'px'; box.style.height = H + 'px'; c.center();
      if (c.map) c.map.resize();
    };
    c.center = function () { if (!c.staged) return; box.style.left = ((el.clientWidth - c.staged.w) / 2).toFixed(2) + 'px'; box.style.top = ((el.clientHeight - c.staged.h) / 2).toFixed(2) + 'px'; };
    c.unstage = function () {
      if (!c.staged) return; c.staged = null; box.style.left = box.style.top = '0'; box.style.width = box.style.height = '100%'; c.resize();
      try { if (c.map) c.map.redraw(); } catch (e) {}
    };
    // Morph: the box goes from where the other map's was to its own place and size — itself, not stretched as reveal.js
    // would stretch it (a squashed globe) —, the map resized on the way (its centre and scale kept: the Earth stays as
    // it was, the box opening or closing round it); its space fading in or out if the other had none, or this one.
    // (from: the other one's element; ms: Morph's duration.)
    c.glide = function (from, ms) {
      var st = el.style, keep = { left: st.left, top: st.top, width: st.width, height: st.height, background: st.background, transition: st.transition };
      var a = ['left', 'top', 'width', 'height'].map(function (k) { return parseFloat(from.style[k]) || 0; }), b = ['left', 'top', 'width', 'height'].map(function (k) { return parseFloat(keep[k]) || 0; });
      var hex = function (h) { var n = parseInt(String(h).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
      var fromClear = /transparent/.test(from.style.background), clr = cfg.clear || cfg.fade ? null : hex(bg());
      if (reduced() || !ms || a.join() === b.join() && fromClear === !clr) return;
      var t0 = performance.now(), me = c.glides = (c.glides || 0) + 1;
      // (Its box has its steps' timing as CSS transitions — a flight's 6 s —: none while it moves.)
      st.background = 'transparent'; st.transition = 'none';
      if (!c.staged || c.staged.w < Math.max(a[2], b[2]) || c.staged.h < Math.max(a[3], b[3])) c.stage(Math.max(a[2], b[2]), Math.max(a[3], b[3]));
      if (cfg.fade) el.classList.add('rvm-glide');
      (function frame(now) {
        if (c.dead || me !== c.glides) return;
        var f = Math.min(1, (now - t0) / ms), e = ease(f);
        ['left', 'top', 'width', 'height'].forEach(function (k, i) { st[k] = (a[i] + (b[i] - a[i]) * e).toFixed(2) + 'px'; });
        if (clr && !cfg.fade) box.style.background = 'rgba(' + clr.join(',') + ',' + (fromClear ? e : 1).toFixed(3) + ')';
        c.center();
        if (f < 1) requestAnimationFrame(frame);
        else {
          st.left = keep.left; st.top = keep.top; st.width = keep.width; st.height = keep.height; st.background = keep.background;
          el.classList.remove('rvm-glide'); paintBg(); c.unstage(); setTimeout(function () { st.transition = keep.transition; }, 50);
        }
      })(t0);
    };
    // A click on a marker: there, out of turn — the trip's steps carry on from where they were (the next click goes
    // to the stop after the last one reached, from here); its note, once there; then the map's motion, if any. With
    // all the stops at once, a click on the one flown to goes back to the map's view.
    c.seen = -1;
    c.visit = function (i) {
      var m = c.map, s = cfg.stops[i]; if (!m || !s || c.first || !el.classList.contains('rvm-on')) return;
      var back = cfg.home && c.seen === i;
      var me = ++c.token; motion(false); mo.z = 0; showNote(c.cur, false); sign(false);
      if (job && job.left) drop();
      c.seen = back ? -1 : i;
      m.stop(); floorOn(true); m.flyTo(Object.assign(camOf(back ? place(c.cur) : s), { duration: reduced() ? 0 : 2500, curve: cfg.curve || 1.42 }));
      m.once('moveend', function () { if (me !== c.token || c.dead) return; floorOn(false); if (!back) showNote(i, true, true); free(); job = null; ahead(0); });
    };
    // Where it was left, for the next slide's map (c.begin()): its camera — the zoom in the block's own terms —, the
    // stop it was at, how far it had neared it.
    c.state = function () {
      var m = c.map; if (!m || c.failed || !el.classList.contains('rvm-on')) return null;
      var v = camNow(), s = c.first ? null : place(c.cur), px = v.zoom; v.zoom -= zk();
      return { cam: v, px: px, at: s ? { c: s.c, z: s.z } : null, z: mo.z };
    };
    // Where the map is looking now, in the block's terms (for «Usar la vista actual»).
    c.view = function () {
      var m = c.map; if (!m) return null; var v = camNow();
      return { lon: +v.center[0].toFixed(5), lat: +v.center[1].toFixed(5), zoom: +(v.zoom - zk()).toFixed(2), pitch: +v.pitch.toFixed(1), bearing: +v.bearing.toFixed(1) };
    };
    // New settings (the dialog, as they are edited): a new style if the look changed, else the line and the markers.
    c.update = function (next) {
      var restyle = JSON.stringify([next.style, next.proj, next.dem, next.lang, !!next.clear]) !== JSON.stringify([cfg.style, cfg.proj, cfg.dem, cfg.lang, !!cfg.clear]);
      cfg = c.cfg = next; credit.textContent = cfg.short || ''; paintBg();
      c.cur = Math.min(c.cur, Math.max(0, cfg.stops.length - 1));
      if (!c.map) return;
      // (Edited in the dialog: what was being warmed is no longer the trip; warmed again once the edits pause.)
      // (Edited in the dialog: the flight ahead is another; fetched again once the edits pause.)
      job = null; free();
      if (c.settled) ahead(1500);
      if (restyle) { try { c.map.setTerrain(null); } catch (e) {} c.map.setStyle(cfg.style, { diff: false }); }
      else try { if (c.map.getLayer('rv-route')) c.map.setPaintProperty('rv-route', 'line-color', cfg.color); } catch (e) {}
      load(cfg).then(function (ml) { c.arriving = false; markers(ml); paint(c.cur); });
      if (!moves()) motion(false); else if (!mo.on && c.settled && !c.first && !c.map.isMoving()) motion(true);
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
        var s = cfg.home ? null : cfg.stops[k];
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
        // (A globe without its space: its see-through corners kept — a WebP, a tenth of a PNG, where the browser writes
        // them, else a PNG —; a JPEG if, so close, nothing of it is see-through.)
        try {
          if (!cfg.clear) return cv.toDataURL('image/jpeg', 0.85);
          var px = g.getImageData(0, 0, W, H).data, see = false;
          for (var i = 3; i < px.length; i += 16) if (px[i] < 250) { see = true; break; }
          if (!see) return cv.toDataURL('image/jpeg', 0.85);
          var wp = cv.toDataURL('image/webp', 0.85);
          return /^data:image\/webp/.test(wp) ? wp : cv.toDataURL('image/png');
        } catch (e) { return null; }
        });
      });
    };
    c.resize = function () { bleed(); if (c.map) { try { c.map.setPixelRatio(pr()); } catch (e) {} c.map.resize(); } };
    c.destroy = function () {
      c.dead = true; c.token++; motion(false); if (c.ro) c.ro.disconnect(); mounted = mounted.filter(function (x) { return x !== c; }); clearTimeout(c.at); job = null;
      if (c.map) try { var cv = c.map.getCanvas(); c.map.remove(); release(cv); } catch (e) {}
      c.crash = null; window.__rvMapCrash = (window.__rvMapCrash || []).filter(function (f) { return f !== crash; });
      box.remove(); note.remove(); credit.remove(); el.classList.remove('rvm-on', 'rvm-offline', 'rvm-fade'); el.style.overflow = 'hidden'; el.removeAttribute('data-bled'); var n = el.querySelector(':scope > .rvm-off'); if (n) n.remove();
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
    el._rvm = mount(el, cfg, { interactive: true, warm: !receiver, motion: true, start: true });
    return el._rvm;
  }
  // (entering: the slide has just been arrived at — its map may start from elsewhere: c.begin(). from: the map it
  // carries on from — the previous slide's, through Morph —: c.state() of that one.)
  function settle(el, animate, entering, from) {
    var c = ensure(el); if (!c) return;
    var sec = el.closest('section');
    var shown = sec ? [].slice.call(sec.querySelectorAll('[data-mapgo]')).filter(function (f) {
      return (f === el || f.contains(el)) && (f.classList.contains('visible') || f.classList.contains('on'));
    }) : [];
    shown.sort(function (a, b) { return (+a.getAttribute('data-fragment-index') || 0) - (+b.getAttribute('data-fragment-index') || 0) || (a.compareDocumentPosition(b) & 4 ? -1 : 1); });
    var last = shown[shown.length - 1], k = last ? +last.getAttribute('data-mapgo') || 0 : 0;
    var dur = last ? secs(getComputedStyle(last).getPropertyValue('--anim-dur')) || 3000 : 0;
    var wait = last && animate ? secs(getComputedStyle(last).getPropertyValue('--anim-del')) : 0;
    if (entering && from && c.cfg.start !== 'space') { c.begin('prev', from, k); return; }
    if (entering && !last && c.cfg.start) { c.begin(c.cfg.start, left); return; }
    if (wait) setTimeout(function () { c.go(k, true, dur); }, wait); else c.go(k, animate, dur);
  }
  function near(sec, cur) {
    if (!window.Reveal || !sec) return false;
    var all = Reveal.getSlides(), a = all.indexOf(sec.closest('section')), b = all.indexOf(cur);
    if (a < 0 || b < 0) return false;
    // (Light: in the scroll view, only the slide in view; presenting slide by slide, it and the next — if there aren't
    // too many maps between the two: ahead2().)
    if (lite()) return a === b || (a === b + 1 && !scrollView() && ahead2(all[b], all[a]));
    return Math.abs(a - b) <= 1;
  }
  // ── Morph (Transformar) between two slides with a map each, of the same look: the same Earth — the new one carries
  // on from where the other was left, as its box glides to its place (and back, going back). Its partner: the one
  // Morph pairs it with (the same data-id), else the only map there of that look. (The map's own «from space» wins.)
  function morphs(a, b) { return !!(a && b && a.hasAttribute('data-auto-animate') && b.hasAttribute('data-auto-animate')); }
  function lookOf(el) { try { var x = JSON.parse(el.getAttribute('data-geomap')); return [x.look, x.style].join('|'); } catch (e) { return ''; } }
  function partner(el, other) {
    if (!morphs(el.closest('section'), other)) return null;
    var id = el.getAttribute('data-id'), maps = [].slice.call(other.querySelectorAll('[data-geomap]'));
    var p = id ? maps.filter(function (x) { return x.getAttribute('data-id') === id; })[0] : null;
    if (!p) { var same = maps.filter(function (x) { return lookOf(x) === lookOf(el); }); p = same.length === 1 ? same[0] : null; }
    return p && lookOf(p) === lookOf(el) ? p : null;
  }
  function inSlide(slide, prev) {
    if (!slide) return;
    slide.querySelectorAll('[data-geomap]').forEach(function (el) {
      var p = prev && partner(el, prev), from = p && p._rvm && p._rvm.state();
      if (from) from.morph = true;
      if (!p && el._rvm && el._rvm.staged) el._rvm.unstage();     // (staged for a Morph that didn't come: as it is)
      settle(el, false, true, from); if (el._rvm) el._rvm.resize();
      // (reveal.js sets up its Morph right after this event: then, this box taken out of it — glide() moves it.)
      if (p && el._rvm) Promise.resolve().then(function () {
        // (Nor anything inside either map — reveal.js pairs a marker's flag with the other's, by its picture, and then fades
        // everything else in the box in from nothing.)
        [el, p].forEach(function (x) { x.removeAttribute('data-auto-animate-target'); [].forEach.call(x.querySelectorAll('[data-auto-animate-target]'), function (y) { y.removeAttribute('data-auto-animate-target'); }); });
        var sec = el.closest('section'), d = parseFloat(sec.getAttribute('data-auto-animate-duration')) || (Reveal.getConfig().autoAnimateDuration) || 1;
        el._rvm.glide(p, d * 1000);
      });
    });
    // (What is heavy — starting the next slide's map, letting go of one two slides away — once the change is over and
    // this slide's map has got where it was going: in the middle of a transition or a flight it cost a few frames.
    // Right away at the start; after 10 s, anyway.)
    if (!prev || scrollView()) return around(slide);
    var t0 = Date.now();
    (function wait() {
      var busy = [].some.call(slide.querySelectorAll('[data-geomap]'), function (el) { var c = el._rvm; return c && c.map && !c.dead && (c.going || c.first || c.map.isMoving()); });
      if (Date.now() - t0 < 1100 || (busy && Date.now() - t0 < 10000)) return setTimeout(wait, 250);
      around(slide);
    })();
  }
  // (The scroll view — a phone held upright —: the slide in view is the one with maps nearest the middle of the screen;
  // reveal.js's own current one may never be the last ones of a short deck, which can't scroll to the top.)
  function focus() {
    var cur = Reveal.getCurrentSlide();
    if (!(Reveal.isScrollView && Reveal.isScrollView())) return cur;
    var vh = window.innerHeight || 0, best = null, bd = Infinity;
    Reveal.getSlides().forEach(function (s) {
      if (!s.querySelector('[data-geomap]')) return;
      var r = s.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= vh || !r.height) return;
      var d = Math.abs((r.top + r.bottom) / 2 - vh / 2); if (d < bd) { bd = d; best = s; }
    });
    return best || cur;
  }
  var scrollView = function () { return !!(window.Reveal && Reveal.isScrollView && Reveal.isScrollView()); };
  var maps = function (s) { return s ? s.querySelectorAll('[data-geomap]').length : 0; };
  // (Whether the next slide's maps may be started ahead — so the transition shows them, and Morph has one to carry the
  // Earth into —: always, except light with more than five maps between this slide and the next.)
  function ahead2(cur, next) { return !!next && (!lite() || maps(cur) + maps(next) <= 5); }
  function around(slide) {
    var cur = focus();
    mounted.slice().forEach(function (c) { if (!c.el.isConnected || !near(c.el.closest('section'), cur)) { if (!c.el.closest('.rv-dlg-map')) c.destroy(); } });
    if (cur !== slide || scrollView()) return;
    // (A map on the next slide, started now — reveal.js has it laid out already —: its first view loaded and its
    // first flight fetched before it is shown. Not in the speaker view's previews: the presentation does it.)
    var all = Reveal.getSlides(), next = all[all.indexOf(slide) + 1];
    if (!ahead2(slide, next)) next = null;
    if (next && !receiver) next.querySelectorAll('[data-geomap]').forEach(function (el) { ensure(el); });
    // (And one there that will carry on from a map here: kept looking where this one is — c.shadow().)
    slide.querySelectorAll('[data-geomap]').forEach(function (el) {
      var c = el._rvm, f = next && !receiver && c ? [].slice.call(next.querySelectorAll('[data-geomap]')).filter(function (x) { return partner(x, slide) === el && x._rvm; })[0] : null;
      if (!c) return;
      c.follower = f && f._rvm.cfg.start !== 'space' ? function () { if (f._rvm) f._rvm.ready.then(function () { if (f._rvm) f._rvm.shadow(c.state()); }); } : null;
      if (c.follower && !f._rvm.staged) f._rvm.stage(parseFloat(el.style.width), parseFloat(el.style.height));
      if (c.follower) c.ready.then(function () { if (c.follower) c.follower(); });
    });
  }
  function fromFragments(e) {
    (e.fragments || [e.fragment]).forEach(function (f) {
      if (!f || !f.hasAttribute('data-mapgo')) return;
      var el = f.matches('[data-geomap]') ? f : f.querySelector('[data-geomap]'); if (el) settle(el, true);
    });
  }
  if (window.Reveal && document.querySelector('[data-geomap]')) {
    Reveal.on('ready', function (e) { if (Reveal.isScrollView && Reveal.isScrollView()) inView(); else inSlide(e.currentSlide); });
    // (Where the map of the slide left was, for one that carries on from it: c.begin().)
    Reveal.on('slidechanged', function (e) {
      var was = e.previousSlide && [].slice.call(e.previousSlide.querySelectorAll('[data-geomap]')).map(function (el) { return el._rvm && el._rvm.state(); }).filter(Boolean)[0];
      if (was) left = was;
      if (Reveal.isScrollView && Reveal.isScrollView()) return inView();
      inSlide(e.currentSlide, e.previousSlide);
    });
    // (Scrolling, in the scroll view: the slide in view — focus() — gets its maps, the one before lets go of them.)
    var seen = null, st = 0;
    function inView() { var f = focus(); if (f && f !== seen) { seen = f; inSlide(f); } }
    window.addEventListener('scroll', function () { if (!(Reveal.isScrollView && Reveal.isScrollView())) return; clearTimeout(st); st = setTimeout(inView, 200); }, { passive: true, capture: true });
    Reveal.on('fragmentshown', fromFragments); Reveal.on('fragmenthidden', fromFragments);
    Reveal.on('resize', function () { mounted.forEach(function (c) { c.resize(); }); });
    document.addEventListener('click', function (e) {
      var s = e.target.closest && e.target.closest('[data-bid]'); if (!s) return;
      setTimeout(function () { s.closest('section').querySelectorAll('[data-trig="' + s.getAttribute('data-bid') + '"][data-mapgo]').forEach(function (f) {
        var el = f.matches('[data-geomap]') ? f : f.querySelector('[data-geomap]'); if (el) settle(el, true); }); }, 0);
    });
    if (Reveal.isReady()) { if (Reveal.isScrollView && Reveal.isScrollView()) inView(); else inSlide(Reveal.getCurrentSlide()); }
  }
  return { load: load, mount: mount, settle: settle, mounted: function () { return mounted.slice(); }, gpu: gpu, weak: weak, reliefOff: reliefOff };
}
