// The slide navigator: thumbnails grouped by section, drag‑and‑drop reordering,
// and quick delete.

import { state, currentSlide } from '../core/store.js';
import { goToSlide, moveSlide, deleteSlide, renameSection } from '../features/slides.js';
import { blockPreview } from './preview.js';
import { deckFg, deckBodyFont } from '../features/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder } from '../features/master.js';

let panel;
let dragFrom = null;

export function initPanel() { panel = document.getElementById('navigator'); }

export function renderPanel() {
  panel.innerHTML = '';
  let lastSection;
  state.deck.slides.forEach((slide, index) => {
    if (slide.sectionId && slide.sectionId !== lastSection) {
      const sec = state.deck.sections.find(s => s.id === slide.sectionId);
      if (sec) panel.appendChild(sectionHead(sec));
    }
    lastSection = slide.sectionId;
    panel.appendChild(thumb(slide, index));
  });
}

// A section title, editable in place (no browser prompt). Right‑clicking it
// opens the section menu (handled by the context‑menu module).
function sectionHead(sec) {
  const h = document.createElement('div');
  h.className = 'section-head'; h.dataset.sectionId = sec.id;
  h.textContent = sec.name;
  h.contentEditable = 'true'; h.spellcheck = false;
  h.title = 'Clic para renombrar la sección · clic derecho para más opciones';
  h.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); h.blur(); } });
  h.addEventListener('blur', () => renameSection(sec.id, h.textContent.trim()));
  if (state.ui.editingSection === sec.id) requestAnimationFrame(() => {
    h.focus();
    const r = document.createRange(); r.selectNodeContents(h);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  return h;
}

function thumb(slide, index) {
  const el = document.createElement('div');
  el.className = 'thumb' + (index === state.ui.slideIndex ? ' active' : '') + (slide.hidden ? ' is-hidden' : '');
  el.draggable = true;
  el.dataset.index = index;

  const num = document.createElement('span'); num.className = 'thumb-num'; num.textContent = index + 1;
  if (slide.hidden) {
    const badge = document.createElement('span');
    badge.className = 'thumb-hidden'; badge.title = 'Diapositiva oculta en la presentación';
    badge.innerHTML = '<i class="ms">visibility_off</i>';
    el.appendChild(badge);
  }
  const canvas = document.createElement('div'); canvas.className = 'thumb-canvas';
  canvas.style.background = slide.background;
  const { w, h } = state.deck.size;
  canvas.style.setProperty('--ar', w / h);
  const inner = document.createElement('div');
  inner.className = 'thumb-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${188 / w});color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
  for (const b of [...masterBlocksFor(slide), ...slide.blocks]) if (!isEmptyPlaceholder(b)) inner.appendChild(blockPreview(b));
  canvas.appendChild(inner);

  const del = document.createElement('button'); del.className = 'thumb-del'; del.textContent = '×';
  del.title = 'Borrar diapositiva';
  del.addEventListener('click', e => { e.stopPropagation(); deleteSlide(index); });

  el.append(num, canvas, del);
  el.addEventListener('click', () => goToSlide(index));

  el.addEventListener('dragstart', () => { dragFrom = index; el.classList.add('dragging'); });
  el.addEventListener('dragend', () => { dragFrom = null; el.classList.remove('dragging'); clearMarks(); });
  el.addEventListener('dragover', e => { e.preventDefault(); markTarget(el); });
  el.addEventListener('drop', e => {
    e.preventDefault();
    const to = +el.dataset.index;
    if (dragFrom !== null && dragFrom !== to) moveSlide(dragFrom, to);
  });
  return el;
}

function markTarget(el) { clearMarks(); el.classList.add('drop-target'); }
function clearMarks() { panel.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target')); }
