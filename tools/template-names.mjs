// Adds translations of example presentations' names and summaries to
// src/features/content/templates/names/<lang>.js (one file per language, loaded
// by the gallery only when it opens in that language: a thousand presentations
// don't weigh on the editor's start-up). Reads rows from standard input:
//   es | en | fr | de | it | pt | ca | gl | nl | eu | ar
// each one the name or the summary of a presentation, in Spanish first.
//   node tools/template-names.mjs < rows.txt
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const LANGS = ['en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/features/content/templates');
execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'build-catalog.mjs')], { stdio: 'ignore' });
const { CATALOG } = await import(pathToFileURL(join(dir, 'catalog.js')).href + '?' + Date.now());
const files = {};
for (const l of LANGS) {
  const f = join(dir, 'names', l + '.js');
  files[l] = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8').replace(/^[^{]*/, '').replace(/;\s*$/, '')) : {};
}
const norm = s => String(s).replace(/&amp;/g, '&').trim();
let added = 0; const unknown = [];
for (const line of readFileSync(0, 'utf8').split('\n')) {
  const cols = line.split(' | ').map(norm); if (cols.length !== 11) continue;
  const hits = Object.entries(CATALOG).filter(([, v]) => norm(v.name) === cols[0] || norm(v.summary) === cols[0]);
  if (!hits.length) { unknown.push(cols[0]); continue; }
  for (const [key, v] of hits) {
    const i = norm(v.name) === cols[0] ? 0 : 1;
    LANGS.forEach((l, k) => { (files[l][key] ||= [null, null])[i] = cols[k + 1]; });
    added++;
  }
}
for (const l of LANGS) {
  const sorted = Object.fromEntries(Object.keys(files[l]).sort().map(k => [k, files[l][k]]));
  writeFileSync(join(dir, 'names', l + '.js'), `// Made by tools/template-names.mjs: key → [name, summary] in this language.\nexport default ${JSON.stringify(sorted, null, 0).replace(/\],"/g, '],\n"')};\n`);
}
const missing = Object.keys(CATALOG).filter(k => !files.en[k]?.[0] || !files.en[k]?.[1]);
console.log(`${added} textos añadidos; sin traducir: ${missing.length}${missing.length ? ' (' + missing.slice(0, 12).join(', ') + (missing.length > 12 ? '…' : '') + ')' : ''}`);
if (unknown.length) console.log('No coinciden con ninguna presentación:\n  ' + unknown.join('\n  '));
