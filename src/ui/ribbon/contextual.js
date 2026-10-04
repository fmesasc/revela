// Contextual tab (like PowerPoint's "Shape Format", "Picture Format", "3D Model"):
// while an object is selected, a tab named after it appears at the end of the
// ribbon with all of its options, so nothing needs a right click. It goes
// away when nothing is selected. Several objects: arranging them.

import { DIAGRAM_LAYOUTS, DIAGRAM_COLORS, readableOn } from '../../render/diagrams.js';
import { openDiagramText } from '../dialogs/diagram.js';
import * as files from '../../features/content/files.js';
import { modelClips } from '../canvas/mediaview.js';
import { shortSig } from '../../core/text.js';
import { state, commit, currentSlide, selectedBlock, selectedBlocks } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { togglePopover } from './popovers.js';
import * as format from '../../features/document/format.js';
import * as shapeops from '../../features/document/shapeops.js';
import { MOTIONS_3D, VIEWS_3D, BLEEDS_3D, EDGES_3D, ARRIVALS_3D, PUPPET_MODES, PUPPET_DEFAULT, modelBleed } from '../../features/content/model3d.js';
import { isGif, CAMERA_FILTERS, CAMERA_BACKGROUNDS, DEFAULT_CAMERA_COLOR, cameraBrightness, setCameraLook } from '../../features/live/media.js';
import { cameraLive, setCameraLive, setCameraBackground, pickCameraImage } from '../canvas/cameraview.js';
import { puppetTrying, tryPuppet, togglePuppet } from '../canvas/puppetview.js';
import { CURVES, DEVICES, SHAPE_NAMES, hasShapeText, CONNECTOR_ROUTES, isLineShape } from '../../render/svg.js';
import { styled } from '../../features/document/master.js';
import { saveBlockFile as saveFile } from '../shell/files.js';
import { openModel3D } from '../dialogs/model3d.js';
import { openAutoRig } from '../dialogs/autorig.js';
import { openMediaPlayback } from '../dialogs/media.js';
import { openSaveAsPicture } from '../dialogs/picture.js';
import { openPollEditor } from '../dialogs/poll.js';
import { openCodeEditor } from '../dialogs/code.js';
import { openLinkChart, refreshChart } from '../dialogs/data.js';
import { openImageAdjust, openMath, openChartData, openOpacity, openIconColor, openBoxStyle, openSlidePicker, openCaption, openAlt, openImageCrop, removeBackground, openTableStyle } from '../dialogs/object.js';
import { alertDialog, promptDialog } from '../dialogs/dialog.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { openAddAnimation } from './animadd.js';
import { openAnimPanel } from '../panels/animation.js';
import { animsOf, setAnimation, clearAnimation } from '../../features/animation/transitions.js';
import { playAnimations } from '../canvas/preview.js';
import { playInEditor } from '../canvas/mediaview.js';
import { fitTextToBox } from '../canvas/canvas.js';
import { editText } from '../canvas/content.js';
import { MAP_SCOPES } from '../../features/content/maps.js';
import { openObjectLink } from '../dialogs/objlink.js';
import { t } from '../../i18n/index.js';

const TITLES = { diagram: 'Diagrama', file: 'Archivo', shape: 'Forma', image: 'Imagen', model: 'Modelo 3D', video: 'Vídeo', audio: 'Audio', text: 'Cuadro de texto', table: 'Tabla', chart: 'Gráfico',
  math: 'Ecuación', code: 'Código', poll: 'Votación', embed: 'Web', icon: 'Icono', camera: 'Cámara', slideref: 'Zoom', figindex: 'Índice', ink: 'Dibujo', connector: 'Conector', timer: 'Cuenta atrás' };
// Every shape once (the catalogue's first name for each).
const SHAPES = Object.entries(SHAPE_NAMES).filter(([k]) => !isLineShape(k) && k !== 'freeform');
const CHARTS = [['bar', 'Barras'], ['stacked', 'Barras apiladas'], ['stacked100', 'Barras apiladas al 100 %'], ['hbar', 'Barras horizontales'], ['histogram', 'Histograma'], ['line', 'Líneas'], ['area', 'Área'], ['stackedArea', 'Áreas apiladas'], ['pie', 'Circular'], ['doughnut', 'Dona'], ['scatter', 'Dispersión'], ['radar', 'Radar'], ['bubble', 'Burbujas'], ['treemap', 'Rectángulos (treemap)'], ['waterfall', 'Cascada'], ['funnel', 'Embudo'], ['map', 'Mapa']];
// A map chart: its outlines come from the internet the first time.
const formulaHelp = () => alertDialog([t('Escribe en una celda una fórmula que empiece por «=»:'), '=SUMA(ARRIBA) · =PROMEDIO(B2:B5) · =B2*C2',
  t('Funciones: SUMA, PROMEDIO, MIN, MAX, CONTAR, PRODUCTO, REDONDEAR y ABS (también sus nombres en inglés).'),
  t('Direcciones: ARRIBA, DEBAJO, IZQUIERDA y DERECHA. Celdas: la letra de la columna y el número de la fila (A1, B2:B5).'),
  t('La celda muestra el resultado; al escribir en ella, la fórmula.')].join('\n\n'));
const chartMap = (b, scope) => blocks.setChartMap(b.id, scope).catch(e => alertDialog(t('No se pudo cargar el mapa:') + ' ' + (e.message || e)));

// A control: ['btn', icon, label, fn, on?] · ['color', icon, label, value, fn] · ['select', label, [[v, l]], value, fn] · ['num', label, value, fn, min, max, step]
const btn = (icon, label, fn, on = false, key = '') => ['btn', icon, label, fn, on, key];
// Icon only (the name as a tooltip): the blocks every object tab ends with.
const ico = (icon, label, fn, on = false, key = '') => ['ibtn', icon, label, fn, on, key];
const set = (b, fn) => commit(() => { const x = currentSlide().blocks.find(y => y.id === b.id); if (x) fn(x); });
function replaceModel(b) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.glb,.gltf,model/gltf-binary';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => set(b, x => { x.src = r.result.replace(/^data:[^;]*/, 'data:model/gltf-binary'); delete x.clip; delete x.walk; }); r.readAsDataURL(f); };
  inp.click();
}
const clipsOf = b => modelClips(b.id);
// "Controlar con la cámara": on/off, then what it follows, mirror, your picture small, and trying it here.
const setPuppet = (b, k, v) => set(b, x => { x.puppet = { ...PUPPET_DEFAULT, ...x.puppet, [k]: v }; });
function puppetControls(b) {
  const p = b.puppet, trying = puppetTrying() === b.id;
  return [btn('video_camera_front', 'Controlar con la cámara', () => togglePuppet(b), !!p, 'puppet'),
    ...(p ? [['select', 'Sigue', PUPPET_MODES, p.mode || 'body', v => setPuppet(b, 'mode', v)],
      btn('flip', 'Espejo', () => setPuppet(b, 'mirror', p.mirror === false), p.mirror !== false, 'puppet-mirror'),
      btn('picture_in_picture', 'Mostrar mi vídeo en pequeño', () => setPuppet(b, 'preview', !p.preview), !!p.preview, 'puppet-preview')] : []),
    btn(trying ? 'stop_circle' : 'play_circle', trying ? 'Detener' : 'Probar con la cámara', () => tryPuppet(b), trying, 'puppet-try')];
}
// Text round it (PowerPoint's "Wrap text: Square"): the text boxes it overlaps leave it a gap.
const wrapBtn = b => btn('wrap_text', 'Texto alrededor', () => set(b, x => { if (x.wrap) delete x.wrap; else x.wrap = true; }), !!b.wrap);

function groupsFor(b) {
  const G = [];
  if (b.type === 'shape') G.push(
    ['Estilo de forma', [['color', 'format_color_fill', 'Relleno', b.fill && b.fill !== 'none' ? b.fill : '#3f6497', v => blocks.setShapeStyle('fill', v)],
      ['color', 'border_color', 'Borde', b.stroke || '#1e2a3a', v => blocks.setShapeStyle('stroke', v)],
      ['num', 'Grosor', b.strokeWidth ?? 2, v => blocks.setShapeStyle('strokeWidth', Math.max(0, +v || 0)), 0, 40, 1],
      ['select', 'Línea', [['solid', '━ Continua'], ['dash', '╍ Guiones'], ['dot', '┈ Puntos'], ['dashDot', '─·─ Guion y punto']], b.dash || 'solid', v => blocks.setLineDash(v)],
      btn('format_color_reset', 'Sin relleno', () => blocks.setShapeStyle('fill', 'none'), b.fill === 'none'),
      // (A hand-drawn look: PowerPoint's "Sketched" outline.)
      btn('draw', 'Trazo a mano', () => set(b, x => { if (x.sketch) delete x.sketch; else x.sketch = true; }), !!b.sketch)]],
    // Gradient (PowerPoint's "Gradient fill").
    ['Relleno', [['select', 'Tipo de relleno', [['solid', 'Sólido'], ['linear', 'Degradado lineal'], ['radial', 'Degradado radial']], b.fill2 ? b.gradType || 'linear' : 'solid',
        v => set(b, x => { if (v === 'solid') { delete x.fill2; delete x.gradType; } else { x.fill2 ||= '#ffffff'; x.gradType = v; } })],
      ...(b.fill2 ? [['color', 'gradient', 'Segundo color', b.fill2, v => set(b, x => { x.fill2 = v; })]] : []),
      ...(b.fill2 && b.gradType !== 'radial' ? [['num', 'Ángulo', b.gradAngle ?? 0, v => set(b, x => { x.gradAngle = ((+v || 0) % 360 + 360) % 360; }), 0, 359, 15]] : [])]],
    ['Forma', [['select', 'Cambiar forma', SHAPES, b.shape, v => set(b, x => { x.shape = v; })], wrapBtn(b),
      ...(hasShapeText(b) ? [btn('edit_note', 'Escribir texto', () => editText(b.id, { selectAll: false }))] : [])]]);
  else if (b.type === 'image') G.push(
    ['Ajustar', [btn('tune', 'Ajustes', () => openImageAdjust(b)), btn('crop', 'Recortar', () => openImageCrop(b)), btn('auto_fix_high', 'Quitar fondo', () => removeBackground(b)),
      btn('fit_screen', 'Contener', () => set(b, x => { x.fit = 'contain'; }), (b.fit || 'contain') === 'contain'), btn('crop_free', 'Rellenar', () => set(b, x => { x.fit = 'cover'; }), b.fit === 'cover'),
      btn('open_in_full', 'Estirar', () => set(b, x => { x.fit = 'fill'; }), b.fit === 'fill'), btn('aspect_ratio', 'Proporción original', () => blocks.cropToRatio(b.id, 'original'))]],
    // A mockup: the picture inside a phone, a laptop… (filling its screen).
    ['Dispositivo', [['select', 'Dentro de un dispositivo', DEVICES, b.device || '', v => set(b, x => { if (v) { x.device = v; x.fit = 'cover'; } else delete x.device; })]]],
    ['Organizar texto', [wrapBtn(b)]],
    ['Al presentar', [btn('zoom_in', 'Ampliar al clic', () => set(b, x => { if (x.zoomable) delete x.zoomable; else x.zoomable = true; }), !!b.zoomable),
      ...(isGif(b) ? [btn('slow_motion_video', 'Reproducción', () => openMediaPlayback(b))] : [])]],
    ['Archivo', [btn('download', 'Descargar', () => saveFile(b)), btn('photo_camera', 'Guardar como imagen', () => openSaveAsPicture())]]);
  else if (b.type === 'model') {
    const names = clipsOf(b), opts = [['', 'Ninguna'], ...(names.length ? names : ['*']).map(n => [n, n === '*' ? 'La primera' : n])];
    G.push(
      ['Animación', [['select', 'En reposo', opts, b.clip || '', v => set(b, x => { if (v) x.clip = v; else delete x.clip; })],
        btn('motion_photos_on', 'Movimiento 3D', () => openModel3D(b)),
        btn('autorenew', 'Girar solo', () => set(b, x => { x.autoRotate = !(x.autoRotate !== false); }), b.autoRotate !== false && !b.walk?.clip)]],
      // (The model moves with whoever is in front of the camera: io/runtime/puppet.js.)
      ['Con la cámara', puppetControls(b)],
      ['Al moverse', [['select', 'Mientras se mueve', [['', 'Nada'], ...names.map(n => [n, n])], b.walk?.clip || '', v => set(b, x => {
        if (v) x.walk = { end: '', endOnce: true, face: true, look: true, ...x.walk, clip: v }; else delete x.walk; })],
        btn('play_circle', 'Probar', () => playAnimations())]],
      ['Vista', [['select', 'Cámara', VIEWS_3D, b.view || '', v => set(b, x => { if (v) x.view = v; else delete x.view; })],
        ['select', 'Al entrar', MOTIONS_3D, b.motion || 'none', v => set(b, x => { if (v !== 'none') x.motion = v; else delete x.motion; })]]],
      // (When the same model was on the slide before: Morph, or the same file.)
      ['Desde la anterior', [['select', 'Llega', ARRIVALS_3D, b.arrive || 'keep', v => set(b, x => { if (v !== 'keep') x.arrive = v; else delete x.arrive; })]]],
      // (So that a hand waving or a jump is not cut by the frame.)
      ['Encuadre', [['select', 'Margen', BLEEDS_3D, String(b.bleed != null ? Math.max(1, Math.min(3, +b.bleed || 1)) : modelBleed({ ...b, edge: '' })), v => set(b, x => { x.bleed = +v; })],
        ['select', 'Bordes', EDGES_3D, b.edge || 'hard', v => set(b, x => { if (v !== 'hard') x.edge = v; else delete x.edge; })]]],
      ['Esqueleto', [btn('accessibility_new', 'Esqueleto automático', () => openAutoRig(b))]],
      ['Archivo', [btn('download', 'Descargar (.glb)', () => saveFile(b)), btn('swap_horiz', 'Reemplazar', () => replaceModel(b))]]);
  } else if (b.type === 'video') G.push(
    ['Reproducción', [btn('play_arrow', 'Reproducir', () => playInEditor(b.id)), btn('tune', 'Opciones', () => openMediaPlayback(b))]],
    ['Archivo', [btn('download', 'Descargar', () => saveFile(b))]]);
  else if (b.type === 'audio') {
    // PowerPoint's "Play in background": it starts by itself, keeps playing over
    // the next slides (up to one, or to the end), loops, and hides its icon.
    const slides = state.deck.slides, here = slides.findIndex(s => s.blocks.includes(b));
    const until = [['', 'Solo en esta diapositiva'], ...slides.slice(here + 1).map((s, k) => [s.id, `${t('Hasta la diapositiva')} ${here + k + 2}`]), ['end', 'Hasta el final']];
    G.push(['Reproducción', [btn('play_arrow', 'Reproducir', () => playInEditor(b.id)),
      btn('play_circle', 'Empezar solo', () => set(b, x => { if (x.autoplay) delete x.autoplay; else x.autoplay = true; }), !!b.autoplay),
      btn('repeat', 'Repetir', () => set(b, x => { if (x.loop) delete x.loop; else x.loop = true; }), !!b.loop),
      ['select', 'Sigue sonando', until, b.until && (b.until === 'end' || slides.some(s => s.id === b.until)) ? b.until : '', v => set(b, x => { if (v) { x.until = v; x.autoplay = true; } else delete x.until; })],
      btn('visibility_off', 'Ocultar al presentar', () => set(b, x => { if (x.hideIcon) delete x.hideIcon; else x.hideIcon = true; }), !!b.hideIcon)]],
      ['Archivo', [btn('download', 'Descargar', () => saveFile(b))]]);
  }
  else if (b.type === 'text') G.push(
    ['Fuente', [['select', 'Tipo de letra', fontOptions(), b.fontFamily || '', v => format.fontFamily(v)],
      ['num', 'Tamaño', Math.round(styled(b, currentSlide()).fontSize || 40), v => format.setFontSize(parseInt(v, 10) || 40), 6, 400, 2],
      ['ibtn', 'format_bold', 'Negrita', () => format.exec('bold')], ['ibtn', 'format_italic', 'Cursiva', () => format.exec('italic')],
      ['ibtn', 'format_underlined', 'Subrayado', () => format.exec('underline')],
      ['color', 'format_color_text', 'Color del texto', /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#ffffff', v => format.color(v)]]],
    ['Párrafo', [['ibtn', 'format_align_left', 'Alinear texto a la izquierda', () => format.align('left'), (b.textAlign || 'left') === 'left'],
      ['ibtn', 'format_align_center', 'Centrar texto', () => format.align('center'), b.textAlign === 'center'],
      ['ibtn', 'format_align_right', 'Alinear texto a la derecha', () => format.align('right'), b.textAlign === 'right'],
      ['ibtn', 'format_align_justify', 'Justificar', () => format.align('justify'), b.textAlign === 'justify'],
      ['ibtn', 'format_list_bulleted', 'Viñetas', () => format.list('insertUnorderedList')], ['ibtn', 'format_list_numbered', 'Lista numerada', () => format.list('insertOrderedList')],
      ['ibtn', 'vertical_align_top', 'Alinear el texto arriba del cuadro', () => format.setVAlign('top'), (b.vAlign || 'top') === 'top'],
      ['ibtn', 'vertical_align_center', 'Centrar el texto en el cuadro', () => format.setVAlign('middle'), b.vAlign === 'middle'],
      ['ibtn', 'vertical_align_bottom', 'Alinear el texto abajo del cuadro', () => format.setVAlign('bottom'), b.vAlign === 'bottom'],
      ['select', 'Columnas', [['1', '1'], ['2', '2'], ['3', '3']], String(b.columns || 1), v => format.setColumns(+v)]]],
    ['Cuadro', [btn('format_color_fill', 'Relleno y borde', () => openBoxStyle(b)), btn('format_size', 'Ajustar letra al cuadro', () => fitTextToBox(b)),
      btn('compress', 'Reducir si no cabe', () => set(b, x => { if (x.shrink) delete x.shrink; else x.shrink = true; }), !!b.shrink),
      btn('format_paint', 'Copiar formato', () => format.copyStyle())]],
    ['Efectos de texto', [['select', 'Curvar texto', CURVES, String(b.curve || 0), v => set(b, x => { if (+v) x.curve = +v; else delete x.curve; })]]]);
  else if (b.type === 'table') G.push(
    ['Filas y columnas', [btn('table_rows', 'Añadir fila', () => blocks.tableAddRow()), btn('view_column', 'Añadir columna', () => blocks.tableAddCol()),
      btn('remove', 'Quitar fila', () => blocks.tableDelRow()), btn('remove', 'Quitar columna', () => blocks.tableDelCol())]],
    ['Estilo', [btn('title', 'Encabezado', () => blocks.tableToggleHeader(), !!b.header), btn('palette', 'Estilo de tabla', () => openTableStyle(b)), btn('bar_chart', 'Crear gráfico', () => blocks.chartFromTable())]],
    ['Cálculos', [btn('functions', 'Fila de totales', () => blocks.tableAddTotal()), btn('help', 'Fórmulas', () => formulaHelp())]]);
  else if (b.type === 'diagram') G.push(
    ['Diagrama', [['select', 'Diseño', DIAGRAM_LAYOUTS.flatMap(([, l]) => l), b.layout || 'process', v => blocks.setDiagram(b.id, { layout: v })],
      ['select', 'Colores', DIAGRAM_COLORS, b.colors || 'colorful', v => blocks.setDiagram(b.id, { colors: v })],
      btn('edit_note', 'Editar texto', () => openDiagramText(b))]],
    // Letters bigger or smaller than the automatic size (b.fontScale), and the colour of the words on the slide (b.textColor; automatic: one that reads on its background).
    ['Texto', [['num', 'Tamaño de letra (%)', Math.round((b.fontScale || 1) * 100), v => blocks.setDiagram(b.id, { fontScale: Math.round(+v || 100) === 100 ? null : Math.min(250, Math.max(50, +v)) / 100 }), 50, 250, 10],
      ['color', 'format_color_text', 'Color del texto', /^#[0-9a-f]{6}$/i.test(b.textColor || '') ? b.textColor : (o => readableOn(o.fg, o.back))(blocks.diagramOpts()), v => blocks.setDiagram(b.id, { textColor: v })],
      btn('format_color_reset', 'Color automático', () => blocks.setDiagram(b.id, { textColor: null }), !b.textColor)]],
    ['Opciones', [btn('format_list_numbered', 'Uno a uno al presentar', () => blocks.setDiagram(b.id, { oneByOne: !b.oneByOne }), !!b.oneByOne),
      btn('category', 'Convertir en formas', () => blocks.diagramToShapes(b.id))]]);
  else if (b.type === 'file') {
    const pdf = files.isPdf(b), busy = p => p.catch(e => alertDialog(t('No se pudo leer el PDF:') + ' ' + (e.message || e)));
    G.push(['Archivo', [btn(pdf ? 'open_in_new' : 'download', pdf ? 'Abrir' : 'Descargar', () => files.openFile(b)), ...(pdf ? [btn('download', 'Descargar', () => files.downloadFile(b))] : [])]]);
    if (pdf) G.push(['PDF', [['select', 'Mostrar como', [['page', 'Una página'], ['viewer', 'Visor de PDF'], ['icon', 'Icono']], b.display || 'page', v => busy(files.setFileDisplay(b, v))],
      ...(b.display !== 'icon' && b.pages > 1 ? [['num', 'Página', b.page || 1, v => busy(files.setPdfPage(b, +v)), 1, b.pages, 1]] : []),
      btn('library_add', 'Una diapositiva por página', () => busy(files.pdfToSlides(b.src)))]]);
  }
  else if (b.type === 'chart') G.push(['Datos', [btn('edit', 'Editar datos', () => openChartData(b)), btn('link', b.dataUrl ? 'Datos vinculados' : 'Vincular CSV', () => openLinkChart(b)),
    ...(b.dataUrl ? [btn('refresh', 'Actualizar', () => refreshChart(b))] : [])]],
    ['Diseño', [['select', 'Tipo de gráfico', CHARTS, b.chartType || 'bar', v => (v === 'map' ? chartMap(b, b.mapScope || 'world') : set(b, x => { x.chartType = v; }))],
      ...(b.chartType === 'map' ? [['select', 'Mapa de', MAP_SCOPES, b.mapScope || 'world', v => chartMap(b, v)]] : []),
      // (A histogram: how many intervals; 0, automatic — Sturges' rule.)
      ...(b.chartType === 'histogram' ? [['num', 'Intervalos (0: automático)', b.bins || 0, v => set(b, x => { if (+v > 0) x.bins = Math.min(60, Math.round(+v)); else delete x.bins; }), 0, 60, 1]] : []),
      ['color', 'format_color_fill', 'Color', b.color || '#3f6497', v => set(b, x => { x.color = v; })],
      btn('grid_4x4', 'Cuadrícula', () => set(b, x => { x.grid = !x.grid; }), !!b.grid),
      btn('pin', 'Etiquetas de datos', () => set(b, x => { x.dataLabels = !x.dataLabels; }), !!b.dataLabels)]]);
  else if (b.type === 'math') G.push(['Ecuación', [btn('functions', 'Editar ecuación', () => openMath(b)), btn('format_color_fill', 'Relleno y borde', () => openBoxStyle(b))]]);
  else if (b.type === 'code') G.push(['Código', [btn('code', 'Editar código y pasos', () => openCodeEditor(b))]]);
  else if (b.type === 'poll') G.push(['Votación', [btn('how_to_vote', 'Editar votación', () => openPollEditor(b))]]);
  // Ink replay: when presenting, the drawing traces itself (the "Draw" effect).
  // A connector: straight, elbow or curved; arrows at either end; its line.
  else if (b.type === 'connector') G.push(
    ['Conector', [['select', 'Trazado', CONNECTOR_ROUTES, b.route || 'straight', v => set(b, x => { if (v === 'straight') delete x.route; else x.route = v; })],
      btn('arrow_back', 'Flecha al inicio', () => set(b, x => { if (x.arrowStart) delete x.arrowStart; else x.arrowStart = true; }), !!b.arrowStart),
      btn('arrow_forward', 'Flecha al final', () => set(b, x => { x.arrow = x.arrow === false; }), b.arrow !== false)]],
    ['Línea', [['color', 'border_color', 'Color', b.color || '#8a8a8a', v => set(b, x => { x.color = v; })],
      ['num', 'Grosor', b.width || 3, v => set(b, x => { x.width = Math.max(1, Math.min(20, +v || 3)); }), 1, 20, 1],
      ['select', 'Línea', [['solid', '━ Continua'], ['dash', '╍ Guiones'], ['dot', '┈ Puntos'], ['dashDot', '─·─ Guion y punto']], b.dash || 'solid', v => set(b, x => { if (v === 'solid') delete x.dash; else x.dash = v; })]]]);
  else if (b.type === 'timer') G.push(
    ['Tiempo', [['num', 'Minutos', Math.floor((b.seconds ?? 300) / 60), v => set(b, x => { x.seconds = Math.max(1, Math.round(+v || 0) * 60 + (x.seconds ?? 300) % 60); }), 0, 600, 1],
      ['num', 'Segundos', (b.seconds ?? 300) % 60, v => set(b, x => { x.seconds = Math.max(1, Math.floor((x.seconds ?? 300) / 60) * 60 + Math.min(59, Math.max(0, Math.round(+v || 0)))); }), 0, 59, 5]]],
    ['Aspecto', [['select', 'Estilo', [['ring', 'Anillo'], ['digital', 'Números'], ['bar', 'Barra']], b.style || 'ring', v => set(b, x => { x.style = v; })],
      ['color', 'palette', 'Color', b.color || '#ffffff', v => set(b, x => { x.color = v; })]]],
    ['Al presentar', [btn('play_circle', 'Empieza solo', () => set(b, x => { x.auto = x.auto === false; }), b.auto !== false),
      btn('volume_up', 'Sonido al acabar', () => set(b, x => { x.sound = x.sound === false; }), b.sound !== false),
      btn('edit_note', 'Texto final', async () => { const v = await promptDialog(t('Texto al acabar el tiempo:'), b.endText ?? t('¡Tiempo!')); if (v != null) set(b, x => { x.endText = v.slice(0, 40); }); })]]);
  else if (b.type === 'ink') G.push(['Dibujo', [btn('gesture', 'Trazar al presentar', () => (b.animation?.effect === 'draw' ? clearAnimation() : setAnimation('draw')), b.animation?.effect === 'draw')]]);
  else if (b.type === 'icon') G.push(['Icono', [btn('interests', 'Cambiar icono', () => togglePopover(document.querySelector('#ribbon [data-page="ctx"] [data-ctx="icon-change"]'), 'icons', { replaceId: b.id }), false, 'icon-change'),
    btn('palette', 'Color del icono', () => openIconColor(b))]]);
  else if (b.type === 'embed') G.push(['Web', [btn(b.display === 'card' ? 'web' : 'link', b.display === 'card' ? 'Mostrar la web' : 'Mostrar como tarjeta', () => blocks.setEmbedDisplay(b.id, b.display === 'card' ? 'frame' : 'card')),
    ...(blocks.isVideoEmbed(b.src) ? [btn('content_cut', 'Fragmento del vídeo', () => askVideoClip(b))] : [])]]);
  else if (b.type === 'slideref') G.push(['Zoom', [btn('slideshow', 'Elegir diapositiva', () => openSlidePicker(b)), btn('undo', 'Volver aquí', () => blocks.toggleSlideRefReturn(), !!b.returnBack)]]);
  else if (b.type === 'camera') G.push(['Cámara', [btn('circle', 'Círculo', () => set(b, x => { x.shape = 'circle'; }), b.shape === 'circle'), btn('crop_square', 'Redondeada', () => set(b, x => { x.shape = 'rounded'; }), b.shape === 'rounded'),
    btn('rectangle', 'Rectángulo', () => set(b, x => { x.shape = 'rect'; }), b.shape === 'rect'), btn('flip', 'Reflejar', () => set(b, x => { x.mirror = x.mirror === false; }), b.mirror !== false),
    btn('videocam', 'Ver en directo', () => setCameraLive(!cameraLive()), cameraLive())]],
    // Its look: a filter and the background behind the person (blurred, removed, a colour, a picture).
    ['Efectos', [['select', 'Filtro', CAMERA_FILTERS, b.filter || '', v => setCameraLook(b.id, { filter: v })],
      ['num', 'Brillo (%)', cameraBrightness(b), v => setCameraLook(b.id, { brightness: v }), 30, 200, 10]]],
    ['Fondo', [['select', 'Fondo', CAMERA_BACKGROUNDS, b.bg || '', v => setCameraBackground(b, v)],
      ...(b.bg === 'color' ? [['color', 'format_color_fill', 'Color del fondo', b.bgColor || DEFAULT_CAMERA_COLOR, v => setCameraLook(b.id, { bgColor: v })]] : []),
      ...(b.bg === 'image' ? [btn('image', 'Cambiar imagen', () => pickCameraImage(b))] : [])]]);
  // Every object: its animations (several, one after another), description, accessibility and arrangement.
  const n = animsOf(b).length;
  G.push(['Animaciones', [btn('add_circle', n ? `${t('Añadir animación')} (${n})` : 'Añadir animación', () => openAddAnimation(document.querySelector('#ribbon [data-page="ctx"] [data-ctx="add"]')), false, 'add'),
    ico('gesture', n ? 'Añadir movimiento' : 'Dibujar recorrido', () => startPathDraw({ append: true })), ico('tune', 'Panel de animación', () => openAnimPanel())]]);
  // (The link with the alt text and description: one group, not a column for a single button.)
  const linkable = !['text', 'connector'].includes(b.type), described = !['text', 'connector', 'figindex', 'slideref'].includes(b.type);
  G.push([linkable ? 'Vínculo y accesibilidad' : 'Accesibilidad', [...(linkable ? [ico('link', b.href || b.goto ? 'Cambiar vínculo' : 'Vínculo', () => openObjectLink(b), !!(b.href || b.goto), 'link')] : []),
    ico('accessibility', 'Texto alternativo', () => openAlt(b)), ...(described ? [ico('short_text', b.caption ? 'Editar descripción' : 'Descripción', () => openCaption(b), !!b.caption)] : [])]]);
  G.push(arrange(b));
  return G;
}
function arrange(b) {
  return ['Organizar', [ico('flip_to_front', 'Traer al frente', () => blocks.bringToFront()), ico('flip_to_back', 'Enviar al fondo', () => blocks.sendToBack()),
    ico('align_horizontal_center', 'Centrar en la diapositiva', () => { blocks.alignSelected('hcenter'); blocks.alignSelected('vcenter'); }),
    ico('flip', 'Voltear', () => blocks.flipSelected('h')), ico('rotate_left', 'Quitar el giro', () => blocks.resetRotation()),
    ico('opacity', 'Opacidad', () => openOpacity(b)), ico('shadow', 'Sombra', () => blocks.toggleShadow(), !!b.shadow),
    ico(b.locked ? 'lock' : 'lock_open', b.locked ? 'Desbloquear' : 'Bloquear', () => blocks.toggleLock(), !!b.locked)]];
}
function groupsForMany(list) {
  const G = [['Alinear', [btn('align_horizontal_left', 'Izquierda', () => blocks.alignSelected('left')), btn('align_horizontal_center', 'Centro', () => blocks.alignSelected('hcenter')),
    btn('align_horizontal_right', 'Derecha', () => blocks.alignSelected('right')), btn('align_vertical_top', 'Arriba', () => blocks.alignSelected('top')),
    btn('align_vertical_center', 'Medio', () => blocks.alignSelected('vcenter')), btn('align_vertical_bottom', 'Abajo', () => blocks.alignSelected('bottom'))]],
  ['Distribuir', [btn('horizontal_distribute', 'Horizontal', () => blocks.distributeSelected('h')), btn('vertical_distribute', 'Vertical', () => blocks.distributeSelected('v'))]],
  ['Agrupar', [btn('group_work', 'Agrupar', () => blocks.groupSelected()), ...(list.some(x => x.groupId) ? [btn('workspaces', 'Desagrupar', () => blocks.ungroupSelected())] : []),
    ...(list.filter(x => x.type !== 'connector').length === 2 ? [btn('conversion_path', 'Conectar', () => blocks.addConnector())] : [])]]];
  const ordered = shapeops.selectedShapesInOrder();
  if (shapeops.canMerge(ordered)) {
    const run = op => shapeops.mergeShapes(op, ordered).then(r => { if (!r) alertDialog(t('Las formas no se solapan.')); }).catch(() => alertDialog(t('No se pudo cargar la librería de formas.')));
    G.push(['Combinar formas', [btn('join_full', 'Unión', () => run('union')), btn('join_inner', 'Intersecar', () => run('intersection')), btn('join_left', 'Restar', () => run('difference')), btn('join', 'Combinar', () => run('xor'))]]);
  }
  G.push(['Organizar', [ico('flip_to_front', 'Traer al frente', () => blocks.bringToFront()), ico('flip_to_back', 'Enviar al fondo', () => blocks.sendToBack()), ico('shadow', 'Sombra', () => blocks.toggleShadow())]]);
  return G;
}


let lastSig = '', waiting = null, known = null;
export function renderContextual() {
  const tabs = document.querySelector('#ribbon .tabs'), pages = document.querySelector('#ribbon .pages'); if (!tabs || !pages) return;
  let tab = tabs.querySelector('[data-tab="ctx"]'), page = pages.querySelector('[data-page="ctx"]');
  if (!tab) { tab = document.createElement('button'); tab.dataset.tab = 'ctx'; tab.className = 'ctx-tab'; tabs.appendChild(tab); }
  if (!page) { page = document.createElement('section'); page.className = 'ribbon-page'; page.dataset.page = 'ctx'; pages.appendChild(page); }
  const list = state.ui.editMaster ? [] : selectedBlocks(), b = list.length === 1 ? selectedBlock() : null;
  const show = list.length > 0;
  tab.hidden = !show;
  if (!show) {
    lastSig = ''; known = new Set(state.deck.slides.flatMap(s => s.blocks.map(x => x.id)));
    if (state.ui.activeTab === 'ctx') {                       // nothing selected: back to Home
      state.ui.activeTab = 'home';
      document.querySelectorAll('#ribbon [data-tab]').forEach(x => x.classList.toggle('active', x.dataset.tab === 'home'));
      document.querySelectorAll('#ribbon .ribbon-page').forEach(p => p.classList.toggle('active', p.dataset.page === 'home'));
      tabs.querySelector('[data-tab="home"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });   // (on a phone the tabs scroll)
    }
    return;
  }
  // Just inserted (an id not seen before): its tab opens by itself, as in PowerPoint.
  const ids = new Set(state.deck.slides.flatMap(s => s.blocks.map(x => x.id)));
  const opened = known && b && !known.has(b.id) && state.ui.activeTab !== 'ctx';
  if (opened) {
    state.ui.activeTab = 'ctx';
    document.querySelectorAll('#ribbon [data-tab]').forEach(x => x.classList.toggle('active', x.dataset.tab === 'ctx'));
    document.querySelectorAll('#ribbon .ribbon-page').forEach(p => p.classList.toggle('active', p.dataset.page === 'ctx'));
  }
  known = ids;
  const title = b ? t(TITLES[b.type] || 'Objeto') : t('Varios objetos') + ` (${list.length})`;
  if (tab.textContent !== title) tab.textContent = title;
  if (opened) tab.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });   // (with its name, so all of it shows)
  const names = b?.type === 'model' ? clipsOf(b) : [];
  // (Moving or resizing it doesn't change its options: no rebuild while nudging.)
  const sig = shortSig([list.map(x => x.id), b && { ...b, x: 0, y: 0, w: 0, h: 0 }, names, b && styled(b, currentSlide()).fontSize, b?.type === 'camera' && cameraLive(), b?.type === 'model' && puppetTrying()]);
  if (sig === lastSig) return;
  lastSig = sig;
  const groups = b ? groupsFor(b) : groupsForMany(list);
  page.replaceChildren(...groups.map(([label, controls]) => {
    const g = document.createElement('div'); g.className = 'group';
    const row = document.createElement('div'); row.className = 'row';
    for (const c of controls) row.appendChild(control(c));
    const l = document.createElement('label'); l.textContent = t(label);
    g.append(row, l); return g;
  }));
  // A model's animations are known once it has loaded: then refresh.
  if (b?.type === 'model' && !names.length) {
    const mv = document.querySelector(`#stage .block[data-id="${b.id}"] model-viewer`);
    if (mv && waiting !== mv) { waiting = mv; mv.addEventListener('load', () => { waiting = null; lastSig = ''; renderContextual(); }, { once: true }); }
  }
}
// The deck's fonts, as in Home's font list.
const fontOptions = () => [['', 'Del tema'], ...[...(document.querySelector('#ribbon [data-font]')?.options || [])].filter(o => o.value && o.value !== '__upload').map(o => [o.value, o.textContent])];
function control(c) {
  if (c[0] === 'ibtn') {                                     // icon only; keeps the text selection while editing
    const [, icon, label, fn, on, key] = c, el = document.createElement('button'); el.type = 'button'; el.title = t(label); el.setAttribute('aria-label', t(label));
    el.innerHTML = `<i class="ms">${icon}</i>`; el.classList.toggle('on', !!on); if (key) el.dataset.ctx = key;
    el.addEventListener('mousedown', e => e.preventDefault());
    el.addEventListener('click', e => { e.stopPropagation(); fn(); });
    return el;
  }
  if (c[0] === 'btn') {
    const [, icon, label, fn, on, key] = c, el = document.createElement('button'); el.type = 'button';
    el.innerHTML = `<i class="ms">${icon}</i><span>${t(label)}</span>`; el.classList.toggle('on', !!on);
    if (key) el.dataset.ctx = key;
    el.addEventListener('click', e => { e.stopPropagation(); fn(); });
    return el;
  }
  if (c[0] === 'color') {
    const [, icon, label, value, fn] = c, el = document.createElement('label'); el.className = 'color'; el.title = t(label);
    el.innerHTML = `<i class="ms">${icon}</i><input type="color">`; const inp = el.querySelector('input'); inp.value = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
    inp.addEventListener('change', () => fn(inp.value)); return el;
  }
  const el = document.createElement('label'); el.className = 'ctx-field';
  if (c[0] === 'select') {
    const [, label, opts, value, fn] = c;
    el.innerHTML = `<span>${t(label)}</span><select></select>`; const s = el.querySelector('select');
    for (const [v, l] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t(l); s.appendChild(o); }
    s.value = value; s.addEventListener('change', () => fn(s.value));
  } else {
    const [, label, value, fn, min, max, step] = c;
    el.innerHTML = `<span>${t(label)}</span><input type="number" min="${min}" max="${max}" step="${step}">`; const i = el.querySelector('input');
    i.value = value; i.addEventListener('change', () => fn(i.value));
  }
  return el;
}

// A part of a video for this slide ("1:20-2:05"; empty: all of it): each slide can play its own chapter.
async function askVideoClip(b) {
  const { start, end } = blocks.clipOf(b.src), mmss = s => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');
  const v = await promptDialog(t('Fragmento del vídeo en esta diapositiva, desde-hasta (p. ej. 1:20-2:05; vacío: entero):'), start || end ? `${mmss(start) || '0:00'}-${mmss(end)}` : '');
  if (v == null) return;
  const [a, z = ''] = v.split(/\s*[-–]\s*/);
  if (!blocks.setVideoClip(b.id, blocks.parseTime(a), blocks.parseTime(z))) alertDialog(t('Escribe los tiempos como minutos:segundos, y el final después del principio.'));
}
