// What this computer can draw (WebGL), found out once and kept: used where a 3D model or a map would leave an empty box.
//   { ok: false }                         no WebGL at all (disabled, blocked driver, no graphics at all)
//   { ok: true, soft: true, renderer }    WebGL drawn by the processor (SwiftShader, llvmpipe…): slow, as a computer without a card
// (The runtimes of the exported page carry their own copy of this: they import nothing — io/runtime/model3d.js, geomap.js.)
let info = null;
export function webglInfo() {
  if (window.__rvGS?.dead) return { ok: false, soft: false, renderer: '' };      // (the page has lost its contexts for good: see io/runtime/geomap.js)
  if (info) return info;
  info = { ok: false, soft: false, renderer: '' };
  try {
    const g = (document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'));
    if (g) {
      info.ok = true;
      const x = g.getExtension('WEBGL_debug_renderer_info'); info.renderer = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL) || '') : '';
      info.soft = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(info.renderer);
      g.getExtension('WEBGL_lose_context')?.loseContext();      // (the probe's own context isn't kept: browsers allow only so many)
    }
  } catch {}
  return info;
}

// A computer whose graphics are off (GPU disabled by the browser: «Error creating WebGL context», then «reading 'xr'» once
// per <model-viewer>): not an uncaught error for each, the light mode from then on (what io/runtime/geomap.js and
// model3d.js read from window.__rvGS).
if (typeof window !== 'undefined' && !window.__rvGSGuard) {
  window.__rvGSGuard = true;
  const gs = () => (window.__rvGS ||= { fails: 0, rebuilds: 0, lite: false, dead: false });
  window.addEventListener('error', e => { if (/model-viewer/.test(e.filename || '') || /reading 'xr'|Error creating WebGL context/.test(e.message || '')) { e.preventDefault(); gs().lite = true; } });
  window.addEventListener('unhandledrejection', e => { if (/Error creating WebGL context|reading 'xr'/.test(String(e.reason?.message || e.reason || ''))) { e.preventDefault(); gs().lite = true; } });
}

// Does this computer (or its owner) want a still picture where a video would play? «Reduce motion» in the system (unless the
// user chose «every effect»), the light mode chosen by hand (?perf=lite, 'revela.perf'), or a connection that saves data
// (not when «every effect» was chosen). The exported page carries this function as source (toString): it imports nothing.
export function videoLite() {
  try {
    var q = /[?&]perf=(lite|full)\b/.exec(location.search), perf = q ? q[1] : localStorage.getItem('revela.perf') || '';
    if (perf === 'lite') return true;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem('revela.motion') !== 'ignore') return true;
    var c = navigator.connection;
    return perf !== 'full' && !!(c && c.saveData);
  } catch (e) { return false; }
}
