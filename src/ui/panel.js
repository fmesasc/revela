// The slide navigator: thumbnails grouped by section, drag‑and‑drop reordering,
// and quick delete.

import { state, currentSlide } from '../core/store.js';
import { goToSlide, moveSlide, deleteSlide } from '../features/slides.js';
import { blockPreview } from './preview.js';

let panel;
let dragFrom = null;

export function initPanel() { panel = document.getElementById('navigator'); }

export function renderPanel() {
  panel.innerHTML = '';
  let lastSection;
  state.deck.slides.forEach((slide, index) => {
    if (slide.sectionId && slide.sectionId !== lastSection) {
      const sec = state.deck.sections.find(s => s.id === slide.sectionId);
      if (sec) {
        const h = document.createElement('div');
        h.className = 'section-head'; h.textContent = sec.name;
        panel.appendChild(h);
      }
    }
    lastSection = slide.sectionId;
    panel.appendChild(thumb(slide, index));
  });
}

function thumb(slide, index) {
  const el = document.createElement('div');
  el.className = 'thumb' + (index === state.ui.slideIndex ? ' active' : '');
  el.draggable = true;
  el.dataset.index = index;

  const num = document.createElement('span'); num.className = 'thumb-num'; num.textContent = index + 1;
  const canvas = document.createElement('div'); canvas.className = 'thumb-canvas';
  canvas.style.background = slide.background;
  const { w, h } = state.deck.size;
  canvas.style.setProperty('--ar', w / h);
  const inner = document.createElement('div');
  inner.className = 'thumb-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${188 / w})`;
  for (const b of slide.blocks) inner.appendChild(blockPreview(b));
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
