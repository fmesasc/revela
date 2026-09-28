// Design ideas (PowerPoint Designer / Google Slides "Explore" layouts): a few
// arrangements of what the current slide already contains — title, texts and
// one main visual — computed locally, previewed, and applied with one click.

import { state, commit, currentSlide } from '../../core/store.js';

const MEDIA = ['image', 'chart', 'model', 'video', 'table', 'icon', 'camera'];
const hasText = b => b.type === 'text' && (b.html || '').replace(/<[^>]*>/g, '').trim();

function parts(slide) {
  const texts = slide.blocks.filter(hasText);
  const title = texts.find(b => b.ph === 'title') || texts[0] || null;
  return { title, body: texts.filter(b => b !== title), media: slide.blocks.filter(b => MEDIA.includes(b.type)) };
}

// Each idea: name + function(parts, W, H) → { id: props } for the blocks it moves.
const IDEAS = [
  { name: 'Clásica', ok: p => p.title, place: (p, W, H) => {
    const out = {}; out[p.title.id] = { x: 90, y: 60, w: W - 180, h: 100, textAlign: 'left' };
    const n = p.body.length + (p.media.length ? 1 : 0), cw = (W - 180 - (n - 1) * 40) / Math.max(1, n);
    [...p.body, ...p.media.slice(0, 1)].forEach((b, i) => { out[b.id] = { x: 90 + i * (cw + 40), y: 190, w: cw, h: H - 260 }; });
    return out; } },
  { name: 'Visual a la derecha', ok: p => p.title && p.media.length, place: (p, W, H) => {
    const out = {}, half = W / 2;
    out[p.title.id] = { x: 70, y: 80, w: half - 110, h: 120, textAlign: 'left' };
    p.body.forEach((b, i, a) => { out[b.id] = { x: 70, y: 230 + i * ((H - 300) / a.length), w: half - 110, h: (H - 300) / a.length - 10 }; });
    out[p.media[0].id] = { x: half + 20, y: 60, w: half - 80, h: H - 120 };
    return out; } },
  { name: 'Visual a la izquierda', ok: p => p.title && p.media.length, place: (p, W, H) => {
    const out = {}, half = W / 2;
    out[p.media[0].id] = { x: 60, y: 60, w: half - 80, h: H - 120 };
    out[p.title.id] = { x: half + 40, y: 80, w: half - 110, h: 120, textAlign: 'left' };
    p.body.forEach((b, i, a) => { out[b.id] = { x: half + 40, y: 230 + i * ((H - 300) / a.length), w: half - 110, h: (H - 300) / a.length - 10 }; });
    return out; } },
  { name: 'Visual de fondo', ok: p => p.title && p.media.some(b => b.type === 'image'), place: (p, W, H) => {
    const img = p.media.find(b => b.type === 'image'), out = {};
    out[img.id] = { x: 0, y: 0, w: W, h: H, fit: 'cover', toBack: true };
    out[p.title.id] = { x: 80, y: H - 260, w: W - 160, h: 110, textAlign: 'left', bg: '#000000aa', radius: 10 };
    p.body.forEach(b => { out[b.id] = { x: 80, y: H - 140, w: W - 160, h: 80, bg: '#000000aa', radius: 10 }; });
    return out; } },
  { name: 'Centrada', ok: p => p.title, place: (p, W, H) => {
    const out = {}, hasM = p.media.length > 0;
    out[p.title.id] = { x: 120, y: hasM ? 60 : H / 2 - 130, w: W - 240, h: 120, textAlign: 'center' };
    p.body.forEach((b, i) => { out[b.id] = { x: 160, y: (hasM ? 190 : H / 2) + i * 70, w: W - 320, h: 64, textAlign: 'center' }; });
    if (hasM) { const mh = H - 190 - p.body.length * 70 - 40; out[p.media[0].id] = { x: (W - mh * 1.6) / 2, y: 190 + p.body.length * 70, w: mh * 1.6, h: mh }; }
    return out; } },
];

export function designIdeas(slide = currentSlide(), deck = state.deck) {
  const p = parts(slide), { w, h } = deck.size;
  return IDEAS.filter(i => i.ok(p)).map(i => ({ name: i.name, changes: i.place(p, w, h) }));
}

// The slide's blocks with an idea applied (for previews), without touching it.
export function previewBlocks(slide, idea) {
  const moved = slide.blocks.map(b => (idea.changes[b.id] ? { ...b, ...stripMeta(idea.changes[b.id]) } : b));
  const back = moved.filter(b => idea.changes[b.id]?.toBack);
  return [...back, ...moved.filter(b => !back.includes(b))];
}
const stripMeta = c => { const { toBack, ...rest } = c; return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v])); };

export function applyIdea(idea) {
  commit(() => {
    const s = currentSlide();
    s.blocks = previewBlocks(s, idea).map(b => b);
    for (const b of s.blocks) if (idea.changes[b.id]) Object.assign(b, stripMeta(idea.changes[b.id]));
  });
}
