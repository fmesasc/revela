// The door of revela-blender: only requests signed by Revela's main server get through.
// Kept apart from worker.js (which needs Cloudflare's runtime) so tests/server-blender.mjs can run it in Node.
//
// Signature (X-Revela-Signature: t=<unix seconds>,v1=<hex>): HMAC-SHA256 of "<t>.<body>" with
// BLENDER_SECRET, at most 5 minutes old — the same shape as Stripe's. This Worker charges nothing
// and keeps nothing: it checks, then hands the body to a container (runner.py).

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const hmac = async (secret, text) => hex(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(text)));
const same = (a, b) => a.length === b.length && [...a].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

export async function signBody(body, secret, now = Date.now()) {
  const t = Math.floor(now / 1000); return `t=${t},v1=${await hmac(secret, `${t}.${body}`)}`;
}
export async function verifyBody(body, header, secret, now = Date.now()) {
  const p = Object.fromEntries(String(header || '').split(',').map(x => x.split('=')).filter(x => x.length === 2));
  const t = +p.t; if (!secret || !t || !p.v1 || Math.abs(now / 1000 - t) > 300) return false;
  return same(p.v1, await hmac(secret, `${t}.${body}`));
}

// POST /run (signed) → the runner's answer. run(body) sends it to a container.
export async function gate(req, env, run) {
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const url = new URL(req.url);
  if (req.method !== 'POST' || url.pathname !== '/run') return json({ error: 'not found' }, 404);
  if (!env.BLENDER_SECRET) return json({ error: 'not configured' }, 503);
  if (+(req.headers.get('Content-Length') || 0) > 200_000) return json({ error: 'too large' }, 413);
  const body = await req.text();
  if (body.length > 200_000) return json({ error: 'too large' }, 413);
  if (!(await verifyBody(body, req.headers.get('X-Revela-Signature'), env.BLENDER_SECRET))) return json({ error: 'signature' }, 401);
  let a; try { a = JSON.parse(body); } catch { return json({ error: 'bad request' }, 400); }
  if (!a || typeof a.script !== 'string' || !a.script.trim()) return json({ error: 'bad request' }, 400);
  const timeoutSec = Math.max(10, Math.min(+env.MAX_SECONDS || 90, Math.round(+a.timeoutSec || 90)));
  return run(JSON.stringify({ script: a.script, timeoutSec }));
}
