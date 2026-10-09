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
// web: the model searches the internet first (OpenRouter's web plugin; a few cents more) and onSources gets the pages
// it used — [{ title, url }] —, to cite them.
const sourcesOf = msg => { const seen = new Set();
  return (msg?.annotations || []).filter(a => a?.type === 'url_citation' && /^https?:\/\//.test(a.url_citation?.url || ''))
    .map(a => ({ title: String(a.url_citation.title || '').trim().slice(0, 160), url: a.url_citation.url })).filter(x => !seen.has(x.url) && seen.add(x.url)); };
export async function chat(messages, { json = false, maxTokens = 2000, onUsage = null, signal = null, prefer = null, force = null, model: only = null, feature = null, web = false, onSources = null } = {}) {
  const set = aiSettings(), key = set.key, model = force || only || (prefer && set.model === DEFAULT_MODEL ? prefer : set.model);
  if (!key && usingCloudAi()) {
    const data = await cloud.chat({ messages, max_tokens: maxTokens, json, ...(model !== DEFAULT_MODEL && { model }), ...(feature && { feature }), ...(web && { web: true }) }).catch(e => { throw cloudError(e); });
    if (signal?.aborted) throw new Error('STOPPED');
    if (onUsage && +data.charged > 0) onUsage({ credits: +data.charged });
    if (onSources) onSources(sourcesOf(data.choices?.[0]?.message));
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
  if (!key) throw new Error('NO_KEY');
  let r;
  try {
    r = await fetch(`${API}/chat/completions`, {
      method: 'POST', ...(signal && { signal }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': APP_URL, 'X-Title': 'Revela' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, ...(onUsage && { usage: { include: true } }), ...(json && { response_format: { type: 'json_object' } }), ...(web && { plugins: [{ id: 'web', max_results: 6 }] }) }),
    });
  } catch (e) { if (signal?.aborted) throw new Error('STOPPED'); throw e; }
  if (r.status === 401) throw new Error('BAD_KEY');
  if (r.status === 402) throw new Error('NO_CREDIT');
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ' ' + ((await r.text().catch(() => '')).slice(0, 200)));
  const data = await r.json();
  if (signal?.aborted) throw new Error('STOPPED');
  if (onUsage && +data.usage?.cost > 0) onUsage({ usd: +data.usage.cost });
  if (onSources) onSources(sourcesOf(data.choices?.[0]?.message));
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
// The model's JSON, as it comes: without its ``` fence, or cut to its outer {…}. LaTeX in it is the usual trouble: a
// formula's «\frac» written with one backslash is a valid escape (a form feed and «rac») — the formula silently broken —
// and «\sqrt» an invalid one — the whole answer lost («Bad escaped character»). So in "latex" values a lone backslash
// before a command is LaTeX's, and anywhere else one that starts no valid escape is kept as a backslash.
const latexFixed = t => t.replace(/("latex"\s*:\s*")((?:[^"\\]|\\.)*)"/g, (m, a, v) => a + v.replace(/\\\\|\\(?=[a-zA-Z{}()[\]|,;:! ])/g, x => (x === '\\\\' ? x : '\\\\')) + '"');
const escapesFixed = t => t.replace(/\\(?:u(?![0-9a-fA-F]{4})|(?!["\\/bfnrtu]))/g, '\\\\');
export const parseJSON = s => {
  const t = latexFixed(String(s).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()), a = t.indexOf('{'), b = t.lastIndexOf('}');
  for (const x of [t, a >= 0 && b > a ? t.slice(a, b + 1) : null]) {
    if (x == null) continue;
    try { return JSON.parse(x); } catch {}
    try { return JSON.parse(escapesFixed(x)); } catch {}
  }
  throw new Error('EMPTY');
};
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
  return placeImage(await imageRequest({ prompt, aspect }), prompt, aspect);
}
// The Image API: with the account's credits or the user's own key; image: a picture to edit (input_references).
async function imageRequest({ prompt, aspect, image = null }) {
  const { key } = aiSettings();
  if (!key && usingCloudAi()) return (await cloud.image({ prompt, aspect_ratio: aspect, ...(image && { image }) }).catch(e => { throw cloudError(e); })).data?.[0];
  if (!key) throw new Error('NO_KEY');
  const r = await fetch(`${API}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': APP_URL, 'X-Title': 'Revela' },
    body: JSON.stringify({ model: imageModel(), prompt, aspect_ratio: aspect, n: 1, ...(image && { input_references: [{ type: 'image_url', image_url: { url: image } }] }) }),
  });
  if (r.status === 401) throw new Error('BAD_KEY');
  if (r.status === 402) throw new Error('NO_CREDIT');
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ' ' + ((await r.text().catch(() => '')).slice(0, 200)));
  return (await r.json()).data?.[0];
}

// Editing a picture with the image model (PowerPoint Designer's edits, Canva's Magic Eraser and Magic Expand): erase
// something, more resolution, a retouch, its edges extended to another shape, or any change said in words. The block
// keeps its place (its shape follows the new one when extended); one step to undo.
export const IMAGE_EDITS = {
  erase: what => `Remove ${what} from this photo and fill that area naturally, as if it had never been there. Keep everything else exactly the same: framing, colours, light, people and any text.`,
  enhance: () => 'Retouch this photo like a professional: balanced exposure and white balance, natural contrast and colour, slightly sharper. Do not change its content, framing, faces or text.',
  upscale: () => 'Recreate this exact image at a higher resolution: sharper, finer detail, less noise and compression artefacts. Do not change its content, composition, colours, faces or text.',
  expand: () => 'Extend this image beyond its edges to fill the new, wider frame, continuing the scene naturally with the same style, light and perspective. Keep the original part unchanged, in the centre.',
  edit: what => `${what}. Keep everything else in the image exactly the same.`,
};
export const IMAGE_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '2:1', '1:2', '21:9', '9:21'];
const nearestRatio = r => IMAGE_RATIOS.reduce((a, x) => { const [w, h] = x.split(':').map(Number), [aw, ah] = a.split(':').map(Number); return Math.abs(Math.log(w / h / r)) < Math.abs(Math.log(aw / ah / r)) ? x : a; }, '1:1');
export async function editImage(b, kind, { what = '', aspect = null } = {}) {
  if (!b || b.type !== 'image' || !IMAGE_EDITS[kind]) throw new Error('NO_IMAGE');
  // (Sent as a JPEG of at most 1536 px — under the account's limit —; a picture that can't be redrawn, as it is.)
  const shot = await (await import('./vision.js')).downscale(b.src, { max: 1536, quality: 0.88, maxBytes: 1300 * 1024 })
    .catch(() => { if (/^(data:image\/|https:)/.test(b.src || '')) return { url: b.src, nw: b.w, nh: b.h }; throw new Error('NO_IMAGE'); });
  const ratio = kind === 'expand' && aspect ? aspect : nearestRatio((shot.nw || b.w) / (shot.nh || b.h));
  const img = await imageRequest({ prompt: IMAGE_EDITS[kind](String(what).slice(0, 400)), aspect: ratio, image: shot.url });
  if (!img?.b64_json) throw new Error('EMPTY');
  const src = `data:${img.media_type || 'image/png'};base64,${img.b64_json}`;
  commit(() => {
    b.src = src; delete b.crop; delete b.uncropped;
    if (kind === 'expand') {                              // (the box takes the new shape around its centre, inside the slide)
      const [w, h] = ratio.split(':').map(Number), { w: W, h: H } = state.deck.size, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      let nh = b.h, nw = nh * w / h; const k = Math.min(1, W / nw, H / nh); nw *= k; nh *= k;
      b.w = Math.round(nw); b.h = Math.round(nh); b.x = Math.round(Math.min(W - b.w, Math.max(0, cx - b.w / 2))); b.y = Math.round(Math.min(H - b.h, Math.max(0, cy - b.h / 2)));
    }
  });
  return src;
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

// ---- Translate the whole deck, or adapt it to a reading level ------------------------
// Text boxes (keeping their HTML formatting), table cells and speaker notes,
// one request per slide; applied at the end as a single undo step.
export const translateDeck = (targetLang, onProgress) => rewriteTexts(`Translate every value of this JSON object into ${targetLang}. Keep the keys, keep all HTML tags and attributes exactly, translate only the human text. Answer only the JSON object.`,
  { feature: 'translate' }, onProgress);

// A multilingual presentation's table (features/document/languages.js): its texts that have no translation yet in
// one language, translated in batches. → { text: translation }. (Whatever the model leaves out stays to do.)
export async function translateTable(texts, lang, { context = '', onProgress, signal } = {}) {
  const out = {}, size = 40;
  for (let i = 0; i < texts.length; i += size) {
    const part = texts.slice(i, i + size), items = Object.fromEntries(part.map((tx, k) => [String(k), tx]));
    const res = await chat([
      { role: 'system', content: `Translate every value of this JSON object into ${lang}, for a presentation${context ? ' about ' + context : ''} that students will read in their own language. Keep the keys, keep all HTML tags and attributes exactly, translate only the human text; keep names, code, formulas and numbers. Short, natural and clear, as long as the original or shorter (a slide has little room). Answer only the JSON object.` },
      { role: 'user', content: JSON.stringify(items) },
    ], { json: true, maxTokens: 6000, feature: 'translate', signal });
    const tr = parseJSON(res) || {};
    part.forEach((tx, k) => { const v = tr[String(k)]; if (typeof v === 'string' && v.trim()) out[tx] = v; });
    onProgress?.(Math.min(1, (i + size) / texts.length));
  }
  return out;
}

// Adapt to a reading level (Nearpod's Text Leveler): the slides' texts for younger readers, Easy-to-Read, or specialists —
// same language, same facts. Not the notes (they're the presenter's). only: block ids (the selected boxes), else slides.
export const READING_LEVELS = {
  easy: ['Lectura fácil', 'people with reading difficulties, following the Easy-to-Read guidelines (Lectura Fácil): one idea per sentence, subject–verb–object order, common words, no metaphors, abbreviations or abstract figures'],
  early: ['Primaria, de 6 a 8 años', 'children aged 6 to 8: very short sentences and the most common words; any needed term explained with a simple example'],
  primary: ['Primaria, de 9 a 11 años', 'children aged 9 to 11: short sentences and everyday words; keep the subject\'s key terms but explain them briefly'],
  secondary: ['Secundaria, de 12 a 16 años', 'teenagers aged 12 to 16: clear sentences; keep the subject\'s terms, explaining the hardest ones'],
  adult: ['Público adulto general', 'a general adult audience: plain language, no jargon'],
  expert: ['Especialistas', 'specialists: precise technical vocabulary, concise'],
};
export function levelDeck(level, { only = null, slides = null } = {}, onProgress) {
  const L = READING_LEVELS[level]; if (!L) throw new Error('BAD_LEVEL');
  return rewriteTexts(`Rewrite every value of this JSON object for ${L[1]}. Keep the language of each text, its meaning and every fact; add no new facts. `
    + `Keep it about as long or shorter (a slide has little room). Keep the keys, keep all HTML tags and attributes exactly (a list stays a list), change only the human text. Answer only the JSON object.`,
  { feature: 'rewrite', notes: false, only, slides }, onProgress);
}

async function rewriteTexts(system, { feature, notes = true, only = null, slides: which = null }, onProgress) {
  const out = new Map(), slides = which || state.deck.slides, keep = id => !only || only.includes(id);
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i], items = {};
    for (const b of s.blocks) {
      if (!keep(b.id)) continue;
      if (b.type === 'text' && plain(b.html)) items[b.id] = b.html;
      if (b.type === 'table') b.rows.forEach((row, r) => row.forEach((c, k) => { if (plain(c) && !isFormula(c)) items[`${b.id}|${r}|${k}`] = c; }));
    }
    if (notes && !only && s.notes?.trim()) items[`notes|${s.id}`] = s.notes;
    if (!Object.keys(items).length) { onProgress?.((i + 1) / slides.length); continue; }
    const res = await chat([
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(items) },
    ], { json: true, maxTokens: 4000, feature });
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
