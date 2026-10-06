// Captación («Captación» in the admin): finding schools and businesses, keeping track of each one, the
// emails that follow up with those who asked for them, and the campaigns that bring people to Revela.
//
// The law sets the shape (Spain's LSSI, art. 21; the GDPR): commercial email only to whom asked for it or
// agreed to it. So:
// - Contacts found in public data (OpenStreetMap) or imported are a list to work by hand: a call, a letter,
//   LinkedIn, a visit — the admin gets a message ready to adapt and a reminder to follow up. Never an
//   automatic email.
// - Automatic emails (sequences) go only to contacts with a recorded consent (when and how: the website's
//   form, or what the admin writes down — «me lo pidió en la feria X»), never to one who unsubscribed, and
//   every one carries the sender's identity and a one-click way out (List-Unsubscribe).
// - A request from the website's form («Revela para centros») is always answered (that is what it asks
//   for); sequences only if its marketing box was ticked (never pre-ticked).
//
// Storage (Durable Object Crm, one: 'crm'):
//   'c:<id>' a contact · 's:<id>' its summary (lists) · 'k:e:<email>' / 'k:o:<osm>' → id (no duplicates)
//   'seqs' sequences · 'tpls' message templates · 'camps' campaigns · 'settings'
//   'st:<seq>:<step>' { sent, click, unsub } · 'cs:<camp>' { visit, signup, purchase, revenue } · 'cd:<camp>:<day>' per day
//   'u:<sub>' → the campaign that brought that account (the first one) · 'sent:<day>' emails sent that day
//
// Public routes (api.js): POST /api/leads (the form) · GET /api/go/<slug> (a campaign's link) ·
//   GET|POST /api/crm/unsub?t= (one-click way out) · GET /api/crm/click?t= (a link in a sequence email).
// Admin routes (admin.js → crmApi): /api/admin/crm/…  · Daily (worker.js scheduled → runCrm): the sequences'
//   emails due and a summary for the admin (follow-ups due today, new requests).

import { DAY, b64url, EMAIL, hmac } from './util.js';
import { crmToken, readCrmToken, eventMail, crmMail, unsubPageCrm, ackMail } from './crm-mail.js';
import { ambassadorMail } from './ambassadors.js';
import { crawlSite, crawlerCall, SCORE, CRAWL_DEFAULT } from './crawler.js';

export const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);
export const text = (v, n) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);
const mailOf = v => { const e = String(v || '').trim().toLowerCase(); return EMAIL.test(e) ? e : ''; };
const webOf = v => { const s = str(v, 300); if (!s) return ''; try { const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
export const dayKey = ts => new Date(ts).toISOString().slice(0, 10);
const pad = n => String(n).padStart(8, '0');

export const KINDS = ['school', 'academy', 'university', 'company', 'public', 'other'];
export const STATUSES = ['new', 'contacted', 'talking', 'demo', 'proposal', 'customer', 'lost'];
export const CHANNELS = ['phone', 'linkedin', 'letter', 'visit', 'email', 'other'];
export const SOURCES = ['osm', 'import', 'form', 'manual'];
export const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
// What the search looks for in OpenStreetMap, per kind (Overpass filters).
export const SEARCH = {
  school: ['nwr["amenity"~"^(school|kindergarten)$"]["name"]'],
  academy: ['nwr["amenity"~"^(language_school|music_school|training|prep_school)$"]["name"]', 'nwr["office"="educational_institution"]["name"]'],
  university: ['nwr["amenity"~"^(university|college)$"]["name"]'],
  company: ['nwr["office"~"^(company|it|consulting|marketing|advertising_agency|financial|insurance|architect|coworking)$"]["name"]'],
  public: ['nwr["office"="government"]["name"]', 'nwr["amenity"="townhall"]["name"]'],
};
export const DEFAULT_SETTINGS = { identity: '', replyTo: '', dailyMax: 40, digest: true, digestTo: '', followDays: 5, referral: true, referralReward: '' };

// ---- Checking what the admin sends -------------------------------------------------------------
export function cleanContact(b, old = {}) {
  if (!b || typeof b !== 'object') return { error: 'body' };
  const c = { ...old };
  const set = (k, v) => { if (b[k] !== undefined) c[k] = v; };
  set('name', str(b.name, 160)); set('person', str(b.person, 120)); set('role', str(b.role, 80));
  set('kind', KINDS.includes(b.kind) ? b.kind : 'other');
  set('email', mailOf(b.email)); set('phone', str(b.phone, 40)); set('web', webOf(b.web));
  set('address', str(b.address, 200)); set('city', str(b.city, 80)); set('region', str(b.region, 80)); set('country', str(b.country, 2).toUpperCase());
  set('lang', LANGS.includes(b.lang) ? b.lang : 'es');
  set('tags', Array.isArray(b.tags) ? [...new Set(b.tags.map(t => str(t, 30).toLowerCase()).filter(Boolean))].slice(0, 12) : []);
  set('size', str(b.size, 40)); set('linkedin', webOf(b.linkedin));
  if (!c.name) return { error: 'name' };
  if (b.email !== undefined && b.email && !c.email) return { error: 'email' };
  return { contact: c };
}
export function cleanSequence(s) {
  if (!s || typeof s !== 'object') return { error: 'body' };
  const name = str(s.name, 80); if (!name) return { error: 'name' };
  const steps = (Array.isArray(s.steps) ? s.steps : []).slice(0, 10).map(x => ({ days: Math.min(120, Math.max(0, Math.round(+x.days || 0))), subject: str(x.subject, 140), body: text(x.body, 6000) }));
  if (!steps.length || steps.some(x => !x.subject || !x.body)) return { error: 'steps' };
  const stopOn = (Array.isArray(s.stopOn) ? s.stopOn : ['talking', 'demo', 'proposal', 'customer', 'lost']).filter(x => STATUSES.includes(x));
  return { seq: { id: /^[a-z0-9]{6,12}$/.test(s.id || '') ? s.id : rid(), name, active: s.active !== false, trigger: s.trigger === 'lead' ? 'lead' : 'manual',
    lang: LANGS.includes(s.lang) ? s.lang : '', steps, stopOn } };
}
export function cleanTemplate(t) {
  if (!t || typeof t !== 'object') return { error: 'body' };
  const name = str(t.name, 80), body = text(t.body, 5000); if (!name || !body) return { error: 'name' };
  return { tpl: { id: /^[a-z0-9]{6,12}$/.test(t.id || '') ? t.id : rid(), name, channel: CHANNELS.includes(t.channel) ? t.channel : 'other', subject: str(t.subject, 140), body } };
}
export function cleanCampaign(c) {
  if (!c || typeof c !== 'object') return { error: 'body' };
  const name = str(c.name, 80), slug = String(c.slug || '').toLowerCase().trim();
  if (!name) return { error: 'name' };
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) return { error: 'slug' };
  const url = String(c.url || '/').trim(), okUrl = /^\/(?!\/)[\w\-./?=&%#]*$/.test(url) || (() => { try { return new URL(url).protocol === 'https:'; } catch { return false; } })();
  if (!okUrl) return { error: 'url' };
  return { camp: { id: /^[a-z0-9]{6,12}$/.test(c.id || '') ? c.id : rid(), name, slug, url, channel: str(c.channel, 40), code: str(c.code, 40).toUpperCase(),
    budget: Math.max(0, Math.round(+c.budget || 0)), from: /^\d{4}-\d\d-\d\d$/.test(c.from || '') ? c.from : null, until: /^\d{4}-\d\d-\d\d$/.test(c.until || '') ? c.until : null,
    notes: text(c.notes, 1000), active: c.active !== false } };
}
export function cleanEvent(e) {
  if (!e || typeof e !== 'object') return { error: 'body' };
  const title = str(e.title, 120); if (!title) return { error: 'title' };
  const starts = Math.round(+e.starts || 0); if (!(starts > Date.UTC(2020, 0, 1)) || starts > Date.UTC(2100, 0, 1)) return { error: 'starts' };
  const link = webOf(e.link); if (e.link && !link) return { error: 'link' };
  return { event: { id: /^[a-z0-9]{6,12}$/.test(e.id || '') ? e.id : rid(), title, starts, minutes: Math.min(600, Math.max(10, Math.round(+e.minutes || 45))), link,
    description: text(e.description, 1500), lang: LANGS.includes(e.lang) ? e.lang : 'es', capacity: Math.min(5000, Math.max(0, Math.round(+e.capacity || 0))), active: e.active !== false } };
}
export function cleanSettings(b, old = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...old };
  if (b.identity !== undefined) s.identity = text(b.identity, 400);
  if (b.replyTo !== undefined) s.replyTo = mailOf(b.replyTo);
  if (b.dailyMax !== undefined) s.dailyMax = Math.min(500, Math.max(0, Math.round(+b.dailyMax || 0)));
  if (b.digest !== undefined) s.digest = !!b.digest;
  if (b.digestTo !== undefined) s.digestTo = mailOf(b.digestTo);
  if (b.followDays !== undefined) s.followDays = Math.min(90, Math.max(1, Math.round(+b.followDays || 5)));
  if (b.referral !== undefined) s.referral = !!b.referral;
  if (b.referralReward !== undefined) s.referralReward = str(b.referralReward, 160);
  return s;
}
const rid = () => b64url(crypto.getRandomValues(new Uint8Array(6))).toLowerCase().replace(/[^a-z0-9]/g, '').padEnd(8, '0').slice(0, 8);
// The words to fill in a message: {nombre} the person (or «equipo de …»), {centro} the organisation, {ciudad}.
export function fill(tpl, c, extra = {}) {
  const v = { nombre: c.person || '', centro: c.name || '', ciudad: c.city || '', cargo: c.role || '', web: c.web || '', ...extra };
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
}
const summary = c => ({ id: c.id, name: c.name, kind: c.kind, city: c.city || '', region: c.region || '', country: c.country || '', status: c.status, email: !!c.email,
  consent: !!(c.consent && !c.unsub), unsub: c.unsub || null, nextAt: c.nextAt || null, nextWhat: c.nextWhat || '', updated: c.updated, created: c.created, source: c.source,
  tags: c.tags || [], campaign: c.campaign || null, referrer: c.referrer || null, seq: c.seq ? { id: c.seq.id, step: c.seq.step, nextAt: c.seq.nextAt } : null, person: c.person || '',
  web: !!c.web, webAt: c.webFacts?.at || null, score: c.webFacts?.ok ? c.webFacts.score : null });
// May a sequence write to this contact now? (consent recorded, no way-out taken, an address, not stopped by its status)
export const mailable = (c, seq) => !!(c && c.email && c.consent?.at && !c.unsub && (!seq || !(seq.stopOn || []).includes(c.status)));

// ---- The object ----------------------------------------------------------------------------------
export class Crm {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  fetch(req) { const run = () => this.handle(req); const p = (this.queue || Promise.resolve()).then(run, run); this.queue = p.catch(() => {}); return p; }
  async save(c) {
    c.updated = Date.now();
    await this.ctx.storage.put({ ['c:' + pad(c.id)]: c, ['s:' + pad(c.id)]: summary(c) });
  }
  async getC(id) { return this.ctx.storage.get('c:' + pad(+id || 0)); }
  async keys(c) {
    const k = {}; if (c.email) k['k:e:' + c.email] = c.id; if (c.osm) k['k:o:' + c.osm] = c.id;
    if (Object.keys(k).length) await this.ctx.storage.put(k);
  }
  async existing(c) {
    const st = this.ctx.storage;
    return (c.osm && await st.get('k:o:' + c.osm)) || (c.email && await st.get('k:e:' + c.email)) || null;
  }
  // A new contact (or the one it already is: same address or same OpenStreetMap place) → { id, created }.
  async add(fields, { source, by, consent = null, campaign = null, osm = null, history = null } = {}) {
    const st = this.ctx.storage, now = Date.now();
    const known = await this.existing({ email: fields.email, osm });
    if (known) {
      const c = await this.getC(known);
      if (c) {
        // (Filled where empty; a consent given now is kept — it is newer.)
        for (const [k, v] of Object.entries(fields)) if (v && (c[k] == null || c[k] === '' || (Array.isArray(c[k]) && !c[k].length))) c[k] = v;
        if (consent && !c.unsub) c.consent = consent;
        if (consent && c.unsub && consent.how === 'form') { c.consent = consent; c.unsub = null; }   // (asked again, by themselves)
        if (history) c.history.push({ at: now, by, ...history });
        await this.save(c); await this.keys(c);
        return { id: c.id, created: false };
      }
    }
    const id = ((await st.get('n')) || 0) + 1;
    const c = { id, tags: [], ...fields, status: 'new', source, osm, consent, unsub: null, campaign, notes: [], history: [{ at: now, by, what: 'created', source }, ...(history ? [{ at: now, by, ...history }] : [])],
      nextAt: null, nextWhat: '', seq: null, created: now };
    await st.put('n', id); await this.save(c); await this.keys(c);
    return { id, created: true };
  }
  async list(o) {
    const all = [...(await this.ctx.storage.list({ prefix: 's:' })).values()];
    const q = String(o.q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), now = Date.now();
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let items = all.filter(c => (!o.status || c.status === o.status) && (!o.kind || c.kind === o.kind) && (!o.source || c.source === o.source)
      && (!o.consent || c.consent) && (!o.due || (c.nextAt && c.nextAt <= now + DAY)) && (!o.tag || c.tags.includes(o.tag))
      && (!q || [c.name, c.city, c.region, c.person, ...c.tags].some(x => norm(x).includes(q))));
    items.sort(o.due ? (a, b) => (a.nextAt || 0) - (b.nextAt || 0) : o.sort === 'score' ? (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.updated - a.updated : (a, b) => b.updated - a.updated);
    const counts = Object.fromEntries(STATUSES.map(s => [s, 0])); for (const c of all) counts[c.status] = (counts[c.status] || 0) + 1;
    const offset = Math.max(0, +o.offset || 0), limit = Math.min(500, Math.max(1, +o.limit || 100));
    return { items: items.slice(offset, offset + limit), total: items.length, all: all.length, counts, due: all.filter(c => c.nextAt && c.nextAt <= now + DAY).length,
      tags: [...new Set(all.flatMap(c => c.tags))].sort() };
  }
  async handle(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json().catch(() => ({})), st = this.ctx.storage, now = Date.now();
    const settings = async () => ({ ...DEFAULT_SETTINGS, ...((await st.get('settings')) || {}) });
    const seqs = async () => (await st.get('seqs')) || [];
    if (op === 'list') return Response.json(await this.list(a));
    if (op === 'add') {                                   // { contact, source, by, consent?, osm?, campaign? }
      const { contact, error } = cleanContact(a.contact); if (error) return Response.json({ error }, { status: 400 });
      return Response.json(await this.add(contact, { source: SOURCES.includes(a.source) ? a.source : 'manual', by: a.by, consent: a.consent || null, osm: a.osm || null, campaign: a.campaign || null }));
    }
    if (op === 'import') {                                // { rows: [{ contact, osm? }], source, by } → { added, updated, bad }
      let added = 0, updated = 0, bad = 0;
      for (const r of (a.rows || []).slice(0, 1000)) {
        const { contact, error } = cleanContact(r.contact || r); if (error) { bad++; continue; }
        const osm = typeof r.osm === 'string' && /^(node|way|relation)\/\d{1,15}$/.test(r.osm) ? r.osm : null;
        const x = await this.add(contact, { source: SOURCES.includes(a.source) ? a.source : 'import', by: a.by, osm });
        if (x.created) added++; else updated++;
      }
      return Response.json({ added, updated, bad });
    }
    // The «Rastreador» (crawler.js): whose website is due (never visited, or before a.before; not a blocked domain), and
    // what was found — kept with the contact, with its date; the history says when it changed.
    if (op === 'crawl-next') {
      const host = w => String(w || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      // (x.web undefined: a summary from before it said so — the contact itself is looked at.)
      const blocked = new Set((a.blocked || []).map(host)), due = [...(await st.list({ prefix: 's:' })).values()]
        .filter(x => (x.web || x.web === undefined) && !['lost', 'customer'].includes(x.status) && !(x.webAt > (+a.before || 0))).sort((x, y) => (x.webAt || 0) - (y.webAt || 0) || x.id - y.id);
      for (const x of due) { const c = await this.getC(x.id); if (c?.web && !blocked.has(host(c.web))) return Response.json({ id: c.id, web: c.web, name: c.name, kind: c.kind }); }
      return Response.json({ id: null });
    }
    if (op === 'web-facts') {
      const c = await this.getC(a.id); if (!c) return Response.json({ error: 'not found' }, { status: 404 });
      const was = c.webFacts?.score ?? null; c.webFacts = a.facts;
      if (a.facts?.ok && was !== a.facts.score) c.history.push({ at: now, by: 'rastreador', what: 'web', score: a.facts.score });
      await this.save(c); return Response.json({ ok: true });
    }
    if (op === 'known') {                                 // { osm: [ids] } → the ones already in (search results)
      const out = {}; for (const o of (a.osm || []).slice(0, 1000)) { const id = await st.get('k:o:' + o); if (id) out[o] = id; }
      return Response.json({ known: out });
    }
    if (op === 'lead') {                                  // the website's form (api.js checked it) → { id, created, seq }
      const { contact } = cleanContact(a.contact);
      const consent = a.marketing ? { at: now, how: 'form', note: a.consentText || '' } : null;
      const r = await this.add(contact, { source: 'form', by: 'form', consent, campaign: a.campaign || null, history: { what: 'request', text: a.message || '' } });
      const c = await this.getC(r.id); c.request = { at: now, message: a.message || '', marketing: !!a.marketing };
      if (a.referrer && !c.referrer) { c.referrer = a.referrer; c.history.push({ at: now, by: 'form', what: 'referred', code: a.referrer }); }
      if (c.status === 'lost') c.status = 'new';
      if (!c.nextAt) { c.nextAt = now; c.nextWhat = 'Responder a la solicitud de la web'; }
      // (Auto-enrolled in the active sequence started by requests, if it may write to them.)
      const seq = (await seqs()).find(s => s.active && s.trigger === 'lead');
      if (seq && !c.seq && mailable(c, seq)) c.seq = { id: seq.id, step: 0, nextAt: now + (seq.steps[0].days || 0) * DAY, started: now };
      await this.save(c);
      return Response.json({ ...r, seq: c.seq?.id || null });
    }
    if (op === 'settings') return Response.json({ settings: await settings() });
    if (op === 'settings-put') { const s = cleanSettings(a.settings || {}, await settings()); await st.put('settings', s); return Response.json({ settings: s }); }
    if (op === 'seqs') {
      const list = await seqs(), stats = {};
      for (const s of list) stats[s.id] = await Promise.all(s.steps.map(async (_, i) => (await st.get(`st:${s.id}:${i}`)) || { sent: 0, click: 0, unsub: 0 }));
      const enrolled = {}; for (const c of (await st.list({ prefix: 's:' })).values()) if (c.seq) enrolled[c.seq.id] = (enrolled[c.seq.id] || 0) + 1;
      return Response.json({ seqs: list, stats, enrolled });
    }
    if (op === 'seq-put') {
      const { seq, error } = cleanSequence(a.seq); if (error) return Response.json({ error }, { status: 400 });
      let list = await seqs(); list = list.some(s => s.id === seq.id) ? list.map(s => (s.id === seq.id ? seq : s)) : [...list, seq];
      if (seq.trigger === 'lead' && seq.active) list = list.map(s => (s.id !== seq.id && s.trigger === 'lead' ? { ...s, active: false } : s));   // (one starts with requests)
      await st.put('seqs', list.slice(0, 30)); return Response.json({ seq });
    }
    if (op === 'seq-del') {
      await st.put('seqs', (await seqs()).filter(s => s.id !== a.id));
      for (const c of (await st.list({ prefix: 's:' })).values()) if (c.seq?.id === a.id) { const full = await this.getC(c.id); full.seq = null; await this.save(full); }
      return Response.json({ ok: true });
    }
    if (op === 'tpls') return Response.json({ tpls: (await st.get('tpls')) || defaultTemplates() });
    if (op === 'tpl-put') {
      const { tpl, error } = cleanTemplate(a.tpl); if (error) return Response.json({ error }, { status: 400 });
      const list = (await st.get('tpls')) || defaultTemplates();
      await st.put('tpls', (list.some(t => t.id === tpl.id) ? list.map(t => (t.id === tpl.id ? tpl : t)) : [...list, tpl]).slice(0, 40)); return Response.json({ tpl });
    }
    if (op === 'tpl-del') { await st.put('tpls', ((await st.get('tpls')) || defaultTemplates()).filter(t => t.id !== a.id)); return Response.json({ ok: true }); }
    if (op === 'camps') {
      const list = (await st.get('camps')) || [], stats = {}, days = {};
      for (const c of list) {
        stats[c.id] = (await st.get('cs:' + c.id)) || { visit: 0, signup: 0, purchase: 0, revenue: 0, leads: 0 };
        days[c.id] = [...(await st.list({ prefix: `cd:${c.id}:`, reverse: true, limit: 60 })).entries()].map(([k, v]) => ({ day: k.slice(-10), ...v })).reverse();
      }
      return Response.json({ camps: list, stats, days });
    }
    if (op === 'camp-put') {
      const { camp, error } = cleanCampaign(a.camp); if (error) return Response.json({ error }, { status: 400 });
      const list = (await st.get('camps')) || [];
      if (list.some(c => c.slug === camp.slug && c.id !== camp.id)) return Response.json({ error: 'slug taken' }, { status: 409 });
      await st.put('camps', (list.some(c => c.id === camp.id) ? list.map(c => (c.id === camp.id ? camp : c)) : [...list, camp]).slice(0, 200)); return Response.json({ camp });
    }
    if (op === 'camp-del') { await st.put('camps', ((await st.get('camps')) || []).filter(c => c.id !== a.id)); return Response.json({ ok: true }); }
    if (op === 'camp-of') {                               // { slug } → the active campaign (for /api/go)
      const c = ((await st.get('camps')) || []).find(x => x.slug === a.slug); return Response.json({ camp: c || null });
    }
    if (op === 'camp-hit') {                              // { slug, kind: visit | signup | purchase | lead, sub?, amount? }
      const camp = ((await st.get('camps')) || []).find(x => x.slug === a.slug || x.id === a.id); if (!camp) return Response.json({ ok: false });
      if (a.kind === 'signup' && a.sub) { if (await st.get('u:' + a.sub)) return Response.json({ ok: false }); await st.put('u:' + a.sub, camp.id); }
      const k = ['visit', 'signup', 'purchase', 'lead'].includes(a.kind) ? a.kind : null; if (!k) return Response.json({ ok: false });
      const tot = (await st.get('cs:' + camp.id)) || { visit: 0, signup: 0, purchase: 0, revenue: 0, leads: 0 }, dk = `cd:${camp.id}:${dayKey(now)}`, d = (await st.get(dk)) || {};
      if (k === 'lead') tot.leads = (tot.leads || 0) + 1; else tot[k]++;
      d[k] = (d[k] || 0) + 1;
      if (k === 'purchase') tot.revenue += Math.max(0, Math.round(+a.amount || 0));
      await st.put({ ['cs:' + camp.id]: tot, [dk]: d }); return Response.json({ ok: true });
    }
    if (op === 'camp-sub') {                              // { sub } → the campaign that brought that account
      const id = await st.get('u:' + a.sub); const c = id && ((await st.get('camps')) || []).find(x => x.id === id);
      return Response.json({ slug: c?.slug || null });
    }
    if (op === 'purge') {                                 // { before }: contacts that came to nothing, untouched since then, go (privacy.html)
      let n = 0;
      for (const sm of (await st.list({ prefix: 's:' })).values()) {
        if (sm.updated >= a.before || ['talking', 'demo', 'proposal', 'customer'].includes(sm.status)) continue;
        const c = await this.getC(sm.id);
        await st.delete(['c:' + pad(c.id), 's:' + pad(c.id), ...(c.email ? ['k:e:' + c.email] : []), ...(c.osm ? ['k:o:' + c.osm] : [])]); n++;
      }
      return Response.json({ purged: n });
    }
    if (op === 'stats') {
      const l = await this.list({ limit: 1 }); return Response.json({ counts: l.counts, all: l.all, due: l.due, sentToday: (await st.get('sent:' + dayKey(now))) || 0 });
    }
    // ---- The daily run (runCrm): sequences' emails due, and what to tell the admin
    if (op === 'due') {                                   // { now, max } → { mails: [{ contact, seq, step, i }], followups, leads, settings }
      const s = await settings(), list = await seqs(), mails = [], followups = [], leads = [];
      const max = Math.max(0, s.dailyMax - ((await st.get('sent:' + dayKey(a.now))) || 0));
      for (const sm of (await st.list({ prefix: 's:' })).values()) {
        if (sm.nextAt && sm.nextAt <= a.now + DAY / 2) followups.push(sm);
        if (sm.source === 'form' && sm.created > a.now - DAY) leads.push(sm);
        if (!sm.seq || sm.seq.nextAt > a.now || mails.length >= max) continue;
        const c = await this.getC(sm.id), seq = list.find(x => x.id === c.seq?.id);
        if (!seq || !mailable(c, seq) || !seq.steps[c.seq.step]) { c.seq = null; await this.save(c); continue; }   // (gone, or may not write any more)
        if (!seq.active) continue;                                                                           // (paused: waits)
        mails.push({ contact: c, seq: { id: seq.id, name: seq.name, lang: seq.lang }, step: seq.steps[c.seq.step], i: c.seq.step });
      }
      return Response.json({ mails, followups, leads, settings: s });
    }
    if (op === 'sent') {                                  // { id, seq, i, ok } → the next step, or the end
      const c = await this.getC(a.id); if (!c || c.seq?.id !== a.seq || c.seq.step !== a.i) return Response.json({ ok: false });
      const seq = (await seqs()).find(x => x.id === a.seq);
      if (a.ok) {
        c.history.push({ at: now, by: 'system', what: 'mail', seq: a.seq, step: a.i, subject: a.subject || '' });
        const k = `st:${a.seq}:${a.i}`, sx = (await st.get(k)) || { sent: 0, click: 0, unsub: 0 }; sx.sent++;
        const dk = 'sent:' + dayKey(now); await st.put({ [k]: sx, [dk]: ((await st.get(dk)) || 0) + 1 });
        const next = seq?.steps[a.i + 1];
        c.seq = next ? { ...c.seq, step: a.i + 1, nextAt: now + Math.max(1, next.days) * DAY } : null;
        if (!next) c.history.push({ at: now, by: 'system', what: 'seq-end', seq: a.seq });
        if (c.status === 'new') c.status = 'contacted';
      } else c.seq = { ...c.seq, nextAt: now + DAY, fails: (c.seq.fails || 0) + 1 };
      if (c.seq?.fails >= 3) { c.history.push({ at: now, by: 'system', what: 'seq-fail', seq: a.seq }); c.seq = null; }
      await this.save(c); return Response.json({ ok: true });
    }
    if (op === 'click') {                                 // { id, seq, i } (from a link in an email)
      const k = `st:${a.seq}:${a.i}`, sx = (await st.get(k)) || { sent: 0, click: 0, unsub: 0 }; sx.click++; await st.put(k, sx);
      const c = await this.getC(a.id); if (c) { c.history.push({ at: now, by: 'contact', what: 'click', seq: a.seq, step: a.i, url: a.url || '' }); await this.save(c); }
      return Response.json({ ok: true });
    }
    if (op === 'unsub') {                                 // { id, email, seq?, i? } (the way out in an email)
      const c = await this.getC(a.id); if (!c || c.email !== a.email) return Response.json({ ok: false });
      if (!c.unsub) {
        c.unsub = now; c.seq = null; c.history.push({ at: now, by: 'contact', what: 'unsub' });
        if (a.seq != null) { const k = `st:${a.seq}:${a.i}`, sx = (await st.get(k)) || { sent: 0, click: 0, unsub: 0 }; sx.unsub++; await st.put(k, sx); }
        await this.save(c);
      }
      return Response.json({ ok: true, lang: c.lang });
    }
    // ---- Webinars ('events'; their sign-ups 'ev:<id>')
    if (op === 'events') {
      const list = (await st.get('events')) || [], counts = {};
      for (const e of list) counts[e.id] = ((await st.get('ev:' + e.id)) || []).length;
      return Response.json({ events: list.sort((x, y) => y.starts - x.starts), counts });
    }
    if (op === 'events-public') {                         // { now, lang } → the upcoming active ones (no sign-ups, no link)
      const list = ((await st.get('events')) || []).filter(e => e.active && e.starts > a.now && (!a.lang || e.lang === a.lang || (a.lang !== 'es' && e.lang === 'en')));
      const out = [];
      for (const e of list.sort((x, y) => x.starts - y.starts).slice(0, 6)) { const n = ((await st.get('ev:' + e.id)) || []).length;
        out.push({ id: e.id, title: e.title, starts: e.starts, minutes: e.minutes, description: e.description, lang: e.lang, full: !!e.capacity && n >= e.capacity }); }
      return Response.json({ events: out });
    }
    if (op === 'event-put') {
      const { event, error } = cleanEvent(a.event); if (error) return Response.json({ error }, { status: 400 });
      const list = (await st.get('events')) || [];
      await st.put('events', (list.some(e => e.id === event.id) ? list.map(e => (e.id === event.id ? event : e)) : [...list, event]).slice(-100)); return Response.json({ event });
    }
    if (op === 'event-del') { await st.put('events', ((await st.get('events')) || []).filter(e => e.id !== a.id)); await st.delete('ev:' + a.id); return Response.json({ ok: true }); }
    if (op === 'event-signups') {
      const e = ((await st.get('events')) || []).find(x => x.id === a.id); if (!e) return Response.json({ error: 'not found' }, { status: 404 });
      return Response.json({ event: e, signups: (await st.get('ev:' + a.id)) || [] });
    }
    if (op === 'event-signup') {                          // { id, contact, marketing, consentText, campaign, referrer } → { ok, event, contact, already }
      const e = ((await st.get('events')) || []).find(x => x.id === a.id && x.active && x.starts > now);
      if (!e) return Response.json({ error: 'event' }, { status: 404 });
      const list = (await st.get('ev:' + e.id)) || [];
      if (list.some(x => x.email === a.contact.email)) return Response.json({ ok: true, event: e, already: true });
      if (e.capacity && list.length >= e.capacity) return Response.json({ error: 'full' }, { status: 409 });
      const consent = a.marketing ? { at: now, how: 'form', note: a.consentText || 'Inscripción a un seminario' } : null;
      const r = await this.add(a.contact, { source: 'form', by: 'form', consent, campaign: a.campaign || null, history: { what: 'event', text: e.title } });
      const c = await this.getC(r.id);
      c.tags = c.tags || []; if (!c.tags.includes('seminario')) c.tags = [...c.tags, 'seminario'].slice(0, 12);
      if (a.referrer && !c.referrer) c.referrer = a.referrer;
      await this.save(c);
      list.push({ id: c.id, email: c.email, person: c.person || '', name: c.name, lang: c.lang, at: now });
      await st.put('ev:' + e.id, list);
      return Response.json({ ok: true, event: e, contact: c.id, created: r.created });
    }
    if (op === 'events-due') {                            // { now } → reminders for the ones starting in the next ~36 h (each sign-up once)
      const out = [];
      for (const e of ((await st.get('events')) || []).filter(x => x.active && x.starts > a.now && x.starts - a.now < 36 * 3600e3)) {
        const list = (await st.get('ev:' + e.id)) || []; let changed = false;
        for (const x of list) if (!x.reminded) { x.reminded = a.now; changed = true; out.push({ event: e, to: x }); }
        if (changed) await st.put('ev:' + e.id, list);
      }
      return Response.json({ items: out });
    }
    // ---- Recommendations: a code per account ('r:<code>' → { sub, email }, 'rs:<code>' its numbers)
    if (op === 'ref-code') {                              // { code, sub, email } (the code made by the Worker, signed) → { stats }
      if (!/^[a-z0-9]{6,16}$/.test(a.code || '')) return Response.json({ error: 'code' }, { status: 400 });
      const cur = await st.get('r:' + a.code); if (!cur || cur.email !== a.email) await st.put('r:' + a.code, { sub: a.sub, email: a.email, at: cur?.at || now });
      return Response.json({ stats: (await st.get('rs:' + a.code)) || { leads: 0, customers: 0 }, settings: await settings() });
    }
    if (op === 'ref-of') return Response.json({ ref: /^[a-z0-9]{6,16}$/.test(a.code || '') ? (await st.get('r:' + a.code)) || null : null });
    if (op === 'ref-hit') {                               // { code, kind: 'leads' | 'customers' }
      const k = 'rs:' + a.code, x = (await st.get(k)) || { leads: 0, customers: 0 }; x[a.kind] = (x[a.kind] || 0) + 1; await st.put(k, x); return Response.json({ ok: true });
    }
    if (op === 'refs') {                                  // admin: who recommends, and what it brought
      const out = [];
      for (const [k, v] of await st.list({ prefix: 'r:' })) { const code = k.slice(2); out.push({ code, ...v, ...((await st.get('rs:' + code)) || { leads: 0, customers: 0 }) }); }
      const by = {}; for (const c of (await st.list({ prefix: 's:' })).values()) if (c.referrer) (by[c.referrer] ||= []).push({ id: c.id, name: c.name, status: c.status });
      return Response.json({ refs: out.sort((x, y) => y.customers - x.customers || y.leads - x.leads), contacts: by });
    }
    // ---- Ambassadors ('amb:<sub>' the application and its status; 'ambc:<code>' → sub, for the badge and its check)
    if (op === 'amb-apply') {                             // { sub, email, form } → { amb }
      const cur = await st.get('amb:' + a.sub);
      if (cur && ['pending', 'approved'].includes(cur.status)) return Response.json({ amb: cur });
      const amb = { sub: a.sub, email: a.email, ...a.form, status: 'pending', at: now, history: [...(cur?.history || []), { at: now, what: 'apply' }] };
      await st.put('amb:' + a.sub, amb);
      // (In Captación too: a teacher who wants to spread Revela is a good contact.)
      const r = await this.add({ name: a.form.center || a.form.name, person: a.form.name, role: a.form.role, email: a.email, city: a.form.city, kind: 'school', lang: a.form.lang || 'es', tags: ['embajador'] }, { source: 'form', by: 'form', history: { what: 'request', text: 'Solicitud de embajador: ' + (a.form.plan || '') } });
      amb.contact = r.id; await st.put('amb:' + a.sub, amb);
      return Response.json({ amb });
    }
    if (op === 'amb-me') return Response.json({ amb: (await st.get('amb:' + a.sub)) || null });
    if (op === 'amb-list') return Response.json({ items: [...(await st.list({ prefix: 'amb:' })).values()].filter(x => !a.status || x.status === a.status).sort((x, y) => y.at - x.at) });
    if (op === 'amb-status') {                            // { sub, status: approved | rejected | ended, note, by } → { amb }
      const amb = await st.get('amb:' + a.sub); if (!amb) return Response.json({ error: 'not found' }, { status: 404 });
      if (!['approved', 'rejected', 'ended'].includes(a.status)) return Response.json({ error: 'status' }, { status: 400 });
      amb.status = a.status; amb.history.push({ at: now, what: a.status, by: a.by, note: a.note || '' });
      if (a.status === 'approved') { amb.since ||= now; if (!amb.code) { amb.code = rid() + rid().slice(0, 4); await st.put('ambc:' + amb.code, amb.sub); } }
      await st.put('amb:' + a.sub, amb); return Response.json({ amb });
    }
    if (op === 'amb-public') return Response.json({ items: [...(await st.list({ prefix: 'amb:' })).values()].filter(x => x.status === 'approved' && x.listed)
      .map(x => ({ name: x.name, center: x.center, city: x.city, subject: x.subject, code: x.code, since: x.since })).sort((x, y) => x.since - y.since) });
    if (op === 'amb-code') { const sub = /^[a-z0-9]{8,16}$/.test(a.code || '') && await st.get('ambc:' + a.code), amb = sub && await st.get('amb:' + sub);
      return Response.json({ amb: amb && amb.status === 'approved' ? { name: amb.name, center: amb.center, city: amb.city, since: amb.since, code: amb.code } : null }); }
    // ---- One contact
    const c = await this.getC(a.id); if (!c) return Response.json({ error: 'not found' }, { status: 404 });
    if (op === 'get') {
      const camp = c.campaign && ((await st.get('camps')) || []).find(x => x.id === c.campaign || x.slug === c.campaign);
      const ref = c.referrer ? (await st.get('r:' + c.referrer)) || null : null;
      return Response.json({ contact: c, seqs: (await seqs()).map(s => ({ id: s.id, name: s.name, active: s.active })), campaign: camp ? { name: camp.name, slug: camp.slug } : null, referrer: ref && { code: c.referrer, sub: ref.sub, email: ref.email } });
    }
    if (op === 'update') {
      const { contact, error } = cleanContact(a.contact, c); if (error) return Response.json({ error }, { status: 400 });
      if (contact.email !== c.email) { if (c.email) await st.delete('k:e:' + c.email); if (contact.email && await st.get('k:e:' + contact.email)) return Response.json({ error: 'email taken' }, { status: 409 }); }
      Object.assign(c, contact); await this.save(c); await this.keys(c); return Response.json({ contact: c });
    }
    if (op === 'status') {
      if (!STATUSES.includes(a.status)) return Response.json({ error: 'status' }, { status: 400 });
      c.history.push({ at: now, by: a.by, what: 'status', from: c.status, to: a.status }); c.status = a.status;
      if (a.status === 'customer' && c.referrer && !c.referredCustomer) {
        c.referredCustomer = now; const k = 'rs:' + c.referrer, x = (await st.get(k)) || { leads: 0, customers: 0 }; x.customers++; await st.put(k, x);
      }
      if (c.seq) { const seq = (await seqs()).find(s => s.id === c.seq.id); if (seq && (seq.stopOn || []).includes(c.status)) { c.seq = null; c.history.push({ at: now, by: 'system', what: 'seq-stop', why: 'status' }); } }
      await this.save(c); return Response.json({ contact: c });
    }
    if (op === 'note') { const t = text(a.text, 5000); if (!t) return Response.json({ error: 'text' }, { status: 400 }); c.notes.push({ at: now, by: a.by, text: t }); await this.save(c); return Response.json({ contact: c }); }
    if (op === 'log') {                                   // { channel, text, by, status?, nextDays? }: a contact made by hand
      const ch = CHANNELS.includes(a.channel) ? a.channel : 'other';
      c.history.push({ at: now, by: a.by, what: 'touch', channel: ch, text: text(a.text, 3000) });
      if (STATUSES.includes(a.status) && a.status !== c.status) { c.history.push({ at: now, by: a.by, what: 'status', from: c.status, to: a.status }); c.status = a.status; }
      else if (c.status === 'new') c.status = 'contacted';
      const days = a.nextDays === 0 ? 0 : Math.min(365, Math.max(1, Math.round(+a.nextDays || (await settings()).followDays)));
      c.nextAt = days ? now + days * DAY : null; c.nextWhat = days ? str(a.nextWhat, 160) || 'Seguimiento' : '';
      await this.save(c); return Response.json({ contact: c });
    }
    if (op === 'next') {                                  // { at (ms, 0: none), what }
      c.nextAt = +a.at > 0 ? +a.at : null; c.nextWhat = c.nextAt ? str(a.what, 160) || 'Seguimiento' : ''; await this.save(c); return Response.json({ contact: c });
    }
    if (op === 'consent') {                               // { how (what happened, in the admin's words), by } | { revoke: true }
      if (a.revoke) { c.consent = null; c.seq = null; c.history.push({ at: now, by: a.by, what: 'consent-revoked' }); }
      else {
        const how = text(a.how, 300); if (how.length < 5) return Response.json({ error: 'how' }, { status: 400 });
        if (c.unsub) return Response.json({ error: 'unsubscribed' }, { status: 409 });       // (only they can ask again: the form)
        c.consent = { at: now, how: 'admin', note: how, by: a.by }; c.history.push({ at: now, by: a.by, what: 'consent', note: how });
      }
      await this.save(c); return Response.json({ contact: c });
    }
    if (op === 'enroll') {                                // { seq } | { stop: true }
      if (a.stop) { if (c.seq) c.history.push({ at: now, by: a.by, what: 'seq-stop', why: 'admin' }); c.seq = null; await this.save(c); return Response.json({ contact: c }); }
      const seq = (await seqs()).find(s => s.id === a.seq); if (!seq) return Response.json({ error: 'seq' }, { status: 404 });
      if (!mailable(c, seq)) return Response.json({ error: c.unsub ? 'unsubscribed' : !c.email ? 'no email' : !c.consent ? 'no consent' : 'status' }, { status: 409 });
      c.seq = { id: seq.id, step: 0, nextAt: now + (seq.steps[0].days || 0) * DAY, started: now };
      c.history.push({ at: now, by: a.by, what: 'seq-start', seq: seq.id }); await this.save(c); return Response.json({ contact: c });
    }
    if (op === 'delete') {
      await st.delete(['c:' + pad(c.id), 's:' + pad(c.id), ...(c.email ? ['k:e:' + c.email] : []), ...(c.osm ? ['k:o:' + c.osm] : [])]);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
}

// The first message templates (for calls, LinkedIn and letters): the admin edits them.
export function defaultTemplates() {
  return [
    { id: 'tplcall1', name: 'Llamada a un centro', channel: 'phone', subject: '', body: 'Hola, soy {yo}, de Revela. Llamo porque ayudamos a centros como {centro} a preparar clases con presentaciones interactivas: diapositivas, votaciones y cuestionarios en directo en una sola herramienta, compatible con PowerPoint y con Moodle.\n\n¿Con quién podría hablar sobre los recursos digitales del profesorado?\n\nSi le interesa, le envío información por correo (solo si me lo pide) o preparamos una demostración de 20 minutos.' },
    { id: 'tpllink1', name: 'LinkedIn: primer mensaje', channel: 'linkedin', subject: '', body: 'Hola, {nombre}: vi que trabajas en {centro}. Estoy detrás de Revela, un editor de presentaciones para el aula (votaciones y cuestionarios en directo, compatible con PowerPoint y Moodle). ¿Te parecería bien que te enseñara en 15 minutos cómo lo usan otros docentes?' },
    { id: 'tplcarta1', name: 'Carta a la dirección', channel: 'letter', subject: 'Revela para {centro}', body: 'A la atención de la dirección de {centro}\n{ciudad}\n\nEstimado equipo:\n\nLes escribo para presentarles Revela, una herramienta para crear presentaciones de clase con votaciones, cuestionarios y actividades en directo, compatible con PowerPoint y con Moodle, con los datos en Europa y en castellano, catalán, gallego y euskera.\n\nSi les interesa, pueden pedir una demostración o una prueba para su claustro en revelaslides.com/schools.\n\nUn saludo,\n{yo}' },
  ];
}

// ---- Searching OpenStreetMap (Nominatim for the place, Overpass for what is in it) -------------------
// → { area, items: [{ osm, name, kind, email, phone, web, address, city, region, country, lat, lon }] }. Public data
// (© OpenStreetMap contributors, ODbL). Polite: a User-Agent that says who asks, one search at a time.
export async function searchPlaces(env, { area, kind, limit = 200 }) {
  const f = env.FETCH || fetch, ua = { 'User-Agent': 'Revela-admin/1.0 (https://revelaslides.com)', Accept: 'application/json' };
  const filters = SEARCH[kind]; if (!filters) return { error: 'kind' };
  const q = str(area, 120); if (q.length < 2) return { error: 'area' };
  const geo = await f('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '5', addressdetails: '1' }), { headers: ua }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  if (!Array.isArray(geo)) return { error: 'geocode' };
  const place = geo.find(g => g.osm_type === 'relation') || geo[0]; if (!place) return { error: 'not found' };
  const where = place.osm_type === 'relation' ? `area(id:${3600000000 + +place.osm_id})->.a;` : place.osm_type === 'way' ? `area(id:${2400000000 + +place.osm_id})->.a;` : null;
  const scope = where ? '(area.a)' : `(around:8000,${+place.lat},${+place.lon})`;
  const n = Math.min(500, Math.max(1, Math.round(+limit || 200)));
  const query = `[out:json][timeout:25];${where || ''}(${filters.map(x => x + scope + ';').join('')});out center tags ${n};`;
  const data = await f('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { ...ua, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
  if (!data || !Array.isArray(data.elements)) return { error: 'overpass' };
  const cc = String(place.address?.country_code || '').toUpperCase(), region = place.address?.state || place.address?.province || '';
  const items = data.elements.map(e => {
    const t = e.tags || {};
    return { osm: `${e.type}/${e.id}`, name: str(t.name, 160), kind, email: mailOf(t.email || t['contact:email']), phone: str(t.phone || t['contact:phone'], 40),
      web: webOf(t.website || t['contact:website'] || t.url), address: str([t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '), 200),
      city: str(t['addr:city'] || place.address?.city || place.address?.town || place.address?.village || '', 80), region: str(region, 80), country: str(t['addr:country'] || cc, 2).toUpperCase(),
      postcode: str(t['addr:postcode'], 12), lat: e.lat ?? e.center?.lat ?? null, lon: e.lon ?? e.center?.lon ?? null, op: str(t['operator:type'] || t['school:type'] || '', 40) };
  }).filter(x => x.name).sort((x, y) => x.name.localeCompare(y.name, 'es'));
  return { area: place.display_name, items };
}

// ---- From the Worker -------------------------------------------------------------------------------
const crm = env => env.CRM.get(env.CRM.idFromName('crm'));
export const crmCall = async (env, op, body) => (await crm(env).fetch('https://crm/' + op, { method: 'POST', body: JSON.stringify(body || {}) })).json();
export const site = env => env.SITE_URL || 'https://revelaslides.com';
const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8', ...noStore, 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };

// POST /api/leads — the website's form «Revela para centros» (only from the site: api.js checks the origin).
//   { name (organisation), person, role?, email, phone?, kind, city?, country?, size?, message?, lang, privacy: true,
//     marketing?: true (its own box, never pre-ticked), campaign? (the slug that brought them), website? (a trap for bots) }
// → { ok }. Always answered (an email that it arrived, a line in the admin's summary); sequences only with marketing.
export async function handleLead(req, env, body, json, { takeQuota, sendMail }) {
  if (!env.CRM) return json({ error: 'not configured' }, 503);
  if (body.website) return json({ ok: true });                              // (a bot filled the hidden field)
  if (body.privacy !== true) return json({ error: 'privacy' }, 400);
  const email = mailOf(body.email); if (!email) return json({ error: 'email' }, 400);
  const lang = LANGS.includes(body.lang) ? body.lang : 'es';
  const { contact, error } = cleanContact({ name: body.name || body.person, person: body.person, role: body.role, email, phone: body.phone, kind: body.kind,
    city: body.city, country: body.country, size: body.size, lang }); if (error) return json({ error }, 400);
  const ip = req.headers.get('CF-Connecting-IP') || '?';
  if (!(await takeQuota(env, 'lead:ip:' + ip, { per: +env.LEADS_PER_DAY || 5, scope: 'leads' })) || !(await takeQuota(env, 'lead:to:' + email, { per: 3, scope: 'leads-to' }))) return json({ error: 'daily limit' }, 429);
  const slug = /^[a-z0-9][a-z0-9-]{1,39}$/.test(body.campaign || '') ? body.campaign : null;
  const camp = slug ? (await crmCall(env, 'camp-of', { slug })).camp : null;
  const marketing = body.marketing === true, referrer = await refOf(env, body.ref);
  const r = await crmCall(env, 'lead', { contact, message: text(body.message, 3000), marketing, campaign: camp?.id || null, referrer,
    consentText: marketing ? str(body.consentText, 300) || 'Formulario «Revela para centros»' : '' });
  if (camp && r.created) await crmCall(env, 'camp-hit', { id: camp.id, kind: 'lead' });
  if (referrer && r.created) await crmCall(env, 'ref-hit', { code: referrer, kind: 'leads' });
  const s = (await crmCall(env, 'settings')).settings;
  let unsub = null;
  if (marketing) { const t = await crmToken(env, 'unsub', { id: r.id, e: email }); if (t) unsub = `${site(env)}/api/crm/unsub?t=${encodeURIComponent(t)}`; }
  await sendMail(env, { to: email, kind: 'crm-ack', ...ackMail(lang, contact.person, marketing && !!unsub, s.identity), ...(unsub && { unsubscribe: unsub }), ...(s.replyTo && { replyTo: s.replyTo }) });
  return json({ ok: true });
}

// A recommendation's code, if it exists (from ?ref= on the site's links) → the code, or null.
async function refOf(env, code) {
  const c = String(code || '').toLowerCase();
  return /^[a-z0-9]{6,16}$/.test(c) && (await crmCall(env, 'ref-of', { code: c })).ref ? c : null;
}

// GET /api/events?lang= — the upcoming webinars (the centres' page shows them, with their sign-up).
export async function eventsPublic(env, url, json) {
  if (!env.CRM) return json({ events: [] });
  const lang = /^[a-z]{2}$/.test(url.searchParams.get('lang') || '') ? url.searchParams.get('lang') : '';
  return json(await crmCall(env, 'events-public', { now: Date.now(), lang }), 200, { 'Cache-Control': 'public, max-age=60' });
}
// POST /api/events/signup — { event, person, name (organisation)?, email, privacy: true, marketing?, lang, campaign?, ref?, website? }
// → { ok }. The person gets the confirmation with the link; a contact in Captación (consent only with marketing).
export async function eventSignup(req, env, body, json, { takeQuota, sendMail }) {
  if (!env.CRM) return json({ error: 'not configured' }, 503);
  if (body.website) return json({ ok: true });
  if (body.privacy !== true) return json({ error: 'privacy' }, 400);
  const email = mailOf(body.email); if (!email) return json({ error: 'email' }, 400);
  if (!/^[a-z0-9]{6,12}$/.test(body.event || '')) return json({ error: 'event' }, 400);
  const lang = LANGS.includes(body.lang) ? body.lang : 'es';
  const { contact, error } = cleanContact({ name: body.name || body.person, person: body.person, email, kind: body.kind, lang }); if (error) return json({ error }, 400);
  const ip = req.headers.get('CF-Connecting-IP') || '?';
  if (!(await takeQuota(env, 'lead:ip:' + ip, { per: +env.LEADS_PER_DAY || 5, scope: 'leads' }))) return json({ error: 'daily limit' }, 429);
  const slug = /^[a-z0-9][a-z0-9-]{1,39}$/.test(body.campaign || '') ? body.campaign : null, camp = slug ? (await crmCall(env, 'camp-of', { slug })).camp : null;
  const r = await crmCall(env, 'event-signup', { id: body.event, contact, marketing: body.marketing === true, consentText: str(body.consentText, 300), campaign: camp?.id || null, referrer: await refOf(env, body.ref) });
  if (r.error) return json({ error: r.error }, r.error === 'full' ? 409 : 404);
  if (!r.already) {
    if (camp && r.created) await crmCall(env, 'camp-hit', { id: camp.id, kind: 'lead' });
    const s = (await crmCall(env, 'settings')).settings;
    await sendMail(env, { to: email, kind: 'crm-event', ...eventMail('ok', r.event, lang, s.identity), ...(s.replyTo && { replyTo: s.replyTo }) });
  }
  return json({ ok: true });
}

// GET /api/referral (with a session) — my code to recommend Revela to my school or company → { on, code, link, reward, stats }.
// The code is the account's, signed (MAIL_SECRET): the same every time, and nobody can make another's.
export async function referralInfo(env, me, json) {
  if (!env.CRM || !env.MAIL_SECRET) return json({ on: false });
  const code = (await hmac(env.MAIL_SECRET, 'ref:' + me.sub)).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const r = await crmCall(env, 'ref-code', { code, sub: me.sub, email: me.email || '' });
  if (!r.settings?.referral) return json({ on: false });
  return json({ on: true, code, link: `${site(env)}/schools?ref=${code}`, reward: r.settings.referralReward || '', stats: r.stats });
}

// GET /api/go/<slug> — a campaign's link: counted (a visit that day; nobody recorded) and on to its address, with
// rv=<slug> and utm_*. rv travels in the addresses only (nothing stored on the device): the site's links carry it on,
// and a new account or a request made in that visit counts for the campaign — and that account's purchases after.
export async function goLink(env, slug) {
  const s = String(slug || '').toLowerCase(), camp = env.CRM && /^[a-z0-9][a-z0-9-]{1,39}$/.test(s) ? (await crmCall(env, 'camp-of', { slug: s })).camp : null;
  const today = dayKey(Date.now());
  const live = camp && camp.active && (!camp.from || camp.from <= today) && (!camp.until || camp.until >= today);
  if (live) await crmCall(env, 'camp-hit', { id: camp.id, kind: 'visit' });
  const to = new URL(camp?.url || '/', site(env) + '/');
  if (camp) { to.searchParams.set('rv', camp.slug); if (!to.searchParams.has('utm_source')) { to.searchParams.set('utm_source', camp.channel || 'revela'); to.searchParams.set('utm_campaign', camp.slug); } }
  return new Response(null, { status: 302, headers: { Location: to.href, ...noStore } });
}

// GET|POST /api/crm/unsub?t= — the way out (POST: one click, RFC 8058; GET: the page, which also does it).
export async function crmUnsub(req, env, url) {
  let t = url.searchParams.get('t') || '';
  if (req.method === 'POST' && !t) { const f = new URLSearchParams(await req.text().catch(() => '')); t = f.get('t') || ''; }
  const tok = await readCrmToken(env, 'unsub', t);
  const r = tok && env.CRM ? await crmCall(env, 'unsub', { id: tok.id, email: tok.e, seq: tok.s ?? null, i: tok.i ?? null }) : { ok: false };
  if (req.method === 'POST') return Response.json({ ok: !!r.ok }, { status: r.ok ? 200 : 400, headers: noStore });
  return new Response(unsubPageCrm(r.lang || (req.headers.get('Accept-Language') || '').slice(0, 2), !!r.ok, site(env)), { status: r.ok ? 200 : 400, headers: htmlHeaders });
}
// GET /api/crm/click?t= — a link in a sequence's email: counted, and on (only to the address signed in the token).
export async function crmClick(env, url) {
  const tok = await readCrmToken(env, 'click', url.searchParams.get('t'));
  if (!tok || !/^https:\/\//.test(tok.u || '')) return new Response(null, { status: 302, headers: { Location: site(env) + '/', ...noStore } });
  if (env.CRM) await crmCall(env, 'click', { id: tok.id, seq: tok.s, i: tok.i, url: tok.u }).catch(() => {});
  return new Response(null, { status: 302, headers: { Location: tok.u, ...noStore } });
}

// The campaign that brought an account: at its first sign-in (api.js login), and its purchases after (moneyEvent).
export async function campaignSignup(env, sub, slug) {
  if (!env.CRM || !sub || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug || '')) return;
  await crmCall(env, 'camp-hit', { slug, kind: 'signup', sub }).catch(() => {});
}
export async function campaignPurchase(env, sub, amount) {
  if (!env.CRM || !sub) return;
  const { slug } = await crmCall(env, 'camp-sub', { sub }).catch(() => ({}));
  if (slug) await crmCall(env, 'camp-hit', { slug, kind: 'purchase', amount }).catch(() => {});
}

// The daily run (worker.js scheduled): each sequence email due (up to the day's maximum), then a summary for the admin.
export async function runCrm(env, { sendMail, mailConfigured, adminEmails = [] }, now = Date.now()) {
  if (!env.CRM) return { sent: 0 };
  // (Privacy: a contact that came to nothing — new, contacted or discarded — and untouched for 3 years is deleted.)
  await crmCall(env, 'purge', { before: now - 3 * 365 * DAY }).catch(() => {});
  const due = await crmCall(env, 'due', { now }), s = due.settings;
  let sent = 0, failed = 0;
  // (Without MAIL_SECRET there is no way out to put in them, and without a sender's identity they can't go: none is sent.)
  const canSend = env.MAIL_SECRET && mailConfigured(env) && s.identity;
  for (const m of canSend ? due.mails : []) {
    const c = m.contact, lang = m.seq.lang || c.lang || 'es';
    const unsubT = await crmToken(env, 'unsub', { id: c.id, e: c.email, s: m.seq.id, i: m.i }), unsub = `${site(env)}/api/crm/unsub?t=${encodeURIComponent(unsubT)}`;
    const links = new Map();
    for (const u of String(m.step.body).match(/https:\/\/[^\s<]+[^\s<.,;:!?)»"']/g) || []) links.set(u, `${site(env)}/api/crm/click?t=${encodeURIComponent(await crmToken(env, 'click', { id: c.id, s: m.seq.id, i: m.i, u }))}`);
    const msg = crmMail({ subject: fill(m.step.subject, c), body: fill(m.step.body, c), lang, identity: s.identity, unsub, consentAt: c.consent?.at, track: u => links.get(u) || u });
    const ok = await sendMail(env, { to: c.email, kind: 'crm', ...msg, unsubscribe: unsub, ...(s.replyTo && { replyTo: s.replyTo }) });
    await crmCall(env, 'sent', { id: c.id, seq: m.seq.id, i: m.i, ok, subject: msg.subject });
    if (ok) sent++; else failed++;
  }
  // Webinars tomorrow: a reminder to each one signed up (part of what they asked for: no consent needed, but only that).
  let reminded = 0;
  if (mailConfigured(env)) for (const x of (await crmCall(env, 'events-due', { now })).items || []) {
    if (await sendMail(env, { to: x.to.email, kind: 'crm-event', ...eventMail('reminder', x.event, x.to.lang || x.event.lang, s.identity), ...(s.replyTo && { replyTo: s.replyTo }) })) reminded++;
  }
  // The admin's summary: follow-ups due today, new requests, what went out (only if there is something).
  const to = s.digestTo || adminEmails[0];
  if (s.digest && to && mailConfigured(env) && (due.followups.length || due.leads.length || sent || failed || reminded || (!canSend && due.mails.length))) {
    const line = c => `· ${c.name}${c.city ? ' (' + c.city + ')' : ''}${c.nextWhat ? ' — ' + c.nextWhat : ''}`;
    const body = [
      due.leads.length ? `Solicitudes nuevas desde la web (${due.leads.length}):\n${due.leads.map(line).join('\n')}` : '',
      due.followups.length ? `Seguimientos para hoy (${due.followups.length}):\n${due.followups.slice(0, 40).map(line).join('\n')}` : '',
      reminded ? `Recordatorios de seminarios enviados: ${reminded}.` : '',
      sent || failed ? `Correos de secuencias enviados hoy: ${sent}${failed ? ` (${failed} no se pudieron enviar: se reintentan mañana)` : ''}.` : '',
      !canSend && due.mails.length ? `Hay ${due.mails.length} correos de secuencias esperando, pero no se envían: falta ${!s.identity ? 'la identidad del remitente (Captación ▸ Ajustes)' : !env.MAIL_SECRET ? 'MAIL_SECRET' : 'un servicio de correo'}.` : '',
      `Abrir Captación: https://${env.ADMIN_HOST || 'admin.revelaslides.com'}/#captacion`,
    ].filter(Boolean).join('\n\n');
    await sendMail(env, { to, kind: 'crm-digest', ...crmMail({ subject: `Captación: ${due.followups.length} seguimientos, ${due.leads.length} solicitudes`, body, lang: 'es', identity: '' }) });
  }
  return { sent, failed, reminded };
}

// /api/admin/crm/… (admin.js has checked who it is). by: the admin's address; audit(e): the record.
export async function crmApi(env, path, q, body, { GET, POST, by, json, audit }) {
  if (!env.CRM) return json({ error: 'crm not configured' }, 503);
  const C = (op, b) => crmCall(env, op, { ...b, by });
  const sub = path.replace(/^\/crm/, '') || '/';
  const send = r => json(r, r.error ? (r.error === 'not found' ? 404 : /taken|unsubscribed|no email|no consent|status/.test(r.error) ? 409 : 400) : 200);
  if (GET && sub === '/stats') return json({ ...(await C('stats')), mail: !!(env.MAIL_SECRET && (env.EMAIL?.send || env.RESEND_KEY)) });
  if (GET && sub === '/contacts') return json(await C('list', { q: q.get('q') || '', status: q.get('status') || '', kind: q.get('kind') || '', source: q.get('source') || '', tag: q.get('tag') || '',
    consent: q.get('consent') === '1', due: q.get('due') === '1', sort: q.get('sort') === 'score' ? 'score' : '', offset: +q.get('offset') || 0, limit: +q.get('limit') || 100 }));
  // The «Rastreador» (crawler.js): its state and settings, a step by hand, one contact's website now.
  if (sub === '/crawler' || sub === '/crawler/step') {
    if (!env.CRAWLER) return json({ error: 'crawler not configured' }, 503);
    if (GET && sub === '/crawler') return json({ ...(await crawlerCall(env, 'status')), score: SCORE });
    if (POST && sub === '/crawler') { const r = await crawlerCall(env, 'settings', { settings: body.settings }); if (!r.error) await audit({ action: 'crm-crawler', target: 'crm:crawler', after: r.settings }); return send(r); }
    if (POST && sub === '/crawler/step') return json(await crawlerCall(env, 'step'));
  }
  if (POST && sub === '/contacts') { const r = await C('add', { contact: body.contact, source: 'manual' }); if (!r.error) await audit({ action: 'crm-add', target: 'crm:' + r.id }); return send(r); }
  if (POST && sub === '/import') {
    const r = await C('import', { rows: Array.isArray(body.rows) ? body.rows.slice(0, 1000) : [], source: body.source === 'osm' ? 'osm' : 'import' });
    await audit({ action: 'crm-import', target: 'crm', after: r }); return json(r);
  }
  if (GET && sub === '/search') {
    const r = await searchPlaces(env, { area: q.get('area'), kind: q.get('kind'), limit: +q.get('limit') || 200 }); if (r.error) return json(r, r.error === 'kind' || r.error === 'area' ? 400 : 502);
    const { known } = await C('known', { osm: r.items.map(x => x.osm) });
    return json({ ...r, items: r.items.map(x => ({ ...x, known: known[x.osm] || null })) });
  }
  if (GET && sub === '/settings') return json(await C('settings'));
  if (POST && sub === '/settings') { const r = await C('settings-put', { settings: body.settings }); await audit({ action: 'crm-settings', target: 'crm', after: r.settings }); return json(r); }
  if (GET && sub === '/sequences') return json(await C('seqs'));
  if (POST && sub === '/sequences') { const r = await C('seq-put', { seq: body.seq }); if (!r.error) await audit({ action: 'crm-sequence', target: 'crm:seq:' + r.seq.id, after: { name: r.seq.name, active: r.seq.active, steps: r.seq.steps.length } }); return send(r); }
  let m = sub.match(/^\/sequences\/([a-z0-9]{6,12})\/delete$/);
  if (POST && m) { await audit({ action: 'crm-sequence-delete', target: 'crm:seq:' + m[1] }); return json(await C('seq-del', { id: m[1] })); }
  if (GET && sub === '/templates') return json(await C('tpls'));
  if (POST && sub === '/templates') return send(await C('tpl-put', { tpl: body.tpl }));
  m = sub.match(/^\/templates\/([a-z0-9]{6,12})\/delete$/);
  if (POST && m) return json(await C('tpl-del', { id: m[1] }));
  if (GET && sub === '/campaigns') return json({ ...(await C('camps')), base: `${site(env)}/api/go/` });
  if (POST && sub === '/campaigns') { const r = await C('camp-put', { camp: body.camp }); if (!r.error) await audit({ action: 'crm-campaign', target: 'crm:camp:' + r.camp.slug, after: r.camp }); return send(r); }
  m = sub.match(/^\/campaigns\/([a-z0-9]{6,12})\/delete$/);
  if (POST && m) { await audit({ action: 'crm-campaign-delete', target: 'crm:camp:' + m[1] }); return json(await C('camp-del', { id: m[1] })); }
  // A sequence's email as it will look, to see it or try it on oneself (POST …/preview { seq, i, id?, send? }).
  if (POST && sub === '/preview') {
    const seqs = (await C('seqs')).seqs, seq = seqs.find(x => x.id === body.seq) || cleanSequence(body.draft || {}).seq, step = seq?.steps[+body.i || 0];
    if (!step) return json({ error: 'steps' }, 400);
    const c = body.id ? (await C('get', { id: body.id })).contact : { name: 'Colegio Ejemplo', person: 'Ana', city: 'Zaragoza', consent: { at: Date.now() } };
    const s = (await C('settings')).settings;
    const msg = crmMail({ subject: fill(step.subject, c || {}), body: fill(step.body, c || {}), lang: seq.lang || c?.lang || 'es', identity: s.identity, unsub: `${site(env)}/api/crm/unsub?t=…`, consentAt: c?.consent?.at });
    if (body.send) {
      const { sendMail } = await import('./mail.js');
      const ok = await sendMail(env, { to: by, kind: 'crm-test', ...msg, subject: '[Prueba] ' + msg.subject });
      return json({ ok, to: by });
    }
    return json({ subject: msg.subject, html: msg.html, missing: !s.identity ? 'identity' : null });
  }
  if (GET && sub === '/events') return json(await C('events'));
  if (POST && sub === '/events') { const r = await C('event-put', { event: body.event }); if (!r.error) await audit({ action: 'crm-event', target: 'crm:event:' + r.event.id, after: { title: r.event.title, starts: r.event.starts } }); return send(r); }
  m = sub.match(/^\/events\/([a-z0-9]{6,12})(?:\/(delete|mail))?$/);
  if (m) {
    if (GET && !m[2]) return send(await C('event-signups', { id: m[1] }));
    if (POST && m[2] === 'delete') { await audit({ action: 'crm-event-delete', target: 'crm:event:' + m[1] }); return json(await C('event-del', { id: m[1] })); }
    // An email to everyone signed up (the link, the recording, the materials: what they signed up for).
    if (POST && m[2] === 'mail') {
      const subject = str(body.subject, 140), msgBody = text(body.body, 6000); if (!subject || !msgBody) return json({ error: 'text' }, 400);
      const { signups, event, error } = await C('event-signups', { id: m[1] }); if (error) return json({ error }, 404);
      const s = (await C('settings')).settings; let ok = 0;
      const { sendMail } = await import('./mail.js');
      for (const x of signups) if (await sendMail(env, { to: x.email, kind: 'crm-event', ...crmMail({ subject, body: fill(msgBody, { person: x.person, name: x.name }), lang: x.lang || event.lang, identity: s.identity }), ...(s.replyTo && { replyTo: s.replyTo }) })) ok++;
      await audit({ action: 'crm-event-mail', target: 'crm:event:' + m[1], after: { subject, sent: ok } });
      return json({ sent: ok, of: signups.length });
    }
  }
  if (GET && sub === '/referrals') return json(await C('refs'));
  if (GET && sub === '/ambassadors') return json(await C('amb-list', { status: q.get('status') || '' }));
  m = sub.match(/^\/ambassadors\/([\w.-]{1,100})\/status$/);
  if (POST && m) {
    const r = await C('amb-status', { sub: m[1], status: body.status, note: str(body.note, 300) }); if (r.error) return send(r);
    let proUntil = 0;
    if (body.status === 'approved' && +body.proDays > 0 && env.ACCOUNTS) {
      proUntil = Date.now() + Math.min(730, +body.proDays) * DAY;
      await env.ACCOUNTS.get(env.ACCOUNTS.idFromName('u:' + m[1])).fetch('https://do/admin-plan', { method: 'POST', body: JSON.stringify({ until: proUntil, reason: 'Embajador/a de Revela', by }) });
    }
    if (body.status === 'approved' && body.mail !== false) {
      const { sendMail } = await import('./mail.js'), s = (await C('settings')).settings;
      await sendMail(env, { to: r.amb.email, kind: 'crm-ambassador', ...ambassadorMail(env, r.amb, proUntil, s.identity), ...(s.replyTo && { replyTo: s.replyTo }) });
    }
    await audit({ action: 'ambassador-' + body.status, target: m[1], after: { proUntil: proUntil || null } });
    return json({ amb: r.amb, proUntil });
  }
  m = sub.match(/^\/contacts\/(\d{1,9})(?:\/(status|note|log|next|consent|enroll|delete|message|crawl|use-email))?$/);
  if (m) {
    const id = +m[1], op = m[2] || '';
    if (POST && op === 'crawl') {                         // its website, now (the same visit as the crawler's)
      const { contact } = await C('get', { id }); if (!contact) return json({ error: 'not found' }, 404); if (!contact.web) return json({ error: 'no web' }, 400);
      const facts = await crawlSite(contact.web, { f: env.FETCH || fetch, pages: CRAWL_DEFAULT.pagesPerSite, sleep: env.CRAWL_SLEEP === '0' ? async () => {} : undefined });
      await C('web-facts', { id, facts }); return json({ facts });
    }
    if (POST && op === 'use-email') {                     // an address its website publishes, as the contact's (no email is sent for it)
      const { contact } = await C('get', { id }); if (!contact) return json({ error: 'not found' }, 404);
      const e = String(body.email || '').toLowerCase(); if (!(contact.webFacts?.emails || []).some(x => x.email === e)) return json({ error: 'email' }, 400);
      return send(await C('update', { id, contact: { email: e } }));
    }
    if (GET && !op) return send(await C('get', { id }));
    if (POST && !op) { const r = await C('update', { id, contact: body.contact }); if (!r.error) await audit({ action: 'crm-update', target: 'crm:' + id }); return send(r); }
    if (POST && op === 'message') {                       // a template filled for this contact (to copy: calls, LinkedIn, letters)
      const [{ tpls }, got] = await Promise.all([C('tpls'), C('get', { id })]); const t = tpls.find(x => x.id === body.tpl); if (!t || !got.contact) return json({ error: 'not found' }, 404);
      const me = { yo: str(body.me, 80) || by };
      return json({ subject: fill(t.subject, got.contact, me), body: fill(t.body, got.contact, me), channel: t.channel });
    }
    if (POST && ['status', 'note', 'log', 'next', 'consent', 'enroll', 'delete'].includes(op)) {
      const r = await C(op, { id, ...body });
      if (!r.error && ['status', 'consent', 'enroll', 'delete'].includes(op)) await audit({ action: 'crm-' + op, target: 'crm:' + id, after: op === 'consent' ? { how: body.how, revoke: !!body.revoke } : op === 'delete' ? null : { status: body.status, seq: body.seq, stop: body.stop } });
      return send(r);
    }
  }
  return json({ error: 'not found' }, 404);
}
