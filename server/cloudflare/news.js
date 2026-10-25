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
// Sending goes in batches (BATCH accounts each): the first right when the admin presses «Enviar», the next ones as the admin's
// page asks for them (it goes on by itself while open) — or by the daily cron (newsRun), which does up to 10 batches. A batch asks the Directory for the next accounts that opted in (op 'news-list').
//
// Admin routes (admin.js, behind Cloudflare Access; audited):
//   GET  /news                      → { issues: [summary], audience: { total, byLang }, mail: bool }
//   GET  /news/starters             → { starters } (starting points in 11 languages: news-starters.js)
//   GET  /news/images               → { images } (the website's pictures for newsletters: site/img/news/index.json)
//   GET  /news/<id>                 → { issue }
//   POST /news { issue }            → { issue }  (new, or a draft changed)
//   POST /news/<id>/delete          (drafts only)
//   GET  /news/<id>/preview?lang=   → { subject, html }
//   POST /news/<id>/test { lang }   → an email to the admin, marked as a test
//   POST /news/<id>/send { reason } → starts sending (once)    ·  POST /news/<id>/step → one more batch now
//   POST /news/<id>/cancel          → stops a sending in progress

import { escHtml, random } from './util.js';
import { mailWords, mailConfigured, sendMail, LOOK, emailFrame, em, plain, paras, pill, arrow } from './mail.js';
import { acct, call } from './api.js';
import { STARTERS } from './news-starters.js';

export const NEWS_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
export const NEWS_PLANS = ['all', 'free', 'pro'];
export const NEWS_STATUS = ['draft', 'sending', 'sent', 'cancelled'];
export const BATCH = 30, MAX_BLOCKS = 8;
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
  return { id: existing?.id || random(8).replace(/[^\w]/g, 'x'), name: line(b.name, 80) || texts.es?.subject || texts.en?.subject, status: 'draft', createdAt: existing?.createdAt || now, updatedAt: now,
    audience: { langs: [...new Set(langs)], plan: aud.plan || 'all' }, texts, sent: existing?.sent || { n: 0, skipped: 0, failed: 0, cursor: null, started: null, finished: null } };
}
// What a person in this language reads: theirs, else English, else Spanish, else the first one written.
export const textFor = (issue, lang) => issue.texts?.[lang] || issue.texts?.en || issue.texts?.es || Object.values(issue.texts || {})[0] || null;
export const summary = i => ({ id: i.id, name: i.name, status: i.status, updatedAt: i.updatedAt, langs: Object.keys(i.texts || {}), audience: i.audience, sent: i.sent,
  subject: (textFor(i, 'es') || {}).subject || '' });

// ---- The email ----------------------------------------------------------------------------------
// (The frame and look are mail.js's, shared with every email.)
const { INK, INK2, LINE, WARM, SERIF, SANS } = LOOK;

// → { subject, html, text } (unsub: the link out, null in a test; test: marks it; site: for a button that is a path).
export function renderNews(issue, lang, { unsub = null, test = false, site = 'https://revelaslides.com' } = {}) {
  const tx = textFor(issue, lang) || { subject: '', blocks: [] }, W = mailWords(lang);
  // (A link to the website: in the person's language and tagged — utm_source=news, the issue — so the visit says where it came from.)
  const tag = u => { try { const x = new URL(u); if (x.host !== new URL(site).host) return u; x.searchParams.set('utm_source', 'news'); x.searchParams.set('utm_medium', 'email'); x.searchParams.set('utm_campaign', String(issue.id || 'news').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) || 'news'); return x.href; } catch { return u; } };
  const href = u => tag(u.startsWith('/') ? site + (lang && lang !== 'es' && !/^\/(app|api)(\/|$)/.test(u) ? '/' + lang : '') + u : u), subject = (test ? '[PRUEBA] ' : '') + plain(tx.subject), eyebrow = tx.eyebrow || W.eyebrow;
  const P = `margin:0 0 16px;font:17px/1.65 ${SANS};color:${INK2}`, head = !!(tx.title || tx.intro);
  const blocks = (tx.blocks || []).map((b, i) => `<tr><td style="padding:${i ? 6 : 0}px 36px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"${i || head ? ` class="top" style="border-top:1px solid ${LINE}"` : ''}><tr><td style="padding-top:${i || head ? 26 : 0}px">
${b.image ? `<img src="${escHtml(b.image)}" alt="${escHtml(plain(b.title))}" width="528" style="display:block;width:100%;max-width:528px;height:auto;border-radius:14px;margin:0 0 18px;border:1px solid ${LINE}">` : ''}
${b.title ? `<h2 class="ink" style="margin:0 0 10px;font:450 28px/1.2 ${SERIF};letter-spacing:-.01em;color:${INK}">${em(b.title)}</h2>` : ''}${paras(b.text, P)}${b.cta && b.url ? arrow(b.cta, href(b.url)) : ''}</td></tr></table></td></tr>`).join('\n');
  const rows = `${head ? `<tr><td style="padding:38px 36px 18px"><p class="warm" style="margin:0 0 16px;font:600 13px/1 ${SANS};${lang === 'ar' ? '' : 'letter-spacing:.14em;text-transform:uppercase;'}color:${WARM}">${escHtml(eyebrow)}</p>${tx.title ? `<h1 class="ink" style="margin:0 0 16px;font:450 40px/1.1 ${SERIF};letter-spacing:-.015em;color:${INK}">${em(tx.title)}</h1>` : ''}${paras(tx.intro, P)}</td></tr>` : ''}
${blocks}
${tx.outro ? `<tr><td style="padding:14px 36px 6px">${paras(tx.outro, P)}</td></tr>` : ''}
<tr><td style="padding:14px 36px 38px">${pill(W.open, tag(site + '/app/'))}</td></tr>`;
  const foot = `${escHtml(W.foot)}<br>${escHtml(W.why)}${unsub ? `<br><a class="mut" href="${escHtml(unsub)}" style="color:${INK2}">${escHtml(W.unsub)}</a>` : (test ? '<br>(prueba: sin enlace de baja)' : '')}`;
  const html = emailFrame({ lang, subject, preheader: tx.preheader || '', rows, foot, site });
  const text = [`${eyebrow.toUpperCase()}`, '', plain(tx.title), '', tx.intro, '', ...(tx.blocks || []).flatMap(b => [plain(b.title), b.text, b.cta && b.url ? `${b.cta}: ${href(b.url)}` : '', '']), tx.outro, '', `${W.open}: ${tag(site + '/app/')}`, '—', W.foot, W.why,
    ...(unsub ? [`${W.unsub}: ${unsub}`] : [])].filter(x => x !== undefined && x !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { subject, html, text };
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

// One batch of a sending: the next accounts that opted in, each asked (so each one's own consent is checked again).
export async function newsStep(env, id, { limit = BATCH, now = Date.now() } = {}) {
  if (!env.BUDGET || !env.DIRECTORY) return null;
  const B = budget(env), issue = (await call(B, 'news-get', { id })).issue;
  if (!issue || issue.status !== 'sending') return issue || null;
  if (!mailConfigured(env)) return issue;
  const page = await directory(env, 'news-list', { cursor: issue.sent.cursor, limit });
  for (const rec of page.recs || []) {
    if (!inAudience(rec, issue.audience, now)) { issue.sent.skipped++; continue; }
    const r = await call(acct(env, rec.sub), 'mail-news', { issue: { id: issue.id, texts: issue.texts }, ref: 'news:' + issue.id }).catch(() => null);
    if (r?.ok) issue.sent.n++; else if (r?.skipped) issue.sent.skipped++; else issue.sent.failed++;
  }
  issue.sent.cursor = page.cursor || null; issue.updatedAt = now;
  // (Stopped meanwhile — «Parar el envío» while this batch was going out? Its counts are kept, its state is not overwritten.)
  const now2 = (await call(B, 'news-get', { id })).issue;
  if (now2 && now2.status !== 'sending') { now2.sent = { ...now2.sent, n: issue.sent.n, skipped: issue.sent.skipped, failed: issue.sent.failed }; await call(B, 'news-put', { issue: now2 }); return now2; }
  if (!page.cursor) { issue.status = 'sent'; issue.sent.finished = now; }
  await call(B, 'news-put', { issue });
  return issue;
}
// The daily cron: batches of every sending still in progress (up to `batches` each) — the admin's page, open, goes faster.
export async function newsRun(env, now = Date.now(), batches = 1) {
  if (!env.BUDGET || !env.DIRECTORY) return 0;
  const { issues } = await call(budget(env), 'news-index').catch(() => ({ issues: [] }));
  let n = 0;
  for (const i of issues.filter(x => x.status === 'sending')) for (let k = 0; k < batches; k++) { const r = await newsStep(env, i.id, { now }); n++; if (r?.status !== 'sending') break; }
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
  if (GET && !act) return json({ issue });
  if (GET && act === 'preview') { const lang = NEWS_LANGS.includes(q.get('lang')) ? q.get('lang') : 'es'; const r = renderNews(issue, lang, { unsub: '#', site: env.SITE_URL || 'https://revelaslides.com' }); return json({ subject: r.subject, html: r.html, lang }); }
  if (!POST) return json({ error: 'method' }, 405);
  if (act === 'delete') {
    if (issue.status !== 'draft') return json({ error: 'locked' }, 409);
    await call(B, 'news-del', { id }); await audit({ action: 'news-delete', target: 'news:' + id, before: { name: issue.name } }); return json({ ok: true });
  }
  if (act === 'test') {
    if (!mailConfigured(env)) return json({ error: 'mail not configured' }, 503);
    const lang = NEWS_LANGS.includes(body?.lang) ? body.lang : 'es', r = renderNews(issue, lang, { test: true, site: env.SITE_URL || 'https://revelaslides.com' });
    return json({ ok: await sendMail(env, { to: by, kind: 'news-test', ...r }), to: by });
  }
  if (act === 'send') {
    if (issue.status !== 'draft') return json({ error: 'locked' }, 409);
    if (!mailConfigured(env) || !env.MAIL_SECRET) return json({ error: 'mail not configured' }, 503);
    if (body?.confirm !== true) return json({ error: 'confirm' }, 400);
    // (A starter's {placeholders} still there: not sent — «{mes}» in a subject would go out as it is.)
    const left = Object.entries(issue.texts).filter(([, t]) => PLACEHOLDER.test(JSON.stringify(t))).map(([l]) => l);
    if (left.length) return json({ error: 'placeholders', langs: left }, 400);
    issue.status = 'sending'; issue.updatedAt = Date.now(); issue.sent = { n: 0, skipped: 0, failed: 0, cursor: null, started: Date.now(), finished: null };
    await call(B, 'news-put', { issue });
    await audit({ action: 'news-send', target: 'news:' + id, reason: str(body?.reason, 500), after: { name: issue.name, audience: issue.audience } });
    return json({ issue: await newsStep(env, id) });
  }
  if (act === 'step') return json({ issue: await newsStep(env, id) });
  if (act === 'cancel') {
    if (issue.status !== 'sending') return json({ error: 'locked' }, 409);
    issue.status = 'cancelled'; issue.updatedAt = Date.now(); await call(B, 'news-put', { issue });
    await audit({ action: 'news-cancel', target: 'news:' + id, after: issue.sent }); return json({ issue });
  }
  return json({ error: 'not found' }, 404);
}
