import { ownProject, setOwnProject } from '../../io/cloud/gdrive.js';
import * as gd from '../../io/cloud/gdrive.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';
import { nowInDrive } from '../shell/where.js';

// Optional: use one's own Google Cloud project instead of Revela's.
export function openGdriveSetup() {
  if (document.getElementById('gd-modal')) return;
  const c = ownProject();
  const back = document.createElement('div');
  back.id = 'gd-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;width:min(520px,94vw);max-width:none">
    <button class="modal-close">✕</button><h3>${t('Mi propio proyecto de Google Cloud (avanzado)')}</h3>
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

// ---- Save to Drive: where, name and format ------------------------------------------
// «Guardar en Drive»: the same file once linked; else (and «Guardar en Drive
// como…») ask for the folder (Google Picker), the name and the format.
const friendly = e => alertDialog(e.message === 'NO_TOKEN' ? t('Vuelve a iniciar sesión con Google.') : (e.message || String(e)));
export function driveSaveUI() {
  if (!gd.gdriveReady()) return openGdriveSetup();
  if (!gd.linkedFile()) return driveSaveAsUI();
  return gd.savePresentation().then(ok => {
    if (ok === 'conflict') alertDialog(t('La presentación ha cambiado en Drive desde otro dispositivo. Elige qué versión quedarse en el aviso de arriba.'));
    else if (ok) savedDialog(gd.linkedFile());
  }).catch(friendly);
}

export function driveSaveAsUI() {
  if (!gd.gdriveReady()) return openGdriveSetup();
  if (document.getElementById('gs-modal')) return;
  let folder = gd.lastFolder();
  const back = document.createElement('div'); back.id = 'gs-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(500px,94vw);max-width:none">
    <button class="modal-close">✕</button><h3>${t('Guardar en Google Drive')}</h3>
    <label class="fr-l">${t('Nombre')}<input type="text" class="gs-name"></label>
    <div class="gs-where"><i class="ms">folder</i><span>${t('Carpeta')}: <b class="gs-folder"></b></span><button type="button" class="mini2 gs-pick">${t('Elegir carpeta…')}</button></div>
    <div class="pdf-modes">
      <label class="pdf-mode"><input type="radio" name="gs-fmt" value="revela" checked><i class="ms">edit_document</i><span><b>${t('Revela (editable, todo)')}</b><small>${t('Se sigue guardando sola mientras trabajas. En Drive se ve su primera diapositiva y se encuentra por sus textos.')}</small></span></label>
      <label class="pdf-mode"><input type="radio" name="gs-fmt" value="pptx"><i class="ms">slideshow</i><span><b>${t('PowerPoint (.pptx) — se ve en Drive con todas sus diapositivas')}</b><small>${t('Una copia para verla o compartirla: los cambios que hagas después no se guardan en ella.')}</small></span></label>
    </div>
    <div class="fr-actions"><button class="fr-do gs-ok">${t('Guardar')}</button></div></div>`;
  document.body.appendChild(back);
  const $ = s => back.querySelector(s), close = () => back.remove();
  $('.gs-name').value = gd.safeName();
  const paint = () => { $('.gs-folder').textContent = folder?.name || t('Mi unidad'); };   // (text: names can't become HTML)
  paint();
  $('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  $('.gs-pick').addEventListener('click', async () => {
    back.style.display = 'none';                              // (the Picker opens above the page)
    try { const f = await gd.pickFolder(); if (f) { folder = f; paint(); } } catch (e) { friendly(e); }
    back.style.display = '';
  });
  $('.gs-ok').addEventListener('click', async () => {
    const name = $('.gs-name').value.trim(), fmt = back.querySelector('[name="gs-fmt"]:checked').value;
    $('.gs-ok').disabled = true; $('.gs-ok').textContent = t('Guardando…');
    try {
      if (fmt === 'pptx') { const f = await gd.savePptxCopy({ name, folder }); close(); savedDialog(f); }
      else { await nowInDrive(); const ok = await gd.savePresentation({ asNew: true, name, folder }); close(); if (ok) savedDialog(gd.linkedFile()); }
    } catch (e) { close(); friendly(e); }
  });
  $('.gs-name').focus(); $('.gs-name').select();
}

// Where it was saved, with a link to open it in Drive.
export function savedDialog(f) {
  if (!f) return;
  document.getElementById('gs-done')?.remove();
  const back = document.createElement('div'); back.id = 'gs-done'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:min(360px,94vw)"><button class="modal-close">✕</button>
    <h3>${t('Guardado en Google Drive.')}</h3><p class="gs-path"></p>
    <div class="fr-actions" style="justify-content:flex-end;gap:8px"><a class="mini2 gs-open" target="_blank" rel="noopener">${t('Abrir en Drive')}</a><button class="fr-do gs-close">${t('Aceptar')}</button></div></div>`;
  back.querySelector('.gs-path').textContent = t('Guardado en Drive') + ' ▸ ' + gd.whereLabel(f);
  back.querySelector('.gs-open').href = gd.driveLink(f);
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelectorAll('.modal-close,.gs-close').forEach(b => b.addEventListener('click', close));
  back.addEventListener('click', e => { if (e.target === back) close(); });
}
