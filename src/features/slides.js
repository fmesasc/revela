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

// Hidden slides stay in the editor but are skipped during the presentation.
export function toggleSlideHidden(index = state.ui.slideIndex) {
  commit(() => { const s = state.deck.slides[index]; if (s) s.hidden = !s.hidden; });
}

// ---- Sections -------------------------------------------------------------
// Start a section at `index`: the slide there and the contiguous run that
// currently shares its section join the new one (matching PowerPoint, where a
// section spans until the next section begins). Returns the new section id and
// flags it for inline renaming.
export function addSectionAt(index = state.ui.slideIndex, name = 'Sección sin título') {
  const id = uid();
  commit(() => {
    state.deck.sections.push({ id, name });
    const slides = state.deck.slides;
    const from = slides[index].sectionId;
    for (let i = index; i < slides.length; i++) {
      if (i > index && slides[i].sectionId !== from) break;
      slides[i].sectionId = id;
    }
    state.ui.editingSection = id;      // the panel focuses its title for renaming
  });
  return id;
}

export function addSection(name = 'Sección') { return addSectionAt(state.ui.slideIndex, name); }

export function renameSection(id, name) {
  commit(() => {
    const sec = state.deck.sections.find(s => s.id === id);
    if (sec) sec.name = name || 'Sección sin título';
    state.ui.editingSection = null;
  });
}

export function removeSection(id) {
  commit(() => {
    state.deck.sections = state.deck.sections.filter(s => s.id !== id);
    for (const s of state.deck.slides) if (s.sectionId === id) s.sectionId = null;
  });
}

export function setSlideSection(slideId, sectionId) {
  commit(() => { const s = state.deck.slides.find(x => x.id === slideId); if (s) s.sectionId = sectionId; });
}
