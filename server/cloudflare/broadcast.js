// Live broadcast to a big audience (slides.com's «Live present»): whoever presents a presentation of Revela's cloud
// from the editor sends where they are — the slide, the step and their pointer — to one room here, and everyone with
// the link follows it in their own browser (view.html?doc=…&live=…), however many they are. Phones' polls and the
// classroom mode go browser to browser (PeerJS) and suit a class; this goes through Cloudflare, for hundreds or
// thousands: each viewer only receives a few bytes per change, and the room sleeps while nothing happens
// (WebSocket hibernation).
//
//   POST /api/live            { doc } (session; edit role on that document, and the document readable by its link)
//                             → { room, token, url }   (url: what the audience opens; token: the presenter's, once)
//   GET  /api/live/:room      WebSocket. The presenter: ?token=…; anyone else is the audience.
//     presenter → { t: 'go', h, v, f } (slide, vertical slide, step) · { t: 'ptr', x, y } (0–1 over the slide, or null)
//                 · { t: 'end' }
//     audience  ← { t: 'hello', doc, state } · the presenter's messages as they come · { t: 'end' }
//     presenter ← { t: 'n', n } (how many follow, at most once a second)
//
// Nothing about the audience is kept: not who they are, not their address; only how many are connected now.
//
// The room is spread over Durable Objects (all of class Broadcast): the room itself (`room`) holds the presenter, and
// RELAYS relays (`room~0`…`room~15`) hold the audience, each viewer in one picked at random. The room passes each
// message to the relays that have someone (one request each) and each relay to its own viewers: a single object
// sending to everyone managed ~20,000 messages a second, so 5,000 viewers with the pointer moving fell seconds behind
// and 20,000 couldn't even get in (stress test on Cloudflare, 2026-10-09). Slide changes carry a number (q) so a relay
// never goes back to an older one; the pointer, the most frequent, goes out of each relay less often the more
// viewers it has (always its last position).
//
// Storage: the room — 'meta' { doc, token (hash), created, owner } · 'state' the last position { h, v, f, q } ·
// 'relays' those in use; a relay — 'relay' { room, doc } · 'state'. A room or relay unused for ROOM_HOURS is deleted
// (alarm).

import { random, sha256 } from './util.js';

export const ROOM_HOURS = 12, MAX_AUDIENCE = 20000, RELAYS = 16;
const PER_RELAY = Math.ceil(MAX_AUDIENCE / RELAYS) + 500;     // (picked at random: some room for unevenness)
const ROOM = /^[\w-]{16,24}$/;
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : null);
const roomOf = (env, room) => env.LIVE.get(env.LIVE.idFromName(room));
const relayOf = (env, room, i) => env.LIVE.get(env.LIVE.idFromName(room + '~' + i));
const post = (stub, op, body) => stub.fetch('https://live/' + op, { method: 'POST', body: JSON.stringify(body) });

export class Broadcast {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.lastN = 0; this.counts = {}; }
  async fetch(req) {
    const url = new URL(req.url), st = this.ctx.storage;
    // ---- The room ----
    if (url.pathname === '/init') {
      const a = await req.json();
      await st.put({ meta: { doc: a.doc, token: await sha256(a.token), created: Date.now(), owner: a.owner, room: a.room }, state: { h: 0, v: 0, f: -1, q: 0 }, relays: [] });
      await st.setAlarm(Date.now() + ROOM_HOURS * 36e5);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/relay') {                         // a relay with its first viewer: from now on it gets every message
      const meta = await st.get('meta'); if (!meta) return new Response('no such room', { status: 404 });
      const a = await req.json(), i = num(a.i, 0, RELAYS - 1), relays = (await st.get('relays')) || [];
      if (!relays.includes(i)) { relays.push(i); await st.put('relays', relays); }
      if (!meta.room && ROOM.test(a.room || '')) await st.put('meta', { ...meta, room: a.room });   // (a room started before relays)
      return Response.json({ doc: meta.doc, state: (await st.get('state')) || null });
    }
    if (url.pathname === '/count') {                         // how many a relay has (at most once a second)
      const a = await req.json(); this.counts = (await st.get('counts')) || {};
      this.counts[num(a.i, 0, RELAYS - 1)] = num(a.n, 0, MAX_AUDIENCE) || 0; await st.put('counts', this.counts); this.count();
      return Response.json({ ok: true });
    }
    // ---- A relay ----
    if (url.pathname === '/push') return this.pushed(await req.json());
    const relayRoom = req.headers.get('X-Live-Room');
    if (relayRoom) return this.viewerAtRelay(req, relayRoom, num(req.headers.get('X-Live-Relay'), 0, RELAYS - 1));
    // ---- The room's own sockets: the presenter (and viewers sent straight here, as before relays) ----
    const meta = await st.get('meta');
    if (!meta) return new Response('no such room', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const presenter = !!url.searchParams.get('token') && (await sha256(url.searchParams.get('token'))) === meta.token;
    if (!presenter && this.ctx.getWebSockets('v').length >= PER_RELAY) return new Response('full', { status: 503 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    await this.join(server, presenter, meta);
    return new Response(null, { status: 101, webSocket: client });
  }
  // A socket in: the presenter or one more of the audience, told where the presentation is now.
  async join(ws, presenter, meta) {
    this.ctx.acceptWebSocket(ws, [presenter ? 'p' : 'v']);
    ws.send(JSON.stringify({ t: 'hello', doc: meta.doc, state: (await this.ctx.storage.get('state')) || null, presenter }));
    this.counts = (await this.ctx.storage.get('counts')) || {};   // (memory doesn't survive hibernation)
    await this.keep();
    this.count();
  }
  // (In use: it stays. At most every 10 minutes: when thousands open the link at once, one write per viewer made
  // them come in at ~185 a second.)
  async keep() { if (Date.now() - (this.alarmSet || 0) > 600e3) { this.alarmSet = Date.now(); await this.ctx.storage.setAlarm(Date.now() + ROOM_HOURS * 36e5); } }
  // How many follow, to the presenter: at once, or within a second when many come together. (Its own + the relays'.)
  count(force = false) {
    const now = Date.now();
    if (!force && now - this.lastN < 1000) { if (!this.later) this.later = setTimeout(() => { this.later = null; this.count(true); }, 1000); return; }
    this.lastN = now;
    const n = this.ctx.getWebSockets('v').length + Object.values(this.counts).reduce((a, b) => a + b, 0);
    const msg = JSON.stringify({ t: 'n', n });
    for (const ws of this.ctx.getWebSockets('p')) { try { ws.send(msg); } catch {} }
  }
  toAudience(msg) { const s = JSON.stringify(msg); for (const ws of this.ctx.getWebSockets('v')) { try { ws.send(s); } catch {} } }
  // The presenter's message: to the room's own viewers, and to every relay in use — to each one after another, so they
  // arrive in order (sent at once, two slide changes could cross and the older be dropped). While a relay is busy
  // its queue waits; a pointer position still waiting there is replaced by the newer one (slide changes never are):
  // with 20,000 viewers, queued pointer moves delayed the slides by seconds.
  async toAll(msg) {
    this.toAudience(msg);
    const room = (await this.ctx.storage.get('meta'))?.room, relays = (await this.ctx.storage.get('relays')) || [];
    if (!room) return;
    this.queues ||= {};
    const waits = relays.map(i => {
      const q = this.queues[i] ||= { items: [], run: null };
      if (msg.t === 'ptr' && q.items.at(-1)?.t === 'ptr') q.items[q.items.length - 1] = msg; else q.items.push(msg);
      q.run ||= (async () => { while (q.items.length) { const m = q.items.shift(); await post(relayOf(this.env, room, i), 'push', m).catch(() => {}); } q.run = null; })();
      return q.run;
    });
    if (msg.t === 'end') await Promise.all(waits);           // (before the room is deleted)
  }
  async webSocketMessage(ws, data) {
    if (!this.ctx.getTags?.(ws)?.includes('p') && !this.ctx.getWebSockets('p').includes(ws)) return;   // (the audience only listens)
    let m; try { m = JSON.parse(typeof data === 'string' ? data.slice(0, 2000) : ''); } catch { return; }
    if (m?.t === 'go') {
      const q = ((await this.ctx.storage.get('state'))?.q || 0) + 1;
      const s = { h: num(m.h, 0, 5000) ?? 0, v: num(m.v, 0, 5000) ?? 0, f: num(m.f, -1, 500) ?? -1, q };
      await this.ctx.storage.put('state', s);
      await this.toAll({ t: 'go', ...s });
    } else if (m?.t === 'ptr') {
      const x = num(m.x, 0, 1), y = num(m.y, 0, 1);
      await this.toAll({ t: 'ptr', x: x == null || y == null ? null : Math.round(x * 1000) / 1000, y: x == null || y == null ? null : Math.round(y * 1000) / 1000 });
    } else if (m?.t === 'end') {
      await this.toAll({ t: 'end' });
      for (const s of this.ctx.getWebSockets()) { try { s.close(1000, 'end'); } catch {} }
      await this.ctx.storage.deleteAll();
    }
  }
  webSocketClose(ws) { try { ws.close(1000, 'bye'); } catch {} this.left(); }
  webSocketError() { this.left(); }
  left() { this.ctx.storage.get('relay').then(rel => (rel ? this.report() : this.count())).catch(() => {}); }
  async alarm() {
    for (const s of this.ctx.getWebSockets()) { try { s.close(1001, 'expired'); } catch {} }
    await this.ctx.storage.deleteAll();
  }

  // ---- As a relay ----
  async viewerAtRelay(req, room, i) {
    const rel = await this.asRelay(room, i); if (!rel) return new Response('no such room', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    if (this.ctx.getWebSockets('v').length >= PER_RELAY) return new Response('full', { status: 503 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    await this.relayJoin(server, rel);
    return new Response(null, { status: 101, webSocket: client });
  }
  // This relay's room; with its first viewer, it registers with the room (which must exist) and takes its state.
  async asRelay(room, i) {
    const st = this.ctx.storage; let rel = await st.get('relay');
    if (rel) return rel;
    const r = await post(roomOf(this.env, room), 'relay', { i, room }).catch(() => null);
    if (!r || !r.ok) return null;
    const a = await r.json(); rel = { room, i, doc: a.doc };
    await st.put({ relay: rel, state: a.state || { h: 0, v: 0, f: -1, q: 0 } });
    return rel;
  }
  async relayJoin(ws, rel) {
    this.ctx.acceptWebSocket(ws, ['v']);
    ws.send(JSON.stringify({ t: 'hello', doc: rel.doc, state: (await this.ctx.storage.get('state')) || null, presenter: false }));
    await this.keep(); this.report();
  }
  // How many this relay has, to the room: within a second when many come or go together.
  report(force = false) {
    if (!force) { if (!this.reportLater) this.reportLater = setTimeout(() => { this.reportLater = null; this.report(true); }, 1000); return; }
    this.ctx.storage.get('relay').then(rel => rel && post(roomOf(this.env, rel.room), 'count', { i: rel.i, n: this.ctx.getWebSockets('v').length })).catch(() => {});
  }
  async pushed(m) {
    const st = this.ctx.storage;
    if (m?.t === 'go') {
      const s = (await st.get('state')) || {};
      if ((m.q || 0) > (s.q || 0)) { await st.put('state', { h: m.h, v: m.v, f: m.f, q: m.q }); this.toAudience(m); }   // (never back to an older one)
    } else if (m?.t === 'ptr') {
      // The pointer: at most every 100 ms, or n/5 ms with n viewers (1,250 → 4 a second), always the last position.
      const gap = Math.max(100, this.ctx.getWebSockets('v').length / 5), now = Date.now();
      this.ptrLast = m;
      if (now - (this.ptrAt || 0) >= gap) { this.ptrAt = now; this.toAudience(m); }
      else if (!this.ptrLater) this.ptrLater = setTimeout(() => { this.ptrLater = null; this.ptrAt = Date.now(); this.toAudience(this.ptrLast); }, gap - (now - (this.ptrAt || 0)));
    } else if (m?.t === 'end') {
      clearTimeout(this.ptrLater); this.ptrLater = null;
      this.toAudience({ t: 'end' });
      for (const s of this.ctx.getWebSockets()) { try { s.close(1000, 'end'); } catch {} }
      await st.deleteAll();
    }
    return Response.json({ ok: true });
  }
}

// /api/live (api.js): starting a broadcast needs a session and the edit role on a document its link lets anyone see.
export async function startLive(env, me, body, json, docs) {
  if (!env.LIVE) return json({ error: 'not configured' }, 503);
  const doc = String(body.doc || ''); if (!/^[\w-]{16,40}$/.test(doc)) return json({ error: 'bad request' }, 400);
  const r = await docs(doc, me);
  if (r.status !== 200) return json({ error: r.data?.error || 'not found' }, r.status);
  if (!['owner', 'edit'].includes(r.data.role)) return json({ error: 'forbidden' }, 403);
  // (The audience opens it without an account: its link must let anyone at least present it.)
  if ((await docs(doc, null)).status !== 200) return json({ error: 'not shared' }, 409);
  const room = random(12), token = random(24);
  await roomOf(env, room).fetch('https://live/init', { method: 'POST', body: JSON.stringify({ doc, token, owner: me.sub, room }) });
  const site = env.SITE_URL || 'https://revelaslides.com';
  return json({ room, token, url: `${site}/app/view.html?doc=${encodeURIComponent(doc)}&live=${room}` });
}
// The presenter (?token=) to the room; each viewer to a relay picked at random (another if that one is full).
export async function joinLive(req, env, room) {
  if (!env.LIVE || !ROOM.test(room)) return new Response('not found', { status: 404 });
  const own = new Headers(req.headers); own.delete('X-Live-Room'); own.delete('X-Live-Relay');   // (only set here)
  if (new URL(req.url).searchParams.get('token')) return roomOf(env, room).fetch(new Request(req, { headers: own }));
  let r;
  for (let k = 0; k < 3; k++) {
    const i = crypto.getRandomValues(new Uint32Array(1))[0] % RELAYS, h = new Headers(own);
    h.set('X-Live-Room', room); h.set('X-Live-Relay', String(i));
    r = await relayOf(env, room, i).fetch(new Request(req, { headers: h }));
    if (r.status !== 503) return r;
  }
  return r;
}
