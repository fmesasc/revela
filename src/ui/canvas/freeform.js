// Freeform shape (PowerPoint's "Freeform"): draw an outline on the slide with
// the mouse, a pen or a finger; on letting go it becomes a closed shape, filled
// with the theme's colour, that can be moved, resized, recoloured, animated…
// Esc cancels.

import { addFreeform } from '../../features/document/blocks.js';
import { simplifyStroke } from '../../features/animation/transitions.js';
import { stage, readOnly } from './canvas.js';
import { factor } from './interact.js';
import { t } from '../../i18n/index.js';

let drawing = null;
const toStage = e => { const r = stage.getBoundingClientRect(), k = factor(); return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };

export function cancelFreeform() { drawing?.end(); }
export function startFreeform() {
  if (readOnly()) return;
  cancelFreeform();
  const over = document.createElement('div'); over.className = 'path-draw freeform-draw';
  over.innerHTML = `<svg class="pd-svg" width="1" height="1"><polygon class="pd-line ff-shape" points=""/></svg>`
    + `<div class="pd-hint"><i class="ms">draw</i> ${t('Dibuja el contorno de la forma arrastrando. Suelta para terminar · Esc: cancelar')}</div>`;
  stage.appendChild(over);
  const poly = over.querySelector('.ff-shape');
  let pts = null;
  const show = () => poly.setAttribute('points', pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '));
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
    const p = toStage(e), q = pts.at(-1); if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 3) return;
    pts.push(p); show();
  });
  over.addEventListener('pointerup', () => {
    if (!pts) return;
    const simple = simplifyStroke(pts, 2.5);
    end();
    if (simple.length >= 3) addFreeform(simple);
  });
}
