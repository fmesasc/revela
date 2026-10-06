// Space in Revela's cloud, so it has a ceiling: what each account's presentations take (their deck, saved versions
// and picture, as each CloudDoc measures it — docs.js), and each plan's quota. Over it, nothing new is saved and
// nothing grows; deleting (and emptying the trash) frees it. The quotas are the admin's (admin.js /storage), kept in
// the Budget object; an account can have its own (admin-storage). The daily run warns the admins when the whole
// cloud nears what they set (alertGb) — Cloudflare bills stored data per GB-month (5 GB included on Workers Paid,
// and 5 GB in total on Workers Free).
import { call } from './api.js';

export const MB = 1024 * 1024;
export const STORAGE_DEFAULT = { freeMb: 100, proMb: 2048, alertGb: 4 };
let cache = { at: 0, v: null };
export const resetStorageCache = () => { cache = { at: 0, v: null }; };
export async function storageConfig(env, fresh) {
  if (!env.BUDGET) return { ...STORAGE_DEFAULT };
  if (!fresh && cache.v && Date.now() - cache.at < 30e3) return cache.v;
  const r = await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'storage-get').catch(() => null);
  const v = { ...STORAGE_DEFAULT, ...(r?.storage || {}) }; cache = { at: Date.now(), v }; return v;
}
// The admin's settings, checked (null: not valid).
export function cleanStorage(b) {
  const freeMb = +b?.freeMb, proMb = +b?.proMb, alertGb = +b?.alertGb;
  if (!Number.isInteger(freeMb) || freeMb < 1 || freeMb > 102400 || !Number.isInteger(proMb) || proMb < 1 || proMb > 1048576 || !(alertGb > 0 && alertGb <= 100000)) return null;
  return { freeMb, proMb, alertGb };
}
// "1,2 GB", "350 MB": for emails and messages.
export const fmtBytes = n => (n >= 1024 * MB ? `${(n / 1024 / MB).toFixed(1).replace('.', ',')} GB` : `${Math.max(0, Math.round(n / MB))} MB`);

// The daily run (worker.js scheduled): when the whole cloud takes more than alertGb, the admins get an email.
export async function storageWatch(env, { sendMail, adminEmails }) {
  if (!env.DIRECTORY || !adminEmails.length) return { sent: false };
  const conf = await storageConfig(env, true);
  const stats = await (await env.DIRECTORY.get(env.DIRECTORY.idFromName('directory')).fetch('https://dir/stats', { method: 'POST', body: '{}' })).json();
  const bytes = stats.storage?.bytes || 0;
  if (bytes < conf.alertGb * 1024 * MB) return { sent: false, bytes };
  const top = (stats.storage.top || []).slice(0, 5).map(u => `- ${u.email} (${u.plan}): ${fmtBytes(u.bytes)}`).join('\n');
  const text = `La nube de Revela ocupa ${fmtBytes(bytes)}, por encima del aviso de ${conf.alertGb} GB.\n\nQuienes más ocupan:\n${top}\n\nCuotas y aviso: https://admin.revelaslides.com/#usuarios (Espacio en la nube).`;
  let sent = false;
  for (const to of adminEmails) sent = (await sendMail(env, { to, subject: `Revela: la nube ocupa ${fmtBytes(bytes)}`, text, html: `<pre style="font:14px system-ui">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>` }).catch(() => false)) || sent;
  return { sent, bytes };
}
