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
//   GET  /api/admin/stats                  → { users, pro, blocked, ai: { month, usd, limit }, tickets: { open, waiting, closed } }
//   GET  /api/admin/users?q=&cursor=       → { users, cursor }   (q: email prefix or Google sub; none: most recently seen)
//   GET  /api/admin/users/:sub             → the account: profile, plan, credits and lots, ledger, sessions, docs, team
//   POST /api/admin/credits                { sub, delta, reason, expiresDays?, notify? }   (ledger kind 'admin')
//   POST /api/admin/refund                 { sub, reason? , notify? }   (gives back the last AI charge not refunded yet)
//   POST /api/admin/plan                   { sub, until (ms, 0 = remove), reason }   (Pro given by hand; Stripe's untouched)
//   POST /api/admin/block                  { sub, blocked, reason }   (blocked: 403 on AI, cloud documents, calls…)
//   GET  /api/admin/tickets?status=&cursor= → { tickets, cursor }   (open, waiting, closed; in each, the latest activity first)
//   GET  /api/admin/tickets/:id            → the ticket (thread, notes)
//   GET  /api/admin/tickets/:id/attachment → the attached presentation (JSON)
//   POST /api/admin/tickets/:id/status     { status: open | waiting | closed }   ('pending', the old name of 'waiting', also)
//   POST /api/admin/tickets/:id/note       { text }   (internal)
//   POST /api/admin/tickets/:id/reply      { text, status?: waiting (default) | closed | open }   (emailed to the person, with
//                                          the signed link to answer in the same ticket; in the thread)
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
// signed in or with an email address; limited per address (IP) and per day (Limits). Their emails
// carry a signed link (mail.js) to a page where the person answers in the same ticket or marks it
// solved (GET|POST /api/support/reply → supportReply): that opens it again (or closes it) and emails
// the admin (SUPPORT_NOTIFY, else the first of ADMIN_EMAILS). The daily cron reminds once and then
// closes tickets left waiting for the person (ticketsDue: SUPPORT_REMIND_DAYS, SUPPORT_AUTOCLOSE_DAYS).

import { acct, call, settings } from './api.js';
import { mail, mailConfigured, ticketLink, readTicketToken, ticketPage, fmtDate, TICKET_LINK_DAYS } from './mail.js';
import { fromB64url } from './auth.js';
import { takeQuota, writeText, readParts } from './store.js';
import { teamStatus } from './teams.js';

const enc = new TextEncoder(), dec = new TextDecoder();
const pad = n => String(n).padStart(10, '0');
const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/;
export const STATUSES = ['open', 'waiting', 'closed'];   // (see Tickets)
export const statusOf = s => (s === 'pending' ? 'waiting' : STATUSES.includes(s) ? s : null);
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
// Statuses: 'open' (new, or the person wrote: our turn), 'waiting' (we answered: theirs), 'closed' (solved).
// 'pending' (before 'waiting') is read as 'waiting'; stored ones are moved once (migrate()).
//   'n' → last number (the first is 1001); 't:' + n → the ticket; 'x:' + n → its summary (lists);
//   'i:' + status + '|' + last activity + '|' + n → n (by status, latest activity last); 'a:' + n + ':' → the attached presentation (store.js parts)
//   'v' → storage version (2: that index)
// A ticket: { id, at, updated, status, email, sub, name, lang, category, message, …, thread: [{ at, from: 'user' | 'admin', text, by?, mailed?, solved? }],
//   notes: [{ at, by, text }], last: who wrote last ('user' | 'admin'), lastAt, waitingSince, reminded, ix: its index key }
const DAY = 864e5;
const tsKey = n => String(Math.floor(+n || 0)).padStart(15, '0');
const summary = t => ({ id: t.id, at: t.at, updated: t.updated, status: t.status, email: t.email, sub: t.sub || null, category: t.category,
  subject: clip(t.message, 120).replace(/\s+/g, ' '), deckName: t.deckName || null, attachment: !!t.attachment, replies: t.thread.filter(x => x.from === 'admin').length,
  last: t.last, lastAt: t.lastAt });
export class Tickets {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async save(t, { keep } = {}) {
    const st = this.ctx.storage; if (!keep) t.updated = Date.now();
    t.status = statusOf(t.status) || 'open';
    const m = t.thread.at(-1); t.last ??= m?.from || 'user'; t.lastAt ??= m?.at || t.at;
    const ix = `i:${t.status}|${tsKey(t.lastAt)}|${pad(t.id)}`;
    if (t.ix && t.ix !== ix) await st.delete(t.ix);
    t.ix = ix;
    await st.put({ ['t:' + pad(t.id)]: t, ['x:' + pad(t.id)]: summary(t), [ix]: t.id });
  }
  // Once: the index by last activity (instead of by number), 'pending' → 'waiting', who wrote last.
  async migrate() {
    const st = this.ctx.storage; if ((await st.get('v')) >= 2) return;
    const old = [...(await st.list({ prefix: 'i:' })).keys()];
    for (let i = 0; i < old.length; i += 128) await st.delete(old.slice(i, i + 128));
    for (const [, t] of await st.list({ prefix: 't:' })) {
      delete t.ix;
      if (t.status === 'pending' && !t.waitingSince) t.waitingSince = t.lastAt || t.thread.at(-1)?.at || t.updated || t.at;
      await this.save(t, { keep: true });
    }
    await st.put('v', 2);
  }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage;
    await this.migrate();
    if (op === 'create') {
      const id = ((await st.get('n')) || 1000) + 1, now = Date.now();
      const t = { id, at: now, status: 'open', email: a.email, sub: a.sub || null, name: a.name || null, lang: a.lang || null, category: a.category, message: a.message,
        version: a.version || '', browser: a.browser || '', deckName: a.deckName || null, attachment: a.attach ? { size: a.attach.length } : null,
        thread: [{ at: now, from: 'user', text: a.message }], notes: [], last: 'user', lastAt: now };
      await st.put('n', id);
      if (a.attach) await writeText(st, `a:${pad(id)}:`, a.attach);
      await this.save(t);
      return Response.json({ ok: true, id });
    }
    if (op === 'list') {                                  // { status, cursor, limit } → open, waiting, closed; in each, the latest activity first
      const limit = Math.min(100, Math.max(1, +a.limit || 50)), only = statusOf(a.status), order = only ? [only] : STATUSES, cur = String(a.cursor || ''), got = [];
      for (let i = Math.max(0, cur ? order.findIndex(s => cur.startsWith(`i:${s}|`)) : 0); i < order.length && got.length <= limit; i++) {
        const end = cur.startsWith(`i:${order[i]}|`) ? cur : null;
        got.push(...(await st.list({ prefix: `i:${order[i]}|`, reverse: true, limit: limit + 1 - got.length, ...(end && { end }) })));
      }
      const page = got.slice(0, limit);
      return Response.json({ tickets: await getMany(st, page.map(([, n]) => 'x:' + pad(n))), cursor: got.length > limit ? page.at(-1)[0] : null });
    }
    if (op === 'counts') {
      const c = {}; for (const s of STATUSES) c[s] = (await st.list({ prefix: `i:${s}|` })).size;
      return Response.json(c);
    }
    if (op === 'due') {                                   // { now, remind, close } (ms; 0: never) → { items: [{ kind: 'remind' | 'close', id, email, lang, since, closeAt }] }
      const items = [];
      for (const [, n] of await st.list({ prefix: 'i:waiting|' })) {
        const t = await st.get('t:' + pad(n)); if (!t || t.status !== 'waiting') continue;
        const since = t.waitingSince || t.lastAt || t.at, age = a.now - since, item = { id: t.id, email: t.email, lang: t.lang, since, closeAt: a.close ? since + a.close : null };
        if (a.close && age >= a.close) {
          t.status = 'closed'; t.autoClosed = a.now;
          t.notes.push({ at: a.now, by: 'system', text: `Cerrado automáticamente: sin respuesta de la persona en ${Math.round(a.close / DAY)} días.` });
          await this.save(t); items.push({ kind: 'close', ...item });
        } else if (a.remind && !t.reminded && age >= a.remind) {
          t.reminded = a.now; await this.save(t, { keep: true }); items.push({ kind: 'remind', ...item });
        }
      }
      return Response.json({ items });
    }
    const t = await st.get('t:' + pad(+a.id || 0)); if (!t) return Response.json({ error: 'not found' }, { status: 404 });
    if (op === 'get') return Response.json({ ticket: t });
    if (op === 'attachment') { const parts = t.attachment ? await readParts(st, `a:${pad(t.id)}:`) : null; return Response.json({ text: parts ? parts.join('') : null }); }
    const before = t.status, now = Date.now();
    const turn = s => { t.status = s; t.waitingSince = s === 'waiting' ? now : null; t.reminded = null; };
    if (op === 'status') {
      const s = statusOf(a.status); if (!s) return Response.json({ error: 'bad status' }, { status: 400 });
      if (s !== before) turn(s);
      await this.save(t); return Response.json({ ok: true, before, after: t.status });
    }
    if (op === 'note') { t.notes.push({ at: now, by: a.by, text: a.text }); await this.save(t); return Response.json({ ok: true, ticket: t }); }
    if (op === 'reply') {                                 // from the admin: { text, by, status (waiting | closed | open), mailed }
      t.thread.push({ at: now, from: 'admin', by: a.by, text: a.text, mailed: !!a.mailed });
      t.last = 'admin'; t.lastAt = now; turn(statusOf(a.status) || 'waiting');
      await this.save(t); return Response.json({ ok: true, before, after: t.status, ticket: t });
    }
    if (op === 'user-reply') {                            // from the person, with the signed link: { email, text, solved } → open again, or closed
      if (String(a.email || '').toLowerCase() !== String(t.email || '').toLowerCase()) return Response.json({ error: 'forbidden' }, { status: 403 });
      t.thread.push({ at: now, from: 'user', text: a.text || '', ...(a.solved && { solved: true }) });
      t.last = 'user'; t.lastAt = now; turn(a.solved ? 'closed' : 'open');
      await this.save(t); return Response.json({ ok: true, before, after: t.status, ticket: t });
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
  const mailed = await mail(env, { to: email, kind: 'ticket', lang, vars: { n: r.id, link: await ticketLink(env, r.id, email), days: TICKET_LINK_DAYS } });
  return json({ ok: true, id: r.id, mailed });
}

// The person's answer in a ticket, from the signed link in its emails (no session): GET → the page with
// the conversation and a form; POST (that form, or JSON { t, text, solved }) → added to the thread, the
// ticket open again (or closed if solved), the admin told by email. Limited per address and per ticket a day.
export async function supportReply(req, env, url, site) {
  const asJson = req.method === 'POST' && /json/i.test(req.headers.get('Content-Type') || '');
  const guess = (req.headers.get('Accept-Language') || '').slice(0, 2).toLowerCase();
  const out = (state, t, lang, token, status) => asJson
    ? Response.json({ ok: status < 400, ...(status >= 400 && { error: state }), ...(t && { status: t.status }) }, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
    : new Response(ticketPage(lang, { state, token, site, t: t && { id: t.id, status: t.status, thread: t.thread.map(({ at, from, text, solved }) => ({ at, from, text, solved })) } }), { status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" } });
  if (!env.TICKETS) return out('bad', null, guess, null, 503);
  let token = url.searchParams.get('t') || '', text = '', solved = false;
  if (req.method === 'POST') {
    const max = 20000;
    if (+(req.headers.get('Content-Length') || 0) > max) return out('long', null, guess, null, 413);
    const raw = await req.text(); if (raw.length > max) return out('long', null, guess, null, 413);
    let f = {}; try { f = asJson ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw)); } catch { f = null; }
    if (!f || typeof f !== 'object' || Array.isArray(f)) return out('bad', null, guess, null, 400);
    token = String(f.t || token); text = clip(f.text, 5000).trim(); solved = [true, '1', 'on', 'true'].includes(f.solved);
  }
  const tok = await readTicketToken(env, token), T = stub(env.TICKETS, 'tickets');
  const t = tok && (await call(T, 'get', { id: tok.id })).ticket;
  if (!t || String(t.email).toLowerCase() !== tok.email) return out('bad', null, guess, null, 403);
  if (req.method === 'GET') return out('form', t, t.lang, token, 200);
  if (!text && !solved) return out('empty', t, t.lang, token, 400);
  const ip = req.headers.get('CF-Connecting-IP') || '?', per = +env.SUPPORT_REPLIES_PER_DAY || 10;
  if (!(await takeQuota(env, 'reply:ip:' + ip, { per, scope: 'support-reply' })) || !(await takeQuota(env, 'reply:t:' + t.id, { per, scope: 'support-reply' })))
    return out('limit', t, t.lang, token, 429);
  const r = await call(T, 'user-reply', { id: t.id, email: tok.email, text, solved });
  if (!r.ok) return out('bad', null, t.lang, null, 403);
  if (env.AUDIT) await audit(env, { by: 'user', action: 'ticket-user-reply', target: 'ticket:' + t.id, reason: t.email, before: { status: r.before }, after: { status: r.after, reply: text, ...(solved && { solved }) } });
  const to = String(env.SUPPORT_NOTIFY || '').trim() || emails(env)[0];
  if (to) await mail(env, { to, kind: 'ticketAdmin', lang: 'es', vars: { n: t.id, email: t.email, text, solved, admin: `https://${adminHost(env)}/#tickets/${t.id}` } });
  return out(solved ? 'thanks' : 'done', r.ticket, t.lang, token, 200);
}

// The daily cron (worker.js): tickets waiting for the person get one reminder after SUPPORT_REMIND_DAYS
// (default 7) and are closed after SUPPORT_AUTOCLOSE_DAYS (default 21) since our answer; 0 turns either off.
// (No reminder without MAIL_SECRET and a way to send email: it carries the link to answer.)
const daysVar = (v, d) => (v === undefined || v === null || String(v).trim() === '' ? d : Math.max(0, +v || 0));
export async function ticketsDue(env, now = Date.now()) {
  if (!env.TICKETS) return { reminded: 0, closed: 0 };
  const remind = env.MAIL_SECRET && mailConfigured(env) ? daysVar(env.SUPPORT_REMIND_DAYS, 7) * DAY : 0, close = daysVar(env.SUPPORT_AUTOCLOSE_DAYS, 21) * DAY;
  if (!remind && !close) return { reminded: 0, closed: 0 };
  const { items = [] } = await call(stub(env.TICKETS, 'tickets'), 'due', { now, remind, close });
  let reminded = 0, closed = 0;
  for (const x of items) {
    if (x.kind === 'remind') {
      const link = await ticketLink(env, x.id, x.email);
      if (link && await mail(env, { to: x.email, kind: 'ticketRemind', lang: x.lang, vars: { n: x.id, link, days: TICKET_LINK_DAYS, date: fmtDate(x.since, x.lang), close: x.closeAt && fmtDate(x.closeAt, x.lang) } })) reminded++;
    } else closed++;
    if (env.AUDIT) await audit(env, { by: 'system', action: x.kind === 'close' ? 'ticket-autoclose' : 'ticket-remind', target: 'ticket:' + x.id,
      before: { status: 'waiting' }, after: { status: x.kind === 'close' ? 'closed' : 'waiting' } }).catch(() => {});
  }
  return { reminded, closed };
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
      const status = statusOf(body.status); if (!status) return json({ error: 'bad request' }, 400);
      await audit(env, { by, action: 'ticket-status', target: 'ticket:' + id, before: { status: t.status }, after: { status } });
      return json(await call(T, 'status', { id, status }));
    }
    if (POST && op === 'note') {
      const text = clip(body.text, 5000).trim(); if (!text) return json({ error: 'bad request' }, 400);
      await audit(env, { by, action: 'ticket-note', target: 'ticket:' + id, after: { note: text } });
      return json(await call(T, 'note', { id, text, by }));
    }
    if (POST && op === 'reply') {
      const text = clip(body.text, 10000).trim(); if (!text) return json({ error: 'bad request' }, 400);
      const status = statusOf(body.status) || 'waiting';
      await audit(env, { by, action: 'ticket-reply', target: 'ticket:' + id, before: { status: t.status }, after: { status, reply: text } });
      const link = await ticketLink(env, id, t.email);
      const mailed = await mail(env, { to: t.email, kind: 'ticketReply', lang: t.lang, vars: { n: id, text, link, days: TICKET_LINK_DAYS, closed: status === 'closed' } });
      return json({ ...(await call(T, 'reply', { id, text, by, status, mailed })), mailed });
    }
  }
  if (GET && path === '/audit') return json(await call(L, 'list', { cursor: q.get('cursor') || null, target: clip(q.get('target'), 100) || null, limit: +q.get('limit') || 50 }));
  return json({ error: 'not found' }, 404);
}
