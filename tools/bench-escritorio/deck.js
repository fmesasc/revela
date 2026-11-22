// Presentación sintética: N diapositivas con texto, una imagen (JPEG de ruido de unos 220 KB, distinta en cada una) y cuatro formas.
(async () => {
  const R = window.__revela, M = R.model, S = R.store, out = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const N = BENCH.N, LIVE = BENCH.live;
  const mk = (seed) => { const c = document.createElement('canvas'); c.width = 800; c.height = 544; const x = c.getContext('2d'); const d = x.createImageData(800, 544);
    for (let o = 0; o < d.data.length; o += 65536) crypto.getRandomValues(new Uint8Array(d.data.buffer, o, Math.min(65536, d.data.length - o))); for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255;
    x.putImageData(d, 0, 0); return c.toDataURL("image/jpeg", 0.5); };
  const deck = M.emptyDeck(); deck.slides = [];
  const MS = await import('./src/core/mediastore.js');
  for (let i = 0; i < N; i++) {
    const s = M.blankSlide('#101317');
    s.blocks = [M.textBlock({ x: 80, y: 40, w: 1100, h: 90, fontSize: 48, html: '<b>Diapositiva ' + i + '</b>' }),
      M.textBlock({ x: 80, y: 150, w: 600, h: 400, fontSize: 28, html: '<ul>' + Array.from({length: 6}, (_, k) => '<li>Punto ' + k + ' de la diapositiva ' + i + ' con texto largo para rellenar</li>').join('') + '</ul>' })];
    let src = mk(i);
    if (LIVE) { const b = await (await fetch(src)).blob(); src = await MS.storeFile(b, 'image/jpeg'); }
    s.blocks.push({ id: M.uid(), type: 'image', x: 700, y: 150, w: 500, h: 340, rotation: 0, animation: null, src, alt: '', fit: 'fill' });
    for (let k = 0; k < 4; k++) s.blocks.push({ id: M.uid(), type: 'shape', shape: 'rect', x: 100 + k * 120, y: 580, w: 100, h: 80, rotation: 0, animation: null, fill: '#3f6497' });
    deck.slides.push(s);
  }
  out.approxMB = +(M.approxSize(deck) / 1e6).toFixed(1);
  let t = performance.now();
  S.replaceDeck(deck); R.render(); await sleep(50);
  out.load_render_ms = Math.round(performance.now() - t);
  // thumbnails: wait until panel done
  t = performance.now(); try { await R.flushThumbs(); } catch (e) { out.thumbErr = String(e); }
  out.flushThumbs_ms = Math.round(performance.now() - t);
  out.thumbs = document.querySelectorAll('#navigator .thumb').length;
  // a typical edit
  const b = S.currentSlide().blocks[0]; const ed = [];
  for (let i = 0; i < 20; i++) { t = performance.now(); S.commit(() => { b.x += 1; }); ed.push(performance.now() - t); }
  out.commit_ms_med = +ed.sort((a, b) => a - b)[10].toFixed(1); out.commit_ms_max = +ed[19].toFixed(1);
  // autosave pass
  t = performance.now(); await M.flushSave(S.state.deck); out.flushSave_ms = Math.round(performance.now() - t);
  // second autosave (media already known)
  S.commit(() => { b.x += 1; }); t = performance.now(); await M.flushSave(S.state.deck); out.flushSave2_ms = Math.round(performance.now() - t);
  // slide navigation
  const nav = []; for (let i = 0; i < 20; i++) { t = performance.now(); R.slides.goToSlide((i * 13) % N); nav.push(performance.now() - t); }
  out.goto_ms_med = +nav.sort((a, b) => a - b)[10].toFixed(1);
  // undo history depth
  for (let i = 0; i < 100; i++) S.commit(() => { b.x += 1; });
  gc(); out.heapMB = Math.round(performance.memory.usedJSHeapSize / 1e6);
  t = performance.now(); let u = 0; while (S.canUndo && S.canUndo() && u < 200) { S.undo(); u++; } out.undoSteps = u; out.undoAll_ms = Math.round(performance.now() - t);
  return JSON.stringify(out);
})()
