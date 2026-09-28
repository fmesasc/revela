// Merge shapes (PowerPoint "Merge Shapes", OnlyOffice "Combine shapes"):
// union, combine (xor), intersect and subtract. The selected shapes are turned
// into polygons in slide coordinates (with rotation and flips), clipped with the
// polygon-clipping library, and replaced by one 'custom' shape whose path is
// normalised to the usual 100×100 box. It takes the look of the first shape.

import { state, commit, currentSlide, setSelection } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { shapeOutline100 } from '../../render/svg.js';

const LIB = 'https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js';
const loadLib = () => new Promise((res, rej) => {
  if (window.polygonClipping) return res(window.polygonClipping);
  const sc = document.createElement('script'); sc.src = LIB;
  sc.onload = () => res(window.polygonClipping); sc.onerror = () => rej(new Error('polygon-clipping'));
  document.head.appendChild(sc);
});

// Polygon rings of a shape block, in slide pixels. A 'custom' shape keeps its
// rings (b.rings, in the 100 box) so it can be merged again.
export function shapeRings(b) {
  const rings100 = b.shape === 'custom' ? (b.rings || []) : [shapeOutline100(b.shape)].filter(Boolean);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, a = (b.rotation || 0) * Math.PI / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return rings100.map(ring => {
    const pts = ring.map(([u, v]) => {
      let x = (u / 100 - 0.5) * b.w, y = (v / 100 - 0.5) * b.h;
      if (b.flipH) x = -x; if (b.flipV) y = -y;
      return [cx + x * cos - y * sin, cy + x * sin + y * cos];
    });
    pts.push(pts[0]);                                       // closed ring, as the library expects
    return pts;
  });
}

export const MERGE_OPS = ['union', 'xor', 'intersection', 'difference'];
export const canMerge = bs => bs.length >= 2 && bs.every(b => b.type === 'shape' && b.shape !== 'line' && b.shape !== 'arrow');

// `ordered`: the shapes in selection order (subtract removes the rest from the first).
export async function mergeShapes(op, ordered) {
  if (!MERGE_OPS.includes(op) || !canMerge(ordered)) return null;
  const pc = await loadLib();
  const geoms = ordered.map(b => shapeRings(b));             // each: Polygon (outer + holes)
  const res = pc[op](geoms[0], ...geoms.slice(1));           // MultiPolygon
  const rings = res.flat(1);
  if (!rings.length) return null;                            // e.g. no overlap for intersect
  const xs = rings.flat().map(p => p[0]), ys = rings.flat().map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x || 1, h = Math.max(...ys) - y || 1;
  const norm = rings.map(r => r.slice(0, -1).map(([px, py]) => [+((px - x) / w * 100).toFixed(2), +((py - y) / h * 100).toFixed(2)]));
  const path = norm.map(r => 'M' + r.map(p => p.join(',')).join(' L') + ' Z').join(' ');
  const first = ordered[0];
  const nb = { id: uid(), type: 'shape', shape: 'custom', path, rings: norm, fill: first.fill, stroke: first.stroke,
    strokeWidth: first.strokeWidth, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null };
  const ids = new Set(ordered.map(b => b.id));
  commit(() => {
    const s = currentSlide();
    const at = s.blocks.findIndex(b => ids.has(b.id));        // keep the stacking position
    s.blocks = s.blocks.filter(b => !ids.has(b.id));
    s.blocks.splice(Math.max(0, at), 0, nb);
    setSelection(nb.id);
  });
  return nb;
}

// Shapes selected, in the order they were selected.
export function selectedShapesInOrder() {
  const s = currentSlide(), ids = state.ui.multi?.length ? state.ui.multi : [state.ui.selection];
  return ids.map(id => s.blocks.find(b => b.id === id)).filter(Boolean);
}
