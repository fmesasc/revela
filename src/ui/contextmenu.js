// Right‑click context menu. Actions adapt to what was clicked: a block, an
// image (extra processing options) or the empty canvas.

import { state, commit, currentSlide, selectedBlock, selectedBlocks, isSelected, setSelection } from '../core/store.js';
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
      ['Copiar formato', () => format.copyStyle()],
      format.hasStyleClip() ? ['Pegar formato', () => format.pasteStyle()] : null,
      ['Relleno y borde…', () => openBoxStyle(b)],
      null);
  } else if (b.type === 'image') {
    items.push(
      ['Ajustar: contener', () => setFit(b, 'contain')],
      ['Ajustar: rellenar', () => setFit(b, 'cover')],
      ['Ajustes de imagen…', () => openImageAdjust(b)],
      ['Recortar…', () => openImageCrop(b)],
      ['Texto alternativo…', () => openAlt(b)],
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
  } else if (b.type === 'icon') {
    items.push(['Color del icono…', () => openIconColor(b)], null);
  } else if (b.type === 'chart') {
    items.push(['Editar datos…', () => openChartData(b)], null);
  } else if (b.type === 'table') {
    items.push(
      ['Añadir fila', () => blocks.tableAddRow()],
      ['Añadir columna', () => blocks.tableAddCol()],
      ['Quitar fila', () => blocks.tableDelRow()],
      ['Quitar columna', () => blocks.tableDelCol()],
      [b.header ? 'Quitar fila de encabezado' : 'Fila de encabezado', () => blocks.tableToggleHeader()],
      null);
  }

  // Grouping (only when it makes sense).
  const sel = selectedBlocks();
  const groupItems = [];
  if (sel.filter(x => x.type !== 'connector').length === 2) groupItems.push(['Conectar', () => blocks.addConnector()]);
  if (sel.length > 1) groupItems.push(['Agrupar', () => blocks.groupSelected()]);
  if (sel.some(x => x.groupId)) groupItems.push(['Desagrupar', () => blocks.ungroupSelected()]);
  if (groupItems.length) items.push(null, ...groupItems);

  items.push(null,
    ['Voltear horizontalmente', () => blocks.flipSelected('h')],
    ['Voltear verticalmente', () => blocks.flipSelected('v')],
    ['Restablecer giro', () => blocks.resetRotation()],
    [b.locked ? 'Desbloquear' : 'Bloquear', () => blocks.toggleLock()]);

  // Position + arrange, common to every object.
  items.push(
    null,
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

function openImageAdjust(b) {
  if (document.getElementById('img-modal')) return;
  const a = Object.assign({ brightness: 100, contrast: 100, saturate: 100, opacity: 100 }, b.adj);
  const sl = (label, prop, max) =>
    `<label class="fr-l">${label} <input type="range" data-adj="${prop}" min="0" max="${max}" value="${a[prop]}"></label>`;
  const back = document.createElement('div');
  back.id = 'img-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:280px">
    <button class="modal-close">✕</button><h3>Ajustes de imagen</h3>
    ${sl('Brillo', 'brightness', 200)}${sl('Contraste', 'contrast', 200)}
    ${sl('Saturación', 'saturate', 200)}${sl('Opacidad', 'opacity', 100)}
    <div class="fr-actions"><button class="fr-do" data-reset>Restablecer</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-adj]').forEach(r =>
    r.addEventListener('input', () => blocks.setImageAdj(r.dataset.adj, r.value)));
  back.querySelector('[data-reset]').addEventListener('click', () => {
    blocks.resetImageAdj();
    back.querySelectorAll('[data-adj]').forEach(r => (r.value = r.dataset.adj === 'opacity' ? 100 : 100));
  });
}

function openChartData(b) {
  if (document.getElementById('chart-modal')) return;
  const lines = (b.data || []).map(d => `${d.label},${d.value}`).join('\n');
  const back = document.createElement('div');
  back.id = 'chart-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:300px">
    <button class="modal-close">✕</button><h3>Datos del gráfico</h3>
    <label class="fr-l">Tipo <select class="ch-type">
      <option value="bar">Barras</option><option value="line">Líneas</option><option value="pie">Circular</option></select></label>
    <label class="fr-l">Color (barras) <input type="color" class="ch-color" value="${b.color || '#3f6497'}"></label>
    <label class="fr-l">Datos (una línea "etiqueta,valor")
      <textarea class="ch-data" rows="5" style="font-family:monospace">${lines}</textarea></label>
    <div class="fr-actions"><button class="fr-do">Aplicar</button></div>
  </div>`;
  document.body.appendChild(back);
  back.querySelector('.ch-type').value = b.chartType || 'bar';
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.fr-do').addEventListener('click', () => {
    const data = back.querySelector('.ch-data').value.split('\n').map(l => l.split(',')).filter(p => p[0])
      .map(p => ({ label: (p[0] || '').trim(), value: parseFloat(p[1]) || 0 }));
    blocks.setChart({ chartType: back.querySelector('.ch-type').value, color: back.querySelector('.ch-color').value, data });
    close();
  });
}

function openIconColor(b) {
  if (document.getElementById('icon-modal')) return;
  const back = document.createElement('div');
  back.id = 'icon-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="min-width:220px">
    <button class="modal-close">✕</button><h3>Color del icono</h3>
    <input type="color" class="ic-color" value="${b.color || '#ffffff'}" style="width:80px;height:44px;border:none;background:none;cursor:pointer">
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.ic-color').addEventListener('input', e => blocks.setIconColor(e.target.value));
}

function openBoxStyle(b) {
  if (document.getElementById('box-modal')) return;
  const back = document.createElement('div');
  back.id = 'box-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:280px">
    <button class="modal-close">✕</button><h3>Relleno y borde</h3>
    <label class="fr-l">Relleno <input type="color" class="bx-fill" value="${b.bg || '#3f6497'}"></label>
    <label class="fr-l">Borde <input type="color" class="bx-border" value="${b.borderColor || '#1e2a3a'}"></label>
    <label class="fr-l">Redondeo (px) <input type="range" class="bx-radius" min="0" max="40" value="${b.radius || 0}"></label>
    <div class="fr-actions"><button class="fr-do" data-clear>Sin relleno/borde</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.bx-fill').addEventListener('input', e => blocks.setBoxStyle({ bg: e.target.value }));
  back.querySelector('.bx-border').addEventListener('input', e => blocks.setBoxStyle({ borderColor: e.target.value }));
  back.querySelector('.bx-radius').addEventListener('input', e => blocks.setBoxStyle({ radius: +e.target.value }));
  back.querySelector('[data-clear]').addEventListener('click', () => { blocks.setBoxStyle({ bg: '', borderColor: '', radius: 0 }); close(); });
}

function openAlt(b) {
  if (document.getElementById('alt-modal')) return;
  const back = document.createElement('div');
  back.id = 'alt-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:300px">
    <button class="modal-close">✕</button><h3>Texto alternativo</h3>
    <label class="fr-l">Descripción para accesibilidad
      <input class="alt-in" type="text" value="${(b.alt || '').replace(/"/g, '&quot;')}"></label>
    <div class="fr-actions"><button class="fr-do">Guardar</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.fr-do').addEventListener('click', () => { blocks.setAlt(back.querySelector('.alt-in').value); close(); });
  back.querySelector('.alt-in').focus();
}

function openImageCrop(b) {
  if (document.getElementById('crop-modal')) return;
  const c = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, b.crop);
  const sl = (label, side) =>
    `<label class="fr-l">${label} <input type="range" data-crop="${side}" min="0" max="45" value="${c[side]}"></label>`;
  const back = document.createElement('div');
  back.id = 'crop-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:280px">
    <button class="modal-close">✕</button><h3>Recortar imagen (%)</h3>
    ${sl('Arriba', 'top')}${sl('Derecha', 'right')}${sl('Abajo', 'bottom')}${sl('Izquierda', 'left')}
    <div class="fr-actions"><button class="fr-do" data-reset>Restablecer</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-crop]').forEach(r =>
    r.addEventListener('input', () => blocks.setImageCrop(r.dataset.crop, r.value)));
  back.querySelector('[data-reset]').addEventListener('click', () => {
    blocks.resetImageCrop();
    back.querySelectorAll('[data-crop]').forEach(r => (r.value = 0));
  });
}

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
