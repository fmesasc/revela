// Live collaboration rooms (Cloudflare Durable Objects + WebSockets).
//
// One room per shared presentation. It does what the browser of the person
// sharing does without a server (src/features/live/collab.js): keeps the
// document, checks each change against the sender's role (the secret in their
// link), applies it and passes it on; relays presence and chat. The room
// survives the owner closing their tab, and works where browsers can't talk
// to each other directly.
//
//   POST /c            body { deck } (X-Upload-Key if UPLOAD_KEY is set)
//                      → { room, tokens: { view, comment, edit }, owner }
//   GET  /c/:room      WebSocket; first message { t: 'hello', token, name }
//
// Free-tier friendly: WebSocket hibernation (no cost while nobody types), the
// document is written to R2 at most every few seconds (not on each change),
// and long messages travel in parts (Cloudflare's limit is 1 MiB).

import { applyOps, allowed, ROLES, pack, unpacker } from '../../src/features/live/collabsync.js';

const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#e03131', '#5c7cfa'];
const SAVE_DELAY = 5000;
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const key = room => `rooms/${room}.json`;

// ---- Worker side: create a room, or connect to one ------------------------------
export async function handleCollab(req, env, url, json) {
  if (!env.ROOMS) return json({ error: 'collaboration not configured' }, 501);
  if (req.method === 'POST' && url.pathname === '/c') {
    if (env.UPLOAD_KEY && req.headers.get('X-Upload-Key') !== env.UPLOAD_KEY) return json({ error: 'forbidden' }, 403);
    const max = (+env.MAX_MB || 30) * 1024 * 1024;
    const body = await req.text();
    if (body.length > max) return json({ error: 'too large' }, 413);
    let deck; try { deck = JSON.parse(body).deck; } catch { return json({ error: 'bad json' }, 400); }
    if (!deck || !Array.isArray(deck.slides)) return json({ error: 'not a presentation' }, 400);
    const room = random(12);
    const meta = { tokens: Object.fromEntries(ROLES.map(r => [r, random(16)])), owner: random(16), created: Date.now() };
    await env.SHARES.put(key(room), JSON.stringify({ meta, deck, chat: [] }));
    return json({ room, tokens: meta.tokens, owner: meta.owner });
  }
  const m = url.pathname.match(/^\/c\/([\w-]{8,40})$/);
  if (m && req.headers.get('Upgrade') === 'websocket') return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
  return json({ error: 'not found' }, 404);
}

// ---- The room -----------------------------------------------------------------------
export class CollabRoom {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.doc = null; this.dirty = false; this.parts = new Map(); }

  async load(room) {
    if (this.doc) return this.doc;
    const obj = await this.env.SHARES.get(key(room));
    this.doc = obj ? JSON.parse(await obj.text()) : null;
    if (this.doc) this.room = room;
    return this.doc;
  }
  async save() {
    if (!this.doc || !this.dirty) return;
    this.dirty = false;
    await this.env.SHARES.put(key(this.room), JSON.stringify(this.doc));
  }
  changed() { this.dirty = true; this.ctx.storage.getAlarm().then(a => { if (!a) this.ctx.storage.setAlarm(Date.now() + SAVE_DELAY); }); }
  async alarm() { await this.save(); }

  async fetch(req) {
    const room = new URL(req.url).pathname.split('/').pop();
    if (!(await this.load(room))) return new Response('no such room', { status: 404 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ room, id: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, msg) { for (const s of pack(msg)) { try { ws.send(s); } catch {} } }
  peers() { return this.ctx.getWebSockets().map(ws => ws.deserializeAttachment()).filter(a => a?.id); }
  toAll(msg, exceptId) { for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a?.id && a.id !== exceptId) this.send(ws, msg); } }
  peerList() { return this.peers().map(({ id, name, color, role, owner, slide, sel }) => ({ id, name, color, role, owner, slide, sel })); }

  async webSocketMessage(ws, data) {
    const a = ws.deserializeAttachment() || {};
    if (!this.unpack) this.unpack = new Map();
    let up = this.unpack.get(ws); if (!up) { up = unpacker(); this.unpack.set(ws, up); }
    const msg = up(typeof data === 'string' ? data : new TextDecoder().decode(data)); if (!msg) return;
    const doc = await this.load(a.room); if (!doc) { ws.close(1011, 'gone'); return; }
    if (!a.id) {                                             // first message: who, with which link
      const role = msg.t === 'hello' && (msg.token === doc.meta.owner ? 'edit' : ROLES.find(r => doc.meta.tokens[r] === msg.token));
      if (!role) { this.send(ws, { t: 'denied' }); ws.close(1008, 'denied'); return; }
      const n = this.peers().length;
      Object.assign(a, { id: 'p' + random(4), name: String(msg.name || '').slice(0, 40) || 'Invitado', color: COLORS[n % COLORS.length], role, owner: msg.token === doc.meta.owner, slide: null, sel: null });
      ws.serializeAttachment(a);
      this.send(ws, { t: 'welcome', you: a.id, role, owner: a.owner, color: a.color, deck: doc.deck, peers: this.peerList(), chat: doc.chat.slice(-100) });
      this.toAll({ t: 'peers', peers: this.peerList() }, a.id);
      return;
    }
    if (msg.t === 'ops' && Array.isArray(msg.ops)) {
      const ok = msg.ops.filter(op => op && Array.isArray(op.p) && allowed(op, a.role));
      if (!ok.length) return;
      applyOps(doc.deck, ok); this.changed();
      this.toAll({ t: 'ops', ops: ok, from: a.id }, a.id);
    } else if (msg.t === 'presence') {
      a.slide = msg.slide ?? null; a.sel = msg.sel ?? null; ws.serializeAttachment(a);
      this.toAll({ t: 'presence', id: a.id, name: a.name, color: a.color, slide: a.slide, sel: a.sel }, a.id);
    } else if (msg.t === 'chat' && msg.text) {
      const m = { t: 'chat', id: a.id, name: a.name, color: a.color, text: String(msg.text).slice(0, 2000), at: Date.now() };
      doc.chat.push(m); doc.chat = doc.chat.slice(-200); this.changed();
      this.toAll(m, a.id);
    } else if (msg.t === 'setRole' && a.owner && ROLES.includes(msg.role)) {
      for (const s of this.ctx.getWebSockets()) {
        const b = s.deserializeAttachment();
        if (b?.id === msg.id && !b.owner) { b.role = msg.role; s.serializeAttachment(b); this.send(s, { t: 'role', role: msg.role }); }
      }
      this.toAll({ t: 'peers', peers: this.peerList() });
    } else if (msg.t === 'end' && a.owner) {                 // the owner ends it: everyone out, document deleted
      this.toAll({ t: 'end' }, a.id);
      for (const s of this.ctx.getWebSockets()) { try { s.close(1000, 'end'); } catch {} }
      await this.env.SHARES.delete(key(a.room)); this.doc = null; this.dirty = false;
    }
  }
  async webSocketClose(ws) {
    const a = ws.deserializeAttachment();
    this.unpack?.delete(ws);
    if (a?.id) this.toAll({ t: 'peers', peers: this.peerList().filter(p => p.id !== a.id) }, a.id);
    if (!this.ctx.getWebSockets().some(s => s !== ws && s.deserializeAttachment()?.id)) await this.save();
  }
  async webSocketError(ws) { await this.webSocketClose(ws); }
}
