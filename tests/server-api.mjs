// Tests of the accounts API (server/cloudflare/api.js): sessions, credits, AI,
// payments and the desktop sign-in — above all, that nothing can be skipped
// from outside. In-memory Durable Objects; the AI provider, Google and Stripe
// are simulated. Run by tests/run.sh when Node.js is available.
import worker, { Account, Budget, DesktopLink, ShareBox, Limits, CloudDoc, Team, CallRoom, Schedule, ModelJob } from '../server/cloudflare/worker.js';
import { verifyBody } from '../server/blender/gate.js';
import { verifyStripe, sha256, shortCode } from '../server/cloudflare/api.js';

function fakeStorage() {
  const m = new Map(); let alarm = null;
  return { m, async get(k) { if (Array.isArray(k)) return new Map(k.filter(x => m.has(x)).map(x => [x, structuredClone(m.get(x))])); return structuredClone(m.get(k)); },
    async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k) { for (const x of [].concat(k)) m.delete(x); }, async deleteAll() { m.clear(); }, async setAlarm(t) { alarm = t; }, async deleteAlarm() { alarm = null; } };
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
    const who = { 'tok-ana': { sub: '111', email: 'ana@example.com' }, 'tok-luis': { sub: '222', email: 'luis@example.com' }, 'tok-eva': { sub: '444', email: 'eva@example.com' }, 'tok-rosa': { sub: '555', email: 'rosa@escuela.example' }, 'tok-pepe': { sub: '666', email: 'pepe@escuela.example' }, 'tok-mar': { sub: '777', email: 'mar@example.com' }, 'tok-sol': { sub: '888', email: 'sol@example.com' }, 'tok-teo': { sub: '999', email: 'teo@example.com' }, 'tok-ines': { sub: '1010', email: 'ines@example.com' }, 'tok-gil': { sub: '1212', email: 'gil@example.com' }, 'tok-noa': { sub: '1313', email: 'noa@example.com' } }[t];
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
  if (u.startsWith('https://api.stripe.com/')) { stripeCalls.push({ u, body: String(init.body) }); return Response.json({ url: 'https://checkout.stripe.com/c/pay_x' }); }
  return new Response('?', { status: 404 });
};
env.ACCOUNTS = namespace(Account, env); env.BUDGET = namespace(Budget, env); env.DESKTOP = namespace(DesktopLink, env);
env.SCHEDULE = namespace(Schedule, env);
// Cloudflare Email Service, simulated: what was sent.
let sent = []; env.EMAIL = { send: async m => { sent.push(m); return { messageId: 'm' + sent.length }; } }; env.MAIL_SECRET = 'secreto-de-correo';
const TERMS = '2026-10-01';
env.SHAREBOX = namespace(ShareBox, env); env.DOCS = namespace(CloudDoc, env); env.TEAMS = namespace(Team, env); env.CALLS = namespace(CallRoom, env); env.LIMITS = namespace(Limits, env);

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
ok((await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { messages: 'no' } })).status === 400, 'petición mal formada: 400');
ok((await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { messages: [{ role: 'tool', content: 'x' }] } })).status === 400, 'papeles no permitidos: 400');
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

console.log(fails ? `API FAIL ${n - fails}/${n}` : `API OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
