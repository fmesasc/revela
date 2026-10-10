// The website's visits, counted by Revela itself and without cookies (privacy.html): each page of revelaslides.com
// tells, once it's shown (site.js), its address, where the visitor came from (another site's address, never the
// query) and its language; the 404 page, the address that doesn't exist and the page that linked to it.
//
// Unique visitors per day without following anyone: the Worker hashes the address and browser (never kept), and this
// object mixes that with a salt that changes every day and is thrown away — the same person is one visitor today
// and impossible to recognise tomorrow. A browser that asks not to be followed (Global Privacy Control) isn't counted.
//
// For the administration (admin.js /web): visitors and views per day, the pages, where they come from, languages; the
// pages visited that the sitemap leaves out (to add them: «extra», also in /community/sitemap.xml) and the addresses
// that don't exist, with where from (to redirect them — the 404 page asks /api/redirect — or ignore them).
//
//   Visits (one Durable Object, 'visits'): 'salt' { day, value } · 'v:<vid>' (today's visitors; gone tomorrow) ·
//   'd:<day>' { views, uniques, pages, refs, langs, nf } (400 days) · 'nf:<path>' (404s) · 'extra' · 'redirects'.
import { sha256, random, DAY } from './util.js';
import { errorsOp } from './errors.js';

const KEEP_DAYS = 400, MAX_KEYS = 300, MAX_PER_VISITOR = 200;
export const dayOf = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);
// An address of this site, as it's counted: the path only, without «.html» or a final «/» (but the root), ≤ 200.
export function cleanPath(p) {
  let s = String(p || '/').split(/[?#]/)[0].slice(0, 200);
  try { s = decodeURI(s); } catch {}
  s = s.replace(/\/{2,}/g, '/').replace(/\.html$/, '').replace(/(.)\/$/, '$1');
  return s.startsWith('/') ? s : '/' + s;
}
// Where from: another site's address (its host and path, no query); this site's own pages count as «internal».
export function cleanRef(r, site) {
  try { const u = new URL(r); if (!/^https?:$/.test(u.protocol)) return ''; if (u.host === new URL(site).host) return 'internal:' + cleanPath(u.pathname); return (u.host + u.pathname).slice(0, 200); } catch { return ''; }
}
const bump = (o, k, n = 1) => { if (!k) return; if (!(k in o) && Object.keys(o).length >= MAX_KEYS) k = '(otros)'; o[k] = (o[k] || 0) + n; };

export class Visits {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage, now = +a.now || Date.now(), day = dayOf(now);
    if (op.startsWith('err')) return Response.json(await errorsOp(st, op, a, now));      // (the app's errors: errors.js)
    if (op === 'hit') {                                   // { who (a hash of address and browser), path, ref, lang, kind: view | 404 }
      let salt = await st.get('salt');
      if (salt?.day !== day) {                            // (a new day: a new salt, yesterday's visitors forgotten)
        const old = [...(await st.list({ prefix: 'v:' })).keys()]; for (let i = 0; i < old.length; i += 128) await st.delete(old.slice(i, i + 128));
        salt = { day, value: random(24) }; await st.put('salt', salt);
        const days = [...(await st.list({ prefix: 'd:', end: 'd:' + dayOf(now - KEEP_DAYS * DAY) })).keys()]; if (days.length) await st.delete(days.slice(0, 128));
      }
      const vid = 'v:' + (await sha256(salt.value + '|' + String(a.who || ''))).slice(0, 22), seen = (await st.get(vid)) || 0;
      if (seen >= MAX_PER_VISITOR) return Response.json({ ok: true, capped: true });
      const d = (await st.get('d:' + day)) || { views: 0, uniques: 0, pages: {}, refs: {}, langs: {}, nf: 0 };
      if (!seen) d.uniques++;
      if (a.kind === '404') {
        d.nf++;
        const k = 'nf:' + a.path, n = (await st.get(k)) || { path: a.path, n: 0, first: now, refs: {}, status: 'new' };
        n.n++; n.last = now; if (a.ref) bump(n.refs, a.ref); if (Object.keys(n.refs).length > 10) n.refs = Object.fromEntries(Object.entries(n.refs).sort((x, y) => y[1] - x[1]).slice(0, 10));
        await st.put(k, n);
      } else { d.views++; bump(d.pages, a.path); if (a.ref && !a.ref.startsWith('internal:')) bump(d.refs, a.ref.split('/')[0]); bump(d.langs, a.lang); }
      await st.put({ [vid]: seen + 1, ['d:' + day]: d });
      return Response.json({ ok: true });
    }
    if (op === 'stats') {                                 // { days } → { days: [{ day, views, uniques, nf }], pages, refs, langs } (the period's totals)
      const n = Math.min(400, Math.max(1, +a.days || 30)), from = dayOf(now - (n - 1) * DAY), rows = await st.list({ prefix: 'd:', start: 'd:' + from });
      const pages = {}, refs = {}, langs = {}, days = [];
      for (const [k, d] of rows) { days.push({ day: k.slice(2), views: d.views, uniques: d.uniques, nf: d.nf });
        for (const [x, v] of Object.entries(d.pages)) bump(pages, x, v); for (const [x, v] of Object.entries(d.refs)) bump(refs, x, v); for (const [x, v] of Object.entries(d.langs)) bump(langs, x, v); }
      const top = (o, m = 30) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, m).map(([k, v]) => ({ k, n: v }));
      return Response.json({ days, pages: top(pages, 200), refs: top(refs), langs: top(langs, 20) });
    }
    // «¿Para qué vas a usar Revela?»: 'a:<day>' { first: { edu, biz, both }, skip, change: { … }, langs: { es: { edu… } } }.
    if (op === 'aud') {                                   // { v: edu | biz | both, kind: first | change | skip, lang }
      const k = 'a:' + day, d = (await st.get(k)) || { first: {}, change: {}, skip: 0, langs: {} };
      if (a.kind === 'skip') d.skip++;
      else { bump(d[a.kind === 'change' ? 'change' : 'first'], a.v); if (a.kind !== 'change' && a.lang) { d.langs[a.lang] ||= {}; bump(d.langs[a.lang], a.v); } }
      await st.put(k, d);
      const old = [...(await st.list({ prefix: 'a:', end: 'a:' + dayOf(now - KEEP_DAYS * DAY) })).keys()]; if (old.length) await st.delete(old.slice(0, 128));
      return Response.json({ ok: true });
    }
    if (op === 'aud-stats') {                             // { days } → { days: [{ day, first, change, skip }], total: { edu, biz, both, skip }, langs }
      const n = Math.min(400, Math.max(1, +a.days || 90)), rows = await st.list({ prefix: 'a:', start: 'a:' + dayOf(now - (n - 1) * DAY) });
      const total = { edu: 0, biz: 0, both: 0, skip: 0 }, langs = {}, days = [];
      for (const [k, d] of rows) {
        days.push({ day: k.slice(2), first: d.first, change: d.change, skip: d.skip });
        for (const [v, x] of Object.entries(d.first)) total[v] = (total[v] || 0) + x; total.skip += d.skip || 0;
        for (const [l, o] of Object.entries(d.langs || {})) { langs[l] ||= {}; for (const [v, x] of Object.entries(o)) langs[l][v] = (langs[l][v] || 0) + x; }
      }
      return Response.json({ days, total, langs });
    }
    if (op === 'notfound') return Response.json({ items: [...(await st.list({ prefix: 'nf:' })).values()].filter(x => a.all || x.status === 'new').sort((x, y) => y.n - x.n).slice(0, 200) });
    if (op === 'nf-set') {                                // { path, status: ignored | redirect | new, to? }
      const k = 'nf:' + a.path, n = await st.get(k); if (!n) return Response.json({ error: 'not found' }, { status: 404 });
      n.status = a.status; const r = (await st.get('redirects')) || {};
      if (a.status === 'redirect') { n.to = a.to; r[a.path] = a.to; } else { delete n.to; delete r[a.path]; }
      await st.put({ [k]: n, redirects: r }); return Response.json({ ok: true, item: n });
    }
    if (op === 'redirect') return Response.json({ to: ((await st.get('redirects')) || {})[a.path] || null });
    if (op === 'extra') return Response.json({ extra: (await st.get('extra')) || [] });
    if (op === 'extra-set') { await st.put('extra', a.extra); return Response.json({ extra: a.extra }); }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}
export const visitsCall = async (env, op, body = {}) => (await env.VISITS.get(env.VISITS.idFromName('visits')).fetch('https://visits/' + op, { method: 'POST', body: JSON.stringify(body) })).json();

// POST /api/visit (from the site's own pages: api.js checks the origin).
export async function handleVisit(req, env, body, json) {
  if (!env.VISITS) return json({ ok: true });
  const site = env.SITE_URL || 'https://revelaslides.com', kind = body.kind === '404' ? '404' : 'view';
  const who = await sha256((req.headers.get('CF-Connecting-IP') || '') + '|' + (req.headers.get('User-Agent') || ''));
  const lang = /^[a-z]{2}$/.test(body.lang || '') ? body.lang : '';
  await visitsCall(env, 'hit', { who, path: cleanPath(body.path), ref: cleanRef(body.ref, site), lang, kind });
  return json({ ok: true });
}
