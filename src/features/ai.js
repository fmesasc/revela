// AI features through OpenRouter (or the user's own OpenRouter key). Nothing
// goes through a Revela server: the browser talks to OpenRouter directly and
// the user pays their own usage there. Requests carry Revela's app attribution
// (HTTP-Referer / X-Title), which shows Revela in OpenRouter's app rankings.
//
// Sign-in is OAuth PKCE: we send the user to openrouter.ai/auth with a code
// challenge; they come back with ?code=…, which we exchange for a key that is
// stored only in this browser.

import { state, commit, currentSlide, selectedBlock } from '../core/store.js';
import { uid } from '../core/model.js';
import { currentLang } from '../i18n.js';

const KEY = 'revela.ai.v1', VERIFIER = 'revela.ai.pkce';
const API = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'openrouter/auto';
export const APP_URL = 'https://fmesasc.github.io/revela/';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
export const aiSettings = () => ({ model: DEFAULT_MODEL, ...read() });
export const aiConnected = () => !!read().key;
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
export async function chat(messages, { json = false, maxTokens = 2000 } = {}) {
  const { key, model } = aiSettings();
  if (!key) throw new Error('NO_KEY');
  const r = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': APP_URL, 'X-Title': 'Revela' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, ...(json && { response_format: { type: 'json_object' } }) }),
  });
  if (r.status === 401) throw new Error('BAD_KEY');
  if (r.status === 402) throw new Error('NO_CREDIT');
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ' ' + ((await r.text().catch(() => '')).slice(0, 200)));
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
const LANG = { es: 'español', en: 'English', fr: 'français', de: 'Deutsch', it: 'italiano', pt: 'português', ca: 'català', gl: 'galego', nl: 'Nederlands', eu: 'euskara', ar: 'العربية' };
const lang = () => LANG[currentLang()] || 'español';
const parseJSON = s => JSON.parse(String(s).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.innerText || d.textContent || '').trim(); };

// Generate a deck outline and insert it as new slides after the current one.
export async function generateSlides(topic, count = 6) {
  const out = await chat([
    { role: 'system', content: `You write presentation outlines. Answer only JSON: {"slides":[{"title":"…","bullets":["…"],"notes":"…"}]}. Language: ${lang()}. 3–5 short bullets per slide, speaker notes of 2–3 sentences.` },
    { role: 'user', content: `Topic: ${topic}\nNumber of slides: ${count}` },
  ], { json: true, maxTokens: 3000 });
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
  ], { maxTokens: 800 });
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
    ], { maxTokens: 500 });
    commit(() => { s.notes = notes; }); n++;
  }
  return n;
}

// Alt text for the selected image (needs a model that accepts images).
export async function describeImage() {
  const b = selectedBlock(); if (!b || b.type !== 'image') throw new Error('NO_IMAGE');
  const alt = await chat([
    { role: 'system', content: `Write alt text for this image for a screen reader: one sentence, max 125 characters, in ${lang()}, no "image of".` },
    { role: 'user', content: [{ type: 'text', text: 'Describe the image.' }, { type: 'image_url', image_url: { url: b.src } }] },
  ], { maxTokens: 120 });
  commit(() => { b.alt = alt.replace(/^["']|["']$/g, ''); delete b.decorative; });
  return b.alt;
}
