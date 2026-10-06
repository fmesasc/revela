// Payments with Stripe (api.js routes /api/billing/… and the webhook): the prices, live and test mode, Pro's free
// trial, Checkout and the customer portal, the signed webhook that grants what was paid, and the business's
// records of each payment (finance.js).

import { record, financeSettings } from './finance.js';
import { campaignPurchase } from './crm.js';
import { enc, DAY } from './util.js';
import { credits } from './ai.js';
import { hex, settings, trialConfig, acct, call } from './api.js';

// Stripe has two configurations: live (real money) and test (Stripe's test mode: test cards, nothing charged).
//   live: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_{PRO_MONTH,PRO_YEAR,CREDITS_500,CREDITS_1500,TEAM_SEAT}
//   test: STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET, STRIPE_TEST_PRICE_{…the same}
// An account pays in test mode when an admin marked it (Account 'billingTest', admin.js) or when the
// plain var STRIPE_MODE = 'test' (everyone; default live). What test mode grants is marked test: true
// (plan, credit lots, ledger, finance) and kept out of the business's figures.
export const PRICE_VARS = { 'pro-month': 'PRO_MONTH', 'pro-year': 'PRO_YEAR', 'credits-500': 'CREDITS_500', 'credits-1500': 'CREDITS_1500', 'team-seat': 'TEAM_SEAT' };
export function stripeConf(env, mode = 'live') {
  const P = mode === 'test' ? 'STRIPE_TEST_' : 'STRIPE_', key = env[P + 'SECRET_KEY'] || '', webhook = env[P + 'WEBHOOK_SECRET'] || '';
  return { mode: mode === 'test' ? 'test' : 'live', key, webhook, ok: !!(key && webhook),
    prices: Object.fromEntries(Object.entries(PRICE_VARS).map(([k, v]) => [k, env[P + 'PRICE_' + v] || ''])) };
}
export const globalTest = env => String(env.STRIPE_MODE || '').trim().toLowerCase() === 'test';
export const billingMode = (env, accountTest) => (accountTest || globalTest(env) ? 'test' : 'live');
// ---- Payments (Stripe) ------------------------------------------------------------------------------------
// Live or test (stripeConf, billingMode): the key, the prices and the account's customer of that mode.
export const stripe = (env, key, path, params) => (env.FETCH || fetch)('https://api.stripe.com/v1/' + path, { method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
// The days of Pro's free trial this account may get now (0: none).
export async function trialOffer(env, A, mode) {
  const tc = await trialConfig(env);
  return tc.trialDays > 0 && (await call(A, 'trial-ok', { test: mode === 'test', once: tc.trialOncePerAccount })).ok ? tc.trialDays : 0;
}
export async function checkout(env, s, me, A, body, json) {
  const p = s.products[body.product], c = await call(A, 'customer'), mode = billingMode(env, c.billingTest), conf = stripeConf(env, mode);
  if (mode === 'test' && !conf.ok) return json({ error: 'billing test not configured' }, 503);
  const price = conf.prices[body.product], customer = mode === 'test' ? c.customerTest : c.customer;
  if (!conf.key || !p || !price) return json({ error: 'billing not available' }, 503);
  let team = null, seats = 1;
  if (p.team) {                                            // (a team's seats: its admin buys them)
    team = (await call(A, 'team-id')).id; if (!team) return json({ error: 'no team' }, 400);
    const tc = await (await env.TEAMS.get(env.TEAMS.idFromName('team:' + team)).fetch('https://team/customer', { method: 'POST', body: JSON.stringify({ email: c.email }) })).json();
    if (!tc.admin) return json({ error: 'forbidden' }, 403);
    seats = Math.max(3, Math.min(1000, Math.round(+body.seats || 3)));   // (3 seats at least)
  }
  // (Pro's free trial: a card is still asked for — payment_method_collection — and without one at its end it's cancelled.)
  const trial = p.mode === 'subscription' && !p.team && /^pro-/.test(body.product) ? await trialOffer(env, A, mode) : 0;
  const params = { mode: p.mode, 'line_items[0][price]': price, 'line_items[0][quantity]': String(seats), client_reference_id: me.sub,
    success_url: `${s.site}/app/?paid=1`, cancel_url: `${s.site}/pricing`, 'metadata[sub]': me.sub, 'metadata[product]': body.product,
    ...(customer ? { customer } : { customer_email: c.email }),
    ...(p.mode === 'subscription' && { 'subscription_data[metadata][sub]': me.sub }),
    ...(trial && { 'subscription_data[trial_period_days]': String(trial), 'subscription_data[metadata][trial]': String(trial), payment_method_collection: 'always',
      'subscription_data[trial_settings][end_behavior][missing_payment_method]': 'cancel' }),
    // (Promotion codes made in the admin, «Promociones»: Checkout shows «Añadir código promocional».)
    allow_promotion_codes: 'true',
    ...(team && { 'metadata[team]': team, 'subscription_data[metadata][team]': team }),
    // (An invoice for one-off purchases too; and, by the pay button, the request for immediate
    // activation that waives the 14-day withdrawal right — Art. 103 m) of the Spanish consumer law.)
    ...(p.mode === 'payment' && { 'invoice_creation[enabled]': 'true' }),
    // (With Stripe Tax on — STRIPE_AUTOMATIC_TAX=1 — Stripe adds each country's tax to the price
    // and asks for the address it needs; a business can give its VAT number.)
    ...(env.STRIPE_AUTOMATIC_TAX === '1' && { 'automatic_tax[enabled]': 'true', 'tax_id_collection[enabled]': 'true',
      ...(customer && { 'customer_update[address]': 'auto', 'customer_update[name]': 'auto' }) }),
    'custom_text[submit][message]': 'Al pagar pides que se active ya y aceptas que, una vez activado, pierdes el derecho de desistimiento de 14 días (art. 103 LGDCU). Condiciones: ' + s.site + '/terms.html',
    locale: 'auto' };
  const r = await stripe(env, conf.key, 'checkout/sessions', params);
  const d = await r.json().catch(() => ({}));
  return d.url ? json({ url: d.url, ...(mode === 'test' && { test: true }), ...(trial && { trialDays: trial }) }) : json({ error: 'billing failed' }, 502);
}
export async function portal(env, s, A, json) {
  const c = await call(A, 'customer'), mode = billingMode(env, c.billingTest), conf = stripeConf(env, mode), customer = mode === 'test' ? c.customerTest : c.customer;
  if (mode === 'test' && !conf.ok) return json({ error: 'billing test not configured' }, 503);
  if (!conf.key) return json({ error: 'billing not available' }, 503);
  // (Nothing paid in this mode — a Pro from test mode, a gift or a team —: no Stripe customer to manage.)
  if (!customer) return json({ error: 'no customer' }, 404);
  const d = await (await stripe(env, conf.key, 'billing_portal/sessions', { customer, return_url: `${s.site}/app/` })).json().catch(() => ({}));
  return d.url ? json({ url: d.url }) : json({ error: 'billing failed' }, 502);
}
// Stripe's signature: HMAC-SHA256 of "timestamp.body" with the webhook secret, at most 5 minutes old.
export async function verifyStripe(body, header, secret, now = Date.now()) {
  const parts = Object.fromEntries(String(header || '').split(',').map(x => x.split('=')).filter(x => x.length === 2).map(([k, v]) => [k, v]));
  const t = +parts.t; if (!t || !parts.v1 || Math.abs(now / 1000 - t) > 300 || !secret) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`)));
  const all = String(header).split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  return all.some(v => v.length === sig.length && [...v].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ sig.charCodeAt(i)), 0) === 0);
}
// /api/billing/webhook (live) and /api/billing/webhook-test (test: STRIPE_TEST_WEBHOOK_SECRET). A test event
// grants the same (Pro, credits, seats) marked test, and only to an account in test mode (billingTest) — or
// to anyone with STRIPE_MODE = 'test'; any other is logged and ignored.
// Events: checkout.session.completed, invoice.paid, customer.subscription.updated, customer.subscription.deleted,
// charge.refunded and customer.subscription.trial_will_end (Pro's free trial ends in 3 days: an optional email).
export async function stripeWebhook(req, env, json, mode) {
  const conf = stripeConf(env, mode), body = await req.text(), test = mode === 'test';
  if (test && !conf.webhook) return json({ error: 'billing test not configured' }, 503);
  if (!(await verifyStripe(body, req.headers.get('Stripe-Signature'), conf.webhook))) return json({ error: 'signature' }, 400);
  const ev = JSON.parse(body), o = ev.data?.object || {}, s = settings(env);
  const teamOf = x => x?.metadata?.team || x?.subscription_details?.metadata?.team || x?.parent?.subscription_details?.metadata?.team || null;
  const subOf = x => x?.metadata?.sub || x?.client_reference_id || x?.subscription_details?.metadata?.sub || x?.parent?.subscription_details?.metadata?.sub;
  if (test && !globalTest(env)) {
    const sub = subOf(o), ok = sub ? (await call(acct(env, sub), 'billing-test')).test : false;
    if (!ok) { console.log(JSON.stringify({ stripe: 'test event ignored', type: ev.type, id: ev.id, sub: sub || null })); return json({ ok: true, ignored: true }); }
  }
  const T = test ? { test: true } : {};
  await moneyEvent(env, s, conf, ev, o, subOf(o), teamOf(o));
  if (ev.type === 'checkout.session.completed') {
    const sub = subOf(o); if (!sub) return json({ ok: true });
    const p = s.products[o.metadata?.product];
    if (o.mode === 'payment' && p?.credits && o.payment_status === 'paid') await call(acct(env, sub), 'grant', { credits: p.credits, reason: 'purchase', ref: ev.id, days: s.packDays, ...T });
    if (o.customer) await call(acct(env, sub), 'set-customer', { customer: o.customer, ...T });
  } else if (ev.type === 'invoice.paid' && teamOf(o)) {
    // A team's month: its seats and until when; each member gets the month's credits.
    const id = teamOf(o), line = o.lines?.data?.[0] || {}, end = (+line.period?.end || (Date.now() / 1000 + 31 * 86400)) * 1000 + 3 * DAY;
    const r = await (await env.TEAMS.get(env.TEAMS.idFromName('team:' + id)).fetch('https://team/billing', { method: 'POST', body: JSON.stringify({ seats: +line.quantity || 1, until: end, customer: o.customer, ...T }) })).json();
    // (Each member's month of credits comes with their account's next request: see Account.monthly.)
    void r;
  } else if (ev.type === 'customer.subscription.deleted' && teamOf(o)) {
    await env.TEAMS.get(env.TEAMS.idFromName('team:' + teamOf(o))).fetch('https://team/billing', { method: 'POST', body: JSON.stringify({ until: 0, ...T }) });
  } else if (ev.type === 'invoice.paid') {
    const sub = subOf(o); if (!sub) return json({ ok: true });
    const A = acct(env, sub), trial = trialStart(o);
    // (3 days' grace; a free trial's invoice — 0, at the start — until its end and one day.)
    const end = (+o.lines?.data?.[0]?.period?.end || (Date.now() / 1000 + 31 * 86400)) * 1000 + (trial ? DAY : 3 * DAY);
    await call(A, 'setplan', { name: 'pro', until: end, customer: o.customer, ...T, ...(trial && { trial: true, trialCredits: (await trialConfig(env)).trialCredits }) });
    await call(A, 'me');                                   // (its month of credits now, if due: Account.monthly)
  } else if (ev.type === 'customer.subscription.trial_will_end' && !teamOf(o)) {
    // Three days before a free trial ends (Stripe's default): what will be charged, and how to cancel (optional notice).
    const sub = subOf(o); if (!sub || o.cancel_at_period_end || o.cancel_at || (o.status && o.status !== 'trialing')) return json({ ok: true });
    await call(acct(env, sub), 'trial-ending', { end: +o.trial_end * 1000, ref: o.id || ev.id });
  } else if (ev.type === 'customer.subscription.updated' && !teamOf(o)) {
    // Cancelled (it ends at the end of the period), or renewed again: told now, and reminded a week before.
    const sub = subOf(o); if (!sub) return json({ ok: true });
    const end = (+o.cancel_at || +o.current_period_end || +o.items?.data?.[0]?.current_period_end || 0) * 1000;
    await call(acct(env, sub), 'plan-ending', { end: (o.cancel_at_period_end || o.cancel_at) && end > Date.now() ? end : 0 });
  } else if (ev.type === 'customer.subscription.deleted') {
    const sub = subOf(o);
    if (sub) { const A = acct(env, sub), r = await call(A, 'setplan', { name: 'free', until: 0, ...T }); if (!r.ignored) await call(A, 'plan-ended', { ref: o.id || ev.id }); }
  }
  return json({ ok: true });
}
// ---- The business's accounts (finance.js): what each Stripe event brought in or gave back ----------
// Payments: one-off purchases at checkout; subscriptions (Pro, team seats) at each paid invoice (an invoice
// of a one-off purchase is already counted at its checkout). Amounts in minor units, as Stripe sends them.
// Stripe's fee comes from the payment's balance transaction (read with the mode's key); if that fails,
// it is estimated with STRIPE_FEE_PCT and STRIPE_FEE_FIXED. Each event once (finance.js keeps its id).
// Test-mode events are recorded with test: true (finance.js keeps them out of every total).
export const stripeGet = (env, key, path, params) => (env.FETCH || fetch)('https://api.stripe.com/v1/' + path + '?' + new URLSearchParams(params), { headers: { Authorization: `Bearer ${key}` } })
  .then(r => (r.ok ? r.json() : null)).catch(() => null);
export async function stripeFee(env, { charge, intent, gross, cur }, key = env.STRIPE_SECRET_KEY) {
  const id = x => (typeof x === 'string' && /^[\w-]{3,100}$/.test(x) ? x : null);
  let bt = null;
  if (key && id(charge)) bt = (await stripeGet(env, key, 'charges/' + id(charge), { 'expand[]': 'balance_transaction' }))?.balance_transaction;
  else if (key && id(intent)) bt = (await stripeGet(env, key, 'payment_intents/' + id(intent), { 'expand[]': 'latest_charge.balance_transaction' }))?.latest_charge?.balance_transaction;
  if (bt && typeof bt === 'object' && Number.isFinite(+bt.fee)) return { fee: +bt.fee, feeCur: String(bt.currency || cur).toLowerCase() };
  const f = financeSettings(env);
  return { fee: gross > 0 ? Math.round((gross * f.feePct) / 100 + f.feeFixed * 100) : 0, feeCur: cur, feeEstimated: true };
}
// A subscription's metadata, as an invoice carries it (old and new API shapes).
export const subMeta = o => o?.parent?.subscription_details?.metadata || o?.subscription_details?.metadata || {};
// The invoice that starts a free trial (nothing to pay; checkout() marks the subscription with trial).
export const trialStart = o => !!subMeta(o).trial && !(+o.amount_paid > 0) && o.billing_reason === 'subscription_create';
// The promotion code used (its text: «LANZAMIENTO30»), from a Checkout Session or an invoice: read from Stripe
// when the event only carries ids (best effort; else the id).
export async function promoOf(env, key, o) {
  const objs = x => [].concat(x || []).filter(d => d && typeof d === 'object');
  let d = objs(o.discounts).concat(objs(o.discount)).find(x => x.promotion_code);
  if (!d && key && o.object === 'invoice' && /^in_[\w]+$/.test(o.id || '') && [].concat(o.discounts || []).some(x => typeof x === 'string'))
    d = objs((await stripeGet(env, key, 'invoices/' + o.id, { 'expand[]': 'discounts' }))?.discounts).find(x => x.promotion_code);
  const pc = d?.promotion_code; if (!pc) return null;
  if (typeof pc === 'object') return pc.code || pc.id || null;
  if (!/^promo_[\w]+$/.test(pc)) return null;
  return (key && (await stripeGet(env, key, 'promotion_codes/' + pc, {}))?.code) || pc;
}
export async function moneyEvent(env, s, conf, ev, o, sub, team) {
  if (!env.FINANCE) return;
  const cur = String(o.currency || 'eur').toLowerCase(), ref = ev.id, T = conf.mode === 'test' ? { test: true } : {};
  if (ev.type === 'checkout.session.completed' && o.mode === 'payment' && o.payment_status === 'paid') {
    const gross = +o.amount_total || 0, p = s.products[o.metadata?.product], discount = +o.total_details?.amount_discount || 0;
    if (!T.test && sub) await campaignPurchase(env, sub, gross - (+o.total_details?.amount_tax || 0));   // (crm.js: the campaign that brought them)
    await record(env, { kind: 'payment', product: o.metadata?.product || 'other', cur, gross, tax: +o.total_details?.amount_tax || 0, ...(p?.credits && { credits: p.credits }),
      ...(discount > 0 && { discount, promo: await promoOf(env, conf.key, o) }),
      sub, ref, ...T, ...(await stripeFee(env, { intent: o.payment_intent, gross, cur }, conf.key)) });
  } else if (ev.type === 'invoice.paid') {
    const line = o.lines?.data?.[0] || {}, pay = o.payments?.data?.[0]?.payment || {};
    const subscription = o.subscription || o.parent?.subscription_details?.subscription || line.subscription || line.parent?.subscription_item_details?.subscription
      || ((o.subscription_details || o.parent?.subscription_details || /^subscription/.test(o.billing_reason || '')) && o.customer ? 'cus:' + o.customer : null);
    const price = line.price?.id || line.pricing?.price_details?.price || line.plan?.id;
    const product = team ? 'team-seat' : Object.keys(conf.prices).find(k => conf.prices[k] && conf.prices[k] === price) || 'pro';
    // Free trials: started (the 0 invoice at the start), converted (its first invoice after), each once (finance.js).
    if (subscription && subMeta(o).trial && !team) {
      const stage = trialStart(o) ? 'start' : o.billing_reason !== 'subscription_create' ? 'convert' : null;
      if (stage) await record(env, { kind: 'trial', stage, subscription, product, sub: sub || null, ref: ref + ':trial', ...T });
    }
    const gross = +o.amount_paid || 0; if (!subscription || gross <= 0) return;
    const span = (+line.period?.end - +line.period?.start) * 1000, months = span > 0 ? Math.max(1, Math.round(span / (30.44 * DAY))) : 1;
    const tax = +o.tax || (o.total_taxes || []).reduce((t, x) => t + (+x.amount || 0), 0) || (o.total_tax_amounts || []).reduce((t, x) => t + (+x.amount || 0), 0);
    const discount = (o.total_discount_amounts || []).reduce((t, x) => t + (+x.amount || 0), 0);
    if (!T.test && sub) await campaignPurchase(env, sub, gross - tax);
    await record(env, { kind: 'payment', product, cur, gross, tax, subscription, months, sub: sub || null, ref, ...T,
      ...(discount > 0 && { discount, promo: await promoOf(env, conf.key, o) }),
      ...(await stripeFee(env, { charge: o.charge || pay.charge, intent: o.payment_intent || pay.payment_intent, gross, cur }, conf.key)) });
  } else if (ev.type === 'charge.refunded') {
    const before = +ev.data?.previous_attributes?.amount_refunded || 0, amount = (+o.amount_refunded || 0) - before;
    if (amount > 0) await record(env, { kind: 'refund', cur, amount, sub: o.metadata?.sub || null, ref, ...T });
  } else if (ev.type === 'customer.subscription.deleted') {
    await record(env, { kind: 'sub-end', subscription: o.id || ('cus:' + o.customer), sub: sub || null, ref, ...T, ...(team && { product: 'team-seat' }) });
    // (A trial that ends without its first payment: cancelled. finance.js ignores it after a conversion.)
    if (o.metadata?.trial && !team) await record(env, { kind: 'trial', stage: 'cancel', subscription: o.id || ('cus:' + o.customer), sub: sub || null, ref: ref + ':trial', ...T });
  }
}
