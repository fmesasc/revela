// «Completar la presentación»: a half-made deck — pictures (often screenshots) placed,
// titles and text empty — written from what its pictures show and the deck's context.
// Cheap so it can be run again and again: each picture is described once by a small
// vision model (features/ai/vision.js, cached on the block); the slides are then
// written in one text-only request per ~12 slides, from those descriptions and a
// short brief (deck.aiBrief: what it is about, for whom, what to take away). The
// result is a proposal — operations for the assistant panel, applied only if picked.
// "Only the empty": never overwrites what the author wrote (also checked when applied). When text goes next to a
// picture the slide is rearranged so nothing overlaps (part of that text's change).

import { state, commit } from '../../core/store.js';
import { chat, lang, parseJSON, plain, aiSettings, usingCloudAi } from './openrouter.js';
import { cleanTitle, cleanLine } from './richtext.js';
import { textOf, checkOps, measureText, AGENT_MODEL } from './agent.js';
import { styleKind, isEmptyPlaceholder } from '../document/master.js';
import { describeImages, captionOf, VISION_MODEL, BATCH } from './vision.js';

export const MODES = ['empty', 'improve'];
export const LAYOUTS = ['image-right', 'image-left', 'image-full-caption', 'keep'];
export const CHUNK = 12;

// ---- The brief --------------------------------------------------------------------------
export const briefOf = (deck = state.deck) => (deck.aiBrief && String(deck.aiBrief.topic || '').trim() ? deck.aiBrief : null);
export function saveBrief({ topic = '', audience = '', takeaway = '' } = {}) {
  const clip = (v, n) => String(v || '').trim().slice(0, n);
  commit(() => { state.deck.aiBrief = { topic: clip(topic, 600), audience: clip(audience, 300), takeaway: clip(takeaway, 400), date: new Date().toISOString().slice(0, 10) }; });
  return state.deck.aiBrief;
}
const phText = (s, kind) => textOf(s.blocks.find(b => styleKind(b) === kind)?.html || '').trim();
const firstSentence = t => (String(t || '').replace(/\s+/g, ' ').trim().match(/^.{10,240}?[.!?](?=\s|$)/) || [String(t || '').trim().slice(0, 240)])[0];
// A first guess from the deck: its title, agenda (or its slides' titles), notes, a conclusions slide.
export function guessBrief(deck = state.deck) {
  const s0 = deck.slides[0], titles = deck.slides.map(s => phText(s, 'title').split('\n')[0]).filter(Boolean);
  const agenda = deck.slides.find(s => /agenda|[íi]ndice|contenidos?|temario|programa|sumario|outline|summary|contents/i.test(phText(s, 'title')));
  const items = (agenda ? phText(agenda, 'body').split('\n') : titles.slice(1)).map(l => l.replace(/^[-•\s]+/, '').trim()).filter(Boolean);
  const head = [s0 && phText(s0, 'title').split('\n')[0] || (deck.name && !/sin título|untitled/i.test(deck.name) ? deck.name : ''), s0 && phText(s0, 'subtitle').split('\n')[0]].filter(Boolean).join(' — ');
  const notes = deck.slides.map(s => String(s.notes || '').trim()).filter(Boolean);
  const about = notes.find(n => /charla|presentaci|curso|taller|sesi[oó]n|clase|talk|course|workshop|session|lesson/i.test(n));
  const topic = [head + ([...new Set(items)].length ? `: ${[...new Set(items)].slice(0, 8).join(', ')}` : ''), about && firstSentence(about)].filter(Boolean).join('. ').slice(0, 600);
  const aud = notes.join(' ').match(/(?:dirigid[oa]s? a|destinad[oa]s? a|pensad[oa]s? para|aimed at|intended for|for an audience of)\s+([^.;\n]{4,90})/i);
  const end = deck.slides.find(s => /conclusi|resumen|en resumen|takeaway|key points|recap/i.test(phText(s, 'title')));
  return { topic, audience: aud ? aud[1].trim() : '', takeaway: end ? (phText(end, 'body').split('\n').map(l => l.replace(/^[-•\s]+/, '')).filter(Boolean).slice(0, 3).join('; ')).slice(0, 300) : '' };
}

// ---- What there is to do ------------------------------------------------------------------
const VISIBLE = b => !b.hidden;
const isPicture = b => b.type === 'image' && b.src && !b.decorative && b.w >= 60 && b.h >= 60;
// A slide as this feature sees it: its title and body placeholders, pictures, other objects.
function partsOf(s) {
  const vis = s.blocks.filter(VISIBLE);
  const title = vis.find(b => styleKind(b) === 'title'), bodies = vis.filter(b => styleKind(b) === 'body'), body = bodies[0] || null;
  const images = vis.filter(isPicture);
  const others = vis.filter(b => !b.ph && !images.includes(b) && !b.decorative && !(b.type === 'image' && !isPicture(b)) && (b.type !== 'text' || plain(b.html)) && b.type !== 'connector');
  return { title, body, bodies, images, others, titleText: title ? textOf(title.html).trim() : '', bodyText: body ? textOf(body.html).trim() : '', notes: String(s.notes || '').trim() };
}
// The slides to write: { s, i, p, want: { title, body, notes } }. (In "only the empty": the slides with something empty.)
export function targetsOf({ scope = { kind: 'all' }, mode = 'empty', deck = state.deck, ui = state.ui } = {}) {
  const n = deck.slides.length, cur = Math.max(0, Math.min(ui.slideIndex || 0, n - 1));
  let idx = deck.slides.map((_, i) => i);
  if (scope.kind === 'current' || scope.kind === 'selection') idx = [cur];
  if (scope.kind === 'range') { const a = Math.max(1, Math.min(n, +scope.from || 1)), b = Math.max(1, Math.min(n, +(scope.to ?? scope.from) || 1)); idx = idx.filter(i => i + 1 >= Math.min(a, b) && i + 1 <= Math.max(a, b)); }
  const out = [];
  for (const i of idx) {
    const s = deck.slides[i]; if (s.hidden && scope.kind === 'all') continue;
    const p = partsOf(s), improve = mode === 'improve';
    const want = { title: !!p.title && (improve || !p.titleText), body: !!p.body && (improve || !p.bodyText), notes: improve || !p.notes };
    if (want.title || want.body || want.notes) out.push({ s, i, p, want });
  }
  return out;
}
// The pictures of those slides without a description of the picture they have now.
export const toDescribe = targets => targets.flatMap(x => x.p.images.filter(b => !captionOf(b)).map(b => ({ b, slide: x.i + 1 })));

// ---- Cost --------------------------------------------------------------------------------
// The account's prices (server/cloudflare/wrangler.toml AI_PRICES, per million tokens) and a credit's worth (CREDIT_USD).
export const PRICES = { [VISION_MODEL]: [0.1, 0.4], [AGENT_MODEL]: [0.3, 2.5] };
export const CREDIT_USD = 0.002;
const IMG_TOKENS = 1100, SLIDE_IN = 260, SLIDE_OUT = 230;
// Before running: { images (to describe), cached, slides, calls, usd, credits } (an upper estimate).
export function estimateCompletion(opts = {}) {
  const targets = targetsOf(opts), imgs = toDescribe(targets), cached = targets.reduce((n, x) => n + x.p.images.length, 0) - imgs.length;
  const calls = [];
  for (let k = 0; k < imgs.length; k += BATCH.count) { const m = Math.min(BATCH.count, imgs.length - k); calls.push([VISION_MODEL, 300 + m * IMG_TOKENS, 60 + m * 170]); }
  const n = opts.deck?.slides.length ?? state.deck.slides.length;
  for (let k = 0; k < targets.length; k += CHUNK) { const m = Math.min(CHUNK, targets.length - k); calls.push([AGENT_MODEL, 700 + n * 18 + m * SLIDE_IN, 80 + m * SLIDE_OUT]); }
  const usdOf = ([model, i, o]) => (i * PRICES[model][0] + o * PRICES[model][1]) / 1e6;
  return { images: imgs.length, cached, slides: targets.length, calls: calls.length,
    usd: calls.reduce((a, c) => a + usdOf(c), 0), credits: calls.reduce((a, c) => a + Math.max(1, Math.ceil(usdOf(c) / CREDIT_USD)), 0),
    account: usingCloudAi() && !aiSettings().key };
}

// ---- Layout: text beside the picture, nothing overlapping --------------------------------------
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const hits = (a, b) => overlap(a, b) > Math.min(400, 0.02 * Math.min(a.w * a.h, b.w * b.h));
const R = b => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
// A picture's proportions: its own (from when it was described) unless it is cropped or framed.
const aspectOf = b => { const c = b.aiCaption; return !b.crop && !b.device && b.fit !== 'cover' && c?.nw && c?.nh ? c.nw / c.nh : b.w / b.h; };
// Pictures fitted (keeping proportions) side by side, or one over the other, centred in an area.
function fitPictures(images, area, gap = 16) {
  const row = area.w >= area.h, n = images.length, out = {};
  const cw = row ? (area.w - gap * (n - 1)) / n : area.w, ch = row ? area.h : (area.h - gap * (n - 1)) / n;
  images.forEach((b, k) => {
    const a = aspectOf(b), w = Math.min(cw, ch * a), h = w / a;
    const cx = row ? area.x + k * (cw + gap) : area.x, cy = row ? area.y : area.y + k * (ch + gap);
    out[b.id] = R({ x: cx + (cw - w) / 2, y: cy + (ch - h) / 2, w, h });
  });
  return out;
}
// The boxes for a layout → { [id]: {x,y,w,h} } (the pictures and the body), or null when it can't be done.
export function arrangeSlide(s, layout, deck = state.deck) {
  const { w: W, h: H } = deck.size, p = partsOf(s), t = p.title, gap = 32;
  if (!p.images.length || p.others.length) return null;
  const top = t ? t.y + Math.max(t.h, plain(t.html) ? measureText(t, s, deck).height : 0) + 16 : 40,     // (a title longer than its box: from where its text ends)
     side = Math.max(40, Math.min(t?.x ?? 80, p.body?.x ?? 80));
  let area = p.body ? R(p.body) : { x: side, y: top, w: W - 2 * side, h: H - 40 - top };
  if (p.bodies.length > 1 && layout === 'image-full-caption') {
    const x0 = Math.min(...p.bodies.map(b => b.x)), y0 = Math.min(...p.bodies.map(b => b.y));
    area = { x: x0, y: y0, w: Math.max(...p.bodies.map(b => b.x + b.w)) - x0, h: Math.max(...p.bodies.map(b => b.y + b.h)) - y0 };
  }
  area.y = Math.max(area.y, top); area.x = Math.max(0, area.x); area.w = Math.min(area.w, W - area.x);
  area.h = layout === 'image-full-caption' || layout === 'image-full' ? H - 28 - area.y : Math.min(area.h, H - 24 - area.y);     // (a large picture: down to the margin)
  if (area.w < 200 || area.h < 120) return null;
  const boxes = {};
  if (layout === 'image-right' || layout === 'image-left') {
    if (!p.body) return null;
    let text, pics;
    if (p.bodies.length > 1) {                     // (two content placeholders: text in one, the picture in the other)
      const [a, b] = [...p.bodies].sort((m, n) => m.x - n.x);
      [text, pics] = layout === 'image-right' ? [R(a), R(b)] : [R(b), R(a)];
      if (overlap(text, pics)) return null;
    } else {
      const tw = Math.round(area.w * 0.42);
      text = layout === 'image-right' ? { ...area, w: tw } : { ...area, x: area.x + area.w - tw, w: tw };
      pics = layout === 'image-right' ? { ...area, x: area.x + tw + gap, w: area.w - tw - gap } : { ...area, w: area.w - tw - gap };
    }
    boxes[p.body.id] = text; Object.assign(boxes, fitPictures(p.images, pics));
  } else if (layout === 'image-full-caption') {
    if (!p.body) return null;
    const ch = 56;
    Object.assign(boxes, fitPictures(p.images, { ...area, h: area.h - ch - 10 }));
    const bottom = Math.max(...p.images.map(b => boxes[b.id].y + boxes[b.id].h));
    boxes[p.body.id] = R({ x: area.x, y: bottom + 10, w: area.w, h: ch });
  } else Object.assign(boxes, fitPictures(p.images, area));      // 'image-full': the pictures under the title
  return boxes;
}

// ---- The writing pass ---------------------------------------------------------------------
const SYSTEM = ({ language, mode }) => `You complete a half-made presentation. For each slide given, write what is asked of: "title" (short), "points" (2–4 concise phrases for the slide, no numbering, no bullet characters, no markdown) and "notes" (speaker notes: what the presenter says, 2–4 natural sentences). Base them on the deck's context and on what the slide's pictures show (described for you: "images"). ${mode === 'improve' ? 'Text the author already wrote ("title", "body", "notes"): improve it, keeping its meaning and facts.' : 'Text the author already wrote is given for context: keep consistent with it.'} Never invent figures or facts that are not in the context or the pictures. Make the slides follow one thread, without repeating each other. Write in ${language}.
"layout": where the picture goes once the slide has text: "image-right" (text on the left: most screenshots), "image-left", "image-full-caption" (a large picture and a one-line caption: when it needs all the room — wide tables, dashboards, detailed screens) or "keep".
Answer only JSON: {"slides":[{"slide":N,"title":"…","points":["…"],"notes":"…","layout":"…"}]}`;
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function slideLine(x) {
  const { p, want } = x, o = { slide: x.i + 1, write: Object.keys(want).filter(k => want[k]).map(k => (k === 'body' ? 'points' : k)) };
  if (p.titleText) o.title = clip(p.titleText, 120);
  if (p.bodyText) o.body = clip(p.bodyText, 400);
  if (p.notes) o.notes = clip(p.notes, 300);
  const imgs = p.images.map(b => captionOf(b)).filter(Boolean).map(c => ({ caption: c.text, ...(c.visibleText && { visibleText: c.visibleText }) }));
  if (imgs.length) o.images = imgs;
  else if (p.images.length) o.images = p.images.map(b => ({ alt: clip(b.alt || '(no description)', 120) }));
  const other = p.others.map(b => (b.type === 'text' ? `text: ${clip(textOf(b.html), 100)}` : b.type === 'table' ? `table ${b.rows?.length}×${b.rows?.[0]?.length}` : b.type));
  if (other.length) o.other = other;
  return o;
}
const outlineOf = (deck, done) => deck.slides.map((s, i) => {
  const p = partsOf(s), d = done.get(i + 1), cap = p.images.map(captionOf).find(Boolean);
  return `${i + 1}. ${clip(d || p.titleText.split('\n')[0] || (cap && `[picture: ${cap.title || cap.text}]`) || (p.bodyText ? p.bodyText.split('\n')[0] : '—'), 70)}`;
}).join('\n');
const briefText = b => [`About: ${b?.topic || '(not given)'}`, b?.audience && `Audience: ${b.audience}`, b?.takeaway && `They should take away: ${b.takeaway}`].filter(Boolean).join('\n');

async function writeChunk(chunk, { deck, brief, mode, done, language, signal, onUsage }) {
  const user = `${briefText(brief)}\n\nThe whole deck (${deck.slides.length} slides):\n${outlineOf(deck, done)}\n\nSlides to write now:\n${JSON.stringify(chunk.map(slideLine))}`;
  const out = await chat([{ role: 'system', content: SYSTEM({ language, mode }) }, { role: 'user', content: user }],
    { json: true, maxTokens: Math.min(4000, 300 + 280 * chunk.length), force: AGENT_MODEL, signal, onUsage, feature: 'complete' });
  let j = null; try { j = parseJSON(out); } catch {}
  const list = Array.isArray(j) ? j : Array.isArray(j?.slides) ? j.slides : [];
  return new Map(list.filter(x => x && typeof x === 'object').map((x, k) => [+x.slide || chunk[k]?.i + 1, x]));
}

// The operations for one slide from what the model wrote.
function opsFor(x, w, deck, mode) {
  // («Solo lo vacío»: each change says so, and is skipped when applied if it would overwrite anything: agent.js touchesContent.)
  const { s, p, want } = x, base = { sid: s.id, slide: x.i + 1, ok: true, ...(mode === 'empty' && { onlyEmpty: true }) }, ops = [];
  const title = want.title && cleanTitle(cleanLine(w.title || '')).replace(/[.:;]$/, '').slice(0, 140);
  const points = (Array.isArray(w.points) ? w.points : typeof w.points === 'string' ? w.points.split('\n') : []).map(cleanLine).filter(Boolean).slice(0, 5);
  const titleOp = title && title !== p.titleText ? { op: 'set_text', ...base, id: p.title.id, text: title } : null;
  const hasBody = want.body && points.length > 0, withBody = hasBody || !!p.bodyText;
  // What would overlap a picture once written: then the slide is rearranged with these texts (in the
  // layout the model suggested; text on the left by default; the pictures under the title if there is no body).
  const covers = tb => p.images.some(im => hits(tb, im)) || p.others.some(o => hits(tb, o));
  const clash = (!!titleOp || hasBody) && [(titleOp || p.titleText) && p.title, withBody && p.body].filter(Boolean).some(covers);
  let layout = LAYOUTS.includes(w.layout) && w.layout !== 'keep' ? w.layout : 'image-right', arrange = null;
  if (layout === 'image-full-caption' && p.bodyText && !want.body) layout = 'image-right';
  if (clash) {
    if (!withBody) layout = 'image-full';
    let boxes = arrangeSlide(s, layout, deck);
    if (!boxes && withBody && layout !== 'image-right') boxes = arrangeSlide(s, layout = 'image-right', deck);
    const after = b => ({ ...b, ...(boxes?.[b.id] || {}) });
    if (boxes && ![p.title, withBody && p.body].filter(Boolean).some(tb => p.images.some(im => hits(after(tb), after(im))))) arrange = { layout, boxes };
  }
  const body = hasBody ? (arrange?.layout === 'image-full-caption' ? points[0] : points.map(l => '- ' + l).join('\n')) : '';
  const bodyOp = body && body !== p.bodyText ? { op: 'set_text', ...base, id: p.body.id, text: body } : null;
  for (const o of [titleOp, bodyOp].filter(Boolean)) {
    if (arrange) ops.push({ ...o, arrange });
    else if (!clash || !covers(o.id === p.title?.id ? p.title : p.body)) ops.push(o);     // (no room: only what covers nothing)
  }
  // (An empty placeholder an object now sits on — the second content box of a two-content slide — is removed:
  // its "click to add text" prompt would show over the picture.)
  const filled = new Set(ops.map(o => o.id)), at = b => ({ ...b, ...(arrange?.boxes[b.id] || {}) });
  for (const e of s.blocks.filter(b => VISIBLE(b) && isEmptyPlaceholder(b) && !filled.has(b.id)))
    if ([...p.images, ...p.others].some(o => overlap(at(e), at(o)) > 400)) ops.push({ op: 'delete_object', ...base, id: e.id });
  const notes = want.notes && clip(w.notes, 2000);
  if (notes && notes !== p.notes) ops.push({ op: 'set_notes', ...base, notes });
  // (Accessibility: pictures without alternative text get one from their description.)
  for (const b of p.images) {
    const c = captionOf(b);
    if (c && !String(b.alt || '').trim()) ops.push({ op: 'set_props', ...base, id: b.id, props: { alt: clip(firstSentence(c.text), 200) } });
  }
  return ops;
}

// Run it. → { ops (clean: for the panel), problems, cost: { usd, credits, calls }, stats: { described, cached, slides, failed } }
// onStep({ kind: 'describe', done, total } | { kind: 'write', from, to, total }); signal stops (Error 'STOPPED').
export async function completeDeck({ scope = { kind: 'all' }, mode = 'empty', deck = state.deck, ui = state.ui, signal = null, onStep = () => {}, onCost = () => {} } = {}) {
  if (!MODES.includes(mode)) mode = 'empty';
  const brief = briefOf(deck) || guessBrief(deck), language = `the deck's language (that of its context and existing text; ${lang()} if unclear)`;
  const cost = { usd: 0, credits: 0, calls: 0 };
  const onUsage = u => { cost.usd += u.usd || 0; cost.credits += u.credits || 0; };
  const stopped = () => { if (signal?.aborted) throw new Error('STOPPED'); };
  const targets = targetsOf({ scope, mode, deck, ui }), need = toDescribe(targets);
  const cached = targets.reduce((n, x) => n + x.p.images.length, 0) - need.length;
  // 1. The pictures not described yet (kept on their blocks, even if the proposal is discarded: they were paid for).
  let described = 0;
  if (need.length) {
    const caps = await describeImages(need, { context: clip(brief.topic, 200), language, signal,
      onUsage: u => { onUsage(u); onCost({ ...cost }); }, onProgress: p => { if (p.done) { cost.calls++; onCost({ ...cost }); } onStep({ kind: 'describe', ...p }); } });
    stopped();
    if (caps.size) commit(() => { for (const { b } of need) if (caps.has(b.id)) b.aiCaption = caps.get(b.id); }, { history: false });
    described = caps.size;
  }
  // 2. The slides, ~12 at a time, with the outline so far.
  const done = new Map(), written = new Map();
  const run = async chunk => {
    stopped();
    onStep({ kind: 'write', from: chunk[0].i + 1, to: chunk.at(-1).i + 1, total: targets.length, done: written.size });
    const res = await writeChunk(chunk, { deck, brief, mode, done, language, signal, onUsage });
    cost.calls++; onCost({ ...cost });
    // (A broken or cut answer for several slides: once more, in halves.)
    if (!res.size) { if (chunk.length < 4) return; const h = Math.ceil(chunk.length / 2); await run(chunk.slice(0, h)); await run(chunk.slice(h)); return; }
    for (const x of chunk) { const w = res.get(x.i + 1); if (w) { written.set(x.i + 1, { x, w }); if (w.title) done.set(x.i + 1, cleanLine(w.title)); } }
  };
  for (let k = 0; k < targets.length; k += CHUNK) await run(targets.slice(k, k + CHUNK));
  stopped();
  const ops = [...written.values()].flatMap(({ x, w }) => opsFor(x, w, deck, mode));
  return { ops, mode, dropped: [], problems: ops.length ? checkOps(ops, deck) : [], cost, steps: cost.calls, raw: [],
    stats: { described, cached, slides: written.size, targets: targets.length, failed: need.length - described } };
}
