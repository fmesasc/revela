// Client of the optional share server (server/cloudflare): upload a sealed
// presentation, stop sharing it. Configured in this browser only.

const LS = 'revela.shareServer';
export function serverConfig() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }
export function setServerConfig(c) { try { localStorage.setItem(LS, JSON.stringify(c)); } catch {} }
export const serverReady = () => /^https:\/\//.test(serverConfig().url || '');
const base = () => serverConfig().url.replace(/\/+$/, '');

export async function serverShare(env, { days = 0 } = {}) {
  const c = serverConfig();
  const r = await fetch(`${base()}/s${days ? `?days=${days}` : ''}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(c.uploadKey && { 'X-Upload-Key': c.uploadKey }) }, body: JSON.stringify(env) });
  if (!r.ok) throw new Error(r.status === 403 ? 'La clave de subida no es correcta.' : r.status === 413 ? 'La presentación es demasiado grande para el servidor.' : 'El servidor respondió ' + r.status);
  return r.json();                                  // { id, token }
}
export const serverSealedURL = id => `${base()}/s/${encodeURIComponent(id)}`;
export async function serverUnshare(url, token) {
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('El servidor respondió ' + r.status);
}
