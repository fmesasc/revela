// The app's errors, sent by itself (src/ui/shell/errors.js) so that one is known before anyone writes to say it —
// most people who meet one just close the tab. Grouped by what failed (its message without numbers and quotes, and
// where in the code), counted, with the versions and browsers it happened in.
//
// Nothing of anyone's presentation: the message (quoted text taken out), the stack (the app's own files, without
// query or hash), the app's page, the version, the browser and its system, the language and the last few ribbon
// actions. Who sent it, two ways: a hash of address and browser with the day's salt (visits.js), to count people and
// cap reports (REPORTS_PER_DAY each), never kept past the day; and, if the person was signed in, the account's id
// (never the session, never the email: the administration looks the email up when it shows the list) with how many
// times and when it happened, so that the person can be written to and helped. Per group at most MAX_ACCOUNTS, and
// kept KEEP_DAYS after the last time; wiped with the account (err-forget) and given with its data (err-mine).
//
// The administration (admin.js /errors) lists them: new, solved or ignored. A solved one that happens again in a
// newer version comes back as new.
//
//   In the Visits object (one, 'visits'): 'er:<sig>' { sig, msg, stack, where, first, last, n, people, versions,
//   browsers, actions, status, solvedIn, accounts: { <sub>: { n, first, last } } } (MAX_GROUPS) · 'ed:<day>' { n, people } (90 days) · 'ep:<day>:<who>' n.
import { sha256, DAY } from './util.js';

const MAX_GROUPS = 400, REPORTS_PER_DAY = 30, KEEP_DAYS = 90, MAX_ACCOUNTS = 25;
const SUB = /^[\w.-]{1,100}$/;
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').slice(0, n);
const dayOf = ts => new Date(ts).toISOString().slice(0, 10);
const bump = (o, k, max = 12) => { if (!k) return; if (!(k in o) && Object.keys(o).length >= max) k = '(otros)'; o[k] = (o[k] || 0) + 1; };
// Newer version: «0.4.10» > «0.4.9».
const newer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

// (Durable Object storage takes 128 keys at a time.)
async function putAll(st, o) { const ks = Object.keys(o); for (let i = 0; i < ks.length; i += 128) await st.put(Object.fromEntries(ks.slice(i, i + 128).map(k => [k, o[k]]))); }

// What was sent, cleaned (also what the client already did, in case it didn't): → the report, or null.
// (An address in a message — the browser says which one it refused to open — can carry a payment session or a token in its
// path, query or hash: only where it points, «https://checkout.stripe.com/…», is kept.)
export const noUrls = m => String(m).replace(/(https?:\/\/[^\s/"'()<>]+)[^\s"'()<>]*/g, '$1/…');
export function cleanReport(b) {
  if (!b || typeof b !== 'object') return null;
  const msg = noUrls(clip(b.msg, 300).replace(/"[^"]{16,}"|'[^']{16,}'|«[^»]{16,}»/g, '"…"')).trim();
  if (!msg) return null;
  const stack = clip(b.stack, 2000).split('\n').map(l => l.replace(/(https?:\/\/[^\s)]+?)[?#][^\s):]*/g, '$1').replace(/(blob|data):[^\s)]+/g, '$1:…')).slice(0, 12).join('\n');
  return { msg, stack, where: clip(b.where, 80).split(/[?#]/)[0], version: clip(b.version, 20).replace(/[^\w.-]/g, ''), browser: clip(b.browser, 40),
    lang: clip(b.lang, 5).replace(/[^a-z-]/gi, ''), actions: (Array.isArray(b.actions) ? b.actions : []).slice(-5).map(a => clip(a, 40).replace(/[^\w:-]/g, '')).filter(Boolean),
    kind: ['error', 'rejection', 'handled'].includes(b.kind) ? b.kind : 'error' };
}
// The group an error belongs to: its message with the numbers and quotes taken out, and the first frame of the app's
// code (file and function, not the line: a new version moves the lines).
export async function signatureOf(r) {
  const m = r.msg.replace(/\d+/g, 'N').replace(/"[^"]*"|'[^']*'/g, '""').toLowerCase();
  const frame = r.stack.split('\n').map(l => l.trim()).find(l => /\/src\/|\.js/.test(l)) || '';
  const top = frame.replace(/:\d+(:\d+)?\)?$/, '').replace(/^at\s+/, '').replace(/https?:\/\/[^/]+/, '');
  return (await sha256(m + '|' + top)).slice(0, 16);
}

// The Visits object's part: ops err-hit, errs, err-set, err-summary.
export async function errorsOp(st, op, a, now = Date.now()) {
  const day = dayOf(now);
  if (op === 'err-hit') {                                   // { who, sub (the signed-in account, or ''), report }
    const r = cleanReport(a.report); if (!r) return { ok: false, error: 'bad report' };
    if ((await st.get('erday')) !== day) { await forgetOldErrors(st, now); await st.put('erday', day); }
    const pk = `ep:${day}:${a.who || ''}`, sent = (await st.get(pk)) || 0;
    if (sent >= REPORTS_PER_DAY) return { ok: true, capped: true };
    const sig = await signatureOf(r), k = 'er:' + sig, dk = 'ed:' + day;
    const g = (await st.get(k)) || { sig, msg: r.msg, stack: r.stack, where: r.where, kind: r.kind, first: now, n: 0, people: 0, versions: {}, browsers: {}, langs: {}, actions: {}, status: 'new' };
    const d = (await st.get(dk)) || { n: 0, people: 0 };
    // (Someone new to this group today: counted once.)
    const seenKey = `es:${day}:${sig}:${a.who || ''}`, seen = await st.get(seenKey);
    g.n++; g.last = now; g.stack = r.stack || g.stack; g.where = r.where || g.where;
    if (!seen) { g.people++; await st.put(seenKey, 1); }
    if (!sent) d.people++;
    d.n++;
    // (The account, if signed in: counted per account; when the list is full the one not seen for longest goes.)
    if (typeof a.sub === 'string' && SUB.test(a.sub)) {
      g.accounts ||= {};
      if (!g.accounts[a.sub] && Object.keys(g.accounts).length >= MAX_ACCOUNTS) delete g.accounts[Object.entries(g.accounts).sort((x, y) => x[1].last - y[1].last)[0][0]];
      const c = g.accounts[a.sub] ||= { n: 0, first: now, last: now }; c.n++; c.last = now;
    }
    bump(g.versions, r.version); bump(g.browsers, r.browser); bump(g.langs, r.lang); for (const x of r.actions) bump(g.actions, x, 20);
    // (Marked solved when the version published was solvedIn — the fix comes after it —, and here it is in a newer
    // version: not solved after all. From that version or older: people who haven't updated yet.)
    if (g.status === 'solved' && r.version && g.solvedIn && newer(r.version, g.solvedIn)) { g.status = 'new'; g.reopened = now; }
    await st.put({ [k]: g, [dk]: d, [pk]: sent + 1 });
    // (Too many groups: the oldest solved or ignored go first, then the oldest.)
    const all = await st.list({ prefix: 'er:' });
    if (all.size > MAX_GROUPS) {
      const out = [...all.values()].sort((x, y) => (x.status === 'new') - (y.status === 'new') || x.last - y.last).slice(0, all.size - MAX_GROUPS);
      await st.delete(out.map(x => 'er:' + x.sig));
    }
    return { ok: true };
  }
  if (op === 'errs') {                                      // { all } → { items, days }
    const items = [...(await st.list({ prefix: 'er:' })).values()].filter(g => a.all || g.status === 'new').sort((x, y) => y.last - x.last).slice(0, 300);
    const days = [...(await st.list({ prefix: 'ed:', start: 'ed:' + dayOf(now - 29 * DAY) })).entries()].map(([k, v]) => ({ day: k.slice(3), ...v }));
    return { items, days };
  }
  if (op === 'err-set') {                                   // { sig, status: new | solved | ignored, version }
    const k = 'er:' + String(a.sig || ''), g = await st.get(k); if (!g) return { error: 'not found' };
    g.status = a.status; if (a.status === 'solved') g.solvedIn = String(a.version || '').slice(0, 20); else delete g.solvedIn;
    await st.put(k, g); return { ok: true, item: g };
  }
  if (op === 'err-forget') {                                // { sub } → the account out of every group (its deletion)
    let n = 0; const set = {};
    for (const [k, g] of await st.list({ prefix: 'er:' })) if (g.accounts?.[a.sub]) { delete g.accounts[a.sub]; if (!Object.keys(g.accounts).length) delete g.accounts; set[k] = g; n++; }
    await putAll(st, set); return { ok: true, n };
  }
  if (op === 'err-mine') {                                  // { sub } → { errors: [{ msg, where, version, n, first, last }] } (what its export gives)
    const errors = [...(await st.list({ prefix: 'er:' })).values()].filter(g => g.accounts?.[a.sub]).map(g => ({ msg: g.msg, where: g.where, n: g.accounts[a.sub].n, first: g.accounts[a.sub].first, last: g.accounts[a.sub].last }));
    return { errors };
  }
  if (op === 'err-summary') {                               // → { day, week, open }
    const days = [...(await st.list({ prefix: 'ed:', start: 'ed:' + dayOf(now - 6 * DAY) })).entries()];
    const open = [...(await st.list({ prefix: 'er:' })).values()].filter(g => g.status === 'new').length;
    return { day: days.find(([k]) => k === 'ed:' + day)?.[1]?.n || 0, week: days.reduce((s, [, v]) => s + (v.n || 0), 0), open };
  }
  return { error: 'unknown' };
}
// Old days' counters and caps: let go (called on a new day by visits.js).
export async function forgetOldErrors(st, now = Date.now()) {
  const day = dayOf(now);
  for (const prefix of ['ep:', 'es:']) {
    const old = [...(await st.list({ prefix, end: prefix + day })).keys()];
    for (let i = 0; i < old.length; i += 128) await st.delete(old.slice(i, i + 128));
  }
  const days = [...(await st.list({ prefix: 'ed:', end: 'ed:' + dayOf(now - KEEP_DAYS * DAY) })).keys()]; if (days.length) await st.delete(days.slice(0, 128));
  // The accounts of a group not seen for KEEP_DAYS: let go (the error itself stays until it is solved); and the addresses a
  // message kept from before they were cut (noUrls).
  const set = {};
  for (const [k, g] of await st.list({ prefix: 'er:' })) {
    let any = false;
    for (const [sub, c] of Object.entries(g.accounts || {})) if (now - c.last > KEEP_DAYS * DAY) { delete g.accounts[sub]; any = true; }
    if (g.accounts && !Object.keys(g.accounts).length) delete g.accounts;
    const m = noUrls(g.msg); if (m !== g.msg) { g.msg = m; any = true; }
    if (any) set[k] = g;
  }
  await putAll(st, set);
}
