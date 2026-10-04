// Administration (admin.revelaslides.com/api/admin/…): the users directory, credits
// and plan adjustments, blocking an account, the support tickets and an audit log.
// The admin's own pages live in a separate, private repository; this is only the API.
//
// OFF unless configured. It answers only when all of these plain vars are set (else 404):
//   ACCESS_TEAM    the Cloudflare Zero Trust team name (<team>.cloudflareaccess.com)
//   ACCESS_AUD     the Access application's AUD tag
//   ADMIN_EMAILS   who may use it ("ana@x.org, luis@x.org")
//   ADMIN_HOST     (optional) the admin host, default admin.revelaslides.com
// and only on the admin host, behind a Cloudflare Access application. Access asks who you
// are (and keeps everybody else out), but this Worker does not trust it blindly: each
// request's Access token (header Cf-Access-Jwt-Assertion) is checked here — RS256 signature
// with the team's keys, audience, issuer, expiry — and its email must be in ADMIN_EMAILS.
// Requests must also carry X-Revela-Admin: 1 and, for changes, come from the admin page
// itself (Origin), so another site can't use the Access cookie (CSRF).
//
//   GET  /api/admin/whoami                 → { email }
//   GET  /api/admin/stats                  → { users, pro, blocked, ai: { month, usd, limit }, tickets: { open, pending, closed } }
//   GET  /api/admin/users?q=&cursor=       → { users, cursor }   (q: email prefix or Google sub; none: most recently seen)
//   GET  /api/admin/users/:sub             → the account: profile, plan, credits and lots, ledger, sessions, docs, team
//   POST /api/admin/credits                { sub, delta, reason, expiresDays?, notify? }   (ledger kind 'admin')
//   POST /api/admin/refund                 { sub, reason? , notify? }   (gives back the last AI charge not refunded yet)
//   POST /api/admin/plan                   { sub, until (ms, 0 = remove), reason }   (Pro given by hand; Stripe's untouched)
//   POST /api/admin/block                  { sub, blocked, reason }   (blocked: 403 on AI, cloud documents, calls…)
//   GET  /api/admin/tickets?status=&cursor= → { tickets, cursor }
//   GET  /api/admin/tickets/:id            → the ticket (thread, notes)
//   GET  /api/admin/tickets/:id/attachment → the attached presentation (JSON)
//   POST /api/admin/tickets/:id/status     { status: open | pending | closed }
//   POST /api/admin/tickets/:id/note       { text }   (internal)
//   POST /api/admin/tickets/:id/reply      { text, status? }   (emailed to the person; in the thread)
//   GET  /api/admin/audit?cursor=&target=  → { entries, cursor }
//
// Every change is written first to the audit log (Audit: who, when, what, before and after),
// which has no way to edit or delete entries.
//
// Directory: accounts are Durable Objects keyed by Google sub, which can't be listed. Each
// account tells Directory about itself when it signs in, is used, changes plan or credits, and
// when it is deleted. Accounts that haven't been used since this was deployed aren't listed
// until they next sign in (there is no way to find them before).
//
// Tickets (POST /api/support, in api.js → createTicket): from the app's «Informar de un problema»,
// signed in or with an email address; limited per address (IP) and per day (Limits).

import { acct, call, settings } from './api.js';
import { mail } from './mail.js';
import { fromB64url } from './auth.js';
import { takeQuota, writeText, readParts } from './store.js';
import { teamStatus } from './teams.js';

const enc = new TextEncoder(), dec = new TextDecoder();
const pad = n => String(n).padStart(10, '0');
const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/;
export const STATUSES = ['open', 'pending', 'closed'];
export const CATEGORIES = ['bug', 'ai', 'billing', 'account', 'cloud', 'other'];
export const CHARGES = ['ai', 'image', 'speech', 'model3d'];           // (ledger kinds that are AI charges: refundable)
const clip = (s, n) => String(s ?? '').replace(/\r/g, '').slice(0, n);
const stub = (ns, name) => ns.get(ns.idFromName(name));
// Several values, in the order of the keys (missing ones left out).
const getMany = async (st, keys) => { if (!keys.length) return []; const m = await st.get(keys); return keys.map(k => m.get(k)).filter(v => v !== undefined); };

// ---- Configuration ---------------------------------------------------------------------------
export const adminHost = env => String(env.ADMIN_HOST || 'admin.revelaslides.com').toLowerCase();
const emails = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
export const adminConfigured = env => !!(env.ACCESS_TEAM && env.ACCESS_AUD && emails(env).length && /^[a-z0-9-]{1,63}$/i.test(env.ACCESS_TEAM)
  && env.DIRECTORY && env.TICKETS && env.AUDIT);

// ---- Cloudflare Access token (JWT, RS256) ----------------------------------------------------------
// The team's keys are cached for an hour; an unknown key id fetches them again (rotation), at most once a minute.
let certs = { team: '', keys: [], at: 0, tried: 0 };
export const resetAccessCerts = () => { certs = { team: '', keys: [], at: 0, tried: 0 }; };
async function teamKeys(team, fetchImpl, kid) {
  const now = Date.now(), stale = certs.team !== team || now - certs.at > 3600e3, missing = !certs.keys.some(k => k.kid === kid);
  if (stale || (missing && now - certs.tried > 60e3)) {
    certs.tried = now;
    const r = await fetchImpl(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`).catch(() => null);
    const d = r && r.ok ? await r.json().catch(() => null) : null;
    if (d && Array.isArray(d.keys)) certs = { team, keys: d.keys, at: now, tried: now };
  }
  return certs.team === team ? certs.keys : [];
}
// → { email } of an allowed admin, or null.
export async function verifyAccess(jwt, env, fetchImpl = fetch, now = Date.now()) {
  if (!adminConfigured(env)) return null;
  const [h, p, sig] = String(jwt || '').split('.'); if (!h || !p || !sig) return null;
  let head, claims; try { head = JSON.parse(dec.decode(fromB64url(h))); claims = JSON.parse(dec.decode(fromB64url(p))); } catch { return null; }
  if (head.alg !== 'RS256' || !head.kid) return null;
  const team = String(env.ACCESS_TEAM).toLowerCase(), jwk = (await teamKeys(team, fetchImpl, head.kid)).find(k => k.kid === head.kid); if (!jwk) return null;
  let ok = false;
  try {
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(sig), enc.encode(h + '.' + p));
  } catch { ok = false; }
  if (!ok) return null;
  const aud = [].concat(claims.aud || []);
  if (!aud.includes(env.ACCESS_AUD) || claims.iss !== `https://${team}.cloudflareaccess.com`) return null;
  if (!(+claims.exp * 1000 > now) || (claims.nbf && +claims.nbf * 1000 > now + 60e3)) return null;
  const email = String(claims.email || '').toLowerCase();
  return email && emails(env).includes(email) ? { email } : null;
}

// ---- Directory: one object for all accounts --------------------------------------------------------
//   'u:' + sub → { sub, email, name, plan, until, credits, created, lastSeen, team, blocked, updated }
//   'e:' + email + '|' + sub → sub          (search by email prefix)
//   's:' + lastSeen + '|' + sub → sub       (the most recently seen first)
export class Directory {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage;
    const seenKey = r => `s:${r.lastSeen || '0000-00-00'}|${r.sub}`, emailKey = r => `e:${String(r.email || '').toLowerCase()}|${r.sub}`;
    if (op === 'upsert') {
      if (!a.sub) return Response.json({ error: 'bad request' }, { status: 400 });
      const old = await st.get('u:' + a.sub), rec = { sub: String(a.sub), email: String(a.email || '').toLowerCase(), name: a.name || null, plan: a.plan || 'free', until: +a.until || 0,
        credits: +a.credits || 0, created: +a.created || null, lastSeen: a.lastSeen || null, team: a.team || null, blocked: !!a.blocked, updated: Date.now() };
      const gone = old ? [emailKey(old), seenKey(old)].filter(k => k !== emailKey(rec) && k !== seenKey(rec)) : [];
      if (gone.length) await st.delete(gone);
      await st.put({ ['u:' + rec.sub]: rec, [emailKey(rec)]: rec.sub, [seenKey(rec)]: rec.sub });
      return Response.json({ ok: true });
    }
    if (op === 'remove') {
      const old = await st.get('u:' + a.sub); if (old) await st.delete(['u:' + old.sub, emailKey(old), seenKey(old)]);
      return Response.json({ ok: true });
    }
    if (op === 'get') return Response.json({ user: (await st.get('u:' + a.sub)) || null });
    if (op === 'search') {                                // { q, cursor, limit } → { users, cursor }
      const limit = Math.min(100, Math.max(1, +a.limit || 50)), q = String(a.q || '').trim().toLowerCase();
      let keys;
      if (q) {
        const exact = (await st.get('u:' + q)) ? [q] : [];
        const m = await st.list({ prefix: 'e:' + q, limit: limit + 1, ...(a.cursor && { startAfter: a.cursor }) });
        keys = [...m]; const subs = [...new Set([...(a.cursor ? [] : exact), ...keys.slice(0, limit).map(([, v]) => v)])];
        const users = await getMany(st, subs.map(s => 'u:' + s));
        return Response.json({ users, cursor: keys.length > limit ? keys[limit - 1][0] : null });
      }
      const m = await st.list({ prefix: 's:', reverse: true, limit: limit + 1, ...(a.cursor && { end: a.cursor }) });
      keys = [...m]; const users = await getMany(st, keys.slice(0, limit).map(([, v]) => 'u:' + v));
      return Response.json({ users, cursor: keys.length > limit ? keys[limit - 1][0] : null });
    }
    if (op === 'stats') {                                 // (a scan of every record: fine for thousands of accounts)
      const now = Date.now(); let users = 0, pro = 0, blocked = 0;
      for (const [, r] of await st.list({ prefix: 'u:' })) { users++; if (r.plan === 'pro' && r.until > now) pro++; if (r.blocked) blocked++; }
      return Response.json({ users, pro, blocked });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}
// An account's record, sent to the Directory (never throws).
export async function directoryUpsert(env, rec) {
  if (!env.DIRECTORY || !rec?.sub) return false;
  try { return (await stub(env.DIRECTORY, 'directory').fetch('https://dir/upsert', { method: 'POST', body: JSON.stringify(rec) })).ok; } catch { return false; }
}
export async function directoryRemove(env, sub) {
  if (!env.DIRECTORY || !sub) return;
  try { await stub(env.DIRECTORY, 'directory').fetch('https://dir/remove', { method: 'POST', body: JSON.stringify({ sub }) }); } catch {}
}

// ---- Audit log: append only --------------------------------------------------------------------------
//   'n' → last number; 'l:' + n → { n, at, by, action, target, reason, before, after }; 't:' + target + '|' + n → n
export class Audit {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage;
    if (op === 'add') {                                   // (there is no op to change or delete an entry)
      const n = ((await st.get('n')) || 0) + 1, target = clip(a.target, 100);
      const e = { n, at: Date.now(), by: clip(a.by, 200), action: clip(a.action, 40), target, reason: clip(a.reason, 1000), before: a.before ?? null, after: a.after ?? null };
      await st.put({ n, ['l:' + pad(n)]: e, ...(target && { [`t:${target}|${pad(n)}`]: n }) });
      return Response.json({ ok: true, n });
    }
    if (op === 'list') {                                  // { cursor, limit, target } → the newest first
      const limit = Math.min(200, Math.max(1, +a.limit || 50));
      if (a.target) {
        const m = [...(await st.list({ prefix: `t:${a.target}|`, reverse: true, limit: limit + 1, ...(a.cursor && { end: a.cursor }) }))];
        const entries = await getMany(st, m.slice(0, limit).map(([, n]) => 'l:' + pad(n)));
        return Response.json({ entries, cursor: m.length > limit ? m[limit - 1][0] : null });
      }
      const m = [...(await st.list({ prefix: 'l:', reverse: true, limit: limit + 1, ...(a.cursor && { end: a.cursor }) }))];
      return Response.json({ entries: m.slice(0, limit).map(([, v]) => v), cursor: m.length > limit ? m[limit - 1][0] : null });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}
const audit = (env, e) => call(stub(env.AUDIT, 'audit'), 'add', e);

// ---- Tickets -------------------------------------------------------------------------------------------
//   'n' → last number (the first is 1001); 't:' + n → the ticket; 'x:' + n → its summary (lists);
//   'i:' + status + '|' + n → n (by status); 'a:' + n + ':' → the attached presentation (store.js parts)
const summary = t => ({ id: t.id, at: t.at, updated: t.updated, status: t.status, email: t.email, sub: t.sub || null, category: t.category,
  subject: clip(t.message, 120).replace(/\s+/g, ' '), deckName: t.deckName || null, attachment: !!t.attachment, replies: t.thread.filter(x => x.from === 'admin').length });
export class Tickets {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async save(t, oldStatus) {
    const st = this.ctx.storage; t.updated = Date.now();
    if (oldStatus && oldStatus !== t.status) await st.delete(`i:${oldStatus}|${pad(t.id)}`);
    await st.put({ ['t:' + pad(t.id)]: t, ['x:' + pad(t.id)]: summary(t), [`i:${t.status}|${pad(t.id)}`]: t.id });
  }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage;
    if (op === 'create') {
      const id = ((await st.get('n')) || 1000) + 1, now = Date.now();
      const t = { id, at: now, status: 'open', email: a.email, sub: a.sub || null, name: a.name || null, lang: a.lang || null, category: a.category, message: a.message,
        version: a.version || '', browser: a.browser || '', deckName: a.deckName || null, attachment: a.attach ? { size: a.attach.length } : null,
        thread: [{ at: now, from: 'user', text: a.message }], notes: [] };
      await st.put('n', id);
      if (a.attach) await writeText(st, `a:${pad(id)}:`, a.attach);
      await this.save(t);
      return Response.json({ ok: true, id });
    }
    if (op === 'list') {                                  // { status, cursor, limit } → the newest first
      const limit = Math.min(100, Math.max(1, +a.limit || 50));
      if (STATUSES.includes(a.status)) {
        const m = [...(await st.list({ prefix: `i:${a.status}|`, reverse: true, limit: limit + 1, ...(a.cursor && { end: a.cursor }) }))];
        const tickets = await getMany(st, m.slice(0, limit).map(([, n]) => 'x:' + pad(n)));
        return Response.json({ tickets, cursor: m.length > limit ? m[limit - 1][0] : null });
      }
      const m = [...(await st.list({ prefix: 'x:', reverse: true, limit: limit + 1, ...(a.cursor && { end: a.cursor }) }))];
      return Response.json({ tickets: m.slice(0, limit).map(([, v]) => v), cursor: m.length > limit ? m[limit - 1][0] : null });
    }
    if (op === 'counts') {
      const c = {}; for (const s of STATUSES) c[s] = (await st.list({ prefix: `i:${s}|` })).size;
      return Response.json(c);
    }
    const t = await st.get('t:' + pad(+a.id || 0)); if (!t) return Response.json({ error: 'not found' }, { status: 404 });
    if (op === 'get') return Response.json({ ticket: t });
    if (op === 'attachment') { const parts = t.attachment ? await readParts(st, `a:${pad(t.id)}:`) : null; return Response.json({ text: parts ? parts.join('') : null }); }
    const before = t.status;
    if (op === 'status') {
      if (!STATUSES.includes(a.status)) return Response.json({ error: 'bad status' }, { status: 400 });
      t.status = a.status; await this.save(t, before); return Response.json({ ok: true, before, after: t.status });
    }
    if (op === 'note') { t.notes.push({ at: Date.now(), by: a.by, text: a.text }); await this.save(t, before); return Response.json({ ok: true, ticket: t }); }
    if (op === 'reply') {
      t.thread.push({ at: Date.now(), from: 'admin', by: a.by, text: a.text, mailed: !!a.mailed });
      if (STATUSES.includes(a.status)) t.status = a.status;
      await this.save(t, before); return Response.json({ ok: true, before, after: t.status, ticket: t });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}

// A problem reported from the app (POST /api/support). me: the session, if any (then its account's email).
//   { message, category, email?, version?, browser?, deckName?, attach? (the deck, only if ticked), lang?, website? (a trap for bots) }
export async function createTicket(req, env, me, body, json) {
  if (!env.TICKETS) return json({ error: 'support not configured' }, 503);
  const message = clip(body.message, 5000).trim(), category = CATEGORIES.includes(body.category) ? body.category : 'other';
  if (message.length < 5) return json({ error: 'message' }, 400);
  if (body.website) return json({ ok: true, id: 0 });                       // (a bot filled the hidden field: nothing is stored)
  let email, name = null, lang = /^[a-z]{2}$/.test(body.lang || '') ? body.lang : null;
  if (me) { const p = await call(acct(env, me.sub), 'me'); email = p.email; name = p.name || null; }
  else { email = String(body.email || '').trim().toLowerCase(); if (!EMAIL.test(email)) return json({ error: 'email' }, 400); }
  let attach = null;
  if (body.attach != null) {
    attach = typeof body.attach === 'string' ? body.attach : JSON.stringify(body.attach);
    if (attach.length > (+env.SUPPORT_ATTACH_KB || 1500) * 1024) return json({ error: 'attachment too large' }, 413);
  }
  // Limits: per address (IP) or account, and per recipient of the acknowledgement (a day each).
  const ip = req.headers.get('CF-Connecting-IP') || '?', per = +env.SUPPORT_PER_DAY || 5;
  if (!(await takeQuota(env, me ? 'support:u:' + me.sub : 'support:ip:' + ip, { per, scope: 'support' }))) return json({ error: 'daily limit' }, 429);
  if (!(await takeQuota(env, 'support:to:' + email, { per, scope: 'support-to' }))) return json({ error: 'daily limit' }, 429);
  const r = await call(stub(env.TICKETS, 'tickets'), 'create', { email, sub: me?.sub || null, name, lang, category, message,
    version: clip(body.version, 60), browser: clip(body.browser, 400), deckName: body.deckName ? clip(body.deckName, 200) : null, attach });
  const mailed = await mail(env, { to: email, kind: 'ticket', lang, vars: { n: r.id } });
  return json({ ok: true, id: r.id, mailed });
}

// ---- The admin API -------------------------------------------------------------------------------------
export async function handleAdmin(req, env, url) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  const host = adminHost(env);
  if (!adminConfigured(env) || url.hostname.toLowerCase() !== host) return new Response('Not found', { status: 404, headers });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method' }, 405);
  if (req.headers.get('X-Revela-Admin') !== '1') return json({ error: 'forbidden' }, 403);
  if (req.method === 'POST' && req.headers.get('Origin') !== 'https://' + host) return json({ error: 'origin' }, 403);
  const who = await verifyAccess(req.headers.get('Cf-Access-Jwt-Assertion'), env, env.FETCH || fetch);
  if (!who) return json({ error: 'forbidden' }, 403);
  let body = {};
  if (req.method === 'POST') {
    const text = await req.text(); if (text.length > 100e3) return json({ error: 'too large' }, 413);
    try { body = JSON.parse(text || '{}'); } catch { body = null; }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'bad request' }, 400);
  }
  const path = url.pathname.replace(/^\/api\/admin/, '') || '/', q = url.searchParams, by = who.email;
  const D = stub(env.DIRECTORY, 'directory'), T = stub(env.TICKETS, 'tickets'), L = stub(env.AUDIT, 'audit');
  const GET = req.method === 'GET', POST = !GET;
  const subOk = s => typeof s === 'string' && /^[\w.-]{1,100}$/.test(s);
  // An account that exists (has a profile), or a 404.
  const account = async sub => { if (!subOk(sub)) return null; const v = await call(acct(env, sub), 'admin-view'); return v.profile?.sub ? v : null; };

  if (GET && path === '/whoami') return json({ email: by });
  if (GET && path === '/stats') {
    const [u, ai, tickets] = await Promise.all([call(D, 'stats'), env.BUDGET ? call(stub(env.BUDGET, 'global'), 'check', { usd: 0 }) : null, call(T, 'counts')]);
    return json({ ...u, ai: ai && { month: new Date().toISOString().slice(0, 7), usd: ai.usd, limit: ai.limit }, tickets });
  }
  if (GET && path === '/users') return json(await call(D, 'search', { q: clip(q.get('q'), 200), cursor: q.get('cursor') || null, limit: +q.get('limit') || 50 }));
  let m = path.match(/^\/users\/([\w.-]{1,100})$/);
  if (GET && m) {
    const v = await account(m[1]); if (!v) return json({ error: 'not found' }, 404);
    const team = v.team ? await teamStatus(env, v.team, v.profile.email).catch(() => null) : null;
    return json({ ...v, team: v.team ? { id: v.team, name: team?.name || null, role: team?.role || null, active: !!team?.active } : null, directory: (await call(D, 'get', { sub: m[1] })).user });
  }
  if (POST && path === '/credits') {
    const delta = Math.round(+body.delta), reason = clip(body.reason, 500).trim(), days = Math.min(3650, Math.max(1, Math.round(+body.expiresDays || settings(env).packDays)));
    if (!Number.isFinite(delta) || !delta || Math.abs(delta) > 1e6 || !reason) return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'admin-credits', { delta, reason, days, by });
    await audit(env, { by, action: 'credits', target: body.sub, reason, before: { credits: r.before }, after: { credits: r.after, delta: r.delta, ...(delta > 0 && { expires: r.expires }) } });
    const mailed = delta > 0 && body.notify ? await call(acct(env, body.sub), 'admin-mail', { kind: 'creditsAdded', n: r.delta, exp: r.expires }) : null;
    return json({ ok: true, ...r, mailed: mailed?.ok ?? false });
  }
  if (POST && path === '/refund') {
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const reason = clip(body.reason, 500).trim() || 'Reembolso del último cobro de IA';
    const r = await call(acct(env, body.sub), 'admin-refund', { reason, by, days: settings(env).packDays });
    if (!r.ok) return json({ error: 'nothing to refund' }, 409);
    await audit(env, { by, action: 'refund', target: body.sub, reason, before: { credits: r.before }, after: { credits: r.after, delta: r.delta, charge: r.charge } });
    const mailed = body.notify ? await call(acct(env, body.sub), 'admin-mail', { kind: 'creditsAdded', n: r.delta, exp: r.expires }) : null;
    return json({ ...r, mailed: mailed?.ok ?? false });
  }
  if (POST && path === '/plan') {
    const until = body.until ? +new Date(typeof body.until === 'number' ? body.until : String(body.until)) : 0, reason = clip(body.reason, 500).trim();
    if (!reason || !Number.isFinite(until) || (until && until < Date.now())) return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'admin-plan', { until, reason, by });
    await audit(env, { by, action: 'plan', target: body.sub, reason, before: r.before, after: r.after });
    return json({ ok: true, ...r });
  }
  if (POST && path === '/block') {
    const reason = clip(body.reason, 500).trim(); if (!reason || typeof body.blocked !== 'boolean') return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'admin-block', { blocked: body.blocked, reason, by });
    await audit(env, { by, action: body.blocked ? 'block' : 'unblock', target: body.sub, reason, before: r.before, after: r.after });
    return json({ ok: true, ...r });
  }
  if (GET && path === '/tickets') return json(await call(T, 'list', { status: q.get('status') || '', cursor: q.get('cursor') || null, limit: +q.get('limit') || 50 }));
  m = path.match(/^\/tickets\/(\d{1,10})(?:\/(attachment|status|note|reply))?$/);
  if (m) {
    const id = +m[1], op = m[2] || '', got = await call(T, 'get', { id }); if (!got.ticket) return json({ error: 'not found' }, 404);
    const t = got.ticket;
    if (GET && !op) return json({ ticket: t });
    if (GET && op === 'attachment') {
      const r = await call(T, 'attachment', { id }); if (!r.text) return json({ error: 'not found' }, 404);
      return new Response(r.text, { headers: { ...headers, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="consulta-${id}.revela.json"` } });
    }
    if (POST && op === 'status') {
      if (!STATUSES.includes(body.status)) return json({ error: 'bad request' }, 400);
      await audit(env, { by, action: 'ticket-status', target: 'ticket:' + id, before: { status: t.status }, after: { status: body.status } });
      return json(await call(T, 'status', { id, status: body.status }));
    }
    if (POST && op === 'note') {
      const text = clip(body.text, 5000).trim(); if (!text) return json({ error: 'bad request' }, 400);
      await audit(env, { by, action: 'ticket-note', target: 'ticket:' + id, after: { note: text } });
      return json(await call(T, 'note', { id, text, by }));
    }
    if (POST && op === 'reply') {
      const text = clip(body.text, 10000).trim(); if (!text) return json({ error: 'bad request' }, 400);
      const status = STATUSES.includes(body.status) ? body.status : 'pending';
      await audit(env, { by, action: 'ticket-reply', target: 'ticket:' + id, before: { status: t.status }, after: { status, reply: text } });
      const mailed = await mail(env, { to: t.email, kind: 'ticketReply', lang: t.lang, vars: { n: id, text } });
      return json({ ...(await call(T, 'reply', { id, text, by, status, mailed })), mailed });
    }
  }
  if (GET && path === '/audit') return json(await call(L, 'list', { cursor: q.get('cursor') || null, target: clip(q.get('target'), 100) || null, limit: +q.get('limit') || 50 }));
  return json({ error: 'not found' }, 404);
}
