// Where the open presentation is kept, said plainly: one place at a time — Google Drive (the default),
// Revela's cloud (to share it with people), or only this browser. From «In this browser», the choice
// of where to keep it.
import { t } from '../../i18n/index.js';
import { popupMenu } from './menu.js';
import { toast } from './toast.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { downloadProject } from './downloadproject.js';
import * as gd from '../../io/cloud/gdrive.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { onedriveReady } from '../../io/cloud/onedrive.js';

// One place at a time (never two copies saving each their own way): kept in Revela's cloud from now on,
// it stops saving to its Drive file; kept in Drive, it leaves Revela's cloud. The other copy stays as it was.
export function nowInCloud() {
  if (!gd.linkedFile()) return;
  gd.unlinkFile(); toast(t('Ahora se guarda en la nube de Revela. Su archivo de Google Drive se queda como estaba.'));
}
export async function nowInDrive() {
  if (!cd.cloudDoc()) return;
  await cd.flushCloud(); cd.closeDoc(); toast(t('Ahora se guarda en Google Drive. La copia de la nube de Revela se queda como estaba.'));
}

export function openSaveWhere(anchor) {
  const cloud = hasAccounts();
  const item = (k, icon, name, help) => `<button type="button" data-w="${k}"><i class="ms">${icon}</i><span><b>${name}</b><small>${help}</small></span></button>`;
  popupMenu(anchor, { id: 'save-where', className: 'save-where', attr: 'w', align: 'right',
    html: `<div class="sw-head">${t('Ahora solo está en este navegador. ¿Dónde la guardas?')}</div>`
      + item('drive', 'add_to_drive', t('Google Drive (tu cuenta de Google)'), t('Recomendado: se guarda sola, sin límite de tamaño, y la abres desde cualquier dispositivo.'))
      + (cloud ? item('cloud', 'cloud', t('Nube de Revela'), t('En tu cuenta de Revela (hasta {max} MB): desde ahí la compartes con personas concretas y ves sus estadísticas.').replace('{max}', cd.CLOUD_MAX_MB)) : '')
      + (onedriveReady() ? item('onedrive', 'cloud_circle', 'OneDrive', t('Se guarda sola en tu OneDrive personal, de trabajo o de tu centro.')) : '')
      + item('file', 'download', t('Descargar un archivo'), t('Una copia (.revela.json) que guardas tú.')),
    onPick: async k => {
      if (k === 'drive') (await import('../dialogs/gdrive.js')).driveSaveAsUI();
      else if (k === 'cloud') (await import('../dialogs/cloud.js')).saveInCloud();
      else if (k === 'onedrive') (await import('../dialogs/onedrive.js')).openOneDrive({ mode: 'save' });
      else downloadProject();
    } });
}
