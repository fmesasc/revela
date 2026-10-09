#!/usr/bin/env node
// The example presentations' texts, for translating them (src/features/content/tplang.js):
//   node tools/template-texts.mjs                → how many texts each file has, and how many each language lacks
//   node tools/template-texts.mjs --out DIR      → DIR/<file>.json: the texts of each file (a list, in order)
//   node tools/template-texts.mjs --out DIR --missing LANG  → only the ones LANG lacks
//   node tools/template-texts.mjs --check        → exits with 1 if a language lacks a text (tests/run.sh)
// The translations are templates/i18n/<lang>/<file>.js: `export default { "Spanish": "translation", … }`.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const { EXAMPLES, loadExample, exampleFile } = await import(pathToFileURL(join(ROOT, 'src/features/content/examples.js')).href);
const { textsOf, TEMPLATE_LANGS } = await import(pathToFileURL(join(ROOT, 'src/features/content/tplang.js')).href);

const byFile = {};
// (Not the ones with their own table of languages — multilang.js: they bring their translations with them.)
const { EXAMPLES_ML } = await import(pathToFileURL(join(ROOT, 'src/features/content/multilang.js')).href);
for (const key of Object.keys(EXAMPLES).filter(k => !EXAMPLES_ML[k])) {
  const d = await loadExample(key, 'es'); if (!d) continue;
  const set = (byFile[exampleFile(key)] ||= new Set());
  for (const s of textsOf(d)) set.add(s);
}
const dictOf = async (lang, file) => {
  // (The examples for companies: one table of their own, every language in it — src/features/content/examples-texts.js.)
  if (file === 'examples-texts') return (await import(pathToFileURL(join(ROOT, 'src/features/content/examples-texts.js')).href)).default[lang] || {};
  const p = join(ROOT, 'src/features/content/templates/i18n', lang, file + '.js');
  return existsSync(p) ? (await import(pathToFileURL(p).href)).default : {};
};
const args = process.argv.slice(2), arg = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const out = arg('--out'), missingLang = arg('--missing');
if (out) {
  mkdirSync(out, { recursive: true });
  for (const [file, set] of Object.entries(byFile)) {
    let list = [...set];
    if (missingLang) { const d = await dictOf(missingLang, file); list = list.filter(s => !Object.hasOwn(d, s)); }
    if (list.length) writeFileSync(join(out, file + '.json'), JSON.stringify(list, null, 1));
  }
  process.exit(0);
}
let lacking = 0;
const rows = [];
for (const [file, set] of Object.entries(byFile)) {
  const row = [file, set.size];
  for (const l of TEMPLATE_LANGS) { const d = await dictOf(l, file); const n = [...set].filter(s => !Object.hasOwn(d, s)).length; row.push(n); lacking += n; }
  rows.push(row);
}
if (args.includes('--check')) {
  if (lacking) { console.log(`PLANTILLAS: faltan ${lacking} textos por traducir (node tools/template-texts.mjs)`); process.exit(1); }
  console.log(`PLANTILLAS OK (${TEMPLATE_LANGS.length} idiomas)`); process.exit(0);
}
console.log(['archivo', 'textos', ...TEMPLATE_LANGS.map(l => 'faltan ' + l)].join('\t'));
for (const r of rows) console.log(r.join('\t'));
