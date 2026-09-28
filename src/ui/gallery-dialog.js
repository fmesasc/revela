// "New from template" dialog: thumbnails of each gallery deck's cover.

import { state, replaceDeck, currentSlide } from '../core/store.js';
import { designIdeas, previewBlocks, applyIdea } from '../features/designer.js';
import { GALLERY, buildFromGallery } from '../features/gallery.js';
import { PALETTES, pairStacks, deckFg } from '../features/palettes.js';
import { ensureDeckFonts } from '../features/fonts.js';
import { blockPreview } from './preview.js';
import { confirmDialog } from './dialog.js';
import { t } from '../i18n.js';

export function openGallery() {
  document.getElementById('gallery-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'gallery-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(820px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Nueva presentación desde plantilla')}</h3>
    <div class="gal-grid"></div></div>`;
  const grid = back.querySelector('.gal-grid');
  for (const [key, g] of Object.entries(GALLERY)) {
    const deck = buildFromGallery(key), cover = deck.slides[0], p = PALETTES[g.palette];
    ensureDeckFonts(deck);
    // The cover with the template's name in the title placeholder, as a preview.
    const sample = cover.blocks.map(b => (b.ph === 'title' ? { ...b, html: t(g.name) } : b.ph === 'subtitle' ? { ...b, html: t('Subtítulo') } : b));
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gal-item'; btn.dataset.gallery = key;
    const cv = document.createElement('div'); cv.className = 'thumb-canvas'; cv.style.background = cover.background;
    const inner = document.createElement('div'); inner.className = 'thumb-inner';
    inner.style.cssText = `width:1280px;height:720px;transform:scale(${180 / 1280});color:${p.fg};font-family:${pairStacks(g.fonts).body}`;
    for (const b of [...deck.master.blocks, ...sample]) inner.appendChild(blockPreview(b));
    cv.appendChild(inner);
    const lab = document.createElement('span'); lab.textContent = t(g.name);
    btn.append(cv, lab);
    btn.addEventListener('click', () => confirmDialog(t('¿Nueva presentación? Se perderá la actual si no la has guardado.'))
      .then(ok => { if (ok) { replaceDeck(buildFromGallery(key)); back.remove(); } }));
    grid.appendChild(btn);
  }
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
}

// Design ideas for the current slide.
export function openDesignIdeas() {
  document.getElementById('ideas-modal')?.remove();
  const slide = currentSlide(), ideas = designIdeas(slide);
  const back = document.createElement('div');
  back.id = 'ideas-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(820px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Ideas de diseño')}</h3><div class="gal-grid"></div></div>`;
  const grid = back.querySelector('.gal-grid');
  if (!ideas.length) grid.outerHTML = `<p class="host-help">${t('Escribe un título en la diapositiva para recibir ideas de diseño.')}</p>`;
  const { w, h } = state.deck.size;
  ideas.forEach(idea => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gal-item';
    const cv = document.createElement('div'); cv.className = 'thumb-canvas'; cv.style.background = slide.background; cv.style.setProperty('--ar', w / h);
    const inner = document.createElement('div'); inner.className = 'thumb-inner';
    inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${180 / w});color:${deckFg()}`;
    for (const b of previewBlocks(slide, idea)) inner.appendChild(blockPreview(b));
    cv.appendChild(inner);
    const lab = document.createElement('span'); lab.textContent = t(idea.name);
    btn.append(cv, lab);
    btn.addEventListener('click', () => { applyIdea(idea); back.remove(); });
    grid.appendChild(btn);
  });
  document.body.appendChild(back);
  back.querySelector('.modal-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
}
