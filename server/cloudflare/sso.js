// Single sign-on for teams (slides.com's and Pitch's «SSO»): a school or a company signs in with its own identity
// provider — Microsoft Entra ID, Okta, Google Workspace, Keycloak… any OpenID Connect one — instead of Google.
// The team's admin enters its provider (issuer, client id and secret, registered there with Revela's return
// address) and its email domains; each domain is proved theirs with a DNS TXT record before it counts, and public
// mail domains (gmail.com…) can't be claimed. Then anyone who enters an address of that domain on the sign-in
// screen goes to the provider; what comes back is checked here (the code exchanged with the secret, PKCE, the
// ID token's signature against the provider's keys, its issuer, audience, nonce and expiry, and an address of the
// team's domains) and opens a Revela account of its own (sub «sso:…», shares by email as any other), joining the
// team if the admin chose so and there are seats.
//
//   GET  /api/team/sso                  → { sso: { issuer, clientId, domains: [{ domain, verified, token }], autoJoin, hasSecret }, redirect }  (admin)
//   POST /api/team/sso                  { issuer, clientId, clientSecret?, domains: [..], autoJoin } → the same          (admin)
//   POST /api/team/sso/verify           { domain } → { verified }   (looks for TXT «revela-verify=<token>» at the domain)
//   POST /api/team/sso/delete           → { ok }
//   GET  /api/sso/start?email=&terms=&lang=   → 302 to the provider (or back to /app/?sso=none)
//   GET  /api/sso/callback?code=&state=       → 302 to /app/?sso=ok with the session cookie (or ?sso=<error>)
//
// Storage: in the Team (Durable Object) 'sso' { issuer, clientId, clientSecret, domains: { d: { token, verified } },
// autoJoin } — the secret never leaves the server —; and in the registry (a Team object named 'sso-domains'):
// 'd:<domain>' → team id, for verified domains only.

import { enc, b64url, unb64, random, sha256, hmac, fromB64url } from './util.js';

export const PUBLIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.es', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.es',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.es', 'gmx.de', 'web.de', 'mail.com', 'zoho.com', 'yandex.com', 'qq.com', '163.com', 'telefonica.net']);
const DOMAIN = /^(?=.{3,190}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const STATE_MINUTES = 10;
const site = env => env.SITE_URL || 'https://revelaslides.com';
export const ssoRedirect = env => site(env) + '/api/sso/callback';
const registry = env => env.TEAMS.get(env.TEAMS.idFromName('sso-domains'));
const teamOf = (env, id) => env.TEAMS.get(env.TEAMS.idFromName('team:' + id));
const ask = async (stub, op, body) => { const r = await stub.fetch('https://team/' + op, { method: 'POST', body: JSON.stringify(body || {}) }); return { status: r.status, data: await r.json() }; };

// ---- In the Team object (teams.js calls this for the ops sso-*) -----------------------------------------
export async function ssoOp(st, t, op, a, admin) {
  const view = s => s && { issuer: s.issuer, clientId: s.clientId, autoJoin: !!s.autoJoin, hasSecret: !!s.clientSecret,
    domains: Object.entries(s.domains || {}).map(([domain, d]) => ({ domain, verified: !!d.verified, token: d.token })) };
  const s = await st.get('sso');
  switch (op) {
    case 'sso-get': return admin ? { sso: view(s) || null } : { error: 'forbidden', status: 403 };
    case 'sso-set': {
      if (!admin) return { error: 'forbidden', status: 403 };
      let iss; try { iss = new URL(String(a.issuer || '')); } catch { return { error: 'issuer', status: 400 }; }
      if (iss.protocol !== 'https:') return { error: 'issuer', status: 400 };
      const clientId = String(a.clientId || '').trim().slice(0, 200); if (!clientId) return { error: 'client id', status: 400 };
      const doms = [...new Set((Array.isArray(a.domains) ? a.domains : []).map(d => String(d).trim().toLowerCase().replace(/^@/, '')))].slice(0, 10);
      if (!doms.length || doms.some(d => !DOMAIN.test(d))) return { error: 'domains', status: 400 };
      if (doms.some(d => PUBLIC_DOMAINS.has(d))) return { error: 'public domain', status: 400 };
      const before = s?.domains || {}, domains = Object.fromEntries(doms.map(d => [d, before[d] || { token: random(12), verified: false }]));
      const next = { issuer: iss.href.replace(/\/$/, ''), clientId, clientSecret: typeof a.clientSecret === 'string' && a.clientSecret ? a.clientSecret.slice(0, 500) : s?.clientSecret || '',
        domains, autoJoin: !!a.autoJoin };
      await st.put('sso', next);
      return { sso: view(next), dropped: Object.keys(before).filter(d => !domains[d] && before[d].verified) };
    }
    case 'sso-verified': {                               // { domain } (the worker checked the DNS)
      if (!admin || !s?.domains?.[a.domain]) return { error: 'forbidden', status: 403 };
      s.domains[a.domain].verified = true; await st.put('sso', s); return { sso: view(s) };
    }
    case 'sso-delete': { if (!admin) return { error: 'forbidden', status: 403 }; await st.delete('sso'); return { ok: true, dropped: Object.keys(s?.domains || {}) }; }
    case 'sso-config': return s ? { sso: s, team: t.id } : { error: 'not found', status: 404 };   // (the worker, to sign someone in)
    case 'sso-join': {                                   // { email, sub }: one more member, within the seats
      if (t.members[a.email]) return { ok: true, already: true };
      if (Object.keys(t.members).length + Object.keys(t.invited).length >= Math.max(1, t.seats)) return { ok: false, full: true };
      t.members[a.email] = { role: 'member', joined: Date.now(), sub: a.sub, sso: true }; await st.put('team', t);
      return { ok: true };
    }
  }
  return null;
}
// The registry of verified domains (a Team object named 'sso-domains', before it has a team).
export async function registryOp(st, op, a) {
  if (op === 'domain-get') return { team: (await st.get('d:' + a.domain)) || null };
  if (op === 'domain-set') { const cur = await st.get('d:' + a.domain); if (cur && cur !== a.team) return { error: 'taken' }; await st.put('d:' + a.domain, a.team); return { ok: true }; }
  if (op === 'domain-drop') { if ((await st.get('d:' + a.domain)) === a.team) await st.delete('d:' + a.domain); return { ok: true }; }
  return null;
}

// ---- The admin's routes (teams.js) ------------------------------------------------------------------------
export async function handleTeamSso(path, req, body, env, me, teamId, json) {
  const T = teamOf(env, teamId), pass = r => json(r.data, r.status);
  if (path === '/team/sso' && req.method === 'GET') { const r = await ask(T, 'sso-get', { email: me.email }); return r.status === 200 ? json({ ...r.data, redirect: ssoRedirect(env) }) : pass(r); }
  if (path === '/team/sso' && req.method === 'POST') {
    const r = await ask(T, 'sso-set', { email: me.email, issuer: body.issuer, clientId: body.clientId, clientSecret: body.clientSecret, domains: body.domains, autoJoin: body.autoJoin });
    if (r.status !== 200) return pass(r);
    for (const d of r.data.dropped || []) await ask(registry(env), 'domain-drop', { domain: d, team: teamId });
    return json({ sso: r.data.sso, redirect: ssoRedirect(env) });
  }
  if (path === '/team/sso/verify' && req.method === 'POST') {
    const domain = String(body.domain || '').toLowerCase(), g = await ask(T, 'sso-get', { email: me.email });
    if (g.status !== 200) return pass(g);
    const d = g.data.sso?.domains.find(x => x.domain === domain); if (!d) return json({ error: 'not found' }, 404);
    if (!(await hasTxt(env, domain, 'revela-verify=' + d.token))) return json({ verified: false });
    const taken = await ask(registry(env), 'domain-set', { domain, team: teamId });
    if (taken.data.error) return json({ error: 'domain taken' }, 409);
    await ask(T, 'sso-verified', { email: me.email, domain });
    return json({ verified: true });
  }
  if (path === '/team/sso/delete' && req.method === 'POST') {
    const r = await ask(T, 'sso-delete', { email: me.email }); if (r.status !== 200) return pass(r);
    for (const d of r.data.dropped || []) await ask(registry(env), 'domain-drop', { domain: d, team: teamId });
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}
// A TXT record, through Cloudflare's DNS over HTTPS.
async function hasTxt(env, domain, want) {
  const r = await (env.FETCH || fetch)('https://cloudflare-dns.com/dns-query?' + new URLSearchParams({ name: domain, type: 'TXT' }), { headers: { Accept: 'application/dns-json' } }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  return !!j?.Answer?.some(x => String(x.data || '').replace(/"\s*"/g, '').replace(/^"|"$/g, '') === want);
}

// ---- Signing in -----------------------------------------------------------------------------------------
async function sign(env, obj) { const body = b64url(enc.encode(JSON.stringify(obj))); return `${body}.${await hmac(env.MAIL_SECRET || '', 'sso:' + body)}`; }
async function unsign(env, t) { const [b, s] = String(t || '').split('.'); if (!b || !s || !env.MAIL_SECRET || (await hmac(env.MAIL_SECRET, 'sso:' + b)) !== s) return null; try { return JSON.parse(unb64(b)); } catch { return null; } }
const discovery = new Map();
async function discover(env, issuer) {
  const c = discovery.get(issuer); if (c && Date.now() - c.at < 3600e3) return c.d;
  const r = await (env.FETCH || fetch)(issuer + '/.well-known/openid-configuration').catch(() => null);
  const d = r?.ok ? await r.json().catch(() => null) : null;
  if (!d?.authorization_endpoint || !d.token_endpoint || !d.jwks_uri) return null;
  discovery.set(issuer, { d, at: Date.now() }); return d;
}
// An ID token's claims, if signed by one of the provider's keys (RS256) and meant for this client.
export async function verifyIdToken(env, jwt, { jwksUri, issuer, clientId, nonce }) {
  const [h, p, sig] = String(jwt || '').split('.'); if (!sig) return null;
  let head, claims; try { head = JSON.parse(new TextDecoder().decode(fromB64url(h))); claims = JSON.parse(new TextDecoder().decode(fromB64url(p))); } catch { return null; }
  if (head.alg !== 'RS256') return null;
  const keys = (await (await (env.FETCH || fetch)(jwksUri)).json().catch(() => ({}))).keys || [];
  const jwk = keys.find(k => k.kid === head.kid) || (keys.length === 1 ? keys[0] : null); if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(sig), enc.encode(h + '.' + p)))) return null;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  // (Microsoft's «common» issuers carry the tenant in the token: {tenantid} stands for it.)
  const issOk = claims.iss === issuer || (issuer.includes('{tenantid}') && claims.tid && claims.iss === issuer.replace('{tenantid}', claims.tid));
  if (!issOk || !aud.includes(clientId) || claims.nonce !== nonce || !(claims.exp * 1000 > Date.now())) return null;
  return claims;
}
const back = (env, what) => Response.redirect(`${site(env)}/app/?sso=${what}`, 302);

export async function ssoStart(env, url) {
  if (!env.MAIL_SECRET) return back(env, 'provider');                 // (its state is signed with MAIL_SECRET)
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase(), domain = email.split('@')[1] || '';
  if (!DOMAIN.test(domain) || !env.TEAMS) return back(env, 'none');
  const team = (await ask(registry(env), 'domain-get', { domain })).data.team; if (!team) return back(env, 'none');
  const c = await ask(teamOf(env, team), 'sso-config', {}); const s = c.data.sso;
  if (c.status !== 200 || !s?.domains?.[domain]?.verified || !s.clientSecret) return back(env, 'none');
  const d = await discover(env, s.issuer); if (!d) return back(env, 'provider');
  const verifier = random(32), nonce = random(16);
  const state = await sign(env, { team, v: verifier, n: nonce, terms: String(url.searchParams.get('terms') || '').slice(0, 20), lang: String(url.searchParams.get('lang') || '').slice(0, 5), x: Date.now() + STATE_MINUTES * 6e4 });
  const u = new URL(d.authorization_endpoint);
  for (const [k, v] of Object.entries({ response_type: 'code', client_id: s.clientId, redirect_uri: ssoRedirect(env), scope: 'openid email profile', state, nonce,
    code_challenge: b64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier))), code_challenge_method: 'S256', login_hint: email })) u.searchParams.set(k, v);
  return Response.redirect(u.href, 302);
}

// The provider's answer → { sub, email, name, team, autoJoin, terms, lang } or { error }.
export async function ssoCallback(env, url) {
  const st = await unsign(env, url.searchParams.get('state'));
  if (!st || st.x < Date.now()) return { error: 'expired' };
  if (url.searchParams.get('error')) return { error: 'denied' };
  const c = await ask(teamOf(env, st.team), 'sso-config', {}); const s = c.data.sso; if (!s) return { error: 'none' };
  const d = await discover(env, s.issuer); if (!d) return { error: 'provider' };
  const r = await (env.FETCH || fetch)(d.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: String(url.searchParams.get('code') || ''), redirect_uri: ssoRedirect(env), client_id: s.clientId, client_secret: s.clientSecret, code_verifier: st.v }) }).catch(() => null);
  const tok = r?.ok ? await r.json().catch(() => null) : null; if (!tok?.id_token) return { error: 'provider' };
  const claims = await verifyIdToken(env, tok.id_token, { jwksUri: d.jwks_uri, issuer: d.issuer || s.issuer, clientId: s.clientId, nonce: st.n });
  if (!claims?.sub) return { error: 'token' };
  const email = String(claims.email || claims.preferred_username || claims.upn || '').trim().toLowerCase(), domain = email.split('@')[1] || '';
  if (claims.email_verified === false || !s.domains?.[domain]?.verified) return { error: 'domain' };
  return { sub: 'sso:' + (await sha256(claims.iss + '|' + claims.sub)).slice(0, 32), email, name: typeof claims.name === 'string' ? claims.name.replace(/[<>\r\n]/g, '').slice(0, 80) : null,
    team: st.team, autoJoin: !!s.autoJoin, terms: st.terms, lang: st.lang };
}
export const ssoJoin = (env, team, email, sub) => ask(teamOf(env, team), 'sso-join', { email, sub });
