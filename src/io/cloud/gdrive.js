// Google Drive integration — save/open the project (.revela.json) directly to
// the user's Drive, entirely client‑side (no backend). Uses the restrictive
// `drive.file` scope: the app only ever sees files it created or the ones the
// user explicitly picks. Credentials (Client ID + API key) are public, stored
// only in this browser, and restricted by origin in the Google Cloud project.

import { state, replaceDeck } from '../../core/store.js';
import { alertUser } from '../../core/notify.js';
import { t } from '../../i18n/index.js';
import { buildHTML } from '../formats/html.js';
import { loadScript } from '../../core/vendor.js';

const GIS = 'https://accounts.google.com/gsi/client';
const GAPI = 'https://apis.google.com/js/api.js';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const LS = 'revela.gdrive';

export function gdriveConfig() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }
function setGdriveConfig(c) { try { localStorage.setItem(LS, JSON.stringify(c)); } catch {} }
export const gdriveReady = () => !!(gdriveConfig().clientId && gdriveConfig().apiKey);


let tokenClient, accessToken = null, tokenExp = 0;
async function ensureToken(interactive) {
  const { clientId } = gdriveConfig();
  if (!clientId) throw new Error(t('Configura primero Google Drive.'));
  await loadScript(GIS);
  if (!tokenClient) tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback: () => {} });
  if (accessToken && Date.now() < tokenExp - 60000) return accessToken;
  return new Promise((resolve, reject) => {
    tokenClient.callback = resp => {
      if (resp.error) return reject(new Error(resp.error));
      accessToken = resp.access_token; tokenExp = Date.now() + (resp.expires_in || 3600) * 1000; resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}

async function pickFile() {
  const { apiKey } = gdriveConfig();
  const token = await ensureToken(true);
  await loadScript(GAPI);
  await new Promise(res => window.gapi.load('picker', res));
  const g = window.google;
  return new Promise(resolve => {
    const view = new g.picker.DocsView(g.picker.ViewId.DOCS)
      .setMimeTypes('application/json,text/html,application/octet-stream');
    const picker = new g.picker.PickerBuilder()
      .setOAuthToken(token).setDeveloperKey(apiKey).addView(view)
      .setCallback(data => {
        if (data.action === g.picker.Action.PICKED) resolve(data.docs[0]);
        else if (data.action === g.picker.Action.CANCEL) resolve(null);
      }).build();
    picker.setVisible(true);
  });
}

async function uploadNew(name, mimeType, body, token) {
  const boundary = 'revela' + Math.random().toString(36).slice(2);
  const meta = { name, mimeType };
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`
    + `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${body}\r\n--${boundary}--`;
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary }, body: multipart });
  if (!r.ok) throw new Error(t('No se pudo guardar.'));
  return (await r.json()).id;
}
const safeName = () => (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'presentacion';

let currentFileId = null;

// Open a project from Drive into the editor.
export async function driveOpen() {
  if (!gdriveReady()) return openGdriveSetup();
  const doc = await pickFile(); if (!doc) return;
  const token = await ensureToken();
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error(t('No se pudo abrir el archivo.'));
  const text = await r.text();
  let deck; try { deck = JSON.parse(text); } catch { throw new Error(t('El archivo no es un proyecto de Revela.')); }
  replaceDeck(deck); currentFileId = doc.id;
}

// Save the current project to Drive (updates the same file if opened from Drive).
export async function driveSave() {
  if (!gdriveReady()) return openGdriveSetup();
  const token = await ensureToken(true);
  const body = JSON.stringify(state.deck, null, 2);
  if (currentFileId) {
    const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${currentFileId}?uploadType=media`,
      { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body });
    if (!r.ok) throw new Error(t('No se pudo guardar.'));
  } else {
    currentFileId = await uploadNew(safeName() + '.revela.json', 'application/json', body, token);
  }
  return true;
}

// Export the reveal.js HTML presentation to Drive (a new file each time).
export async function driveSaveHtml() {
  if (!gdriveReady()) return openGdriveSetup();
  const token = await ensureToken(true);
  await uploadNew(safeName() + '.html', 'text/html', buildHTML(), token);
  return true;
}

// One‑time setup: the user pastes their own Client ID and API key.
export function openGdriveSetup() {
  if (document.getElementById('gd-modal')) return;
  const c = gdriveConfig();
  const back = document.createElement('div');
  back.id = 'gd-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:360px;max-width:92vw">
    <button class="modal-close">✕</button><h3>${t('Conectar con Google Drive')}</h3>
    <p class="host-help">${t('Introduce el ID de cliente y la clave de API de tu proyecto de Google Cloud (permiso drive.file). Se guardan solo en este navegador.')}</p>
    <label class="fr-l">Client ID<input type="text" class="gd-cid" value="${(c.clientId || '').replace(/"/g, '&quot;')}" placeholder="xxxx.apps.googleusercontent.com"></label>
    <label class="fr-l">API key<input type="text" class="gd-key" value="${(c.apiKey || '').replace(/"/g, '&quot;')}" placeholder="AIza..."></label>
    <div class="fr-actions"><button class="fr-do gd-ok">${t('Guardar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.gd-ok').addEventListener('click', () => {
    setGdriveConfig({ clientId: back.querySelector('.gd-cid').value.trim(), apiKey: back.querySelector('.gd-key').value.trim() });
    close();
  });
}

// Wrappers that surface errors as friendly dialogs.
export const openWithUI = () => driveOpen().catch(e => alertUser(e.message));
export const saveWithUI = () => driveSave().then(ok => { if (ok) alertUser(t('Guardado en Google Drive.')); }).catch(e => alertUser(e.message));
export const saveHtmlWithUI = () => driveSaveHtml().then(ok => { if (ok) alertUser(t('Guardado en Google Drive.')); }).catch(e => alertUser(e.message));
