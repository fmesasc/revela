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
