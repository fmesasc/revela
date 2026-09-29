// Morph ("Transformar"): which objects of a slide are the same as on the one
// before — by id (duplicated slides), by content (same text, picture…), by
// placeholder, or the only one of its kind — so they glide instead of jumping.
// Used by the exported presentation and by the editor's suggestion.

// Morph (PowerPoint's "Morph", reveal.js auto-animate). Like PowerPoint, it is
// set on the slide it goes INTO; the previous one is marked too (reveal needs
// both). Objects pair up: the same object (duplicated slide), else the same
// kind with the same content (text, picture, shape and colour…), else the same
// placeholder, else the only one of its kind on both slides. Paired objects
// share a morph id; the chain carries on to the next slide.
const plainOf = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
export const morphSig = b => b.type + '|' + ({ text: plainOf(b.html), image: b.src, shape: `${b.shape}|${b.fill}`, icon: b.icon, math: b.latex, code: b.code,
  chart: b.chartType, table: JSON.stringify(b.rows), video: b.src }[b.type] ?? '');
export function morphPlan(deck) {
  const vis = deck.slides.filter(s => !s.hidden), marked = new Set(), keys = new Map(), textMode = new Map();
  const k = (s, b) => `${s.id}:${b.id}`;
  vis.forEach((s, i) => {
    if (!s.autoAnimate) return;
    marked.add(s.id); if (vis[i - 1]) marked.add(vis[i - 1].id);
    // Morphing by words/characters splits the text of both slides the same way.
    if (s.morphBy) { textMode.set(s.id, s.morphBy); if (vis[i - 1] && !textMode.has(vis[i - 1].id)) textMode.set(vis[i - 1].id, s.morphBy); }
  });
  vis.forEach((s, i) => {
    if (!marked.has(s.id)) return;
    for (const b of s.blocks) keys.set(k(s, b), b.id);
    const prev = vis[i - 1];
    if (!s.autoAnimate || !prev) return;
    const free = new Set(prev.blocks), take = (b, p) => { keys.set(k(s, b), keys.get(k(prev, p)) || p.id); free.delete(p); };
    const pending = [];
    for (const b of s.blocks) { const p = prev.blocks.find(x => x.id === b.id); if (p) take(b, p); else pending.push(b); }
    const rules = [(b, p) => morphSig(b) === morphSig(p), (b, p) => b.type === p.type && b.ph && b.ph === p.ph,
      (b, p) => b.type === p.type && s.blocks.filter(x => x.type === b.type).length === 1 && prev.blocks.filter(x => x.type === b.type).length === 1];
    for (const rule of rules) for (const b of [...pending]) {
      const p = [...free].find(x => rule(b, x)); if (p) { take(b, p); pending.splice(pending.indexOf(b), 1); }
    }
  });
  return { marked, key: (s, b) => keys.get(k(s, b)), textMode: s => textMode.get(s.id) || null };
}

// Objects of a slide that are also on the previous visible one, and changed
// (moved, resized, recoloured…): worth suggesting Morph for.
export function sharedChanges(deck, index) {
  const vis = deck.slides.filter(s => !s.hidden), s = deck.slides[index], i = vis.indexOf(s), prev = vis[i - 1];
  if (!s || !prev) return 0;
  const look = b => [b.x, b.y, b.w, b.h, b.rotation || 0, b.fill, b.color, b.fontSize, b.opacity].join();
  const bySig = new Map(); for (const p of prev.blocks) { const k = morphSig(p); if (k.length > p.type.length + 2 && !bySig.has(k)) bySig.set(k, p); }
  let n = 0;
  for (const b of s.blocks) { const p = prev.blocks.find(x => x.id === b.id) || bySig.get(morphSig(b)); if (p && look(p) !== look(b)) n++; }
  return n;
}
