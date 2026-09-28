// Presentation settings: the reveal.js options people use in its demos
// (controls, progress bar, navigation, scroll view, mouse wheel, shuffle,
// cursor, jump to slide, link previews, right-to-left, Morph timing,
// parallax background, zoom and search) plus this slide's Morph timing.

import { state, commit, currentSlide } from '../core/store.js';
import { REVEAL_DEFAULTS } from '../io/reveal.js';
import { t } from '../i18n.js';

export function openSettings() {
  document.getElementById('set-modal')?.remove();
  const o = { ...REVEAL_DEFAULTS, ...(state.deck.reveal || {}) }, s = currentSlide();
  const ck = (k, l) => `<label class="fr-chk"><input type="checkbox" data-k="${k}"${o[k] ? ' checked' : ''}> ${t(l)}</label>`;
  const sel = (k, l, opts) => `<label class="fr-l">${t(l)}<select data-k="${k}">${opts.map(([v, n]) => `<option value="${v}"${String(o[k]) === String(v) ? ' selected' : ''}>${t(n)}</option>`).join('')}</select></label>`;
  const back = document.createElement('div'); back.id = 'set-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(640px,94vw);max-width:94vw;max-height:88vh;overflow:auto">
    <button class="modal-close">✕</button><h3>${t('Configuración de la presentación')}</h3>
    <div class="set-grid">
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
      <fieldset class="bgf"><legend>${t('Morph (Auto-Animate)')}</legend>
        <label class="fr-l">${t('Duración (s)')}<input type="number" data-k="autoAnimateDuration" min="0.1" max="10" step="0.1" value="${o.autoAnimateDuration}"></label>
        ${sel('autoAnimateEasing', 'Curva', [['ease', 'Suave'], ['linear', 'Lineal'], ['ease-in', 'Acelerar'], ['ease-out', 'Frenar'], ['ease-in-out', 'Acelerar y frenar'], ['cubic-bezier(0.68,-0.55,0.27,1.55)', 'Con rebote']])}
        <p class="host-help">${t('Esta diapositiva (vacío = como la presentación):')}</p>
        <label class="fr-l">${t('Duración (s)')}<input type="number" class="sl-dur" min="0.1" max="10" step="0.1" value="${s.aaDuration ?? ''}"></label>
        <label class="fr-l">${t('Retardo (s)')}<input type="number" class="sl-del" min="0" max="10" step="0.1" value="${s.aaDelay ?? ''}"></label>
      </fieldset>
    </div>
    <div class="fr-actions"><button class="fr-do set-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.set-ok').addEventListener('click', () => {
    const r = {};
    back.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value.trim();
      if (String(v) !== String(REVEAL_DEFAULTS[k] ?? '')) r[k] = v;
    });
    const dur = back.querySelector('.sl-dur').value, del = back.querySelector('.sl-del').value;
    commit(() => {
      if (Object.keys(r).length) state.deck.reveal = r; else delete state.deck.reveal;
      if (dur) s.aaDuration = +dur; else delete s.aaDuration;
      if (del) s.aaDelay = +del; else delete s.aaDelay;
    });
    close();
  });
}
