// What this computer can draw (WebGL), found out once and kept: used where a 3D model or a map would leave an empty box.
//   { ok: false }                         no WebGL at all (disabled, blocked driver, no graphics at all)
//   { ok: true, soft: true, renderer }    WebGL drawn by the processor (SwiftShader, llvmpipe…): slow, as a computer without a card
// (The runtimes of the exported page carry their own copy of this: they import nothing — io/runtime/model3d.js, geomap.js.)
let info = null;
export function webglInfo() {
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
