// Slide and section operations.

import { state, commit, currentSlide, clampSlide } from '../core/store.js';
import { blankSlide, uid } from '../core/model.js';

export function addSlide() {
  const base = currentSlide();
  commit(() => {
    const s = blankSlide(base ? base.background : '#101317', base ? base.sectionId : null);
    state.deck.slides.splice(state.ui.slideIndex + 1, 0, s);
    state.ui.slideIndex++;
    state.ui.selection = null;
  });
}

export function duplicateSlide() {
  commit(() => {
    const copy = structuredClone(currentSlide());
    copy.id = uid();
    copy.blocks.forEach(b => (b.id = uid()));
    state.deck.slides.splice(state.ui.slideIndex + 1, 0, copy);
    state.ui.slideIndex++;
    state.ui.selection = null;
  });
}

export function deleteSlide(index = state.ui.slideIndex) {
  commit(() => {
    if (state.deck.slides.length === 1) state.deck.slides[0].blocks = [];
    else state.deck.slides.splice(index, 1);
    state.ui.selection = null;
    clampSlide();
  });
}

// Move a slide from one position to another (used by drag‑reorder in the panel).
export function moveSlide(from, to) {
  if (from === to || from < 0 || to < 0) return;
  commit(() => {
    const [s] = state.deck.slides.splice(from, 1);
    state.deck.slides.splice(to, 0, s);
    state.ui.slideIndex = to;
  });
}

export function goToSlide(index) {
  commit(() => { state.ui.slideIndex = index; state.ui.selection = null; }, { history: false });
}

// ---- Sections -------------------------------------------------------------
export function addSection(name = 'Sección') {
  commit(() => {
    const id = uid();
    state.deck.sections.push({ id, name });
    // The current slide (and the ones after it until the next section) join it.
    currentSlide().sectionId = id;
  });
}

export function renameSection(id, name) {
  commit(() => { const sec = state.deck.sections.find(s => s.id === id); if (sec) sec.name = name; });
}

export function setSlideSection(slideId, sectionId) {
  commit(() => { const s = state.deck.slides.find(x => x.id === slideId); if (s) s.sectionId = sectionId; });
}
