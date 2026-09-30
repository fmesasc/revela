import { ownProject, setOwnProject } from '../../io/cloud/gdrive.js';
import { t } from '../../i18n/index.js';

// Optional: use one's own Google Cloud project instead of Revela's.
export function openGdriveSetup() {
  if (document.getElementById('gd-modal')) return;
  const c = ownProject();
  const back = document.createElement('div');
  back.id = 'gd-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;width:min(520px,94vw);max-width:none">
    <button class="modal-close">✕</button><h3>${t('Conectar con Google Drive')}</h3>
    <p class="host-help">${t('Revela ya viene preparado para Google Drive. Solo si quieres usar tu propio proyecto de Google Cloud (permiso drive.file), escribe aquí su ID de cliente, su clave de API y su número de proyecto; se guardan solo en este navegador. Déjalo vacío para usar el de Revela.')}</p>
    <label class="fr-l">Client ID<input type="text" class="gd-cid" value="${(c.clientId || '').replace(/"/g, '&quot;')}" placeholder="xxxx.apps.googleusercontent.com"></label>
    <label class="fr-l">API key<input type="text" class="gd-key" value="${(c.apiKey || '').replace(/"/g, '&quot;')}" placeholder="AIza..."></label>
    <label class="fr-l">${t('Número de proyecto')}<input type="text" class="gd-app" value="${(c.appId || '').replace(/"/g, '&quot;')}" placeholder="123456789012"></label>
    <div class="fr-actions"><button class="fr-do gd-ok">${t('Guardar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.gd-ok').addEventListener('click', () => {
    const own = { clientId: back.querySelector('.gd-cid').value.trim(), apiKey: back.querySelector('.gd-key').value.trim(), appId: back.querySelector('.gd-app').value.trim() };
    setOwnProject(own);
    close();
  });
}
