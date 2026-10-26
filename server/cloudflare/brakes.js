// Brakes on what runs by itself: Durable Object alarms, the crons, the «Rastreador». Nothing here is needed to answer
// a request; it is here so that a mistake in something that schedules itself can't spend the account's quota.
//
// Why (2026-10-11): a developer's Durable Object rescheduled its own alarm with setAlarm(Date.now()) and ran ~600 times a
// second for two weeks, with no users, for a bill of $10,811 — the bug slept 23 days, until there was data old enough to
// reach it. On Workers Free (this account: wrangler.toml) nothing is billed, but every alarm run is a Durable Object
// request (and setAlarm a row written): the day's quota — 100,000 requests and 100,000 rows written for the whole
// account — would be gone in minutes and production would answer errors until 00:00 UTC. On Workers Paid it would be money.
//
// So, three brakes (docs/NUBE.md ▸ «Lo que se ejecuta solo» has the list of everything that runs by itself):
// 1. scheduleAlarm(): the ONLY way to set an alarm (tests/layers.py fails if setAlarm appears anywhere else). It refuses
//    a time that isn't a number (NaN, undefined, a date that didn't parse), never schedules sooner than its kind's minimum
//    (60 s unless the kind says otherwise, with its reason, in ALARMS), and stops scheduling an object whose alarm ran
//    more than its kind's perHour this hour: then it records an incident and the admins get an email (once per kind a day).
// 2. runAlarm(): every alarm() goes through it — it counts the run, skips the work of an object over its budget, and,
//    with the emergency switch on, puts off the alarms that can wait (not the essential ones: saving a live
//    collaboration, a 3D model someone is waiting for).
// 3. The emergency switch (admin «Consumo y frenos»): kept in the Budget object ('global', api.js), read at most once a
//    minute per Worker instance and only by what runs by itself — never on a person's request, so it costs nothing per
//    request. On: the daily cron is skipped, the alarms that can wait are put off an hour at a time, the crawler stops.
//    The website, the editor, accounts and documents keep working.
//
// Counters: each run is counted in memory (per Worker instance) and sent to Budget at most every FLUSH_MS or every
// FLUSH_N runs — not one write per run. They are a floor: what an instance counted and didn't send before it was
// stopped is lost. Budget keeps them per hour for 48 hours ('bk:h:<YYYY-MM-DDTHH>'), with the incidents ('bk:inc') and
// the emails sent today ('bk:mail').

import { sendMail, mailConfigured } from './mail.js';
import { HOUR } from './util.js';

export const MIN_ALARM_MS = 60e3;
// Each kind of alarm: its minimum delay (min), how many runs one object may have in an hour (perHour), whether it
// runs with the emergency switch on (essential) and why a minimum under MIN_ALARM_MS is needed (why).
export const ALARMS = {
  collab: { min: 5e3, perHour: 800, essential: true, label: 'Coedición en directo (collab.js)',
    why: 'guarda lo editado 5 s después del primer cambio (la sala hiberna y lo que no se guarda se pierde); a 5 s como mínimo, nunca pasa de 720 por hora' },
  model3d: { min: 1e3, perHour: 60, essential: true, label: 'Modelo 3D con IA (model3d.js)',
    why: 'la ronda siguiente de un trabajo que alguien espera; cada ronda llama a la IA y a Blender y gasta créditos (máx. 12 por trabajo)' },
  crawler: { min: MIN_ALARM_MS, perHour: 40, label: 'Rastreador de Captación (crawler.js)' },
  news: { min: MIN_ALARM_MS, perHour: 70, label: 'Envío de novedades por correo, tanda a tanda (news.js)' },
  share: { min: MIN_ALARM_MS, perHour: 6, label: 'Presentación compartida: caducidad (store.js)' },
  broadcast: { min: MIN_ALARM_MS, perHour: 6, label: 'Emisión y votación: fin de la sala (broadcast.js)' },
  lti: { min: MIN_ALARM_MS, perHour: 6, label: 'LTI: caducidad de un inicio de sesión (lti.js)' },
  desktop: { min: MIN_ALARM_MS, perHour: 6, label: 'Vincular la app de escritorio: caducidad (api.js)' },
};
// Put off by this much while the switch is on (one run an hour per object, at most, instead of none: when it's turned
// off, what was due still happens).
export const PAUSE_DEFER_MS = HOUR;
const FLUSH_MS = 15 * 60e3, FLUSH_N = 500, SWITCH_TTL = 60e3, KEEP_HOURS = 48, MAX_INCIDENTS = 100;

// ---- The switch, read from Budget at most once a minute per instance ----------------------------------------
const control = env => env.BUDGET.get(env.BUDGET.idFromName('global'));
const ask = async (env, op, body = {}) => (await control(env).fetch('https://do/' + op, { method: 'POST', body: JSON.stringify(body) })).json();
let cached = { at: 0, v: null };
export const resetBrakesCache = () => { cached = { at: 0, v: null }; };
// → { paused: { at, by, reason } | null, marks }. Without Budget (or if it can't be read): not paused — a brake must
// never be what stops the service.
export async function brakesState(env, fresh = false) {
  if (!env.BUDGET) return { paused: null, marks: {} };
  if (!fresh && cached.v && Date.now() - cached.at < SWITCH_TTL) return cached.v;
  const v = await ask(env, 'brakes-get').catch(() => null);
  if (!v) return cached.v || { paused: null, marks: {} };
  cached = { at: Date.now(), v }; return v;
}
export const paused = async env => !!(await brakesState(env)).paused;

// ---- Counters ------------------------------------------------------------------------------------------------
let tally = { c: {}, n: 0 }, flushedAt = 0;
export function count(kind, n = 1) { tally.c[kind] = (tally.c[kind] || 0) + n; tally.n += n; }
// Sent when FLUSH_MS have passed since this instance last sent (its first count goes at once) or FLUSH_N piled up.
export async function flushCounts(env, { force = false, now = Date.now() } = {}) {
  if (!env.BUDGET || !tally.n) return false;
  if (!force && tally.n < FLUSH_N && now - flushedAt < FLUSH_MS) return false;
  const c = tally.c; tally = { c: {}, n: 0 }; flushedAt = now;
  await ask(env, 'brakes-count', { c, at: now }).catch(e => console.log('brakes count', e?.message));
  return true;
}
export const _counters = { peek: () => ({ ...tally.c }), reset: () => { tally = { c: {}, n: 0 }; flushedAt = 0; } };

// ---- Incidents: recorded, and an email to the admins (once per key and UTC day) ----------------------------------
export async function incident(env, x) {
  const e = { at: Date.now(), ...x };
  console.log(JSON.stringify({ brakes: 'incident', ...e }));
  count('incident:' + (x.kind || '?'));
  if (!env.BUDGET) return e;
  const r = await ask(env, 'brakes-incident', { incident: e }).catch(() => null);
  if (r?.mail) await notifyAdmins(env, `Revela: freno de ${x.kind} activado`, [
    `Un objeto de tipo «${x.kind}» ${x.what === 'budget' ? `ha pasado de ${x.limit} ejecuciones de su alarma en una hora (${x.n}): se ha dejado de reprogramar` : x.what === 'invalid' ? `ha intentado programar su alarma con un valor que no es una fecha (${x.value}): no se ha programado` : x.what}.`,
    x.id ? `Objeto: ${x.id}` : '',
    'No hace falta hacer nada para cortarlo: ya está parado. Mira el código de ese tipo de alarma antes de quitar el freno.',
    `Consumo y frenos: https://${env.ADMIN_HOST || 'admin.revelaslides.com'}/#consumo`,
    '(Un aviso por tipo y día; los demás quedan en la lista de incidentes.)',
  ].filter(Boolean).join('\n\n'));
  return e;
}
// (ADMIN_EMAILS, read as admin.js does — not imported from there: this module is imported by the objects' modules,
// and admin.js imports most of them.)
const adminEmails = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
export async function notifyAdmins(env, subject, text) {
  const to = adminEmails(env); if (!to.length || !mailConfigured(env)) return false;
  let ok = false;
  for (const x of to) ok = (await sendMail(env, { to: x, kind: 'brakes', subject, text, html: `<pre style="font:14px system-ui;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>` }).catch(() => false)) || ok;
  return ok;
}

// ---- Alarms -----------------------------------------------------------------------------------------------------
// Per object (its DurableObjectState), in memory: this hour's runs. A runaway alarm keeps its object awake, so memory is
// enough to see it; one that is evicted between runs is already spaced by its kind's minimum.
const runs = new WeakMap();
const bucketOf = ctx => { const h = Math.floor(Date.now() / HOUR); let b = runs.get(ctx); if (!b || b.h !== h) runs.set(ctx, b = { h, n: 0, tripped: false }); return b; };
const idOf = ctx => { try { return ctx.id?.toString?.() || ctx.id?.name || null; } catch { return null; } };
const kindOf = kind => { const k = ALARMS[kind]; if (!k) throw new Error('brakes: unknown alarm kind ' + kind); return k; };

// The only way to set an alarm. at: a time (ms or Date). → the time set, or null if refused (not a time; over budget).
export async function scheduleAlarm(ctx, env, kind, at) {
  const k = kindOf(kind), b = bucketOf(ctx), t = at instanceof Date ? at.getTime() : at;
  if (typeof t !== 'number' || !Number.isFinite(t)) {
    await incident(env, { kind, what: 'invalid', value: String(at).slice(0, 40), id: idOf(ctx) }).catch(() => {});
    return null;
  }
  if (b.n >= k.perHour) {
    if (!b.tripped) { b.tripped = true; await incident(env, { kind, what: 'budget', n: b.n, limit: k.perHour, id: idOf(ctx) }).catch(() => {}); }
    return null;
  }
  const soonest = Date.now() + k.min, when = Math.max(Math.round(t), soonest);
  if (when > t) count('clamped:' + kind);
  await ctx.storage.setAlarm(when);
  return when;
}

// Every alarm() handler: alarm() { return runAlarm(this.ctx, this.env, 'kind', () => …) }.
export async function runAlarm(ctx, env, kind, fn) {
  const k = kindOf(kind), b = bucketOf(ctx);
  b.n++; count('alarm:' + kind);
  try {
    if (b.n > k.perHour) {                                 // (over its budget: not even this run's work)
      if (!b.tripped) { b.tripped = true; await incident(env, { kind, what: 'budget', n: b.n, limit: k.perHour, id: idOf(ctx) }).catch(() => {}); }
      return;
    }
    if (!k.essential && await paused(env)) { count('paused:' + kind); await scheduleAlarm(ctx, env, kind, Date.now() + PAUSE_DEFER_MS); return; }
    // (An error is rethrown: Cloudflare retries an alarm that throws at most 6 times, from 2 s with exponential
    // backoff; each retry is a run here too, so it counts against the budget.)
    try { return await fn(); } catch (e) { count('error:' + kind); throw e; }
  } finally { await flushCounts(env); }
}

// ---- Crons --------------------------------------------------------------------------------------------------------
// The daily run (worker.js scheduled): each task counted; with the switch on, none of them runs.
export async function runCron(env, name, tasks) {
  count('cron:' + name);
  const st = await brakesState(env, true);
  if (st.paused) { count('paused:cron'); await flushCounts(env, { force: true }); return { skipped: true }; }
  const out = {};
  await Promise.all(Object.entries(tasks).map(async ([task, fn]) => {
    try { out[task] = await fn(st); count('task:' + task); } catch (e) { count('error:' + task); console.log(task, e?.message); out[task] = { error: String(e?.message || e) }; }
  }));
  await flushCounts(env, { force: true });
  return out;
}

// ---- Budget's side (api.js Budget.fetch) -----------------------------------------------------------------------------
const hourKey = t => 'bk:h:' + new Date(t).toISOString().slice(0, 13);
const dayKey = t => new Date(t).toISOString().slice(0, 10);
export async function brakesOp(st, op, a) {
  if (op === 'brakes-get') return { paused: (await st.get('bk:paused')) || null, marks: (await st.get('bk:marks')) || {} };
  if (op === 'brakes-set') {                               // { paused: bool, by, reason }
    const v = a.paused ? { at: Date.now(), by: String(a.by || '').slice(0, 120), reason: String(a.reason || '').slice(0, 500) } : null;
    if (v) await st.put('bk:paused', v); else await st.delete('bk:paused');
    return { paused: v };
  }
  if (op === 'brakes-mark') { const m = (await st.get('bk:marks')) || {}; m[String(a.key).slice(0, 40)] = a.value ?? null; await st.put('bk:marks', m); return { marks: m }; }
  if (op === 'brakes-count') {                             // { c: { kind: n }, at }
    const at = +a.at || Date.now(), key = hourKey(at), cur = (await st.get(key)) || {};
    for (const [k, n] of Object.entries(a.c || {})) if (Number.isFinite(+n)) cur[String(k).slice(0, 40)] = (cur[String(k).slice(0, 40)] || 0) + +n;
    await st.put(key, cur);
    // (A new hour: the ones older than KEEP_HOURS go — at most once an hour, so the list is cheap.)
    if ((await st.get('bk:lastHour')) !== key) {
      await st.put('bk:lastHour', key);
      const old = [...(await st.list({ prefix: 'bk:h:', end: hourKey(at - KEEP_HOURS * HOUR) })).keys()];
      if (old.length) await st.delete(old.slice(0, 128));
    }
    return { ok: true };
  }
  if (op === 'brakes-incident') {                          // { incident } → { mail } (true once per kind and day)
    const x = a.incident || {}, list = (await st.get('bk:inc')) || [];
    list.unshift(x); await st.put('bk:inc', list.slice(0, MAX_INCIDENTS));
    return { mail: await claim(st, 'incident:' + (x.kind || '?'), x.at) };
  }
  if (op === 'brakes-claim') return { ok: await claim(st, String(a.key).slice(0, 60), a.at) };   // (once per key and day)
  if (op === 'brakes-clear') { await st.delete('bk:inc'); return { ok: true }; }
  if (op === 'brakes-report') {                            // → the last 24 hours, the incidents, the switch, today's emails
    const now = +a.now || Date.now(), from = hourKey(now - 23 * HOUR);
    const hours = [...(await st.list({ prefix: 'bk:h:', start: from }))].map(([k, c]) => ({ hour: k.slice(5), c }));
    const mail = (await st.get('bk:mail')) || {};
    return { hours, incidents: (await st.get('bk:inc')) || [], paused: (await st.get('bk:paused')) || null, marks: (await st.get('bk:marks')) || {},
      mailed: mail.day === dayKey(now) ? Object.keys(mail.sent || {}) : [] };
  }
  return null;
}
async function claim(st, key, at = Date.now()) {
  const day = dayKey(+at || Date.now()), m = (await st.get('bk:mail')) || {};
  const cur = m.day === day ? m : { day, sent: {} };
  if (cur.sent[key]) return false;
  cur.sent[key] = Date.now(); await st.put('bk:mail', cur); return true;
}
