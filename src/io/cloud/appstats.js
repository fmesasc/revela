// Anonymous usage statistics of the DESKTOP application (Tauri) — only if the person says yes, once, at the first launch
// (GDPR art. 6.1.a: consent; privacy.html, the desktop application's section). Without a yes nothing is ever sent and no
// number is made. With it, to POST /api/app/open|event|forget (server/cloudflare/appstats.js):
//   - a random number (a v4 UUID made here, kept in this computer: never the account, the email or anything of the presentations),
//     the version of Revela, the system (windows | mac | linux | otro), the language, and whether a session was ever started here;
//   - when the application opens (at most once every 6 hours), and the steps of the sign-in with a FIXED reason when it fails
//     (closed | expired | network | denied | other) — never the text of an error.
// Changing the decision (Ayuda ▸ «Estadísticas de uso anónimas»): off deletes the number here and asks the server to delete
// what it keeps (if it can't be reached, the request waits for the next launch). Nothing here may stop the launch: every call
// is silent, with a timeout, and tried once.
//
// Kept in localStorage: revela.appstats.state ('yes' | 'no'), .id, .last (ms of the last opening sent), .forget (an id to delete).
import { currentLang } from '../../i18n/index.js';
import { OFFICIAL_SITE, APP_VERSION } from '../../core/config.js';

const K = { state: 'revela.appstats.state', id: 'revela.appstats.id', last: 'revela.appstats.last', forget: 'revela.appstats.forget' };
const SESSION = 'revela.session';                              // (the sign-in's own key, account.js: here only whether it exists)
export const MENU_NAME = 'Estadísticas de uso anónimas';
export const REASONS = ['closed', 'expired', 'network', 'denied', 'other'];
export const EVERY_MS = 6 * 3600e3;
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); return true; } catch { return false; } };

// 'yes' | 'no' | '' (never answered). No storage: 'no' (never send, rather than ask every time).
export const statsState = () => { try { return localStorage.getItem(K.state) || ''; } catch { return 'no'; } };
export const statsId = () => { const s = read(K.id); return statsState() === 'yes' && UUID4.test(s || '') ? s : ''; };
export const newId = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const osOf = () => { const p = (globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '') + ' ' + (globalThis.navigator?.userAgent || '');
  return /Win/i.test(p) ? 'windows' : /Mac/i.test(p) ? 'mac' : /Linux|X11/i.test(p) ? 'linux' : 'otro'; };
const base = () => OFFICIAL_SITE + '/api/';

// One request: no cookies, no session, no waiting; false if it didn't work (never throws).
async function post(path, body, { doFetch = globalThis.fetch } = {}) {
  try {
    const r = await doFetch(base() + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer',
      body: JSON.stringify(body), ...(globalThis.AbortSignal?.timeout && { signal: AbortSignal.timeout(8000) }) });
    return !!r?.ok;
  } catch { return false; }
}

// The opening: only with a yes, and at most once in EVERY_MS. Returns whether it was sent.
export async function sendOpen({ now = Date.now(), doFetch } = {}) {
  const id = statsId(); if (!id) return false;
  if (now - (+read(K.last) || 0) < EVERY_MS && now >= (+read(K.last) || 0)) return false;
  const ok = await post('app/open', { id, v: APP_VERSION, os: osOf(), lang: currentLang(), ...(read(SESSION) && { li: true }) }, { doFetch });
  if (ok) write(K.last, String(now));
  return ok;
}
// A step of the sign-in desktop (account.js): 'start' | 'ok' | 'fail' (+ a fixed reason). Silent; nothing without a yes.
export function loginEvent(kind, reason = '', { doFetch } = {}) {
  const id = statsId(); if (!id || !['start', 'ok', 'fail'].includes(kind)) return Promise.resolve(false);
  return post('app/event', { id, e: 'login-' + kind, ...(kind === 'fail' && { reason: REASONS.includes(reason) ? reason : 'other' }) }, { doFetch });
}
// An error of the sign-in, as one of the fixed reasons.
export function reasonOf(e) {
  const m = String(e?.message || ''), s = e?.status;
  if (m === 'CANCELLED') return 'closed';
  if (m === 'EXPIRED') return 'expired';
  if (s === 401 || s === 403 || s === 400 && /terms|tester/i.test(m)) return 'denied';
  if (e?.name === 'TypeError' || s === 0 || s === 502 || s === 503 || s === 504) return 'network';
  return 'other';
}

// Yes: makes the number and tells of this opening. No: forgets everything, and asks the server to delete.
export async function setStats(on, { now = Date.now(), doFetch } = {}) {
  if (on) {
    const id = newId(); if (!write(K.id, id)) return false;
    write(K.state, 'yes'); write(K.last, null); write(K.forget, null);
    sendOpen({ now, doFetch }); return true;
  }
  const id = read(K.id);
  write(K.state, 'no'); write(K.id, null); write(K.last, null);
  if (UUID4.test(id || '')) { write(K.forget, id); await forgetPending({ doFetch }); }
  return true;
}
// A deletion not yet done (no network when it was asked): tried again at each launch until the server confirms it.
export async function forgetPending({ doFetch } = {}) {
  const id = read(K.forget); if (!id) return true;
  if (!UUID4.test(id)) { write(K.forget, null); return true; }
  if (await post('app/forget', { id }, { doFetch })) { write(K.forget, null); return true; }
  return false;
}
