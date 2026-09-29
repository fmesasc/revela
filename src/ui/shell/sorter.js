// Slide sorter (PowerPoint's "Slide Sorter", Google Slides' grid view): every
// slide in a grid over the editing area, to reorder them by dragging, and to
// duplicate, hide or delete them. It is the slides panel itself, laid out big:
// the same thumbnails, sections, drag and context menu. Double-click (or Enter,
// or Esc) goes back to editing the chosen slide.

import { state, commit } from '../../core/store.js';
import { fitZoom } from '../ribbon/zoom.js';

export const sorterOn = () => document.body.classList.contains('sorter');

export function setSorter(on) {
  if (on === sorterOn()) return;
  document.body.classList.toggle('sorter', on);
  document.querySelectorAll('[data-action="slide-sorter"]').forEach(b => b.classList.toggle('on', on));
  if (on && state.ui.selection) commit(() => { state.ui.selection = null; state.ui.multi = []; }, { history: false });
  requestAnimationFrame(() => {
    if (on) document.querySelector('#navigator .thumb.active')?.scrollIntoView?.({ block: 'nearest' });
    else fitZoom();
  });
}

// Columns in the grid now (for the up and down arrows).
export function sorterColumns() {
  const thumbs = [...document.querySelectorAll('#navigator .thumb')];
  if (!thumbs.length) return 1;
  const top = thumbs[0].offsetTop;
  return Math.max(1, thumbs.filter(t => t.offsetTop === top).length);
}
