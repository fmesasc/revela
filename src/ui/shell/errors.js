// The app's errors, sent to Revela by itself (server/cloudflare/errors.js), so that one is known and fixed before
// anyone has to write — most people who meet one just close the tab. The administration lists them (Errores).
//
// What goes: the message (quoted text taken out), where in the app's code (its files, without query or hash), the
// app's page, the version, the browser and system, the language and the last few ribbon actions (their names). Never
// the presentation, its text or files, nor who: no account, no cookie (credentials: 'omit'). privacy.html says so.
// Each error once per session, and at most MAX; not the noise of browsers, extensions and networks.
import { apiBase } from '../../io/cloud/account.js';
import { APP_VERSION } from '../../core/config.js';
import { currentLang } from '../../i18n/index.js';

const MAX = 10, actions = [], seen = new Set();
let sent = 0, on = false;
const IGNORE = /ResizeObserver loop|^Script error\.?$|AbortError|aborted|NotAllowedError|chrome-extension:|moz-extension:|safari-(web-)?extension:|Load failed|Failed to fetch|NetworkError|^STOPPED$|^CANCELLED$/i;

// «Chrome 141 · Windows»: the browser and system, nothing more of the user agent.
export function browserName(u = navigator.userAgent) {
  const b = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Otro';
  const v = (u.match(/(?:Edg|OPR|Firefox|Chrome|Version)\/(\d+)/) || [])[1] || '';
  const os = /Windows/.test(u) ? 'Windows' : /iPhone|iPad/.test(u) ? 'iOS' : /Mac OS X/.test(u) ? 'macOS' : /Android/.test(u) ? 'Android' : /CrOS/.test(u) ? 'ChromeOS' : /Linux/.test(u) ? 'Linux' : 'Otro';
  return `${b}${v ? ' ' + v : ''} · ${os}`;
}
// A stack with only addresses of the app's files: no query, hash, blob: or data: (they could carry anything).
const cleanStack = s => String(s || '').split('\n').slice(0, 12).map(l => l.replace(/(https?:\/\/[^\s)]+?)[?#][^\s):]*/g, '$1').replace(/(blob|data):[^\s)]+/g, '$1:…')).join('\n').slice(0, 2000);

export function initErrorReports({ testing = false } = {}) {
  if (on || testing || !apiBase()) return; on = true;
  // (The last ribbon actions: what was being done — their names, as «present» or «import-pptx».)
  document.addEventListener('click', e => { const a = e.target.closest?.('[data-action]')?.dataset.action; if (a) { actions.push(a); if (actions.length > 5) actions.shift(); } }, true);
  window.addEventListener('error', e => reportError(e.error || e.message, 'error', e));
  window.addEventListener('unhandledrejection', e => reportError(e.reason, 'rejection'));
}
// Also for errors the app catches and tells the person about (kind 'handled'): a PowerPoint that can't be read…
export function reportError(err, kind = 'error', ev = null) {
  try {
    if (!on) return;
    const msg = String(err?.message || (typeof err === 'string' ? err : '') || ev?.message || '').replace(/"[^"]{16,}"|'[^']{16,}'|«[^»]{16,}»/g, '"…"').slice(0, 300).trim();
    const stack = cleanStack(err?.stack || (ev?.filename ? `at ${ev.filename}:${ev.lineno}:${ev.colno}` : ''));
    if (!msg || IGNORE.test(msg) || IGNORE.test(stack)) return;
    if (stack && !/\/src\//.test(stack)) return;                          // (not the app's code: an extension, a page inside)
    const key = msg + '|' + (stack.split('\n').find(l => /\/src\//.test(l)) || '');
    if (seen.has(key) || sent >= MAX) return;
    seen.add(key); sent++;
    const body = JSON.stringify({ msg, stack, where: location.pathname, version: APP_VERSION, browser: browserName(), lang: currentLang(), actions: [...actions], kind });
    fetch(apiBase() + 'errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'omit' }).catch(() => {});
  } catch {}
}
