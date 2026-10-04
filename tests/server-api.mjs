// Tests of the accounts API (server/cloudflare/api.js): sessions, credits, AI,
// payments and the desktop sign-in — above all, that nothing can be skipped
// from outside. In-memory Durable Objects; the AI provider, Google and Stripe
// are simulated. Run by tests/run.sh when Node.js is available.
import worker, { Account, Budget, DesktopLink, ShareBox, Limits, CloudDoc, Team, CallRoom, Schedule, ModelJob, Directory, Tickets, Audit, Finance } from '../server/cloudflare/worker.js';
import { summarize, bump, toCsv, cleanEntry, featureOf } from '../server/cloudflare/finance.js';
import { verifyAccess, resetAccessCerts } from '../server/cloudflare/admin.js';
import { ticketToken } from '../server/cloudflare/mail.js';
import { verifyBody } from '../server/blender/gate.js';
import { verifyStripe, sha256, shortCode, settings, stripeConf, billingMode } from '../server/cloudflare/api.js';

function fakeStorage() {
  const m = new Map(); let alarm = null;
  return { m, async get(k) { if (Array.isArray(k)) return new Map(k.filter(x => m.has(x)).map(x => [x, structuredClone(m.get(x))])); return structuredClone(m.get(k)); },
    async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k) { for (const x of [].concat(k)) m.delete(x); }, async deleteAll() { m.clear(); }, async setAlarm(t) { alarm = t; }, async deleteAlarm() { alarm = null; },
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
env.FETCH = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const t = new URL(u).searchParams.get('access_token');
    const who = { 'tok-ana': { sub: '111', email: 'ana@example.com' }, 'tok-luis': { sub: '222', email: 'luis@example.com' }, 'tok-eva': { sub: '444', email: 'eva@example.com' }, 'tok-rosa': { sub: '555', email: 'rosa@escuela.example' }, 'tok-pepe': { sub: '666', email: 'pepe@escuela.example' }, 'tok-mar': { sub: '777', email: 'mar@example.com' }, 'tok-sol': { sub: '888', email: 'sol@example.com' }, 'tok-teo': { sub: '999', email: 'teo@example.com' }, 'tok-ines': { sub: '1010', email: 'ines@example.com' }, 'tok-gil': { sub: '1212', email: 'gil@example.com' }, 'tok-noa': { sub: '1313', email: 'noa@example.com' }, 'tok-pia': { sub: '1414', email: 'pia@example.com' }, 'tok-tess': { sub: '1515', email: 'tess@example.com' }, 'tok-ivo': { sub: '1616', email: 'ivo@example.com' } }[t];
    if (t === 'tok-otraapp') return Response.json({ aud: 'otra-app', sub: '333', email: 'x@example.com', email_verified: 'true' });
    return who ? Response.json({ aud: CID, ...who, email_verified: 'true', expires_in: 3000 }) : new Response('bad', { status: 400 });
  }
  if (u === 'https://openidconnect.googleapis.com/v1/userinfo') return init.headers.Authorization === 'Bearer tok-sol' ? Response.json({ sub: '888', name: 'Sol <García>' }) : new Response('no', { status: 401 });
  if (u === 'https://api.resend.com/emails') { resendCalls.push({ auth: init.headers.Authorization, body: JSON.parse(init.body) }); return Response.json({ id: 're_1' }); }
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
  // Statistics (the owner, Pro)
  const view = (slide, ms, enter) => req('POST', `/api/docs/${id}/view`, { body: { visitor: 'visitante-123', slide, ms, enter } });
  await view('s1', 0, true); await view('s1', 12000); await view('s2', 0, true); await view('s2', 5000);
  j = await (await get(ana, '/stats')).json(); ok(j.visitors === 1 && j.slides[0].views === 1 && j.slides[0].ms === 12000 && j.slides[1].ms === 5000, 'estadísticas: vistas y tiempo por diapositiva');
  ok((await get(eva, '/stats')).status === 402 || (await get(eva, '/stats')).status === 403, 'estadísticas: solo la dueña');
  ok(!JSON.stringify(env.DOCS.inst.get('doc:' + id).ctx.storage.m.get('stats')).includes('@'), 'estadísticas: sin correos ni datos de quien la ve');
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
  const all = (await A('GET', '/users')).j.users;
  ok(all.length >= 5 && all.some(u => u.sub === '888') && !all.some(u => u.sub === '222'), 'directorio: recientes (y sin la cuenta borrada): ' + all.map(u => u.sub));
  { const p1 = (await A('GET', '/users?limit=2')).j, p2 = (await A('GET', '/users?limit=2&cursor=' + encodeURIComponent(p1.cursor))).j;
    ok(p1.users.length === 2 && p1.cursor && p2.users.length === 2 && !p2.users.some(u => p1.users.some(v => v.sub === u.sub)), 'directorio: por páginas'); }
  x = await A('GET', '/users/1414');
  ok(x.status === 200 && x.j.profile.email === 'pia@example.com' && x.j.credits === 50 && x.j.lots.length === 1 && x.j.ledger[0].reason === 'trial' && x.j.sessions.n === 1 && x.j.docs === 0 && x.j.directory.sub === '1414', 'ficha de la cuenta: ' + JSON.stringify(x.j).slice(0, 300));
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
    x = await A('POST', `/tickets/${1001}/suggest`, { body: {} });
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
    env.SUPPORT_AI_AUTO = '1'; ok((await A('GET', '/tickets/' + 1001)).j.autoSuggest === false && (await A('GET', '/tickets/1002')).j.autoSuggest === true, 'IA: SUPPORT_AI_AUTO=1 → la página la pide al abrir un ticket sin sugerencia');
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

console.log(fails ? `API FAIL ${n - fails}/${n}` : `API OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
