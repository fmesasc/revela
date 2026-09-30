// Presentations saved in Revela's cloud (revelaslides.com/api/docs/…), shared
// with people (by their Google account's email) and/or by link, each with a
// role: view, comment or edit. The owner decides; this server checks every
// read and every change against the role of whoever sends it, so the app's
// code can't give anyone more than they were given.
//
//   GET  /api/docs                    → { mine: [...], shared: [...], limit }
//   POST /api/docs                    { deck } → { id, rev }
//   GET  /api/docs/:id                → { deck, rev, role, name, owner?, sharing? }  (a link role needs no session)
//   GET  /api/docs/:id/since?rev=N    → { rev, ops } (what changed since), or { rev, deck } when too old
//   POST /api/docs/:id/ops            { ops } → { rev }  (each op checked against the role)
//   POST /api/docs/:id/share          { link, people: { email: role } }  (owner; people need Pro)
//   POST /api/docs/:id/delete         (owner)
//   GET  /api/docs/:id/versions       → [{ at, rev }]      (edit role)
//   GET  /api/docs/:id/version?at=T   → { deck }           (edit role)
//   POST /api/docs/:id/view           { visitor, slide, ms } (anyone who can read: statistics)
//   GET  /api/docs/:id/stats          → per slide: views and time; visitors  (owner, Pro)
//
// Storage: one Durable Object per document (CloudDoc: the deck slide by slide,
// store.js, so a change rewrites only what it touched), the owner's list in
// their Account, and "shared with me" lists per email (in the same namespace,
// 'e:' + email). Statistics keep counts and times per slide and a random
// visitor id made by the viewer's browser — no email, address or browser data.

import { applyOps, allowed } from '../../src/features/live/collabsync.js';
import { writeDeck, readDeck, writeText, readParts } from './store.js';

const ROLE_RANK = { view: 1, comment: 2, edit: 3, owner: 4 };
const LINK_ROLES = ['none', 'view', 'comment', 'edit'];
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/;
const LOG_CHARS = 1.5e6, LOG_MAX = 200, VERSIONS = 10, VERSION_EVERY = 30 * 60e3;

export const docsSettings = env => ({
  maxMb: +env.MAX_MB || 30,
  freeDocs: +(env.FREE_DOCS ?? 3), proDocs: +(env.PRO_DOCS ?? 500),
  maxPeople: +(env.MAX_PEOPLE ?? 50),
});
const nameOf = deck => String(deck?.name || '').slice(0, 200) || 'Presentación sin título';

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
    const person = who?.email && meta.people[who.email], link = meta.link !== 'none' ? meta.link : null;
    return [person, link].filter(Boolean).sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] || null;
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
    if (op === 'role') return this.json({ role });                 // (for the video calls: only who may open it)
    if (!role) return this.json({ error: a.who?.sub ? 'forbidden' : 'sign in' }, a.who?.sub ? 403 : 401);
    const at = r => ROLE_RANK[role] >= ROLE_RANK[r];
    const sharing = () => ({ link: meta.link, people: meta.people });
    switch (op) {
      case 'get':
        return this.json({ deck: doc.deck, rev: meta.rev, role, name: meta.name, updated: meta.updated,
          ...(role === 'owner' ? { sharing: sharing() } : { owner: meta.ownerEmail }) });
      case 'since': {
        const log = (await st.get('log')) || [], from = +a.rev || 0;
        if (from === meta.rev) return this.json({ rev: meta.rev, ops: [] });
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
        return this.json({ rev: meta.rev, name: meta.name, owner: meta.owner });
      }
      case 'share': {
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const before = { ...meta.people };
        if (a.link !== undefined) { if (!LINK_ROLES.includes(a.link)) return this.json({ error: 'bad request' }, 400); meta.link = a.link; }
        if (a.people !== undefined) {
          const people = {};
          for (const [e, r] of Object.entries(a.people || {})) {
            const email = String(e).trim().toLowerCase();
            if (!EMAIL.test(email) || !['view', 'comment', 'edit'].includes(r)) return this.json({ error: 'bad request' }, 400);
            if (email !== meta.ownerEmail) people[email] = r;
          }
          if (Object.keys(people).length > docsSettings(this.env).maxPeople) return this.json({ error: 'too many people' }, 400);
          meta.people = people;
        }
        await st.put('meta', meta);
        return this.json({ ok: true, sharing: sharing(), before, name: meta.name });
      }
      case 'delete': {
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const people = Object.keys(meta.people); await st.deleteAll(); this.doc = null;
        return this.json({ ok: true, people });
      }
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

// me: { sub, email, plan, features } or null; A: the Account stub; call(stub, op, body).
export async function handleDocs(path, req, body, url, env, me, acct, call, json) {
  const s = docsSettings(env);
  const who = me ? { sub: me.sub, email: me.email } : null;
  if (path === '/docs') {
    if (!me) return json({ error: 'no session' }, 401);
    const A = acct(env, me.sub);
    if (req.method === 'GET') {
      const mine = await call(A, 'docs-list'), inbox = await call(acct(env, 'e:' + me.email), 'inbox-list');
      return json({ mine: mine.docs, shared: inbox.docs, limit: me.plan === 'pro' ? s.proDocs : s.freeDocs });
    }
    const deck = body.deck;
    if (!deck || typeof deck !== 'object' || !Array.isArray(deck.slides)) return json({ error: 'bad request' }, 400);
    const id = random(16);
    const room = await call(A, 'docs-add', { id, name: nameOf(deck), limit: me.plan === 'pro' ? s.proDocs : s.freeDocs });
    if (!room.ok) return json({ error: 'doc limit', limit: room.limit }, 402);
    const r = await ask(env, id, 'init', { owner: me.sub, ownerEmail: me.email, deck });
    return json({ id, rev: r.data.rev });
  }
  const m = path.match(/^\/docs\/([\w-]{16,40})(?:\/(since|ops|share|delete|versions|version|view|stats))?$/);
  if (!m) return json({ error: 'not found' }, 404);
  const [, id, op = 'get'] = m;
  const GETS = ['get', 'since', 'versions', 'version', 'stats'];
  if (GETS.includes(op) !== (req.method === 'GET')) return json({ error: 'method' }, 405);
  if (op === 'stats' && !(me?.features || []).includes('analytics')) return json({ error: 'pro only' }, 402);
  const args = { who, ...(op === 'since' && { rev: url.searchParams.get('rev') }), ...(op === 'version' && { at: url.searchParams.get('at') }), ...(req.method === 'POST' && body) };
  args.who = who;                                          // (never from the body)
  if (op === 'ops' && !me) return json({ error: 'no session' }, 401);
  if (op === 'share') {
    if (!me) return json({ error: 'no session' }, 401);
    if (body.people && Object.keys(body.people).length && !(me.features || []).includes('share-people')) return json({ error: 'pro only' }, 402);
  }
  const r = await ask(env, id, op, args);
  if (r.status !== 200) return json(r.data, r.status);
  // Keep the lists in step: the owner's, and each person's "shared with me".
  if (op === 'share') {
    const now = r.data.sharing.people, was = r.data.before;
    for (const e of Object.keys(was)) if (!now[e]) await call(acct(env, 'e:' + e), 'inbox-remove', { id });
    for (const [e, role] of Object.entries(now)) await call(acct(env, 'e:' + e), 'inbox-add', { id, name: r.data.name, owner: me.email, role });
    delete r.data.before;
  } else if (op === 'delete') {
    await call(acct(env, me.sub), 'docs-remove', { id });
    for (const e of r.data.people) await call(acct(env, 'e:' + e), 'inbox-remove', { id });
    delete r.data.people;
  } else if (op === 'ops' && r.data.owner) {
    await call(acct(env, r.data.owner), 'docs-touch', { id, name: r.data.name });
    delete r.data.owner;
  }
  return json(r.data);
}
