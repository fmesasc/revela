// Canvas mode inside the presentation: runs as source embedded in the exported
// page with the frames; the geometry comes from features/design/canvasmode.js.

import { mul, inv, apply, css, frameMatrix, bounds, fitView } from '../../features/design/canvasmode.js';

// Every section keeps its frame on the canvas; the camera is the inverse of
// the current frame. "O" shows the whole canvas; a click on a frame goes there.
export function canvasRuntime(frames, w, h) {
  var sections = [].slice.call(document.querySelectorAll('.reveal .slides > section'));
  var M = frames.map(function (f) { return frameMatrix(f, w, h); }), overview = false;
  // Smaller frames on top of bigger ones (a detail inside its frame stays visible).
  frames.map(function (f, i) { return [f.s || 1, i]; }).sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; })
    .forEach(function (p, k) { if (sections[p[1]]) sections[p[1]].style.setProperty('z-index', String(20 + k), 'important'); });
  var world = document.querySelector('.reveal .rv-world');
  function place(view) { sections.forEach(function (s, i) { if (M[i]) s.style.transform = css(mul(view, M[i])); }); if (world) world.style.transform = css(view); }
  function go(i) { overview = false; document.documentElement.classList.remove('rv-canvas-overview'); if (M[i]) place(inv(M[i])); }
  function all() { overview = true; document.documentElement.classList.add('rv-canvas-overview'); place(fitView(bounds(frames, w, h), w, h)); }
  Reveal.on('ready', function () { go(Reveal.getIndices().h); });
  Reveal.on('slidechanged', function (e) { go(e.indexh); });
  if (Reveal.isReady()) go(Reveal.getIndices().h);
  // O: the whole canvas (instead of the slide mosaic, whose handler comes later on the same window).
  window.addEventListener('keydown', function (e) {
    if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA/.test(e.target.tagName || '')) {
      e.preventDefault(); e.stopImmediatePropagation(); overview ? go(Reveal.getIndices().h) : all();
    }
  }, true);
  sections.forEach(function (s, i) { s.addEventListener('click', function () { if (overview) { Reveal.slide(i); go(i); } }); });
}
// What the runtime needs besides itself (as source, no imports in the page).
export const canvasRuntimeDeps = () => `var mul=${mul};var inv=${inv};var apply=${apply};var css=${css};\n${frameMatrix}\n${bounds}\n${fitView}\n${canvasRuntime}`;
