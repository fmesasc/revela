// Revela's server (Cloudflare Worker + Durable Objects): sealed shared
// presentations and live collaboration rooms. No R2: see store.js (free plan,
// hard limits, never billed).
//
// It only ever receives encrypted data: presentations are sealed in the
// browser and the key stays in the link after "#", which never reaches this
// server. So it holds noise it cannot read. Identifiers are 128-bit random
// values, nothing is listed, and every response says noindex.
//
//   POST   /s         body: sealed JSON  → { id, token }   (see authorize())
//                      ?days=N expires it; ?domain=example.org&clientId=… only lets
//                      Google accounts of that domain read it (see below)
//   GET    /s/:id     → the sealed JSON (404 when missing or expired; 401 asking
//                      to sign in when limited to a domain)
//   GET    /s/:id/stats  Authorization: Bearer <token> → { views, last }
//   DELETE /s/:id     Authorization: Bearer <token>  → stop sharing
//
// Statistics are a counter and the date of the last view: nothing about who
// viewed (no IP, no browser). Domain-limited shares need a Google ID token of
// an account of that domain (Authorization: Bearer <id token>), checked here
// against Google's keys; the key in the link is still needed to read it.
//
// Also live collaboration rooms under /c (collab.js).
//
// Bindings (wrangler.toml): SHAREBOX, ROOMS, LIMITS (Durable Objects). Optional
// vars: UPLOAD_KEY and/or GOOGLE_CLIENT_ID + ALLOWED (who can upload or open
// rooms, see authorize()), MAX_MB (default 30), ALLOW_ORIGIN (default *).

import { handleCollab, CollabRoom } from './collab.js';
import { ShareBox, Limits, takeQuota } from './store.js';
import { verifyGoogleToken, resetCerts } from './auth.js';
import { handleApi, Account, Budget, DesktopLink } from './api.js';
import { CloudDoc } from './docs.js';
export { CollabRoom, ShareBox, Limits, Account, Budget, DesktopLink, CloudDoc, verifyGoogleToken, resetCerts };

const box = (env, id) => env.SHAREBOX.get(env.SHAREBOX.idFromName(id));
// Who counts for the daily limits: the Google account, else the key, else the address.
export const whoKey = (who, req) => who.email || (who.key ? 'key' : 'ip:' + (req.headers.get('CF-Connecting-IP') || '?'));

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));


// Who may upload a share or open a collaboration room:
// - whoever sends the upload key (X-Upload-Key), if UPLOAD_KEY is set;
// - someone signed in to Revela with Google (Authorization: Bearer <access
//   token>), if GOOGLE_CLIENT_ID is set: Google confirms the token was issued
//   to that app, and ALLOWED (optional: "ana@x.org, @school.example") limits
//   which accounts.
// With neither variable set the server is open.
const seen = new Map();                                     // token → { email, until }, a few minutes
export async function authorize(req, env, fetchImpl = fetch) {
  if (!env.UPLOAD_KEY && !env.GOOGLE_CLIENT_ID) return { open: true };
  if (env.UPLOAD_KEY && req.headers.get('X-Upload-Key') === env.UPLOAD_KEY) return { key: true };
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!env.GOOGLE_CLIENT_ID || !tok) return null;
  let who = seen.get(tok);
  if (!who || who.until < Date.now()) {
    const r = await fetchImpl('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(tok)).catch(() => null);
    if (!r || !r.ok) return null;
    const i = await r.json();
    if (i.aud !== env.GOOGLE_CLIENT_ID && i.azp !== env.GOOGLE_CLIENT_ID) return null;
    if (!i.email || String(i.email_verified) !== 'true') return null;
    who = { email: String(i.email).toLowerCase(), until: Date.now() + Math.min(300, +i.expires_in || 300) * 1000 };
    seen.set(tok, who); if (seen.size > 1000) seen.clear();
  }
  const allowed = String(env.ALLOWED || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
  if (allowed.length && !allowed.some(a => (a.startsWith('@') ? who.email.endsWith(a) : who.email === a))) return null;
  return { email: who.email };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Key',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    };
    const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
    // The accounts API (api.js), and the same share and collaboration routes under /api (revelaslides.com/api/…).
    if (/^\/api\/(?!s(\/|$)|c(\/|$))/.test(url.pathname)) return handleApi(req, env, url);
    if (/^\/api\/(s|c)(\/|$)/.test(url.pathname)) url.pathname = url.pathname.slice(4);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: cors });
    if (url.pathname === '/c' || url.pathname.startsWith('/c/')) return handleCollab(req, env, url, json);

    if (req.method === 'POST' && url.pathname === '/s') {
      const who = await authorize(req, env, env.FETCH || fetch);
      if (!who) return json({ error: 'forbidden' }, 403);
      const max = (+env.MAX_MB || 30) * 1024 * 1024;
      if (+(req.headers.get('Content-Length') || 0) > max) return json({ error: 'too large' }, 413);
      const body = await req.text();
      if (body.length > max) return json({ error: 'too large' }, 413);
      let env0; try { env0 = JSON.parse(body); } catch { return json({ error: 'not json' }, 400); }
      if (!env0 || env0.revelaSealed !== 1 || typeof env0.data !== 'string') return json({ error: 'not a sealed presentation' }, 400);
      const days = Math.min(3650, Math.max(0, +url.searchParams.get('days') || 0));
      const domain = (url.searchParams.get('domain') || '').toLowerCase().replace(/^@/, ''), clientId = url.searchParams.get('clientId') || '';
      if (domain && (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || !clientId)) return json({ error: 'domain needs a Google client id' }, 400);
      if (!(await takeQuota(env, whoKey(who, req)))) return json({ error: 'daily limit' }, 429);
      const id = random(16), token = random(24);
      await box(env, id).fetch('https://box/init', { method: 'POST', body: JSON.stringify({ body,
        meta: { token: await sha256(token), ...(days && { expires: Date.now() + days * 864e5 }), ...(domain && { domain, clientId }) } }) });
      return json({ id, token });
    }

    const m = url.pathname.match(/^\/s\/([\w-]{16,40})(\/stats)?$/);
    if (m) {
      const owner = async () => { const tk = (req.headers.get('Authorization') || '').replace(/^Bearer /, ''); return tk ? sha256(tk) : ''; };
      const pass = async (op, headers = {}) => box(env, m[1]).fetch('https://box/' + op, { method: 'POST', headers });
      if (m[2] && req.method === 'GET') { const r = await pass('stats', { 'X-Owner-Token': await owner() }); return json(await r.json(), r.status); }
      if (!m[2] && req.method === 'DELETE') { const r = await pass('delete', { 'X-Owner-Token': await owner() }); return json(await r.json(), r.status === 404 ? 200 : r.status); }
      if (!m[2] && req.method === 'GET') {
        let r = await pass('read');
        if (r.status === 401) {                                  // limited to a domain: needs a Google ID token of that domain
          const need = await r.json(), idt = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
          const who = idt && await verifyGoogleToken(idt, need.clientId, env.FETCH || fetch).catch(() => null);
          const inDomain = who && who.email_verified && (who.hd === need.domain || String(who.email).toLowerCase().endsWith('@' + need.domain));
          if (!inDomain) return json(need, 401, { 'Cache-Control': 'no-store' });
          r = await pass('read', { 'X-Domain-Ok': '1' });
        }
        if (!r.ok) return json(await r.json(), r.status);
        return new Response(r.body, { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': r.headers.get('X-Domain') ? 'no-store' : 'private, max-age=60' } });
      }
    }
    return new Response('Revela share server', { headers: { ...cors, 'Content-Type': 'text/plain' } });
  },
};
