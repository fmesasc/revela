// Header and footer: footer text, date, slide number and logo.

import { state, commit } from '../../core/store.js';
import { t } from '../../i18n/index.js';

const $ = s => document.querySelector(s);

export function openHeaderFooter() {
  if (document.getElementById('hf-modal')) return;
  const f = state.deck.footer, sn = state.deck.slideNumber;
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
  q('.hf-ok').addEventListener('click', close);
}
