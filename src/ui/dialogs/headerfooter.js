// Header and footer: footer text, date, slide number and logo; and the sections bar (render/sectionbar.js).

import { state, commit } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { SECTION_BAR_STYLES } from '../../render/sectionbar.js';

const $ = s => document.querySelector(s);

export function openHeaderFooter() {
  if (document.getElementById('hf-modal')) return;
  const f = state.deck.footer, sn = state.deck.slideNumber, sb = (state.deck.sectionBar ??= { show: false, position: 'top', style: 'dots', skipTitle: true });
  const noSections = !(state.deck.sections || []).length;
  const back = document.createElement('div');
  back.id = 'hf-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Encabezado y pie')}</h3>
    <label class="fr-chk"><input type="checkbox" class="hf-foot" ${f.show ? 'checked' : ''}> ${t('Mostrar pie de página')}</label>
    <label class="fr-l">${t('Texto del pie')}<input type="text" class="hf-text" value="${(f.text || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-chk"><input type="checkbox" class="hf-date" ${f.date ? 'checked' : ''}> ${t('Fecha')}</label>
    <label class="fr-chk"><input type="checkbox" class="hf-num" ${sn.show ? 'checked' : ''}> ${t('Número de diapositiva')}</label>
    <label class="fr-l">${t('Posición del número')}<select class="hf-pos">${[['br', 'Abajo dcha.'], ['bl', 'Abajo izq.'], ['tr', 'Arriba dcha.'], ['tl', 'Arriba izq.']].map(([v, l]) => `<option value="${v}"${(sn.position || 'br') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Formato del número')}<select class="hf-fmt"><option value="c"${(sn.format || 'c') === 'c' ? ' selected' : ''}>1</option><option value="c/t"${sn.format === 'c/t' ? ' selected' : ''}>1 / N</option></select></label>
    <h4 style="margin:14px 0 4px">${t('Barra de secciones')}</h4>
    <p class="host-help" style="margin:0 0 6px">${t('Como en las presentaciones de LaTeX: dice en qué sección estás y cuánto queda de ella.')}</p>
    <label class="fr-chk"><input type="checkbox" class="hf-sb" ${sb.show ? 'checked' : ''}> ${t('Mostrar la barra de secciones')}</label>
    ${noSections ? `<p class="host-help hf-sb-none" style="margin:0 0 6px">${t('Aún no hay secciones: créalas en el panel de diapositivas (clic derecho ▸ «Crear sección aquí»).')}</p>` : ''}
    <label class="fr-l">${t('Posición de la barra')}<select class="hf-sb-pos">${[['top', 'Arriba'], ['bottom', 'Abajo']].map(([v, l]) => `<option value="${v}"${(sb.position || 'top') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Estilo de la barra')}<select class="hf-sb-style">${SECTION_BAR_STYLES.map(([v, l]) => `<option value="${v}"${(sb.style || 'dots') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-chk"><input type="checkbox" class="hf-sb-title" ${sb.skipTitle !== false ? 'checked' : ''}> ${t('Sin barra en las portadas')}</label>
    <p class="host-help" style="margin:0">${t('Para quitarla de una diapositiva: clic derecho en su miniatura ▸ «Ocultar la barra de secciones aquí».')}</p>
    <div class="fr-actions"><button class="fr-do hf-ok">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s); const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.hf-foot').addEventListener('change', e => commit(() => { state.deck.footer.show = e.target.checked; }));
  q('.hf-text').addEventListener('input', e => commit(() => { state.deck.footer.text = e.target.value; }, { history: false }));
  q('.hf-date').addEventListener('change', e => commit(() => { state.deck.footer.date = e.target.checked; }));
  q('.hf-num').addEventListener('change', e => commit(() => { state.deck.slideNumber.show = e.target.checked; }));
  q('.hf-pos').addEventListener('change', e => commit(() => { state.deck.slideNumber.position = e.target.value; }));
  q('.hf-fmt').addEventListener('change', e => commit(() => { state.deck.slideNumber.format = e.target.value; }));
  const sbSet = fn => commit(() => { fn(state.deck.sectionBar ??= { show: false, position: 'top', style: 'dots', skipTitle: true }); });
  q('.hf-sb').addEventListener('change', e => sbSet(x => { x.show = e.target.checked; }));
  q('.hf-sb-pos').addEventListener('change', e => sbSet(x => { x.position = e.target.value; }));
  q('.hf-sb-style').addEventListener('change', e => sbSet(x => { x.style = e.target.value; }));
  q('.hf-sb-title').addEventListener('change', e => sbSet(x => { x.skipTitle = e.target.checked; }));
  q('.hf-ok').addEventListener('click', close);
}
