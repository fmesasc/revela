// Business accounting (the admin's «Negocio» page): every economic event, in one Durable Object
// (Finance). Internal business data: only the protected admin API (admin.js) reads it.
//
// What is recorded (record(env, event), never throws, nothing if FINANCE isn't bound):
//   ai        { feature, model, tin, tout, usd (provider's cost), credits (charged), sub, blenderSecs?, blenderUsd? }
//             — every AI request through Revela's key (api.js chat/image/speech, model3d.js rounds, admin.js
//             ticket suggestions), feature from AI_FEATURES (the client tags it; anything else is 'other')
//   email     { mail (kind), usd (EMAIL_USD) }                       — each email handed over (mail.js)
//   payment   { product, cur, gross, tax, fee, feeCur, net, credits?, subscription?, months?, sub, ref, feeEstimated?, discount?, promo? }
//             — Stripe, in minor units (cents); fee from the balance transaction, else estimated; gross is what was paid,
//             discount what a promotion code took off (gross before it: gross + discount), promo that code's text
//   refund    { cur, amount, sub?, ref }                              — charge.refunded (the amount refunded by that event)
//   sub-end   { subscription, product, sub, ref }                     — customer.subscription.deleted
//   credits   { reason, delta, sub }                                  — granted (trial, pro, purchase, admin…), expired,
//             taken by an admin (Account.log); AI charges come inside 'ai' (credits)
//   signup    { sub }                                                 — a new account
//   trial     { stage: start | convert | cancel, subscription, product, sub, ref }   — Pro's free trial (api.js): each stage
//             counted once per subscription ('tr:'), a cancel only before a conversion
// Plus, without a raw event, the daily active counter (active(): from Account.seen, once a day per account).
// Stripe's test mode (api.js stripeConf): payment, refund, sub-end and credits events may carry test: true. They are
// kept (raw, and counted apart as 'test.*' in the day's sums, subscriptions as 'ts:') but never enter revenue, fees,
// net, MRR, churn, conversion, per-account figures or the accountant's CSV; summarize() reports them under 'test'.
//
// Storage:
//   'd:' + YYYY-MM-DD → { key: number }      the day's sums and counts (forever; see bump())
//   'e:' + ts + ':' + seq → event            raw events, kept RAW_DAYS (90) days
//   'p:' + ts + ':' + seq → event            money events (payment, refund, sub-end), kept forever (accounting)
//   'k:' + ref → at                          Stripe events already counted (webhooks are retried)
//   's:' + subscription → { id, sub, product, cur, monthly, start, periodEnd, end }   subscriptions (MRR, churn)
//   'u:' + YYYY-MM + '|' + sub → { usd, cr, n, rev: { cur: minor } }                   per account and month
//   'tr:' + subscription → { start, convert, cancel }   a free trial's stages (test: 'trt:'); 'trials' / 'trialsTest' → all-time counts
//   'pc:' + CODE → { n, money: { cur: { disc, gross } }, users: { sub: n } }   uses of a promotion code, ever (test: 'pct:')
//   'x:' + id → manual entry: { id, type: 'fixed', name, amount, currency, date, recurring, until?, category }
//                                            or { id, type: 'time', date, hours, category, note }
// Money is kept in the currency it came in (EUR, USD); reports convert to EUR with USD_EUR (in the report).
//
// Vars (plain, set in Cloudflare): USD_EUR (default 0.86), EMAIL_USD (cost of one email, default 0),
// STRIPE_FEE_PCT (default 1.5) and STRIPE_FEE_FIXED (default 0.25, in the payment's currency) to estimate
// Stripe's fee when its balance transaction can't be read; CREDIT_USD and MONTHLY_BUDGET_USD as in api.js.

import { DAY } from './util.js';

export const RAW_DAYS = 90;
export const AI_FEATURES = ['assistant', 'complete', 'vision', 'alt-text', 'image', 'speech', '3d', 'ticket-suggest', 'rig-detect',
  'create', 'improve', 'redesign', 'outline', 'rewrite', 'notes', 'translate', 'agenda', 'quiz', 'review', 'theme', 'other'];
export const featureOf = f => (AI_FEATURES.includes(f) ? f : 'other');
export const FIXED_CATS = ['infraestructura', 'software', 'dominio', 'legal', 'gestoría', 'marketing', 'hardware', 'impuestos', 'otros'];
export const TIME_CATS = ['desarrollo', 'soporte', 'marketing', 'administración', 'diseño', 'contenido', 'otros'];
export const TRIAL_STAGES = ['start', 'convert', 'cancel'];
// A promotion code as a key (Stripe's codes: letters, digits and dashes; case doesn't matter).
export const promoKey = c => String(c || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
const KINDS = ['ai', 'email', 'payment', 'refund', 'sub-end', 'credits', 'signup', 'trial'], MONEY = ['payment', 'refund', 'sub-end'];
export const dayOf = ts => new Date(ts).toISOString().slice(0, 10);
const tsKey = n => String(Math.floor(+n || 0)).padStart(15, '0');
const clip = (s, n) => String(s ?? '').slice(0, n);
const fin = n => (Number.isFinite(+n) ? +n : 0);
const r2 = n => Math.round(n * 100) / 100, r6 = n => Math.round(n * 1e6) / 1e6;
const isDay = d => /^\d{4}-\d\d-\d\d$/.test(d || '') && Number.isFinite(Date.parse(d)) && dayOf(Date.parse(d)) === d;

export function financeSettings(env) {
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
  return { usdEur: num(env.USD_EUR, 0.86), emailUsd: num(env.EMAIL_USD, 0), feePct: num(env.STRIPE_FEE_PCT, 1.5), feeFixed: num(env.STRIPE_FEE_FIXED, 0.25),
    creditUsd: num(env.CREDIT_USD, 0.002), budget: num(env.MONTHLY_BUDGET_USD, 50) };
}
const stub = env => env.FINANCE.get(env.FINANCE.idFromName('global'));
const ask = async (env, op, body) => (await stub(env).fetch('https://fin/' + op, { method: 'POST', body: JSON.stringify(body || {}) })).json();
// An economic event (see above). Never throws: accounting must not break what it records.
export async function record(env, ev) {
  if (!env.FINANCE) return false;
  try { return !!(await ask(env, 'record', ev)).ok; } catch (e) { console.log('finance', e?.message); return false; }
}
export async function active(env, { mau }) {
  if (!env.FINANCE) return;
  try { await ask(env, 'active', { mau: !!mau }); } catch {}
}
export const financeCall = ask;

// An event, clean: known kind, numbers finite, strings bounded.
function clean(a, s) {
  if (!KINDS.includes(a.kind)) return null;
  const e = { at: Number.isFinite(+a.at) && +a.at > 0 ? +a.at : Date.now(), kind: a.kind };
  const str = (k, n = 100) => { if (a[k] != null && a[k] !== '') e[k] = clip(a[k], n); };
  const nums = (...ks) => { for (const k of ks) if (a[k] != null) e[k] = fin(a[k]); };
  const cur = c => (/^[a-z]{3}$/.test(String(c || '').toLowerCase()) ? String(c).toLowerCase() : 'eur');
  str('sub'); str('ref', 200);
  if (a.kind === 'ai') { e.feature = featureOf(a.feature); str('model'); nums('tin', 'tout', 'usd', 'credits', 'blenderSecs', 'blenderUsd'); e.fx = s.usdEur; }
  if (a.kind === 'email') { str('mail', 40); e.usd = fin(a.usd); e.fx = s.usdEur; }
  if (a.kind === 'payment') { e.cur = cur(a.cur); e.feeCur = cur(a.feeCur || a.cur); str('product', 40); str('subscription'); nums('gross', 'tax', 'fee', 'net', 'credits', 'months');
    if (fin(a.discount) > 0) { e.discount = fin(a.discount); const k = promoKey(a.promo); if (k) e.promo = k; }
    if (a.feeEstimated) e.feeEstimated = true; if (e.cur !== 'eur' || e.feeCur !== 'eur') e.fx = s.usdEur; }
  if (a.kind === 'refund') { e.cur = cur(a.cur); e.amount = fin(a.amount); if (e.cur !== 'eur') e.fx = s.usdEur; }
  if (a.kind === 'sub-end') { str('subscription'); str('product', 40); }
  if (a.kind === 'credits') { str('reason', 40); e.delta = Math.round(fin(a.delta)); if (!e.delta) return null; }
  if (a.kind === 'trial') { if (!TRIAL_STAGES.includes(a.stage) || !a.subscription) return null; e.stage = a.stage; str('subscription'); str('product', 40); }
  if (a.test && ['payment', 'refund', 'sub-end', 'credits', 'trial'].includes(a.kind)) e.test = true;
  return e;
}

// A day's sums and counts, from one event. Keys: ai.n ai.usd ai.tin ai.tout ai.f.<feature>.(usd|n) ai.m.<model>.(usd|n)
// bl.n bl.secs bl.usd · mail.n mail.usd · pay.n pay.<cur>.(gross|tax|net) pay.<feeCur>.fee pay.p.<product>.n pay.p.<product>.<cur>.gross
// ref.n ref.<cur> · sub.new sub.cancel · cr.used cr.sold cr.in.<reason> cr.out.<reason> · users.new · act.dau act.mau
// pay.<cur>.disc (promotion codes' discounts) promo.<CODE>.n promo.<CODE>.<cur>.(disc|gross) · trial.(start|convert|cancel)
// Test mode, apart: test.pay.n test.pay.<cur>.gross test.ref.n test.ref.<cur> test.sub.new test.sub.cancel test.cr.sold test.cr.in test.cr.out
// test.trial.(start|convert|cancel)
export function bump(t, e) {
  const add = (k, v) => { if (v) t[k] = r6((t[k] || 0) + v); };
  if (e.test) {
    if (e.kind === 'payment') { add('test.pay.n', 1); add(`test.pay.${e.cur}.gross`, e.gross); add('test.cr.sold', e.credits); if (e.newSub) add('test.sub.new', 1); }
    else if (e.kind === 'refund') { add('test.ref.n', 1); add(`test.ref.${e.cur}`, e.amount); }
    else if (e.kind === 'sub-end') { if (e.counted) add('test.sub.cancel', 1); }
    else if (e.kind === 'credits') add(`test.cr.${e.delta > 0 ? 'in' : 'out'}`, Math.abs(e.delta));
    else if (e.kind === 'trial') { if (e.counted) add(`test.trial.${e.stage}`, 1); }
    return t;
  }
  if (e.kind === 'ai') {
    add('ai.n', 1); add('ai.usd', e.usd); add('ai.tin', e.tin); add('ai.tout', e.tout); add('cr.used', e.credits);
    add(`ai.f.${e.feature}.usd`, e.usd); add(`ai.f.${e.feature}.n`, 1);
    if (e.model) { add(`ai.m.${e.model}.usd`, e.usd); add(`ai.m.${e.model}.n`, 1); }
    if (e.blenderSecs || e.blenderUsd) { add('bl.n', 1); add('bl.secs', e.blenderSecs); add('bl.usd', e.blenderUsd); }
  } else if (e.kind === 'email') { add('mail.n', 1); add('mail.usd', e.usd); }
  else if (e.kind === 'payment') {
    add('pay.n', 1); add(`pay.${e.cur}.gross`, e.gross); add(`pay.${e.cur}.tax`, e.tax); add(`pay.${e.feeCur}.fee`, e.fee);
    const p = e.product || 'other'; add(`pay.p.${p}.n`, 1); add(`pay.p.${p}.${e.cur}.gross`, e.gross);
    add('cr.sold', e.credits); if (e.newSub) add('sub.new', 1);
    if (e.discount) { add(`pay.${e.cur}.disc`, e.discount); if (e.promo) { add(`promo.${e.promo}.n`, 1); add(`promo.${e.promo}.${e.cur}.disc`, e.discount); add(`promo.${e.promo}.${e.cur}.gross`, e.gross); } }
  } else if (e.kind === 'refund') { add('ref.n', 1); add(`ref.${e.cur}`, e.amount); }
  else if (e.kind === 'sub-end') { if (e.counted) add('sub.cancel', 1); }
  else if (e.kind === 'credits') add(`cr.${e.delta > 0 ? 'in' : 'out'}.${e.reason || 'other'}`, Math.abs(e.delta));
  else if (e.kind === 'signup') add('users.new', 1);
  else if (e.kind === 'trial') { if (e.counted) add(`trial.${e.stage}`, 1); }
  return t;
}

export class Finance {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage, s = financeSettings(this.env);
    const J = (o, status = 200) => Response.json(o, { status });
    if (op === 'record') {
      const e = clean(a, s); if (!e) return J({ ok: false }, 400);
      if (MONEY.includes(e.kind) && e.ref) { if (await st.get('k:' + e.ref)) return J({ ok: true, duplicate: true }); await st.put('k:' + e.ref, e.at); }
      const day = dayOf(e.at), month = day.slice(0, 7), put = {};
      // Free trials: each stage once per subscription; a cancel only while not converted (else it's an ordinary churn).
      if (e.kind === 'trial') {
        const k = (e.test ? 'trt:' : 'tr:') + e.subscription, old = (await st.get(k)) || {};
        const counts = e.stage === 'start' ? !old.start : !old.convert && !old.cancel;
        if (!counts) return J({ ok: true, duplicate: true });
        e.counted = true; put[k] = { ...old, [e.stage]: e.at };
        const ck = e.test ? 'trialsTest' : 'trials', c = (await st.get(ck)) || {}; c[e.stage] = (c[e.stage] || 0) + 1; put[ck] = c;
      }
      // Promotion codes: their uses ever, and by whom (the admin's «Promociones»; per-customer limits are checked there).
      if (e.kind === 'payment' && e.promo) {
        const k = (e.test ? 'pct:' : 'pc:') + e.promo, x = (await st.get(k)) || { n: 0, money: {}, users: {} }, m = x.money[e.cur] ||= { disc: 0, gross: 0 };
        x.n++; m.disc += e.discount || 0; m.gross += e.gross || 0; if (e.sub) x.users[e.sub] = (x.users[e.sub] || 0) + 1;
        put[k] = x;
      }
      // Subscriptions: started with their first payment, ended when Stripe deletes them.
      const sk = (e.test ? 'ts:' : 's:') + e.subscription;  // (test-mode subscriptions apart: never in MRR or churn)
      if (e.kind === 'payment' && e.subscription) {
        const k = sk, old = await st.get(k), months = Math.max(1, Math.round(e.months || 1));
        put[k] = { id: e.subscription, sub: e.sub || old?.sub || null, product: e.product || old?.product || null, cur: e.cur, monthly: Math.round((e.gross - (e.tax || 0)) / months),
          start: old?.start || e.at, periodEnd: Math.max(old?.periodEnd || 0, e.at + months * 31 * DAY), end: null };
        if (!old) e.newSub = true;
      }
      if (e.kind === 'sub-end' && e.subscription) {
        const k = sk, old = await st.get(k);
        if (old && !old.end) { put[k] = { ...old, end: e.at }; e.counted = true; e.product ??= old.product; e.sub ??= old.sub; }
      }
      // Per account and month: what its AI cost, and what it paid.
      if (e.sub && !e.test && ['ai', 'payment', 'refund'].includes(e.kind)) {
        const k = `u:${month}|${e.sub}`, u = (await st.get(k)) || { usd: 0, cr: 0, n: 0, rev: {} };
        if (e.kind === 'ai') { u.usd = r6(u.usd + (e.usd || 0) + (e.blenderUsd || 0)); u.cr += e.credits || 0; u.n++; }
        if (e.kind === 'payment') u.rev[e.cur] = (u.rev[e.cur] || 0) + (e.gross - (e.tax || 0));
        if (e.kind === 'refund') u.rev[e.cur] = (u.rev[e.cur] || 0) - e.amount;
        put[k] = u;
      }
      const seq = ((await st.get('seq')) || 0) + 1;
      put.seq = seq; put['d:' + day] = bump((await st.get('d:' + day)) || {}, e);
      put[`${MONEY.includes(e.kind) ? 'p' : 'e'}:${tsKey(e.at)}:${String(seq).padStart(9, '0')}`] = e;
      await st.put(put);
      await this.prune();
      return J({ ok: true });
    }
    if (op === 'active') {                                // one account used today (and, mau, the first time this month)
      const k = 'd:' + dayOf(Date.now()), t = (await st.get(k)) || {};
      t['act.dau'] = (t['act.dau'] || 0) + 1; if (a.mau) t['act.mau'] = (t['act.mau'] || 0) + 1;
      await st.put(k, t); return J({ ok: true });
    }
    if (op === 'events') {                                // { cursor, limit, kind } → { events, cursor }  (newest first; raw + money)
      const limit = Math.min(200, Math.max(1, +a.limit || 50)), kind = KINDS.includes(a.kind) ? a.kind : null, cur = /^\d{15}:\d{9}$/.test(a.cursor || '') ? a.cursor : null;
      const got = [];
      for (const p of kind ? [MONEY.includes(kind) ? 'p' : 'e'] : ['e', 'p']) {
        // (Filtered by kind: read on, up to 2000 events, until the page is full.)
        let end = cur ? `${p}:${cur}` : null, n = 0;
        for (let i = 0; i < 10 && n <= limit; i++) {
          const m = [...(await st.list({ prefix: p + ':', reverse: true, limit: kind ? 200 : limit + 1, ...(end && { end }) }))];
          for (const [k, v] of m) if (!kind || v.kind === kind) { got.push([k.slice(2), v]); n++; }
          if (!kind || m.length < 200) break;
          end = m.at(-1)[0];
        }
      }
      got.sort((x, y) => (x[0] < y[0] ? 1 : -1));
      return J({ events: got.slice(0, limit).map(([id, v]) => ({ ...v, id })), cursor: got.length > limit ? got[limit - 1][0] : null });
    }
    if (op === 'trials') return J({ live: (await st.get('trials')) || {}, test: (await st.get('trialsTest')) || {} });
    if (op === 'promos') {                                // → { live: { CODE: … }, test: { CODE: … } }
      const of = async p => Object.fromEntries([...(await st.list({ prefix: p }))].map(([k, v]) => [k.slice(p.length), v]));
      return J({ live: await of('pc:'), test: await of('pct:') });
    }
    if (op === 'entries') return J({ entries: [...(await st.list({ prefix: 'x:' })).values()].sort((x, y) => (x.date < y.date ? 1 : -1)) });
    if (op === 'entry-get') return J({ entry: (await st.get('x:' + a.id)) || null });
    if (op === 'entry-put') { await st.put('x:' + a.entry.id, a.entry); return J({ ok: true, entry: a.entry }); }
    if (op === 'entry-del') { const old = await st.get('x:' + a.id); if (old) await st.delete('x:' + a.id); return J({ ok: !!old, before: old || null }); }
    if (op === 'summary' || op === 'csv') {               // { from, to, group, now? }
      const from = a.from, to = a.to;
      const days = Object.fromEntries([...(await st.list({ prefix: 'd:', start: 'd:' + from, end: 'd:' + to + '~' }))].map(([k, v]) => [k.slice(2), v]));
      const entries = [...(await st.list({ prefix: 'x:' })).values()];
      if (op === 'csv') {
        const lo = tsKey(Date.parse(from)), hi = tsKey(Date.parse(to) + DAY);
        const money = [...(await st.list({ prefix: 'p:', start: 'p:' + lo, end: 'p:' + hi })).values()];
        return new Response(toCsv({ days, entries, money, from, to, s }), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
      }
      const subs = [...(await st.list({ prefix: 's:' })).values()], testSubs = [...(await st.list({ prefix: 'ts:' })).values()], users = {};
      for (const m of monthsOf(from, to)) for (const [k, u] of await st.list({ prefix: `u:${m}|` })) {
        const sub = k.slice(k.indexOf('|') + 1), x = users[sub] ||= { usd: 0, cr: 0, n: 0, rev: {} };
        x.usd += u.usd; x.cr += u.cr; x.n += u.n; for (const [c, v] of Object.entries(u.rev || {})) x.rev[c] = (x.rev[c] || 0) + v;
      }
      return J(summarize({ days, entries, subs, testSubs, users, from, to, group: a.group, s, now: +a.now || Date.now() }));
    }
    return J({ error: 'unknown' }, 404);
  }
  // Raw events older than RAW_DAYS go (their day's sums stay); at most once an hour, a batch at a time.
  async prune() {
    const st = this.ctx.storage, now = Date.now(); if (now - ((await st.get('pruned')) || 0) < 3600e3) return;
    const old = [...(await st.list({ prefix: 'e:', end: 'e:' + tsKey(now - RAW_DAYS * DAY), limit: 1000 })).keys()];
    for (let i = 0; i < old.length; i += 128) await st.delete(old.slice(i, i + 128));
    await st.put('pruned', now);
  }
}

// ---- Reports ----------------------------------------------------------------------------------
export function monthsOf(from, to) {
  const out = []; let [y, m] = from.slice(0, 7).split('-').map(Number); const [y2, m2] = to.slice(0, 7).split('-').map(Number);
  while (y < y2 || (y === y2 && m <= m2)) { out.push(`${y}-${String(m).padStart(2, '0')}`); if (++m > 12) { m = 1; y++; } }
  return out;
}
const daysIn = month => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
// What a manual fixed cost costs on a day, in its currency (a monthly one spread over the month's days).
export function fixedOn(e, day) {
  if (e.type !== 'fixed') return 0;
  if (!e.recurring) return e.date === day ? e.amount : 0;
  if (day.slice(0, 7) < e.date.slice(0, 7) || (e.until && day.slice(0, 7) > e.until.slice(0, 7))) return 0;
  return e.amount / daysIn(day.slice(0, 7));
}
const subActive = (x, t) => x.start <= t && (!x.end || x.end > t) && x.periodEnd + 7 * DAY >= t;
const PRO = p => /^pro/.test(p || '');

// Everything the «Negocio» page shows, in EUR (USD at s.usdEur). Pure: tested with a synthetic dataset.
export function summarize({ days, entries, subs, testSubs = [], users, from, to, group = 'month', s, now = Date.now() }) {
  const R = s.usdEur, toEur = (cur, major) => (cur === 'usd' ? major * R : major);   // (other currencies: as EUR; see warnings)
  const warnings = new Set(), key = group === 'day' ? d => d : d => d.slice(0, 7);
  const blank = k => ({ key: k, gross: 0, discounts: 0, list: 0, tax: 0, fees: 0, refunds: 0, revenue: 0, net: 0, ai: 0, blender: 0, email: 0, variable: 0, fixed: 0, costs: 0, grossProfit: 0, profit: 0,
    dau: 0, days: 0, mau: 0, signups: 0, newSubs: 0, cancels: 0, hours: 0, credits: { sold: 0, granted: 0, used: 0, expired: 0 }, mrr: 0, subs: 0, pro: 0 });
  const buckets = new Map(), T = blank('total');
  const aiF = {}, aiM = {}, products = {}, crIn = {}, crOut = {}, hoursCat = {}, hoursMonth = {}, fixedCat = {}, promos = {}, trials = { start: 0, convert: 0, cancel: 0 };
  let aiUsd = 0, tokens = { in: 0, out: 0 }, aiN = 0, blSecs = 0, blN = 0, mailN = 0, payN = 0, refN = 0;
  // Stripe's test mode: counted here only (the 'test.*' keys match none of the patterns below).
  const test = { payments: 0, gross: 0, refunds: 0, refunded: 0, newSubs: 0, cancels: 0, active: 0, credits: { sold: 0, granted: 0, taken: 0 }, trials: { start: 0, convert: 0, cancel: 0 } };
  const fixed = entries.filter(e => e.type === 'fixed'), time = entries.filter(e => e.type === 'time');
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) {
    const d = dayOf(t), a = days[d] || {}, b = buckets.get(key(d)) || buckets.set(key(d), blank(key(d))).get(key(d));
    const add = (f, v) => { b[f] += v; T[f] += v; };
    for (const [k, v] of Object.entries(a)) {
      let m;
      if ((m = k.match(/^pay\.([a-z]{3})\.(gross|tax|fee|disc)$/))) { if (!['eur', 'usd'].includes(m[1])) warnings.add('currency:' + m[1]); add({ fee: 'fees', disc: 'discounts' }[m[2]] || m[2], toEur(m[1], v / 100)); }
      else if ((m = k.match(/^promo\.([A-Z0-9_-]+)\.(n|([a-z]{3})\.(disc|gross))$/))) { const x = promos[m[1]] ||= { n: 0, discount: 0, gross: 0 }; if (m[2] === 'n') x.n += v; else x[m[4] === 'disc' ? 'discount' : 'gross'] += toEur(m[3], v / 100); }
      else if ((m = k.match(/^(test\.)?trial\.(start|convert|cancel)$/))) (m[1] ? test.trials : trials)[m[2]] += v;
      else if ((m = k.match(/^ref\.([a-z]{3})$/))) add('refunds', toEur(m[1], v / 100));
      else if ((m = k.match(/^ai\.f\.([\w-]+)\.(usd|n)$/))) { const x = aiF[m[1]] ||= { usd: 0, n: 0 }; x[m[2]] += v; }
      else if ((m = k.match(/^ai\.m\.(.+)\.(usd|n)$/))) { const x = aiM[m[1]] ||= { usd: 0, n: 0 }; x[m[2]] += v; }
      else if ((m = k.match(/^pay\.p\.([\w-]+)\.(n|[a-z]{3}\.gross)$/))) { const x = products[m[1]] ||= { n: 0, gross: 0 }; if (m[2] === 'n') x.n += v; else x.gross += toEur(m[2].slice(0, 3), v / 100); }
      else if ((m = k.match(/^cr\.(in|out)\.([\w-]+)$/))) { const o = m[1] === 'in' ? crIn : crOut; o[m[2]] = (o[m[2]] || 0) + v; }
      else if ((m = k.match(/^test\.pay\.([a-z]{3})\.gross$/))) test.gross += toEur(m[1], v / 100);
      else if ((m = k.match(/^test\.ref\.([a-z]{3})$/))) test.refunded += toEur(m[1], v / 100);
    }
    test.payments += a['test.pay.n'] || 0; test.refunds += a['test.ref.n'] || 0; test.newSubs += a['test.sub.new'] || 0; test.cancels += a['test.sub.cancel'] || 0;
    test.credits.sold += a['test.cr.sold'] || 0; test.credits.granted += a['test.cr.in'] || 0; test.credits.taken += a['test.cr.out'] || 0;
    const fx = (a['ai.usd'] || 0) * R, bl = (a['bl.usd'] || 0) * R, ml = (a['mail.usd'] || 0) * R;
    aiUsd += a['ai.usd'] || 0; tokens.in += a['ai.tin'] || 0; tokens.out += a['ai.tout'] || 0; aiN += a['ai.n'] || 0; blSecs += a['bl.secs'] || 0; blN += a['bl.n'] || 0;
    mailN += a['mail.n'] || 0; payN += a['pay.n'] || 0; refN += a['ref.n'] || 0;
    add('ai', fx); add('blender', bl); add('email', ml);
    let fc = 0; for (const e of fixed) { const v = toEur(e.currency, fixedOn(e, d)); if (v) { fc += v; fixedCat[e.category] = (fixedCat[e.category] || 0) + v; } }
    add('fixed', fc);
    add('dau', a['act.dau'] || 0); add('days', 1); add('mau', a['act.mau'] || 0); add('signups', a['users.new'] || 0);
    add('newSubs', a['sub.new'] || 0); add('cancels', a['sub.cancel'] || 0);
    const cr = { sold: a['cr.sold'] || 0, granted: Object.entries(a).filter(([k]) => k.startsWith('cr.in.')).reduce((x, [, v]) => x + v, 0), used: a['cr.used'] || 0, expired: a['cr.out.expired'] || 0 };
    for (const k in cr) { b.credits[k] += cr[k]; T.credits[k] += cr[k]; }
  }
  for (const e of time) {
    if (e.date < from || e.date > to) continue;
    const b = buckets.get(key(e.date)); b.hours += e.hours; T.hours += e.hours;
    hoursCat[e.category] = (hoursCat[e.category] || 0) + e.hours;
    const hm = hoursMonth[e.date.slice(0, 7)] ||= {}; hm[e.category] = (hm[e.category] || 0) + e.hours;
  }
  // Subscriptions: MRR (net of tax, a year's price / 12) at the end of each bucket, and at the end of the period.
  const mrrAt = t => { let mrr = 0, n = 0, pro = 0; for (const x of subs) if (subActive(x, t)) { mrr += toEur(x.cur, x.monthly / 100); n++; if (PRO(x.product)) pro++; } return { mrr, n, pro }; };
  const ends = k => Math.min(now, Date.parse(to) + DAY, group === 'day' ? Date.parse(k) + DAY : Date.parse(k + '-01') + daysIn(k) * DAY) - 1;
  const finish = (b, at) => {
    b.list = b.gross + b.discounts; b.revenue = b.gross - b.tax; b.net = b.revenue - b.fees - b.refunds; b.variable = b.ai + b.blender + b.email; b.costs = b.variable + b.fixed;
    b.grossProfit = b.net - b.variable; b.profit = b.grossProfit - b.fixed;
    if (at) { const m = mrrAt(at); b.mrr = m.mrr; b.subs = m.n; b.pro = m.pro; }
  };
  const series = [...buckets.values()]; for (const b of series) finish(b, ends(b.key)); finish(T, Math.min(now, Date.parse(to) + DAY - 1));
  const start = mrrAt(Date.parse(from)), userMonths = series.reduce((x, b) => x + (group === 'day' ? 0 : b.mau), 0) || T.mau;
  const months = Math.max(1, (Date.parse(to) + DAY - Date.parse(from)) / (30.44 * DAY));
  const fixedMonthly = fixed.filter(e => e.recurring && e.date.slice(0, 7) <= to.slice(0, 7) && (!e.until || e.until.slice(0, 7) >= to.slice(0, 7))).reduce((x, e) => x + toEur(e.currency, e.amount), 0);
  const arpuSub = T.subs ? T.mrr / T.subs : 0;
  const top = Object.entries(users).map(([sub, u]) => {
    const cost = u.usd * R, rev = Object.entries(u.rev).reduce((x, [c, v]) => x + toEur(c, v / 100), 0);
    return { sub, costUsd: r6(u.usd), cost: r2(cost), revenue: r2(rev), profit: r2(rev - cost), credits: u.cr, requests: u.n };
  }).sort((x, y) => y.cost - x.cost).slice(0, 25);
  const round = b => { const o = { ...b }; for (const k of ['gross', 'discounts', 'list', 'tax', 'fees', 'refunds', 'revenue', 'net', 'ai', 'blender', 'email', 'variable', 'fixed', 'costs', 'grossProfit', 'profit', 'mrr']) o[k] = r2(o[k]); o.hours = r2(o.hours); return o; };
  const ratio = (x, y) => (y ? Math.round((x / y) * 1e4) / 1e4 : null);
  const byUsd = o => Object.fromEntries(Object.entries(o).sort((x, y) => y[1].usd - x[1].usd).map(([k, v]) => [k, { usd: r6(v.usd), eur: r2(v.usd * R), n: v.n }]));
  return {
    from, to, group, currency: 'EUR', fx: { USD_EUR: R }, warnings: [...warnings],
    totals: round(T),
    margins: { gross: ratio(T.grossProfit, T.net), net: ratio(T.profit, T.net) },
    series: series.map(round),
    revenue: { payments: payN, refunds: refN, products: Object.fromEntries(Object.entries(products).map(([k, v]) => [k, { n: v.n, gross: r2(v.gross) }])) },
    // (Promotion codes: uses, what they took off and what was paid with them; gross before discounts = totals.list.)
    promos: Object.fromEntries(Object.entries(promos).sort((x, y) => y[1].n - x[1].n).map(([k, v]) => [k, { n: v.n, discount: r2(v.discount), gross: r2(v.gross) }])),
    // (Pro's free trial: conversion = converted / (converted + cancelled), the trials that ended in the period.)
    trials: { started: trials.start, converted: trials.convert, cancelled: trials.cancel, conversion: ratio(trials.convert, trials.convert + trials.cancel) },
    ai: { usd: r6(aiUsd), eur: r2(aiUsd * R), requests: aiN, tokens, byFeature: byUsd(aiF), byModel: byUsd(aiM) },
    blender: { seconds: r2(blSecs), runs: blN, eur: r2(T.blender) }, email: { sent: mailN, eur: r2(T.email) },
    subscriptions: { mrr: r2(T.mrr), active: T.subs, pro: T.pro, atStart: start.n, new: T.newSubs, cancelled: T.cancels, churn: ratio(T.cancels / months, (start.n + T.subs) / 2), arpu: r2(arpuSub) },
    users: { signups: T.signups, dauAvg: T.days ? r2(T.dau / T.days) : 0, mau: group === 'day' ? T.mau : series.at(-1)?.mau || 0, userMonths,
      conversion: ratio(T.newSubs, T.signups), arpu: userMonths ? r2(T.net / userMonths) : null, costPerActive: userMonths ? r2(T.variable / userMonths) : null },
    credits: { ...T.credits, granted: crIn, taken: crOut },
    time: { hours: r2(T.hours), byCategory: hoursCat, byMonth: hoursMonth, profitPerHour: T.hours ? r2(T.profit / T.hours) : null },
    fixed: { total: r2(T.fixed), byCategory: Object.fromEntries(Object.entries(fixedCat).map(([k, v]) => [k, r2(v)])), monthly: r2(fixedMonthly) },
    breakEven: { fixedMonthly: r2(fixedMonthly), grossProfitMonthly: r2(T.grossProfit / months), reached: T.grossProfit / months >= fixedMonthly,
      subsNeeded: arpuSub > 0 ? Math.ceil(fixedMonthly / arpuSub) : null },
    topUsers: top,
    // (Stripe's test mode: nothing here was real money; never in the figures above.)
    test: { ...test, trials: { started: test.trials.start, converted: test.trials.convert, cancelled: test.trials.cancel }, gross: r2(test.gross), refunded: r2(test.refunded), active: testSubs.filter(x => subActive(x, Math.min(now, Date.parse(to) + DAY - 1))).length },
  };
}

// ---- CSV for the accountant: payments, refunds, cancellations, the day's costs, fixed costs, hours ----
// ';'-separated, decimal comma (as a Spanish spreadsheet opens it), UTF-8 with BOM; text that a
// spreadsheet would run as a formula (=, +, -, @) is prefixed with '.
const cell = v => {
  if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6).replace('.', ',');
  let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const CSV_HEAD = ['fecha', 'tipo', 'concepto', 'categoría', 'importe', 'moneda', 'impuestos', 'comisión', 'neto', 'importe_eur', 'tipo_cambio_usd_eur', 'horas', 'cuenta', 'referencia'];
export function toCsv({ days, entries, money, from, to, s }) {
  const R = s.usdEur, eur = (cur, v) => (cur === 'usd' ? v * R : v), rows = [];
  const row = o => rows.push([o.date, o.type, o.what || '', o.cat || '', o.amount ?? '', o.cur ? o.cur.toUpperCase() : '', o.tax ?? '', o.fee ?? '', o.net ?? '',
    o.amount != null && o.cur ? Math.round(eur(o.cur, o.amount) * 100) / 100 : '', o.cur === 'usd' ? R : '', o.hours ?? '', o.sub || '', o.ref || '']);
  for (const e of money) {
    if (e.test) continue;                                 // (Stripe's test mode: no real money)
    const date = dayOf(e.at);
    if (e.kind === 'payment') row({ date, type: 'ingreso', what: (e.product || '') + (e.feeCur !== e.cur ? ` (comisión en ${e.feeCur.toUpperCase()})` : '') + (e.feeEstimated ? ' (comisión estimada)' : '')
      + (e.discount ? ` (descuento ${r2(e.discount / 100)} ${e.cur.toUpperCase()}${e.promo ? ', código ' + e.promo : ''})` : ''), amount: e.gross / 100, cur: e.cur, tax: (e.tax || 0) / 100, fee: (e.fee || 0) / 100,
      net: (e.gross - (e.tax || 0) - (e.feeCur === e.cur ? e.fee || 0 : 0)) / 100, sub: e.sub, ref: e.ref });
    if (e.kind === 'refund') row({ date, type: 'reembolso', amount: -e.amount / 100, cur: e.cur, net: -e.amount / 100, sub: e.sub, ref: e.ref });
    if (e.kind === 'sub-end') row({ date, type: 'baja', what: e.product, sub: e.sub, ref: e.ref });
  }
  for (const [date, a] of Object.entries(days).sort()) {
    if (a['ai.usd']) row({ date, type: 'coste', what: `IA (${a['ai.n'] || 0} peticiones)`, cat: 'ia', amount: -r6(a['ai.usd']), cur: 'usd' });
    if (a['bl.usd']) row({ date, type: 'coste', what: `Blender (${r2(a['bl.secs'] || 0)} s)`, cat: 'blender', amount: -r6(a['bl.usd']), cur: 'usd' });
    if (a['mail.usd']) row({ date, type: 'coste', what: `Correo (${a['mail.n'] || 0})`, cat: 'correo', amount: -r6(a['mail.usd']), cur: 'usd' });
  }
  for (const e of entries) {
    if (e.type === 'time') { if (e.date >= from && e.date <= to) row({ date: e.date, type: 'horas', what: e.note, cat: e.category, hours: e.hours, ref: e.id }); continue; }
    if (!e.recurring) { if (e.date >= from && e.date <= to) row({ date: e.date, type: 'gasto fijo', what: e.name, cat: e.category, amount: -e.amount, cur: e.currency, ref: e.id }); continue; }
    for (const m of monthsOf(from, to)) {                // (a monthly one: once per month, on the period's first day of it)
      if (m < e.date.slice(0, 7) || (e.until && m > e.until.slice(0, 7))) continue;
      row({ date: m + '-01' < from ? from : m + '-01', type: 'gasto fijo', what: e.name + ' (mensual)', cat: e.category, amount: -e.amount, cur: e.currency, ref: e.id });
    }
  }
  rows.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  return '﻿' + [CSV_HEAD, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

// ---- Manual entries from the admin (checked here; written by admin.js with the audit log) ----
export function cleanEntry(b) {
  const id = /^[a-f0-9]{12}$/.test(b?.id || '') ? b.id : [...crypto.getRandomValues(new Uint8Array(6))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (b?.type === 'fixed') {
    const name = clip(b.name, 120).trim(), amount = Math.round(+b.amount * 100) / 100, currency = String(b.currency || 'eur').toLowerCase();
    if (!name || !(amount > 0 && amount <= 1e7) || !['eur', 'usd'].includes(currency) || !isDay(b.date) || !FIXED_CATS.includes(b.category)) return null;
    if (b.until && (!isDay(b.until) || b.until < b.date)) return null;
    return { id, type: 'fixed', name, amount, currency, date: b.date, recurring: !!b.recurring, ...(b.recurring && b.until && { until: b.until }), category: b.category };
  }
  if (b?.type === 'time') {
    const hours = Math.round(+b.hours * 100) / 100;
    if (!(hours > 0 && hours <= 24) || !isDay(b.date) || !TIME_CATS.includes(b.category)) return null;
    return { id, type: 'time', date: b.date, hours, category: b.category, note: clip(b.note, 500).trim() };
  }
  return null;
}
export const periodOk = (from, to) => isDay(from) && isDay(to) && from <= to && Date.parse(to) - Date.parse(from) <= 3 * 366 * DAY;
