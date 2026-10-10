// Tests of the accounts API (server/cloudflare/api.js): sessions, credits, AI,
// payments and the desktop sign-in — above all, that nothing can be skipped
// from outside. In-memory Durable Objects; the AI provider, Google and Stripe
// are simulated. Run by tests/run.sh when Node.js is available.
import worker, { edgeKept, Account, Budget, DesktopLink, ShareBox, Limits, CloudDoc, Team, CallRoom, Schedule, ModelJob, Directory, Tickets, Audit, Finance, Crm, Community, Broadcast } from '../server/cloudflare/worker.js';
import { summarize, bump, toCsv, cleanEntry, featureOf } from '../server/cloudflare/finance.js';
import { verifyAccess, resetAccessCerts, resetPromoCache, ticketsDue } from '../server/cloudflare/admin.js';
import { ticketToken, render } from '../server/cloudflare/mail.js';
import { verifyBody } from '../server/blender/gate.js';
import { shortCode, settings, deviceOf } from '../server/cloudflare/api.js';
import { verifyStripe, stripeConf, billingMode } from '../server/cloudflare/billing.js';
import { sha256 } from '../server/cloudflare/util.js';

function fakeStorage() {
  const m = new Map(); let alarm = null;
  return { m, async get(k) { if (Array.isArray(k)) return new Map(k.filter(x => m.has(x)).map(x => [x, structuredClone(m.get(x))])); return structuredClone(m.get(k)); },
    async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k) { for (const x of [].concat(k)) m.delete(x); }, async deleteAll() { m.clear(); }, async setAlarm(t) { alarm = t; }, async getAlarm() { return alarm; }, async deleteAlarm() { alarm = null; },
    // (As Durable Objects' list(): keys in order, or reversed; end and startAfter exclusive.)
    async list({ prefix = '', start, startAfter, end, reverse, limit } = {}) {
      let keys = [...m.keys()].filter(k => k.startsWith(prefix) && (start == null || k >= start) && (startAfter == null || k > startAfter) && (end == null || k < end)).sort();
      if (reverse) keys.reverse(); if (limit) keys = keys.slice(0, limit);
      return new Map(keys.map(k => [k, structuredClone(m.get(k))]));
    } };
}
const namespace = (Cls, env) => { const inst = new Map();
  return { inst, idFromName: n => n, get: id => { if (!inst.has(id)) inst.set(id, new Cls({ storage: fakeStorage() }, env)); const o = inst.get(id);
    return { fetch: (u, init) => o.fetch(u instanceof Request ? u : new Request(u, init)) }; } }; };

const SITE = 'https://revelaslides.com', CID = 'cid.apps.googleusercontent.com';
let blenderCalls = [], blenderReply = () => Response.json({ ok: false }), resendCalls = [], rtCalls = [], stockCalls = [], aiCalls = [], aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'hola' } }], usage: { cost: 0.01, prompt_tokens: 100, completion_tokens: 50 } } }), stripeCalls = [];
const env = { GOOGLE_CLIENT_ID: CID, OPENROUTER_KEY: 'sk-or-secreta', TRIAL_CREDITS: '50', CREDIT_USD: '0.002', AI_PER_MINUTE: '100', MONTHLY_BUDGET_USD: '50',
  AI_MODELS: 'openai/gpt-4o-mini,google/gemini-2.5-flash', AI_PRICES: '{"openai/gpt-4o-mini":[0.15,0.6]}', STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_x',
  STRIPE_PRICE_PRO_MONTH: 'price_pm', STRIPE_PRICE_CREDITS_500: 'price_c500', STRIPE_PRICE_TEAM_SEAT: 'price_team' };
const turnCalls = [];
env.FETCH = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const t = new URL(u).searchParams.get('access_token');
    const who = { 'tok-ana': { sub: '111', email: 'ana@example.com' }, 'tok-luis': { sub: '222', email: 'luis@example.com' }, 'tok-eva': { sub: '444', email: 'eva@example.com' }, 'tok-rosa': { sub: '555', email: 'rosa@escuela.example' }, 'tok-pepe': { sub: '666', email: 'pepe@escuela.example' }, 'tok-mar': { sub: '777', email: 'mar@example.com' }, 'tok-sol': { sub: '888', email: 'sol@example.com' }, 'tok-teo': { sub: '999', email: 'teo@example.com' }, 'tok-ines': { sub: '1010', email: 'ines@example.com' }, 'tok-gil': { sub: '1212', email: 'gil@example.com' }, 'tok-noa': { sub: '1313', email: 'noa@example.com' }, 'tok-pia': { sub: '1414', email: 'pia@example.com' }, 'tok-tess': { sub: '1515', email: 'tess@example.com' }, 'tok-ivo': { sub: '1616', email: 'ivo@example.com' }, 'tok-ada': { sub: '1717', email: 'ada@example.com' }, 'tok-bea': { sub: '1818', email: 'bea@example.com' }, 'tok-cid': { sub: '1919', email: 'cid@example.com' }, 'tok-dan': { sub: '2020', email: 'dan@example.com' }, 'tok-zoe': { sub: '2121', email: 'zoe@example.com' }, 'tok-kai': { sub: '2222', email: 'kai@example.com' }, 'tok-lia': { sub: '2323', email: 'lia@example.com' }, 'tok-sto': { sub: '2424', email: 'sto@example.com' }, 'tok-una': { sub: '2525', email: 'una@example.com' } }[t];
    if (t === 'tok-otraapp') return Response.json({ aud: 'otra-app', sub: '333', email: 'x@example.com', email_verified: 'true' });
    return who ? Response.json({ aud: CID, ...who, email_verified: 'true', expires_in: 3000 }) : new Response('bad', { status: 400 });
  }
  if (u === 'https://openidconnect.googleapis.com/v1/userinfo') return init.headers.Authorization === 'Bearer tok-sol' ? Response.json({ sub: '888', name: 'Sol <García>' }) : new Response('no', { status: 401 });
  if (u === 'https://api.resend.com/emails') { resendCalls.push({ auth: init.headers.Authorization, body: JSON.parse(init.body) }); return Response.json({ id: 're_1' }); }
  if (u.startsWith('https://rtc.live.cloudflare.com/v1/turn/keys/')) { turnCalls.push({ u, auth: init.headers.Authorization, body: JSON.parse(init.body) });
    return Response.json({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u1', credential: 'c1' }] }); }
  if (u.startsWith('https://rtc.live.cloudflare.com/v1/apps/')) { rtCalls.push({ u, method: init.method, auth: init.headers.Authorization, body: init.body && JSON.parse(init.body) });
    if (u.endsWith('/sessions/new')) return Response.json({ sessionId: 'sess-' + rtCalls.length });
    return Response.json({ sessionDescription: { type: 'answer', sdp: 'v=0 fake' }, tracks: [], requiresImmediateRenegotiation: false }); }
  if (u.startsWith('https://api.unsplash.com/')) { stockCalls.push({ u, auth: init.headers?.Authorization });
    return Response.json(u.includes('/download') ? {} : { results: [{ id: 'abc123', width: 4000, height: 3000, alt_description: 'Un faro', urls: { small: 'https://images.unsplash.com/s.jpg', regular: 'https://images.unsplash.com/r.jpg' },
      user: { name: 'Ana Foto', links: { html: 'https://unsplash.com/@ana' } } }, { id: 'malo', urls: { small: 'javascript:alert(1)', regular: 'http://x/y.jpg' }, user: {} }] }); }
  if (u.startsWith('https://openrouter.ai/api/v1/audio/speech')) { aiCalls.push({ u, body: JSON.parse(init.body), auth: init.headers.Authorization }); return new Response(new Uint8Array([73, 68, 51, 4, 0]), { headers: { 'Content-Type': 'audio/mpeg' } }); }
  if (u.startsWith('https://openrouter.ai/')) { aiCalls.push({ u, body: JSON.parse(init.body), auth: init.headers.Authorization }); const r = aiReply(u); return Response.json(r.body, { status: r.status }); }
  if (u.startsWith('https://blender.test/')) { blenderCalls.push({ u, body: init.body, sig: init.headers['X-Revela-Signature'] }); return blenderReply(JSON.parse(init.body)); }
  if (u.startsWith('https://api.stripe.com/')) { stripeCalls.push({ u, body: String(init.body), auth: init.headers?.Authorization }); return Response.json({ url: 'https://checkout.stripe.com/c/pay_x' }); }
  return new Response('?', { status: 404 });
};
env.ACCOUNTS = namespace(Account, env); env.BUDGET = namespace(Budget, env); env.DESKTOP = namespace(DesktopLink, env);
env.SCHEDULE = namespace(Schedule, env);
// Cloudflare Email Service, simulated: what was sent.
let sent = []; env.EMAIL = { send: async m => { sent.push(m); return { messageId: 'm' + sent.length }; } }; env.MAIL_SECRET = 'secreto-de-correo';
const TERMS = '2026-10-01';
env.SHAREBOX = namespace(ShareBox, env); env.DOCS = namespace(CloudDoc, env); env.TEAMS = namespace(Team, env); env.CALLS = namespace(CallRoom, env); env.LIMITS = namespace(Limits, env);
env.DIRECTORY = namespace(Directory, env); env.TICKETS = namespace(Tickets, env); env.AUDIT = namespace(Audit, env); env.FINANCE = namespace(Finance, env);

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗ api: ' + m); } };
const req = (method, path, { body, headers = {}, origin = SITE } = {}) => worker.fetch(new Request(SITE + path, { method,
  headers: { ...(origin && { Origin: origin }), ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers }, ...(body !== undefined && { body: JSON.stringify(body) }) }), env);
const cookieFrom = r => (r.headers.get('Set-Cookie') || '').split(';')[0];
const acc = sub => env.ACCOUNTS.inst.get('u:' + sub);

// ---- Signing in ----
let r0, r;
ok((await req('GET', '/api/me')).status === 401, 'sin sesión: nada');
// Relay servers for the phone remote: without the secrets, STUN only; with them, Cloudflare's TURN (no port 53); only for Revela's pages.
{ let j = await (await req('GET', '/api/ice', { origin: null, headers: { 'Sec-Fetch-Site': 'same-origin' } })).json();
  ok(j.iceServers?.length === 1 && !j.iceServers.some(x => x.username), 'ICE sin TURN configurado: solo STUN');
  ok((await req('GET', '/api/ice', { origin: 'https://malo.example', headers: { 'Sec-Fetch-Site': 'cross-site' } })).status === 403, 'ICE desde otra web: no');
  env.TURN_KEY_ID = 'clave-turn'; env.TURN_KEY_API_TOKEN = 'token-turn';
  j = await (await req('GET', '/api/ice', { origin: null, headers: { 'Sec-Fetch-Site': 'same-origin' } })).json();
  const turn = j.iceServers?.find(x => x.username);
  ok(turn && turn.credential === 'c1' && turn.urls.length === 2 && !turn.urls.some(u => /:53\?/.test(u)), 'ICE con TURN, sin el puerto 53: ' + JSON.stringify(j));
  ok(turnCalls.length === 1 && turnCalls[0].auth === 'Bearer token-turn' && /keys\/clave-turn\/credentials\/generate-ice-servers$/.test(turnCalls[0].u) && turnCalls[0].body.ttl === 86400, 'pide credenciales de un día con su token');
  delete env.TURN_KEY_ID; delete env.TURN_KEY_API_TOKEN; }
ok((await req('POST', '/api/login', { body: { accessToken: 'inventado' } })).status === 401, 'un token que Google no reconoce: no');
ok((await req('POST', '/api/login', { body: { accessToken: 'tok-otraapp' } })).status === 401, 'un token de otra aplicación: no');
// Accepting the terms (and being 14 or older) when the account is created
r0 = await req('POST', '/api/login', { body: { accessToken: 'tok-ana' } });
ok(r0.status === 400 && (await r0.json()).error === 'terms' && !acc('111')?.ctx.storage.m.get('profile'), 'cuenta nueva sin aceptar las condiciones: 400 y no se crea');
ok((await req('POST', '/api/login', { body: { accessToken: 'tok-ana', terms: '2020-01-01' } })).status === 400, 'condiciones de otra versión: no');
const lr = await req('POST', '/api/login', { body: { accessToken: 'tok-ana', terms: TERMS, lang: 'en' } }), setc = lr.headers.get('Set-Cookie') || '';
ok(lr.status === 200 && /HttpOnly/.test(setc) && /Secure/.test(setc) && /SameSite=Strict/.test(setc) && /Path=\/api/.test(setc), 'cookie de sesión segura: ' + setc);
const ana = cookieFrom(lr);
ok(acc('111').ctx.storage.m.get('profile').terms?.version === TERMS && acc('111').ctx.storage.m.get('profile').lang === 'en', 'se registran la aceptación (fecha y versión) y el idioma');
ok(!JSON.stringify([...acc('111').ctx.storage.m.get('sessions') ? Object.keys(acc('111').ctx.storage.m.get('sessions')) : []]).includes(ana.split('.')[1]), 'solo se guarda un resumen (hash) de la sesión');
let me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
// A session in use doesn't run out: with 5 days left, opening the app gives it its 30 days again (and its cookie).
{ const st = acc('111').ctx.storage, ss = await st.get('sessions'), k = Object.keys(ss)[0];
  ss[k] = { ...ss[k], expires: Date.now() + 5 * 864e5 }; await st.put('sessions', ss);
  const r = await req('GET', '/api/me', { headers: { Cookie: ana } }), after = (await st.get('sessions'))[k].expires;
  ok(r.status === 200 && after > Date.now() + 29 * 864e5 && /Max-Age=2592000/.test(r.headers.get('Set-Cookie') || ''), 'sesión en uso: se alarga sola (30 días más, con su cookie)');
  ok(!(await req('GET', '/api/me', { headers: { Cookie: ana } })).headers.get('Set-Cookie'), 'recién alargada: no se toca en cada petición'); }
ok(me.email === 'ana@example.com' && me.plan === 'free' && me.credits === 50 && me.features.join() === 'ai,cloud-save', 'cuenta nueva: plan gratis y 50 créditos de regalo: ' + JSON.stringify(me));
await req('POST', '/api/login', { body: { accessToken: 'tok-ana', terms: TERMS } });
me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
ok(me.credits === 50, 'el regalo es una sola vez (volver a entrar no da más)');
ok(me.terms === true, '/api/me: condiciones aceptadas');
// An account from before the terms: asked once (/api/me terms: false), accepted with POST /api/terms.
{ const P = acc('111').ctx.storage.m, prof = P.get('profile'); P.set('profile', { ...prof, terms: undefined });
  ok((await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json()).terms === false, 'cuenta anterior: /api/me dice terms: false');
  ok((await req('POST', '/api/login', { body: { accessToken: 'tok-ana' } })).status === 200, 'una cuenta que ya existe entra sin enviarlas');
  ok((await req('POST', '/api/terms', { headers: { Cookie: ana }, body: { version: 'vieja' } })).status === 400, 'aceptar otra versión: no');
  ok((await req('POST', '/api/terms', { body: { version: TERMS } })).status === 401, 'aceptar sin sesión: no');
  ok((await req('POST', '/api/terms', { headers: { Cookie: ana }, body: { version: TERMS } })).status === 200
    && (await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json()).terms === true && P.get('profile').terms.at > 0, 'aceptarlas: queda registrado'); }

// ---- Forged sessions ----
const [subPart] = ana.split('=')[1].split('.');
ok((await req('GET', '/api/me', { headers: { Cookie: `rv_session=${subPart}.inventado` } })).status === 401, 'una sesión inventada no vale');
const luisSub = Buffer.from('222').toString('base64url');
ok((await req('GET', '/api/me', { headers: { Cookie: `rv_session=${luisSub}.${ana.split('.')[1]}` } })).status === 401, 'la sesión de Ana no sirve para la cuenta de Luis');
ok((await req('GET', '/api/me', { headers: { Authorization: 'Bearer ' + ana.split('=')[1] } })).status === 200, 'el mismo token como «Bearer» (la aplicación de escritorio)');

// ---- Cross-site requests and CORS ----
const evil = await req('POST', '/api/ai/chat', { origin: 'https://malo.example', headers: { Cookie: ana }, body: { messages: [{ role: 'user', content: 'x' }] } });
ok(evil.status === 403 && !aiCalls.length, 'otra web no puede usar la sesión de Ana (CSRF)');
ok(!(await req('GET', '/api/me', { origin: 'https://malo.example', headers: { Cookie: ana } })).headers.get('Access-Control-Allow-Origin'), 'CORS: otra web no puede leer las respuestas');
ok((await req('OPTIONS', '/api/me')).headers.get('Access-Control-Allow-Credentials') === 'true', 'CORS con credenciales solo para revelaslides.com');

// ---- AI with credits ----
r = await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { model: 'modelo/carisimo', max_tokens: 999999, messages: [{ role: 'user', content: 'Hola' }] } });
let j = await r.json();
ok(r.status === 200 && j.choices[0].message.content === 'hola', 'responde la IA');
ok(aiCalls[0].body.model === 'openai/gpt-4o-mini' && aiCalls[0].body.max_tokens === 4000, 'modelo fuera de la lista → el de por defecto; tokens limitados: ' + JSON.stringify([aiCalls[0].body.model, aiCalls[0].body.max_tokens]));
ok(aiCalls[0].auth === 'Bearer sk-or-secreta' && !JSON.stringify(j).includes('sk-or'), 'la clave de la IA solo la ve el servidor');
ok(aiCalls[0].body.provider?.data_collection === 'deny', 'solo proveedores que no guardan ni entrenan con los datos');
me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
ok(j.charged === 5 && me.credits === 45, 'cobra lo que costó de verdad (0,01 $ = 5 créditos): ' + JSON.stringify([j.charged, me.credits]));
{ const led = await (await req('GET', '/api/account/export', { headers: { Cookie: ana } })).json(), e = led.ledger.at(-1);
  ok(e.reason === 'ai' && e.delta === -5 && e.feature === 'other' && e.model === 'openai/gpt-4o-mini', 'el movimiento dice para qué fue y con qué modelo: ' + JSON.stringify(e)); }
{ const n0 = aiCalls.length; await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { web: true, feature: 'research', messages: [{ role: 'user', content: 'Energía solar' }] } });
  const c = aiCalls[n0]; ok(c && JSON.stringify(c.body.plugins) === '[{"id":"web","max_results":6}]', 'buscar en internet: con el complemento web de OpenRouter');
  ok(!('plugins' in aiCalls[0].body), 'y sin él cuando no se pide'); }
ok((await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { messages: 'no' } })).status === 400, 'petición mal formada: 400');
ok((await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { messages: [{ role: 'tool', content: 'x' }] } })).status === 400, 'papeles no permitidos: 400');
// Pictures in the messages (describing screenshots): data: JPEG/PNG/WebP, limited; the estimate counts them as fixed tokens.
{
  const pic = kb => 'data:image/jpeg;base64,' + 'A'.repeat(Math.ceil(kb * 1024 / 3) * 4);
  const parts = (...urls) => [{ role: 'user', content: [{ type: 'text', text: 'Describe' }, ...urls.map(url => ({ type: 'image_url', image_url: { url } }))] }];
  const ask = (messages, extra = {}) => req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { model: 'google/gemini-2.5-flash-lite', max_tokens: 100, messages, ...extra } });
  ok(settings({}).models.includes('google/gemini-2.5-flash-lite'), 'flash-lite entre los modelos por defecto');
  const toml = await (await import('node:fs/promises')).readFile(new URL('../server/cloudflare/wrangler.toml', import.meta.url), 'utf8');
  ok(/^AI_MODELS = ".*google\/gemini-2\.5-flash-lite/m.test(toml) && /"google\/gemini-2\.5-flash-lite":\[0\.1,0\.4\]/.test(toml), 'flash-lite en wrangler.toml, con su precio');
  const models0 = env.AI_MODELS, prices0 = env.AI_PRICES;
  env.AI_MODELS = 'openai/gpt-4o-mini,google/gemini-2.5-flash,google/gemini-2.5-flash-lite';
  // (A price where counting the base64 would ask for ~170 credits: Ana has 45.)
  env.AI_PRICES = '{"google/gemini-2.5-flash-lite":[1,1]}';
  aiCalls = []; aiReply = () => ({ status: 200, body: { choices: [{ message: { content: '{}' } }], usage: { cost: 0.002 } } });
  r = await ask(parts(pic(250), pic(250), pic(250)));
  ok(r.status === 200 && aiCalls.length === 1 && aiCalls[0].body.model === 'google/gemini-2.5-flash-lite', 'imágenes en el mensaje: aceptadas, con flash-lite: ' + r.status);
  ok(aiCalls[0].body.messages[0].content[1].image_url.url.startsWith('data:image/jpeg;base64,'), 'y llegan tal cual al proveedor');
  ok((await r.json()).charged === 1, 'se cobra lo que informa el proveedor');
  ok((await ask(parts('data:image/png;base64,iVBORw0KGgo='))).status === 200 && (await ask(parts('data:image/webp;base64,UklGRg=='))).status === 200, 'PNG y WebP también');
  const bad = async (messages, why) => { aiCalls = []; const x = await ask(messages); ok(x.status === 400 && !aiCalls.length, why + ': ' + x.status); };
  await bad(parts(pic(320)), 'una imagen de más de ~300 KB: 400');
  await bad(parts(...Array(9).fill(pic(5))), 'más de 8 imágenes: 400');
  await bad(parts('https://example.com/a.jpg'), 'una dirección para que la descargue el proveedor: 400');
  await bad(parts('data:image/svg+xml;base64,PHN2Zz4='), 'otro tipo (SVG): 400');
  await bad(parts('data:image/gif;base64,R0lGOD=='), 'otro tipo (GIF): 400');
  await bad(parts('data:image/jpeg;base64,<script>'), 'base64 que no lo es: 400');
  await bad([{ role: 'assistant', content: [{ type: 'image_url', image_url: { url: pic(1) } }] }], 'imágenes solo en mensajes del usuario');
  await bad([{ role: 'user', content: [{ type: 'file', file: {} }] }], 'otras partes: 400');
  // (7 × 280 KB: each under its limit, but the request is over the 2 MB a request may be.)
  ok((await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { messages: parts(...Array(7).fill(pic(280))) } })).status === 413, 'demasiado en total: 413');
  env.AI_MODELS = models0; env.AI_PRICES = prices0;
  const S = acc('111').ctx.storage.m; S.set('lots', [{ n: 45, exp: Date.now() + 9e8 }]); S.set('credits', 45); S.set('debt', 0);
}
// Failed provider: nothing charged.
aiReply = () => ({ status: 500, body: { error: 'caído' } });
r = await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { messages: [{ role: 'user', content: 'x' }] } });
me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
ok(r.status === 502 && me.credits === 45, 'si la IA falla, no se cobra');
// Two requests at once with credits for only one: one of them is refused (no double spending).
aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'ok' } }], usage: { cost: 0.07 } } });
env.AI_PRICES = '{"openai/gpt-4o-mini":[1,20]}';                         // (an estimate of about 40 credits each)
aiCalls = [];
const both = await Promise.all([0, 1].map(() => req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { max_tokens: 4000, messages: [{ role: 'user', content: 'x' }] } })));
ok(both.map(x => x.status).sort().join() === '200,402' && aiCalls.length === 1, 'dos a la vez con saldo para una: una se rechaza: ' + both.map(x => x.status));
me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
ok(me.credits === 10, 'saldo correcto tras la de 0,07 $ (35 créditos): ' + me.credits);
r = await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { max_tokens: 4000, messages: [{ role: 'user', content: 'x' }] } });
ok(r.status === 402 && (await r.json()).credits === 10 && aiCalls.length === 1, 'sin créditos suficientes: 402, sin llamar a la IA');
env.AI_PRICES = '{"openai/gpt-4o-mini":[0.15,0.6]}';
// Credits held by a request that never finished come back after 10 minutes.
const holds = acc('111').ctx.storage.m; holds.set('holds', { x: { n: 7, taken: [{ n: 7, exp: Date.now() + 9e6 }], at: Date.now() - 11 * 60e3 } }); holds.set('lots', [{ n: 3, exp: Date.now() + 9e6 }]); holds.set('debt', 0); holds.set('credits', 3);
aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'ok' } }], usage: { cost: 0.002 } } });
await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { max_tokens: 50, messages: [{ role: 'user', content: 'x' }] } });
ok(acc('111').ctx.storage.m.get('credits') === 9, 'créditos apartados y olvidados: vuelven: ' + acc('111').ctx.storage.m.get('credits'));
// Per-minute limit and the monthly budget.
env.AI_PER_MINUTE = '1';
const burst = await Promise.all([0, 1].map(() => req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { max_tokens: 20, messages: [{ role: 'user', content: 'x' }] } })));
ok(burst.some(x => x.status === 429), 'límite por minuto');
env.AI_PER_MINUTE = '100'; env.MONTHLY_BUDGET_USD = '0.001';
acc('111').ctx.storage.m.set('rate', []);
ok((await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { max_tokens: 20, messages: [{ role: 'user', content: 'x' }] } })).status === 503, 'tope de gasto mensual global: la IA se pausa');
env.MONTHLY_BUDGET_USD = '50';
const bob = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-luis', terms: TERMS } }));
env.OPENROUTER_KEY = ''; ok((await req('POST', '/api/ai/chat', { headers: { Cookie: bob }, body: { messages: [{ role: 'user', content: 'x' }] } })).status === 503, 'sin clave de IA configurada: 503'); env.OPENROUTER_KEY = 'sk-or-secreta';
// Images: a fixed price.
aiReply = u => (u.endsWith('/images') ? { status: 200, body: { data: [{ b64_json: 'AAAA', media_type: 'image/png' }] } } : { status: 500, body: {} });
r = await req('POST', '/api/ai/image', { headers: { Cookie: bob }, body: { prompt: 'un gato', aspect_ratio: '16:9' } });
j = await r.json();
ok(r.status === 200 && j.data[0].b64_json === 'AAAA' && j.charged === 15, 'imagen: 15 créditos');
// Editing one (erase something, more resolution, its edges extended…): the picture goes as the Image API's input_references.
// (The model failing here: what's checked is what it's asked; nothing charged, so the accounts' credits below don't move.)
const okReply = aiReply; aiReply = () => ({ status: 500, body: {} });
r = await req('POST', '/api/ai/image', { headers: { Cookie: bob }, body: { prompt: 'Remove the cable', aspect_ratio: '4:3', image: 'data:image/jpeg;base64,/9j/AAAA' } });
ok(r.status === 502 && aiCalls.at(-1).body.input_references?.[0]?.image_url?.url === 'data:image/jpeg;base64,/9j/AAAA' && aiCalls.at(-1).body.aspect_ratio === '4:3', 'imagen: editar una, con la imagen de referencia');
aiReply = okReply;
ok((await req('POST', '/api/ai/image', { headers: { Cookie: bob }, body: { prompt: 'x', image: 'javascript:alert(1)' } })).status === 400
  && (await req('POST', '/api/ai/image', { headers: { Cookie: bob }, body: { prompt: 'x', image: 'data:text/html;base64,PHA+' } })).status === 400, 'imagen: solo imágenes de verdad como referencia');

// ---- Payments: only Stripe's signed messages count ----
const sign = async (body, secret = 'whsec_x', t = Math.floor(Date.now() / 1000)) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`))).toString('hex'); return `t=${t},v1=${sig}`; };
const hook = async (ev, secret) => { const body = JSON.stringify(ev); return worker.fetch(new Request(SITE + '/api/billing/webhook', { method: 'POST', body, headers: { 'Stripe-Signature': await sign(body, secret) } }), env); };
const paid = { id: 'evt_1', type: 'invoice.paid', data: { object: { customer: 'cus_1', subscription_details: { metadata: { sub: '222' } }, lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 30 * 86400 } }] } } } };
ok((await hook(paid, 'otro_secreto')).status === 400, 'un aviso de pago falso (mal firmado) se rechaza');
ok((await worker.fetch(new Request(SITE + '/api/billing/webhook', { method: 'POST', body: JSON.stringify(paid) }), env)).status === 400, 'sin firma: rechazado');
ok(!(await verifyStripe('{}', await sign('{}', 'whsec_x', Math.floor(Date.now() / 1000) - 3600), 'whsec_x')), 'una firma antigua (reenviada) no vale');
ok((await hook(paid)).status === 200, 'aviso de pago firmado');
me = await (await req('GET', '/api/me', { headers: { Cookie: bob } })).json();
ok(me.plan === 'pro' && me.credits === 50 - 15 + 1000 && me.features.includes('share-people'), 'Pro: plan, funciones y 1000 créditos: ' + JSON.stringify(me));
await hook(paid);
ok((await (await req('GET', '/api/me', { headers: { Cookie: bob } })).json()).credits === 1035, 'el mismo aviso repetido no da créditos dos veces');
await hook({ id: 'evt_2', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', customer: 'cus_1', metadata: { sub: '222', product: 'credits-500' } } } });
ok((await (await req('GET', '/api/me', { headers: { Cookie: bob } })).json()).credits === 1535, 'paquete de 500 créditos');
await hook({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: { metadata: { sub: '222' } } } });
me = await (await req('GET', '/api/me', { headers: { Cookie: bob } })).json();
ok(me.plan === 'free' && me.credits === 1535, 'baja de Pro: vuelve a gratis, conserva lo comprado');
r = await req('POST', '/api/billing/checkout', { headers: { Cookie: bob }, body: { product: 'pro-month' } });
ok(r.status === 200 && (await r.json()).url.startsWith('https://checkout.stripe.com/') && /client_reference_id=222/.test(stripeCalls.at(-1).body), 'pago con Stripe Checkout, ligado a la cuenta');
ok((await req('POST', '/api/billing/checkout', { headers: { Cookie: bob }, body: { product: 'gratis-para-siempre' } })).status === 503, 'productos inventados: no');
ok(!/unit_amount|price_data/.test(stripeCalls.at(-1).body), 'el precio lo pone Stripe, no el navegador');
ok(!/automatic_tax/.test(stripeCalls.at(-1).body), 'sin Stripe Tax activado, no se le pide calcular impuestos');
env.STRIPE_AUTOMATIC_TAX = '1';
await req('POST', '/api/billing/checkout', { headers: { Cookie: bob }, body: { product: 'pro-month' } });
ok(/automatic_tax%5Benabled%5D=true/.test(stripeCalls.at(-1).body) && /tax_id_collection%5Benabled%5D=true/.test(stripeCalls.at(-1).body), 'con STRIPE_AUTOMATIC_TAX=1: Stripe calcula el impuesto de cada país y pide el NIF de empresa');
delete env.STRIPE_AUTOMATIC_TAX;

// ---- Desktop sign-in ----
const verifier = 'v'.repeat(10) + crypto.randomUUID().replace(/-/g, ''), challenge = await sha256(verifier), nonce = crypto.randomUUID().replace(/-/g, '');
r = await req('POST', '/api/desktop/start', { origin: 'tauri://localhost', body: { nonce, challenge } });
j = await r.json(); ok(r.status === 200 && j.code === shortCode(challenge), 'la app de escritorio empieza y muestra un código');
ok((await req('POST', '/api/desktop/claim', { origin: 'tauri://localhost', body: { nonce, verifier } }).then(x => x.json())).pending, 'mientras no se aprueba: pendiente');
ok((await req('POST', '/api/desktop/approve', { headers: { Cookie: ana }, body: { nonce, code: 'XXXXXX' } })).status === 400, 'con otro código: no');
ok((await req('POST', '/api/desktop/approve', { headers: { Authorization: 'Bearer ' + ana.split('=')[1] }, origin: 'tauri://localhost', body: { nonce, code: j.code } })).status === 400, 'solo se aprueba desde el navegador con sesión');
ok((await req('POST', '/api/desktop/approve', { headers: { Cookie: ana }, body: { nonce, code: j.code } })).status === 200, 'aprobada desde revelaslides.com');
ok((await req('POST', '/api/desktop/claim', { origin: 'tauri://localhost', body: { nonce, verifier: 'otro' } })).status === 403, 'sin el secreto de la app: no se recoge');
r = await req('POST', '/api/desktop/claim', { origin: 'tauri://localhost', body: { nonce, verifier } });
const desk = (await r.json()).token;
ok(r.status === 200 && desk, 'la app recoge su sesión');
const dm = await req('GET', '/api/me', { origin: 'tauri://localhost', headers: { Authorization: 'Bearer ' + desk } });
ok(dm.status === 200 && (await dm.json()).email === 'ana@example.com' && dm.headers.get('Access-Control-Allow-Origin') === 'tauri://localhost' && !dm.headers.get('Access-Control-Allow-Credentials'), 'la app usa su sesión (sin cookies)');
ok((await req('POST', '/api/desktop/claim', { origin: 'tauri://localhost', body: { nonce, verifier } })).status !== 200, 'la sesión se recoge una sola vez');

// ---- Voice-over (speech) ----
{
  const ev = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-eva', terms: TERMS } }));
  const before = (await (await req('GET', '/api/me', { headers: { Cookie: ev } })).json()).credits;
  let r = await req('POST', '/api/ai/speech', { headers: { Cookie: ev }, body: { input: 'Hola a todos. '.repeat(20), voice: 'nova' } });
  j = await r.json();
  ok(r.status === 200 && atob(j.audio).charCodeAt(0) === 73, 'voz: devuelve el audio (mp3)');
  ok(aiCalls.at(-1).auth === 'Bearer sk-or-secreta' && aiCalls.at(-1).body.voice === 'nova' && aiCalls.at(-1).body.response_format === 'mp3', 'voz: con la clave del servidor');
  const after = (await (await req('GET', '/api/me', { headers: { Cookie: ev } })).json()).credits;
  ok(before - after === Math.ceil(280 * 0.00002 / 0.002), 'voz: se cobra por caracteres: ' + (before - after));
  await req('POST', '/api/ai/speech', { headers: { Cookie: ev }, body: { input: 'x', voice: 'voz-inventada' } });
  ok(aiCalls.at(-1).body.voice === 'alloy', 'voz: solo voces permitidas');
  ok((await req('POST', '/api/ai/speech', { headers: { Cookie: ev }, body: { input: 'x'.repeat(4001) } })).status === 400, 'voz: textos demasiado largos no');
  ok((await req('POST', '/api/ai/speech', { body: { input: 'hola' } })).status === 401, 'voz: sin sesión no');
}

// ---- Photos (Unsplash, Pexels) with the server's keys ----
{
  const ev = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-eva', terms: TERMS } }));
  ok((await req('GET', '/api/stock/search?provider=unsplash&q=faro', { headers: { Cookie: ev } })).status === 503, 'fotos: sin clave configurada, no disponible');
  ok(!(await (await req('GET', '/api/me', { headers: { Cookie: ev } })).json()).photos.length, 'fotos: la app sabe cuáles hay');
  env.UNSPLASH_ACCESS_KEY = 'unsplash-secreta';
  ok((await (await req('GET', '/api/me', { headers: { Cookie: ev } })).json()).photos.join() === 'unsplash', 'fotos: Unsplash configurado');
  ok((await req('GET', '/api/stock/search?provider=unsplash&q=faro')).status === 401, 'fotos: sin sesión no');
  const r = await req('GET', '/api/stock/search?provider=unsplash&q=faro&page=2', { headers: { Cookie: ev } }), d = await r.json();
  ok(r.status === 200 && d.results.length === 1 && d.results[0].src === 'https://images.unsplash.com/r.jpg' && d.results[0].author === 'Ana Foto' && /utm_source=revela/.test(d.results[0].authorUrl), 'fotos: resultados con su autor (y enlaces seguros solo)');
  ok(stockCalls.at(-1).auth === 'Client-ID unsplash-secreta' && /query=faro/.test(stockCalls.at(-1).u) && !JSON.stringify(d).includes('unsplash-secreta'), 'fotos: la clave va del servidor a Unsplash y nunca al navegador');
  ok((await req('GET', '/api/stock/search?provider=otro&q=x', { headers: { Cookie: ev } })).status === 400, 'fotos: solo los servicios conocidos');
  await req('POST', '/api/stock/used', { headers: { Cookie: ev }, body: { provider: 'unsplash', id: 'abc123' } });
  ok(/\/photos\/abc123\/download$/.test(stockCalls.at(-1).u), 'fotos: se avisa a Unsplash al usar una (lo pide)');
  let limited = false; for (let i = 0; i < 35 && !limited; i++) limited = (await req('GET', '/api/stock/search?provider=unsplash&q=x', { headers: { Cookie: ev } })).status === 429;
  ok(limited, 'fotos: límite de búsquedas por minuto');
  delete env.UNSPLASH_ACCESS_KEY;
}

// ---- The brand from a website (brand kit ▸ «Sacar la marca de la web») ----
{
  const ev = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-eva', terms: TERMS } }));
  const prev = env.FETCH, asked = [];
  const PAGE = `<html><head><title>Inicio | Escola Mar Blava</title><meta name="theme-color" content="#0b5fa5">
    <link rel="stylesheet" href="/css/main.css"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Lato&display=swap" rel="stylesheet">
    <link rel="apple-touch-icon" href="/touch.png"><style>body{background:#fffdf8;color:#222}</style></head>
    <body><header><a href="/"><img class="site-logo" src="/img/logo.png" alt="Escola Mar Blava"></a></header><svg class="logo-mark" viewBox="0 0 10 10"><circle r="5"/></svg></body></html>`;
  const CSS = `:root{--brand-primary:#0b5fa5;--brand-accent:#f2a900;--blue:#007bff}h1,h2{font-family:"Montserrat",sans-serif}body{font-family:'Lato',Arial,sans-serif}
    .btn{background:#f2a900;color:#fff}a:hover{color:#0b5fa5}.alert{background:rgba(0,0,0,.1)}`;
  env.FETCH = async (u, init) => { const s = String(u); asked.push(s);
    if (s === 'https://marblava.example/') return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    if (s === 'https://marblava.example/css/main.css') return new Response(CSS, { headers: { 'content-type': 'text/css' } });
    if (s === 'https://marblava.example/img/logo.png') return new Response(new Uint8Array([137, 80, 78, 71, 1, 2, 3]), { headers: { 'content-type': 'image/png' } });
    if (s === 'https://bloquea.example/') return new Response('no', { status: 403 });
    return prev(u, init); };
  try {
    ok((await req('POST', '/api/brand/site', { body: { url: 'marblava.example' } })).status === 401, 'marca de una web: sin sesión no');
    const r = await req('POST', '/api/brand/site', { headers: { Cookie: ev }, body: { url: 'marblava.example' } }), d = await r.json();
    ok(r.status === 200 && d.name === 'Escola Mar Blava', 'marca de una web: el nombre (la parte del título que no es «Inicio»): ' + d.name);
    ok(d.colors[0] === '#fffdf8' && d.colors[1] === '#222222', 'marca de una web: fondo y texto: ' + d.colors.slice(0, 2));
    ok(d.colors[2] === '#0b5fa5' && d.colors[3] === '#f2a900' && !d.colors.includes('#007bff'), 'marca de una web: los colores de la marca primero, sin los de Bootstrap: ' + d.colors);
    ok(d.fonts.heading === 'Montserrat' && d.fonts.body === 'Lato', 'marca de una web: las fuentes de los títulos y del texto: ' + JSON.stringify(d.fonts));
    ok(d.logos[0] === 'data:image/png;base64,iVBORwECAw==' && /^data:image\/svg\+xml;base64,/.test(d.logos[1]), 'marca de una web: el logotipo, traído como imagen (y el SVG de la página)');
    ok(!asked.some(x => /fonts\.googleapis/.test(x)), 'marca de una web: no descarga las hojas de Google Fonts (le basta el enlace)');
    for (const bad of ['http://localhost:8787/', 'http://192.168.1.10/', 'file:///etc/passwd', 'https://user:pw@marblava.example/', 'ftp://x.example/'])
      ok((await req('POST', '/api/brand/site', { headers: { Cookie: ev }, body: { url: bad } })).status === 400, 'marca de una web: no lee direcciones privadas ni raras: ' + bad);
    ok((await req('POST', '/api/brand/site', { headers: { Cookie: ev }, body: { url: 'https://bloquea.example/' } })).status === 502, 'marca de una web: una web que no deja leerse, un error claro');
    let limited = false; for (let i = 0; i < 8 && !limited; i++) limited = (await req('POST', '/api/brand/site', { headers: { Cookie: ev }, body: { url: 'marblava.example' } })).status === 429;
    ok(limited, 'marca de una web: unas pocas por minuto');
  } finally { env.FETCH = prev; }
}

// ---- Presentations in the cloud: roles checked by the server ----
{
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok, terms: TERMS } }));
  const eva = await login('tok-eva'), luis = await login('tok-luis');
  const deck = { name: 'Mi charla', slides: [{ id: 's1', blocks: [{ id: 'b1', type: 'text', html: 'Hola' }], comments: [] }, { id: 's2', blocks: [], comments: [] }] };
  ok((await req('POST', '/api/docs', { body: { deck } })).status === 401, 'nube: sin sesión no se guarda nada');
  let r = await req('POST', '/api/docs', { headers: { Cookie: ana }, body: { deck } }); const { id } = await r.json();
  ok(r.status === 200 && /^[\w-]{20,}$/.test(id), 'nube: guardar una presentación');
  const get = (c, path = '') => req('GET', `/api/docs/${id}${path}`, { headers: c ? { Cookie: c } : {} });
  const ops = (c, o) => req('POST', `/api/docs/${id}/ops`, { headers: { Cookie: c }, body: { ops: o } });
  j = await (await get(ana)).json(); ok(j.role === 'owner' && j.deck.slides.length === 2 && j.rev === 1 && j.sharing.link === 'none', 'nube: la dueña la abre');
  ok((await get(eva)).status === 403 && (await get(null)).status === 401, 'nube: privada — nadie más la abre, ni sin sesión');
  ok((await (await req('GET', '/api/docs', { headers: { Cookie: ana } })).json()).mine[0].name === 'Mi charla', 'nube: en la lista de la dueña');
  // Limit of the free plan
  for (let i = 0; i < 2; i++) await req('POST', '/api/docs', { headers: { Cookie: ana }, body: { deck } });
  ok((await req('POST', '/api/docs', { headers: { Cookie: ana }, body: { deck } })).status === 402, 'nube: el plan gratis tiene un límite de documentos');
  // People need Pro; the link is for everyone
  ok((await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { people: { 'eva@example.com': 'edit' } } })).status === 402, 'nube: compartir con personas es de Pro');
  await env.ACCOUNTS.get('u:111').fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: 'pro', until: Date.now() + 864e5 }) });
  r = await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { people: { 'Eva@Example.com': 'comment', 'luis@example.com': 'view' } } });
  ok(r.status === 200 && (await r.json()).sharing.people['eva@example.com'] === 'comment', 'nube: con Pro, con personas concretas');
  ok((await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { people: { 'no es un correo': 'edit' } } })).status === 400, 'nube: correos inválidos no');
  ok((await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { people: { 'eva@example.com': 'owner' } } })).status === 400, 'nube: nadie puede ser nombrado dueño');
  j = await (await req('GET', '/api/docs', { headers: { Cookie: eva } })).json();
  ok(j.shared.length === 1 && j.shared[0].id === id && j.shared[0].role === 'comment' && j.shared[0].owner === 'ana@example.com', 'nube: aparece en «compartido conmigo»');
  j = await (await get(eva)).json(); ok(j.role === 'comment' && !j.sharing, 'nube: la comentarista la abre (sin ver con quién está compartida)');
  // Commenters: only comments
  const comment = { p: ['slides', 's1', 'comments', 'c1'], v: { id: 'c1', text: 'Bien', replies: [] } };
  ok((await ops(eva, [{ p: ['slides', 's1', 'blocks', 'b1', 'html'], v: 'Hackeado' }])).status === 403, 'nube: quien comenta no puede editar');
  ok((await ops(eva, [comment, { p: ['name'], v: 'x' }])).status === 403, 'nube: todo o nada (no se cuela un cambio junto a un comentario)');
  r = await ops(eva, [comment]); ok(r.status === 200 && (await r.json()).rev === 2, 'nube: quien comenta, comenta');
  ok((await ops(luis, [comment])).status === 403, 'nube: quien solo lee no puede comentar');
  ok((await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: eva }, body: { link: 'edit' } })).status === 403, 'nube: solo la dueña cambia los permisos');
  ok((await req('POST', `/api/docs/${id}/delete`, { headers: { Cookie: eva } })).status === 403, 'nube: solo la dueña la borra');
  ok((await req('POST', `/api/docs/${id}/ops`, { headers: { Cookie: eva }, body: { ops: [comment], who: { sub: '111' } } })).status === 200
    && (await (await get(eva)).json()).role === 'comment', 'nube: «who» en el cuerpo no cambia quién eres');
  // Editors, catching up, versions
  await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { people: { 'eva@example.com': 'edit' } } });
  ok((await get(luis)).status === 403 && !(await (await req('GET', '/api/docs', { headers: { Cookie: luis } })).json()).shared.length, 'nube: quitar a alguien le quita el acceso y la lista');
  r = await ops(eva, [{ p: ['slides', 's1', 'blocks', 'b1', 'html'], v: 'Hola, mundo' }]); ok(r.status === 200, 'nube: quien edita, edita');
  j = await (await get(ana, '/since?rev=3')).json(); ok(j.rev === 4 && j.ops.length === 1 && j.ops[0].v === 'Hola, mundo', 'nube: la dueña recibe solo lo que cambió');
  j = await (await get(ana, '/since?rev=0')).json(); ok(j.deck && j.deck.slides[0].blocks[0].html === 'Hola, mundo', 'nube: si va muy atrás, el documento entero');
  j = await (await get(eva, '/versions')).json(); ok(j.versions.length === 1, 'nube: una versión guardada antes de editar');
  j = await (await get(eva, '/version?at=' + j.versions[0].at)).json(); ok(j.deck.slides[0].blocks[0].html === 'Hola', 'nube: la versión anterior se puede recuperar');
  ok((await ops(ana, [{ p: ['slides', 's1', 'blocks', 'b1', 'html'], v: 'x'.repeat(31 * 1024 * 1024) }])).status === 413, 'nube: tamaño máximo');
  // Link
  ok((await get(null)).status === 401, 'nube: sin enlace público, sin sesión no');
  await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { link: 'view' } });
  j = await (await get(null)).json(); ok(j.role === 'view' && j.deck, 'nube: con enlace para leer, se lee sin sesión');
  ok((await req('POST', `/api/docs/${id}/ops`, { body: { ops: [comment] } })).status === 401, 'nube: el enlace para leer no deja cambiar nada');
  ok((await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { link: 'admin' } })).status === 400, 'nube: roles de enlace inventados no');
  // Permissions: «only present», no copies, editors who share, access that ends.
  {
    const share = (c, body) => req('POST', `/api/docs/${id}/share`, { headers: { Cookie: c }, body });
    await ops(ana, [{ p: ['slides', 's1', 'notes'], v: 'NOTA-SECRETA del orador' }, { p: ['slides', 's2', 'hidden'], v: true }]);
    r = await share(ana, { link: 'none', people: { 'eva@example.com': 'edit', 'luis@example.com': 'present' } });   // (the highest role wins: no link for now)
    ok(r.status === 200, 'permisos: «solo presentar» es un rol válido');
    j = await (await get(luis)).json();
    ok(j.role === 'present' && j.noCopy === true && j.deck.slides.length === 1 && !JSON.stringify(j.deck).includes('NOTA-SECRETA') && !JSON.stringify(j.deck).includes('"comments"'),
      'permisos: «solo presentar» recibe las diapositivas del público: sin notas, comentarios ni ocultas: ' + JSON.stringify(j.deck).slice(0, 200));
    j = await (await get(luis, '/since?rev=1')).json(); ok(j.deck && !j.ops && !JSON.stringify(j).includes('NOTA-SECRETA'), 'permisos: ni en los cambios se cuelan las notas');
    ok((await ops(luis, [comment])).status === 403 && (await get(luis, '/versions')).status === 403, 'permisos: «solo presentar» no comenta ni ve versiones');
    ok((await req('POST', `/api/docs/${id}/duplicate`, { headers: { Cookie: luis }, body: {} })).status === 403, 'permisos: ni se hace una copia');
    j = await (await get(eva)).json(); ok(j.deck.slides.length === 2 && JSON.stringify(j.deck).includes('NOTA-SECRETA') && !j.noCopy, 'permisos: quien edita lo ve todo');
    // No copies for who can only view or comment; editors unaffected; only the owner decides.
    await share(ana, { link: 'view' });
    ok(!(await (await get(null)).json()).noCopy, 'sin copias: apagado de entrada');
    ok((await share(ana, { noCopy: true })).status === 200 && (await (await get(null)).json()).noCopy === true, 'sin copias: el enlace para ver lo recibe');
    ok(!(await (await get(eva)).json()).noCopy && (await (await get(ana)).json()).sharing.noCopy === true, 'sin copias: no afecta a quien edita; la dueña lo ve en sus ajustes');
    ok((await share(eva, { noCopy: false })).status === 403, 'sin copias: solo la dueña lo cambia');
    // Editors who share (off unless the owner allows it); never the settings.
    ok((await share(eva, { link: 'edit' })).status === 403 && !(await (await get(eva)).json()).sharing, 'editores: de entrada no comparten');
    await share(ana, { editorsShare: true });
    await env.ACCOUNTS.get('u:444').fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: 'pro', until: Date.now() + 864e5 }) });
    j = await (await get(eva)).json(); ok(j.sharing && j.sharing.editorsShare === true, 'editores: con el permiso, ven y gestionan con quién se comparte');
    r = await share(eva, { people: { ...j.sharing.people, 'teo@example.com': 'view' } });
    ok(r.status === 200, 'editores: comparten con otra persona');
    const teo = await login('tok-teo'); j = await (await req('GET', '/api/docs', { headers: { Cookie: teo } })).json();
    ok(j.shared.some(x => x.id === id && x.owner === 'ana@example.com' && x.role === 'view'), 'editores: en su lista figura la dueña, no quien la compartió');
    ok((await share(eva, { editorsShare: false })).status === 403 && (await share(eva, { people: { 'eva@example.com': 'edit' }, noCopy: false })).status === 403, 'editores: los ajustes, nunca');
    // Access that ends: a person's and the link's.
    const soon = Date.now() + 60e3;
    ok((await share(ana, { until: { 'luis@example.com': Date.now() - 1000 } })).status === 400 && (await share(ana, { until: { 'nadie@example.com': soon } })).status === 400, 'caducidad: ni en el pasado ni para quien no está');
    ok((await share(ana, { until: { 'luis@example.com': soon }, linkUntil: soon })).status === 200 && (await get(luis)).status === 200, 'caducidad: hasta entonces, entra');
    const fake = Date.now; Date.now = () => fake() + 120e3;
    ok((await get(luis)).status === 403 && (await get(null)).status === 401 && (await get(teo)).status === 200, 'caducidad: después, ni la persona ni el enlace (los demás, sí)');
    Date.now = fake;
    j = await (await get(ana)).json(); ok(j.sharing.until['luis@example.com'] === soon && j.sharing.linkUntil === soon, 'caducidad: la dueña ve las fechas');
    await share(ana, { people: { 'eva@example.com': 'edit', 'teo@example.com': 'view' } });
    ok(!(await (await get(ana)).json()).sharing.until['luis@example.com'], 'caducidad: se va con la persona');
    await share(ana, { linkUntil: null, link: 'present' });
    j = await (await get(null)).json(); ok(j.role === 'present' && j.deck.slides.length === 1 && j.noCopy, 'enlace «solo presentar»: sin sesión, solo el pase: ' + JSON.stringify(j).slice(0, 200));
    // Only some slides: per person and for the link; the others never leave the server; editors, always all.
    {
      const ids = j => (j.deck?.slides || []).map(x => x.id).join();
      ok((await share(ana, { link: 'none', people: { 'eva@example.com': 'edit', 'teo@example.com': 'comment' }, slidesOf: { 'teo@example.com': ['s2'] } })).status === 200, 'solo unas: se guarda');
      j = await (await get(teo)).json(); ok(ids(j) === 's2' && j.only === true && !JSON.stringify(j).includes('Hola, mundo'), 'solo unas: recibe solo las suyas (nada de las otras): ' + ids(j));
      j = await (await get(teo, '/since?rev=1')).json(); ok(ids(j) === 's2' && !j.ops, 'solo unas: ni en los cambios');
      ok((await ops(teo, [{ p: ['slides', 's1', 'comments'], v: [{ id: 'cx', text: 'aquí no' }] }])).status === 403, 'solo unas: no comenta en las que no ve');
      ok((await ops(teo, [{ p: ['slides', 's2', 'comments'], v: [{ id: 'cy', text: 'aquí sí' }] }])).status === 200, 'solo unas: comenta en las suyas');
      ok(!(await (await get(teo, '/thumb')).json()).thumb, 'solo unas: ni la miniatura de la primera');
      ok(ids(await (await get(eva)).json()) === 's1,s2', 'solo unas: quien edita, todas');
      j = await (await get(ana)).json(); ok(j.sharing.slidesOf['teo@example.com'].join() === 's2' && j.sharing.linkSlides === null, 'solo unas: la dueña ve la elección');
      // Widened later: «so they get more».
      await share(ana, { slidesOf: { 'teo@example.com': ['s2', 's1'] } }); ok(ids(await (await get(teo)).json()) === 's1,s2', 'solo unas: se amplía cuando quiera (en el orden de la presentación)');
      await share(ana, { slidesOf: { 'teo@example.com': ['s2'] }, link: 'view', linkSlides: ['s1'] });
      j = await (await get(null)).json(); ok(ids(j) === 's1' && j.only, 'solo unas: también el enlace');
      ok(ids(await (await get(teo)).json()) === 's1,s2', 'solo unas: por la persona y por el enlace, las de los dos');
      await share(ana, { slidesOf: { 'eva@example.com': ['s1'] } }); ok(ids(await (await get(eva)).json()) === 's1,s2' && !(await (await get(ana)).json()).sharing.slidesOf['eva@example.com'], 'solo unas: a quien edita no se le aplica');
      ok((await share(ana, { linkSlides: ['nada'] })).status === 400 && (await share(ana, { slidesOf: { 'nadie@example.com': ['s1'] } })).status === 400, 'solo unas: diapositivas que existen, para quien está');
      await share(ana, { slidesOf: {}, linkSlides: null }); ok(ids(await (await get(null)).json()) === 's1,s2', 'solo unas: y vuelta a todas');
    }
    // Polls answered later by a link: only the one opened so; any voter, checked answers; the answers for the editor.
    {
      await ops(ana, [{ p: ['slides', 's1', 'blocks', 'pa'], v: { id: 'pa', type: 'poll', pollId: 'pollnum1', kind: 'number', question: '¿Cuántos?', options: [], min: 0, max: 10, async: true, answer: 7 } },
        { p: ['slides', 's1', 'blocks', 'pb'], v: { id: 'pb', type: 'poll', pollId: 'pollquiz1', kind: 'quiz', question: 'Q', options: ['a', 'b'], correct: [1], async: true } },
        { p: ['slides', 's1', 'blocks', 'pc'], v: { id: 'pc', type: 'poll', pollId: 'pollshut1', kind: 'choice', question: 'Q', options: ['a', 'b'] } }]);
      const P = (pid, m = 'GET', b) => req(m, `/api/docs/${id}/poll/${pid}`, m === 'POST' ? { body: b } : {});
      j = await (await P('pollnum1')).json();
      ok(j.poll && j.poll.kind === 'number' && j.poll.max === 10 && !('answer' in j.poll) && !JSON.stringify(j).includes('NOTA-SECRETA'), 'más tarde: la votación, sin sesión y sin la respuesta correcta: ' + JSON.stringify(j));
      ok((await P('pollquiz1')).status === 404 && (await P('pollshut1')).status === 404, 'más tarde: ni cuestionarios ni las no abiertas');
      ok((await P('pollnum1', 'POST', { voter: 'votante-123456', answer: 4 })).status === 200 && (await P('pollnum1', 'POST', { voter: 'votante-123456', answer: 6 })).status === 200, 'más tarde: se responde (y se cambia)');
      ok((await P('pollnum1', 'POST', { voter: 'votante-999999', answer: 11 })).status === 400 && (await P('pollnum1', 'POST', { voter: 'x', answer: 3 })).status === 400, 'más tarde: respuestas fuera de rango o votantes raros, no');
      ok((await req('GET', `/api/docs/${id}/pollvotes/pollnum1`)).status === 401 && (await req('GET', `/api/docs/${id}/pollvotes/pollnum1`, { headers: { Cookie: teo } })).status === 403, 'más tarde: las respuestas, solo para quien edita');
      j = await (await req('GET', `/api/docs/${id}/pollvotes/pollnum1`, { headers: { Cookie: ana } })).json();
      ok(JSON.stringify(j.votes) === '{"votante-123456":6}', 'más tarde: las respuestas, una por persona: ' + JSON.stringify(j));
    }
    // The class at its own pace: where each one is and their marks, for the teacher's panel.
    {
      const G = (m, path = '', b, c) => req(m, `/api/docs/${id}/progress${path}`, { ...(b && { body: b }), ...(c && { headers: { Cookie: c } }) });
      ok((await G('POST', '', { voter: 'alumno-123456', name: 'Lucía', of: 2, graded: 1 })).status === 200 && (await G('POST', '', { voter: 'alumno-123456', slide: 2, score: { id: 'q1', s: 0.5 } })).status === 200, 'a su ritmo: cada uno cuenta por dónde va (con el enlace)');
      ok((await G('POST', '', { voter: 'x', slide: 1 })).status === 400, 'a su ritmo: alumnos raros, no');
      ok((await G('GET')).status === 401 && (await G('GET', '', null, teo)).status === 403, 'a su ritmo: el panel, solo para quien edita');
      j = await (await G('GET', '', null, ana)).json(); const lu = j.people?.[0];
      ok(lu && lu.name === 'Lucía' && lu.slide === 2 && lu.of === 2 && lu.graded === 1 && lu.scores.q1 === 0.5, 'a su ritmo: el panel lo ve todo: ' + JSON.stringify(j));
      ok((await G('POST', '/clear', {}, teo)).status === 403 && (await G('POST', '/clear', {}, ana)).status === 200 && !(await (await G('GET', '', null, ana)).json()).people.length, 'a su ritmo: otra clase, desde cero');
    }
    await share(ana, { link: 'view', noCopy: false, editorsShare: false });
    await env.ACCOUNTS.get('u:444').fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: 'pro', until: Date.now() - 1000 }) });   // (Eva, free again)
  }
  // Statistics (the owner, Pro)
  const view = (slide, ms, enter) => req('POST', `/api/docs/${id}/view`, { body: { visitor: 'visitante-123', slide, ms, enter } });
  await view('s1', 0, true); await view('s1', 12000); await view('s2', 0, true); await view('s2', 5000);
  j = await (await get(ana, '/stats')).json(); ok(j.visitors === 1 && j.slides[0].views === 1 && j.slides[0].ms === 12000 && j.slides[1].ms === 5000, 'estadísticas: vistas y tiempo por diapositiva');
  ok((await get(eva, '/stats')).status === 402 || (await get(eva, '/stats')).status === 403, 'estadísticas: solo la dueña');
  ok(!JSON.stringify(env.DOCS.inst.get('doc:' + id).ctx.storage.m.get('stats')).includes('@'), 'estadísticas: sin correos ni datos de quien la ve');
  // Tracked links (the owner, Pro): one per recipient — it opens the deck even when not shared by link —, its email
  // asked first when so set, who opened it and how far; its owner told by email.
  {
    const T = (c, b) => req('POST', `/api/docs/${id}/track`, { headers: c ? { Cookie: c } : {}, body: b });
    await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: ana }, body: { link: 'none' } });
    ok((await get(null)).status === 401, 'seguimiento: sin compartir por enlace, la presentación no es pública');
    const st0 = [(await T(null, { add: { label: 'x' } })).status, (await T(eva, { add: { label: 'x' } })).status];
    ok([401, 402].includes(st0[0]) && [402, 403].includes(st0[1]), 'seguimiento: solo la dueña (Pro) crea enlaces: ' + st0);
    let r = await (await T(ana, { add: { label: 'Ana · Acme' } })).json(); const tk = r.token;
    ok(/^[\w-]{16}$/.test(tk) && r.track[0].label === 'Ana · Acme', 'seguimiento: un enlace con su destinatario');
    const gate = await (await T(ana, { add: { label: '', ask: true } })).json(), tk2 = gate.token;
    const open = (t, q = '') => req('GET', `/api/docs/${id}?r=${t}${q}`);
    j = await (await open(tk)).json();
    ok(j.role === 'present' && j.deck?.slides.length >= 1 && !JSON.stringify(j).includes('NOTA-SECRETA'), 'seguimiento: el enlace la abre presentada (sin notas) aunque no sea pública: ' + JSON.stringify(j).slice(0, 200));
    ok((await open('noexiste12345678')).status === 401, 'seguimiento: un enlace inventado, no');
    j = await (await open(tk2)).json(); ok(j.ask === true && !j.deck, 'seguimiento: el que pide correo no da la presentación sin él');
    ok((await (await open(tk2, '&e=no-es-correo')).json()).ask === true, 'seguimiento: ni con un correo que no lo es');
    j = await (await open(tk2, '&e=Leo@Cliente.com&n=Leo')).json(); ok(j.deck && j.role === 'present', 'seguimiento: con su correo, sí');
    const tv = (slide, ms, enter) => req('POST', `/api/docs/${id}/view`, { body: { visitor: 'visitante-777', slide, ms, enter, r: tk } });
    await tv('s1', 0, true); await tv('s1', 8000); await tv('s2', 0, true); await tv('s2', 3000);
    const n0 = sent.length;
    await T(ana, { notify: true }); await open(tk); await open(tk);
    const told = sent.slice(n0).filter(m => /ha abierto|opened|ha obert/.test(m.subject));
    ok(told.length === 1 && /Ana · Acme/.test(told[0].subject) && /unsubscribe/.test(told[0].text), 'seguimiento: aviso por correo a la dueña al abrirlo (uno, no uno por apertura; con cómo dejar de recibirlos): ' + told.map(m => m.subject));
    j = await (await get(ana, '/stats')).json(); const a1 = j.track.find(x => x.token === tk), a2 = j.track.find(x => x.token === tk2);
    ok(a1.opens === 3 && a1.ms === 11000 && a1.reached === 2 && j.of === 2 && j.notify === true, 'seguimiento: aperturas, tiempo y hasta dónde llegó: ' + JSON.stringify(a1));
    ok(a2.opens === 1 && a2.people[0].email === 'leo@cliente.com' && a2.people[0].name === 'Leo' && a2.ask, 'seguimiento: el correo y el nombre de quien lo abrió');
    const before = (await (await get(ana, '/stats')).json()).visitors; await open(tk);
    await req('GET', `/api/docs/${id}?r=${tk}`, { headers: { Cookie: ana } });
    ok((await (await get(ana, '/stats')).json()).track.find(x => x.token === tk).opens === 4, 'seguimiento: la dueña probando su enlace no cuenta');
    void before;
    r = await (await T(ana, { del: tk })).json(); ok(!r.track.some(x => x.token === tk), 'seguimiento: quitarlo');
    ok((await open(tk)).status === 401, 'seguimiento: y deja de abrirla');
  }
  // Deleting
  ok((await req('POST', `/api/docs/${id}/delete`, { headers: { Cookie: ana } })).status === 200 && (await get(ana)).status === 404, 'nube: la dueña la borra');
  ok(!(await (await req('GET', '/api/docs', { headers: { Cookie: eva } })).json()).shared.length, 'nube: y desaparece de «compartido conmigo»');
}

// ---- Video calls (Pro, Cloudflare Realtime) ----
{
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok, terms: TERMS } }));
  const pa = await login('tok-ana'), pl = await login('tok-luis');
  const { id: doc } = await (await req('POST', '/api/docs', { headers: { Cookie: pa }, body: { deck: { name: 'Llamada', slides: [{ id: 's', blocks: [] }] } } })).json();
  const C = (c, path, body) => req('POST', '/api/call' + path, { headers: { Cookie: c }, body: { doc, ...body } });
  ok((await C(pa, '/session')).status === 503, 'llamadas: sin la app de Realtime, no disponibles');
  env.CALLS_APP_ID = 'app123'; env.CALLS_APP_SECRET = 'rt-secreto';
  await env.ACCOUNTS.get('u:111').fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: 'pro', until: Date.now() + 864e5 }) });
  await env.ACCOUNTS.get('u:222').fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: 'pro', until: Date.now() + 864e5 }) });
  ok((await C(pl, '/session')).status === 403, 'llamadas: solo quien puede abrir la presentación');
  let r = await C(pa, '/session'); const s1 = (await r.json()).sessionId;
  ok(r.status === 200 && s1 && rtCalls.at(-1).auth === 'Bearer rt-secreto' && /\/apps\/app123\/sessions\/new$/.test(rtCalls.at(-1).u), 'llamadas: sesión de Realtime con la clave del servidor');
  r = await C(pa, '/tracks', { sessionId: s1, tracks: [{ location: 'local', mid: '0', trackName: 'audio' }], sessionDescription: { type: 'offer', sdp: 'v=0 x' } });
  ok(r.status === 200 && (await r.json()).sessionDescription.type === 'answer' && rtCalls.at(-1).body.tracks[0].trackName === 'audio', 'llamadas: publicar audio y vídeo');
  ok(!JSON.stringify(await (await C(pa, '/room', { pid: 'pid-ana1', name: 'Ana', sessionId: s1, tracks: ['audio', 'video'] })).json()).includes('rt-secreto'), 'llamadas: entrar en la sala (sin la clave)');
  await req('POST', `/api/docs/${doc}/share`, { headers: { Cookie: pa }, body: { people: { 'luis@example.com': 'view' } } });
  const s2 = (await (await C(pl, '/session')).json()).sessionId;
  j = await (await C(pl, '/room', { pid: 'pid-luis1', name: 'Luis', sessionId: s2, tracks: ['audio'] })).json();
  ok(j.people.length === 2 && j.people.find(p => p.pid === 'pid-ana1').sessionId === s1, 'llamadas: cada uno ve quién está (y qué emite)');
  ok((await C(pl, '/tracks', { sessionId: s1, tracks: [{ location: 'local', trackName: 'x' }] })).status === 403, 'llamadas: nadie usa la sesión de otro');
  ok((await C(pl, '/room', { pid: 'pid-luis1', sessionId: s1 })).status === 403, 'llamadas: ni la anuncia como suya');
  ok((await C(pl, '/tracks', { sessionId: s2, tracks: [{ location: 'remote', sessionId: 'sess-de-otra-llamada', trackName: 'audio' }] })).status === 400, 'llamadas: solo se reciben pistas de esta llamada');
  ok((await C(pl, '/tracks', { sessionId: s2, tracks: [{ location: 'remote', sessionId: s1, trackName: 'audio' }] })).status === 200, 'llamadas: recibir las de los demás');
  ok((await C(pl, '/renegotiate', { sessionId: s2, sessionDescription: { type: 'answer', sdp: 'v=0 y' } })).status === 200 && rtCalls.at(-1).method === 'PUT', 'llamadas: renegociar');
  j = await (await C(pl, '/room', { pid: 'pid-luis1', leave: true })).json(); ok(j.people.length === 1, 'llamadas: salir');
  const eva = await login('tok-eva');
  await req('POST', `/api/docs/${doc}/share`, { headers: { Cookie: pa }, body: { people: { 'luis@example.com': 'view', 'eva@example.com': 'view' } } });
  ok((await C(eva, '/session')).status === 402, 'llamadas: son del plan Pro');
  delete env.CALLS_APP_ID; delete env.CALLS_APP_SECRET;
}

// ---- Teams: seats, invitations, Pro for members, brand kit and templates ----
{
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok, terms: TERMS } }));
  const rosa = await login('tok-rosa'), pepe = await login('tok-pepe');
  const T = (c, path, body) => req(body === undefined ? 'GET' : 'POST', '/api/team' + path, { headers: { Cookie: c }, body });
  let r = await T(rosa, '', { name: 'IES Ejemplo' }); const { id } = await r.json();
  ok(r.status === 200 && id, 'equipo: crear');
  j = await (await T(rosa, '')).json(); ok(j.role === 'admin' && j.team.name === 'IES Ejemplo' && !j.team.active, 'equipo: soy su administradora (aún sin pagar)');
  ok((await T(rosa, '/invite', { email: 'pepe@escuela.example' })).status === 402, 'equipo: invitar necesita puestos (1 = la administradora)');
  ok((await T(pepe, '/invite', { email: 'x@y.org' })).status === 404, 'equipo: quien no es del equipo no invita');
  // Paying 3 seats (the admin), signed by Stripe
  r = await req('POST', '/api/billing/checkout', { headers: { Cookie: rosa }, body: { product: 'team-seat', seats: 3 } });
  ok(r.status === 200 && /line_items%5B0%5D%5Bquantity%5D=3/.test(stripeCalls.at(-1).body) && new RegExp('metadata%5Bteam%5D=' + id).test(stripeCalls.at(-1).body), 'equipo: pago de 3 puestos, ligado al equipo');
  ok((await req('POST', '/api/billing/checkout', { headers: { Cookie: pepe }, body: { product: 'team-seat', seats: 3 } })).status === 400, 'equipo: sin equipo no se pagan puestos');
  await req('POST', '/api/billing/checkout', { headers: { Cookie: rosa }, body: { product: 'team-seat', seats: 1 } });
  ok(/line_items%5B0%5D%5Bquantity%5D=3/.test(stripeCalls.at(-1).body), 'equipo: tres puestos como mínimo');
  ok(/custom_text%5Bsubmit%5D%5Bmessage%5D=.*desistimiento/.test(stripeCalls.at(-1).body), 'pago: aviso de la renuncia al desistimiento junto al botón');
  await hook({ id: 'evt_team1', type: 'invoice.paid', data: { object: { customer: 'cus_team', lines: { data: [{ quantity: 3, period: { end: Math.floor(Date.now() / 1000) + 30 * 86400 } }] }, parent: { subscription_details: { metadata: { team: id } } } } } });
  j = await (await T(rosa, '')).json(); ok(j.team.active && j.team.seats === 3, 'equipo: pagado, con 3 puestos');
  ok((await (await req('GET', '/api/me', { headers: { Cookie: rosa } })).json()).plan === 'pro', 'equipo: sus miembros tienen Pro');
  // Invite, accept
  ok((await T(rosa, '/invite', { email: 'pepe@escuela.example' })).status === 200, 'equipo: invitar');
  j = await (await T(pepe, '')).json(); ok(!j.team && j.invites[0]?.id === id && j.invites[0].name === 'IES Ejemplo', 'equipo: la invitación le llega');
  ok((await T(await login('tok-eva'), '/accept', { id })).status === 403, 'equipo: una invitación ajena no se puede aceptar');
  ok((await T(pepe, '/accept', { id })).status === 200, 'equipo: aceptar');
  me = await (await req('GET', '/api/me', { headers: { Cookie: pepe } })).json();
  ok(me.plan === 'pro' && me.team.name === 'IES Ejemplo' && me.team.role === 'member' && me.features.includes('share-people'), 'equipo: al entrar, Pro');
  ok((await T(pepe, '/invite', { email: 'otro@escuela.example' })).status === 403, 'equipo: un miembro no invita');
  // Brand kit and templates
  ok((await T(pepe, '/brand', { brand: { colors: ['#123456'] } })).status === 403, 'equipo: solo administración cambia la marca');
  await T(rosa, '/brand', { brand: { colors: ['#123456'], fonts: ['Inter'] } });
  r = await T(rosa, '/template', { name: 'Plantilla del centro', deck: { name: 'x', slides: [{ id: 's', blocks: [{ id: 'logo', type: 'image', locked: true }] }] } }); const tid = (await r.json()).id;
  j = await (await T(pepe, '')).json(); ok(j.team.brand.colors[0] === '#123456' && j.team.templates[0].name === 'Plantilla del centro', 'equipo: marca y plantillas para todos');
  j = await (await T(pepe, '/template?id=' + tid)).json(); ok(j.deck.slides[0].blocks[0].locked, 'equipo: usar una plantilla (con su logo bloqueado)');
  ok((await T(pepe, '/template/delete', { id: tid })).status === 403, 'equipo: un miembro no borra plantillas');
  // Credits for each member each month
  const before = (await (await req('GET', '/api/me', { headers: { Cookie: pepe } })).json()).credits;
  const pepeStore = [...env.ACCOUNTS.inst.values()].find(a => a.ctx.storage.m.get('profile')?.email === 'pepe@escuela.example').ctx.storage.m;
  pepeStore.set('monthly', Date.now() - 31 * 86400e3);                    // (a month later)
  await hook({ id: 'evt_team2', type: 'invoice.paid', data: { object: { customer: 'cus_team', lines: { data: [{ quantity: 3, period: { end: Math.floor(Date.now() / 1000) + 60 * 86400 } }] }, parent: { subscription_details: { metadata: { team: id } } } } } });
  ok((await (await req('GET', '/api/me', { headers: { Cookie: pepe } })).json()).credits === before + 1000, 'equipo: créditos del mes para cada miembro');
  // The team's use, for its admins: each person's last use, AI credits spent, space; billing for any admin.
  {
    pepeStore.set('ledger', [...(pepeStore.get('ledger') || []), { at: Date.now() - 1000, delta: -40, reason: 'ai', balance: 0 }, { at: Date.now() - 900, delta: -12, reason: 'image', balance: 0 },
      { at: Date.now() - 800, delta: 12, reason: 'admin', ref: 'refund:x', balance: 0 }, { at: Date.now() - 40 * 86400e3, delta: -500, reason: 'ai', balance: 0 }]);
    await req('POST', '/api/docs', { headers: { Cookie: pepe }, body: { deck: { name: 'De Pepe', slides: [{ id: 's1', blocks: [] }] } } });
    ok((await T(pepe, '/usage')).status === 403, 'uso del equipo: solo para su administración');
    j = await (await T(rosa, '/usage')).json();
    const p = j.members.find(m => m.email === 'pepe@escuela.example'), ro = j.members.find(m => m.email === 'rosa@escuela.example');
    ok(j.seats === 3 && j.used === 2 && p && ro && p.role === 'member' && ro.role === 'admin', 'uso del equipo: plazas y personas: ' + JSON.stringify({ seats: j.seats, used: j.used }));
    ok(p.spentMonth === 40 && p.spent30 === 40 && p.lastSeen && p.storage.used > 0 && p.docs === 1, 'uso del equipo: créditos de IA gastados (descontando devoluciones) y espacio: ' + JSON.stringify(p));
    ok(j.totals.spentMonth === 40 + (ro.spentMonth || 0) && j.totals.storage >= p.storage.used, 'uso del equipo: totales');
    ok(!JSON.stringify(j).includes('De Pepe'), 'uso del equipo: nada de lo que dicen sus presentaciones');
    // Another admin, who didn't pay: the team's invoices all the same.
    const eva = await login('tok-eva');
    await T(rosa, '/invite', { email: 'eva@example.com', role: 'admin' }); await T(eva, '/accept', { id });
    r = await req('POST', '/api/billing/portal', { headers: { Cookie: eva } });
    ok(r.status === 200 && /customer=cus_team/.test(stripeCalls.at(-1).body), 'equipo: otra administradora abre el portal del equipo');
    ok((await req('POST', '/api/billing/portal', { headers: { Cookie: pepe } })).status === 404, 'equipo: un miembro, no');
    await T(rosa, '/remove', { email: 'eva@example.com' });
  }
  // Leaving, the last admin, the end of the subscription
  ok((await T(rosa, '/remove', { email: 'rosa@escuela.example' })).status === 400, 'equipo: la última administradora no puede irse');
  ok((await T(rosa, '/remove', { email: 'pepe@escuela.example' })).status === 200, 'equipo: quitar a alguien');
  ok((await (await req('GET', '/api/me', { headers: { Cookie: pepe } })).json()).plan === 'free', 'equipo: fuera del equipo, sin Pro');
  await hook({ id: 'evt_team3', type: 'customer.subscription.deleted', data: { object: { metadata: { team: id } } } });
  ok((await (await req('GET', '/api/me', { headers: { Cookie: rosa } })).json()).plan === 'free', 'equipo: sin pagar, sin Pro');
}

// ---- Your data: export and delete (GDPR) ----
{
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok, terms: TERMS } }));
  const lu = await login('tok-luis'), ev = await login('tok-eva');
  const deck = { name: 'De Luis', slides: [{ id: 's1', blocks: [], comments: [] }] };
  const { id } = await (await req('POST', '/api/docs', { headers: { Cookie: lu }, body: { deck } })).json();
  await env.ACCOUNTS.get('u:222').fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: 'pro', until: Date.now() + 864e5, customer: 'cus_luis' }) });
  await req('POST', `/api/docs/${id}/share`, { headers: { Cookie: lu }, body: { people: { 'eva@example.com': 'view' } } });
  let r = await req('GET', '/api/account/export', { headers: { Cookie: lu } }), d = await r.json();
  ok(r.status === 200 && d.account.email === 'luis@example.com' && d.documents.some(x => x.id === id && x.deck.name === 'De Luis') && Array.isArray(d.ledger), 'mis datos: todo en un archivo (cuenta, movimientos, presentaciones)');
  ok(!JSON.stringify(d).includes('"secret"') && !/rv_session/.test(JSON.stringify(d)), 'mis datos: sin secretos de sesión');
  ok((await req('POST', '/api/account/delete', { headers: { Cookie: lu }, body: { confirm: 'otro@example.com' } })).status === 400, 'borrar: hay que escribir el propio correo');
  ok((await req('POST', '/api/account/delete', { origin: 'tauri://localhost', headers: { Authorization: 'Bearer ' + lu.split('=')[1] }, body: { confirm: 'luis@example.com' } })).status === 403, 'borrar: solo desde la web');
  r = await req('POST', '/api/account/delete', { headers: { Cookie: lu }, body: { confirm: 'Luis@Example.com' } });
  ok(r.status === 200 && /Max-Age=0/.test(r.headers.get('Set-Cookie') || ''), 'borrar la cuenta');
  ok((await req('GET', '/api/me', { headers: { Cookie: lu } })).status === 401, 'borrada: la sesión ya no vale');
  ok((await req('GET', `/api/docs/${id}`, { headers: { Cookie: ev } })).status === 404, 'borrada: sus presentaciones también');
  ok(!(await (await req('GET', '/api/docs', { headers: { Cookie: ev } })).json()).shared.some(x => x.id === id), 'y desaparecen de «compartido conmigo» de los demás');
  ok(stripeCalls.some(c => /subscriptions\?customer=cus_luis/.test(c.u)), 'y se cancela su suscripción de Stripe');
  const bye = sent.filter(m => m.to === 'luis@example.com' && /se ha eliminado/.test(m.subject));
  ok(bye.length === 1 && /como pediste/.test(bye[0].text) && !bye[0].headers, 'correo de confirmación al eliminarla (sin baja: es del servicio)');
}

// ---- Credits that expire: the gift in 3 months, a pack in a year, each month of Pro that month and the next ----
{
  const mar = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-mar', terms: TERMS } })), M = acc('777').ctx.storage.m, DAYms = 86400e3;
  const me = async () => (await req('GET', '/api/me', { headers: { Cookie: mar } })).json();
  let j = await me();
  ok(j.credits === 50 && Math.abs(j.expiring[0].exp - (Date.now() + 90 * DAYms)) < 60e3, 'el regalo: 50 créditos que caducan a los 3 meses');
  await hook({ id: 'evt_mar_pack', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', client_reference_id: '777', metadata: { sub: '777', product: 'credits-500' } } } });
  j = await me(); ok(j.credits === 550 && j.expiring.some(l => l.n === 500 && Math.abs(l.exp - (Date.now() + 365 * DAYms)) < 60e3), 'un paquete: caduca al año');
  // Spending goes first to what expires first (the gift).
  M.set('lots', [{ n: 50, exp: Date.now() + 10 * DAYms }, { n: 500, exp: Date.now() + 300 * DAYms }]);
  aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'ok' } }], usage: { cost: 0.06 } } });     // (30 credits)
  await req('POST', '/api/ai/chat', { headers: { Cookie: mar }, body: { max_tokens: 50, messages: [{ role: 'user', content: 'x' }] } });
  ok(JSON.stringify(M.get('lots').map(l => l.n)) === '[20,500]', 'se gasta primero lo que caduca antes: ' + JSON.stringify(M.get('lots')));
  // What expires goes, and says so in the movements.
  M.set('lots', [{ n: 20, exp: Date.now() - 1000 }, { n: 500, exp: Date.now() + 300 * DAYms }]);
  j = await me(); ok(j.credits === 500 && M.get('ledger').at(-1).reason === 'expired' && M.get('ledger').at(-1).delta === -20, 'lo caducado se va (y queda anotado)');
  // A yearly Pro: its credits every month, not once a year; each month's last that month and the next.
  await hook({ id: 'evt_mar_year', type: 'invoice.paid', data: { object: { customer: 'cus_mar', subscription_details: { metadata: { sub: '777' } }, lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 365 * 86400 } }] } } } });
  j = await me(); ok(j.plan === 'pro' && j.credits === 1500, 'Pro anual: el primer mes, 1000');
  j = await me(); ok(j.credits === 1500, 'y no otra vez hasta el mes siguiente');
  M.set('monthly', Date.now() - 31 * DAYms); j = await me();
  ok(j.credits === 2500, 'al mes siguiente, otros 1000 (aunque el pago sea anual)');
  const months = M.get('lots').filter(l => Math.abs(l.exp - Date.now() - 60 * DAYms) < 60e3);
  ok(months.reduce((t, l) => t + l.n, 0) === 2000, 'cada mes vale ese mes y el siguiente: ' + JSON.stringify(M.get('lots')));
  // Two months later, the first month's are gone: at most two months together.
  M.set('lots', [{ n: 1000, exp: Date.now() - 1 }, { n: 1000, exp: Date.now() + 29 * DAYms }, { n: 500, exp: Date.now() + 300 * DAYms }]); M.set('monthly', Date.now() - 31 * DAYms);
  j = await me(); ok(j.credits === 2500 && M.get('lots').filter(l => l.exp < Date.now() + 61 * DAYms).reduce((t, l) => t + l.n, 0) === 2000, 'nunca más de dos meses juntos');
  // A charge beyond the balance is a debt, paid by the next credits.
  M.set('lots', [{ n: 5, exp: Date.now() + DAYms }]); M.set('debt', 0); M.set('monthly', Date.now());
  aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'ok' } }], usage: { cost: 0.02 } } });     // (10 credits; 5 held, 10 real)
  env.AI_PRICES = '{"openai/gpt-4o-mini":[0.001,0.001]}';
  await req('POST', '/api/ai/chat', { headers: { Cookie: mar }, body: { max_tokens: 50, messages: [{ role: 'user', content: 'x' }] } });
  ok(M.get('credits') === -5 && M.get('debt') === 5, 'lo que costó de más queda como deuda: ' + M.get('credits'));
  M.set('monthly', Date.now() - 31 * DAYms); j = await me(); ok(j.credits === 995, 'y lo paga el siguiente ingreso');
  env.AI_PRICES = '{"openai/gpt-4o-mini":[0.15,0.6]}';
}

// ---- Read-only beyond the plan (after leaving Pro): nothing deleted, only the N most recent editable ----
const login2 = async (tok, extra = {}) => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok, terms: TERMS, ...extra } }));
const sol = await login2('tok-sol'), teo = await login2('tok-teo', { lang: 'en' });
const setPlan = (sub, until) => env.ACCOUNTS.get('u:' + sub).fetch('https://do/setplan', { method: 'POST', body: JSON.stringify({ name: until ? 'pro' : 'free', until }) });
const ids = [];
{
  await setPlan('888', Date.now() + 30 * 864e5);
  for (let i = 1; i <= 5; i++) ids.push((await (await req('POST', '/api/docs', { headers: { Cookie: sol }, body: { deck: { name: 'Doc ' + i, slides: [{ id: 's', blocks: [], comments: [] }] } } })).json()).id);
  const S = acc('888').ctx.storage.m; S.set('docs', S.get('docs').map(d => ({ ...d, updated: Date.now() - 1000 * (10 - +d.name.slice(4)) })));   // (Doc 5 the latest)
  sent = [];
  ok((await req('POST', `/api/docs/${ids[0]}/share`, { headers: { Cookie: sol }, body: { people: { 'teo@example.com': 'edit' } } })).status === 200, 'solo lectura: con Pro, comparte con edición');
  // Correo al compartir: con el nombre de quien comparte, el enlace, en el idioma de quien lo recibe, sin baja.
  const m = sent.find(x => x.to === 'teo@example.com');
  ok(m && /Sol García \(sol@example\.com\) shared “Doc 1” with you/.test(m.subject) && m.html.includes(`https://revelaslides.com/app/?doc=${ids[0]}`) && m.text.includes(`/app/?doc=${ids[0]}`), 'correo al compartir: quién, cuál y el enlace (en inglés): ' + m?.subject);
  ok(m.from.email === 'avisos@revelaslides.com' && m.from.name === 'Revela' && !m.headers && /a project by FM Lab/.test(m.text) && !/<García>/.test(m.html), 'remitente de Revela, pie, sin baja (es del servicio) y sin HTML de nadie');
  ok(/#2f5a8f/.test(m.html) && /Georgia/.test(m.html) && /#faf8f4/.test(m.html), 'plantilla sobria: papel, serif y un solo acento');
  sent = [];
  await req('POST', `/api/docs/${ids[0]}/share`, { headers: { Cookie: sol }, body: { people: { 'teo@example.com': 'edit' }, link: 'view' } });
  ok(!sent.length, 'cambiar otra cosa no vuelve a avisar');
  await setPlan('888', 0);                                                       // (back to free: 3)
  let j = await (await req('GET', '/api/docs', { headers: { Cookie: sol } })).json();
  const ro = j.mine.filter(d => d.readOnly).map(d => d.name).sort();
  ok(j.limit === 3 && j.mine.length === 5 && ro.join() === 'Doc 1,Doc 2', 'al dejar Pro no se borra nada: las 2 menos recientes, en solo lectura: ' + JSON.stringify(ro));
  ok((await (await req('GET', '/api/me', { headers: { Cookie: sol } })).json()).docs.readOnly === 2, '/api/me dice cuántas');
  j = await (await req('GET', `/api/docs/${ids[0]}`, { headers: { Cookie: sol } })).json();
  ok(j.deck && j.readOnly === true && j.reason === 'over limit' && j.limit === 3, 'se puede abrir, y dice que está en solo lectura por el límite');
  ok((await (await req('GET', `/api/docs/${ids[4]}`, { headers: { Cookie: sol } })).json()).readOnly === undefined, 'las recientes no');
  const edit = (c, id) => req('POST', `/api/docs/${id}/ops`, { headers: { Cookie: c }, body: { ops: [{ p: ['name'], v: 'Cambio' }] } });
  let r = await edit(sol, ids[0]); j = await r.json();
  ok(r.status === 402 && j.error === 'read only' && j.reason === 'over limit' && j.limit === 3, 'la dueña no puede cambiarla: 402 read only');
  ok((await edit(teo, ids[0])).status === 402, 'ni quien tiene permiso de edición compartido');
  ok((await req('POST', `/api/docs/${ids[0]}/ops`, { headers: { Cookie: teo }, body: { ops: [{ p: ['slides', 's', 'comments', 'c1'], v: { id: 'c1', text: 'x', replies: [] } }] } })).status === 402, 'ni comentarios: solo lectura para todos');
  ok((await (await req('GET', `/api/docs/${ids[0]}`, { headers: { Cookie: teo } })).json()).readOnly === true, 'quien la tiene compartida también lo ve');
  ok((await edit(sol, ids[4])).status === 200, 'las 3 más recientes se editan');
  ok((await req('POST', `/api/docs/${ids[0]}/share`, { headers: { Cookie: sol }, body: { link: 'view' } })).status === 200, 'compartir para ver, sí');
  ok((await req('POST', '/api/docs', { headers: { Cookie: sol }, body: { deck: { name: 'x', slides: [] } } })).status === 402, 'crear otra, no');
  ok((await req('POST', `/api/docs/${ids[2]}/delete`, { headers: { Cookie: sol } })).status === 200, 'borrar, sí');
  ok((await edit(sol, ids[1])).status === 200 && (await edit(sol, ids[0])).status === 402, 'al borrar una, la siguiente más reciente se desbloquea');
  await setPlan('888', Date.now() + 30 * 864e5);
  ok((await edit(teo, ids[0])).status === 200, 'al volver a Pro, todas editables');
}

// ---- Emails: team invitation, the end of Pro, credits that expire, unsubscribing ----
const realNow = Date.now, at = ts => { Date.now = () => ts; }, DAYms = 864e5;
const runCron = async ts => { const w = []; await worker.scheduled({ scheduledTime: ts }, env, { waitUntil: p => w.push(p) }); await Promise.all(w); };
{
  // Team invitation
  const ines = await login2('tok-ines', { lang: 'ca' }); sent = [];
  const { id: team } = await (await req('POST', '/api/team', { headers: { Cookie: sol }, body: { name: 'Taller <b>' } })).json();
  await env.TEAMS.get('team:' + team).fetch('https://team/billing', { method: 'POST', body: JSON.stringify({ seats: 5, until: Date.now() + 1000 * 864e5 }) });
  ok((await req('POST', '/api/team/invite', { headers: { Cookie: sol }, body: { email: 'ines@example.com' } })).status === 200, 'invitar a un equipo');
  let m = sent.find(x => x.to === 'ines@example.com');
  ok(m && /Et conviden a l’equip «Taller <b>»/.test(m.subject) && m.html.includes('Taller &lt;b&gt;') && !m.headers, 'correo de invitación (en catalán, sin HTML colado, sin baja): ' + m?.subject);
  ok((await req('POST', '/api/team/accept', { headers: { Cookie: ines }, body: { id: team } })).status === 200, 'y acepta (Pro por el equipo)');
  // The end of Pro: Stripe says it was cancelled (ends at the end of the period)
  sent = [];
  const end = Math.floor(Date.now() / 1000) + 20 * 86400;
  const upd = (id, cancel, e = end) => hook({ id, type: 'customer.subscription.updated', data: { object: { id: 'sub_sol', cancel_at_period_end: cancel, current_period_end: e, metadata: { sub: '888' } } } });
  await upd('evt_sol_c1', true);
  m = sent.find(x => x.to === 'sol@example.com');
  ok(m && /Tu plan Pro termina el/.test(m.subject) && /las otras 1 quedarán en solo lectura/.test(m.text) && /No se borra nada/.test(m.text) && /créditos se conservan/.test(m.text) && !m.headers, 'aviso de fin de Pro: qué pasa (solo lectura, créditos que se conservan): ' + m?.text);
  await upd('evt_sol_c2', true); ok(sent.filter(x => x.to === 'sol@example.com').length === 1, 'el mismo aviso, una sola vez');
  // A week before the end: the reminder (the daily run, with the date simulated)
  sent = []; at(end * 1000 - 7 * DAYms + 3600e3); await runCron(Date.now());
  ok(sent.filter(x => x.to === 'sol@example.com' && /termina/.test(x.subject)).length === 1, 'y otro unos 7 días antes del fin');
  await runCron(Date.now()); ok(sent.filter(x => x.to === 'sol@example.com').length === 1, 'el cron repetido no lo repite');
  Date.now = realNow;
  // Cancelled and then renewed: no reminder
  const end2 = end + 30 * 86400; await upd('evt_sol_c3', true, end2); await upd('evt_sol_c4', false, end2); sent = [];
  at(end2 * 1000 - 7 * DAYms + 3600e3); await runCron(Date.now()); Date.now = realNow;
  ok(!sent.some(x => x.to === 'sol@example.com' && /termina/.test(x.subject)), 'si se renueva, no hay recordatorio');
  // It ended
  sent = [];
  await hook({ id: 'evt_sol_d', type: 'customer.subscription.deleted', data: { object: { id: 'sub_sol', metadata: { sub: '888' } } } });
  await hook({ id: 'evt_sol_d2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_sol', metadata: { sub: '888' } } } });
  ok(sent.filter(x => x.to === 'sol@example.com' && /ha terminado/.test(x.subject)).length === 1, 'aviso de que Pro ha terminado (una vez)');
  // Credits that expire in 7 days: the welcome gift (90 days); optional, so with the link to stop them
  const S = acc('888').ctx.storage.m, gift = S.get('lots').find(l => l.n === 50);
  ok(gift && env.SCHEDULE.inst.get('global').ctx.storage.m.get('days').length > 0, 'las cuentas anotan en Schedule qué mirar y cuándo');
  sent = []; at(gift.exp - 6 * DAYms); await runCron(Date.now()); Date.now = realNow;
  m = sent.find(x => x.to === 'sol@example.com' && /caducan/.test(x.subject));
  ok(m && /^50 créditos caducan el/.test(m.subject), 'aviso de créditos que caducan: ' + m?.subject);
  ok(m.headers?.['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click' && /\/api\/mail\/unsubscribe\?t=/.test(m.headers['List-Unsubscribe']) && /No quiero más avisos/.test(m.html), 'con enlace para darse de baja (y cabecera List-Unsubscribe)');
  at(gift.exp - 5 * DAYms); await runCron(Date.now()); Date.now = realNow;
  ok(sent.filter(x => x.to === 'sol@example.com' && /caducan/.test(x.subject)).length === 1 && sent.filter(x => x.to === 'eva@example.com').length === 1, 'uno por lote, sin repetir');
  const link = m.headers['List-Unsubscribe'].slice(1, -1), t = new URL(link).searchParams.get('t');
  ok((await req('GET', '/api/mail/unsubscribe?t=' + t.slice(0, -2) + 'xx', { origin: null })).status === 400, 'baja: un enlace falsificado no vale');
  const forged = Buffer.from('111').toString('base64url') + '.' + t.split('.').slice(1).join('.');
  ok((await req('GET', '/api/mail/unsubscribe?t=' + forged, { origin: null })).status === 400, 'ni el de otra cuenta');
  r = await req('GET', '/api/mail/unsubscribe?t=' + t, { origin: null });
  ok(r.status === 200 && /text\/html/.test(r.headers.get('Content-Type')) && /ya no recibirás avisos/.test(await r.text()) && S.get('mailOff').includes('credits'), 'baja: página sencilla y queda marcado en la cuenta');
  ok((await worker.fetch(new Request(SITE + '/api/mail/unsubscribe?t=' + t, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), env)).status === 200, 'baja con un clic (POST del programa de correo)');
  await acc('888').fetch(new Request('https://do/grant', { method: 'POST', body: JSON.stringify({ credits: 10, ref: 'x1', days: 9 }) }));
  sent = []; at(Date.now() + 3 * DAYms); await runCron(Date.now()); Date.now = realNow;
  ok(!sent.some(x => x.to === 'sol@example.com' && /caducan/.test(x.subject)), 'tras la baja, ya no llegan esos avisos');
  // «Send me a test email» from My account: only to my own address, once an hour; and the optional notices' switch
  sent = []; r = await req('POST', '/api/mail/test', { headers: { Cookie: sol } });
  ok(r.status === 200 && sent.length === 1 && sent[0].to === 'sol@example.com' && /funcionan/.test(sent[0].subject), 'correo de prueba a mi dirección');
  ok((await req('POST', '/api/mail/test', { headers: { Cookie: sol } })).status === 429 && sent.length === 1, 'como mucho uno por hora');
  ok((await req('POST', '/api/mail/test')).status === 401, 'sin sesión, nada');
  j = await (await req('GET', '/api/mail/prefs', { headers: { Cookie: sol } })).json(); ok(j.off.includes('credits') && j.optional.includes('credits'), 'preferencias: la baja de antes');
  j = await (await req('POST', '/api/mail/prefs', { headers: { Cookie: sol }, body: { off: [] } })).json(); ok(!j.off.length, 'volver a recibir los avisos opcionales');
  j = await (await req('POST', '/api/mail/prefs', { headers: { Cookie: sol }, body: { off: ['credits', 'share'] } })).json(); ok(j.off.join() === 'credits', 'los avisos del servicio no se pueden quitar');
  // Without MAIL_SECRET optional notices aren't sent (no way out); with Resend instead of Email Service
  const { sendMail, mail } = await import('../server/cloudflare/mail.js');
  ok(!(await mail({ EMAIL: env.EMAIL }, { to: 'a@b.c', kind: 'credits', lang: 'es', vars: { n: 1, date: 'x' }, sub: '1' })), 'sin MAIL_SECRET no hay avisos opcionales');
  ok(await sendMail({ RESEND_KEY: 're_secreta', FETCH: env.FETCH }, { to: 'a@b.c', subject: 'Hola', html: '<p>h</p>', text: 'h' }) && resendCalls[0].auth === 'Bearer re_secreta' && resendCalls[0].body.from === 'Revela <avisos@revelaslides.com>' && resendCalls[0].body.to === 'a@b.c', 'con Resend si no hay Email Service');
  ok(!(await sendMail({}, { to: 'a@b.c', subject: 'x', html: '', text: '' })), 'sin ninguno, no se envía');
}

// ---- Logging out; and the share routes under /api ----
ok((await req('POST', '/api/logout', { headers: { Cookie: ana } })).status === 200, 'cerrar sesión');
ok((await req('GET', '/api/me', { headers: { Cookie: ana } })).status === 401, 'la sesión cerrada ya no vale');
ok((await req('GET', '/api/me', { origin: 'tauri://localhost', headers: { Authorization: 'Bearer ' + desk } })).status === 200, 'la de escritorio sigue (cada sesión por separado)');
ok((await req('GET', '/api/s/' + 'x'.repeat(22))).status === 404, 'compartir también en /api/s');

// ---- My open sessions: seeing them (device, place, last use) and closing one or all the others ----
{
  const UA = { win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Gecko/20100101 Firefox/131.0', cros: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' };
  ok(deviceOf(UA.win) === 'Chrome · Windows' && deviceOf(UA.iphone) === 'Safari · iPhone' && deviceOf(UA.edge) === 'Edge · Windows' && deviceOf(UA.android) === 'Chrome · Android'
    && deviceOf(UA.mac) === 'Firefox · macOS' && deviceOf(UA.cros) === 'Chrome · ChromeOS' && deviceOf('') === '', 'sesiones: el dispositivo, en claro');
  const lia = ua => req('POST', '/api/login', { body: { accessToken: 'tok-lia', terms: TERMS }, headers: { 'User-Agent': UA[ua] } }).then(cookieFrom);
  const s1 = await lia('win'), s2 = await lia('iphone');
  const list = async c => (await (await req('GET', '/api/sessions', { headers: { Cookie: c } })).json()).sessions;
  let L = await list(s1);
  ok(L.length === 2 && L.filter(x => x.current).length === 1 && L.find(x => x.current).device === 'Chrome · Windows' && L.some(x => x.device === 'Safari · iPhone')
    && L.every(x => /^[\w-]{16}$/.test(x.id) && x.last && x.expires > Date.now() && x.kind === 'web'), 'sesiones: las dos, y cuál es esta: ' + JSON.stringify(L));
  ok(!JSON.stringify(L).includes(s1.split('=')[1].split('.').pop()), 'sesiones: la lista no deja ver el secreto');
  // (Its last use is noted, at most once an hour.)
  { const m = acc('2323').ctx.storage.m, all = m.get('sessions'); for (const v of Object.values(all)) v.last = Date.now() - 2 * 3600e3; m.set('sessions', all);
    await req('GET', '/api/me', { headers: { Cookie: s2, 'User-Agent': UA.iphone } });
    const last = Object.values(m.get('sessions')).map(v => [v.device, Date.now() - v.last]);
    ok(last.find(x => x[0] === 'Safari · iPhone')[1] < 60e3 && last.find(x => x[0] === 'Chrome · Windows')[1] > 3600e3, 'sesiones: el último uso se anota (solo el de la que se usa): ' + JSON.stringify(last));
    L = await list(s1); }
  let r = await req('POST', '/api/sessions', { headers: { Cookie: s1 }, body: { id: L.find(x => !x.current).id } });
  ok(r.status === 200 && (await r.json()).ended === 1, 'sesiones: cerrar la del móvil');
  ok((await req('GET', '/api/me', { headers: { Cookie: s2 } })).status === 401 && (await req('GET', '/api/me', { headers: { Cookie: s1 } })).status === 200, 'sesiones: la cerrada ya no vale; esta, sí');
  r = await req('POST', '/api/sessions', { headers: { Cookie: s1 }, body: { id: L.find(x => x.current).id } });
  ok((await r.json()).ended === 0 && (await req('GET', '/api/me', { headers: { Cookie: s1 } })).status === 200, 'sesiones: esta no se cierra así (para eso, «Cerrar sesión»)');
  const s3 = await lia('android'), s4 = await lia('edge');
  r = await req('POST', '/api/sessions', { headers: { Cookie: s1 }, body: { others: true } });
  ok((await r.json()).ended === 2 && (await list(s1)).length === 1, 'sesiones: cerrar todas las demás');
  ok((await req('GET', '/api/me', { headers: { Cookie: s3 } })).status === 401 && (await req('GET', '/api/me', { headers: { Cookie: s4 } })).status === 401, 'sesiones: las demás ya no valen');
  ok((await req('POST', '/api/sessions', { headers: { Cookie: s1 }, body: { id: 'corto' } })).status === 400 && (await req('POST', '/api/sessions', { headers: { Cookie: s1 }, body: {} })).status === 400, 'sesiones: petición mala → 400');
  ok((await req('GET', '/api/sessions')).status === 401 && (await req('POST', '/api/sessions', { body: { others: true } })).status === 401, 'sesiones: sin sesión, nada');
  ok((await req('POST', '/api/sessions', { headers: { Cookie: s1 }, body: { others: true }, origin: 'https://malo.example' })).status >= 400, 'sesiones: desde otra web, no');
  const ex = await (await req('GET', '/api/account/export', { headers: { Cookie: s1 } })).json();
  ok(ex.sessions?.[0]?.device === 'Chrome · Windows', 'sesiones: también en «Descargar mis datos»');
}

// ---- Unused accounts: warned 30 and 7 days before; deleted at 24 months (the date simulated) ----
{
  const S = acc('888').ctx.storage.m, T = acc('999').ctx.storage.m, day0 = Date.parse(T.get('lastSeen'));
  await setPlan('444', realNow() + 1000 * DAYms);                                  // (Eva: her own Pro; Inés: her team's)
  const allSent = []; const keep = () => allSent.push(...sent);
  ok(T.get('lastSeen') === new Date(realNow()).toISOString().slice(0, 10), 'cada uso queda anotado (al día)');
  sent = []; at(day0 + 700 * DAYms + 3600e3); await runCron(Date.now());
  let m = sent.find(x => x.to === 'teo@example.com');
  ok(m && /deleted in 30 days/.test(m.subject) && !m.headers, 'a ~23 meses sin usarla: aviso a 30 días (obligatorio, sin baja): ' + m?.subject);
  // Sol comes back meanwhile: no more warnings for her.
  at(day0 + 710 * DAYms); await login2('tok-sol');
  keep(); sent = []; at(day0 + 723 * DAYms + 3600e3); await runCron(Date.now());
  ok(sent.some(x => x.to === 'teo@example.com' && /7 days/.test(x.subject)) && !sent.some(x => x.to === 'sol@example.com' && /eliminará/.test(x.subject)), 'aviso a 7 días; quien volvió no lo recibe');
  keep(); sent = []; at(day0 + 730 * DAYms + 3600e3); await runCron(Date.now()); keep();
  ok(!T.get('profile') && sent.some(x => x.to === 'teo@example.com' && /deleted/.test(x.subject) && /two years/.test(x.text)), 'a los 24 meses se borra la cuenta y se confirma por correo');
  ok(!!S.get('profile') && env.DOCS.inst.get('doc:' + ids[3]).ctx.storage.m.has('meta'), 'la de quien volvió sigue, con sus presentaciones');
  ok(!!acc('444').ctx.storage.m.get('profile') && !!acc('1010').ctx.storage.m.get('profile') && !allSent.some(x => ['eva@example.com', 'ines@example.com'].includes(x.to)), 'con Pro activo (propio o de un equipo pagado) no cuenta como inactiva: ni avisos ni borrado');
  Date.now = realNow;
}

// ---- «Crear modelo 3D con IA»: rounds of AI + Blender (model3d.js; Blender and OpenRouter simulated) ----
{
  const now0 = Date.now; let skew = 0; Date.now = () => now0() + skew;
  const gil = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-gil', terms: TERMS } }));
  const G = () => acc('1212').ctx.storage.m, credits = () => G().get('credits');
  const say = o => ({ status: 200, body: { choices: [{ message: { content: typeof o === 'string' ? o : '```json\n' + JSON.stringify(o) + '\n```' } }], usage: { cost: 0.01 } } });
  let answers = []; aiReply = () => answers.shift() || { status: 500, body: {} };
  const ok3d = { ok: true, glb: Buffer.from('glTF-binario').toString('base64'), preview: 'iVBORw0KGgoAAAA', thumb: '/9j/4AAQ', seconds: 9, log: '' };
  let blenderAnswer = () => ok3d;
  blenderReply = () => { skew += 10e3; return Response.json(blenderAnswer()); };   // (each run takes 10 s)
  const job = id => env.MODELJOBS.inst.get('job:' + id), tick = id => job(id).alarm();
  const status = async id => (await req('GET', '/api/3d/jobs/' + id, { headers: { Cookie: gil } })).json();

  // Not set up yet: 503 and the app is told (it hides the option).
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'una taza' } })).status === 503, '3D: sin BLENDER_URL, 503 «not configured»');
  ok((await (await req('GET', '/api/3d', { headers: { Cookie: gil } })).json()).ok === false && (await (await req('GET', '/api/me', { headers: { Cookie: gil } })).json()).model3d === false, '3D: la app sabe que no está disponible');
  env.BLENDER_URL = 'https://blender.test'; env.BLENDER_SECRET = 'secreto-blender'; env.MODELJOBS = namespace(ModelJob, env);
  env.BLENDER_USD_PER_SECOND = '0.0004'; env.AI_PRICES = '{"openai/gpt-4o-mini":[0.15,0.6],"google/gemini-3.8-flash":[0.1,0.4]}';
  ok((await (await req('GET', '/api/me', { headers: { Cookie: gil } })).json()).model3d === true, '3D: configurado');
  const est = (await (await req('GET', '/api/3d', { headers: { Cookie: gil } })).json()).estimate;
  ok(est.perRound === 26 && est.max === 104, '3D: estimación por ronda (peor caso: tokens máximos + 120 s de Blender) y máxima: ' + JSON.stringify(est));
  ok((await req('POST', '/api/3d/jobs', { body: { prompt: 'una taza' } })).status === 401, '3D: sin sesión no');
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: '' } })).status === 400, '3D: sin descripción no');
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'una taza', images: Array(4).fill('data:image/png;base64,AAAA') } })).status === 400, '3D: como mucho 3 fotos');
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'una taza', images: ['https://malo.example/x.png'] } })).status === 400, '3D: las fotos solo como data URL JPEG o PNG');
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'una taza', images: ['data:image/png;base64,' + 'A'.repeat(600_001)] } })).status === 400, '3D: fotos de tamaño limitado');

  // A job: round 1 fails in Blender, round 2 corrects it, round 3 sees the preview and says it's done.
  answers = [say({ done: false, note: 'Primera versión', script: 'bpy.ops.mesh.primitive_cylinder_add(radius=mal)' }), say({ done: false, note: 'Corregido el radio', script: 'bpy.ops.mesh.primitive_cylinder_add(radius=0.04)' }), say({ done: true, note: 'La taza está lista', script: '' })];
  blenderAnswer = () => (blenderCalls.length === 1 ? { ok: false, error: 'script', message: "NameError: name 'mal' is not defined", log: 'Traceback…', seconds: 1 } : ok3d);
  blenderCalls = []; aiCalls = [];
  let r = await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'una taza de café de cerámica azul', images: ['data:image/jpeg;base64,/9j/AAAA'], lang: 'es' } });
  const { id, estimate } = await r.json();
  ok(r.status === 200 && /^[\w-]{22}$/.test(id) && estimate.perRound === 26, '3D: trabajo creado, con su estimación');
  ok(credits() === 50 - 26 && !aiCalls.length, '3D: se apartan los créditos de la primera ronda antes de nada: ' + credits());
  ok((await status(id)).status === 'running', '3D: trabajando');
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'otra cosa' } })).status === 409, '3D: un trabajo activo por cuenta');
  await tick(id);
  let st = await status(id), ai = aiCalls.at(-1).body;
  ok(ai.model === 'google/gemini-3.8-flash' && ai.response_format?.type === 'json_object' && ai.provider?.data_collection === 'deny' && aiCalls.at(-1).auth === 'Bearer sk-or-secreta', '3D: el modelo con visión, con la clave del servidor y sin guardar datos');
  ok(/Blender/.test(ai.messages[0].content) && /metres/.test(ai.messages[0].content) && /Spanish/.test(ai.messages[0].content), '3D: las pautas del sistema (y la nota en el idioma de la persona)');
  ok(ai.messages[1].content.some(c => c.type === 'image_url' && c.image_url.url.startsWith('data:image/jpeg')), '3D: la foto de referencia va al modelo');
  ok(blenderCalls.length === 1 && JSON.parse(blenderCalls[0].body).script.includes('radius=mal') && JSON.parse(blenderCalls[0].body).timeoutSec === 90, '3D: Blender recibe el guion');
  ok(await verifyBody(blenderCalls[0].body, blenderCalls[0].sig, 'secreto-blender') && !(await verifyBody(blenderCalls[0].body, blenderCalls[0].sig, 'otro')) && !(await verifyBody(blenderCalls[0].body.replace('mal', 'otro'), blenderCalls[0].sig, 'secreto-blender')), '3D: la petición a revela-blender va firmada (HMAC del cuerpo con BLENDER_SECRET)');
  ok(st.rounds.length === 1 && st.rounds[0].ok === false && st.rounds[0].error === 'script' && st.rounds[0].note === 'Primera versión' && !st.glb, '3D: ronda 1 falla en Blender');
  ok(credits() === 50 - 5, '3D: el fallo de Blender no se cobra; la IA sí (0,01 $ = 5 créditos): ' + credits());
  await tick(id);
  ai = aiCalls.at(-1).body;
  ok(JSON.stringify(ai.messages.at(-1)).includes("NameError: name 'mal' is not defined") && ai.messages.at(-2).role === 'assistant', '3D: la ronda siguiente recibe el error para corregirlo');
  st = await status(id);
  ok(st.rounds[1].ok && st.rounds[1].preview === 'data:image/jpeg;base64,/9j/4AAQ' && st.glb && st.status === 'running', '3D: ronda 2 funciona, con su vista previa');
  ok(credits() === 50 - 5 - 7, '3D: se cobran la IA y los segundos de Blender (0,01 $ + 10 s × 0,0004 $ = 7 créditos): ' + credits());
  await tick(id);
  ai = aiCalls.at(-1).body;
  ok(ai.messages.at(-1).content.some(c => c.type === 'image_url' && c.image_url.url === 'data:image/png;base64,iVBORw0KGgoAAAA'), '3D: el modelo mira la vista previa');
  st = await status(id);
  ok(st.status === 'done' && st.rounds.length === 2 && st.total === 3 && st.rounds[1].note === 'La taza está lista' && blenderCalls.length === 2 && st.charged === 17, '3D: el modelo da el visto bueno → terminado: ' + JSON.stringify([st.status, st.charged]));
  ok(credits() === 50 - 17 && G().get('ledger').filter(x => x.reason === 'model3d').length === 3, '3D: saldo y movimientos correctos: ' + credits());
  r = await req('GET', '/api/3d/jobs/' + id + '/model', { headers: { Cookie: gil } });
  ok(r.status === 200 && (await r.json()).glb === 'data:model/gltf-binary;base64,' + ok3d.glb, '3D: se descarga el GLB');
  const noa = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-noa', terms: TERMS } }));
  ok((await req('GET', '/api/3d/jobs/' + id, { headers: { Cookie: noa } })).status === 404 && (await req('GET', '/api/3d/jobs/' + id + '/model', { headers: { Cookie: noa } })).status === 404
    && (await req('POST', '/api/3d/jobs/' + id + '/cancel', { headers: { Cookie: noa }, body: {} })).status === 404, '3D: el trabajo de otra cuenta no existe para ti');

  // Asking for changes: another request of rounds, with the text and the current render.
  answers = [say({ done: false, note: 'Más alta', script: 'bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.12)' }), say({ done: true, note: 'Hecho' })];
  ok((await req('POST', '/api/3d/jobs/' + id + '/feedback', { headers: { Cookie: gil }, body: { text: '' } })).status === 400, '3D: cambios sin texto no');
  r = await req('POST', '/api/3d/jobs/' + id + '/feedback', { headers: { Cookie: gil }, body: { text: 'hazla más alta' } });
  ok(r.status === 200 && (await status(id)).status === 'running' && (await status(id)).left === 4, '3D: pedir cambios abre otra tanda de rondas');
  ok((await req('POST', '/api/3d/jobs/' + id + '/feedback', { headers: { Cookie: gil }, body: { text: 'otra' } })).status === 409, '3D: no mientras trabaja');
  await tick(id);
  ai = aiCalls.at(-1).body;
  ok(JSON.stringify(ai.messages.at(-1)).includes('hazla más alta') && ai.messages.at(-1).content.some(c => c.type === 'image_url'), '3D: el modelo recibe los cambios pedidos y la vista previa actual');
  await tick(id);
  st = await status(id);
  ok(st.status === 'done' && st.rounds.length === 3 && st.total === 5 && credits() === 50 - 17 - 7 - 5, '3D: cambios hechos y cobrados: ' + JSON.stringify([st.status, st.error, st.total, credits(), G().get('ledger').slice(-4)]));
  // At most 12 rounds per job.
  { const J = job(id).ctx.storage.m, j = J.get('job'); J.set('job', { ...j, total: 12 }); }
  ok((await req('POST', '/api/3d/jobs/' + id + '/feedback', { headers: { Cookie: gil }, body: { text: 'más' } })).status === 409 && credits() === 21, '3D: tope de rondas por trabajo (sin apartar créditos)');

  // Cancelling: everything goes; the account may start another.
  ok((await req('POST', '/api/3d/jobs/' + id + '/cancel', { headers: { Cookie: gil }, body: {} })).status === 200 && (await req('GET', '/api/3d/jobs/' + id, { headers: { Cookie: gil } })).status === 404
    && !job(id).ctx.storage.m.size, '3D: descartar lo borra todo');

  // A forbidden module never reaches Blender; Blender down: the AI is charged, the run isn't.
  answers = [say({ done: false, note: 'x', script: 'import os\nos.system("ls")' }), say({ done: false, note: 'y', script: 'bpy.ops.mesh.primitive_cube_add()' })];
  blenderCalls = []; blenderReply = () => new Response('caído', { status: 500 });
  await acc('1212').fetch(new Request('https://do/grant', { method: 'POST', body: JSON.stringify({ credits: 100, reason: 'grant', ref: 't3d' }) }));
  const id2 = (await (await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'un cubo' } })).json()).id;
  ok(!!id2, '3D: tras descartar, se puede empezar otro');
  await tick(id2); st = await status(id2);
  ok(st.rounds[0].error === 'not allowed: import os' && !blenderCalls.length && credits() === 121 - 5, '3D: un guion con módulos prohibidos no llega a Blender: ' + JSON.stringify(st.rounds[0]));
  await tick(id2); st = await status(id2);
  ok(st.status === 'error' && st.error === 'blender unavailable' && blenderCalls.length === 1 && credits() === 121 - 10, '3D: Blender no responde → error, solo se cobra la IA: ' + credits());
  ok(!G().get('slot:3d'), '3D: al terminar se libera el turno de la cuenta');
  // The AI fails: nothing charged.
  answers = []; await req('POST', '/api/3d/jobs/' + id2 + '/feedback', { headers: { Cookie: gil }, body: { text: 'otra vez' } }); await tick(id2);
  st = await status(id2);
  ok(st.status === 'error' && st.error === 'ai failed' && credits() === 111, '3D: si la IA falla no se cobra: ' + credits());
  // No credits: 402, nothing started, the turn released.
  G().set('lots', [{ n: 11, exp: Date.now() + 9e6 }]); G().set('debt', 0); G().set('credits', 11);
  r = await req('POST', '/api/3d/jobs', { headers: { Cookie: gil }, body: { prompt: 'un edificio de oficinas de 5 plantas' } });
  ok(r.status === 402 && (await r.json()).credits === 11 && !G().get('slot:3d'), '3D: sin créditos suficientes, 402');
  // The global monthly budget.
  env.MONTHLY_BUDGET_USD = '0.001';
  ok((await req('POST', '/api/3d/jobs', { headers: { Cookie: noa }, body: { prompt: 'una silla' } })).status === 503, '3D: tope de gasto mensual global');
  env.MONTHLY_BUDGET_USD = '50';
  // After 24 hours the job is deleted.
  skew += 25 * 3600e3; await tick(id2);
  ok(!job(id2).ctx.storage.m.size, '3D: a las 24 h el trabajo se borra');
  Date.now = now0; aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'hola' } }], usage: { cost: 0.01 } } });
}

// ---- Administration (admin.js): Cloudflare Access, the directory, credits, plan, block, tickets, audit ----
{
  const ADMIN = 'https://admin.revelaslides.com', TEAM = 'revela-team', AUD = 'aud-revela-admin';
  const alg = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
  const good = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']), other = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', good.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  let certFetches = 0; const prevFetch = env.FETCH;
  env.FETCH = async (u, init) => (String(u) === `https://${TEAM}.cloudflareaccess.com/cdn-cgi/access/certs` ? (certFetches++, Response.json({ keys: [jwk] })) : prevFetch(u, init));
  const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const now = () => Math.floor(Date.now() / 1000);
  const jwt = async (claims = {}, { key = good.privateKey, kid = 'k1', alg: a = 'RS256' } = {}) => {
    const h = b64({ alg: a, kid, typ: 'JWT' }), p = b64({ aud: [AUD], iss: `https://${TEAM}.cloudflareaccess.com`, email: 'jefe@example.com', exp: now() + 600, iat: now(), type: 'app', ...claims });
    const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p))).toString('base64url');
    return `${h}.${p}.${sig}`;
  };
  const tok = await jwt();
  const adm = (method, path, { body, token = tok, host = ADMIN, origin = ADMIN, flag = true, headers = {} } = {}) => worker.fetch(new Request(host + '/api/admin' + path, { method,
    headers: { ...(token && { 'Cf-Access-Jwt-Assertion': token }), ...(flag && { 'X-Revela-Admin': '1' }), ...(origin && method === 'POST' && { Origin: origin }), ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
    ...(body !== undefined && { body: JSON.stringify(body) }) }), env);
  const A = async (...x) => { const r = await adm(...x); return { status: r.status, j: await r.json().catch(() => null) }; };

  // Off unless configured: 404, even with a good token.
  ok((await adm('GET', '/whoami')).status === 404 && certFetches === 0, 'admin: sin ACCESS_TEAM/ACCESS_AUD/ADMIN_EMAILS → 404');
  env.ACCESS_TEAM = TEAM; env.ACCESS_AUD = AUD;
  ok((await adm('GET', '/whoami')).status === 404, 'admin: falta ADMIN_EMAILS → 404');
  env.ADMIN_EMAILS = 'jefe@example.com, otra@example.com';
  let x = await A('GET', '/whoami');
  ok(x.status === 200 && x.j.email === 'jefe@example.com', 'admin: token de Access válido y correo permitido: ' + JSON.stringify(x));
  ok((await adm('GET', '/whoami', { host: SITE })).status === 404, 'admin: en revelaslides.com (otro host) → 404');
  ok((await worker.fetch(new Request(ADMIN + '/api/me', { headers: { Cookie: ana } }), env)).status === 404, 'admin: el resto de la API no responde en el host de administración');
  ok((await adm('GET', '/whoami', { token: null })).status === 403, 'admin: sin token → 403');
  ok((await adm('GET', '/whoami', { token: await jwt({ aud: ['otra-app'] }) })).status === 403, 'admin: token de otra aplicación (aud) → 403');
  ok((await adm('GET', '/whoami', { token: await jwt({ exp: now() - 10 }) })).status === 403, 'admin: token caducado → 403');
  ok((await adm('GET', '/whoami', { token: await jwt({}, { key: other.privateKey }) })).status === 403, 'admin: firma mala → 403');
  ok((await adm('GET', '/whoami', { token: await jwt({ iss: 'https://otro-equipo.cloudflareaccess.com' }) })).status === 403, 'admin: emisor de otro equipo → 403');
  ok((await adm('GET', '/whoami', { token: await jwt({ email: 'intruso@example.com' }) })).status === 403, 'admin: correo no permitido → 403');
  ok((await adm('GET', '/whoami', { token: await jwt({ email: undefined, common_name: 'servicio' }) })).status === 403, 'admin: token de servicio sin correo → 403');
  { const [h, p] = tok.split('.'); ok((await adm('GET', '/whoami', { token: `${b64({ alg: 'none', kid: 'k1' })}.${p}.` })).status === 403 && h, 'admin: alg none → 403'); }
  ok((await adm('GET', '/whoami', { token: await jwt({}, { kid: 'desconocida' }) })).status === 403, 'admin: clave desconocida → 403');
  ok((await adm('GET', '/whoami', { flag: false })).status === 403, 'admin: sin la cabecera X-Revela-Admin → 403');
  ok((await adm('POST', '/credits', { origin: 'https://malo.example', body: { sub: '111', delta: 5, reason: 'x' } })).status === 403, 'admin: un cambio desde otra web (CSRF) → 403');
  ok(certFetches <= 2, 'admin: las claves de Access se guardan un rato: ' + certFetches);
  ok(await verifyAccess(tok, { ...env, ACCESS_AUD: '' }) === null, 'verifyAccess: sin configurar, nada');

  // The directory: kept by the accounts themselves.
  const pia = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-pia', terms: TERMS, lang: 'es' } }));
  x = await A('GET', '/users?q=pia');
  ok(x.status === 200 && x.j.users.length === 1 && x.j.users[0].sub === '1414' && x.j.users[0].credits === 50 && x.j.users[0].plan === 'free' && x.j.users[0].lastSeen, 'directorio: buscar por correo: ' + JSON.stringify(x.j));
  ok((await A('GET', '/users?q=1414')).j.users[0]?.email === 'pia@example.com', 'directorio: buscar por sub');
  ok((await A('GET', '/users?q=nadie')).j.users.length === 0, 'directorio: sin resultados');
  { // Any field, not only the email's start: the middle of the email, several words, accents and case, the plan, by pages.
    const mid = (await A('GET', '/users?q=' + encodeURIComponent('a@example'))).j.users, both = (await A('GET', '/users?q=' + encodeURIComponent('PÍA gratis 1414'))).j.users;
    ok(mid.length >= 1 && mid.every(u => u.email.includes('a@example')) && mid.some(u => u.sub === '1414'), 'directorio: buscar por cualquier parte del correo: ' + mid.map(u => u.email));
    ok(both.length === 1 && both[0].sub === '1414', 'directorio: varias palabras, sin acentos ni mayúsculas, y el plan');
    ok((await A('GET', '/users?q=pia%20pro')).j.users.length === 0, 'directorio: todas las palabras cuentan');
    const p1 = (await A('GET', '/users?q=example&limit=2')).j, p2 = (await A('GET', '/users?q=example&limit=2&cursor=' + p1.cursor)).j;
    ok(p1.users.length === 2 && p1.cursor && p1.total > 2 && p2.users.length && !p2.users.some(u => p1.users.some(v => v.sub === u.sub)), 'directorio: búsqueda por páginas'); }
  const all = (await A('GET', '/users')).j.users;
  ok(all.length >= 5 && all.some(u => u.sub === '888') && !all.some(u => u.sub === '222'), 'directorio: recientes (y sin la cuenta borrada): ' + all.map(u => u.sub));
  { const p1 = (await A('GET', '/users?limit=2')).j, p2 = (await A('GET', '/users?limit=2&cursor=' + encodeURIComponent(p1.cursor))).j;
    ok(p1.users.length === 2 && p1.cursor && p2.users.length === 2 && !p2.users.some(u => p1.users.some(v => v.sub === u.sub)), 'directorio: por páginas'); }
  x = await A('GET', '/users/1414');
  ok(x.status === 200 && x.j.profile.email === 'pia@example.com' && x.j.credits === 50 && x.j.lots.length === 1 && x.j.ledger[0].reason === 'trial' && x.j.sessions.n === 1 && x.j.docs === 0 && x.j.directory.sub === '1414', 'ficha de la cuenta: ' + JSON.stringify(x.j).slice(0, 300));
  // Closing a person's sessions (a stolen account): one, or all; always with a reason, in the audit log.
  {
    const lia = () => req('POST', '/api/login', { body: { accessToken: 'tok-lia', terms: TERMS } }).then(cookieFrom), l1 = await lia(), l2 = await lia(), L = (await A('GET', '/users/2323')).j.sessions.list;
    ok(L.length === 2 && L.every(s => /^[\w-]{16}$/.test(s.id) && s.kind === 'web' && 'device' in s && 'where' in s && s.last), 'ficha: las sesiones, una a una: ' + L.length);
    ok((await A('POST', '/sessions-end', { body: { sub: '2323' } })).status === 400, 'cerrar sesiones: sin motivo, no');
    ok((await A('POST', '/sessions-end', { body: { sub: '2323', reason: 'x', id: 'mal' } })).status === 400, 'cerrar sesiones: id malo → 400');
    ok((await A('POST', '/sessions-end', { body: { sub: 'nadie', reason: 'x' } })).status === 404, 'cerrar sesiones: cuenta que no existe → 404');
    let y = await A('POST', '/sessions-end', { body: { sub: '2323', id: L[0].id, reason: 'Un inicio de sesión que no reconoce' } });
    ok(y.status === 200 && y.j.ended === 1 && (await A('GET', '/users/2323')).j.sessions.n === 1, 'cerrar sesiones: una');
    y = await A('POST', '/sessions-end', { body: { sub: '2323', reason: 'Cuenta robada' } });
    ok(y.j.ended === 1 && (await req('GET', '/api/me', { headers: { Cookie: l1 } })).status === 401 && (await req('GET', '/api/me', { headers: { Cookie: l2 } })).status === 401, 'cerrar sesiones: todas; ya no vale ninguna');
    const au = (await A('GET', '/audit?target=2323')).j.entries;
    ok(au.filter(e => e.action === 'sessions-end').length === 2 && au.some(e => e.reason === 'Cuenta robada' && e.by === 'jefe@example.com'), 'cerrar sesiones: en el registro de auditoría');
  }
  // Space in the cloud (storage.js): measured per account, a quota per plan (the admin's), nothing grows beyond it.
  {
    const MBc = 1024 * 1024, sto = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-sto', terms: TERMS } }));
    let y = await A('GET', '/storage');
    ok(y.status === 200 && y.j.config.freeMb === 100 && y.j.config.proMb === 2048 && y.j.config.alertGb === 4, 'espacio: cuotas de partida (100 MB gratis, 2 GB Pro, aviso a 4 GB): ' + JSON.stringify(y.j.config));
    ok((await A('POST', '/storage', { body: { freeMb: 0, proMb: 1, alertGb: 1 } })).status === 400, 'espacio: cuotas imposibles → 400');
    y = await A('POST', '/storage', { body: { freeMb: 1, proMb: 3, alertGb: 0.0005 } });
    ok(y.status === 200 && (await A('GET', '/storage')).j.config.freeMb === 1, 'espacio: el administrador cambia las cuotas');
    ok((await A('GET', '/audit?target=storage')).j.entries.some(e => e.action === 'storage-config'), 'espacio: el cambio queda en la auditoría');
    const big = n => ({ name: 'Grande', slides: [{ id: 's1', blocks: [{ id: 'b1', type: 'image', src: 'data:image/png;base64,' + 'A'.repeat(n) }] }] });
    const doc = body => req('POST', '/api/docs', { headers: { Cookie: sto }, body });
    let r = await doc({ deck: big(0.6 * MBc) }); const d1 = (await r.json()).id;
    ok(r.status === 200 && d1, 'espacio: una presentación de 0,6 MB cabe en 1 MB');
    let L = await (await req('GET', '/api/docs', { headers: { Cookie: sto } })).json();
    ok(L.storage && Math.abs(L.storage.used - 0.6 * MBc) < 2000 && L.storage.quota === MBc && L.mine[0].bytes > 0, 'espacio: «Mi nube» dice lo ocupado y la cuota: ' + JSON.stringify(L.storage));
    r = await doc({ deck: big(0.6 * MBc) }); j = await r.json();
    ok(r.status === 402 && j.error === 'storage full' && j.quota === MBc, 'espacio: otra de 0,6 MB ya no cabe → 402 «storage full»');
    const ops = o => req('POST', `/api/docs/${d1}/ops`, { headers: { Cookie: sto }, body: { ops: o } });
    r = await ops([{ p: ['slides', 's1', 'blocks', 'b1', 'src'], v: 'data:image/png;base64,' + 'B'.repeat(0.5 * MBc) }]);
    ok(r.status === 200, 'espacio: cambiar por algo más pequeño, sí');
    r = await ops([{ p: ['slides', 's1', 'blocks', 'b2'], v: { id: 'b2', type: 'image', src: 'data:image/png;base64,' + 'C'.repeat(0.6 * MBc) } }]);
    ok(r.status === 402 && (await r.json()).error === 'storage full', 'espacio: lo que haría crecer la presentación por encima de la cuota, no');
    ok(!JSON.stringify((await (await req('GET', `/api/docs/${d1}`, { headers: { Cookie: sto } })).json()).deck).includes('CCCC'), 'espacio: y no queda a medias en el servidor');
    // One account's own quota, from the administration.
    ok((await A('POST', '/storage-quota', { body: { sub: '2424', mb: 5 } })).status === 400, 'espacio: cuota a medida sin motivo → 400');
    y = await A('POST', '/storage-quota', { body: { sub: '2424', mb: 5, reason: 'Centro piloto' } });
    ok(y.status === 200 && y.j.after.mb === 5, 'espacio: cuota a medida para una cuenta');
    r = await doc({ deck: big(0.6 * MBc) }); const d2 = (await r.json()).id; ok(r.status === 200, 'espacio: con su cuota, ya cabe');
    y = await A('GET', '/users/2424'); ok(y.j.storage.quota === 5 * MBc && y.j.storage.custom && y.j.storage.used > MBc, 'espacio: la ficha muestra lo ocupado y su cuota: ' + JSON.stringify(y.j.storage));
    await A('POST', '/storage-quota', { body: { sub: '2424', mb: 0, reason: 'Fin del piloto' } });
    ok((await (await req('GET', '/api/docs', { headers: { Cookie: sto } })).json()).storage.quota === MBc, 'espacio: 0 vuelve a la cuota del plan');
    // Deleting frees it.
    const usedBefore = (await (await req('GET', '/api/docs', { headers: { Cookie: sto } })).json()).storage.used;
    await req('POST', `/api/docs/${d2}/delete`, { headers: { Cookie: sto } });
    L = await (await req('GET', '/api/docs', { headers: { Cookie: sto } })).json(); ok(Math.abs(usedBefore - L.storage.used - 0.6 * MBc) < 5000, 'espacio: borrar libera lo que ocupaba: ' + (usedBefore - L.storage.used));
    // Documents from before space was counted: measured by the daily run or «Medir ahora».
    { const m = acc('2424').ctx.storage.m, docs = m.get('docs'), was = docs.find(d => d.id === d1).bytes; delete docs.find(d => d.id === d1).bytes; m.set('docs', docs);
      y = await A('POST', '/storage/measure', { body: {} });
      ok(y.status === 200 && y.j.measured >= 1 && !y.j.more && m.get('docs').find(d => d.id === d1).bytes === was, 'espacio: «Medir ahora» mide las presentaciones de antes: ' + JSON.stringify(y.j));
      ok((await A('POST', '/storage/measure', { body: {} })).j.measured === 0, 'espacio: y no vuelve a medir lo ya medido'); }
    // The admins are told when the whole cloud passes the alert.
    await acc('2424').dirSync(true);
    y = await A('GET', '/storage'); ok(y.j.bytes > 0 && y.j.top.some(u => u.email === 'sto@example.com'), 'espacio: el total y quién ocupa más');
    const { storageWatch } = await import('../server/cloudflare/storage.js'); const told = [];
    const w = await storageWatch(env, { sendMail: async (e, m) => { told.push(m); return true; }, adminEmails: ['jefe@example.com'] });
    ok(w.sent && told[0].to === 'jefe@example.com' && /ocupa/.test(told[0].subject) && /sto@example.com/.test(told[0].text), 'espacio: aviso a los administradores al pasar el umbral');
    await A('POST', '/storage', { body: { freeMb: 100, proMb: 2048, alertGb: 4 } });
    ok(!(await storageWatch(env, { sendMail: async () => true, adminEmails: ['jefe@example.com'] })).sent, 'espacio: por debajo, ningún aviso');
  }
  ok((await A('GET', '/users/nadie')).status === 404, 'ficha de una cuenta que no existe: 404');

  // Credits: added (with an email), taken (never below zero), audited.
  sent = [];
  ok((await A('POST', '/credits', { body: { sub: '1414', delta: 20 } })).status === 400, 'créditos: sin motivo → 400');
  ok((await A('POST', '/credits', { body: { sub: '1414', delta: 0, reason: 'x' } })).status === 400, 'créditos: 0 → 400');
  ok((await A('POST', '/credits', { body: { sub: '9999999', delta: 5, reason: 'x' } })).status === 404, 'créditos: cuenta inexistente → 404');
  x = await A('POST', '/credits', { body: { sub: '1414', delta: 20, reason: 'Falló una imagen', expiresDays: 30, notify: true } });
  const P = () => acc('1414').ctx.storage.m;
  ok(x.status === 200 && x.j.before === 50 && x.j.after === 70 && P().get('credits') === 70, 'créditos: se añaden: ' + JSON.stringify(x.j));
  { const e = P().get('ledger').at(-1); ok(e.reason === 'admin' && e.delta === 20 && e.note === 'Falló una imagen' && e.by === 'jefe@example.com', 'créditos: en el historial como «admin», con el motivo y quién: ' + JSON.stringify(e)); }
  ok(P().get('lots').some(l => l.n === 20 && Math.abs(l.exp - (Date.now() + 30 * 864e5)) < 60e3), 'créditos: caducan cuando se dijo');
  ok(x.j.mailed && sent.some(m => m.to === 'pia@example.com' && /20 créditos/.test(m.subject)), 'créditos: correo a la persona: ' + sent.map(m => m.subject));
  ok((await A('GET', '/users?q=pia')).j.users[0].credits === 70, 'créditos: el directorio se entera');
  x = await A('POST', '/credits', { body: { sub: '1414', delta: -1000, reason: 'prueba de cargo' } });
  ok(x.j.delta === -70 && x.j.after === 0 && !P().get('debt'), 'créditos: un cargo no deja deuda: ' + JSON.stringify(x.j));
  await A('POST', '/credits', { body: { sub: '1414', delta: 70, reason: 'devolver la prueba' } });

  // Refund of the last AI charge.
  aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'hola' } }], usage: { cost: 0.01 } } }); P().set('rate', []);
  ok((await req('POST', '/api/ai/chat', { headers: { Cookie: pia }, body: { messages: [{ role: 'user', content: 'x' }] } })).status === 200 && P().get('credits') === 65, 'pia gasta 5 créditos de IA');
  x = await A('POST', '/refund', { body: { sub: '1414', reason: 'La respuesta salió vacía' } });
  ok(x.status === 200 && x.j.delta === 5 && x.j.after === 70 && x.j.charge.reason === 'ai' && P().get('ledger').at(-1).ref.startsWith('refund:'), 'reembolso del último cobro de IA: ' + JSON.stringify(x.j));
  ok((await A('POST', '/refund', { body: { sub: '1414' } })).status === 409, 'reembolso: el mismo cobro no se devuelve dos veces');

  // Plan given by hand.
  const until = Date.now() + 10 * 864e5;
  ok((await A('POST', '/plan', { body: { sub: '1414', until: Date.now() - 1000, reason: 'x' } })).status === 400, 'plan: fecha pasada → 400');
  x = await A('POST', '/plan', { body: { sub: '1414', until, reason: 'Compensación por la caída' } });
  me = await (await req('GET', '/api/me', { headers: { Cookie: pia } })).json();
  ok(x.status === 200 && x.j.before.plan === 'free' && x.j.after.plan === 'pro' && me.plan === 'pro' && me.until === until && me.features.includes('share-people'), 'plan: Pro hasta una fecha: ' + JSON.stringify([x.j, me.plan, me.until]));
  ok((await A('GET', '/stats')).j.pro >= 1, 'resumen: cuenta los Pro');
  await A('POST', '/plan', { body: { sub: '1414', until: 0, reason: 'fin de la prueba' } });
  ok((await (await req('GET', '/api/me', { headers: { Cookie: pia } })).json()).plan === 'free', 'plan: quitarlo');

  // Blocking.
  ok((await A('POST', '/block', { body: { sub: '1414', blocked: true } })).status === 400, 'bloquear: sin motivo → 400');
  x = await A('POST', '/block', { body: { sub: '1414', blocked: true, reason: 'Abuso de la IA' } });
  r = await req('POST', '/api/ai/chat', { headers: { Cookie: pia }, body: { messages: [{ role: 'user', content: 'x' }] } });
  ok(x.status === 200 && r.status === 403 && (await r.json()).error === 'blocked', 'bloqueada: la IA responde 403');
  ok((await req('GET', '/api/docs', { headers: { Cookie: pia } })).status === 403, 'bloqueada: la nube responde 403');
  me = await (await req('GET', '/api/me', { headers: { Cookie: pia } })).json();
  ok(me.blocked === true && me.email === 'pia@example.com', 'bloqueada: ve su cuenta, que dice que está bloqueada');
  ok((await req('GET', '/api/account/export', { headers: { Cookie: pia } })).status === 200, 'bloqueada: puede descargar sus datos');
  ok((await A('GET', '/stats')).j.blocked === 1 && (await A('GET', '/users?q=pia')).j.users[0].blocked, 'bloqueada: en el directorio');
  await A('POST', '/block', { body: { sub: '1414', blocked: false, reason: 'Aclarado' } }); P().set('rate', []);
  ok((await req('POST', '/api/ai/chat', { headers: { Cookie: pia }, body: { messages: [{ role: 'user', content: 'x' }] } })).status === 200, 'desbloqueada: vuelve la IA');

  // Tickets: from the app, with an email address or signed in.
  sent = []; env.SUPPORT_PER_DAY = '2';
  const sup = (body, { ip = '10.0.0.1', origin = SITE, headers = {} } = {}) => req('POST', '/api/support', { origin, body, headers: { 'CF-Connecting-IP': ip, ...headers } });
  ok((await sup({ message: 'No se abre mi archivo', email: 'no-es-correo' })).status === 400, 'consulta sin sesión: hace falta un correo válido');
  ok((await sup({ message: 'No se abre mi archivo', email: 'eva2@example.com' }, { origin: 'https://malo.example' })).status === 403, 'consulta: solo desde Revela');
  r = await sup({ message: 'No se abre mi archivo .pptx', category: 'bug', email: 'Eva2@Example.com', version: 'cloud 0.3.0', browser: 'Firefox 140', deckName: 'Clase 3', lang: 'en' });
  j = await r.json();
  ok(r.status === 200 && j.id === 1001 && j.mailed && sent.some(m => m.to === 'eva2@example.com' && /#1001/.test(m.subject) && /request/.test(m.subject)), 'consulta: número y acuse por correo (en su idioma): ' + JSON.stringify([j, sent.map(m => m.subject)]));
  ok((await sup({ message: 'Compra ya barato', email: 'b@example.com', website: 'http://spam' }, { ip: '10.0.0.9' }).then(x => x.json())).id === 0, 'consulta: los bots (campo trampa) no crean nada');
  ok((await sup({ message: 'Otra vez yo', email: 'eva2@example.com' })).status === 200 && (await sup({ message: 'Y otra más', email: 'eva2@example.com' })).status === 429, 'consulta: límite por dirección al día');
  env.SUPPORT_ATTACH_KB = '1';
  ok((await sup({ message: 'Con la presentación', attach: { slides: ['x'.repeat(3000)] } }, { headers: { Cookie: pia } })).status === 413, 'consulta: presentación adjunta demasiado grande → 413');
  env.SUPPORT_ATTACH_KB = '';
  r = await sup({ message: 'La IA no responde', category: 'ai', deckName: 'Mi charla', attach: { name: 'Mi charla', slides: [{ id: 's1' }] }, email: 'falso@example.com' }, { headers: { Cookie: pia } });
  j = await r.json();
  ok(r.status === 200 && j.id === 1003, 'consulta con sesión: ' + JSON.stringify(j));
  x = await A('GET', '/tickets/' + j.id);
  ok(x.j.ticket.email === 'pia@example.com' && x.j.ticket.sub === '1414' && x.j.ticket.category === 'ai' && x.j.ticket.attachment && x.j.ticket.deckName === 'Mi charla', 'consulta con sesión: el correo es el de la cuenta, con la presentación adjunta');
  r = await adm('GET', `/tickets/${j.id}/attachment`);
  ok(r.status === 200 && JSON.parse(await r.text()).slides[0].id === 's1', 'el adjunto se descarga');
  x = await A('GET', '/tickets/1001');
  ok(x.j.ticket.browser === 'Firefox 140' && x.j.ticket.version === 'cloud 0.3.0' && !x.j.ticket.attachment && x.j.ticket.deckName === 'Clase 3', 'consulta: versión, navegador y nombre de la presentación (sin su contenido)');
  x = await A('GET', '/tickets?status=open');
  ok(x.j.tickets.length === 3 && x.j.tickets[0].id === 1003, 'consultas abiertas, la más nueva primero: ' + x.j.tickets.map(t => t.id));
  ok((await A('POST', '/tickets/1001/status', { body: { status: 'raro' } })).status === 400, 'estado inventado → 400');
  ok((await A('POST', '/tickets/1002/status', { body: { status: 'closed' } })).j.after === 'closed' && (await A('GET', '/tickets?status=closed')).j.tickets.map(t => t.id).join() === '1002'
    && (await A('GET', '/tickets?status=open')).j.tickets.length === 2, 'cambiar el estado mueve la consulta de lista');
  ok((await A('POST', '/tickets/1001/note', { body: { text: 'Pedir el archivo' } })).j.ticket.notes[0].by === 'jefe@example.com', 'nota interna');
  sent = [];
  x = await A('POST', '/tickets/1001/reply', { body: { text: 'Hola:\nPrueba a abrirlo de nuevo.' } });
  ok(x.status === 200 && x.j.mailed && x.j.after === 'waiting' && x.j.ticket.thread.length === 2 && sent.length === 1 && sent[0].to === 'eva2@example.com' && /#1001/.test(sent[0].subject)
    && /Prueba a abrirlo de nuevo/.test(sent[0].text) && !/Pedir el archivo/.test(sent[0].text), 'responder: correo a la persona, en el hilo, sin las notas internas');
  ok((await A('GET', '/tickets/9999')).status === 404, 'consulta inexistente → 404');
  env.SUPPORT_PER_DAY = '';

  // The overview and the audit log.
  x = await A('GET', '/stats');
  ok(x.j.users >= 5 && x.j.tickets.open === 1 && x.j.tickets.waiting === 1 && x.j.tickets.closed === 1 && typeof x.j.ai.usd === 'number' && x.j.ai.limit === 50, 'resumen: ' + JSON.stringify(x.j));
  x = await A('GET', '/audit');
  const acts = x.j.entries.map(e => e.action);
  ok(['credits', 'refund', 'plan', 'block', 'unblock', 'ticket-status', 'ticket-note', 'ticket-reply'].every(a => acts.includes(a)) && x.j.entries[0].action === 'ticket-reply', 'auditoría: cada cambio, el último primero: ' + acts);
  { const e = x.j.entries.find(e => e.action === 'credits'); ok(e.by === 'jefe@example.com' && e.target === '1414' && e.before.credits !== undefined && e.after.credits !== undefined && e.at > 0 && e.reason, 'auditoría: quién, cuándo, qué, antes y después'); }
  ok((await A('GET', '/audit?target=1414')).j.entries.every(e => e.target === '1414'), 'auditoría: por cuenta');
  ok((await A('POST', '/audit', { body: {} })).status === 404 && !(await env.AUDIT.get('audit').fetch('https://a/delete', { method: 'POST', body: '{}' })).ok, 'auditoría: no se puede borrar ni cambiar');

  // Ticket lifecycle: open (our turn) → waiting (theirs) → closed; the person answers with the signed link in the emails.
  {
    const linkOf = m => decodeURIComponent((String(m?.text || '').match(/\/api\/support\/reply\?t=(\S+)/) || [])[1] || '');
    const page = (t, { ip = '10.1.0.1' } = {}) => worker.fetch(new Request(SITE + '/api/support/reply?t=' + encodeURIComponent(t), { headers: { 'CF-Connecting-IP': ip, 'Accept-Language': 'es-ES' } }), env);
    const answer = (t, fields, { ip = '10.1.0.1', json: asJson = false } = {}) => worker.fetch(new Request(SITE + '/api/support/reply', { method: 'POST',
      headers: { Origin: SITE, 'CF-Connecting-IP': ip, 'Content-Type': asJson ? 'application/json' : 'application/x-www-form-urlencoded' },
      body: asJson ? JSON.stringify({ t, ...fields }) : new URLSearchParams({ t, ...fields }).toString() }), env);
    // (The admin's Access token is checked against the real clock.)
    const real = async f => { const fake = Date.now; Date.now = realNow; try { return await f(); } finally { Date.now = fake; } };
    const get = id => real(async () => (await A('GET', '/tickets/' + id)).j.ticket);
    const audits = id => real(async () => (await A('GET', '/audit?target=ticket:' + id)).j.entries);

    // The acknowledgement already carries the link (instead of «send another report»).
    sent = [];
    r = await sup({ message: 'No puedo exportar a PDF', email: 'leo@example.com', lang: 'es' }, { ip: '10.0.0.20' }); const t1 = (await r.json()).id;
    let m = sent.find(x => x.to === 'leo@example.com'), tok = linkOf(m);
    ok(m && tok && /Añadir algo a la consulta/.test(m.text) && !/envía otro informe/.test(m.text), 'consulta: el acuse lleva el enlace para responder, no «envía otro informe»: ' + m?.text);

    // Old tickets: 'pending' (before 'waiting') is read as 'waiting' and moved once.
    { const old = new Tickets({ storage: fakeStorage() }, env), S = old.ctx.storage.m, k = '0000001001';
      S.set('n', 1001); S.set('t:' + k, { id: 1001, at: 1000, updated: 2000, status: 'pending', email: 'x@example.com', category: 'bug', message: 'Antiguo', thread: [{ at: 1000, from: 'user', text: 'Antiguo' }, { at: 2000, from: 'admin', by: 'jefe@example.com', text: 'Mira esto' }], notes: [] });
      S.set('x:' + k, { id: 1001, status: 'pending' }); S.set('i:pending|' + k, 1001);
      const call0 = async (op, b) => (await old.fetch(new Request('https://do/' + op, { method: 'POST', body: JSON.stringify(b || {}) }))).json();
      const c = await call0('counts'), l = await call0('list', { status: 'pending' }), g = (await call0('get', { id: 1001 })).ticket;
      ok(c.waiting === 1 && c.open === 0 && !('pending' in c) && l.tickets.length === 1 && l.tickets[0].status === 'waiting' && l.tickets[0].last === 'admin' && l.tickets[0].lastAt === 2000
        && g.status === 'waiting' && g.waitingSince === 2000 && g.updated === 2000 && ![...S.keys()].some(x => x.startsWith('i:pending|')) && S.get('v') === 2,
      'estados: «pending» antiguo pasa a «waiting» (índice rehecho, quién habló el último): ' + JSON.stringify([c, l.tickets[0]]));
      ok((await call0('status', { id: 1001, status: 'pending' })).after === 'waiting' && (await call0('status', { id: 1001, status: 'raro' })).error, 'estados: «pending» se acepta como alias; uno inventado no'); }
    ok((await A('POST', `/tickets/${t1}/status`, { body: { status: 'pending' } })).j.after === 'waiting' && (await A('POST', `/tickets/${t1}/status`, { body: { status: 'open' } })).j.after === 'open', 'admin: «pending» → «waiting»');

    // Answering: «and wait for their answer» (waiting), «and mark it solved» (closed), «internal note only».
    sent = []; x = await A('POST', `/tickets/${t1}/reply`, { body: { text: '¿Qué navegador usas?', status: 'waiting' } });
    m = sent.find(y => y.to === 'leo@example.com'); tok = linkOf(m);
    ok(x.j.after === 'waiting' && x.j.ticket.last === 'admin' && x.j.ticket.waitingSince > 0 && m && tok && /Responder/.test(m.text) && /30 días/.test(m.text) && /resuelto/.test(m.text), 'responder y esperar: «waiting», con el enlace en el correo: ' + m?.text);
    sent = []; x = await A('POST', `/tickets/${t1}/note`, { body: { text: 'Seguramente Safari' } });
    ok(x.j.ticket.status === 'waiting' && !sent.length && (await get(t1)).last === 'admin', 'solo nota interna: ni correo ni cambio de estado');
    x = await A('GET', '/tickets?status=waiting');
    ok(x.j.tickets.some(t => t.id === t1 && t.last === 'admin' && t.lastAt > 0), 'la lista dice quién escribió el último y cuándo');

    // The page: valid, forged, another ticket, expired.
    r = await page(tok); let html = await r.text();
    ok(r.status === 200 && /¿Qué navegador usas\?/.test(html) && /No puedo exportar a PDF/.test(html) && /Ya está resuelto, gracias/.test(html) && !/Seguramente Safari/.test(html)
      && /form-action 'self'/.test(r.headers.get('Content-Security-Policy')) && /no-store/.test(r.headers.get('Cache-Control')), 'enlace válido: la conversación (sin notas internas) y el formulario');
    ok((await page(tok.slice(0, -2) + (tok.endsWith('A') ? 'BB' : 'AA'))).status === 403, 'enlace con la firma cambiada → 403');
    { const [, e, em, sig] = tok.split('.'); ok((await answer(`1003.${e}.${em}.${sig}`, { text: 'Hola' })).status === 403, 'enlace con otro número de consulta → 403'); }
    ok((await page(await ticketToken(env, 1003, 'leo@example.com', Date.now() + 864e5))).status === 403, 'enlace firmado para otra consulta (otro correo) → 403');
    ok((await page(await ticketToken(env, t1, 'leo@example.com', Date.now() - 1000))).status === 403, 'enlace caducado → 403');
    ok((await page(await ticketToken({ MAIL_SECRET: 'otro' }, t1, 'leo@example.com', Date.now() + 864e5))).status === 403 && (await page('basura')).status === 403, 'enlace firmado con otra clave, o basura → 403');
    ok(/no es válido o ha caducado/.test(await (await page('basura')).text()), 'enlace malo: la página lo dice');

    // The person answers: the ticket is ours again, and the admin is told.
    ok((await answer(tok, { text: '' })).status === 400, 'respuesta vacía (sin marcar resuelto) → 400');
    ok((await answer(tok, { text: 'x'.repeat(30000) })).status === 413, 'respuesta demasiado grande → 413');
    sent = []; r = await answer(tok, { text: 'Uso Safari 18.' }); html = await r.text();
    let t = await get(t1);
    ok(r.status === 200 && /lo hemos recibido/.test(html) && t.status === 'open' && t.last === 'user' && t.thread.at(-1).text === 'Uso Safari 18.' && t.thread.at(-1).from === 'user', 'la persona responde: vuelve a «open» (nos toca)');
    m = sent.find(y => y.to === 'jefe@example.com');
    ok(m && sent.length === 1 && /#\d+/.test(m.subject) && /Uso Safari 18/.test(m.text) && /admin\.revelaslides\.com\/#tickets\//.test(m.text), 'aviso al primer correo de ADMIN_EMAILS: ' + JSON.stringify(sent.map(y => [y.to, y.subject])));
    ok((await audits(t1)).some(e => e.action === 'ticket-user-reply' && e.by === 'user' && e.before.status === 'waiting' && e.after.status === 'open'), 'auditoría: la respuesta de la persona, como «user»');
    env.SUPPORT_NOTIFY = 'soporte@example.com'; sent = [];
    r = await answer(tok, { solved: true }, { json: true }); j = await r.json(); t = await get(t1);
    ok(r.status === 200 && j.status === 'closed' && t.status === 'closed' && t.thread.at(-1).solved && sent.some(y => y.to === 'soporte@example.com' && /Resuelto/.test(y.subject)), 'marca «ya está resuelto» (JSON): cerrada; aviso a SUPPORT_NOTIFY');
    env.SUPPORT_NOTIFY = '';
    // Solved and closed by the admin; the person can open it again with the link.
    sent = []; x = await A('POST', `/tickets/${t1}/reply`, { body: { text: 'Arreglado en la versión 0.4.', status: 'closed' } });
    m = sent.find(y => y.to === 'leo@example.com'); const tokClosed = linkOf(m);
    ok(x.j.after === 'closed' && /Damos la consulta por resuelta/.test(m?.text) && tokClosed, 'responder y marcar como resuelto: «closed», el correo lo dice y deja el enlace');
    ok(/la volveremos a abrir/.test(await (await page(tokClosed)).text()), 'cerrada: la página avisa de que escribir la reabre');
    r = await answer(tokClosed, { text: 'Sigue fallando con la 0.4' }, { ip: '10.1.0.2' });
    ok(r.status === 200 && (await get(t1)).status === 'open', 'una consulta cerrada se reabre con el enlace');

    // Limits: per ticket (and per address) a day.
    env.SUPPORT_REPLIES_PER_DAY = '2';
    r = await sup({ message: 'Me cobran dos veces', email: 'ona@example.com' }, { ip: '10.0.0.21' }); const t2 = (await r.json()).id;
    const tok2 = linkOf(sent.find(y => y.to === 'ona@example.com'));
    ok((await answer(tok2, { text: 'Uno' }, { ip: '10.2.0.1' })).status === 200 && (await answer(tok2, { text: 'Dos' }, { ip: '10.2.0.2' })).status === 200, 'límite: dentro del cupo');
    r = await answer(tok2, { text: 'Tres' }, { ip: '10.2.0.3' });
    ok(r.status === 429 && /muchas respuestas/.test(await r.text()) && (await get(t2)).thread.length === 3, 'límite por consulta y día → 429, y no se guarda');
    env.SUPPORT_REPLIES_PER_DAY = '';

    // The daily cron: a reminder after 7 days waiting, closed after 21; 0 turns either off.
    sent = []; await A('POST', `/tickets/${t2}/reply`, { body: { text: '¿Puedes mandarnos el recibo?' } });
    const since = (await get(t2)).waitingSince;
    at(since + 6 * DAYms); await runCron(Date.now());
    ok(!sent.some(y => y.to === 'ona@example.com' && /Sigues/.test(y.subject)), 'cron: a los 6 días, nada');
    at(since + 7 * DAYms + 3600e3); await runCron(Date.now());
    m = sent.find(y => y.to === 'ona@example.com' && /Sigues/.test(y.subject)); const tokRemind = linkOf(m);
    ok(m && tokRemind && /la cerraremos el/.test(m.text) && (await get(t2)).status === 'waiting', 'cron: a los 7 días, un recordatorio con el enlace: ' + m?.text);
    at(since + 8 * DAYms); await runCron(Date.now());
    ok(sent.filter(y => y.to === 'ona@example.com' && /Sigues/.test(y.subject)).length === 1, 'cron: un solo recordatorio');
    at(since + 21 * DAYms + 3600e3); await runCron(Date.now()); t = await get(t2);
    ok(t.status === 'closed' && t.notes.some(n => n.by === 'system' && /automáticamente/.test(n.text)) && sent.filter(y => y.to === 'ona@example.com').length === 2, 'cron: a los 21 días, cerrada con una nota (sin más correos)');
    ok((await audits(t2)).some(e => e.action === 'ticket-autoclose' && e.by === 'system') && (await audits(t2)).some(e => e.action === 'ticket-remind'), 'auditoría: recordatorio y cierre automáticos');
    at(since + 25 * DAYms); r = await answer(tokRemind, { text: 'Perdón, estaba de viaje' }, { ip: '10.2.0.9' });
    ok(r.status === 200 && (await get(t2)).status === 'open', 'tras el cierre automático, la persona la reabre con el enlace del recordatorio');
    at(since + 7 * DAYms + 31 * DAYms); ok((await page(tokRemind)).status === 403, 'el enlace caduca a los 30 días');
    Date.now = realNow;
    // Turned off: SUPPORT_REMIND_DAYS=0 (no reminder), SUPPORT_AUTOCLOSE_DAYS=0 (never closed).
    env.SUPPORT_REMIND_DAYS = '0'; env.SUPPORT_AUTOCLOSE_DAYS = '0'; sent = [];
    await A('POST', `/tickets/${t2}/reply`, { body: { text: '¿Sigue?' } }); const s2 = (await get(t2)).waitingSince;
    at(s2 + 60 * DAYms); await runCron(Date.now()); Date.now = realNow;
    ok((await get(t2)).status === 'waiting' && !sent.some(y => y.to === 'ona@example.com' && /Sigues/.test(y.subject)), 'cron: con 0, ni recordatorio ni cierre');
    env.SUPPORT_REMIND_DAYS = ''; env.SUPPORT_AUTOCLOSE_DAYS = '';

    // The list: open first, then waiting, then closed; in each, the latest activity first.
    x = await A('GET', '/tickets?limit=100');
    const order = { open: 0, waiting: 1, closed: 2 }, L = x.j.tickets;
    ok(L.length >= 5 && L.every((t, i) => !i || order[L[i - 1].status] < order[t.status] || (L[i - 1].status === t.status && L[i - 1].lastAt >= t.lastAt)), 'lista: por estado y por última actividad: ' + L.map(t => t.id + t.status[0]));
    { const a1 = await A('GET', '/tickets?limit=2'), a2 = await A('GET', '/tickets?limit=2&cursor=' + encodeURIComponent(a1.j.cursor)), a3 = await A('GET', '/tickets?limit=100&cursor=' + encodeURIComponent(a2.j.cursor));
      ok([...a1.j.tickets, ...a2.j.tickets, ...a3.j.tickets].map(t => t.id).join() === L.map(t => t.id).join() && !a3.j.cursor, 'lista: paginada de un estado al siguiente'); }
    x = await A('GET', '/stats'); const c = x.j.tickets;
    ok(c.open + c.waiting + c.closed === L.length && c.waiting >= 1, 'resumen: cuántas en cada estado: ' + JSON.stringify(c));

    // The website's «Contacto» (revelaslides.com/contact): the same tickets, without a session — the name and the topic too.
    sent = []; r = await sup({ name: '  Marta Ruiz  ', email: 'marta@periodico.example', category: 'press', message: 'Escribo un reportaje sobre herramientas educativas.', lang: 'es', source: 'web' }, { ip: '10.3.0.1' });
    const tc = (await r.json()).id; t = await get(tc);
    ok(r.status === 200 && t.name === 'Marta Ruiz' && t.category === 'press' && t.email === 'marta@periodico.example' && !t.sub && sent.some(y => y.to === 'marta@periodico.example' && new RegExp('#' + tc).test(y.subject)), 'contacto: un ticket con nombre y tema, y el acuse');
    for (const cat of ['privacy', 'legal', 'partner']) ok((await get((await (await sup({ email: `x-${cat}@example.com`, category: cat, message: 'Hola, una consulta.' }, { ip: '10.3.0.' + cat.length })).json()).id)).category === cat, 'contacto: tema ' + cat);
    ok((await get((await (await sup({ email: 'y@example.com', category: 'inventado', message: 'Hola, otra.' }, { ip: '10.3.0.99' })).json()).id)).category === 'other', 'contacto: un tema inventado queda en «other»');
    ok((await get((await (await sup({ email: 'z@example.com', name: 'n'.repeat(500), message: 'Nombre largo.' }, { ip: '10.3.0.98' })).json()).id)).name.length === 120, 'contacto: el nombre, recortado');

    // Kept no longer than needed: closed tickets 3 years without activity are deleted (attachment too); open ones stay.
    { const tz = (await (await sup({ email: 'vieja@example.com', message: 'Una consulta antigua', attach: { slides: [{ id: 'a' }] } }, { ip: '10.4.0.1' })).json()).id;
      await A('POST', `/tickets/${tz}/status`, { body: { status: 'closed' } }); const closedAt = (await get(tz)).lastAt;
      // (Only the tickets' part of the daily run: the rest of it, years ahead, would delete the test accounts.)
      env.SUPPORT_REMIND_DAYS = '0'; env.SUPPORT_AUTOCLOSE_DAYS = '0';
      await ticketsDue(env, closedAt + 1094 * DAYms);
      ok(!!(await get(tz)), 'conservación: a los 2 años y pico, sigue');
      await ticketsDue(env, closedAt + 1096 * DAYms);
      env.SUPPORT_REMIND_DAYS = ''; env.SUPPORT_AUTOCLOSE_DAYS = '';
      const T = env.TICKETS.inst.get('tickets').ctx.storage.m, pid = String(tz).padStart(10, '0');
      ok(!(await get(tz)) && ![...T.keys()].some(k => k.includes(pid) || k.startsWith('a:' + pid)), 'conservación: a los 3 años cerrada, se borra (con su adjunto y su índice)');
      ok(!!(await get(tc)), 'conservación: las abiertas no se borran');
      ok((await real(async () => (await A('GET', '/audit?target=tickets')).j.entries)).some(e => e.action === 'ticket-purge' && e.by === 'system' && e.after.purged >= 1), 'conservación: en la auditoría'); }
  }

  // AI help for whoever answers a ticket (mocked OpenRouter): context, budget, cache, validation, access.
  {
    const answerWith = (o, cost = 0.004) => { aiReply = () => ({ status: 200, body: { choices: [{ message: { content: typeof o === 'string' ? o : JSON.stringify(o) } }], usage: { cost, prompt_tokens: 900, completion_tokens: 300 } } }); };
    const keep = aiReply, budgetUsd = () => env.BUDGET.inst.get('global').ctx.storage.m.get('m')?.usd || 0;
    P().set('ledger', [...(P().get('ledger') || []), { at: Date.now() - 5000, delta: -12, reason: 'image', balance: 0 }]);
    r = await sup({ message: 'La imagen salió en blanco y me cobró', category: 'ai', attach: { name: 'Secreta', slides: [{ id: 's1', text: 'SECRETO-DEL-ADJUNTO' }] } }, { headers: { Cookie: pia }, ip: '10.0.0.40' });
    const tid = (await r.json()).id;
    const good = { summary: 'Una imagen falló y se cobró.', category: 'ai', priority: 'alta', likelyCause: 'Fallo del proveedor de imágenes', checks: ['Ver el último cargo de imagen'],
      actions: [{ type: 'refund', reason: 'Imagen en blanco', why: 'Cargo de imagen sin resultado' }], draftReply: 'Hola:\nTe hemos devuelto los créditos.\nEl equipo de Revela', statusAfter: 'closed' };
    // Access: the same checks as the rest of the admin API.
    ok((await adm('POST', `/tickets/${tid}/suggest`, { token: null, body: {} })).status === 403 && (await adm('POST', `/tickets/${tid}/suggest`, { origin: 'https://malo.example', body: {} })).status === 403
      && (await adm('POST', `/tickets/${tid}/suggest`, { flag: false, body: {} })).status === 403 && (await adm('POST', `/tickets/${tid}/suggest`, { host: SITE, body: {} })).status === 404, 'IA: solo administración (Access, Origin, cabecera, host)');
    // A suggestion: paid by the global budget, not by the person's credits.
    answerWith(good); aiCalls = [];
    const credits0 = P().get('credits'), ledger0 = P().get('ledger').length, usd0 = budgetUsd();
    x = await A('POST', `/tickets/${tid}/suggest`, { body: {} });
    const sent0 = aiCalls[0]?.body, ctx = sent0 ? sent0.messages.map(m => m.content).join('\n') : '';
    ok(x.status === 200 && !x.j.cached && x.j.suggestion.priority === 'alta' && x.j.suggestion.actions[0].type === 'refund' && x.j.suggestion.statusAfter === 'closed' && x.j.suggestion.model === 'google/gemini-2.5-flash' && x.j.suggestion.usd === 0.004,
      'IA: sugerencia con modelo y coste: ' + JSON.stringify(x.j));
    ok(sent0?.model === 'google/gemini-2.5-flash' && sent0.provider?.data_collection === 'deny' && sent0.response_format?.type === 'json_object', 'IA: modelo barato, proveedores que no guardan ni entrenan, respuesta JSON');
    ok(/La imagen salió en blanco/.test(ctx) && /"aiCharge":true/.test(ctx) && /"credits"/.test(ctx) && !/SECRETO-DEL-ADJUNTO/.test(ctx) && !/Secreta/.test(ctx) && /"presentationAttached":true/.test(ctx)
      && !/pia@example\.com|ana@example\.com|luis@example\.com/.test(ctx), 'IA: el contexto lleva el ticket y la cuenta, nunca el adjunto ni correos (ni de otros)');
    ok(P().get('credits') === credits0 && P().get('ledger').length === ledger0 && Math.abs(budgetUsd() - usd0 - 0.004) < 1e-9, 'IA: lo paga el presupuesto global, no los créditos de la persona');
    ok((await A('GET', '/audit?target=ticket:' + tid)).j.entries.some(e => e.action === 'ticket-suggest' && e.by === 'jefe@example.com' && e.after.usd === 0.004), 'IA: en la auditoría (quién y coste)');
    // Cached: opening again doesn't spend; «Regenerar» (force) does.
    aiCalls = []; x = await A('POST', `/tickets/${tid}/suggest`, { body: {} });
    ok(x.j.cached && !aiCalls.length && (await A('GET', '/tickets/' + tid)).j.ticket.suggestion?.summary === good.summary, 'IA: guardada en el ticket; volver a pedirla no gasta');
    answerWith({ ...good, summary: 'Otra' }); x = await A('POST', `/tickets/${tid}/suggest`, { body: { force: true } });
    ok(!x.j.cached && aiCalls.length === 1 && x.j.suggestion.summary === 'Otra', 'IA: «Regenerar» pide una nueva');
    // Sloppy or abusive answers: only known values, bounded.
    answerWith('```json\n' + JSON.stringify({ summary: 'x'.repeat(9000), category: 'hack', priority: 'URGENTÍSIMO', checks: Array.from({ length: 30 }, (_, i) => 'c' + i), statusAfter: 'borrar',
      actions: [{ type: 'credits', amount: 999999, reason: 'r'.repeat(900) }, { type: 'delete-account' }, { type: 'plan', amount: -5 }, { type: 'plan', amount: '400' }, { type: 'unblock' }, { type: 'none' }, { type: 'credits', amount: 3 }],
      draftReply: '<script>alert(1)</script>' }) + '\n```');
    x = await A('POST', `/tickets/${tid}/suggest`, { body: { force: true } }); const sg = x.j.suggestion;
    ok(x.status === 200 && sg.summary.length <= 500 && sg.category === 'ai' && sg.priority === 'media' && sg.checks.length === 8 && sg.statusAfter === 'waiting'
      && sg.actions.map(a => a.type + (a.amount ?? '')).join() === 'credits2000,plan365,none' && sg.actions[0].reason.length <= 300 && sg.draftReply === '<script>alert(1)</script>',
      'IA: respuesta descuidada o abusiva, recortada (importes, tipos, prioridad, estado): ' + JSON.stringify(sg.actions));
    answerWith({ ...good, actions: [{ type: 'credits', amount: 50 }, { type: 'unblock' }, { type: 'none', why: 'nada' }] });
    const anon = (await (await sup({ email: 'sin-cuenta@example.com', message: 'Me cobraron de más' }, { ip: '10.5.0.1' })).json()).id;
    x = await A('POST', `/tickets/${anon}/suggest`, { body: {} });
    ok(x.j.suggestion.actions.map(a => a.type).join() === 'none' && !/"account":\{/.test(aiCalls.at(-1).body.messages[1].content), 'IA: sin cuenta, ninguna acción sobre cuentas');
    answerWith('esto no es JSON'); const u1 = budgetUsd();
    x = await A('POST', `/tickets/${tid}/suggest`, { body: { force: true } });
    ok(x.status === 502 && budgetUsd() > u1 && (await A('GET', '/tickets/' + tid)).j.ticket.suggestion.priority === 'media', 'IA: respuesta ilegible → 502 (gastado, la anterior se conserva)');
    // Over the monthly budget: refused, nothing spent.
    env.MONTHLY_BUDGET_USD = '0.0001'; aiCalls = [];
    x = await A('POST', `/tickets/${tid}/suggest`, { body: { force: true } });
    ok(x.status === 503 && x.j.error === 'ai paused' && !aiCalls.length, 'IA: sin presupuesto del mes → 503, sin llamar');
    env.MONTHLY_BUDGET_USD = '50';
    const key = env.OPENROUTER_KEY; delete env.OPENROUTER_KEY;
    ok((await A('POST', `/tickets/${tid}/suggest`, { body: { force: true } })).status === 503 && (await A('GET', '/tickets/' + tid)).j.ai === false, 'IA: sin OPENROUTER_KEY → 503');
    env.OPENROUTER_KEY = key;
    env.SUPPORT_AI_AUTO = '1';
    const fresh = (await (await sup({ email: 'nueva@example.com', message: 'Otra consulta' }, { ip: '10.5.0.2' })).json()).id;
    ok((await A('GET', '/tickets/' + anon)).j.autoSuggest === false && (await A('GET', '/tickets/' + fresh)).j.autoSuggest === true, 'IA: SUPPORT_AI_AUTO=1 → la página la pide al abrir un ticket sin sugerencia');
    env.SUPPORT_AI_AUTO = '';
    aiReply = keep; aiCalls = [];
  }

  // ---- The business's accounts (finance.js) and the «Negocio» API ----
  {
    const FS = () => env.FINANCE.inst.get('global').ctx.storage.m, today = new Date().toISOString().slice(0, 10);
    const D = () => FS().get('d:' + today) || {}, raw = () => [...FS()].filter(([k]) => /^[ep]:/.test(k)).map(([, v]) => v);
    // AI: each request with its feature (whitelisted), model, tokens, the provider's cost, the credits charged and who.
    ok(raw().some(e => e.kind === 'ai' && e.sub === '1414' && e.usd === 0.01 && e.credits === 5 && e.feature === 'other'), 'finanzas: la IA de pia queda registrada (coste, créditos, cuenta)');
    P().set('rate', []);
    aiReply = () => ({ status: 200, body: { model: 'openai/gpt-4o-mini', choices: [{ message: { content: 'hola' } }], usage: { cost: 0.02, prompt_tokens: 300, completion_tokens: 40 } } });
    const n0 = D()['ai.f.assistant.n'] || 0;
    await req('POST', '/api/ai/chat', { headers: { Cookie: pia }, body: { feature: 'assistant', messages: [{ role: 'user', content: 'x' }] } });
    await req('POST', '/api/ai/chat', { headers: { Cookie: pia }, body: { feature: '<script>', messages: [{ role: 'user', content: 'x' }] } });
    { const e = raw().filter(x => x.kind === 'ai').at(-2);
      ok(e.feature === 'assistant' && e.model === 'openai/gpt-4o-mini' && e.tin === 300 && e.tout === 40 && e.usd === 0.02 && e.credits === 10 && e.fx > 0, 'finanzas: función, modelo, tokens, coste y créditos: ' + JSON.stringify(e)); }
    ok(raw().filter(x => x.kind === 'ai').at(-1).feature === 'other' && D()['ai.f.assistant.n'] === n0 + 1 && D()['ai.m.openai/gpt-4o-mini.usd'] > 0, 'finanzas: una función desconocida cuenta como «other»; sumas del día por función y modelo');
    ok(D()['users.new'] >= 1 && D()['act.dau'] >= 1 && D()['act.mau'] >= 1 && D()['cr.in.trial'] >= 50, 'finanzas: altas, usuarios activos del día y del mes, créditos de bienvenida: ' + JSON.stringify([D()['users.new'], D()['act.dau'], D()['act.mau'], D()['cr.in.trial']]));
    ok(D()['cr.in.admin'] >= 90 && D()['cr.out.admin'] >= 70 && D()['cr.in.refund'] === 5, 'finanzas: ajustes de administración (dar, quitar, devolver): ' + JSON.stringify([D()['cr.in.admin'], D()['cr.out.admin'], D()['cr.in.refund']]));
    ok(D()['mail.n'] >= 1, 'finanzas: correos enviados contados');
    ok(raw().some(e => e.kind === 'ai' && e.feature === '3d' && e.blenderSecs > 0 && e.blenderUsd > 0) && raw().some(e => e.kind === 'ai' && e.feature === 'ticket-suggest' && e.usd > 0), 'finanzas: rondas 3D (IA + segundos de Blender) y sugerencias de tickets');
    // Credits that expire: from the account's lots.
    { const before = D()['cr.out.expired'] || 0; P().set('lots', [{ n: 7, exp: Date.now() - 1000 }, ...P().get('lots')]);
      await req('GET', '/api/me', { headers: { Cookie: pia } });
      ok(D()['cr.out.expired'] === before + 7 && raw().some(e => e.kind === 'credits' && e.reason === 'expired' && e.delta === -7 && e.sub === '1414'), 'finanzas: créditos caducados'); }
    // Stripe: a pack (fee from the balance transaction), a subscription (fee estimated: Stripe doesn't answer), a refund, a cancellation.
    const prev = env.FETCH, btCalls = [];
    env.FETCH = async (u, init) => { const s = String(u);
      if (s.startsWith('https://api.stripe.com/v1/payment_intents/pi_1')) { btCalls.push(s); return Response.json({ id: 'pi_1', latest_charge: { id: 'ch_1', balance_transaction: { fee: 40, currency: 'eur', net: 1170 } } }); }
      if (s.startsWith('https://api.stripe.com/v1/charges/')) { btCalls.push(s); return new Response('no', { status: 500 }); }
      return prev(u, init); };
    const pack = { id: 'evt_f1', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', currency: 'eur', amount_total: 1210, total_details: { amount_tax: 210 }, payment_intent: 'pi_1', customer: 'cus_p', metadata: { sub: '1414', product: 'credits-500' } } } };
    ok((await hook(pack)).status === 200 && (await hook(pack)).status === 200, 'finanzas: pago de un paquete (y el mismo aviso repetido)');
    { const e = raw().filter(x => x.kind === 'payment' && x.ref === 'evt_f1'); ok(e.length === 1 && e[0].gross === 1210 && e[0].tax === 210 && e[0].fee === 40 && !e[0].feeEstimated && e[0].credits === 500 && e[0].product === 'credits-500' && e[0].sub === '1414',
      'finanzas: el pago con su comisión real (balance transaction), una sola vez: ' + JSON.stringify(e)); }
    ok(/payment_intents\/pi_1\?expand%5B%5D=latest_charge.balance_transaction/.test(btCalls[0] || ''), 'finanzas: la comisión se lee de Stripe: ' + btCalls[0]);
    const end = Math.floor(Date.now() / 1000) + 30 * 86400, start = end - 30 * 86400;
    await hook({ id: 'evt_f2', type: 'invoice.paid', data: { object: { customer: 'cus_p', currency: 'eur', amount_paid: 1210, tax: 210, charge: 'ch_9', billing_reason: 'subscription_create', parent: { subscription_details: { subscription: 'sub_9', metadata: { sub: '1414' } } },
      lines: { data: [{ period: { start, end }, price: { id: 'price_pm' } }] } } } });
    { const e = raw().filter(x => x.kind === 'payment').at(-1), s9 = FS().get('s:sub_9');
      ok(e.product === 'pro-month' && e.subscription === 'sub_9' && e.feeEstimated && e.fee === 43 && e.months === 1, 'finanzas: suscripción, comisión estimada (1,5 % + 0,25 €) si Stripe no responde: ' + JSON.stringify(e));
      ok(s9 && s9.monthly === 1000 && !s9.end && D()['sub.new'] === 1, 'finanzas: la suscripción cuenta para el MRR (sin IVA): ' + JSON.stringify(s9)); }
    await hook({ id: 'evt_f3', type: 'charge.refunded', data: { object: { currency: 'eur', amount_refunded: 500, metadata: { sub: '1414' } }, previous_attributes: { amount_refunded: 0 } } });
    await hook({ id: 'evt_f4', type: 'customer.subscription.deleted', data: { object: { id: 'sub_9', metadata: { sub: '1414' } } } });
    ok(D()['ref.eur'] === 500 && D()['sub.cancel'] === 1 && FS().get('s:sub_9').end > 0, 'finanzas: reembolso y baja registrados');
    env.FETCH = prev;
    // The summary, with the directory's figures and the budget.
    x = await A('GET', `/finance/summary?from=${today}&to=${today}&group=day`);
    { const t = x.j.totals;
      ok(x.status === 200 && t.gross === 24.2 && t.tax === 4.2 && t.fees === 0.83 && t.refunds === 5 && t.net === 14.17 && x.j.series.length === 1, 'resumen: ingresos, impuestos, comisiones, reembolsos, neto: ' + JSON.stringify(t));
      ok(x.j.subscriptions.new === 1 && x.j.subscriptions.cancelled === 1 && x.j.credits.sold === 1500 && x.j.ai.byFeature.assistant?.n >= 1 && x.j.directory.users >= 1 && x.j.liability.credits > 0 && x.j.budget.limit === 50,
        'resumen: suscripciones, créditos, IA por función, directorio, pasivo y presupuesto: ' + JSON.stringify([x.j.subscriptions, x.j.credits, x.j.directory, x.j.liability, x.j.budget]));
      const pu = x.j.topUsers.find(u => u.sub === '1414'); ok(pu && pu.email === 'pia@example.com' && pu.revenue === 15 && pu.costUsd >= 0.05 && Math.abs(pu.profit - (15 - pu.costUsd * 0.86)) < 0.01, 'resumen: usuarios más costosos con su ingreso y su beneficio: ' + JSON.stringify(pu));
      ok(x.j.topUsers.every((u, i, l) => !i || l[i - 1].cost >= u.cost), 'resumen: ordenados por coste'); }
    ok((await A('GET', '/finance/summary?from=2026-13-01&to=2026-01-01')).status === 400 && (await A('GET', '/finance/summary?from=2020-01-01&to=2026-01-01')).status === 400, 'resumen: periodo inválido o de más de 3 años → 400');
    // Access: the same checks as the rest of the admin API.
    ok((await adm('GET', '/finance/summary', { token: null })).status === 403 && (await adm('GET', '/finance/summary', { flag: false })).status === 403
      && (await adm('GET', '/finance/summary', { host: SITE })).status === 404 && (await adm('GET', '/finance/export.csv', { token: await jwt({ email: 'intruso@example.com' }) })).status === 403, 'finanzas: solo administración');
    ok((await adm('DELETE', '/finance/entries/aaaaaaaaaaaa', { headers: { Origin: 'https://malo.example' } })).status === 403 && (await adm('PUT', '/finance/entries')).status === 405, 'finanzas: borrar desde otra web → 403; otros métodos → 405');
    // Manual entries: fixed costs and hours, each change in the audit log.
    ok((await A('POST', '/finance/entries', { body: { type: 'fixed', name: 'x', amount: -5, currency: 'eur', date: today, category: 'software' } })).status === 400
      && (await A('POST', '/finance/entries', { body: { type: 'time', hours: 30, date: today, category: 'desarrollo' } })).status === 400
      && (await A('POST', '/finance/entries', { body: { type: 'fixed', name: 'x', amount: 5, currency: 'eur', date: today, category: 'inventada' } })).status === 400, 'entradas: importes, horas o categorías inválidos → 400');
    x = await A('POST', '/finance/entries', { body: { type: 'fixed', name: 'Servidor', amount: 31, currency: 'eur', date: today, recurring: true, category: 'infraestructura' } });
    const fid = x.j.entry?.id;
    ok(x.status === 200 && /^[a-f0-9]{12}$/.test(fid) && x.j.entry.recurring, 'entradas: gasto fijo mensual');
    x = await A('POST', '/finance/entries', { body: { id: fid, type: 'fixed', name: 'Cloudflare Workers', amount: 5, currency: 'usd', date: today, recurring: true, category: 'infraestructura' } });
    ok(x.status === 200 && (await A('GET', '/finance/entries')).j.entries.find(e => e.id === fid).amount === 5, 'entradas: editar');
    ok((await A('POST', '/finance/entries', { body: { id: 'ffffffffffff', type: 'fixed', name: 'y', amount: 1, currency: 'eur', date: today, category: 'otros' } })).status === 404, 'entradas: editar una que no existe → 404');
    const inj = (await A('POST', '/finance/entries', { body: { type: 'fixed', name: '=HYPERLINK("http://malo")', amount: 12, currency: 'eur', date: today, category: 'software' } })).j.entry.id;
    await A('POST', '/finance/entries', { body: { type: 'time', hours: 2.5, date: today, category: 'soporte', note: 'Tickets' } });
    { const l = (await A('GET', '/audit?target=finance:' + fid)).j.entries;
      ok(l.length === 2 && l[0].action === 'finance-edit' && l[0].before.amount === 31 && l[0].after.amount === 5 && l[1].action === 'finance-add' && l[0].by === 'jefe@example.com', 'entradas: auditoría (alta y cambio, antes y después)'); }
    x = await A('GET', `/finance/summary?from=${today}&to=${today}&group=day`);
    ok(x.j.time.hours === 2.5 && x.j.time.byCategory.soporte === 2.5 && x.j.time.profitPerHour === Math.round((x.j.totals.profit / 2.5) * 100) / 100 && x.j.totals.fixed > 12 && x.j.fixed.monthly === Math.round(5 * 0.86 * 100) / 100,
      'resumen: horas, beneficio por hora y gastos fijos: ' + JSON.stringify([x.j.time, x.j.fixed]));
    // CSV for the accountant.
    { const r = await adm('GET', `/finance/export.csv?from=${today}&to=${today}`), r2 = await adm('GET', `/finance/export.csv?from=${today}&to=${today}`), t = await r.text(), lines = t.split('\r\n');
      ok(r.status === 200 && /text\/csv/.test(r.headers.get('Content-Type')) && /attachment; filename="revela-contabilidad-/.test(r.headers.get('Content-Disposition')) && new Uint8Array(await r2.arrayBuffer())[0] === 0xef && t.startsWith('fecha;tipo;concepto;categoría;importe;moneda;impuestos;comisión;neto;importe_eur'), 'CSV: cabecera (con BOM, para Excel) y descarga');
      ok(lines.some(l => /^\d{4}-\d\d-\d\d;ingreso;credits-500;;12,1;EUR;2,1;0,4;9,6;12,1;;;1414;evt_f1$/.test(l)), 'CSV: el pago con impuestos, comisión y neto: ' + lines.find(l => /ingreso/.test(l)));
      ok(lines.some(l => /;reembolso;/.test(l)) && lines.some(l => /;coste;IA \(\d+ peticiones\);ia;-0,\d+;USD;/.test(l)) && lines.some(l => /;horas;Tickets;soporte;.*;2,5;/.test(l)), 'CSV: reembolso, coste de IA del día y horas');
      ok(t.includes(`"'=HYPERLINK(""http://malo"")"`) && !/;=HYPERLINK/.test(t), 'CSV: sin fórmulas inyectadas'); }
    // Raw events, by pages; the money ones by kind.
    { const p1 = (await A('GET', '/finance/events?limit=3')).j, p2 = (await A('GET', '/finance/events?limit=3&cursor=' + encodeURIComponent(p1.cursor))).j;
      ok(p1.events.length === 3 && p1.cursor && p2.events.length === 3 && p1.events[0].at >= p1.events[2].at && p1.events[2].at >= p2.events[0].at && p1.events.every(e => /^\d{15}:\d{9}$/.test(e.id)) && !p2.events.some(e => p1.events.some(f => f.id === e.id)), 'eventos: por páginas, los más recientes primero');
      const pays = (await A('GET', '/finance/events?kind=payment')).j.events; ok(pays.length >= 2 && pays.every(e => e.kind === 'payment') && pays[0].ref === 'evt_f2' && pays[1].ref === 'evt_f1', 'eventos: filtrar por tipo'); }
    ok((await adm('DELETE', '/finance/entries/' + inj, { headers: { Origin: ADMIN } })).status === 200 && (await adm('DELETE', '/finance/entries/' + inj, { headers: { Origin: ADMIN } })).status === 404
      && (await A('GET', '/audit?target=finance:' + inj)).j.entries[0].action === 'finance-delete' && !(await A('GET', '/finance/entries')).j.entries.some(e => e.id === inj), 'entradas: borrar (auditado)');
  }

  // ---- Stripe's test mode (api.js stripeConf): per account (set by an admin) or for everyone (STRIPE_MODE) ----
  {
    const FS = () => env.FINANCE.inst.get('global').ctx.storage.m, today = new Date().toISOString().slice(0, 10), D = () => FS().get('d:' + today) || {};
    const TS = () => acc('1515').ctx.storage.m, IS = () => acc('1616').ctx.storage.m;
    const hookT = async (ev, secret = 'whsec_t') => { const body = JSON.stringify(ev); return worker.fetch(new Request(SITE + '/api/billing/webhook-test', { method: 'POST', body, headers: { 'Stripe-Signature': await sign(body, secret) } }), env); };
    const meOf = async c => (await req('GET', '/api/me', { headers: { Cookie: c } })).json();
    const tess = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-tess', terms: TERMS } }));
    const ivo = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-ivo', terms: TERMS } }));
    const sum = async () => (await A('GET', `/finance/summary?from=${today}&to=${today}&group=day`)).j;
    const s0 = await sum(), pay0 = D()['pay.n'] || 0, crAdmin0 = D()['cr.out.admin'] || 0;

    // Configuration and mode.
    { const c = stripeConf({ STRIPE_TEST_SECRET_KEY: 'k', STRIPE_TEST_WEBHOOK_SECRET: 'w', STRIPE_TEST_PRICE_PRO_MONTH: 'p', STRIPE_PRICE_PRO_MONTH: 'live' }, 'test');
      ok(c.mode === 'test' && c.ok && c.key === 'k' && c.webhook === 'w' && c.prices['pro-month'] === 'p' && stripeConf(env).key === 'sk_test' && stripeConf(env).prices['pro-month'] === 'price_pm' && !stripeConf({}, 'test').ok,
        'stripeConf: claves, secreto del webhook y precios de cada modo: ' + JSON.stringify(c)); }
    ok(billingMode({}, false) === 'live' && billingMode({}, true) === 'test' && billingMode({ STRIPE_MODE: 'test' }, false) === 'test' && billingMode({ STRIPE_MODE: 'live' }, false) === 'live', 'modo: la marca de la cuenta o STRIPE_MODE=test; por defecto, real');
    me = await meOf(tess); ok(me.billingTest === false && me.billing === true, '/api/me: sin marca, pagos reales: ' + JSON.stringify([me.billingTest, me.billing]));
    // Nothing paid yet (or a Pro from test mode, a gift): no «manage the subscription», and the portal says why.
    ok(me.portal === false, '/api/me: sin cliente de Stripe, sin portal: ' + me.portal);
    r = await req('POST', '/api/billing/portal', { headers: { Cookie: tess } });
    ok(r.status === 404 && (await r.json()).error === 'no customer', 'portal sin nada pagado: 404 «no customer» (antes «billing not available»)');

    // The admin marks the account (audited); without the test configuration: a clear 503.
    ok((await A('POST', '/billing-test', { body: { sub: '1515', on: true } })).status === 400 && (await A('POST', '/billing-test', { body: { sub: '1515', on: 'sí', reason: 'x' } })).status === 400, 'modo de prueba: sin motivo o sin on → 400');
    ok((await A('POST', '/billing-test', { body: { sub: 'nadie', on: true, reason: 'x' } })).status === 404, 'modo de prueba: cuenta inexistente → 404');
    x = await A('POST', '/billing-test', { body: { sub: '1515', on: true, reason: 'Probar compras sin dinero' } });
    ok(x.status === 200 && x.j.after.billingTest.by === 'jefe@example.com' && !x.j.before.billingTest, 'modo de prueba: activado por la administración: ' + JSON.stringify(x.j));
    me = await meOf(tess); ok(me.billingTest === true && me.billing === false, '/api/me: billingTest, y pagos no disponibles sin la configuración de prueba: ' + JSON.stringify([me.billingTest, me.billing]));
    r = await req('POST', '/api/billing/checkout', { headers: { Cookie: tess }, body: { product: 'pro-month' } });
    ok(r.status === 503 && (await r.json()).error === 'billing test not configured', 'sin STRIPE_TEST_*: 503 «billing test not configured»');
    ok((await req('POST', '/api/billing/portal', { headers: { Cookie: tess } })).status === 503, 'portal sin configuración de prueba: 503');
    ok((await hookT({ id: 'evt_t0', type: 'invoice.paid', data: { object: {} } })).status === 503, 'webhook de prueba sin STRIPE_TEST_WEBHOOK_SECRET: 503');

    // With it: the flagged account pays with the test key and prices; the others, real.
    Object.assign(env, { STRIPE_TEST_SECRET_KEY: 'sk_test_t', STRIPE_TEST_WEBHOOK_SECRET: 'whsec_t', STRIPE_TEST_PRICE_PRO_MONTH: 'price_t_pm', STRIPE_TEST_PRICE_CREDITS_500: 'price_t_c500' });
    me = await meOf(tess); ok(me.billingTest === true && me.billing === true, '/api/me: modo de prueba configurado');
    stripeCalls = [];
    r = await req('POST', '/api/billing/checkout', { headers: { Cookie: tess }, body: { product: 'pro-month' } });
    ok(r.status === 200 && (await r.json()).test === true && stripeCalls.at(-1).auth === 'Bearer sk_test_t' && /price_t_pm/.test(stripeCalls.at(-1).body) && !/price_pm/.test(stripeCalls.at(-1).body),
      'cuenta marcada: Checkout con la clave y el precio de prueba: ' + JSON.stringify(stripeCalls.at(-1)?.auth));
    r = await req('POST', '/api/billing/checkout', { headers: { Cookie: ivo }, body: { product: 'pro-month' } });
    ok(r.status === 200 && stripeCalls.at(-1).auth === 'Bearer sk_test' && /price_pm/.test(stripeCalls.at(-1).body) && !(await meOf(ivo)).billingTest, 'otra cuenta: Checkout real (clave y precio reales)');

    // Webhooks: each endpoint with its own secret.
    const tpack = { id: 'evt_t1', type: 'checkout.session.completed', livemode: false, data: { object: { mode: 'payment', payment_status: 'paid', currency: 'eur', amount_total: 1210, total_details: { amount_tax: 210 }, customer: 'cus_test_tess', metadata: { sub: '1515', product: 'credits-500' } } } };
    ok((await hookT(tpack, 'whsec_x')).status === 400 && (await hook(tpack, 'whsec_t')).status === 400, 'webhook de prueba solo con su secreto (y el real solo con el suyo)');
    const c0 = TS().get('credits');
    ok((await hookT(tpack)).status === 200 && (await hookT(tpack)).status === 200, 'webhook de prueba firmado (y repetido)');
    { const e = TS().get('ledger').at(-1);
      ok(TS().get('credits') === c0 + 500 && e.reason === 'purchase' && e.test === true && e.delta === 500, 'compra de prueba: los créditos, marcados de prueba en el historial (una sola vez): ' + JSON.stringify(e));
      ok(TS().get('lots').some(l => l.test && l.n === 500) && TS().get('customerTest') === 'cus_test_tess' && !TS().get('customer'), 'lote de prueba aparte; cliente de Stripe de prueba guardado aparte'); }
    me = await meOf(tess); ok(me.portal === true, '/api/me: con algo pagado en su modo (prueba), «Gestionar la suscripción»');
    const end = Math.floor(Date.now() / 1000) + 30 * 86400, start = end - 30 * 86400;
    await hookT({ id: 'evt_t2', type: 'invoice.paid', livemode: false, data: { object: { customer: 'cus_test_tess', currency: 'eur', amount_paid: 1210, tax: 210, billing_reason: 'subscription_create',
      parent: { subscription_details: { subscription: 'sub_t1', metadata: { sub: '1515' } } }, lines: { data: [{ period: { start, end }, price: { id: 'price_t_pm' } }] } } } });
    me = await meOf(tess);
    ok(me.plan === 'pro' && TS().get('plan').test === true && TS().get('ledger').some(e => e.reason === 'pro' && e.test && e.delta === 1000), 'Pro de prueba: el plan marcado y sus créditos del mes de prueba: ' + JSON.stringify(TS().get('plan')));
    { const evs = [...FS().values()].filter(v => v?.kind === 'payment' && ['evt_t1', 'evt_t2'].includes(v.ref));
      ok(evs.length === 2 && evs.every(v => v.test) && evs.find(v => v.ref === 'evt_t2').product === 'pro-month' && FS().get('ts:sub_t1') && !FS().get('s:sub_t1'), 'finanzas: pagos de prueba marcados; la suscripción de prueba aparte: ' + JSON.stringify(evs.map(v => v.product)));
      ok(D()['test.pay.n'] === 2 && (D()['pay.n'] || 0) === pay0 && D()['test.cr.sold'] === 500, 'finanzas: los pagos de prueba se cuentan aparte'); }
    { const s1 = await sum(), t0 = s0.totals, t1 = s1.totals;
      ok(['gross', 'tax', 'fees', 'refunds', 'revenue', 'net', 'profit', 'mrr'].every(k => t0[k] === t1[k]) && s1.subscriptions.new === s0.subscriptions.new && s1.subscriptions.active === s0.subscriptions.active
        && s1.credits.sold === s0.credits.sold && s1.users.conversion === s0.users.conversion && JSON.stringify(s1.credits.granted) === JSON.stringify(s0.credits.granted) && s1.revenue.payments === s0.revenue.payments,
        'resumen: lo de prueba no entra en ingresos, comisiones, neto, MRR, altas, conversión ni créditos: ' + JSON.stringify([t0.net, t1.net, t0.mrr, t1.mrr]));
      ok(s1.test.payments === 2 && s1.test.gross === 24.2 && s1.test.newSubs === 1 && s1.test.active === 1 && s1.test.credits.sold === 500 && s1.test.credits.granted >= 1500, 'resumen: «Pruebas» aparte: ' + JSON.stringify(s1.test));
      const csv = await (await adm('GET', `/finance/export.csv?from=${today}&to=${today}`)).text(); ok(!/evt_t1|evt_t2/.test(csv), 'CSV de la gestoría: sin pagos de prueba'); }

    // The guard: a test event never touches an account that isn't in test mode (unless STRIPE_MODE=test).
    const ic0 = IS().get('credits');
    r = await hookT({ id: 'evt_t3', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', currency: 'eur', amount_total: 1210, customer: 'cus_t_ivo', metadata: { sub: '1616', product: 'credits-500' } } } });
    ok(r.status === 200 && (await r.json()).ignored === true && IS().get('credits') === ic0 && !IS().get('customerTest') && ![...FS().values()].some(v => v?.ref === 'evt_t3'), 'evento de prueba para una cuenta sin la marca: se ignora (ni créditos ni finanzas)');
    r = await hookT({ id: 'evt_t3b', type: 'charge.refunded', data: { object: { currency: 'eur', amount_refunded: 100 } } });
    ok(r.status === 200 && (await r.json()).ignored === true, 'evento de prueba sin cuenta: se ignora');
    // A real Pro is never replaced nor ended by test mode.
    await hook({ id: 'evt_l9', type: 'invoice.paid', data: { object: { customer: 'cus_ivo', subscription_details: { metadata: { sub: '1616' } }, lines: { data: [{ period: { end } }] } } } });
    env.STRIPE_MODE = 'test';
    me = await meOf(ivo); ok(me.billingTest === true && me.plan === 'pro', 'STRIPE_MODE=test: todas las cuentas en modo de prueba');
    r = await req('POST', '/api/billing/checkout', { headers: { Cookie: ivo }, body: { product: 'credits-500' } });
    ok(r.status === 200 && stripeCalls.at(-1).auth === 'Bearer sk_test_t' && /price_t_c500/.test(stripeCalls.at(-1).body) && !/customer=cus_ivo/.test(stripeCalls.at(-1).body), 'STRIPE_MODE=test: Checkout de prueba (sin el cliente real)');
    const ic1 = IS().get('credits');
    r = await hookT({ id: 'evt_t4', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', currency: 'eur', amount_total: 1210, customer: 'cus_t_ivo', metadata: { sub: '1616', product: 'credits-500' } } } });
    ok(r.status === 200 && !(await r.json()).ignored && IS().get('credits') === ic1 + 500 && IS().get('ledger').at(-1).test, 'STRIPE_MODE=test: el evento de prueba se aplica (marcado)');
    await hookT({ id: 'evt_t5', type: 'customer.subscription.deleted', data: { object: { id: 'sub_x', metadata: { sub: '1616' } } } });
    await hookT({ id: 'evt_t6', type: 'invoice.paid', data: { object: { customer: 'cus_t_ivo', subscription_details: { metadata: { sub: '1616' } }, lines: { data: [{ period: { end: end + 400 * 86400 } }] } } } });
    ok(IS().get('plan').name === 'pro' && !IS().get('plan').test && IS().get('plan').until < (end + 100 * 86400) * 1000, 'un evento de prueba no termina ni sustituye un Pro real: ' + JSON.stringify(IS().get('plan')));
    delete env.STRIPE_MODE;
    ok((await meOf(ivo)).billingTest === false, 'sin STRIPE_MODE: vuelve a pagos reales');

    // The admin's view: the flag, the test plan and ledger entries, the directory and the overview.
    x = await A('GET', '/users/1515');
    ok(x.j.billingTest?.reason === 'Probar compras sin dinero' && x.j.stored.test && x.j.ledger.some(e => e.test && e.reason === 'purchase') && x.j.customerTest && x.j.billingTestReady && x.j.directory.test && x.j.directory.billingTest && x.j.directory.testCredits >= 500,
      'ficha: modo de prueba, Pro y movimientos de prueba: ' + JSON.stringify([x.j.billingTest, x.j.stored, x.j.directory]));
    x = await A('GET', '/stats'); ok(x.j.test.accounts === 1 && x.j.test.pro === 1 && x.j.test.credits >= 500, 'resumen: lo de prueba aparte: ' + JSON.stringify(x.j.test));

    // «Quitar lo de prueba»: test Pro and test credits go; the real ones stay (audited).
    const real = TS().get('lots').filter(l => !l.test).reduce((t, l) => t + l.n, 0);
    x = await A('POST', '/clear-test', { body: { sub: '1515' } });
    me = await meOf(tess);
    ok(x.status === 200 && x.j.removed.credits === 1500 && x.j.removed.pro && me.plan === 'free' && me.credits === real && !TS().get('lots').some(l => l.test), 'quitar lo de prueba: Pro y créditos de prueba fuera, los reales se quedan: ' + JSON.stringify([x.j.removed, me.credits, real]));
    ok(TS().get('ledger').at(-1).delta === -1500 && TS().get('ledger').at(-1).test && (D()['cr.out.admin'] || 0) === crAdmin0 && D()['test.cr.out'] >= 1500, 'quitar lo de prueba: en el historial (de prueba) y fuera de las cifras reales');
    ok((await A('POST', '/clear-test', { body: { sub: 'nadie' } })).status === 404, 'quitar lo de prueba: cuenta inexistente → 404');
    // Real credits are never taken: a second clear removes nothing.
    await A('POST', '/credits', { body: { sub: '1515', delta: 20, reason: 'real' } });
    x = await A('POST', '/clear-test', { body: { sub: '1515' } }); ok(x.j.removed.credits === 0 && !x.j.removed.pro && TS().get('credits') === real + 20, 'quitar lo de prueba otra vez: nada real se toca');
    { const acts = (await A('GET', '/audit?target=1515')).j.entries.map(e => e.action); ok(acts.includes('billing-test-on') && acts.filter(a => a === 'clear-test').length === 2, 'auditoría: activar el modo de prueba y quitar lo de prueba: ' + acts); }
    x = await A('POST', '/billing-test', { body: { sub: '1515', on: false, reason: 'Pruebas terminadas' } });
    me = await meOf(tess); r = await req('POST', '/api/billing/checkout', { headers: { Cookie: tess }, body: { product: 'pro-month' } });
    ok(x.status === 200 && !x.j.after.billingTest && me.billingTest === false && r.status === 200 && stripeCalls.at(-1).auth === 'Bearer sk_test' && (await A('GET', '/audit?target=1515')).j.entries[0].action === 'billing-test-off',
      'modo de prueba desactivado: vuelve a pagar de verdad (auditado)');
    for (const k of ['STRIPE_TEST_SECRET_KEY', 'STRIPE_TEST_WEBHOOK_SECRET', 'STRIPE_TEST_PRICE_PRO_MONTH', 'STRIPE_TEST_PRICE_CREDITS_500']) delete env[k];
  }

  // ---- Promotions (admin.js promosApi: Stripe's promotion codes) and Pro's free trial (api.js trialConfig) ----
  {
    const FS = () => env.FINANCE.inst.get('global').ctx.storage.m, today = new Date().toISOString().slice(0, 10), D = () => FS().get('d:' + today) || {};
    const meOf = async c => (await req('GET', '/api/me', { headers: { Cookie: c } })).json();
    const login = async (tok, lang) => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok, terms: TERMS, ...(lang && { lang }) } }));
    // Stripe, simulated: coupons, promotion codes, prices (→ their product), an invoice's discounts.
    const fake = { coupons: new Map(), promos: new Map(), calls: [], deny: false, oldApi: false };
    const prev = env.FETCH;
    env.FETCH = async (u, init = {}) => {
      const s = String(u); if (!/^https:\/\/api\.stripe\.com\/v1\/(coupons|promotion_codes|prices\/|invoices\/)/.test(s)) return prev(u, init);
      const method = init.method || 'GET', b = new URLSearchParams(init.body ? String(init.body) : ''), path = new URL(s).pathname.slice(3);
      fake.calls.push({ s, method, auth: init.headers?.Authorization, b });
      if (fake.deny) return Response.json({ error: { type: 'invalid_request_error', message: "The provided key 'rk_live_***' does not have the required permissions for this endpoint on account 'acct_1'. Having the 'rak_coupon_write' permission would allow this request to continue." } }, { status: 403 });
      if (path.startsWith('/prices/')) return Response.json({ id: path.slice(8), product: 'prod_' + path.slice(8) });
      if (path === '/invoices/in_7') return Response.json({ id: 'in_7', discounts: [{ id: 'di_1', promotion_code: 'promo_1' }] });
      if (path === '/coupons' && method === 'POST') {
        const id = 'cp_' + (fake.coupons.size + 1), c = { id, object: 'coupon', valid: true, percent_off: b.get('percent_off') ? +b.get('percent_off') : null, amount_off: b.get('amount_off') ? +b.get('amount_off') : null,
          currency: b.get('currency'), duration: b.get('duration'), duration_in_months: b.get('duration_in_months') ? +b.get('duration_in_months') : null, applies_to: b.getAll('applies_to[products][]').length ? { products: b.getAll('applies_to[products][]') } : undefined };
        fake.coupons.set(id, c); return Response.json(c);
      }
      if (path === '/coupons' && method === 'GET') return Response.json({ data: [...fake.coupons.values()] });
      if (path.startsWith('/coupons/') && method === 'DELETE') { fake.coupons.delete(path.slice(9)); return Response.json({ deleted: true }); }
      if (path === '/promotion_codes' && method === 'POST') {
        if (fake.oldApi && b.has('promotion[coupon]')) return Response.json({ error: { type: 'invalid_request_error', param: 'promotion', message: 'Received unknown parameter: promotion' } }, { status: 400 });
        const id = 'promo_' + (fake.promos.size + 1), cid = b.get('promotion[coupon]') || b.get('coupon');
        const pc = { id, object: 'promotion_code', code: b.get('code'), active: true, times_redeemed: 0, max_redemptions: b.get('max_redemptions') ? +b.get('max_redemptions') : null, expires_at: b.get('expires_at') ? +b.get('expires_at') : null,
          restrictions: { first_time_transaction: b.get('restrictions[first_time_transaction]') === 'true' }, metadata: { ...(b.get('metadata[per_customer]') && { per_customer: b.get('metadata[per_customer]') }), applies: b.get('metadata[applies]') || '' },
          livemode: !/sk_test_t/.test(init.headers.Authorization), ...(b.has('coupon') ? { coupon: fake.coupons.get(cid) } : { promotion: { type: 'coupon', coupon: cid } }) };
        fake.promos.set(id, pc); return Response.json(pc);
      }
      if (path === '/promotion_codes' && method === 'GET') return Response.json({ data: [...fake.promos.values()] });
      const m = path.match(/^\/promotion_codes\/(promo_\d+)$/), pc = m && fake.promos.get(m[1]);
      if (pc && method === 'POST') { pc.active = b.get('active') === 'true'; return Response.json(pc); }
      if (pc) return Response.json(pc);
      return Response.json({ error: { message: 'No such object' } }, { status: 404 });
    };

    // Checkout: promotion codes allowed, subscriptions and one-off purchases alike.
    const ada = await login('tok-ada');
    stripeCalls = [];
    await req('POST', '/api/billing/checkout', { headers: { Cookie: ada }, body: { product: 'pro-month' } });
    await req('POST', '/api/billing/checkout', { headers: { Cookie: ada }, body: { product: 'credits-500' } });
    ok(stripeCalls.length === 2 && stripeCalls.every(c => /(^|&)allow_promotion_codes=true(&|$)/.test(c.body)) && !stripeCalls.some(c => /trial_period_days/.test(c.body)),
      'Checkout: «Añadir código promocional» (allow_promotion_codes) en Pro y en paquetes; sin prueba gratis si no está activada');

    // Creating a code: a coupon (the discount, what it applies to) and its promotion code (limits); audited.
    ok((await A('POST', '/promos', { body: { code: 'x', percent: 30, duration: 'once' } })).status === 400 && (await A('POST', '/promos', { body: { code: 'BIEN', percent: 0, duration: 'once' } })).status === 400
      && (await A('POST', '/promos', { body: { code: 'BIEN', percent: 10, duration: 'siempre' } })).status === 400 && (await A('POST', '/promos', { body: { code: 'BIEN', amount: 5, currency: 'gbp', duration: 'once' } })).status === 400
      && (await A('POST', '/promos', { body: { code: 'BIEN', percent: 10, duration: 'once', expires: '2020-01-01' } })).status === 400 && !fake.calls.length, 'promociones: código, descuento, duración, moneda o caducidad inválidos → 400 (sin llamar a Stripe)');
    const exp = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10);
    x = await A('POST', '/promos', { body: { code: 'lanzamiento30', percent: 30, duration: 'repeating', months: 3, appliesTo: ['pro'], maxRedemptions: 100, expires: exp, firstTime: true, perCustomer: 1, reason: 'Lanzamiento' } });
    { const cp = fake.calls.find(c => c.s.endsWith('/v1/coupons') && c.method === 'POST'), pc = fake.calls.find(c => c.s.endsWith('/v1/promotion_codes') && c.method === 'POST');
      ok(x.status === 200 && x.j.code.code === 'LANZAMIENTO30' && x.j.code.status === 'active' && x.j.mode === 'live', 'promociones: código creado: ' + JSON.stringify(x.j));
      ok(cp && cp.auth === 'Bearer sk_test' && cp.b.get('percent_off') === '30' && cp.b.get('duration') === 'repeating' && cp.b.get('duration_in_months') === '3' && cp.b.getAll('applies_to[products][]').join() === 'prod_price_pm'
        && fake.calls.some(c => c.s.endsWith('/v1/prices/price_pm')), 'promociones: cupón en Stripe (30 %, 3 meses, solo el producto de Pro, sacado de STRIPE_PRICE_*): ' + cp?.b);
      ok(pc && pc.b.get('promotion[coupon]') === 'cp_1' && pc.b.get('promotion[type]') === 'coupon' && pc.b.get('code') === 'LANZAMIENTO30' && pc.b.get('max_redemptions') === '100' && pc.b.get('restrictions[first_time_transaction]') === 'true'
        && pc.b.get('metadata[per_customer]') === '1' && +pc.b.get('expires_at') === Math.floor(Date.parse(exp + 'T23:59:59Z') / 1000), 'promociones: código promocional (máximo de usos, caducidad, solo clientes nuevos, límite por cliente): ' + pc?.b); }
    { const e = (await A('GET', '/audit?target=promo:LANZAMIENTO30')).j.entries[0];
      ok(e?.action === 'promo-create' && e.by === 'jefe@example.com' && e.reason === 'Lanzamiento' && e.after.mode === 'live' && e.after.coupon.percent === 30, 'promociones: en la auditoría: ' + JSON.stringify(e)); }
    // (Stripe's older API: coupon instead of promotion[coupon].)
    fake.oldApi = true; x = await A('POST', '/promos', { body: { code: 'VIEJO10', percent: 10, duration: 'forever' } }); fake.oldApi = false;
    ok(x.status === 200 && fake.calls.at(-1).b.get('coupon') === 'cp_2' && x.j.code.coupon.duration === 'forever', 'promociones: con la API antigua de Stripe (coupon) también');
    // Listing (from Stripe, cached a minute), deactivating and reactivating (audited).
    let n0 = fake.calls.length; x = await A('GET', '/promos');
    { const c = x.j.codes.find(y => y.code === 'LANZAMIENTO30');
      ok(x.status === 200 && x.j.mode === 'live' && x.j.cached === false && c.status === 'active' && c.times === 0 && c.max === 100 && c.firstTime && c.perCustomer === 1 && c.coupon.percent === 30 && c.coupon.months === 3 && !c.test, 'promociones: lista con estado y usos: ' + JSON.stringify(c)); }
    x = await A('GET', '/promos'); ok(x.j.cached === true && fake.calls.length === n0 + 2, 'promociones: la lista se guarda un rato (no se pide a Stripe otra vez)');
    x = await A('POST', '/promos/promo_1/active', { body: { active: false, reason: 'Fin de la campaña' } });
    ok(x.status === 200 && fake.calls.at(-1).s.endsWith('/v1/promotion_codes/promo_1') && fake.calls.at(-1).b.get('active') === 'false' && x.j.code.status === 'inactive', 'promociones: desactivar');
    ok((await A('GET', '/promos')).j.codes.find(y => y.id === 'promo_1').status === 'inactive', 'promociones: la lista se renueva tras un cambio');
    ok((await A('GET', '/audit?target=promo:LANZAMIENTO30')).j.entries[0].action === 'promo-deactivate', 'promociones: desactivar, auditado');
    x = await A('POST', '/promos/promo_1/active', { body: { active: true } }); ok(x.status === 200 && x.j.code.active && (await A('GET', '/audit?target=promo:LANZAMIENTO30')).j.entries[0].action === 'promo-reactivate', 'promociones: reactivar (auditado)');
    ok((await A('POST', '/promos/promo_1/active', { body: { active: 'no' } })).status === 400 && (await A('POST', '/promos/nada/active', { body: { active: true } })).status === 404, 'promociones: peticiones mal formadas');
    // Test mode: its key; without it, a clear 503.
    ok((await A('GET', '/promos?mode=test')).status === 503, 'promociones de prueba sin STRIPE_TEST_SECRET_KEY → 503');
    env.STRIPE_TEST_SECRET_KEY = 'sk_test_t';
    x = await A('POST', '/promos', { body: { mode: 'test', code: 'PRUEBA5', amount: 5, currency: 'eur', duration: 'once', appliesTo: ['pro', 'credits', 'team'] } });
    { const cp = fake.calls.filter(c => c.s.endsWith('/v1/coupons') && c.method === 'POST').at(-1);
      ok(x.status === 200 && x.j.mode === 'test' && cp.auth === 'Bearer sk_test_t' && cp.b.get('amount_off') === '500' && cp.b.get('currency') === 'eur' && !cp.b.has('applies_to[products][]'), 'promociones de prueba: con la clave de prueba; 5 € una vez, para todo'); }
    x = await A('GET', '/promos?mode=test'); ok(x.j.mode === 'test' && x.j.codes.some(y => y.code === 'PRUEBA5' && y.test), 'promociones de prueba: marcadas «prueba»');
    ok((await A('GET', '/audit?target=promo:PRUEBA5')).j.entries[0].after.mode === 'test', 'promociones de prueba: auditadas con su modo');
    delete env.STRIPE_TEST_SECRET_KEY;
    // A restricted key without the permissions: the message says which ones to add.
    fake.deny = true; resetPromoCache();
    for (const [m, p, b] of [['POST', '/promos', { code: 'NOPERM', percent: 10, duration: 'once', appliesTo: ['pro'] }], ['GET', '/promos'], ['POST', '/promos/promo_1/active', { active: false }]]) {
      x = await A(m, p, b && { body: b });
      ok(x.status === 502 && x.j.error === 'stripe permissions' && ['Coupons: Write', 'Promotion Codes: Write', 'Products: Read', 'Prices: Read'].every(k => x.j.message.includes(k)) && /STRIPE_SECRET_KEY/.test(x.j.message),
        `promociones: sin permisos en la clave (${m} ${p}) → mensaje claro: ` + x.j?.message);
    }
    fake.deny = false;
    // Access: the same checks as the rest of the admin API.
    ok((await adm('GET', '/promos', { token: null })).status === 403 && (await adm('GET', '/promos', { host: SITE })).status === 404 && (await adm('POST', '/promos', { origin: 'https://malo.example', body: {} })).status === 403
      && (await adm('POST', '/promos/trial', { origin: 'https://malo.example', body: {} })).status === 403, 'promociones: solo administración');

    // Discounts in the business's accounts: gross before the discount, the discount, and per code.
    const s0 = (await A('GET', `/finance/summary?from=${today}&to=${today}&group=day`)).j;
    await hook({ id: 'evt_pr1', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', currency: 'eur', amount_total: 900, total_details: { amount_tax: 0, amount_discount: 300 },
      discounts: [{ coupon: 'cp_1', promotion_code: 'promo_1' }], customer: 'cus_ada', metadata: { sub: '1717', product: 'credits-500' } } } });
    const pend = Math.floor(Date.now() / 1000) + 30 * 86400;
    await hook({ id: 'evt_pr2', type: 'invoice.paid', data: { object: { object: 'invoice', id: 'in_7', customer: 'cus_ada', currency: 'eur', amount_paid: 847, tax: 147, billing_reason: 'subscription_create',
      total_discount_amounts: [{ amount: 363, discount: 'di_1' }], discounts: ['di_1'], parent: { subscription_details: { subscription: 'sub_pr', metadata: { sub: '1717' } } }, lines: { data: [{ period: { start: pend - 30 * 86400, end: pend }, price: { id: 'price_pm' } }] } } } });
    { const ev = [...FS().values()].filter(v => v?.kind === 'payment' && ['evt_pr1', 'evt_pr2'].includes(v.ref));
      ok(ev.length === 2 && ev.every(v => v.promo === 'LANZAMIENTO30') && ev.find(v => v.ref === 'evt_pr1').discount === 300 && ev.find(v => v.ref === 'evt_pr2').discount === 363, 'finanzas: el descuento y el código usado (de Checkout y de la factura): ' + JSON.stringify(ev.map(v => [v.discount, v.promo]))); }
    const s1 = (await A('GET', `/finance/summary?from=${today}&to=${today}&group=day`)).j;
    ok(Math.abs(s1.totals.discounts - s0.totals.discounts - 6.63) < 0.001 && Math.abs(s1.totals.list - s1.totals.gross - s1.totals.discounts) < 0.001 && Math.abs(s1.totals.gross - s0.totals.gross - 17.47) < 0.001,
      'resumen: bruto antes del descuento, descuento y lo cobrado: ' + JSON.stringify([s1.totals.list, s1.totals.discounts, s1.totals.gross]));
    ok(s1.promos.LANZAMIENTO30?.n === 2 && s1.promos.LANZAMIENTO30.discount === 6.63 && s1.promos.LANZAMIENTO30.gross === 17.47, 'resumen: cifras por código: ' + JSON.stringify(s1.promos));
    { const c = (await A('GET', '/promos')).j.codes.find(y => y.code === 'LANZAMIENTO30');
      ok(c.revela?.uses === 2 && c.revela.discount === 6.63 && c.revela.customers === 1 && c.revela.overLimit === 1, 'promociones: usos según Revela y por encima del límite por cliente: ' + JSON.stringify(c.revela)); }
    { const csv = await (await adm('GET', `/finance/export.csv?from=${today}&to=${today}`)).text(); ok(/descuento 3 EUR, código LANZAMIENTO30/.test(csv), 'CSV: el descuento y el código en el concepto'); }

    // Pro's free trial: settings from the admin (checked, audited).
    ok((await A('GET', '/promos/trial')).j.config.trialDays === 0, 'prueba gratis: apagada por defecto');
    ok((await A('POST', '/promos/trial', { body: { trialDays: -1, trialCredits: 100, trialOncePerAccount: true } })).status === 400 && (await A('POST', '/promos/trial', { body: { trialDays: 7, trialCredits: 100 } })).status === 400, 'prueba gratis: ajustes inválidos → 400');
    x = await A('POST', '/promos/trial', { body: { trialDays: 7, trialCredits: 100, trialOncePerAccount: true, reason: 'Probar la prueba' } });
    ok(x.status === 200 && x.j.after.trialDays === 7 && x.j.before.trialDays === 0 && (await A('GET', '/audit?target=config:trial')).j.entries[0]?.action === 'trial-config', 'prueba gratis: activada (auditado)');
    // Who gets it: an account that never had Pro, yes; one with a paid Pro or with a plan from before, no.
    const bea = await login('tok-bea', 'en'), cid = await login('tok-cid'), BS = () => acc('1818').ctx.storage.m;
    me = await meOf(bea); ok(me.trialDays === 7, '/api/me: prueba de 7 días disponible para una cuenta nueva');
    stripeCalls = [];
    await req('POST', '/api/billing/checkout', { headers: { Cookie: bea }, body: { product: 'pro-month' } });
    ok(/subscription_data%5Btrial_period_days%5D=7/.test(stripeCalls.at(-1).body) && /subscription_data%5Bmetadata%5D%5Btrial%5D=7/.test(stripeCalls.at(-1).body) && /payment_method_collection=always/.test(stripeCalls.at(-1).body)
      && /allow_promotion_codes=true/.test(stripeCalls.at(-1).body), 'Checkout de Pro: 7 días de prueba (con tarjeta) y códigos promocionales: ' + stripeCalls.at(-1).body.slice(0, 120));
    await req('POST', '/api/billing/checkout', { headers: { Cookie: bea }, body: { product: 'credits-500' } });
    ok(!/trial_period_days/.test(stripeCalls.at(-1).body), 'la prueba es solo para Pro (no para paquetes)');
    await req('POST', '/api/billing/checkout', { headers: { Cookie: await login('tok-ivo') }, body: { product: 'pro-month' } });
    ok(!/trial_period_days/.test(stripeCalls.at(-1).body), 'una cuenta que ya pagó Pro: sin prueba');
    acc('1919').ctx.storage.m.set('plan', { name: 'free', until: 0 });
    me = await meOf(cid); await req('POST', '/api/billing/checkout', { headers: { Cookie: cid }, body: { product: 'pro-month' } });
    ok(me.trialDays === 0 && !/trial_period_days/.test(stripeCalls.at(-1).body), 'una cuenta con un plan de antes (pagado): sin prueba');
    // The trial starts (Stripe's 0 invoice): Pro, but only the trial's credits.
    const c0 = BS().get('credits'), tend = Math.floor(Date.now() / 1000) + 7 * 86400;
    const tinv = (id, extra) => ({ id, type: 'invoice.paid', data: { object: { customer: 'cus_bea', currency: 'eur', amount_paid: 0, billing_reason: 'subscription_create',
      parent: { subscription_details: { subscription: 'sub_tr1', metadata: { sub: '1818', trial: '7' } } }, lines: { data: [{ period: { start: tend - 7 * 86400, end: tend }, price: { id: 'price_pm' } }] }, ...extra } } });
    const tr0 = D()['trial.start'] || 0;
    await hook(tinv('evt_tr1')); await hook(tinv('evt_tr1b'));
    me = await meOf(bea);
    ok(me.plan === 'pro' && me.features.includes('share-people') && me.trial?.until > Date.now() && me.trialDays === 0 && BS().get('plan').trial, 'prueba: Pro con sus funciones, y la app sabe hasta cuándo: ' + JSON.stringify([me.plan, me.trial]));
    ok(me.credits === c0 + 100 && BS().get('ledger').filter(e => e.reason === 'pro-trial').length === 1 && !BS().get('ledger').some(e => e.reason === 'pro'), 'prueba: solo los 100 créditos de la prueba (no los 1000 del mes), una vez: ' + me.credits);
    ok(D()['trial.start'] === tr0 + 1 && D()['cr.in.pro-trial'] >= 100, 'finanzas: prueba empezada (una vez)');
    // Three days before its end: the reminder (in the person's language; optional, with the way out).
    sent = [];
    const willEnd = (id, end) => hook({ id, type: 'customer.subscription.trial_will_end', data: { object: { id: 'sub_tr1', status: 'trialing', trial_end: end, metadata: { sub: '1818', trial: '7' } } } });
    await willEnd('evt_tw1', tend); await willEnd('evt_tw1b', tend);
    { const m = sent.filter(y => y.to === 'bea@example.com');
      ok(m.length === 1 && /Your Revela Pro trial ends on/.test(m[0].subject) && /Manage subscription/.test(m[0].text) && /1000 credits/.test(m[0].text) && /\/api\/mail\/unsubscribe\?t=/.test(m[0].headers?.['List-Unsubscribe'] || ''),
        'aviso del fin de la prueba: una vez, en su idioma, con baja: ' + m[0]?.subject); }
    ok(/^Tu prueba de Revela Pro termina el/.test(render('trialEnding', 'es', { date: '1 de enero', credits: 1000, url: 'x' }).subject) && /^La teva prova de Revela Pro acaba el/.test(render('trialEnding', 'ca', { date: '1 de gener', credits: 1000, url: 'x' }).subject),
      'aviso del fin de la prueba: en español y catalán');
    await req('POST', '/api/mail/prefs', { headers: { Cookie: bea }, body: { off: ['trialEnding'] } }); sent = [];
    await willEnd('evt_tw2', tend + 86400);
    ok(!sent.some(y => y.to === 'bea@example.com') && (await (await req('GET', '/api/mail/prefs', { headers: { Cookie: bea } })).json()).optional.includes('trialEnding'), 'aviso del fin de la prueba: se puede desactivar');
    // Converted: the first paid invoice brings the month's credits.
    const c1 = BS().get('credits');
    await hook(tinv('evt_tr2', { amount_paid: 1210, tax: 210, billing_reason: 'subscription_cycle', lines: { data: [{ period: { start: tend, end: tend + 30 * 86400 }, price: { id: 'price_pm' } }] } }));
    me = await meOf(bea);
    ok(me.plan === 'pro' && !me.trial && !BS().get('plan').trial && BS().get('proPaid') && me.credits === c1 + 1000, 'prueba convertida: Pro pagado y sus 1000 créditos del mes: ' + JSON.stringify([me.credits, c1]));
    ok(D()['trial.convert'] === 1 && FS().get('tr:sub_tr1').convert > 0, 'finanzas: prueba convertida');
    // Another one, cancelled before paying: once per account, unless the admin allows trials again.
    const dan = await login('tok-dan'), DS = () => acc('2020').ctx.storage.m;
    const dinv = { id: 'evt_td1', type: 'invoice.paid', data: { object: { customer: 'cus_dan', currency: 'eur', amount_paid: 0, billing_reason: 'subscription_create',
      parent: { subscription_details: { subscription: 'sub_tr2', metadata: { sub: '2020', trial: '7' } } }, lines: { data: [{ period: { end: tend } }] } } } };
    await hook(dinv);
    await hook({ id: 'evt_td2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_tr2', metadata: { sub: '2020', trial: '7' } } } });
    await hook({ id: 'evt_td3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_tr1', metadata: { sub: '1818', trial: '7' } } } });
    me = await meOf(dan);
    ok(me.plan === 'free' && DS().get('trialUsed') && me.trialDays === 0 && D()['trial.cancel'] === 1, 'prueba cancelada: vuelve a gratis, cuenta como cancelada (la baja de una convertida no) y no se repite');
    await A('POST', '/promos/trial', { body: { trialDays: 14, trialCredits: 50, trialOncePerAccount: false } });
    ok((await meOf(dan)).trialDays === 14 && (await meOf(bea)).trialDays === 0, 'sin «una vez por cuenta»: otra prueba para quien no pagó; nunca para quien ya pagó Pro');
    // The figures: started, converted, cancelled, conversion.
    x = await A('GET', `/finance/summary?from=${today}&to=${today}&group=day`);
    ok(x.j.trials.started === 2 && x.j.trials.converted === 1 && x.j.trials.cancelled === 1 && x.j.trials.conversion === 0.5, 'resumen: pruebas empezadas, convertidas, canceladas y conversión: ' + JSON.stringify(x.j.trials));
    x = await A('GET', '/promos/trial');
    ok(x.j.config.trialDays === 14 && !x.j.config.trialOncePerAccount && x.j.stats.live.started === 2 && x.j.stats.live.converted === 1 && x.j.stats.live.conversion === 0.5 && x.j.stats.live.running === 0, 'promociones: ajustes y cifras de la prueba: ' + JSON.stringify(x.j));
    ok(x.j.config && (await A('GET', '/users/1818')).j.trial.used && (await A('GET', '/users/1818')).j.trial.paid, 'ficha: prueba usada y Pro pagado');
    await A('POST', '/promos/trial', { body: { trialDays: 0, trialCredits: 100, trialOncePerAccount: true } });
    ok((await meOf(dan)).trialDays === 0, 'prueba gratis apagada otra vez');
    env.FETCH = prev;
  }

  // Notices (notices.js): set from the admin, chosen by place, plan, language and dates; counted, nobody tracked.
  {
    const N = p => req('GET', '/api/notices?' + p).then(r => r.json());
    ok((await N('where=editor&lang=es')).notices.length === 0, 'avisos: ninguno al principio');
    ok((await A('POST', '/notices', { body: { notice: { title: 'x', where: ['editor'], url: 'javascript:alert(1)', cta: 'Ir' } } })).status === 400, 'avisos: un enlace que no es https → 400');
    ok((await A('POST', '/notices', { body: { notice: { title: 'x', where: [] } } })).status === 400, 'avisos: sin sitio → 400');
    let x = await A('POST', '/notices', { body: { notice: { title: 'Pásate a Pro', text: 'Un mes con IA', cta: 'Ver Pro', url: '#pro', where: ['editor', 'gallery'], who: 'free', langs: ['es'], tone: 'offer' }, reason: 'campaña' } });
    const id = x.j.notice.id;
    const others = [(await A('POST', '/notices', { body: { notice: { title: 'Solo Pro', where: ['editor'], who: 'pro' } } })).j.notice.id,
      (await A('POST', '/notices', { body: { notice: { title: 'Futuro', where: ['editor'], who: 'all', from: '2099-01-01' } } })).j.notice.id];
    const r = await N('where=editor&lang=es');
    ok(r.notices.length === 1 && r.notices[0].id === id && r.notices[0].url === '#pro' && !('who' in r.notices[0]), 'avisos: sin cuenta, el de cuentas gratis (no el de Pro ni el de más adelante): ' + JSON.stringify(r));
    ok((await N('where=editor&lang=en')).notices.length === 0 && (await N('where=web&lang=es')).notices.length === 0, 'avisos: por idioma y por sitio');
    for (const kind of ['view', 'click', 'nada']) await req('POST', '/api/notices/hit', { body: { id, kind } });
    const st = (await A('GET', '/notices')).j;
    ok(st.notices.length === 3 && st.stats[id].view === 1 && st.stats[id].click === 1 && st.stats[id].close === 0, 'avisos: vistas y clics contados: ' + JSON.stringify(st.stats[id]));
    ok((await A('GET', '/audit?target=notice:' + id)).j.entries.some(e => e.action === 'notice-create' && e.reason === 'campaña'), 'avisos: en la auditoría');
    x = await A('POST', '/notices', { body: { notice: { ...st.notices.find(n => n.id === id), active: false } } });
    ok((await N('where=editor&lang=es')).notices.length === 0, 'avisos: desactivado, ya no sale');
    for (const n of [id, ...others]) ok((await A('POST', `/notices/${n}/delete`, { body: {} })).status === 200, 'avisos: borrado');
    ok((await A('GET', '/notices')).j.notices.length === 0, 'avisos: ninguno al final');
  }

  // Captación (crm.js): the website's form, contacts found in OpenStreetMap (never emailed by themselves), sequences only to
  // who gave consent, the way out and the links of their emails, reminders, messages for calls, campaigns (visits, sign-ups, purchases).
  {
    env.CRM = namespace(Crm, env);
    env.LEADS_PER_DAY = '100';                             // (the tests send many from the same address)
    const prevF = env.FETCH, osmCalls = [];
    env.FETCH = async (u, init = {}) => { const s = String(u);
      if (s.startsWith('https://oauth2.googleapis.com/tokeninfo') && s.includes('access_token=tok-crm')) return Response.json({ aud: CID, sub: '3131', email: 'crm@example.com', email_verified: 'true', expires_in: 3000 });
      if (s.startsWith('https://nominatim.openstreetmap.org/')) { osmCalls.push({ s, ua: init.headers?.['User-Agent'] }); return Response.json([{ osm_type: 'relation', osm_id: 345, lat: '41.6', lon: '-0.9', display_name: 'Zaragoza, Aragón, España', address: { city: 'Zaragoza', state: 'Aragón', country_code: 'es' } }]); }
      // (The first of Overpass's servers unreachable from Cloudflare — 522, its HTML page — the next one answers.)
      if (s === 'https://z.overpass-api.de/api/interpreter') { osmCalls.push({ s }); return new Response('error code: 522', { status: 522 }); }
      if (s.endsWith('overpass-api.de/api/interpreter')) { osmCalls.push({ s, q: decodeURIComponent(String(init.body)) }); return Response.json({ elements: [
        { type: 'node', id: 1, lat: 41.6, lon: -0.9, tags: { name: 'CEIP Los Olivos', amenity: 'school', email: 'info@olivos.example', website: 'olivos.example', 'addr:street': 'Calle Mayor', 'addr:housenumber': '3' } },
        { type: 'way', id: 2, center: { lat: 41.7, lon: -0.8 }, tags: { name: 'IES Ebro', amenity: 'school', phone: '+34 976 000 000' } },
        { type: 'node', id: 3, tags: { amenity: 'school' } }] }); }
      return prevF(u, init); };
    const C = (m, p, o) => A(m, '/crm' + p, o);
    const lead = (b, o = {}) => req('POST', '/api/leads', { body: { name: 'Colegio Sol', person: 'Ana Ruiz', email: 'ana@sol.example', kind: 'school', city: 'Huesca', lang: 'es', privacy: true, ...b }, ...o });
    ok((await lead({ privacy: false })).status === 400, 'captación: el formulario sin aceptar la privacidad → 400');
    ok((await lead({}, { origin: 'https://malo.example' })).status === 403, 'captación: el formulario desde otra web → 403');
    ok((await lead({ email: 'nada' })).status === 400, 'captación: correo no válido → 400');
    sent = [];
    ok((await lead({ website: 'bot' })).status === 200 && !sent.length && (await C('GET', '/contacts')).j.all === 0, 'captación: un bot (campo trampa): nada guardado ni enviado');
    // Settings and a sequence started by requests.
    x = await C('POST', '/settings', { body: { settings: { identity: 'FM Lab · Zaragoza · revelaslides.com', replyTo: 'hola@fmlab.example', dailyMax: 10 } } });
    ok(x.status === 200 && x.j.settings.dailyMax === 10, 'captación: ajustes');
    x = await C('POST', '/sequences', { body: { seq: { name: 'Bienvenida a centros', trigger: 'lead', steps: [{ days: 0, subject: 'Hola, {nombre}', body: 'Gracias por tu interés en {centro}.\n\nMira https://revelaslides.com/schools' }, { days: 3, subject: '¿Qué tal?', body: 'Seguimos aquí.' }] } } });
    ok(x.status === 200 && x.j.seq.trigger === 'lead', 'captación: secuencia creada');
    const seqId = x.j.seq.id;
    ok((await C('POST', '/sequences', { body: { seq: { name: 'Sin pasos', steps: [] } } })).status === 400, 'captación: una secuencia sin pasos → 400');
    // A request without marketing consent: answered, never in a sequence.
    sent = [];
    ok((await lead({ marketing: false, message: 'Queremos una demo para el claustro' })).status === 200, 'captación: solicitud recibida');
    ok(sent.length === 1 && sent[0].to === 'ana@sol.example' && !sent[0].headers?.['List-Unsubscribe'] && sent[0].replyTo === 'hola@fmlab.example' && /FM Lab/.test(sent[0].text), 'captación: sin permiso comercial, solo el acuse (con la identidad y la respuesta a tu buzón)');
    let list = (await C('GET', '/contacts')).j, ana = list.items.find(c => c.name === 'Colegio Sol');
    ok(ana && ana.source === 'form' && !ana.consent && !ana.seq && ana.nextAt, 'captación: en la lista, sin consentimiento ni secuencia, con un recordatorio para responder');
    // With it: in the sequence, and the acknowledgement already has a way out.
    sent = [];
    ok((await lead({ name: 'Academia Luna', person: 'Luis', email: 'luis@luna.example', kind: 'academy', marketing: true, campaign: 'no-existe' })).status === 200, 'captación: solicitud con permiso');
    ok(sent.length === 1 && /\/api\/crm\/unsub\?t=/.test(sent[0].headers?.['List-Unsubscribe'] || ''), 'captación: el acuse lleva la baja en un clic');
    list = (await C('GET', '/contacts')).j; const luis = list.items.find(c => c.name === 'Academia Luna');
    ok(luis.consent && luis.seq?.id === seqId, 'captación: con permiso entra en la secuencia de solicitudes');
    // Searching OpenStreetMap; importing; never emailed by themselves.
    x = await C('GET', '/search?area=Zaragoza&kind=school');
    ok(x.status === 200 && x.j.items.length === 2 && x.j.items[0].name === 'CEIP Los Olivos' && x.j.items[0].web === 'https://olivos.example/' && x.j.items[0].address === 'Calle Mayor 3' && x.j.items[1].city === 'Zaragoza', 'captación: búsqueda en OpenStreetMap (los que no tienen nombre, fuera): ' + JSON.stringify(x.j.items[0]));
    ok(/area\(id:3600000345\)/.test(osmCalls.find(c => c.q)?.q || '') && /Revela/.test(osmCalls[0].ua || ''), 'captación: busca dentro de la zona, identificándose');
    ok(osmCalls.some(c => c.s.startsWith('https://z.')) && osmCalls.some(c => c.s.startsWith('https://lz4.') && c.q), 'captación: un servidor de Overpass caído (522), y lo pide al siguiente');
    ok((await C('GET', '/search?area=Zaragoza&kind=otra')).status === 400, 'captación: tipo desconocido → 400');
    x = await C('POST', '/import', { body: { source: 'osm', rows: x.j.items.map(i => ({ contact: i, osm: i.osm })) } });
    ok(x.j.added === 2, 'captación: importados');
    ok((await C('POST', '/import', { body: { source: 'osm', rows: [{ contact: { name: 'CEIP Los Olivos', email: 'info@olivos.example' }, osm: 'node/1' }] } })).j.updated === 1, 'captación: sin duplicados (mismo lugar o correo)');
    x = await C('GET', '/search?area=Zaragoza&kind=school');
    ok(x.j.items.every(i => i.known), 'captación: la búsqueda marca los que ya están');
    const olivos = (await C('GET', '/contacts?q=olivos')).j.items[0];
    ok((await C('POST', `/contacts/${olivos.id}/enroll`, { body: { seq: seqId } })).status === 409, 'captación: sin consentimiento no se puede meter en una secuencia');
    ok((await C('POST', `/contacts/${olivos.id}/consent`, { body: { how: 'x' } })).status === 400, 'captación: el consentimiento a mano necesita decir cómo');
    // The daily run: only Luis gets the sequence's email; the admin a summary.
    sent = []; await runCron(Date.now());
    const toLuis = sent.filter(m => m.to === 'luis@luna.example');
    ok(toLuis.length === 1 && toLuis[0].subject === 'Hola, Luis' && /Academia Luna/.test(toLuis[0].text) && /FM Lab/.test(toLuis[0].text) && toLuis[0].headers?.['List-Unsubscribe'] && toLuis[0].replyTo === 'hola@fmlab.example', 'captación: el correo de la secuencia, rellenado, con identidad, baja y respuesta: ' + JSON.stringify(toLuis[0]?.subject));
    ok(!sent.some(m => m.to === 'ana@sol.example' || m.to === 'info@olivos.example'), 'captación: nada a quien no dio permiso');
    const digest = sent.find(m => m.to === 'jefe@example.com');
    ok(digest && /Solicitudes nuevas/.test(digest.text) && /Colegio Sol/.test(digest.text) && /enviados hoy: 1/.test(digest.text), 'captación: resumen diario para la administración');
    ok(/\/api\/crm\/click\?t=/.test(toLuis[0].html) && !/href="https:\/\/revelaslides\.com\/centros"/.test(toLuis[0].html), 'captación: los enlaces del correo pasan por el contador');
    // A click: counted, and on to its address.
    const click = toLuis[0].html.match(/href="([^"]*\/api\/crm\/click\?t=[^"]+)"/)[1].replace(/&amp;/g, '&');
    r = await worker.fetch(new Request(click), env);
    ok(r.status === 302 && r.headers.get('Location') === 'https://revelaslides.com/schools', 'captación: el enlace lleva a su dirección');
    ok((await worker.fetch(new Request(SITE + '/api/crm/click?t=falso'), env)).headers.get('Location') === SITE + '/', 'captación: un enlace falsificado no lleva a ningún otro sitio');
    let sq = (await C('GET', '/sequences')).j;
    ok(sq.stats[seqId][0].sent === 1 && sq.stats[seqId][0].click === 1, 'captación: enviados y clics por paso');
    // The same day again: nothing twice. The second step 3 days later; but Luis leaves first (one click).
    sent = []; await runCron(Date.now()); ok(!sent.some(m => m.to === 'luis@luna.example'), 'captación: nada dos veces');
    const unsub = toLuis[0].headers['List-Unsubscribe'].slice(1, -1);
    r = await worker.fetch(new Request(unsub, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), env);
    ok(r.status === 200, 'captación: baja en un clic');
    ok((await worker.fetch(new Request(unsub.replace(/t=.{6}/, 't=xxxxxx')), env)).status === 400, 'captación: una baja falsificada no hace nada');
    const realNow0 = Date.now; Date.now = () => realNow0() + 4 * DAYms;
    sent = []; await runCron(Date.now()); Date.now = realNow0;
    ok(!sent.some(m => m.to === 'luis@luna.example'), 'captación: tras la baja, ni un correo más');
    x = await C('GET', `/contacts/${luis.id}`);
    ok(x.j.contact.unsub && !x.j.contact.seq && x.j.contact.history.some(h => h.what === 'unsub'), 'captación: la baja queda en su ficha');
    ok((await C('POST', `/contacts/${luis.id}/consent`, { body: { how: 'Me lo pidió por teléfono' } })).status === 409, 'captación: tras una baja, solo la propia persona puede volver a pedirlo');
    // Consent written down by the admin (when and how): then a sequence may write.
    ok((await C('POST', `/contacts/${olivos.id}/consent`, { body: { how: 'Lo pidió la jefa de estudios en la feria Didacta' } })).status === 200, 'captación: consentimiento anotado');
    ok((await C('POST', `/contacts/${olivos.id}/enroll`, { body: { seq: seqId } })).status === 200, 'captación: ahora sí entra en la secuencia');
    sent = []; await runCron(Date.now()); ok(sent.some(m => m.to === 'info@olivos.example'), 'captación: y recibe el primer paso');
    ok((await A('GET', '/audit?target=crm:' + olivos.id)).j.entries.some(e => e.action === 'crm-consent'), 'captación: el consentimiento queda en la auditoría');
    // By hand: a call logged, its follow-up; a message ready for the call.
    x = await C('POST', `/contacts/${ana.id}/log`, { body: { channel: 'phone', text: 'Hablé con la jefa de estudios', nextDays: 7, nextWhat: 'Enviar la propuesta' } });
    ok(x.j.contact.status === 'contacted' && x.j.contact.nextWhat === 'Enviar la propuesta' && x.j.contact.nextAt > Date.now() + 6 * DAYms, 'captación: contacto anotado con su seguimiento');
    x = await C('POST', `/contacts/${olivos.id}/message`, { body: { tpl: 'tplcall1', me: 'Francisco' } });
    ok(/CEIP Los Olivos/.test(x.j.body) && /Francisco/.test(x.j.body) && x.j.channel === 'phone', 'captación: guion de llamada rellenado');
    // Emails by hand (crm-reply.js): a template filled, edited, tried on oneself, sent only with consent; answers kept.
    {
      ok((await C('GET', '/templates')).j.tpls.some(t => t.id === 'tplmail1' && t.channel === 'email'), 'captación: plantillas de correo para centros y empresas');
      const draft = { subject: 'Revela para {centro}', body: 'Hola{nombre_coma}:\n\nTe cuento lo que hablamos.\n\n{yo}' };
      await C('POST', '/settings', { body: { settings: { signer: 'Francisco' } } });
      ok((await C('POST', `/contacts/${ana.id}/send`, { body: draft })).status === 409, 'correo a mano: sin consentimiento no se envía');
      ok((await C('POST', `/contacts/${ana.id}/send`, { body: { ...draft, test: 'no es correo' } })).status === 400, 'correo a mano: la prueba necesita una dirección válida');
      // Answers received here: Resend's signed webhook.
      const secret = 'whsec_' + btoa('clave-del-webhook-de-resend!!'), hookAt = Date.now();
      env.RESEND_WEBHOOK_SECRET = secret;
      sent = []; x = await C('POST', `/contacts/${ana.id}/send`, { body: { ...draft, test: 'yo@fmlab.example' } });
      const t0 = sent[0];
      ok(x.status === 200 && x.j.test && t0.to === 'yo@fmlab.example' && t0.subject === '[Prueba] Revela para Colegio Sol' && /Hola, Ana Ruiz/.test(t0.text) && /Francisco/.test(t0.text) && !t0.headers?.['List-Unsubscribe'], 'correo a mano: la prueba, a mi dirección, rellenada y editada: ' + JSON.stringify(t0 && [t0.subject, t0.to]));
      ok(/^respuestas\+c\d+t-[0-9a-f]{16}@revelaslides\.com$/.test(t0.replyTo || ''), 'correo a mano: las respuestas a la prueba vuelven aquí: ' + t0.replyTo);
      ok((await C('GET', `/contacts/${ana.id}`)).j.contact.status === 'contacted' && !(await C('GET', `/contacts/${ana.id}`)).j.contact.mailed, 'correo a mano: la prueba no cuenta como enviada');
      const hook = async (data, { sig = secret, ts = Math.floor(hookAt / 1000) } = {}) => {
        const b = JSON.stringify({ type: 'email.received', created_at: new Date().toISOString(), data }), id = 'msg_' + Math.random().toString(36).slice(2);
        const k = await crypto.subtle.importKey('raw', Uint8Array.from(atob(sig.slice(6)), ch => ch.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const v = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${id}.${ts}.${b}`)))));
        return worker.fetch(new Request(SITE + '/api/crm/inbound', { method: 'POST', body: b, headers: { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': 'v1,' + v } }), env);
      };
      const prevF5 = env.FETCH; env.RESEND_KEY = 're_prueba';
      env.FETCH = async (u, init) => (String(u).startsWith('https://api.resend.com/emails/receiving/') ? Response.json({ from: 'Yo <yo@fmlab.example>', subject: 'Re: [Prueba] Revela para Colegio Sol', text: 'Funciona, me llega bien.', html: '<p>Funciona</p>' }) : prevF5(u, init));
      ok((await hook({ email_id: 'e1', from: 'yo@fmlab.example', to: [t0.replyTo], subject: 'Re' }, { sig: 'whsec_' + btoa('otra clave') })).status === 403, 'respuestas: una llamada sin la firma de Resend → 403');
      ok((await hook({ email_id: 'e1', from: 'yo@fmlab.example', to: [t0.replyTo], subject: 'Re' }, { ts: Math.floor(hookAt / 1000) - 3600 })).status === 403, 'respuestas: una llamada vieja (repetida) → 403');
      sent = []; r = await hook({ email_id: 'e1', from: 'yo@fmlab.example', to: [t0.replyTo], subject: 'Re' });
      let c = (await C('GET', `/contacts/${ana.id}`)).j.contact;
      ok(r.status === 200 && c.history.some(h => h.what === 'reply' && h.test && /Funciona, me llega bien/.test(h.text)), 'respuestas: la respuesta a la prueba, en la ficha (como prueba)');
      ok(!c.replied && c.status === 'contacted', 'respuestas: una prueba no cambia el estado');
      ok(sent.length === 1 && sent[0].to === 'hola@fmlab.example' && /Funciona/.test(sent[0].text) && sent[0].replyTo === 'yo@fmlab.example' && /#captacion\/c\//.test(sent[0].text), 'respuestas: y me llega a mi buzón, para contestar desde ahí');
      const forged = t0.replyTo.replace(/-[0-9a-f]{16}@/, '-0000000000000000@');
      sent = []; await hook({ email_id: 'e2', from: 'x@y.example', to: [forged], subject: 'Hola' });
      ok(!sent.length && (await C('GET', `/contacts/${ana.id}`)).j.contact.history.filter(h => h.what === 'reply').length === 1, 'respuestas: una dirección inventada no se apunta a nadie');
      // With consent: the real email (its way out), and its answer moves the contact on.
      await C('POST', `/contacts/${ana.id}/consent`, { body: { how: 'Me lo dijo por teléfono el 10/10' } });
      sent = []; x = await C('POST', `/contacts/${ana.id}/send`, { body: draft });
      const m1 = sent[0];
      ok(x.status === 200 && m1.to === 'ana@sol.example' && /\/api\/crm\/unsub\?t=/.test(m1.headers?.['List-Unsubscribe'] || '') && /FM Lab/.test(m1.text) && /^respuestas\+c\d+-[0-9a-f]{16}@/.test(m1.replyTo), 'correo a mano: con permiso se envía, con la identidad, la baja y la dirección de respuesta');
      ok((await A('GET', '/audit?target=crm:' + ana.id)).j.entries.some(e => e.action === 'crm-mail'), 'correo a mano: en la auditoría');
      env.FETCH = async (u, init) => (String(u).startsWith('https://api.resend.com/emails/receiving/') ? Response.json({ from: 'Ana Ruiz <ana@sol.example>', subject: 'Re: Revela para Colegio Sol', text: null, html: '<p>¡Hola! Nos <b>interesa</b>. ¿Podemos vernos el jueves?</p>' }) : prevF5(u, init));
      sent = []; await hook({ email_id: 'e3', from: 'ana@sol.example', to: [m1.replyTo], subject: 'Re: Revela para Colegio Sol' });
      c = (await C('GET', `/contacts/${ana.id}`)).j.contact;
      ok(c.replied && c.status === 'talking' && c.nextWhat === 'Contestar su respuesta' && c.history.some(h => h.what === 'reply' && !h.test && /Nos interesa\. ¿Podemos vernos el jueves\?/.test(h.text)), 'respuestas: ha respondido — en conversación, con su texto y un seguimiento para hoy');
      ok((await C('GET', '/contacts?q=sol')).j.items[0].replied, 'respuestas: la lista lo sabe');
      ok(sent[0]?.replyTo === 'ana@sol.example', 'respuestas: reenviada para contestarle directamente');
      env.FETCH = prevF5; delete env.RESEND_KEY; delete env.RESEND_WEBHOOK_SECRET;
      sent = []; await C('POST', `/contacts/${ana.id}/send`, { body: { ...draft, test: 'yo@fmlab.example' } });
      ok(sent[0].replyTo === 'hola@fmlab.example', 'correo a mano: sin el webhook de Resend, las respuestas van a mi dirección');
    }
    // The map: the contacts' points (OpenStreetMap's, kept when imported) and placing those without one.
    {
      const all = (await C('GET', '/contacts?limit=500')).j.items, ol = all.find(c => c.name === 'CEIP Los Olivos'), sol = all.find(c => c.name === 'Colegio Sol');
      ok(ol.lat === 41.6 && ol.lon === -0.9, 'mapa: los encontrados en OpenStreetMap traen su punto');
      ok(sol.lat == null, 'mapa: los del formulario, aún sin punto');
      x = await C('POST', '/locate', { body: {} });
      const sol2 = (await C('GET', '/contacts?q=sol')).j.items[0];
      ok(x.status === 200 && x.j.located >= 1 && sol2.lat === 41.6, 'mapa: «Situar» les da el de su ciudad: ' + JSON.stringify(x.j));
    }
    x = await C('POST', `/contacts/${olivos.id}/status`, { body: { status: 'demo' } });
    ok(x.j.contact.status === 'demo' && !x.j.contact.seq, 'captación: al pasar a «demo», la secuencia se detiene');
    x = await C('POST', '/preview', { body: { seq: seqId, i: 1 } });
    ok(x.status === 200 && /Seguimos aquí/.test(x.j.html) && /FM Lab/.test(x.j.html), 'captación: vista previa de un paso');
    // Campaigns: the link, its visits; a new account through it, and its purchase.
    x = await C('POST', '/campaigns', { body: { camp: { name: 'Feria Didacta', slug: 'didacta-26', url: '/schools', channel: 'feria', code: 'didacta' } } });
    ok(x.status === 200 && x.j.camp.code === 'DIDACTA', 'captación: campaña creada');
    ok((await C('POST', '/campaigns', { body: { camp: { name: 'Otra', slug: 'didacta-26', url: '/' } } })).status === 409, 'captación: nombre de enlace repetido → 409');
    ok((await C('POST', '/campaigns', { body: { camp: { name: 'Mala', slug: 'mala', url: 'javascript:alert(1)' } } })).status === 400, 'captación: dirección no válida → 400');
    r = await worker.fetch(new Request(SITE + '/api/go/didacta-26'), env);
    const loc = new URL(r.headers.get('Location'));
    ok(r.status === 302 && loc.pathname === '/schools' && loc.searchParams.get('rv') === 'didacta-26' && loc.searchParams.get('utm_source') === 'feria', 'captación: el enlace de campaña lleva a su página con rv y utm');
    ok((await worker.fetch(new Request(SITE + '/api/go/no-existe'), env)).headers.get('Location') === SITE + '/', 'captación: un enlace desconocido, a la portada');
    await req('POST', '/api/login', { body: { accessToken: 'tok-crm', terms: TERMS, lang: 'es', campaign: 'didacta-26' } });
    await req('POST', '/api/login', { body: { accessToken: 'tok-crm', terms: TERMS, lang: 'es', campaign: 'didacta-26' } });
    ok((await hook({ id: 'evt_crm1', type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', amount_total: 1210, currency: 'eur', total_details: { amount_tax: 210 }, client_reference_id: '3131', metadata: { sub: '3131', product: 'credits-500' } } } }, 'whsec_x')).status === 200, 'captación: compra de quien vino por la campaña');
    await lead({ name: 'Colegio Mar', email: 'mar@mar.example', campaign: 'didacta-26' });
    x = await C('GET', '/campaigns');
    const cs = x.j.stats[x.j.camps[0].id];
    ok(cs.visit === 1 && cs.signup === 1 && cs.purchase === 1 && cs.revenue === 1000 && cs.leads === 1, 'captación: visitas, altas (una vez), solicitudes y compras (sin IVA) por campaña: ' + JSON.stringify(cs));
    ok(x.j.base === SITE + '/api/go/', 'captación: la dirección base de los enlaces');
    // Webinars: created in the admin, listed on the site, signing up (confirmation with the link; consent only with its box),
    // the reminder the day before, an email to everyone signed up after.
    const starts = Date.now() + 5 * DAYms;
    x = await C('POST', '/events', { body: { event: { title: 'Clases interactivas en 30 minutos', starts, minutes: 30, link: 'https://meet.example/abc', lang: 'es', capacity: 2, description: 'Con ejemplos reales.' } } });
    ok(x.status === 200 && x.j.event.id, 'seminarios: creado'); const evId = x.j.event.id;
    ok((await C('POST', '/events', { body: { event: { title: 'Sin fecha' } } })).status === 400, 'seminarios: sin fecha → 400');
    let pub = await (await req('GET', '/api/events?lang=es')).json();
    ok(pub.events.length === 1 && pub.events[0].title === 'Clases interactivas en 30 minutos' && !pub.events[0].link, 'seminarios: en la web, sin el enlace (ese va en el correo)');
    ok((await (await req('GET', '/api/events?lang=de')).json()).events.length === 0, 'seminarios: por idioma');
    const sign = (b, o) => req('POST', '/api/events/signup', { body: { event: evId, person: 'Eva', name: 'IES Moncayo', email: 'eva@moncayo.example', privacy: true, lang: 'es', ...b }, ...o });
    ok((await sign({}, { origin: 'https://malo.example' })).status === 403, 'seminarios: inscripción desde otra web → 403');
    ok((await sign({ privacy: false })).status === 400, 'seminarios: sin aceptar la privacidad → 400');
    sent = [];
    ok((await sign({})).status === 200, 'seminarios: inscrita');
    ok(sent.length === 1 && sent[0].to === 'eva@moncayo.example' && /meet\.example\/abc/.test(sent[0].text) && /Clases interactivas/.test(sent[0].subject), 'seminarios: confirmación con el enlace');
    sent = []; ok((await sign({})).status === 200 && !sent.length, 'seminarios: apuntarse dos veces no repite nada');
    await sign({ person: 'Rafa', email: 'rafa@x.example', marketing: true });
    ok((await sign({ person: 'Tercera', email: 'tercera@x.example' })).status === 409, 'seminarios: lleno → 409');
    x = await C('GET', '/events/' + evId);
    ok(x.j.signups.length === 2, 'seminarios: lista de inscritos');
    const evs = (await C('GET', '/contacts?q=moncayo')).j.items, eva = evs.find(c => c.person === 'Eva'), rafa = evs.find(c => c.person === 'Rafa');
    ok(eva && !eva.consent && eva.tags.includes('seminario') && rafa?.consent, 'seminarios: en Contactos; permiso comercial solo con su casilla');
    sent = []; await runCron(Date.now()); ok(!sent.some(m => m.to === 'eva@moncayo.example'), 'seminarios: a 5 días, aún sin recordatorio');
    Date.now = () => realNow0() + 4.2 * DAYms; sent = []; await runCron(Date.now());
    ok(sent.filter(m => m.to === 'eva@moncayo.example' && /^Mañana/.test(m.subject)).length === 1, 'seminarios: recordatorio el día antes');
    sent = []; await runCron(Date.now()); Date.now = realNow0;
    ok(!sent.some(m => /^Mañana/.test(m.subject)), 'seminarios: el recordatorio, una vez');
    sent = []; x = await C('POST', `/events/${evId}/mail`, { body: { subject: 'La grabación', body: 'Hola, {nombre}: aquí la tienes https://revelaslides.com/x' } });
    ok(x.j.sent === 2 && sent.some(m => m.to === 'eva@moncayo.example' && /Hola, Eva/.test(m.text)), 'seminarios: correo a los inscritos (la grabación)');
    // Recommendations: my link (an account), a request through it, counted for me; a customer, too.
    const crmCookie = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-crm', terms: TERMS, lang: 'es' } }));
    await C('POST', '/settings', { body: { settings: { referralReward: '3 meses de Pro' } } });
    x = await (await req('GET', '/api/referral', { headers: { Cookie: crmCookie } })).json();
    ok(x.on && /^[a-z0-9]{10}$/.test(x.code) && x.link === SITE + '/schools?ref=' + x.code && x.reward === '3 meses de Pro', 'recomendaciones: mi enlace: ' + JSON.stringify(x));
    ok((await (await req('GET', '/api/referral', { headers: { Cookie: crmCookie } })).json()).code === x.code, 'recomendaciones: siempre el mismo código');
    ok((await req('GET', '/api/referral')).status === 401, 'recomendaciones: sin sesión, nada');
    await lead({ name: 'CEIP Recomendado', email: 'dir@recomendado.example', ref: x.code });
    await lead({ name: 'Colegio Inventado', email: 'dir@inventado.example', ref: 'noexiste00' });
    const refd = (await C('GET', '/contacts?q=recomendado')).j.items[0], inv = (await C('GET', '/contacts?q=inventado')).j.items[0];
    ok(refd.referrer === x.code && !inv.referrer, 'recomendaciones: la solicitud queda atribuida (un código inventado, no)');
    await C('POST', `/contacts/${refd.id}/status`, { body: { status: 'customer' } }); await C('POST', `/contacts/${refd.id}/status`, { body: { status: 'customer' } });
    const refs = (await C('GET', '/referrals')).j, mine = refs.refs.find(r => r.code === x.code);
    ok(mine && mine.email === 'crm@example.com' && mine.leads === 1 && mine.customers === 1 && refs.contacts[x.code].length === 1, 'recomendaciones: quién trae centros y cuántos acaban siendo clientes (una vez): ' + JSON.stringify(mine));
    ok((await C('GET', `/contacts/${refd.id}`)).j.referrer?.email === 'crm@example.com', 'recomendaciones: la ficha dice quién lo recomendó');
    ok((await (await req('GET', '/api/referral', { headers: { Cookie: crmCookie } })).json()).stats.customers === 1, 'recomendaciones: y la persona lo ve en su cuenta');
    // Three years untouched and come to nothing: deleted by the daily run (the ones in conversation, kept).
    const before = (await C('GET', '/contacts')).j.all;
    Date.now = () => realNow0() + 3 * 366 * DAYms; await runCron(Date.now()); Date.now = realNow0;
    x = (await C('GET', '/contacts')).j;
    ok(x.all < before && x.items.every(c => ['talking', 'demo', 'proposal', 'customer'].includes(c.status)) && x.items.some(c => c.status === 'demo'), 'captación: a los 3 años sin actividad se borran los que no llegaron a nada: ' + before + ' → ' + x.all);
    // Off without its object; and the admin only.
    ok((await req('GET', '/api/admin/crm/contacts')).status === 404, 'captación: la API de administración no responde fuera de su host');
    env.FETCH = prevF;
  }

  // The community gallery (community.js): publishing (pending until the admin approves it), the list and search,
  // its public page, the picture, reuses counted, reports, hidden again; and only the author may delete it.
  {
    env.COMMUNITY = namespace(Community, env);
    const pub = (cookie, b = {}) => req('POST', '/api/community', { headers: cookie ? { Cookie: cookie } : {}, body: { title: 'Las fracciones', description: 'Para 5.º de primaria, con un cuestionario.', subject: 'math', level: 'primary', lang: 'es',
      license: 'cc-by', author: 'Pía G.', rights: true, thumb: 'data:image/jpeg;base64,/9j/4AAQ', deck: { size: { w: 1280, h: 720 }, slides: [{ id: 's1', blocks: [{ id: 'a', type: 'text', html: '¿Qué es una <b>fracción</b>?' }] }, { id: 's2', blocks: [{ id: 'q', type: 'poll', question: '¿Cuánto es 1/2 + 1/4?' }] }] }, ...b } });
    ok((await pub(null)).status === 401, 'comunidad: publicar sin sesión → 401');
    ok((await pub(pia, { rights: false })).status === 400, 'comunidad: sin confirmar los derechos → 400');
    ok((await pub(pia, { license: 'todos' })).status === 400, 'comunidad: licencia desconocida → 400');
    let r1 = await (await pub(pia)).json(); ok(/^[a-z2-9]{6}$/.test(r1.id), 'comunidad: publicada (en revisión)');
    const L = async (p = '') => (await req('GET', '/api/community' + p)).json();
    ok((await L()).items.length === 0, 'comunidad: en revisión, no sale en la lista');
    ok((await req('GET', '/api/community/' + r1.id)).status === 404, 'comunidad: ni se puede abrir');
    ok((await (await req('GET', '/api/community/mine', { headers: { Cookie: pia } })).json()).items[0]?.status === 'pending', 'comunidad: la autora la ve «en revisión»');
    x = await A('GET', '/community?status=pending'); ok(x.j.items.length === 1 && /fracción/.test(x.j.items[0].text), 'comunidad: en la cola de moderación, con su texto');
    { const d = await adm('GET', `/community/${r1.id}/deck`); ok(d.status === 200 && (await d.json()).slides.length === 2, 'comunidad: la administración la descarga para revisarla');
      ok((await adm('GET', `/community/${r1.id}/thumb`)).headers.get('Content-Type') === 'image/jpeg', 'comunidad: y ve su imagen antes de aprobarla'); }
    ok((await req('GET', `/api/community/${r1.id}/thumb`, { headers: { Cookie: pia } })).headers.get('Cache-Control') === 'private, no-store', 'comunidad: su imagen, solo para la autora (ninguna caché la guarda)');
    ok((await A('POST', `/community/${r1.id}/status`, { body: { status: 'published' } })).status === 200, 'comunidad: aprobada');
    ok(/^public/.test((await req('GET', `/api/community/${r1.id}/thumb`)).headers.get('Cache-Control')), 'comunidad: publicada, su imagen ya es pública');
    let l = await L(); ok(l.items.length === 1 && l.items[0].title === 'Las fracciones' && !l.items[0].sub && !l.items[0].text, 'comunidad: en la lista (sin datos de la cuenta)');
    ok((await L('?q=FRACCION')).items.length === 1 && (await L('?q=volcanes')).items.length === 0 && (await L('?subject=lang')).items.length === 0, 'comunidad: búsqueda en sus palabras y filtros');
    const got = await (await req('GET', `/api/community/${r1.id}?use=1`)).json();
    ok(got.deck?.slides?.length === 2 && got.item.uses === 1 && !got.item.sub, 'comunidad: abrirla para usarla cuenta un uso');
    // Likes: one per account, counted in the list and the page, for «popular»; without a session, no.
    const liker = await login2('tok-gil');
    ok((await req('POST', `/api/community/${r1.id}/like`, { body: { on: true } })).status === 401, 'comunidad: «me gusta» pide sesión');
    x = await (await req('POST', `/api/community/${r1.id}/like`, { headers: { Cookie: liker }, body: { on: true } })).json();
    await req('POST', `/api/community/${r1.id}/like`, { headers: { Cookie: liker }, body: { on: true } });
    ok(x.likes === 1 && x.liked && (await L()).items[0].likes === 1, 'comunidad: un «me gusta» por cuenta');
    ok((await (await req('GET', `/api/community/${r1.id}`, { headers: { Cookie: liker } })).json()).liked === true, 'comunidad: sabe si ya le di «me gusta»');
    ok((await (await req('POST', `/api/community/${r1.id}/like`, { headers: { Cookie: pia }, body: { on: true } })).json()).likes === 2, 'comunidad: y otra cuenta suma');
    ok((await (await req('POST', `/api/community/${r1.id}/like`, { headers: { Cookie: pia }, body: { on: false } })).json()).likes === 1, 'comunidad: quitarlo resta');
    const th = await req('GET', `/api/community/${r1.id}/thumb`); ok(th.status === 200 && th.headers.get('Content-Type') === 'image/jpeg', 'comunidad: su imagen');
    let pg = await worker.fetch(new Request(SITE + '/community'), env), html = await pg.text();
    ok(pg.status === 200 && html.includes('Las fracciones') && html.includes(`/community/${r1.id}-las-fracciones`), 'comunidad: la página de la lista');
    pg = await worker.fetch(new Request(`${SITE}/community/${r1.id}-las-fracciones`), env); html = await pg.text();
    ok(pg.status === 200 && html.includes('<link rel="canonical" href="https://revelaslides.com/community/' + r1.id + '-las-fracciones">') && html.includes('¿Cuánto es 1/2 + 1/4?') && html.includes('/app/?community=' + r1.id) && html.includes('CC BY 4.0'), 'comunidad: su página, para buscadores, con sus palabras, la licencia y «usar»');
    ok(!/<b>fracción/.test(html) && !html.includes('pia@example.com'), 'comunidad: el texto como texto, sin el correo de la autora');
    ok(html.includes('♥ 1'), 'comunidad: sus «me gusta» en su página');
    ok((await worker.fetch(new Request(SITE + '/community/zzzzzz'), env)).status === 404, 'comunidad: una que no existe → 404');
    { const r = await worker.fetch(new Request(SITE + '/comunidad/' + r1.id + '-las-fracciones?lang=en'), env);
      ok(r.status === 301 && r.headers.get('Location') === SITE + '/community/' + r1.id + '-las-fracciones?lang=en', 'comunidad: su antigua dirección en español lleva para siempre a /community (con la ruta y los parámetros)'); }
    pg = await worker.fetch(new Request(SITE + '/community/sitemap.xml'), env); html = await pg.text();
    ok(pg.status === 200 && /xml/.test(pg.headers.get('Content-Type')) && html.includes(`<loc>https://revelaslides.com/community/${r1.id}-las-fracciones</loc>`) && html.includes('<loc>https://revelaslides.com/community</loc>'), 'comunidad: su sitemap para los buscadores');
    ok((await req('POST', `/api/community/${r1.id}/report`, { body: { reason: 'No es apropiada' } })).status === 200, 'comunidad: denunciar');
    ok((await A('GET', '/community?status=reported')).j.items.length === 1 && (await A('GET', `/community/${r1.id}/reports`)).j.reports[0].reason === 'No es apropiada', 'comunidad: las denuncias, en la administración');
    await A('POST', `/community/${r1.id}/status`, { body: { status: 'hidden', reason: 'revisar' } });
    ok((await L()).items.length === 0 && (await req('GET', '/api/community/' + r1.id)).status === 404, 'comunidad: oculta, fuera de la lista y de su página');
    ok([401, 403].includes((await req('POST', `/api/community/${r1.id}/delete`, { headers: { Cookie: ana } })).status) && (await A('GET', '/community?status=hidden')).j.items.length === 1, 'comunidad: otra persona no puede borrarla');
    ok((await req('POST', `/api/community/${r1.id}/delete`, { headers: { Cookie: pia } })).status === 200 && (await A('GET', '/community?status=hidden')).j.items.length === 0, 'comunidad: la autora la borra');
    ok(![...env.COMMUNITY.inst.get('community').ctx.storage.m.keys()].some(k => k.startsWith(`lk:${r1.id}:`)), 'comunidad: y con ella sus «me gusta»');
    for (let i = 0; i < 5; i++) await pub(pia);
    ok((await pub(pia)).status === 429, 'comunidad: como mucho 5 al día por cuenta');
  }

  // Ambassadors (crm.js): apply from one's account, the admin approves (Pro until a date, an email), the badge and its check, the public list.
  {
    const ap = (cookie, b = {}) => req('POST', '/api/ambassadors/apply', { headers: cookie ? { Cookie: cookie } : {}, body: { name: 'Pía García', center: 'IES Ebro', city: 'Zaragoza', role: 'Jefa de estudios', subject: 'math', plan: 'Una sesión de formación al trimestre con el claustro y compartir materiales.', listed: true, lang: 'es', ...b } });
    ok((await ap(null)).status === 401, 'embajadores: solicitar sin sesión → 401');
    ok((await ap(pia, { plan: 'poco' })).status === 400, 'embajadores: sin decir cómo lo difundirá → 400');
    x = await (await ap(pia)).json(); ok(x.status === 'pending', 'embajadores: solicitud en revisión');
    let me1 = await (await req('GET', '/api/ambassadors/me', { headers: { Cookie: pia } })).json(); ok(me1.amb.status === 'pending' && !me1.amb.code, 'embajadores: la persona ve su solicitud');
    const list = (await A('GET', '/crm/ambassadors?status=pending')).j.items; ok(list.length === 1 && list[0].email === 'pia@example.com' && list[0].center === 'IES Ebro', 'embajadores: en la administración');
    ok((await A('GET', '/crm/contacts?tag=embajador')).j.items.length === 1, 'embajadores: y en Captación');
    sent = [];
    x = await A('POST', `/crm/ambassadors/${list[0].sub}/status`, { body: { status: 'approved', proDays: 365 } });
    ok(x.status === 200 && x.j.amb.code && x.j.proUntil > Date.now() + 360 * DAYms, 'embajadores: aprobado, con Pro un año');
    ok(sent.some(m => m.to === 'pia@example.com' && /embajador/.test(m.subject) && /badge\/[a-z0-9]+\.svg/.test(m.text)), 'embajadores: le llega el correo con su insignia');
    ok((await (await req('GET', '/api/me', { headers: { Cookie: pia } })).json()).plan === 'pro', 'embajadores: tiene Pro');
    me1 = await (await req('GET', '/api/ambassadors/me', { headers: { Cookie: pia } })).json(); const code = me1.amb.code;
    const badge = await req('GET', `/api/ambassadors/badge/${code}.svg`); const svg = await badge.text();
    ok(badge.status === 200 && /image\/svg/.test(badge.headers.get('Content-Type')) && svg.includes('Pía García') && svg.includes('IES Ebro'), 'embajadores: la insignia con su nombre');
    ok((await (await req('GET', `/api/ambassadors/verify/${code}`)).json()).amb?.name === 'Pía García' && !(await (await req('GET', '/api/ambassadors/verify/inventado123')).json()).amb, 'embajadores: la comprobación (y una inventada, no)');
    const pubL = await (await req('GET', '/api/ambassadors')).json(); ok(pubL.items.length === 1 && pubL.items[0].city === 'Zaragoza' && !pubL.items[0].email, 'embajadores: el directorio público (sin correos)');
    await A('POST', `/crm/ambassadors/${list[0].sub}/status`, { body: { status: 'ended' } });
    ok((await (await req('GET', '/api/ambassadors')).json()).items.length === 0 && (await req('GET', `/api/ambassadors/badge/${code}.svg`)).status === 404, 'embajadores: al terminar, fuera del directorio y sin insignia válida');
  }

  // Public pages kept in Cloudflare's cache (worker.js edgeKept): given when the Durable Objects fail (the free plan's
  // daily quota spent); a private one never kept.
  { const store = new Map(), cache = { match: async k => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } };
    const u = new URL('https://revelaslides.com/community/abc234-x'); let n = 0;
    const page = (cc = 'public, max-age=300') => async () => { n++; return new Response('<h1>v' + n + '</h1>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': cc } }); };
    let r = await edgeKept(u, page(), { cache }); ok(await r.text() === '<h1>v1</h1>' && r.headers.get('Cache-Control') === 'public, max-age=300', 'caché: la página, hecha');
    r = await edgeKept(u, async () => { throw new Error('Exceeded allowed volume of requests in Durable Objects free tier'); }, { cache });
    ok(r.status === 200 && await r.text() === '<h1>v1</h1>' && r.headers.get('X-Revela-Stale') === '1' && r.headers.get('Cache-Control') === 'no-store' && !r.headers.get('X-Revela-At'), 'caché: sin Durable Objects, la última copia buena');
    r = await edgeKept(u, async () => new Response('caído', { status: 500 }), { cache }); ok(await r.text() === '<h1>v1</h1>', 'caché: también cuando responde 500');
    r = await edgeKept(u, page(), { cache, fresh: 600 }); ok(await r.text() === '<h1>v1</h1>' && n === 1 && r.headers.get('Cache-Control') === 'public, max-age=300', 'caché: «fresh», la copia reciente sin volver a hacerla');
    r = await edgeKept(u, page(), { cache }); ok(await r.text() === '<h1>v2</h1>', 'caché: sin «fresh», siempre la de ahora');
    const priv = new URL('https://revelaslides.com/api/community/def234/thumb');
    await edgeKept(priv, page('private, no-store'), { cache }); r = await edgeKept(priv, async () => { throw new Error('x'); }, { cache });
    ok(r.status === 503 && !store.has('https://revelaslides.com/__kept/api/community/def234/thumb'), 'caché: lo privado nunca se guarda'); }

  // The «Rastreador» (crawler.js): websites read slowly and politely, facts with their evidence, a score from them.
  {
    const K = await import('../server/cloudflare/crawler.js');
    env.CRAWLER = namespace(K.Crawler, env); env.CRAWL_SLEEP = '0';
    // robots.txt, read as search engines do.
    let R = K.robotsRules('User-agent: *\nDisallow: /privado\n\nUser-agent: RevelaBot\nDisallow: /intranet\nAllow: /intranet/publico\n');
    ok(!K.robotsAllow(R, '/intranet/notas') && K.robotsAllow(R, '/intranet/publico/x') && K.robotsAllow(R, '/privado'), 'rastreador: robots.txt — su grupo manda, la regla más larga gana');
    R = K.robotsRules('User-agent: *\nDisallow: /\n'); ok(!K.robotsAllow(R, '/') && !K.robotsAllow(R, '/contacto'), 'rastreador: «Disallow: /» lo cierra todo');
    ok(K.robotsAllow(K.robotsRules(''), '/'), 'rastreador: sin robots.txt, se puede');
    ok(K.personal('juan.perez') && K.personal('maria_lopez') && !K.personal('secretaria') && !K.personal('info') && !K.personal('50001234') && !K.personal('ies.ebro'), 'rastreador: correos de persona y genéricos');
    // A school's website (simulated), one that says no, one that doesn't answer.
    const visits = [], ua = [];
    const SITE = {
      'https://olivos.example/robots.txt': 'User-agent: *\nDisallow: /intranet\n',
      'https://olivos.example/': `<html lang="es"><head><title>CEIP Los Olivos</title><meta name="generator" content="WordPress 6.6"></head><body>
        <a href="/contacto">Contacto</a> <a href="/intranet/notas">Notas</a> <a href="https://aeducar.es/course/view.php?id=7">Aula virtual (Aeducar)</a>
        <p>Plan Digital de Centro: trabajamos la competencia digital y la robótica.</p><footer>© 2026 CEIP Los Olivos</footer></body></html>`,
      'https://olivos.example/contacto': `<html><body><p>Secretaría: <a href="mailto:secretaria@olivos.example">secretaria@olivos.example</a>. Dirección: juan.perez@olivos.example</p>
        <p>Teléfono: 976 123 456</p><p>También info [at] olivos.example</p></body></html>`,
      'https://cerrado.example/robots.txt': 'User-agent: *\nDisallow: /\n',
    };
    const prevF2 = env.FETCH;
    env.FETCH = async (u, init = {}) => { const s = String(u);
      if (s.startsWith('https://cloudflare-dns.com/dns-query')) { const name = new URL(s).searchParams.get('name'); return Response.json(name === 'olivos.example' ? { Answer: [{ data: '1 aspmx.l.google.com.' }] } : { Answer: [] }); }
      if (/olivos\.example|cerrado\.example|caido\.example/.test(s)) {
        visits.push(s); ua.push(init.headers?.['User-Agent']);
        if (s.includes('caido.example')) throw new TypeError('fetch failed');
        if (s in SITE) return new Response(SITE[s], { headers: { 'Content-Type': s.endsWith('robots.txt') ? 'text/plain' : 'text/html; charset=utf-8' } });
        return new Response('no', { status: 404, headers: { 'Content-Type': 'text/html' } });
      }
      return prevF2(u, init); };
    const C = (m, p, o) => A(m, '/crm' + p, o);
    const mk = async (name, web) => (await C('POST', '/contacts', { body: { contact: { name, kind: 'school', web } } })).j.id;
    const olivos = await mk('CEIP Los Olivos', 'https://olivos.example/'), cerrado = await mk('Colegio Cerrado', 'cerrado.example'), caido = await mk('IES Caído', 'https://caido.example');
    // Off until it's turned on; the settings checked.
    let x = await C('GET', '/crawler'); ok(x.status === 200 && x.j.settings.on === false && x.j.score.moodle.pts === 20, 'rastreador: apagado de entrada, con sus reglas de puntos');
    x = await C('POST', '/crawler', { body: { settings: { on: true, everyMin: 1, pagesPerSite: 3, blocked: ['https://www.Bloqueado.example/x'] } } });
    ok(x.status === 200 && x.j.settings.on && x.j.settings.everyMin === 2 && x.j.settings.blocked[0] === 'bloqueado.example', 'rastreador: encendido (como mucho uno cada 2 min) y dominios bloqueados normalizados');
    ok((await C('GET', '/crawler')).j.nextAt > Date.now(), 'rastreador: con su alarma, que lo mantiene en marcha');
    // Step by step, as the alarm would — the sites due asked for several at a time (reading every contact counts
    // against the plan's daily quota of rows read), kept in the crawler's queue.
    { const due = await env.CRM.get(env.CRM.idFromName('crm')).fetch('https://crm/crawl-next', { method: 'POST', body: JSON.stringify({ before: Date.now(), n: 2 }) }).then(r => r.json());
      ok(due.items.length === 2 && due.id === due.items[0].id, 'rastreador: los siguientes, de varios en varios: ' + JSON.stringify(due.items.map(x => x.id))); }
    const done = [];
    for (let i = 0; i < 6; i++) { const r = (await C('POST', '/crawler/step', { body: {} })).j; done.push(r.kind === 'site' ? r.id : r.kind); }
    ok([olivos, cerrado, caido].every(id => done.filter(d => d === id).length === 1) && done.at(-1) === 'idle', 'rastreador: cada web una vez, luego nada que hacer: ' + done);
    ok(ua.every(u => /RevelaBot\/1\.0; \+https:\/\/revelaslides\.com\/bot/.test(u)), 'rastreador: siempre dice quién es');
    ok(!visits.some(v => v.includes('/intranet')) && !visits.some(v => /cerrado\.example\/(?!robots)/.test(v)), 'rastreador: obedece robots.txt (ni /intranet ni el sitio cerrado)');
    let c = (await C('GET', '/contacts/' + olivos)).j.contact.webFacts;
    ok(c.ok && c.emails.map(e => e.email).sort().join() === 'info@olivos.example,secretaria@olivos.example' && c.hidden === 1, 'rastreador: correos genéricos sí; el de una persona, solo contado: ' + JSON.stringify(c.emails.map(e => e.email)));
    ok(c.phones[0]?.phone === '976123456' && c.platforms.some(p => p.k === 'moodle' && /aeducar/i.test(p.snippet)) && c.platforms.some(p => p.k === 'google' && /aspmx/.test(p.snippet)), 'rastreador: teléfono, Moodle (Aeducar) y Google (por su MX), con su prueba');
    ok(c.score === 100 && c.reasons.length === 8 && c.reasons.every(r => r.pts && r.label) && c.lang === 'es' && c.latestYear === 2026 && c.generator.startsWith('WordPress'), 'rastreador: puntuación de los hechos, con sus razones: ' + c.score);
    const cc = (await C('GET', '/contacts/' + cerrado)).j.contact.webFacts, cd = (await C('GET', '/contacts/' + caido)).j.contact.webFacts;
    ok(!cc.ok && cc.robots === 'blocked' && cc.score === 0 && !cd.ok && cd.score === 0, 'rastreador: la web que dice no y la que no responde quedan anotadas, sin puntos');
    x = await C('GET', '/contacts?sort=score'); ok(x.j.items[0].id === olivos && x.j.items[0].score === 100, 'rastreador: la lista por puntuación');
    // Again only after recrawlDays; one by hand now.
    visits.length = 0; await C('POST', '/crawler/step', { body: {} }); ok(!visits.length, 'rastreador: no vuelve antes de tiempo');
    x = await C('POST', `/contacts/${olivos}/crawl`, { body: {} }); ok(x.status === 200 && x.j.facts.score === 100 && visits.length, 'rastreador: «Mirar ahora» una ficha');
    // An address its website publishes, as the contact's (still no email without consent).
    ok((await C('POST', `/contacts/${olivos}/use-email`, { body: { email: 'otro@x.example' } })).status === 400, 'rastreador: solo un correo que publica su web');
    x = await C('POST', `/contacts/${olivos}/use-email`, { body: { email: 'secretaria@olivos.example' } });
    ok(x.status === 200 && x.j.contact.email === 'secretaria@olivos.example' && !x.j.contact.consent, 'rastreador: usar el correo de su web (sin permiso: ningún envío automático)');
    // A blocked domain is never visited.
    const bl = await mk('Bloqueado', 'https://www.bloqueado.example'); visits.length = 0;
    await C('POST', '/crawler/step', { body: {} }); ok(!visits.some(v => v.includes('bloqueado')) && !(await C('GET', '/contacts/' + bl)).j.contact.webFacts, 'rastreador: un dominio bloqueado no se visita');
    // Finding new places in the areas set (OpenStreetMap), when there's nothing to visit.
    await C('POST', '/crawler', { body: { settings: { discover: true, areas: ['Zaragoza'], kinds: ['school'] } } });
    x = (await C('POST', '/crawler/step', { body: {} })).j;
    ok(x.kind === 'area' && x.area === 'Zaragoza' && (await C('GET', '/crawler')).j.log[0].kind === 'area', 'rastreador: busca centros nuevos en las zonas elegidas: ' + JSON.stringify(x));
    ok((await A('GET', '/audit?target=crm:crawler')).j.entries.some(e => e.action === 'crm-crawler'), 'rastreador: los cambios de ajustes, en la auditoría');
    // A country: split into its regions, each searched in its own step; Overpass giving up (busy, or a query too big)
    // is said and tried again — never «0 new».
    { const prev = env.FETCH, asked = [];
      let mode = 'busy';
      env.FETCH = async (u, init = {}) => { const s = String(u);
        if (s.startsWith('https://nominatim.openstreetmap.org/') && s.includes('Espa')) return Response.json([{ osm_type: 'relation', osm_id: 1311341, place_rank: 4, lat: '40', lon: '-4', display_name: 'España', address: { country_code: 'es' } }]);
        if (s.endsWith('overpass-api.de/api/interpreter')) { const q = decodeURIComponent(String(init.body)); asked.push(q);
          if (mode === 'busy') return new Response('<html>The server is probably too busy to handle your request.</html>', { status: 504 });
          if (/admin_level"="4"/.test(q)) return Response.json({ elements: [{ type: 'relation', id: 349053, tags: { name: 'Catalunya' } }, { type: 'relation', id: 349044, tags: { name: 'Aragón' } }] });
          if (/admin_level"="6"/.test(q)) return Response.json({ elements: [{ type: 'relation', id: 349045, tags: { name: 'Huesca' } }] });
          if (/3600349053/.test(q)) return Response.json({ elements: [{ type: 'node', id: 77, lat: 41.4, lon: 2.1, tags: { name: 'Escola Mar', amenity: 'school' } }] });
          if (/3600349045/.test(q)) return Response.json({ elements: [{ type: 'node', id: 78, lat: 42.1, lon: -0.4, tags: { name: 'Colegio Pirineo', amenity: 'school' } }] });
          return Response.json({ remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.', elements: [] }); }
        return prev(u, init); };
      await C('POST', '/crawler', { body: { settings: { discover: true, areas: ['España'], kinds: ['school'] } } }); const o = env.CRAWLER.inst.get('crawler');
      x = await o.step(Date.now());
      ok(x.error && /saturado/.test(x.error) && (await C('GET', '/crawler')).j.log[0].error, 'rastreador: OpenStreetMap saturado, dicho (no «0 nuevos»): ' + JSON.stringify(x));
      x = await o.step(Date.now()); ok(x.kind === 'idle', 'rastreador: y no lo reintenta enseguida');
      mode = 'ok'; x = await o.step(Date.now() + 31 * 60e3);
      ok(x.split === 2 && (await C('GET', '/crawler')).j.parts.length === 2, 'rastreador: un país, dividido en sus regiones: ' + JSON.stringify(x));
      x = await o.step(Date.now() + 32 * 60e3);
      ok(x.area === 'Aragón (España)' && x.split === 1, 'rastreador: una región aún grande (la búsqueda se agota), dividida otra vez: ' + JSON.stringify(x));
      x = await o.step(Date.now() + 33 * 60e3);
      ok(x.area === 'Huesca (Aragón)' && x.found === 1 && x.added === 1, 'rastreador: cada parte, con lo que encontró: ' + JSON.stringify(x));
      x = await o.step(Date.now() + 34 * 60e3);
      ok(x.area === 'Catalunya (España)' && x.added === 1 && !(await C('GET', '/crawler')).j.parts.length, 'rastreador: hasta acabar las partes: ' + JSON.stringify(x));
      env.FETCH = prev; await C('POST', '/crawler', { body: { settings: { discover: false, areas: [] } } }); }
    { const o = env.CRAWLER.inst.get('crawler'), before = (await C('GET', '/crawler')).j; await mk('CEIP Nuevo', 'https://olivos.example/'); await o.alarm(); const after = (await C('GET', '/crawler')).j;
      ok(after.log.length === before.log.length + 1 && after.log[0].name === 'CEIP Nuevo' && after.nextAt > Date.now() + 60e3, 'rastreador: la alarma da un paso y se vuelve a programar sola'); }
    await C('POST', '/crawler', { body: { settings: { on: false } } }); ok(!(await C('GET', '/crawler')).j.nextAt, 'rastreador: apagado, sin alarma');
    env.FETCH = prevF2; delete env.CRAWL_SLEEP;
  }

  // Versiones (releases.js): what's on pruebas and in production; publishing runs GitHub's workflow; by itself after N days.
  {
    const ghCalls = [], prevF3 = env.FETCH, old = Date.now() - 5 * 864e5;
    let mainDate = new Date(old).toISOString(), testsOk = 'success', backs = [];
    env.FETCH = async (u, init = {}) => { const s = String(u);
      if (!s.startsWith('https://api.github.com/repos/fmesasc/revela/')) return prevF3(u, init);
      ghCalls.push({ s, method: init.method || 'GET', auth: init.headers?.Authorization, body: init.body && JSON.parse(init.body) });
      if (s.endsWith('/compare/production...main')) return Response.json({ base_commit: { sha: 'p1', commit: { message: 'En producción\nmás', committer: { date: '2026-10-01T10:00:00Z' } } },
        commits: [{ sha: 'm1', commit: { message: 'Primero', committer: { date: '2026-10-02T10:00:00Z' } } }, { sha: 'm2', commit: { message: 'Último cambio', committer: { date: mainDate } } }] });
      if (s.includes('/actions/workflows/tests.yml/runs')) return Response.json({ workflow_runs: [{ head_sha: 'm2', status: 'completed', conclusion: testsOk, html_url: 'https://github.com/x/1' }] });
      if (s.includes('/actions/workflows/promote.yml/runs')) return Response.json({ workflow_runs: [] });
      if (s.includes('/actions/workflows/rollback.yml/runs')) return Response.json({ workflow_runs: backs });
      if (s.includes('/tags?')) return Response.json([{ name: 'v0.4.9', commit: { sha: 'a9' } }, { name: 'latest', commit: { sha: 'zz' } }, { name: 'v0.4.10', commit: { sha: 'p1' } }, { name: 'v0.4.2', commit: { sha: 'a2' } }]);
      if (/\/actions\/workflows\/(promote|rollback)\.yml\/dispatches$/.test(s)) return new Response(null, { status: 204 });
      return new Response('{}', { status: 404 }); };
    let x = await A('GET', '/releases');
    ok(x.status === 200 && x.j.production.sha === 'p1' && x.j.production.message === 'En producción' && x.j.pending.map(c => c.sha).join() === 'm2,m1' && x.j.tests.conclusion === 'success' && !x.j.token,
      'versiones: producción, lo que espera en pruebas (lo último primero) y sus pruebas: ' + JSON.stringify(x.j).slice(0, 200));
    ok(x.j.versions.map(v => v.version).join() === '0.4.10,0.4.9,0.4.2' && x.j.production.version === '0.4.10' && x.j.versions[0].current && !x.j.held,
      'versiones: las publicadas, por número (0.4.10 después de 0.4.9), y cuál está en producción: ' + JSON.stringify(x.j.versions));
    ok((await A('POST', '/releases/rollback', { body: { version: '0.4.9', reason: 'Fallo' } })).status === 409, 'volver atrás: sin GITHUB_TOKEN no');
    x = await A('POST', '/releases/promote', { body: { reason: 'Probado' } });
    ok(x.status === 409 && x.j.error === 'no token' && !ghCalls.some(c => c.method === 'POST'), 'versiones: sin GITHUB_TOKEN no se publica (el panel enlaza al flujo)');
    env.GITHUB_TOKEN = 'ghp_prueba';
    x = await A('POST', '/releases/promote', { body: { reason: 'Probado en el centro' } });
    const d = ghCalls.find(c => c.method === 'POST');
    ok(x.status === 200 && d && d.body.ref === 'main' && d.body.inputs.reason === 'Probado en el centro' && d.auth === 'Bearer ghp_prueba', 'versiones: «Publicar en producción» lanza el flujo, con el motivo');
    ok((await A('GET', '/audit?target=releases')).j.entries.some(e => e.action === 'release-promote' && e.reason === 'Probado en el centro'), 'versiones: en la auditoría');
    ok((await A('POST', '/releases/settings', { body: { autoDays: 99 } })).status === 400, 'versiones: días imposibles → 400');
    // Going back to a version kept: only an older one, with a reason.
    ghCalls.length = 0;
    x = await A('POST', '/releases/rollback', { body: { version: 'v0.4.9', reason: 'Falla el guardado' } });
    const rb = ghCalls.find(c => c.method === 'POST');
    ok(x.status === 200 && x.j.from === '0.4.10' && x.j.to === '0.4.9' && /rollback\.yml\/dispatches$/.test(rb?.s) && rb.body.inputs.version === '0.4.9' && rb.body.inputs.reason === 'Falla el guardado',
      'volver atrás: lanza «Volver a una versión» con la versión y el motivo: ' + JSON.stringify(x.j));
    ok((await A('POST', '/releases/rollback', { body: { version: '0.4.10', reason: 'x' } })).status === 409, 'volver atrás: no a la que ya está (ni a una más nueva)');
    ok((await A('POST', '/releases/rollback', { body: { version: '0.3.1', reason: 'x' } })).status === 404, 'volver atrás: solo a una versión publicada');
    ok((await A('POST', '/releases/rollback', { body: { version: '0.4.2', reason: ' ' } })).status === 400, 'volver atrás: con motivo');
    ok((await A('GET', '/audit?target=releases')).j.entries.some(e => e.action === 'release-rollback' && e.reason === 'Falla el guardado'), 'volver atrás: en la auditoría');
    // By itself: main without changes for N days, tests passed.
    const { releasesAuto } = await import('../server/cloudflare/releases.js'); ghCalls.length = 0;
    ok(!(await releasesAuto(env)).done && !ghCalls.length, 'versiones: sin días elegidos, nunca sola');
    await A('POST', '/releases/settings', { body: { autoDays: 3 } });
    ok((await releasesAuto(env)).done && ghCalls.some(c => c.method === 'POST' && /Automático: 3 días/.test(c.body.inputs.reason)), 'versiones: con 5 días sin cambios (≥ 3) y las pruebas bien, se publica sola');
    mainDate = new Date().toISOString(); ghCalls.length = 0;
    ok(!(await releasesAuto(env)).done && !ghCalls.some(c => c.method === 'POST'), 'versiones: con un cambio reciente, espera');
    mainDate = new Date(old).toISOString(); testsOk = 'failure';
    ok(!(await releasesAuto(env)).done, 'versiones: con las pruebas mal, no');
    env.STAGE = 'test'; testsOk = 'success'; ok(!(await releasesAuto(env)).done, 'versiones: el servidor de pruebas nunca publica'); delete env.STAGE;
    // After going back, what was rolled back isn't published by itself again: only once main changes.
    backs = [{ conclusion: 'success', status: 'completed', created_at: new Date(Date.now() - 864e5).toISOString(), html_url: 'https://github.com/x/2' }];
    ok((await A('GET', '/releases')).j.held && (await releasesAuto(env)).held, 'volver atrás: después, no se vuelve a publicar solo');
    backs[0].created_at = new Date(Date.parse(mainDate) - 864e5).toISOString();
    ok(!(await A('GET', '/releases')).j.held && (await releasesAuto(env)).done, 'volver atrás: con un cambio nuevo en pruebas, sí');
    backs = [];
    await A('POST', '/releases/settings', { body: { autoDays: 0 } }); delete env.GITHUB_TOKEN; env.FETCH = prevF3;
  }

  // The test site: only invited people (the admin's list, and the admins) have an account there — asked to production.
  {
    env.INTERNAL_KEY = 'clave-interna';
    let x = await A('POST', '/testers', { body: { testers: ['Eva@Example.com', 'no-es-un-correo'] } });
    ok(x.status === 200 && x.j.testers.join() === 'eva@example.com', 'pruebas: la lista de invitados, limpia');
    ok((await A('GET', '/testers')).j.testers[0] === 'eva@example.com', 'pruebas: la lista se guarda');
    const asks = (email, key = 'clave-interna') => req('POST', '/api/internal/tester', { body: { email }, headers: { 'X-Internal-Key': key } });
    ok((await (await asks('eva@example.com')).json()).ok && !(await (await asks('gil@example.com')).json()).ok, 'pruebas: producción dice quién está invitado');
    ok((await asks('eva@example.com', 'otra')).status === 403, 'pruebas: solo con la clave interna');
    const { forgetTesters } = await import('../server/cloudflare/api.js'); forgetTesters();
    const stage = { ...env, STAGE: 'test', PROD: { fetch: (u, init) => worker.fetch(new Request(u, init), env) } };
    const sreq = (method, path, body, headers = {}) => worker.fetch(new Request(SITE + path, { method, headers: { Origin: SITE, ...(body && { 'Content-Type': 'application/json' }), ...headers }, ...(body && { body: JSON.stringify(body) }) }), stage);
    const evaT = await sreq('POST', '/api/login', { accessToken: 'tok-eva', terms: TERMS });
    ok(evaT.status === 200, 'pruebas: una invitada entra');
    const gilT = await sreq('POST', '/api/login', { accessToken: 'tok-gil', terms: TERMS });
    ok(gilT.status === 403 && (await gilT.json()).error === 'not a tester', 'pruebas: quien no está invitado, no');
    const ck = cookieFrom(evaT), me0 = await sreq('GET', '/api/me', null, { Cookie: ck }); ok(me0.status === 200, 'pruebas: con su sesión, todo normal: ' + me0.status + ' ' + (await me0.text()).slice(0, 120));
    await A('POST', '/testers', { body: { testers: [] } }); forgetTesters();
    ok((await sreq('GET', '/api/me', null, { Cookie: ck })).status === 401, 'pruebas: quitada de la lista, como si cerrara sesión');
    ok((await (await asks('jefe@example.com')).json()).ok, 'pruebas: los administradores, siempre');
    delete env.INTERNAL_KEY; forgetTesters();
  }

  // The website's visits (visits.js): no cookies, unique per day without keeping anyone; 404s; the sitemap's extras.
  {
    const V = await import('../server/cloudflare/visits.js'); env.VISITS = namespace(V.Visits, env);
    const hit = (b, { ip = '10.9.0.1', ua = 'Mozilla/5.0 Firefox', origin = SITE } = {}) => req('POST', '/api/visit', { origin, body: b, headers: { 'CF-Connecting-IP': ip, 'User-Agent': ua } });
    ok((await hit({ path: '/pricing' }, { origin: 'https://malo.example' })).status === 403, 'visitas: solo desde la propia web');
    await hit({ path: '/pricing.html', ref: 'https://www.google.com/search?q=revela+precios', lang: 'es' });
    await hit({ path: '/en/', ref: 'https://revelaslides.com/pricing', lang: 'en' });
    await hit({ path: '/pricing', ref: '', lang: 'es' }, { ip: '10.9.0.2' });
    await hit({ path: '/precios-viejos', ref: 'https://blog.example/post?id=7', kind: '404' }, { ip: '10.9.0.3' });
    await hit({ path: '/precios-viejos/', ref: 'https://revelaslides.com/guides', kind: '404' }, { ip: '10.9.0.3' });
    let x = await A('GET', '/web?days=7');
    const today = x.j.days.at(-1);
    ok(x.status === 200 && today.views === 3 && today.uniques === 3 && today.nf === 2, 'visitas: 3 vistas de 3 visitantes y 2 páginas que no existen: ' + JSON.stringify(today));
    ok(x.j.pages.find(p => p.k === '/pricing')?.n === 2 && x.j.refs.some(r => r.k === 'www.google.com') && !JSON.stringify(x.j).includes('q=revela'), 'visitas: páginas y de dónde vienen (sin la búsqueda ni otros parámetros)');
    ok(x.j.langs.find(l => l.k === 'es')?.n === 2, 'visitas: idiomas');
    const nf = x.j.notfound.find(n => n.path === '/precios-viejos');
    ok(nf && nf.n === 2 && nf.refs['blog.example/post'] === 1 && nf.refs['internal:/guides'] === 1, 'visitas: la página que no existe, con desde dónde (otra web, o una página nuestra con el enlace roto)');
    const raw = JSON.stringify([...env.VISITS.inst.get('visits').ctx.storage.m.entries()]);
    ok(!raw.includes('10.9.0') && !raw.includes('Firefox'), 'visitas: ni la dirección IP ni el navegador se guardan');
    // «¿Para qué vas a usar Revela?»: an anonymous count (the answer, its language, first or a change).
    { const aud = (b, origin = SITE) => req('POST', '/api/audience', { origin, body: b, headers: { 'CF-Connecting-IP': '10.7.0.1', 'User-Agent': 'Mozilla/5.0 Safari' } });
      ok((await aud({ v: 'biz', kind: 'first', lang: 'es' }, 'https://malo.example')).status === 403, 'público: solo desde la app');
      await aud({ v: 'biz', kind: 'first', lang: 'es' }); await aud({ v: 'edu', kind: 'first', lang: 'ca' }); await aud({ v: 'edu', kind: 'first', lang: 'ca' });
      await aud({ v: 'both', kind: 'skip', lang: 'es' }); await aud({ v: 'both', kind: 'change', lang: 'es' }); await aud({ v: 'otra', kind: 'first' });
      const au = await A('GET', '/audience?days=7');
      ok(au.status === 200 && au.j.total.biz === 1 && au.j.total.edu === 2 && au.j.total.skip === 1 && !au.j.total.both, 'público: docencia 2, empresa 1, saltada 1: ' + JSON.stringify(au.j.total));
      ok(au.j.langs.ca?.edu === 2 && au.j.days.at(-1).change.both === 1, 'público: por idioma, y los cambios aparte');
      const raw2 = JSON.stringify([...env.VISITS.inst.get('visits').ctx.storage.m.entries()].filter(([k]) => k.startsWith('a:')));
      ok(!raw2.includes('10.7.0') && !raw2.includes('Safari'), 'público: anónimo (ni dirección ni navegador)'); }
    // A new day: a new salt; yesterday's visitors can't be told apart from new ones.
    const salt0 = env.VISITS.inst.get('visits').ctx.storage.m.get('salt').value;
    at(realNow() + 864e5); await hit({ path: '/pricing' }); Date.now = realNow;
    const m = env.VISITS.inst.get('visits').ctx.storage.m;
    ok(m.get('salt').value !== salt0 && [...m.keys()].filter(k => k.startsWith('v:')).length === 1, 'visitas: cada día otra sal, y los visitantes del día anterior olvidados');
    // Redirecting a 404; the 404 page asks.
    ok((await A('POST', '/web/notfound', { body: { path: '/precios-viejos', status: 'redirect', to: 'javascript:alert(1)' } })).status === 400, 'visitas: redirigir solo a una dirección nuestra o https');
    await A('POST', '/web/notfound', { body: { path: '/precios-viejos', status: 'redirect', to: '/pricing' } });
    ok((await (await req('GET', '/api/redirect?path=/precios-viejos.html')).json()).to === '/pricing', 'visitas: la página 404 sabe adónde llevar');
    { const { APP_VERSION } = await import('../src/core/config.js'), v = await (await req('GET', '/api/version')).json();
      ok(v.version === APP_VERSION && /^\d+\.\d+\.\d+$/.test(v.version), 'versión: el servidor dice cuál es: ' + JSON.stringify(v)); }
    ok(!(await A('GET', '/web')).j.notfound.some(n => n.path === '/precios-viejos'), 'visitas: ya resuelta, fuera de la lista (con «all», sí)');
    // The sitemap: visited pages it leaves out, and the extras (in /community/sitemap.xml).
    const prevF4 = env.FETCH;
    env.FETCH = async (u, init = {}) => { const s = String(u);
      if (s === 'https://revelaslides.com/sitemap.xml') return new Response('<urlset><url><loc>https://revelaslides.com/</loc></url><url><loc>https://revelaslides.com/en/</loc></url></urlset>');
      if (/^https:\/\/revelaslides\.com\/(en\/)?$/.test(s) && init.method === 'HEAD') return new Response(null, { status: 200 });
      if (s.startsWith('https://revelaslides.com/') && init.method === 'HEAD') return new Response(null, { status: 404 });
      return prevF4(u, init); };
    if (!env.COMMUNITY) env.COMMUNITY = namespace((await import('../server/cloudflare/community.js')).Community, env);
    x = await A('GET', '/web'); ok(x.j.missing.some(p => p.k === '/pricing') && !x.j.missing.some(p => p.k === '/en'), 'visitas: «/pricing» se visita y no está en el sitemap');
    x = await A('POST', '/web/extra', { body: { extra: ['/pricing.html', '/app/', '/api/x', 'guides'] } });
    ok(x.j.extra.join() === '/pricing,/guides', 'sitemap: direcciones extra limpias (ni la app ni la API)');
    const sm = await (await worker.fetch(new Request(SITE + '/community/sitemap.xml'), env)).text();
    ok(sm.includes('<loc>https://revelaslides.com/pricing</loc>') && sm.includes('<loc>https://revelaslides.com/guides</loc>'), 'sitemap: las extra, en el sitemap dinámico');
    x = await A('GET', '/web'); ok(!x.j.missing.some(p => p.k === '/pricing'), 'sitemap: ya no falta');
    x = await A('POST', '/web/check', { body: {} });
    ok(x.j.checked >= 4 && x.j.bad.some(b => b.url === 'https://revelaslides.com/pricing' && b.status === 404) && !x.j.bad.some(b => b.url === 'https://revelaslides.com/'), 'sitemap: «Comprobar» dice qué dirección no responde');
    ok(x.j.total === x.j.checked && x.j.next === null && (await A('POST', '/web/check', { body: { offset: 1 } })).j.checked === x.j.total - 1, 'sitemap: por tandas (Cloudflare limita las peticiones de cada llamada)');
    env.FETCH = prevF4;

    // The app's errors (errors.js): sent by the app, grouped, counted, without anyone's text or who; solved or back.
    const { APP_VERSION: V0 } = await import('../src/core/config.js');
    const err = (b, { ip = '10.8.0.1', ua = 'Mozilla/5.0 Chrome/141', origin = SITE } = {}) => req('POST', '/api/errors', { origin, body: b, headers: { 'CF-Connecting-IP': ip, 'User-Agent': ua } });
    const rep = (line, extra = {}) => ({ msg: 'Invalid string length en "' + 'mi presentación secreta'.repeat(2) + '"', kind: 'error', version: V0, browser: 'Chrome 141 · Windows', lang: 'es',
      where: '/app/?doc=abc', actions: ['present', 'a b<script>'], stack: `RangeError: Invalid string length\n    at buildHTMLRaw (https://revelaslides.com/app/src/io/formats/html.js?v=7:${line}:174)\n    at present (blob:https://revelaslides.com/1234:1:2)`, ...extra });
    ok((await err(rep(603), { origin: 'https://malo.example' })).status === 403, 'errores: solo desde la app');
    await err(rep(603)); await err(rep(611)); await err(rep(603), { ip: '10.8.0.2' });
    await err({ ...rep(1), msg: 'Otra cosa', stack: 'TypeError: x\n    at f (https://revelaslides.com/app/src/ui/canvas/canvas.js:9:1)' });
    x = await A('GET', '/errors');
    const big = x.j.items.find(g => /Invalid string length/.test(g.msg));
    ok(x.status === 200 && x.j.items.length === 2 && big?.n === 3 && big.people === 2, 'errores: el mismo error (en otra línea) es uno, 3 veces de 2 personas: ' + JSON.stringify(x.j.items.map(g => [g.msg, g.n, g.people])));
    ok(!/secreta/.test(big.msg) && /"…"/.test(big.msg) && !/\?v=7|blob:https/.test(big.stack) && big.where === '/app/' && big.actions.present && big.actions.abscript === 3,
      'errores: sin el texto entre comillas, ni consultas, ni blob:, ni la dirección del documento, ni acciones raras: ' + JSON.stringify(big));
    const raw2 = JSON.stringify([...env.VISITS.inst.get('visits').ctx.storage.m.entries()]);
    ok(!raw2.includes('10.8.0') && !raw2.includes('Chrome/141'), 'errores: ni la IP ni el navegador completo se guardan');
    const L = 'abcdefghijklmnopqrstuvwxyz'; for (let i = 0; i < 40; i++) await err({ ...rep(1), msg: 'Bucle ' + L[i % 26] + L[Math.floor(i / 26)], stack: '' }, { ip: '10.8.0.9' });   // (numbers don't tell errors apart)
    x = await A('GET', '/errors?all=1'); ok(x.j.items.filter(g => /^Bucle/.test(g.msg)).length === 30, 'errores: como mucho 30 avisos por persona y día');
    ok((await A('GET', '/stats')).j.errors?.open >= 2, 'errores: en el resumen del admin');
    // Solved: still happening in the same version (people who haven't updated) stays solved; in a newer one, back.
    ok((await A('POST', '/errors', { body: { sig: big.sig, status: 'solved' } })).j.item.solvedIn === V0, 'errores: resuelto en la versión publicada');
    await err(rep(603), { ip: '10.8.0.3' });
    ok((await A('GET', '/errors?all=1')).j.items.find(g => g.sig === big.sig).status === 'solved', 'errores: en la misma versión, sigue resuelto');
    const [a1, b1, c1] = V0.split('.').map(Number);
    await err(rep(603, { version: `${a1}.${b1}.${c1 + 1}` }), { ip: '10.8.0.3' });
    const back = (await A('GET', '/errors')).j.items.find(g => g.sig === big.sig);
    ok(back?.status === 'new' && back.reopened, 'errores: en una versión más nueva, vuelve a «sin resolver»');
    ok((await A('POST', '/errors', { body: { sig: big.sig, status: 'raro' } })).status === 400, 'errores: solo estados conocidos');
    // A cloud presentation back to a moment (Cloudflare's point-in-time recovery: not in this simulator).
    ok((await A('POST', '/docs/restore', { body: { id: 'abc123def', at: Date.now() - 3600e3 } })).status === 400, 'restaurar: con motivo');
    ok((await A('POST', '/docs/restore', { body: { id: '../x', at: Date.now(), reason: 'r' } })).status === 400, 'restaurar: un documento de verdad');
    x = await A('POST', '/docs/restore', { body: { id: 'abc123def', at: Date.now() - 3600e3, reason: 'La borró por error' } });
    ok(x.status === 501 && x.j.error === 'not supported', 'restaurar: aquí no (solo en Cloudflare), y lo dice');
    ok((await A('GET', '/audit?target=doc:abc123def')).j.entries.some(e => e.action === 'doc-restore' && e.reason === 'La borró por error'), 'restaurar: en la auditoría');
    ok((await A('GET', '/users/nadie-aqui/docs')).status === 404, 'restaurar: las presentaciones de una cuenta que existe');
  }

  // Deleting the account takes it out of the directory.
  ok((await req('POST', '/api/account/delete', { headers: { Cookie: pia }, body: { confirm: 'pia@example.com' } })).status === 200 && (await A('GET', '/users?q=pia')).j.users.length === 0, 'cuenta eliminada: fuera del directorio');
  // Without the admin vars again: nothing.
  env.ADMIN_EMAILS = ''; ok((await adm('GET', '/stats')).status === 404, 'admin: al quitar las variables vuelve a 404');
  env.FETCH = prevFetch; resetAccessCerts();
}

// ---- The business's figures on a synthetic dataset (finance.js summarize(): pure) ----
{
  const s = { usdEur: 0.5, emailUsd: 0, feePct: 1.5, feeFixed: 0.25, creditUsd: 0.002, budget: 50 }, at = d => Date.parse(d);
  const days = {
    '2026-01-10': { 'pay.n': 1, 'pay.eur.gross': 12100, 'pay.eur.tax': 2100, 'pay.eur.fee': 100, 'pay.p.pro-month.n': 1, 'pay.p.pro-month.eur.gross': 12100, 'sub.new': 1, 'users.new': 4, 'act.dau': 3, 'act.mau': 3,
      'ai.n': 4, 'ai.usd': 2, 'ai.f.assistant.usd': 2, 'ai.f.assistant.n': 4, 'ai.m.google/gemini-2.5-flash.usd': 2, 'ai.m.google/gemini-2.5-flash.n': 4, 'cr.sold': 500, 'cr.used': 1000, 'cr.in.trial': 200 },
    '2026-02-05': { 'pay.n': 1, 'pay.usd.gross': 2000, 'pay.usd.fee': 100, 'ref.n': 1, 'ref.eur': 1000, 'act.dau': 1, 'act.mau': 2, 'bl.n': 1, 'bl.secs': 40, 'bl.usd': 4, 'mail.n': 3, 'mail.usd': 2, 'sub.cancel': 1, 'cr.out.expired': 30 },
  };
  const entries = [
    { id: 'a1', type: 'fixed', name: 'Servidor', amount: 31, currency: 'eur', date: '2026-01-01', recurring: true, category: 'infraestructura' },
    { id: 'a2', type: 'fixed', name: 'Logo', amount: 50, currency: 'usd', date: '2026-02-10', recurring: false, category: 'marketing' },
    { id: 'a3', type: 'fixed', name: 'Antes', amount: 99, currency: 'eur', date: '2025-06-01', recurring: true, until: '2025-12-31', category: 'software' },
    { id: 't1', type: 'time', date: '2026-01-15', hours: 10, category: 'desarrollo', note: '' },
    { id: 't2', type: 'time', date: '2026-02-01', hours: 5, category: 'soporte', note: '' },
    { id: 't3', type: 'time', date: '2026-03-01', hours: 99, category: 'soporte', note: 'fuera del periodo' },
  ];
  const subs = [{ id: 'sa', product: 'pro-month', cur: 'eur', monthly: 1000, start: at('2026-01-10'), periodEnd: at('2026-03-10'), end: null },
    { id: 'sb', product: 'pro-year', cur: 'eur', monthly: 800, start: at('2025-12-01'), periodEnd: at('2026-12-01'), end: at('2026-02-05') }];
  const users = { u1: { usd: 4, cr: 2000, n: 10, rev: { eur: 10000 } }, u2: { usd: 10, cr: 0, n: 3, rev: {} } };
  const r = summarize({ days, entries, subs, users, from: '2026-01-01', to: '2026-02-28', group: 'month', s, now: at('2026-03-15') });
  const [jan, feb] = r.series, t = r.totals;
  ok(r.series.length === 2 && jan.key === '2026-01' && feb.key === '2026-02', 'sintético: dos meses');
  ok(jan.gross === 121 && jan.tax === 21 && jan.revenue === 100 && jan.fees === 1 && jan.net === 99 && jan.ai === 1 && jan.fixed === 31 && jan.grossProfit === 98 && jan.profit === 67, 'sintético: enero: ' + JSON.stringify(jan));
  ok(feb.gross === 10 && feb.fees === 0.5 && feb.refunds === 10 && feb.net === -0.5 && feb.blender === 2 && feb.email === 1 && feb.fixed === 56 && feb.profit === -59.5, 'sintético: febrero (USD a EUR, gasto puntual, reembolso): ' + JSON.stringify(feb));
  ok(t.net === 98.5 && t.variable === 4 && t.grossProfit === 94.5 && t.fixed === 87 && t.profit === 7.5 && r.margins.gross === 0.9594 && r.margins.net === 0.0761, 'sintético: márgenes bruto y neto: ' + JSON.stringify([t, r.margins]));
  ok(jan.mrr === 18 && jan.subs === 2 && feb.mrr === 10 && feb.subs === 1 && feb.pro === 1 && r.subscriptions.mrr === 10 && r.subscriptions.atStart === 1 && r.subscriptions.churn === 0.5159 && r.subscriptions.new === 1, 'sintético: MRR, suscriptores y churn: ' + JSON.stringify(r.subscriptions));
  ok(r.users.conversion === 0.25 && r.users.userMonths === 5 && r.users.arpu === 19.7 && r.users.costPerActive === 0.8 && r.users.mau === 2 && r.users.signups === 4, 'sintético: conversión, ARPU y coste por usuario activo: ' + JSON.stringify(r.users));
  ok(r.time.hours === 15 && r.time.byCategory.desarrollo === 10 && r.time.byMonth['2026-02'].soporte === 5 && r.time.profitPerHour === 0.5, 'sintético: horas y beneficio por hora: ' + JSON.stringify(r.time));
  ok(r.credits.sold === 500 && r.credits.used === 1000 && r.credits.expired === 30 && r.credits.granted.trial === 200, 'sintético: créditos');
  ok(r.ai.byFeature.assistant.eur === 1 && r.ai.byModel['google/gemini-2.5-flash'].n === 4 && r.blender.seconds === 40 && r.email.sent === 3 && r.revenue.products['pro-month'].gross === 121, 'sintético: IA por función y modelo, Blender, correo, productos');
  ok(r.breakEven.fixedMonthly === 31 && r.breakEven.reached && r.breakEven.subsNeeded === 4 && r.fixed.byCategory.marketing === 25 && !r.fixed.byCategory.software, 'sintético: punto de equilibrio: ' + JSON.stringify(r.breakEven));
  ok(r.topUsers[0].sub === 'u2' && r.topUsers[0].profit === -5 && r.topUsers[1].revenue === 100 && r.topUsers[1].profit === 98 && r.fx.USD_EUR === 0.5, 'sintético: beneficio por usuario y tipo de cambio usado');
  const d = summarize({ days, entries, subs, users: {}, from: '2026-02-01', to: '2026-02-03', group: 'day', s, now: at('2026-03-15') });
  ok(d.series.length === 3 && d.series.every(b => b.fixed === 1.11) && d.series[0].hours === 5, 'sintético: por días, el gasto mensual repartido entre los días del mes');
  // Day sums from events, and manual entries checked.
  const b = bump(bump({}, { kind: 'ai', feature: 'image', model: 'x/y-1.5', usd: 0.5, credits: 15, blenderSecs: 2, blenderUsd: 0.1 }), { kind: 'credits', reason: 'expired', delta: -9 });
  ok(b['ai.f.image.n'] === 1 && b['ai.m.x/y-1.5.usd'] === 0.5 && b['cr.used'] === 15 && b['bl.secs'] === 2 && b['cr.out.expired'] === 9, 'bump: sumas del día');
  ok(featureOf('assistant') === 'assistant' && featureOf('__proto__') === 'other', 'funciones de IA: solo las conocidas');
  ok(cleanEntry({ type: 'fixed', name: ' Dominio ', amount: '12.345', currency: 'EUR', date: '2026-02-30', category: 'dominio' }) === null
    && cleanEntry({ type: 'fixed', name: ' Dominio ', amount: '12.345', currency: 'EUR', date: '2026-02-28', category: 'dominio' }).amount === 12.35
    && cleanEntry({ type: 'time', hours: 1, date: '2026-01-01', category: 'soporte', note: 'x'.repeat(900) }).note.length === 500, 'entradas: fechas, importes y notas comprobados');
  const csv = toCsv({ days, entries, money: [], from: '2026-01-01', to: '2026-02-28', s }).split('\r\n');
  ok(csv.filter(l => /;gasto fijo;Servidor \(mensual\);/.test(l)).length === 2 && csv.some(l => /^2026-02-10;gasto fijo;Logo;marketing;-50;USD;;;;-25;0,5;/.test(l)) && !csv.some(l => /Antes/.test(l)), 'CSV: gastos fijos por mes y puntuales, en su moneda y en EUR');
}

// ---- «Mi nube» as a manager: folders, stars, thumbnails, rename, duplicate, the trash (purged by the cron) ----
{
  const zoe = await login2('tok-zoe'), kai = await login2('tok-kai');
  await setPlan('2121', Date.now() + 365 * 864e5); await setPlan('2222', Date.now() + 365 * 864e5);
  const Z = () => acc('2121').ctx.storage.m, post = (c, path, body = {}) => req('POST', '/api/docs' + path, { headers: c ? { Cookie: c } : {}, body });
  const list = async (c = zoe) => (await req('GET', '/api/docs', { headers: { Cookie: c } })).json();
  // Folders: created, nested (3 deep at most), renamed, moved; names and number limited; only mine.
  let r = await post(zoe, '/folders', { name: '  Clases  ' }); let j = await r.json();
  ok(r.status === 200 && j.folder.name === 'Clases' && j.folder.parent === null && /^[\w-]{8}$/.test(j.folder.id), 'carpetas: crear una (nombre recortado)');
  const fA = j.folder.id;
  const fB = (await (await post(zoe, '/folders', { name: '1º ESO', parent: fA })).json()).folder.id;
  const fC = (await (await post(zoe, '/folders', { name: 'Tema 1', parent: fB })).json()).folder.id;
  r = await post(zoe, '/folders', { name: 'Demasiado', parent: fC }); ok(r.status === 400 && (await r.json()).error === 'too deep', 'carpetas: como mucho 3 niveles');
  ok((await post(zoe, '/folders', { name: 'x'.repeat(81) })).status === 400 && (await post(zoe, '/folders', { name: '   ' })).status === 400, 'carpetas: nombre de 1 a 80 caracteres');
  ok((await post(zoe, '/folders', { name: 'Huérfana', parent: 'noexiste' })).status === 404, 'carpetas: dentro de una que no existe, no');
  ok((await post(zoe, `/folders/${fA}`, { parent: fC })).status === 400, 'carpetas: no dentro de sí misma (ni de sus hijas)');
  ok((await post(kai, `/folders/${fA}`, { name: 'Mía' })).status === 404 && (await post(kai, `/folders/${fA}/delete`)).status === 404, 'carpetas: las de otra persona no existen para mí');
  ok((await post(zoe, `/folders/${fB}`, { name: 'Primero' })).status === 200 && Z().get('folders').find(f => f.id === fB).name === 'Primero', 'carpetas: cambiar el nombre');
  ok((await post(null, '/folders', { name: 'x' })).status === 401, 'carpetas: sin sesión, no');
  // Documents in folders; the list says what the manager shows.
  const deck = n => ({ name: n, slides: [{ id: 's1', blocks: [{ id: 't', type: 'text', ph: 'title', html: '<b>Volcanes</b> &amp; lava' }] }, { id: 's2', blocks: [{ id: 'u', type: 'text', html: 'Erupciones' }] }] });
  const d1 = (await (await post(zoe, '', { deck: deck('Ciencias'), folder: fC })).json()).id;
  const d2 = (await (await post(zoe, '', { deck: deck('Historia'), folder: 'noexiste' })).json()).id;
  j = await list(); let e1 = j.mine.find(d => d.id === d1);
  ok(e1.folder === fC && j.mine.find(d => d.id === d2).folder === null, 'en una carpeta al guardarla (si no existe, arriba)');
  ok(e1.slides === 2 && e1.text === 'Volcanes & lava · Erupciones' && e1.created > 0 && e1.updated > 0, 'número de diapositivas y sus títulos para buscar: ' + e1.text);
  ok(j.folders.length === 3 && j.trashDays === 30 && j.limit === 500, 'la lista trae las carpetas y los días de la papelera');
  // Moving and starring; others can't.
  ok((await post(zoe, `/${d2}/meta`, { folder: fA })).status === 200 && Z().get('docs').find(d => d.id === d2).folder === fA, 'mover a una carpeta');
  ok((await post(zoe, `/${d2}/meta`, { folder: 'noexiste' })).status === 404, 'a una carpeta que no existe, no');
  ok((await post(kai, `/${d2}/meta`, { folder: null })).status === 403 && Z().get('docs').find(d => d.id === d2).folder === fA, 'nadie más la mueve');
  ok((await post(zoe, `/${d2}/meta`, { starred: true })).status === 200 && (await list()).mine.find(d => d.id === d2).starred === true, 'destacarla');
  // Rename: the document changes too (everyone sees it); only with the edit role.
  r = await post(zoe, `/${d1}/meta`, { name: '  Geología  ' });
  ok(r.status === 200 && (await r.json()).name === 'Geología' && (await (await req('GET', `/api/docs/${d1}`, { headers: { Cookie: zoe } })).json()).deck.name === 'Geología'
    && (await list()).mine.find(d => d.id === d1).name === 'Geología', 'cambiar el nombre: en el documento y en la lista');
  ok((await post(kai, `/${d1}/meta`, { name: 'Mío' })).status === 403 && (await post(zoe, `/${d1}/meta`, { name: '' })).status === 400, 'renombrar: solo con permiso, y con nombre');
  // Thumbnails: a small image data URL, checked; read by anyone who can read it.
  const png = 'data:image/png;base64,' + 'iVBORw0KGgo'.padEnd(400, 'A') + '=';
  ok((await post(zoe, `/${d1}/thumb`, { thumb: 'data:image/svg+xml;base64,PHN2Zz4=' })).status === 400, 'miniatura: SVG no (podría llevar código)');
  ok((await post(zoe, `/${d1}/thumb`, { thumb: 'data:image/webp;base64,' + 'A'.repeat(41000) })).status === 400, 'miniatura: como mucho ~30 KB');
  ok((await post(zoe, `/${d1}/thumb`, { thumb: 'javascript:alert(1)' })).status === 400 && (await post(zoe, `/${d1}/thumb`, { thumb: png + '"><script>' })).status === 400, 'miniatura: solo una imagen');
  ok((await post(kai, `/${d1}/thumb`, { thumb: png })).status === 403, 'miniatura: solo quien puede editar');
  r = await post(zoe, `/${d1}/thumb`, { thumb: png }); j = await r.json();
  ok(r.status === 200 && j.at > 0 && (await list()).mine.find(d => d.id === d1).thumbAt === j.at, 'miniatura guardada, y la lista sabe de cuándo es');
  j = await (await post(zoe, '/thumbs', { ids: [d1, d2, 'mal', d1] })).json();
  ok(j.thumbs[d1] === png && !(d2 in j.thumbs) && Object.keys(j.thumbs).length === 1, 'varias miniaturas de una vez (las que hay)');
  ok(!Object.keys((await (await post(kai, '/thumbs', { ids: [d1] })).json()).thumbs).length, 'miniaturas: de las de otros, nada');
  // Shared with someone: they see it, can star it (in their list), not move it.
  await post(zoe, `/${d1}/share`, { people: { 'kai@example.com': 'edit' } });
  ok((await post(kai, `/${d1}/meta`, { starred: true })).status === 200 && (await list(kai)).shared.find(d => d.id === d1).starred === true && !Z().get('docs').find(d => d.id === d1).starred, 'compartida conmigo: la destaco en mi lista, no en la suya');
  ok((await post(kai, `/${d1}/meta`, { folder: fA })).status === 403, 'compartida conmigo: no va a mis carpetas');
  ok(Object.keys((await (await post(kai, '/thumbs', { ids: [d1] })).json()).thumbs).length === 1, 'y veo su miniatura');
  // Duplicate: a copy in the same folder, with its picture; counts against the plan.
  r = await post(zoe, `/${d1}/duplicate`, { name: 'Copia de Geología' }); const d3 = (await r.json()).id;
  e1 = (await list()).mine.find(d => d.id === d3);
  ok(r.status === 200 && e1.name === 'Copia de Geología' && e1.folder === fC && e1.thumbAt > 0 && (await (await req('GET', `/api/docs/${d3}`, { headers: { Cookie: zoe } })).json()).deck.slides.length === 2, 'duplicar: copia en la misma carpeta, con miniatura');
  const k3 = (await (await post(kai, `/${d1}/duplicate`)).json()).id;
  ok(k3 && (await list(kai)).mine.find(d => d.id === k3)?.folder === null, 'quien puede editarla, hace su copia (en su nube)');
  await post(zoe, `/${d1}/share`, { people: { 'kai@example.com': 'view' } });
  ok((await post(kai, `/${d1}/duplicate`)).status === 403, 'quien solo puede verla, no la copia');
  ok((await post(null, `/${d1}/duplicate`)).status === 401, 'sin sesión, no');
  // Deleting a folder: what it held goes up one level.
  ok((await post(zoe, `/folders/${fB}/delete`)).status === 200, 'borrar una carpeta');
  ok(Z().get('folders').find(f => f.id === fC).parent === fA && Z().get('folders').length === 2, 'sus carpetas suben un nivel');
  // The trash: the owner's only; shared people lose it meanwhile; restore; 30 days later the cron deletes it.
  ok((await post(kai, `/${d1}/trash`)).status === 403, 'papelera: solo la dueña');
  ok((await post(zoe, `/${d1}/trash`)).status === 200, 'a la papelera');
  j = await list(); e1 = j.mine.find(d => d.id === d1);
  ok(e1.trashed > 0 && !(await list(kai)).shared.some(d => d.id === d1) && (await req('GET', `/api/docs/${d1}`, { headers: { Cookie: kai } })).status === 404, 'en la papelera: quien la tenía compartida deja de verla');
  ok((await req('GET', `/api/docs/${d1}`, { headers: { Cookie: zoe } })).status === 200, 'la dueña aún puede abrirla');
  sent = [];
  ok((await post(zoe, `/${d1}/restore`)).status === 200 && !(await list()).mine.find(d => d.id === d1).trashed, 'restaurar');
  ok((await list(kai)).shared.find(d => d.id === d1)?.starred === true && (await req('GET', `/api/docs/${d1}`, { headers: { Cookie: kai } })).status === 200 && !sent.length, 'restaurada: vuelve a su lista (con su estrella), sin otro correo');
  await post(zoe, `/${d1}/trash`); await post(zoe, `/${d2}/trash`);
  const trashedAt = Z().get('docs').find(d => d.id === d1).trashed;
  at(trashedAt + 10 * DAYms); await runCron(Date.now()); Date.now = realNow;
  ok(Z().get('docs').some(d => d.id === d1), 'a los 10 días sigue en la papelera');
  at(trashedAt + 31 * DAYms); await runCron(Date.now()); Date.now = realNow;
  ok(!Z().get('docs').some(d => d.id === d1 || d.id === d2) && (await req('GET', `/api/docs/${d1}`, { headers: { Cookie: zoe } })).status === 404, 'a los 30 días el cron la borra para siempre');
  ok(!(await list(kai)).shared.some(d => d.id === d1), 'y de las listas de los demás');
  // Emptying the trash.
  await post(zoe, `/${d3}/trash`);
  j = await (await post(zoe, '/trash/empty')).json();
  ok(j.n === 1 && !j.more && !Z().get('docs').some(d => d.id === d3), 'vaciar la papelera');
  ok((await post(kai, '/trash/empty')).status === 200 && (await list(kai)).mine.some(d => d.id === k3), 'vaciar la mía no toca las de nadie más');
  // Folder limit
  Z().set('folders', Array.from({ length: 200 }, (_, i) => ({ id: 'f' + String(i).padStart(7, '0'), name: 'C' + i, parent: null, created: 1 })));
  r = await post(zoe, '/folders', { name: 'Una más' }); ok(r.status === 402 && (await r.json()).limit === 200, 'carpetas: como mucho 200');
}

// ---- The public API, the MCP server and OAuth (publicapi.js) ----
{
  const ada = await login2('tok-ada'), bea = await login2('tok-bea');
  const kreq = (method, path, key, body, origin = 'https://cualquiera.example') => req(method, path, { origin, headers: key ? { Authorization: 'Bearer ' + key } : {}, ...(body !== undefined && { body }) });
  // Keys: made from the app's session, shown once, only their hash kept.
  r = await req('POST', '/api/keys', { headers: { Cookie: ada }, body: { name: 'Mi script' } }); let j = await r.json();
  ok(r.status === 200 && /^rvk_[\w-]+\.[\w-]{40,}$/.test(j.key), 'clave de API creada');
  const key = j.key, keyId = j.id;
  ok(!JSON.stringify([...env.ACCOUNTS.inst.get('u:1717').ctx.storage.m]).includes(key.split('.')[1]), 'de la clave solo se guarda su hash');
  j = await (await req('GET', '/api/keys', { headers: { Cookie: ada } })).json();
  ok(j.keys.length === 1 && j.keys[0].name === 'Mi script' && j.keys[0].kind === 'key' && !JSON.stringify(j).includes(key.split('.')[1]), 'la lista de claves no las enseña');
  // A key opens only /api/v1 and /api/mcp.
  ok((await kreq('GET', '/api/me', key)).status === 403, 'una clave no abre la cuenta');
  ok((await kreq('POST', '/api/keys', key, { name: 'x' })).status === 403, 'una clave no crea más claves');
  ok((await kreq('POST', '/api/ai/chat', key, { messages: [] })).status === 403, 'una clave no gasta créditos de IA');
  r = await kreq('GET', '/api/v1/me', key); j = await r.json();
  ok(r.status === 200 && j.email === 'ada@example.com' && r.headers.get('Access-Control-Allow-Origin') === '*', 'v1/me con la clave, desde cualquier web');
  ok((await kreq('GET', '/api/v1/me', null)).status === 401, 'sin clave: 401');
  ok((await kreq('GET', '/api/v1/me', 'rvk_' + Buffer.from('1717').toString('base64url') + '.' + 'x'.repeat(43))).status === 401, 'clave inventada: 401');
  ok((await req('GET', '/api/v1/me', { headers: { Cookie: ada } })).status === 401, 'la cookie no abre la API pública');
  // Making a deck from specs: laid out with a design.
  env.UNSPLASH_ACCESS_KEY = 'unsplash-secreta';
  r = await kreq('POST', '/api/v1/decks', key, { name: 'Energía solar', design: 'ocean', slides: [{ kind: 'title', title: 'Energía solar', subtitle: 'Introducción' },
    { kind: 'bullets', title: 'Ventajas', bullets: ['Limpia', 'Barata', ['cada vez más']], notes: 'Contar el caso de Almería' },
    { kind: 'chart', title: 'Potencia', chart: { type: 'bar', labels: ['2020', '2025'], values: [10, 30] }, source: 'Datos de ejemplo' },
    { kind: 'image', title: 'Un faro', bullets: ['Con foto'], image_search: 'lighthouse' }, { kind: 'raro', title: '<script>x</script>', bullets: ['a'] }] });
  j = await r.json(); const did = j.id; delete env.UNSPLASH_ACCESS_KEY;
  ok(r.status === 200 && did && j.url === SITE + '/app/?doc=' + did && j.slides === 5, 'crear una presentación por la API');
  r = await kreq('GET', '/api/v1/decks/' + did, key); j = await r.json();
  const deck = j.deck;
  ok(j.role === 'owner' && deck.name === 'Energía solar' && deck.slides.length === 5 && deck.palette && deck.layouts?.length, 'con el diseño elegido y sus diseños de diapositiva');
  ok(deck.slides[1].notes === 'Contar el caso de Almería' && deck.slides[2].blocks.some(b => b.type === 'chart'), 'notas y gráfico en su sitio');
  ok(deck.slides[3].blocks.some(b => b.type === 'image' && b.src === 'https://images.unsplash.com/r.jpg' && /Ana Foto/.test(b.caption)), 'image_search: una foto real con su autor');
  ok(!JSON.stringify(deck.slides[4]).includes('<script>'), 'el texto llega escapado');
  // Outline and text.
  j = await (await kreq('GET', `/api/v1/decks/${did}?format=outline`, key)).json();
  ok(j.outline.slides.length === 5 && j.outline.slides[1].title === 'Ventajas' && j.outline.slides[1].text.join(' ').includes('Barata'), 'el esquema para una IA');
  const sid = j.outline.slides[1].id;
  r = await kreq('GET', `/api/v1/decks/${did}?format=text`, key);
  ok(/^text\/markdown/.test(r.headers.get('Content-Type')) && (await r.text()).includes(`[id: ${sid}]`), 'y en texto, con los ids');
  // Changing it.
  j = await (await kreq('POST', `/api/v1/decks/${did}/slides`, key, { markdown: '## Inconvenientes\n- De noche no\n---\n## Fin', position: 3 })).json();
  ok(j.added?.length === 2, 'añadir diapositivas en Markdown');
  let d2 = (await (await kreq('GET', '/api/v1/decks/' + did, key)).json()).deck;
  ok(d2.slides.length === 7 && d2.slides[2].id === j.added[0], 'en la posición pedida');
  r = await kreq('POST', `/api/v1/decks/${did}/slides/${sid}`, key, { spec: { kind: 'steps', title: 'Cómo instalar', steps: [{ title: 'Medir', text: 'El tejado' }, { title: 'Montar', text: 'Los paneles' }] }, notes: 'Nuevo', hidden: true });
  d2 = (await (await kreq('GET', '/api/v1/decks/' + did, key)).json()).deck;
  const ch = d2.slides.find(s => s.id === sid);
  ok(r.status === 200 && ch.notes === 'Nuevo' && ch.hidden === true && JSON.stringify(ch.blocks).includes('Cómo instalar'), 'cambiar una diapositiva desde una especificación');
  j = await (await kreq('POST', `/api/v1/decks/${did}/replace`, key, { find: 'Energía', replace: 'Energía & sol' })).json();
  d2 = (await (await kreq('GET', '/api/v1/decks/' + did, key)).json()).deck;
  ok(j.changed >= 1 && JSON.stringify(d2.slides[0].blocks).includes('Energía &amp; sol'), 'buscar y reemplazar (escapado en el HTML)');
  r = await kreq('POST', `/api/v1/decks/${did}/slides/${sid}/delete`, key, {});
  ok(r.status === 200 && (await (await kreq('GET', `/api/v1/decks/${did}?format=outline`, key)).json()).outline.slides.length === 6, 'borrar una diapositiva');
  ok((await kreq('POST', `/api/v1/decks/${did}/rename`, key, { name: 'Sol' })).status === 200 && (await (await kreq('GET', '/api/v1/decks', key)).json()).decks.some(d => d.id === did && d.name === 'Sol'), 'renombrar y listar');
  j = await (await kreq('POST', `/api/v1/decks/${did}/share`, key, { link: 'present' })).json();
  ok(j.url === `${SITE}/app/view.html?doc=${did}`, 'compartir por enlace (solo presentar)');
  ok((await req('GET', `/api/docs/${did}`, { origin: null })).status === 200, 'y el enlace abre sin sesión');
  // Someone else's key can't touch it.
  const bkey = (await (await req('POST', '/api/keys', { headers: { Cookie: bea }, body: { name: 'b' } })).json()).key;
  ok((await kreq('POST', `/api/v1/decks/${did}/slides`, bkey, { slides: [{ kind: 'title', title: 'x' }] })).status === 403, 'la clave de otra persona no la cambia');
  ok((await kreq('POST', `/api/v1/decks/${did}/trash`, bkey, {})).status >= 403, 'ni la borra');
  ok((await kreq('POST', '/api/v1/decks', key, { slides: Array.from({ length: 61 }, () => ({ kind: 'title', title: 'x' })) })).status === 400, 'como mucho 60 diapositivas de una vez');
  // The free plan's limit applies (3 in the cloud).
  for (let i = 0; i < 3; i++) await kreq('POST', '/api/v1/decks', bkey, { name: 'B' + i, markdown: '# B' });
  ok((await kreq('POST', '/api/v1/decks', bkey, { name: 'otra', markdown: '# x' })).status === 402, 'el límite del plan también por la API');

  // ---- MCP ----
  const mcp = (key, body) => kreq('POST', '/api/mcp', key, body);
  r = await mcp(null, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  ok(r.status === 401 && /resource_metadata="https:\/\/revelaslides\.com\/\.well-known\/oauth-protected-resource\/api\/mcp"/.test(r.headers.get('WWW-Authenticate')), 'MCP sin clave: 401 que lleva a OAuth');
  j = await (await mcp(key, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })).json();
  ok(j.result?.protocolVersion === '2025-06-18' && j.result.capabilities.tools && j.result.serverInfo.name === 'revela', 'MCP: initialize');
  ok((await mcp(key, { jsonrpc: '2.0', method: 'notifications/initialized' })).status === 202, 'MCP: las notificaciones no tienen respuesta');
  j = await (await mcp(key, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
  const names = j.result.tools.map(x => x.name);
  ok(['list_presentations', 'get_presentation', 'create_presentation', 'add_slides', 'update_slide', 'delete_slides', 'replace_text', 'share_presentation'].every(x => names.includes(x)) && j.result.tools.every(x => x.inputSchema?.type === 'object' && !x.action), 'MCP: las herramientas');
  ok(j.result.tools.find(x => x.name === 'create_presentation').description.includes('"bullets"'), 'MCP: crear explica los tipos de diapositiva');
  j = await (await mcp(key, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_presentation', arguments: { name: 'Desde Claude', markdown: '# Hola\nmundo\n---\n## Puntos\n- uno\n- dos' } } })).json();
  const mid = j.result?.structuredContent?.id;
  ok(mid && !j.result.isError && j.result.content[0].text.includes('/app/?doc='), 'MCP: crear una presentación');
  j = await (await mcp(key, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_presentation', arguments: { id: mid } } })).json();
  ok(/## 2\. Puntos/.test(j.result.content[0].text), 'MCP: leerla');
  j = await (await mcp(key, [{ jsonrpc: '2.0', id: 5, method: 'ping' }, { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'get_presentation', arguments: { id: 'x'.repeat(16) } } }])).json();
  ok(Array.isArray(j) && j[0].result && j[1].result.isError, 'MCP: lotes, y los errores como resultado de la herramienta');
  j = await (await mcp(key, { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'nada' } })).json();
  ok(j.error?.code === -32602, 'MCP: herramienta desconocida');
  j = await (await mcp(key, { jsonrpc: '2.0', id: 8, method: 'resources/list' })).json();
  ok(j.error?.code === -32601, 'MCP: método desconocido');

  // ---- OAuth (Claude's and ChatGPT's connectors) ----
  j = await (await worker.fetch(new Request(SITE + '/.well-known/oauth-protected-resource/api/mcp'), env)).json();
  ok(j.resource === SITE + '/api/mcp' && j.authorization_servers[0] === SITE, 'OAuth: el recurso protegido');
  j = await (await worker.fetch(new Request(SITE + '/.well-known/oauth-authorization-server'), env)).json();
  ok(j.token_endpoint === SITE + '/api/oauth/token' && j.code_challenge_methods_supported.includes('S256') && j.registration_endpoint, 'OAuth: el servidor de autorización');
  const cb = 'https://claude.ai/api/mcp/auth_callback';
  r = await req('POST', '/api/oauth/register', { origin: 'https://claude.ai', body: { client_name: 'Claude', redirect_uris: [cb] } }); j = await r.json();
  ok(r.status === 201 && j.client_id?.startsWith('c_'), 'OAuth: registro dinámico');
  const cid = j.client_id;
  ok((await req('POST', '/api/oauth/register', { body: { client_name: 'x', redirect_uris: ['javascript:alert(1)'] } })).status === 400, 'OAuth: solo direcciones https');
  const ver = 'v'.repeat(20) + crypto.randomUUID().replace(/-/g, '') + 'abc', chal = await sha256(ver);
  const authz = (extra = {}) => worker.fetch(new Request(SITE + '/api/oauth/authorize?' + new URLSearchParams({ response_type: 'code', client_id: cid, redirect_uri: cb, state: 'st1', code_challenge: chal, code_challenge_method: 'S256', ...extra })), env);
  r = await authz();
  const loc = r.headers.get('Location') || '';
  ok(r.status === 302 && loc.startsWith(SITE + '/app/?connect='), 'OAuth: authorize lleva a la aplicación');
  ok((await authz({ redirect_uri: 'https://malo.example/cb' })).status === 400, 'OAuth: otra dirección de vuelta, no');
  ok((await authz({ client_id: cid.slice(0, -3) + 'xyz' })).status === 400, 'OAuth: un cliente falsificado, no');
  const creq = decodeURIComponent(loc.split('connect=')[1]);
  j = await (await req('POST', '/api/oauth/info', { body: { req: creq } })).json();
  ok(j.client === 'Claude' && j.host === 'claude.ai', 'OAuth: la aplicación dice quién pide');
  ok((await req('POST', '/api/oauth/approve', { body: { req: creq } })).status === 401, 'OAuth: aprobar pide sesión');
  ok((await kreq('POST', '/api/oauth/approve', key, { req: creq })).status === 403, 'OAuth: una clave no aprueba');
  j = await (await req('POST', '/api/oauth/approve', { headers: { Cookie: ada }, body: { req: creq } })).json();
  const back = new URL(j.redirect), code = back.searchParams.get('code');
  ok(back.origin + back.pathname === cb && back.searchParams.get('state') === 'st1' && code, 'OAuth: vuelve con el código y el estado');
  const tok = body => worker.fetch(new Request(SITE + '/api/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://claude.ai' }, body: new URLSearchParams(body) }), env);
  r = await tok({ grant_type: 'authorization_code', code, redirect_uri: cb, client_id: cid, code_verifier: 'w'.repeat(50) });
  ok(r.status === 400 && (await r.json()).error === 'invalid_grant', 'OAuth: PKCE equivocado, no');
  j = await (await req('POST', '/api/oauth/approve', { headers: { Cookie: ada }, body: { req: creq } })).json();
  const code2 = new URL(j.redirect).searchParams.get('code');
  r = await tok({ grant_type: 'authorization_code', code: code2, redirect_uri: cb, client_id: cid, code_verifier: ver }); j = await r.json();
  ok(r.status === 200 && j.access_token?.startsWith('rvk_') && j.refresh_token?.startsWith('rvr_') && j.token_type === 'Bearer', 'OAuth: el código da el token');
  ok((await tok({ grant_type: 'authorization_code', code: code2, redirect_uri: cb, client_id: cid, code_verifier: ver })).status === 400, 'OAuth: el código sirve una vez');
  const at1 = j.access_token, rt1 = j.refresh_token;
  j = await (await mcp(at1, { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'list_presentations', arguments: {} } })).json();
  ok(j.result?.structuredContent?.decks.some(d => d.name === 'Desde Claude'), 'OAuth: el token abre el MCP');
  j = await (await req('GET', '/api/keys', { headers: { Cookie: ada } })).json();
  const ok1 = j.keys.find(k => k.kind === 'oauth');
  ok(ok1?.client === 'Claude' && ok1.expires > Date.now(), 'OAuth: aparece en Desarrolladores, con su caducidad');
  r = await tok({ grant_type: 'refresh_token', refresh_token: rt1 }); j = await r.json();
  ok(r.status === 200 && j.access_token !== at1 && j.refresh_token !== rt1, 'OAuth: renovar el token');
  ok((await mcp(at1, { jsonrpc: '2.0', id: 10, method: 'ping' })).status === 401, 'OAuth: el token viejo deja de valer');
  ok((await tok({ grant_type: 'refresh_token', refresh_token: rt1 })).status === 400, 'OAuth: y el de renovar también');
  const at2 = j.access_token;
  ok((await req('POST', `/api/keys/${ok1.id}/delete`, { headers: { Cookie: ada } })).status === 200 && (await mcp(at2, { jsonrpc: '2.0', id: 11, method: 'ping' })).status === 401, 'OAuth: revocarlo en Desarrolladores');
  // Revoking a personal key.
  ok((await req('POST', `/api/keys/${keyId}/delete`, { headers: { Cookie: ada } })).status === 200 && (await kreq('GET', '/api/v1/me', key)).status === 401, 'revocar una clave');
}

// ---- Live broadcast to a big audience (broadcast.js) ----
{
  const rooms = new Map();
  env.LIVE = { idFromName: n => n, get: id => { if (!rooms.has(id)) { const ctx = { storage: fakeStorage(), sockets: [], acceptWebSocket(ws, tags) { ws.tags = tags; this.sockets.push(ws); },
    getWebSockets(tag) { return this.sockets.filter(x => !x.closed && (!tag || x.tags.includes(tag))); }, getTags: ws => ws.tags }; rooms.set(id, new Broadcast(ctx, env)); }
    const o = rooms.get(id); return { fetch: (u, init) => o.fetch(u instanceof Request ? u : new Request(u, init)) }; } };
  const cid = await login2('tok-cid'), dan = await login2('tok-dan');
  const deck = { name: 'Charla', size: { w: 1280, h: 720 }, slides: [{ id: 's1', blocks: [] }, { id: 's2', blocks: [] }] };
  const { id: doc } = await (await req('POST', '/api/docs', { headers: { Cookie: cid }, body: { deck } })).json();
  ok((await req('POST', '/api/live', { body: { doc } })).status === 401, 'emisión: empezar pide sesión');
  ok((await req('POST', '/api/live', { headers: { Cookie: dan }, body: { doc } })).status >= 403, 'emisión: solo quien puede editarla');
  ok((await req('POST', '/api/live', { headers: { Cookie: cid }, body: { doc } })).status === 409, 'emisión: si su enlace no deja verla, lo dice');
  await req('POST', `/api/docs/${doc}/share`, { headers: { Cookie: cid }, body: { link: 'present' } });
  let r = await req('POST', '/api/live', { headers: { Cookie: cid }, body: { doc } }), j = await r.json();
  ok(r.status === 200 && j.room && j.token && j.url === `${SITE}/app/view.html?doc=${doc}&live=${j.room}`, 'emisión: la sala y el enlace para el público');
  ok((await req('GET', '/api/live/nohay-esta-sala-x')).status === 404, 'emisión: una sala que no existe');
  const B = rooms.get(j.room), meta = await B.ctx.storage.get('meta');
  ok(meta.doc === doc && meta.token !== j.token, 'emisión: del token solo su hash');
  const sock = () => ({ got: [], closed: false, send(s) { this.got.push(JSON.parse(s)); }, close() { this.closed = true; }, last(t) { return this.got.filter(m => m.t === t).at(-1); } });
  const pres = sock(), a1 = sock(), a2 = sock();
  await B.join(pres, true, meta); await B.join(a1, false, meta); await B.join(a2, false, meta);
  ok(a1.last('hello')?.doc === doc && a1.last('hello').state.h === 0 && !a1.last('hello').presenter, 'emisión: el público entra y sabe dónde va');
  await B.webSocketMessage(pres, JSON.stringify({ t: 'go', h: 1, v: 0, f: 2 }));
  ok(a1.last('go')?.h === 1 && a2.last('go')?.f === 2, 'emisión: todos siguen la diapositiva y el paso');
  await B.webSocketMessage(pres, JSON.stringify({ t: 'ptr', x: 0.25, y: 2 }));
  ok(a1.last('ptr')?.x === 0.25 && a1.last('ptr').y === 1, 'emisión: y el puntero (dentro de la diapositiva)');
  await B.webSocketMessage(a1, JSON.stringify({ t: 'go', h: 0 }));
  ok(a2.last('go').h === 1, 'emisión: el público no puede mover a los demás');
  const late = sock(); await B.join(late, false, meta);
  ok(late.last('hello').state.h === 1 && late.last('hello').state.f === 2, 'emisión: quien llega tarde entra donde va');
  B.count(true); ok(pres.last('n')?.n === 3, 'emisión: quien presenta ve cuántos le siguen');
  // The audience spread over relays (each viewer in one): they get it all through the room.
  env.LIVE.get(j.room + '~0'); env.LIVE.get(j.room + '~3'); const R0 = rooms.get(j.room + '~0'), R3 = rooms.get(j.room + '~3');
  const rel0 = await R0.asRelay(j.room, 0), rel3 = await R3.asRelay(j.room, 3);
  ok(rel0?.doc === doc && (await B.ctx.storage.get('relays')).join() === '0,3', 'emisión: las repetidoras se apuntan a la sala con su primer espectador');
  env.LIVE.get('nohay-esta-sala-x~1');
  ok(!(await rooms.get('nohay-esta-sala-x~1').asRelay('nohay-esta-sala-x', 1)), 'emisión: una repetidora de una sala que no existe no acepta a nadie');
  const v0 = sock(), v3 = sock(); await R0.relayJoin(v0, rel0); await R3.relayJoin(v3, rel3);
  ok(v0.last('hello')?.state.h === 1 && v0.last('hello').state.f === 2 && v0.last('hello').doc === doc, 'emisión: en la repetidora se entra donde va la presentación');
  await B.webSocketMessage(pres, JSON.stringify({ t: 'go', h: 4, v: 0, f: -1 })); await new Promise(r => setTimeout(r, 30));
  ok(v0.last('go')?.h === 4 && v3.last('go')?.h === 4 && a1.last('go')?.h === 4, 'emisión: el cambio llega a todas las repetidoras (y a quien entró directo)');
  const q = v0.last('go').q; await R0.pushed({ t: 'go', h: 2, v: 0, f: -1, q: q - 1 });
  ok(v0.last('go').h === 4 && (await R0.ctx.storage.get('state')).h === 4, 'emisión: una repetidora nunca vuelve a un cambio anterior (si llegan desordenados)');
  // The pointer: with many viewers, less often, and always its last position.
  for (let k = 0; k < 1500; k++) R0.ctx.sockets.push({ tags: ['v'], send() {}, closed: false });
  const before = v0.got.filter(m => m.t === 'ptr').length;
  for (let k = 0; k < 5; k++) await R0.pushed({ t: 'ptr', x: k / 10, y: 0.5 });
  ok(v0.got.filter(m => m.t === 'ptr').length === before + 1, 'emisión: con 1500 espectadores en una repetidora, el puntero no sale cinco veces seguidas');
  await new Promise(r => setTimeout(r, 450));
  ok(v0.last('ptr')?.x === 0.4, 'emisión: y enseguida sale su última posición');
  R0.ctx.sockets = R0.ctx.sockets.filter(x => x.got);
  await new Promise(r => setTimeout(r, 2200));
  ok(pres.last('n')?.n >= 4, 'emisión: quien presenta cuenta también a los de las repetidoras: ' + pres.last('n')?.n);
  await B.webSocketMessage(pres, JSON.stringify({ t: 'end' }));
  ok(a1.last('end') && a1.closed && !(await B.ctx.storage.get('meta')), 'emisión: al terminar, todos fuera y la sala borrada');
  ok(v0.last('end') && v0.closed && v3.closed && !(await R0.ctx.storage.get('relay')), 'emisión: y las repetidoras también');
}

// ---- Single sign-on with a team's own identity provider (sso.js) ----
{
  const ISS = 'https://idp.escuela-sso.example', DOM = 'escuela-sso.example', realF = env.FETCH;
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = async c => { const h = b64({ alg: 'RS256', kid: 'k1' }), p = b64(c); return `${h}.${p}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url')}`; };
  let txt = '', claims = null, tokenBody = null;
  env.FETCH = async (u, init = {}) => { u = String(u);
    if (u === ISS + '/.well-known/openid-configuration') return Response.json({ issuer: ISS, authorization_endpoint: ISS + '/authorize', token_endpoint: ISS + '/token', jwks_uri: ISS + '/jwks' });
    if (u === ISS + '/jwks') return Response.json({ keys: [jwk] });
    if (u === ISS + '/token') { tokenBody = new URLSearchParams(String(init.body)); return Response.json({ id_token: await jwt(claims) }); }
    if (u.startsWith('https://cloudflare-dns.com/dns-query')) return Response.json({ Answer: txt && u.includes(DOM) ? [{ data: `"${txt}"` }] : [] });
    return realF(u, init); };
  try {
    const noa = await login2('tok-noa');
    const { id: team } = await (await req('POST', '/api/team', { headers: { Cookie: noa }, body: { name: 'Escuela SSO' } })).json();
    const TS = env.TEAMS.inst.get('team:' + team).ctx.storage.m, tt = TS.get('team'); tt.seats = 5; tt.until = Date.now() + 30 * 864e5; TS.set('team', tt);
    const S = (path, body) => req(body === undefined ? 'GET' : 'POST', '/api/team/sso' + path, { headers: { Cookie: noa }, body });
    let j = await (await S('')).json();
    ok(j.sso === null && j.redirect === SITE + '/api/sso/callback', 'SSO: la dirección de vuelta para registrar en el proveedor');
    ok((await S('', { issuer: ISS, clientId: 'cli', clientSecret: 'sec', domains: ['gmail.com'] })).status === 400, 'SSO: un dominio de correo público, no');
    ok((await S('', { issuer: 'http://idp.example', clientId: 'cli', domains: [DOM] })).status === 400, 'SSO: el proveedor, solo https');
    j = await (await S('', { issuer: ISS, clientId: 'cli', clientSecret: 'sec', domains: [DOM], autoJoin: true })).json();
    const tok = j.sso.domains[0].token;
    ok(j.sso.hasSecret && !j.sso.domains[0].verified && tok && !JSON.stringify(j).includes('"sec"'), 'SSO: configurado, el secreto no vuelve, el dominio sin verificar');
    const start = email => worker.fetch(new Request(`${SITE}/api/sso/start?` + new URLSearchParams({ email, terms: TERMS, lang: 'es' })), env);
    ok((await start('ana@' + DOM)).headers.get('Location') === SITE + '/app/?sso=none', 'SSO: sin verificar el dominio, no se usa');
    ok((await (await S('/verify', { domain: DOM })).json()).verified === false, 'SSO: sin el registro TXT, no se verifica');
    txt = 'revela-verify=' + tok;
    ok((await (await S('/verify', { domain: DOM })).json()).verified === true, 'SSO: con el TXT, verificado');
    // Another team can't take the domain.
    const ivo = await login2('tok-ivo'); const t2 = (await (await req('POST', '/api/team', { headers: { Cookie: ivo }, body: { name: 'Otro' } })).json()).id;
    const s2 = await (await req('POST', '/api/team/sso', { headers: { Cookie: ivo }, body: { issuer: 'https://malo.example', clientId: 'x', clientSecret: 'y', domains: [DOM] } })).json();
    txt = 'revela-verify=' + s2.sso.domains[0].token;
    ok((await req('POST', '/api/team/sso/verify', { headers: { Cookie: ivo }, body: { domain: DOM } })).status === 409, 'SSO: un dominio ya verificado por otro equipo, no');
    // Signing in.
    let r = await start('Ana@' + DOM), loc = new URL(r.headers.get('Location'));
    ok(r.status === 302 && loc.origin + loc.pathname === ISS + '/authorize' && loc.searchParams.get('client_id') === 'cli' && loc.searchParams.get('code_challenge_method') === 'S256' && loc.searchParams.get('login_hint') === 'ana@' + DOM, 'SSO: lleva al proveedor (PKCE, con su correo)');
    const state = loc.searchParams.get('state'), nonce = loc.searchParams.get('nonce'), challenge = loc.searchParams.get('code_challenge');
    const cb = (st = state) => worker.fetch(new Request(`${SITE}/api/sso/callback?` + new URLSearchParams({ code: 'c0de', state: st })), env);
    claims = { iss: ISS, aud: 'otra', sub: 'u-1', email: 'ana@' + DOM, nonce, exp: Math.floor(Date.now() / 1000) + 600 };
    ok((await cb()).headers.get('Location') === SITE + '/app/?sso=token', 'SSO: un token para otra aplicación, no');
    claims = { ...claims, aud: 'cli', nonce: 'otro' };
    ok((await cb()).headers.get('Location') === SITE + '/app/?sso=token', 'SSO: otro nonce, no');
    claims = { ...claims, nonce, email: 'ana@otro-sitio.example' };
    ok((await cb()).headers.get('Location') === SITE + '/app/?sso=domain', 'SSO: un correo de otro dominio, no');
    ok((await cb(state.slice(0, -2) + 'xx')).headers.get('Location') === SITE + '/app/?sso=expired', 'SSO: un estado falsificado, no');
    claims = { ...claims, email: 'ana@' + DOM, name: 'Ana <SSO>' };
    r = await cb();
    ok(r.headers.get('Location') === SITE + '/app/?sso=ok' && /rv_session=/.test(r.headers.get('Set-Cookie') || ''), 'SSO: entra, con su sesión');
    ok(tokenBody.get('client_secret') === 'sec' && Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tokenBody.get('code_verifier')))).toString('base64url') === challenge, 'SSO: el código se canjea con el secreto y el verificador PKCE');
    const ck = (r.headers.get('Set-Cookie') || '').split(';')[0];
    const me = await (await req('GET', '/api/me', { headers: { Cookie: ck } })).json();
    ok(me.email === 'ana@' + DOM && me.name === 'Ana SSO' && me.plan === 'pro' && me.team?.name === 'Escuela SSO', 'SSO: su cuenta, ya en el equipo (Pro)');
    ok([...env.ACCOUNTS.inst.keys()].some(k => /^u:sso:[\w-]{32}$/.test(k)), 'SSO: una cuenta propia, no la de Google');
  } finally { env.FETCH = realF; }
}

// ---- Integrations: Slack, Teams… and signed JSON (hooks.js) ----
{
  const realF = env.FETCH, got = [];
  env.FETCH = async (u, init = {}) => { u = String(u); if (/hooks\.slack\.com|discord\.com|hooks\.example\.org/.test(u)) { got.push({ u, body: JSON.parse(init.body), headers: init.headers }); return new Response('ok', { status: u.includes('falla') ? 500 : 200 }); } return realF(u, init); };
  try {
    const una = await login2('tok-una'), kai = await login2('tok-kai');
    const H = (path, body) => req(body === undefined ? 'GET' : 'POST', '/api/hooks' + path, { headers: { Cookie: una }, body });
    ok((await H('', { url: 'http://hooks.slack.com/services/x', events: ['opened'] })).status === 400, 'integraciones: solo https');
    ok((await H('', { url: 'https://localhost/x', events: ['opened'] })).status === 400, 'integraciones: no direcciones internas');
    ok((await H('', { url: 'https://hooks.slack.com/services/T/B/x', events: ['nada'] })).status === 400, 'integraciones: algún evento conocido');
    let j = await (await H('', { url: 'https://hooks.slack.com/services/T/B/secreto', events: ['opened', 'comment'] })).json();
    ok(j.id && j.kind === 'slack', 'integraciones: Slack reconocido');
    const slack = j.id;
    j = await (await H('', { url: 'https://hooks.example.org/revela', events: ['comment'] })).json(); const gen = j, sec = j.secret;
    j = await (await H('')).json();
    ok(j.hooks.length === 2 && !JSON.stringify(j).includes('secreto') && !JSON.stringify(j).includes(sec), 'integraciones: la lista no enseña la dirección entera ni el secreto');
    j = await (await H(`/${slack}/test`, {})).json();
    ok(j.ok && got.at(-1).body.text.includes('Revela'), 'integraciones: mensaje de prueba a Slack');
    // A comment by someone else on my presentation.
    const deck = { name: 'Proyecto', slides: [{ id: 's1', blocks: [] }] };
    const { id: doc } = await (await req('POST', '/api/docs', { headers: { Cookie: una }, body: { deck } })).json();
    await req('POST', `/api/docs/${doc}/share`, { headers: { Cookie: una }, body: { link: 'comment' } });
    got.length = 0;
    await req('POST', `/api/docs/${doc}/ops`, { headers: { Cookie: kai }, body: { ops: [{ p: ['slides', 's1', 'comments'], v: [{ id: 'c1', text: 'Cambia el título', author: 'Kai', time: 1, replies: [] }] }] } });
    const toSlack = got.find(x => x.u.includes('slack')), toGen = got.find(x => x.u.includes('example.org'));
    ok(toSlack && /Cambia el título/.test(toSlack.body.text) && /Proyecto/.test(toSlack.body.text), 'integraciones: un comentario llega a Slack');
    const raw = JSON.stringify(toGen?.body);
    ok(toGen && toGen.body.event === 'comment' && toGen.headers['X-Revela-Signature'] === 'sha256=' + Buffer.from(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(sec), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(raw))).toString('base64url'), 'integraciones: JSON firmado con su secreto');
    got.length = 0;
    await req('POST', `/api/docs/${doc}/ops`, { headers: { Cookie: una }, body: { ops: [{ p: ['slides', 's1', 'comments', 'c2'], v: { id: 'c2', text: 'mío', replies: [] } }] } });
    ok(!got.length, 'integraciones: mis propios comentarios no avisan');
    ok((await H(`/${gen.id}/delete`, {})).status === 200 && (await (await H('')).json()).hooks.length === 1, 'integraciones: quitar una');
  } finally { env.FETCH = realF; }
}

// ---- The team's space: documents shared with the whole team, and its pictures (docs.js, teams.js) ----
{
  const [own, mem, out] = [await login2('tok-lia'), await login2('tok-sto'), await login2('tok-gil')];
  const T = (c, path, body) => req(body === undefined ? 'GET' : 'POST', '/api' + path, { headers: { Cookie: c }, body });
  const { id: team } = await (await T(own, '/team', { name: 'Equipo común' })).json();
  const TS = env.TEAMS.inst.get('team:' + team).ctx.storage.m, tt = TS.get('team'); tt.seats = 5; tt.until = Date.now() + 30 * 864e5; TS.set('team', tt);
  await T(own, '/team/invite', { email: 'sto@example.com' }); ok((await T(mem, '/team/accept', { id: team })).status === 200, 'espacio: entra en el equipo');
  await setPlan('2323', Date.now() + 30 * 864e5);
  const { id: doc } = await (await T(own, '/docs', { deck: { name: 'Programación anual', slides: [{ id: 's1', blocks: [] }] } })).json();
  ok((await T(mem, `/docs/${doc}`)).status === 403, 'espacio: sin compartir, un miembro no la ve');
  ok((await T(mem, `/docs/${doc}/share`, { team: 'edit' })).status === 403, 'espacio: solo su dueña la comparte con el equipo');
  let r = await T(own, `/docs/${doc}/share`, { team: 'comment' }), j = await r.json();
  ok(r.status === 200 && j.sharing.team === 'comment', 'espacio: compartida con el equipo (comentar)');
  j = await (await T(mem, '/team/docs')).json();
  ok(j.docs.length === 1 && j.docs[0].id === doc && j.docs[0].name === 'Programación anual' && j.docs[0].role === 'comment', 'espacio: en la lista del equipo');
  j = await (await T(mem, `/docs/${doc}`)).json();
  ok(j.role === 'comment' && j.deck.slides.length === 1, 'espacio: el miembro la abre con ese permiso');
  ok((await T(mem, `/docs/${doc}/ops`, { ops: [{ p: ['name'], v: 'cambiada' }] })).status === 403, 'espacio: comentar no es editar');
  ok((await T(out, `/docs/${doc}`)).status === 403 && !(await (await T(out, '/team/docs')).json()).docs.length, 'espacio: quien no es del equipo, nada');
  await T(own, `/docs/${doc}/meta`, { name: 'Programación 2026-27' });
  ok((await (await T(mem, '/team/docs')).json()).docs[0].name === 'Programación 2026-27', 'espacio: el nombre nuevo, también en la lista');
  // Out of the team: no more access, at once.
  await T(own, '/team/remove', { email: 'sto@example.com' });
  ok((await T(mem, `/docs/${doc}`)).status === 403, 'espacio: quien sale del equipo deja de verla');
  await T(own, '/team/invite', { email: 'sto@example.com' }); await T(mem, '/team/accept', { id: team });
  await T(own, `/docs/${doc}/trash`, {});
  ok(!(await (await T(mem, '/team/docs')).json()).docs.length, 'espacio: en la papelera, fuera de la lista');
  await T(own, `/docs/${doc}/restore`, {});
  ok((await (await T(mem, '/team/docs')).json()).docs.length === 1, 'espacio: al recuperarla, vuelve');
  await T(own, `/docs/${doc}/share`, { team: 'none' });
  ok(!(await (await T(mem, '/team/docs')).json()).docs.length && (await T(mem, `/docs/${doc}`)).status === 403, 'espacio: dejar de compartirla con el equipo');
  // Pictures.
  const png = 'data:image/png;base64,' + Buffer.from('fake-png-bytes').toString('base64');
  ok((await T(mem, '/team/assets', { name: 'x', data: 'data:text/html;base64,PGI+' })).status === 400, 'imágenes del equipo: solo imágenes');
  j = await (await T(mem, '/team/assets', { name: 'Logo del centro', data: png })).json(); const aid = j.id;
  j = await (await T(own, '/team/assets')).json();
  ok(j.assets.length === 1 && j.assets[0].name === 'Logo del centro' && j.assets[0].by === 'sto@example.com', 'imágenes del equipo: la ven todos');
  ok((await (await T(own, `/team/assets/${aid}`)).json()).data === png, 'imágenes del equipo: se insertan');
  ok((await T(out, '/team/assets')).status === 404, 'imágenes del equipo: quien no es del equipo, no');
  ok((await T(own, `/team/assets/${aid}/delete`, {})).status === 200 && !(await (await T(mem, '/team/assets')).json()).assets.length, 'imágenes del equipo: la administración las quita');
}

console.log(fails ? `API FAIL ${n - fails}/${n}` : `API OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
