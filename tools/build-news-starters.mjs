// Builds server/cloudflare/news-starters.js from server/cloudflare/news-src/*.json: one file per ready-made newsletter
// (admin ▸ Novedades ▸ «Empezar desde…»), in file-name order. Each is { key, name, texts: { <lang>: { subject, preheader,
// eyebrow, title, intro, blocks: [{ title, text, image, cta, url }], outro } } } — checked here with the same rules the server
// uses for a draft, in all 11 languages, so a mistake stops the build rather than a send.
//   node tools/build-news-starters.mjs          → writes news-starters.js
//   node tools/build-news-starters.mjs --check  → fails if the file is not what the sources give (the tests do it)
// How to add one: docs/NEWSLETTER.md.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../server/cloudflare'), src = join(dir, 'news-src'), out = join(dir, 'news-starters.js');
const { cleanIssue, NEWS_LANGS } = await import(pathToFileURL(join(dir, 'news.js')).href);
const all = {};
for (const f of readdirSync(src).filter(f => f.endsWith('.json')).sort()) {
  const s = JSON.parse(readFileSync(join(src, f), 'utf8'));
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(s.key || '') || !s.name || all[s.key]) throw new Error(`${f}: key o name no válidos (o repetidos)`);
  for (const l of NEWS_LANGS) if (!s.texts?.[l]) throw new Error(`${f}: falta el idioma ${l}`);
  const r = cleanIssue({ name: s.name, audience: { langs: [], plan: 'all' }, texts: s.texts });
  if (r.error) throw new Error(`${f}: ${r.error}${r.lang ? ' (' + r.lang + ')' : ''}`);
  // (cleanIssue drops what is empty or too long: what we keep is exactly what a draft would keep.)
  all[s.key] = { name: s.name, texts: r.texts };
}
const js = `// Starting points for a newsletter (admin ▸ Novedades ▸ «Empezar desde…»): written in all 11 languages — the admin picks one and
// changes it. Words between {braces} are for the admin to fill in (a draft that still has them is not sent: news.js);
// *words* between asterisks are the title's italics. MADE by tools/build-news-starters.mjs from news-src/*.json: change those, not this.
// { key: { name (what the admin sees), texts: { <lang>: { subject, preheader, eyebrow, title, intro, blocks: [{ title, text, image, cta, url }], outro } } } }
export const STARTERS = ${JSON.stringify(all, null, 1)};
`;
if (process.argv.includes('--check')) { if (readFileSync(out, 'utf8') !== js) { console.error('news-starters.js no coincide con news-src/: node tools/build-news-starters.mjs'); process.exit(1); } console.log('news-starters.js al día'); }
else { writeFileSync(out, js); console.log(`${Object.keys(all).length} boletines de partida → news-starters.js`); }
