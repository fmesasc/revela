// Pictures for the AI. Made small first (a JPEG of at most ~768 px: a vision model
// still reads a screenshot's labels, at a fraction of the cost and of the request),
// then described once by a cheap vision model, several per request. The description
// is kept on the image block (b.aiCaption, with a hash of its picture), so running
// it again costs nothing until the picture changes.

import { chat, parseJSON, lang } from './openrouter.js';

export const VISION_MODEL = 'google/gemini-2.5-flash-lite';
export const SHOT = { max: 768, quality: 0.6, maxBytes: 280 * 1024 };
// A request: up to 6 pictures and ~1.3 MB of them (the server takes 8 and ~2 MB in all).
export const BATCH = { count: 6, chars: 1.3e6 };

// A cheap fingerprint of a picture's source: its length and FNV-1a over ~4000 characters spread through it.
export function srcHash(src) {
  const s = String(src || ''), step = Math.max(1, Math.floor(s.length / 4096));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += step) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  for (let i = Math.max(0, s.length - 256); i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return s.length.toString(36) + '-' + (h >>> 0).toString(36);
}
// Its description, if it is about the picture it has now.
export const captionOf = b => (b?.aiCaption && b.aiCaption.hash === srcHash(b.src) ? b.aiCaption : null);
export const bytesOf = url => Math.floor((String(url).length - String(url).indexOf(',') - 1) * 3 / 4);

const load = src => new Promise((ok, ko) => {
  const i = new Image();
  if (!/^(data|blob):/.test(src)) i.crossOrigin = 'anonymous';
  i.onload = () => ok(i); i.onerror = () => ko(new Error('IMAGE')); i.src = src;
});
// → { url (data:image/jpeg), w, h, nw, nh (its natural size), bytes }. Halved step by step
// (one big jump blurs small text), on white (JPEG has no transparency).
export async function downscale(src, { max = SHOT.max, quality = SHOT.quality, maxBytes = SHOT.maxBytes } = {}) {
  const img = await load(src);
  const nw = img.naturalWidth || img.width || max, nh = img.naturalHeight || img.height || Math.round(max * 0.5625);
  let k = Math.min(1, max / Math.max(nw, nh)), q = quality, out = null;
  for (let tries = 0; tries < 4; tries++) {
    const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    let cur = img, cw = nw, ch = nh;
    while (cw / 2 > w * 1.2) {
      const c = document.createElement('canvas'); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, c.width, c.height);
      cur = c; cw = c.width; ch = c.height;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, w, h);
    const url = c.toDataURL('image/jpeg', q);
    out = { url, w, h, nw, nh, bytes: bytesOf(url) };
    if (out.bytes <= maxBytes) break;
    q = Math.max(0.4, q - 0.1); k *= 0.85;
  }
  return out;
}

// Groups of pictures for one request each: ≤ BATCH.count and ≤ BATCH.chars.
export function batches(shots, { count = BATCH.count, chars = BATCH.chars } = {}) {
  const out = []; let cur = [], size = 0;
  for (const x of shots) {
    if (cur.length && (cur.length >= count || size + x.url.length > chars)) { out.push(cur); cur = []; size = 0; }
    cur.push(x); size += x.url.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

const PROMPT = language => `You describe pictures (often screenshots) from a presentation so someone can write its slides without seeing them. For each picture give: "caption": what it shows and what it teaches, 1–3 sentences; "visibleText": the key labels, menu, field or button names you can read, short, comma-separated ("" if none); "title": a short slide title for it. Write in ${language}. Answer only JSON: {"images":[{"n":1,"caption":"…","visibleText":"…","title":"…"}]}`;

// Describe image blocks: items [{ b (the block), slide (number) }] → Map(block id → aiCaption).
// Pictures that can't be read (another site's, broken) are skipped. context: a line about the deck.
// onProgress({ done, total }), onUsage as chat()'s; signal stops.
export async function describeImages(items, { context = '', language = lang(), onProgress = () => {}, onUsage = null, signal = null, model = VISION_MODEL } = {}) {
  const shots = [], out = new Map();
  for (const it of items) {
    if (signal?.aborted) throw new Error('STOPPED');
    try { shots.push({ ...it, ...(await downscale(it.b.src)) }); } catch {}
  }
  let done = 0; onProgress({ done, total: shots.length });
  for (const group of batches(shots)) {
    if (signal?.aborted) throw new Error('STOPPED');
    const content = [{ type: 'text', text: `${context ? `Presentation: ${context}\n` : ''}${group.length} pictures:` }];
    group.forEach((x, i) => content.push({ type: 'text', text: `Picture ${i + 1} (slide ${x.slide})` }, { type: 'image_url', image_url: { url: x.url } }));
    const res = await chat([{ role: 'system', content: PROMPT(language) }, { role: 'user', content }],
      { json: true, maxTokens: 120 + 170 * group.length, force: model, onUsage, signal, feature: 'vision' });
    let list = [];
    try { const j = parseJSON(res); list = Array.isArray(j) ? j : Array.isArray(j.images) ? j.images : []; } catch {}
    group.forEach((x, i) => {
      const d = list.find(r => +r?.n === i + 1) || list[i];
      if (!d || typeof d !== 'object' || !String(d.caption || '').trim()) return;
      out.set(x.b.id, { hash: srcHash(x.b.src), text: String(d.caption).trim().slice(0, 600), visibleText: String(d.visibleText || '').trim().slice(0, 300),
        title: String(d.title || '').trim().slice(0, 120), model, date: new Date().toISOString().slice(0, 10), nw: x.nw, nh: x.nh });
    });
    done += group.length; onProgress({ done, total: shots.length });
  }
  return out;
}

// ---- Reading code from a picture ---------------------------------------------------------
// A screenshot with code or a formula (a DAX measure in Power BI's formula bar, an M query,
// SQL, Python, an Excel formula…) transcribed verbatim, with its language. Kept on the image
// block (b.aiCode, with the picture's hash) like its description: read once, then free.
export const CODE_SHOT = { max: 1280, quality: 0.75, maxBytes: 420 * 1024 };
// (Reading code needs a sharper eye than describing a picture: a better model, and a second look
// at the code's own area, cut out at full resolution, when the first reading may be short of it.)
export const CODE_MODEL = 'google/gemini-2.5-flash';
const CODE_V = 2;                                        // (readings made the older way are read again)
export const codeOf = b => (b?.aiCode && b.aiCode.hash === srcHash(b.src) && b.aiCode.v === CODE_V ? b.aiCode : null);
const LANGS = 'dax | powerquery (Power Query M) | sql | python | javascript | typescript | excel (a worksheet formula) | r | json | plaintext';
const TRANSCRIBE = `You transcribe code from a picture (often a screenshot of Power BI, Excel, an editor or a notebook). Copy the code or formula you see EXACTLY as written — every line, same names, accents (ñ, á…), symbols, line breaks and indentation; do not fix, shorten, complete, translate or explain it; leave out line numbers, the editor's buttons and anything that is not the code. If there are several, take the main one. "language": one of ${LANGS}. "confidence": 0..1, how sure you are that the transcription is exact and complete. "box": where the code is in the picture, [left, top, right, bottom] from 0 to 1000. No code in the picture: "code":"". Answer only JSON: {"language":"…","code":"…","confidence":0.0,"box":[0,0,1000,1000]}`;
// Brackets that don't close: a reading cut short.
export const looksCut = code => { let d = 0; for (const ch of code) { if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--; } return d !== 0 || /[=(,+\-*/]\s*$/.test(code); };
// The code's area of the picture, at up to 1600 px wide (a JPEG data URL).
async function cropShot(src, box) {
  const img = await load(src), W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const [l, t, r, bt] = box.map(v => Math.max(0, Math.min(1000, +v || 0)) / 1000), pad = 0.02;
  const x = Math.max(0, (l - pad) * W), y = Math.max(0, (t - pad) * H), w = Math.min(W, (r + pad) * W) - x, h = Math.min(H, (bt + pad) * H) - y;
  if (!(w > 8 && h > 8)) return null;
  const k = Math.min(2, 1600 / w), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high'; g.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
  let q = 0.85, url = c.toDataURL('image/jpeg', q);
  while (url.length > CODE_SHOT.maxBytes && q > 0.45) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
  return url;
}
// Transcribe one image block → { hash, language, code, confidence, model, date, v } (code '' if none);
// the cached one when there is. hint: a line about what is wanted (the user's request).
export async function transcribeImage(b, { hint = '', onUsage = null, signal = null, model = CODE_MODEL } = {}) {
  const had = codeOf(b); if (had) return { ...had, cached: true };
  const ask = async url => {
    const content = [{ type: 'text', text: hint ? `Wanted: ${String(hint).slice(0, 300)}` : 'Transcribe the code.' }, { type: 'image_url', image_url: { url } }];
    const res = await chat([{ role: 'system', content: TRANSCRIBE }, { role: 'user', content }], { json: true, maxTokens: 2400, force: model, onUsage, signal, feature: 'vision' });
    let j = {}; try { j = parseJSON(res) || {}; } catch {}
    return { code: typeof j.code === 'string' ? j.code.replace(/\r\n?/g, '\n').replace(/^\n+|\s+$/g, '').slice(0, 4000) : '',
      language: String(j.language || '').toLowerCase().trim().slice(0, 20) || 'plaintext',
      confidence: Math.max(0, Math.min(1, Number.isFinite(+j.confidence) ? +j.confidence : 0.5)), box: Array.isArray(j.box) && j.box.length === 4 ? j.box : null };
  };
  const shot = await downscale(b.src, CODE_SHOT);
  if (signal?.aborted) throw new Error('STOPPED');
  let r = await ask(shot.url);
  // (A second look, closer, when the first may be incomplete or unsure.)
  if (r.code && r.box && (r.confidence < 0.9 || looksCut(r.code))) {
    const url = await cropShot(b.src, r.box).catch(() => null);
    if (url && !signal?.aborted) {
      const r2 = await ask(url);
      if (r2.code && (looksCut(r.code) && !looksCut(r2.code) || r2.code.length > r.code.length * 1.1 || r2.confidence > r.confidence)) r = { ...r2, language: r2.language || r.language };
    }
  }
  return { hash: srcHash(b.src), language: r.language, code: r.code, confidence: r.confidence, model, v: CODE_V, date: new Date().toISOString().slice(0, 10) };
}
