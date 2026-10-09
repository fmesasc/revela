// Advanced AI authoring (PowerPoint Copilot / Gemini in Slides style), all via
// the user's OpenRouter account:
// - whole decks from a brief or from a document, with varied slide kinds laid
//   out by Revela (title, section, bullets, two columns, quote, big numbers,
//   timeline, chart with data, table, image, closing) and optional AI images;
// - improve one slide; agenda and quiz slides from the content;
// - (the assistant that proposes changes to the deck: agent.js).

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { chat, lang, parseJSON, esc, plain, generateImage } from './openrouter.js';
import { currentPalette } from '../design/palettes.js';
import { withAttachments } from './attach.js';
import { PDFJS } from '../../core/vendor.js';
import { styledSlide, hasLayouts, pictureBox, compose, contrast, codeCard, fitBody } from './fromspec.js';
import { KINDS, prepareSpec, splitSpec } from './specs.js';
import { amounts, deckQuality, weakSlides, isTechnical } from './quality.js';
export { findMedia } from './media.js';
import { codeFontSize, codeHeight, mathFontSize, AI_LANGS } from './codeobj.js';
import { richHTML } from './richtext.js';
import { pollBlock } from '../live/poll.js';
import { ICON_NAMES } from '../../render/svg.js';

// ---- Slide kinds → objects ------------------------------------------------------
export { KINDS };
export const SPEC_DOC = `Slide kinds and their fields — choose the kind that fits the content; a plain list ("bullets") only when nothing else does:
- "title": title, subtitle
- "section": title, subtitle
- "bullets": title, bullets (3-6 short phrases, max ~12 words each; no numbers, "•" or "-" inside the strings; a sub-point is a nested array right after its point)
- "steps": title, steps [{title (2-4 words), text (one sentence)}] (2-6, a process or numbered points — the numbers are drawn, do not write them)
- "features": title, items [{icon, title (2-4 words), text (one sentence)}] (2-6, benefits, reasons, key points, each with an icon)
- "comparison": title, columns [{heading, bullets}] (2-3: options, before/after, pros/cons)
- "two_columns": title, left {heading, bullets}, right {heading, bullets}
- "key_idea": title (short), statement (the one sentence to remember), text (optional, one supporting sentence)
- "quote": quote, author
- "stats": title, stats [{value (short, e.g. "42%"), label}] (1-4 items)
- "timeline": title, steps [{label (a date or phase), text}] (3-6 items)
- "agenda": title, items [short strings] (3-8)
- "chart": title, chart {type: "bar"|"line"|"pie"|"doughnut"|"area", labels [..], values [numbers], series_name}, bullets (0-2)
- "table": title, header [..], rows [[..]] (max 6 rows, max 5 columns)
- "image": title, bullets (2-4), image_prompt (a detailed description for an image generator) — or, when real pictures are searched, image_search / video_search (see below)
- "code": title, code {language: ${AI_LANGS.map(l => `"${l}"`).join('|')}, code (VERBATIM, with its line breaks and indentation) — or from_image: the id of a picture whose code was read}, caption (optional), bullets (0-4, what it does: shown in a column at its side). A real code block with highlighting — for code, queries, DAX measures, M steps, Excel formulas; never code in "bullets"
- "math": title, latex (the formula in LaTeX, no $ signs; in JSON every backslash doubled: "\\\\frac{a}{b}"), caption (optional), bullets (0-4, what each term means). A real equation — for mathematical formulas; never a formula in "bullets"
- "closing": title, subtitle
"stats", "chart" and "table" with figures also have "source": where they come from — the research's [n] or the document, or a well-established reference you are sure of ("IPCC AR6, 2021", "INE 2023"); figures made up to illustrate say so ("Datos de ejemplo") — only a dataset in a technical tutorial; never claims about the world. It is shown under them as you write it, in the deck's language: "Fuente: IPCC AR6, 2021", "Source: …", "Datos de ejemplo".
One idea per slide: when there is more, make two slides. Text is plain (no markdown, no HTML); "Label: text" items are shown with the label in bold.
Any slide may have "below": true — it then goes BELOW the previous slide, one level down (reveal.js vertical slides): an optional deeper look at that slide's idea — a worked example, the steps in detail, a diagram, a common mistake — that the presenter opens only if the audience needs it; the slides without it must tell the whole story by themselves.
Any slide may have "icon": one icon name that fits it (${ICON_NAMES.filter((_, i) => i % 3 === 0).slice(0, 45).join(', ')}, …).
Every slide also has "notes": 2-4 sentences the presenter would say. Only use real data you are given or well-known facts; never invent statistics — if unsure, use another kind instead of stats/chart.`;

const T = (x, y, w, h, fontSize, html, extra = {}) => ({ id: uid(), type: 'text', x, y, w, h, fontSize, html, rotation: 0, animation: null, ...extra });
const list = items => richHTML((items || []).filter(Boolean));
const str = v => (v == null ? '' : String(v));

// Build the objects of one slide from a spec. W×H is the deck size.
export function layoutSlide(spec, W = 1280, H = 720, pal = currentPalette()) {
  spec = prepareSpec(spec);
  const k = KINDS.includes(spec.kind) ? spec.kind : 'bullets';
  const [a1, a2] = pal.accents;
  const title = (y = 50, size = 44) => T(80, y, W - 160, 90, size, esc(str(spec.title)), { ph: 'title', fontWeight: '700' });
  const b = [];
  switch (k) {
    case 'title': case 'closing':
      b.push(T(100, H * 0.33, W - 200, 130, k === 'title' ? 66 : 58, esc(str(spec.title)), { ph: 'title', fontWeight: '700', textAlign: k === 'closing' ? 'center' : 'left' }));
      if (spec.subtitle) b.push(T(100, H * 0.33 + 145, W - 200, 70, 28, esc(str(spec.subtitle)), { ph: 'subtitle', textAlign: k === 'closing' ? 'center' : 'left' }));
      b.push({ id: uid(), type: 'shape', shape: 'rect', fill: a1, stroke: a1, strokeWidth: 0, x: k === 'closing' ? W / 2 - 60 : 100, y: H * 0.33 - 24, w: 120, h: 8, rotation: 0, animation: null, decorative: true });
      break;
    case 'section':
      b.push({ id: uid(), type: 'shape', shape: 'rect', fill: a1, stroke: a1, strokeWidth: 0, x: 0, y: 0, w: 24, h: H, rotation: 0, animation: null, decorative: true });
      b.push(T(120, H * 0.38, W - 240, 120, 56, esc(str(spec.title)), { ph: 'title', fontWeight: '700' }));
      if (spec.subtitle) b.push(T(120, H * 0.38 + 125, W - 240, 60, 26, esc(str(spec.subtitle)), { ph: 'subtitle' }));
      break;
    case 'two_columns': {
      b.push(title());
      const col = (c, x) => {
        if (!c) return;
        if (c.heading) b.push(T(x, 170, (W - 200) / 2, 60, 30, esc(str(c.heading)), { fontWeight: '700', color: a1 }));
        b.push(T(x, 235, (W - 200) / 2, H - 290, 24, list(c.bullets), { ph: 'body' }));
      };
      col(spec.left, 80); col(spec.right, W / 2 + 20);
      break;
    }
    // Comparison, key idea, steps, cards, agenda, numbers, timeline: the compositions of fromspec.js with the palette's colours.
    case 'comparison': case 'key_idea': case 'steps': case 'features': case 'agenda': case 'stats': case 'timeline': {
      b.push(title());
      const accents = pal.accents.filter(c => contrast(c, pal.bg) >= 2.2).slice(0, 4);
      const look = { fg: pal.fg, title: pal.fg, accent: accents[0] || a1, accent2: accents[1] || a2 || a1, accents: accents.length ? accents : [a1], bg: pal.bg, head: '', body: '', bodySize: 30, titleSize: 44 };
      b.push(...compose(k, spec, { x: 80, y: 170, w: W - 160, h: H - 220 }, look));
      break;
    }
    case 'quote':
      b.push(T(140, H * 0.2, 80, 120, 140, '“', { fontWeight: '700', html: `<span style="color:${a1}">“</span>` }));
      b.push(T(160, H * 0.3, W - 320, 220, 40, `<i>${esc(str(spec.quote))}</i>`, { ph: 'title', vAlign: 'middle' }));
      if (spec.author) b.push(T(160, H * 0.3 + 235, W - 320, 50, 24, '— ' + esc(str(spec.author)), { textAlign: 'right' }));
      break;
    case 'chart': {
      b.push(title());
      const c = spec.chart || {}, labels = (c.labels || []).map(str), values = (c.values || []).map(v => +v || 0);
      const side = (spec.bullets || []).length;
      b.push({ id: uid(), type: 'chart', chartType: ['bar', 'line', 'pie', 'doughnut', 'area'].includes(c.type) ? c.type : 'bar', color: a1,
        data: labels.map((l, i) => ({ label: l, value: values[i] ?? 0 })), ...(c.series_name && { seriesName: str(c.series_name) }),
        alt: str(spec.title), x: 80, y: 170, w: side ? W * 0.58 : W - 160, h: H - 230, rotation: 0, animation: null });
      if (side) b.push(T(W * 0.58 + 110, 190, W * 0.42 - 190, H - 250, 24, list(spec.bullets), { ph: 'body' }));
      break;
    }
    case 'table': {
      b.push(title());
      const header = (spec.header || []).map(str), rows = (spec.rows || []).slice(0, 6).map(r => (r || []).map(str));
      const cols = Math.min(5, Math.max(header.length, ...rows.map(r => r.length), 1));
      const all = [header, ...rows].filter(r => r.length).map(r => Array.from({ length: cols }, (_, i) => esc(r[i] ?? '')));
      b.push({ id: uid(), type: 'table', rows: all, header: !!header.length, banded: true, band: a1, headBg: a1, headFg: '#ffffff', stroke: a1,
        x: 80, y: 170, w: W - 160, h: Math.min(H - 220, 60 * all.length), rotation: 0, animation: null });
      break;
    }
    case 'image':
      b.push(title());
      b.push(T(80, 170, W * 0.45, H - 230, 26, list(spec.bullets), { ph: 'body' }));
      break;
    case 'code': case 'math':
      b.push(title());
      b.push(...codeCard(spec, { x: 80, y: 170, w: W - 160, h: H - 220 }, { fg: pal.fg, accent: a1, bodySize: 30, body: '' }));
      break;
    default:
      b.push(title());
      b.push(T(80, 170, W - 160, H - 220, 28, list(spec.bullets), { ph: 'body' }));
  }
  return b.map(x => (x.color ? (({ color, ...r }) => ({ ...r, html: `<span style="color:${color}">${r.html}</span>` }))(x) : x));
}
// A slide from a spec. In a deck with layouts it looks like the rest (features/ai/fromspec.js):
// opts { at: the index it will have, style, seed }; otherwise the objects above on `bg`.
// spec.below: under the previous slide (a «child»: reveal.js vertical slides, slides.js toggleVertical).
export const slideFromSpec = (spec, bg = currentPalette().bg, deck = state.deck, opts = {}) => below(withSource(hasLayouts(deck) ? styledSlide(spec, deck, opts) : {
  id: uid(), sectionId: null, background: bg, transition: null, hidden: false, autoSlide: 0,
  notes: str(spec.notes), blocks: layoutSlide(spec, deck.size.w, deck.size.h),
}, spec, deck), spec);
const below = (slide, spec) => { if (spec.below) slide.vertical = true; return slide; };
// Slides below others, as a deck can show them: never the first, a title, section or closing slide, nor under a
// title or section slide; at most three under one slide.
export function tidyBelow(specs) {
  let run = 0;
  specs.forEach((sp, i) => {
    const prev = specs[i - 1];
    if (sp.below && (!i || ['title', 'section', 'closing'].includes(sp.kind) || (!prev.below && ['title', 'section'].includes(prev.kind)) || run >= 3)) delete sp.below;
    run = sp.below ? run + 1 : 0;
  });
  return specs;
}
// «Fuente: …» under a slide's figures (spec.source): small, at the bottom left, in the text's colour, faint — so
// whoever sees the slide knows where the numbers come from, or that they are an example.
const sourceBlock = (spec, deck) => ({ id: uid(), type: 'text', x: Math.round(deck.size.w * 0.06), y: deck.size.h - 46, w: Math.round(deck.size.w * 0.7), h: 32, rotation: 0, animation: null,
  fontSize: 18, opacity: 75, html: esc(spec.source), aiSource: true });
function withSource(slide, spec, deck) {
  if (spec.source && ['stats', 'chart', 'table'].includes(spec.kind)) slide.blocks.push(sourceBlock(spec, deck));
  return slide;
}
// What a slide made again keeps: pictures, 3D models, videos, embeds, the camera, and the
// objects made with care — equations, code, charts, tables, diagrams (unless `remove`
// names them: the user asked for that). Never silently lost.
export const NATIVE = ['image', 'model', 'video', 'embed', 'camera', 'math', 'code', 'chart', 'table', 'diagram'];
export const isNative = b => !!b && NATIVE.includes(b.type) && !b.decorative;
// (Code and equations sized again for their new box.)
const resize = b => { if (b.type === 'code') b.fontSize = codeFontSize(b.code, b.w, b.h); if (b.type === 'math') b.fontSize = mathFontSize(b.latex, b.w, b.h); };
const hit = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
// The kept objects over the new content: the content in a left column, those stacked on the right.
function makeRoom(s, made, kept, deck) {
  // (A picture over the whole slide is its background: it stays.)
  const keep = kept.filter(b => b.w * b.h < deck.size.w * deck.size.h * 0.8);
  const content = made.filter(b => !b.decorative && !['title', 'subtitle'].includes(b.ph) && b.type !== 'placeholder');
  if (!content.length || !keep.some(k => content.some(c => hit(k, c) > 400))) return;
  const x0 = Math.min(...content.map(b => b.x)), y0 = Math.min(...content.map(b => b.y));
  const x1 = Math.max(...content.map(b => b.x + b.w)), y1 = Math.max(deck.size.h - 56, ...content.map(b => b.y + b.h)), W = x1 - x0, gap = 32;
  const lw = Math.round(W * 0.55), k = lw / W;
  for (const b of content) { b.x = Math.round(x0 + (b.x - x0) * k); b.w = Math.max(40, Math.round(b.w * k)); if (b.type === 'text') fitBody(b, s, deck); }
  // (A code block made smaller takes the caption right under it along.)
  for (const b of content.filter(x => x.type === 'code')) {
    const end = b.y + b.h; resize(b); b.h = Math.min(b.h, codeHeight(b.code, b.fontSize));
    for (const c of content) if (c.type === 'text' && c.y >= end - 2 && c.y <= end + 40 && c.x < b.x + b.w && c.x + c.w > b.x) c.y = b.y + b.h + (c.y - end);
  }
  const rx = x0 + lw + gap, rw = x1 - rx, each = (y1 - y0 - gap * (keep.length - 1)) / keep.length;
  let y = y0;
  for (const b of keep) {
    const ar = b.w && b.h ? b.w / b.h : 16 / 9, keepShape = ['image', 'model', 'video', 'embed', 'camera'].includes(b.type);
    let w = rw, h = keepShape ? w / ar : Math.min(each, b.h);
    if (h > each) { h = each; if (keepShape) w = h * ar; }
    Object.assign(b, { x: Math.round(rx + (rw - w) / 2), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    resize(b);
    y += h + gap;
  }
}
// The same slide made again from a spec (what isNative keeps stays, made room for).
// opts: { style, seed, remove (ids the user asked to remove) }
export function rebuildSlide(s, spec, deck = state.deck, opts = {}) {
  const drop = new Set(opts.remove || []), keep = s.blocks.filter(b => isNative(b) && !drop.has(b.id));
  let made;
  if (hasLayouts(deck)) {
    const ns = styledSlide(spec, deck, { ...opts, at: deck.slides.indexOf(s), self: s });
    made = ns.blocks;
    Object.assign(s, { layoutId: ns.layoutId, background: ns.background });
    if (opts.style && opts.style !== 'same' && ns.transition) s.transition = ns.transition;
    if (ns.hideMaster) s.hideMaster = true; else delete s.hideMaster;
  } else made = layoutSlide(spec, deck.size.w, deck.size.h, currentPalette(deck));
  s.blocks = [...made.filter(b => !b.aiSource), ...keep.filter(b => !b.aiSource)];
  makeRoom(s, made, keep, deck);
  withSource(s, spec, deck);
  if (spec.notes) s.notes = str(spec.notes);
}

// ---- Whole decks -----------------------------------------------------------------
// The designs (features/design/gallery.js) the AI may choose for a new deck: key → what it suits.
export const DECK_DESIGNS = { corporate: 'business, reports, clean and neutral', academic: 'research, papers, conferences, sober and editorial',
  minimal: 'any topic, very clean, lots of white', tech: 'technology, software, data, dark', education: 'school lessons, friendly',
  pitch: 'startups, products, bold', warm: 'humanities, stories, culture', ocean: 'science, health, calm blue', night: 'keynotes, dark and elegant',
  mono: 'magazine style, editorial, strong typography' };
// opts: { topic, source (document text), count, audience, tone, language, images, palette,
//   attachments (pictures: attach.js — a PDF's figures among them, marked figure: true) }
// → specs (with .title and .design: one of DECK_DESIGNS, for a new deck).
// Before writing (as Gamma's research): the model searches the internet for current, reliable facts on the topic and
// writes a short brief with them, citing [n] the pages it used — which go on a «Fuentes» slide at the end.
// → { brief, sources: [{ title, url }] }
export async function research(opts = {}) {
  let sources = [];
  const brief = await chat([
    { role: 'system', content: `You research a topic for a presentation. Search the web and write a factual brief of 200-450 words: the key facts, figures with their year, definitions and examples a presenter needs, from reliable sources (official bodies, studies, encyclopedias, quality press). Mark each fact with the number of its source like [1]. No opinion, no filler. Write in ${opts.language || lang()}.` },
    { role: 'user', content: [opts.topic && `Topic: ${opts.topic}`, opts.audience && `Audience: ${opts.audience}`].filter(Boolean).join('\n') || String(opts.source || '').slice(0, 2000) },
  ], { maxTokens: 1500, feature: 'research', web: true, onSources: s => { sources = s.slice(0, 10); } });
  if (!brief.trim()) throw new Error('EMPTY');
  return { brief: brief.trim(), sources };
}
// The «Fuentes» slide: the pages the research used (title and address), for whoever wants to check them.
export const sourcesSpec = (sources, title) => ({ kind: 'bullets', title, bullets: sources.slice(0, 8).map((x, i) => `[${i + 1}] ${x.title ? x.title + ' — ' : ''}${x.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 90)}`),
  notes: sources.map((x, i) => `[${i + 1}] ${x.title} ${x.url}`).join('\n') });
// The model's JSON answer: asked once more if it doesn't come as JSON (now and then a model answers with something
// else, and the whole deck failed with «EMPTY»).
async function chatJSON(msgs, opts) {
  for (let i = 0; ; i++) {
    const out = await chat(msgs, { ...opts, json: true });
    try { const r = parseJSON(out); if (r && typeof r === 'object') return r; } catch (e) { if (i) throw e; }
    if (i) throw new Error('EMPTY');
  }
}
// What every deck needs said, for the outline and for the slides: what Revela can put on a slide, so that the model
// doesn't make every slide a list. A deck made by gpt-4o-mini from an outline — title and two copied points on every
// slide, on «Swift» without one line of code — is what this is against.
export const RICH = `Use the richest kind that fits each slide — a list ("bullets") only when nothing else does, and then 3-5 real points with substance, never 2 vague ones:
- A programming language, a library, a tool, a query language or any technical topic: show REAL CODE on "code" slides — correct, idiomatic, compilable, 4-15 lines, with a comment or two —, at least one slide in three; each concept with its code (declare, use, a common mistake and its fix…), "comparison" for "this vs that", "steps" for how to set it up.
- Maths or science: "math" for the formulas; data you are given: "chart", "table" or "stats".
- History, evolution: "timeline". Processes: "steps". Parts, benefits, reasons: "features". One central claim: "key_idea". A famous phrase: "quote".
- Every slide teaches something concrete: facts, examples, names — never "Inclou millores" or "Fàcil d'usar" alone.
- Numbers ("stats", "chart", figures in a table or a text) ONLY from the person's data, the document or the research given. Never invent a figure: use another kind; and when the deck needs the person's own figures (their sales, their results), put placeholders in brackets for them to fill in, like "[ventas del trimestre]".
- The figures of the person's own organisation (its sales, budget, results, staff, targets) can only come from them: unless they were given, ALWAYS placeholders — never a figure with a "source" like "internal data", which you don't have.
- Never make up specifics that weren't given: names (a client, a hospital, a person, a company), results, percentages, costs or dates of the person's own case. Use what they gave; when a slide needs something specific they didn't give, a placeholder in brackets ("[nombre del cliente]", "[resultado de la validación]").
- Placeholders are for facts of the person's own case only. To EXPLAIN something — a worked example, an exercise, a sample table, «3/4 of a pizza» — make up simple, concrete numbers and names: a gap there ("[fracción comida por Juan]") teaches nothing.
- On the person's own case, every figure — in a text or a note too — is theirs or worked out from theirs: don't add shares, percentages or causes they didn't give ("the client was 25 % of the region's sales").
- Facts about the world (the climate, a market, history) are not the person's own case: use real, well-known figures with their source ("IPCC AR6", "AEMET", "INE 2023") rather than a slide of gaps. Gaps only for what only the person can know — and never more than two on a slide.
- No forecasts, projections or estimates of your own: a figure for what hasn't happened yet (next quarter's sales, a growth to come) only when the person gave it; else a placeholder ("[previsión de ventas del T4]"). Figures worked out from theirs (a difference, a percentage) are fine.
- Placeholders in plain words of the deck's language, with spaces — "[objetivo de crecimiento del sur]", never "[objetivo_crecimiento_sur]".
- A "chart" only for a real series of numbers to compare — never to illustrate an idea. "code" only when the audience writes or reads code — never as decoration on another topic.`;
// The model for writing whole decks (unless the person chose one): a capable one, not the cheapest of the list.
const DECK_MODEL = 'google/gemini-2.5-flash';
const withResearch = (source, r) => (r ? `${source ? source + '\n\n' : ''}Research brief from the web (current facts; keep their [n] marks in the notes when you use them):\n${r.brief}` : source);

// Before the outline, a few questions about this very case — what a good speechwriter would ask before writing:
// for a class, the course and what they know; for a results meeting, the figures and the decision sought; for a thesis
// defence, the time and the committee… With options to pick in a click, and room for more. → [{ q, options, multi }]
export async function askAbout(opts = {}) {
  const out = await chat([
    { role: 'system', content: `Someone is about to have a presentation made. Before planning it, ask them the 3-4 questions whose answers would most change it — specific to THIS topic and case, never generic ones they already answered (the topic, the audience, the tone and the number of slides are given). Think of: the purpose and what the audience should do or know afterwards; who exactly listens and what they already know; the time and setting; their own data, examples, names or constraints the slides must use; what must not be missing. Each with 2-5 short options to pick (they may still write their own). Answer only JSON {"questions":[{"q":"…","options":["…"],"multi":false}]}. Write in ${opts.language || lang()}.` },
    { role: 'user', content: [opts.topic && `Topic: ${opts.topic}`, opts.audience && `Audience: ${opts.audience}`, opts.tone && `Tone: ${opts.tone}`, opts.count && `Slides: about ${opts.count}`,
      opts.source && `They also gave a document (excerpt): ${String(opts.source).slice(0, 1500)}`].filter(Boolean).join('\n') },
  ], { json: true, maxTokens: 1200, feature: 'outline', prefer: DECK_MODEL });
  return (parseJSON(out)?.questions || []).filter(x => x && str(x.q).trim()).slice(0, 4)
    .map(x => ({ q: str(x.q).trim().slice(0, 200), options: (Array.isArray(x.options) ? x.options : []).map(o => str(o).trim().slice(0, 80)).filter(Boolean).slice(0, 5), multi: !!x.multi }));
}
// What the person answered, for the outline and the slides: a case to tailor everything to.
export const contextOf = answers => (answers || []).filter(a => str(a.answer).trim()).map(a => `- ${a.q ? a.q + ' ' : ''}${str(a.answer).trim()}`).join('\n').slice(0, 3000);
const TAILOR = ctx => (ctx ? `\n\nAbout this presentation, from the presenter — tailor EVERYTHING to it (the level, the length, the examples from their own context, their figures and names instead of gaps, the outcome they want in the closing):\n${ctx}` : '');

// First the outline (as Gemini, Gamma or Copilot do): one line per slide — its title and its key points —, for the
// person to read, change, reorder or cut before the slides are made (createDeck with opts.outline). Cheap and quick.
// → { title, slides: [{ title, points: [] }] }
// Pictures on the deck: generated (opts.images) or real ones searched (opts.media 'search': media.js).
const pictures = opts => !!(opts.images || opts.media === 'search');
const SEARCHED = `- Real pictures and videos will be searched for you. Use 2-4 "image" slides where SEEING explains what the slide says: the thing itself, a labelled diagram, a map, the artwork, a historical photo, the experiment. Give each "image_search": 2-5 words in ENGLISH, the name of the thing as an encyclopedia would title its picture — not a description ("chloroplast diagram", "Battle of Adrianople map", "Hadrian's Wall", "Pythagorean theorem proof"; not "two pizzas of different sizes cut in thirds"), and something that exists in Wikimedia Commons: not a screenshot of an app, a custom architecture diagram or the person's own things, and bullets (1-3) with what to notice in it. Never for an abstract idea ("teamwork", "success", "innovation"), the person's own data, or code.
- When turning it around helps to understand it (an organ, a skeleton, a cell, a molecule, a crystal, a monument, a fossil, a machine, a spacecraft, a planet), one "image" slide has instead "model_search": 2-4 English words naming the object ("human heart anatomy", "DNA double helix", "Parthenon", "Mars rover") — an interactive 3D model will be searched; bullets (1-3) on what to look at when turning it.
- When something is better seen moving (a process, an experiment, a phenomenon, a tool in use), one "image" slide has instead "video_search": a short video that shows what words can't (a process, an experiment, an animation, a demo), in 2-5 English words ("photosynthesis animation"); bullets (1-2) on what to watch for.
- No image_prompt.`;
export async function createOutline(opts = {}) {
  const count = Math.max(3, Math.min(30, +opts.count || 8)), src = withResearch(opts.source, opts.research);
  const source = src ? `\n\nBase it ONLY on this document:\n"""\n${String(src).slice(0, 60000)}\n"""` : '';
  const out = await chatJSON([
    { role: 'system', content: `Plan a presentation that someone will present out loud. Answer only JSON {"title":"…","slides":[{"title":"…","kind":"…","points":["…"]}]}: about ${count} slides, in order, the first a title slide ("title") and the last a closing one ("closing"). Each title states the slide's message (max ~9 words); "kind" is the kind of slide that will show it best — one of: ${KINDS.filter(k => pictures(opts) || k !== 'image').join(', ')}; 1-4 points with WHAT it will show, concretely (the facts, figures and examples; for a "code" slide, what the code does and in which language). Not a list of short phrases: a plan for rich slides.
- For the 1-3 ideas hardest to understand (about 6 slides or more), right after that slide plan 1-2 with "below": true — they go under it, one level down, an optional deeper look (a worked example, the steps in detail, a diagram, a common mistake) that the presenter opens only if needed. The others never; never the first or the last.
${RICH}
${opts.media === 'search' ? `- REQUIRED: 2-4 slides of kind "image", where SEEING the thing explains it — a labelled diagram, a map, the artwork, the place, the object, the experiment —, when something is better seen moving — a process, an experiment, a phenomenon, a demo of a tool — one of them a short video, and when it is understood by turning it around — an organ, a molecule, a monument, a machine, a planet — one an interactive 3D model; its points say what must be seen. (Only a topic with nothing to see — pure code, a company's own figures — may have none.)\n` : ''}Write in ${opts.language || lang()}.` },
    { role: 'user', content: withAttachments([opts.topic && `Topic and purpose: ${opts.topic}`, opts.audience && `Audience: ${opts.audience}`, opts.tone && `Tone: ${opts.tone}`].filter(Boolean).join('\n') + TAILOR(opts.context) + source, opts.attachments || []) },
  ], { maxTokens: 3000, feature: 'outline', prefer: DECK_MODEL });
  const res = out, slides = (res.slides || []).filter(x => x && str(x.title).trim()).slice(0, 40)
    .map(x => ({ title: str(x.title).trim(), ...(KINDS.includes(x.kind) && (pictures(opts) || x.kind !== 'image') && { kind: x.kind }), ...(x.below === true && { below: true }), points: (Array.isArray(x.points) ? x.points : []).map(str).map(p => p.trim()).filter(Boolean).slice(0, 6) }));
  if (!slides.length) throw new Error('EMPTY');
  // (A «code» slide planned for a topic that isn't programming — a lesson on fractions —: worked out as steps.)
  if (!isTechnical(opts.topic)) for (const x of slides) if (x.kind === 'code') x.kind = 'steps';
  return { title: str(res.title), slides };
}
export async function createDeck(opts = {}) {
  const plan = Array.isArray(opts.outline) && opts.outline.length ? opts.outline : null;
  const count = plan ? plan.length : Math.max(3, Math.min(30, +opts.count || 8));
  const brief = [opts.topic && `Topic and purpose: ${opts.topic}`, opts.audience && `Audience: ${opts.audience}`, opts.tone && `Tone: ${opts.tone}`,
    plan ? `Follow THIS outline, reviewed by the presenter: exactly ${plan.length} slides, in this order, one per item, each with its title (shortened only if too long), of the kind in [brackets] when there is one, and DEVELOPING its points — they say what the slide shows, they are not its text: turn them into full content (the code itself, the steps, the comparison, real examples):\n${plan.map((x, i) => `${i + 1}. ${x.below ? '(BELOW the previous one: "below": true) ' : ''}${x.kind ? `[${x.kind}] ` : ''}${x.title}${x.points?.length ? '\n' + x.points.map(p => `   - ${p}`).join('\n') : ''}`).join('\n')}`
      : `Number of slides: about ${count}`].filter(Boolean).join('\n') + TAILOR(opts.context);
  const src = withResearch(opts.source, opts.research);
  const source = src ? `\n\nBase the content ONLY on this document (keep its real facts, figures and terms; leave out references and acknowledgements):\n"""\n${String(src).slice(0, 60000)}\n"""` : '';
  const pics = (opts.attachments || []).filter(a => a.kind === 'image'), figs = pics.map((a, i) => (a.figure ? i + 1 : 0)).filter(Boolean);
  const out = await chatJSON([
    { role: 'system', content: `You are an expert presentation designer and speechwriter. Write a deck that someone will PRESENT out loud: few words on the slides, the speech in the notes. Answer only JSON: {"title":"…","design":"<one of: ${Object.entries(DECK_DESIGNS).map(([k, v]) => `${k} (${v})`).join('; ')}>","slides":[{"kind":"…",…}]}.
${SPEC_DOC}
How to make it good:
- Titles say the slide's message, as a short statement (max ~9 words): "Monolithic simulators are hard to adapt", not "Limitations".
- Start with a "title" slide (subtitle: who / where, if the document says), end with a "closing" slide. At most one "section" slide every 6 slides, and none in decks under 12 slides.
- Vary the kinds; a "bullets" slide at most every third slide, with 3-5 points. Use "key_idea" for the central claims, "steps" for processes, "comparison" for before/after, "features" for components.
${RICH}
- "stats" and "chart" ONLY with real, meaningful numbers from the source (never counts like "1 scenario"); otherwise another kind.
- "notes" on EVERY slide: what the speaker says, 3-6 natural spoken sentences (60-110 words) in first person, with the details and transitions that are not on the slide.
- Slides below (decks of 6 slides or more): for the 1-3 ideas that are hardest to understand, right after the slide that states the idea add 1-2 slides with "below": true that go deeper — a worked example with real numbers, the steps one by one, a diagram, a frequent mistake and why. They are optional: the presenter goes down only if the audience needs it, so the main slides alone must still make sense; the main slide's notes end offering it ("if it isn't clear, below there is an example"), and the notes of a slide below end going back up. Never for easy ideas, the title or the closing.
${figs.length ? `- The document's own figures are attached (${figs.map(n => `attachment:${n}`).join(', ')}): show each important one on its own slide, kind "image" with "figure": N (the attachment's number) — its title says what it shows, bullets (0-2) the key point; no image_prompt.` : ''}
${opts.media === 'search' ? SEARCHED : opts.images ? '- Use 1-3 "image" slides with an image_prompt for generated pictures.' : figs.length ? '' : '- Do not use "image" slides.'}
Write everything in ${opts.language || lang()}.` },
    { role: 'user', content: withAttachments(brief + source + (pics.some(a => !a.figure)
      ? '\n\nThe attached pictures (notes, a whiteboard, slides, a document\'s pages, photos): base the deck on what they show — read their text and figures — together with the rest.' : ''), opts.attachments || []) },
  ], { maxTokens: 16000, feature: 'create', prefer: DECK_MODEL });
  const res = out;
  // (Cleaned, and what is too much for one slide in two.)
  const specs = (res.slides || []).filter(s => s && typeof s === 'object').slice(0, 40).flatMap(s => splitSpec(prepareSpec(s)));
  if (!specs.length) throw new Error('EMPTY');
  // (The outline's slides below keep their place, whatever the model wrote; then only where a deck can show them.)
  if (plan && specs.length === plan.length) specs.forEach((sp, i) => { if (plan[i].below) sp.below = true; else delete sp.below; });
  // (Section slides as the instructions say, whatever the model did: none in a short deck, at most one every six.)
  for (let i = specs.length - 1, last = Infinity; i >= 0; i--) {
    if (specs[i].kind !== 'section') continue;
    if (specs.length < 12 || last - i < 6) specs.splice(i, 1); else last = i;
  }
  // (A figure only where there is one; a model that forgot the notes of many slides is asked for them once.)
  for (const sp of specs) { const n = +sp.figure; if (!(n >= 1 && n <= pics.length && pics[n - 1]?.figure)) delete sp.figure; else sp.figure = n; }
  // (A picture slide with no picture to come — none asked for, no figure of the document —: its points, as a list.)
  for (const sp of specs) if (sp.kind === 'image' && !sp.figure && !(opts.images && sp.image_prompt) && !(opts.media === 'search' && (sp.image_search || sp.video_search || sp.model_search))) { sp.kind = 'bullets'; delete sp.image_prompt; delete sp.image_search; delete sp.video_search; delete sp.model_search; }
  const missing = specs.filter(sp => !str(sp.notes).trim());
  if (missing.length > specs.length * 0.3) await speakerNotes(specs, opts).catch(() => {});
  // Measured (quality.js): a weak deck — mostly lists, thin ones, no code on a technical topic — gets its weak slides
  // made again, once, before anyone sees it.
  const how = { topic: opts.topic || str(res.title), sourced: !!(str(opts.source) || opts.research || /\d/.test(str(opts.context))), images: pictures(opts), given: (opts.attachments || []).length ? '' : [opts.context, opts.source, opts.research?.brief].map(str).join('\n').trim() };   // (the data as text — not when it came in a file the measure can't read)
  const belowAt = specs.map(sp => !!sp.below);                // (the fixes below replace some specs: their place is kept)
  let q = deckQuality(specs, how); specs.qualityFirst = q;
  if (q.score < 80 || q.problems.some(p => ['invented-figures', 'off-code', 'no-picture', 'repeated'].includes(p.code))) {
    // (Made again, but kept only if better: a second pass sometimes turned good cards into lists.)
    const before = specs.slice(), was = q;
    await richer(specs, weakSlides(q, specs), opts, q).catch(() => {}); q = deckQuality(specs, how);
    if (q.score < was.score) { specs.splice(0, specs.length, ...before); q = was; }
  }
  // The last net, not up to the model: figures still without anything behind them are never shown as facts — on cards,
  // each value becomes a gap to fill in («[1.200.000 €]»); a chart, a list with a gap for each of its data.
  // (Code on a topic that isn't programming — sums worked out as comments —: its lines, as a list.)
  const offCode = q.problems.find(p => p.code === 'off-code');
  if (offCode) {
    for (const i of offCode.slides) {
      const sp = specs[i], lines = str(sp.code?.code).split('\n').map(l => l.replace(/^\s*(\/\/+|#+|--|\/\*+|\*+\/?)\s?/, '').trim()).filter(l => l && !/^[{}()[\];]+$/.test(l)).slice(0, 7);
      // (Two to six lines worked out one after another — a sum, a method — read as numbered steps; more, as a list.
      // As a list, a lesson on fractions came out half lists.)
      // (More than six: the last ones together in the sixth step.)
      if (lines.length >= 2) specs[i] = { kind: 'steps', title: sp.title, steps: [...lines.slice(0, 5), lines.slice(5).join(' · ')].filter(Boolean).map(l => ({ text: l })), notes: sp.notes };
      else if (lines.length) specs[i] = { kind: 'bullets', title: sp.title, bullets: [...lines, ...(sp.bullets || [])].slice(0, 8), notes: sp.notes };
    }
    q = deckQuality(specs, how);
  }
  const still = q.problems.find(p => p.code === 'invented-figures');
  if (still) {
    for (const i of still.slides) {
      const sp = specs[i];
      // (A figure the person gave stays: «T3: 2.400.000», «Proyección T4: [ventas]».)
      const keep = v => amounts(how.given).some(k => Math.abs(k - +v) <= Math.abs(+v) * 0.01);
      if (sp.kind === 'stats') sp.stats = (sp.stats || []).map(s => (/\d/.test(s.value) && !/\[[^\]]+\]/.test(s.value) && !amounts(s.value).every(keep) ? { ...s, value: `[${s.value}]` } : s));
      // (A chart's data, as a table to fill in — as a list, it made a deck half lists.)
      else if (sp.kind === 'chart') { const c = sp.chart || {}; specs[i] = { kind: 'table', title: sp.title, header: ['', str(c.series_name) || '…'], rows: (c.labels || []).slice(0, 6).map((l, k) => [str(l), keep(c.values?.[k]) ? String(c.values[k]) : `[${str(c.series_name) || '…'}]`]), notes: sp.notes }; }
      delete specs[i].source;
    }
    q = deckQuality(specs, how);
  }
  specs.forEach((sp, i) => { if (belowAt[i]) sp.below = true; });
  // (A slide that came back with nothing — not even after making it again —: out; an empty slide is worse than none.)
  const blank = q.problems.find(p => p.code === 'empty');
  if (blank) { for (const i of [...blank.slides].sort((a, b) => b - a)) specs.splice(i, 1); q = deckQuality(specs, how); }
  tidyBelow(specs);
  specs.title = str(res.title); specs.design = DECK_DESIGNS[res.design] ? res.design : null; specs.quality = q;
  return specs;
}
// Whether a slide has something to show besides its title.
const hasContent = sp => ['bullets', 'stats', 'steps', 'items', 'columns', 'rows'].some(k => Array.isArray(sp[k]) && sp[k].length)
  || !!(sp.left || sp.statement || sp.quote || sp.latex || sp.chart || (sp.code && (sp.code.code || typeof sp.code === 'string')) || MID_KINDS.includes(sp.kind));
const MID_KINDS = ['title', 'section', 'closing'];
// The weak slides made again (one request for all): the same message and place, a richer kind, real content.
async function richer(specs, idx, opts = {}, q = null) {
  if (!idx.length) return;
  // (Each with what's wrong with it, as the measure says.)
  const why = i => (q?.problems || []).filter(p => p.slides?.includes(i)).map(p => p.detail).join('; ');
  const want = idx.map(i => ({ i, ...(why(i) && { problem: why(i) }), ...specs[i] }));
  const out = await chat([
    { role: 'system', content: `These slides of a presentation are weak (each one says why in "problem"): mostly lists, thin, without the code a technical topic needs, with invented figures, code where it doesn't belong, or saying again what another slide says (then it must say something new: the next step of the talk, an example worked out, a common mistake…). Make each one again — the same message (its title may be sharpened), in the richest kind that fits, with real, concrete content. Answer only JSON {"slides":[{"i":N,"kind":"…",…,"notes":"…"}]}, one per slide given, with its own i.
${SPEC_DOC}
${RICH}
Do not use "image". Write in ${opts.language || lang()}.` },
    { role: 'user', content: `Presentation: ${str(opts.topic).slice(0, 400)}\nAll its titles, in order: ${JSON.stringify(specs.map(sp => sp.title || sp.statement || ''))}\n\nSlides to make again: ${JSON.stringify(want).slice(0, 30000)}` },
  ], { json: true, maxTokens: 12000, feature: 'create', prefer: DECK_MODEL });
  for (const s of parseJSON(out)?.slides || []) {
    const i = +s.i; if (!idx.includes(i) || !s || typeof s !== 'object') continue;
    const [sp] = splitSpec(prepareSpec(s)); if (!sp || sp.kind === 'image' || !hasContent(sp)) continue;   // (one that came back empty: the old one stays)
    if (!str(sp.notes)) sp.notes = specs[i].notes;
    if (specs[i].below) sp.below = true; else delete sp.below;   // (made again in the same place)
    specs[i] = sp;
  }
}
// Notes for the slides that have none: what the speaker says (one request for all of them).
async function speakerNotes(specs, opts = {}) {
  const want = specs.map((sp, i) => (str(sp.notes).trim() ? null : { i, kind: sp.kind, title: sp.title || sp.statement || sp.quote || '', text: JSON.stringify(sp).slice(0, 700) })).filter(Boolean);
  const out = await chat([
    { role: 'system', content: `Write the speaker notes of these slides of a talk: what the presenter says out loud, 3-6 natural sentences (60-110 words) each, first person, with transitions between slides. Only facts from the slides and the source. Answer only JSON {"notes":[{"i":N,"title":"<the slide's title, as given>","notes":"…"}]}, one per slide given, with its own i. Write in ${opts.language || lang()}.` },
    { role: 'user', content: `Talk: ${str(opts.topic).slice(0, 300)}\n${opts.source ? `Source (excerpt):\n${String(opts.source).slice(0, 20000)}\n` : ''}\nSlides: ${JSON.stringify(want)}` },
  ], { json: true, maxTokens: 6000, feature: 'notes', prefer: DECK_MODEL });
  // (By its title when the model says it: a model that skipped or renumbered one put every note after it on the next
  // slide — what a slide said in its notes was the following one's.)
  const norm = v => str(v).toLowerCase().replace(/\s+/g, ' ').trim(), titleOf = sp => norm(sp.title || sp.statement || sp.quote || '');
  for (const n of parseJSON(out)?.notes || []) {
    if (!str(n.notes).trim()) continue;
    let k = +n.i;
    if (n.title && specs[k] && titleOf(specs[k]) !== norm(n.title)) { const j = specs.findIndex(sp => titleOf(sp) === norm(n.title)); if (j >= 0) k = j; }
    if (specs[k] && !str(specs[k].notes).trim()) specs[k].notes = str(n.notes).trim();
  }
}
// Insert generated specs after the current slide (images are generated after).
// figures: the source document's figures (attach.js pdfFigures), for the specs that name one ("figure": N).
export async function insertSpecs(specs, { images = false, onProgress, figures = [] } = {}) {
  // (A picture found for it — media.js — goes where a document's figure goes, with its description and credit; a
  // video, in the same place, 16:9.)
  const fig = sp => (sp.figure ? figures[sp.figure - 1] : sp.picture ? { full: sp.picture.src, w: sp.picture.w, h: sp.picture.h, caption: sp.picture.alt, credit: sp.picture.caption, link: sp.picture.credit }
    : sp.video ? { video: sp.video, w: sp.video.w || 16, h: sp.video.h || 9 } : sp.model ? { model: sp.model, w: sp.model.kind === 'model' ? 1 : 4, h: sp.model.kind === 'model' ? 1 : 3 } : null);
  for (const sp of specs) if (fig(sp)) sp.figureRatio = fig(sp).w / fig(sp).h;
  const at0 = state.ui.slideIndex + 1, made = specs.map(sp => slideFromSpec(sp, undefined, state.deck, { at: at0 }));
  // (Each figure in its place: the slide's picture box, the whole figure seen.)
  made.forEach((slide, i) => {
    const f = fig(specs[i]); if (!f) return;
    const box = pictureBox(slide) || { x: Math.round(state.deck.size.w * 0.52), y: 170, w: Math.round(state.deck.size.w * 0.42), h: state.deck.size.h - 230 };
    const k = Math.min(box.w / f.w, box.h / f.h), w = Math.round(f.w * k), h = Math.round(f.h * k);
    slide.blocks = slide.blocks.filter(b => !(b.type === 'placeholder' && b.ph === 'picture'));
    const at = { x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y + (box.h - h) / 2), w, h };
    // (A free video of Commons is a video of the deck; YouTube's, its player; a 3D model, NASA's downloaded — it turns
    // by itself, and with the mouse —, Sketchfab's in its viewer.)
    const own = x => ({ ...(x.caption && { caption: str(x.caption) }), ...(x.credit && { credit: str(x.credit) }) });
    if (f.video) { slide.blocks.push({ id: uid(), type: f.video.file ? 'video' : 'embed', src: f.video.src, alt: str(f.video.title), rotation: 0, animation: null, ...at, ...own(f.video) }); return; }
    if (f.model) { slide.blocks.push({ id: uid(), type: f.model.kind === 'model' ? 'model' : 'embed', src: f.model.src, alt: str(f.model.alt), rotation: 0, animation: null, ...at, ...own(f.model),
      ...(f.model.kind === 'model' ? { autoRotate: true } : { display: 'frame' }) }); return; }
    slide.blocks.push({ id: uid(), type: 'image', src: f.full, alt: str(f.caption || f.name), fit: 'contain', rotation: 0, animation: null, ...at,
      ...(f.credit && { caption: str(f.credit) }), ...(f.link && { credit: str(f.link) }) });
  });
  commit(() => {
    const at = state.ui.slideIndex + 1, sec = currentSlide()?.sectionId || null;
    made.forEach(s => (s.sectionId = sec));
    state.deck.slides.splice(at, 0, ...made);
    state.ui.slideIndex = at; state.ui.selection = null;
  });
  if (images) {
    const withImg = specs.map((s, i) => [s, made[i]]).filter(([s]) => s.kind === 'image' && s.image_prompt && !fig(s));
    for (let k = 0; k < withImg.length; k++) {
      const [sp, slide] = withImg[k];
      const idx = state.deck.slides.indexOf(slide); if (idx < 0) continue;
      state.ui.slideIndex = idx;
      try {
        const id = await generateImage(str(sp.image_prompt), '4:3');
        const b = currentSlide().blocks.find(x => x.id === id), { w: W } = state.deck.size, box = pictureBox(slide);
        // (In the picture's place when the slide has one: as big as fits, 4:3.)
        const at = box ? (() => { const w = Math.min(box.w, box.h * 4 / 3), h = w * 3 / 4; return { x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y + (box.h - h) / 2), w: Math.round(w), h: Math.round(h) }; })()
          : { x: Math.round(W * 0.52), y: 170, w: Math.round(W * 0.42), h: Math.round(W * 0.42 * 3 / 4) };
        if (b) commit(() => { Object.assign(b, at); slide.blocks = slide.blocks.filter(x => !(x.type === 'placeholder' && x.ph === 'picture')); }, { history: false });
      } catch (e) { if (e.message === 'NO_CREDIT' || e.message === 'BAD_KEY') throw e; }
      onProgress?.((k + 1) / withImg.length);
    }
  }
  return made.length;
}

// Text of a document the user gives (txt/md, or PDF through pdf.js).
export async function readDocument(file) {
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const pdfjs = await import(`${PDFJS}/pdf.min.mjs`);
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 80); i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      pages.push(tc.items.map(it => it.str).join(' '));
    }
    return pages.join('\n\n');
  }
  return file.text();
}

// ---- One slide -------------------------------------------------------------------
const slideText = s => s.blocks.map(b => (b.type === 'text' ? plain(b.html) : b.type === 'table' ? b.rows.map(r => r.map(plain).join(' | ')).join('\n')
  : b.type === 'chart' ? `[chart: ${(b.data || []).map(d => `${d.label}=${d.value}`).join(', ')}]` : '')).filter(Boolean).join('\n');

export async function improveSlide(slide = currentSlide()) {
  const out = await chat([
    { role: 'system', content: `Improve this slide: clearer, better structured, richer, and choose the best kind. Keep the facts and the language of the slide. Answer only one slide as JSON {"kind":…}.\n${SPEC_DOC}\n${RICH}\nDo not use "image".` },
    { role: 'user', content: `Presentation: ${str(state.deck.name).slice(0, 200)}\nCurrent slide:\n${slideText(slide)}\n\nNotes: ${slide.notes || ''}` },
  ], { json: true, maxTokens: 3000, feature: 'improve', prefer: DECK_MODEL });
  const spec = parseJSON(out); if (!spec || !spec.kind) throw new Error('EMPTY');
  commit(() => { rebuildSlide(slide, spec, state.deck); state.ui.selection = null; });
  return spec.kind;
}

// Design ideas by the AI (PowerPoint Designer's "more ideas"): three new
// arrangements of what the slide already has — the same objects, moved,
// resized, aligned; texts may get a size, an alignment and a backing colour.
// Checked here: only this slide's objects, inside the slide, pictures keep
// their proportions. Same shape as features/design/designer.js ideas.
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
export function checkIdeas(raw, slide, W = 1280, H = 720) {
  const byId = new Map(slide.blocks.map(b => [b.id, b])), num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : null);
  return (Array.isArray(raw?.ideas) ? raw.ideas : []).slice(0, 4).map(idea => {
    const changes = {};
    for (const [id, c] of Object.entries(idea?.blocks || {})) {
      const b = byId.get(id); if (!b || !c || typeof c !== 'object') continue;
      const w = num(c.w, 20, W), h = num(c.h, 20, H), x = num(c.x, 0, W - 20), y = num(c.y, 0, H - 20); if ([w, h, x, y].includes(null)) continue;
      const ch = { x: Math.min(x, W - w), y: Math.min(y, H - h), w, h };
      if (['image', 'video', 'model'].includes(b.type) && b.w && b.h) ch.h = Math.round(w * b.h / b.w);          // (pictures keep their shape)
      if (ch.y + ch.h > H) { ch.h = H - ch.y; if (['image', 'video', 'model'].includes(b.type)) ch.w = Math.round(ch.h * b.w / b.h); }
      if (b.type === 'text') {
        if (num(c.fontSize, 10, 160) != null) ch.fontSize = num(c.fontSize, 10, 160);
        if (['left', 'center', 'right'].includes(c.textAlign)) ch.textAlign = c.textAlign;
        if (HEX.test(c.bg || '')) { ch.bg = c.bg; ch.radius = num(c.radius, 0, 40) ?? 8; }
      }
      changes[id] = ch;
    }
    return { name: String(idea?.name || '').slice(0, 40) || 'IA', changes, ai: true };
  }).filter(i => Object.keys(i.changes).length);
}
export async function redesignIdeas(slide = currentSlide(), deck = state.deck) {
  const { w: W, h: H } = deck.size;
  const list = slide.blocks.filter(b => !b.hidden && b.type !== 'connector').map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, w: b.w, h: b.h,
    ...(b.type === 'text' && { text: plain(b.html || '').slice(0, 120), fontSize: b.fontSize || 40, ...(b.ph && { role: b.ph }) }) }));
  if (!list.length) throw new Error('EMPTY');
  const out = await chat([
    { role: 'system', content: `You are a presentation designer. Propose 3 clearly different, professional layouts for this ${W}x${H} slide, using ONLY its existing objects (move and resize them; do not add or remove any). Principles: strong visual hierarchy (the title prominent), generous margins (at least 48 px), aligned edges on a grid, consistent spacing, no overlapping texts, a picture may fill a whole side or the background. Texts may get "fontSize", "textAlign" ("left"|"center"|"right") and "bg" (a #rrggbbaa backing colour, for text over pictures). Give each layout a short name in ${lang()}. Answer JSON only: {"ideas":[{"name":"…","blocks":{"<id>":{"x":0,"y":0,"w":0,"h":0,"fontSize":40,"textAlign":"left","bg":"#00000099"}}}]}` },
    { role: 'user', content: `Background: ${slide.background || deck.background || '?'}\nObjects:\n${JSON.stringify(list)}` },
  ], { json: true, maxTokens: 2500, feature: 'redesign' });
  const ideas = checkIdeas(parseJSON(out), slide, W, H);
  if (!ideas.length) throw new Error('EMPTY');
  return ideas;
}

// One line of live captions, translated for the audience (while presenting from the editor).
const TO = { es: 'Spanish', en: 'English', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ca: 'Catalan', gl: 'Galician', eu: 'Basque', nl: 'Dutch', ar: 'Arabic', zh: 'Chinese', uk: 'Ukrainian', ro: 'Romanian' };
export async function translateLine(text, to) {
  if (!TO[to] || !String(text || '').trim()) return null;
  const out = await chat([{ role: 'system', content: `Translate the user's text (spoken, live captions) into ${TO[to]}. Answer with the translation only.` },
    { role: 'user', content: String(text).slice(0, 600) }], { maxTokens: 300, feature: 'translate' });
  return String(out || '').trim().slice(0, 800) || null;
}

// Agenda (from the section / title slides) or a quiz from the content.
export async function addAgenda() {
  const titles = state.deck.slides.filter(s => !s.hidden).map(s => plain(s.blocks.find(b => b.type === 'text')?.html || '')).filter(Boolean);
  const out = await chat([
    { role: 'system', content: `Write an agenda slide for a talk with these slide titles: group them into 3-6 agenda items. Answer only JSON {"kind":"agenda","title":…,"items":[…],"notes":…} in ${lang()}.` },
    { role: 'user', content: titles.join('\n') },
  ], { json: true, maxTokens: 800, feature: 'agenda' });
  const spec = parseJSON(out);
  commit(() => { state.deck.slides.splice(1, 0, slideFromSpec({ ...spec, kind: 'agenda' }, undefined, state.deck, { at: 1 })); state.ui.slideIndex = 1; });
}
export async function addQuiz(n = 3) {
  const text = state.deck.slides.filter(s => !s.hidden).map(slideText).join('\n---\n').slice(0, 40000);
  const out = await chat([
    { role: 'system', content: `Write ${n} multiple-choice review questions about this presentation, in ${lang()}. Answer only JSON {"questions":[{"question":…,"options":[4 strings],"answer":index,"explanation":…}]}.` },
    { role: 'user', content: text },
  ], { json: true, maxTokens: 2500, feature: 'quiz' });
  const qs = (parseJSON(out).questions || []).slice(0, 10);
  if (!qs.length) throw new Error('EMPTY');
  const { w: W, h: H } = state.deck.size, pal = currentPalette();
  const slides = qs.flatMap((q, i) => {
    const opts = (q.options || []).slice(0, 4).map(str), L = 'ABCD';
    const question = { id: uid(), sectionId: null, background: pal.bg, transition: null, hidden: false, autoSlide: 0, notes: str(q.explanation),
      blocks: [T(80, 50, W - 160, 110, 36, `<b>${i + 1}. ${esc(str(q.question))}</b>`, { ph: 'title' }),
        ...opts.map((o, k) => T(80 + (k % 2) * (W / 2 - 60), 200 + Math.floor(k / 2) * 190, W / 2 - 100, 160, 26,
          `<b>${L[k]}</b>  ${esc(o)}`, { vAlign: 'middle', bg: pal.accents[k % pal.accents.length], radius: 12 }))] };
    const ok = Math.max(0, Math.min(opts.length - 1, +q.answer || 0));
    const answer = { ...question, id: uid(), blocks: question.blocks.map(b => ({ ...b, id: uid() })) };
    answer.blocks.forEach((b, k) => { if (k > 0 && k - 1 !== ok) b.opacity = 30; });
    answer.blocks.push(T(80, H - 90, W - 160, 60, 22, `✔ ${esc(str(q.explanation))}`, {}));
    return [question, answer];
  });
  commit(() => { state.deck.slides.push(...slides); state.ui.slideIndex = state.deck.slides.length - slides.length; });
  return qs.length;
}

// A quiz the audience answers from their phones (as Prezi's, from the deck's content): real polls — questions with
// their right answer and points, and activities (match, order, fill the gaps) —, each on its own slide, at the end
// or after each part. opts: { count, kinds: ['quiz', 'match', 'order', 'gaps'], where: 'end' | 'spread' } → how many.
export async function addLiveQuiz(opts = {}) {
  const n = Math.max(1, Math.min(15, +opts.count || 5)), kinds = (opts.kinds || ['quiz']).filter(k => ['quiz', 'match', 'order', 'gaps'].includes(k));
  const shown = state.deck.slides.map((s, i) => [s, i]).filter(([s]) => !s.hidden);
  const text = shown.map(([s, i]) => `[slide ${i + 1}]\n${slideText(s)}`).join('\n---\n').slice(0, 40000);
  const out = await chat([
    { role: 'system', content: `Make ${n} items to check what an audience understood of this presentation, in ${lang()}, answered live from their phones. Kinds allowed: ${kinds.join(', ')} (mix them). Only facts from the slides.
Answer only JSON {"items":[…]}, each one of:
- {"kind":"quiz","question":"…","options":["…"(2-4, short)],"answer":index of the right one,"after":slide number it is about}
- {"kind":"match","question":"…","pairs":[["left","right"],…(3-5)],"after":N}
- {"kind":"order","question":"…","steps":["first","second",…(3-6, in the right order)],"after":N}
- {"kind":"gaps","question":"…","text":"A sentence with the [missing] [words] in brackets","after":N}` },
    { role: 'user', content: text },
  ], { json: true, maxTokens: 4000, feature: 'quiz' });
  const items = (parseJSON(out).items || []).filter(x => x && kinds.includes(x.kind)).slice(0, n);
  const { w: W, h: H } = state.deck.size, pal = currentPalette();
  const poll = x => {
    const base = { question: str(x.question).slice(0, 200) || '?', x: 80, y: 60, w: W - 160, h: H - 120, fontSize: 30 };
    if (x.kind === 'quiz') { const o = (x.options || []).map(str).filter(Boolean).slice(0, 4); if (o.length < 2) return null;
      return pollBlock({ ...base, kind: 'quiz', options: o, correct: [Math.max(0, Math.min(o.length - 1, +x.answer || 0))], time: 20 }); }
    if (x.kind === 'match') { const o = (x.pairs || []).filter(p => Array.isArray(p) && p.length === 2).map(([a, b]) => `${str(a).replace(/=/g, '-')} = ${str(b).replace(/=/g, '-')}`).slice(0, 6); return o.length > 1 ? pollBlock({ ...base, kind: 'match', options: o }) : null; }
    if (x.kind === 'order') { const o = (x.steps || []).map(str).filter(Boolean).slice(0, 8); return o.length > 2 ? pollBlock({ ...base, kind: 'order', options: o }) : null; }
    const tx = str(x.text); return /\[[^\]]+\]/.test(tx) ? pollBlock({ ...base, kind: 'gaps', text: tx.slice(0, 600), options: [] }) : null;
  };
  const made = items.map(x => [x, poll(x)]).filter(([, b]) => b)
    .map(([x, b]) => [Math.max(1, Math.min(state.deck.slides.length, Math.round(+x.after) || state.deck.slides.length)),
      { id: uid(), sectionId: null, background: pal.bg, transition: 'fade', hidden: false, autoSlide: 0, blocks: [b],
        notes: x.kind === 'quiz' ? `${str(x.question)} → ${str((x.options || [])[+x.answer || 0])}` : str(x.question) }]);
  if (!made.length) throw new Error('EMPTY');
  commit(() => {
    if (opts.where === 'spread') {                     // (each after the slide it asks about: from the last, so the places hold)
      for (const [after, s] of made.map((m, k) => [...m, k]).sort((a, b) => b[0] - a[0] || b[2] - a[2])) { const at = Math.min(state.deck.slides.length, after); s.sectionId = state.deck.slides[at - 1]?.sectionId || null; state.deck.slides.splice(at, 0, s); }
      state.ui.slideIndex = Math.min(...made.map(([a]) => a));
    } else { state.deck.slides.push(...made.map(([, s]) => s)); state.ui.slideIndex = state.deck.slides.length - made.length; }
  });
  return made.length;
}

// Open answers marked against criteria (as Curipod's rubric feedback): for each one, a mark from 0 to 10 and a short,
// kind comment for the student — what's good and one thing to improve. answers: [{ id, text }] → [{ id, score, feedback }].
export async function gradeOpen(question, rubric, answers) {
  const list = (answers || []).filter(x => x && String(x.text || '').trim()).slice(0, 60).map(x => ({ id: String(x.id), text: String(x.text).slice(0, 400) }));
  if (!list.length) return [];
  const out = await chat([
    { role: 'system', content: `You are a teacher marking short answers to a question asked in class. For each answer give a mark from 0 to 10 and a short, encouraging comment (max 25 words) in the second person, addressed to the student: what is right and one concrete thing to improve. ${rubric ? 'Mark against these criteria:\n' + String(rubric).slice(0, 2000) : 'Mark how right, complete and clear it is.'} Answer only JSON {"marks":[{"id":"…","score":N,"feedback":"…"}]}, in ${lang()}.` },
    { role: 'user', content: `Question: ${String(question || '').slice(0, 500)}\nAnswers: ${JSON.stringify(list)}` },
  ], { json: true, maxTokens: 4000, feature: 'grade' });
  const ok = new Set(list.map(x => x.id));
  return (parseJSON(out).marks || []).filter(m => m && ok.has(String(m.id)))
    .map(m => ({ id: String(m.id), score: Math.max(0, Math.min(10, Math.round(+m.score) || 0)), feedback: str(m.feedback).slice(0, 300) }));
}

// A review of the whole deck (as Copilot's «Review presentation»): what a good editor would point out, slide by
// slide — the message not clear, too much text, a title that says nothing, inconsistent terms or figures, spelling,
// pictures without alternative text, a missing ending… → [{ slide, kind, issue, fix }] (slide: its number).
export const REVIEW_KINDS = ['message', 'text', 'structure', 'consistency', 'spelling', 'accessibility', 'design'];
export async function reviewDeck() {
  const shown = state.deck.slides.map((s, i) => [s, i]).filter(([s]) => !s.hidden);
  const alt = s => s.blocks.filter(b => ['image', 'model', 'video'].includes(b.type) && !b.decorative && !str(b.alt).trim()).length;
  const text = shown.map(([s, i]) => `[slide ${i + 1}] ${s.blocks.length} objects${alt(s) ? `, ${alt(s)} picture(s) without alternative text` : ''}\n${slideText(s)}${s.notes ? `\n(notes: ${plain(s.notes).slice(0, 400)})` : ''}`).join('\n---\n').slice(0, 50000);
  const out = await chat([
    { role: 'system', content: `You review a presentation before it is given, as a demanding but kind editor. Point out only what is worth changing (at most 15), the most important first: a slide whose message isn't clear, too much text to read while listening, titles that say nothing ("Introduction", "Results") instead of the message, inconsistent terms, names or figures between slides, spelling and grammar, missing structure (no opening, no ending, no agenda in a long talk), pictures without alternative text, slides that should be split or merged. Answer only JSON {"summary":"one or two sentences on the whole","items":[{"slide":N or 0 for the whole deck,"kind":"${REVIEW_KINDS.join('|')}","issue":"what's wrong, short","fix":"what to do, concrete (the new title or wording when it applies)"}]}, in ${lang()}.` },
    { role: 'user', content: text },
  ], { json: true, maxTokens: 4000, feature: 'review' });
  const res = parseJSON(out);
  return { summary: str(res.summary), items: (res.items || []).filter(x => x && str(x.issue).trim()).slice(0, 20)
    .map(x => ({ slide: Math.max(0, Math.min(state.deck.slides.length, Math.round(+x.slide) || 0)), kind: REVIEW_KINDS.includes(x.kind) ? x.kind : 'message', issue: str(x.issue), fix: str(x.fix) })) };
}

// The audience's questions, to rehearse (Decktopus' Q&A practice): what people would likely ask after this talk —
// to clarify, to go deeper, sceptical, practical —, each with the points a good answer covers and the slide it comes
// from (0: none) → [{ q, kind, points, slide }]. And a spoken (or typed) answer, judged → { score, good, improve, better }.
export const QUESTION_KINDS = ['clarify', 'deeper', 'critical', 'practical'];
export async function predictQuestions(n = 8) {
  const shown = state.deck.slides.map((s, i) => [s, i]).filter(([s]) => !s.hidden);
  const text = shown.map(([s, i]) => `[slide ${i + 1}]\n${slideText(s)}${s.notes ? `\n(notes: ${plain(s.notes).slice(0, 600)})` : ''}`).join('\n---\n').slice(0, 50000);
  const out = await chat([
    { role: 'system', content: `You prepare a presenter for the questions after their talk. From the slides and notes, list the ${n} questions the audience is most likely to ask, the hardest included: `
      + `a mix of kinds — clarify (something not clear), deeper (beyond what was said), critical (sceptical, an objection), practical (how to apply it, cost, time). `
      + `For each: the question as someone in the audience would say it; its kind; the 2–4 key points a good answer covers (from the presentation when it has them; when it doesn't, say what the answer needs); and the number of the slide it comes from (0 if none). `
      + `Write in ${lang()}. Answer only JSON: {"questions":[{"q":"…","kind":"clarify","points":["…"],"slide":3}]}` },
    { role: 'user', content: text },
  ], { json: true, maxTokens: 3000, feature: 'review' });
  return (parseJSON(out).questions || []).filter(x => x && str(x.q).trim()).slice(0, 15).map(x => ({ q: str(x.q).slice(0, 300), kind: QUESTION_KINDS.includes(x.kind) ? x.kind : 'clarify',
    points: (Array.isArray(x.points) ? x.points : []).map(p => str(p).slice(0, 200)).filter(Boolean).slice(0, 5), slide: Math.max(0, Math.min(state.deck.slides.length, Math.round(+x.slide) || 0)) }));
}
export async function judgeAnswer(question, points, answer) {
  const out = await chat([
    { role: 'system', content: `You coach a presenter practising their answers to audience questions. Judge the answer (often spoken and transcribed: ignore filler words and missing punctuation): `
      + `does it answer the question, cover the key points, stay brief and clear (about 30–90 seconds spoken), keep calm and respectful with a critical question? `
      + `Give a mark from 0 to 10, what was good (one sentence), what to improve (one or two sentences), and a better answer of at most 70 words in the presenter's voice. `
      + `In ${lang()}, addressing the presenter as «tú» or its equivalent. Answer only JSON: {"score":7,"good":"…","improve":"…","better":"…"}` },
    { role: 'user', content: `Question: ${str(question).slice(0, 400)}\nKey points: ${(points || []).map(str).join(' | ').slice(0, 800)}\nAnswer: ${str(answer).slice(0, 4000)}` },
  ], { json: true, maxTokens: 800, feature: 'review' });
  const r = parseJSON(out);
  return { score: Math.max(0, Math.min(10, Math.round(+r.score) || 0)), good: str(r.good).slice(0, 400), improve: str(r.improve).slice(0, 500), better: str(r.better).slice(0, 800) };
}

// The assistant (proposals, scope, permissions, its operations): features/ai/agent.js.
