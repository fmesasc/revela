// Slide master (PowerPoint/OnlyOffice "Slide Master", Google Slides "Edit
// theme"): objects placed on the master appear behind the content of every
// slide, unless a slide hides them. While editing the master, the canvas edits
// deck.master instead of the current slide (see store.currentSlide).
//
// Placeholders: text boxes with `ph` (title / subtitle / body) show a prompt
// while empty in the editor and are left out of every export while empty.

import { state, commit } from '../core/store.js';

export const ensureMaster = (deck = state.deck) => (deck.master ||= { id: 'master', blocks: [], background: null });

export function toggleMasterEdit(on = !state.ui.editMaster) {
  commit(() => { ensureMaster(); state.ui.editMaster = on; state.ui.selection = null; state.ui.multi = []; }, { history: false });
}
export function toggleHideMaster(index = state.ui.slideIndex) {
  commit(() => { const s = state.deck.slides[index]; if (s) s.hideMaster = !s.hideMaster; });
}
// Master objects to draw under a slide.
export const masterBlocksFor = (slide, deck = state.deck) => (slide && !slide.hideMaster && deck.master?.blocks) || [];

export const PH_PROMPT = { title: 'Haz clic para añadir un título', subtitle: 'Haz clic para añadir un subtítulo', body: 'Haz clic para añadir texto' };
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); };
// An empty placeholder: nothing typed yet (no text, no image/equation inside).
export const isEmptyPlaceholder = b => !!(b.type === 'text' && b.ph && !plain(b.html) && !/<(img|svg|math)/i.test(b.html || ''));
