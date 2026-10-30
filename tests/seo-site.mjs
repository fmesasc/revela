// The website's search-engine basics, on the built site (tools/build-site.mjs): every page has its own title, description and
// heading, its canonical address and its versions in the other languages (each pointing back), its social card and valid
// structured data; the sitemap lists every page that exists and nothing that doesn't; no link of the site leads nowhere.
// A page or a feature added later has to keep to them: the run fails, with the pages, until it does.
//   node tests/seo-site.mjs      (needs site/, the private fmesasc/revela-site: without it, skipped)
import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../tools/build-site.mjs';
import { SITE_LANGS } from '../tools/site-i18n.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(ROOT, 'site', 'index.html'))) { console.log('SEO: sin site/ (repositorio privado fmesasc/revela-site): comprobaciones de la web omitidas'); process.exit(0); }

const SITE = 'https://revelaslides.com';
const LEGAL = new Set(['privacy', 'terms', 'legal', 'dpa']);                  // (one address, three languages inside: no versions, several headings)
let fails = 0, n = 0;
const bad = {};
const check = (ok, name, what) => { n++; if (!ok) { (bad[name] ||= []).push(what); } };

const tmp = mkdtempSync(join(tmpdir(), 'revela-seo-'));
try {
  const out = await build(join(tmp, 'site'));
  const pages = new Map();                                                    // url → { file, html }
  const walk = d => { for (const e of readdirSync(d, { withFileTypes: true })) {
    const f = join(d, e.name), rel = relative(out, f).split(sep).join('/');
    if (e.isDirectory()) { if (!['app', 'assets', 'icons', 'demo', 'video', 'img'].includes(rel)) walk(f); continue; }
    if (!e.name.endsWith('.html') || rel === '404.html') continue;
    const url = SITE + '/' + (rel === 'index.html' ? '' : rel.endsWith('/index.html') ? rel.slice(0, -10) : rel.slice(0, -5));
    pages.set(url, { file: rel, html: readFileSync(f, 'utf8') });
  } };
  walk(out);
  const langOf = u => { const p = new URL(u).pathname.split('/')[1]; return SITE_LANGS.includes(p) && p !== 'es' ? p : 'es'; };
  const attr = (html, re) => (re.exec(html) || [])[1];
  const unesc = t => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
  const plain = h => unesc(h.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
  const info = new Map();
  for (const [u, { html }] of pages) {
    // (Nothing outside the app, the demos and the 404 page is left out of search engines: a template, a guide or an index with «noindex» is a mistake.)
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) { check(false, 'página de contenido con «noindex»', u); continue; }
    const lang = langOf(u), slug = new URL(u).pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '').replace(/^\//, '') || 'index', isLegal = LEGAL.has(slug);
    const isTpl = /\/templates\/(?!category\/|us-teachers$)[^/]+$/.test(u);
    const title = plain(attr(html, /<title>([\s\S]*?)<\/title>/) || ''), desc = unesc(attr(html, /<meta name="description" content="([^"]*)"/) || '');
    const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => plain(m[1]));
    const canon = attr(html, /<link rel="canonical" href="([^"]*)"/);
    const alts = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]));
    info.set(u, { lang, title, desc, h1, alts, isLegal, slug });
    check(!!title, 'sin <title>', u);
    // (Titles of 30–70 characters with the search and the brand — the SEO tools call a shorter one «too short», a longer one is cut; Arabic and Basque take fewer letters to say the same. A template whose name is long is the exception, up to 90.)
    check(title.length >= 30 && title.length <= (isTpl ? 90 : 70), 'título fuera de 30–70 caracteres (90 en plantillas)', `${u} (${title.length}) ${title}`);
    check(!!desc, 'sin meta description', u);
    check(desc.length <= (isTpl ? 160 : 260), 'descripción demasiado larga (>160 en plantillas, >260 en el resto)', `${u} (${desc.length})`);
    check(canon === u, 'canonical distinta de la dirección de la página', `${u} → ${canon}`);
    if (!isLegal) check(h1.length === 1, 'debe haber un único <h1>', `${u} (${h1.length})`);
    if (!isLegal) { check(!!attr(html, /<meta property="og:image" content="([^"]+)"/), 'sin og:image', u); check(/<meta name="twitter:card"/.test(html), 'sin twitter:card', u); }
    check(new RegExp(`<html lang="${lang}"`).test(html) || isLegal, 'el atributo lang de <html> no es el del idioma', u);
    for (const m of html.matchAll(/<img\b[^>]*>/g)) check(/\salt="/.test(m[0]), 'imagen sin atributo alt', `${u} ${m[0].slice(0, 60)}`);
    // Structured data: parses, and a video has what Google asks of it.
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let j; try { j = JSON.parse(m[1]); } catch (e) { check(false, 'JSON-LD que no se puede leer', u); continue; }
      for (const node of j['@graph'] || [j]) {
        if (node['@type'] === 'VideoObject') for (const k of ['name', 'description', 'thumbnailUrl', 'contentUrl', 'uploadDate']) check(!!node[k], `VideoObject sin ${k}`, u);
        if (node['@type'] === 'BreadcrumbList') check(node.itemListElement.length >= 2 && node.itemListElement.every((it, i) => it.position === i + 1 && it.name && it.item), 'BreadcrumbList mal formada', u);
        if (node['@type'] === 'FAQPage') check(node.mainEntity.length > 0 && node.mainEntity.every(q => q.name && q.acceptedAnswer?.text), 'FAQPage sin preguntas o sin respuestas', u);
      }
    }
  }
  // Each page's title, description and heading are its own within its language.
  for (const key of ['title', 'desc']) {
    const seen = new Map();
    for (const [u, i] of info) { if (!i[key] || i.isLegal) continue; const k = i.lang + '\0' + i[key]; check(!seen.has(k), `${key === 'title' ? 'título' : 'descripción'} repetido en el mismo idioma`, `${u} = ${seen.get(k)}`); seen.set(k, u); }
  }
  const h1s = new Map();
  for (const [u, i] of info) { if (i.isLegal || !i.h1[0]) continue; const k = i.lang + '\0' + i.h1[0]; check(!h1s.has(k), '<h1> repetido en el mismo idioma', `${u} = ${h1s.get(k)}`); h1s.set(k, u); }
  // Versions in other languages: each exists, points back, and the page names itself.
  for (const [u, i] of info) {
    if (i.isLegal || !Object.keys(i.alts).length) continue;
    check(Object.values(i.alts).includes(u), 'hreflang sin la propia página', u);
    check(!!i.alts['x-default'], 'hreflang sin x-default', u);
    for (const [lg, href] of Object.entries(i.alts)) {
      if (lg === 'x-default') continue;
      check(info.has(href), 'hreflang hacia una página que no existe', `${u} → ${lg} ${href}`);
      check(info.get(href)?.alts[lg] === href, 'hreflang que no se devuelve', `${u} → ${href}`);
    }
  }
  // The sitemap: every address exists, every page of the site is in it.
  const sm = readFileSync(join(out, 'sitemap.xml'), 'utf8'), locs = new Set([...sm.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map(m => m[1]));
  check(!/<lastmod>/.test(sm), 'sitemap con <lastmod> (sería la fecha de la construcción, no la del cambio)', 'sitemap.xml');
  for (const l of locs) check(pages.has(l) || /^https:\/\/revelaslides\.com\/(community|app)/.test(l), 'el sitemap lista una dirección que no existe', l);
  for (const [u] of info) check(locs.has(u), 'página fuera del sitemap', u);
  check(locs.size > 1000, 'el sitemap parece vacío', String(locs.size));
  for (const l of locs) check(!/<meta name="robots" content="[^"]*noindex/.test(pages.get(l)?.html || ''), 'el sitemap lista una página con «noindex»', l);
  const headers = readFileSync(join(out, '_headers'), 'utf8'), robots = readFileSync(join(out, 'robots.txt'), 'utf8');
  check(!/x-robots-tag/i.test(headers), 'la web de producción manda X-Robots-Tag en _headers', '_headers');
  check(!/^\s*Disallow:\s*\/\s*$/m.test(robots), 'robots.txt cierra todo el sitio', 'robots.txt');
  for (const f of readdirSync(join(out, 'demo')).filter(f => f.endsWith('.html'))) check(/noindex/.test(readFileSync(join(out, 'demo', f), 'utf8')), 'una demostración sin «noindex» (repite la portada)', 'demo/' + f);
  for (const f of ['index.html', 'remote.html', 'view.html', 'vote.html']) check(/noindex/.test(readFileSync(join(out, 'app', f), 'utf8')), 'una página de la aplicación sin «noindex»', 'app/' + f);
  // Internal links: where they go exists (the app, the API and the community are not this site's files).
  const exists = p => { const q = p.replace(/\/+$/, ''); return q === '' ? true : [q + '.html', q + '/index.html', q].some(x => existsSync(join(out, x)) && statSync(join(out, x)).isFile()); };
  const redirects = readFileSync(join(out, '_redirects'), 'utf8');
  for (const [u, { html }] of pages) {
    for (const m of html.matchAll(/<a\b[^>]*\shref="([^"#?]*)/g)) {
      const h = m[1]; if (!h || /^(https?:|mailto:|tel:|javascript:)/.test(h)) continue;
      const p = new URL(h, u).pathname;
      if (/^\/(app|api|community|comunidad)(\/|$)/.test(p) || p.startsWith('/demo/')) continue;
      check(exists(decodeURIComponent(p)), 'enlace interno roto', `${u} → ${p}`);
    }
  }
  check(redirects.includes('/centros /schools 301'), '_redirects: faltan las redirecciones antiguas', '_redirects');
  for (const [k, v] of Object.entries(bad)) { fails += v.length; console.log(`✗ SEO: ${k} (${v.length})\n   ` + v.slice(0, 40).join('\n   ')); }
  console.log(fails ? `SEO FAIL ${fails} problemas en ${pages.size} páginas` : `SEO PASS ${n} comprobaciones en ${pages.size} páginas (${info.size} indexables)`);
} finally { rmSync(tmp, { recursive: true, force: true }); }
process.exit(fails ? 1 : 0);
