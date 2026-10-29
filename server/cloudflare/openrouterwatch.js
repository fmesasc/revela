// OpenRouter credit: the balance the server's own key (OPENROUTER_KEY) can still
// spend — the one used for everyone who doesn't bring their own key (creating
// decks, improving, 3D…). The key's $ LIMIT is only a cap; what actually runs
// out is the account's prepaid credit, so this reads the real balance.
//
// Shown on the admin's Resumen, and the daily cron warns the admins by email,
// once a day (brakes-claim dedupes), when it drops below OPENROUTER_LOW_USD.

import { notifyAdmins } from './brakes.js';

export const lowUsd = env => Math.max(0, +env.OPENROUTER_LOW_USD || 5);

// The account's real prepaid balance (bought − used), in USD. Shapes:
//   { available, used, total, low }        the balance
//   { error: <status|message> }            the call failed (shown as "no disponible")
//   null                                   no key configured
export async function openRouterCredits(env) {
  if (!env.OPENROUTER_KEY) return null;
  try {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 4000);
    const r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/credits', { headers: { Authorization: `Bearer ${env.OPENROUTER_KEY}` }, signal: c.signal });
    clearTimeout(t);
    if (!r.ok) return { error: r.status };
    const d = (await r.json()).data || {};
    const total = +d.total_credits || 0, used = +d.total_usage || 0;
    const r2 = n => Math.round(n * 100) / 100;
    return { available: r2(total - used), used: r2(used), total: r2(total), low: lowUsd(env) };
  } catch (e) { return { error: String(e?.message || e).slice(0, 80) }; }
}

// Daily cron: one email to the admins when the balance is low. brakes-claim with
// a per-day key makes sure it is sent at most once a day until it is topped up.
export async function openRouterWatch(env, now = Date.now()) {
  const c = await openRouterCredits(env);
  if (!c || c.error || !env.BUDGET) return { checked: false };
  const low = lowUsd(env);
  if (c.available > low) return { checked: true, available: c.available, sent: false };
  const B = env.BUDGET.get(env.BUDGET.idFromName('global'));
  const claimed = await (await B.fetch('https://do/brakes-claim', { method: 'POST', body: JSON.stringify({ key: 'openrouter:low', at: now }) })).json().catch(() => ({}));
  if (!claimed.ok) return { checked: true, available: c.available, sent: false };
  const money = n => '$' + String(n).replace('.', ',');
  const sent = await notifyAdmins(env, 'Revela: poco saldo de OpenRouter', [
    `Queda poco saldo en la clave de OpenRouter del servidor: unos ${money(c.available)} (de ${money(c.total)} comprados).`,
    '',
    'Cuando se agote, la IA de Revela dejará de funcionar para quien no traiga su propia clave: crear presentaciones con IA, «Mejorar», los modelos 3D, las notas y las traducciones.',
    '',
    'Recarga aquí: https://openrouter.ai/settings/credits',
  ].join('\n'));
  return { checked: true, available: c.available, sent };
}

// Runware credit (the 3D «Realista» and its images: trellis3d.js): the prepaid balance of the server's RUNWARE_KEY, in USD, from
// Runware's accountManagement task. Same shapes as openRouterCredits: { available, low } | { error } | null (no key).
export const runwareLowUsd = env => Math.max(0, +env.RUNWARE_LOW_USD || 2);
export async function runwareCredits(env) {
  if (!env.RUNWARE_KEY) return null;
  try {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 4000);
    const r = await (env.FETCH || fetch)('https://api.runware.ai/v1', { method: 'POST', signal: c.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RUNWARE_KEY}` },
      body: JSON.stringify([{ taskType: 'accountManagement', taskUUID: crypto.randomUUID(), operation: 'getDetails' }]) });
    clearTimeout(t);
    if (!r.ok) return { error: r.status };
    const b = (await r.json())?.data?.[0]?.balance;
    return Number.isFinite(+b) && b !== null ? { available: Math.round(+b * 100) / 100, low: runwareLowUsd(env) } : { error: 'no balance' };
  } catch (e) { return { error: String(e?.message || e).slice(0, 80) }; }
}
