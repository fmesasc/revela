// Tests of Revela as an LTI 1.3 tool (server/cloudflare/lti.js) against a
// simulated learning platform (a Moodle): dynamic registration, login and
// launch with signed tokens, choosing a presentation (deep linking), the
// student's answers marked by the server and the grade sent back — and that
// forged or replayed launches are refused.
import worker, { CloudDoc, LtiStore, Account, Budget, DesktopLink, Team } from '../server/cloudflare/worker.js';

function fakeStorage() {
  const m = new Map();
  return { m, async get(k) { return structuredClone(m.get(k)); }, async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k) { for (const x of [].concat(k)) m.delete(x); }, async deleteAll() { m.clear(); }, async setAlarm() {}, async deleteAlarm() {} };
}
const namespace = (Cls, env) => { const inst = new Map();
  return { inst, idFromName: n => n, get: id => { if (!inst.has(id)) inst.set(id, new Cls({ storage: fakeStorage() }, env)); const o = inst.get(id); return { fetch: (u, init) => o.fetch(u instanceof Request ? u : new Request(u, init)) }; } }; };

const enc = new TextEncoder(), dec = new TextDecoder();
const b64url = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const RS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
const keys = async () => crypto.subtle.generateKey({ ...RS, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['sign', 'verify']);
const sign = async (payload, key, kid = 'm1') => { const d = `${b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })))}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  return d + '.' + b64url(await crypto.subtle.sign(RS, key, enc.encode(d))); };
const verify = async (jwt, jwk) => { const [h, p, s] = jwt.split('.'); const k = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, RS, false, ['verify']);
  return (await crypto.subtle.verify(RS, k, fromB64url(s), enc.encode(h + '.' + p))) ? JSON.parse(dec.decode(fromB64url(p))) : null; };

const SITE = 'https://revelaslides.com', ISS = 'https://moodle.example', CID = 'cid-moodle';
const moodle = await keys(), moodlePub = { ...(await crypto.subtle.exportKey('jwk', moodle.publicKey)), kid: 'm1' };
const tool = await keys(), toolJwk = { ...(await crypto.subtle.exportKey('jwk', tool.privateKey)), kid: 'revela-t' };
const sent = { scores: [], registration: null, tokens: [] };
const env = { LTI_PRIVATE_JWK: JSON.stringify(toolJwk), GOOGLE_CLIENT_ID: 'x', SITE_URL: SITE };
env.FETCH = async (url, init = {}) => {
  const u = String(url);
  if (u === ISS + '/mod/lti/openid-configuration.php') return Response.json({ issuer: ISS, authorization_endpoint: ISS + '/mod/lti/auth.php', token_endpoint: ISS + '/mod/lti/token.php',
    jwks_uri: ISS + '/mod/lti/certs.php', registration_endpoint: ISS + '/mod/lti/openid-registration.php' });
  if (u === ISS + '/mod/lti/openid-registration.php') { sent.registration = { body: JSON.parse(init.body), auth: init.headers.Authorization };
    return Response.json({ client_id: CID, 'https://purl.imsglobal.org/spec/lti-tool-configuration': { deployment_id: '7' } }); }
  if (u === ISS + '/mod/lti/certs.php') return Response.json({ keys: [moodlePub] });
  if (u === ISS + '/mod/lti/token.php') {                  // (checks our signed assertion with our published key)
    const q = new URLSearchParams(init.body), jw = await (await worker.fetch(new Request(SITE + '/api/lti/jwks'), env)).json();
    const c = await verify(q.get('client_assertion'), jw.keys[0]); sent.tokens.push(c);
    return c && c.iss === CID && c.aud === ISS + '/mod/lti/token.php' && q.get('scope').includes('lti-ags/scope/score') ? Response.json({ access_token: 'tok-ags' }) : new Response('no', { status: 401 });
  }
  if (u.startsWith(ISS + '/mod/lti/services.php/') && u.includes('/scores')) { sent.scores.push({ u, auth: init.headers.Authorization, type: init.headers['Content-Type'], body: JSON.parse(init.body) }); return new Response(null, { status: 204 }); }
  return new Response('?', { status: 404 });
};
env.LTI = namespace(LtiStore, env); env.DOCS = namespace(CloudDoc, env); env.ACCOUNTS = namespace(Account, env); env.BUDGET = namespace(Budget, env); env.DESKTOP = namespace(DesktopLink, env); env.TEAMS = namespace(Team, env);

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗ lti: ' + m); } };
const call = (method, path, form, headers = {}) => worker.fetch(new Request(SITE + path, { method, redirect: 'manual', ...(form && { body: new URLSearchParams(form), headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers } }) }), env);
const loc = r => r.headers.get('Location') || '';

// ---- The public key; dynamic registration ----
let r = await call('GET', '/api/lti/jwks'), j = await r.json();
ok(j.keys.length === 1 && j.keys[0].n && !j.keys[0].d && !j.keys[0].p, 'la clave pública, sin la parte privada');
r = await call('GET', '/api/lti/register?' + new URLSearchParams({ openid_configuration: ISS + '/mod/lti/openid-configuration.php', registration_token: 'reg-tok' }));
ok(r.status === 200 && /org\.imsglobal\.lti\.close/.test(await r.text()), 'registro dinámico: Moodle queda configurado');
ok(sent.registration.auth === 'Bearer reg-tok' && sent.registration.body.initiate_login_uri === SITE + '/api/lti/login' && sent.registration.body.jwks_uri === SITE + '/api/lti/jwks'
  && /lti-ags\/scope\/score/.test(sent.registration.body.scope), 'registro: nuestras direcciones, clave y permiso para enviar notas');
ok((await call('GET', '/api/lti/register?openid_configuration=' + encodeURIComponent('https://otro.example/x'))).status >= 400, 'registro: una configuración que no responde, no');

// ---- A document shared by link, with graded activities ----
const deck = { name: 'Estaciones', slides: [{ id: 's1', blocks: [
  { id: 'q', type: 'poll', pollId: 'p-quiz', kind: 'quiz', options: ['Roma', 'París'], correct: [1] },
  { id: 'o', type: 'poll', pollId: 'p-order', kind: 'order', options: ['Primavera', 'Verano', 'Otoño', 'Invierno'] },
  { id: 'w', type: 'poll', pollId: 'p-word', kind: 'word' }] }] };
const docId = 'D'.repeat(20);
await env.DOCS.get('doc:' + docId).fetch('https://doc/init', { method: 'POST', body: JSON.stringify({ owner: 'u1', ownerEmail: 'profe@example.com', deck }) });

// ---- The platform starts a launch; a forged or replayed one is refused ----
const launch = async (claims, { tamper = false, key = moodle.privateKey } = {}) => {
  r = await call('POST', '/api/lti/login', { iss: ISS, login_hint: 'u42', target_link_uri: SITE + '/api/lti/launch', client_id: CID, lti_message_hint: 'h' });
  const to = new URL(loc(r)), state = to.searchParams.get('state'), nonce = to.searchParams.get('nonce');
  const token = await sign({ iss: ISS, aud: CID, sub: 'u42', name: 'Lucía', nonce, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300,
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '7', 'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0', ...claims }, key);
  return { to, state, res: await call('POST', '/api/lti/launch', { id_token: tamper ? token.slice(0, -4) + 'AAAA' : token, state }) };
};
let L = await launch({ 'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingRequest',
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': { deep_link_return_url: ISS + '/mod/lti/contentitem_return.php', data: 'xyz' } });
ok(L.to.origin + L.to.pathname === ISS + '/mod/lti/auth.php' && L.to.searchParams.get('response_mode') === 'form_post' && L.to.searchParams.get('client_id') === CID, 'inicio: a la autorización de Moodle');
ok(L.res.status === 302 && /\/api\/lti\/pick\?t=/.test(loc(L.res)), 'el profesor añade una actividad: a elegir la presentación');
ok((await call('POST', '/api/lti/launch', { id_token: 'x', state: L.state })).status === 400, 'el mismo inicio no se puede repetir');
ok((await launch({ 'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest' }, { tamper: true })).res.status === 401, 'un token manipulado: no');
const impostor = await keys();
ok((await launch({ 'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest' }, { key: impostor.privateKey })).res.status === 401, 'un token firmado por otro: no');
ok((await launch({ 'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest', 'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '99' })).res.status === 403, 'otra instalación no autorizada: no');

// ---- Choosing the presentation ----
const pickUrl = loc(L.res), t = new URL(pickUrl).searchParams.get('t');
ok(/Añadir una presentación/.test(await (await call('GET', pickUrl.replace(SITE, ''))).text()), 'el formulario para pegar el enlace');
ok(/no está compartida por enlace/.test(await (await call('POST', '/api/lti/pick', { t, link: SITE + '/app/?doc=' + docId })).text()), 'una presentación privada no se puede usar');
await env.DOCS.get('doc:' + docId).fetch('https://doc/share', { method: 'POST', body: JSON.stringify({ who: { sub: 'u1' }, link: 'view' }) });
r = await call('POST', '/api/lti/pick', { t, link: SITE + '/app/?doc=' + docId, title: 'Tarea de las estaciones' });
const html = await r.text(), jwt = (html.match(/name="JWT" value="([^"]+)"/) || [])[1];
ok(html.includes('action="' + ISS + '/mod/lti/contentitem_return.php"') && jwt, 'vuelve a Moodle con la actividad firmada');
const dl = await verify(jwt, (await (await call('GET', '/api/lti/jwks')).json()).keys[0]);
const item = dl?.['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']?.[0];
ok(dl && dl.iss === CID && dl.aud === ISS && dl['https://purl.imsglobal.org/spec/lti-dl/claim/data'] === 'xyz' && dl['https://purl.imsglobal.org/spec/lti/claim/message_type'] === 'LtiDeepLinkingResponse', 'respuesta firmada con nuestra clave, para Moodle');
ok(item.custom.doc === docId && item.title === 'Tarea de las estaciones' && item.lineItem.scoreMaximum === 100, 'la actividad lleva la presentación y una columna de notas');

// ---- The student ----
L = await launch({ 'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest', 'https://purl.imsglobal.org/spec/lti/claim/custom': { doc: docId },
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': { scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'], lineitem: ISS + '/mod/lti/services.php/2/lineitems/5/lineitem?type_id=1' } });
const app = new URL(loc(L.res)), lti = app.searchParams.get('lti');
ok(app.origin === SITE && app.pathname === '/app/' && app.searchParams.get('doc') === docId && lti, 'el alumno abre la presentación en Revela');
const answer = (pollId, a, token = lti) => worker.fetch(new Request(SITE + '/api/lti/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lti: token, pollId, answer: a }) }), env);
r = await answer('p-quiz', 1); j = await r.json();
ok(j.score === 1 && j.sent, 'respuesta corregida en el servidor y nota enviada');
ok(sent.scores[0].auth === 'Bearer tok-ags' && sent.scores[0].type === 'application/vnd.ims.lis.v1.score+json' && /\/lineitem\/scores\?type_id=1$/.test(sent.scores[0].u), 'a la columna de notas, con el token de la plataforma');
ok(sent.scores[0].body.userId === 'u42' && sent.scores[0].body.scoreGiven === 50 && sent.scores[0].body.gradingProgress === 'Pending', 'la nota parcial (1 de 2 actividades): 50');
ok(sent.tokens.at(-1).iss === CID && sent.tokens.at(-1).sub === CID, 'el token se pide con una aserción firmada por nosotros');
j = await (await answer('p-quiz', 0)).json(); ok(j.again && j.score === 1, 'cada actividad, un intento');
j = await (await answer('p-order', ['Primavera', 'Verano', 'Invierno', 'Otoño'])).json();
ok(j.score === 0.5 && sent.scores.at(-1).body.scoreGiven === 75 && sent.scores.at(-1).body.gradingProgress === 'FullyGraded' && sent.scores.at(-1).body.activityProgress === 'Completed', 'todo hecho: nota final 75');
ok((await answer('p-word', 'x')).status === 400, 'las votaciones sin nota no cuentan');
ok((await answer('p-quiz', 1, 'inventado')).status === 401, 'sin sesión de la plataforma: no');

console.log(fails ? `LTI FAIL ${n - fails}/${n}` : `LTI OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
