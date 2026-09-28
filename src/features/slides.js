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

// Deep copy of a slide with fresh ids; connectors and groups are remapped so
// they point at the copies, not at the blocks of the original slide.
export function cloneSlide(src) {
  const copy = structuredClone(src);
  copy.id = uid(); copy.blocks = copy.blocks || [];
  const ids = new Map(), groups = new Map();
  copy.blocks.forEach(b => { const n = uid(); ids.set(b.id, n); b.id = n; });
  copy.blocks.forEach(b => {
    if (b.type === 'connector') { b.from = ids.get(b.from) || b.from; b.to = ids.get(b.to) || b.to; }
    if (b.groupId) { if (!groups.has(b.groupId)) groups.set(b.groupId, uid()); b.groupId = groups.get(b.groupId); }
  });
  return copy;
}

export function duplicateSlide() {
  commit(() => {
    const copy = cloneSlide(currentSlide());
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
// Advanced background: fit of the image (cover / contain / tile), opacity,
// video or web page behind the slide, and the background's own transition.
export function setBackgroundOptions(props, all = false) {
  commit(() => {
    const apply = s => {
      for (const [k, v] of Object.entries(props)) { if (v === '' || v == null || v === false && k !== 'bgVideoLoop' && k !== 'bgVideoMuted') delete s[k]; else s[k] = v; }
      if (props.bgFit && /url\(/.test(s.background || '')) {
        const u = /url\([^)]*\)/.exec(s.background)[0];
        s.background = props.bgFit === 'tile' ? `${u} top left / auto repeat` : `${u} center / ${props.bgFit} no-repeat`;
      }
    };
    (all ? state.deck.slides : [currentSlide()]).forEach(apply);
  });
}
// Vertical stack (reveal.js vertical slides): below the previous slide.
export function toggleVertical(index = state.ui.slideIndex) {
  if (index <= 0) return;
  commit(() => { const s = state.deck.slides[index]; if (s) { if (s.vertical) delete s.vertical; else s.vertical = true; } });
}
export function toggleSlideHidden(index = state.ui.slideIndex) {
  commit(() => { const s = state.deck.slides[index]; if (s) s.hidden = !s.hidden; });
}

// Reuse slides: insert (copies of) slides from another deck after the current one.
// Sections of the other deck are not imported; the slides join the current section.
export function importSlides(deck, indices = null) {
  const src = (deck && Array.isArray(deck.slides)) ? deck.slides : [];
  const pick = indices ? indices.map(i => src[i]).filter(Boolean) : src;
  if (!pick.length) return 0;
  const sec = currentSlide()?.sectionId || null;
  commit(() => {
    // A deck of another size (4:3 vs 16:9) is scaled to fit this one.
    const from = deck.size || state.deck.size, to = state.deck.size;
    const sx = to.w / from.w, sy = to.h / from.h, sf = Math.min(sx, sy);
    const copies = pick.map(s => {
      const c = cloneSlide(s); c.sectionId = sec;
      if (sx !== 1 || sy !== 1) for (const b of c.blocks) {
        b.x = Math.round(b.x * sx); b.y = Math.round(b.y * sy); b.w = Math.round(b.w * sx); b.h = Math.round(b.h * sy);
        if (b.fontSize) b.fontSize = Math.round(b.fontSize * sf);
      }
      return c;
    });
    state.deck.slides.splice(state.ui.slideIndex + 1, 0, ...copies);
    state.ui.slideIndex += 1; state.ui.selection = null; state.ui.multi = [];
  });
  return pick.length;
}

// Auto‑Animate (Morph): reveal morphs matching objects between two adjacent
// slides that both have it on. `toggle` flips the flag on the current slide.
export function toggleAutoAnimate(index = state.ui.slideIndex) {
  commit(() => { const s = state.deck.slides[index]; if (s) s.autoAnimate = !s.autoAnimate; });
}
// Duplicate the slide KEEPING block ids so the copy morphs from the original,
// and turn Auto‑Animate on for both. Then the user tweaks the copy.
export function duplicateForAnimate() {
  commit(() => {
    const cur = currentSlide(); cur.autoAnimate = true;
    const copy = structuredClone(cur); copy.id = uid(); copy.autoAnimate = true; // block ids kept → they match
    state.deck.slides.splice(state.ui.slideIndex + 1, 0, copy);
    state.ui.slideIndex++; state.ui.selection = null;
  });
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
