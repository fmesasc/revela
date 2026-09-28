// Client of the collaboration rooms of Revela's server (server/cloudflare,
// the same Worker as sharing, configured in Compartir ▸ Servidor propio).
// With it, a live session doesn't depend on the tab of whoever shared it.

import { serverConfig, uploadAuth, forbiddenMessage } from './shareserver.js';
import { pack, unpacker } from '../../features/live/collabsync.js';
import { t } from '../../i18n/index.js';

const base = () => (serverConfig().url || '').replace(/\/+$/, '');
export const collabServerReady = () => /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(base());

// A room with the presentation → { room, tokens: { view, comment, edit }, owner, server }.
export async function createRoom(deck) {
  const r = await fetch(base() + '/c', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await uploadAuth()) }, body: JSON.stringify({ deck }) });
  if (r.status === 501) throw new Error(t('El servidor no tiene activada la colaboración (falta el Durable Object ROOMS).'));
  if (!r.ok) throw new Error(r.status === 403 ? forbiddenMessage() : r.status === 413 ? t('La presentación es demasiado grande para el servidor.') : t('El servidor respondió ') + r.status);
  return { ...(await r.json()), server: base() };
}

// The WebSocket of a room, as the connection features/live/collab.js expects.
export function roomConnect(server, room) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(server.replace(/^http/, 'ws').replace(/\/+$/, '') + '/c/' + encodeURIComponent(room));
    const up = unpacker(), onData = [], onClose = [];
    ws.onmessage = e => { const m = up(e.data); if (m) onData.forEach(f => f(m)); };
    ws.onclose = () => onClose.forEach(f => f());
    ws.onerror = () => reject(new Error(t('No se pudo conectar con el servidor.')));
    ws.onopen = () => resolve({
      send: m => { if (ws.readyState === 1) for (const s of pack(m)) ws.send(s); },
      onData: f => onData.push(f), onClose: f => onClose.push(f), close: () => ws.close(),
    });
    setTimeout(() => reject(new Error('timeout')), 20000);
  });
}
