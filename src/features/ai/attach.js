// Files given to the AI along with a request (the assistant, the theme editor): pictures — a photo of a
// whiteboard or of notes, a logo, a chart, a document's page — and documents (PDF, text, CSV, Markdown).
// Pictures go to the model made small (vision.js) and are kept at slide size too, so the assistant can
// put them on a slide ("attachment:N"); documents go as their text. A scanned PDF (no text in it) goes
// as pictures of its first pages.

import { downscale } from './vision.js';
import { readDocument } from './authoring.js';
import { openPdf, pageImage } from '../content/files.js';
import { PDFJS } from '../../core/vendor.js';
import { shrinkImage } from '../document/imgshrink.js';

export const ATTACH = { count: 6, bytes: 25e6, textChars: 30000, pdfPages: 4 };
export const ATTACH_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif,.pdf,.txt,.md,.csv,.tsv,.json,.html,.htm';
const TEXTUAL = /\.(txt|md|csv|tsv|json|html?)$/i;
const readURL = file => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(new Error('READ')); r.readAsDataURL(file); });

// A picture → { kind: 'image', name, url (small, for the model), full (for a slide), w, h }.
async function picture(src, name) {
  const ai = await downscale(src, { max: 1024, quality: 0.7, maxBytes: 280 * 1024 });
  let full = src; try { full = (await shrinkImage(src)) || src; } catch {}
  return { kind: 'image', name, url: ai.url, full, w: ai.nw, h: ai.nh };
}

// A file → a list of attachments (a scanned PDF gives several). Error 'ATTACH_TYPE' (not a kind it
// reads) or 'ATTACH_BIG'.
export async function readAttachment(file) {
  const name = String(file.name || 'archivo').replace(/[\u0000-\u001f]/g, '').slice(0, 80);
  if (file.size > ATTACH.bytes) throw new Error('ATTACH_BIG');
  if (/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)) return [await picture(await readURL(file), name)];
  if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) {
    const text = String(await readDocument(file)).replace(/[ \t]+/g, ' ').trim();
    if (text.replace(/\s/g, '').length > 200) return [{ kind: 'text', name, text: text.slice(0, ATTACH.textChars), cut: text.length > ATTACH.textChars }];
    const pdf = await openPdf(await readURL(file)), out = [];
    for (let i = 1; i <= Math.min(pdf.numPages, ATTACH.pdfPages); i++) out.push(await picture((await pageImage(pdf, i, 1400)).src, pdf.numPages > 1 ? `${name} · ${i}` : name));
    return out;
  }
  if (/^text\//.test(file.type) || file.type === 'application/json' || TEXTUAL.test(name)) {
    const text = String(await file.text()).trim();
    return [{ kind: 'text', name, text: text.slice(0, ATTACH.textChars), cut: text.length > ATTACH.textChars }];
  }
  throw new Error('ATTACH_TYPE');
}

// The request's user message with its attachments: a plain string if there are none, else the parts
// (text first, with each document's text and each picture's number, then the pictures).
export function withAttachments(text, list = []) {
  if (!list.length) return text;
  const docs = list.filter(a => a.kind === 'text'), pics = list.filter(a => a.kind === 'image');
  const head = text + (docs.length ? '\n\n' + docs.map(d => `Attached document «${d.name}»${d.cut ? ' (cut short)' : ''}:\n${d.text}`).join('\n\n') : '')
    + (pics.length ? `\n\nAttached pictures: ${pics.map((p, i) => `attachment:${i + 1} «${p.name}» (${p.w}×${p.h})`).join(', ')}.` : '');
  return [{ type: 'text', text: head }, ...pics.flatMap((p, i) => [{ type: 'text', text: `attachment:${i + 1}` }, { type: 'image_url', image_url: { url: p.url } }])];
}

// ---- The figures of a PDF (a paper, a report) ------------------------------------------------
// Found by their captions («Fig. 1.», «Figure 2:», «Figura 3»): the page is drawn and the figure is the
// block of ink right above its caption (up to a band of white — the text before it). Works for vector
// drawings and photos alike. → [{ kind: 'image', name: «Fig. 1 — caption», caption, url, full, w, h }]
const CAPTION = /^\s*(fig\.?|figure|figura|fig\u00ba|abb\.?|abbildung)\s*(\d+)\s*[.:—-]?/i;
export async function pdfFigures(file, { max = 8, pages = 30, scale = 2 } = {}) {
  const lib = await import(`${PDFJS}/pdf.min.mjs`); lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`;
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, out = [];
  for (let n = 1; n <= Math.min(pdf.numPages, pages) && out.length < max; n++) {
    const page = await pdf.getPage(n), vp = page.getViewport({ scale }), tc = await page.getTextContent();
    const items = tc.items.filter(it => it.str?.trim()).map(it => { const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      return { str: it.str, x, y, h: Math.abs(it.transform[3]) * scale, w: it.width * scale }; });
    // (A caption starts its line; «as Fig. 1 shows» inside a paragraph has text before it.)
    const caps = items.filter(it => CAPTION.test(it.str) && !items.some(o => o !== it && Math.abs(o.y - it.y) < it.h * 0.5 && o.x + o.w < it.x - 2));
    if (!caps.length) continue;
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    const px = g.getImageData(0, 0, c.width, c.height).data, W = c.width;
    const left = Math.max(0, Math.min(...items.map(i => i.x)) - 20), right = Math.min(W, Math.max(...items.map(i => i.x + i.w)) + 20);
    const inky = y => { for (let x = Math.round(left); x < right; x += 2) { const i = (y * W + x) * 4; if (px[i] < 235 || px[i + 1] < 235 || px[i + 2] < 235) return true; } return false; };
    for (const cap of caps) {
      if (out.length >= max) break;
      // (Up from the caption: past its own white margin, then the figure until 8 points of white.)
      // (The paragraph above ends the figure: its lines are wide; a figure's own labels are short.)
      const lines = new Map(); for (const i of items) { const k = Math.round(i.y / 3); const l = lines.get(k) || { y: i.y, h: i.h, x0: 1e9, x1: 0 }; l.x0 = Math.min(l.x0, i.x); l.x1 = Math.max(l.x1, i.x + i.w); lines.set(k, l); }
      // (A paragraph's last, short line: right under a wide one, at its usual spacing and margin.)
      const sorted = [...lines.values()].sort((p, q) => p.y - q.y);
      sorted.forEach((l, i) => { const p = sorted[i - 1]; l.para = l.x1 - l.x0 > (right - left) * 0.6 || (!!p?.para && l.y - p.y < p.h * 1.45 && Math.abs(l.x0 - p.x0) < 4 * scale); });
      const above = sorted.filter(l => l.para && l.y < cap.y - cap.h).map(l => l.y + l.h * 0.35);
      const limit = above.length ? Math.ceil(Math.max(...above)) : 0;
      let y = Math.round(cap.y - cap.h - 2); while (y > limit && !inky(y)) y--;
      // (Under a paragraph: everything between it and the caption, white gaps inside the figure included.
      // At the top of the page: up to a wide band of white — the page's margin or its header.)
      const bottom = y, gap = Math.round((above.length ? 1e4 : 24) * scale); let white = 0;
      for (; y > limit; y--) { if (inky(y)) white = 0; else if (++white >= gap) break; }
      let top = y + (y > limit ? white : 0); while (top < bottom && !inky(top)) top++;
      if (bottom - top < 40 * scale || bottom - top > c.height * 0.85) continue;            // (not a figure: too small, or the whole page)
      let x0 = right, x1 = left;                                                          // (its ink, left to right)
      for (let yy = top; yy <= bottom; yy += 2) for (let x = Math.round(left); x < right; x += 2) {
        const i = (yy * W + x) * 4; if (px[i] < 235 || px[i + 1] < 235 || px[i + 2] < 235) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      }
      const pad = 6 * scale, bx = Math.max(0, x0 - pad), by = Math.max(0, top - pad), bw = Math.min(W, x1 + pad) - bx, bh = Math.min(c.height, bottom + pad) - by;
      const f = document.createElement('canvas'); f.width = bw; f.height = bh; f.getContext('2d').drawImage(c, bx, by, bw, bh, 0, 0, bw, bh);
      // (Its caption: that line and the ones right under it.)
      const under = items.filter(i => i.y >= cap.y - 1 && i.y <= cap.y + cap.h * 3.2 && i.x >= left - 1).sort((a, b) => a.y - b.y || a.x - b.x);
      const caption = under.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      const src = f.toDataURL('image/png'), small = await downscale(src, { max: 1024, quality: 0.8, maxBytes: 280 * 1024 });
      out.push({ kind: 'image', name: caption.slice(0, 80) || `Fig. ${cap.str.match(CAPTION)?.[2] || out.length + 1}`, caption, url: small.url, full: src, w: bw, h: bh, figure: true });
    }
  }
  return out;
}
