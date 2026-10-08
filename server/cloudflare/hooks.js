// Integrations (Pitch's and DocSend's Slack notices, Zapier's triggers): what happens to my presentations, sent where
// I work — Slack, Microsoft Teams, Google Chat, Discord, or any address (Zapier, Make, n8n, my own server). Each one
// is an incoming-webhook address I paste in My account ▸ Desarrolladores e IA, with the events it wants:
//   opened   one of my tracked links was opened (docs.js; as the «opened» email)
//   comment  someone commented on one of my presentations (docs.js)
// Chat services get a line of text in their format; any other address gets JSON { event, data, at } signed with the
// hook's own secret (X-Revela-Signature: sha256=<HMAC of the body>, shown once when it's added).
//
//   GET  /api/hooks               → { hooks: [{ id, url (its host and the start of its path), events, created, last?, fails? }] }   (session only)
//   POST /api/hooks               { url, events } → { id, secret }
//   POST /api/hooks/:id/delete    → { ok }
//   POST /api/hooks/:id/test      → { ok, status }
//
// Storage: in the Account, 'hooks' [{ id, url, events, secret, created, last, fails }] (at most HOOKS_MAX). A hook
// that keeps failing (FAIL_MAX in a row) stops being called until it's added again.

import { random, hmac } from './util.js';
import { acct, call } from './api.js';

export const HOOK_EVENTS = ['opened', 'comment'], HOOKS_MAX = 5, FAIL_MAX = 20;
const kindOf = host => (/(^|\.)hooks\.slack\.com$/.test(host) ? 'slack' : /(^|\.)discord(app)?\.com$/.test(host) ? 'discord'
  : /(^|\.)chat\.googleapis\.com$/.test(host) ? 'gchat' : /(\.webhook\.office\.com|\.logic\.azure\.com|\.powerautomate\.com|\.powerplatform\.com)$/.test(host) ? 'teams' : 'json');
const shown = u => { try { const x = new URL(u); return x.host + x.pathname.slice(0, 12) + (x.pathname.length > 12 ? '…' : ''); } catch { return ''; } };

// The Account's side.
export async function hookOp(acc, op, a) {
  const hooks = await acc.get('hooks', []);
  switch (op) {
    case 'hook-list': return a.full ? { hooks, lang: (await acc.get('profile', {})).lang || 'es' } : { hooks: hooks.map(({ secret, url, ...h }) => ({ ...h, url: shown(url) })) };
    case 'hook-add': {
      if (hooks.length >= HOOKS_MAX) return { error: 'too many', max: HOOKS_MAX };
      const h = { id: random(6), url: a.url, events: a.events, secret: random(24), created: Date.now(), last: null, fails: 0 };
      await acc.put({ hooks: [...hooks, h] }); return { id: h.id, secret: h.secret };
    }
    case 'hook-del': { const next = hooks.filter(h => h.id !== a.id); await acc.put({ hooks: next }); return { ok: next.length < hooks.length }; }
    case 'hook-done': {                                  // { id, ok }: its last delivery
      const h = hooks.find(x => x.id === a.id); if (!h) return { ok: false };
      Object.assign(h, a.ok ? { last: Date.now(), fails: 0 } : { fails: (h.fails || 0) + 1 }); await acc.put({ hooks }); return { ok: true };
    }
  }
  return null;
}

// What a chat shows: one line in the account's language (Spanish or English).
function line(event, d, lang) {
  const es = lang === 'es' || lang === 'ca' || lang === 'gl' || lang === 'eu';
  if (event === 'opened') return es ? `👀 ${d.who || 'Alguien'} ha abierto «${d.name}» (${d.label}): ${d.url}` : `👀 ${d.who || 'Someone'} opened "${d.name}" (${d.label}): ${d.url}`;
  if (event === 'comment') return es ? `💬 ${d.by} ha comentado en «${d.name}»: ${d.text}\n${d.url}` : `💬 ${d.by} commented on "${d.name}": ${d.text}\n${d.url}`;
  return es ? '✅ Revela está conectado a este canal.' : '✅ Revela is connected to this channel.';
}
async function deliver(env, h, event, data, lang) {
  const host = new URL(h.url).host, kind = kindOf(host), text = line(event, data, lang);
  const body = JSON.stringify(kind === 'slack' || kind === 'gchat' || kind === 'teams' ? { text } : kind === 'discord' ? { content: text.slice(0, 1900) } : { event, data, at: new Date().toISOString() });
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Revela-Webhooks/1.0', ...(kind === 'json' && { 'X-Revela-Event': event, 'X-Revela-Signature': 'sha256=' + await hmac(h.secret, body) }) };
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
  try { const r = await (env.FETCH || fetch)(h.url, { method: 'POST', headers, body, signal: ctl.signal, redirect: 'manual' }); return { ok: r.ok, status: r.status }; }
  catch { return { ok: false, status: 0 }; }
  finally { clearTimeout(timer); }
}
// An event for one account: to each of its hooks that wants it (and hasn't failed too often).
export async function notifyHooks(env, sub, event, data) {
  const A = acct(env, sub), { hooks, lang } = await call(A, 'hook-list', { full: true });
  const want = (hooks || []).filter(h => h.events.includes(event) && (h.fails || 0) < FAIL_MAX); if (!want.length) return;
  for (const h of want) { const r = await deliver(env, h, event, data, lang); await call(A, 'hook-done', { id: h.id, ok: r.ok }); }
}

// The routes (a session of the app, never an API key).
export async function handleHooks(path, req, body, me, A, env, json) {
  if (me.via === 'key') return json({ error: 'forbidden' }, 403);
  if (path === '/hooks' && req.method === 'GET') return json(await call(A, 'hook-list'));
  if (path === '/hooks' && req.method === 'POST') {
    let u; try { u = new URL(String(body.url || '')); } catch { return json({ error: 'url' }, 400); }
    if (u.protocol !== 'https:' || String(body.url).length > 600 || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname) || u.hostname.endsWith('.local')) return json({ error: 'url' }, 400);
    const events = [...new Set((Array.isArray(body.events) ? body.events : []).filter(e => HOOK_EVENTS.includes(e)))];
    if (!events.length) return json({ error: 'events' }, 400);
    const r = await call(A, 'hook-add', { url: u.href, events });
    return r.error ? json(r, 409) : json({ ...r, kind: kindOf(u.host) });
  }
  const m = path.match(/^\/hooks\/([\w-]{4,20})\/(delete|test)$/);
  if (m && req.method === 'POST' && m[2] === 'delete') { const r = await call(A, 'hook-del', { id: m[1] }); return json(r, r.ok ? 200 : 404); }
  if (m && req.method === 'POST' && m[2] === 'test') {
    const { hooks, lang } = await call(A, 'hook-list', { full: true }), h = hooks.find(x => x.id === m[1]); if (!h) return json({ error: 'not found' }, 404);
    const r = await deliver(env, h, 'test', { test: true }, lang);
    await call(A, 'hook-done', { id: h.id, ok: r.ok });
    return json(r);
  }
  return json({ error: 'not found' }, 404);
}
export const _private = { kindOf, line };
