// Presentations in Revela's cloud (official edition and desktop app; the server
// is server/cloudflare/docs.js): the list, opening and creating them, keeping
// the open one in step with the server both ways, sharing and statistics.
//
// Sync: every change made here is sent as small operations (the same ones as
// live collaboration, features/live/collabsync.js) a moment after it happens;
// what others changed arrives every few seconds. Operations address things by
// id, so two people editing different objects never step on each other; the
// server checks each one against the sender's role. Pushes and pulls run one
// after another.
//
// Read-only beyond the plan: when its owner has more presentations than their plan
// allows (after leaving Pro), the server keeps the older ones read-only (readOnly).
// Then nothing is sent: what is changed here stays here (status 'readonly') and can
// be kept as a copy (keepCopy) or exported; it's checked again when the account changes.

import { api, hasAccounts } from './account.js';
import { OFFICIAL_SITE } from '../../core/config.js';
import { state, subscribe, snapshot, applyRemote, adoptDeck, replaceDeck, setPersist, mutate } from '../../core/store.js';
import { diff, applyOps } from '../../features/live/collabsync.js';
import { cleanValue } from '../../features/document/sanitize.js';

export const cloudAvailable = hasAccounts;
export const listDocs = () => api('docs');
export const createDoc = deck => api('docs', { deck });
export const docLink = id => `${OFFICIAL_SITE}/app/?doc=${encodeURIComponent(id)}`;
export const docIdFrom = (search = location.search) => { const id = new URLSearchParams(search).get('doc'); return id && /^[\w-]{16,40}$/.test(id) ? id : null; };
const path = (id, op = '') => `docs/${encodeURIComponent(id)}${op ? '/' + op : ''}`;
export const shareDoc = (id, sharing) => api(path(id, 'share'), sharing);
export const deleteDoc = id => api(path(id, 'delete'), {});
export const docStats = id => api(path(id, 'stats'));
export const docVersions = id => api(path(id, 'versions'));
export const docVersion = (id, at) => api(path(id, 'version') + '?at=' + encodeURIComponent(at));

// ---- The open cloud document ------------------------------------------------------------
let cur = null;                  // { id, role, rev, base, sharing, owner, readOnly: { limit } | null, stop }
const listeners = new Set();
export const onCloud = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what, data) => listeners.forEach(fn => { try { fn(what, data); } catch {} });
export const cloudDoc = () => (cur ? { id: cur.id, role: cur.role, sharing: cur.sharing, owner: cur.owner, status: cur.status, readOnly: cur.readOnly } : null);
export const setSharing = sharing => { if (cur) { cur.sharing = sharing; emit('sharing', sharing); } };
// A version from the cloud becomes the current document (and is sent like any change).
export const restoreVersion = deck => replaceDeck(deck);
const setStatus = s => { if (cur && cur.status !== s) { cur.status = s; emit('status', s); } };

// Values from others can't run code (as in live collaboration).
const clean = ops => ops.map(op => (op && 'v' in op ? { ...op, v: cleanValue(op.v, String(op.p?.at(-1) ?? '')) } : op));

// Open one (replacing the document in the editor), with the role the server gives.
// io: the transport (the tests pass a fake); pollMs: how often to look for others' changes.
export async function openDoc(id, { io = api, pollMs = 5000, debounceMs = 1200 } = {}) {
  const r = await io(path(id));
  closeDoc();
  adoptDeck(r.deck);
  state.ui.lock = r.role === 'view' ? 'view' : r.role === 'comment' ? 'comment' : null;
  setPersist(r.role === 'owner');                        // (someone else's: this browser keeps no copy)
  cur = { id, role: r.role, rev: r.rev, base: snapshot(state.deck), sharing: r.sharing || null, owner: r.owner || null, readOnly: r.readOnly ? { limit: r.limit } : null, status: r.readOnly ? 'readonly' : 'saved', io };
  startSync(pollMs, debounceMs);
  emit('open', cloudDoc());
  return cloudDoc();
}
// Put the current presentation in the cloud and keep it in step from now on.
export async function saveToCloud({ io = api, pollMs = 5000, debounceMs = 1200 } = {}) {
  const deck = snapshot(state.deck), r = await io('docs', { deck });
  closeDoc();
  cur = { id: r.id, role: 'owner', rev: r.rev, base: deck, sharing: { link: 'none', people: {} }, owner: null, status: 'saved', io };
  startSync(pollMs, debounceMs);
  emit('open', cloudDoc());
  return cloudDoc();
}
export function closeDoc() {
  if (!cur) return;
  cur.stop?.(); cur = null; state.ui.lock = null; setPersist(true); emit('close');
}
// Read-only (beyond the plan): keep what's in the editor as a presentation of this browser, apart from the cloud's.
export function keepCopy() {
  if (!cur) return;
  closeDoc(); mutate(() => {});                          // (saved here from now on, like any local presentation)
}
// Still read-only? (After the plan changed or some were deleted.) If not, what was changed here is sent.
export async function recheckReadOnly() {
  const me = cur; if (!me?.readOnly) return false;
  let r; try { r = await me.io(path(me.id)); } catch { return false; }
  if (cur !== me || r.readOnly) return false;
  me.readOnly = null; setStatus(diff(me.base, state.deck).length ? 'pending' : 'saved'); emit('readonly', null);
  await me.flush?.(); return true;
}

let chain = Promise.resolve();
const queue = fn => (chain = chain.then(fn, fn));
function startSync(pollMs, debounceMs) {
  const me = cur; let timer = null;
  const schedule = () => { if (cur !== me || me.role === 'view' || me.readOnly) return; clearTimeout(timer); timer = setTimeout(() => queue(() => push(me)), debounceMs); if (diff(me.base, state.deck).length) setStatus('pending'); };
  const unsub = subscribe(schedule);
  const poll = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') queue(() => pull(me)); }, pollMs);
  const stats = me.role === 'owner' ? null : watchViews(me);
  me.stop = () => { unsub(); clearInterval(poll); clearTimeout(timer); stats?.(); };
  me.flush = () => { clearTimeout(timer); return queue(() => push(me)); };
}
export const flushCloud = () => cur?.flush?.() || Promise.resolve();

// Others' changes since the last revision seen.
async function pull(me) {
  if (cur !== me) return;
  let r; try { r = await me.io(`${path(me.id, 'since')}?rev=${me.rev}`); } catch (e) { return fail(me, e); }
  if (cur !== me || r.rev === me.rev) return;
  if (r.ops) {
    const ops = clean(r.ops); applyOps(me.base, ops); applyRemote(root => applyOps(root, ops));
  } else if (r.deck) {                                   // too far behind: the whole document, with what's pending here on top
    const local = diff(me.base, state.deck), next = snapshot(r.deck);
    applyOps(next, local); me.base = snapshot(r.deck); adoptDeck(next, { sameDocument: true });
  }
  me.rev = r.rev; emit('pulled');
}
// This browser's changes.
async function push(me) {
  if (cur !== me || me.role === 'view' || me.readOnly) return;
  await pull(me);
  const ops = diff(me.base, state.deck);
  if (!ops.length) { setStatus('saved'); return; }
  setStatus('saving');
  let r; try { r = await me.io(path(me.id, 'ops'), { ops }); } catch (e) { return fail(me, e); }
  if (cur !== me) return;
  applyOps(me.base, ops);
  if (r.rev === me.rev + 1) me.rev = r.rev;              // (else others changed it in between: the next pull brings both)
  setStatus(diff(me.base, state.deck).length ? 'pending' : 'saved');
}
function fail(me, e) {
  if (cur !== me) return;
  if (e.status === 402 && e.data?.error === 'read only') { me.readOnly = { limit: e.data.limit }; setStatus('readonly'); emit('readonly', me.readOnly); return; }   // (kept here, not sent)
  setStatus(e.status === 403 ? 'forbidden' : e.status === 413 ? 'too-large' : e.status === 404 ? 'gone' : 'offline');
}

// Statistics for the owner: which slide someone else is on and for how long
// (a random id of this browser, nothing else). In the editor and while presenting.
const VISITOR = 'revela.visitor';
const visitorId = () => { try { let v = localStorage.getItem(VISITOR); if (!v) { v = 'v' + crypto.randomUUID().replace(/-/g, '').slice(0, 20); localStorage.setItem(VISITOR, v); } return v; } catch { return 'v' + Math.random().toString(36).slice(2, 14); } };
function watchViews(me) {
  const visitor = visitorId(); let slide = null, since = Date.now();
  const send = (b) => me.io(path(me.id, 'view'), { visitor, ...b }).catch(() => {});
  const current = () => {
    const f = document.querySelector('#present-overlay iframe')?.contentWindow;
    return f?.Reveal?.getCurrentSlide?.()?.dataset?.rvId || state.deck.slides[state.ui.slideIndex]?.id || null;
  };
  const check = () => {
    const s = current(); if (s === slide) return;
    if (slide) send({ slide, ms: Date.now() - since });
    slide = s; since = Date.now(); if (s) send({ slide: s, enter: true });
  };
  const leave = () => { if (document.visibilityState === 'hidden' && slide) send({ slide, ms: Date.now() - since }); since = Date.now(); };   // (time away doesn't count)
  const unsub = subscribe(check), tick = setInterval(check, 1000);
  document.addEventListener('visibilitychange', leave);
  check();
  return () => { unsub(); clearInterval(tick); document.removeEventListener('visibilitychange', leave); if (slide) send({ slide, ms: Date.now() - since }); };
}
