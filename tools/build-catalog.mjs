// Writes src/features/content/templates/catalog.js: the name, summary and group
// of every example presentation in templates/*.js, and how to load each file —
// so the editor lists a thousand of them without loading them (a file is
// loaded when one of its presentations is shown or opened).
//   node tools/build-catalog.mjs
import { readdirSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/features/content/templates');
const files = readdirSync(dir).filter(f => f.endsWith('.js') && !['kit.js', 'catalog.js'].includes(f)).sort();
const catalog = {}, seen = new Map(), broken = [];
for (const f of files) {
  // (A file with an error is left out and named, so the others can still be checked.)
  let defs; try { defs = (await import(pathToFileURL(join(dir, f)).href)).default || {}; } catch (e) { broken.push(f.replace(/\.js$/, '')); console.error(`AVISO: ${f} no se carga: ${e.message}`); continue; }
  for (const [key, d] of Object.entries(defs)) {
    if (seen.has(key)) throw new Error(`clave repetida: ${key} (${seen.get(key)} y ${f})`);
    seen.set(key, f);
    catalog[key] = { name: d.name, summary: d.summary, cat: d.cat, file: f.replace(/\.js$/, '') };
  }
}
const loaders = files.map(f => `  ${JSON.stringify(f.replace(/\.js$/, ''))}: () => import('./${f}'),`).join('\n');
const tmp = join(dir, `.catalog-${process.pid}.tmp`);
writeFileSync(tmp, `// Made by tools/build-catalog.mjs — do not edit by hand.
// The example presentations of templates/*.js: key → { name, summary, cat, file }, and each file's loader.
export const CATALOG = ${JSON.stringify(catalog, null, 0).replace(/\},"/g, '},\n  "')};
export const BROKEN = ${JSON.stringify(broken)};
export const LOADERS = {
${loaders}
};
`);
renameSync(tmp, join(dir, 'catalog.js'));                 // (at once: others may be reading it)
console.log(`${Object.keys(catalog).length} presentaciones en ${files.length} archivos → catalog.js`);
