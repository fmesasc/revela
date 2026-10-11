// The build stamp that lets an open tab know a newer app was published (tools/build-site.mjs buildId/stampBuild,
// src/ui/shell/update.js): the web builds carry it, in index.html and in version.json, the same in both; the desktop
// build doesn't (it has its own updater); and the fingerprint follows the files' contents and nothing else.
//   node tests/build-stamp.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, buildId } from '../tools/build-site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const check = (ok, name) => { n++; if (!ok) { fails++; console.log('✗ ' + name); } };

const tmp = mkdtempSync(join(tmpdir(), 'revela-stamp-'));
try {
  // The fingerprint: the same files, the same id; a change in any file or name, another; version.json itself doesn't count.
  const d = join(tmp, 'tree'); mkdirSync(join(d, 'src'), { recursive: true });
  writeFileSync(join(d, 'index.html'), '<head></head>'); writeFileSync(join(d, 'src', 'a.js'), 'export const a = 1;');
  const a = buildId(d);
  check(/^[0-9a-f]{16}$/.test(a), 'buildId: 16 hex characters');
  check(buildId(d) === a, 'buildId: the same files, the same id');
  writeFileSync(join(d, 'version.json'), '{"build":"x"}'); check(buildId(d) === a, 'buildId: version.json is left out');
  writeFileSync(join(d, 'src', 'a.js'), 'export const a = 2;'); const b = buildId(d); check(b !== a, 'buildId: a changed file, another id');
  writeFileSync(join(d, 'src', 'b.js'), ''); check(buildId(d) !== b, 'buildId: a new (even empty) file, another id');

  // The open edition (GitHub Pages): stamped, the same id in the page and in version.json, with the version number.
  const open = await build(join(tmp, 'open'), { open: true });
  const html = readFileSync(join(open, 'index.html'), 'utf8'), meta = html.match(/<meta name="revela-build" content="([0-9a-f]+)">/)?.[1];
  const v = existsSync(join(open, 'version.json')) ? JSON.parse(readFileSync(join(open, 'version.json'), 'utf8')) : {};
  check(!!meta && meta.length === 16, 'open edition: index.html carries its build');
  check(v.build === meta, `open edition: version.json says the same build (${v.build} / ${meta})`);
  check(v.version === JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version, 'version.json: with the version number');
  check(!/revela-build/.test(readFileSync(join(open, 'view.html'), 'utf8')), 'the viewer page has no stamp (no bar there)');

  // The desktop app (Tauri, Flatpak, .deb): no stamp, no version.json — its own updater says when there is a new one.
  const desk = await build(join(tmp, 'desk'), { appOnly: true });
  const dh = readFileSync(join(desk, 'index.html'), 'utf8');
  check(/revela-edition" content="desktop"/.test(dh), 'desktop: marked desktop');
  check(!/revela-build/.test(dh) && !existsSync(join(desk, 'version.json')), 'desktop: no build stamp');

  // The service worker leaves version.json to the network (an answer offline would be an old one; each ?t= a new copy).
  check(/version\.json'\)\) return;/.test(readFileSync(join(ROOT, 'sw.js'), 'utf8')), 'sw.js: version.json never cached');
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `build-stamp: ${fails} of ${n} failed` : `build-stamp: ${n}/${n} OK`);
process.exit(fails ? 1 : 0);
