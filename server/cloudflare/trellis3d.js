// «Realista» para objetos (no personas): del texto a un GLB con textura por TRELLIS.2 en Runware (o TRELLIS en fal si
// no hay clave de Runware), unos 0,07 $ en total frente a 1,20 $ de Meshy. Medido en vivo con Runware (2026-10-27):
// 1024/textura 1024 ≈ 0,027 $ y ~26 s; 1024/2048 ≈ 0,017–0,062 $ según el objeto; 512 ≈ 0,011 $. Tres pasos, como el
// «director de arte» de three.ws (Apache-2.0, solo la idea):
//   1. un modelo de texto reescribe el encargo en el brief de UN solo objeto, sus materiales, sobre fondo liso;
//   2. un modelo de imagen dibuja esa referencia (TRELLIS reconstruye el 3D desde una imagen, no desde texto);
//   3. Runware `microsoft:trellis-2@4b` (o fal-ai/trellis) la convierte en un GLB.
// Meshy se queda para lo que TRELLIS no hace: humanoides con esqueleto y animación (meshy3d.js).

const QUEUE = 'https://queue.fal.run/fal-ai/trellis';
const RUNWARE = 'https://api.runware.ai/v1';
export const trellisProvider = env => (env.RUNWARE_KEY ? 'runware' : env.FAL_KEY ? 'fal' : null);
const F = env => env.FETCH || fetch;
const auth = env => ({ Authorization: 'Key ' + env.FAL_KEY });

export function trellisSettings(env) {
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
  return {
    usd: num(env.TRELLIS_USD, 0.12),                 // lo que se cobra (una vez): imagen ~0,04 + TRELLIS ~0,03–0,06 + brief, con margen
    textureSize: [512, 1024, 2048].includes(+env.TRELLIS_TEXTURE) ? +env.TRELLIS_TEXTURE : 1024,
    resolution: [512, 1024, 1536].includes(+env.TRELLIS_RESOLUTION) ? +env.TRELLIS_RESOLUTION : 1024,
    rigUsd: num(env.TRELLIS_RIG_USD, 0.30),          // what is charged on top for a skeleton and its walk (fal's Meshy rigging: 0,20 $)
    rigWaitSec: num(env.TRELLIS_RIG_WAIT, 6 * 60),
    imageUsd: num(env.TRELLIS_IMAGE_USD, 0.045),     // (lo que cuesta de verdad la imagen de referencia, para el gasto global)
    briefModel: env.TRELLIS_BRIEF_MODEL || 'google/gemini-2.5-flash',
    imageModel: env.TRELLIS_IMAGE_MODEL || env.AI_IMAGE_MODEL || 'bytedance-seed/seedream-4.5',
  };
}
// Qué motor hace un trabajo «realista»: Meshy si hay que animar (o si se pide por variable) y hay clave de fal; TRELLIS para el resto.
export const realisticEngine = (env, animate) => (env.MESHY_ENABLED === '1' && env.FAL_KEY && (animate || String(env.REALISTIC_ENGINE || '').toLowerCase() === 'meshy') ? 'meshy' : 'trellis');   // (Meshy needs fal's key; without it, TRELLIS for everything)

const DIRECTOR = `You are a 3D asset art director briefing an image model whose picture will be turned into a 3D model. Rewrite the user's idea (any language) into ONE English prompt of under 70 words: the SINGLE subject, its silhouette and distinct parts, the material of each part, one consistent style (photorealistic unless the user clearly asks for a stylized look). If the subject is a person: EXACTLY ONE person, a single full-body figure from head to feet with BOTH feet and shoes completely visible and clear white space below them (never cropped at the knees or the ankles; no close-up, no second view), standing in a neutral A-pose with the arms slightly away from the body and the legs slightly apart, no loose flowing cloth, nothing in the hands (it will be given a skeleton). If it is an animal, show it whole, never cropped. Always end with: "the whole object fully in frame, centered, three-quarter view, isolated on a pure white seamless background, even soft studio lighting, no floor, no shadow, no text, no second object". Output only the prompt, no quotes.`;

async function or(env, body) {
  const r = await F(env)('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': 'https://revelaslides.com', 'X-Title': 'Revela' }, body: JSON.stringify(body) }).catch(() => null);
  if (!r || !r.ok) return null;
  return r.json().catch(() => null);
}

// Pasos 1 y 2 → { ok, image (data URL), brief } | { ok:false, error }. Si el director falla, se usa el encargo tal cual (con el final fijo).
export async function trellisReference(env, prompt) {
  const k = trellisSettings(env), tail = ', the whole object fully in frame, centered, three-quarter view, isolated on a pure white seamless background, even soft studio lighting, no floor, no shadow, no text';
  const d = await or(env, { model: k.briefModel, max_tokens: 300, messages: [{ role: 'system', content: DIRECTOR }, { role: 'user', content: String(prompt).slice(0, 600) }] });
  const text = d?.choices?.[0]?.message?.content;
  const brief = (typeof text === 'string' && text.trim().length > 20 ? text.trim() : String(prompt).slice(0, 300) + tail).slice(0, 900);
  const im = await or(env, { model: k.imageModel, modalities: ['image'], messages: [{ role: 'user', content: brief }] });
  const image = im?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!/^data:image\//.test(image || '') && !/^https:\/\//.test(image || '')) return { ok: false, error: 'no reference image' };
  return { ok: true, image, brief };
}

// Paso 3: envía la imagen. → { ok, provider, taskId, statusUrl?, responseUrl? } (fal) | { ok, provider, taskId } (Runware).
export async function trellisSubmit(env, image) {
  const k = trellisSettings(env), provider = trellisProvider(env);
  if (provider === 'runware') {
    const taskId = crypto.randomUUID();
    const r = await F(env)(RUNWARE, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.RUNWARE_KEY },
      body: JSON.stringify([{ taskType: '3dInference', taskUUID: taskId, model: 'microsoft:trellis-2@4b', inputs: { image }, deliveryMethod: 'async', includeCost: true,
        settings: { resolution: k.resolution, textureSize: k.textureSize } }]) }).catch(() => null);
    const d = r && await r.json().catch(() => null);
    const code = d?.errors?.[0]?.code;
    if (code === 'concurrentRequestLimitExceeded') return { ok: false, retry: true, error: 'submit ' + code };   // (the balance is held by requests in progress: try again soon)
    if (!r || !r.ok || d?.errors?.length) return { ok: false, error: 'submit ' + (code || (r ? r.status : 'network')) };
    return { ok: true, provider, taskId };
  }
  const r = await F(env)(QUEUE, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(env) }, body: JSON.stringify({ image_url: image, texture_size: k.textureSize }) });
  if (!r.ok) return { ok: false, error: 'submit ' + r.status };
  const d = await r.json().catch(() => null);
  if (!d || !d.request_id) return { ok: false, error: 'bad submit' };
  const base = QUEUE + '/requests/' + d.request_id;
  return { ok: true, provider, taskId: d.request_id, statusUrl: d.status_url || base + '/status', responseUrl: d.response_url || base };
}

// Sondea: → { status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR', glbUrl?, cost?, error? }.
export async function trellisPoll(env, m) {
  if (m.provider === 'runware') {
    const r = await F(env)(RUNWARE, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.RUNWARE_KEY },
      body: JSON.stringify([{ taskType: 'getResponse', taskUUID: m.taskId }]) }).catch(() => null);
    const d = r && await r.json().catch(() => null);
    if (!r || !r.ok) return { status: 'IN_PROGRESS' };   // (a hiccup: try again at the next alarm; the overall timeout still applies)
    if (d?.errors?.length) return { status: 'ERROR', error: d.errors[0].code || 'error' };
    const t = d?.data?.[0];
    if (!t || t.status === 'processing') return { status: 'IN_PROGRESS' };
    const f = t.outputs?.files?.[0], url = f?.url || f?.glbURL;
    return url ? { status: 'COMPLETED', glbUrl: url, cost: +t.cost || 0 } : { status: 'ERROR', error: 'no glb' };
  }
  const sr = await F(env)(m.statusUrl, { headers: auth(env) }).catch(() => null);
  if (!sr) return { status: 'IN_PROGRESS' };
  if (sr.status === 404) return { status: 'IN_PROGRESS' };
  if (!sr.ok) return { status: 'ERROR', error: 'status ' + sr.status };
  const sd = await sr.json().catch(() => null);
  if (sd?.status === 'IN_QUEUE' || sd?.status === 'IN_PROGRESS') return { status: 'IN_PROGRESS' };
  if (sd?.status !== 'COMPLETED') return { status: 'ERROR', error: sd?.error || sd?.status || 'error' };
  const r = await F(env)(m.responseUrl, { headers: auth(env) }).catch(() => null);
  if (!r || !r.ok) return { status: 'ERROR', error: 'result ' + (r ? r.status : 'network') };
  const d = await r.json().catch(() => null);
  return d?.model_mesh?.url ? { status: 'COMPLETED', glbUrl: d.model_mesh.url } : { status: 'ERROR', error: 'no glb' };
}

// ---- A skeleton and a walk for a person (fal's Meshy rigging: from a GLB URL; humanoid; ~0,20 $) ----------------------
const RIG = 'https://queue.fal.run/fal-ai/meshy/rigging';
// (Off unless TRELLIS_RIG=1: Revela gives a person a skeleton in the browser (features/content/autorig.js), at no cost; this is the paid one.)
export const rigAvailable = env => !!env.FAL_KEY && env.TRELLIS_RIG === '1';
export async function rigSubmit(env, glbUrl) {
  const r = await F(env)(RIG, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(env) }, body: JSON.stringify({ model_url: glbUrl, height_meters: 1.7, enable_animation: false }) }).catch(() => null);
  if (!r || !r.ok) return { ok: false, error: 'rig submit ' + (r ? r.status : 'network') };
  const d = await r.json().catch(() => null);
  if (!d || !d.request_id) return { ok: false, error: 'rig bad submit' };
  const base = RIG + '/requests/' + d.request_id;
  return { ok: true, statusUrl: d.status_url || base + '/status', responseUrl: d.response_url || base };
}
// → { status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR', glbUrl?, error? }: the walking GLB (the character with its walk), else the rigged one.
export async function rigPoll(env, m) {
  const sr = await F(env)(m.statusUrl, { headers: auth(env) }).catch(() => null);
  if (!sr || sr.status === 404) return { status: 'IN_PROGRESS' };
  if (!sr.ok) return { status: 'ERROR', error: 'rig status ' + sr.status };
  const sd = await sr.json().catch(() => null);
  if (sd?.status === 'IN_QUEUE' || sd?.status === 'IN_PROGRESS') return { status: 'IN_PROGRESS' };
  if (sd?.status !== 'COMPLETED') return { status: 'ERROR', error: 'rig ' + (sd?.error || sd?.status || 'error') };
  const r = await F(env)(m.responseUrl, { headers: auth(env) }).catch(() => null);
  if (!r || !r.ok) return { status: 'ERROR', error: 'rig result ' + (r ? r.status : 'network') };
  const d = await r.json().catch(() => null), url = d?.basic_animations?.walking_glb?.url || d?.rigged_character_glb?.url;
  return url ? { status: 'COMPLETED', glbUrl: url, walks: !!d?.basic_animations?.walking_glb?.url } : { status: 'ERROR', error: 'rig no glb' };
}
