// Pictures that are private — a screenshot, a photo of a document, anything not on the web — into a presentation made
// from outside (the MCP server and the public API, publicapi.js). Slides take only https addresses ("image_url"), so
// a private picture has no address to give; and sending its bytes through the AI app would fill the conversation with
// them. So the tool hands out an UPLOAD LINK instead, and whoever has the file (Claude Code with curl, a script)
// puts it there:
//
//   upload_image { id, slide, alt? }  →  { upload_url, … }        (the tool: the user's own key or OAuth token)
//   PUT <upload_url>   (the file's bytes as the body)             → { ok, width, height }
//
// What keeps it safe:
//  - the link is signed (HMAC with the server's secret) and says who, which presentation, which slide and until
//    when (10 minutes): it opens nothing else, and the account's key never leaves the AI app;
//  - the change is made as that person, through the document's own object, so what they may edit is what they may
//    put a picture in (a read-only share is refused there);
//  - the file is judged by its bytes, never by its name or Content-Type: PNG, JPEG, WebP or GIF — not SVG (it
//    carries scripts) — up to 4 MB, and embedded in the deck (a data: address): it never gets a public address;
//  - nothing is stored here: no list of uploads, nothing to clean up.
import { editDeck } from './docs.js';
import { enc, b64url, unb64, random, hmac } from './util.js';

export const UPLOAD_MINUTES = 10, UPLOAD_MAX = 4 * 1024 * 1024;
const secretOf = env => env.MAIL_SECRET || env.API_SECRET || '';

export async function signUpload(env, { sub, email, deck, slide }) {
  const secret = secretOf(env); if (!secret) throw new Error('not configured');
  const p = b64url(enc.encode(JSON.stringify({ s: sub, e: email, d: deck, l: slide, x: Date.now() + UPLOAD_MINUTES * 60e3, n: random(6) })));
  return `up_${p}.${await hmac(secret, 'upload|' + p)}`;
}
export async function readUpload(env, token) {
  const m = /^up_([\w-]{20,600})\.([\w-]{20,80})$/.exec(String(token || '')), secret = secretOf(env);
  if (!m || !secret || (await hmac(secret, 'upload|' + m[1])) !== m[2]) return null;
  try { const t = JSON.parse(unb64(m[1])); return t.x > Date.now() && t.s && t.d && t.l ? t : null; } catch { return null; }
}

// What the bytes are: { mime, w, h } for a PNG, JPEG, WebP or GIF with a size; null for anything else.
export function sniffImage(u8) {
  const n = u8.length, be16 = i => (u8[i] << 8) | u8[i + 1], le16 = i => u8[i] | (u8[i + 1] << 8), be32 = i => ((u8[i] << 24) | (u8[i + 1] << 16) | (u8[i + 2] << 8) | u8[i + 3]) >>> 0;
  const at = (i, s) => [...s].every((c, k) => u8[i + k] === c.charCodeAt(0));
  let r = null;
  if (n > 24 && u8[0] === 0x89 && at(1, 'PNG') && at(12, 'IHDR')) r = { mime: 'image/png', w: be32(16), h: be32(20) };
  else if (n > 10 && at(0, 'GIF8')) r = { mime: 'image/gif', w: le16(6), h: le16(8) };
  else if (n > 30 && at(0, 'RIFF') && at(8, 'WEBP')) {
    if (at(12, 'VP8 ')) r = { mime: 'image/webp', w: le16(26) & 0x3fff, h: le16(28) & 0x3fff };
    else if (at(12, 'VP8L')) { const b = u8[21] | (u8[22] << 8) | (u8[23] << 16) | (u8[24] << 24); r = { mime: 'image/webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
    else if (at(12, 'VP8X')) r = { mime: 'image/webp', w: (u8[24] | (u8[25] << 8) | (u8[26] << 16)) + 1, h: (u8[27] | (u8[28] << 8) | (u8[29] << 16)) + 1 };
  } else if (n > 4 && u8[0] === 0xff && u8[1] === 0xd8) {
    for (let i = 2; i + 9 < n;) {
      if (u8[i] !== 0xff) { i++; continue; }
      const k = u8[i + 1];
      if (k === 0xff) { i++; continue; }
      if (k >= 0xc0 && k <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(k)) { r = { mime: 'image/jpeg', w: be16(i + 7), h: be16(i + 5) }; break; }
      i += 2 + (k === 0xd8 || (k >= 0xd0 && k <= 0xd7) || k === 0x01 ? -2 : be16(i + 2));
    }
  }
  return r && r.w > 0 && r.h > 0 && r.w <= 20000 && r.h <= 20000 ? r : null;
}
const base64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };

// PUT /api/v1/upload/<token>: the bytes in the body.
export async function handleUpload(req, env, token, json) {
  if (req.method !== 'PUT' && req.method !== 'POST') return json({ error: 'PUT the file\'s bytes here' }, 405, { Allow: 'PUT, POST' });
  const t = await readUpload(env, token);
  if (!t) return json({ error: 'this upload link is not valid or has expired: ask for a new one' }, 401);
  const len = +req.headers.get('Content-Length') || 0;
  if (len > UPLOAD_MAX) return json({ error: 'too big', max: UPLOAD_MAX }, 413);
  const u8 = new Uint8Array(await req.arrayBuffer());
  if (!u8.length) return json({ error: 'no file: send its bytes as the body (curl -T file)' }, 400);
  if (u8.length > UPLOAD_MAX) return json({ error: 'too big', max: UPLOAD_MAX }, 413);
  const img = sniffImage(u8);
  if (!img) return json({ error: 'not a PNG, JPEG, WebP or GIF picture' }, 415);
  const alt = String(new URL(req.url).searchParams.get('alt') || t.a || '').slice(0, 300);
  const r = await editDeck(env, { sub: t.s, email: t.e }, t.d, 'addImage', { slide: t.l, src: `data:${img.mime};base64,${base64(u8)}`, w: img.w, h: img.h, alt });
  if (r.status !== 200) return json({ error: r.data?.error || 'could not add it' }, r.status);
  return json({ ok: true, width: img.w, height: img.h, bytes: u8.length });
}
