// Revela as an LTI 1.3 tool (Moodle, Canvas, Blackboard, Brightspace…): a
// teacher adds a Revela presentation as an activity; each student opens it,
// answers its quizzes and activities at their own pace, this server marks the
// answers (the presentation shared by link is read here; the answers never go
// to the student's browser) and sends the mark to the platform's gradebook
// (Assignment and Grade Services).
//
//   GET  /api/lti/jwks            the tool's public key (the platform checks our messages with it)
//   GET  /api/lti/register        LTI Dynamic Registration: a platform admin pastes
//                                 https://revelaslides.com/api/lti/register and it's set up
//   GET|POST /api/lti/login       OIDC login initiation (the platform starts a launch)
//   POST /api/lti/launch          the launch (id_token): a student → the presentation;
//                                 a teacher adding an activity → choosing one (deep linking)
//   GET|POST /api/lti/pick        the teacher pastes the link of a presentation shared by link
//   POST /api/lti/answer          { lti, pollId, answer } → { score, sent }   (from Revela's app)
//
// Secrets: LTI_PRIVATE_JWK (an RSA key as JWK; `node tools/lti-key.mjs` makes one).
// Storage: one Durable Object (LtiStore) per name — the platforms' registry,
// each login's state (10 minutes) and each student's session (a day).

import { gradeAnswer } from '../../src/features/live/grading.js';
import { enc, dec, b64url, fromB64url, random, escHtml as esc } from './util.js';

const LTI = 'https://purl.imsglobal.org/spec/lti/claim/', DL = 'https://purl.imsglobal.org/spec/lti-dl/claim/', AGS = 'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint';
const SCORE_SCOPE = 'https://purl.imsglobal.org/spec/lti-ags/scope/score', LINEITEM_SCOPE = 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem';

// ---- Storage: a small key-value object with expiry ------------------------------------------------
export class LtiStore {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    if (op === 'put') { await st.put('v', { value: a.value, expires: a.ttl ? Date.now() + a.ttl : 0 }); if (a.ttl) await st.setAlarm(Date.now() + a.ttl); return Response.json({ ok: true }); }
    const v = await st.get('v');
    if (!v || (v.expires && v.expires < Date.now())) { if (v) await st.deleteAll(); return Response.json({ value: null }); }
    if (op === 'get') return Response.json({ value: v.value });
    if (op === 'take') { await st.deleteAll(); return Response.json({ value: v.value }); }        // (once: a login state)
    if (op === 'patch') { v.value = { ...v.value, ...a.value }; await st.put('v', v); return Response.json({ value: v.value }); }
    return Response.json({ error: 'unknown' }, { status: 404 });
  }
  async alarm() { const v = await this.ctx.storage.get('v'); if (v?.expires && v.expires <= Date.now()) await this.ctx.storage.deleteAll(); }
}
const kv = (env, name) => env.LTI.get(env.LTI.idFromName(name));
const kvDo = async (env, name, op, body = {}) => (await (await kv(env, name).fetch('https://lti/' + op, { method: 'POST', body: JSON.stringify(body) })).json()).value;

// ---- Keys and JWTs ------------------------------------------------------------------------------------------
const RS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
function toolKey(env) {
  let jwk; try { jwk = JSON.parse(env.LTI_PRIVATE_JWK || ''); } catch { return null; }
  if (!jwk?.d || jwk.kty !== 'RSA') return null;
  const { d, p, q, dp, dq, qi, key_ops, ext, ...pub } = jwk;
  return { private: jwk, public: { ...pub, kid: jwk.kid || 'revela-1', alg: 'RS256', use: 'sig' } };
}
export async function signJwt(payload, env) {
  const k = toolKey(env); if (!k) throw new Error('LTI not configured');
  const head = { alg: 'RS256', typ: 'JWT', kid: k.public.kid };
  const data = `${b64url(enc.encode(JSON.stringify(head)))}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  const { key_ops, ext, ...jwk } = k.private;
  const key = await crypto.subtle.importKey('jwk', { ...jwk, alg: 'RS256' }, RS, false, ['sign']);
  return data + '.' + b64url(await crypto.subtle.sign(RS, key, enc.encode(data)));
}
const jwksCache = new Map();                          // url → { keys, at }
async function platformKey(url, kid, fetchImpl) {
  let c = jwksCache.get(url);
  if (!c || Date.now() - c.at > 3600e3 || !c.keys.some(k => k.kid === kid)) {
    const r = await fetchImpl(url).catch(() => null); if (!r || !r.ok) return null;
    c = { keys: (await r.json()).keys || [], at: Date.now() }; jwksCache.set(url, c);
  }
  return c.keys.find(k => k.kid === kid) || (c.keys.length === 1 ? c.keys[0] : null);
}
// The platform's id_token: signed by it (its JWKS), for us, not expired.
async function verifyPlatformJwt(token, platform, fetchImpl) {
  const [h, p, sig] = String(token || '').split('.'); if (!sig) return null;
  let head, claims; try { head = JSON.parse(dec.decode(fromB64url(h))); claims = JSON.parse(dec.decode(fromB64url(p))); } catch { return null; }
  if (head.alg !== 'RS256') return null;
  const jwk = await platformKey(platform.jwks, head.kid, fetchImpl); if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, RS, false, ['verify']);
  if (!(await crypto.subtle.verify(RS, key, fromB64url(sig), enc.encode(h + '.' + p)))) return null;
  const now = Date.now() / 1000, aud = [].concat(claims.aud);
  if (claims.iss !== platform.issuer || !aud.includes(platform.clientId) || !(claims.exp > now) || (claims.iat && claims.iat > now + 300)) return null;
  if (aud.length > 1 && claims.azp && claims.azp !== platform.clientId) return null;
  return claims;
}

// ---- Platforms --------------------------------------------------------------------------------------------------
const platformName = (issuer, clientId) => `platform:${issuer}|${clientId}`;
async function findPlatform(env, issuer, clientId) {
  if (clientId) return kvDo(env, platformName(issuer, clientId), 'get');
  const ids = (await kvDo(env, 'issuer:' + issuer, 'get')) || []; return ids.length === 1 ? kvDo(env, platformName(issuer, ids[0]), 'get') : null;
}
async function savePlatform(env, pl) {
  await kvDo(env, platformName(pl.issuer, pl.clientId), 'put', { value: pl });
  const ids = (await kvDo(env, 'issuer:' + pl.issuer, 'get')) || [];
  if (!ids.includes(pl.clientId)) await kvDo(env, 'issuer:' + pl.issuer, 'put', { value: [...ids, pl.clientId] });
  // (The list, for the admin: every platform, registered by itself or by hand.)
  const list = ((await kvDo(env, 'platforms', 'get')) || []).filter(x => !(x.issuer === pl.issuer && x.clientId === pl.clientId));
  await kvDo(env, 'platforms', 'put', { value: [...list, { issuer: pl.issuer, clientId: pl.clientId, name: pl.name || '', manual: !!pl.manual, registered: pl.registered || Date.now() }] });
}

// ---- Platforms registered by hand (the admin: Google Classroom, Microsoft Teams, Canvas, Blackboard…) ----------------
// Those that don't do dynamic registration: the admin gives Revela's addresses to the platform and pastes the platform's
// (its issuer, the client id it gave Revela, its login, token and key addresses, and its deployment id if any).
//   GET  /api/admin/lti                       → { ready, tool: { login, launch, jwks, register, domain }, platforms }
//   POST /api/admin/lti/platforms             { name, issuer, clientId, auth, token, jwks, deployment? }
//   POST /api/admin/lti/platforms/delete      { issuer, clientId }
const httpsUrl = v => { try { const u = new URL(String(v || '').trim()); return u.protocol === 'https:' ? u.href.replace(/\/$/, u.pathname === '/' ? '' : '/') : null; } catch { return null; } };
export async function ltiAdmin(env, path, body, { GET, POST, json, audit, site }) {
  const base = site.replace(/\/$/, '') + '/api/lti', sub = path.replace(/^\/lti/, '') || '/';
  if (GET && sub === '/') return json({ ready: !!(env.LTI && toolKey(env)), tool: { login: base + '/login', launch: base + '/launch', jwks: base + '/jwks', register: base + '/register', domain: new URL(site).host },
    platforms: env.LTI ? (await kvDo(env, 'platforms', 'get')) || [] : [] });
  if (!env.LTI) return json({ error: 'lti not configured' }, 503);
  if (POST && sub === '/platforms') {
    const issuer = String(body.issuer || '').trim().replace(/\/$/, ''), clientId = String(body.clientId || '').trim().slice(0, 200);
    const auth = httpsUrl(body.auth), token = httpsUrl(body.token), jwks = httpsUrl(body.jwks);
    if (!/^https:\/\/[^\s]+$/.test(issuer) || !clientId || !auth || !token || !jwks) return json({ error: 'fields' }, 400);
    const pl = { name: String(body.name || '').trim().slice(0, 80), issuer, clientId, auth, token, jwks, deployments: [String(body.deployment || '').trim()].filter(Boolean).slice(0, 1), manual: true, registered: Date.now() };
    await savePlatform(env, pl); await audit({ action: 'lti-platform', target: 'lti:' + issuer, after: { name: pl.name, clientId } });
    return json({ ok: true });
  }
  if (POST && sub === '/platforms/delete') {
    const issuer = String(body.issuer || ''), clientId = String(body.clientId || '');
    await kvDo(env, platformName(issuer, clientId), 'put', { value: null, ttl: 1 });
    await kvDo(env, 'issuer:' + issuer, 'put', { value: ((await kvDo(env, 'issuer:' + issuer, 'get')) || []).filter(x => x !== clientId) });
    await kvDo(env, 'platforms', 'put', { value: ((await kvDo(env, 'platforms', 'get')) || []).filter(x => !(x.issuer === issuer && x.clientId === clientId)) });
    await audit({ action: 'lti-platform-delete', target: 'lti:' + issuer, after: { clientId } });
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

// ---- Requests ------------------------------------------------------------------------------------------------------
async function params(req, url) {
  const q = Object.fromEntries(url.searchParams);
  if (req.method !== 'POST') return q;
  const ct = req.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return { ...q, ...(await req.json().catch(() => ({}))) };
  return { ...q, ...Object.fromEntries(new URLSearchParams(await req.text())) };
}
const page = (title, body, status = 200) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:16px system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 16px;color:#223}h1{font-size:22px;color:#3f6497}input{width:100%;padding:10px;font-size:15px;border:1px solid #ccd;border-radius:8px;box-sizing:border-box;margin:6px 0 12px}
button{background:#3f6497;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer}.err{color:#b3261e}small{color:#667}</style></head><body>${body}</body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const autopost = (action, fields) => page('Revela', `<form id="f" method="post" action="${esc(action)}">${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('')}
  <noscript><button>Continuar</button></noscript></form><script>document.getElementById('f').submit()</script>`);

export async function handleLti(req, env, url, site) {
  const path = url.pathname.replace(/^\/api\/lti/, ''), fetchImpl = env.FETCH || fetch;
  if (!env.LTI || !toolKey(env)) return page('Revela', '<h1>Revela</h1><p>LTI no está configurado en este servidor.</p>', 503);
  const base = site.replace(/\/$/, '') + '/api/lti';

  if (path === '/jwks') return Response.json({ keys: [toolKey(env).public] }, { headers: { 'Cache-Control': 'public, max-age=3600' } });

  // Dynamic registration: the platform gives its configuration and a one-time token.
  if (path === '/register') {
    const p = await params(req, url), cfgUrl = p.openid_configuration;
    if (!/^https:\/\//.test(cfgUrl || '')) return page('Revela', '<h1>Revela</h1><p class="err">Falta la configuración de la plataforma.</p>', 400);
    const cfg = await (await fetchImpl(cfgUrl).catch(() => null))?.json().catch(() => null);
    if (!cfg?.issuer || !cfg.registration_endpoint || !cfg.jwks_uri || !cfg.authorization_endpoint || !cfg.token_endpoint || !new URL(cfgUrl).href.startsWith(cfg.issuer.replace(/\/?$/, '')))
      return page('Revela', '<h1>Revela</h1><p class="err">La configuración de la plataforma no es válida.</p>', 400);
    const reg = { application_type: 'web', response_types: ['id_token'], grant_types: ['implicit', 'client_credentials'],
      initiate_login_uri: base + '/login', redirect_uris: [base + '/launch'], client_name: 'Revela', jwks_uri: base + '/jwks', logo_uri: site + '/app/icons/icon-192.png',
      token_endpoint_auth_method: 'private_key_jwt', scope: `${SCORE_SCOPE} ${LINEITEM_SCOPE}`,
      'https://purl.imsglobal.org/spec/lti-tool-configuration': { domain: new URL(site).host, target_link_uri: base + '/launch', claims: ['iss', 'sub', 'name', 'given_name'],
        description: 'Presentaciones con actividades que se corrigen solas.', messages: [{ type: 'LtiDeepLinkingRequest', target_link_uri: base + '/launch', label: 'Revela' }] } };
    const r = await fetchImpl(cfg.registration_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(p.registration_token && { Authorization: 'Bearer ' + p.registration_token }) }, body: JSON.stringify(reg) }).catch(() => null);
    const got = r && r.ok ? await r.json().catch(() => null) : null;
    if (!got?.client_id) return page('Revela', '<h1>Revela</h1><p class="err">La plataforma no aceptó el registro.</p>', 502);
    await savePlatform(env, { issuer: cfg.issuer, clientId: got.client_id, auth: cfg.authorization_endpoint, token: cfg.token_endpoint, jwks: cfg.jwks_uri,
      deployments: [got['https://purl.imsglobal.org/spec/lti-tool-configuration']?.deployment_id].filter(Boolean), registered: Date.now() });
    return page('Revela', `<h1>Revela está instalado</h1><p>Ya se puede añadir como actividad externa.</p><script>(window.opener||window.parent).postMessage({subject:'org.imsglobal.lti.close'},'*')</script>`);
  }

  // Login initiation → the platform's authorisation, with a state and a nonce we remember.
  if (path === '/login') {
    const p = await params(req, url), pl = await findPlatform(env, p.iss, p.client_id);
    if (!pl) return page('Revela', '<h1>Revela</h1><p class="err">Esta plataforma no está registrada.</p>', 400);
    const state = random(24), nonce = random(24);
    await kvDo(env, 'state:' + state, 'put', { value: { nonce, issuer: pl.issuer, clientId: pl.clientId }, ttl: 10 * 60e3 });
    const q = new URLSearchParams({ scope: 'openid', response_type: 'id_token', response_mode: 'form_post', prompt: 'none', client_id: pl.clientId,
      redirect_uri: base + '/launch', login_hint: p.login_hint || '', state, nonce, ...(p.lti_message_hint && { lti_message_hint: p.lti_message_hint }) });
    return Response.redirect(pl.auth + (pl.auth.includes('?') ? '&' : '?') + q, 302);
  }

  // The launch.
  if (path === '/launch' && req.method === 'POST') {
    const p = await params(req, url);
    const st = await kvDo(env, 'state:' + String(p.state || '').slice(0, 64), 'take');
    if (!st) return page('Revela', '<h1>Revela</h1><p class="err">La sesión caducó. Vuelve a abrir la actividad.</p>', 400);
    const pl = await findPlatform(env, st.issuer, st.clientId), c = pl && await verifyPlatformJwt(p.id_token, pl, fetchImpl);
    if (!c || c.nonce !== st.nonce) return page('Revela', '<h1>Revela</h1><p class="err">No se pudo comprobar la plataforma.</p>', 401);
    const dep = c[LTI + 'deployment_id'];
    if (pl.deployments?.length && !pl.deployments.includes(dep)) return page('Revela', '<h1>Revela</h1><p class="err">Esta instalación no está autorizada.</p>', 403);
    const type = c[LTI + 'message_type'];
    if (type === 'LtiDeepLinkingRequest') {
      const t = random(24), set = c[DL + 'deep_linking_settings'] || {};
      await kvDo(env, 'pick:' + t, 'put', { value: { issuer: pl.issuer, clientId: pl.clientId, dep, returnUrl: set.deep_link_return_url, data: set.data ?? null }, ttl: 60 * 60e3 });
      return Response.redirect(base + '/pick?t=' + t, 302);
    }
    if (type === 'LtiResourceLinkRequest') {
      const doc = c[LTI + 'custom']?.doc;
      if (!/^[\w-]{16,40}$/.test(doc || '')) return page('Revela', '<h1>Revela</h1><p class="err">Esta actividad no tiene presentación.</p>', 400);
      const ags = c[AGS] || {}, t = random(24);
      await kvDo(env, 'session:' + t, 'put', { value: { issuer: pl.issuer, clientId: pl.clientId, sub: c.sub, name: c.name || c.given_name || '', doc,
        lineitem: ags.scope?.includes(SCORE_SCOPE) ? ags.lineitem || null : null, scores: {} }, ttl: 24 * 3600e3 });
      return Response.redirect(`${site.replace(/\/$/, '')}/app/?doc=${encodeURIComponent(doc)}&lti=${t}`, 302);
    }
    return page('Revela', '<h1>Revela</h1><p class="err">Tipo de mensaje no admitido.</p>', 400);
  }

  // Choosing the presentation (the teacher, adding the activity).
  if (path === '/pick') {
    const p = await params(req, url), t = String(p.t || '').slice(0, 64), pick = await kvDo(env, 'pick:' + t, 'get');
    if (!pick) return page('Revela', '<h1>Revela</h1><p class="err">La sesión caducó. Vuelve a añadir la actividad.</p>', 400);
    const form = (err = '') => page('Elegir presentación', `<h1>Añadir una presentación de Revela</h1>
      <p>Pega el enlace de una presentación de tu nube de Revela compartida con <b>«Cualquiera con el enlace puede ver»</b>. Sus cuestionarios y actividades se corregirán solos y la nota llegará aquí.</p>
      ${err ? `<p class="err">${esc(err)}</p>` : ''}<form method="post"><input type="hidden" name="t" value="${esc(t)}">
      <label>Enlace<input name="link" required placeholder="https://revelaslides.com/app/?doc=…" value="${esc(p.link || '')}"></label>
      <label>Título de la actividad<input name="title" placeholder="(el de la presentación)" value="${esc(p.title || '')}"></label><button>Añadir</button></form>
      <p><small>Consejo: en Revela, Archivo ▸ Personas ▸ Enlace.</small></p>`);
    if (req.method !== 'POST') return form();
    const doc = (String(p.link || '').match(/[?&]doc=([\w-]{16,40})/) || String(p.link || '').match(/^([\w-]{16,40})$/) || [])[1];
    if (!doc) return form('Ese enlace no es de una presentación de Revela.');
    const r = await env.DOCS.get(env.DOCS.idFromName('doc:' + doc)).fetch('https://doc/get', { method: 'POST', body: JSON.stringify({ who: null }) });
    if (!r.ok) return form(r.status === 404 ? 'Esa presentación no existe.' : 'Esa presentación no está compartida por enlace. Ábrela en Revela ▸ Personas ▸ Enlace: «Cualquiera con el enlace puede ver».');
    const d = await r.json(), graded = d.deck.slides.flatMap(s => s.blocks).filter(b => b.type === 'poll' && gradeAnswer(b, null) !== null).length;
    const title = String(p.title || '').trim().slice(0, 200) || d.name || 'Revela';
    const jwt = await signJwt({ iss: pick.clientId, aud: pick.issuer, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600, nonce: random(16),
      [LTI + 'message_type']: 'LtiDeepLinkingResponse', [LTI + 'version']: '1.3.0', [LTI + 'deployment_id']: pick.dep, ...(pick.data != null && { [DL + 'data']: pick.data }),
      [DL + 'content_items']: [{ type: 'ltiResourceLink', title, url: base + '/launch', custom: { doc }, ...(graded && { lineItem: { scoreMaximum: 100, label: title } }) }] }, env);
    await kvDo(env, 'pick:' + t, 'take');
    return autopost(pick.returnUrl, { JWT: jwt });
  }

  // An answer from the student's app: marked here, the mark sent to the platform.
  if (path === '/answer' && req.method === 'POST') {
    const p = await params(req, url), t = String(p.lti || '').slice(0, 64), s = await kvDo(env, 'session:' + t, 'get');
    if (!s) return Response.json({ error: 'expired' }, { status: 401 });
    const r = await env.DOCS.get(env.DOCS.idFromName('doc:' + s.doc)).fetch('https://doc/get', { method: 'POST', body: JSON.stringify({ who: null }) });
    if (!r.ok) return Response.json({ error: 'no document' }, { status: 404 });
    const polls = (await r.json()).deck.slides.flatMap(sl => sl.blocks).filter(b => b.type === 'poll' && gradeAnswer(b, null) !== null);
    const poll = polls.find(b => b.pollId === p.pollId); if (!poll) return Response.json({ error: 'bad request' }, { status: 400 });
    if (s.scores[poll.pollId] != null) return Response.json({ score: s.scores[poll.pollId], sent: false, again: true });   // (one try each)
    const answer = typeof p.answer === 'string' ? (() => { try { return JSON.parse(p.answer); } catch { return p.answer; } })() : p.answer;
    const score = gradeAnswer(poll, Array.isArray(answer) ? answer.slice(0, 40).map(x => String(x ?? '').slice(0, 100)) : answer);
    const scores = { ...s.scores, [poll.pollId]: score };
    await kvDo(env, 'session:' + t, 'patch', { value: { scores } });
    let sent = false;
    if (s.lineitem) {
      const total = polls.reduce((sum, b) => sum + (scores[b.pollId] || 0), 0) / polls.length * 100, completed = polls.every(b => scores[b.pollId] != null);
      sent = await sendScore(env, s, { scoreGiven: Math.round(total * 100) / 100, scoreMaximum: 100, activityProgress: completed ? 'Completed' : 'InProgress',
        gradingProgress: completed ? 'FullyGraded' : 'Pending', userId: s.sub, timestamp: new Date().toISOString() }, fetchImpl);
    }
    return Response.json({ score, sent });
  }
  return Response.json({ error: 'not found' }, { status: 404 });
}

// Assignment and Grade Services: a token for our tool (a JWT signed with our key), then the score.
async function sendScore(env, s, score, fetchImpl) {
  const pl = await findPlatform(env, s.issuer, s.clientId); if (!pl) return false;
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({ iss: pl.clientId, sub: pl.clientId, aud: pl.token, iat: now, exp: now + 300, jti: random(16) }, env);
  const tr = await fetchImpl(pl.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: assertion, scope: SCORE_SCOPE }) }).catch(() => null);
  const tok = tr && tr.ok ? (await tr.json().catch(() => ({}))).access_token : null; if (!tok) return false;
  const u = new URL(s.lineitem); u.pathname = u.pathname.replace(/\/?$/, '/scores');
  const r = await fetchImpl(u.href, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/vnd.ims.lis.v1.score+json' }, body: JSON.stringify(score) }).catch(() => null);
  return !!(r && r.ok);
}
