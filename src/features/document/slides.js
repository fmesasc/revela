// Slide and section operations.

import { state, commit, currentSlide, clampSlide, selectedSlideIndices, targetSlides, setSlideSel } from '../../core/store.js';
import { blankSlide, uid } from '../../core/model.js';
import { ensureLayouts, newSlideBlocks, layoutBackground } from './master.js';

export function addSlide(layoutId = null) {
  const base = state.deck.slides[state.ui.slideIndex];          // (also from the master view: not the master)
  commit(() => {
    const s = blankSlide(base ? base.background : '#101317', base ? base.sectionId : null);
    // Same layout as the current slide (after a cover or section header, "Title and content").
    const lays = ensureLayouts();
    const want = layoutId || (base?.layoutId && !['title', 'section'].includes(base.layoutId) ? base.layoutId : 'titleContent');
    const lay = want && lays.find(l => l.id === want);
    if (lay) { s.layoutId = lay.id; s.blocks = newSlideBlocks(lay); s.background = layoutBackground(lay) || s.background; }   // (the layout's background, or its master's)
    state.deck.slides.splice(state.ui.slideIndex + 1, 0, s);
    state.ui.slideIndex++;
    state.ui.selection = null;
  });
}

// Deep copy of a slide with fresh ids; connectors, groups and the objects a code
// lock shows are remapped so they point at the copies, not at the blocks of the
// original slide. (copy: how — features/document/bulk.js shares the strings.)
export function cloneSlide(src, copyOf = structuredClone) {
  const copy = copyOf(src);
  copy.id = uid(); copy.blocks = copy.blocks || [];
  const ids = new Map(), groups = new Map();
  copy.blocks.forEach(b => { const n = uid(); ids.set(b.id, n); b.id = n; });
  copy.blocks.forEach(b => {
    if (b.type === 'connector') { b.from = ids.get(b.from) || b.from; b.to = ids.get(b.to) || b.to; }
    if (b.groupId) { if (!groups.has(b.groupId)) groups.set(b.groupId, uid()); b.groupId = groups.get(b.groupId); }
    if (b.type === 'lock' && Array.isArray(b.reveal)) b.reveal = b.reveal.map(r => ids.get(r) || r);
  });
  return copy;
}

// The selected slides (or the current one), copied in order right after the
// last of them; the copies become the selection.
export function duplicateSlide() {
  const idx = selectedSlideIndices(); if (!idx.length) return;
  commit(() => {
    const copies = idx.map(i => cloneSlide(state.deck.slides[i])), at = idx.at(-1) + 1;
    state.deck.slides.splice(at, 0, ...copies);
    state.ui.selection = null;
    setSlideSel(copies.map(c => c.id), at + copies.length - 1);
  });
}

// One slide (index), or the selected ones: one undo step. The last one left is
// emptied instead (a deck always has a slide).
export function deleteSlide(index = null) { deleteSlides(index == null ? selectedSlideIndices() : [index]); }
export function deleteSlides(indices = selectedSlideIndices()) {
  const d = state.deck, gone = new Set(indices.map(i => d.slides[i]?.id).filter(Boolean)); if (!gone.size) return;
  commit(() => {
    const cur = d.slides[state.ui.slideIndex]?.id, first = Math.min(...indices);
    if (gone.size >= d.slides.length) { d.slides.splice(1); d.slides[0].blocks = []; }
    else d.slides.splice(0, d.slides.length, ...d.slides.filter(s => !gone.has(s.id)));
    // (The slide on the canvas stays if it was not deleted; else the one after.)
    const keep = gone.has(cur) ? -1 : d.slides.findIndex(s => s.id === cur);
    state.ui.slideIndex = keep >= 0 ? keep : Math.min(first, d.slides.length - 1);
    state.ui.selection = null; state.ui.slideSel = [];
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
// Several slides (ids) dropped on the slide at `to`: they go together, in their
// order, after it when moving down and before it when moving up.
export function moveSlides(ids, to) {
  const d = state.deck, set = new Set(ids), group = d.slides.filter(s => set.has(s.id)), target = d.slides[to];
  if (!group.length || !target || set.has(target.id)) return;
  const down = to > d.slides.indexOf(group[0]);
  commit(() => {
    const cur = d.slides[state.ui.slideIndex]?.id, rest = d.slides.filter(s => !set.has(s.id));
    rest.splice(rest.indexOf(target) + (down ? 1 : 0), 0, ...group);
    d.slides.splice(0, d.slides.length, ...rest);
    state.ui.slideIndex = Math.max(0, rest.findIndex(s => s.id === cur));
  });
}

export function goToSlide(index) {
  commit(() => { state.ui.slideIndex = index; state.ui.selection = null; state.ui.slideSel = []; state.ui.slideAnchor = state.deck.slides[index]?.id || null; }, { history: false });
}

// ---- Selecting slides in the panel (PowerPoint) ----------------------------------
// Click: just that one; Ctrl/Cmd+click (or a tap while picking): add or remove it;
// Shift+click: from the anchor to it. The one clicked is shown on the canvas.
export function selectSlide(index, { toggle = false, range = false } = {}) {
  const d = state.deck, s = d.slides[index]; if (!s) return;
  const u = state.ui, cur = d.slides[u.slideIndex]?.id, now = u.slideSel?.length > 1 ? u.slideSel : [cur];
  if (!toggle && !range) { goToSlide(index); return; }
  commit(() => {
    u.selection = null; u.multi = [];
    if (range) {
      const a = Math.max(0, d.slides.findIndex(x => x.id === (u.slideAnchor || cur)));
      const ids = d.slides.slice(Math.min(a, index), Math.max(a, index) + 1).map(x => x.id);
      if (!u.slideAnchor) u.slideAnchor = cur;
      setSlideSel(toggle ? [...new Set([...now, ...ids])] : ids, index);
      return;
    }
    u.slideAnchor = s.id;
    if (!now.includes(s.id)) { setSlideSel([...now, s.id], index); return; }
    // Off: the canvas shows the last one still selected.
    const left = now.filter(id => id !== s.id); if (!left.length) return;
    const show = s.id === cur ? d.slides.findIndex(x => x.id === left.at(-1)) : u.slideIndex;
    setSlideSel(left, show);
  }, { history: false });
}
export function selectAllSlides() {
  commit(() => { state.ui.selection = null; state.ui.multi = []; setSlideSel(state.deck.slides.map(s => s.id)); }, { history: false });
}
// Shift+↑/↓: grow or shrink the range from the anchor by one slide.
export function extendSlideSel(dir) {
  const i = Math.max(0, Math.min(state.deck.slides.length - 1, state.ui.slideIndex + dir));
  if (i !== state.ui.slideIndex) selectSlide(i, { range: true });
}
export function collapseSlideSel() {
  if (state.ui.slideSel?.length || state.ui.slidePick) commit(() => { state.ui.slideSel = []; state.ui.slidePick = false; }, { history: false });
}

// ---- Cut, copy and paste slides --------------------------------------------------
let slideClip = null;                 // { size, slides } copied in this tab
export const hasSlideClip = () => !!slideClip?.slides.length;
export function copySlides(indices = selectedSlideIndices()) {
  if (state.ui.noCopy) return 0;                         // (shared without copies)
  const list = indices.map(i => state.deck.slides[i]).filter(Boolean);
  if (list.length) slideClip = { size: { ...state.deck.size }, slides: structuredClone(list) };
  return list.length;
}
export function cutSlides() { const idx = selectedSlideIndices(); if (copySlides(idx)) deleteSlides(idx); }
// After the last selected slide; the pasted ones become the selection.
export function pasteSlides() {
  if (!hasSlideClip()) return 0;
  return importSlides(slideClip, null, selectedSlideIndices().at(-1) ?? state.ui.slideIndex);
}

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
    (all ? state.deck.slides : targetSlides()).forEach(apply);
  });
}
// Vertical stack (reveal.js vertical slides): below the previous slide.
// (Without an index: the selected slides, following the current one.)
const slidesAt = index => (index == null ? selectedSlideIndices() : [index]).map(i => state.deck.slides[i]).filter(Boolean);
export function toggleVertical(index = null) {
  const ss = slidesAt(index).filter(s => state.deck.slides.indexOf(s) > 0); if (!ss.length) return;
  const on = !state.deck.slides[index ?? state.ui.slideIndex]?.vertical;
  commit(() => ss.forEach(s => { if (on) s.vertical = true; else delete s.vertical; }));
}
// Hidden slides stay in the editor but are skipped during the presentation.
// Several: all hidden, unless all already are (then all shown).
export function toggleSlideHidden(index = null) {
  const ss = slidesAt(index), hide = ss.some(s => !s.hidden);
  commit(() => ss.forEach(s => { s.hidden = hide; }));
}

// Reuse slides: insert (copies of) slides from another deck after the current one.
// Sections of the other deck are not imported; the slides join the current section.
export function importSlides(deck, indices = null, after = state.ui.slideIndex) {
  const src = (deck && Array.isArray(deck.slides)) ? deck.slides : [];
  const pick = indices ? indices.map(i => src[i]).filter(Boolean) : src;
  if (!pick.length) return 0;
  const sec = state.deck.slides[after]?.sectionId || null;
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
    state.deck.slides.splice(after + 1, 0, ...copies);
    state.ui.selection = null; state.ui.multi = [];
    setSlideSel(copies.map(c => c.id), after + 1);
  });
  return pick.length;
}

// Auto‑Animate (Morph): reveal morphs matching objects between two adjacent
// slides that both have it on. `toggle` flips the flag on the current slide.
export function toggleAutoAnimate(index = null) {
  const ss = slidesAt(index), on = !state.deck.slides[index ?? state.ui.slideIndex]?.autoAnimate;
  // (Morph is the slide's transition: on, it replaces the one it had, whose direction and speed no longer apply.)
  commit(() => ss.forEach(s => { s.autoAnimate = on; if (on) { s.transition = null; delete s.transitionDir; delete s.transitionSpeed; } else delete s.morphBy; }));
}
// Morph by objects (default), words or characters (PowerPoint's Morph options):
// with words/characters, the same word or letter moves from its place on the
// previous slide to its place on this one.
export function setMorphBy(by, index = null) {
  const ss = slidesAt(index);
  commit(() => ss.forEach(s => { if (by === 'words' || by === 'chars') { s.morphBy = by; s.autoAnimate = true; s.transition = null; delete s.transitionDir; delete s.transitionSpeed; } else delete s.morphBy; }));
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
// Several slides into a section (null: out of any): they join the end of the
// section's slides (or gather where the first one is), so it stays in one piece.
export function moveSlidesToSection(ids, sectionId) {
  commit(() => regroup(ids, sectionId));
}
// A new section made of the selected slides (PowerPoint: Add Section on a selection).
export function sectionFromSlides(ids, name = 'Sección sin título') {
  const id = uid();
  commit(() => { state.deck.sections.push({ id, name }); regroup(ids, id); state.ui.editingSection = id; });
  return id;
}
function regroup(ids, sectionId) {
  const d = state.deck, set = new Set(ids), group = d.slides.filter(s => set.has(s.id)); if (!group.length) return;
  const cur = d.slides[state.ui.slideIndex]?.id;
  group.forEach(s => { s.sectionId = sectionId; });
  if (!sectionId) return;
  const rest = d.slides.filter(s => !set.has(s.id)), lastIn = rest.findLastIndex(s => s.sectionId === sectionId);
  rest.splice(lastIn >= 0 ? lastIn + 1 : d.slides.indexOf(group[0]), 0, ...group);
  d.slides.splice(0, d.slides.length, ...rest);
  state.ui.slideIndex = Math.max(0, d.slides.findIndex(s => s.id === cur));
}

// Where each slide is (as Pitch's workflow status): in progress, to review, done — and who it's assigned to, for a
// deck made by several people. Only in the editor (its thumbnail): never in the presentation.
export const SLIDE_STATUS = { doing: 'En curso', review: 'Para revisar', done: 'Terminada' };
export function setSlideStatus(ids, status) {
  commit(() => { for (const s of state.deck.slides) if (ids.includes(s.id)) { if (SLIDE_STATUS[status]) s.status = status; else delete s.status; } });
}
export function setSlideOwner(ids, who) {
  const v = String(who || '').trim().slice(0, 80);
  commit(() => { for (const s of state.deck.slides) if (ids.includes(s.id)) { if (v) s.owner = v; else delete s.owner; } });
}
