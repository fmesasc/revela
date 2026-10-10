// Example presentations: Educación física y hábitos saludables. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Ten lessons, each with its own look taken from the topic:
// a sports hall's parquet with painted lines (warming up), a heart monitor (heart rate), a picnic
// tablecloth with the plate from above (food), water and a glass that fills (drinking), a bedroom at
// night (sleep), a coach's tactics board (basketball), a running track from above (athletics), an
// anatomy plate in sepia (back care), a calm dawn (cooling down and breathing) and a cork board with
// the week's plan (sixty minutes a day). Figures are made up but plausible (said in the notes);
// the health advice is the usual, cautious one for school.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file -------------------------------------------------------------
// An SVG drawing as a data URL (parquet, plates, tracks, spines: drawn for these decks).
const svgURL = (w, h, inner, bg = null) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const img = (src, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, fit: 'contain', ...props });
const deco = (src, x = 0, y = 0, w = 1280, h = 720, props = {}) => img(src, x, y, w, h, { alt: '', decorative: true, fit: 'fill', ...props });
// Fonts of the catalogue beyond the deck's pair.
const FF = { mono: "'JetBrains Mono', monospace", caveat: "'Caveat', cursive", oswald: "'Oswald', sans-serif", anton: "'Anton', sans-serif",
  lora: "'Lora', serif", quicksand: "'Quicksand', sans-serif", cormorant: "'Cormorant Garamond', serif" };
const keep = (b, id) => ({ ...b, id });                    // (the same id on two slides: Transform moves it)
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// The same animation on a group: the first one starts it, the rest go with it.
const together = (blocks, effect = 'fade-up', start = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'withPrev' : start })));
// One after another (the first on a click, or by itself with 'afterPrev').
const chain = (blocks, effect = 'fade-up', first = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// numbered(), and on section slides the shapes and pictures under the title and subtitle.
const finish = deck => { for (const sl of deck.slides) if (sl.layoutId === 'section') sl.blocks.sort((a, b) => (!b.ph) - (!a.ph));
  return numbered(deck); };
// A 3D model without its caption (the credits, when the licence asks, go in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color, size = 12) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: size, color });
// The same pseudo-random numbers every time.
const rng = seed => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const kicker = (t, x, y, w, color, size = 20, props = {}) => text(t, x, y, w, size + 16, { fontSize: size, letterSpacing: 5, color, fontWeight: 700, ...props });
const specks = (n, seed, color, area = [0, 0, 1280, 720], size = [2, 6], op = [20, 60]) => { const r = rng(seed);
  return Array.from({ length: n }, () => { const d = size[0] + r() * (size[1] - size[0]);
    return shape('ellipse', Math.round(area[0] + r() * area[2]), Math.round(area[1] + r() * area[3]), d, d, color, { opacity: Math.round(op[0] + r() * (op[1] - op[0])) }); }); };
const series = pairs => pairs.map(([label, value]) => ({ label, value }));
const slices = (pairs, colors) => pairs.map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
// A line drawn in a 0–100 box (the "Draw" effect traces it).
const stroke = (d, x, y, w, h, color, sw = 3, props = {}) => shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: sw, ...props });
// A stick figure in the style of sports pictograms (thick round strokes), in a 200 × 300 box.
// pose: the joints [head, neck, hip, l.elbow, l.hand, r.elbow, r.hand, l.knee, l.foot, r.knee, r.foot] as [x, y].
const figure = (pose, color, sw = 18) => { const [h, n, p, le, lh, re, rh, lk, lf, rk, rf] = pose, L = (...pts) => `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svgURL(200, 300, `<circle cx="${h[0]}" cy="${h[1]}" r="${sw * 1.25}" fill="${color}"/>` + L(n, p) + L(n, le, lh) + L(n, re, rh) + L(p, lk, lf) + L(p, rk, rf)); };
const POSES = {
  stand: [[100, 40], [100, 78], [100, 165], [72, 120], [62, 165], [128, 120], [138, 165], [86, 225], [82, 285], [114, 225], [118, 285]],
  run: [[112, 40], [108, 78], [94, 162], [70, 110], [84, 146], [140, 104], [160, 72], [130, 210], [108, 270], [60, 200], [30, 238]],
  jump: [[100, 34], [100, 72], [100, 158], [60, 52], [44, 18], [140, 52], [156, 18], [72, 210], [86, 268], [130, 208], [118, 266]],
  throw: [[118, 44], [112, 82], [98, 166], [150, 64], [178, 30], [70, 110], [44, 128], [128, 222], [150, 284], [70, 222], [48, 284]],
  quad: [[100, 34], [100, 72], [100, 160], [76, 118], [92, 196], [126, 112], [150, 80], [98, 226], [100, 290], [124, 214], [94, 192]],
  hams: [[150, 160], [128, 140], [70, 128], [130, 196], [150, 236], [146, 196], [168, 240], [96, 210], [150, 286], [56, 214], [46, 290]],
  calf: [[134, 48], [128, 84], [104, 164], [150, 92], [182, 70], [160, 100], [190, 84], [140, 220], [150, 282], [80, 222], [40, 282]],
  arm: [[100, 40], [100, 78], [100, 165], [128, 104], [168, 92], [76, 104], [150, 108], [86, 225], [82, 285], [114, 225], [118, 285]],
  lift: [[100, 96], [100, 132], [92, 200], [118, 168], [130, 214], [80, 168], [70, 214], [140, 232], [116, 288], [52, 232], [76, 288]],
  bend: [[166, 150], [146, 128], [80, 120], [150, 178], [158, 220], [142, 176], [148, 222], [80, 204], [80, 288], [80, 206], [82, 288]],
};

// ---- 1 · Calentamiento: the parquet of a sports hall with its painted lines ---------------------
const WOODS = ['#dcab6c', '#d29e5e', '#e3b678', '#cb9556', '#d8a565'];
const parquet = (w, h, seed, lines = '') => { const R = rng(seed); let s = '';
  for (let y = 0; y < h; y += 36) { let x = -Math.round(R() * 220); while (x < w) { const L = Math.round(180 + R() * 240);
    s += `<rect x="${x}" y="${y}" width="${L}" height="36" fill="${WOODS[Math.floor(R() * WOODS.length)]}" stroke="#ad7a45" stroke-width="1.2"/>`;
    if (R() > 0.6) s += `<path d="M${x + 20} ${y + 12 + R() * 12} C${x + L * 0.4} ${y + 8 + R() * 20} ${x + L * 0.7} ${y + 10 + R() * 16} ${x + L - 20} ${y + 14 + R() * 10}" stroke="#b9844c" stroke-width="1" fill="none" opacity=".6"/>`;
    x += L; } }
  return svgURL(w, h, s + lines); };

// ---- 2 · Frecuencia cardiaca: a heart monitor ----------------------------------------------------
// A trace of n beats across a 0–100 box (P wave, QRS spike, T wave).
const ecg = (n, flat = 60) => { const w = 100 / n; let d = `M0 ${flat}`;
  for (let i = 0; i < n; i++) { const x = i * w, f = v => (x + v * w).toFixed(2);
    d += ` L${f(0.18)} ${flat} C${f(0.22)} ${flat - 8} ${f(0.3)} ${flat - 8} ${f(0.34)} ${flat} L${f(0.42)} ${flat} L${f(0.45)} ${flat + 10} L${f(0.5)} 4 L${f(0.55)} 92 L${f(0.59)} ${flat}`
      + ` L${f(0.68)} ${flat} C${f(0.74)} ${flat - 16} ${f(0.84)} ${flat - 16} ${f(0.9)} ${flat} L${f(1)} ${flat}`; }
  return d; };
const monitorGrid = (bg = '#04110c', line = '#0b2a1d', strong = '#0f3a28') => svgURL(1280, 720,
  `<defs><pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0 L0 0 0 32" fill="none" stroke="${line}" stroke-width="1"/></pattern>`
  + `<pattern id="G" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="url(#g)"/><path d="M160 0 L0 0 0 160" fill="none" stroke="${strong}" stroke-width="2"/></pattern></defs>`
  + `<rect width="1280" height="720" fill="${bg}"/><rect width="1280" height="720" fill="url(#G)"/>`);
// A heart-rate app (made up) for the phone.
const pulseApp = (G, R) => svgURL(360, 720, `<rect width="360" height="720" fill="#071510"/>`
  + `<text x="28" y="70" font-family="sans-serif" font-size="22" fill="#7fb39a">Sesión · 32:15</text>`
  + `<path d="M180 150 C150 112 92 124 96 176 C100 222 160 252 180 276 C200 252 260 222 264 176 C268 124 210 112 180 150 Z" fill="${R}"/>`
  + `<text x="180" y="370" font-family="sans-serif" font-size="96" font-weight="700" fill="#ffffff" text-anchor="middle">148</text>`
  + `<text x="180" y="410" font-family="sans-serif" font-size="24" fill="#7fb39a" text-anchor="middle">pulsaciones por minuto</text>`
  + `<rect x="28" y="450" width="304" height="18" rx="9" fill="#0f3a28"/><rect x="28" y="450" width="212" height="18" rx="9" fill="${G}"/>`
  + `<text x="28" y="500" font-family="sans-serif" font-size="20" fill="#d9fbe8">Zona vigorosa · 72 %</text>`
  + `<polyline points="28,640 60,610 90,620 120,580 150,596 180,560 210,572 240,540 270,556 300,530 332,548" fill="none" stroke="${G}" stroke-width="5" stroke-linejoin="round"/>`
  + `<text x="28" y="690" font-family="sans-serif" font-size="18" fill="#7fb39a">Últimos 10 minutos</text>`);

// ---- 3 · El plato: a picnic tablecloth and the plate from above ---------------------------------
const gingham = (c = '#d94f3d', ground = '#fffaf0', size = 80, w = 1280, h = 720) => svgURL(w, h, `<defs><pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse">`
  + `<rect width="${size}" height="${size}" fill="${ground}"/><rect width="${size / 2}" height="${size}" fill="${c}" opacity=".42"/><rect width="${size}" height="${size / 2}" fill="${c}" opacity=".42"/></pattern></defs>`
  + `<rect width="${w}" height="${h}" fill="url(#p)"/>`);
const PLATE = { veg: '#5c9e3a', grain: '#e0a030', prot: '#c0563b' };
// The plate (d across) with its rim; parts: which quarters are served (veg is half the plate).
const plateBase = (x, y, d) => [shape('ellipse', x + d * 0.02, y + d * 0.05, d, d, '#000000', { opacity: 12 }),
  shape('ellipse', x, y, d, d, '#ffffff', { stroke: '#e6dccb', strokeWidth: 3 }), shape('ellipse', x + d * 0.07, y + d * 0.07, d * 0.86, d * 0.86, '#f7f2e8', { stroke: '#ece3d3', strokeWidth: 2 })];
const plateParts = (x, y, d, labels = true) => { const k = v => Math.round(v), bx = x + d * 0.1, s = d * 0.8;
  const part = (p, fill, fill2) => shape('custom', k(bx), k(y + d * 0.1), k(s), k(s), fill, { path: p, fill2, gradType: 'radial', stroke: '#ffffff', strokeWidth: 5 });
  const lab = (t, lx, ly, w) => text(t, k(x + lx * d), k(y + ly * d), k(w * d), k(d * 0.16), { fontSize: Math.round(d * 0.05), fontWeight: 800, color: '#ffffff', textAlign: 'center', vAlign: 'middle', lineHeight: 1.1 });
  return [[part('M50 50 L50 0 A50 50 0 0 0 50 100 Z', PLATE.veg, '#3f7a26'), ...(labels ? [lab('Verdura<br>y fruta', 0.13, 0.42, 0.34)] : [])],
    [part('M50 50 L50 0 A50 50 0 0 1 100 50 Z', PLATE.grain, '#c07f17'), ...(labels ? [lab('Cereales<br>integrales', 0.52, 0.26, 0.32)] : [])],
    [part('M50 50 L100 50 A50 50 0 0 1 50 100 Z', PLATE.prot, '#94391f'), ...(labels ? [lab('Proteína', 0.52, 0.6, 0.32)] : [])]]; };
const cutlery = (x, y, h, color = '#9aa0a6') => [shape('rounded', x, y + h * 0.28, h * 0.06, h * 0.72, color, { radius: 6 }), shape('rounded', x - h * 0.04, y, h * 0.14, h * 0.32, color, { radius: 10 }),
  shape('rounded', x + h * 0.2, y, h * 0.07, h, color, { radius: 6 }), shape('custom', x + h * 0.2, y, h * 0.1, h * 0.45, color, { path: 'M0 0 C100 10 100 80 60 100 L0 100 Z' })];

// ---- 4 · Agua: a glass that fills, bubbles, a bottle ----------------------------------------------
// A glass (outline) and its water (level 0–1), with fixed ids so Transform carries them.
const glassOf = (x, y, w, h, level, ids, color = '#3fc1e8', line = '#e8f6fc') => { const lh = Math.max(4, Math.round(h * 0.92 * level)), ins = w * 0.06 * (1 - level);
  return [{ ...shape('custom', Math.round(x + w * 0.06 + ins), Math.round(y + h * 0.96 - lh), Math.round(w * 0.88 - 2 * ins), lh, color, { path: 'M0 0 L100 0 L92 100 L8 100 Z', fill2: '#1b8fc0', gradAngle: 90, opacity: 90 }), id: ids[0] },
    { ...shape('custom', x, y, w, h, 'none', { path: 'M0 0 L100 0 L90 100 L10 100 Z', stroke: line, strokeWidth: 5 }), id: ids[1] },
    { ...shape('rounded', Math.round(x + w * 0.16), Math.round(y + h * 0.1), Math.round(w * 0.06), Math.round(h * 0.6), '#ffffff', { radius: 8, opacity: 35 }), id: ids[2] }]; };
const bodyWater = (fg = '#bfe9f7', water = '#3fc1e8', level = 0.4) => { const pose = POSES.stand, [h, n, p, le, lh, re, rh, lk, lf, rk, rf] = pose,
  L = (...pts) => `<polyline points="${pts.map(q => q.join(',')).join(' ')}"/>`;
  return svgURL(200, 300, `<defs><mask id="m"><g fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">${L(n, p)}${L(n, le, lh)}${L(n, re, rh)}${L(p, lk, lf)}${L(p, rk, rf)}</g>`
    + `<circle cx="${h[0]}" cy="${h[1]}" r="26" fill="#fff"/></mask></defs><g mask="url(#m)"><rect width="200" height="300" fill="${fg}"/>`
    + `<path d="M0 ${300 * level} C40 ${300 * level - 8} 60 ${300 * level + 8} 100 ${300 * level} S160 ${300 * level - 8} 200 ${300 * level} L200 300 L0 300 Z" fill="${water}"/></g>`); };

// ---- 5 · Sueño: a window at night ---------------------------------------------------------------------
const stars = (n, seed, area, color = '#fff6d5') => { const R = rng(seed);
  return Array.from({ length: n }, () => { const d = 3 + R() * 7; return shape(R() > 0.75 ? 'star' : 'ellipse', Math.round(area[0] + R() * area[2]), Math.round(area[1] + R() * area[3]), Math.round(d * (R() > 0.75 ? 2.4 : 1)), Math.round(d * (R() > 0.75 ? 2.4 : 1)), color, { opacity: Math.round(50 + R() * 50) }); }); };
const crescent = (x, y, d, bg, color = '#f6e7b0') => [glow(x - d * 0.6, y - d * 0.6, d * 2.2, '#4b3a8a', bg, 60), shape('ellipse', x, y, d, d, color), shape('ellipse', x + d * 0.3, y - d * 0.12, d * 0.9, d * 0.9, bg)];
const nightChat = (A1, A2) => svgURL(360, 720, `<rect width="360" height="720" fill="#14102a"/>`
  + `<text x="180" y="70" font-family="sans-serif" font-size="44" font-weight="300" fill="#e9e3ff" text-anchor="middle">23:47</text>`
  + `<text x="180" y="100" font-family="sans-serif" font-size="16" fill="#8f86b5" text-anchor="middle">martes</text>`
  + [['Grupo de clase', '¿Alguien ha hecho el ejercicio 4?', 140], ['Vídeos', 'Te recomendamos 12 vídeos nuevos', 240], ['Juego', '¡Tu energía está llena! Vuelve a jugar', 340], ['Grupo de clase', '37 mensajes nuevos', 440]]
    .map(([a, b, y]) => `<rect x="20" y="${y}" width="320" height="84" rx="16" fill="#241d47"/><circle cx="56" cy="${y + 42}" r="20" fill="${y % 200 ? A1 : A2}"/>`
      + `<text x="90" y="${y + 36}" font-family="sans-serif" font-size="18" font-weight="700" fill="#e9e3ff">${a}</text><text x="90" y="${y + 62}" font-family="sans-serif" font-size="15" fill="#a99bd0">${b}</text>`).join('')
  + `<rect x="120" y="680" width="120" height="6" rx="3" fill="#6b6390"/>`);

// ---- 6 · Baloncesto: a coach's tactics board in marker -----------------------------------------------
// Half a court from above (15 × 14 m at 40 px a metre), the hoop at the top.
const halfCourt = (ink = '#f4f4f2', sw = 4, extra = '') => svgURL(600, 560, `<g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round">`
  + '<rect x="2" y="2" width="596" height="556"/><rect x="202" y="2" width="196" height="232"/><circle cx="300" cy="232" r="72"/>'
  + '<path d="M36 2 L36 119.6 A270 270 0 0 0 564 119.6 L564 2"/><path d="M264 48 L336 48"/><circle cx="300" cy="63" r="9"/><path d="M228 558 A72 72 0 0 1 372 558"/></g>' + extra);
const ballSVG = (c = '#f07d1a', line = '#3a1d08') => svgURL(200, 200, `<defs><radialGradient id="b" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffb066"/><stop offset=".65" stop-color="${c}"/><stop offset="1" stop-color="#a84a08"/></radialGradient></defs>`
  + `<circle cx="100" cy="100" r="94" fill="url(#b)"/><g fill="none" stroke="${line}" stroke-width="5"><circle cx="100" cy="100" r="94"/><path d="M6 100 L194 100"/><path d="M100 6 L100 194"/>`
  + '<path d="M40 26 C70 70 70 130 40 174"/><path d="M160 26 C130 70 130 130 160 174"/></g>');

// ---- 7 · Atletismo: a running track from above -----------------------------------------------------------
// The stadium-shaped track (w × h) with n lanes, its infield and the lines.
const trackSVG = (w, h, n = 6, red = '#c4473a', grass = '#3f8f4a') => { const r = h / 2, lane = h * 0.035, inner = r - n * lane - 6;
  const st = (rr, cls) => `<path d="M${r} ${r - rr} L${w - r} ${r - rr} A${rr} ${rr} 0 0 1 ${w - r} ${r + rr} L${r} ${r + rr} A${rr} ${rr} 0 0 1 ${r} ${r - rr} Z" ${cls}/>`;
  return svgURL(w, h, st(r - 2, `fill="${red}"`) + st(inner, `fill="${grass}"`)
    + Array.from({ length: n + 1 }, (_, i) => st(inner + i * lane, 'fill="none" stroke="#ffffff" stroke-width="2.5"')).join('')
    + `<path d="M${w - r} ${r + inner} L${w - r} ${h - 2}" stroke="#ffffff" stroke-width="6"/>`
    + st(inner - 14, `fill="none" stroke="#5aa864" stroke-width="10"`)); };

// ---- 8 · Espalda: an anatomy plate in sepia ------------------------------------------------------------
// The spine from the side (220 × 600): 7 + 12 + 5 vertebrae on an S curve, the sacrum and the coccyx.
const SPINE_Y = { cerv: [40, 150], dors: [160, 400], lumb: [410, 520], sacr: [530, 585] };
const spineSVG = (ink = '#5a3e2b', fills = ['#e9d6b9', '#e2c9a5', '#d9bb92', '#cfae84']) => { const xs = y => 110 + 34 * Math.sin((y - 40) / 545 * Math.PI * 2 + 0.4);
  let s = ''; const v = (n, [a, b], fill, h0) => { const step = (b - a) / n; for (let i = 0; i < n; i++) { const y = a + i * step, x = xs(y + step / 2), w = h0 + (y - 40) / 545 * 34;
    s += `<rect x="${(x - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(step - 3).toFixed(1)}" rx="${(step / 3).toFixed(1)}" fill="${fill}" stroke="${ink}" stroke-width="2.2"/>`
      + `<path d="M${(x + w / 2).toFixed(1)} ${(y + step / 2).toFixed(1)} l${(14 + w * 0.2).toFixed(1)} ${(step * 0.3).toFixed(1)}" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`; } };
  v(7, SPINE_Y.cerv, fills[0], 30); v(12, SPINE_Y.dors, fills[1], 40); v(5, SPINE_Y.lumb, fills[2], 54);
  const y0 = SPINE_Y.sacr[0], x0 = xs(y0 + 20);
  s += `<path d="M${x0 - 34} ${y0} L${x0 + 34} ${y0} L${x0 + 8} ${y0 + 50} L${x0 - 14} ${y0 + 50} Z" fill="${fills[3]}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>`
    + `<path d="M${x0 - 4} ${y0 + 54} l-6 10 l-4 8" stroke="${ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  return svgURL(220, 600, s); };
const plateFrame = (ink = '#5a3e2b') => [shape('rect', 24, 24, 1232, 672, 'none', { stroke: ink, strokeWidth: 3 }), shape('rect', 34, 34, 1212, 652, 'none', { stroke: ink, strokeWidth: 1 })];
const hatch = (w, h, color = '#c9b08a') => svgURL(w, h, `<defs><pattern id="h" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 L0 10" stroke="${color}" stroke-width="1"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#h)"/>`);

// ---- 9 · Vuelta a la calma: ripples at dawn ------------------------------------------------------------
const ripples = (cx, cy, n, color, step = 70, op = 30) => Array.from({ length: n }, (_, i) => { const r = 60 + i * step;
  return shape('ellipse', cx - r, cy - r, 2 * r, 2 * r, 'none', { stroke: color, strokeWidth: 2, opacity: Math.max(6, op - i * 5) }); });

// ---- 10 · 60 minutos: a cork board with notes and pins ----------------------------------------------------
const corkSVG = (w = 1280, h = 720, seed = 4) => { const R = rng(seed); let s = `<rect width="${w}" height="${h}" fill="#c99a63"/>`;
  for (let i = 0; i < 900; i++) s += `<circle cx="${(R() * w).toFixed(0)}" cy="${(R() * h).toFixed(0)}" r="${(0.8 + R() * 2.4).toFixed(1)}" fill="${R() > 0.5 ? '#a8784a' : '#e0b98a'}" opacity=".8"/>`;
  return svgURL(w, h, s + `<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#7a5230" stroke-width="40"/>`); };
const pin = (x, y, c = '#d23a2a') => [shape('ellipse', x - 2, y + 4, 26, 26, '#000000', { opacity: 20 }), shape('ellipse', x - 4, y, 26, 26, c, { fill2: '#7a1010', gradType: 'radial' })];
// A sticky note with a pin (rotation in degrees).
const note = (html, x, y, w, h, bg, rot = 0, props = {}) => [card(html, x, y, w, h, bg, { radius: 4, shadow: true, rotation: rot, fontSize: 24, color: '#2b2118', ...props }), ...pin(x + w / 2 - 10, y - 6)];

export default {
  // ---------------------------------------------------------------------------------
  // 1 · Warming up: a sports hall's parquet, a robot that runs onto it, the muscle's
  // temperature, three phases, the joints from head to feet, an effort scale, a 10-minute circuit.
  edu_pe_warmup: { name: 'Calentar antes de jugar', cat: 'edu',
    summary: 'Parqué de polideportivo: robot 3D que corre, línea de temperatura, galones, articulaciones con sonido, cuenta atrás, ordenar y concurso',
    make: () => {
      const INK = '#2a1a10', OR = '#e4572e', CREAM = '#fff4ec', SOFT = '#7a5a44', LIGHT = '#fbf3e8', BLUE = '#1d5fa8', RED = '#c8372d', YEL = '#f3a712';
      const H = pairStacks('modern').heading;
      const court = (cx = 900) => `<circle cx="${cx}" cy="360" r="150" fill="none" stroke="${BLUE}" stroke-width="10"/><path d="M${cx} 0 L${cx} 720" stroke="#ffffff" stroke-width="8"/>`
        + `<path d="M0 694 L1280 694" stroke="${RED}" stroke-width="10"/><path d="M0 26 L1280 26" stroke="${RED}" stroke-width="10"/>`;
      const floor = parquet(1280, 720, 7, court());
      const stations = [['Trote y desplazamientos laterales', 'person-standing'], ['Skipping y talones al glúteo', 'activity'], ['Movilidad de la cabeza a los pies', 'refresh-cw'],
        ['Zancadas y sentadillas suaves', 'dumbbell'], ['Pases y botes con balón', 'volleyball']];
      const joints = [[165, 112, 'Cuello', 'Decir «sí» y «no» despacio, sin dar vueltas completas'], [222, 142, 'Hombros', 'Círculos hacia delante y hacia atrás'],
        [165, 290, 'Cadera', 'Círculos amplios y rodillas al pecho'], [210, 400, 'Rodillas', 'Flexiones suaves con los pies juntos'], [220, 492, 'Tobillos', 'Círculos y subir a puntillas']];
      const figSVG = svgURL(330, 520, `<g fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">`
        + '<path d="M165 100 L165 290"/><path d="M108 142 L222 142"/><path d="M108 142 L84 222 L72 300"/><path d="M222 142 L246 222 L258 300"/>'
        + '<path d="M165 290 L120 400 L110 495"/><path d="M165 290 L210 400 L220 495"/></g>'
        + `<circle cx="165" cy="58" r="40" fill="${INK}"/>`);
      const deck = build({ name: 'Calentar antes de jugar', palette: 'warm', fonts: 'modern', title: { size: 46, color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: '#d8a565', transition: 'fade', extra: [
          deco(floor),
          shape('custom', 0, 0, 660, 720, '#2b1512', { path: 'M0 0 L100 0 L80 100 L0 100 Z', opacity: 94 }),
          kicker('EDUCACIÓN FÍSICA · 1.º ESO', 70, 170, 500, YEL),
          text('Calentar<br>antes de jugar', 64, 212, 560, 200, { fontFamily: H, fontSize: 64, fontWeight: 800, color: CREAM, lineHeight: 1.08 }),
          shape('rect', 70, 430, 110, 8, OR), shape('rect', 188, 430, 40, 8, YEL),
          text('Diez minutos que preparan el cuerpo y la cabeza para el partido', 70, 458, 440, 100, { fontSize: 26, color: '#f0c9a8' }),
          withAnims(m3d('three-RobotExpressive', 660, 230, 280, 380, { view: 'side', walk: { clip: 'Running', end: 'Wave', endOnce: true, face: true } }),
            path([[280, 0]], { start: 'afterPrev', duration: 2200 }))],
          notes: 'El parqué es un dibujo SVG con las líneas del campo pintadas. Al llegar, el robot 3D sale corriendo por la pista y saluda: así empieza cualquier clase. Pregunta qué hacen ellos antes de un partido.' },
        { title: 'Por qué calentar', layout: 'titleOnly', bg: LIGHT, extra: [
          chartBlock({ x: 80, y: 165, w: 640, h: 470, chartType: 'line', color: OR, seriesName: 'Temperatura del músculo', grid: true, yMin: 36, yMax: 39,
            yTitle: 'Grados (°C)', xTitle: 'Minutos de calentamiento', data: series([['0', 36.6], ['2', 37], ['4', 37.5], ['6', 37.9], ['8', 38.2], ['10', 38.4], ['12', 38.5]]) }),
          ...([['heart-pulse', 'El corazón acelera poco a poco y llega más sangre a los músculos.'], ['thermometer', 'Un músculo caliente es más elástico y se contrae más rápido.'],
            ['brain', 'La cabeza entra en el juego: atención, reflejos y coordinación.']].flatMap(([ic, t], i) => [
            shape('rounded', 770, 180 + i * 150, 430, 130, '#ffffff', { radius: 16, stroke: '#ecd9c2', strokeWidth: 2 }),
            icon(ic, 794, 216 + i * 150, 56, [OR, RED, BLUE][i]),
            text(t, 870, 196 + i * 150, 310, 100, { fontSize: 21, color: INK, vAlign: 'middle' })]).map((b, k) => withAnims(b, A('fade-left', { start: k % 3 ? 'withPrev' : 'click' }))))],
          notes: 'Curva orientativa: el músculo sube uno o dos grados en los primeros minutos y luego se estabiliza. Clic: tres razones, una tras otra. Calentar reduce el riesgo de tirones y mejora el rendimiento.' },
        { title: 'Tres fases, de menos a más', layout: 'titleOnly', bg: '#f3e3cc', extra: [
          dg('chevrons', 'Activación\n  5 minutos de trote suave y desplazamientos\nMovilidad\n  Articulaciones de arriba abajo\nEspecífico\n  Los gestos del deporte que toca', 70, 170, 1140, 260,
            { oneByOne: true, colors: 'colorful', fontScale: 1.3 }),
          shape('custom', 90, 470, 1100, 110, YEL, { path: 'M0 100 L100 0 L100 100 Z', fill2: RED, gradAngle: 0 }),
          text('Intensidad suave', 90, 590, 300, 40, { fontSize: 22, color: SOFT, fontWeight: 700 }),
          text('Casi a ritmo de juego', 890, 590, 300, 40, { fontSize: 22, color: RED, fontWeight: 700, textAlign: 'right' }),
          text('El calentamiento no cansa: prepara. Si te ahogas, vas demasiado deprisa.', 90, 640, 1100, 40, { fontSize: 22, fontStyle: 'italic', color: SOFT, textAlign: 'center' })],
          notes: 'Galones uno a uno: cada clic añade una fase. La rampa de color recuerda que la intensidad sube poco a poco, sin llegar nunca al máximo.' },
        { title: 'Movilidad: de la cabeza a los pies', layout: 'titleOnly', bg: LIGHT, extra: [
          shape('ellipse', 90, 600, 390, 60, '#ecd9c2'),
          img(figSVG, 120, 140, 330, 520, { alt: 'Figura humana con las articulaciones marcadas' }),
          ...joints.flatMap(([x, y, n, d], i) => [
            withAnims(shape('ellipse', 120 + x - 22, 140 + y * 1 - 22, 44, 44, OR, { stroke: '#ffffff', strokeWidth: 4 }), A('zoom-in', { start: 'click', duration: 350, sound: 'pop' })),
            withAnims(text(String(i + 1), 120 + x - 22, 140 + y - 22, 44, 44, { fontSize: 22, fontWeight: 800, color: '#ffffff', textAlign: 'center', vAlign: 'middle' }), A('zoom-in', { start: 'withPrev', duration: 350 })),
            withAnims(text(`<b style="color:${OR}">${i + 1} · ${n}</b><br>${d}`, 560, 160 + i * 98, 640, 90, { fontSize: 22, color: INK, lineHeight: 1.3 }), A('fade-left', { start: 'withPrev' }))])],
          notes: 'Cada clic marca una articulación (con un «pop») y su ejercicio. Diez repeticiones lentas de cada uno, sin tirones. Ojo con el cuello: movimientos suaves, nunca círculos completos rápidos.' },
        { title: 'Sube la intensidad poco a poco', layout: 'titleOnly', bg: '#f3e3cc', extra: [
          text('Escala de esfuerzo: ¿cuánto te cuesta, del 0 al 10?', 90, 150, 1100, 40, { fontSize: 24, color: SOFT }),
          ...Array.from({ length: 11 }, (_, i) => { const c = ['#4caf50', '#6dbb4a', '#8fc744', '#b5cf3c', '#d9d334', '#f3c12a', '#f3a712', '#ee8a1f', '#e66a24', '#da4a27', '#c8372d'][i];
            return [shape('rounded', 90 + i * 100, 300, 92, 110, c, { radius: 10 }), text(String(i), 90 + i * 100, 300, 92, 110, { fontSize: 44, fontWeight: 800, color: '#ffffff', textAlign: 'center', vAlign: 'middle', fontFamily: H })]; }).flat(),
          ...[[0, 'Reposo'], [3, 'Suave'], [5, 'Moderado'], [7, 'Intenso'], [10, 'Máximo']].map(([i, t]) => text(t, 66 + i * 100, 420, 140, 34, { fontSize: 20, color: INK, textAlign: 'center', fontWeight: 700 })),
          ...[[2.5, 'Activación'], [4, 'Movilidad'], [6, 'Específico']].flatMap(([i, t], k) => together([
            shape('triangle', 116 + i * 100, 250, 40, 34, INK, { rotation: 180 }),
            text(t, 36 + i * 100, 200, 200, 44, { fontSize: 22, fontWeight: 800, color: INK, textAlign: 'center' })], 'fade-down')),
          card('<b>Nunca al 10</b> en un calentamiento: lo guardamos para el partido.', 90, 500, 1100, 110, '#ffffff', { fontSize: 26, color: INK, textAlign: 'center', vAlign: 'middle', stroke: '#ecd9c2' })],
          notes: 'Escala de esfuerzo percibido de 0 a 10. Con cada clic aparece una fase sobre la escala: el calentamiento acaba en un 6, nunca en el máximo.' },
        { layout: 'blank', bg: '#d8a565', extra: [
          deco(floor),
          shape('rect', 0, 40, 1280, 96, '#2b1512', { opacity: 92 }),
          text('Circuito de calentamiento · 10 minutos', 70, 52, 1140, 72, { fontFamily: H, fontSize: 40, fontWeight: 800, color: CREAM, vAlign: 'middle' }),
          ...together(stations.flatMap(([t, ic], i) => [
            shape('rounded', 70, 170 + i * 98, 620, 84, '#ffffff', { radius: 42, shadow: true }),
            shape('ellipse', 80, 178 + i * 98, 68, 68, [OR, YEL, BLUE, RED, '#4c9a6a'][i]),
            icon(ic, 96, 194 + i * 98, 36, '#ffffff'),
            text(`<b>${i + 1}.</b> ${t} <span style="color:${SOFT}">· 2 min</span>`, 166, 178 + i * 98, 510, 68, { fontSize: 22, color: INK, vAlign: 'middle' })]), 'fade-right', 'click'),
          shape('ellipse', 770, 170, 420, 420, '#2b1512', { opacity: 90 }),
          timer(600, 810, 210, 340, { color: YEL, endText: '¡A jugar!' }),
          text('Cambio de estación cada 2 minutos', 760, 610, 440, 40, { fontSize: 22, color: INK, textAlign: 'center', fontWeight: 700, bg: '#fff4ec', radius: 20 })],
          notes: 'Las cinco estaciones aparecen juntas con un clic. La cuenta atrás de 10 minutos empieza sola: pon el balón en la última estación para enlazar con el juego.' },
        { layout: 'blank', bg: '#2b1512', extra: [
          deco(parquet(1280, 60, 3), 0, 0, 1280, 60),
          pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena el calentamiento, de lo más suave a lo más intenso', x: 80, y: 90, w: 1120, h: 590,
            options: ['Trote suave', 'Movilidad de cuello y hombros', 'Movilidad de cadera, rodillas y tobillos', 'Skipping y zancadas', 'Sprints cortos y gestos con balón'] })],
          notes: 'Actividad de ordenar desde el móvil: cada uno coloca los pasos y Revela corrige. El orden correcto va de lo general a lo específico.' },
        { layout: 'blank', bg: '#2b1512', extra: [
          deco(parquet(1280, 60, 4), 0, 660, 1280, 60),
          pollBlock({ kind: 'quiz', question: '¿Qué conviene más justo antes de un partido?', x: 80, y: 50, w: 1120, h: 590, fontSize: 30, time: 20, correct: [1],
            options: ['Estirar en frío un minuto cada músculo', 'Movilidad dinámica y gestos del deporte', 'Nada: es mejor guardar fuerzas', 'Un sprint a tope nada más llegar'] })],
          notes: 'Concurso con tiempo. Respuesta: movilidad dinámica. Los estiramientos largos y quietos se dejan para la vuelta a la calma.' },
        { layout: 'section', bg: '#d8a565', title: '¡A la pista!', subtitle: 'Calentar no es perder tiempo: es empezar el partido', transition: 'zoom',
          back: [deco(parquet(1280, 720, 11, `<circle cx="640" cy="360" r="230" fill="none" stroke="${BLUE}" stroke-width="12"/><circle cx="640" cy="360" r="60" fill="${BLUE}" opacity=".25"/>`)),
            shape('rounded', 190, 200, 900, 320, '#fff4ec', { radius: 160, opacity: 88 })],
          notes: 'Cierre con transición «Zoom» sobre el círculo central. Termina con la pregunta: ¿quién dirige mañana el calentamiento?' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 80, fontWeight: 800, color: INK });
        if (b.ph === 'subtitle') Object.assign(b, { color: '#7a3a18', fontSize: 28 }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 2 · Heart rate: a monitor with its grid, a trace that draws itself, taking the pulse
  // with a 15-second countdown, the estimated maximum, zones in a table, a class minute by minute.
  edu_pe_heart: { name: 'El corazón en marcha', cat: 'edu',
    summary: 'Monitor cardiaco: electro que se traza solo, cuenta atrás del pulso, ecuación, zonas con fórmulas, área, móvil con app y concurso',
    make: () => {
      const SCR = '#04110c', G = '#39ff88', AMB = '#ffb547', RED = '#ff4d6d', FG = '#d9fbe8', DIM = '#7fb39a', PANEL = '#0a2318';
      const M = FF.mono, grid = monitorGrid(SCR);
      const readout = (label, value, unit, color, x, y, w = 250) => [shape('rounded', x, y, w, 130, PANEL, { radius: 10, stroke: color, strokeWidth: 2 }),
        text(label, x + 18, y + 10, w - 36, 30, { fontSize: 17, color: DIM, fontFamily: M, letterSpacing: 2 }),
        text(`<span style="font-size:54px;font-weight:700;color:${color}">${value}</span> <span style="color:${DIM}">${unit}</span>`, x + 18, y + 44, w - 36, 74, { fontSize: 20, fontFamily: M, color: FG, vAlign: 'middle' })];
      const deck = build({ name: 'El corazón en marcha', palette: 'midnight', fonts: 'tech', title: { size: 44, color: G }, body: { color: FG } }, [
        { layout: 'blank', bg: SCR, transition: 'fade', extra: [
          deco(grid), glow(500, -200, 700, '#0f4a2c', SCR, 50),
          kicker('MONITOR · EDUCACIÓN FÍSICA', 70, 60, 600, DIM, 18, { fontFamily: M }),
          text('El corazón en marcha', 64, 96, 900, 110, { fontSize: 76, fontWeight: 700, color: FG }),
          text('Qué le pasa al pulso cuando juegas, corres y descansas', 70, 200, 900, 44, { fontSize: 26, color: DIM }),
          at(stroke(ecg(6), 0, 290, 1280, 200, G, 4), 'draw', { start: 'afterPrev', duration: 3200 }),
          ...readout('FC', '72', 'lpm', G, 70, 530), ...readout('ESTADO', 'Reposo', '', AMB, 345, 530, 300), ...readout('SATURACIÓN', '98', '%', '#7aa2f7', 670, 530),
          withAnims(icon('heart', 1060, 540, 110, RED), A('pulse', { start: 'afterPrev', duration: 700 }), A('pulse', { start: 'afterPrev', duration: 700 }))],
          notes: 'Al llegar, el electrocardiograma se traza solo y el corazón late dos veces. Las cifras son las de un alumno sentado en reposo. Pregunta: ¿cuántas veces late tu corazón al día? (unas 100 000).' },
        { title: 'Tómate el pulso', layout: 'titleOnly', bg: SCR, back: [deco(grid, 0, 0, 1280, 720, { opacity: 50 })], extra: [
          ...[['Muñeca', 'Dos dedos (índice y corazón) en el lado del pulgar, bajo la muñeca.', 'hand-heart'],
            ['Cuello', 'Dos dedos al lado de la nuez, apretando muy suave. Nunca los dos lados a la vez.', 'heart-pulse']].flatMap(([t, d, ic], i) => [
            shape('rounded', 70, 170 + i * 190, 560, 170, PANEL, { radius: 14, stroke: '#155238', strokeWidth: 2 }),
            icon(ic, 96, 200 + i * 190, 60, i ? RED : G),
            text(`<b style="color:${FG};font-size:28px">${t}</b><br>${d}`, 180, 186 + i * 190, 430, 140, { fontSize: 21, color: DIM, vAlign: 'middle' })]),
          text('Nunca con el pulgar: tiene su propio pulso y confunde.', 70, 560, 560, 70, { fontSize: 20, color: AMB }),
          mathBlock({ x: 680, y: 170, w: 520, h: 90, fontSize: 32, color: FG, latex: '\\text{lpm} = \\text{latidos en } 15\\text{ s} \\times 4' }),
          timer(15, 800, 280, 280, { color: G, endText: '¡Para!', auto: false }),
          text('Pulsa la cuenta atrás y cuenta en silencio', 680, 580, 520, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
          notes: 'Practicad juntos: la cuenta atrás de 15 segundos no empieza sola; púlsala cuando todos tengan los dedos en su sitio. Multiplica por cuatro: en reposo saldrá entre 60 y 100.' },
        { title: 'Tu frecuencia máxima, estimada', layout: 'titleOnly', bg: SCR, back: [deco(grid, 0, 0, 1280, 720, { opacity: 50 })], extra: [
          mathBlock({ x: 70, y: 170, w: 500, h: 110, fontSize: 40, color: G, latex: 'FC_{\\max} \\approx 220 - \\text{edad}' }),
          text('Una regla sencilla que da una media: cada corazón es distinto y puede variar diez latidos o más arriba o abajo.', 80, 300, 470, 140, { fontSize: 21, color: DIM }),
          card(`<span style="color:${AMB}">Es orientativa:</span> nadie tiene que llegar a su máximo en clase.`, 70, 470, 490, 130, PANEL, { fontSize: 22, color: FG, radius: 12 }),
          tableBlock({ x: 610, y: 170, w: 600, h: 430, fontSize: 21, header: true, headBg: '#0f3a28', headFg: G, stroke: '#155238', color: FG, banded: true, band: G, bandAlpha: 0.06,
            rows: [['Zona (14 años)', '% del máximo', 'Latidos/min'], ['Máxima estimada', '100 %', '=220-14'], ['Calentamiento y calma', '50 %', '=REDONDEAR(C2*0,5;0)'],
              ['Moderada', '65 %', '=REDONDEAR(C2*0,65;0)'], ['Vigorosa', '80 %', '=REDONDEAR(C2*0,8;0)'], ['Muy intensa, poco rato', '90 %', '=REDONDEAR(C2*0,9;0)']], colW: [5, 3, 3] })],
          notes: 'La tabla calcula sola: la primera fila resta la edad a 220 y las demás multiplican ese máximo por su porcentaje. Cambia el 14 por tu edad y mira cómo se mueve todo.' },
        { title: 'Una clase de EF, minuto a minuto', layout: 'titleOnly', bg: SCR, back: [deco(grid, 0, 0, 1280, 720, { opacity: 50 })], extra: [
          chartBlock({ x: 70, y: 160, w: 1140, h: 440, chartType: 'area', color: RED, seriesName: 'Latidos por minuto', grid: true, labelColor: DIM, yMin: 60, yMax: 200,
            xTitle: 'Minuto de la clase', data: series([['0', 78], ['5', 112], ['10', 128], ['15', 146], ['20', 168], ['25', 150], ['30', 172], ['35', 160], ['40', 176], ['45', 118], ['50', 92]]) }),
          ...chain([['Calentamiento', 150], ['Partido', 600], ['Vuelta a la calma', 1000]].map(([t, x]) => text(t, x, 612, 220, 40, { fontSize: 20, color: AMB, textAlign: 'center', fontFamily: M })), 'fade-up', 'click')],
          notes: 'Datos inventados de un pulsómetro durante una clase de 50 minutos. Clic: las tres partes de la clase. Fíjate en lo rápido que baja el pulso al final: es señal de buena forma.' },
        { title: '¿Moderada o vigorosa? La prueba del habla', layout: 'titleOnly', bg: SCR, extra: [
          ...([['Suave', 'Puedes cantar una canción.', 'music', G], ['Moderada', 'Puedes hablar, pero no cantar.', 'message-circle', AMB], ['Vigorosa', 'Solo dices unas palabras seguidas.', 'wind', RED]].flatMap(([t, d, ic, c], i) => [
            shape('rounded', 70 + i * 385, 180, 355, 380, PANEL, { radius: 18, stroke: c, strokeWidth: 3 }),
            shape('ellipse', 182 + i * 385, 215, 130, 130, c, { opacity: 18 }), icon(ic, 212 + i * 385, 245, 70, c),
            text(`<div style="font-size:36px;font-weight:700;color:${c}">${t}</div><div style="margin-top:10px">${d}</div>`, 95 + i * 385, 370, 305, 170, { fontSize: 24, color: FG, textAlign: 'center' })]).map((b, k) => withAnims(b, A('flip', { start: k % 4 ? 'withPrev' : 'click', duration: 600 })))),
          text('Sin aparatos: tu propia voz es un buen pulsómetro.', 70, 600, 1140, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
          notes: 'Cada clic gira una tarjeta. La prueba del habla funciona sin relojes ni aplicaciones y es muy fiable para saber en qué zona estás.' },
        { title: 'Lo que mide un pulsómetro', layout: 'titleOnly', bg: SCR, back: [deco(grid, 0, 0, 1280, 720, { opacity: 50 })], extra: [
          img(pulseApp(G, RED), 120, 150, 250, 500, { alt: 'Aplicación de pulsómetro con 148 latidos por minuto en zona vigorosa', fit: 'cover', device: 'phone' }),
          ...([['activity', 'Los relojes leen el pulso con luz en la muñeca: son orientativos.'], ['heart-pulse', 'Las bandas de pecho son más exactas al cambiar de ritmo.'],
            ['triangle-alert', 'Mareo, dolor en el pecho o palpitaciones raras: para y avisa al profesor.']].flatMap(([ic, t], i) => [
            icon(ic, 470, 200 + i * 140, 52, i === 2 ? AMB : G), text(t, 545, 186 + i * 140, 640, 100, { fontSize: 24, color: FG, vAlign: 'middle' })]).map((b, k) => withAnims(b, A('fade-left', { start: k % 2 ? 'withPrev' : 'click' }))))],
          notes: 'La pantalla del móvil es una aplicación inventada. Lo importante es el tercer punto: ante cualquier síntoma raro se para y se avisa, sin excepciones.' },
        { layout: 'blank', bg: SCR, extra: [
          pollBlock({ kind: 'quiz', question: 'Tienes 14 años: ¿cuál es tu frecuencia máxima estimada?', x: 80, y: 60, w: 1120, h: 600, fontSize: 32, time: 20, correct: [1],
            options: ['186 latidos/min', '206 latidos/min', '214 latidos/min', '234 latidos/min'] })],
          notes: 'Concurso con tiempo: 220 menos 14 da 206. Recuerda que es una estimación, no un objetivo.' },
        { layout: 'blank', bg: SCR, transition: 'fade', extra: [
          deco(grid), glow(340, 60, 600, '#4a0f1f', SCR, 70),
          stroke(ecg(4), 0, 300, 1280, 160, '#155238', 3),
          at(icon('heart', 540, 170, 200, RED), 'zoom-in', { start: 'afterPrev', duration: 700, sound: 'chime' }),
          at(text('Cuida tu motor', 140, 420, 1000, 130, { fontSize: 96, fontWeight: 700, textAlign: 'center', wordart: 'neon', wordartColor: G }), 'fade-up', { start: 'afterPrev' }),
          text('Muévete cada día: el corazón se entrena como cualquier músculo', 140, 570, 1000, 50, { fontSize: 26, color: DIM, textAlign: 'center' })],
          notes: 'Text Art «Neón» con color propio. Cierre: un corazón entrenado late más despacio en reposo porque bombea más sangre en cada latido.' },
      ]);
      return finish(deck);
    } },
  // ---------------------------------------------------------------------------------
  // 3 · The plate: a picnic tablecloth, the plate from above served quarter by quarter,
  // where the energy comes from, before / during / after, two breakfasts, myths that flip.
  edu_pe_nutrition: { name: 'El plato del deportista', cat: 'edu',
    summary: 'Mantel de cuadros: plato que se sirve por partes, dona, aguacate 3D, desayunos con fórmulas, mitos que giran, unir y nube de palabras',
    make: () => {
      const RED = '#d94f3d', CREAM = '#fffaf0', INK = '#3b3228', SOFT = '#7a6a58', CARD = '#ffffff';
      const H = pairStacks('friendly').heading, cloth = gingham(RED), soft = gingham('#e9a091', '#fffaf0', 60);
      const parts = plateParts(700, 150, 470);
      const deck = build({ name: 'El plato del deportista', palette: 'paper', fonts: 'friendly', title: { size: 44, color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          deco(cloth),
          shape('rounded', 60, 140, 590, 420, CREAM, { radius: 30, shadow: true }),
          kicker('EF Y SALUD · 2.º ESO', 100, 170, 500, RED),
          text('El plato del deportista', 96, 210, 520, 200, { fontFamily: H, fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.08 }),
          text('Comer bien para jugar, crecer y recuperarse', 100, 430, 500, 80, { fontSize: 26, color: SOFT }),
          ...cutlery(668, 210, 330), ...plateBase(760, 120, 460),
          ...chain(plateParts(760, 120, 460, false).flat(), 'zoom-in', 'afterPrev', { duration: 450 }),
          shape('ellipse', 1150, 470, 110, 110, '#bfe6f5', { stroke: '#ffffff', strokeWidth: 6, opacity: 90 })],
          notes: 'Portada: el mantel es un patrón SVG y el plato se sirve solo, por partes, al llegar. El círculo azul es el vaso de agua.' },
        { layout: 'blank', bg: CREAM, extra: [
          deco(soft, 0, 0, 1280, 720, { opacity: 50 }),
          shape('rounded', 50, 40, 600, 640, CARD, { radius: 26, shadow: true }),
          text('El plato, por partes', 90, 70, 540, 70, { fontFamily: H, fontSize: 38, fontWeight: 800, color: INK }),
          ...plateBase(700, 150, 470),
          ...[['La mitad: verdura y fruta', 'Cuantos más colores, mejor. La patata no cuenta como verdura.', PLATE.veg],
            ['Un cuarto: cereales integrales', 'Pan, arroz, pasta o avena: la energía que dura.', PLATE.grain],
            ['Un cuarto: proteína', 'Legumbres, huevos, pescado, carne blanca o frutos secos.', PLATE.prot],
            ['Para beber: agua', 'Y aceite de oliva para cocinar y aliñar.', '#3a86c8']].flatMap(([t, d, c], i) => [
            ...together([shape('ellipse', 90, 172 + i * 120, 26, 26, c), text(`<b style="color:${c}">${t}</b><br>${d}`, 132, 160 + i * 120, 490, 104, { fontSize: 21, color: INK })], 'fade-right', 'click'),
            ...together(i < 3 ? parts[i] : [shape('ellipse', 1120, 520, 120, 120, '#bfe6f5', { stroke: '#ffffff', strokeWidth: 6 })], 'zoom-in', 'withPrev', { duration: 450 })])],
          notes: 'Cada clic sirve una parte del plato a la vez que su explicación. Es el modelo del «plato saludable»: sirve para la comida y para la cena.' },
        { title: '¿De dónde sale la energía?', layout: 'titleOnly', bg: CREAM, extra: [
          shape('rect', 0, 690, 1280, 30, RED, { opacity: 60 }),
          chartBlock({ x: 70, y: 160, w: 560, h: 480, chartType: 'doughnut', data: slices([['Hidratos de carbono', 52], ['Grasas', 30], ['Proteínas', 18]], [PLATE.grain, '#8b9a3c', PLATE.prot]) }),
          ...chain([['Hidratos', 'La gasolina: pan, pasta, arroz, legumbres y fruta.', PLATE.grain, 'flame'], ['Grasas', 'Reserva de energía: mejor aceite de oliva y frutos secos.', '#8b9a3c', 'droplet'],
            ['Proteínas', 'Reparan y construyen el músculo después del ejercicio.', PLATE.prot, 'dumbbell']].map(([t, d, c, ic], i) =>
            card(`<b style="color:${i ? c : '#a8681a'};font-size:28px">${t}</b><br>${d}`, 680, 170 + i * 155, 520, 135, CARD, { fontSize: 22, color: INK, radius: 18, stroke: '#eadfcd', pad: [20, 24, 20, 96] })), 'fade-left', 'click'),
          ...[0, 1, 2].map(i => icon(['flame', 'droplet', 'dumbbell'][i], 706, 210 + i * 155, 48, [PLATE.grain, '#8b9a3c', PLATE.prot][i]))],
          notes: 'Reparto orientativo de la energía del día para una persona joven y activa: la mitad o algo más de hidratos, un tercio de grasas y el resto de proteínas. Clic: qué hace cada uno.' },
        { title: 'Antes, durante y después', layout: 'titleOnly', bg: CREAM, extra: [
          shape('rounded', 90, 360, 780, 10, '#eadfcd', { radius: 5 }),
          ...chain([['2-3 h antes', 'Comida normal y ligera: pasta con verduras, por ejemplo.', 'utensils'], ['30-60 min antes', 'Algo pequeño: una fruta o una tostada.', 'apple'],
            ['Durante', 'Si dura menos de una hora: solo agua.', 'droplet'], ['Después', 'Fruta y yogur, o un bocadillo, y más agua.', 'carrot']].flatMap(([t, d, ic], i) => [
            shape('ellipse', 92 + i * 220, 320, 90, 90, [PLATE.grain, PLATE.veg, '#3a86c8', PLATE.prot][i], { stroke: CREAM, strokeWidth: 6 }), icon(ic, 115 + i * 220, 343, 44, '#ffffff'),
            text(`<b>${t}</b><br>${d}`, 62 + i * 220, 430, 200, 170, { fontSize: 20, color: INK, textAlign: 'center' })]).map((b, k) => withAnims(b, A('fade-up', { start: k % 3 ? 'withPrev' : 'click' })))),
          m3d('kh-Avocado', 960, 160, 260, 360, { autoRotate: true, view: 'three' }),
          text('Tostada con aguacate: buena merienda de después.', 960, 530, 260, 90, { fontSize: 19, color: SOFT, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Clic a clic, los cuatro momentos. El aguacate 3D gira solo: grasa buena para la merienda de recuperación. Lo importante es comer variado cada día, no un alimento milagro.' },
        { title: 'Dos desayunos frente a frente', layout: 'titleOnly', bg: CREAM, extra: [
          tableBlock({ x: 70, y: 160, w: 740, h: 400, fontSize: 21, header: true, headBg: INK, headFg: CREAM, stroke: '#eadfcd', banded: true, band: RED, bandAlpha: 0.07, color: INK,
            rows: [['Desayuno A', 'Azúcar libre (g)', 'Desayuno B', 'Azúcar libre (g)'], ['Bollo industrial', '15', 'Tostada integral con tomate y aceite', '1'],
              ['Néctar de frutas (200 ml)', '20', 'Una pieza de fruta', '0'], ['Cacao soluble azucarado', '12', 'Vaso de leche', '0'],
              ['<b>Total</b>', '=SUMA(ARRIBA)', '<b>Total</b>', '=SUMA(ARRIBA)']], colW: [4, 2, 4, 2] }),
          card(`<div style="font-family:${H};font-size:76px;font-weight:800;color:${RED};line-height:1">25 g</div><div style="margin-top:8px">de azúcar libre al día es un buen límite: el desayuno A casi lo dobla.</div>`,
            850, 160, 360, 260, CARD, { fontSize: 22, color: INK, radius: 20, stroke: '#eadfcd', textAlign: 'center', vAlign: 'middle' }),
          text('Cantidades aproximadas. El azúcar de la fruta entera y de la leche no cuenta como «libre».', 70, 590, 1140, 60, { fontSize: 19, color: SOFT, fontStyle: 'italic' })],
          notes: 'La fila de totales suma sola. La recomendación es que el azúcar libre (el añadido y el de los zumos) sea menos del 10 % de la energía, y mejor por debajo del 5 %: unos 25 gramos.' },
        { title: 'Mito o realidad', layout: 'titleOnly', bg: CREAM, extra: [
          deco(gingham('#e9a091', '#fffaf0', 60, 1280, 80), 0, 640, 1280, 80, { opacity: 60 }),
          ...[['Para la clase de EF hacen falta bebidas para deportistas.', 'Mito', 'Con menos de una hora de ejercicio, el agua es suficiente.', RED],
            ['Para ganar músculo hay que tomar batidos de proteína.', 'Mito', 'Con una dieta variada y entrenando ya tienes toda la que necesitas.', RED],
            ['Desayunar ayuda a rendir por la mañana.', 'Realidad', 'Llegar a clase con energía mejora la atención y el ejercicio.', PLATE.veg]].flatMap(([q, v, a, c], i) => [
            card(`<div style="font-size:52px;line-height:1">?</div><div style="margin-top:12px">${q}</div>`, 70 + i * 385, 170, 355, 420, CARD, { fontSize: 24, color: INK, radius: 22, textAlign: 'center', vAlign: 'middle', stroke: '#eadfcd' }),
            at(card(`<div style="font-family:${H};font-size:44px;font-weight:800">${v}</div><div style="margin-top:14px">${a}</div>`, 70 + i * 385, 170, 355, 420, c, { fontSize: 24, color: '#ffffff', radius: 22, textAlign: 'center', vAlign: 'middle' }),
              'flip', { duration: 700, ...(i === 0 && { sound: 'pop' }) })])],
          notes: 'Lee cada frase y deja que voten a mano alzada. Cada clic gira la tarjeta y da la respuesta.' },
        { layout: 'blank', bg: CREAM, extra: [
          deco(gingham(RED, '#fffaf0', 80, 1280, 40), 0, 0, 1280, 40),
          pollBlock({ kind: 'match', question: 'Une cada alimento con lo que más aporta', fontSize: 30, x: 70, y: 70, w: 1140, h: 610,
            options: ['Arroz = Hidratos de carbono', 'Lentejas = Proteína y fibra', 'Aceite de oliva = Grasa saludable', 'Naranja = Vitamina C', 'Yogur = Calcio'] })],
          notes: 'Actividad «Unir parejas» desde el móvil, con nota. Al terminar, un clic muestra las soluciones.' },
        { layout: 'blank', bg: CREAM, extra: [
          deco(gingham(RED, '#fffaf0', 80, 1280, 40), 0, 680, 1280, 40),
          pollBlock({ kind: 'word', question: '¿Qué merienda te da energía para entrenar?', options: [], fontSize: 34, x: 70, y: 50, w: 1140, h: 600 })],
          notes: 'Nube de palabras: cada uno escribe su merienda. Comentad las que más se repiten y si encajan en el plato.' },
        { layout: 'section', bg: CREAM, title: 'Come de colores', subtitle: 'Cuantos más colores en el plato, más nutrientes', transition: 'zoom',
          back: [deco(cloth), shape('rounded', 190, 200, 900, 320, CREAM, { radius: 160, opacity: 94 })],
          notes: 'Cierre: reto para esta semana, contar cuántos colores distintos hay en cada comida.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 76, fontWeight: 800, color: RED });
        if (b.ph === 'subtitle') Object.assign(b, { color: INK, fontSize: 28 }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 4 · Water: bubbles that rise past a 3D bottle, a body that is 60 % water, the sweat
  // lost per hour, three glasses and one that fills with Transform, a colour scale, gaps.
  edu_pe_hydration: { name: 'Bebe antes de tener sed', cat: 'edu',
    summary: 'Agua y burbujas: botella 3D, cuerpo que se llena, barras del sudor, vaso con Transformar, escala de color y rellenar huecos',
    make: () => {
      const DEEP = '#08243a', MID = '#0f4c75', AQUA = '#3fc1e8', FOAM = '#bfe9f7', LIGHT = '#eaf7fc', INK = '#0b2236', YEL = '#f5a623', DIM = '#8fbfd8';
      const sea = () => shape('rect', 0, 0, 1280, 720, MID, { fill2: DEEP, gradAngle: 90 });
      const bubbles = (n, seed, area) => { const R = rng(seed);
        return Array.from({ length: n }, (_, i) => { const d = Math.round(14 + R() * 40);
          return withAnims(shape('ellipse', Math.round(area[0] + R() * area[2]), Math.round(area[1] + R() * area[3]), d, d, '#ffffff', { opacity: 18, stroke: FOAM, strokeWidth: 2 }),
            path([[Math.round(R() * 40 - 20), -Math.round(160 + R() * 220)]], { start: i ? 'withPrev' : 'afterPrev', duration: Math.round(2600 + R() * 2400), delay: Math.round(R() * 800) })); }); };
      const GL = [uid(), uid(), uid()];
      const deck = build({ name: 'Bebe antes de tener sed', palette: 'ocean', fonts: 'clean', title: { size: 44, color: FOAM }, body: { color: '#f2f6fa' } }, [
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          sea(), glow(760, 60, 640, '#1b8fc0', MID, 45),
          ...bubbles(14, 3, [700, 380, 520, 320]),
          kicker('EDUCACIÓN FÍSICA · HIDRATACIÓN', 80, 190, 640, AQUA),
          text('Bebe antes<br>de tener sed', 74, 230, 640, 230, { fontSize: 82, fontWeight: 800, color: '#ffffff', lineHeight: 1.05 }),
          text('El agua: el mejor compañero de entrenamiento', 80, 470, 600, 50, { fontSize: 26, color: DIM }),
          m3d('kh-WaterBottle', 820, 90, 360, 560, { autoRotate: true, view: 'front' })],
          notes: 'Al llegar suben las burbujas (trayectorias) alrededor de la botella 3D, que gira sola. Pregunta: ¿quién ha traído hoy su botella?' },
        { layout: 'blank', bg: LIGHT, extra: [
          shape('rect', 0, 0, 1280, 120, MID), text('Somos agua', 80, 24, 900, 72, { fontSize: 44, fontWeight: 800, color: '#ffffff', vAlign: 'middle' }),
          img(bodyWater(FOAM, AQUA, 0.4), 120, 160, 340, 510, { alt: 'Silueta humana llena de agua hasta algo más de la mitad' }),
          at(text('60 %', 520, 170, 640, 210, { fontSize: 190, fontWeight: 800, wordart: 'fill', wordartColor: '#1b8fc0', lineHeight: 1 }), 'zoom-in', { start: 'afterPrev', duration: 800 }),
          text('Más de la mitad de tu peso es agua: en la sangre, en los músculos y en el cerebro.', 530, 400, 640, 100, { fontSize: 28, color: INK }),
          ...chain([['droplet', 'Lleva oxígeno y alimento'], ['thermometer', 'Enfría el cuerpo con el sudor'], ['activity', 'Mantiene las articulaciones a punto']].map(([ic, t], i) =>
            text(`<span style="color:${MID}">●</span> ${t}`, 530 + i * 0, 520 + i * 46, 640, 44, { fontSize: 23, color: INK })), 'fade-left', 'click')],
          notes: 'La silueta se llena hasta algo más de la mitad: en un adulto el agua es cerca del 60 % del peso; en niños, algo más. Clic: para qué sirve.' },
        { title: 'Lo que se va con el sudor', layout: 'titleOnly', bg: DEEP, extra: [
          chartBlock({ x: 70, y: 160, w: 720, h: 480, chartType: 'bar', color: AQUA, seriesName: 'Litros por hora', labelColor: DIM, dataLabels: true, yMin: 0, yMax: 1.4, yTitle: 'Litros por hora',
            data: [{ label: 'Paseo', value: 0.2 }, { label: 'Clase de EF', value: 0.5 }, { label: 'Partido en primavera', value: 0.8 }, { label: 'Partido en verano', value: 1.2, color: YEL }] }),
          card(`<div style="font-size:72px;font-weight:800;color:${YEL};line-height:1">2 %</div><div style="margin-top:10px">Perder solo un 2 % de tu peso en agua ya se nota: cansancio, dolor de cabeza y peor puntería.</div>`,
            830, 180, 380, 320, '#0f3a5a', { fontSize: 23, color: '#f2f6fa', radius: 18 }),
          text('Cifras aproximadas: cada persona suda distinto.', 830, 530, 380, 60, { fontSize: 19, color: DIM, fontStyle: 'italic' })],
          notes: 'Barras con cifras orientativas: con calor se puede perder más de un litro por hora. Para alguien de 50 kg, un 2 % es solo un litro.' },
        { title: 'Antes, durante y después', layout: 'titleOnly', bg: DEEP, transition: 'fade', extra: [
          ...[['Antes', 'Un vaso de agua una o dos horas antes.', 0.7], ['Durante', 'Unos sorbos cada 15 o 20 minutos.', 0.35]].flatMap(([t, d, lv], i) => [
            ...glassOf(110 + i * 330, 200, 180, 250, lv, [uid(), uid(), uid()], AQUA, FOAM),
            text(`<b style="color:${AQUA};font-size:30px">${t}</b><br>${d}`, 60 + i * 330, 470, 280, 140, { fontSize: 22, color: '#f2f6fa', textAlign: 'center' })]),
          ...glassOf(770, 200, 180, 250, 0.1, GL, AQUA, FOAM),
          text(`<b style="color:${YEL};font-size:30px">Después</b><br>Repón lo perdido…`, 720, 470, 280, 140, { fontSize: 22, color: '#f2f6fa', textAlign: 'center' }),
          text('→', 1040, 280, 120, 100, { fontSize: 80, color: YEL, textAlign: 'center' })],
          notes: 'Tres vasos para tres momentos. El de «después» está casi vacío: en la siguiente diapositiva se llena con Transformar.' },
        { layout: 'blank', bg: DEEP, autoAnimate: true, transition: 'fade', extra: [
          glow(-100, 40, 700, '#1b8fc0', DEEP, 40),
          ...glassOf(140, 110, 360, 500, 0.85, GL, AQUA, FOAM),
          kicker('DESPUÉS DEL EJERCICIO', 600, 170, 600, YEL),
          text('Repón poco a poco', 594, 210, 620, 80, { fontSize: 54, fontWeight: 800, color: '#ffffff' }),
          text('Bebe a sorbos durante la hora siguiente, aunque ya no tengas sed. Si has sudado mucho, una pieza de fruta y algo salado ayudan a recuperar sales.', 600, 310, 600, 170, { fontSize: 25, color: '#d6ecf6' }),
          text('La sed llega tarde: cuando aparece, ya te falta agua.', 600, 520, 600, 70, { fontSize: 23, color: AQUA, fontStyle: 'italic' })],
          notes: 'Transformar: el vaso de «después» crece, se mueve y se llena. Recuerda que con sed ya vamos con retraso.' },
        { title: 'El color también avisa', layout: 'titleOnly', bg: LIGHT, extra: [
          text('Escala del color de la orina', 80, 150, 900, 40, { fontSize: 24, color: '#4a6b80' }),
          ...['#fbf7d9', '#f8f0b0', '#f4e68a', '#efd964', '#e8c64a', '#ddae35', '#c98f28', '#a8701d'].map((c, i) => at(shape('rounded', 80 + i * 140, 210, 124, 170, c, { radius: 18, stroke: '#d9c995', strokeWidth: 2 }), 'fade-up', { start: i ? 'withPrev' : 'click', delay: i * 80 })),
          ...[['1-3', 'Bien hidratado', '#3a9a5b', 80, 404], ['4-5', 'Bebe pronto', '#9a6512', 500, 264], ['6-8', 'Bebe ya', '#c0392b', 780, 404]].map(([n, t, c, x, w]) =>
            text(`<b style="color:${c}">${n} · ${t}</b>`, x, 395, w, 40, { fontSize: 24, color: INK, textAlign: 'center' })),
          shape('rect', 80, 440, 404, 8, '#3a9a5b'), shape('rect', 500, 440, 264, 8, '#c98f28'), shape('rect', 780, 440, 404, 8, '#c0392b'),
          card('Es una pista, no un diagnóstico: algunas comidas y vitaminas cambian el color. Si dudas, pregunta a tu médico.', 80, 500, 1104, 110, '#ffffff', { fontSize: 23, color: INK, radius: 16, vAlign: 'middle', stroke: '#cfe6f1' })],
          notes: 'Una pista sencilla que se usa en muchos clubes: cuanto más clara, mejor hidratado. Clic: aparecen los colores en escalera.' },
        { title: '¿Agua o qué bebida?', layout: 'titleOnly', bg: DEEP, extra: [
          ...[['droplet', 'Agua', 'Sin azúcar y gratis. Es todo lo que necesitas en clase y en casi cualquier entrenamiento.', AQUA, 'Siempre'],
            ['bolt', 'Bebida para deportistas', 'Agua, azúcar y sales. Solo útil en esfuerzos de más de una hora o con mucho calor.', YEL, 'A veces'],
            ['ban', 'Bebida energética', 'Mucha cafeína y azúcar. No son para menores ni para hidratarse.', '#ff6b6b', 'Nunca']].flatMap(([ic, t, d, c, tag], i) => together([
            shape('rounded', 70 + i * 385, 170, 355, 440, '#0f3a5a', { radius: 20, stroke: c, strokeWidth: 3 }),
            icon(ic, 207 + i * 385, 205, 80, c),
            text(`<div style="font-size:30px;font-weight:800;color:${c}">${t}</div><div style="margin-top:10px">${d}</div>`, 95 + i * 385, 300, 305, 220, { fontSize: 22, color: '#f2f6fa', textAlign: 'center' }),
            text(tag, 160 + i * 385, 540, 175, 44, { fontSize: 22, fontWeight: 800, color: DEEP, bg: c, radius: 22, textAlign: 'center', vAlign: 'middle' })], 'fade-up', 'click'))],
          notes: 'Cada clic presenta una bebida. Insiste en la tercera: las bebidas energéticas no hidratan y no se recomiendan a menores de edad.' },
        { layout: 'blank', bg: DEEP, extra: [
          pollBlock({ kind: 'gaps', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: 'Completa las frases',
            text: 'Si el ejercicio dura menos de una hora, basta con [agua]. Hay que beber [antes] de tener sed. Las bebidas [energéticas] no son para menores. Una orina [clara] indica buena hidratación.', options: [] })],
          notes: 'Actividad de rellenar huecos desde el móvil, con lo visto en la presentación. Al terminar, un clic muestra las soluciones.' },
        { layout: 'blank', bg: DEEP, transition: 'zoom', extra: [
          sea(), ...bubbles(10, 9, [80, 420, 1120, 260]),
          text('bebe antes de tener sed · bebe antes de tener sed · ', 420, 120, 440, 440, { fontSize: 24, curve: 100, letterSpacing: 4, color: AQUA, fontWeight: 700, textAlign: 'center' }),
          ...glassOf(560, 220, 160, 230, 0.75, [uid(), uid(), uid()], AQUA, FOAM),
          text('Tu botella, siempre a mano', 140, 580, 1000, 70, { fontSize: 44, fontWeight: 800, color: '#ffffff', textAlign: 'center' })],
          notes: 'Cierre con texto curvo alrededor del vaso. Reto: traer la botella a todas las clases de la semana y rellenarla en la fuente.' },
      ]);
      deck.slides.filter(sl => sl.background === LIGHT).forEach(sl => sl.blocks.forEach(b => { if (b.ph === 'title') b.color = INK; }));
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 5 · Sleep: a window at night with the moon and a 3D lamp, the hours by age, a night in
  // cycles, what happens while you sleep, a phone at 23:47, an evening routine, a rating.
  edu_pe_sleep: { name: 'Dormir también es entrenar', cat: 'edu',
    summary: 'Ventana de noche: estrellas que se encienden, lámpara 3D, hipnograma, ciclo, radial, móvil con mensajes, rutina en cadena y valoración',
    make: () => {
      const NIGHT = '#120a26', NIGHT2 = '#1f1440', MOON = '#f6e7b0', LAV = '#b9a6f2', PINK = '#f15bb5', TEAL = '#00bbf9', FG = '#f3eefe', DIM = '#a99bd0', PANEL = '#24184a';
      const H = pairStacks('editorial').heading;
      const sky = () => shape('rect', 0, 0, 1280, 720, NIGHT2, { fill2: NIGHT, gradAngle: 90 });
      const deck = build({ name: 'Dormir también es entrenar', palette: 'violet', fonts: 'editorial', title: { size: 42, color: MOON }, body: { color: FG } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', extra: [
          sky(),
          shape('rounded', 700, 70, 460, 470, '#0b0620', { radius: 14, stroke: '#3a2c66', strokeWidth: 14 }),
          ...stars(22, 5, [720, 90, 420, 420]).map((b, i) => withAnims(b, A('fade-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 90, duration: 500 }))),
          ...crescent(990, 130, 110, '#0b0620'),
          shape('rect', 923, 70, 14, 470, '#3a2c66'), shape('rect', 700, 298, 460, 14, '#3a2c66'),
          shape('rect', 0, 600, 1280, 120, '#2a1d52'),
          shape('rounded', 1020, 520, 200, 90, '#3b2a6e', { radius: 8 }),
          m3d('kh-IridescenceLamp', 1010, 330, 220, 230, { view: 'front', autoRotate: false }),
          kicker('HÁBITOS SALUDABLES · DESCANSO', 80, 190, 600, PINK, 18),
          text('Dormir también es entrenar', 74, 230, 580, 230, { fontFamily: H, fontSize: 62, color: FG, lineHeight: 1.15 }),
          text('Lo que hace tu cuerpo mientras tú no te enteras', 80, 480, 560, 80, { fontSize: 26, color: DIM }),
          credits(['kh-IridescenceLamp'], 80, 680, 900, '#7d6fae', 11)],
          notes: 'Al llegar, las estrellas se encienden una tras otra en la ventana. La lámpara de la mesilla es un modelo 3D (su crédito, abajo). Pregunta: ¿a qué hora os dormisteis ayer?' },
        { title: '¿Cuántas horas necesitas?', layout: 'titleOnly', bg: NIGHT, extra: [
          ...chain([['6 a 12 años', '9-12', 'horas', TEAL], ['13 a 18 años', '8-10', 'horas', PINK], ['Personas adultas', '7-9', 'horas', LAV]].flatMap(([t, n, u, c], i) => [
            shape('rounded', 70 + i * 385, 180, 355, 380, PANEL, { radius: 120, stroke: c, strokeWidth: 2 }),
            text(t, 70 + i * 385, 220, 355, 40, { fontSize: 24, color: DIM, textAlign: 'center' }),
            text(n, 70 + i * 385, 270, 355, 150, { fontFamily: H, fontSize: 110, color: c, textAlign: 'center', fontWeight: 700 }),
            text(u, 70 + i * 385, 430, 355, 50, { fontSize: 28, color: FG, textAlign: 'center' })]).map((b, k) => withAnims(b, A('zoom-in', { start: k % 4 ? 'withPrev' : 'click', duration: 500 })))),
          text('Recomendaciones de las sociedades médicas del sueño para cada edad.', 70, 600, 1140, 40, { fontSize: 21, color: DIM, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Clic a clic, las horas por edad. A los 13-18 años se necesitan entre 8 y 10 horas: muchos adolescentes duermen menos de 7 entre semana.' },
        { title: 'Una noche, en ciclos', layout: 'titleOnly', bg: NIGHT, extra: [
          chartBlock({ x: 60, y: 150, w: 800, h: 480, chartType: 'line', color: TEAL, seriesName: 'Profundidad del sueño', labelColor: DIM, grid: true, yMin: 0, yMax: 3,
            yTitle: '0 despierto · 3 profundo', xTitle: 'Hora', data: series([['23 h', 0], [' ', 2], ['0 h', 3], ['  ', 3], ['1 h', 2], ['   ', 1], ['2 h', 2], ['    ', 3], ['3 h', 2], ['     ', 1],
              ['4 h', 2], ['      ', 2], ['5 h', 1], ['       ', 2], ['6 h', 1], ['        ', 1], ['7 h', 0]]) }),
          dg('cycle', 'Ligero\nProfundo\nLigero\nREM', 880, 160, 350, 350, { colors: 'accent', fontScale: 1.8, oneByOne: true }),
          text('Cada vuelta dura unos 90 minutos: hacemos 5 o 6 por noche.', 890, 520, 330, 100, { fontSize: 21, color: FG, textAlign: 'center' })],
          notes: 'Un hipnograma simplificado (datos inventados): el sueño profundo abunda al principio de la noche y el REM, con los sueños, al final. El ciclo aparece paso a paso con cada clic.' },
        { title: 'Mientras duermes…', layout: 'titleOnly', bg: NIGHT, extra: [
          glow(80, 120, 620, '#3d2a7a', NIGHT, 50),
          dg('radial', 'Sueño\n  Músculos que se reparan\n  Crecimiento\n  Memoria\n  Defensas\n  Buen humor\n  Apetito en orden', 70, 150, 640, 520, { colors: 'colorful', fontScale: 1.7, oneByOne: true }),
          card(`<div style="font-family:${H};font-size:30px;color:${MOON};line-height:1.35">«Lo que entrenas por la tarde se fija por la noche.»</div><div style="margin-top:14px;color:${DIM}">Los movimientos nuevos, como un saque o una voltereta, mejoran después de dormir bien.</div>`,
            760, 210, 450, 330, PANEL, { fontSize: 22, color: FG, radius: 22 })],
          notes: 'Diagrama radial uno a uno. Durante el sueño profundo se libera la hormona del crecimiento y el músculo se recupera; durante el REM se ordenan los recuerdos.' },
        { title: 'La trampa de la pantalla', layout: 'titleOnly', bg: NIGHT, extra: [
          glow(80, 160, 520, '#3d6bff', NIGHT, 30),
          img(nightChat(PINK, TEAL), 200, 140, 250, 500, { alt: 'Móvil a las 23:47 lleno de avisos de mensajes, vídeos y juegos', fit: 'cover', device: 'phone' }),
          ...[['sun', 'La luz de la pantalla engaña al cerebro: le dice que todavía es de día.'], ['bell', 'Mensajes, vídeos y juegos nos activan justo cuando hay que frenar.'],
            ['moon', 'Mejor: pantallas fuera una hora antes y el móvil, a cargar fuera del cuarto.']].flatMap(([ic, t], i) => together([
            shape('ellipse', 560, 186 + i * 140, 74, 74, PANEL), icon(ic, 577, 203 + i * 140, 40, [MOON, PINK, TEAL][i]),
            text(t, 656, 170 + i * 140, 560, 110, { fontSize: 24, color: FG, vAlign: 'middle' })], 'fade-left', 'click'))],
          notes: 'Un móvil a las 23:47 (aplicaciones inventadas). Clic: tres ideas. La tercera es la que más ayuda y la que más cuesta.' },
        { title: 'Una rutina para la noche', layout: 'titleOnly', bg: NIGHT, extra: [
          shape('rounded', 100, 380, 1080, 6, '#3a2c66', { radius: 3 }),
          ...chain([['21:00', 'Cena ligera', 'utensils'], ['21:30', 'Ducha templada', 'droplet'], ['22:00', 'Pantallas fuera', 'smartphone'], ['22:15', 'Leer un rato', 'book-open'], ['22:30', 'Luz apagada', 'moon']].flatMap(([h, t, ic], i) => { const x = 100 + i * 255;
            return [shape('ellipse', x + 50, 343, 80, 80, i === 4 ? MOON : PANEL, { stroke: i === 4 ? MOON : LAV, strokeWidth: 3 }), icon(ic, x + 70, 363, 40, i === 4 ? NIGHT : LAV),
              text(`<div style="font-family:${H};font-size:34px;color:${MOON}">${h}</div><div>${t}</div>`, x - 10, i % 2 ? 440 : 200, 200, 120, { fontSize: 23, color: FG, textAlign: 'center', vAlign: i % 2 ? 'top' : 'bottom' })]; }), 'fade-up', 'click', { duration: 400 }),
          text('Y a la misma hora también el fin de semana: el cuerpo funciona con reloj.', 100, 610, 1080, 40, { fontSize: 22, color: DIM, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Un clic y las cinco paradas aparecen una tras otra. Horarios de ejemplo para levantarse a las 7:30: ajústalos a cada casa.' },
        { layout: 'blank', bg: NIGHT, extra: [
          ...stars(16, 21, [0, 0, 1280, 720], '#5d4c99'),
          pollBlock({ kind: 'rating', question: 'Del 1 al 5: ¿qué tal has dormido esta noche?', fontSize: 34, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Valoración anónima desde el móvil. Si la media sale baja, comentad qué lo dificulta: deberes, pantallas, ruido…' },
        { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', extra: [
          sky(), ...stars(34, 13, [0, 0, 1280, 330]), ...crescent(560, 100, 160, NIGHT2),
          at(text('Buenas noches', 140, 360, 1000, 140, { fontFamily: H, fontSize: 104, textAlign: 'center', wordart: 'gradient', wordartColor: LAV }), 'fade-in', { start: 'afterPrev', duration: 1400 }),
          ...chain(['Z', 'z', 'z'].map((z, i) => text(z, 1000 + i * 60, 240 - i * 60, 80, 80, { fontFamily: H, fontSize: 64 - i * 12, color: MOON, textAlign: 'center' })), 'fade-up', 'afterPrev', { duration: 600 }),
          text('Esta noche, el mejor entrenamiento es dormir tus horas', 140, 520, 1000, 50, { fontSize: 26, color: DIM, textAlign: 'center' })],
          notes: 'Cierre con Text Art «Degradado» que aparece despacio y las zetas una tras otra. Reto: apuntar a qué hora os dormís durante una semana.' },
      ]);
      return finish(deck);
    } },
  // ---------------------------------------------------------------------------------
  // 6 · Basketball: a tactics board in marker, a ball that bounces in, the court in metres,
  // four keys of the shot, the arc into the hoop, the lay-up drawn as a play, practice in a table.
  edu_pe_basketball: { name: 'Baloncesto: tiro y bandeja', cat: 'edu',
    summary: 'Pizarra de entrenador: balón que bota con sonido, pista acotada, parábola trazada, jugada dibujada, tabla con fórmulas y etiquetar',
    make: () => {
      const BOARD = '#1f2326', FRAME = '#b9bec4', CH = '#f4f4f2', OR = '#f07d1a', RED = '#ff5a5f', BLUE = '#4aa3ff', DIM = '#9aa3ab', WB = '#f4f5f2', INK = '#22262a';
      const H = pairStacks('bold').heading, MK = FF.caveat;
      const board = () => [shape('rect', 0, 0, 1280, 720, '#2a2f33', { fill2: BOARD, gradType: 'radial' }), shape('rect', 0, 0, 1280, 720, 'none', { stroke: FRAME, strokeWidth: 26 }),
        shape('rect', 14, 14, 1252, 692, 'none', { stroke: '#7d848a', strokeWidth: 2 }), shape('rounded', 480, 694, 320, 16, '#7d848a', { radius: 6 })];
      const shots = [['Nerea', 20, 11], ['Álex', 20, 8], ['Iker', 20, 13], ['Lucía', 20, 15], ['Samuel', 20, 9]];
      const deck = build({ name: 'Baloncesto: tiro y bandeja', palette: 'revela', fonts: 'bold', title: { size: 60, color: CH }, body: { color: CH } }, [
        { layout: 'blank', bg: BOARD, transition: 'fade', extra: [
          ...board(),
          img(halfCourt('#5b6369', 4), 640, 60, 600, 560, { alt: '', decorative: true }),
          kicker('EF · DEPORTES DE EQUIPO', 90, 170, 520, OR, 20),
          text('Baloncesto', 84, 200, 640, 170, { fontFamily: H, fontSize: 150, color: CH, lineHeight: 1 }),
          text('El tiro y la bandeja, paso a paso', 90, 370, 560, 60, { fontFamily: MK, fontSize: 44, color: OR }),
          stroke('M0 50 C30 20 70 80 100 40', 90, 440, 300, 40, OR, 4),
          withAnims(img(ballSVG(), 860, 380, 170, 170, { alt: 'Balón de baloncesto' }), A('bounce', { start: 'afterPrev', duration: 1200, sound: 'pop' }))],
          notes: 'Pizarra de entrenador: todo dibujado como con rotulador. Al llegar, el balón entra botando con sonido. La pista de fondo es media cancha en SVG a escala.' },
        { title: 'La pista, en metros', layout: 'titleOnly', bg: BOARD, back: board(), extra: [
          img(halfCourt(CH, 4, `<g stroke="${OR}" stroke-width="3" fill="${OR}" font-family="sans-serif" font-size="22"><path d="M300 63 L490 254" stroke-dasharray="8 6"/><text x="410" y="190" stroke="none">6,75 m</text>`
            + `<path d="M410 2 L410 232" stroke-dasharray="8 6"/><text x="418" y="120" stroke="none">5,8 m</text><path d="M202 270 L398 270" stroke-dasharray="8 6"/><text x="190" y="262" stroke="none" text-anchor="end">4,9 m</text></g>`), 80, 140, 560, 523, { alt: 'Media pista de baloncesto con medidas: triple a 6,75 m, zona de 5,8 por 4,9 m' }),
          ...chain([['28 × 15 m', 'la pista entera'], ['3,05 m', 'la altura del aro'], ['6,75 m', 'del aro a la línea de triple'], ['4,6 m', 'del tablero a la línea de tiro libre']].map(([n, t], i) =>
            text(`<span style="font-family:${H};font-size:58px;color:${OR}">${n}</span>&nbsp; <span style="font-family:${MK};font-size:34px">${t}</span>`, 700, 160 + i * 115, 520, 100, { fontSize: 30, color: CH, vAlign: 'middle' })), 'fade-left', 'click')],
          notes: 'Media pista dibujada a escala (40 píxeles por metro) con tres cotas en naranja. Clic: las cuatro medidas que hay que saberse.' },
        { title: 'El tiro en cuatro claves', layout: 'titleOnly', bg: BOARD, back: board(), extra: [
          img(figure(POSES.throw, CH, 16), 70, 170, 280, 420, { alt: 'Figura lanzando a canasta con el brazo estirado' }),
          img(ballSVG(), 268, 160, 70, 70, { alt: '' }),
          dg('steps', 'Equilibrio\n  Pies a la anchura de los hombros\nMirada\n  Al aro antes de tirar\nCodo\n  Debajo del balón, en línea con el aro\nAcompañar\n  La muñeca «se mete» en el aro', 380, 160, 840, 480,
            { oneByOne: true, colors: 'accent', fontScale: 1.45 })],
          notes: 'Escalones uno a uno. Truco para recordarlas: E-M-C-A. Practicad primero a un metro del aro y alejaos poco a poco.' },
        { title: 'La parábola perfecta', layout: 'titleOnly', bg: BOARD, back: board(), extra: [
          shape('rounded', 1080, 250, 110, 10, CH, { radius: 3 }), shape('rect', 1180, 170, 10, 160, CH), shape('custom', 1080, 258, 110, 60, 'none', { path: 'M0 0 L20 100 L80 100 L100 0', stroke: DIM, strokeWidth: 2, dash: 'dash' }),
          at(stroke('M2 96 C25 -10 70 -20 98 34', 150, 230, 960, 380, OR, 3, { dash: 'dash' }), 'draw', { start: 'click', duration: 1400 }),
          withAnims(img(ballSVG(), 130, 560, 70, 70, { alt: 'Balón en vuelo hacia el aro' }), path([[160, -230], [380, -320], [600, -320], [820, -260], [985, -330 + 20]], { start: 'afterPrev', duration: 1800 })),
          at(text('¡Dentro!', 900, 380, 300, 80, { fontFamily: MK, fontSize: 60, color: OR, textAlign: 'center' }), 'zoom-in', { start: 'afterPrev', sound: 'applause' }),
          mathBlock({ x: 620, y: 500, w: 560, h: 80, fontSize: 30, color: CH, latex: '\\theta_{\\text{salida}} \\approx 45^{\\circ}\\text{–}55^{\\circ}' }),
          text('Un tiro con arco cae más vertical y tiene más aro para entrar.', 630, 590, 560, 80, { fontFamily: MK, fontSize: 32, color: DIM })],
          notes: 'Clic: se traza la parábola y el balón la recorre hasta el aro; sale el aplauso. Con un ángulo de salida de unos 45-55 grados el balón «ve» más aro al caer.' },
        { title: 'La bandeja: derecha, izquierda, ¡arriba!', layout: 'titleOnly', bg: BOARD, back: board(), extra: [
          img(halfCourt('#5b6369', 3), 640, 150, 560, 523, { alt: '', decorative: true }),
          at(stroke('M10 95 C30 70 55 40 80 10', 760, 240, 330, 380, CH, 4, { dash: 'dash' }), 'draw', { start: 'click', duration: 1200 }),
          ...[[810, 500, 'D', BLUE], [880, 410, 'I', RED]].map(([x, y, t, c]) => at(text(t, x, y, 56, 56, { fontSize: 30, fontWeight: 800, color: '#ffffff', bg: c, radius: 28, textAlign: 'center', vAlign: 'middle' }), 'zoom-in', { start: 'afterPrev', sound: 'click' })),
          withAnims(text('O', 770, 590, 60, 60, { fontFamily: H, fontSize: 52, color: OR, textAlign: 'center', vAlign: 'middle' }), path([[60, -110], [130, -210], [200, -320]], { start: 'afterPrev', duration: 1600 })),
          ...chain([['1', 'Derecha', 'Coges el balón con el último bote y apoyas el pie derecho.', BLUE], ['2', 'Izquierda', 'Paso corto con el izquierdo: es el que empuja hacia arriba.', RED],
            ['3', '¡Arriba!', 'Sube la rodilla derecha y deja el balón en el tablero.', OR]].map(([n, t, d, c], i) =>
            text(`<span style="font-family:${H};font-size:44px;color:${c}">${n} · ${t}</span><br>${d}`, 90, 160 + i * 150, 520, 140, { fontSize: 23, color: CH })), 'fade-right', 'click')],
          notes: 'Una jugada en la pizarra: clic para trazar la carrera, aparecen los dos apoyos (derecha e izquierda, con un clic de sonido) y el jugador la recorre. Después, la explicación de cada paso. Para zurdos, al revés.' },
        { title: 'Tiros libres: cómo vamos', layout: 'titleOnly', bg: BOARD, back: board(), extra: [
          tableBlock({ x: 80, y: 160, w: 560, h: 380, fontSize: 22, header: true, headBg: OR, headFg: '#1f2326', stroke: '#4b5359', color: CH, banded: true, band: CH, bandAlpha: 0.06,
            rows: [['Jugador', 'Intentos', 'Canastas', 'Acierto %'], ...shots.map(([n, a, c], i) => [n, String(a), String(c), `=REDONDEAR(C${i + 2}/B${i + 2}*100;0)`])], colW: [4, 3, 3, 3] }),
          chartBlock({ x: 680, y: 150, w: 520, h: 420, chartType: 'hbar', color: OR, labelColor: DIM, dataLabels: true, data: shots.map(([n, a, c]) => ({ label: n, value: Math.round(c / a * 100) })) }),
          text('Datos inventados de una sesión de 20 tiros por persona.', 80, 590, 1100, 40, { fontFamily: MK, fontSize: 30, color: DIM })],
          notes: 'La columna de acierto se calcula sola: canastas entre intentos por cien. Las barras dicen lo mismo de un vistazo. Lo importante es la mejora de cada uno, no la comparación.' },
        { layout: 'blank', bg: BOARD, back: board(), extra: [
          pollBlock({ kind: 'label', question: 'Etiqueta la pista', image: halfCourt(CH, 4), options: ['Aro', 'Zona', 'Línea de tiro libre', 'Línea de triple', 'Círculo central'],
            points: [{ x: 50, y: 11 }, { x: 50, y: 30 }, { x: 40, y: 41 }, { x: 18, y: 22 }, { x: 50, y: 95 }], fontSize: 32, x: 60, y: 40, w: 1160, h: 640 })],
          notes: 'Actividad «Etiquetar» desde el móvil: se arrastra cada nombre a su número sobre la pista. ' },
        { layout: 'blank', bg: BOARD, back: board(), extra: [
          pollBlock({ kind: 'quiz', question: 'Coges el balón tras botar: ¿cuántos pasos puedes dar?', options: ['Uno', 'Dos', 'Tres', 'Los que quieras sin botar'], correct: [1], time: 15,
            fontSize: 32, x: 60, y: 60, w: 1160, h: 600 })],
          notes: 'Concurso: dos pasos, como en la bandeja. Un tercero es pasos (violación) y el balón pasa al otro equipo.' },
        { layout: 'blank', bg: BOARD, transition: 'zoom', extra: [
          ...board(),
          img(halfCourt('#3e454a', 4), 340, 80, 600, 560, { alt: '', decorative: true }),
          at(text('¡Canasta!', 140, 230, 1000, 200, { fontFamily: H, fontSize: 180, textAlign: 'center', wordart: 'fire' }), 'zoom-in', { start: 'afterPrev', duration: 700, sound: 'applause' }),
          text('Mañana, a la pista: 20 tiros libres y 10 bandejas por cada lado', 140, 450, 1000, 60, { fontFamily: MK, fontSize: 40, color: CH, textAlign: 'center' })],
          notes: 'Text Art «Fuego» con aplauso al llegar. Deja la tarea de la próxima sesión escrita en la pizarra.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 7 · Athletics: a track from above with a walking figure, pictograms of the three families,
  // why lanes are staggered (an equation and a table that works it out), on your marks, results.
  edu_pe_athletics: { name: 'Atletismo: correr, saltar, lanzar', cat: 'edu',
    summary: 'Pista de tartán: personaje 3D, pictogramas que giran, ecuación y tabla de calles, salida con sonidos, histograma, ordenar y podio',
    make: () => {
      const RED = '#c4473a', GRASS = '#3f8f4a', WHITE = '#ffffff', INK = '#1f2a33', SOFT = '#5b6873', LIGHT = '#f6f4f1', NAVY = '#1b2a4a', GOLD = '#e6b325';
      const O = FF.oswald, track = trackSVG(1280, 720);
      const lane = (x, w = 1280) => shape('rect', x, 0, w, 40, RED);
      const strip = (y) => [shape('rect', 0, y, 1280, 56, RED), ...[1, 2, 3].map(i => shape('rect', 0, y + i * 14 - 1, 1280, 2, WHITE, { opacity: 80 }))];
      const jumps = [3.12, 3.45, 2.88, 3.9, 4.15, 3.6, 3.3, 2.95, 4.4, 3.75, 3.05, 3.55, 3.85, 4.02, 3.2, 2.7, 3.68, 3.4, 4.6, 3.1, 3.5, 3.95, 2.82, 3.58];
      const deck = build({ name: 'Atletismo: correr, saltar, lanzar', palette: 'office', fonts: 'websafe', title: { size: 46, color: NAVY, font: O }, body: { color: INK } }, [
        { layout: 'blank', bg: RED, transition: 'fade', extra: [
          deco(track),
          kicker('EDUCACIÓN FÍSICA · ATLETISMO', 290, 214, 700, '#cfe8c9', 20, { textAlign: 'center' }),
          text('ATLETISMO', 300, 250, 680, 150, { fontFamily: O, fontSize: 130, fontWeight: 700, color: WHITE, textAlign: 'center', lineHeight: 1 }),
          text('Correr, saltar y lanzar', 380, 400, 520, 50, { fontSize: 30, color: '#e8f5e4', textAlign: 'center', fontStyle: 'italic' }),
          withAnims(m3d('kn-character', 250, 560, 120, 150, { view: 'side', walk: { clip: 'walk', end: 'jump', endOnce: true, face: true } }), path([[640, 0]], { start: 'afterPrev', duration: 5000 }))],
          notes: 'La pista es un dibujo SVG con sus seis calles y la línea de meta. Al llegar, un personaje 3D recorre la recta y salta al llegar. Pregunta: ¿cuántos metros tiene una vuelta? (400 en la calle 1).' },
        { title: 'Tres familias de pruebas', layout: 'titleOnly', bg: LIGHT, extra: [
          ...strip(664),
          ...[['run', 'Carreras', 'Velocidad, vallas, relevos, medio fondo y fondo', RED], ['jump', 'Saltos', 'Longitud, triple, altura y pértiga', '#2f6db5'], ['throw', 'Lanzamientos', 'Peso, disco, jabalina y martillo', GRASS]].flatMap(([p, t, d, c], i) => [
            at(shape('rounded', 80 + i * 385, 160, 350, 470, '#ffffff', { radius: 18, stroke: '#e3ded7', strokeWidth: 2 }), 'flip', { start: i ? 'afterPrev' : 'click', duration: 600 }),
            at(shape('rounded', 165 + i * 385, 190, 180, 180, c, { radius: 24 }), 'flip', { start: 'withPrev', duration: 600 }),
            at(img(figure(POSES[p], WHITE, 16), 190 + i * 385, 200, 130, 160, { alt: `Pictograma de ${t.toLowerCase()}` }), 'flip', { start: 'withPrev', duration: 600 }),
            at(text(`<div style="font-family:${O};font-size:40px;color:${c}">${t}</div><div style="margin-top:8px">${d}</div>`, 100 + i * 385, 400, 310, 200, { fontSize: 23, color: INK, textAlign: 'center' }), 'flip', { start: 'withPrev', duration: 600 })])],
          notes: 'Los pictogramas son figuras SVG al estilo de los carteles deportivos. Un clic y las tres tarjetas giran una tras otra. ¿Cuál os gusta más?' },
        { title: '¿Por qué salen escalonados?', layout: 'titleOnly', bg: LIGHT, extra: [
          img(trackSVG(520, 300), 70, 160, 520, 300, { alt: 'Pista de atletismo vista desde arriba' }),
          mathBlock({ x: 70, y: 490, w: 520, h: 80, fontSize: 30, color: INK, latex: 'L = 2 \\cdot 84{,}39 + 2\\pi r' }),
          text('Dos rectas iguales y dos curvas: a más radio, más metros.', 80, 580, 510, 70, { fontSize: 21, color: SOFT }),
          tableBlock({ x: 640, y: 160, w: 570, h: 330, fontSize: 21, header: true, headBg: NAVY, headFg: WHITE, stroke: '#ddd6cc', color: INK, banded: true, band: RED, bandAlpha: 0.06,
            rows: [['Calle', 'Radio (m)', 'Una vuelta (m)', 'Más que la anterior'], ...[36.8, 37.92, 39.14, 40.36].map((r, i) => [String(i + 1), String(r).replace('.', ','),
              `=REDONDEAR(2*84,39+2*3,14159*B${i + 2};1)`, i ? `=REDONDEAR(C${i + 2}-C${i + 1};1)` : '—'])], colW: [2, 3, 4, 4] }),
          at(card('Por eso, en los 400 m, cada calle sale entre <b>7 y 7,7 m</b> por delante de la anterior.', 640, 520, 570, 110, '#fff3e0', { fontSize: 23, color: INK, radius: 14, vAlign: 'middle', stroke: '#f2d3a8' }), 'fade-up')],
          notes: 'La tabla calcula sola la vuelta de cada calle con la fórmula. Hay que medir por la línea por la que se corre (30 cm dentro de la calle 1). Clic: la conclusión.' },
        { layout: 'blank', bg: NAVY, transition: 'fade', extra: [
          ...strip(600), shape('rect', 0, 600, 8, 56, WHITE),
          img(figure(POSES.run, '#ffffff', 16), 940, 200, 220, 330, { alt: 'Pictograma de una persona corriendo' }),
          ...[['A sus puestos', 'click', 'click'], ['Listos…', 'click', 'drumroll'], ['¡Ya!', 'click', 'whoosh']].map(([t, st, snd], i) =>
            at(text(t, 90, 120 + i * 150, 820, 140, { fontFamily: O, fontSize: i === 2 ? 130 : 96, fontWeight: 700, color: i === 2 ? GOLD : WHITE, lineHeight: 1 }), i === 2 ? 'zoom-in' : 'fade-right', { start: st, sound: snd, duration: i === 2 ? 300 : 500 }))],
          notes: 'Tres clics, tres órdenes, cada una con su sonido: un clic, un redoble y el disparo (un silbido). En la salida baja, con «Listos» se levanta la cadera por encima de los hombros.' },
        { title: '60 metros: resultados del grupo', layout: 'titleOnly', bg: LIGHT, extra: [
          tableBlock({ x: 80, y: 160, w: 680, h: 420, fontSize: 22, header: true, headBg: RED, headFg: WHITE, stroke: '#ddd6cc', color: INK, banded: true, band: NAVY, bandAlpha: 0.05,
            rows: [['Atleta', '1.er intento (s)', '2.º intento (s)', 'Mejor (s)'], ['Ana', '9,8', '9,5', '=MIN(B2:C2)'], ['Bruno', '10,4', '10,2', '=MIN(B3:C3)'],
              ['Carla', '9,2', '9,0', '=MIN(B4:C4)'], ['Darío', '10,1', '9,9', '=MIN(B5:C5)'], ['Elena', '11,0', '10,7', '=MIN(B6:C6)'], ['<b>Media del grupo</b>', '=REDONDEAR(PROMEDIO(B2:B6);1)', '=REDONDEAR(PROMEDIO(C2:C6);1)', '=REDONDEAR(PROMEDIO(D2:D6);1)']], colW: [4, 3, 3, 3] }),
          card(`<div style="font-family:${O};font-size:64px;color:${RED};line-height:1">−0,2 s</div><div style="margin-top:8px">mejora media del segundo intento. La técnica de salida se nota.</div>`,
            800, 160, 400, 250, '#ffffff', { fontSize: 22, color: INK, radius: 16, stroke: '#e3ded7' }),
          text('Datos inventados. Se compara cada uno consigo mismo.', 800, 440, 400, 80, { fontSize: 20, color: SOFT, fontStyle: 'italic' })],
          notes: 'La columna «Mejor» elige el menor tiempo con MIN y la última fila calcula las medias. Cambia un tiempo y todo se recalcula.' },
        { title: 'Salto de longitud: así saltamos', layout: 'titleOnly', bg: LIGHT, extra: [
          chartBlock({ x: 70, y: 150, w: 760, h: 480, chartType: 'histogram', color: '#2f6db5', bins: 5, xTitle: 'Metros', yTitle: 'Atletas', grid: true, data: jumps.map((v, i) => ({ label: String(i + 1), value: v })) }),
          ...chain([['24', 'saltos medidos'], ['3,5 m', 'lo más frecuente'], ['4,6 m', 'el mejor salto']].map(([n, t], i) =>
            card(`<span style="font-family:${O};font-size:44px;color:${['#2f6db5', RED, GRASS][i]}">${n}</span><br>${t}`, 870, 160 + i * 155, 340, 135, '#ffffff', { fontSize: 22, color: INK, radius: 14, stroke: '#e3ded7' })), 'fade-left', 'click')],
          notes: 'Histograma de los 24 saltos del grupo (datos inventados) en cinco tramos. Clic: tres cifras para leerlo.' },
        { layout: 'blank', bg: LIGHT, extra: [
          ...strip(0),
          pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena las fases del salto de longitud', x: 80, y: 90, w: 1120, h: 590,
            options: ['Carrera de aproximación', 'Batida en la tabla', 'Vuelo', 'Caída en el foso'] })],
          notes: 'Actividad de ordenar desde el móvil. Recuerda que la marca se mide desde la tabla hasta la huella más cercana en la arena.' },
        { layout: 'blank', bg: NAVY, transition: 'zoom', extra: [
          glow(340, 60, 600, '#2f4f8a', NAVY, 60),
          ...[[1, 540, 330, 200, GOLD], [2, 340, 400, 200, '#c0c6cc'], [3, 740, 450, 200, '#cd7f4a']].map(([n, x, y, w, c], i) =>
            withAnims(shape('rect', x, y, w, 600 - y, c), A('fade-up', { start: i ? 'afterPrev' : 'afterPrev', duration: 500, ...(i === 0 && { sound: 'applause' }) }))),
          ...[[1, 540, 330], [2, 340, 400], [3, 740, 450]].map(([n, x, y]) => text(String(n), x, y + 10, 200, 100, { fontFamily: O, fontSize: 80, fontWeight: 700, color: NAVY, textAlign: 'center' })),
          ...strip(600),
          text('¡Todos a meta!', 140, 80, 1000, 130, { fontFamily: O, fontSize: 96, fontWeight: 700, color: WHITE, textAlign: 'center' }),
          text('En atletismo, el rival más importante es tu marca de ayer', 140, 225, 1000, 50, { fontSize: 26, color: '#c9d6ee', textAlign: 'center' })],
          notes: 'Cierre: el podio sube con aplauso. Recuerda la idea clave: cada uno compite contra su propia marca.' },
      ]);
      return finish(deck);
    } },
  // ---------------------------------------------------------------------------------
  // 8 · Back care: an anatomy plate in sepia, the spine drawn vertebra by vertebra and labelled,
  // the backpack (10 % of your weight, in a table), lifting right and wrong, a 3D chair, a pause.
  edu_pe_posture: { name: 'Una espalda para toda la vida', cat: 'edu',
    summary: 'Lámina en sepia: columna vértebra a vértebra, rótulos en cadena, mochila con fórmulas, así no y así sí, silla 3D, cuenta atrás y etiquetar',
    make: () => {
      const PAPER = '#f3ead8', INK = '#5a3e2b', OCHRE = '#a8432f', SAGE = '#5f7a5a', SOFT = '#8a7158', CARD = '#fbf6ec';
      const H = pairStacks('classic').heading, spine = spineSVG(INK);
      const label = (t, d, x, y, tx, ty, w = 380) => [stroke(`M0 ${ty < y ? 100 : 0} L100 ${ty < y ? 0 : 100}`, Math.min(x, tx), Math.min(y, ty), Math.max(2, Math.abs(tx - x)), Math.max(2, Math.abs(ty - y)), INK, 1.5),
        shape('ellipse', x - 5, y - 5, 10, 10, INK), text(`<span style="font-family:${H};font-size:28px;font-style:italic;color:${OCHRE}">${t}</span><br>${d}`, tx + (tx < x ? 0 : 10), tx < x ? ty - 78 : ty - 30, w, 76, { fontSize: 20, color: INK, lineHeight: 1.2 })];
      const deck = build({ name: 'Una espalda para toda la vida', palette: 'grayscale', fonts: 'classic', title: { size: 44, color: INK, italic: true }, body: { color: INK } }, [
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          ...plateFrame(INK),
          kicker('LÁMINA I · EDUCACIÓN FÍSICA Y SALUD', 90, 150, 700, OCHRE, 18),
          text('Una espalda<br>para toda la vida', 84, 190, 700, 230, { fontFamily: H, fontSize: 76, fontStyle: 'italic', color: INK, lineHeight: 1.12 }),
          shape('rect', 90, 430, 160, 2, INK),
          text('Postura, mochila y movimiento: pequeños gestos que tu columna agradecerá dentro de treinta años', 90, 450, 640, 110, { fontSize: 24, color: SOFT }),
          at(img(spine, 905, 60, 200, 545, { alt: 'Columna vertebral vista de lado, con sus curvas' }), 'fade-in', { start: 'afterPrev', duration: 1500 }),
          text('Fig. 1 — Columna vertebral, vista lateral', 825, 625, 360, 30, { fontSize: 16, fontStyle: 'italic', color: SOFT, textAlign: 'center' })],
          notes: 'Portada en forma de lámina antigua: la columna es un dibujo SVG, vértebra a vértebra, que aparece despacio. Pregunta: ¿quién ha tenido alguna vez dolor de espalda?' },
        { title: 'Tres curvas que hacen de muelle', layout: 'titleOnly', bg: PAPER, extra: [
          ...plateFrame(INK),
          img(spine, 520, 120, 205, 560, { alt: 'Columna vertebral con sus regiones' }),
          ...chain([
            label('Cervical', '7 vértebras: sujetan la cabeza', 633, 209, 100, 209, 420).reverse(),
            label('Dorsal', '12 vértebras, unidas a las costillas', 655, 381, 820, 340),
            label('Lumbar', '5 vértebras: las que más carga soportan', 566, 554, 100, 520, 420).reverse(),
            label('Sacro y cóccix', 'La base, unida a la pelvis', 652, 642, 820, 600)].flat(), 'fade-in', 'click', { duration: 400 }),
          text('Las curvas reparten el peso y amortiguan cada paso y cada salto.', 820, 150, 380, 110, { fontSize: 22, color: SOFT, fontStyle: 'italic' })],
          notes: 'Cada clic dibuja un rótulo con su línea. Las curvas no son un defecto: funcionan como un muelle. El problema es exagerarlas o aplanarlas durante horas.' },
        { title: 'La mochila', layout: 'titleOnly', bg: PAPER, extra: [
          ...plateFrame(INK),
          mathBlock({ x: 80, y: 150, w: 520, h: 100, fontSize: 36, color: OCHRE, latex: '\\text{mochila} \\le 10\\,\\%\\ \\text{del peso}' }),
          tableBlock({ x: 80, y: 270, w: 600, h: 300, fontSize: 21, header: true, headBg: INK, headFg: PAPER, stroke: '#d9c7a8', color: INK, banded: true, band: OCHRE, bandAlpha: 0.07,
            rows: [['Alumno', 'Peso (kg)', 'Máximo (kg)', 'Lleva (kg)'], ['Marta', '42', '=REDONDEAR(B2*0,1;1)', '6,5'], ['Hugo', '55', '=REDONDEAR(B3*0,1;1)', '5,0'], ['Sara', '48', '=REDONDEAR(B4*0,1;1)', '4,2']], colW: [3, 3, 3, 3] }),
          text('Datos inventados. ¿Quién va sobrecargado?', 80, 590, 600, 40, { fontSize: 20, color: SOFT, fontStyle: 'italic' }),
          ...chain([['Las dos asas', 'nunca colgada de un hombro'], ['Bien ajustada', 'pegada a la espalda, a la altura de la cintura'], ['Lo pesado, dentro', 'los libros grandes junto a la espalda'], ['Solo lo de hoy', 'revisa el horario cada noche']].map(([t, d], i) =>
            text(`<span style="font-family:${H};font-size:26px;font-style:italic;color:${OCHRE}">${['I', 'II', 'III', 'IV'][i]}. ${t}</span><br>${d}`, 740, 160 + i * 115, 460, 100, { fontSize: 21, color: INK })), 'fade-left', 'click')],
          notes: 'La columna «Máximo» multiplica cada peso por 0,1. Marta lleva 6,5 kg y su máximo es 4,2: va sobrecargada. Muchas guías hablan de un 10 %, como mucho un 15 %. Clic: cuatro consejos.' },
        { title: 'Levantar peso: así no, así sí', layout: 'titleOnly', bg: PAPER, extra: [
          ...plateFrame(INK),
          ...[[0, 'bend', 'Espalda doblada, piernas rectas: toda la carga va a las lumbares.', OCHRE, 'close'], [1, 'lift', 'Rodillas dobladas, espalda recta y la caja pegada al cuerpo.', SAGE, 'check']].flatMap(([i, p, d, c, ic]) => [
            shape('rounded', 90 + i * 560, 160, 520, 480, CARD, { radius: 10, stroke: '#d9c7a8', strokeWidth: 2 }),
            img(hatch(400, 40), 150 + i * 560, 500, 400, 40, { alt: '', decorative: true }),
            img(figure(POSES[p], INK, 14), 200 + i * 560, 200, 200, 300, { alt: i ? 'Figura agachada con las rodillas dobladas levantando una caja' : 'Figura doblada por la cintura con las piernas rectas' }),
            shape('rect', (i ? 262 : 314) + i * 560, 448, 70, 52, '#c9a46a', { stroke: INK, strokeWidth: 2 }),
            at(shape('ellipse', 470 + i * 560, 190, 90, 90, c), 'zoom-in', { start: 'click', sound: 'pop' }), at(icon(ic, 490 + i * 560, 210, 50, '#ffffff'), 'zoom-in', { start: 'withPrev' }),
            at(text(d, 120 + i * 560, 550, 460, 80, { fontSize: 22, color: INK, textAlign: 'center' }), 'fade-up', { start: 'withPrev' })])],
          notes: 'Dos figuras de pictograma. Primer clic: la forma incorrecta (sello rojo); segundo: la correcta. En el gimnasio y en casa, igual: las piernas hacen el trabajo.' },
        { title: 'Sentados, bien sentados', layout: 'titleOnly', bg: PAPER, extra: [
          ...plateFrame(INK),
          shape('ellipse', 120, 560, 380, 70, '#e2d3b8'),
          m3d('kh-SheenChair', 90, 150, 440, 470, { autoRotate: true, view: 'three' }),
          ...chain([['Pies apoyados', 'en el suelo o en un reposapiés'], ['Espalda contra el respaldo', 'con la zona lumbar apoyada'], ['Pantalla a la altura de los ojos', 'sin bajar la cabeza'],
            ['Cambia de postura', 'y levántate cada 30 o 45 minutos']].flatMap(([t, d], i) => [
            text(String(i + 1), 590, 165 + i * 115, 60, 60, { fontFamily: H, fontSize: 30, fontStyle: 'italic', color: PAPER, bg: OCHRE, radius: 30, textAlign: 'center', vAlign: 'middle' }),
            text(`<span style="font-family:${H};font-size:27px;color:${INK}">${t}</span><br><span style="color:${SOFT}">${d}</span>`, 670, 155 + i * 115, 530, 100, { fontSize: 21 })]).map((b, k) => withAnims(b, A('fade-left', { start: k % 2 ? 'withPrev' : 'click' }))))],
          notes: 'La silla 3D gira sola para verla desde todos los lados. Clic a clic, las cuatro claves. La mejor postura es la siguiente: moverse a menudo.' },
        { title: 'Pausa activa: un minuto', layout: 'titleOnly', bg: PAPER, extra: [
          ...plateFrame(INK),
          ...together([['arm', 'Brazos arriba', 'Estira hacia el techo'], ['calf', 'Contra la pared', 'Estira la pantorrilla'], ['stand', 'Hombros', 'Círculos hacia atrás']].flatMap(([p, t, d], i) => [
            shape('rounded', 90 + i * 270, 160, 250, 380, CARD, { radius: 10, stroke: '#d9c7a8', strokeWidth: 2 }),
            ...(p === 'calf' ? [shape('rect', 588, 178, 10, 232, '#c9b08a')] : []),
            img(figure(POSES[p], INK, 12), 140 + i * 270, 180, 150, 225, { alt: t }),
            text(`<span style="font-family:${H};font-size:26px;font-style:italic;color:${OCHRE}">${t}</span><br>${d}`, 100 + i * 270, 420, 230, 100, { fontSize: 20, color: INK, textAlign: 'center' })]), 'fade-up', 'click'),
          timer(60, 920, 190, 280, { color: OCHRE, endText: '¡A seguir!', auto: false }),
          text('20 segundos cada ejercicio', 900, 500, 320, 40, { fontSize: 21, color: SOFT, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Para hacer en clase, de pie junto a la mesa. Pulsa la cuenta atrás cuando estén todos preparados: 20 segundos por ejercicio, respirando despacio.' },
        { layout: 'blank', bg: PAPER, extra: [
          pollBlock({ kind: 'label', question: 'Etiqueta las partes de la columna', image: spineSVG(INK), options: ['Cervical', 'Dorsal', 'Lumbar', 'Sacro'],
            points: [{ x: 55, y: 16 }, { x: 40, y: 47 }, { x: 58, y: 78 }, { x: 52, y: 92 }], fontSize: 32, x: 60, y: 40, w: 1160, h: 640 })],
          notes: 'Actividad «Etiquetar» desde el móvil, sobre el mismo dibujo de la columna. Al terminar, un clic muestra las soluciones.' },
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          ...plateFrame(INK),
          img(spine, 100, 60, 220, 600, { alt: '', decorative: true, opacity: 35 }), img(spine, 960, 60, 220, 600, { alt: '', decorative: true, opacity: 35, flipH: true }),
          text('Tu espalda te acompaña<br>toda la vida', 300, 220, 680, 200, { fontFamily: H, fontSize: 60, fontStyle: 'italic', color: INK, textAlign: 'center', lineHeight: 1.2 }),
          at(text('Muévete, carga bien y siéntate mejor', 300, 450, 680, 50, { fontSize: 28, color: OCHRE, textAlign: 'center' }), 'fade-up', { start: 'afterPrev' })],
          notes: 'Cierre. Si alguien tiene dolor de espalda que no se va o que le despierta por la noche, debe consultarlo con su médico.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 9 · Cooling down: ripples at dawn, box breathing with a dot that goes round, a circle that
  // grows and shrinks with your breath, four stretches with a countdown, the pulse that comes down.
  edu_pe_calm: { name: 'Vuelta a la calma: estirar y respirar', cat: 'edu',
    summary: 'Amanecer en calma: planta 3D, respiración en caja con trayectoria, círculo que crece y encoge, estiramientos, diana y nube de palabras',
    make: () => {
      const MIST = '#f6f3ec', SAGE = '#e3ece0', DEEP = '#2f4a3a', LEAF = '#5f8f66', PEACH = '#f2c6a8', CORAL = '#e0896a', INK = '#24352b', SOFT = '#5e7266';
      const H = pairStacks('websafe').heading;
      const dawn = () => shape('rect', 0, 0, 1280, 720, '#fbe3d0', { fill2: SAGE, gradAngle: 90 });
      const deck = build({ name: 'Vuelta a la calma', palette: 'forest', fonts: 'websafe', title: { size: 44, color: DEEP, bold: false }, body: { color: INK } }, [
        { layout: 'blank', bg: MIST, transition: 'fade', transitionSpeed: 'slow', extra: [
          dawn(), ...ripples(940, 380, 7, LEAF, 60, 40),
          shape('ellipse', 860, 300, 160, 160, PEACH, { fill2: '#fbe3d0', gradType: 'radial', opacity: 90 }),
          m3d('kh-DiffuseTransmissionPlant', 800, 160, 300, 440, { view: 'front', autoRotate: true }),
          kicker('EDUCACIÓN FÍSICA · FINAL DE LA CLASE', 90, 200, 640, CORAL, 18),
          text('Vuelta<br>a la calma', 84, 240, 640, 230, { fontFamily: H, fontSize: 92, color: DEEP, lineHeight: 1.08 }),
          text('Estirar, respirar y bajar el pulso antes de irse', 90, 480, 600, 90, { fontSize: 26, color: SOFT }),
          credits(['kh-DiffuseTransmissionPlant'], 90, 680, 1100, '#8a9a8f', 11)],
          notes: 'Una portada tranquila: ondas como en el agua y una planta 3D que gira despacio. Baja la voz y el ritmo: la vuelta a la calma empieza aquí.' },
        { title: 'Respira en caja', layout: 'titleOnly', bg: MIST, extra: [
          shape('rounded', 180, 200, 360, 360, 'none', { stroke: LEAF, strokeWidth: 6, radius: 12 }),
          ...[['Mantén 4 s', 180, 150, 'center'], ['Suelta 4 s', 560, 360, 'left'], ['Mantén 4 s', 180, 580, 'center'], ['Inspira 4 s', 0, 360, 'right']].map(([t, x, y, al]) =>
            text(t, x, y, al === 'center' ? 360 : 170, 40, { fontSize: 24, color: DEEP, textAlign: al, fontFamily: H })),
          withAnims(shape('ellipse', 166, 546, 28, 28, CORAL, { stroke: '#ffffff', strokeWidth: 3 }),
            path([[0, -180], [0, -346], [180, -346], [360, -346], [360, -180], [360, 0], [180, 0], [0, 0]], { start: 'click', duration: 16000 })),
          timer(64, 800, 210, 300, { color: LEAF, endText: 'Muy bien', auto: false }),
          text('Cuatro vueltas: algo más de un minuto', 760, 540, 380, 70, { fontSize: 21, color: SOFT, textAlign: 'center' })],
          notes: 'Clic: el punto recorre el cuadrado en 16 segundos, cuatro por lado; seguidlo con la respiración. La cuenta atrás de un minuto se pone en marcha a mano para hacer cuatro vueltas.' },
        { layout: 'blank', bg: DEEP, extra: [
          ...ripples(640, 360, 6, '#9cc3a2', 70, 30),
          withAnims(shape('ellipse', 490, 210, 300, 300, LEAF, { fill2: '#9cc3a2', gradType: 'radial', opacity: 85 }),
            A('grow', { start: 'click', duration: 4000 }), A('shrink', { start: 'afterPrev', duration: 6000 })),
          withAnims(text('Inspira…', 90, 330, 360, 60, { fontFamily: H, fontSize: 40, color: '#ffffff', textAlign: 'center' }), A('fade-in-then-out', { start: 'withPrev', duration: 4000 })),
          withAnims(text('Suelta despacio…', 830, 330, 380, 60, { fontFamily: H, fontSize: 40, color: '#ffffff', textAlign: 'center' }), A('fade-in-then-out', { start: 'afterPrev', duration: 6000 })),
          text('Sigue el círculo', 340, 80, 600, 60, { fontFamily: H, fontSize: 36, color: '#cfe3d2', textAlign: 'center' })],
          notes: 'Clic: el círculo crece cuatro segundos (inspira por la nariz) y encoge seis (suelta por la boca). Soltar el aire más despacio de lo que entra ayuda a calmar el pulso. Repite los clics que quieras.' },
        { title: 'Cuatro estiramientos', layout: 'titleOnly', bg: MIST, extra: [
          ...chain([['quad', 'Cuádriceps', 'Talón al glúteo, rodillas juntas'], ['hams', 'Isquiotibiales', 'Pierna estirada, espalda larga'], ['calf', 'Gemelos', 'Contra la pared, talón en el suelo'], ['arm', 'Hombro', 'Brazo cruzado, sin girar el tronco']].flatMap(([p, t, d], i) => [
            shape('rounded', 70 + i * 230, 160, 210, 380, '#ffffff', { radius: 105, stroke: SAGE, strokeWidth: 3 }),
            img(figure(POSES[p], DEEP, 12), 100 + i * 230, 190, 150, 225, { alt: t }),
            text(`<b style="color:${LEAF};font-size:22px">${t}</b><br>${d}`, 80 + i * 230, 425, 190, 100, { fontSize: 18, color: INK, textAlign: 'center', lineHeight: 1.15 })]).map((b, k) => withAnims(b, A('fade-up', { start: k % 3 ? 'withPrev' : 'click' })))),
          timer(30, 1010, 190, 210, { style: 'ring', color: CORAL, endText: 'Cambia', auto: false }),
          text('20-30 s<br>por lado', 990, 420, 250, 90, { fontFamily: H, fontSize: 28, color: DEEP, textAlign: 'center' }),
          text('Hasta notar tensión suave, nunca dolor. Sin rebotes.', 70, 580, 1140, 40, { fontSize: 22, color: SOFT, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Un estiramiento por clic. Cada uno, entre 20 y 30 segundos por lado, respirando. Los estiramientos quietos van aquí, al final de la clase, y no antes del ejercicio intenso.' },
        { title: 'Las reglas de oro', layout: 'titleOnly', bg: MIST, extra: [
          dg('target', 'Sin dolor\nSin rebotes\nRespirando despacio\nDe 20 a 30 segundos', 90, 150, 660, 500, { oneByOne: true, colors: 'accent', fontScale: 1.1 }),
          card(`<div style="font-family:${H};font-size:28px;color:${DEEP};line-height:1.35">«Estirar es una conversación con tu cuerpo, no una pelea.»</div>`, 800, 220, 400, 260, SAGE, { fontSize: 22, color: INK, radius: 24, vAlign: 'middle' })],
          notes: 'Diana uno a uno: en el centro, la regla más importante. Y siempre con el cuerpo caliente, al final de la clase. La cita resume la idea: escuchar las señales del cuerpo.' },
        { title: 'El pulso vuelve a su sitio', layout: 'titleOnly', bg: MIST, extra: [
          chartBlock({ x: 70, y: 160, w: 760, h: 470, chartType: 'line', color: CORAL, seriesName: 'Latidos por minuto', grid: true, yMin: 60, yMax: 180, xTitle: 'Minutos después del ejercicio',
            data: series([['0', 165], ['1', 136], ['2', 118], ['3', 106], ['4', 98], ['5', 92], ['6', 88]]) }),
          ...chain([['−30', 'latidos en el primer minuto: buena señal'], ['5 min', 'de vuelta a la calma bastan']].map(([n, t], i) =>
            card(`<span style="font-family:${H};font-size:52px;color:${i ? LEAF : CORAL}">${n}</span><br>${t}`, 870, 180 + i * 210, 340, 180, '#ffffff', { fontSize: 22, color: INK, radius: 18, stroke: SAGE })), 'fade-left', 'click')],
          notes: 'Datos inventados de un alumno tras un partido. Cuanto más rápido baja el pulso en el primer minuto, mejor forma física.' },
        { layout: 'blank', bg: MIST, extra: [
          dawn(),
          pollBlock({ kind: 'word', question: 'En una palabra: ¿cómo te sientes ahora?', options: [], fontSize: 34, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Nube de palabras desde el móvil. Suelen salir «tranquilo», «cansado», «bien»… Comentad la diferencia con el principio de la clase.' },
        { layout: 'blank', bg: MIST, transition: 'fade', transitionSpeed: 'slow', extra: [
          dawn(), ...ripples(640, 360, 8, LEAF, 60, 36),
          at(text('Gracias por moverte', 140, 270, 1000, 120, { fontFamily: H, fontSize: 80, color: DEEP, textAlign: 'center' }), 'fade-in', { start: 'afterPrev', duration: 1600 }),
          text('Sal de clase despacio: el día sigue', 140, 400, 1000, 50, { fontSize: 28, color: SOFT, textAlign: 'center' })],
          notes: 'Cierre con transición lenta. Despide a la clase con una última respiración larga, todos a la vez.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 10 · Sixty minutes a day: a cork board with notes and pins, what the guidelines say, a week
  // in a table that adds up, stacked bars, sitting time in a doughnut, a little program, a board.
  edu_pe_active: { name: '60 minutos al día', cat: 'edu',
    summary: 'Tablón de corcho: notas con chinchetas, personaje 3D que salta, semana con fórmulas, barras apiladas, dona, código y muro de ideas',
    make: () => {
      const INK = '#2b2118', Y = '#ffe680', P = '#ffb3c7', B = '#a8dcf0', G = '#bfe6a8', O = '#ffc58a', PAPER = '#fffdf6', RED = '#d23a2a';
      const T = pairStacks('tech').heading, HAND = FF.caveat, cork = corkSVG();
      const week = [['Lunes', 20, 55, 0], ['Martes', 20, 0, 20], ['Miércoles', 20, 55, 15], ['Jueves', 20, 0, 35], ['Viernes', 20, 0, 60], ['Sábado', 0, 90, 30], ['Domingo', 0, 0, 30]];
      const deck = build({ name: '60 minutos al día', palette: 'paper', fonts: 'tech', title: { size: 44, color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: '#c99a63', transition: 'fade', extra: [
          deco(cork),
          shape('rect', 96, 106, 640, 470, '#000000', { opacity: 18, rotation: -1.5 }),
          shape('rect', 90, 100, 640, 470, PAPER, { rotation: -1.5 }), ...pin(400, 90),
          kicker('RETO DE EDUCACIÓN FÍSICA', 130, 140, 560, RED, 18),
          at(text('60', 120, 170, 300, 230, { fontFamily: T, fontSize: 210, fontWeight: 700, wordart: 'retro', wordartColor: RED, lineHeight: 1 }), 'zoom-in', { start: 'afterPrev', duration: 700, sound: 'pop' }),
          text('minutos<br>al día', 420, 210, 300, 170, { fontFamily: T, fontSize: 58, fontWeight: 700, color: INK, lineHeight: 1.05 }),
          text('Moverse cada día, sumando ratos: andar, jugar, bailar, entrenar…', 130, 420, 560, 110, { fontFamily: HAND, fontSize: 36, color: INK }),
          ...note('Bici al insti', 800, 110, 190, 120, Y, 4, { fontFamily: HAND, fontSize: 32 }),
          ...note('Bailar en casa', 1020, 160, 190, 120, P, -5, { fontFamily: HAND, fontSize: 32 }),
          ...note('Partido en el recreo', 820, 300, 200, 130, B, -3, { fontFamily: HAND, fontSize: 30 }),
          m3d('kn-character', 1030, 360, 200, 280, { clip: 'jump', view: 'front' })],
          notes: 'Un tablón de corcho con notas y chinchetas. El «60» es Text Art «Retro» con color propio y entra con un «pop». El personaje 3D salta sin parar: es la idea de la presentación.' },
        { title: 'Lo que recomiendan los expertos', layout: 'titleOnly', bg: PAPER, extra: [
          deco(corkSVG(1280, 40, 8), 0, 680, 1280, 40),
          ...chain([['60 min', 'cada día, de media, de actividad moderada o vigorosa', Y, -2], ['3 días', 'a la semana, ejercicios que fortalecen músculos y huesos: saltar, trepar, correr', G, 2],
            ['Menos silla', 'y menos tiempo de pantalla de ocio', P, -1]].flatMap(([n, t, c, r], i) => note(`<div style="font-family:${T};font-size:56px;font-weight:700;line-height:1.05">${n}</div><div style="margin-top:10px">${t}</div>`,
            80 + i * 390, 190, 340, 380, c, r, { fontSize: 24, pad: [28, 28, 28, 28] })), 'fade-down', 'click'),
          text('Recomendaciones de la Organización Mundial de la Salud para chicos y chicas de 5 a 17 años (2020).', 80, 610, 1120, 40, { fontSize: 19, color: '#6b5a48', fontStyle: 'italic' })],
          notes: 'Clic a clic, tres notas. Lo importante: los 60 minutos se pueden sumar en ratos (ir andando, el recreo, la clase de EF) y cualquier movimiento cuenta más que nada.' },
        { title: 'Mi semana, en minutos', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 70, y: 150, w: 720, h: 490, fontSize: 20, header: true, headBg: INK, headFg: PAPER, stroke: '#e6dccb', color: INK, banded: true, band: O, bandAlpha: 0.15,
            rows: [['Día', 'Andando', 'EF y deporte', 'Jugar', 'Total'], ...week.map(([d, a, b, c]) => [d, String(a), String(b), String(c), '=SUMA(IZQUIERDA)']),
              ['<b>Media</b>', '=REDONDEAR(PROMEDIO(B2:B8);0)', '=REDONDEAR(PROMEDIO(C2:C8);0)', '=REDONDEAR(PROMEDIO(D2:D8);0)', '=REDONDEAR(PROMEDIO(E2:E8);0)']], colW: [4, 3, 3, 3, 3] }),
          ...note(`<div style="font-family:${T};font-size:50px;font-weight:700">70</div>minutos de media al día: ¡reto cumplido!`, 850, 180, 340, 220, Y, 3, { fontSize: 24 }),
          ...note('Pero el martes y el jueves no llegan a 60: ¿qué añadirías?', 860, 450, 330, 160, B, -2, { fontFamily: HAND, fontSize: 30 })],
          notes: 'La semana inventada de una alumna. La columna «Total» suma cada fila hacia la izquierda y la última fila calcula las medias. La media pasa de 60, pero hay días flojos.' },
        { title: 'La misma semana, en barras', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 70, y: 150, w: 1140, h: 490, chartType: 'stacked', color: '#e4572e', seriesName: 'Andando', yTitle: 'Minutos', grid: true, yMax: 120,
            data: week.map(([d, a]) => ({ label: d, value: a })), series: [{ name: 'EF y deporte', values: week.map(w => w[2]), color: '#669bbc' }, { name: 'Jugar', values: week.map(w => w[3]), color: '#a8c686' }] })],
          notes: 'Barras apiladas con los mismos datos: se ve qué días faltan minutos y de dónde salen. Ir andando al instituto aporta 20 minutos casi sin darse cuenta.' },
        { title: 'Un día entre semana, ¿sentados?', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 60, y: 150, w: 700, h: 490, chartType: 'doughnut', data: slices([['Dormir', 9], ['Sentado en clase', 5], ['Pantallas de ocio', 3], ['Comer', 1.5], ['Moverse', 1.2], ['Otras cosas', 4.3]],
            ['#669bbc', '#e4572e', '#db2b39', '#f0c987', '#a8c686', '#c9b8a6']) }),
          ...note(`<div style="font-family:${T};font-size:60px;font-weight:700;color:${RED}">8 h</div>sentados en un día normal, sumando clase y pantallas.`, 820, 180, 360, 230, P, 2, { fontSize: 24 }),
          ...note('Truco: levántate y muévete un par de minutos cada hora.', 830, 460, 340, 150, G, -2, { fontFamily: HAND, fontSize: 30 })],
          notes: 'Dona con un día inventado pero típico: muchas horas sentados. No se trata de no sentarse, sino de interrumpir el tiempo sentado y sumar ratos de movimiento.' },
        { title: 'Cuéntalo con un programa', layout: 'titleOnly', bg: PAPER, extra: [
          codeBlock({ x: 70, y: 150, w: 760, h: 420, fontSize: 22, lang: 'python', lineSteps: '1-3|5|6|8-9',
            code: '# Minutos activos de mi semana\nsemana = {"lun": 75, "mar": 40, "mié": 90, "jue": 55,\n          "vie": 80, "sáb": 120, "dom": 30}\n\ndias_ok = [d for d, m in semana.items() if m >= 60]\nmedia = sum(semana.values()) / len(semana)\n\nprint(f"Días con 60 min o más: {len(dias_ok)}")\nprint(f"Media: {media:.0f} minutos al día")' }),
          at(card(`<div style="font-family:${FF.mono};font-size:22px;line-height:1.6">&gt; Días con 60 min o más: 4<br>&gt; Media: 70 minutos al día</div>`, 70, 590, 760, 90, '#1e1a16', { color: '#a8e6a1', radius: 10, vAlign: 'middle' }), 'fade-up'),
          ...note('Apunta tus minutos una semana y pruébalo con tus datos', 880, 200, 320, 200, O, 3, { fontFamily: HAND, fontSize: 32 })],
          notes: 'Código con pasos: cada clic resalta una parte (los datos, los días que llegan a 60, la media y el resultado). Un buen proyecto para hacer con Tecnología.' },
        { layout: 'blank', bg: PAPER, extra: [
          deco(corkSVG(1280, 40, 12), 0, 0, 1280, 40),
          pollBlock({ kind: 'board', question: 'Mi reto activo para esta semana', fontSize: 36, x: 80, y: 80, w: 1120, h: 600 })],
          notes: 'Muro de ideas desde el móvil: cada uno escribe su reto (ir andando, saltar a la comba, bailar…). Dejadlo visible toda la semana.' },
        { layout: 'blank', bg: '#c99a63', transition: 'zoom', extra: [
          deco(cork),
          ...chain([['¡Muévete!', 320, 170, 640, 300, Y, -2], ['Cada minuto suma', 140, 520, 330, 120, P, 4], ['Mejor con amigos', 820, 520, 330, 120, B, -4]].flatMap(([t, x, y, w, h, c, r], i) =>
            note(t, x, y, w, h, c, r, { fontFamily: i ? HAND : T, fontSize: i ? 38 : 110, fontWeight: i ? 400 : 700, textAlign: 'center', vAlign: 'middle' })), 'zoom-in', 'afterPrev', { duration: 400 })],
          notes: 'Cierre: las notas aparecen solas una tras otra. Mañana, a contar minutos.' },
      ]);
      return finish(deck);
    } },
};
