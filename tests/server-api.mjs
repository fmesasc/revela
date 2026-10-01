// Tests of the accounts API (server/cloudflare/api.js): sessions, credits, AI,
// payments and the desktop sign-in — above all, that nothing can be skipped
// from outside. In-memory Durable Objects; the AI provider, Google and Stripe
// are simulated. Run by tests/run.sh when Node.js is available.
import worker, { Account, Budget, DesktopLink, ShareBox, Limits, CloudDoc, Team, CallRoom } from '../server/cloudflare/worker.js';
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
let rtCalls = [], stockCalls = [], aiCalls = [], aiReply = () => ({ status: 200, body: { choices: [{ message: { content: 'hola' } }], usage: { cost: 0.01, prompt_tokens: 100, completion_tokens: 50 } } }), stripeCalls = [];
const env = { GOOGLE_CLIENT_ID: CID, OPENROUTER_KEY: 'sk-or-secreta', TRIAL_CREDITS: '50', CREDIT_USD: '0.002', AI_PER_MINUTE: '100', MONTHLY_BUDGET_USD: '50',
  AI_MODELS: 'openai/gpt-4o-mini,google/gemini-2.5-flash', AI_PRICES: '{"openai/gpt-4o-mini":[0.15,0.6]}', STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_x',
  STRIPE_PRICE_PRO_MONTH: 'price_pm', STRIPE_PRICE_CREDITS_500: 'price_c500', STRIPE_PRICE_TEAM_SEAT: 'price_team' };
env.FETCH = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const t = new URL(u).searchParams.get('access_token');
    const who = { 'tok-ana': { sub: '111', email: 'ana@example.com' }, 'tok-luis': { sub: '222', email: 'luis@example.com' }, 'tok-eva': { sub: '444', email: 'eva@example.com' }, 'tok-rosa': { sub: '555', email: 'rosa@escuela.example' }, 'tok-pepe': { sub: '666', email: 'pepe@escuela.example' } }[t];
    if (t === 'tok-otraapp') return Response.json({ aud: 'otra-app', sub: '333', email: 'x@example.com', email_verified: 'true' });
    return who ? Response.json({ aud: CID, ...who, email_verified: 'true', expires_in: 3000 }) : new Response('bad', { status: 400 });
  }
  if (u.startsWith('https://rtc.live.cloudflare.com/v1/apps/')) { rtCalls.push({ u, method: init.method, auth: init.headers.Authorization, body: init.body && JSON.parse(init.body) });
    if (u.endsWith('/sessions/new')) return Response.json({ sessionId: 'sess-' + rtCalls.length });
    return Response.json({ sessionDescription: { type: 'answer', sdp: 'v=0 fake' }, tracks: [], requiresImmediateRenegotiation: false }); }
  if (u.startsWith('https://api.unsplash.com/')) { stockCalls.push({ u, auth: init.headers?.Authorization });
    return Response.json(u.includes('/download') ? {} : { results: [{ id: 'abc123', width: 4000, height: 3000, alt_description: 'Un faro', urls: { small: 'https://images.unsplash.com/s.jpg', regular: 'https://images.unsplash.com/r.jpg' },
      user: { name: 'Ana Foto', links: { html: 'https://unsplash.com/@ana' } } }, { id: 'malo', urls: { small: 'javascript:alert(1)', regular: 'http://x/y.jpg' }, user: {} }] }); }
  if (u.startsWith('https://openrouter.ai/api/v1/audio/speech')) { aiCalls.push({ u, body: JSON.parse(init.body), auth: init.headers.Authorization }); return new Response(new Uint8Array([73, 68, 51, 4, 0]), { headers: { 'Content-Type': 'audio/mpeg' } }); }
  if (u.startsWith('https://openrouter.ai/')) { aiCalls.push({ u, body: JSON.parse(init.body), auth: init.headers.Authorization }); const r = aiReply(u); return Response.json(r.body, { status: r.status }); }
  if (u.startsWith('https://api.stripe.com/')) { stripeCalls.push({ u, body: String(init.body) }); return Response.json({ url: 'https://checkout.stripe.com/c/pay_x' }); }
  return new Response('?', { status: 404 });
};
env.ACCOUNTS = namespace(Account, env); env.BUDGET = namespace(Budget, env); env.DESKTOP = namespace(DesktopLink, env);
env.SHAREBOX = namespace(ShareBox, env); env.DOCS = namespace(CloudDoc, env); env.TEAMS = namespace(Team, env); env.CALLS = namespace(CallRoom, env); env.LIMITS = namespace(Limits, env);

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
ok(me.email === 'ana@example.com' && me.plan === 'free' && me.credits === 50 && me.features.join() === 'ai,cloud-save', 'cuenta nueva: plan gratis y 50 créditos de regalo: ' + JSON.stringify(me));
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

// ---- Voice-over (speech) ----
{
  const ev = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-eva' } }));
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
  const ev = cookieFrom(await req('POST', '/api/login', { body: { accessToken: 'tok-eva' } }));
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
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok } }));
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
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok } }));
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
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok } }));
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
  const login = async tok => cookieFrom(await req('POST', '/api/login', { body: { accessToken: tok } }));
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
}

// ---- Logging out; and the share routes under /api ----
ok((await req('POST', '/api/logout', { headers: { Cookie: ana } })).status === 200, 'cerrar sesión');
ok((await req('GET', '/api/me', { headers: { Cookie: ana } })).status === 401, 'la sesión cerrada ya no vale');
ok((await req('GET', '/api/me', { origin: 'tauri://localhost', headers: { Authorization: 'Bearer ' + desk } })).status === 200, 'la de escritorio sigue (cada sesión por separado)');
ok((await req('GET', '/api/s/' + 'x'.repeat(22))).status === 404, 'compartir también en /api/s');

console.log(fails ? `API FAIL ${n - fails}/${n}` : `API OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
