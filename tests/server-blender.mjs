// Tests of revela-blender's door (server/blender/gate.js): only requests signed by Revela's main
// server with BLENDER_SECRET get to a container; the container itself is simulated. Run by tests/run.sh.
import { gate, verifyBody } from '../server/blender/gate.js';
import { signBody } from '../server/cloudflare/model3d.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗ blender: ' + m); } };
const env = { BLENDER_SECRET: 'secreto-blender', MAX_SECONDS: '90' };
let runs = [];
const run = async body => { runs.push(JSON.parse(body)); return Response.json({ ok: true, glb: 'Z2xURg==', seconds: 3 }); };
const send = async (body, { sig, method = 'POST', path = '/run', e = env } = {}) => gate(new Request('https://revela-blender.example.workers.dev' + path, { method,
  ...(method === 'POST' && { body, headers: { 'Content-Type': 'application/json', ...(sig && { 'X-Revela-Signature': sig }) } }) }), e, run);
const body = JSON.stringify({ script: 'import bpy\nbpy.ops.mesh.primitive_cube_add()', timeoutSec: 500 });

let r = await send(body);
ok(r.status === 401 && !runs.length, 'sin firma: rechazada y no se ejecuta nada');
ok((await send(body, { sig: await signBody(body, 'otro-secreto') })).status === 401 && !runs.length, 'firmada con otro secreto: rechazada');
ok((await send(body, { sig: 't=123,v1=abc' })).status === 401, 'una firma inventada: rechazada');
ok((await send(body.replace('cube', 'monkey'), { sig: await signBody(body, env.BLENDER_SECRET) })).status === 401 && !runs.length, 'el cuerpo cambiado después de firmar: rechazado');
ok((await send(body, { sig: await signBody(body, env.BLENDER_SECRET, Date.now() - 10 * 60e3) })).status === 401, 'una firma de hace 10 minutos (reenviada): rechazada');
ok(!(await verifyBody(body, await signBody(body, env.BLENDER_SECRET), '')), 'sin secreto configurado nada vale');
ok((await send(body, { sig: await signBody(body, env.BLENDER_SECRET), e: {} })).status === 503, 'sin BLENDER_SECRET el servicio no funciona (503)');
r = await send(body, { sig: await signBody(body, env.BLENDER_SECRET) });
ok(r.status === 200 && (await r.json()).ok && runs.length === 1, 'firmada por el servidor principal: se ejecuta');
ok(runs[0].timeoutSec === 90 && runs[0].script.includes('primitive_cube_add') && Object.keys(runs[0]).join() === 'script,timeoutSec', 'al contenedor solo llegan el guion y un tiempo dentro del límite (90 s)');
ok((await send('', { method: 'GET' })).status === 404 && (await send(body, { path: '/otra', sig: await signBody(body, env.BLENDER_SECRET) })).status === 404, 'solo existe POST /run');
const big = JSON.stringify({ script: 'x'.repeat(250_000) });
ok((await send(big, { sig: await signBody(big, env.BLENDER_SECRET) })).status === 413, 'guiones enormes: no');
const bad = JSON.stringify({ script: '' });
ok((await send(bad, { sig: await signBody(bad, env.BLENDER_SECRET) })).status === 400, 'sin guion: no');

console.log(fails ? `BLENDER FAIL ${n - fails}/${n}` : `BLENDER OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
