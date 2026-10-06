// The community gallery («Comunidad»): presentations that teachers publish for others to reuse — with their
// name if they want, a subject, a level, a language and a Creative Commons licence. Nothing is public until
// the admin approves it (they are seen by students: a person checks first); anyone can report one after.
// Each one has its own page at revelaslides.com/comunidad/<id> (made here, for search engines: title,
// description, picture and the slides' words), with «Usar esta presentación» (a copy in the editor).
//
//   GET  /api/community?q=&subject=&level=&lang=&sort=new|popular&offset= → { items, total }      (published only)
//   GET  /api/community/mine                       → { items } (mine, with their status)            (session)
//   GET  /api/community/<id>                       → { item, deck }   (published; or mine; reuse counted with ?use=1)
//   GET  /api/community/<id>/thumb                 → the picture (JPEG)
//   POST /api/community                            { title, description, subject, level, lang, license, author, deck, thumb } → { id } (session)
//   POST /api/community/<id>/delete                (mine)
//   POST /api/community/<id>/report                { reason } (anyone; limited per address)
//   Pages: GET /comunidad (the list) · GET /comunidad/<id>(-slug) (one).
// Admin (admin.js): GET /api/admin/community?status=pending|published|hidden|reported · POST …/<id>/status { status } · POST …/<id>/delete.
//
// Storage (Durable Object Community, one): 'i:<id>' its summary · 'd:<id>:' the deck (in parts) · 't:<id>' the
// picture (data URL) · 'r:<id>' its reports · 'u:<sub>' my ids · 'day:<sub>:<day>' publications that day.

import { writeText, readParts } from './store.js';
import { escHtml } from './util.js';

export const SUBJECTS = ['math', 'lang', 'science', 'social', 'arts', 'music', 'pe', 'tech', 'languages', 'values', 'vocational', 'business', 'other'];
export const LEVELS = ['infant', 'primary', 'secondary', 'upper', 'vocational', 'university', 'adults', 'business'];
export const LICENSES = ['cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'];
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
const STATUSES = ['pending', 'published', 'hidden'];
const PER_DAY = 5, PER_USER = 50;
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
export const slugOf = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const plain = h => String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
// The slides' words (for the page and the search): titles and texts, tables, questions; not the notes.
export function deckText(deck) {
  const out = [];
  for (const s of (deck.slides || []).filter(x => !x.hidden)) {
    const ws = [];
    for (const b of s.blocks || []) {
      if (b.type === 'text') ws.push(plain(b.html));
      else if (b.type === 'table') ws.push((b.rows || []).flat().map(plain).join(' · '));
      else if (b.type === 'poll') ws.push(plain(b.question));
      else if (b.alt) ws.push(plain(b.alt));
    }
    const t = ws.filter(Boolean).join(' — '); if (t) out.push(t);
  }
  return out;
}

// The author's form, checked → the item's fields, or { error }.
export function cleanPublish(b) {
  if (!b || typeof b !== 'object') return { error: 'body' };
  const title = str(b.title, 120); if (title.length < 3) return { error: 'title' };
  const deck = b.deck; if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) return { error: 'deck' };
  if (!SUBJECTS.includes(b.subject)) return { error: 'subject' };
  if (!LEVELS.includes(b.level)) return { error: 'level' };
  if (!LICENSES.includes(b.license)) return { error: 'license' };
  if (b.rights !== true) return { error: 'rights' };
  const thumb = typeof b.thumb === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.thumb) && b.thumb.length < 400e3 ? b.thumb : null;
  return { item: { title, description: str(b.description, 600), subject: b.subject, level: b.level, lang: LANGS.includes(b.lang) ? b.lang : 'es', license: b.license,
    author: str(b.author, 60), slides: deck.slides.filter(s => !s.hidden).length }, deck, thumb };
}

export class Community {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage, now = Date.now();
    const get = id => st.get('i:' + id);
    if (op === 'publish') {                               // { sub, email, item, deckText, text } → { id }
      const day = 'day:' + a.sub + ':' + new Date(now).toISOString().slice(0, 10), mine = (await st.get('u:' + a.sub)) || [];
      if (((await st.get(day)) || 0) >= PER_DAY) return Response.json({ error: 'daily limit' }, { status: 429 });
      if (mine.length >= PER_USER) return Response.json({ error: 'limit' }, { status: 429 });
      const id = rid(), it = { id, ...a.item, thumb: !!a.thumb, sub: a.sub, status: 'pending', created: now, updated: now, views: 0, uses: 0, reports: 0, text: a.text.slice(0, 40).join(' ¶ ').slice(0, 6000) };
      await writeText(st, `d:${id}:`, a.deckText);
      await st.put({ ['i:' + id]: it, ['u:' + a.sub]: [...mine, id], [day]: ((await st.get(day)) || 0) + 1, ...(a.thumb && { ['t:' + id]: a.thumb }) });
      return Response.json({ id });
    }
    if (op === 'list') {                                  // { q, subject, level, lang, sort, offset, limit, status } (status: the admin's)
      const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const q = norm(a.q), all = [...(await st.list({ prefix: 'i:' })).values()];
      let items = all.filter(x => (a.status ? (a.status === 'reported' ? x.reports > 0 && x.status !== 'hidden' : x.status === a.status) : x.status === 'published')
        && (!a.subject || x.subject === a.subject) && (!a.level || x.level === a.level) && (!a.lang || x.lang === a.lang)
        && (!q || norm(x.title + ' ' + x.description + ' ' + x.author + ' ' + x.text).includes(q)));
      items.sort(a.sort === 'popular' ? (x, y) => (y.uses * 5 + y.views) - (x.uses * 5 + x.views) || y.created - x.created : (x, y) => (y.published || y.created) - (x.published || x.created));
      const offset = Math.max(0, +a.offset || 0), limit = Math.min(60, Math.max(1, +a.limit || 24));
      return Response.json({ items: items.slice(offset, offset + limit).map(({ text, sub, ...x }) => (a.status ? { ...x, sub, text: text.slice(0, 300) } : x)), total: items.length });
    }
    if (op === 'mine') return Response.json({ items: (await Promise.all(((await st.get('u:' + a.sub)) || []).map(get))).filter(Boolean).map(({ text, ...x }) => x).reverse() });
    const it = await get(a.id); if (!it) return Response.json({ error: 'not found' }, { status: 404 });
    if (op === 'get') {                                   // { id, sub?, admin?, count?, use? } → { item, deck }
      if (it.status !== 'published' && it.sub !== a.sub && !a.admin) return Response.json({ error: 'not found' }, { status: 404 });
      const parts = await readParts(st, `d:${it.id}:`);
      if (it.status === 'published' && (a.count || a.use)) { if (a.count) it.views++; if (a.use) it.uses++; await st.put('i:' + it.id, it); }
      const { sub, ...pub } = it;
      return Response.json({ item: a.admin || it.sub === a.sub ? it : pub, deck: a.meta ? null : parts ? JSON.parse(parts.join('')) : null });
    }
    if (op === 'thumb') return Response.json({ thumb: it.status === 'published' || a.admin || it.sub === a.sub ? (await st.get('t:' + it.id)) || null : null });
    if (op === 'delete') {                                // { id, sub?, admin? }
      if (it.sub !== a.sub && !a.admin) return Response.json({ error: 'forbidden' }, { status: 403 });
      const parts = (await st.get(`d:${it.id}:n`)) || 0;
      await st.delete(['i:' + it.id, 't:' + it.id, 'r:' + it.id, `d:${it.id}:n`, ...Array.from({ length: parts }, (_, i) => `d:${it.id}:${i}`)]);
      await st.put('u:' + it.sub, ((await st.get('u:' + it.sub)) || []).filter(x => x !== it.id));
      return Response.json({ ok: true });
    }
    if (op === 'report') {                                // { id, reason }
      if (it.status !== 'published') return Response.json({ ok: true });
      const list = (await st.get('r:' + it.id)) || []; list.push({ at: now, reason: str(a.reason, 300) }); it.reports = list.length;
      await st.put({ ['r:' + it.id]: list.slice(-50), ['i:' + it.id]: it }); return Response.json({ ok: true });
    }
    if (op === 'reports') return Response.json({ reports: (await st.get('r:' + it.id)) || [] });
    if (op === 'status') {                                // { id, status } (admin)
      if (!STATUSES.includes(a.status)) return Response.json({ error: 'status' }, { status: 400 });
      it.status = a.status; if (a.status === 'published') { it.published ||= now; it.reports = 0; await st.delete('r:' + it.id); }
      it.updated = now; await st.put('i:' + it.id, it); return Response.json({ item: it });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}

const cm = env => env.COMMUNITY.get(env.COMMUNITY.idFromName('community'));
export const communityCall = async (env, op, body) => (await cm(env).fetch('https://community/' + op, { method: 'POST', body: JSON.stringify(body || {}) })).json();

// /api/community/… (api.js): me — the session (or null), with its account's email and name; webOrigin: from Revela's site.
export async function handleCommunity(path, req, body, url, env, me, json, { webOrigin, takeQuota }) {
  if (!env.COMMUNITY) return json({ error: 'not configured' }, 503);
  const sub = path.replace(/^\/community/, '') || '/';
  if (req.method === 'GET' && sub === '/') {
    const q = url.searchParams;
    return json(await communityCall(env, 'list', { q: str(q.get('q'), 100), subject: q.get('subject') || '', level: q.get('level') || '', lang: q.get('lang') || '', sort: q.get('sort') || 'new', offset: +q.get('offset') || 0, limit: +q.get('limit') || 24 }),
      200, { 'Cache-Control': 'public, max-age=60' });
  }
  if (req.method === 'GET' && sub === '/mine') { if (!me) return json({ error: 'no session' }, 401); return json(await communityCall(env, 'mine', { sub: me.sub })); }
  if (req.method === 'POST' && sub === '/') {
    if (!me) return json({ error: 'no session' }, 401);
    const c = cleanPublish(body); if (c.error) return json({ error: c.error }, 400);
    const deckText = JSON.stringify(c.deck);
    if (deckText.length > (+env.COMMUNITY_MAX_MB || 15) * 1024 * 1024) return json({ error: 'too large' }, 413);
    const r = await communityCall(env, 'publish', { sub: me.sub, item: c.item, deckText, text: deckText && deckTextFor(c.deck), thumb: c.thumb });
    return json(r, r.error ? 429 : 200);
  }
  const m = sub.match(/^\/([a-z2-9]{6})(?:\/(thumb|delete|report))?$/); if (!m) return json({ error: 'not found' }, 404);
  const id = m[1], op = m[2] || '';
  if (req.method === 'GET' && !op) { const r = await communityCall(env, 'get', { id, sub: me?.sub, count: url.searchParams.get('count') === '1', use: url.searchParams.get('use') === '1', meta: url.searchParams.get('meta') === '1' }); return json(r, r.error ? 404 : 200); }
  if (req.method === 'GET' && op === 'thumb') {
    const { thumb } = await communityCall(env, 'thumb', { id, sub: me?.sub });
    const mm = String(thumb || '').match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!mm) return new Response('Not found', { status: 404 });
    return new Response(Uint8Array.from(atob(mm[2]), ch => ch.charCodeAt(0)), { headers: { 'Content-Type': mm[1], 'Cache-Control': 'public, max-age=86400' } });
  }
  if (req.method === 'POST' && op === 'delete') { if (!me) return json({ error: 'no session' }, 401); const r = await communityCall(env, 'delete', { id, sub: me.sub }); return json(r, r.error ? 403 : 200); }
  if (req.method === 'POST' && op === 'report') {
    if (!webOrigin) return json({ error: 'origin' }, 403);
    if (!(await takeQuota(env, 'creport:' + (req.headers.get('CF-Connecting-IP') || '?'), { per: 10, scope: 'community-report' }))) return json({ error: 'daily limit' }, 429);
    return json(await communityCall(env, 'report', { id, reason: body.reason }));
  }
  return json({ error: 'not found' }, 404);
}
const deckTextFor = deck => deckText(deck);

// /api/admin/community/… (admin.js).
export async function communityAdmin(env, path, q, body, { GET, POST, json, audit }) {
  if (!env.COMMUNITY) return json({ error: 'community not configured' }, 503);
  const sub = path.replace(/^\/community/, '') || '/';
  if (GET && sub === '/') return json(await communityCall(env, 'list', { status: STATUSES.concat('reported').includes(q.get('status')) ? q.get('status') : 'pending', sort: 'new', limit: 60, q: str(q.get('q'), 100) }));
  const m = sub.match(/^\/([a-z2-9]{6})(?:\/(status|delete|reports|thumb|deck))?$/); if (!m) return json({ error: 'not found' }, 404);
  if (GET && m[2] === 'reports') return json(await communityCall(env, 'reports', { id: m[1] }));
  // (To review one before approving it: its picture, and the presentation itself to open in Revela.)
  if (GET && m[2] === 'thumb') {
    const mm = String((await communityCall(env, 'thumb', { id: m[1], admin: true })).thumb || '').match(/^data:(image\/[a-z]+);base64,(.+)$/);
    return mm ? new Response(Uint8Array.from(atob(mm[2]), ch => ch.charCodeAt(0)), { headers: { 'Content-Type': mm[1], 'Cache-Control': 'no-store' } }) : json({ error: 'not found' }, 404);
  }
  if (GET && m[2] === 'deck') {
    const r = await communityCall(env, 'get', { id: m[1], admin: true }); if (!r.deck) return json({ error: 'not found' }, 404);
    return new Response(JSON.stringify(r.deck), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="comunidad-${m[1]}.revela.json"`, 'Cache-Control': 'no-store' } });
  }
  if (GET && !m[2]) return json(await communityCall(env, 'get', { id: m[1], admin: true, meta: true }));
  if (POST && m[2] === 'status') { const r = await communityCall(env, 'status', { id: m[1], status: body.status }); if (!r.error) await audit({ action: 'community-' + body.status, target: 'community:' + m[1], reason: str(body.reason, 300) }); return json(r, r.error ? 400 : 200); }
  if (POST && m[2] === 'delete') { await audit({ action: 'community-delete', target: 'community:' + m[1], reason: str(body.reason, 300) }); return json(await communityCall(env, 'delete', { id: m[1], admin: true })); }
  return json({ error: 'not found' }, 404);
}

// ---- The public pages (revelaslides.com/comunidad…) -------------------------------------------------------
const PAGE = {
  es: { title: 'Comunidad de Revela: presentaciones de docentes para reutilizar', h1: 'Presentaciones de la <em>comunidad</em>', lead: 'Hechas por docentes y publicadas para que las uses en tus clases. Ábrelas en Revela, cámbialas a tu gusto y preséntalas.',
    use: 'Usar esta presentación', by: 'Por', slides: 'diapositivas', license: 'Licencia', back: 'Todas las presentaciones', none: 'Todavía no hay presentaciones publicadas.', report: 'Denunciar', publish: 'Publica la tuya desde Revela: Archivo ▸ Compartir ▸ Publicar en la comunidad.', more: 'Comunidad', search: 'Buscar', words: 'Lo que dicen sus diapositivas' },
  en: { title: 'Revela community: teachers’ presentations to reuse', h1: 'Presentations from the <em>community</em>', lead: 'Made by teachers and shared for you to use in your lessons. Open them in Revela, change them as you like and present them.',
    use: 'Use this presentation', by: 'By', slides: 'slides', license: 'Licence', back: 'All presentations', none: 'There are no published presentations yet.', report: 'Report', publish: 'Publish yours from Revela: File ▸ Share ▸ Publish to the community.', more: 'Community', search: 'Search', words: 'What its slides say' },
  ca: { title: 'Comunitat de Revela: presentacions de docents per reutilitzar', h1: 'Presentacions de la <em>comunitat</em>', lead: 'Fetes per docents i publicades perquè les facis servir a les teves classes. Obre-les a Revela, canvia-les al teu gust i presenta-les.',
    use: 'Fes servir aquesta presentació', by: 'Per', slides: 'diapositives', license: 'Llicència', back: 'Totes les presentacions', none: 'Encara no hi ha presentacions publicades.', report: 'Denuncia', publish: 'Publica la teva des de Revela: Fitxer ▸ Comparteix ▸ Publica a la comunitat.', more: 'Comunitat', search: 'Cerca', words: 'El que diuen les seves diapositives' },
};
const LIC = { 'cc-by': ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'], 'cc-by-sa': ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  'cc-by-nc': ['CC BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/'], 'cc-by-nc-sa': ['CC BY-NC-SA 4.0', 'https://creativecommons.org/licenses/by-nc-sa/4.0/'] };
const frame = (lang, { title, description, canonical, image, body }) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title><meta name="description" content="${escHtml(description)}"><link rel="canonical" href="${escHtml(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Revela"><meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(description)}"><meta property="og:url" content="${escHtml(canonical)}">
${image ? `<meta property="og:image" content="${escHtml(image)}"><meta name="twitter:card" content="summary_large_image">` : ''}<link rel="icon" href="/img/icon.svg" type="image/svg+xml">
<script>try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}</script><link rel="stylesheet" href="/site.css">
<style>.cm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));gap:22px}.cm-card{display:block;color:inherit;text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.cm-card img,.cm-card .cm-ph{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:var(--paper2)}.cm-card .cm-ph{display:grid;place-items:center;padding:0 24px;box-sizing:border-box;font:500 24px/1.2 var(--serif,Georgia),serif;text-align:center;color:var(--ink2)}.cm-card div{padding:14px 16px}.cm-card h3{margin:0 0 6px;font-size:20px}.cm-card p{margin:0;color:var(--ink2);font-size:14px}
.cm-meta{color:var(--ink2);font-size:15px}.cm-hero img{width:100%;max-width:900px;border-radius:14px;border:1px solid var(--line);display:block;margin:28px 0}.cm-words li{margin:0 0 .5em;color:var(--ink2)}
.cm-search{display:flex;gap:10px;margin:0 0 28px}.cm-search input{flex:1;font:16px var(--sans);padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}</style></head>
<body><header class="top"><div class="wrap"><a class="logo" href="/"><img src="/img/icon.svg" alt="">Revela</a><nav class="links" aria-label="Principal"><a href="/comunidad" aria-current="page">Comunidad</a><a href="/pricing">Precios</a><a class="btn primary small" href="/app/">Abrir Revela</a></nav></div></header>
<main>${body}</main><footer><div class="wrap"><a class="logo" href="/"><img src="/img/icon.svg" alt="">Revela</a><nav aria-label="Pie"><a href="/privacy">Privacidad</a><a href="/terms">Condiciones</a><a href="/legal">Aviso legal</a></nav><span>© Revela · un proyecto de FM Lab</span></div></footer></body></html>`;
const pageHeaders = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'" };

export async function communityPage(env, url) {
  const site = env.SITE_URL || 'https://revelaslides.com', lang = ['en', 'ca'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'es', L = PAGE[lang];
  if (!env.COMMUNITY) return new Response('Not found', { status: 404 });
  // (For search engines: every published presentation's page, with when it changed — robots.txt points here.)
  if (url.pathname === '/comunidad/sitemap.xml') {
    const all = []; for (let off = 0; off < 5000; off += 60) { const r = await communityCall(env, 'list', { sort: 'new', offset: off, limit: 60 }); all.push(...r.items); if (r.items.length < 60) break; }
    const day = ts => new Date(ts).toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/comunidad</loc>${all[0] ? `<lastmod>${day(all[0].published || all[0].updated)}</lastmod>` : ''}</url>\n`
      + all.map(it => `  <url><loc>${escHtml(`${site}/comunidad/${it.id}-${slugOf(it.title)}`)}</loc><lastmod>${day(it.updated || it.published)}</lastmod></url>`).join('\n') + (all.length ? '\n' : '') + '</urlset>\n';
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  const m = url.pathname.match(/^\/comunidad\/([a-z2-9]{6})(?:-[a-z0-9-]*)?\/?$/);
  if (m) {
    const r = await communityCall(env, 'get', { id: m[1], count: true });
    if (!r.item) return new Response(frame(lang, { title: 'Revela', description: '', canonical: site + '/comunidad', body: `<section><div class="wrap"><p>${L.none}</p><p><a href="/comunidad">${L.back}</a></p></div></section>` }), { status: 404, headers: pageHeaders });
    const it = r.item, words = deckText(r.deck || {}).slice(0, 30), canonical = `${site}/comunidad/${it.id}-${slugOf(it.title)}`, lic = LIC[it.license];
    const body = `<div class="hero"><div class="wrap cm-hero"><p class="eyebrow">${escHtml(it.slides)} ${L.slides}${it.author ? ` · ${L.by} ${escHtml(it.author)}` : ''}</p><h1>${escHtml(it.title)}</h1>
      ${it.description ? `<p class="lead">${escHtml(it.description)}</p>` : ''}<p><a class="btn primary" href="/app/?community=${it.id}">${L.use}</a> <a class="btn line" href="/comunidad">${L.back}</a></p>
      ${it.thumb ? `<img src="/api/community/${it.id}/thumb" alt="${escHtml(it.title)}" width="1280" height="720">` : ''}
      <p class="cm-meta">${L.license}: <a href="${lic[1]}" rel="license">${lic[0]}</a></p></div></div>
      ${words.length ? `<section style="padding-top:20px"><div class="wrap"><h2 style="font-size:28px">${L.words}</h2><ol class="cm-words">${words.map(w => `<li>${escHtml(w.slice(0, 400))}</li>`).join('')}</ol></div></section>` : ''}`;
    return new Response(frame(lang, { title: `${it.title} — Revela`, description: it.description || words.slice(0, 3).join(' · ').slice(0, 160), canonical, image: it.thumb ? `${site}/api/community/${it.id}/thumb` : `${site}/img/og.png`, body }), { headers: pageHeaders });
  }
  if (!/^\/comunidad\/?$/.test(url.pathname)) return new Response('Not found', { status: 404 });
  const q = str(url.searchParams.get('q'), 100), list = await communityCall(env, 'list', { q, sort: url.searchParams.get('sort') === 'popular' ? 'popular' : 'new', limit: 48 });
  const body = `<div class="hero"><div class="wrap"><p class="eyebrow">${L.more}</p><h1>${L.h1}</h1><p class="lead">${L.lead}</p></div></div>
    <section style="padding-top:40px"><div class="wrap"><form class="cm-search" action="/comunidad"><input name="q" value="${escHtml(q)}" aria-label="${L.search}" placeholder="${L.search}…"><button class="btn primary" type="submit">${L.search}</button></form>
    ${list.items.length ? `<div class="cm-grid">${list.items.map(it => `<a class="cm-card" href="/comunidad/${it.id}-${slugOf(it.title)}">${it.thumb ? `<img src="/api/community/${it.id}/thumb" alt="" loading="lazy" width="640" height="360">` : `<span class="cm-ph">${escHtml(it.title)}</span>`}<div><h3>${escHtml(it.title)}</h3><p>${escHtml(it.slides)} ${L.slides}${it.author ? ` · ${escHtml(it.author)}` : ''}</p></div></a>`).join('')}</div>` : `<p>${L.none}</p>`}
    <p class="cm-meta" style="margin-top:28px">${L.publish}</p></div></section>`;
  return new Response(frame(lang, { title: L.title, description: L.lead, canonical: site + '/comunidad', body }), { headers: pageHeaders });
}
