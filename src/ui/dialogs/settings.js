// Presentation settings: the reveal.js options people use in its demos
// (controls, progress bar, navigation, scroll view, mouse wheel, shuffle,
// cursor, jump to slide, link previews, right-to-left, Morph timing,
// parallax background, zoom and search) plus this slide's Morph timing, and
// how slides fit a screen of another proportion (with a live preview), the «Confidencial» watermark
// (features/document/watermark.js) and, for this browser, what Revela is used for (core/audience.js).

import { state, commit, currentSlide } from '../../core/store.js';
import { REVEAL_DEFAULTS, buildHTML } from '../../io/formats/html.js';
import { FIT_MODES, FIT_LABELS } from '../../features/design/screenfit.js';
import { t } from '../../i18n/index.js';
import { SHRINK_SIZES, shrinkPrefs, setShrinkPrefs, shrinkDeckImages } from '../../features/document/imgshrink.js';
import { toast } from '../shell/toast.js';
import { audienceField } from '../shell/audience.js';
import { esc } from '../../core/text.js';

// The current slide presented on three common screens with a fit mode: the real
// presentation page, without its live parts (polls, cameras, 3D, videos…).
const STILL = new Set(['text', 'shape', 'image', 'icon', 'chart', 'table', 'math', 'ink', 'connector', 'diagram', 'code']);
export const FIT_SCREENS = [['16:9', 16, 9], ['16:10', 16, 10], ['4:3', 4, 3]];
export function fitPreviewHTML(mode, deck = state.deck, slide = currentSlide()) {
  const s = { ...slide, hidden: false, blocks: (slide.blocks || []).filter(b => STILL.has(b.type)), autoSlide: 0, notes: '', transition: 'none' };
  const d = { ...deck, slides: [s], reveal: { ...(deck.reveal || {}), fit: mode, controls: false, progress: false, view: 'slides' }, slideNumber: { show: false } };
  // (So small, reveal.js would turn into its scrolling view for phones.)
  return buildHTML(d, { inApp: true }).replace('Reveal.initialize({', 'Reveal.initialize({ scrollActivationWidth: null,').replace('</head>',
    '<style>.reveal .controls,.reveal .progress,.reveal .slide-number,#ink-bar,#rv-class{display:none!important}</style></head>');
}
function showFitPreview(box, mode) {
  const html = fitPreviewHTML(mode);
  box.querySelectorAll('iframe').forEach(f => { f.srcdoc = html; });
}

export function openSettings() {
  document.getElementById('set-modal')?.remove();
  const o = { ...REVEAL_DEFAULTS, ...(state.deck.reveal || {}) }, s = currentSlide(), wm = state.deck.watermark;
  const ck = (k, l) => `<label class="fr-chk"><input type="checkbox" data-k="${k}"${o[k] ? ' checked' : ''}> ${t(l)}</label>`;
  const sel = (k, l, opts) => `<label class="fr-l">${t(l)}<select data-k="${k}">${opts.map(([v, n]) => `<option value="${v}"${String(o[k]) === String(v) ? ' selected' : ''}>${t(n)}</option>`).join('')}</select></label>`;
  const back = document.createElement('div'); back.id = 'set-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(640px,94vw);max-width:94vw;max-height:88vh;overflow:auto">
    <button class="modal-close">✕</button><h3>${t('Configuración de la presentación')}</h3>
    <div class="set-grid">
      <fieldset class="bgf set-fit"><legend>${t('Pantalla')}</legend>
        ${sel('fit', 'Ajuste a la pantalla', FIT_MODES.map(m => [m, FIT_LABELS[m]]))}
        <p class="host-help">${t('Cuando la pantalla no tiene la proporción de las diapositivas (por ejemplo, un portátil 16:10 con diapositivas 16:9):')}</p>
        <div class="fit-prev">${FIT_SCREENS.map(([n, a, b]) => `<figure><iframe tabindex="-1" aria-hidden="true" style="aspect-ratio:${a}/${b}"></iframe><figcaption>${t('Pantalla')} ${n}</figcaption></figure>`).join('')}</div>
      </fieldset>
      <fieldset class="bgf"><legend>${t('Navegación')}</legend>
        ${ck('controls', 'Flechas de navegación')}
        ${sel('controlsLayout', 'Posición de las flechas', [['bottom-right', 'Abajo a la derecha'], ['edges', 'En los bordes']])}
        ${ck('progress', 'Barra de progreso')}
        ${sel('navigationMode', 'Modo de navegación', [['default', 'Normal'], ['linear', 'Lineal (todo con ← →)'], ['grid', 'Cuadrícula']])}
        ${sel('view', 'Vista', [['slides', 'Diapositivas'], ['scroll', 'Desplazamiento (como una página)']])}
        ${ck('mouseWheel', 'Avanzar con la rueda del ratón')}
        ${ck('jumpToSlide', 'Ir a una diapositiva con G + número')}
        ${ck('shuffle', 'Orden aleatorio')}
        ${ck('rtl', 'De derecha a izquierda')}
        ${ck('autoSlideStoppable', 'El avance automático se detiene al tocar')}
      </fieldset>
      <fieldset class="bgf"><legend>${t('Presentación')}</legend>
        ${ck('hideInactiveCursor', 'Ocultar el cursor si no se mueve')}
        ${ck('previewLinks', 'Abrir los enlaces en una vista previa')}
        ${ck('zoom', 'Ampliar con Alt + clic')}
        ${ck('search', 'Buscar con Ctrl + Mayús + F')}
        ${ck('fragmentInURL', 'Recordar el paso de animación en la dirección')}
        <label class="fr-l">${t('Fondo parallax (imagen que se desplaza)')}<input type="url" data-k="parallax" placeholder="https://…/fondo.jpg" value="${(o.parallax || '').replace(/"/g, '&quot;')}"></label>
        <label class="fr-l">${t('Tamaño del fondo parallax')}<input type="text" data-k="parallaxSize" placeholder="2100px 900px" value="${(o.parallaxSize || '').replace(/"/g, '&quot;')}"></label>
      </fieldset>
      <fieldset class="bgf"><legend>${t('Transformar (Morph)')}</legend>
        <label class="fr-l">${t('Duración (s)')}<input type="number" data-k="autoAnimateDuration" min="0.1" max="10" step="0.1" value="${o.autoAnimateDuration}"></label>
        ${sel('autoAnimateEasing', 'Curva', [['ease', 'Suave'], ['linear', 'Lineal'], ['ease-in', 'Acelerar'], ['ease-out', 'Frenar'], ['ease-in-out', 'Acelerar y frenar'], ['cubic-bezier(0.68,-0.55,0.27,1.55)', 'Con rebote']])}
        <p class="host-help">${t('Esta diapositiva (vacío = como la presentación):')}</p>
        <label class="fr-l">${t('Duración (s)')}<input type="number" class="sl-dur" min="0.1" max="10" step="0.1" value="${s.aaDuration ?? ''}"></label>
        <label class="fr-l">${t('Retardo (s)')}<input type="number" class="sl-del" min="0" max="10" step="0.1" value="${s.aaDelay ?? ''}"></label>
      </fieldset>
      <fieldset class="bgf set-wm"><legend>${t('Marca de agua')}</legend>
        <label class="fr-chk"><input type="checkbox" class="wm-on"${wm ? ' checked' : ''}> ${t('Marca de agua «Confidencial» al presentar, compartir y exportar')}</label>
        <label class="fr-l">${t('Texto')}<input type="text" class="wm-text" maxlength="60" placeholder="${esc(t('CONFIDENCIAL'))}" value="${esc(wm?.text || '')}"></label>
        <label class="fr-chk"><input type="checkbox" class="wm-email"${wm?.email ? ' checked' : ''}> ${t('Con el correo de quien la abre (enlaces con seguimiento que piden el correo)')}</label>
        <p class="host-help">${t('En diagonal y discreta sobre cada diapositiva: en el visor, al presentar, en la página web y en el PDF. Quien la ve no puede quitarla, pero es un aviso que disuade, no una protección: una copia se puede manipular y una pantalla siempre se puede fotografiar.')}</p>
      </fieldset>
      <fieldset class="bgf set-aud"><legend>${t('Uso de Revela (en este navegador)')}</legend>
        <p class="host-help">${t('Qué ejemplos ves primero y, para empresa, sin los botones solo para docentes (siguen en la búsqueda de comandos).')}</p>
      </fieldset>
      <fieldset class="bgf"><legend>${t('Imágenes (en este navegador)')}</legend>
        <label class="fr-l">${t('Reducir las imágenes grandes al insertarlas')}<select class="img-max">${SHRINK_SIZES.map(v => `<option value="${v}"${shrinkPrefs().max === v ? ' selected' : ''}>${v ? t('Como máximo {n} px').replace('{n}', v) + (v === 1920 ? ' · ' + t('recomendado') : '') : t('No reducir')}</option>`).join('')}</select></label>
        <label class="fr-l">${t('Calidad')} <span class="img-q-val">${Math.round(shrinkPrefs().quality * 100)} %</span><input type="range" class="img-q" min="0.5" max="0.95" step="0.05" value="${shrinkPrefs().quality}"></label>
        <p class="host-help">${t('Una foto del móvil pesa varios MB; en una diapositiva se ve igual a 1920 px y la presentación se guarda, abre y comparte mucho más rápido. Las transparencias se conservan; los dibujos (SVG) y las animaciones (GIF) no se tocan.')}</p>
        <button type="button" class="mini2 img-now"><i class="ms">compress</i> ${t('Reducir ahora las imágenes de esta presentación')}</button>
      </fieldset>
    </div>
    <div class="fr-actions"><button class="fr-do set-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  back.querySelector('.set-aud legend').after(audienceField());   // (kept at once, like the pictures' choice)
  const fitSel = back.querySelector('[data-k="fit"]'), prev = back.querySelector('.fit-prev');
  showFitPreview(prev, fitSel.value);
  fitSel.addEventListener('change', () => showFitPreview(prev, fitSel.value));
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  // Pictures: a choice of this browser (not of the presentation), kept at once.
  const imgMax = back.querySelector('.img-max'), imgQ = back.querySelector('.img-q');
  const keepImg = () => setShrinkPrefs({ max: +imgMax.value, quality: +imgQ.value });
  imgMax.addEventListener('change', keepImg);
  imgQ.addEventListener('input', () => { back.querySelector('.img-q-val').textContent = Math.round(imgQ.value * 100) + ' %'; keepImg(); });
  back.querySelector('.img-now').addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true;
    const note = toast(t('Reduciendo las imágenes…'), { busy: true });
    try {
      const r = await shrinkDeckImages({ max: +imgMax.value || 1920, quality: +imgQ.value });
      note.close();
      toast(r.done ? t('{n} imágenes reducidas: {mb} MB menos.').replace('{n}', r.done).replace('{mb}', (r.saved / 1048576).toLocaleString(undefined, { maximumFractionDigits: 1 })) : t('No hay imágenes que reducir: ya son pequeñas.'));
    } catch { note.close(); } finally { btn.disabled = false; }
  });
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.set-ok').addEventListener('click', () => {
    const r = {};
    back.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value.trim();
      if (String(v) !== String(REVEAL_DEFAULTS[k] ?? '')) r[k] = v;
    });
    const dur = back.querySelector('.sl-dur').value, del = back.querySelector('.sl-del').value;
    // (The watermark: a setting of the presentation — features/document/watermark.js.)
    const wmText = back.querySelector('.wm-text').value.trim(), mark = back.querySelector('.wm-on').checked && { ...(wmText && { text: wmText }), ...(back.querySelector('.wm-email').checked && { email: true }) };
    commit(() => {
      if (mark) state.deck.watermark = mark; else delete state.deck.watermark;
      if (Object.keys(r).length) state.deck.reveal = r; else delete state.deck.reveal;
      if (dur) s.aaDuration = +dur; else delete s.aaDuration;
      if (del) s.aaDelay = +del; else delete s.aaDelay;
    });
    close();
  });
}
