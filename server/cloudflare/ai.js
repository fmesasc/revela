// The AI in Revela's cloud (api.js routes /api/ai/…): chat, images and speech through OpenRouter and the image and
// voice providers, paid with credits; the global monthly budget (Budget) is checked first.

import { featureOf } from './finance.js';
import { call } from './api.js';

// ---- AI --------------------------------------------------------------------------------------------
export const credits = (usd, s) => Math.max(1, Math.ceil((usd * s.markup) / s.creditUsd));
export const priceOf = (s, model) => s.prices[model] || [1, 4];                  // (unknown: a cautious guess per million tokens)
export async function guard(env, s, A, holdCredits, estimateUsd, json) {
  if (!env.OPENROUTER_KEY) return { stop: json({ error: 'ai not configured' }, 503) };
  if (!(await call(A, 'rate')).ok) return { stop: json({ error: 'too many requests' }, 429) };
  const budget = env.BUDGET.get(env.BUDGET.idFromName('global'));
  if (!(await call(budget, 'check', { usd: estimateUsd })).ok) return { stop: json({ error: 'ai paused' }, 503) };
  const h = await call(A, 'hold', { credits: holdCredits });
  if (!h.ok) return { stop: json({ error: 'no credits', credits: h.credits }, 402) };
  return { hold: h.id, budget };
}
// Why the AI provider said no (its status and message: no key, prompt or answer), in the
// Worker's logs and for the app to show — so a failure can be told apart (no credit, no model…).
export function aiFailure(what, r, data) {
  const status = r?.status || 0, detail = String(data?.error?.message || data?.error || '').slice(0, 300);
  console.log(JSON.stringify({ ai: what, status, detail }));
  return { error: 'ai failed', status, ...(detail && { detail }) };
}
// Pictures a chat request may carry: data: URLs only (no addresses for the provider to fetch), JPEG, PNG
// or WebP, each up to ~300 KB, at most 8 and ~2 MB per request. Counted as a fixed number of tokens
// each for the estimate (not by their base64 length, which would inflate the hold).
export const IMAGE_LIMITS = { each: 300 * 1024, total: 2 * 1024 * 1024, count: 8, tokens: 1100 };
export const IMAGE_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
// The messages' content: → { text (characters besides the pictures), images }, or null when a part isn't allowed.
export function contentOf(messages) {
  let text = 0, images = 0, bytes = 0;
  for (const m of messages) {
    if (!m || !['system', 'user', 'assistant'].includes(m.role)) return null;
    if (typeof m.content === 'string') { text += m.content.length; continue; }
    if (!Array.isArray(m.content) || !m.content.length || m.content.length > 40) return null;
    for (const p of m.content) {
      if (p?.type === 'text' && typeof p.text === 'string') { text += p.text.length; continue; }
      const url = p?.type === 'image_url' && typeof p.image_url?.url === 'string' ? p.image_url.url : null;
      if (!url || m.role !== 'user' || !IMAGE_URL.test(url)) return null;
      const size = Math.floor((url.length - url.indexOf(',') - 1) * 3 / 4);
      if (size > IMAGE_LIMITS.each || ++images > IMAGE_LIMITS.count || (bytes += size) > IMAGE_LIMITS.total) return null;
    }
  }
  return { text, images };
}
export async function aiChat(env, s, A, body, json) {
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || !messages.length || messages.length > 60) return json({ error: 'bad request' }, 400);
  const c = contentOf(messages);
  if (!c || c.text > 1.5e6) return json({ error: 'bad request' }, 400);
  const model = s.models.includes(body.model) ? body.model : s.models[0];
  const maxTokens = Math.min(s.maxTokens, Math.max(16, Math.round(+body.max_tokens || 1000)));
  const [pin, pout] = priceOf(s, model), inTok = c.text / 3 + c.images * IMAGE_LIMITS.tokens;
  const estimate = (inTok * pin + maxTokens * pout) / 1e6;
  const g = await guard(env, s, A, credits(estimate, s), estimate, json); if (g.stop) return g.stop;
  let r, data;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
      // (provider.data_collection 'deny': only providers that neither store nor train on the request.)
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, usage: { include: true }, provider: { data_collection: 'deny' }, ...(body.json && { response_format: { type: 'json_object' } }) }) });
    data = await r.json().catch(() => null);
  } catch { r = null; }
  if (!r || !r.ok || !data) { await call(A, 'settle', { id: g.hold, credits: 0 }); return json(aiFailure('chat', r, data), 502); }
  const u = data.usage || {}, usd = +u.cost > 0 ? +u.cost : ((+u.prompt_tokens || inTok) * pin + (+u.completion_tokens || maxTokens) * pout) / 1e6;
  await call(g.budget, 'spend', { usd });
  const st = await call(A, 'settle', { id: g.hold, credits: credits(usd, s), reason: 'ai',
    ai: { feature: featureOf(body.feature), model: data.model || model, tin: +u.prompt_tokens || 0, tout: +u.completion_tokens || 0, usd } });
  return json({ choices: data.choices, charged: st.used });
}
export async function aiImage(env, s, A, body, json) {
  const prompt = String(body.prompt || '').slice(0, 2000); if (!prompt) return json({ error: 'bad request' }, 400);
  const aspect = /^\d{1,2}:\d{1,2}$/.test(body.aspect_ratio || '') ? body.aspect_ratio : '16:9';
  const g = await guard(env, s, A, s.imageCredits, s.imageCredits * s.creditUsd, json); if (g.stop) return g.stop;
  let r, data;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/images', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
      body: JSON.stringify({ model: s.imageModel, prompt, aspect_ratio: aspect, n: 1 }) });
    data = await r.json().catch(() => null);
  } catch { r = null; }
  if (!r || !r.ok || !data?.data?.[0]?.b64_json) { await call(A, 'settle', { id: g.hold, credits: 0 }); return json(aiFailure('image', r, data), 502); }
  const usd = +data.usage?.cost || s.imageCredits * s.creditUsd;
  await call(g.budget, 'spend', { usd });
  const st = await call(A, 'settle', { id: g.hold, credits: s.imageCredits, reason: 'image', ai: { feature: 'image', model: s.imageModel, usd } });
  return json({ data: [{ b64_json: data.data[0].b64_json, media_type: data.data[0].media_type || 'image/png' }], charged: st.used });
}
// Speech (voice-over from the speaker notes): mp3, charged per character.
export async function aiSpeech(env, s, A, body, json) {
  const text = String(body.input || '').trim(); if (!text || text.length > 4000) return json({ error: 'bad request' }, 400);
  const voice = s.ttsVoices.includes(body.voice) ? body.voice : s.ttsVoices[0], speed = Math.min(2, Math.max(0.5, +body.speed || 1));
  const usd = text.length * s.ttsUsdPerChar, cr = credits(usd, s);
  const g = await guard(env, s, A, cr, usd, json); if (g.stop) return g.stop;
  let r, buf;
  try {
    r = await (env.FETCH || fetch)('https://openrouter.ai/api/v1/audio/speech', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'HTTP-Referer': s.site, 'X-Title': 'Revela' },
      body: JSON.stringify({ model: s.ttsModel, input: text, voice, speed, response_format: 'mp3' }) });
    buf = r.ok ? await r.arrayBuffer() : null;
  } catch { r = null; }
  if (!r || !r.ok || !buf || !buf.byteLength) { await call(A, 'settle', { id: g.hold, credits: 0 }); return json({ error: 'ai failed' }, 502); }
  await call(g.budget, 'spend', { usd });
  const st = await call(A, 'settle', { id: g.hold, credits: cr, reason: 'speech', ai: { feature: 'speech', model: s.ttsModel, usd } });
  let bin = ''; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return json({ audio: btoa(bin), media_type: 'audio/mpeg', charged: st.used });
}
