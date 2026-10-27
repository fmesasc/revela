// Revela Cloud API (revelaslides.com/api/…): accounts, sessions, credits, AI
// through Revela's own key, payments (Stripe) and linking the desktop app.
//
// The rule: the browser (or the desktop app, or anything else) only asks; this
// server decides. Every request is checked here — session, plan, credits and
// limits — against state only this server holds, so changing the app's code
// changes nothing. Secrets (the AI key, Stripe's) live in Cloudflare's secrets,
// never in the repository.
//
// Storage: one Durable Object per account (Account) — requests to it run one at
// a time, so credits can't be spent twice by requests that arrive together —,
// one for the global AI budget (Budget), and one per desktop sign-in (DesktopLink).
//
//   POST /api/login            { accessToken, terms?, lang? } (Google, issued to Revela's client) → session
//                              (a new account needs terms: the version of the terms accepted; else 400 { error: 'terms' })
//   POST /api/logout
//   POST /api/visit            { path, ref, lang, kind: view | 404 }   (the website's pages: visits.js; no cookies)
//   POST /api/errors           { msg, stack, where, version, browser, lang, actions, kind }   (the app's errors: errors.js)
//   GET  /api/redirect?path=   → { to }   (where an address that doesn't exist goes: the 404 page asks)
//   GET  /api/version          → { version, stage }   (the version this server is: src/core/config.js APP_VERSION)
//   GET  /api/sessions         → { sessions: [{ id, kind, device, where, created, last, expires, current? }] }   (my open sessions)
//   POST /api/sessions         { id } | { others: true } → { ended }   (closing one, or all but this one)
//   GET  /api/me               → { email, plan, credits, features, billing, billingTest, terms (accepted the current ones?), docs,
//                              trialDays (Pro's free trial on offer to this account; 0: none), trial? ({ until }: in a trial now) }
//   POST /api/terms            { version, lang? }       (accepting the current terms, once; accounts from before)
//   POST /api/mail/test                                 (a test email to my own address, once an hour)
//   GET|POST /api/mail/prefs   { off: [kinds] }         (the optional notices I stopped)
//   GET|POST /api/mail/unsubscribe?t=…                  (stop optional notices; signed link in the email: mail.js)
//   POST /api/ai/chat          { messages, max_tokens?, json? } → OpenRouter's answer (credits charged)
//                              (content: a string, or parts [{ type: 'text' }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,…' } }])
//   POST /api/ai/image         { prompt, aspect_ratio? } → { data: [{ b64_json, media_type }] }
//   POST /api/ai/speech        { input, voice?, speed? } → { audio (base64 mp3) }  (credits per character)
//   GET  /api/stock/search     ?provider=unsplash|pexels&q=&page= → { results }   (Revela's keys; per-minute limit)
//   POST /api/stock/used       { provider, id, downloadLocation }   (Unsplash asks to be told, at the photo's download_location, when one is used)
//   POST /api/billing/checkout { product } → { url, trialDays? }   (Stripe Checkout; promotion codes allowed; Pro's free trial
//                              when the admin turned it on and the account never had a trial or a paid Pro: trialConfig)
//   POST /api/billing/portal   → { url }                (Stripe customer portal)
//   POST /api/billing/webhook  Stripe's events (signed)
//   POST /api/billing/webhook-test  Stripe's test-mode events (signed with STRIPE_TEST_WEBHOOK_SECRET; see stripeConf)
//   POST /api/desktop/start    { nonce, challenge }     (the desktop app, before opening the browser)
//   POST /api/desktop/approve  { nonce, code }          (the signed-in browser, after asking the user)
//   POST /api/desktop/claim    { nonce, verifier }      (the desktop app: its session, once)
//   …/api/lti/…                Moodle and other platforms (LTI 1.3: activities marked here, grades sent back; lti.js)
//   …/api/call/…               video calls in the editor (Pro; Cloudflare Realtime; calls.js)
//   …/api/team/…               teams: seats, members, brand kit, templates (teams.js)
//   GET  /api/account/export   → everything the account holds (JSON)
//   POST /api/account/delete   { confirm: email }       (deletes it all; from the website)
//   …/api/docs/…               presentations in the cloud, shared with people or by link (docs.js)
//   …/api/3d/…                 «Crear modelo 3D con IA»: jobs of rounds AI + Blender (model3d.js)
//   POST /api/support          { message, category, email? (no session), version, browser, deckName?, attach? }
//                              → { id } a support ticket, acknowledged by email (admin.js; limited per day)
//   GET|POST /api/support/reply?t=…  the person's answer in the same ticket (signed link in its emails, no session: admin.js)
//   …/api/admin/…              administration, only on the admin host behind Cloudflare Access (admin.js)
//
// A blocked account (by an administrator, admin.js) can still sign in, see its account,
// download or delete its data and report a problem; everything else answers 403 { error: 'blocked' }.
//
// Sessions: a cookie on the web (HttpOnly, Secure, SameSite=Strict, only for
// /api), a bearer token in the desktop app. Only a hash of each is stored.

import { verifyGoogleToken } from './auth.js';
import { handleDocs } from './docs.js';
import { handleTeams, teamStatus } from './teams.js';
import { handleLti } from './lti.js';
import { handleCalls } from './calls.js';
import { docsSettings, TRASH_DAYS, FOLDERS } from './docs.js';
import { mail, sendMail, readUnsubToken, unsubPage, fmtDate, mailConfigured, OPTIONAL, unsubToken } from './mail.js';
import { renderNews, newsTick, linkTarget, NEWS_LANGS, recipientToken, readRecipientToken } from './news.js';
import { scheduleItem, scheduleAll, dayOf } from './schedule.js';
import { handle3d, configured3d, configuredRealistic as configured3dAny } from './model3d.js';
import { createTicket, supportReply, directoryUpsert, directoryAccess, directoryRemove, CHARGES, emails as adminEmails } from './admin.js';
import { record } from './finance.js';
import { NOTICE_PLACES, noticesFor, noticesOp } from './notices.js';
import { scheduleAlarm, runAlarm, brakesOp } from './brakes.js';
import { takeQuota } from './store.js';
import { handleCommunity } from './community.js';
import { handleLead, goLink, crmUnsub, crmClick, campaignSignup, eventsPublic, eventSignup, referralInfo } from './crm.js';
import { handleAmbassadors } from './ambassadors.js';
import { crmInbound } from './crm-reply.js';
import { enc, b64url, random, sha256, DAY, HOUR } from './util.js';
import { stockSearch, stockUsed, photoProviders } from './stock.js';
import { storageConfig, MB } from './storage.js';
import { handleVisit, visitsCall, cleanPath } from './visits.js';
import { startLive, joinLive, startVote, joinVote, voteCode } from './broadcast.js';
import { ssoStart, ssoCallback, ssoJoin } from './sso.js';
import { hookOp, handleHooks } from './hooks.js';
import { keyOp, handleKeys, handleV1, handleMcp, handleOAuth, connectInfo, connectApprove, isKey, parseKey, mcpChallenge } from './publicapi.js';
import { APP_VERSION } from '../../src/core/config.js';
import { credits, aiChat, aiImage, aiSpeech } from './ai.js';
import { brandFromSite } from './brand.js';
import { stripeConf, billingMode, trialOffer, checkout, portal, stripeWebhook } from './billing.js';

export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

// The test site (env.STAGE): only the people the admin invited have an account there — its AI, cloud and test
// payments are real costs anyone could otherwise use. Asked to production (service binding PROD) and kept a minute.
const testerCache = new Map();
export async function testerOK(env, email) {
  if (!env.STAGE) return true;
  email = String(email || '').toLowerCase(); if (!email) return false;
  const c = testerCache.get(email); if (c && Date.now() - c.at < 60e3) return c.ok;
  let ok = false;
  try { const r = await env.PROD.fetch('https://revelaslides.com/api/internal/tester', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Key': env.INTERNAL_KEY || '' }, body: JSON.stringify({ email }) });
    // (Production without this yet — until it's published it answers 404 or «no session» —: open as before; any other
    // failure — a wrong key, an error, no answer —: closed.)
    const j = await r.json().catch(() => ({}));
    ok = r.ok ? !!j.ok : r.status === 404 || (r.status === 401 && j.error === 'no session'); } catch { ok = false; }
  testerCache.set(email, { ok, at: Date.now() }); return ok;
}
export const forgetTesters = () => testerCache.clear();

// ---- Settings (wrangler.toml [vars]; secrets with `wrangler secret put`) -----------------
export function settings(env) {
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
  return {
    origins: String(env.API_ORIGINS || 'https://revelaslides.com').split(/[\s,]+/).filter(Boolean),
    desktopOrigins: String(env.DESKTOP_ORIGINS || 'tauri://localhost,http://tauri.localhost,https://tauri.localhost').split(/[\s,]+/).filter(Boolean),
    site: env.SITE_URL || 'https://revelaslides.com',
    clientId: env.GOOGLE_CLIENT_ID || '',
    trial: num(env.TRIAL_CREDITS, 50),                   // once, when the account is created
    proCredits: num(env.PRO_CREDITS, 1000),              // each paid month
    creditUsd: num(env.CREDIT_USD, 0.002),               // what one credit pays for, in the AI provider's dollars
    markup: num(env.MARKUP, 1),
    // How long credits last (days): the welcome gift; a pack bought; each month of Pro (that
    // month and the next, like a phone plan's rollover).
    trialDays: num(env.TRIAL_DAYS, 90), packDays: num(env.PACK_DAYS, 365), monthDays: num(env.MONTH_DAYS, 60),
    // The terms of service in force (their date): accepted when the account is created, and again when they change.
    termsVersion: env.TERMS_VERSION || '2026-10-01',
    idleDays: num(env.IDLE_DAYS, 730),                   // an account unused this long is deleted (warned 30 and 7 days before)
    imageCredits: num(env.IMAGE_CREDITS, 15),
    perMinute: num(env.AI_PER_MINUTE, 20),
    monthlyBudget: num(env.MONTHLY_BUDGET_USD, 50),      // all AI together, per calendar month
    // (The longest answer allowed: a whole deck — every slide with its speaker notes — is ~6–12k tokens. With 4000 it
    // came cut in the middle of its JSON and failed with «La IA no devolvió contenido». The hold is for what may be spent;
    // only what was spent is charged.)
    maxTokens: num(env.AI_MAX_TOKENS, 16000),
    models: String(env.AI_MODELS || 'openai/gpt-4o-mini,anthropic/claude-haiku-4.5,google/gemini-2.5-flash,google/gemini-2.5-flash-lite').split(/[\s,]+/).filter(Boolean),
    // Three quality levels the app asks for by name (basic/medium/advanced): the model for each, set by the operator.
    // «medium» writes every deck, «advanced» edits it (the app's authoring.js polish) and «Mejorar»: gemini-3.8-flash by
    // default (measured: nearly gemini-2.5-pro's quality for a third of the cost). Another one: AI_MODEL_ADVANCED, with
    // its price in AI_PRICES (the hold before a request uses it). A level's model needn't be in AI_MODELS.
    tiers: { basic: env.AI_MODEL_BASIC || 'google/gemini-2.5-flash-lite', medium: env.AI_MODEL_MEDIUM || 'google/gemini-2.5-flash', advanced: env.AI_MODEL_ADVANCED || 'google/gemini-3.8-flash' },
    imageModel: env.AI_IMAGE_MODEL || 'bytedance-seed/seedream-4.5',
    ttsModel: env.AI_TTS_MODEL || 'openai/gpt-4o-mini-tts-2025-12-15',
    ttsVoices: String(env.AI_TTS_VOICES || 'alloy,ash,ballad,coral,echo,fable,nova,onyx,sage,shimmer').split(/[\s,]+/).filter(Boolean),
    ttsUsdPerChar: num(env.AI_TTS_USD_PER_CHAR, 0.00002),      // (priced per character; the provider doesn't report it back: a cautious figure)
    // Price per million tokens [input, output] in dollars, for the estimate before a request.
    prices: (() => { try { return JSON.parse(env.AI_PRICES || '{}'); } catch { return {}; } })(),
    products: {                                          // Stripe prices (live ids; test ones: stripeConf) and what each gives
      'pro-month': { price: env.STRIPE_PRICE_PRO_MONTH, mode: 'subscription' },
      'pro-year': { price: env.STRIPE_PRICE_PRO_YEAR, mode: 'subscription' },
      'credits-500': { price: env.STRIPE_PRICE_CREDITS_500, mode: 'payment', credits: 500 },
      'credits-1500': { price: env.STRIPE_PRICE_CREDITS_1500, mode: 'payment', credits: 1500 },
      'team-seat': { price: env.STRIPE_PRICE_TEAM_SEAT, mode: 'subscription', team: true },   // (per seat and month; quantity = seats)
    },
  };
}
// Pro's free trial, set from the admin (admin.js «Promociones»; kept in the Budget object, not in vars):
//   trialDays (0 = off), trialCredits (granted when the trial starts, instead of the month's Pro credits; the first
//   paid invoice brings the normal month), trialOncePerAccount. Only for an account that never had a paid Pro (and,
//   if once, never a trial) in that Stripe mode. Checkout still asks for a card; the portal lets people cancel.
export const TRIAL_DEFAULT = { trialDays: 0, trialCredits: 100, trialOncePerAccount: true };
let trialCache = { at: 0, v: null };
export const resetTrialCache = () => { trialCache = { at: 0, v: null }; };
export async function trialConfig(env, fresh) {
  if (!env.BUDGET) return { ...TRIAL_DEFAULT };
  if (!fresh && trialCache.v && Date.now() - trialCache.at < 30e3) return trialCache.v;
  const r = await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'config-get').catch(() => null);
  const v = { ...TRIAL_DEFAULT, ...(r?.trial || {}) }; trialCache = { at: Date.now(), v }; return v;
}
// The admin's trial settings, checked (null: not valid).
export function cleanTrial(b) {
  const days = +b?.trialDays, cr = +b?.trialCredits;
  if (!Number.isInteger(days) || days < 0 || days > 90 || !Number.isInteger(cr) || cr < 0 || cr > 10000 || typeof b.trialOncePerAccount !== 'boolean') return null;
  return { trialDays: days, trialCredits: cr, trialOncePerAccount: b.trialOncePerAccount };
}
// Credits for finishing the guided tours (the app's ui/shell/tour.js), set from the admin (admin.js «Promociones»; kept
// in the Budget object): on; perTour, the credits for finishing each one (0: none); credits, a bonus for finishing them
// all; days they last; monthlyPeople, how many accounts can get any of it in a calendar month (0: no limit — reached,
// nothing more until the next month: no boom can run away with it). Off unless turned on. Each tour's credits and the
// bonus once per account; the account object keeps which ones (op 'tour-done') and grants them itself. until: the
// last day (UTC, «AAAA-MM-DD»; empty: no end) — after it nothing more is given, as if it were off.
export const TOUR_KEYS = ['basics', 'main', 'maps', 'anim', 'threed', 'live', 'ai', 'present', 'collab', 'design', 'io', 'data'];
export const TOURS_DEFAULT = { on: false, perTour: {}, credits: 150, days: 90, monthlyPeople: 0, until: '' };
// (On, and not past its last day — `until`, «AAAA-MM-DD», that whole day counts —: a campaign closes by itself.)
export const toursActive = (cfg, now = Date.now()) => !!cfg.on && (!cfg.until || now < Date.parse(cfg.until) + 864e5);
let toursCache = { at: 0, v: null };
export const resetToursCache = () => { toursCache = { at: 0, v: null }; };
export async function toursConfig(env, fresh) {
  if (!env.BUDGET) return { ...TOURS_DEFAULT };
  if (!fresh && toursCache.v && Date.now() - toursCache.at < 30e3) return toursCache.v;
  const r = await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'tours-get').catch(() => null);
  const v = { ...TOURS_DEFAULT, ...(r?.tours || {}) }; toursCache = { at: Date.now(), v }; return v;
}
// The admin's settings for it, checked (null: not valid). At most 1000 credits — a Pro month's.
export function cleanTours(b) {
  const cr = +b?.credits, days = +b?.days, max = +(b?.monthlyPeople ?? 0), per = b?.perTour ?? {}, until = String(b?.until ?? '');
  if (until && (!/^\d{4}-\d\d-\d\d$/.test(until) || new Date(until + 'T00:00:00Z').toISOString().slice(0, 10) !== until)) return null;
  if (typeof b?.on !== 'boolean' || !Number.isInteger(cr) || cr < 0 || cr > 1000 || !Number.isInteger(days) || days < 1 || days > 365
    || !Number.isInteger(max) || max < 0 || max > 1e6 || !per || typeof per !== 'object' || Array.isArray(per)) return null;
  const perTour = {};
  for (const [k, v] of Object.entries(per)) { if (!TOUR_KEYS.includes(k) || !Number.isInteger(+v) || +v < 0 || +v > 200) return null; if (+v) perTour[k] = +v; }
  return { on: b.on, perTour, credits: cr, days, monthlyPeople: max, until };
}
// The welcome message for a new account (the app's ui/shell/tour.js, after the first sign-in), written in the admin
// («Promociones ▸ Bienvenida»; kept in the Budget object): on (off unless turned on) and, per language, a title and a
// text — it explains what Revela is and that the interactive tutorials are there. A language without its text reads the
// English one, then the Spanish. Plain text only (the app writes it as text); no addresses are made of it.
export const WELCOME_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
export const WELCOME_DEFAULT = { on: false, mail: false, texts: {} };
let welcomeCache = { at: 0, v: null };
export const resetWelcomeCache = () => { welcomeCache = { at: 0, v: null }; };
export async function welcomeConfig(env, fresh) {
  if (!env.BUDGET) return { ...WELCOME_DEFAULT };
  if (!fresh && welcomeCache.v && Date.now() - welcomeCache.at < 30e3) return welcomeCache.v;
  const r = await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'welcome-get').catch(() => null);
  const v = { ...WELCOME_DEFAULT, ...(r?.welcome || {}) }; welcomeCache = { at: Date.now(), v }; return v;
}
const wstr = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').replace(/\r/g, '').trim().slice(0, n);
export function cleanWelcome(b) {
  if (typeof b?.on !== 'boolean' || (b.mail !== undefined && typeof b.mail !== 'boolean') || !b.texts || typeof b.texts !== 'object' || Array.isArray(b.texts)) return null;
  const texts = {};
  for (const [k, v] of Object.entries(b.texts)) {
    if (!WELCOME_LANGS.includes(k) || !v || typeof v !== 'object') return null;
    const title = wstr(v.title, 80), text = wstr(v.text, 800);
    if (title || text) texts[k] = { title, text };
  }
  if ((b.on || b.mail) && !texts.es?.text && !texts.en?.text) return null;      // (on, with something to say in Spanish or English)
  return { on: b.on, mail: !!b.mail, texts };
}
// What a person in this language reads: theirs, else English, else Spanish; null when off or empty.
export function welcomeFor(cfg, lang, key = 'on') {
  if (!cfg?.[key]) return null;
  const t = [lang, 'en', 'es'].map(k => cfg.texts?.[k]).find(x => x && x.text);
  return t ? { title: t.title || '', text: t.text } : null;
}
// The same welcome as an email to a new account, when the admin turned «mail» on (once: the account remembers it sent it).
async function welcomeMail(env, sub, lang) {
  try {
    const cfg = await welcomeConfig(env), w = welcomeFor(cfg, lang, 'mail'); if (!w || !mailConfigured(env)) return;
    await call(acct(env, sub), 'mail-welcome', { title: w.title, text: w.text, ref: 'welcome' });
  } catch (e) { console.log('welcome mail', e?.message); }
}
const monthOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 7);
// The notices (notices.js), read again at most once a minute per Worker instance (the admin's changes reset it here).
let noticeCache = { at: 0, list: null };
export const resetNoticeCache = () => { noticeCache = { at: 0, list: null }; };
async function noticeList(env) {
  if (noticeCache.list && Date.now() - noticeCache.at < 60e3) return noticeCache.list;
  const r = await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'notices-get').catch(() => null);
  noticeCache = { at: Date.now(), list: r?.notices || [] }; return noticeCache.list;
}
export const FEATURES ={ free: ['ai', 'cloud-save'], pro: ['ai', 'cloud-save', 'share-people', 'analytics', 'video-calls', 'premium-templates'] };

// ---- One account ------------------------------------------------------------------------
export class Account {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
  async get(k, d) { const v = await this.ctx.storage.get(k); return v === undefined ? d : v; }
  async put(o) { await this.ctx.storage.put(o); }
  // The plan now: Pro while paid (and a few days' grace) or given by an administrator (proGift), else free.
  async plan() { const p = await this.get('plan', null), g = await this.get('proGift', null), now = Date.now(); return g?.until > now ? 'pro' : p && p.until > now ? p.name : 'free'; }
  async proUntil() { const p = await this.get('plan', null), g = await this.get('proGift', null); return Math.max(p?.name === 'pro' ? +p.until || 0 : 0, +g?.until || 0) || null; }
  // What the administrators' directory knows of this account (admin.js), sent when it changes
  // (only the balance changed: at most every 5 minutes).
  async dirSync(force) {
    if (!this.env.DIRECTORY) return;
    const prof = await this.get('profile', null); if (!prof?.sub) return;
    const own = await this.plan(), rec = { sub: prof.sub, email: prof.email, name: prof.name || null, plan: own, until: own === 'pro' ? await this.proUntil() : 0, credits: await this.get('credits', 0),
      created: prof.created || null, lang: prof.lang || null, news: !!(await this.get('newsOn', null)) && !(await this.get('newsHold', null)), newsAt: (await this.get('newsOn', null))?.at || null, lastSeen: await this.get('lastSeen', null), lastSeenAt: await this.get('lastSeenAt', null), team: await this.get('team', null), blocked: !!(await this.get('blocked', null)), bytes: (await this.storage()).used,
      // (Test mode, apart: the flag, a Pro only from test mode, and the test credits — kept out of the real counts.)
      billingTest: !!(await this.get('billingTest', null)), test: own === 'pro' && !!(await this.get('plan', null))?.test && !((await this.get('proGift', null))?.until > Date.now()),
      testCredits: (await this.lots()).filter(l => l.test && l.exp > Date.now()).reduce((t, l) => t + l.n, 0) };
    const last = await this.get('dirRec', null), now = Date.now(), same = x => JSON.stringify({ ...x, credits: 0, testCredits: 0, bytes: 0, lastSeenAt: 0 });
    // (Credits and space change often: written again at most every five minutes — at once if the space moved 100 KB.)
    const moved = Math.abs((last?.rec.bytes || 0) - (rec.bytes || 0));
    if (!force && last && same(last.rec) === same(rec) && moved < MB / 10 && ((last.rec.credits === rec.credits && last.rec.testCredits === rec.testCredits && !moved) || now - last.at < 5 * 60e3)) return;
    if (!force && this.out) this.out.dir = rec;           // (sent after the answer: flush())
    else if (await directoryUpsert(this.env, rec)) await this.put({ dirRec: { rec, at: now } });
  }
  // What a request changes in the objects shared by every account — the business's accounts (finance.js), the
  // schedule (schedule.js), the administrators' directory (admin.js) — is gathered while it runs and sent after its
  // answer (flush), one call to each: none of it is needed to answer, and each of those is one object for everyone, so
  // waiting for them made every request wait in their queues. A new account alone made six such calls (three to
  // Finance, two to Schedule, one to the directory); 100 at once took 8.1 s here, now ~3 s (local test, 2026-10-11).
  // (Money and credits themselves never leave this object: only the reports and the notices wait.)
  // Still in order (one flush after another) and once each; a failure is logged and lost, as when they were awaited
  // (record() never threw). Outside a request (this.out null) they go at once.
  fin(ev) { if (this.out) this.out.fin.push(ev); else return record(this.env, ev); }
  sched(ts, sub, kind, ref) { if (!sub) return; const x = scheduleItem(ts, sub, kind, ref); if (this.out) this.out.sched.push(x); else return scheduleAll(this.env, [x]).catch(e => console.log('schedule', e?.message)); }
  async flush(out) {
    if (out.fin.length) await record(this.env, out.fin);
    if (out.sched.length) await scheduleAll(this.env, out.sched).catch(e => console.log('schedule', e?.message));
    if (out.dir && (await directoryUpsert(this.env, out.dir))) await this.put({ dirRec: { rec: out.dir, at: Date.now() } });
    if (out.access) await directoryAccess(this.env, out.access);
  }
  // Credits come in lots, each with its expiry ({ n, exp }); they are spent from the one that
  // expires first. What a request really cost beyond the balance is a debt, paid by the next
  // credits. 'credits' is always the balance: the lots minus the debt.
  async lots() {
    let lots = await this.get('lots', null);
    if (!lots) { const c = await this.get('credits', 0); lots = c > 0 ? [{ n: c, exp: Date.now() + 365 * DAY }] : []; }   // (from before lots)
    return lots;
  }
  // (A lot granted in Stripe's test mode is marked test: true and kept apart, so «clear test» removes exactly those.)
  async save(lots, debt) {
    const by = new Map();                                 // (one lot per expiry, and per kind: real or test)
    for (const l of lots) if (l.n > 0) { const k = l.exp + (l.test ? '|t' : ''); by.set(k, { exp: l.exp, test: !!l.test, n: (by.get(k)?.n || 0) + l.n }); }
    lots = [...by.values()].map(({ n, exp, test }) => ({ n, exp, ...(test && { test: true }) })).sort((a, b) => a.exp - b.exp);
    const credits = lots.reduce((t, l) => t + l.n, 0) - debt;
    await this.put({ lots, debt, credits }); return credits;
  }
  async add(n, exp, test) {                               // → balance
    const lots = await this.lots(); let debt = await this.get('debt', 0);
    const pay = Math.min(debt, n); debt -= pay; n -= pay;
    if (n > 0) { lots.push({ n, exp, ...(test && { test: true }) }); await this.remind(exp); }
    return this.save(lots, debt);
  }
  // A lot of credits: a notice 7 days before it expires (once per lot; the daily run checks it's still there).
  async remind(exp) {
    const sub = (await this.get('profile', {})).sub, done = await this.get('reminders', []); if (!sub || done.includes(exp)) return;
    await this.put({ reminders: [...done.filter(x => x > Date.now()), exp].slice(-50) });
    this.sched(exp - 7 * DAY, sub, 'credits', String(exp));
  }
  async take(n) {                                         // → [{ n, exp }] taken (to give back exactly), balance
    const lots = await this.lots(), taken = []; let debt = await this.get('debt', 0);
    for (const l of lots) { if (!n) break; const k = Math.min(l.n, n); l.n -= k; n -= k; taken.push({ n: k, exp: l.exp, ...(l.test && { test: true }) }); }
    debt += n;
    return { taken, credits: await this.save(lots, debt) };
  }
  async giveBack(taken) { const lots = await this.lots(); for (const t of taken) if (t.exp > Date.now()) lots.push({ ...t }); return this.save(lots, await this.get('debt', 0)); }
  async expire() {                                        // the lots past their date go (in the ledger as 'expired')
    const lots = await this.lots(), now = Date.now(), gone = lots.filter(l => l.exp <= now).reduce((t, l) => t + l.n, 0);
    if (!gone && (await this.get('lots', null))) return;
    await this.save(lots.filter(l => l.exp > now), await this.get('debt', 0));
    if (gone) await this.log(-gone, 'expired');
  }
  async log(delta, reason, ref, extra) {
    const list = await this.get('ledger', []);
    list.push({ at: Date.now(), delta, reason, ...(ref && { ref }), ...extra, balance: await this.get('credits', 0) });
    await this.put({ ledger: list.slice(-500) });
    // (The business's accounts, finance.js: credits granted, expired or taken; AI charges go with their request, see 'settle'.)
    if (delta && !CHARGES.includes(reason)) this.fin({ kind: 'credits', reason: String(ref || '').startsWith('refund:') ? 'refund' : reason, delta, sub: (await this.get('profile', {})).sub, ...(extra?.test && { test: true }) });
  }
  async entry(delta, reason, ref, days = 365, extra) {
    const bal = delta >= 0 ? await this.add(delta, Date.now() + days * DAY, extra?.test) : (await this.take(-delta)).credits;
    await this.log(delta, reason, ref, extra);
    return bal;
  }
  // Pro's month: while the plan (own or the team's) lasts, its credits every 30 days, whatever
  // the billing period (monthly, yearly or a team's), each lot for that month and the next.
  async monthly(pro, s) {
    const last = await this.get('monthly', 0);
    if (!pro || Date.now() - last < 30 * DAY || s.proCredits <= 0) return;
    // (Pro only from a test-mode plan: its month's credits are test ones too. In a free trial: only the trial's credits,
    // given when it started; the month's come with the first paid invoice.)
    const p = await this.get('plan', null), g = await this.get('proGift', null), now = Date.now(), test = !!(p?.test && p.until > now && !(g?.until > now));
    if (p?.trial && p.until > now && !(g?.until > now)) return;
    await this.put({ monthly: Date.now() });
    await this.entry(s.proCredits, 'pro', null, s.monthDays, test && { test: true });
  }
  async isPro() {
    if ((await this.plan()) === 'pro') return true;
    const teamId = await this.get('team', null); if (!teamId) return false;
    const t = await teamStatus(this.env, teamId, (await this.get('profile', {})).email).catch(() => null);
    return !!(t?.member && t.active);
  }
  // May this account get Pro's free trial in this Stripe mode? Never after a paid Pro; once: never after a trial.
  // (A plan stored without trialUsed is from before trials existed: it was paid.)
  async trialOk(test, once) {
    const T = test ? 'Test' : '';
    if (await this.get('proPaid' + T, null)) return false;
    const used = await this.get('trialUsed' + T, null), p = await this.get('plan', null);
    if (!used && p && !!p.test === !!test) return false;
    return !(once && used);
  }
  // The lots that expire next (to show them): [{ n, exp }], the soonest first.
  async soon() { return (await this.lots()).filter(l => l.exp > Date.now()).slice(0, 3); }
  // Cloud documents beyond the plan's limit are read-only: all but the N most recently edited
  // (N = the plan's limit). Nothing is deleted; going back to Pro or deleting some unlocks them.
  async docState(pro) {
    const ds = docsSettings(this.env), limit = (pro ?? (await this.isPro())) ? ds.proDocs : ds.freeDocs;
    // (Those in the trash count, and are the first to be read-only.)
    const docs = (await this.get('docs', [])).slice().sort((x, y) => !y.trashed - !x.trashed || y.updated - x.updated);
    return { limit, docs, locked: docs.slice(limit).map(d => d.id) };
  }
  // Space in the cloud (storage.js): what my documents take, against my quota (the plan's, or one the admin set).
  async storage(pro) {
    const conf = await storageConfig(this.env), own = await this.get('storageQuota', null);
    const quota = (own?.mb || ((pro ?? (await this.isPro())) ? conf.proMb : conf.freeMb)) * MB;
    const used = (await this.get('docs', [])).reduce((t, d) => t + (+d.bytes || 0), 0);
    return { used, quota, full: used >= quota, ...(own?.mb && { custom: true }) };
  }
  // ---- Emails (mail.js) and what the daily run looks at (schedule.js) ----
  // One email to this account, at most once per ref; optional kinds not if stopped.
  async mailMe(kind, vars, ref) {
    const prof = await this.get('profile', null), sent = await this.get('mailed', []);
    if (!prof?.email || (ref && sent.includes(ref)) || (await this.get('mailOff', [])).includes(kind)) return false;
    const ok = await mail(this.env, { to: prof.email, kind, lang: prof.lang, vars: { email: prof.email, ...vars }, sub: prof.sub });
    if (ok && ref) await this.put({ mailed: [...sent, ref].slice(-200) });
    return ok;
  }
  // What the end of Pro means here: how many documents become read-only, the credits kept.
  async proVars(lang) {
    const free = docsSettings(this.env).freeDocs, n = (await this.get('docs', [])).length, lots = (await this.lots()).filter(l => l.exp > Date.now());
    return { free, locked: Math.max(0, n - free), credits: Math.max(0, await this.get('credits', 0)), next: lots[0] ? fmtDate(lots[0].exp, lang) : '' };
  }
  // Used today (signing in, or any request with a session): kept to the day, written once a day.
  async seen() {
    const today = dayOf(Date.now()); if ((await this.get('lastSeen', null)) === today) return;
    const month = await this.get('seenMonth', null);
    await this.put({ lastSeen: today, seenMonth: today.slice(0, 7) });
    this.fin({ kind: 'active', mau: month !== today.slice(0, 7) });          // (daily and monthly active users: finance.js)
    if (!(await this.get('idleNext', null))) await this.idleFrom(today);
  }
  // The minute of the last use, and the last 30 uses (the administration's «Último uso» and its access log): noted when
  // the person signs in and, using it, after 20 minutes without — so a day of work is a few lines, not one per
  // request. The directory gets it after the answer (flush), where the list of everyone's latest accesses is kept.
  async touch(how, place = {}) {
    const now = Date.now(), last = await this.get('lastSeenAt', 0);
    if (how !== 'login' && now - last < 20 * 60e3) return;
    const at = { at: now, how, ...(place.device && { device: place.device }) };
    await this.put({ lastSeenAt: now, access: [at, ...(await this.get('access', []))].slice(0, 30) });
    const prof = await this.get('profile', null); if (!prof?.sub) return;
    const x = { sub: prof.sub, email: prof.email, ...at };
    if (this.out) this.out.access = x; else await directoryAccess(this.env, x);
  }
  async idleFrom(day) {
    const sub = (await this.get('profile', {})).sub; if (!sub) return;
    const ref = 'w30:' + day; await this.put({ idleNext: ref });
    this.sched(Date.parse(day) + (settings(this.env).idleDays - 30) * DAY, sub, 'idle', ref);
  }
  // The daily run asks: { kind, ref } → act if it still applies ({ delete: true }: the worker deletes the account).
  async due(a) {
    const prof = await this.get('profile', null); if (!prof) return {};
    const now = Date.now(), lang = prof.lang;
    if (a.kind === 'credits') {
      const lot = (await this.lots()).find(l => l.exp === +a.ref);
      if (lot && lot.n > 0 && lot.exp > now && lot.exp - now <= 8 * DAY) await this.mailMe('credits', { n: lot.n, date: fmtDate(lot.exp, lang) }, 'credits:' + a.ref);
    } else if (a.kind === 'pro-soon') {
      const end = await this.get('cancelAt', null), p = await this.get('plan', null);
      if (end === +a.ref && p?.until > now && end > now) await this.mailMe('proEnding', { date: fmtDate(end, lang), ...(await this.proVars(lang)) }, 'pro-soon:' + a.ref);
    } else if (a.kind === 'idle') {
      const seen = await this.get('lastSeen', null), [stage, at] = String(a.ref).split(':'), idle = settings(this.env).idleDays;
      if (!seen) return {};
      // (An active Pro — own or a paid team's — is an account in use: no warnings, never deleted.)
      if (await this.isPro()) { await this.put({ lastSeen: dayOf(now) }); await this.idleFrom(dayOf(now)); return {}; }
      if (at !== seen) { await this.idleFrom(seen); return {}; }          // (used since: start counting again)
      const end = Date.parse(seen) + idle * DAY, days = Math.max(1, Math.round((end - now) / DAY));
      if (stage === 'w30' || stage === 'w7') {
        await this.mailMe('idle', { days, date: fmtDate(end, lang) }, `idle:${stage}:${seen}`);
        const next = stage === 'w30' ? 'w7:' + seen : 'del:' + seen; await this.put({ idleNext: next });
        this.sched(stage === 'w30' ? end - 7 * DAY : end, prof.sub, 'idle', next);
      } else if (stage === 'del') return { delete: true };
    } else if (a.kind === 'trash') {                      // in the trash for TRASH_DAYS: deleted for good (schedule.js); the rest, later
      const docs = await this.get('docs', []), end = d => d.trashed + TRASH_DAYS * DAY;
      const purge = docs.filter(d => d.trashed && end(d) <= now).map(d => d.id), rest = docs.filter(d => d.trashed && end(d) > now);
      if (rest.length) this.sched(Math.min(...rest.map(end)), prof.sub, 'trash', '');
      return { purge };
    }
    return {};
  }
  // One request at a time, whole (Cloudflare already runs a Durable Object's
  // storage steps in order; this also keeps any await in between from mixing two).
  // Then, after its answer, what it has for the shared objects (flush(): one after another, in their own line, so the
  // next request here doesn't wait for them either; 'wipe' does).
  fetch(req) {
    const out = { fin: [], sched: [], dir: null, access: null }, before = this.flushing;
    const run = async () => { this.out = out; this.before = before; try { return await this.handle(req); } finally { this.out = null; } };
    const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {});
    const send = () => (out.fin.length || out.sched.length || out.dir || out.access ? this.flush(out).catch(e => console.log('flush', e?.message)) : null);
    this.flushing = Promise.all([this.flushing, p.catch(() => {})]).then(send);
    this.ctx.waitUntil?.(this.flushing);
    return p;
  }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = req.method === 'POST' ? await req.json() : {};
    const s = settings(this.env);
    switch (op) {
      case 'login': {                                      // { sub, email, name?, kind, device?, where?, terms?, lang? } → { secret, days, fresh (a new account) }
        let fresh = false;
        const prof = await this.get('profile', null), terms = a.terms === s.termsVersion ? { version: s.termsVersion, at: Date.now() } : null;
        if (!prof && !terms) return this.json({ error: 'terms', version: s.termsVersion });   // (a new account accepts the terms first)
        if (!prof) { await this.put({ profile: { sub: a.sub, email: a.email, ...(a.name && { name: a.name }), ...(a.lang && { lang: a.lang }), created: Date.now(), terms } }); this.fin({ kind: 'signup', sub: a.sub }); if (s.trial > 0) await this.entry(s.trial, 'trial', null, s.trialDays); fresh = true; }
        else {
          const next = { ...prof, email: a.email, ...(a.name && { name: a.name }), ...(a.lang && { lang: a.lang }), ...(terms && prof.terms?.version !== s.termsVersion && { terms }) };
          if (JSON.stringify(next) !== JSON.stringify(prof)) await this.put({ profile: next });
        }
        // (The news by email: only when the person ticked it — signing up here, or later in «Mi cuenta» — never by default.)
        if (fresh && a.news === true) await this.put({ newsOn: { at: Date.now(), how: 'signup' } });
        await this.seen(); await this.touch('login', sessionPlace(a)); await this.dirSync(fresh);
        const secret = random(32), sessions = await this.get('sessions', {});
        const days = a.kind === 'desktop' ? 90 : 30;
        // (At most 20 sessions: the oldest go.)
        const kept = Object.entries(sessions).filter(([, v]) => v.expires > Date.now()).sort((x, y) => y[1].created - x[1].created).slice(0, 19);
        // (device and where: for «Sesiones abiertas», so its owner can tell a session that isn't theirs — sessionPlace().)
        await this.put({ sessions: { ...Object.fromEntries(kept), [await sha256(secret)]: { created: Date.now(), last: Date.now(), expires: Date.now() + days * DAY, kind: a.kind || 'web', ...sessionPlace(a) } } });
        return this.json({ secret, days, ...(fresh && { fresh }) });
      }
      // An admin «view as user» session: short-lived, read-only, and marked (kind 'impersonation', by: the admin). It
      // doesn't touch the profile and isn't a login (no signup, no 'seen'), and it never shows in the person's own
      // «Sesiones abiertas» — it lives only in the admin audit log. A one-time code (hashed, 5 min) hands it to the
      // admin's browser through /api/impersonate/consume, so the session secret never travels in a URL.
      case 'impersonate': {                                // { by, minutes? } → { code, until, email } | { error }
        const prof = await this.get('profile', null); if (!prof) return this.json({ error: 'no account' });
        const secret = random(32), sessions = await this.get('sessions', {});
        const mins = Math.min(Math.max(Math.round(+a.minutes || 30), 5), 120), expires = Date.now() + mins * 60e3;
        const kept = Object.entries(sessions).filter(([, v]) => v.expires > Date.now()).sort((x, y) => y[1].created - x[1].created).slice(0, 19);
        await this.put({ sessions: { ...Object.fromEntries(kept), [await sha256(secret)]: { created: Date.now(), last: Date.now(), expires, kind: 'impersonation', imp: { by: String(a.by || '').slice(0, 200) } } } });
        const code = random(32);
        await this.put({ impLink: { hash: await sha256(code), secret, until: expires, expires: Date.now() + 5 * 60e3 } });
        return this.json({ code, until: expires, email: prof.email || '' });
      }
      case 'imp-consume': {                                // { code } → { ok, secret, until } ; single use
        const link = await this.get('impLink', null);
        if (!link || link.expires < Date.now() || link.hash !== await sha256(String(a.code || ''))) return this.json({ ok: false });
        await this.put({ impLink: null });
        return this.json({ ok: true, secret: link.secret, until: link.until });
      }
      case 'check': {                                      // { secret, device?, where? } → ok?
        const sessions = await this.get('sessions', {}), h = await sha256(a.secret || ''), v = sessions[h], ok = !!v && v.expires > Date.now();
        if (ok) { await this.seen(); if (v.kind !== 'impersonation') await this.touch('use', sessionPlace(a, v)); }
        // A session in use doesn't end: with less than two thirds of its time left, it gets its full time again
        // (30 days on the web, 90 in the desktop app, from now). Only an unused one runs out.
        // Its last use (and where from) is noted at most once an hour, to spare the storage.
        let renewed = 0;
        // An admin «view as user» session (kind 'impersonation') is short-lived and never renews: it runs out on its own.
        if (ok && v.kind !== 'impersonation') {
          const days = v.kind === 'desktop' ? 90 : 30, renew = v.expires - Date.now() < days * DAY * 2 / 3, stale = Date.now() - (v.last || v.created) > HOUR;
          if (renew || stale) { sessions[h] = { ...v, last: Date.now(), ...sessionPlace(a, v), ...(renew && { expires: Date.now() + days * DAY }) }; await this.put({ sessions }); if (renew) renewed = days; }
        }
        return this.json({ ok, ...(renewed && { renewed }), ...(ok && v.kind === 'impersonation' && { imp: v.imp || {}, until: v.expires }), ...(ok && (await this.get('blocked', null)) && { blocked: true }), ...(ok && a.email && { email: (await this.get('profile', {})).email || '' }) });
      }
      case 'logout': {
        const sessions = await this.get('sessions', {}); delete sessions[await sha256(a.secret || '')];
        await this.put({ sessions }); return this.json({ ok: true });
      }
      // «Sesiones abiertas» in My account and in the administration: each one by a short id (the start of its
      // hash: it can't sign anyone in), the newest use first; 'current' is the one asking.
      case 'sessions': {                                   // { secret? } → { sessions: [{ id, kind, device, where, created, last, expires, current? }] }
        const mine = a.secret ? await sha256(a.secret) : '';
        return this.json({ sessions: sessionList(await this.get('sessions', {}), mine) });
      }
      // API keys and OAuth's codes (publicapi.js).
      case 'key-list': case 'key-add': case 'key-check': case 'key-refresh': case 'key-del': case 'code-add': case 'code-take':
        return this.json(await keyOp(this, op, a));
      // Integrations: Slack, Teams… or any address (hooks.js).
      case 'hook-list': case 'hook-add': case 'hook-del': case 'hook-done': return this.json(await hookOp(this, op, a));
      case 'sessions-end': {                               // { ids?, keep? } → { ended }   (ids: those; none: all of them; never keep's)
        const sessions = await this.get('sessions', {}), keep = a.keep ? await sha256(a.keep) : '', ids = Array.isArray(a.ids) ? a.ids.map(String) : null;
        let ended = 0;
        for (const h of Object.keys(sessions)) if (h !== keep && (!ids || ids.includes(h.slice(0, 16)))) { delete sessions[h]; ended++; }
        if (ended) await this.put({ sessions });
        return this.json({ ended });
      }
      case 'me': {
        const prof = await this.get('profile', {}), own = await this.plan(), p = await this.get('plan', null), teamId = await this.get('team', null);
        // (A member of a paid team has Pro too.)
        const team = teamId ? await teamStatus(this.env, teamId, prof.email).catch(() => null) : null, byTeam = !!(team?.member && team.active);
        const plan = own === 'pro' || byTeam ? 'pro' : 'free';
        await this.expire(); await this.monthly(plan === 'pro', s);
        const ds = await this.docState(plan === 'pro'); await this.dirSync();
        return this.json({ email: prof.email, name: prof.name || null, plan, until: own === 'pro' ? await this.proUntil() : null, ...((await this.get('blocked', null)) && { blocked: true }), credits: await this.get('credits', 0), expiring: await this.soon(), features: FEATURES[plan] || FEATURES.free,
          terms: prof.terms?.version === s.termsVersion, docs: { n: ds.docs.length, limit: ds.limit, readOnly: ds.locked.length }, ...((await this.get('newsOn', null)) && { news: true }), ...((await this.get('billingTest', null)) && { billingTest: true }),
          ...(p?.trial && p.until > Date.now() && own === 'pro' && !((await this.get('proGift', null))?.until > Date.now()) && { trial: { until: p.until } }),
          ...(team?.member && { team: { name: team.name, role: team.role, active: team.active } }) });
      }
      case 'terms': {                                      // { version, lang? }: the current terms, accepted
        const prof = await this.get('profile', null); if (!prof || a.version !== s.termsVersion) return this.json({ error: 'terms', version: s.termsVersion }, 400);
        await this.put({ profile: { ...prof, terms: { version: s.termsVersion, at: Date.now() }, ...(a.lang && { lang: a.lang }) } }); return this.json({ ok: true });
      }
      case 'mail-test': {                                  // a test email to this account, at most once an hour
        const last = await this.get('mailTest', 0); if (Date.now() - last < 60 * 60e3) return this.json({ ok: false, error: 'too soon' }, 429);
        if (!mailConfigured(this.env)) return this.json({ ok: false, error: 'mail not configured' }, 503);
        await this.put({ mailTest: Date.now() });
        const ok = await this.mailMe('test', { url: (this.env.SITE_URL || 'https://revelaslides.com') + '/app/' });
        return this.json({ ok: !!ok }, ok ? 200 : 502);
      }
      case 'mail-welcome': {                               // { title, text, ref }: the welcome, once
        return this.json({ ok: await this.mailMe('welcome', { title: String(a.title || '').slice(0, 80), text: String(a.text || '').slice(0, 800) }, a.ref || 'welcome') });
      }
      case 'mail-opened': {                                // { vars }: one of my tracked links was opened (docs.js; I can stop these)
        return this.json({ ok: await this.mailMe('opened', a.vars || {}) });
      }
      case 'mail-news': {                                  // { issue: { id, texts }, ref }: one newsletter to this account — only if it asked for them
        const prof = await this.get('profile', null), sent = await this.get('mailed', []);
        if (!prof?.email || !(await this.get('newsOn', null)) || (await this.get('newsHold', null)) || (await this.get('blocked', null))) return this.json({ ok: false, skipped: true });
        if (a.ref && sent.includes(a.ref)) return this.json({ ok: false, skipped: true });
        const tok = await unsubToken(this.env, prof.sub, 'news'); if (!tok) return this.json({ ok: false });     // (no way out: none sent)
        const site = this.env.SITE_URL || 'https://revelaslides.com', unsub = `${site}/api/mail/unsubscribe?t=${encodeURIComponent(tok)}`;
        const ok = await sendMail(this.env, { to: prof.email, kind: 'news', ...renderNews(a.issue, prof.lang || 'es', { unsub, site, track: true, rt: await recipientToken(this.env, a.issue.id, prof.sub) }), unsubscribe: unsub });
        if (ok && a.ref) await this.put({ mailed: [...sent, a.ref].slice(-200) });
        return this.json({ ok });
      }
      case 'mail-prefs': {                                 // { off?: [kinds] } → the optional kinds stopped
        if (Array.isArray(a.off)) await this.put({ mailOff: a.off.filter(k => OPTIONAL.includes(k) && k !== 'news') });   // ('news' is asked for, not stopped here)
        if (typeof a.news === 'boolean') { await this.put({ newsOn: a.news ? ((await this.get('newsOn', null)) || { at: Date.now(), how: 'account' }) : null }); await this.dirSync(true); }
        return this.json({ off: await this.get('mailOff', []), optional: OPTIONAL.filter(k => k !== 'news' && k !== 'welcome'), news: !!(await this.get('newsOn', null)) });
      }
      case 'mail-off': {                                   // { kind }: no more of these (the signed link in an email)
        const prof = await this.get('profile', null); if (!prof) return this.json({ ok: false });
        if (a.kind === 'news') { await this.put({ newsOn: null }); await this.dirSync(true); return this.json({ ok: true, lang: prof.lang }); }   // (the link in a newsletter: no more)
        const off = await this.get('mailOff', []); if (!off.includes(a.kind)) await this.put({ mailOff: [...off, a.kind] });
        return this.json({ ok: true, lang: prof.lang });
      }
      case 'plan-ending': {                                // { end, ref }: Pro was cancelled and ends then (end 0: renewed again)
        if (!+a.end) { await this.put({ cancelAt: null }); return this.json({ ok: true }); }
        const end = +a.end, lang = (await this.get('profile', {})).lang; await this.put({ cancelAt: end });
        await this.mailMe('proEnding', { date: fmtDate(end, lang), ...(await this.proVars(lang)) }, 'pro-ending:' + end);
        const sub = (await this.get('profile', {})).sub;
        if (end - 7 * DAY > Date.now() + DAY) this.sched(end - 7 * DAY, sub, 'pro-soon', String(end));
        return this.json({ ok: true });
      }
      case 'plan-ended': {                                 // { ref }: Pro is over
        const lang = (await this.get('profile', {})).lang; await this.put({ cancelAt: null });
        await this.mailMe('proEnded', await this.proVars(lang), 'pro-ended:' + a.ref); return this.json({ ok: true });
      }
      case 'trial-ending': {                               // { end, ref }: Stripe says the free trial ends soon (3 days before)
        const lang = (await this.get('profile', {})).lang, end = +a.end;
        if (!(end > Date.now())) return this.json({ ok: false });
        return this.json({ ok: !!(await this.mailMe('trialEnding', { date: fmtDate(end, lang), credits: s.proCredits }, `trial-end:${a.ref}:${end}`)) });
      }
      case 'trial-ok': return this.json({ ok: await this.trialOk(!!a.test, a.once !== false) });
      case 'due': return this.json(await this.due(a));
      // ('e:' + email objects: the language of whoever has that address, for emails sent to it.)
      case 'set-lang': await this.put({ lang: a.lang }); return this.json({ ok: true });
      case 'call-sessions': return this.json({ ids: await this.get('callSessions', []) });
      case 'call-session-add': await this.put({ callSessions: [a.id, ...(await this.get('callSessions', []))].slice(0, 20) }); return this.json({ ok: true });
      case 'team-id': return this.json({ id: await this.get('team', null) });
      case 'team-set': { if (a.only && (await this.get('team', null)) !== a.only) return this.json({ ok: true }); await this.put({ team: a.id || null }); return this.json({ ok: true }); }
      case 'invites-list': return this.json({ invites: await this.get('invites', []) });
      case 'invites-add': { const l = (await this.get('invites', [])).filter(x => x.id !== a.id); l.unshift({ id: a.id, name: a.name, by: a.by, at: Date.now() }); await this.put({ invites: l.slice(0, 20) }); return this.json({ ok: true, lang: await this.get('lang', null) }); }
      case 'invites-remove': await this.put({ invites: (await this.get('invites', [])).filter(x => x.id !== a.id) }); return this.json({ ok: true });
      case 'ratek': {                                      // { key, per }: one more of these this minute? (searches…)
        const now = Date.now(), k = 'rate:' + String(a.key || 'x').slice(0, 20), w = (await this.get(k, [])).filter(t => t > now - 60e3);
        if (w.length >= (+a.per || 30)) return this.json({ ok: false });
        w.push(now); await this.put({ [k]: w }); return this.json({ ok: true });
      }
      case 'slot': {                                       // { key, id, ttl }: one of these at a time per account (3D jobs)
        const k = 'slot:' + a.key, cur = await this.get(k, null);
        if (cur && cur.id !== a.id && cur.until > Date.now()) return this.json({ ok: false, id: cur.id });
        await this.put({ [k]: { id: a.id, until: Date.now() + (+a.ttl || 30 * 60e3) } }); return this.json({ ok: true });
      }
      case 'unslot': { const k = 'slot:' + a.key; if ((await this.get(k, null))?.id === a.id) await this.ctx.storage.delete(k); return this.json({ ok: true }); }
      case 'rate': {                                       // one more AI request this minute?
        const now = Date.now(), w = (await this.get('rate', [])).filter(t => t > now - 60e3);
        if (w.length >= s.perMinute) return this.json({ ok: false });
        w.push(now); await this.put({ rate: w }); return this.json({ ok: true });
      }
      case 'hold': {                                       // { credits } → keep them aside, or say no
        // (Held for a request that never finished — 10 minutes — go back first.)
        const old = await this.get('holds', {}), stale = Object.entries(old).filter(([, v]) => v.at < Date.now() - 10 * 60e3);
        if (stale.length) { for (const [k] of stale) delete old[k]; await this.put({ holds: old }); for (const [, v] of stale) await this.giveBack(v.taken || [{ n: v.n, exp: Date.now() + DAY }]); }
        await this.expire(); await this.monthly(await this.isPro(), s);
        const bal = await this.get('credits', 0), n = Math.max(1, Math.ceil(+a.credits || 0));
        if (bal < n) return this.json({ ok: false, credits: bal });
        const id = random(9), { taken } = await this.take(n), holds = await this.get('holds', {});
        holds[id] = { n, taken, at: Date.now() };
        await this.put({ holds }); return this.json({ ok: true, id });
      }
      case 'settle': {                                     // { id, credits } → charge what it really cost, give back the rest
        // (What it really cost, even above the estimate — outdated prices must not
        // cost Revela money; a balance below zero just stops the next requests.)
        const holds = await this.get('holds', {}), h = holds[a.id]; if (!h) return this.json({ ok: false });
        delete holds[a.id]; await this.put({ holds });
        const used = Math.max(0, Math.ceil(+a.credits || 0));
        await this.giveBack(h.taken || [{ n: h.n, exp: Date.now() + DAY }]);   // (back where they were, then the real charge as an entry)
        // (In the person's ledger, what it was for and which model: the admin sees it.)
        await this.entry(-used, a.reason || 'ai', a.ref, undefined, a.ai && { feature: String(a.ai.feature || 'other').slice(0, 30), model: String(a.ai.model || '').slice(0, 80) });
        // (What the request cost Revela and what it charged, for the business's accounts: finance.js.)
        if (a.ai) this.fin({ kind: 'ai', ...a.ai, credits: used, sub: (await this.get('profile', {})).sub });
        else if (used) this.fin({ kind: 'credits', reason: a.reason || 'ai', delta: -used, sub: (await this.get('profile', {})).sub });
        return this.json({ ok: true, used });
      }
      // The presentations this person saves in their Google Drive: only what the app says of each — its name, how many
      // slides, its size and when —, never its content (Drive is the browser's alone: io/cloud/gdrive.js). For the admin.
      case 'drive-seen': {                                 // { id, title, slides, bytes, gone? } → { fresh: first this month }
        const drive = await this.get('drive', {}), now = Date.now(), month = new Date(now).toISOString().slice(0, 7);
        if (a.gone) delete drive[a.id];
        else drive[a.id] = { title: a.title, slides: a.slides, bytes: a.bytes, at: now, first: drive[a.id]?.first || now };
        // (The last 300, by when they were saved.)
        const keep = Object.entries(drive).sort((x, y) => y[1].at - x[1].at).slice(0, 300);
        const fresh = !a.gone && (await this.get('driveMonth', null)) !== month;
        await this.put({ drive: Object.fromEntries(keep), ...(fresh && { driveMonth: month }) });
        return this.json({ fresh, month });
      }
      case 'drive-list': return this.json({ files: Object.entries(await this.get('drive', {})).map(([id, f]) => ({ id, ...f })).sort((x, y) => y.at - x.at) });
      case 'tours-get': return this.json({ done: await this.get('toursDone', []), paid: await this.get('toursPaid', []), rewarded: !!(await this.get('toursRewarded', null)), claimed: await this.get('toursClaimed', null) });
      case 'tour-done': {                                  // { tour, all, per?, bonus?, days?, dry? } — each tour's credits and the bonus once
        const all = a.all || [], tour = String(a.tour);
        const before = await this.get('toursDone', []), fresh = all.includes(tour) && !before.includes(tour);
        const done = [...new Set([...before, tour])].filter(k => all.includes(k)), paid = await this.get('toursPaid', []);
        const g1 = +a.per > 0 && !paid.includes(tour) ? Math.round(+a.per) : 0;
        const g2 = +a.bonus > 0 && all.every(k => done.includes(k)) && !(await this.get('toursRewarded', null)) ? Math.round(+a.bonus) : 0;
        if (a.dry) return this.json({ would: g1 + g2 });   // (what it would give: the route checks the month's cap first)
        await this.put({ toursDone: done, ...(a.claim && (g1 || g2) && { toursClaimed: a.claim }) });   // (the month this account was counted in)
        if (g1) { await this.put({ toursPaid: [...paid, tour] }); await this.entry(g1, 'tours', 'tour:' + tour, +a.days || 90); }
        if (g2) { await this.put({ toursRewarded: Date.now() }); await this.entry(g2, 'tours', 'tours:all', +a.days || 90); }
        if (g1 || g2) await this.dirSync();
        return this.json({ done, fresh, granted: g1 + g2, all: !!g2, rewarded: !!(await this.get('toursRewarded', null)), credits: await this.get('credits', 0) });
      }
      case 'grant': {                                      // { credits, reason, ref } — once per ref (payments)
        const done = await this.get('refs', []);
        if (a.ref && done.includes(a.ref)) return this.json({ ok: true, duplicate: true });
        await this.put({ refs: [...done, a.ref].filter(Boolean).slice(-300) });
        const bal = await this.entry(Math.round(+a.credits || 0), a.reason || 'grant', a.ref, +a.days || s.packDays, a.test && { test: true }); await this.dirSync();
        return this.json({ ok: true, credits: bal });
      }
      case 'setplan': {                                    // { name, until, customer?, test?, trial?, trialCredits? }
        // (Test mode never replaces a real plan still running.)
        const cur = await this.get('plan', null), T = a.test ? 'Test' : '';
        if (a.test && cur && !cur.test && cur.until > Date.now()) return this.json({ ok: true, ignored: true });
        const put = { plan: { name: a.name, until: +a.until || 0, ...(a.test && { test: true }), ...(a.trial && { trial: true }) }, ...(a.customer && { [a.test ? 'customerTest' : 'customer']: a.customer }) };
        // (A free trial: marked used, its credits once. Its first paid invoice: a paid Pro, and the month's credits now.)
        if (a.trial) put['trialUsed' + T] = true;
        else if (a.name === 'pro') { put['proPaid' + T] = true; if (cur?.trial) put.monthly = 0; }
        await this.put(put);
        if (a.trial && !cur?.trial && +a.trialCredits > 0) await this.entry(Math.round(+a.trialCredits), 'pro-trial', null, s.monthDays, a.test && { test: true });
        await this.dirSync();
        return this.json({ ok: true });
      }
      // Stripe's customer: its ids differ between live and test mode, so each is kept apart.
      case 'set-customer': await this.put({ [a.test ? 'customerTest' : 'customer']: a.customer }); return this.json({ ok: true });
      case 'customer': return this.json({ customer: await this.get('customer', null), customerTest: await this.get('customerTest', null), email: (await this.get('profile', {})).email,
        billingTest: !!(await this.get('billingTest', null)) });
      case 'billing-test': return this.json({ test: !!(await this.get('billingTest', null)), exists: !!(await this.get('profile', null)) });
      // Cloud documents: the owner's list (with the plan's limit), and "shared with me" (in the 'e:' + email objects).
      // Everything this account holds (to hand over), and wiping it (the account is closed).
      case 'export': return this.json({ profile: await this.get('profile', {}), plan: await this.get('plan', null), credits: await this.get('credits', 0), lastSeen: await this.get('lastSeen', null), mailOff: await this.get('mailOff', []),
        ledger: await this.get('ledger', []), docs: await this.get('docs', []), folders: await this.get('folders', []), sessions: Object.values(await this.get('sessions', {})).map(v => ({ created: v.created, last: v.last || v.created, expires: v.expires, kind: v.kind, device: v.device || '', where: v.where || '' })) });
      case 'wipe': {
        const prof = await this.get('profile', {}), out = { docs: (await this.get('docs', [])).map(d => d.id), customer: await this.get('customer', null), customerTest: await this.get('customerTest', null), email: prof.email || null, lang: prof.lang || null };
        await this.before;                                 // (what earlier requests still had to send — the directory too — first)
        await this.ctx.storage.deleteAll(); if (prof.sub) await directoryRemove(this.env, prof.sub); return this.json(out);
      }
      case 'docs-list': { const d = await this.docState(); return this.json({ docs: (await this.get('docs', [])).map(x => (d.locked.includes(x.id) ? { ...x, readOnly: true } : x)), limit: d.limit, storage: await this.storage() }); }
      // (Asked by the document on every read and change: it also says what it takes now — bytes.)
      case 'docs-locked': {
        if (Number.isFinite(+a.bytes)) { const docs = await this.get('docs', []), d = docs.find(x => x.id === a.id); if (d && d.bytes !== +a.bytes) { d.bytes = +a.bytes; await this.put({ docs }); } }
        const d = await this.docState(); return this.json({ locked: d.locked.includes(a.id), limit: d.limit, storage: await this.storage() });
      }
      case 'docs-add': {                                   // { id, name, limit, bytes, folder?, slides, text } (folder: one of mine, else the top)
        const docs = await this.get('docs', []), folders = await this.get('folders', []);
        if (docs.length >= +a.limit) return this.json({ ok: false, limit: +a.limit });
        const sto = await this.storage(); if (sto.used + (+a.bytes || 0) > sto.quota) return this.json({ ok: false, storage: sto });
        const folder = folders.some(f => f.id === a.folder) ? a.folder : null, now = Date.now();
        docs.unshift({ id: a.id, name: a.name, updated: now, created: now, folder, slides: +a.slides || 0, text: String(a.text || '').slice(0, 400), bytes: +a.bytes || 0 });
        await this.put({ docs }); await this.dirSync(); return this.json({ ok: true, folder });
      }
      case 'docs-touch': {
        const docs = await this.get('docs', []), d = docs.find(x => x.id === a.id); if (!d) return this.json({ ok: false });
        Object.assign(d, { name: a.name, updated: Date.now() }, a.slides !== undefined && { slides: +a.slides || 0, text: String(a.text || '').slice(0, 400) }, Number.isFinite(+a.bytes) && a.bytes !== undefined && { bytes: +a.bytes });
        docs.sort((x, y) => y.updated - x.updated); await this.put({ docs }); if (a.bytes !== undefined) await this.dirSync(); return this.json({ ok: true });
      }
      // Organising my list: folders (at most FOLDERS.max, names of FOLDERS.name characters, FOLDERS.depth deep),
      // which folder each one is in, stars, the picture of the first slide (when) and the trash.
      case 'docs-meta': {                                  // { id, folder?, starred?, thumbAt?, trashed? } → { ok: false } when not mine
        const docs = await this.get('docs', []), d = docs.find(x => x.id === a.id); if (!d) return this.json({ ok: false });
        if (a.folder !== undefined) {
          if (a.folder !== null && !(await this.get('folders', [])).some(f => f.id === a.folder)) return this.json({ ok: false, error: 'no folder' });
          d.folder = a.folder;
        }
        if (a.starred !== undefined) d.starred = !!a.starred;
        if (a.thumbAt !== undefined) d.thumbAt = +a.thumbAt || null;
        if (a.trashed !== undefined) {
          d.trashed = a.trashed ? Date.now() : null;
          if (d.trashed) this.sched(d.trashed + TRASH_DAYS * DAY, (await this.get('profile', {})).sub, 'trash', '');
        }
        await this.put({ docs }); return this.json({ ok: true, doc: d });
      }
      case 'folder-add': case 'folder-edit': case 'folder-remove': {
        const folders = await this.get('folders', []), byId = new Map(folders.map(f => [f.id, f]));
        const depth = id => { let n = 0; for (let f = byId.get(id); f && n <= FOLDERS.depth; f = byId.get(f.parent)) n++; return n; };
        const height = id => 1 + Math.max(0, ...folders.filter(f => f.parent === id).map(f => height(f.id)));
        const name = a.name === undefined ? undefined : String(a.name ?? '').replace(/[\u0000-\u001f]/g, '').trim();
        if (name !== undefined && (!name || name.length > FOLDERS.name)) return this.json({ ok: false, error: 'bad name' });
        const parent = a.parent === undefined ? undefined : a.parent || null;
        if (parent && !byId.has(parent)) return this.json({ ok: false, error: 'no folder' });
        if (op === 'folder-add') {
          if (name === undefined) return this.json({ ok: false, error: 'bad name' });
          if (folders.length >= FOLDERS.max) return this.json({ ok: false, error: 'folder limit', limit: FOLDERS.max });
          if (parent && depth(parent) >= FOLDERS.depth) return this.json({ ok: false, error: 'too deep', depth: FOLDERS.depth });
          const f = { id: random(6), name, parent: parent || null, created: Date.now() };
          folders.push(f); await this.put({ folders }); return this.json({ ok: true, folder: f, folders });
        }
        const f = byId.get(a.id); if (!f) return this.json({ ok: false, error: 'not found' });
        if (op === 'folder-remove') {                      // (what it held goes up one level: nothing is deleted)
          const docs = await this.get('docs', []);
          for (const x of folders) if (x.parent === f.id) x.parent = f.parent;
          for (const d of docs) if (d.folder === f.id) d.folder = f.parent;
          await this.put({ folders: folders.filter(x => x !== f), docs }); return this.json({ ok: true, folders: folders.filter(x => x !== f) });
        }
        if (parent !== undefined) {
          for (let p = parent; p; p = byId.get(p)?.parent) if (p === f.id) return this.json({ ok: false, error: 'cycle' });
          if ((parent ? depth(parent) : 0) + height(f.id) > FOLDERS.depth) return this.json({ ok: false, error: 'too deep', depth: FOLDERS.depth });
          f.parent = parent;
        }
        if (name !== undefined) f.name = name;
        await this.put({ folders }); return this.json({ ok: true, folder: f, folders });
      }
      case 'folders-list': return this.json({ folders: await this.get('folders', []) });
      // (storage.js: the documents not measured yet — saved before space was counted — and their measure.)
      case 'dir-sync': await this.dirSync(true); return this.json({ ok: true });
      // For the admins of my team (teams.js /team/usage): my last day of use, the AI credits I spent (from a.month and in
      // the last 30 days) and my space — nothing about what my presentations say.
      case 'usage': {
        const ledger = await this.get('ledger', []), since30 = Date.now() - 30 * DAY;
        const spent = from => ledger.filter(e => e.at >= from).reduce((t, e) => t + (CHARGES.includes(e.reason) && e.delta < 0 ? -e.delta : String(e.ref || '').startsWith('refund:') && e.delta > 0 ? -e.delta : 0), 0);
        const sto = await this.storage();
        return this.json({ lastSeen: await this.get('lastSeen', null), spentMonth: Math.max(0, spent(+a.month || 0)), spent30: Math.max(0, spent(since30)), credits: await this.get('credits', 0),
          storage: { used: sto.used, quota: sto.quota }, docs: (await this.get('docs', [])).length });
      }
      case 'docs-unmeasured': return this.json({ ids: (await this.get('docs', [])).filter(d => d.bytes === undefined).map(d => d.id) });
      case 'docs-bytes': {
        const docs = await this.get('docs', []), d = docs.find(x => x.id === a.id); if (!d || !Number.isFinite(+a.bytes)) return this.json({ ok: false });
        d.bytes = +a.bytes; await this.put({ docs }); return this.json({ ok: true });
      }
      case 'docs-remove': await this.put({ docs: (await this.get('docs', [])).filter(x => x.id !== a.id) }); await this.dirSync(); return this.json({ ok: true });
      case 'inbox-list': return this.json({ docs: (await this.get('inbox', [])).filter(x => !x.away) });
      case 'inbox-add': {
        const all = await this.get('inbox', []), was = all.find(x => x.id === a.id), inbox = all.filter(x => x !== was);
        inbox.unshift({ id: a.id, name: a.name, owner: a.owner, role: a.role, at: Date.now(), ...(was?.starred && { starred: true }) }); await this.put({ inbox: inbox.slice(0, 1000) }); return this.json({ ok: true, lang: await this.get('lang', null) });
      }
      case 'inbox-remove': await this.put({ inbox: (await this.get('inbox', [])).filter(x => x.id !== a.id) }); return this.json({ ok: true });
      case 'inbox-away': {                                 // { id }: in its owner's trash (kept, with its star, until it's back or deleted)
        const inbox = await this.get('inbox', []), d = inbox.find(x => x.id === a.id); if (d) { d.away = true; await this.put({ inbox }); } return this.json({ ok: true });
      }
      case 'inbox-star': {                                 // { id, on }: a star on one shared with me
        const inbox = await this.get('inbox', []), d = inbox.find(x => x.id === a.id); if (!d) return this.json({ ok: false });
        d.starred = !!a.on; await this.put({ inbox }); return this.json({ ok: true });
      }
      // ---- Administration (admin.js: checked there, and written to its audit log) ----
      case 'admin-view': {
        const prof = await this.get('profile', null); if (!prof) return this.json({});
        await this.expire();
        const sessions = Object.values(await this.get('sessions', {})).filter(v => v.expires > Date.now());
        return this.json({ profile: prof, plan: await this.plan(), until: await this.proUntil(), stored: await this.get('plan', null), proGift: await this.get('proGift', null),
          credits: await this.get('credits', 0), debt: await this.get('debt', 0), lots: await this.lots(), ledger: (await this.get('ledger', [])).slice(-50).reverse(),
          sessions: { n: sessions.length, kinds: sessions.map(v => v.kind), list: sessionList(await this.get('sessions', {}), '', true) }, storage: await this.storage(), storageQuota: await this.get('storageQuota', null), docs: (await this.get('docs', [])).length, team: await this.get('team', null),
          blocked: await this.get('blocked', null), lastSeen: await this.get('lastSeen', null), lastSeenAt: await this.get('lastSeenAt', null), access: await this.get('access', []), newsOn: await this.get('newsOn', null), newsHold: await this.get('newsHold', null), mailOff: await this.get('mailOff', []), customer: !!(await this.get('customer', null)), refunded: await this.get('refunded', []),
          billingTest: await this.get('billingTest', null), customerTest: !!(await this.get('customerTest', null)),
          trial: { used: !!(await this.get('trialUsed', null)), usedTest: !!(await this.get('trialUsedTest', null)), paid: !!(await this.get('proPaid', null)), paidTest: !!(await this.get('proPaidTest', null)) } });
      }
      case 'admin-storage': {                              // { mb (0: the plan's), reason, by } → { before, after }
        const before = (await this.get('storageQuota', null))?.mb || 0, mb = Math.max(0, Math.round(+a.mb || 0));
        await this.put({ storageQuota: mb ? { mb, by: a.by, reason: a.reason, at: Date.now() } : null });
        return this.json({ before: { mb: before }, after: { mb } });
      }
      case 'admin-credits': {                              // { delta, reason, days, by } → { before, after, delta, expires? }
        await this.expire();
        const before = await this.get('credits', 0), exp = Date.now() + (+a.days || 365) * DAY;
        // (A debit takes at most the balance: an adjustment never leaves a debt.)
        const delta = a.delta > 0 ? a.delta : -Math.min(-a.delta, Math.max(0, before));
        if (delta > 0) await this.add(delta, exp); else if (delta < 0) await this.take(-delta);
        await this.log(delta, 'admin', null, { note: a.reason, by: a.by }); await this.dirSync(true);
        return this.json({ before, after: await this.get('credits', 0), delta, ...(delta > 0 && { expires: exp }) });
      }
      case 'admin-refund': {                               // { reason, by, days }: the last AI charge not refunded yet, given back
        const done = await this.get('refunded', []), led = await this.get('ledger', []);
        const charge = led.slice().reverse().find(x => x.delta < 0 && CHARGES.includes(x.reason) && !done.includes(x.at)); if (!charge) return this.json({ ok: false });
        const before = await this.get('credits', 0), n = -charge.delta, exp = Date.now() + (+a.days || 365) * DAY;
        await this.add(n, exp); await this.put({ refunded: [...done, charge.at].slice(-200) });
        await this.log(n, 'admin', 'refund:' + charge.at, { note: a.reason, by: a.by }); await this.dirSync(true);
        return this.json({ ok: true, before, after: await this.get('credits', 0), delta: n, expires: exp, charge: { at: charge.at, reason: charge.reason, delta: charge.delta, ...(charge.ref && { ref: charge.ref }) } });
      }
      case 'admin-plan': {                                 // { until (0: remove), reason, by }: Pro given by hand (Stripe's plan is untouched)
        const before = { plan: await this.plan(), proGift: await this.get('proGift', null) };
        if (+a.until) await this.put({ proGift: { until: +a.until, at: Date.now(), by: a.by, reason: a.reason } }); else await this.ctx.storage.delete('proGift');
        await this.dirSync(true);
        return this.json({ before, after: { plan: await this.plan(), proGift: await this.get('proGift', null) } });
      }
      case 'admin-block': {                                // { blocked, reason, by }
        const before = await this.get('blocked', null);
        if (a.blocked) await this.put({ blocked: { at: Date.now(), by: a.by, reason: a.reason } }); else await this.ctx.storage.delete('blocked');
        await this.dirSync(true);
        return this.json({ before: { blocked: before }, after: { blocked: await this.get('blocked', null) } });
      }
      // The newsletters, paused or resumed by the administration (admin.js /news-hold): the person's «yes» (newsOn) is kept
      // and only the sending stops, so resuming never subscribes anyone who didn't ask — it needs the «yes» to be there.
      case 'admin-news': {                                 // { on, reason, by } → { before, after } | { error: 'no consent' }
        const hold = await this.get('newsHold', null), consent = await this.get('newsOn', null), before = { enabled: !!consent && !hold, paused: !!hold };
        if (a.on && !consent) return this.json({ error: 'no consent' });
        if (a.on) await this.ctx.storage.delete('newsHold'); else await this.put({ newsHold: { at: Date.now(), by: a.by, reason: a.reason } });
        await this.dirSync(true);
        return this.json({ before, after: { enabled: !!(await this.get('newsOn', null)) && !(await this.get('newsHold', null)), paused: !!(await this.get('newsHold', null)) } });
      }
      case 'admin-billing-test': {                         // { on, reason, by }: this account pays in Stripe's test mode
        const before = await this.get('billingTest', null);
        if (a.on) await this.put({ billingTest: { at: Date.now(), by: a.by, reason: a.reason } }); else await this.ctx.storage.delete('billingTest');
        await this.dirSync(true);
        return this.json({ before: { billingTest: before }, after: { billingTest: await this.get('billingTest', null) } });
      }
      case 'admin-clear-test': {                           // { reason, by }: what test mode gave (Pro, credits) goes; the real stays
        await this.expire();
        const lots = await this.lots(), n = lots.filter(l => l.test).reduce((t, l) => t + l.n, 0), p = await this.get('plan', null);
        const before = { credits: await this.get('credits', 0), testCredits: n, plan: p };
        if (n) { await this.save(lots.filter(l => !l.test), await this.get('debt', 0)); await this.log(-n, 'admin', null, { note: a.reason, by: a.by, test: true }); }
        if (p?.test) await this.put({ plan: { name: 'free', until: 0, test: true }, monthly: 0, cancelAt: null });   // (a real Pro later gets its month's credits at once)
        await this.ctx.storage.delete(['trialUsedTest', 'proPaidTest']);                                            // (test trials can be tried again)
        await this.dirSync(true);
        return this.json({ before, after: { credits: await this.get('credits', 0), testCredits: 0, plan: await this.get('plan', null) }, removed: { credits: n, pro: !!(p?.test && p.name === 'pro') },
          team: await this.get('team', null), email: (await this.get('profile', {})).email });
      }
      case 'admin-mail': {                                 // { kind: 'creditsAdded', n, exp }: telling the person (a service email)
        const lang = (await this.get('profile', {})).lang;
        return this.json({ ok: !!(await this.mailMe(a.kind, { n: a.n, date: fmtDate(a.exp, lang) })) });
      }
    }
    return this.json({ error: 'unknown' }, 404);
  }
}

// ---- The AI budget: all accounts together, per calendar month --------------------------------
export class Budget {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  alarm() { return runAlarm(this.ctx, this.env, 'news', async () => { const next = await newsTick(this.env, this.ctx); if (next) await scheduleAlarm(this.ctx, this.env, 'news', next); }); }
  async fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = req.method === 'POST' ? await req.json() : {};
    // (Also the settings the admin changes without a deploy: Pro's free trial, trialConfig.)
    if (op === 'config-get') return Response.json({ trial: (await this.ctx.storage.get('trial')) || null });
    if (op === 'config-set') { await this.ctx.storage.put('trial', a.trial); return Response.json({ ok: true }); }
    // (And the credits for finishing the guided tours, toursConfig.)
    if (op === 'tours-get') return Response.json({ tours: (await this.ctx.storage.get('tours')) || null });
    // (Google Drive, each month: how many people saved there and how many saves — for the admin's summary.)
    if (op === 'drive-count') {
      const k = 'drive:' + a.month, c = (await this.ctx.storage.get(k)) || { people: 0, saves: 0 };
      c.saves++; if (a.fresh) c.people++; await this.ctx.storage.put(k, c); return Response.json({ ok: true });
    }
    if (op === 'drive-stats') { const months = []; for (let i = 0; i < 6; i++) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); const m = d.toISOString().slice(0, 7); months.push({ month: m, ...((await this.ctx.storage.get('drive:' + m)) || { people: 0, saves: 0 }) }); } return Response.json({ months }); }
    if (op === 'tours-set') { await this.ctx.storage.put('tours', a.tours); return Response.json({ ok: true }); }
    // (The newsletters' issues — news.js: kept whole, they are small.)
    // (A sending's next batch: Budget wakes up then — news.js newsTick. The only way an alarm is set: brakes.js.)
    if (op === 'news-alarm') { await scheduleAlarm(this.ctx, this.env, 'news', +a.at || Date.now()); return Response.json({ ok: true }); }
    // Newsletters: how many clicks each link got (no one's name: «this link, once more»), the unsubscribes of each day, and the
    // tests sent to any address in the hour (a limit: the admin's panel is not a way to send mail to whoever).
    if (op === 'news-click') { const k = 'nk:' + String(a.id).slice(0, 20), c = (await this.ctx.storage.get(k)) || {}; c[String(a.k)] = (c[String(a.k)] || 0) + 1; await this.ctx.storage.put(k, c); return Response.json({ ok: true }); }
    // Who opened and who clicked (per account, as the privacy policy says): 'nr:<boletín>:<sub>' → { o: { at, n }, c: { <enlace>: { at, n } } }.
    if (op === 'news-seen') {
      const k = `nr:${String(a.id).slice(0, 20)}:${String(a.sub).slice(0, 80)}`, r = (await this.ctx.storage.get(k)) || { c: {} }, now = Date.now();
      if (a.ev === 'o') r.o = { at: r.o?.at || now, last: now, n: (r.o?.n || 0) + 1 }; else r.c[String(a.ev)] = { at: r.c[String(a.ev)]?.at || now, last: now, n: (r.c[String(a.ev)]?.n || 0) + 1 };
      await this.ctx.storage.put(k, r); return Response.json({ ok: true });
    }
    if (op === 'news-readers') {
      const out = []; for (const [k, v] of await this.ctx.storage.list({ prefix: `nr:${String(a.id).slice(0, 20)}:`, limit: 2000 })) out.push({ sub: k.split(':').slice(2).join(':'), ...v });
      return Response.json({ readers: out });
    }
    if (op === 'news-forget') {        // an account deleted: its marks in every newsletter go
      const gone = []; for (const [k] of await this.ctx.storage.list({ prefix: 'nr:' })) if (k.endsWith(':' + String(a.sub))) gone.push(k);
      for (let i = 0; i < gone.length; i += 100) await this.ctx.storage.delete(gone.slice(i, i + 100)); return Response.json({ ok: true, n: gone.length });
    }
    if (op === 'news-unsub') { const k = 'nu:' + new Date().toISOString().slice(0, 10), n = ((await this.ctx.storage.get(k)) || 0) + 1; await this.ctx.storage.put(k, n); return Response.json({ ok: true }); }
    if (op === 'news-stats') {
      const clicks = (await this.ctx.storage.get('nk:' + String(a.id).slice(0, 20))) || {}, from = new Date(+a.from || 0).toISOString().slice(0, 10);
      let unsubs = 0; for (const [k, n] of await this.ctx.storage.list({ prefix: 'nu:' })) if (k.slice(3) >= from) unsubs += n;
      let tracked = 0, opened = 0, clicked = 0; for (const [, v] of await this.ctx.storage.list({ prefix: `nr:${String(a.id).slice(0, 20)}:`, limit: 5000 })) { tracked++; if (v.o) opened++; if (Object.keys(v.c || {}).length) clicked++; }
      return Response.json({ clicks, unsubs, tracked, opened, clicked });
    }
    if (op === 'news-test-count') { const k = 'ntc:' + Math.floor(Date.now() / 36e5), n = ((await this.ctx.storage.get(k)) || 0) + 1; await this.ctx.storage.put(k, n); return Response.json({ n }); }
    // The admin's copy of what is kept here besides the accounts (admin.js /backup): the settings and the newsletters. Only
    // reads, a few rows. And a gate: one copy per 20 minutes (what a button pressed again and again would cost).
    if (op === 'backup-config') {
      const st = this.ctx.storage, config = {};
      for (const k of ['tours', 'welcome', 'storage', 'trial']) config[k] = (await st.get(k)) ?? null;
      return Response.json({ config, news: [...(await st.list({ prefix: 'issue:' })).values()] });
    }
    if (op === 'backup-gate') {
      const last = (await this.ctx.storage.get('backupAt')) || 0, now = Date.now(), min = Math.max(60e3, +a.min || 20 * 60e3);
      if (now - last < min) return Response.json({ ok: false, wait: Math.ceil((min - (now - last)) / 1000) });
      await this.ctx.storage.put('backupAt', now); return Response.json({ ok: true });
    }
    if (op === 'news-index') return Response.json({ issues: [...(await this.ctx.storage.list({ prefix: 'issue:' })).values()] });
    if (op === 'news-get') return Response.json({ issue: (await this.ctx.storage.get('issue:' + String(a.id))) || null });
    if (op === 'news-put') { await this.ctx.storage.put('issue:' + String(a.issue.id), a.issue); return Response.json({ ok: true }); }
    if (op === 'news-del') { await this.ctx.storage.delete('issue:' + String(a.id)); return Response.json({ ok: true }); }
    if (op === 'welcome-get') return Response.json({ welcome: (await this.ctx.storage.get('welcome')) || null });
    if (op === 'welcome-set') { await this.ctx.storage.put('welcome', a.welcome); return Response.json({ ok: true }); }
    // (The log of the tours finished for the first time — the last 1000, for the admin — and each month's count per tour.)
    if (op === 'tours-log-add') {
      const log = (await this.ctx.storage.get('toursLog')) || [], k = 'toursCount:' + String(a.at ? new Date(a.at).toISOString().slice(0, 7) : ''), c = (await this.ctx.storage.get(k)) || {};
      log.push({ at: +a.at || Date.now(), sub: String(a.sub || ''), email: String(a.email || '').slice(0, 200), tour: String(a.tour || ''), granted: +a.granted || 0 });
      c[a.tour] = (c[a.tour] || 0) + 1;
      await this.ctx.storage.put({ toursLog: log.slice(-1000), [k]: c }); return Response.json({ ok: true });
    }
    if (op === 'tours-log') return Response.json({ log: ((await this.ctx.storage.get('toursLog')) || []).slice(-(+a.limit || 200)).reverse(), byTour: (await this.ctx.storage.get('toursCount:' + a.month)) || {} });
    // (How many accounts got the tours' credits this month, and one more within the month's limit.)
    if (op === 'tours-month') return Response.json({ month: a.month, people: (await this.ctx.storage.get('toursPeople:' + a.month)) || 0 });
    if (op === 'tours-claim') {
      const k = 'toursPeople:' + a.month, people = (await this.ctx.storage.get(k)) || 0;
      if (+a.max > 0 && people >= +a.max) return Response.json({ ok: false, people });
      await this.ctx.storage.put(k, people + 1); return Response.json({ ok: true, people: people + 1 });
    }
    // (And the cloud's quotas, storage.js.)
    if (op === 'storage-get') return Response.json({ storage: (await this.ctx.storage.get('storage')) || null });
    if (op === 'storage-set') { await this.ctx.storage.put('storage', a.storage); return Response.json({ ok: true }); }
    // (And publishing to production, releases.js.)
    if (op === 'testers-get') return Response.json({ testers: (await this.ctx.storage.get('testers')) || [] });
    if (op === 'testers-set') { await this.ctx.storage.put('testers', a.testers); return Response.json({ ok: true }); }
    if (op === 'releases-get') return Response.json({ releases: (await this.ctx.storage.get('releases')) || null });
    if (op === 'releases-set') { await this.ctx.storage.put('releases', a.releases); return Response.json({ ok: true }); }
    // (And the notices, notices.js.)
    const n = await noticesOp(this.ctx.storage, op, a); if (n) return Response.json(n);
    // (And the brakes: the emergency switch, the counters of what runs by itself, its incidents — brakes.js.)
    const bk = await brakesOp(this.ctx.storage, op, a); if (bk) return Response.json(bk);
    const month = new Date().toISOString().slice(0, 7), cur = (await this.ctx.storage.get('m')) || { month, usd: 0 };
    const m = cur.month === month ? cur : { month, usd: 0 }, limit = settings(this.env).monthlyBudget;
    if (op === 'check') return Response.json({ ok: m.usd + (+a.usd || 0) <= limit, usd: m.usd, limit });
    if (op === 'spend') { m.usd += Math.max(0, +a.usd || 0); await this.ctx.storage.put('m', m); return Response.json({ ok: true, usd: m.usd }); }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}

// ---- Linking the desktop app (like signing in to a TV) ------------------------------------------
// The app makes a secret (verifier) and sends only its hash (challenge) and a
// random nonce; it opens the browser, where the signed-in user confirms the
// short code the app shows; then the app, which alone knows the verifier,
// collects its own session once. Ten minutes to do it.
export const shortCode = challenge => challenge.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
export class DesktopLink {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    const cur = await st.get('link');
    if (op === 'start') {
      if (cur) return Response.json({ ok: false }, { status: 409 });
      await st.put('link', { challenge: a.challenge, expires: Date.now() + 10 * 60e3 }); await scheduleAlarm(this.ctx, this.env, 'desktop', Date.now() + 10 * 60e3);
      return Response.json({ ok: true, code: shortCode(a.challenge) });
    }
    if (!cur || cur.expires < Date.now()) { await st.deleteAll(); return Response.json({ ok: false, expired: true }, { status: 410 }); }
    if (op === 'approve') {
      if (a.code !== shortCode(cur.challenge) || cur.token) return Response.json({ ok: false }, { status: 400 });
      await st.put('link', { ...cur, token: a.token }); return Response.json({ ok: true });
    }
    if (op === 'claim') {
      if ((await sha256(a.verifier || '')) !== cur.challenge) return Response.json({ ok: false }, { status: 403 });
      if (!cur.token) return Response.json({ ok: false, pending: true });
      await st.deleteAll(); return Response.json({ ok: true, token: cur.token });   // (once)
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
  alarm() { return runAlarm(this.ctx, this.env, 'desktop', () => this.ctx.storage.deleteAll()); }
}

// ---- Requests ----------------------------------------------------------------------------------------
export const acct = (env, sub) => env.ACCOUNTS.get(env.ACCOUNTS.idFromName('u:' + sub));
export const call = async (stub, op, body) => (await stub.fetch('https://do/' + op, { method: 'POST', body: JSON.stringify(body || {}) })).json();
const COOKIE = 'rv_session';
const tokenOf = (sub, secret) => `${b64url(enc.encode(sub))}.${secret}`;
const parseToken = t => { const [a, b] = String(t || '').split('.'); if (!a || !b) return null; try { return { sub: new TextDecoder().decode(Uint8Array.from(atob(a.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((a.length + 3) % 4)), c => c.charCodeAt(0))), secret: b }; } catch { return null; } };
const cookieOf = req => (req.headers.get('Cookie') || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === COOKIE)?.[1] || '';

// Who is asking: a valid session (cookie on the web, bearer in the desktop app), or null.
// The device and the place a session is used from, said plainly (for «Sesiones abiertas»): the browser and the system
// from the User-Agent, and the city and country Cloudflare reads from the IP address (approximate; the address
// itself isn't kept). Kept with the session and gone with it.
export function deviceOf(ua = '') {
  const os = /iPad/.test(ua) ? 'iPad' : /iPhone|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'ChromeOS' : /Windows/.test(ua) ? 'Windows'
    : /Macintosh|Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return [br, os].filter(Boolean).join(' · ');
}
export const sessionClient = req => ({ device: deviceOf(req.headers.get('User-Agent') || ''), where: [req.cf?.city, req.cf?.country].filter(Boolean).join(', ') });
// withImp: include the admin «view as user» sessions (kind 'impersonation'). Off by default, so a person's own
// «Sesiones abiertas» never shows one — an admin view is only in the audit log. The admin account view asks for them.
const sessionList = (all, mine = '', withImp = false) => Object.entries(all).filter(([, v]) => v.expires > Date.now() && (withImp || v.kind !== 'impersonation')).sort((x, y) => (y[1].last || y[1].created) - (x[1].last || x[1].created))
  .map(([h, v]) => ({ id: h.slice(0, 16), kind: v.kind, device: v.device || '', where: v.where || '', created: v.created, last: v.last || v.created, expires: v.expires, ...(v.kind === 'impersonation' && v.imp && { by: v.imp.by }), ...(h === mine && { current: true }) }));
const sessionPlace = (a, before = {}) => ({ device: String(a.device || before.device || '').slice(0, 60), where: String(a.where || before.where || '').slice(0, 80) });

async function sessionOf(req, env) {
  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer /, ''), fromCookie = cookieOf(req);
  // An API key (publicapi.js): its account, marked so only /api/v1 and /api/mcp accept it.
  if (isKey(bearer)) {
    const k = parseKey(bearer), r = k ? await call(acct(env, k.sub), 'key-check', { secret: k.secret }) : { ok: false };
    return r.ok ? { sub: k.sub, via: 'key', key: r.id, email: r.email, ...(r.who && { who: r.who }), ...(r.blocked && { blocked: true }) } : null;
  }
  const raw = bearer || fromCookie, t = parseToken(raw); if (!t) return null;
  const r = await call(acct(env, t.sub), 'check', { secret: t.secret, ...sessionClient(req), ...(env.STAGE && { email: true }) });   // (the test site: whose, to check the invited list)
  return r.ok ? { sub: t.sub, secret: t.secret, via: bearer ? 'bearer' : 'cookie', ...(r.blocked && { blocked: true }), ...(r.renewed && { renewed: r.renewed, raw }), ...(r.email && { email: r.email }), ...(r.imp && { impersonation: { by: r.imp.by || '', until: r.until } }) } : null;
}

// ---- Relay servers (Cloudflare Realtime TURN) -----------------------------------------------------
// Secrets TURN_KEY_ID and TURN_KEY_API_TOKEN (dashboard ▸ Realtime ▸ TURN Server). Credentials last a
// day; the same ones are handed out for 6 hours (kept in the edge cache). Without the secrets: STUN only.
export const STUN_ONLY = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }] };
export async function iceServers(env, fetcher = env.FETCH || fetch) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return STUN_ONLY;
  const cache = globalThis.caches?.default, key = new Request('https://revela.internal/ice/' + env.TURN_KEY_ID);
  const hit = await cache?.match(key).catch(() => null); if (hit) return hit.json();
  try {
    const r = await fetcher(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.TURN_KEY_API_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) });
    if (!r.ok) throw new Error('turn ' + r.status);
    const j = await r.json(), list = (Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers]).filter(Boolean)
      // (Port 53 is blocked by some browsers and networks: Cloudflare suggests leaving it out.)
      .map(x => ({ ...x, urls: [].concat(x.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(x => x.urls.length);
    const out = { iceServers: [...STUN_ONLY.iceServers, ...list.filter(x => x.username)] };
    await cache?.put(key, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'max-age=21600' } })).catch(() => {});
    return out;
  } catch (e) { console.log(JSON.stringify({ ice: 'error', detail: String(e.message || e) })); return STUN_ONLY; }
}

export async function handleApi(req, env, url) {
  const s = settings(env), origin = req.headers.get('Origin') || '';
  const webOrigin = s.origins.includes(origin), desktopOrigin = s.desktopOrigins.includes(origin);
  // CORS: only Revela's own site (with its cookie) and the desktop app (bearer only); the public API and the MCP
  // server (publicapi.js), from anywhere — they only take a key, never the cookie.
  const path0 = url.pathname.replace(/^\/api/, ''), open = path0 === '/mcp' || path0.startsWith('/v1/');
  const cors = { 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
    ...(open ? { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id' }
      : { ...(webOrigin && { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }), ...(desktopOrigin && { 'Access-Control-Allow-Origin': origin }) }),
    'Access-Control-Allow-Methods': open ? 'GET, POST, DELETE, OPTIONS' : 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': open ? 'Content-Type, Authorization, Mcp-Protocol-Version, Mcp-Session-Id' : 'Content-Type, Authorization' };
  const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const path = url.pathname.replace(/^\/api/, '');
  // LTI (learning platforms): their own forms and signed tokens, no session here (lti.js).
  if (path.startsWith('/lti/')) return handleLti(req, env, url, s.site);
  // Single sign-on with a team's own identity provider (sso.js): no session yet, the browser goes and comes back.
  if (path === '/sso/start' && req.method === 'GET') return ssoStart(env, url);
  if (path === '/sso/callback' && req.method === 'GET') {
    const bound = (req.headers.get('Cookie') || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === 'rv_sso')?.[1] || '';
    const who = await ssoCallback(env, url, bound), back = q => Response.redirect(`${s.site}/app/?sso=${q}`, 302);
    if (who.error) return back(who.error);
    if (!(await testerOK(env, who.email))) return back('tester');
    const r = await call(acct(env, who.sub), 'login', { sub: who.sub, email: who.email, name: who.name, kind: 'web', lang: langOf(who.lang), terms: who.terms, ...sessionClient(req) });
    if (r.error === 'terms') return back('terms');
    if (r.fresh) await welcomeMail(env, who.sub, langOf(who.lang));
    if (langOf(who.lang)) await call(acct(env, 'e:' + who.email), 'set-lang', { lang: langOf(who.lang) });
    // (Into the team when its admin chose so and there are seats; already in one: as it was.)
    if (who.autoJoin && !(await call(acct(env, who.sub), 'team-id')).id && (await ssoJoin(env, who.team, who.email, who.sub)).data.ok) await call(acct(env, who.sub), 'team-set', { id: who.team });
    return new Response(null, { status: 302, headers: { Location: who.next ? s.site + who.next : `${s.site}/app/?sso=ok`, 'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE}=${tokenOf(who.sub, r.secret)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${r.days * 86400}` } });
  }
  // A live broadcast's room (broadcast.js): the presenter (with its token) and the audience (no session).
  const lv = path.match(/^\/live\/([\w-]{1,40})$/);
  if (lv && req.method === 'GET') return joinLive(req, env, lv[1]);
  // OAuth for the MCP server (publicapi.js): its own forms, from other sites, no session.
  if (['/oauth/register', '/oauth/authorize', '/oauth/token'].includes(path)) { const r = await handleOAuth(path, req, env, url); if (r) return r; }
  // Stripe's own calls: signed, no browser involved.
  if (path === '/billing/webhook' && req.method === 'POST') return stripeWebhook(req, env, json, 'live');
  if (path === '/billing/webhook-test' && req.method === 'POST') return stripeWebhook(req, env, json, 'test');
  // The link to stop optional emails (signed; no session: it's opened from the email, or posted by the mail app).
  // A link of a newsletter: counted (the link, never who) and sent on to where the newsletter itself says — not to an address from the link.
  const nl = path.match(/^\/n\/([\w]{4,20})\/(x|\d{1,2}|o\.gif)$/);
  if (nl && req.method === 'GET' && env.BUDGET) {
    const B = env.BUDGET.get(env.BUDGET.idFromName('global')), isTest = url.searchParams.get('t') === '1', who = await readRecipientToken(env, nl[1], url.searchParams.get('r'));
    // The opening: a 1×1 picture (the email asks for it) — kept per account, once more each time; approximate (some mail apps load pictures ahead).
    if (nl[2] === 'o.gif') {
      if (who && !isTest) await call(B, 'news-seen', { id: nl[1], sub: who, ev: 'o' }).catch(() => {});
      const gif = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));
      return new Response(gif, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' } });
    }
    const issue = (await call(B, 'news-get', { id: nl[1] }).catch(() => ({}))).issue, lang = NEWS_LANGS.includes(url.searchParams.get('l')) ? url.searchParams.get('l') : 'es';
    const to = issue && linkTarget(issue, nl[2], lang, s.site);
    if (!to) return Response.redirect(s.site + '/', 302);
    if (!isTest) {
      await call(B, 'news-click', { id: nl[1], k: nl[2] }).catch(() => {});
      if (who) await call(B, 'news-seen', { id: nl[1], sub: who, ev: nl[2] }).catch(() => {});
    }
    return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }
  if (path === '/mail/unsubscribe' && (req.method === 'GET' || req.method === 'POST')) {
    const t = await readUnsubToken(env, url.searchParams.get('t')), r = t ? await call(acct(env, t.sub), 'mail-off', { kind: t.kind }) : { ok: false };
    if (r.ok && t?.kind === 'news' && env.BUDGET) await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'news-unsub').catch(() => {});
    return new Response(unsubPage(r.lang, r.ok, s.site, t?.kind), { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } });
  }
  // Answering a ticket: the signed link in its emails is the proof (no session; a form, so before the JSON body).
  if (path === '/support/reply' && (req.method === 'GET' || req.method === 'POST')) return supportReply(req, env, url, s.site);
  // Captación (crm.js): a campaign's link, and the way out / the links of its emails (signed; no session).
  let go = path.match(/^\/go\/([\w-]{1,40})$/);
  if (go && req.method === 'GET') return goLink(env, go[1]);
  if (path === '/crm/unsub' && (req.method === 'GET' || req.method === 'POST')) return crmUnsub(req, env, url);
  if (path === '/crm/click' && req.method === 'GET') return crmClick(env, url);
  // Answers to Captación's emails (crm-reply.js): Resend's webhook, signed (no session, no origin).
  if (path === '/crm/inbound' && req.method === 'POST') return crmInbound(req, env, { sendMail, adminEmails: adminEmails(env) });
  // Relay servers (TURN) for the phone remote, voting and live collaboration: a phone on mobile data
  // often can't reach the computer directly. No session (the phone has none); only from Revela's pages.
  if (path === '/ice' && req.method === 'GET') {
    const same = req.headers.get('Sec-Fetch-Site') === 'same-origin' || webOrigin || desktopOrigin;
    return same ? json(await iceServers(env), 200, { 'Cache-Control': 'private, max-age=3600' }) : json({ error: 'origin' }, 403);
  }
  // Anything that changes something, sent with the cookie, must come from Revela's site (no cross-site requests).
  if (req.method === 'POST' && cookieOf(req) && !req.headers.get('Authorization') && !webOrigin) return json({ error: 'origin' }, 403);
  const isDocs = path === '/docs' || path.startsWith('/docs/');
  // (Documents, and the team's templates and pictures, may be big: the rest is small JSON.)
  const maxBody = isDocs || path === '/team/template' || path === '/team/assets' ? (+env.MAX_MB || 30) * 1024 * 1024 : 2e6;
  if (+(req.headers.get('Content-Length') || 0) > maxBody) return json({ error: 'too large' }, 413);
  const text = req.method === 'POST' ? await req.text() : '';
  if (text.length > maxBody) return json({ error: 'too large' }, 413);
  let body = {}; if (text) { try { body = JSON.parse(text); } catch { body = null; } }
  if (req.method === 'POST' && (!body || typeof body !== 'object' || (Array.isArray(body) && path !== '/mcp'))) return json(path === '/mcp' ? { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } } : { error: 'bad request' }, 400);

  // Webinars (crm.js): the upcoming ones, and signing up (only from the site).
  if (path === '/events' && req.method === 'GET') return eventsPublic(env, url, json);
  if (path === '/events/signup') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!webOrigin) return json({ error: 'origin' }, 403);
    return eventSignup(req, env, body, json, { takeQuota, sendMail });
  }
  // The website's visits, counted without cookies (visits.js): only from the site's own pages; and where an address
  // that doesn't exist now goes (the 404 page asks).
  if (path === '/visit') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!webOrigin) return json({ error: 'origin' }, 403);
    return handleVisit(req, env, body, json);
  }
  // «¿Para qué vas a usar Revela?» (the start screen; visits.js): one anonymous count — the answer, its language and
  // whether it was the first answer or a change. No account, address or browser is kept.
  if (path === '/audience') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!webOrigin && !desktopOrigin) return json({ error: 'origin' }, 403);
    if (!env.VISITS || !body || !['edu', 'biz', 'both'].includes(body.v)) return json({ ok: true });
    await visitsCall(env, 'aud', { v: body.v, kind: ['first', 'change', 'skip'].includes(body.kind) ? body.kind : 'first', lang: /^[a-z]{2}$/.test(body.lang || '') ? body.lang : '' });
    return json({ ok: true });
  }
  // The app's own errors (errors.js): from the app (the website's origin or the desktop app), small, capped per person.
  if (path === '/errors') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!webOrigin && !desktopOrigin) return json({ error: 'origin' }, 403);
    if (!env.VISITS || !body || typeof body !== 'object') return json({ ok: true });
    const who = (await sha256((req.headers.get('CF-Connecting-IP') || '') + '|' + (req.headers.get('User-Agent') || ''))).slice(0, 22);
    await visitsCall(env, 'err-hit', { who, report: body });
    return json({ ok: true });
  }
  if (path === '/version' && req.method === 'GET') return json({ version: APP_VERSION, stage: env.STAGE || 'production' }, 200, { 'Cache-Control': 'no-store' });
  if (path === '/redirect' && req.method === 'GET') {
    if (!env.VISITS) return json({ to: null });
    const r = await visitsCall(env, 'redirect', { path: cleanPath(url.searchParams.get('path')) });
    return json(r, 200, { 'Cache-Control': 'no-store' });   // (only asked by 404 pages: a redirect just set works at once)
  }
  // The website's form «Revela para centros» (crm.js): only from the site itself.
  if (path === '/leads') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!webOrigin) return json({ error: 'origin' }, 403);
    return handleLead(req, env, body, json, { takeQuota, sendMail });
  }
  // Production answers the test site: whether an email may have an account there (server-to-server, with the key
  // both share: INTERNAL_KEY; the list is the admin's, plus the admins).
  if (path === '/internal/tester' && req.method === 'POST') {
    if (env.STAGE || !env.INTERNAL_KEY || req.headers.get('X-Internal-Key') !== env.INTERNAL_KEY) return json({ error: 'forbidden' }, 403);
    const email = String(body.email || '').toLowerCase(), list = (await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'testers-get')).testers || [];
    return json({ ok: list.includes(email) || adminEmails(env).includes(email) });
  }
  if (path === '/login' && req.method === 'POST') {
    // (Only from Revela's own pages or the desktop app: a page of another site could otherwise sign someone into the
    // attacker's account — «login CSRF» —; the cookie is SameSite=Strict, but the check costs nothing.)
    if (!webOrigin && !desktopOrigin) return json({ error: 'origin' }, 403);
    const who = await googleUser(body.accessToken, body.idToken, s.clientId, env.FETCH || fetch);
    if (!who) return json({ error: 'not signed in with Google' }, 401);
    if (!(await testerOK(env, who.email))) return json({ error: 'not a tester' }, 403);   // (the test site: invited people only)
    const kind = body.kind === 'desktop' && !webOrigin ? 'desktop' : 'web', lang = langOf(body.lang);
    const r = await call(acct(env, who.sub), 'login', { sub: who.sub, email: who.email, name: who.name, kind, lang, terms: body.terms, news: body.news === true, ...sessionClient(req) });
    if (r.error === 'terms') return json(r, 400);
    if (r.fresh) await welcomeMail(env, who.sub, lang);
    if (r.fresh && body.campaign) await campaignSignup(env, who.sub, String(body.campaign));   // (the campaign that brought a new account: crm.js)
    if (lang) await call(acct(env, 'e:' + who.email), 'set-lang', { lang });   // (for emails to this address: shares, invitations)
    const token = tokenOf(who.sub, r.secret);
    if (kind === 'desktop') return json({ ok: true, token });
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${r.days * 86400}` });
  }
  // The admin «view as user» link (admin.js mints it): consumes the one-time code, installs the read-only session
  // cookie and opens the app. No session of one's own is needed — the code is the single-use proof, good for 5 minutes.
  if (path === '/impersonate/consume' && req.method === 'GET') {
    const sub = url.searchParams.get('sub') || '', code = url.searchParams.get('code') || '';
    const r = sub && code ? await call(acct(env, sub), 'imp-consume', { code }) : { ok: false };
    if (!r.ok) return json({ error: 'not found' }, 404);
    const token = tokenOf(sub, r.secret), maxAge = Math.max(60, Math.round((r.until - Date.now()) / 1000));
    // Destino opcional: una presentación concreta del usuario, en SOLO LECTURA. Por defecto el VISOR
    // (view.html, sin interfaz de edición, inequívoco); con &edit=1, el editor en modo adminview.
    const to = url.searchParams.get('to') || '';
    const dest = /^[\w-]{6,80}$/.test(to)
      ? (url.searchParams.get('edit') === '1' ? '/app/?doc=' + encodeURIComponent(to) + '&adminview=1' : '/app/view.html?doc=' + encodeURIComponent(to))
      : '/app/?adminview=1';
    return new Response(null, { status: 302, headers: { Location: s.site + dest, 'Set-Cookie': `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}` } });
  }
  // The desktop app's start and claim need no session (the verifier is the proof).
  if (path === '/desktop/start' && req.method === 'POST') {
    if (!/^[\w-]{20,64}$/.test(body.nonce || '') || !/^[\w-]{40,64}$/.test(body.challenge || '')) return json({ error: 'bad request' }, 400);
    const r = await (await linkOf(env, body.nonce).fetch('https://do/start', { method: 'POST', body: JSON.stringify({ challenge: body.challenge }) })).json();
    return json(r, r.ok ? 200 : 409);
  }
  if (path === '/desktop/claim' && req.method === 'POST') {
    if (!/^[\w-]{20,64}$/.test(body.nonce || '')) return json({ error: 'bad request' }, 400);
    const res = await linkOf(env, body.nonce).fetch('https://do/claim', { method: 'POST', body: JSON.stringify({ verifier: String(body.verifier || '') }) });
    return json(await res.json(), res.status);
  }

  let me = await sessionOf(req, env);
  if (me && !(await testerOK(env, me.email))) me = null;   // (taken off the test list: as if signed out)
  // The public API and the MCP server: a key (or the desktop app's bearer), never the cookie; and a key opens nothing else.
  if (open) {
    if (me?.via === 'cookie') me = null;
    if (!me) return json(path === '/mcp' ? { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: connect your Revela account' } } : { error: 'no key', docs: s.site + '/developers' }, 401, { 'WWW-Authenticate': mcpChallenge(env) });
    if (me.blocked) return json({ error: 'blocked' }, 403);
    return path === '/mcp' ? handleMcp(req, env, me, body, json) : handleV1(path, req, body, url, env, me, json);
  }
  if (me?.via === 'key') return json({ error: 'an API key only opens /api/v1 and /api/mcp' }, 403);
  // An admin «view as user» session is READ-ONLY: only GET (and /logout, to leave it). Nothing in the account can be
  // changed from it — the guard is here, on the server, not only in the app. (The app also shows a banner and hides the
  // controls, but a hand-made POST wouldn't get past this.)
  if (me?.impersonation && path !== '/logout' && (req.method !== 'GET' || ['/billing/portal', '/account/export'].includes(path)))
    return json({ error: 'read-only', message: 'Visualización de administración: la sesión es de solo lectura.' }, 403);
  // Votes through the server (broadcast.js): a phone's way in — with its account when it has a session here (a poll
  // that asks to sign in counts one vote per account) — and the 5 letters of a room typed on vote.html.
  const vt = path.match(/^\/vote\/([\w-]{1,40})$/);
  if (vt && req.method === 'GET') return vt[1] === 'code' ? json({ error: 'not found' }, 404) : joinVote(req, env, vt[1], me && !me.blocked ? me.sub : null);
  const vc = path.match(/^\/vote\/code\/(\w{1,10})$/);
  if (vc && req.method === 'GET') return voteCode(env, vc[1].toUpperCase(), json);
  // What is asking to connect (the app shows it before asking; no session needed).
  if (path === '/oauth/info' && req.method === 'POST') return connectInfo(env, body, json);
  // Reporting a problem: with a session or with an email address; only from Revela itself (admin.js).
  if (path === '/support') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!webOrigin && !desktopOrigin) return json({ error: 'origin' }, 403);
    return createTicket(req, env, me, body, json);
  }
  // Ambassadors (crm.js): the public list, a badge and its check need no session; applying does.
  if (path === '/ambassadors' || path.startsWith('/ambassadors/')) {
    const who = me && { sub: me.sub, email: (await call(acct(env, me.sub), 'me')).email };
    return handleAmbassadors(path, req, body, env, who, json);
  }
  // The community gallery (community.js): reading needs no session; publishing does.
  if (path === '/community' || path.startsWith('/community/')) {
    const who = me && { sub: me.sub };
    return handleCommunity(path, req, body, url, env, who, json, { webOrigin, takeQuota });
  }
  // A blocked account: its data and its account, yes; the rest, no.
  if (me?.blocked && !['/me', '/logout', '/sessions', '/terms', '/mail/prefs', '/account/export', '/account/delete'].includes(path))
    return json({ error: 'blocked', message: 'Esta cuenta está bloqueada. Si crees que es un error, escríbenos desde Revela ▸ Vista ▸ Informar de un problema.' }, 403);
  // Cloud documents: a link may give access without a session (to read).
  if (isDocs) {
    // (Answering a poll by its link: only whose account it is, when the poll asks to sign in — not the profile and team
    // below, three more requests per vote.)
    if (/^\/docs\/[\w-]{16,40}\/poll\/[\w-]{4,40}$/.test(path)) return handleDocs(path, req, body, url, env, me && { sub: me.sub }, json);
    // (The team only while they really are in it: someone taken out keeps its id in their account until it's noticed.)
    const who = me && { ...me, ...(await call(acct(env, me.sub), 'me')) }, tid = me && (await call(acct(env, me.sub), 'team-id')).id;
    const team = tid && (await teamStatus(env, tid, who.email))?.member ? tid : null;
    return handleDocs(path, req, body, url, env, who && { sub: me.sub, email: who.email, name: who.name, plan: who.plan, features: who.features, ...(team && { team }) }, json);
  }
  // The welcome message of a new account (set in the admin; off by default): no session needed.
  if (path === '/welcome' && req.method === 'GET') return json({ welcome: welcomeFor(await welcomeConfig(env), langOf(url.searchParams.get('lang'))) });
  // Notices (notices.js): no session needed; with one, chosen by its plan.
  if (path === '/notices' && req.method === 'GET') {
    const where = url.searchParams.get('where');
    if (!NOTICE_PLACES.includes(where) || !env.BUDGET) return json({ notices: [] });
    const plan = me ? ((await call(acct(env, me.sub), 'me')).plan === 'pro' ? 'pro' : 'free') : 'anon';
    return json({ notices: noticesFor(await noticeList(env), { where, lang: url.searchParams.get('lang'), plan }) });
  }
  if (path === '/notices/hit' && req.method === 'POST') {
    if (env.BUDGET && typeof body.id === 'string' && body.id.length <= 20) await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'notice-hit', { id: body.id, kind: body.kind }).catch(() => null);
    return json({ ok: true });
  }
  if (!me) return json({ error: 'no session' }, 401);
  const A = acct(env, me.sub);
  if (path.startsWith('/call/') && req.method === 'POST') { const prof = await call(A, 'me'); return handleCalls(path, body, env, { sub: me.sub, email: prof.email, features: prof.features }, A, call, json); }
  if (path === '/3d' || path.startsWith('/3d/')) return handle3d(path, req, body, env, me, A, json);
  // The guided tours (the app's ui/shell/tour.js): which ones this person finished and — when the admin turned it on —
  // the credits for finishing them all, granted here once (the app only says which tour it finished).
  // A presentation saved in (or sent to the bin of) the person's Google Drive: its name, slides, size — what the
  // admin sees of it (Usuarios ▸ Google Drive). The content stays in their Drive.
  if (path === '/drive/seen' && req.method === 'POST') {
    const id = String(body?.id || '');
    if (!/^[\w-]{10,100}$/.test(id)) return json({ error: 'bad request' }, 400);
    const r = await call(A, 'drive-seen', body.gone ? { id, gone: true }
      : { id, title: String(body.title ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200), slides: Math.max(0, Math.min(5000, Math.round(+body.slides) || 0)), bytes: Math.max(0, Math.round(+body.bytes) || 0) });
    if (!body.gone && env.BUDGET) await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'drive-count', { month: r.month, fresh: r.fresh }).catch(() => {});
    return json({ ok: true });
  }
  if (path === '/tours' && req.method === 'GET') {
    const cfg = await toursConfig(env), r = await call(A, 'tours-get');
    const left = !toursActive(cfg) ? 0 : !cfg.monthlyPeople || r.claimed === monthOf() ? Infinity
      : cfg.monthlyPeople - (await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'tours-month', { month: monthOf() })).people;
    const perTour = Object.fromEntries(Object.entries(cfg.perTour || {}).filter(([k]) => !r.paid.includes(k)));
    return json({ done: r.done, reward: toursActive(cfg) && left > 0 && (Object.keys(perTour).length || (cfg.credits && !r.rewarded)) ? { perTour, credits: r.rewarded ? 0 : cfg.credits } : null });
  }
  if (path === '/tours/done' && req.method === 'POST') {
    if (!TOUR_KEYS.includes(body?.tour)) return json({ error: 'bad request' }, 400);
    const cfg = await toursConfig(env), ask = { tour: body.tour, all: TOUR_KEYS, days: cfg.days };
    const offer = toursActive(cfg) ? { per: cfg.perTour?.[body.tour] || 0, bonus: cfg.credits } : {};
    // (Within the month's limit of people — an account counted once a month —; over it, the tour is marked done and
    // nothing is given.)
    const month = monthOf(), would = toursActive(cfg) ? (await call(A, 'tour-done', { ...ask, ...offer, dry: true })).would : 0;
    const counted = would && (await call(A, 'tours-get')).claimed === month;
    const ok = !would || counted || (await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'tours-claim', { month, max: cfg.monthlyPeople })).ok;
    const res = await call(A, 'tour-done', { ...ask, ...(ok && offer), ...(ok && would && { claim: month }) });
    // (The first time this person finishes this tour: in the admin's log, with what it gave.)
    if (res.fresh) await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'tours-log-add', { at: Date.now(), sub: me.sub, email: (await call(A, 'me')).email, tour: body.tour, granted: res.granted }).catch(() => {});
    return json(res);
  }
  // «Desarrolladores»: my API keys, and saying yes to an app that asks to connect (publicapi.js).
  if (path === '/keys' || path.startsWith('/keys/')) return handleKeys(path, req, body, me, A, json);
  if (path === '/hooks' || path.startsWith('/hooks/')) return handleHooks(path, req, body, me, A, env, json);
  if (path === '/oauth/approve' && req.method === 'POST') return connectApprove(env, me, body, json);
  // A room for the polls of a presentation about to start (the presenter: broadcast.js).
  if (path === '/vote' && req.method === 'POST') return startVote(env, me, json);
  if (path === '/live' && req.method === 'POST') {
    const prof = await call(A, 'me'), who = { sub: me.sub, email: prof.email, name: prof.name, plan: prof.plan, features: prof.features };
    const read = async (id, w) => handleDocs('/docs/' + id, { method: 'GET', headers: new Headers() }, {}, new URL('https://x/docs/' + id), env, w && who, (data, status = 200) => ({ data, status }));
    return startLive(env, me, body, json, read);
  }
  // «Recomienda Revela a tu centro» (crm.js): my link and what it has brought.
  if (path === '/referral' && req.method === 'GET') { const prof = await call(A, 'me'); return referralInfo(env, { sub: me.sub, email: prof.email }, json); }
  if (path === '/team' || path.startsWith('/team/')) { const prof = await call(A, 'me'); return handleTeams(path, req, body, url, env, { sub: me.sub, email: prof.email, name: prof.name }, A, acct, call, json); }
  switch (path) {
    case '/me': {
      // (billing: payments set up for this account's mode; billingTest: it pays in Stripe's test mode — the app says so.)
      const r = await call(A, 'me'), mode = billingMode(env, r.billingTest), billing = stripeConf(env, mode).ok;
      // (portal: there is something paid in this mode to manage — «Gestionar la suscripción».)
      const cu = await call(A, 'customer'), portal = billing && !!(mode === 'test' ? cu.customerTest : cu.customer);
      // (Pro's free trial on offer: for the Pro buttons — «Prueba Pro 7 días gratis».)
      const trialDays = billing && r.plan !== 'pro' ? await trialOffer(env, A, mode) : 0;
      // (A renewed session: its cookie lasts as long again — the app asks /me when it opens.)
      const renew = me.renewed && me.via === 'cookie' ? { 'Set-Cookie': `${COOKIE}=${me.raw}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${me.renewed * 86400}` } : {};
      return json({ ...r, billing, billingTest: mode === 'test', portal, trialDays, photos: photoProviders(env), model3d: (configured3d(env) || configured3dAny(env)) && !!env.MODELJOBS, ...(me.impersonation && { impersonation: { by: me.impersonation.by, until: me.impersonation.until } }) }, 200, renew);
    }
    case '/mail/test': {                                  // «Send me a test email» (only to the account's own address)
      if (req.method !== 'POST') return json({ error: 'method' }, 405);
      const r = await call(A, 'mail-test'); return json(r, r.error === 'too soon' ? 429 : r.error ? 503 : r.ok ? 200 : 502);
    }
    case '/mail/prefs': {                                 // GET → { off, optional }; POST { off: [kinds] }
      const pr = await call(A, 'mail-prefs', req.method === 'POST' ? { off: body.off, news: body.news } : {});
      if (req.method === 'POST' && body.news === false && pr.news === false && env.BUDGET) await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'news-unsub').catch(() => {});
      return json(pr);
    }
    case '/terms': {
      if (req.method !== 'POST') return json({ error: 'method' }, 405);
      const r = await call(A, 'terms', { version: body.version, lang: langOf(body.lang) });
      return json(r, r.error ? 400 : 200);
    }
    case '/logout': {
      await call(A, 'logout', { secret: me.secret });
      return json({ ok: true }, 200, me.via === 'cookie' ? { 'Set-Cookie': `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } : {});
    }
    // My open sessions: the list, and closing one (id) or all the others (others: true) — never this one: that's /logout.
    case '/sessions': {
      if (req.method === 'GET') return json(await call(A, 'sessions', { secret: me.secret }));
      if (req.method !== 'POST') return json({ error: 'method' }, 405);
      if (!body.others && !/^[\w-]{16}$/.test(body.id || '')) return json({ error: 'bad request' }, 400);
      return json(await call(A, 'sessions-end', { ...(!body.others && { ids: [body.id] }), keep: me.secret }));
    }
    case '/desktop/approve': {                             // the signed-in browser gives the desktop app its own session
      if (me.via !== 'cookie' || !/^[\w-]{20,64}$/.test(body.nonce || '')) return json({ error: 'bad request' }, 400);
      const prof = await call(A, 'me'), r = await call(A, 'login', { sub: me.sub, email: prof.email, kind: 'desktop' });
      const res = await linkOf(env, body.nonce).fetch('https://do/approve', { method: 'POST', body: JSON.stringify({ code: String(body.code || '').toUpperCase(), token: tokenOf(me.sub, r.secret) }) });
      if (!res.ok) await call(A, 'logout', { secret: r.secret });   // (not used: gone)
      return json(await res.json(), res.status);
    }
    case '/account/export': return accountExport(env, me, A, json);
    case '/account/delete': return accountDelete(env, s, me, A, body, json);
    case '/ai/chat': return aiChat(env, s, A, body, json);
    case '/ai/image': return aiImage(env, s, A, body, json);
    case '/ai/speech': return aiSpeech(env, s, A, body, json);
    case '/brand/site': return req.method === 'POST' ? brandFromSite(env, A, body, json) : json({ error: 'POST' }, 405);
    case '/stock/search': return stockSearch(env, A, url, json);
    case '/stock/used': return stockUsed(env, body, json);
    case '/billing/checkout': return checkout(env, s, me, A, body, json);
    case '/billing/portal': return portal(env, s, A, json);
  }
  return json({ error: 'not found' }, 404);
}
const linkOf = (env, nonce) => env.DESKTOP.get(env.DESKTOP.idFromName('d:' + nonce));
const langOf = l => (typeof l === 'string' && /^[a-z]{2}$/.test(l) ? l : null);

// A Google sign-in, checked with Google: an ID token (its signature) or an
// access token (tokeninfo), issued to Revela's client, with a verified email.
async function googleUser(accessToken, idToken, clientId, fetchImpl) {
  if (!clientId) return null;
  if (idToken) { const c = await verifyGoogleToken(idToken, clientId, fetchImpl).catch(() => null); return c && c.email_verified && c.sub ? { sub: c.sub, email: String(c.email).toLowerCase(), name: nameOf(c.name) } : null; }
  if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 4096) return null;
  const r = await fetchImpl('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken)).catch(() => null);
  if (!r || !r.ok) return null;
  const i = await r.json();
  if ((i.aud !== clientId && i.azp !== clientId) || !i.sub || !i.email || String(i.email_verified) !== 'true') return null;
  // (The name, to sign the emails sent for this person — "Ana shared…"; optional.)
  const u = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + accessToken } }).then(x => (x.ok ? x.json() : null)).catch(() => null);
  return { sub: String(i.sub), email: String(i.email).toLowerCase(), name: u?.sub === String(i.sub) ? nameOf(u.name) : null };
}

const nameOf = n => (typeof n === 'string' && n.trim() ? n.replace(/[<>\r\n]/g, '').trim().slice(0, 80) : null);

// ---- Your data (GDPR): a copy of everything, or delete it all -----------------------------------
async function accountExport(env, me, A, json) {
  const data = await call(A, 'export'), inbox = data.profile.email ? (await call(acct(env, 'e:' + data.profile.email), 'inbox-list')).docs : [];
  const docs = [];
  for (const d of data.docs) { const r = await env.DOCS?.get(env.DOCS.idFromName('doc:' + d.id)).fetch('https://doc/get', { method: 'POST', body: JSON.stringify({ who: { sub: me.sub } }) });
    if (r?.ok) { const x = await r.json(); docs.push({ id: d.id, name: x.name, updated: x.updated, sharing: x.sharing, deck: x.deck }); } }
  return json({ exported: new Date().toISOString(), account: { ...data.profile, plan: data.plan, credits: data.credits }, ledger: data.ledger, sessions: data.sessions, documents: docs, sharedWithMe: inbox },
    200, { 'Content-Disposition': 'attachment; filename="revela-mis-datos.json"' });
}
// Delete the account: its documents (and who they were shared with), its list of
// shared documents, its sessions and credits; a Stripe subscription is cancelled.
// Invoices stay with Stripe (the law asks to keep them). To be sure it's wanted,
// the email must be typed, and a session in the browser (not a desktop token) is needed.
async function accountDelete(env, s, me, A, body, json) {
  const prof = await call(A, 'me');
  if (String(body.confirm || '').trim().toLowerCase() !== prof.email) return json({ error: 'confirm' }, 400);
  if (me.via !== 'cookie') return json({ error: 'from the website' }, 403);
  const w = await deleteAccount(env, me.sub);
  if (w.email) await mail(env, { to: w.email, kind: 'deleted', lang: w.lang, vars: {} });   // (the confirmation)
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
}
// (Also for an account unused for two years: schedule.js.) → { email, lang } it had.
export async function deleteAccount(env, sub) {
  const w = await call(acct(env, sub), 'wipe');
  for (const id of w.docs) {
    const r = await env.DOCS?.get(env.DOCS.idFromName('doc:' + id)).fetch('https://doc/delete', { method: 'POST', body: JSON.stringify({ who: { sub } }) });
    const people = r?.ok ? (await r.json()).people || [] : [];
    for (const e of people) await call(acct(env, 'e:' + e), 'inbox-remove', { id });
  }
  if (w.email) await call(acct(env, 'e:' + w.email), 'wipe');
  if (env.BUDGET) await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'news-forget', { sub }).catch(() => {});   // (what it opened and clicked in the newsletters)
  for (const [customer, key] of [[w.customer, env.STRIPE_SECRET_KEY], [w.customerTest, env.STRIPE_TEST_SECRET_KEY]]) {
    if (!customer || !key) continue;
    const subs = await (await (env.FETCH || fetch)('https://api.stripe.com/v1/subscriptions?' + new URLSearchParams({ customer, status: 'active' }), { headers: { Authorization: `Bearer ${key}` } }).catch(() => null))?.json().catch(() => null);
    for (const x of subs?.data || []) await (env.FETCH || fetch)('https://api.stripe.com/v1/subscriptions/' + encodeURIComponent(x.id), { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } }).catch(() => null);
  }
  return { email: w.email, lang: w.lang };
}
