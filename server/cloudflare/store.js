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
import { scheduleAlarm, runAlarm } from './brakes.js';

const chunkFor = text => (/[^\x00-\x7f]/.test(text) ? 600 * 1024 : 1900 * 1000);
const YEAR = 365 * 864e5;

// ---- Text stored in parts ---------------------------------------------------------
// A short fingerprint of a text (its length and a SHA-256 of it): to know whether a part changed without keeping its text
// (a presentation's slides were kept in memory twice — the deck, and the text last written to compare with —, which on a big
// one was most of the object's memory: 128 MB per Durable Object).
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
export const fingerprint = async s => s.length + ':' + hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).slice(0, 32);
// The parts of a text and their fingerprints (writeText's prev and result).
export const partsOf = async text => { const size = chunkFor(text), fps = []; for (let i = 0; i < text.length; i += size) fps.push(await fingerprint(text.slice(i, i + size))); return fps; };
// prev: the fingerprints of the parts written last time (only the ones that changed are written again); fps: the ones of
// this text, if already made. → the fingerprints of the parts now.
export async function writeText(storage, prefix, text, prev = null, fps = null) {
  const size = chunkFor(text), n = Math.ceil(text.length / size);
  fps ||= prev ? await partsOf(text) : [];
  // (Written in batches of at most ~4 M characters, so a big text isn't all in flight at once.)
  let put = {}, chars = 0, rows = 0;
  const flush = async () => { if (rows) { await storage.put(put); put = {}; chars = 0; rows = 0; } };
  for (let i = 0; i < n; i++) {
    if (prev && prev[i] === fps[i]) continue;
    put[prefix + i] = text.slice(i * size, (i + 1) * size); chars += put[prefix + i].length; rows++;
    if (rows >= 100 || chars >= 4e6) await flush();
  }
  await flush();
  if (prev && prev.length > n) await storage.delete(prev.slice(n).map((_, i) => prefix + (n + i)));
  await storage.put(prefix + 'n', n);
  return fps;
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
  // Expired, or a year without views. (A box without its dates — end NaN — is never put off to «NaN»: brakes.js
  // refuses that time and records it; it's left as it is for the admin to look at.)
  alarm() {
    return runAlarm(this.ctx, this.env, 'share', async () => {
      const meta = await this.ctx.storage.get('meta'); if (!meta) return;
      const end = Math.min(meta.expires || Infinity, (meta.lastView || meta.created) + YEAR);
      if (Date.now() >= end - 1000) await this.wipe(); else await scheduleAlarm(this.ctx, this.env, 'share', end);
    });
  }
  async fetch(req) {
    const url = new URL(req.url), op = url.pathname.split('/').pop(), st = this.ctx.storage;
    if (op === 'init') {
      const { body, meta } = await req.json();
      await writeText(st, 'd', body);
      await st.put('meta', { ...meta, created: Date.now(), views: 0, last: null });
      await scheduleAlarm(this.ctx, this.env, 'share', Math.min(meta.expires || Infinity, Date.now() + YEAR));
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
    const { who, per, scope } = await req.json(), day = new Date().toISOString().slice(0, 10), st = this.ctx.storage;
    // (scope: a counter of its own — support tickets, leads, community reports… —, with its own per-day limit and its
    // own total: SUPPORT_DAILY_TOTAL, 500 by default, for each scope; named after the first one, kept for compatibility.)
    const perUser = +per || +this.env.DAILY_PER_USER || 30, total = scope ? +this.env.SUPPORT_DAILY_TOTAL || 500 : +this.env.DAILY_TOTAL || 3000, all = scope ? '*' + scope : '*';
    const c = (await st.get('day')) === day ? (await st.get('counts')) || {} : {};
    if ((c[all] || 0) >= total) return new Response(JSON.stringify({ ok: false, reason: 'total' }));
    if ((c[who] || 0) >= perUser) return new Response(JSON.stringify({ ok: false, reason: 'user' }));
    c[who] = (c[who] || 0) + 1; c[all] = (c[all] || 0) + 1;
    await st.put({ day, counts: c });
    return new Response(JSON.stringify({ ok: true }));
  }
}
// true if `who` may create one more thing today ({ per, scope }: another counter and limit, see Limits).
export async function takeQuota(env, who, { per, scope } = {}) {
  if (!env.LIMITS) return true;
  const r = await env.LIMITS.get(env.LIMITS.idFromName('limits')).fetch('https://limits/take', { method: 'POST', body: JSON.stringify({ who, ...(per && { per }), ...(scope && { scope }) }) });
  return (await r.json()).ok;
}

// ---- A presentation stored slide by slide ---------------------------------------------
// Each slide in its own values (and the rest of the deck apart), so a change
// rewrites only the slide it touched: the free tier counts rows written.
// prev (from the last write/read) lets unchanged slides be skipped. touched (a Set of slide ids, from the operations
// applied since prev: docs.js) spares even comparing the others — each compare is the slide in JSON, and that, for every
// slide on every change, was most of a change's work on a big presentation.
export async function writeDeck(storage, deck, prev = null, touched = null) {
  const { slides = [], ...rest } = deck;
  const head = JSON.stringify({ ...rest, order: slides.map(s => s.id) });
  const next = { head, slides: new Map() };
  if (!prev || prev.head !== head) await storage.put('deck:head', head);
  for (const s of slides) {
    const old = prev?.slides.get(s.id);
    if (old && touched && !touched.has(s.id)) { next.slides.set(s.id, old); continue; }
    // (What is kept of each slide: its size in characters and the fingerprints of its parts, not its text.)
    const text = JSON.stringify(s), fps = await partsOf(text);
    next.slides.set(s.id, old && old.len === text.length && old.parts.length === fps.length && old.parts.every((f, i) => f === fps[i]) ? old : { len: text.length, parts: await writeText(storage, `slide:${s.id}:`, text, old?.parts, fps) });
  }
  for (const [id, old] of prev?.slides || []) if (!next.slides.has(id)) await storage.delete([`slide:${id}:n`, ...old.parts.map((_, i) => `slide:${id}:${i}`)]);
  return next;
}
export async function readDeck(storage) {
  const head = await storage.get('deck:head'); if (head == null) return null;
  const { order = [], ...rest } = JSON.parse(head), state = { head, slides: new Map() }, slides = [];
  for (const id of order) {
    const parts = await readParts(storage, `slide:${id}:`); if (!parts) continue;
    const text = parts.join(''); state.slides.set(id, { len: text.length, parts: await Promise.all(parts.map(fingerprint)) }); slides.push(JSON.parse(text));
  }
  return { deck: { ...rest, slides }, state };
}
