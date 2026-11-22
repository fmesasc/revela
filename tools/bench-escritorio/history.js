(async () => {
  const R = window.__revela, M = R.model, S = R.store, out = {};
  const N = BENCH.N, LIM = BENCH.limit;
  const SS = await import('./src/core/store.js'); if (SS.setHistoryLimit) SS.setHistoryLimit(LIM);
  const deck = M.emptyDeck(); deck.slides = [];
  for (let i = 0; i < N; i++) { const s = M.blankSlide('#101317');
    s.blocks = [M.textBlock({ html: '<b>Diapositiva ' + i + '</b>' }), M.textBlock({ html: '<ul><li>a</li><li>b</li></ul>' })];
    for (let k = 0; k < 8; k++) s.blocks.push({ id: M.uid(), type: 'shape', shape: 'rect', x: 100 + k * 120, y: 580, w: 100, h: 80, rotation: 0, animation: null, fill: '#3f6497' });
    deck.slides.push(s); }
  S.replaceDeck(deck); R.render();
  const b = S.currentSlide().blocks[0];
  gc(); out.heap0 = Math.round(performance.memory.usedJSHeapSize / 1e6);
  const ed = []; for (let i = 0; i < 300; i++) { const t = performance.now(); S.commit(() => { b.x += 1; }); ed.push(performance.now() - t); }
  gc(); out.heapAfter300edits = Math.round(performance.memory.usedJSHeapSize / 1e6);
  out.commit_ms_med = +ed.sort((a, b) => a - b)[150].toFixed(1);
  let u = 0; const t = performance.now(); while (S.canUndo() && u < 400) { S.undo(); u++; } out.undoSteps = u; out.undoAll_ms = Math.round(performance.now() - t);
  return JSON.stringify(out);
})()
