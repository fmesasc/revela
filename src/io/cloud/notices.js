// Revela's own notices (server/cloudflare/notices.js): the ones for here — the editor, the gallery
// of new presentations — chosen by the server for this account's plan and the interface's language.
// Only in the official and desktop editions. Each one closed stays closed (this browser remembers it);
// views, clicks and closes are counted per notice, without saying who.
import { api, hasAccounts } from './account.js';

const CLOSED = 'revela.notices.closed';
const readClosed = () => { try { const v = JSON.parse(localStorage.getItem(CLOSED) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
export const isClosed = id => readClosed().includes(id);
export function closeNotice(id) {
  try { localStorage.setItem(CLOSED, JSON.stringify([id, ...readClosed().filter(x => x !== id)].slice(0, 60))); } catch {}
  noticeHit(id, 'close');
}
// The notices for a place ('editor', 'gallery'), without the closed ones; [] if none or offline.
export async function fetchNotices(where, lang) {
  if (!hasAccounts()) return [];
  try { const r = await api(`notices?where=${encodeURIComponent(where)}&lang=${encodeURIComponent(lang || '')}`); return (r.notices || []).filter(n => n && !isClosed(n.id)); }
  catch { return []; }
}
const seen = new Set();
// A view once per page; a click or a close each time.
export function noticeHit(id, kind) {
  if (!hasAccounts() || (kind === 'view' && seen.has(id))) return;
  if (kind === 'view') seen.add(id);
  api('notices/hit', { id, kind }).catch(() => {});
}
