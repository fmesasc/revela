// The desktop application's anonymous statistics (src/io/cloud/appstats.js), ONLY for who said yes at the first launch
// (privacy.html, the desktop application's section; GDPR art. 6.1.a). To know whether one installation opens Revela many
// times and when, and how many get to sign in — never who.
//
// Per installation: the random number the app made (a v4 UUID), when first and last seen, how many openings, the days it was
// opened (the last 90), the version, the system, the language, and a yes/no «a session was started here». NEVER an account's
// id, an email, an address (IP) nor a browser string: this module doesn't even read the request's headers. Along with those,
// daily counters of the sign-in funnel. «forget» deletes the installation; one not seen for 24 months is deleted by itself.
//
//   POST /api/app/open   { id, v, os, lang, li? }              (the app opened: at most 30 calls a day per installation)
//   POST /api/app/event  { id, e: login-start | login-ok | login-fail, reason? (closed | expired | network | denied | other) }
//   POST /api/app/forget { id }                                (deletes it)
//   Only from the desktop application's origin; always { ok: true } (bad data: 400).
//
//   In the Visits object (one, 'visits'): 'i:<id>' { f (first, ms), l (last, ms), ld (last day), n (openings), dc (days opened),
//   d (the last 90 days), b (bits: 1 = back on day 1, 2 = back within 7 days, 4 = within 30), v, os, lang, li (0|1), q: { day, n } } ·
//   'ia:<day>' { opens, active (installations opened that day), fresh (new ones), start, ok, fail: { <reason>: n } } (800 days) · 'igc' (day of the last clean-up).
import { DAY } from './util.js';

export const REASONS = ['closed', 'expired', 'network', 'denied', 'other'];
export const SYSTEMS = ['windows', 'mac', 'linux', 'otro'];
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}(-[a-z0-9.]{1,12})?$/;
const KEEP_MS = 730 * DAY, KEEP_AGG_DAYS = 800, MAX_DAYS = 90, PER_DAY = 30, NEW_PER_DAY = 5000;
const dayOf = ts => new Date(ts).toISOString().slice(0, 10);

// The request's body, checked: { id, v, os, lang, li } or { id, e, reason } — null if not valid.
export function cleanApp(kind, b) {
  if (!b || typeof b !== 'object' || typeof b.id !== 'string' || !UUID4.test(b.id)) return null;
  if (kind === 'forget') return { id: b.id };
  if (kind === 'open') {
    if (typeof b.v !== 'string' || !VERSION.test(b.v)) return null;
    return { id: b.id, v: b.v, os: SYSTEMS.includes(b.os) ? b.os : 'otro', lang: typeof b.lang === 'string' && /^[a-z]{2,3}$/.test(b.lang) ? b.lang : '', li: b.li === true };
  }
  if (kind === 'event') {
    if (!['login-start', 'login-ok', 'login-fail'].includes(b.e)) return null;
    return { id: b.id, e: b.e, reason: b.e === 'login-fail' ? (REASONS.includes(b.reason) ? b.reason : 'other') : '' };
  }
  return null;
}

async function clean(st, now, day) {
  if ((await st.get('igc')) === day) return;
  await st.put('igc', day);
  const dead = [];
  for (const [k, r] of await st.list({ prefix: 'i:' })) if (!(r.l > now - KEEP_MS)) dead.push(k);
  for (let i = 0; i < dead.length; i += 128) await st.delete(dead.slice(i, i + 128));
  const old = [...(await st.list({ prefix: 'ia:', end: 'ia:' + dayOf(now - KEEP_AGG_DAYS * DAY) })).keys()];
  for (let i = 0; i < old.length; i += 128) await st.delete(old.slice(i, i + 128));
}

// op: app-open | app-event | app-forget | app-stats (a = the cleaned body, or { days } for stats).
export async function appOp(st, op, a, now = Date.now()) {
  const day = dayOf(now);
  if (op === 'app-forget') { await st.delete('i:' + a.id); return { ok: true }; }
  if (op === 'app-open' || op === 'app-event') {
    const key = 'i:' + a.id, ia = (await st.get('ia:' + day)) || { opens: 0, active: 0, fresh: 0, start: 0, ok: 0, fail: {} };
    let r = await st.get(key);
    if (!r) {
      if (op === 'app-event') return { ok: true };                         // (an event of one the server doesn't know — forgotten — doesn't bring it back)
      if (ia.fresh >= NEW_PER_DAY) return { ok: true, capped: true };       // (anyone can make up numbers: no more than this many new ones a day)
      r = { f: now, l: now, ld: '', n: 0, dc: 0, d: [], b: 0, v: '', os: '', lang: '', li: 0, q: { day, n: 0 } };
      ia.fresh++;
    }
    if (r.q?.day !== day) r.q = { day, n: 0 };
    if (r.q.n >= PER_DAY) return { ok: false, limited: true };
    r.q.n++;
    if (op === 'app-open') {
      r.n++; r.l = now; r.v = a.v; r.os = a.os; r.lang = a.lang; if (a.li) r.li = 1; ia.opens++;
      if (r.ld !== day) {
        r.ld = day; r.dc++; r.d.push(day); if (r.d.length > MAX_DAYS) r.d.shift(); ia.active++;
        const off = Math.round((Date.parse(day) - Date.parse(dayOf(r.f))) / DAY);
        if (off === 1) r.b |= 1; if (off >= 1 && off <= 7) r.b |= 2; if (off >= 1 && off <= 30) r.b |= 4;
      }
    } else if (a.e === 'login-start') ia.start++;
    else if (a.e === 'login-ok') { ia.ok++; r.li = 1; }
    else { ia.fail[a.reason] = (ia.fail[a.reason] || 0) + 1; }
    await st.put({ [key]: r, ['ia:' + day]: ia });
    if (op === 'app-open') await clean(st, now, day);
    return { ok: true };
  }
  if (op === 'app-stats') return stats(st, a, now);
  return { ok: false };
}

const top = o => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ k, n }));
async function stats(st, a, now) {
  const n = Math.min(730, Math.max(1, +a.days || 30)), from = dayOf(now - (n - 1) * DAY), today = dayOf(now);
  const agg = new Map([...(await st.list({ prefix: 'ia:', start: 'ia:' + from }))].map(([k, v]) => [k.slice(3), v]));
  const days = [], funnel = { start: 0, ok: 0, fail: 0, reasons: Object.fromEntries(REASONS.map(x => [x, 0])) };
  for (let i = n - 1; i >= 0; i--) {
    const d = dayOf(now - i * DAY), v = agg.get(d) || {};
    days.push({ day: d, active: v.active || 0, fresh: v.fresh || 0, opens: v.opens || 0 });
    funnel.start += v.start || 0; funnel.ok += v.ok || 0;
    for (const [r, c] of Object.entries(v.fail || {})) { funnel.fail += c; funnel.reasons[r] = (funnel.reasons[r] || 0) + c; }
  }
  const totals = { installs: 0, active: 0, newInPeriod: 0, returning: 0, loggedIn: 0 }, versions = {}, systems = {}, langs = {};
  const ret = { d1: { cohort: 0, back: 0 }, d7: { cohort: 0, back: 0 }, d30: { cohort: 0, back: 0 } };
  for (const r of (await st.list({ prefix: 'i:' })).values()) {
    totals.installs++; if (r.dc >= 2) totals.returning++; if (r.li) totals.loggedIn++;
    const fday = dayOf(r.f);
    if (r.l >= Date.parse(from)) { totals.active++; versions[r.v || '?'] = (versions[r.v || '?'] || 0) + 1; systems[r.os || '?'] = (systems[r.os || '?'] || 0) + 1; langs[r.lang || '?'] = (langs[r.lang || '?'] || 0) + 1; }
    if (fday >= from) {
      totals.newInPeriod++;
      const age = Math.round((Date.parse(today) - Date.parse(fday)) / DAY);       // (only those old enough to have had the chance)
      for (const [k, need, bit] of [['d1', 1, 1], ['d7', 7, 2], ['d30', 30, 4]]) if (age >= need) { ret[k].cohort++; if (r.b & bit) ret[k].back++; }
    }
  }
  for (const k of Object.keys(ret)) ret[k].pct = ret[k].cohort ? Math.round(ret[k].back * 1000 / ret[k].cohort) / 10 : null;
  return { days, totals, retention: ret, versions: top(versions), systems: top(systems), langs: top(langs), funnel };
}

// The route (api.js): `call(op, body)` talks to the Visits object.
export async function handleApp(kind, req, env, body, json, visitsCall) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const a = cleanApp(kind, body);
  if (!a) return json({ error: 'bad request' }, 400);
  if (!env.VISITS) return json({ ok: true });
  const r = await visitsCall(env, 'app-' + kind, a);
  return r.limited ? json({ error: 'daily limit' }, 429) : json({ ok: true });
}
