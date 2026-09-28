// Direct manipulation on the canvas: move, rotate and resize with the pointer,
// alignment guides and snapping, ruler guides, marquee selection and nudging.

import { state, commit, mutate, currentSlide, selectedBlocks, selectedIds, isSelected, setSelection, toggleSelection, setMulti, selectWithGroup } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { exitEdit } from './content.js';
import { readOnly, stage, transformOf } from './canvas.js';

export const SNAP = 7; // snapping threshold, in canvas pixels
export function addGuideFromRuler(e, axis) {
  const rect = stage.getBoundingClientRect(); const f = factor();
  const pos = Math.round(axis === 'v' ? (e.clientX - rect.left) * f : (e.clientY - rect.top) * f);
  commit(() => { (state.deck.guides ||= { v: [], h: [] })[axis].push(pos); });
}
// Persistent guides (deck‑level), drawn over the slide; drag to move, double‑click to remove.
export function drawPGuides() {
  stage.querySelectorAll('.pguide').forEach(g => g.remove());
  const g = state.deck.guides || { v: [], h: [] };
  ['v', 'h'].forEach(axis => (g[axis] || []).forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'pguide ' + axis;
    if (axis === 'v') el.style.left = pos + 'px'; else el.style.top = pos + 'px';
    el.addEventListener('pointerdown', ev => startGuideDrag(ev, axis, i));
    el.addEventListener('dblclick', ev => { ev.stopPropagation(); commit(() => state.deck.guides[axis].splice(i, 1)); });
    stage.appendChild(el);
  }));
}
export function startGuideDrag(ev, axis, i) {
  ev.stopPropagation();
  const rect = stage.getBoundingClientRect(); const f = factor();
  const onMove = e => {
    const pos = Math.round(axis === 'v' ? (e.clientX - rect.left) * f : (e.clientY - rect.top) * f);
    state.deck.guides[axis][i] = pos; mutate(() => {});
  };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); commit(() => {}); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}
// Rubber‑band selection: drag on the empty canvas to select every block the
// rectangle touches (hold Shift to add to the current selection).
export function startMarquee(ev) {
  const add = ev.shiftKey;
  if (!add) commit(() => setSelection(null), { history: false });
  const f = factor();
  const rect = stage.getBoundingClientRect();
  const ox = (ev.clientX - rect.left) * f, oy = (ev.clientY - rect.top) * f;
  const box = document.createElement('div'); box.className = 'marquee'; stage.appendChild(box);
  const base = new Set(selectedIds());
  const onMove = e => {
    const x = (e.clientX - rect.left) * f, y = (e.clientY - rect.top) * f;
    const l = Math.min(ox, x), t = Math.min(oy, y), w = Math.abs(x - ox), h = Math.abs(y - oy);
    box.style.cssText = `left:${l}px;top:${t}px;width:${w}px;height:${h}px`;
    const hit = currentSlide().blocks.filter(b =>
      b.x < l + w && b.x + b.w > l && b.y < t + h && b.y + b.h > t).map(b => b.id);
    const ids = new Set(add ? base : []); hit.forEach(id => ids.add(id));
    mutate(() => setMulti([...ids]));
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    box.remove();
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}
export const factor = () => state.deck.size.w / stage.getBoundingClientRect().width;
export function startDrag(ev, b, el) {
  if (el.classList.contains('editing')) {
    if (ev.target.closest('.rich, model-viewer, iframe, .tbl, .code')) return; // over the content: keep editing
    exitEdit(el);                                          // grabbed the frame: leave edit and move
  }
  ev.stopPropagation();

  // Shift‑click toggles the block in the selection without moving it.
  if (ev.shiftKey) { commit(() => toggleSelection(b.id), { history: false }); return; }
  // A plain click on an unselected block selects just it; clicking one that is
  // already part of a multi‑selection keeps the group so it can be moved together.
  if (!isSelected(b.id)) commit(() => selectWithGroup(b.id), { history: false });
  if (b.locked || b.type === 'connector' || readOnly()) return;   // selected but not movable

  const movers = selectedBlocks().filter(m => m.type !== 'connector');
  const origins = new Map(movers.map(m => [m.id, { x: m.x, y: m.y }]));
  const f = factor(), sx = ev.clientX, sy = ev.clientY, ox = b.x, oy = b.y;
  try { el.setPointerCapture(ev.pointerId); } catch {} el.classList.add('dragging');
  const onMove = e => {
    const rawx = Math.round(ox + (e.clientX - sx) * f);
    const rawy = Math.round(oy + (e.clientY - sy) * f);
    const snapped = movers.length > 1 ? { x: rawx, y: rawy } : applySnap(b, rawx, rawy);
    const dx = snapped.x - ox, dy = snapped.y - oy;
    for (const m of movers) {
      const o = origins.get(m.id); m.x = o.x + dx; m.y = o.y + dy;
      const mel = stage.querySelector(`.block[data-id="${m.id}"]`);
      if (mel) { mel.style.left = m.x + 'px'; mel.style.top = m.y + 'px'; }
    }
  };
  const onUp = () => {
    try { el.releasePointerCapture(ev.pointerId); } catch {} el.classList.remove('dragging');
    el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp);
    clearGuides();
    commit(() => {});                       // one undo step per drag (none if it didn't move)
  };
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp);
}
export function startRotate(ev, b, el) {
  ev.stopPropagation();
  if (b.locked || readOnly()) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const base = b.rotation || 0;
  const start = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  try { el.setPointerCapture?.(ev.pointerId); } catch {}
  const onMove = e => {
    const a = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    let rot = base + (a - start);
    if (e.shiftKey) rot = Math.round(rot / 15) * 15;
    b.rotation = Math.round(((rot % 360) + 360) % 360);
    el.style.transform = transformOf(b);
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
    commit(() => {});
  };
  document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}
export function startResize(ev, b, el, corner) {
  ev.stopPropagation();
  if (b.locked || readOnly()) return;
  const f = factor(), sx = ev.clientX, sy = ev.clientY, o = { x: b.x, y: b.y, w: b.w, h: b.h };
  try { el.setPointerCapture?.(ev.pointerId); } catch {}
  const ratio = o.w / o.h;
  // A rotated object is resized along its own sides, and the opposite corner
  // stays where it is on screen (the rotation is about the centre).
  const a = (b.rotation || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  // Which side the handle is on (a flipped object shows its handles mirrored).
  const sxg = (corner.includes('e') ? 1 : corner.includes('w') ? -1 : 0) * (b.flipH ? -1 : 1);
  const syg = (corner.includes('s') ? 1 : corner.includes('n') ? -1 : 0) * (b.flipV ? -1 : 1);
  const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2;
  const ax = ocx + (-sxg * o.w / 2) * cos - (-syg * o.h / 2) * sin, ay = ocy + (-sxg * o.w / 2) * sin + (-syg * o.h / 2) * cos;
  const onMove = e => {
    const dx = (e.clientX - sx) * f, dy = (e.clientY - sy) * f;
    const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;       // the drag along the object's sides
    let w = sxg ? Math.max(30, o.w + sxg * lx) : o.w, h = syg ? Math.max(20, o.h + syg * ly) : o.h;
    if (e.shiftKey) h = Math.max(20, w / ratio);                         // hold Shift to keep the aspect ratio
    w = Math.round(w); h = Math.round(h);
    const cx = ax + (sxg * w / 2) * cos - (syg * h / 2) * sin, cy = ay + (sxg * w / 2) * sin + (syg * h / 2) * cos;
    Object.assign(b, { w, h, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) });
    Object.assign(el.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });   // keep rotation/opacity
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
    commit(() => {});
  };
  document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}
// ---- Alignment guides + snapping -----------------------------------------
export function applySnap(b, x, y) {
  clearGuides();
  if (state.ui.snap === false) return { x: Math.round(x), y: Math.round(y) };  // snapping off
  const { w, h } = state.deck.size;
  const others = currentSlide().blocks.filter(o => o.id !== b.id);
  const vTargets = [w / 2, 0, w];                    // slide centre + edges (x)
  const hTargets = [h / 2, 0, h];                    // slide centre + edges (y)
  for (const o of others) { vTargets.push(o.x, o.x + o.w, o.x + o.w / 2); hTargets.push(o.y, o.y + o.h, o.y + o.h / 2); }
  (state.deck.guides?.v || []).forEach(x => vTargets.push(x));   // snap to placed guides
  (state.deck.guides?.h || []).forEach(y => hTargets.push(y));
  if (state.ui.showGuides)                                          // visible grid: 10 × 10 cells
    for (let i = 1; i < 10; i++) { vTargets.push(w * i / 10); hTargets.push(h * i / 10); }

  clearGuides();
  // Snap each axis to the single closest target (across box edges/centre and
  // every candidate line). Picking the nearest — rather than the first within
  // range — keeps centring smooth instead of jumping between guides.
  const best = (vals, targets) => {
    let win = null;
    for (const val of vals) for (const t of targets) {
      const d = Math.abs(val - t);
      if (d < SNAP && (!win || d < win.d)) win = { d, delta: t - val, at: t };
    }
    return win;
  };
  // Smart spacing: equal gaps to the neighbours in the same row / column
  // (PowerPoint's distance arrows). Wins over alignment only when closer.
  const sx = spacingSnap(b, x, y, others, 'x'), sy = spacingSnap(b, x, y, others, 'y');
  const bv = best([x, x + b.w / 2, x + b.w], vTargets);
  if (sx && (!bv || sx.d < bv.d)) { x = sx.val; drawSpacing('x', sx.marks, y + b.h / 2); }
  else if (bv) { x += bv.delta; drawGuide('v', bv.at); }
  const bh = best([y, y + b.h / 2, y + b.h], hTargets);
  if (sy && (!bh || sy.d < bh.d)) { y = sy.val; drawSpacing('y', sy.marks, x + b.w / 2); }
  else if (bh) { y += bh.delta; drawGuide('h', bh.at); }
  return { x: Math.round(x), y: Math.round(y) };
}
// Candidate positions (left/top edge) that repeat a gap already present between
// two neighbours, or centre the object between two of them.
export function spacingSnap(b, x, y, others, axis) {
  const X = axis === 'x', pos = X ? x : y, size = X ? b.w : b.h;
  const lo = o => (X ? o.x : o.y), len = o => (X ? o.w : o.h);
  const cross = o => (X ? o.y < y + b.h && o.y + o.h > y : o.x < x + b.w && o.x + o.w > x);
  const row = others.filter(o => o.type !== 'connector' && cross(o)).sort((a, c) => lo(a) - lo(c));
  const gaps = [];
  for (let i = 0; i < row.length - 1; i++) {
    const g = lo(row[i + 1]) - (lo(row[i]) + len(row[i]));
    if (g > 0) gaps.push({ g, seg: [lo(row[i]) + len(row[i]), lo(row[i + 1])] });
  }
  const cands = [];
  for (const { g, seg } of gaps) for (const o of row) {
    const r = lo(o) + len(o);
    cands.push({ val: r + g, marks: [seg, [r, r + g]] });                  // after o, same gap
    cands.push({ val: lo(o) - g - size, marks: [seg, [lo(o) - g, lo(o)]] }); // before o, same gap
  }
  for (let i = 0; i < row.length - 1; i++) {                               // centred between two
    const a = lo(row[i]) + len(row[i]), c = lo(row[i + 1]), g = (c - a - size) / 2;
    if (g > 0) cands.push({ val: a + g, marks: [[a, a + g], [c - g, c]] });
  }
  let win = null;
  for (const c of cands) { const d = Math.abs(c.val - pos); if (d < SNAP && (!win || d < win.d)) win = { ...c, d }; }
  return win;
}
export function drawSpacing(axis, marks, at) {
  for (const [a, c] of marks) {
    const g = document.createElement('div');
    g.className = 'guide spacing ' + axis;
    if (axis === 'x') g.style.cssText = `left:${a}px;width:${c - a}px;top:${at}px`;
    else g.style.cssText = `top:${a}px;height:${c - a}px;left:${at}px`;
    g.dataset.gap = Math.round(c - a);
    stage.appendChild(g);
  }
}
export function drawGuide(dir, at) {
  const g = document.createElement('div');
  g.className = 'guide ' + dir;
  if (dir === 'v') g.style.left = at + 'px'; else g.style.top = at + 'px';
  stage.appendChild(g);
}
export function clearGuides() { stage.querySelectorAll('.guide').forEach(g => g.remove()); }
// ---- Keyboard nudging ------------------------------------------------------
export function nudge(dx, dy) {
  const bs = selectedBlocks().filter(b => b.type !== 'connector'); if (!bs.length) return;
  commit(() => { for (const b of bs) { b.x += dx; b.y += dy; } });
}
