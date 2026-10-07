// Cropping a picture on the slide (double-click it, or Imagen ▸ Recortar), as in PowerPoint: the whole picture
// shows faint, the frame on it bright with eight handles — its edges and corners (Shift: keeping its shape) —, and
// dragging inside the frame moves it over the picture. Enter, a double-click or a click outside keeps it; Esc leaves
// it as it was. What it does with the result: features/document/crop.js.
//
// It's drawn over the picture, on the stage (in the box's own coordinates, turned and flipped as the box is), and
// it ends by itself if the slide is redrawn under it (another slide, undo…).
import { selectedBlock } from '../../core/store.js';
import { canCropOnSlide, cropStart, applyCrop } from '../../features/document/crop.js';
import { stage, readOnly, transformOf } from './canvas.js';
import { factor } from './interact.js';
import { t } from '../../i18n/index.js';

let session = null;
export const cropping = () => !!session;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'], MIN = 8;

export async function startImageCrop(b = selectedBlock()) {
  if (session || !b || b.locked || readOnly()) return false;
  if (!canCropOnSlide(b)) { (await import('../dialogs/object.js')).openImageCrop(b); return false; }
  let st; try { st = await cropStart(b); } catch { return false; }
  const block = stage.querySelector(`.block[data-id="${b.id}"]`); if (!block) return false;
  const k = factor(), D = st.D, C = { ...st.C };
  const ov = document.createElement('div');
  ov.className = 'crop-ui'; ov.title = t('Arrastra los bordes para recortar; Intro para terminar, Esc para dejarlo como estaba');
  ov.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform:${transformOf(b)};--k:${k}`;
  ov.innerHTML = `<img class="crop-ghost" alt="" draggable="false"><img class="crop-lit" alt="" draggable="false"><div class="crop-frame">${HANDLES.map(h => `<i class="crop-h ${h}" data-h="${h}"></i>`).join('')}</div>`;
  const ghost = ov.querySelector('.crop-ghost'), lit = ov.querySelector('.crop-lit'), frame = ov.querySelector('.crop-frame');
  for (const im of [ghost, lit]) { im.src = st.src; Object.assign(im.style, { left: D.x + 'px', top: D.y + 'px', width: D.w + 'px', height: D.h + 'px', filter: block.querySelector('img')?.style.filter || '' }); }
  const paint = () => {
    Object.assign(frame.style, { left: C.x + 'px', top: C.y + 'px', width: C.w + 'px', height: C.h + 'px' });
    lit.style.clipPath = `inset(${C.y - D.y}px ${D.x + D.w - C.x - C.w}px ${D.y + D.h - C.y - C.h}px ${C.x - D.x}px)`;
  };
  paint();
  block.classList.add('crop-hidden'); stage.appendChild(ov); stage.classList.add('cropping');

  // A drag: the screen's movement turned into the box's own (rotation, flips, zoom).
  const a = (b.rotation || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const local = (dx, dy) => { const x = (dx * cos + dy * sin) * k, y = (-dx * sin + dy * cos) * k; return [b.flipH ? -x : x, b.flipV ? -y : y]; };
  ov.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault();
    const h = e.target.dataset?.h || (e.target.closest('.crop-frame') ? 'move' : null); if (!h) return;
    const o = { ...C }, sx = e.clientX, sy = e.clientY, ratio = o.w / o.h;
    try { ov.setPointerCapture(e.pointerId); } catch {}
    const move = ev => {
      const [dx, dy] = local(ev.clientX - sx, ev.clientY - sy);
      if (h === 'move') { C.x = Math.min(Math.max(o.x + dx, D.x), D.x + D.w - o.w); C.y = Math.min(Math.max(o.y + dy, D.y), D.y + D.h - o.h); }
      else {
        let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
        if (h.includes('w')) x0 = Math.min(Math.max(o.x + dx, D.x), x1 - MIN);
        if (h.includes('e')) x1 = Math.max(Math.min(o.x + o.w + dx, D.x + D.w), x0 + MIN);
        if (h.includes('n')) y0 = Math.min(Math.max(o.y + dy, D.y), y1 - MIN);
        if (h.includes('s')) y1 = Math.max(Math.min(o.y + o.h + dy, D.y + D.h), y0 + MIN);
        if (ev.shiftKey && h.length === 2) {                // (a corner with Shift: the frame keeps its shape, within the picture)
          const w = Math.min(x1 - x0, (y1 - y0) * ratio), hh = w / ratio;
          if (h.includes('w')) x0 = x1 - w; else x1 = x0 + w;
          if (h.includes('n')) y0 = y1 - hh; else y1 = y0 + hh;
        }
        Object.assign(C, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      }
      paint();
    };
    const up = () => { ov.removeEventListener('pointermove', move); ov.removeEventListener('pointerup', up); ov.removeEventListener('pointercancel', up); };
    ov.addEventListener('pointermove', move); ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
  });
  ov.addEventListener('dblclick', e => { e.stopPropagation(); end(true); });

  const outside = e => { if (!ov.contains(e.target)) end(true); };
  const keys = e => {
    if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false);
    else if (!['Delete', 'Backspace'].includes(e.key) && !e.key.startsWith('Arrow') && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); e.stopImmediatePropagation();      // (nothing else while cropping: not deleting it, nor undoing under it)
  };
  const gone = new MutationObserver(() => { if (!ov.isConnected) end(false); });
  gone.observe(stage, { childList: true });
  window.addEventListener('keydown', keys, true);
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
  async function end(keep) {
    if (session !== me) return; session = null;
    gone.disconnect(); window.removeEventListener('keydown', keys, true); document.removeEventListener('pointerdown', outside, true);
    ov.remove(); block.classList.remove('crop-hidden'); stage.classList.remove('cropping');
    if (keep) await applyCrop(b.id, { src: st.src, D, C });
  }
  const me = { end, id: b.id, C, D, paint }; session = me;
  return true;
}
export const endImageCrop = (keep = true) => session?.end(keep);
// (For the tests: the frame and the whole picture, in the box's own coordinates; changing C and calling paint
// is as dragging.)
export const cropSession = () => session;
