// Live previews on hover, as PowerPoint's (the transitions' is ui/ribbon/transpreview.js, the same pattern):
//  - an effect of «Añadir animación» plays on the selected object, over and over while the pointer is on it;
//  - a palette (Colores) or a font pair (Fuentes) of Design shows on the current slide.
// Nothing is changed: the slide is drawn again with the change, on a copy of only what it needs (that slide, its
// master and layouts), over the canvas; leaving the item takes it away. Not on touch screens: there a tap chooses.
import { state, currentSlide, selectedBlock } from '../../core/store.js';
import { swapPalette, swapFontPair, deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { masterBlocksFor, styled, isEmptyPlaceholder } from '../../features/document/master.js';
import { blockPreview } from '../shell/preview.js';
import { animateEl } from '../canvas/preview.js';
import { animsOf, animEditIndex } from '../../features/animation/transitions.js';
import { t } from '../../i18n/index.js';

const DELAY = 250;
let timer = null, loop = null, over = null, animEl = null;

// ---- Animations ----
// (Not the ones that need more than a look: a path to draw, a video, a 3D clip, a PDF page.)
const playable = k => !!k && !/^(pdf:|clip:|media-)/.test(k) && !['draw', 'path'].includes(k);
export function previewAnimation(effect) {
  stopAnimationPreview();
  const b = selectedBlock(), el = b && document.querySelector(`#stage .block[data-id="${b.id}"]`); if (!el || !playable(effect)) return false;
  animEl = el;
  const play = () => { if (animEl !== el || !el.isConnected) return; animateEl(el, { effect }, 700, 0); loop = setTimeout(play, 1700); };
  play(); return true;
}
// PowerPoint's «Vista previa automática»: an effect just chosen, or an option of it changed (its direction, colour,
// duration), plays once on its object — what it does is seen without looking for «Vista previa».
export function playEdited() {
  const b = selectedBlock(), el = b && document.querySelector(`#stage .block[data-id="${b.id}"]`), a = b && animsOf(b)[animEditIndex(b)];
  if (!el || !a || !playable(a.effect)) return;
  stopAnimationPreview();
  requestAnimationFrame(() => animateEl(el, a, Math.min(2500, a.duration ?? 500), 0));
}
export function stopAnimationPreview() {
  clearTimeout(loop); loop = null;
  if (animEl) { animEl.style.animation = ''; animEl.getAnimations?.().forEach(a => a.cancel()); animEl = null; }
}

// ---- Theme colours and fonts ----
// A copy of the deck light enough to change: the current slide and the masters and layouts, their objects one
// level deep (what swapPalette / swapFontPair change), never the pictures' data.
const own = list => (list || []).map(b => ({ ...b }));
const lightMaster = m => m && { ...m, blocks: own(m.blocks), styles: m.styles && structuredClone(m.styles) };
function lightDeck() {
  const d = state.deck, s = currentSlide();
  return { ...d, slides: [{ ...s, blocks: own(s.blocks) }], master: lightMaster(d.master), masters: d.masters?.map(lightMaster),
    layouts: d.layouts?.map(lightMaster), ...(d.themeTints && { themeTints: { ...d.themeTints } }) };
}
export function previewDesign({ palette = null, fontpair = null } = {}) {
  hideDesignPreview();
  const stage = document.getElementById('stage'); if (!stage || state.ui.editMaster || !currentSlide()) return null;
  const copy = lightDeck();
  if (!(palette ? swapPalette(palette, copy) : fontpair ? swapFontPair(fontpair, copy) : false)) return null;
  const s = copy.slides[0], el = document.createElement('div');
  el.id = 'design-preview'; el.className = 'design-preview'; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `background:${s.background || getComputedStyle(stage).background};color:${deckFg(copy)};font-family:${deckBodyFont(copy) || 'inherit'}`;
  for (const b of [...masterBlocksFor(s, copy), ...s.blocks.map(x => styled(x, s, copy))]) if (!isEmptyPlaceholder(b)) el.appendChild(blockPreview(b, s));
  const tag = document.createElement('span'); tag.className = 'dp-tag'; tag.textContent = t('Vista previa'); el.appendChild(tag);
  stage.appendChild(el);
  return el;
}
export function hideDesignPreview() { document.getElementById('design-preview')?.remove(); }

// Hover (delegated: the galleries are drawn when opened).
const ITEMS = '#anim-add-menu [data-add], #ribbon [data-animation], #fx-modal [data-fx], [data-palette], [data-fontpair]';
function start(btn) {
  if (btn.dataset.add != null || btn.dataset.animation || btn.dataset.fx) previewAnimation(btn.dataset.add ?? btn.dataset.animation ?? btn.dataset.fx);
  else if (btn.dataset.palette) previewDesign({ palette: btn.dataset.palette });
  else if (btn.dataset.fontpair) previewDesign({ fontpair: btn.dataset.fontpair });
}
export function endPreviews() { clearTimeout(timer); timer = null; over = null; stopAnimationPreview(); hideDesignPreview(); }
export function wireLivePreviews(root = document) {
  root.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const btn = e.target.closest?.(ITEMS); if (!btn || btn === over) return;
    endPreviews(); over = btn;
    timer = setTimeout(() => { if (over === btn && btn.isConnected) start(btn); }, DELAY);
  });
  root.addEventListener('pointerout', e => {
    const btn = e.target.closest?.(ITEMS);
    if (btn && btn === over && !btn.contains(e.relatedTarget)) endPreviews();
  });
  // Chosen (or anything else pressed): the real change, or nothing, from here on.
  root.addEventListener('pointerdown', () => endPreviews(), true);
  root.addEventListener('keydown', e => { if (e.key === 'Escape') endPreviews(); }, true);
}
