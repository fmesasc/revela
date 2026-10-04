// "Open with ▸ Revela" from Google Drive and Dropbox (and Drive's "New ▸
// Revela"). Drive opens Revela with ?state={"action":"open","ids":[…]} (or
// "create" and the folder), Dropbox with ?dropbox&file_id=…: Revela asks whether
// to view the presentation (full screen, like a preview) or edit it — the click
// is also what lets the sign-in window open — and loads it from there.

import { replaceDeck } from '../../core/store.js';
import { emptyDeck } from '../../core/model.js';
import * as gdrive from '../../io/cloud/gdrive.js';
import * as oc from '../../io/cloud/othercloud.js';
import { present } from './present.js';
import { openPresentation } from './openfile.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from '../dialogs/dialog.js';

// What the address asks for, or null: { service, action, id, folder, user }.
export function openRequest(search = location.search) {
  const q = new URLSearchParams(search);
  if (q.has('state')) {
    let s; try { s = JSON.parse(q.get('state')); } catch { return null; }
    if (!s || typeof s !== 'object') return null;
    if (s.action === 'create') return { service: 'drive', action: 'create', folder: typeof s.folderId === 'string' ? s.folderId : null, user: s.userId || '' };
    const id = Array.isArray(s.ids) && typeof s.ids[0] === 'string' ? s.ids[0] : null;
    return s.action === 'open' && id ? { service: 'drive', action: 'open', id, user: s.userId || '' } : null;
  }
  if (q.has('dropbox') && q.get('file_id')) return { service: 'dropbox', action: 'open', id: q.get('file_id') };
  return null;
}
// Ask how to open it; resolves to 'view' | 'edit' | null.
function askHow(from, copy = false) {
  return new Promise(resolve => {
    const back = document.createElement('div'); back.id = 'openwith-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" style="text-align:start;min-width:min(380px,94vw)"><button class="modal-close">✕</button>
      <h3>${t('Abrir desde {s}').replace('{s}', from)}</h3><p class="host-help">${t('¿Quieres ver la presentación o editarla?')}</p>
      <div class="pdf-modes"><button type="button" class="pdf-mode" data-how="view"><i class="ms">slideshow</i><span><b>${t('Ver la presentación')}</b><small>${t('A pantalla completa, como una vista previa. Esc para salir.')}</small></span></button>
      <button type="button" class="pdf-mode" data-how="edit"><i class="ms">edit</i><span><b>${t('Editar')}</b><small>${copy ? t('Se abre una copia: para guardar los cambios, guárdala en Drive.') : from === 'Google Drive' ? t('Los cambios se guardan en el mismo archivo de Drive.') : t('Para guardar los cambios, vuelve a guardarla en Dropbox.')}</small></span></button></div></div>`;
    document.body.appendChild(back);
    const done = v => { back.remove(); resolve(v); };
    back.querySelector('.modal-close').addEventListener('click', () => done(null));
    back.querySelectorAll('[data-how]').forEach(b => b.addEventListener('click', () => done(b.dataset.how)));
    back.querySelector('[data-how="view"]').focus();
  });
}
export async function handleOpenWith(req = openRequest()) {
  if (!req) return false;
  history.replaceState(null, '', location.pathname);                  // (not again on reload)
  try {
    if (req.service === 'drive' && req.action === 'create') {
      replaceDeck(emptyDeck()); gdrive.setNewFileFolder(req.folder);
      await gdrive.savePresentation({ asNew: true });                   // (so it is in that folder from now on)
      return true;
    }
    // (A .pptx / .odp from Drive is imported: a copy, which the question says.)
    const file = req.service === 'drive' ? await gdrive.fetchImportable(req.id) : null;
    const how = await askHow(req.service === 'drive' ? 'Google Drive' : 'Dropbox', !!file); if (!how) return false;
    if (req.service === 'drive') { if (file) await openPresentation(file); else await gdrive.openPresentation(req.id); }
    else { await oc.connect('dropbox'); await oc.openFromCloud('dropbox', req.id); }
    if (how === 'view') present({ fullscreen: true });
    return true;
  } catch (e) {
    alertDialog(t('No se pudo abrir la presentación:') + ' ' + (e.message === 'NO_TOKEN' ? t('Vuelve a iniciar sesión con Google.') : e.message === 'NOT_REVELA' ? t('El archivo no es un proyecto de Revela.') : e.message));
    return false;
  }
}
