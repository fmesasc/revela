// The account's use of the day against the Workers Free plan's daily quota, from Cloudflare's GraphQL Analytics API —
// for the admin's «Consumo y frenos» page and an email to the admins at QUOTA_ALERTS of any of them (once per
// threshold and UTC day). Every worker of the account counts: the quota is shared.
//
// Needs, set in Cloudflare (never in this repository):
//   CF_ACCOUNT_ID          plain var: the account's id (Workers & Pages ▸ the right-hand column, «Account ID»)
//   CF_ANALYTICS_TOKEN     secret: an API token with ONLY «Account ▸ Account Analytics ▸ Read» on this account
//                          (`npx wrangler secret put CF_ANALYTICS_TOKEN`; docs/NUBE.md ▸ «Consumo y frenos»)
// Without them nothing is asked and the page says how to set them up.
//
// Cost: the hourly cron (wrangler.toml "17 * * * *") is one Worker request and one request to Cloudflare's API — no
// Durable Object, except one call to Budget on the hours past a threshold (to send each email once). Not tried
// against Cloudflare's real API from here (no token in the repository): the fields' names are the ones in Cloudflare's
// docs (durableObjectsInvocationsAdaptiveGroups.requests, workersInvocationsAdaptive.requests) and, for rows and
// duration, durableObjectsPeriodicGroups; if Cloudflare refuses those, it asks again without them and says so.

import { notifyAdmins } from './brakes.js';

// Workers Free, per day and for the whole account (checked 2026-10-11 in developers.cloudflare.com/durable-objects/
// platform/pricing and workers/platform/limits). It resets at 00:00 UTC.
export const FREE_DAILY = { workerRequests: 100_000, doRequests: 100_000, doRowsRead: 5_000_000, doRowsWritten: 100_000, doGbSeconds: 13_000 };
export const QUOTA_ALERTS = [50, 80, 95];
// The hourly cron's expression (wrangler.toml [triggers]): worker.js tells it from the daily one by it.
export const QUOTA_CRON = '17 * * * *';
export const QUOTA_LABELS = { workerRequests: 'Peticiones a Workers', doRequests: 'Peticiones a Durable Objects', doRowsRead: 'Filas leídas (SQLite)',
  doRowsWritten: 'Filas escritas (SQLite)', doGbSeconds: 'Duración de Durable Objects (GB·s, aprox.)' };
export const quotaConfigured = env => !!(env.CF_ACCOUNT_ID && env.CF_ANALYTICS_TOKEN && /^[a-f0-9]{32}$/.test(String(env.CF_ACCOUNT_ID)));

const FULL = `query Use($acc: String!, $from: Time!, $to: Time!, $day: Date!) { viewer { accounts(filter: { accountTag: $acc }) {
  workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $from, datetime_leq: $to }) { sum { requests } dimensions { scriptName } }
  durableObjectsInvocationsAdaptiveGroups(limit: 10000, filter: { date_geq: $day, date_leq: $day }) { sum { requests } }
  durableObjectsPeriodicGroups(limit: 10000, filter: { date_geq: $day, date_leq: $day }) { sum { activeTime rowsRead rowsWritten inboundWebsocketMsgCount } }
} } }`;
const BASIC = `query Use($acc: String!, $from: Time!, $to: Time!, $day: Date!) { viewer { accounts(filter: { accountTag: $acc }) {
  workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $from, datetime_leq: $to }) { sum { requests } dimensions { scriptName } }
  durableObjectsInvocationsAdaptiveGroups(limit: 10000, filter: { date_geq: $day, date_leq: $day }) { sum { requests } }
} } }`;
const sum = (rows, k) => (rows || []).reduce((t, r) => t + (+r?.sum?.[k] || 0), 0);

// → { configured, day, metrics: [{ key, label, used, limit, pct }], workers: [{ name, requests }], partial?, error? }
export async function quotaUsage(env, now = Date.now()) {
  if (!quotaConfigured(env)) return { configured: false };
  const day = new Date(now).toISOString().slice(0, 10), vars = { acc: env.CF_ACCOUNT_ID, from: day + 'T00:00:00Z', to: new Date(now + 60e3).toISOString().replace(/\.\d+Z$/, 'Z'), day };
  const run = async query => {
    const r = await (env.FETCH || fetch)('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', signal: AbortSignal.timeout?.(15e3),
      headers: { Authorization: 'Bearer ' + env.CF_ANALYTICS_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: vars }) });
    const j = await r.json().catch(() => null);
    return { ok: r.ok && j && !j.errors?.length && j.data, j, status: r.status };
  };
  let res, partial = false;
  try {
    res = await run(FULL);
    if (!res.ok && res.j?.errors?.length) { const again = await run(BASIC); if (again.ok) { res = again; partial = true; } }
  } catch (e) { return { configured: true, day, error: String(e?.message || e).slice(0, 200) }; }
  if (!res.ok) return { configured: true, day, error: (res.j?.errors || []).map(e => e.message).join('; ').slice(0, 300) || 'HTTP ' + res.status };
  const a = res.j.data.viewer?.accounts?.[0] || {};
  const workers = {}; for (const r of a.workersInvocationsAdaptive || []) { const n = r.dimensions?.scriptName || '?'; workers[n] = (workers[n] || 0) + (+r.sum?.requests || 0); }
  const used = {
    workerRequests: Object.values(workers).reduce((t, x) => t + x, 0),
    doRequests: sum(a.durableObjectsInvocationsAdaptiveGroups, 'requests'),
    ...(!partial && {
      doRowsRead: sum(a.durableObjectsPeriodicGroups, 'rowsRead'), doRowsWritten: sum(a.durableObjectsPeriodicGroups, 'rowsWritten'),
      // (activeTime in microseconds, each object billed as 128 MB: an estimate — Cloudflare's dashboard is the reference.)
      doGbSeconds: Math.round(sum(a.durableObjectsPeriodicGroups, 'activeTime') / 1e6 * 0.128),
    }),
  };
  const ws = partial ? null : sum(a.durableObjectsPeriodicGroups, 'inboundWebsocketMsgCount');
  const metrics = Object.entries(used).map(([key, n]) => ({ key, label: QUOTA_LABELS[key], used: n, limit: FREE_DAILY[key], pct: Math.round(n / FREE_DAILY[key] * 1000) / 10 }));
  return { configured: true, day, metrics, websocketMessages: ws, workers: Object.entries(workers).map(([name, requests]) => ({ name, requests })).sort((x, y) => y.requests - x.requests), ...(partial && { partial: true }) };
}

// The hourly cron: past a threshold, one email per threshold and day (Budget remembers which went).
export async function quotaWatch(env, now = Date.now()) {
  const u = await quotaUsage(env, now); if (!u.configured || u.error || !u.metrics) return { checked: false, ...u };
  const top = Math.max(...u.metrics.map(m => m.pct));
  const due = QUOTA_ALERTS.filter(t => top >= t).at(-1); if (!due || !env.BUDGET) return { checked: true, top };
  const B = env.BUDGET.get(env.BUDGET.idFromName('global'));
  const claimed = await (await B.fetch('https://do/brakes-claim', { method: 'POST', body: JSON.stringify({ key: 'quota:' + due, at: now }) })).json().catch(() => ({}));
  if (!claimed.ok) return { checked: true, top, sent: false };
  const lines = u.metrics.map(m => `· ${m.label}: ${m.used.toLocaleString('es-ES')} de ${m.limit.toLocaleString('es-ES')} (${String(m.pct).replace('.', ',')} %)`).join('\n');
  const sent = await notifyAdmins(env, `Revela: ${due} % de la cuota diaria de Cloudflare`, [
    `La cuenta de Cloudflare va por el ${String(top).replace('.', ',')} % de alguna de las cuotas diarias del plan gratuito (hoy, ${u.day}, UTC):`, lines,
    u.workers.length ? 'Por worker (peticiones):\n' + u.workers.map(w => `· ${w.name}: ${w.requests.toLocaleString('es-ES')}`).join('\n') : '',
    'Al llegar al 100 % las llamadas a Durable Objects fallan hasta las 00:00 UTC. Si algo se ha disparado, el interruptor de emergencia para lo que se ejecuta solo:',
    `https://${env.ADMIN_HOST || 'admin.revelaslides.com'}/#consumo`,
    `(Avisos al ${QUOTA_ALERTS.join(', ')} %; uno por umbral y día.)`,
  ].filter(Boolean).join('\n\n'));
  return { checked: true, top, sent, threshold: due };
}
