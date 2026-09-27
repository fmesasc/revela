// Right‑click context menu. Actions adapt to what was clicked: a block, an
// image (extra processing options) or the empty canvas.

import { state, commit, currentSlide, selectedBlock } from '../core/store.js';
import { uid } from '../core/model.js';
import * as blocks from '../features/blocks.js';
import { addText } from '../features/blocks.js';
import { addSlide } from '../features/slides.js';

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
      commit(() => (state.ui.selection = blockEl.dataset.id), { history: false });
      open(e.clientX, e.clientY, forBlock(selectedBlock()));
    } else {
      open(e.clientX, e.clientY, forCanvas());
    }
  });
}

function forBlock(b) {
  const items = [
    ['Cortar', () => { clipboard = structuredClone(b); blocks.deleteBlock(b.id); }],
    ['Copiar', () => { clipboard = structuredClone(b); }],
    ['Duplicar', () => duplicate(b)],
    ['Eliminar', () => blocks.deleteBlock(b.id)],
    null,
    ['Centrar horizontalmente', () => blocks.alignSelected('hcenter')],
    ['Centrar verticalmente', () => blocks.alignSelected('vcenter')],
    ['Traer al frente', () => blocks.bringForward()],
    ['Enviar al fondo', () => blocks.sendBackward()],
  ];
  if (b.type === 'image') {
    items.push(null,
      ['Ajuste: contener', () => setFit(b, 'contain')],
      ['Ajuste: rellenar', () => setFit(b, 'cover')],
      ['Quitar fondo (IA)', () => removeBackground(b)]);
  }
  return items;
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
