// Motion paths on the slide: draw one by hand (drag from the object along the
// way it should go), then adjust it by dragging its points; a "+" between two
// points adds one there, a double click on a point removes it. Straight and
// curved paths have one point, their end.

import { commit, selectedBlock, currentSlide } from '../../core/store.js';
import { setMotionPath, simplifyStroke } from '../../features/animation/transitions.js';
import { stage, readOnly } from './canvas.js';
import { factor } from './interact.js';
import { alertDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

let drawing = null;
export const drawingPath = () => !!drawing;
const toStage = e => { const r = stage.getBoundingClientRect(), k = factor(); return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
const centre = b => [b.x + b.w / 2, b.y + b.h / 2];

export function cancelPathDraw() { drawing?.end(); }
export function startPathDraw() {
  const b = selectedBlock();
  if (!b || b.type === 'connector') { alertDialog(t('Selecciona primero el objeto que se moverá.')); return; }
  if (readOnly()) return;
  cancelPathDraw();
  const id = b.id, c = centre(b), hadPath = b.animation?.effect === 'path';
  const over = document.createElement('div'); over.className = 'path-draw';
  over.innerHTML = `<svg class="pd-svg" width="1" height="1"><polyline class="pd-line" points=""/><circle class="pd-start" cx="${c[0]}" cy="${c[1]}" r="9"/></svg>`
    + `<div class="pd-hint"><i class="ms">gesture</i> ${t('Dibuja el camino arrastrando desde el objeto. Suelta para terminar · Esc: cancelar')}</div>`;
  stage.appendChild(over);
  const line = over.querySelector('.pd-line');
  let pts = null;
  const show = () => line.setAttribute('points', [c, ...pts].map(p => p.map(v => v.toFixed(1)).join(',')).join(' '));
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } };
  const end = () => { over.remove(); window.removeEventListener('keydown', key, true); drawing = null; };
  drawing = { end };
  window.addEventListener('keydown', key, true);
  over.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); over.setPointerCapture?.(e.pointerId);
    pts = [toStage(e)]; show();
  });
  over.addEventListener('pointermove', e => {
    if (!pts) return;
    const p = toStage(e), l = pts.at(-1);
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 3) { pts.push(p); show(); }
  });
  over.addEventListener('pointerup', () => {
    if (!pts) return;
    end();
    // Offsets from the object's centre: it starts where it is (if the drawing
    // starts away from it, it first goes to where the drawing starts).
    const rel = pts.map(([x, y]) => [x - c[0], y - c[1]]);
    if (Math.hypot(...rel[0]) < 30) rel[0] = [0, 0]; else rel.unshift([0, 0]);
    let len = 0; for (let i = 1; i < rel.length; i++) len += Math.hypot(rel[i][0] - rel[i - 1][0], rel[i][1] - rel[i - 1][1]);
    if (len < 15) return;                                   // (a click, not a path)
    const dur = Math.round(Math.min(8000, Math.max(1200, len * 4)) / 100) * 100;     // about 250 px per second
    setMotionPath(id, simplifyStroke(rel, 14), hadPath ? null : dur);          // (few points: easy to adjust)
  });
}

// The points of the selected object's path, to drag (called when the path is drawn).
export function drawPathHandles(b) {
  const a = b.animation, [cx, cy] = centre(b), custom = a.pathShape === 'custom' && a.points?.length > 1;
  const pts = custom ? a.points : [[0, 0], [a.dx || 0, a.dy || 0]];
  const add = (cls, [x, y], title, onDrag, onDbl) => {
    const h = document.createElement('div'); h.className = 'mp-h ' + cls; h.title = title;
    h.style.left = (cx + x) + 'px'; h.style.top = (cy + y) + 'px';
    h.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (!readOnly()) dragPoint(e, onDrag); });
    if (onDbl) h.addEventListener('dblclick', e => { e.stopPropagation(); onDbl(); });
    stage.appendChild(h);
  };
  const set = (fn, history = false) => commit(() => {
    const x = currentSlide().blocks.find(y => y.id === b.id)?.animation; if (!x) return;
    fn(x); if (x.points) [x.dx, x.dy] = x.points.at(-1);
  }, { history });
  for (let i = 1; i < pts.length; i++) {
    add(i === pts.length - 1 ? 'end' : '', pts[i], t('Arrastra para cambiar el recorrido') + (custom && i < pts.length - 1 ? ' · ' + t('doble clic: quitar el punto') : ''),
      (dx, dy, p0) => set(x => { if (custom) x.points[i] = [Math.round(p0[0] + dx), Math.round(p0[1] + dy)]; else { x.dx = Math.round(p0[0] + dx); x.dy = Math.round(p0[1] + dy); } }),
      custom && i < pts.length - 1 ? () => set(x => { x.points.splice(i, 1); }, true) : null);
    // "+" half way: drag it to add a point there.
    if (custom) {
      const m = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2];
      let added = false;
      add('mid', m, t('Arrastra para añadir un punto'), (dx, dy) => set(x => {
        if (!added) { x.points.splice(i, 0, [...m]); added = true; }
        x.points[i] = [Math.round(m[0] + dx), Math.round(m[1] + dy)];
      }));
    }
  }
}
function dragPoint(e, onDrag) {
  const h = e.target, k = factor(), x0 = e.clientX, y0 = e.clientY;
  const p0 = [parseFloat(h.style.left), parseFloat(h.style.top)];
  const b = selectedBlock(), c = centre(b), start = [p0[0] - c[0], p0[1] - c[1]];
  let moved = false;
  const move = ev => { moved = true; onDrag((ev.clientX - x0) * k, (ev.clientY - y0) * k, start); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (moved) commit(() => {}); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
