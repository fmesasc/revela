// «Crear modelo 3D con IA»: an agent that writes a Blender script, runs it, looks at the render
// and corrects itself, round after round, in a Durable Object per job (ModelJob) so it doesn't
// depend on the browser's request staying open.
//
//   GET  /api/3d                     → { ok (configured?), estimate }
//   POST /api/3d/jobs                { prompt, images? (≤ 3 JPEG/PNG data URLs), lang? } → { id, estimate }
//   GET  /api/3d/jobs/:id            → { status, rounds: [{ n, note, preview, ok, error? }], left, total, glb (ready?), charged }
//   GET  /api/3d/jobs/:id/model      → { glb: data URL }
//   POST /api/3d/jobs/:id/feedback   { text } → another request of up to 4 rounds with those changes
//   POST /api/3d/jobs/:id/cancel     (deletes it all)
//
// Each round: the vision model of OpenRouter (AI_3D_MODEL, Revela's key) answers JSON { done, note,
// script }; revela-blender (server/blender, BLENDER_URL, requests signed with BLENDER_SECRET) runs the
// script, exports the GLB and renders a preview; the next round sees the preview (or the error).
// Credits: before each round, the worst case is held (the model's tokens + Blender's longest run);
// afterwards what it really cost is charged — the AI as reported by OpenRouter, Blender by the
// seconds it took (BLENDER_USD_PER_SECOND) only when it worked — and the global monthly budget counts it.
// One running job per account; at most 4 rounds per request and AI_3D_MAX_ROUNDS (12) per job.
// Everything is deleted 24 hours after the job was created.

import { settings, credits, priceOf, acct, call } from './api.js';
import { writeText, readParts } from './store.js';

const DAY = 864e5, enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export function settings3d(env) {
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
  return {
    model: env.AI_3D_MODEL || 'google/gemini-3.8-flash',
    // Containers' standard-3 (2 vCPU, 8 GiB, 16 GB): 2 × 0.000020 + 8 × 0.0000025 + 16 × 0.00000007 ≈ 0.000061 $ per second
    // fully busy; 0.0001 leaves room for starting and for the minute it stays awake afterwards (docs/NUBE.md).
    usdPerSecond: num(env.BLENDER_USD_PER_SECOND, 0.0001),
    timeout: num(env.BLENDER_TIMEOUT, 90), startup: 30,   // (seconds charged at most: the run + a cold start)
    rounds: 4, maxRounds: num(env.AI_3D_MAX_ROUNDS, 12),
    maxTokens: num(env.AI_3D_MAX_TOKENS, 8000), inTokens: 7000,
  };
}
export const configured3d = env => !!(env.BLENDER_URL && env.BLENDER_SECRET);
// The worst case of one round, in dollars, and what to show before starting.
const roundUsd = (s, k) => { const [pin, pout] = priceOf(s, k.model); return (k.inTokens * pin + k.maxTokens * pout) / 1e6 + (k.timeout + k.startup) * k.usdPerSecond; };
export const estimate3d = env => { const s = settings(env), k = settings3d(env), per = credits(roundUsd(s, k), s); return { perRound: per, rounds: k.rounds, max: per * k.rounds }; };

// The request to revela-blender: HMAC-SHA256 of "<t>.<body>" (server/blender/gate.js checks it).
export async function signBody(body, secret, now = Date.now()) {
  const t = Math.floor(now / 1000), key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `t=${t},v1=${hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`)))}`;
}

// ---- Requests ----------------------------------------------------------------------------------------
const jobOf = (env, id) => env.MODELJOBS.get(env.MODELJOBS.idFromName('job:' + id));
const IMG = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;
export async function handle3d(path, req, body, env, me, A, json) {
  const m = path.match(/^\/3d(?:\/jobs(?:\/([\w-]{16,40})(?:\/(model|feedback|cancel))?)?)?$/); if (!m) return json({ error: 'not found' }, 404);
  const [, id, op] = m, k = settings3d(env), s = settings(env);
  if (path === '/3d') return json({ ok: configured3d(env) && !!env.OPENROUTER_KEY && !!env.MODELJOBS, estimate: estimate3d(env) });
  if (!configured3d(env) || !env.MODELJOBS) return json({ error: 'not configured' }, 503);
  if (!env.OPENROUTER_KEY) return json({ error: 'ai not configured' }, 503);
  const pass = async (jid, o, a) => { const r = await jobOf(env, jid).fetch('https://job/' + o, { method: 'POST', body: JSON.stringify({ sub: me.sub, ...a }) }); return json(await r.json(), r.status); };
  // A new request of rounds: the per-minute limit, the global budget, one running job per account, credits for its first round.
  const begin = async jid => {
    if (!(await call(A, 'rate')).ok) return { stop: json({ error: 'too many requests' }, 429) };
    const usd = roundUsd(s, k);
    if (!(await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'check', { usd })).ok) return { stop: json({ error: 'ai paused' }, 503) };
    const slot = await call(A, 'slot', { key: '3d', id: jid, ttl: 30 * 60e3 }); if (!slot.ok) return { stop: json({ error: 'busy', id: slot.id }, 409) };
    const h = await call(A, 'hold', { credits: credits(usd, s) });
    if (!h.ok) { await call(A, 'unslot', { key: '3d', id: jid }); return { stop: json({ error: 'no credits', credits: h.credits }, 402) }; }
    return { hold: h.id };
  };
  if (!id) {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '', images = body.images == null ? [] : body.images;
    if (prompt.length < 3 || prompt.length > 2000) return json({ error: 'bad request' }, 400);
    if (!Array.isArray(images) || images.length > 3 || !images.every(x => typeof x === 'string' && x.length <= 600_000 && IMG.test(x))) return json({ error: 'bad images' }, 400);
    const jid = random(16), b = await begin(jid); if (b.stop) return b.stop;
    await jobOf(env, jid).fetch('https://job/init', { method: 'POST', body: JSON.stringify({ id: jid, sub: me.sub, prompt, images, hold: b.hold, lang: /^[a-z]{2}$/.test(body.lang || '') ? body.lang : 'es' }) });
    return json({ id: jid, estimate: estimate3d(env) });
  }
  if (!op && req.method === 'GET') return pass(id, 'get');
  if (op === 'model' && req.method === 'GET') return pass(id, 'model');
  if (op === 'cancel' && req.method === 'POST') return pass(id, 'cancel');
  if (op === 'feedback' && req.method === 'POST') {
    const text = typeof body.text === 'string' ? body.text.trim() : ''; if (!text || text.length > 2000) return json({ error: 'bad request' }, 400);
    const can = await (await jobOf(env, id).fetch('https://job/can', { method: 'POST', body: JSON.stringify({ sub: me.sub }) })).json();
    if (!can.ok) return json({ error: can.error }, can.error === 'not found' ? 404 : 409);
    const b = await begin(id); if (b.stop) return b.stop;
    return pass(id, 'feedback', { text, hold: b.hold });
  }
  return json({ error: 'not found' }, 404);
}

// ---- What the model is told ------------------------------------------------------------------------
const LANGS = { es: 'Spanish', en: 'English', ca: 'Catalan', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', gl: 'Galician', nl: 'Dutch', eu: 'Basque', ar: 'Arabic' };
export const SYSTEM_3D = lang => `You are a 3D artist who builds models by writing Blender Python scripts (bpy, Blender 4.5 LTS), for a presentation app. Each of your scripts is run in Blender, the model is exported as GLB, and you then see a render of it to check and improve it.

Answer ONLY a JSON object: {"done": false, "note": "…", "script": "…"}
- "script": the complete Python script (not a diff). It starts from an EMPTY scene every time.
- "note": one or two short sentences for the person, in ${LANGS[lang] || 'Spanish'}, saying what you made or changed.
- "done": true only when you have seen the render of your last script and it already matches the request; then "script" may be "".

Rules for the script:
- Units are metres, real-world size (a mug is about 0.09 m tall, a chair 0.9 m, a building tens of metres). Z is up.
- Centre the model on the origin in X and Y and rest it on the ground: its lowest point at Z = 0.
- Only use: bpy, bmesh, mathutils, math, random. Never os, sys, subprocess, socket, urllib, requests, shutil, pathlib, threading, ctypes, importlib, open(), eval(), exec() or __import__; no file paths, no network, no saving or loading files, no add-ons, no images or textures from disk.
- Materials: Principled BSDF with Base Color, Roughness, Metallic (and Transmission or Emission only if needed); colours as linear RGB tuples. Give every object a material. Procedural colour variation is fine if it is done with node colours, but keep it simple: what exports to glTF is the Principled BSDF's direct values.
- Do NOT add cameras, lights or a world/background: Revela adds its own camera, light and floor for the preview.
- Give objects and materials clear names (e.g. "Body", "Handle", "Blue ceramic"). Parent parts to an empty only if it helps; apply nothing by hand.
- Prefer modifiers (Bevel, Subdivision Surface level ≤ 2, Solidify, Mirror, Array, Boolean, Weighted Normal) and smooth shading over huge meshes. Keep the whole model under 150 000 triangles (hard limit 300 000). Use bpy.ops.object.shade_smooth() on curved parts.
- Text (for logos and letters): bpy.ops.object.text_add, set body, extrude and bevel_depth, then align it (it is a FONT object; it is exported as a mesh). Use the default font.
- Prefer bpy.data / bmesh for building meshes; when you use bpy.ops, make sure the object is active and selected and you are in OBJECT mode at the end.
- The script must run without errors in Blender 4.5 in the background (-b). Don't use deprecated 2.7x APIs.
- Nothing animated unless asked.

When you see the render: compare it with the request (and the reference photos, if any): shape, proportions, colours, materials, details, that it stands on the floor and isn't cut or floating. If something is wrong, fix it in a new full script. Be honest: say done only when it is good. If the request is not something physical you can model, make the closest reasonable object and say so in the note.`;

const textOf = c => (typeof c === 'string' ? c : Array.isArray(c) ? c.map(x => x?.text || '').join('') : '');
export function parseAnswer(content) {
  let t = textOf(content).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < a) return null;
  try { const o = JSON.parse(t.slice(a, b + 1));
    if (!o || typeof o !== 'object' || (o.script != null && typeof o.script !== 'string')) return null;
    const script = String(o.script || ''); if (script.length > 60_000) return null;
    return { done: o.done === true, note: String(o.note || '').slice(0, 600), script };
  } catch { return null; }
}
// (Caught before spending a Blender run: the container would refuse them anyway.)
export const forbidden = script => (script.match(/\b(?:import|from)\s+(os|sys|subprocess|socket|ctypes|urllib|http|requests|shutil|pathlib|multiprocessing|threading|asyncio|importlib|builtins)\b|__import__|\bopen\s*\(|\beval\s*\(|\bexec\s*\(/) || [])[0] || null;

// ---- One job ------------------------------------------------------------------------------------------
export class ModelJob {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }); }
  async fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage, k = settings3d(this.env);
    if (op === 'init') {
      for (let i = 0; i < a.images.length; i++) await st.put('img:' + i, a.images[i]);
      await st.put('job', { id: a.id, sub: a.sub, prompt: a.prompt, images: a.images.length, lang: a.lang, status: 'running', rounds: [], left: k.rounds, total: 0,
        hold: a.hold, run: random(6), feedback: [], pending: null, last: null, glb: false, charged: 0, created: Date.now(), expires: Date.now() + DAY });
      await st.setAlarm(Date.now()); return this.json({ ok: true });
    }
    const job = await st.get('job');
    if (!job || job.sub !== a.sub || Date.now() > job.expires) return this.json({ error: 'not found' }, 404);   // (someone else's: as if it didn't exist)
    if (op === 'get') return this.json({ status: job.status, rounds: job.rounds, left: job.left, total: job.total, max: k.maxRounds, glb: job.glb, error: job.error || null, charged: job.charged, expires: job.expires });
    if (op === 'model') { if (!job.glb) return this.json({ error: 'not ready' }, 404); return this.json({ glb: 'data:model/gltf-binary;base64,' + (await readParts(st, 'glb:')).join('') }); }
    if (op === 'can') return this.json(job.status === 'running' ? { ok: false, error: 'running' } : job.total >= k.maxRounds ? { ok: false, error: 'round limit' } : { ok: true });
    if (op === 'feedback') {
      if (job.status === 'running' || job.total >= k.maxRounds) { await this.release(job, a.hold); return this.json({ error: job.status === 'running' ? 'running' : 'round limit' }, 409); }
      Object.assign(job, { status: 'running', error: null, left: Math.min(k.rounds, k.maxRounds - job.total), hold: a.hold, run: random(6), pending: a.text, feedback: [...job.feedback, a.text].slice(-6) });
      await st.put('job', job); await st.setAlarm(Date.now()); return this.json({ ok: true });
    }
    if (op === 'cancel') {
      if (job.status === 'running') await call(acct(this.env, job.sub), 'unslot', { key: '3d', id: job.id });
      if (job.hold) await call(acct(this.env, job.sub), 'settle', { id: job.hold, credits: 0 });
      await st.deleteAll(); await st.deleteAlarm?.(); return this.json({ ok: true });
    }
    return this.json({ error: 'unknown' }, 404);
  }
  async release(job, hold) { const A = acct(this.env, job.sub); if (hold) await call(A, 'settle', { id: hold, credits: 0 }); }

  async alarm() {
    const st = this.ctx.storage, job = await st.get('job'); if (!job) return;
    if (Date.now() >= job.expires) { if (job.status === 'running') await call(acct(this.env, job.sub), 'unslot', { key: '3d', id: job.id }); await st.deleteAll(); return; }
    if (job.status === 'running') {
      try { await this.round(job); }
      catch (e) { const cur = await st.get('job'); if (cur?.run === job.run && cur.status === 'running') await this.finish(cur, 'error', 'internal'); }
    }
    const cur = await st.get('job'); if (cur) await st.setAlarm(cur.status === 'running' ? Date.now() + 50 : cur.expires);
  }
  async finish(job, status, error = null) {
    Object.assign(job, { status, error, hold: null, pending: null }); await this.ctx.storage.put('job', job);
    await call(acct(this.env, job.sub), 'unslot', { key: '3d', id: job.id });
  }
  // What the model sees: the request (and photos), the changes asked since, its last script and how that went.
  async messages(job) {
    const st = this.ctx.storage, k = settings3d(this.env), imgs = [];
    for (let i = 0; i < job.images; i++) imgs.push({ type: 'image_url', image_url: { url: await st.get('img:' + i) } });
    const asked = job.feedback.filter(f => f !== job.pending);
    const first = [{ type: 'text', text: `What to model: ${job.prompt}` + (imgs.length ? `\n(${imgs.length} reference photo${imgs.length > 1 ? 's' : ''} attached.)` : '') + (asked.length ? '\nChanges the person asked for afterwards (already applied before): ' + asked.map((f, i) => `${i + 1}) ${f}`).join(' ') : '') }, ...imgs];
    const msgs = [{ role: 'system', content: SYSTEM_3D(job.lang) }, { role: 'user', content: first }];
    const L = job.last, preview = L?.ok || (job.pending && job.glb) ? await readParts(st, 'prev:') : null, pic = preview ? [{ type: 'image_url', image_url: { url: 'data:image/png;base64,' + preview.join('') } }] : [];
    const tail = `\n(Round ${job.rounds.length + 1}; ${job.left} left for this request${job.left === 1 ? ': this is the last one, so give your best complete script' : ''}.)`;
    if (L) msgs.push({ role: 'assistant', content: JSON.stringify({ done: false, note: L.note, script: L.script }) });
    if (job.pending) msgs.push({ role: 'user', content: [{ type: 'text', text: `The person looked at the result and asks for these changes: «${job.pending}». ${pic.length ? 'This is the render of the current model.' : ''} Write the full new script with the changes (done must be false).` + tail }, ...pic] });
    else if (!L) msgs.push({ role: 'user', content: [{ type: 'text', text: 'Write the script.' + tail }] });
    else if (L.bad) msgs.push({ role: 'user', content: [{ type: 'text', text: 'Your answer was not a valid JSON object with "done", "note" and "script". Answer again, only the JSON.' + tail }] });
    else if (!L.ok) msgs.push({ role: 'user', content: [{ type: 'text', text: `The script failed in Blender:\n${L.error}\nFix it and send the full script.` + tail }] });
    else msgs.push({ role: 'user', content: [{ type: 'text', text: 'This is the render of your script (Revela\'s camera at three quarters from the front right, a light-grey floor at Z = 0). Check it against the request. If it is right, answer done: true. If not, send the improved full script.' + tail }, ...pic] });
    return msgs;
  }
  async blender(script) {
    const env = this.env, k = settings3d(env), body = JSON.stringify({ script, timeoutSec: k.timeout });
    const url = env.BLENDER_URL.replace(/\/+$/, '') + '/run';
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Revela-Signature': await signBody(body, env.BLENDER_SECRET) }, body, signal: AbortSignal.timeout((k.timeout + k.startup + 30) * 1000) };
    try {
      const r = await (env.BLENDER_SVC ? env.BLENDER_SVC.fetch(url, init) : (env.FETCH || fetch)(url, init));
      const d = r.ok ? await r.json().catch(() => null) : null;
      return d && typeof d.ok === 'boolean' ? d : { unavailable: true };
    } catch { return { unavailable: true }; }
  }
  async round(job) {
    const env = this.env, s = settings(env), k = settings3d(env), st = this.ctx.storage, A = acct(env, job.sub), run = job.run;
    const budget = env.BUDGET.get(env.BUDGET.idFromName('global'));
    // Credits: the first round of a request was held by the request; the next ones here.
    let hold = job.hold;
    if (hold) { job.hold = null; await st.put('job', job); }
    else {
      if (!(await call(budget, 'check', { usd: roundUsd(s, k) })).ok) return this.finish(job, 'error', 'ai paused');
      const h = await call(A, 'hold', { credits: credits(roundUsd(s, k), s) }); if (!h.ok) return this.finish(job, 'error', 'no credits');
      hold = h.id;
    }
    const messages = await this.messages(job), [pin, pout] = priceOf(s, k.model);
    const inTok = JSON.stringify(messages).replace(/"url":"data:[^"]*"/g, '').length / 3 + 1600 * messages.flatMap(m => (Array.isArray(m.content) ? m.content : [])).filter(c => c.type === 'image_url').length;
    let r, data;
    try {
      r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
        body: JSON.stringify({ model: k.model, messages, max_tokens: k.maxTokens, usage: { include: true }, provider: { data_collection: 'deny' }, response_format: { type: 'json_object' }, reasoning: { effort: 'low' } }) });
      data = await r.json().catch(() => null);
    } catch { r = null; }
    if (!r || !r.ok || !data?.choices) { await call(A, 'settle', { id: hold, credits: 0 }); return this.finish(job, 'error', 'ai failed'); }   // (the AI failed: nothing charged)
    const u = data.usage || {}, llmUsd = +u.cost > 0 ? +u.cost : ((+u.prompt_tokens || inTok) * pin + (+u.completion_tokens || k.maxTokens) * pout) / 1e6;
    const answer = parseAnswer(data.choices[0]?.message?.content);
    const n = job.rounds.length + 1, cur0 = await st.get('job');
    let outcome, blenderUsd = 0, res = null, secs = 0;
    if (!cur0 || cur0.run !== run || cur0.status !== 'running') outcome = { gone: true };
    else if (!answer) outcome = { round: { n, ok: false, note: '', error: 'invalid answer' }, last: { bad: true, note: '', script: job.last?.script || '' } };
    else if (answer.done && job.glb && !job.pending && job.last?.ok) outcome = { done: true, note: answer.note };
    else if (!answer.script.trim()) outcome = { round: { n, ok: false, note: answer.note, error: 'no script' }, last: { ok: false, note: answer.note, script: '', error: 'You sent no script.' } };
    else if (forbidden(answer.script)) { const f = forbidden(answer.script); outcome = { round: { n, ok: false, note: answer.note, error: 'not allowed: ' + f }, last: { ok: false, note: answer.note, script: answer.script, error: `Not allowed in Revela: ${f}. Use only bpy, bmesh, mathutils, math and random, with no files.` } }; }
    else {
      const t0 = Date.now(); res = await this.blender(answer.script); secs = Math.min(Math.round((Date.now() - t0) / 100) / 10, k.timeout + k.startup);   // (to the tenth of a second)
      if (res.unavailable) outcome = { unavailable: true };
      else if (res.ok && typeof res.glb === 'string' && res.glb.length <= 15 * 1024 * 1024 * 4 / 3 + 4) {
        blenderUsd = secs * k.usdPerSecond;                                          // (only a run that worked is charged)
        outcome = { ok: true, round: { n, ok: true, note: answer.note, preview: typeof res.thumb === 'string' && res.thumb.length < 200_000 ? 'data:image/jpeg;base64,' + res.thumb : null }, last: { ok: true, note: answer.note, script: answer.script } };
      } else {
        const err = (res.ok ? 'The GLB is too large.' : `${res.error || 'error'}: ${res.message || ''}\n${String(res.log || '').slice(-1500)}`).slice(0, 3000);
        outcome = { round: { n, ok: false, note: answer.note, error: String(res.error || 'error').slice(0, 60) }, last: { ok: false, note: answer.note, script: answer.script, error: err } };
      }
    }
    const usd = llmUsd + blenderUsd;
    await call(budget, 'spend', { usd });
    // (For the business's accounts, finance.js: what the round cost Revela — Blender's seconds even when the run failed.)
    const ran = secs > 0 && !outcome.unavailable;
    const st1 = await call(A, 'settle', { id: hold, credits: credits(usd, s), reason: 'model3d', ref: job.id,
      ai: { feature: '3d', model: data.model || k.model, tin: +u.prompt_tokens || 0, tout: +u.completion_tokens || 0, usd: llmUsd, ...(ran && { blenderSecs: secs, blenderUsd: secs * k.usdPerSecond }) } });
    const cur = await st.get('job');
    if (outcome.gone || !cur || cur.run !== run || cur.status !== 'running') return;   // (cancelled meanwhile: what it cost is charged, nothing kept)
    cur.charged += st1.used || 0; cur.pending = null;
    if (outcome.unavailable) { cur.total++; cur.left--; return this.finish(cur, 'error', 'blender unavailable'); }
    if (outcome.done) { if (outcome.note) cur.rounds.at(-1).note = outcome.note; cur.total++; cur.left--; return this.finish(cur, 'done'); }   // (the verdict is a round too: it asked the AI)
    if (outcome.ok) { await writeText(st, 'glb:', res.glb); await writeText(st, 'prev:', res.preview || ''); cur.glb = true; }
    cur.rounds.push(outcome.round); cur.last = outcome.last; cur.total++; cur.left--;
    if (cur.left <= 0 || cur.total >= k.maxRounds) return this.finish(cur, cur.glb ? 'done' : 'failed');
    await st.put('job', cur);
  }
}
