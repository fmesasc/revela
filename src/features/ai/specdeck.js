// Slides from specs, with no editor open: what the public API and the MCP server (server/cloudflare/publicapi.js)
// make when Claude, ChatGPT or a script sends slides. The specs are the ones «Crear con IA» uses (SPEC_DOC: title,
// bullets, steps, chart, table, code…), laid out by the same code (slideFromSpec), so a deck made from outside looks
// like one made in the editor: a design from the gallery, its layouts, its colours. It runs in the Worker: nothing
// here may need a DOM (core/text.js plainText reads HTML without one).
//
// Also a deck's outline for an AI to read (its words, its slide ids, what each slide holds) and simple Markdown
// (reveal.js's: --- between slides, "Note:" for the notes) turned into specs.

import { slideFromSpec, rebuildSlide, DECK_DESIGNS, SPEC_DOC, KINDS } from './authoring.js';
import { pictureBox } from './fromspec.js';
import { buildFromGallery } from '../design/gallery.js';
import { ensureLayouts } from '../document/master.js';
import { plainText } from '../../core/text.js';
import { uid } from '../../core/model.js';

export { SPEC_DOC, KINDS };
export const DESIGNS = Object.keys(DECK_DESIGNS);
export const DESIGN_DOC = Object.entries(DECK_DESIGNS).map(([k, v]) => `${k} (${v})`).join('; ');
export const MAX_SLIDES = 60;

const str = v => (v == null ? '' : String(v));
const httpsURL = v => (/^https:\/\/[^\s"'<>]{4,2000}$/.test(str(v)) ? str(v) : '');

// A spec as it arrives from outside: an object with a known kind (else «bullets»), its picture only by https.
export function cleanSpec(sp) {
  if (!sp || typeof sp !== 'object' || Array.isArray(sp)) return null;
  const out = JSON.parse(JSON.stringify(sp, (k, v) => (typeof v === 'string' ? v.slice(0, 4000) : v)));
  if (!KINDS.includes(out.kind)) out.kind = 'bullets';
  const img = httpsURL(out.image_url);
  if (img) out.picture = { src: img, w: +out.image_width > 0 ? +out.image_width : 4, h: +out.image_height > 0 ? +out.image_height : 3, alt: str(out.image_alt).slice(0, 300), caption: str(out.image_credit).slice(0, 200) };
  delete out.image_url; delete out.image_width; delete out.image_height; delete out.image_alt; delete out.image_credit;
  if (out.picture) out.figureRatio = out.picture.w / out.picture.h;
  return out;
}

// Its picture (spec.picture: { src, w, h, alt, caption }) in the slide's picture box, the whole of it seen
// (as insertSpecs in the editor).
function placePicture(slide, sp, deck) {
  const f = sp.picture; if (!f?.src) return;
  const box = pictureBox(slide) || { x: Math.round(deck.size.w * 0.52), y: 170, w: Math.round(deck.size.w * 0.42), h: deck.size.h - 230 };
  const k = Math.min(box.w / f.w, box.h / f.h), w = Math.round(f.w * k), h = Math.round(f.h * k);
  slide.blocks = slide.blocks.filter(b => !(b.type === 'placeholder' && b.ph === 'picture'));
  slide.blocks.push({ id: uid(), type: 'image', src: f.src, alt: str(f.alt), fit: 'contain', rotation: 0, animation: null,
    x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y + (box.h - h) / 2), w, h, ...(f.caption && { caption: str(f.caption) }) });
}

// New slides for `deck` from specs, to go at index `at` (they take the look of the slides around there).
export function slidesFromSpecs(deck, specs, at = deck.slides.length) {
  ensureLayouts(deck);
  return specs.map(cleanSpec).filter(Boolean).slice(0, MAX_SLIDES).map(sp => {
    const s = slideFromSpec(sp, undefined, deck, { at });
    placePicture(s, sp, deck);
    return s;
  });
}

// A new deck: a design of the gallery (the name given or «minimal»), its own sample slides used only as the look to
// follow and then gone, and the slides of the specs.
export function deckFromSpecs({ name = '', design = '', slides = [] } = {}) {
  const deck = buildFromGallery(DESIGNS.includes(design) ? design : 'minimal');
  ensureLayouts(deck);
  if (str(name).trim()) deck.name = str(name).trim().slice(0, 200);
  const made = slidesFromSpecs(deck, slides, deck.slides.length);
  deck.slides = made.length ? made : [slideFromSpec({ kind: 'title', title: deck.name }, undefined, deck, { at: deck.slides.length })];
  return deck;
}

// A slide made again from a spec: its words and layout new, its pictures, charts, code and equations kept.
export function respecSlide(deck, slide, spec) {
  const sp = cleanSpec(spec); if (!sp) return;
  rebuildSlide(slide, sp, deck);
  placePicture(slide, sp, deck);
}

// ---- Reading a deck -------------------------------------------------------------------------------
const TEXT_TYPES = ['text', 'shape', 'placeholder'];
const words = b => (TEXT_TYPES.includes(b.type) && b.html ? plainText(b.html) : b.type === 'table' ? (b.rows || []).map(r => r.map(c => plainText(c?.html ?? c)).join(' | ')).join('\n')
  : b.type === 'code' ? str(b.code) : b.type === 'math' ? str(b.latex) : b.type === 'chart' ? (b.data || []).map(d => `${d.label}: ${d.value}`).join(', ') : b.alt ? str(b.alt) : '');
// What an AI needs to read and change a deck: each slide's id, its title, its words, what objects it has and its notes.
export function deckOutline(deck) {
  return {
    name: str(deck.name), slides: (deck.slides || []).map((s, i) => {
      const blocks = (s.blocks || []).filter(b => !b.decorative);
      const title = blocks.find(b => b.ph === 'title' || b.ph === 'ctrTitle');
      const texts = blocks.filter(b => b !== title).map(words).map(x => x.trim()).filter(Boolean);
      const kinds = [...new Set(blocks.filter(b => !TEXT_TYPES.includes(b.type)).map(b => b.type))];
      return { n: i + 1, id: s.id, title: title ? plainText(title.html) : '', text: texts, objects: kinds, ...(s.notes && { notes: plainText(s.notes) }), ...(s.hidden && { hidden: true }) };
    }),
  };
}
export const outlineText = o => [`# ${o.name}`, ...o.slides.map(s => [`\n## ${s.n}. ${s.title || '(sin título)'}  [id: ${s.id}]${s.hidden ? ' (oculta)' : ''}`,
  ...s.text.map(t => '- ' + t.replace(/\n/g, '\n  ')), s.objects.length ? `Objetos: ${s.objects.join(', ')}` : '', s.notes ? `Notas: ${s.notes}` : ''].filter(Boolean).join('\n'))].join('\n');

// ---- Markdown → specs -----------------------------------------------------------------------------
// reveal.js's conventions: --- (or --) between slides, the first heading is the title, lists are the bullets,
// ``` the code, ![alt](https://…) the picture, "Note:" the notes. A slide with only a heading: the cover
// (first) or a section.
export function markdownSpecs(md) {
  const text = str(md).replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');
  const chunks = []; let cur = [], fence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && /^--(-)?\s*$/.test(line)) { chunks.push(cur); cur = []; continue; }
    cur.push(line);
  }
  chunks.push(cur);
  const inline = s => s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
  return chunks.filter(c => c.some(l => l.trim())).slice(0, MAX_SLIDES).map((lines, idx) => {
    let notes = '';
    const ni = lines.findIndex(l => /^\s*(Note|Notes|Notas?):/i.test(l));
    if (ni >= 0) { notes = lines.slice(ni).join('\n').replace(/^\s*(Note|Notes|Notas?):\s*/i, '').trim(); lines = lines.slice(0, ni); }
    let title = '', sub = '', code = null, image = null; const bullets = [], paras = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], f = /^\s*(```|~~~)\s*([\w+-]*)/.exec(l);
      if (f) { const end = lines.findIndex((x, j) => j > i && /^\s*(```|~~~)/.test(x)); code = { language: f[2] || 'plaintext', code: lines.slice(i + 1, end < 0 ? lines.length : end).join('\n') }; i = end < 0 ? lines.length : end; continue; }
      const im = /^\s*!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)\s*$/.exec(l);
      if (im) { image = { alt: im[1], src: im[2] }; continue; }
      const h = /^\s*#{1,6}\s+(.*)$/.exec(l);
      if (h) { if (!title) title = inline(h[1]); else if (!sub) sub = inline(h[1]); else bullets.push(inline(h[1])); continue; }
      const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
      if (li) { const t = inline(li[3]); if (li[1].length >= 2 && Array.isArray(bullets[bullets.length - 1])) bullets[bullets.length - 1].push(t); else if (li[1].length >= 2) bullets.push([t]); else bullets.push(t); continue; }
      if (l.trim()) paras.push(inline(l));
    }
    const base = { title, ...(notes && { notes }) };
    if (code) return { ...base, kind: 'code', code, ...(bullets.length && { bullets }) };
    if (image) return { ...base, kind: 'image', bullets: [...paras, ...bullets].slice(0, 6), image_url: image.src, image_alt: image.alt };
    if (!bullets.length && !paras.length) return { ...base, kind: idx === 0 ? 'title' : 'section', ...(sub && { subtitle: sub }) };
    if (!bullets.length && paras.length === 1 && !sub) return idx === 0 ? { ...base, kind: 'title', subtitle: paras[0] } : { ...base, kind: 'key_idea', statement: paras[0] };
    return { ...base, kind: 'bullets', bullets: [...(sub ? [sub] : []), ...paras, ...bullets] };
  });
}
