// Dropbox and OneDrive: save the presentation there and open it again. The
// project (.revela.json) goes to Revela's own folder — Dropbox's app folder
// (Apps/Revela: the app sees nothing else) or "Revela" in OneDrive — and is
// read back from it. Sign-in with PKCE (oauth.js); the token is kept in memory
// only, so each visit signs in again (one click if the session is still open).

import { state, replaceDeck } from '../../core/store.js';
import { CLOUD_KEYS } from '../../core/config.js';
import { pkceLogin } from './oauth.js';

const LS = 'revela.cloudKeys';
const read = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } };
export const ownKey = id => read()[id] || '';
export function setOwnKey(id, key) {
  const all = read(); key = String(key || '').trim();
  if (key) all[id] = key; else delete all[id];
  try { localStorage.setItem(LS, JSON.stringify(all)); } catch {}
  tokens.delete(id);
}
// A Dropbox app with access to all of Dropbox (needed for its "Open with"
// extension): the presentations go to the Revela folder there; an app-folder
// app keeps them in Apps/Revela.
export const dropboxFull = () => !!read().dropboxFull;
export function setDropboxFull(on) { const all = read(); if (on) all.dropboxFull = true; else delete all.dropboxFull; try { localStorage.setItem(LS, JSON.stringify(all)); } catch {} tokens.delete('dropbox'); }
// (With Revela's own app — whatever its access, the whole Dropbox or an app folder — always a Revela
// folder: never loose files in someone's Dropbox root.)
const dbxRoot = () => (dropboxFull() || !ownKey('dropbox') ? '/Revela' : '');
export const cloudKey = id => ownKey(id) || CLOUD_KEYS[id] || '';
export const cloudReady = id => !!cloudKey(id);

// Header-safe JSON (Dropbox-API-Arg must be ASCII: other characters escaped).
const asciiJSON = o => JSON.stringify(o).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const GRAPH = 'https://graph.microsoft.com/v1.0/me/drive';
const CHUNK = 320 * 1024 * 10;                                   // (OneDrive: pieces in multiples of 320 KiB)

export const PROVIDERS = {
  dropbox: {
    name: 'Dropbox', console: 'https://www.dropbox.com/developers/apps',
    auth: { authorize: 'https://www.dropbox.com/oauth2/authorize', token: 'https://api.dropboxapi.com/oauth2/token',
      scope: 'files.metadata.read files.content.read files.content.write', extra: { token_access_type: 'online' } },
    async list(api) {
      let r;
      try { r = await api('https://api.dropboxapi.com/2/files/list_folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: dbxRoot() }) }); }
      catch (e) { if (e.status === 409) return []; throw e; }      // (no Revela folder yet)
      return (r.entries || []).filter(e => e['.tag'] === 'file' && /\.revela\.json$/i.test(e.name))
        .map(e => ({ id: e.path_lower, name: e.name, modified: e.server_modified }));
    },
    async save(api, name, text) {
      const r = await api('https://content.dropboxapi.com/2/files/upload', { method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': asciiJSON({ path: dbxRoot() + '/' + name, mode: 'overwrite', mute: true }) }, body: text });
      return { id: r.path_lower, name: r.name };
    },
    open: (api, id) => api('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: { 'Dropbox-API-Arg': asciiJSON({ path: id }) } }, 'text'),
  },
  onedrive: {
    name: 'OneDrive', console: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    auth: { authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scope: 'Files.ReadWrite' },
    async list(api) {
      try {
        const r = await api(`${GRAPH}/root:/Revela:/children?$select=id,name,lastModifiedDateTime&$top=200`);
        return (r.value || []).filter(f => /\.revela\.json$/i.test(f.name)).map(f => ({ id: f.id, name: f.name, modified: f.lastModifiedDateTime }));
      } catch (e) { if (e.status === 404) return []; throw e; }      // (no folder yet: nothing saved)
    },
    async save(api, name, text) {
      const path = `${GRAPH}/root:/Revela/${encodeURIComponent(name)}:`, body = new Blob([text], { type: 'application/json' });
      if (body.size < 4e6) { const r = await api(`${path}/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }); return { id: r.id, name: r.name }; }
      // Bigger (pictures inside): an upload session, in pieces.
      const s = await api(`${path}/createUploadSession`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }) });
      let last = null;
      for (let at = 0; at < body.size; at += CHUNK) {
        const part = body.slice(at, Math.min(body.size, at + CHUNK));
        const r = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${at}-${at + part.size - 1}/${body.size}` }, body: part });  // (no token: the URL is the permission)
        if (!r.ok) throw Object.assign(new Error('UPLOAD'), { status: r.status });
        last = await r.json().catch(() => null);
      }
      return { id: last?.id, name: last?.name || name };
    },
    open: (api, id) => api(`${GRAPH}/items/${encodeURIComponent(id)}/content`, {}, 'text'),
  },
};

// provider → { token, until }: kept for this tab (sessionStorage, as Drive's), so a reload doesn't sign out.
const TK = 'revela.cloudTokens';
const tokens = new Map(Object.entries((() => { try { return JSON.parse(sessionStorage.getItem(TK)) || {}; } catch { return {}; } })()));
const keepTokens = () => { try { sessionStorage.setItem(TK, JSON.stringify(Object.fromEntries(tokens))); } catch {} };
export const signedIn = id => (tokens.get(id)?.until || 0) > Date.now();
export const signOutCloud = id => { tokens.delete(id); keepTokens(); };
export async function connect(id) {
  if (signedIn(id)) return true;
  const p = PROVIDERS[id];
  const r = await pkceLogin({ ...p.auth, clientId: cloudKey(id) });
  tokens.set(id, { token: r.access_token, until: Date.now() + ((r.expires_in || 3600) - 60) * 1000 }); keepTokens();
  return true;
}
// A call to the service with the token (JSON back, or text).
export function apiFor(id) {
  return async (url, opts = {}, as = 'json') => {
    const tk = tokens.get(id); if (!tk || !signedIn(id)) throw new Error('NO_TOKEN');
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + tk.token } });
    if (r.status === 401) { tokens.delete(id); keepTokens(); throw new Error('NO_TOKEN'); }
    if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
    return as === 'text' ? r.text() : as === 'blob' ? r.blob() : r.json();
  };
}

const fileName = () => ((state.deck.name || 'presentacion').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'presentacion') + '.revela.json';
export const listCloud = id => PROVIDERS[id].list(apiFor(id));
export const saveToCloud = (id, name = fileName()) => PROVIDERS[id].save(apiFor(id), name, JSON.stringify(state.deck));
export async function openFromCloud(id, fileId) {
  let deck; try { deck = JSON.parse(await PROVIDERS[id].open(apiFor(id), fileId)); } catch (e) { if (e.message === 'NO_TOKEN' || e.status) throw e; deck = null; }
  if (!deck || !Array.isArray(deck.slides)) throw new Error('NOT_REVELA');
  replaceDeck(deck);
}
