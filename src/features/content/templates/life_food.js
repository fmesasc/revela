// Example presentations: Gastronomía (vida personal). Each one: { name, summary, cat: 'life', make() } → a deck
// (see kit.js for the builders). Ten tables, each with its own look taken from the food:
// a baker's kraft paper with flour, a wine cellar by candlelight, a bar's chalkboard,
// a Japanese noren and a bowl seen from above, a seed-packet poster for pulses, a paella
// pan over the fire, a coffee lab sheet on graph paper, a pâtisserie window, a cheese board
// on wood and a grill over embers. Figures, prices and names are made up but plausible (said in the notes).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file -------------------------------------------------------------
// An SVG drawing as a data URL (loaves, glasses, maps, bowls: drawn for these decks).
const svgURL = (w, h, inner, bg = null) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const img = (src, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, fit: 'contain', ...props });
// Fonts of the catalogue beyond the deck's pair (their stacks, so the editor and the exports load them).
const FF = { caveat: "'Caveat', cursive", oswald: "'Oswald', sans-serif", abril: "'Abril Fatface', serif", cormorant: "'Cormorant Garamond', serif",
  mono: "'JetBrains Mono', monospace", josefin: "'Josefin Sans', sans-serif", lobster: "'Lobster', cursive", anton: "'Anton', sans-serif", lora: "'Lora', serif",
  dancing: "'Dancing Script', cursive", pacifico: "'Pacifico', cursive", quicksand: "'Quicksand', sans-serif", rubik: "'Rubik', sans-serif" };
const keep = (b, id) => ({ ...b, id });                    // (the same id on two slides: Transform moves it)
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// The same animation on a group: the first one starts it (click / after the previous), the rest go with it.
const together = (blocks, effect = 'fade-up', start = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'withPrev' : start })));
// One after another (the first on a click, or by itself with 'afterPrev').
const chain = (blocks, effect = 'fade-up', first = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// The same, but by groups (a card and what is on it): each group comes in whole, one group after another.
const cascade = (groups, effect = 'fade-up', first = 'click', props = {}) =>
  groups.flatMap((g, i) => g.map((b, q) => withAnims(b, A(effect, { ...props, start: q ? 'withPrev' : i ? 'afterPrev' : first }))));
// One group per click.
const perClick = (groups, effect = 'fade-up', props = {}) => groups.flatMap(g => together(g, effect, 'click', props));
// numbered(), and on section slides the shapes (glows, decorations) under the title and subtitle.
const finish = deck => { for (const sl of deck.slides) if (sl.layoutId === 'section') sl.blocks.sort((a, b) => (b.type === 'shape') - (a.type === 'shape'));
  return numbered(deck); };
// A 3D model without its caption (the credits go in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color, size = 12) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: size, color });
// The same pseudo-random numbers every time (flour, crumbs, embers).
const rng = seed => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
// A small label in capitals with letter spacing.
const kicker = (t, x, y, w, color, size = 20, props = {}) => text(t, x, y, w, size + 16, { fontSize: size, letterSpacing: 5, color, fontWeight: 700, ...props });
// Specks (flour, chalk dust, ash): small dots in a region.
const specks = (n, seed, color, area = [0, 0, 1280, 720], size = [2, 6], op = [20, 60]) => { const r = rng(seed);
  return Array.from({ length: n }, () => { const d = size[0] + r() * (size[1] - size[0]);
    return shape('ellipse', Math.round(area[0] + r() * area[2]), Math.round(area[1] + r() * area[3]), d, d, color, { opacity: Math.round(op[0] + r() * (op[1] - op[0])) }); }); };
// Pie and doughnut data with a colour per slice.
const slices = (pairs, colors) => pairs.map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
const series = pairs => pairs.map(([label, value]) => ({ label, value }));

// ---- 1 · Masa madre: kraft paper, flour and a scored loaf ---------------------------------
// A round loaf from above: crust, the banneton's floured rings and the cut ('ear', 'cross', 'square', 'wheat').
const loafSVG = (cut = 'ear', d = 400) => svgURL(d, d, `<defs><radialGradient id="c" cx="45%" cy="40%" r="62%"><stop offset="0" stop-color="#dda465"/>`
  + `<stop offset=".7" stop-color="#a9662e"/><stop offset="1" stop-color="#6b3815"/></radialGradient></defs><g transform="scale(${d / 400})">`
  + `<circle cx="200" cy="200" r="186" fill="url(#c)"/>`
  + [150, 112, 74].map(r => `<circle cx="200" cy="200" r="${r}" fill="none" stroke="#f6e9d2" stroke-width="7" opacity=".32"/>`).join('')
  + ({ ear: ['M118 104 C170 150 236 236 290 304'],
    cross: ['M120 120 L280 280', 'M280 120 L120 280'],
    square: ['M130 120 L130 280', 'M270 120 L270 280', 'M120 130 L280 130', 'M120 270 L280 270'],
    wheat: ['M200 70 L200 330', ...[0, 1, 2, 3, 4].flatMap(i => [`M200 ${100 + i * 46} L150 ${80 + i * 46}`, `M200 ${100 + i * 46} L250 ${80 + i * 46}`])] }[cut])
    .map(p => `<path d="${p}" stroke="#5a2c10" stroke-width="${cut === 'wheat' ? 10 : 22}" stroke-linecap="round" fill="none"/><path d="${p}" stroke="#f3d7a6" stroke-width="${cut === 'wheat' ? 5 : 12}" stroke-linecap="round" fill="none"/>`).join('')
  + `</g>`);

// ---- 2 · Cata: wine glasses with their colour -------------------------------------------
// A glass (200 × 360) with wine of a colour (and a darker one at the bottom of the bowl).
const glassSVG = (wine, deep, glass = '#efe6ea') => svgURL(200, 360, `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wine}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>`
  + `<path d="M38 112 C40 182 66 206 100 208 C134 206 160 182 162 112 Z" fill="url(#w)"/><ellipse cx="100" cy="112" rx="62" ry="9" fill="${wine}" opacity=".9"/>`
  + `<path d="M40 18 C28 120 48 204 100 210 C152 204 172 120 160 18" fill="none" stroke="${glass}" stroke-width="4"/>`
  + `<ellipse cx="100" cy="18" rx="60" ry="7" fill="none" stroke="${glass}" stroke-width="3" opacity=".7"/>`
  + `<path d="M58 40 C52 100 58 150 76 182" stroke="#ffffff" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>`
  + `<rect x="96" y="208" width="8" height="112" fill="${glass}"/><ellipse cx="100" cy="326" rx="62" ry="11" fill="${glass}"/>`);
const WINES = { white: ['#f1df86', '#c9a93a'], rose: ['#f6a1a4', '#d9616b'], red: ['#8f1534', '#3d0614'], aged: ['#b5502e', '#5c1d10'] };

// ---- 3 · Tapas: a chalkboard in a wooden frame --------------------------------------------
const CHALK = '#f2efe6', CH_Y = '#f4d35e', CH_P = '#f4a3c0', CH_B = '#9fd6d9', BOARD = '#1f2b26';
const board = (seed = 3) => [
  shape('rect', 0, 0, 1280, 720, BOARD, { fill2: '#16201c', gradType: 'radial' }),
  ...[[180, 120, 520, 200], [760, 420, 600, 220], [80, 480, 420, 160]].map(([x, y, w, h], i) => shape('ellipse', x, y, w, h, '#ffffff', { opacity: 2 + i % 2 })),
  ...specks(40, seed, CHALK, [40, 40, 1200, 640], [1, 3], [10, 30]),
  shape('rect', 0, 0, 1280, 720, 'none', { stroke: '#7a5230', strokeWidth: 36 }),
  shape('rect', 18, 18, 1244, 684, 'none', { stroke: '#4d321c', strokeWidth: 4 })];
// Chalk lines: a hand-drawn outline in chalk.
const chalk = (kind, x, y, w, h, color = CHALK, props = {}) => shape(kind, x, y, w, h, 'none', { stroke: color, strokeWidth: 4, sketch: true, ...props });


// ---- 4 · Ramen: a noren curtain, a red sun and a bowl seen from above ----------------------
// The bowl from above, in shapes with fixed ids (ids[k]) so Transform carries it to the next slide.
const ramenBowl = (cx, cy, r, ids) => { const R = rng(4), out = [], B = (k, b) => out.push({ ...b, id: ids[k] }), e = (k, x, y, w, h, fill, p = {}) =>
  B(k, shape('ellipse', Math.round(cx + x * r - w * r / 2), Math.round(cy + y * r - h * r / 2), Math.round(w * r), Math.round(h * r), fill, p));
  e(0, 0, 0, 2, 2, '#1b1b1b');
  e(1, 0, 0, 1.88, 1.88, 'none', { stroke: '#c8372d', strokeWidth: Math.max(2, Math.round(r / 60)) });
  e(2, 0, 0, 1.7, 1.7, '#e9b870', { fill2: '#b06e2c', gradType: 'radial' });
  B(3, shape('custom', Math.round(cx - r * 0.55), Math.round(cy - r * 0.05), Math.round(r * 0.95), Math.round(r * 0.6), 'none', { stroke: '#f5df9c', strokeWidth: Math.max(3, Math.round(r / 28)),
    path: [0, 20, 40, 60, 80, 100].map(y => `M0 ${y} C15 ${y - 14} 25 ${y + 14} 40 ${y} S65 ${y - 14} 80 ${y} S95 ${y + 10} 100 ${y}`).join(' ') }));
  e(4, -0.42, -0.36, 0.62, 0.56, '#d39a6c', { stroke: '#7a4524', strokeWidth: Math.max(2, Math.round(r / 40)) });
  e(5, -0.42, -0.36, 0.3, 0.26, 'none', { stroke: '#a8673d', strokeWidth: Math.max(2, Math.round(r / 60)) });
  e(6, 0.38, 0.28, 0.5, 0.42, '#fbf6ea');
  e(7, 0.38, 0.28, 0.28, 0.24, '#f2a93b', { fill2: '#d9731c', gradType: 'radial' });
  B(8, shape('rect', Math.round(cx + r * 0.3), Math.round(cy - r * 0.92), Math.round(r * 0.42), Math.round(r * 0.62), '#1f2b24', { rotation: 18 }));
  [[-0.05, -0.55], [0.12, -0.45], [0.02, -0.32], [0.2, -0.6], [-0.15, -0.66], [0.3, -0.18]].forEach(([x, y], i) => e(9 + i, x, y, 0.1, 0.1, '#b9d98a', { stroke: '#5b8c35', strokeWidth: 2 }));
  [[0.55, -0.15, 30], [0.62, 0.02, 60], [0.5, 0.05, 10]].forEach(([x, y, rot], i) => B(15 + i, shape('rounded', Math.round(cx + x * r), Math.round(cy + y * r), Math.round(r * 0.26), Math.round(r * 0.08), '#c79a55', { rotation: rot, radius: 4 })));
  return out; };

// ---- 5 · Legumbres: a seed-packet poster of flat circles ------------------------------------
const PULSES = { lenteja: ['#c8553d', 'Lenteja roja'], garbanzo: ['#e8cf9c', 'Garbanzo'], alubia: ['#2c2522', 'Alubia negra'], verde: ['#7d9a3d', 'Guisante'],
  pinta: ['#9b5a3c', 'Alubia pinta'], soja: ['#e3a93b', 'Soja'] };
// One pulse: a flat disc with a small highlight (and the chickpea's little beak).
const pulse = (x, y, d, color, props = {}) => [shape('ellipse', x, y, d, d, color, props),
  shape('ellipse', x + d * 0.2, y + d * 0.16, d * 0.26, d * 0.16, '#ffffff', { opacity: 30, rotation: -30, ...props })];

// ---- 6 · Paella: the pan from above, over a wood fire ---------------------------------------
// The pan with its handles, the saffron rice and what goes in it (some = how many of the ingredients).
const paellaPan = (cx, cy, r, some = 9, seed = 2) => { const R = rng(seed), out = [];
  const P = (dx, dy) => [Math.round(cx + dx * r), Math.round(cy + dy * r)];
  out.push(shape('rounded', cx - r * 1.24, cy - r * 0.09, r * 0.34, r * 0.18, '#2d2d2d', { radius: 30 }), shape('rounded', cx + r * 0.9, cy - r * 0.09, r * 0.34, r * 0.18, '#2d2d2d', { radius: 30 }),
    shape('ellipse', cx - r, cy - r, 2 * r, 2 * r, '#2d2d2d'), shape('ellipse', cx - r * 0.93, cy - r * 0.93, r * 1.86, r * 1.86, '#4b4b4b'),
    shape('ellipse', cx - r * 0.86, cy - r * 0.86, r * 1.72, r * 1.72, '#f2c14e', { fill2: '#c9781c', gradType: 'radial' }));
  for (let i = 0; i < 90; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * 0.8, [x, y] = P(Math.cos(a) * d, Math.sin(a) * d);
    out.push(shape('ellipse', x, y, r * 0.035, r * 0.018, '#fff1b8', { rotation: Math.round(R() * 180), opacity: 70 })); }
  const items = [];
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, d = 0.5 + (i % 2) * 0.15, [x, y] = P(Math.cos(a) * d, Math.sin(a) * d);       // chicken and rabbit
    items.push(shape('custom', x - r * 0.12, y - r * 0.09, r * 0.24, r * 0.18, i % 3 ? '#d7a067' : '#c58a55', { path: 'M10 50 C0 20 30 0 55 8 C85 0 100 30 92 58 C85 90 40 100 22 88 C10 80 14 66 10 50 Z', stroke: '#8a5428', strokeWidth: 2, rotation: Math.round(R() * 90) })); }
  for (let i = 0; i < 10; i++) { const a = R() * 6.283, d = 0.2 + R() * 0.6, [x, y] = P(Math.cos(a) * d, Math.sin(a) * d);              // flat green beans
    items.push(shape('rounded', x, y, r * 0.22, r * 0.05, '#4f7d2a', { radius: 6, rotation: Math.round(R() * 180), stroke: '#355a1a', strokeWidth: 1 })); }
  for (let i = 0; i < 12; i++) { const a = R() * 6.283, d = 0.15 + R() * 0.65, [x, y] = P(Math.cos(a) * d, Math.sin(a) * d);              // garrofó
    items.push(shape('ellipse', x, y, r * 0.08, r * 0.06, '#efe6c8', { stroke: '#c9bb8a', strokeWidth: 1, rotation: Math.round(R() * 180) })); }
  items.push(shape('custom', cx - r * 0.1, cy - r * 0.3, r * 0.45, r * 0.45, 'none', { stroke: '#2f5d1f', strokeWidth: Math.max(3, r / 50), rotation: 30,  // rosemary
    path: 'M0 100 L100 0 ' + [20, 35, 50, 65, 80].map(k => `M${k} ${100 - k} L${k - 10} ${100 - k - 14} M${k} ${100 - k} L${k + 12} ${100 - k + 8}`).join(' ') }));
  return [...out, ...items.slice(0, Math.round(items.length * some / 9))]; };
// Flames: a ring of tongues of fire round a point, under the pan.
const flames = (cx, cy, r, n = 16, seed = 6) => { const R = rng(seed);
  return Array.from({ length: n }, (_, i) => { const a = i / n * 6.283, h = r * (0.35 + R() * 0.25), w = r * 0.22, x = cx + Math.cos(a) * r - w / 2, y = cy + Math.sin(a) * r - h / 2;
    return shape('custom', Math.round(x), Math.round(y), Math.round(w), Math.round(h), i % 2 ? '#ff8a1c' : '#ffc23d', { fill2: '#c3260f', gradAngle: 90, opacity: 85, rotation: Math.round(a * 57.3 + 90),
      path: 'M50 0 C70 30 100 45 90 75 C82 95 60 100 50 100 C40 100 18 95 10 75 C0 45 30 30 50 0 Z' }); }); };

// ---- 7 · Café: a lab sheet on graph paper, a technical drawing of the dripper -----------------
const graphPaper = (w = 1280, h = 720, ground = '#f5f1e8', line = '#e2dccd', strong = '#d3cab6') => svgURL(w, h,
  `<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 L0 0 0 20" fill="none" stroke="${line}" stroke-width="1"/></pattern>`
  + `<pattern id="G" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#g)"/><path d="M100 0 L0 0 0 100" fill="none" stroke="${strong}" stroke-width="1.5"/></pattern></defs>`
  + `<rect width="${w}" height="${h}" fill="${ground}"/><rect width="${w}" height="${h}" fill="url(#G)"/>`);
// The cone dripper over its server, with dimension lines in blue pen (500 × 560).
const dripperSVG = (ink = '#3b2418', pen = '#2457a6') => svgURL(500, 560,
  `<g fill="none" stroke="${ink}" stroke-width="5" stroke-linejoin="round">`
  + '<path d="M110 70 L390 70 L280 270 L220 270 Z" fill="#ffffff"/><path d="M120 70 L380 70" stroke-width="9"/>'
  + [0, 1, 2, 3].map(i => `<path d="M${165 + i * 50} 82 C${180 + i * 40} 160 ${215 + i * 22} 220 ${232 + i * 12} 262" stroke-width="2.5" opacity=".55"/>`).join('')
  + '<rect x="150" y="270" width="200" height="22" rx="4" fill="#ffffff"/><path d="M390 110 C440 110 450 170 400 190" stroke-width="7"/>'
  + '<path d="M170 300 L330 300 L350 330 C380 380 380 470 350 520 L150 520 C120 470 120 380 150 330 Z" fill="#ffffff"/>'
  + '<path d="M160 420 C200 410 300 410 340 420 L345 500 C330 510 170 510 155 500 Z" fill="#6b3b22" stroke="none" opacity=".85"/></g>'
  + `<g stroke="${pen}" stroke-width="2" fill="${pen}" font-family="monospace" font-size="18">`
  + '<path d="M110 40 L390 40" /><path d="M110 32 L110 48 M390 32 L390 48"/><text x="250" y="30" text-anchor="middle" stroke="none">Ø 116 mm</text>'
  + '<path d="M60 70 L60 270"/><path d="M52 70 L68 70 M52 270 L68 270"/><text x="48" y="175" text-anchor="end" stroke="none">82</text>'
  + '<path d="M250 270 L170 120" stroke-dasharray="6 5" fill="none"/><path d="M250 270 L330 120" stroke-dasharray="6 5" fill="none"/><path d="M215 205 Q250 190 285 205" fill="none"/>'
  + '<text x="250" y="182" text-anchor="middle" stroke="none">60°</text>'
  + '<text x="250" y="552" text-anchor="middle" stroke="none">600 ml</text></g>');

// ---- 8 · Macarons: a pâtisserie window with a striped awning -------------------------------
// A macaron seen from the side, w wide (0,7 w tall): shells, ruffled feet and the filling (ids: Transform).
const macaron = (x, y, w, shell, filling, ids = null) => { const k = v => Math.round(v), parts = [
  shape('custom', k(x), k(y), k(w), k(w * 0.34), shell, { path: 'M0 100 C0 25 25 0 50 0 C75 0 100 25 100 100 Z' }),
  shape('rounded', k(x + w * 0.03), k(y + w * 0.3), k(w * 0.94), k(w * 0.08), shell, { radius: 6, sketch: true, opacity: 80 }),
  shape('rounded', k(x + w * 0.06), k(y + w * 0.37), k(w * 0.88), k(w * 0.11), filling, { radius: 10 }),
  shape('rounded', k(x + w * 0.03), k(y + w * 0.47), k(w * 0.94), k(w * 0.08), shell, { radius: 6, sketch: true, opacity: 80 }),
  shape('custom', k(x), k(y + w * 0.53), k(w), k(w * 0.17), shell, { path: 'M0 0 L100 0 C100 55 80 100 50 100 C20 100 0 55 0 0 Z' }),
  shape('ellipse', k(x + w * 0.2), k(y + w * 0.06), k(w * 0.22), k(w * 0.07), '#ffffff', { opacity: 35, rotation: -12 })];
  return ids ? parts.map((b, i) => ({ ...b, id: ids[i] })) : parts; };
// The striped awning with its scalloped edge.
const awning = (h = 90, a = '#f4b6c2', b = '#fffaf5', n = 16) => { const w = 1280 / n;
  return [...Array.from({ length: n }, (_, i) => shape('rect', Math.round(i * w), 0, Math.ceil(w), h, i % 2 ? b : a)),
    ...Array.from({ length: n }, (_, i) => shape('ellipse', Math.round(i * w), h - w / 2, Math.ceil(w), Math.round(w), i % 2 ? b : a))]; };

// ---- 9 · Quesos: a wooden board and wedges -------------------------------------------------
// A board of wood with its grain (w × h).
const woodSVG = (w, h, round = false) => { const R = rng(w + h);
  return svgURL(w, h, `<defs><clipPath id="c">${round ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>` : `<rect width="${w}" height="${h}" rx="${h * 0.08}"/>`}</clipPath></defs>`
    + `<g clip-path="url(#c)"><rect width="${w}" height="${h}" fill="#b07a42"/>`
    + Array.from({ length: Math.round(h / 9) }, (_, i) => { const y = i * 9 + R() * 4;
      return `<path d="M0 ${y.toFixed(0)} C${w * 0.3} ${(y + R() * 10 - 5).toFixed(0)} ${w * 0.6} ${(y + R() * 12 - 6).toFixed(0)} ${w} ${(y + R() * 8 - 4).toFixed(0)}" stroke="${R() > 0.5 ? '#9a6532' : '#c48d52'}" stroke-width="${(1 + R() * 2.5).toFixed(1)}" fill="none" opacity=".7"/>`; }).join('')
    + `<ellipse cx="${w * 0.7}" cy="${h * 0.4}" rx="14" ry="7" fill="none" stroke="#8a5a2c" stroke-width="2"/></g>`
    + (round ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="none" stroke="#7a4f26" stroke-width="4"/>` : `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="${h * 0.08}" fill="none" stroke="#7a4f26" stroke-width="4"/>`)); };
// A wedge of cheese from the side, with its rind and a few holes.
const wedge = (x, y, w, h, paste, rind, holes = 0, props = {}) => { const R = rng(x + y);
  return [shape('custom', x, y, w, h, paste, { path: 'M0 100 L100 100 L100 0 Z', stroke: rind, strokeWidth: 5, ...props }),
    shape('rect', x + w - 10, y + 4, 10, h - 4, rind, props),
    ...Array.from({ length: holes }, () => { const u = 0.45 + R() * 0.45, v = 1 - (1 - u) * 0.2 - R() * (u - 0.3) * 0.7, d = 8 + R() * 14;
      return shape('ellipse', Math.round(x + u * w - d / 2), Math.round(y + v * h - d / 2), Math.round(d), Math.round(d * 0.8), '#d9b45a', props); })]; };
// A round cheese from above with a slice cut out (cut: degrees missing).
const wheelPath = (cut = 50) => { const pts = []; for (let a = cut / 2; a <= 360 - cut / 2; a += 6) pts.push([50 + 50 * Math.cos(a * Math.PI / 180), 50 + 50 * Math.sin(a * Math.PI / 180)]);
  return 'M50 50 ' + pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z'; };

// ---- 10 · Brasa: embers under a grate ---------------------------------------------------------
const embers = (n, seed, area) => { const R = rng(seed);
  return Array.from({ length: n }, () => { const d = 10 + R() * 30, c = ['#ff6b1a', '#ffb347', '#d7261e', '#3a2a24'][Math.floor(R() * 4)];
    return shape('ellipse', Math.round(area[0] + R() * area[2]), Math.round(area[1] + R() * area[3]), Math.round(d), Math.round(d * 0.8), c, c === '#3a2a24' ? {} : { fill2: '#3a1208', gradType: 'radial', opacity: 90 }); }); };
const grate = (x, y, w, h, n = 9, color = '#3a3634') => Array.from({ length: n }, (_, i) => shape('rounded', x, Math.round(y + i * h / n), w, 8, color, { radius: 4, fill2: '#5c5653', gradAngle: 90 }));

export default {
  // ---------------------------------------------------------------------------------
  // 1 · Sourdough at home: kraft paper and flour, a loaf drawn from above with its cut,
  // baker's percentages that add up, a day on a clock, folds with a timer, the oven.
  life_food_sourdough: { name: 'Pan de masa madre en casa', cat: 'life',
    summary: 'Hogaza en SVG con texto curvo, porcentajes del panadero con fórmulas, ecuación de hidratación, jornada en cadena, cuenta atrás y ordenar',
    make: () => {
      const KRAFT = '#e9dbc1', PAPER = '#f6efe1', INK = '#3b2a1a', RUST = '#a4521f', WHEAT = '#c99a3c', OVEN = '#1c110b', SOFT = '#6e5843';
      const H = pairStacks('classic').heading;
      const flour = seed => specks(70, seed, '#ffffff', [0, 0, 1280, 720], [2, 7], [25, 70]);
      const day = [['8:00', 'Refresco', 'La masa madre come harina y agua'], ['12:00', 'Autólisis', 'Harina y agua reposan 1 hora'],
        ['13:00', 'Amasado', 'Entran la masa madre y la sal'], ['13:30', 'Pliegues', 'Cuatro tandas, cada 30 min'],
        ['15:30', 'Fermentación', 'Hasta que crezca la mitad'], ['19:00', 'Formado', 'Bola tensa al banneton'],
        ['20:00', 'Nevera', 'De 12 a 14 horas a 4 °C'], ['9:00', 'Horno', '45 minutos… y esperar']];
      const deck = build({ name: 'Pan de masa madre', palette: 'forest', fonts: 'classic', title: { size: 48, color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: KRAFT, transition: 'fade', extra: [
          ...flour(5),
          glow(620, 40, 680, '#f7ead2', KRAFT, 90),
          at(img(loafSVG('ear'), 720, 140, 440, 440, { alt: 'Hogaza redonda vista desde arriba, con un corte en forma de oreja' }), 'zoom-in', { start: 'afterPrev', duration: 1200 }),
          at(text('48 horas · 3 ingredientes · 1 hogaza · 48 horas · 3 ingredientes · 1 hogaza · ', 680, 100, 520, 520, { fontSize: 22, curve: 100, letterSpacing: 3, color: RUST, fontWeight: 700, textAlign: 'center' }), 'fade-in', { start: 'afterPrev', duration: 1200 }),
          kicker('TALLER DE PANADERÍA · SÁBADO 10:00', 92, 170, 560, RUST),
          text('Masa<br>madre', 84, 210, 580, 290, { fontFamily: H, fontSize: 132, color: INK, lineHeight: 1 }),
          shape('rect', 92, 520, 90, 5, RUST), shape('rect', 188, 520, 40, 5, WHEAT),
          text('Harina, agua, sal… y mucha paciencia', 92, 545, 560, 50, { fontSize: 30, fontStyle: 'italic', color: SOFT })],
          notes: 'Portada: la hogaza es un dibujo SVG (corteza con degradado, anillos de harina del banneton y el corte) que aparece sola con un zoom; el texto curvo la rodea. La harina esparcida son formas pequeñas.' },
        { title: 'Tres ingredientes, una fórmula', layout: 'titleOnly', bg: PAPER, extra: [
          text('Todo se mide respecto a la harina, que vale siempre 100.', 100, 150, 640, 40, { fontSize: 22, color: SOFT, fontStyle: 'italic' }),
          tableBlock({ x: 100, y: 205, w: 620, h: 420, fontSize: 23, header: true, headBg: INK, headFg: PAPER, stroke: '#d8c7a6', banded: true, band: WHEAT, bandAlpha: 0.14, color: INK,
            rows: [['Ingrediente', 'Gramos', '% panadero'], ['Harina de fuerza', '800', '=B2/(B2+B3)*100'], ['Harina integral', '200', '=B3/(B2+B3)*100'],
              ['Agua', '750', '=B4/(B2+B3)*100'], ['Masa madre', '200', '=B5/(B2+B3)*100'], ['Sal', '20', '=B6/(B2+B3)*100'], ['<b>Masa total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [5, 2, 3] }),
          shape('rounded', 770, 205, 420, 420, '#ffffff', { radius: 18, stroke: '#e3d5bb', strokeWidth: 2 }),
          kicker('HIDRATACIÓN', 800, 228, 360, RUST, 18),
          text('<i>H</i> = agua ÷ harina × 100', 800, 290, 360, 70, { fontFamily: H, fontSize: 32, color: INK, textAlign: 'center', vAlign: 'middle' }),
          at(mathBlock({ x: 790, y: 390, w: 380, h: 100, fontSize: 32, color: RUST, latex: '= \\frac{750}{1000} \\times 100 = 75\\,\\%' }), 'fade-up'),
          at(text('Una masa húmeda pero manejable: alveolo abierto sin pelearse con ella.', 800, 505, 360, 100, { fontSize: 21, color: SOFT }), 'fade-up', { start: 'afterPrev' })],
          notes: 'La columna de porcentajes se calcula sola: cada fila divide sus gramos entre la harina total (fórmula =B4/(B2+B3)*100) y la última fila suma. Clic: el ejemplo de la hidratación con números.' },
        { title: 'Un día en la vida de una hogaza', layout: 'titleOnly', bg: KRAFT, extra: [
          shape('rounded', 90, 352, 1100, 14, '#d4bf98', { radius: 7 }),
          at(shape('rounded', 90, 352, 1100, 14, RUST, { radius: 7 }), 'fade-in', { start: 'click', duration: 300 }),
          ...cascade(day.map(([t, n, d], i) => { const x = 110 + i * 148, up = i % 2 === 0, lx = Math.max(40, Math.min(1040, x + 25 - 110));
            return [shape('ellipse', x + 8, 342, 34, 34, i === 6 ? '#3b4a6b' : i === 7 ? RUST : PAPER, { stroke: INK, strokeWidth: 3 }),
              text(`<div style="font-family:${H};font-size:32px;color:${RUST}">${t}</div><div style="font-weight:700;font-size:23px">${n}</div><div>${d}</div>`,
                lx, up ? 180 : 392, 220, 160, { fontSize: 19, color: INK, vAlign: up ? 'bottom' : 'top', lineHeight: 1.2, textAlign: 'center' })]; }), 'fade-up', 'afterPrev', { duration: 350 }),
          
          text('La nevera no es un castigo: el frío frena la levadura y deja trabajar a las bacterias que dan sabor.', 90, 600, 900, 70, { fontSize: 21, fontStyle: 'italic', color: SOFT })],
          notes: 'Clic: la barra se colorea y las ocho paradas del día aparecen una tras otra, solas. Los horarios son un ejemplo para hornear el domingo por la mañana.' },
        { title: 'Mira la masa, no el reloj', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 470, chartType: 'line', color: RUST, seriesName: 'Cocina a 24 °C', grid: true, yTitle: 'Crecimiento del volumen (%)', yMin: 0, yMax: 100,
            data: series([['0 h', 0], ['1 h', 5], ['2 h', 15], ['3 h', 30], ['4 h', 50], ['5 h', 70], ['6 h', 85]]),
            series: [{ name: 'Cocina a 20 °C', values: [0, 2, 6, 12, 22, 34, 50], color: '#5b7aa6' }] }),
          card(`<div style="font-family:${H};font-size:80px;color:${RUST};line-height:1">+50 %</div><div style="margin-top:8px">es la señal para formar.</div>`, 830, 180, 360, 200, '#ffffff', { fontSize: 24, color: INK, radius: 16, stroke: '#e3d5bb' }),
          ...chain([['circle', 'Burbujas en los bordes del recipiente'], ['circle', 'Superficie abombada y brillante'], ['circle', 'Tiembla como un flan al moverla']].map(([ic, t], i) =>
            text(`<span style="color:${RUST}">●</span>&nbsp; ${t}`, 840, 410 + i * 66, 350, 60, { fontSize: 21, color: INK, vAlign: 'middle' })), 'fade-left', 'click')],
          notes: 'Dos líneas: con 4 °C menos, la misma masa tarda casi el doble. Curvas orientativas, no medidas. Clic: las tres señales de que la masa está lista, una tras otra.' },
        { title: 'Pliegues: fuerza sin amasar', layout: 'titleOnly', bg: KRAFT, extra: [
          ...together([['arrow-up', 0, 'Estira hacia arriba'], ['arrow-down', 0, 'Dobla sobre sí'], ['arrow-left', 0, 'Gira y repite'], ['arrow-up-right', 0, 'Deja reposar']].flatMap(([ic, r, t], i) => {
            const x = 100 + (i % 2) * 330, y = 180 + Math.floor(i / 2) * 230;
            return [shape('rounded', x, y, 300, 205, PAPER, { radius: 18, stroke: '#d4bf98', strokeWidth: 2 }),
              shape('ellipse', x + 24, y + 30, 120, 100, '#f4e3c4', { stroke: '#c9ab7a', strokeWidth: 3 }), icon(ic, x + 60, y + 56, 48, RUST),
              text(String(i + 1), x + 190, y + 26, 90, 110, { fontFamily: H, fontSize: 84, color: '#d9b98a', textAlign: 'center' }),
              text(t, x + 24, y + 145, 260, 44, { fontSize: 23, color: INK, fontWeight: 700 })]; }), 'fade-up', 'click'),
          timer(1800, 830, 190, 330, { color: RUST, endText: '¡Pliegue!' }),
          text('Cuatro tandas, cada 30 minutos.<br>Con las manos mojadas.', 790, 545, 410, 80, { fontSize: 23, color: INK, textAlign: 'center' })],
          notes: 'Los cuatro gestos aparecen juntos con un clic. La cuenta atrás de 30 minutos empieza sola: déjala corriendo mientras se hacen los pliegues en el taller.' },
        { title: 'El greñado: la firma del panadero', layout: 'titleOnly', bg: PAPER, extra: [
          ...cascade([['ear', 'Oreja', 'Un corte largo y en ángulo: la corteza se levanta.'], ['cross', 'Cruz', 'Abre en cuatro: crece por igual hacia arriba.'],
            ['square', 'Cuadro', 'Cuatro cortes rectos: una tapa que sube.'], ['wheat', 'Espiga', 'Tijera en V a los lados: solo para lucirse.']].map(([k, n, d], i) => { const x = 90 + i * 280;
            return [shape('rounded', x, 180, 260, 450, '#ffffff', { radius: 18, stroke: '#e3d5bb', strokeWidth: 2 }),
              img(loafSVG(k, 220), x + 25, 200, 210, 210, { alt: `Hogaza con corte en ${n.toLowerCase()}` }),
              text(`<div style="font-family:${H};font-size:34px;color:${RUST}">${n}</div><div style="margin-top:6px">${d}</div>`, x + 22, 430, 216, 180, { fontSize: 20, color: INK, textAlign: 'center' })]; }), 'flip', 'click', { duration: 500 })],
          notes: 'Las cuatro tarjetas entran girando una tras otra con un clic. Cada hogaza es el mismo dibujo SVG con un corte distinto. Cuchilla bien afilada y sin dudar.' },
        { layout: 'blank', bg: OVEN, transition: 'fade', extra: [
          glow(340, 200, 760, '#d9561b', OVEN, 55), glow(820, 380, 420, '#ffb347', OVEN, 30),
          kicker('EL HORNO · GRADOS CENTÍGRADOS', 90, 90, 700, '#ffcf99', 22),
          at(text('250°', 80, 120, 760, 230, { fontFamily: H, fontSize: 210, wordart: 'gradient', wordartColor: '#ffb347', lineHeight: 1 }), 'zoom-in', { start: 'afterPrev', duration: 900, sound: 'whoosh' }),
          text('Precalentado una hora con la olla de hierro dentro.', 92, 360, 700, 50, { fontSize: 28, color: '#f4dcc0' }),
          ...chain([['20 min', 'con tapa', 'El vapor deja crecer la hogaza'], ['25 min', 'sin tapa, a 230 °C', 'La corteza se dora y cruje'], ['1 hora', 'sobre una rejilla', 'Cortarla antes la deja gomosa']].map(([n, s, d], i) =>
            card(`<div style="font-family:${H};font-size:46px;color:#ffb347;line-height:1">${n}</div><div style="font-weight:700">${s}</div><div style="color:#d9bfa3">${d}</div>`, 90 + i * 375, 450, 350, 190, '#2c1b11', { fontSize: 21, color: '#f8ead8', radius: 14 })), 'fade-up', 'click')],
          notes: 'Text Art de estilo degradado con color propio para la temperatura, que entra con un silbido. Clic: las tres fases del horneado. Lo más difícil: esperar una hora antes de cortar.' },
        { layout: 'blank', bg: PAPER, extra: [
          shape('rect', 0, 0, 1280, 50, KRAFT), ...specks(30, 9, '#ffffff', [0, 0, 1280, 50], [2, 5], [40, 80]),
          pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena los pasos para hacer la hogaza', x: 90, y: 90, w: 1100, h: 570,
            options: ['Refrescar la masa madre', 'Autólisis de harina y agua', 'Amasar con la sal', 'Pliegues y fermentación', 'Formar y meter en la nevera', 'Hornear con tapa y sin tapa'] })],
          notes: 'Actividad de ordenar desde el móvil: cada uno coloca los pasos y Revela corrige. El orden correcto es el de la jornada.' },
        { layout: 'section', bg: KRAFT, title: '¡A hornear!', subtitle: 'Trae un tarro: cada uno se lleva masa madre a casa', transition: 'zoom', back: [...flour(13),
          img(loafSVG('cross', 300), -80, 470, 300, 300, { alt: '', decorative: true }), img(loafSVG('wheat', 300), 1060, -80, 300, 300, { alt: '', decorative: true })],
          notes: 'Cierre con transición «Zoom». Reparte masa madre al terminar: es el mejor recuerdo del taller.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 110, color: INK }); if (b.ph === 'subtitle') Object.assign(b, { color: RUST, fontStyle: 'italic' }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 2 · A blind wine tasting: a cellar by candlelight, glasses drawn with their wine,
  // the three senses, the colour scale, the aroma families, two reds on a radar,
  // the price per glass, a quiz, a word cloud and a toast that chimes.
  life_food_wine: { name: 'Cata de vino a ciegas', cat: 'life',
    summary: 'Copas en SVG que se llenan, escala de color con degradados, diagramas de chevrones y radial, radar de dos vinos, fórmulas y brindis con sonido',
    make: () => {
      const CELLAR = '#1f0911', DEEP = '#2b0d17', GOLD = '#d9b36c', CREAM = '#f4e9dc', DIM = '#bfa3a8', WINE = '#a01d3f';
      const H = pairStacks('editorial').heading, CG = FF.cormorant;
      const glass = (k, x, y, w = 150, props = {}) => img(glassSVG(...WINES[k]), x, y, w, w * 1.8, { alt: { white: 'Copa de vino blanco', rose: 'Copa de rosado', red: 'Copa de tinto', aged: 'Copa de tinto con años' }[k], ...props });
      const deck = build({ name: 'Cata a ciegas', palette: 'warm', fonts: 'editorial', title: { size: 46, color: GOLD, bold: false }, body: { color: CREAM } }, [
        { layout: 'blank', bg: CELLAR, transition: 'fade', transitionSpeed: 'slow', extra: [
          glow(-200, -260, 900, '#6b2a1c', CELLAR, 70), glow(640, 300, 700, '#4a1024', CELLAR, 60),
          shape('rect', 0, 600, 1280, 120, '#4a2016', { fill2: '#1a0a08', gradAngle: 90 }), shape('rect', 0, 600, 1280, 4, '#6b3322'),
          kicker('CATA A CIEGAS · VIERNES 19:30', 90, 180, 600, GOLD),
          text('Aprender<br>a catar', 84, 220, 620, 260, { fontFamily: H, fontSize: 104, color: CREAM, lineHeight: 1.08 }),
          text('Tres copas, tres vinos y ningún prejuicio', 90, 490, 560, 50, { fontSize: 28, fontFamily: CG, fontStyle: 'italic', color: DIM }),
          text('vista · nariz · boca · ', 690, 170, 520, 240, { fontSize: 34, curve: 40, letterSpacing: 8, color: GOLD, textAlign: 'center', fontFamily: CG, fontWeight: 700 }),
          ...chain([glass('white', 720, 352, 140), glass('rose', 875, 334, 150), glass('red', 1040, 316, 160)], 'fade-up', 'afterPrev', { duration: 700 })],
          notes: 'Las copas son dibujos SVG (cristal, vino con degradado y reflejo) que suben una tras otra al llegar. El texto curvo las corona como una etiqueta.' },
        { title: 'Tres sentidos, en este orden', layout: 'titleOnly', bg: DEEP, extra: [
          dg('chevrons', 'Vista\n  Color, capa y lágrima\nNariz\n  Primero quieta, luego girando\nBoca\n  Acidez, tanino, cuerpo y final', 90, 190, 1100, 260, { oneByOne: true, colors: 'accent', fontScale: 1.15 }),
          ...[['eye', 'Copa inclinada sobre un papel blanco'], ['wind', 'Gira la copa: el aire abre los aromas'], ['smile', 'Un sorbo pequeño que recorra toda la boca']].flatMap(([ic, t], i) =>
            [shape('rounded', 90 + i * 375, 420, 350, 140, '#3a1422', { radius: 14 }), icon(ic, 115 + i * 375, 466, 48, GOLD), text(t, 180 + i * 375, 440, 240, 100, { fontSize: 22, color: CREAM, vAlign: 'middle' })]),
          text('Y entre vino y vino: agua y un trozo de pan sin sal.', 90, 610, 1100, 40, { fontSize: 22, fontStyle: 'italic', color: DIM, textAlign: 'center' })],
          notes: 'Diagrama de chevrones uno a uno: cada clic añade una fase. Debajo, el gesto de cada una.' },
        { title: 'La paleta del color', layout: 'titleOnly', bg: CELLAR, extra: [
          kicker('BLANCOS', 90, 180, 300, GOLD, 18),
          shape('rounded', 90, 220, 1100, 70, '#f6eeb0', { fill2: '#b9741e', gradAngle: 0, radius: 35 }),
          ...['Limón pálido', 'Paja', 'Dorado', 'Ámbar'].map((t, i) => text(t, 90 + i * 300, 300, 260, 34, { fontSize: 20, color: CREAM })),
          kicker('TINTOS', 90, 380, 300, GOLD, 18),
          shape('rounded', 90, 420, 1100, 70, '#5b0f5e', { fill2: '#b0532c', gradAngle: 0, radius: 35 }),
          ...['Violáceo', 'Rubí', 'Granate', 'Teja'].map((t, i) => text(t, 90 + i * 300, 500, 260, 34, { fontSize: 20, color: CREAM })),
          withAnims(shape('triangle', 98, 548, 40, 30, GOLD), path([[1040, 0]], { duration: 3000 })),
          text('Con los años, el blanco se oscurece y el tinto se aclara: el color dice la edad.', 90, 600, 1100, 50, { fontSize: 24, color: CREAM, fontFamily: CG, fontStyle: 'italic', textAlign: 'center' })],
          notes: 'Dos franjas con degradado de izquierda a derecha. Clic: la marca recorre la escala, de vino joven a vino con años.' },
        { title: 'Qué buscamos en la nariz', layout: 'titleOnly', bg: DEEP, extra: [
          dg('radial', 'Aromas\n  Fruta\n  Flores\n  Especias\n  Madera\n  Tierra\n  Lácteos', 70, 160, 600, 500, { oneByOne: true, colors: 'accent', fontScale: 1.05 }),
          ...[['Primarios', 'Vienen de la uva: fruta, flores, hierba.', '#e8c86a'], ['Secundarios', 'De la fermentación: pan, levadura, yogur.', '#e2878f'], ['Terciarios', 'De la crianza: vainilla, cuero, tabaco.', '#b5502e']].map(([n, d, c], i) =>
            card(`<div style="font-family:${H};font-size:30px;color:${c}">${n}</div><div style="margin-top:4px">${d}</div>`, 720, 180 + i * 158, 470, 140, '#3a1422', { fontSize: 22, color: CREAM, radius: 14 }))],
          notes: 'Diagrama radial uno a uno con las seis familias de aromas. Al lado, las tres capas de aromas, de la uva a la bodega.' },
        { title: 'Dos tintos, dos caracteres', layout: 'titleOnly', bg: CELLAR, extra: [
          shape('rounded', 90, 170, 640, 480, '#f6eee6', { radius: 18 }),
          chartBlock({ x: 110, y: 185, w: 600, h: 450, chartType: 'radar', color: WINE, seriesName: 'Vino 2 · joven', yMax: 10,
            data: series([['Acidez', 7], ['Tanino', 5], ['Cuerpo', 5], ['Alcohol', 6], ['Fruta', 9], ['Final', 5]]),
            series: [{ name: 'Vino 3 · crianza', values: [5, 8, 8, 7, 5, 8], color: '#b5802e' }] }),
          img(glassSVG(...WINES.red), 780, 190, 110, 198, { alt: 'Copa del vino joven' }), img(glassSVG(...WINES.aged), 780, 420, 110, 198, { alt: 'Copa del vino de crianza' }),
          text(`<div style="font-family:${H};font-size:30px;color:${GOLD}">Joven</div><div>Fruta roja, fresco y fácil. Sin madera.</div>`, 910, 220, 280, 160, { fontSize: 22, color: CREAM }),
          text(`<div style="font-family:${H};font-size:30px;color:${GOLD}">Crianza</div><div>Doce meses en barrica: más tanino, más largo.</div>`, 910, 450, 280, 160, { fontSize: 22, color: CREAM })],
          notes: 'Gráfico de radar con dos series: las notas (de 0 a 10) que dio el grupo a los vinos 2 y 3 en un ensayo. Son puntuaciones de ejemplo.' },
        { title: 'Temperatura y precio por copa', layout: 'titleOnly', bg: DEEP, extra: [
          shape('rounded', 120, 190, 36, 400, '#f4e9dc', { radius: 18 }), shape('ellipse', 104, 560, 68, 68, WINE), shape('rounded', 130, 360, 16, 220, WINE, { radius: 8 }),
          ...[['18 °C', 'Tinto con crianza', 210, WINES.aged[0]], ['15 °C', 'Tinto joven', 290, '#e0607f'], ['10 °C', 'Rosado', 390, WINES.rose[0]], ['8 °C', 'Blanco', 450, WINES.white[0]], ['6 °C', 'Espumoso', 510, '#f4e9dc']].flatMap(([t, n, y, c]) =>
            [shape('rect', 160, y + 14, 40, 3, c), text(`<b style="color:${c}">${t}</b> &nbsp;${n}`, 210, y, 330, 34, { fontSize: 21, color: CREAM, vAlign: 'middle' })]),
          tableBlock({ x: 560, y: 190, w: 630, h: 330, fontSize: 22, header: true, headBg: WINE, headFg: '#ffffff', stroke: '#5a2a38', banded: true, band: '#3a1422', color: CREAM,
            rows: [['Vino', 'Botella', 'Copas', '€ por copa'], ['1 · Blanco', '9,50 €', '6', '=B2/C2'], ['2 · Tinto joven', '7,50 €', '6', '=B3/C3'], ['3 · Crianza', '14,20 €', '6', '=B4/C4'], ['<b>Media</b>', '=PROMEDIO(ARRIBA)', '', '=PROMEDIO(ARRIBA)']], colW: [4, 3, 2, 3] }),
          text('Una botella da seis copas de cata (de 12 cl). La tabla calcula cuánto cuesta cada una.', 560, 545, 630, 70, { fontSize: 21, color: DIM })],
          notes: 'Termómetro dibujado con formas y la temperatura de servicio de cada tipo. La tabla divide el precio entre las copas (=B2/C2) y hace la media. Precios inventados.' },
        { layout: 'blank', bg: CELLAR, extra: [
          glow(900, -200, 600, '#4a1024', CELLAR, 70),
          pollBlock({ kind: 'quiz', fontSize: 36, question: '¿Cuál de estas uvas es tinta?', options: ['Tempranillo', 'Albariño', 'Verdejo', 'Godello'], correct: [0], time: 20, x: 90, y: 80, w: 1100, h: 560 })],
          notes: 'Concurso desde el móvil, con puntos por acertar y por rapidez. Albariño, Verdejo y Godello son uvas blancas.' },
        { layout: 'blank', bg: DEEP, extra: [
          img(glassSVG(...WINES.red), 1100, 420, 120, 216, { alt: '', decorative: true, opacity: 60 }),
          pollBlock({ kind: 'word', fontSize: 34, question: 'El vino nº 3 en una palabra', x: 90, y: 80, w: 980, h: 560 })],
          notes: 'Nube de palabras: cada uno describe el vino en una palabra desde el móvil. Las que se repiten crecen: así se ve el vocabulario del grupo.' },
        { layout: 'blank', bg: CELLAR, transition: 'fade', extra: [
          glow(340, 120, 600, '#7a3a1c', CELLAR, 60),
          withAnims(img(glassSVG(...WINES.red), 200, 260, 180, 324, { alt: 'Copa de tinto', rotation: 12 }), path([[260, -20]], { duration: 1200, start: 'afterPrev' })),
          withAnims(img(glassSVG(...WINES.white), 900, 260, 180, 324, { alt: 'Copa de blanco', rotation: -12 }), path([[-260, -20]], { duration: 1200, start: 'withPrev', sound: 'chime' })),
          text('¡Salud!', 290, 90, 700, 150, { fontFamily: H, fontSize: 120, color: GOLD, textAlign: 'center' }),
          text('La próxima cata: espumosos para fin de año', 290, 620, 700, 50, { fontSize: 26, fontFamily: CG, fontStyle: 'italic', color: DIM, textAlign: 'center' })],
          notes: 'Las dos copas se acercan solas y brindan con un sonido de campanilla. Recuerda: quien conduce, escupe (hay escupideras en la mesa).' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 3 · A tapas crawl: a chalkboard in a wooden frame, chalk drawings and writing,
  // a map of the neighbourhood, the board's prices that add up, the bill on paper.
  life_food_tapas: { name: 'Ruta de tapas por el barrio', cat: 'life',
    summary: 'Pizarra de bar con tiza a mano alzada, mapa con recorrido, precios con fórmulas, cuenta en papel con barras apiladas, votación y cuenta atrás',
    make: () => {
      const CV = FF.caveat;
      const stops = [['La Bodega', 'Croquetas de jamón', 170, 420], ['El Tostadero', 'Montaditos de lomo', 330, 300], ['Taberna del Sur', 'Boquerones en vinagre', 470, 430],
        ['La Barra', 'Pulpo a la gallega', 560, 250], ['El Último Trago', 'Vermut y gildas', 680, 360]];
      const map = svgURL(680, 440, `<g stroke="${CHALK}" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round">`
        + '<path d="M0 120 C200 110 420 130 680 100"/><path d="M0 330 C220 340 460 320 680 350"/><path d="M120 0 C130 150 110 300 140 440"/>'
        + '<path d="M300 0 C290 160 310 300 300 440"/><path d="M520 0 C530 140 500 300 540 440"/><path d="M0 220 L680 230" stroke-dasharray="6 10"/></g>'
        + `<g fill="${CHALK}" opacity=".18">${Array.from({ length: 14 }, (_, i) => { const r = rng(30 + i); return `<rect x="${(20 + r() * 620).toFixed(0)}" y="${(20 + r() * 380).toFixed(0)}" width="${(30 + r() * 40).toFixed(0)}" height="${(24 + r() * 30).toFixed(0)}" rx="4"/>`; }).join('')}</g>`
        + `<circle cx="600" cy="60" r="34" fill="none" stroke="${CH_B}" stroke-width="3"/>`);
      const OX = 60, OY = 190;
      const routePts = stops.map(([, , x, y]) => [x, y]);
      const deck = build({ name: 'De tapas por el barrio', palette: 'midnight', fonts: 'friendly', title: { size: 64, color: CHALK, font: CV, bold: false }, body: { color: CHALK } }, [
        { layout: 'blank', bg: BOARD, transition: 'fade', extra: [
          ...board(1),
          kicker('SÁBADO · 20:00 · 5 BARES · 1 BARRIO', 100, 140, 700, CH_Y, 20),
          text('De tapas', 90, 170, 700, 200, { fontFamily: CV, fontSize: 180, color: CHALK, lineHeight: 1 }),
          text('por el barrio', 100, 360, 600, 90, { fontFamily: CV, fontSize: 72, color: CH_P }),
          at(chalk('custom', 100, 455, 520, 30, CH_Y, { path: 'M0 60 C20 20 40 80 60 40 S90 30 100 50' }), 'wipe', { dir: 'left', start: 'afterPrev', duration: 1400 }),
          text('Quedamos en la plaza. Se paga a escote y se pide para compartir.', 100, 520, 600, 80, { fontSize: 26, color: CHALK }),
          // a glass of wine, a plate with a skewer and a toothpick flag, in chalk
          chalk('custom', 820, 150, 120, 220, CHALK, { path: 'M10 0 C0 40 10 70 50 75 C90 70 100 40 90 0 Z M50 75 L50 92 M20 100 L80 100' }),
          shape('custom', 822, 182, 116, 54, CH_P, { path: 'M2 30 C6 70 30 100 50 100 C70 100 94 70 98 30 Z', opacity: 55, sketch: true }),
          chalk('ellipse', 900, 420, 300, 120, CHALK),
          chalk('ellipse', 935, 440, 230, 80, CHALK, { strokeWidth: 2 }),
          chalk('custom', 960, 330, 180, 150, CH_Y, { path: 'M0 100 L100 0' }),
          ...[[0.22, CH_P], [0.42, '#9bcf7a'], [0.62, CH_Y]].map(([k, c]) => shape('ellipse', 960 + 180 * k - 18, 330 + 150 * (1 - k) - 16, 36, 32, c, { sketch: true, opacity: 85 })),
          at(text('¡olé!', 1050, 250, 160, 70, { fontFamily: CV, fontSize: 52, color: CH_Y, rotation: -12, textAlign: 'center' }), 'jump', { start: 'afterPrev' })],
          notes: 'Una pizarra de bar: fondo verde oscuro con polvo de tiza, marco de madera y dibujos con trazo a mano (formas con la opción «A mano alzada»). El subrayado aparece solo, de izquierda a derecha (efecto Barrido).' },
        { title: 'La ruta', layout: 'titleOnly', bg: BOARD, back: board(2), extra: [
          img(map, OX, OY, 680, 440, { alt: 'Plano del barrio dibujado con tiza' }),
          text('plaza', OX + 540, OY + 38, 120, 44, { fontFamily: CV, fontSize: 26, color: CH_B, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }),
          withAnims(chalk('custom', OX + 170, OY + 250, 510, 180, CH_Y, { strokeWidth: 5, dash: 'dash',
            path: 'M0 94 L31.4 28 L58.8 100 L76.5 0 L100 61' }), A('wipe', { dir: 'left', duration: 2400 })),
          ...chain(stops.map(([n, , x, y], i) => text(String(i + 1), OX + x - 24, OY + y - 24, 48, 48, { fontFamily: CV, fontSize: 32, fontWeight: 700, color: BOARD, bg: CH_Y, radius: 24, textAlign: 'center', vAlign: 'middle' })), 'bounce', 'afterPrev', { duration: 400, sound: 'pop' }),
          ...stops.map(([n, t], i) => text(`<span style="font-family:${CV};font-size:34px;color:${CH_Y}">${i + 1}. ${n}</span><br><span style="color:${CH_B}">${t}</span>`, 790, 180 + i * 92, 420, 86, { fontSize: 21, color: CHALK }))],
          notes: 'Clic: la ruta se dibuja con tiza y después aparecen los cinco bares con un «pop». Los bares y el barrio son inventados para el ejemplo.' },
        { title: 'Lo que hay en la pizarra', layout: 'titleOnly', bg: BOARD, back: board(4), extra: [
          tableBlock({ x: 90, y: 180, w: 720, h: 440, fontSize: 24, header: true, headBg: '#2c3b35', headFg: CH_Y, stroke: '#5f6f68', color: CHALK,
            rows: [['Tapa', '€', 'Cuántas', 'Total'], ['Croquetas (2 uds.)', '3,50 €', '4', '=B2*C2'], ['Montadito de lomo', '2,50 €', '6', '=B3*C3'],
              ['Boquerones', '4,00 €', '3', '=B4*C4'], ['Pulpo (media ración)', '9,50 €', '2', '=B5*C5'], ['Gildas', '1,50 €', '6', '=B6*C6'], ['<b>Para el grupo</b>', '', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [5, 2, 2, 2] }),
          text('Somos 6:', 860, 200, 320, 60, { fontFamily: CV, fontSize: 48, color: CH_P }),
          text('unos 15 € por cabeza en comida, más la bebida de cada uno.', 860, 265, 320, 120, { fontSize: 24, color: CHALK }),
          chalk('ellipse', 850, 420, 330, 160, CH_Y),
          at(text('Truco: pedir de dos en dos, nunca todo a la vez.', 875, 440, 280, 120, { fontFamily: CV, fontSize: 28, color: CH_Y, textAlign: 'center', vAlign: 'middle' }), 'jump')],
          notes: 'Tabla con estilo de pizarra: cada fila multiplica precio por cantidad y la última suma (=SUMA(ARRIBA)). Precios inventados. Clic: el consejo «salta».' },
        { title: 'Tapa, pincho o ración', layout: 'titleOnly', bg: BOARD, back: board(5), extra: [
          ...cascade([['Tapa', 'Un bocado. A veces, gratis con la bebida.', 150, CH_Y], ['Pincho', 'Sobre pan, con palillo. Se cuentan al pagar.', 220, CH_P], ['Ración', 'Un plato entero para compartir entre varios.', 310, CH_B]].map(([n, d, s, c], i) => {
            const cx = 240 + i * 400;
            return [chalk('ellipse', cx - s / 2 - 20, 380 - s * 0.22 - 10, s + 40, s * 0.44 + 20, c), chalk('ellipse', cx - s / 2, 380 - s * 0.16, s, s * 0.32, c, { strokeWidth: 2 }),
              text(n, cx - 170, 200, 340, 80, { fontFamily: CV, fontSize: 64, color: c, textAlign: 'center' }),
              text(d, cx - 160, 480, 320, 110, { fontSize: 23, color: CHALK, textAlign: 'center' })]; }), 'zoom-in', 'click', { duration: 500 })],
          notes: 'Tres platos a tiza, de menor a mayor, que aparecen uno tras otro con un clic. Cada región tiene su costumbre: en algunas, la tapa va incluida con la caña.' },
        { layout: 'blank', bg: BOARD, back: board(6), extra: [
          pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué no puede faltar? Elige tres', x: 90, y: 70, w: 1100, h: 580,
            options: ['Croquetas', 'Tortilla de patatas', 'Patatas bravas', 'Pulpo', 'Boquerones', 'Pimientos de Padrón'] })],
          notes: 'Votación múltiple desde el móvil: las tres más votadas son las que pedimos en cada bar.' },
        { title: 'La cuenta (de la última vez)', layout: 'titleOnly', bg: BOARD, back: board(7), extra: [
          shape('rect', 90, 170, 760, 500, '#fbf8f0', { rotation: -1.5, shadow: { x: 0, y: 10, blur: 20, color: '#00000066' } }),
          chartBlock({ x: 115, y: 190, w: 710, h: 450, chartType: 'stacked', color: '#c0573e', seriesName: 'Comida (€)', grid: true, rotation: -1.5,
            data: series([['La Bodega', 22], ['Tostadero', 25], ['Taberna', 18], ['La Barra', 31], ['El Último', 12]]),
            series: [{ name: 'Bebida (€)', values: [14, 12, 15, 10, 24], color: '#3f6f8f' }] }),
          text('La bebida pesa más de lo que parece.', 890, 200, 300, 180, { fontFamily: CV, fontSize: 44, color: CH_Y }),
          text('En el último bar ya solo se pedía vermut: la comida bajó y la bebida subió.', 890, 400, 300, 160, { fontSize: 22, color: CHALK })],
          notes: 'Barras apiladas sobre un «tique» de papel ligeramente girado. Cifras inventadas de una ruta anterior, para el grupo de 6.' },
        { layout: 'blank', bg: BOARD, back: board(8), extra: [
          text('La cocina cierra en…', 100, 110, 1080, 120, { fontFamily: CV, fontSize: 96, color: CHALK, textAlign: 'center' }),
          timer(900, 340, 270, 600, { style: 'digital', color: CH_Y, endText: '¡Última ronda!', h: 200 }),
          text('Pide ahora lo que quieras caliente: luego solo queda frío.', 140, 560, 1000, 60, { fontSize: 28, color: CH_B, textAlign: 'center' })],
          notes: 'Cuenta atrás digital de 15 minutos que empieza sola. Útil para avisar al grupo de que la cocina va a cerrar.' },
        { layout: 'blank', bg: BOARD, back: board(9), transition: 'zoom', extra: [
          at(text('¡Otra ronda!', 140, 180, 1000, 220, { fontFamily: CV, fontSize: 180, color: CHALK, textAlign: 'center' }), 'zoom-in', { start: 'afterPrev', sound: 'applause' }),
          at(chalk('custom', 340, 400, 600, 40, CH_Y, { strokeWidth: 6, path: 'M0 60 C20 20 40 80 60 40 S90 30 100 50' }), 'wipe', { dir: 'left', start: 'afterPrev', duration: 1200 }),
          text('Gracias por venir. El próximo sábado: ruta del vermut.', 140, 460, 1000, 60, { fontSize: 30, color: CH_P, textAlign: 'center' }),
          ...[[200, 560], [1010, 560]].map(([x, y]) => chalk('custom', x, y, 70, 100, CHALK, { path: 'M10 0 C0 40 10 70 50 75 C90 70 100 40 90 0 Z M50 75 L50 92 M20 100 L80 100' }))],
          notes: 'Cierre: el título entra con aplausos y después aparece el subrayado de tiza, de izquierda a derecha (efecto Barrido).' },
      ]);
      return finish(deck);
    } },
  // ---------------------------------------------------------------------------------
  // 4 · Homemade ramen: a noren curtain and a red sun, the bowl seen from above that
  // moves into its anatomy with Transform, twelve hours of broth, the weekend's plan.
  life_food_ramen: { name: 'Ramen casero en un fin de semana', cat: 'life',
    summary: 'Cortina noren y bol de formas que se desmonta con Transformar, gráfico del caldo, pasos, ecuación y tabla con fórmulas, emparejar y cuenta atrás',
    make: () => {
      const WASHI = '#f3eee4', SUMI = '#1b1b1b', VERM = '#c8372d', INDIGO = '#22355e', GREY = '#6b6660';
      const H = pairStacks('clean').heading;
      const ids = Array.from({ length: 20 }, () => uid()), tid = uid();
      const noren = (n = 6, y0 = 0, h = 150) => Array.from({ length: n }, (_, i) => shape('rect', Math.round(i * 1280 / n + 4), y0, Math.round(1280 / n - 8), h, INDIGO, { fill2: '#1a2848', gradAngle: 90 }));
      const steam = (x, y) => [0, 1, 2].map(i => withAnims(shape('custom', x + i * 70, y, 50, 140, 'none', { stroke: '#b9b2a6', strokeWidth: 5, path: 'M50 100 C10 80 90 55 50 35 S40 5 55 0' }),
        A('fade-up', { start: i ? 'withPrev' : 'afterPrev', duration: 1600, delay: i * 300 })));
      const deck = build({ name: 'Ramen casero', palette: 'grayscale', fonts: 'clean', title: { size: 48, color: SUMI }, body: { color: SUMI } }, [
        { layout: 'blank', bg: WASHI, transition: 'fade', extra: [
          shape('ellipse', 760, 120, 500, 500, VERM, { opacity: 92 }),
          ...noren(6, 0, 130), ...[1, 2, 3, 4, 5].map(i => shape('rect', Math.round(i * 1280 / 6 - 4), 0, 8, 20, '#7a6a55')),
          shape('rect', 0, 0, 1280, 14, '#7a6a55'),
          shape('ellipse', Math.round(2.5 * 1280 / 6) - 34, 32, 68, 68, 'none', { stroke: WASHI, strokeWidth: 6 }),
          ...ramenBowl(920, 470, 210, ids),
          ...steam(860, 140),
          kicker('COCINA JAPONESA EN CASA', 92, 230, 520, VERM),
          keep(text('Ramen', 84, 265, 600, 190, { fontFamily: H, fontSize: 170, fontWeight: 800, color: SUMI, letterSpacing: -4 }), tid),
          shape('rect', 92, 470, 70, 6, VERM),
          text('Un caldo de doce horas, un fin de semana y cuatro amigos con hambre.', 92, 495, 520, 100, { fontSize: 28, color: GREY })],
          notes: 'Portada: la cortina «noren» de la entrada de un local, un sol rojo y el bol visto desde arriba, todo con formas. El vapor sube solo al llegar.' },
        { layout: 'blank', bg: WASHI, autoAnimate: true, extra: [
          keep(text('Anatomía de un bol', 650, 60, 560, 80, { fontFamily: H, fontSize: 52, fontWeight: 800, color: SUMI }), tid),
          ...ramenBowl(330, 390, 260, ids),
          ...[['1', 'Tare', 'El concentrado de sabor: soja, miso o sal.', 0.0, -0.05], ['2', 'Caldo', 'Huesos de cerdo y pollo: doce horas al fuego.', -0.7, 0.45], ['3', 'Aceite aromático', 'Ajo tostado, cebolleta o chile.', 0.0, 0.72],
            ['4', 'Fideos', 'Trigo y agua alcalina: firmes y elásticos.', -0.1, 0.2], ['5', 'Encima', 'Chashu, huevo marinado, nori, menma y cebolleta.', -0.42, -0.36]].flatMap(([n, t, d, bx, by], i) =>
            together([text(n, Math.round(330 + bx * 260 - 22), Math.round(390 + by * 260 - 22), 44, 44, { fontSize: 24, fontWeight: 800, color: '#ffffff', bg: VERM, radius: 22, textAlign: 'center', vAlign: 'middle' }),
              text(`<span style="color:${VERM};font-weight:800">${n}</span>&nbsp; <b>${t}</b><br><span style="color:${GREY}">${d}</span>`, 660, 170 + i * 98, 540, 90, { fontSize: 22, color: SUMI })], 'fade-up', 'click'))],
          notes: 'Transformar: el bol y el título viajan desde la portada (mismos objetos en las dos diapositivas). Cada clic numera una capa en el bol y la explica a la derecha.' },
        { layout: 'blank', bg: SUMI, transition: 'fade', extra: [
          text('Doce horas de caldo', 90, 60, 800, 80, { fontFamily: H, fontSize: 52, fontWeight: 800, color: WASHI }),
          shape('rounded', 90, 170, 740, 470, WASHI, { radius: 12 }),
          chartBlock({ x: 110, y: 185, w: 680, h: 440, chartType: 'line', color: VERM, seriesName: 'Cuerpo (gelatina)', grid: true, yMin: 0, yMax: 100, yTitle: 'Intensidad (0–100)',
            data: series([['0 h', 0], ['2 h', 15], ['4 h', 35], ['6 h', 55], ['8 h', 72], ['10 h', 85], ['12 h', 92]]),
            series: [{ name: 'Sabor', values: [5, 30, 52, 68, 78, 84, 86], color: INDIGO }] }),
          at(text('12 h', 860, 170, 340, 170, { fontFamily: H, fontSize: 150, fontWeight: 800, color: VERM, lineHeight: 1 }), 'zoom-in', { start: 'afterPrev' }),
          text('A fuego que apenas tiembla. El sabor se estanca hacia la hora diez; el cuerpo sigue subiendo.', 860, 350, 340, 170, { fontSize: 23, color: '#d8d2c6' }),
          text('Si hierve fuerte se enturbia: salvo en el tonkotsu, que se busca blanco.', 860, 530, 340, 100, { fontSize: 20, color: '#9a948a', fontStyle: 'italic' })],
          notes: 'Gráfico de dos líneas: cómo crecen el cuerpo y el sabor del caldo con las horas. Curvas ilustrativas, no medidas de laboratorio.' },
        { title: 'El plan del fin de semana', layout: 'titleOnly', bg: WASHI, back: noren(6, 0, 36), extra: [
          dg('steps', 'Sábado, 9:00\n  Huesos a blanquear y caldo al fuego\nSábado, 18:00\n  Tare y huevos a marinar\nDomingo, 10:00\n  Chashu al horno tres horas\nDomingo, 14:00\n  Fideos, montaje y a la mesa', 90, 180, 1100, 420, { oneByOne: true, colors: 'accent' }),
          text('El caldo se puede congelar: haz el doble y la próxima vez solo es domingo.', 90, 620, 1100, 40, { fontSize: 22, color: GREY, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Diagrama de escalones uno a uno: cada clic añade un momento del fin de semana.' },
        { title: 'De un bol a cuatro', layout: 'titleOnly', bg: WASHI, back: noren(6, 0, 36), extra: [
          shape('rounded', 90, 180, 440, 440, '#ffffff', { radius: 18, stroke: '#e2dacb', strokeWidth: 2 }),
          kicker('LA PROPORCIÓN', 120, 205, 380, VERM, 18),
          text('tare : caldo = 1 : 10', 110, 260, 400, 80, { fontFamily: FF.lora, fontSize: 38, color: SUMI, textAlign: 'center', vAlign: 'middle' }),
          at(mathBlock({ x: 110, y: 370, w: 400, h: 100, fontSize: 32, color: VERM, latex: '30\\,\\text{ml} \\times 10 = 300\\,\\text{ml}' }), 'fade-up'),
          text('Primero la tare en el fondo del bol; encima, el caldo hirviendo.', 120, 500, 380, 100, { fontSize: 21, color: GREY }),
          tableBlock({ x: 570, y: 180, w: 620, h: 440, fontSize: 23, header: true, headBg: SUMI, headFg: WASHI, stroke: '#d6cfc2', banded: true, band: VERM, bandAlpha: 0.08, color: SUMI,
            rows: [['Por bol', 'Cantidad', 'Boles', 'Total'], ['Tare', '30 ml', '4', '=B2*C2'], ['Caldo', '300 ml', '4', '=B3*C3'], ['Fideos frescos', '130 g', '4', '=B4*C4'],
              ['Chashu', '3 lonchas', '4', '12 lonchas'], ['Huevo marinado', '½', '4', '2 huevos'], ['Aceite aromático', '1 cdta.', '4', '4 cdtas.']], colW: [4, 3, 2, 3] })],
          notes: 'La ecuación aparece con un clic. En la tabla, las tres primeras filas multiplican la cantidad por el número de boles (=B2*C2); las demás se cuentan a mano.' },
        { layout: 'blank', bg: WASHI, extra: [
          ...noren(6, 0, 36),
          pollBlock({ kind: 'match', fontSize: 28, question: 'Cada ingrediente con lo que es', x: 90, y: 70, w: 1100, h: 590,
            options: ['Chashu = Panceta enrollada y braseada', 'Ajitama = Huevo marinado en soja', 'Menma = Brotes de bambú fermentados', 'Nori = Alga seca en lámina', 'Negi = Cebolleta en aros'] })],
          notes: 'Actividad de emparejar desde el móvil: cada nombre japonés con su ingrediente. Al cerrar se ve cuántos acertaron cada pareja.' },
        { layout: 'blank', bg: VERM, transition: 'wipe', extra: [
          shape('ellipse', -200, 300, 700, 700, '#b02e25'),
          text('Fideos frescos', 90, 120, 620, 100, { fontFamily: H, fontSize: 72, fontWeight: 800, color: '#ffffff' }),
          text('Noventa segundos en agua hirviendo, sin sal. Escurrir con energía y al bol, que el caldo espera.', 90, 240, 560, 160, { fontSize: 28, color: '#ffe9e4' }),
          text('Sorber hace ruido, y está bien visto.', 90, 440, 560, 50, { fontSize: 26, color: '#ffffff', fontStyle: 'italic' }),
          timer(90, 780, 160, 400, { color: '#ffffff', endText: '¡Escurre!' })],
          notes: 'Cuenta atrás de 90 segundos sobre fondo rojo: empieza sola y suena al acabar. Pon los fideos al agua cuando aparezca la diapositiva.' },
        { layout: 'section', bg: WASHI, title: 'Itadakimasu', subtitle: '«Lo recibo con gratitud»: así se empieza a comer en Japón', transition: 'zoom',
          back: [shape('ellipse', 530, 50, 220, 220, VERM, { opacity: 90 }), ...noren(6, 600, 120)],
          notes: 'Cierre: la expresión que se dice antes de comer. La cortina, ahora abajo, cierra la escena.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 96, fontWeight: 800, color: SUMI, y: 270, h: 140 }); if (b.ph === 'subtitle') Object.assign(b, { color: GREY, y: 420 }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 5 · Pulses for the whole week: a seed-packet poster of flat circles, a giant number,
  // protein compared, legumes and cereals in a Venn, soaking times, a week on the phone.
  life_food_legumes: { name: 'Legumbres: cocina vegetal', cat: 'life',
    summary: 'Cartel de círculos que aparecen en cascada, cifra gigante, barras, Venn, tabla con promedios, menú en un móvil, concurso y cuenta atrás',
    make: () => {
      const CREAM = '#f3e9d2', NAVY = '#1f2a44', TERRA = '#c8553d', MUST = '#e3a93b', OLIVE = '#5f7a35', SOFT = '#5a5446';
      const H = pairStacks('bold').heading;
      const kinds = Object.keys(PULSES);
      const grid = (x0, y0, n, m, d, gap, seed, start = 'afterPrev') => { const R = rng(seed), out = [];
        for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const k = kinds[Math.floor(R() * kinds.length)], x = x0 + i * (d + gap), y = y0 + j * (d + gap), first = !out.length;
          pulse(x, y, d, PULSES[k][0]).forEach((b, q) => out.push(withAnims(b, A('zoom-in', { start: first && !q ? start : 'withPrev', delay: (i + j) * 90, duration: 400 })))); }
        return out; };
      // The phone's screen: a picture with no words (360 × 720, shown at 0,7667 inside the frame); its words are text boxes on top, so they get translated.
      const days = [['LUN', 'Lentejas con verduras', TERRA], ['MAR', 'Hummus y crudités', '#c9a66b'], ['MIÉ', 'Chili de alubias negras', '#2c2522'], ['JUE', 'Ensalada de garbanzos', MUST], ['VIE', 'Curry de guisantes', OLIVE]];
      const week = svgURL(360, 720, `<rect width="360" height="720" fill="${CREAM}"/><rect width="360" height="110" fill="${NAVY}"/>`
        + days.map(([, , c], i) => `<rect x="18" y="${130 + i * 112}" width="324" height="96" rx="14" fill="#ffffff"/><circle cx="62" cy="${178 + i * 112}" r="28" fill="${c}"/>`).join(''));
      const PX = 834, PY = 84, PK = 0.7667;   // (where the screen's 0,0 falls on the slide, and its scale: a 304 × 580 phone has a 14 px frame)
      const weekTexts = [text('Esta semana', PX + 18 * PK, PY, 240, 110 * PK, { fontFamily: H, fontSize: 24, color: CREAM, vAlign: 'middle', pad: [0, 0, 0, 0] }),
        ...days.flatMap(([d, t], i) => { const cy = PY + (178 + i * 112) * PK;
          return [text(d, PX + 34 * PK, cy - 15, 56 * PK, 30, { fontSize: 12, fontWeight: 700, color: '#ffffff', textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }),
            text(t, PX + 100 * PK, cy - 30, 230 * PK, 60, { fontSize: 15, color: NAVY, vAlign: 'middle', pad: [0, 0, 0, 0], lineHeight: 1.15 })]; })];
      const deck = build({ name: 'Legumbres para toda la semana', palette: 'forest', fonts: 'bold', title: { size: 64, color: NAVY, bold: false }, body: { color: NAVY } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          shape('rect', -20, -20, 580, 760, NAVY),
          kicker('TALLER · COCINA VEGETAL', 70, 150, 440, MUST, 20),
          text('LEGUM-<br>BRES', 64, 180, 470, 330, { fontFamily: H, fontSize: 168, color: CREAM, lineHeight: 0.95 }),
          shape('rect', 70, 520, 120, 8, TERRA),
          text('Baratas, sostenibles y llenas de proteína: cinco comidas con una olla.', 70, 550, 440, 100, { fontSize: 26, color: '#cfd5e2' }),
          ...grid(620, 70, 4, 4, 128, 22, 8)],
          notes: 'Portada estilo cartel de sobre de semillas: dieciséis legumbres hechas con círculos que aparecen solos en diagonal, uno detrás de otro.' },
        { layout: 'blank', bg: CREAM, extra: [
          at(text('24<span style="font-size:110px">&nbsp;GRAMOS</span>', 80, 110, 540, 280, { fontFamily: H, fontSize: 280, color: TERRA, lineHeight: 1 }), 'zoom-in', { start: 'afterPrev', sound: 'drumroll', duration: 900 }),
          text('de proteína por cada 100 g de lentejas en seco. Más que muchos cortes de carne, por una fracción del precio.', 90, 400, 470, 160, { fontSize: 27, color: NAVY }),
          chartBlock({ x: 620, y: 110, w: 580, h: 520, chartType: 'hbar', color: OLIVE, dataLabels: true, xTitle: 'g de proteína por 100 g',
            data: series([['Soja seca', 36], ['Ternera', 26], ['Lentejas', 24], ['Alubias', 21], ['Garbanzos', 19], ['Huevo', 13], ['Arroz', 7]]) })],
          notes: 'Cifra gigante con redoble al llegar y barras horizontales con la proteína por 100 g (alimentos crudos, valores redondeados y orientativos).' },
        { title: 'Legumbre + cereal = proteína completa', layout: 'titleOnly', bg: CREAM, extra: [
          dg('venn', 'Legumbres\nCereales', 90, 180, 560, 440, { colors: 'colorful', fontScale: 1.4 }),
          text('A las legumbres les falta metionina; a los cereales, lisina. Juntos (no hace falta en el mismo plato) se completan.', 700, 180, 490, 140, { fontSize: 24, color: SOFT }),
          ...chain([['Lentejas con arroz', TERRA], ['Hummus con pan de pita', MUST], ['Chili con tortillas de maíz', NAVY]].map(([t, c], i) =>
            card(t, 700, 345 + i * 95, 490, 78, c, { fontSize: 26, color: c === MUST ? NAVY : '#ffffff', radius: 39, pad: [10, 30, 10, 30], vAlign: 'middle' })), 'fade-left', 'click')],
          notes: 'Diagrama de Venn: las dos familias se complementan. Clic: tres platos clásicos que lo hacen sin pensarlo.' },
        { title: 'Remojo y cocción', layout: 'titleOnly', bg: CREAM, extra: [
          tableBlock({ x: 90, y: 180, w: 740, h: 400, fontSize: 24, header: true, headBg: NAVY, headFg: CREAM, stroke: '#d9cdb0', banded: true, band: MUST, bandAlpha: 0.15, color: NAVY,
            rows: [['Legumbre', 'Remojo (h)', 'Olla (min)', 'Olla exprés (min)'], ['Lentejas', '0', '35', '10'], ['Garbanzos', '12', '120', '25'], ['Alubias', '10', '90', '20'], ['Guisantes secos', '6', '60', '15'],
              ['<b>Media</b>', '=PROMEDIO(ARRIBA)', '=PROMEDIO(ARRIBA)', '=PROMEDIO(ARRIBA)']], colW: [4, 3, 3, 3] }),
          ...pulse(900, 190, 150, PULSES.garbanzo[0]), ...pulse(1040, 260, 110, PULSES.lenteja[0]), ...pulse(930, 360, 90, PULSES.alubia[0]),
          text('Sal al final: si no, la piel se endurece. Y una hoja de laurel siempre.', 870, 480, 320, 110, { fontSize: 23, color: SOFT })],
          notes: 'La última fila calcula la media de cada columna con =PROMEDIO(ARRIBA). Tiempos orientativos: dependen de la legumbre y de lo fresca que sea.' },
        { layout: 'blank', bg: NAVY, extra: [
          text('UNA OLLA EL DOMINGO,<br>CINCO COMIDAS', 90, 120, 620, 180, { fontFamily: H, fontSize: 76, color: CREAM, lineHeight: 1 }),
          text(ul('Cuece un kilo de garbanzos y otro de alubias', 'Guárdalos en tarros con su caldo: aguantan 4 días', 'Cada día, una salsa distinta'), 90, 330, 600, 260, { fontSize: 26, color: '#dfe3ec' }),
          { ...base(820, 70, 304, 580), type: 'image', src: week, alt: 'Menú semanal de legumbres en el móvil', fit: 'cover', device: 'phone' }, ...weekTexts],
          notes: 'El menú es una pantalla inventada (un dibujo SVG con cuadros de texto encima) dentro de un marco de móvil. Ideal para enseñar la lista de la compra o una app de planificación.' },
        { title: 'Lo que cuesta una ración', layout: 'titleOnly', bg: CREAM, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'bar', color: TERRA, dataLabels: true, yTitle: '€ por ración de 20 g de proteína',
            data: series([['Lentejas', 0.35], ['Garbanzos', 0.4], ['Alubias', 0.45], ['Tofu', 0.9], ['Pollo', 1.4], ['Ternera', 2.6]]) }),
          at(text('×7', 900, 190, 290, 200, { fontFamily: H, fontSize: 200, color: TERRA, lineHeight: 1 }), 'zoom-in'),
          text('La misma proteína sale hasta siete veces más barata con lentejas que con ternera.', 900, 400, 290, 160, { fontSize: 24, color: NAVY })],
          notes: 'Gráfico de columnas con etiquetas de datos. Precios inventados pero verosímiles. Clic: la comparación final.' },
        { layout: 'blank', bg: CREAM, extra: [
          ...pulse(1090, 520, 160, PULSES.garbanzo[0]), ...pulse(1010, 600, 90, PULSES.lenteja[0]),
          pollBlock({ kind: 'quiz', fontSize: 36, question: '¿Cuál de estos NO es una legumbre?', options: ['Quinoa', 'Cacahuete', 'Soja', 'Altramuz'], correct: [0], time: 20, x: 90, y: 70, w: 960, h: 570 })],
          notes: 'Concurso: la trampa es el cacahuete, que sí es una legumbre. La quinoa es una semilla de otra familia.' },
        { layout: 'blank', bg: OLIVE, extra: [
          text('A remojo', 90, 80, 1100, 130, { fontFamily: H, fontSize: 120, color: CREAM, textAlign: 'center' }),
          text('Mientras corre el reloj, pon los garbanzos en agua fría con una pizca de bicarbonato. Mañana nos los comemos.', 190, 225, 900, 110, { fontSize: 28, color: '#eef2e0', textAlign: 'center' }),
          timer(120, 140, 380, 1000, { style: 'bar', h: 100, color: CREAM, endText: '¡Listos!' }),
          ...Array.from({ length: 9 }, (_, i) => pulse(170 + i * 115, 540 + (i % 2) * 24, 72, PULSES.garbanzo[0])).flat()],
          notes: 'Pausa práctica de dos minutos con una cuenta atrás en barra: cada participante prepara su tarro de garbanzos en remojo para llevárselo.' },
        { layout: 'section', bg: NAVY, title: '¡A LA OLLA!', subtitle: 'Recetas y lista de la compra en el grupo del taller', transition: 'zoom',
          back: [...grid(40, 40, 8, 1, 110, 46, 21, 'withPrev').map(b => ({ ...b, animation: null, anims: undefined })), ...grid(40, 570, 8, 1, 110, 46, 33).map(b => ({ ...b, animation: null, anims: undefined }))],
          notes: 'Cierre: dos filas de legumbres enmarcan el título.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 150, color: CREAM }); if (b.ph === 'subtitle') Object.assign(b, { color: MUST }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 6 · Paella valenciana: the pan from above over a ring of flames, its ten ingredients,
  // amounts that multiply, a timeline, the socarrat in a cross-section and a timer.
  life_food_paella: { name: 'Paella valenciana', cat: 'life',
    summary: 'Paellera de formas sobre llamas, ingredientes en cadena, cantidades con fórmulas, cronología, corte del socarrat con Text Art, cuenta atrás y votación',
    make: () => {
      const SAFF = '#f2b134', DEEP = '#21150d', CREAMP = '#fbf3e4', PAPRIKA = '#c4421a', GREEN = '#4f7d2a', INK = '#2b1d14', SOFT = '#6f5a48';
      const H = pairStacks('modern').heading, DS = FF.dancing;
      const ing = ['Arroz bomba', 'Pollo', 'Conejo', 'Judía verde plana', 'Garrofó', 'Tomate rallado', 'Aceite de oliva', 'Pimentón dulce', 'Azafrán', 'Romero'];
      const deck = build({ name: 'Paella valenciana', palette: 'office', fonts: 'modern', title: { size: 46, color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          glow(560, 20, 700, '#a8380f', DEEP, 70),
          ...flames(935, 370, 250, 18),
          ...paellaPan(935, 370, 225),
          kicker('COCINA REGIONAL · EN EL PUEBLO', 80, 170, 520, SAFF, 18),
          text('Paella', 70, 200, 560, 170, { fontFamily: H, fontSize: 150, fontWeight: 900, color: SAFF, lineHeight: 1 }),
          text('valenciana', 90, 350, 520, 110, { fontFamily: DS, fontSize: 92, color: CREAMP }),
          text('Arroz, fuego de leña y una sola regla: una vez echado el arroz, no se remueve.', 84, 490, 460, 110, { fontSize: 26, color: '#e8d6c0' })],
          notes: 'Portada: la paellera vista desde arriba (formas: asas, borde, arroz con degradado de azafrán, granos e ingredientes) sobre un anillo de llamas.' },
        { title: 'Diez ingredientes, ni uno más', layout: 'titleOnly', bg: CREAMP, extra: [
          ...chain(ing.map((t, i) => text(`<span style="font-family:${H};font-weight:800;color:${PAPRIKA}">${String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;${t}`,
            100 + Math.floor(i / 5) * 300, 190 + (i % 5) * 76, 290, 60, { fontSize: 25, color: INK, vAlign: 'middle' })), 'fade-right', 'click', { duration: 300 }),
          ...paellaPan(950, 410, 230, 9, 5),
          text('Y sal y agua, claro. El limón se sirve aparte… si alguien lo pide.', 100, 590, 600, 60, { fontSize: 21, color: SOFT, fontStyle: 'italic' })],
          notes: 'Clic: los diez ingredientes de la paella valenciana aparecen solos uno tras otro. A la derecha, la paellera ya terminada.' },
        { title: 'Para seis personas', layout: 'titleOnly', bg: CREAMP, extra: [
          tableBlock({ x: 100, y: 180, w: 680, h: 460, fontSize: 23, header: true, headBg: PAPRIKA, headFg: '#ffffff', stroke: '#e6d6bd', banded: true, band: SAFF, bandAlpha: 0.15, color: INK,
            rows: [['Ingrediente', 'Por persona', 'Personas', 'Total'], ['Arroz bomba', '100 g', '6', '=B2*C2'], ['Pollo', '150 g', '6', '=B3*C3'], ['Conejo', '100 g', '6', '=B4*C4'],
              ['Judía verde plana', '50 g', '6', '=B5*C5'], ['Garrofó', '30 g', '6', '=B6*C6'], ['Tomate rallado', '25 g', '6', '=B7*C7'], ['Agua', '350 ml', '6', '=B8*C8']], colW: [5, 3, 3, 3] }),
          shape('ellipse', 840, 190, 330, 330, SAFF, { fill2: '#e08a1c', gradType: 'radial' }),
          text(`<div style="font-family:${H};font-size:80px;font-weight:900;line-height:1">1 : 3,5</div><div style="margin-top:6px">arroz y agua, en peso</div>`, 860, 260, 290, 190, { fontSize: 24, color: INK, textAlign: 'center' }),
          text('Paellera de 55 cm para seis. El arroz, en capa fina: dos dedos como mucho.', 830, 550, 360, 90, { fontSize: 21, color: SOFT, textAlign: 'center' })],
          notes: 'La columna Total multiplica por el número de personas (=B2*C2): cambia el 6 y se recalcula. Cantidades orientativas.' },
        { title: 'El orden lo es todo', layout: 'titleOnly', bg: CREAMP, extra: [
          dg('timeline', 'Min 0\n  Sofreír la carne con sal\nMin 20\n  Verdura, tomate y pimentón\nMin 25\n  Agua y azafrán: caldo\nMin 50\n  Arroz en cruz, y no se toca\nMin 68\n  Socarrat y reposo', 90, 190, 1100, 330, { oneByOne: true, colors: 'accent', fontScale: 1.1 }),
          shape('rounded', 90, 560, 1100, 80, SAFF, { radius: 40, opacity: 25 }),
          text('Fuego fuerte al principio, medio con el arroz y suave al final.', 90, 560, 1100, 80, { fontSize: 25, color: INK, textAlign: 'center', vAlign: 'middle' })],
          notes: 'Cronología uno a uno: cada clic añade un momento. Los minutos son orientativos y dependen del fuego.' },
        { layout: 'blank', bg: DEEP, extra: [
          glow(-100, 300, 700, '#7a2a0c', DEEP, 60),
          at(text('SOCARRAT', 80, 90, 1120, 170, { fontFamily: H, fontSize: 150, fontWeight: 900, wordart: 'retro', textAlign: 'center' }), 'zoom-in', { start: 'afterPrev', duration: 800 }),
          text('La capa tostada del fondo. Se oye antes de verse: un crepitar suave en los dos últimos minutos.', 190, 270, 900, 90, { fontSize: 26, color: '#e8d6c0', textAlign: 'center' }),
          shape('rect', 215, 420, 850, 80, '#f2c14e', { fill2: '#e3a43a', gradAngle: 90 }),
          shape('rect', 215, 500, 850, 60, '#d9922f'),
          withAnims(shape('rect', 215, 560, 850, 40, '#7a3a12'), A('color-pulse', { duration: 1200, sound: 'click' })),
          shape('custom', 190, 380, 900, 250, '#2d2d2d', { path: 'M0 0 L4 0 L8 88 L92 88 L96 0 L100 0 L98 100 L2 100 Z' }),
          ...[['Arriba: grano suelto y jugoso', 420, 80, INK], ['En medio: grano en su punto', 500, 60, INK], ['Fondo: el socarrat', 560, 40, SAFF]].map(([t, y, h, c]) =>
            text(t, 290, y, 700, h, { fontSize: 22, color: c, fontWeight: 700, vAlign: 'middle' }))],
          notes: 'Text Art de estilo retro para la palabra clave y un corte de la paellera hecho con formas. Clic: la capa del socarrat late con un sonido.' },
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          glow(560, 100, 640, '#7a2a0c', DEEP, 55),
          ...flames(880, 380, 240, 16, 4), ...paellaPan(880, 380, 215, 0, 11),
          shape('ellipse', 735, 235, 290, 290, CREAMP, { opacity: 92 }),
          timer(1080, 750, 250, 260, { color: PAPRIKA, endText: '¡Reposo!' }),
          text('El arroz no se toca', 80, 150, 520, 200, { fontFamily: H, fontSize: 80, fontWeight: 900, color: SAFF, lineHeight: 1.05 }),
          text('Dieciocho minutos: diez a fuego vivo y ocho a fuego bajando. Ni cuchara ni prisas.', 84, 380, 470, 140, { fontSize: 28, color: '#e8d6c0' })],
          notes: 'La cuenta atrás de 18 minutos va dentro de la paellera, sobre el fuego: empieza sola y suena al terminar. Úsala con la paella real al fuego.' },
        { layout: 'blank', bg: CREAMP, extra: [
          shape('rect', 0, 0, 1280, 40, PAPRIKA), shape('rect', 0, 40, 1280, 10, SAFF),
          pollBlock({ kind: 'choice', display: 'bar', fontSize: 32, question: 'El eterno debate: ¿lleva chorizo?', x: 90, y: 90, w: 1100, h: 570,
            options: ['Nunca jamás', 'Solo si nadie mira', 'Sí, y cebolla también', 'Es arroz con cosas'] })],
          notes: 'Votación en broma para cerrar el debate: el grupo responde desde el móvil y los resultados salen en barras.' },
        { layout: 'blank', bg: DEEP, transition: 'zoom', extra: [
          ...flames(640, 760, 260, 14, 9), ...paellaPan(640, 760, 240, 9, 7),
          text('Bon profit!', 140, 120, 1000, 170, { fontFamily: DS, fontSize: 140, color: SAFF, textAlign: 'center' }),
          text('«Que aproveche», en valenciano', 140, 300, 1000, 50, { fontSize: 28, color: '#e8d6c0', textAlign: 'center' })],
          notes: 'Cierre: la paellera asoma desde abajo sobre el fuego. Se come directamente de la paellera, cada uno en su porción.' },
      ]);
      return finish(deck);
    } },
  // ---------------------------------------------------------------------------------
  // 7 · Pour-over coffee: a lab sheet on graph paper, the dripper as a technical drawing,
  // the ratio as an equation, the recipe as code step by step, the pours on a chart.
  life_food_coffee: { name: 'Café de filtro: el método V60', cat: 'life',
    summary: 'Ficha técnica en papel milimetrado, plano acotado en SVG, ecuación de la proporción, receta en código por pasos, gráfico, tabla y cuenta atrás',
    make: () => {
      const PAPER = '#f5f1e8', ESP = '#3b2418', CREMA = '#c8915a', PEN = '#2457a6', RED = '#c0392b', MUTE = '#6f6457';
      const H = pairStacks('tech').heading, MONO = FF.mono;
      const sheet = () => [img(graphPaper(), 0, 0, 1280, 720, { alt: '', decorative: true, fit: 'cover' })];
      const label = (t, x, y, w = 400) => text(t, x, y, w, 30, { fontFamily: MONO, fontSize: 16, color: PEN, letterSpacing: 2 });
      const grind = [['Turco', 8, '0,1 mm'], ['Espresso', 17, '0,3 mm'], ['V60', 28, '0,6 mm'], ['Filtro de cesta', 36, '0,8 mm'], ['Chemex', 45, '1,0 mm'], ['Prensa francesa', 58, '1,2 mm']];
      const deck = build({ name: 'Café de filtro V60', palette: 'paper', fonts: 'tech', title: { size: 46, color: ESP }, body: { color: ESP } }, [
        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [
          label('FICHA DE EXTRACCIÓN Nº 07 · TALLER DE BARISMO', 90, 180, 600),
          text('V60', 80, 210, 560, 260, { fontFamily: H, fontSize: 250, fontWeight: 700, color: ESP, lineHeight: 1, letterSpacing: -8 }),
          text('Café de filtro, paso a paso y con números', 90, 480, 580, 50, { fontSize: 27, color: ESP }),
          shape('rect', 90, 545, 540, 2, ESP),
          text('DOSIS 15 g · AGUA 240 g · 93 °C · 3:00', 90, 560, 560, 34, { fontFamily: MONO, fontSize: 19, color: MUTE }),
          at(img(dripperSVG(), 700, 110, 450, 504, { alt: 'Plano acotado del gotero cónico sobre la jarra' }), 'fade-in', { start: 'afterPrev', duration: 1500 }),
          at(text('APROBADO', 1010, 560, 200, 54, { fontFamily: MONO, fontSize: 24, fontWeight: 700, color: RED, textAlign: 'center', vAlign: 'middle', rotation: -10, letterSpacing: 4, borderColor: RED }), 'zoom-in', { start: 'afterPrev', sound: 'pop' })],
          notes: 'Portada como una ficha de laboratorio: papel milimetrado (patrón SVG), el gotero dibujado como un plano con cotas en azul y un sello que cae con un «pop».' },
        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          label('01 · LA PROPORCIÓN', 90, 70),
          text('Todo empieza con una división', 90, 100, 1100, 70, { fontFamily: H, fontSize: 50, fontWeight: 700, color: ESP }),
          text('café : agua = 1 : 16', 90, 205, 1100, 100, { fontFamily: FF.lora, fontSize: 56, color: ESP, textAlign: 'center', vAlign: 'middle' }),
          at(mathBlock({ x: 90, y: 320, w: 1100, h: 90, fontSize: 42, color: PEN, latex: '15\\,\\text{g} \\times 16 = 240\\,\\text{g}' }), 'fade-up'),
          ...chain([['15 g', 'de café, molido al momento'], ['240 g', 'de agua: se pesa, no se mide'], ['93 °C', 'medio minuto tras hervir']].map(([n, l], i) =>
            text(`<div style="font-family:${H};font-size:64px;font-weight:700;color:${i === 1 ? PEN : ESP};line-height:1">${n}</div><div style="border-top:2px solid ${PEN};margin-top:10px;padding-top:8px">${l}</div>`,
              90 + i * 380, 450, 330, 170, { fontSize: 22, color: MUTE })), 'fade-up', 'click')],
          notes: 'La proporción en grande; clic: el cálculo con la dosis de una taza. Otro clic: las tres cifras, una tras otra, con su cota debajo.' },
        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          label('02 · LA RECETA, COMO SI FUERA CÓDIGO', 90, 70, 700),
          text('receta.yaml', 90, 100, 1100, 70, { fontFamily: H, fontSize: 50, fontWeight: 700, color: ESP }),
          codeBlock({ x: 90, y: 190, w: 1100, h: 410, fontSize: 25, lang: 'yaml', lineSteps: '2-3|5|6-7|8-9',
            code: '# V60 para una taza\ncafe: 15 g          # molienda media-fina\nagua: 240 g         # a 93 °C\nvertidos:\n  - { t: "0:00", hasta: 45 g, nota: "preinfusión, 45 s" }\n  - { t: "0:45", hasta: 150 g }\n  - { t: "1:15", hasta: 240 g }\nbajada: "termina hacia 3:00"\nremover: "un giro suave al final"' }),
          text('Cada clic resalta una parte: la dosis, la preinfusión, los vertidos y el final.', 90, 620, 1100, 40, { fontSize: 21, color: MUTE, fontStyle: 'italic' })],
          notes: 'Bloque de código con pasos de resaltado (YAML): cada clic ilumina unas líneas. Una forma divertida de enseñar una receta exacta.' },
        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          label('03 · LOS VERTIDOS', 90, 70),
          text('Agua sobre el café, segundo a segundo', 90, 100, 1100, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: ESP }),
          shape('rect', 90, 190, 760, 450, '#ffffff', { opacity: 85, stroke: '#d3cab6', strokeWidth: 2 }),
          chartBlock({ x: 100, y: 200, w: 740, h: 430, chartType: 'area', color: CREMA, seriesName: 'Agua vertida (g)', grid: true, yMax: 250, yTitle: 'Gramos en la báscula',
            data: series([['0:00', 0], ['0:10', 45], ['0:45', 45], ['1:00', 150], ['1:15', 150], ['1:30', 240], ['2:15', 240], ['3:00', 240]]) }),
          ...chain([['0:00', 'Preinfusión: el café suelta gas y se hincha.'], ['0:45', 'Primer vertido en espiral, sin tocar el papel.'], ['1:15', 'Segundo vertido hasta 240 g.'], ['3:00', 'La cama queda plana: listo.']].map(([t, d], i) =>
            text(`<span style="font-family:${MONO};color:${PEN};font-weight:700">${t}</span><br>${d}`, 890, 200 + i * 108, 300, 96, { fontSize: 21, color: ESP })), 'fade-left', 'click')],
          notes: 'Gráfico de área: lo que marca la báscula durante la extracción. Los escalones son los vertidos y las mesetas, las esperas. Clic: cada momento explicado.' },
        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          label('04 · LA MOLIENDA', 90, 70),
          text('Más fino, más lento; más grueso, más rápido', 90, 100, 1100, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: ESP }),
          shape('rect', 90, 420, 1100, 6, ESP),
          ...grind.flatMap(([n, d, mm], i) => { const cx = 150 + i * 196;
            return [shape('rect', cx - 1, 405, 3, 36, ESP), ...Array.from({ length: 3 }, (_, k) => shape('ellipse', Math.round(cx - d / 2 + (k - 1) * (d + 4)), Math.round(390 - d - k % 2 * 10), d, d, '#6b3b22', { opacity: 90 })),
              text(n, cx - 95, 448, 190, 34, { fontSize: 21, color: n === 'V60' ? PEN : ESP, fontWeight: n === 'V60' ? 700 : 400, textAlign: 'center' }),
              text(mm, cx - 95, 480, 190, 30, { fontFamily: MONO, fontSize: 16, color: MUTE, textAlign: 'center' })]; }),
          withAnims(shape('triangle', 132, 525, 36, 30, PEN), path([[392, 0]], { duration: 1600, sound: 'click' })),
          text('Si la bajada termina antes de 2:30, muele más fino. Si pasa de 3:30, más grueso.', 90, 590, 1100, 50, { fontSize: 24, color: MUTE, textAlign: 'center' })],
          notes: 'Una regla de molienda dibujada con formas: las partículas crecen de izquierda a derecha. Clic: la marca azul se desliza hasta la posición del V60.' },
        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          label('05 · DIAGNÓSTICO', 90, 70),
          text('Lo que dice la taza', 90, 100, 1100, 70, { fontFamily: H, fontSize: 50, fontWeight: 700, color: ESP }),
          tableBlock({ x: 90, y: 190, w: 1100, h: 400, fontSize: 24, header: true, headBg: PEN, headFg: '#ffffff', stroke: '#c9c0ad', banded: true, band: PEN, bandAlpha: 0.07, color: ESP,
            rows: [['Si sabe…', 'Lo que pasa', 'Qué cambiar'], ['Ácido y punzante', 'Poca extracción', 'Molienda más fina o agua más caliente'], ['Amargo y seco', 'Demasiada extracción', 'Molienda más gruesa'],
              ['Aguado', 'Poco café para tanta agua', 'Proporción 1 : 15'], ['Plano, sin aroma', 'Café tostado hace meses', 'Tueste de menos de un mes']], colW: [3, 4, 5] }),
          text('Cambia solo una cosa cada vez: si no, no sabrás qué ha funcionado.', 90, 610, 1100, 40, { fontSize: 22, color: RED, fontStyle: 'italic' })],
          notes: 'Tabla de diagnóstico para afinar la receta. Regla de oro del laboratorio: una variable cada vez.' },
        { layout: 'blank', bg: ESP, transition: 'fade', extra: [
          text('Prueba en directo', 90, 120, 560, 90, { fontFamily: H, fontSize: 60, fontWeight: 700, color: PAPER }),
          text('Tres minutos con la báscula en marcha. Quien vierte, cuenta en voz alta.', 90, 230, 520, 120, { fontSize: 28, color: '#d9c7b4' }),
          shape('rounded', 90, 400, 420, 170, '#1c1c1c', { radius: 22 }),
          shape('rounded', 120, 430, 360, 80, '#9fb59a', { radius: 8 }),
          text('240,0 g', 120, 430, 360, 80, { fontFamily: MONO, fontSize: 52, fontWeight: 700, color: '#1c2a1c', textAlign: 'center', vAlign: 'middle' }),
          text('TARA · MODO · ⏻', 120, 520, 360, 34, { fontFamily: MONO, fontSize: 15, color: '#8a8a8a', textAlign: 'center', letterSpacing: 3 }),
          timer(180, 700, 200, 520, { style: 'digital', color: CREMA, h: 260, endText: '¡A la taza!' })],
          notes: 'Cuenta atrás digital de tres minutos que empieza sola, junto a una báscula dibujada con formas. Haz la extracción en directo mientras corre.' },
        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          shape('ellipse', 1010, 470, 220, 220, 'none', { stroke: CREMA, strokeWidth: 10, opacity: 40 }),
          pollBlock({ kind: 'word', fontSize: 34, question: '¿A qué te sabe este café? Una palabra', x: 90, y: 70, w: 980, h: 580 })],
          notes: 'Nube de palabras: cada uno escribe una nota de sabor desde el móvil (chocolate, cítrico, nueces…). El cerco de la taza en la esquina es una elipse sin relleno.' },
        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [
          shape('ellipse', 80, 60, 260, 260, 'none', { stroke: CREMA, strokeWidth: 12, opacity: 35 }), shape('ellipse', 955, 415, 290, 290, 'none', { stroke: CREMA, strokeWidth: 14, opacity: 30 }),
          shape('ellipse', 1010, 470, 200, 200, '#ffffff', { stroke: '#d3cab6', strokeWidth: 3 }), shape('ellipse', 1035, 495, 150, 150, '#3b2418', { fill2: '#6b3b22', gradType: 'radial' }),
          at(shape('ellipse', 1075, 535, 70, 70, '#c8915a', { opacity: 45 }), 'pulse', { start: 'afterPrev', duration: 1200 }),
          text('Buen café', 140, 240, 1000, 150, { fontFamily: H, fontSize: 120, fontWeight: 700, color: ESP, textAlign: 'center' }),
          text('Muestras de tueste en la mesa del fondo · Ficha nº 08: espresso', 140, 410, 1000, 40, { fontFamily: MONO, fontSize: 22, color: PEN, textAlign: 'center' })],
          notes: 'Cierre con los cercos de las tazas sobre la ficha y una taza vista desde arriba (formas); la crema late suave al llegar.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 8 · Macarons: a pâtisserie window with a striped awning, a tower of macarons that
  // land with a pop, one that moves into its anatomy with Transform, equal parts that
  // multiply, three meringues, the syrup's temperature, favourite flavours.
  life_food_macarons: { name: 'Macarons: pastelería francesa', cat: 'life',
    summary: 'Toldo de rayas, torre de macarons que caen con sonido, anatomía con Transformar, tabla con fórmulas, gráfico del almíbar, dona y ordenar pasos',
    make: () => {
      const SHOP = '#fdf6f0', MINT = '#e6f3ee', ROSE = '#d9627e', PINK = '#f4b6c2', PIST = '#b9d6a3', LAV = '#c9b6e4', VAN = '#f3e2b3', CHOC = '#7a4b3a', LEMON = '#f3e27a', INK = '#4a2f3a', GOLD = '#b8913c';
      const LB = FF.lobster, CG = FF.cormorant;
      const ids = Array.from({ length: 6 }, () => uid());
      const tower = [[PIST, '#f7f1df'], [LAV, '#5b3a6b'], [VAN, CHOC], [CHOC, '#f3d9b0'], [PINK, '#b8324f']];
      const deck = build({ name: 'Taller de macarons', palette: 'grayscale', fonts: 'editorial', title: { size: 54, color: ROSE, font: LB, bold: false }, body: { color: INK } }, [
        { layout: 'blank', bg: SHOP, transition: 'fade', extra: [
          ...awning(90),
          shape('rect', 700, 640, 520, 16, GOLD, { opacity: 70 }), shape('ellipse', 760, 628, 400, 30, '#ffffff', { stroke: '#e6d6c6', strokeWidth: 2 }),
          ...tower.flatMap(([sh, fi], i) => { const top = i === tower.length - 1, w = 190, y = 510 - i * 94;
            return macaron(865, y, w, sh, fi, top ? ids : null).map((b, q) => withAnims(b, A('fade-down', { start: q ? 'withPrev' : 'afterPrev', duration: 450, ...(q ? {} : { sound: 'pop' }) }))); }),
          text('Pâtisserie · taller del sábado', 90, 200, 600, 44, { fontFamily: CG, fontSize: 30, fontStyle: 'italic', color: GOLD }),
          text('Macarons', 80, 240, 640, 190, { fontFamily: LB, fontSize: 150, color: ROSE }),
          text('Dos conchas de almendra, un relleno y una paciencia infinita.', 90, 440, 560, 100, { fontSize: 26, color: INK }),
          text('17:00 · 12 plazas · se llevan 20 cada uno', 90, 560, 560, 40, { fontSize: 20, color: '#8a6f78', letterSpacing: 1 })],
          notes: 'Portada de escaparate: toldo de rayas con borde festoneado (rectángulos y círculos) y una torre de cinco macarons hechos con formas que caen uno tras otro con un «pop».' },
        { layout: 'blank', bg: MINT, autoAnimate: true, extra: [
          ...awning(40, '#bfe3d5', '#f4fbf8', 24),
          text('Anatomía de un macaron', 90, 70, 1100, 80, { fontFamily: LB, fontSize: 60, color: ROSE, textAlign: 'center' }),
          ...macaron(380, 200, 520, PINK, '#b8324f', ids),
          ...perClick([['La concha', 'Lisa, brillante y crujiente por fuera', 230, 'left'], ['El pie', 'La «falda» rizada que sale en el horno', 330, 'right'], ['El relleno', 'Ganache, crema o mermelada', 390, 'left']].map(([n, d, y, side]) => {
            const right = side === 'right';
            return [shape('rect', right ? 910 : 300, y + 36, 70, 2, GOLD), shape('ellipse', right ? 905 : 366, y + 31, 12, 12, GOLD),
              text(`<div style="font-family:${LB};font-size:34px;color:${ROSE}">${n}</div><div>${d}</div>`, right ? 990 : 60, y, 240, 120, { fontSize: 21, color: INK, textAlign: right ? 'left' : 'right' })]; }), 'fade-in')],
          notes: 'Transformar: el macaron rosa de lo alto de la torre viaja y crece hasta el centro (mismas formas en las dos diapositivas). Cada clic señala una parte.' },
        { title: 'Tant pour tant: a partes iguales', layout: 'titleOnly', bg: SHOP, extra: [
          tableBlock({ x: 90, y: 180, w: 700, h: 440, fontSize: 23, header: true, headBg: ROSE, headFg: '#ffffff', stroke: '#f0dde3', banded: true, band: PINK, bandAlpha: 0.2, color: INK,
            rows: [['Ingrediente', 'Gramos', 'Doble'], ['Almendra molida', '150 g', '=B2*2'], ['Azúcar glas', '150 g', '=B3*2'], ['Claras (para la pasta)', '55 g', '=B4*2'],
              ['Claras (para el merengue)', '55 g', '=B5*2'], ['Azúcar', '150 g', '=B6*2'], ['Agua', '38 g', '=B7*2'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [5, 2, 2] }),
          shape('rounded', 830, 180, 360, 440, '#ffffff', { radius: 24, stroke: PINK, strokeWidth: 3 }),
          ...macaron(915, 215, 190, PIST, '#f7f1df'),
          text(`<div style="font-family:${LB};font-size:40px;color:${ROSE}">≈ 40 macarons</div><div style="margin-top:8px">con la receta sencilla. Las claras, envejecidas: separadas el día anterior.</div>`, 860, 380, 300, 220, { fontSize: 21, color: INK, textAlign: 'center' })],
          notes: '«Tant pour tant» significa almendra y azúcar glas a partes iguales. La columna Doble multiplica por dos (=B2*2) y la última fila suma las columnas.' },
        { title: 'Tres merengues', layout: 'titleOnly', bg: MINT, extra: [
          ...perClick([['Francés', 'Claras y azúcar en crudo', [2, 1, 2], PINK], ['Italiano', 'Almíbar a 118 °C sobre las claras', [3, 3, 3], LAV], ['Suizo', 'Claras y azúcar al baño maría', [3, 2, 2], PIST]].map(([n, d, dots, c], i) => { const x = 90 + i * 375;
            return [shape('rounded', x, 180, 350, 440, '#ffffff', { radius: 20, stroke: '#cfe6dc', strokeWidth: 2 }), shape('rounded', x, 180, 350, 90, c, { radius: 20 }), shape('rect', x, 240, 350, 30, c),
              text(n, x, 190, 350, 70, { fontFamily: LB, fontSize: 44, color: INK, textAlign: 'center', vAlign: 'middle' }),
              text(d, x + 30, 290, 290, 80, { fontSize: 22, color: INK, textAlign: 'center' }),
              ...['Estabilidad', 'Dificultad', 'Brillo'].flatMap((m, k) => [text(m, x + 30, 400 + k * 66, 150, 40, { fontSize: 20, color: '#7a6870', vAlign: 'middle' }),
                ...[0, 1, 2].map(j => shape('ellipse', x + 200 + j * 40, 410 + k * 66, 24, 24, j < dots[k] ? ROSE : '#f1e4e8'))])]; }), 'flip'),
          text('En este taller: italiano. Más trabajo, conchas más regulares.', 90, 635, 1100, 40, { fontSize: 22, color: ROSE, textAlign: 'center', fontFamily: CG, fontStyle: 'italic', fontWeight: 700 })],
          notes: 'Tres tarjetas que entran girando, una por clic, con su valoración en puntos (formas). Elegimos el merengue italiano por su estabilidad.' },
        { title: 'El almíbar, grado a grado', layout: 'titleOnly', bg: SHOP, extra: [
          chartBlock({ x: 90, y: 170, w: 740, h: 470, chartType: 'line', color: ROSE, seriesName: 'Almíbar (°C)', grid: true, yMin: 0, yMax: 130, yTitle: 'Temperatura (°C)', xTitle: 'Minutos al fuego',
            data: series([['0', 20], ['1', 45], ['2', 70], ['3', 95], ['4', 108], ['5', 114], ['6', 118]]),
            series: [{ name: 'Objetivo', values: [118, 118, 118, 118, 118, 118, 118], color: GOLD }] }),
          at(text('118 °C', 870, 190, 320, 140, { fontFamily: LB, fontSize: 100, color: ROSE, textAlign: 'center' }), 'zoom-in', { start: 'afterPrev' }),
          text('Ni un grado más: a 121 °C el almíbar empieza a cristalizar y el merengue se corta.', 880, 350, 300, 160, { fontSize: 23, color: INK }),
          text('Cuando marque 114 °C, empieza a montar las claras.', 880, 530, 300, 90, { fontSize: 21, color: GOLD, fontWeight: 700 })],
          notes: 'Línea de temperatura del almíbar con la línea objetivo en dorado. Curva orientativa: depende del fuego y del cazo.' },
        { title: 'Los que más se venden', layout: 'titleOnly', bg: MINT, extra: [
          chartBlock({ x: 90, y: 170, w: 780, h: 470, chartType: 'doughnut', color: ROSE,
            data: slices([['Frambuesa', 28], ['Pistacho', 22], ['Vainilla', 18], ['Chocolate', 17], ['Lavanda', 8], ['Limón', 7]], [PINK, PIST, VAN, CHOC, LAV, LEMON]) }),
          ...macaron(900, 200, 140, PINK, '#b8324f'), ...macaron(1060, 260, 120, PIST, '#f7f1df'), ...macaron(930, 370, 120, CHOC, '#f3d9b0'),
          text('La frambuesa gana siempre; el pistacho, a quien lo prueba.', 890, 520, 300, 100, { fontSize: 23, color: INK, fontFamily: CG, fontStyle: 'italic', fontWeight: 700 })],
          notes: 'Dona con un color por sabor (el de cada macaron) y la leyenda con porcentajes. Ventas inventadas de un mes en la pastelería.' },
        { layout: 'blank', bg: SHOP, extra: [
          ...awning(40, PINK, '#fffaf5', 24),
          pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena los pasos del macaronage', x: 90, y: 80, w: 1100, h: 580,
            options: ['Tamizar almendra y azúcar glas', 'Mezclar con las primeras claras', 'Añadir el merengue italiano', 'Plegar hasta que caiga como cinta', 'Formar círculos con la manga', 'Dejar formar costra y hornear'] })],
          notes: 'Actividad de ordenar desde el móvil. El macaronage es el plegado de la masa: ni muy poco (conchas con pico) ni demasiado (conchas planas).' },
        { layout: 'blank', bg: MINT, extra: [
          text('Que se forme la costra', 90, 110, 620, 160, { fontFamily: LB, fontSize: 70, color: ROSE, lineHeight: 1.1 }),
          text('Treinta minutos al aire antes del horno. Toca una concha: si no se pega al dedo, está lista.', 90, 290, 560, 140, { fontSize: 26, color: INK }),
          shape('rounded', 90, 460, 560, 190, '#ffffff', { radius: 16, stroke: '#cfe6dc', strokeWidth: 2 }),
          ...Array.from({ length: 18 }, (_, i) => withAnims(shape('ellipse', 120 + (i % 9) * 58, 490 + Math.floor(i / 9) * 75, 46, 46, [PINK, PIST, LAV][Math.floor(i / 6) % 3]), A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 60, duration: 300 }))),
          timer(1800, 790, 170, 380, { color: ROSE, endText: '¡Al horno!' })],
          notes: 'La bandeja vista desde arriba se llena sola de conchas y la cuenta atrás de 30 minutos empieza al llegar.' },
        { layout: 'blank', bg: SHOP, transition: 'zoom', extra: [
          ...awning(90),
          text('Merci!', 240, 200, 800, 200, { fontFamily: LB, fontSize: 170, color: ROSE, textAlign: 'center' }),
          text('Llévate tu caja: aguantan tres días en la nevera… en teoría.', 240, 410, 800, 50, { fontSize: 26, color: INK, textAlign: 'center' }),
          ...[[110, 470, PIST, '#f7f1df'], [300, 540, LAV, '#5b3a6b'], [860, 540, VAN, CHOC], [1040, 470, PINK, '#b8324f']].flatMap(([x, y, a, f], i) =>
            macaron(x, y, 140, a, f).map((b, q) => withAnims(b, A('fade-up', { start: q || i ? 'withPrev' : 'afterPrev', delay: i * 200 }))))],
          notes: 'Cierre con el toldo y cuatro macarons que suben a la vez.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 9 · An artisan cheese board: wood and wedges, the milk truck in 3D bringing the milk,
  // how long each one ages, the milks in a doughnut, the board read like a clock.
  life_food_cheese: { name: 'Tabla de quesos artesanos', cat: 'life',
    summary: 'Tabla de madera en SVG, camión de leche 3D que recorre la diapositiva, proceso, barras, dona, reloj de sabores, emparejar, fórmulas y etiquetar',
    make: () => {
      const LINEN = '#f6f0e2', INK = '#3a2a1c', GREENL = '#2f4a3a', PASTE = '#f3d27a', RIND = '#c98e3a', BLUEC = '#e4ebe7', RED = '#a23b2a', SOFT = '#6e5a46', GOAT = '#f7f4ec';
      const H = pairStacks('friendly').heading;
      const flag = (t, x, y, c = GREENL) => [shape('rect', x, y, 3, 70, '#8a6a4a'), text(t, x + 3, y, Math.max(90, t.length * 13 + 24), 32, { fontSize: 18, fontWeight: 700, color: '#ffffff', bg: c, vAlign: 'middle', pad: [2, 10, 2, 10] })];
      const grapes = (x, y) => [[0, 0], [26, 4], [12, 22], [38, 26], [24, 46], [50, 50], [-6, 30]].map(([dx, dy]) => shape('ellipse', x + dx, y + dy, 30, 30, '#6b2a4a', { fill2: '#3b1028', gradType: 'radial' }));
      const clock = [['Fresco', GOAT, '#e9e2d0'], ['Cabra', '#fbf8ef', '#d7d0bf'], ['Tierno', PASTE, RIND], ['Oveja curado', '#e9c46a', '#8a5a2c'], ['Ahumado', '#e3b05a', '#6b3a1a'], ['Azul', BLUEC, '#6f8a8a']];
      const boardImg = svgURL(1000, 560, `<image href="${woodSVG(1000, 560, true)}" width="1000" height="560"/>`
        + `<circle cx="500" cy="110" r="70" fill="${GOAT}" stroke="#e1d9c4" stroke-width="6"/><path d="M640 220 L800 300 L640 300 Z" fill="${PASTE}" stroke="${RIND}" stroke-width="8"/>`
        + `<rect x="580" y="380" width="200" height="90" rx="40" fill="${BLUEC}" stroke="#6f8a8a" stroke-width="6"/><path d="M600 400 L660 450 M700 400 L740 440" stroke="#4d6f78" stroke-width="5"/>`
        + `<path d="M200 380 L360 400 L240 470 Z" fill="#e9c46a" stroke="#8a5a2c" stroke-width="8"/>`
        + [[400, 260], [430, 280], [410, 300], [440, 310]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#6b2a4a"/>`).join(''));
      const truckPath = [[-300, 0], [-620, 0], [-900, 0]];
      const deck = build({ name: 'Tabla de quesos', palette: 'office', fonts: 'friendly', title: { size: 46, color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: LINEN, transition: 'fade', extra: [
          shape('rect', 0, 0, 1280, 720, LINEN, { fill2: '#ebe1cc', gradType: 'radial' }),
          img(woodSVG(1180, 260), 50, 430, 1180, 260, { alt: 'Tabla de madera', decorative: true }),
          shape('custom', 260, 300, 340, 300, PASTE, { path: wheelPath(60), stroke: RIND, strokeWidth: 10 }),
          ...wedge(620, 380, 240, 170, PASTE, RIND, 5),
          shape('rounded', 880, 470, 230, 90, BLUEC, { radius: 45, stroke: '#6f8a8a', strokeWidth: 5 }), shape('custom', 890, 480, 210, 70, 'none', { stroke: '#4d6f78', strokeWidth: 4, path: 'M5 30 L30 60 M40 10 L60 50 M80 20 L95 70' }),
          shape('ellipse', 130, 520, 110, 110, GOAT, { stroke: '#d7d0bf', strokeWidth: 5 }),
          ...grapes(1130, 450), ...grapes(560, 570),
          ...cascade([flag('Tierno', 440, 300, RED), flag('Curado', 760, 320), flag('Azul', 1000, 400, '#4d6f78')], 'fade-down', 'afterPrev', { duration: 300 }),
          kicker('CATA EN LA QUESERÍA · 8 QUESOS', 90, 70, 700, RED, 20),
          text('Quesos de aquí', 84, 100, 900, 130, { fontFamily: H, fontSize: 104, fontWeight: 800, color: INK }),
          text('Cómo elegirlos, cortarlos y servirlos en una tabla que se recuerde', 90, 230, 820, 50, { fontSize: 27, color: SOFT })],
          notes: 'Portada: la tabla de madera es un SVG con veta; los quesos son formas (un queso entero con una cuña cortada, una cuña con agujeros, un azul) y las banderitas aparecen solas.' },
        { title: 'De la granja a la tabla', layout: 'titleOnly', bg: LINEN, extra: [
          dg('process', 'Leche\nCuajada\nMoldeado\nSalado\nCuración', 90, 170, 1100, 170, { colors: 'accent', fontScale: 1.1 }),
          shape('rect', 0, 600, 1280, 120, '#c8b98f'), shape('rect', 0, 600, 1280, 6, '#a8996f'),
          ...[0, 1, 2, 3, 4, 5, 6].map(i => shape('rect', 40 + i * 190, 640, 100, 8, '#ffffff', { opacity: 70 })),
          withAnims(m3d('kh-CesiumMilkTruck', 960, 410, 280, 220, { view: 'side', walk: { clip: '*', face: false, look: false }, edge: 'free' }), path(truckPath, { duration: 6000, sound: 'whoosh' })),
          text('Leche cruda de tres granjas a menos de 20 km. Se recoge cada mañana antes de las ocho.', 90, 360, 1100, 44, { fontSize: 24, color: INK }),
          credits(['kh-CesiumMilkTruck'], 90, 676, 1100, '#5d5338', 11)],
          notes: 'Diagrama de proceso con las cinco fases. Clic: el camión de leche 3D cruza la diapositiva por la carretera (trayectoria con sonido) mientras giran sus ruedas.' },
        { title: 'Cuánto tiempo en la cava', layout: 'titleOnly', bg: LINEN, extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 470, chartType: 'hbar', color: RIND, dataLabels: true, xTitle: 'Meses de curación',
            data: series([['Fresco', 0], ['Tierno', 1], ['Semicurado', 3], ['Curado', 6], ['Viejo', 12], ['Añejo', 24]]) }),
          ...[['#fbf3d6', '#e6cf8a'], ['#f6e3a3', '#d9a74a'], ['#efcf74', '#b9822c'], ['#e3b356', '#8a5a2c']].flatMap(([p, r], i) => wedge(860 + (i % 2) * 170, 190 + Math.floor(i / 2) * 150, 140, 110, p, r, 2 + i)),
          text('Con el tiempo pierde agua, gana sabor y la pasta se oscurece.', 850, 500, 340, 110, { fontSize: 24, color: INK })],
          notes: 'Barras horizontales con los meses habituales de cada tipo (orientativos). A la derecha, cuatro cuñas cada vez más curadas.' },
        { title: 'De qué leche', layout: 'titleOnly', bg: LINEN, extra: [
          chartBlock({ x: 90, y: 170, w: 600, h: 460, chartType: 'doughnut', color: RIND,
            data: slices([['Vaca', 3], ['Oveja', 3], ['Cabra', 2]], ['#e9c46a', '#a8723c', GREENL]) }),
          ...[['Vaca', 'Suave, mantecosa. La más fácil para empezar.', '#e9c46a', '#8a6410'], ['Oveja', 'Intensa y grasa: la de los curados de meseta.', '#a8723c', '#8a5a2c'], ['Cabra', 'Ácida, blanca, con un punto de corral.', GREENL, GREENL]].flatMap(([n, d, c, tc], i) =>
            together([card(`<b style="font-family:${H};font-size:28px;color:${tc}">${n}</b><br>${d}`, 740, 180 + i * 150, 450, 130, '#ffffff', { fontSize: 22, color: INK, radius: 14, stroke: '#e6dcc6', pad: [12, 18, 12, 34] }),
              shape('rounded', 740, 180 + i * 150, 14, 130, c, { radius: 7 })], 'fade-left', i ? 'afterPrev' : 'click'))],
          notes: 'Dona con los ocho quesos de la cata según la leche, con su color y porcentaje en la leyenda. Clic: el carácter de cada leche.' },
        { title: 'El reloj de sabores', layout: 'titleOnly', bg: LINEN, extra: [
          img(woodSVG(460, 460, true), 90, 180, 460, 460, { alt: 'Tabla redonda de madera' }),
          ...cascade(clock.map(([n, p, r], i) => { const a = (-90 + i * 60) * Math.PI / 180, cx = 320 + Math.cos(a) * 150, cy = 410 + Math.sin(a) * 150;
            return [shape('ellipse', Math.round(cx - 46), Math.round(cy - 40), 92, 80, p, { stroke: r, strokeWidth: 6 }),
              text(String(i + 1), Math.round(cx - 20), Math.round(cy - 20), 40, 40, { fontSize: 24, fontWeight: 800, color: INK, textAlign: 'center', vAlign: 'middle' })]; }), 'zoom-in', 'click', { duration: 300 }),
          at(shape('custom', 210, 300, 220, 220, 'none', { stroke: RED, strokeWidth: 5, path: 'M50 2 C78 2 98 22 98 50 C98 78 78 98 50 98 C30 98 12 86 5 66 M5 66 L2 80 M5 66 L18 72' }), 'fade-in', { start: 'afterPrev', duration: 800 }),
          ...clock.map(([n], i) => text(`<b style="color:${RED}">${i + 1}</b>&nbsp; ${n}`, 620, 190 + i * 62, 260, 50, { fontSize: 25, color: INK, vAlign: 'middle' })),
          text('De suave a fuerte, en el sentido de las agujas del reloj. El azul, siempre el último.', 900, 230, 290, 200, { fontSize: 24, color: SOFT })],
          notes: 'Una tabla redonda de madera (SVG) en la que los seis quesos aparecen por orden con un clic, y después una flecha marca el sentido de la cata.' },
        { layout: 'blank', bg: LINEN, extra: [
          img(woodSVG(1280, 50), 0, 0, 1280, 50, { alt: '', decorative: true, fit: 'cover' }),
          pollBlock({ kind: 'match', fontSize: 28, question: 'Cada queso con su acompañante', x: 90, y: 90, w: 1100, h: 570,
            options: ['Queso fresco = Miel y nueces', 'Oveja curado = Membrillo', 'Queso azul = Pera y vino dulce', 'Cabra = Mermelada de higos', 'Ahumado = Manzana ácida'] })],
          notes: 'Actividad de emparejar desde el móvil. Ninguna respuesta es la única posible: al terminar, comenta las alternativas del grupo.' },
        { title: '¿Cuánto queso compro?', layout: 'titleOnly', bg: LINEN, extra: [
          tableBlock({ x: 90, y: 180, w: 720, h: 420, fontSize: 24, header: true, headBg: GREENL, headFg: '#ffffff', stroke: '#ddd2bb', banded: true, band: PASTE, bandAlpha: 0.2, color: INK,
            rows: [['Ocasión', 'Por persona', 'Personas', 'Total'], ['Aperitivo', '50 g', '8', '=B2*C2'], ['Tabla como cena', '120 g', '8', '=B3*C3'], ['Postre', '30 g', '8', '=B4*C4'], ['<b>Toda la noche</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']], colW: [5, 3, 3, 3] }),
          ...wedge(880, 200, 280, 200, PASTE, RIND, 6),
          text('Sácalo de la nevera una hora antes: frío no sabe a nada.', 860, 450, 330, 120, { fontSize: 24, color: INK })],
          notes: 'Tabla con fórmulas: cada fila multiplica gramos por personas y la última suma (=SUMA(ARRIBA)). Cantidades orientativas.' },
        { layout: 'blank', bg: LINEN, extra: [
          pollBlock({ kind: 'label', fontSize: 28, question: '¿Qué hay en la tabla? Pon cada nombre en su número', image: boardImg, x: 90, y: 50, w: 1100, h: 620,
            options: ['Cabra', 'Tierno', 'Azul', 'Oveja curado'], points: [{ x: 50, y: 20 }, { x: 70, y: 49 }, { x: 68, y: 76 }, { x: 26, y: 74 }] })],
          notes: 'Actividad de etiquetar desde el móvil: la tabla dibujada sin nombres y cuatro etiquetas para arrastrar a cada queso.' },
        { layout: 'section', bg: GREENL, title: '¡Que aproveche!', subtitle: 'Los ocho quesos de hoy están a la venta en el mostrador', transition: 'fade',
          back: [img(woodSVG(1280, 160), 0, 600, 1280, 160, { alt: '', decorative: true, fit: 'cover' }), ...wedge(980, 450, 200, 150, PASTE, RIND, 4), ...grapes(170, 520)],
          notes: 'Cierre con la tabla de madera al pie y una cuña.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 96, fontWeight: 800, color: LINEN, y: 130 }); if (b.ph === 'subtitle') Object.assign(b, { color: PASTE, y: 390 }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 10 · Fire and embers: a brazier in 3D that moves with Transform, the two zones of a
  // grill from above, the hand test, core temperatures, the rest and its equation.
  life_food_bbq: { name: 'Brasa y parrilla', cat: 'life',
    summary: 'Brasero 3D que se mueve con Transformar, Text Art fuego, parrilla de dos zonas, tabla, barras de temperatura, ecuación, cuenta atrás y concurso',
    make: () => {
      const CHAR = '#121010', EMBER = '#ff6b1a', HOT = '#ffb347', ASH = '#a59f97', SMOKE = '#e6e0d6', RED = '#d7261e', PANEL = '#1d1a19';
      const H = pairStacks('bold').heading;
      const pot = uid();
      const brazier = (x, y, w, h, p = {}) => keep(m3d('kh-PotOfCoals', x, y, w, h, { autoRotate: true, view: 'three', edge: 'free', ...p }), pot);
      const deck = build({ name: 'Brasa y parrilla', palette: 'revela', fonts: 'bold', title: { size: 64, color: SMOKE, bold: false }, body: { color: SMOKE } }, [
        { layout: 'blank', bg: CHAR, transition: 'fade', transitionSpeed: 'slow', extra: [
          glow(620, 120, 640, '#7a2a0c', CHAR, 70),
          ...embers(40, 3, [0, 640, 1280, 90]),
          ...grate(0, 600, 1280, 120, 4, '#2c2826'),
          brazier(700, 90, 520, 500),
          kicker('TALLER DE PARRILLA · JARDÍN · 13:00', 92, 150, 560, HOT, 20),
          at(text('BRASA', 80, 180, 640, 260, { fontFamily: H, fontSize: 260, wordart: 'fire', lineHeight: 1, shrink: false }), 'zoom-in', { start: 'afterPrev', duration: 900, sound: 'whoosh' }),
          text('Cocinar con fuego: zonas, tiempos y punto', 92, 450, 600, 50, { fontSize: 28, color: SMOKE }),
          credits(['kh-PotOfCoals'], 92, 520, 560, '#6c6560', 11)],
          notes: 'Portada: brasero 3D que gira solo, brasas hechas con formas y Text Art de estilo fuego que entra con un silbido.' },
        { layout: 'blank', bg: CHAR, autoAnimate: true, extra: [
          brazier(1040, 20, 200, 190),
          text('DOS ZONAS, SIEMPRE', 90, 60, 900, 90, { fontFamily: H, fontSize: 80, color: SMOKE }),
          shape('rounded', 90, 200, 760, 420, '#2a2624', { radius: 30 }),
          ...embers(80, 11, [110, 220, 340, 380]),
          ...grate(110, 225, 720, 380, 10),
          shape('rect', 468, 200, 4, 420, ASH, { opacity: 60 }),
          ...together([text('DIRECTO<br><span style="font-size:52px">250–300 °C</span>', 120, 500, 330, 110, { fontFamily: H, fontSize: 32, color: HOT, bg: '#121010cc', radius: 10, textAlign: 'center' }),
            text('INDIRECTO<br><span style="font-size:52px">120–160 °C</span>', 500, 500, 330, 110, { fontFamily: H, fontSize: 32, color: SMOKE, bg: '#121010cc', radius: 10, textAlign: 'center' })], 'fade-up', 'click'),
          ...chain([['Directo', 'Sellar filetes, chuletas y verduras finas.'], ['Indirecto', 'Piezas gruesas, pollo entero, costillas.'], ['El truco', 'Si algo se quema, se pasa al otro lado.']].map(([n, d], i) =>
            text(`<span style="font-family:${H};font-size:36px;color:${i === 2 ? RED : HOT}">${n}</span><br>${d}`, 900, 250 + i * 125, 300, 115, { fontSize: 22, color: SMOKE })), 'fade-left', 'click')],
          notes: 'Transformar: el brasero 3D se encoge y sube a la esquina. La parrilla vista desde arriba está hecha con formas: brasas solo a la izquierda y rejilla encima.' },
        { title: 'LA PRUEBA DE LA MANO', layout: 'titleOnly', bg: CHAR, extra: [
          text('Mano abierta a 10 cm de la rejilla: ¿cuántos segundos aguantas?', 100, 160, 1080, 44, { fontSize: 25, color: ASH }),
          tableBlock({ x: 100, y: 220, w: 760, h: 400, fontSize: 24, header: true, headBg: EMBER, headFg: CHAR, stroke: '#3a3432', banded: true, band: '#2a2624', color: SMOKE,
            rows: [['Segundos', 'Temperatura', 'Para qué'], ['2', 'Más de 260 °C', 'Sellar'], ['4', 'Unos 200 °C', 'Filetes y hamburguesas'], ['6', 'Unos 175 °C', 'Pollo en piezas'], ['8', 'Unos 150 °C', 'Verduras grandes'], ['10 o más', 'Menos de 120 °C', 'Ahumar y asados lentos']], colW: [2, 3, 4] }),
          ...Array.from({ length: 5 }, (_, i) => withAnims(shape('ellipse', 940 + (i % 3) * 80, 250 + Math.floor(i / 3) * 90, 60, 60, i < 2 ? RED : i < 4 ? EMBER : HOT, { opacity: 90 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 250, sound: 'click' }))),
          text('Un, dos… ¡fuera!', 920, 470, 280, 60, { fontFamily: H, fontSize: 44, color: HOT })],
          notes: 'Una tabla de equivalencias (aproximadas) entre segundos y temperatura. Clic: cinco «segundos» se encienden uno tras otro, con un clic de sonido cada uno.' },
        { title: 'EL PUNTO, EN GRADOS', layout: 'titleOnly', bg: CHAR, extra: [
          shape('rounded', 90, 170, 760, 470, '#f2ede6', { radius: 16 }),
          chartBlock({ x: 110, y: 185, w: 720, h: 440, chartType: 'hbar', color: RED, dataLabels: true, xTitle: 'Temperatura en el centro (°C)', xMin: 0, yMax: 80,
            data: series([['Ternera poco hecha', 52], ['Ternera al punto', 57], ['Ternera hecha', 63], ['Cerdo', 63], ['Pollo', 74]]) }),
          shape('rounded', 925, 200, 26, 360, '#d0cac2', { radius: 13 }), shape('triangle', 925, 560, 26, 80, '#d0cac2', { rotation: 180 }),
          shape('ellipse', 900, 160, 76, 76, '#3a3432', { stroke: ASH, strokeWidth: 4 }),
          text('Un termómetro de pincho cuesta menos que un chuletón echado a perder.', 990, 260, 210, 200, { fontSize: 24, color: SMOKE })],
          notes: 'Barras horizontales con la temperatura interior recomendada por tipo de carne (valores de referencia redondeados). A la derecha, un termómetro de pincho hecho con formas.' },
        { layout: 'blank', bg: PANEL, extra: [
          text('REPOSO', 90, 90, 600, 140, { fontFamily: H, fontSize: 150, color: HOT, lineHeight: 1 }),
          text('Fuera del fuego la carne sigue subiendo unos grados. Por eso se retira antes:', 90, 250, 600, 100, { fontSize: 26, color: SMOKE }),
          text('<i>T</i> final ≈ <i>T</i> al retirarla + 4 °C', 90, 365, 620, 80, { fontFamily: FF.lora, fontSize: 34, color: HOT, vAlign: 'middle' }),
          at(mathBlock({ x: 90, y: 460, w: 620, h: 80, fontSize: 32, color: SMOKE, latex: '53\\,°\\mathrm{C} + 4\\,°\\mathrm{C} \\approx 57\\,°\\mathrm{C}' }), 'fade-up'),
          timer(300, 800, 170, 380, { color: EMBER, endText: '¡A cortar!' }),
          text('Cinco minutos sobre una tabla, sin tapar.', 760, 580, 460, 40, { fontSize: 22, color: ASH, textAlign: 'center' })],
          notes: 'La inercia térmica (aproximada) y un ejemplo con un clic, en ecuación: 57 °C es carne al punto. La cuenta atrás de 5 minutos empieza sola: el tiempo de reposo.' },
        { title: 'NO SOLO CARNE', layout: 'titleOnly', bg: CHAR, extra: [
          ...cascade([['Pimientos', 'Enteros, hasta que la piel se ennegrezca. Luego, a pelar.', RED], ['Berenjena', 'Directa a las brasas: carne ahumada para untar.', '#6b3a7a'],
            ['Mazorcas', 'Con su hoja, en indirecto, veinte minutos.', '#e8b830'], ['Setas', 'Sombrero abajo, sal gorda y aceite al final.', '#a8835c']].map(([n, d, c], i) => { const x = 90 + i * 280;
            return [shape('rounded', x, 180, 260, 430, PANEL, { radius: 18, stroke: '#2e2a28', strokeWidth: 2 }), shape('ellipse', x + 55, 210, 150, 150, c, { fill2: '#1a0f0a', gradType: 'radial' }),
              ...grate(x + 40, 235, 180, 110, 4, '#3a3634'),
              text(n, x, 380, 260, 60, { fontFamily: H, fontSize: 44, color: SMOKE, textAlign: 'center' }),
              text(d, x + 22, 445, 216, 150, { fontSize: 21, color: ASH, textAlign: 'center' })]; }), 'flip', 'click')],
          notes: 'Cuatro tarjetas que entran girando una tras otra con un clic: verduras que salen mejor a la brasa que en cualquier otro sitio.' },
        { title: 'SEGURIDAD', layout: 'titleOnly', bg: CHAR, extra: [
          ...together([['droplet', 'Un cubo de agua o arena a mano, siempre.'], ['wind', 'Nunca en un sitio cerrado: el humo también quema.'], ['ban', 'Ni alcohol ni gasolina para avivar el fuego.'], ['hourglass', 'Las brasas tardan horas en apagarse del todo.']].flatMap(([ic, t], i) => {
            const x = 90 + (i % 2) * 560, y = 180 + Math.floor(i / 2) * 220;
            return [shape('rounded', x, y, 530, 190, PANEL, { radius: 18 }), shape('ellipse', x + 30, y + 45, 100, 100, '#2a1a12'), icon(ic, x + 55, y + 70, 50, i === 2 ? RED : HOT),
              text(t, x + 160, y + 30, 340, 130, { fontSize: 26, color: SMOKE, vAlign: 'middle' })]; }), 'fade-up', 'click')],
          notes: 'Cuatro normas básicas con sus iconos, que aparecen juntas con un clic. En días de riesgo de incendio, consulta si está permitido encender fuego.' },
        { layout: 'blank', bg: CHAR, extra: [
          ...embers(30, 21, [0, 650, 1280, 70]),
          pollBlock({ kind: 'quiz', fontSize: 34, question: '¿Cuándo se pone la carne en la parrilla?', options: ['Con las llamas bien altas', 'Cuando las brasas se cubren de ceniza blanca', 'En cuanto sale humo negro', 'Nada más encender el carbón'], correct: [1], time: 20, x: 90, y: 70, w: 1100, h: 560 })],
          notes: 'Concurso desde el móvil con puntos. La llama quema por fuera y deja crudo por dentro: se cocina con la brasa, no con el fuego.' },
        { layout: 'section', bg: CHAR, title: '¡A LA BRASA!', subtitle: 'Se come en 40 minutos. Trae tu plato y tu bebida', transition: 'zoom',
          back: [glow(340, 360, 600, '#7a2a0c', CHAR, 70), ...embers(60, 31, [0, 600, 1280, 120]), ...grate(0, 590, 1280, 130, 4, '#2c2826')],
          notes: 'Cierre con las brasas y la rejilla al pie.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 170, wordart: 'fire', shrink: false }); if (b.ph === 'subtitle') Object.assign(b, { color: SMOKE }); });
      return finish(deck);
    } },
};
