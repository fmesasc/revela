// A gentle suggestion: when a slide shares objects with the one before it and
// some of them change (moved, resized, recoloured…), offer "Transformar" so
// they glide instead of jumping. Only a suggestion; "No, gracias" is remembered
// for that slide.

import { state, commit, currentSlide } from '../../core/store.js';
import { sharedChanges } from '../../features/animation/morph.js';
import { toggleAutoAnimate } from '../../features/document/slides.js';

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
  el.hidden = !s || s.autoAnimate || s.morphHint === false || !!state.ui.editMaster || sharedChanges(state.deck, state.ui.slideIndex) === 0;
}
