// Right‑click context menu. Actions adapt to what was clicked: a block, an
// image (extra processing options) or the empty canvas.

import { state, commit, currentSlide, selectedBlock, selectedBlocks, isSelected, setSelection } from '../../core/store.js';
import { uid } from '../../core/model.js';
import * as blocks from '../../features/document/blocks.js';
import * as shapeops from '../../features/document/shapeops.js';
import * as master from '../../features/document/master.js';
import * as clip from '../../features/document/clipboard.js';
import * as slidesMod from '../../features/document/slides.js';
import { openPollEditor } from '../dialogs/poll.js';
import { openCodeEditor } from '../dialogs/code.js';
import { fitTextToBox } from './canvas.js';
import { openLinkChart, refreshChart } from '../dialogs/data.js';
import { addText } from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import { addSlide, duplicateSlide, deleteSlide, goToSlide, toggleSlideHidden,
  addSectionAt, removeSection, setSlideSection } from '../../features/document/slides.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from '../dialogs/dialog.js';
import { renderLatex } from './canvas.js';
import { tablePresets, tableClass, tableVars, tableCSS } from '../../render/svg.js';
import { currentPalette, deckFg } from '../../features/design/palettes.js';

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
    items.push(['Editar ecuación…', () => openMath(b)], null);
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
    null,
    ['Nueva diapositiva', () => addSlide()],
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

function openImageAdjust(b) {
  if (document.getElementById('img-modal')) return;
  const a = Object.assign({ brightness: 100, contrast: 100, saturate: 100, opacity: 100 }, b.adj);
  const sl = (label, prop, max) =>
    `<label class="fr-l">${label} <input type="range" data-adj="${prop}" min="0" max="${max}" value="${a[prop]}"></label>`;
  const back = document.createElement('div');
  back.id = 'img-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:280px">
    <button class="modal-close">✕</button><h3>${t('Ajustes de imagen')}</h3>
    ${sl(t('Brillo'), 'brightness', 200)}${sl(t('Contraste'), 'contrast', 200)}
    ${sl(t('Saturación'), 'saturate', 200)}${sl(t('Opacidad'), 'opacity', 100)}
    <div class="fr-actions"><button class="fr-do" data-reset>${t('Restablecer')}</button></div>
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

// Visual equation editor: a palette of templates and symbols inserts LaTeX for
// the user, with a live preview — no need to know LaTeX.
const MATH_PALETTE = [
  ['Estructuras', [
    ['a/b', '\\frac{ }{ }'], ['√', '\\sqrt{ }'], ['ⁿ√', '\\sqrt[n]{ }'],
    ['xⁿ', '^{ }'], ['xₙ', '_{ }'], ['∑', '\\sum_{i=1}^{n} '], ['∏', '\\prod_{i=1}^{n} '],
    ['∫', '\\int_{a}^{b} '], ['lim', '\\lim_{x\\to 0} '], ['( )', '\\left( \\right)'],
    ['[ ]', '\\left[ \\right]'], ['{ }', '\\left\\{ \\right\\}'], ['|x|', '\\left| \\right|'],
    ['matriz', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'], ['vec', '\\vec{ }'], ['x̄', '\\bar{ }'], ['x̂', '\\hat{ }'],
  ]],
  ['Griegas', [
    ['α', '\\alpha '], ['β', '\\beta '], ['γ', '\\gamma '], ['δ', '\\delta '], ['ε', '\\epsilon '],
    ['θ', '\\theta '], ['λ', '\\lambda '], ['μ', '\\mu '], ['π', '\\pi '], ['ρ', '\\rho '],
    ['σ', '\\sigma '], ['τ', '\\tau '], ['φ', '\\phi '], ['ω', '\\omega '],
    ['Δ', '\\Delta '], ['Σ', '\\Sigma '], ['Π', '\\Pi '], ['Ω', '\\Omega '], ['Φ', '\\Phi '],
  ]],
  ['Operadores', [
    ['×', '\\times '], ['÷', '\\div '], ['±', '\\pm '], ['∓', '\\mp '], ['·', '\\cdot '],
    ['≠', '\\neq '], ['≤', '\\leq '], ['≥', '\\geq '], ['≈', '\\approx '], ['∞', '\\infty '],
    ['→', '\\to '], ['⇒', '\\Rightarrow '], ['∈', '\\in '], ['∉', '\\notin '], ['⊂', '\\subset '],
    ['∪', '\\cup '], ['∩', '\\cap '], ['∂', '\\partial '], ['∇', '\\nabla '], ['∀', '\\forall '], ['∃', '\\exists '],
  ]],
];
const MATHLIVE = 'https://cdn.jsdelivr.net/npm/mathlive@0.100.0/dist/mathlive.min.js';
let mathliveLoading;
function ensureMathlive() {
  if (window.customElements && customElements.get('math-field')) return Promise.resolve(true);
  if (!mathliveLoading) mathliveLoading = new Promise(res => {
    const s = document.createElement('script'); s.src = MATHLIVE;
    s.onload = () => customElements.whenDefined('math-field').then(() => res(true), () => res(false));
    s.onerror = () => res(false); document.head.appendChild(s);
  });
  return mathliveLoading;
}

// Visual, Symbolab‑style equation editor (MathLive): type and edit the formula
// as it looks, with a math keyboard — no LaTeX needed. Falls back to the palette
// editor if MathLive can't load.
async function openMath(b) {
  if (document.getElementById('math-modal')) return;
  const ok = await ensureMathlive();
  if (!ok) return openMathPalette(b);
  const back = document.createElement('div');
  back.id = 'math-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:420px;max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Editar ecuación')}</h3>
    <math-field class="mt-field"></math-field>
    <label class="fr-l" style="margin-top:2px"><span style="display:flex;justify-content:space-between">LaTeX
      <button class="mt-toggle" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px">${t('Ocultar')}</button></span>
      <textarea class="mt-tex" rows="2" style="font-family:monospace"></textarea></label>
    <div class="fr-actions"><button class="mini2 mt-kbd">⌨ ${t('Teclado')}</button><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const mf = back.querySelector('math-field');
  const tex = back.querySelector('.mt-tex');
  mf.mathVirtualKeyboardPolicy = 'manual';
  mf.value = b.latex || ''; tex.value = b.latex || '';
  mf.addEventListener('input', () => { tex.value = mf.value; blocks.setMath(mf.value); });
  tex.addEventListener('input', () => { mf.value = tex.value; blocks.setMath(tex.value); });
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.mt-kbd').addEventListener('click', () => { try { window.mathVirtualKeyboard.show(); } catch {} mf.focus(); });
  back.querySelector('.mt-toggle').addEventListener('click', ev => {
    const hidden = tex.style.display === 'none';
    tex.style.display = hidden ? '' : 'none'; ev.target.textContent = hidden ? t('Ocultar') : t('Mostrar');
  });
  back.querySelector('.fr-do').addEventListener('click', close);
  setTimeout(() => { mf.focus(); try { window.mathVirtualKeyboard.show(); } catch {} }, 50);
}

function openMathPalette(b) {
  if (document.getElementById('math-modal')) return;
  const back = document.createElement('div');
  back.id = 'math-modal'; back.className = 'modal-backdrop';
  const groups = MATH_PALETTE.map(([name, items]) =>
    `<div class="mt-sec">${name}</div><div class="mt-grid">`
    + items.map(([lbl, snip]) => `<button type="button" class="mt-btn" data-snip="${snip.replace(/"/g, '&quot;')}">${lbl}</button>`).join('')
    + `</div>`).join('');
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:460px;max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Editar ecuación')}</h3>
    <div class="mt-preview"></div>
    ${groups}
    <label class="fr-l" style="margin-top:8px">LaTeX
      <textarea class="mt-in" rows="2" style="font-family:monospace">${(b.latex || '').replace(/</g, '&lt;')}</textarea></label>
    <div class="fr-actions"><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  const ta = back.querySelector('.mt-in'), preview = back.querySelector('.mt-preview');
  const update = () => { blocks.setMath(ta.value); renderLatex(preview, ta.value); };
  const insert = snip => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + snip + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + snip.length; ta.focus(); update();
  };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('.mt-btn').forEach(x => x.addEventListener('click', () => insert(x.dataset.snip)));
  ta.addEventListener('input', update);
  back.querySelector('.fr-do').addEventListener('click', close);
  renderLatex(preview, ta.value); ta.focus();
}

function openChartData(b) {
  if (document.getElementById('chart-modal')) return;
  const lines = blocks.chartGridText(b).replace(/</g, '&lt;');
  const back = document.createElement('div');
  back.id = 'chart-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Datos del gráfico')}</h3>
    <label class="fr-l">${t('Tipo')} <select class="ch-type">
      <option value="bar">${t('Barras')}</option><option value="line">${t('Líneas')}</option><option value="area">${t('Área')}</option>
      <option value="pie">${t('Circular')}</option><option value="doughnut">${t('Dona')}</option>
      <option value="scatter">${t('Dispersión')}</option><option value="radar">${t('Radar')}</option></select></label>
    <label class="fr-l">${t('Color (barras)')} <input type="color" class="ch-color" value="${b.color || '#3f6497'}"></label>
    <label class="fr-chk"><input type="checkbox" class="ch-combo"${b.combo ? ' checked' : ''}> ${t('Combinado: series extra como líneas')}</label>
    <label class="fr-l">${t('Datos: etiqueta y una columna por serie; primera fila opcional con los nombres')}
      <textarea class="ch-data" rows="6" style="font-family:monospace">${lines}</textarea></label>
    <div class="fr-actions"><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  back.querySelector('.ch-type').value = b.chartType || 'bar';
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.fr-do').addEventListener('click', () => {
    blocks.setChartGrid(back.querySelector('.ch-data').value, { chartType: back.querySelector('.ch-type').value,
      color: back.querySelector('.ch-color').value, combo: back.querySelector('.ch-combo').checked });
    close();
  });
}

function openOpacity(b) {
  if (document.getElementById('op-modal')) return;
  const back = document.createElement('div');
  back.id = 'op-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:260px">
    <button class="modal-close">✕</button><h3>${t('Opacidad')}</h3>
    <label class="fr-l"><span class="op-val">${b.opacity ?? 100}%</span>
      <input type="range" class="op-range" min="0" max="100" value="${b.opacity ?? 100}"></label></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.op-range').addEventListener('input', e => {
    back.querySelector('.op-val').textContent = e.target.value + '%'; blocks.setOpacity(e.target.value);
  });
}

function openIconColor(b) {
  if (document.getElementById('icon-modal')) return;
  const back = document.createElement('div');
  back.id = 'icon-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="min-width:220px">
    <button class="modal-close">✕</button><h3>${t('Color del icono')}</h3>
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
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:280px">
    <button class="modal-close">✕</button><h3>${t('Relleno y borde')}</h3>
    <label class="fr-l">${t('Relleno')} <input type="color" class="bx-fill" value="${b.bg || '#3f6497'}"></label>
    <label class="fr-l">${t('Borde')} <input type="color" class="bx-border" value="${b.borderColor || '#1e2a3a'}"></label>
    <label class="fr-l">${t('Redondeo (px)')} <input type="range" class="bx-radius" min="0" max="40" value="${b.radius || 0}"></label>
    <div class="fr-actions"><button class="fr-do" data-clear>${t('Sin relleno/borde')}</button></div>
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

function slideShortLabel(s, i) {
  const tb = (s.blocks || []).find(x => x.type === 'text' && x.html);
  const d = document.createElement('div'); d.innerHTML = tb ? tb.html : '';
  const txt = (d.textContent || '').trim().slice(0, 40);
  return `${i + 1}. ${txt || t('Diapositiva') + ' ' + (i + 1)}`;
}
function openSlidePicker(b) {
  if (document.getElementById('sp-modal')) return;
  const back = document.createElement('div');
  back.id = 'sp-modal'; back.className = 'modal-backdrop';
  const items = state.deck.slides.map((s, i) =>
    `<button class="sp-item${s.id === b.target ? ' on' : ''}" data-id="${s.id}">${slideShortLabel(s, i).replace(/</g, '&lt;')}</button>`).join('');
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px;max-height:70vh;overflow:auto">
    <button class="modal-close">✕</button><h3>${t('Elegir diapositiva…')}</h3>
    <div class="sp-list">${items}</div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('.sp-item').forEach(x => x.addEventListener('click', () => { blocks.setSlideRefTarget(x.dataset.id); close(); }));
}

function openCaption(b) {
  if (document.getElementById('cap-modal')) return;
  const back = document.createElement('div');
  back.id = 'cap-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Descripción')}</h3>
    <label class="fr-l"><input class="cap-in" type="text" value="${(b.caption || '').replace(/"/g, '&quot;')}" placeholder="${t('Descripción')}"></label>
    <div class="fr-actions"><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove(); const inp = back.querySelector('.cap-in');
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const apply = () => { blocks.setCaption(inp.value.trim()); close(); };
  back.querySelector('.fr-do').addEventListener('click', apply);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
  inp.focus();
}

export function openAlt(b) {
  if (document.getElementById('alt-modal')) return;
  const back = document.createElement('div');
  back.id = 'alt-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Texto alternativo')}</h3>
    <label class="fr-l">${t('Descripción para accesibilidad')}
      <input class="alt-in" type="text" value="${(b.alt || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-chk"><input type="checkbox" class="alt-deco"${b.decorative ? ' checked' : ''}> ${t('Marcar como decorativo')}</label>
    <div class="fr-actions"><button class="fr-do">${t('Guardar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.fr-do').addEventListener('click', () => { blocks.setAlt(back.querySelector('.alt-in').value, back.querySelector('.alt-deco').checked); close(); });
  back.querySelector('.alt-in').focus();
}

function openImageCrop(b) {
  if (document.getElementById('crop-modal')) return;
  const c = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, b.crop);
  const sl = (label, side) =>
    `<label class="fr-l">${label} <input type="range" data-crop="${side}" min="0" max="45" value="${c[side]}"></label>`;
  const back = document.createElement('div');
  back.id = 'crop-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:280px">
    <button class="modal-close">✕</button><h3>${t('Recortar imagen (%)')}</h3>
    ${sl(t('Arriba'), 'top')}${sl(t('Derecha'), 'right')}${sl(t('Abajo'), 'bottom')}${sl(t('Izquierda'), 'left')}
    <div class="fr-actions"><button class="fr-do" data-reset>${t('Restablecer')}</button></div>
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
    alertDialog('No se pudo quitar el fondo: ' + e.message);
  } finally {
    el?.classList.remove('processing');
  }
}

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

// Table styles gallery + options (PowerPoint "Table Design").
function openTableStyle(b) {
  document.getElementById('ts-modal')?.remove();
  const presets = tablePresets(currentPalette());
  const sample = p => { const m = { ...p, rows: [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']] };
    return `<table class="${tableClass(m)}" style="${tableVars(m)}">${m.rows.map(r => `<tr>${r.map(() => '<td></td>').join('')}</tr>`).join('')}</table>`; };
  const back = document.createElement('div');
  back.id = 'ts-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Estilo de tabla')}</h3>
    <style>${tableCSS('.ts-grid ')} .ts-grid table.tbl td{height:9px;padding:0}</style>
    <div class="ts-grid">${Object.entries(presets).map(([k, p]) =>
      `<button type="button" data-ts="${k}" title="${t(p.name)}"><div class="ts-sample" style="color:${deckFg()}">${sample(p)}</div><span>${t(p.name)}</span></button>`).join('')}</div>
    <div class="ts-opts">
      <label><input type="checkbox" data-o="header"> ${t('Fila de encabezado')}</label>
      <label><input type="checkbox" data-o="banded"> ${t('Filas con bandas')}</label>
      <label><input type="checkbox" data-o="firstCol"> ${t('Primera columna')}</label>
      <label><input type="checkbox" data-o="lines"> ${t('Solo líneas horizontales')}</label>
    </div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const sync = () => back.querySelectorAll('[data-o]').forEach(c => (c.checked = !!b[c.dataset.o]));
  back.querySelectorAll('[data-ts]').forEach(x => x.addEventListener('click', () => {
    const { name, ...p } = presets[x.dataset.ts]; blocks.setTableStyle(p); sync();
  }));
  back.querySelectorAll('[data-o]').forEach(c => c.addEventListener('change', () => blocks.setTableStyle({ [c.dataset.o]: c.checked })));
  sync();
}
