// Revela share server (Cloudflare Worker + R2): stores sealed presentations.
//
// It only ever receives encrypted data: presentations are sealed in the
// browser and the key stays in the link after "#", which never reaches this
// server. So it holds noise it cannot read. Identifiers are 128-bit random
// values, nothing is listed, and every response says noindex.
//
//   POST   /s         body: sealed JSON  → { id, token }   (X-Upload-Key if UPLOAD_KEY is set)
//   GET    /s/:id     → the sealed JSON (404 when missing or expired)
//   DELETE /s/:id     Authorization: Bearer <token>  → stop sharing
//
// Bindings (wrangler.toml): SHARES (R2 bucket). Optional vars: UPLOAD_KEY
// (only who knows it can upload), MAX_MB (default 30), ALLOW_ORIGIN (default *).

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Key',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    };
    const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: cors });

    if (req.method === 'POST' && url.pathname === '/s') {
      if (env.UPLOAD_KEY && req.headers.get('X-Upload-Key') !== env.UPLOAD_KEY) return json({ error: 'forbidden' }, 403);
      const max = (+env.MAX_MB || 30) * 1024 * 1024;
      if (+(req.headers.get('Content-Length') || 0) > max) return json({ error: 'too large' }, 413);
      const body = await req.text();
      if (body.length > max) return json({ error: 'too large' }, 413);
      let env0; try { env0 = JSON.parse(body); } catch { return json({ error: 'not json' }, 400); }
      if (!env0 || env0.revelaSealed !== 1 || typeof env0.data !== 'string') return json({ error: 'not a sealed presentation' }, 400);
      const days = Math.min(3650, Math.max(0, +url.searchParams.get('days') || 0));
      const id = random(16), token = random(24);
      await env.SHARES.put(id, body, { httpMetadata: { contentType: 'application/json' },
        customMetadata: { token: await sha256(token), ...(days && { expires: String(Date.now() + days * 864e5) }) } });
      return json({ id, token });
    }

    const m = url.pathname.match(/^\/s\/([\w-]{16,40})$/);
    if (m && req.method === 'GET') {
      const obj = await env.SHARES.get(m[1]);
      if (!obj) return json({ error: 'not found' }, 404);
      if (obj.customMetadata?.expires && Date.now() > +obj.customMetadata.expires) { await env.SHARES.delete(m[1]); return json({ error: 'not found' }, 404); }
      return new Response(obj.body, { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=60' } });
    }
    if (m && req.method === 'DELETE') {
      const obj = await env.SHARES.head(m[1]);
      if (!obj) return json({ ok: true });
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
      if (!token || (await sha256(token)) !== obj.customMetadata?.token) return json({ error: 'forbidden' }, 403);
      await env.SHARES.delete(m[1]);
      return json({ ok: true });
    }
    return new Response('Revela share server', { headers: { ...cors, 'Content-Type': 'text/plain' } });
  },
};
