// Revela's public API and its MCP server: presentations in Revela's cloud made, read and changed from outside —
// by a script (revelaslides.com/api/v1/…, with a personal API key) or by an AI app (Claude, ChatGPT…: the MCP
// server at revelaslides.com/api/mcp, connected by OAuth). What slides.com, Gamma or Pitch offer, on the same
// rules as the app: every call goes through docs.js with the role of whoever the key belongs to, the plan's limits
// apply, and nothing here can do what the app couldn't. The developer docs: docs/API.md (and revelaslides.com/developers).
//
// Slides are sent as specs — the kinds «Crear con IA» uses: title, bullets, steps, chart, table, code, math… — or as
// Markdown, and laid out here by the editor's own code (src/features/ai/specdeck.js): a deck made from outside has a
// design, its layouts and its colours, not plain boxes.
//
// Keys (My account ▸ Desarrolladores): rvk_<account>.<secret>; only a hash is kept, with a name, its last use and,
// for OAuth's, the app it was given to and when it ends. A key only opens /api/v1 and /api/mcp: not the account,
// payments or anything else (api.js checks it). OAuth access tokens are keys too (kind 'oauth', 30 days, with a
// refresh token rvr_…): «Desarrolladores» lists them and any can be revoked there.
//
//   GET  /api/keys                     → { keys: [{ id, name, kind, client?, created, last, expires? }] }   (session only)
//   POST /api/keys                     { name } → { id, key }   (the key is shown once)
//   POST /api/keys/:id/delete          → { ok }
//
//   GET  /api/v1/me                    → { email, name, plan, docs: { n, limit } }
//   GET  /api/v1/decks                 → { decks: [{ id, name, updated, slides, role, url }] }   (?q= filters by name)
//   POST /api/v1/decks                 { name?, design?, slides?: [spec] | markdown?: string, folder? } → { id, url, view }
//   GET  /api/v1/decks/:id             → { deck } (the whole document) | ?format=outline → { outline } | ?format=text → text
//   POST /api/v1/decks/:id/slides      { slides?: [spec] | markdown?, position? (1-based; default: at the end) } → { added: [ids] }
//   POST /api/v1/decks/:id/slides/:sid { spec?, notes?, hidden?, position? } → { ok }
//   POST /api/v1/decks/:id/slides/:sid/delete → { ok }
//   POST /api/v1/decks/:id/replace     { find, replace } → { changed }   (in every text of every slide and the notes)
//   POST /api/v1/decks/:id/rename      { name } → { ok }
//   POST /api/v1/decks/:id/share       { link: none|present|view|comment|edit } → { url }   (the link's role; people: in the app)
//   POST /api/v1/decks/:id/trash       → { ok }
//   GET  /api/v1/kinds                 → { kinds, doc, designs }   (what a spec can be)
//
//   POST /api/mcp                      JSON-RPC 2.0, MCP's Streamable HTTP (JSON answers; no server-sent events):
//                                      initialize, tools/list, tools/call, ping. 401 with WWW-Authenticate → OAuth.
//
// OAuth 2.1 for the MCP server (what Claude's and ChatGPT's connectors need):
//   GET  /.well-known/oauth-protected-resource[/api/mcp] · GET /.well-known/oauth-authorization-server
//   POST /api/oauth/register           dynamic client registration: the client id is its name and redirect addresses,
//                                      signed (MAIL_SECRET) — nothing stored, nothing to clean up
//   GET  /api/oauth/authorize          checks the request and sends the person to the app (/app/?connect=…), where they
//                                      sign in if needed and say yes (ui/dialogs/account.js handleConnectRequest)
//   POST /api/oauth/info               { req } → { client, host }   (what the app shows before asking)
//   POST /api/oauth/approve            { req } (session) → { redirect }   (a one-time code, 5 minutes, PKCE S256)
//   POST /api/oauth/token              authorization_code (+ code_verifier) | refresh_token → { access_token, refresh_token, … }

import { handleDocs } from './docs.js';
import { acct, call } from './api.js';
import { enc, b64url, unb64, random, sha256, hmac } from './util.js';
import { diff } from '../../src/features/live/collabsync.js';
import { deckFromSpecs, slidesFromSpecs, respecSlide, deckOutline, outlineText, markdownSpecs, cleanSpec, SPEC_DOC, KINDS, DESIGNS, DESIGN_DOC, MAX_SLIDES } from '../../src/features/ai/specdeck.js';
import { PHOTO_PROVIDERS, stockUsed } from './stock.js';
import { APP_VERSION } from '../../src/core/config.js';

export const KEYS_MAX = 20, ACCESS_DAYS = 30, REFRESH_DAYS = 90, CODE_MINUTES = 5, CONNECT_MINUTES = 15;
const SCOPE = 'decks';
const site = env => env.SITE_URL || 'https://revelaslides.com';
const secretOf = env => env.MAIL_SECRET || env.API_SECRET || '';

// ---- Keys ---------------------------------------------------------------------------------------------
// rvk_<account>.<secret> (access) and rvr_<account>.<secret> (refresh): the account in the clear, to find its
// Durable Object; the secret only as a hash there.
export const keyToken = (sub, secret, kind = 'k') => `rv${kind}_${b64url(enc.encode(sub))}.${secret}`;
export function parseKey(t, kind = 'k') {
  const m = new RegExp(`^rv${kind}_([\\w-]+)\\.([\\w-]{20,})$`).exec(String(t || ''));
  if (!m) return null;
  try { return { sub: unb64(m[1]), secret: m[2] }; } catch { return null; }
}
export const isKey = t => /^rvk_/.test(String(t || ''));

// The Account's side (api.js Account.fetch calls this with its storage): the keys of one account.
export async function keyOp(acc, op, a) {
  const now = Date.now(), all = await acc.get('apiKeys', {});
  const live = Object.fromEntries(Object.entries(all).filter(([, v]) => !v.expires || v.expires > now || (v.refreshUntil || 0) > now));
  const list = () => Object.values(live).sort((x, y) => y.created - x.created).map(v => ({ id: v.id, name: v.name, kind: v.kind, ...(v.client && { client: v.client }),
    created: v.created, last: v.last || null, ...(v.expires && { expires: v.expires }) }));
  switch (op) {
    case 'key-list': return { keys: list() };
    case 'key-add': {                                   // { name, kind: 'key'|'oauth', client? } → { id, secret, refresh? }
      if (Object.keys(live).length >= KEYS_MAX) {
        // (OAuth's come and go: the oldest of them makes room; personal keys are only removed by their owner.)
        const old = Object.entries(live).filter(([, v]) => v.kind === 'oauth').sort((x, y) => (x[1].last || x[1].created) - (y[1].last || y[1].created))[0];
        if (!old || a.kind !== 'oauth') return { error: 'too many keys', max: KEYS_MAX };
        delete live[old[0]];
      }
      const secret = random(32), id = random(6), oauth = a.kind === 'oauth', refresh = oauth ? random(32) : null;
      live[await sha256(secret)] = { id, name: String(a.name || '').slice(0, 60) || 'API', kind: oauth ? 'oauth' : 'key', ...(a.client && { client: String(a.client).slice(0, 80) }),
        created: now, last: null, ...(oauth && { expires: now + ACCESS_DAYS * 864e5, refresh: await sha256(refresh), refreshUntil: now + REFRESH_DAYS * 864e5 }) };
      await acc.put({ apiKeys: live });
      return { id, secret, ...(refresh && { refresh }) };
    }
    case 'key-check': {                                 // { secret } → { ok, id, kind }
      const h = await sha256(a.secret || ''), v = live[h];
      if (!v || (v.expires && v.expires < now)) return { ok: false };
      if (now - (v.last || 0) > 36e5) { live[h] = { ...v, last: now }; await acc.put({ apiKeys: live }); }   // (at most once an hour)
      return { ok: true, id: v.id, kind: v.kind, email: (await acc.get('profile', {})).email || '', ...((await acc.get('blocked', null)) && { blocked: true }) };
    }
    case 'key-refresh': {                               // { secret (the refresh one) } → { id, secret, refresh } (both new)
      const r = await sha256(a.secret || ''), e = Object.entries(live).find(([, v]) => v.refresh === r && v.refreshUntil > now);
      if (!e) return { ok: false };
      delete live[e[0]];
      const secret = random(32), refresh = random(32);
      live[await sha256(secret)] = { ...e[1], expires: now + ACCESS_DAYS * 864e5, refresh: await sha256(refresh), refreshUntil: now + REFRESH_DAYS * 864e5, last: now };
      await acc.put({ apiKeys: live });
      return { ok: true, id: e[1].id, secret, refresh };
    }
    case 'key-del': {                                   // { id } → { ok }
      const e = Object.entries(live).find(([, v]) => v.id === a.id);
      if (!e) return { ok: false };
      delete live[e[0]]; await acc.put({ apiKeys: live });
      return { ok: true };
    }
    // OAuth's one-time codes: kept here (the account that said yes) for CODE_MINUTES.
    case 'code-add': {                                  // { client, redirect, challenge } → { secret }
      const codes = Object.fromEntries(Object.entries(await acc.get('oauthCodes', {})).filter(([, v]) => v.exp > now).slice(-20));
      const secret = random(32);
      codes[await sha256(secret)] = { client: a.client, name: a.name, redirect: a.redirect, challenge: a.challenge, exp: now + CODE_MINUTES * 6e4 };
      await acc.put({ oauthCodes: codes });
      return { secret };
    }
    case 'code-take': {                                 // { secret } → the code's request, once
      const codes = await acc.get('oauthCodes', {}), h = await sha256(a.secret || ''), v = codes[h];
      if (v) { delete codes[h]; await acc.put({ oauthCodes: codes }); }
      return v && v.exp > now ? { ok: true, ...v } : { ok: false };
    }
  }
  return null;
}

// The routes of «Desarrolladores» (a session of the app, never a key).
export async function handleKeys(path, req, body, me, A, json) {
  if (me.via === 'key') return json({ error: 'forbidden' }, 403);
  if (path === '/keys' && req.method === 'GET') return json(await call(A, 'key-list'));
  if (path === '/keys' && req.method === 'POST') {
    const r = await call(A, 'key-add', { name: body.name, kind: 'key' });
    return r.error ? json(r, 409) : json({ id: r.id, key: keyToken(me.sub, r.secret) });
  }
  const m = path.match(/^\/keys\/([\w-]{4,20})\/delete$/);
  if (m && req.method === 'POST') { const r = await call(A, 'key-del', { id: m[1] }); return json(r, r.ok ? 200 : 404); }
  return json({ error: 'not found' }, 404);
}

// ---- What the API and the MCP server can do ------------------------------------------------------------
class ApiError extends Error { constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; } }
const fail = (status, message, extra) => { throw new ApiError(status, message, extra); };
const ID = /^[\w-]{16,40}$/;
const str = v => (v == null ? '' : String(v));

// docs.js answers through `json`: here it hands back what it would have sent.
const capture = (data, status = 200) => ({ data, status });
async function docs(ctx, path, method = 'GET', body = {}, query = '') {
  const r = await handleDocs(path, { method, headers: new Headers() }, body, new URL('https://api.local' + path + query), ctx.env, ctx.who, capture);
  if (r.status >= 400) fail(r.status, r.data?.error || 'error', r.data);
  return r.data;
}
const links = (env, id) => ({ url: `${site(env)}/app/?doc=${encodeURIComponent(id)}`, view: `${site(env)}/app/view.html?doc=${encodeURIComponent(id)}` });
const deckId = id => { if (!ID.test(str(id))) fail(400, 'bad id'); return str(id); };
async function readDeck(ctx, id) {
  const r = await docs(ctx, '/docs/' + deckId(id));
  return { deck: r.deck, role: r.role, name: r.name };
}
// A change: the deck read, changed by `fn` on a copy, and only what changed sent (as the app's own edits: docs.js ops,
// checked against the role there).
async function change(ctx, id, fn) {
  const { deck, role } = await readDeck(ctx, id);
  if (!['edit', 'owner'].includes(role)) fail(403, 'forbidden');
  const next = structuredClone(deck), out = await fn(next);
  const ops = diff(deck, next);
  if (ops.length) await docs(ctx, `/docs/${id}/ops`, 'POST', { ops });
  return out;
}
// The specs sent: a list of slides, or Markdown.
function specsOf(a) {
  if (typeof a.markdown === 'string' && a.markdown.trim()) return markdownSpecs(a.markdown.slice(0, 200000));
  if (Array.isArray(a.slides)) { if (a.slides.length > MAX_SLIDES) fail(400, `at most ${MAX_SLIDES} slides at once`); return a.slides; }
  return [];
}
// A real photo for a spec that asks for one (image_search: words, in English best): the first of Unsplash or Pexels,
// with its author's credit, as the editor's «Buscar fotos». Without those keys, or nothing found: the slide without it.
async function findPictures(ctx, specs) {
  const env = ctx.env, want = specs.filter(sp => sp && typeof sp.image_search === 'string' && sp.image_search.trim() && !sp.image_url).slice(0, 12);
  if (!want.length) return;
  const P = ['unsplash', 'pexels'].map(k => PHOTO_PROVIDERS[k]).find(p => p?.key(env)); if (!P) return;
  await Promise.all(want.map(async sp => {
    try {
      const [u, headers] = P.search(env, sp.image_search.slice(0, 100), 1), r = await (env.FETCH || fetch)(u, { headers });
      const x = r.ok ? P.list(await r.json())[0] : null;
      if (x?.src?.startsWith('https://')) Object.assign(sp, { image_url: x.src, image_alt: sp.image_search, ...(x.width && x.height && { image_width: x.width, image_height: x.height }), ...(x.author && { image_credit: `${x.author} / ${x.source}` }) });
      if (x?.source === 'Unsplash') await stockUsed(env, { provider: 'unsplash', id: x.id }, () => null);   // (Unsplash asks to be told)
    } catch {}
  }));
}
const position = (p, n) => (Number.isInteger(+p) && +p >= 1 ? Math.min(n, +p - 1) : n);
// Every text in a deck (objects' HTML, tables' cells, notes), for find-and-replace: only text between tags.
function replaceIn(deck, find, rep) {
  let n = 0;
  const swap = html => String(html).replace(/(^|>)([^<]*)/g, (m, a, t) => { const parts = t.split(find); n += parts.length - 1; return a + parts.join(rep); });
  const escd = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f0 = find; find = escd(f0); rep = escd(rep);
  for (const s of deck.slides || []) {
    for (const b of s.blocks || []) {
      if (typeof b.html === 'string') b.html = swap(b.html);
      if (Array.isArray(b.rows)) b.rows = b.rows.map(r => r.map(c => (typeof c === 'string' ? swap(c) : c && typeof c.html === 'string' ? { ...c, html: swap(c.html) } : c)));
    }
    if (typeof s.notes === 'string' && s.notes.includes(f0)) { n += s.notes.split(f0).length - 1; s.notes = s.notes.split(f0).join(rep.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
  }
  return n;
}

export const ACTIONS = {
  async me(ctx) {
    const p = await call(acct(ctx.env, ctx.me.sub), 'me');
    return { email: p.email, name: p.name, plan: p.plan, docs: p.docs };
  },
  async list(ctx, a = {}) {
    const r = await docs(ctx, '/docs'), q = str(a.query || a.q).toLowerCase();
    const decks = [...r.mine.filter(d => !d.trashed).map(d => ({ id: d.id, name: d.name, updated: d.updated, slides: d.slides, role: 'owner', ...(d.readOnly && { readOnly: true }) })),
      ...r.shared.map(d => ({ id: d.id, name: d.name, updated: d.at, role: d.role, owner: d.owner }))]
      .filter(d => !q || str(d.name).toLowerCase().includes(q)).map(d => ({ ...d, url: links(ctx.env, d.id).url }));
    return { decks, limit: r.limit };
  },
  async create(ctx, a = {}) {
    const specs = specsOf(a); await findPictures(ctx, specs);
    const deck = deckFromSpecs({ name: a.name || a.title || '', design: a.design, slides: specs });
    const r = await docs(ctx, '/docs', 'POST', { deck, ...(typeof a.folder === 'string' && { folder: a.folder }) });
    return { id: r.id, name: deck.name, slides: deck.slides.length, ...links(ctx.env, r.id) };
  },
  async get(ctx, a = {}) {
    const { deck, role } = await readDeck(ctx, a.id);
    if (a.format === 'outline' || a.format === 'text') { const o = deckOutline(deck); return a.format === 'text' ? { text: outlineText(o), role } : { outline: o, role }; }
    return { deck, role };
  },
  async addSlides(ctx, a = {}) {
    const specs = specsOf(a); if (!specs.length) fail(400, 'no slides');
    await findPictures(ctx, specs);
    return change(ctx, a.id, deck => {
      const at = position(a.position, deck.slides.length), made = slidesFromSpecs(deck, specs, at);
      const sec = deck.slides[at - 1]?.sectionId || null; made.forEach(s => (s.sectionId = sec));
      deck.slides.splice(at, 0, ...made);
      return { added: made.map(s => s.id) };
    });
  },
  async updateSlide(ctx, a = {}) {
    if (a.spec) await findPictures(ctx, [a.spec]);
    return change(ctx, a.id, deck => {
      const s = (deck.slides || []).find(x => x.id === a.slide); if (!s) fail(404, 'no such slide');
      if (a.spec) { if (!cleanSpec(a.spec)) fail(400, 'bad spec'); respecSlide(deck, s, a.spec); }
      if (typeof a.notes === 'string') s.notes = a.notes.slice(0, 20000);
      if (typeof a.hidden === 'boolean') s.hidden = a.hidden;
      if (a.position != null) { const i = deck.slides.indexOf(s); deck.slides.splice(i, 1); deck.slides.splice(position(a.position, deck.slides.length), 0, s); }
      return { ok: true };
    });
  },
  async deleteSlides(ctx, a = {}) {
    const ids = (Array.isArray(a.slides) ? a.slides : [a.slide]).map(str);
    return change(ctx, a.id, deck => {
      const keep = deck.slides.filter(s => !ids.includes(s.id));
      if (keep.length === deck.slides.length) fail(404, 'no such slide');
      if (!keep.length) fail(400, 'a deck keeps one slide at least');
      deck.slides = keep;
      return { ok: true, slides: keep.length };
    });
  },
  async replace(ctx, a = {}) {
    const find = str(a.find); if (!find) fail(400, 'find is empty');
    return change(ctx, a.id, deck => ({ changed: replaceIn(deck, find, str(a.replace)) }));
  },
  async rename(ctx, a = {}) {
    const name = str(a.name).trim().slice(0, 200); if (!name) fail(400, 'no name');
    await docs(ctx, `/docs/${deckId(a.id)}/meta`, 'POST', { name });
    return { ok: true };
  },
  async share(ctx, a = {}) {
    const link = str(a.link || 'view'); if (!['none', 'present', 'view', 'comment', 'edit'].includes(link)) fail(400, 'link: none, present, view, comment or edit');
    const id = deckId(a.id);
    await docs(ctx, `/docs/${id}/share`, 'POST', { link });   // (only the link's role: people, dates and the rest as they were)
    return { link, ...(link !== 'none' && { url: link === 'present' ? links(ctx.env, id).view : links(ctx.env, id).url }) };
  },
  async trash(ctx, a = {}) { await docs(ctx, `/docs/${deckId(a.id)}/trash`, 'POST'); return { ok: true }; },
  async kinds() { return { kinds: KINDS, designs: DESIGNS, doc: SPEC_DOC }; },
};

// ---- REST ------------------------------------------------------------------------------------------------
export async function handleV1(path, req, body, url, env, me, json) {
  const prof = await call(acct(env, me.sub), 'me');
  const ctx = { env, me, who: { sub: me.sub, email: prof.email, name: prof.name, plan: prof.plan, features: prof.features } };
  const GET = req.method === 'GET', POST = req.method === 'POST', q = Object.fromEntries(url.searchParams);
  const route = () => {
    if (path === '/v1/me' && GET) return ['me'];
    if (path === '/v1/kinds' && GET) return ['kinds'];
    if (path === '/v1/decks') return GET ? ['list', q] : POST ? ['create', body] : null;
    let m = path.match(/^\/v1\/decks\/([\w-]+)$/);
    if (m && GET) return ['get', { ...q, id: m[1] }];
    m = path.match(/^\/v1\/decks\/([\w-]+)\/(slides|replace|rename|share|trash)$/);
    if (m && POST) return [{ slides: 'addSlides' }[m[2]] || m[2], { ...body, id: m[1] }];
    m = path.match(/^\/v1\/decks\/([\w-]+)\/slides\/([\w-]+)(\/delete)?$/);
    if (m && POST) return [m[3] ? 'deleteSlides' : 'updateSlide', { ...body, id: m[1], slide: m[2] }];
    return null;
  };
  const r = route(); if (!r) return json({ error: 'not found' }, 404);
  try {
    const out = await ACTIONS[r[0]](ctx, r[1] || {});
    if (r[0] === 'get' && q.format === 'text') return new Response(out.text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    return json(out);
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message, ...e.extra }, e.status);
    throw e;
  }
}

// ---- MCP ------------------------------------------------------------------------------------------------
const SLIDE_SCHEMA = { type: 'object', description: 'One slide: {"kind": "...", ...the fields of that kind}. Optional on any kind: "notes" (what the presenter says), "image_url" (https) or "image_search" (words to find a real photo).', additionalProperties: true };
const DECK_ID = { type: 'string', description: 'The presentation\'s id (from list_presentations or create_presentation).' };
export const TOOLS = [
  { name: 'list_presentations', action: 'list', title: 'List presentations', description: 'Lists the presentations in the user\'s Revela cloud (their own and those shared with them), newest first, with their ids and links.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Only those whose name contains this.' } } }, annotations: { readOnlyHint: true } },
  { name: 'get_presentation', action: 'get', title: 'Read a presentation', description: 'Reads a presentation: each slide\'s id, title, texts, objects (charts, pictures, code…) and speaker notes. Use the slide ids to change slides.',
    inputSchema: { type: 'object', properties: { id: DECK_ID }, required: ['id'] }, annotations: { readOnlyHint: true }, args: a => ({ ...a, format: 'text' }) },
  { name: 'create_presentation', action: 'create', title: 'Create a presentation', description: `Creates a new presentation in the user's Revela cloud from slides (specs) or from Markdown, laid out with one of Revela's designs, and returns its link to open, edit and present it.

${SPEC_DOC}

Designs: ${DESIGN_DOC}.
Pictures: "image_url" (an https address) or "image_search" (a few words, best in English: a real photo is found). Markdown instead of slides: reveal.js style, "---" between slides, the first heading is the title, "Note:" starts the speaker notes.`,
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'The presentation\'s title.' }, design: { type: 'string', enum: DESIGNS }, slides: { type: 'array', items: SLIDE_SCHEMA, maxItems: MAX_SLIDES }, markdown: { type: 'string' } }, required: ['name'] } },
  { name: 'add_slides', action: 'addSlides', title: 'Add slides', description: 'Adds slides (the same specs as create_presentation, or Markdown) to a presentation, at the end or at a position; they take its design.',
    inputSchema: { type: 'object', properties: { id: DECK_ID, slides: { type: 'array', items: SLIDE_SCHEMA, maxItems: MAX_SLIDES }, markdown: { type: 'string' }, position: { type: 'integer', minimum: 1, description: '1-based place for the first new slide; default: at the end.' } }, required: ['id'] } },
  { name: 'update_slide', action: 'updateSlide', title: 'Change a slide', description: 'Changes one slide: rewrites its content from a spec (its pictures, charts, code and equations are kept), sets its speaker notes, hides or shows it, or moves it.',
    inputSchema: { type: 'object', properties: { id: DECK_ID, slide: { type: 'string', description: 'The slide\'s id (from get_presentation).' }, spec: SLIDE_SCHEMA, notes: { type: 'string' }, hidden: { type: 'boolean' }, position: { type: 'integer', minimum: 1 } }, required: ['id', 'slide'] } },
  { name: 'delete_slides', action: 'deleteSlides', title: 'Delete slides', description: 'Deletes slides from a presentation (their ids from get_presentation). The deck\'s history in Revela keeps earlier versions.',
    inputSchema: { type: 'object', properties: { id: DECK_ID, slides: { type: 'array', items: { type: 'string' }, minItems: 1 } }, required: ['id', 'slides'] }, annotations: { destructiveHint: true } },
  { name: 'replace_text', action: 'replace', title: 'Find and replace', description: 'Replaces a text everywhere in a presentation (slides and speaker notes); returns how many times.',
    inputSchema: { type: 'object', properties: { id: DECK_ID, find: { type: 'string' }, replace: { type: 'string' } }, required: ['id', 'find', 'replace'] } },
  { name: 'rename_presentation', action: 'rename', title: 'Rename', description: 'Gives a presentation a new name.',
    inputSchema: { type: 'object', properties: { id: DECK_ID, name: { type: 'string' } }, required: ['id', 'name'] } },
  { name: 'share_presentation', action: 'share', title: 'Share by link', description: 'Sets what anyone with the link can do — none, present (only the slideshow), view, comment or edit — and returns the link. Sharing with particular people is done in Revela.',
    inputSchema: { type: 'object', properties: { id: DECK_ID, link: { type: 'string', enum: ['none', 'present', 'view', 'comment', 'edit'] } }, required: ['id', 'link'] } },
];
const RPC = (id, result) => ({ jsonrpc: '2.0', id, result });
const RPCERR = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
export const MCP_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

async function rpc(ctx, m) {
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return RPCERR(m?.id, -32600, 'Invalid Request');
  const id = m.id, p = m.params || {};
  if (id === undefined) return null;                    // (a notification: notifications/initialized and the like)
  switch (m.method) {
    case 'initialize':
      return RPC(id, { protocolVersion: MCP_VERSIONS.includes(p.protocolVersion) ? p.protocolVersion : MCP_VERSIONS[0], capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'revela', title: 'Revela', version: APP_VERSION, websiteUrl: site(ctx.env) },
        instructions: 'Revela makes presentations. Create one with create_presentation (slides as specs of the kinds described there, or Markdown); read it with get_presentation to get slide ids before changing slides. Always give the user the link returned, to open it in Revela.' });
    case 'ping': return RPC(id, {});
    case 'tools/list': return RPC(id, { tools: TOOLS.map(({ action, args, ...t }) => t) });
    case 'tools/call': {
      const t = TOOLS.find(x => x.name === p.name); if (!t) return RPCERR(id, -32602, 'Unknown tool: ' + str(p.name).slice(0, 60));
      const a = p.arguments && typeof p.arguments === 'object' ? p.arguments : {};
      try {
        const out = await ACTIONS[t.action](ctx, t.args ? t.args(a) : a);
        const text = typeof out.text === 'string' ? out.text : JSON.stringify(out, null, 1);
        return RPC(id, { content: [{ type: 'text', text }], ...(typeof out.text !== 'string' && { structuredContent: out }) });
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        const why = { 'doc limit': `The user's plan allows ${e.extra?.limit ?? ''} presentations in Revela's cloud: they can delete some or move to Pro.`, 'storage full': 'The user\'s space in Revela is full.',
          'read only': 'That presentation is read only: its owner has more presentations than their plan allows.', forbidden: 'The user can\'t change that presentation.', 'not found': 'No such presentation.' }[e.message];
        return RPC(id, { isError: true, content: [{ type: 'text', text: why || `Error: ${e.message}` }] });
      }
    }
  }
  return RPCERR(id, -32601, 'Method not found');
}

export async function handleMcp(req, env, me, body, json) {
  if (req.method === 'GET') return json({ error: 'no server-sent events: POST JSON-RPC' }, 405, { Allow: 'POST' });
  if (req.method === 'DELETE') return new Response(null, { status: 204 });
  const prof = await call(acct(env, me.sub), 'me');
  const ctx = { env, me, who: { sub: me.sub, email: prof.email, name: prof.name, plan: prof.plan, features: prof.features } };
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.slice(0, 20).map(m => rpc(ctx, m)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const r = await rpc(ctx, body);
  return r ? json(r) : new Response(null, { status: 202 });
}

// ---- OAuth -------------------------------------------------------------------------------------------------
const okRedirect = u => { try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(x.hostname)); } catch { return false; } };
async function sign(env, kind, obj) { const body = b64url(enc.encode(JSON.stringify(obj))); return `${body}.${await hmac(secretOf(env), kind + ':' + body)}`; }
async function unsign(env, kind, t) {
  const [body, sig] = str(t).split('.'); if (!body || !sig || !secretOf(env)) return null;
  if ((await hmac(secretOf(env), kind + ':' + body)) !== sig) return null;
  try { return JSON.parse(unb64(body)); } catch { return null; }
}
const clientOf = (env, id) => unsign(env, 'oauth-client', str(id).replace(/^c_/, ''));

export function wellKnown(url, env) {
  const s = site(env), J = o => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } });
  if (url.pathname.startsWith('/.well-known/oauth-protected-resource'))
    return J({ resource: s + '/api/mcp', authorization_servers: [s], scopes_supported: [SCOPE], bearer_methods_supported: ['header'], resource_name: 'Revela', resource_documentation: s + '/developers' });
  if (url.pathname.startsWith('/.well-known/oauth-authorization-server') || url.pathname.startsWith('/.well-known/openid-configuration'))
    return J({ issuer: s, authorization_endpoint: s + '/api/oauth/authorize', token_endpoint: s + '/api/oauth/token', registration_endpoint: s + '/api/oauth/register',
      response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'], scopes_supported: [SCOPE], service_documentation: s + '/developers' });
  return null;
}
export const mcpChallenge = env => `Bearer resource_metadata="${site(env)}/.well-known/oauth-protected-resource/api/mcp", scope="${SCOPE}"`;

// The OAuth endpoints with no session: register, authorize, token (forms or JSON, from other sites: CORS open,
// no cookies).
export async function handleOAuth(path, req, env, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' };
  const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const form = async () => {
    const t = await req.text(); if (t.length > 20000) return {};
    if ((req.headers.get('Content-Type') || '').includes('json')) { try { return JSON.parse(t) || {}; } catch { return {}; } }
    return Object.fromEntries(new URLSearchParams(t));
  };
  // (OAuth signs its clients and requests with MAIL_SECRET: a server without it can't offer it.)
  if (!secretOf(env)) return J({ error: 'temporarily_unavailable', error_description: 'OAuth is not configured on this server' }, 503);
  if (path === '/oauth/register' && req.method === 'POST') {
    const a = await form(), uris = Array.isArray(a.redirect_uris) ? a.redirect_uris.map(str).slice(0, 5) : [];
    if (!uris.length || !uris.every(okRedirect) || uris.some(u => u.length > 500)) return J({ error: 'invalid_redirect_uri', error_description: 'https redirect URIs (or http on localhost)' }, 400);
    const name = str(a.client_name).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) || new URL(uris[0]).hostname;
    const client_id = 'c_' + await sign(env, 'oauth-client', { n: name, r: uris });
    return J({ client_id, client_name: name, redirect_uris: uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], client_id_issued_at: Math.floor(Date.now() / 1000) }, 201);
  }
  if (path === '/oauth/authorize' && req.method === 'GET') {
    const q = Object.fromEntries(url.searchParams), client = await clientOf(env, q.client_id);
    const page = (msg, status) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Revela</title><p style="font:16px system-ui;margin:3em auto;max-width:34em">${msg}</p>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    // (Without a known client or with another redirect address, nothing is sent back to it: an error here.)
    if (!client || !client.r.includes(q.redirect_uri)) return page('Esta aplicación no está registrada en Revela o su dirección de vuelta no coincide. / This app is not registered with Revela or its redirect address does not match.', 400);
    const back = (err) => { const u = new URL(q.redirect_uri); u.searchParams.set('error', err); if (q.state) u.searchParams.set('state', q.state); return Response.redirect(u.href, 302); };
    if (q.response_type !== 'code') return back('unsupported_response_type');
    if (!/^[\w-]{43,128}$/.test(q.code_challenge || '') || (q.code_challenge_method || 'plain') !== 'S256') return back('invalid_request');
    const reqT = await sign(env, 'oauth-req', { c: q.client_id, n: client.n, r: q.redirect_uri, s: str(q.state).slice(0, 500), ch: q.code_challenge, x: Date.now() + CONNECT_MINUTES * 6e4 });
    return Response.redirect(`${site(env)}/app/?connect=${encodeURIComponent(reqT)}`, 302);
  }
  if (path === '/oauth/token' && req.method === 'POST') {
    const a = await form(), bad = (e, d) => J({ error: e, ...(d && { error_description: d }) }, 400);
    if (a.grant_type === 'authorization_code') {
      const t = parseKey(a.code, 'c'); if (!t) return bad('invalid_grant');
      const c = await call(acct(env, t.sub), 'code-take', { secret: t.secret });
      if (!c.ok || c.client !== a.client_id || c.redirect !== a.redirect_uri) return bad('invalid_grant');
      if (!/^[\w.~-]{43,128}$/.test(a.code_verifier || '') || (await sha256(a.code_verifier)) !== c.challenge) return bad('invalid_grant', 'PKCE');
      const k = await call(acct(env, t.sub), 'key-add', { kind: 'oauth', name: c.name, client: c.name });
      if (k.error) return bad('server_error', k.error);
      return J({ access_token: keyToken(t.sub, k.secret), token_type: 'Bearer', expires_in: ACCESS_DAYS * 86400, refresh_token: keyToken(t.sub, k.refresh, 'r'), scope: SCOPE });
    }
    if (a.grant_type === 'refresh_token') {
      const t = parseKey(a.refresh_token, 'r'); if (!t) return bad('invalid_grant');
      const k = await call(acct(env, t.sub), 'key-refresh', { secret: t.secret });
      if (!k.ok) return bad('invalid_grant');
      return J({ access_token: keyToken(t.sub, k.secret), token_type: 'Bearer', expires_in: ACCESS_DAYS * 86400, refresh_token: keyToken(t.sub, k.refresh, 'r'), scope: SCOPE });
    }
    return bad('unsupported_grant_type');
  }
  return null;
}

// The app's side of «connect»: what is asking (before saying yes), and yes (with the app's session).
export async function connectInfo(env, body, json) {
  if (!secretOf(env)) return json({ error: 'not configured' }, 503);
  const r = await unsign(env, 'oauth-req', body.req);
  if (!r || r.x < Date.now()) return json({ error: 'expired' }, 410);
  // (deny: where «No» sends them — back to the app with access_denied, as OAuth asks.)
  const deny = new URL(r.r); deny.searchParams.set('error', 'access_denied'); if (r.s) deny.searchParams.set('state', r.s);
  return json({ client: r.n, host: new URL(r.r).host, deny: deny.href });
}
export async function connectApprove(env, me, body, json) {
  if (me.via === 'key') return json({ error: 'forbidden' }, 403);
  const r = await unsign(env, 'oauth-req', body.req);
  if (!r || r.x < Date.now()) return json({ error: 'expired' }, 410);
  const c = await call(acct(env, me.sub), 'code-add', { client: r.c, name: r.n, redirect: r.r, challenge: r.ch });
  const u = new URL(r.r); u.searchParams.set('code', keyToken(me.sub, c.secret, 'c')); if (r.s) u.searchParams.set('state', r.s);
  return json({ redirect: u.href });
}
