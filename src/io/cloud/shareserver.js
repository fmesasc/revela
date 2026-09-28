// Client of Revela's server (server/cloudflare): upload a sealed presentation,
// stop sharing it. Revela's own server by default (core/config.js); another
// one can be set in this browser. Uploading needs the server's upload key or,
// on Revela's server, being signed in with Google (the access token goes as
// Authorization; the server checks it with Google).

import { SERVER_URL } from '../../core/config.js';
import { ensureToken, account, signIn } from './gdrive.js';
import { t } from '../../i18n/index.js';

const LS = 'revela.shareServer';
const own = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
export function serverConfig() { const c = own(); return c?.url ? c : { url: SERVER_URL, uploadKey: '', builtIn: true }; }
export function setServerConfig(c) { try { c?.url && c.url.replace(/\/+$/, '') !== SERVER_URL ? localStorage.setItem(LS, JSON.stringify(c)) : localStorage.removeItem(LS); } catch {} }
// Headers that let this browser upload: the key, or the Google session.
export async function uploadAuth() {
  const c = serverConfig();
  if (c.uploadKey) return { 'X-Upload-Key': c.uploadKey };
  if (!account()) await signIn();                         // signs in (name and picture in the title bar)
  return { Authorization: 'Bearer ' + await ensureToken(true) };
}
export const limitMessage = () => t('El servidor gratuito ha llegado a su límite de hoy. Vuelve a intentarlo mañana.');
export const forbiddenMessage = () => (serverConfig().uploadKey ? t('La clave de subida no es correcta.')
  : account() ? t('Tu cuenta de Google no tiene permiso en este servidor.') : t('Inicia sesión con Google para compartir o colaborar a través del servidor.'));
export const serverReady = () => /^https:\/\//.test(serverConfig().url || '');
const base = () => serverConfig().url.replace(/\/+$/, '');

export async function serverShare(env, { days = 0, domain = '', clientId = '' } = {}) {
  const q = new URLSearchParams({ ...(days && { days }), ...(domain && { domain, clientId }) }).toString();
  const r = await fetch(`${base()}/s${q ? '?' + q : ''}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await uploadAuth()) }, body: JSON.stringify(env) });
  if (!r.ok) throw new Error(r.status === 403 ? forbiddenMessage() : r.status === 429 ? limitMessage() : r.status === 413 ? t('La presentación es demasiado grande para el servidor.') : t('El servidor respondió ') + r.status);
  return r.json();                                  // { id, token }
}
export const serverSealedURL = id => `${base()}/s/${encodeURIComponent(id)}`;
export async function serverUnshare(url, token) {
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('El servidor respondió ' + r.status);
}
// Views of a share (a counter and the last date), for whoever shared it.
export async function serverStats(url, token) {
  const r = await fetch(url + '/stats', { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('El servidor respondió ' + r.status);
  return r.json();
}
