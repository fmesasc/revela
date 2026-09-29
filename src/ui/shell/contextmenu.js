// Right‑click context menu. Actions adapt to what was clicked: a block, an
// image (extra processing options) or the empty canvas.

import { state, commit, currentSlide, selectedBlock, selectedBlocks, isSelected, setSelection, setMulti } from '../../core/store.js';
import { uid } from '../../core/model.js';
import * as blocks from '../../features/document/blocks.js';
import * as shapeops from '../../features/document/shapeops.js';
import * as master from '../../features/document/master.js';
import * as clip from '../../features/document/clipboard.js';
import * as slidesMod from '../../features/document/slides.js';
import { openPollEditor } from '../dialogs/poll.js';
import { openCodeEditor } from '../dialogs/code.js';
import { fitTextToBox } from '../canvas/canvas.js';
import { openLinkChart, refreshChart } from '../dialogs/data.js';
import { addText } from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import { addSlide, duplicateSlide, deleteSlide, goToSlide, toggleSlideHidden, addSectionAt, removeSection, setSlideSection } from '../../features/document/slides.js';
import { t } from '../../i18n/index.js';
import { alertDialog, promptDialog } from '../dialogs/dialog.js';
import { openSaveAsPicture } from '../dialogs/picture.js';
import { openMediaPlayback } from '../dialogs/media.js';
import { openModel3D } from '../dialogs/model3d.js';
import { openObjectLink } from '../dialogs/objlink.js';
import { saveBlockFile as saveFile } from './files.js';
import { present } from './present.js';
import { openBackgroundDialog } from '../dialogs/background.js';
import { playInEditor } from '../canvas/mediaview.js';
import { isGif } from '../../features/live/media.js';
import { openImageAdjust, openMath, openChartData, openOpacity, openIconColor, openBoxStyle, openSlidePicker, openCaption, openAlt, openImageCrop, removeBackground, openTableStyle } from '../dialogs/object.js';

let menuEl, menuOpenedAt = 0;

export function initContextMenu() {
  menuEl = document.createElement('div');
  menuEl.id = 'context-menu';
  menuEl.hidden = true;
  document.body.appendChild(menuEl);
  document.addEventListener('click', () => { if (Date.now() - menuOpenedAt > 400) hide(); });   // not the click that ends a long press
  document.addEventListener('scroll', () => hide(), true);
  window.addEventListener('blur', () => hide());

  const stage = document.getElementById('stage');
  const openStageMenu = (x, y, target) => {
    const blockEl = target && target.closest('.block');
    if (blockEl) {
      if (!isSelected(blockEl.dataset.id)) commit(() => setSelection(blockEl.dataset.id), { history: false });
      const td = target.closest('td[data-r]');
      open(x, y, forBlock(selectedBlock(), td ? { r: +td.dataset.r, c: +td.dataset.c } : null));
    } else {
      open(x, y, forCanvas());
    }
  };
  stage.addEventListener('contextmenu', e => { e.preventDefault(); openStageMenu(e.clientX, e.clientY, e.target); });

  const nav = document.getElementById('navigator');
  const openNavMenu = (x, y, target) => {
    const head = target && target.closest('.section-head');
    if (head) { open(x, y, forSection(head.dataset.sectionId)); return; }
    const th = target && target.closest('.thumb');
    if (th) { const i = +th.dataset.index; goToSlide(i); open(x, y, forThumb(i)); return; }
    open(x, y, [['Nueva diapositiva', () => addSlide()]]);
  };
  nav.addEventListener('contextmenu', e => { e.preventDefault(); openNavMenu(e.clientX, e.clientY, e.target); });

  // Touch: a long‑press opens the same menu (iOS doesn't fire `contextmenu`, and
  // it also avoids the native text‑selection popup taking over).
  longPress(stage, openStageMenu);
  longPress(nav, openNavMenu);
}

function longPress(el, handler) {
  let timer, sx = 0, sy = 0, tgt = null, fired = false;
  const cancel = () => clearTimeout(timer);
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tgt = t.target; fired = false;
    timer = setTimeout(() => { fired = true; menuOpenedAt = Date.now(); handler(sx, sy, document.elementFromPoint(sx, sy) || tgt); }, 500);
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    const t = e.touches[0]; if (t && (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12)) cancel();
  }, { passive: true });
  // Lifting the finger after a long press must not "click" (that would close
  // the menu it just opened, or act on what's under it).
  el.addEventListener('touchend', e => { cancel(); if (fired) { e.preventDefault(); fired = false; } });
  el.addEventListener('touchcancel', cancel);
}

function forThumb(i) {
  const slide = state.deck.slides[i];
  return [
    ['Nueva diapositiva', () => addSlide()],
    ['Duplicar diapositiva', () => duplicateSlide()],
    ['Eliminar diapositiva', () => deleteSlide(i)],
    null,
    ['Presentar desde aquí', () => present({ fromCurrent: true })],
    ['Formato del fondo…', () => openBackgroundDialog()],
    null,
    [slide.hidden ? 'Mostrar diapositiva' : 'Ocultar diapositiva', () => toggleSlideHidden(i)],
    [slide.uncounted ? 'Contar en la numeración' : 'No contar en la numeración (anexo)', () => commit(() => { if (slide.uncounted) delete slide.uncounted; else slide.uncounted = true; })],
    i > 0 ? [slide.vertical ? 'Sacar de la pila vertical' : 'Colocar debajo de la anterior (vertical)', () => slidesMod.toggleVertical(i)] : null,
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

function forBlock(b, cell = null) {
  // Common object actions (like PowerPoint's right‑click on any shape).
  const items = [
    ['Copiar', () => clip.copySelected()],
    ['Cortar', () => clip.cutSelected()],
    ['Pegar', clip.hasClipboard() ? () => clip.paste() : null],
    ['Duplicar', () => duplicate(b)],
    ['Eliminar', () => blocks.deleteBlock(b.id)],
    [b.shadow ? 'Quitar sombra' : 'Sombra', () => blocks.toggleShadow()],
    ['Guardar como imagen…', () => openSaveAsPicture()],
    ...(!['text', 'connector'].includes(b.type) ? [['Vínculo…', () => openObjectLink(b)]] : []),
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
      ['Ajustar el tamaño de letra al cuadro', () => fitTextToBox(b)],
      [b.shrink ? 'No reducir el texto si no cabe' : 'Reducir el texto si no cabe', () => commit(() => { if (b.shrink) delete b.shrink; else b.shrink = true; })],
      null);
  } else if (b.type === 'image') {
    items.push(
      ['Ajustar: contener', () => setFit(b, 'contain')],
      ['Ajustar: rellenar', () => setFit(b, 'cover')],
      ['Ajustes de imagen…', () => openImageAdjust(b)],
      ['Recortar…', () => openImageCrop(b)],
      ['Texto alternativo…', () => openAlt(b)],
      [b.zoomable ? 'No ampliar al hacer clic' : 'Ampliar al hacer clic (al presentar)', () => commit(() => { if (b.zoomable) delete b.zoomable; else b.zoomable = true; })],
      ['Quitar fondo (IA)', () => removeBackground(b)],
      ['Descargar la imagen', () => saveFile(b)],
      ...(isGif(b) ? [['Reproducción…', () => openMediaPlayback(b)]] : []),
      null);
  } else if (b.type === 'model') {
    items.push(
      ['Movimiento 3D…', () => openModel3D(b)],
      ['Descargar el modelo 3D (.glb)', () => saveFile(b)],
      [b.autoRotate !== false ? 'Detener giro automático' : 'Girar automáticamente',
        () => commit(() => (b.autoRotate = !(b.autoRotate !== false)))],
      null);
  } else if (b.type === 'video') {
    items.push(
      ['Reproducir en el editor', () => playInEditor(b.id)],
      ['Reproducción…', () => openMediaPlayback(b)],
      ['Descargar el vídeo', () => saveFile(b)],
      null);
  } else if (b.type === 'poll') {
    items.push(['Editar votación…', () => openPollEditor(b)], null);
  } else if (b.type === 'camera') {
    items.push(
      ['Forma: círculo', () => commit(() => { b.shape = 'circle'; })],
      ['Forma: redondeada', () => commit(() => { b.shape = 'rounded'; })],
      ['Forma: rectángulo', () => commit(() => { b.shape = 'rect'; })],
      [b.mirror !== false ? 'No reflejar la imagen' : 'Reflejar la imagen', () => commit(() => { b.mirror = b.mirror === false; })],
      null);
  } else if (b.type === 'figindex') {
    items.push(
      ['Mostrar figuras y tablas', () => blocks.setFigIndexKind('all')],
      ['Solo figuras', () => blocks.setFigIndexKind('figures')],
      ['Solo tablas', () => blocks.setFigIndexKind('tables')], null);
  } else if (b.type === 'slideref') {
    items.push(
      ['Elegir diapositiva…', () => openSlidePicker(b)],
      [b.returnBack ? 'Ir a la diapositiva (sin volver)' : 'Al hacer clic vuelve aquí', () => blocks.toggleSlideRefReturn()], null);
  } else if (b.type === 'math') {
    items.push(['Editar ecuación…', () => openMath(b)], ['Relleno y borde…', () => openBoxStyle(b)], null);
  } else if (b.type === 'embed') {
    items.push(
      b.display === 'card' ? ['Mostrar la web incrustada', () => blocks.setEmbedDisplay(b.id, 'frame')]
        : ['Mostrar como tarjeta con enlace', () => blocks.setEmbedDisplay(b.id, 'card')],
      ...(b.display === 'card' ? [
        ['Título de la tarjeta…', () => promptDialog(t('Título de la tarjeta:'), b.cardTitle || '').then(v => { if (v !== null) blocks.setWebCard(b.id, { cardTitle: v.trim() }); })],
        ['Imagen de la tarjeta…', () => pickCardImage(b)],
        ...(b.poster ? [['Quitar la imagen de la tarjeta', () => blocks.setWebCard(b.id, { poster: '' })]] : []),
      ] : []),
      null);
  } else if (b.type === 'code') {
    items.push(['Editar código y pasos…', () => openCodeEditor(b)], null);
  } else if (b.type === 'icon') {
    items.push(['Color del icono…', () => openIconColor(b)], null);
  } else if (b.type === 'chart') {
    items.push(['Editar datos…', () => openChartData(b)],
      [b.dataUrl ? 'Datos vinculados (CSV)…' : 'Vincular a datos (CSV)…', () => openLinkChart(b)],
      ...(b.dataUrl ? [['Actualizar datos ahora', () => refreshChart(b)]] : []), null);
  } else if (b.type === 'table') {
    items.push(
      ['Añadir fila', () => blocks.tableAddRow()],
      ['Añadir columna', () => blocks.tableAddCol()],
      ['Quitar fila', () => blocks.tableDelRow()],
      ['Quitar columna', () => blocks.tableDelCol()],
      [b.header ? 'Quitar fila de encabezado' : 'Fila de encabezado', () => blocks.tableToggleHeader()],
      ['Estilo de tabla…', () => openTableStyle(b)],
      ['Crear gráfico con estos datos', () => blocks.chartFromTable()],
      null);
    if (cell) {
      items.push(
        ['Combinar con la celda derecha', () => blocks.tableMerge(cell.r, cell.c, 'right')],
        ['Combinar con la celda inferior', () => blocks.tableMerge(cell.r, cell.c, 'down')]);
      if (blocks.mergeAt(b, cell.r, cell.c)) items.push(['Separar celdas', () => blocks.tableSplit(cell.r, cell.c)]);
      items.push(null);
    }
  }

  // Alt text for every non-text object (images already have it above).
  if (['shape', 'chart', 'icon', 'model', 'video', 'audio', 'embed', 'math', 'ink', 'camera'].includes(b.type))
    items.push(null, ['Texto alternativo…', () => openAlt(b)]);

  // Caption (figures, tables and other objects — not plain text/connectors).
  if (!['text', 'connector', 'figindex', 'slideref'].includes(b.type)) {
    items.push(null, [b.caption ? 'Editar descripción…' : 'Añadir descripción…', () => openCaption(b)]);
    if (b.caption) items.push(['Quitar descripción', () => blocks.setCaption('')]);
  }

  // Grouping (only when it makes sense).
  const sel = selectedBlocks();
  const groupItems = [];
  if (sel.filter(x => x.type !== 'connector').length === 2) groupItems.push(['Conectar', () => blocks.addConnector()]);
  if (sel.length > 1) groupItems.push(['Agrupar', () => blocks.groupSelected()]);
  if (sel.some(x => x.groupId)) groupItems.push(['Desagrupar', () => blocks.ungroupSelected()]);
  if (groupItems.length) items.push(null, ...groupItems);
  // Merge shapes (2+ closed shapes): union, combine, intersect, subtract.
  const ordered = shapeops.selectedShapesInOrder();
  if (shapeops.canMerge(ordered)) {
    const run = op => shapeops.mergeShapes(op, ordered).then(r => { if (!r) alertDialog(t('Las formas no se solapan.')); })
      .catch(() => alertDialog(t('No se pudo cargar la librería de formas.')));
    items.push(null,
      ['Combinar formas: unión', () => run('union')],
      ['Combinar formas: combinar', () => run('xor')],
      ['Combinar formas: intersecar', () => run('intersection')],
      ['Combinar formas: restar', () => run('difference')]);
  }

  items.push(null,
    ['Voltear horizontalmente', () => blocks.flipSelected('h')],
    ['Voltear verticalmente', () => blocks.flipSelected('v')],
    ['Restablecer giro', () => blocks.resetRotation()],
    ['Opacidad…', () => openOpacity(b)],
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

// A picture for a web card, e.g. a screenshot of the page.
function pickCardImage(b) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => blocks.setWebCard(b.id, { poster: r.result }); r.readAsDataURL(f); };
  inp.click();
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
    ['Pegar', clip.hasClipboard() ? () => clip.paste() : null],
    ['Nuevo cuadro de texto', () => addText()],
    ['Seleccionar todo', currentSlide()?.blocks.some(b => !b.locked)
      ? () => commit(() => setMulti(currentSlide().blocks.filter(b => !b.locked).map(b => b.id)), { history: false }) : null],
    null,
    ['Nueva diapositiva', () => addSlide()],
    ['Formato del fondo…', () => openBackgroundDialog()],
    null,
    [state.ui.showGuides ? 'Ocultar guías' : 'Mostrar guías', () => commit(() => (state.ui.showGuides = !state.ui.showGuides), { history: false })],
    [state.ui.snap === false ? 'Ajustar a otros objetos' : 'No ajustar a otros objetos', () => commit(() => (state.ui.snap = state.ui.snap === false), { history: false })],
    ...(state.ui.editMaster ? [null, ['Cerrar patrón', () => master.toggleMasterEdit(false)]]
      : state.deck.master?.blocks?.length ? [null, [currentSlide()?.hideMaster ? 'Mostrar objetos del patrón' : 'Ocultar objetos del patrón', () => master.toggleHideMaster()]] : []),
  ];
}

function duplicate(b) {
  commit(() => {
    const copy = structuredClone(b); copy.id = uid(); copy.x += 24; copy.y += 24;
    currentSlide().blocks.push(copy); state.ui.selection = copy.id;
  });
}
function setFit(b, fit) { commit(() => (b.fit = fit)); }

// ---- menu plumbing ---------------------------------------------------------
function open(x, y, items) {
  menuEl.innerHTML = '';
  // No separators at the ends or twice in a row.
  items = items.filter((it, i, a) => it || (i > 0 && a[i - 1] && a.slice(i + 1).some(Boolean)));
  for (const item of items) {
    if (!item) { const sep = document.createElement('div'); sep.className = 'ctx-sep'; menuEl.appendChild(sep); continue; }
    const [label, fn] = item;
    const row = document.createElement('button');
    row.className = 'ctx-item'; row.textContent = t(label); row.disabled = !fn;
    if (fn) row.addEventListener('click', () => { hide(); fn(); });
    menuEl.appendChild(row);
  }
  // Keep it fully on screen; if it is taller than the window (long menus on
  // phones), it scrolls instead of being cut off at the top.
  menuEl.style.maxHeight = (innerHeight - 16) + 'px'; menuEl.style.overflowY = 'auto';
  menuEl.style.left = x + 'px'; menuEl.style.top = y + 'px';
  menuEl.hidden = false; menuEl.scrollTop = 0;
  const r = menuEl.getBoundingClientRect();
  let left = r.right > innerWidth - 8 ? x - r.width : x, top = r.bottom > innerHeight - 8 ? y - r.height : y;
  left = Math.max(8, Math.min(left, innerWidth - r.width - 8));
  top = Math.max(8, Math.min(top, innerHeight - r.height - 8));
  menuEl.style.left = left + 'px'; menuEl.style.top = top + 'px';
}
function hide() { if (menuEl) menuEl.hidden = true; }
