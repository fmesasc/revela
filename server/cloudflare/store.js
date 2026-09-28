// Storage of Revela's server in Durable Objects (not R2).
//
// Why: on Cloudflare's Workers Free plan, Workers and Durable Objects have
// hard daily limits — when reached, requests fail until 00:00 UTC and nothing
// is charged. R2, instead, bills whatever goes past its free tier to the card
// on the account. Keeping everything in Durable Objects (SQLite storage: 5 GB,
// 100 000 rows written and 5 M read a day, free) means the worst case is "it
// stops until tomorrow", never a bill.
//
// - ShareBox: one per shared presentation (sealed, encrypted in the browser):
//   its data in parts of < 2 MB, its token (hash), expiry, domain limit and a
//   view counter. Deleted when it expires, when unshared, or after a year
//   without views.
// - Limits: one object with the day's counters: presentations shared and rooms
//   opened per person (DAILY_PER_USER, default 30) and in total (DAILY_TOTAL,
//   default 3000), so nobody can use up the free quota for everyone.

// Values are limited to 2 MB: ASCII text (images as data URLs) in parts of
// 1.9 M characters, anything else in parts that fit even as 3-byte UTF-8.
const chunkFor = text => (/[^\x00-\x7f]/.test(text) ? 600 * 1024 : 1900 * 1000);
const YEAR = 365 * 864e5;

// ---- Text stored in parts ---------------------------------------------------------
// prev: the parts written last time (only the ones that changed are written again).
export async function writeText(storage, prefix, text, prev = null) {
  const parts = [], size = chunkFor(text);
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  const put = {};
  parts.forEach((p, i) => { if (!prev || prev[i] !== p) put[prefix + i] = p; });
  const keys = Object.keys(put);
  for (let i = 0; i < keys.length; i += 100) await storage.put(Object.fromEntries(keys.slice(i, i + 100).map(k => [k, put[k]])));
  if (prev && prev.length > parts.length) await storage.delete(prev.slice(parts.length).map((_, i) => prefix + (parts.length + i)));
  await storage.put(prefix + 'n', parts.length);
  return parts;
}
export async function readParts(storage, prefix) {
  const n = await storage.get(prefix + 'n'); if (n == null) return null;
  const keys = Array.from({ length: n }, (_, i) => prefix + i), out = [];
  for (let i = 0; i < keys.length; i += 128) { const m = await storage.get(keys.slice(i, i + 128)); keys.slice(i, i + 128).forEach(k => out.push(m.get(k) ?? '')); }
  return out;
}

// ---- A shared presentation ------------------------------------------------------------
export class ShareBox {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  json(obj, status = 200, headers = {}) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } }); }
  async wipe() { await this.ctx.storage.deleteAll(); await this.ctx.storage.deleteAlarm?.(); }
  async alarm() {                                            // expired, or a year without views
    const meta = await this.ctx.storage.get('meta'); if (!meta) return;
    const end = Math.min(meta.expires || Infinity, (meta.lastView || meta.created) + YEAR);
    if (Date.now() >= end - 1000) await this.wipe(); else await this.ctx.storage.setAlarm(end);
  }
  async fetch(req) {
    const url = new URL(req.url), op = url.pathname.split('/').pop(), st = this.ctx.storage;
    if (op === 'init') {
      const { body, meta } = await req.json();
      await writeText(st, 'd', body);
      await st.put('meta', { ...meta, created: Date.now(), views: 0, last: null });
      await st.setAlarm(Math.min(meta.expires || Infinity, Date.now() + YEAR));
      return this.json({ ok: true });
    }
    const meta = await st.get('meta');
    if (!meta) return this.json({ error: 'not found' }, 404);
    if (meta.expires && Date.now() > meta.expires) { await this.wipe(); return this.json({ error: 'not found' }, 404); }
    const token = req.headers.get('X-Owner-Token') || '';
    if (op === 'stats') return token && token === meta.token ? this.json({ views: meta.views || 0, last: meta.last || null }) : this.json({ error: 'forbidden' }, 403);
    if (op === 'delete') { if (!token || token !== meta.token) return this.json({ error: 'forbidden' }, 403); await this.wipe(); return this.json({ ok: true }); }
    // read (the worker has checked the Google account when limited to a domain)
    if (req.headers.get('X-Domain-Ok') !== '1' && meta.domain) return this.json({ signIn: true, domain: meta.domain, clientId: meta.clientId }, 401, { 'Cache-Control': 'no-store' });
    const parts = await readParts(st, 'd');
    meta.views = (meta.views || 0) + 1; meta.last = new Date().toISOString(); meta.lastView = Date.now();
    await st.put('meta', meta);                              // a counter and the date: nothing about the viewer
    return new Response(parts.join(''), { headers: { 'Content-Type': 'application/json', 'X-Domain': meta.domain || '', 'X-Client-Id': meta.clientId || '' } });
  }
}

// ---- Daily limits -------------------------------------------------------------------------
export class Limits {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(req) {
    const { who } = await req.json(), day = new Date().toISOString().slice(0, 10), st = this.ctx.storage;
    const perUser = +this.env.DAILY_PER_USER || 30, total = +this.env.DAILY_TOTAL || 3000;
    const c = (await st.get('day')) === day ? (await st.get('counts')) || {} : {};
    if ((c['*'] || 0) >= total) return new Response(JSON.stringify({ ok: false, reason: 'total' }));
    if ((c[who] || 0) >= perUser) return new Response(JSON.stringify({ ok: false, reason: 'user' }));
    c[who] = (c[who] || 0) + 1; c['*'] = (c['*'] || 0) + 1;
    await st.put({ day, counts: c });
    return new Response(JSON.stringify({ ok: true }));
  }
}
// true if `who` may create one more thing today.
export async function takeQuota(env, who) {
  if (!env.LIMITS) return true;
  const r = await env.LIMITS.get(env.LIMITS.idFromName('limits')).fetch('https://limits/take', { method: 'POST', body: JSON.stringify({ who }) });
  return (await r.json()).ok;
}

// ---- A presentation stored slide by slide ---------------------------------------------
// Each slide in its own values (and the rest of the deck apart), so a change
// rewrites only the slide it touched: the free tier counts rows written.
// prev (from the last write/read) lets unchanged slides be skipped.
export async function writeDeck(storage, deck, prev = null) {
  const { slides = [], ...rest } = deck;
  const head = JSON.stringify({ ...rest, order: slides.map(s => s.id) });
  const next = { head, slides: new Map() };
  if (!prev || prev.head !== head) await storage.put('deck:head', head);
  for (const s of slides) {
    const text = JSON.stringify(s), old = prev?.slides.get(s.id);
    next.slides.set(s.id, old && old.text === text ? old : { text, parts: await writeText(storage, `slide:${s.id}:`, text, old?.parts) });
  }
  for (const [id, old] of prev?.slides || []) if (!next.slides.has(id)) await storage.delete([`slide:${id}:n`, ...old.parts.map((_, i) => `slide:${id}:${i}`)]);
  return next;
}
export async function readDeck(storage) {
  const head = await storage.get('deck:head'); if (head == null) return null;
  const { order = [], ...rest } = JSON.parse(head), state = { head, slides: new Map() }, slides = [];
  for (const id of order) {
    const parts = await readParts(storage, `slide:${id}:`); if (!parts) continue;
    const text = parts.join(''); state.slides.set(id, { text, parts }); slides.push(JSON.parse(text));
  }
  return { deck: { ...rest, slides }, state };
}
