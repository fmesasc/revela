// «Realista»: modelos 3D con textura (y, si es un humanoide, con esqueleto y
// animación) por Meshy a través de fal.ai. Es el camino para lo que el bpy
// desde cero no puede —una persona, un objeto realista—: fal devuelve un GLB
// con malla, textura y, con rigging, una animación que el visor de Revela ya
// reproduce.
//
// Va por la QUEUE de fal (no la síncrona): la generación tarda minutos y un
// Worker no puede quedarse esperando. Se envía una vez, se guarda la URL de
// estado, y el DO sondea en cada alarma hasta que está —igual que el bucle del
// bpy, pero sin rondas: una sola generación—.
//
// Se activa SOLO con FAL_KEY puesta (secreto de Cloudflare). Sin ella, el modo
// realista ni se ofrece y todo sigue con el bpy.

const QUEUE = 'https://queue.fal.run/meshy/v7/text-to-3d';

export const configuredMeshy = env => !!env.FAL_KEY;

export function meshySettings(env) {
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
  return {
    // Coste real de fal: full texturizado 1,20 $ (+0,20 rigging, +0,12 animación). Se cobra una vez.
    usd: num(env.MESHY_USD, 1.2), usdAnimated: num(env.MESHY_USD_ANIMATED, 1.52),
    animAction: num(env.MESHY_ANIM_ACTION, 92),   // (0 = Idle; por defecto una animación suave de fal)
    maxWaitSec: num(env.MESHY_MAX_WAIT, 8 * 60),   // (se rinde si fal no termina en este tiempo)
    pollSec: num(env.MESHY_POLL, 20),
  };
}

export const meshyUsd = (env, animate) => (animate ? meshySettings(env).usdAnimated : meshySettings(env).usd);

const auth = env => ({ Authorization: 'Key ' + env.FAL_KEY });
const F = env => env.FETCH || fetch;

// Lanza la generación. `animate` solo para humanoides (rigging es humanoid-only en Meshy).
export async function meshySubmit(env, { prompt, animate = false }) {
  const k = meshySettings(env);
  const input = {
    prompt: String(prompt).slice(0, 600), mode: 'full', enable_pbr: true, should_remesh: true,
    ...(animate && { enable_rigging: true, enable_animation: true, animation_action_id: k.animAction, pose_mode: 'a-pose' }),
  };
  const r = await F(env)(QUEUE, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(env) }, body: JSON.stringify(input) });
  if (!r.ok) return { ok: false, error: 'submit ' + r.status };
  const d = await r.json().catch(() => null);
  if (!d || !d.request_id) return { ok: false, error: 'bad submit' };
  // fal devuelve URLs absolutas de estado/resultado; si no, se componen.
  const base = QUEUE + '/requests/' + d.request_id;
  return { ok: true, requestId: d.request_id, statusUrl: d.status_url || base + '/status', responseUrl: d.response_url || base };
}

// Sondea el estado: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | otro (error).
export async function meshyStatus(env, statusUrl) {
  const r = await F(env)(statusUrl, { headers: auth(env) }).catch(() => null);
  if (!r) return { status: 'ERROR', error: 'network' };
  if (r.status === 404) return { status: 'IN_PROGRESS' };   // (aún encolándose)
  if (!r.ok) return { status: 'ERROR', error: 'status ' + r.status };
  const d = await r.json().catch(() => null);
  return { status: (d && d.status) || 'ERROR', error: d && d.error };
}

// Recoge el resultado y elige el GLB: el animado si hay, luego el riggeado, luego el liso.
export async function meshyResult(env, responseUrl) {
  const r = await F(env)(responseUrl, { headers: auth(env) }).catch(() => null);
  if (!r || !r.ok) return { ok: false, error: 'result ' + (r ? r.status : 'network') };
  const d = await r.json().catch(() => null);
  const glbUrl = d?.animation_glb?.url || d?.rigged_character_glb?.url || d?.model_glb?.url || d?.model_urls?.glb?.url;
  if (!glbUrl) return { ok: false, error: 'no glb' };
  return { ok: true, glbUrl, thumb: d?.thumbnail?.url || null };
}

// Descarga el GLB y lo devuelve en base64, con tope de tamaño (como el del bpy).
export async function fetchGlb(env, glbUrl, maxBytes = 25 * 1024 * 1024) {
  const r = await F(env)(glbUrl).catch(() => null);
  if (!r || !r.ok) return { ok: false, error: 'fetch glb' };
  const buf = await r.arrayBuffer().catch(() => null);
  if (!buf || buf.byteLength > maxBytes) return { ok: false, error: buf ? 'too large' : 'read' };
  let bin = '', bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { ok: true, b64: btoa(bin) };
}

// Heurística: ¿el prompt pide un humano/animal con forma humanoide? (para activar rig+animación por defecto).
const HUMANOID = /\b(persona|gente|humano|humana|hombre|mujer|ni[nñ]o|ni[nñ]a|chico|chica|profesor\w*|alumno\w*|m[eé]dico\w*|enfermer\w*|trabajador\w*|personaje|figura humana|cuerpo humano|human|person|people|man|woman|boy|girl|character|avatar|robot humanoide|humanoid)\b/i;
export const looksHumanoid = prompt => HUMANOID.test(String(prompt || ''));
