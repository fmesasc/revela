// A gentle suggestion: when a slide shares objects with the one before it and
// some of them change (moved, resized, recoloured…), offer "Transformar" so
// they glide instead of jumping. Only a suggestion; "No, gracias" is remembered
// for that slide.

import { state, commit, currentSlide } from '../../core/store.js';
import { morphSig } from '../../io/formats/html.js';
import { toggleAutoAnimate } from '../../features/document/slides.js';

// Objects of the slide that are also on the previous one, and changed.
export function sharedChanges(deck = state.deck, index = state.ui.slideIndex) {
  const vis = deck.slides.filter(s => !s.hidden), s = deck.slides[index], i = vis.indexOf(s), prev = vis[i - 1];
  if (!s || !prev) return 0;
  const sig = b => morphSig(b), look = b => [b.x, b.y, b.w, b.h, b.rotation || 0, b.fill, b.color, b.fontSize, b.opacity].join();
  let n = 0;
  for (const b of s.blocks) {
    const p = prev.blocks.find(x => x.id === b.id) || prev.blocks.find(x => sig(x) === sig(b) && sig(b).length > b.type.length + 2);
    if (p && look(p) !== look(b)) n++;
  }
  return n;
}
let wired = false;
export function renderMorphHint() {
  const el = document.getElementById('morph-hint'); if (!el) return;
  if (!wired) {
    wired = true;
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-mh]')?.dataset.mh; if (!a) return;
      if (a === 'on') toggleAutoAnimate(); else commit(() => { currentSlide().morphHint = false; });
    });
  }
  const s = currentSlide();
  el.hidden = !s || s.autoAnimate || s.morphHint === false || !!state.ui.editMaster || sharedChanges() === 0;
}
