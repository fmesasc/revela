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
import { currentPalette, deckFg, pairStacks } from '../design/palettes.js';
import { ensureMaster, masterStyles, masterOf, newSlideBlocks, styleKind, styled } from '../document/master.js';
import { designIdeas, applyIdeaTo } from '../design/designer.js';
import { normalizeAnim } from '../animation/transitions.js';
import { ICON_NAMES } from '../../render/svg.js';

export const STYLES = ['same', 'visual', 'minimal', 'animated', 'surprise'];
export const hasLayouts = deck => Array.isArray(deck?.layouts) && deck.layouts.length > 0;
const str = v => (v == null ? '' : String(v));
const list = items => ((items || []).filter(Boolean).length ? `<ul>${items.filter(Boolean).map(i => `<li>${esc(str(i))}</li>`).join('')}</ul>` : '');
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
  chart: 'titleOnly', stats: 'titleOnly', timeline: 'titleOnly', table: 'titleOnly' };
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
  const st = masterStyles(deck, master), fg = st.body.color || deckFg(deck);
  return { title: st.title.color || fg, body: fg };
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
    if (b.ph || b.hidden || b.type === 'connector' || b.type === 'placeholder') continue;
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
function needHeight(html, fs, w, lh) {
  const isList = /<li/i.test(html);
  const paras = str(html).replace(/<\/(li|p|div)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&[#\w]+;/g, 'x')
    .split('\n').map(s => s.trim()).filter(Boolean);
  const perLine = Math.max(4, Math.floor((w - 28 - (isList ? fs * 1.3 : 0)) / (fs * 0.54)));
  return paras.reduce((h, p) => h + Math.ceil(p.length / perLine) * fs * lh + (isList ? fs * 0.3 : 0), 0) + 20;
}
// The factor (≤ 1, or `want` when it fits) for a placeholder's text in its box.
function fitPlaceholder(b, slide, deck, want = 1) {
  const sb = styled({ ...b, fit: undefined }, slide, deck), fs = sb.fontSize || 40, lh = styleKind(b) === 'body' ? 1.32 : 1.18;
  let f = want;
  while (f > 0.45 && needHeight(b.html, fs * f, b.w, lh) > b.h) f -= 0.05;
  f = Math.round(f * 100) / 100;
  if (f !== 1) b.fit = f; else delete b.fit;
}
// A free text: the size that fits.
function fitSize(html, size, w, h, lh = 1.25, min = 14) {
  let fs = size; while (fs > min && needHeight(html, fs, w, lh) > h) fs -= 2;
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
  return { fg, title, accent, accent2, bg, ok, pal, head: st.title.font || pair?.heading || deck.bodyFont || '',
    body: st.body.font || pair?.body || deck.bodyFont || '', bodySize: st.body.size || 30, titleSize: st.title.size || 48 };
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
  [/futuro|future|próximos|next|siguientes/i, 'rocket'], [/pregunta|question|dudas/i, 'circle-help'], [/aprend|learn|educa|clase|lesson/i, 'graduation-cap'],
  [/salud|health|médic/i, 'heart-pulse'], [/natura|medio ambiente|environment|sostenib|sustain|clima/i, 'leaf'], [/mundo|global|world|internacional/i, 'globe']];
const BY_KIND = { title: 'sparkles', closing: 'flag', section: 'bookmark', bullets: 'lightbulb', two_columns: 'scale', stats: 'trending-up', timeline: 'calendar',
  chart: 'chart-column', table: 'clipboard-list', quote: 'quote', image: 'camera' };
export function iconFor(spec, kind) {
  if (ICON_NAMES.includes(spec.icon)) return spec.icon;
  const words = [spec.title, spec.subtitle, spec.quote].filter(Boolean).join(' ');
  return WORDS.find(([re]) => re.test(words))?.[1] || BY_KIND[kind] || 'sparkles';
}

// ---- Building --------------------------------------------------------------------
// opts: { at (where it goes: the index it will have), self (the slide it replaces), style, seed }
export function styledSlide(spec, deck, { at = deck.slides.length, self = null, style = 'same', seed = '' } = {}) {
  const KINDS = Object.keys(WANT);
  const kind = KINDS.includes(spec.kind) ? spec.kind : 'bullets', { w: W, h: H } = deck.size;
  const near = self || deck.slides[at - 1] || deck.slides[at] || null;
  const master = near ? masterOf(near, deck) : ensureMaster(deck);
  const lay = layoutFor(kind, deck, master, kind === 'chart' && (spec.bullets || []).filter(Boolean).length > 0);
  const ref = referenceSlide(deck, lay, kind, at, self);
  const slide = { id: uid(), sectionId: null, layoutId: lay.id, background: ref?.background || currentPalette(deck).bg, transition: ref ? ref.transition ?? null : null,
    hidden: false, autoSlide: 0, notes: str(spec.notes), blocks: [] };
  if (ref?.hideMaster) slide.hideMaster = true;
  const bg = ref ? backColour(ref, deck) : currentPalette(deck).bg;
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
  const T = (x, y, w, h, html, props) => X(x, y, w, h, html, { fontFamily: look.body, color: look.fg, ...props });
  set(title, esc(str(spec.title)));
  switch (kind) {
    case 'title': case 'closing': case 'section':
      if (spec.subtitle) set(subs[0], esc(str(spec.subtitle)));
      break;
    case 'quote':
      set(title, `<i>“${esc(str(spec.quote || spec.title))}”</i>`);
      if (spec.author) set(subs[0], '— ' + esc(str(spec.author)));
      break;
    case 'bullets': set(bodies[0], list(spec.bullets)); break;
    case 'two_columns': {
      const col = c => (c ? (c.heading ? `<p><span style="color:${look.accent}"><b>${esc(str(c.heading))}</b></span></p>` : '') + list(c.bullets) : '');
      if (bodies.length > 1) { set(bodies[0], col(spec.left)); set(bodies[1], col(spec.right)); } else set(bodies[0], col(spec.left) + col(spec.right));
      break;
    }
    case 'image':
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
    case 'stats': {
      const st = (spec.stats || []).slice(0, 4), n = Math.max(1, st.length), gap = minimal ? 48 : 32, gw = (area.w - (n - 1) * gap) / n;
      const ch = Math.min(area.h, minimal ? 260 : 300), y0 = area.y + (area.h - ch) / 2;
      const big = Math.min(style === 'visual' ? 132 : 104, ...st.map(s => (gw - 24) / Math.max(2, str(s.value).length * 0.58)));
      st.forEach((s, i) => {
        const x = area.x + i * (gw + gap);
        if (!minimal) { extra.push(S('rounded', x, y0, gw, ch, look.accent, { opacity: 14, radius: 18 }), S('rect', x + 24, y0 + 22, 56, 6, look.accent)); }
        extra.push(T(x + 12, y0 + 36, gw - 24, big * 1.25, `<b>${esc(str(s.value))}</b>`, { fontSize: R(big), fontFamily: look.head, color: look.accent, textAlign: minimal ? 'center' : 'left', vAlign: 'middle', lineHeight: 1 }));
        const lw = gw - 24, lh = ch - 36 - big * 1.25 - 16, lab = esc(str(s.label));
        extra.push(T(x + 12, y0 + 40 + big * 1.25, lw, lh, lab, { fontSize: fitSize(lab, R(look.bodySize * 0.72), lw, lh, 1.25, 14), textAlign: minimal ? 'center' : 'left' }));
      });
      break;
    }
    case 'timeline': {
      const steps = (spec.steps || []).slice(0, 5), n = Math.max(1, steps.length), gap = 40, gw = (area.w - (n - 1) * gap) / n, ids = [];
      const bh = 84, fs = R(look.bodySize * 0.66);
      // (The texts' height: what the longest needs; the whole row centred in the area.)
      const th = Math.min(area.h - bh - 20, Math.max(80, ...steps.map(s => needHeight(esc(str(s.text)), fs, gw, 1.3))));
      const y0 = area.y + Math.max(0, (area.h - bh - 20 - th) * 0.45);
      steps.forEach((s, i) => {
        const x = area.x + i * (gw + gap), c = i % 2 && !minimal ? look.accent2 : look.accent, lab = `<b>${esc(str(s.label))}</b>`;
        const box = T(x, y0, gw, bh, lab, { fontSize: fitSize(lab, R(look.bodySize * 0.8), gw, bh, 1.1, 14), fontFamily: look.head, textAlign: 'center', vAlign: 'middle',
          ...(minimal ? { color: look.accent, borderColor: look.accent, radius: 10 } : { bg: c, color: inkOn(c), radius: 12 }) });
        extra.push(box); ids.push(box.id);
        const tx = esc(str(s.text));
        extra.push(T(x, y0 + bh + 20, gw, th, tx, { fontSize: fitSize(tx, fs, gw, th, 1.3, 14), textAlign: 'center' }));
      });
      for (let i = 0; i < ids.length - 1; i++)
        extra.push({ id: uid(), type: 'connector', from: ids[i], to: ids[i + 1], color: look.accent, arrow: true, x: 0, y: 0, w: W, h: H, rotation: 0, animation: null });
      break;
    }
  }
  // Empty placeholders go (as in the templates).
  const phs = ph.filter(b => !drop.has(b) && plain(b.html || ''));
  for (const b of phs) fitPlaceholder(b, slide, deck, minimal && styleKind(b) === 'body' ? 1.12 : 1);
  // Covers and sections without decoration of their own: a short accent rule.
  if (COVER.includes(kind) && !decor.length && !minimal && title && kind !== 'quote') {
    // (Under the title when its text sits at the bottom of its box, else over it.)
    const st = styled(title, slide, deck), center = st.textAlign === 'center', below = kind === 'section' || center || st.vAlign === 'bottom';
    extra.push(S('rect', center ? title.x + title.w / 2 - 50 : title.x + 12, below ? title.y + title.h + 4 : title.y - 18, 100, 8, look.accent, { decorative: true }));
  }
  if (kind === 'quote' && title && !minimal) {
    const center = styled(title, slide, deck).textAlign === 'center';
    extra.push(X(center ? title.x + title.w / 2 - 70 : title.x, Math.max(10, title.y - 70), 140, 150, '“', { fontSize: 180, fontFamily: look.head, color: look.accent, textAlign: center ? 'center' : 'left', lineHeight: 1, decorative: true }));
  }
  // Over a background where the master's colours can't be read: the colours set here.
  if (!look.ok) for (const b of phs) b.color = styleKind(b) === 'title' ? look.title : look.fg;
  slide.blocks = [...decor, ...phs, ...extra];
  applyStyle(slide, spec, deck, { kind, style, seed: seed || slide.id, look, decor: new Set(decor.map(d => d.id)) });
  return slide;
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
  const cols = ['stats', 'timeline'].includes(kind);
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
