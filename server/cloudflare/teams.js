// Teams (a school, a company): people who share a plan paid per seat, a brand
// kit and templates. The admins invite by email; each person accepts from
// their own account. While the team is paid, its members have Pro.
//
//   GET  /api/team                     → { team, role, invites } (mine, and invitations for my email)
//   POST /api/team                     { name } → create one (I'm its admin)
//   POST /api/team/invite              { email, role? }        (admin; within the seats; they get an email)
//   POST /api/team/remove              { email }               (admin; or myself, to leave)
//   POST /api/team/accept              { id }                  (an invitation for my email)
//   POST /api/team/brand               { brand }               (admin: the team's brand kit)
//   POST /api/team/template            { name, deck }          (admin: add a template)
//   POST /api/team/template/delete     { id }                  (admin)
//   GET  /api/team/template?id=…       → { deck }              (members)
//   GET  /api/team/usage               → { seats, used, invited, members: [{ email, role, lastSeen, spentMonth, spent30, storage }], totals }   (admins)
//   GET  /api/team/docs                → { docs: [{ id, name, owner, role, at }] }   (members: what is shared with the team —
//                                       each document's owner chooses it in Compartir; the access itself is docs.js roleOf)
//   GET  /api/team/assets              → { assets: [{ id, name, type, bytes, by, at }], used, quota }   (members: the team's pictures)
//   GET  /api/team/assets/:id          → { data }   (a data URL)
//   POST /api/team/assets              { name, data } → { id }   (members; images up to ASSET_MB, ASSETS_MAX of them, ASSETS_MB in all)
//   POST /api/team/assets/:id/delete   (admins, or whoever added it)
//   POST /api/billing/checkout         { product: 'team', seats } (see api.js)
//
// Storage: one Durable Object per team (Team); each Account keeps its team's id,
// and the 'e:' + email objects keep the invitations.

import { writeText, readParts } from './store.js';
import { mail } from './mail.js';
import { random, EMAIL } from './util.js';
import { ssoOp, registryOp, handleTeamSso } from './sso.js';

const MAX_TEMPLATES = 50, MAX_TEMPLATE_MB = 20, TEAM_DOCS_MAX = 2000, ASSETS_MAX = 300, ASSET_MB = 8, ASSETS_MB = 200;

export class Team {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    if (op === 'init') {
      await st.put('team', { id: a.id, name: String(a.name || '').slice(0, 80) || 'Equipo', created: Date.now(), seats: 1, until: 0, customer: null,
        members: { [a.email]: { role: 'admin', joined: Date.now() } }, invited: {}, brand: null, templates: [] });
      return this.json({ ok: true });
    }
    // (The registry of single sign-on domains is a Team object with no team: sso.js.)
    if (op.startsWith('domain-')) { const r = await registryOp(st, op, a); if (r) return this.json(r); }
    const t = await st.get('team'); if (!t) return this.json({ error: 'not found' }, 404);
    const me = a.email && t.members[a.email], admin = me?.role === 'admin', active = t.until > Date.now();
    if (op.startsWith('sso-')) { const r = await ssoOp(st, t, op, a, admin); if (r) { const { status = 200, ...o } = r; return this.json(o, r.error ? status : 200); } }
    const view = () => ({ id: t.id, name: t.name, seats: t.seats, active, until: t.until, members: t.members, invited: t.invited, brand: t.brand,
      templates: t.templates.map(({ id, name, updated }) => ({ id, name, updated })) });
    switch (op) {
      case 'status': return this.json({ member: !!me, role: me?.role || null, active, name: t.name, ...(t.test && { test: true }) });
      case 'get': return me ? this.json({ team: view(), role: me.role }) : this.json({ error: 'forbidden' }, 403);
      case 'invite': {
        if (!admin) return this.json({ error: 'forbidden' }, 403);
        const email = String(a.invite || '').trim().toLowerCase(), role = a.role === 'admin' ? 'admin' : 'member';
        if (!EMAIL.test(email)) return this.json({ error: 'bad request' }, 400);
        if (t.members[email]) return this.json({ ok: true, already: true });
        if (Object.keys(t.members).length + Object.keys(t.invited).length >= Math.max(1, t.seats)) return this.json({ error: 'no seats', seats: t.seats }, 402);
        t.invited[email] = { role, at: Date.now(), by: a.email }; await st.put('team', t);
        return this.json({ ok: true, name: t.name });
      }
      case 'accept': {                                     // (the invited email, checked by the worker)
        const inv = t.invited[a.email]; if (!inv) return this.json({ error: 'forbidden' }, 403);
        delete t.invited[a.email]; t.members[a.email] = { role: inv.role, joined: Date.now(), sub: a.sub }; await st.put('team', t);
        return this.json({ ok: true, name: t.name });
      }
      case 'remove': {
        const email = String(a.remove || '').trim().toLowerCase();
        if (!(admin || email === a.email)) return this.json({ error: 'forbidden' }, 403);
        const target = t.members[email];
        if (target?.role === 'admin' && Object.values(t.members).filter(m => m.role === 'admin').length === 1) return this.json({ error: 'last admin' }, 400);
        const sub = target?.sub || null; delete t.members[email]; delete t.invited[email]; await st.put('team', t);
        return this.json({ ok: true, sub });
      }
      case 'brand': {
        if (!admin) return this.json({ error: 'forbidden' }, 403);
        const brand = a.brand && typeof a.brand === 'object' ? a.brand : null;
        if (brand && JSON.stringify(brand).length > 3e6) return this.json({ error: 'too large' }, 413);
        t.brand = brand; await st.put('team', t); return this.json({ ok: true });
      }
      case 'template': {
        if (!admin) return this.json({ error: 'forbidden' }, 403);
        if (!a.deck || !Array.isArray(a.deck.slides)) return this.json({ error: 'bad request' }, 400);
        const text = JSON.stringify(a.deck); if (text.length > MAX_TEMPLATE_MB * 1024 * 1024) return this.json({ error: 'too large' }, 413);
        if (t.templates.length >= MAX_TEMPLATES) return this.json({ error: 'too many' }, 400);
        const id = random(9); await writeText(st, `tpl:${id}:`, text);
        t.templates.push({ id, name: String(a.name || a.deck.name || '').slice(0, 80) || 'Plantilla', updated: Date.now() }); await st.put('team', t);
        return this.json({ ok: true, id });
      }
      case 'template-delete': {
        if (!admin) return this.json({ error: 'forbidden' }, 403);
        const n = (await st.get(`tpl:${a.id}:n`)) || 0;
        await st.delete([`tpl:${a.id}:n`, ...Array.from({ length: n }, (_, i) => `tpl:${a.id}:${i}`)]);
        t.templates = t.templates.filter(x => x.id !== a.id); await st.put('team', t); return this.json({ ok: true });
      }
      case 'template-get': {
        if (!me) return this.json({ error: 'forbidden' }, 403);
        const parts = await readParts(st, `tpl:${a.id}:`); if (!parts) return this.json({ error: 'not found' }, 404);
        return this.json({ deck: JSON.parse(parts.join('')) });
      }
      // Billing (only from the worker, after Stripe's signed notice).
      // (test: from Stripe's test mode — marked, its customer kept apart, and never over a real paid period still running.)
      case 'billing': {
        if (a.test && !t.test && t.until > Date.now()) return this.json({ ok: true, ignored: true });
        Object.assign(t, { seats: Math.max(1, Math.min(10000, +a.seats || t.seats)), until: +a.until || 0, test: !!a.test, ...(a.customer && { [a.test ? 'customerTest' : 'customer']: a.customer }) });
        await st.put('team', t); return this.json({ ok: true, members: t.members });
      }
      case 'clear-test': { const was = !!t.test && t.until > Date.now(); if (t.test) { t.until = 0; t.test = false; await st.put('team', t); } return this.json({ ok: true, cleared: was }); }
      // The documents shared with the team (docs.js keeps it up to date; reading it: members).
      case 'docs-list': return me ? this.json({ docs: (await st.get('docs')) || [] }) : this.json({ error: 'forbidden' }, 403);
      case 'doc-add': {
        const docs = ((await st.get('docs')) || []).filter(d => d.id !== a.id);
        docs.unshift({ id: a.id, name: String(a.name || '').slice(0, 200), owner: String(a.owner || '').slice(0, 200), role: a.role, at: Date.now() });
        await st.put('docs', docs.slice(0, TEAM_DOCS_MAX)); return this.json({ ok: true });
      }
      case 'doc-remove': await st.put('docs', ((await st.get('docs')) || []).filter(d => d.id !== a.id)); return this.json({ ok: true });
      case 'doc-rename': { const docs = (await st.get('docs')) || [], d = docs.find(x => x.id === a.id); if (d) { d.name = String(a.name || '').slice(0, 200); await st.put('docs', docs); } return this.json({ ok: true }); }
      // The team's pictures: logos, photos… added once by anyone in it, for everyone.
      case 'assets-list': { if (!me) return this.json({ error: 'forbidden' }, 403); const as = (await st.get('assets')) || []; return this.json({ assets: as, used: as.reduce((n, x) => n + x.bytes, 0), quota: ASSETS_MB * 1048576 }); }
      case 'asset-get': {
        if (!me) return this.json({ error: 'forbidden' }, 403);
        const parts = await readParts(st, `asset:${a.id}:`); return parts ? this.json({ data: parts.join('') }) : this.json({ error: 'not found' }, 404);
      }
      case 'asset-add': {
        if (!me) return this.json({ error: 'forbidden' }, 403);
        const data = String(a.data || ''), m = data.match(/^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,[A-Za-z0-9+/=]+$/);
        if (!m) return this.json({ error: 'bad image' }, 400);
        if (data.length > ASSET_MB * 1048576 * 1.37) return this.json({ error: 'too large' }, 413);
        const as = (await st.get('assets')) || [], used = as.reduce((n, x) => n + x.bytes, 0);
        if (as.length >= ASSETS_MAX) return this.json({ error: 'too many', max: ASSETS_MAX }, 409);
        if (used + data.length > ASSETS_MB * 1048576) return this.json({ error: 'full', quota: ASSETS_MB * 1048576 }, 402);
        const id = random(9); await writeText(st, `asset:${id}:`, data);
        // (Its preview, made by the browser: a small image, else none.)
        const thumb = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(a.thumb || '')) && a.thumb.length <= 80000 ? a.thumb : '';
        as.unshift({ id, name: String(a.name || '').replace(/[\u0000-\u001f]/g, '').slice(0, 80) || 'Imagen', type: m[1], bytes: data.length, by: a.email, at: Date.now(), ...(thumb && { thumb }) });
        await st.put('assets', as); return this.json({ id });
      }
      case 'asset-delete': {
        const as = (await st.get('assets')) || [], x = as.find(y => y.id === a.id); if (!x) return this.json({ error: 'not found' }, 404);
        if (!(admin || x.by === a.email)) return this.json({ error: 'forbidden' }, 403);
        const n = (await st.get(`asset:${a.id}:n`)) || 0;
        await st.delete([`asset:${a.id}:n`, ...Array.from({ length: n }, (_, i) => `asset:${a.id}:${i}`)]);
        await st.put('assets', as.filter(y => y.id !== a.id)); return this.json({ ok: true });
      }
      case 'customer': return this.json({ customer: admin ? t.customer : null, customerTest: admin ? t.customerTest || null : null, admin });
    }
    return this.json({ error: 'unknown' }, 404);
  }
}

// ---- Routes (from api.js, with the session: me = { sub, email }) --------------------------------------
const teamOf = (env, id) => env.TEAMS.get(env.TEAMS.idFromName('team:' + id));
const ask = async (env, id, op, body) => { const r = await teamOf(env, id).fetch('https://team/' + op, { method: 'POST', body: JSON.stringify(body) }); return { status: r.status, data: await r.json() }; };
export const teamStatus = async (env, id, email) => (id && env.TEAMS ? (await ask(env, id, 'status', { email })).data : null);

export async function handleTeams(path, req, body, url, env, me, A, acct, call, json) {
  if (!env.TEAMS) return json({ error: 'not configured' }, 503);
  const mine = (await call(A, 'team-id')).id;
  const pass = r => json(r.data, r.status);
  if (path === '/team' && req.method === 'GET') {
    const invites = (await call(acct(env, 'e:' + me.email), 'invites-list')).invites;
    if (!mine) return json({ team: null, invites });
    const r = await ask(env, mine, 'get', { email: me.email });
    if (r.status === 403) { await call(A, 'team-set', { id: null }); return json({ team: null, invites }); }   // (removed meanwhile)
    return json({ ...r.data, invites });
  }
  if (path === '/team' && req.method === 'POST') {
    if (mine) return json({ error: 'already in a team' }, 409);
    const id = random(12);
    await teamOf(env, id).fetch('https://team/init', { method: 'POST', body: JSON.stringify({ id, name: body.name, email: me.email }) });
    await call(A, 'team-set', { id }); return json({ ok: true, id });
  }
  if (path === '/team/accept') {
    if (mine) return json({ error: 'already in a team' }, 409);
    const id = String(body.id || ''); if (!/^[\w-]{10,30}$/.test(id)) return json({ error: 'bad request' }, 400);
    const r = await ask(env, id, 'accept', { email: me.email, sub: me.sub }); if (r.status !== 200) return pass(r);
    await call(A, 'team-set', { id }); await call(acct(env, 'e:' + me.email), 'invites-remove', { id });
    return json({ ok: true });
  }
  if (path === '/team/docs' && req.method === 'GET') { if (!mine) return json({ docs: [] }); return pass(await ask(env, mine, 'docs-list', { email: me.email })); }
  if (path === '/team/assets' && req.method === 'GET') { if (!mine) return json({ error: 'no team' }, 404); return pass(await ask(env, mine, 'assets-list', { email: me.email })); }
  if (path === '/team/assets' && req.method === 'POST') { if (!mine) return json({ error: 'no team' }, 404); return pass(await ask(env, mine, 'asset-add', { email: me.email, name: body.name, data: body.data, thumb: body.thumb })); }
  const am = path.match(/^\/team\/assets\/([\w-]{4,20})(\/delete)?$/);
  if (am) {
    if (!mine) return json({ error: 'no team' }, 404);
    if (req.method === 'GET' && !am[2]) return pass(await ask(env, mine, 'asset-get', { email: me.email, id: am[1] }));
    if (req.method === 'POST' && am[2]) return pass(await ask(env, mine, 'asset-delete', { email: me.email, id: am[1] }));
  }
  if (path === '/team/template' && req.method === 'GET') { if (!mine) return json({ error: 'no team' }, 404); return pass(await ask(env, mine, 'template-get', { email: me.email, id: url.searchParams.get('id') })); }
  if (!mine) return json({ error: 'no team' }, 404);
  // Single sign-on: the team's own identity provider (sso.js).
  if (path === '/team/sso' || path.startsWith('/team/sso/')) return handleTeamSso(path, req, body, env, me, mine, json);
  // The team's use, for its admins: each person's last day of use, AI credits spent and space (Account 'usage'), and
  // the totals — so a school or a company sees what its seats are used for. Nothing about what anyone's presentations say.
  if (path === '/team/usage' && req.method === 'GET') {
    const r = await ask(env, mine, 'get', { email: me.email }); if (r.status !== 200) return pass(r);
    if (r.data.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const T = r.data.team, emails = Object.keys(T.members).slice(0, 1000), month = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
    const known = Object.fromEntries(emails.filter(e => T.members[e].sub).map(e => [e, T.members[e].sub]));
    const missing = emails.filter(e => !known[e]);
    if (missing.length && env.DIRECTORY) Object.assign(known, (await (await env.DIRECTORY.get(env.DIRECTORY.idFromName('directory')).fetch('https://dir/subs', { method: 'POST', body: JSON.stringify({ emails: missing }) })).json()).subs || {});
    const members = await Promise.all(emails.map(async e => {
      const u = known[e] ? await call(acct(env, known[e]), 'usage', { month }).catch(() => null) : null;
      return { email: e, role: T.members[e].role, joined: T.members[e].joined || null, ...(u ? { lastSeen: u.lastSeen, spentMonth: u.spentMonth, spent30: u.spent30, storage: u.storage, docs: u.docs } : { account: false }) };
    }));
    const sum = k => members.reduce((t, m) => t + (+m[k] || 0), 0);
    return json({ name: T.name, seats: T.seats, used: emails.length, invited: Object.keys(T.invited).length, active: T.active, until: T.until, month,
      members, totals: { spentMonth: sum('spentMonth'), spent30: sum('spent30'), storage: members.reduce((t, m) => t + (m.storage?.used || 0), 0) } });
  }
  const ops = { '/team/invite': 'invite', '/team/remove': 'remove', '/team/brand': 'brand', '/team/template': 'template', '/team/template/delete': 'template-delete' };
  const op = ops[path]; if (!op || req.method !== 'POST') return json({ error: 'not found' }, 404);
  const r = await ask(env, mine, op, { ...body, email: me.email, invite: body.email, remove: body.email });
  if (r.status === 200 && op === 'invite' && !r.data.already) {
    const to = String(body.email).trim().toLowerCase(), x = await call(acct(env, 'e:' + to), 'invites-add', { id: mine, name: r.data.name, by: me.email });
    await mail(env, { to, kind: 'invite', lang: x.lang, vars: { by: me.name ? `${me.name} (${me.email})` : me.email, team: r.data.name } });   // (a service email)
  }
  if (r.status === 200 && op === 'remove') {
    const email = String(body.email).trim().toLowerCase();
    await call(acct(env, 'e:' + email), 'invites-remove', { id: mine });
    if (r.data.sub) await call(acct(env, r.data.sub), 'team-set', { id: null, only: mine });
  }
  return pass(r);
}
