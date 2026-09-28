// Tests of the share server (server/cloudflare/worker.js) with an in-memory R2.
// Run by tests/run.sh when Node.js is available.
import worker, { resetCerts, CollabRoom } from '../server/cloudflare/worker.js';
import { pack, unpacker } from '../src/features/live/collabsync.js';

const bucket = new Map();
const R2 = {
  async put(k, body, o = {}) { bucket.set(k, { body, customMetadata: o.customMetadata || {} }); },
  async get(k) { const v = bucket.get(k); return v && { body: v.body, customMetadata: v.customMetadata, json: async () => JSON.parse(v.body), text: async () => v.body }; },
  async head(k) { const v = bucket.get(k); return v && { customMetadata: v.customMetadata }; },
  async delete(k) { bucket.delete(k); },
};
const env = { SHARES: R2, UPLOAD_KEY: 'k3y' };
const call = (method, path, { body, headers = {} } = {}) => worker.fetch(new Request('https://w.test' + path, { method, body, headers }), env);
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗ servidor: ' + m); } };
const sealed = JSON.stringify({ revelaSealed: 1, mode: 'key', iv: 'x', z: 1, data: 'AAAA' });

ok((await call('POST', '/s', { body: sealed })).status === 403, 'sin clave de subida no se puede subir');
ok((await call('POST', '/s', { body: '{"hola":1}', headers: { 'X-Upload-Key': 'k3y' } })).status === 400, 'solo acepta presentaciones selladas');
const r = await call('POST', '/s', { body: sealed, headers: { 'X-Upload-Key': 'k3y' } });
const { id, token } = await r.json();
ok(r.status === 200 && /^[\w-]{22}$/.test(id) && token.length >= 32, 'sube y devuelve id aleatorio y token');
const g = await call('GET', '/s/' + id);
ok(g.status === 200 && (await g.text()) === sealed, 'devuelve la copia');
ok(/noindex/.test(g.headers.get('X-Robots-Tag')), 'noindex');
ok(g.headers.get('Access-Control-Allow-Origin') === '*', 'CORS para el visor');
ok((await call('GET', '/robots.txt').then(x => x.text())).includes('Disallow: /'), 'robots.txt');
ok((await call('DELETE', '/s/' + id, { headers: { Authorization: 'Bearer malo' } })).status === 403, 'no se borra sin su token');
ok((await call('DELETE', '/s/' + id, { headers: { Authorization: 'Bearer ' + token } })).status === 200, 'se borra con su token');
ok((await call('GET', '/s/' + id)).status === 404, 'ya no se comparte');
const e = await (await call('POST', '/s?days=1', { body: sealed, headers: { 'X-Upload-Key': 'k3y' } })).json();
bucket.get(e.id).customMetadata.expires = String(Date.now() - 1);
ok((await call('GET', '/s/' + e.id)).status === 404 && !bucket.has(e.id), 'caduca y se borra');
ok((await call('POST', '/s', { body: 'x'.repeat(31 * 1024 * 1024), headers: { 'X-Upload-Key': 'k3y' } })).status === 413, 'límite de tamaño');
// Statistics: a counter and a date, only for the owner.
const s1 = await (await call('POST', '/s', { body: sealed, headers: { 'X-Upload-Key': 'k3y' } })).json();
await call('GET', '/s/' + s1.id); await call('GET', '/s/' + s1.id);
const stats = await call('GET', `/s/${s1.id}/stats`, { headers: { Authorization: 'Bearer ' + s1.token } });
const sj = await stats.json();
ok(stats.status === 200 && sj.views === 2 && /^\d{4}-/.test(sj.last), 'cuenta las visitas: ' + JSON.stringify(sj));
ok(Object.keys(sj).sort().join() === 'last,views', 'solo número y fecha: nada de quién');
ok((await call('GET', `/s/${s1.id}/stats`, { headers: { Authorization: 'Bearer otro' } })).status === 403, 'las estadísticas solo con el token');

// Limited to a domain: needs a Google ID token of an account there.
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
env.FETCH = async () => new Response(JSON.stringify({ keys: [jwk] }));
resetCerts();
const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const jwt = async claims => { const h = b64u({ alg: 'RS256', kid: 'k1', typ: 'JWT' }), p = b64u(claims);
  const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url'); return `${h}.${p}.${sig}`; };
const base = { iss: 'https://accounts.google.com', aud: 'cid.apps', exp: Math.floor(Date.now() / 1000) + 600, email_verified: true };
ok((await call('POST', '/s?domain=escuela.example', { body: sealed, headers: { 'X-Upload-Key': 'k3y' } })).status === 400, 'el dominio necesita un client id');
const d1 = await (await call('POST', '/s?domain=escuela.example&clientId=cid.apps', { body: sealed, headers: { 'X-Upload-Key': 'k3y' } })).json();
const no = await call('GET', '/s/' + d1.id);
const nj = await no.json();
ok(no.status === 401 && nj.signIn && nj.domain === 'escuela.example' && nj.clientId === 'cid.apps', 'sin sesión pide iniciarla');
const good = await jwt({ ...base, email: 'ana@escuela.example', hd: 'escuela.example' });
ok((await call('GET', '/s/' + d1.id, { headers: { Authorization: 'Bearer ' + good } })).status === 200, 'con una cuenta del dominio, se entrega');
ok((await call('GET', '/s/' + d1.id, { headers: { Authorization: 'Bearer ' + await jwt({ ...base, email: 'eve@otro.example' }) } })).status === 401, 'otro dominio: no');
ok((await call('GET', '/s/' + d1.id, { headers: { Authorization: 'Bearer ' + await jwt({ ...base, aud: 'otra-app', email: 'ana@escuela.example' }) } })).status === 401, 'token de otra aplicación: no');
ok((await call('GET', '/s/' + d1.id, { headers: { Authorization: 'Bearer ' + await jwt({ ...base, exp: 1, email: 'ana@escuela.example' }) } })).status === 401, 'token caducado: no');
ok((await call('GET', '/s/' + d1.id, { headers: { Authorization: 'Bearer ' + (g => { const i = g.lastIndexOf('.') + 20; return g.slice(0, i) + (g[i] === 'A' ? 'B' : 'A') + g.slice(i + 1); })(good) } })).status === 401, 'firma alterada: no');

// ---- Collaboration rooms (Durable Object) ------------------------------------------
{
  const deck = { name: 'Clase', slides: [{ id: 's1', blocks: [{ id: 'a', x: 1, src: 'data:image/png;base64,' + 'A'.repeat(900 * 1024) }] }] };
  ok((await call('POST', '/c', { body: JSON.stringify({ deck }) })).status === 501, 'sin Durable Objects configurados, lo dice');
  const alarms = []; let alarm = null;
  const sockets = [];
  const ctx = { acceptWebSocket: ws => sockets.push(ws), getWebSockets: () => sockets.filter(s => !s.closed),
    storage: { getAlarm: async () => alarm, setAlarm: async t => { alarm = t; alarms.push(t); } } };
  const envC = { ...env, ROOMS: { idFromName: x => x, get: () => room } };
  const room = new CollabRoom(ctx, envC);
  ok((await worker.fetch(new Request('https://w.test/c', { method: 'POST', body: JSON.stringify({ deck }) }), envC)).status === 403, 'crear sala necesita la clave de subida');
  const cr = await worker.fetch(new Request('https://w.test/c', { method: 'POST', body: JSON.stringify({ deck }), headers: { 'X-Upload-Key': 'k3y' } }), envC);
  const { room: rid, tokens, owner } = await cr.json();
  ok(cr.status === 200 && rid && tokens.view && tokens.comment && tokens.edit && owner, 'crea la sala con un enlace por permiso');
  // Fake WebSockets connected to the room.
  const conn = name => { const up = unpacker(), ws = { got: [], closed: false, att: { room: rid, id: null },
    send(s) { const m = up(s); if (m) this.got.push(m); }, close() { this.closed = true; }, serializeAttachment(a) { this.att = a; }, deserializeAttachment() { return this.att; },
    say: async m => { for (const s of pack(m)) await room.webSocketMessage(ws, s); }, last: t => ws.got.filter(m => m.t === t).at(-1) };
    sockets.push(ws); return ws; };
  const own = conn(), ed = conn(), vi = conn(), bad = conn();
  await bad.say({ t: 'hello', token: 'falso', name: 'X' });
  ok(bad.last('denied') && bad.closed, 'un enlace falso no entra');
  await own.say({ t: 'hello', token: owner, name: 'Ana' });
  const w = own.last('welcome');
  ok(w && w.owner && w.role === 'edit' && w.deck.slides[0].blocks[0].src.length > 900 * 1024, 'la dueña entra y recibe la presentación entera (en trozos de menos de 1 MiB)');
  await ed.say({ t: 'hello', token: tokens.edit, name: 'Luis' }); await vi.say({ t: 'hello', token: tokens.view, name: 'Pau' });
  ok(own.last('peers')?.peers.length === 3, 'los demás ven quién entra');
  await ed.say({ t: 'ops', ops: [{ p: ['slides', 's1', 'blocks', 'a', 'x'], v: 99 }] });
  ok(own.last('ops')?.ops[0].v === 99 && vi.last('ops')?.ops[0].v === 99 && !ed.last('ops'), 'el cambio llega a los demás (no vuelve a quien lo hizo)');
  await vi.say({ t: 'ops', ops: [{ p: ['name'], v: 'Hack' }] });
  ok(own.got.filter(m => m.t === 'ops').length === 1, 'quien solo ve no cambia nada');
  ok(alarms.length === 1, 'guardado programado, no uno por cambio');
  await room.alarm();
  ok(JSON.parse(bucket.get(`rooms/${rid}.json`).body).deck.slides[0].blocks[0].x === 99, 'se guarda en R2');
  await ed.say({ t: 'chat', text: 'Hola' });
  ok(vi.last('chat')?.name === 'Luis' && vi.last('chat')?.text === 'Hola', 'chat');
  await ed.say({ t: 'setRole', id: vi.att.id, role: 'edit' });
  ok(!vi.last('role'), 'solo la dueña cambia permisos');
  await own.say({ t: 'setRole', id: vi.att.id, role: 'comment' });
  ok(vi.last('role')?.role === 'comment' && vi.att.role === 'comment', 'la dueña cambia el permiso de alguien');
  // A new room object (after the Durable Object slept) reads it back from R2.
  const room2 = new CollabRoom(ctx, envC);
  ok((await room2.load(rid)).deck.slides[0].blocks[0].x === 99, 'al despertar, la sala recupera el documento');
  await own.say({ t: 'end' });
  ok(ed.last('end') && ed.closed && !bucket.has(`rooms/${rid}.json`), 'al terminar, todos fuera y se borra');
}

// ---- Who may upload / open rooms: upload key or Google sign-in (+ ALLOWED) ------------
{
  const { authorize } = await import('../server/cloudflare/worker.js');
  const infos = { good: { aud: 'cid', email: 'Ana@Escuela.example', email_verified: 'true', expires_in: '3599' }, other: { aud: 'otra', email: 'x@y.z', email_verified: 'true' }, unverified: { aud: 'cid', email: 'a@b.c', email_verified: 'false' } };
  let calls = 0;
  const gfetch = async url => { calls++; const t = new URL(url).searchParams.get('access_token'); return infos[t] ? new Response(JSON.stringify(infos[t])) : new Response('{"error":"invalid_token"}', { status: 400 }); };
  const req = h => new Request('https://w.test/c', { method: 'POST', headers: h });
  const e1 = { GOOGLE_CLIENT_ID: 'cid', UPLOAD_KEY: 'k3y' };
  ok((await authorize(req({}), e1, gfetch)) === null, 'sin clave ni sesión: no');
  ok((await authorize(req({ 'X-Upload-Key': 'k3y' }), e1, gfetch))?.key, 'con la clave de subida: sí');
  ok((await authorize(req({ Authorization: 'Bearer good' }), e1, gfetch))?.email === 'ana@escuela.example', 'con sesión de Google de Revela: sí');
  const c0 = calls; await authorize(req({ Authorization: 'Bearer good' }), e1, gfetch);
  ok(calls === c0, 'no pregunta a Google cada vez');
  ok((await authorize(req({ Authorization: 'Bearer other' }), e1, gfetch)) === null, 'token de otra app: no');
  ok((await authorize(req({ Authorization: 'Bearer unverified' }), e1, gfetch)) === null, 'correo sin verificar: no');
  ok((await authorize(req({ Authorization: 'Bearer falso' }), e1, gfetch)) === null, 'token falso: no');
  ok((await authorize(req({ Authorization: 'Bearer good' }), { ...e1, ALLOWED: '@escuela.example' }, gfetch)) !== null, 'ALLOWED por dominio');
  ok((await authorize(req({ Authorization: 'Bearer good' }), { ...e1, ALLOWED: 'luis@escuela.example, @otra.org' }, gfetch)) === null, 'ALLOWED: fuera de la lista, no');
  ok((await authorize(req({}), {}, gfetch))?.open, 'sin configurar nada, abierto (para pruebas locales)');
}

console.log(fails ? `SERVIDOR FAIL ${n - fails}/${n}` : `SERVIDOR OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
