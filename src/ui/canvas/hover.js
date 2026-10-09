// What the pointer is over: a faint outline on the object a click would grab (Figma, Keynote), so
// it's clear before pressing which one it is — the whole group for a grouped object (a dashed box
// round it too), nothing for a locked one (it isn't moved; its cursor says so). Only with a mouse or
// a pen hovering, and never while dragging, drawing, cropping or typing in an object.
import { currentSlide } from '../../core/store.js';
import { stage } from './canvas.js';

let shown = [];
const clear = () => { shown.forEach(el => el.classList.remove('hover')); shown = []; stage.querySelector(':scope > .hover-group')?.remove(); };

function show(el) {
  const b = el._b, s = currentSlide(); if (!b || !s) return clear();
  const ids = b.groupId ? new Set(s.blocks.filter(x => x.groupId === b.groupId).map(x => x.id)) : new Set([b.id]);
  const els = [...stage.querySelectorAll(':scope > .block[data-id]')].filter(n => ids.has(n.dataset.id));
  if (els.length === shown.length && els.every((n, i) => n === shown[i])) return;   // (the same: nothing to redraw)
  clear(); shown = els; els.forEach(n => n.classList.add('hover'));
  if (ids.size > 1) {
    const bs = s.blocks.filter(x => ids.has(x.id)), x = Math.min(...bs.map(o => o.x)), y = Math.min(...bs.map(o => o.y));
    const g = document.createElement('div'); g.className = 'hover-group';
    g.style.cssText = `left:${x}px;top:${y}px;width:${Math.max(...bs.map(o => o.x + o.w)) - x}px;height:${Math.max(...bs.map(o => o.y + o.h)) - y}px`;
    stage.appendChild(g);
  }
}

export function initHover() {
  stage.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch' || e.buttons) return;
    const el = e.target.closest?.('#stage > .block[data-id]');
    if (!el || el.classList.contains('locked') || el.classList.contains('editing') || el.classList.contains('selected')
      || stage.querySelector(':scope > .block.dragging, :scope > .crop-ui') || stage.matches('.drawing')) return clear();
    show(el);
  });
  stage.addEventListener('pointerleave', clear);
  // Pressing starts a drag, a selection or typing: the outline has done its job.
  stage.addEventListener('pointerdown', clear, true);
}
