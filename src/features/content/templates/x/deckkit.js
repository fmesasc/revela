// A compact way to write example presentations from data (used by biz_pro.js, life_plus.js, product_plus.js):
// a deck = { palette, fonts, look, cover, slides: [{ t: 'cards' | 'numbers' | … }] }; the kit lays each kind of slide
// out with the palette's colours (dark or light), the animations in order and the speaker notes. Every text is plain
// Spanish (the translations are keyed by it). See templates/kit.js for the builders underneath.
import { build, text, card, shape, icon, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, pollBlock, base, deep, PALETTES } from '../kit.js';
import { contrast } from '../../../design/theme.js';

// ---- Colour helpers ------------------------------------------------------------------
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = v => '#' + v.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A_ = rgb(a), B_ = rgb(b); return hex(A_.map((x, i) => x + (B_[i] - x) * t)); };
const isDark = bg => contrast(bg, '#ffffff') > contrast(bg, '#000000');
// The colours a slide uses: ground, text, cards (a tint of the text over the ground), the accents (readable as text).
const colours = pal => { const p = PALETTES[pal], bg = p.bg, fg = p.fg, dark = isDark(bg);
  const acc = p.accents.slice(0, 3); while (acc.length < 3) acc.push(acc[0]);
  const ink = acc.map(c => dark ? (contrast(c, bg) >= 4.5 ? c : mix(c, '#ffffff', .5)) : deep(c, bg, 4.5));
  const cardBg = mix(bg, fg, dark ? .1 : .055);
  return { p, bg, fg, dark, acc, ink, cardBg, muted: mix(fg, bg, .3), line: mix(bg, fg, .2), onAcc: c => contrast('#ffffff', c) >= contrast('#101010', c) ? '#ffffff' : '#101010' }; };

const on = (b, effect = 'fade-up', props = {}) => withAnims(b, A(effect, props));
const chain = (blocks, effect = 'fade-up', first = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// Groups of blocks (a card and what is on it), one group after the other.
const cascade = (groups, effect = 'fade-up', first = 'click', props = {}) =>
  groups.flatMap((g, i) => g.map((b, q) => withAnims(b, A(effect, { ...props, start: q ? 'withPrev' : i ? 'afterPrev' : first }))));

// ---- The look of the master (what is behind every slide) ----------------------------------
const decor = (look, c) => p => { const [a0, a1] = c.acc, bg = c.bg;
  switch (look) {
    case 'bands': return [shape('rect', 0, 0, 1280, 14, a0), shape('rect', 0, 706, 1280, 14, a1)];
    case 'side': return [shape('rect', 0, 0, 22, 720, a0), shape('rect', 22, 0, 8, 720, a1)];
    case 'frame': return [shape('rect', 28, 28, 1224, 664, 'none', { stroke: a0, strokeWidth: 3, opacity: 70 }), shape('rect', 40, 40, 1200, 640, 'none', { stroke: a1, strokeWidth: 1, opacity: 60 })];
    case 'corner': return [shape('ellipse', 1010, -190, 480, 480, a0, { opacity: 16 }), shape('ellipse', -120, 600, 300, 300, a1, { opacity: 18 })];
    case 'dots': return Array.from({ length: 30 }, (_, i) => shape('ellipse', 1060 + (i % 6) * 34, 24 + Math.floor(i / 6) * 34, 10, 10, i % 7 ? a0 : a1, { opacity: 40 }));
    case 'diag': return [shape('rect', 760, -80, 700, 150, a0, { rotation: 18, opacity: 14 }), shape('rect', -200, 640, 700, 110, a1, { rotation: 18, opacity: 16 })];
    default: return [glow(1000, -160, 560, a0, bg, 20), glow(-160, 520, 520, a1, bg, 14)]; } };

// ---- Slide kinds ------------------------------------------------------------------------
const X0 = 90, W = 1100;
const KINDS = {
  // The cover: label, title, line and a big icon in a round badge (variant 0 left, 1 centred, 2 with a band).
  cover(s, c, v) { const [a0, a1] = c.acc, ic = s.icon || 'sparkles';
    const label = text(s.label, v === 1 ? 140 : 90, v === 1 ? 220 : 150, v === 1 ? 1000 : 700, 36, { fontSize: 22, letterSpacing: 4, color: c.ink[0], fontWeight: 700, textAlign: v === 1 ? 'center' : 'left' });
    const title = text(s.title, v === 1 ? 140 : 84, v === 1 ? 262 : 196, v === 1 ? 1000 : 720, 240, { fontSize: v === 1 ? 70 : 68, fontWeight: 800, color: c.fg, lineHeight: 1.06, textAlign: v === 1 ? 'center' : 'left' });
    const sub = text(s.sub, v === 1 ? 190 : 90, v === 1 ? 500 : 450, v === 1 ? 900 : 650, 140, { fontSize: 27, color: c.muted, lineHeight: 1.4, textAlign: v === 1 ? 'center' : 'left' });
    if (v === 1) return { layout: 'blank', back: [glow(340, -130, 600, a0, c.bg, 18)], extra: [on(shape('ellipse', 570, 70, 140, 140, a0), 'zoom-in'), on(icon(ic, 600, 100, 80, c.onAcc(a0)), 'zoom-in', { start: 'withPrev' }), label, title, sub] };
    const badge = shape('ellipse', 840, 140, 340, 340, a0, { opacity: 95 }), ring = shape('ellipse', 810, 110, 400, 400, 'none', { stroke: a1, strokeWidth: 6, opacity: 70 });
    return { layout: 'blank', back: v === 2 ? [shape('rect', 0, 0, 40, 720, a0), shape('rect', 40, 0, 12, 720, a1)] : [], extra: [label, title, sub,
      ...cascade([[badge, icon(ic, 920, 220, 180, c.onAcc(a0))], [ring]], 'zoom-in', 'afterPrev', { duration: 700 })] }; },

  // Big figures in cards: items = [[value, label], …] (3 or 4).
  numbers(s, c) { const n = s.items.length, w = Math.floor((W - 24 * (n - 1)) / n);
    const groups = s.items.map(([v, l], i) => [card(`<div style="font-size:${String(v).length > 5 ? 50 : n > 3 ? 62 : 72}px;font-weight:800;color:${c.ink[i % 3]};line-height:1.05">${v}</div><div style="font-size:23px;color:${c.fg};margin-top:10px">${l}</div>`,
      X0 + i * (w + 24), 225, w, 270, c.cardBg, { color: c.fg, textAlign: 'center', radius: 20, pad: [44, 18, 20, 18], borderColor: c.acc[i % 3] })]);
    const extra = cascade(groups, 'zoom-in', 'click', { duration: 600 });
    if (s.note) extra.push(on(text(s.note, X0, 560, W, 90, { fontSize: 24, color: c.muted, textAlign: 'center', lineHeight: 1.4 }), 'fade-in', { start: 'afterPrev' }));
    return { title: s.title, layout: 'titleOnly', extra }; },

  // Cards with an icon: items = [[icon, title, text], …] (3 or 4).
  cards(s, c) { const n = s.items.length, w = n === 4 ? 258 : 350, gap = n === 4 ? 22 : 25, h = s.h || 330;
    const groups = s.items.map(([ic, t, d], i) => { const x = X0 + i * (w + gap);
      return [card(`<b style="font-size:${n === 4 ? 26 : 30}px;color:${c.ink[i % 3]}">${t}</b><br><span style="font-size:${n === 4 ? 22 : 24}px;color:${c.fg}">${d}</span>`, x, 215, w, h, c.cardBg, { color: c.fg, radius: 18, pad: [112, 22, 18, 22], borderColor: c.acc[i % 3] }),
        shape('ellipse', x + 22, 235, 74, 74, c.acc[i % 3]), icon(ic, x + 40, 253, 38, c.onAcc(c.acc[i % 3]))]; });
    return { title: s.title, layout: 'titleOnly', extra: cascade(groups, s.fx || 'fade-up', 'click') }; },

  // A diagram written as an outline (layout: steps, timeline, cycle, chevrons, pyramid, funnel, hierarchy, matrix, radial, venn…).
  diagram(s, c) { const extra = [dg(s.layout, s.outline, 110, 195, 1060, s.h || 400, { colors: s.colors || 'colorful' })];
    if (s.note) extra.push(text(s.note, 110, 610, 1060, 50, { fontSize: 23, color: c.muted, textAlign: 'center' }));
    return { title: s.title, layout: 'titleOnly', extra }; },

  // A chart on the left and one figure with its reading on the right: s.side = [figure, text].
  chart(s, c) { const ch = chartBlock({ x: 70, y: 185, w: 740, h: 470, chartType: s.chartType || 'bar', color: c.acc[0], seriesName: s.series || '', grid: true,
      data: s.data.map(([label, value], i) => ({ label, value, ...(s.colorful && { color: c.acc[i % 3] }) })), ...(s.opts || {}) });
    const side = s.side ? [on(card(`<div style="font-size:64px;font-weight:800;color:${c.ink[1]};line-height:1.05">${s.side[0]}</div><div style="font-size:23px;color:${c.fg};margin-top:8px">${s.side[1]}</div>`,
      850, 215, 340, 290, c.cardBg, { color: c.fg, radius: 20, pad: [34, 24, 20, 24], borderColor: c.acc[1] }), 'fade-left', { start: 'afterPrev' })] : [];
    return { title: s.title, layout: 'titleOnly', extra: [on(ch, 'fade-in', { start: 'click' }), ...side] }; },

  // A table: rows (the first is the header).
  table(s, c) { const rows = s.rows;
    return { title: s.title, layout: 'titleOnly', extra: [tableBlock({ x: 90, y: 200, w: 1100, h: rows.length * 62, fontSize: s.fs || 23, header: true, headBg: c.acc[0], headFg: c.onAcc(c.acc[0]),
      stroke: c.line, banded: true, band: c.cardBg, rows }), ...(s.note ? [text(s.note, 90, 210 + rows.length * 62 + 12, 1100, 50, { fontSize: 22, color: c.muted })] : [])] }; },

  // A quote, large.
  quote(s, c) { return { layout: 'blank', back: [shape('rect', 0, 0, 1280, 720, c.cardBg)], transition: s.transition, extra: [
    on(icon('quote', 90, 110, 110, c.acc[0]), 'zoom-in'),
    on(text(s.text, 90, 230, 1100, 280, { fontSize: s.size || 46, fontWeight: 700, color: c.fg, lineHeight: 1.22, fontStyle: 'italic' }), 'fade-up', { start: 'afterPrev' }),
    on(text('— ' + s.who, 90, 540, 1100, 50, { fontSize: 26, color: c.ink[0], fontWeight: 700 }), 'fade-in', { start: 'afterPrev' })] }; },

  // Points on the left, a round icon on the right: bullets = ['…', …].
  split(s, c) { const ic = s.icon || 'lightbulb';
    return { title: s.title, layout: 'titleOnly', extra: [
      on(text(ul(...s.bullets), 90, 200, 660, 430, { fontSize: 29, color: c.fg, lineHeight: 1.45 }), 'fade-up'),
      ...cascade([[shape('ellipse', 830, 210, 330, 330, c.acc[0], { opacity: 92 }), icon(ic, 910, 290, 170, c.onAcc(c.acc[0]))], [shape('ellipse', 800, 180, 390, 390, 'none', { stroke: c.acc[1], strokeWidth: 5, opacity: 70 })]], 'zoom-in', 'afterPrev', { duration: 700 }),
      ...(s.caption ? [on(text(s.caption, 800, 580, 390, 60, { fontSize: 22, color: c.muted, textAlign: 'center' }), 'fade-in', { start: 'afterPrev' })] : [])] }; },

  // Two columns compared: left = [head, [points]], right = [head, [points]].
  compare(s, c) { const col = ([h, pts], i) => on(card(`<b style="font-size:30px;color:${c.ink[i]}">${h}</b>${ul(...pts)}`, i ? 660 : 90, 215, 530, 310, c.cardBg, { color: c.fg, fontSize: 27, radius: 20, pad: [28, 30, 20, 30], borderColor: c.acc[i], lineHeight: 1.35 }), i ? 'fade-left' : 'fade-right', { start: i ? 'withPrev' : 'click' });
    return { title: s.title, layout: 'titleOnly', extra: [col(s.left, 0), col(s.right, 1), on(shape('ellipse', 596, 380, 88, 88, c.acc[2]), 'zoom-in', { start: 'afterPrev' }),
      on(text('vs', 596, 400, 88, 50, { fontSize: 30, fontWeight: 800, color: c.onAcc(c.acc[2]), textAlign: 'center' }), 'zoom-in', { start: 'withPrev' })] }; },

  // A vote with the audience (choice, multi, word cloud…).
  poll(s, c) { return { layout: 'blank', extra: [pollBlock({ kind: s.kind || 'choice', display: s.display || 'bar', fontSize: 32, question: s.question, options: s.options, x: 80, y: 50, w: 1120, h: 620 })] }; },
  // A quiz question: correct = index.
  quiz(s, c) { return { layout: 'blank', extra: [pollBlock({ kind: 'quiz', question: s.question, options: s.options, correct: [s.correct], time: 25, fontSize: 32, x: 80, y: 50, w: 1120, h: 620 })] }; },

  // A timeline written as dated cards along a line: items = [[when, what], …] (4 or 5).
  line(s, c) { const n = s.items.length, step = Math.floor(W / n);
    const groups = s.items.map(([when, what], i) => { const x = X0 + i * step;
      return [shape('ellipse', x + 4, 330, 36, 36, c.acc[i % 3]), text(`<b>${when}</b>`, x - 6, 270, step - 10, 44, { fontSize: 26, color: c.ink[i % 3] }),
        text(what, x - 6, 390, step - 18, 200, { fontSize: 22, color: c.fg, lineHeight: 1.35 })]; });
    return { title: s.title, layout: 'titleOnly', extra: [shape('rect', X0 + 20, 346, W - 40, 5, c.line), ...cascade(groups, 'fade-up', 'click')] }; },

  // The closing: what to do next (checklist cards) and, if asked, a timer.
  close(s, c) { const items = s.items, th = 96;
    const rows = items.map((t, i) => [card(`<b style="color:${c.ink[i % 3]}">${i + 1}</b>  ${t}`, 90, 220 + i * (th + 14), s.seconds ? 740 : 1100, th, c.cardBg, { color: c.fg, fontSize: 28, radius: 16, pad: [26, 24, 12, 24], borderColor: c.acc[i % 3] })]);
    return { title: s.title, layout: 'titleOnly', transition: 'zoom', extra: [...cascade(rows, 'fade-right', 'click'), ...(s.seconds ? [timer(s.seconds, 900, 240, 280, { color: c.acc[0], endText: s.end || '¡Tiempo!' })] : [])] }; },
};

// ---- A deck from its data ---------------------------------------------------------------
const TRANS = ['fade', 'zoom', 'slide', 'push', 'page', 'convex', 'wipe'];
export function deckOf({ name, palette, fonts = 'modern', look = 'glow', variant = 0, tr = 0, slides }) {
  const c = colours(palette);
  const list = slides.map((s, i) => { const f = KINDS[s.t]; if (!f) throw new Error('slide kind ' + s.t);
    const out = f(s, c, variant); out.notes = s.notes || '';
    out.transition = out.transition || s.transition || TRANS[(tr + i) % TRANS.length];
    if (out.title) out.title = s.title;
    return out; });
  return numbered(build({ name, palette, fonts, decor: decor(look, c), title: { color: c.ink[0], size: 48 }, body: { color: c.fg } }, list));
}
// Entries for a file's default export: def(key, name, summary, cat, deck-data).
export const def = (cat, name, summary, data) => ({ name, cat, summary, make: () => deckOf({ name, ...data }) });
