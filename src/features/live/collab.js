// Real-time co-editing, chat and permissions (view / comment / edit).
//
// Two ways, the same messages: a room on Revela's server (io/cloud/collabserver.js: the session doesn't depend on
// the tab of whoever shared it), or directly between browsers — the person who shares ("host") keeps the document
// and the others connect to them over WebRTC (PeerJS's public broker only introduces them; the data goes directly,
// encrypted).
// Each shared link carries a secret for one role; the host checks every change
// against the sender's role, applies it and passes it on to the rest.
//
// The transport is injected (PeerJS in the app, a fake in the tests):
//   host:  listen(onConn)              conn: { send(msg), onData(fn), onClose(fn), close() }
//   guest: connect() → Promise<conn>

import { state, subscribe, snapshot, applyRemote, adoptDeck, setPersist, currentSlide } from '../../core/store.js';
import { diff, applyOps, allowed, ROLES } from './collabsync.js';
import { cleanValue } from '../document/sanitize.js';
import { PEERJS, loadScript } from '../../core/vendor.js';
import { peerOptions } from '../../core/ice.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => ALPHABET[x % ALPHABET.length]).join('');
export const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#e03131', '#5c7cfa'];

// The live session (null when not collaborating).
export let session = null;
const listeners = new Set();
export const onCollab = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what, data) => listeners.forEach(fn => { try { fn(what, data); } catch {} });

// ---- Shared by host and guest -------------------------------------------------
function watchLocal(sendOps) {
  let last = snapshot(state.deck), lastPresence = '';
  const check = () => {
    if (!session) return;
    const ops = diff(last, state.deck);
    if (ops.length) { last = snapshot(state.deck); sendOps(ops); }
    const me = presenceOf();
    const key = JSON.stringify(me);
    if (key !== lastPresence) { lastPresence = key; session.sendPresence(me); }
  };
  const unsub = subscribe(check);
  const timer = setInterval(check, 800);                    // text being typed (not committed yet)
  return { applyToLast: ops => applyOps(last, ops), stop: () => { unsub(); clearInterval(timer); } };
}
const presenceOf = () => ({ slide: currentSlide()?.id || null, sel: state.ui.selection || null });
// mine: this person's own changes already sent but not yet confirmed (ack) by whoever keeps the document. Anything
// received before that confirmation was applied there BEFORE them, so they go back on top — the order everyone else
// has. (Without it, two people changing the same thing at once could each be left seeing a different value.)
function applyIncoming(ops, watcher, mine = []) {
  watcher.applyToLast(ops); if (mine.length) watcher.applyToLast(mine);
  for (const op of ops) if (op && 'v' in op) op.v = cleanValue(op.v, String(op.p?.at(-1) ?? ''));   // (a co-editor's changes can't run code)
  applyRemote(root => { applyOps(root, ops); if (mine.length) applyOps(root, mine); });
}

// ---- Host ------------------------------------------------------------------
export function hostCollab({ name, listen, code = rand(6) }) {
  const tokens = Object.fromEntries(ROLES.map(r => [r, rand(12)]));
  const roleOf = tok => ROLES.find(r => tokens[r] === tok) || null;
  const guests = new Map();                                 // conn id → { conn, name, color, role, slide, sel }
  let n = 0;
  const me = { id: 'host', name, color: COLORS[0], role: 'edit' };
  const others = id => [...guests.entries()].filter(([gid]) => gid !== id);
  const toAll = (msg, except) => others(except).forEach(([, g]) => g.conn.send(msg));
  const peersList = () => [{ ...me, ...presenceOf() }, ...[...guests.entries()].map(([id, g]) => ({ id, name: g.name, color: g.color, role: g.role, slide: g.slide, sel: g.sel }))];
  const chat = [];
  const watcher = watchLocal(ops => toAll({ t: 'ops', ops, from: 'host' }));
  session = {
    host: true, code, tokens, me, role: 'edit', chat,
    peers: () => peersList().filter(p => p.id !== 'host'),
    sendPresence: p => { Object.assign(me, p); toAll({ t: 'presence', id: 'host', name: me.name, color: me.color, ...p }); },
    sendChat: text => { const m = { t: 'chat', id: 'host', name: me.name, color: me.color, text: String(text).slice(0, 2000), at: Date.now() }; chat.push(m); toAll(m); emit('chat', m); },
    setRole: (id, role) => { const g = guests.get(id); if (!g || !ROLES.includes(role)) return; g.role = role; g.conn.send({ t: 'role', role }); toAll({ t: 'peers', peers: peersList() }); emit('peers'); },
    stop: () => { toAll({ t: 'end' }); guests.forEach(g => g.conn.close?.()); watcher.stop(); stopListening?.(); session = null; emit('end'); },
  };
  const stopListening = listen(conn => {
    const id = 'g' + (++n);
    conn.onData(msg => {
      if (!msg || typeof msg !== 'object') return;
      const g = guests.get(id);
      if (!g) {                                              // first message: who, and with which link
        const role = msg.t === 'hello' && roleOf(msg.token);
        if (!role) { conn.send({ t: 'denied' }); conn.close?.(); return; }
        const guest = { conn, name: String(msg.name || '').slice(0, 40) || 'Invitado', color: COLORS[(n) % COLORS.length], role, slide: null, sel: null };
        guests.set(id, guest);
        conn.send({ t: 'welcome', you: id, role, color: guest.color, deck: state.deck, peers: peersList(), chat: chat.slice(-100), acks: 1 });
        toAll({ t: 'peers', peers: peersList() }, id); emit('peers');
        return;
      }
      if (msg.t === 'ops' && Array.isArray(msg.ops)) {
        const ok = msg.ops.filter(op => op && Array.isArray(op.p) && allowed(op, g.role));
        if (ok.length) { applyIncoming(ok, watcher); toAll({ t: 'ops', ops: ok, from: id }, id); }
        conn.send({ t: 'ack', n: Number.isSafeInteger(msg.n) ? msg.n : null });   // (each «ops» confirmed, in order: see applyIncoming)
      } else if (msg.t === 'presence') {
        g.slide = msg.slide ?? null; g.sel = msg.sel ?? null;
        toAll({ t: 'presence', id, name: g.name, color: g.color, slide: g.slide, sel: g.sel }, id); emit('peers');
      } else if (msg.t === 'chat' && msg.text) {
        const m = { t: 'chat', id, name: g.name, color: g.color, text: String(msg.text).slice(0, 2000), at: Date.now() };
        chat.push(m); toAll(m); emit('chat', m);
      }
    });
    conn.onClose(() => { if (guests.delete(id)) { toAll({ t: 'peers', peers: peersList() }); emit('peers'); } });
  });
  emit('start');
  return session;
}

// ---- Guest (also everyone in a server room) --------------------------------
// room: { code, tokens, server } when this person created the room on the
// server: they own it (links, permissions, end) and keep their own document.
export async function joinCollab({ name, token, connect, room = null }) {
  const conn = await connect();
  return new Promise((resolve, reject) => {
    let watcher = null, peers = [], acks = false;
    // Own «ops» sent and not yet confirmed (with acks), numbered; one never confirmed (a message lost) stops counting
    // after a while, so it can't keep covering what others do.
    let pending = [], seq = 0;
    const unconfirmed = () => { const old = Date.now() - 15000; pending = pending.filter(x => x.at > old); return pending.flatMap(x => x.ops); };
    const chat = [];
    const done = () => { watcher?.stop(); session = null; };
    conn.onData(msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'denied') { conn.close?.(); reject(new Error('denied')); return; }
      if (msg.t === 'welcome') {
        const owner = !!(room && msg.owner);
        if (!owner) {
          setPersist(false);                                 // this copy is someone else's: don't overwrite our own
          state.ui.lock = msg.role === 'edit' ? null : msg.role;
          adoptDeck(msg.deck);
        }
        peers = msg.peers || []; chat.push(...(msg.chat || []));
        session = {
          host: owner, server: room?.server || null, code: room?.code, tokens: room?.tokens,
          role: msg.role, me: { id: msg.you, name, color: msg.color }, chat,
          peers: () => peers.filter(p => p.id !== msg.you),
          sendPresence: p => conn.send({ t: 'presence', ...p }),
          sendChat: text => conn.send({ t: 'chat', text }),
          setRole: (id, role) => conn.send({ t: 'setRole', id, role }),
          stop: () => { if (owner) conn.send({ t: 'end' }); conn.close?.(); done(); emit(owner ? 'end' : 'left'); },
        };
        acks = msg.acks === 1;                               // (a server or host from before acks: as before)
        watcher = watchLocal(ops => { const ok = ops.filter(op => allowed(op, session.role)); if (!ok.length) return; const n = ++seq; if (acks) pending.push({ n, ops: ok, at: Date.now() }); conn.send({ t: 'ops', ops: ok, n }); });
        emit('start'); resolve(session);
      } else if (!session) return;
      else if (msg.t === 'ops') applyIncoming(msg.ops, watcher, unconfirmed());
      else if (msg.t === 'ack') pending = pending.filter(x => x.n > msg.n);
      else if (msg.t === 'peers') { peers = msg.peers; emit('peers'); }
      else if (msg.t === 'presence') {
        const p = peers.find(x => x.id === msg.id);
        if (p) Object.assign(p, { slide: msg.slide, sel: msg.sel }); else peers.push({ id: msg.id, name: msg.name, color: msg.color, slide: msg.slide, sel: msg.sel });
        emit('peers');
      } else if (msg.t === 'chat') { chat.push(msg); emit('chat', msg); }
      else if (msg.t === 'role') { session.role = msg.role; state.ui.lock = msg.role === 'edit' ? null : msg.role; emit('role'); applyRemote(() => {}); }
      else if (msg.t === 'end') { done(); emit('end'); }
    });
    conn.onClose(() => { if (session) { done(); emit('end'); } });
    conn.send({ t: 'hello', token, name });
  });
}

// ---- PeerJS transport -----------------------------------------------------------
const wrap = c => ({ send: m => { try { if (c.open) c.send(m); } catch {} }, onData: f => c.on('data', f), onClose: f => { c.on('close', f); c.on('error', f); }, close: () => c.close() });
export async function peerListen(code, onReady) {
  await loadScript(PEERJS, 'Peer');
  const peer = new window.Peer('revela-c-' + code, await peerOptions());
  await new Promise((res, rej) => { peer.on('open', res); peer.on('error', rej); });
  onReady?.();
  return onConn => { peer.on('connection', c => c.on('open', () => onConn(wrap(c)))); return () => peer.destroy(); };
}
export async function peerConnect(code) {
  await loadScript(PEERJS, 'Peer');
  const peer = new window.Peer(await peerOptions());
  await new Promise((res, rej) => { peer.on('open', res); peer.on('error', rej); });
  const c = peer.connect('revela-c-' + code, { reliable: true });
  await new Promise((res, rej) => { c.on('open', res); c.on('error', rej); peer.on('error', rej); setTimeout(() => rej(new Error('timeout')), 20000); });
  return wrap(c);
}
export const newCode = () => rand(6);
// server: a collaboration server's address (room links), none for direct sessions.
export function collabLink(code, token, server = null, base = location.href) {
  const u = new URL(base); u.search = ''; u.hash = '';
  u.searchParams.set('collab', code); u.searchParams.set('k', token);
  if (server) u.searchParams.set('srv', server);
  return u.toString();
}
