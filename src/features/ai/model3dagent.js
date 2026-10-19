// «Crear 3D con IA» in the browser: an agent writes Three.js code for the model, the browser builds and photographs it
// (features/content/model3dweb.js, isolated), the agent sees the photos and corrects itself, round after round — as
// Claude Code does with Blender, and as Revela's Blender server would (server/cloudflare/model3d.js, which needs paid
// containers: off). Here only the AI costs: the person's credits (Revela account) or their own OpenRouter key.
//
// It answers the requests of the dialog (ui/dialogs/model3dai.js) as that server does, so the dialog is the same:
//   '3d' → { ok, estimate, local }        '3d/jobs' { prompt, images, lang } → { id }      '3d/jobs/:id' → its state
//   '3d/jobs/:id/model' → { glb }         '3d/jobs/:id/feedback' { text }                  '3d/jobs/:id/cancel'

import { chat, aiConnected, parseJSON } from './openrouter.js';
import { buildModel, glbURL } from '../content/model3dweb.js';

export const MODEL_3D = 'google/gemini-2.5-flash';       // (one of the account's models; good at code, sees pictures)
const ROUNDS = 4, MAX_ROUNDS = 12;
const LANGS = { es: 'Spanish', en: 'English', ca: 'Catalan', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', gl: 'Galician', nl: 'Dutch', eu: 'Basque', ar: 'Arabic' };

export const SYSTEM_3D_WEB = lang => `You are a 3D artist who builds models by writing JavaScript with Three.js (r170), for a presentation app. Your code runs in the browser, the model is exported as glTF (GLB), and you then see three photos of it (front-left, side, from behind and above, on a grid floor) to check and improve it.

Answer ONLY a JSON object: {"done": false, "note": "…", "code": "…"}
- "code": the complete body of an async function (not a diff) that receives THREE, root (an empty THREE.Group) and h (helpers). Add every part to root. It starts from nothing every time.
- "note": one or two short sentences for the person, in ${LANGS[lang] || 'Spanish'}, saying what you made or changed.
- "done": true only when you have seen the photos of your last code and they already match the request; then "code" may be "".

Rules for the code:
- Units are metres, real-world size (a mug is about 0.09 m tall, a chair 0.9 m, a building tens of metres). Y is UP. The app centres the model and puts it on the floor for you.
- Build with Three.js geometries: BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, CapsuleGeometry, LatheGeometry (profiles of vases, bottles, chess pieces), ExtrudeGeometry with THREE.Shape (logos, flat parts with holes, with bevelEnabled for soft edges), TubeGeometry with a CatmullRomCurve3 (handles, cables, pipes), IcosahedronGeometry/DodecahedronGeometry (rocks).
- Helpers: h.mat(color, {rough, metal, emissive, opacity, doubleSide, flat, name}) → a MeshStandardMaterial; h.mesh(geometry, material, name); h.RoundedBoxGeometry(w, h, d, segments, radius); h.mergeGeometries([...]); h.mergeVertices(geometry).
- Colours as CSS strings ('#2f5fbf'). Give every mesh a material and a clear name ('Body', 'Handle'). Group parts with THREE.Group when it helps.
- Keep the whole model under 150 000 triangles (hard limit 300 000): reasonable segment counts (32–64 around).
- No text or letters unless asked (and then build them from Shapes; there are no fonts). No textures or images, no loaders, no network, no DOM, no document, no window: none of them exist there.
- Nothing animated.

When you see the photos: compare them with the request (and the reference photos, if any): shape, proportions, colours, materials, details, nothing floating, parts joined. If something is wrong, fix it in a new full code. Be honest: say done only when it is good. If the request is not something physical you can model, make the closest reasonable object and say so in the note.`;

// The model's answer → { done, note, code } or null.
export function parseAnswer3d(text) {
  const o = parseJSON(text);
  if (!o || typeof o !== 'object' || (o.code != null && typeof o.code !== 'string')) return null;
  const code = String(o.code || ''); if (code.length > 80_000) return null;
  return { done: o.done === true, note: String(o.note || '').slice(0, 600), code };
}

// The requests of the dialog, answered here. chatFn / build: for the tests.
export function webModelApi({ chatFn = chat, build = buildModel, connected = aiConnected } = {}) {
  const jobs = new Map(); let n = 0;
  const view = j => ({ status: j.status, error: j.error, rounds: j.rounds.map(({ n, note, preview, ok, error }) => ({ n, note, preview, ok, error })),
    left: Math.max(0, j.until - j.rounds.length), total: j.rounds.length, max: MAX_ROUNDS, glb: !!j.glb, charged: j.credits });
  // One request: up to ROUNDS rounds — until the agent says done, or out of rounds.
  async function work(j) {
    j.status = 'running';
    while (j.rounds.length < j.until && !j.cancelled) {
      const last = j.rounds.filter(r => r.code).slice(-2);
      const user = [{ type: 'text', text: `Request: ${j.prompt}` + (j.changes.length ? `\nChanges asked afterwards (most recent last):\n- ${j.changes.join('\n- ')}` : '') + (j.images.length ? '\nReference photos:' : '') }, ...j.images.map(url => ({ type: 'image_url', image_url: { url } }))];
      const messages = [{ role: 'system', content: SYSTEM_3D_WEB(j.lang) }, { role: 'user', content: user }];
      for (const r of last) {
        messages.push({ role: 'assistant', content: JSON.stringify({ done: false, note: r.note, code: r.code }) });
        messages.push({ role: 'user', content: r.ok
          ? [{ type: 'text', text: `Photos of that model (${r.size.map(v => v + ' m').join(' × ')} wide × tall × deep, ${r.tris} triangles):` }, ...r.views.map(url => ({ type: 'image_url', image_url: { url } }))]
          : [{ type: 'text', text: `That code failed: ${r.message}\nFix it.` }] });
      }
      let ans = null;
      try {
        const text = await chatFn(messages, { json: true, maxTokens: 12000, prefer: MODEL_3D, feature: '3d', onUsage: u => { j.credits += +u.credits || 0; } });
        ans = parseAnswer3d(text);
      } catch (e) {
        j.status = 'error'; j.error = e.message === 'NO_CREDIT' || /402/.test(e.message) ? 'no credits' : /PAUSED/.test(e.message) ? 'ai paused' : 'ai failed'; return;
      }
      if (j.cancelled) return;
      const round = { n: j.rounds.length + 1, note: ans?.note || '', ok: false };
      if (!ans) { round.error = 'invalid answer'; j.rounds.push(round); continue; }
      if (ans.done && !ans.code && j.glb) { round.ok = true; round.preview = j.preview; j.rounds.push(round); break; }
      round.code = ans.code;
      try {
        const r = await build(ans.code);
        Object.assign(round, { ok: true, preview: r.views[0], views: r.views, size: r.size, tris: r.tris });
        j.glb = r.glb; j.preview = r.views[0];
      } catch (e) { round.error = 'script failed'; round.message = String(e.message || e).slice(0, 1500); }
      j.rounds.push(round);
      if (ans.done && round.ok) break;
    }
    if (j.cancelled) return;
    j.status = j.glb ? 'done' : 'failed';
  }
  return async (path, body) => {
    if (path === '3d') return { ok: connected(), local: true, estimate: null };
    if (path === '3d/jobs') {
      const id = 'w' + (++n);
      const j = { id, prompt: String(body?.prompt || '').slice(0, 2000), images: (body?.images || []).slice(0, 3), lang: body?.lang || 'es', changes: [], rounds: [], until: ROUNDS, credits: 0, status: 'running' };
      jobs.set(id, j); j.run = work(j); return { id };
    }
    const m = /^3d\/jobs\/([^/]+)(?:\/(model|feedback|cancel))?$/.exec(path), j = m && jobs.get(m[1]);
    if (!j) throw Object.assign(new Error('not found'), { status: 404 });
    if (!m[2]) return view(j);
    if (m[2] === 'model') return { glb: j.glb ? glbURL(j.glb) : null };
    if (m[2] === 'cancel') { j.cancelled = true; jobs.delete(j.id); return { ok: true }; }
    if (m[2] === 'feedback') {
      if (j.status === 'running') throw Object.assign(new Error('busy'), { status: 409, data: { error: 'busy' } });
      if (j.rounds.length >= MAX_ROUNDS) throw Object.assign(new Error('round limit'), { status: 409, data: { error: 'round limit' } });
      j.changes.push(String(body?.text || '').slice(0, 2000)); j.until = Math.min(MAX_ROUNDS, j.rounds.length + ROUNDS); j.run = work(j); return { ok: true };
    }
  };
}
