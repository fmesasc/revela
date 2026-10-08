// «Rastreador» of Captación: on its own and slowly, it visits the public website of each school or business in the CRM
// and notes what it says — facts, each with the page and the words it came from — so the admin sees which ones are
// most likely to use Revela, without guessing. And, if asked, it finds new ones in the areas set (OpenStreetMap).
//
// How it behaves (revelaslides.com/bot says it to whoever runs a website):
// - It says who it is (User-Agent RevelaBot, with that page) and obeys robots.txt (RevelaBot's rules, else *'s).
// - Slowly: one site every few minutes (the Crawler object's alarm), at most a few pages of it, 2 s apart; each site
//   again only after recrawlDays. Domains the admin blocks (someone asked) are never visited.
// - Only what the organisation publishes about itself: its generic addresses (secretaría, info, its code…) and
//   phones; an address that looks like a person's (nombre.apellido) is counted, not kept. Nothing is ever emailed
//   automatically from here: sequences still need consent (crm.js).
//
// The score adds up the facts found, each worth fixed points (SCORE): the reasons are shown with it.
//
//   Crawler (one Durable Object, 'crawler'): settings, the robots.txt cache, the log of recent visits, the next area.
//   Crm ops used: crawl-next (whose website is due), web-facts (what was found), import (new places).

import { searchPlaces, resolveArea, subAreas, crmCall } from './crm.js';

export const UA = 'Mozilla/5.0 (compatible; RevelaBot/1.0; +https://revelaslides.com/bot)';
export const CRAWL_DEFAULT = { on: false, everyMin: 5, pagesPerSite: 4, recrawlDays: 30, discover: false, areas: [], kinds: ['school'], areaDays: 30, blocked: [] };
const PAGE_BYTES = 1.5 * 1024 * 1024, TIMEOUT = 12e3, BETWEEN = 2000, DAY = 864e5;
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];

// What counts, and how much (out of 100).
export const SCORE = {
  site: { pts: 10, label: 'Su web responde' },
  email: { pts: 20, label: 'Correo de contacto del centro' },
  phone: { pts: 10, label: 'Teléfono publicado' },
  moodle: { pts: 20, label: 'Usa Moodle (Revela se integra por LTI)' },
  suite: { pts: 15, label: 'Usa Google Workspace o Microsoft 365 (Classroom o Teams)' },
  digital: { pts: 10, label: 'Habla de su proyecto digital' },
  fresh: { pts: 10, label: 'Web actualizada este año o el anterior' },
  lang: { pts: 5, label: 'En un idioma de Revela' },
};

// ---- Settings ---------------------------------------------------------------------------------------
export function cleanCrawl(b, old = CRAWL_DEFAULT) {
  if (!b || typeof b !== 'object') return null;
  const int = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const list = (v, n, len) => (Array.isArray(v) ? v : String(v || '').split(/\n|,/)).map(x => String(x).trim()).filter(Boolean).map(x => x.slice(0, len)).slice(0, n);
  const host = d => String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return { on: b.on !== undefined ? !!b.on : old.on, everyMin: int(b.everyMin ?? old.everyMin, 2, 1440, 5), pagesPerSite: int(b.pagesPerSite ?? old.pagesPerSite, 1, 8, 4),
    recrawlDays: int(b.recrawlDays ?? old.recrawlDays, 30, 365, 30), discover: b.discover !== undefined ? !!b.discover : old.discover,
    areas: b.areas !== undefined ? list(b.areas, 50, 120) : old.areas, kinds: b.kinds !== undefined ? list(b.kinds, 6, 20) : old.kinds,
    areaDays: int(b.areaDays ?? old.areaDays, 1, 365, 30), blocked: b.blocked !== undefined ? [...new Set(list(b.blocked, 500, 120).map(host).filter(Boolean))] : old.blocked };
}

// ---- robots.txt -------------------------------------------------------------------------------------
// The rules for RevelaBot (its own group, else *'s): the longest matching rule decides; Allow wins a tie.
export function robotsRules(text) {
  const groups = []; let cur = null, last = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim(); if (!line) continue;
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (last !== 'user-agent') groups.push(cur = { agents: [], rules: [] }); cur.agents.push(v.toLowerCase()); }
    else if ((k === 'allow' || k === 'disallow') && cur) cur.rules.push({ allow: k === 'allow', path: v });
    last = k;
  }
  const g = groups.find(x => x.agents.some(a => a.includes('revelabot'))) || groups.find(x => x.agents.includes('*'));
  return g ? g.rules.filter(r => r.path || r.allow) : [];
}
const pattern = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
export function robotsAllow(rules, path) {
  let best = null;
  for (const r of rules) { if (!r.path) continue; if (pattern(r.path).test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r; }
  return !best || best.allow;
}

// ---- Reading a page ---------------------------------------------------------------------------------
const decode = s => String(s).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
export const textOf = html => decode(String(html).replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const near = (text, i, n = 70) => text.slice(Math.max(0, i - n), i + n).trim();
const ROLE = /^(info|informacion|secretar|admin|direcc|director|jefatura|contact|centro|colegio|cole|escuela|escola|instituto|insti|ies|ceip|cra|cpi|cpr|oficina|recepcion|hola|hello|office|mail|correo|orientacion|tic|comunicacion|prensa|ampa|afa|biblioteca|matricula|academica|academia|formacion|general|webmaster)/;
// A generic address of the organisation, or one that looks like a person's (kept only as a count).
export const personal = local => !ROLE.test(local) && /^[a-záéíóúñü]{2,}[._-][a-záéíóúñü]{2,}/i.test(local);

export function readPage(html, url) {
  const base = new URL(url), host = base.hostname.replace(/^www\./, '');
  const text = textOf(html), out = { url, title: textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').slice(0, 160),
    lang: ((html.match(/<html[^>]*\blang=["']?([a-zA-Z-]+)/i) || [])[1] || '').slice(0, 2).toLowerCase(),
    generator: ((html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)/i) || [])[1] || '').slice(0, 60),
    links: [], emails: [], hidden: 0, phones: [], platforms: [], signals: [], years: [] };
  // Links (to choose the next pages, and the platforms they point to).
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(decode(m[1]), base); } catch { continue; }
    const label = textOf(m[2]).slice(0, 80);
    if (u.protocol === 'mailto:') { addEmail(out, decodeURIComponent(u.pathname), url, label); continue; }
    if (u.protocol === 'tel:') { addPhone(out, decodeURIComponent(u.pathname), url, label); continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    platformOf(out, u, label, url);
    if (u.hostname.replace(/^www\./, '') === host) out.links.push({ href: u.origin + u.pathname + u.search, label });
  }
  // Addresses written in the text (also «info [at] centro.es», «info(arroba)centro.es»).
  const plain = text.replace(/\s*(\[at\]|\(at\)|\(arroba\)|\[arroba\])\s*/gi, '@');
  for (const m of plain.matchAll(/[\w.+-]{1,64}@[\w-]+(\.[\w-]+)+/g)) if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(m[0])) addEmail(out, m[0], url, near(plain, m.index));
  for (const m of text.matchAll(/(?:tel[eéè]fono|tel\.|tfno\.?|phone|telf\.?)\s*:?\s*(\+?\d[\d\s.()-]{7,16}\d)/gi)) addPhone(out, m[1], url, near(text, m.index));
  // The platforms named in the text too.
  for (const [k, re, label] of [['moodle', /\b(moodle|aeducar|aules|aulas? virtual(es)? de educamadrid|moodle centros)\b/i, 'Moodle'],
    ['google', /\b(google workspace|g ?suite|google classroom)\b/i, 'Google'], ['microsoft', /\b(microsoft 365|office 365|microsoft teams)\b/i, 'Microsoft']]) {   // (the full names: «classroom» or «teams» alone are just words)
    const m = text.match(re); if (m) addPlatform(out, k, label, url, near(text, m.index));
  }
  // Its digital project, in its own words.
  for (const [k, re] of [['plan', /plan digital( de centro)?|\bPDC\b|competencia digital|CompDigEdu|#?CDD\b/i], ['tic', /\bTIC\b|\bTICs?\b|tecnolog[ií]as? de la informaci[oó]n/],
    ['robotica', /rob[oó]tica|programaci[oó]n( y rob[oó]tica)?|\bSTEAM\b|\bSTEM\b/i], ['europa', /\bErasmus\+?|eTwinning/i], ['innovacion', /innovaci[oó]n (educativa|pedag[oó]gica)|proyecto de innovaci[oó]n/i]]) {
    const m = text.match(re); if (m) out.signals.push({ k, url, snippet: near(text, m.index) });
  }
  const now = new Date().getUTCFullYear();
  out.years = [...new Set((text.match(/\b(19[89]\d|20\d\d)\b/g) || []).map(Number).filter(y => y <= now))].sort((a, b) => b - a).slice(0, 5);
  return out;
}
function addEmail(out, raw, url, context) {
  const e = String(raw).trim().toLowerCase().replace(/^mailto:/, '').split('?')[0];
  if (!/^[\w.+-]{1,64}@[\w-]+(\.[\w-]+)+$/.test(e)) return;
  const local = e.split('@')[0];
  if (personal(local)) { out.hidden++; return; }
  if (!out.emails.some(x => x.email === e)) out.emails.push({ email: e, url, snippet: String(context || '').slice(0, 140) });
}
function addPhone(out, raw, url, context) {
  const p = String(raw).replace(/[^\d+]/g, ''); if (p.replace(/\D/g, '').length < 9 || p.replace(/\D/g, '').length > 15) return;
  if (!out.phones.some(x => x.phone === p)) out.phones.push({ phone: p, url, snippet: String(context || '').slice(0, 140) });
}
function addPlatform(out, k, label, url, snippet) { if (!out.platforms.some(x => x.k === k)) out.platforms.push({ k, label, url, snippet: String(snippet || '').slice(0, 140) }); }
function platformOf(out, u, label, page) {
  const h = u.hostname, p = u.pathname.toLowerCase(), at = `${label} → ${u.hostname}${u.pathname}`.slice(0, 140);
  if (/(^|\.)moodle\.|aeducar|aules\.|educamadrid\.org\/aulavirtual|moodle/i.test(h + p)) addPlatform(out, 'moodle', 'Moodle', page, at);
  if (/classroom\.google\.com|sites\.google\.com|drive\.google\.com|workspace\.google\.com/.test(h)) addPlatform(out, 'google', 'Google', page, at);
  if (/teams\.microsoft\.com|office\.com$|sharepoint\.com$|outlook\.office/.test(h)) addPlatform(out, 'microsoft', 'Microsoft', page, at);
}
// The pages worth reading next: contact, about, the school's own sections, the legal notice (who runs it).
export function nextPages(links, n) {
  const want = /contact|contacto|contacte|kontakt|quienes|qui-som|nosotros|about|el-centro|centro|secretar|equipo-directivo|direcci|tic|digital|proyectos|aviso-legal|legal|impressum/i;
  const seen = new Set(), out = [];
  for (const l of links) { const key = l.href.replace(/\/$/, ''); if (seen.has(key) || !want.test(l.href + ' ' + l.label) || /\.(pdf|jpe?g|png|zip|docx?)$/i.test(l.href)) continue; seen.add(key); out.push(l.href); }
  return out.slice(0, n);
}

// ---- One site ---------------------------------------------------------------------------------------
async function get(f, url) {
  const r = await f(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.5', 'Accept-Language': 'es,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
  const type = r.headers.get('Content-Type') || '', len = +(r.headers.get('Content-Length') || 0);
  if (len > PAGE_BYTES) return { status: r.status, url: r.url || url, text: '' };
  const text = /html|text\/plain/i.test(type) || !type ? (await r.text()).slice(0, PAGE_BYTES) : '';
  return { status: r.status, url: r.url || url, text };
}
// Where its email lives (DNS over HTTPS, MX): Google, Microsoft, other — a fact, not a guess.
export async function mailHost(f, domain) {
  try {
    const r = await f('https://cloudflare-dns.com/dns-query?' + new URLSearchParams({ name: domain, type: 'MX' }), { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(TIMEOUT) });
    const mx = ((await r.json()).Answer || []).map(a => String(a.data || '').toLowerCase());
    if (!mx.length) return null;
    const kind = mx.some(x => /google\.com|googlemail\.com/.test(x)) ? 'google' : mx.some(x => /outlook\.com|microsoft/.test(x)) ? 'microsoft' : 'other';
    return { kind, mx: mx.slice(0, 3).map(x => x.replace(/^\d+\s+/, '').replace(/\.$/, '')) };
  } catch { return null; }
}
// Visit one website (robots.txt first) → the facts and the score.
export async function crawlSite(web, { f = fetch, pages = 4, robotsCache = null, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const at = Date.now(); let start;
  try { start = new URL(/^https?:\/\//i.test(web) ? web : 'https://' + web); } catch { return { at, ok: false, error: 'web', score: 0, reasons: [] }; }
  const origin = start.origin, domain = start.hostname.replace(/^www\./, '');
  let rules = robotsCache?.get(origin);
  if (!rules) {
    const r = await get(f, origin + '/robots.txt').catch(() => null);
    rules = r && r.status === 200 ? robotsRules(r.text) : [];
    robotsCache?.set(origin, rules);
  }
  if (!robotsAllow(rules, start.pathname || '/')) return { at, ok: false, robots: 'blocked', error: 'robots', score: 0, reasons: [] };
  const read = [], queue = [start.href]; let first = null;
  while (queue.length && read.length < pages) {
    const url = queue.shift(), path = new URL(url).pathname;
    if (!robotsAllow(rules, path)) continue;
    if (read.length) await sleep(BETWEEN);
    const r = await get(f, url).catch(e => ({ status: 0, error: String(e?.name || e) }));
    if (!first) first = r;
    if (r.status !== 200 || !r.text) continue;
    const p = readPage(r.text, r.url || url); read.push(p);
    if (read.length === 1) queue.push(...nextPages(p.links, pages - 1).filter(u => !queue.includes(u) && u !== url));
  }
  if (!read.length) return { at, ok: false, status: first?.status || 0, error: first?.error || 'no page', score: 0, reasons: [] };
  const mx = await mailHost(f, domain);
  return judge(read, { at, origin, domain, mx });
}
// The facts of the pages read, and the score with its reasons.
export function judge(read, { at = Date.now(), origin = '', domain = '', mx = null } = {}) {
  const all = k => read.flatMap(p => p[k]), uniq = (list, key) => list.filter((x, i) => list.findIndex(y => y[key] === x[key]) === i);
  const emails = uniq(all('emails'), 'email').slice(0, 10), phones = uniq(all('phones'), 'phone').slice(0, 5), platforms = uniq(all('platforms'), 'k');
  const signals = uniq(all('signals'), 'k'), years = [...new Set(all('years'))].sort((a, b) => b - a), lang = read[0].lang || '';
  if (mx?.kind === 'google' && !platforms.some(p => p.k === 'google')) platforms.push({ k: 'google', label: 'Google', url: '', snippet: `Correo en Google (MX: ${mx.mx[0]})` });
  if (mx?.kind === 'microsoft' && !platforms.some(p => p.k === 'microsoft')) platforms.push({ k: 'microsoft', label: 'Microsoft', url: '', snippet: `Correo en Microsoft 365 (MX: ${mx.mx[0]})` });
  const now = new Date(at).getUTCFullYear(), reasons = [], give = (k, url, snippet) => reasons.push({ k, pts: SCORE[k].pts, label: SCORE[k].label, url: url || '', snippet: String(snippet || '').slice(0, 160) });
  give('site', read[0].url, read[0].title);
  if (emails.length) give('email', emails[0].url, emails.map(e => e.email).join(', '));
  if (phones.length) give('phone', phones[0].url, phones[0].phone);
  const moodle = platforms.find(p => p.k === 'moodle'); if (moodle) give('moodle', moodle.url, moodle.snippet);
  const suite = platforms.find(p => p.k === 'google' || p.k === 'microsoft'); if (suite) give('suite', suite.url, suite.snippet);
  if (signals.length) give('digital', signals[0].url, signals.map(s => s.snippet).slice(0, 2).join(' … '));
  if (years[0] >= now - 1) give('fresh', read[0].url, `Fechas en la web hasta ${years[0]}`);
  if (LANGS.includes(lang)) give('lang', read[0].url, `lang="${lang}"`);
  return { at, ok: true, origin, domain, title: read[0].title, lang, generator: read.find(p => p.generator)?.generator || '', pages: read.map(p => p.url),
    emails, hidden: read.reduce((t, p) => t + p.hidden, 0), phones, platforms, signals, latestYear: years[0] || null, mx: mx && { kind: mx.kind, host: mx.mx[0] },
    score: Math.min(100, reasons.reduce((t, r) => t + r.pts, 0)), reasons };
}

// ---- The object: the settings, the alarm that keeps it going, the log ----------------------------------------
export class Crawler {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.robots = new Map(); }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async settings() { return { ...CRAWL_DEFAULT, ...((await this.ctx.storage.get('settings')) || {}) }; }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage;
    if (op === 'status') return Response.json({ settings: await this.settings(), nextAt: (await st.getAlarm()) || null, log: (await st.get('log')) || [], stats: (await st.get('stats')) || { sites: 0, found: 0, places: 0 }, areaAt: (await st.get('areaAt')) || {}, parts: ((await st.get('areaParts')) || []).map(p => `${p.name} (${p.of})`) });
    if (op === 'settings') {
      const s = cleanCrawl(a.settings, await this.settings()); if (!s) return Response.json({ error: 'bad request' }, { status: 400 });
      await st.put('settings', s);
      if (s.on && !(await st.getAlarm())) await st.setAlarm(Date.now() + 5000); else if (!s.on) await st.deleteAlarm();
      return Response.json({ settings: s });
    }
    if (op === 'step') return Response.json(await this.step(a.now || Date.now()));   // (now, by hand: «Mirar ahora»)
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
  async alarm() {
    const s = await this.settings(); if (!s.on) return;
    try { await this.step(Date.now()); } catch (e) { await this.note({ at: Date.now(), kind: 'error', what: String(e?.message || e).slice(0, 200) }); }
    if ((await this.settings()).on) await this.ctx.storage.setAlarm(Date.now() + s.everyMin * 60e3);
  }
  async note(entry) { const log = (await this.ctx.storage.get('log')) || []; log.unshift(entry); await this.ctx.storage.put('log', log.slice(0, 100)); }
  // One step: the next website due; if there's none, a new area to look for places in (when discover is on).
  async step(now) {
    const s = await this.settings(), st = this.ctx.storage, f = this.env.FETCH || fetch, stats = (await st.get('stats')) || { sites: 0, found: 0, places: 0 };
    const next = await crmCall(this.env, 'crawl-next', { before: now - s.recrawlDays * DAY, blocked: s.blocked });
    if (next?.id) {
      const facts = await crawlSite(next.web, { f, pages: s.pagesPerSite, robotsCache: this.robots, sleep: this.env.CRAWL_SLEEP === '0' ? async () => {} : undefined });
      await crmCall(this.env, 'web-facts', { id: next.id, facts });
      stats.sites++; if (facts.ok) stats.found++; await st.put('stats', stats);
      await this.note({ at: now, kind: 'site', id: next.id, name: next.name, web: next.web, ok: facts.ok, score: facts.score, error: facts.error || null });
      return { kind: 'site', id: next.id, facts };
    }
    if (s.discover && s.areas.length) {
      // (A part of a big area still pending first — «España», searched by its regions —; else the next area due, not
      // waiting after an error.)
      // (Once: the areas marked as searched before Overpass's errors were noticed — «España: 0 nuevos» — are searched
      // again; a place already in Contactos isn't added twice.)
      if (!(await st.get('areasV2'))) { await st.put('areaAt', {}); await st.put('areasV2', 1); }
      const areaAt = (await st.get('areaAt')) || {}, wait = (await st.get('areaWait')) || {}, parts = (await st.get('areaParts')) || [];
      const part = parts.find(p => !(wait['rel:' + p.rel] > now));
      const due = part ? null : s.areas.find(x => !(areaAt[x] > now - s.areaDays * DAY) && !(wait[x] > now));
      if (part || due) return this.discover({ part, area: due, kinds: s.kinds, now, stats, areaAt, wait, parts });
    }
    return { kind: 'idle' };
  }
  // One area: its places of each kind, into Contactos. A country is too big for one search (Overpass gives up after a
  // minute and a half): it is split into its regions, a region that still is into its provinces…, one per step. An
  // error is said (never «0 new»), and the area tried again in half an hour.
  async discover({ part, area, kinds, now, stats, areaAt, wait, parts }) {
    const st = this.ctx.storage, label = part ? `${part.name} (${part.of})` : area, key = part ? 'rel:' + part.rel : area;
    const save = async () => { await st.put('areaAt', areaAt); await st.put('areaWait', wait); await st.put('areaParts', parts); };
    const done = () => { if (part) parts.splice(parts.findIndex(p => p.rel === part.rel), 1); else areaAt[area] = now; delete wait[key]; };
    const fail = async why => { wait[key] = now + 30 * 60e3; await save(); await this.note({ at: now, kind: 'area', area: label, added: 0, found: 0, error: why }); return { kind: 'area', area: label, added: 0, error: why }; };
    const place = part ? { rel: part.rel, name: part.name } : await resolveArea(this.env, area);
    if (place.error) return fail(place.error === 'not found' ? 'no existe en OpenStreetMap' : 'Nominatim no respondió');
    const split = async level => {
      const subs = place.rel && level <= 8 ? await subAreas(this.env, place.rel, level) : { error: 'too big' };
      if (subs.error) return fail(subs.why === 'busy' ? 'OpenStreetMap (Overpass) está saturado' : subs.error === 'too big' || subs.why === 'too big' ? 'demasiado grande, y sin partes en que dividirla' : `OpenStreetMap: ${subs.why || subs.error}`);
      if (!subs.length) return fail('demasiado grande, y sin partes en que dividirla');
      done(); parts.unshift(...subs.map(x => ({ rel: x.rel, name: x.name, of: part ? part.name : area, level })));
      await save(); await this.note({ at: now, kind: 'area', area: label, split: subs.length, added: 0 });
      return { kind: 'area', area: label, split: subs.length, added: 0 };
    };
    const next = part ? part.level + 2 : place.rank && place.rank <= 8 ? (place.rank <= 4 ? 4 : 6) : 8;
    if (!part && place.rank && place.rank <= 4) return split(4);              // (a country: by its regions, from the start)
    let added = 0, found = 0;
    for (const kind of kinds) {
      const r = await searchPlaces(this.env, { kind, limit: 10000, place });
      if (r.error) return r.why === 'too big' ? split(next) : fail(r.why === 'busy' ? 'OpenStreetMap (Overpass) está saturado' : `OpenStreetMap: ${r.why || r.error}`);
      found += r.items.length;
      // (In batches: the contacts take a thousand at a time.)
      for (let i = 0; i < r.items.length; i += 1000)
        added += (await crmCall(this.env, 'import', { rows: r.items.slice(i, i + 1000).map(x => ({ contact: x, osm: x.osm })), source: 'osm', by: 'rastreador' })).added || 0;
    }
    done(); await save();
    stats.places += added; await st.put('stats', stats);
    await this.note({ at: now, kind: 'area', area: label, added, found });
    return { kind: 'area', area: label, added, found };

  }
}
const crawler = env => env.CRAWLER.get(env.CRAWLER.idFromName('crawler'));
export const crawlerCall = async (env, op, body = {}) => (await crawler(env).fetch('https://crawler/' + op, { method: 'POST', body: JSON.stringify(body) })).json();
