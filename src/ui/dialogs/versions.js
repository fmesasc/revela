// Version history dialog: list, restore, download, delete, save a named version.

import { listVersions, restoreVersion, deleteVersion, saveVersion, versionDeck } from '../../features/collab/versions.js';
import { confirmDialog, promptDialog, alertDialog } from './dialog.js';
import { t, currentLang } from '../../i18n/index.js';

export async function openVersions() {
  document.getElementById('versions-modal')?.remove();
  const back = document.createElement('div'); back.id = 'versions-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(600px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Historial de versiones')}</h3>
    <p class="host-help">${t('Se guardan en este navegador: automáticamente cada pocos minutos mientras editas, al abrir otra presentación (la que tenías, si había cambios) y cuando guardas una versión con nombre.')}</p>
    <div class="fr-actions" style="justify-content:flex-start"><button class="fr-do vs-save">${t('Guardar versión…')}</button></div>
    <ol class="vs-list"></ol></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const list = back.querySelector('.vs-list');
  const fmt = ts => new Date(ts).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' });
  const fill = async () => {
    let vs = [];
    try { vs = await listVersions(); } catch (e) { list.innerHTML = `<li class="host-help">${t('El navegador no permite guardar versiones.')}</li>`; return; }
    list.innerHTML = vs.length ? '' : `<li class="host-help">${t('Aún no hay versiones.')}</li>`;
    for (const v of vs) {
      const li = document.createElement('li'); li.className = 'vs-item' + (v.auto ? '' : ' named'); li.dataset.id = v.id;
      li.innerHTML = `<div class="vs-meta"><b></b><span></span></div>`
        + `<button type="button" data-a="restore">${t('Restaurar')}</button><button type="button" data-a="dl" title="${t('Descargar')}"><i class="ms">download</i></button>`
        + `<button type="button" data-a="del" title="${t('Eliminar')}">✕</button>`;
      li.querySelector('b').textContent = v.name || (v.kind === 'before' ? t('Antes de abrir otra presentación') : v.auto ? t('Automática') : t('Versión'));
      li.querySelector('span').textContent = `${fmt(v.time)} · ${v.slides} ${t('diapositivas')}${v.title ? ' · ' + v.title : ''}`;
      li.querySelector('[data-a="restore"]').addEventListener('click', async () => {
        if (!(await confirmDialog(t('¿Restaurar esta versión? La actual se guardará antes en el historial.')))) return;
        await restoreVersion(v.id); close();
      });
      li.querySelector('[data-a="dl"]').addEventListener('click', async () => {
        const d = await versionDeck(v.id); if (!d) return;
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }));
        a.download = `${(d.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-')}-${new Date(v.time).toISOString().slice(0, 16).replace(/[:T]/g, '')}.revela.json`;
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
      li.querySelector('[data-a="del"]').addEventListener('click', async () => { await deleteVersion(v.id); fill(); });
      list.appendChild(li);
    }
  };
  back.querySelector('.vs-save').addEventListener('click', async () => {
    const name = await promptDialog(t('Nombre de la versión'), ''); if (name == null) return;
    try { await saveVersion(name.trim() || t('Versión'), false); fill(); } catch (e) { alertDialog(t('No se pudo guardar: ') + e.message); }
  });
  fill();
}
