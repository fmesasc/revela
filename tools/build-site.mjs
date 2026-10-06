#!/usr/bin/env node
// Builds the official site (revelaslides.com, on Cloudflare Pages) from this
// same repository, without changing the app:
//
//   dist/            the site: home, plans, support (site/: the private fmesasc/revela-site), privacy and terms
//   dist/en/, fr/…   the site in each other language (tools/site-i18n.mjs, site/i18n/)
//   dist/app/        the app, exactly as GitHub Pages serves it, marked as the
//                    official edition (<meta name="revela-edition" content="cloud">)
//
//   node tools/build-site.mjs [out]              → the site (default: dist)
//   node tools/build-site.mjs out --app-only     → only the app, marked "desktop" (the desktop app)
//   node tools/build-site.mjs out --open         → only the app, unmarked: the open edition (GitHub Pages)
//   node tools/build-site.mjs --missing          → the website's texts still untranslated, by language
//
// Nothing is compiled: files are copied. GitHub Pages publishes the open edition (fmesasc.github.io/revela) with
// --open, after the tests (.github/workflows/pages.yml).

import { cpSync, rmSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SITE_LANGS, pageTexts, translatePage, sitemap } from './site-i18n.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Pruebas (test.revelaslides.com) or production: only the variable REVELA_STAGE=test makes the test site (set in
// Cloudflare Pages for Preview builds only — never inferred: a mistake would hide revelaslides.com from search
// engines). The test site isn't for search engines (robots.txt, noindex, no sitemap), says what it is on every page,
// and its app knows (meta revela-stage). Which branch of the website is used: see ensureSite.
export const STAGE = process.env.REVELA_STAGE === 'test' ? 'test' : '';
// The app: every file and folder it needs, and nothing else (no tests, tools, server…).
export const APP_FILES = ['index.html', 'remote.html', 'view.html', 'vote.html', 'auth.html', 'dropbox.html', 'privacy.html', 'terms.html', 'legal.html', 'dpa.html',
  'legal.css', 'legal.js', 'manifest.webmanifest', 'remote.webmanifest', 'sw.js', 'icons', 'assets', 'src'];

function markEdition(index, edition) {
  const html = readFileSync(index, 'utf8');
  if (!html.includes('<head>')) throw new Error('index.html without <head>');
  writeFileSync(index, html.replace('<head>', `<head>\n  <meta name="revela-edition" content="${edition}">`));
}
function copyApp(to) {
  mkdirSync(to, { recursive: true });
  for (const f of APP_FILES) {
    if (!existsSync(join(ROOT, f))) throw new Error(`Missing app file: ${f}`);
    cpSync(join(ROOT, f), join(to, f), { recursive: true });
  }
}

export async function build(out = join(ROOT, 'dist'), { appOnly = false, open = false } = {}) {
  rmSync(out, { recursive: true, force: true });
  if (open) { copyApp(out); return out; }    // (GitHub Pages: the app and its legal pages, not the site nor the repository's other files)
  if (appOnly) { copyApp(out); markEdition(join(out, 'index.html'), 'desktop'); return out; }   // (the desktop app: an account on the official server)
  // The site's own pages and files.
  ensureSite();
  // (Not its translations, nor its repository's own files: .git, .github, README, its tools.)
  const own = new Set(['.git', '.github', 'README.md', '.gitignore', 'tools'].map(f => join(ROOT, 'site', f)));
  cpSync(join(ROOT, 'site'), out, { recursive: true, filter: f => !f.includes(join('site', 'i18n')) && ![...own].some(o => f === o || f.startsWith(o + '/')) });
  localize(out);
  await inlineIcons(out);
  for (const l of SITE_LANGS.slice(1)) await inlineIcons(join(out, l));
  // The app under /app/, marked as the official edition.
  copyApp(join(out, 'app'));
  markEdition(join(out, 'app', 'index.html'), 'cloud');
  // Privacy and terms at the top too (Google's consent screen links them), with their style.
  for (const f of ['privacy.html', 'terms.html', 'legal.html', 'dpa.html', 'legal.css', 'legal.js']) cpSync(join(ROOT, f), join(out, f));
  // The app's icon, for the site's pages (and for the legal pages at the top); the type.
  mkdirSync(join(out, 'img'), { recursive: true });
  cpSync(join(ROOT, 'icons', 'icon.svg'), join(out, 'img', 'icon.svg'));
  mkdirSync(join(out, 'icons'), { recursive: true });
  cpSync(join(ROOT, 'icons', 'icon.svg'), join(out, 'icons', 'icon.svg'));
  cpSync(join(ROOT, 'assets', 'fonts'), join(out, 'assets', 'fonts'), { recursive: true });
  if (STAGE) markStage(out);                              // (last: every page is marked)
  return out;
}

// The test site: no indexing, a strip on every page saying so, and the app told (src/ui/shell/stage.js).
function markStage(out) {
  writeFileSync(join(out, 'robots.txt'), '# test.revelaslides.com: the test site, not for search engines (revelaslides.com is the real one)\nUser-agent: *\nDisallow: /\n');
  rmSync(join(out, 'sitemap.xml'), { force: true });
  const headers = join(out, '_headers');
  writeFileSync(headers, (existsSync(headers) ? readFileSync(headers, 'utf8') + '\n' : '') + '/*\n  X-Robots-Tag: noindex, nofollow\n');
  const strip = '<div style="position:sticky;top:0;z-index:99999;background:#b7791f;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center;padding:4px 8px">Entorno de pruebas · Test site — <a href="https://revelaslides.com" style="color:#fff">revelaslides.com</a></div>';
  const walk = dir => { for (const e of readdirSync(dir, { withFileTypes: true })) { const f = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'app') walk(f); continue; }
    if (!e.name.endsWith('.html')) continue;
    const html = readFileSync(f, 'utf8').replace('<head>', '<head>\n  <meta name="robots" content="noindex, nofollow">').replace(/<body([^>]*)>/, `<body$1>${strip}`);
    writeFileSync(f, html); } };
  walk(out);
  const app = join(out, 'app', 'index.html');
  writeFileSync(app, readFileSync(app, 'utf8').replace('<head>', `<head>\n  <meta name="revela-stage" content="${STAGE}">\n  <meta name="robots" content="noindex, nofollow">`));
}

// The website's own pages (site/) are not in this repository: they are the private
// fmesasc/revela-site (marketing, prices, SEO). Locally, a clone of it in site/ (ignored here):
//   git clone https://github.com/fmesasc/revela-site.git site
// On Cloudflare Pages, fetched at build time with that repository's read-only deploy key
// (the project's secret SITE_DEPLOY_KEY_B64). The app, GitHub Pages and the desktop app don't need it.
function ensureSite() {
  if (existsSync(join(ROOT, 'site', 'index.html'))) return;
  const k = process.env.SITE_DEPLOY_KEY_B64;
  if (!k) throw new Error('The website (site/) is the private repository fmesasc/revela-site: git clone https://github.com/fmesasc/revela-site.git site');
  const dir = mkdtempSync(join(tmpdir(), 'revela-site-')), key = join(dir, 'key');
  try {
    writeFileSync(key, Buffer.from(k, 'base64'), { mode: 0o600 });
    rmSync(join(ROOT, 'site'), { recursive: true, force: true });
    // (Without the machine's git settings: Cloudflare's rewrite GitHub addresses to its own https access, which only reaches this repository.)
    // (A build of the branch production takes the website's production; any other, its main — what's being tried.)
    execFileSync('git', ['clone', '--depth', '1', '--branch', process.env.CF_PAGES_BRANCH === 'production' ? 'production' : 'main', 'ssh://git@github.com/fmesasc/revela-site.git', join(ROOT, 'site')], { stdio: 'inherit',
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0',
        GIT_SSH_COMMAND: `ssh -i ${key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new` } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// The website's pages in each language (the Spanish ones at the top, the others in /en/…),
// and the sitemap with all of them. A text missing from a language stops the build.
export const PAGES = [['index', '1.0'], ['pricing', '0.8'], ['support', '0.6'], ['schools', '0.7'], ['ambassadors', '0.6'], ['guides', '0.7'], ['contact', '0.5']];
const dictOf = l => JSON.parse(readFileSync(join(ROOT, 'site', 'i18n', l + '.json'), 'utf8'));
export function missingTexts() {
  ensureSite();
  const all = PAGES.flatMap(([p]) => pageTexts(readFileSync(join(ROOT, 'site', p + '.html'), 'utf8')));
  return Object.fromEntries(SITE_LANGS.slice(1).map(l => { let d = {}; try { d = dictOf(l); } catch {} return [l, [...new Set(all)].filter(k => !(k in d))]; }));
}
function localize(out) {
  const missing = [];
  for (const l of SITE_LANGS) {
    const dict = l === 'es' ? {} : dictOf(l), dir = l === 'es' ? out : join(out, l);
    mkdirSync(dir, { recursive: true });
    for (const [p] of PAGES) {
      const r = translatePage(readFileSync(join(ROOT, 'site', p + '.html'), 'utf8'), l, dict, p);
      writeFileSync(join(dir, p + '.html'), withFaq(r.html));
      for (const k of r.missing) missing.push(`${l}/${p}: ${k}`);
    }
  }
  if (missing.length) throw new Error(`Untranslated texts on the website (site/i18n/):\n${missing.slice(0, 20).join('\n')}${missing.length > 20 ? `\n… and ${missing.length - 20} more` : ''}`);
  writeFileSync(join(out, 'sitemap.xml'), sitemap(PAGES, ['legal', 'privacy', 'terms', 'dpa'], new Date().toISOString().slice(0, 10)));
}

// A page's frequently asked questions (<details><summary>), also as FAQPage structured data, in
// the page's own language (taken from it once translated: nothing more to translate).
const plain = h => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export function withFaq(html) {
  const qa = [...html.matchAll(/<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map(m => [plain(m[1]), plain(m[2])]).filter(([q, a]) => q && a);
  if (!qa.length) return html;
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
}

// The pages' icons, <i data-icon="name" class="…"></i>: drawn in place with the app's own (render/svg.js).
async function inlineIcons(dir) {
  const { iconSVG } = await import(pathToFileURL(join(ROOT, 'src/render/svg.js')).href);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const html = readFileSync(join(dir, f), 'utf8');
    writeFileSync(join(dir, f), html.replace(/<i data-icon="([\w-]+)"(?: class="([\w -]+)")?><\/i>/g, (m, name, cls) => {
      const inner = iconSVG({ icon: name }).replace(/^<svg[^>]*>|<\/svg>$/g, '');
      if (!inner) throw new Error(`${f}: no icon "${name}"`);
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${inner}</svg>`;
    }));
  }
}

// Run from the command line.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--missing')) {
    const m = missingTexts(); for (const [l, ks] of Object.entries(m)) console.log(`${l}: ${ks.length} sin traducir${ks.length ? '\n  ' + ks.join('\n  ') : ''}`);
    process.exit(0);
  }
  const args = process.argv.slice(2), appOnly = args.includes('--app-only'), open = args.includes('--open'), outArg = args.find(a => !a.startsWith('--'));
  const out = await build(outArg ? resolve(outArg) : undefined, { appOnly, open });
  const count = d => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
  console.log(`${appOnly || open ? 'App' : 'Site'} built in ${out} (${count(out)} files)`);
}
