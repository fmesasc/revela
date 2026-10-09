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
// Storage (Durable Object Broadcast, one per room): 'meta' { doc, token (hash), created, owner } · 'state' the last
// position. A room unused for ROOM_HOURS is deleted (alarm).

import { random, sha256 } from './util.js';

export const ROOM_HOURS = 12, MAX_AUDIENCE = 20000;
const ROOM = /^[\w-]{16,24}$/;
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : null);

export class Broadcast {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.lastN = 0; }
  async fetch(req) {
    const url = new URL(req.url), st = this.ctx.storage;
    if (url.pathname === '/init') {
      const a = await req.json();
      await st.put({ meta: { doc: a.doc, token: await sha256(a.token), created: Date.now(), owner: a.owner }, state: { h: 0, v: 0, f: -1 } });
      await st.setAlarm(Date.now() + ROOM_HOURS * 36e5);
      return Response.json({ ok: true });
    }
    const meta = await st.get('meta');
    if (!meta) return new Response('no such room', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const presenter = !!url.searchParams.get('token') && (await sha256(url.searchParams.get('token'))) === meta.token;
    if (!presenter && this.ctx.getWebSockets('v').length >= MAX_AUDIENCE) return new Response('full', { status: 503 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    await this.join(server, presenter, meta);
    return new Response(null, { status: 101, webSocket: client });
  }
  // A socket in: the presenter or one more of the audience, told where the presentation is now.
  async join(ws, presenter, meta) {
    this.ctx.acceptWebSocket(ws, [presenter ? 'p' : 'v']);
    ws.send(JSON.stringify({ t: 'hello', doc: meta.doc, state: (await this.ctx.storage.get('state')) || null, presenter }));
    // (In use: it stays. At most every 10 minutes: when thousands open the link at once, one write per viewer made
    // them come in at ~185 a second.)
    if (Date.now() - (this.alarmSet || 0) > 600e3) { this.alarmSet = Date.now(); await this.ctx.storage.setAlarm(Date.now() + ROOM_HOURS * 36e5); }
    this.count();
  }
  // How many follow, to the presenter: at once, or within a second when many come together.
  count(force = false) {
    const now = Date.now();
    if (!force && now - this.lastN < 1000) { if (!this.later) this.later = setTimeout(() => { this.later = null; this.count(true); }, 1000); return; }
    this.lastN = now;
    const msg = JSON.stringify({ t: 'n', n: this.ctx.getWebSockets('v').length });
    for (const ws of this.ctx.getWebSockets('p')) { try { ws.send(msg); } catch {} }
  }
  toAudience(msg) { const s = JSON.stringify(msg); for (const ws of this.ctx.getWebSockets('v')) { try { ws.send(s); } catch {} } }
  async webSocketMessage(ws, data) {
    if (!this.ctx.getTags?.(ws)?.includes('p') && !this.ctx.getWebSockets('p').includes(ws)) return;   // (the audience only listens)
    let m; try { m = JSON.parse(typeof data === 'string' ? data.slice(0, 2000) : ''); } catch { return; }
    if (m?.t === 'go') {
      const s = { h: num(m.h, 0, 5000) ?? 0, v: num(m.v, 0, 5000) ?? 0, f: num(m.f, -1, 500) ?? -1 };
      await this.ctx.storage.put('state', s);
      this.toAudience({ t: 'go', ...s });
    } else if (m?.t === 'ptr') {
      const x = num(m.x, 0, 1), y = num(m.y, 0, 1);
      this.toAudience({ t: 'ptr', x: x == null || y == null ? null : Math.round(x * 1000) / 1000, y: x == null || y == null ? null : Math.round(y * 1000) / 1000 });
    } else if (m?.t === 'end') {
      this.toAudience({ t: 'end' });
      for (const s of this.ctx.getWebSockets()) { try { s.close(1000, 'end'); } catch {} }
      await this.ctx.storage.deleteAll();
    }
  }
  webSocketClose(ws) { try { ws.close(1000, 'bye'); } catch {} this.count(); }
  webSocketError() { this.count(); }
  async alarm() {
    for (const s of this.ctx.getWebSockets()) { try { s.close(1001, 'expired'); } catch {} }
    await this.ctx.storage.deleteAll();
  }
}

const roomOf = (env, room) => env.LIVE.get(env.LIVE.idFromName(room));

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
  await roomOf(env, room).fetch('https://live/init', { method: 'POST', body: JSON.stringify({ doc, token, owner: me.sub }) });
  const site = env.SITE_URL || 'https://revelaslides.com';
  return json({ room, token, url: `${site}/app/view.html?doc=${encodeURIComponent(doc)}&live=${room}` });
}
export async function joinLive(req, env, room) {
  if (!env.LIVE || !ROOM.test(room)) return new Response('not found', { status: 404 });
  return roomOf(env, room).fetch(req);
}
