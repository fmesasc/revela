// Files given to the AI along with a request (the assistant, the theme editor): pictures — a photo of a
// whiteboard or of notes, a logo, a chart, a document's page — and documents (PDF, text, CSV, Markdown).
// Pictures go to the model made small (vision.js) and are kept at slide size too, so the assistant can
// put them on a slide ("attachment:N"); documents go as their text. A scanned PDF (no text in it) goes
// as pictures of its first pages.

import { downscale } from './vision.js';
import { readDocument } from './authoring.js';
import { openPdf, pageImage } from '../content/files.js';
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
