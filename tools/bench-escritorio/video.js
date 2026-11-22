(async () => {
  const R = window.__revela, M = R.model, S = R.store, out = {};
  const MB = BENCH.MB, ADDR = BENCH.address;
  const MS = await import('./src/core/mediastore.js'), OF = await import('./src/ui/shell/openfile.js');
  S.replaceDeck(M.newDeck()); R.render();
  const bytes = new Uint8Array(MB * 1048576); for (let o = 0; o < bytes.length; o += 65536) crypto.getRandomValues(bytes.subarray(o, o + 65536));
  const f = new File([bytes], 'clip.mp4', { type: 'video/mp4' });
  gc(); out.heap0 = Math.round(performance.memory.usedJSHeapSize / 1e6);
  let t = performance.now();
  if (ADDR) { const src = await MS.storeFile(f); R.blocks.addVideo(src); } else await OF.insertFiles([f]);
  out.insert_ms = Math.round(performance.now() - t);
  const b = S.currentSlide().blocks.at(-1); out.srcKind = b.src.slice(0, 12); out.srcLen = b.src.length;
  t = performance.now(); await M.flushSave(S.state.deck); out.flushSave_ms = Math.round(performance.now() - t);
  S.commit(() => { b.x += 1; }); t = performance.now(); await M.flushSave(S.state.deck); out.flushSave2_ms = Math.round(performance.now() - t);
  const ed = []; for (let i = 0; i < 10; i++) { t = performance.now(); S.commit(() => { b.x += 1; }); ed.push(performance.now() - t); } out.commit_ms = +ed.sort((a, b) => a - b)[5].toFixed(1);
  gc(); out.heap1 = Math.round(performance.memory.usedJSHeapSize / 1e6);
  return JSON.stringify(out);
})()
