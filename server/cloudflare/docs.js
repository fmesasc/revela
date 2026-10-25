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
// - only some slides: who can present, view or comment may get just some of them — per person (slidesOf:
//   { email: [slide ids] }) and for the link (linkSlides) —; the others never leave the server, not even their titles
//   or the first slide's picture. The owner widens or narrows it whenever: «so they get more or fewer». (Not for
//   editors: editing half a deck would leave the other half to be broken unseen.) Slides added later aren't in it.
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
//   POST /api/docs/:id/share          { team?: none|role (the owner's team: every member, with that role — Mi nube ▸ Del equipo),
//                                     link, people: { email: role }, until?: { email: ms }, linkUntil?, noCopy?, editorsShare?,
//                                     slidesOf?: { email: [ids] }, linkSlides?: [ids] | null }
//                                     (owner, or editors with editorsShare — not noCopy/editorsShare; people need Pro; new people get an email)
//   POST /api/docs/:id/delete         (owner: deleted for good at once)
//   GET  /api/docs/:id/versions       → [{ at, rev }]      (edit role)
//   GET  /api/docs/:id/version?at=T   → { deck }           (edit role)
//   POST /api/docs/:id/view           { visitor, slide, ms } (anyone who can read: statistics)
//   GET  /api/docs/:id/stats          → per slide: views and time; visitors  (owner, Pro) and the tracked links
//   POST /api/docs/:id/track          { add: { label, ask } } → { token } | { del: token } | { notify: bool }  (owner, Pro): links for one
//                                     recipient each (Pitch's, DocSend's): view.html?doc=…&r=<token> shows the presentation
//                                     (as «present») even when it isn't shared by link, and says who opened it, for how
//                                     long and how far; ask: their email first (a real gate: no deck without it);
//                                     notify: an email to the owner when one is opened (at most every TRACK_QUIET per link)
//   GET  /api/docs/:id?r=T&e=email&n=name  (a tracked link: → { ask: true, name } while its email is missing)
//   GET  /api/docs/:id/poll/:pid      → the poll, to answer it later by a link (no session; only one opened so: async)
//   POST /api/docs/:id/poll/:pid      { voter, answer } → { ok }   (one answer per voter, changeable; at most POLL_MAX voters.
//                                     A poll with «login» — Exigir iniciar sesión para votar —: a session, and the voter
//                                     is its account's, made here (voterOf): the one sent is ignored; without one, 401)
//   GET  /api/docs/:id/pollvotes/:pid → { votes: { voter: answer } }  (edit role: brought into the editor's results)
//   POST /api/docs/:id/progress       { voter, name?, slide?, of?, graded?, score?: { id, s } } (anyone who can read it:
//                                     the class at its own pace — view.html?doc=…&self=1 —, at most PROGRESS_MAX people)
//   GET  /api/docs/:id/progress       → { people: [{ voter, name, slide, of, graded, scores, at }] }  (edit role: the teacher's panel)
//   POST /api/docs/:id/progress/clear → { ok }  (edit role: a new class)
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

import { applyOps, allowed, diff } from '../../src/features/live/collabsync.js';
import { EDITS } from './deckedit.js';
import { writeDeck, readDeck, writeText, readParts } from './store.js';
import { mail } from './mail.js';
import { acct, call } from './api.js';
import { notifyHooks } from './hooks.js';
import { random, EMAIL, DAY, voterOf } from './util.js';
import { ASYNC_KINDS, publicPoll, cleanAnswer } from '../../src/features/live/answers.js';

const ROLE_RANK = { present: 1, view: 2, comment: 3, edit: 4, owner: 5 };
const TRACK_MAX = 100, TRACK_PEOPLE = 200, TRACK_QUIET = 6 * 3600e3;    // (links per document, emails kept per link, between two notices)
const ROLES = ['present', 'view', 'comment', 'edit'], LINK_ROLES = ['none', ...ROLES];
// What «present» receives: the slides an audience sees, without speaker notes, comments or hidden slides.
export const forAudience = deck => ({ ...deck, slides: (deck.slides || []).filter(s => !s.hidden).map(({ notes, comments, ...s }) => s) });
// Only some slides (the ids given, in the deck's order; the audience's when presenting).
export const onlySlides = (deck, ids) => (ids ? { ...deck, slides: (deck.slides || []).filter(s => ids.includes(s.id)) } : deck);
const MAX_SLIDE_IDS = 1000;
// An end date: a time in the future (at most 5 years ahead), or none.
const untilOf = v => { const n = Math.round(+v); return Number.isFinite(n) && n > Date.now() && n < Date.now() + 5 * 365 * 864e5 ? n : null; };
const POLL_MAX = 20000, PROGRESS_MAX = 500;   // (voters of a poll answered by a link)
// A poll's answers by link are kept in PV_PIECES pieces ('pvb:<poll>:<n>', each { voter: answer }; a voter's piece
// picked by a hash of it), and an answer rewrites only its own piece. They were one object per poll, rewritten whole
// with every answer: 1.2 MB with 5,000 open answers, each one slower than the last (local stress test, 2026-10-11: from
// 380 to 1,070 ms an answer, 66 a second), and a Durable Object's value can't pass 2 MB — it would have stopped near
// 8,000. Pieces, not one key per answer: a row written per answer either way (what the Workers Free plan counts:
// 100,000 a day), but «Traer las respuestas» reads PV_PIECES rows, not thousands. With 20,000 open answers a piece is
// ~90 KB.
const PV_PIECES = 64;
const pvPiece = (pid, voter) => { let h = 0x811c9dc5; for (let i = 0; i < voter.length; i++) h = Math.imul(h ^ voter.charCodeAt(i), 16777619); return `pvb:${pid}:${(h >>> 0) % PV_PIECES}`; };
const LOG_CHARS = 1.5e6, LOG_MAX = 200, VERSIONS = 10, VERSION_EVERY = 30 * 60e3;
// The log of recent changes ('since') is kept in pieces of LOG_PIECE changes ('log:<n>'): a change rewrites only the last
// piece, and the oldest pieces go whole. It was one value ('log'), read and written whole with every change — up to
// LOG_MAX changes, 1.5 MB —, which made each change slower than the last (local stress test, 2026-10-11). Kept in memory
// while the object is awake. A document from before has its 'log' moved into pieces with its next change.
const LOG_PIECE = 20;
const logKey = n => 'log:' + String(n).padStart(9, '0');
const opsChars = e => JSON.stringify(e.ops).length;

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
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.doc = null; this.parts = null; this.pvN = {}; this.log = null; this.versions = null; this.edits = []; }
  json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
  async load() {
    if (this.doc) return this.doc;
    const st = this.ctx.storage, meta = await st.get('meta'); if (!meta) return null;
    const r = await readDeck(st); if (!r) return null;
    this.parts = r.state; this.doc = { meta, deck: r.deck }; this.size = null; return this.doc;
  }
  // Role of { sub, email } (either may be missing): owner, a person's, or the link's.
  roleOf(meta, who, r) {
    if (who?.sub && who.sub === meta.owner) return 'owner';
    const now = Date.now(), over = t => !!t && t <= now;   // (no date: no end)
    const person = who?.email && !over(meta.until?.[who.email]) && meta.people[who.email], link = meta.link !== 'none' && !over(meta.linkUntil) ? meta.link : null;
    const tracked = this.tracked(meta, r) ? 'present' : null;          // (a recipient's own link: to see it presented)
    const team = who?.team && meta.team?.id === who.team ? meta.team.role : null;   // (the owner's team, all of it)
    return [person, link, tracked, team].filter(Boolean).sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] || null;
  }
  async trackList(meta) {
    const all = (await this.ctx.storage.get('track')) || {};
    return Object.entries(meta.track || {}).sort((x, y) => y[1].created - x[1].created).map(([token, t]) => { const e = all[token] || {};
      return { token, label: t.label, ask: !!t.ask, created: t.created, opens: e.opens || 0, first: e.first || null, last: e.last || null, ms: e.ms || 0, reached: e.reached || 0, people: e.people || [] }; });
  }
  // (Its own keys only: «constructor» and «__proto__» fit the pattern and are in every plain object, so they were a tracked link.)
  tracked(meta, r) { return typeof r === 'string' && /^[\w-]{8,40}$/.test(r) && meta.track && Object.hasOwn(meta.track, r) ? meta.track[r] : null; }
  // The slides { sub, email } may see: null for all; else the ids (all the ways they have in — as a person, by the
  // link — put together; any of them without a choice: all).
  scopeOf(meta, who, role, r) {
    if (!role || ROLE_RANK[role] >= ROLE_RANK.edit || this.tracked(meta, r)) return null;   // (a tracked link: all the audience's slides)
    const now = Date.now(), over = t => !!t && t <= now, ways = [];
    if (who?.email && meta.people[who.email] && !over(meta.until?.[who.email])) ways.push(meta.slidesOf?.[who.email] || null);
    if (meta.link !== 'none' && !over(meta.linkUntil)) ways.push(meta.linkSlides || null);
    if (who?.team && meta.team?.id === who.team) ways.push(null);
    if (!ways.length || ways.includes(null)) return null;
    return [...new Set(ways.flat())];
  }
  // What it takes in the cloud, in characters (≈ bytes; storage.js): the deck, its saved versions, its picture and the
  // log of recent changes.
  async bytes(meta) {
    this.size ??= JSON.stringify(this.doc.deck).length;
    const versions = (await this.versionList()).reduce((t, v) => t + (+v.bytes || 0), 0);
    return this.size + versions + (+meta.thumbChars || 0) + (+meta.logChars || 0);
  }
  // The saved versions' list (kept in memory while awake; snapshot() changes it).
  async versionList() { return (this.versions ??= (await this.ctx.storage.get('versions')) || []); }
  // The log of recent changes, its pieces in memory: [{ n, entries: [{ rev, ops }], chars }] (see LOG_PIECE).
  async logLoad() {
    if (this.log) return this.log;
    const st = this.ctx.storage, pieces = [];
    for (const [k, entries] of await st.list({ prefix: 'log:' })) pieces.push({ n: +k.slice(4), entries, chars: entries.reduce((t, e) => t + opsChars(e), 0) });
    const old = pieces.length ? null : await st.get('log'), dirty = new Set();
    if (old) for (let i = 0; i < old.length; i += LOG_PIECE) { const entries = old.slice(i, i + LOG_PIECE), x = { n: i / LOG_PIECE, entries, chars: entries.reduce((t, e) => t + opsChars(e), 0) }; pieces.push(x); dirty.add(x); }
    return (this.log = { pieces, dirty, gone: [], old: !!old });
  }
  // One more change in the log; the oldest pieces go while it's over LOG_MAX changes or LOG_CHARS (the newest piece
  // stays). → its characters now.
  async logAdd(entry) {
    const L = await this.logLoad(), c = opsChars(entry);
    let last = L.pieces.at(-1);
    // (A new piece when this one is full, or would pass a quarter of LOG_CHARS: a value can't pass 2 MB.)
    if (!last || last.entries.length >= LOG_PIECE || (last.entries.length && last.chars + c > LOG_CHARS / 4)) L.pieces.push(last = { n: last ? last.n + 1 : 0, entries: [], chars: 0 });
    last.entries.push(entry); last.chars += c; L.dirty.add(last);
    let n = L.pieces.reduce((t, x) => t + x.entries.length, 0), chars = L.pieces.reduce((t, x) => t + x.chars, 0);
    while (L.pieces.length > 1 && (n > LOG_MAX || chars > LOG_CHARS)) { const x = L.pieces.shift(); n -= x.entries.length; chars -= x.chars; L.dirty.delete(x); L.gone.push(logKey(x.n)); }
    return chars;
  }
  // What logAdd changed, to write (with the meta, in the same put) and to delete.
  logWrites() {
    const L = this.log, put = {}, del = [...L.gone, ...(L.old ? ['log'] : [])];
    for (const x of L.dirty) put[logKey(x.n)] = x.entries;
    L.dirty = new Set(); L.gone = []; L.old = false;
    return { put, del };
  }
  // Whether its owner's plan leaves it read-only, and the owner's space (id: given by the worker, never by the body).
  // (It tells the owner's account what it takes now.)
  async locked(meta, id) {
    if (!id || !this.env.ACCOUNTS) return { locked: false };
    const r = await this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('u:' + meta.owner)).fetch('https://do/docs-locked', { method: 'POST', body: JSON.stringify({ id, bytes: await this.bytes(meta) }) });
    return r.ok ? r.json() : { locked: false };
  }
  // A poll's answers by link, all together: its pieces, and what was kept whole before them.
  async pollVotes(pid) {
    const st = this.ctx.storage, all = { ...((await st.get('pv:' + pid)) || {}) };
    for (const piece of (await st.list({ prefix: `pvb:${pid}:` })).values()) Object.assign(all, piece);
    return all;
  }
  // One request at a time (see Account.fetch). Changes ('ops', from the app; 'change', from the public API) wait
  // together: see drain().
  fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop();
    if (op === 'ops' || op === 'change') return this.edit(op, req);
    const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p;
  }
  async edit(op, req) {
    const a = await req.json();
    return new Promise((resolve, reject) => {
      this.edits.push({ op, a, resolve, reject });
      if (this.edits.length === 1) { const run = () => this.drain(); this.queue = (this.queue || Promise.resolve()).then(run, run).catch(() => {}); }
    });
  }
  // The changes that came while the object was busy, in their order, each checked and applied as when they came one
  // by one (its own answer, its own rev, its own refusal), and then written once: the deck's slides that changed, the
  // log, the meta. The owner's account is asked once whether it may change, not twice per change. Before, each change
  // was a full turn (read the log whole, write it whole, ask the account…): 50 at once on one presentation waited for
  // each other ~22–26 ms each here, now 5–8 ms (local stress test, 2026-10-11). Something that breaks halfway (storage): every
  // change of the group fails, and the deck is read again as it was stored.
  async drain() {
    const group = this.edits; this.edits = [];
    let replies;
    try { replies = await this.applyEdits(group); }
    catch (e) { this.doc = null; this.log = null; this.versions = null; for (const x of group) x.reject(e); return; }
    group.forEach((x, i) => x.resolve(replies[i]));
  }
  async applyEdits(group) {
    const st = this.ctx.storage, maxBytes = docsSettings(this.env).maxMb * 1024 * 1024;
    if (!(await this.load())) return group.map(() => this.json({ error: 'not found' }, 404));
    const { meta } = this.doc, out = [], done = [];
    let lk = null, used = 0, snap = null, touched = new Set();
    // (A change refused after it was applied — too large, no space —: the deck read again as stored, with the earlier
    // changes of this group applied again.)
    const undo = async () => { this.doc = null; await this.load(); this.doc.meta = meta; for (const ops of done) applyOps(this.doc.deck, ops); this.size = null; await this.bytes(meta); };
    for (const x of group) {
      const a = x.a, role = this.roleOf(meta, a.who, a.r), deck = this.doc.deck;
      if (meta.trashed && role !== 'owner') { out.push(this.json({ error: 'not found' }, 404)); continue; }
      if (!role) { out.push(this.json({ error: a.who?.sub ? 'forbidden' : 'sign in' }, a.who?.sub ? 403 : 401)); continue; }
      const at = r => ROLE_RANK[role] >= ROLE_RANK[r], only = this.scopeOf(meta, a.who, role, a.r);
      let ops, res = null;
      if (x.op === 'change') {                             // the public API: its change made here, on a copy, and compared
        if (!at('edit') || !EDITS[a.action]) { out.push(this.json({ error: 'forbidden' }, 403)); continue; }
        const next = structuredClone(deck);
        // (Whatever goes wrong in it, only its own answer: the copy is thrown away, the rest of the group goes on.)
        try { res = EDITS[a.action](next, a.args || {}); } catch (e) { if (!e.status) console.log('change', a.action, e?.message); out.push(this.json({ error: e.status ? e.message : 'error' }, e.status || 500)); continue; }
        ops = diff(deck, next);
      } else {
        if (!at('comment')) { out.push(this.json({ error: 'forbidden' }, 403)); continue; }
        ops = Array.isArray(a.ops) ? a.ops : [];
      }
      const roleForOps = role === 'owner' ? 'edit' : role;
      const ok = ops.filter(o => o && Array.isArray(o.p) && o.p.length && o.p.length < 40 && allowed(o, roleForOps));
      if (ok.length !== ops.length) { out.push(this.json({ error: 'forbidden' }, 403)); continue; }   // (all or nothing: nothing half-applied)
      if (only && ok.some(o => !only.includes(o.p[1]))) { out.push(this.json({ error: 'forbidden' }, 403)); continue; }   // (comments only on the slides they see)
      if (!ok.length) { out.push({ rev: meta.rev, ...(res && { out: res }) }); continue; }
      if (!lk) { lk = await this.locked(meta, a.id); used = lk.storage?.used || 0; }
      if (lk.locked) { out.push(this.json({ error: 'read only', reason: 'over limit', limit: lk.limit }, 402)); continue; }
      await this.bytes(meta); const oldSize = this.size;
      const last = snap ? snap.at : (await this.versionList()).slice(-1)[0]?.at || 0;
      const before = at('edit') && Date.now() - last > VERSION_EVERY ? JSON.stringify(this.doc.deck) : null;
      applyOps(this.doc.deck, ok);
      const size = JSON.stringify(this.doc.deck).length;
      if (size > maxBytes) { await undo(); out.push(this.json({ error: 'too large' }, 413)); continue; }
      // The owner's space full: nothing that makes it bigger (what makes it smaller, yes — that frees space; then
      // without the saved version, which would take more).
      let keep = before;
      if (lk.storage && keep && size <= oldSize && used + size - oldSize + keep.length > lk.storage.quota) keep = null;
      const grows = size - oldSize + (keep ? keep.length : 0);
      if (lk.storage && grows > 0 && used + grows > lk.storage.quota) { await undo(); out.push(this.json({ error: 'storage full', used, quota: lk.storage.quota }, 402)); continue; }
      used += grows; this.size = size; done.push(ok);
      if (keep) snap = { text: keep, rev: meta.rev, at: Date.now() };
      meta.rev++; meta.updated = Date.now(); meta.name = nameOf(this.doc.deck);
      meta.logChars = await this.logAdd({ rev: meta.rev, ops: ok });
      // (Which slides to write again: those the operations reach; all of them if the list itself is replaced.)
      for (const o of ok) if (touched && o.p[0] === 'slides') { if (o.p.length === 1) touched = null; else if (o.p[1] !== '#') touched.add(o.p[1]); }
      out.push({ rev: meta.rev, ...(res && { out: res }), changed: true });
    }
    if (!done.length) return out.map(r => (r instanceof Response ? r : this.json(r)));
    if (snap) await this.snapshot(snap.text, snap.rev);
    this.parts = await writeDeck(st, this.doc.deck, this.parts, touched);
    const { put, del } = this.logWrites();
    await st.put({ meta, ...put }); if (del.length) await st.delete(del);
    const after = { name: meta.name, owner: meta.owner, bytes: await this.bytes(meta), ...indexOf(this.doc.deck) };
    // (The owner's list is told once per group: the last change's answer carries it; the others, stale: true.)
    const lastChanged = out.findLastIndex(r => r.changed);
    return out.map((r, i) => (r instanceof Response ? r : this.json(r.changed ? { rev: r.rev, ...(r.out && { out: r.out }), ...after, ...(i !== lastChanged && { stale: true }) } : r)));
  }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    // The administration only (admin.js /docs/restore): the document as it was at a moment of the last 30 days, with
    // Cloudflare's point-in-time recovery (every Durable Object here is SQLite-backed: kept by Cloudflare itself, no
    // copies of ours). → the bookmark of now, to undo it; the object restarts with the old state.
    if (op === 'pitr') {
      if (typeof st.getBookmarkForTime !== 'function') return this.json({ error: 'not supported' }, 501);
      const now = Date.now(), at = +a.at;
      if (!a.bookmark && !(at > now - 30 * DAY && at < now)) return this.json({ error: 'bad time' }, 400);
      const before = await st.getCurrentBookmark(), to = a.bookmark ? String(a.bookmark) : await st.getBookmarkForTime(at);
      await st.onNextSessionRestoreBookmark(to);
      this.doc = null; this.parts = null; this.log = null; this.versions = null;
      setTimeout(() => { try { this.ctx.abort('restore'); } catch {} }, 0);       // (after this answer: then it restarts restored)
      return this.json({ ok: true, before, to });
    }
    if (op === 'init') {
      const meta = { owner: a.owner, ownerEmail: a.ownerEmail, name: nameOf(a.deck), link: 'none', people: {}, rev: 1, created: Date.now(), updated: Date.now() };
      this.parts = await writeDeck(st, a.deck); this.doc = { meta, deck: a.deck }; this.size = null;
      this.log = { pieces: [], dirty: new Set(), gone: [], old: false }; this.versions = [];
      await st.put({ meta, versions: [] }); return this.json({ ok: true, rev: 1 });
    }
    const doc = await this.load(); if (!doc) return this.json({ error: 'not found' }, 404);
    const { meta } = doc, role = this.roleOf(meta, a.who, a.r);
    if (op === 'measure') return this.json({ bytes: await this.bytes(meta) });   // (storage.js: never routed from outside; the trash counts too)
    if (meta.trashed && role !== 'owner') return op === 'role' ? this.json({ role: null }) : this.json({ error: 'not found' }, 404);   // (in the trash: only for its owner)
    // A poll opened to be answered later by a link: anyone with that link, without a session; only that poll.
    if (op === 'poll-public' || op === 'poll-vote') {
      const b = doc.deck.slides.flatMap(sl => sl.blocks || []).find(x => x?.type === 'poll' && x.pollId === String(a.pid) && x.async && ASYNC_KINDS.includes(x.kind));
      if (!b || meta.trashed) return this.json({ error: 'not found' }, 404);
      if (op === 'poll-public') return this.json({ poll: publicPoll(b), name: meta.name, ...(b.login && { signed: !!a.sub }) });
      // (One vote per account: the voter is made from the account — the same for this owner's polls, live or by link, and
      // nobody else's —, never the one sent, which anyone can invent.)
      if (b.login && !a.sub) return this.json({ error: 'sign in' }, 401);
      const voter = b.login ? await voterOf(this.env, a.sub, meta.owner) : String(a.voter || '').slice(0, 40), ans = cleanAnswer(b, a.answer);
      if (!/^[\w-]{8,40}$/.test(voter) || ans === null) return this.json({ error: 'bad request' }, 400);
      const pid = b.pollId, old = await st.get('pv:' + pid);
      if (old) {                                             // (answers kept whole, from before the pieces: moved into them once)
        const pieces = {}; for (const [v, x] of Object.entries(old)) (pieces[pvPiece(pid, v)] ||= {})[v] = x;
        await st.put(pieces); await st.delete('pv:' + pid); this.pvN[pid] = Object.keys(old).length;
      }
      // (How many answered: counted once while this object is awake — requests here go one at a time —, not stored.)
      this.pvN[pid] ??= Object.keys(await this.pollVotes(pid)).length;
      const key = pvPiece(pid, voter), piece = (await st.get(key)) || {};
      if (!(voter in piece)) { if (this.pvN[pid] >= POLL_MAX) return this.json({ error: 'full' }, 409); this.pvN[pid]++; }
      piece[voter] = ans; await st.put(key, piece);
      return this.json({ ok: true });
    }
    if (op === 'role') return this.json({ role });                 // (for the video calls: only who may open it)
    if (!role) return this.json({ error: a.who?.sub ? 'forbidden' : 'sign in' }, a.who?.sub ? 403 : 401);
    const at = r => ROLE_RANK[role] >= ROLE_RANK[r], only = this.scopeOf(meta, a.who, role, a.r);
    const sharing = () => ({ link: meta.link, people: meta.people, until: meta.until || {}, linkUntil: meta.linkUntil || null, noCopy: !!meta.noCopy, editorsShare: !!meta.editorsShare,
      slidesOf: meta.slidesOf || {}, linkSlides: meta.linkSlides || null, team: meta.team?.role || 'none' });
    // (What this person gets: for «present», the audience's slides; with a choice of slides, only those.)
    const seen = () => onlySlides(role === 'present' ? forAudience(doc.deck) : doc.deck, only);
    const manages = role === 'owner' || (role === 'edit' && !!meta.editorsShare);
    // (Copying stopped: for who can only present, view or comment, when the owner says so.)
    const noCopy = !at('edit') && (role === 'present' || !!meta.noCopy);
    switch (op) {
      case 'get': {
        // A tracked link (not its owner trying it): the email first when asked, then the open counted — and its owner told.
        const tl = role !== 'owner' && this.tracked(meta, a.r); let notify = null;
        if (tl) {
          const email = String(a.email || '').trim().toLowerCase().slice(0, 254), named = String(a.visitorName || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
          if (tl.ask && !EMAIL.test(email)) return this.json({ ask: true, name: meta.name });
          const all = (await st.get('track')) || {}, e = all[a.r] ||= { opens: 0, ms: 0, slides: {}, people: [] }, now = Date.now();
          e.opens++; e.first ||= now; e.last = now;
          if (EMAIL.test(email) && !e.people.some(p => p.email === email) && e.people.length < TRACK_PEOPLE) e.people.push({ email, name: named, at: now });
          if (meta.notifyOpens && !(e.told > now - TRACK_QUIET)) { e.told = now; notify = { owner: meta.owner, label: tl.label || '', who: EMAIL.test(email) ? (named ? `${named} (${email})` : email) : '', name: meta.name }; }
          await st.put('track', all);
        }
        const lk = await this.locked(meta, a.id);
        return this.json({ deck: seen(), rev: meta.rev, role, ...(only && { only: true }), name: meta.name, updated: meta.updated, thumbAt: meta.thumbAt || null, ...(lk.locked && { readOnly: true, reason: 'over limit', limit: lk.limit }),
          ...(noCopy && { noCopy: true }), ...(manages && { sharing: sharing() }), ...(role !== 'owner' && { owner: meta.ownerEmail }), ...(notify && { notify }) });
      }
      case 'since': {
        const log = (await this.logLoad()).pieces.flatMap(x => x.entries), from = +a.rev || 0;
        if (from === meta.rev) return this.json({ rev: meta.rev, ops: [] });
        if (role === 'present' || only) return this.json({ rev: meta.rev, deck: seen() });   // (the changes could carry notes, or other slides: the whole, cleaned)
        const first = log[0]?.rev;
        if (first == null || from < first - 1 || from > meta.rev) return this.json({ rev: meta.rev, deck: doc.deck });
        return this.json({ rev: meta.rev, ops: log.filter(e => e.rev > from).flatMap(e => e.ops) });
      }
      case 'share': {
        if (!manages) return this.json({ error: 'forbidden' }, 403);
        // (The settings themselves are the owner's alone.)
        if (role !== 'owner' && (a.noCopy !== undefined || a.editorsShare !== undefined)) return this.json({ error: 'forbidden' }, 403);
        const before = { ...meta.people }, teamBefore = meta.team || null;
        // (The team: the owner's own, only by the owner — who.team is checked by the worker.)
        if (a.team !== undefined) {
          if (role !== 'owner' || (a.team !== 'none' && !a.who?.team) || !['none', ...ROLES].includes(a.team)) return this.json({ error: 'forbidden' }, 403);
          meta.team = a.team === 'none' ? null : { id: a.who.team, role: a.team };
        }
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
        // Only some slides: ids of this deck (in any order; kept in the deck's), none for editors.
        const ids = v => { if (v == null) return null; if (!Array.isArray(v) || v.length > MAX_SLIDE_IDS) throw 0;
          const have = new Set(doc.deck.slides.map(x => x.id)), out = [...new Set(v.map(String))].filter(x => have.has(x)); if (!out.length) throw 0; return out; };
        try {
          if (a.linkSlides !== undefined) meta.linkSlides = ids(a.linkSlides);
          if (a.slidesOf !== undefined) {
            const of = {};
            for (const [e, v] of Object.entries(a.slidesOf && typeof a.slidesOf === 'object' ? a.slidesOf : {})) {
              const email = String(e).trim().toLowerCase(); if (v == null) continue;
              if (!meta.people[email]) throw 0;
              of[email] = ids(v);
            }
            meta.slidesOf = of;
          }
        } catch { return this.json({ error: 'bad request' }, 400); }
        for (const e of Object.keys(meta.slidesOf || {})) if (!meta.people[e] || meta.people[e] === 'edit') delete meta.slidesOf[e];
        if (meta.link === 'edit' || meta.link === 'none') meta.linkSlides = null;
        if (a.noCopy !== undefined) meta.noCopy = !!a.noCopy;
        if (a.editorsShare !== undefined) meta.editorsShare = !!a.editorsShare;
        await st.put('meta', meta);
        return this.json({ ok: true, sharing: sharing(), before, teamBefore, team: meta.team || null, name: meta.name, ownerEmail: meta.ownerEmail });
      }
      case 'delete': {
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const people = Object.keys(meta.people), team = meta.team || null; await st.deleteAll(); this.doc = null; this.pvN = {}; this.log = null; this.versions = null;
        return this.json({ ok: true, people, team });
      }
      case 'trash': {                                       // { on }: into the trash (or back)
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        meta.trashed = a.on ? Date.now() : null; await st.put('meta', meta);
        return this.json({ ok: true, people: meta.people, name: meta.name, team: meta.team || null });
      }
      case 'thumb': {                                       // { thumb }: the picture of its first slide, for the lists
        if (!at('edit')) return this.json({ error: 'forbidden' }, 403);
        const th = String(a.thumb || '');
        if (th.length > THUMB_CHARS || !THUMB.test(th)) return this.json({ error: 'bad thumb' }, 400);
        meta.thumbAt = Date.now(); meta.thumbChars = th.length; await st.put({ thumb: th, meta });
        return this.json({ at: meta.thumbAt, owner: meta.owner });
      }
      // (With only some slides, not even the first one's picture: it may not be among them.)
      // The class at its own pace (as Pear Deck's teacher dashboard): where each one is and their marks.
      case 'progress': {
        const st2 = (await st.get('sp')) || {}, voter = String(a.voter || '').slice(0, 40);
        if (!/^[\w-]{8,40}$/.test(voter) || voter in Object.prototype) return this.json({ error: 'bad request' }, 400);   // (a name of every object, no)
        if (!(voter in st2) && Object.keys(st2).length >= PROGRESS_MAX) return this.json({ error: 'full' }, 409);
        const me2 = st2[voter] || { name: '', slide: 0, of: 0, graded: 0, scores: {}, first: Date.now() };
        if (a.name != null) me2.name = String(a.name).trim().slice(0, 40);
        if (Number.isFinite(+a.slide)) me2.slide = Math.max(0, Math.min(999, Math.round(+a.slide)));
        if (Number.isFinite(+a.of)) me2.of = Math.max(0, Math.min(999, Math.round(+a.of)));
        if (Number.isFinite(+a.graded)) me2.graded = Math.max(0, Math.min(200, Math.round(+a.graded)));
        if (a.score && typeof a.score === 'object' && Object.keys(me2.scores).length < 200) me2.scores[String(a.score.id).slice(0, 60)] = Math.max(0, Math.min(1, +a.score.s || 0));
        me2.at = Date.now(); st2[voter] = me2; await st.put('sp', st2);
        return this.json({ ok: true });
      }
      case 'progress-get': return at('edit') ? this.json({ people: Object.entries((await st.get('sp')) || {}).map(([voter, x]) => ({ voter, ...x })) }) : this.json({ error: 'forbidden' }, 403);
      case 'progress-clear': if (!at('edit')) return this.json({ error: 'forbidden' }, 403); await st.delete('sp'); return this.json({ ok: true });
      case 'poll-votes': return at('edit') ? this.json({ votes: await this.pollVotes(String(a.pid)) }) : this.json({ error: 'forbidden' }, 403);
      case 'thumb-get': return this.json(only ? { thumb: null, at: null } : { thumb: (await st.get('thumb')) || null, at: meta.thumbAt || null });
      case 'versions': return at('edit') ? this.json({ versions: (await st.get('versions')) || [] }) : this.json({ error: 'forbidden' }, 403);
      case 'version': {
        if (!at('edit')) return this.json({ error: 'forbidden' }, 403);
        const v = ((await st.get('versions')) || []).find(x => x.at === +a.at); if (!v) return this.json({ error: 'not found' }, 404);
        const parts = await readParts(st, `v:${v.at}:`); return this.json({ deck: JSON.parse(parts.join('')) });
      }
      case 'view': {                                         // a viewer's beacon: slide seen, for how long
        const slide = String(a.slide || '').slice(0, 40), ms = Math.max(0, Math.min(30 * 60e3, +a.ms || 0)), visitor = String(a.visitor || '').slice(0, 40);
        // (Not a name every object has — «__proto__», «constructor»: they would write on Object itself.)
        if (role === 'owner' || !slide || slide in Object.prototype || !/^[\w-]{8,40}$/.test(visitor) || visitor in Object.prototype) return this.json({ ok: true });
        const s = (await st.get('stats')) || { visitors: {}, slides: {}, first: Date.now() };
        const v = s.visitors[visitor] ||= { first: Date.now(), last: 0, ms: 0, slides: 0 };
        const sl = s.slides[slide] ||= { views: 0, ms: 0 };
        if (a.enter) { sl.views++; v.slides++; }
        sl.ms += ms; v.ms += ms; v.last = Date.now();
        const ids = Object.keys(s.visitors); if (ids.length > 2000) for (const k of ids.sort((x, y) => s.visitors[x].last - s.visitors[y].last).slice(0, ids.length - 2000)) delete s.visitors[k];
        await st.put('stats', s);
        // (By a tracked link: that recipient's time, slide by slide, and how far they got.)
        if (this.tracked(meta, a.r)) {
          const all = (await st.get('track')) || {}, e = all[a.r] ||= { opens: 0, ms: 0, slides: {}, people: [] }, n = doc.deck.slides.findIndex(x => x.id === slide) + 1;
          if (n > 0) { e.slides[slide] = (e.slides[slide] || 0) + ms; e.ms += ms; e.reached = Math.max(e.reached || 0, n); e.last = Date.now(); await st.put('track', all); }
        }
        return this.json({ ok: true });
      }
      case 'stats': {
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const s = (await st.get('stats')) || { visitors: {}, slides: {} }, vs = Object.values(s.visitors);
        return this.json({ visitors: vs.length, totalMs: vs.reduce((t, v) => t + v.ms, 0), last: Math.max(0, ...vs.map(v => v.last)) || null,
          slides: doc.deck.slides.map((sl, i) => ({ id: sl.id, n: i + 1, views: s.slides[sl.id]?.views || 0, ms: s.slides[sl.id]?.ms || 0 })),
          track: await this.trackList(meta), notify: !!meta.notifyOpens, of: doc.deck.slides.length });
      }
      case 'track': {                                        // the tracked links: one more, one less, or the notices on/off
        if (role !== 'owner') return this.json({ error: 'forbidden' }, 403);
        const track = meta.track ||= {}; let token = null;
        if (a.add) {
          if (Object.keys(track).length >= TRACK_MAX) return this.json({ error: 'too many' }, 409);
          token = random(12); track[token] = { label: String(a.add.label || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80), ask: !!a.add.ask, created: Date.now() };
        } else if (a.del) {
          if (!track[a.del]) return this.json({ error: 'not found' }, 404);
          delete track[a.del]; const all = (await st.get('track')) || {}; delete all[a.del]; await st.put('track', all);
        } else if (a.notify !== undefined) meta.notifyOpens = !!a.notify;
        else return this.json({ error: 'bad request' }, 400);
        await st.put('meta', meta);
        return this.json({ ok: true, ...(token && { token }), track: await this.trackList(meta), notify: !!meta.notifyOpens });
      }
    }
    return this.json({ error: 'unknown' }, 404);
  }
  // A version of the whole deck (before a change, at most one every half hour; the last ten).
  async snapshot(text, rev) {
    const st = this.ctx.storage, list = await this.versionList(), at = Date.now();
    await writeText(st, `v:${at}:`, text); list.push({ at, rev, bytes: text.length });
    while (list.length > VERSIONS) {
      const old = list.shift(), n = (await st.get(`v:${old.at}:n`)) || 0;
      await st.delete([`v:${old.at}:n`, ...Array.from({ length: n }, (_, i) => `v:${old.at}:${i}`)]);
    }
    await st.put('versions', list);
  }
}

// ---- Routes (called from api.js with the session, or none) -----------------------------------
const docOf = (env, id) => env.DOCS.get(env.DOCS.idFromName('doc:' + id));
// The team's list of documents shared with it (teams.js).
const teamDocs = async (env, team, op, body) => { if (!env.TEAMS || !team) return null; const r = await env.TEAMS.get(env.TEAMS.idFromName('team:' + team)).fetch('https://team/' + op, { method: 'POST', body: JSON.stringify(body) }); return r.json(); };
const ask = async (env, id, op, body) => { const r = await docOf(env, id).fetch('https://doc/' + op, { method: 'POST', body: JSON.stringify(body) }); return { status: r.status, data: await r.json() }; };
const ID = /^[\w-]{16,40}$/;

// Deleted for good (by its owner, or by the daily cron after TRASH_DAYS in the trash): the document,
// and its place in the owner's list and in the lists of whoever it was shared with.
// A change by the public API (publicapi.js; deckedit.js EDITS[action] with args), made by the document itself on its
// latest deck, with the role of `me`; then the owner's list in step, as after the app's changes. → { status, data }
// (data: the change's answer).
export async function editDeck(env, me, id, action, args) {
  const who = { sub: me.sub, email: me.email, ...(me.team && { team: me.team }) };
  const r = await ask(env, id, 'change', { who, id, action, args });
  if (r.status !== 200) return r;
  if (r.data.owner && !r.data.stale) await call(acct(env, r.data.owner), 'docs-touch', { id, name: r.data.name, slides: r.data.slides, text: r.data.text, bytes: r.data.bytes });
  return { status: 200, data: r.data.out || {} };
}
export async function purgeDoc(env, sub, id) {
  const r = await ask(env, id, 'delete', { who: { sub }, id });
  if (r.status !== 200 && r.status !== 404) return r;
  await call(acct(env, sub), 'docs-remove', { id });
  for (const e of r.data.people || []) await call(acct(env, 'e:' + e), 'inbox-remove', { id });
  if (r.data.team) await teamDocs(env, r.data.team.id, 'doc-remove', { id });
  return { status: 200, data: { ok: true } };
}
// A new one in my list (and in a folder of mine, if given), within the plan's limit.
async function create(env, me, deck, folder) {
  const s = docsSettings(env), id = random(16);
  const room = await call(acct(env, me.sub), 'docs-add', { id, name: nameOf(deck), limit: me.plan === 'pro' ? s.proDocs : s.freeDocs, folder: folder || null, bytes: JSON.stringify(deck).length, ...indexOf(deck) });
  if (!room.ok) return { status: 402, data: room.storage ? { error: 'storage full', used: room.storage.used, quota: room.storage.quota } : { error: 'doc limit', limit: room.limit } };
  const r = await ask(env, id, 'init', { owner: me.sub, ownerEmail: me.email, deck });
  return { status: 200, data: { id, rev: r.data.rev } };
}

// me: { sub, email, plan, features } or null.
export async function handleDocs(path, req, body, url, env, me, json) {
  const s = docsSettings(env);
  const who = me ? { sub: me.sub, email: me.email, ...(me.team && { team: me.team }) } : null;
  const reply = r => json(r.data, r.status);
  if (path === '/docs') {
    if (!me) return json({ error: 'no session' }, 401);
    const A = acct(env, me.sub);
    if (req.method === 'GET') {
      const mine = await call(A, 'docs-list'), inbox = await call(acct(env, 'e:' + me.email), 'inbox-list'), { folders } = await call(A, 'folders-list');
      return json({ mine: mine.docs, shared: inbox.docs, folders, limit: mine.limit ?? (me.plan === 'pro' ? s.proDocs : s.freeDocs), trashDays: TRASH_DAYS, storage: mine.storage || null });
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
  // Polls answered by a link: the poll and its answers (public), and the answers for the editor.
  const pm = path.match(/^\/docs\/([\w-]{16,40})\/(poll|pollvotes)\/([\w-]{4,40})$/);
  if (pm) {
    const [, pid, pkind, poll] = pm;
    if (pkind === 'pollvotes') { if (req.method !== 'GET') return json({ error: 'method' }, 405); if (!me) return json({ error: 'no session' }, 401); return reply(await ask(env, pid, 'poll-votes', { who, id: pid, pid: poll })); }
    // (who: only to know whose account votes, when the poll asks for one — never a role here.)
    if (req.method === 'GET') return reply(await ask(env, pid, 'poll-public', { who: null, sub: who?.sub || null, id: pid, pid: poll }));
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    return reply(await ask(env, pid, 'poll-vote', { who: null, sub: who?.sub || null, id: pid, pid: poll, voter: body.voter, answer: body.answer }));
  }
  const pg = path.match(/^\/docs\/([\w-]{16,40})\/progress(\/clear)?$/);
  if (pg) {
    const [, pid, clear] = pg;
    if (clear) { if (req.method !== 'POST') return json({ error: 'method' }, 405); if (!me) return json({ error: 'no session' }, 401); return reply(await ask(env, pid, 'progress-clear', { who, id: pid })); }
    if (req.method === 'GET') { if (!me) return json({ error: 'no session' }, 401); return reply(await ask(env, pid, 'progress-get', { who, id: pid })); }
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    return reply(await ask(env, pid, 'progress', { who, id: pid, voter: body.voter, name: body.name, slide: body.slide, of: body.of, graded: body.graded, score: body.score }));
  }
  const m = path.match(/^\/docs\/([\w-]{16,40})(?:\/(since|ops|share|delete|versions|version|view|stats|meta|trash|restore|duplicate|thumb|track))?$/);
  if (!m) return json({ error: 'not found' }, 404);
  const [, id, op = 'get'] = m;
  const GETS = ['get', 'since', 'versions', 'version', 'stats'];
  if (op !== 'thumb' && GETS.includes(op) !== (req.method === 'GET')) return json({ error: 'method' }, 405);
  if ((op === 'stats' || op === 'track') && !(me?.features || []).includes('analytics')) return json({ error: 'pro only' }, 402);
  const args = { who, ...(op === 'since' && { rev: url.searchParams.get('rev') }), ...(op === 'version' && { at: url.searchParams.get('at') }),
    ...(op === 'get' && url.searchParams.get('r') && { r: url.searchParams.get('r'), email: url.searchParams.get('e') || '', visitorName: url.searchParams.get('n') || '' }), ...(req.method === 'POST' && body) };
  args.who = who; args.id = id;                            // (never from the body)
  if (!me && (['ops', 'share', 'delete', 'meta', 'trash', 'restore', 'duplicate', 'track'].includes(op) || (op === 'thumb' && req.method === 'POST'))) return json({ error: 'no session' }, 401);
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
    if (r.data.team) await teamDocs(env, r.data.team.id, on ? 'doc-remove' : 'doc-add', { id, name: r.data.name, owner: me.email, role: r.data.team.role });
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
      if (me.team) await teamDocs(env, me.team, 'doc-rename', { id, name: r.data.name });   // (if it's in my team's list)
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
    // (The team's list: in it while shared with the team, with its role and name; out when not.)
    const tb = r.data.teamBefore, ta = r.data.team;
    if (tb && (!ta || tb.id !== ta.id)) await teamDocs(env, tb.id, 'doc-remove', { id });
    if (ta) await teamDocs(env, ta.id, 'doc-add', { id, name: r.data.name, owner: r.data.ownerEmail || me.email, role: ta.role });
    delete r.data.before; delete r.data.ownerEmail; delete r.data.teamBefore; delete r.data.team;
  } else if (op === 'get' && r.data.notify) {
    // (A tracked link opened: its owner told, if they asked — in their language, and they can stop these.)
    const n = r.data.notify; delete r.data.notify;
    const vars = { label: n.label, who: n.who, name: n.name, url: `${env.SITE_URL || 'https://revelaslides.com'}/app/?doc=${encodeURIComponent(id)}` };
    await call(acct(env, n.owner), 'mail-opened', { vars });
    await notifyHooks(env, n.owner, 'opened', vars).catch(() => {});          // (and to Slack, Teams…: hooks.js)
  } else if (op === 'ops') {
    // (A comment by someone else on my presentation: to my integrations — hooks.js.)
    // (A new comment comes as one item, or as the slide's whole new list — its last —, or as a reply.)
    const said = r.data.owner && r.data.owner !== me.sub ? (body.ops || []).filter(o => Array.isArray(o.p) && o.p.includes('comments') && o.v)
      .map(o => (Array.isArray(o.v) ? o.v.at(-1) : o.v)).find(v => typeof v?.text === 'string') : null;
    if (said) await notifyHooks(env, r.data.owner, 'comment', { name: r.data.name, by: me.name || me.email, text: said.text.slice(0, 500), url: `${env.SITE_URL || 'https://revelaslides.com'}/app/?doc=${encodeURIComponent(id)}` }).catch(() => {});
    if (r.data.owner && !r.data.stale) await call(acct(env, r.data.owner), 'docs-touch', { id, name: r.data.name, slides: r.data.slides, text: r.data.text, bytes: r.data.bytes });
    delete r.data.owner; delete r.data.slides; delete r.data.text; delete r.data.bytes; delete r.data.stale;
  }
  return json(r.data);
}
