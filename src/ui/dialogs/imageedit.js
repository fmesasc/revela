// «Editar imagen» (Imagen ▸ Ajustar, or the picture's right-click menu): everything done to a picture in one place,
// as Canva's photo editor and Lightroom, with the picture in sight beside it as it will look. Francisco, 2026-10-16:
// «en Canva puedes extender la imagen, recortarla, eliminar fondo, aplicar filtros y despegar capas»; and later the same
// day «¿no se te ocurren más funciones avanzadas? que sea un poco más denso en edición».
// - Ajustes: PowerPoint's corrections and Lightroom's (exposure, highlights, shadows, clarity, grain, fade…), in four
//   groups; levels and each channel under «Más opciones»: b.adj. Copied and pasted between pictures, or given to all;
// - Filtros: a gallery of the picture itself with each one, and how strong: b.fx (render/imagelook.js);
// - Recortar: the crop tools that were already there; straightening (a new picture) and turning it over (b.flipH/V);
// - Forma: the picture in a shape, its edges soft (b.mask); an outline as a sticker's, a glow, a shadow (b.sticker,
//   b.glow, b.shadow) that follow what is not see-through;
// - Fondo: the background removal, then touched up with a brush; the background blurred, or in black and white;
// - Retocar: brushes on the picture — blur or pixelate (faces, names), erase something, change a colour — and its colours;
// - Ampliar: more picture around it without AI (features/document/imagetools.js), or with it (Editar con IA);
// - Capas: the subject lifted off its background, two objects.
// The look is live and undoes with Ctrl+Z like any other change (a slider dragged: one step); what makes a new picture
// (straightening, the brushes, the background's effects) is one step each. «Antes / después», held, shows it without its look.

import { esc } from '../../core/text.js';
import { commit, currentSlide, subscribe, state } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { FILTERS, DUOTONE, SHAPES, maskPath, ensureLook, NO_LOOK, LOOK_PROPS } from '../../render/imagelook.js';
import { imgFilter, DEFAULT_SHADOW } from '../../render/svg.js';
import { isGif } from '../../features/live/media.js';
import { uncrop } from '../../features/document/crop.js';
import { EXTEND_RATIOS, EXTEND_FILLS, extendCanvas, extendImage, loadPicture, seeThrough, visiblePart, splitLayers, straightenImage, straightenZoom,
  pixelsOf, maskWeights, hideData, hideArea, eraseData, eraseArea, retouchCutout, cutoutOrigins, subjectEffect, recolourData, recolour, photoColours } from '../../features/document/imagetools.js';
import { applyPalette, currentPalette } from '../../features/design/palettes.js';
import { tabsHTML, wireTabs, moreHTML, tipHTML, footHTML } from './dlgkit.js';
import { IMG_PRESETS, openImageCrop, removeBackground } from './object.js';
import { alertDialog } from './dialog.js';
import { applyImgStyle } from '../canvas/content.js';
import { blobURL } from '../../io/formats/blobmedia.js';

// [property, label, min, max, neutral], by group; the rarely used ones under «Más opciones».
const GROUPS = [
  ['Luz', [['exposure', 'Exposición', -100, 100, 0], ['brightness', 'Brillo', 0, 200, 100], ['contrast', 'Contraste', 0, 200, 100], ['highlights', 'Luces', -100, 100, 0], ['shadows', 'Sombras', -100, 100, 0]]],
  ['Color', [['saturate', 'Saturación', 0, 200, 100], ['warmth', 'Calidez', -100, 100, 0], ['hue', 'Tono', -180, 180, 0]]],
  ['Detalle', [['sharpen', 'Nitidez', -100, 100, 0], ['clarity', 'Claridad', -100, 100, 0]]],
  ['Efectos', [['vignette', 'Viñeta', 0, 100, 0], ['grain', 'Grano', 0, 100, 0], ['fade', 'Desvanecer', 0, 100, 0]]],
];
const LEVELS = [['black', 'Punto negro', 0, 100, 0], ['white', 'Punto blanco', 0, 100, 0], ['mid', 'Tonos medios', -100, 100, 0]];
const CHANNELS = [['red', 'Rojo', -100, 100, 0], ['green', 'Verde', -100, 100, 0], ['blue', 'Azul', -100, 100, 0]];
const OPACITY = ['opacity', 'Opacidad', 0, 100, 100];
const SLIDERS = [...GROUPS.flatMap(g => g[1]), ...LEVELS, ...CHANNELS, OPACITY];
const NEUTRAL = Object.fromEntries(SLIDERS.map(s => [s[0], s[4]]));
const BASE = ['brightness', 'contrast', 'saturate', 'opacity'];        // (PowerPoint's four: always there when b.adj is)
// The brushes: [id, icon, name, one line of help].
const TOOLS = [['hide', 'blur_on', 'Difuminar o pixelar una zona', 'Para caras, nombres o matrículas: pinta encima o arrastra un rectángulo.'],
  ['erase', 'ink_eraser', 'Borrar un objeto', 'Pinta encima de lo que sobra: se rellena con lo que hay alrededor, o queda transparente en un logo.'],
  ['recolour', 'colorize', 'Cambiar un color', 'Haz clic en la foto sobre el color que quieres cambiar.']];
let copied = null;                                                       // («Copiar ajustes»: the look, while Revela is open)

export function openImageEditor(b0, tab = '') {
  if (document.getElementById('imged-modal')) return;
  const id = b0.id, cur = () => currentSlide().blocks.find(x => x.id === id);
  const back = document.createElement('div'); back.id = 'imged-modal'; back.className = 'modal-backdrop';
  const src = esc(blobURL(b0.src || '')), still = !isGif(b0);
  const slider = ([k, label, min, max, z]) => `<label class="fr-l ie-sl">${t(label)}<input type="range" data-adj="${k}" min="${min}" max="${max}" value="${b0.adj?.[k] ?? z}"></label>`;
  const group = (title, list) => `<h5 class="ie-sec">${t(title)}</h5><div class="ie-grid">${list.map(slider).join('')}</div>`;
  const opts = list => list.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('');
  const shapeIcon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${maskPath(k, 35, 100, 100, 8)}"/></svg>`;
  const onlyStill = `<p class="ie-say">${t('Solo con fotos fijas (no con un GIF animado).')}</p>`;
  const tabs = [
    { id: 'adjust', icon: 'tune', label: t('Ajustes'), html: `<div class="ia-presets">${IMG_PRESETS.map(([n], i) => `<button type="button" data-ip="${i}"><img src="${src}" alt=""><span>${esc(t(n))}</span></button>`).join('')}</div>
      ${GROUPS.map(([g, list]) => group(g, list)).join('')}
      ${moreHTML(`<div class="ie-grid">${slider(OPACITY)}</div>${group('Niveles', LEVELS)}${group('Cada color', CHANNELS)}`)}
      <div class="ie-acts ie-look-acts"><button type="button" class="mini2 ie-reset">${t('Restablecer')}</button>
        <button type="button" class="mini2" data-do="copy-look"><i class="ms" aria-hidden="true">content_copy</i> ${t('Copiar ajustes')}</button>
        <button type="button" class="mini2" data-do="paste-look"><i class="ms" aria-hidden="true">content_paste</i> ${t('Pegar ajustes')}</button>
        <button type="button" class="mini2" data-do="look-all"><i class="ms" aria-hidden="true">photo_library</i> ${t('Aplicar a todas las imágenes')}</button></div>
      ${tipHTML(t('Doble clic en un control lo devuelve a su punto de partida. «Aplicar a todas las imágenes» da estos ajustes, el filtro y la forma a todas las fotos de la presentación (Ctrl+Z lo deshace).'))}` },
    { id: 'filters', icon: 'photo_filter', label: t('Filtros'), html: `<div class="ie-filters">${[['', 'Ninguno'], ...FILTERS].map(([k, n]) =>
        `<button type="button" data-fx="${k}" aria-pressed="false"><img src="${src}" alt=""><span>${esc(t(n))}</span></button>`).join('')}</div>
      <label class="fr-l ie-amount">${t('Intensidad')}<input type="range" class="ie-amt" min="0" max="100" value="${b0.fx?.amount ?? 100}"></label>
      <div class="ie-duo" hidden><label class="fr-l">${t('Sombras')}<input type="color" class="ie-dark" value="${b0.fx?.dark || DUOTONE.dark}"></label>
        <label class="fr-l">${t('Luces')}<input type="color" class="ie-light" value="${b0.fx?.light || DUOTONE.light}"></label></div>` },
    { id: 'crop', icon: 'crop', label: t('Recortar'), html: `<div class="ie-acts">
      <button type="button" class="mini2" data-do="crop"><i class="ms" aria-hidden="true">crop</i> ${t('Recortar en la imagen')}</button>
      <button type="button" class="mini2" data-do="ratio"><i class="ms" aria-hidden="true">crop_square</i> ${t('Recortar a una proporción…')}</button>
      <button type="button" class="mini2" data-do="uncrop"><i class="ms" aria-hidden="true">restart_alt</i> ${t('Quitar el recorte')}</button></div>
      <h5 class="ie-sec">${t('Voltear')}</h5><div class="ie-acts">
      <button type="button" class="mini2" data-do="flip-h" aria-pressed="false"><i class="ms" aria-hidden="true">flip</i> ${t('Voltear horizontal')}</button>
      <button type="button" class="mini2" data-do="flip-v" aria-pressed="false"><i class="ms ie-rot" aria-hidden="true">flip</i> ${t('Voltear vertical')}</button></div>
      ${still ? `<h5 class="ie-sec">${t('Enderezar')}</h5><label class="fr-l ie-sl">${t('Ángulo')} <output class="ie-deg">0°</output><input type="range" class="ie-straight" min="-45" max="45" step="0.5" value="0"></label>
      <div class="ie-acts"><button type="button" class="fr-do" data-do="straighten" disabled><i class="ms" aria-hidden="true">straighten</i> ${t('Enderezar')}</button></div>
      ${tipHTML(t('Gira la foto dentro de su caja y la amplía lo justo para que no queden esquinas vacías, como en Lightroom. Para girar el objeto entero, usa su tirador.'))}` : ''}` },
    { id: 'shape', icon: 'interests', label: t('Forma'), html: `<div class="ie-shapes">${[['', 'Ninguna'], ...SHAPES].map(([k, n]) =>
        `<button type="button" data-shape="${k}" aria-pressed="false" title="${esc(t(n))}">${shapeIcon(k)}<span>${esc(t(n))}</span></button>`).join('')}</div>
      <div class="ie-grid"><label class="fr-l ie-sl ie-radius-l" hidden>${t('Redondeo')}<input type="range" class="ie-radius" min="0" max="100" value="${b0.mask?.radius ?? 25}"></label>
        <label class="fr-l ie-sl">${t('Bordes difuminados')}<input type="range" class="ie-feather" min="0" max="100" value="${b0.mask?.feather ?? 0}"></label></div>
      <div class="ie-grid ie-pos" hidden><label class="fr-l ie-sl">${t('Encuadre horizontal')}<input type="range" class="ie-pos-x" min="0" max="100" value="${b0.focusX ?? 50}"></label>
        <label class="fr-l ie-sl">${t('Encuadre vertical')}<input type="range" class="ie-pos-y" min="0" max="100" value="${b0.focusY ?? 50}"></label></div>
      <h5 class="ie-sec">${t('Contorno y brillo')}</h5>
      <div class="ie-fx-row"><label class="fr-chk"><input type="checkbox" class="ie-stk-on"> ${t('Contorno de pegatina')}</label>
        <input type="color" class="ie-stk-c" value="${b0.sticker?.color || '#ffffff'}" aria-label="${esc(t('Color'))}"><input type="range" class="ie-stk-w" min="1" max="40" value="${b0.sticker?.width ?? 8}" aria-label="${esc(t('Grosor'))}"></div>
      <div class="ie-fx-row"><label class="fr-chk"><input type="checkbox" class="ie-glow-on"> ${t('Resplandor')}</label>
        <input type="color" class="ie-glow-c" value="${b0.glow?.color || '#ffd54f'}" aria-label="${esc(t('Color'))}"><input type="range" class="ie-glow-s" min="1" max="60" value="${b0.glow?.size ?? 20}" aria-label="${esc(t('Tamaño'))}"></div>
      <div class="ie-fx-row"><label class="fr-chk"><input type="checkbox" class="ie-shadow-on"> ${t('Sombra suave')}</label></div>
      ${tipHTML(t('El contorno, el resplandor y la sombra siguen la silueta: la figura de una foto sin fondo (Fondo ▸ Quitar fondo) o la forma elegida arriba. En una foto rectangular sin forma no se ven.'))}` },
    { id: 'background', icon: 'auto_fix_high', label: t('Fondo'), html: `<p class="ie-say">${t('Deja solo lo principal de la foto, sin el fondo.')}</p>
      <div class="ie-acts"><button type="button" class="fr-do" data-do="nobg"><i class="ms" aria-hidden="true">auto_fix_high</i> ${t('Quitar fondo')}</button>
        ${still ? `<button type="button" class="mini2" data-do="tool-cutout"><i class="ms" aria-hidden="true">brush</i> ${t('Retocar el recorte')}</button>` : ''}</div>
      ${tipHTML(t('Lo hace una IA en tu navegador: la foto no sale de tu equipo. La primera vez tarda un poco más (descarga el modelo).'))}
      ${still ? `<h5 class="ie-sec">${t('El fondo, sin quitarlo')}</h5>
      <label class="fr-l ie-sl">${t('Desenfoque')}<input type="range" class="ie-bgk" min="0" max="100" value="60"></label>
      <div class="ie-acts"><button type="button" class="mini2" data-do="bgblur"><i class="ms" aria-hidden="true">blur_on</i> ${t('Desenfocar el fondo')}</button>
        <button type="button" class="mini2" data-do="selective"><i class="ms" aria-hidden="true">filter_b_and_w</i> ${t('Color selectivo')}</button></div>
      ${tipHTML(t('«Desenfocar el fondo» deja lo principal nítido, como el modo retrato del móvil. «Color selectivo» pone el fondo en blanco y negro. Cada uno hace una foto nueva: Ctrl+Z la deshace.'))}` : ''}` },
    { id: 'retouch', icon: 'healing', label: t('Retocar'), html: still ? `<p class="ie-say">${t('Pinta sobre la foto lo que quieras cambiar.')}</p>
      <div class="ie-tools">${TOOLS.map(([k, ic, n, help]) => `<button type="button" class="ie-tool-b" data-do="tool-${k}"><i class="ms" aria-hidden="true">${ic}</i><span><b>${esc(t(n))}</b><small>${esc(t(help))}</small></span></button>`).join('')}</div>
      <h5 class="ie-sec">${t('Colores de la foto')}</h5><div class="ie-swatches" aria-live="polite"></div>
      <div class="ie-acts"><button type="button" class="mini2" data-do="use-colours" disabled><i class="ms" aria-hidden="true">palette</i> ${t('Usarlos en el tema')}</button></div>
      ${tipHTML(t('Haz clic en un color para copiar su código. «Usarlos en el tema» cambia los colores de énfasis de la presentación por los de la foto.'))}` : onlyStill },
    { id: 'extend', icon: 'open_in_full', label: t('Ampliar'), html: still ? `<label class="fr-l">${t('Nueva forma')}<select class="ie-ratio">${opts(EXTEND_RATIOS)}</select></label>
      <label class="fr-l ie-margin" hidden>${t('Margen')} <input type="range" class="ie-mg" min="5" max="60" value="15"></label>
      <label class="fr-l">${t('Rellenar con')}<select class="ie-fill">${opts(EXTEND_FILLS)}</select></label>
      <label class="fr-l ie-color-l" hidden>${t('Color')}<input type="color" class="ie-color" value="#ffffff"></label>
      <div class="ie-acts"><button type="button" class="fr-do" data-do="extend"><i class="ms" aria-hidden="true">open_in_full</i> ${t('Ampliar')}</button>
        <button type="button" class="mini2" data-do="extend-ai"><i class="ms" aria-hidden="true">magic_button</i> ${t('Con IA…')}</button></div>
      ${tipHTML(t('Sin IA, la imagen se extiende con una copia desenfocada, sus bordes en espejo o un color. «Con IA» inventa lo que habría alrededor.'))}` : onlyStill },
    { id: 'layers', icon: 'layers', label: t('Capas'), html: still ? `<p class="ie-say">${t('Separa lo principal de la foto de su fondo: dos objetos, uno encima del otro, para mover, animar o poner texto entre ellos.')}</p>
      <label class="fr-l">${t('El hueco del fondo')}<select class="ie-hole">${opts([['near', 'Rellenarlo con lo que hay alrededor'], ['ai', 'Rellenarlo con IA (más natural)']])}</select></label>
      <button type="button" class="fr-do" data-do="layers"><i class="ms" aria-hidden="true">layers</i> ${t('Separar en capas')}</button>
      ${tipHTML(t('La figura se recorta con la misma IA que «Quitar fondo». Las dos capas quedan seleccionadas; haz clic en la figura para moverla sola.'))}` : onlyStill },
  ];
  back.innerHTML = `<div class="modal dk ie" role="dialog" aria-modal="true" aria-labelledby="ie-title">
    <button class="modal-close" aria-label="${esc(t('Cerrar'))}">✕</button><h3 id="ie-title">${t('Editar imagen')}</h3>
    <div class="ie-body">${tabsHTML(tabs)}<div class="ie-view"><div class="ie-frame"><div class="ie-stage"><img class="ie-pic" alt=""></div>
      <div class="ie-brush" hidden><canvas class="ie-bpic"></canvas><canvas class="ie-bmask"></canvas><div class="ie-ring" hidden></div></div></div>
      <div class="ie-bar" hidden></div>
      <div class="ie-viewacts"><button type="button" class="mini2 ie-ba" aria-pressed="false" title="${esc(t('Mantén pulsado para ver la foto sin sus ajustes'))}"><i class="ms" aria-hidden="true">compare</i> ${t('Antes / después')}</button></div>
      <p class="ie-note" aria-live="polite"></p></div></div>
    ${footHTML(`<button type="button" class="fr-do ie-ok">${t('Listo')}</button>`)}</div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), qa = s => [...back.querySelectorAll(s)], pic = q('.ie-pic'), note = q('.ie-note');
  let extendPreview = '', before = false, tool = null;
  const straight = () => +(q('.ie-straight')?.value || 0);
  // The picture as on the slide (its box, fit, crop and look), scaled to the pane: its filter's sizes are the box's.
  const paint = () => {
    const b = cur(); if (!b) return close();
    if (tool) return;                                      // (a brush under way: its own view)
    const st = q('.ie-stage'), fr = q('.ie-frame'), k = Math.min(fr.clientWidth / (b.w || 1), fr.clientHeight / (b.h || 1)) || 0.3;
    if (extendPreview) { st.style.cssText = 'inset:0'; pic.removeAttribute('style'); pic.className = 'ie-pic ie-ext'; if (pic.src !== extendPreview) pic.src = extendPreview; return; }
    pic.className = 'ie-pic';
    st.style.cssText = `width:${b.w}px;height:${b.h}px;transform:scale(${k});left:${(fr.clientWidth - b.w * k) / 2}px;top:${(fr.clientHeight - b.h * k) / 2}px`;
    const s = blobURL(b.src || ''); if (pic.getAttribute('src') !== s) pic.src = s;
    pic.style.width = pic.style.height = '100%'; applyImgStyle(pic, before ? { ...b, ...NO_LOOK } : b);
    // (Turned over as on the slide; straightened as it would be, while the angle is being chosen.)
    const deg = straight(), zk = deg && pic.naturalWidth ? straightenZoom(deg, pic.naturalWidth, pic.naturalHeight) : 1;
    pic.style.transform = `${b.flipH ? 'scaleX(-1) ' : ''}${b.flipV ? 'scaleY(-1) ' : ''}${deg ? `rotate(${deg}deg) scale(${zk})` : ''}`;
    st.style.overflow = deg ? 'hidden' : '';
    // (Which filter and shape are on, and the controls where the picture is: after an undo too.)
    qa('[data-fx]').forEach(x => x.setAttribute('aria-pressed', String((b.fx?.name || '') === x.dataset.fx)));
    q('.ie-amount').hidden = !b.fx; q('.ie-duo').hidden = b.fx?.name !== 'duotone';
    if (b.fx) q('.ie-amt').value = b.fx.amount ?? 100;
    const idle = r => document.activeElement !== r;
    qa('[data-adj]').forEach(r => { if (idle(r)) r.value = b.adj?.[r.dataset.adj] ?? NEUTRAL[r.dataset.adj]; });
    q('[data-do="uncrop"]').hidden = !(b.crop || b.uncropped);
    q('[data-do="flip-h"]').setAttribute('aria-pressed', String(!!b.flipH)); q('[data-do="flip-v"]').setAttribute('aria-pressed', String(!!b.flipV));
    qa('[data-shape]').forEach(x => x.setAttribute('aria-pressed', String((b.mask?.shape || '') === x.dataset.shape)));
    q('.ie-radius-l').hidden = b.mask?.shape !== 'round';
    // (A picture filling its box — a circle or a star made it so — shows only part of it: which part, chosen here.)
    q('.ie-pos').hidden = b.fit !== 'cover';
    for (const [sel, v] of [['.ie-pos-x', b.focusX ?? 50], ['.ie-pos-y', b.focusY ?? 50]]) if (idle(q(sel))) q(sel).value = v;
    for (const [sel, v] of [['.ie-radius', b.mask?.radius ?? 25], ['.ie-feather', b.mask?.feather ?? 0], ['.ie-stk-w', b.sticker?.width ?? 8], ['.ie-glow-s', b.glow?.size ?? 20]]) if (idle(q(sel))) q(sel).value = v;
    q('.ie-stk-on').checked = !!b.sticker; q('.ie-glow-on').checked = !!b.glow; q('.ie-shadow-on').checked = !!b.shadow;
    q('[data-do="paste-look"]').disabled = !copied;
  };
  const off = subscribe(() => requestAnimationFrame(paint));
  // (While a brush is under way, Ctrl+Z takes back its last stroke, not a step of the presentation.)
  const onKey = e => { if (tool && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); undoStroke(); } };
  window.addEventListener('keydown', onKey, true);
  const close = () => { off(); window.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', layoutBrush); back.remove(); };
  q('.modal-close').addEventListener('click', close); q('.ie-ok').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const showTab = wireTabs(back, 'revela.imageedit.tab');
  if (tab) showTab(tab);
  // (Ampliar shows what it would make; Retocar, the photo's colours; the other tabs, the picture.)
  let shown = '';
  const onTab = () => { const now = q('.dk-tab[aria-selected=true]')?.dataset.tab; if (now === shown) return; shown = now; extendPreview = ''; endTool();
    if (now === 'extend') previewExtend(); else paint(); if (now === 'retouch') loadColours(); };
  for (const ev of ['click', 'keyup']) q('.dk-tablist').addEventListener(ev, onTab);
  const done = () => { note.textContent = t('Hecho. Puedes deshacerlo con Ctrl+Z.'); };
  const busy = async (btn, msg, fn) => {
    btn.disabled = true; note.textContent = msg;
    try { await fn(); note.textContent = ''; } catch (e) { note.textContent = ''; alertDialog(e.message || String(e)); } finally { btn.disabled = false; }
  };
  const act = (sel, fn) => q(sel)?.addEventListener('click', fn);

  // ---- Antes / después: held (the button, or the picture itself), the picture without its look.
  const hold = on => { if (before === on) return; before = on; q('.ie-ba').setAttribute('aria-pressed', String(on)); paint(); };
  for (const el of [q('.ie-ba'), q('.ie-stage')]) {
    el.addEventListener('pointerdown', e => { if (e.button === 0) hold(true); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => hold(false));
  }
  q('.ie-ba').addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold(true); } });
  q('.ie-ba').addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') hold(false); });

  // ---- Ajustes
  const look = (fn, live = false) => { const b = cur(); if (b) commit(() => fn(b), { history: !live }); };
  const setAdj = (k, v) => look(b => { b.adj = { brightness: 100, contrast: 100, saturate: 100, opacity: 100, ...b.adj, [k]: +v };
    for (const p of Object.keys(b.adj)) if (!BASE.includes(p) && !b.adj[p]) delete b.adj[p]; }, true);
  qa('[data-adj]').forEach(r => {
    r.addEventListener('input', () => setAdj(r.dataset.adj, r.value));
    r.addEventListener('dblclick', () => { r.value = NEUTRAL[r.dataset.adj]; look(b => { if (b.adj) { b.adj[r.dataset.adj] = NEUTRAL[r.dataset.adj]; if (!BASE.includes(r.dataset.adj)) delete b.adj[r.dataset.adj]; } }); });
  });
  qa('[data-ip] img').forEach((img, i) => { const v = IMG_PRESETS[i][1]; img.style.filter = `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%)`; img.style.opacity = v.opacity / 100; });
  qa('[data-ip]').forEach(x => x.addEventListener('click', () => look(b => { b.adj = { ...b.adj, ...IMG_PRESETS[+x.dataset.ip][1] }; })));
  q('.ie-reset').addEventListener('click', () => look(b => { delete b.adj; }));
  // Copiar, pegar, a todas: the look (its corrections, filter, shape, outline and glow) as it is.
  const lookOf = b => Object.fromEntries(LOOK_PROPS.map(k => [k, b[k] ? structuredClone(b[k]) : null]));
  const giveLook = (b, L) => { for (const k of LOOK_PROPS) { if (L[k]) b[k] = structuredClone(L[k]); else delete b[k]; } };
  act('[data-do="copy-look"]', () => { const b = cur(); if (!b) return; copied = lookOf(b); q('[data-do="paste-look"]').disabled = false; note.textContent = t('Ajustes copiados: abre otra imagen y pulsa «Pegar ajustes».'); });
  act('[data-do="paste-look"]', () => { if (copied) { look(b => giveLook(b, copied)); done(); } });
  act('[data-do="look-all"]', () => {
    const b = cur(); if (!b) return; const L = lookOf(b); let n = 0;
    commit(() => { for (const s of state.deck.slides) for (const x of s.blocks) if (x.type === 'image' && x !== b) { giveLook(x, L); n++; } });
    note.textContent = t('Aplicado a {n} imágenes. Ctrl+Z lo deshace.').replace('{n}', n);
  });

  // ---- Filtros: each example is the picture with it, at full strength (a box the example's size: its vignette too).
  qa('[data-fx]').forEach(x => {
    const k = x.dataset.fx, img = x.querySelector('img');
    const ex = { type: 'image', w: 96, h: 72, fx: { name: k, amount: 100 } };
    if (k) { ensureLook(ex); img.style.filter = imgFilter(ex); }
    x.addEventListener('click', () => look(b => {
      if (!k) { delete b.fx; return; }
      b.fx = { amount: b.fx?.amount ?? 100, ...(k === 'duotone' && { dark: b.fx?.dark || DUOTONE.dark, light: b.fx?.light || DUOTONE.light }), name: k };
      if (k !== 'duotone') { delete b.fx.dark; delete b.fx.light; }
    }));
  });
  q('.ie-amt').addEventListener('input', e => look(b => { if (b.fx) b.fx.amount = +e.target.value; }, true));
  for (const [cls, key] of [['.ie-dark', 'dark'], ['.ie-light', 'light']]) q(cls).addEventListener('input', e => look(b => { if (b.fx) b.fx[key] = e.target.value; }, true));

  // ---- Recortar: the crop tools, turning over, straightening
  act('[data-do="crop"]', () => { close(); import('../canvas/imagecrop.js').then(m => m.startImageCrop(cur())); });
  act('[data-do="ratio"]', () => { close(); openImageCrop(cur()); });
  act('[data-do="uncrop"]', () => uncrop(id));
  act('[data-do="flip-h"]', () => look(b => { b.flipH = !b.flipH; }));
  act('[data-do="flip-v"]', () => look(b => { b.flipV = !b.flipV; }));
  q('.ie-straight')?.addEventListener('input', e => { q('.ie-deg').textContent = `${e.target.value}°`; q('[data-do="straighten"]').disabled = !+e.target.value; paint(); });
  act('[data-do="straighten"]', e => busy(e.currentTarget, t('Enderezando…'), async () => {
    await straightenImage(id, straight()); q('.ie-straight').value = 0; q('.ie-deg').textContent = '0°'; q('[data-do="straighten"]').disabled = true; paint(); done();
  }));

  // ---- Forma: the shape, its soft edges; the outline, the glow and the shadow
  qa('[data-shape]').forEach(x => x.addEventListener('click', () => look(b => {
    const k = x.dataset.shape, m = { ...b.mask, shape: k }; if (!k) delete m.shape;
    if (k === 'round' && m.radius == null) m.radius = 25;
    if (m.shape || m.feather > 0) b.mask = m; else delete b.mask;
    // (A shape that keeps its own proportion — circle, star… — in a long box was a small one in its middle: the box
    // becomes square, about as big, and the picture fills it, as a frame in Canva. «Proporción original» undoes it.)
    const meet = SHAPES.find(x => x[0] === k)?.[2] === 'meet', r = b.w / b.h;
    if (meet && (r > 1.15 || r < 1 / 1.15)) {
      const S = Math.round(Math.min(Math.sqrt(b.w * b.h), state.deck.size.w, state.deck.size.h)), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      Object.assign(b, { w: S, h: S, x: Math.round(cx - S / 2), y: Math.round(cy - S / 2), fit: 'cover', ratio: '1:1' }); delete b.crop;
    }
  })));
  q('.ie-radius').addEventListener('input', e => look(b => { if (b.mask) b.mask.radius = +e.target.value; }, true));
  for (const [sel, k] of [['.ie-pos-x', 'focusX'], ['.ie-pos-y', 'focusY']])
    q(sel).addEventListener('input', e => look(b => { const v = Math.round(+e.target.value); if (v === 50) delete b[k]; else b[k] = v; }, true));
  q('.ie-feather').addEventListener('input', e => look(b => { const m = { ...b.mask, feather: +e.target.value }; if (!m.feather) delete m.feather; if (m.shape || m.feather) b.mask = m; else delete b.mask; }, true));
  const sticker = () => ({ color: q('.ie-stk-c').value, width: +q('.ie-stk-w').value }), glow = () => ({ color: q('.ie-glow-c').value, size: +q('.ie-glow-s').value });
  q('.ie-stk-on').addEventListener('change', e => look(b => { if (e.target.checked) b.sticker = sticker(); else delete b.sticker; }));
  q('.ie-glow-on').addEventListener('change', e => look(b => { if (e.target.checked) b.glow = glow(); else delete b.glow; }));
  q('.ie-shadow-on').addEventListener('change', e => look(b => { if (e.target.checked) b.shadow = { ...DEFAULT_SHADOW }; else delete b.shadow; }));
  // (Changing the colour or size turns it on.)
  for (const s of ['.ie-stk-c', '.ie-stk-w']) q(s).addEventListener('input', () => look(b => { b.sticker = sticker(); }, true));
  for (const s of ['.ie-glow-c', '.ie-glow-s']) q(s).addEventListener('input', () => look(b => { b.glow = glow(); }, true));

  // ---- Fondo
  act('[data-do="nobg"]', e => busy(e.currentTarget, t('Quitando el fondo…'), () => removeBackground(cur())));
  act('[data-do="bgblur"]', e => busy(e.currentTarget, t('Separando la figura del fondo…'), async () => { if (await subjectEffect(id, 'blur', +q('.ie-bgk').value)) done(); }));
  act('[data-do="selective"]', e => busy(e.currentTarget, t('Separando la figura del fondo…'), async () => { if (await subjectEffect(id, 'selective')) done(); }));

  // ---- Retocar: the colours of the photo
  async function loadColours() {
    const b = cur(), box = q('.ie-swatches'); if (!b || !box || !still) return;
    const cols = await photoColours(b.src).catch(() => []);
    box.innerHTML = cols.map(c => `<button type="button" data-colour="${c}" title="${c}" aria-label="${c}" style="background:${c}"></button>`).join('');
    q('[data-do="use-colours"]').disabled = cols.length < 2;
    box.querySelectorAll('[data-colour]').forEach(x => x.addEventListener('click', () => {
      navigator.clipboard?.writeText(x.dataset.colour).catch(() => {}); note.textContent = t('Copiado: {c}').replace('{c}', x.dataset.colour);
    }));
  }
  act('[data-do="use-colours"]', () => {
    // (The most colourful as the accents; the background and the text stay, so that the slides can still be read.)
    const sat = c => { const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return Math.max(...v) - Math.min(...v); };
    const cols = qa('[data-colour]').map(x => x.dataset.colour).sort((a, b) => sat(b) - sat(a)), p = currentPalette();
    applyPalette('custom', state.deck, { name: t('Colores de la foto'), bg: p.bg, fg: p.fg, accents: p.accents.map((c, i) => cols[i] || c) }); done();
  });

  // ---- The brushes: a copy of the picture with what is painted over it, in the picture's pane. A stroke, then the
  // result shown on the copy; «Aplicar» makes it on the whole picture (one step), «Cancelar» leaves it as it was.
  const bview = q('.ie-brush'), bpic = q('.ie-bpic'), bmask = q('.ie-bmask'), ring = q('.ie-ring'), bar = q('.ie-bar');
  const mg = bmask.getContext('2d');
  function layoutBrush() {
    if (!tool) return; const fr = q('.ie-frame'), k = Math.min(fr.clientWidth / tool.P.W, fr.clientHeight / tool.P.H);
    Object.assign(bview.style, { width: tool.P.W * k + 'px', height: tool.P.H * k + 'px', left: (fr.clientWidth - tool.P.W * k) / 2 + 'px', top: (fr.clientHeight - tool.P.H * k) / 2 + 'px' });
    tool.k = k;
  }
  window.addEventListener('resize', layoutBrush);
  const BAR = {
    hide: () => `<label class="fr-l">${t('Cómo')}<select class="ie-b-mode">${opts([['blur', 'Difuminar'], ['pixel', 'Pixelar']])}</select></label>
      <label class="fr-l">${t('Con')}<select class="ie-b-shape">${opts([['brush', 'Pincel'], ['rect', 'Rectángulo']])}</select></label>
      <label class="fr-l ie-sl">${t('Intensidad')}<input type="range" class="ie-b-k" min="0" max="100" value="60"></label>`,
    erase: () => `<label class="fr-l">${t('Rellenar con')}<select class="ie-b-fill">${opts([['near', 'Lo que hay alrededor'], ['ai', 'IA (más natural)']])}</select></label>`,
    cutout: () => `<label class="fr-l">${t('El pincel')}<select class="ie-b-mode">${opts([['erase', 'Borra (más transparente)'], ...(cutoutOrigins.has(id) ? [['restore', 'Recupera lo quitado']] : [])])}</select></label>`,
    recolour: () => `<div class="ie-fx-row"><span class="fr-l">${t('Color elegido')}</span><span class="ie-from" title="${esc(t('Haz clic en la foto'))}"></span>
      <label class="fr-l">${t('Nuevo color')}<input type="color" class="ie-to" value="#2f7df6"></label></div>
      <label class="fr-l ie-sl">${t('Tolerancia')}<input type="range" class="ie-tol" min="0" max="100" value="40"></label>`,
  };
  async function startTool(kind) {
    const b = cur(); if (!b) return; endTool();
    const P = await pixelsOf(b.src, kind === 'recolour' ? 900 : 1600).catch(e => { alertDialog(e.message); return null; }); if (!P) return;
    tool = { kind, P, base: new ImageData(new Uint8ClampedArray(P.data.data), P.W, P.H), undo: [], size: 25, from: '' };
    bpic.width = bmask.width = P.W; bpic.height = bmask.height = P.H; bpic.getContext('2d').putImageData(P.data, 0, 0); mg.clearRect(0, 0, P.W, P.H);
    const name = { hide: TOOLS[0][2], erase: TOOLS[1][2], recolour: TOOLS[2][2], cutout: 'Retocar el recorte' }[kind];
    bar.innerHTML = `<b class="ie-bar-t">${esc(t(name))}</b>${BAR[kind]()}${kind === 'recolour' ? '' : `<label class="fr-l ie-sl">${t('Tamaño del pincel')}<input type="range" class="ie-b-size" min="1" max="100" value="25"></label>`}
      <div class="ie-acts">${kind === 'recolour' ? '' : `<button type="button" class="mini2" data-b="undo" disabled><i class="ms" aria-hidden="true">undo</i> ${t('Deshacer trazo')}</button>`}
      <button type="button" class="mini2" data-b="cancel">${t('Cancelar')}</button><button type="button" class="fr-do" data-b="apply" disabled>${t('Aplicar')}</button></div>`;
    bar.hidden = false; q('.ie-viewacts').hidden = true; q('.ie-stage').hidden = true; bview.hidden = false; bview.dataset.kind = kind;
    note.textContent = t(TOOLS.find(x => x[0] === kind)?.[3] || 'Pinta lo que quieras borrar o recuperar.');
    layoutBrush();
    bar.querySelector('.ie-b-size')?.addEventListener('input', e => { tool.size = +e.target.value; });
    bar.querySelector('[data-b="undo"]')?.addEventListener('click', undoStroke);
    bar.querySelector('[data-b="cancel"]').addEventListener('click', () => { endTool(); note.textContent = ''; });
    bar.querySelector('[data-b="apply"]').addEventListener('click', e => applyTool(e.currentTarget));
    for (const s of ['.ie-b-mode', '.ie-b-k']) bar.querySelector(s)?.addEventListener('input', previewTool);
    for (const s of ['.ie-to', '.ie-tol']) bar.querySelector(s)?.addEventListener('input', previewTool);
  }
  function endTool() {
    if (!tool) return; tool = null; bar.hidden = true; bar.innerHTML = ''; bview.hidden = true; ring.hidden = true;
    q('.ie-viewacts').hidden = false; q('.ie-stage').hidden = false; paint();
  }
  // (The diameter, in the copy's pixels: from half a percent of the picture's longest side to an eighth of it.)
  const brushSize = () => Math.max(tool.P.W, tool.P.H) * (0.005 + tool.size / 100 * 0.12);
  const at = e => { const r = bmask.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * tool.P.W, (e.clientY - r.top) / r.height * tool.P.H]; };
  let stroke = null;
  bmask.addEventListener('pointerdown', e => {
    if (!tool || e.button > 0) return; e.preventDefault(); try { bmask.setPointerCapture(e.pointerId); } catch {}
    const p = at(e);
    if (tool.kind === 'recolour') { const i = (Math.floor(p[1]) * tool.P.W + Math.floor(p[0])) * 4, d = tool.base.data;
      tool.from = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); q('.ie-from').style.background = tool.from; q('.ie-from').title = tool.from; previewTool(); return; }
    tool.undo.push(mg.getImageData(0, 0, tool.P.W, tool.P.H)); if (tool.undo.length > 30) tool.undo.shift();
    stroke = { from: p, rect: bar.querySelector('.ie-b-shape')?.value === 'rect' };
    mg.fillStyle = mg.strokeStyle = '#ff2d6f'; mg.lineCap = mg.lineJoin = 'round'; mg.lineWidth = brushSize();
    if (!stroke.rect) { mg.beginPath(); mg.arc(p[0], p[1], brushSize() / 2, 0, 7); mg.fill(); }
    stroke.last = p; stroke.snap = tool.undo.at(-1);
  });
  bmask.addEventListener('pointermove', e => {
    if (!tool || tool.kind === 'recolour') return; const p = at(e), k = tool.k || 1, d = brushSize() * k;
    if (!stroke?.rect) { ring.hidden = false; Object.assign(ring.style, { width: d + 'px', height: d + 'px', left: p[0] * k - d / 2 + 'px', top: p[1] * k - d / 2 + 'px' }); }
    if (!stroke) return;
    if (stroke.rect) { mg.putImageData(stroke.snap, 0, 0); mg.fillRect(Math.min(stroke.from[0], p[0]), Math.min(stroke.from[1], p[1]), Math.abs(p[0] - stroke.from[0]), Math.abs(p[1] - stroke.from[1])); }
    else { mg.beginPath(); mg.moveTo(...stroke.last); mg.lineTo(...p); mg.stroke(); }
    stroke.last = p;
  });
  const endStroke = () => { if (!stroke) return; stroke = null; bar.querySelector('[data-b="undo"]').disabled = false; previewTool(); };
  bmask.addEventListener('pointerup', endStroke); bmask.addEventListener('pointercancel', endStroke);
  bmask.addEventListener('pointerleave', () => { ring.hidden = true; });
  function undoStroke() {
    if (!tool?.undo.length) return; mg.putImageData(tool.undo.pop(), 0, 0);
    const u = bar.querySelector('[data-b="undo"]'); if (u) u.disabled = !tool.undo.length; previewTool();
  }
  // What it will do, on the copy: the brush's result, or the colour changed.
  function previewTool() {
    if (!tool) return; const { P, kind } = tool, data = new ImageData(new Uint8ClampedArray(tool.base.data), P.W, P.H);
    let any = false;
    if (kind === 'recolour') { any = !!tool.from; if (any) recolourData(data, { from: tool.from, to: q('.ie-to').value, tolerance: +q('.ie-tol').value }); }
    else {
      const w = maskWeights(bmask, P.W, P.H); any = w.some(v => v > 0.01);
      if (any && kind === 'hide') hideData(data, w, { mode: q('.ie-b-mode').value, strength: +q('.ie-b-k').value });
      if (any && kind === 'erase') eraseData(data, w);
      if (any && kind === 'cutout') { const d = data.data, o = bar.querySelector('.ie-b-mode').value === 'restore';
        if (!o) for (let i = 0; i < w.length; i++) d[i * 4 + 3] *= 1 - w[i]; }
    }
    bpic.getContext('2d').putImageData(data, 0, 0);
    bview.classList.toggle('ie-shown', any && kind !== 'cutout');
    bar.querySelector('[data-b="apply"]').disabled = !any;
  }
  async function applyTool(btn) {
    const { kind } = tool;
    await busy(btn, t('Aplicando…'), async () => {
      let made = null;
      if (kind === 'hide') made = await hideArea(id, bmask, { mode: q('.ie-b-mode').value, strength: +q('.ie-b-k').value });
      else if (kind === 'erase' && q('.ie-b-fill').value === 'ai') { await eraseWithAI(); return endTool(); }
      else if (kind === 'erase') made = await eraseArea(id, bmask);
      else if (kind === 'cutout') made = await retouchCutout(id, bmask, q('.ie-b-mode').value);
      else if (kind === 'recolour') made = await recolour(id, { from: tool.from, to: q('.ie-to').value, tolerance: +q('.ie-tol').value });
      endTool(); if (made) done();
    });
  }
  // With AI: the picture with what is painted in magenta, and the model asked to take it away (Editar con IA's «erase»).
  async function eraseWithAI() {
    const b = cur(); if (!b) return;
    const P = await pixelsOf(b.src, 1536), w = maskWeights(bmask, P.W, P.H), d = P.data.data;
    for (let i = 0; i < w.length; i++) if (w[i] > 0.05) { d[i * 4] = 255; d[i * 4 + 1] = 0; d[i * 4 + 2] = 255; d[i * 4 + 3] = 255; }
    P.g.putImageData(P.data, 0, 0);
    const marked = { ...structuredClone(b), src: P.c.toDataURL('image/jpeg', 0.9) };
    const [{ run }, A] = await Promise.all([import('./ai.js'), import('../../features/ai/openrouter.js')]);
    const made = await run(() => A.editImage(marked, 'erase', { what: 'the area painted over in solid magenta (whatever is under it, and the magenta paint itself)' }));
    if (made) { commit(() => { const x = cur(); if (x) { x.src = made; delete x.crop; delete x.uncropped; } }); done(); }
  }
  for (const k of ['hide', 'erase', 'recolour', 'cutout']) act(`[data-do="tool-${k}"]`, () => startTool(k));

  // ---- Ampliar
  const extOpts = () => ({ ratio: q('.ie-ratio').value, margin: +q('.ie-mg').value, fill: q('.ie-fill').value, color: q('.ie-color').value });
  let pending = 0;
  async function previewExtend() {
    const b = cur(); if (!b || !still || shown !== 'extend') return;
    const n = ++pending, img = await loadPicture(b.src).catch(() => null); if (!img || n !== pending || shown !== 'extend') return;
    const part = visiblePart(b, img.naturalWidth, img.naturalHeight).src, made = extendCanvas(img, part, { ...extOpts(), max: 640 });
    // (In a mirror, what touches an edge is repeated: right for grass or sky, odd for a person — and the more is added,
    // the more copies. Said while it is the choice, the more plainly when the picture would come back several times.)
    const many = made && (made.pad[0] > part[2] * 0.6 || made.pad[1] > part[3] * 0.6);
    note.textContent = !made ? t('La imagen ya tiene esa forma.') : extOpts().fill !== 'mirror' ? ''
      : many ? t('Hay que añadir mucho: el espejo repetiría la foto varias veces. Mejor «desenfocada» o «Con IA…».')
      : t('En espejo queda bien si en los bordes solo hay fondo (césped, cielo, una pared). Si algo importante toca el borde, prueba «desenfocada» o «Con IA…».');
    extendPreview = made ? made.canvas.toDataURL('image/png') : ''; paint();   // (PNG: its transparency shown as such)
  }
  if (still) {
    const sync = () => { q('.ie-margin').hidden = q('.ie-ratio').value !== 'margin'; q('.ie-color-l').hidden = q('.ie-fill').value !== 'color'; previewExtend(); };
    for (const s of ['.ie-ratio', '.ie-fill', '.ie-mg', '.ie-color']) q(s).addEventListener('input', sync);
    sync();
    // (A see-through picture — a logo —: its new room left see-through too, at first.)
    loadPicture(cur()?.src || '').then(img => { if (seeThrough(img) > 0.03) { q('.ie-fill').value = 'none'; sync(); } }).catch(() => {});
    act('[data-do="extend"]', e => busy(e.currentTarget, t('Ampliando…'), async () => {
      if (!(await extendImage(id, extOpts()))) throw new Error(t('La imagen ya tiene esa forma.'));
      extendPreview = ''; paint(); done();
    }));
    act('[data-do="extend-ai"]', () => { close(); import('./imageai.js').then(m => m.openImageAI(cur(), { kind: 'expand' })); });
    // ---- Capas
    act('[data-do="layers"]', e => busy(e.currentTarget, t('Separando la figura del fondo…'), async () => {
      const ai = q('.ie-hole').value === 'ai';
      if (!(await splitLayers(id))) return;
      close();
      // (With AI: the background's blurred patch redrawn as what would be behind — a step of its own.)
      if (ai) { const [{ run }, A] = await Promise.all([import('./ai.js'), import('../../features/ai/openrouter.js')]); const b = cur();
        if (b) run(() => A.editImage(b, 'erase', { what: 'the blurred, smeared patch where something was cut out: rebuild the background that would be behind it' })); }
    }));
  }
  pic.addEventListener('load', () => { if (straight()) paint(); });
  requestAnimationFrame(onTab);
}
