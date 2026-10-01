#!/usr/bin/env node
// Builds the official site (revelaslides.com, on Cloudflare Pages) from this
// same repository, without changing the app:
//
//   dist/            the site: home, plans, support (site/), privacy and terms
//   dist/app/        the app, exactly as GitHub Pages serves it, marked as the
//                    official edition (<meta name="revela-edition" content="cloud">)
//
//   node tools/build-site.mjs [out]              → the site (default: dist)
//   node tools/build-site.mjs out --app-only     → only the app, marked "desktop" (the desktop app)
//
// Nothing is compiled: files are copied. GitHub Pages keeps publishing the
// repository as it is (the open edition at fmesasc.github.io/revela).

import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The app: every file and folder it needs, and nothing else (no tests, tools, server…).
export const APP_FILES = ['index.html', 'remote.html', 'view.html', 'vote.html', 'auth.html', 'dropbox.html', 'privacy.html', 'terms.html',
  'legal.css', 'manifest.webmanifest', 'sw.js', 'icons', 'assets', 'src'];

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

export async function build(out = join(ROOT, 'dist'), { appOnly = false } = {}) {
  rmSync(out, { recursive: true, force: true });
  if (appOnly) { copyApp(out); markEdition(join(out, 'index.html'), 'desktop'); return out; }   // (the desktop app: an account on the official server)
  // The site's own pages and files.
  cpSync(join(ROOT, 'site'), out, { recursive: true });
  await inlineIcons(out);
  // The app under /app/, marked as the official edition.
  copyApp(join(out, 'app'));
  markEdition(join(out, 'app', 'index.html'), 'cloud');
  // Privacy and terms at the top too (Google's consent screen links them), with their style.
  for (const f of ['privacy.html', 'terms.html', 'legal.css']) cpSync(join(ROOT, f), join(out, f));
  // The app's icon, for the site's pages.
  mkdirSync(join(out, 'img'), { recursive: true });
  cpSync(join(ROOT, 'icons', 'icon.svg'), join(out, 'img', 'icon.svg'));
  return out;
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
  const args = process.argv.slice(2), appOnly = args.includes('--app-only'), outArg = args.find(a => !a.startsWith('--'));
  const out = await build(outArg ? resolve(outArg) : undefined, { appOnly });
  const count = d => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
  console.log(`${appOnly ? 'App' : 'Site'} built in ${out} (${count(out)} files)`);
}
