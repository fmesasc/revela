// Notices ("Avisos"): Revela's own announcements, set from the admin without a deploy. Not ad
// networks: what they show and to whom is decided here, and nothing about people goes anywhere.
//
// Places they can show:
// - 'editor': a slim bar over the slide, closable;
// - 'gallery': a card at the top of the gallery of new presentations;
// - 'web': a bar on revelaslides.com.
// Never while presenting, nor in shared or exported presentations.
//
// Audience: everyone, free accounts and people without an account ('free': no Pro), only people
// without an account ('anon'), or only Pro ('pro'). Also by language and between two dates. A
// sponsor's name, if any, labels it «Patrocinado».
//
//   GET  /api/notices?where=editor|gallery|web&lang=es → { notices: [{ id, title, text, cta, url, sponsor, tone }] }   (no session needed)
//   POST /api/notices/hit  { id, kind: view | click | close }    (counted per notice and day: no person is recorded)
// Admin (admin.js): GET /api/admin/notices → { notices, stats }; POST /api/admin/notices { notice };
//   POST /api/admin/notices/:id/delete. Kept in the Budget object ('notices'; counters 'nst:<id>').

export const NOTICE_PLACES = ['editor', 'gallery', 'web'];
export const NOTICE_WHO = ['all', 'free', 'anon', 'pro'];
export const NOTICE_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
export const NOTICE_TONES = ['info', 'offer', 'news'];
// App actions a notice's button may take instead of a web address.
export const NOTICE_ACTIONS = ['#pro', '#credits', '#team', '#templates', '#tutorial'];
const MAX = 40;

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const day = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v)) ? String(v) : null);
// A button's target: an https address, a path of the site, or one of the app's actions.
export function cleanUrl(u) {
  const s = str(u, 500);
  if (!s) return '';
  if (NOTICE_ACTIONS.includes(s)) return s;
  if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(s)) return s;
  try { const x = new URL(s); return x.protocol === 'https:' ? x.href : null; } catch { return null; }
}
// The admin's notice, checked → the notice, or { error: field }.
export function cleanNotice(b, now = Date.now()) {
  if (!b || typeof b !== 'object') return { error: 'body' };
  const title = str(b.title, 80), text = str(b.text, 260), cta = str(b.cta, 32), url = cleanUrl(b.url);
  if (!title && !text) return { error: 'title' };
  if (url === null) return { error: 'url' };
  if (cta && !url) return { error: 'url' };
  const where = [...new Set((Array.isArray(b.where) ? b.where : []).filter(w => NOTICE_PLACES.includes(w)))];
  if (!where.length) return { error: 'where' };
  const who = NOTICE_WHO.includes(b.who) ? b.who : 'free';
  const langs = [...new Set((Array.isArray(b.langs) ? b.langs : []).filter(l => NOTICE_LANGS.includes(l)))];
  const from = b.from ? day(b.from) : null, until = b.until ? day(b.until) : null;
  if ((b.from && !from) || (b.until && !until) || (from && until && until < from)) return { error: 'dates' };
  const id = /^[a-z0-9]{6,20}$/.test(String(b.id || '')) ? b.id : (now.toString(36) + Math.random().toString(36).slice(2, 6));
  return { id, active: b.active !== false, title, text, cta, url, where, who, langs, from, until,
    sponsor: str(b.sponsor, 40), tone: NOTICE_TONES.includes(b.tone) ? b.tone : 'info', priority: Math.max(0, Math.min(9, Math.round(+b.priority || 0))) };
}
// Which notices someone sees there: active, in its dates (UTC days), for their plan and language; the
// highest priority first. plan: 'anon' (no account), 'free' or 'pro'.
export function noticesFor(list, { where, lang, plan, now = Date.now() }) {
  const today = new Date(now).toISOString().slice(0, 10), l = String(lang || '').slice(0, 2);
  return (list || []).filter(n => n.active && n.where.includes(where)
    && (!n.from || n.from <= today) && (!n.until || n.until >= today)
    && (!n.langs.length || n.langs.includes(l))
    && (n.who === 'all' || (n.who === 'pro' ? plan === 'pro' : n.who === 'anon' ? plan === 'anon' : plan !== 'pro')))
    .sort((a, b) => b.priority - a.priority).slice(0, 3)
    .map(({ id, title, text, cta, url, sponsor, tone }) => ({ id, title, text, cta, url, sponsor, tone }));
}

// The Budget object's part (api.js Budget): the list, and the counters.
export async function noticesOp(st, op, a) {
  if (op === 'notices-get') {
    const list = (await st.get('notices')) || [];
    if (!a?.stats) return { notices: list };
    const stats = {};
    for (const n of list) stats[n.id] = (await st.get('nst:' + n.id)) || { view: 0, click: 0, close: 0, days: {} };
    return { notices: list, stats };
  }
  if (op === 'notices-put') {                                 // { notice } (new or replacing the same id)
    const list = ((await st.get('notices')) || []).filter(n => n.id !== a.notice.id);
    if (list.length >= MAX) return { error: 'full' };
    list.unshift(a.notice); await st.put('notices', list); return { ok: true };
  }
  if (op === 'notices-delete') {
    const list = (await st.get('notices')) || [], before = list.find(n => n.id === a.id) || null;
    await st.put('notices', list.filter(n => n.id !== a.id)); await st.delete('nst:' + a.id); return { ok: true, before };
  }
  if (op === 'notice-hit') {                                  // { id, kind }: one more (the day's too, kept 60 days)
    const list = (await st.get('notices')) || [];
    if (!list.some(n => n.id === a.id) || !['view', 'click', 'close'].includes(a.kind)) return { ok: false };
    const k = 'nst:' + a.id, s = (await st.get(k)) || { view: 0, click: 0, close: 0, days: {} }, d = new Date().toISOString().slice(0, 10);
    s[a.kind]++; const dd = s.days[d] ||= { view: 0, click: 0, close: 0 }; dd[a.kind]++;
    for (const x of Object.keys(s.days).sort().slice(0, -60)) delete s.days[x];
    await st.put(k, s); return { ok: true };
  }
  return null;
}
