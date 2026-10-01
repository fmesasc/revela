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
//   GET  /api/me               → { email, plan, credits, features, billing, terms (accepted the current ones?), docs }
//   POST /api/terms            { version, lang? }       (accepting the current terms, once; accounts from before)
//   GET|POST /api/mail/unsubscribe?t=…                  (stop optional notices; signed link in the email: mail.js)
//   POST /api/ai/chat          { messages, max_tokens?, json? } → OpenRouter's answer (credits charged)
//   POST /api/ai/image         { prompt, aspect_ratio? } → { data: [{ b64_json, media_type }] }
//   POST /api/ai/speech        { input, voice?, speed? } → { audio (base64 mp3) }  (credits per character)
//   GET  /api/stock/search     ?provider=unsplash|pexels&q=&page= → { results }   (Revela's keys; per-minute limit)
//   POST /api/stock/used       { provider, id }        (Unsplash asks to be told when a photo is used)
//   POST /api/billing/checkout { product } → { url }   (Stripe Checkout)
//   POST /api/billing/portal   → { url }                (Stripe customer portal)
//   POST /api/billing/webhook  Stripe's events (signed)
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
//
// Sessions: a cookie on the web (HttpOnly, Secure, SameSite=Strict, only for
// /api), a bearer token in the desktop app. Only a hash of each is stored.

import { verifyGoogleToken } from './auth.js';
import { handleDocs } from './docs.js';
import { handleTeams, teamStatus } from './teams.js';
import { handleLti } from './lti.js';
import { handleCalls } from './calls.js';
import { docsSettings } from './docs.js';
import { mail, readUnsubToken, unsubPage, fmtDate } from './mail.js';
import { scheduleAt, dayOf } from './schedule.js';
import { handle3d, configured3d } from './model3d.js';

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async s => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const DAY = 864e5;

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
    maxTokens: num(env.AI_MAX_TOKENS, 4000),
    models: String(env.AI_MODELS || 'openai/gpt-4o-mini,anthropic/claude-haiku-4.5,google/gemini-2.5-flash').split(/[\s,]+/).filter(Boolean),
    imageModel: env.AI_IMAGE_MODEL || 'bytedance-seed/seedream-4.5',
    ttsModel: env.AI_TTS_MODEL || 'openai/gpt-4o-mini-tts-2025-12-15',
    ttsVoices: String(env.AI_TTS_VOICES || 'alloy,ash,ballad,coral,echo,fable,nova,onyx,sage,shimmer').split(/[\s,]+/).filter(Boolean),
    ttsUsdPerChar: num(env.AI_TTS_USD_PER_CHAR, 0.00002),      // (priced per character; the provider doesn't report it back: a cautious figure)
    // Price per million tokens [input, output] in dollars, for the estimate before a request.
    prices: (() => { try { return JSON.parse(env.AI_PRICES || '{}'); } catch { return {}; } })(),
    products: {                                          // Stripe prices (ids) and what each gives
      'pro-month': { price: env.STRIPE_PRICE_PRO_MONTH, mode: 'subscription' },
      'pro-year': { price: env.STRIPE_PRICE_PRO_YEAR, mode: 'subscription' },
      'credits-500': { price: env.STRIPE_PRICE_CREDITS_500, mode: 'payment', credits: 500 },
      'credits-1500': { price: env.STRIPE_PRICE_CREDITS_1500, mode: 'payment', credits: 1500 },
      'team-seat': { price: env.STRIPE_PRICE_TEAM_SEAT, mode: 'subscription', team: true },   // (per seat and month; quantity = seats)
    },
  };
}
export const FEATURES = { free: ['ai', 'cloud-save'], pro: ['ai', 'cloud-save', 'share-people', 'analytics', 'video-calls', 'premium-templates'] };

// ---- One account ------------------------------------------------------------------------
export class Account {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
  async get(k, d) { const v = await this.ctx.storage.get(k); return v === undefined ? d : v; }
  async put(o) { await this.ctx.storage.put(o); }
  // The plan now: Pro while paid (and a few days' grace), else free.
  async plan() { const p = await this.get('plan', null); return p && p.until > Date.now() ? p.name : 'free'; }
  // Credits come in lots, each with its expiry ({ n, exp }); they are spent from the one that
  // expires first. What a request really cost beyond the balance is a debt, paid by the next
  // credits. 'credits' is always the balance: the lots minus the debt.
  async lots() {
    let lots = await this.get('lots', null);
    if (!lots) { const c = await this.get('credits', 0); lots = c > 0 ? [{ n: c, exp: Date.now() + 365 * DAY }] : []; }   // (from before lots)
    return lots;
  }
  async save(lots, debt) {
    const by = new Map(); for (const l of lots) if (l.n > 0) by.set(l.exp, (by.get(l.exp) || 0) + l.n);   // (one lot per expiry)
    lots = [...by].map(([exp, n]) => ({ n, exp })).sort((a, b) => a.exp - b.exp);
    const credits = lots.reduce((t, l) => t + l.n, 0) - debt;
    await this.put({ lots, debt, credits }); return credits;
  }
  async add(n, exp) {                                     // → balance
    const lots = await this.lots(); let debt = await this.get('debt', 0);
    const pay = Math.min(debt, n); debt -= pay; n -= pay;
    if (n > 0) { lots.push({ n, exp }); await this.remind(exp); }
    return this.save(lots, debt);
  }
  // A lot of credits: a notice 7 days before it expires (once per lot; the daily run checks it's still there).
  async remind(exp) {
    const sub = (await this.get('profile', {})).sub, done = await this.get('reminders', []); if (!sub || done.includes(exp)) return;
    await this.put({ reminders: [...done.filter(x => x > Date.now()), exp].slice(-50) });
    await scheduleAt(this.env, exp - 7 * DAY, sub, 'credits', String(exp));
  }
  async take(n) {                                         // → [{ n, exp }] taken (to give back exactly), balance
    const lots = await this.lots(), taken = []; let debt = await this.get('debt', 0);
    for (const l of lots) { if (!n) break; const k = Math.min(l.n, n); l.n -= k; n -= k; taken.push({ n: k, exp: l.exp }); }
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
  async log(delta, reason, ref) {
    const list = await this.get('ledger', []);
    list.push({ at: Date.now(), delta, reason, ...(ref && { ref }), balance: await this.get('credits', 0) });
    await this.put({ ledger: list.slice(-500) });
  }
  async entry(delta, reason, ref, days = 365) {
    const bal = delta >= 0 ? await this.add(delta, Date.now() + days * DAY) : (await this.take(-delta)).credits;
    await this.log(delta, reason, ref);
    return bal;
  }
  // Pro's month: while the plan (own or the team's) lasts, its credits every 30 days, whatever
  // the billing period (monthly, yearly or a team's), each lot for that month and the next.
  async monthly(pro, s) {
    const last = await this.get('monthly', 0);
    if (!pro || Date.now() - last < 30 * DAY || s.proCredits <= 0) return;
    await this.put({ monthly: Date.now() });
    await this.entry(s.proCredits, 'pro', null, s.monthDays);
  }
  async isPro() {
    if ((await this.plan()) === 'pro') return true;
    const teamId = await this.get('team', null); if (!teamId) return false;
    const t = await teamStatus(this.env, teamId, (await this.get('profile', {})).email).catch(() => null);
    return !!(t?.member && t.active);
  }
  // The lots that expire next (to show them): [{ n, exp }], the soonest first.
  async soon() { return (await this.lots()).filter(l => l.exp > Date.now()).slice(0, 3); }
  // Cloud documents beyond the plan's limit are read-only: all but the N most recently edited
  // (N = the plan's limit). Nothing is deleted; going back to Pro or deleting some unlocks them.
  async docState(pro) {
    const ds = docsSettings(this.env), limit = (pro ?? (await this.isPro())) ? ds.proDocs : ds.freeDocs;
    const docs = (await this.get('docs', [])).slice().sort((x, y) => y.updated - x.updated);
    return { limit, docs, locked: docs.slice(limit).map(d => d.id) };
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
    await this.put({ lastSeen: today });
    if (!(await this.get('idleNext', null))) await this.idleFrom(today);
  }
  async idleFrom(day) {
    const sub = (await this.get('profile', {})).sub; if (!sub) return;
    const ref = 'w30:' + day; await this.put({ idleNext: ref });
    await scheduleAt(this.env, Date.parse(day) + (settings(this.env).idleDays - 30) * DAY, sub, 'idle', ref);
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
        await scheduleAt(this.env, stage === 'w30' ? end - 7 * DAY : end, prof.sub, 'idle', next);
      } else if (stage === 'del') return { delete: true };
    }
    return {};
  }
  // One request at a time, whole (Cloudflare already runs a Durable Object's
  // storage steps in order; this also keeps any await in between from mixing two).
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = req.method === 'POST' ? await req.json() : {};
    const s = settings(this.env);
    switch (op) {
      case 'login': {                                      // { sub, email, name?, kind, terms?, lang? } → { token }
        const prof = await this.get('profile', null), terms = a.terms === s.termsVersion ? { version: s.termsVersion, at: Date.now() } : null;
        if (!prof && !terms) return this.json({ error: 'terms', version: s.termsVersion });   // (a new account accepts the terms first)
        if (!prof) { await this.put({ profile: { sub: a.sub, email: a.email, ...(a.name && { name: a.name }), ...(a.lang && { lang: a.lang }), created: Date.now(), terms } }); if (s.trial > 0) await this.entry(s.trial, 'trial', null, s.trialDays); }
        else {
          const next = { ...prof, email: a.email, ...(a.name && { name: a.name }), ...(a.lang && { lang: a.lang }), ...(terms && prof.terms?.version !== s.termsVersion && { terms }) };
          if (JSON.stringify(next) !== JSON.stringify(prof)) await this.put({ profile: next });
        }
        await this.seen();
        const secret = random(32), sessions = await this.get('sessions', {});
        const days = a.kind === 'desktop' ? 90 : 30;
        // (At most 20 sessions: the oldest go.)
        const kept = Object.entries(sessions).filter(([, v]) => v.expires > Date.now()).sort((x, y) => y[1].created - x[1].created).slice(0, 19);
        await this.put({ sessions: { ...Object.fromEntries(kept), [await sha256(secret)]: { created: Date.now(), expires: Date.now() + days * DAY, kind: a.kind || 'web' } } });
        return this.json({ secret, days });
      }
      case 'check': {                                      // { secret } → ok?
        const sessions = await this.get('sessions', {}), v = sessions[await sha256(a.secret || '')], ok = !!v && v.expires > Date.now();
        if (ok) await this.seen();
        return this.json({ ok });
      }
      case 'logout': {
        const sessions = await this.get('sessions', {}); delete sessions[await sha256(a.secret || '')];
        await this.put({ sessions }); return this.json({ ok: true });
      }
      case 'me': {
        const prof = await this.get('profile', {}), own = await this.plan(), p = await this.get('plan', null), teamId = await this.get('team', null);
        // (A member of a paid team has Pro too.)
        const team = teamId ? await teamStatus(this.env, teamId, prof.email).catch(() => null) : null, byTeam = !!(team?.member && team.active);
        const plan = own === 'pro' || byTeam ? 'pro' : 'free';
        await this.expire(); await this.monthly(plan === 'pro', s);
        const ds = await this.docState(plan === 'pro');
        return this.json({ email: prof.email, name: prof.name || null, plan, until: own === 'pro' ? p.until : null, credits: await this.get('credits', 0), expiring: await this.soon(), features: FEATURES[plan] || FEATURES.free,
          terms: prof.terms?.version === s.termsVersion, docs: { n: ds.docs.length, limit: ds.limit, readOnly: ds.locked.length },
          ...(team?.member && { team: { name: team.name, role: team.role, active: team.active } }) });
      }
      case 'terms': {                                      // { version, lang? }: the current terms, accepted
        const prof = await this.get('profile', null); if (!prof || a.version !== s.termsVersion) return this.json({ error: 'terms', version: s.termsVersion }, 400);
        await this.put({ profile: { ...prof, terms: { version: s.termsVersion, at: Date.now() }, ...(a.lang && { lang: a.lang }) } }); return this.json({ ok: true });
      }
      case 'mail-off': {                                   // { kind }: no more of these (the signed link in an email)
        const prof = await this.get('profile', null); if (!prof) return this.json({ ok: false });
        const off = await this.get('mailOff', []); if (!off.includes(a.kind)) await this.put({ mailOff: [...off, a.kind] });
        return this.json({ ok: true, lang: prof.lang });
      }
      case 'plan-ending': {                                // { end, ref }: Pro was cancelled and ends then (end 0: renewed again)
        if (!+a.end) { await this.put({ cancelAt: null }); return this.json({ ok: true }); }
        const end = +a.end, lang = (await this.get('profile', {})).lang; await this.put({ cancelAt: end });
        await this.mailMe('proEnding', { date: fmtDate(end, lang), ...(await this.proVars(lang)) }, 'pro-ending:' + end);
        const sub = (await this.get('profile', {})).sub;
        if (end - 7 * DAY > Date.now() + DAY) await scheduleAt(this.env, end - 7 * DAY, sub, 'pro-soon', String(end));
        return this.json({ ok: true });
      }
      case 'plan-ended': {                                 // { ref }: Pro is over
        const lang = (await this.get('profile', {})).lang; await this.put({ cancelAt: null });
        await this.mailMe('proEnded', await this.proVars(lang), 'pro-ended:' + a.ref); return this.json({ ok: true });
      }
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
        await this.entry(-used, a.reason || 'ai', a.ref); return this.json({ ok: true, used });
      }
      case 'grant': {                                      // { credits, reason, ref } — once per ref (payments)
        const done = await this.get('refs', []);
        if (a.ref && done.includes(a.ref)) return this.json({ ok: true, duplicate: true });
        await this.put({ refs: [...done, a.ref].filter(Boolean).slice(-300) });
        const bal = await this.entry(Math.round(+a.credits || 0), a.reason || 'grant', a.ref, +a.days || s.packDays);
        return this.json({ ok: true, credits: bal });
      }
      case 'setplan': {                                    // { name, until, customer? }
        await this.put({ plan: { name: a.name, until: +a.until || 0 }, ...(a.customer && { customer: a.customer }) });
        return this.json({ ok: true });
      }
      case 'customer': return this.json({ customer: await this.get('customer', null), email: (await this.get('profile', {})).email });
      // Cloud documents: the owner's list (with the plan's limit), and "shared with me" (in the 'e:' + email objects).
      // Everything this account holds (to hand over), and wiping it (the account is closed).
      case 'export': return this.json({ profile: await this.get('profile', {}), plan: await this.get('plan', null), credits: await this.get('credits', 0), lastSeen: await this.get('lastSeen', null), mailOff: await this.get('mailOff', []),
        ledger: await this.get('ledger', []), docs: await this.get('docs', []), sessions: Object.values(await this.get('sessions', {})).map(v => ({ created: v.created, expires: v.expires, kind: v.kind })) });
      case 'wipe': {
        const prof = await this.get('profile', {}), out = { docs: (await this.get('docs', [])).map(d => d.id), customer: await this.get('customer', null), email: prof.email || null, lang: prof.lang || null };
        await this.ctx.storage.deleteAll(); return this.json(out);
      }
      case 'docs-list': { const d = await this.docState(); return this.json({ docs: (await this.get('docs', [])).map(x => (d.locked.includes(x.id) ? { ...x, readOnly: true } : x)), limit: d.limit }); }
      case 'docs-locked': { const d = await this.docState(); return this.json({ locked: d.locked.includes(a.id), limit: d.limit }); }
      case 'docs-add': {
        const docs = await this.get('docs', []);
        if (docs.length >= +a.limit) return this.json({ ok: false, limit: +a.limit });
        docs.unshift({ id: a.id, name: a.name, updated: Date.now() }); await this.put({ docs }); return this.json({ ok: true });
      }
      case 'docs-touch': {
        const docs = await this.get('docs', []), d = docs.find(x => x.id === a.id); if (!d) return this.json({ ok: false });
        Object.assign(d, { name: a.name, updated: Date.now() }); docs.sort((x, y) => y.updated - x.updated); await this.put({ docs }); return this.json({ ok: true });
      }
      case 'docs-remove': await this.put({ docs: (await this.get('docs', [])).filter(x => x.id !== a.id) }); return this.json({ ok: true });
      case 'inbox-list': return this.json({ docs: await this.get('inbox', []) });
      case 'inbox-add': {
        const inbox = (await this.get('inbox', [])).filter(x => x.id !== a.id);
        inbox.unshift({ id: a.id, name: a.name, owner: a.owner, role: a.role, at: Date.now() }); await this.put({ inbox: inbox.slice(0, 1000) }); return this.json({ ok: true, lang: await this.get('lang', null) });
      }
      case 'inbox-remove': await this.put({ inbox: (await this.get('inbox', [])).filter(x => x.id !== a.id) }); return this.json({ ok: true });
    }
    return this.json({ error: 'unknown' }, 404);
  }
}

// ---- The AI budget: all accounts together, per calendar month --------------------------------
export class Budget {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = req.method === 'POST' ? await req.json() : {};
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
      await st.put('link', { challenge: a.challenge, expires: Date.now() + 10 * 60e3 }); await st.setAlarm?.(Date.now() + 10 * 60e3);
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
  async alarm() { await this.ctx.storage.deleteAll(); }
}

// ---- Requests ----------------------------------------------------------------------------------------
export const acct = (env, sub) => env.ACCOUNTS.get(env.ACCOUNTS.idFromName('u:' + sub));
export const call = async (stub, op, body) => (await stub.fetch('https://do/' + op, { method: 'POST', body: JSON.stringify(body || {}) })).json();
const COOKIE = 'rv_session';
const tokenOf = (sub, secret) => `${b64url(enc.encode(sub))}.${secret}`;
const parseToken = t => { const [a, b] = String(t || '').split('.'); if (!a || !b) return null; try { return { sub: new TextDecoder().decode(Uint8Array.from(atob(a.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((a.length + 3) % 4)), c => c.charCodeAt(0))), secret: b }; } catch { return null; } };
const cookieOf = req => (req.headers.get('Cookie') || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === COOKIE)?.[1] || '';

// Who is asking: a valid session (cookie on the web, bearer in the desktop app), or null.
async function sessionOf(req, env) {
  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer /, ''), fromCookie = cookieOf(req);
  const raw = bearer || fromCookie, t = parseToken(raw); if (!t) return null;
  const r = await call(acct(env, t.sub), 'check', { secret: t.secret });
  return r.ok ? { sub: t.sub, secret: t.secret, via: bearer ? 'bearer' : 'cookie' } : null;
}

export async function handleApi(req, env, url) {
  const s = settings(env), origin = req.headers.get('Origin') || '';
  const webOrigin = s.origins.includes(origin), desktopOrigin = s.desktopOrigins.includes(origin);
  // CORS: only Revela's own site (with its cookie) and the desktop app (bearer only).
  const cors = { 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
    ...(webOrigin && { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }),
    ...(desktopOrigin && { 'Access-Control-Allow-Origin': origin }),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
  const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const path = url.pathname.replace(/^\/api/, '');
  // LTI (learning platforms): their own forms and signed tokens, no session here (lti.js).
  if (path.startsWith('/lti/')) return handleLti(req, env, url, s.site);
  // Stripe's own calls: signed, no browser involved.
  if (path === '/billing/webhook' && req.method === 'POST') return stripeWebhook(req, env, json);
  // The link to stop optional emails (signed; no session: it's opened from the email, or posted by the mail app).
  if (path === '/mail/unsubscribe' && (req.method === 'GET' || req.method === 'POST')) {
    const t = await readUnsubToken(env, url.searchParams.get('t')), r = t ? await call(acct(env, t.sub), 'mail-off', { kind: t.kind }) : { ok: false };
    return new Response(unsubPage(r.lang, r.ok, s.site), { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Referrer-Policy': 'no-referrer' } });
  }
  // Anything that changes something, sent with the cookie, must come from Revela's site (no cross-site requests).
  if (req.method === 'POST' && cookieOf(req) && !req.headers.get('Authorization') && !webOrigin) return json({ error: 'origin' }, 403);
  const isDocs = path === '/docs' || path.startsWith('/docs/');
  const maxBody = isDocs ? (+env.MAX_MB || 30) * 1024 * 1024 : 2e6;
  if (+(req.headers.get('Content-Length') || 0) > maxBody) return json({ error: 'too large' }, 413);
  const text = req.method === 'POST' ? await req.text() : '';
  if (text.length > maxBody) return json({ error: 'too large' }, 413);
  let body = {}; if (text) { try { body = JSON.parse(text); } catch { body = null; } }
  if (req.method === 'POST' && (!body || typeof body !== 'object' || Array.isArray(body))) return json({ error: 'bad request' }, 400);

  if (path === '/login' && req.method === 'POST') {
    const who = await googleUser(body.accessToken, body.idToken, s.clientId, env.FETCH || fetch);
    if (!who) return json({ error: 'not signed in with Google' }, 401);
    const kind = body.kind === 'desktop' && !webOrigin ? 'desktop' : 'web', lang = langOf(body.lang);
    const r = await call(acct(env, who.sub), 'login', { sub: who.sub, email: who.email, name: who.name, kind, lang, terms: body.terms });
    if (r.error === 'terms') return json(r, 400);
    if (lang) await call(acct(env, 'e:' + who.email), 'set-lang', { lang });   // (for emails to this address: shares, invitations)
    const token = tokenOf(who.sub, r.secret);
    if (kind === 'desktop') return json({ ok: true, token });
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${r.days * 86400}` });
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

  const me = await sessionOf(req, env);
  // Cloud documents: a link may give access without a session (to read).
  if (isDocs) {
    const who = me && { ...me, ...(await call(acct(env, me.sub), 'me')) };
    return handleDocs(path, req, body, url, env, who && { sub: me.sub, email: who.email, name: who.name, plan: who.plan, features: who.features }, acct, call, json);
  }
  if (!me) return json({ error: 'no session' }, 401);
  const A = acct(env, me.sub);
  if (path.startsWith('/call/') && req.method === 'POST') { const prof = await call(A, 'me'); return handleCalls(path, body, env, { sub: me.sub, email: prof.email, features: prof.features }, A, call, json); }
  if (path === '/3d' || path.startsWith('/3d/')) return handle3d(path, req, body, env, me, A, json);
  if (path === '/team' || path.startsWith('/team/')) { const prof = await call(A, 'me'); return handleTeams(path, req, body, url, env, { sub: me.sub, email: prof.email, name: prof.name }, A, acct, call, json); }
  switch (path) {
    case '/me': {
      const r = await call(A, 'me');
      return json({ ...r, billing: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), photos: photoProviders(env), model3d: configured3d(env) && !!env.MODELJOBS });
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

// ---- AI --------------------------------------------------------------------------------------------
export const credits = (usd, s) => Math.max(1, Math.ceil((usd * s.markup) / s.creditUsd));
export const priceOf = (s, model) => s.prices[model] || [1, 4];                  // (unknown: a cautious guess per million tokens)
async function guard(env, s, A, holdCredits, estimateUsd, json) {
  if (!env.OPENROUTER_KEY) return { stop: json({ error: 'ai not configured' }, 503) };
  if (!(await call(A, 'rate')).ok) return { stop: json({ error: 'too many requests' }, 429) };
  const budget = env.BUDGET.get(env.BUDGET.idFromName('global'));
  if (!(await call(budget, 'check', { usd: estimateUsd })).ok) return { stop: json({ error: 'ai paused' }, 503) };
  const h = await call(A, 'hold', { credits: holdCredits });
  if (!h.ok) return { stop: json({ error: 'no credits', credits: h.credits }, 402) };
  return { hold: h.id, budget };
}
async function aiChat(env, s, A, body, json) {
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || !messages.length || messages.length > 60 || JSON.stringify(messages).length > 1.5e6) return json({ error: 'bad request' }, 400);
  if (!messages.every(m => m && ['system', 'user', 'assistant'].includes(m.role) && (typeof m.content === 'string' || Array.isArray(m.content)))) return json({ error: 'bad request' }, 400);
  const model = s.models.includes(body.model) ? body.model : s.models[0];
  const maxTokens = Math.min(s.maxTokens, Math.max(16, Math.round(+body.max_tokens || 1000)));
  const [pin, pout] = priceOf(s, model), inTok = JSON.stringify(messages).length / 3;
  const estimate = (inTok * pin + maxTokens * pout) / 1e6;
  const g = await guard(env, s, A, credits(estimate, s), estimate, json); if (g.stop) return g.stop;
  let r, data;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
      // (provider.data_collection 'deny': only providers that neither store nor train on the request.)
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, usage: { include: true }, provider: { data_collection: 'deny' }, ...(body.json && { response_format: { type: 'json_object' } }) }) });
    data = await r.json().catch(() => null);
  } catch { r = null; }
  if (!r || !r.ok || !data) { await call(A, 'settle', { id: g.hold, credits: 0 }); return json({ error: 'ai failed' }, 502); }
  const u = data.usage || {}, usd = +u.cost > 0 ? +u.cost : ((+u.prompt_tokens || inTok) * pin + (+u.completion_tokens || maxTokens) * pout) / 1e6;
  await call(g.budget, 'spend', { usd });
  const st = await call(A, 'settle', { id: g.hold, credits: credits(usd, s), reason: 'ai' });
  return json({ choices: data.choices, charged: st.used });
}
async function aiImage(env, s, A, body, json) {
  const prompt = String(body.prompt || '').slice(0, 2000); if (!prompt) return json({ error: 'bad request' }, 400);
  const aspect = /^\d{1,2}:\d{1,2}$/.test(body.aspect_ratio || '') ? body.aspect_ratio : '16:9';
  const g = await guard(env, s, A, s.imageCredits, s.imageCredits * s.creditUsd, json); if (g.stop) return g.stop;
  let r, data;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/images', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
      body: JSON.stringify({ model: s.imageModel, prompt, aspect_ratio: aspect, n: 1 }) });
    data = await r.json().catch(() => null);
  } catch { r = null; }
  if (!r || !r.ok || !data?.data?.[0]?.b64_json) { await call(A, 'settle', { id: g.hold, credits: 0 }); return json({ error: 'ai failed' }, 502); }
  await call(g.budget, 'spend', { usd: +data.usage?.cost || s.imageCredits * s.creditUsd });
  const st = await call(A, 'settle', { id: g.hold, credits: s.imageCredits, reason: 'image' });
  return json({ data: [{ b64_json: data.data[0].b64_json, media_type: data.data[0].media_type || 'image/png' }], charged: st.used });
}

// Speech (voice-over from the speaker notes): mp3, charged per character.
async function aiSpeech(env, s, A, body, json) {
  const text = String(body.input || '').trim(); if (!text || text.length > 4000) return json({ error: 'bad request' }, 400);
  const voice = s.ttsVoices.includes(body.voice) ? body.voice : s.ttsVoices[0], speed = Math.min(2, Math.max(0.5, +body.speed || 1));
  const usd = text.length * s.ttsUsdPerChar, cr = credits(usd, s);
  const g = await guard(env, s, A, cr, usd, json); if (g.stop) return g.stop;
  let r, buf;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/audio/speech', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
      body: JSON.stringify({ model: s.ttsModel, input: text, voice, speed, response_format: 'mp3' }) });
    buf = r.ok ? await r.arrayBuffer() : null;
  } catch { r = null; }
  if (!r || !r.ok || !buf || !buf.byteLength) { await call(A, 'settle', { id: g.hold, credits: 0 }); return json({ error: 'ai failed' }, 502); }
  await call(g.budget, 'spend', { usd });
  const st = await call(A, 'settle', { id: g.hold, credits: cr, reason: 'speech' });
  let bin = ''; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return json({ audio: btoa(bin), media_type: 'audio/mpeg', charged: st.used });
}

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
  if (w.customer && env.STRIPE_SECRET_KEY) {
    const subs = await (await (env.FETCH || fetch)('https://api.stripe.com/v1/subscriptions?' + new URLSearchParams({ customer: w.customer, status: 'active' }), { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }).catch(() => null))?.json().catch(() => null);
    for (const x of subs?.data || []) await (env.FETCH || fetch)('https://api.stripe.com/v1/subscriptions/' + encodeURIComponent(x.id), { method: 'DELETE', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }).catch(() => null);
  }
  return { email: w.email, lang: w.lang };
}

// ---- Photos (Unsplash, Pexels): searched with Revela's keys, which stay here ----
// The pictures are used from their own servers, with the photographer's credit
// (as both services ask); Unsplash is also told when one is used.
const PHOTO_PROVIDERS = {
  unsplash: { key: env => env.UNSPLASH_ACCESS_KEY, search: (env, q, page) => ['https://api.unsplash.com/search/photos?' + new URLSearchParams({ query: q, page, per_page: 20, content_filter: 'high' }), { Authorization: 'Client-ID ' + env.UNSPLASH_ACCESS_KEY, 'Accept-Version': 'v1' }],
    list: d => (d.results || []).map(x => ({ id: String(x.id), width: x.width, height: x.height, alt: x.alt_description || x.description || '', thumb: x.urls?.small, src: x.urls?.regular,
      author: x.user?.name || '', authorUrl: (x.user?.links?.html || '') + '?utm_source=revela&utm_medium=referral', source: 'Unsplash', sourceUrl: 'https://unsplash.com/?utm_source=revela&utm_medium=referral' })) },
  pexels: { key: env => env.PEXELS_API_KEY, search: (env, q, page) => ['https://api.pexels.com/v1/search?' + new URLSearchParams({ query: q, page, per_page: 20 }), { Authorization: env.PEXELS_API_KEY }],
    list: d => (d.photos || []).map(x => ({ id: String(x.id), width: x.width, height: x.height, alt: x.alt || '', thumb: x.src?.medium, src: x.src?.large2x || x.src?.large,
      author: x.photographer || '', authorUrl: x.photographer_url || '', source: 'Pexels', sourceUrl: x.url || 'https://www.pexels.com' })) },
};
const httpsOnly = u => (/^https:\/\//.test(u || '') ? u : '');
async function stockSearch(env, A, url, json) {
  const provider = url.searchParams.get('provider'), q = String(url.searchParams.get('q') || '').trim().slice(0, 100), page = Math.min(50, Math.max(1, +url.searchParams.get('page') || 1));
  const P = PHOTO_PROVIDERS[provider]; if (!P || !q) return json({ error: 'bad request' }, 400);
  if (!P.key(env)) return json({ error: 'not configured' }, 503);
  if (!(await call(A, 'ratek', { key: 'stock', per: 30 })).ok) return json({ error: 'too many requests' }, 429);
  const [u, headers] = P.search(env, q, page);
  const r = await (env.FETCH || fetch)(u, { headers }).catch(() => null);
  if (!r || !r.ok) return json({ error: 'provider failed' }, 502);
  const list = P.list(await r.json().catch(() => ({}))).map(x => ({ ...x, thumb: httpsOnly(x.thumb), src: httpsOnly(x.src), authorUrl: httpsOnly(x.authorUrl), sourceUrl: httpsOnly(x.sourceUrl) })).filter(x => x.thumb && x.src);
  return json({ results: list });
}
async function stockUsed(env, body, json) {
  if (body.provider === 'unsplash' && env.UNSPLASH_ACCESS_KEY && /^[\w-]{4,40}$/.test(body.id || ''))
    await (env.FETCH || fetch)(`https://api.unsplash.com/photos/${body.id}/download`, { headers: { Authorization: 'Client-ID ' + env.UNSPLASH_ACCESS_KEY } }).catch(() => null);
  return json({ ok: true });
}
// Which photo services are set up (for the app to show them).
export const photoProviders = env => Object.keys(PHOTO_PROVIDERS).filter(k => PHOTO_PROVIDERS[k].key(env));

// ---- Payments (Stripe) ------------------------------------------------------------------------------------
const stripe = (env, path, params) => (env.FETCH || fetch)('https://api.stripe.com/v1/' + path, { method: 'POST',
  headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
async function checkout(env, s, me, A, body, json) {
  const p = s.products[body.product];
  if (!env.STRIPE_SECRET_KEY || !p || !p.price) return json({ error: 'billing not available' }, 503);
  const c = await call(A, 'customer');
  let team = null, seats = 1;
  if (p.team) {                                            // (a team's seats: its admin buys them)
    team = (await call(A, 'team-id')).id; if (!team) return json({ error: 'no team' }, 400);
    const tc = await (await env.TEAMS.get(env.TEAMS.idFromName('team:' + team)).fetch('https://team/customer', { method: 'POST', body: JSON.stringify({ email: c.email }) })).json();
    if (!tc.admin) return json({ error: 'forbidden' }, 403);
    seats = Math.max(3, Math.min(1000, Math.round(+body.seats || 3)));   // (3 seats at least)
  }
  const params = { mode: p.mode, 'line_items[0][price]': p.price, 'line_items[0][quantity]': String(seats), client_reference_id: me.sub,
    success_url: `${s.site}/app/?paid=1`, cancel_url: `${s.site}/pricing`, 'metadata[sub]': me.sub, 'metadata[product]': body.product,
    ...(c.customer ? { customer: c.customer } : { customer_email: c.email }),
    ...(p.mode === 'subscription' && { 'subscription_data[metadata][sub]': me.sub }),
    ...(team && { 'metadata[team]': team, 'subscription_data[metadata][team]': team }),
    // (An invoice for one-off purchases too; and, by the pay button, the request for immediate
    // activation that waives the 14-day withdrawal right — Art. 103 m) of the Spanish consumer law.)
    ...(p.mode === 'payment' && { 'invoice_creation[enabled]': 'true' }),
    'custom_text[submit][message]': 'Al pagar pides que se active ya y aceptas que, una vez activado, pierdes el derecho de desistimiento de 14 días (art. 103 LGDCU). Condiciones: ' + s.site + '/terms.html',
    locale: 'auto' };
  const r = await stripe(env, 'checkout/sessions', params);
  const d = await r.json().catch(() => ({}));
  return d.url ? json({ url: d.url }) : json({ error: 'billing failed' }, 502);
}
async function portal(env, s, A, json) {
  const c = await call(A, 'customer');
  if (!env.STRIPE_SECRET_KEY || !c.customer) return json({ error: 'billing not available' }, 503);
  const d = await (await stripe(env, 'billing_portal/sessions', { customer: c.customer, return_url: `${s.site}/app/` })).json().catch(() => ({}));
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
async function stripeWebhook(req, env, json) {
  const body = await req.text();
  if (!(await verifyStripe(body, req.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) return json({ error: 'signature' }, 400);
  const ev = JSON.parse(body), o = ev.data?.object || {}, s = settings(env);
  const teamOf = x => x?.metadata?.team || x?.subscription_details?.metadata?.team || x?.parent?.subscription_details?.metadata?.team || null;
  const subOf = x => x?.metadata?.sub || x?.client_reference_id || x?.subscription_details?.metadata?.sub || x?.parent?.subscription_details?.metadata?.sub;
  if (ev.type === 'checkout.session.completed') {
    const sub = subOf(o); if (!sub) return json({ ok: true });
    const p = s.products[o.metadata?.product];
    if (o.mode === 'payment' && p?.credits && o.payment_status === 'paid') await call(acct(env, sub), 'grant', { credits: p.credits, reason: 'purchase', ref: ev.id, days: s.packDays });
    if (o.customer) { const A = acct(env, sub), m = await call(A, 'me'); await call(A, 'setplan', { name: m.plan, until: m.until || 0, customer: o.customer }); }
  } else if (ev.type === 'invoice.paid' && teamOf(o)) {
    // A team's month: its seats and until when; each member gets the month's credits.
    const id = teamOf(o), line = o.lines?.data?.[0] || {}, end = (+line.period?.end || (Date.now() / 1000 + 31 * 86400)) * 1000 + 3 * DAY;
    const r = await (await env.TEAMS.get(env.TEAMS.idFromName('team:' + id)).fetch('https://team/billing', { method: 'POST', body: JSON.stringify({ seats: +line.quantity || 1, until: end, customer: o.customer }) })).json();
    // (Each member's month of credits comes with their account's next request: see Account.monthly.)
    void r;
  } else if (ev.type === 'customer.subscription.deleted' && teamOf(o)) {
    await env.TEAMS.get(env.TEAMS.idFromName('team:' + teamOf(o))).fetch('https://team/billing', { method: 'POST', body: JSON.stringify({ until: 0 }) });
  } else if (ev.type === 'invoice.paid') {
    const sub = subOf(o); if (!sub) return json({ ok: true });
    const end = (+o.lines?.data?.[0]?.period?.end || (Date.now() / 1000 + 31 * 86400)) * 1000 + 3 * DAY;   // (3 days' grace)
    const A = acct(env, sub);
    await call(A, 'setplan', { name: 'pro', until: end, customer: o.customer });
    await call(A, 'me');                                   // (its month of credits now, if due: Account.monthly)
  } else if (ev.type === 'customer.subscription.updated' && !teamOf(o)) {
    // Cancelled (it ends at the end of the period), or renewed again: told now, and reminded a week before.
    const sub = subOf(o); if (!sub) return json({ ok: true });
    const end = (+o.cancel_at || +o.current_period_end || +o.items?.data?.[0]?.current_period_end || 0) * 1000;
    await call(acct(env, sub), 'plan-ending', { end: (o.cancel_at_period_end || o.cancel_at) && end > Date.now() ? end : 0 });
  } else if (ev.type === 'customer.subscription.deleted') {
    const sub = subOf(o); if (sub) { const A = acct(env, sub); await call(A, 'setplan', { name: 'free', until: 0 }); await call(A, 'plan-ended', { ref: o.id || ev.id }); }
  }
  return json({ ok: true });
}
