// Phone companion (host side, runs in the editor/presenter).
//
// The site is static, so pairing uses WebRTC through PeerJS's public broker: the
// presenter hosts a peer whose id embeds a short CODE, the phone (remote.html)
// connects to that id, and a data channel carries slide state one way and
// commands (next/prev, touchpad, blackout) the other. No backend of our own.
//
// Pairing: the QR/link carries a secret KEY besides the code. The phone's first
// message is { type: 'hello', key }; with the right key it is the controller at
// once; with the code alone (typed by hand) the presenter has to allow it. One
// controller at a time; others are told "busy". Until a connection is the
// controller nothing it sends is obeyed, and the controller's commands are
// rate-limited. Disconnecting it changes the key, so the old link stops working.
// (Audience phones talk to a different peer, "revela-vote-CODE", hosted by the
// presentation itself — io/runtime/scripts.js — which only takes votes.)
//
// The command logic (applyCommand) and the state it sends (presentationState)
// are plain functions so they can be unit‑tested without a live connection.

import { state, subscribe } from '../../core/store.js';
import * as slides from '../document/slides.js';
import { session } from '../../core/session.js';
import { PEERJS, loadScript } from '../../core/vendor.js';
import { peerOptions } from '../../core/ice.js';
import * as pad from './remotepad.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

let resume = null, peer = null, conn = null, code = null, key = null, statusCb = null, unsub = null, thumbFn = null, pending = null;

const pick = n => Array.from(crypto.getRandomValues(new Uint32Array(n)), v => CODE_ALPHABET[v % CODE_ALPHABET.length]).join('');
const genCode = () => pick(5);
const genKey = () => pick(16);

export function remoteLink() {
  const base = location.href.replace(/[^/]*([?#].*)?$/, '');
  return `${base}remote.html?code=${code || ''}${key ? '&k=' + key : ''}`;
}
// (The last one said, to say it again to a dialog opened later.)
let now = { st: 'off', extra: undefined };
const status = (st, extra) => { now = { st, extra }; statusCb?.({ state: st, code, link: remoteLink(), ...extra }); };
// Whether the phone remote is on (it stays on with its dialog closed, until it is switched off).
export const hostRunning = () => !!(peer && !peer.destroyed);

// opts.Peer: the PeerJS class (tests pass a stand-in); opts.thumb(slide) →
// Promise<data URL>: a small picture of a slide for the phone's touchpad.
// Already hosting (the dialog closed and opened again): the same code and phone, shown again.
export async function startHost(onStatus, opts = {}) {
  statusCb = onStatus;
  thumbFn = opts.thumb || null;
  if (peer && !peer.destroyed) { status(now.st, now.extra); return code; }
  onStatus?.({ state: 'loading' });
  const P = opts.Peer || await loadScript(PEERJS, 'Peer');
  key = genKey();
  hostWithFreshCode(P, 0, opts.Peer ? {} : await peerOptions());
  return code;
}

function hostWithFreshCode(P, attempt, po = {}) {
  code = genCode();
  peer = new P('revela-' + code, po);
  peer.on('open', () => status('waiting'));
  peer.on('connection', c => {
    const guard = { limit: { move: createLimiter(90, 90), act: createLimiter(12, 6) } };
    c.on('data', d => onData(c, d, guard));
    c.on('close', () => {
      if (pending?.c === c) { pending = null; status(conn ? 'connected' : 'waiting'); }
      if (conn === c) { conn = null; clearDrawing(); status('waiting'); }
    });
  });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && attempt < 5) { peer.destroy(); hostWithFreshCode(P, attempt + 1, po); return; }
    status('error', { error: e.type || String(e) });
  });
  // Push fresh state to the phone on any document/slide change.
  unsub?.();
  unsub = subscribe(() => pushState());
  window.removeEventListener('revela:present-slide', onSlide);
  window.addEventListener('revela:present-slide', onSlide);
}

const say = (c, m) => { try { if (c.open) c.send(m); } catch {} };
const isController = c => !!c && c === conn;

// Everything a connection sends. Exported for the tests (with a stand-in connection).
export function onData(c, d, guard) {
  if (!d || typeof d !== 'object') return;
  if (!isController(c)) {
    if (d.type !== 'hello' || guard.hello) return;        // (nothing else counts before pairing; one hello each)
    guard.hello = true;
    // The phone in control coming back (its token, known only to it): it takes its place again at once
    // (its old connection may not have noticed it dropped yet).
    if (typeof d.resume === 'string' && resume && d.resume === resume) { const old = conn; if (old && old !== c) { conn = null; try { old.close(); } catch {} } return admit(c); }
    if (conn && conn.open) { say(c, { kind: 'busy' }); setTimeout(() => c.close(), 300); return; }
    if (typeof d.key === 'string' && key && d.key === key) return admit(c);
    if (pending) { say(c, { kind: 'busy' }); setTimeout(() => c.close(), 300); return; }
    pending = { c };
    say(c, { kind: 'pending' });
    status('request', { allow: () => decide(c, true), deny: () => decide(c, false) });
    return;
  }
  const kind = MOVES.has(d.type) || (d.type === 'drag' && d.phase === 'move') ? 'move' : 'act';
  if (!guard.limit[kind]()) return;                       // too many: dropped
  const out = applyCommand(d);
  if (out?.blocked) say(c, { kind: 'note', what: 'blocked' });
  if (!MOVES.has(d.type) && d.type !== 'drag') pushState();
}
function admit(c) {
  pending = null; conn = c;
  resume ||= genKey();
  say(c, { kind: 'welcome', resume });                   // (if its connection drops, it comes back with this without asking)
  status('connected');
  pushState(true);
}
function decide(c, ok) {
  if (pending?.c !== c) return;
  pending = null;
  if (ok && !(conn && conn.open)) return admit(c);
  say(c, { kind: 'denied' }); setTimeout(() => c.close(), 300);
  status(conn ? 'connected' : 'waiting');
}
// The presenter cuts the phone off; its link stops working (new key → new QR).
export function disconnectRemote() {
  const c = conn; conn = null;
  if (c) { say(c, { kind: 'revoked' }); setTimeout(() => { try { c.close(); } catch {} }, 300); }
  if (pending) { say(pending.c, { kind: 'denied' }); pending = null; }
  key = genKey(); resume = null;
  clearDrawing();
  status('waiting');
}
export const remoteConnected = () => !!(conn && conn.open);

export function stopHost() {
  try { conn?.close(); } catch {}
  try { peer?.destroy(); } catch {}
  clearDrawing();
  unsub?.(); window.removeEventListener('revela:present-slide', onSlide);
  peer = conn = code = key = pending = resume = null;
  now = { st: 'off', extra: undefined };
  statusCb?.({ state: 'off' });
}

// A token bucket: up to `burst` at once, refilled at `rate` per second. → () → allowed?
export function createLimiter(burst, rate, now = () => performance.now()) {
  let tokens = burst, at = now();
  return () => {
    const n = now(); tokens = Math.min(burst, tokens + (n - at) / 1000 * rate); at = n;
    if (tokens < 1) return false;
    tokens -= 1; return true;
  };
}

// ---- State to the phone ------------------------------------------------------
let thumbTimer = 0;
const thumbs = new WeakMap();                            // slide → { json, src }
function onSlide() { const d = presentDoc(); if (d) pad.clearAll(d); pushState(); }
export function pushState(withThumb = true) {
  if (!(conn && conn.open)) return;
  const st = presentationState();
  say(conn, st);
  if (withThumb && thumbFn) { clearTimeout(thumbTimer); thumbTimer = setTimeout(() => sendThumb(st), 120); }
}
async function sendThumb(st) {
  const s = state.deck.slides.filter(x => !x.hidden)[st.index];
  if (!s || !(conn && conn.open)) return;
  const json = JSON.stringify(s);
  let t = thumbs.get(s);
  if (!t || t.json !== json) {
    try { t = { json, src: await thumbFn(s) }; thumbs.set(s, t); } catch { return; }
  }
  if (t.sent === conn && t.at === st.index) return;
  say(conn, { kind: 'thumb', index: st.index, src: t.src }); t.sent = conn; t.at = st.index;
}

// ---- Pure logic (testable) -------------------------------------------------
export function presentationState() {
  const visible = state.deck.slides.filter(s => !s.hidden);
  const ap = session.present;
  let cur;
  if (ap && ap.frame.contentWindow.Reveal) cur = visible[ap.frame.contentWindow.Reveal.getSlidePastCount()];   // flat position (vertical stacks too)
  else cur = state.deck.slides[state.ui.slideIndex];
  const i = visible.indexOf(cur);
  return {
    kind: 'state',
    presenting: !!ap,
    index: i < 0 ? 0 : i,
    total: visible.length,
    title: state.deck.name || 'Presentación',
    notes: cur?.notes || '',
    nextNotes: visible[i + 1]?.notes || '',
    aspect: state.deck.size ? state.deck.size.w / state.deck.size.h : 16 / 9,
    zoom: presentDoc() ? +pad.zoomLevel(presentDoc()).toFixed(2) : 1,
  };
}

// Commands that come many per second (finger moves).
const MOVES = new Set(['pointer', 'wheel', 'zoom']);
const num = (v, a, b, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d);

// One command from the phone. → { blocked } when it hit something the browser
// won't let us reach (a cross-origin web page), else undefined.
export function applyCommand(cmd) {
  const doc = presentDoc();
  const x = num(cmd?.x, -0.05, 1.05, 0.5), y = num(cmd?.y, -0.05, 1.05, 0.5);
  switch (cmd && cmd.type) {
    case 'next': nav(+1); break;
    case 'prev': nav(-1); break;
    case 'goto': if (Number.isInteger(cmd.index)) nav(0, cmd.index); break;
    case 'black': if (doc) pad.black(doc, !!cmd.on); break;
    case 'pointer': if (doc) pad.point(doc, pad.TOOLS.includes(cmd.tool) ? cmd.tool : 'laser', x, y, num(cmd.r, 0.03, 0.5, 0.12)); break;
    case 'laseroff': if (doc) pad.pointOff(doc); break;
    case 'clear': if (doc) pad.clearAll(doc); break;
    case 'tap': if (doc) return { blocked: pad.tap(doc, x, y).blocked };
      break;
    case 'drag': if (doc && ['start', 'move', 'end'].includes(cmd.phase)) return { blocked: pad.drag(doc, cmd.phase, x, y).blocked };
      break;
    case 'wheel': if (doc) { const r = pad.wheel(doc, x, y, num(cmd.dx, -2, 2), num(cmd.dy, -2, 2)); return { blocked: r.blocked && !r.scrolled }; }
      break;
    case 'zoom': if (doc) pad.zoomBy(doc, x, y, num(cmd.factor, 0.5, 2, 1)); break;
    case 'zoomreset': if (doc) pad.zoomReset(doc); break;
  }
}

function nav(delta, absolute) {
  const ap = session.present;
  if (ap && ap.frame.contentWindow.Reveal) {
    const Rv = ap.frame.contentWindow.Reveal;
    if (absolute != null) { const el = Rv.getSlides()[absolute]; if (el) { const ix = Rv.getIndices(el); Rv.slide(ix.h, ix.v); } }
    else delta > 0 ? Rv.next() : Rv.prev();
  } else {
    const n = state.deck.slides.length;
    const to = absolute != null ? absolute : Math.max(0, Math.min(n - 1, state.ui.slideIndex + delta));
    slides.goToSlide(to);
  }
}

// The presentation on screen (an iframe of this same origin), if any.
function presentDoc() { try { return session.present?.frame.contentDocument || null; } catch { return null; } }
function clearDrawing() { const d = presentDoc(); if (d) { pad.clearAll(d); pad.black(d, false); } }
