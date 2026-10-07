// A Revela account (the official edition at revelaslides.com/app and the
// desktop app): signing in, the plan and credits, AI through the account, and
// payments. The server (server/cloudflare/api.js) decides everything; this only
// asks it and shows what it says.
//
// - On the web: the session is an HttpOnly cookie for revelaslides.com/api
//   (this page never sees it); sign-in is "Sign in with Google" here.
// - In the desktop app: Google doesn't allow signing in inside an app's window,
//   so the app opens the browser at revelaslides.com, where the person
//   (signed in there) confirms the code the app shows; the app then collects
//   its own session and keeps it in this window's storage.
// - The open edition (GitHub) has no account: its AI uses the person's own key.

import { EDITION, OFFICIAL_SITE, GOOGLE } from '../../core/config.js';
import { loadScript } from '../../core/vendor.js';
import { currentLang, t } from '../../i18n/index.js';

const GIS = 'https://accounts.google.com/gsi/client';

const TOKEN = 'revela.session';
export const hasAccounts = () => EDITION === 'cloud' || EDITION === 'desktop';
export const apiBase = () => (EDITION === 'cloud' ? new URL('/api/', location.origin).href : EDITION === 'desktop' ? OFFICIAL_SITE + '/api/' : null);
const bearer = () => { try { return localStorage.getItem(TOKEN) || ''; } catch { return ''; } };
const setBearer = t => { try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch {} };

let me = null;                                          // what the server said last: { email, plan, credits, features, billing }
const listeners = new Set();
export const onAccount = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const account = () => me;
const changed = () => listeners.forEach(fn => { try { fn(me); } catch {} });

// A request to the API (with the session: cookie on the web, bearer in the desktop app).
export async function api(path, body) {
  const base = apiBase(); if (!base) throw Object.assign(new Error('NO_ACCOUNTS'), { status: 0 });
  const headers = { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(EDITION === 'desktop' && bearer() && { Authorization: 'Bearer ' + bearer() }) };
  const r = await fetch(base + path, { method: body !== undefined ? 'POST' : 'GET', headers, credentials: EDITION === 'cloud' ? 'include' : 'omit',
    ...(body !== undefined && { body: JSON.stringify(body) }) });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { me = null; if (EDITION === 'desktop') setBearer(''); changed(); }
  if (!r.ok) {
    if (r.status === 402) spent(0);
    // (An account blocked by Revela's administrators: said plainly, wherever the error is shown.)
    const msg = r.status === 403 && data.error === 'blocked' ? t('Tu cuenta está bloqueada: la IA y la nube no están disponibles. Si crees que es un error, usa «Informar de un problema».') : data.error || 'HTTP ' + r.status;
    throw Object.assign(new Error(msg), { status: r.status, data });
  }
  if (+data.charged > 0) spent(path.startsWith('ai/') ? +data.charged : 0);   // (a 3D job reports its running total: only re-asked)
  return data;
}
// Something charged credits (data.charged): the button shows it at once, and the server's
// figure (with what expires) follows shortly after, once for a burst of calls or polls.
let recheck = null;
function spent(n) {
  if (me && n) { me = { ...me, credits: Math.max(0, (me.credits | 0) - n) }; changed(); }
  clearTimeout(recheck); recheck = setTimeout(() => refreshAccount().catch(() => {}), 1500);
}

// Who is signed in (null if nobody), asking the server.
export async function refreshAccount() {
  if (!hasAccounts()) return null;
  try { me = await api('me'); } catch (e) { if (e.status === 401) me = null; else throw e; }
  changed(); return me;
}

// ---- Signing in on the web: Google's own window, then the server checks the token with Google ----
function googleToken() {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({ client_id: GOOGLE.clientId, scope: 'openid email profile',
      callback: r => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error || 'CANCELLED'))),
      error_callback: e => reject(new Error(e?.type || 'CANCELLED')) });
    client.requestAccessToken({ prompt: '' });
  });
}
// The terms of service: a new account accepts them (and confirms being 14 or older) before
// signing in; the server keeps the date and version (server/cloudflare/api.js, TERMS_VERSION).
// This browser remembers they were accepted, to send it again with the next sign-ins.
export const TERMS_VERSION = '2026-10-01';
export const TERMS_URL = OFFICIAL_SITE + '/terms.html', PRIVACY_URL = OFFICIAL_SITE + '/privacy.html';
const TERMS_KEY = 'revela.terms';
export const termsAccepted = () => { try { return localStorage.getItem(TERMS_KEY) === TERMS_VERSION; } catch { return false; } };
export const rememberTerms = () => { try { localStorage.setItem(TERMS_KEY, TERMS_VERSION); } catch {} };
// An account from before (the server says terms: false): accepted once.
export async function acceptTerms() { await api('terms', { version: TERMS_VERSION, lang: currentLang() }); rememberTerms(); return refreshAccount(); }

// The campaign one came from (a campaign's link, /api/go/<slug> → ?rv=<slug>, carried on by the website's links): told
// to the server when an account is created, so the admin sees which campaigns bring accounts (server/cloudflare/crm.js).
// Kept in memory only, while this page is open: nothing stored on the device for it.
let rv = null;
try { rv = new URLSearchParams(location.search).get('rv'); if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(rv || '')) rv = null; } catch {}
export const campaign = () => rv;

// (Throws Error('TERMS') when the server needs the terms accepted first: a new account; Error('NOT_TESTER') on the
// test site for someone not invited to it.)
export async function signIn() {
  if (EDITION === 'desktop') return desktopSignIn();
  if (!window.google?.accounts?.oauth2) await loadScript(GIS);
  try { await api('login', { accessToken: await googleToken(), lang: currentLang(), ...(termsAccepted() && { terms: TERMS_VERSION }), ...(campaign() && { campaign: campaign() }) }); }
  catch (e) { if (e.status === 400 && e.data?.error === 'terms') throw new Error('TERMS'); if (e.status === 403 && e.data?.error === 'not a tester') throw new Error('NOT_TESTER'); throw e; }
  return refreshAccount();
}
// My open sessions (/api/sessions): where this account is signed in; closing one, or all the others.
export const sessions = () => api('sessions').then(r => r.sessions);
export const endSession = id => api('sessions', { id });
export const endOtherSessions = () => api('sessions', { others: true });
export async function signOut() {
  try { await api('logout', {}); } catch {}
  setBearer(''); me = null; changed();
}

// ---- The desktop app: sign in through the browser (a code to confirm, then the app's own session) ----
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
export const shortCode = challenge => challenge.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
const openInBrowser = url => (window.__TAURI__?.opener?.openUrl ? window.__TAURI__.opener.openUrl(url) : window.open(url, '_blank', 'noopener'));
// Starts it and resolves when the browser has confirmed (or rejects after 10 minutes). onCode(code) shows the code meanwhile.
export async function desktopSignIn({ onCode = () => {}, signal } = {}) {
  const nonce = random(24), verifier = random(32), challenge = await sha256(verifier);
  const { code } = await api('desktop/start', { nonce, challenge });
  onCode(code);
  await openInBrowser(`${OFFICIAL_SITE}/app/?desktop=${encodeURIComponent(nonce)}&code=${encodeURIComponent(code)}`);
  const until = Date.now() + 10 * 60e3;
  while (Date.now() < until) {
    if (signal?.aborted) throw new Error('CANCELLED');
    await new Promise(r => setTimeout(r, 2500));
    const r = await api('desktop/claim', { nonce, verifier }).catch(e => (e.status === 410 ? { expired: true } : { pending: true }));
    if (r.expired) break;
    if (r.token) { setBearer(r.token); return refreshAccount(); }
  }
  throw new Error('EXPIRED');
}
// On the web: the page was opened by the desktop app (?desktop=…&code=…); asks, then approves.
export const desktopRequest = (search = location.search) => {
  const q = new URLSearchParams(search), nonce = q.get('desktop'), code = q.get('code');
  return nonce && /^[\w-]{20,64}$/.test(nonce) && /^[A-Z0-9]{6}$/.test(code || '') ? { nonce, code } : null;
};
export const approveDesktop = ({ nonce, code }) => api('desktop/approve', { nonce, code });

// ---- AI through the account (the same shapes as OpenRouter's) ----
export const cloudAi = {
  active: () => !!me,
  chat: body => api('ai/chat', body),
  image: body => api('ai/image', body),
  speech: body => api('ai/speech', body),
};

// ---- Payments: the server makes the Stripe page; prices are Stripe's ----
// (In the desktop app, Stripe's page opens in the browser.)
const go = url => (EDITION === 'desktop' ? openInBrowser(url) : location.assign(url));
export async function buy(product, extra = {}) { const { url } = await api('billing/checkout', { product, ...extra }); go(url); }
export async function manageBilling() { const { url } = await api('billing/portal', {}); go(url); }
