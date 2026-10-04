// The assistant as an agent that proposes (Copilot / Gemini in Slides style):
// it reads a compact outline of the deck (only what the scope covers), may look
// at one slide in detail, check its changes on a copy (text that doesn't fit,
// objects off the slide, overlapping text, low contrast), search openly
// licensed pictures, and ends with a list of operations the user picks from.
// Nothing changes until they are applied (one undo step). Scope and
// permissions are enforced here, when validating — and told to the model.
//
// Protocol: one JSON object per answer, through the account or an own key alike
// (the account's server only passes plain chat messages, so no native tool calls):
//   {"thoughts","tool":"get_slide"|"check"|"search_images","args":{…}}  or
//   {"message","ops":[…],"done":true}   (also {"tool":"propose","args":{message, ops}}).

import { state, commit, snapshot } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { chat, lang, parseJSON, esc, plain } from './openrouter.js';
import { slideFromSpec, rebuildSlide, SPEC_DOC } from './authoring.js';
import { STYLES, fitBody } from './fromspec.js';
import { prepareSpec, splitSpec, specFromText } from './specs.js';
import { richHTML } from './richtext.js';
import { PALETTES, FONT_PAIRS, swapPalette, swapFontPair, currentPalette, deckFg, deckBodyFont } from '../design/palettes.js';
import { designIdeas, applyIdeaTo } from '../design/designer.js';
import { EFFECT_KF } from '../animation/transitions.js';
import { styled, isEmptyPlaceholder } from '../document/master.js';
import { searchImages, consented } from '../content/stock.js';
import { SHAPE_NAMES, ICON_NAMES, WORDART_KEYS, textPadding, levelCSS } from '../../render/svg.js';
import { wordartSize, paragraphs } from '../../render/textfit.js';

// ---- Scope and permissions ---------------------------------------------------------
// What the user lets it do besides editing text, notes and slides.
export const PERMS = ['delete', 'design', 'objects', 'animation'];
export const DEFAULT_PERMS = { delete: false, design: true, objects: true, animation: true };
const NEEDS = { delete_slide: 'delete', set_background: 'design', apply_palette: 'design', set_fonts: 'design', set_layout: 'design', set_props: 'design',
  add_object: 'objects', delete_object: 'objects', replace_slide: 'objects', set_animation: 'animation', set_transition: 'animation' };
const DECK_WIDE = ['apply_palette', 'set_fonts'];
const BLOCK_OPS = ['set_text', 'set_props', 'delete_object', 'set_chart_data', 'set_table', 'set_animation'];

// scope: { kind: 'all' | 'current' | 'selection' | 'range' | 'slides', from, to } (slide numbers from 1;
// 'slides': the ones selected in the slides panel, ui.slideSel).
export function scopeOf(scope = { kind: 'all' }, deck = state.deck, ui = state.ui) {
  const n = deck.slides.length, cur = Math.max(0, Math.min(ui.slideIndex || 0, n - 1)), kind = scope?.kind || 'all';
  const clamp = v => Math.max(1, Math.min(n, Math.round(+v) || 1));
  let idx = deck.slides.map((_, i) => i), blocks = null;
  if (kind === 'current' || kind === 'selection') idx = [cur];
  if (kind === 'selection') blocks = new Set(ui.multi?.length ? ui.multi : ui.selection ? [ui.selection] : []);
  if (kind === 'range') { const a = clamp(scope.from), b = clamp(scope.to ?? scope.from); idx = idx.filter(i => i + 1 >= Math.min(a, b) && i + 1 <= Math.max(a, b)); }
  if (kind === 'slides') { const sel = new Set(ui.slideSel || []); idx = idx.filter(i => sel.has(deck.slides[i].id)); if (!idx.length) idx = [cur]; }
  return { kind, idx, ids: new Set(idx.map(i => deck.slides[i].id)), blocks, all: kind === 'all' };
}
const scopeText = (sc, deck) => sc.all ? 'the whole deck'
  : sc.kind === 'selection' ? `only the selected objects (ids ${[...sc.blocks].join(', ') || 'none'}) on slide ${sc.idx[0] + 1}`
  : sc.idx.length === 1 ? `only slide ${sc.idx[0] + 1}` : sc.idx.at(-1) - sc.idx[0] + 1 !== sc.idx.length ? `only slides ${sc.idx.map(i => i + 1).join(', ')} (of ${deck.slides.length})` : `only slides ${sc.idx[0] + 1} to ${sc.idx.at(-1) + 1} (of ${deck.slides.length})`;

// ---- What the model sees -----------------------------------------------------------
// A text's lines, bullets as "- ".
export const textOf = html => paragraphs(String(html || '').replace(/<li[^>]*>/gi, '<li>- ')).join('\n');
const r0 = v => Math.round(+v || 0);
const anim = b => (b.animation ? { anim: b.animation.effect, ...(b.animation.start && b.animation.start !== 'click' && { start: b.animation.start }) } : {});
// One object, compact (outline) or with everything that matters (get_slide).
function objectInfo(b, full = false) {
  const o = { id: b.id, type: b.type, box: [r0(b.x), r0(b.y), r0(b.w), r0(b.h)] };
  if (b.rotation) o.rotation = r0(b.rotation);
  if (b.opacity != null && b.opacity !== 100) o.opacity = b.opacity;
  if (b.ph) o.role = b.ph;
  if (b.locked) o.locked = true;
  if (b.hidden) o.hidden = true;
  switch (b.type) {
    case 'text': {
      const tx = textOf(b.html);
      o.text = full ? tx.slice(0, 1500) : tx.slice(0, 300);
      if (b.fontSize) o.fontSize = b.fontSize;
      const col = b.color || (String(b.html).match(/color:\s*(#[0-9a-f]{3,8})/i) || [])[1]; if (col) o.color = col;
      for (const k of ['fontFamily', 'textAlign', 'fontWeight', 'bg', 'vAlign', 'wordart']) if (b[k] && (full || k !== 'fontFamily')) o[k] = b[k];
      if (full) for (const k of ['fontStyle', 'lineHeight', 'columns', 'radius']) if (b[k]) o[k] = b[k];
      break;
    }
    case 'shape': o.shape = b.shape; if (b.fill) o.fill = b.fill; if (b.stroke && b.strokeWidth) o.stroke = b.stroke;
      if (full && b.strokeWidth) o.strokeWidth = b.strokeWidth; if (b.html) o.text = textOf(b.html).slice(0, 200); if (b.decorative) o.decorative = true; break;
    case 'image': o.alt = String(b.alt || '').slice(0, 125); if (full) { o.fit = b.fit || 'contain'; if (b.caption) o.caption = String(b.caption).slice(0, 120); } break;
    case 'chart': o.chartType = b.chartType || 'bar'; o.data = (b.data || []).slice(0, full ? 60 : 12).map(d => [String(d.label ?? ''), d.value]);
      if (b.seriesName) o.seriesName = b.seriesName;
      if (b.series?.length) o.series = b.series.slice(0, 6).map(x => ({ name: x.name, values: (x.values || []).slice(0, full ? 60 : 12) }));
      if (full && b.color) o.color = b.color; break;
    case 'table': { const rows = (b.rows || []).slice(0, full ? 30 : 6);
      o.rows = rows.map(r => r.slice(0, 10).map(c => plain(c).slice(0, full ? 200 : 40))); if ((b.rows || []).length > rows.length) o.moreRows = b.rows.length - rows.length;
      if (b.header) o.header = true; break; }
    case 'icon': o.icon = b.icon; if (b.color) o.color = b.color; break;
    case 'model': o.alt = String(b.alt || '').slice(0, 125); o.autoRotate = b.autoRotate !== false;
      for (const k of ['view', 'spin', 'clip', 'motion']) if (b[k]) o[k] = b[k]; break;
    case 'code': o.code = String(b.code || '').slice(0, full ? 800 : 120); break;
    case 'math': o.latex = String(b.latex || '').slice(0, 200); break;
    case 'diagram': o.layout = b.layout; if (full) o.items = JSON.stringify(b.items || b.nodes || '').slice(0, 600); break;
    case 'connector': return full ? { id: b.id, type: 'connector', from: b.from, to: b.to } : null;
    default: if (b.alt) o.alt = String(b.alt).slice(0, 125);
  }
  Object.assign(o, anim(b));
  if (full && b.anims?.length) o.moreAnims = b.anims.map(a => a.effect);
  return o;
}
const slideTitle = s => textOf((s.blocks.find(b => b.ph === 'title' && b.type === 'text') || s.blocks.find(b => b.type === 'text' && plain(b.html)))?.html || '').split('\n')[0].slice(0, 80);
function slideInfo(s, i, full = false) {
  return { slide: i + 1, ...(s.hidden && { hidden: true }), ...(s.background && { background: String(s.background).slice(0, 80) }),
    ...(s.transition && { transition: s.transition }),
    objects: s.blocks.map(b => objectInfo(b, full)).filter(Boolean),
    ...(s.notes && { notes: String(s.notes).slice(0, full ? 2000 : 240) }) };
}
// The deck as the model sees it: the slides of the scope in detail (compact), the
// others just with their title; trimmed further when it gets long.
export function deckOutline(deck = state.deck, scope = { kind: 'all' }, ui = state.ui) {
  const sc = scope.idx ? scope : scopeOf(scope, deck, ui);
  const parts = deck.slides.map((s, i) => (sc.ids.has(s.id) ? slideInfo(s, i) : { slide: i + 1, title: slideTitle(s), outOfScope: true }));
  if (JSON.stringify(parts).length < 40000) return parts;
  // (Big decks: text cut short and only the main properties; get_slide shows the rest.)
  return parts.map(p => (p.objects ? { ...p, objects: p.objects.map(o => ({ id: o.id, type: o.type, box: o.box, ...(o.text && { text: o.text.slice(0, 80) }) })), notes: undefined } : p));
}
export function slideDetail(n, deck = state.deck) {
  const s = deck.slides[(+n | 0) - 1]; if (!s) return { error: `there is no slide ${n}` };
  return slideInfo(s, (+n | 0) - 1, true);
}

// ---- Operations ----------------------------------------------------------------------
const CHART_TYPES = ['bar', 'hbar', 'line', 'area', 'pie', 'doughnut', 'stacked', 'stacked100', 'stackedArea', 'radar', 'scatter', 'funnel', 'waterfall', 'treemap'];
export const TRANSITIONS = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom', 'push', 'wipe', 'split', 'circle', 'diamond', 'flip', 'rise', 'cube', 'cover', 'fall', 'blur', 'swirl', 'shrink', 'drop', 'flash', 'page', 'gallery'];
export const EFFECTS = Object.keys(EFFECT_KF).filter(e => !['path', 'current-visible'].includes(e));
const OBJECT_TYPES = ['text', 'shape', 'chart', 'table', 'icon', 'image'];

export const OPS_DOC = () => `Operations ("slide" numbers are 1-based and refer to the deck BEFORE your changes; ids are the objects' ids; coordinates in px inside the slide, x+w and y+h within its size):
{"op":"set_text","slide":N,"id":"…","text":"…"}   (plain text, no markdown or HTML; "- " at line starts for bullets, two more spaces before "- " for a sub-point; never type "1." or "•" yourself — a list of steps is "1. " lines; a subheading is a line ending in ":" before its bullets; at most ~6 short lines in a box: for more, or for steps, numbers, a comparison, use replace_slide/add_slide with a fitting kind)
{"op":"set_props","slide":N,"id":"…","props":{…}}  allowed props — any object: x, y, w, h, rotation (-360..360), opacity (0..100);
   text: fontSize (8..200), color "#rrggbb", fontFamily, textAlign left|center|right|justify, fontWeight "400"|"700", fontStyle normal|italic, bg "#rrggbb[aa]"|null, vAlign top|middle|bottom, lineHeight (0.8..3), wordart ${WORDART_KEYS.slice(0, 6).join('|')}…|null;
   shape: fill, stroke ("#rrggbb"|"none"), strokeWidth (0..40), shape (e.g. rect|rounded|ellipse|arrow|chevron|star); icon: color, icon; image: alt, fit contain|cover;
   chart: chartType ${CHART_TYPES.join('|')}, color, seriesName; table: stroke, headBg, headFg, band; model (3D): autoRotate true|false, spin (1..360 degrees per second), alt
{"op":"add_object","slide":N,"object":{"type":"text"|"shape"|"chart"|"table"|"icon"|"image","x":…,"y":…,"w":…,"h":…, …}}
   text: text, and text props above; shape: shape, fill, stroke, strokeWidth; chart: chartType, data [{"label":"…","value":0}], seriesName, series [{"name":"…","values":[…]}];
   table: rows [["…"]], header true|false; icon: icon (one of: ${ICON_NAMES.slice(0, 40).join(', ')}, …), color; image: src (ONLY a url from search_images), alt
{"op":"delete_object","slide":N,"id":"…"}
{"op":"set_chart_data","slide":N,"id":"…","data":[{"label":"…","value":0}],"series":[{"name":"…","values":[…]}],"seriesName":"…"}
{"op":"set_table","slide":N,"id":"…","rows":[["…","…"]],"header":true}
{"op":"set_animation","slide":N,"id":"…","effect":"${EFFECTS.slice(0, 12).join('"|"')}"|…|null,"start":"click"|"withPrev"|"afterPrev","duration":ms,"delay":ms}
{"op":"set_transition","slide":N|"all","transition":"${TRANSITIONS.join('"|"')}"|null}
{"op":"set_layout","slide":N,"layout":"<one of the slide's layouts given by get_slide>"}   (rearranges the slide's own objects)
{"op":"add_slide","after":N,"spec":{"kind":…}}     (spec as described below; after 0 = at the start)
{"op":"replace_slide","slide":N,"spec":{"kind":…}}
{"op":"delete_slide","slide":N}
{"op":"move_slide","slide":N,"to":M}
{"op":"set_notes","slide":N,"notes":"…"}
{"op":"set_hidden","slide":N,"hidden":true|false}
{"op":"set_background","slide":N|"all","color":"#rrggbb"}
{"op":"apply_palette","name":"${Object.keys(PALETTES).join('"|"')}"}   (colours of the whole deck)
{"op":"set_fonts","pair":"${Object.keys(FONT_PAIRS).join('"|"')}"}   (fonts of the whole deck)`;

// Value checkers: the value, or BAD.
const BAD = Symbol('bad');
const HEX6 = /^#[0-9a-f]{6}$/i, HEXA = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const num = (lo, hi) => v => (v !== null && v !== '' && Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : BAD);
const hex = v => (typeof v === 'string' && HEXA.test(v) ? v : BAD);
const hexOrNone = v => (v === 'none' ? 'none' : hex(v));
const hexOrNull = v => (v === null ? null : hex(v));
const oneOf = list => v => (list.includes(v) ? v : BAD);
const text = max => v => (typeof v === 'string' && v.length <= max ? v : typeof v === 'number' ? String(v) : BAD);
const bool = v => (typeof v === 'boolean' ? v : BAD);
const font = v => (typeof v === 'string' && /^[\w\s,'"-]{1,80}$/.test(v) ? v : BAD);
const PROPS = {
  any: { x: num(-4000, 4000), y: num(-4000, 4000), w: num(8, 4000), h: num(8, 4000), rotation: num(-360, 360), opacity: num(0, 100) },
  text: { fontSize: num(8, 200), color: hex, fontFamily: font, textAlign: oneOf(['left', 'center', 'right', 'justify']), fontWeight: oneOf(['400', '700', 'normal', 'bold']),
    fontStyle: oneOf(['normal', 'italic']), bg: hexOrNull, vAlign: oneOf(['top', 'middle', 'bottom']), lineHeight: num(0.8, 3), wordart: v => (v === null ? null : oneOf(WORDART_KEYS)(v)) },
  shape: { fill: hexOrNone, stroke: hexOrNone, strokeWidth: num(0, 40), shape: v => (v in SHAPE_NAMES ? v : BAD) },
  icon: { color: hex, icon: oneOf(ICON_NAMES) },
  image: { alt: text(250), fit: oneOf(['contain', 'cover']) },
  chart: { chartType: oneOf(CHART_TYPES), color: hex, seriesName: text(80) },
  table: { stroke: hex, headBg: hex, headFg: hex, band: hex },
  model: { autoRotate: bool, spin: num(1, 360), alt: text(250) },
};
// The model's text → HTML: "- " lines a list, "1." lines a numbered one, nesting by
// indentation, "Heading:" lines over their items, "Label:" in bold (features/ai/richtext.js).
export const toHTML = t => richHTML(String(t ?? ''));
const chartData = d => {
  if (!Array.isArray(d) || !d.length || d.length > 60) return BAD;
  const out = d.map(x => (Array.isArray(x) ? { label: x[0], value: x[1] } : x)).map(x => (x && typeof x === 'object' && Number.isFinite(+x.value)
    ? { label: String(x.label ?? '').slice(0, 60), value: +x.value } : BAD));
  return out.includes(BAD) ? BAD : out;
};
const chartSeries = (s, n) => {
  if (s == null) return undefined;
  if (!Array.isArray(s) || s.length > 6) return BAD;
  const out = s.map(x => (x && Array.isArray(x.values) && x.values.length <= 60 && x.values.every(v => v == null || Number.isFinite(+v))
    ? { name: String(x.name ?? '').slice(0, 60), values: x.values.slice(0, n).map(v => (v == null ? null : +v)) } : BAD));
  return out.includes(BAD) ? BAD : out;
};
const tableRows = r => {
  if (!Array.isArray(r) || !r.length || r.length > 30 || !r.every(x => Array.isArray(x) && x.length && x.length <= 10)) return BAD;
  const cols = Math.max(...r.map(x => x.length));
  return r.map(x => Array.from({ length: cols }, (_, i) => esc(String(x[i] ?? '').slice(0, 300))));
};

class Rejected extends Error { constructor(code, detail = '') { super(code); this.code = code; this.detail = detail; } }
const no = (code, detail) => { throw new Rejected(code, detail); };

// Checks the model's operations against the deck (as it is now), the scope and the
// permissions. → { ops (clean, with the slide's id in `sid`), dropped: [{ op, code, detail }] }
// ctx: { scope, perms, images (urls search_images gave), style (of the slides it makes: STYLES) }
export function validateOps(raw, { scope = { kind: 'all' }, perms = DEFAULT_PERMS, images = new Set(), style = 'same', deck = state.deck, ui = state.ui } = {}) {
  const look = STYLES.includes(style) && style !== 'same' ? { style } : {};
  const sc = scope.idx ? scope : scopeOf(scope, deck, ui), { w: W, h: H } = deck.size;
  const ops = [], dropped = [], list = Array.isArray(raw) ? raw.slice(0, 200) : [];
  for (const o of list) {
    try { ops.push(...[].concat(one(o)).map(x => ({ ...x, ok: true }))); }
    catch (e) { if (!(e instanceof Rejected)) throw e; dropped.push({ op: o, code: e.code, detail: e.detail }); }
  }
  return { ops, dropped };

  // A body placeholder rewritten with a long, structured text (numbered points,
  // labelled points, lists under headings) on a slide with nothing else: the slide
  // remade with a composition for it (numbered cards, cards, columns) — if objects may be added.
  function asComposition(s, b, text) {
    if (!perms.objects || b.ph !== 'body' || sc.kind === 'selection') return null;
    const others = s.blocks.filter(x => x !== b && !x.decorative && !x.hidden && !(x.ph && ['title', 'subtitle'].includes(x.ph)));
    if (others.some(x => x.type !== 'shape' || plain(x.html || ''))) return null;
    const title = s.blocks.find(x => x.ph === 'title' && x.type === 'text');
    return specFromText(title ? textOf(title.html) : '', text);
  }
  function slideAt(n) { const s = deck.slides[(+n | 0) - 1]; if (!s || !Number.isInteger(+n)) no('slide', String(n)); return s; }
  function inScope(s) { if (!sc.ids.has(s.id)) no('scope', `slide ${deck.slides.indexOf(s) + 1}`); }
  function blockOf(s, id) {
    const b = s.blocks.find(x => x.id === id); if (!b || typeof id !== 'string') no('id', String(id));
    if (sc.blocks && !sc.blocks.has(id)) no('scope', `object ${id}`);
    return b;
  }
  function box(b, p) {           // the object's box after the change: inside the slide
    const x = p.x ?? b.x, y = p.y ?? b.y, w = p.w ?? b.w, h = p.h ?? b.h;
    if (['x', 'y', 'w', 'h'].some(k => k in p) && (x < -1 || y < -1 || x + w > W + 1 || y + h > H + 1)) no('range', `${r0(x)},${r0(y)} ${r0(w)}×${r0(h)} in ${W}×${H}`);
  }
  function props(type, p, allowed = { ...PROPS.any, ...PROPS[type] }) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) no('value', 'props');
    const out = {};
    for (const [k, v] of Object.entries(p)) {
      if (!(k in allowed)) no('prop', `${k} (${type})`);
      const ok = allowed[k](v); if (ok === BAD) no('value', `${k}: ${JSON.stringify(v)?.slice(0, 40)}`);
      out[k] = typeof ok === 'number' && ['x', 'y', 'w', 'h', 'rotation', 'fontSize'].includes(k) ? Math.round(ok) : ok;
    }
    return out;
  }
  function one(o) {
    if (!o || typeof o !== 'object') no('op', '');
    const need = NEEDS[o.op];
    if (need && !perms[need]) no('perm:' + need, o.op);
    if (sc.kind === 'selection' && !BLOCK_OPS.includes(o.op)) no('scope', o.op);
    if (DECK_WIDE.includes(o.op) && !sc.all) no('scope', o.op);
    const s = ['set_background', 'set_transition'].includes(o.op) && o.slide === 'all' ? null
      : ['add_slide', 'apply_palette', 'set_fonts'].includes(o.op) ? null : slideAt(o.slide);
    if (s) inScope(s);
    const base = { op: o.op, ...(s && { sid: s.id, slide: deck.slides.indexOf(s) + 1 }) };
    switch (o.op) {
      case 'set_text': {
        const b = blockOf(s, o.id); if (b.type !== 'text') no('type', b.type); if (typeof o.text !== 'string') no('value', 'text');
        const text = o.text.slice(0, 4000), rich = asComposition(s, b, text);
        return rich ? { ...base, op: 'replace_slide', spec: rich, fromText: true, ...look } : { ...base, id: b.id, text };
      }
      case 'set_notes': return { ...base, notes: String(o.notes ?? '').slice(0, 8000) };
      case 'set_hidden': return { ...base, hidden: !!o.hidden };
      case 'delete_slide': if (deck.slides.length < 2) no('value', 'last slide'); return base;
      case 'move_slide': { const to = +o.to; if (!Number.isInteger(to) || to < 1 || to > deck.slides.length) no('slide', String(o.to));
        if (!sc.all && !sc.idx.includes(to - 1)) no('scope', `to ${to}`); return { ...base, to }; }
      case 'add_slide': {
        if (!o.spec || typeof o.spec !== 'object') no('value', 'spec');
        const after = +o.after | 0; if (after < 0 || after > deck.slides.length) no('slide', String(o.after));
        const ref = after ? deck.slides[after - 1] : null;
        if (ref) inScope(ref); else if (!sc.all) no('scope', 'after 0');
        // (Too much for one slide: two, one after the other.)
        return splitSpec(prepareSpec(o.spec)).map(spec => ({ op: 'add_slide', after, afterId: ref?.id || null, spec, newId: uid(), ...look }));
      }
      case 'replace_slide': {
        if (!o.spec || typeof o.spec !== 'object') no('value', 'spec');
        const [spec, ...more] = splitSpec(prepareSpec(o.spec));
        return [{ ...base, spec, ...look }, ...more.map(sp => ({ op: 'add_slide', after: base.slide, afterId: s.id, spec: sp, newId: uid(), ...look }))];
      }
      // ("all": every slide, also the ones this list adds; with a narrower scope, the scope's slides.)
      case 'set_background': if (!HEX6.test(o.color || '')) no('value', 'color');
        return s ? { ...base, color: o.color } : sc.all ? { op: o.op, all: true, color: o.color } : sc.idx.map(i => ({ op: 'set_background', sid: deck.slides[i].id, slide: i + 1, color: o.color }));
      case 'set_transition': { const tr = o.transition == null || o.transition === 'inherit' ? null : o.transition; if (tr !== null && !TRANSITIONS.includes(tr)) no('value', String(tr));
        return s ? { ...base, transition: tr } : sc.all ? { op: o.op, all: true, transition: tr } : sc.idx.map(i => ({ op: 'set_transition', sid: deck.slides[i].id, slide: i + 1, transition: tr })); }
      case 'apply_palette': if (!PALETTES[o.name]) no('value', String(o.name)); return { op: o.op, name: o.name };
      case 'set_fonts': if (!FONT_PAIRS[o.pair]) no('value', String(o.pair)); return { op: o.op, pair: o.pair };
      case 'set_layout': { const idea = designIdeas(s, deck).find(x => x.name === o.layout); if (!idea) no('value', String(o.layout)); return { ...base, layout: idea.name, changes: idea.changes }; }
      case 'set_props': {
        const b = blockOf(s, o.id);
        const p = props(b.type, o.props, { ...PROPS.any, ...(PROPS[b.type] || {}) });
        if (!Object.keys(p).length) no('value', 'props');
        box(b, p);
        return { ...base, id: b.id, props: p };
      }
      case 'delete_object': { const b = blockOf(s, o.id); return { ...base, id: b.id }; }
      case 'set_chart_data': {
        const b = blockOf(s, o.id); if (b.type !== 'chart') no('type', b.type);
        const data = chartData(o.data); if (data === BAD) no('value', 'data');
        const series = chartSeries(o.series, data.length); if (series === BAD) no('value', 'series');
        const extra = props('chart', Object.fromEntries(['chartType', 'seriesName'].filter(k => o[k] != null).map(k => [k, o[k]])), PROPS.chart);
        return { ...base, id: b.id, data, ...(series && { series }), ...extra };
      }
      case 'set_table': {
        const b = blockOf(s, o.id); if (b.type !== 'table') no('type', b.type);
        const rows = tableRows(o.rows); if (rows === BAD) no('value', 'rows');
        return { ...base, id: b.id, rows, ...(typeof o.header === 'boolean' && { header: o.header }) };
      }
      case 'set_animation': {
        const b = blockOf(s, o.id);
        if (o.effect != null && !EFFECTS.includes(o.effect)) no('value', String(o.effect));
        const start = o.start ?? 'click'; if (!['click', 'withPrev', 'afterPrev'].includes(start)) no('value', 'start');
        const duration = o.duration == null ? null : num(100, 10000)(o.duration), delay = o.delay == null ? 0 : num(0, 10000)(o.delay);
        if (duration === BAD || delay === BAD) no('value', 'duration');
        return { ...base, id: b.id, effect: o.effect ?? null, start, duration, delay };
      }
      case 'add_object': {
        const x = o.object; if (!x || typeof x !== 'object') no('value', 'object');
        if (!OBJECT_TYPES.includes(x.type)) no('type', String(x.type));
        const { type, id: _id, text: tx, data, series, rows, header, src, x: bx, y: by, w: bw, h: bh, ...rest } = x;
        const g = props(type, { x: bx, y: by, w: bw, h: bh }, PROPS.any);
        if (['x', 'y', 'w', 'h'].some(k => g[k] == null)) no('value', 'x, y, w, h');
        box(g, g);
        const p = props(type, rest, { ...PROPS.any, ...(PROPS[type] || {}) });
        const pal = currentPalette(deck), a1 = pal.accents[0];
        let b = { id: uid(), type, ...g, rotation: 0, animation: null };
        if (type === 'text') { if (typeof tx !== 'string' || !tx.trim()) no('value', 'text'); b = { ...b, fontSize: 28, html: toHTML(tx), ...p }; }
        if (type === 'shape') b = { ...b, shape: 'rect', fill: a1, stroke: a1, strokeWidth: 0, ...p };
        if (type === 'icon') { if (!ICON_NAMES.includes(p.icon)) no('value', 'icon'); b = { ...b, color: deckFg(deck), ...p }; }
        if (type === 'chart') {
          const d = chartData(data); if (d === BAD) no('value', 'data');
          const se = chartSeries(series, d.length); if (se === BAD) no('value', 'series');
          b = { ...b, chartType: 'bar', color: a1, data: d, ...(se && { series: se }), ...p };
        }
        if (type === 'table') { const rr = tableRows(rows); if (rr === BAD) no('value', 'rows');
          b = { ...b, rows: rr, header: header !== false, banded: true, band: a1, headBg: a1, headFg: '#ffffff', stroke: a1, ...p }; }
        if (type === 'image') {
          if (typeof src !== 'string' || !/^https:\/\//.test(src) || !images.has(src)) no('value', 'src');
          if (!p.alt) no('value', 'alt');
          b = { ...b, src, fit: 'contain', ...p };
        }
        return { ...base, object: b };
      }
      default: no('op', String(o.op));
    }
  }
}

// Whether a change would replace or remove something already there (text, notes,
// an object that is not an empty placeholder, a table's cells, a chart's data, a slide,
// a picture's description). Changes marked `onlyEmpty` («Solo lo vacío») that would
// are skipped when applied, whatever made them: a safety net under the proposal.
export function touchesContent(o, deck = state.deck) {
  const s = o.sid ? deck.slides.find(x => x.id === o.sid) : null, b = s && o.id ? s.blocks.find(x => x.id === o.id) : null;
  switch (o.op) {
    case 'set_text': return !!b && !!plain(b.html || '');
    case 'set_notes': { const old = String(s?.notes || '').trim(); return !!old && !String(o.notes || '').trim().startsWith(old); }
    case 'delete_object': return !!b && !isEmptyPlaceholder(b);
    case 'set_props': return !!b && 'alt' in (o.props || {}) && !!String(b.alt || '').trim() && o.props.alt !== b.alt;
    case 'set_table': return !!b && (b.rows || []).some(r => r.some(c => plain(c || '')));
    case 'set_chart_data': return !!b && (b.data || []).length > 0;
    case 'replace_slide': case 'delete_slide': return !!s && s.blocks.some(x => !isEmptyPlaceholder(x) && !x.decorative);
  }
  return false;
}

// Apply clean operations to a deck (the real one inside a commit, or a copy).
// Returns how many changed something.
export function applyTo(deck, ops) {
  const slides = deck.slides, byId = id => slides.find(s => s.id === id);
  const lastAfter = new Map();          // several slides added after the same one keep their order
  let n = 0;
  for (const o of ops) {
    const s = o.sid ? byId(o.sid) : null, b = s && o.id ? s.blocks.find(x => x.id === o.id) : null;
    if (o.sid && !s) continue;
    if (o.id && !b && o.op !== 'add_object') continue;
    if (o.onlyEmpty && touchesContent(o, deck)) continue;
    switch (o.op) {
      case 'set_text':
        // (Text that would cover a picture comes with the slide rearranged: features/ai/complete.js.)
        if (o.arrange) for (const [id, box] of Object.entries(o.arrange.boxes || {})) { const x = s.blocks.find(y => y.id === id); if (x) Object.assign(x, box); }
        // (`html`: the user's own version, edited in the proposal.)
        b.html = o.html != null ? o.html : toHTML(o.text); fitBody(b, s, deck); break;
      case 'set_notes': s.notes = o.notes; break;
      case 'set_hidden': s.hidden = o.hidden; break;
      case 'delete_slide': if (slides.length < 2) continue; slides.splice(slides.indexOf(s), 1); break;
      case 'move_slide': { const i = slides.indexOf(s); slides.splice(i, 1); slides.splice(Math.min(slides.length, o.to - 1), 0, s); break; }
      case 'add_slide': {
        const prev = lastAfter.get(o.afterId || ''), ref = o.afterId ? byId(o.afterId) : null;
        const at = prev && slides.includes(prev) ? slides.indexOf(prev) + 1 : ref ? slides.indexOf(ref) + 1 : o.afterId ? Math.min(slides.length, o.after) : 0;
        // (Like the slides around it; a style's random choices seeded by the new slide's id, so a preview and what is applied match.)
        const ns = slideFromSpec(o.spec, ref?.background || currentPalette(deck).bg, deck, { at, style: o.style, seed: o.newId });
        ns.id = o.newId; ns.sectionId = ref?.sectionId || null;
        slides.splice(at, 0, ns); lastAfter.set(o.afterId || '', ns); break;
      }
      case 'replace_slide': {
        // (A body text made into a composition: with the slide's title as it is now — maybe just changed too.)
        const t = o.fromText && s.blocks.find(x => x.ph === 'title' && x.type === 'text');
        const spec = t ? { ...o.spec, title: textOf(t.html) } : o.spec;
        rebuildSlide(s, spec, deck, { style: o.style, seed: s.id + '|' + JSON.stringify(o.spec).length }); break;
      }
      case 'set_background': (o.all ? slides : [s]).forEach(x => { x.background = o.color; }); break;
      case 'set_transition': (o.all ? slides : [s]).forEach(x => { x.transition = o.transition; }); break;
      case 'apply_palette': if (!swapPalette(o.name, deck)) continue; break;
      case 'set_fonts': if (!swapFontPair(o.pair, deck)) continue; break;
      case 'set_layout': applyIdeaTo(s, { changes: o.changes }); break;
      case 'set_props': for (const [k, v] of Object.entries(o.props)) { if (v === null) delete b[k]; else b[k] = v; } break;
      case 'delete_object': s.blocks = s.blocks.filter(x => x !== b && !(x.type === 'connector' && (x.from === b.id || x.to === b.id))); break;
      case 'add_object': s.blocks.push(structuredClone(o.object)); break;
      case 'set_chart_data': b.data = o.data.map(d => ({ ...d })); if (o.series) b.series = o.series.map(x => ({ ...x, values: [...x.values] }));
        if (o.chartType) b.chartType = o.chartType; if (o.seriesName) b.seriesName = o.seriesName; break;
      case 'set_table': b.rows = o.rows.map(r => [...r]); if (o.header != null) b.header = o.header; break;
      case 'set_animation': {
        if (!o.effect) { b.animation = null; delete b.anims; break; }
        const all = s.blocks.flatMap(x => [x.animation, ...(x.anims || [])]).filter(Boolean);
        const seq = all.reduce((m, a) => Math.max(m, a.seq ?? a.order ?? 0), 0) + 1;
        b.animation = { ...(b.animation || { order: all.length + 1, seq }), effect: o.effect, start: o.start, delay: o.delay,
          duration: o.duration ?? b.animation?.duration ?? (o.effect === 'draw' ? 1500 : 500) };
        break;
      }
      default: continue;
    }
    n++;
  }
  return n;
}

// Apply in one undo step (state.deck). Clean ops (from validateOps), or the
// model's raw ones, then checked with every permission over the whole deck.
export function applyOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return 0;
  const clean = ops.every(o => o?.ok) ? ops : validateOps(ops, { perms: Object.fromEntries(PERMS.map(p => [p, true])) }).ops;
  if (!clean.length) return 0;
  let n = 0;
  commit(() => {
    n = applyTo(state.deck, clean);
    state.ui.slideIndex = Math.min(state.ui.slideIndex, state.deck.slides.length - 1); state.ui.selection = null; state.ui.multi = [];
  });
  return n;
}
// The deck with these operations, as a copy (what the user would get).
export function previewDeck(ops, deck = state.deck) { const d = snapshot(deck); applyTo(d, ops); return d; }

// ---- Checking: text that doesn't fit, off the slide, overlaps, contrast ---------------
// Measured like the editor draws text (a hidden .block > .rich with the same styles).
let host = null;
function measureHost(deck) {
  if (!host || !host.isConnected) {
    host = document.createElement('div'); host.id = 'ai-measure'; host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;overflow:hidden';
    const st = document.createElement('style'); st.textContent = levelCSS('#ai-measure ');
    document.body.append(host); host.appendChild(st);
  }
  host.style.width = deck.size.w + 'px'; host.style.height = deck.size.h + 'px';
  host.style.color = deckFg(deck); host.style.fontFamily = deckBodyFont(deck) || '';
  return host;
}
const lum = c => { const m = String(c).match(/[\d.]+/g); if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const hexRGB = h => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(String(h || '').trim()); return m && (!m[4] || parseInt(m[4], 16) > 230) ? `rgb(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)})` : null; };
// A text block laid out: its height, and its lines' ink (slide px) with each piece's colour.
export function measureText(b, slide, deck) {
  const sb = styled(b, slide, deck), h = measureHost(deck);
  const el = document.createElement('div'); el.className = 'block';
  el.style.cssText = `position:absolute;left:0;top:0;width:${sb.w}px;height:auto`;
  const rich = document.createElement('div'); rich.className = 'rich' + (sb.levels ? ' lv' : '');
  rich.style.cssText = `height:auto;box-sizing:border-box;width:${sb.w}px;font-size:${wordartSize(sb)}px;text-align:${sb.textAlign || 'left'};padding:${textPadding(sb)};`
    + `${sb.fontFamily ? `font-family:${sb.fontFamily};` : ''}${sb.lineHeight ? `line-height:${sb.lineHeight};` : ''}${sb.letterSpacing ? `letter-spacing:${sb.letterSpacing}px;` : ''}`
    + `${sb.fontWeight ? `font-weight:${sb.fontWeight};` : ''}${sb.fontStyle ? `font-style:${sb.fontStyle};` : ''}${sb.color ? `color:${sb.color};` : ''}`
    + `${sb.columns > 1 ? `column-count:${sb.columns};column-gap:32px;` : ''}${sb.vertical ? 'writing-mode:vertical-rl;' : ''}overflow-wrap:anywhere`;
  rich.innerHTML = sb.html || '';
  el.appendChild(rich); h.appendChild(el);
  const H0 = rich.scrollHeight, W0 = rich.scrollWidth, o = el.getBoundingClientRect();
  const dy = sb.vAlign === 'middle' ? (sb.h - H0) / 2 : sb.vAlign === 'bottom' ? sb.h - H0 : 0;
  const ink = [], walk = document.createTreeWalker(rich, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (!n.textContent.trim()) continue;
    const cs = getComputedStyle(n.parentElement), fs = parseFloat(cs.fontSize), g = document.createRange(); g.selectNodeContents(n);
    for (const r of g.getClientRects()) {
      if (r.width < 1) continue;
      const mid = r.top - o.top + r.height / 2 + fs * 0.05;
      ink.push({ x: sb.x + r.left - o.left, y: sb.y + Math.max(0, dy) + mid - fs * 0.36, w: r.width, h: fs * 0.68, color: cs.color });
    }
  }
  el.remove();
  return { height: H0, width: W0, ink, sb };
}
const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const exits = b => [b.animation, ...(b.anims || [])].some(a => a && /out|path|current-visible/.test(a.effect || ''));
const snippet = b => textOf(b.html).replace(/\s+/g, ' ').slice(0, 50);
// Problems on the given slides of a deck: [{ slide, id, kind, text }]
// kind: 'overflow' (doesn't fit its box) | 'offslide' | 'overlap' | 'over' (text over a chart, table…) | 'contrast' | 'emptyph' (an empty placeholder under an object).
export function checkSlides(deck, ids = null) {
  const out = [], { w: W, h: H } = deck.size;
  deck.slides.forEach((s, si) => {
    if (ids && !ids.has(s.id)) return;
    const vis = s.blocks.filter(b => !b.hidden);
    const texts = vis.filter(b => b.type === 'text' && !b.curve && plain(b.html)).map(b => ({ b, m: measureText(b, s, deck) }));
    for (const { b, m } of texts) {
      if (m.height > b.h + 3 || m.width > b.w + 3) out.push({ slide: si + 1, id: b.id, kind: 'overflow', text: snippet(b) });
      if (m.ink.some(r => r.x < -1 || r.y < -1 || r.x + r.w > W + 1 || r.y + r.h > H + 1)) out.push({ slide: si + 1, id: b.id, kind: 'offslide', text: snippet(b) });
      // Contrast: own backing, else the solid shape or box right under its middle, else the slide's plain colour.
      if (!b.wordart && m.ink.length) {
        const cx = b.x + b.w / 2, cy = b.y + Math.min(b.h, m.height) / 2, under = vis.slice(0, vis.indexOf(b)).reverse()
          .find(x => x.x <= cx && x.x + x.w >= cx && x.y <= cy && x.y + x.h >= cy && ['shape', 'text', 'image', 'chart', 'table', 'video', 'model'].includes(x.type) && (x.type !== 'text' || x.bg));
        const bg = hexRGB(b.bg) || (under ? (under.type === 'shape' ? hexRGB(under.fill) : under.type === 'text' ? hexRGB(under.bg) : null) : hexRGB(s.background || deck.background || currentPalette(deck).bg));
        const L = bg && lum(bg);
        if (L != null) {
          const worst = Math.min(...m.ink.map(r => { const f = lum(r.color); return f == null ? 99 : (Math.max(L, f) + 0.05) / (Math.min(L, f) + 0.05); }));
          if (worst < 2.6) out.push({ slide: si + 1, id: b.id, kind: 'contrast', text: snippet(b) + ` (${worst.toFixed(1)})` });
        }
      }
    }
    for (const b of vis) if (['chart', 'table', 'code', 'math', 'poll', 'diagram', 'timer', 'shape', 'icon'].includes(b.type) && !b.decorative
      && (b.x < -2 || b.y < -2 || b.x + b.w > W + 2 || b.y + b.h > H + 2)) out.push({ slide: si + 1, id: b.id, kind: 'offslide', text: b.type });
    const T = texts.filter(x => !exits(x.b));
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      let a = 0; for (const p of T[i].m.ink) for (const q of T[j].m.ink) a += area(p, q);
      if (a > 40) out.push({ slide: si + 1, id: T[j].b.id, other: T[i].b.id, kind: 'overlap', text: `${snippet(T[i].b)} / ${snippet(T[j].b)}` });
    }
    const C = vis.filter(b => ['chart', 'table', 'image', 'code', 'poll', 'diagram', 'math'].includes(b.type) && !exits(b));
    for (const { b, m } of T) for (const c of C) {
      if (c.type === 'image' && vis.indexOf(c) < vis.indexOf(b)) continue;          // (a picture behind the text: a background)
      if (m.ink.reduce((a, r) => a + area(r, c), 0) > 200) out.push({ slide: si + 1, id: b.id, other: c.id, kind: 'over', text: `${snippet(b)} / ${c.type}` });
    }
    // An empty placeholder under an object shows its "click to add text" prompt over it.
    for (const e of vis.filter(isEmptyPlaceholder)) for (const c of vis) {
      if (c === e || isEmptyPlaceholder(c) || c.decorative || c.type === 'connector') continue;
      if (area(e, c) > 400) out.push({ slide: si + 1, id: e.id, other: c.id, kind: 'emptyph', text: `${e.ph} / ${c.type}` });
    }
  });
  return out;
}
// The problems on the slides these operations touch, once applied (on a copy);
// `before`: it was there already.
export function checkOps(ops, deck = state.deck) {
  const touched = new Set(ops.flatMap(o => [o.sid, o.newId]).filter(Boolean));
  if (ops.some(o => DECK_WIDE.includes(o.op) || o.all)) deck.slides.forEach(s => touched.add(s.id));
  if (!touched.size) return [];
  const after = previewDeck(ops, deck), before = checkSlides(deck, touched), key = p => `${p.kind}|${p.id}|${p.other || ''}`;
  const had = new Set(before.map(key));
  return checkSlides(after, touched).map(p => ({ ...p, before: had.has(key(p)) || undefined }));
}

// ---- The agent loop -----------------------------------------------------------------
const PERM_TEXT = { delete: 'delete slides', design: 'change layout, positions, sizes, colours and fonts (set_props, set_layout, set_background, apply_palette, set_fonts)',
  objects: 'add or remove objects (add_object, delete_object, replace_slide)', animation: 'change animations and transitions (set_animation, set_transition)' };
// The style the user picked for new slides, as told to the model (the slides are built in that style too: features/ai/fromspec.js).
const STYLE_TEXT = {
  same: 'New and remade slides (add_slide, replace_slide) take the deck\'s look by themselves — its layouts, fonts, colours, background and decorations: give only their content, in the kind that fits it best (steps, features, comparison, key_idea, stats, timeline… rather than bullets).',
  visual: 'Style for new and remade slides: MORE VISUAL. Prefer the kinds "features", "steps", "stats" (big numbers), "comparison", "timeline", "key_idea", "chart" (only with real data) and "quote" over "bullets"; when you use bullets, at most 4 short ones. Give every slide an "icon" that fits it. Their layout, colours and fonts are applied by themselves.',
  minimal: 'Style for new and remade slides: MINIMAL. One idea per slide, short phrases, at most 3 bullets per slide (prefer fewer), plain kinds ("title", "section", "key_idea", "quote", "bullets", "steps", "stats" with 2-3 numbers); no icons. Spacing and type size are applied by themselves.',
  animated: 'Style for new and remade slides: WITH ANIMATION. Write their content as usual: entrance animations one after another and a transition are added to them by themselves (do not add set_animation or set_transition for those slides).',
  surprise: 'Style for new and remade slides: SURPRISE ME. Vary the kinds boldly ("features", "steps", "comparison", "key_idea", "stats", "timeline", "quote", "chart" with real data…) and give each an "icon"; a layout and an animation are chosen for them by themselves, with the deck\'s colours and fonts.',
};
function systemPrompt({ sc, perms, deck, maxSteps, images, style = 'same' }) {
  const allowed = PERMS.filter(p => perms[p]), denied = PERMS.filter(p => !perms[p]);
  return `You are the assistant inside the Revela presentation editor. You PROPOSE changes as operations; the user reviews them and decides which to apply. Write "message" (and nothing else for the user) in ${lang()}, short and plain.
The slides are ${deck.size.w}×${deck.size.h} px; boxes are [x, y, w, h] from the top-left corner.
Scope: ${scopeText(sc, deck)}. Do not change anything outside it.
You may always edit texts, speaker notes, add, hide or move slides${sc.kind === 'selection' ? ' (here: only the selected objects)' : ''}.${allowed.length ? ` You may also: ${allowed.map(p => PERM_TEXT[p]).join('; ')}.` : ''}${denied.length ? ` You may NOT: ${denied.map(p => PERM_TEXT[p]).join('; ')} — those operations would be rejected.` : ''}
Answer with ONE JSON object each time, either a tool call:
{"thoughts":"…","tool":"get_slide","args":{"slide":N}}   → every object of slide N with all its properties, and the layouts set_layout accepts there
{"thoughts":"…","tool":"check","args":{"ops":[…]}}   → applies the operations to a copy and returns the problems they leave (text that doesn't fit its box, objects off the slide, overlapping texts, text over a chart or table, low contrast) and the rejected operations, with why${images ? `
{"thoughts":"…","tool":"search_images","args":{"query":"few English words"}}   → openly licensed pictures (url, title, size) you can add with add_object type "image"` : ''}
or the final answer, which ends your turn:
{"message":"…","ops":[…],"done":true}
You have at most ${maxSteps} answers in all. When you move, resize or add objects, or change text sizes, use "check" first and fix what it reports. A question gets an answer in "message" and no ops. Never invent facts or figures. Keep the deck's style (its colours and fonts) unless asked.
${STYLE_TEXT[style] || STYLE_TEXT.same}
${OPS_DOC()}
${SPEC_DOC}`;
}
// The model's answer: a tool call, or the proposal. (Smaller models wander from the format: the
// usual variants are read too — operations/changes/actions for ops, reply/answer for message, a
// proposal nested under final/result/propose, or the tool's arguments next to it.)
const OPS_KEYS = ['ops', 'operations', 'changes', 'actions', 'edits'], MSG_KEYS = ['message', 'reply', 'answer', 'response', 'text'];
const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null) return o[k]; return undefined; };
const outOf = r => {
  if (r && typeof r === 'object' && !r.tool) for (const k of ['final', 'result', 'propose', 'proposal']) if (r[k] && typeof r[k] === 'object' && !Array.isArray(r[k])) { r = { ...r[k], done: true }; break; }
  const ops = pick(r, OPS_KEYS), message = pick(r, MSG_KEYS);
  const t = r.tool || r.name || (r.done || Array.isArray(ops) || message != null ? 'propose' : null);
  const args = r.args || r.arguments || r.parameters || (r.tool || r.name ? Object.fromEntries(Object.entries(r).filter(([k]) => !['tool', 'name', 'thoughts'].includes(k))) : {});
  return { tool: t, args: t === 'propose' && !r.tool && !r.name ? { message, ops: Array.isArray(ops) ? ops : [] } : { ...args, ops: pick(args, OPS_KEYS) ?? args.ops, message: pick(args, MSG_KEYS) ?? args.message } };
};
// The model the agent works best with (tool use, long JSON), if the person didn't choose one.
export const AGENT_MODEL = 'google/gemini-2.5-flash';

// Run it. → { message, ops (clean), dropped, problems, cost: { usd, credits, calls }, steps, raw }
// onStep({ kind: 'think'|'look'|'check'|'search', slide?, step }), onCost(cost); signal: stops (Error 'STOPPED').
// style: how the slides it adds or remakes look (STYLES: 'same' | 'visual' | 'minimal' | 'animated' | 'surprise').
export async function runAgent(request, { history = [], scope = { kind: 'all' }, perms = DEFAULT_PERMS, style = 'same', maxSteps = 6, maxCredits = 60, maxUsd = 0.12,
  onStep = () => {}, onCost = () => {}, signal = null, deck = state.deck, ui = state.ui } = {}) {
  const sc = scopeOf(scope, deck, ui), images = new Set(), canSearch = perms.objects && consented('openverse');
  if (!STYLES.includes(style)) style = 'same';
  const cost = { usd: 0, credits: 0, calls: 0 }, ctx = { scope: sc, perms, images, style, deck, ui };
  const msgs = [{ role: 'system', content: systemPrompt({ sc, perms, deck, maxSteps, images: canSearch, style }) },
    ...history.slice(-6).map(({ role, content }) => ({ role, content: String(content).slice(0, 12000) })),
    { role: 'user', content: `Deck:\n${JSON.stringify(deckOutline(deck, sc))}\n\nCurrent slide: ${(ui.slideIndex || 0) + 1}\n\nRequest: ${request}` }];
  let final = null, lastChecked = null, steps = 0, asked = false;
  const stopped = () => { if (signal?.aborted) throw new Error('STOPPED'); };
  while (!final) {
    stopped();
    steps++;
    const last = steps >= maxSteps || cost.credits >= maxCredits || cost.usd >= maxUsd;
    if (last && steps > 1) msgs.push({ role: 'user', content: 'That was your last tool call: answer now with the final {"message","ops","done":true}.' });
    onStep({ kind: 'think', step: steps });
    const out = await chat(msgs, { json: true, maxTokens: 4000, signal, feature: 'assistant', prefer: AGENT_MODEL,
      onUsage: u => { cost.usd += u.usd || 0; cost.credits += u.credits || 0; } });
    cost.calls++; onCost({ ...cost });
    stopped();
    let res; try { res = parseJSON(out); } catch { res = null; }
    msgs.push({ role: 'assistant', content: String(out).slice(0, 16000) });
    if (!res || typeof res !== 'object') {
      if (last) { final = { message: String(out).slice(0, 600), ops: lastChecked || [] }; break; }
      msgs.push({ role: 'user', content: 'Answer with ONE JSON object only, as described.' }); continue;
    }
    const { tool, args } = outOf(res);
    if (!tool || tool === 'propose') {
      const ops = Array.isArray(args.ops) ? args.ops : [], message = args.message ?? '';
      // (Nothing at all — no changes and no words — is a misunderstood format: once, ask again.)
      if (!ops.length && !String(message).trim() && !asked && !last) { asked = true; msgs.push({ role: 'user', content: 'Your answer had neither "ops" nor "message". Answer with ONE JSON object: a tool call, or {"message":"…","ops":[…],"done":true}.' }); continue; }
      final = { message, ops }; break;
    }
    if (last) { final = { message: res.thoughts || res.message || '', ops: lastChecked || [] }; break; }
    let result;
    if (tool === 'get_slide') {
      onStep({ kind: 'look', slide: +args.slide | 0, step: steps });
      const s = deck.slides[(+args.slide | 0) - 1];
      result = { ...slideDetail(args.slide, deck), ...(s && { layouts: designIdeas(s, deck).map(i => i.name) }), ...(s && !sc.ids.has(s.id) && { outOfScope: true }) };
    } else if (tool === 'check') {
      onStep({ kind: 'check', step: steps });
      const v = validateOps(args.ops, ctx);
      lastChecked = args.ops;
      result = { rejected: v.dropped.map(d => ({ op: d.op?.op, slide: d.op?.slide, id: d.op?.id, why: d.code, detail: d.detail })),
        problems: checkOps(v.ops, deck).map(({ slide, id, kind, text, before }) => ({ slide, id, problem: kind, text, ...(before && { alreadyBefore: true }) })) };
      result.ok = !result.rejected.length && !result.problems.some(p => !p.alreadyBefore);
    } else if (tool === 'search_images' && canSearch) {
      onStep({ kind: 'search', step: steps });
      try {
        const found = (await searchImages(String(args.query || '').slice(0, 100))).filter(x => /^https:\/\//.test(x.url || '')).slice(0, 6);
        found.forEach(x => images.add(x.url));
        result = found.map(x => ({ url: x.url, title: x.title.slice(0, 80), width: x.width, height: x.height, license: x.license }));
      } catch (e) { result = { error: String(e.message || e).slice(0, 100) }; }
    } else result = { error: `unknown tool "${tool}"` };
    msgs.push({ role: 'user', content: `Result of ${tool}:\n${JSON.stringify(result).slice(0, 30000)}` });
  }
  const v = validateOps(final.ops, ctx);
  return { message: String(final.message ?? ''), ops: v.ops, dropped: v.dropped, problems: checkOps(v.ops, deck), cost, steps, raw: Array.isArray(final.ops) ? final.ops : [] };
}

// The one-step assistant of before, as a proposal (the panel applies what the user picks).
export const assistant = (request, history = [], opts = {}) => runAgent(request, { history, ...opts });
