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

import { api } from './account.js';
import { OFFICIAL_SITE, EDITION } from '../../core/config.js';
import { state, subscribe, snapshot, applyRemote, adoptDeck, replaceDeck, setPersist, mutate, onBeforeReplace } from '../../core/store.js';
import { diff, applyOps } from '../../features/live/collabsync.js';
import { cleanValue } from '../../features/document/sanitize.js';

// How requests reach the server: the account's API (the tests put a stand-in here).
let transport = api;
const send = (...a) => transport(...a);
export const setTransport = fn => { transport = fn || api; };
export const customTransport = () => transport !== api;
export const listDocs = () => send('docs');
export const docLink = id => `${OFFICIAL_SITE}/app/?doc=${encodeURIComponent(id)}`;
// Embedding one shared by link in another site (an iframe): the viewer page, in presentation mode.
export const embedLink = id => `${OFFICIAL_SITE}/app/view.html?doc=${encodeURIComponent(id)}`;
export const embedCode = (id, name = '') => `<iframe src="${embedLink(id)}" width="960" height="540" style="border:0;max-width:100%;aspect-ratio:16/9;height:auto" allow="fullscreen" allowfullscreen loading="lazy"${name ? ` title="${String(name).replace(/[<>"&]/g, '')}"` : ''}></iframe>`;
// The presentation of a link that anyone can view (no account): → { deck, name } or throws { status }.
export async function publicDeck(id, fetcher = fetch) {
  const r = await fetcher(new URL('/api/docs/' + encodeURIComponent(id), location.origin).href, { credentials: 'include' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.deck?.slides) throw Object.assign(new Error('DOC'), { status: r.ok ? 500 : r.status });
  return { deck: cleanValue(j.deck), name: j.name || '', noCopy: !!j.noCopy };
}
export const docIdFrom = (search = location.search) => { const id = new URLSearchParams(search).get('doc'); return id && /^[\w-]{16,40}$/.test(id) ? id : null; };
const path = (id, op = '') => `docs/${encodeURIComponent(id)}${op ? '/' + op : ''}`;
export const shareDoc = (id, sharing) => send(path(id, 'share'), sharing);
export const deleteDoc = id => send(path(id, 'delete'), {});
export const docStats = id => send(path(id, 'stats'));
export const docVersions = id => send(path(id, 'versions'));
export const docVersion = (id, at) => send(path(id, 'version') + '?at=' + encodeURIComponent(at));
// Organising them (the manager, ui/dialogs/cloudlibrary.js): folders, name, folder, star, trash, copies.
export const createFolder = (name, parent = null) => send('docs/folders', { name, parent });
export const editFolder = (id, patch) => send('docs/folders/' + encodeURIComponent(id), patch);
export const deleteFolder = id => send(`docs/folders/${encodeURIComponent(id)}/delete`, {});
export const setDocMeta = (id, patch) => send(path(id, 'meta'), patch);
export const trashDoc = id => send(path(id, 'trash'), {});
export const restoreDoc = id => send(path(id, 'restore'), {});
export const duplicateDoc = (id, name) => send(path(id, 'duplicate'), name ? { name } : {});
export async function emptyTrash() { let n = 0, r; do { r = await send('docs/trash/empty', {}); n += r.n; } while (r.more && r.n); return n; }
export const fetchDeck = async id => (await send(path(id))).deck;

// ---- Pictures of the first slide, for the lists ------------------------------------------------
// Made here when saving (small WebP, else JPEG, ≤ THUMB_MAX characters), kept by the server with the
// document, fetched for the lists in batches and remembered while the page is open.
export const THUMB_MAX = 30000;
const thumbs = new Map();                                // id → { at, data } (data null: it has none)
export const cachedThumb = id => thumbs.get(id);
export async function loadThumbs(docs, io = send) {
  const want = docs.filter(d => { const c = thumbs.get(d.id); return !c || (d.thumbAt && c.at !== d.thumbAt); });
  for (let i = 0; i < want.length; i += 24) {
    const part = want.slice(i, i + 24), r = await io('docs/thumbs', { ids: part.map(d => d.id) });
    for (const d of part) thumbs.set(d.id, { at: d.thumbAt || null, data: r.thumbs?.[d.id] || null });
  }
}
// The maker (the tests replace it): the deck's first visible slide → a data URL.
const firstSlidePicture = async deck => {
  const { slideImageBlob } = await import('../export/images.js');
  const blob = await slideImageBlob(deck.slides.find(s => !s.hidden) || deck.slides[0], 'jpg', deck); if (!blob) return null;
  const img = await createImageBitmap(blob), W = 320, H = Math.round(W * img.height / img.width);
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
  for (const q of [0.8, 0.65, 0.5, 0.35]) {
    let url = c.toDataURL('image/webp', q);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q);   // (Safari can't write WebP)
    if (url.length <= THUMB_MAX) return url;
  }
  return null;
};
let thumbMaker = firstSlidePicture;
export const setThumbMaker = fn => { thumbMaker = fn || firstSlidePicture; };
const firstSlideKey = deck => { const s = deck.slides.find(x => !x.hidden) || deck.slides[0]; return s ? JSON.stringify([s, deck.size, deck.theme, deck.master, deck.layouts]) : ''; };
// Sent when the first slide changed (at most every THUMB_EVERY), and the first time.
const THUMB_EVERY = 60e3;
async function sendThumb(me, force = false) {
  if (cur !== me || !['owner', 'edit'].includes(me.role) || me.readOnly || me.thumbBusy) return;
  const key = firstSlideKey(state.deck), wait = (me.thumbSent || 0) + THUMB_EVERY - Date.now();
  if (!force && key === me.thumbKey) return;
  if (!force && wait > 0) { if (!me.thumbTimer) me.thumbTimer = setTimeout(() => { me.thumbTimer = null; sendThumb(me); }, wait); return; }
  me.thumbBusy = true;
  try {
    const data = await thumbMaker(snapshot(state.deck)); if (!data || cur !== me) return;
    const r = await me.io(path(me.id, 'thumb'), { thumb: data });
    me.thumbKey = key; me.thumbSent = Date.now(); thumbs.set(me.id, { at: r.at, data });
  } catch {} finally { me.thumbBusy = false; }
}

// ---- The open cloud document ------------------------------------------------------------
let cur = null;                  // { id, role, rev, base, sharing, owner, readOnly: { limit } | null, stop }
const listeners = new Set();
export const onCloud = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what, data) => listeners.forEach(fn => { try { fn(what, data); } catch {} });
export const cloudDoc = () => (cur ? { id: cur.id, role: cur.role, sharing: cur.sharing, owner: cur.owner, status: cur.status, readOnly: cur.readOnly, noCopy: cur.noCopy } : null);
export const setSharing = sharing => { if (cur) { cur.sharing = sharing; emit('sharing', sharing); } };
// A version from the cloud becomes the current document (and is sent like any change).
export const restoreVersion = deck => replaceDeck(deck);
const setStatus = s => { if (cur && cur.status !== s) { cur.status = s; emit('status', s); } };

// Values from others can't run code (as in live collaboration).
const clean = ops => ops.map(op => (op && 'v' in op ? { ...op, v: cleanValue(op.v, String(op.p?.at(-1) ?? '')) } : op));

// Open one (replacing the document in the editor), with the role the server gives.
// io: the transport (the tests pass a fake); pollMs: how often to look for others' changes.
export async function openDoc(id, { io = send, pollMs = 5000, debounceMs = 1200 } = {}) {
  const r = await io(path(id));
  // «Solo presentar»: not the editor but the viewer, as a slideshow (the server sent only what an audience sees).
  if (r.role === 'present') {
    if (EDITION === 'desktop') window.__TAURI__?.opener?.openUrl?.(embedLink(id)); else location.assign('view.html?doc=' + encodeURIComponent(id));
    return { id, role: 'present' };
  }
  closeDoc();
  // (Shared without copies: the app offers no download, print or copy — ui/ribbon/actions.js TAKES_OUT.)
  state.ui.noCopy = !!r.noCopy;
  adoptDeck(r.deck);
  state.ui.lock = r.role === 'view' ? 'view' : r.role === 'comment' ? 'comment' : null;
  setPersist(r.role === 'owner');                        // (someone else's: this browser keeps no copy)
  cur = { id, role: r.role, rev: r.rev, base: snapshot(state.deck), sharing: r.sharing || null, owner: r.owner || null, readOnly: r.readOnly ? { limit: r.limit } : null, status: r.readOnly ? 'readonly' : 'saved', noCopy: !!r.noCopy, io };
  if (r.thumbAt) cur.thumbKey = firstSlideKey(state.deck);   // (it has its picture: a new one only when the first slide changes)
  startSync(pollMs, debounceMs);
  emit('open', cloudDoc());
  if (!r.thumbAt) { const me = cur; setTimeout(() => sendThumb(me, true), 1500); }   // (saved before there were pictures)
  return cloudDoc();
}
// Put the current presentation in the cloud (in one of my folders, if given) and keep it in step from now on.
export async function saveToCloud({ io = send, pollMs = 5000, debounceMs = 1200, folder = null } = {}) {
  const deck = snapshot(state.deck), r = await io('docs', { deck, ...(folder && { folder }) });
  closeDoc();
  cur = { id: r.id, role: 'owner', rev: r.rev, base: deck, sharing: { link: 'none', people: {} }, owner: null, status: 'saved', io };
  startSync(pollMs, debounceMs);
  emit('open', cloudDoc());
  sendThumb(cur, true);
  return cloudDoc();
}
// Closing it (another one opens, or it stops being in the cloud): what changed here and isn't
// sent yet goes now (its last edits would be lost otherwise), then it is let go.
export function closeDoc() {
  if (!cur) return;
  { const me = cur; if (me.role !== 'view' && !me.readOnly) { const ops = diff(me.base, state.deck); if (ops.length) me.io(path(me.id, 'ops'), { ops }).catch(() => {}); } }
  cur.stop?.(); cur = null; state.ui.lock = null; state.ui.noCopy = false; setPersist(true); emit('close');
}
// Read-only (beyond the plan): keep what's in the editor as a presentation of this browser, apart from the cloud's.
export function keepCopy() {
  if (!cur || cur.noCopy) return;                        // (shared without copies: none here either)
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
  me.stop = () => { unsub(); clearInterval(poll); clearTimeout(timer); clearTimeout(me.thumbTimer); stats?.(); };
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
  sendThumb(me);                                          // (not waited for: the picture never holds up saving)
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

// Another document replacing this one in the editor: this one is closed first (its last changes sent)
// — never left syncing, which would write the new document over it.
onBeforeReplace(() => { if (cur) closeDoc(); });
