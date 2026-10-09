// «Cambiar imagen» (PowerPoint's Change Picture, Canva's drop-to-replace): another picture in the same object.
// Everything that belongs to the object stays — place, size, turn, crop or fit, border and corrections,
// animations, links, its alt text —; what described the old picture goes (its uncropped original, focus point,
// AI caption, stock credit), so nothing speaks of a picture that isn't there any more. Nothing is asked.
import { commit, setSelection, currentSlide } from '../../core/store.js';
import { shrinkImage } from './imgshrink.js';

// What only made sense for the old picture.
const OLD = ['uncropped', 'aiCaption', 'focusX', 'focusY', 'credit'];

// → whether it was replaced. extra: what comes with the new picture (a stock photo's credit and caption, its title as alt).
export function replaceImage(id, src, extra = {}) {
  let b = null;
  commit(() => {
    b = currentSlide()?.blocks.find(x => x.id === id); if (!b || b.type !== 'image' || b.locked) { b = null; return; }
    // Cropped on the slide (the kept part became a picture of its own, fit «fill»): the new one fills the same
    // frame instead of being stretched into the old picture's proportion.
    if (b.uncropped && b.fit === 'fill') b.fit = 'cover';
    const stock = !!b.credit;                                       // (its caption was the old photo's credit)
    for (const k of OLD) delete b[k];
    b.src = src;
    if (stock) delete b.caption;
    if (extra.credit) b.credit = extra.credit;
    if (extra.caption && !b.caption) b.caption = extra.caption;
    if (extra.alt && !b.alt && !b.decorative) b.alt = extra.alt;      // (one written by hand stays)
    setSelection(id);
  });
  if (!b) return false;
  // (A big one gets smaller in a moment, as when inserted: blocks.js addImage.)
  shrinkImage(src).then(small => { if (small && b.src === src) commit(() => { b.src = small; }, { history: false }); }).catch(() => {});
  return true;
}
