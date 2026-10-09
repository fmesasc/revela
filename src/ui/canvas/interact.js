// Direct manipulation on the canvas: move, rotate and resize with the pointer,
// alignment guides and snapping, ruler guides, marquee selection and nudging.

import { state, commit, mutate, currentSlide, selectedBlocks, selectedIds, isSelected, setSelection, toggleSelection, setMulti, selectWithGroup } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { exitEdit } from './content.js';
import { readOnly, stage, transformOf } from './canvas.js';
import { paintMagnify } from './magnifyview.js';
import { sourceToBox } from '../../features/document/magnify.js';
import { duplicateMoved } from '../../features/document/blocks.js';

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
  const origins = new Map(movers.map(m => [m.id, { x: m.x, y: m.y, s: m.source && { ...m.source } }]));
  // Several objects snap as one box (PowerPoint, Figma): the selection's bounds. The lines to
  // snap to are gathered once here, not on every move: the rest of the slide stays put meanwhile.
  const box = boundsOf(movers), T = snapTargets(new Set(movers.map(m => m.id)));
  const f = factor(), sx = ev.clientX, sy = ev.clientY;
  // Alt+drag (Option on a Mac) drags a copy and leaves the original where it was, as in Keynote
  // and Figma (PowerPoint's Ctrl+drag): a still picture of it stays behind meanwhile.
  const dup = ev.altKey; let ghosts = null, dx = 0, dy = 0;
  try { el.setPointerCapture(ev.pointerId); } catch {} el.classList.add('dragging'); el.classList.toggle('dup', dup);
  const onMove = e => {
    const rawx = Math.round(box.x + (e.clientX - sx) * f);
    const rawy = Math.round(box.y + (e.clientY - sy) * f);
    const snapped = applySnap(box, rawx, rawy, T);
    dx = snapped.x - box.x; dy = snapped.y - box.y;
    if (dup && !ghosts && (dx || dy)) ghosts = movers.map(m => ghostOf(stage.querySelector(`.block[data-id="${m.id}"]`))).filter(Boolean);
    for (const m of movers) {
      const o = origins.get(m.id); m.x = o.x + dx; m.y = o.y + dy;
      const mel = stage.querySelector(`.block[data-id="${m.id}"]`);
      if (mel) { mel.style.left = m.x + 'px'; mel.style.top = m.y + 'px'; }
      // A magnifier: moved with others, its area goes with them; alone, only its box (the lines follow).
      if (m.type === 'magnify') { if (movers.length > 1 && o.s) m.source = { ...o.s, x: o.s.x + dx, y: o.s.y + dy }; if (mel) paintMagnify(mel, m); }
    }
  };
  const onUp = () => {
    try { el.releasePointerCapture(ev.pointerId); } catch {} el.classList.remove('dragging', 'dup');
    el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp);
    clearGuides(); ghosts?.forEach(g => g.remove());
    if (dup && (dx || dy)) { duplicateMoved(movers, origins); return; }   // (one undo step: the copy where it was dropped)
    commit(() => {});                       // one undo step per drag (none if it didn't move)
  };
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp);
}
// What an Alt+drag leaves behind while it lasts: a still copy of the object (no live frames or players in it).
function ghostOf(mel) {
  if (!mel) return null;
  const g = mel.cloneNode(true); g.classList.remove('selected', 'dragging', 'dup'); g.classList.add('dup-ghost'); g.removeAttribute('data-id');
  g.querySelectorAll('iframe, model-viewer, video, audio').forEach(n => { const d = document.createElement('div'); d.style.cssText = 'width:100%;height:100%;background:#8884'; n.replaceWith(d); });
  mel.before(g); return g;
}
export const boundsOf = bs => {
  const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y));
  return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y };
};
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
  const ratio = o.w / o.h, pic = b.type === 'image' && !b.device, mag = b.type === 'magnify';
  // A rotated object is resized along its own sides, and the opposite corner
  // stays where it is on screen (the rotation is about the centre).
  const a = (b.rotation || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  // Which side the handle is on (a flipped object shows its handles mirrored).
  const sxg = (corner.includes('e') ? 1 : corner.includes('w') ? -1 : 0) * (b.flipH ? -1 : 1);
  const syg = (corner.includes('s') ? 1 : corner.includes('n') ? -1 : 0) * (b.flipV ? -1 : 1);
  const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2;
  const ax = ocx + (-sxg * o.w / 2) * cos - (-syg * o.h / 2) * sin, ay = ocy + (-sxg * o.w / 2) * sin + (-syg * o.h / 2) * cos;
  // Snapping while resizing, for an object that isn't turned (a turned one's sides aren't on the
  // lines): gathered once, as for a drag. Not a magnifier, whose box follows its area's shape.
  const T = !mag && !((b.rotation || 0) % 360) ? snapTargets(new Set([b.id])) : null;
  const sizes = T && { x: [], y: [] };
  if (T) for (const s of T.others) if (s.type !== 'connector') { sizes.x.push({ len: s.w, b: s }); sizes.y.push({ len: s.h, b: s }); }
  const onMove = e => {
    const dx = (e.clientX - sx) * f, dy = (e.clientY - sy) * f;
    const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;       // the drag along the object's sides
    let w = sxg ? Math.max(30, o.w + sxg * lx) : o.w, h = syg ? Math.max(20, o.h + syg * ly) : o.h;
    // Keeping the proportion: Shift; for a picture, its corners do it (Shift frees them), as
    // in PowerPoint. A picture's side handle stretches it: a whole one ("contain") is
    // drawn deformed then ("fill"), so the box and the picture stay the same.
    // A magnifier keeps the proportion of its area from any handle (Shift: the area takes the box's).
    const keep = mag ? !e.shiftKey : pic && sxg && syg ? !e.shiftKey : e.shiftKey;
    if (keep) {
      if (!syg) h = Math.max(20, w / ratio); else if (!sxg) w = Math.max(30, h * ratio);
      else if (Math.abs(w / o.w) >= Math.abs(h / o.h)) h = Math.max(20, w / ratio); else w = Math.max(30, h * ratio);
    } else if (pic && (b.fit || 'contain') === 'contain' && Math.abs(w / h - ratio) > 0.01) {
      b.fit = 'fill'; const img = el.querySelector('img'); if (img) img.style.objectFit = 'fill';
    }
    let sw = null, sh = null;
    if (T && state.ui.snap !== false) {
      sw = sxg ? snapSide(w, ax, sxg, T.v, sizes.x, 30) : null; sh = syg ? snapSide(h, ay, syg, T.h, sizes.y, 20) : null;
      // Keeping the proportion, the closer snap leads and the other side follows it.
      if (keep) {
        if (sw && (!sh || sw.d <= sh.d)) { sh = null; w = sw.val; h = Math.max(20, w / ratio); }
        else if (sh) { sw = null; h = sh.val; w = Math.max(30, h * ratio); }
      } else { if (sw) w = sw.val; if (sh) h = sh.val; }
    }
    w = Math.round(w); h = Math.round(h);
    const cx = ax + (sxg * w / 2) * cos - (syg * h / 2) * sin, cy = ay + (sxg * w / 2) * sin + (syg * h / 2) * cos;
    Object.assign(b, { w, h, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) });
    Object.assign(el.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });   // keep rotation/opacity
    if (mag) { if (e.shiftKey) sourceToBox(b); paintMagnify(el, b); }
    if (T) {
      clearGuides();
      if (sw?.same) drawSameSize('x', [b, sw.same]); else if (sw) drawGuide('v', sw.line);
      if (sh?.same) drawSameSize('y', [b, sh.same]); else if (sh) drawGuide('h', sh.line);
    }
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
    clearGuides(); commit(() => {});
  };
  document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}
// ---- Alignment guides + snapping -----------------------------------------
// The lines an object can snap to (slide centre and edges, the other objects' edges and centres,
// placed guides, the visible grid) and its neighbours: gathered once when a drag or a resize
// begins, so that each move only compares numbers (60 fps on a crowded slide).
export function snapTargets(skip = new Set()) {
  const { w, h } = state.deck.size;
  const others = currentSlide().blocks.filter(o => !skip.has(o.id));
  const v = [w / 2, 0, w], hz = [h / 2, 0, h];         // slide centre + edges
  for (const o of others) { v.push(o.x, o.x + o.w, o.x + o.w / 2); hz.push(o.y, o.y + o.h, o.y + o.h / 2); }
  v.push(...(state.deck.guides?.v || [])); hz.push(...(state.deck.guides?.h || []));   // placed guides
  if (state.ui.showGuides)                                          // visible grid: 10 × 10 cells
    for (let i = 1; i < 10; i++) { v.push(w * i / 10); hz.push(h * i / 10); }
  return { v, h: hz, others };
}
// Snap each axis to the single closest target (across box edges/centre and every candidate
// line). Picking the nearest — rather than the first within range — keeps centring smooth
// instead of jumping between guides.
const nearest = (vals, targets) => {
  let win = null;
  for (const val of vals) for (const t of targets) {
    const d = Math.abs(val - t);
    if (d < SNAP && (!win || d < win.d)) win = { d, delta: t - val, at: t };
  }
  return win;
};
// `b` is the box being moved (one object, or the bounds of several): only its size is read.
export function applySnap(b, x, y, T = snapTargets(new Set([b.id]))) {
  clearGuides();
  if (state.ui.snap === false) return { x: Math.round(x), y: Math.round(y) };  // snapping off
  // Smart spacing: equal gaps to the neighbours in the same row / column
  // (PowerPoint's distance arrows). Wins over alignment only when closer.
  const sx = spacingSnap(b, x, y, T.others, 'x'), sy = spacingSnap(b, x, y, T.others, 'y');
  const bv = nearest([x, x + b.w / 2, x + b.w], T.v);
  if (sx && (!bv || sx.d < bv.d)) { x = sx.val; drawSpacing('x', sx.marks, y + b.h / 2); }
  else if (bv) { x += bv.delta; drawGuide('v', bv.at); }
  const bh = nearest([y, y + b.h / 2, y + b.h], T.h);
  if (sy && (!bh || sy.d < bh.d)) { y = sy.val; drawSpacing('y', sy.marks, x + b.w / 2); }
  else if (bh) { y += bh.delta; drawGuide('h', bh.at); }
  return { x: Math.round(x), y: Math.round(y) };
}
// Resizing: the side being dragged (or the centre it moves) snaps to the same lines, and the
// length to another object's same width or height (PowerPoint's and Keynote's "same size"),
// whichever is closest. `at` is the fixed side, `sign` which way the length grows from it.
function snapSide(len, at, sign, lines, sizes, min) {
  let win = null;
  const consider = (d, val, mark) => { if (d < SNAP && val >= min && (!win || d < win.d)) win = { d, val, ...mark }; };
  for (const t of lines) {
    consider(Math.abs(at + sign * len - t), sign * (t - at), { line: t });            // the side on the line
    consider(Math.abs(at + sign * len / 2 - t), 2 * sign * (t - at), { line: t });    // its centre on the line
  }
  for (const o of sizes) consider(Math.abs(o.len - len), o.len, { same: o.b });
  return win;
}
// The "same size" marker: a measure under (or beside) each object with that width (or height).
export function drawSameSize(axis, list) {
  for (const o of list) {
    const g = document.createElement('div'), n = Math.round(axis === 'x' ? o.w : o.h);
    g.className = 'guide spacing same ' + axis;
    g.style.cssText = axis === 'x' ? `left:${o.x}px;width:${o.w}px;top:${o.y + o.h + 12}px` : `top:${o.y}px;height:${o.h}px;left:${o.x + o.w + 12}px`;
    g.dataset.gap = n; g.innerHTML = `<span class="gap-label">= ${n}</span>`;
    stage.appendChild(g);
  }
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
    g.innerHTML = `<span class="gap-label">${g.dataset.gap}</span>`;   // (the distance, readable at any zoom: canvas.css)
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
  commit(() => { for (const b of bs) { b.x += dx; b.y += dy; if (b.type === 'magnify' && bs.length > 1) { b.source.x += dx; b.source.y += dy; } } });
}
