// Revela share server (Cloudflare Worker + R2): stores sealed presentations.
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
// Bindings (wrangler.toml): SHARES (R2 bucket), ROOMS (Durable Object). Optional
// vars: UPLOAD_KEY and/or GOOGLE_CLIENT_ID + ALLOWED (who can upload or open
// rooms, see authorize()), MAX_MB (default 30), ALLOW_ORIGIN (default *).

import { handleCollab, CollabRoom } from './collab.js';
export { CollabRoom };

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));

// Google ID token (JWT, RS256) → its claims, if the signature, issuer,
// audience and expiry are right. Google's public keys are cached for an hour.
let certs = null, certsAt = 0;
export async function verifyGoogleToken(jwt, clientId, fetchImpl = fetch) {
  const [h, p, sig] = String(jwt || '').split('.'); if (!sig) return null;
  const head = JSON.parse(new TextDecoder().decode(fromB64url(h))), claims = JSON.parse(new TextDecoder().decode(fromB64url(p)));
  if (!certs || Date.now() - certsAt > 3600e3) { certs = (await (await fetchImpl('https://www.googleapis.com/oauth2/v3/certs')).json()).keys; certsAt = Date.now(); }
  const jwk = certs.find(k => k.kid === head.kid); if (!jwk || head.alg !== 'RS256') return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(sig), new TextEncoder().encode(h + '.' + p));
  if (!ok || claims.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.exp * 1000 < Date.now()) return null;
  return claims;
}
export const resetCerts = () => { certs = null; };

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
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: cors });
    if (url.pathname === '/c' || url.pathname.startsWith('/c/')) return handleCollab(req, env, url, json);

    if (req.method === 'POST' && url.pathname === '/s') {
      if (!(await authorize(req, env, env.FETCH || fetch))) return json({ error: 'forbidden' }, 403);
      const max = (+env.MAX_MB || 30) * 1024 * 1024;
      if (+(req.headers.get('Content-Length') || 0) > max) return json({ error: 'too large' }, 413);
      const body = await req.text();
      if (body.length > max) return json({ error: 'too large' }, 413);
      let env0; try { env0 = JSON.parse(body); } catch { return json({ error: 'not json' }, 400); }
      if (!env0 || env0.revelaSealed !== 1 || typeof env0.data !== 'string') return json({ error: 'not a sealed presentation' }, 400);
      const days = Math.min(3650, Math.max(0, +url.searchParams.get('days') || 0));
      const domain = (url.searchParams.get('domain') || '').toLowerCase().replace(/^@/, ''), clientId = url.searchParams.get('clientId') || '';
      if (domain && (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || !clientId)) return json({ error: 'domain needs a Google client id' }, 400);
      const id = random(16), token = random(24);
      await env.SHARES.put(id, body, { httpMetadata: { contentType: 'application/json' },
        customMetadata: { token: await sha256(token), ...(days && { expires: String(Date.now() + days * 864e5) }), ...(domain && { domain, clientId }) } });
      return json({ id, token });
    }

    const st = url.pathname.match(/^\/s\/([\w-]{16,40})\/stats$/);
    if (st && req.method === 'GET') {
      const obj = await env.SHARES.head(st[1]);
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
      if (!obj || !token || (await sha256(token)) !== obj.customMetadata?.token) return json({ error: 'forbidden' }, 403);
      const s = await env.SHARES.get('stats/' + st[1]);
      return json(s ? await s.json() : { views: 0, last: null });
    }

    const m = url.pathname.match(/^\/s\/([\w-]{16,40})$/);
    if (m && req.method === 'GET') {
      const obj = await env.SHARES.get(m[1]);
      if (!obj) return json({ error: 'not found' }, 404);
      const meta = obj.customMetadata || {};
      if (meta.expires && Date.now() > +meta.expires) { await env.SHARES.delete(m[1]); await env.SHARES.delete('stats/' + m[1]); return json({ error: 'not found' }, 404); }
      if (meta.domain) {
        const idt = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
        const who = idt && await verifyGoogleToken(idt, meta.clientId, env.FETCH || fetch).catch(() => null);
        const inDomain = who && who.email_verified && (who.hd === meta.domain || String(who.email).toLowerCase().endsWith('@' + meta.domain));
        if (!inDomain) return json({ signIn: true, domain: meta.domain, clientId: meta.clientId }, 401, { 'Cache-Control': 'no-store' });
      }
      // A counter and the last date, nothing about the viewer.
      const s = await env.SHARES.get('stats/' + m[1]), prev = s ? await s.json() : { views: 0 };
      await env.SHARES.put('stats/' + m[1], JSON.stringify({ views: (prev.views || 0) + 1, last: new Date().toISOString() }));
      return new Response(obj.body, { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': meta.domain ? 'no-store' : 'private, max-age=60' } });
    }
    if (m && req.method === 'DELETE') {
      const obj = await env.SHARES.head(m[1]);
      if (!obj) return json({ ok: true });
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
      if (!token || (await sha256(token)) !== obj.customMetadata?.token) return json({ error: 'forbidden' }, 403);
      await env.SHARES.delete(m[1]); await env.SHARES.delete('stats/' + m[1]);
      return json({ ok: true });
    }
    return new Response('Revela share server', { headers: { ...cors, 'Content-Type': 'text/plain' } });
  },
};
