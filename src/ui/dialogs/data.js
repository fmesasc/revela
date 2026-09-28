// Dialogs for live data: embed a dashboard, link a chart to a CSV.

import { commit } from '../../core/store.js';
import { dashboardEmbed, addDashboard, linkChart, fetchCSV, applyCSV } from '../../features/live/dashboards.js';
import { alertDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

function modal(id, title, body) {
  document.getElementById(id)?.remove();
  const back = document.createElement('div'); back.id = id; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,94vw);max-width:94vw"><button class="modal-close">✕</button><h3>${title}</h3>${body}</div>`;
  document.body.appendChild(back);
  back.querySelector('.modal-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  return back;
}
const NOTE = {
  publish: 'Usa el enlace de «Publicar en la web»: así lo ve cualquiera sin iniciar sesión.',
  signin: 'Informe seguro: quien lo vea debe iniciar sesión con una cuenta con permiso (Power BI).',
  share: 'La hoja debe estar compartida como «Cualquiera con el enlace» o publicada en la web.',
};

export function openDashboardDialog() {
  const back = modal('dash-modal', t('Panel de datos'), `
    <p class="host-help">Power BI · Looker Studio · Tableau Public · Google Sheets · Grafana · Datawrapper · Flourish · Metabase</p>
    <label class="fr-l">${t('Enlace para compartir o código de inserción')}<textarea class="ds-url" rows="3" placeholder="https://app.powerbi.com/view?r=…"></textarea></label>
    <p class="host-help ds-info"></p>
    <label class="fr-l">${t('Recargar cada (minutos, 0 = no)')}<input type="number" class="ds-min" min="0" max="120" value="0"></label>
    <div class="fr-actions"><button class="fr-do ds-go">${t('Insertar')}</button></div>`);
  const q = s => back.querySelector(s);
  q('.ds-url').addEventListener('input', () => {
    const d = dashboardEmbed(q('.ds-url').value);
    q('.ds-info').textContent = !q('.ds-url').value.trim() ? '' : !d ? t('Enlace no válido (debe empezar por https://).')
      : `${d.provider ? '✔ ' + d.provider + '. ' : ''}${d.note ? t(NOTE[d.note]) : ''}`;
  });
  q('.ds-go').addEventListener('click', () => {
    const r = addDashboard(q('.ds-url').value, q('.ds-min').value);
    if (!r) { alertDialog(t('Enlace no válido (debe empezar por https://).')); return; }
    back.remove();
  });
}

export function openLinkChart(b) {
  const back = modal('link-modal', t('Vincular a datos (CSV)'), `
    <p class="host-help">${t('Un CSV publicado en internet, p. ej. Google Sheets › Archivo › Compartir › Publicar en la web › CSV. Primera columna: etiquetas; una columna por serie; primera fila con los nombres.')}</p>
    <label class="fr-l">${t('Dirección del CSV')}<input type="url" class="lk-url" value="${(b.dataUrl || '').replace(/"/g, '&quot;')}" placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"></label>
    <label class="fr-l">${t('Actualizar al presentar cada (segundos, 0 = solo al abrir)')}<input type="number" class="lk-sec" min="0" max="3600" value="${b.refreshSec ?? 60}"></label>
    <div class="fr-actions">${b.dataUrl ? `<button class="lk-off">${t('Desvincular')}</button>` : ''}<button class="fr-do lk-go">${t('Vincular y cargar')}</button></div>`);
  const q = s => back.querySelector(s);
  q('.lk-go').addEventListener('click', async () => {
    try { await linkChart(b, q('.lk-url').value, q('.lk-sec').value); back.remove(); }
    catch (e) { alertDialog(t('No se pudieron leer los datos: ') + (e.message === 'URL' ? t('dirección no válida') : e.message === 'EMPTY' ? t('el CSV está vacío') : e.message + ' ' + t('(¿está publicado y permite el acceso desde otras webs?)'))); }
  });
  q('.lk-off')?.addEventListener('click', () => { commit(() => { delete b.dataUrl; delete b.refreshSec; }); back.remove(); });
}
export async function refreshChart(b) {
  try { applyCSV(b, await fetchCSV(b.dataUrl)); } catch (e) { alertDialog(t('No se pudieron leer los datos: ') + e.message); }
}
