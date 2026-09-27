// Right‑click context menu. Actions adapt to what was clicked: a block, an
// image (extra processing options) or the empty canvas.

import { state, commit, currentSlide, selectedBlock, isSelected, setSelection } from '../core/store.js';
import { uid } from '../core/model.js';
import * as blocks from '../features/blocks.js';
import { addText } from '../features/blocks.js';
import * as format from '../features/format.js';
import { addSlide, duplicateSlide, deleteSlide, goToSlide, toggleSlideHidden,
  addSectionAt, removeSection, setSlideSection } from '../features/slides.js';

let menuEl, clipboard = null;

export function initContextMenu() {
  menuEl = document.createElement('div');
  menuEl.id = 'context-menu';
  menuEl.hidden = true;
  document.body.appendChild(menuEl);
  document.addEventListener('click', () => hide());
  document.addEventListener('scroll', () => hide(), true);
  window.addEventListener('blur', () => hide());

  document.getElementById('stage').addEventListener('contextmenu', e => {
    e.preventDefault();
    const blockEl = e.target.closest('.block');
    if (blockEl) {
      if (!isSelected(blockEl.dataset.id)) commit(() => setSelection(blockEl.dataset.id), { history: false });
      open(e.clientX, e.clientY, forBlock(selectedBlock()));
    } else {
      open(e.clientX, e.clientY, forCanvas());
    }
  });

  // Right‑click in the slide navigator: sections and slides, integrated.
  document.getElementById('navigator').addEventListener('contextmenu', e => {
    e.preventDefault();
    const head = e.target.closest('.section-head');
    if (head) { open(e.clientX, e.clientY, forSection(head.dataset.sectionId)); return; }
    const th = e.target.closest('.thumb');
    if (th) { const i = +th.dataset.index; goToSlide(i); open(e.clientX, e.clientY, forThumb(i)); return; }
    open(e.clientX, e.clientY, [['Nueva diapositiva', () => addSlide()]]);
  });
}

function forThumb(i) {
  const slide = state.deck.slides[i];
  return [
    ['Nueva diapositiva', () => addSlide()],
    ['Duplicar diapositiva', () => duplicateSlide()],
    ['Eliminar diapositiva', () => deleteSlide(i)],
    null,
    [slide.hidden ? 'Mostrar diapositiva' : 'Ocultar diapositiva', () => toggleSlideHidden(i)],
    null,
    ['Crear sección aquí', () => addSectionAt(i)],
    slide.sectionId ? ['Quitar de la sección', () => setSlideSection(slide.id, null)] : null,
  ];
}

function forSection(id) {
  return [
    ['Renombrar sección', () => commit(() => (state.ui.editingSection = id), { history: false })],
    ['Eliminar sección', () => removeSection(id)],
  ];
}

function forBlock(b) {
  // Common object actions (like PowerPoint's right‑click on any shape).
  const items = [
    ['Cortar', () => { clipboard = structuredClone(b); blocks.deleteBlock(b.id); }],
    ['Copiar', () => { clipboard = structuredClone(b); }],
    ['Duplicar', () => duplicate(b)],
    ['Eliminar', () => blocks.deleteBlock(b.id)],
    null,
  ];

  // Type‑specific actions come first, right where the element is.
  if (b.type === 'text') {
    items.push(
      ['Editar texto', () => editText(b)],
      ['Alinear texto a la izquierda', () => format.align('left')],
      ['Centrar texto', () => format.align('center')],
      ['Alinear texto a la derecha', () => format.align('right')],
      null);
  } else if (b.type === 'image') {
    items.push(
      ['Ajustar: contener', () => setFit(b, 'contain')],
      ['Ajustar: rellenar', () => setFit(b, 'cover')],
      ['Quitar fondo (IA)', () => removeBackground(b)],
      null);
  } else if (b.type === 'model') {
    items.push(
      [b.autoRotate !== false ? 'Detener giro automático' : 'Girar automáticamente',
        () => commit(() => (b.autoRotate = !(b.autoRotate !== false)))],
      null);
  } else if (b.type === 'video') {
    items.push(
      ['Reproducir en el editor', () => document.querySelector(`.block[data-id="${b.id}"] video`)?.play()],
      null);
  }

  // Position + arrange, common to every object.
  items.push(
    ['Centrar horizontalmente', () => blocks.alignSelected('hcenter')],
    ['Centrar verticalmente', () => blocks.alignSelected('vcenter')],
    null,
    ['Traer al frente', () => blocks.bringToFront()],
    ['Adelantar', () => blocks.bringForward()],
    ['Atrasar', () => blocks.sendBackward()],
    ['Enviar al fondo', () => blocks.sendToBack()]);
  return items;
}

function editText(b) {
  const el = document.querySelector(`.block[data-id="${b.id}"]`); if (!el) return;
  const rich = el.querySelector('.rich'); if (!rich) return;
  rich.contentEditable = 'true'; el.classList.add('editing'); rich.focus();
  const r = document.createRange(); r.selectNodeContents(rich); r.collapse(false);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
}

function forCanvas() {
  return [
    ['Pegar', clipboard ? () => paste() : null],
    ['Nuevo cuadro de texto', () => addText()],
    null,
    ['Nueva diapositiva', () => addSlide()],
  ];
}

function duplicate(b) {
  commit(() => {
    const copy = structuredClone(b); copy.id = uid(); copy.x += 24; copy.y += 24;
    currentSlide().blocks.push(copy); state.ui.selection = copy.id;
  });
}
function paste() {
  if (!clipboard) return;
  commit(() => {
    const copy = structuredClone(clipboard); copy.id = uid(); copy.x += 24; copy.y += 24;
    currentSlide().blocks.push(copy); state.ui.selection = copy.id;
  });
}
function setFit(b, fit) { commit(() => (b.fit = fit)); }

async function removeBackground(b) {
  const el = document.querySelector(`.block[data-id="${b.id}"]`);
  el?.classList.add('processing');
  try {
    const { removeBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
    const blob = await removeBackground(b.src);
    const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    commit(() => (b.src = dataUrl));
  } catch (e) {
    alert('No se pudo quitar el fondo: ' + e.message);
  } finally {
    el?.classList.remove('processing');
  }
}

// ---- menu plumbing ---------------------------------------------------------
function open(x, y, items) {
  menuEl.innerHTML = '';
  for (const item of items) {
    if (!item) { const sep = document.createElement('div'); sep.className = 'ctx-sep'; menuEl.appendChild(sep); continue; }
    const [label, fn] = item;
    const row = document.createElement('button');
    row.className = 'ctx-item'; row.textContent = label; row.disabled = !fn;
    if (fn) row.addEventListener('click', () => { hide(); fn(); });
    menuEl.appendChild(row);
  }
  menuEl.style.left = x + 'px'; menuEl.style.top = y + 'px';
  menuEl.hidden = false;
  // keep on screen
  const r = menuEl.getBoundingClientRect();
  if (r.right > innerWidth) menuEl.style.left = (x - r.width) + 'px';
  if (r.bottom > innerHeight) menuEl.style.top = (y - r.height) + 'px';
}
function hide() { if (menuEl) menuEl.hidden = true; }
