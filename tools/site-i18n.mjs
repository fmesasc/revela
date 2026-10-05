// The website in several languages, made when it's built (tools/build-site.mjs): the
// Spanish pages in site/ are the source, and site/i18n/<lang>.json says how each of their
// texts reads in that language. Each language has its own address (/en/, /fr/…), so
// search engines index each one, with hreflang links between them.
//
// A "text" is what a reader sees as one piece: a paragraph, a heading, a list item, a
// button, with its inline marks (<em>, <a>, <b>…) inside, written exactly as in the page
// (spaces collapsed). Attributes people read (alt, aria-label, title, the meta
// description…) are texts too. A text missing from a language stops the build:
// `node tools/build-site.mjs --missing` lists them.

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
export const SITE = 'https://revelaslides.com';
export const SITE_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca'];        // (es: at the root)
export const LOCALE = { es: 'es_ES', en: 'en_US', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', pt: 'pt_PT', ca: 'ca_ES' };
export const LANG_NAME = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', ca: 'Català' };
// The suggestion shown to someone whose browser is in another language (site.js), in that language.
const SUGGEST = { es: ['Esta página está también en español.', 'Ver en español'], en: ['This page is also available in English.', 'View in English'],
  fr: ['Cette page existe aussi en français.', 'Voir en français'], de: ['Diese Seite gibt es auch auf Deutsch.', 'Auf Deutsch ansehen'],
  it: ['Questa pagina è disponibile anche in italiano.', 'Vedi in italiano'], pt: ['Esta página também está em português.', 'Ver em português'],
  ca: ['Aquesta pàgina també és en català.', 'Veure-la en català'] };
const LEGAL = ['privacy', 'terms', 'legal', 'dpa'], LEGAL_LANGS = ['es', 'ca', 'en'];   // (the legal pages: one address, three languages inside)

const INLINE = new Set(['a', 'em', 'strong', 'b', 'i', 'small', 'span', 'br', 'kbd', 'code', 'abbr', 'img', 'sup', 'sub']);
const VOID = new Set(['br', 'img', 'meta', 'link', 'input', 'hr', 'source']);
const READ_ATTRS = ['alt', 'aria-label', 'title', 'placeholder', 'data-month', 'data-year', 'data-tax-eur', 'data-tax-usd'];
const META_TEXT = /^(description|og:title|og:description|twitter:title|twitter:description)$/;
const KEEP = new Set(['Revela', 'FM Lab', 'Pro']);                             // (names: the same in every language)
const hasWords = s => { const t = norm(s.replace(/<[^>]*>/g, '').replace(/&\w+;/g, '')); return /\p{L}{2,}/u.test(t) && !KEEP.has(t); };
export const norm = s => s.replace(/\s+/g, ' ').trim();
const tagName = tok => (tok.match(/^<\/?([a-zA-Z][\w-]*)/) || [])[1]?.toLowerCase();

// Every text of a page, in order: [{ key, at: [from, to] }] over the token list; and the tokens.
function segments(html) {
  const toks = html.split(/(<!--[\s\S]*?-->|<[^>]+>)/);
  const out = [];
  let run = [];
  const flush = () => { if (run.length) split(run[0], run[run.length - 1]); run = []; };
  // A run of text and inline marks: one text, unless it's only marks side by side (a menu
  // of links): then each of them, by its inside.
  const split = (a, b) => {
    while (a <= b && !toks[a].trim()) a++;
    while (b >= a && !toks[b].trim()) b--;
    if (a > b) return;
    let depth = 0, outside = false; const tops = [];
    for (let i = a; i <= b; i++) {
      const t = toks[i];
      if (t.startsWith('<!--')) continue;
      if (!t.startsWith('<')) { if (depth === 0 && hasWords(t)) outside = true; continue; }
      const n = tagName(t), close = t.startsWith('</');
      if (VOID.has(n) || t.endsWith('/>')) { if (depth === 0) tops.push([i, i]); continue; }
      if (close) { depth--; if (depth === 0) tops[tops.length - 1][1] = i; }
      else { if (depth === 0) tops.push([i, null]); depth++; }
    }
    const whole = toks.slice(a, b + 1).join('');
    if (outside) { if (hasWords(whole)) out.push({ key: norm(whole), at: [a, b] }); return; }
    for (const [s, e] of tops) if (e != null && e > s) split(s + 1, e - 1);
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t) continue;
    if (t.startsWith('<') && !t.startsWith('<!--')) {
      const n = tagName(t);
      if ((n === 'script' || n === 'style') && !t.startsWith('</')) { flush(); while (i < toks.length && !/^<\/(script|style)/i.test(toks[i])) i++; continue; }
      if (!INLINE.has(n)) { flush(); continue; }
    }
    run.push(i);
  }
  flush();
  return { toks, out };
}

// The attribute texts of a tag: [{ name, value }] (values as written, entities included).
function readAttrs(tag) {
  const list = [], meta = tagName(tag) === 'meta' && (tag.match(/\b(?:name|property)="([^"]+)"/) || [])[1];
  tag.replace(/\s([\w-]+)="([^"]*)"/g, (m, name, value) => {
    if ((READ_ATTRS.includes(name) || (name === 'content' && meta && META_TEXT.test(meta))) && hasWords(value)) list.push({ name, value });
    return m;
  });
  return list;
}

// All the texts of a page (to translate): unique, in order.
export function pageTexts(html) {
  const { toks, out } = segments(html), keys = out.map(s => s.key);
  for (const t of toks) if (t.startsWith('<') && !t.startsWith('</')) for (const a of readAttrs(t)) keys.push(norm(a.value));
  for (const s of ldTexts(html)) keys.push(s);
  keys.push('Idioma');                                                          // (the language menu's name)
  return [...new Set(keys)];
}

// Structured data (JSON-LD): the texts people may see in search results.
const LD_KEYS = ['description', 'applicationSubCategory', 'name'];
function ldTexts(html) {
  const found = [];
  const walk = (o, k) => { if (typeof o === 'string') { if (LD_KEYS.includes(k) && hasWords(o)) found.push(o); }
    else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, Array.isArray(o) ? k : kk); };
  html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (m, j) => { walk(JSON.parse(j)); return m; });
  return found;
}

// Where a page's link leads, from the page in `lang` (es: at the root, the others in /lang/).
function relink(url, lang) {
  if (!url || /^(https?:|mailto:|data:|#|\/)/.test(url)) return url;
  const [path, hash = ''] = url.split('#'), h = hash ? '#' + hash : '';
  const base = lang === 'es' ? '/' : `/${lang}/`;
  if (path === '' || path === './') return base + h;
  if (/^app\//.test(path)) { const q = new URLSearchParams(path.split('?')[1] || ''); if (lang !== 'es') q.set('lang', lang); const s = q.toString(); return '/app/' + (s ? '?' + s : '') + h; }
  if (LEGAL.includes(path)) return '/' + path + (hash ? h : LEGAL_LANGS.includes(lang) && lang !== 'es' ? '#' + lang : '');
  if (/^demo\/[\w-]+\.html$/.test(path) && lang !== 'es') return '/' + path.replace(/\.html$/, `-${lang}.html`) + h;   // (the live presentation, in this language)
  // (A picture with its own version in this language — img/editor-reloj-en.webp —: that one; the editor's
  // screenshots are taken in each language with tools/shot-template.py --lang.)
  const own = /^img\/[\w-]+\.(webp|png|jpe?g)$/.test(path) && lang !== 'es' && path.replace(/\.(\w+)$/, `-${lang}.$1`);
  if (own && existsSync(join(SITE_DIR, own))) return '/' + own + h;
  if (/^[\w-]+$/.test(path)) return base + path + h;                              // another page of the site
  return '/' + path + h;                                                         // pictures, styles, scripts, fonts
}
export const pageUrl = (page, lang) => SITE + (lang === 'es' ? '/' : `/${lang}/`) + (page === 'index' ? '' : page);

// The page in `lang`: its texts translated (dict: Spanish → that language), links to the same
// language, its own address, the other languages' addresses and the language menu.
export function translatePage(html, lang, dict, page) {
  const missing = [];
  const tr = s => { const k = norm(s); if (lang === 'es') return s; if (k in dict) return dict[k]; missing.push(k); return s; };
  const { toks, out } = segments(html);
  // (Attributes outside the texts first: inside a text they're part of it.)
  const inText = new Set(); for (const { at: [a, b] } of out) for (let i = a; i <= b; i++) inText.add(i);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (inText.has(i) || !t || !t.startsWith('<') || t.startsWith('</') || t.startsWith('<!--')) continue;
    for (const a of readAttrs(t)) toks[i] = toks[i].replace(`${a.name}="${a.value}"`, `${a.name}="${tr(a.value).replace(/"/g, '&quot;')}"`);
  }
  for (const { key, at: [a, b] } of out) { toks[a] = tr(key); for (let i = a + 1; i <= b; i++) toks[i] = ''; }
  let res = toks.join('').replace(/<[a-zA-Z][^>]*>/g, tag => tag.replace(/\s(href|src|data-src|data-buy-month|data-buy-year)="([^"]*)"/g, (m, n, v) => ` ${n}="${relink(v, lang)}"`));
  // Structured data, in this language and with its addresses.
  res = res.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, a, j, c) => {
    const walk = (o, k) => { if (typeof o === 'string') return LD_KEYS.includes(k) && hasWords(o) ? tr(o) : o;
      if (Array.isArray(o)) return o.map(v => walk(v, k));
      if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([kk, v]) => [kk, walk(v, kk)]));
      return o; };
    const data = walk(JSON.parse(j));
    for (const n of data['@graph'] || []) { if (n['@type'] === 'SoftwareApplication') { n.url = pageUrl('index', lang); for (const o of n.offers || []) if (o.url) o.url = pageUrl('pricing', lang); } }
    return a + JSON.stringify(data) + c;
  });
  // The language, the address and the other languages.
  res = res.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  res = res.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${pageUrl(page, lang)}">\n  `
    + SITE_LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(page, l)}">`).join('\n  ')
    + `\n  <link rel="alternate" hreflang="x-default" href="${pageUrl(page, 'es')}">`);
  res = res.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${pageUrl(page, lang)}">`);
  res = res.replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${LOCALE[lang]}">\n  `
    + SITE_LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`).join('\n  '));
  // The language menu (in the footer), each language named in itself; and the suggestion for
  // a browser in another language (site.js), written in that language.
  const menu = `<nav class="site-langs" aria-label="${lang === 'es' ? 'Idioma' : tr('Idioma')}">`
    + SITE_LANGS.map(l => `<a href="${(l === 'es' ? '/' : `/${l}/`) + (page === 'index' ? '' : page)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''} data-suggest="${SUGGEST[l][0]}" data-go="${SUGGEST[l][1]}">${LANG_NAME[l]}</a>`).join('')
    + '</nav>';
  if (!res.includes('<!-- LANGS -->')) throw new Error(`${page}.html: no <!-- LANGS --> in the footer`);
  res = res.replace('<!-- LANGS -->', menu);
  return { html: res, missing: [...new Set(missing)] };
}

// The sitemap: every page in every language, each with its versions.
export function sitemap(pages, extra, date) {
  const alt = p => SITE_LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(p, l)}"/>`).join('')
    + `<xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(p, 'es')}"/>`;
  const rows = pages.flatMap(([p, prio]) => SITE_LANGS.map(l => `  <url><loc>${pageUrl(p, l)}</loc><lastmod>${date}</lastmod><priority>${prio}</priority>${alt(p)}</url>`));
  for (const p of extra) rows.push(`  <url><loc>${SITE}/${p}</loc><lastmod>${date}</lastmod><priority>0.2</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}
