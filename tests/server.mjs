// Tests of the share server (server/cloudflare/worker.js) with an in-memory R2.
// Run by tests/run.sh when Node.js is available.
import worker, { resetCerts } from '../server/cloudflare/worker.js';

const bucket = new Map();
const R2 = {
  async put(k, body, o = {}) { bucket.set(k, { body, customMetadata: o.customMetadata || {} }); },
  async get(k) { const v = bucket.get(k); return v && { body: v.body, customMetadata: v.customMetadata, json: async () => JSON.parse(v.body) }; },
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

console.log(fails ? `SERVIDOR FAIL ${n - fails}/${n}` : `SERVIDOR OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
