// Live camera (Cameo), shared by the editor and the exported presentation
// (embedded there as source, so: no imports). Everything runs in the browser:
// the camera's picture is never sent anywhere.
//
// A camera box ([data-camera-box]) holds a <video data-camera> and, when its
// background is blurred or removed ([data-bg="blur"|"cut"]), a <canvas> drawn
// from the video and a person mask (MediaPipe's selfie segmenter, loaded only
// when such a box is shown). If that can't load or fails, the plain video stays.
//
// createCameraEngine({ vision, model, keep, load? }) → { show(boxes), release() }
// show: the boxes now on screen (the others pause; the drawing runs only for
// these); keep: hold on to the camera when none is shown (presenting), else
// let it go. load: a segmenter factory (tests).
export function createCameraEngine(o) {
  var st = null, asking = null, gen = 0, active = [], raf = 0, last = 0, segP = null, seg = null;
  var mask = null, mctx = null, img = null, tiny = null;
  function stream() {
    if (st) return Promise.resolve(st);
    if (!asking) {
      var g = gen, md = navigator.mediaDevices;
      asking = (md && md.getUserMedia ? md.getUserMedia({ video: true, audio: false }) : Promise.reject(new Error('camera')))
        .then(function (s) { if (g !== gen) { s.getTracks().forEach(function (t) { t.stop(); }); return null; } st = s; return s; }, function () { return null; });
    }
    return asking;
  }
  function segmenter() {
    if (!segP) segP = (o.load ? Promise.resolve().then(o.load) : import(o.vision + '/vision_bundle.mjs').then(function (m) {
      return m.FilesetResolver.forVisionTasks(o.vision + '/wasm').then(function (files) {
        var make = function (d) {
          return m.ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: o.model, delegate: d },
            runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false });
        };
        var gl = false; try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch (e) {}
        return gl ? make('GPU').catch(function () { return make('CPU'); }) : make('CPU');
      });
    })).then(function (s) { seg = s || null; return seg; }, function () { return null; });
    return segP;
  }
  var bgOf = function (bx) { return bx.getAttribute('data-bg'); };
  var vid = function (bx) { return bx.querySelector('video[data-camera]'); };
  // Back to the plain video (no segmenter).
  function plain(bx) { var c = bx.querySelector('canvas'), v = vid(bx); if (c) c.style.visibility = 'hidden'; if (v) v.style.opacity = ''; }
  function fail() { seg = null; segP = Promise.resolve(null); stop(); active.forEach(plain); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function show(boxes) {
    var g = ++gen;
    boxes = [].slice.call(boxes || []);
    active.forEach(function (bx) { var v = vid(bx); if (v && boxes.indexOf(bx) < 0) v.pause(); });
    active = boxes;
    if (!boxes.length) { stop(); if (!o.keep) release(); return Promise.resolve(); }
    return stream().then(function (s) {
      if (!s || g !== gen) return;
      // (Leaving a slide pauses its videos: coming back must play them again.)
      boxes.forEach(function (bx) {
        var v = vid(bx); if (!v) return;
        if (v.srcObject !== s) v.srcObject = s;
        if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
      if (!boxes.some(bgOf)) return stop();
      return segmenter().then(function (sg) {
        if (g !== gen) return;
        if (!sg) return boxes.forEach(plain);
        if (!raf) raf = requestAnimationFrame(frame);
      });
    });
  }
  function release() {
    gen++; stop(); asking = null;
    active.forEach(function (bx) { var v = vid(bx); if (v) v.srcObject = null; });
    active = [];
    if (st) { st.getTracks().forEach(function (t) { t.stop(); }); st = null; }
  }
  // Every frame: the mask of the person once, then each box drawn from it.
  function frame(now) {
    raf = 0;
    var boxes = active.filter(bgOf); if (!boxes.length || !seg) return;
    raf = requestAnimationFrame(frame);
    var v = vid(boxes[0]);
    if (!v || v.readyState < 2 || !v.videoWidth || now - last < 30) return;
    last = now;
    var r, m, f;
    try {
      r = seg.segmentForVideo(v, performance.now());
      var ms = r && r.confidenceMasks; m = ms && ms[ms.length - 1];   // (the person: the last one)
      if (!m) { if (r && r.close) r.close(); return; }
      f = m.getAsFloat32Array();
    } catch (e) { return fail(); }
    if (!mask) { mask = document.createElement('canvas'); mctx = mask.getContext('2d'); }
    if (mask.width !== m.width || mask.height !== m.height || !img) { mask.width = m.width; mask.height = m.height; img = mctx.createImageData(m.width, m.height); }
    var d = img.data;
    for (var i = 0, n = f.length; i < n; i++) d[i * 4 + 3] = Math.max(0, Math.min(255, (f[i] - 0.25) * 510));   // (a firmer edge)
    mctx.putImageData(img, 0, 0);
    if (r.close) r.close();
    boxes.forEach(function (bx) { draw(bx, v); });
  }
  // The video as object-fit:cover, only where the person is; behind, blurred.
  function draw(bx, v) {
    var c = bx.querySelector('canvas'); if (!c) return;
    var W = c.width, H = c.height, x = c.getContext('2d'), vw = v.videoWidth, vh = v.videoHeight;
    var k = Math.max(W / vw, H / vh), sw = W / k, sh = H / k, sx = (vw - sw) / 2, sy = (vh - sh) / 2, mx = mask.width / vw, my = mask.height / vh;
    x.save();
    x.globalCompositeOperation = 'copy';
    x.drawImage(mask, sx * mx, sy * my, sw * mx, sh * my, 0, 0, W, H);
    x.globalCompositeOperation = 'source-in';
    x.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
    if (bgOf(bx) === 'blur') {
      x.globalCompositeOperation = 'destination-over';
      if ('filter' in x) { var p = Math.round(Math.max(W, H) / 30) + 4; x.filter = 'blur(' + p + 'px)'; x.drawImage(v, sx, sy, sw, sh, -2 * p, -2 * p, W + 4 * p, H + 4 * p); }
      else {   // (no canvas filters: a small copy, stretched)
        if (!tiny) tiny = document.createElement('canvas');
        tiny.width = Math.max(4, Math.round(W / 16)); tiny.height = Math.max(4, Math.round(H / 16));
        tiny.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, tiny.width, tiny.height);
        x.drawImage(tiny, 0, 0, W, H);
      }
    }
    x.restore();
    if (c.style.visibility !== 'visible') { c.style.visibility = 'visible'; vid(bx).style.opacity = '0'; }
  }
  return { show: show, release: release };
}

// In the presentation: the current slide's cameras, on every slide change.
export function revelaCameraRuntime(vision, model) {
  var cam = createCameraEngine({ vision: vision, model: model, keep: true });
  function shown(s) { cam.show(s ? s.querySelectorAll('[data-camera-box]') : []); }
  Reveal.on('ready', function (e) { shown(e.currentSlide); });
  Reveal.on('slidechanged', function (e) { shown(e.currentSlide); });
  if (Reveal.isReady()) shown(Reveal.getCurrentSlide());
}
