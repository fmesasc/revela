// Example presentations: Empresa · comercio y retail. Ten made-up shops and campaigns (a neighbourhood
// bookshop that opens, a discount campaign, the stock of a hardware chain, a customer's journey, the
// layout of a supermarket, a boutique's window, click and collect, a bakery's loyalty card, a municipal
// market and what a till receipt says), each with its own brand and its own visual concept.
// Each one: { name, summary, cat: 'biz', make() } → a deck (see kit.js for the builders).
// All the shops, people and figures are made up (the notes say so).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (own drawings: façades, maps, floor plans, tickets…).
const svgURL = (w, h, inner, bg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const T = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const pic = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', ...props });
const device = (src, kind, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', device: kind, ...props });
const head = k => pairStacks(k).heading;
// One after another: the first on a click (or by itself with 'afterPrev'), the rest right after it.
const chain = (i, effect = 'fade-up', props = {}) => A(effect, { start: i ? 'afterPrev' : 'click', ...props });
const kicker = (s, x, y, w, color, size = 20, props = {}) => text(s, x, y, w, size + 16, { fontSize: size, letterSpacing: 5, fontWeight: 700, color, ...props });
// A 3D model without its caption (the credits go in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// A line drawn from an SVG path in a 100 × 100 box.
const stroke = (d, x, y, w, h, color, sw = 3, props = {}) => shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: sw, ...props });
// A big number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:6px">${label}</div>`,
  x, y, w, Math.round(size * 1.1 + 70), { fontSize: 24, color: fg, ...props });
// The same pseudo-random numbers every time (books, products, stalls…).
const rnd = seed => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const CAVEAT = "'Caveat', cursive", MONO = "'JetBrains Mono', 'Courier New', monospace";

// ---- 1 · La Trastienda: a bookshop-café that opens -----------------------------------
const TR = { WALL: '#eadfcb', WINE: '#7d2135', CREAM: '#f6efe3', INK: '#2a1d17', GOLD: '#d9a441', SAGE: '#6f8f6a', WOOD: '#5a3a28' };
const books = (x0, x1, yBase, seed) => { const r = rnd(seed), cols = ['#7d2135', '#d9a441', '#6f8f6a', '#2f4f6f', '#c8643b', '#e8d8b8', '#4a3a5a', '#9b2d2d'];
  let x = x0, out = '';
  while (x < x1 - 14) { const w = Math.min(10 + Math.round(r() * 14), x1 - x), h = 46 + Math.round(r() * 30), lean = r() > 0.92;
    out += `<rect x="${x}" y="${yBase - h}" width="${w}" height="${h}" fill="${cols[Math.floor(r() * cols.length)]}"${lean ? ` transform="rotate(-8 ${x} ${yBase})"` : ''}/>`
      + `<rect x="${x + 2}" y="${yBase - h + 8}" width="${Math.max(2, w - 4)}" height="3" fill="#ffffff" opacity=".35"/>`;
    x += w + 2 + (lean ? 6 : 0); }
  return out; };
const shopWindow = (x, y, w, h, shelves, seed) => `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" fill="${TR.WOOD}"/>`
  + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cfdedd"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff6dc" opacity=".35"/>`
  + `<path d="M${x + 30} ${y} L${x + 120} ${y} L${x + 20} ${y + h} L${x - 0} ${y + h} Z" fill="#ffffff" opacity=".25"/>`
  + shelves.map((sy, i) => `<rect x="${x}" y="${y + sy}" width="${w}" height="8" fill="${TR.WOOD}"/>` + books(x + 10, x + w - 10, y + sy, seed + i * 7)).join('')
  + `<rect x="${x - 20}" y="${y + h + 8}" width="${w + 40}" height="14" fill="#4a2f20"/>`;
const facadeSVG = (ribbon = false) => svgURL(1280, 720,
  '<defs><pattern id="br" patternUnits="userSpaceOnUse" width="80" height="40"><rect width="80" height="40" fill="#e9dcc4"/>'
  + '<path d="M0 0H80M0 20H80M40 0V20M0 20V40M80 20V40" stroke="#d6c2a2" stroke-width="2"/></pattern></defs>'
  + '<rect width="1280" height="720" fill="url(#br)"/>'
  + `<rect x="150" y="24" width="980" height="100" rx="6" fill="${TR.INK}"/><rect x="161" y="35" width="958" height="78" rx="4" fill="none" stroke="${TR.GOLD}" stroke-width="2"/>`
  + Array.from({ length: 20 }, (_, i) => { const x = 110 + i * 53;
    return `<rect x="${x}" y="134" width="53" height="92" fill="${i % 2 ? TR.CREAM : TR.WINE}"/><path d="M${x} 226 a26.5 26.5 0 0 0 53 0 Z" fill="${i % 2 ? TR.CREAM : TR.WINE}"/>`; }).join('')
  + '<rect x="104" y="128" width="1072" height="10" rx="5" fill="#3a2418"/><rect x="110" y="138" width="1060" height="10" fill="#000000" opacity=".12"/>'
  + shopWindow(150, 290, 380, 340, [250, 340], 3) + shopWindow(750, 290, 380, 340, [110, 220, 340], 11)
  + `<rect x="566" y="276" width="148" height="384" fill="${TR.WOOD}"/><rect x="582" y="292" width="116" height="220" fill="#cfdedd"/><rect x="582" y="526" width="116" height="120" fill="#6b4632"/>`
  + `<circle cx="686" cy="470" r="6" fill="${TR.GOLD}"/><rect x="598" y="330" width="84" height="54" rx="4" fill="${TR.CREAM}" stroke="${TR.WINE}" stroke-width="2"/>`
  + T(640, 352, 13, TR.WINE, 'MUY', ' text-anchor="middle" font-weight="700"') + T(640, 372, 13, TR.WINE, 'PRONTO', ' text-anchor="middle" font-weight="700"')
  + (ribbon ? '<rect x="540" y="420" width="200" height="26" fill="#c8102e"/><path d="M640 433 l-46 -30 v60 Z M640 433 l46 -30 v60 Z" fill="#a50d26"/><circle cx="640" cy="433" r="12" fill="#e0243f"/>' : '')
  + '<rect y="660" width="1280" height="60" fill="#b9b1a5"/>' + Array.from({ length: 9 }, (_, i) => `<line x1="${i * 160}" y1="660" x2="${i * 160 - 30}" y2="720" stroke="#a39a8d" stroke-width="3"/>`).join('')
  + [70, 1210].map(cx => `<rect x="${cx - 26}" y="600" width="52" height="60" fill="#a0522d"/><circle cx="${cx}" cy="580" r="44" fill="#4f7a43"/><circle cx="${cx - 18}" cy="560" r="26" fill="#6f9a5a"/>`).join(''));
// The neighbourhood: streets, a park, the market square; the points of interest go on top as objects.
const barrioSVG = svgURL(680, 480,
  '<rect width="680" height="480" rx="16" fill="#efe5d2"/>'
  + '<path d="M40 330 Q 140 300 230 340 T 400 360 L 420 470 L 30 470 Z" fill="#b9cf9f"/>'
  + [[0, 120, 680, 100], [0, 260, 680, 250], [0, 410, 680, 430], [120, 0, 150, 480], [330, 0, 300, 480], [520, 0, 560, 480]].map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#ffffff" stroke-width="16"/>`).join('')
  + '<path d="M0 30 L680 200" stroke="#ffffff" stroke-width="26"/><path d="M0 30 L680 200" stroke="#e2d6bd" stroke-width="2" stroke-dasharray="14 12"/>'
  + '<circle cx="430" cy="320" r="48" fill="#e4d3b3" stroke="#ffffff" stroke-width="10"/>'
  + T(150, 420, 15, '#5e7a46', 'Parque de la Alameda', ' font-style="italic"') + T(430, 325, 13, '#8a7353', 'Plaza', ' text-anchor="middle"')
  + T(470, 160, 14, '#8a7353', 'Avenida del Puerto', ' transform="rotate(14 470 160)"')
  + `<circle cx="300" cy="240" r="150" fill="none" stroke="${TR.WINE}" stroke-width="3" stroke-dasharray="10 8" opacity=".7"/>` + T(300, 82, 14, TR.WINE, '500 m', ' text-anchor="middle" font-weight="700"'));
// The shop floor: zones of the bookshop and the café.
const plantaSVG = svgURL(720, 460,
  '<rect width="720" height="460" fill="#f6efe3"/><rect x="10" y="10" width="700" height="440" fill="none" stroke="#2a1d17" stroke-width="10"/>'
  + [['#e9c9b7', 20, 20, 250, 160, 'Novedades'], ['#d9e3cf', 20, 190, 250, 250, 'Infantil'], ['#f1dfb0', 280, 20, 250, 250, 'Fondo y ensayo'],
    ['#d6c3c9', 540, 20, 160, 160, 'Almacén'], ['#c9d8de', 280, 280, 250, 160, 'Barra de café'], ['#e6d2a6', 540, 190, 160, 250, 'Rincón de\nlectura']].map(([c, x, y, w, h, l]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>` + l.split('\n').map((ln, i, a) => T(x + w / 2, y + h / 2 + 7 + (i - (a.length - 1) / 2) * 24 - (a.length > 1 ? 40 : 0), 20, '#2a1d17', ln, ' text-anchor="middle" font-weight="700"')).join('')).join('')
  + '<rect x="60" y="445" width="140" height="10" fill="#f6efe3"/>' + T(130, 438, 14, '#7d2135', 'ENTRADA', ' text-anchor="middle" font-weight="700"')
  + [0, 1, 2, 3].map(i => `<circle cx="${590 + (i % 2) * 60}" cy="${365 + Math.floor(i / 2) * 50}" r="16" fill="#7d2135" opacity=".7"/>`).join(''));

// ---- 2 · Voltio · Viernes Negro: neon price tags ---------------------------------------
const tagSVG = (color, w = 460, h = 240) => svgURL(w, h,
  `<path d="M${h / 2.4} 6 H${w - 14} a8 8 0 0 1 8 8 V${h - 14} a8 8 0 0 1 -8 8 H${h / 2.4} L6 ${h / 2} Z" fill="${color}"/>`
  + `<circle cx="${h / 2.6}" cy="${h / 2}" r="${h / 14}" fill="#07070a"/><circle cx="${h / 2.6}" cy="${h / 2}" r="${h / 14}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".6"/>`);

// ---- 3 · La Tuerca: a hardware chain's warehouse ----------------------------------------
const WH = { CONC: '#e7e4dd', KRAFT: '#c89b67', KRAFT2: '#a87b4a', BLUE: '#1f4e8c', ORANGE: '#f28c28', INK: '#1d232b', YEL: '#f6c445', RED: '#d64532', GREEN: '#2e8b57' };
const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WH.KRAFT}" stroke="${WH.KRAFT2}" stroke-width="2"/>`
  + `<rect x="${x + w / 2 - 7}" y="${y}" width="14" height="${h}" fill="#d9b88c"/><rect x="${x + 10}" y="${y + h - 34}" width="${Math.min(60, w - 20)}" height="24" fill="#ffffff"/>`
  + `<path d="M${x + 14} ${y + h - 28} v12 m4 -12 v12 m3 -12 v12 m5 -12 v12 m3 -12 v12 m6 -12 v12 m3 -12 v12" stroke="#1d232b" stroke-width="2"/>`;
const rackSVG = (() => { const r = rnd(5); let s = '';
  [0, 1, 2].forEach(lv => { const yb = 190 + lv * 200;
    let x = 50; while (x < 560) { const w = 90 + Math.round(r() * 60), h = 70 + Math.round(r() * 80); if (x + w > 580) break; if (r() > 0.18) s += box(x, yb - h, w, h); x += w + 8; } });
  return svgURL(640, 640, s + [0, 1, 2].map(lv => `<rect x="20" y="${190 + lv * 200}" width="600" height="22" fill="${WH.ORANGE}"/><rect x="40" y="${212 + lv * 200}" width="560" height="10" fill="#b8b2a6"/>`).join('')
    + [20, 600].map(x => `<rect x="${x}" y="0" width="22" height="640" fill="${WH.BLUE}"/>` + Array.from({ length: 30 }, (_, i) => `<rect x="${x + 7}" y="${10 + i * 21}" width="8" height="8" fill="#163a69"/>`).join('')).join('')); })();
const barcode = (w, h, seed, fg = '#1d232b') => { const r = rnd(seed); let x = 0, s = '';
  while (x < w - 4) { const bw = 1 + Math.floor(r() * 4); if (r() > 0.4) s += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="${fg}"/>`; x += bw + 1 + Math.floor(r() * 2); }
  return svgURL(w, h, s); };
const hazard = svgURL(1280, 24, '<defs><pattern id="hz" patternUnits="userSpaceOnUse" width="48" height="24" patternTransform="skewX(-45)"><rect width="24" height="24" fill="#f6c445"/><rect x="24" width="24" height="24" fill="#1d232b"/></pattern></defs><rect width="1280" height="24" fill="url(#hz)"/>');

// ---- 4 · Zancada: a customer's journey through a sports shop -----------------------------
const CX = { BG: '#1b1030', BG2: '#271845', FG: '#f3eefe', DIM: '#b9acd8', CORAL: '#ff6b6b', MINT: '#2ec4b6', YEL: '#ffd166', LIL: '#9b5de5', PINK: '#f15bb5' };
// Marta, flat: a runner with a headband and a sports top.
const martaSVG = svgURL(360, 420,
  `<circle cx="180" cy="210" r="172" fill="${CX.BG2}"/><circle cx="180" cy="210" r="172" fill="none" stroke="${CX.LIL}" stroke-width="4" stroke-dasharray="4 10"/>`
  + '<circle cx="180" cy="86" r="34" fill="#3b2416"/><ellipse cx="180" cy="190" rx="84" ry="96" fill="#3b2416"/>'
  + '<rect x="156" y="250" width="48" height="50" fill="#d89a76"/>'
  + `<path d="M36 420 Q 52 300 180 292 Q 308 300 324 420 Z" fill="${CX.MINT}"/><path d="M140 296 Q 180 340 220 296" fill="none" stroke="#ffffff" stroke-width="6"/>`
  + '<ellipse cx="180" cy="196" rx="68" ry="80" fill="#e8ab86"/>'
  + `<path d="M112 168 Q 130 112 184 116 Q 236 118 250 170 Q 210 142 178 150 Q 140 156 112 168 Z" fill="#3b2416"/><rect x="110" y="150" width="140" height="16" rx="8" fill="${CX.CORAL}"/>`
  + '<circle cx="154" cy="200" r="7" fill="#2b1a10"/><circle cx="206" cy="200" r="7" fill="#2b1a10"/><circle cx="140" cy="226" r="11" fill="#f08f86" opacity=".6"/><circle cx="220" cy="226" r="11" fill="#f08f86" opacity=".6"/>'
  + '<path d="M160 238 Q 180 252 200 238" fill="none" stroke="#7a3b2a" stroke-width="5" stroke-linecap="round"/>');
const STAGES = [['search', 'Busca en la web'], ['location', 'Llega a la tienda'], ['tag', 'Busca su talla'], ['activity', 'Prueba en la cinta'], ['credit-card', 'Paga en caja'], ['mail', 'Después']];
const JX = 90, JW = 1100, JY = 300, JH = 300;                // the box of the emotion curve
const jx = i => JX + JW / 12 + i * JW / 6, jy = v => JY + JH / 2 - v * 80;
const f1 = n => n.toFixed(1);
// A smooth line through points (Catmull-Rom as cubic Béziers), in a 100 × 100 box.
const smooth = pts => pts.map((p, i) => { if (!i) return `M${f1(p[0])} ${f1(p[1])}`;
  const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] || p;
  return `C${f1(p1[0] + (p[0] - p0[0]) / 6)} ${f1(p1[1] + (p[1] - p0[1]) / 6)} ${f1(p[0] - (p3[0] - p1[0]) / 6)} ${f1(p[1] - (p3[1] - p1[1]) / 6)} ${f1(p[0])} ${f1(p[1])}`; }).join(' ');
const curveOf = vals => smooth(vals.map((v, i) => [(jx(i) - JX) / JW * 100, (jy(v) - JY) / JH * 100]));

// ---- 5 · Supermercado Plaza: the floor plan, made of shapes (so Transform can move the sections) ----
const SM = { FLOOR: '#f4f2ed', INK: '#1e2126', LINE: '#c9c5bb', GREY: '#6b7078' };
const PX = 360, PY = 150;                                    // the plan's corner (860 × 520)
const SLOTS = { S1: [20, 20, 260, 100], S2: [300, 20, 260, 100], S3: [580, 20, 260, 100], S4: [700, 140, 140, 200], S5: [20, 140, 140, 200], S6: [20, 360, 220, 140], S7: [700, 360, 140, 110] };
const DEPTS = [['fresh', 'Fruta y verdura', '#3f9c4a'], ['bakery', 'Panadería', '#e09a2d'], ['dairy', 'Lácteos y huevos', '#3d7fc4'], ['meat', 'Carne y pescado', '#c0444a'],
  ['drinks', 'Bebidas', '#7a5cc0'], ['frozen', 'Congelados', '#2aa7b0'], ['home', 'Droguería', '#8a8f96']];
const HOY = { home: 'S7', drinks: 'S4', frozen: 'S3', meat: 'S2', bakery: 'S1', dairy: 'S5', fresh: 'S6' };
const NUEVO = { fresh: 'S7', bakery: 'S1', meat: 'S3', drinks: 'S2', dairy: 'S4', home: 'S5', frozen: 'S6' };
const planBase = () => [
  shape('rect', PX, PY, 860, 520, SM.FLOOR, { stroke: SM.INK, strokeWidth: 6 }),
  shape('rect', PX + 700, PY + 514, 140, 12, SM.FLOOR),
  text('ENTRADA', PX + 690, PY + 478, 160, 30, { fontSize: 15, color: SM.INK, fontWeight: 700, textAlign: 'center', letterSpacing: 3 }),
  ...[0, 1, 2, 3].map(i => shape('rounded', PX + 190, PY + 160 + i * 46, 480, 20, '#d9d5cc', { radius: 6 })),
  text('Pasillos: alimentación seca', PX + 190, PY + 340, 480, 30, { fontSize: 15, color: SM.GREY, textAlign: 'center' }),
  ...[0, 1, 2, 3, 4].map(i => shape('rounded', PX + 280 + i * 80, PY + 400, 50, 70, '#ffffff', { radius: 6, stroke: SM.INK, strokeWidth: 2 })),
  text('Cajas', PX + 280, PY + 474, 370, 28, { fontSize: 15, color: SM.GREY, textAlign: 'center' })];
// The sections in a layout, with the same ids in every slide (blocks of colour and their names).
const DEPT_IDS = Object.fromEntries(DEPTS.map(([k]) => [k, [uid(), uid()]]));
const planDepts = (layout, anims) => DEPTS.flatMap(([k, name, c], i) => { const [x, y, w, h] = SLOTS[layout[k]];
  const blk = { ...shape('rounded', PX + x, PY + y, w, h, c, { radius: 10 }), id: DEPT_IDS[k][0] };
  const lab = { ...text(name, PX + x + 8, PY + y + 8, w - 16, h - 16, { fontSize: 18, color: '#ffffff', fontWeight: 700, textAlign: 'center', vAlign: 'middle' }), id: DEPT_IDS[k][1] };
  return anims ? [withAnims(blk, chain(i, 'zoom-in', { duration: 280, start: 'afterPrev' })), withAnims(lab, A('fade-in', { start: 'withPrev', duration: 280 }))] : [blk, lab]; });
// A gondola seen from the front: four shelves of products.
const shelfSVG = (() => { const r = rnd(17), cols = [['#c0444a', '#e07a5f'], ['#3d7fc4', '#7fb3e6'], ['#e09a2d', '#f2c66d'], ['#3f9c4a', '#8cc68f'], ['#7a5cc0', '#b49be6']];
  let s = '<rect width="600" height="480" fill="#e9e6df"/><rect x="10" y="0" width="16" height="480" fill="#9aa0a6"/><rect x="574" y="0" width="16" height="480" fill="#9aa0a6"/>';
  [[20, 110, 0.6], [130, 220, 1], [240, 330, 0.85], [350, 450, 0.55]].forEach(([top, base, sat]) => {
    let x = 34; while (x < 560) { const [a, b] = cols[Math.floor(r() * cols.length)], w = 26 + Math.round(r() * 22), h = (base - top) * (0.55 + r() * 0.4), bottle = r() > 0.6;
      if (x + w > 566) break;
      s += bottle ? `<rect x="${x + w * 0.3}" y="${base - h - 10}" width="${w * 0.4}" height="14" rx="3" fill="${b}" opacity="${sat}"/><rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="${w * 0.3}" fill="${a}" opacity="${sat}"/>`
        : `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="3" fill="${a}" opacity="${sat}"/><rect x="${x + 4}" y="${base - h + 8}" width="${w - 8}" height="${h * 0.3}" fill="${b}" opacity="${sat}"/>`;
      x += w + 4; }
    s += `<rect x="20" y="${base}" width="560" height="12" fill="#b9bdc2"/><rect x="40" y="${base + 2}" width="34" height="8" fill="#fff"/>`; });
  return svgURL(600, 480, s); })();

// ---- 6 · Albar: a boutique's autumn window -------------------------------------------------
const AL = { BG: '#171311', IVORY: '#f4ece1', RUST: '#c0603a', SAND: '#d8c3a5', OLIVE: '#7b7a4a', INK: '#2b2a33', DIM: '#a8998a' };
const HEADS = [[220, 172], [450, 112], [680, 202]];          // the mannequins' heads, in the window's 900 × 520
const mannequin = (cx, top, coat, h, floor) => `<circle cx="${cx}" cy="${top + 22}" r="22" fill="#efe4d4"/><rect x="${cx - 6}" y="${top + 42}" width="12" height="18" fill="#efe4d4"/>`
  + `<path d="M${cx - 40} ${top + 64} Q ${cx} ${top + 52} ${cx + 40} ${top + 64} L ${cx + 58} ${top + 64 + h} L ${cx - 58} ${top + 64 + h} Z" fill="${coat}"/>`
  + `<rect x="${cx - 20}" y="${top + 64 + h}" width="12" height="${floor - top - 64 - h}" fill="#2a211c"/><rect x="${cx + 8}" y="${top + 64 + h}" width="12" height="${floor - top - 64 - h}" fill="#2a211c"/>`;
const windowSVG = svgURL(900, 520,
  '<defs><radialGradient id="lit" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="#f6dfba"/><stop offset=".55" stop-color="#c98e5e"/><stop offset="1" stop-color="#4a2e20"/></radialGradient></defs>'
  + '<rect width="900" height="520" fill="#0b0908"/><rect x="24" y="24" width="852" height="472" fill="url(#lit)"/>'
  + [220, 450, 680].map(x => `<path d="M${x - 14} 24 L${x + 14} 24 L${x + 110} 420 L${x - 110} 420 Z" fill="#fff8e8" opacity=".13"/><rect x="${x - 16}" y="24" width="32" height="12" fill="#2a211c"/>`).join('')
  + '<rect x="24" y="420" width="852" height="76" fill="#3b2a20"/><rect x="370" y="380" width="160" height="40" fill="#e9dcc8"/>'
  + mannequin(220, 150, AL.RUST, 166, 420) + mannequin(450, 90, AL.OLIVE, 210, 380) + mannequin(680, 180, AL.SAND, 140, 420)
  + '<rect x="560" y="360" width="64" height="60" fill="#8a5a3b"/><rect x="566" y="348" width="52" height="16" fill="#6b4632"/><rect x="574" y="330" width="40" height="20" fill="#c0603a"/>'
  + Array.from({ length: 26 }, (_, i) => `<ellipse cx="${40 + (i * 131) % 820}" cy="${436 + (i * 37) % 52}" rx="11" ry="5" fill="${[AL.RUST, AL.OLIVE, '#d9a441', '#8a3b22'][i % 4]}" transform="rotate(${(i * 47) % 180} ${40 + (i * 131) % 820} ${436 + (i * 37) % 52})"/>`).join('')
  + T(800, 62, 18, '#5a3826', 'A L B A R', ' text-anchor="middle" letter-spacing="6"', 'Georgia, serif'));

// ---- 7 · Peonza: a toy shop chain, click and collect ----------------------------------------
const PZ = { BG: '#0f2940', BG2: '#163a5a', FG: '#f2f6fa', DIM: '#9fb6cc', CORAL: '#ff7a59', SKY: '#7fb8e6', MINT: '#50e3c2', YEL: '#f5c84b' };
// A wooden toy train, drawn (for the screens).
const trainSVG = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="0" y="40" width="90" height="50" rx="6" fill="#ff7a59"/><rect x="10" y="0" width="50" height="45" rx="5" fill="#f5c84b"/><rect x="18" y="8" width="34" height="22" rx="3" fill="#7fb8e6"/>`
  + '<rect x="100" y="50" width="80" height="40" rx="6" fill="#50e3c2"/><rect x="190" y="50" width="80" height="40" rx="6" fill="#7fb8e6"/><rect x="88" y="66" width="14" height="6" fill="#8a5a3b"/><rect x="178" y="66" width="14" height="6" fill="#8a5a3b"/>'
  + [20, 70, 120, 160, 210, 250].map(cx => `<circle cx="${cx}" cy="94" r="13" fill="#2b2b2b"/><circle cx="${cx}" cy="94" r="5" fill="#f2f2f2"/>`).join('') + '</g>';
const peonzaApp = svgURL(360, 720,
  `<rect width="360" height="110" fill="${PZ.CORAL}"/>` + T(24, 66, 30, '#ffffff', 'Peonza', ' font-weight="800"') + T(336, 66, 16, '#ffffff', 'Cesta (1)', ' text-anchor="end"')
  + '<rect x="18" y="128" width="324" height="200" rx="18" fill="#fff4e6"/>' + trainSVG(44, 170, 1)
  + T(24, 368, 21, '#173049', 'Tren de madera, 24 piezas', ' font-weight="700"') + T(24, 400, 22, PZ.CORAL, '34,90 €', ' font-weight="800"')
  + T(24, 446, 16, '#5a6b7c', 'Disponible en tus tiendas:')
  + [['Peonza Centro · 0,6 km', 'Hoy 18:30', '#1f9d7a'], ['Peonza Las Eras · 3,1 km', 'Mañana', '#c98a0b']].map(([n, w, c], i) => { const y = 462 + i * 62;
    return `<rect x="18" y="${y}" width="324" height="52" rx="12" fill="#ffffff" stroke="#dfe6ee"/><circle cx="40" cy="${y + 26}" r="7" fill="${c}"/>` + T(56, y + 32, 15, '#173049', n) + T(330, y + 32, 15, c, w, ' text-anchor="end" font-weight="700"'); }).join('')
  + `<rect x="18" y="600" width="324" height="64" rx="32" fill="${PZ.MINT}"/>` + T(180, 640, 19, '#0f2940', 'Recoger hoy · gratis', ' text-anchor="middle" font-weight="800"'),
  '#f6f8fb');
const peonzaWeb = svgURL(1280, 760,
  `<rect width="1280" height="80" fill="#ffffff"/><rect y="80" width="1280" height="2" fill="#e3e8ef"/>` + T(48, 52, 30, PZ.CORAL, 'Peonza', ' font-weight="800"')
  + ['Juegos de mesa', 'Construcción', 'Madera', 'Exterior', 'Libros'].map((t, i) => T(260 + i * 150, 50, 17, '#4a5b6c', t)).join('')
  + '<rect x="48" y="120" width="560" height="420" rx="24" fill="#fff4e6"/>' + trainSVG(110, 260, 1.6)
  + T(660, 170, 36, '#173049', 'Tren de madera, 24 piezas', ' font-weight="800"') + T(660, 220, 20, '#6a7b8c', 'Haya de bosques gestionados · a partir de 3 años') + T(660, 290, 44, PZ.CORAL, '34,90 €', ' font-weight="800"')
  + [['Envío a casa', 'En 2 o 3 días · 3,95 €', false], ['Recoger en tienda', 'Peonza Centro · hoy desde las 18:30 · gratis', true]].map(([a, b, on], i) => { const y = 330 + i * 96;
    return `<rect x="660" y="${y}" width="560" height="80" rx="16" fill="${on ? '#eafbf6' : '#ffffff'}" stroke="${on ? '#1f9d7a' : '#dfe6ee'}" stroke-width="${on ? 3 : 2}"/><circle cx="700" cy="${y + 40}" r="12" fill="none" stroke="${on ? '#1f9d7a' : '#9aa9b8'}" stroke-width="3"/>`
      + (on ? `<circle cx="700" cy="${y + 40}" r="6" fill="#1f9d7a"/>` : '') + T(730, y + 34, 20, '#173049', a, ' font-weight="700"') + T(730, y + 62, 16, '#5a6b7c', b); }).join('')
  + `<rect x="660" y="540" width="560" height="70" rx="35" fill="${PZ.CORAL}"/>` + T(940, 584, 22, '#ffffff', 'Añadir a la cesta', ' text-anchor="middle" font-weight="800"')
  + T(48, 600, 18, '#173049', 'Stock en tiempo real', ' font-weight="700"') + T(48, 630, 16, '#5a6b7c', 'Centro: 6 · Las Eras: 2 · Puerto: 0 · Almacén: 140'), '#f6f8fb');

// ---- 8 · Horno de Cata: a bakery's loyalty card ---------------------------------------------
const HC = { BG: '#2a1a12', BG2: '#3a261b', CREAM: '#fbf3e4', RED: '#b8322a', GOLD: '#e0a84a', BROWN: '#6b3e26', DIM: '#cdb59b' };
const SLOT = (i, x0, y0, k = 1) => [x0 + (60 + (i % 5) * 110) * k, y0 + (200 + Math.floor(i / 5) * 110) * k];   // the centre of stamp i on a card
const stampCard = svgURL(640, 380,
  `<rect x="4" y="4" width="632" height="372" rx="22" fill="${HC.CREAM}" stroke="#e6d6bb" stroke-width="2"/>`
  + `<rect x="4" y="4" width="632" height="120" rx="22" fill="${HC.BROWN}"/><rect x="4" y="100" width="632" height="24" fill="${HC.BROWN}"/>`
  + `<path d="M40 64 q 20 -40 40 0 q 20 -40 40 0" fill="none" stroke="${HC.GOLD}" stroke-width="5"/>`
  + T(140, 62, 30, HC.CREAM, 'Horno de Cata', ' font-weight="700" font-style="italic"', 'Georgia, serif') + T(140, 96, 16, HC.DIM, 'PANADERÍA · CAFÉ · DESDE 1987', ' letter-spacing="3"')
  + Array.from({ length: 10 }, (_, i) => { const [cx, cy] = SLOT(i, 0, 0);
    return `<circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="${i === 9 ? HC.RED : '#c9b08c'}" stroke-width="3" stroke-dasharray="6 6"/>` + T(cx, cy + 8, 22, '#c9b08c', i === 9 ? '' : String(i + 1), ' text-anchor="middle"', 'Georgia, serif'); }).join(''));
const horno = (x, y, w, h, alt = 'Tarjeta de sellos del Horno de Cata', props = {}) => pic(stampCard, x, y, w, h, alt, props);
const cataApp = svgURL(360, 720,
  `<rect width="360" height="120" fill="${HC.BROWN}"/>` + T(24, 70, 28, HC.CREAM, 'Club del Horno', ' font-weight="700" font-style="italic"', 'Georgia, serif')
  + T(24, 104, 15, HC.DIM, 'Nivel Hogaza · 7 de 10 sellos')
  + '<rect x="24" y="150" width="312" height="200" rx="18" fill="#ffffff"/>' + Array.from({ length: 10 }, (_, i) => { const cx = 66 + (i % 5) * 57, cy = 210 + Math.floor(i / 5) * 80;
    return `<circle cx="${cx}" cy="${cy}" r="22" fill="${i < 7 ? HC.RED : 'none'}" stroke="${i < 7 ? HC.RED : '#c9b08c'}" stroke-width="3"${i < 7 ? '' : ' stroke-dasharray="4 4"'}/>`; }).join('')
  + '<rect x="90" y="380" width="180" height="180" fill="#ffffff"/>' + Array.from({ length: 81 }, (_, i) => ((i * 37) % 7 < 3 || [0, 8, 72].some(c => [0, 1, 9, 10].includes(i - c)) ? `<rect x="${100 + (i % 9) * 18}" y="${390 + Math.floor(i / 9) * 18}" width="18" height="18" fill="#2a1a12"/>` : '')).join('')
  + T(180, 590, 16, '#5a4636', 'Enseña el código al pagar', ' text-anchor="middle"')
  + `<rect x="24" y="620" width="312" height="60" rx="30" fill="${HC.GOLD}"/>` + T(180, 657, 18, HC.BG, 'Faltan 3 cafés para el regalo', ' text-anchor="middle" font-weight="700"'),
  HC.CREAM);

// ---- 9 · Mercado del Carmen: a municipal market ---------------------------------------------
const MC = { TILE: '#eef2ea', GREEN: '#1f5e4a', IRON: '#2f3b36', SLATE: '#2d322f', CHALK: '#f4f1e8', WOOD: '#a8743f', TOMATO: '#d9472b', ORANGE: '#f29e38', LEMON: '#f2d14b', LEAF: '#5b9a3c' };
const marketSVG = svgURL(1280, 720,
  '<defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6e0"/><stop offset="1" stop-color="#8fbfb2"/></linearGradient>'
  + `<pattern id="az" patternUnits="userSpaceOnUse" width="60" height="60"><rect width="60" height="60" fill="#eef2ea"/><path d="M30 6 L54 30 L30 54 L6 30 Z" fill="none" stroke="#9cc1b4" stroke-width="3"/><circle cx="30" cy="30" r="6" fill="#4f8f7a"/><circle cx="0" cy="0" r="8" fill="#4f8f7a"/><circle cx="60" cy="0" r="8" fill="#4f8f7a"/><circle cx="0" cy="60" r="8" fill="#4f8f7a"/><circle cx="60" cy="60" r="8" fill="#4f8f7a"/></pattern></defs>`
  + '<rect width="1280" height="720" fill="url(#az)"/><ellipse cx="640" cy="92" rx="500" ry="82" fill="#eef2ea" opacity=".94"/><g transform="translate(64 100) scale(0.9)">'
  + `<path d="M240 640 V330 A400 300 0 0 1 1040 330 V640 Z" fill="url(#gl)"/>`
  + Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (i / 10); return `<line x1="640" y1="330" x2="${(640 - 400 * Math.cos(a)).toFixed(0)}" y2="${(330 - 300 * Math.sin(a)).toFixed(0)}" stroke="${MC.IRON}" stroke-width="5"/>`; }).join('')
  + `<path d="M240 330 A400 300 0 0 1 1040 330" fill="none" stroke="${MC.IRON}" stroke-width="16"/><path d="M330 330 A310 220 0 0 1 950 330" fill="none" stroke="${MC.IRON}" stroke-width="5"/>`
  + `<rect x="226" y="330" width="828" height="18" fill="${MC.IRON}"/>` + [240, 420, 600, 680, 860, 1040].map(x => `<rect x="${x - 10}" y="330" width="20" height="310" fill="${MC.IRON}"/>`).join('')
  + `<circle cx="640" cy="330" r="60" fill="${MC.IRON}"/><circle cx="640" cy="330" r="46" fill="#cfe6e0"/>` + T(640, 342, 30, MC.IRON, '1902', ' text-anchor="middle" font-weight="700"', 'Georgia, serif')
  + [[260, MC.TOMATO], [440, MC.LEAF], [880, MC.ORANGE]].map(([x, c]) => `<rect x="${x}" y="420" width="150" height="26" fill="${c}"/>` + Array.from({ length: 5 }, (_, i) => `<path d="M${x + i * 30} 446 a15 15 0 0 0 30 0 Z" fill="${c}"/>`).join('')
    + `<rect x="${x + 6}" y="540" width="138" height="100" fill="${MC.WOOD}"/>` + Array.from({ length: 9 }, (_, i) => `<circle cx="${x + 22 + (i % 5) * 26}" cy="${532 + Math.floor(i / 5) * 14}" r="13" fill="${[MC.TOMATO, MC.ORANGE, MC.LEMON, MC.LEAF][(i + x) % 4]}"/>`).join('')).join('')
  + `<rect x="600" y="430" width="80" height="210" fill="#5a4630"/></g><rect x="0" y="676" width="1280" height="44" fill="#c9c2b4"/><rect x="0" y="676" width="1280" height="6" fill="#a39c8e"/>`);
// A chalk slate in a wooden frame.
const slate = (html, x, y, w, h, props = {}) => card(html, x, y, w, h, MC.SLATE, { radius: 6, borderColor: MC.WOOD, fontFamily: CAVEAT, fontSize: 34, color: MC.CHALK, textAlign: 'center', vAlign: 'middle', pad: [14, 16, 14, 16], shadow: { x: 0, y: 8, blur: 14, color: '#00000055' }, ...props });

// ---- 10 · Super Vecino: what a till receipt says --------------------------------------------
const RC = { BG: '#1d2226', PAPER: '#fbfaf6', INK: '#26292c', TEAL: '#2bb3a3', AMBER: '#f2a93b', ROSE: '#e2546b', DIM: '#9aa4ad' };
const receiptSVG = (lines, h) => svgURL(360, h,
  `<path d="M0 8 ${Array.from({ length: 31 }, (_, i) => `L${i * 12} ${i % 2 ? 0 : 8}`).join(' ')} L360 ${h - 8} ${Array.from({ length: 31 }, (_, i) => `L${360 - i * 12} ${h - (i % 2 ? 0 : 8)}`).join(' ')} Z" fill="${RC.PAPER}"/>`
  + lines.map(([a, b, y, z = 17]) => T(24, y, z, RC.INK, a, z > 17 ? ' font-weight="700"' : '', 'Courier New, monospace') + (b ? T(336, y, z, RC.INK, b, ' text-anchor="end"' + (z > 17 ? ' font-weight="700"' : ''), 'Courier New, monospace') : '')).join(''));
const TICKET = [['  SUPER VECINO', '', 50, 22], ['C/ del Olmo, 12', '', 80], ['14/10/2026  19:42  CAJA 2', '', 104], ['--------------------------', '', 132],
  ['PAN DE PUEBLO', '1,40', 162], ['TOMATE PERA 1KG', '2,15', 190], ['ACEITE OLIVA V.E. 1L', '8,95', 218], ['HUEVOS L 12 UD', '3,10', 246], ['LECHE ENTERA 6X1L', '5,34', 274],
  ['QUESO FRESCO', '1,85', 302], ['YOGUR NATURAL 4X', '0,95', 330], ['CHOCOLATE 70%', '1,49', 358], ['--------------------------', '', 386], ['TOTAL', '25,23', 418, 22],
  ['ARTÍCULOS: 8', '', 448], ['TARJETA ****4417', '', 472], ['--------------------------', '', 500], ['  GRACIAS POR SU VISITA', '', 540, 18]];

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Opening a bookshop-café: a façade with a striped awning, the neighbourhood map, the floor plan and the countdown.
  biz_retail_opening: { name: 'Apertura de una librería-café', summary: 'Fachada dibujada con toldo, mapa del barrio con puntos en cadena, Venn, sillón 3D, cronología, tabla con fórmulas y cuenta atrás', cat: 'biz', make: () => {
    const { WALL, WINE, CREAM, INK, GOLD, SAGE } = TR, H = head('editorial'), SIGN = uid();
    const sign = size => ({ ...text('La Trastienda', 160, 36, 960, 76, { fontFamily: H, fontSize: size, color: GOLD, textAlign: 'center', vAlign: 'middle', letterSpacing: 3, fontWeight: 700 }), id: SIGN });
    const pois = [['star', 300, 240, GOLD, 'La Trastienda', 'L'], ['school', 160, 150, SAGE, 'Colegio Alameda', 'R'], ['school', 470, 400, SAGE, 'Colegio del Puerto', 'R'],
      ['graduation-cap', 560, 260, SAGE, 'Instituto', 'L'], ['store', 430, 320, '#c8643b', 'Mercado', 'R'], ['train-front', 220, 80, '#2f4f6f', 'Metro Alameda', 'R']];
    return numbered(build({ name: 'La Trastienda · plan de apertura', palette: 'paper', fonts: 'editorial', title: { color: WINE, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: WALL, transition: 'fade', extra: [
        pic(facadeSVG(), 0, 0, 1280, 720, 'Fachada de la librería con toldo a rayas, dos escaparates y la puerta'),
        sign(54),
        withAnims(card(`<div style="font-size:17px;letter-spacing:4px;color:${WINE};font-weight:700">PRÓXIMA APERTURA</div><div style="font-family:${H};font-size:64px;color:${INK};line-height:1.1;margin-top:4px">14</div><div style="font-family:${H};font-size:26px;color:${INK};margin-bottom:8px">de noviembre</div><div style="font-size:18px;color:#6a5444">Plan de apertura · librería, café y club de barrio</div>`,
          172, 312, 336, 218, CREAM, { radius: 4, pad: [14, 14, 14, 14], borderColor: WINE, rotation: -2, textAlign: 'center' }), A('fade-down', { start: 'afterPrev', delay: 300, duration: 700 }))],
        notes: 'Portada dibujada a mano en SVG: fachada de ladrillo, toldo a rayas con festón, escaparates con libros y la puerta. El cartel del escaparate cae solo al llegar. Presenta el proyecto en una frase: una librería con café y club en un barrio que no tiene ninguna.' },
      { layout: 'titleOnly', title: 'Un barrio sin librería', bg: CREAM, extra: [
        pic(barrioSVG, 70, 170, 680, 480, 'Plano del barrio con un radio de 500 metros alrededor del local'),
        ...pois.flatMap(([ic, x, y, c, l, side], i) => [
          withAnims(icon(ic, 70 + x - 20, 170 + y - 20, 40, c), chain(i, 'zoom-in', { duration: 350, sound: 'pop' })),
          withAnims(text(`<b>${l}</b>`, 70 + x + (side === 'L' ? -200 : 26), 170 + y - 16, 174, 32, { fontSize: 17, color: INK, textAlign: side === 'L' ? 'right' : 'left', bg: '#efe5d2cc', radius: 4, pad: [2, 6, 2, 6] }), A('fade-in', { start: 'withPrev', duration: 300 }))]),
        withAnims(stat('12.400', 'vecinos a menos de 500 metros', 800, 170, 410, WINE, INK, 64), chain(0, 'fade-left')),
        withAnims(stat('4', 'centros educativos en el radio', 800, 330, 410, SAGE, INK, 64), chain(1, 'fade-left')),
        withAnims(stat('2,4 km', 'hasta la librería más cercana', 800, 490, 410, '#c8643b', INK, 64), chain(1, 'fade-left'))],
        notes: 'Los puntos del mapa aparecen en cadena con un sonido de «pop»; después, las tres cifras. Datos de población inventados para la plantilla: cámbialos por los del padrón de tu barrio.' },
      { layout: 'titleOnly', title: 'Tres negocios bajo un mismo techo', bg: CREAM, extra: [
        dg('venn', 'Librería\nCafé\nClub de barrio', 70, 170, 600, 470, { colors: 'colorful', fontScale: 1.2 }),
        ...[['Librería', '6.000 títulos de fondo y novedades; encargos en 48 horas.', WINE], ['Café', 'Desayunos y meriendas con pan del obrador de la esquina.', '#c8643b'],
          ['Club de barrio', 'Lectura, cuentacuentos y ajedrez por 8 € al mes.', SAGE]].map(([h, d, c], i) =>
          withAnims(text(`<div style="font-family:${H};font-size:30px;color:${c};font-weight:700">${h}</div><div>${d}</div>`, 720, 190 + i * 150, 480, 130,
            { fontSize: 23, color: INK, borderColor: c + '66', pad: [12, 18, 12, 18], radius: 6 }), chain(i, 'fade-left')))],
        notes: 'El diagrama de Venn resume el concepto: el club es lo que une la librería y el café. Cada pieza del negocio entra con un clic y las siguientes encadenadas.' },
      { layout: 'titleOnly', title: 'El local: 140 m² en una esquina', bg: WALL, extra: [
        withAnims(pic(plantaSVG, 70, 170, 720, 460, 'Plano del local por zonas'), A('fade-in', { start: 'afterPrev', duration: 600 })),
        m3d('kh-SheenChair', 830, 160, 380, 330, { autoRotate: true, spin: 16, view: 'three', edge: 'fade' }),
        text(`<div style="font-family:${H};font-size:30px;color:${WINE};font-weight:700">Rincón de lectura</div><div>12 butacas, luz cálida y un enchufe en cada una. Aquí se queda la gente.</div>`,
          830, 500, 380, 140, { fontSize: 22, color: INK })],
        notes: 'El plano es un dibujo SVG propio con las seis zonas. La butaca 3D gira despacio con los bordes difuminados (Modelo 3D ▸ Movimiento 3D ▸ Giro). Superficie y aforo de ejemplo.' },
      { layout: 'titleOnly', title: 'Cinco meses hasta abrir', bg: CREAM, transition: 'slide', extra: [
        dg('timeline', 'Julio\n  Licencia de obra\nAgosto\n  Reforma del local\nSeptiembre\n  Estanterías y barra\nOctubre\n  Fondo inicial y equipo\nNoviembre\n  ¡Inauguración!', 70, 180, 1140, 420, { oneByOne: true, colors: 'accent', fontScale: 1.1 }),
        text('Hito crítico: la licencia de actividad (seis semanas de media en el distrito).', 70, 620, 1140, 40, { fontSize: 22, color: '#6a5444', fontStyle: 'italic' })],
        notes: 'Cronología que aparece hito a hito al presentar (Diagrama ▸ Uno a uno al presentar). Subraya el hito crítico: sin licencia no hay apertura. Plazos orientativos.' },
      { layout: 'titleOnly', title: 'Inversión inicial', bg: CREAM, extra: [
        tableBlock({ x: 70, y: 170, w: 600, h: 460, fontSize: 24, header: true, headBg: WINE, headFg: CREAM, stroke: '#d9c8ad', banded: true, band: GOLD, color: INK, colW: [3, 1.4],
          rows: [['Concepto', 'Importe'], ['Reforma del local', '38.000 €'], ['Fondo inicial de libros', '32.000 €'], ['Mobiliario y estanterías', '14.500 €'], ['Cafetera y barra', '9.800 €'],
            ['Licencias y proyecto', '4.200 €'], ['Comunicación y apertura', '3.500 €'], ['<b>Total</b>', '=SUMA(ARRIBA)']] }),
        chartBlock({ x: 710, y: 170, w: 500, h: 460, chartType: 'doughnut', data: [{ label: 'Reforma', value: 38000, color: WINE }, { label: 'Libros', value: 32000, color: GOLD },
          { label: 'Mobiliario', value: 14500, color: SAGE }, { label: 'Barra', value: 9800, color: '#c8643b' }, { label: 'Licencias', value: 4200, color: '#2f4f6f' }, { label: 'Apertura', value: 3500, color: '#9a8b7a' }] })],
        notes: 'La última fila es una fórmula (=SUMA(ARRIBA)): si cambias una partida, el total se recalcula solo. La dona reparte la misma inversión. Importes inventados.' },
      { layout: 'titleOnly', title: 'Previsión de ventas', bg: CREAM, extra: [
        chartBlock({ x: 70, y: 170, w: 760, h: 470, chartType: 'stacked', color: WINE, seriesName: 'Libros', grid: true, yTitle: 'Miles de euros',
          data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'].map((l, i) => ({ label: l, value: [42, 48, 39, 71, 52, 58, 46, 84][i] })),
          series: [{ name: 'Café', values: [18, 22, 24, 23, 26, 29, 31, 30], color: GOLD }, { name: 'Club y talleres', values: [3, 5, 6, 7, 9, 10, 11, 12], color: SAGE }] }),
        withAnims(card(`<div style="font-family:${H};font-size:54px;color:${WINE};font-weight:700;line-height:1">Mes 14</div><div style="margin-top:10px">punto de equilibrio, con un ticket medio de 17 € y 95 clientes al día.</div>`,
          870, 210, 340, 250, '#ffffff', { fontSize: 23, color: INK, borderColor: '#e2d3bb' }), A('zoom-in', { start: 'click' })),
        text('Navidad (T4 y T8) dispara la venta de libros.', 870, 490, 340, 90, { fontSize: 21, color: '#6a5444', fontStyle: 'italic' })],
        notes: 'Barras apiladas por trimestre durante los dos primeros años: libros, café y club. Las cifras son una previsión de ejemplo; usa las de tu plan de negocio.' },
      { layout: 'titleOnly', title: 'El día de la inauguración', bg: WALL, extra: [
        ...[['11:00', 'Cuentacuentos', 'Para peques de 3 a 8 años', 'book-open', SAGE], ['13:00', 'Vermú de vecinos', 'Con la asociación del barrio', 'coffee', '#c8643b'],
          ['18:00', 'Firma de libros', 'Una autora de la zona', 'pencil', WINE], ['20:00', 'Música en directo', 'Trío de jazz en la acera', 'music', '#2f4f6f']].map(([h, t, d, ic, c], i) => {
          const x = 70 + i * 290;
          return [withAnims(shape('rounded', x, 180, 270, 370, CREAM, { radius: 14, stroke: c, strokeWidth: 3 }), chain(i, 'fade-up', { duration: 450 })),
            withAnims(shape('rect', x, 180, 270, 14, c), A('fade-in', { start: 'withPrev' })),
            withAnims(icon(ic, x + 105, 225, 60, c), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-family:${H};font-size:44px;font-weight:700;color:${c}">${h}</div><div style="font-size:26px;font-weight:700;margin:8px 0">${t}</div><div>${d}</div>`,
              x + 15, 305, 240, 230, { fontSize: 21, color: INK, textAlign: 'center' }), A('fade-in', { start: 'withPrev' }))]; }).flat(),
        text('Entrada libre · aforo de 60 personas · sorteo de un lote de libros a las 20:30', 70, 585, 1140, 50, { fontSize: 24, color: WINE, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Programa del día: cada franja entra después de la anterior con un solo clic. Detalla quién se encarga de cada actividad.' },
      { layout: 'blank', bg: CREAM, extra: [pollBlock({ fontSize: 32, question: '¿Qué club te gustaría que empezara primero?', options: ['Club de lectura', 'Cuentacuentos infantil', 'Ajedrez los domingos', 'Escritura creativa'], display: 'bar', x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación en directo: el público escanea el código QR con el móvil. El club ganador se anuncia el día de la inauguración.' },
      { layout: 'blank', bg: WALL, transition: 'zoom', autoAnimate: true, extra: [
        pic(facadeSVG(true), 0, 0, 1280, 720, 'La fachada con una cinta roja en la puerta'),
        sign(54),
        card(`<div style="font-size:17px;letter-spacing:4px;color:${WINE};font-weight:700">CORTE DE CINTA</div><div style="font-family:${H};font-size:30px;color:${INK};margin-top:4px">sábado 14 · 11:00</div>`,
          178, 318, 324, 110, CREAM, { radius: 4, pad: [14, 16, 14, 16], borderColor: WINE, rotation: -2, textAlign: 'center' }),
        shape('rounded', 772, 306, 336, 150, CREAM, { radius: 6, stroke: WINE, strokeWidth: 2, rotation: 2 }),
        timer(10, 800, 320, 280, { style: 'digital', h: 120, color: WINE, auto: false, endText: '¡Abrimos!', rotation: 2 })],
        notes: 'Cierre con Transformar: el rótulo se queda en su sitio y aparece la cinta roja. Haz clic en la cuenta atrás de 10 segundos para «cortar la cinta» con todo el público contando.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · A discount campaign for an electronics chain: black, neon tags, struck prices and a countdown.
  biz_retail_blackfriday: { name: 'Campaña de Viernes Negro', summary: 'Negro y neón: etiquetas de precio, cifras con sonido, precios tachados, líneas por horas, embudo, tabla con fórmulas, concurso y cuenta atrás', cat: 'biz', make: () => {
    const BG = '#07070a', PINK = '#ff2d75', YEL = '#ffe500', CYAN = '#22e4ff', W = '#ffffff', DIM = '#9a9aab', PANEL = '#14141c', H = head('bold');
    const neon = c => `0 0 8px ${c}, 0 0 22px ${c}`;
    return numbered(build({ name: 'Voltio · Viernes Negro 2026', palette: 'midnight', fonts: 'bold', title: { color: W, size: 66, letterSpacing: 2 }, body: { color: W },
      decor: () => [shape('rect', 0, 712, 1280, 8, PINK, { fill2: CYAN, gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(-200, 300, 760, '#5a0f33', BG, 70), glow(820, -240, 700, '#0c3d4a', BG, 60),
        kicker('VOLTIO · CAMPAÑA 2026', 84, 130, 600, CYAN, 22, { letterSpacing: 8 }),
        text('VIERNES<br>NEGRO', 80, 170, 640, 360, { fontFamily: H, fontSize: 180, color: W, lineHeight: 0.92, letterSpacing: 4 }),
        text('Viernes 27 de noviembre · de 00:00 a 23:59 · tiendas y web', 84, 560, 640, 40, { fontSize: 24, color: DIM }),
        withAnims(pic(tagSVG(PINK), 730, 270, 460, 240, 'Etiqueta de precio', { rotation: -12 }), A('zoom-in', { start: 'afterPrev', delay: 300, duration: 500, sound: 'whoosh' })),
        withAnims(text('−50 %', 830, 312, 340, 150, { fontFamily: H, fontSize: 140, color: BG, textAlign: 'center', vAlign: 'middle', rotation: -12 }), A('zoom-in', { start: 'withPrev', duration: 500 }))],
        notes: 'Portada en negro con dos brillos de color. La etiqueta (un dibujo SVG propio) entra sola con un silbido. Presenta la campaña y su fecha.' },
      { layout: 'titleOnly', title: 'El año pasado, en cuatro cifras', bg: BG, extra: [
        ...[['×3,2', 'ventas frente a un viernes normal', PINK], ['41 %', 'de los pedidos llegaron desde el móvil', CYAN], ['00:05', 'el minuto con más pedidos del año', YEL], ['18 %', 'de devoluciones en diciembre', W]].map(([n, l, c], i) => [
          withAnims(shape('rounded', 70 + i * 290, 210, 270, 330, PANEL, { radius: 16, stroke: c, strokeWidth: 2, shadow: { color: c + '88', blur: 18, x: 0, y: 0 } }), chain(i, 'fade-up', { duration: 400, sound: 'pop' })),
          withAnims(text(`<div style="font-family:${H};font-size:104px;line-height:1;color:${c};text-shadow:${neon(c)}">${n}</div><div style="margin-top:18px">${l}</div>`, 90 + i * 290, 230, 230, 290,
            { fontSize: 25, color: W, textAlign: 'center', vAlign: 'middle' }), A('fade-in', { start: 'withPrev', duration: 400 }))]).flat()],
        notes: 'Las cuatro tarjetas entran en cadena con un «pop» cada una. Las cifras son de ejemplo: pon las de vuestra campaña anterior.' },
      { layout: 'titleOnly', title: 'Cuándo compra la gente', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 70, y: 160, w: 1140, h: 470, chartType: 'line', color: PINK, seriesName: 'Web', grid: true, yTitle: 'Pedidos por hora (miles)', xTitle: 'Hora del día', labelColor: DIM,
          data: Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: [9.8, 6.1, 3.2, 1.4, 0.8, 0.6, 0.9, 1.6, 2.4, 3.1, 3.6, 3.9, 4.2, 4.0, 3.7, 3.5, 3.6, 3.9, 4.4, 5.1, 5.8, 6.6, 7.2, 6.3][h] })),
          series: [{ name: 'Tiendas', color: CYAN, values: [null, null, null, null, null, null, null, null, null, null, 2.2, 3.4, 4.1, 3.8, 2.9, 2.6, 3.1, 4.3, 5.2, 5.6, 4.7, 2.1, null, null] }] }),
        text('Las tiendas abren de 10:00 a 22:00 (sin datos fuera de ese horario).', 70, 640, 1140, 36, { fontSize: 20, color: DIM })],
        notes: 'Dos series en líneas: la web se dispara a medianoche y las tiendas tienen dos picos, a mediodía y por la tarde. Los huecos de la serie de tiendas son valores vacíos. Datos inventados.' },
      { layout: 'titleOnly', title: 'Cuatro días, un plan', bg: BG, extra: [
        dg('chevrons', 'Teaser\n  Lunes 23: cuenta atrás en redes\nSocios\n  Jueves 26: acceso anticipado\nViernes Negro\n  Viernes 27: ofertas de 24 horas\nCiberlunes\n  Lunes 30: solo en la web', 70, 190, 1140, 300, { oneByOne: true, colors: 'colorful', fontScale: 1.3 }),
        shape('rounded', 70, 530, 1140, 110, PANEL, { radius: 14 }), icon('megaphone', 105, 555, 60, YEL),
        text(`<b style="color:${YEL}">Un mensaje por día y por canal.</b> Nada de bombardear: el que se da de baja ya no vuelve en todo el año.`, 190, 540, 990, 90, { fontSize: 24, color: W, vAlign: 'middle' })],
        notes: 'Galones que aparecen uno a uno al presentar. Recuerda la regla de comunicación: una sola notificación al día por canal.' },
      { layout: 'titleOnly', title: 'Tres ofertas estrella', bg: BG, transition: 'convex', extra: [
        ...[['headphones', 'Auriculares inalámbricos', '129 €', '64 €', PINK], ['monitor', 'Televisor de 55 pulgadas', '799 €', '449 €', CYAN], ['bot', 'Robot aspirador', '349 €', '179 €', YEL]].map(([ic, n, old, now, c], i) => {
          const x = 70 + i * 390;
          return [shape('rounded', x, 180, 360, 470, PANEL, { radius: 18, stroke: c + '88', strokeWidth: 2 }),
            icon(ic, x + 30, 210, 64, c),
            text(n, x + 30, 290, 300, 80, { fontSize: 28, color: W, fontWeight: 700 }),
            withAnims(text(old, x + 30, 390, 300, 60, { fontSize: 44, color: DIM }), A('strike', { start: 'click', duration: 500 })),
            withAnims(text(`<span style="text-shadow:${neon(c)}">${now}</span>`, x + 30, 450, 300, 130, { fontFamily: H, fontSize: 120, color: c, lineHeight: 1 }), A('zoom-in', { start: 'afterPrev', duration: 450, sound: 'chime' }))]; }).flat()],
        notes: 'Cada clic tacha el precio de antes (efecto «Tachar») y hace aparecer el nuevo con una campanilla. Productos y precios de ejemplo.' },
      { layout: 'titleOnly', title: 'Dónde se nos escapan', bg: BG, extra: [
        chartBlock({ x: 70, y: 160, w: 720, h: 480, chartType: 'funnel', color: PINK, dataLabels: true,
          data: [{ label: 'Visitas', value: 1000000 }, { label: 'Ven un producto', value: 620000 }, { label: 'Añaden a la cesta', value: 140000 },
            { label: 'Empiezan a pagar', value: 61000 }, { label: 'Compran', value: 38000 }] }),
        withAnims(text(`<div style="font-family:${H};font-size:110px;line-height:1;color:${PINK};text-shadow:${neon(PINK)}">3,8 %</div><div style="margin-top:8px">de conversión el año pasado</div>`, 840, 190, 370, 220, { fontSize: 26, color: W }), A('fade-left', { start: 'click' })),
        withAnims(text(`<div style="font-family:${H};font-size:72px;line-height:1;color:${CYAN}">4,5 %</div><div style="margin-top:8px">objetivo: pago en un paso y cesta guardada</div>`, 840, 440, 370, 200, { fontSize: 24, color: W }), A('fade-left', { start: 'afterPrev' }))],
        notes: 'Embudo de la web en el día de la campaña. La mayor fuga está entre ver un producto y añadirlo a la cesta. Datos de ejemplo.' },
      { layout: 'titleOnly', title: '¿Llega el stock?', bg: BG, extra: [
        tableBlock({ x: 70, y: 170, w: 1140, h: 380, fontSize: 26, header: true, headBg: PINK, headFg: W, stroke: '#2a2a36', banded: true, band: '#3a3a4a', color: W, colW: [3, 1.4, 1.8, 1.8],
          rows: [['Producto', 'Unidades', 'Venta prevista al día', 'Días de cobertura'], ['Auriculares inalámbricos', '4.800', '1.600', '=B2/C2'], ['Televisor de 55 pulgadas', '900', '450', '=B3/C3'],
            ['Robot aspirador', '1.200', '300', '=B4/C4'], ['Consola portátil', '2.000', '1.000', '=B5/C5'], ['<b>Total</b>', '=SUMA(B2:B5)', '=SUMA(C2:C5)', '']] }),
        text(`<b style="color:${YEL}">Por debajo de 3 días:</b> reposición desde el almacén central la noche del jueves.`, 70, 580, 1140, 50, { fontSize: 24, color: W })],
        notes: 'La cobertura es una fórmula (=B2/C2): unidades entre venta diaria prevista. Los totales son sumas de rangos. Cifras inventadas.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', fontSize: 34, question: '¿A qué hora entraron más pedidos el año pasado?', options: ['00:05', '10:30', '18:00', '22:45'], correct: [0], time: 20, x: 60, y: 50, w: 1160, h: 610 })],
        notes: 'Concurso en directo, con tiempo y puntos: gana quien acierta antes. La respuesta es medianoche y cinco: refuerza que la web debe aguantar ese pico.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(340, 60, 640, '#3a0b25', BG, 70),
        text('FALTAN', 80, 90, 1120, 110, { fontFamily: H, fontSize: 100, color: W, textAlign: 'center', letterSpacing: 20 }),
        timer(60, 340, 220, 600, { style: 'digital', h: 240, color: PINK, auto: false, endText: '¡YA!' }),
        text('para abrir la web · haz clic para empezar la cuenta atrás', 80, 500, 1120, 40, { fontSize: 24, color: DIM, textAlign: 'center' }),
        text(`<span style="text-shadow:${neon(CYAN)}">Que no se agote nada… salvo las ofertas.</span>`, 80, 580, 1120, 60, { fontSize: 34, color: W, textAlign: 'center' })],
        notes: 'Cierre con cuenta atrás digital de un minuto: haz clic para que empiece. Termina con un «¡YA!». Aprovecha para repasar a quién avisar si algo falla.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Stock control for a hardware chain: a pallet rack, shipping labels, Pareto, the reorder point and the alert in code.
  biz_retail_inventory: { name: 'Inventario: ni roturas ni excesos', summary: 'Almacén dibujado con estanterías y etiquetas, comparativa, Pareto en combinado, ecuación, tabla con fórmulas, código, lámpara 3D y ordenar', cat: 'biz', make: () => {
    const { CONC, KRAFT, BLUE, ORANGE, INK, YEL, RED, GREEN } = WH, H = head('tech'), GREY = '#5d636b';
    const label = (html, x, y, w, h, props = {}) => card(html, x, y, w, h, '#ffffff', { radius: 4, borderColor: '#c9c3b6', fontSize: 22, color: INK, pad: [16, 20, 16, 20], shadow: { color: '#0000002e', blur: 12, x: 0, y: 4 }, ...props });
    return numbered(build({ name: 'La Tuerca · plan de inventario', palette: 'office', fonts: 'tech', title: { color: INK, size: 46 }, body: { color: INK },
      decor: () => [pic(hazard, 0, 704, 1280, 16, '')] }, [
      { layout: 'blank', bg: CONC, transition: 'fade', extra: [
        withAnims(pic(rackSVG, 640, 40, 600, 600, 'Estantería de palés con cajas de cartón'), A('fade-in', { start: 'afterPrev', duration: 700 })),
        label(`<div style="font-family:${MONO};font-size:16px;color:${GREY}">ALMACÉN CENTRAL · LOTE 2026-11 · 42 TIENDAS</div>`
          + `<div style="font-family:${H};font-size:66px;font-weight:700;line-height:1.05;margin:18px 0 14px">Ni roturas<br>ni excesos</div><div style="font-size:24px">Plan de inventario de La Tuerca, ferreterías de barrio</div>`,
          70, 130, 540, 430),
        pic(barcode(400, 70, 7), 96, 440, 380, 56, 'Código de barras'),
        text('8 412345 600127', 96, 500, 380, 30, { fontFamily: MONO, fontSize: 16, color: INK, letterSpacing: 4 }),
        withAnims(shape('rect', 470, 104, 170, 52, ORANGE, { radius: 6, rotation: 8 }), A('zoom-in', { start: 'afterPrev', duration: 300, sound: 'click' })),
        withAnims(text('URGENTE', 470, 104, 170, 52, { fontSize: 22, color: '#ffffff', fontWeight: 700, textAlign: 'center', vAlign: 'middle', letterSpacing: 3, rotation: 8 }), A('zoom-in', { start: 'withPrev', duration: 300 }))],
        notes: 'Portada con concepto de almacén: estantería de palés dibujada en SVG y el título en una etiqueta de envío con código de barras. Presenta el problema en una frase: hay cosas que faltan y cosas que sobran a la vez.' },
      { layout: 'blank', bg: '#ffffff', transition: 'push', extra: [
        shape('rect', 0, 0, 640, 720, '#fbe9e5'), shape('rect', 640, 0, 640, 720, '#e6ebf2'),
        kicker('EL MISMO SÁBADO, EN LA MISMA TIENDA', 70, 60, 1140, INK, 20, { textAlign: 'center' }),
        icon('ban', 280, 150, 80, RED), icon('hourglass', 920, 150, 80, BLUE),
        withAnims(text(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${RED};letter-spacing:4px">FALTA</div><div style="font-family:${H};font-size:130px;font-weight:700;line-height:1.1;color:${RED}">7,8 %</div><div>de las referencias, sin nada en el lineal: el cliente se va a otra tienda.</div>`,
          80, 260, 480, 300, { fontSize: 26, color: INK, textAlign: 'center' }), chain(0, 'fade-right')),
        withAnims(text(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${BLUE};letter-spacing:4px">SOBRA</div><div style="font-family:${H};font-size:130px;font-weight:700;line-height:1.1;color:${BLUE}">94 días</div><div>dura en el almacén lo que menos se vende: dinero parado en cajas.</div>`,
          720, 260, 480, 300, { fontSize: 26, color: INK, textAlign: 'center' }), chain(1, 'fade-left')),
        withAnims(card('<b>Cuesta</b> la venta… y a veces el cliente', 80, 590, 480, 70, '#ffffff', { fontSize: 21, color: RED, textAlign: 'center', vAlign: 'middle', radius: 32, borderColor: RED + '55' }), A('fade-in', { start: 'afterPrev' })),
        withAnims(card('<b>Cuesta</b> 410.000 € parados en 42 tiendas', 720, 590, 480, 70, '#ffffff', { fontSize: 21, color: BLUE, textAlign: 'center', vAlign: 'middle', radius: 32, borderColor: BLUE + '55' }), A('fade-in', { start: 'afterPrev' }))],
        notes: 'Comparativa a dos colores: rotura de stock frente a stock dormido. Las dos cifras entran seguidas con un clic y, después, lo que cuesta cada problema. Datos de ejemplo de una auditoría ficticia.' },
      { layout: 'titleOnly', title: 'Pocas referencias, casi todas las ventas', bg: CONC, extra: [
        chartBlock({ x: 60, y: 160, w: 760, h: 490, chartType: 'bar', combo: true, color: ORANGE, seriesName: '% de las ventas', grid: true, yMax: 100, yTitle: '%', xTitle: 'Referencias, de más a menos vendidas (% del total)',
          data: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'].map((l, i) => ({ label: l, value: [52, 21, 9, 6, 4, 3, 2, 1.5, 1, 0.5][i] })),
          series: [{ name: 'Acumulado', color: BLUE, values: [52, 73, 82, 88, 92, 95, 97, 98.5, 99.5, 100] }] }),
        ...[['A', '20 % de las referencias', '73 % de las ventas', 'Recuento semanal', RED], ['B', '30 % de las referencias', '19 % de las ventas', 'Recuento mensual', '#b85c00'], ['C', '50 % de las referencias', '8 % de las ventas', 'Recuento trimestral', GREY]].map(([k, a, b, d, c], i) =>
          withAnims(label(`<div style="display:flex;gap:18px;align-items:center"><div style="font-family:${H};font-size:64px;font-weight:700;color:${c};line-height:1">${k}</div><div><b>${a}</b><br>${b}<br><span style="color:${c};font-weight:700">${d}</span></div></div>`, 850, 170 + i * 162, 370, 150, { fontSize: 20 }), chain(i, 'fade-left')))],
        notes: 'Gráfico combinado: barras con el peso de cada tramo de referencias y la línea del acumulado (diagrama de Pareto). Con eso salen las clases A, B y C. Porcentajes inventados.' },
      { layout: 'titleOnly', title: '¿Cuándo hay que pedir?', bg: '#ffffff', extra: [
        mathBlock({ x: 70, y: 160, w: 1140, h: 110, fontSize: 60, latex: '\\text{PP} = d \\cdot L + \\text{SS}', color: INK }),
        mathBlock({ x: 70, y: 280, w: 1140, h: 100, fontSize: 46, latex: '\\text{SS} = z \\cdot \\sigma_d \\cdot \\sqrt{L}', color: BLUE }),
        ...[['d', 'demanda media al día', '#b85c00'], ['L', 'días que tarda el proveedor', '#b85c00'], ['σ<sub>d</sub>', 'cuánto varía la demanda', BLUE], ['z', '1,65 para servir el 95 % de las veces', BLUE]].map(([v, d, c], i) =>
          withAnims(label(`<div style="font-family:${H};font-size:44px;font-weight:700;color:${c};line-height:1.1">${v}</div><div>${d}</div>`, 70 + i * 290, 430, 270, 160, { fontSize: 21, borderColor: c }), chain(i, 'fade-up')))],
        notes: 'Punto de pedido (PP): cuando el stock baja de ahí, se pide. El stock de seguridad (SS) cubre los días raros. Las cuatro variables entran una detrás de otra.' },
      { layout: 'titleOnly', title: 'La lista de hoy', bg: CONC, extra: [
        tableBlock({ x: 60, y: 160, w: 1160, h: 400, fontSize: 22, header: true, headBg: INK, headFg: YEL, stroke: '#c9c3b6', color: INK, colW: [3, 1.5, 1.3, 1.4, 1.6, 1.3],
          rows: [['Referencia', 'Venta diaria', 'Plazo (días)', 'Seguridad', 'Punto de pedido', 'Stock hoy'], ['Tornillo 4×40 (caja de 200)', '18', '5', '30', '=B2*C2+D2', '95'],
            ['Cinta americana 50 m', '9', '7', '20', '=B3*C3+D3', '140'], ['Brocas de 6 mm', '6', '10', '15', '=B4*C4+D4', '60'], ['Silicona blanca', '12', '4', '18', '=B5*C5+D5', '210'], ['Bombilla LED E27', '25', '6', '40', '=B6*C6+D6', '230']],
          cellBg: { '1,5': '#f6c9c0', '3,5': '#f6c9c0', '4,5': '#fbe7a6' } }),
        shape('rect', 60, 590, 26, 26, '#f6c9c0'), text('por debajo del punto de pedido: pedir hoy', 96, 584, 520, 40, { fontSize: 22, color: INK }),
        shape('rect', 640, 590, 26, 26, '#fbe7a6'), text('más del triple: revisar el exceso', 676, 584, 520, 40, { fontSize: 22, color: INK })],
        notes: 'El punto de pedido de cada fila es una fórmula (=B2*C2+D2): demanda por plazo más seguridad. Las celdas de stock están coloreadas a mano. Datos de ejemplo.' },
      { layout: 'titleOnly', title: 'La alerta, en nueve líneas', bg: '#ffffff', extra: [
        codeBlock({ x: 60, y: 160, w: 710, h: 400, fontSize: 20, lang: 'python', lineSteps: '1-2|3-4|5-6|8-9',
          code: 'def revisar(ref):\n    pp = ref.demanda * ref.plazo + ref.seguridad\n    if ref.stock <= pp:\n        pedir(ref, cantidad=ref.lote_optimo)\n    elif ref.stock > 3 * pp:\n        avisar("exceso", ref)\n\nfor ref in tienda.referencias:\n    revisar(ref)' }),
        ...[['1', 'Calcula el punto de pedido'], ['2', 'Si no llega, pide el lote'], ['3', 'Si sobra mucho, avisa'], ['4', 'Cada noche, en cada tienda']].map(([n, t], i) =>
          withAnims(text(`<span style="display:inline-block;width:40px;height:40px;border-radius:20px;background:#b85c00;color:#fff;text-align:center;line-height:40px;font-weight:700;margin-right:14px">${n}</span>${t}`,
            800, 180 + i * 95, 420, 60, { fontSize: 24, color: INK, vAlign: 'middle' }), A('fade-left', { start: 'click' }))),
        text('Se ejecuta a las 3:00, cuando las tiendas están cerradas.', 60, 590, 1160, 40, { fontSize: 22, color: GREY, fontStyle: 'italic' })],
        notes: 'Código con pasos de resaltado: cada clic ilumina un bloque de líneas y hace aparecer su explicación a la derecha. Es pseudocódigo de ejemplo en Python.' },
      { layout: 'titleOnly', title: 'Contar un poco cada día', bg: CONC, extra: [
        dg('cycle', 'Contar\nComparar\nBuscar la causa\nCorregir', 60, 160, 560, 480, { colors: 'colorful', oneByOne: true, fontScale: 1.15 }),
        m3d('kh-AnisotropyBarnLamp', 700, 165, 500, 335, { autoRotate: true, spin: 14, view: 'three', edge: 'fade' }),
        text('<b>Recuento cíclico:</b> 40 referencias al día por tienda, en 20 minutos y sin cerrar. En un trimestre se ha contado todo.', 700, 510, 500, 120, { fontSize: 23, color: INK }),
        credits(['kh-AnisotropyBarnLamp'], 700, 640, 500, GREY)],
        notes: 'El ciclo aparece paso a paso. La lámpara 3D (una referencia cualquiera del lineal) gira despacio. Explica que el recuento cíclico sustituye al gran inventario anual con la tienda cerrada.' },
      { layout: 'titleOnly', title: 'Piloto en cuatro tiendas', bg: '#ffffff', transition: 'slide', extra: [
        chartBlock({ x: 60, y: 160, w: 720, h: 480, chartType: 'bar', color: '#b9b2a6', seriesName: 'Antes', grid: true, dataLabels: true, yTitle: '% de referencias en rotura',
          data: ['Centro', 'Puerto', 'Alameda', 'Las Eras'].map((l, i) => ({ label: l, value: [8.4, 7.1, 9.0, 6.8][i] })), series: [{ name: 'Después', color: ORANGE, values: [3.1, 2.9, 4.2, 2.5] }] }),
        withAnims(stat('−38 %', 'de stock inmovilizado en el almacén', 830, 190, 390, BLUE, INK, 80), chain(0, 'fade-left')),
        withAnims(stat('+2,1 pt', 'de ventas en las referencias A', 830, 410, 390, GREEN, INK, 80), chain(1, 'fade-left'))],
        notes: 'Barras agrupadas antes y después del piloto de tres meses, con sus etiquetas de datos. Resultados de ejemplo.' },
      { layout: 'blank', bg: CONC, extra: [
        pollBlock({ kind: 'order', fontSize: 28, question: 'Ordena los pasos del recuento cíclico', x: 60, y: 50, w: 1160, h: 620,
          options: ['Elegir las referencias del día', 'Contar sin mirar el sistema', 'Comparar con el stock teórico', 'Buscar la causa de la diferencia', 'Corregir y anotar el ajuste'] })],
        notes: 'Actividad de ordenar: cada persona ordena los pasos en su móvil y se corrige sola. Contar sin mirar el sistema evita «ver» la cifra que esperamos.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · A customer's journey through a sports shop: a persona, an emotion curve that draws itself, NPS and Transform to "after".
  biz_retail_cx: { name: 'Experiencia de cliente: el viaje de Marta', summary: 'Persona dibujada, curva de emociones que se traza sola con caras en cadena, citas, NPS con ecuación, matriz, Transformar y valoración', cat: 'biz', make: () => {
    const { BG, BG2, FG, DIM, CORAL, MINT, YEL, LIL, PINK } = CX, H = head('friendly');
    const BEFORE = [1, 0.4, -1.3, 1.1, -1.7, -0.6], AFTER = [1.1, 0.8, 0.7, 1.5, 0.9, 1.2];
    const FACE = STAGES.map(() => [uid(), uid()]), OLD = uid();
    const tone = v => (v >= 0.6 ? MINT : v > -0.5 ? YEL : CORAL);
    const faces = (vals, anim) => vals.flatMap((v, i) => { const x = jx(i), y = jy(v);
      const dot = { ...shape('ellipse', x - 30, y - 30, 60, 60, tone(v), { stroke: BG, strokeWidth: 4 }), id: FACE[i][0] };
      const ic = { ...icon(v > -0.5 ? 'smile' : 'frown', x - 20, y - 20, 40, BG), id: FACE[i][1] };
      return anim ? [withAnims(dot, A('zoom-in', { start: 'afterPrev', duration: 260, sound: 'pop' })), withAnims(ic, A('fade-in', { start: 'withPrev', duration: 260 }))] : [dot, ic]; });
    const stageHead = () => STAGES.flatMap(([ic, l], i) => [icon(ic, jx(i) - 22, 165, 44, LIL), text(l, jx(i) - 88, 215, 176, 34, { fontSize: 19, color: FG, textAlign: 'center', fontWeight: 700 })]);
    const grid = () => [...[1, 2, 3, 4, 5].map(i => shape('rect', JX + i * JW / 6, 260, 1, 360, '#ffffff', { opacity: 12 })),
      shape('rect', JX, JY + JH / 2, JW, 2, '#ffffff', { opacity: 25 })];
    return numbered(build({ name: 'Zancada · el viaje de Marta', palette: 'violet', fonts: 'friendly', title: { color: YEL, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(700, -200, 760, '#3d2470', BG, 70),
        kicker('EXPERIENCIA DE CLIENTE · TIENDAS ZANCADA', 80, 70, 760, MINT, 18),
        text('El viaje de Marta', 76, 104, 760, 100, { fontFamily: H, fontSize: 76, fontWeight: 700, color: FG }),
        withAnims(shape('speechround', 80, 250, 700, 300, BG2, { stroke: PINK, strokeWidth: 3 }), A('zoom-in', { start: 'afterPrev', delay: 300, duration: 500 })),
        withAnims(text('«Entré a por unas zapatillas y salí con ganas de no volver.»', 120, 280, 620, 200, { fontSize: 42, color: FG, fontStyle: 'italic', vAlign: 'middle', lineHeight: 1.25 }), A('fade-in', { start: 'withPrev', duration: 500 })),
        text('Marta, 34 años, corre tres días por semana', 80, 600, 700, 40, { fontSize: 24, color: DIM }),
        pic(martaSVG, 850, 170, 360, 420, 'Ilustración de Marta, una corredora con cinta en el pelo')],
        notes: 'Portada con la frase real de una entrevista (inventada para la plantilla). El bocadillo es una forma de la galería y entra solo. Marta es un dibujo SVG propio: una «persona» que representa a muchas clientas.' },
      { layout: 'blank', bg: BG, extra: [
        pic(martaSVG, 70, 130, 300, 350, 'Marta'),
        text('Marta', 70, 490, 300, 56, { fontFamily: H, fontSize: 44, fontWeight: 700, color: FG, textAlign: 'center' }),
        text('Administrativa · corre 25 km a la semana · compra 2 pares al año', 70, 550, 300, 100, { fontSize: 20, color: DIM, textAlign: 'center' }),
        ...[['target', 'Qué busca', MINT, ['Zapatillas para su primera media maratón', 'Que alguien mire cómo pisa', 'No perder la mañana del sábado']],
          ['triangle-alert', 'Qué le frustra', CORAL, ['Tallas que no están en la sala', 'Esperar sin saber cuánto', 'Correos que no tienen que ver con ella']],
          ['smartphone', 'Cómo compra', YEL, ['Mira precios en el móvil', 'Prueba en tienda', 'Vuelve si la tratan bien']]].map(([ic, h, c, items], i) => {
          const x = 420 + i * 270;
          return [withAnims(shape('rounded', x, 140, 250, 460, BG2, { radius: 18 }), chain(i, 'fade-up', { duration: 450 })),
            withAnims(icon(ic, x + 24, 166, 44, c), A('fade-in', { start: 'withPrev' })),
            withAnims(text(h, x + 24, 220, 210, 44, { fontFamily: H, fontSize: 26, fontWeight: 700, color: c }), A('fade-in', { start: 'withPrev' })),
            withAnims(text(ul(...items), x + 14, 274, 222, 310, { fontSize: 22, color: FG, lineHeight: 1.35 }), A('fade-in', { start: 'withPrev' }))]; }).flat()],
        notes: 'La ficha de la persona: qué busca, qué le frustra y cómo compra. Las tres columnas entran seguidas con un clic. Construida a partir de 24 entrevistas (de ejemplo).' },
      { layout: 'titleOnly', title: 'Su visita, paso a paso', bg: BG, transition: 'slide', extra: [
        ...stageHead(), ...grid(),
        { ...withAnims(stroke(curveOf(BEFORE), JX, JY, JW, JH, PINK, 5), A('draw', { start: 'click', duration: 1800 })), id: OLD },
        ...faces(BEFORE, true),
        text('Línea: cómo se siente Marta en cada momento (arriba, bien; abajo, mal).', JX, 640, JW, 34, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Con un clic se dibuja la curva de emociones (efecto «Dibujar») y luego aparecen las caras, una tras otra, con un «pop». Los dos hundimientos son la talla que no está en la sala y la cola para pagar.' },
      { layout: 'titleOnly', title: 'Lo que nos dijeron', bg: BG, extra: [
        ...[['«Pedí mi talla y el dependiente tardó diez minutos en volver del almacén.»', 'Busca su talla', CORAL], ['«Probarlas en la cinta fue lo mejor: me grabaron la pisada y me la explicaron.»', 'Prueba en la cinta', MINT],
          ['«Un sábado por la mañana y una sola caja abierta. Casi las dejo en el mostrador.»', 'Paga en caja', CORAL]].map(([q, st, c], i) => {
          const x = 70 + i * 385;
          return [withAnims(shape('speech', x, 190, 360, 300, BG2, { stroke: c, strokeWidth: 3 }), chain(i, 'zoom-in', { duration: 400 })),
            withAnims(text(q, x + 26, 214, 308, 200, { fontSize: 25, color: FG, fontStyle: 'italic', vAlign: 'middle', lineHeight: 1.3 }), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<b style="color:${c}">${st}</b>`, x, 530, 360, 36, { fontSize: 22, textAlign: 'center' }), A('fade-in', { start: 'withPrev' }))]; }).flat(),
        text('Los momentos de la verdad: dos para arreglar y uno para presumir.', 70, 600, 1140, 44, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Citas literales de las entrevistas (ejemplo) en bocadillos. Lee cada una en voz alta antes de pasar a la siguiente.' },
      { layout: 'titleOnly', title: '¿Nos recomendarían?', bg: BG, extra: [
        chartBlock({ x: 40, y: 170, w: 600, h: 400, chartType: 'doughnut', labelColor: DIM, data: [{ label: 'Promotores', value: 38, color: MINT }, { label: 'Pasivos', value: 36, color: YEL }, { label: 'Detractores', value: 26, color: CORAL }] }),
        text('Nota del 0 al 10 · promotores: 9 y 10 · pasivos: 7 y 8 · detractores: de 0 a 6', 60, 590, 560, 60, { fontSize: 19, color: DIM, textAlign: 'center' }),
        mathBlock({ x: 660, y: 180, w: 560, h: 110, fontSize: 44, latex: '\\text{NPS} = \\%P - \\%D', color: FG }),
        withAnims(mathBlock({ x: 660, y: 300, w: 560, h: 100, fontSize: 44, latex: '= 38 - 26 = +12', color: YEL }), A('fade-in', { start: 'click' })),
        withAnims(card(`<b style="color:${CORAL}">La media del sector está en +31.</b> Cada punto de NPS vale, en nuestras tiendas, unos 40.000 € al año en compras repetidas.`, 660, 440, 560, 170, BG2, { fontSize: 23, color: FG }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Dona con los tres grupos del Net Promoter Score y la ecuación: porcentaje de promotores menos el de detractores. Datos de ejemplo de la encuesta de octubre.' },
      { layout: 'titleOnly', title: 'Qué arreglamos primero', bg: BG, extra: [
        text('IMPACTO →', 30, 400, 220, 30, { fontSize: 18, color: DIM, letterSpacing: 4, rotation: -90, textAlign: 'center' }),
        dg('matrix', 'Tallas en el móvil y cobro portátil\nNuevo almacén junto a la sala\nCarteles de tallas por colores\nPantallas táctiles en la sala', 160, 170, 600, 440, { colors: 'colorful', fontScale: 1.05 }),
        text('ESFUERZO →', 160, 618, 600, 30, { fontSize: 18, color: DIM, letterSpacing: 4, textAlign: 'center' }),
        ...[['1', 'Ganancias rápidas', 'Tallas en el móvil y cobro portátil: en dos meses.', LIL], ['2', 'Grandes apuestas', 'El almacén nuevo, con la reforma de 2027.', PINK], ['3', 'Si sobra tiempo', 'Carteles de colores: bonitos, pero no quitan esperas.', YEL], ['4', 'Descartado', 'Pantallas táctiles: caras y casi nadie las usa.', MINT]].map(([n, h, d, c], i) =>
          withAnims(text(`<div style="font-family:${H};font-size:24px;font-weight:700;color:${c}">${n} · ${h}</div><div>${d}</div>`, 800, 170 + i * 115, 420, 105, { fontSize: 21, color: FG }), chain(i, 'fade-left')))],
        notes: 'Matriz de esfuerzo frente a impacto: arriba a la izquierda, lo que más rinde con menos trabajo; abajo a la derecha, lo que no compensa. Las cuatro decisiones entran en cadena.' },
      { layout: 'titleOnly', title: 'Tras el piloto de tres meses', bg: BG, autoAnimate: true, extra: [
        ...stageHead(), ...grid(),
        { ...stroke(curveOf(BEFORE), JX, JY, JW, JH, PINK, 3, { opacity: 30, dash: 'dash' }), id: OLD },
        withAnims(stroke(curveOf(AFTER), JX, JY, JW, JH, MINT, 5), A('draw', { start: 'afterPrev', delay: 900, duration: 1500 })),
        ...faces(AFTER, false),
        text(`<span style="color:${PINK}">- - antes</span> · <span style="color:${MINT}">— después</span> · NPS de la tienda piloto: de +12 a <b style="color:${MINT}">+34</b>`, JX, 640, JW, 34, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Transformar: las caras suben a su nueva posición y la curva de antes se queda punteada; la nueva se dibuja sola. Resultados de ejemplo de la tienda piloto.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'rating', fontSize: 34, question: 'Del 1 al 5: ¿cómo fue tu última visita a una de nuestras tiendas?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Valoración en directo de 1 a 5 desde el móvil. Pregunta después a quien haya puesto un 1 o un 2 qué pasó.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-200, 260, 760, '#3d2470', BG, 70),
        text('Cada visita<br>es una historia.', 80, 130, 640, 240, { fontFamily: H, fontSize: 70, fontWeight: 700, color: FG, lineHeight: 1.1 }),
        text('Que la de Marta acabe bien.', 80, 390, 640, 50, { fontSize: 32, color: YEL }),
        ...[['Noviembre', 'Tallas en el móvil del vendedor'], ['Diciembre', 'Cobro portátil en las 12 tiendas'], ['Febrero', 'Nueva encuesta y nuevo mapa']].map(([m, t], i) =>
          withAnims(text(`<b style="color:${MINT}">${m}</b><br>${t}`, 800, 160 + i * 140, 410, 110, { fontSize: 24, color: FG, borderColor: '#ffffff22', pad: [14, 18, 14, 18], radius: 12 }), chain(i, 'fade-left')))],
        notes: 'Cierre: tres compromisos con fecha. Termina recordando la frase de la portada y cómo queremos que cambie.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · A supermarket's new layout: the floor plan made of shapes, the trolley's route, a heat map and the sections moving with Transform.
  biz_retail_supermarket: { name: 'Supermercado: nueva distribución', summary: 'Plano de planta hecho de formas, carro que recorre la tienda, mapa de calor, secciones que se recolocan con Transformar, lineal y tabla', cat: 'biz', make: () => {
    const { FLOOR, INK, GREY } = SM, H = head('clean'), RED = '#d64545', BLUE = '#3d7fc4', GREEN = '#3f9c4a';
    const side = (html, y, h, props = {}) => text(html, 70, y, 260, h, { fontSize: 21, color: INK, ...props });
    return numbered(build({ name: 'Supermercado Plaza · nueva distribución', palette: 'grayscale', fonts: 'clean', title: { color: INK, size: 42 }, body: { color: INK } }, [
      { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
        shape('rect', 0, 0, 330, 720, INK),
        text('SUPERMERCADO PLAZA', 50, 80, 260, 30, { fontSize: 15, color: '#ffffff', letterSpacing: 2, fontWeight: 700 }),
        text('La tienda, de otra manera', 46, 130, 260, 260, { fontFamily: H, fontSize: 50, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }),
        text('Nueva distribución del local de la calle Mayor · 1.200 m²', 50, 420, 250, 100, { fontSize: 20, color: '#c9ccd2' }),
        text('Comité de tienda · octubre', 50, 620, 250, 30, { fontSize: 16, color: '#8a9099' }),
        ...planBase(), ...planDepts(HOY, true)],
        notes: 'Portada con el plano de planta: cada sección es una forma con su nombre y entra sola, una tras otra. Como son objetos (no una imagen), en la diapositiva de la propuesta se mueven con Transformar.' },
      { layout: 'titleOnly', title: 'Así se mueve hoy el cliente', bg: '#ffffff', extra: [
        ...planBase(), ...planDepts(HOY, false),
        withAnims(icon('shopping-cart', PX + 750, PY + 450, 44, RED), path([[0, -100], [-20, -300], [-200, -330], [-480, -330], [-500, -160], [-400, -40]], { start: 'click', duration: 5000 })),
        side(`<div style="font-size:60px;font-weight:800;color:${RED};line-height:1">64 %</div>de los clientes no pasa del tercer pasillo.`, 170, 170),
        side(`<div style="font-size:60px;font-weight:800;color:${INK};line-height:1">11 min</div>dura de media la visita: entra, coge pan y leche y se va.`, 380, 200)],
        notes: 'Haz clic: el carro recorre la tienda por un recorrido dibujado (Animaciones ▸ Dibujar recorrido). Entra, va directo a lo básico del fondo y sale por las cajas sin ver el resto. Cifras de ejemplo.' },
      { layout: 'titleOnly', title: 'Dónde se para la gente', bg: '#ffffff', extra: [
        ...planBase(), ...planDepts(HOY, false),
        withAnims(glow(PX + 640, PY + 290, 230, '#ff3b30', '#ff3b3000', 75), chain(0, 'zoom-in', { duration: 500 })),
        withAnims(glow(PX + 310, PY + 290, 240, '#ff3b30', '#ff3b3000', 65), chain(1, 'zoom-in', { duration: 500 })),
        withAnims(glow(PX + 40, PY + 10, 200, '#ff9500', '#ff950000', 65), chain(1, 'zoom-in', { duration: 500 })),
        withAnims(glow(PX + 620, PY + 10, 200, '#2f80ed', '#2f80ed00', 60), chain(1, 'zoom-in', { duration: 500 })),
        withAnims(glow(PX + 0, PY + 150, 180, '#2f80ed', '#2f80ed00', 60), chain(1, 'zoom-in', { duration: 500 })),
        shape('rect', 70, 180, 260, 16, '#2f80ed', { fill2: '#ff3b30', gradAngle: 0 }), text('frío', 70, 200, 120, 28, { fontSize: 16, color: GREY }), text('caliente', 210, 200, 120, 28, { fontSize: 16, color: GREY, textAlign: 'right' }),
        side('<b>Calientes:</b> la entrada y las cajas, donde ponemos la droguería y las chucherías.', 260, 130),
        side('<b>Fríos:</b> congelados y lácteos. Los visita casi todo el mundo… pero deprisa y al final.', 420, 150)],
        notes: 'Mapa de calor hecho con brillos (elipses con degradado radial a transparente) sobre el plano. Datos de los sensores de techo, de ejemplo.' },
      { layout: 'titleOnly', title: 'Ventas por metro cuadrado', bg: '#ffffff', transition: 'slide', extra: [
        chartBlock({ x: 70, y: 160, w: 780, h: 470, chartType: 'hbar', color: INK, dataLabels: true, grid: true, xTitle: 'Euros al mes por m²',
          data: [['Fruta y verdura', 820], ['Panadería', 760], ['Carne y pescado', 690], ['Lácteos y huevos', 610], ['Bebidas', 430], ['Congelados', 380], ['Droguería', 210]].map(([label, value]) => ({ label, value })) }),
        withAnims(card('<b>Fruta y verdura</b> es lo que más vende por metro… y hoy está escondida en una esquina.', 890, 280, 320, 180, '#ffffff', { fontSize: 21, color: INK, borderColor: GREEN, pad: [14, 18, 14, 18] }), A('fade-up', { start: 'click' }))],
        notes: 'Barras horizontales ordenadas de más a menos ventas por metro. Los frescos son lo que más vende y hoy están lejos de la entrada. Cifras de ejemplo.' },
      { layout: 'titleOnly', title: 'La propuesta', bg: '#ffffff', autoAnimate: true, extra: [
        ...planBase(), ...planDepts(NUEVO, false),
        ...[['Fresco a la entrada', 'Color, olor y temporada: la tienda se presenta.'], ['Pan en la esquina del fondo', 'Quien viene a por pan recorre la tienda.'], ['Congelados al final', 'Lo último antes de pagar: llegan fríos a casa.']].map(([h, d], i) =>
          withAnims(side(`<div style="font-weight:800;font-size:23px">${h}</div>${d}`, 170 + i * 160, 140), chain(i, 'fade-right')))],
        notes: 'Transformar: las secciones se mueven de su sitio de hoy al nuevo al pasar a esta diapositiva (mismo objeto en las dos, otra posición y otro tamaño). Explica los tres principios con un clic.' },
      { layout: 'titleOnly', title: 'A la altura de los ojos', bg: FLOOR, extra: [
        pic(shelfSVG, 70, 160, 600, 480, 'Góndola de frente con cuatro baldas de productos'),
        ...[['Arriba', '15 %', 'marcas de reclamo y formatos grandes', 175], ['Los ojos', '41 %', 'lo que más margen deja', 285], ['Las manos', '30 %', 'básicos y marca propia', 395], ['Los pies', '14 %', 'packs pesados y baratos', 510]].map(([lv, pct, d, y], i) =>
          withAnims(text(`<span style="font-size:44px;font-weight:800;color:${i === 1 ? RED : INK}">${pct}</span>  <b>${lv}</b> · ${d}`, 710, y, 500, 90, { fontSize: 22, color: INK, vAlign: 'middle' }), chain(i, 'fade-left'))),
        text('Porcentaje de las ventas de cada balda (estudio de lineal de la cadena).', 710, 600, 500, 60, { fontSize: 18, color: GREY })],
        notes: 'La góndola es un dibujo SVG propio. Cada balda aparece con su peso en las ventas; la de los ojos se marca en rojo. Porcentajes de ejemplo.' },
      { layout: 'titleOnly', title: 'Lo que cuesta', bg: '#ffffff', extra: [
        tableBlock({ x: 70, y: 160, w: 1140, h: 400, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d9d5cc', banded: true, band: '#9aa0a6', color: INK, colW: [3.2, 1.3, 1.6, 1.6],
          rows: [['Partida', 'Unidades', 'Precio unitario', 'Importe'], ['Murales refrigerados nuevos', '6', '7.800 €', '=B2*C2'], ['Mover góndolas (noche)', '24', '350 €', '=B3*C3'],
            ['Iluminación de frescos', '18', '420 €', '=B4*C4'], ['Señalética nueva', '40', '95 €', '=B5*C5'], ['<b>Total</b>', '', '', '=SUMA(D2:D5)']] }),
        text('Se recupera en 14 meses si la visita media pasa de 11 a 14 minutos.', 70, 590, 1140, 44, { fontSize: 24, color: INK, fontWeight: 700 })],
        notes: 'Tabla con fórmulas: el importe es unidades por precio (=B2*C2) y el total, la suma de la columna. Presupuesto de ejemplo.' },
      { layout: 'titleOnly', title: 'Tres noches de obra', bg: FLOOR, extra: [
        dg('steps', 'Noche 1\n  Murales y frescos\nNoche 2\n  Góndolas y pasillos\nNoche 3\n  Señalética y limpieza\nLunes\n  Abrimos como siempre', 70, 170, 1140, 420, { oneByOne: true, colors: 'colorful', fontScale: 1.2 }),
        text('La tienda no cierra: se trabaja de 22:00 a 7:00.', 70, 610, 1140, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Escalera de pasos que aparece uno a uno. Insiste en que la tienda no cierra ningún día.' },
      { layout: 'blank', bg: '#ffffff', extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué echas en falta en tu súper? (elige todas las que quieras)', options: ['Más productos locales', 'Cajas de autopago', 'Comida preparada', 'Pasillos más anchos', 'Horario más amplio'], display: 'bar', x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación de elección múltiple con el equipo de tienda o con clientes. Usa el resultado para el siguiente piloto.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · A boutique's autumn window: espresso black and ivory, sunglasses in 3D with Transform, paint chips, the triangle drawn over a lit window.
  biz_retail_window: { name: 'Escaparatismo: el escaparate de otoño', summary: 'Editorial en negro y marfil: gafas 3D con Transformar, texto en círculo, muestras de color, escaparate dibujado con triángulo y puntos focales', cat: 'biz', make: () => {
    const { BG, IVORY, RUST, SAND, OLIVE, INK, DIM } = AL, H = head('classic'), SG = uid();
    const glasses = (x, y, w, h, props) => ({ ...m3d('kh-SunglassesKhronos', x, y, w, h, props), id: SG });
    const WX = 70, WY = 160, K = 0.8;                       // the window on the slide (900 × 520 at 80 %)
    const wpt = ([x, y]) => [WX + x * K, WY + y * K];
    const tri = HEADS.map(([x, y]) => [x / 900 * 100, y / 520 * 100]);
    return numbered(build({ name: 'Albar · escaparate de otoño', palette: 'warm', fonts: 'classic', title: { color: IVORY, size: 50, fontStyle: 'italic' }, body: { color: IVORY } }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        shape('rect', 640, 0, 1, 720, IVORY, { opacity: 25 }),
        kicker('ALBAR · GUÍA DE ESCAPARATE', 80, 110, 540, SAND, 16, { letterSpacing: 6 }),
        text('Otoño<br>lento', 74, 170, 560, 320, { fontFamily: H, fontSize: 140, fontStyle: 'italic', color: IVORY, lineHeight: 1 }),
        text('Cómo vestir el escaparate de la tienda de octubre a diciembre', 80, 510, 500, 80, { fontSize: 24, color: DIM }),
        text('· OTOÑO LENTO · TEMPORADA 26 · BOUTIQUE ALBAR ', 720, 130, 460, 460, { fontFamily: H, fontSize: 22, curve: 100, color: SAND, letterSpacing: 4 }),
        glasses(770, 230, 360, 260, { autoRotate: false, view: 'front', motion: 'float', edge: 'fade' })],
        notes: 'Portada editorial: título en cursiva, una línea fina que parte la diapositiva y un texto en círculo alrededor de las gafas 3D, que flotan. Presenta la guía como una herramienta para todo el equipo de tienda.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        glasses(60, 140, 640, 440, { autoRotate: false, view: 'three', arrive: 'turn', edge: 'fade' }),
        text('El accesorio héroe', 740, 110, 480, 80, { fontFamily: H, fontSize: 48, fontStyle: 'italic', color: IVORY }),
        ...[['Uno solo', 'Un objeto protagonista por escaparate; lo demás lo acompaña.'], ['A la altura de los ojos', 'Entre 1,20 y 1,60 metros del suelo.'], ['Con luz propia', 'Un foco cálido solo para él.']].map(([h, d], i) =>
          withAnims(text(`<div style="font-family:${H};font-size:28px;color:${RUST};font-style:italic">${h}</div><div>${d}</div>`, 740, 230 + i * 130, 480, 110, { fontSize: 22, color: IVORY }), chain(i, 'fade-left')))],
        notes: 'Transformar: las gafas viajan desde la portada, crecen y giran hasta la vista de tres cuartos (Modelo 3D ▸ Desde la anterior ▸ Llega). Las tres reglas entran en cadena.' },
      { layout: 'titleOnly', title: 'La paleta de la temporada', bg: BG, transition: 'fade', extra: [
        ...[['Óxido', '#c0603a'], ['Arena', '#d8c3a5'], ['Oliva', '#7b7a4a'], ['Tinta', '#2b2a33'], ['Hueso', '#efe6d8']].map(([n, c], i) => {
          const x = 80 + i * 228;
          return [withAnims(shape('rect', x, 180, 200, 300, c, { stroke: '#ffffff33', strokeWidth: 1 }), chain(i, 'fade-down', { duration: 400 })),
            withAnims(shape('rect', x, 480, 200, 110, IVORY), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-family:${H};font-size:28px;font-style:italic">${n}</div><div style="font-size:16px;letter-spacing:2px;color:#6b5d50">${c.toUpperCase()}</div>`, x + 18, 494, 170, 86, { fontSize: 18, color: '#2b2a33' }), A('fade-in', { start: 'withPrev' }))]; }).flat(),
        text('Regla: un color manda (60 %), otro acompaña (30 %) y un tercero da la nota (10 %).', 80, 620, 1120, 40, { fontSize: 22, color: DIM })],
        notes: 'Muestras de color como tiras de pintura, que caen una tras otra. Recuerda la regla del 60-30-10 para que el escaparate no parezca un mercadillo.' },
      { layout: 'titleOnly', title: 'La regla del triángulo', bg: BG, extra: [
        pic(windowSVG, WX, WY, 720, 416, 'Escaparate iluminado con tres maniquíes de alturas distintas'),
        withAnims(stroke(`M${tri[0][0]} ${tri[0][1]} L${tri[1][0]} ${tri[1][1]} L${tri[2][0]} ${tri[2][1]} Z`, WX, WY, 720, 416, '#ffffff', 3, { dash: '8 8' }), A('draw', { start: 'click', duration: 1600 })),
        ...HEADS.map((hd, i) => { const [x, y] = wpt(hd); return withAnims(shape('ellipse', x - 10, y - 10, 20, 20, '#ffffff'), A('zoom-in', { start: 'withPrev', delay: 400 * i, duration: 300 })); }),
        text(`<div style="font-family:${H};font-size:30px;font-style:italic;color:${RUST}">Tres alturas, una mirada</div>`
          + '<p>El ojo salta de una cabeza a otra y recorre todo el escaparate.</p><p>El punto más alto, para la prenda que más queremos vender.</p><p>Nunca tres maniquíes en fila: parece una cola.</p>',
          830, 170, 390, 450, { fontSize: 22, color: IVORY, lineHeight: 1.4 })],
        notes: 'El escaparate es un dibujo SVG propio. Con un clic se dibuja el triángulo que une las tres cabezas (efecto «Dibujar»). Pide al equipo que lo busquen en los escaparates de la calle.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        text('3<span style="font-size:72px"> segundos</span>', 60, 80, 660, 400, { fontFamily: H, fontSize: 320, fontStyle: 'italic', color: IVORY, lineHeight: 1 }),
        text('es lo que un peatón mira un escaparate al pasar. En ese tiempo solo cabe una idea.', 70, 480, 560, 130, { fontSize: 30, color: SAND }),
        ...[['1', 'producto héroe'], ['1', 'color que manda'], ['1', 'precio, discreto']].map(([n, l], i) =>
          withAnims(text(`<span style="font-family:${H};font-size:64px;font-style:italic;color:${RUST};margin-right:16px">${n}</span>${l}`, 760, 150 + i * 150, 440, 100, { fontSize: 30, color: IVORY, vAlign: 'middle' }), chain(i, 'fade-left'))),
        text('Estudio de miradas en tres calles comerciales (datos de ejemplo).', 760, 600, 440, 50, { fontSize: 16, color: DIM })],
        notes: 'Cifra gigante en cursiva: el tiempo de atención. Luego, la consecuencia en tres «unos». Cifra de ejemplo.' },
      { layout: 'titleOnly', title: 'Puntos focales', bg: BG, extra: [
        pic(windowSVG, WX, WY, 720, 416, 'El escaparate con sus puntos focales'),
        ...[[[450, 52], 'Foco cálido de 3.000 K sobre el héroe'], [[450, 190], 'La prenda principal, en el punto más alto'], [[592, 340], 'Precio pequeño, sobre la maleta'], [[160, 446], 'Hojas secas: la temporada, sin palabras']].flatMap(([pt, l], i) => { const [x, y] = wpt(pt);
          return [withAnims(shape('ellipse', x - 22, y - 22, 44, 44, RUST, { stroke: IVORY, strokeWidth: 3 }), chain(i, 'zoom-in', { duration: 300, sound: 'click' })),
            withAnims(text(String(i + 1), x - 22, y - 22, 44, 44, { fontSize: 22, color: '#ffffff', fontWeight: 700, textAlign: 'center', vAlign: 'middle' }), A('fade-in', { start: 'withPrev', duration: 300 })),
            withAnims(text(`<span style="font-family:${H};font-size:30px;font-style:italic;color:${RUST};margin-right:12px">${i + 1}</span>${l}`, 830, 180 + i * 110, 390, 90, { fontSize: 22, color: IVORY, vAlign: 'middle' }), A('fade-left', { start: 'withPrev', duration: 400 }))]; })],
        notes: 'Cuatro puntos numerados sobre el dibujo del escaparate; cada clic añade uno y su explicación, con un «clic» de sonido.' },
      { layout: 'titleOnly', title: 'Un escaparate por mes', bg: BG, extra: [
        dg('timeline', 'Septiembre\n  Vuelta a la ciudad\nOctubre\n  Otoño lento\nNoviembre\n  Viernes Negro, sin gritos\nDiciembre\n  Regalar despacio\nEnero\n  Rebajas: el blanco', 70, 190, 1140, 400, { oneByOne: true, colors: 'accent', fontScale: 1.1 })],
        notes: 'Calendario de escaparates en una cronología que aparece hito a hito. Cada cambio se monta el domingo por la noche.' },
      { layout: 'titleOnly', title: '¿Funciona? Contamos quién entra', bg: BG, extra: [
        chartBlock({ x: 70, y: 160, w: 780, h: 470, chartType: 'line', color: DIM, seriesName: 'Escaparate de verano', grid: true, labelColor: DIM, yTitle: 'Entradas en tienda por semana',
          data: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((l, i) => ({ label: l, value: [610, 640, 598, 625, null, null][i] })),
          series: [{ name: 'Otoño lento', color: RUST, values: [null, null, null, 625, 742, 768] }] }),
        withAnims(text(`<div style="font-family:${H};font-size:110px;font-style:italic;color:${RUST};line-height:1">+22 %</div><div style="margin-top:10px">de entradas desde el cambio, con la misma calle y el mismo tiempo.</div>`, 890, 220, 330, 330, { fontSize: 24, color: IVORY }), A('fade-left', { start: 'click' }))],
        notes: 'Dos series en líneas que se tocan en la semana del cambio. El contador de la puerta da el dato cada día. Cifras de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 32, question: '¿Qué escaparate de Navidad te haría entrar?', options: ['Bosque de hojas secas', 'Mesa de lectura y lana', 'Maleta de viaje abierta', 'Paquetes de papel kraft'], display: 'bar', x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación con el equipo: la idea ganadora se monta en diciembre. Pide un voto rápido y comenta el resultado.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Click and collect for a toy shop chain: the app in a phone, a dotted route that draws itself, a toy car in 3D, the web in a browser and code.
  biz_retail_omni: { name: 'Omnicanal: compra online, recoge en tienda', summary: 'App en el móvil y web en el navegador dibujadas, ruta que se traza sola, furgoneta 3D que recorre la calle, tabla con fórmula, código y 100 % apiladas', cat: 'biz', make: () => {
    const { BG, BG2, FG, DIM, CORAL, SKY, MINT, YEL } = PZ, H = head('modern'), PH = uid();
    const phone = (x, y, w, h, props = {}) => ({ ...device(peonzaApp, 'phone', x, y, w, h, 'La app de Peonza con la opción de recoger en tienda'), ...props, id: PH });
    return numbered(build({ name: 'Peonza · recoge en tienda', palette: 'ocean', fonts: 'modern', title: { color: FG, size: 44 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(-160, 300, 700, '#1d4f8a', BG, 55),
        kicker('PEONZA · JUGUETERÍAS · PLAN 2027', 80, 110, 600, MINT, 18),
        text('Pide en casa,<br>recoge en<br>tu tienda', 76, 150, 620, 330, { fontFamily: H, fontSize: 70, fontWeight: 800, color: FG, lineHeight: 1.1 }),
        text('En dos horas, sin gastos de envío y con alguien que te lo explica', 80, 500, 560, 80, { fontSize: 26, color: DIM }),
        withAnims(stroke('M5 80 C 30 95, 40 20, 70 35 S 90 10, 95 8', 760, 230, 300, 300, YEL, 4, { dash: 'dash' }), A('draw', { start: 'afterPrev', delay: 400, duration: 1400 })),
        phone(690, 360, 150, 300, { rotation: -8 }),
        withAnims(shape('ellipse', 1040, 140, 150, 150, CORAL), A('zoom-in', { start: 'afterPrev', duration: 400, sound: 'pop' })),
        withAnims(icon('store', 1075, 175, 80, '#ffffff'), A('fade-in', { start: 'withPrev' }))],
        notes: 'Portada: del móvil a la tienda, una ruta punteada que se dibuja sola (efecto «Dibujar») y la tienda que aparece con un «pop». La pantalla de la app es un dibujo SVG propio dentro de un marco de móvil.' },
      { layout: 'titleOnly', title: 'El cliente ya va y viene', bg: BG, extra: [
        ...[['search', '68 %', 'mira la web antes de ir a la tienda', MINT], ['shopping-cart', '1 de 3', 'pedidos online del piloto se recogió en tienda', YEL], ['gift', '+26 %', 'compra algo más al recoger su pedido', CORAL]].map(([ic, n, l, c], i) => {
          const x = 70 + i * 390;
          return [withAnims(shape('rounded', x, 190, 360, 400, BG2, { radius: 22 }), chain(i, 'fade-up', { duration: 450 })),
            withAnims(icon(ic, x + 40, 230, 56, c), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-family:${H};font-size:84px;font-weight:800;color:${c};line-height:1.1">${n}</div><div style="margin-top:10px">${l}</div>`, x + 40, 310, 290, 250, { fontSize: 25, color: FG }), A('fade-in', { start: 'withPrev' }))]; }).flat()],
        notes: 'Tres cifras en tarjetas que entran seguidas con un clic. Datos de ejemplo del piloto en dos tiendas.' },
      { layout: 'titleOnly', title: 'Cómo funciona', bg: BG, transition: 'slide', autoAnimate: true, extra: [
        dg('cards', 'Pide\n  En la web o la app, antes de las 18:00\nPreparamos\n  El equipo lo saca del lineal en 30 minutos\nAvisamos\n  Un mensaje con un código QR\nRecoges\n  En el mostrador rápido, sin colas', 70, 170, 820, 470, { oneByOne: true, colors: 'colorful', fontScale: 1.05 }),
        phone(960, 150, 250, 500)],
        notes: 'Transformar: el móvil viaja desde la portada y se endereza. Las cuatro tarjetas del diagrama aparecen una a una al presentar.' },
      { layout: 'titleOnly', title: 'Enviar o recoger', bg: BG, extra: [
        shape('rect', 0, 160, 1280, 140, '#24323f'), ...Array.from({ length: 12 }, (_, i) => shape('rect', 20 + i * 110, 226, 60, 8, '#ffffff', { opacity: 70 })),
        withAnims(m3d('kh-CesiumMilkTruck', 980, 150, 260, 160, { autoRotate: false, view: 'side', edge: 'free' }), path([[-440, 0], [-880, 0]], { start: 'click', duration: 3500 })),
        tableBlock({ x: 70, y: 320, w: 1140, h: 320, fontSize: 25, header: true, headBg: CORAL, headFg: '#ffffff', stroke: '#2a4a6a', banded: true, band: SKY, color: FG, colW: [2.6, 2, 2],
          rows: [['Por pedido', 'Envío a casa', 'Recoger en tienda'], ['Plazo', '2 o 3 días', '2 horas'], ['Coste para el cliente', '3,95 €', '0 €'], ['Coste para Peonza', '6,85 €', '1,10 €'], ['Ahorro de Peonza por pedido', '', '=B4-C4']] }),
        credits(['kh-CesiumMilkTruck'], 70, 650, 1140, DIM)],
        notes: 'Haz clic: la furgoneta de reparto 3D recorre la calle (Animaciones ▸ Trayectoria). La tabla compara las dos opciones; el ahorro es una fórmula (=B4-C4). Costes de ejemplo.' },
      { layout: 'titleOnly', title: 'En la web, a la vista', bg: BG, extra: [
        device(peonzaWeb, 'browser', 70, 160, 760, 470, 'Ficha de producto de la web con la opción de recoger en tienda'),
        ...[['Stock real por tienda', 'Si no hay, no se ofrece: nunca un «lo siento».'], ['Hora de recogida', 'Calculada con el turno de la tienda.'], ['Pago en la web', 'En la tienda solo se enseña el código.']].map(([h, d], i) =>
          withAnims(text(`<div style="font-size:26px;font-weight:700;color:${[MINT, YEL, CORAL][i]}">${h}</div><div>${d}</div>`, 880, 190 + i * 145, 340, 125, { fontSize: 22, color: FG }), chain(i, 'fade-left')))],
        notes: 'La web dentro de un marco de navegador (Imagen ▸ Dispositivo ▸ Navegador). Las tres claves entran en cadena.' },
      { layout: 'titleOnly', title: 'Reservar sin vender dos veces', bg: BG, extra: [
        codeBlock({ x: 60, y: 160, w: 800, h: 440, fontSize: 18, lang: 'javascript', lineSteps: '1-2|3-5|6-8|10',
          code: "async function reservar(pedido, tienda) {\n  const stock = await inventario.de(tienda, pedido.ref);\n  if (stock.libre < pedido.unidades) {\n    return ofrecerOtraTienda(pedido);\n  }\n  await inventario.bloquear(tienda, pedido, { minutos: 120 });\n  await avisarTienda(tienda, pedido);\n  return { listoA: horaDeRecogida(tienda) };\n}\n// Si en 2 horas no se recoge, el stock vuelve a la venta." }),
        ...[['1', 'Mira el stock de esa tienda'], ['2', 'Si falta, propone otra'], ['3', 'Bloquea, avisa y da hora'], ['4', 'Sin recoger, se libera']].map(([n, t], i) =>
          withAnims(text(`<b style="color:${YEL};font-size:30px">${n}</b>  ${t}`, 900, 190 + i * 95, 320, 60, { fontSize: 23, color: FG, vAlign: 'middle' }), A('fade-left', { start: 'click' })))],
        notes: 'Código con pasos de resaltado: cada clic ilumina un bloque y añade su explicación. Es un ejemplo en JavaScript, no el código real.' },
      { layout: 'titleOnly', title: 'Cómo cambia la venta', bg: BG, extra: [
        chartBlock({ x: 70, y: 160, w: 1140, h: 480, chartType: 'stacked100', color: SKY, seriesName: 'Tienda', grid: true, labelColor: DIM, dataLabels: true,
          data: ['T1 26', 'T2 26', 'T3 26', 'T4 26', 'T1 27*', 'T2 27*'].map((l, i) => ({ label: l, value: [84, 82, 80, 76, 72, 68][i] })),
          series: [{ name: 'Envío a casa', color: CORAL, values: [14, 14, 13, 15, 12, 12] }, { name: 'Recoger en tienda', color: MINT, values: [2, 4, 7, 9, 16, 20] }] }),
        text('* Previsión. La venta total crece: la recogida no quita clientes a la tienda, los trae.', 70, 650, 1140, 34, { fontSize: 20, color: DIM })],
        notes: 'Barras apiladas al 100 %: el peso de cada canal por trimestre. Recoger en tienda pasa del 2 al 20 %. Datos y previsión de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'qa', fontSize: 32, question: 'Preguntas del equipo de tienda: ¿qué te preocupa del cambio?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Preguntas del público: el equipo envía sus dudas desde el móvil y se votan; responde primero las más votadas.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(700, 100, 700, '#1d4f8a', BG, 55),
        text('1 de marzo', 80, 160, 620, 110, { fontFamily: H, fontSize: 90, fontWeight: 800, color: YEL }),
        text('Empezamos en 6 tiendas.<br>En junio, en las 24.', 80, 290, 620, 140, { fontSize: 40, color: FG, lineHeight: 1.3 }),
        text('Dudas: equipo de tienda online · canal #recoge-en-tienda', 80, 500, 620, 40, { fontSize: 22, color: DIM }),
        device(peonzaApp, 'phone', 860, 110, 250, 500, 'La app de Peonza', { rotation: 6 })],
        notes: 'Cierre con la fecha de arranque y el despliegue. Deja el canal de dudas a la vista.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · A bakery's loyalty club: chocolate brown, a stamp card that fills with sound, the lifetime value, levels and the app.
  biz_retail_loyalty: { name: 'Fidelización: el club de la panadería', summary: 'Tarjeta de sellos que se llena en cadena con sonido y aplausos, ecuación del valor del cliente, pirámide de niveles, tabla con fórmulas y app', cat: 'biz', make: () => {
    const { BG, BG2, CREAM, RED, GOLD, BROWN, DIM } = HC, H = 'Georgia, serif';
    const stamp = (i, x0, y0, k, props = {}) => { const [cx, cy] = SLOT(i, x0, y0, k), d = 84 * k, gift = i === 9;
      return [{ ...shape('ellipse', cx - d / 2, cy - d / 2, d, d, gift ? GOLD : RED, { stroke: gift ? '#b07a22' : '#8a1f19', strokeWidth: 4, opacity: 92, rotation: (i * 37) % 30 - 15, ...props }) },
        icon(gift ? 'gift' : 'coffee', cx - d * 0.25, cy - d * 0.25, d * 0.5, '#ffffff')]; };
    return numbered(build({ name: 'Horno de Cata · club', palette: 'revela', fonts: 'websafe', title: { color: GOLD, size: 46, font: H, bold: false }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(700, 0, 700, '#5a3420', BG, 60),
        kicker('HORNO DE CATA · PANADERÍA Y CAFÉ', 80, 150, 560, GOLD, 18),
        text('El club<br>del Horno', 76, 190, 560, 250, { fontFamily: H, fontSize: 92, fontStyle: 'italic', color: CREAM, lineHeight: 1.05 }),
        text('Programa de fidelización para las cuatro tiendas · 2027', 80, 460, 540, 80, { fontSize: 24, color: DIM }),
        horno(660, 190, 560, 333),
        ...[0, 1, 2].flatMap(i => stamp(i, 660, 190, 560 / 640))],
        notes: 'Portada en marrón chocolate con la tarjeta de sellos (dibujo SVG propio) y tres sellos ya puestos. Presenta el club como algo que los clientes ya nos pedían.' },
      { layout: 'titleOnly', title: 'Nueve cafés y el décimo invita la casa', bg: BG, extra: [
        horno(240, 170, 800, 475, 'La tarjeta de sellos, grande'),
        ...Array.from({ length: 10 }, (_, i) => stamp(i, 240, 170, 800 / 640).map((b, j) => withAnims(b, j ? A('fade-in', { start: 'withPrev', duration: 200 })
          : A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: i === 9 ? 600 : 220, delay: i === 9 ? 300 : 0, sound: i === 9 ? 'applause' : 'pop' })))).flat()],
        notes: 'Con un clic se ponen los nueve sellos seguidos, cada uno con un «pop», y el décimo, el regalo, llega con aplausos. Es una tarjeta de cartón y también estará en la app.' },
      { layout: 'titleOnly', title: 'Por qué merece la pena', bg: BG, extra: [
        text(`<div style="font-family:${H};font-size:150px;font-style:italic;color:${GOLD};line-height:1.1">5×</div><div style="margin-top:16px">más caro es conseguir un cliente nuevo que conservar a uno que ya viene.</div>`, 70, 210, 460, 400, { fontSize: 26, color: CREAM }),
        mathBlock({ x: 580, y: 180, w: 640, h: 130, fontSize: 52, latex: '\\text{VC} = m \\cdot \\dfrac{r}{1 + d - r}', color: CREAM }),
        ...[['m', 'margen al año de un cliente: 310 €'], ['r', 'probabilidad de que siga el año siguiente'], ['d', 'tasa de descuento, el 8 %']].map(([v, t], i) =>
          withAnims(text(`<b style="font-family:${H};font-size:32px;color:${GOLD};font-style:italic">${v}</b>  ${t}`, 600, 340 + i * 60, 620, 50, { fontSize: 22, color: CREAM, vAlign: 'middle' }), chain(i, 'fade-left'))),
        withAnims(card(`Si la retención pasa del 60 al 70 %, el valor de cada cliente sube de <b style="color:${GOLD}">388 €</b> a <b style="color:${GOLD}">571 €</b>.`, 600, 540, 620, 100, BG2, { fontSize: 23, color: CREAM, vAlign: 'middle', radius: 12 }), A('fade-up', { start: 'click' }))],
        notes: 'Ecuación del valor del cliente (VC) con margen, retención y descuento. Con los datos de ejemplo, diez puntos más de retención suben el valor un 47 %.' },
      { layout: 'titleOnly', title: 'Tres niveles, como el pan', bg: BG, extra: [
        dg('pyramid', 'Masa madre\nHogaza\nMiga', 70, 170, 520, 460, { colors: 'colorful', fontScale: 1 }),
        ...[['Miga', 'Al apuntarte', 'Un sello por cada café o desayuno.'], ['Hogaza', 'Desde 10 visitas al mes', '10 % en el pan de cada día y reserva de roscón.'], ['Masa madre', 'Desde 2 años en el club', 'Taller de pan para dos y tarta el día de tu cumpleaños.']].map(([n, w, d], i) =>
          withAnims(text(`<div style="font-family:${H};font-size:30px;font-style:italic;color:${GOLD}">${n} <span style="font-size:18px;color:${DIM};font-style:normal">· ${w}</span></div><div>${d}</div>`, 640, 470 - i * 150, 580, 120, { fontSize: 23, color: CREAM }), chain(i, 'fade-left')))],
        notes: 'Pirámide de niveles: la base es la más amplia y la cima, la más exclusiva. Los beneficios entran de abajo arriba.' },
      { layout: 'titleOnly', title: 'Lo que cuesta al año', bg: BG, extra: [
        tableBlock({ x: 70, y: 170, w: 1140, h: 360, fontSize: 25, header: true, headBg: GOLD, headFg: BG, stroke: '#5a3a28', banded: true, band: BROWN, color: CREAM, colW: [3, 1.6, 1.6, 1.6],
          rows: [['Recompensa', 'Canjes al año', 'Coste unitario', 'Coste total'], ['Café gratis (cada 10)', '9.400', '0,38 €', '=B2*C2'], ['10 % en el pan', '21.000', '0,24 €', '=B3*C3'],
            ['Taller de pan para dos', '120', '18 €', '=B4*C4'], ['Tarta de cumpleaños', '850', '4,20 €', '=B5*C5'], ['<b>Total</b>', '', '', '=SUMA(D2:D5)']] }),
        text(`Se paga con <b style="color:${GOLD}">una visita más al mes</b> de cada socio: unas 2.300 personas.`, 70, 570, 1140, 50, { fontSize: 26, color: CREAM })],
        notes: 'Tabla con fórmulas: coste total = canjes por coste unitario (=B2*C2) y la suma de la columna. Importes de ejemplo.' },
      { layout: 'titleOnly', title: 'Y sin cartón, en el móvil', bg: BG, transition: 'slide', extra: [
        device(cataApp, 'phone', 120, 140, 260, 520, 'La tarjeta de sellos en la app'),
        ...[['qrcode', 'Un código al pagar', 'El sello se pone solo; nada de tarjetas perdidas.'], ['bell', 'Avisos que apetecen', 'Solo cuando sale el roscón o el pan de temporada.'], ['shield-check', 'Tus datos, tuyos', 'Ni los vendemos ni los cruzamos con nadie.']].map(([ic, h, d], i) => [
          withAnims(icon(ic === 'qrcode' ? 'smartphone' : ic, 480, 190 + i * 150, 54, GOLD), chain(i, 'zoom-in', { duration: 300 })),
          withAnims(text(`<div style="font-family:${H};font-size:28px;font-style:italic;color:${CREAM}">${h}</div><div style="color:${DIM}">${d}</div>`, 560, 180 + i * 150, 660, 110, { fontSize: 22 }), A('fade-left', { start: 'withPrev' }))]).flat()],
        notes: 'La tarjeta digital dentro de un móvil (dibujo SVG propio). Tres promesas con icono que entran en cadena.' },
      { layout: 'titleOnly', title: 'Los socios vuelven más', bg: BG, extra: [
        chartBlock({ x: 70, y: 160, w: 800, h: 480, chartType: 'line', color: GOLD, seriesName: 'Socios del piloto', grid: true, labelColor: DIM, yTitle: 'Visitas al mes por cliente',
          data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((l, i) => ({ label: l, value: [4.1, 5.2, 6.0, 6.6, 7.1, 7.4][i] })), series: [{ name: 'Resto de clientes', color: DIM, values: [4.0, 4.1, 3.9, 4.2, 4.0, 4.1] }] }),
        withAnims(text(`<div style="font-family:${H};font-size:120px;font-style:italic;color:${GOLD};line-height:1">×1,8</div><div style="margin-top:10px">visitas al mes tras seis meses en el club</div>`, 910, 230, 310, 300, { fontSize: 25, color: CREAM }), A('zoom-in', { start: 'click' }))],
        notes: 'Dos líneas: socios del piloto de la tienda de la plaza frente al resto. Datos de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 32, question: '¿Qué recompensa te haría venir más a menudo?', options: ['Café gratis cada 10', 'Descuento en el pan', 'Talleres de pan', 'Roscón sin colas'], display: 'bar', x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación en directo con clientes o con el equipo. La recompensa ganadora se destaca en el lanzamiento.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-120, 200, 700, '#5a3420', BG, 60),
        text('Pásate y te ponemos<br>el primer sello.', 80, 200, 640, 200, { fontFamily: H, fontSize: 56, fontStyle: 'italic', color: CREAM, lineHeight: 1.2 }),
        text('Lanzamiento: lunes 11 de enero en las cuatro tiendas', 80, 430, 620, 80, { fontSize: 24, color: GOLD }),
        withAnims(shape('ellipse', 860, 200, 300, 300, RED, { stroke: '#8a1f19', strokeWidth: 8, rotation: -12 }), A('zoom-in', { start: 'afterPrev', delay: 300, duration: 350, sound: 'pop' })),
        withAnims(text('CLUB<br>DEL<br>HORNO', 860, 200, 300, 300, { fontFamily: H, fontSize: 44, fontWeight: 700, color: '#ffffff', textAlign: 'center', vAlign: 'middle', rotation: -12, letterSpacing: 4, lineHeight: 1.1 }), A('zoom-in', { start: 'withPrev', duration: 350 }))],
        notes: 'Cierre con un gran sello rojo que cae solo con un «pop». Termina con la fecha de lanzamiento.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · A municipal market's revival plan: tiles and an iron arch, curved name, chalk slates, treemap, a seasonal table and an avocado in 3D.
  biz_retail_market: { name: 'Mercado municipal: plan para revivirlo', summary: 'Fachada de hierro con nombre curvo, pizarras de tiza en cadena, treemap, áreas por horas, calendario de temporada en tabla, aguacate 3D y nube', cat: 'biz', make: () => {
    const { GREEN, IRON, SLATE, CHALK, WOOD, TOMATO, ORANGE, LEMON, LEAF } = MC, H = head('editorial'), BGL = '#f6f4ec', INK = '#23302b';
    const m = '<b style="color:#3f9c4a">●</b>';
    return numbered(build({ name: 'Mercado del Carmen · plan 2027', palette: 'forest', fonts: 'editorial', title: { color: GREEN, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', bg: MC.TILE, transition: 'fade', extra: [
        pic(marketSVG, 0, 0, 1280, 720, 'Fachada de hierro y cristal del mercado con puestos de fruta'),
        text('MERCADO DEL CARMEN', 190, 34, 900, 300, { fontFamily: H, fontSize: 44, fontWeight: 700, curve: 20, color: IRON, letterSpacing: 6, textAlign: 'center' }),
        withAnims(slate(`Plan para llenarlo de vida<div style="font-size:24px;margin-top:4px">2027 · asociación de comerciantes</div>`, 430, 470, 420, 140, { rotation: -2 }), A('fade-down', { start: 'afterPrev', delay: 300, duration: 700 }))],
        notes: 'Portada: el mercado dibujado en SVG (arco de hierro, cristal, toldos y cajas de fruta) y el nombre en texto curvo sobre el arco. La pizarra cae sola.' },
      { layout: 'titleOnly', title: 'Cómo está hoy', bg: BGL, extra: [
        ...[['38', 'puestos'], ['9', 'cerrados'], ['61', 'años, la edad media del cliente'], ['14:00', 'cierra cada día']].map(([n, l], i) =>
          withAnims(slate(`<div style="font-size:84px;line-height:1">${n}</div><div style="font-size:30px">${l}</div>`, 70 + i * 290, 200, 260, 300, { rotation: [-3, 2, -1, 3][i] }), chain(i, 'fade-down', { duration: 450 }))),
        text('Fuente: censo de la asociación y encuesta a 400 clientes (datos de ejemplo).', 70, 580, 1140, 40, { fontSize: 20, color: '#5a6b62' })],
        notes: 'Cuatro pizarras de tiza (tipo de letra manuscrita) que caen una tras otra. El dato que más duele: casi uno de cada cuatro puestos, cerrado.' },
      { layout: 'titleOnly', title: 'Qué se vende', bg: BGL, transition: 'slide', extra: [
        chartBlock({ x: 70, y: 160, w: 780, h: 480, chartType: 'treemap', dataLabels: true,
          data: [['Fruta y verdura', 31, LEAF], ['Carnicería', 22, TOMATO], ['Pescadería', 18, '#3f7fae'], ['Charcutería', 12, ORANGE], ['Panadería', 7, '#c9a24a'], ['Bar', 6, IRON], ['Otros', 4, '#9aa69f']].map(([label, value, color]) => ({ label, value, color })) }),
        withAnims(text(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${GREEN}">El bar es el 6 %…</div><div style="margin-top:8px">pero es donde más tiempo pasa la gente. Lo usaremos como reclamo de tarde.</div>`, 890, 220, 330, 300, { fontSize: 24, color: INK }), A('fade-left', { start: 'click' }))],
        notes: 'Treemap: cada rectángulo es proporcional a las ventas de cada tipo de puesto. Porcentajes de ejemplo.' },
      { layout: 'titleOnly', title: 'Cuándo viene la gente', bg: BGL, extra: [
        chartBlock({ x: 70, y: 160, w: 1140, h: 460, chartType: 'area', color: LEAF, seriesName: 'Laborables', grid: true, yTitle: 'Personas por hora',
          data: ['8', '9', '10', '11', '12', '13', '14', '17', '18', '19', '20'].map((l, i) => ({ label: l + ' h', value: [60, 140, 210, 260, 220, 150, 40, null, null, null, null][i] })),
          series: [{ name: 'Sábado', color: ORANGE, values: [90, 260, 420, 480, 410, 260, 70, null, null, null, null] }, { name: 'Tardes (objetivo)', color: TOMATO, values: [null, null, null, null, null, null, null, 120, 190, 230, 160] }] }),
        text('Hoy cierra a las 14:00. El objetivo: abrir jueves y viernes de 17:00 a 21:00.', 70, 630, 1140, 34, { fontSize: 20, color: '#5a6b62' })],
        notes: 'Áreas por horas: laborables, sábados y, en rojo, el objetivo de las tardes de jueves y viernes. Datos de los contadores de las puertas, de ejemplo.' },
      { layout: 'titleOnly', title: 'Cuatro ideas, un año', bg: BGL, extra: [
        ...[['clock', 'Tardes abiertas', 'Jueves y viernes, de 17:00 a 21:00.', TOMATO], ['utensils', 'Barra de degustación', 'Cocinamos lo que compras, por 3 €.', ORANGE], ['bike', 'Pedido y reparto', 'Por mensaje antes de las 12, en casa a las 14.', LEAF], ['school', 'Mercado escuela', 'Talleres para los cinco colegios del barrio.', '#3f7fae']].map(([ic, h, d, c], i) => {
          const x = 70 + i * 290;
          return [withAnims(shape('rounded', x, 180, 270, 360, '#ffffff', { radius: 12, stroke: '#e1ddd0', strokeWidth: 2 }), chain(i, 'fade-up', { duration: 400 })),
            withAnims(shape('rect', x, 180, 270, 28, c), A('fade-in', { start: 'withPrev' })),
            ...Array.from({ length: 6 }, (_, k) => withAnims(shape('ellipse', x + k * 45 + 2, 196, 44, 24, c), A('fade-in', { start: 'withPrev' }))),
            withAnims(icon(ic, x + 105, 250, 60, c), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${INK}">${h}</div><div style="margin-top:10px">${d}</div>`, x + 20, 340, 230, 190, { fontSize: 22, color: '#46534d', textAlign: 'center' }), A('fade-in', { start: 'withPrev' }))]; }).flat(),
        withAnims(text(`Presupuesto del año: <b style="color:${GREEN}">86.000 €</b>, la mitad con la ayuda municipal al comercio de proximidad.`, 70, 580, 1140, 50, { fontSize: 24, color: INK, textAlign: 'center' }), A('fade-in', { start: 'afterPrev' }))],
        notes: 'Cuatro tarjetas con toldo de puesto (rectángulo y festón de elipses) que entran en cadena con un clic, y después el presupuesto (cifra de ejemplo). Cada idea tiene un responsable en la junta.' },
      { layout: 'titleOnly', title: 'Lo que toca cada mes', bg: BGL, extra: [
        tableBlock({ x: 70, y: 160, w: 1140, h: 420, fontSize: 24, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#d9d4c4', color: INK, colW: [3, 1, 1, 1, 1, 1, 1],
          rows: [['Producto', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'], ['Aguacate', '', m, m, m, m, m], ['Caqui', m, m, m, '', '', ''], ['Naranja', '', m, m, m, m, m], ['Alcachofa', '', m, m, m, m, m], ['Setas', m, m, '', '', '', ''], ['Granada', m, m, m, '', '', '']],
          cellBg: Object.fromEntries([[1, [2, 3, 4, 5, 6]], [2, [1, 2, 3]], [3, [2, 3, 4, 5, 6]], [4, [2, 3, 4, 5, 6]], [5, [1, 2]], [6, [1, 2, 3]]].flatMap(([r, cs]) => cs.map(c => [`${r},${c}`, '#dcefd3']))) }),
        text('Cada mes, la pizarra de la entrada anuncia lo que está en su mejor momento.', 70, 600, 1140, 40, { fontSize: 22, color: '#5a6b62' })],
        notes: 'Calendario de temporada como tabla con celdas coloreadas. Es orientativo y depende de la zona.' },
      { layout: 'titleOnly', title: 'Del campo al puesto', bg: BGL, extra: [
        m3d('kh-Avocado', 70, 160, 360, 360, { autoRotate: true, spin: 20, view: 'three', edge: 'fade' }),
        slate('Aguacate de la costa<div style="font-size:42px">3,90 €/kg</div>', 110, 520, 280, 120, { rotation: -2, fontSize: 28 }),
        chartBlock({ x: 470, y: 170, w: 750, h: 460, chartType: 'hbar', color: LEAF, dataLabels: true, xTitle: 'Kilómetros desde el origen',
          data: [['Pescado de la lonja', 25, '#3f7fae'], ['Queso de la sierra', 60, ORANGE], ['Aguacate de la costa', 90, LEAF], ['Naranjas del valle', 140, '#e08a2b'], ['Media de un súper', 1200, '#9aa69f']].map(([label, value, color]) => ({ label, value, color })) })],
        notes: 'El aguacate 3D gira despacio junto a su pizarra de precio. Las barras comparan la distancia que recorre cada producto. Kilómetros de ejemplo.' },
      { layout: 'blank', bg: BGL, extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué te haría venir al mercado por la tarde?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras en directo: cada vecino escribe una idea y las más repetidas crecen.' },
      { layout: 'blank', bg: WOOD, transition: 'zoom', extra: [
        shape('rect', 0, 0, 1280, 720, WOOD, { fill2: '#7d5530', gradType: 'radial' }),
        shape('rounded', 40, 40, 1200, 640, SLATE, { radius: 10, stroke: '#6b4a2b', strokeWidth: 6, shadow: { x: 0, y: 10, blur: 24, color: '#00000066' } }),
        text('Nos vemos en el mercado', 90, 90, 1100, 120, { fontFamily: CAVEAT, fontSize: 92, color: CHALK, textAlign: 'center' }),
        withAnims(stroke('M2 60 C 25 20, 50 90, 75 40 S 95 50, 98 45', 340, 200, 600, 30, CHALK, 3, { opacity: 70 }), A('draw', { start: 'afterPrev', duration: 900 })),
        ...[['De lunes a sábado', 'de 8:00 a 14:00', CHALK], ['Jueves y viernes', 'también de 17:00 a 21:00', LEMON]].map(([d, h, c], i) =>
          withAnims(text(`${d} <span style="color:${c}">· ${h}</span>`, 140, 290 + i * 90, 1000, 70, { fontFamily: CAVEAT, fontSize: 52, color: CHALK, textAlign: 'center' }), A('fade-in', { start: 'afterPrev', duration: 600 }))),
        ...[['apple', TOMATO], ['carrot', ORANGE], ['fish', '#7fb3d5'], ['leaf', LEAF], ['coffee', '#e6d3b3']].map(([ic, c], i) =>
          withAnims(icon(ic, 400 + i * 100, 500, 64, c), A('zoom-in', { start: 'afterPrev', duration: 250, ...(i ? {} : { sound: 'pop' }) }))),
        text('Mercado del Carmen · desde 1902', 90, 600, 1100, 40, { fontFamily: CAVEAT, fontSize: 30, color: '#b9b4a6', textAlign: 'center' })],
        notes: 'Cierre en una gran pizarra con marco de madera: el nuevo horario se escribe en cadena y los puestos aparecen con iconos de tiza. Invita a venir el primer jueves por la tarde.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · What a till receipt says: a thermal receipt that prints itself, the average ticket, a waterfall, pairs of products, SQL and a quiz.
  biz_retail_basket: { name: 'Análisis de cesta: lo que cuenta un ticket', summary: 'Ticket de caja que se imprime, ecuación del ticket medio, cascada, dispersión, red de productos, tabla, consulta SQL, dona y concurso', cat: 'biz', make: () => {
    const { BG, PAPER, INK, TEAL, AMBER, ROSE, DIM } = RC, H = head('tech'), PANEL = '#262c31';
    const nodes = [['Pan', 160, 90], ['Tomate', 60, 230], ['Aceite', 250, 260], ['Cerveza', 430, 110], ['Patatas fritas', 520, 260], ['Pañales', 400, 400], ['Toallitas', 160, 400]];
    const links = [[0, 1, 2.9], [1, 2, 2.4], [0, 2, 1.8], [3, 4, 3.6], [5, 6, 4.1], [3, 5, 1.4]];
    const net = svgURL(600, 470, links.map(([a, b, l]) => `<line x1="${nodes[a][1]}" y1="${nodes[a][2]}" x2="${nodes[b][1]}" y2="${nodes[b][2]}" stroke="${l > 3 ? AMBER : TEAL}" stroke-width="${l * 3}" stroke-linecap="round" opacity=".8"/>`
      + T((nodes[a][1] + nodes[b][1]) / 2, (nodes[a][2] + nodes[b][2]) / 2 - 10, 18, '#ffffff', l.toFixed(1).replace('.', ','), ' text-anchor="middle" font-weight="700"')).join('')
      + nodes.map(([n, x, y]) => `<circle cx="${x}" cy="${y}" r="34" fill="${PANEL}" stroke="#ffffff" stroke-width="3"/>` + T(x, y < 150 ? y - 44 : y + 56, 18, '#e8ecef', n, ' text-anchor="middle"')).join(''));
    const lineTicket = (rows, x, y, w, props = {}) => text(rows.map(([a, b]) => `<div style="display:flex;justify-content:space-between"><span>${a}</span><span>${b}</span></div>`).join(''), x, y, w, rows.length * 34 + 10, { fontFamily: MONO, fontSize: 22, color: INK, lineHeight: 1.5, ...props });
    return numbered(build({ name: 'Super Vecino · análisis de cesta', palette: 'midnight', fonts: 'tech', title: { color: '#ffffff', size: 44 }, body: { color: '#e8ecef' } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        kicker('SUPER VECINO · ANÁLISIS DE CESTA 2026', 80, 150, 620, TEAL, 18),
        text('Lo que cuenta<br>un ticket', 76, 190, 660, 220, { fontFamily: H, fontSize: 84, fontWeight: 700, color: '#ffffff', lineHeight: 1.05 }),
        text('1,2 millones de tickets de 14 tiendas de barrio, leídos uno a uno', 80, 430, 600, 80, { fontSize: 26, color: DIM }),
        withAnims(pic(receiptSVG(TICKET, 580), 820, 70, 340, 548, 'Ticket de caja con ocho artículos', { rotation: 3, shadow: { x: 0, y: 12, blur: 24, color: '#00000088' } }), A('fade-down', { start: 'afterPrev', delay: 300, duration: 1600, sound: 'whoosh' }))],
        notes: 'Portada: un ticket de caja dibujado en SVG que «sale de la impresora» (entra desde arriba despacio). Presenta la idea: cada ticket es una pequeña historia de una visita.' },
      { layout: 'titleOnly', title: 'Tres números para empezar', bg: BG, extra: [
        mathBlock({ x: 70, y: 160, w: 1140, h: 120, latex: '\\text{ticket medio} = \\dfrac{\\text{ventas}}{\\text{n.º de tickets}} = \\text{artículos} \\times \\text{precio medio}', color: '#ffffff', fontSize: 36 }),
        ...[['23,40 €', 'ticket medio', TEAL], ['7,8', 'artículos por ticket', AMBER], ['3,00 €', 'precio medio por artículo', ROSE]].map(([n, l, c], i) =>
          withAnims(text(`<div style="font-family:${H};font-size:76px;font-weight:700;color:${c};line-height:1.1">${n}</div><div>${l}</div>`, 70 + i * 390, 340, 360, 180, { fontSize: 25, color: '#e8ecef', textAlign: 'center', bg: PANEL, radius: 16, pad: [24, 16, 24, 16] }), chain(i, 'fade-up', { sound: 'click', duration: 400 }))),
        text('23,40 € = 7,8 artículos × 3,00 € de media.', 70, 580, 1140, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'La ecuación del ticket medio y sus dos palancas: más artículos o artículos más caros. Las tres cifras entran en cadena con un clic. Datos de ejemplo.' },
      { layout: 'titleOnly', title: 'De 21,10 € a 23,40 € en un año', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 70, y: 160, w: 1140, h: 440, chartType: 'waterfall', color: TEAL, dataLabels: true,
          data: [{ label: 'Subida de precios', value: 0.9 }, { label: 'Más artículos', value: 1.6 }, { label: 'Más marca propia', value: -0.4 }, { label: 'Promociones', value: 0.2 }, { label: 'Total del año', value: 0 }] }),
        text('Euros que suma (o resta) cada causa al ticket medio: 21,10 € + 2,30 € = 23,40 €.', 70, 620, 1140, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Cascada: de dónde viene la subida del ticket. Lo que más suma son los artículos de más, no los precios. La última barra (el total) se calcula sola. Cifras de ejemplo.' },
      { layout: 'titleOnly', title: 'Por la mañana se repone, por la tarde se improvisa', bg: BG, extra: [
        chartBlock({ x: 70, y: 160, w: 1140, h: 480, chartType: 'scatter', color: TEAL, seriesName: 'Mañana', grid: true, labelColor: DIM, xTitle: 'Artículos en el ticket', yTitle: 'Importe (€)', xMin: 0, xMax: 24, yMin: 0,
          data: [[12, 41], [15, 52], [9, 30], [18, 61], [14, 44], [20, 70], [11, 36], [16, 49], [22, 77], [13, 40]].map(([x, y]) => ({ label: String(x), value: y })),
          series: [{ name: 'Tarde', color: AMBER, x: [2, 3, 4, 1, 5, 3, 6, 2, 4, 7, 3, 5], values: [6.5, 9.8, 12.1, 3.2, 16.4, 11.0, 17.9, 7.4, 13.8, 21.0, 8.9, 14.2] }] })],
        notes: 'Dispersión con dos series: por la mañana, cestas grandes de reposición; por la tarde, compras pequeñas para hoy. Muestra de 22 tickets de ejemplo.' },
      { layout: 'titleOnly', title: 'Lo que viaja junto', bg: BG, extra: [
        pic(net, 60, 170, 600, 470, 'Red de productos que se compran juntos; el grosor es el lift'),
        tableBlock({ x: 700, y: 180, w: 520, h: 320, fontSize: 21, header: true, headBg: TEAL, headFg: BG, stroke: '#3a4248', banded: true, band: '#4a555e', color: '#e8ecef', colW: [2.6, 1.2, 1],
          rows: [['Pareja', 'Confianza', 'Lift'], ['Pañales → toallitas', '62 %', '4,1'], ['Cerveza → patatas', '38 %', '3,6'], ['Pan → tomate', '24 %', '2,9'], ['Tomate → aceite', '19 %', '2,4']] }),
        text('<b>Lift</b>: cuántas veces más se compran juntos de lo que tocaría por azar. Por encima de 3, colocarlos cerca.', 700, 520, 520, 110, { fontSize: 20, color: DIM })],
        notes: 'La red es un dibujo SVG propio: el grosor de cada línea es el lift de la pareja. La tabla da la confianza (de los que compran el primero, cuántos compran el segundo). Datos de ejemplo.' },
      { layout: 'titleOnly', title: 'La consulta', bg: BG, extra: [
        codeBlock({ x: 70, y: 160, w: 760, h: 420, fontSize: 20, lang: 'sql', lineSteps: '1-3|4-6|7-8|9-10',
          code: "SELECT a.producto, b.producto,\n       COUNT(*) AS juntos\nFROM lineas a\nJOIN lineas b\n  ON a.ticket = b.ticket\n AND a.producto < b.producto\nGROUP BY a.producto, b.producto\nHAVING COUNT(*) > 500\nORDER BY juntos DESC\nLIMIT 20;" }),
        ...[['Cada pareja de un ticket', TEAL], ['Sin contarla dos veces', AMBER], ['Solo las frecuentes', ROSE], ['Las 20 primeras', '#ffffff']].map(([t, c], i) =>
          withAnims(text(`<span style="color:${c};font-weight:700">●</span>  ${t}`, 870, 190 + i * 95, 350, 60, { fontSize: 24, color: '#e8ecef', vAlign: 'middle' }), A('fade-left', { start: 'click' })))],
        notes: 'Consulta SQL con pasos de resaltado: cada clic ilumina un bloque y su explicación. Une la tabla de líneas de ticket consigo misma para sacar las parejas.' },
      { layout: 'titleOnly', title: 'Cuatro misiones de compra', bg: BG, extra: [
        chartBlock({ x: 70, y: 170, w: 620, h: 460, chartType: 'doughnut', legend: false, data: [{ label: 'Reposición semanal', value: 34, color: TEAL }, { label: 'Comida para hoy', value: 29, color: AMBER }, { label: 'Urgencia', value: 22, color: ROSE }, { label: 'Capricho', value: 15, color: '#8e9ba6' }] }),
        ...[['Reposición · 34 %', 'Más de 12 artículos · mañana · 54 €', TEAL], ['Comida para hoy · 29 %', '3 a 6 artículos · 19:00 a 21:00 · 14 €', AMBER], ['Urgencia · 22 %', '1 o 2 artículos · cualquier hora · 4 €', ROSE], ['Capricho · 15 %', 'Dulces y bebidas · fin de semana · 7 €', '#8e9ba6']].map(([h, d, c], i) =>
          withAnims(text(`<div style="font-weight:700;color:${c};font-size:24px">${h}</div><div>${d}</div>`, 740, 175 + i * 115, 480, 100, { fontSize: 21, color: '#e8ecef' }), chain(i, 'fade-left')))],
        notes: 'Dona con el peso de cada misión de compra en los tickets (sin leyenda: cada misión, con su color, se explica al lado). Segmentación de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', fontSize: 34, question: '¿Qué pareja de productos tiene el lift más alto?', options: ['Pan y tomate', 'Cerveza y patatas fritas', 'Pañales y toallitas', 'Tomate y aceite'], correct: [2], time: 20, x: 60, y: 50, w: 1160, h: 610 })],
        notes: 'Concurso en directo con tiempo: la respuesta correcta es pañales y toallitas (lift 4,1). Comenta por qué la cerveza y las patatas no ganan.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        text('Tres cambios<br>en la tienda', 80, 170, 520, 220, { fontFamily: H, fontSize: 64, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
        text('y lo que esperamos sumar a cada ticket', 80, 400, 520, 80, { fontSize: 26, color: DIM }),
        withAnims(shape('rect', 680, 150, 480, 420, PAPER, { shadow: { x: 0, y: 12, blur: 24, color: '#00000088' }, rotation: -2 }), A('fade-down', { start: 'afterPrev', duration: 900 })),
        withAnims(lineTicket([['ACCIONES 2027', ''], ['--------------------------', ''], ['1 Patatas junto a cerveza', '+0,25'], ['1 Toallitas con pañales', '+0,15'], ['1 Cesta de comida para hoy', '+0,20'], ['--------------------------', ''], ['TOTAL POR TICKET', '+0,60 €'], ['', ''], ['GRACIAS POR SU ATENCIÓN', '']], 712, 185, 416, { rotation: -2, fontSize: 21 }), A('fade-in', { start: 'withPrev', duration: 900 }))],
        notes: 'Cierre en forma de ticket: tres acciones y su efecto previsto en el ticket medio (estimaciones de ejemplo). El ticket entra solo.' },
    ]));
  } },
};
