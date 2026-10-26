// Revela's news by email («Novedades»): written in the admin, sent only to the accounts that asked for them.
//
// Who gets them: an account with `newsOn` (api.js Account) — ticked when signing up or in «Mi cuenta ▸ Avisos por
// correo» — and not blocked. Never anyone else, whatever the audience says: the account itself is asked again just
// before each email (op 'mail-news'), so one who stopped them a second ago gets nothing. Every email carries its way out:
// a signed link (mail.js unsubToken kind 'news'), also as the one-click List-Unsubscribe header.
//
// An issue (kept in the Budget object, 'issue:<id>'):
//   { id, name (only the admin sees it), status: draft | sending | sent | cancelled, createdAt, updatedAt,
//     audience: { langs: [] (empty: all), plan: all | free | pro },
//     texts: { <lang>: { subject, preheader, eyebrow (the small label over the title), title (*words* in italics), intro, blocks: [{ title, text, image, cta, url }], outro } },
//     sent: { n, skipped, failed, cursor, started, finished } }
// A person reads their language's text, else English, else Spanish, else the first one written.
//
// Sending goes in batches (BATCH accounts each) AT A PACE the admin chooses (issue.pace.perHour: 30, 60, 120, 300 or 1800 an hour):
// the first batch right when the admin presses «Enviar», the next ones when their time comes — Budget's alarm (news kind, brakes.js)
// wakes up for each — so thousands of emails never leave at once from a domain that is not used to it (mail providers read that as
// spam; a pace, and each person at a different hour, is what a good sender does). «Continuar ahora» forces a batch; the daily cron
// (newsRun) picks up one that missed its alarm. A batch asks the Directory for the next accounts that opted in (op 'news-list').
//
// Admin routes (admin.js, behind Cloudflare Access; audited):
//   GET  /news                      → { issues: [summary], audience: { total, byLang }, mail: bool }
//   GET  /news/starters             → { starters } (starting points in 11 languages: news-starters.js)
//   GET  /news/images               → { images } (the website's pictures for newsletters: site/img/news/index.json)
//   GET  /news/<id>                 → { issue }
//   POST /news { issue }            → { issue }  (new, or a draft changed)
//   POST /news/<id>/delete          (drafts only)
//   GET  /news/<id>/preview?lang=   → { subject, html }
//   POST /news/<id>/test { lang, to?, asReal? } → a test email to the admin or any address (asReal: exactly as it would go, for a spam test); 20 an hour
//   POST /news/<id>/send { reason, perHour } → starts sending (once), at that pace  ·  POST /news/<id>/step { force } → the next batch if due (force: now)
//   POST /news/<id>/again { confirm, perHour, reason } → a sent newsletter again, to the accounts it has not reached (new ones)
//   GET  /news/<id>/readers         → who opened and who clicked (per account, as the privacy policy says)
//   POST /news/<id>/cancel          → stops a sending in progress

import { escHtml, random, EMAIL, hmac, b64url, enc, unb64 } from './util.js';
import { unsubToken } from './mail.js';
import { mailWords, mailConfigured, sendMail, LOOK, emailFrame, em, plain, paras, pill, arrow } from './mail.js';
import { acct, call } from './api.js';
import { STARTERS } from './news-starters.js';
import { scheduleAlarm } from './brakes.js';

export const NEWS_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
export const NEWS_PLANS = ['all', 'free', 'pro'];
export const NEWS_STATUS = ['draft', 'sending', 'sent', 'cancelled'];
export const BATCH = 30, MAX_BLOCKS = 8, PACES = [30, 60, 120, 300, 1800], DEFAULT_PACE = 60;
// How long to wait between one batch and the next, for a pace (accounts an hour): at least a minute, a little different each time.
export const gapMs = perHour => Math.max(60e3, Math.round((BATCH / (PACES.includes(perHour) ? perHour : DEFAULT_PACE)) * 3600e3 * (0.85 + Math.random() * 0.3)));
const PLACEHOLDER = /\{[^{}"\\]{1,60}\}/;

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').replace(/\r/g, '').trim().slice(0, n);
const line = (v, n) => str(v, n).replace(/\s*\n\s*/g, ' ');
// A button's or picture's address: https, or (for a button) a path of the site.
const url = (u, path = true) => {
  const s = line(u, 500); if (!s) return '';
  if (path && /^\/(?!\/)[\w\-./?=&%#]*$/.test(s)) return s;
  try { const x = new URL(s); return x.protocol === 'https:' ? x.href : null; } catch { return null; }
};

// One language's text, checked → it, or { error: field }.
function cleanText(t) {
  if (!t || typeof t !== 'object') return { error: 'text' };
  const out = { subject: line(t.subject, 120), preheader: line(t.preheader, 140), eyebrow: line(t.eyebrow, 50), title: line(t.title, 120), intro: str(t.intro, 1500), blocks: [], outro: str(t.outro, 800) };
  if (!Array.isArray(t.blocks ?? [])) return { error: 'blocks' };
  for (const b of (t.blocks || []).slice(0, MAX_BLOCKS)) {
    if (!b || typeof b !== 'object') return { error: 'block' };
    const image = url(b.image, false), link = url(b.url), blk = { title: line(b.title, 100), text: str(b.text, 800), image: image || '', cta: line(b.cta, 40), url: link || '' };
    if (image === null) return { error: 'image' };
    if (link === null) return { error: 'url' };
    if ((blk.cta && !blk.url) || (blk.url && !blk.cta)) return { error: 'button' };
    if (blk.title || blk.text || blk.image) out.blocks.push(blk);
  }
  if (!out.subject) return { error: 'subject' };
  if (!out.title && !out.intro && !out.blocks.length) return { error: 'empty' };
  return out;
}
// The admin's issue (body) over the one kept (existing, or null) → the issue or { error }.
export function cleanIssue(b, existing = null, now = Date.now()) {
  if (!b || typeof b !== 'object') return { error: 'body' };
  if (existing && existing.status !== 'draft') return { error: 'locked' };
  const aud = b.audience || {}, langs = Array.isArray(aud.langs) ? aud.langs : [];
  if (!langs.every(l => NEWS_LANGS.includes(l)) || !NEWS_PLANS.includes(aud.plan || 'all')) return { error: 'audience' };
  const texts = {};
  for (const [k, v] of Object.entries(b.texts && typeof b.texts === 'object' ? b.texts : {})) {
    if (!NEWS_LANGS.includes(k)) return { error: 'lang' };
    if (!v || (!str(v.subject, 5) && !str(v.title, 5) && !str(v.intro, 5) && !(v.blocks || []).length)) continue;      // (a language left empty: none)
    const t = cleanText(v); if (t.error) return { error: t.error, lang: k };
    texts[k] = t;
  }
  if (!texts.es && !texts.en) return { error: 'es-or-en' };
  return { id: existing?.id || random(8).replace(/[^\w]/g, 'x'), name: line(b.name, 80) || texts.es?.subject || texts.en?.subject, status: 'draft', createdAt: existing?.createdAt || now, updatedAt: now, pace: { perHour: DEFAULT_PACE },
    audience: { langs: [...new Set(langs)], plan: aud.plan || 'all' }, texts, sent: existing?.sent || { n: 0, skipped: 0, failed: 0, cursor: null, started: null, finished: null } };
}
// What a person in this language reads: theirs, else English, else Spanish, else the first one written.
export const textFor = (issue, lang) => issue.texts?.[lang] || issue.texts?.en || issue.texts?.es || Object.values(issue.texts || {})[0] || null;
export const summary = i => ({ id: i.id, name: i.name, status: i.status, updatedAt: i.updatedAt, langs: Object.keys(i.texts || {}), audience: i.audience, sent: i.sent, pace: i.pace || { perHour: DEFAULT_PACE },
  subject: (textFor(i, 'es') || {}).subject || '' });

// ---- The email ----------------------------------------------------------------------------------
// (The frame and look are mail.js's, shared with every email.)
const { INK, INK2, LINE, WARM, SERIF, SANS } = LOOK;

// A link in a newsletter, as it finally goes: a path of the website in the person's language (the app's has no prefix), tagged with
// utm_source=news and the newsletter, so the visit says where it came from; an address outside the website goes as it is.
export function siteLink(issue, lang, u, site = 'https://revelaslides.com') {
  const full = u.startsWith('/') ? site + (lang && lang !== 'es' && !/^\/(app|api)(\/|$)/.test(u) ? '/' + lang : '') + u : u;
  try {
    const x = new URL(full); if (x.host !== new URL(site).host) return full;
    x.searchParams.set('utm_source', 'news'); x.searchParams.set('utm_medium', 'email');
    x.searchParams.set('utm_campaign', String(issue.id || 'news').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) || 'news');
    return x.href;
  } catch { return full; }
}

// → { subject, html, text } (unsub: the link out, null in a test; test: marks it; site: for a button that is a path).
export function renderNews(issue, lang, { unsub = null, test = false, track = false, real = false, rt = '', site = 'https://revelaslides.com' } = {}) {
  const tx = textFor(issue, lang) || { subject: '', blocks: [] }, W = mailWords(lang);
  // (A link to the website: in the person's language and tagged — utm_source=news, the issue — so the visit says where it came from.)
  // (track: the link goes through our own address, /api/n/<boletín>/<enlace>, which counts the click — no one's name, only «this link, once
  // more» — and sends on to where it was going: the address comes from the newsletter itself, never from the link. In a test it is marked, not counted.)
  const direct = u => siteLink(issue, lang, u, site);
  const href = (u, k) => (track || real ? `${site}/api/n/${issue.id}/${k}?l=${lang}${test ? '&t=1' : ''}${rt && !test ? '&r=' + rt : ''}` : direct(u)), subject = (test && !real ? '[PRUEBA] ' : '') + plain(tx.subject), eyebrow = tx.eyebrow || W.eyebrow;
  const P = `margin:0 0 16px;font:17px/1.65 ${SANS};color:${INK2}`, head = !!(tx.title || tx.intro);
  const blocks = (tx.blocks || []).map((b, i) => `<tr><td style="padding:${i ? 6 : 0}px 36px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"${i || head ? ` class="top" style="border-top:1px solid ${LINE}"` : ''}><tr><td style="padding-top:${i || head ? 26 : 0}px">
${b.image ? `<img src="${escHtml(b.image)}" alt="${escHtml(plain(b.title))}" width="528" style="display:block;width:100%;max-width:528px;height:auto;border-radius:14px;margin:0 0 18px;border:1px solid ${LINE}">` : ''}
${b.title ? `<h2 class="ink" style="margin:0 0 10px;font:450 28px/1.2 ${SERIF};letter-spacing:-.01em;color:${INK}">${em(b.title)}</h2>` : ''}${paras(b.text, P)}${b.cta && b.url ? arrow(b.cta, href(b.url, i)) : ''}</td></tr></table></td></tr>`).join('\n');
  const rows = `${head ? `<tr><td style="padding:38px 36px 18px"><p class="warm" style="margin:0 0 16px;font:600 13px/1 ${SANS};${lang === 'ar' ? '' : 'letter-spacing:.14em;text-transform:uppercase;'}color:${WARM}">${escHtml(eyebrow)}</p>${tx.title ? `<h1 class="ink" style="margin:0 0 16px;font:450 40px/1.1 ${SERIF};letter-spacing:-.015em;color:${INK}">${em(tx.title)}</h1>` : ''}${paras(tx.intro, P)}</td></tr>` : ''}
${blocks}
${tx.outro ? `<tr><td style="padding:14px 36px 6px">${paras(tx.outro, P)}</td></tr>` : ''}
<tr><td style="padding:14px 36px 38px">${pill(W.open, href('/app/', 'x'))}</td></tr>`;
  const foot = `${escHtml(W.foot)}<br>${escHtml(W.why)}${unsub ? `<br><a class="mut" href="${escHtml(unsub)}" style="color:${INK2}">${escHtml(W.unsub)}</a>` : (test && !real ? '<br>(prueba: sin enlace de baja)' : '')}`;
  // (A pixel that says «opened» — only in a real sending to an account: tracked per person, as the privacy policy says; approximate, because
  // some mail apps load pictures ahead of time. Not in previews or tests.)
  const pixel = track && rt && !test ? `<img src="${site}/api/n/${issue.id}/o.gif?r=${rt}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">` : '';
  const html = emailFrame({ lang, subject, preheader: tx.preheader || '', rows, foot: foot + pixel, site });
  const text = [`${eyebrow.toUpperCase()}`, '', plain(tx.title), '', tx.intro, '', ...(tx.blocks || []).flatMap((b, i) => [plain(b.title), b.text, b.cta && b.url ? `${b.cta}: ${href(b.url, i)}` : '', '']), tx.outro, '', `${W.open}: ${href('/app/', 'x')}`, '—', W.foot, W.why,
    ...(unsub ? [`${W.unsub}: ${unsub}`] : [])].filter(x => x !== undefined && x !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { subject, html, text };
}

// Who a click or an opening belongs to: the account, in the link — signed (MAIL_SECRET), for this newsletter only —, so nobody can make up
// somebody else's. → '' without a secret (then nothing per person is kept).
export async function recipientToken(env, issueId, sub) {
  if (!env.MAIL_SECRET || !sub) return '';
  const a = b64url(enc.encode(String(sub))); return `${a}.${(await hmac(env.MAIL_SECRET, `nr:${issueId}.${a}`)).slice(0, 16)}`;
}
export async function readRecipientToken(env, issueId, t) {
  const [a, sig] = String(t || '').split('.'); if (!env.MAIL_SECRET || !a || !sig || a.length > 120) return null;
  const want = (await hmac(env.MAIL_SECRET, `nr:${issueId}.${a}`)).slice(0, 16);
  if (want.length !== sig.length || [...want].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ sig.charCodeAt(i)), 0)) return null;
  try { return unb64(a); } catch { return null; }
}
// Where link k of a newsletter goes, in a language (k: the section's number, or «x» for the button to the app): the address the newsletter
// itself holds, tagged. Null if there is no such link.
export function linkTarget(issue, k, lang, site = 'https://revelaslides.com') {
  if (!/^(x|\d{1,2})$/.test(String(k))) return null;
  const u = k === 'x' ? '/app/' : (textFor(issue, lang)?.blocks || [])[+k]?.url;
  return u ? siteLink(issue, lang, u, site) : null;
}

// ---- Keeping and sending -----------------------------------------------------------------------------
const budget = env => env.BUDGET.get(env.BUDGET.idFromName('global'));
const directory = (env, op, body) => env.DIRECTORY.get(env.DIRECTORY.idFromName('directory')).fetch('https://dir/' + op, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json());
const inAudience = (rec, aud, now = Date.now()) => {
  if (!rec.news || rec.blocked) return false;
  if (aud.langs?.length && !aud.langs.includes(rec.lang || 'es')) return false;
  const pro = rec.plan === 'pro' && rec.until > now && !rec.test;
  return aud.plan === 'pro' ? pro : aud.plan === 'free' ? !pro : true;
};

// Where issues are kept: from a Worker, through the Budget object; from Budget's own alarm, straight in its storage.
const remote = env => ({ get: async id => (await call(budget(env), 'news-get', { id })).issue, put: issue => call(budget(env), 'news-put', { issue }), index: async () => (await call(budget(env), 'news-index')).issues });
export const localStore = st => ({ get: async id => (await st.get('issue:' + id)) || null, put: issue => st.put('issue:' + issue.id, issue), index: async () => [...(await st.list({ prefix: 'issue:' })).values()] });

// One batch of a sending: the next accounts that opted in, each asked (so each one's own consent is checked again). Only when
// its time has come (force: now); then the next one is set — by `schedule(at)`: Budget's alarm.
export async function newsStep(env, id, { limit = BATCH, now = Date.now(), force = false, store = remote(env), schedule = at => call(budget(env), 'news-alarm', { at }) } = {}) {
  if (!env.BUDGET || !env.DIRECTORY) return null;
  const issue = await store.get(id);
  if (!issue || issue.status !== 'sending') return issue || null;
  if (!mailConfigured(env)) return issue;
  if (!force && issue.sent.next && issue.sent.next > now + 1000) return issue;           // (not yet: its alarm will come)
  const page = await directory(env, 'news-list', { cursor: issue.sent.cursor, limit });
  for (const rec of page.recs || []) {
    if (!inAudience(rec, issue.audience, now)) { issue.sent.skipped++; continue; }
    const r = await call(acct(env, rec.sub), 'mail-news', { issue: { id: issue.id, texts: issue.texts }, ref: 'news:' + issue.id }).catch(() => null);
    if (r?.ok) issue.sent.n++; else if (r?.skipped) issue.sent.skipped++; else issue.sent.failed++;
  }
  issue.sent.cursor = page.cursor || null; issue.updatedAt = now;
  // (Stopped meanwhile — «Parar el envío» while this batch was going out? Its counts are kept, its state is not overwritten.)
  const now2 = await store.get(id);
  if (now2 && now2.status !== 'sending') { now2.sent = { ...now2.sent, n: issue.sent.n, skipped: issue.sent.skipped, failed: issue.sent.failed }; await store.put(now2); return now2; }
  if (!page.cursor) { issue.status = 'sent'; issue.sent.finished = now; issue.sent.next = null; }
  else issue.sent.next = now + gapMs(issue.pace?.perHour);
  await store.put(issue);
  if (issue.status === 'sending') await schedule(issue.sent.next).catch?.(() => {});
  return issue;
}
// Budget's alarm: every sending whose time has come gets its batch; the alarm is set again for the next one due.
export async function newsTick(env, ctx, now = Date.now()) {
  const store = localStore(ctx.storage), schedule = at => scheduleAlarm(ctx, env, 'news', at);
  let nextAt = null;
  for (const i of (await store.index()).filter(x => x.status === 'sending')) {
    const r = await newsStep(env, i.id, { now, store, schedule });
    if (r?.status === 'sending' && r.sent.next) nextAt = Math.min(nextAt ?? Infinity, r.sent.next);
  }
  return nextAt;
}
// The daily cron: a sending whose alarm was lost (restart, emergency switch) gets its batch if it is due.
export async function newsRun(env, now = Date.now()) {
  if (!env.BUDGET || !env.DIRECTORY) return 0;
  const issues = await remote(env).index().catch(() => []);
  let n = 0; for (const i of issues.filter(x => x.status === 'sending')) { await newsStep(env, i.id, { now }); n++; }
  return n;
}

// ---- The admin's routes ------------------------------------------------------------------------------
export async function newsAdmin(env, path, q, body, { GET, POST, by, json, audit }) {
  if (!env.BUDGET) return json({ error: 'not configured' }, 503);
  const B = budget(env), get = async id => (await call(B, 'news-get', { id })).issue;
  if (GET && path === '/news') {
    const { issues } = await call(B, 'news-index');
    const aud = env.DIRECTORY ? await directory(env, 'news-count', {}) : { total: 0, byLang: {} };
    return json({ issues: issues.sort((x, y) => y.updatedAt - x.updatedAt).map(summary), audience: aud, mail: mailConfigured(env), langs: NEWS_LANGS });
  }
  if (POST && path === '/news') {
    const old = body?.issue?.id ? await get(String(body.issue.id)) : null;
    if (body?.issue?.id && !old) return json({ error: 'not found' }, 404);
    const issue = cleanIssue(body?.issue, old); if (issue.error) return json(issue, issue.error === 'locked' ? 409 : 400);
    await call(B, 'news-put', { issue });
    await audit({ action: old ? 'news-save' : 'news-create', target: 'news:' + issue.id, after: { name: issue.name, langs: Object.keys(issue.texts), audience: issue.audience } });
    return json({ issue });
  }
  if (GET && path === '/news/starters') return json({ starters: STARTERS });
  // The pictures the website offers for newsletters (site/img/news/index.json, made by site/tools/news-image.py): the editor's picker.
  if (GET && path === '/news/images') {
    const site = (env.SITE_URL || 'https://revelaslides.com').replace(/\/$/, '');
    let list = []; try { const r = await (env.FETCH || fetch)(site + '/img/news/index.json'); const j = r.ok ? await r.json() : []; list = Array.isArray(j) ? j : []; } catch {}
    return json({ images: list.filter(x => x && /^[\w-]{1,60}\.jpg$/.test(String(x.file))).map(x => ({ file: x.file, url: 'https://revelaslides.com/img/news/' + x.file, description: String(x.description || '').slice(0, 120), width: +x.width || 0, height: +x.height || 0 })) });
  }
  const m = path.match(/^\/news\/([\w]{4,20})(?:\/(\w+))?$/); if (!m) return json({ error: 'not found' }, 404);
  const [, id, act] = m, issue = await get(id); if (!issue) return json({ error: 'not found' }, 404);
  if (GET && !act) {
    const stats = issue.status === 'draft' ? null : await call(B, 'news-stats', { id, from: issue.sent?.started || 0 });
    // (How many asked for the newsletters after this one was sent: the ones «Enviar a quienes aún no lo han recibido» would reach.)
    const joined = stats && env.DIRECTORY ? (await directory(env, 'news-count', { since: issue.sent?.started || 0 })).since : 0;
    return json({ issue, stats: stats && { ...stats, joined } });
  }
  // Who has opened and who has clicked (per account): the readers of this one.
  if (GET && act === 'readers') {
    const { readers } = await call(B, 'news-readers', { id }), list = [];
    for (const r of readers.sort((x, y) => Object.keys(y.c || {}).length - Object.keys(x.c || {}).length || (y.o?.last || 0) - (x.o?.last || 0)).slice(0, 500)) {
      const u = env.DIRECTORY ? (await directory(env, 'get', { sub: r.sub })).user : null;
      list.push({ email: u?.email || '(cuenta eliminada)', name: u?.name || '', opened: r.o || null, clicks: r.c || {} });
    }
    return json({ readers: list, total: readers.length });
  }
  if (GET && act === 'preview') { const lang = NEWS_LANGS.includes(q.get('lang')) ? q.get('lang') : 'es'; const r = renderNews(issue, lang, { unsub: '#', site: env.SITE_URL || 'https://revelaslides.com' }); return json({ subject: r.subject, html: r.html, lang }); }
  if (!POST) return json({ error: 'method' }, 405);
  if (act === 'delete') {
    if (issue.status !== 'draft') return json({ error: 'locked' }, 409);
    await call(B, 'news-del', { id }); await audit({ action: 'news-delete', target: 'news:' + id, before: { name: issue.name } }); return json({ ok: true });
  }
  if (act === 'test') {
    if (!mailConfigured(env)) return json({ error: 'mail not configured' }, 503);
    // To the admin's own address, or any other written in the panel (a mail-tester.com address, a friend's mailbox), as it would really go
    // — with «asReal»: no «[PRUEBA]», its way out and its links: a real email for a spam test — but marked so its clicks are not counted.
    const lang = NEWS_LANGS.includes(body?.lang) ? body.lang : 'es', to = String(body?.to || by).trim().toLowerCase(), real = body?.asReal === true;
    if (!EMAIL.test(to) || to.length > 254) return json({ error: 'bad address' }, 400);
    if ((await call(B, 'news-test-count')).n > 20) return json({ error: 'too many tests' }, 429);
    const site = env.SITE_URL || 'https://revelaslides.com';
    let unsub = null; if (real) { const tok = await unsubToken(env, 'test', 'news'); unsub = tok && `${site}/api/mail/unsubscribe?t=${encodeURIComponent(tok)}`; }
    const r = renderNews(issue, lang, { test: true, real, unsub, site });
    await audit({ action: 'news-test', target: 'news:' + id, after: { to, lang, real } });
    return json({ ok: await sendMail(env, { to, kind: 'news-test', ...r, ...(unsub && { unsubscribe: unsub }) }), to });
  }
  if (act === 'send') {
    if (issue.status !== 'draft') return json({ error: 'locked' }, 409);
    if (!mailConfigured(env) || !env.MAIL_SECRET) return json({ error: 'mail not configured' }, 503);
    if (body?.confirm !== true) return json({ error: 'confirm' }, 400);
    // (A starter's {placeholders} still there: not sent — «{mes}» in a subject would go out as it is.)
    const left = Object.entries(issue.texts).filter(([, t]) => PLACEHOLDER.test(JSON.stringify(t))).map(([l]) => l);
    if (left.length) return json({ error: 'placeholders', langs: left }, 400);
    const perHour = PACES.includes(+body?.perHour) ? +body.perHour : DEFAULT_PACE;
    issue.status = 'sending'; issue.updatedAt = Date.now(); issue.pace = { perHour }; issue.sent = { n: 0, skipped: 0, failed: 0, cursor: null, next: null, started: Date.now(), finished: null };
    await call(B, 'news-put', { issue });
    await audit({ action: 'news-send', target: 'news:' + id, reason: str(body?.reason, 500), after: { name: issue.name, audience: issue.audience, perHour } });
    return json({ issue: await newsStep(env, id, { force: true }) });
  }
  if (act === 'step') return json({ issue: await newsStep(env, id, { force: body?.force === true }) });
  // «Enviar a quienes aún no lo han recibido»: a sent (or stopped) newsletter again over the accounts that asked for them — each account
  // remembers what it received (mail-news), so only the ones it has not reached get it: those who asked after it was sent, or that failed.
  if (act === 'again') {
    if (!['sent', 'cancelled'].includes(issue.status)) return json({ error: 'locked' }, 409);
    if (!mailConfigured(env) || !env.MAIL_SECRET) return json({ error: 'mail not configured' }, 503);
    if (body?.confirm !== true) return json({ error: 'confirm' }, 400);
    const perHour = PACES.includes(+body?.perHour) ? +body.perHour : DEFAULT_PACE, prev = issue.sent;
    issue.status = 'sending'; issue.updatedAt = Date.now(); issue.pace = { perHour };
    issue.rounds = [...(issue.rounds || []), { at: prev.started, n: prev.n, skipped: prev.skipped, failed: prev.failed }].slice(-20);
    issue.sent = { n: 0, skipped: 0, failed: 0, cursor: null, next: null, started: Date.now(), finished: null };
    await call(B, 'news-put', { issue });
    await audit({ action: 'news-again', target: 'news:' + id, reason: str(body?.reason, 500), after: { name: issue.name, perHour, rounds: issue.rounds.length } });
    return json({ issue: await newsStep(env, id, { force: true }) });
  }
  if (act === 'cancel') {
    if (issue.status !== 'sending') return json({ error: 'locked' }, 409);
    issue.status = 'cancelled'; issue.updatedAt = Date.now(); await call(B, 'news-put', { issue });
    await audit({ action: 'news-cancel', target: 'news:' + id, after: issue.sent }); return json({ issue });
  }
  return json({ error: 'not found' }, 404);
}
