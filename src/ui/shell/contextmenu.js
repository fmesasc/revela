// Right‑click context menu. Actions adapt to what was clicked: a block, an
// image (extra processing options) or the empty canvas.

import { startMagnifyDraw } from '../canvas/magnifyview.js';
import * as mag from '../../features/document/magnify.js';
import { state, commit, currentSlide, selectedBlock, selectedBlocks, isSelected, setSelection, setMulti, isSlideSelected, selectedSlideIndices } from '../../core/store.js';
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
import { addSlide, duplicateSlide, deleteSlide, deleteSlides, selectSlide, toggleSlideHidden, addSectionAt, removeSection, setSlideSection, copySlides, cutSlides, pasteSlides, hasSlideClip, moveSlidesToSection, sectionFromSlides, SLIDE_STATUS, setSlideStatus, setSlideOwner } from '../../features/document/slides.js';
import { t } from '../../i18n/index.js';
import { alertDialog, promptDialog } from '../dialogs/dialog.js';
import { openSaveAsPicture } from '../dialogs/picture.js';
import { openMediaPlayback } from '../dialogs/media.js';
import { openModel3D } from '../dialogs/model3d.js';
import { openObjectLink } from '../dialogs/objlink.js';
import { saveBlockFile as saveFile } from './files.js';
import { changeImage } from './changeimage.js';
import { toggleShrink } from './textaids.js';
import { togglePainter } from '../canvas/painter.js';
import { present } from './present.js';
import { openBackgroundDialog } from '../dialogs/background.js';
import { masterMenu } from './masterview.js';
import { playInEditor } from '../canvas/mediaview.js';
import { isGif } from '../../features/live/media.js';
import { cameraLive, setCameraLive, setCameraBackground } from '../canvas/cameraview.js';
import { puppetTrying, tryPuppet, togglePuppet } from '../canvas/puppetview.js';
import { openCameraEffects } from '../dialogs/media.js';
import { spellAt, spellMenu } from './spellcheck.js';
import { openImageAdjust, openMath, openChartData, openOpacity, openIconColor, openBoxStyle, openSlidePicker, openCaption, openAlt, openImageCrop, removeBackground, openTableStyle, openCellShading } from '../dialogs/object.js';

let menuEl, menuOpenedAt = 0;
// The live camera's background, straight from the menu.
const CAMERA_BG_ITEMS = { '': 'Fondo normal', blur: 'Desenfocar el fondo', remove: 'Quitar el fondo', color: 'Fondo de color', image: 'Imagen de fondo…' };

export function initContextMenu() {
  menuEl = document.createElement('div');
  menuEl.id = 'context-menu';
  menuEl.hidden = true;
  document.body.appendChild(menuEl);
  document.addEventListener('click', () => { if (Date.now() - menuOpenedAt > 400) hide(); });   // not the click that ends a long press
  document.addEventListener('scroll', () => hide(), true);
  window.addEventListener('blur', () => hide());

  const stage = document.getElementById('stage');
  // (On a word marked as misspelt — ui/shell/spellcheck.js —: its suggestions first, as in Word.)
  // (Elsewhere the menu opens at once, as always: only a marked word waits for its suggestions.)
  const openStageMenu = (x, y, target, touch, extra) => {
    const blockEl = target && target.closest('.block'), word = blockEl && !extra ? spellAt(x, y) : null;
    if (word) { spellMenu(word, x, y).then(items => openStageMenu(x, y, target, touch, items)); return; }
    extra ||= [];
    if (blockEl) {
      if (!isSelected(blockEl.dataset.id)) commit(() => setSelection(blockEl.dataset.id), { history: false });
      const td = target.closest('td[data-r]');
      open(x, y, [...extra, ...forBlock(selectedBlock(), td ? { r: +td.dataset.r, c: +td.dataset.c } : null)]);
    } else {
      open(x, y, forCanvas());
    }
  };
  stage.addEventListener('contextmenu', e => { e.preventDefault(); openStageMenu(e.clientX, e.clientY, e.target); });

  const nav = document.getElementById('navigator');
  const openNavMenu = (x, y, target, touch = false) => {
    const head = target && target.closest('.section-head');
    if (head) { open(x, y, forSection(head.dataset.sectionId)); return; }
    // (The master view: its masters and layouts.)
    const lt = target && target.closest('.layout-thumb');
    if (lt) { open(x, y, masterMenu(lt.dataset.edit)); return; }
    if (state.ui.editMaster) { open(x, y, masterMenu(state.ui.editMaster === true ? 'master' : state.ui.editMaster)); return; }
    const th = target && target.closest('.thumb');
    if (th) {
      const i = +th.dataset.index; state.ui.navFocus = true;
      // A long press on a touch screen starts picking slides (checkboxes); while picking, it opens the menu.
      if (touch && !state.ui.slidePick) { commit(() => { state.ui.slidePick = true; state.ui.slideIndex = i; state.ui.slideSel = []; state.ui.slideAnchor = state.deck.slides[i]?.id; state.ui.selection = null; }, { history: false }); return; }
      // (On one of the selected slides: the menu is for all of them.)
      if (!isSlideSelected(state.deck.slides[i]?.id)) selectSlide(i);
      open(x, y, forThumb(i)); return;
    }
    open(x, y, [['Nueva diapositiva', () => addSlide()]]);
  };
  // (A touch long press is handled by initLongPress, below: iOS fires no `contextmenu`.)
  nav.addEventListener('contextmenu', e => { e.preventDefault(); openNavMenu(e.clientX, e.clientY, e.target); });

  initLongPress([[stage, openStageMenu], [nav, openNavMenu]]);
}

// ---- touch: a long press is the right click ---------------------------------
// On a phone or tablet, holding a finger down must open Revela's own menu, not the
// system's: no text selection with its magnifier, no iOS callout (Copy, Share, Look
// up), no dragging an image out, no Android "download image". The system's way is
// kept only where text is being edited (a text box or table cell in edit, the notes,
// fields of dialogs), where selecting words and Copy/Paste are what one wants.
// - iOS Safari never fires `contextmenu` for a long press, so a timer of our own
//   (pointer events: 500 ms, still within 10 px; a second finger — a pinch —, a
//   scroll or the browser taking over the gesture, `pointercancel`, call it off).
// - Chrome on Android does fire `contextmenu` (as the timer runs): it is turned into
//   the same menu at once, and only once.
// - The CSS (html.touch-ui in ui/styles/tokens.css) keeps the system from selecting
//   and from its callout while the finger is down, which no event can stop on iOS.
// - The finger lifted after the menu opened must not "click": that would close the
//   menu or act on what is under it.
// Elsewhere (ribbon, title bar, panes) there is no menu, as with a right click on a
// computer: the long press just does nothing. The presentation runs in its own frame
// (ui/shell/present.js) and keeps the browser's behaviour.
export const LONG_PRESS_MS = 500, LONG_PRESS_SLOP = 10;
const TEXT_INPUT = /^(text|search|url|tel|email|password|number|date|datetime-local|month|time|week)$/;
// Where the system's selection and menu belong: text being edited.
export function editingText(el) {
  el = el?.nodeType === 1 ? el : el?.parentElement;
  if (!el) return false;
  if (el.closest('textarea, math-field')) return true;
  const inp = el.closest('input'); if (inp) return TEXT_INPUT.test(inp.type || 'text');
  return !!el.closest('[contenteditable]')?.isContentEditable;
}

function initLongPress(routes) {
  const root = document.documentElement;
  // (The class follows the last pointer used: with a mouse, text in dialogs can be selected as always.)
  if (matchMedia('(hover: none) and (pointer: coarse)').matches) root.classList.add('touch-ui');
  const down = new Set();           // touch pointers down now (two or more: a pinch)
  let press = null, firedAt = 0, lastTouch = 0;
  const cancel = () => { if (press) clearTimeout(press.timer); press = null; };
  const fire = () => {
    const p = press; cancel(); if (!p) return;
    firedAt = Date.now(); menuOpenedAt = firedAt;
    const at = document.elementFromPoint(p.x, p.y) || p.target, route = routes.find(([el]) => el.contains(at));
    if (route) route[1](p.x, p.y, at, true);
  };
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') { root.classList.remove('touch-ui'); return; }
    root.classList.add('touch-ui'); lastTouch = Date.now(); firedAt = 0;
    down.add(e.pointerId);
    if (down.size > 1 || editingText(e.target) || e.target.closest?.('#context-menu, .modal-backdrop')) return cancel();
    cancel();
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target, timer: setTimeout(fire, LONG_PRESS_MS) };
  }, true);
  addEventListener('pointermove', e => {
    if (press?.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > LONG_PRESS_SLOP) cancel();
  }, true);
  const up = e => { down.delete(e.pointerId); if (press?.id === e.pointerId) cancel(); };
  addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  addEventListener('scroll', cancel, true);
  // Android's own long press: ours instead (now, if the timer hasn't fired yet), and the system's
  // only on text being edited — then the stage's handler must not open ours on top of it.
  addEventListener('contextmenu', e => {
    const touch = e.pointerType === 'touch' || (root.classList.contains('touch-ui') && Date.now() - lastTouch < 2000);
    if (!touch) return;
    e.stopImmediatePropagation();
    if (editingText(e.target)) return;
    e.preventDefault();
    if (press) fire();
  }, true);
  // Dragging an image or a link out of the page with a held finger; the app's own
  // drag and drop (draggable="true": reordering thumbnails) goes on.
  addEventListener('dragstart', e => {
    if (root.classList.contains('touch-ui') && Date.now() - lastTouch < 2000 && !e.target.closest?.('[draggable="true"]')) e.preventDefault();
  }, true);
  // The finger lifted after the menu opened: no mouse events nor click from it.
  addEventListener('touchend', e => { if (firedAt) e.preventDefault(); }, { capture: true, passive: false });
  addEventListener('click', e => {
    if (firedAt && Date.now() - firedAt < 5000) { e.preventDefault(); e.stopImmediatePropagation(); }
    firedAt = 0;
  }, true);
}

// Several selected: what can be done to all of them, with how many.
const counted = (es, n) => t(es).replace('{n}', n);
function forSlides(idx) {
  const d = state.deck, ss = idx.map(i => d.slides[i]), ids = ss.map(s => s.id), n = ss.length;
  const allHidden = ss.every(s => s.hidden), allUncounted = ss.every(s => s.uncounted);
  return [
    ['Nueva diapositiva', () => addSlide()],
    [counted('Duplicar {n} diapositivas', n), () => duplicateSlide()],
    [counted('Eliminar {n} diapositivas', n), () => deleteSlides(idx)],
    null,
    [counted('Cortar {n} diapositivas', n), () => cutSlides()],
    [counted('Copiar {n} diapositivas', n), () => copySlides()],
    ['Pegar diapositivas', hasSlideClip() ? () => pasteSlides() : null],
    null,
    [counted('Formato del fondo de {n} diapositivas…', n), () => openBackgroundDialog()],
    ss.some(s => master.layoutOf(s)) ? [counted('Restablecer {n} diapositivas', n), () => master.resetSlide()] : null,
    null,
    [counted(allHidden ? 'Mostrar {n} diapositivas' : 'Ocultar {n} diapositivas', n), () => toggleSlideHidden()],
    [counted(allUncounted ? 'Contar {n} diapositivas en la numeración' : 'No contar {n} diapositivas en la numeración', n),
      () => commit(() => ss.forEach(s => { if (allUncounted) delete s.uncounted; else s.uncounted = true; }))],
    null,
    [counted('Crear una sección con las {n} diapositivas', n), () => sectionFromSlides(ids)],
    ...d.sections.filter(sec => !ss.every(s => s.sectionId === sec.id))
      .map(sec => [t('Mover a la sección «{s}»').replace('{s}', sec.name), () => moveSlidesToSection(ids, sec.id)]),
    ss.some(s => s.sectionId) ? ['Quitar de la sección', () => moveSlidesToSection(ids, null)] : null,
    ...workItems(ss),
  ];
}

// Its status and who it's assigned to (one slide or several).
function workItems(ss) {
  const ids = ss.map(s => s.id), one = ss.length === 1 ? ss[0] : null;
  return [null,
    ...Object.entries(SLIDE_STATUS).map(([k, l]) => [`${ss.every(s => s.status === k) ? '✓ ' : ''}${t('Estado:')} ${t(l)}`, () => setSlideStatus(ids, k)]),
    ss.some(s => s.status) ? ['Quitar el estado', () => setSlideStatus(ids, null)] : null,
    [one?.owner ? t('Asignada a {who}…').replace('{who}', one.owner) : 'Asignar a alguien…', async () => {
      const v = await promptDialog(t('¿A quién se le asigna? (un nombre o un correo; vacío: a nadie)'), one?.owner || ''); if (v != null) setSlideOwner(ids, v); }]];
}

function forThumb(i) {
  const idx = selectedSlideIndices();
  if (idx.length > 1) return forSlides(idx);
  const slide = state.deck.slides[i];
  return [
    ['Nueva diapositiva', () => addSlide()],
    ['Duplicar diapositiva', () => duplicateSlide()],
    ['Eliminar diapositiva', () => deleteSlide(i)],
    null,
    ['Cortar diapositiva', () => cutSlides()],
    ['Copiar diapositiva', () => copySlides()],
    ['Pegar diapositivas', hasSlideClip() ? () => pasteSlides() : null],
    null,
    ['Presentar desde aquí', () => present({ fromCurrent: true })],
    ['Formato del fondo…', () => openBackgroundDialog()],
    master.layoutOf(slide) ? ['Editar su diseño en el patrón', () => master.editLayout(slide.layoutId)] : null,
    null,
    [slide.hidden ? 'Mostrar diapositiva' : 'Ocultar diapositiva', () => toggleSlideHidden(i)],
    [slide.uncounted ? 'Contar en la numeración' : 'No contar en la numeración (anexo)', () => commit(() => { if (slide.uncounted) delete slide.uncounted; else slide.uncounted = true; })],
    i > 0 ? [slide.vertical ? 'Sacar de la pila vertical' : 'Colocar debajo de la anterior (vertical)', () => slidesMod.toggleVertical(i)] : null,
    null,
    ['Crear sección aquí', () => addSectionAt(i)],
    slide.sectionId ? ['Quitar de la sección', () => setSlideSection(slide.id, null)] : null,
    ...workItems([slide]),
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
    [b.dragLive ? 'No se puede mover al presentar' : 'Se puede mover al presentar (arrastrándolo)', () => commit(() => { const x = currentSlide().blocks.find(y => y.id === b.id); if (!x) return; if (x.dragLive) delete x.dragLive; else x.dragLive = true; })],
    ['Eliminar', () => blocks.deleteBlock(b.id)],
    [b.shadow ? 'Quitar sombra' : 'Sombra', () => blocks.toggleShadow()],
    ['Guardar como imagen…', () => openSaveAsPicture()],
    ['Copiar formato', () => togglePainter()],
    format.hasStyleClip() ? ['Pegar formato', () => format.pasteStyle()] : null,
    ...(!['text', 'connector', 'lock'].includes(b.type) ? [['Vínculo…', () => openObjectLink(b)]] : []),
    null,
  ];

  // Type‑specific actions come first, right where the element is.
  if (b.type === 'text') {
    items.push(
      ['Editar texto', () => editText(b)],
      ['Alinear texto a la izquierda', () => format.align('left')],
      ['Centrar texto', () => format.align('center')],
      ['Alinear texto a la derecha', () => format.align('right')],
      ['Relleno y borde…', () => openBoxStyle(b)],
      ['Ajustar el tamaño de letra al cuadro', () => fitTextToBox(b)],
      [b.shrink ? 'No reducir el texto si no cabe' : 'Reducir el texto si no cabe', () => toggleShrink(b.id)],
      null);
  } else if (b.type === 'image') {
    items.push(
      ['Cambiar imagen…', () => changeImage(b)],
      ['Ajustar: contener', () => setFit(b, 'contain')],
      ['Ajustar: rellenar', () => setFit(b, 'cover')],
      ['Ajustes de imagen…', () => openImageAdjust(b)],
      ['Recortar', () => import('../canvas/imagecrop.js').then(m => m.startImageCrop(b))],
      ['Recortar a una proporción…', () => openImageCrop(b)],
      ['Texto alternativo…', () => openAlt(b)],
      [b.zoomable ? 'No ampliar al hacer clic' : 'Ampliar al hacer clic (al presentar)', () => commit(() => { if (b.zoomable) delete b.zoomable; else b.zoomable = true; })],
      [b.pano ? 'No es una foto de 360°' : 'Foto de 360° (se recorre al presentar)', () => commit(() => { if (b.pano) delete b.pano; else b.pano = true; })],
      ['Quitar fondo (IA)', () => removeBackground(b)],
      ['Editar con IA…', () => import('../dialogs/imageai.js').then(m => m.openImageAI(b))],
      ['Ampliar una zona de la imagen', () => startMagnifyDraw({ within: b })],
      ['Descargar la imagen', () => saveFile(b)],
      ...(isGif(b) ? [['Reproducción…', () => openMediaPlayback(b)]] : []),
      null);
  } else if (b.type === 'model') {
    items.push(
      ['Movimiento 3D…', () => openModel3D(b)],
      [b.puppet ? 'Dejar de controlar con la cámara' : 'Controlar con la cámara', () => togglePuppet(b)],
      [puppetTrying() === b.id ? 'Detener la prueba con la cámara' : 'Probar con la cámara', () => tryPuppet(b)],
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
  } else if (b.type === 'map') {
    items.push(['Editar mapa y paradas…', () => import('../dialogs/geomap.js').then(m => m.openMapEditor(b))], null);
  } else if (b.type === 'lock') {
    items.push(['Configurar candado…', () => import('../dialogs/lock.js').then(m => m.openLock(b))], null);
  } else if (b.type === 'camera') {
    items.push(
      ['Forma: círculo', () => commit(() => { b.shape = 'circle'; })],
      ['Forma: redondeada', () => commit(() => { b.shape = 'rounded'; })],
      ['Forma: rectángulo', () => commit(() => { b.shape = 'rect'; })],
      [b.mirror !== false ? 'No reflejar la imagen' : 'Reflejar la imagen', () => commit(() => { b.mirror = b.mirror === false; })],
      null,
      ['Filtros y fondo…', () => openCameraEffects(b)],
      ...Object.entries(CAMERA_BG_ITEMS).filter(([v]) => v !== (b.bg || '')).map(([v, l]) => [l, () => setCameraBackground(b, v)]),
      [cameraLive() ? 'Dejar de ver la cámara en el editor' : 'Ver la cámara en el editor', () => setCameraLive(!cameraLive())],
      null);
  } else if (b.type === 'figindex') {
    items.push(
      ['Mostrar figuras y tablas', () => blocks.setFigIndexKind('all')],
      ['Solo figuras', () => blocks.setFigIndexKind('figures')],
      ['Solo tablas', () => blocks.setFigIndexKind('tables')], null);
  } else if (b.type === 'magnify') {
    items.push(
      ['Colocar automáticamente', () => mag.placeAgain(b.id)],
      ['Al otro lado', () => mag.swapSide(b.id)],
      ['Ampliar una zona de esta lupa', () => startMagnifyDraw({ within: b })],
      [b.lines === 'none' ? 'Mostrar las líneas' : 'Quitar las líneas', () => commit(() => { b.lines = b.lines === 'none' ? 'corners' : 'none'; })], null);
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
      // (The cell right-clicked — or the block of them it is in —; on the table's frame, all of it: blocks.tableCellKeys.)
      [cell || blocks.hasTableCells(b) ? 'Sombreado de celda…' : 'Sombreado de la tabla…', () => openCellShading(b)],
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
  if (!['text', 'connector', 'figindex', 'slideref', 'magnify'].includes(b.type)) {
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
  // Several: tidy them up, give them the same size, or (two) swap them.
  const objs = sel.filter(x => x.type !== 'connector');
  if (objs.length > 1) items.push(null,
    ['Ordenar en cuadrícula', () => blocks.tidySelected('grid')], ['Ordenar en fila', () => blocks.tidySelected('row')], ['Ordenar en columna', () => blocks.tidySelected('col')],
    ['Igualar ancho', () => blocks.matchSize('w')], ['Igualar alto', () => blocks.matchSize('h')], ['Igualar tamaño', () => blocks.matchSize('both')],
    ...(objs.length === 2 ? [['Intercambiar', () => blocks.swapSelected()]] : []));
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

// What the menu offers for the selection now, [label, fn] (the command search lists it too).
export function contextItems() { const b = selectedBlocks().length === 1 ? selectedBlock() : null; return (b ? forBlock(b) : forCanvas()).filter(it => it?.[1]); }
function forCanvas() {
  return [
    ['Pegar', clip.hasClipboard() ? () => clip.paste() : null],
    ['Nuevo cuadro de texto', () => addText()],
    ['Seleccionar todo', currentSlide()?.blocks.some(b => !b.locked)
      ? () => commit(() => setMulti(currentSlide().blocks.filter(b => !b.locked).map(b => b.id)), { history: false }) : null],
    null,
    state.ui.editMaster ? null : ['Nueva diapositiva', () => addSlide()],
    ['Formato del fondo…', () => openBackgroundDialog()],
    null,
    [state.ui.showGuides ? 'Ocultar guías' : 'Mostrar guías', () => commit(() => (state.ui.showGuides = !state.ui.showGuides), { history: false })],
    [state.ui.snap === false ? 'Ajustar a otros objetos' : 'No ajustar a otros objetos', () => commit(() => (state.ui.snap = state.ui.snap === false), { history: false })],
    ...(state.ui.editMaster ? [null, ['Cerrar vista Patrón', () => master.toggleMasterEdit(false)]]
      : master.masterOf(currentSlide()).blocks?.length || master.layoutOf(currentSlide())?.blocks.some(b => !b.ph) || currentSlide()?.hideMaster ? [null, [currentSlide()?.hideMaster ? 'Mostrar gráficos del patrón' : 'Ocultar gráficos del patrón', () => master.toggleHideMaster()]] : []),
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
    const [label, fn, opt = {}] = item;                    // (opt.raw: shown as it is — a spelling suggestion —, not translated)
    const row = document.createElement('button');
    row.className = 'ctx-item' + (opt.cls ? ' ' + opt.cls : ''); row.textContent = opt.raw ? label : t(label); row.disabled = !fn;
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
