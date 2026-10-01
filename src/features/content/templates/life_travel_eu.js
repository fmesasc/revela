// Example presentations: Viajes por Europa (vida personal). Each one: { name, summary, cat: 'life', make() } → a deck
// (see kit.js for the builders). Ten trips, each with its own look taken from the place:
// azulejos and trams, auroras, fjords, an astronomical clock, a pilgrim's credential,
// whitewashed islands, tartan, a cycling computer, canal houses and a nautical chart.
// Places are real; prices, timetables and figures are made up but plausible (said in the notes).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file -------------------------------------------------------------
// An SVG drawing as a data URL (maps, landscapes, tiles: drawn for these decks).
const svgURL = (w, h, inner, bg = null) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const img = (src, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, fit: 'cover', ...props });
// Fonts of the catalogue beyond the deck's pair (their stacks, so the editor and the exports load them).
const FF = { caveat: "'Caveat', cursive", oswald: "'Oswald', sans-serif", abril: "'Abril Fatface', serif", cormorant: "'Cormorant Garamond', serif",
  mono: "'JetBrains Mono', monospace", josefin: "'Josefin Sans', sans-serif", lobster: "'Lobster', cursive", anton: "'Anton', sans-serif", lora: "'Lora', serif" };
const keep = (b, id) => ({ ...b, id });                    // (the same id on two slides: Transform moves it)
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// The same animation on a group: the first one starts it (click / after the previous), the rest go with it.
const together = (blocks, effect = 'fade-up', start = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'withPrev' : start })));
// One after another (the first on a click, or by itself with 'afterPrev').
const chain = (blocks, effect = 'fade-up', first = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// numbered(), and on section slides the shapes (glows, decorations) under the title and subtitle.
const finish = deck => { for (const sl of deck.slides) if (sl.layoutId === 'section') sl.blocks.sort((a, b) => (b.type === 'shape') - (a.type === 'shape'));
  return numbered(deck); };
// A 3D model without its caption (the credits go in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color, size = 12) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: size, color });
// The same pseudo-random numbers every time (stars, snow, dots).
const rng = seed => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
// A small label in capitals with letter spacing.
const kicker = (t, x, y, w, color, size = 20, props = {}) => text(t, x, y, w, size + 16, { fontSize: size, letterSpacing: 5, color, fontWeight: 700, ...props });

// ---- 1 · Lisboa: azulejos and the yellow tram -------------------------------------------
const AZ = '#1d4f91', AZ2 = '#6f9bd6', TRAM = '#f5b700';
// An azulejo tile (cobalt on white), repeated over any size.
const azulejos = (w, h, size = 120, ink = AZ, ground = '#f7f3ea') => svgURL(w, h,
  `<defs><pattern id="t" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g transform="scale(${size / 120})">`
  + `<rect width="120" height="120" fill="${ground}"/><rect x="1" y="1" width="118" height="118" fill="none" stroke="#c9d3e3" stroke-width="2"/>`
  + `<circle cx="60" cy="60" r="30" fill="none" stroke="${ink}" stroke-width="7"/><circle cx="60" cy="60" r="11" fill="${ink}"/>`
  + [0, 90, 180, 270].map(a => `<path d="M60 22 C70 8 84 8 86 0 M60 22 C50 8 36 8 34 0" stroke="${ink}" stroke-width="5" fill="none" transform="rotate(${a} 60 60)"/>`
    + `<ellipse cx="60" cy="4" rx="8" ry="14" fill="${ink}" opacity=".55" transform="rotate(${a} 60 60)"/>`).join('')
  + [[0, 0], [120, 0], [0, 120], [120, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="${ink}"/><circle cx="${x}" cy="${y}" r="9" fill="${ground}"/>`).join('')
  + `</g></pattern></defs><rect width="${w}" height="${h}" fill="url(#t)"/>`);
// The yellow tram, side view (300 × 160).
const tramSVG = svgURL(300, 160,
  '<path d="M150 34 L128 6 L172 6" stroke="#333" stroke-width="3" fill="none"/>'
  + '<rect x="8" y="34" width="284" height="104" rx="20" fill="#f5b700"/><rect x="8" y="34" width="284" height="30" rx="16" fill="#fbf3dc"/>'
  + Array.from({ length: 6 }, (_, i) => `<rect x="${26 + i * 42}" y="54" width="32" height="40" rx="5" fill="#8fb6e0" stroke="#5a4a2a" stroke-width="2"/>`).join('')
  + '<rect x="8" y="110" width="284" height="8" fill="#7a4b1e"/><rect x="232" y="40" width="40" height="18" rx="3" fill="#222"/>'
  + '<text x="252" y="54" font-family="sans-serif" font-size="15" font-weight="700" fill="#f5b700" text-anchor="middle">28</text>'
  + '<circle cx="70" cy="140" r="15" fill="#2d2d2d"/><circle cx="230" cy="140" r="15" fill="#2d2d2d"/><circle cx="70" cy="140" r="5" fill="#999"/><circle cx="230" cy="140" r="5" fill="#999"/>');

// ---- 2 · Islandia: auroras over black sand ------------------------------------------------
// Stars: tiny dots, always in the same places.
const stars = (n, seed, color = '#ffffff', area = [0, 0, 1280, 460]) => { const r = rng(seed);
  return Array.from({ length: n }, () => { const d = 2 + r() * 4;
    return shape('ellipse', Math.round(area[0] + r() * area[2]), Math.round(area[1] + r() * area[3]), d, d, color, { opacity: Math.round(35 + r() * 60) }); }); };
// An aurora curtain: a wavy band, bright at its lower edge, fading up into the night.
const aurora = (x, y, w, h, color, bg, opacity = 70, wave = 0) => shape('custom', x, y, w, h, color, { fill2: bg, gradAngle: 270, opacity,
  path: ['M0 0 L100 0 L100 4 C94 30 84 72 70 58 S44 40 32 70 S10 36 0 4 Z', 'M0 0 L100 0 L100 4 C90 40 76 48 60 66 S30 74 20 48 S6 20 0 4 Z'][wave] });
// Iceland, roughly (600 × 420), and the ring road through its towns.
const ICELAND = 'M60 92 L102 48 L150 66 L138 108 L188 98 L200 140 L248 118 L292 78 L340 68 L382 48 L432 70 L472 58 L522 90 L560 130 L572 180 L546 230 L562 270 L522 302 L472 330 L420 360 L360 380 L300 386 L240 372 L190 352 L140 332 L112 304 L70 292 L92 262 L58 242 L100 222 L60 192 L100 170 L70 140 Z';
const RING = [['Reikiavik', 112, 286], ['Selfoss', 182, 326], ['Vík', 300, 366], ['Jökulsárlón', 420, 338], ['Höfn', 470, 316], ['Egilsstaðir', 520, 192], ['Mývatn', 440, 146], ['Akureyri', 362, 116], ['Borgarnes', 160, 218]];

// ---- 3 · Fiordos: layered walls of rock over still water --------------------------------
// A polygon path (M/L only, 0–100) upside down: its reflection in the water.
const flipY = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${x} ${100 - Number(y)}`);
// The fjord: [x, y, w, h, colour, path] from the back to the front; water from y = WL down, reflections in it.
const FJORD = [
  [380, 300, 520, 200, '#b5ccd6', 'M0 100 L0 70 L20 40 L35 55 L50 18 L65 50 L80 35 L100 70 L100 100 Z'],
  [-40, 220, 600, 280, '#7fa3b4', 'M0 100 L0 0 L30 15 L55 45 L75 75 L100 100 Z'],
  [720, 240, 600, 260, '#6a93a6', 'M0 100 L25 75 L45 45 L70 12 L100 0 L100 100 Z'],
  [-60, 110, 530, 390, '#33627a', 'M0 100 L0 0 L22 8 L48 38 L70 70 L100 100 Z'],
  [830, 150, 510, 350, '#264c5e', 'M0 100 L30 70 L52 38 L78 8 L100 0 L100 100 Z']];
// (k: how tall the walls are, 1 = as drawn; their foot stays on the water line WL.)
const fjordScene = (WL = 500, water = ['#4d8aa3', '#163846'], refl = 28, k = 1) => [
  ...FJORD.map(([x, y, w, h, c, d]) => shape('custom', x, Math.round(WL - (500 - y) * k), w, Math.round((500 - y) * k), c, { path: d })),
  shape('rect', -20, WL, 1320, 740 - WL, water[0], { fill2: water[1], gradAngle: 90 }),
  ...FJORD.map(([x, y, w, h, c, d]) => shape('custom', x, WL, w, Math.round((500 - y) * k * 0.55), c, { path: flipY(d), opacity: refl })),
  ...[0, 1, 2, 3].map(i => shape('rect', 120 + i * 260, WL + 30 + i * 34, 180 - i * 20, 3, '#ffffff', { opacity: 25 }))];
// A small coastal ship (170 × 80).
const shipSVG = svgURL(170, 80, '<rect x="70" y="8" width="16" height="20" fill="#2b2b2b"/><rect x="70" y="8" width="16" height="6" fill="#d94b3d"/>'
  + '<rect x="30" y="24" width="100" height="18" rx="3" fill="#ffffff"/><rect x="44" y="12" width="66" height="14" rx="3" fill="#f4f4f4"/>'
  + Array.from({ length: 8 }, (_, i) => `<rect x="${36 + i * 11}" y="29" width="6" height="6" fill="#4a6a7c"/>`).join('')
  + '<path d="M4 42 L166 42 L150 70 L18 70 Z" fill="#1f2f3a"/><rect x="10" y="46" width="148" height="5" fill="#d94b3d"/>');

// ---- 4 · Praga: the astronomical clock, gold on deep blue ----------------------------------
// The clock's dial, built from shapes with fixed ids (so Transform carries it from slide to slide).
const DIAL_IDS = Array.from({ length: 8 }, () => uid());
const dial = (cx, cy, r) => { const B = (i, b) => ({ ...b, id: DIAL_IDS[i] }), d = (k) => Math.round(r * k);
  const box = (k) => [cx - d(k), cy - d(k), d(k) * 2, d(k) * 2];
  return [B(0, shape('ellipse', ...box(1), '#d4a84f', { fill2: '#8a6424', gradType: 'radial' })),
    B(1, shape('ellipse', ...box(0.9), '#1a1410')),
    B(2, shape('ellipse', ...box(0.8), '#3d72a8', { fill2: '#0f1c33', gradType: 'radial' })),
    B(3, shape('custom', ...box(0.8), '#6b3b1f', { path: 'M8 66 C30 60 70 60 92 66 C84 86 68 98 50 98 C32 98 16 86 8 66 Z', opacity: 85 })),
    B(4, shape('ellipse', cx - d(0.56), cy - d(0.72), d(1.12), d(1.12), 'none', { stroke: '#d4a84f', strokeWidth: 3 })),
    B(5, shape('ellipse', ...box(0.16), '#d4a84f', { stroke: '#1a1410', strokeWidth: 2 })),
    B(6, text('XII · I · II · III · IV · V · VI · VII · VIII · IX · X · XI · XII · I · II · III · IV · V · VI · VII · VIII · IX · X · XI · ', ...box(0.98), { fontSize: Math.max(10, d(0.075)), curve: 100, color: '#f3e6cc', textAlign: 'center', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 })),
    B(7, shape('custom', ...box(0.8), '#f0c76a', { path: 'M48.6 50 L48.6 16 L51.4 16 L51.4 50 Z M50 2 L53 8 L59.5 9 L54.8 13.5 L56 20 L50 17 L44 20 L45.2 13.5 L40.5 9 L47 8 Z' }))]; };
// Gothic spires along the bottom of a slide.
const spires = (y, h, color, seed = 5) => { const r = rng(seed); let x = 0, d = 'M0 100';
  while (x < 100) { const w = 2 + r() * 4, top = 10 + r() * 60, base = top + 18 + r() * 20;
    d += ` L${x.toFixed(1)} ${base.toFixed(1)} L${(x + w * 0.3).toFixed(1)} ${base.toFixed(1)} L${(x + w / 2).toFixed(1)} ${top.toFixed(1)} L${(x + w * 0.7).toFixed(1)} ${base.toFixed(1)} L${(x + w).toFixed(1)} ${base.toFixed(1)}`;
    x += w + r() * 3; d += ` L${x.toFixed(1)} ${(80 + r() * 8).toFixed(1)}`; }
  return shape('custom', 0, y, 1280, h, color, { path: d + ' L100 100 Z' }); };

// ---- 5 · El Camino: the pilgrim's credential, stamps and yellow arrows --------------------
// The scallop shell (yellow rays on blue, as on the waymarks): 200 × 200.
const shellSVG = (ray = '#f6c600', ground = '#1f4f9a') => svgURL(200, 200, `<rect width="200" height="200" rx="18" fill="${ground}"/>`
  + Array.from({ length: 9 }, (_, i) => { const a = (-150 + i * 15) * Math.PI / 180; return `<line x1="100" y1="165" x2="${(100 + 85 * Math.cos(a)).toFixed(1)}" y2="${(165 + 85 * Math.sin(a)).toFixed(1)}" stroke="${ray}" stroke-width="9" stroke-linecap="round"/>`; }).join('')
  + `<circle cx="100" cy="165" r="12" fill="${ray}"/>`);
// A stamp of the credential: a ring of ink with the place inside, a little turned.
const stamp = (x, y, d, place, date, ink, rot, hand) => [
  shape('ellipse', x, y, d, d, 'none', { stroke: ink, strokeWidth: 4, rotation: rot, opacity: 85 }),
  shape('ellipse', x + 10, y + 10, d - 20, d - 20, 'none', { stroke: ink, strokeWidth: 1.5, dash: 'dash', rotation: rot, opacity: 85 }),
  text(`<div style="font-size:${Math.round(d * (place.length > 7 ? 0.105 : 0.15))}px;font-weight:800;letter-spacing:1px;white-space:nowrap">${place.toUpperCase()}</div><div style="font-family:${hand};font-size:${Math.round(d * 0.13)}px">${date}</div>`,
    x + 14, y + d * 0.28, d - 28, d * 0.44, { color: ink, textAlign: 'center', vAlign: 'middle', rotation: rot, opacity: 90 })];

// ---- 6 · Cícladas: whitewashed cubes, blue domes and the Greek key --------------------------
// A Greek key border (meander) as one outline, n units across w.
const meander = (x, y, w, h, color, n = 24, sw = 3) => { const u = 100 / n;
  const d = Array.from({ length: n }, (_, i) => { const a = i * u, f = v => (a + v * u).toFixed(2);
    return `M${f(0)} 100 L${f(0)} 0 L${f(0.8)} 0 L${f(0.8)} 72 L${f(0.3)} 72 L${f(0.3)} 36 L${f(0.56)} 36`; }).join(' ');
  return shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: sw }); };
// A village of whitewashed cubes with blue doors and a domed chapel (shapes), its base at (x, y).
const village = (x, y, s = 1, blue = '#1f5fa8') => { const out = [], R = rng(17);
  [[0, 120, 150, 110], [130, 160, 130, 150], [240, 100, 120, 90], [330, 140, 160, 130], [460, 90, 110, 80], [60, 60, 120, 60], [200, 40, 100, 70]].forEach(([dx, h, w, up], i) => {
    const X = x + dx * s, Y = y - up * s - h * s * 0.2, W = w * s, Hh = h * s;
    out.push(shape('rect', X, Y, W, Hh, '#ffffff', { stroke: '#d9e2ea', strokeWidth: 1 }), shape('rect', X + W * 0.78, Y, W * 0.22, Hh, '#e3eaf1'));
    out.push(shape('rect', X + W * 0.2, Y + Hh * 0.45, W * 0.16, Hh * 0.55, i % 3 ? blue : '#2a8c8c'));
    if (R() > 0.3) out.push(shape('rect', X + W * 0.5, Y + Hh * 0.3, W * 0.14, W * 0.14, blue)); });
  const cx = x + 400 * s, cy = y - 240 * s;
  out.push(shape('rect', cx, cy, 110 * s, 120 * s, '#ffffff', { stroke: '#d9e2ea', strokeWidth: 1 }),
    shape('custom', cx - 5 * s, cy - 60 * s, 120 * s, 62 * s, blue, { path: 'M0 100 C0 40 22 0 50 0 C78 0 100 40 100 100 Z' }),
    shape('rect', cx + 52 * s, cy - 84 * s, 6 * s, 28 * s, '#ffffff'), shape('rect', cx + 44 * s, cy - 76 * s, 22 * s, 6 * s, '#ffffff'),
    shape('rect', cx + 40 * s, cy + 50 * s, 30 * s, 70 * s, blue));
  return out; };

// ---- 7 · Escocia: tartan, heather and castles --------------------------------------------
// A tartan: wide and thin bands, across and down, semi-transparent so they weave.
const tartan = (x0, y0, w, h, base, bands, period = 300) => { const out = [shape('rect', x0, y0, w, h, base)];
  for (let p = -period; p < Math.max(w, h) + period; p += period) for (const [o, t, c, op] of bands) {
    if (p + o < h) out.push(shape('rect', x0, y0 + p + o, w, t, c, { opacity: op }));
    if (p + o < w) out.push(shape('rect', x0 + p + o, y0, t, h, c, { opacity: op })); }
  return out.filter(b => b.y < y0 + h && b.x < x0 + w && b.y + b.h > y0 && b.x + b.w > x0); };
// A castle's outline (battlements and towers), 0–100.
const CASTLE = 'M0 100 L0 40 L4 40 L4 34 L8 34 L8 40 L12 40 L12 34 L16 34 L16 40 L20 40 L20 10 L24 10 L24 4 L28 4 L28 10 L32 10 L32 4 L36 4 L36 10 L40 10 L40 50 L60 50 L60 30 L64 30 L64 24 L68 24 L68 30 L72 30 L72 24 L76 24 L76 30 L80 30 L80 20 L86 12 L92 20 L92 46 L100 46 L100 100 Z';

// ---- 9 · Ámsterdam: canal houses with their gables -----------------------------------------
const GABLES = { step: 'M0 100 L0 30 L14 30 L14 21 L28 21 L28 12 L40 12 L40 0 L60 0 L60 12 L72 12 L72 21 L86 21 L86 30 L100 30 L100 100 Z',
  bell: 'M0 100 L0 34 C10 34 16 26 24 20 C28 6 40 0 50 0 C60 0 72 6 76 20 C84 26 90 34 100 34 L100 100 Z',
  neck: 'M0 100 L0 40 L22 40 C22 30 26 24 26 8 L74 8 C74 24 78 30 78 40 L100 40 L100 100 Z',
  spout: 'M0 100 L0 30 L50 0 L100 30 L100 100 Z' };
// One house: its body with the gable, windows in rows and a door; (x, base) is its bottom-left corner.
const canalHouse = (x, baseY, w, h, color, gable, trim = '#f4efe6') => { const floors = Math.max(3, Math.round(h / 75)), out = [
  shape('custom', x, baseY - h, w, h, color, { path: GABLES[gable] })];
  for (let f = 0; f < floors; f++) for (let k = 0; k < 2; k++) { const wx = x + w * (0.18 + k * 0.42), wy = baseY - h * 0.62 + f * (h * 0.5 / floors);
    out.push(shape('rect', wx, wy, w * 0.22, h * 0.5 / floors * 0.7, trim), shape('rect', wx + w * 0.03, wy + 3, w * 0.16, h * 0.5 / floors * 0.7 - 6, '#2b3440')); }
  out.push(shape('rect', x + w * 0.4, baseY - h * 0.14, w * 0.2, h * 0.14, '#3a2418'), shape('rect', x + w * 0.47, baseY - h + h * 0.1, w * 0.06, h * 0.05, trim));
  return out; };
const ROW = [[0, 150, 330, '#8b3a2b', 'step'], [150, 120, 290, '#3b4a5a', 'bell'], [270, 140, 360, '#b5651d', 'neck'], [410, 130, 300, '#6b2f3a', 'spout'],
  [540, 150, 340, '#2f5d50', 'step'], [690, 120, 280, '#a8462f', 'bell'], [810, 150, 350, '#46392f', 'neck'], [960, 130, 310, '#c08a3e', 'step'], [1090, 190, 330, '#5b3a4a', 'bell']];

// ---- (the rest of the drawings are made inside each deck) ------------------------------

export default {
  // ---------------------------------------------------------------------------------
  // 1 · Lisbon in four days: azulejo tiles, the yellow tram climbing the hills along a
  // drawn route, the height profile, the districts, fado, a vote and a budget.
  life_travel_eu_lisbon: { name: 'Lisboa: colinas y tranvías', cat: 'life',
    summary: 'Azulejos en SVG, tranvía que sube las colinas por un recorrido con sonido, perfil de altura, cartas que giran, tabla con fórmulas y huecos',
    make: () => {
      const CREAM = '#f8f4ea', INK = '#1c2a3f', NIGHT = '#0f1a2e', OCHRE = '#d98e04', ROSE = '#e8a598';
      const head = pairStacks('classic').heading;
      // The hills with houses and the line of tram 28 (1100 × 420, at 90,190 on the slide).
      const line = [[40, 300], [170, 150], [300, 110], [430, 210], [560, 330], [690, 230], [820, 160], [950, 140], [1060, 120]];
      const R = rng(7), houses = [];
      for (let i = 0; i < 46; i++) { const x = 20 + i * 23 + R() * 8, k = Math.min(line.length - 2, Math.floor((x - 40) / 130 + 0.0001)), [x0, y0] = line[Math.max(0, k)], [x1, y1] = line[Math.max(0, k) + 1];
        const y = y0 + (y1 - y0) * Math.max(0, Math.min(1, (x - x0) / (x1 - x0))) + 18 + R() * 40, h = 30 + R() * 34;
        houses.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="22" height="${h.toFixed(0)}" fill="${['#f4d8a8', '#f1b9a6', '#e6e1d3', '#f7e7b4', '#b9cfe6', '#f3c9a0'][i % 6]}"/>`
          + `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l11 -9 l11 9z" fill="#c4612f"/><rect x="${(x + 7).toFixed(0)}" y="${(y + 9).toFixed(0)}" width="7" height="9" fill="#5d6f85"/>`); }
      const pts = line.map(p => p.join(',')).join(' ');
      const hills = svgURL(1100, 420, `<rect width="1100" height="420" fill="#eaf1fa"/><circle cx="960" cy="70" r="40" fill="#ffd77a"/>`
        + `<path d="M0 420 L0 320 C120 180 220 90 320 110 S480 300 560 330 S760 150 900 140 S1060 110 1100 120 V420Z" fill="#d6e2c3"/>` + houses.join('')
        + `<polyline points="${pts}" fill="none" stroke="#7a6a55" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/>`
        + `<path d="M0 420 L0 400 C300 380 700 405 1100 390 V420Z" fill="#8fb6e0"/>`);
      const stops = [['Martim Moniz', 0], ['Graça', 2], ['Sé', 3], ['Baixa', 4], ['Chiado', 5], ['Estrela', 7], ['Prazeres', 8]];
      const OX = 90, OY = 190;
      const tramW = 150, tramH = 80;
      const tramPath = line.slice(1).map(([x, y]) => [x - line[0][0], y - line[0][1]]);
      const deck = build({ name: 'Lisboa en cuatro días', palette: 'office', fonts: 'classic', title: { size: 50, color: AZ }, body: { color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          img(azulejos(520, 720, 130), 0, 0, 520, 720, { alt: 'Azulejos azules y blancos', decorative: true }),
          shape('ellipse', 110, 210, 300, 300, '#ffffff', { stroke: AZ, strokeWidth: 6 }),
          text('7 colinas · 1 tranvía · 7 colinas · 1 tranvía · ', 110, 210, 300, 300, { fontSize: 24, curve: 100, color: AZ, textAlign: 'center', fontWeight: 700 }),
          text('28', 160, 300, 200, 120, { fontFamily: head, fontSize: 110, color: OCHRE, textAlign: 'center', vAlign: 'middle' }),
          kicker('GUÍA DE VIAJE · PRIMAVERA', 600, 150, 600, '#9a5a00'),
          text('Lisboa', 590, 190, 640, 190, { fontFamily: head, fontSize: 150, color: INK }),
          text('Cuatro días entre colinas, tranvías amarillos y miradores al Tajo', 600, 390, 600, 110, { fontSize: 32, fontStyle: 'italic', color: '#41506a' }),
          shape('rect', 600, 520, 120, 6, AZ), shape('rect', 724, 520, 60, 6, TRAM),
          withAnims(img(tramSVG, 1300, 560, 225, 120, { alt: 'Tranvía amarillo', decorative: true }), path([[-120, 0], [-330, 0], [-690, 0]], { start: 'afterPrev', duration: 2600, sound: 'click', delay: 400 }))],
          notes: 'Portada: el panel de azulejos es un dibujo SVG que se repite como un patrón; el texto curvo rodea el medallón. El tranvía entra solo por la derecha (trayectoria que empieza al llegar, con sonido de clic).' },
        { title: 'La ruta del 28, de punta a punta', layout: 'titleOnly', bg: CREAM, extra: [
          img(hills, OX, OY, 1100, 420, { alt: 'Colinas de Lisboa con la línea del tranvía 28', radius: 14 }),
          ...stops.flatMap(([n, k], i) => { const [x, y] = line[k];
            return [shape('ellipse', OX + x - 9, OY + y - 9, 18, 18, i === 0 || i === stops.length - 1 ? OCHRE : AZ, { stroke: '#ffffff', strokeWidth: 3 }),
              text(n, OX + x - 75, OY + y + (i % 2 || !i ? 18 : -50), 150, 32, { fontSize: 18, fontWeight: 700, color: INK, textAlign: 'center', bg: '#ffffffe6', radius: 16, vAlign: 'middle' })]; }),
          withAnims(img(tramSVG, OX + line[0][0] - tramW / 2, OY + line[0][1] - tramH + 6, tramW, tramH, { alt: 'Tranvía 28' }), path(tramPath, { duration: 7000, sound: 'click' })),
          text('Clic: el tranvía recorre la ciudad. Unos 40 minutos de trayecto si no hay atasco.', OX, 625, 1100, 40, { fontSize: 22, fontStyle: 'italic', color: '#5c6b82', textAlign: 'center' })],
          notes: 'Con un clic, el tranvía hace la ruta subiendo y bajando las colinas (Animaciones ▸ Trayectoria personalizada, con sonido). El dibujo de colinas y casas es un SVG hecho para esta plantilla; el trazado es aproximado.' },
        { title: 'Sube, baja, vuelve a subir', layout: 'titleOnly', bg: '#ffffff', extra: [
          chartBlock({ x: 90, y: 180, w: 720, h: 440, chartType: 'area', color: AZ, seriesName: 'Altura (m)', grid: true, yTitle: 'Metros sobre el Tajo',
            data: [['M. Moniz', 20], ['Graça', 90], ['Sé', 50], ['Baixa', 10], ['Chiado', 60], ['Estrela', 70], ['Prazeres', 80]].map(([label, value]) => ({ label, value })) }),
          shape('rounded', 860, 190, 330, 420, '#eef3fb', { radius: 20 }),
          at(text('<div style="font-size:92px;font-weight:700;color:#1d4f91;line-height:1">140 m</div><div style="margin-top:10px">de subida acumulada en un solo viaje</div>', 885, 220, 280, 230, { fontSize: 26, color: INK, fontFamily: head }), 'zoom-in', { start: 'afterPrev' }),
          at(text('Calzado con suela que agarre: el empedrado blanco y negro resbala cuando llueve.', 885, 460, 280, 130, { fontSize: 22, color: '#41506a' }), 'fade-up', { start: 'afterPrev' })],
          notes: 'Gráfico de área con el perfil de alturas de la ruta (cifras aproximadas, redondeadas). La cifra grande y el consejo aparecen solos al llegar.' },
        { title: 'Cuatro barrios, cuatro caracteres', layout: 'titleOnly', bg: CREAM, extra: [
          ...[['Alfama', 'Callejones moriscos, ropa tendida y fado detrás de cada puerta.', AZ], ['Baixa', 'La cuadrícula que se reconstruyó tras el terremoto de 1755.', OCHRE],
            ['Bairro Alto', 'De día, silencio; de noche, la calle entera es un bar.', '#b0413e'], ['Belém', 'El monasterio, la torre junto al río y los pasteles de crema.', '#2f7d6d']].flatMap(([n, d, c], i) => {
            const x = 90 + (i % 2) * 560, y = 180 + Math.floor(i / 2) * 230;
            return together([shape('rounded', x, y, 530, 205, '#ffffff', { radius: 16, stroke: '#dfe5ee', strokeWidth: 1, shadow: { x: 0, y: 6, blur: 16, color: '#1d4f9122' } }),
              img(azulejos(110, 205, 55, c), x, y, 110, 205, { alt: '', decorative: true, radius: 16 }),
              text(`<div style="font-family:${head};font-size:38px;color:${c}">${n}</div><div style="margin-top:6px">${d}</div>`, x + 135, y + 18, 375, 170, { fontSize: 23, color: INK, vAlign: 'middle' })], 'flip', 'click', { duration: 700 }); })],
          notes: 'Cada tarjeta entra girando (efecto Voltear) con un clic. La franja de azulejos de cada una usa el mismo dibujo con otro color.' },
        { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', extra: [
          glow(780, -200, 760, '#3b5f9a', NIGHT, 45), shape('ellipse', 1010, 90, 90, 90, '#f6e7b8', { opacity: 90 }),
          text('fado · saudade · fado · saudade · ', 925, 5, 260, 260, { fontSize: 20, curve: 100, color: '#8fa7cf', textAlign: 'center' }),
          at(text('«Saudade: echar de menos algo que quizá nunca llegaste a tener.»', 120, 200, 860, 260, { fontFamily: head, fontSize: 54, fontStyle: 'italic', color: '#f3efe4', lineHeight: 1.25 }), 'fade-in', { start: 'afterPrev', duration: 1800 }),
          shape('rect', 124, 490, 80, 4, TRAM),
          at(text('Una casa de fado en Alfama: cena a partir de las 20:30 y silencio absoluto mientras se canta.', 124, 515, 760, 90, { fontSize: 26, color: '#b8c4d8' }), 'fade-in', { start: 'afterPrev', duration: 1200 })],
          notes: 'Diapositiva de pausa: fondo de noche, luna y texto curvo a su alrededor. La cita y la frase aparecen despacio, solas. Buen momento para poner treinta segundos de fado.' },
        { layout: 'blank', bg: '#ffffff', extra: [
          img(azulejos(1280, 60, 60), 0, 0, 1280, 60, { alt: '', decorative: true }),
          pollBlock({ kind: 'choice', display: 'bar', fontSize: 34, question: '¿A qué mirador subimos para ver el atardecer?', x: 90, y: 100, w: 1100, h: 560,
            options: ['Senhora do Monte, el más alto', 'Santa Luzia, con buganvillas', 'São Pedro de Alcântara, con quioscos', 'Portas do Sol, sobre Alfama'] })],
          notes: 'Votación en directo: el grupo decide desde el móvil (escaneando el QR). Los resultados salen en barras.' },
        { title: 'Presupuesto por persona', layout: 'titleOnly', bg: CREAM, extra: [
          tableBlock({ x: 90, y: 180, w: 640, h: 420, fontSize: 23, header: true, headBg: AZ, headFg: '#ffffff', stroke: '#c9d3e3', banded: true, band: AZ2,
            rows: [['Concepto', '€ unidad', 'Veces', 'Total €'], ['Vuelo ida y vuelta', '140', '1', '=B2*C2'], ['Apartamento compartido (noche)', '55', '4', '=B3*C3'],
              ['Pase de transporte (día)', '7', '4', '=B4*C4'], ['Comidas (día)', '35', '4', '=B5*C5'], ['Museos y miradores', '30', '1', '=B6*C6'], ['Pasteles de crema', '1,5', '8', '=B7*C7'], ['<b>Total</b>', '', '', '=SUMA(ARRIBA)']], colW: [5, 2, 2, 2] }),
          chartBlock({ x: 770, y: 180, w: 420, h: 330, chartType: 'hbar', color: AZ, dataLabels: true,
            data: [['Alojamiento', 220], ['Vuelo', 140], ['Comidas', 140], ['Transporte', 28], ['Museos', 30], ['Pasteles', 12]].map(([label, value]) => ({ label, value })) }),
          text('Ocho pasteles en cuatro días es <b>la cantidad mínima razonable</b>.', 770, 530, 420, 80, { fontSize: 22, color: '#41506a', fontStyle: 'italic' })],
          notes: 'La tabla calcula sola: cada fila multiplica precio por veces y la última suma la columna (=SUMA(ARRIBA)). Precios inventados y orientativos.' },
        { layout: 'blank', bg: '#ffffff', extra: [
          shape('rect', 0, 0, 1280, 60, AZ),
          pollBlock({ kind: 'gaps', fontSize: 32, question: 'Completa la receta del pastel de crema', x: 90, y: 100, w: 1100, h: 560,
            text: 'Una base de [hojaldre] muy fino, crema de yema de [huevo] y, al servir, [canela] y azúcar glas por encima. Se comen [templados].' })],
          notes: 'Actividad de rellenar huecos desde el móvil: cada uno escribe las palabras que faltan y Revela corrige.' },
        { layout: 'blank', bg: CREAM, transition: 'page', extra: [
          img(azulejos(1280, 720, 120), 0, 0, 1280, 720, { alt: '', decorative: true }),
          shape('rounded', 290, 170, 700, 380, '#ffffff', { radius: 24, stroke: AZ, strokeWidth: 6, shadow: { x: 0, y: 12, blur: 30, color: '#0f1a2e44' } }),
          text('Até já, Lisboa!', 320, 220, 640, 130, { fontFamily: head, fontSize: 84, color: AZ, textAlign: 'center' }),
          text('«¡Hasta pronto!» · Vuelo el viernes a las 7:10', 320, 360, 640, 50, { fontSize: 26, color: INK, textAlign: 'center' }),
          withAnims(img(tramSVG, 560, 430, 160, 85, { alt: 'Tranvía' }), A('bounce', { start: 'afterPrev', sound: 'click' }))],
          notes: 'Cierre con transición «Página». El tranvía aparece con un pequeño salto y su campanilla.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 2 · Iceland by car: auroras and stars, the ring road drawn on a map with a light
  // going round, stages in a table, a 3D car, fire and ice, wind chill, daylight and a fox.
  life_travel_eu_iceland: { name: 'Islandia: la Ring Road en coche', cat: 'life',
    summary: 'Auroras con degradados, mapa con recorrido que suena, coche 3D, cifras con redoble, ecuación del frío, zorro que camina y concurso',
    make: () => {
      const NIGHT = '#060b16', AUR = '#3dffa8', VIO = '#8f6bff', ICE = '#bfe9ff', LAVA = '#ff6a3d', FG = '#e6ecf5', DIM = '#8d9bb5';
      const H = pairStacks('bold').heading;
      const sx = 640 / 600, OX = 90, OY = 175;                 // (the map on the slide)
      const ringPts = RING.map(([, x, y]) => [x * sx, y * sx]);
      const map = svgURL(600, 420, `<path d="${ICELAND}" fill="#16233a" stroke="#3a5274" stroke-width="2"/>`
        + `<path d="M230 200 C260 170 300 175 320 205 C300 230 260 235 230 200Z" fill="#dcefff" opacity=".55"/><path d="M380 250 C420 230 470 245 480 280 C450 300 400 295 380 250Z" fill="#dcefff" opacity=".7"/>`
        + `<polygon points="${RING.map(([, x, y]) => x + ',' + y).join(' ')}" fill="none" stroke="${AUR}" stroke-width="4" stroke-dasharray="10 7" stroke-linejoin="round" opacity=".85"/>`
        + `<text x="300" y="215" font-family="sans-serif" font-size="13" fill="#9fc6e8" text-anchor="middle">Langjökull</text><text x="432" y="276" font-family="sans-serif" font-size="13" fill="#2b4b6e" text-anchor="middle">Vatnajökull</text>`);
      const ring = [...ringPts.slice(1), ringPts[0]].map(([x, y]) => [Math.round(x - ringPts[0][0]), Math.round(y - ringPts[0][1])]);
      const sky = () => [...stars(70, 11), aurora(-60, 0, 900, 380, AUR, NIGHT, 55), aurora(500, 0, 860, 330, VIO, NIGHT, 45, 1)];
      const deck = build({ name: 'Islandia: la Ring Road', palette: 'midnight', fonts: 'bold', title: { size: 64, color: FG, bold: false }, body: { color: FG } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', extra: [
          ...stars(90, 3),
          at(aurora(-80, -20, 980, 420, AUR, NIGHT, 65), 'fade-in', { start: 'afterPrev', duration: 2500 }),
          at(aurora(420, -20, 940, 360, VIO, NIGHT, 50, 1), 'fade-in', { start: 'withPrev', duration: 3200, delay: 600 }),
          shape('custom', 0, 470, 1280, 250, '#020409', { path: 'M0 100 L0 58 L10 44 L20 54 L34 22 L46 46 L58 36 L70 56 L84 34 L100 52 L100 100 Z' }),
          kicker('VIAJE EN COCHE · SEPTIEMBRE', 92, 180, 700, AUR, 22),
          text('ISLANDIA', 80, 210, 900, 230, { fontFamily: H, fontSize: 220, wordart: 'neon', wordartColor: AUR, lineHeight: 1 }),
          text('Diez días alrededor de la isla por la carretera 1', 92, 440, 900, 60, { fontSize: 34, color: FG })],
          notes: 'Las auroras son formas con degradado del verde (o violeta) al color de la noche, que aparecen despacio solas. Las estrellas y las montañas también son formas. Text Art «Neón» con color propio.' },
        { title: 'LA RING ROAD', layout: 'titleOnly', bg: NIGHT, extra: [
          img(map, OX, OY, 640, 448, { alt: 'Mapa de Islandia con la carretera de circunvalación' }),
          ...RING.map(([n, x, y], i) => shape('ellipse', OX + x * sx - 7, OY + y * sx - 7, 14, 14, i ? ICE : AUR, { stroke: NIGHT, strokeWidth: 2 })),
          withAnims(shape('ellipse', OX + ringPts[0][0] - 14, OY + ringPts[0][1] - 14, 28, 28, AUR, { fill2: NIGHT, gradType: 'radial' }), path(ring, { duration: 6000, sound: 'whoosh' })),
          ...chain(RING.slice(0, 8).map(([n], i) => text(`<span style="color:${AUR};font-family:${H};font-size:30px">${String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;${n}`, 800, 180 + i * 56, 390, 50, { fontSize: 27, color: FG, vAlign: 'middle' })),
            'fade-left', 'click', { duration: 350 }),
          text('1.322 km · unas 17 h de volante', 800, 640, 390, 36, { fontSize: 20, color: DIM, letterSpacing: 2 })],
          notes: 'Primer clic: una luz recorre la carretera 1 alrededor de la isla (trayectoria con silbido). Segundo clic: las paradas aparecen una tras otra. El mapa es un dibujo aproximado hecho para esta plantilla.' },
        { title: 'ETAPAS', layout: 'titleOnly', bg: '#0b1220', extra: [
          tableBlock({ x: 90, y: 175, w: 620, h: 450, fontSize: 23, header: true, headBg: '#1d6b55', headFg: '#ffffff', stroke: '#2a3a55', banded: true, band: '#1f3354', color: FG,
            rows: [['Tramo', 'Km', 'Horas'], ['Reikiavik → Vík', '187', '2,5'], ['Vík → Jökulsárlón', '190', '2,5'], ['Jökulsárlón → Egilsstaðir', '250', '3,5'],
              ['Egilsstaðir → Mývatn', '165', '2'], ['Mývatn → Akureyri', '100', '1,3'], ['Akureyri → Reikiavik', '390', '5'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [5, 2, 2] }),
          glow(760, 200, 440, '#1d6b55', '#0b1220', 60),
          m3d('kh-CarConcept', 740, 190, 480, 330, { view: 'three', arrive: 'turn', bleed: true, edge: 'free' }),
          text('En verano basta un coche normal. El 4×4 solo hace falta para las pistas «F» del interior.', 760, 530, 440, 90, { fontSize: 22, color: DIM }),
          credits(['kh-CarConcept'], 90, 650, 1100, '#4b5a75', 11)],
          notes: 'La fila Total suma cada columna con =SUMA(ARRIBA). El coche 3D da una vuelta al llegar a la diapositiva. Distancias y tiempos aproximados, sin paradas.' },
        { layout: 'blank', bg: NIGHT, transition: 'split', extra: [
          shape('rect', 0, 0, 640, 720, LAVA, { fill2: '#5c0d05', gradAngle: 90 }), shape('rect', 640, 0, 640, 720, '#eef9ff', { fill2: '#7cc0e6', gradAngle: 90 }),
          shape('custom', 600, 0, 80, 720, '#0b0b0b', { path: 'M40 0 L60 12 L30 26 L64 40 L28 55 L60 70 L34 84 L52 100 L48 100 L28 84 L54 70 L22 55 L56 40 L22 26 L52 12 L36 0 Z' }),
          kicker('FUEGO', 90, 110, 400, '#ffd8c8', 26), kicker('HIELO', 730, 110, 400, '#11456b', 26),
          at(text('<div style="font-family:' + H + ';font-size:190px;line-height:1">30</div><div>sistemas volcánicos activos, más o menos</div>', 90, 170, 470, 360, { fontSize: 32, color: '#ffffff' }), 'zoom-in', { sound: 'drumroll', duration: 900 }),
          at(text('<div style="font-family:' + H + ';font-size:190px;line-height:1">11 %</div><div>del país está cubierto por glaciares</div>', 730, 170, 470, 360, { fontSize: 32, color: '#0d3352' }), 'zoom-in', { sound: 'drumroll', duration: 900 }),
          text('Una isla joven: aún se está formando sobre la dorsal atlántica.', 90, 590, 1100, 50, { fontSize: 26, color: '#ffffff', textAlign: 'center', bg: '#00000066', radius: 25 })],
          notes: 'Dos mitades con degradado y una grieta en zigzag (forma libre). Cada clic hace aparecer una cifra con redoble. Cifras redondeadas y orientativas.' },
        { title: '¿CUÁNTO FRÍO HACE DE VERDAD?', layout: 'titleOnly', bg: '#0b1220', extra: [
          text('La sensación térmica junta temperatura (<i>T</i>, en °C) y viento (<i>v</i>, en km/h):', 90, 170, 1100, 44, { fontSize: 26, color: DIM }),
          mathBlock({ x: 90, y: 225, w: 1100, h: 90, fontSize: 38, color: ICE, latex: 'T_s = 13{,}12 + 0{,}6215\\,T - 11{,}37\\,v^{0{,}16} + 0{,}3965\\,T\\,v^{0{,}16}' }),
          at(mathBlock({ x: 90, y: 330, w: 1100, h: 80, fontSize: 34, color: AUR, latex: 'T = 2\\,°\\mathrm{C},\\quad  v = 40\\,\\mathrm{km/h} \\quad \\Rightarrow\\quad  T_s \\approx -5\\,°\\mathrm{C}' }), 'fade-up'),
          ...chain([['Capa base', 'Lana merina, pegada al cuerpo', '#2b4f7a'], ['Capa media', 'Forro polar o plumón fino', '#2f6f8f'], ['Capa exterior', 'Chaqueta impermeable y cortavientos', '#1d6b55']].map(([h, d, c], i) =>
            card(`<b style="font-family:${H};font-size:34px;letter-spacing:1px">${h}</b><br>${d}`, 90 + i * 375, 450, 350, 160, c, { fontSize: 22, color: '#ffffff', radius: 14 })), 'fade-up', 'click')],
          notes: 'Ecuación de la sensación térmica (fórmula canadiense y estadounidense, con T en °C y v en km/h). Clic: el ejemplo con viento normal de la costa sur; otro clic: las tres capas de ropa, una tras otra.' },
        { title: 'HORAS DE LUZ EN REIKIAVIK', layout: 'titleOnly', bg: NIGHT, extra: [
          shape('rounded', 90, 175, 1100, 400, '#0f1a2e', { radius: 16 }),
          chartBlock({ x: 110, y: 190, w: 1060, h: 370, chartType: 'line', color: '#ffd166', seriesName: 'Horas de sol sobre el horizonte', grid: true, dataLabels: true,
            data: [['Ene', 4.5], ['Feb', 7.5], ['Mar', 11.5], ['Abr', 15], ['May', 19], ['Jun', 21.5], ['Jul', 20], ['Ago', 16.5], ['Sep', 12.7], ['Oct', 9], ['Nov', 5.7], ['Dic', 4.2]].map(([label, value]) => ({ label, value })) }),
          text(`<span style="color:${AUR}">●</span> Temporada de auroras: de septiembre a marzo, con noche cerrada y cielo despejado.`, 90, 600, 1100, 44, { fontSize: 24, color: FG, textAlign: 'center' })],
          notes: 'Gráfico de líneas con etiquetas de datos: casi 22 horas de luz en junio y apenas 4 en diciembre (valores aproximados). Septiembre es buen equilibrio: aún hay luz para conducir y ya hay noches para ver auroras.' },
        { layout: 'blank', bg: '#101317', extra: [
          shape('rect', 0, 520, 1280, 200, '#16181c', { fill2: '#050607', gradAngle: 90 }),
          ...stars(40, 21, '#ffffff', [0, 0, 1280, 300]),
          text('EL ÚNICO MAMÍFERO TERRESTRE NATIVO', 90, 90, 1100, 40, { fontSize: 24, letterSpacing: 6, color: AUR, fontWeight: 700 }),
          text('El zorro ártico', 86, 130, 700, 110, { fontFamily: H, fontSize: 96, color: FG }),
          text(ul('No salgas de los senderos: el musgo tarda décadas en volver a crecer.', 'No des de comer a los animales.', 'Las playas negras tienen olas traicioneras: nunca de espaldas al mar.'), 90, 250, 660, 260, { fontSize: 25, color: FG }),
          withAnims(model('kh-Fox', 30, 400, 380, 300, { walk: { clip: 'Walk', face: true }, caption: '' }), path([[300, 0], [620, -10], [860, 0]], { duration: 7000 })),
          credits(['kh-Fox'], 90, 680, 1100, '#5b6577', 11)],
          notes: 'Clic: el zorro 3D camina por la playa de arena negra (animación «Walk» mientras recorre la trayectoria). Normas básicas para moverse por la naturaleza islandesa.' },
        { layout: 'blank', bg: NIGHT, extra: [
          aurora(-40, -40, 1360, 260, AUR, NIGHT, 35),
          pollBlock({ kind: 'quiz', fontSize: 38, question: '¿Qué significa «Jökulsárlón»?', options: ['Laguna del río del glaciar', 'Volcán dormido', 'Cascada del arcoíris', 'Playa de arena negra'], correct: [0], time: 20, x: 90, y: 90, w: 1100, h: 560 })],
          notes: 'Concurso desde el móvil, con puntos por acertar y por rapidez. Jökull = glaciar, á = río, lón = laguna.' },
        { layout: 'blank', bg: '#0b1220', extra: [
          shape('rect', 0, 600, 1280, 120, '#1e2a22'),
          shape('custom', 150, 260, 220, 350, '#e8f6ff', { path: 'M44 100 C40 70 30 40 20 10 C34 18 42 6 50 0 C58 6 66 18 80 10 C70 40 60 70 56 100 Z', opacity: 90, fill2: '#7ac4f0', gradAngle: 90 }),
          ...[[130, 220, 80], [300, 200, 70], [220, 160, 90], [90, 300, 60], [360, 280, 60]].map(([x, y, d], i) => shape('ellipse', x, y, d, d * 0.8, '#ffffff', { opacity: 25 + i * 8 })),
          text('STROKKUR', 520, 150, 660, 100, { fontFamily: H, fontSize: 90, color: FG }),
          text('Este géiser lanza agua hirviendo a 20 metros cada pocos minutos. ¿Aguantas sin mirar el móvil?', 520, 250, 660, 120, { fontSize: 28, color: DIM }),
          timer(240, 600, 400, 200, { style: 'digital', color: AUR, endText: '¡Ahora!' }),
          text('minutos de espera media (más o menos)', 820, 470, 360, 70, { fontSize: 22, color: DIM })],
          notes: 'Cuenta atrás digital de 4 minutos que empieza sola: el ritmo aproximado del géiser. Ideal para hacer una pausa con el grupo.' },
        { layout: 'section', bg: NIGHT, title: 'GÓÐA FERÐ!', subtitle: '«¡Buen viaje!» · Salida el 6 de septiembre', transition: 'zoom', back: [...sky()],
          notes: 'Cierre con el cielo de la portada. Góða ferð se pronuncia más o menos «goza ferz».' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, fontSize: 130, wordart: 'neon', wordartColor: AUR }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 3 · The Norwegian fjords: a Scandinavian poster of layered rock walls mirrored in
  // the water, a ship that sails in, the fjord's cross-section drawn by hand, charts.
  life_travel_eu_fjords: { name: 'Fiordos noruegos por agua', cat: 'life',
    summary: 'Paisaje por capas con reflejos, barco que navega, corte del fiordo que se dibuja solo, barras, radar, proceso uno a uno y votación múltiple',
    make: () => {
      const SKY = '#e7f0f3', INK = '#16313d', TEAL = '#1f5f78', MID = '#5b7f8f', SUN = '#f4c27a', RED = '#d94b3d';
      // The cross-section of a fjord: a U carved by the ice (ink drawn on a click), the sea inside it.
      const U = Array.from({ length: 41 }, (_, i) => { const t = i / 40, x = t * 600;
        const y = t < 0.12 ? 40 + t * 120 : t > 0.88 ? 40 + (1 - t) * 120 : 54 + 280 * Math.sin(Math.PI * (t - 0.12) / 0.76) ** 0.7; return [Math.round(x), Math.round(y)]; });
      const deck = build({ name: 'Fiordos noruegos', palette: 'ocean', fonts: 'clean', title: { size: 48, color: TEAL }, body: { color: INK } }, [
        { layout: 'blank', bg: SKY, transition: 'fade', extra: [
          shape('ellipse', 960, 110, 130, 130, SUN, { fill2: '#fbe3bb', gradType: 'radial' }),
          ...fjordScene(545, undefined, 28, 0.62),
          kicker('NORUEGA · JUNIO', 90, 70, 500, RED, 22),
          text('Fiordos', 84, 100, 700, 160, { fontSize: 140, fontWeight: 800, color: INK, letterSpacing: -4 }),
          text('De Bergen a Geiranger, por agua y por tierra', 90, 262, 700, 50, { fontSize: 30, color: '#28495a' }),
          withAnims(img(shipSVG, 1300, 556, 170, 80, { alt: 'Barco de línea costera', decorative: true }), path([[-300, 6], [-560, 12], [-760, 14]], { start: 'afterPrev', duration: 5000, delay: 300 }))],
          notes: 'Paisaje de cartel escandinavo: cinco paredes de roca (formas libres) de la más lejana y clara a la más cercana y oscura, y su reflejo en el agua (las mismas formas, al revés y transparentes). El barco entra solo.' },
        { title: '¿Qué es exactamente un fiordo?', layout: 'titleOnly', bg: '#ffffff', extra: [
          { ...base(90, 190, 600, 400), type: 'ink', points: U, vw: 600, vh: 400, color: '#3b4b52', width: 8, animation: A('draw', { duration: 2400 }) },
          at(shape('custom', 90, 190, 600, 400, '#4d8aa3', { path: 'M' + U.filter(([, y]) => y >= 48).map(([x, y]) => `${(x / 6).toFixed(1)} ${(y / 4).toFixed(1)}`).join(' L') + ' Z', opacity: 75, fill2: '#163846', gradAngle: 90 }), 'fade-in', { start: 'afterPrev', duration: 1200 }),
          shape('rect', 60, 238, 660, 3, '#4d8aa3'),
          text('nivel del mar', 560, 200, 160, 30, { fontSize: 18, color: '#4d8aa3', fontStyle: 'italic' }),
          ...chain([['1', 'Un glaciar excava un valle en forma de U durante miles de años.'], ['2', 'Al fundirse el hielo, el mar entra y lo inunda.'], ['3', 'Resultado: paredes de más de 1.000 m y aguas de más de 1.000 m de profundidad.']].map(([n, t], i) =>
            text(`<span style="display:inline-block;width:44px;height:44px;border-radius:22px;background:${TEAL};color:#fff;text-align:center;line-height:44px;font-weight:800;margin-right:12px">${n}</span>${t}`, 750, 200 + i * 140, 440, 120, { fontSize: 25, color: INK, vAlign: 'middle' })), 'fade-left', 'click')],
          notes: 'Clic: se dibuja el corte del valle (trazo de tinta con el efecto Dibujar) y después se llena de agua. Otro clic: los tres pasos, uno tras otro. Profundidades de los fiordos más grandes, redondeadas.' },
        { title: 'Los cinco grandes', layout: 'titleOnly', bg: SKY, extra: [
          chartBlock({ x: 90, y: 180, w: 720, h: 450, chartType: 'hbar', color: TEAL, dataLabels: true, xTitle: 'Longitud (km)',
            data: [['Sognefjord', 205], ['Hardangerfjord', 179], ['Trondheimsfjord', 130], ['Storfjord', 110], ['Lysefjord', 42]].map(([label, value]) => ({ label, value })) }),
          card(`<div style="font-size:20px;letter-spacing:4px;color:${RED};font-weight:700">EL MÁS PROFUNDO</div><div style="font-size:64px;font-weight:800;line-height:1.1;color:${INK}">1.308 m</div><div>El Sognefjord, el «rey de los fiordos». Su brazo más estrecho, el Nærøyfjord, mide 250 m de ancho.</div>`,
            850, 200, 340, 400, '#ffffff', { fontSize: 23, color: '#28495a', radius: 6, borderColor: '#cfdfe5' })],
          notes: 'Barras horizontales con etiquetas de datos: longitudes aproximadas. La tarjeta tiene esquinas casi rectas, al estilo escandinavo.' },
        { title: 'Ocho días en cinco tramos', layout: 'titleOnly', bg: '#ffffff', extra: [
          shape('rect', 165, 365, 948, 6, '#cfdfe5'),
          at(shape('rect', 165, 365, 948, 6, TEAL), 'fade-right', { duration: 900 }),
          ...[['Bergen', 'Muelle de madera y funicular', '2 días'], ['Flåm', 'Tren de montaña', '1 día'], ['Nærøyfjord', 'En barco entre paredes', '1 día'], ['Ålesund', 'Ciudad modernista', '2 días'], ['Geiranger', 'Cascadas y miradores', '2 días']].flatMap(([n, d, t], i) => {
            const cx = 165 + i * 237;
            return together([shape('ellipse', cx - 26, 342, 52, 52, i % 2 ? '#ffffff' : TEAL, { stroke: TEAL, strokeWidth: 5 }),
              text(`<b>${n}</b>`, cx - 120, 240, 240, 50, { fontSize: 30, color: INK, textAlign: 'center' }),
              text(t, cx - 120, 290, 240, 34, { fontSize: 20, color: RED, textAlign: 'center', fontWeight: 700, letterSpacing: 2 }),
              text(d, cx - 115, 415, 230, 80, { fontSize: 22, color: MID, textAlign: 'center' })], 'fade-up', 'afterPrev', { duration: 450 }); }),
          text('Bergen ▸ Flåm: 5 h en tren y autobús · Flåm ▸ Gudvangen: 2 h en barco · Ålesund ▸ Geiranger: 3 h en barco de línea', 90, 560, 1100, 70, { fontSize: 22, color: MID, textAlign: 'center' })],
          notes: 'Clic: la línea del viaje se colorea y las cinco paradas aparecen solas, una tras otra (después de la anterior). Duraciones orientativas: comprobad los horarios del año del viaje.' },
        { title: 'Tren, barco o coche', layout: 'titleOnly', bg: SKY, extra: [
          chartBlock({ x: 90, y: 170, w: 620, h: 480, chartType: 'radar', color: TEAL, seriesName: 'Barco',
            data: [['Paisaje', 10], ['Comodidad', 8], ['Flexibilidad', 4], ['Precio', 5], ['Rapidez', 4]].map(([label, value]) => ({ label, value })),
            series: [{ name: 'Tren', values: [8, 9, 3, 6, 7], color: RED }, { name: 'Coche', values: [7, 6, 10, 4, 6], color: '#e0a43c' }] }),
          ...chain([['Barco', 'Lo mejor para ver los fiordos desde dentro. Lleva abrigo: en cubierta sopla.', TEAL], ['Tren', 'Puntual y con vistas; los tramos de montaña son un paseo en sí mismos.', RED],
            ['Coche', 'Libertad total, pero con ferris cortos para cruzar cada fiordo.', '#9a6408']].map(([h, d, c], i) =>
            text(`<b style="color:${c};font-size:30px">${h}</b><br>${d}`, 760, 180 + i * 155, 430, 140, { fontSize: 22, color: INK })), 'fade-up', 'click')],
          notes: 'Radar con tres series, cada una de su color: puntuaciones del 1 al 10 según nuestra experiencia (subjetivas). Clic: el comentario de cada medio.' },
        { layout: 'blank', bg: '#ffffff', extra: [
          text('Dos caminatas famosas', 90, 60, 1100, 70, { fontSize: 48, fontWeight: 800, color: TEAL }),
          ...[['Púlpito', 'Roca plana a 604 m sobre el Lysefjord', [['8 km', 'ida y vuelta'], ['4 h', 'a paso tranquilo'], ['500 m', 'de subida']], '#5f8f7a'],
            ['Lengua del trol', 'Una roca que sobresale sobre el lago', [['27 km', 'ida y vuelta'], ['11 h', 'salid de madrugada'], ['800 m', 'de subida']], RED]].flatMap(([n, d, nums, c], i) => {
            const x = 90 + i * 565;
            return together([shape('custom', x, 160, 535, 120, c, { path: 'M0 100 L0 60 L18 30 L30 48 L48 0 L62 40 L74 22 L100 70 L100 100 Z' }),
              shape('rect', x, 278, 535, 312, c, { opacity: 12 }),
              text(`<b style="font-size:34px;color:${c}">${n}</b><br>${d}`, x + 30, 295, 475, 100, { fontSize: 23, color: INK }),
              ...nums.map(([v, l], k) => text(`<div style="font-size:46px;font-weight:800;color:${INK}">${v}</div><div style="font-size:19px;color:${MID}">${l}</div>`, x + 20 + k * 168, 430, 160, 120, { textAlign: 'center' }))], 'fade-up', 'click', { duration: 700 }); }),
          text('En los dos: botas, agua, comida y mirar la previsión la noche antes. No os acerquéis al borde.', 90, 615, 1100, 34, { fontSize: 20, color: MID, textAlign: 'center' })],
          notes: 'Dos fichas con la silueta de la montaña como cabecera (forma libre). Cifras aproximadas de las rutas habituales.' },
        { title: 'Llueve, pero no tanto', layout: 'titleOnly', bg: SKY, extra: [
          chartBlock({ x: 90, y: 175, w: 760, h: 470, chartType: 'stacked100', color: '#7fa3b4', seriesName: 'Días con lluvia',
            data: [['May', 14], ['Jun', 14], ['Jul', 16], ['Ago', 18], ['Sep', 21]].map(([label, value]) => ({ label, value })), series: [{ name: 'Días secos', values: [17, 16, 15, 13, 9], color: SUN }] }),
          text('<b style="font-size:60px;color:#1f5f78">Junio</b><br>Más horas de luz, menos días de lluvia y las cascadas llenas por el deshielo.', 890, 230, 300, 300, { fontSize: 25, color: INK }),
          text('Datos aproximados de Bergen, la ciudad más lluviosa de la ruta.', 890, 560, 300, 70, { fontSize: 18, color: MID, fontStyle: 'italic' })],
          notes: 'Barras apiladas al 100 %: proporción de días con y sin lluvia en cada mes (cifras orientativas, redondeadas).' },
        { layout: 'blank', bg: '#16313d', extra: [
          ...fjordScene(720, ['#16313d', '#16313d'], 0, 0.35).slice(0, 5).map(b => ({ ...b, opacity: 35 })),
          pollBlock({ kind: 'multi', display: 'bar', fontSize: 32, question: '¿Qué no puede faltar en la mochila?', x: 90, y: 70, w: 1100, h: 470,
            options: ['Chubasquero de verdad', 'Antifaz para dormir con luz', 'Botas ya usadas', 'Bañador (por si acaso)', 'Termo para el café', 'Prismáticos'] })],
          notes: 'Votación de respuesta múltiple: cada uno marca todas las que quiera. Con luz casi toda la noche en junio, el antifaz es más útil de lo que parece.' },
        { layout: 'blank', bg: '#f6dcc0', transition: 'fade', transitionSpeed: 'slow', extra: [
          shape('rect', 0, 0, 1280, 500, '#f2b880', { fill2: '#e7f0f3', gradAngle: 90 }),
          withAnims(shape('ellipse', 760, 150, 130, 130, '#f6a04d', { fill2: '#ffd9a0', gradType: 'radial' }), path([[90, 110], [200, 150], [320, 110], [400, 20]], { duration: 6000 })),
          ...fjordScene(545, ['#e2a36f', '#3a3f55'], 32, 0.62),
          text('God tur!', 90, 60, 600, 130, { fontSize: 110, fontWeight: 800, color: INK, letterSpacing: -3 }),
          text('«¡Buen viaje!» · En junio el sol casi no se pone: roza el horizonte y vuelve a subir.', 90, 195, 600, 90, { fontSize: 26, color: '#3a3f55' })],
          notes: 'Cierre al «atardecer» de junio: clic y el sol baja hasta rozar el horizonte y vuelve a subir (trayectoria personalizada). El mismo paisaje que en la portada, con otros colores de agua.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 4 · Prague: the astronomical clock in shapes (its hand turns, then it moves to the
  // next slide with Transform), the apostles' parade and its countdown, a map to label.
  life_travel_eu_prague: { name: 'Praga, la ciudad de las cien torres', cat: 'life',
    summary: 'Reloj astronómico de formas que gira y viaja con Transformar, desfile con campanilla, cuenta atrás, mapa para etiquetar y tabla',
    make: () => {
      const BURG = '#2a1215', DEEP = '#121c30', GOLD = '#d4a84f', CREAM = '#f3e6cc', DIM = '#c9b38c', RED = '#9c2b2b';
      const H = pairStacks('editorial').heading, CG = FF.cormorant;
      const handOf = blocks => blocks.find(b => b.id === DIAL_IDS[7]);
      const spin = blocks => blocks.map(b => b.id === DIAL_IDS[7] ? withAnims(b, A('spin360', { start: 'afterPrev', duration: 5000, delay: 600 })) : b);
      const map = svgURL(600, 420, '<rect width="600" height="420" fill="#efe3c8"/>'
        + Array.from({ length: 70 }, (_, i) => { const r = rng(40 + i); const x = 20 + r() * 560, y = 20 + r() * 380; return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(14 + r() * 26).toFixed(0)}" height="${(10 + r() * 18).toFixed(0)}" fill="#e2d2b0" transform="rotate(${(r() * 30 - 15).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`; }).join('')
        + '<path d="M60 150 L200 150 L210 100 L60 95 Z" fill="#d9c49a"/><rect x="95" y="105" width="70" height="30" fill="#b89a62"/><path d="M120 105 L130 70 L140 105Z" fill="#8a6a3a"/>'
        + '<path d="M400 0 C330 70 290 120 300 150 C315 200 345 220 335 280 C325 330 295 360 305 420" stroke="#7aa6c8" stroke-width="34" fill="none"/>'
        + '<line x1="282" y1="178" x2="352" y2="186" stroke="#8a6a3a" stroke-width="8"/><circle cx="356" cy="372" r="22" fill="#cdb98f"/>'
        + '<text x="320" y="110" font-family="Georgia,serif" font-size="16" font-style="italic" fill="#3c6c94" transform="rotate(-50 320 110)">Moldava</text>');
      const deck = build({ name: 'Praga en tres días', palette: 'warm', fonts: 'editorial', title: { size: 46, color: GOLD }, body: { color: CREAM } }, [
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          glow(700, -100, 700, '#3d5a8a', DEEP, 50),
          ...spin(dial(930, 330, 250)),
          spires(500, 220, '#070b14'),
          kicker('UN FIN DE SEMANA LARGO · DICIEMBRE', 90, 160, 640, GOLD, 18),
          text('Praga', 84, 190, 640, 170, { fontFamily: H, fontSize: 140, color: CREAM, fontWeight: 700 }),
          text('La ciudad de las cien torres, el río Moldava y un reloj que funciona desde 1410', 90, 370, 580, 130, { fontFamily: CG, fontSize: 34, color: DIM, fontStyle: 'italic' })],
          notes: 'El reloj astronómico está hecho solo con formas: anillos, degradados radiales, una forma libre para la tierra y texto curvo con los números romanos. La aguja del sol da una vuelta sola al llegar (Énfasis ▸ Girar 360°).' },
        { title: 'Cada hora en punto', layout: 'titleOnly', bg: DEEP, autoAnimate: true, extra: [
          ...dial(300, 420, 230),
          ...chain(Array.from({ length: 12 }, (_, i) => { const x = 610 + (i % 6) * 95, y = 190 + Math.floor(i / 6) * 150;
            return shape('custom', x, y, 72, 120, i % 2 ? '#5b2a2e' : '#3a2a4a', { path: 'M0 100 L0 40 C0 10 25 0 50 0 C75 0 100 10 100 40 L100 100 Z', stroke: GOLD, strokeWidth: 2 }); }),
            'zoom-in', 'click', { duration: 260 }).map((b, i) => i ? b : { ...b, animation: { ...b.animation, sound: 'chime' } }),
          text('Los doce apóstoles se asoman por dos ventanas mientras la muerte toca la campana. Al final, canta un gallo.', 610, 500, 560, 110, { fontFamily: CG, fontSize: 28, color: CREAM }),
          timer(45, 1080, 40, 110, { color: GOLD, auto: false, endText: '¡Gallo!' })],
          notes: 'Transformar: el reloj viaja desde la portada hasta aquí. Clic: los doce apóstoles aparecen en cadena con una campanilla. La cuenta atrás de 45 segundos (lo que dura el desfile) se pone en marcha con un clic sobre ella.' },
        { title: 'Seis siglos en cinco fechas', layout: 'titleOnly', bg: BURG, extra: [
          shape('rect', 300, 180, 4, 460, GOLD),
          ...[['1357', 'Se pone la primera piedra del puente de Carlos.'], ['1410', 'Empieza a funcionar el reloj astronómico.'], ['1918', 'Nace Checoslovaquia; Praga es su capital.'],
            ['1989', 'La Revolución de Terciopelo, sin un solo disparo.'], ['1993', 'Separación pacífica: nace la República Checa.']].flatMap(([y, t], i) => together([
            text(y, 90, 180 + i * 92, 180, 70, { fontFamily: H, fontSize: 46, color: GOLD, textAlign: 'right', fontWeight: 700 }),
            shape('ellipse', 292, 202 + i * 92, 20, 20, i === 4 ? RED : GOLD, { stroke: BURG, strokeWidth: 3 }),
            text(t, 340, 186 + i * 92, 840, 60, { fontSize: 28, color: CREAM, vAlign: 'middle' })], 'fade-right', i ? 'afterPrev' : 'click', { duration: 450 }))],
          notes: 'Cronología vertical hecha con formas y texto: un clic y las cinco fechas aparecen en cadena.' },
        { layout: 'blank', bg: DEEP, extra: [
          pollBlock({ kind: 'label', fontSize: 30, question: 'Pon cada barrio en su sitio', image: map, x: 70, y: 60, w: 1140, h: 600,
            options: ['Hradčany (el castillo)', 'Malá Strana', 'Staré Město', 'Josefov', 'Nové Město', 'Vyšehrad'],
            points: [{ x: 22, y: 30 }, { x: 36, y: 50 }, { x: 62, y: 45 }, { x: 58, y: 22 }, { x: 72, y: 68 }, { x: 60, y: 88 }] })],
          notes: 'Actividad de etiquetar una imagen desde el móvil: cada uno coloca los seis barrios. El plano es un dibujo esquemático hecho para la plantilla (el río, el puente y el castillo).' },
        { title: 'Coronas en euros', layout: 'titleOnly', bg: BURG, extra: [
          tableBlock({ x: 90, y: 180, w: 700, h: 430, fontSize: 24, header: true, headBg: GOLD, headFg: BURG, stroke: '#5a3a2a', banded: true, band: '#7a4a2a', color: CREAM,
            rows: [['Qué', 'Coronas', 'Euros'], ['Café en una terraza', '75', '=B2/25'], ['Menú del día con sopa', '260', '=B3/25'], ['Entrada al castillo', '450', '=B4/25'],
              ['Billete de tranvía (90 min)', '40', '=B5/25'], ['Pase de transporte de 3 días', '350', '=B6/25'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [5, 2, 2] }),
          card(`<div style="font-family:${H};font-size:58px;color:${GOLD};line-height:1">1 € ≈ 25 Kč</div><div style="margin-top:16px">Cambio redondo para hacer cuentas de cabeza. Mejor pagar con tarjeta: las casas de cambio del centro cobran comisiones altas.</div>`,
            830, 190, 360, 400, '#00000033', { fontSize: 23, color: CREAM, borderColor: GOLD, radius: 4 })],
          notes: 'Cada fila divide las coronas entre 25 (=B2/25) y la última suma las dos columnas. Precios y tipo de cambio inventados y redondeados: cambiadlos por los del momento.' },
        { layout: 'blank', bg: '#1c2840', extra: [
          shape('rect', 0, 470, 1280, 250, '#2e4a6e', { fill2: '#121c30', gradAngle: 90 }),
          shape('custom', 40, 330, 1200, 170, '#8a7458', { path: 'M0 0 L100 0 L100 100 L96 100 C96 60 88 40 84 40 C80 40 72 60 72 100 L66 100 C66 60 58 40 54 40 C50 40 42 60 42 100 L36 100 C36 60 28 40 24 40 C20 40 12 60 12 100 L4 100 C4 60 2 40 0 40 Z' }),
          ...Array.from({ length: 15 }, (_, i) => withAnims(shape('custom', 54 + i * 79, 246, 34, 86, '#2b2b2b', { path: 'M30 100 L30 40 C20 38 22 18 34 14 C30 4 70 4 66 14 C78 18 80 38 70 40 L70 100 Z' }), A('fade-up', { start: i ? 'withPrev' : 'afterPrev', delay: i * 120, duration: 400 }))),
          text('El puente de Carlos', 90, 70, 800, 80, { fontFamily: H, fontSize: 54, color: CREAM, fontWeight: 700 }),
          ...[['516 m', 'de piedra'], ['16', 'arcos'], ['30', 'estatuas']].map(([n, l], i) =>
            at(text(`<span style="font-family:${H};font-size:54px;color:${GOLD};font-weight:700">${n}</span> <span style="font-size:26px">${l}</span>`, 90 + i * 330, 160, 320, 80, { color: CREAM }), 'zoom-in', { sound: 'pop' })),
          text('Id antes de las 8 de la mañana: a mediodía no se cabe.', 90, 560, 1100, 50, { fontFamily: CG, fontSize: 32, fontStyle: 'italic', color: CREAM, textAlign: 'center' })],
          notes: 'El puente es una sola forma libre con los arcos recortados; las estatuas aparecen solas, una tras otra. Cada clic muestra una cifra con un «pop». Cifras redondeadas.' },
        { title: '¿Cuándo ir?', layout: 'titleOnly', bg: BURG, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'bar', color: GOLD, seriesName: 'Turistas (índice)', combo: true, grid: true,
            data: [['Ene', 40], ['Mar', 55], ['May', 85], ['Jul', 100], ['Sep', 80], ['Nov', 50], ['Dic', 75]].map(([label, value]) => ({ label, value })), series: [{ name: 'Máxima (°C)', values: [1, 9, 19, 25, 19, 7, 2], color: '#e07a5f' }] }),
          text(ul('<b>Diciembre:</b> mercados navideños y frío de verdad.', '<b>Mayo y septiembre:</b> buen tiempo y menos gente.', '<b>Julio:</b> calor y colas.'), 880, 200, 320, 420, { fontSize: 24, color: CREAM })],
          notes: 'Gráfico combinado: las barras son la afluencia de turistas (índice inventado, 100 = el mes con más) y la línea la temperatura máxima media aproximada.' },
        { layout: 'blank', bg: DEEP, extra: [
          spires(560, 160, '#070b14', 9),
          pollBlock({ kind: 'word', fontSize: 34, question: 'Praga en una palabra', options: [], x: 90, y: 70, w: 1100, h: 480 })],
          notes: 'Nube de palabras en directo: las palabras más repetidas se ven más grandes. Buena forma de cerrar la ronda de recuerdos tras el viaje.' },
        { layout: 'section', bg: DEEP, title: 'Na shledanou!', subtitle: '«¡Hasta la vista!» · Vuelo de vuelta el lunes a las 18:40', transition: 'fade', transitionSpeed: 'slow',
          back: [glow(340, 60, 600, '#3d5a8a', DEEP, 45), spires(520, 200, '#070b14', 13)],
          notes: 'Cierre con las torres góticas recortadas sobre la noche (una forma libre generada con alturas al azar, siempre las mismas).' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { fontFamily: H, color: GOLD }); if (b.ph === 'subtitle') Object.assign(b, { fontFamily: CG, color: CREAM, fontStyle: 'italic' }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 5 · The last 100 km of the Camino de Santiago: a waymark stone, the credential that
  // fills with stamps, the stages as a waterfall, a walker in 3D, the backpack rule.
  life_travel_eu_camino: { name: 'Camino de Santiago: de Sarria', cat: 'life',
    summary: 'Credencial que se llena de sellos con sonido, cascada de kilómetros, caminante 3D, ecuación de la mochila, dona y ordenar etapas',
    make: () => {
      const STONE = '#8a877f', MOSS = '#2f4a2c', YEL = '#f6c600', BLUE = '#1f4f9a', PAPER = '#f5ecd7', INK = '#2c2a24', HAND = FF.caveat;
      const H = pairStacks('friendly').heading;
      const INKS = ['#1f4f9a', '#a3322a', '#2f6b3a', '#6b3a8a', '#b5651d', '#1f4f9a'];
      const stages = [['Sarria', 'Portomarín', 22], ['Portomarín', 'Palas de Rei', 25], ['Palas de Rei', 'Arzúa', 29], ['Arzúa', 'O Pedrouzo', 19], ['O Pedrouzo', 'Santiago', 20]];
      const deck = build({ name: 'El Camino: los últimos 100 km', palette: 'forest', fonts: 'friendly', title: { size: 48, color: MOSS }, body: { color: INK } }, [
        { layout: 'blank', bg: '#e9e4d8', transition: 'fade', extra: [
          shape('rect', 0, 560, 1280, 160, '#b9ad8f', { fill2: '#8f8466', gradAngle: 90 }),
          shape('custom', 110, 120, 330, 520, STONE, { path: 'M8 100 L4 14 C4 4 18 0 50 0 C82 0 96 4 96 14 L92 100 Z', fill2: '#6c6962', gradAngle: 0, sketch: true, stroke: '#55524b', strokeWidth: 2 }),
          img(shellSVG(), 175, 180, 200, 200, { alt: 'Concha amarilla sobre azul, la señal del Camino' }),
          shape('rounded', 185, 410, 180, 60, '#ffffff', { radius: 6, stroke: '#55524b', strokeWidth: 2 }),
          text('<b>K. 100,000</b>', 185, 410, 180, 60, { fontSize: 26, color: INK, textAlign: 'center', vAlign: 'middle', fontFamily: "'Oswald', sans-serif" }),
          withAnims(shape('rightarrow', 185, 500, 180, 80, YEL, { sketch: true, stroke: '#c9a200', strokeWidth: 2 }), A('fade-right', { start: 'afterPrev', duration: 900, delay: 300, sound: 'whoosh' })),
          kicker('A PIE · CINCO ETAPAS · SEPTIEMBRE', 540, 170, 660, '#2f6b3a', 20),
          text('El Camino', 530, 200, 700, 150, { fontFamily: H, fontSize: 116, fontWeight: 800, color: MOSS }),
          text('Los últimos 100 kilómetros: de Sarria a Santiago de Compostela', 540, 360, 640, 100, { fontSize: 34, color: INK }),
          text('«Ultreia!» — ¡más allá!', 540, 480, 640, 60, { fontFamily: HAND, fontSize: 44, color: '#a3322a' })],
          notes: 'El mojón está hecho con una forma libre «a mano alzada» y degradado; la concha es un dibujo SVG. La flecha amarilla aparece sola, con un silbido. Ultreia es el saludo medieval de los peregrinos.' },
        { title: 'La credencial, sello a sello', layout: 'titleOnly', bg: '#e9e4d8', extra: [
          shape('rect', 90, 175, 1100, 470, PAPER, { shadow: { x: 0, y: 8, blur: 20, color: '#00000033' } }),
          ...[1, 2].map(i => shape('rect', 90 + i * 367, 175, 2, 470, '#d8c9a6')), shape('rect', 90, 410, 1100, 2, '#d8c9a6'),
          ...stages.map(([a], i) => [a, i]).concat([['Santiago', 5]]).flatMap(([pl, i]) => {
            const x = 90 + (i % 3) * 367, y = 175 + Math.floor(i / 3) * 235, rot = [-8, 6, -4, 10, -12, 4][i];
            return together(stamp(x + 95, y + 25, 180, pl, `${12 + i} de sept.`, INKS[i], rot, HAND), 'zoom-in', 'click', { duration: 250, sound: 'pop' }); }),
          text('Dos sellos al día en los últimos 100 km: en albergues, bares o iglesias.', 90, 650, 1100, 40, { fontSize: 22, color: '#5b5646', textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Cada clic estampa un sello (Zoom, con un «pop»): cada uno es un anillo, un anillo discontinuo y un texto, girados lo mismo. Con la credencial sellada se pide la Compostela en Santiago.' },
        { title: 'Kilómetros que faltan', layout: 'titleOnly', bg: '#ffffff', extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 470, chartType: 'waterfall', color: '#2f6b3a', dataLabels: true,
            data: [{ label: 'Sarria', value: 115 }, ...stages.map(([, b, km]) => ({ label: b === 'Palas de Rei' ? 'Palas' : b === 'O Pedrouzo' ? 'Pedrouzo' : b, value: -km })), { label: 'Meta', value: 0 }] }),
          tableBlock({ x: 830, y: 180, w: 360, h: 380, fontSize: 21, header: true, headBg: MOSS, headFg: '#ffffff', stroke: '#d9d2bf', banded: true, band: '#8d6e63',
            rows: [['Etapa', 'Km'], ...stages.map(([a, b, km]) => [`${a.replace('Palas de Rei', 'Palas')} → ${b.replace('Palas de Rei', 'Palas')}`, String(km)]), ['<b>Total</b>', '=SUMA(ARRIBA)']], colW: [5, 2] }),
          text('Unas 5 horas al día, con paradas.', 830, 575, 360, 90, { fontFamily: HAND, fontSize: 34, color: '#a3322a' })],
          notes: 'Gráfico de cascada: cada etapa resta kilómetros hasta llegar a cero en Santiago. La tabla suma las etapas con =SUMA(ARRIBA). Distancias aproximadas.' },
        { layout: 'blank', bg: '#dfe9d5', extra: [
          shape('rect', 0, 560, 1280, 160, '#c8b98f'), shape('rect', 0, 548, 1280, 14, '#9bb37a'),
          ...[200, 470, 740, 1010].map((x, i) => withAnims(shape('rightarrow', x, 600, 90, 40, YEL, { sketch: true, stroke: '#c9a200', strokeWidth: 2 }), A('fade-right', { start: i ? 'afterPrev' : 'click', duration: 300 }))),
          withAnims(model('kh-CesiumMan', 40, 300, 200, 270, { walk: { clip: '*', face: true, look: true }, caption: '' }), path([[300, 0], [640, 0], [960, 0]], { duration: 8000, start: 'afterPrev' })),
          text('Paso a paso', 90, 70, 700, 90, { fontFamily: H, fontSize: 66, fontWeight: 800, color: MOSS }),
          text('A 4 o 5 km por hora, una etapa de 22 km son unas 5 horas. Sal temprano: a las 14:00 el sol de Galicia aprieta, aunque llueva por la mañana.', 90, 165, 760, 130, { fontSize: 27, color: INK }),
          credits(['kh-CesiumMan'], 90, 680, 1100, '#6b6352', 11)],
          notes: 'Clic: las flechas amarillas aparecen una tras otra y, al final, el caminante 3D las sigue andando (trayectoria con la animación de andar).' },
        { title: 'La regla de la mochila', layout: 'titleOnly', bg: PAPER, extra: [
          mathBlock({ x: 90, y: 180, w: 560, h: 100, fontSize: 46, color: MOSS, latex: 'P_{\\text{mochila}} \\le 0{,}10 \\times P_{\\text{tuyo}}' }),
          at(mathBlock({ x: 90, y: 290, w: 560, h: 80, fontSize: 36, color: '#a3322a', latex: '70\\ \\text{kg} \\quad \\Rightarrow \\quad \\text{máx. } 7\\ \\text{kg}' }), 'fade-up'),
          text('Lo que más pesa casi nunca es lo que más se usa. Todo lo que dudes, déjalo en casa.', 90, 410, 560, 130, { fontSize: 26, color: INK }),
          chartBlock({ x: 680, y: 175, w: 280, h: 300, chartType: 'doughnut', color: MOSS, legend: false,
            data: [{ label: 'Mochila', value: 1.2, color: '#5b4636' }, { label: 'Ropa', value: 2.2, color: '#2f6b3a' }, { label: 'Agua', value: 1.5, color: '#4a90d9' }, { label: 'Saco y esterilla', value: 1.1, color: '#b5651d' }, { label: 'Aseo y botiquín', value: 0.6, color: '#a3322a' }, { label: 'Resto', value: 0.4, color: '#c9b98f' }] }),
          ...[['Mochila', '1,2', '#5b4636'], ['Ropa', '2,2', '#2f6b3a'], ['Agua', '1,5', '#4a90d9'], ['Saco y esterilla', '1,1', '#b5651d'], ['Aseo y botiquín', '0,6', '#a3322a'], ['Resto', '0,4', '#c9b98f']].flatMap(([l, kg, c], i) => [
            shape('rounded', 975, 190 + i * 46, 22, 22, c, { radius: 5 }), text(`${l} <b>${kg}</b>`, 1005, 180 + i * 46, 200, 40, { fontSize: 19, color: INK, vAlign: 'middle' })]),
          text('Total: 7 kg', 700, 500, 490, 60, { fontFamily: HAND, fontSize: 44, color: MOSS, textAlign: 'center' })],
          notes: 'La regla de oro en forma de ecuación (clic: el ejemplo para 70 kg). La dona tiene un color propio por porción; la leyenda está hecha a mano para poner los kilos. Pesos orientativos.' },
        { layout: 'blank', bg: '#ffffff', extra: [
          shape('rect', 0, 0, 24, 720, YEL), shape('rect', 24, 0, 8, 720, BLUE),
          pollBlock({ kind: 'order', fontSize: 32, question: 'Ordena las paradas, de Sarria a Santiago', x: 90, y: 70, w: 1100, h: 580,
            options: ['Sarria', 'Portomarín', 'Palas de Rei', 'Arzúa', 'O Pedrouzo', 'Santiago de Compostela'] })],
          notes: 'Actividad de ordenar desde el móvil: aparecen desordenadas y cada uno las coloca. Revela corrige y da puntos.' },
        { layout: 'blank', bg: MOSS, transition: 'fade', transitionSpeed: 'slow', extra: [
          img(shellSVG(YEL, MOSS), 990, 90, 200, 200, { alt: '' }),
          at(text('«El Camino no se hace con los pies, sino con la cabeza: los pies solo obedecen.»', 90, 170, 860, 280, { fontFamily: HAND, fontSize: 64, color: '#f5ecd7', lineHeight: 1.15 }), 'fade-in', { start: 'afterPrev', duration: 1800 }),
          at(text('— dicho de albergue, apuntado en un cuaderno', 90, 480, 860, 50, { fontSize: 26, color: '#c6d8b8' }), 'fade-in', { start: 'afterPrev', duration: 900 })],
          notes: 'Diapositiva de pausa con letra manuscrita (Caveat). La cita aparece despacio, sola.' },
        { layout: 'blank', bg: '#e9e4d8', transition: 'zoom', extra: [
          shape('rect', 0, 0, 1280, 720, '#f2d48a', { fill2: '#e9e4d8', gradAngle: 90 }),
          shape('custom', 340, 230, 600, 380, '#7b7465', { path: 'M0 100 L0 50 L10 50 L10 20 L13 8 L16 0 L19 8 L22 20 L22 50 L36 50 L36 36 L50 22 L64 36 L64 50 L78 50 L78 20 L81 8 L84 0 L87 8 L90 20 L90 50 L100 50 L100 100 Z' }),
          shape('custom', 470, 470, 340, 140, '#5f594c', { path: 'M0 100 L0 40 C0 10 30 0 50 0 C70 0 100 10 100 40 L100 100 Z' }),
          shape('rect', 0, 600, 1280, 120, '#a99c7c'),
          text('¡Buen Camino!', 90, 70, 1100, 140, { fontFamily: H, fontSize: 104, fontWeight: 800, color: MOSS, textAlign: 'center' }),
          text('Llegada prevista: 16 de septiembre, a tiempo para la misa del peregrino', 90, 630, 1100, 50, { fontSize: 28, color: INK, textAlign: 'center' })],
          notes: 'Cierre con la silueta de la catedral (dos formas libres) sobre un cielo de atardecer con degradado.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 6 · The Cyclades by ferry: a village of whitewashed cubes, a Greek key border, a route
  // drawn by hand over the islands, a timetable, 3D sunglasses with Transform, a sunset.
  life_travel_eu_greece: { name: 'Islas griegas en ferry', cat: 'life',
    summary: 'Pueblo blanco de formas, greca, ruta que se dibuja sola, horarios con fórmulas, burbujas, gafas 3D con Transformar y atardecer',
    make: () => {
      const AEG = '#1f5fa8', DEEP = '#0d3b66', SKY = '#d8eef8', WHITE = '#ffffff', INK = '#13293d', SAND = '#f4ead5', SUNSET = '#f08a4b';
      const H = pairStacks('modern').heading, glasses = uid();
      const islands = [['Pireo', 120, 90], ['Mykonos', 560, 100], ['Naxos', 610, 265], ['Paros', 450, 255], ['Milos', 170, 370], ['Santorini', 610, 420]];
      const blob = (cx, cy, r, seed) => { const R = rng(seed); const pts = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2, k = 0.7 + R() * 0.5; return [50 + 48 * k * Math.cos(a), 50 + 48 * k * Math.sin(a)]; });
        return shape('custom', cx - r, cy - r, r * 2, r * 2, SAND, { path: 'M' + pts.map(p => p.map(v => Math.min(100, Math.max(0, v)).toFixed(1)).join(' ')).join(' L') + ' Z', stroke: '#d9c8a2', strokeWidth: 2 }); };
      const MX = 90, MY = 160;                                   // (the sea map on the slide)
      const route = islands.map(([, x, y]) => [x, y]);
      const sunglasses = (x, y, w, h, props = {}) => keep(m3d('kh-SunglassesKhronos', x, y, w, h, { autoRotate: true, view: 'front', ...props }), glasses);
      const deck = build({ name: 'Cícladas en ferry', palette: 'grayscale', fonts: 'modern', title: { size: 46, color: AEG }, body: { color: INK } }, [
        { layout: 'blank', bg: SKY, transition: 'fade', extra: [
          shape('rect', 0, 0, 1280, 560, '#a9d8f2', { fill2: '#eef8fd', gradAngle: 90 }),
          shape('rect', 0, 560, 1280, 160, AEG, { fill2: DEEP, gradAngle: 90 }),
          ...village(560, 600, 1.15),
          meander(0, 20, 1280, 30, AEG, 32), shape('rect', 0, 58, 1280, 3, AEG),
          kicker('DOCE DÍAS · CINCO ISLAS · JUNIO', 90, 120, 640, '#2a8c8c', 20),
          text('Cícladas', 84, 150, 700, 140, { fontFamily: H, fontSize: 120, fontWeight: 800, color: DEEP, letterSpacing: -2 }),
          text('Saltando de isla en isla en ferry, con la mochila ligera', 90, 290, 520, 100, { fontSize: 30, color: INK })],
          notes: 'Todo el pueblo está hecho con rectángulos (blanco, una cara en sombra, puertas y ventanas azules) y una cúpula con forma libre. La greca de arriba es una sola forma libre repetida.' },
        { title: 'La ruta en el mar', layout: 'titleOnly', bg: WHITE, extra: [
          shape('rounded', MX, MY, 760, 500, '#cfe8f6', { radius: 18 }),
          ...islands.map(([, x, y], i) => blob(MX + x, MY + y, [36, 40, 52, 44, 42, 34][i], 30 + i)),
          { ...base(MX, MY, 760, 500), type: 'ink', points: route, vw: 760, vh: 500, color: AEG, width: 5, animation: A('draw', { duration: 4000, sound: 'whoosh' }) },
          ...islands.map(([n, x, y], i) => text(n, MX + x - 80, MY + y + (i === 4 ? 46 : -64), 160, 34, { fontSize: 21, fontWeight: 700, color: INK, textAlign: 'center' })),
          ...chain([['1', 'Pireo → Mykonos', 'Salida a primera hora'], ['2', 'Mykonos → Naxos', 'La isla más grande'], ['3', 'Naxos → Paros', 'Media hora de travesía'], ['4', 'Paros → Milos', 'Playas de roca blanca'], ['5', 'Milos → Santorini', 'Llegada por la caldera']].map(([n, a, b], i) =>
            text(`<b style="color:${AEG}">${n} · ${a}</b><br><span style="color:#5a6b7d">${b}</span>`, 880, 165 + i * 98, 320, 90, { fontSize: 21 })), 'fade-left', 'afterPrev', { duration: 350 })],
          notes: 'Clic: la ruta se dibuja sola de isla en isla (trazo de tinta con el efecto Dibujar y un silbido); después aparecen los cinco tramos. Mapa esquemático, sin escala: las islas son formas libres.' },
        { title: 'Horarios de los ferris', layout: 'titleOnly', bg: SAND, extra: [
          meander(90, 150, 1100, 18, AEG, 40, 2),
          tableBlock({ x: 90, y: 195, w: 1100, h: 400, fontSize: 24, header: true, headBg: AEG, headFg: WHITE, stroke: '#d9c8a2', banded: true, band: '#cd853f', color: INK,
            rows: [['Tramo', 'Sale (h)', 'Llega (h)', 'Horas', 'Tipo de barco'], ['Pireo → Mykonos', '7', '12,5', '=C2-B2', 'Convencional'], ['Mykonos → Naxos', '10,5', '11,75', '=C3-B3', 'Rápido'],
              ['Naxos → Paros', '9', '9,75', '=C4-B4', 'Convencional'], ['Paros → Milos', '13', '16,5', '=C5-B5', 'Rápido'], ['Milos → Santorini', '8', '10,25', '=C6-B6', 'Rápido'], ['<b>En el mar</b>', '', '', '=SUMA(ARRIBA)', '']], colW: [4, 2, 2, 2, 3] }),
          text('Horarios inventados, en horas decimales (12,5 = 12:30). En verano conviene reservar los rápidos con días de antelación.', 90, 610, 1100, 60, { fontSize: 21, color: '#5a6b7d', fontStyle: 'italic', textAlign: 'center' })],
          notes: 'La columna Horas resta llegada menos salida (=C2-B2) y la última fila suma el tiempo total en el mar. Cambia una hora y todo se recalcula.' },
        { title: 'Cada isla, su carácter', layout: 'titleOnly', bg: WHITE, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 480, chartType: 'bubble', color: AEG, seriesName: 'Playas (aprox.)',
            data: [['Mykonos', 25], ['Naxos', 40], ['Paros', 30], ['Milos', 70], ['Santorini', 12]].map(([label, value]) => ({ label, value })), series: [{ name: 'Superficie (km²)', values: [85, 430, 196, 160, 76] }] }),
          ...chain([['Mykonos', 'Fiesta y molinos'], ['Naxos', 'Montaña, queso y aldeas'], ['Paros', 'Puertos tranquilos'], ['Milos', 'Más de 70 playas'], ['Santorini', 'Acantilados y atardeceres']].map(([n, d], i) =>
            text(`<b>${n}</b> · ${d}`, 850, 190 + i * 88, 340, 70, { fontSize: 23, color: INK, bg: i % 2 ? '#eef6fb' : '#f7f1e3', radius: 10, pad: [10, 16, 10, 16], vAlign: 'middle' })), 'fade-left', 'click')],
          notes: 'Gráfico de burbujas: la altura es el número aproximado de playas y el tamaño de la burbuja la superficie de cada isla (cifras redondeadas).' },
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          glow(340, 60, 620, '#f6c56b', DEEP, 45),
          text('Lo esencial: el sol', 90, 60, 1100, 90, { fontFamily: H, fontSize: 64, fontWeight: 800, color: WHITE, textAlign: 'center' }),
          sunglasses(290, 160, 700, 420),
          text('En junio, el índice UV llega a 9 casi todos los días a mediodía.', 90, 600, 1100, 50, { fontSize: 28, color: '#cfe3f2', textAlign: 'center' })],
          notes: 'Las gafas 3D giran solas. En la siguiente diapositiva viajan a la esquina con Transformar.' },
        { title: 'En la mochila', layout: 'titleOnly', bg: WHITE, autoAnimate: true, extra: [
          shape('ellipse', 860, 150, 380, 380, SKY),
          sunglasses(850, 210, 400, 260, { autoRotate: false, view: 'three', motion: 'float' }),
          ...chain(['Gafas de sol con filtro de verdad', 'Crema solar de factor alto, y repetir', 'Gorra o sombrero', 'Sandalias que se puedan mojar', 'Pastillas para el mareo', 'Una botella reutilizable'].map((t, i) =>
            text(`<span style="color:${AEG};font-weight:800">✓</span>&nbsp; ${t}`, 90, 180 + i * 72, 720, 60, { fontSize: 28, color: INK, vAlign: 'middle' })), 'fade-right', 'click', { duration: 350, sound: 'click' }),
          credits(['kh-SunglassesKhronos'], 90, 650, 1100, '#8a96a3', 11)],
          notes: 'Transformar: las gafas pasan del centro a la esquina y se quedan flotando. Clic: la lista se marca línea a línea con un clic de sonido.' },
        { layout: 'blank', bg: WHITE, extra: [
          meander(0, 0, 1280, 26, AEG, 32, 2),
          pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada palabra griega con su significado', x: 90, y: 70, w: 1100, h: 590,
            options: ['Kaliméra = Buenos días', 'Efjaristó = Gracias', 'Parakaló = Por favor', 'Neró = Agua', 'Ton logariazmó = La cuenta'] })],
          notes: 'Actividad de emparejar desde el móvil. Las palabras van transcritas como suenan; en griego: Καλημέρα, Ευχαριστώ, Παρακαλώ, Νερό, Τον λογαριασμό.' },
        { layout: 'blank', bg: '#f6b26b', extra: [
          shape('rect', 0, 0, 1280, 560, '#5a3d7a', { fill2: '#f6b26b', gradAngle: 90 }),
          withAnims(shape('ellipse', 400, 120, 170, 170, '#ffd27a', { fill2: SUNSET, gradType: 'radial' }), path([[20, 180], [40, 400]], { start: 'afterPrev', duration: 20000 })),
          shape('rect', 0, 520, 1280, 200, '#3b2a55', { fill2: '#1e1633', gradAngle: 90 }),
          ...village(40, 600, 0.75, '#2c4f86').map(b => ({ ...b, fill: b.fill === '#ffffff' ? '#f3dccb' : b.fill === '#e3eaf1' ? '#e3c3b0' : b.fill, stroke: 'none' })),
          text('El atardecer en Oia', 640, 120, 560, 70, { fontFamily: H, fontSize: 46, fontWeight: 800, color: WHITE }),
          text('Llegad una hora antes para coger sitio. Cuando el sol toca el mar, la gente aplaude.', 640, 190, 500, 100, { fontSize: 24, color: '#fff1e2' }),
          timer(300, 980, 540, 150, { style: 'ring', color: '#ffd27a', endText: '¡Ya!' })],
          notes: 'El sol baja despacio, solo, durante 20 segundos (trayectoria). La cuenta atrás de 5 minutos empieza al llegar: buen momento para pedir silencio y mirar.' },
        { layout: 'blank', bg: WHITE, transition: 'zoom', extra: [
          meander(90, 120, 1100, 30, AEG, 36), meander(90, 570, 1100, 30, AEG, 36),
          text('Καλό ταξίδι!', 90, 200, 1100, 170, { fontFamily: H, fontSize: 130, fontWeight: 800, wordart: 'gradient', textAlign: 'center' }),
          text('«¡Buen viaje!» · Ferry del primer día: 7:00, muelle E7', 90, 400, 1100, 60, { fontSize: 32, color: INK, textAlign: 'center' }),
          withAnims(img(shipSVG, 555, 470, 170, 80, { alt: 'Ferry' }), A('bounce', { start: 'afterPrev' }))],
          notes: 'Cierre con Text Art «Degradado» entre dos grecas. «Kaló taxídi» significa «buen viaje».' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 7 · The Scottish Highlands by car: a tartan woven from bands, a winding road drawn
  // with signposts, how a passing place works (two cars), castles, a ghost-tour lantern.
  life_travel_eu_scotland: { name: 'Escocia: Highlands en coche', cat: 'life',
    summary: 'Tartán tejido con formas, carretera que se dibuja, coches que se ceden el paso, castillos que giran, farol 3D, barras y preguntas',
    make: () => {
      const HEATH = '#8e4fa0', PINE = '#1f4d3a', NAVY = '#1b2340', MIST = '#d8d2e3', GOLD = '#e0b04f', DARK = '#140c22', INK = '#241a30';
      const SERIF = pairStacks('websafe').heading;
      const plaid = (x, y, w, h) => tartan(x, y, w, h, PINE, [[0, 90, NAVY, 70], [120, 40, HEATH, 60], [190, 8, GOLD, 70], [230, 50, NAVY, 55], [290, 6, '#d04a4a', 60]]);
      const stops = [['Edimburgo', 150, 560], ['Glencoe', 390, 300], ['Fort William', 590, 470], ['Isla de Skye', 820, 230], ['Inverness', 1030, 420]];
      const road = (() => { const pts = []; for (let i = 0; i < stops.length - 1; i++) { const [, x0, y0] = stops[i], [, x1, y1] = stops[i + 1];
        for (let k = 0; k < 12; k++) { const t = k / 12; pts.push([Math.round(x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * 40 * (i % 2 ? 1 : -1)), Math.round(y0 + (y1 - y0) * t)]); } }
        pts.push([stops.at(-1)[1], stops.at(-1)[2]]); return pts; })();
      const car = (c) => svgURL(120, 60, `<rect x="6" y="20" width="108" height="26" rx="10" fill="${c}"/><path d="M28 22 L40 6 L84 6 L96 22Z" fill="${c}"/><path d="M44 10 L58 10 L58 21 L36 21Z M64 10 L80 10 L90 21 L64 21Z" fill="#cfe3f2"/><circle cx="32" cy="48" r="10" fill="#222"/><circle cx="90" cy="48" r="10" fill="#222"/>`);
      const deck = build({ name: 'Escocia en siete días', palette: 'violet', fonts: 'websafe', title: { size: 50, color: GOLD, bold: false }, body: { color: MIST } }, [
        { layout: 'blank', bg: PINE, transition: 'fade', extra: [
          ...plaid(0, 0, 1280, 720),
          shape('rect', 260, 140, 760, 440, DARK, { opacity: 88, shadow: { x: 0, y: 14, blur: 40, color: '#00000088' } }),
          shape('rect', 280, 160, 720, 400, 'none', { stroke: GOLD, strokeWidth: 2 }),
          kicker('SIETE DÍAS · CONDUCIENDO POR LA IZQUIERDA', 300, 210, 680, GOLD, 16, { textAlign: 'center', letterSpacing: 3 }),
          text('Escocia', 280, 250, 720, 150, { fontFamily: SERIF, fontSize: 130, color: '#ffffff', textAlign: 'center' }),
          text('De Edimburgo a las Highlands, entre brezo, lagos y castillos', 320, 410, 640, 90, { fontSize: 28, color: MIST, textAlign: 'center' })],
          notes: 'El tartán está tejido con rectángulos semitransparentes que se cruzan en horizontal y en vertical (con su opacidad se mezclan los colores). Encima, una tarjeta oscura con un filete dorado.' },
        { title: 'La ruta', layout: 'titleOnly', bg: DARK, extra: [
          shape('rect', 0, 600, 1280, 120, '#2a1840'),
          { ...base(0, 0, 1280, 720), type: 'ink', points: road, vw: 1280, vh: 720, color: '#6c5a80', width: 22, animation: A('draw', { duration: 3500 }) },
          { ...base(0, 0, 1280, 720), type: 'ink', points: road, vw: 1280, vh: 720, color: GOLD, width: 3, animation: A('draw', { duration: 3500, start: 'withPrev' }) },
          ...stops.flatMap(([n, x, y], i) => together([shape('rect', x - 3, y - 70, 6, 70, '#6b4a2b'),
            shape('homeplate', x - 6, y - 110, 190, 46, '#2f6b4a', { stroke: '#ffffff', strokeWidth: 2 }),
            text(n, x + 2, y - 110, 170, 46, { fontSize: 21, color: '#ffffff', vAlign: 'middle', fontWeight: 700 })], 'zoom-in', 'afterPrev', { duration: 300, sound: 'pop' })),
          text('Unos 900 km en total · nunca más de 3 horas al volante al día', 90, 640, 1100, 40, { fontSize: 22, color: MIST, textAlign: 'center' })],
          notes: 'Clic: la carretera se dibuja sola (dos trazos de tinta a la vez: el asfalto y la línea dorada) y después las señales aparecen una a una con un «pop». Recorrido esquemático.' },
        { title: 'Los «passing places»', layout: 'titleOnly', bg: '#2a1840', extra: [
          shape('rect', 0, 360, 1280, 110, '#4a4a52'),
          shape('custom', 520, 300, 240, 62, '#4a4a52', { path: 'M0 100 L20 0 L80 0 L100 100 Z' }),
          shape('rect', 0, 412, 1280, 4, '#ffffff', { opacity: 40, dash: 'dash' }),
          shape('rounded', 570, 250, 140, 40, '#ffffff', { radius: 8 }), text('<b>PASSING<br>PLACE</b>', 570, 250, 140, 40, { fontSize: 13, color: '#1b2340', textAlign: 'center', vAlign: 'middle' }),
          shape('custom', 0, 470, 1280, 250, '#3a2a4f', { path: 'M0 0 L100 0 L100 100 L0 100 Z' }),
          withAnims(img(car('#d04a4a'), 100, 372, 140, 70, { alt: 'Tu coche' }), path([[300, 0], [480, -60]], { duration: 2200 })),
          withAnims(img(car('#e0b04f'), 1060, 372, 140, 70, { alt: 'Coche que viene de frente' }), path([[-500, 0], [-1100, 0]], { start: 'afterPrev', duration: 3000, sound: 'whoosh' })),
          text(ul('Si el apartadero está <b>a tu izquierda</b>, te metes en él.', 'Si está a tu derecha, te detienes enfrente y esperas.', 'Nunca aparques en él: ni para hacer fotos.', 'Un saludo con la mano al pasar es casi obligatorio.'), 90, 500, 1100, 180, { fontSize: 25, color: MIST })],
          notes: 'Clic: tu coche (rojo) se aparta al «passing place» y, cuando se detiene, pasa el que viene de frente (dos trayectorias encadenadas). En Escocia se conduce por la izquierda.' },
        { title: 'Tres castillos', layout: 'titleOnly', bg: DARK, extra: [
          ...[['Edimburgo', 'Sobre un volcán apagado, en el centro de la ciudad.', HEATH], ['Eilean Donan', 'En un islote, unido a tierra por un puente de piedra.', '#2f6b4a'], ['Urquhart', 'Ruinas a orillas del lago Ness. ¿Lo vigila algo?', NAVY]].flatMap(([n, d, c], i) => {
            const x = 90 + i * 375;
            return together([shape('rect', x, 180, 350, 440, c), shape('custom', x + 30, 200, 290, 200, '#0d0818', { path: CASTLE, opacity: 80 }),
              shape('ellipse', x + 250, 210, 40, 40, MIST, { opacity: 70 }),
              text(`<div style="font-family:${SERIF};font-size:36px;color:#ffffff">${n}</div><div style="margin-top:8px">${d}</div>`, x + 26, 420, 300, 180, { fontSize: 22, color: MIST })], 'flip', 'click', { duration: 700 }); })],
          notes: 'Tres tarjetas que giran al entrar, con la silueta de un castillo (forma libre) y la luna. Clic para cada una.' },
        { layout: 'blank', bg: '#07040d', transition: 'fade', transitionSpeed: 'slow', extra: [
          glow(780, 120, 480, '#e0a040', '#07040d', 45),
          m3d('kh-Lantern', 820, 140, 340, 420, { view: 'front', motion: 'float', autoRotate: true }),
          text('Edimburgo de noche', 90, 110, 680, 80, { fontFamily: SERIF, fontSize: 56, color: GOLD }),
          ...chain(['Bajo la Royal Mile hay calles enteras enterradas desde hace siglos.', 'Las visitas se hacen con farol, en grupos pequeños.', 'Nadie te obliga a entrar en la última bóveda.'].map((t, i) =>
            text(t, 90, 240 + i * 110, 660, 90, { fontFamily: SERIF, fontSize: 30, color: MIST, fontStyle: 'italic' })), 'fade-in-then-semi-out', 'click', { duration: 1400 })],
          notes: 'El farol 3D flota y gira despacio. Cada clic muestra una frase que después se queda en penumbra (Entrar y atenuar), para contarlo como una historia de miedo.' },
        { title: 'Pequeños pero matones', layout: 'titleOnly', bg: '#2a1840', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 470, chartType: 'bar', color: HEATH, seriesName: 'Mosquitos «midges» (índice)', dataLabels: true,
            data: [['Abr', 1], ['May', 4], ['Jun', 8], ['Jul', 9], ['Ago', 9], ['Sep', 6], ['Oct', 2]].map(([label, value]) => ({ label, value })) }),
          card(`<div style="font-family:${SERIF};font-size:34px;color:${GOLD}">Cómo librarse</div>` + ul('Viento: donde sopla, no hay.', 'Repelente y ropa clara.', 'Mayo o septiembre: menos bichos y el brezo en flor.'), 850, 190, 340, 420, '#ffffff10', { fontSize: 23, color: MIST, borderColor: '#5a4a70' })],
          notes: 'Barras con etiquetas de datos: los «midges» son unos mosquitos diminutos de las Highlands. Índice inventado de 0 a 10, solo para comparar meses.' },
        { layout: 'blank', bg: DARK, extra: [
          ...plaid(0, 0, 1280, 40),
          pollBlock({ kind: 'qa', fontSize: 32, question: '¿Qué dudas tenéis sobre el viaje?', options: [], x: 90, y: 80, w: 1100, h: 580 })],
          notes: 'Preguntas del público desde el móvil: se envían y se votan; las más votadas suben arriba. Ideal para la última reunión antes de salir.' },
        { layout: 'section', bg: PINE, title: 'Haste ye back!', subtitle: '«¡Vuelve pronto!», como dicen al despedirse · Salida el 2 de septiembre', transition: 'cube',
          back: [...plaid(0, 0, 1280, 720), shape('rect', 0, 220, 1280, 300, DARK, { opacity: 88 })],
          notes: 'Cierre sobre el tartán, con transición «Cubo». Haste ye back es la despedida tradicional escocesa.' },
      ]);
      deck.slides.at(-1).blocks.forEach(b => { if (b.ph === 'title') Object.assign(b, { y: 220, h: 190, fontFamily: SERIF, color: '#ffffff', wordart: 'shadow' }); if (b.ph === 'subtitle') Object.assign(b, { y: 410, h: 80, color: GOLD, fontSize: 28 }); });
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 8 · The Danube by bike: the look of a cycling computer (dark screen, lime figures),
  // the route in a phone, the GPX file step by step, stages, a 3D bottle with Transform.
  life_travel_eu_danube: { name: 'El Danubio en bici', cat: 'life',
    summary: 'Estilo ciclocomputador: ruta en un móvil, archivo GPX por pasos, barras apiladas, botella 3D con Transformar, fórmulas y rectángulos',
    make: () => {
      const BG = '#0e1116', PANEL = '#171c24', LIME = '#c6f432', RIVER = '#38bdf8', FG = '#e8edf3', DIM = '#8a96a8', ORANGE = '#ff9f43';
      const H = pairStacks('tech').heading, MONO = FF.mono, bottle = uid();
      const towns = ['Passau', 'Schlögen', 'Linz', 'Grein', 'Melk', 'Krems', 'Viena'];
      const river = Array.from({ length: 25 }, (_, i) => [Math.round(i * 1280 / 24), Math.round(600 + Math.sin(i / 2.2) * 26)]);
      const phoneMap = svgURL(360, 720, `<rect width="360" height="720" fill="#12161d"/>`
        + Array.from({ length: 14 }, (_, i) => `<path d="M0 ${60 + i * 50} L360 ${40 + i * 52}" stroke="#1d232d" stroke-width="2"/>`).join('')
        + `<path d="M-10 640 C60 560 40 470 120 420 S260 330 220 230 S280 90 380 40" stroke="#1f6f9a" stroke-width="26" fill="none"/>`
        + `<path d="M20 640 C80 560 60 470 140 420 S280 330 240 230 S300 90 360 50" stroke="${LIME}" stroke-width="6" fill="none" stroke-dasharray="14 8"/>`
        + `<circle cx="140" cy="420" r="13" fill="${LIME}"/><circle cx="140" cy="420" r="26" fill="${LIME}" opacity=".25"/>`
        + `<rect x="0" y="0" width="360" height="92" fill="#0b0e13"/><text x="22" y="40" font-family="sans-serif" font-size="18" fill="#8a96a8">ETAPA 3 DE 6</text><text x="22" y="74" font-family="sans-serif" font-size="28" font-weight="700" fill="#e8edf3">Linz → Grein</text>`
        + `<rect x="0" y="600" width="360" height="120" fill="#0b0e13"/>`
        + [['32,4', 'km'], ['17,8', 'km/h'], ['1:49', 'h']].map(([v, u], i) => `<text x="${30 + i * 115}" y="660" font-family="monospace" font-size="30" font-weight="700" fill="${LIME}">${v}</text><text x="${30 + i * 115}" y="690" font-family="sans-serif" font-size="16" fill="#8a96a8">${u}</text>`).join(''));
      const stat = (v, u, x, y, w, c = LIME, size = 64) => text(`<div style="font-family:${MONO};font-size:${size}px;font-weight:700;color:${c};line-height:1">${v}</div><div style="font-size:18px;color:${DIM};letter-spacing:3px;margin-top:6px">${u}</div>`, x, y, w, size + 70);
      const stages = [['Passau → Schlögen', 42, 4], ['Schlögen → Linz', 48, 3], ['Linz → Grein', 52, 8], ['Grein → Melk', 44, 6], ['Melk → Krems', 34, 2], ['Krems → Viena', 70, 10]];
      const deck = build({ name: 'El Danubio en bici', palette: 'revela', fonts: 'tech', title: { size: 46, color: FG }, body: { color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          { ...base(0, 0, 1280, 720), type: 'ink', points: river, vw: 1280, vh: 720, color: '#1f6f9a', width: 26 },
          ...towns.map((t, i) => { const x = 60 + i * 190, y = 600 + Math.sin((x / 1280 * 24) / 2.2) * 26;
            return [shape('ellipse', x - 8, y - 8, 16, 16, i === 0 || i === 6 ? LIME : FG), text(t, x - 70, y + 24, 140, 30, { fontSize: 18, color: DIM, textAlign: 'center' })]; }).flat(),
          withAnims(shape('ellipse', 44, 584, 32, 32, LIME, { fill2: BG, gradType: 'radial' }), path(towns.slice(1).map((_, i) => { const x = 60 + (i + 1) * 190; return [x - 60, Math.round(600 + Math.sin((x / 1280 * 24) / 2.2) * 26) - 600]; }), { start: 'afterPrev', duration: 6000, delay: 500 })),
          kicker('RUTA EN BICI · 6 ETAPAS · MAYO', 90, 90, 600, LIME, 20),
          text('El Danubio en bici', 84, 120, 760, 200, { fontFamily: H, fontSize: 92, fontWeight: 700, color: FG, lineHeight: 1 }),
          text('De Passau a Viena siguiendo el río, casi sin cuestas', 90, 330, 700, 80, { fontSize: 28, color: DIM }),
          shape('rounded', 860, 90, 330, 330, PANEL, { radius: 30, stroke: '#2a3240', strokeWidth: 2 }),
          stat('330', 'KM EN TOTAL', 900, 120, 260), stat('6', 'ETAPAS', 900, 230, 120, RIVER, 52), stat('55', 'KM DE MEDIA', 1030, 230, 140, ORANGE, 52),
          stat('&lt;1 %', 'PENDIENTE MEDIA', 900, 330, 260, FG, 40)],
          notes: 'Portada estilo ciclocomputador: fondo oscuro y cifras en verde lima con letra monoespaciada. El río es un trazo de tinta y el punto verde recorre las seis etapas solo, al llegar.' },
        { title: 'La ruta, siempre en el bolsillo', layout: 'titleOnly', bg: BG, extra: [
          { ...base(860, 150, 260, 520), type: 'image', src: phoneMap, alt: 'Aplicación de rutas con la etapa Linz–Grein', fit: 'cover', device: 'phone' },
          ...chain([['Descarga la ruta antes de salir', 'Sin cobertura en algunos tramos junto al río.'], ['Batería externa', 'El GPS gasta mucho: una carga no llega a la tarde.'], ['Soporte en el manillar', 'Mirar el móvil en la mano es la mejor forma de caerse.']].map(([h, d], i) =>
            text(`<div style="font-family:${H};font-size:30px;font-weight:700;color:${LIME}">0${i + 1}&nbsp; ${h}</div><div style="margin-top:6px;color:${DIM}">${d}</div>`, 90, 190 + i * 140, 700, 120, { fontSize: 24 })), 'fade-right', 'click')],
          notes: 'La imagen del móvil es una pantalla de aplicación inventada, dibujada en SVG y puesta en un marco de teléfono (Imagen ▸ Dispositivo). Clic: los tres consejos uno a uno.' },
        { title: 'La ruta por dentro: un archivo GPX', layout: 'titleOnly', bg: BG, extra: [
          codeBlock({ x: 90, y: 170, w: 720, h: 470, fontSize: 21, lang: 'xml', lineSteps: '1-2|3-6|7-10|12',
            code: '<gpx version="1.1" creator="planificador">\n  <metadata><name>Danubio · etapa 3</name></metadata>\n  <wpt lat="48.3069" lon="14.2858">\n    <name>Linz · salida</name>\n    <ele>266</ele>\n  </wpt>\n  <trk><trkseg>\n    <trkpt lat="48.2810" lon="14.4170"><ele>255</ele></trkpt>\n    <trkpt lat="48.2290" lon="14.6890"><ele>243</ele></trkpt>\n  </trkseg></trk>\n  <!-- … miles de puntos más … -->\n</gpx>' }),
          ...chain([['Cabecera', 'Qué es y quién lo hizo.'], ['Waypoint', 'Un sitio con nombre: salida, fuente, taller.'], ['Track', 'El camino, punto a punto, con altura.'], ['Cierre', 'Y listo para cualquier app.']].map(([h, d], i) =>
            text(`<b style="color:${[LIME, RIVER, ORANGE, FG][i]}">${h}</b><br><span style="color:${DIM}">${d}</span>`, 850, 190 + i * 110, 340, 90, { fontSize: 23 })), 'fade-left', 'click', { duration: 300 })],
          notes: 'Bloque de código con pasos de resaltado: cada clic ilumina una parte del archivo GPX (cabecera, punto con nombre, recorrido, cierre). Las coordenadas son aproximadas.' },
        { title: 'Kilómetros por etapa', layout: 'titleOnly', bg: BG, transition: 'push', extra: [
          chartBlock({ x: 90, y: 170, w: 780, h: 470, chartType: 'stacked', color: LIME, seriesName: 'Carril bici', grid: true,
            data: stages.map(([label, km, road]) => ({ label: label.split(' → ')[1], value: km - road })), series: [{ name: 'Carretera tranquila', values: stages.map(s => s[2]), color: ORANGE }] }),
          shape('rounded', 910, 190, 280, 430, PANEL, { radius: 22 }),
          at(stat('90 %', 'POR CARRIL BICI', 940, 220, 230), 'zoom-in', { sound: 'pop' }),
          at(stat('70 km', 'LA ETAPA MÁS LARGA', 940, 360, 230, ORANGE, 52), 'zoom-in', { sound: 'pop' }),
          text('La última, hasta Viena, se puede partir en dos.', 940, 500, 230, 100, { fontSize: 20, color: DIM })],
          notes: 'Barras apiladas: en cada etapa, la parte por carril bici y la parte por carretera secundaria. Clic: las dos cifras clave, con un «pop». Distancias aproximadas.' },
        { layout: 'blank', bg: BG, extra: [
          glow(340, 60, 600, '#1f6f9a', BG, 50),
          kicker('LO QUE MÁS PESA EN LA BICI', 90, 80, 1100, RIVER, 20, { textAlign: 'center' }),
          text('El agua', 90, 110, 1100, 110, { fontFamily: H, fontSize: 88, fontWeight: 700, color: FG, textAlign: 'center' }),
          keep(m3d('kh-WaterBottle', 490, 230, 300, 420, { view: 'front', autoRotate: true }), bottle)],
          notes: 'La botella 3D gira sola; en la siguiente diapositiva viaja a la izquierda con Transformar.' },
        { title: '¿Cuánta agua por etapa?', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
          keep(m3d('kh-WaterBottle', 70, 180, 200, 400, { view: 'three' }), bottle),
          mathBlock({ x: 300, y: 180, w: 880, h: 90, fontSize: 40, color: LIME, latex: '\\text{agua (L)} \\approx 0{,}6 \\times \\text{horas de pedaleo}' }),
          tableBlock({ x: 300, y: 300, w: 880, h: 300, fontSize: 22, header: true, headBg: '#1f6f9a', headFg: '#ffffff', stroke: '#2a3240', banded: true, band: '#1f6f9a', color: FG,
            rows: [['Etapa', 'Km', 'Horas (a 16 km/h)', 'Litros'], ...stages.slice(0, 4).map(([n, km], i) => [n, String(km), `=B${i + 2}/16`, `=C${i + 2}*6/10`]), ['<b>Cuatro etapas</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [4, 2, 3, 2] }),
          text('Con más de 25 °C, añade medio litro. Hay fuentes en casi todos los pueblos.', 300, 615, 880, 40, { fontSize: 20, color: DIM }),
          credits(['kh-WaterBottle'], 90, 670, 1100, '#7d8796', 11)],
          notes: 'Transformar: la botella pasa al lado. La tabla calcula sola las horas (km ÷ 16) y los litros (horas × 0,6) con fórmulas, y la última fila suma. Regla orientativa, no consejo médico.' },
        { title: 'En qué se va el dinero', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'treemap',
            data: [['Alojamiento', 420], ['Comida', 300], ['Bici de alquiler', 160], ['Tren de vuelta', 60], ['Barco (un tramo)', 30], ['Imprevistos', 80]].map(([label, value]) => ({ label, value })) }),
          stat('1.050 €', 'POR PERSONA, 7 DÍAS', 890, 220, 300),
          text('Precios inventados y orientativos. Las pensiones del camino guardan la bici bajo techo.', 890, 360, 300, 140, { fontSize: 22, color: DIM })],
          notes: 'Gráfico de rectángulos: el área de cada uno es su parte del presupuesto. Cifras inventadas.' },
        { layout: 'blank', bg: BG, extra: [
          pollBlock({ kind: 'rating', display: 'numbers', fontSize: 36, question: 'Del 1 al 5: ¿qué forma tienes para pedalear 55 km al día?', options: [], x: 90, y: 90, w: 1100, h: 540 })],
          notes: 'Valoración en directo: la media dirá si conviene acortar etapas o meter un día de descanso en Melk.' },
        { layout: 'blank', bg: BG, transition: 'cover', extra: [
          ...Array.from({ length: 2 }, (_, r) => Array.from({ length: 32 }, (_, c) => shape('rect', c * 40, 600 + r * 40, 40, 40, (r + c) % 2 ? '#ffffff' : '#000000'))).flat(),
          text('Gute Fahrt!', 90, 160, 1100, 170, { fontFamily: H, fontSize: 140, fontWeight: 700, color: LIME, textAlign: 'center' }),
          text('«¡Buen viaje!» · Salida desde Passau el 10 de mayo a las 9:00', 90, 350, 1100, 50, { fontSize: 30, color: FG, textAlign: 'center' }),
          withAnims(text('🚲', 580, 420, 130, 130, { fontSize: 80, textAlign: 'center' }), path([[200, 0], [500, 0]], { start: 'afterPrev', duration: 2500, sound: 'applause' }))],
          notes: 'Cierre con línea de meta a cuadros (rectángulos alternos). La bici cruza la meta sola con aplausos.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 9 · Amsterdam: a row of canal houses (each gable different) that build themselves,
  // the canal ring as a target, cycling rules on a red bike lane, a museum budget.
  life_travel_eu_amsterdam: { name: 'Ámsterdam: canales y bicis', cat: 'life',
    summary: 'Fachadas de canal que se montan en cadena, canales en diana, bici que cruza con sonido, tabla con fórmulas, líneas y votación en tarta',
    make: () => {
      const CREAM = '#f6efe2', INK = '#24201c', ORANGE = '#e8661c', CANAL = '#2e5a6b', BRICK = '#8b3a2b', DIM = '#6d6257';
      const H = pairStacks('bold').heading;
      const row = (baseY, k = 1, anims = false, hk = 1) => ROW.flatMap(([x, w, h, c, g], i) => { const parts = canalHouse(Math.round(x * k + (1280 - 1280 * k) / 2), baseY, Math.round(w * k), Math.round(h * k * hk), c, g);
        return anims ? together(parts, 'fade-up', 'afterPrev', { duration: 350, ...(i === 0 && { sound: 'pop' }) }) : parts; });
      const deck = build({ name: 'Ámsterdam en tres días', palette: 'paper', fonts: 'bold', title: { size: 66, color: BRICK, bold: false }, body: { color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          shape('rect', 0, 600, 1280, 120, CANAL, { fill2: '#1d3a46', gradAngle: 90 }),
          ...row(600, 1, true, 0.82),
          ...ROW.map(([x, w, h, c]) => shape('rect', x, 600, w, Math.round(h * 0.3), c, { opacity: 25 })),
          ...[0, 1, 2].map(i => shape('rect', 160 + i * 380, 640 + i * 18, 200, 3, '#ffffff', { opacity: 35 })),
          kicker('TRES DÍAS · ABRIL', 90, 70, 600, ORANGE, 22),
          text('ÁMSTERDAM', 84, 90, 1100, 170, { fontFamily: H, fontSize: 170, color: INK, lineHeight: 1 }),
          text('Canales, bicicletas y museos, sin prisa', 90, 240, 800, 50, { fontSize: 30, color: DIM })],
          notes: 'Las nueve fachadas son formas libres (cuatro tipos de frontón: escalonado, de campana, de cuello y de pico) con ventanas y puerta; se montan solas, una tras otra, al llegar. Debajo, su reflejo en el canal.' },
        { title: 'Tres anillos de canales', layout: 'titleOnly', bg: CREAM, extra: [
          dg('target', 'Prinsengracht\nKeizersgracht\nHerengracht\nSingel', 90, 170, 560, 480, { oneByOne: true, colors: 'accent' }),
          text('<b>Siglo XVII:</b> la ciudad creció en forma de media luna, canal a canal, alrededor del puerto.', 700, 200, 490, 130, { fontSize: 27, color: INK }),
          ...chain([['165', 'canales'], ['1.500', 'puentes'], ['880.000', 'bicicletas']].map(([n, l], i) =>
            text(`<span style="font-family:${H};font-size:64px;color:${[ORANGE, CANAL, BRICK][i]}">${n}</span>&nbsp; <span style="font-size:26px">${l}</span>`, 700, 350 + i * 95, 490, 85, { color: INK, vAlign: 'middle' })), 'zoom-in', 'click', { sound: 'pop', duration: 400 })],
          notes: 'Diagrama de diana que aparece anillo a anillo, del exterior al centro. Después, tres cifras redondeadas con un «pop».' },
        { title: 'En bici, como un local', layout: 'titleOnly', bg: '#ffffff', extra: [
          shape('rect', 0, 175, 1280, 90, '#b8463a'),
          ...[60, 360, 660, 960].map(x => shape('rect', x, 217, 160, 6, '#ffffff')),
          withAnims(text('🚲', 60, 165, 130, 110, { fontSize: 84, textAlign: 'center' }), path([[500, 0], [1060, 0]], { start: 'afterPrev', duration: 3500, sound: 'whoosh' })),
          ...[['1', 'Timbre, no gritos', 'Un ring-ring basta. Nadie se ofende.'], ['2', 'La mano dice adónde', 'Brazo fuera antes de girar.'], ['3', 'Nunca pares en el carril', 'Para mirar el mapa, sube a la acera.'], ['4', 'Dos candados', 'Uno a la rueda y otro a algo fijo.']].flatMap(([n, h, d], i) => {
            const x = 90 + (i % 2) * 560, y = 300 + Math.floor(i / 2) * 175;
            return together([shape('rect', x, y, 530, 150, '#f6efe2'), shape('rect', x, y, 8, 150, ORANGE),
              text(n, x + 30, y + 15, 80, 120, { fontFamily: H, fontSize: 110, color: ORANGE, lineHeight: 1 }),
              text(`<b>${h}</b><br><span style="color:${DIM}">${d}</span>`, x + 120, y + 20, 390, 115, { fontSize: 26, color: INK, vAlign: 'middle' })], 'fade-up', 'click'); })],
          notes: 'Un carril bici rojo con su línea discontinua: al llegar, una bici lo cruza con un silbido. Después, un clic por cada norma.' },
        { title: 'Museos: ¿pase o entradas sueltas?', layout: 'titleOnly', bg: CREAM, extra: [
          tableBlock({ x: 90, y: 180, w: 700, h: 440, fontSize: 23, header: true, headBg: CANAL, headFg: '#ffffff', stroke: '#d8ccb6', banded: true, band: '#4682b4', color: INK,
            rows: [['Qué', 'Euros'], ['Gran museo de pintura', '23'], ['Museo de un solo pintor', '21'], ['Casa museo (con reserva)', '16'], ['Arte moderno', '20'], ['Paseo en barco por los canales', '18'],
              ['<b>Sueltas</b>', '=SUMA(B2:B6)'], ['Pase de tres días', '75'], ['<b>Diferencia</b>', '=B7-B8']], colW: [5, 2] }),
          card(`<div style="font-family:${H};font-size:56px;color:${ORANGE};line-height:1">Cuenta antes</div><div style="margin-top:12px">Si vais a ver menos de cuatro sitios, sale más barato pagar entrada por entrada. Y la casa museo se reserva semanas antes.</div>`,
            830, 190, 360, 400, '#ffffff', { fontSize: 23, color: INK, borderColor: '#e2d6c0', radius: 4 })],
          notes: 'La tabla suma las entradas sueltas con =SUMA(B2:B6) y calcula la diferencia con el pase (=B7-B8). Precios inventados: cambiadlos por los reales antes de decidir.' },
        { title: 'Cuándo florecen los tulipanes', layout: 'titleOnly', bg: '#ffffff', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 470, chartType: 'line', color: '#d6336c', seriesName: 'Tulipanes en flor (%)', grid: true, yMax: 100, yTitle: '% de campos en flor',
            data: [['1 mar', 0], ['15 mar', 5], ['1 abr', 30], ['15 abr', 85], ['1 may', 70], ['15 may', 20], ['1 jun', 0]].map(([label, value]) => ({ label, value })),
            series: [{ name: 'Narcisos (%)', values: [10, 60, 90, 40, 10, 0, 0], color: '#e6b800' }] }),
          ...['#d6336c', '#e8661c', '#e6b800', '#9b3fb5', '#f4a3bd', '#d6336c'].map((c, i) => { const w = 150 + i * 38, h = 30 + i * 8, y = 200 + [0, 30, 68, 114, 168, 230][i];
            return shape('custom', 1020 - Math.round((w + 38) / 2), y, w + 38, h, c, { path: `M${(19 / (w + 38) * 100).toFixed(1)} 0 L${(100 - 19 / (w + 38) * 100).toFixed(1)} 0 L100 100 L0 100 Z` }); }),
          text('Mediados de abril: el mejor momento para los campos de las afueras.', 850, 560, 340, 100, { fontSize: 20, color: DIM, fontStyle: 'italic' })],
          notes: 'Gráfico de líneas con dos series y eje hasta 100 %. A la derecha, los campos de flores en franjas (trapecios de colores). Porcentajes inventados para ilustrar la temporada.' },
        { layout: 'blank', bg: CREAM, extra: [
          ...row(720, 0.45).map(b => ({ ...b, opacity: 35 })),
          pollBlock({ kind: 'choice', display: 'pie', fontSize: 34, question: '¿Qué hacemos el domingo por la mañana?', x: 90, y: 60, w: 1100, h: 480,
            options: ['Mercado de flores y queso', 'Alquilar barca y remar', 'Molinos en las afueras', 'Dormir hasta tarde'] })],
          notes: 'Votación con el resultado en tarta. Al fondo, la hilera de casas pequeña y transparente.' },
        { layout: 'blank', bg: CANAL, transition: 'gallery', extra: [
          ...row(560, 0.8),
          shape('rect', 0, 560, 1280, 160, '#1d3a46'),
          ...ROW.map(([x, w, h, c]) => shape('rect', Math.round(x * 0.8 + 128), 560, Math.round(w * 0.8), Math.round(h * 0.25), c, { opacity: 30 })),
          text('TOT ZIENS!', 90, 60, 1100, 150, { fontFamily: H, fontSize: 150, textAlign: 'center', wordart: 'fill', wordartColor: ORANGE }),
          text('«¡Hasta la vista!» · Tren al aeropuerto el lunes a las 16:10', 90, 600, 1100, 50, { fontSize: 28, color: '#ffffff', textAlign: 'center' })],
          notes: 'Cierre con la hilera de casas sobre el canal, más pequeña, y transición «Galería». Text Art «Relleno» en naranja.' },
      ]);
      return finish(deck);
    } },

  // ---------------------------------------------------------------------------------
  // 10 · Sailing in Croatia: the look of a nautical chart (grid, soundings, a compass
  // rose that turns and moves with Transform), signal flags, miles and knots, the maestral.
  life_travel_eu_croatia: { name: 'Croacia a vela por Dalmacia', cat: 'life',
    summary: 'Carta náutica, rosa de los vientos que gira y viaja con Transformar, banderas, emparejar, millas con fórmulas, concurso y cuenta atrás',
    make: () => {
      const CHART = '#f3ecd9', NAVY = '#14284b', RED = '#c8102e', YEL = '#f2c230', SEA = '#cfe0e8', INK = '#1d2433', DIM = '#5b6578';
      const OSW = FF.oswald, LORA = FF.lora, ROSE = Array.from({ length: 5 }, () => uid());
      const rose = (cx, cy, r, spin = false) => { const B = (i, b) => ({ ...b, id: ROSE[i] });
        const parts = [B(0, shape('ellipse', cx - r, cy - r, 2 * r, 2 * r, 'none', { stroke: NAVY, strokeWidth: 2 })),
          B(1, shape('ellipse', cx - r * 0.82, cy - r * 0.82, 1.64 * r, 1.64 * r, 'none', { stroke: NAVY, strokeWidth: 1, dash: 'dash' })),
          B(2, shape('star8', cx - r * 0.7, cy - r * 0.7, 1.4 * r, 1.4 * r, '#9fb6c8', { opacity: 80 })),
          B(3, shape('star4', cx - r * 0.95, cy - r * 0.95, 1.9 * r, 1.9 * r, NAVY, { fill2: '#3c5a8a', gradType: 'radial' })),
          B(4, text('N', cx - 35, cy - r - 60, 70, 60, { fontFamily: OSW, fontSize: Math.max(18, Math.round(r * 0.24)), color: RED, textAlign: 'center', fontWeight: 700 }))];
        return spin ? parts.map((b, i) => i === 3 ? withAnims(b, A('spin360', { start: 'afterPrev', duration: 2500, delay: 400 })) : b) : parts; };
      const chartGrid = () => { const out = [];
        for (let x = 80; x < 1280; x += 160) out.push(shape('rect', x, 0, 1, 720, NAVY, { opacity: 18 }));
        for (let y = 60; y < 720; y += 160) out.push(shape('rect', 0, y, 1280, 1, NAVY, { opacity: 18 }));
        const R = rng(77); for (let i = 0; i < 110; i++) { const x = Math.round(40 + R() * 1180), y = Math.round(40 + R() * 620), v = Math.round(8 + R() * 70); if (x < 780 && y < 600 || x > 760 && y < 560 && x < 1200) continue; out.push(text(String(v), x, y, 40, 24, { fontSize: 13, color: '#6c7a8f', fontStyle: 'italic', decorative: true })); }
        return out; };
      // Signal flags (SVG, 150 × 100): O, B, N, C, A.
      const FL = { O: '<path d="M0 0 L150 100 L0 100Z" fill="#c8102e"/><path d="M0 0 L150 0 L150 100Z" fill="#f2c230"/>', B: '<path d="M0 0 L150 0 L115 50 L150 100 L0 100Z" fill="#c8102e"/>',
        N: [0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => `<rect x="${c * 37.5}" y="${r * 25}" width="37.5" height="25" fill="${(r + c) % 2 ? '#ffffff' : '#1f4fa0'}"/>`)).join(''),
        C: ['#1f4fa0', '#ffffff', '#c8102e', '#ffffff', '#1f4fa0'].map((c, i) => `<rect x="0" y="${i * 20}" width="150" height="20" fill="${c}"/>`).join(''),
        A: '<rect x="0" y="0" width="70" height="100" fill="#ffffff"/><path d="M70 0 L150 0 L115 50 L150 100 L70 100Z" fill="#1f4fa0"/>' };
      const flag = k => svgURL(150, 100, FL[k] + '<rect x="0.5" y="0.5" width="149" height="99" fill="none" stroke="#1d2433" stroke-width="1"/>');
      const legs = [['Split → Šolta', 12], ['Šolta → Hvar', 18], ['Hvar → Vis', 15], ['Vis → Korčula', 30], ['Korčula → Mljet', 22], ['Mljet → Dubrovnik', 25]];
      const deck = build({ name: 'Croacia a vela', palette: 'office', fonts: 'editorial', title: { size: 54, color: NAVY, font: OSW, bold: true }, body: { color: INK } }, [
        { layout: 'blank', bg: CHART, transition: 'fade', extra: [
          ...chartGrid(),
          shape('custom', 760, 420, 520, 300, '#e6dcc0', { path: 'M20 100 C10 70 30 50 60 55 C70 30 90 30 100 40 L100 100 Z', stroke: '#b8a77e', strokeWidth: 2 }),
          ...rose(930, 280, 190, true),
          kicker('SIETE DÍAS · VELERO DE 12 M · JULIO', 90, 160, 620, RED, 20),
          text('Croacia a vela', 84, 190, 720, 140, { fontFamily: OSW, fontSize: 110, fontWeight: 700, color: NAVY, lineHeight: 1 }),
          text('Una semana entre las islas de Dalmacia, de Split a Dubrovnik', 90, 340, 600, 100, { fontFamily: LORA, fontSize: 32, fontStyle: 'italic', color: DIM }),
          ...['O', 'B', 'N', 'C', 'A'].map((k, i) => img(flag(k), 90 + i * 84, 500, 66, 44, { alt: `Bandera ${k}` }))],
          notes: 'Portada de carta náutica: cuadrícula de latitud y longitud, sondas de profundidad (números al azar, siempre los mismos) y una rosa de los vientos hecha con estrellas de 4 y 8 puntas que gira al llegar. En la siguiente diapositiva viaja a la esquina con Transformar.' },
        { title: 'Banderas que hablan', layout: 'titleOnly', bg: CHART, autoAnimate: true, extra: [
          ...rose(1130, 135, 62),
          ...[['O', 'Hombre al agua', '¡La más importante! Grito y señal a la vez.'], ['B', 'Mercancía peligrosa', 'Repostando combustible.'], ['N', 'No', 'Respuesta negativa.'], ['C', 'Sí', 'Respuesta afirmativa.'], ['A', 'Buzo abajo', 'Mantente lejos y despacio.']].flatMap(([k, h, d], i) => {
            const x = 90 + i * 222;
            return together([img(flag(k), x + 26, 200, 150, 100, { alt: `Bandera ${k}` }),
              text(`<div style="font-family:${OSW};font-size:44px;color:${RED}">${k}</div><div style="font-size:24px;font-weight:700;margin:4px 0 8px">${h}</div><div style="font-size:19px;color:${DIM}">${d}</div>`, x, 320, 200, 260, { color: INK, textAlign: 'center' })], 'flip', 'click', { duration: 500, sound: 'pop' }); })],
          notes: 'Transformar: la rosa de los vientos se encoge hasta la esquina. Cada clic levanta una bandera del código internacional de señales (dibujos SVG) con su significado.' },
        { layout: 'blank', bg: CHART, extra: [
          shape('rect', 0, 0, 1280, 16, NAVY), shape('rect', 0, 16, 1280, 6, RED),
          pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada bandera con lo que dice', x: 90, y: 70, w: 1100, h: 580,
            options: ['O, roja y amarilla = Hombre al agua', 'B, roja con cola = Mercancía peligrosa', 'N, cuadros azules = No', 'C, franjas = Sí', 'A, blanca y azul = Buzo abajo'] })],
          notes: 'Actividad de emparejar desde el móvil para repasar las cinco banderas. ' },
        { title: 'Millas y horas', layout: 'titleOnly', bg: CHART, extra: [
          tableBlock({ x: 90, y: 170, w: 700, h: 460, fontSize: 23, header: true, headBg: NAVY, headFg: '#ffffff', stroke: '#c9bfa3', banded: true, band: '#4682b4', color: INK,
            rows: [['Tramo', 'Millas', 'Horas a 6 nudos'], ...legs.map(([n, m], i) => [n, String(m), `=B${i + 2}/6`]), ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [5, 2, 3] }),
          mathBlock({ x: 830, y: 190, w: 360, h: 80, fontSize: 34, color: NAVY, latex: '1\\ \\text{nudo} = 1\\ \\text{milla/h}' }),
          mathBlock({ x: 830, y: 280, w: 360, h: 80, fontSize: 34, color: RED, latex: '1\\ \\text{milla} = 1{,}852\\ \\text{km}' }),
          text('A 6 nudos, la etapa más larga (Vis → Korčula) son unas 5 horas: salida a las 9 y baño antes de comer.', 830, 390, 360, 200, { fontFamily: LORA, fontSize: 24, color: INK, fontStyle: 'italic' })],
          notes: 'La tabla calcula las horas de cada tramo dividiendo millas entre 6 nudos (=B2/6) y suma los totales. Las equivalencias van como ecuaciones. Distancias aproximadas.' },
        { title: 'El maestral, puntual como un reloj', layout: 'titleOnly', bg: '#ffffff', extra: [
          chartBlock({ x: 90, y: 170, w: 780, h: 470, chartType: 'area', color: '#3c7ab8', seriesName: 'Viento (nudos)', grid: true, yTitle: 'Nudos', yMax: 20,
            data: [['8 h', 3], ['10 h', 5], ['12 h', 10], ['14 h', 15], ['16 h', 16], ['18 h', 12], ['20 h', 5], ['22 h', 2]].map(([label, value]) => ({ label, value })) }),
          card(`<div style="font-family:${OSW};font-size:34px;color:${NAVY}">Brisa de tarde</div><div style="margin:10px 0">Sopla del noroeste las tardes de verano: perfecto para navegar a vela.</div><div style="color:${RED};font-weight:700">Si sopla del noreste y frío, es el bora: a puerto.</div>`,
            900, 190, 290, 420, CHART, { fontSize: 22, color: INK, borderColor: '#c9bfa3', radius: 4 })],
          notes: 'Gráfico de área con el viento típico de un día de julio (valores orientativos): calma por la mañana, maestral por la tarde y calma de nuevo al anochecer.' },
        { layout: 'blank', bg: CHART, extra: [
          shape('rect', 0, 704, 1280, 16, NAVY),
          pollBlock({ kind: 'quiz', fontSize: 36, question: '¿Qué nudo hace un lazo fijo que no se cierra ni se suelta?', options: ['As de guía', 'Ballestrinque', 'Nudo llano', 'Ocho'], correct: [0], time: 20, x: 90, y: 70, w: 1100, h: 580 })],
          notes: 'Concurso desde el móvil con puntos por rapidez. El as de guía es «el rey de los nudos»: aprendedlo antes de zarpar.' },
        { layout: 'blank', bg: '#f4e2c4', extra: [
          shape('rect', 0, 0, 1280, 720, '#f7d9a8', { fill2: '#f3ecd9', gradAngle: 90 }),
          shape('rect', 0, 560, 1280, 160, '#3c7ab8', { fill2: NAVY, gradAngle: 90 }),
          shape('custom', 0, 280, 1280, 290, '#c9a27a', { path: 'M0 100 L0 30 L6 30 L6 22 L10 22 L10 30 L30 30 L32 10 L38 10 L40 30 L58 30 L58 18 L64 18 L64 30 L84 30 L86 6 L92 6 L94 30 L100 30 L100 100 Z' }),
          ...Array.from({ length: 22 }, (_, i) => shape('rect', 30 + i * 56, 380 + (i % 3) * 30, 34, 22, '#c4552f')),
          text('Dubrovnik', 90, 70, 700, 110, { fontFamily: OSW, fontSize: 92, fontWeight: 700, color: NAVY }),
          ...chain([['1.940 m', 'de muralla para recorrer a pie'], ['25 m', 'de altura en su punto más alto'], ['2 h', 'sin prisa, mejor al abrir']].map(([n, l], i) =>
            text(`<span style="font-family:${OSW};font-size:46px;color:${RED}">${n}</span><br><span style="font-size:20px">${l}</span>`, 90 + i * 300, 200, 280, 110, { color: INK })), 'fade-up', 'click', { sound: 'pop' }),
          text('Última noche fondeados frente a la ciudad', 90, 610, 1100, 50, { fontFamily: LORA, fontSize: 28, color: '#ffffff', textAlign: 'center', fontStyle: 'italic' })],
          notes: 'La muralla y sus torres son una sola forma libre; los tejados, rectángulos de terracota. Cada clic muestra una cifra (redondeada) con un «pop».' },
        { layout: 'blank', bg: CHART, transition: 'convex', extra: [
          ...chartGrid(),
          text('Sretan put!', 90, 160, 720, 160, { fontFamily: OSW, fontSize: 120, fontWeight: 700, color: NAVY }),
          text('«¡Buen viaje!» · Embarque en el puerto de Split el sábado a las 17:00', 90, 330, 640, 100, { fontFamily: LORA, fontSize: 30, color: DIM, fontStyle: 'italic' }),
          text('Zarpamos en…', 830, 150, 330, 50, { fontFamily: OSW, fontSize: 32, color: RED, textAlign: 'center' }),
          timer(600, 840, 210, 310, { color: NAVY, endText: '¡Larga amarras!' }),
          ...['C', 'A', 'O', 'N'].map((k, i) => img(flag(k), 90 + i * 84, 470, 66, 44, { alt: `Bandera ${k}` }))],
          notes: 'Cierre en la carta náutica con una cuenta atrás de 10 minutos que empieza sola: tiempo para las últimas dudas antes de zarpar.' },
      ]);
      return finish(deck);
    } },
};
