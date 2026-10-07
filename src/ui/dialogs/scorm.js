// Export ▸ SCORM: a fixed copy (it works without internet) or a dynamic one (it opens the presentation from Revela's
// cloud: what is corrected there reaches the students without uploading anything again). The pass mark. (io/export/scorm.js)

import * as cd from '../../io/cloud/clouddocs.js';
import { exportScorm } from '../../io/export/scorm.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';
import { toast } from '../shell/toast.js';

export function openScormExport() {
  document.getElementById('scorm-modal')?.remove();
  const doc = cd.cloudDoc(), owner = doc && (doc.role === 'owner' || doc.sharing), link = doc?.sharing?.link || 'none';
  const back = document.createElement('div'); back.id = 'scorm-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Exportar SCORM')}</h3>
    <p class="host-help">${t('Para Moodle, Canvas u otra plataforma: cada alumno la recorre a su ritmo, responde sus cuestionarios y actividades, y la plataforma recibe su nota (la media, sobre 100) y dónde se quedó.')}</p>
    <label class="fr-chk"><input type="radio" name="sc" value="fixed" checked> <b>${t('Copia fija')}</b> — ${t('la presentación va dentro del paquete y funciona sin internet. Si la cambias, hay que exportarla y subirla otra vez.')}</label>
    <label class="fr-chk"><input type="radio" name="sc" value="live"${owner ? '' : ' disabled'}> <b>${t('Dinámica')}</b> — ${t('el paquete abre la presentación desde tu nube de Revela: lo que corrijas lo verán tus alumnos la próxima vez, sin volver a subir nada. Necesita internet.')}</label>
    ${!doc ? `<p class="host-help">${t('Para la dinámica, guárdala primero en tu nube de Revela.')}</p>`
      : !owner ? `<p class="host-help">${t('Para la dinámica tiene que exportarla quien puede compartirla.')}</p>`
      : link === 'none' || link === 'edit' ? `<p class="host-help sc-link">${t('Para la dinámica se compartirá por enlace, solo para ver (sin el editor). Las diapositivas y permisos que elijas al compartir se respetan.')}</p>` : ''}
    <label class="fr-l">${t('Nota para aprobar (de 0 a 100)')}<input type="number" class="sc-pass" min="0" max="100" value="50" style="width:7em"></label>
    <div class="fr-actions"><span></span><button type="button" class="fr-do sc-go">${t('Exportar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.sc-go').addEventListener('click', async () => {
    const pass = Math.max(0, Math.min(100, Math.round(+q('.sc-pass').value) || 0)), live = q('input[name=sc]:checked').value === 'live';
    q('.sc-go').disabled = true;
    try {
      if (live && (link === 'none' || link === 'edit')) { const r = await cd.shareDoc(doc.id, { link: 'view' }); cd.setSharing(r.sharing); }
      const offline = await exportScorm({ pass, ...(live && { docId: doc.id }) });
      close();
      toast(live ? t('Paquete SCORM dinámico descargado: súbelo a tu plataforma como «Paquete SCORM». Mostrará siempre la última versión de tu nube.')
        : offline ? t('Paquete SCORM descargado: súbelo a tu plataforma como «Paquete SCORM».') : t('Paquete SCORM descargado, pero para abrirlo hará falta conexión a internet.'), { ms: 9000 });
    } catch (e) { q('.sc-go').disabled = false; alertDialog(String(e.message || e)); }
  });
}
