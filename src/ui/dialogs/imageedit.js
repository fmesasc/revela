// «Editar imagen» (Imagen ▸ Ajustar, or the picture's right-click menu): everything done to a picture in one place,
// as Canva's photo editor, with the picture in sight beside it as it will look. Francisco, 2026-10-16: «en Canva
// puedes extender la imagen, recortarla, eliminar fondo, aplicar filtros y despegar capas».
// - Ajustes: PowerPoint's corrections and four more (warmth, hue, sharpness, vignette): b.adj;
// - Filtros: a gallery of the picture itself with each one, and how strong: b.fx (render/imagelook.js);
// - Recortar and Fondo: the tools that were already there (cropping on the picture, to a shape; the background removal);
// - Ampliar: more picture around it without AI (features/document/imagetools.js), or with it (Editar con IA);
// - Capas: the subject lifted off its background, two objects.
// Colour changes are live and undo with Ctrl+Z like any other (a slider dragged: one step); the others are one step each.

import { esc } from '../../core/text.js';
import { commit, currentSlide, subscribe } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { FILTERS, DUOTONE, ensureLook } from '../../render/imagelook.js';
import { imgFilter } from '../../render/svg.js';
import { isGif } from '../../features/live/media.js';
import { uncrop } from '../../features/document/crop.js';
import { EXTEND_RATIOS, EXTEND_FILLS, extendCanvas, extendImage, loadPicture, visiblePart, splitLayers } from '../../features/document/imagetools.js';
import { tabsHTML, wireTabs, moreHTML, tipHTML, footHTML } from './dlgkit.js';
import { IMG_PRESETS, openImageCrop, removeBackground } from './object.js';
import { alertDialog } from './dialog.js';
import { applyImgStyle } from '../canvas/content.js';
import { blobURL } from '../../io/formats/blobmedia.js';

// [property, label, min, max, neutral]; the first four in sight, the rest under «Más opciones».
const SLIDERS = [['brightness', 'Brillo', 0, 200, 100], ['contrast', 'Contraste', 0, 200, 100], ['saturate', 'Saturación', 0, 200, 100], ['warmth', 'Calidez', -100, 100, 0],
  ['hue', 'Tono', -180, 180, 0], ['sharpen', 'Nitidez', -100, 100, 0], ['vignette', 'Viñeta', 0, 100, 0], ['opacity', 'Opacidad', 0, 100, 100]];
const NEUTRAL = Object.fromEntries(SLIDERS.map(s => [s[0], s[4]]));

export function openImageEditor(b0, tab = '') {
  if (document.getElementById('imged-modal')) return;
  const id = b0.id, cur = () => currentSlide().blocks.find(x => x.id === id);
  const back = document.createElement('div'); back.id = 'imged-modal'; back.className = 'modal-backdrop';
  const src = esc(blobURL(b0.src || '')), still = !isGif(b0);
  const slider = ([k, label, min, max, z]) => `<label class="fr-l ie-sl">${t(label)}<input type="range" data-adj="${k}" min="${min}" max="${max}" value="${b0.adj?.[k] ?? z}"></label>`;
  const opts = list => list.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('');
  const tabs = [
    { id: 'adjust', icon: 'tune', label: t('Ajustes'), html: `<div class="ia-presets">${IMG_PRESETS.map(([n], i) => `<button type="button" data-ip="${i}"><img src="${src}" alt=""><span>${esc(t(n))}</span></button>`).join('')}</div>
      ${SLIDERS.slice(0, 4).map(slider).join('')}${moreHTML(SLIDERS.slice(4).map(slider).join(''))}
      <button type="button" class="mini2 ie-reset">${t('Restablecer')}</button>` },
    { id: 'filters', icon: 'photo_filter', label: t('Filtros'), html: `<div class="ie-filters">${[['', 'Ninguno'], ...FILTERS].map(([k, n]) =>
        `<button type="button" data-fx="${k}" aria-pressed="false"><img src="${src}" alt=""><span>${esc(t(n))}</span></button>`).join('')}</div>
      <label class="fr-l ie-amount">${t('Intensidad')}<input type="range" class="ie-amt" min="0" max="100" value="${b0.fx?.amount ?? 100}"></label>
      <div class="ie-duo" hidden><label class="fr-l">${t('Sombras')}<input type="color" class="ie-dark" value="${b0.fx?.dark || DUOTONE.dark}"></label>
        <label class="fr-l">${t('Luces')}<input type="color" class="ie-light" value="${b0.fx?.light || DUOTONE.light}"></label></div>` },
    { id: 'crop', icon: 'crop', label: t('Recortar'), html: `<div class="ie-acts">
      <button type="button" class="mini2" data-do="crop"><i class="ms" aria-hidden="true">crop</i> ${t('Recortar en la imagen')}</button>
      <button type="button" class="mini2" data-do="ratio"><i class="ms" aria-hidden="true">crop_square</i> ${t('Recortar a una proporción…')}</button>
      <button type="button" class="mini2" data-do="uncrop"><i class="ms" aria-hidden="true">restart_alt</i> ${t('Quitar el recorte')}</button></div>` },
    { id: 'background', icon: 'auto_fix_high', label: t('Fondo'), html: `<p class="ie-say">${t('Deja solo lo principal de la foto, sin el fondo.')}</p>
      <button type="button" class="fr-do" data-do="nobg"><i class="ms" aria-hidden="true">auto_fix_high</i> ${t('Quitar fondo')}</button>
      ${tipHTML(t('Lo hace una IA en tu navegador: la foto no sale de tu equipo. La primera vez tarda un poco más (descarga el modelo).'))}` },
    { id: 'extend', icon: 'open_in_full', label: t('Ampliar'), html: still ? `<label class="fr-l">${t('Nueva forma')}<select class="ie-ratio">${opts(EXTEND_RATIOS)}</select></label>
      <label class="fr-l ie-margin" hidden>${t('Margen')} <input type="range" class="ie-mg" min="5" max="60" value="15"></label>
      <label class="fr-l">${t('Rellenar con')}<select class="ie-fill">${opts(EXTEND_FILLS)}</select></label>
      <label class="fr-l ie-color-l" hidden>${t('Color')}<input type="color" class="ie-color" value="#ffffff"></label>
      <div class="ie-acts"><button type="button" class="fr-do" data-do="extend"><i class="ms" aria-hidden="true">open_in_full</i> ${t('Ampliar')}</button>
        <button type="button" class="mini2" data-do="extend-ai"><i class="ms" aria-hidden="true">magic_button</i> ${t('Con IA…')}</button></div>
      ${tipHTML(t('Sin IA, la imagen se extiende con una copia desenfocada, sus bordes en espejo o un color. «Con IA» inventa lo que habría alrededor.'))}`
      : `<p class="ie-say">${t('Solo con fotos fijas (no con un GIF animado).')}</p>` },
    { id: 'layers', icon: 'layers', label: t('Capas'), html: still ? `<p class="ie-say">${t('Separa lo principal de la foto de su fondo: dos objetos, uno encima del otro, para mover, animar o poner texto entre ellos.')}</p>
      <label class="fr-l">${t('El hueco del fondo')}<select class="ie-hole">${opts([['near', 'Rellenarlo con lo que hay alrededor'], ['ai', 'Rellenarlo con IA (más natural)']])}</select></label>
      <button type="button" class="fr-do" data-do="layers"><i class="ms" aria-hidden="true">layers</i> ${t('Separar en capas')}</button>
      ${tipHTML(t('La figura se recorta con la misma IA que «Quitar fondo». Las dos capas quedan seleccionadas; haz clic en la figura para moverla sola.'))}`
      : `<p class="ie-say">${t('Solo con fotos fijas (no con un GIF animado).')}</p>` },
  ];
  back.innerHTML = `<div class="modal dk ie" role="dialog" aria-modal="true" aria-labelledby="ie-title">
    <button class="modal-close" aria-label="${esc(t('Cerrar'))}">✕</button><h3 id="ie-title">${t('Editar imagen')}</h3>
    <div class="ie-body">${tabsHTML(tabs)}<div class="ie-view"><div class="ie-frame"><div class="ie-stage"><img class="ie-pic" alt=""></div></div><p class="ie-note" aria-live="polite"></p></div></div>
    ${footHTML(`<button type="button" class="fr-do ie-ok">${t('Listo')}</button>`)}</div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), qa = s => [...back.querySelectorAll(s)], pic = q('.ie-pic'), note = q('.ie-note');
  let extendPreview = '';
  // The picture as on the slide (its box, fit, crop and look), scaled to the pane: its filter's sizes are the box's.
  const paint = () => {
    const b = cur(); if (!b) return close();
    const st = q('.ie-stage'), fr = q('.ie-frame'), k = Math.min(fr.clientWidth / (b.w || 1), fr.clientHeight / (b.h || 1)) || 0.3;
    if (extendPreview) { st.style.cssText = 'inset:0'; pic.removeAttribute('style'); pic.className = 'ie-pic ie-ext'; if (pic.src !== extendPreview) pic.src = extendPreview; return; }
    pic.className = 'ie-pic';
    st.style.cssText = `width:${b.w}px;height:${b.h}px;transform:scale(${k});left:${(fr.clientWidth - b.w * k) / 2}px;top:${(fr.clientHeight - b.h * k) / 2}px`;
    const s = blobURL(b.src || ''); if (pic.getAttribute('src') !== s) pic.src = s;
    pic.style.width = pic.style.height = '100%'; applyImgStyle(pic, b);
    // (Which filter is on, and the sliders where the picture is: after an undo too.)
    qa('[data-fx]').forEach(x => x.setAttribute('aria-pressed', String((b.fx?.name || '') === x.dataset.fx)));
    q('.ie-amount').hidden = !b.fx; q('.ie-duo').hidden = b.fx?.name !== 'duotone';
    if (b.fx) q('.ie-amt').value = b.fx.amount ?? 100;
    qa('[data-adj]').forEach(r => { if (document.activeElement !== r) r.value = b.adj?.[r.dataset.adj] ?? NEUTRAL[r.dataset.adj]; });
    q('[data-do="uncrop"]').hidden = !(b.crop || b.uncropped);
  };
  const off = subscribe(() => requestAnimationFrame(paint));
  const close = () => { off(); back.remove(); };
  q('.modal-close').addEventListener('click', close); q('.ie-ok').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const showTab = wireTabs(back, 'revela.imageedit.tab');
  if (tab) showTab(tab);
  // (Ampliar shows what it would make; the other tabs, the picture.)
  let shown = '';
  const onTab = () => { const now = q('.dk-tab[aria-selected=true]')?.dataset.tab; if (now === shown) return; shown = now; extendPreview = ''; if (now === 'extend') previewExtend(); else paint(); };
  for (const ev of ['click', 'keyup']) q('.dk-tablist').addEventListener(ev, onTab);

  // ---- Ajustes
  const look = (fn, live = false) => { const b = cur(); if (b) commit(() => fn(b), { history: !live }); };
  const setAdj = (k, v) => look(b => { b.adj = { brightness: 100, contrast: 100, saturate: 100, opacity: 100, ...b.adj, [k]: +v };
    for (const p of ['warmth', 'hue', 'sharpen', 'vignette']) if (!b.adj[p]) delete b.adj[p]; }, true);
  qa('[data-adj]').forEach(r => r.addEventListener('input', () => setAdj(r.dataset.adj, r.value)));
  qa('[data-ip] img').forEach((img, i) => { const v = IMG_PRESETS[i][1]; img.style.filter = `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%)`; img.style.opacity = v.opacity / 100; });
  qa('[data-ip]').forEach(x => x.addEventListener('click', () => look(b => { b.adj = { ...b.adj, ...IMG_PRESETS[+x.dataset.ip][1] }; })));
  q('.ie-reset').addEventListener('click', () => look(b => { delete b.adj; }));

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

  // ---- Recortar, Fondo
  const act = (sel, fn) => q(sel)?.addEventListener('click', fn);
  act('[data-do="crop"]', () => { close(); import('../canvas/imagecrop.js').then(m => m.startImageCrop(cur())); });
  act('[data-do="ratio"]', () => { close(); openImageCrop(cur()); });
  act('[data-do="uncrop"]', () => uncrop(id));
  const busy = async (btn, msg, fn) => {
    btn.disabled = true; note.textContent = msg;
    try { await fn(); note.textContent = ''; } catch (e) { note.textContent = ''; alertDialog(e.message || String(e)); } finally { btn.disabled = false; }
  };
  act('[data-do="nobg"]', e => busy(e.currentTarget, t('Quitando el fondo…'), () => removeBackground(cur())));

  // ---- Ampliar
  const extOpts = () => ({ ratio: q('.ie-ratio').value, margin: +q('.ie-mg').value, fill: q('.ie-fill').value, color: q('.ie-color').value });
  let pending = 0;
  async function previewExtend() {
    const b = cur(); if (!b || !still || shown !== 'extend') return;
    const n = ++pending, img = await loadPicture(b.src).catch(() => null); if (!img || n !== pending || shown !== 'extend') return;
    const made = extendCanvas(img, visiblePart(b, img.naturalWidth, img.naturalHeight).src, { ...extOpts(), max: 640 });
    note.textContent = made ? '' : t('La imagen ya tiene esa forma.');
    extendPreview = made ? made.canvas.toDataURL('image/jpeg', 0.85) : ''; paint();
  }
  if (still) {
    const sync = () => { q('.ie-margin').hidden = q('.ie-ratio').value !== 'margin'; q('.ie-color-l').hidden = q('.ie-fill').value !== 'color'; previewExtend(); };
    for (const s of ['.ie-ratio', '.ie-fill', '.ie-mg', '.ie-color']) q(s).addEventListener('input', sync);
    sync();
    act('[data-do="extend"]', e => busy(e.currentTarget, t('Ampliando…'), async () => {
      if (!(await extendImage(id, extOpts()))) throw new Error(t('La imagen ya tiene esa forma.'));
      extendPreview = ''; paint(); note.textContent = t('Hecho. Puedes deshacerlo con Ctrl+Z.');
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
  requestAnimationFrame(onTab);
}
