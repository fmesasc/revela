#!/usr/bin/env node
// How Revela runs on a slow computer (a school's old laptop or a basic Chromebook): Chrome with its processor
// slowed down (CDP's CPU throttling) and a slow network, measuring what a teacher waits for — the editor opening,
// an example presentation opening, moving between slides, starting to present.
//   node tools/perf.mjs [--rates 1,4,6] [--example launch] [--json out.json]
// Prints one line per rate. (Needs Chrome; run it alone: it is heavy.)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const RATES = arg('--rates', '1,4,6').split(',').map(Number), EXAMPLE = arg('--example', 'launch');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const srv = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  try { const b = await readFile(f); res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = srv.address().port, sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(rate) {
  const chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', '--window-size=1366,768', '--user-data-dir=' + mkdtempSync('/tmp/perf-'), 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise(r => chrome.stderr.on('data', d => { const m = String(d).match(/ws:\/\/[^\s]+/); if (m) r(m[0]); }));
  const ws = new WebSocket(wsUrl); await new Promise(r => { ws.onopen = r; });
  let id = 0; const pend = new Map(), events = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method) events.push(m); };
  const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId && { sessionId }) })); });
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId: sid } } = await send('Target.attachToTarget', { targetId, flatten: true });
  const ev = async js => (await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }, sid)).result?.result?.value;
  await send('Page.enable', {}, sid); await send('Network.enable', {}, sid);
  await send('Emulation.setCPUThrottlingRate', { rate }, sid);
  // (A school's connection, more or less: 10 Mbit/s, 40 ms.)
  if (rate > 1) await send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 }, sid);
  const out = { rate };
  let t = Date.now(); await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html?test` }, sid);
  for (let i = 0; i < 600 && !(await ev('!!(window.__revela && document.querySelector("#stage-grid .stage"))')); i++) await sleep(100);
  out.editor = Date.now() - t;
  t = Date.now();
  out.slides = await ev(`window.__revela.examples.loadExample(${JSON.stringify(EXAMPLE)}, 'es').then(d => { window.__revela.store.replaceDeck(d); return d.slides.length; })`);
  await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'); out.example = Date.now() - t;
  // Moving between slides: the editor drawing each one.
  t = Date.now(); const n = Math.min(10, out.slides);
  for (let i = 0; i < n; i++) await ev(`(async () => { window.__revela.store.commit(() => { window.__revela.state.ui.slideIndex = ${i}; }, { history: false }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return 1; })()`);
  out.perSlide = Math.round((Date.now() - t) / n);
  // Starting to present: the presentation built and shown.
  t = Date.now(); out.html = await ev('(() => window.__revela.io.buildHTML().length)()'); out.build = Date.now() - t;
  ws.close(); chrome.kill(); return out;
}

const results = [];
for (const r of RATES) { const o = await run(r); results.push(o); console.log(`CPU ×${o.rate}: editor ${o.editor} ms · abrir «${EXAMPLE}» (${o.slides} diapositivas) ${o.example} ms · cambiar de diapositiva ${o.perSlide} ms · preparar la presentación ${o.build} ms (${Math.round(o.html / 1024)} KB)`); }
if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify(results, null, 1));
srv.close();
