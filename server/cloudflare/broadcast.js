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
// (alarm). A vote room also 'kept:<css|slide|poll|qa>' (the last of each sent to all); a code — 'code' { room, until }.
//
// ---- Votes through the server (a vote room: meta.vote) ----
// The audience's polls, activities and questions (io/runtime/scripts.js, apps/vote) went only browser to browser
// (PeerJS): one WebRTC connection per phone into the presenter's browser, and Chrome doesn't hold more than ~500 of
// them (stress test, 2026-10-09). Presenting from the editor with an account, they come here instead: the same rooms
// and relays as a broadcast, the phones where the viewers were — and here they also talk.
//
//   POST /api/vote           (session) → { room, token, code }  (code: the 5 letters typed on vote.html, ROOM_HOURS)
//   GET  /api/vote/code/:c   → { room }
//   GET  /api/vote/:room     WebSocket. The presenter: ?token=…; a phone: anyone (with its account if it has a session)
//     phone → relay      the messages it sent over PeerJS: { type: 'hi' | 'vote' | 'lang', … } (others dropped; at most
//                        PHONE_RATE every 10 s and PHONE_MAX characters). With an account, its voter is replaced by the
//                        account's (util.js voterOf) and marked acct: true; without one, acct is taken off — so a
//                        poll that asks to sign in («login») can trust it, and nothing a phone sends can fake it.
//     relay → room       { l: [[cid, message], …] } — what came in a moment (UP_MS), together, in one request; also
//                        [cid, { type: '_open' }] and [cid, { type: '_close' }] as phones come and go
//     room → presenter   { t: 'up', l } as it came · { t: 'n', n } how many phones
//     presenter → room   { t: 'all', d, keep? } d to every phone (keep: 'css' | 'slide' | 'poll' | 'qa', also to each
//                        phone that comes later: none is sent one by one) · { t: 'to', l: [[cid, d], …] } each d to
//                        its phone · { t: 'end' }
//     relay → phone      { type: 'auth', on } (signed in or not), the kept ones, then whatever the presenter sends
// The presenter's browser keeps deciding everything as before (what counts, who answered, the marks); here only
// what can't be done there: carrying, and saying whose account it is. Nothing is stored per vote: a vote costs ~1/20
// of a request (the phone's message) plus its share of one request per relay and batch.

import { random, sha256, voterOf } from './util.js';
import { takeQuota } from './store.js';

export const ROOM_HOURS = 12, MAX_AUDIENCE = 20000, RELAYS = 16;
const PER_RELAY = Math.ceil(MAX_AUDIENCE / RELAYS) + 500;     // (picked at random: some room for unevenness)
export const UP_MS = 100, PHONE_RATE = 40, PHONE_MAX = 320000, KEEPS = ['css', 'slide', 'poll', 'qa'];
// (A vote room's phones go to relay 0 until it has FIRST_RELAY, then spread over the others: what reaches every phone
// costs a request per relay in use, and a class fits in one — 16 for 30 phones was ~1 request per vote instead of 0.1.)
export const FIRST_RELAY = 300;
const PRESENTER_MAX = 1000000, BACKLOG = 5000, CODE = /^[A-HJ-NP-Z2-9]{5}$/, CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM = /^[\w-]{16,24}$/;
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : null);
const roomOf = (env, room) => env.LIVE.get(env.LIVE.idFromName(room));
const relayOf = (env, room, i) => env.LIVE.get(env.LIVE.idFromName(room + '~' + i));
const codeOf = (env, code) => env.LIVE.get(env.LIVE.idFromName('code~' + code));
const post = (stub, op, body) => stub.fetch('https://live/' + op, { method: 'POST', body: JSON.stringify(body) });

export class Broadcast {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.lastN = 0; this.counts = {}; }
  async fetch(req) {
    const url = new URL(req.url), st = this.ctx.storage;
    // ---- The room ----
    if (url.pathname === '/init') {
      const a = await req.json();
      await st.put({ meta: { doc: a.doc || null, token: await sha256(a.token), created: Date.now(), owner: a.owner, room: a.room, ...(a.vote && { vote: true, code: a.code || null }) }, state: { h: 0, v: 0, f: -1, q: 0 }, relays: [] });
      await st.setAlarm(Date.now() + ROOM_HOURS * 36e5);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/relay') {                         // a relay with its first viewer: from now on it gets every message
      const meta = await st.get('meta'); if (!meta) return new Response('no such room', { status: 404 });
      const a = await req.json(), i = num(a.i, 0, RELAYS - 1), relays = (await st.get('relays')) || [];
      if (!relays.includes(i)) { relays.push(i); await st.put('relays', relays); }
      if (!meta.room && ROOM.test(a.room || '')) await st.put('meta', { ...meta, room: a.room });   // (a room started before relays)
      return Response.json({ doc: meta.doc, state: (await st.get('state')) || null, ...(meta.vote && { vote: true, owner: meta.owner, kept: await this.keptAtRoom() }) });
    }
    if (url.pathname === '/up') return this.upAtRoom(await req.json());
    if (url.pathname === '/kept') return Response.json(await this.keptAtRoom());
    // ---- A vote room's code (an object of its own, 'code~XXXXX') ----
    if (url.pathname === '/code-set') {
      const a = await req.json(), now = Date.now(), c = await st.get('code');
      if (c && c.until > now) return Response.json({ ok: false }, { status: 409 });
      await st.put('code', { room: a.room, until: now + ROOM_HOURS * 36e5 }); await st.setAlarm(now + ROOM_HOURS * 36e5);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/code-get') { const c = await st.get('code'); return c && c.until > Date.now() ? Response.json({ room: c.room }) : Response.json({ error: 'not found' }, { status: 404 }); }
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
    // (A vote room: what the phones said while the presenter was reconnecting.)
    if (presenter && this.backlog?.length) { ws.send(JSON.stringify({ t: 'up', l: this.backlog })); this.backlog = []; }
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
    const waits = relays.map(i => this.toRelay(room, i, msg));
    if (msg.t === 'end') await Promise.all(waits);           // (before the room is deleted)
  }
  toRelay(room, i, msg) {
    this.queues ||= {};
    const q = this.queues[i] ||= { items: [], run: null };
    if (msg.t === 'ptr' && q.items.at(-1)?.t === 'ptr') q.items[q.items.length - 1] = msg; else q.items.push(msg);
    q.run ||= (async () => { while (q.items.length) { const m = q.items.shift(); await post(relayOf(this.env, room, i), 'push', m).catch(() => {}); } q.run = null; })();
    return q.run;
  }
  async webSocketMessage(ws, data) {
    if (!this.ctx.getTags?.(ws)?.includes('p') && !this.ctx.getWebSockets('p').includes(ws)) return this.fromPhone(ws, data);   // (a broadcast's audience only listens)
    // (A vote room's presenter sends what goes to the phones — a slide in the classroom mode, with its styles, is big.)
    const vote = typeof data === 'string' && data.length > 2000 ? (await this.ctx.storage.get('meta'))?.vote : false;
    let m; try { m = JSON.parse(typeof data === 'string' ? (vote ? (data.length <= PRESENTER_MAX ? data : '') : data.slice(0, 2000)) : ''); } catch { return; }
    if (m?.t === 'all' || m?.t === 'to') return this.fromPresenter(m);
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
  webSocketClose(ws) { try { ws.close(1000, 'bye'); } catch {} this.gone(ws); this.left(); }
  webSocketError(ws) { this.gone(ws); this.left(); }
  gone(ws) { const at = attached(ws); if (at?.cid && !at.out) { at.out = true; this.up(at.cid, { type: '_close' }); } }
  left() { this.ctx.storage.get('relay').then(rel => (rel ? this.report() : this.count())).catch(() => {}); }
  async alarm() {
    for (const s of this.ctx.getWebSockets()) { try { s.close(1001, 'expired'); } catch {} }
    await this.ctx.storage.deleteAll();
  }

  // ---- As a relay ----
  async viewerAtRelay(req, room, i) {
    const rel = await this.asRelay(room, i); if (!rel) return new Response('no such room', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    if (this.ctx.getWebSockets('v').length >= (rel.vote && i === 0 ? FIRST_RELAY : PER_RELAY)) return new Response('full', { status: 503 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    if (rel.vote) await this.voteJoin(server, rel, req.headers.get('X-Vote-Sub')); else await this.relayJoin(server, rel);
    return new Response(null, { status: 101, webSocket: client });
  }
  // This relay's room; with its first viewer, it registers with the room (which must exist) and takes its state.
  async asRelay(room, i) {
    const st = this.ctx.storage; let rel = await st.get('relay');
    if (rel) return rel;
    const r = await post(roomOf(this.env, room), 'relay', { i, room }).catch(() => null);
    if (!r || !r.ok) return null;
    const a = await r.json(); rel = { room, i, doc: a.doc, ...(a.vote && { vote: true, owner: a.owner }) };
    await st.put({ relay: rel, state: a.state || { h: 0, v: 0, f: -1, q: 0 } });
    if (a.vote) { this.kept = { ...(a.kept || {}), ...this.kept }; this.keptAll = true; }
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
    } else if (m?.t === 'all') {
      if (KEEPS.includes(m.keep)) (this.kept ||= {})[m.keep] = { d: m.d, at: m.at };
      const s = JSON.stringify(m.d); for (const ws of this.ctx.getWebSockets('v')) { try { ws.send(s); } catch {} }
    } else if (m?.t === 'to') {
      for (const [cid, d] of Array.isArray(m.l) ? m.l : []) { const s = JSON.stringify(d); for (const ws of this.ctx.getWebSockets('c' + cid)) { try { ws.send(s); } catch {} } }
    } else if (m?.t === 'end') {
      clearTimeout(this.ptrLater); this.ptrLater = null;
      this.toAudience({ t: 'end' });
      for (const s of this.ctx.getWebSockets()) { try { s.close(1000, 'end'); } catch {} }
      await st.deleteAll();
    }
    return Response.json({ ok: true });
  }

  // ---- Votes: as a relay ----
  // A phone in: its id here (cid: this relay's number, so the room knows where to send its answers), whose account
  // (when it has a session), and what every phone has been sent (kept), as if it had been there.
  async voteJoin(ws, rel, sub) {
    const cid = rel.i + '.' + random(6), voter = sub ? await voterOf(this.env, sub, rel.owner) : null;
    this.ctx.acceptWebSocket(ws, ['v', 'c' + cid]); attach(ws, { cid, voter });
    ws.send(JSON.stringify({ type: 'auth', on: !!voter }));
    // (Woken from hibernation, this relay forgot what was kept: asked to the room once — what came since, newer, stays.)
    if (!this.keptAll) { const r = await post(roomOf(this.env, rel.room), 'kept', {}).catch(() => null); if (r?.ok) { this.kept = { ...(await r.json()), ...this.kept }; this.keptAll = true; } }
    this.kept ||= {};
    const now = Date.now();
    for (const k of KEEPS) { const x = this.kept[k]; if (!x) continue; let d = x.d;
      // (A quiz's time left, as it is now: it was sent when the quiz started.)
      if (k === 'poll' && d?.poll && typeof d.poll.left === 'number') d = { ...d, poll: { ...d.poll, left: d.poll.left - (now - (x.at || now)) / 1000 } };
      try { ws.send(JSON.stringify(d)); } catch {} }
    this.up(cid, { type: '_open' });
    await this.keep(); this.report();
  }
  // What a phone says, up to the room — only what a phone says over PeerJS, not too often, and its account's voter.
  async fromPhone(ws, data) {
    const at = attached(ws); if (!at?.cid || typeof data !== 'string' || data.length > PHONE_MAX) return;
    const now = Date.now(), rate = this.rate ||= new Map(), x = rate.get(at.cid) || { t: now, n: 0 };
    if (now - x.t > 10e3) { x.t = now; x.n = 0; }
    if (++x.n > PHONE_RATE) return;
    if (rate.size > 3000) rate.clear(); rate.set(at.cid, x);
    let m; try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m !== 'object' || !['hi', 'vote', 'lang'].includes(m.type)) return;
    delete m.acct; if (at.voter) { m.voter = at.voter; m.acct = true; }
    this.up(at.cid, m);
  }
  // Up to the room in batches: what comes while one is on its way goes in the next (UP_MS before the first).
  up(cid, m) {
    (this.ups ||= []).push([cid, m]);
    if (!this.upRun && !this.upLater) this.upLater = setTimeout(() => this.flushUp(), UP_MS);
  }
  flushUp() {
    clearTimeout(this.upLater); this.upLater = null;
    this.upRun ||= (async () => {
      const rel = this.rel ||= await this.ctx.storage.get('relay');
      while (rel && this.ups?.length) { const l = this.ups; this.ups = []; await post(roomOf(this.env, rel.room), 'up', { l }).catch(() => {}); }
      this.upRun = null;
    })();
    return this.upRun;
  }

  // ---- Votes: as the room ----
  // A batch from a relay, to the presenter as it came; while it isn't connected (it reconnects), kept a while.
  async upAtRoom(a) {
    const l = (Array.isArray(a.l) ? a.l : []).filter(x => Array.isArray(x) && typeof x[0] === 'string');
    const ps = this.ctx.getWebSockets('p');
    if (!ps.length) this.backlog = (this.backlog || []).concat(l).slice(-BACKLOG);
    else { const s = JSON.stringify({ t: 'up', l }); for (const ws of ps) { try { ws.send(s); } catch {} } }
    return Response.json({ ok: true });
  }
  async keptAtRoom() { const m = await this.ctx.storage.get(KEEPS.map(k => 'kept:' + k)), o = {}; for (const [k, v] of m) o[k.slice(5)] = v; return o; }
  // The presenter's: to every phone (and kept for those to come) or to some, each through its relay.
  async fromPresenter(m) {
    const st = this.ctx.storage, meta = await st.get('meta'); if (!meta?.vote || !meta.room) return;
    if (m.t === 'all') {
      const msg = { t: 'all', d: m.d, at: Date.now(), ...(KEEPS.includes(m.keep) && { keep: m.keep }) };
      // (Kept apart, each in its own value: a classroom's styles can be big — a value holds up to 2 MB.)
      if (msg.keep) await st.put('kept:' + msg.keep, { d: m.d, at: msg.at }).catch(() => {});
      await this.toAll(msg);
    } else {
      const by = {};
      for (const x of Array.isArray(m.l) ? m.l : []) { const i = Array.isArray(x) && /^(\d+)\./.exec(String(x[0])); if (i && +i[1] < RELAYS) (by[i[1]] ||= []).push([String(x[0]), x[1]]); }
      for (const [i, l] of Object.entries(by)) this.toRelay(meta.room, +i, { t: 'to', l });
    }
  }
}
// (A phone's id and account travel with its socket: they survive the relay's hibernation.)
const attach = (ws, o) => { try { ws.serializeAttachment(o); } catch { ws.att = o; } };
const attached = ws => { try { return ws.deserializeAttachment?.() ?? ws.att; } catch { return ws.att; } };

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
  const own = relayHeaders(req.headers, null, 0, null);   // (only set here)
  if (new URL(req.url).searchParams.get('token')) return roomOf(env, room).fetch(new Request(req, { headers: own }));
  let r;
  for (let k = 0; k < 3; k++) {
    const i = crypto.getRandomValues(new Uint32Array(1))[0] % RELAYS;
    r = await relayOf(env, room, i).fetch(new Request(req, { headers: relayHeaders(req.headers, room, i, null) }));
    if (r.status !== 503) return r;
  }
  return r;
}
// The headers a relay trusts — which room, which relay, whose account — set only here: the same ones sent from outside
// are dropped first.
export function relayHeaders(from, room, i, sub) {
  const h = new Headers(from); for (const k of ['X-Live-Room', 'X-Live-Relay', 'X-Vote-Sub']) h.delete(k);
  if (room) { h.set('X-Live-Room', room); h.set('X-Live-Relay', String(i)); }
  if (room && sub) h.set('X-Vote-Sub', sub);
  return h;
}

// /api/vote (api.js): a room for a presentation's polls, its code, and the way in.
export async function startVote(env, me, json) {
  if (!env.LIVE) return json({ error: 'not configured' }, 503);
  // (Counted with the shares and the co-editing rooms: Durable Objects' free requests are for everyone.)
  if (!(await takeQuota(env, 'u:' + me.sub))) return json({ error: 'daily limit' }, 429);
  const room = random(12), token = random(24);
  let code = null;
  for (let k = 0; k < 8 && !code; k++) {
    const c = Array.from(crypto.getRandomValues(new Uint8Array(5)), b => CODE_ABC[b % CODE_ABC.length]).join('');
    if ((await post(codeOf(env, c), 'code-set', { room })).ok) code = c;
  }
  await roomOf(env, room).fetch('https://live/init', { method: 'POST', body: JSON.stringify({ token, owner: me.sub, room, vote: true, code }) });
  return json({ room, token, code });
}
export async function voteCode(env, code, json) {
  if (!env.LIVE || !CODE.test(code)) return json({ error: 'not found' }, 404);
  const r = await post(codeOf(env, code), 'code-get', {});
  return json(await r.json(), r.status);
}
// The presenter (?token=) to the room; each phone to relay 0 while it has room (FIRST_RELAY), else to one of the others
// picked at random, with its account (sub) when it has one.
export async function joinVote(req, env, room, sub) {
  if (!env.LIVE || !ROOM.test(room)) return new Response('not found', { status: 404 });
  if (new URL(req.url).searchParams.get('token')) return roomOf(env, room).fetch(new Request(req, { headers: relayHeaders(req.headers, null, 0, null) }));
  let r;
  for (let k = 0; k < 4; k++) {
    const i = k === 0 ? 0 : 1 + crypto.getRandomValues(new Uint32Array(1))[0] % (RELAYS - 1);
    r = await relayOf(env, room, i).fetch(new Request(req, { headers: relayHeaders(req.headers, room, i, sub) }));
    if (r.status !== 503) return r;
  }
  return r;
}
