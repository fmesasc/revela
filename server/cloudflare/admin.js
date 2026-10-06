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
//   GET  /api/admin/stats                  → { users, pro, blocked, ai: { month, usd, limit }, tickets: { open, waiting, closed },
//                                          test: { accounts (billingTest), pro (Pro only from test mode), credits } }
//   GET  /api/admin/users?q=&cursor=       → { users, cursor }   (q: email prefix or Google sub; none: most recently seen)
//   GET  /api/admin/users/:sub             → the account: profile, plan, credits and lots, ledger, sessions, docs, team
//   POST /api/admin/credits                { sub, delta, reason, expiresDays?, notify? }   (ledger kind 'admin')
//   POST /api/admin/refund                 { sub, reason? , notify? }   (gives back the last AI charge not refunded yet)
//   POST /api/admin/plan                   { sub, until (ms, 0 = remove), reason }   (Pro given by hand; Stripe's untouched)
//   POST /api/admin/block                  { sub, blocked, reason }   (blocked: 403 on AI, cloud documents, calls…)
//   GET  /api/admin/storage                → { config: { freeMb, proMb, alertGb }, bytes, top }   (the cloud's space: storage.js)
//   POST /api/admin/storage                { freeMb, proMb, alertGb } → { config }
//   POST /api/admin/storage/measure        → { accounts, measured, more }   (documents from before space was counted)
//   POST /api/admin/storage-quota          { sub, mb (0: the plan's), reason } → { before, after }   (one account's own quota)
//   POST /api/admin/sessions-end           { sub, id?, reason } → { ended }   (one session, or all: a stolen account signed out
//                                          everywhere; the person signs in again with Google)
//   POST /api/admin/billing-test           { sub, on, reason }   (this account pays in Stripe's test mode: api.js stripeConf)
//   POST /api/admin/clear-test             { sub, reason? }   (removes what test mode gave: test Pro, test credits, a test-paid team; the real stays)
//   GET  /api/admin/tickets?status=&cursor= → { tickets, cursor }   (open, waiting, closed; in each, the latest activity first)
//   GET  /api/admin/tickets/:id            → the ticket (thread, notes)
//   GET  /api/admin/tickets/:id/attachment → the attached presentation (JSON)
//   POST /api/admin/tickets/:id/status     { status: open | waiting | closed }   ('pending', the old name of 'waiting', also)
//   POST /api/admin/tickets/:id/note       { text }   (internal)
//   POST /api/admin/tickets/:id/reply      { text, status?: waiting (default) | closed | open }   (emailed to the person, with
//                                          the signed link to answer in the same ticket; in the thread)
//   POST /api/admin/tickets/:id/suggest    { force? } → { suggestion, cached }   (AI help: a summary, priority, likely cause,
//                                          checks, proposed actions and a draft answer; it never acts by itself)
//   GET  /api/admin/audit?cursor=&target=  → { entries, cursor }
//   GET  /api/admin/finance/summary?from=&to=&group=day|month   → the business's figures (finance.js summarize(),
//                                          plus the directory's users and credits outstanding, and the AI budget)
//   GET  /api/admin/finance/events?cursor=&kind=&limit=          → { events, cursor }   (raw: 90 days; money: always)
//   GET  /api/admin/finance/export.csv?from=&to=                 → CSV for the accountant
//   GET  /api/admin/finance/entries                              → { entries }   (fixed costs and hours, by hand)
//   POST /api/admin/finance/entries        { type: 'fixed', name, amount, currency, date, recurring, until?, category }
//                                          or { type: 'time', date, hours, category, note }; with id: changes it
//   DELETE /api/admin/finance/entries/:id
//   GET  /api/admin/promos?mode=live|test  → { mode, codes, at, cached }   (Stripe's promotion codes with their coupon, status and
//                                          times redeemed — cached a minute —, plus Revela's own figures for each: finance.js)
//   POST /api/admin/promos                 { mode?, code, percent | amount + currency (eur|usd), duration: once | repeating | forever,
//                                          months?, appliesTo: [pro, credits, team] (none: everything), maxRedemptions?, expires? (YYYY-MM-DD),
//                                          firstTime?, perCustomer?, reason? }   (a coupon + its promotion code, in Stripe)
//   POST /api/admin/promos/:id/active      { mode?, active, reason? }   (deactivate or reactivate a code)
//   GET  /api/admin/promos/trial           → { config, stats: { live, test } }   (Pro's free trial: api.js trialConfig)
//   POST /api/admin/promos/trial           { trialDays, trialCredits, trialOncePerAccount, reason? }
//   (Stripe errors for want of permission: 502 { error: 'stripe permissions', message } naming what to add to the restricted key.)
//   GET  /api/admin/notices                → { notices, stats }   (Revela's own notices: notices.js; stats per notice and day)
//   POST /api/admin/notices                { notice: { id?, active, title, text, cta, url, where, who, langs, from, until, sponsor, tone, priority }, reason? }
//   POST /api/admin/notices/:id/delete     { reason? }
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

import { acct, call, settings, trialConfig, cleanTrial, resetTrialCache, resetNoticeCache } from './api.js';
import { stripeConf } from './billing.js';
import { priceOf } from './ai.js';
import { storageConfig, cleanStorage, resetStorageCache, storageBackfill } from './storage.js';
import { cleanNotice } from './notices.js';
import { mail, mailConfigured, ticketLink, readTicketToken, ticketPage, fmtDate, TICKET_LINK_DAYS } from './mail.js';
import { fromB64url } from './util.js';
import { takeQuota, writeText, readParts } from './store.js';
import { teamStatus } from './teams.js';
import { crmApi } from './crm.js';
import { communityAdmin } from './community.js';
import { ltiAdmin } from './lti.js';
import { record, financeCall, financeSettings, cleanEntry, periodOk, dayOf, promoKey } from './finance.js';
import { enc, dec, EMAIL, DAY } from './util.js';

const pad = n => String(n).padStart(10, '0');
export const STATUSES = ['open', 'waiting', 'closed'];   // (see Tickets)
export const statusOf = s => (s === 'pending' ? 'waiting' : STATUSES.includes(s) ? s : null);
// (The first ones come from the app's «Informar de un problema»; press … partner, from the website's «Contacto».)
export const CATEGORIES = ['bug', 'ai', 'billing', 'account', 'cloud', 'other', 'press', 'privacy', 'legal', 'partner'];
export const CHARGES = ['ai', 'image', 'speech', 'model3d'];           // (ledger kinds that are AI charges: refundable)
const clip = (s, n) => String(s ?? '').replace(/\r/g, '').slice(0, n);
const stub = (ns, name) => ns.get(ns.idFromName(name));
// Several values, in the order of the keys (missing ones left out).
const getMany = async (st, keys) => { if (!keys.length) return []; const m = await st.get(keys); return keys.map(k => m.get(k)).filter(v => v !== undefined); };

// ---- Configuration ---------------------------------------------------------------------------
export const adminHost = env => String(env.ADMIN_HOST || 'admin.revelaslides.com').toLowerCase();
export const emails = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
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
//   'u:' + sub → { sub, email, name, plan, until, credits, created, lastSeen, team, blocked, billingTest, test (Pro only from
//                 Stripe's test mode), testCredits, updated }
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
        credits: +a.credits || 0, created: +a.created || null, lastSeen: a.lastSeen || null, team: a.team || null, blocked: !!a.blocked,
        billingTest: !!a.billingTest, test: !!a.test, testCredits: Math.max(0, +a.testCredits || 0), bytes: Math.max(0, +a.bytes || 0), updated: Date.now() };
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
    if (op === 'subs') {                                  // { emails } → { subs: { email: sub } } (teams.js: a team's members)
      const subs = {};
      for (const e of (Array.isArray(a.emails) ? a.emails : []).slice(0, 1000)) { const m = await st.list({ prefix: `e:${String(e).toLowerCase()}|`, limit: 1 }); for (const [, sub] of m) subs[e] = sub; }
      return Response.json({ subs });
    }
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
      const now = Date.now(), d1 = new Date(now).toISOString().slice(0, 10), d30 = new Date(now - 29 * 864e5).toISOString().slice(0, 10);
      // (Stripe's test mode apart: a Pro only from it and test credits are not counted as real.)
      let users = 0, pro = 0, blocked = 0, active1 = 0, active30 = 0, credits = 0, bytes = 0; const top = [];
      const test = { accounts: 0, pro: 0, credits: 0 };
      for (const [, r] of await st.list({ prefix: 'u:' })) {
        users++; if (r.plan === 'pro' && r.until > now) { if (r.test) test.pro++; else pro++; } if (r.blocked) blocked++;
        if (r.lastSeen >= d1) active1++; if (r.lastSeen >= d30) active30++;
        const tc = Math.min(Math.max(0, r.credits), r.testCredits || 0); if (r.credits > 0) credits += r.credits - tc; test.credits += tc;
        if (r.billingTest) test.accounts++;
        if (r.bytes > 0) { bytes += r.bytes; top.push({ sub: r.sub, email: r.email, plan: r.plan, bytes: r.bytes }); }
      }
      // (Space in the cloud: the total, and who takes most — storage.js.)
      top.sort((x, y) => y.bytes - x.bytes);
      return Response.json({ users, pro, blocked, active1, active30, credits, test, storage: { bytes, top: top.slice(0, 20) } });
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
      // Closed ones without activity for a.purge ms (3 years by default) are deleted, attachment and all: nothing is kept
      // longer than needed (privacy.html, «Cuánto tiempo se guardan los datos»).
      if (a.purge) for (const [k, n] of await st.list({ prefix: 'i:closed|', end: `i:closed|${tsKey(a.now - a.purge)}`, limit: 200 })) {
        const old = [...(await st.list({ prefix: `a:${pad(n)}:` })).keys()];
        for (let i = 0; i < old.length; i += 128) await st.delete(old.slice(i, i + 128));
        await st.delete([k, 't:' + pad(n), 'x:' + pad(n)]); items.push({ kind: 'purge', id: n });
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
    if (op === 'suggestion') { t.suggestion = a.suggestion; await this.save(t, { keep: true }); return Response.json({ ok: true }); }
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
  else { email = String(body.email || '').trim().toLowerCase(); if (!EMAIL.test(email)) return json({ error: 'email' }, 400); name = clip(body.name, 120).trim() || null; }
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
  if (!env.TICKETS) return { reminded: 0, closed: 0, purged: 0 };
  const remind = env.MAIL_SECRET && mailConfigured(env) ? daysVar(env.SUPPORT_REMIND_DAYS, 7) * DAY : 0, close = daysVar(env.SUPPORT_AUTOCLOSE_DAYS, 21) * DAY;
  const purge = daysVar(env.SUPPORT_KEEP_DAYS, 1095) * DAY;
  const { items = [] } = await call(stub(env.TICKETS, 'tickets'), 'due', { now, remind, close, purge });
  let reminded = 0, closed = 0, purged = 0;
  for (const x of items) {
    if (x.kind === 'purge') { purged++; continue; }
    if (x.kind === 'remind') {
      const link = await ticketLink(env, x.id, x.email);
      if (link && await mail(env, { to: x.email, kind: 'ticketRemind', lang: x.lang, vars: { n: x.id, link, days: TICKET_LINK_DAYS, date: fmtDate(x.since, x.lang), close: x.closeAt && fmtDate(x.closeAt, x.lang) } })) reminded++;
    } else closed++;
    if (env.AUDIT) await audit(env, { by: 'system', action: x.kind === 'close' ? 'ticket-autoclose' : 'ticket-remind', target: 'ticket:' + x.id,
      before: { status: 'waiting' }, after: { status: x.kind === 'close' ? 'closed' : 'waiting' } }).catch(() => {});
  }
  if (purged && env.AUDIT) await audit(env, { by: 'system', action: 'ticket-purge', target: 'tickets', after: { purged } }).catch(() => {});
  return { reminded, closed, purged };
}

// ---- AI help for whoever answers a ticket ------------------------------------------------------------
// POST /api/admin/tickets/:id/suggest { force? } → { suggestion, cached }. The Worker sends the ticket (its
// conversation, internal notes, category, status, dates, version, browser) and, if it came from an account,
// that account's summary (plan, credits and lots, the last ledger entries, blocked, team) — never the
// attached presentation nor anyone else's data — to OpenRouter (providers that neither store nor train:
// data_collection 'deny'), model SUPPORT_AI_MODEL. Paid from the global AI budget (Budget, MONTHLY_BUDGET_USD),
// not from the person's credits. The answer is checked and clamped here and kept on the ticket (asking
// again reuses it; force: a new one). The AI only suggests: every action stays with the admin.
export const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];
export const SUGGEST_ACTIONS = ['refund', 'credits', 'plan', 'unblock', 'none'];
const MAX_SUGGEST_CREDITS = 2000, MAX_SUGGEST_DAYS = 365;
const iso = ts => (ts ? new Date(ts).toISOString() : null);
const LANG_NAMES = { es: 'Spanish', en: 'English', ca: 'Catalan', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', gl: 'Galician', eu: 'Basque', nl: 'Dutch', ar: 'Arabic' };

// What the AI sees (exported for the tests).
export function ticketContext(t, v, team) {
  const ticket = { id: t.id, category: t.category, status: statusOf(t.status), received: iso(t.at), lastActivity: iso(t.lastAt), lastFrom: t.last || null,
    waitingSince: iso(t.waitingSince), appVersion: t.version || null, browser: t.browser || null, language: t.lang || null,
    presentationAttached: !!t.attachment, signedIn: !!t.sub,
    thread: t.thread.slice(-20).map(m => ({ from: m.from, at: iso(m.at), text: clip(m.text, 3000), ...(m.solved && { markedSolved: true }) })),
    internalNotes: t.notes.slice(-10).map(n => ({ at: iso(n.at), by: n.by === 'system' ? 'system' : 'admin', text: clip(n.text, 1000) })) };
  if (!v?.profile) return { ticket, account: null };
  const refunded = new Set(v.refunded || []);
  const account = { plan: v.plan, proUntil: iso(v.until), paidPro: v.stored?.name === 'pro' ? iso(v.stored.until) : null, manualProUntil: iso(v.proGift?.until),
    credits: v.credits, debt: v.debt || 0, lots: (v.lots || []).slice(0, 10).map(l => ({ credits: l.n, expires: iso(l.exp) })),
    ledger: (v.ledger || []).slice(0, 20).map(e => ({ at: iso(e.at), delta: e.delta, kind: e.reason, ...(e.note && { note: clip(e.note, 200) }), ...(CHARGES.includes(e.reason) && e.delta < 0 && { aiCharge: true, refunded: refunded.has(e.at) }) })),
    blocked: v.blocked ? { since: iso(v.blocked.at), reason: clip(v.blocked.reason, 300) } : null, accountCreated: iso(v.profile.created), lastSeen: v.lastSeen || null,
    team: v.team ? { role: team?.role || null, active: !!team?.active } : null, cloudPresentations: v.docs };
  return { ticket, account };
}
const SYSTEM = lang => `You help the support team of Revela, a presentation editor (web and desktop) with optional accounts: a free plan and Pro, AI credits that expire (lots), cloud presentations, teams.
You get a support ticket and, if the person was signed in, a summary of their account. Never invent facts that aren't in the data. Admin actions available: "refund" (give back the last AI charge not yet refunded), "credits" (add credits; amount = number of credits, at most ${MAX_SUGGEST_CREDITS}), "plan" (manual Pro; amount = days, at most ${MAX_SUGGEST_DAYS}), "unblock" (only if the account is blocked), "none". Suggest an action only when the data supports it (e.g. a failed AI charge the person complains about) and never if there is no account.
Answer ONLY a JSON object: {"summary": "1-2 sentences in Spanish", "category": "bug|ai|billing|account|cloud|other|press|privacy|legal|partner", "priority": "baja|media|alta|urgente", "likelyCause": "in Spanish", "checks": ["what the admin should verify, in Spanish"], "actions": [{"type": "refund|credits|plan|unblock|none", "amount": number or omitted, "reason": "short reason for the audit log, in Spanish", "why": "in Spanish"}], "draftReply": "the answer to send to the person, in ${LANG_NAMES[lang] || 'Spanish'}, friendly, concrete, no promises the data doesn't support, signed \\"El equipo de Revela\\" (translated if not Spanish)", "statusAfter": "waiting|closed"}.
statusAfter: "waiting" if the reply asks the person something or needs their confirmation, "closed" if it solves it.`;

// The model's answer, checked: only known values, bounded sizes and amounts, actions that make sense for this account.
export function cleanSuggestion(raw, { category, hasAccount, blocked } = {}) {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const str = (x, n) => clip(typeof x === 'string' ? x : x == null ? '' : String(x), n).trim();
  const actions = [];
  for (const a of Array.isArray(o.actions) ? o.actions.slice(0, 6) : []) {
    const type = typeof a?.type === 'string' ? a.type.toLowerCase() : '';
    if (!SUGGEST_ACTIONS.includes(type) || actions.length >= 4) continue;
    if (type !== 'none' && (!hasAccount || (type === 'unblock' && !blocked))) continue;
    const out = { type, reason: str(a.reason, 300), why: str(a.why, 400) };
    if (type === 'credits' || type === 'plan') {
      const n = Math.round(+a.amount), max = type === 'credits' ? MAX_SUGGEST_CREDITS : MAX_SUGGEST_DAYS;
      if (!Number.isFinite(n) || n < 1) continue;
      out.amount = Math.min(max, n);
    }
    actions.push(out);
  }
  return { summary: str(o.summary, 500), category: CATEGORIES.includes(o.category) ? o.category : category || 'other', priority: PRIORITIES.includes(o.priority) ? o.priority : 'media',
    likelyCause: str(o.likelyCause, 800), checks: (Array.isArray(o.checks) ? o.checks : []).map(c => str(c, 240)).filter(Boolean).slice(0, 8),
    actions, draftReply: str(o.draftReply, 5000), statusAfter: o.statusAfter === 'closed' ? 'closed' : 'waiting' };
}
const jsonOf = text => { const s = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); try { return JSON.parse(s); } catch { const m = s.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } } };

// → { suggestion, cached } or { error, status }.
export async function suggestTicket(env, t, { by, force } = {}) {
  if (t.suggestion && !force) return { suggestion: t.suggestion, cached: true };
  if (!env.OPENROUTER_KEY || !env.BUDGET) return { error: 'ai not configured', status: 503 };
  const v = t.sub ? await call(acct(env, t.sub), 'admin-view').catch(() => null) : null, has = !!v?.profile?.sub;
  const team = has && v.team ? await teamStatus(env, v.team, v.profile.email).catch(() => null) : null;
  const s = settings(env), model = String(env.SUPPORT_AI_MODEL || 'google/gemini-2.5-flash'), maxTokens = 1800;
  const messages = [{ role: 'system', content: SYSTEM(t.lang) }, { role: 'user', content: JSON.stringify(ticketContext(t, has ? v : null, team)) }];
  const [pin, pout] = priceOf(s, model), inTok = JSON.stringify(messages).length / 3, estimate = (inTok * pin + maxTokens * pout) / 1e6;
  const budget = stub(env.BUDGET, 'global');
  if (!(await call(budget, 'check', { usd: estimate })).ok) return { error: 'ai paused', status: 503 };
  let r, data;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela support' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, usage: { include: true }, provider: { data_collection: 'deny' }, response_format: { type: 'json_object' } }) });
    data = await r.json().catch(() => null);
  } catch { r = null; }
  if (!r || !r.ok || !data) return { error: 'ai failed', status: 502 };
  const u = data.usage || {}, usd = +u.cost > 0 ? +u.cost : ((+u.prompt_tokens || inTok) * pin + (+u.completion_tokens || maxTokens) * pout) / 1e6;
  await call(budget, 'spend', { usd });
  await record(env, { kind: 'ai', feature: 'ticket-suggest', model: data.model || model, tin: +u.prompt_tokens || 0, tout: +u.completion_tokens || 0, usd, credits: 0 });
  await audit(env, { by, action: 'ticket-suggest', target: 'ticket:' + t.id, after: { model, usd: Math.round(usd * 1e6) / 1e6 } });
  const raw = jsonOf(data.choices?.[0]?.message?.content);
  if (!raw) return { error: 'ai bad answer', status: 502 };
  const suggestion = { ...cleanSuggestion(raw, { category: t.category, hasAccount: has, blocked: !!v?.blocked }), at: Date.now(), model, usd, by };
  await call(stub(env.TICKETS, 'tickets'), 'suggestion', { id: t.id, suggestion });
  return { suggestion, cached: false };
}

// ---- The admin API -------------------------------------------------------------------------------------
export async function handleAdmin(req, env, url) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  const host = adminHost(env);
  if (!adminConfigured(env) || url.hostname.toLowerCase() !== host) return new Response('Not found', { status: 404, headers });
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return json({ error: 'method' }, 405);
  if (req.headers.get('X-Revela-Admin') !== '1') return json({ error: 'forbidden' }, 403);
  if (req.method !== 'GET' && req.headers.get('Origin') !== 'https://' + host) return json({ error: 'origin' }, 403);
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
  const GET = req.method === 'GET', POST = req.method === 'POST', DELETE = req.method === 'DELETE';
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
    return json({ ...v, team: v.team ? { id: v.team, name: team?.name || null, role: team?.role || null, active: !!team?.active, test: !!team?.test } : null,
      billingGlobalTest: String(env.STRIPE_MODE || '').trim().toLowerCase() === 'test', billingTestReady: !!(env.STRIPE_TEST_SECRET_KEY && env.STRIPE_TEST_WEBHOOK_SECRET), directory: (await call(D, 'get', { sub: m[1] })).user });
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
  if (GET && path === '/storage') { const st = (await call(D, 'stats')).storage; return json({ config: await storageConfig(env, true), ...st }); }
  if (POST && path === '/storage') {
    const conf = cleanStorage(body); if (!conf) return json({ error: 'bad request' }, 400);
    const before = await storageConfig(env, true);
    await call(stub(env.BUDGET, 'global'), 'storage-set', { storage: conf }); resetStorageCache();
    await audit(env, { by, action: 'storage-config', target: 'storage', before, after: conf });
    return json({ config: conf });
  }
  if (POST && path === '/storage/measure') { const r = await storageBackfill(env); await audit(env, { by, action: 'storage-measure', target: 'storage', after: r }); return json(r); }
  if (POST && path === '/storage-quota') {
    const reason = clip(body.reason, 500).trim(), mb = Math.round(+body.mb);
    if (!reason || !Number.isInteger(mb) || mb < 0 || mb > 1048576) return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'admin-storage', { mb, reason, by });
    await audit(env, { by, action: 'storage-quota', target: body.sub, reason, before: r.before, after: r.after });
    return json({ ok: true, ...r });
  }
  if (POST && path === '/block') {
    const reason = clip(body.reason, 500).trim(); if (!reason || typeof body.blocked !== 'boolean') return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'admin-block', { blocked: body.blocked, reason, by });
    await audit(env, { by, action: body.blocked ? 'block' : 'unblock', target: body.sub, reason, before: r.before, after: r.after });
    return json({ ok: true, ...r });
  }
  if (POST && path === '/sessions-end') {
    const reason = clip(body.reason, 500).trim(); if (!reason || (body.id !== undefined && !/^[\w-]{16}$/.test(body.id))) return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'sessions-end', body.id ? { ids: [body.id] } : {});
    await audit(env, { by, action: 'sessions-end', target: body.sub, reason, after: { ended: r.ended, ...(body.id && { id: body.id }) } });
    return json({ ok: true, ...r });
  }
  // Stripe's test mode for one account (api.js stripeConf): its purchases use the test keys and prices; what they
  // grant is marked test and kept out of the business's figures.
  if (POST && path === '/billing-test') {
    const reason = clip(body.reason, 500).trim(); if (!reason || typeof body.on !== 'boolean') return json({ error: 'bad request' }, 400);
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const r = await call(acct(env, body.sub), 'admin-billing-test', { on: body.on, reason, by });
    await audit(env, { by, action: body.on ? 'billing-test-on' : 'billing-test-off', target: body.sub, reason, before: r.before, after: r.after });
    return json({ ok: true, ...r });
  }
  if (POST && path === '/clear-test') {
    if (!(await account(body.sub))) return json({ error: 'not found' }, 404);
    const reason = clip(body.reason, 500).trim() || 'Quitar lo de prueba';
    const r = await call(acct(env, body.sub), 'admin-clear-test', { reason, by });
    // (A team this account administers, paid in test mode, loses that period too.)
    let team = null;
    if (r.team && env.TEAMS) {
      const ts = await teamStatus(env, r.team, r.email).catch(() => null);
      if (ts?.role === 'admin' && ts.test) team = await (await env.TEAMS.get(env.TEAMS.idFromName('team:' + r.team)).fetch('https://team/clear-test', { method: 'POST', body: JSON.stringify({}) })).json();
    }
    const removed = { ...r.removed, ...(team?.cleared && { team: r.team }) };
    await audit(env, { by, action: 'clear-test', target: body.sub, reason, before: r.before, after: { ...r.after, removed } });
    return json({ ok: true, before: r.before, after: r.after, removed });
  }
  if (GET && path === '/tickets') return json(await call(T, 'list', { status: q.get('status') || '', cursor: q.get('cursor') || null, limit: +q.get('limit') || 50 }));
  m = path.match(/^\/tickets\/(\d{1,10})(?:\/(attachment|status|note|reply|suggest))?$/);
  if (m) {
    const id = +m[1], op = m[2] || '', got = await call(T, 'get', { id }); if (!got.ticket) return json({ error: 'not found' }, 404);
    const t = got.ticket;
    // (SUPPORT_AI_AUTO=1: the page asks for the AI's help itself the first time the ticket is opened.)
    if (GET && !op) return json({ ticket: t, ai: !!env.OPENROUTER_KEY, autoSuggest: env.SUPPORT_AI_AUTO === '1' && !!env.OPENROUTER_KEY && !t.suggestion });
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
    if (POST && op === 'suggest') {
      const r = await suggestTicket(env, t, { by, force: body.force === true });
      return r.error ? json({ error: r.error }, r.status) : json(r);
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
  if (path === '/promos' || path.startsWith('/promos/')) return promosApi(env, path, q, body, { GET, POST, by, json });
  if (path === '/notices' || path.startsWith('/notices/')) return noticesApi(env, path, body, { GET, POST, by, json });
  if (path === '/lti' || path.startsWith('/lti/')) return ltiAdmin(env, path, body, { GET, POST, json, audit: e => audit(env, { by, ...e }), site: env.SITE_URL || 'https://revelaslides.com' });
  if (path === '/community' || path.startsWith('/community/')) return communityAdmin(env, path, q, body, { GET, POST, json, audit: e => audit(env, { by, ...e }) });
  if (path === '/crm' || path.startsWith('/crm/')) return crmApi(env, path, q, body, { GET, POST, by, json, audit: e => audit(env, { by, ...e }) });
  if (path.startsWith('/finance/')) return financeApi(env, path, q, body, { GET, POST, DELETE, by, json, headers, D });
  if (GET && path === '/audit') return json(await call(L, 'list', { cursor: q.get('cursor') || null, target: clip(q.get('target'), 100) || null, limit: +q.get('limit') || 50 }));
  return json({ error: 'not found' }, 404);
}

// ---- The business's figures (finance.js) ------------------------------------------------------------
async function financeApi(env, path, q, body, { GET, POST, DELETE, by, json, headers, D }) {
  if (!env.FINANCE) return json({ error: 'finance not configured' }, 503);
  const F = (op, a) => financeCall(env, op, a);
  // The period: from/to (YYYY-MM-DD, UTC), at most 3 years; by default this month so far.
  const today = dayOf(Date.now()), from = q.get('from') || today.slice(0, 8) + '01', to = q.get('to') || today;
  if (GET && path === '/finance/summary') {
    if (!periodOk(from, to)) return json({ error: 'bad period' }, 400);
    const group = q.get('group') === 'day' ? 'day' : 'month', fs = financeSettings(env);
    const [sum, dir, budget] = await Promise.all([F('summary', { from, to, group }), call(D, 'stats'), env.BUDGET ? call(stub(env.BUDGET, 'global'), 'check', { usd: 0 }) : null]);
    // (Who the most costly accounts are: their address from the directory, only here.)
    for (const u of sum.topUsers) u.email = (await call(D, 'get', { sub: u.sub })).user?.email || null;
    return json({ ...sum, directory: { users: dir.users, pro: dir.pro, active1: dir.active1, active30: dir.active30, payingShare: dir.users ? Math.round((dir.pro / dir.users) * 1e4) / 1e4 : null },
      liability: { credits: dir.credits || 0, usd: Math.round((dir.credits || 0) * fs.creditUsd * 100) / 100, eur: Math.round((dir.credits || 0) * fs.creditUsd * fs.usdEur * 100) / 100 },
      budget: budget && { month: today.slice(0, 7), usd: budget.usd, limit: budget.limit, share: budget.limit ? Math.round((budget.usd / budget.limit) * 1e4) / 1e4 : null } });
  }
  if (GET && path === '/finance/events') return json(await F('events', { cursor: q.get('cursor') || null, kind: q.get('kind') || null, limit: +q.get('limit') || 50 }));
  if (GET && path === '/finance/export.csv') {
    if (!periodOk(from, to)) return json({ error: 'bad period' }, 400);
    const r = await env.FINANCE.get(env.FINANCE.idFromName('global')).fetch('https://fin/csv', { method: 'POST', body: JSON.stringify({ from, to }) });
    return new Response(r.body, { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="revela-contabilidad-${from}-${to}.csv"` } });
  }
  if (GET && path === '/finance/entries') return json(await F('entries'));
  if (POST && path === '/finance/entries') {
    const e = cleanEntry(body); if (!e) return json({ error: 'bad request' }, 400);
    const before = body.id ? (await F('entry-get', { id: e.id })).entry : null;
    if (body.id && (!before || before.type !== e.type)) return json({ error: 'not found' }, 404);
    await audit(env, { by, action: before ? 'finance-edit' : 'finance-add', target: 'finance:' + e.id, reason: e.type === 'fixed' ? e.name : e.note, before, after: e });
    return json(await F('entry-put', { entry: e }));
  }
  const m = path.match(/^\/finance\/entries\/([a-f0-9]{12})$/);
  if (DELETE && m) {
    const before = (await F('entry-get', { id: m[1] })).entry; if (!before) return json({ error: 'not found' }, 404);
    await audit(env, { by, action: 'finance-delete', target: 'finance:' + m[1], reason: before.type === 'fixed' ? before.name : before.note, before, after: null });
    return json(await F('entry-del', { id: m[1] }));
  }
  return json({ error: 'not found' }, 404);
}

// ---- Notices: Revela's own announcements (notices.js), kept in the Budget object ------------------------------
async function noticesApi(env, path, body, { GET, POST, by, json }) {
  const B = stub(env.BUDGET, 'global');
  if (GET && path === '/notices') return json(await call(B, 'notices-get', { stats: true }));
  if (POST && path === '/notices') {
    const n = cleanNotice(body.notice); if (n.error) return json({ error: 'bad request', field: n.error }, 400);
    const before = ((await call(B, 'notices-get')).notices || []).find(x => x.id === n.id) || null;
    await audit(env, { by, action: before ? 'notice-update' : 'notice-create', target: 'notice:' + n.id, reason: clip(body.reason, 500).trim(), before, after: n });
    const r = await call(B, 'notices-put', { notice: n }); if (r.error) return json({ error: r.error, message: 'Hay demasiados avisos: borra alguno antiguo.' }, 409);
    resetNoticeCache(); return json({ ok: true, notice: n });
  }
  const m = path.match(/^\/notices\/([a-z0-9]{6,20})\/delete$/);
  if (POST && m) {
    const before = ((await call(B, 'notices-get')).notices || []).find(x => x.id === m[1]) || null; if (!before) return json({ error: 'not found' }, 404);
    await audit(env, { by, action: 'notice-delete', target: 'notice:' + m[1], reason: clip(body.reason, 500).trim(), before, after: null });
    await call(B, 'notices-delete', { id: m[1] }); resetNoticeCache(); return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

// ---- Promotions: Stripe's promotion codes, and Pro's free trial ---------------------------------------------
// Codes live in Stripe (a coupon and its promotion code), in live or test mode (stripeConf): Checkout lets people
// type them (api.js checkout: allow_promotion_codes). What each code brought is in finance.js ('pc:'). The restricted
// key needs, besides Checkout's: Coupons — Write, Promotion Codes — Write, Products — Read, Prices — Read.
// Stripe has no per-customer limit for a code: perCustomer is kept in its metadata, and uses beyond it are shown here.
export const PROMO_PERMISSIONS = ['Coupons: Write', 'Promotion Codes: Write', 'Products: Read', 'Prices: Read'];
export const PROMO_GROUPS = { pro: ['pro-month', 'pro-year'], credits: ['credits-500', 'credits-1500'], team: ['team-seat'] };
let promoCache = new Map();                               // mode → { at, codes }
export const resetPromoCache = () => { promoCache = new Map(); };
async function stripeCall(env, key, method, path, params) {
  const body = method === 'GET' ? null : new URLSearchParams(params || []);
  const url = 'https://api.stripe.com/v1/' + path + (method === 'GET' && params ? '?' + new URLSearchParams(params) : '');
  const r = await (env.FETCH || fetch)(url, { method, headers: { Authorization: `Bearer ${key}`, ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }) }, ...(body && { body }) }).catch(() => null);
  const d = r ? await r.json().catch(() => null) : null;
  return { ok: !!r?.ok && !d?.error, status: r?.status || 0, d, err: d?.error || (r ? null : { message: 'network' }) };
}
// A Stripe failure, for the admin page: a missing permission named clearly.
function stripeFailure(x, mode, json) {
  const msg = String(x.err?.message || '');
  if (x.status === 403 || /permission/i.test(msg) || x.err?.code === 'secret_key_required')
    return json({ error: 'stripe permissions', permissions: PROMO_PERMISSIONS, stripe: msg.slice(0, 300),
      message: `La clave de Stripe ${mode === 'test' ? 'de prueba (STRIPE_TEST_SECRET_KEY)' : 'real (STRIPE_SECRET_KEY)'} no tiene permiso para esto. En Stripe ▸ Developers ▸ API keys, edita la clave restringida y añade estos permisos: ${PROMO_PERMISSIONS.join(', ')}.` }, 502);
  return json({ error: 'stripe failed', message: `Stripe dice: ${msg.slice(0, 300) || 'error ' + x.status}`, status: x.status }, 502);
}
// One code as the page shows it (Stripe's object, either API shape: coupon embedded or in promotion.coupon).
function promoView(pc, coupons, now = Date.now()) {
  const cid = typeof pc.coupon === 'object' ? pc.coupon?.id : pc.coupon || pc.promotion?.coupon?.id || pc.promotion?.coupon;
  const c = (typeof pc.coupon === 'object' && pc.coupon) || (typeof pc.promotion?.coupon === 'object' && pc.promotion.coupon) || coupons.get(cid) || {};
  const expires = pc.expires_at ? pc.expires_at * 1000 : null, max = pc.max_redemptions || null, times = +pc.times_redeemed || 0;
  const status = !pc.active ? 'inactive' : expires && expires <= now ? 'expired' : max && times >= max ? 'exhausted' : c.valid === false ? 'invalid' : 'active';
  return { id: pc.id, code: pc.code, active: !!pc.active, status, times, max, expires, created: pc.created ? pc.created * 1000 : null, firstTime: !!pc.restrictions?.first_time_transaction,
    perCustomer: +pc.metadata?.per_customer || null, appliesTo: pc.metadata?.applies ? String(pc.metadata.applies).split(',').filter(Boolean) : null, test: pc.livemode === false,
    coupon: { id: c.id || cid || null, percent: c.percent_off ?? null, amount: c.amount_off ?? null, currency: c.currency || null, duration: c.duration || null, months: c.duration_in_months || null,
      products: c.applies_to?.products || null, valid: c.valid !== false } };
}
// The admin's new code, checked → { code, coupon params, promotion params } or { error }.
export function cleanPromo(b, now = Date.now()) {
  const code = String(b?.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,40}$/.test(code)) return { error: 'code' };
  const out = { code, coupon: [['name', code], ['metadata[revela]', '1']], promo: [['code', code]] };
  if (b.percent != null && b.percent !== '') {
    const pct = Math.round(+b.percent * 100) / 100; if (!(pct > 0 && pct <= 100)) return { error: 'percent' };
    out.coupon.push(['percent_off', String(pct)]); out.off = { percent: pct };
  } else {
    const amount = Math.round(+b.amount * 100), cur = String(b.currency || 'eur').toLowerCase();
    if (!(amount > 0 && amount <= 1e6) || !['eur', 'usd'].includes(cur)) return { error: 'amount' };
    out.coupon.push(['amount_off', String(amount)], ['currency', cur]); out.off = { amount, currency: cur };
  }
  if (!['once', 'repeating', 'forever'].includes(b.duration)) return { error: 'duration' };
  out.coupon.push(['duration', b.duration]);
  if (b.duration === 'repeating') { const m = Math.round(+b.months); if (!(m >= 1 && m <= 36)) return { error: 'months' }; out.coupon.push(['duration_in_months', String(m)]); out.months = m; }
  const groups = Array.isArray(b.appliesTo) ? [...new Set(b.appliesTo)] : [];
  if (groups.some(g => !PROMO_GROUPS[g])) return { error: 'appliesTo' };
  out.groups = groups.length === Object.keys(PROMO_GROUPS).length ? [] : groups;   // (all three: everything)
  if (b.maxRedemptions != null && b.maxRedemptions !== '') { const n = Math.round(+b.maxRedemptions); if (!(n >= 1 && n <= 1e6)) return { error: 'maxRedemptions' }; out.promo.push(['max_redemptions', String(n)]); }
  if (b.expires) {
    const t = Date.parse(String(b.expires) + 'T23:59:59Z'); if (!/^\d{4}-\d\d-\d\d$/.test(b.expires) || !(t > now) || t > now + 5 * 366 * DAY) return { error: 'expires' };
    out.promo.push(['expires_at', String(Math.floor(t / 1000))]);
  }
  if (b.firstTime === true) out.promo.push(['restrictions[first_time_transaction]', 'true']);
  if (b.perCustomer != null && b.perCustomer !== '') { const n = Math.round(+b.perCustomer); if (!(n >= 1 && n <= 100)) return { error: 'perCustomer' }; out.promo.push(['metadata[per_customer]', String(n)]); }
  out.promo.push(['metadata[applies]', out.groups.join(',')]);
  return out;
}
async function promosApi(env, path, q, body, { GET, POST, by, json }) {
  // Pro's free trial: the settings (audited) and how trials went (finance.js).
  if (path === '/promos/trial') {
    if (GET) {
      const st = env.FINANCE ? await financeCall(env, 'trials') : { live: {}, test: {} };
      const view = c => ({ started: c.start || 0, converted: c.convert || 0, cancelled: c.cancel || 0, running: Math.max(0, (c.start || 0) - (c.convert || 0) - (c.cancel || 0)),
        conversion: (c.convert || 0) + (c.cancel || 0) ? Math.round(((c.convert || 0) / ((c.convert || 0) + (c.cancel || 0))) * 1e4) / 1e4 : null });
      return json({ config: await trialConfig(env, true), stats: { live: view(st.live), test: view(st.test) } });
    }
    if (POST) {
      const after = cleanTrial(body); if (!after) return json({ error: 'bad request' }, 400);
      const before = await trialConfig(env, true), reason = clip(body.reason, 500).trim();
      await audit(env, { by, action: 'trial-config', target: 'config:trial', reason, before, after });
      await call(stub(env.BUDGET, 'global'), 'config-set', { trial: after }); resetTrialCache();
      return json({ ok: true, before, after });
    }
    return json({ error: 'method' }, 405);
  }
  const mode = (POST ? body.mode : q.get('mode')) === 'test' ? 'test' : 'live', conf = stripeConf(env, mode);
  if (!conf.key) return json({ error: mode === 'test' ? 'billing test not configured' : 'billing not configured',
    message: mode === 'test' ? 'Falta STRIPE_TEST_SECRET_KEY: no hay modo de prueba de Stripe.' : 'Falta STRIPE_SECRET_KEY.' }, 503);
  if (GET && path === '/promos') {
    const c = promoCache.get(mode);
    let codes = c && Date.now() - c.at < 60e3 ? c.codes : null, cached = !!codes;
    if (!codes) {
      const [pcs, cps] = await Promise.all([stripeCall(env, conf.key, 'GET', 'promotion_codes', { limit: '100' }), stripeCall(env, conf.key, 'GET', 'coupons', { limit: '100' })]);
      if (!pcs.ok) return stripeFailure(pcs, mode, json);
      const coupons = new Map((cps.ok ? cps.d?.data || [] : []).map(x => [x.id, x]));
      codes = (pcs.d?.data || []).map(x => promoView(x, coupons)); promoCache.set(mode, { at: Date.now(), codes });
    }
    // (Revela's own figures: uses recorded from the webhooks, discount and paid, and uses beyond a per-customer limit.)
    const fin = env.FINANCE ? (await financeCall(env, 'promos'))[mode] || {} : {}, R = financeSettings(env).usdEur;
    const out = codes.map(x => {
      const f = fin[promoKey(x.code)], eur = k => Object.entries(f?.money || {}).reduce((t, [cur, v]) => t + (cur === 'usd' ? v[k] * R : v[k]) / 100, 0);
      const over = x.perCustomer && f ? Object.values(f.users || {}).reduce((t, n) => t + Math.max(0, n - x.perCustomer), 0) : 0;
      return { ...x, test: mode === 'test', revela: f ? { uses: f.n, discount: Math.round(eur('disc') * 100) / 100, gross: Math.round(eur('gross') * 100) / 100, customers: Object.keys(f.users || {}).length, overLimit: over } : null };
    });
    return json({ mode, codes: out, at: (promoCache.get(mode) || {}).at || Date.now(), cached });
  }
  if (POST && path === '/promos') {
    const v = cleanPromo(body); if (v.error) return json({ error: 'bad request', field: v.error }, 400);
    // (applies_to: the products of the configured prices — STRIPE_PRICE_* or STRIPE_TEST_PRICE_* — of the groups chosen.)
    const products = new Set();
    for (const g of v.groups) for (const k of PROMO_GROUPS[g]) {
      if (!conf.prices[k]) continue;
      const x = await stripeCall(env, conf.key, 'GET', 'prices/' + encodeURIComponent(conf.prices[k]));
      if (!x.ok) return stripeFailure(x, mode, json);
      const prod = typeof x.d.product === 'object' ? x.d.product?.id : x.d.product; if (prod) products.add(prod);
    }
    if (v.groups.length && !products.size) return json({ error: 'no products', message: 'No hay precios configurados para lo elegido (STRIPE_PRICE_*).' }, 400);
    const cp = await stripeCall(env, conf.key, 'POST', 'coupons', [...v.coupon, ...[...products].map(id => ['applies_to[products][]', id]), ['metadata[by]', by]]);
    if (!cp.ok) return stripeFailure(cp, mode, json);
    // (Stripe's newer API takes promotion[coupon]; older versions, coupon.)
    let pc = await stripeCall(env, conf.key, 'POST', 'promotion_codes', [['promotion[type]', 'coupon'], ['promotion[coupon]', cp.d.id], ...v.promo, ['metadata[by]', by]]);
    if (!pc.ok && /promotion/.test(String(pc.err?.param || pc.err?.message || '')) && pc.status === 400) pc = await stripeCall(env, conf.key, 'POST', 'promotion_codes', [['coupon', cp.d.id], ...v.promo, ['metadata[by]', by]]);
    if (!pc.ok) { await stripeCall(env, conf.key, 'DELETE', 'coupons/' + encodeURIComponent(cp.d.id)); return stripeFailure(pc, mode, json); }
    const code = promoView(pc.d, new Map([[cp.d.id, cp.d]]));
    await audit(env, { by, action: 'promo-create', target: 'promo:' + code.code, reason: clip(body.reason, 500).trim(), after: { mode, ...code } });
    promoCache.delete(mode);
    return json({ ok: true, mode, code });
  }
  const m = path.match(/^\/promos\/(promo_[\w]{1,80})\/active$/);
  if (POST && m) {
    if (typeof body.active !== 'boolean') return json({ error: 'bad request' }, 400);
    const x = await stripeCall(env, conf.key, 'POST', 'promotion_codes/' + m[1], [['active', String(body.active)]]);
    if (!x.ok) return stripeFailure(x, mode, json);
    await audit(env, { by, action: body.active ? 'promo-reactivate' : 'promo-deactivate', target: 'promo:' + (x.d.code || m[1]), reason: clip(body.reason, 500).trim(),
      before: { mode, id: m[1], active: !body.active }, after: { mode, id: m[1], active: !!x.d.active } });
    promoCache.delete(mode);
    return json({ ok: true, mode, code: promoView(x.d, new Map()) });
  }
  return json({ error: 'not found' }, 404);
}
