// Pasting what another program copied — PowerPoint, Word, Excel, a web page, an image editor — onto the slide.
//
// What comes, in this order: Revela's own objects (copied in this or another tab: clipboard.js); cells (text with
// tabs: Excel, Sheets, a Word table) → a table; a picture (PowerPoint and Keynote put a picture of what was copied,
// image editors and screenshots too) → a picture; text with its formatting (HTML: bold, italics, underlining, colour,
// lists, paragraphs — not fonts or sizes, which are the theme's) → a text box; plain text → a text box.
//
// From three places: the paste event (Ctrl+V); Inicio ▸ Pegar and the context menu, which read the system clipboard
// themselves (navigator.clipboard.read — the browser may ask once —, in the desktop app the window's own clipboard
// commands); and Ctrl+V in the desktop app when its web view sends no paste event outside a text (WebKitGTK).
// Francisco: «cuando copio de un PowerPoint o de un programa de fuera no me deja pegar en Revela».

import { state } from '../../core/store.js';
import * as clip from './clipboard.js';
import { addImage, addTableFromText, addText } from './blocks.js';
import { cleanHTML } from './sanitize.js';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plainHTML = text => text.trim().split(/\r?\n/).map(esc).join('<br>');

// ---- Formatted text from another program, as a text box's HTML ---------------------------------------------
const KEEP = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', DEL: 's', SUB: 'sub', SUP: 'sup', UL: 'ul', OL: 'ol', LI: 'li', A: 'a' };
const BLOCK = /^(P|DIV|H[1-6]|TR|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|FOOTER)$/;
const DROP = /^(STYLE|SCRIPT|HEAD|TITLE|META|LINK|XML|O:P|svg|IMG|TEMPLATE|NOSCRIPT)$/i;
export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const out = [];
  const walk = (node, inherited) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { const t = n.data.replace(/[\r\n\t ]+/g, ' '); if (t) out.push(esc(t)); continue; }
      if (n.nodeType !== 1 || DROP.test(n.tagName)) continue;
      const tag = n.tagName.toUpperCase();
      if (tag === 'BR') { out.push('<br>'); continue; }
      const st = n.getAttribute('style') || '', open = [], close = [];
      const wrap = (o, c) => { open.push(o); close.unshift(c); };
      if (KEEP[tag] === 'a') { const h = n.getAttribute('href') || ''; if (/^(https?:|mailto:)/i.test(h)) wrap(`<a href="${esc(h)}">`, '</a>'); }
      else if (KEEP[tag]) wrap(`<${KEEP[tag]}>`, `</${KEEP[tag]}>`);
      // (Inline styles, as Office and web pages write them: bold, italics, underlining and colour.)
      if (/font-weight:\s*(bold|[6-9]00)/i.test(st) && KEEP[tag] !== 'b') wrap('<b>', '</b>');
      if (/font-style:\s*italic/i.test(st) && KEEP[tag] !== 'i') wrap('<i>', '</i>');
      if (/text-decoration[^;]*underline/i.test(st) && KEEP[tag] !== 'u') wrap('<u>', '</u>');
      const col = /(?:^|;)\s*color:\s*([^;"]+)/i.exec(st)?.[1]?.trim() || (tag === 'FONT' && n.getAttribute('color')) || '';
      if (col && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(col) && col !== inherited) wrap(`<span style="color:${col}">`, '</span>');
      const block = BLOCK.test(tag) || tag === 'TD' || tag === 'TH';
      if (block && out.length && out.at(-1) !== '<br>' && !/^<\/?(ul|ol|li)/.test(out.at(-1))) out.push(tag === 'TD' || tag === 'TH' ? ' ' : '<br>');
      out.push(...open); walk(n, col || inherited); out.push(...close);
    }
  };
  walk(doc.body || doc.documentElement, '');
  let s = out.join('').replace(/(<br>\s*){3,}/g, '<br><br>').replace(/^(\s|<br>)+|(\s|<br>)+$/g, '');
  return cleanHTML(s);
}
const hasText = html => !!new DOMParser().parseFromString(String(html || ''), 'text/html').body?.textContent.trim();

// ---- What was copied, onto the slide → whether anything was pasted -------------------------------------------------
// { files: [File], html, text }
export async function pasteData({ files = [], html = '', text = '' } = {}) {
  const own = clip.fromSystemText(text);
  if (own) { clip.paste(!clip.isCurrent(own) ? own : undefined); return true; }
  if (text && text.includes('\t') && text.trim()) { addTableFromText(text); return true; }
  const img = files.find(f => f && /^image\//.test(f.type));
  if (img) { addImage(await dataURLOf(img)); return true; }
  if (html && hasText(html)) { const h = htmlToText(html); if (h) { addText(h); return true; } }
  if (text && text.trim()) { addText(plainHTML(text)); return true; }
  return false;
}
const dataURLOf = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });

// The paste event's clipboard (Ctrl+V), as pasteData takes it. (Files also from its items: some systems give a copied
// picture only there.)
export function fromEvent(cd) {
  const files = [...(cd.files || [])];
  if (!files.length) for (const it of cd.items || []) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
  return { files, html: cd.getData('text/html') || '', text: cd.getData('text/plain') || '' };
}

// ---- The system clipboard read by Revela itself (Pegar, the context menu, the desktop app's Ctrl+V) -------------
// → { files, html, text }, or null if it can't be read here.
export async function readSystemClipboard() {
  const tauri = globalThis.__TAURI__?.core;
  if (navigator.clipboard?.read && !tauri) {
    try {
      const items = await navigator.clipboard.read(), out = { files: [], html: '', text: '' };
      for (const it of items) for (const type of it.types) {
        const blob = await it.getType(type);
        if (type.startsWith('image/')) out.files.push(new File([blob], 'pegado.' + (type.split('/')[1] || 'png'), { type }));
        else if (type === 'text/html') out.html ||= await blob.text();
        else if (type === 'text/plain') out.text ||= await blob.text();
      }
      return out;
    } catch {}
  }
  if (tauri) return desktopClipboard(tauri);
  try { return { files: [], html: '', text: await navigator.clipboard.readText() }; } catch { return null; }
}
// The desktop app: its clipboard plugin (text and pictures; desktop/src-tauri). A picture comes as pixels (RGBA): made
// a PNG here.
async function desktopClipboard(core) {
  const out = { files: [], html: '', text: '' };
  try { out.text = await core.invoke('plugin:clipboard-manager|read_text') || ''; } catch {}
  if (!out.text) {
    try {
      const rid = await core.invoke('plugin:clipboard-manager|read_image');
      try {
        const { width, height } = await core.invoke('plugin:image|size', { rid });
        const px = new Uint8ClampedArray(await core.invoke('plugin:image|rgba', { rid }));
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        c.getContext('2d').putImageData(new ImageData(px, width, height), 0, 0);
        const png = await new Promise(ok => c.toBlob(ok, 'image/png'));
        if (png) out.files.push(new File([png], 'pegado.png', { type: 'image/png' }));
      } finally { core.invoke('plugin:resources|close', { rid }).catch(() => {}); }
    } catch {}
  }
  return out;
}

// Inicio ▸ Pegar and the context menu: slides copied in the panel there; else the system clipboard (what was copied
// last, here or in another program); else what was copied in Revela. → whether anything was pasted.
export async function pasteAnything() {
  const sys = await readSystemClipboard();
  if (sys && (sys.files.length || sys.html || sys.text) && await pasteData(sys)) return true;
  if (clip.hasClipboard()) { clip.paste(); return true; }
  return false;
}
// Whether Revela can look at the system clipboard by itself (else only Ctrl+V reaches it).
export const canReadClipboard = () => !!(globalThis.__TAURI__?.core || navigator.clipboard?.read || navigator.clipboard?.readText);
// Where pasting goes now: the slide (not while typing in a text, a field or a dialog).
export const pastingOnSlide = () => {
  const a = document.activeElement;
  return !(a?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a?.tagName || '') || document.querySelector('.modal-backdrop') || state.ui.navFocus);
};
