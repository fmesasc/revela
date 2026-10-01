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
//   POST /api/billing/checkout         { product: 'team', seats } (see api.js)
//
// Storage: one Durable Object per team (Team); each Account keeps its team's id,
// and the 'e:' + email objects keep the invitations.

import { writeText, readParts } from './store.js';
import { mail } from './mail.js';

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/;
const MAX_TEMPLATES = 50, MAX_TEMPLATE_MB = 20;

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
    const t = await st.get('team'); if (!t) return this.json({ error: 'not found' }, 404);
    const me = a.email && t.members[a.email], admin = me?.role === 'admin', active = t.until > Date.now();
    const view = () => ({ id: t.id, name: t.name, seats: t.seats, active, until: t.until, members: t.members, invited: t.invited, brand: t.brand,
      templates: t.templates.map(({ id, name, updated }) => ({ id, name, updated })) });
    switch (op) {
      case 'status': return this.json({ member: !!me, role: me?.role || null, active, name: t.name });
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
      case 'billing': { Object.assign(t, { seats: Math.max(1, Math.min(10000, +a.seats || t.seats)), until: +a.until || 0, ...(a.customer && { customer: a.customer }) }); await st.put('team', t); return this.json({ ok: true, members: t.members }); }
      case 'customer': return this.json({ customer: t.customer, admin });
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
  if (path === '/team/template' && req.method === 'GET') { if (!mine) return json({ error: 'no team' }, 404); return pass(await ask(env, mine, 'template-get', { email: me.email, id: url.searchParams.get('id') })); }
  if (!mine) return json({ error: 'no team' }, 404);
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
