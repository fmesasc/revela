// Presentations saved in Revela's cloud (revelaslides.com/api/docs/…), shared
// with people (by their Google account's email) and/or by link, each with a
// role: present, view, comment or edit. The owner decides; this server checks every
// read and every change against the role of whoever sends it, so the app's
// code can't give anyone more than they were given.
//
// Permissions (Compartir ▸ Ajustes de permisos), as in other office suites:
// - present: only the slideshow (the viewer, view.html): no editor, and the deck it gets has no speaker notes,
//   comments or hidden slides — they never leave the server.
// - noCopy: who can only view or comment gets no download, print, copy or «keep a copy» in the app. (Whoever
//   sees a slide can always photograph it: this is what an honest app can promise.) Editors are not affected.
// - editorsShare: editors may also share and change roles (not these settings, nor the owner).
// - until: access that ends — per person ({ email: ms }) and for the link (linkUntil).
//
//   GET  /api/docs                    → { mine: [...], shared: [...], folders: [...], limit, trashDays }
//                                     (mine: { id, name, created, updated, folder, starred, trashed, slides, text, thumbAt,
//                                     readOnly: true beyond the plan's limit }; shared: { id, name, owner, role, at, starred })
//   POST /api/docs                    { deck, folder? } → { id, rev }
//   POST /api/docs/folders            { name, parent? } → { folder, folders }         (≤ FOLDERS.max, names ≤ FOLDERS.name,
//   POST /api/docs/folders/:fid       { name?, parent? } → { folders }                  FOLDERS.depth deep)
//   POST /api/docs/folders/:fid/delete → { folders }  (what it held goes up one level)
//   POST /api/docs/thumbs             { ids } → { thumbs: { id: data URL } }  (≤ 24; any I can read)
//   POST /api/docs/trash/empty        → { n, more }  (deleted for good; more: call again)
//   POST /api/docs/:id/meta           { name?, folder?, starred? }  (name: edit role; folder: owner; starred: owner or anyone it's shared with)
//   POST /api/docs/:id/trash | restore (owner; in the trash TRASH_DAYS days, then deleted by the daily cron; meanwhile nobody
//                                     else can open it and it leaves their lists)
//   POST /api/docs/:id/duplicate      { name?, folder? } → { id }  (owner or edit role; counts against the plan)
//   GET|POST /api/docs/:id/thumb      → { thumb, at } | { thumb } → { at }  (a small WebP/JPEG/PNG data URL of the first
//                                     slide, ≤ THUMB_CHARS characters, made by the browser; edit role)
//   GET  /api/docs/:id                → { deck, rev, role, name, owner?, sharing?, readOnly?, limit? }  (a link role needs no session)
//   GET  /api/docs/:id/since?rev=N    → { rev, ops } (what changed since), or { rev, deck } when too old
//   POST /api/docs/:id/ops            { ops } → { rev }  (each op checked against the role; 402 { error: 'read only',
//                                     reason: 'over limit', limit } when its owner has more than the plan allows)
//   POST /api/docs/:id/share          { link, people: { email: role }, until?: { email: ms }, linkUntil?, noCopy?, editorsShare? }
//                                     (owner, or editors with editorsShare — not noCopy/editorsShare; people need Pro; new people get an email)
//   POST /api/docs/:id/delete         (owner: deleted for good at once)
//   GET  /api/docs/:id/versions       → [{ at, rev }]      (edit role)
//   GET  /api/docs/:id/version?at=T   → { deck }           (edit role)
//   POST /api/docs/:id/view           { visitor, slide, ms } (anyone who can read: statistics)
//   GET  /api/docs/:id/stats          → per slide: views and time; visitors  (owner, Pro)
//
// Storage: one Durable Object per document (CloudDoc: the deck slide by slide,
// store.js, so a change rewrites only what it touched; the picture of its first
// slide), the owner's list in their Account (with folders, stars, the trash, how
// many slides and their titles, for the lists and their search), and "shared with me" lists per email (in the same namespace,
// 'e:' + email). Statistics keep counts and times per slide and a random
// visitor id made by the viewer's browser — no email, address or browser data.
//
// Read-only beyond the plan: when the owner has more documents than their plan
// allows (after leaving Pro), only the N most recently edited can change; the
// others can be opened, presented, exported, shared and deleted, but no change
// is accepted from anyone. Nothing is deleted. The owner's Account decides (docState).

import { applyOps, allowed } from '../../src/features/live/collabsync.js';
import { writeDeck, readDeck, writeText, readParts } from './store.js';
import { mail } from './mail.js';
import { acct, call } from './api.js';
import { b64url, random, EMAIL } from './util.js';

const ROLE_RANK = { present: 1, view: 2, comment: 3, edit: 4, owner: 5 };
const ROLES = ['present', 'view', 'comment', 'edit'], LINK_ROLES = ['none', ...ROLES];
// What «present» receives: the slides an audience sees, without speaker notes, comments or hidden slides.
export const forAudience = deck => ({ ...deck, slides: (deck.slides || []).filter(s => !s.hidden).map(({ notes, comments, ...s }) => s) });
// An end date: a time in the future (at most 5 years ahead), or none.
const untilOf = v => { const n = Math.round(+v); return Number.isFinite(n) && n > Date.now() && n < Date.now() + 5 * 365 * 864e5 ? n : null; };
const LOG_CHARS = 1.5e6, LOG_MAX = 200, VERSIONS = 10, VERSION_EVERY = 30 * 60e3;

export const docsSettings = env => ({
  maxMb: +env.MAX_MB || 30,
  freeDocs: +(env.FREE_DOCS ?? 3), proDocs: +(env.PRO_DOCS ?? 500),
  maxPeople: +(env.MAX_PEOPLE ?? 50),
});
const nameOf = deck => String(deck?.name || '').slice(0, 200) || 'Presentación sin título';
export const TRASH_DAYS = 30, FOLDERS = { max: 200, name: 80, depth: 3 };
const THUMB = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/, THUMB_CHARS = 40000;
// For the lists and their search: how many slides, and their titles (else their first text), short.
const plain = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export function indexOf(deck) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : [];
  const title = s => { const bs = Array.isArray(s?.blocks) ? s.blocks : [], b = bs.find(x => x?.ph === 'title' && plain(x.html)) || bs.find(x => x?.type === 'text' && plain(x.html)); return plain(s?.title) || (b ? plain(b.html) : ''); };
  return { slides: slides.length, text: slides.map(title).filter(Boolean).map(x => x.slice(0, 80)).join(' · ').slice(0, 400) };
}

// ---- One document ---------------------------------------------------------------------------
export class CloudDoc {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.doc = null; this.parts = null; }
  json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
  async load() {
    if (this.doc) return this.doc;
    const st = this.ctx.storage, meta = await st.get('meta'); if (!meta) return null;
    const r = await readDeck(st); if (!r) return null;
    this.parts = r.state; this.doc = { meta, deck: r.deck }; return this.doc;
  }
  // Role of { sub, email } (either may be missing): owner, a person's, or the link's.
  roleOf(meta, who) {
    if (who?.sub && who.sub === meta.owner) return 'owner';
    const now = Date.now(), over = t => !!t && t <= now;   // (no date: no end)
    const person = who?.email && !over(meta.until?.[who.email]) && meta.people[who.email], link = meta.link !== 'none' && !over(meta.linkUntil) ? meta.link : null;
    return [person, link].filter(Boolean).sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] || null;
  }
  // Whether its owner's plan leaves it read-only (id: given by the worker, never by the body).
  async locked(meta, id) {
    if (!id || !this.env.ACCOUNTS) return { locked: false };
    const r = await this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('u:' + meta.owner)).fetch('https://do/docs-locked', { method: 'POST', body: JSON.stringify({ id }) });
    return r.ok ? r.json() : { locked: false };
  }
  // One request at a time (see Account.fetch).
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    if (op === 'init') {
      const meta = { owner: a.owner, ownerEmail: a.ownerEmail, name: nameOf(a.deck), link: 'none', people: {}, rev: 1, created: Date.now(), updated: Date.now() };
      this.parts = await writeDeck(st, a.deck); this.doc = { meta, deck: a.deck };
      await st.put({ meta, log: [], versions: [] }); return this.json({ ok: true, rev: 1 });
    }
    const doc = await this.load(); if (!doc) return this.json({ error: 'not found' }, 404);
    const { meta } = doc, role = this.roleOf(meta, a.who);
    if (meta.trashed && role !== 'owner') return op === 'role' ? this.json({ role: null }) : this.json({ error: 'not found' }, 404);   // (in the trash: only for its owner)
    if (op === 'role') return this.json({ role });                 // (for the video calls: only who may open it)
    if (!role) return this.json({ error: a.who?.sub ? 'forbidden' : 'sign in' }, a.who?.sub ? 403 : 401);
    const at = r => ROLE_RANK[role] >= ROLE_RANK[r];
    const sharing = () => ({ link: meta.link, people: meta.people, until: meta.until || {}, linkUntil: meta.linkUntil || null, noCopy: !!meta.noCopy, editorsShare: !!meta.editorsShare });
    const manages = role === 'owner' || (role === 'edit' && !!meta.editorsShare);
    // (Copying stopped: for who can only present, view or comment, when the owner says so.)
    const noCopy = !at('edit') && (role === 'present' || !!meta.noCopy);
    switch (op) {
      case 'get': {
        const lk = await this.locked(meta, a.id);
        return this.json({ deck: role === 'present' ? forAudience(doc.deck) : doc.deck, rev: meta.rev, role, name: meta.name, updated: meta.updated, thumbAt: meta.thumbAt || null, ...(lk.locked && { readOnly: true, reason: 'over limit', limit: lk.limit }),
          ...(noCopy && { noCopy: true }), ...(manages && { sharing: sharing() }), ...(role !== 'owner' && { owner: meta.ownerEmail }) });
      }
      case 'since': {
        const log = (await st.get('log')) || [], from = +a.rev || 0;
        if (from === meta.rev) return this.json({ rev: meta.rev, ops: [] });
        if (role === 'present') return this.json({ rev: meta.rev, deck: forAudience(doc.deck) });   // (the changes could carry notes: the whole, cleaned)
        const first = log[0]?.rev;
        if (first == null || from < first - 1 || from > meta.rev) return this.json({ rev: meta.rev, deck: doc.deck });
        return this.json({ rev: meta.rev, ops: log.filter(e => e.rev > from).flatMap(e => e.ops) });
      }
      case 'ops': {
        if (!at('comment')) return this.json({ error: 'forbidden' }, 403);
        const ops = Array.isArray(a.ops) ? a.ops : [];
        const roleForOps = role === 'owner' ? 'edit' : role;
        const ok = ops.filter(o => o && Array.isArray(o.p) && o.p.length && o.p.length < 40 && allowed(o, roleForOps));
        if (ok.length !== ops.length) return this.json({ error: 'forbidden' }, 403);   // (all or nothing: nothing half-applied)
        if (!ok.length) return this.json({ rev: meta.rev });
        const lk = await this.locked(meta, a.id);
        if (lk.locked) return this.json({ error: 'read only', reason: 'over limit', limit: lk.limit }, 402);
        const before = at('edit') && Date.now() - (((await st.get('versions')) || []).slice(-1)[0]?.at || 0) > VERSION_EVERY ? JSON.stringify(doc.deck) : null;
        applyOps(doc.deck, ok);
        const size = JSON.stringify(doc.deck).length;
        if (size > docsSettings(this.env).maxMb * 1024 * 1024) { this.doc = null; return this.json({ error: 'too large' }, 413); }   // (reloaded as it was)
        if (before) await this.snapshot(before, meta.rev);
        meta.rev++; meta.updated = Date.now(); meta.name = nameOf(doc.deck);
        this.parts = await writeDeck(st, doc.deck, this.parts);
        let log = (await st.get('log')) || []; log.push({ rev: meta.rev, ops: ok });
        let chars = log.reduce((t, e) => t + JSON.stringify(e.ops).length, 0);
        while (log.length > LOG_MAX || (chars > LOG_CHARS && log.length > 1)) chars -= JSON.stringify(log.shift().ops).length;
        await st.put({ meta, log });
        return this.json({ rev: meta.rev, name: meta.name, owner: meta.owner, ...indexOf(doc.deck) });
      }
      case 'share': {
        if (!manages) return this.json({ error: 'forbidden' }, 403);
        // (The settings themselves are the owner's alone.)
        if (role !== 'owner' && (a.noCopy !== undefined || a.editorsShare !== undefined)) return this.json({ error: 'forbidden' }, 403);
        const before = { ...meta.people };
        if (a.link !== undefined) { if (!LINK_ROLES.includes(a.link)) return this.json({ error: 'bad request' }, 400); meta.link = a.link; }
        if (a.linkUntil !== undefined) { if (a.linkUntil && !untilOf(a.linkUntil)) return this.json({ error: 'bad request' }, 400); meta.linkUntil = untilOf(a.linkUntil); }
        if (a.people !== undefined) {
          const people = {};
          for (const [e, r] of Object.entries(a.people || {})) {
            const email = String(e).trim().toLowerCase();
            if (!EMAIL.test(email) || !ROLES.includes(r)) return this.json({ error: 'bad request' }, 400);
            if (email !== meta.ownerEmail) people[email] = r;
          }
          if (Object.keys(people).length > docsSettings(this.env).maxPeople) return this.json({ error: 'too many people' }, 400);
          meta.people = people;
        }
        if (a.until !== undefined) {
          const until = {};
          for (const [e, v] of Object.entries(a.until && typeof a.until === 'object' ? a.until : {})) {
            const email = String(e).trim().toLowerCase(); if (!v) continue;
            if (!meta.people[email] || !untilOf(v)) return this.json({ error: 'bad request' }, 400);
            until[email] = untilOf(v);
          }
          meta.until = until;
        }
        for (const e of Object.keys(meta.until || {})) if (!meta.people[e]) delete meta.until[e];   // (gone with the person)
        if (a.noCopy !== undefined) meta.noCopy = !!a.noCopy;
        if (a.editorsShare !== undefined) meta.editorsShare = !!a.editorsShare;
        await st.put('meta', meta);
        return this.json({ ok: true, sharing: sharing(), before, name: meta.name, ownerEmail: meta.ownerEmail });
      }
      case 'delete': {
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const people = Object.keys(meta.people); await st.deleteAll(); this.doc = null;
        return this.json({ ok: true, people });
      }
      case 'trash': {                                       // { on }: into the trash (or back)
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        meta.trashed = a.on ? Date.now() : null; await st.put('meta', meta);
        return this.json({ ok: true, people: meta.people, name: meta.name });
      }
      case 'thumb': {                                       // { thumb }: the picture of its first slide, for the lists
        if (!at('edit')) return this.json({ error: 'forbidden' }, 403);
        const th = String(a.thumb || '');
        if (th.length > THUMB_CHARS || !THUMB.test(th)) return this.json({ error: 'bad thumb' }, 400);
        meta.thumbAt = Date.now(); await st.put({ thumb: th, meta });
        return this.json({ at: meta.thumbAt, owner: meta.owner });
      }
      case 'thumb-get': return this.json({ thumb: (await st.get('thumb')) || null, at: meta.thumbAt || null });
      case 'versions': return at('edit') ? this.json({ versions: (await st.get('versions')) || [] }) : this.json({ error: 'forbidden' }, 403);
      case 'version': {
        if (!at('edit')) return this.json({ error: 'forbidden' }, 403);
        const v = ((await st.get('versions')) || []).find(x => x.at === +a.at); if (!v) return this.json({ error: 'not found' }, 404);
        const parts = await readParts(st, `v:${v.at}:`); return this.json({ deck: JSON.parse(parts.join('')) });
      }
      case 'view': {                                         // a viewer's beacon: slide seen, for how long
        const slide = String(a.slide || '').slice(0, 40), ms = Math.max(0, Math.min(30 * 60e3, +a.ms || 0)), visitor = String(a.visitor || '').slice(0, 40);
        if (role === 'owner' || !slide || !/^[\w-]{8,40}$/.test(visitor)) return this.json({ ok: true });
        const s = (await st.get('stats')) || { visitors: {}, slides: {}, first: Date.now() };
        const v = s.visitors[visitor] ||= { first: Date.now(), last: 0, ms: 0, slides: 0 };
        const sl = s.slides[slide] ||= { views: 0, ms: 0 };
        if (a.enter) { sl.views++; v.slides++; }
        sl.ms += ms; v.ms += ms; v.last = Date.now();
        const ids = Object.keys(s.visitors); if (ids.length > 2000) for (const k of ids.sort((x, y) => s.visitors[x].last - s.visitors[y].last).slice(0, ids.length - 2000)) delete s.visitors[k];
        await st.put('stats', s); return this.json({ ok: true });
      }
      case 'stats': {
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const s = (await st.get('stats')) || { visitors: {}, slides: {} }, vs = Object.values(s.visitors);
        return this.json({ visitors: vs.length, totalMs: vs.reduce((t, v) => t + v.ms, 0), last: Math.max(0, ...vs.map(v => v.last)) || null,
          slides: doc.deck.slides.map((sl, i) => ({ id: sl.id, n: i + 1, views: s.slides[sl.id]?.views || 0, ms: s.slides[sl.id]?.ms || 0 })) });
      }
    }
    return this.json({ error: 'unknown' }, 404);
  }
  // A version of the whole deck (before a change, at most one every half hour; the last ten).
  async snapshot(text, rev) {
    const st = this.ctx.storage, list = (await st.get('versions')) || [], at = Date.now();
    await writeText(st, `v:${at}:`, text); list.push({ at, rev });
    while (list.length > VERSIONS) {
      const old = list.shift(), n = (await st.get(`v:${old.at}:n`)) || 0;
      await st.delete([`v:${old.at}:n`, ...Array.from({ length: n }, (_, i) => `v:${old.at}:${i}`)]);
    }
    await st.put('versions', list);
  }
}

// ---- Routes (called from api.js with the session, or none) -----------------------------------
const docOf = (env, id) => env.DOCS.get(env.DOCS.idFromName('doc:' + id));
const ask = async (env, id, op, body) => { const r = await docOf(env, id).fetch('https://doc/' + op, { method: 'POST', body: JSON.stringify(body) }); return { status: r.status, data: await r.json() }; };
const ID = /^[\w-]{16,40}$/;

// Deleted for good (by its owner, or by the daily cron after TRASH_DAYS in the trash): the document,
// and its place in the owner's list and in the lists of whoever it was shared with.
export async function purgeDoc(env, sub, id) {
  const r = await ask(env, id, 'delete', { who: { sub }, id });
  if (r.status !== 200 && r.status !== 404) return r;
  await call(acct(env, sub), 'docs-remove', { id });
  for (const e of r.data.people || []) await call(acct(env, 'e:' + e), 'inbox-remove', { id });
  return { status: 200, data: { ok: true } };
}
// A new one in my list (and in a folder of mine, if given), within the plan's limit.
async function create(env, me, deck, folder) {
  const s = docsSettings(env), id = random(16);
  const room = await call(acct(env, me.sub), 'docs-add', { id, name: nameOf(deck), limit: me.plan === 'pro' ? s.proDocs : s.freeDocs, folder: folder || null, ...indexOf(deck) });
  if (!room.ok) return { status: 402, data: { error: 'doc limit', limit: room.limit } };
  const r = await ask(env, id, 'init', { owner: me.sub, ownerEmail: me.email, deck });
  return { status: 200, data: { id, rev: r.data.rev } };
}

// me: { sub, email, plan, features } or null.
export async function handleDocs(path, req, body, url, env, me, json) {
  const s = docsSettings(env);
  const who = me ? { sub: me.sub, email: me.email } : null;
  const reply = r => json(r.data, r.status);
  if (path === '/docs') {
    if (!me) return json({ error: 'no session' }, 401);
    const A = acct(env, me.sub);
    if (req.method === 'GET') {
      const mine = await call(A, 'docs-list'), inbox = await call(acct(env, 'e:' + me.email), 'inbox-list'), { folders } = await call(A, 'folders-list');
      return json({ mine: mine.docs, shared: inbox.docs, folders, limit: mine.limit ?? (me.plan === 'pro' ? s.proDocs : s.freeDocs), trashDays: TRASH_DAYS });
    }
    const deck = body.deck;
    if (!deck || typeof deck !== 'object' || !Array.isArray(deck.slides)) return json({ error: 'bad request' }, 400);
    return reply(await create(env, me, deck, typeof body.folder === 'string' ? body.folder : null));
  }
  // My folders, the pictures of several at once, emptying the trash.
  const fm = path.match(/^\/docs\/(folders|thumbs|trash\/empty)(?:\/([\w-]{4,20})(\/delete)?)?$/);
  if (fm) {
    if (!me) return json({ error: 'no session' }, 401);
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const A = acct(env, me.sub);
    if (fm[1] !== 'folders' && fm[2]) return json({ error: 'not found' }, 404);
    if (fm[1] === 'thumbs') {
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])].filter(x => typeof x === 'string' && ID.test(x)).slice(0, 24), thumbs = {};
      await Promise.all(ids.map(async id => { const r = await ask(env, id, 'thumb-get', { who, id }); if (r.status === 200 && r.data.thumb) thumbs[id] = r.data.thumb; }));
      return json({ thumbs });
    }
    if (fm[1] === 'trash/empty') {
      const trashed = (await call(A, 'docs-list')).docs.filter(d => d.trashed).map(d => d.id), now = trashed.slice(0, 20);
      for (const id of now) await purgeDoc(env, me.sub, id);
      return json({ n: now.length, more: trashed.length > now.length });
    }
    if (!fm[2] && fm[3]) return json({ error: 'not found' }, 404);
    const op = !fm[2] ? 'folder-add' : fm[3] ? 'folder-remove' : 'folder-edit';
    const r = await call(A, op, { id: fm[2], ...(op !== 'folder-remove' && { name: body.name, parent: body.parent }) });
    if (!r.ok) return json(r, r.error === 'not found' || r.error === 'no folder' ? 404 : r.error === 'folder limit' ? 402 : 400);
    return json(r);
  }
  const m = path.match(/^\/docs\/([\w-]{16,40})(?:\/(since|ops|share|delete|versions|version|view|stats|meta|trash|restore|duplicate|thumb))?$/);
  if (!m) return json({ error: 'not found' }, 404);
  const [, id, op = 'get'] = m;
  const GETS = ['get', 'since', 'versions', 'version', 'stats'];
  if (op !== 'thumb' && GETS.includes(op) !== (req.method === 'GET')) return json({ error: 'method' }, 405);
  if (op === 'stats' && !(me?.features || []).includes('analytics')) return json({ error: 'pro only' }, 402);
  const args = { who, ...(op === 'since' && { rev: url.searchParams.get('rev') }), ...(op === 'version' && { at: url.searchParams.get('at') }), ...(req.method === 'POST' && body) };
  args.who = who; args.id = id;                            // (never from the body)
  if (!me && (['ops', 'share', 'delete', 'meta', 'trash', 'restore', 'duplicate'].includes(op) || (op === 'thumb' && req.method === 'POST'))) return json({ error: 'no session' }, 401);
  if (op === 'share' && body.people && Object.keys(body.people).length && !(me.features || []).includes('share-people')) return json({ error: 'pro only' }, 402);
  if (op === 'delete') return reply(await purgeDoc(env, me.sub, id));
  if (op === 'thumb') {
    if (req.method === 'GET') return reply(await ask(env, id, 'thumb-get', { who, id }));
    const r = await ask(env, id, 'thumb', { who, id, thumb: body.thumb });
    if (r.status === 200) { await call(acct(env, r.data.owner), 'docs-meta', { id, thumbAt: r.data.at }); delete r.data.owner; }
    return reply(r);
  }
  if (op === 'trash' || op === 'restore') {
    const on = op === 'trash', r = await ask(env, id, 'trash', { who, id, on });
    if (r.status !== 200) return reply(r);
    await call(acct(env, me.sub), 'docs-meta', { id, trashed: on });
    // (Out of the lists of whoever it's shared with while in the trash; back when restored, without another email.)
    for (const [e, role] of Object.entries(r.data.people)) await call(acct(env, 'e:' + e), on ? 'inbox-away' : 'inbox-add', { id, name: r.data.name, owner: me.email, role });
    return json({ ok: true });
  }
  if (op === 'meta') {
    const out = { ok: true };
    if (body.name !== undefined) {                         // (a change of the document like any other: everyone sees it)
      const name = String(body.name ?? '').replace(/[\u0000-\u001f]/g, '').trim();
      if (!name || name.length > 200) return json({ error: 'bad name' }, 400);
      const r = await ask(env, id, 'ops', { who, id, ops: [{ p: ['name'], v: name }] });
      if (r.status !== 200) return reply(r);
      await call(acct(env, r.data.owner), 'docs-touch', { id, name: r.data.name, slides: r.data.slides, text: r.data.text });
      out.name = r.data.name;
    }
    if (body.folder !== undefined || body.starred !== undefined) {
      const folder = body.folder === undefined ? undefined : typeof body.folder === 'string' ? body.folder : null;
      const r = await call(acct(env, me.sub), 'docs-meta', { id, folder, starred: body.starred });
      if (r.error === 'no folder') return json({ error: 'no folder' }, 404);
      if (!r.ok) {                                          // not mine: only a star, on one shared with me
        if (folder !== undefined) return json({ error: 'forbidden' }, 403);
        const x = await call(acct(env, 'e:' + me.email), 'inbox-star', { id, on: body.starred });
        if (!x.ok) return json({ error: 'not found' }, 404);
      }
    }
    return json(out);
  }
  if (op === 'duplicate') {
    const r = await ask(env, id, 'get', { who, id });
    if (r.status !== 200) return reply(r);
    if (!['owner', 'edit'].includes(r.data.role)) return json({ error: 'forbidden' }, 403);
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 200) : r.data.name;
    const mine = r.data.role === 'owner' ? (await call(acct(env, me.sub), 'docs-list')).docs.find(d => d.id === id) : null;
    const c = await create(env, me, { ...r.data.deck, name }, typeof body.folder === 'string' ? body.folder : mine?.folder);
    if (c.status !== 200) return reply(c);
    const th = await ask(env, id, 'thumb-get', { who, id });     // (the same picture, until it's edited)
    if (th.data.thumb) { const t = await ask(env, c.data.id, 'thumb', { who, id: c.data.id, thumb: th.data.thumb }); await call(acct(env, me.sub), 'docs-meta', { id: c.data.id, thumbAt: t.data.at }); }
    return json({ id: c.data.id });
  }
  const r = await ask(env, id, op, args);
  if (r.status !== 200) return json(r.data, r.status);
  // Keep the lists in step: the owner's, and each person's "shared with me".
  if (op === 'share') {
    const now = r.data.sharing.people, was = r.data.before;
    for (const e of Object.keys(was)) if (!now[e]) await call(acct(env, 'e:' + e), 'inbox-remove', { id });
    for (const [e, role] of Object.entries(now)) {
      const x = await call(acct(env, 'e:' + e), 'inbox-add', { id, name: r.data.name, owner: r.data.ownerEmail || me.email, role });
      // (Someone new: an email with the link — a service email, no opt-out.)
      if (!was[e]) await mail(env, { to: e, kind: 'share', lang: x.lang, vars: { by: me.name ? `${me.name} (${me.email})` : me.email, name: r.data.name, role, url: `${env.SITE_URL || 'https://revelaslides.com'}/app/?doc=${encodeURIComponent(id)}` } });
    }
    delete r.data.before; delete r.data.ownerEmail;
  } else if (op === 'ops') {
    if (r.data.owner) await call(acct(env, r.data.owner), 'docs-touch', { id, name: r.data.name, slides: r.data.slides, text: r.data.text });
    delete r.data.owner; delete r.data.slides; delete r.data.text;
  }
  return json(r.data);
}
