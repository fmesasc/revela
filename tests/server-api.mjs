// Tests of the accounts API (server/cloudflare/api.js): sessions, credits, AI,
// payments and the desktop sign-in — above all, that nothing can be skipped
// from outside. In-memory Durable Objects; the AI provider, Google and Stripe
// are simulated. Run by tests/run.sh when Node.js is available.
import worker, { Account, Budget, DesktopLink, ShareBox, Limits } from '../server/cloudflare/worker.js';
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
let aiCalls = [], aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'hola' } }], usage: { cost: 0.01, prompt_tokens: 100, completion_tokens: 50 } } }), stripeCalls = [];
const env = { GOOGLE_CLIENT_ID: CID, OPENROUTER_KEY: 'sk-or-secreta', TRIAL_CREDITS: '50', CREDIT_USD: '0.002', AI_PER_MINUTE: '100', MONTHLY_BUDGET_USD: '50',
  AI_MODELS: 'openai/gpt-4o-mini,google/gemini-2.5-flash', AI_PRICES: '{"openai/gpt-4o-mini":[0.15,0.6]}', STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_x',
  STRIPE_PRICE_PRO_MONTH: 'price_pm', STRIPE_PRICE_CREDITS_500: 'price_c500' };
env.FETCH = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const t = new URL(u).searchParams.get('access_token');
    const who = { 'tok-ana': { sub: '111', email: 'ana@example.com' }, 'tok-luis': { sub: '222', email: 'luis@example.com' } }[t];
    if (t === 'tok-otraapp') return Response.json({ aud: 'otra-app', sub: '333', email: 'x@example.com', email_verified: 'true' });
    return who ? Response.json({ aud: CID, ...who, email_verified: 'true', expires_in: 3000 }) : new Response('bad', { status: 400 });
  }
  if (u.startsWith('https://openrouter.ai/')) { aiCalls.push({ u, body: JSON.parse(init.body), auth: init.headers.Authorization }); const r = aiReply(u); return Response.json(r.body, { status: r.status }); }
  if (u.startsWith('https://api.stripe.com/')) { stripeCalls.push({ u, body: String(init.body) }); return Response.json({ url: 'https://checkout.stripe.com/c/pay_x' }); }
  return new Response('?', { status: 404 });
};
env.ACCOUNTS = namespace(Account, env); env.BUDGET = namespace(Budget, env); env.DESKTOP = namespace(DesktopLink, env);
env.SHAREBOX = namespace(ShareBox, env); env.LIMITS = namespace(Limits, env);

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗ api: ' + m); } };
const req = (method, path, { body, headers = {}, origin = SITE } = {}) => worker.fetch(new Request(SITE + path, { method,
  headers: { ...(origin && { Origin: origin }), ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers }, ...(body !== undefined && { body: JSON.stringify(body) }) }), env);
const cookieFrom = r => (r.headers.get('Set-Cookie') || '').split(';')[0];
const acc = sub => env.ACCOUNTS.inst.get('u:' + sub);

// ---- Signing in ----
ok((await req('GET', '/api/me')).status === 401, 'sin sesión: nada');
ok((await req('POST', '/api/login', { body: { accessToken: 'inventado' } })).status === 401, 'un token que Google no reconoce: no');
ok((await req('POST', '/api/login', { body: { accessToken: 'tok-otraapp' } })).status === 401, 'un token de otra aplicación: no');
const lr = await req('POST', '/api/login', { body: { accessToken: 'tok-ana' } }), setc = lr.headers.get('Set-Cookie') || '';
ok(lr.status === 200 && /HttpOnly/.test(setc) && /Secure/.test(setc) && /SameSite=Strict/.test(setc) && /Path=\/api/.test(setc), 'cookie de sesión segura: ' + setc);
const ana = cookieFrom(lr);
ok(!JSON.stringify([...acc('111').ctx.storage.m.get('sessions') ? Object.keys(acc('111').ctx.storage.m.get('sessions')) : []]).includes(ana.split('.')[1]), 'solo se guarda un resumen (hash) de la sesión');
let me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
ok(me.email === 'ana@example.com' && me.plan === 'free' && me.credits === 50 && me.features.join() === 'ai', 'cuenta nueva: plan gratis y 50 créditos de regalo: ' + JSON.stringify(me));
await req('POST', '/api/login', { body: { accessToken: 'tok-ana' } });
me = await (await req('GET', '/api/me', { headers: { Cookie: ana } })).json();
ok(me.credits === 50, 'el regalo es una sola vez (volver a entrar no da más)');

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
let r = await req('POST', '/api/ai/chat', { headers: { Cookie: ana }, body: { model: 'modelo/carisimo', max_tokens: 999999, messages: [{ role: 'user', content: 'Hola' }] } });
let j = await r.json();
ok(r.status === 200 && j.choices[0].message.content === 'hola', 'responde la IA');
ok(aiCalls[0].body.model === 'openai/gpt-4o-mini' && aiCalls[0].body.max_tokens === 4000, 'modelo fuera de la lista → el de por defecto; tokens limitados: ' + JSON.stringify([aiCalls[0].body.model, aiCalls[0].body.max_tokens]));
ok(aiCalls[0].auth === 'Bearer sk-or-secreta' && !JSON.stringify(j).includes('sk-or'), 'la clave de la IA solo la ve el servidor');
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
const holds = acc('111').ctx.storage.m; holds.set('holds', { x: { n: 7, at: Date.now() - 11 * 60e3 } }); holds.set('credits', 3);
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
const bob = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-luis' } }));
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

// ---- Logging out; and the share routes under /api ----
ok((await req('POST', '/api/logout', { headers: { Cookie: ana } })).status === 200, 'cerrar sesión');
ok((await req('GET', '/api/me', { headers: { Cookie: ana } })).status === 401, 'la sesión cerrada ya no vale');
ok((await req('GET', '/api/me', { origin: 'tauri://localhost', headers: { Authorization: 'Bearer ' + desk } })).status === 200, 'la de escritorio sigue (cada sesión por separado)');
ok((await req('GET', '/api/s/' + 'x'.repeat(22))).status === 404, 'compartir también en /api/s');

console.log(fails ? `API FAIL ${n - fails}/${n}` : `API OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
