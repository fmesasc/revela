// OneDrive (io/cloud/onedrive.js): open from any folder, or save into one — the presentation itself, which
// then saves itself while one edits, or a PDF or PowerPoint copy that OneDrive shows with all its pages —,
// and the chip by the title that says how it is going there.

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { isBlankDeck } from '../../core/model.js';
import * as od from '../../io/cloud/onedrive.js';
import { connect, signOutCloud } from '../../io/cloud/othercloud.js';
import { openCloud } from './othercloud.js';
import { confirmDialog, alertDialog } from './dialog.js';
import { toast } from '../shell/toast.js';
import { t, currentLang } from '../../i18n/index.js';

const message = e => ({ NO_TOKEN: t('Vuelve a conectar con OneDrive.'), POPUP_BLOCKED: t('El navegador ha bloqueado la ventana para iniciar sesión: permítela e inténtalo otra vez.'),
  CANCELLED: t('No se ha iniciado sesión.'), NOT_REVELA: t('El archivo no es un proyecto de Revela.') }[e.message] || `${t('Algo ha fallado:')} ${e.message}`);
const ICON = { folder: 'folder', revela: 'slideshow', pptx: 'co_present', odp: 'description' };

// mode: 'open' | 'save' (which part leads).
export function openOneDrive({ mode = 'open' } = {}) {
  if (!od.onedriveReady()) { openCloud('onedrive'); return; }          // (no app identifier: how to set one)
  document.getElementById('od-modal')?.remove();
  const back = document.createElement('div'); back.id = 'od-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal od" style="text-align:start;width:min(600px,94vw);max-width:none"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button>
    <h3>${t(mode === 'save' ? 'Guardar en OneDrive' : 'Abrir de OneDrive')}</h3><div class="od-body"></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), body = q('.od-body'), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  let folder = null, trail = [{ id: null, name: 'OneDrive' }];

  async function render() {
    if (!od.onedriveSignedIn()) {
      body.innerHTML = `<p class="host-help">${t('Conecta tu OneDrive (cuenta personal, de trabajo o de un centro) para abrir y guardar ahí tus presentaciones.')}</p>
        <div class="fr-actions" style="justify-content:flex-start"><button class="fr-do od-connect"><i class="ms">cloud</i> ${t('Conectar con OneDrive')}</button></div><p class="od-note host-help"></p>`;
      q('.od-connect').addEventListener('click', () => connect('onedrive').then(render).catch(e => { q('.od-note').textContent = message(e); }));
      return;
    }
    body.innerHTML = `<nav class="od-trail" aria-label="${t('Carpeta')}"></nav><div class="od-list" role="list"><p class="host-help">${t('Cargando…')}</p></div>
      ${mode === 'save' ? `<fieldset class="od-save"><legend>${t('Guardar en esta carpeta')}</legend>
        <label class="fr-l">${t('Nombre')}<input type="text" class="od-name" value="${esc(od.suggestedName())}"></label>
        <div class="pdf-modes">
          <label class="pdf-mode"><input type="radio" name="od-fmt" value="revela" checked><i class="ms">edit_document</i><span><b>${t('Revela (editable, todo)')}</b><small>${t('Se sigue guardando sola mientras trabajas.')}</small></span></label>
          <label class="pdf-mode"><input type="radio" name="od-fmt" value="pdf"><i class="ms">picture_as_pdf</i><span><b>${t('PDF — OneDrive lo muestra con todas sus diapositivas')}</b><small>${t('Una copia para verla o compartirla, con el texto buscable.')}</small></span></label>
          <label class="pdf-mode"><input type="radio" name="od-fmt" value="pptx"><i class="ms">co_present</i><span><b>${t('PowerPoint (.pptx)')}</b><small>${t('Una copia para abrirla con PowerPoint.')}</small></span></label>
        </div>
        <div class="fr-actions"><button class="fr-do od-go"><i class="ms">cloud_upload</i> ${t('Guardar')}</button></div></fieldset>` : ''}
      <p class="od-note host-help"></p>
      <p class="host-help" style="font-size:12px">${t('Conectado a OneDrive en esta pestaña.')} <a href="#" class="od-out">${t('Desconectar')}</a></p>`;
    q('.od-out').addEventListener('click', e => { e.preventDefault(); signOutCloud('onedrive'); render(); });
    q('.od-go')?.addEventListener('click', save);
    await list();
  }
  async function list() {
    const box = q('.od-list'), trailEl = q('.od-trail');
    trailEl.innerHTML = trail.map((f, i) => (i < trail.length - 1 ? `<button type="button" class="od-crumb" data-i="${i}">${esc(f.name)}</button><span aria-hidden="true">›</span>` : `<b>${esc(f.name)}</b>`)).join('');
    trailEl.querySelectorAll('.od-crumb').forEach(b => b.addEventListener('click', () => { trail = trail.slice(0, +b.dataset.i + 1); folder = trail.at(-1).id; list(); }));
    try {
      const r = await od.browse(folder);
      const items = mode === 'save' ? r.items.filter(i => i.kind === 'folder' || i.kind === 'revela') : r.items;
      box.innerHTML = items.length ? items.map((f, i) => `<button type="button" class="od-item" role="listitem" data-i="${i}"><i class="ms">${ICON[f.kind]}</i>`
        + `<span><b>${esc(f.kind === 'revela' ? f.name.replace(/\.revela\.json$/i, '') : f.name)}</b>${f.kind === 'folder' ? '' : `<small>${f.kind === 'revela' ? 'Revela' : f.kind === 'pptx' ? 'PowerPoint' : 'LibreOffice'}${f.modified ? ' · ' + new Date(f.modified).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' }) : ''}</small>`}</span></button>`).join('')
        : `<p class="host-help">${t(mode === 'save' ? 'Carpeta vacía: se guardará aquí.' : 'No hay presentaciones en esta carpeta.')}</p>`;
      box.querySelectorAll('.od-item').forEach(b => b.addEventListener('click', () => pick(items[+b.dataset.i])));
    } catch (e) { box.innerHTML = ''; note(message(e)); if (e.message === 'NO_TOKEN') render(); }
  }
  const note = txt => { const n = q('.od-note'); if (n) n.textContent = txt; };
  async function pick(f) {
    if (f.kind === 'folder') { trail.push({ id: f.id, name: f.name }); folder = f.id; return list(); }
    if (mode === 'save') { q('.od-name').value = f.name.replace(/\.revela\.json$/i, ''); return; }   // (a name to write over)
    if (!isBlankDeck(state.deck) && !(await confirmDialog(t('¿Abrir otra presentación? Se perderá la actual si no la has guardado.'), { ok: t('Descartar la actual'), danger: true }))) return;
    note(t('Abriendo…'));
    try {
      const r = await od.openOneDrive(f);
      if (r.file) { const { openPresentation } = await import('../shell/openfile.js'); await openPresentation(r.file); }
      close();
    } catch (e) { note(message(e)); }
  }
  async function save() {
    const fmt = back.querySelector('[name="od-fmt"]:checked').value, go = q('.od-go');
    go.disabled = true; note(t(fmt === 'revela' ? 'Guardando…' : 'Creando la copia…'));
    try {
      const f = await od.saveAsOneDrive({ folder, name: q('.od-name').value, format: fmt });
      close(); toast(t(fmt === 'revela' ? 'Guardado en OneDrive: se seguirá guardando solo mientras trabajas.' : 'Copia guardada en OneDrive.') + ' ' + (f.name || ''));
    } catch (e) { go.disabled = false; note(message(e)); }
  }
  render();
}

// ---- The chip by the title ----------------------------------------------------------------
const STATUS = {
  pending: ['cloud_queue', 'OneDrive · Sin guardar', 'Cambios sin guardar en OneDrive'], saving: ['cloud_sync', 'OneDrive · Guardando…', 'Guardando en OneDrive…'],
  saved: ['cloud_done', 'OneDrive · Guardado', 'Guardado en OneDrive'],
  offline: ['cloud_off', 'OneDrive · Volver a conectar', 'Hay que volver a conectar con OneDrive: haz clic. Mientras, los cambios se guardan en este navegador.'],
  error: ['error', 'OneDrive · No se pudo guardar', 'No se pudo guardar en OneDrive: haz clic para reintentar'],
  conflict: ['sync_problem', 'OneDrive · Cambió en otro sitio', 'Ha cambiado en OneDrive desde otro dispositivo: haz clic para elegir'],
};
function paint() {
  const el = document.getElementById('onedrive-status'); if (!el) return;
  const s = od.linkedOneDrive() ? od.oneDriveStatus() : 'idle', info = STATUS[s];
  el.hidden = !info;
  if (info) { el.innerHTML = `<i class="ms">${info[0]}</i><span>${esc(t(info[1]))}</span>`; el.title = t(info[2]) + (s === 'saved' ? ' ▸ ' + (od.linkedOneDrive()?.name || '') : ''); el.dataset.state = s; }
  window.dispatchEvent(new Event('revela:cloud-status'));
}
export function initOneDrive() {
  const el = document.getElementById('onedrive-status');
  el?.addEventListener('click', async () => {
    const s = od.oneDriveStatus();
    if (s === 'offline') { try { await connect('onedrive'); await od.saveOneDriveNow(); } catch (e) { alertDialog(message(e)); } return; }
    if (s === 'conflict') {
      const keep = await confirmDialog(t('Esta presentación ha cambiado en OneDrive desde otro dispositivo. ¿Guardar la tuya encima? (Si no, se abre la de OneDrive.)'), { ok: t('Guardar la mía'), cancel: t('Abrir la de OneDrive') });
      try { if (keep) await od.saveOneDriveNow({ force: true }); else await od.loadTheirsOneDrive(); } catch (e) { alertDialog(message(e)); }
      return;
    }
    if (s === 'error' || s === 'pending') { od.saveOneDriveNow(); return; }
    openOneDrive({ mode: 'open' });
  });
  od.onOneDriveStatus(paint);
  od.startOneDriveAutosave();
  paint();
}
