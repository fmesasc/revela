// Google Drive and "Sign in with Google" — entirely client-side (no backend).
//
// - Sign in: name, email and picture of the account (to show who is signed in).
// - Drive with the restrictive `drive.file` scope: the app only ever sees
//   files it created or the ones the user explicitly picks.
// - "My presentations": Revela projects in Drive, most recent first, with a
//   thumbnail of their first slide.
// - Autosave: a presentation opened from (or saved to) Drive is saved there a
//   few seconds after each change; if it changed in Drive meanwhile (another
//   device), it asks before overwriting.
// The project's public identifiers are in core/config.js; a browser can use
// its own Google Cloud project instead (setup dialog below).

import { state, replaceDeck, subscribe, docEpoch, docVersion } from '../../core/store.js';
import { alertUser } from '../../core/notify.js';
import { GOOGLE } from '../../core/config.js';
import { t } from '../../i18n/index.js';
import { buildHTML } from '../formats/html.js';
import { loadScript } from '../../core/vendor.js';

const GIS = 'https://accounts.google.com/gsi/client';
const GAPI = 'https://apis.google.com/js/api.js';
const API = 'https://www.googleapis.com';
const SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.file';
const LS = 'revela.gdrive', LS_ACCOUNT = 'revela.gaccount', LS_FILE = 'revela.gdrive.file';
const PROJECT_MIME = 'application/json';

const readLS = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const writeLS = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Own project from the setup dialog, if any; else Revela's.
export function gdriveConfig() { const own = readLS(LS); return own?.clientId && own?.apiKey ? own : { ...GOOGLE }; }
export const gdriveReady = () => !!(gdriveConfig().clientId && gdriveConfig().apiKey);

// ---- Account and access token --------------------------------------------------
export const account = () => readLS(LS_ACCOUNT);
const listeners = new Set();
export const onDrive = fn => { listeners.add(fn); return () => listeners.delete(fn); };
let status = 'idle';                                        // idle | saving | saved | offline | conflict | error
export const driveStatus = () => status;
const setStatus = s => { status = s; listeners.forEach(f => { try { f(s); } catch {} }); };

let tokenClient = null, accessToken = null, tokenExp = 0;
const hasToken = () => !!accessToken && Date.now() < tokenExp - 60000;
async function gis() {
  if (!window.google?.accounts?.oauth2) await loadScript(GIS);
  return window.google.accounts.oauth2;
}
// A token needs the Google window when there is none yet; call it from a click.
export async function ensureToken(interactive = true) {
  if (hasToken()) return accessToken;
  if (!interactive) throw new Error('NO_TOKEN');
  const { clientId } = gdriveConfig();
  const oauth = await gis();
  if (!tokenClient || tokenClient._cid !== clientId) {
    tokenClient = oauth.initTokenClient({ client_id: clientId, scope: SCOPE, callback: () => {} });
    tokenClient._cid = clientId;
  }
  return new Promise((resolve, reject) => {
    tokenClient.callback = resp => {
      if (resp.error) return reject(new Error(resp.error === 'access_denied' ? t('Has cancelado el acceso a Google.') : resp.error));
      accessToken = resp.access_token; tokenExp = Date.now() + (resp.expires_in || 3600) * 1000; resolve(accessToken);
    };
    tokenClient.error_callback = e => reject(new Error(e?.type === 'popup_closed' ? t('Has cerrado la ventana de Google.') : (e?.message || e?.type || 'error')));
    const acc = account();
    tokenClient.requestAccessToken({ prompt: acc ? '' : 'consent', ...(acc?.email && { hint: acc.email }) });
  });
}
async function api(path, opts = {}, interactive = true) {
  const token = await ensureToken(interactive);
  const r = await fetch(path.startsWith('http') ? path : API + path, { ...opts, headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
  if (r.status === 401) { accessToken = null; throw new Error('NO_TOKEN'); }
  return r;
}

export async function signIn() {
  await ensureToken(true);
  const r = await api('/oauth2/v3/userinfo');
  if (!r.ok) throw new Error(t('No se pudo iniciar sesión.'));
  const u = await r.json();
  writeLS(LS_ACCOUNT, { name: u.name || u.email, email: u.email, picture: u.picture || '' });
  setStatus(status);
  return account();
}
export async function signOut() {
  try { if (accessToken) (await gis()).revoke(accessToken, () => {}); } catch {}
  accessToken = null; tokenExp = 0; tokenClient = null; writeLS(LS_ACCOUNT, null); writeLS(LS_FILE, null); currentFile = null;
  setStatus('idle');
}

// ---- Files ---------------------------------------------------------------------
// The Drive file the presentation is linked to: { id, name, version }.
// Linked to the document open when linking (docEpoch): opening or creating
// another one unlinks it, so autosave never writes one presentation over another.
let currentFile = readLS(LS_FILE), linkedEpoch = docEpoch();
export const linkedFile = () => (currentFile && linkedEpoch === docEpoch() ? currentFile : null);
const setLinked = f => { currentFile = f; linkedEpoch = docEpoch(); writeLS(LS_FILE, f); };
export const unlinkFile = () => { setLinked(null); setStatus('idle'); };

const safeName = () => (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'presentacion';
const b64url = s => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function upload({ id, name, mimeType, body, thumbnail }) {
  const boundary = 'revela' + Math.random().toString(36).slice(2);
  const meta = id ? {} : { name, mimeType, appProperties: { revela: '1' } };
  if (thumbnail) meta.contentHints = { thumbnail: { image: b64url(thumbnail), mimeType: 'image/jpeg' } };
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`
    + `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${body}\r\n--${boundary}--`;
  const r = await api(`/upload/drive/v3/files${id ? '/' + encodeURIComponent(id) : ''}?uploadType=multipart&fields=id,name,version,modifiedTime`,
    { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: multipart }, !id);
  if (!r.ok) throw new Error(t('No se pudo guardar.'));
  return r.json();
}

// Revela projects in Drive, most recent first.
export async function listPresentations() {
  const q = encodeURIComponent("trashed=false and (appProperties has { key='revela' and value='1' } or name contains '.revela.json')");
  const r = await api(`/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=60&fields=files(id,name,modifiedTime,thumbnailLink,version)`);
  if (!r.ok) throw new Error(t('No se pudo leer tu Drive.'));
  return ((await r.json()).files || []).map(f => ({ ...f, title: f.name.replace(/\.revela\.json$/i, '') }));
}
export async function openPresentation(id) {
  const meta = await (await api(`/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,version`)).json();
  const r = await api(`/drive/v3/files/${encodeURIComponent(id)}?alt=media`);
  if (!r.ok) throw new Error(t('No se pudo abrir el archivo.'));
  let deck; try { deck = JSON.parse(await r.text()); } catch { throw new Error(t('El archivo no es un proyecto de Revela.')); }
  if (!deck || !Array.isArray(deck.slides)) throw new Error(t('El archivo no es un proyecto de Revela.'));
  replaceDeck(deck); setLinked({ id: meta.id, name: meta.name, version: meta.version });
  lastSaved = docVersion(); setStatus('saved');
}
export async function deletePresentation(id) {
  const r = await api(`/drive/v3/files/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
  if (!r.ok) throw new Error(t('No se pudo borrar el archivo de Drive.'));
  if (linkedFile()?.id === id) unlinkFile();
}

// A small JPEG of the first slide, for the list (base64, without the prefix).
export let makeThumbnail = async () => null;
export const setThumbnailMaker = fn => { makeThumbnail = fn; };

// Save the presentation to Drive (a new file the first time, then the same one).
// force: overwrite even if it changed in Drive meanwhile.
export async function savePresentation({ interactive = true, force = false, asNew = false } = {}) {
  if (!gdriveReady()) { openGdriveSetup(); return false; }
  const body = JSON.stringify(state.deck);
  const savedVersion = docVersion();                     // (what this upload contains)
  let thumbnail = null; try { thumbnail = await makeThumbnail(); } catch {}
  setStatus('saving');
  try {
    const cur = linkedFile();
    if (cur && !asNew) {
      if (!force) {                                          // changed from another device?
        const m = await (await api(`/drive/v3/files/${encodeURIComponent(cur.id)}?fields=version,trashed`, {}, interactive)).json();
        if (m.trashed) { setLinked(null); return savePresentation({ interactive, force, asNew }); }
        if (cur.version && m.version && +m.version > +cur.version) { setStatus('conflict'); return 'conflict'; }
      }
      const f = await upload({ id: cur.id, mimeType: PROJECT_MIME, body, thumbnail });
      setLinked({ ...cur, version: f.version, name: f.name, dirty: false });
    } else {
      const f = await upload({ name: safeName() + '.revela.json', mimeType: PROJECT_MIME, body, thumbnail });
      setLinked({ id: f.id, name: f.name, version: f.version });
    }
    lastSaved = savedVersion; setStatus('saved');
    return true;
  } catch (e) {
    setStatus(e.message === 'NO_TOKEN' ? 'offline' : 'error');
    if (interactive) throw e;
    return false;
  }
}

// ---- Autosave ----------------------------------------------------------------------
let lastSaved = null, timer = null, delay = 4000;
export const setAutosaveDelay = ms => { delay = ms; };
export function startAutosave() {
  return subscribe(() => {
    // Another document replaced the linked one: forget the link (also for next time).
    if (currentFile && linkedEpoch !== docEpoch()) { currentFile = null; writeLS(LS_FILE, null); setStatus('idle'); return; }
    if (!linkedFile() || !account()) return;
    if (docVersion() === lastSaved) return;                    // (only the document's content counts)
    if (!currentFile.dirty) setLinked({ ...currentFile, dirty: true });   // remembered across reloads
    if (status === 'saved' || status === 'idle') setStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(() => { if (status !== 'conflict') savePresentation({ interactive: false }).catch(() => {}); }, delay);
  });
}
// Back after a reload or another device: newer in Drive and nothing changed
// here → load it; changed in both → ask (conflict); only here → save.
export async function reconnect() {
  const cur = linkedFile(); if (!cur) return null;
  await ensureToken(true);
  const m = await (await api(`/drive/v3/files/${encodeURIComponent(cur.id)}?fields=version,trashed`)).json();
  if (m.trashed) { unlinkFile(); return 'unlinked'; }
  const newer = cur.version && m.version && +m.version > +cur.version;
  if (newer && !cur.dirty) { await openPresentation(cur.id); return 'loaded'; }
  if (newer) { setStatus('conflict'); return 'conflict'; }
  if (cur.dirty) return savePresentation();
  lastSaved = docVersion(); setStatus('saved'); return 'saved';
}
export const markOffline = () => setStatus('offline');
export const needsReconnect = () => !!(linkedFile() && account() && !hasToken());
// Conflict resolution: keep this version (overwrite), or load Drive's.
export const keepMine = () => savePresentation({ force: true });
export const loadTheirs = () => openPresentation(linkedFile().id);

// ---- Older entry points (Archivo ▸ Google Drive) -------------------------------------
async function pickFile() {
  const { apiKey, appId } = gdriveConfig();
  const token = await ensureToken(true);
  if (!window.gapi) await loadScript(GAPI);
  await new Promise(res => window.gapi.load('picker', res));
  const g = window.google;
  return new Promise(resolve => {
    const view = new g.picker.DocsView(g.picker.ViewId.DOCS).setMimeTypes('application/json,text/html,application/octet-stream');
    const builder = new g.picker.PickerBuilder().setOAuthToken(token).setDeveloperKey(apiKey).addView(view)
      .setCallback(data => {
        if (data.action === g.picker.Action.PICKED) resolve(data.docs[0]);
        else if (data.action === g.picker.Action.CANCEL) resolve(null);
      });
    if (appId) builder.setAppId(appId);                     // so drive.file covers the chosen file
    builder.build().setVisible(true);
  });
}
export async function driveOpen() {
  if (!gdriveReady()) return openGdriveSetup();
  const doc = await pickFile(); if (!doc) return;
  await openPresentation(doc.id);
}

// Export the reveal.js HTML presentation to Drive (a new file each time).
export async function driveSaveHtml() {
  if (!gdriveReady()) return openGdriveSetup();
  await upload({ name: safeName() + '.html', mimeType: 'text/html', body: buildHTML() });
  return true;
}

// Share a sealed presentation (io/share/seal.js): a new file in your Drive that
// anyone with the link may read. Its content is encrypted and the key is not in
// Drive, so the file alone shows nothing. The viewer page downloads it with the
// API key (public by design; restricted to this site in Google Cloud).
export async function driveShareSealed(env, name) {
  if (!gdriveReady()) { openGdriveSetup(); throw new Error(t('Configura primero Google Drive.')); }
  const { id } = await upload({ name, mimeType: 'application/json', body: JSON.stringify(env) });
  const r = await api(`/drive/v3/files/${id}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }) });
  if (!r.ok) throw new Error(t('No se pudo compartir el archivo de Drive.'));
  return { id, apiKey: gdriveConfig().apiKey };
}
export const driveSealedURL = (id, apiKey) => `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(apiKey)}`;
// Stop sharing: the file is deleted from your Drive.
export async function driveUnshare(id) {
  const r = await api(`/drive/v3/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(t('No se pudo borrar el archivo de Drive.'));
}

// Optional: use one's own Google Cloud project instead of Revela's.
export function openGdriveSetup() {
  if (document.getElementById('gd-modal')) return;
  const c = readLS(LS) || {};
  const back = document.createElement('div');
  back.id = 'gd-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:min(360px,94vw);max-width:92vw">
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
    writeLS(LS, own.clientId && own.apiKey ? own : null);
    tokenClient = null; accessToken = null;
    close();
  });
}

// Wrappers that surface errors as friendly dialogs.
const friendly = e => alertUser(e.message === 'NO_TOKEN' ? t('Vuelve a iniciar sesión con Google.') : e.message);
export const openWithUI = () => driveOpen().catch(friendly);
export const saveWithUI = () => savePresentation().then(ok => {
  if (ok === 'conflict') alertUser(t('La presentación ha cambiado en Drive desde otro dispositivo. Elige qué versión quedarse en el aviso de arriba.'));
  else if (ok) alertUser(t('Guardado en Google Drive.'));
}).catch(friendly);
export const saveHtmlWithUI = () => driveSaveHtml().then(ok => { if (ok) alertUser(t('Guardado en Google Drive.')); }).catch(friendly);
