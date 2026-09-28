// Advanced AI authoring (PowerPoint Copilot / Gemini in Slides style), all via
// the user's OpenRouter account:
// - whole decks from a brief or from a document, with varied slide kinds laid
//   out by Revela (title, section, bullets, two columns, quote, big numbers,
//   timeline, chart with data, table, image, closing) and optional AI images;
// - improve one slide; agenda and quiz slides from the content;
// - an assistant that edits the deck from plain-language requests through a
//   small set of validated operations (one undo step).

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { chat, lang, parseJSON, esc, plain, generateImage } from './openrouter.js';
import { currentPalette, applyPalette, PALETTES } from '../design/palettes.js';

// ---- Slide kinds → objects ------------------------------------------------------
export const KINDS = ['title', 'section', 'bullets', 'two_columns', 'quote', 'stats', 'timeline', 'chart', 'table', 'image', 'closing'];
const SPEC_DOC = `Slide kinds and their fields:
- "title": title, subtitle
- "section": title, subtitle
- "bullets": title, bullets (3-6 short strings)
- "two_columns": title, left {heading, bullets}, right {heading, bullets}
- "quote": quote, author
- "stats": title, stats [{value (short, e.g. "42%"), label}] (2-4 items)
- "timeline": title, steps [{label, text}] (3-5 items)
- "chart": title, chart {type: "bar"|"line"|"pie"|"doughnut"|"area", labels [..], values [numbers], series_name}, bullets (0-2)
- "table": title, header [..], rows [[..]] (max 6 rows, max 5 columns)
- "image": title, bullets (2-4), image_prompt (a detailed description for an image generator)
- "closing": title, subtitle
Every slide also has "notes": 2-4 sentences the presenter would say. Only use real data you are given or well-known facts; never invent statistics — if unsure, use bullets instead of stats/chart.`;

const T = (x, y, w, h, fontSize, html, extra = {}) => ({ id: uid(), type: 'text', x, y, w, h, fontSize, html, rotation: 0, animation: null, ...extra });
const list = items => (items || []).filter(Boolean).length ? `<ul>${items.filter(Boolean).map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
const str = v => (v == null ? '' : String(v));

// Build the objects of one slide from a spec. W×H is the deck size.
export function layoutSlide(spec, W = 1280, H = 720, pal = currentPalette()) {
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
    case 'quote':
      b.push(T(140, H * 0.2, 80, 120, 140, '“', { fontWeight: '700', html: `<span style="color:${a1}">“</span>` }));
      b.push(T(160, H * 0.3, W - 320, 220, 40, `<i>${esc(str(spec.quote))}</i>`, { ph: 'title', vAlign: 'middle' }));
      if (spec.author) b.push(T(160, H * 0.3 + 235, W - 320, 50, 24, '— ' + esc(str(spec.author)), { textAlign: 'right' }));
      break;
    case 'stats': {
      b.push(title());
      const st = (spec.stats || []).slice(0, 4), n = Math.max(1, st.length), gw = (W - 160 - (n - 1) * 30) / n;
      st.forEach((s, i) => {
        const x = 80 + i * (gw + 30);
        b.push(T(x, H / 2 - 120, gw, 150, 72, `<b>${esc(str(s.value))}</b>`, { textAlign: 'center', vAlign: 'middle', bg: a1, radius: 14 }));
        b.push(T(x, H / 2 + 45, gw, 120, 26, esc(str(s.label)), { textAlign: 'center' }));
      });
      break;
    }
    case 'timeline': {
      b.push(title());
      const steps = (spec.steps || []).slice(0, 5), n = Math.max(1, steps.length), gw = (W - 160 - (n - 1) * 40) / n, ids = [];
      steps.forEach((s, i) => {
        const x = 80 + i * (gw + 40);
        const box = T(x, H / 2 - 110, gw, 90, 28, `<b>${esc(str(s.label))}</b>`, { textAlign: 'center', vAlign: 'middle', bg: i % 2 ? a2 : a1, radius: 10 });
        b.push(box); ids.push(box.id);
        b.push(T(x, H / 2 + 5, gw, H / 2 - 60, 22, esc(str(s.text)), { textAlign: 'center' }));
      });
      for (let i = 0; i < ids.length - 1; i++)
        b.push({ id: uid(), type: 'connector', from: ids[i], to: ids[i + 1], color: '#8a8a8a', arrow: true, x: 0, y: 0, w: W, h: H, rotation: 0, animation: null });
      break;
    }
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
    default:
      b.push(title());
      b.push(T(80, 170, W - 160, H - 220, 28, list(spec.bullets), { ph: 'body' }));
  }
  return b.map(x => (x.color ? (({ color, ...r }) => ({ ...r, html: `<span style="color:${color}">${r.html}</span>` }))(x) : x));
}
export const slideFromSpec = (spec, bg = currentPalette().bg, deck = state.deck) => ({
  id: uid(), sectionId: null, background: bg, transition: null, hidden: false, autoSlide: 0,
  notes: str(spec.notes), blocks: layoutSlide(spec, deck.size.w, deck.size.h),
});

// ---- Whole decks -----------------------------------------------------------------
// opts: { topic, source (document text), count, audience, tone, language, images, palette }
export async function createDeck(opts = {}) {
  const count = Math.max(3, Math.min(30, +opts.count || 8));
  const brief = [opts.topic && `Topic: ${opts.topic}`, opts.audience && `Audience: ${opts.audience}`, opts.tone && `Tone: ${opts.tone}`,
    `Number of slides: ${count}`].filter(Boolean).join('\n');
  const source = opts.source ? `\n\nBase the content ONLY on this document (summarise and structure it, keep its facts and figures):\n"""\n${String(opts.source).slice(0, 60000)}\n"""` : '';
  const out = await chat([
    { role: 'system', content: `You are an expert presentation designer. Write a complete, well-structured slide deck. Answer only JSON: {"title":"…","slides":[{"kind":"…",…}]}.\n${SPEC_DOC}\nStart with a "title" slide, use "section" slides to separate parts in longer decks, vary the kinds, end with a "closing" slide. ${opts.images ? 'Use 1-3 "image" slides.' : 'Do not use "image" slides.'} Write everything in ${opts.language || lang()}.` },
    { role: 'user', content: brief + source },
  ], { json: true, maxTokens: 8000 });
  const res = parseJSON(out);
  const specs = (res.slides || []).filter(s => s && typeof s === 'object').slice(0, 40);
  if (!specs.length) throw new Error('EMPTY');
  return specs;
}
// Insert generated specs after the current slide (images are generated after).
export async function insertSpecs(specs, { images = false, onProgress } = {}) {
  const made = specs.map(sp => slideFromSpec(sp));
  commit(() => {
    const at = state.ui.slideIndex + 1, sec = currentSlide()?.sectionId || null;
    made.forEach(s => (s.sectionId = sec));
    state.deck.slides.splice(at, 0, ...made);
    state.ui.slideIndex = at; state.ui.selection = null;
  });
  if (images) {
    const withImg = specs.map((s, i) => [s, made[i]]).filter(([s]) => s.kind === 'image' && s.image_prompt);
    for (let k = 0; k < withImg.length; k++) {
      const [sp, slide] = withImg[k];
      const idx = state.deck.slides.indexOf(slide); if (idx < 0) continue;
      state.ui.slideIndex = idx;
      try {
        const id = await generateImage(str(sp.image_prompt), '4:3');
        const b = currentSlide().blocks.find(x => x.id === id), { w: W, h: H } = state.deck.size;
        if (b) commit(() => Object.assign(b, { x: Math.round(W * 0.52), y: 170, w: Math.round(W * 0.42), h: Math.round(W * 0.42 * 3 / 4) }), { history: false });
      } catch (e) { if (e.message === 'NO_CREDIT' || e.message === 'BAD_KEY') throw e; }
      onProgress?.((k + 1) / withImg.length);
    }
  }
  return made.length;
}
export async function generateDeck(opts) {
  const specs = await createDeck(opts);
  if (opts.palette && PALETTES[opts.palette]) applyPalette(opts.palette);
  return insertSpecs(specs, opts);
}

// Text of a document the user gives (txt/md, or PDF through pdf.js).
export async function readDocument(file) {
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
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
    { role: 'system', content: `Improve this slide: clearer, shorter, better structured, and choose the best kind. Keep the facts and the language of the slide. Answer only one slide as JSON {"kind":…}.\n${SPEC_DOC}\nDo not use "image".` },
    { role: 'user', content: `Current slide:\n${slideText(slide)}\n\nNotes: ${slide.notes || ''}` },
  ], { json: true, maxTokens: 2000 });
  const spec = parseJSON(out); if (!spec || !spec.kind) throw new Error('EMPTY');
  const keep = slide.blocks.filter(b => ['image', 'model', 'video', 'embed', 'camera'].includes(b.type));
  commit(() => {
    slide.blocks = [...layoutSlide(spec, state.deck.size.w, state.deck.size.h), ...keep];
    if (spec.notes) slide.notes = str(spec.notes);
    state.ui.selection = null;
  });
  return spec.kind;
}

// Agenda (from the section / title slides) or a quiz from the content.
export async function addAgenda() {
  const titles = state.deck.slides.filter(s => !s.hidden).map(s => plain(s.blocks.find(b => b.type === 'text')?.html || '')).filter(Boolean);
  const out = await chat([
    { role: 'system', content: `Write an agenda slide for a talk with these slide titles: group them into 3-6 agenda items. Answer only JSON {"kind":"bullets","title":…,"bullets":[…],"notes":…} in ${lang()}.` },
    { role: 'user', content: titles.join('\n') },
  ], { json: true, maxTokens: 800 });
  const spec = parseJSON(out);
  commit(() => { state.deck.slides.splice(1, 0, slideFromSpec({ ...spec, kind: 'bullets' })); state.ui.slideIndex = 1; });
}
export async function addQuiz(n = 3) {
  const text = state.deck.slides.filter(s => !s.hidden).map(slideText).join('\n---\n').slice(0, 40000);
  const out = await chat([
    { role: 'system', content: `Write ${n} multiple-choice review questions about this presentation, in ${lang()}. Answer only JSON {"questions":[{"question":…,"options":[4 strings],"answer":index,"explanation":…}]}.` },
    { role: 'user', content: text },
  ], { json: true, maxTokens: 2500 });
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

// ---- Assistant ---------------------------------------------------------------------
// The deck as the model sees it: slide numbers, text objects with ids, notes.
export function deckOutline(deck = state.deck) {
  return deck.slides.map((s, i) => ({
    slide: i + 1, hidden: !!s.hidden || undefined, background: s.background?.startsWith('#') ? s.background : undefined,
    texts: s.blocks.filter(b => b.type === 'text' && plain(b.html)).map(b => ({ id: b.id, text: plain(b.html).slice(0, 400) })),
    other: s.blocks.filter(b => b.type !== 'text' && b.type !== 'connector').map(b => b.type),
    notes: (s.notes || '').slice(0, 300) || undefined,
  }));
}
const OPS_DOC = `Operations (slide numbers are 1-based and refer to the deck BEFORE your changes; apply order is the list order, and "add_slide" after:N inserts after the slide that was N):
{"op":"set_text","slide":N,"id":"…","text":"…"}   (use "- " at line starts for bullets)
{"op":"add_slide","after":N,"spec":{"kind":…}}     (spec as described below)
{"op":"replace_slide","slide":N,"spec":{"kind":…}}
{"op":"delete_slide","slide":N}
{"op":"move_slide","slide":N,"to":M}
{"op":"set_notes","slide":N,"notes":"…"}
{"op":"set_hidden","slide":N,"hidden":true|false}
{"op":"set_background","slide":N|"all","color":"#rrggbb"}
{"op":"apply_palette","name":"${Object.keys(PALETTES).join('"|"')}"}`;

export async function assistant(request, history = []) {
  const out = await chat([
    { role: 'system', content: `You are the assistant inside the Revela presentation editor. Change the user's deck by answering only JSON {"message":"short reply to the user in their language","ops":[…]}.\n${OPS_DOC}\n${SPEC_DOC}\nIf the request is only a question, answer in "message" with no ops. Never invent facts or figures.` },
    ...history.slice(-6),
    { role: 'user', content: `Deck:\n${JSON.stringify(deckOutline())}\n\nCurrent slide: ${state.ui.slideIndex + 1}\n\nRequest: ${request}` },
  ], { json: true, maxTokens: 6000 });
  const res = parseJSON(out);
  const applied = applyOps(res.ops || []);
  return { message: str(res.message), applied, ops: res.ops || [] };
}

// Validate and apply operations in one undo step. Returns how many applied.
export function applyOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return 0;
  let n = 0;
  commit(() => {
    const slides = state.deck.slides, orig = [...slides];          // numbers refer to the original deck
    const at = N => orig[(+N | 0) - 1];
    const toHTML = t => { const lines = str(t).split('\n').map(l => l.trim()).filter(Boolean);
      return lines.length && lines.every(l => /^[-•*]\s/.test(l)) ? `<ul>${lines.map(l => `<li>${esc(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>` : lines.map(esc).join('<br>'); };
    for (const o of ops.slice(0, 200)) {
      const s = at(o.slide);
      switch (o.op) {
        case 'set_text': { const b = s?.blocks.find(x => x.id === o.id && x.type === 'text'); if (b) { b.html = toHTML(o.text); n++; } break; }
        case 'set_notes': if (s) { s.notes = str(o.notes); n++; } break;
        case 'set_hidden': if (s) { s.hidden = !!o.hidden; n++; } break;
        case 'delete_slide': if (s && slides.length > 1) { slides.splice(slides.indexOf(s), 1); n++; } break;
        case 'move_slide': if (s) { const i = slides.indexOf(s), to = Math.max(0, Math.min(slides.length - 1, (+o.to | 0) - 1)); slides.splice(i, 1); slides.splice(to, 0, s); n++; } break;
        case 'add_slide': if (o.spec && typeof o.spec === 'object') {
          const ref = at(o.after), i = ref ? slides.indexOf(ref) + 1 : (+o.after | 0) <= 0 ? 0 : slides.length;
          slides.splice(i, 0, slideFromSpec(o.spec, ref?.background)); n++; } break;
        case 'replace_slide': if (s && o.spec) { s.blocks = layoutSlide(o.spec, state.deck.size.w, state.deck.size.h); if (o.spec.notes) s.notes = str(o.spec.notes); n++; } break;
        case 'set_background': if (/^#[0-9a-f]{6}$/i.test(o.color || '')) { (o.slide === 'all' ? slides : [s]).filter(Boolean).forEach(x => (x.background = o.color)); n++; } break;
        case 'apply_palette': break;                                   // done after this commit
      }
    }
    state.ui.slideIndex = Math.min(state.ui.slideIndex, slides.length - 1); state.ui.selection = null;
  });
  const pal = ops.find(o => o.op === 'apply_palette' && PALETTES[o.name]);
  if (pal) { applyPalette(pal.name); n++; }
  return n;
}
