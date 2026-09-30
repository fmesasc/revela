// Archivo ▸ Otras nubes: Dropbox or OneDrive. Without the app's identifier it
// explains how to get one (and takes it); signed in, it lists the presentations
// saved there, opens one, or saves this one.

import { esc } from '../../core/text.js';
import { currentLang, t } from '../../i18n/index.js';
import * as oc from '../../io/cloud/othercloud.js';
import { redirectURI } from '../../io/cloud/oauth.js';
import { confirmDialog } from './dialog.js';
import { isBlankDeck } from '../../core/model.js';
import { state } from '../../core/store.js';

const message = e => ({ NO_TOKEN: t('Vuelve a conectar.'), POPUP_BLOCKED: t('El navegador ha bloqueado la ventana para iniciar sesión: permítela e inténtalo otra vez.'),
  CANCELLED: t('No se ha iniciado sesión.'), NOT_REVELA: t('El archivo no es un proyecto de Revela.') }[e.message] || `${t('Algo ha fallado:')} ${e.message}`);

export function openCloud(id) {
  const p = oc.PROVIDERS[id]; if (!p) return;
  document.getElementById('oc-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'oc-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:none"><button class="modal-close">✕</button>
    <h3>${esc(p.name)}</h3><div class="oc-body"></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.oc-body'), close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const note = (txt, bad) => { const n = body.querySelector('.oc-note'); if (n) { n.textContent = txt; n.classList.toggle('bad', !!bad); } };

  // No identifier yet: how to register the app, and where to write its identifier.
  function setup() {
    const steps = id === 'dropbox'
      ? [t('Crea una app en la consola de Dropbox: «Scoped access», «App folder».'), t('En «Permissions» marca files.content.read y files.content.write.'),
        t('En «OAuth 2 ▸ Redirect URIs» añade esta dirección:')]
      : [t('Registra una aplicación en Microsoft Entra: cuentas de cualquier organización y cuentas personales de Microsoft.'),
        t('En «Autenticación» añade la plataforma «Aplicación de página única (SPA)» con esta dirección de redirección:'), ''];
    body.innerHTML = `<p class="host-help">${t('Para usar {s}, Revela necesita el identificador público de una app registrada en {s} (no hace falta ningún secreto). Se guarda solo en este navegador.').replaceAll('{s}', esc(p.name))}</p>
      <ol class="oc-steps">${steps.filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <input type="text" class="oc-redirect" readonly value="${esc(redirectURI())}" aria-label="${t('Dirección de redirección')}">
      <p><a href="${p.console}" target="_blank" rel="noopener">${t('Abrir la consola de {s}').replace('{s}', esc(p.name))} ↗</a></p>
      <label class="fr-l">${t(id === 'dropbox' ? 'Clave de la app (App key)' : 'Id. de aplicación (cliente)')}<input type="text" class="oc-key" value="${esc(oc.ownKey(id))}" spellcheck="false"></label>
      ${id === 'dropbox' ? `<label class="fr-chk"><input type="checkbox" class="oc-full"${oc.dropboxFull() ? ' checked' : ''}> ${t('La app tiene acceso a todo Dropbox (necesario para «Abrir con Revela»; guarda en la carpeta Revela)')}</label>` : ''}
      <div class="fr-actions"><button class="fr-do oc-save-key">${t('Guardar')}</button></div>`;
    body.querySelector('.oc-redirect').addEventListener('focus', e => e.target.select());
    body.querySelector('.oc-save-key').addEventListener('click', () => {
      oc.setOwnKey(id, body.querySelector('.oc-key').value);
      if (id === 'dropbox') oc.setDropboxFull(body.querySelector('.oc-full').checked);
      render();
    });
  }
  // Signed in or not: connect, then the list and "Save here".
  async function files() {
    body.innerHTML = `<div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap">
        ${oc.signedIn(id) ? '' : `<button class="fr-do oc-connect">${t('Conectar con {s}').replace('{s}', esc(p.name))}</button>`}
        <button class="fr-do oc-save"${oc.signedIn(id) ? '' : ' disabled'}><i class="ms">cloud_upload</i> ${t('Guardar aquí esta presentación')}</button></div>
      <p class="oc-note host-help"></p><div class="oc-list"></div>
      <p class="host-help" style="font-size:12px">${t(id === 'dropbox' ? (oc.dropboxFull() ? 'Se guarda en la carpeta Revela de tu Dropbox.' : 'Se guarda en la carpeta Aplicaciones/Revela de tu Dropbox.') : 'Se guarda en la carpeta Revela de tu OneDrive.')}
        <a href="#" class="oc-keys">${t('Cambiar la app')}</a></p>`;
    body.querySelector('.oc-keys').addEventListener('click', e => { e.preventDefault(); setup(); });
    body.querySelector('.oc-connect')?.addEventListener('click', () => oc.connect(id).then(files).catch(e => note(message(e), true)));
    body.querySelector('.oc-save').addEventListener('click', async () => {
      note(t('Guardando…'));
      try { const f = await oc.saveToCloud(id); note(t('Guardado en {s}:').replace('{s}', p.name) + ' ' + f.name); list(); } catch (e) { note(message(e), true); }
    });
    if (oc.signedIn(id)) list();
  }
  async function list() {
    const box = body.querySelector('.oc-list'); if (!box) return;
    box.textContent = t('Cargando…');
    try {
      const items = await oc.listCloud(id);
      box.innerHTML = items.length ? `<ul class="oc-files">${items.map((f, i) => `<li><span><b>${esc(f.name.replace(/\.revela\.json$/i, ''))}</b>`
        + `${f.modified ? `<small>${new Date(f.modified).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' })}</small>` : ''}</span>`
        + `<button class="mini2" data-i="${i}">${t('Abrir')}</button></li>`).join('')}</ul>` : `<p class="host-help">${t('Todavía no hay presentaciones guardadas aquí.')}</p>`;
      box.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', async () => {
        if (!isBlankDeck(state.deck) && !(await confirmDialog(t('Se cerrará la presentación actual (sigue guardada en este navegador si la guardaste). ¿Abrir la otra?')))) return;
        try { await oc.openFromCloud(id, items[+b.dataset.i].id); close(); } catch (e) { note(message(e), true); }
      }));
    } catch (e) { box.textContent = ''; note(message(e), true); }
  }
  const render = () => (oc.cloudReady(id) ? files() : setup());
  render();
}
