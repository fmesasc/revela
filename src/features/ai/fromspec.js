// Slides from a spec (features/ai/authoring.js SPEC_DOC) that look like one
// more slide of the deck: the deck's layout for that kind of slide, its
// placeholders filled in without their own font, size or colour (they follow
// the master), the background, decorations (glows, bands, rules, background
// pictures) and transition of the nearest slide like it, and the rest of the
// content (numbers, timeline, chart, table) laid out in the layout's body area
// with the palette's colours and the master's fonts.
// And a style for what is new, picked in the assistant: like the rest, more
// visual, minimal, animated, or a surprise (seeded, so a preview and what is
// applied match).

import { uid } from '../../core/model.js';
import { esc, plain } from './openrouter.js';
import { currentPalette, deckFg, pairStacks, styleColour, styleFont } from '../design/palettes.js';
import { ensureMaster, masterStyles, masterOf, newSlideBlocks, styleKind, styled } from '../document/master.js';
import { designIdeas, applyIdeaTo } from '../design/designer.js';
import { normalizeAnim } from '../animation/transitions.js';
import { ICON_NAMES } from '../../render/svg.js';
import { richHTML, inline, inlineHTML } from './richtext.js';
import { prepareSpec, RICH } from './specs.js';
import { codeBlockAt, mathBlockAt, codeFontSize, codeHeight } from './codeobj.js';

export const STYLES = ['same', 'visual', 'minimal', 'animated', 'surprise'];
export const hasLayouts = deck => Array.isArray(deck?.layouts) && deck.layouts.length > 0;
const str = v => (v == null ? '' : String(v));
const list = (items, accent = '') => richHTML((items || []).filter(Boolean), { accent });
const R = v => Math.round(v);

// ---- A seeded random (sfc32 over a string hash) -----------------------------------
export function rng(seed = '') {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  const next = () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
  let a = next(), b = next(), c = next(), d = next();
  return () => { a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

// ---- Colours ----------------------------------------------------------------------
const rgbOf = c => { const m = /#([0-9a-f]{6})/i.exec(str(c)) || /#([0-9a-f]{3})\b/i.exec(str(c)); if (!m) return null;
  const hx = m[1].length === 3 ? m[1].replace(/./g, x => x + x) : m[1], n = parseInt(hx, 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const x = rgbOf(a), y = rgbOf(b); if (!x || !y) return 21; const p = lum(x), q = lum(y); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
const sat = c => { const x = rgbOf(c); if (!x) return 0; const mx = Math.max(...x), mn = Math.min(...x); return mx ? (mx - mn) / mx : 0; };
const inkOn = c => { const x = rgbOf(c); return x && lum(x) > 0.36 ? '#111111' : '#ffffff'; };
const hex2 = c => { const x = rgbOf(c); return x ? '#' + x.map(v => v.toString(16).padStart(2, '0')).join('') : '#888888'; };

// ---- Boxes ------------------------------------------------------------------------
const boxOf = b => ({ x: b.x, y: b.y, w: b.w, h: b.h });
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const overlapAll = (b, rects) => rects.reduce((s, r) => s + overlap(b, r), 0);
const areaOf = rects => rects.reduce((s, r) => s + r.w * r.h, 0) || 1;

// ---- Which layout, which slide to follow --------------------------------------------
const WANT = { title: 'title', closing: 'title', section: 'section', quote: 'section', bullets: 'titleContent', two_columns: 'twoContent', image: 'twoContent',
  chart: 'titleOnly', table: 'titleOnly', code: 'titleOnly', math: 'titleOnly', diagram: 'titleOnly', exercise: 'twoContent', ...Object.fromEntries(RICH.map(k => [k, 'titleOnly'])) };
const FALLBACK = { title: ['section', 'titleOnly', 'titleContent'], section: ['title', 'titleOnly', 'titleContent'], titleContent: ['twoContent', 'titleOnly'],
  twoContent: ['titleContent', 'titleOnly'], titleOnly: ['titleContent', 'twoContent'] };
const sig = l => { const k = l.blocks.filter(b => b.ph).map(b => styleKind(b) || b.ph); const n = x => k.filter(y => y === x).length;
  return { t: n('title'), s: n('subtitle'), b: n('body'), o: k.length - n('title') - n('subtitle') - n('body') }; };
const FITS = { title: s => s.t === 1 && s.s >= 1 && !s.b, section: s => s.t === 1 && s.s >= 1 && !s.b, titleContent: s => s.t === 1 && s.b === 1,
  twoContent: s => s.t === 1 && s.b === 2, titleOnly: s => s.t === 1 && !s.b && !s.s && !s.o };
const NAMED = { title: /title slide|portada|^t[ií]tulo$|diapositiva de t[ií]tulo/i, section: /secci|section/i, closing: /cierre|closing|\bend\b|final|gracias|thank/i };
function findLayout(pool, want) {
  const byId = pool.find(l => l.id === want); if (byId) return byId;
  const fits = pool.filter(l => FITS[want]?.(sig(l)));
  return fits.find(l => NAMED[want]?.test(l.name || '')) || fits[0] || null;
}
export function layoutFor(kind, deck, master = null, hasSide = false) {
  const pool0 = deck.layouts.filter(l => !master || masterOf(l, deck) === master), pool = pool0.length ? pool0 : deck.layouts;
  if (kind === 'closing') { const c = pool.find(l => NAMED.closing.test(l.name || '') && l.blocks.some(b => b.ph === 'title')); if (c) return c; }
  const want = kind === 'chart' && hasSide ? 'twoContent' : WANT[kind] || 'titleContent';
  for (const w of [want, ...(FALLBACK[want] || [])]) { const l = findLayout(pool, w); if (l) return l; }
  return pool.find(l => l.blocks.some(b => b.ph === 'title')) || pool[0];
}
const COVER = ['title', 'closing', 'section', 'quote'];

// The colours the master gives texts, and the slide's colour behind them.
function textColours(deck, master) {
  const st = masterStyles(deck, master), fg = styleColour(st.body.color, deck) || deckFg(deck);
  return { title: styleColour(st.title.color, deck) || fg, body: fg };
}
const fullBox = (b, W, H) => b.x <= 2 && b.y <= 2 && b.x + b.w >= W - 2 && b.y + b.h >= H - 2;
export function backColour(s, deck) {
  const { w: W, h: H } = deck.size;
  const cover = [...s.blocks].reverse().find(b => b.type === 'shape' && !b.ph && fullBox(b, W, H) && rgbOf(b.fill) && (b.opacity ?? 100) >= 60);
  return cover ? hex2(cover.fill) : str(s.background || deck.background || currentPalette(deck).bg);
}
const readable = (bg, tc) => contrast(bg, tc.title) >= 2.4 && contrast(bg, tc.body) >= 3.5;

// The slide to take the background, decorations and transition from: the
// nearest one with the same layout, else the nearest like it; one whose
// background lets the master's text colours be read.
export function referenceSlide(deck, lay, kind, at, self = null) {
  const tc = textColours(deck, masterOf(lay, deck)), last = deck.slides.length - 1;
  let best = null, bestScore = Infinity;
  deck.slides.forEach((s, i) => {
    const dist = s === self ? 0 : self ? Math.abs(i - at) : i < at ? at - 1 - i : i - at + 0.5;
    let score = dist + (s.layoutId === lay.id ? 0 : 100) + (readable(backColour(s, deck), tc) ? 0 : 1000) + (s.hidden ? 20 : 0);
    const cover = i === 0 || i === last || ['title', 'section'].includes(s.layoutId);
    if (!COVER.includes(kind) && cover) score += 60;
    // (A slide on a colour given only for its kind — a key idea on a tint, a section on the accent: accentBack — is not
    // the look of the rest.)
    if (s.accentBack && s.accentBack !== kind) score += 50;
    if (kind === 'title' && i === 0) score -= 40;
    if (kind === 'closing' && i === last) score -= 40;
    if (score < bestScore) { bestScore = score; best = s; }
  });
  return best;
}

// The objects of a slide that are decoration, not content: glows, rules and
// bands, shapes in the margins, background pictures — none over the new
// slide's content area (rects). Copies, with new ids and no animation.
export function decorationsOf(ref, deck, rects) {
  if (!ref) return [];
  const { w: W, h: H } = deck.size, out = [], total = areaOf(rects);
  let backdrop = false;
  for (const b of ref.blocks) {
    // (Nor the cards, rules and dots of a composition: they are that slide's content.)
    if (b.ph || b.hidden || b.type === 'connector' || b.type === 'placeholder' || b.fromSpec) continue;
    const full = fullBox(b, W, H), hit = overlapAll(b, rects), own = (b.w * b.h) || 1;
    const edge = b.x <= 1 || b.y <= 1 || b.x + b.w >= W - 1 || b.y + b.h >= H - 1;
    const thin = Math.min(b.w, b.h) <= 12, long = b.w >= W * 0.9 || b.h >= H * 0.9;
    let ok = false;
    if (b.type === 'shape' && !plain(b.html || '')) {
      ok = isGlow(b, W) || (thin && (long || !hit)) || (full && (backdrop || (b.opacity ?? 100) < 100))
        || (!full && edge && hit < total * 0.08 && hit < own * 0.25) || !hit;
    } else if (b.type === 'image') {
      ok = full ? (backdrop = true) : !!b.decorative && (hit < total * 0.1 || (b.opacity ?? 100) <= 70);
    } else if (b.type === 'icon' || b.type === 'text') ok = !!b.decorative && !hit;
    if (!ok) continue;
    const c = structuredClone(b);
    Object.assign(c, { id: uid(), animation: null, decorative: true });
    for (const k of ['anims', 'groupId', 'link', 'trigger', 'lp', 'morphId']) delete c[k];
    out.push(c);
  }
  return out;
}

// Glows, long thin rules and bands along an edge: what makes a deck's look, wherever they are taken from.
const isGlow = (b, W) => b.gradType === 'radial' && !(b.strokeWidth > 0) && Math.max(b.w, b.h) >= W * 0.25 && ((b.opacity ?? 100) < 100 || !!b.fill2);
const isMotif = (b, W, H) => isGlow(b, W) || (Math.min(b.w, b.h) <= 12 && (b.w >= W * 0.9 || b.h >= H * 0.9))
  || ((b.w >= W * 0.8 && (b.y <= 1 || b.y + b.h >= H - 1)) || (b.h >= H * 0.8 && (b.x <= 1 || b.x + b.w >= W - 1)));

// ---- Text that has to fit: an estimate (the master's size, shrunk with `fit`) ------
// Lines a text takes, measured with the font itself (a canvas's measureText) where there is a page: the estimate by an
// average letter came out short for wide bold fonts (Poppins, Montserrat) — a big statement ran over the text under
// it, a long cover title over its rule. (Not loaded yet, the browser measures a fallback face, usually wider: safe.)
let measureCtx = null;
function measuredHeight(html, fs, w, lh, family = '', bold = false) {
  if (typeof document === 'undefined') return null;
  try { measureCtx ||= document.createElement('canvas').getContext('2d'); } catch { return null; }
  if (!measureCtx) return null;
  measureCtx.font = `${bold ? '700 ' : ''}${fs}px ${family || 'sans-serif'}`;
  // (A web font not loaded yet is measured in the browser's fallback — for a serif, Times, much narrower than
  // Merriweather: a key idea ran over the line under it. Then with a margin.)
  let loose = 1; try { if (family && document.fonts && !document.fonts.check(measureCtx.font)) loose = 1.15; } catch {}
  const room = Math.max(fs * 3, w - 28) / loose, space = measureCtx.measureText(' ').width;
  const paras = str(html).replace(/<\/(li|p|div)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&[#\w]+;/g, 'x').split('\n').map(s => s.trim()).filter(Boolean);
  let lines = 0;
  for (const p of paras) {
    let x = 0, n = 1;
    for (const word of p.split(/\s+/)) { const ww = measureCtx.measureText(word).width * 1.04; if (x && x + space + ww > room) { n++; x = ww; } else x += (x ? space : 0) + ww; }
    lines += n;
  }
  return lines * fs * lh + 20;
}
// cw: a letter's average width in em — 0.54 for running text; a bold heading's is wider (0.62): measured as text it
// came out taller than thought, and a big statement ran over the line under it.
function needHeight(html, fs, w, lh, cw = 0.54) {
  const isList = /<li/i.test(html);
  const paras = str(html).replace(/<\/(li|p|div)>|<br\s*\/?>|<(ul|ol)\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&[#\w]+;/g, 'x')
    .split('\n').map(s => s.trim()).filter(Boolean);
  const perLine = Math.max(4, Math.floor((w - 28 - (isList ? fs * 1.3 : 0)) / (fs * cw)));
  // (Paragraphs and lists at the top keep 1em above and below them, shared between neighbours.)
  let depth = 0, blocks = 0;
  for (const [, close, tag] of str(html).matchAll(/<(\/?)(ul|ol|p)\b/gi)) {
    if (tag.toLowerCase() === 'p') { if (!close && !depth) blocks++; continue; }
    if (close) depth = Math.max(0, depth - 1); else if (!depth++) blocks++;
  }
  return paras.reduce((h, p) => h + Math.ceil(p.length / perLine) * fs * lh + (isList ? fs * 0.3 : 0), 0) + (blocks ? (blocks + 1) * fs : 0) + 20;
}
// The factor (≤ 1, or `want` when it fits) for a placeholder's text in its box.
function fitPlaceholder(b, slide, deck, want = 1) {
  const sb = styled({ ...b, fit: undefined }, slide, deck), fs = sb.fontSize || 40, lh = styleKind(b) === 'body' ? 1.32 : 1.18;
  // (A title or subtitle: measured with its own font — a long cover title wrapped to a third line past its box.)
  if (styleKind(b) !== 'body' && !(b.columns > 1)) {
    const bold = sb.fontWeight === '700' || sb.fontWeight === 'bold' || styleKind(b) === 'title';
    if (measuredHeight(b.html, fs, b.w, lh, sb.fontFamily, bold) != null) {
      let f = want; while (f > 0.45 && measuredHeight(b.html, fs * f, b.w, lh, sb.fontFamily, bold) > b.h) f -= 0.05;
      f = Math.round(f * 100) / 100; if (f !== 1) b.fit = f; else delete b.fit; return;
    }
  }
  // (In columns: each as wide as a column, the text shared between them.)
  const c = b.columns > 1 ? b.columns : 1, w = (b.w - 32 * (c - 1)) / c, need = f => needHeight(b.html, fs * f, w, lh) / c + (c > 1 ? fs * f : 0);
  let f = want;
  while (f > 0.45 && need(f) > b.h) f -= 0.05;
  f = Math.round(f * 100) / 100;
  if (f !== 1) b.fit = f; else delete b.fit;
}
// A body placeholder whose text the AI rewrote: its size made to fit again, and
// in two columns when that lets it be read much bigger.
export function fitBody(b, slide, deck) {
  if (!b?.ph || b.type !== 'text' || styleKind(b) !== 'body') return;
  fitPlaceholder(b, slide, deck);
  if ((b.fit ?? 1) >= 0.8 || b.columns > 1 || b.w < 700) return;
  const one = b.fit ?? 1; b.columns = 2; fitPlaceholder(b, slide, deck);
  if ((b.fit ?? 1) < one + 0.1) { delete b.columns; fitPlaceholder(b, slide, deck); }
}
// The height a free text needs: a sentence (no list, no paragraphs) measured with its font when it is known — by the
// average letter, the cards of steps came out a line short and their last line ran out of the card (in 8 of 12 decks).
function textHeight(html, fs, w, lh, cw = 0.54, family = '') {
  const plain = family && !/<(li|p|ul|ol|div|br)\b/i.test(html);
  return (plain && measuredHeight(html, fs, w, lh, family, cw >= 0.6 || /^\s*<b>/i.test(html))) || needHeight(html, fs, w, lh, cw);
}
// A free text: the size that fits.
// (Never under 18 px — what still reads on a projected slide from the back; text that doesn't fit at 18 goes to more
// rows or columns where it is laid out, not smaller.)
function fitSize(html, size, w, h, lh = 1.25, min = 18, cw = 0.54, family = '') {
  min = Math.max(18, min);
  let fs = size; while (fs > min && textHeight(html, fs, w, lh, cw, family) > h) fs = Math.max(min, fs - 2);
  return fs;
}

// ---- The look of the deck ----------------------------------------------------------
function lookOf(deck, slide, bg) {
  const m = masterOf(slide, deck), st = masterStyles(deck, m), pal = currentPalette(deck), pair = pairStacks(deck.fontPair);
  const tc = textColours(deck, m), ok = readable(bg, tc);
  const fg = ok ? tc.body : inkOn(bg), title = ok ? tc.title : fg;
  const good = c => sat(c) > 0.25 && contrast(c, bg) >= 2.2 && Math.max(...rgbOf(c)) > 100;
  // The accent: the title's colour if it is one, else the colour the deck's slides use most, else the palette's.
  const used = deckColours(deck).filter(good);
  const accent = [...used.slice(0, 1), title, ...used, ...pal.accents].find(good) || pal.accents.find(c => contrast(c, bg) >= 1.6) || pal.accents[0];
  // (A second one only if the slides use it: a palette colour the deck never shows would clash.)
  const accent2 = used.find(c => c.toLowerCase() !== accent.toLowerCase()) || accent;
  // (Several, for cards and steps, only when the slides show them: like the templates, one colour per item.)
  const accents = [...new Set([accent, ...used].map(c => c.toLowerCase()))].slice(0, 4);
  return { fg, title, accent, accent2, accents, bg, ok, pal, head: styleFont(st.title.font, deck) || pair?.heading || deck.bodyFont || '',
    body: styleFont(st.body.font, deck) || pair?.body || deck.bodyFont || '', bodySize: st.body.size || 30, titleSize: st.title.size || 48 };
}
// The colours the slides' objects use (fills, texts, charts, tables), most used first.
function deckColours(deck) {
  const n = new Map(), add = c => { if (rgbOf(c) && sat(c) > 0.35) { const k = hex2(c); n.set(k, (n.get(k) || 0) + 1); } };
  for (const s of deck.slides) for (const b of s.blocks) {
    if (fullBox(b, deck.size.w, deck.size.h)) continue;
    for (const k of ['fill', 'color', 'bg', 'headBg', 'borderColor']) if (typeof b[k] === 'string') add(b[k]);
    for (const m of String(b.html || '').matchAll(/color:\s*(#[0-9a-f]{3,6})\b/gi)) add(m[1]);
  }
  return [...n.entries()].filter(e => e[1] >= 2).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
const X = (x, y, w, h, html, props = {}) => ({ id: uid(), type: 'text', x: R(x), y: R(y), w: R(w), h: R(h), rotation: 0, animation: null, html, ...props });
const S = (shape, x, y, w, h, fill, props = {}) => ({ id: uid(), type: 'shape', shape, x: R(x), y: R(y), w: R(w), h: R(h), fill, stroke: fill, strokeWidth: 0, rotation: 0, animation: null, ...props });

// An icon that fits the slide: the spec's own, else one by its words or kind.
const WORDS = [[/conclus|summary|resumen|recap|takeaway|claves/i, 'circle-check'], [/gracias|thank|merci|danke|grazie/i, 'heart'], [/objetiv|goal|meta\b|target/i, 'target'],
  [/equipo|team|personas|people/i, 'users'], [/idea|innova/i, 'lightbulb'], [/dato|cifra|number|data|estad/i, 'chart-column'], [/crec|growth|aument/i, 'trending-up'],
  [/tiempo|historia|history|cronolog|time|fechas|calendar/i, 'calendar'], [/riesg|risk|segur|security/i, 'shield-check'], [/dinero|coste|cost|precio|price|financ|budget|presupuesto/i, 'piggy-bank'],
  [/futuro|future|próximos|next|siguientes/i, 'rocket'], [/ahorr|saving|eficien|efficien/i, 'piggy-bank'], [/energ|electric|power|solar/i, 'bolt'],
  [/emisi|emission|carbon|co2|contamin|pollut/i, 'leaf'], [/precio|price|tarifa|pago|payment/i, 'wallet'], [/empleo|trabaj|job|work|emplead/i, 'briefcase'],
  [/salud|health/i, 'heart-pulse'], [/rápid|fast|veloc|speed|tiempo real|real time/i, 'timer'], [/calidad|quality|premio|award/i, 'award'], [/cliente|customer|usuari|user/i, 'users'],
  [/datos|data|análisis|analysis|medir|measure/i, 'chart-line'], [/comunic|mensaje|message|contact/i, 'message-circle'], [/seguridad|privac|protec/i, 'lock'],
  [/escala|scale|crecer|grow/i, 'trending-up'], [/ciudad|city|urban/i, 'building-2'], [/agua|water|riego/i, 'droplet'], [/independ|libertad|freedom|autonom/i, 'key'], [/pregunta|question|dudas/i, 'circle-help'], [/aprend|learn|educa|clase|lesson/i, 'graduation-cap'],
  [/salud|health|médic/i, 'heart-pulse'], [/natura|medio ambiente|environment|sostenib|sustain|clima/i, 'leaf'], [/mundo|global|world|internacional/i, 'globe']];
const BY_KIND = { title: 'sparkles', closing: 'flag', section: 'bookmark', bullets: 'lightbulb', two_columns: 'scale', stats: 'trending-up', timeline: 'calendar',
  chart: 'chart-column', table: 'clipboard-list', quote: 'quote', image: 'camera', comparison: 'scale', key_idea: 'lightbulb', steps: 'target', features: 'sparkles', agenda: 'clipboard-list' };
export function iconFor(spec, kind) {
  if (ICON_NAMES.includes(spec.icon)) return spec.icon;
  const words = [spec.title, spec.subtitle, spec.quote].filter(Boolean).join(' ');
  return WORDS.find(([re]) => re.test(words))?.[1] || BY_KIND[kind] || 'sparkles';
}

// ---- Building --------------------------------------------------------------------
// opts: { at (where it goes: the index it will have), self (the slide it replaces), style, seed }
export function styledSlide(spec, deck, { at = deck.slides.length, self = null, style = 'same', seed = '' } = {}) {
  spec = prepareSpec(spec);
  const KINDS = Object.keys(WANT);
  const kind = KINDS.includes(spec.kind) ? spec.kind : 'bullets', { w: W, h: H } = deck.size;
  const near = self || deck.slides[at - 1] || deck.slides[at] || null;
  const master = near ? masterOf(near, deck) : ensureMaster(deck);
  const lay = layoutFor(kind, deck, master, kind === 'chart' && (spec.bullets || []).filter(Boolean).length > 0);
  const ref = referenceSlide(deck, lay, kind, at, self);
  // (A reference on a colour only for its kind — accentBack —: the plain background; this slide's kind may give it its own.)
  const plainRef = !ref || ref.accentBack;
  const slide = { id: uid(), sectionId: null, layoutId: lay.id, background: (!plainRef && ref.background) || currentPalette(deck).bg, transition: ref ? ref.transition ?? null : null,
    hidden: false, autoSlide: 0, notes: str(spec.notes), blocks: [] };
  if (ref?.hideMaster) slide.hideMaster = true;
  const bg = !plainRef ? backColour(ref, deck) : currentPalette(deck).bg;
  const look = lookOf(deck, slide, bg), minimal = style === 'minimal';
  // The layout's placeholders; minimal: more air around them.
  const ph = newSlideBlocks(lay);
  const title = ph.find(b => styleKind(b) === 'title'), subs = ph.filter(b => styleKind(b) === 'subtitle'), bodies = ph.filter(b => styleKind(b) === 'body');
  if (minimal) for (const b of ph) { const d = Math.min(56, b.w * 0.06); b.x = R(b.x + d); b.w = R(b.w - 2 * d); if (styleKind(b) === 'body') { b.y += 16; b.h -= 16; } }
  const tb = title ? boxOf(title) : { x: 90, y: 50, w: W - 180, h: 100 };
  // The content area under the title (the body's box, or the free space).
  const free = { x: tb.x, y: tb.y + tb.h + 24, w: tb.w, h: H - (tb.y + tb.h + 24) - 56 };
  const content = [tb, ...subs.map(boxOf), ...(bodies.length ? bodies.map(boxOf) : COVER.includes(kind) ? [] : [free])];
  let decor = decorationsOf(ref, deck, content);
  // (A reference without decoration: the deck's motifs — glows, long rules, bands — from the nearest slide on the same background.)
  if (!decor.length && ref) {
    const same = deck.slides.map((s, i) => [s, Math.abs(i - at)]).filter(([s]) => s !== ref && s !== self && backColour(s, deck) === bg).sort((a, b) => a[1] - b[1]);
    for (const [s] of same) { decor = decorationsOf(s, deck, content).filter(d => d.type === 'shape' && isMotif(d, W, H)); if (decor.length) break; }
  }
  // (Bands at the top or bottom of the slide limit the free space.)
  for (const d of decor) if (d.w >= W * 0.8 && !fullBox(d, W, H)) {
    if (d.y + d.h >= H - 2 && d.y > free.y) free.h = Math.min(free.h, d.y - 20 - free.y);
    if (d.y <= 2 && d.y + d.h > free.y && d.y + d.h < free.y + free.h / 2) { const e = d.y + d.h + 16 - free.y; free.y += e; free.h -= e; }
  }
  if (minimal) { free.x += 40; free.w -= 80; free.y += 10; free.h -= 20; }
  const set = (b, html) => { if (b) b.html = html; };
  const extra = [], drop = new Set();
  const area = bodies[0] ? boxOf(bodies[0]) : { ...free };
  set(title, inlineHTML(spec.title));
  switch (kind) {
    case 'title': case 'closing': case 'section':
      if (spec.subtitle) set(subs[0], inlineHTML(spec.subtitle));
      break;
    case 'quote':
      set(title, `<i>“${inlineHTML(spec.quote || spec.title)}”</i>`);
      if (spec.author) set(subs[0], '— ' + inlineHTML(spec.author));
      break;
    case 'bullets':
      set(bodies[0], list(spec.bullets, minimal ? '' : look.accent));
      // (A long list of short items: in two columns.)
      if (spec.columns === 2 && bodies[0] && bodies[0].w >= 640) bodies[0].columns = 2;
      break;
    case 'two_columns': {
      const col = c => (c ? (c.heading ? `<p><span style="color:${look.accent}"><b>${inline(str(c.heading))}</b></span></p>` : '') + list(c.bullets) : '');
      if (bodies.length > 1) { set(bodies[0], col(spec.left)); set(bodies[1], col(spec.right)); } else set(bodies[0], col(spec.left) + col(spec.right));
      break;
    }
    case 'image':
      // (A wide figure — a diagram from a paper —: across the slide under the title, its point under it.)
      if (spec.figureRatio > 1.8) {
        const a = { ...free };                              // (the whole width under the title, whatever the layout's columns)
        // (The text measured at the theme's size first: the figure gives up the height it needs — never the
        // text shrunk to half to fit under a figure that took everything.)
        const text = (spec.bullets || []).filter(Boolean).length, need = text ? needHeight(list(spec.bullets), look.bodySize || 30, a.w, 1.4) + 30 : 0;
        const fh = R(Math.max(a.h * 0.4, Math.min(a.h * (text ? 0.7 : 0.92), a.w / spec.figureRatio, a.h - need - 24))), fw = R(Math.min(a.w, fh * spec.figureRatio));
        extra.push({ id: uid(), type: 'placeholder', ph: 'picture', x: R(a.x + (a.w - fw) / 2), y: a.y, w: fw, h: fh, rotation: 0, animation: null });
        if (bodies[1]) drop.add(bodies[1]);
        if (text && bodies[0]) { set(bodies[0], list(spec.bullets)); Object.assign(bodies[0], { x: a.x, y: R(a.y + fh + 24), w: a.w, h: R(Math.max(60, a.y + a.h - (a.y + fh + 24))) }); }
        else if (bodies[0]) drop.add(bodies[0]);
        break;
      }
      set(bodies[0], list(spec.bullets));
      if (bodies[1]) { const r = boxOf(bodies[1]); drop.add(bodies[1]); extra.push({ id: uid(), type: 'placeholder', ph: 'picture', ...r, rotation: 0, animation: null }); }
      break;
    case 'chart': {
      const c = spec.chart || {}, labels = (c.labels || []).map(str), values = (c.values || []).map(v => +v || 0);
      const r = bodies.length > 1 ? boxOf(bodies[0]) : area;
      if (bodies.length > 1) { drop.add(bodies[0]); set(bodies[1], list(spec.bullets)); }
      extra.push({ id: uid(), type: 'chart', chartType: ['bar', 'line', 'pie', 'doughnut', 'area'].includes(c.type) ? c.type : 'bar', color: look.accent,
        data: labels.map((l, i) => ({ label: l, value: values[i] ?? 0 })), ...(c.series_name && { seriesName: str(c.series_name) }),
        alt: str(spec.title), dataLabels: true, ...r, rotation: 0, animation: null });
      break;
    }
    case 'table': {
      const header = (spec.header || []).map(str), rows = (spec.rows || []).slice(0, 6).map(r => (r || []).map(str));
      const cols = Math.min(5, Math.max(header.length, ...rows.map(r => r.length), 1));
      const all = [header, ...rows].filter(r => r.length).map(r => Array.from({ length: cols }, (_, i) => esc(r[i] ?? '')));
      const h = Math.min(area.h, 64 * all.length), fs = Math.max(16, Math.min(26, Math.round(look.bodySize * 0.72)));
      extra.push({ id: uid(), type: 'table', rows: all, header: !!header.length, banded: true, band: look.accent, headBg: look.accent, headFg: inkOn(look.accent),
        stroke: hex2(look.fg) + '40', fontSize: fs, x: area.x, y: R(area.y + (minimal ? (area.h - h) / 2 : 0)), w: area.w, h: R(h), rotation: 0, animation: null });
      break;
    }
    case 'code': case 'math': { const cc = codeCard(spec, area, look); extra.push(...cc); if (cc.dropped) slide.notes = withPoints(slide.notes, cc.dropped); break; }
    case 'diagram': extra.push(...diagramCard(spec, area, look)); break;
    case 'exercise': {
      // The problem on the left, its solution on the right — shown with a click (exerciseSolution), so the class can
      // try it first. (Code as the solution: a code block in the right column, under its heading.)
      const part = (c, accent) => (c.heading ? `<p><span style="color:${accent}"><b>${inline(str(c.heading))}</b></span></p>` : '') + list(c.bullets);
      const L = bodies[0], Rb = bodies[1] || null;
      const right = Rb ? boxOf(Rb) : { x: area.x + area.w / 2 + 20, y: area.y, w: area.w / 2 - 20, h: area.h };
      if (L) { set(L, part(spec.problem, look.accent)); if (!Rb) L.w = R(area.w / 2 - 20); }
      if (spec.solution.code) {
        if (Rb) drop.add(Rb);
        const head = spec.solution.heading ? X(right.x, right.y, right.w, 56, `<b>${inline(str(spec.solution.heading))}</b>`, { fontSize: Math.max(22, R((look.bodySize || 30) * 0.8)), fontFamily: look.head, color: look.accent, solution: true }) : null;
        const top = head ? right.y + 64 : right.y, c = spec.solution.code;
        const cb = codeBlockAt(c.code, c.language, { x: right.x, y: top, w: right.w, h: right.y + right.h - top }, { solution: true });
        extra.push(...[head, cb].filter(Boolean));
        if (spec.solution.bullets.length) slide.notes = withPoints(slide.notes, spec.solution.bullets);
      } else if (Rb) { set(Rb, part(spec.solution, look.accent)); Rb.solution = true; }
      else extra.push(X(right.x, right.y, right.w, right.h, part(spec.solution, look.accent), { fontSize: R((look.bodySize || 30) * 0.8), color: look.fg, fontFamily: look.body, solution: true }));
      break;
    }
    default: extra.push(...compose(kind, spec, area, look, { minimal, style }));
  }
  // Empty placeholders go (as in the templates).
  const phs = ph.filter(b => !drop.has(b) && plain(b.html || ''));
  // (A short list in a big box grows — three lines at the master's size left two thirds of the slide empty — to what fits.)
  // (Not in a narrow column, by a chart: there it only made more lines and broke long words.)
  // (A very short one — four points of a few words — up to half as big again: at 1.3 it still filled a third of its box.)
  const chars = b => str(b.html).replace(/<[^>]*>/g, '').length;
  const grow = b => styleKind(b) !== 'body' ? 1 : b.w >= 640 && chars(b) < 200 && b.h >= 360 ? 1.5 : b.w >= 640 && chars(b) < 260 ? 1.3 : minimal ? 1.12 : 1;
  for (const b of phs) fitPlaceholder(b, slide, deck, grow(b));
  // Covers and sections without decoration of their own: a short accent rule.
  if (COVER.includes(kind) && !decor.length && !minimal && title && kind !== 'quote') {
    // (Under the title when its text sits at the bottom of its box, else over it.)
    const st = styled(title, slide, deck), center = st.textAlign === 'center', below = kind === 'section' || center || st.vAlign === 'bottom';
    extra.push(S('rect', center ? title.x + title.w / 2 - 50 : title.x + 12, below ? title.y + title.h + 4 : title.y - 18, 100, 8, look.accent, { decorative: true }));
  }
  if (kind === 'quote' && title && !minimal) {
    const center = styled(title, slide, deck).textAlign === 'center';
    extra.push(X(center ? title.x + title.w / 2 - 70 : title.x, Math.max(10, title.y - 70), 140, 190, '“', { fontSize: 180, fontFamily: look.head, color: look.accent, textAlign: center ? 'center' : 'left', lineHeight: 1, decorative: true }));
  }
  // Over a background where the master's colours can't be read: the colours set here.
  if (!look.ok) for (const b of phs) b.color = styleKind(b) === 'title' ? look.title : look.fg;
  slide.blocks = [...decor, ...phs, ...extra];
  if (!minimal && plainBack(ref, deck)) accentBack(slide, kind, look, deck);
  applyStyle(slide, spec, deck, { kind, style, seed: seed || slide.id, look, decor: new Set(decor.map(d => d.id)) });
  if (kind === 'exercise') exerciseSolution(slide);
  return slide;
}
// The explanation of code that didn't fit beside it at a size that reads: said instead, in the notes.
const withPoints = (notes, pts) => [str(notes).trim(), pts.flat(3).map(p => '• ' + str(p).replace(/`([^`\n]+)`/g, '$1')).join('\n')].filter(Boolean).join('\n\n');
// An exercise's solution comes in with a click, after the problem has been read (and tried).
function exerciseSolution(slide) {
  const sol = slide.blocks.filter(b => b.solution);
  sol.forEach((b, i) => { delete b.solution; b.animation = { effect: 'fade-up', order: 1, seq: 900 + i, start: i ? 'withPrev' : 'click', duration: 500, delay: 0 }; delete b.anims; });
  if (sol.length) normalizeAnim(slide);
}
// Rhythm in a deck whose slides all share one plain background: a section slide on the accent colour (the words in
// the colour that reads on it), a key idea on a soft tint of it. Not when the design gives these slides a look of
// their own (a picture, a band, a background of their own): that is kept.
const plainBack = (ref, deck) => !ref || !!ref.accentBack || (hex2(backColour(ref, deck)) === hex2(currentPalette(deck).bg) && !ref.blocks.some(b => !b.ph && (b.type === 'image' || (b.type === 'shape' && fullBox(b, deck.size.w, deck.size.h)))));
const mixHex = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return x && y ? '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('') : b; };
function accentBack(slide, kind, look, deck) {
  if (kind === 'section') {
    const bg = look.accent, ink = inkOn(bg);
    if (contrast(bg, ink) < 4) return;
    slide.background = bg; slide.accentBack = 'section';
    for (const b of slide.blocks) {
      if (b.type === 'text') b.color = ink;
      else if (b.type === 'shape' && b.decorative && b.fill && hex2(b.fill) === hex2(look.accent)) { b.fill = ink; b.stroke = ink; b.opacity = 70; }
    }
  } else if (kind === 'key_idea') {
    const bg = mixHex(look.accent, look.bg, 0.86);
    if (contrast(bg, look.fg) < 4.5 || contrast(bg, look.title) < 3) return;
    slide.background = bg; slide.accentBack = 'key_idea';
  }
}

// Code or a formula under the title: a native code block (highlighted) or equation, with its
// explanation in a column at its side when there is one, and a caption under it.
// area: the free box under the title; look: { fg, accent, bodySize, body } (lookOf, or the palette's).
export const CODE_MIN = 20;                      // (code under 20 px can't be read from the back of a room)
export function codeCard(spec, area, look) {
  const out = [], pts = (spec.bullets || []).filter(Boolean), gap = 36, code = spec.code?.code || '';
  const capH = spec.caption ? 50 : 0, h = area.h - capH, bs = look.bodySize || 30, html = list(pts, look.accent);
  if (spec.kind === 'math') {
    const side = pts.length > 0, cw = side ? Math.round(area.w * 0.5) : area.w;
    const main = mathBlockAt(spec.latex, { x: area.x, w: cw, h: Math.min(h, side ? 220 : 200), y: area.y + (side ? 0 : Math.max(0, (h - 200) / 3)) }, { color: look.fg, ...(side && { textAlign: 'left' }) });
    out.push(main);
    if (spec.caption) out.push(X(area.x, main.y + main.h + 10, cw, 40, `<i>${inlineHTML(spec.caption)}</i>`, { fontSize: Math.max(16, Math.round(bs * 0.6)), color: look.fg }));
    if (side) out.push(X(area.x + cw + gap, area.y, area.w - cw - gap, area.h, html, { fontSize: fitSize(html, Math.round(bs * 0.8), area.w - cw - gap, area.h, 1.25, 18), color: look.fg, ...(look.body && { fontFamily: look.body }) }));
    return out;
  }
  // Where the explanation goes: beside the code — a column of 360 px or more, never a strip of single words — while
  // the code still reads there (20 px or more); else under it, in one row of columns; else — code that needs the whole
  // slide — said, in the notes. The code's box is as wide and tall as the code at its size (up to 30 px: a short
  // snippet reads big), and the whole sits in the middle of the room, not at its top with half the slide empty.
  const lines = code.split('\n'), longest = Math.max(8, ...lines.map(l => l.length));
  const fs = (w, hh) => codeFontSize(code, w, hh, { min: 1, max: 30 });
  const wideAt = f => Math.round((longest * 0.64 + 2) * f + 24);
  const SIDE = 360, cols = pts.length > 3 ? 2 : Math.max(1, pts.length), colW = (area.w - 32 * (cols - 1)) / cols;
  const ptsH = pts.length ? Math.min(area.h * 0.4, R(Math.max(...pts.map(p => textHeight(list([p]), 22, colW, 1.25))) * Math.ceil(pts.length / cols) + 8)) : 0;
  let mode = 'alone', f = fs(area.w, h);
  if (pts.length) {
    const sideF = fs(area.w - SIDE - gap, h), sideW = Math.min(area.w - SIDE - gap, wideAt(sideF)), underF = fs(area.w, h - ptsH - 20);
    const sideOK = sideF >= CODE_MIN && textHeight(html, 18, area.w - sideW - gap, 1.25) <= h;
    mode = sideOK && (sideF >= underF - 2 || underF < CODE_MIN) ? 'side' : underF >= CODE_MIN ? 'under' : f >= CODE_MIN ? 'drop' : sideF >= underF ? 'side' : 'under';
    f = mode === 'side' ? sideF : mode === 'under' ? underF : f;
  }
  const roomH = mode === 'under' ? h - ptsH - 20 : h, roomW = mode === 'side' ? area.w - SIDE - gap : area.w;
  const cw = Math.min(roomW, wideAt(f)), ch = Math.min(roomH, codeHeight(code, f));
  const stack = ch + (spec.caption ? 50 : 0) + (mode === 'under' ? 20 + ptsH : 0);
  const y0 = area.y + Math.max(0, (area.h - stack) * 0.4), x0 = mode === 'alone' || mode === 'drop' ? area.x + Math.max(0, (area.w - cw) / 2) : area.x;
  const c = spec.code || {}, main = codeBlockAt(c.code || '', c.language, { x: x0, y: y0, w: cw, h: ch }, { fontSize: f });
  main.h = ch;
  out.push(main);
  if (spec.caption) out.push(X(x0, main.y + main.h + 10, cw, 40, `<i>${inlineHTML(spec.caption)}</i>`, { fontSize: Math.max(16, Math.round(bs * 0.6)), color: look.fg }));
  if (mode === 'under') {
    // (One text per point, side by side — a list cut into CSS columns broke a point in two across them.)
    const y = main.y + main.h + (spec.caption ? 60 : 20), hh = Math.max(ptsH, area.y + area.h - y), rows = Math.ceil(pts.length / cols), rh = hh / rows;
    const size = Math.min(...pts.map(p => fitSize(list([p], look.accent), Math.round(bs * 0.8), colW, rh, 1.25, 18)));
    pts.forEach((p, i) => out.push(X(area.x + (i % cols) * (colW + 32), y + Math.floor(i / cols) * rh, colW, rh, list([p], look.accent), { fontSize: size, color: look.fg, ...(look.body && { fontFamily: look.body }) })));
  }
  if (mode === 'side') {
    const sx = area.x + cw + gap, sw = area.x + area.w - sx;
    out.push(X(sx, area.y, sw, area.h, html, { fontSize: fitSize(html, Math.round(bs * 0.8), sw, area.h, 1.25, 18), color: look.fg, vAlign: 'middle', ...(look.body && { fontFamily: look.body }) }));
  }
  if (mode === 'drop') out.dropped = pts;
  return out;
}

// A diagram (render/diagrams.js: a cycle, a process, a hierarchy…) under the title: the whole area, or — with points —
// most of it, the points at its side.
export function diagramCard(spec, area, look) {
  const pts = (spec.bullets || []).filter(Boolean), d = spec.diagram || {}, gap = 36;
  const dw = pts.length ? Math.round(area.w * 0.64) : area.w;
  const out = [{ id: uid(), type: 'diagram', layout: d.type || 'process', colors: 'colorful', text: str(d.text), x: R(area.x), y: R(area.y), w: dw, h: R(area.h), rotation: 0, animation: null, alt: str(spec.title) }];
  if (pts.length) { const html = list(pts, look.accent), sw = area.w - dw - gap;
    out.push(X(area.x + dw + gap, area.y, sw, area.h, html, { fontSize: fitSize(html, Math.round((look.bodySize || 30) * 0.8), sw, area.h, 1.25, 18), color: look.fg, vAlign: 'middle', ...(look.body && { fontFamily: look.body }) })); }
  return out;
}

// ---- Compositions: what goes under the title for the richer kinds --------------------
// Built like the templates do it — cards on a soft tint of the text colour, numbers
// and icons in the deck's accents (one per item when the deck shows several), the
// heading font for figures and titles — always with the deck's own colours and fonts.
// area: the free box under the title; look: lookOf() (or the palette's, for decks
// without layouts: authoring.js).
const ICONS = ['sparkles', 'target', 'lightbulb', 'star', 'award', 'rocket'];
export function compose(kind, spec, area, look, { minimal = false, style = 'same' } = {}) {
  const out = [], bs = Math.max(30, look.bodySize || 30), acc = i => (look.accents?.length ? look.accents[i % look.accents.length] : look.accent);
  const push = (...bl) => out.push(...bl.filter(Boolean).map(b => Object.assign(b, { fromSpec: kind })));
  const T = (x, y, w, h, html, props) => X(x, y, w, h, html, { fontFamily: look.body, color: look.fg, ...props });
  const card = (x, y, w, h) => (minimal ? null : S('rounded', x, y, w, h, look.fg, { opacity: 7, radius: 18 }));
  // (Where card i of n goes: rows of `cols`, a last row with fewer centred.)
  const cell = (i, n, cols, cw, ch, gap, y0) => { const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols);
    return { x: area.x + (i % cols) * (cw + gap) + (cols - inRow) * (cw + gap) / 2, y: y0 + r * (ch + gap) }; };
  switch (kind) {
    case 'stats': {
      const st = (spec.stats || []).slice(0, 4), n = Math.max(1, st.length);
      if (n === 1) {
        // One figure: big on the left, what it means on the right.
        // (The pair centred, the figure only as wide as it is: «2» in half the slide left a hole between it and its words.)
        const s = st[0], v = `<b>${esc(str(s.value))}</b>`, len = Math.max(2, str(s.value).length * 0.68);
        const big = Math.min(200, area.h * 0.62, (area.w * 0.5 - 24) / len), vh = big * 1.2, vw = Math.min(area.w * 0.5, big * len + 48);
        const lab = esc(str(s.label)), lw = Math.min(area.w - vw - 60, Math.max(420, area.w * 0.42)), x0 = area.x + (area.w - vw - 60 - lw) / 2;
        const ls = fitSize(lab, R(bs * (str(s.label).length <= 40 ? 1.3 : 1)), lw, vh, 1.25, 18, 0.54, look.body), y = area.y + (area.h - vh) * 0.45;
        push(T(x0, y, vw, vh, v, { fontSize: R(big), fontFamily: look.head, color: acc(0), textAlign: 'right', vAlign: 'middle', lineHeight: 1 }));
        if (!minimal) push(S('rect', x0 + vw + 12, y + vh * 0.1, 6, vh * 0.8, acc(0)));
        push(T(x0 + vw + 48, y, lw, vh, lab, { fontSize: ls, vAlign: 'middle' }));
        break;
      }
      const gap = minimal ? 48 : 32, gw = (area.w - (n - 1) * gap) / n;
      const ch = Math.min(area.h, minimal ? 260 : 300), y0 = area.y + (area.h - ch) / 2;
      // (Wide enough for the figure on one line: bold digits are about two thirds of the size wide.)
      const big = Math.min(style === 'visual' ? 132 : 104, ...st.map(s => (gw - 40) / Math.max(2, str(s.value).length * 0.68)));
      st.forEach((s, i) => {
        const x = area.x + i * (gw + gap), c = minimal ? look.accent : acc(i);
        push(card(x, y0, gw, ch), !minimal && S('rect', x + 24, y0 + 22, 56, 6, c));
        push(T(x + 12, y0 + 36, gw - 24, big * 1.25, `<b>${esc(str(s.value))}</b>`, { fontSize: R(big), fontFamily: look.head, color: c, textAlign: minimal ? 'center' : 'left', vAlign: 'middle', lineHeight: 1 }));
        const lw = gw - 24, lh = ch - 36 - big * 1.25 - 16, lab = esc(str(s.label));
        push(T(x + 12, y0 + 40 + big * 1.25, lw, lh, lab, { fontSize: fitSize(lab, R(bs * 0.76), lw, lh, 1.25, 16), textAlign: minimal ? 'center' : 'left' }));
      });
      break;
    }
    case 'timeline': {
      // A line with a dot per moment: the date over it, what happened under it.
      const steps = (spec.steps || []).slice(0, 6), n = Math.max(1, steps.length), gw = area.w / n, fs = R(bs * 0.7), ls = R(bs * 0.86);
      const lh = R(Math.min(90, Math.max(50, ls * 1.7))), th = Math.min(area.h - lh - 70, Math.max(70, ...steps.map(s => needHeight(inline(s.text), fs, gw - 24, 1.3))));
      const y0 = area.y + Math.max(0, (area.h - lh - 70 - th) * 0.42), ly = y0 + lh + 34;
      if (n > 1) push(S('rect', area.x + gw / 2, ly - 2, area.w - gw, 4, look.fg, { opacity: 28 }));
      steps.forEach((s, i) => {
        const cx = area.x + gw * i + gw / 2, c = minimal ? look.accent : acc(i), lab = `<b>${inline(s.label)}</b>`, tx = inline(s.text);
        push(T(cx - gw / 2 + 8, y0, gw - 16, lh, lab, { fontSize: fitSize(lab, ls, gw - 16, lh, 1.1, 14), fontFamily: look.head, color: c, textAlign: 'center', vAlign: 'bottom', lineHeight: 1.1 }));
        if (!minimal) push(S('ellipse', cx - 19, ly - 19, 38, 38, c, { opacity: 28 }));
        push(S('ellipse', cx - 11, ly - 11, 22, 22, c));
        if (s.text) push(T(cx - gw / 2 + 12, ly + 36, gw - 24, th, tx, { fontSize: fitSize(tx, fs, gw - 24, th, 1.3, 14), textAlign: 'center', lineHeight: 1.3 }));
      });
      break;
    }
    case 'steps': case 'features': {
      // Numbered cards (steps) or cards with an icon (features): a row, or two.
      const it = ((kind === 'steps' ? spec.steps : spec.items) || []).slice(0, 6), n = Math.max(1, it.length);
      // (Columns as many as leave each card room to be read: a card with a sentence needs some 300 px — four in a row
      // made 12-px text. Texts of a few characters — an exercise, «2/5 + 1/2» — go big.)
      const longest = Math.max(0, ...it.map(s => str(s.text).length)), short = longest > 0 && longest <= 18;
      const needW = longest > 90 ? 360 : longest > 45 ? 290 : 210, gap = minimal ? 40 : 28;
      let cols = kind === 'steps' ? (n <= 4 ? n : 3) : (n <= 3 ? n : n === 4 ? 2 : 3);
      while (cols > 1 && (area.w - (cols - 1) * gap) / cols < needW) cols--;
      if (cols > 2 && n % cols && n % (cols - 1) === 0 && (area.w - (cols - 2) * gap) / (cols - 1) >= needW) cols--;   // (no last row of one — but never one column: thin strips)
      const rows = Math.ceil(n / cols);
      const cw = (area.w - (cols - 1) * gap) / cols, hasT = it.some(s => s.title);
      let pad = minimal ? 0 : 26, d = rows > 1 ? 54 : 68, dg = 18;
      const ts0 = R(bs * (rows > 1 ? 0.84 : 0.9)), xs0 = short ? R(bs * 1.2) : R(bs * (hasT ? (rows > 1 ? 0.8 : 0.86) : 0.92));
      const maxH = (area.h - (rows - 1) * gap) / rows;
      let ts = ts0, xs = xs0;
      // The number or icon over the text, or — wide cards, or text that wouldn't fit under it (two rows of four steps:
      // the last line ran out of the card) — at its side.
      const sized = side => {
        const iw = side ? cw - 2 * pad - d - 22 : cw - 2 * pad;
        const tH = hasT ? Math.max(...it.map(s => (s.title ? textHeight(`<b>${inline(s.title)}</b>`, ts, iw, 1.15, 0.6, look.head) : 0))) : 0;
        const xH = Math.max(0, ...it.map(s => (s.text ? textHeight(short ? `<b>${inline(s.text)}</b>` : inline(s.text), xs, iw, 1.3, 0.54, short ? look.head : look.body) : 0)));
        const inner = tH + (hasT ? 6 : 0) + xH;
        return { side, iw, tH, need: side ? 2 * pad + Math.max(d, inner) : 2 * pad + d + dg + inner };
      };
      let lay = sized(kind === 'features' && cw >= 440);
      if (!lay.side && lay.need > maxH && cw >= 360) { const alt = sized(true); if (alt.need < lay.need) lay = alt; }
      // (Still taller than its row — two rows of cards under a big serif title —: the letters a little smaller, to 18 px.)
      for (let k = 0.95; lay.need > maxH && k >= 0.7; k -= 0.05) { ts = Math.max(18, R(ts0 * k)); xs = Math.max(18, R(xs0 * k)); lay = sized(lay.side); }
      // (And at 18 px, still not: the card itself tighter — less margin, a smaller number —, five steps of a sentence each.)
      if (lay.need > maxH) { pad = Math.min(pad, 16); d = Math.min(d, 40); dg = 10; lay = sized(lay.side); const alt = !lay.side && sized(true); if (alt && alt.need < lay.need) lay = alt; }
      // (Cards that would fill half their room — four short points in two rows —: the letters, the number or icon bigger,
      // up to half as big again, while they still fit; the cards then fill the area instead of floating in it.)
      if (lay.need < maxH * 0.85) {
        const t0 = ts, x0 = xs, d0 = d, dMax = rows > 1 ? 80 : 96;
        // (No bigger than the body text's size — measured, a few words grown further ran out of their card — and with a
        // margin for what the estimate misses.)
        const cap = Math.min(1.5, (bs * 1.05) / Math.max(t0, 1), bs / Math.max(x0, 1));
        for (let k = 1.05; k <= cap + 1e-6; k += 0.05) {
          ts = R(t0 * k); xs = R(x0 * k); d = Math.min(dMax, R(d0 * k)); const nl = sized(lay.side);
          if (nl.need > maxH * 0.85) { ts = R(t0 * (k - 0.05)); xs = R(x0 * (k - 0.05)); d = Math.min(dMax, R(d0 * (k - 0.05))); break; }
          lay = nl;
        }
        lay = sized(lay.side);
      }
      const { side, iw, tH } = lay, ch = Math.min(maxH, lay.need);
      // (Cards with an icon, in rows: as tall as their room allows — a quarter more than their words at most —, the
      // words in their middle; short cards left a third of the slide empty under them.)
      const cardH = kind === 'features' && !minimal ? Math.max(ch, Math.min(maxH, ch * 1.25)) : ch;
      const y0 = area.y + Math.max(0, (area.h - rows * cardH - (rows - 1) * gap) * 0.4), used = new Set();
      it.forEach((s, i) => {
        const { x, y: yc } = cell(i, n, cols, cw, cardH, gap, y0), c = acc(i), y = yc + (cardH - ch) / 2;
        push(card(x, yc, cw, cardH));
        if (kind === 'steps') push(S('ellipse', x + pad, y + pad, d, d, c), T(x + pad, y + pad, d, d, `<b>${i + 1}</b>`, { fontSize: R(d * 0.46), fontFamily: look.head, color: inkOn(c), textAlign: 'center', vAlign: 'middle', lineHeight: 1, pad: [0, 0, 0, 0] }));
        else {
          let name = ICON_NAMES.includes(s.icon) ? s.icon : iconFor({ title: s.title, subtitle: s.text }, '');
          if (!ICON_NAMES.includes(name) || used.has(name)) name = ICONS.find(k => !used.has(k)) || 'sparkles';
          used.add(name);
          // (The icon big on its disc, in the accent: at half the disc on a faint one it read as a grey dot.)
          push(S('ellipse', x + pad, y + pad, d, d, c, { opacity: 16 }), { id: uid(), type: 'icon', icon: name, color: c, x: R(x + pad + d * 0.18), y: R(y + pad + d * 0.18), w: R(d * 0.64), h: R(d * 0.64), rotation: 0, animation: null, alt: '' });
        }
        const tx = side ? x + pad + d + 22 : x + pad, room = y + ch - pad - (side ? y + pad : y + pad + d + dg), th = Math.min(tH, room * 0.55);
        let ty = side ? y + pad : y + pad + d + dg;
        if (s.title) { const ht = `<b>${inline(s.title)}</b>`;
          push(T(tx, ty, iw, th, ht, { fontSize: fitSize(ht, ts, iw, th, 1.15, 18, 0.6, look.head), fontFamily: look.head, color: kind === 'features' && !minimal ? c : look.title, lineHeight: 1.15 })); }
        if (hasT) ty += th + 6;
        if (s.text) { const h = y + ch - pad - ty, ht = short ? `<b>${inline(s.text)}</b>` : inline(s.text); push(T(tx, ty, iw, h, ht, { fontSize: fitSize(ht, xs, iw, h, 1.3, 18, 0.54, short ? look.head : look.body), lineHeight: 1.3, ...(short && { fontFamily: look.head }) })); }
        // (One row of steps: a chevron between the cards.)
        if (kind === 'steps' && rows === 1 && i < n - 1 && !minimal) push(S('chevron', x + cw + gap / 2 - 7, y + pad + d / 2 - 10, 14, 20, look.fg, { opacity: 40, decorative: true }));
      });
      break;
    }
    case 'comparison': {
      // Two or three columns: a header in a colour of the deck, the list under it, each on its card.
      const cols = (spec.columns || [spec.left, spec.right]).filter(Boolean).slice(0, 3), n = Math.max(1, cols.length), gap = minimal ? 48 : 32;
      const cw = (area.w - (n - 1) * gap) / n, pad = minimal ? 0 : 26, iw = cw - 2 * pad, hs = R(bs * 0.8);
      const heads = cols.map(c => (c.heading ? `<b>${inline(c.heading)}</b>` : '')), bodies = cols.map(c => list(c.bullets));
      const hH = Math.max(0, ...heads.map(h => (h ? Math.min(150, needHeight(h, hs, cw - 44, 1.15)) : 0)));
      const room = area.h - hH - 18 - pad;
      // (Short lists read big: two points of three words each were 22 px in half-empty cards.)
      const words = Math.max(...bodies.map(h => str(h).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length)), x0 = R(bs * (words <= 24 ? 1 : words <= 50 ? 0.86 : 0.74));
      const xs = Math.min(...bodies.map(h => fitSize(h, x0, iw, room, 1.3, 18)));
      const bH = Math.min(room, Math.max(...bodies.map(h => needHeight(h, xs, iw, 1.3))));
      const ch = hH + 18 + bH + pad, y0 = area.y + Math.max(0, (area.h - ch) * 0.3);
      cols.forEach((c, i) => {
        const x = area.x + i * (cw + gap), col = c.tone === 'bad' ? look.accent2 : acc(i);
        push(card(x, y0, cw, ch));
        if (heads[i]) push(minimal ? T(x, y0, cw, hH, heads[i], { fontSize: fitSize(heads[i], hs, cw, hH, 1.15, 16), fontFamily: look.head, color: col, vAlign: 'bottom', lineHeight: 1.15 })
          : T(x, y0, cw, hH, heads[i], { fontSize: fitSize(heads[i], hs, cw - 44, hH, 1.15, 16), fontFamily: look.head, color: inkOn(col), bg: col, radius: 18, pad: [10, 22, 10, 22], vAlign: 'middle', lineHeight: 1.15 }));
        if (minimal && heads[i]) push(S('rect', x, y0 + hH + 4, 64, 5, col));
        push(T(x + pad, y0 + hH + 18, iw, bH, bodies[i], { fontSize: xs, lineHeight: 1.3 }));
      });
      break;
    }
    case 'agenda': {
      // Numbered rows: "01" in an accent, the item beside it, a hairline between them.
      const it = (spec.items || []).slice(0, 10), n = Math.max(1, it.length), cols = n > 5 ? 2 : 1, per = Math.ceil(n / cols), gap = 56;
      const cw = (area.w - (cols - 1) * gap) / cols, rh = Math.min(104, area.h / per), ns = R(Math.min(rh * 0.6, bs * 1.5)), ts = R(Math.min(bs * 0.9, rh * 0.42)), nw = ns * 1.4 + 24;
      const y0 = area.y + Math.max(0, (area.h - per * rh) * 0.35);
      it.forEach((s, i) => {
        const k = Math.floor(i / per), r = i % per, x = area.x + k * (cw + gap), y = y0 + r * rh, c = minimal ? look.accent : acc(i), tx = inline(s);
        push(T(x, y, nw, rh, `<b>${String(i + 1).padStart(2, '0')}</b>`, { fontSize: ns, fontFamily: look.head, color: c, vAlign: 'middle', lineHeight: 1 }));
        push(T(x + nw + 16, y, cw - nw - 16, rh, tx, { fontSize: fitSize(tx, ts, cw - nw - 16, rh, 1.2, 14), vAlign: 'middle', lineHeight: 1.2 }));
        if (r < per - 1 && i < n - 1 && !minimal) push(S('rect', x, y + rh - 1, cw, 2, look.fg, { opacity: 14 }));
      });
      break;
    }
    case 'key_idea': {
      // One sentence, big, in the heading font, with an accent bar; a line of support under it.
      const st = inline(spec.statement || ''), tx = spec.text ? inline(spec.text) : '', x = area.x + (minimal ? 0 : 52), w = area.w - (minimal ? 0 : 52);
      // (Measured with its own bold heading font where there is a page.)
      const hNeed = fs => measuredHeight(st, fs, w, 1.15, look.head, true) ?? needHeight(st, fs, w, 1.15, 0.62);
      const maxS = area.h * (tx ? 0.62 : 0.9);
      let big = R(Math.max(40, Math.min((look.titleSize || 48) * 1.2, 76))); while (big > 26 && hNeed(big) > maxS) big = Math.max(26, big - 2);
      const sh = Math.min(maxS, hNeed(big)), ts = R(bs * 0.74), th = tx ? Math.min(area.h - sh - 24, needHeight(tx, ts, w, 1.3)) : 0;
      const y = area.y + Math.max(0, (area.h - sh - (tx ? th + 24 : 0)) * 0.42), al = minimal ? 'center' : 'left';
      if (!minimal) push(S('rect', area.x, y + 8, 10, sh - 16, look.accent));
      push(T(x, y, w, sh, `<b>${st}</b>`, { fontSize: big, fontFamily: look.head, color: look.title, lineHeight: 1.15, textAlign: al, vAlign: 'middle' }));
      if (tx) push(T(x, y + sh + 24, w, th, tx, { fontSize: fitSize(tx, ts, w, th, 1.3, 18), textAlign: al, lineHeight: 1.3 }));
      break;
    }
    default: { const h = list(spec.bullets);
      push(T(area.x, area.y, area.w, area.h, h, { fontSize: fitSize(h, R(bs * 0.8), area.w, area.h, 1.3, 14) })); }
  }
  return out;
}

// ---- The style of what is new -------------------------------------------------------
const SIMPLE = ['bullets', 'image'];
const EFFECTS = ['fade-up', 'zoom-in', 'fade-left', 'fade-right', 'fade-in'];
// The transitions the deck already uses, most used first.
const usedTransitions = deck => { const c = new Map(); for (const s of deck.slides) if (s.transition && s.transition !== 'none') c.set(s.transition, (c.get(s.transition) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]); };

function applyStyle(slide, spec, deck, { kind, style, seed, look, decor }) {
  if (!STYLES.includes(style) || style === 'same' || style === 'minimal') return;
  const r = rng(seed + '|' + kind), { w: W, h: H } = deck.size;
  const visual = style === 'visual' || style === 'surprise';
  if (visual) addVisual(slide, spec, deck, { kind, look, r, surprise: style === 'surprise' });
  if (style === 'animated' || style === 'surprise') {
    const effect = style === 'surprise' ? pick(r, EFFECTS) : null;
    animate(slide, deck, { kind, decor, effect });
    const used = usedTransitions(deck);
    slide.transition = style === 'surprise' ? pick(r, [...new Set([...used, 'fade', 'zoom', 'push', 'convex'])]) : used[0] || 'fade';
  }
  // (Keep everything on the slide.)
  for (const b of slide.blocks) if (b.type !== 'connector' && !decor.has(b.id)) { b.x = Math.max(0, Math.min(b.x, W - b.w)); b.y = Math.max(0, Math.min(b.y, H - b.h)); }
}

// More visual: an icon that fits (on a soft circle of the accent colour) and, on
// simple slides, a layout of the designer other than the plain one.
function addVisual(slide, spec, deck, { kind, look, r, surprise }) {
  const { w: W, h: H } = deck.size, title = slide.blocks.find(b => b.ph === 'title' && b.type === 'text');
  const name = iconFor(spec, kind), ic = (x, y, d) => [S('ellipse', x - d * 0.28, y - d * 0.28, d * 1.56, d * 1.56, look.accent, { opacity: 16, decorative: true }),
    { id: uid(), type: 'icon', icon: name, color: look.accent, x: R(x), y: R(y), w: R(d), h: R(d), rotation: 0, animation: null, alt: '' }];
  const center = title && styled(title, slide, deck).textAlign === 'center';
  if (SIMPLE.includes(kind) && !slide.blocks.some(b => b.type === 'placeholder')) {
    const icon = ic(0, 0, 100)[1];
    slide.blocks.push(icon);
    // (Not the plain one; centred only without a list: bullets don't read centred.)
    const lists = slide.blocks.some(b => b.ph && /<li/i.test(b.html || ''));
    const ideas = designIdeas(slide, deck).filter(i => !['Clásica', 'Visual de fondo', ...(lists ? ['Centrada'] : [])].includes(i.name));
    const idea = surprise ? pick(r, ideas) : ideas.find(i => i.name === (r() < 0.5 ? 'Visual a la derecha' : 'Visual a la izquierda')) || ideas[0];
    if (idea) {
      applyIdeaTo(slide, idea);
      slide.blocks = slide.blocks.filter(b => b.id !== icon.id);
      // (Texts moved by the idea: room for what they hold.)
      for (const b of slide.blocks) if (b.ph && b.type === 'text' && idea.changes[b.id]) {
        if (styleKind(b) === 'body') { const need = needHeight(b.html, styled({ ...b, fit: undefined }, slide, deck).fontSize || 30, b.w, 1.32); if (need > b.h) b.h = R(Math.min(need, H - 50 - b.y)); }
        fitPlaceholder(b, slide, deck);
      }
      // The icon in the visual's place, clear of the texts (below them if they reach into it).
      const box = { ...(idea.changes[icon.id] || { x: W - 380, y: 200, w: 300, h: 300 }) };
      const texts = slide.blocks.filter(b => b.type === 'text' && b.ph);
      const under = texts.filter(b => overlap(b, box) > 0).reduce((m, b) => Math.max(m, b.y + b.h + 30), box.y);
      if (under > box.y) { box.h -= under - box.y; box.y = under; }
      const d = Math.min(box.w, box.h, 420) * 0.5;
      if (d >= 60) slide.blocks.push(...ic(box.x + (box.w - d) / 2, box.y + (box.h - d) / 2, d));
      return;
    }
    slide.blocks = slide.blocks.filter(b => b.id !== icon.id);
  }
  if (!title) return;
  if (COVER.includes(kind)) {
    if (kind === 'quote') return;
    if (center) { const d = 96; slide.blocks.push(...ic(W / 2 - d / 2, Math.max(30, title.y - d - 30), d)); return; }
    const d = Math.min(220, H * 0.3), x = W - 110 - d;
    for (const b of slide.blocks) if (b.ph && b.type === 'text' && b.x + b.w > x - 60) { b.w = R(Math.max(300, x - 80 - b.x)); fitPlaceholder(b, slide, deck); }
    slide.blocks.push(...ic(x, H / 2 - d / 2, d));
    return;
  }
  // Slides with numbers, a timeline, a chart or a table: the icon at the end of the title's row.
  const d = Math.min(76, title.h * 0.8);
  title.w = R(title.w - d - 40); fitPlaceholder(title, slide, deck);
  slide.blocks.push(...ic(title.x + title.w + 40 + d * 0.1, title.y + (title.h - d) / 2, d));
}

// Entrance animations one after another (the first starts by itself): the title,
// then each part in reading order; what sits on top of the one before, with it.
function animate(slide, deck, { kind, decor, effect = null }) {
  const own = slide.blocks.filter(b => !decor.has(b.id) && b.type !== 'connector' && b.type !== 'placeholder' && !b.decorative);
  const cols = ['stats', 'timeline', 'comparison', 'steps'].includes(kind);
  const order = [...own].sort((a, b) => (b.ph === 'title') - (a.ph === 'title') || (cols ? (a.x + a.w / 2 > b.x + b.w + 1 ? 1 : b.x + b.w / 2 > a.x + a.w + 1 ? -1 : 0) || a.y - b.y : a.y - b.y || a.x - b.x));
  let prev = null, seq = 0;
  for (const b of order) {
    const inside = prev && b.x >= prev.x - 2 && b.y >= prev.y - 2 && b.x + b.w <= prev.x + prev.w + 2 && b.y + b.h <= prev.y + prev.h + 2;
    const fx = effect || (['shape', 'icon', 'chart'].includes(b.type) || (kind === 'stats' && !b.ph) ? 'zoom-in' : 'fade-up');
    b.animation = { effect: fx, order: 1, seq: ++seq, start: inside ? 'withPrev' : 'afterPrev', duration: 450, delay: seq === 1 || inside ? 0 : 120 };
    delete b.anims;
    if (!inside) prev = b;
  }
  normalizeAnim(slide);
}

// Where a picture goes on an "image" slide (its picture placeholder), if any.
export const pictureBox = slide => { const p = slide.blocks.find(b => b.type === 'placeholder' && b.ph === 'picture'); return p ? boxOf(p) : null; };
