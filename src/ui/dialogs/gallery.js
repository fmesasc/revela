// "New from template" dialog: thumbnails of each gallery deck's cover.

import { isBlankDeck, emptyDeck } from '../../core/model.js';
import { state, replaceDeck, currentSlide } from '../../core/store.js';
import { designIdeas, previewBlocks, applyIdea } from '../../features/design/designer.js';
import { GALLERY, buildFromGallery } from '../../features/design/gallery.js';
import { EXAMPLES, CATEGORIES, loadExample, exampleNames } from '../../features/content/examples.js';
import { masterBlocksFor, styled } from '../../features/document/master.js';
import { PALETTES, pairStacks, deckFg } from '../../features/design/palettes.js';
import { ensureDeckFonts } from '../../features/design/fonts.js';
import { blockPreview } from '../shell/preview.js';
import { fitTranslated } from '../canvas/fittext.js';
import { confirmDialog } from './dialog.js';
import { run as runAi } from './ai.js';
import * as aiDeck from '../../features/ai/authoring.js';
import { t, currentLang } from '../../i18n/index.js';

export function openGallery() {
  document.getElementById('gallery-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'gallery-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(820px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Nueva presentación desde plantilla')}</h3>
    <h4>${t('Plantillas')}</h4><div class="gal-grid"></div></div>`;
  const grid = back.querySelector('.gal-grid');
  // Asked only when there is something to lose.
  const replaceWith = (deck, question) => (isBlankDeck(state.deck) ? Promise.resolve(true) : confirmDialog(question))
    .then(ok => { if (ok) { replaceDeck(deck); back.remove(); } });
  // First, a blank presentation.
  const blank = document.createElement('button'); blank.type = 'button'; blank.className = 'gal-item gal-blank'; blank.dataset.gallery = 'blank';
  blank.innerHTML = `<div class="thumb-canvas"><i class="ms">add</i></div><span>${t('En blanco')}</span>`;
  blank.addEventListener('click', () => replaceWith(emptyDeck(), t('¿Nueva presentación? Se perderá la actual si no la has guardado.')));
  grid.appendChild(blank);
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
    btn.addEventListener('click', () => replaceWith(buildFromGallery(key), t('¿Nueva presentación? Se perderá la actual si no la has guardado.')));
    grid.appendChild(btn);
  }
  // Complete example presentations, with real content: a thousand, by group and
  // searchable; each one's cover is drawn when it scrolls into view (its file is
  // loaded then).
  const h = document.createElement('h4'); h.textContent = t('Presentaciones de ejemplo');
  const bar = document.createElement('div'); bar.className = 'gal-bar';
  const counts = {}; for (const e of Object.values(EXAMPLES)) counts[e.cat] = (counts[e.cat] || 0) + 1;
  bar.innerHTML = `<input type="search" class="gal-q" placeholder="${t('Buscar entre {n} presentaciones…').replace('{n}', Object.keys(EXAMPLES).length)}">`
    + `<div class="gal-cats"><button type="button" class="gal-cat on" data-cat="">${t('Todas')}</button>`
    + CATEGORIES.filter(([c]) => counts[c]).map(([c, l]) => `<button type="button" class="gal-cat" data-cat="${c}">${t(l)} <small>${counts[c]}</small></button>`).join('') + '</div>';
  const ex = document.createElement('div'); ex.className = 'gal-grid gal-examples';
  const none = document.createElement('p'); none.className = 'host-help'; none.hidden = true; none.textContent = t('Ninguna presentación coincide.');
  back.querySelector('.modal').append(h, bar, ex, none);
  const cover = (btn, deck) => {
    const c = deck.slides[0], cv = btn.querySelector('.thumb-canvas'); cv.style.background = c.background;
    const inner = document.createElement('div'); inner.className = 'thumb-inner';
    inner.style.cssText = `width:${deck.size.w}px;height:${deck.size.h}px;transform:scale(${180 / deck.size.w});color:${PALETTES[deck.palette]?.fg || '#fff'};font-family:${deck.bodyFont}`;
    for (const b of [...masterBlocksFor(c, deck), ...c.blocks.map(x => styled(x, c, deck))]) inner.appendChild(blockPreview(b));
    cv.replaceChildren(inner);
  };
  const seen = new IntersectionObserver(entries => entries.forEach(async en => {
    if (!en.isIntersecting) return; seen.unobserve(en.target);
    const deck = await loadExample(en.target.dataset.example).catch(() => null);
    if (deck) { ensureDeckFonts(deck); cover(en.target, deck); }
  }), { root: back.querySelector('.modal'), rootMargin: '300px' });
  const items = Object.entries(EXAMPLES).map(([key, e]) => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gal-item'; btn.dataset.example = key; btn.dataset.cat = e.cat || '';
    btn.title = t(e.summary); btn.dataset.text = (t(e.name) + ' ' + t(e.summary)).toLowerCase();
    btn.innerHTML = `<div class="thumb-canvas"><i class="ms gal-wait">slideshow</i></div>`;
    const lab = document.createElement('span'); lab.innerHTML = `<b></b><small></small>`; lab.querySelector('b').textContent = t(e.name); lab.querySelector('small').textContent = t(e.summary);
    btn.append(lab);
    btn.addEventListener('click', async () => { const d = await loadExample(key).then(x => x && fitTranslated(x)); if (d) replaceWith(d, t('¿Abrir el ejemplo? Se perderá la presentación actual si no la has guardado.')); });
    ex.appendChild(btn); seen.observe(btn); return btn;
  });
  // (In another language, the names and summaries come with the gallery: one file for all of them.)
  exampleNames(currentLang()).then(names => { for (const b of items) { const n = names[b.dataset.example]; if (!n) continue;
    const [name, sum] = [n[0] || b.querySelector('b').textContent, n[1] || b.title];
    b.querySelector('b').textContent = name; b.querySelector('small').textContent = sum; b.title = sum; b.dataset.text = (name + ' ' + sum).toLowerCase(); } });
  let cat = '';
  const filter = () => {
    const q = bar.querySelector('.gal-q').value.trim().toLowerCase(); let n = 0;
    for (const b of items) { const ok = (!cat || b.dataset.cat === cat) && (!q || q.split(/\s+/).every(w => b.dataset.text.includes(w))); b.hidden = !ok; if (ok) n++; }
    none.hidden = !!n;
  };
  bar.querySelector('.gal-q').addEventListener('input', filter);
  bar.querySelectorAll('.gal-cat').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; bar.querySelectorAll('.gal-cat').forEach(x => x.classList.toggle('on', x === b)); filter(); }));
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
  if (!ideas.length) grid.insertAdjacentHTML('beforebegin', `<p class="host-help">${t('Escribe un título en la diapositiva para recibir ideas de diseño.')}</p>`);
  const { w, h } = state.deck.size;
  const tile = idea => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gal-item';
    const cv = document.createElement('div'); cv.className = 'thumb-canvas'; cv.style.background = slide.background; cv.style.setProperty('--ar', w / h);
    const inner = document.createElement('div'); inner.className = 'thumb-inner';
    inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${180 / w});color:${deckFg()}`;
    for (const b of previewBlocks(slide, idea)) inner.appendChild(blockPreview(b));
    cv.appendChild(inner);
    const lab = document.createElement('span'); lab.textContent = t(idea.name);
    btn.append(cv, lab);
    btn.addEventListener('click', () => { applyIdea(idea); back.remove(); });
    return btn;
  };
  ideas.forEach(idea => grid.appendChild(tile(idea)));
  // More, from the AI (its own arrangements of the same objects).
  if (slide.blocks.length) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'gal-item gal-ai';
    more.innerHTML = `<div class="thumb-canvas gal-ai-in" style="--ar:${w / h}"><i class="ms">auto_awesome</i></div><span>${t('Más ideas con IA')}</span>`;
    more.addEventListener('click', async () => {
      const got = await runAi(() => aiDeck.redesignIdeas(slide)); if (!got) return;
      for (const idea of got) grid.insertBefore(tile(idea), more);
    });
    grid.appendChild(more);
  }
  document.body.appendChild(back);
  back.querySelector('.modal-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
}
