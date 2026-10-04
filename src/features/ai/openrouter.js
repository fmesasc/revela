// AI features through OpenRouter (or the user's own OpenRouter key). Nothing
// goes through a Revela server: the browser talks to OpenRouter directly and
// the user pays their own usage there. Requests carry Revela's app attribution
// (HTTP-Referer / X-Title), which shows Revela in OpenRouter's app rankings.
//
// Sign-in is OAuth PKCE: we send the user to openrouter.ai/auth with a code
// challenge; they come back with ?code=…, which we exchange for a key that is
// stored only in this browser.

import { isFormula } from '../../core/formulas.js';
import { esc, plainText } from '../../core/text.js';
import { state, commit, currentSlide, selectedBlock } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { currentLang } from '../../i18n/index.js';

const KEY = 'revela.ai.v1', VERIFIER = 'revela.ai.pkce';
const API = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'openrouter/auto';
export const APP_URL = 'https://fmesasc.github.io/revela/';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
export const aiSettings = () => ({ model: DEFAULT_MODEL, ...read() });
// The official edition's AI: through the person's Revela account (credits), set by
// the app (io/cloud/account.js) — { active(), chat(body), image(body) }. With it,
// requests go to Revela's server, which pays OpenRouter and charges credits.
let cloud = null;
export const setCloudAi = c => { cloud = c; };
export const usingCloudAi = () => !!(cloud && cloud.active());
export const aiConnected = () => !!read().key || usingCloudAi();
// A failure from the account's AI, as the same errors the rest of the app knows.
const cloudError = e => new Error(e.status === 402 ? 'NO_CREDIT' : e.status === 401 ? 'NO_KEY' : e.status === 429 ? 'TOO_MANY' : e.status === 503 ? 'AI_PAUSED' : 'OpenRouter ' + (e.status || '') + ' ' + (e.message || '') + (e.data?.detail ? ': ' + e.data.detail : ''));
export const setAiKey = key => write({ ...read(), key: (key || '').trim() || undefined });
export const setAiModel = model => write({ ...read(), model: (model || '').trim() || DEFAULT_MODEL });
export const acceptPrivacy = () => write({ ...read(), accepted: true });
export const privacyAccepted = () => !!read().accepted;
export const disconnectAi = () => write({ model: read().model });

// ---- OAuth PKCE --------------------------------------------------------------
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function pkceChallenge(verifier) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
}
const callbackUrl = () => location.origin + location.pathname;
export async function startOpenRouterLogin() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  try { sessionStorage.setItem(VERIFIER, verifier); } catch {}
  const url = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl())}`
    + `&code_challenge=${await pkceChallenge(verifier)}&code_challenge_method=S256&key_label=Revela`;
  location.assign(url);
}
// Called on start-up: if we're back from OpenRouter with ?code=, get the key.
export async function finishOpenRouterLogin(loc = location) {
  const params = new URLSearchParams(loc.search), code = params.get('code');
  if (!code) return false;
  let verifier = ''; try { verifier = sessionStorage.getItem(VERIFIER) || ''; } catch {}
  params.delete('code');
  history.replaceState(null, '', loc.pathname + (params.toString() ? '?' + params : '') + loc.hash);
  if (!verifier) return false;
  const r = await fetch(`${API}/auth/keys`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }) });
  if (!r.ok) throw new Error('OpenRouter ' + r.status);
  const { key } = await r.json();
  try { sessionStorage.removeItem(VERIFIER); } catch {}
  setAiKey(key); acceptPrivacy();                         // signing in is the explicit choice
  return true;
}

// ---- Chat --------------------------------------------------------------------
// onUsage({ usd?, credits? }): what the call cost — credits charged through the
// account, the provider's dollars with an own key. signal: stops waiting (own key).
// prefer: the model a task works best with, used unless the person chose one (with the account,
// the server only takes the models it allows); force (or model): that model whatever was chosen
// (a cheap one for a cheap task, one that sees images…). A message's content may be parts: text and
// pictures (data: URLs), both ways. feature: what it is for ('assistant', 'complete'…), for Revela's own
// accounts of what the AI costs (only with the account; the server takes known ones, else 'other').
export async function chat(messages, { json = false, maxTokens = 2000, onUsage = null, signal = null, prefer = null, force = null, model: only = null, feature = null } = {}) {
  const set = aiSettings(), key = set.key, model = force || only || (prefer && set.model === DEFAULT_MODEL ? prefer : set.model);
  if (!key && usingCloudAi()) {
    const data = await cloud.chat({ messages, max_tokens: maxTokens, json, ...(model !== DEFAULT_MODEL && { model }), ...(feature && { feature }) }).catch(e => { throw cloudError(e); });
    if (signal?.aborted) throw new Error('STOPPED');
    if (onUsage && +data.charged > 0) onUsage({ credits: +data.charged });
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
  if (!key) throw new Error('NO_KEY');
  let r;
  try {
    r = await fetch(`${API}/chat/completions`, {
      method: 'POST', ...(signal && { signal }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': APP_URL, 'X-Title': 'Revela' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, ...(onUsage && { usage: { include: true } }), ...(json && { response_format: { type: 'json_object' } }) }),
    });
  } catch (e) { if (signal?.aborted) throw new Error('STOPPED'); throw e; }
  if (r.status === 401) throw new Error('BAD_KEY');
  if (r.status === 402) throw new Error('NO_CREDIT');
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ' ' + ((await r.text().catch(() => '')).slice(0, 200)));
  const data = await r.json();
  if (signal?.aborted) throw new Error('STOPPED');
  if (onUsage && +data.usage?.cost > 0) onUsage({ usd: +data.usage.cost });
  return data.choices?.[0]?.message?.content?.trim() || '';
}
// ---- Speech (voice-over): mp3 of a text, through the account or the user's key ----
export const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];
export const TTS_MODEL = 'openai/gpt-4o-mini-tts-2025-12-15';
export async function speech(text, { voice = 'nova', speed = 1 } = {}) {
  const { key } = aiSettings();
  if (!key && usingCloudAi()) {
    if (!cloud.speech) throw new Error('NO_KEY');
    const d = await cloud.speech({ input: text, voice, speed }).catch(e => { throw cloudError(e); });
    return new Blob([Uint8Array.from(atob(d.audio), c => c.charCodeAt(0))], { type: d.media_type || 'audio/mpeg' });
  }
  if (!key) throw new Error('NO_KEY');
  const r = await fetch(`${API}/audio/speech`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': APP_URL, 'X-Title': 'Revela' },
    body: JSON.stringify({ model: TTS_MODEL, input: text, voice, speed, response_format: 'mp3' }) });
  if (r.status === 401) throw new Error('BAD_KEY');
  if (r.status === 402) throw new Error('NO_CREDIT');
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ' ' + ((await r.text().catch(() => '')).slice(0, 200)));
  return new Blob([await r.arrayBuffer()], { type: 'audio/mpeg' });
}
const LANG = { es: 'español', en: 'English', fr: 'français', de: 'Deutsch', it: 'italiano', pt: 'português', ca: 'català', gl: 'galego', nl: 'Nederlands', eu: 'euskara', ar: 'العربية' };
export const lang = () => LANG[currentLang()] || 'español';
// JSON from a model answer (tolerates ``` fences and text around the object).
export const parseJSON = s => { const t = String(s).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(t); } catch { const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1)); throw new Error('EMPTY'); } };
export { esc };
export const plain = html => plainText(html);

// Generate a deck outline and insert it as new slides after the current one.
export async function generateSlides(topic, count = 6) {
  const out = await chat([
    { role: 'system', content: `You write presentation outlines. Answer only JSON: {"slides":[{"title":"…","bullets":["…"],"notes":"…"}]}. Language: ${lang()}. 3–5 short bullets per slide, speaker notes of 2–3 sentences.` },
    { role: 'user', content: `Topic: ${topic}\nNumber of slides: ${count}` },
  ], { json: true, maxTokens: 3000, feature: 'outline' });
  const slides = (parseJSON(out).slides || []).slice(0, 30);
  if (!slides.length) throw new Error('EMPTY');
  const bg = currentSlide()?.background || '#101317', sec = currentSlide()?.sectionId || null;
  commit(() => {
    const made = slides.map(s => ({ id: uid(), sectionId: sec, background: bg, transition: null, hidden: false, autoSlide: 0,
      notes: String(s.notes || ''),
      blocks: [
        { id: uid(), type: 'text', ph: 'title', x: 90, y: 60, w: 1100, h: 90, fontSize: 46, fontWeight: '700', rotation: 0, animation: null, html: esc(s.title) },
        { id: uid(), type: 'text', ph: 'body', x: 90, y: 175, w: 1100, h: 460, fontSize: 28, rotation: 0, animation: null,
          html: (s.bullets || []).length ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '' },
      ] }));
    state.deck.slides.splice(state.ui.slideIndex + 1, 0, ...made);
    state.ui.slideIndex += 1; state.ui.selection = null;
  });
  return slides.length;
}

export const REWRITE = {
  shorter: 'Make it shorter and clearer, keeping the meaning.',
  formal: 'Rewrite it in a more formal, professional tone.',
  simple: 'Rewrite it in simple words for a general audience.',
  fix: 'Fix spelling, grammar and punctuation only.',
  bullets: 'Turn it into 3–5 concise bullet points.',
};
// Rewrite the selected text box (keeps it a list when the answer is a list).
export async function rewriteSelected(kind, targetLang = null) {
  const b = selectedBlock(); if (!b || b.type !== 'text') throw new Error('NO_TEXT');
  const task = targetLang ? `Translate it into ${targetLang}.` : REWRITE[kind];
  const out = await chat([
    { role: 'system', content: `You edit slide text. ${task} Reply with the new text only. Use "- " at the start of each line for bullet points. ${targetLang ? '' : `Keep the language of the text.`}` },
    { role: 'user', content: plain(b.html) },
  ], { maxTokens: 800, feature: 'rewrite' });
  const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
  const html = lines.every(l => /^[-•*]\s/.test(l))
    ? `<ul>${lines.map(l => `<li>${esc(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>`
    : lines.map(esc).join('<br>');
  commit(() => { b.html = html; });
  return html;
}

// Speaker notes for the current slide (or every slide without notes).
export async function writeNotes({ all = false } = {}) {
  const targets = all ? state.deck.slides.filter(s => !s.notes?.trim() && !s.hidden) : [currentSlide()];
  let n = 0;
  for (const s of targets) {
    const text = s.blocks.filter(b => b.type === 'text').map(b => plain(b.html)).filter(Boolean).join('\n');
    if (!text) continue;
    const notes = await chat([
      { role: 'system', content: `You write speaker notes: what the presenter should say for this slide, 3–5 natural sentences, in ${lang()}. Plain text only.` },
      { role: 'user', content: text },
    ], { maxTokens: 500, feature: 'notes' });
    commit(() => { s.notes = notes; }); n++;
  }
  return n;
}

// Alt text for the selected image (needs a model that accepts images).
export async function describeImage() {
  const b = selectedBlock(); if (!b || b.type !== 'image') throw new Error('NO_IMAGE');
  // (Made small first: a JPEG data: URL, what the account's server takes, at a fraction of the cost.)
  // (A picture the browser can't redraw — an odd format, another site's without CORS — goes as it is, if it's inside the deck.)
  const shot = await (await import('./vision.js')).downscale(b.src).catch(() => { if (/^data:image\//.test(b.src || '')) return { url: b.src }; throw new Error('NO_IMAGE'); });
  const alt = await chat([
    { role: 'system', content: `Write alt text for this image for a screen reader: one sentence, max 125 characters, in ${lang()}, no "image of".` },
    { role: 'user', content: [{ type: 'text', text: 'Describe the image.' }, { type: 'image_url', image_url: { url: shot.url } }] },
  ], { maxTokens: 120, feature: 'alt-text' });
  commit(() => { b.alt = alt.replace(/^["']|["']$/g, ''); delete b.decorative; });
  return b.alt;
}

// ---- Images ------------------------------------------------------------------
export const DEFAULT_IMAGE_MODEL = 'bytedance-seed/seedream-4.5';
export const imageModel = () => read().imageModel || DEFAULT_IMAGE_MODEL;
export const setImageModel = m => write({ ...read(), imageModel: (m || '').trim() || undefined });

// Generate an image (OpenRouter Image API) and place it on the current slide.
export async function generateImage(prompt, aspect = '16:9') {
  const { key } = aiSettings();
  if (!key && usingCloudAi()) {
    const data = await cloud.image({ prompt, aspect_ratio: aspect }).catch(e => { throw cloudError(e); });
    return placeImage(data.data?.[0], prompt, aspect);
  }
  if (!key) throw new Error('NO_KEY');
  const r = await fetch(`${API}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': APP_URL, 'X-Title': 'Revela' },
    body: JSON.stringify({ model: imageModel(), prompt, aspect_ratio: aspect, n: 1 }),
  });
  if (r.status === 401) throw new Error('BAD_KEY');
  if (r.status === 402) throw new Error('NO_CREDIT');
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ' ' + ((await r.text().catch(() => '')).slice(0, 200)));
  return placeImage((await r.json()).data?.[0], prompt, aspect);
}
function placeImage(img, prompt, aspect) {
  if (!img?.b64_json) throw new Error('EMPTY');
  const src = `data:${img.media_type || 'image/png'};base64,${img.b64_json}`;
  const [aw, ah] = aspect.split(':').map(Number), { w: W, h: H } = state.deck.size;
  const h = Math.round(Math.min(H * 0.8, (W * 0.7) * ah / aw)), w = Math.round(h * aw / ah);
  const b = { id: uid(), type: 'image', src, fit: 'contain', alt: prompt.slice(0, 125), x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h, rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b.id;
}

// ---- Translate the whole deck ---------------------------------------------------
// Text boxes (keeping their HTML formatting), table cells and speaker notes,
// one request per slide; applied at the end as a single undo step.
export async function translateDeck(targetLang, onProgress) {
  const out = new Map(), slides = state.deck.slides;
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i], items = {};
    for (const b of s.blocks) {
      if (b.type === 'text' && plain(b.html)) items[b.id] = b.html;
      if (b.type === 'table') b.rows.forEach((row, r) => row.forEach((c, k) => { if (plain(c) && !isFormula(c)) items[`${b.id}|${r}|${k}`] = c; }));
    }
    if (s.notes?.trim()) items[`notes|${s.id}`] = s.notes;
    if (!Object.keys(items).length) { onProgress?.((i + 1) / slides.length); continue; }
    const res = await chat([
      { role: 'system', content: `Translate every value of this JSON object into ${targetLang}. Keep the keys, keep all HTML tags and attributes exactly, translate only the human text. Answer only the JSON object.` },
      { role: 'user', content: JSON.stringify(items) },
    ], { json: true, maxTokens: 4000, feature: 'translate' });
    const tr = parseJSON(res);
    for (const [k, v] of Object.entries(tr)) if (typeof v === 'string' && k in items) out.set(k, v);
    onProgress?.((i + 1) / slides.length);
  }
  commit(() => {
    for (const s of state.deck.slides) {
      if (out.has(`notes|${s.id}`)) s.notes = out.get(`notes|${s.id}`);
      for (const b of s.blocks) {
        if (b.type === 'text' && out.has(b.id)) b.html = out.get(b.id);
        if (b.type === 'table') b.rows.forEach((row, r) => row.forEach((_, k) => { const key = `${b.id}|${r}|${k}`; if (out.has(key)) row[k] = out.get(key); }));
      }
    }
  });
  return out.size;
}
