// Scheduled notices. Durable Objects can't be listed, so the accounts tell one
// object (Schedule) what to look at on which day — credits that expire, the end
// of Pro, an account unused for a long time, presentations in the trash — and a daily cron (worker.js,
// scheduled()) goes through the days due and asks each account to check and act.
// The account decides with its own state (and remembers what it sent), so an
// entry that is stale, repeated or run twice does nothing.
//
//   Schedule storage: 'd:YYYY-MM-DD' → [{ sub, kind, ref }], 'days' → the pending days (sorted).

import { deleteAccount } from './api.js';
import { mail } from './mail.js';
import { purgeDoc } from './docs.js';

const DAY = 864e5;
export const dayOf = ts => new Date(ts).toISOString().slice(0, 10);

export class Schedule {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    const days = (await st.get('days')) || [];
    if (op === 'add') {                                   // { day, sub, kind, ref } (the same entry twice: once)
      if (!/^\d{4}-\d\d-\d\d$/.test(a.day || '') || !a.sub || !a.kind) return Response.json({ error: 'bad request' }, { status: 400 });
      const key = 'd:' + a.day, list = (await st.get(key)) || [], ref = String(a.ref ?? '');
      if (!list.some(x => x.sub === a.sub && x.kind === a.kind && x.ref === ref)) list.push({ sub: a.sub, kind: a.kind, ref });
      if (!days.includes(a.day)) { days.push(a.day); days.sort(); }
      await st.put({ [key]: list, days }); return Response.json({ ok: true });
    }
    if (op === 'next') {                                  // { upTo } → the first pending day up to then, and its entries
      const day = days[0]; if (!day || day > a.upTo) return Response.json({ day: null, items: [] });
      return Response.json({ day, items: (await st.get('d:' + day)) || [] });
    }
    if (op === 'done') {                                  // { day, count }: those were handled (any added meanwhile stay)
      const key = 'd:' + a.day, rest = ((await st.get(key)) || []).slice(+a.count || 0);
      if (rest.length) await st.put(key, rest); else { await st.delete(key); await st.put('days', days.filter(d => d !== a.day)); }
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}

// From an Account: look again on that day (never before tomorrow: today's are being run, or done).
export async function scheduleAt(env, ts, sub, kind, ref) {
  if (!env.SCHEDULE || !sub) return;
  const day = dayOf(Math.max(ts, Date.now() + DAY));
  await env.SCHEDULE.get(env.SCHEDULE.idFromName('global')).fetch('https://sched/add', { method: 'POST', body: JSON.stringify({ day, sub, kind, ref }) });
}

// The daily run: every day due (also missed ones), each entry asked to its account.
export async function runSchedule(env, now = Date.now()) {
  if (!env.SCHEDULE) return { days: 0, items: 0 };
  const S = env.SCHEDULE.get(env.SCHEDULE.idFromName('global')), upTo = dayOf(now);
  const ask = async (op, body) => (await S.fetch('https://sched/' + op, { method: 'POST', body: JSON.stringify(body) })).json();
  let days = 0, items = 0;
  for (let i = 0; i < 400; i++) {
    const { day, items: list } = await ask('next', { upTo }); if (!day) break;
    for (const it of list) {
      try { await dueOne(env, it); } catch (e) { console.log('schedule', it.kind, e?.message); }
      items++;
    }
    await ask('done', { day, count: list.length }); days++;
  }
  return { days, items };
}
async function dueOne(env, it) {
  const A = env.ACCOUNTS.get(env.ACCOUNTS.idFromName('u:' + it.sub));
  const r = await (await A.fetch('https://do/due', { method: 'POST', body: JSON.stringify({ kind: it.kind, ref: it.ref }) })).json();
  for (const id of r.purge || []) await purgeDoc(env, it.sub, id);   // (30 days in the trash: docs.js)
  if (r.delete) {                                         // unused for two years: deleted like a voluntary deletion, and told
    const w = await deleteAccount(env, it.sub);
    if (w.email) await mail(env, { to: w.email, kind: 'deleted', lang: w.lang, vars: { idle: true } });
  }
}
