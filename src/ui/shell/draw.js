// Draw tab: freehand pen and highlighter on the slide (PowerPoint/OnlyOffice
// "Draw"). Each stroke becomes an 'ink' object that can be moved, resized,
// animated or deleted like any other; the eraser removes whole strokes.

import { state, commit, currentSlide } from '../../core/store.js';
import { addInk, deleteBlock } from '../../features/document/blocks.js';
import { inkPath } from '../../render/svg.js';

// Distance test between a slide point and an ink block's polyline (scaled with
// the block, ignoring rotation which ink rarely has).
export function nearStroke(b, px, py, tol = 8) {
  const sx = b.w / (b.vw || b.w), sy = b.h / (b.vh || b.h), r = (b.width || 4) / 2 + tol;
  const P = (b.points || []).map(([x, y]) => [b.x + x * sx, b.y + y * sy]);
  if (P.length === 1) return Math.hypot(P[0][0] - px, P[0][1] - py) <= r;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
    if (Math.hypot(ax + t * dx - px, ay + t * dy - py) <= r) return true;
  }
  return false;
}

export const drawOpts = { color: '#ff2d2d', width: 4 };

export function setDrawTool(tool) {
  commit(() => { state.ui.drawTool = state.ui.drawTool === tool ? null : tool; state.ui.selection = null; state.ui.multi = []; },
    { history: false });
}

export function initDraw() {
  const stage = document.getElementById('stage');
  const toSlide = e => {
    const r = stage.getBoundingClientRect(), f = state.deck.size.w / r.width;
    return [+((e.clientX - r.left) * f).toFixed(1), +((e.clientY - r.top) * f).toFixed(1)];
  };
  // Erase the topmost stroke that passes near the pointer (not just its box).
  const eraseAt = e => {
    const [px, py] = toSlide(e);
    const hit = [...currentSlide().blocks].reverse().find(b => b.type === 'ink' && nearStroke(b, px, py));
    if (hit) deleteBlock(hit.id);
  };
  // Capture phase: while a tool is on, the stage belongs to the pen.
  stage.addEventListener('pointerdown', e => {
    const tool = state.ui.drawTool; if (!tool) return;
    if (state.deck.final) { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new Event('revela:readonly')); return; }
    e.preventDefault(); e.stopPropagation();
    if (tool === 'eraser') {
      eraseAt(e);
      const mv = ev => eraseAt(ev);
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
      return;
    }
    const hl = tool === 'hl', width = hl ? Math.max(14, drawOpts.width * 4) : drawOpts.width;
    const color = hl && drawOpts.color === '#ff2d2d' ? '#ffe600' : drawOpts.color;
    const pts = [toSlide(e)];
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ink-live');
    svg.setAttribute('viewBox', `0 0 ${state.deck.size.w} ${state.deck.size.h}`);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', color); path.setAttribute('stroke-width', width);
    path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
    if (hl) path.setAttribute('stroke-opacity', '0.4');
    svg.appendChild(path); stage.appendChild(svg);
    const mv = ev => {
      const p = toSlide(ev), l = pts[pts.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 1.5) return;       // skip jitter
      pts.push(p); path.setAttribute('d', inkPath(pts));
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      svg.remove(); addInk(pts, { color, width, hl });
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.ui.drawTool) commit(() => { state.ui.drawTool = null; }, { history: false });
  });
}
