// Media player for videos and animated GIFs, shared by the editor and the
// exported presentation (embedded there as source, so: no imports).
//
// - Segments: play from second X to second Y and stop there (each click of
//   the presentation plays the next one).
// - Colour key ("chroma"): pixels close to a colour become transparent, live.
// - GIFs are decoded frame by frame (gifuct-js, loaded from `gifLib`) so they
//   can be paused and sought like a video.
//
// createMediaPlayer(host, { kind: 'video'|'gif', src, fit, muted, loop, key, gifLib })
// → { ready, duration(), time(), play(from, to), pause(), seek(t), onframe }
export function createMediaPlayer(host, o) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: !!o.key });
  let video = null, gif = null, stopAt = null, playing = false, t0 = 0, tStart = 0, cur = 0, raf = 0;
  const api = { onframe: null };

  // The drawing: source → canvas at the element's size (object-fit), then the key.
  const fitRect = (sw, sh, W, H) => {
    if (o.fit === 'fill') return [0, 0, W, H];
    const k = (o.fit === 'cover' ? Math.max : Math.min)(W / sw, H / sh);
    return [(W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k];
  };
  function draw(src, sw, sh) {
    const r = host.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round((r.width || sw) * dpr)), H = Math.max(1, Math.round((r.height || sh) * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    const [x, y, w, h] = fitRect(sw, sh, W, H);
    ctx.drawImage(src, x, y, w, h);
    if (o.key && o.key.color) {
      const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
      keyOut(x0, y0, Math.min(W, Math.ceil(x + w)) - x0, Math.min(H, Math.ceil(y + h)) - y0);
    }
    api.onframe && api.onframe(api.time());
  }
  // Colour key: distance in RGB to the key colour; below `tol` transparent,
  // then a soft edge of width `soft` (both 0–1).
  function keyOut(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    const img = ctx.getImageData(x, y, w, h), d = img.data;
    const c = o.key.color.replace('#', ''), kr = parseInt(c.slice(0, 2), 16), kg = parseInt(c.slice(2, 4), 16), kb = parseInt(c.slice(4, 6), 16);
    const tol = (o.key.tol ?? 0.3) * 441.7, soft = Math.max(1, (o.key.soft ?? 0.1) * 441.7);
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.sqrt((d[i] - kr) ** 2 + (d[i + 1] - kg) ** 2 + (d[i + 2] - kb) ** 2);
      if (dist < tol) d[i + 3] = 0;
      else if (dist < tol + soft) d[i + 3] = d[i + 3] * (dist - tol) / soft;
    }
    ctx.putImageData(img, x, y);
  }

  // ---- GIF: frames composed on demand (disposal methods honoured) ----------
  function gifFrameAt(t) {
    const T = t * 1000 % (gif.total || 1);
    let acc = 0, idx = 0;
    for (; idx < gif.frames.length - 1; idx++) { acc += gif.frames[idx].delay || 100; if (acc > T) break; }
    return idx;
  }
  function composeGif(idx) {
    if (gif.last === idx) return;
    const g = gif.work, gx = g.getContext('2d');
    let start = 0;
    if (gif.last != null && idx > gif.last) start = gif.last + 1; else { gx.clearRect(0, 0, g.width, g.height); }
    for (let i = start; i <= idx; i++) {
      const f = gif.frames[i], prev = i > 0 ? gif.frames[i - 1] : null;
      if (prev && i === start && start > 0) {
        if (prev.disposalType === 2) gx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
        else if (prev.disposalType === 3 && gif.saved) gx.putImageData(gif.saved, 0, 0);
      }
      if (f.disposalType === 3) gif.saved = gx.getImageData(0, 0, g.width, g.height);
      const pc = gif.patch; pc.width = f.dims.width; pc.height = f.dims.height;
      pc.getContext('2d').putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
      gx.drawImage(pc, f.dims.left, f.dims.top);
      if (i < idx) {
        if (f.disposalType === 2) gx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
        else if (f.disposalType === 3 && gif.saved) gx.putImageData(gif.saved, 0, 0);
      }
    }
    gif.last = idx;
  }
  function renderAt(t) {
    cur = Math.max(0, t);
    if (gif) { composeGif(gifFrameAt(cur)); draw(gif.work, gif.work.width, gif.work.height); }
    else if (video && video.videoWidth) draw(video, video.videoWidth, video.videoHeight);
  }
  function tick() {
    raf = 0;
    if (!playing) return;
    let t = gif ? tStart + (performance.now() - t0) / 1000 : video.currentTime;
    if (stopAt != null && t >= stopAt) { t = stopAt; playing = false; if (video) { video.pause(); video.currentTime = stopAt; } }
    else if (gif && !o.loop && stopAt == null && t >= api.duration()) { t = api.duration(); playing = false; }
    renderAt(gif ? (o.loop && stopAt == null ? t % api.duration() : t) : t);
    if (playing) raf = requestAnimationFrame(tick);
  }

  api.duration = () => (gif ? (gif.total || 0) / 1000 : (video && isFinite(video.duration) ? video.duration : 0));
  api.time = () => (video && !gif ? video.currentTime : cur);
  api.playing = () => playing;
  api.resume = () => api.play(null, stopAt != null && api.time() < stopAt - 0.01 ? stopAt : null);
  api.pause = () => { playing = false; if (video) video.pause(); };
  api.seek = t => { api.pause(); if (video) { video.currentTime = t; video.addEventListener('seeked', () => renderAt(t), { once: true }); } else renderAt(t); };
  api.play = (from, to) => {
    stopAt = to == null ? null : to;
    if (from != null) { if (video) video.currentTime = from; cur = from; }
    playing = true; t0 = performance.now(); tStart = cur;
    if (video) { video.loop = !!o.loop && stopAt == null; video.play().catch(() => {}); }
    if (!raf) raf = requestAnimationFrame(tick);
  };

  // Never rejects: a file that can't be read leaves api.error set and nothing drawn.
  api.ready = (async () => {
    try {
      if (o.kind === 'gif') {
        const lib = await import(o.gifLib);
        const buf = await (await fetch(o.src)).arrayBuffer();
        const parsed = lib.parseGIF(buf), frames = lib.decompressFrames(parsed, true);
        const work = document.createElement('canvas'); work.width = parsed.lsd.width; work.height = parsed.lsd.height;
        gif = { frames, work, patch: document.createElement('canvas'), last: null, saved: null, total: frames.reduce((a, f) => a + (f.delay || 100), 0) };
      } else {
        video = document.createElement('video');
        video.src = o.src; video.muted = !!o.muted; video.playsInline = true; video.preload = 'auto'; video.crossOrigin = 'anonymous';
        await new Promise((res, rej) => { video.addEventListener('loadeddata', res, { once: true }); video.addEventListener('error', rej, { once: true }); });
      }
      renderAt(0);
    } catch (e) { api.error = e || new Error('media'); }
    return api;
  })();
  return api;
}

// The presentation side: every [data-media] element gets a player; clicks
// (reveal fragments .rv-seg with data-seg-of / data-seg) play its segments.
export function revelaMediaRuntime(gifLib) {
  const players = new Map();
  document.querySelectorAll('[data-media]').forEach(el => {
    let cfg; try { cfg = JSON.parse(el.getAttribute('data-media')); } catch { return; }
    const p = createMediaPlayer(el, { ...cfg, gifLib });
    players.set(el.id, { p, cfg, el });
    el._player = p;
    // Clicking the video pauses it or goes on (to the end of the segment it was in).
    el.style.cursor = 'pointer';
    el.addEventListener('click', e => { e.stopPropagation(); p.ready.then(() => (p.playing() ? p.pause() : p.resume())); });
  });
  function enter(slide) {
    players.forEach(({ p, cfg, el }) => {
      if (!slide.contains(el)) { p.ready.then(() => p.pause()); return; }
      const s = cfg.segments && cfg.segments.length ? cfg.segments : null;
      p.ready.then(() => {
        if (cfg.autoplay) s ? p.play(s[0].from, s[0].to) : p.play(0, null);
        else p.seek(s ? s[0].from : 0);
      });
    });
  }
  Reveal.on('ready', e => enter(e.currentSlide));
  Reveal.on('slidechanged', e => enter(e.currentSlide));
  Reveal.on('fragmentshown', e => (e.fragments || [e.fragment]).forEach(f => {
    const m = players.get(f.getAttribute('data-seg-of')); if (!m) return;
    const k = +f.getAttribute('data-seg'), s = k < 0 ? { from: 0, to: null } : m.cfg.segments[k];
    if (s) m.p.ready.then(() => m.p.play(s.from, s.to));
  }));
  Reveal.on('fragmenthidden', e => (e.fragments || [e.fragment]).forEach(f => {
    const m = players.get(f.getAttribute('data-seg-of')); if (!m) return;
    const k = +f.getAttribute('data-seg'), s = m.cfg.segments[k - 1] || m.cfg.segments[k];
    m.p.ready.then(() => m.p.seek(k > 0 && s ? s.to : s ? s.from : 0));
  }));
  if (Reveal.isReady()) enter(Reveal.getCurrentSlide());
}
