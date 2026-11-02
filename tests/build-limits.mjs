// Cloudflare Pages takes 20,000 files at most in a deployment, and says so only when it is too late: the build that failed on
// 2026-10-31 left test.revelaslides.com and revelaslides.com without a new app for a day. The website (revelaslides) and the
// template covers (revela-img, `build-site.mjs --images`) are two deployments; each must stay under the limit, with room to spare.
//   node tests/build-limits.mjs      (needs site/, the private fmesasc/revela-site: without it, skipped)
import { mkdtempSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../tools/build-site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(ROOT, 'site', 'index.html'))) { console.log('LIMITES: sin site/ (repositorio privado fmesasc/revela-site): omitido'); process.exit(0); }
const LIMIT = 20000, WARN = 18500;     // (the platform's limit; where we say «split it» before reaching it)
const count = d => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
const tmp = mkdtempSync(join(tmpdir(), 'revela-limits-'));
let fails = 0;
try {
  for (const [name, opts] of [['la web (revelaslides)', {}], ['las portadas (revela-img)', { images: true }]]) {
    const n = count(await build(join(tmp, opts.images ? 'img' : 'site'), opts));
    const ok = n < WARN;
    console.log(`${ok ? 'ok ' : 'FALLA'} ${name}: ${n} archivos de ${LIMIT}${ok ? '' : ` (más de ${WARN}: repartirlos antes de que Cloudflare Pages se niegue a publicar; docs/ARCHITECTURE.md ▸ Web)`}`);
    if (!ok) fails++;
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
console.log(fails ? 'LIMITES FAIL' : 'LIMITES OK');
process.exit(fails ? 1 : 0);
