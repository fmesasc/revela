// Tests of the share server (server/cloudflare/worker.js) with an in-memory R2.
// Run by tests/run.sh when Node.js is available.
import worker from '../server/cloudflare/worker.js';

const bucket = new Map();
const R2 = {
  async put(k, body, o) { bucket.set(k, { body, customMetadata: o.customMetadata || {} }); },
  async get(k) { const v = bucket.get(k); return v && { body: v.body, customMetadata: v.customMetadata }; },
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
console.log(fails ? `SERVIDOR FAIL ${n - fails}/${n}` : `SERVIDOR OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
