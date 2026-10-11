// Tests of the brakes on what runs by itself (server/cloudflare/brakes.js, quota.js): an alarm can't be set sooner than
// its kind's minimum nor to a time that isn't one, an object whose alarm runs too often stops being rescheduled (with an
// incident and one email), the emergency switch puts off what can wait and skips the daily cron, the counters reach
// Budget without a write per run, and the day's use against the free plan's quota sends one email per threshold.
// Includes the case that cost a developer $10,811: an alarm set to «now» from its own alarm, dormant until its data was
// 23 days old. In-memory Durable Objects and a fake clock. Run by tests/run.sh.
import { Budget, ShareBox, CollabRoom, ModelJob, Crawler, Crm, Directory } from '../server/cloudflare/worker.js';
import worker from '../server/cloudflare/worker.js';
import { scheduleAlarm, runAlarm, runCron, brakesState, resetBrakesCache, flushCounts, count, _counters, ALARMS, MIN_ALARM_MS, PAUSE_DEFER_MS } from '../server/cloudflare/brakes.js';
import { quotaUsage, quotaWatch, FREE_DAILY } from '../server/cloudflare/quota.js';
import { storageBackfillDaily } from '../server/cloudflare/storage.js';
import { IDLE_MS } from '../server/cloudflare/crawler.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗ frenos: ' + m); } };

// A fake clock (brakes.js reads Date.now()).
const realNow = Date.now; let clock = Date.UTC(2026, 9, 1, 0, 0, 0); Date.now = () => clock;

function fakeStorage() {
  const m = new Map(); let alarm = null, alarmsSet = 0;
  return { m, get alarmAt() { return alarm; }, get alarmsSet() { return alarmsSet; },
    async get(k) { if (Array.isArray(k)) return new Map(k.filter(x => m.has(x)).map(x => [x, structuredClone(m.get(x))])); return structuredClone(m.get(k)); },
    async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k) { let d = 0; for (const x of [].concat(k)) d += m.delete(x) ? 1 : 0; return d; }, async deleteAll() { m.clear(); },
    // (As Cloudflare: a time that isn't a number is an error.)
    async setAlarm(t) { const v = t instanceof Date ? t.getTime() : t; if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError('invalid alarm time'); alarm = v; alarmsSet++; },
    async getAlarm() { return alarm; }, async deleteAlarm() { alarm = null; },
    async list({ prefix = '', start, end, reverse, limit } = {}) {
      let keys = [...m.keys()].filter(k => k.startsWith(prefix) && (start == null || k >= start) && (end == null || k < end)).sort();
      if (reverse) keys.reverse(); if (limit) keys = keys.slice(0, limit);
      return new Map(keys.map(k => [k, structuredClone(m.get(k))]));
    } };
}
let doRequests = 0;
const namespace = (Cls, env) => { const inst = new Map();
  return { inst, idFromName: n => n, get: id => { if (!inst.has(id)) { const ctx = { storage: fakeStorage(), id: { toString: () => id }, getWebSockets: () => [], waitUntil: () => {} }; inst.set(id, new Cls(ctx, env)); }
    const o = inst.get(id); return { fetch: async (u, init) => { doRequests++; return o.fetch(u instanceof Request ? u : new Request(u, init)); } }; } }; };

const sent = [];
const env = { ADMIN_EMAILS: 'jefe@example.com', EMAIL: { send: async m => { sent.push(m); return {}; } } };
env.BUDGET = namespace(Budget, env);
const B = env.BUDGET.get('global');
const bk = async (op, body = {}) => (await B.fetch('https://do/' + op, { method: 'POST', body: JSON.stringify(body) })).json();
const newCtx = () => ({ storage: fakeStorage(), id: { toString: () => 'obj-' + Math.random().toString(36).slice(2, 8) } });

// ---- The minimum, and times that aren't times ----
{
  const ctx = newCtx();
  let at = await scheduleAlarm(ctx, env, 'share', Date.now());
  ok(at === clock + MIN_ALARM_MS && ctx.storage.alarmAt === at, 'setAlarm(Date.now()) → a minuto vista, no «ahora»');
  at = await scheduleAlarm(ctx, env, 'share', Date.now() - 864e5);
  ok(at === clock + MIN_ALARM_MS, 'una fecha pasada (datos viejos) → también al mínimo');
  at = await scheduleAlarm(ctx, env, 'share', new Date(clock + 3 * 864e5));
  ok(at === clock + 3 * 864e5, 'una fecha futura (Date) se respeta');
  ok((await scheduleAlarm(ctx, env, 'collab', Date.now())) === clock + 5e3, 'coedición: su propio mínimo, 5 s (justificado en ALARMS)');
  ok((await scheduleAlarm(ctx, env, 'model3d', Date.now() + 50)) === clock + 1e3, '3D: de 50 ms a 1 s');
  ok(Object.values(ALARMS).every(k => k.min >= 1e3 && k.perHour > 0 && (k.min >= MIN_ALARM_MS || k.why)), 'cada mínimo por debajo de 60 s lleva su porqué');
  const before = ctx.storage.alarmsSet;
  for (const bad of [NaN, undefined, null, 'mañana', new Date('no es fecha'), Infinity, {}]) ok((await scheduleAlarm(ctx, env, 'share', bad)) === null, 'no es una fecha → no se programa: ' + String(bad));
  ok(ctx.storage.alarmsSet === before, 'ni una alarma con valores malos (setAlarm(NaN) nunca llega a Cloudflare)');
  const r = await bk('brakes-report');
  ok(r.incidents.some(i => i.what === 'invalid' && i.kind === 'share' && i.value === 'NaN'), 'el valor malo queda como incidente');
  let threw = false; try { await scheduleAlarm(ctx, env, 'inventada', Date.now()); } catch { threw = true; }
  ok(threw, 'un tipo de alarma que no está en ALARMS es un error de programación');
}

// ---- The case from the article: an alarm set to «now» from its own alarm, dormant until its data is 23 days old ----
// The same object without brakes would run ~600 times a second; here the simulated Cloudflare runs it whenever it's
// due, for two weeks after the bug wakes up.
{
  sent.length = 0;
  class Cleanup {                                           // (what the developer wrote, with the helper instead of setAlarm)
    constructor(ctx, env) { this.ctx = ctx; this.env = env; }
    alarm() {
      return runAlarm(this.ctx, this.env, 'share', async () => {
        const created = (await this.ctx.storage.get('created')) || 0;
        // The bug: data older than 23 days → «do it again right away», forever.
        if (Date.now() - created > 23 * 864e5) await scheduleAlarm(this.ctx, this.env, 'share', Date.now());
        else await scheduleAlarm(this.ctx, this.env, 'share', Date.now() + 864e5);
      });
    }
  }
  const t0 = clock, ctx = newCtx(); await ctx.storage.put('created', t0);
  const o = new Cleanup(ctx, env); await scheduleAlarm(ctx, env, 'share', t0 + 864e5);
  let runs = 0; const end = t0 + 37 * 864e5;                 // 23 quiet days + two weeks
  while (ctx.storage.alarmAt != null && ctx.storage.alarmAt <= end && runs < 1e6) {
    clock = Math.max(clock, ctx.storage.alarmAt); const due = ctx.storage.alarmAt; await ctx.storage.deleteAlarm(); runs++;
    await o.alarm(); if (ctx.storage.alarmAt === due) break;
  }
  const loop = runs - 23;
  // (Without the helper — the developer's setAlarm(Date.now()) — the same loop never ends: 10,000 runs and the clock
  // hasn't moved.)
  { const raw = newCtx(); let k = 0; await raw.storage.setAlarm(clock);
    while (raw.storage.alarmAt != null && raw.storage.alarmAt <= clock && k < 10000) { await raw.storage.deleteAlarm(); k++; await raw.storage.setAlarm(Date.now()); }
    ok(k === 10000, 'sin el freno, el mismo bucle no para (10 000 ejecuciones en el mismo milisegundo)'); }
  console.log(`  el artículo, con freno: ${runs} ejecuciones en 37 días simulados (23 normales + ${loop} del bucle, parado por el presupuesto de ${ALARMS.share.perHour}/h)`);
  ok(runs >= 23 && loop <= ALARMS.share.perHour, `el artículo: 23 días dormido y luego, en vez de ~600/s durante dos semanas (~7×10⁸), ${loop} ejecuciones en total (presupuesto ${ALARMS.share.perHour}/h)`);
  ok(ctx.storage.alarmAt == null, 'pasado el presupuesto, deja de reprogramarse (no queda ninguna alarma)');
  const r = await bk('brakes-report');
  ok(r.incidents.filter(i => i.what === 'budget' && i.kind === 'share').length === 1, 'un incidente, no uno por ejecución');
  ok(sent.filter(m => /freno de share/.test(m.subject)).length === 1 && sent[0].to === 'jefe@example.com', 'y un correo al administrador: ' + JSON.stringify(sent.map(m => m.subject)));
  // Even if Cloudflare ran it again (a retry), the work isn't done again and no more emails go that day.
  const doneBefore = runs; await o.alarm();
  ok(ctx.storage.alarmAt == null && sent.length === 1, 'otra ejecución suelta tampoco reprograma ni vuelve a escribir');
  ok(doneBefore > 0, 'simulación completa');
}

// ---- The same with an object of the real code: a ShareBox whose dates are gone (end = NaN) ----
{
  const ctx = newCtx(), box = new ShareBox(ctx, env);
  await ctx.storage.put('meta', { token: 'x' });           // (no created, no lastView, no expires)
  let threw = false; try { await box.alarm(); } catch { threw = true; }
  ok(!threw && ctx.storage.alarmAt == null && ctx.storage.m.has('meta'), 'ShareBox sin fechas: ni setAlarm(NaN) (que lanzaría y Cloudflare reintentaría), ni bucle, ni borrado');
  ok((await bk('brakes-report')).incidents.some(i => i.what === 'invalid' && i.kind === 'share' && i.value === 'NaN'), 'ShareBox sin fechas: queda anotado');
}

// ---- Real objects keep working: collaboration saves in seconds; a 3D job's next round a second later ----
{
  const ctx = newCtx(); ctx.getWebSockets = () => [];
  const room = new CollabRoom(ctx, env);
  await room.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ meta: { tokens: {}, owner: 'o' }, deck: { slides: [{ id: 's1' }] } }) }));
  ok(ctx.storage.alarmAt >= clock + 7 * 864e5 - 1, 'coedición: borrar la sala en 7 días si nadie vuelve');
  await ctx.storage.deleteAlarm(); room.changed(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  ok(ctx.storage.alarmAt === clock + 5e3, 'coedición: guardado a los 5 s de un cambio');
  // 720 saves an hour (one every 5 s, the most there can be) never trip its budget.
  const c2 = newCtx(); c2.getWebSockets = () => [{}]; const r2 = new CollabRoom(c2, env);
  let tripped = false; for (let i = 0; i < 720; i++) { await r2.alarm(); if ((await scheduleAlarm(c2, env, 'collab', Date.now() + 5e3)) === null) tripped = true; }
  ok(!tripped, 'coedición: 720 guardados en una hora caben en su presupuesto');
}

// ---- The emergency switch ----
{
  await bk('brakes-set', { paused: true, by: 'jefe@example.com', reason: 'prueba' }); resetBrakesCache();
  ok((await brakesState(env)).paused?.reason === 'prueba', 'interruptor: encendido y leído');
  let ran = 0; const ctx = newCtx();
  await runAlarm(ctx, env, 'crawler', async () => { ran++; });
  ok(!ran && ctx.storage.alarmAt === clock + PAUSE_DEFER_MS, 'interruptor: lo que puede esperar no se ejecuta y se aplaza una hora');
  await runAlarm(newCtx(), env, 'collab', async () => { ran++; });
  ok(ran === 1, 'interruptor: guardar la coedición sí (esencial: la web sigue funcionando)');
  const tasks = []; const r = await runCron(env, 'daily', { a: async () => tasks.push('a') });
  ok(r.skipped && !tasks.length, 'interruptor: el cron diario no se ejecuta');
  // Read once a minute per instance at most: not on every alarm.
  const before = doRequests; for (let i = 0; i < 20; i++) await runAlarm(newCtx(), env, 'lti', async () => {});
  ok(doRequests - before <= 2, 'interruptor: leído con caché, no una petición por alarma (' + (doRequests - before) + ')');
  await bk('brakes-set', { paused: false }); resetBrakesCache();
  const r2 = await runCron(env, 'daily', { a: async () => { tasks.push('a'); return 1; }, b: async () => { throw new Error('falla'); }, c: async () => 3 });
  ok(tasks.length === 1 && r2.a === 1 && r2.c === 3 && r2.b.error === 'falla', 'apagado: el cron corre, y una tarea que falla no para a las demás');
  // Unreadable switch (Budget down): not paused — a brake never stops the service.
  resetBrakesCache(); const e2 = { BUDGET: { get: () => ({ fetch: async () => { throw new Error('quota'); } }), idFromName: x => x } };
  ok(!(await brakesState(e2)).paused, 'si no se puede leer, no se para nada');
}

// ---- Counters: in memory, sent now and then ----
{
  _counters.reset(); const before = doRequests;
  for (let i = 0; i < 300; i++) count('alarm:prueba');
  await flushCounts(env); const after1 = doRequests;
  for (let i = 0; i < 600; i++) { count('alarm:prueba'); await flushCounts(env); }
  ok(after1 - before === 1 && doRequests - after1 === 1, 'contadores: 900 ejecuciones → 2 envíos a Budget (el primero y al llegar a 500), no 900: ' + (doRequests - before));
  await flushCounts(env, { force: true });
  const r = await bk('brakes-report');
  const total = r.hours.reduce((t, h) => t + (h.c['alarm:prueba'] || 0), 0);
  ok(total === 900, 'contadores: en el informe de 24 h por hora: ' + total);
  clock += 50 * 3600e3; count('alarm:prueba'); await flushCounts(env, { force: true });
  const r2 = await bk('brakes-report');
  ok(r2.hours.length === 1 && !(await B.fetch('https://do/brakes-report', { method: 'POST', body: '{}' })).bad, 'contadores: solo las últimas 24 h; lo de hace 48 h se borra');
}

// ---- The crawler: with nothing due it sleeps hours, not minutes (each look reads every contact) ----
{
  env.CRM = namespace(Crm, env); env.CRAWLER = namespace(Crawler, env);
  const C = env.CRAWLER.get('crawler');
  await C.fetch('https://crawler/settings', { method: 'POST', body: JSON.stringify({ settings: { on: true, everyMin: 5 } }) });
  const o = env.CRAWLER.inst.get('crawler');
  ok(o.ctx.storage.alarmAt >= clock + 60e3, 'rastreador: al encenderlo, en un minuto (no en 5 s)');
  await o.alarm();
  ok(o.ctx.storage.alarmAt >= clock + IDLE_MS, 'rastreador: sin nada pendiente, la próxima vez en ' + IDLE_MS / 36e5 + ' h, no en 5 min');
  ok(!o.ctx.storage.m.has('queue'), 'rastreador: sin nada pendiente, nada escrito');
}

// ---- Measuring old documents: the whole pass asks every account, so once it finds nothing, once a month ----
{
  env.DIRECTORY = namespace(Directory, env); env.ACCOUNTS = { idFromName: x => x, get: () => ({ fetch: async () => Response.json({ ids: [] }) }) }; env.DOCS = env.ACCOUNTS;
  const m0 = (await bk('brakes-get')).marks;
  const r1 = await storageBackfillDaily(env, m0, clock);
  const m1 = (await bk('brakes-get')).marks;
  ok(!r1.skipped && m1.backfillDone === clock, 'medir: la primera pasada se hace y, sin nada que medir, se apunta');
  ok((await storageBackfillDaily(env, m1, clock + 864e5)).skipped, 'medir: al día siguiente no se repite');
  ok(!(await storageBackfillDaily(env, m1, clock + 31 * 864e5)).skipped, 'medir: al mes, otra vez');
}

// ---- The day's use against the free plan (Cloudflare's GraphQL API, simulated) ----
{
  ok(!(await quotaUsage(env)).configured, 'cuota: sin CF_ACCOUNT_ID ni CF_ANALYTICS_TOKEN no se pregunta nada');
  const calls = []; let gqlReply = () => ({ data: { viewer: { accounts: [{
    workersInvocationsAdaptive: [{ sum: { requests: 30000 }, dimensions: { scriptName: 'revela-share' } }, { sum: { requests: 2000 }, dimensions: { scriptName: 'revela-blender' } }],
    durableObjectsInvocationsAdaptiveGroups: [{ sum: { requests: 81000 } }],
    durableObjectsPeriodicGroups: [{ sum: { activeTime: 1e9, rowsRead: 100000, rowsWritten: 20000, inboundWebsocketMsgCount: 4000 } }] }] } } });
  const e = { ...env, CF_ACCOUNT_ID: 'a'.repeat(32), CF_ANALYTICS_TOKEN: 'secreto', FETCH: async (u, init) => { calls.push({ u, auth: init.headers.Authorization, body: JSON.parse(init.body) }); return Response.json(gqlReply(JSON.parse(init.body))); } };
  const u = await quotaUsage(e);
  const m = Object.fromEntries(u.metrics.map(x => [x.key, x]));
  ok(calls[0].u === 'https://api.cloudflare.com/client/v4/graphql' && calls[0].auth === 'Bearer secreto' && calls[0].body.variables.acc === 'a'.repeat(32), 'cuota: GraphQL de Cloudflare con el token');
  ok(m.doRequests.used === 81000 && m.doRequests.pct === 81 && m.workerRequests.used === 32000 && m.doRowsWritten.pct === 20 && u.workers[0].name === 'revela-share', 'cuota: cifras y porcentajes: ' + JSON.stringify(u.metrics));
  ok(m.doRequests.limit === FREE_DAILY.doRequests && FREE_DAILY.doRequests === 100000 && FREE_DAILY.doRowsWritten === 100000, 'cuota: límites del plan gratuito');
  sent.length = 0;
  let w = await quotaWatch(e, clock);
  ok(w.sent && w.threshold === 80 && sent.length === 1 && /80 %/.test(sent[0].subject) && /revela-share/.test(sent[0].text), 'cuota: al 81 %, el aviso del 80 %');
  w = await quotaWatch(e, clock + 3600e3);
  ok(!w.sent && sent.length === 1, 'cuota: una vez por umbral y día');
  gqlReply = () => ({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: [], durableObjectsInvocationsAdaptiveGroups: [{ sum: { requests: 96000 } }], durableObjectsPeriodicGroups: [] }] } } });
  w = await quotaWatch(e, clock + 7200e3);
  ok(w.sent && w.threshold === 95 && sent.length === 2, 'cuota: el umbral siguiente sí avisa');
  w = await quotaWatch(e, clock + 864e5);
  ok(w.sent && w.threshold === 95 && sent.length === 3, 'cuota: al día siguiente (UTC) puede volver a avisar');
  // Fields Cloudflare doesn't know: asked again without them, and said.
  gqlReply = b => (/rowsRead/.test(b.query) ? { errors: [{ message: 'unknown field rowsRead' }] } : { data: { viewer: { accounts: [{ workersInvocationsAdaptive: [], durableObjectsInvocationsAdaptiveGroups: [{ sum: { requests: 10 } }] }] } } });
  const p = await quotaUsage(e);
  ok(p.partial && p.metrics.length === 2 && p.metrics.find(x => x.key === 'doRequests').used === 10, 'cuota: si Cloudflare no conoce un campo, pregunta sin él');
  gqlReply = () => ({ errors: [{ message: 'Authentication error' }] });
  ok((await quotaUsage(e)).error === 'Authentication error', 'cuota: un token malo se dice, sin romper la página');
  ok(!JSON.stringify(sent).includes('secreto'), 'cuota: el token no sale en ningún correo');
}

// ---- The crons: the hourly one only looks at the quota (no Durable Object) ----
{
  const before = doRequests, w = [];
  await worker.scheduled({ scheduledTime: clock, cron: '17 * * * *' }, env, { waitUntil: p => w.push(p) }); await Promise.all(w);
  ok(doRequests === before, 'cron horario sin configurar: ni una petición a Durable Objects');
}

Date.now = realNow;
console.log(fails ? `FRENOS FALLAN ${fails}/${n}` : `FRENOS OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
