// Example presentations: Historia antigua y medieval para el aula. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Ten topics, each with its own look: the Nile at night, a clay tablet, a black-figure
// vase, Roman marble, Andalusian tiles, a castle in the dark, a fjord under the northern lights, a silk map, the jungle
// of the Maya and a printer's page.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// The same object on two slides (Transform): give it a fixed id.
const keep = (b, id) => ({ ...b, id });
// Click-by-click and chained animations, shorter to write.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A stroke through points on the slide (a route, a river, a measure): an ink object, so it can be drawn as you present.
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// Points relative to the first one (for path()).
const rel = pts => pts.map(([x, y]) => [Math.round(x - pts[0][0]), Math.round(y - pts[0][1])]).slice(1);
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A round numbered badge.
const badge = (n, x, y, d, bg, fg = '#ffffff', props = {}) => text(String(n), x, y, d, d, { fontSize: Math.round(d * 0.5), fontWeight: 800, color: fg, bg, radius: d / 2, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], ...props });
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 46, x: 60, y: 40, w: 1160, h: 640, ...props });
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:6px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 80), { fontSize: 24, color: fg, ...props });
// The credits of the 3D models of a deck, in one small line.
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// A small deterministic random (the same drawing every time).
const rnd = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// ---- Drawings ---------------------------------------------------------------------
// Egypt: the three pyramids of Giza on the dunes.
const GIZA = svgURL(1000, 360, '<defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c79a52"/><stop offset="1" stop-color="#6e4a1f"/></linearGradient></defs>'
  + '<polygon points="760,300 862,186 964,300" fill="#cf9a3c"/><polygon points="862,186 964,300 892,300" fill="#8f6224"/>'
  + '<polygon points="470,300 642,104 814,300" fill="#d9a441"/><polygon points="642,104 814,300 700,300" fill="#9c6e2a"/>'
  + '<polygon points="110,300 330,52 550,300" fill="#e7b552"/><polygon points="330,52 550,300 404,300" fill="#a8792f"/>'
  + '<path d="M0 288 Q250 262 500 292 T1000 284 V360 H0Z" fill="url(#d)"/>');
// The Nile valley seen from above: desert, sea, the river and its delta (and, apart, the flood and the green fields).
const NILE_PATH = 'M300 560 C330 470 255 410 290 330 S268 210 280 140';
const NILE_DELTA = 'M280 140 L214 64 M280 140 L280 56 M280 140 L348 66';
const NILE = svgURL(520, 560, '<rect width="520" height="560" rx="22" fill="#e9c98b"/><path d="M0 22 a22 22 0 0 1 22 -22 H498 a22 22 0 0 1 22 22 V58 Q400 72 280 50 T0 64Z" fill="#3d7fb8"/>'
  + [[60, 200], [120, 330], [420, 260], [400, 430], [70, 470], [430, 140]].map(([x, y]) => `<path d="M${x} ${y} q20 -14 40 0 t40 0" stroke="#d2ad6c" stroke-width="5" fill="none"/>`).join('')
  + `<path d="${NILE_PATH}" stroke="#2f6fb0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${NILE_DELTA}" stroke="#2f6fb0" stroke-width="6" fill="none" stroke-linecap="round"/>`
  + '<g font-family="Georgia,serif" fill="#4a3417"><text x="150" y="36" font-size="20" fill="#ffffff" font-style="italic">Mar Mediterráneo</text>'
  + '<circle cx="283" cy="182" r="7"/><text x="330" y="188" font-size="20">Menfis</text><circle cx="276" cy="420" r="7"/><text x="160" y="426" font-size="20">Tebas</text><path d="M290 182 H324 M269 420 H222" stroke="#4a3417" stroke-width="2"/>'
  + '<text x="34" y="300" font-size="18" letter-spacing="4">DESIERTO</text><text x="380" y="350" font-size="18" letter-spacing="4">DESIERTO</text></g>');
const NILE_FLOOD = svgURL(520, 560, `<path d="${NILE_PATH}" stroke="#4c95e0" stroke-width="64" fill="none" stroke-linecap="round" opacity=".75"/><path d="${NILE_DELTA}" stroke="#4c95e0" stroke-width="48" fill="none" stroke-linecap="round" opacity=".75"/>`);
const NILE_GREEN = svgURL(520, 560, `<path d="${NILE_PATH}" stroke="#3e8f47" stroke-width="44" fill="none" stroke-linecap="round" opacity=".85"/><path d="${NILE_DELTA}" stroke="#3e8f47" stroke-width="34" fill="none" stroke-linecap="round" opacity=".85"/>`
  + `<path d="${NILE_PATH}" stroke="#2f6fb0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${NILE_DELTA}" stroke="#2f6fb0" stroke-width="6" fill="none" stroke-linecap="round"/>`);
// Hieroglyphs (one-sound signs), drawn in ink on a 100 × 100 box.
const GLYPH = {
  t: '<path d="M14 72 Q50 18 86 72Z" fill="#2a2014"/>',
  i: '<path d="M50 10 C70 34 66 72 50 92 C34 72 30 34 50 10Z" fill="none" stroke="#2a2014" stroke-width="6"/><path d="M50 22 V90" stroke="#2a2014" stroke-width="4"/>',
  n: '<polyline points="6,50 16,40 26,60 36,40 46,60 56,40 66,60 76,40 86,60 94,50" fill="none" stroke="#2a2014" stroke-width="7" stroke-linejoin="round"/>',
  a: '<path d="M8 60 H64 Q78 60 80 50 L92 44" fill="none" stroke="#2a2014" stroke-width="10" stroke-linecap="round"/><path d="M8 52 V68" stroke="#2a2014" stroke-width="8"/>',
  r: '<ellipse cx="50" cy="52" rx="40" ry="16" fill="#8a2a1a"/><path d="M14 52 H86" stroke="#2a2014" stroke-width="3"/>',
  p: '<rect x="18" y="38" width="64" height="26" fill="#2a2014"/>',
  k: '<path d="M14 44 H86 Q80 76 50 76 Q20 76 14 44Z" fill="#2a2014"/><path d="M78 44 q10 -16 2 -26" stroke="#2a2014" stroke-width="5" fill="none"/>',
  m: '<ellipse cx="50" cy="60" rx="22" ry="30" fill="#2a2014"/><circle cx="50" cy="26" r="14" fill="#2a2014"/><circle cx="45" cy="24" r="4" fill="#e8d5a3"/><path d="M38 90 h-10 M62 90 h10" stroke="#2a2014" stroke-width="5"/>',
};
const glyph = (k, size = 100) => svgURL(size, size, `<g transform="scale(${size / 100})">${GLYPH[k]}</g>`);

// Mesopotamia: lines of cuneiform signs (wedges), drawn at random but always the same.
const wedge = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 L14 -8 L14 8Z" fill="#5c3418"/><path d="M12 0 H28" stroke="#5c3418" stroke-width="3"/></g>`;
const cuneiformLine = (w, seed) => { const r = rnd(seed); let x = 6, out = '';
  while (x < w - 40) { const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) { const rot = [0, 90, 45, 0, 90][Math.floor(r() * 5)]; out += wedge(x + (rot === 90 ? 6 : 0), 14 + j * 6 - (rot === 90 ? 10 : 0), 0.8, rot); x += rot === 90 ? 10 : 6; }
    x += 30 + r() * 16; }
  return svgURL(w, 40, out); };
// Numbers in cuneiform: a vertical wedge is 1, a corner wedge is 10.
const CUNEI_83 = svgURL(520, 160, [[40, 40]].map(([x, y]) => `<g transform="translate(${x} ${y}) rotate(90) scale(2.6)"><path d="M0 0 L10 -6 L10 6Z" fill="#3a2416"/><path d="M8 0 H34" stroke="#3a2416" stroke-width="3.2"/></g>`).join('')
  + [[210, 70], [270, 70]].map(([x, y]) => `<g transform="translate(${x} ${y}) rotate(180) scale(2.6)"><path d="M0 0 L10 -6 L10 6Z" fill="#3a2416"/><path d="M10 -6 L22 -14 M10 6 L22 14" stroke="#3a2416" stroke-width="3"/></g>`).join('')
  + [[330, 40], [370, 40], [410, 40]].map(([x, y]) => `<g transform="translate(${x} ${y}) rotate(90) scale(2.6)"><path d="M0 0 L10 -6 L10 6Z" fill="#3a2416"/><path d="M8 0 H34" stroke="#3a2416" stroke-width="3.2"/></g>`).join(''));
// The plain between the rivers: the Tigris, the Euphrates, the Gulf and four cities.
const TWO_RIVERS = svgURL(640, 470, '<rect width="640" height="470" rx="20" fill="#ead6b4"/>'
  + '<path d="M560 470 L640 380 V450 a20 20 0 0 1 -20 20Z M470 470 Q540 420 640 330 V380 L560 470Z" fill="#4f8fc0"/>'
  + '<path d="M150 20 C190 110 260 160 300 230 S420 330 520 420" stroke="#3d7fb8" stroke-width="8" fill="none" stroke-linecap="round"/>'
  + '<path d="M40 70 C90 170 150 240 210 300 S380 400 520 420" stroke="#3d7fb8" stroke-width="8" fill="none" stroke-linecap="round"/>'
  + '<g font-family="sans-serif" fill="#3a2416"><text x="250" y="150" font-size="20" font-style="italic" fill="#2b5f8c" transform="rotate(48 250 150)">Tigris</text>'
  + '<text x="90" y="228" font-size="20" font-style="italic" fill="#2b5f8c" transform="rotate(44 90 228)">Éufrates</text>'
  + '<text x="520" y="455" font-size="16" fill="#ffffff">Golfo Pérsico</text></g>');
// The stele of the laws: dark basalt with lines of writing.
const STELE = svgURL(300, 560, '<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b2b30"/><stop offset=".5" stop-color="#4a4a52"/><stop offset="1" stop-color="#232327"/></linearGradient></defs>'
  + '<path d="M20 560 V140 Q20 10 150 10 Q280 10 280 140 V560Z" fill="url(#b)"/>'
  + '<circle cx="150" cy="90" r="46" fill="#3c3c44"/><path d="M110 150 Q150 120 190 150" stroke="#6a6a74" stroke-width="5" fill="none"/>'
  + Array.from({ length: 16 }, (_, i) => `<path d="M48 ${200 + i * 22} H${252 - (i % 3) * 18}" stroke="#7a7a86" stroke-width="3" stroke-dasharray="${4 + (i % 4)} ${5 + (i % 3)}"/>`).join(''));

// Greece: the meander band and a black-figure amphora.
const meander = (w, color, bg = '') => { let d = '';
  for (let x = 0; x < w; x += 40) d += `M${x} 34 V6 H${x + 30} V26 H${x + 12} V14 H${x + 22} `;
  return svgURL(w, 40, `<path d="M0 38 H${w} M0 2 H${w}" stroke="${color}" stroke-width="3"/><path d="${d}" stroke="${color}" stroke-width="3.4" fill="none"/>`, bg); };
const AMPHORA = svgURL(300, 420, '<path d="M108 18 H192 V34 H178 C178 60 176 80 182 96 C250 120 282 190 262 270 C246 340 200 370 176 380 L188 404 H112 L124 380 C100 370 54 340 38 270 C18 190 50 120 118 96 C124 80 122 60 122 34 H108Z" fill="#1a1311"/>'
  + '<path d="M124 46 C66 46 58 96 96 114 M176 46 C234 46 242 96 204 114" stroke="#1a1311" stroke-width="12" fill="none"/>'
  + '<path d="M58 168 H242" stroke="#d4703a" stroke-width="4"/><path d="M50 300 H250" stroke="#d4703a" stroke-width="4"/>'
  + Array.from({ length: 9 }, (_, i) => `<path d="M${74 + i * 18} 186 v18" stroke="#d4703a" stroke-width="3"/>`).join('')
  // (a runner, in the band: head, body, arms and legs)
  + '<g fill="#d4703a"><circle cx="150" cy="222" r="11"/><path d="M146 234 L136 268 L118 286 M138 266 L158 292" stroke="#d4703a" stroke-width="7" fill="none" stroke-linecap="round"/>'
  + '<path d="M146 240 L120 252 M148 240 L176 230" stroke="#d4703a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M144 232 L150 262" stroke="#d4703a" stroke-width="9" stroke-linecap="round"/></g>');
// A potsherd (óstrakon) with a name scratched on it.
const OSTRAKON = (pts, name, rot) => svgURL(260, 170, `<polygon points="${pts}" fill="#c9672f" stroke="#7a3a17" stroke-width="3"/>`
  + `<text x="130" y="96" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#2a160c" letter-spacing="2" transform="rotate(${rot} 130 90)">${name}</text>`);
// A Doric column (shaft, capital) for the temple.
const COLUMN = svgURL(90, 240, '<rect x="0" y="0" width="90" height="16" fill="#1a1311"/><path d="M8 16 H82 L74 32 H16Z" fill="#1a1311"/>'
  + '<path d="M18 32 H72 L68 240 H22Z" fill="#1a1311"/>' + [30, 42, 54, 64].map(x => `<path d="M${x} 36 L${x - 1} 236" stroke="#3a2a24" stroke-width="2"/>`).join(''));

// Rome: a triumphal arch in marble.
const ARCH = svgURL(420, 460, '<defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d2c5"/></linearGradient></defs>'
  + '<rect x="20" y="20" width="380" height="90" fill="url(#m)" stroke="#b9ae9c" stroke-width="2"/><rect x="60" y="40" width="300" height="50" fill="#8e1b1b"/>'
  + '<text x="210" y="74" text-anchor="middle" font-family="Georgia,serif" font-size="26" letter-spacing="6" fill="#e9c75a">SPQR · MMXXVI</text>'
  + '<rect x="10" y="110" width="400" height="16" fill="#cfc6b6"/><path d="M30 126 H390 V450 H270 V250 A60 60 0 0 0 150 250 V450 H30Z" fill="url(#m)" stroke="#b9ae9c" stroke-width="2"/>'
  + [44, 114, 290, 360].map(x => `<rect x="${x}" y="140" width="16" height="310" fill="#e6dfd2" stroke="#b9ae9c"/><rect x="${x - 4}" y="134" width="24" height="10" fill="#cfc6b6"/>`).join('')
  + '<path d="M150 250 A60 60 0 0 1 270 250" fill="none" stroke="#c9a227" stroke-width="6"/><rect x="0" y="450" width="420" height="10" fill="#b9ae9c"/>');
// An aqueduct of two tiers of arches over a valley (the cut-outs are the colour of the sky).
const AQUEDUCT = (sky) => svgURL(700, 380, `<rect width="700" height="380" fill="${sky}"/><path d="M0 300 Q180 250 350 330 T700 290 V380 H0Z" fill="#9fb98a"/><path d="M0 340 Q200 300 360 360 T700 340 V380 H0Z" fill="#7f9c6c"/>`
  + '<rect x="20" y="70" width="660" height="22" fill="#c8b48e"/><rect x="20" y="62" width="660" height="10" fill="#4c95e0"/>'
  + '<rect x="20" y="92" width="660" height="110" fill="#d9c59d"/>' + Array.from({ length: 11 }, (_, i) => { const x = 34 + i * 60; return `<path d="M${x} 202 V130 A23 23 0 0 1 ${x + 46} 130 V202Z" fill="${sky}"/>`; }).join('')
  + '<rect x="20" y="202" width="660" height="150" fill="#cdb78d"/>' + Array.from({ length: 6 }, (_, i) => { const x = 40 + i * 110; return `<path d="M${x} 360 V250 A45 45 0 0 1 ${x + 90} 250 V360Z" fill="${sky}"/>`; }).join('')
  + '<path d="M0 352 Q200 330 360 368 T700 350 V380 H0Z" fill="#7f9c6c"/>');
// A milestone.
const MILESTONE = svgURL(160, 260, '<rect x="20" y="240" width="120" height="20" fill="#8a7f72"/><path d="M34 240 V40 Q80 0 126 40 V240Z" fill="#e6dfd2" stroke="#b9ae9c" stroke-width="3"/>'
  + '<text x="80" y="110" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#8e1b1b">M·P</text><text x="80" y="160" text-anchor="middle" font-family="Georgia,serif" font-size="36" fill="#2b2523">XII</text>');

// Al-Andalus: a horseshoe arch with red and cream voussoirs inside its frame (alfiz).
const HORSESHOE = (() => { const cx = 260, cy = 300, r1 = 170, r2 = 250, a0 = -205, a1 = 25, n = 17; let v = '';
  for (let i = 0; i < n; i++) { const t0 = (a0 + (a1 - a0) * i / n) * Math.PI / 180, t1 = (a0 + (a1 - a0) * (i + 1) / n) * Math.PI / 180;
    const P = (r, t) => `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`;
    v += `<path d="M${P(r1, t0)} L${P(r2, t0)} A${r2} ${r2} 0 0 1 ${P(r2, t1)} L${P(r1, t1)} A${r1} ${r1} 0 0 0 ${P(r1, t0)}Z" fill="${i % 2 ? '#f5ead6' : '#b5452b'}" stroke="#7a2a18" stroke-width="2"/>`; }
  return svgURL(520, 640, '<defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123c44"/><stop offset="1" stop-color="#2a9d8f"/></linearGradient></defs>'
    + '<rect x="0" y="0" width="520" height="640" fill="#e8d8b8"/><rect x="10" y="10" width="500" height="620" fill="none" stroke="#d9a441" stroke-width="6"/>'
    + `<path d="M${cx - r1 * Math.cos(25 * Math.PI / 180)} ${cy + r1 * Math.sin(25 * Math.PI / 180)} A${r1} ${r1} 0 1 1 ${cx + r1 * Math.cos(25 * Math.PI / 180)} ${cy + r1 * Math.sin(25 * Math.PI / 180)} V640 H${cx - r1 * Math.cos(25 * Math.PI / 180)}Z" fill="url(#n)"/>`
    + v + '<rect x="0" y="600" width="520" height="40" fill="#cdb98f"/>'
    + [[200, 220], [300, 260], [250, 340], [330, 180]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#ffffff"/>`).join(''));
})();
// An astrolabe: the plate with its scale, and (apart) the turning star map (rete).
const ASTRO_PLATE = svgURL(400, 440, '<circle cx="200" cy="40" r="24" fill="none" stroke="#d9a441" stroke-width="10"/><circle cx="200" cy="240" r="190" fill="#c58f2e"/><circle cx="200" cy="240" r="172" fill="#1a3d45" stroke="#f0cf7a" stroke-width="4"/>'
  + Array.from({ length: 72 }, (_, i) => { const t = i * 5 * Math.PI / 180, r0 = i % 6 ? 178 : 168; return `<path d="M${(200 + r0 * Math.cos(t)).toFixed(1)} ${(240 + r0 * Math.sin(t)).toFixed(1)} L${(200 + 188 * Math.cos(t)).toFixed(1)} ${(240 + 188 * Math.sin(t)).toFixed(1)}" stroke="#2a1a08" stroke-width="2"/>`; }).join('')
  + [60, 100, 140].map(r => `<circle cx="200" cy="${240 + r * 0.25}" r="${r}" fill="none" stroke="#5fb3a6" stroke-width="1.5"/>`).join('') + '<path d="M28 240 H372 M200 68 V412" stroke="#5fb3a6" stroke-width="1.5"/>');
const ASTRO_RETE = svgURL(400, 400, '<g fill="none" stroke="#f0cf7a" stroke-width="5"><circle cx="200" cy="200" r="150"/><circle cx="230" cy="180" r="95"/></g>'
  + [[0, 150], [60, 120], [130, 160], [200, 110], [260, 140], [320, 125]].map(([a, r]) => { const t = a * Math.PI / 180;
    return `<path d="M200 200 L${(200 + r * Math.cos(t)).toFixed(1)} ${(200 + r * Math.sin(t)).toFixed(1)}" stroke="#f0cf7a" stroke-width="4"/><path d="M${(200 + r * Math.cos(t)).toFixed(1)} ${(200 + r * Math.sin(t)).toFixed(1)} l-12 -6 l14 -8Z" fill="#f0cf7a"/>`; }).join('')
  + '<circle cx="200" cy="200" r="10" fill="#f0cf7a"/>');

// Castles: a castle in the dark (silhouette with lit windows) and in daylight (its parts).
const CASTLE_NIGHT = svgURL(1280, 300, '<g fill="#1c2027">' + '<rect x="120" y="120" width="1040" height="180"/>'
  + [[80, 60, 120, 240], [380, 20, 110, 280], [560, 0, 160, 300], [790, 20, 110, 280], [1080, 60, 120, 240]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`
    + Array.from({ length: Math.floor(w / 24) }, (_, i) => i % 2 ? '' : `<rect x="${x + i * 24}" y="${y - 18}" width="24" height="18"/>`).join('')).join('')
  + Array.from({ length: 43 }, (_, i) => i % 2 ? '' : `<rect x="${120 + i * 24}" y="104" width="24" height="16"/>`).join('') + '</g>'
  + [[120, 120], [425, 90], [610, 70], [670, 70], [835, 90], [1130, 120], [300, 190], [980, 190], [640, 180]].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="30" rx="8" fill="#e0b13a"/>`).join('')
  + '<path d="M600 300 V240 A40 40 0 0 1 680 240 V300Z" fill="#0b0d10"/>');
const CASTLE_DAY = svgURL(760, 480, '<rect width="760" height="480" rx="20" fill="#cfe3f2"/><circle cx="660" cy="70" r="36" fill="#ffd166"/>'
  + '<rect x="0" y="390" width="760" height="90" fill="#6aa84f"/><path d="M0 400 H760 V430 H0Z" fill="#3d7fb8"/>'
  + '<g fill="#9aa0aa" stroke="#5a5f6b" stroke-width="2">'
  + '<rect x="120" y="200" width="520" height="200"/>' + Array.from({ length: 13 }, (_, i) => `<rect x="${120 + i * 40}" y="180" width="22" height="22"/>`).join('')
  + '<rect x="80" y="150" width="90" height="250"/><rect x="590" y="150" width="90" height="250"/>' + [80, 590].map(x => [0, 1, 2].map(i => `<rect x="${x + i * 34}" y="128" width="22" height="22"/>`).join('')).join('')
  + '<rect x="300" y="60" width="160" height="140"/>' + [0, 1, 2, 3].map(i => `<rect x="${300 + i * 46}" y="38" width="22" height="22"/>`).join('') + '</g>'
  + '<path d="M380 60 V10" stroke="#5a5f6b" stroke-width="3"/><path d="M382 12 H420 L410 22 L420 32 H382Z" fill="#b3202a"/>'
  + '<path d="M345 400 V320 A35 35 0 0 1 415 320 V400Z" fill="#3a2a1a"/><path d="M345 400 L415 400 L470 440 L300 440Z" fill="#8b5a2b"/><path d="M345 330 L300 440 M415 330 L470 440" stroke="#3a3a3a" stroke-width="3"/>'
  + [[110, 220], [620, 220], [360, 110], [400, 110]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="28" rx="6" fill="#2c2c2c"/>`).join(''));
// A level of the feudal pyramid: a trapezoid from top width a to bottom width b.
const level = (w, h, a, b, c1, c2) => svgURL(w, h, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
  + `<polygon points="${(w - a) / 2},2 ${(w + a) / 2},2 ${(w + b) / 2},${h - 2} ${(w - b) / 2},${h - 2}" fill="url(#g)" stroke="#101317" stroke-width="3"/>`);
// A shield with its arms (tinctures and a charge).
const SHIELD = inner => svgURL(200, 240, `<defs><clipPath id="s"><path d="M10 10 H190 V110 Q190 200 100 232 Q10 200 10 110Z"/></clipPath></defs><g clip-path="url(#s)">${inner}</g>`
  + '<path d="M10 10 H190 V110 Q190 200 100 232 Q10 200 10 110Z" fill="none" stroke="#e0b13a" stroke-width="7"/>');

// Vikings: a longship (striped sail, shields, dragon head), the North Atlantic and the runes.
const LONGSHIP = svgURL(420, 260, '<path d="M200 30 V190" stroke="#5a3a1a" stroke-width="7"/>'
  + '<path d="M120 40 H290 L300 170 H110Z" fill="#f2efe6"/>' + [0, 1, 2].map(i => `<path d="M${145 + i * 50} 40 H${170 + i * 50} L${173 + i * 52} 170 H${148 + i * 48}Z" fill="#c8423b"/>`).join('')
  + '<path d="M20 170 Q60 236 210 236 Q360 236 400 170 Z" fill="#8b5a2b"/><path d="M30 186 Q210 214 392 186" stroke="#5a3a1a" stroke-width="3" fill="none"/>'
  + '<path d="M392 176 Q414 120 396 90 Q420 82 416 104 Q426 92 410 76" stroke="#8b5a2b" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M28 176 Q8 130 26 104" stroke="#8b5a2b" stroke-width="10" fill="none" stroke-linecap="round"/>'
  + Array.from({ length: 8 }, (_, i) => `<circle cx="${80 + i * 38}" cy="180" r="14" fill="${['#e0b13a', '#2b4f9e', '#c8423b', '#f2efe6'][i % 4]}" stroke="#3a2412" stroke-width="3"/>`).join(''));
const NORTH = svgURL(1100, 460, '<rect width="1100" height="460" rx="20" fill="#13294b"/>'
  + '<g fill="#3d5a4a" stroke="#6f8f7a" stroke-width="2">'
  + '<path d="M880 60 Q960 40 1040 80 L1060 200 Q1020 300 960 330 Q930 280 900 300 Q860 250 880 200 Q850 140 880 60Z"/>'   // Scandinavia
  + '<path d="M760 250 Q790 230 800 270 Q820 320 790 380 Q760 400 740 360 Q730 300 760 250Z"/><path d="M710 290 Q735 280 730 320 Q712 340 700 315Z"/>'   // Britain, Ireland
  + '<path d="M560 110 Q620 90 660 120 Q650 160 600 165 Q550 150 560 110Z"/>'   // Iceland
  + '<path d="M300 30 Q420 10 470 60 Q450 160 400 220 Q340 230 320 160 Q290 90 300 30Z"/>'   // Greenland
  + '<path d="M60 280 Q120 250 170 290 Q160 350 110 370 Q60 350 60 280Z"/></g>'   // Newfoundland
  + '<g font-family="sans-serif" font-size="17" fill="#dbe9f5"><text x="930" y="150">Noruega</text><text x="575" y="190">Islandia</text><text x="330" y="250">Groenlandia</text><text x="60" y="400">Terranova (Vinland)</text><text x="745" y="420">Britania</text></g>');
const RUNE = { f: 'M30 10 V90 M30 30 L66 12 M30 52 L66 34', u: 'M30 90 V10 L66 40 V90', th: 'M34 10 V90 M34 32 L62 50 L34 68', a: 'M50 10 V90 M50 30 L22 50 M50 30 L78 50', r: 'M30 90 V10 L62 30 L30 50 L62 90', k: 'M50 10 V90 M50 30 L76 12 M50 30 L24 12', h: 'M50 10 V90 M28 40 L72 60 M72 40 L28 60', n: 'M50 10 V90 M30 44 L70 60', i: 'M50 10 V90', s: 'M30 10 V50 L70 50 V90', t: 'M50 10 V90 M50 10 L26 34 M50 10 L74 34', b: 'M34 10 V90 M34 10 L62 30 L34 50 L62 70 L34 90', m: 'M50 10 V90 M50 26 L26 46 M50 26 L74 46 M26 46 L26 46', l: 'M40 90 V10 L66 34', y: 'M50 10 V90 M50 70 L26 90 M50 70 L74 90' };
const runes = (keys, color, s = 60) => svgURL(keys.length * s, s * 1.2, keys.map((k, i) => `<path transform="translate(${i * s} 4) scale(${s / 100})" d="${RUNE[k]}" stroke="${color}" stroke-width="${800 / s}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join(''));

// The Silk Road: a parchment map from Chang'an to Constantinople, with the desert and the mountains.
const SILK_CITIES = [['Chang’an', 1010, 250], ['Dunhuang', 840, 205], ['Kashgar', 650, 215], ['Samarcanda', 540, 240], ['Merv', 440, 262], ['Bagdad', 300, 300], ['Constantinopla', 110, 185]];
const SILK_MAP = svgURL(1100, 420, '<rect width="1100" height="420" rx="18" fill="#efdcb5"/>'
  + '<path d="M0 60 Q60 120 40 200 Q90 240 170 230 Q200 150 250 140 Q200 90 180 40 Q90 10 0 30Z" fill="#a9c4c8" opacity=".8"/>'   // Black Sea & Mediterranean (rough)
  + '<path d="M0 260 Q120 250 200 300 Q170 360 60 380 Q20 330 0 330Z" fill="#a9c4c8" opacity=".8"/>'
  + '<ellipse cx="760" cy="250" rx="90" ry="34" fill="#e6c58a"/><text x="700" y="256" font-family="Georgia,serif" font-size="15" fill="#8a6a3a" font-style="italic">Taklamakán</text>'
  + [[590, 160], [620, 150], [650, 165], [600, 290], [630, 300], [660, 285], [880, 140], [910, 130], [940, 145]].map(([x, y]) => `<path d="M${x - 22} ${y + 16} L${x} ${y - 14} L${x + 22} ${y + 16}Z" fill="#a08566"/><path d="M${x - 6} ${y - 6} L${x} ${y - 14} L${x + 6} ${y - 6}Z" fill="#fff"/>`).join('')
  + '<path d="M300 380 Q500 360 700 390" stroke="#a9c4c8" stroke-width="4" fill="none" opacity=".7"/>'
  + '<rect x="6" y="6" width="1088" height="408" rx="14" fill="none" stroke="#b58a4a" stroke-width="3" stroke-dasharray="10 6"/>');
const CAMELS = svgURL(420, 120, Array.from({ length: 3 }, (_, i) => `<g transform="translate(${i * 130} 0)" fill="#2a1a3a">`
  + '<path d="M10 70 Q20 40 40 46 Q50 20 66 44 Q76 26 88 42 Q96 52 100 46 L112 30 Q120 26 118 36 L106 64 Q100 74 90 74 Z"/>'
  + '<path d="M22 72 V112 M34 72 V112 M80 72 V112 M92 72 V112" stroke="#2a1a3a" stroke-width="7"/></g>').join(''));

// The Maya: a stepped pyramid in the jungle, a shell for zero.
const MAYA_PYR = svgURL(600, 420, '<g stroke="#6f6a55" stroke-width="2">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect x="${40 + i * 26}" y="${380 - i * 36}" width="${520 - i * 52}" height="36" fill="${i % 2 ? '#bdb59a' : '#cfc7ab'}"/>`).join('')
  + '<rect x="250" y="20" width="100" height="56" fill="#cfc7ab"/><rect x="284" y="40" width="32" height="36" fill="#3a3326"/></g>'
  + '<path d="M270 416 L280 76 H320 L330 416Z" fill="#a39b80" stroke="#6f6a55" stroke-width="2"/>' + Array.from({ length: 18 }, (_, i) => `<path d="M${270 + i * 0.6} ${400 - i * 18} H${330 - i * 0.6}" stroke="#6f6a55" stroke-width="2"/>`).join('')
  + '<circle cx="274" cy="404" r="12" fill="#3fbf8f"/><circle cx="326" cy="404" r="12" fill="#3fbf8f"/>');
const SHELL = svgURL(120, 80, '<path d="M10 50 Q20 10 60 12 Q100 10 110 50 Q90 72 60 72 Q30 72 10 50Z" fill="#f4ecd8" stroke="#3a3326" stroke-width="4"/><path d="M30 46 Q60 30 92 46 M36 58 Q60 46 86 58" stroke="#3a3326" stroke-width="3" fill="none"/>');
// A big gear (a calendar wheel), with n teeth.
const GEAR = (n, color, label) => svgURL(400, 400, `<g fill="${color}">` + Array.from({ length: n }, (_, i) => `<rect x="190" y="6" width="20" height="34" rx="4" transform="rotate(${i * 360 / n} 200 200)"/>`).join('')
  + '<circle cx="200" cy="200" r="168"/></g><circle cx="200" cy="200" r="124" fill="none" stroke="#ffffff55" stroke-width="3"/>'
  + Array.from({ length: 20 }, (_, i) => `<circle cx="${200 + 146 * Math.cos(i * Math.PI / 10)}" cy="${200 + 146 * Math.sin(i * Math.PI / 10)}" r="6" fill="#ffffffaa"/>`).join('')
  + `<text x="200" y="214" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="#ffffff">${label}</text>`);

// The printing press: frame, screw and platen (the platen moves apart).
const PRESS = svgURL(420, 520, '<g fill="#6b4a2b" stroke="#3a2614" stroke-width="3"><rect x="40" y="20" width="40" height="480"/><rect x="340" y="20" width="40" height="480"/><rect x="20" y="10" width="380" height="40"/><rect x="20" y="170" width="380" height="30"/><rect x="20" y="380" width="380" height="40"/></g>'
  + '<rect x="196" y="50" width="28" height="140" fill="#9a9a9a" stroke="#4a4a4a" stroke-width="2"/>' + Array.from({ length: 8 }, (_, i) => `<path d="M196 ${60 + i * 16} L224 ${70 + i * 16}" stroke="#4a4a4a" stroke-width="3"/>`).join('')
  + '<path d="M120 140 H300" stroke="#3a2614" stroke-width="10" stroke-linecap="round"/><rect x="90" y="350" width="240" height="30" fill="#2b2b2b"/><rect x="100" y="340" width="220" height="10" fill="#f3ecdf"/>');
const PLATEN = svgURL(260, 60, '<rect x="0" y="0" width="260" height="60" rx="6" fill="#8a6a45" stroke="#3a2614" stroke-width="3"/><rect x="117" y="-20" width="26" height="30" fill="#9a9a9a"/>');

// ---- The ten presentations ------------------------------------------------------
export default {

  // 1 · Egypt: the Nile at night in lapis and gold. The sun rises behind the pyramids, the river floods and
  // leaves the fields green, an area chart of the year, a formula for the pyramid and a Transform into it,
  // a cartouche that writes itself on papyrus, putting the mummy's steps in order, a quiz and a countdown.
  edu_hist_egypt: { name: 'Egipto, el regalo del Nilo', cat: 'edu', summary: 'Lapislázuli y oro: sol que sale tras las pirámides, crecida animada, gráfico de áreas, ecuación, Transformar, cartucho jeroglífico y ordenar', make: () => {
    const BG = '#0b1430', GOLD = '#e2b04a', CREAM = '#f6ecd6', LAPIS = '#2c4fa3', TURQ = '#3fb6a8', PAPYRUS = '#e8d5a3', INK = '#2a2014';
    const H = pairStacks('editorial').heading, pyr = uid(), ttl = uid();
    const stars = rnd(7), sky = Array.from({ length: 34 }, () => { const d = 2 + Math.round(stars() * 4); return shape('ellipse', Math.round(stars() * 1260), Math.round(stars() * 330), d, d, '#ffffff', { opacity: 40 + Math.round(stars() * 50) }); });
    const night = [shape('rect', 0, 0, 1280, 720, '#0b1430', { fill2: '#23366e', gradAngle: 180 })];
    return numbered(build({ name: 'Egipto, el regalo del Nilo', palette: 'warm', fonts: 'editorial', title: { size: 50, color: GOLD },
      decor: () => [shape('rect', 0, 712, 1280, 8, GOLD, { fill2: TURQ, gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [...night, ...sky,
        glow(470, 300, 520, '#f3a712', BG, 35),
        withAnims(shape('ellipse', 640, 560, 150, 150, '#ffd166', { fill2: '#f08a24', gradType: 'radial' }), path([[0, -170], [0, -300]], { start: 'afterPrev', duration: 3500 })),
        img(GIZA, 280, 380, 1000, 360, 'Las tres pirámides de Guiza sobre las dunas'),
        kicker('HISTORIA ANTIGUA · 1.º ESO', 90, 110, 600, TURQ),
        text('EGIPTO', 84, 140, 760, 180, { fontFamily: H, fontSize: 140, wordart: 'gold', letterSpacing: 6 }),
        text('El regalo del Nilo', 90, 315, 640, 60, { fontFamily: H, fontSize: 40, fontStyle: 'italic', color: CREAM }),
        text('Tres mil años de faraones, escribas y pirámides', 90, 380, 520, 80, { fontSize: 24, color: '#c9cfe6' })],
        notes: 'Al llegar, el sol sale despacio por detrás de las pirámides (trayectoria que arranca sola). Pregunta de arranque: ¿por qué una civilización tan grande nace en medio de un desierto?' },
      { title: 'Una cinta verde en el desierto', layout: 'titleOnly', bg: BG, extra: [
        img(NILE, 90, 170, 470, 506, 'Mapa del valle del Nilo con Menfis, Tebas y el delta'),
        on(img(NILE_FLOOD, 90, 170, 470, 506, 'La crecida cubre las orillas'), 'fade-in-then-out', { duration: 2600, sound: 'whoosh' }),
        after(img(NILE_GREEN, 90, 170, 470, 506, 'Los campos quedan verdes junto al río'), 'fade-in', { duration: 900 }),
        ...[['Akhet · la inundación', 'De julio a octubre el río se desborda y cubre los campos.', LAPIS], ['Peret · la siembra', 'El agua se retira y deja un limo negro y fértil: se siembra trigo y cebada.', '#2f7d3a'], ['Shemu · la cosecha', 'De marzo a junio se recoge y se guarda el grano en los graneros.', '#b5841f']]
          .map(([h, d, c], i) => on(card(`<div style="font-family:${H};font-size:28px;color:#ffffff;margin-bottom:6px">${h}</div><div>${d}</div>`, 620, 180 + i * 162, 570, 146, c,
            { fontSize: 23, color: '#f4f1ea', pad: [16, 24, 16, 24], radius: 14, vAlign: 'middle' }), 'fade-left'))],
        notes: 'Primer clic: llega la crecida (con sonido), se retira sola y deja los campos verdes. Después, un clic por estación. Los egipcios llamaban a su tierra Kemet, «la tierra negra», por ese limo.' },
      { title: 'El río sube y baja', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 170, w: 760, h: 480, chartType: 'area', color: '#4c95e0', grid: true, yTitle: 'metros sobre el nivel más bajo',
          data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => ({ label: m, value: [2, 1.5, 1, 0.6, 0.4, 0.8, 2.5, 5.5, 7.5, 6.5, 4.5, 3][i] })) }),
        on(stat('≈ 7 m', 'sube el río en la crecida de septiembre', 890, 200, 310, GOLD, CREAM, 80), 'zoom-in', { sound: 'pop' }),
        on(card(`<b style="color:${GOLD}">El nilómetro</b><br>Una escalera de piedra junto al río medía la crecida: según la altura, se calculaban los impuestos del año.`, 880, 420, 320, 230, '#ffffff12',
          { fontSize: 21, color: CREAM, pad: [18, 20, 18, 20] }), 'fade-up')],
        notes: 'Datos aproximados (crecida media antes de la presa de Asuán). Pregunta: ¿por qué un año con poca crecida era un año de hambre? ¿Y uno con demasiada?' },
      { title: 'La Gran Pirámide en números', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        keep(shape('triangle', 90, 220, 520, 330, GOLD, { fill2: '#9c6e2a', gradAngle: 90 }), pyr),
        ink([[90, 580], [610, 580]], TURQ, 3), ink([[350, 220], [350, 550]], TURQ, 3, { dash: 'dash' }),
        text('230 m de lado', 250, 590, 200, 36, { fontSize: 22, color: TURQ, textAlign: 'center' }),
        text('146 m', 362, 380, 110, 36, { fontSize: 22, color: '#10203f', fontWeight: 700 }),
        mathBlock({ x: 670, y: 180, w: 520, h: 90, fontSize: 50, latex: 'V = \\tfrac{1}{3}\\, b^{2}\\, h', color: CREAM }),
        on(mathBlock({ x: 650, y: 290, w: 560, h: 90, fontSize: 30, latex: 'V = \\tfrac{1}{3}\\cdot 230^{2}\\cdot 146 \\approx 2{,}57\\ \\text{millones de m}^{3}', color: GOLD }), 'fade-in'),
        on(stat('2,3 millones', 'de bloques de piedra, de unas 2,5 toneladas cada uno', 680, 410, 500, GOLD, CREAM, 60), 'fade-up', { sound: 'drumroll' })],
        notes: 'La fórmula del volumen de la pirámide (un tercio del prisma). Medidas originales aproximadas: hoy mide unos 139 m porque perdió la punta y el revestimiento. Siguiente diapositiva: entramos dentro (Transformar).' },
      { title: '¿Qué hay dentro?', layout: 'titleOnly', bg: BG, autoAnimate: true, transition: 'zoom', extra: [
        keep(shape('triangle', 90, 190, 600, 420, GOLD, { fill2: '#9c6e2a', gradAngle: 90 }), pyr),
        shape('rect', 60, 610, 660, 70, '#6e4a1f', { opacity: 85 }),
        ink([[300, 470], [400, 640]], INK, 6), ink([[352, 556], [422, 420]], INK, 10), ink([[352, 556], [380, 484]], INK, 4),
        shape('rect', 410, 398, 64, 30, '#2a2014'), shape('rect', 362, 470, 48, 26, '#2a2014'), shape('rect', 392, 628, 64, 26, '#2a2014'),
        ...[[1, 482, 380, 'Cámara del Rey', 'El sarcófago de granito del faraón.'], [2, 300, 462, 'Cámara de la Reina', 'Su nombre es un error: no era de ninguna reina.'], [3, 440, 470, 'Gran Galería', 'Un pasillo de 47 m de largo y 8,6 m de alto.'], [4, 470, 630, 'Cámara subterránea', 'Excavada en la roca, quedó sin terminar.']]
          .flatMap(([n, bx, by, h, d], i) => [on(badge(n, bx, by, 40, '#c1272d'), 'zoom-in', { sound: 'pop' }),
            along(text(`<div style="display:flex;gap:14px;align-items:center"><span style="flex:0 0 40px;height:40px;border-radius:20px;background:#c1272d;color:#fff;font-weight:800;text-align:center;line-height:40px">${n}</span><span><b style="color:${GOLD}">${h}</b><br><span style="font-size:20px">${d}</span></span></div>`,
              740, 190 + i * 112, 460, 100, { fontSize: 25, color: CREAM, vAlign: 'middle' }), 'fade-left')])],
        notes: 'La pirámide «se abre» con Transformar: es la misma forma, más grande. Un clic por cámara. Medidas de la Gran Galería aproximadas.' },
      { layout: 'blank', bg: PAPYRUS, transition: 'page', extra: [
        shape('rect', 0, 0, 1280, 720, PAPYRUS, { fill2: '#d9bf82', gradType: 'radial', opacity: 100 }),
        ...[90, 230, 370, 510, 650].map(y => shape('rect', 0, y, 1280, 2, '#c7a865', { opacity: 50 })),
        shape('rounded', 120, 70, 200, 540, 'none', { stroke: '#b5841f', strokeWidth: 8, radius: 100 }), shape('rect', 120, 620, 200, 12, '#b5841f'),
        ...['t', 'i', 'n', 'a'].map((k, i) => (i ? after : on)(img(glyph(k), 160, 110 + i * 122, 120, 110, 'Jeroglífico'), 'zoom-in', { sound: 'click', duration: 450, delay: i ? 150 : 0 })),
        text('Escribe como un escriba', 400, 70, 800, 70, { fontFamily: H, fontSize: 46, color: INK, fontWeight: 700 }),
        text('Algunos jeroglíficos valen <b>un sonido</b>. Este cartucho dice <b>TINA</b>: el nombre se rodeaba con una cuerda ovalada para protegerlo.', 400, 145, 790, 100, { fontSize: 24, color: INK }),
        ...[['t', 'T', 'pan'], ['i', 'I', 'junco'], ['n', 'N', 'agua'], ['a', 'A', 'brazo'], ['r', 'R', 'boca'], ['p', 'P', 'taburete'], ['k', 'K', 'cesta'], ['m', 'M', 'búho']].flatMap(([k, s, w], i) => {
          const x = 400 + (i % 4) * 200, y = 290 + Math.floor(i / 4) * 170;
          return [shape('rounded', x, y, 180, 150, '#f4e8c6', { stroke: '#c7a865', strokeWidth: 2 }), img(glyph(k), x + 10, y + 12, 80, 80, 'Jeroglífico ' + w),
            text(`<b style="font-size:40px">${s}</b><br>${w}`, x + 96, y + 26, 80, 110, { fontSize: 18, color: INK })]; })],
        notes: 'Un clic y el cartucho se escribe solo, signo a signo, de arriba abajo. Valores simplificados para el aula: los egipcios no escribían las vocales, así que leerían algo como «TN».' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', question: 'Ordena los pasos de la momificación', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: ['Lavar el cuerpo con vino de palma', 'Sacar los órganos y guardarlos en vasos canopos', 'Cubrir el cuerpo con natrón durante 40 días', 'Rellenarlo y untarlo con aceites y resinas', 'Vendarlo con lino y colocar amuletos', 'Ponerle la máscara y meterlo en el sarcófago'] })],
        notes: 'Actividad «Ordenar» con nota desde el móvil. Todo el proceso duraba unos 70 días. Curiosidad: el corazón se dejaba dentro, porque se pesaría en el juicio de Osiris.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿En qué época del año crecía el Nilo?', ['En pleno invierno', 'En primavera', 'A finales del verano', 'Nunca crecía'], 2)],
        notes: 'Cuestionario con tiempo: más puntos cuanto antes se acierta. La crecida venía de las lluvias del monzón en las montañas de Etiopía.' },
      { layout: 'blank', bg: BG, transition: 'convex', extra: [...night, glow(780, 140, 520, GOLD, BG, 30),
        text('Reto final', 90, 150, 640, 110, { fontFamily: H, fontSize: 80, wordart: 'gold' }),
        text(ul('Escribe tu nombre con los signos de la tabla', 'Rodéalo con un cartucho', 'Cambia tu cartucho con el de un compañero y descífralo'), 90, 290, 640, 280, { fontSize: 30, color: CREAM }),
        timer(240, 860, 180, 300, { color: GOLD, endText: '¡Tiempo!' })],
        notes: 'Cuenta atrás de 4 minutos: empieza sola al llegar y suena al terminar. Si faltan signos para su nombre, que usen el más parecido.' },
    ]));
  } },

  // 2 · Mesopotamia: a clay tablet that writes itself, the land between two rivers drawn by hand,
  // a ziggurat that rises tier by tier, base 60 with a table that adds itself up, the stele of laws,
  // fill-in-the-gaps, a radial diagram and a multiple-choice poll.
  edu_hist_mesopotamia: { name: 'Mesopotamia: nace la escritura', cat: 'edu', summary: 'Tablilla de arcilla que se escribe sola, mapa con ríos que se dibujan, zigurat que crece, base 60 con fórmulas, completar huecos y radial', make: () => {
    const BG = '#2d1b10', CLAY = '#c98a55', DARK = '#3a2416', BURNT = '#9c4a1c', LAPIS = '#2f5d9a', CREAM = '#f3e6d2', SAND = '#f1e3cc';
    const H = pairStacks('tech').heading;
    return numbered(build({ name: 'Mesopotamia: nace la escritura', palette: 'paper', fonts: 'tech', title: { size: 50, color: BURNT }, body: { color: DARK },
      decor: () => [shape('rect', 0, 0, 1280, 8, BURNT), shape('rect', 0, 8, 1280, 4, LAPIS)] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [glow(560, 0, 760, '#8a4b24', BG, 45),
        shape('rounded', 690, 110, 470, 520, CLAY, { fill2: '#94582c', gradType: 'radial', rotation: 4, radius: 40, shadow: { x: 10, y: 16, blur: 30, color: '#00000088' } }),
        ...Array.from({ length: 9 }, (_, i) => (i ? after : on)(img(cuneiformLine(400, 11 + i * 7), 725 + i * 4, 160 + i * 50, 400, 40, 'Línea de escritura cuneiforme', { rotation: 4 }), 'fade-right', { sound: 'click', duration: 350, start: 'afterPrev' })),
        kicker('HACE 5.000 AÑOS · ENTRE DOS RÍOS', 90, 200, 560, '#e8a56d'),
        text('MESO<br>POTAMIA', 84, 236, 580, 230, { fontFamily: H, fontSize: 100, fontWeight: 700, lineHeight: 1, color: CREAM, letterSpacing: 4 }),
        text('Donde la humanidad aprendió a escribir', 90, 476, 540, 90, { fontSize: 30, color: '#e8c9a8' })],
        notes: 'La tablilla se escribe sola, línea a línea y con sonido de punzón, al llegar a la portada. La escritura cuneiforme se hacía apretando una caña sobre el barro blando: de ahí sus «cuñas».' },
      { title: 'La tierra entre dos ríos', layout: 'titleOnly', bg: SAND, extra: [
        img(TWO_RIVERS, 90, 175, 640, 470, 'Mapa del Tigris y el Éufrates hasta el golfo Pérsico'),
        { ...ink([[120, 300], [210, 230], [330, 205], [470, 215], [590, 280], [660, 380]], '#3e8f47', 14, { opacity: 70 }), animation: A('draw', { duration: 2200 }) },
        ...[['Nínive', 296, 282], ['Babilonia', 300, 470], ['Uruk', 470, 566], ['Ur', 560, 590]].flatMap(([c, x, y], i) => [after(shape('ellipse', x - 9, y - 9, 18, 18, BURNT, { stroke: '#ffffff', strokeWidth: 3 }), 'zoom-in', { sound: 'pop', duration: 300 }),
          along(text(c, c === 'Ur' ? x - 70 : x + 14, y - 18, c === 'Ur' ? 56 : 160, 36, { fontSize: 22, fontWeight: 700, color: DARK, textAlign: c === 'Ur' ? 'right' : 'left' }), 'fade-in')]),
        text('<b style="color:#3e8f47">La Media Luna Fértil</b><br>En griego, <i>Mesopotamia</i> significa «tierra entre ríos». Sus crecidas regaban campos en un clima seco.', 770, 190, 420, 200, { fontSize: 25, color: DARK }),
        on(card('Sin piedra ni madera, todo se construía con <b>barro</b>: casas, murallas, templos… ¡y libros!', 770, 430, 420, 170, '#ffffff', { fontSize: 24, color: DARK, borderColor: CLAY, radius: 10 }), 'fade-up')],
        notes: 'Primer clic: se dibuja la Media Luna Fértil y aparecen las ciudades una tras otra. Ur y Uruk están entre las primeras ciudades del mundo.' },
      { layout: 'blank', bg: '#1f2440', transition: 'rise', extra: [glow(150, -200, 700, '#e8a56d', '#1f2440', 35),
        text('El zigurat: una montaña de ladrillo', 90, 60, 1100, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: '#f4c48a' }),
        shape('rect', 0, 600, 1280, 120, '#8a5a32'),
        ...[[120, 520, 620, 80, '#b57442'], [190, 440, 480, 80, '#c4844f'], [260, 370, 340, 70, '#d2955e'], [330, 310, 200, 60, '#e0a86f']].map(([x, y, w, h, c], i) =>
          (i ? after : on)(shape('rect', x, y + 0, w, h, c, { stroke: '#6e4422', strokeWidth: 2 }), 'fade-up', { duration: 500, sound: 'click' })),
        after(shape('rect', 410, 310, 40, 290, '#ecc08c', { stroke: '#6e4422', strokeWidth: 2 }), 'fade-in'),
        after(shape('rect', 370, 260, 120, 50, LAPIS, { stroke: '#f4c48a', strokeWidth: 3 }), 'zoom-in', { sound: 'chime' }),
        ...[['Templo en la cima', 'Solo los sacerdotes subían a la «casa del dios».'], ['Ladrillos de barro', 'Cocidos por fuera y unidos con betún.'], ['Unos 30 metros', 'Así de alto era el zigurat de Ur: como un edificio de diez plantas.']]
          .map(([h, d], i) => on(text(`<b style="color:#f4c48a;font-size:30px">${h}</b><br>${d}`, 820, 200 + i * 130, 380, 120, { fontSize: 23, color: CREAM }), 'fade-left'))],
        notes: 'Primer clic: el zigurat se levanta piso a piso, con la escalera y el templo arriba (todo encadenado). Luego un clic por dato. Altura del de Ur aproximada.' },
      { title: 'De las fichas a las letras', layout: 'titleOnly', bg: SAND, extra: [
        dg('chevrons', 'Fichas\n  ≈ 8000 a. C.\nPictogramas\n  ≈ 3300 a. C.\nCuneiforme\n  ≈ 3000 a. C.\nAlfabeto\n  ≈ 1200 a. C.', 90, 190, 1100, 260, { colors: 'accent', oneByOne: true }),
        text('Al principio solo se contaba: <b>cuántas ovejas, cuánto grano</b>. La escritura nació para llevar cuentas, no para contar historias.', 90, 500, 1100, 100, { fontSize: 28, color: DARK, textAlign: 'center' })],
        notes: 'Galones uno a uno. Las fichas de barro representaban mercancías; luego se dibujaron en tablillas y, al final, los signos pasaron a ser sonidos. Fechas aproximadas.' },
      { title: 'Contaban de 60 en 60', layout: 'titleOnly', bg: SAND, extra: [
        shape('rounded', 90, 180, 520, 200, CLAY, { fill2: '#b0723f', gradType: 'radial', radius: 24 }),
        img(CUNEI_83, 90, 190, 520, 160, 'El número 83 en cuneiforme: una cuña vertical, dos de esquina y tres verticales'),
        text('1 sesentena', 110, 330, 160, 36, { fontSize: 20, color: CREAM }), text('23 unidades', 310, 330, 260, 36, { fontSize: 20, color: CREAM, textAlign: 'center' }),
        on(mathBlock({ x: 90, y: 410, w: 520, h: 90, fontSize: 40, latex: '1 \\cdot 60 + 23 = 83', color: DARK }), 'fade-in'),
        on(tableBlock({ x: 660, y: 180, w: 530, h: 320, fontSize: 24, header: true, headBg: BURNT, headFg: '#ffffff', stroke: '#d8c3a5', banded: true, band: '#e9d6b8',
          rows: [['Sesentenas', 'Unidades', 'Valor'], ['1', '23', '=A2*60+B2'], ['2', '30', '=A3*60+B3'], ['10', '0', '=A4*60+B4'], ['60', '0', '=A5*60+B5']], colW: [3, 3, 3] }), 'fade-left'),
        on(card('⏱ Por eso una hora tiene <b>60 minutos</b> y un círculo, <b>360 grados</b>: herencia babilónica.', 90, 540, 1100, 90, '#ffffff', { fontSize: 25, color: DARK, borderColor: LAPIS, radius: 10, vAlign: 'middle' }), 'fade-up')],
        notes: 'Una cuña vertical vale 1; la de esquina, 10. La posición dice si son unidades o sesentenas, como en nuestro sistema. La columna «Valor» son fórmulas (=A2*60+B2): cambia una cifra y se recalcula.' },
      { layout: 'blank', bg: '#e9dcc6', transition: 'page', extra: [
        img(STELE, 90, 90, 300, 560, 'Estela de basalto con leyes grabadas'),
        text('“', 450, 60, 150, 170, { fontFamily: H, fontSize: 150, color: BURNT, lineHeight: 1 }),
        text('Si un hombre deja ciego a otro, se le dejará ciego.', 460, 230, 740, 160, { fontFamily: H, fontSize: 52, fontWeight: 700, color: DARK }),
        text('— Ley 196 del Código de Hammurabi, rey de Babilonia (≈ 1750 a. C.)', 460, 400, 740, 70, { fontSize: 24, color: '#6e4a2f' }),
        on(card('Fue grabado en piedra y expuesto en público: <b>la ley escrita es igual para todos los que la leen</b>, aunque los castigos dependían de si eras noble, libre o esclavo.', 460, 500, 740, 140, '#f6efe2', { fontSize: 23, color: DARK, borderColor: BURNT, radius: 8 }), 'fade-up')],
        notes: 'La ley del talión: «ojo por ojo». Debate breve: ¿es justo un castigo igual al daño? ¿Qué cambia en nuestras leyes de hoy?' },
      { layout: 'blank', bg: SAND, extra: [pollBlock({ kind: 'gaps', question: 'Completa las leyes de Babilonia', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        text: 'Si un hombre deja ciego el [ojo] de otro, se le dejará ciego el [ojo]. Si rompe el [hueso] de otro, se le romperá el [hueso]. Las leyes se grabaron en una [estela] de piedra para que todos las vieran. El rey que las mandó escribir fue [Hammurabi].' })],
        notes: 'Completar huecos con nota, desde el móvil (no distingue mayúsculas ni tildes).' },
      { title: 'Inventos que siguen con nosotros', layout: 'titleOnly', bg: SAND, extra: [
        dg('radial', 'Mesopotamia\n  Escritura\n  Rueda\n  Arado\n  Leyes escritas\n  Calendario lunar\n  Horas de 60 minutos', 90, 170, 700, 500, { colors: 'colorful', oneByOne: true }),
        text('La <b>rueda</b> nació para el torno del alfarero (≈ 3500 a. C.) y solo después se usó en carros.', 830, 230, 360, 200, { fontSize: 26, color: DARK }),
        text('Cada clic, un invento.', 830, 470, 360, 50, { fontSize: 22, color: '#8a6a4f', fontStyle: 'italic' })],
        notes: 'Diagrama radial uno a uno. Pregunta por cada invento: ¿dónde lo usas tú esta semana?' },
      { layout: 'blank', bg: SAND, extra: [pollBlock({ kind: 'multi', question: '¿Cuáles de estos inventos has usado hoy? (marca todos)', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: ['La escritura', 'La rueda', 'Las horas de 60 minutos', 'Las leyes escritas', 'El ladrillo', 'El calendario'] })],
        notes: 'Elección múltiple en directo: el resultado suele mostrar que lo usamos casi todo, cada día.' },
    ]));
  } },

  // 3 · Athens: a black-figure vase. Terracotta and black with the meander band, curved Greek letters
  // around the amphora, two words that join with Transform, a doughnut of who could vote, a temple whose
  // columns go up one by one, potsherds that fall with sound, a vote «on your óstrakon» and a comparison table.
  edu_hist_greece: { name: 'Atenas: nace la democracia', cat: 'edu', summary: 'Estilo vasija de figuras negras: meandro, texto curvo, Transformar, dona, templo que se levanta, óstraka con sonido, votación y tabla', make: () => {
    const TERRA = '#d4703a', BLACK = '#1a1311', CREAM = '#f3e2c7', DEEP = '#a8501f', H = 'Georgia, serif', dem = uid(), kra = uid();
    const VOTE = [{ label: 'Ciudadanos varones adultos', value: 15, color: BLACK }, { label: 'Mujeres y niños de familias ciudadanas', value: 45, color: TERRA }, { label: 'Metecos (extranjeros libres)', value: 10, color: '#e8b27a' }, { label: 'Esclavos', value: 30, color: '#7a6a5e' }];
    const bands = (c, bg = '') => [img(meander(1280, c, bg), 0, 24, 1280, 40, 'Greca', { fit: 'fill', decorative: true }), img(meander(1280, c, bg), 0, 656, 1280, 40, 'Greca', { fit: 'fill', decorative: true })];
    return numbered(build({ name: 'Atenas: nace la democracia', palette: 'paper', fonts: 'websafe', title: { size: 50, color: BLACK }, body: { color: BLACK } }, [
      { layout: 'blank', bg: TERRA, transition: 'fade', extra: [...bands(BLACK),
        shape('ellipse', 760, 100, 480, 480, DEEP, { opacity: 45 }),
        text('ΔΗΜΟΚΡΑΤΙΑ · ΔΗΜΟΚΡΑΤΙΑ · ΔΗΜΟΚΡΑΤΙΑ · ', 760, 100, 480, 480, { fontFamily: H, fontSize: 28, curve: 100, color: BLACK, textAlign: 'center', letterSpacing: 3 }),
        on(img(AMPHORA, 860, 150, 280, 392, 'Ánfora de figuras negras con un corredor'), 'zoom-in', { start: 'afterPrev', duration: 900 }),
        kicker('ATENAS · SIGLO V a. C.', 90, 200, 600, BLACK),
        text('DEMOCRACIA', 84, 236, 680, 110, { fontFamily: H, fontSize: 74, fontWeight: 700, color: BLACK, letterSpacing: 2 }),
        text('El poder del pueblo… o de una parte de él', 90, 350, 640, 100, { fontFamily: H, fontSize: 30, fontStyle: 'italic', color: '#2e1a10' })],
        notes: 'Portada con aspecto de vasija griega de figuras negras: la greca arriba y abajo y el nombre en griego girando alrededor del ánfora (texto curvo). El ánfora entra sola.' },
      { layout: 'blank', bg: BLACK, transition: 'fade', extra: [...bands(TERRA),
        keep(text('δῆμος', 90, 200, 460, 150, { fontFamily: H, fontSize: 120, color: TERRA, textAlign: 'center' }), dem),
        text('+', 590, 220, 100, 130, { fontFamily: H, fontSize: 110, color: CREAM, textAlign: 'center' }),
        keep(text('κράτος', 730, 200, 460, 150, { fontFamily: H, fontSize: 120, color: TERRA, textAlign: 'center' }), kra),
        on(text('dêmos · el pueblo', 90, 370, 460, 50, { fontSize: 30, color: CREAM, textAlign: 'center' }), 'fade-up'),
        on(text('krátos · el poder', 730, 370, 460, 50, { fontSize: 30, color: CREAM, textAlign: 'center' }), 'fade-up'),
        text('¿Qué palabra sale si las juntamos?', 90, 500, 1100, 60, { fontFamily: H, fontSize: 34, fontStyle: 'italic', color: '#c9a98a', textAlign: 'center' })],
        notes: 'Dos clics: el significado de cada palabra. Antes de pasar, que lo adivinen. En la siguiente, las palabras se juntan con Transformar.' },
      { layout: 'blank', bg: BLACK, autoAnimate: true, extra: [...bands(TERRA),
        keep(text('δῆμος', 190, 130, 440, 150, { fontFamily: H, fontSize: 110, color: TERRA, textAlign: 'right' }), dem),
        keep(text('κράτος', 640, 130, 460, 150, { fontFamily: H, fontSize: 110, color: TERRA }), kra),
        text('democracia', 90, 300, 1100, 130, { fontFamily: H, fontSize: 100, fontWeight: 700, color: CREAM, textAlign: 'center' }),
        text('Las decisiones las toman los ciudadanos, votando, y no un rey ni unos pocos nobles.', 190, 460, 900, 100, { fontSize: 30, color: '#e6cdb0', textAlign: 'center' })],
        notes: 'Transformar: las dos palabras griegas viajan y se unen. Atenas la puso en marcha hacia el 508 a. C., con las reformas de Clístenes.' },
      { title: '¿Quién podía votar?', layout: 'titleOnly', bg: CREAM, extra: [
        chartBlock({ x: 70, y: 190, w: 380, h: 380, chartType: 'doughnut', legend: false, data: VOTE }),
        text(VOTE.map(d => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px"><span style="flex:0 0 22px;height:22px;border-radius:4px;background:${d.color};margin-top:4px"></span><span><b>${d.value} %</b> · ${d.label}</span></div>`).join(''),
          470, 220, 320, 340, { fontSize: 21, color: BLACK }),
        on(stat('1 de cada 7', 'habitantes de Atenas podía votar en la Asamblea', 830, 200, 380, DEEP, BLACK, 54), 'zoom-in', { sound: 'pop' }),
        on(text('Ni las mujeres, ni los extranjeros, ni los esclavos eran ciudadanos. Aun así, por primera vez <b>miles de personas corrientes</b> decidían las leyes.', 830, 400, 380, 230, { fontSize: 23, color: BLACK }), 'fade-up')],
        notes: 'Proporciones aproximadas para el siglo V a. C. (las cifras varían según los historiadores). Buena pregunta: ¿es una democracia si solo vota el 15 %?' },
      { title: 'Tres columnas para un templo', layout: 'titleOnly', bg: CREAM, extra: [
        ...[270, 640, 1010].map((cx, i) => (i ? after : on)(img(COLUMN, cx - 45, 235, 90, 240, 'Columna dórica'), 'fade-up', { duration: 500, sound: 'click' })),
        shape('rect', 150, 475, 980, 18, BLACK), shape('rect', 120, 493, 1040, 18, BLACK),
        after(shape('rect', 160, 212, 960, 24, BLACK), 'fade-down', { duration: 400 }),
        after(shape('triangle', 160, 150, 960, 62, BLACK), 'fade-down', { duration: 400, sound: 'chime' }),
        after(text('ΔΗΜΟΚΡΑΤΙΑ', 440, 178, 400, 34, { fontFamily: H, fontSize: 22, color: TERRA, textAlign: 'center', letterSpacing: 6 }), 'fade-in'),
        ...[['Ekklesía · la Asamblea', 'Todos los ciudadanos. Se reunía unas 40 veces al año y votaba a mano alzada.'], ['Boulé · el Consejo', '500 ciudadanos elegidos por sorteo cada año. Preparaba las leyes.'], ['Heliea · los tribunales', 'Jurados de cientos de ciudadanos, también por sorteo.']]
          .map(([h, d], i) => after(card(`<b style="color:${DEEP}">${h}</b><br>${d}`, 100 + i * 370, 525, 340, 150, '#fbf3e6', { fontSize: 20, color: BLACK, pad: [12, 16, 12, 16], radius: 6, borderColor: BLACK }), 'fade-up', { duration: 400 }))],
        notes: 'Un solo clic levanta el templo: las tres columnas, el arquitrabe y el frontón, y debajo cada institución. Muchos cargos se sorteaban: pensaban que era lo más justo.' },
      { title: 'El ostracismo', layout: 'titleOnly', bg: TERRA, extra: [
        ...[['10,10 230,4 252,90 196,162 30,150', 'ΘΕΜΙΣΤΟΚΛΗΣ', -6, 90, 190, -8], ['20,30 210,8 250,120 120,166 6,120', 'ΑΡΙΣΤΕΙΔΗΣ', 4, 360, 240, 6], ['4,40 120,4 254,40 230,150 60,164', 'ΚΙΜΩΝ', -3, 160, 400, 3]]
          .map(([pts, n, r, x, y, rot], i) => (i ? after : on)(img(OSTRAKON(pts, n, r), x, y, 260, 170, 'Óstrakon con un nombre grabado', { rotation: rot }), 'fade-down', { sound: 'pop', duration: 400, delay: i ? 250 : 0 })),
        text('Una vez al año, cada ciudadano podía escribir en un trozo de cerámica (<i>óstrakon</i>) el nombre de alguien peligroso para la ciudad.', 680, 190, 520, 190, { fontSize: 26, color: BLACK }),
        on(card('Si alguien reunía <b>6.000 votos</b>, debía irse de Atenas durante <b>diez años</b>. No perdía sus bienes ni era un castigo por un delito.', 680, 410, 520, 180, BLACK, { fontSize: 24, color: CREAM, radius: 6 }), 'fade-up')],
        notes: 'Los óstraka caen uno tras otro con sonido. Son nombres reales que aparecen en óstraka encontrados en el ágora de Atenas (Temístocles, Arístides y Cimón). Siguiente: votamos con el nuestro.' },
      { layout: 'blank', bg: TERRA, extra: [pollBlock({ kind: 'choice', question: 'Tu óstrakon: ¿qué desterrarías de clase durante diez años?', display: 'bar', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: ['Los exámenes', 'Los deberes', 'El timbre', 'Las prisas'] })],
        notes: 'Votación en directo con el móvil: como en Atenas, gana lo que reúne más votos. Pedir que alguien defienda la opción perdedora.' },
      { title: 'Atenas y Esparta', layout: 'titleOnly', bg: CREAM, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 430, fontSize: 24, header: true, headBg: BLACK, headFg: CREAM, stroke: '#c9a98a', banded: true, band: '#f0d5b5',
          rows: [['', 'Atenas', 'Esparta'], ['<b>Gobierno</b>', 'Democracia: Asamblea de ciudadanos', 'Dos reyes y un consejo de ancianos'], ['<b>Educación</b>', 'Lectura, música, deporte y oratoria', 'Entrenamiento militar desde los 7 años'],
            ['<b>Mujeres</b>', 'En casa, sin derechos políticos', 'Más libres: hacían deporte y administraban tierras'], ['<b>Economía</b>', 'Comercio por el mar y artesanía', 'Agricultura con trabajo de los ilotas'], ['<b>Lo que más valoraban</b>', 'Hablar bien y convencer', 'La disciplina y el valor']], colW: [3, 5, 5] })],
        notes: 'Tabla comparativa con filas alternas. Actividad oral: ¿en cuál de las dos te habría gustado vivir y por qué?' },
      { layout: 'blank', bg: BLACK, transition: 'fade', extra: [...bands(TERRA),
        text('“', 90, 80, 130, 190, { fontFamily: H, fontSize: 170, color: TERRA, lineHeight: 1 }),
        on(text('Nuestra constitución se llama democracia porque el gobierno no está en manos de unos pocos, sino de la mayoría.', 220, 200, 900, 250, { fontFamily: H, fontSize: 44, fontStyle: 'italic', color: CREAM }), 'fade-in', { start: 'afterPrev', duration: 1200 }),
        text('— Pericles, discurso fúnebre (según Tucídides), 431 a. C.', 220, 470, 900, 50, { fontSize: 26, color: '#c9a98a' }),
        text('Para debatir: ¿qué tiene de parecido y de distinto con nuestra democracia?', 220, 550, 900, 80, { fontSize: 26, color: TERRA })],
        notes: 'La cita aparece sola, despacio. Cerrar con el debate: hoy votan todos los mayores de edad, pero no decidimos cada ley directamente.' },
    ]));
  } },
  // 4 · Rome: white marble, imperial red and gold. A giant SPQR that shrinks with Transform, a triumphal arch,
  // a radial diagram of the roads, a road built layer by layer with a 3D soldier marching on it, an aqueduct
  // with water running and its slope as an equation, a line chart, Roman numerals added up by formulas and a quiz.
  edu_hist_rome: { name: 'Roma, ingenieros del imperio', cat: 'edu', summary: 'Mármol y rojo imperial: Transformar, arco triunfal, calzada por capas con soldado 3D que marcha, acueducto, ecuación, fórmulas y concurso', make: () => {
    const MARBLE = '#f4f1ec', RED = '#8e1b1b', GOLD = '#c9a227', INK = '#2b2523', STONE = '#e9e3d8', SKY = '#e4edf2', H = pairStacks('modern').heading, spqr = uid();
    const soldier = lib3d('kn-soldier');
    return numbered(build({ name: 'Roma, ingenieros del imperio', palette: 'office', fonts: 'modern', title: { size: 48, color: RED }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 14, 720, RED), shape('rect', 14, 0, 4, 720, GOLD)] }, [
      { layout: 'blank', bg: MARBLE, transition: 'fade', extra: [
        keep(text('SPQR', 40, 530, 760, 190, { fontFamily: H, fontSize: 170, fontWeight: 800, color: STONE, letterSpacing: 10, lineHeight: 1 }), spqr),
        on(img(ARCH, 810, 120, 380, 416, 'Arco de triunfo romano con la inscripción SPQR'), 'fade-up', { start: 'afterPrev', duration: 900 }),
        kicker('HISTORIA · LA ANTIGUA ROMA', 90, 150, 600, RED),
        text('Ingenieros<br>de Roma', 84, 186, 680, 220, { fontFamily: H, fontSize: 84, fontWeight: 800, lineHeight: 1.02, color: INK }),
        shape('rect', 90, 416, 120, 6, GOLD),
        text('Calzadas, acueductos y hormigón que aún resisten dos mil años después', 90, 438, 640, 80, { fontSize: 27, color: '#5a504c' })],
        notes: 'SPQR: «Senatus Populusque Romanus», el Senado y el pueblo de Roma. En la siguiente diapositiva las letras gigantes vuelan a la esquina (Transformar). El arco entra solo.' },
      { title: 'Todos los caminos llevan a Roma', layout: 'titleOnly', bg: MARBLE, autoAnimate: true, extra: [
        keep(text('SPQR', 1000, 60, 200, 70, { fontFamily: H, fontSize: 48, fontWeight: 800, color: RED, letterSpacing: 4, textAlign: 'right' }), spqr),
        dg('radial', 'Roma\n  Vía Apia\n  Vía Flaminia\n  Vía Aurelia\n  Vía Emilia\n  Vía Augusta\n  Vía de la Plata', 70, 170, 680, 500, { colors: 'accent', oneByOne: true }),
        on(stat('≈ 80.000 km', 'de calzadas principales: dos vueltas a la Tierra', 800, 190, 400, RED, INK, 62), 'zoom-in', { sound: 'pop' }),
        img(MILESTONE, 800, 420, 140, 228, 'Miliario: piedra que marca las millas'),
        on(text('<b>Miliarios</b>: cada mil pasos (≈ 1,5 km) una piedra decía la distancia a la ciudad más cercana.', 960, 440, 240, 210, { fontSize: 21, color: INK }), 'fade-left')],
        notes: 'Transformar: SPQR vuela a la esquina. Diagrama radial uno a uno. La Vía Augusta y la Vía de la Plata cruzaban Hispania. Longitud aproximada de la red principal.' },
      { title: 'Cómo se hace una calzada', layout: 'titleOnly', bg: '#efe9df', extra: [
        ...[['Statumen', 'piedras grandes', 540, 90, '#8a7f72'], ['Rudus', 'piedra y cal', 470, 70, '#a99b8a'], ['Nucleus', 'grava y arena', 410, 60, '#c8b9a2'], ['Summa crusta', 'losas encajadas', 360, 50, '#6f6a66']]
          .flatMap(([h, d, y, hh, c], i) => [(i ? after : on)(shape('rect', 90, y, 700, hh, c, { stroke: '#4a443f', strokeWidth: 2 }), 'fade-down', { duration: 450, sound: 'click' }),
            along(text(`<b style="color:${RED}">${h}</b> · ${d}`, 830, y + hh / 2 - 22, 370, 44, { fontSize: 22, color: INK, vAlign: 'middle' }), 'fade-left')]),
        ...[0, 1, 2, 3, 4, 5, 6].map(i => shape('rect', 90 + i * 100, 360, 3, 50, '#3e3a36')),
        withAnims(model('kn-soldier', 60, 150, 170, 220, { walk: { clip: soldier.walk, face: true }, caption: '' }), path([[260, 0], [560, 0]], { duration: 4200 })),
        text('Algunas tenían más de un metro de grosor. Por eso muchas siguen bajo nuestras carreteras.', 90, 650, 1100, 40, { fontSize: 22, color: '#6b5f58', fontStyle: 'italic' })],
        notes: 'Primer clic: la calzada se construye capa a capa, de abajo arriba (encadenadas con sonido). Segundo clic: el legionario 3D marcha por ella. Las capas varían según el terreno; este es el modelo clásico.' },
      { title: 'El agua que viaja sola', layout: 'titleOnly', bg: SKY, extra: [
        img(AQUEDUCT(SKY), 60, 190, 700, 380, 'Acueducto de dos pisos de arcos sobre un valle'),
        withAnims(shape('ellipse', 74, 238, 22, 22, '#1f6fd1'), A('path', { start: 'click', pathShape: 'custom', points: [[300, 3], [640, 8]], dx: 640, dy: 8, duration: 3000, sound: 'whoosh' })),
        mathBlock({ x: 790, y: 190, w: 420, h: 110, fontSize: 40, latex: '\\text{pendiente} = \\frac{\\Delta h}{d}', color: INK }),
        on(mathBlock({ x: 790, y: 310, w: 420, h: 110, fontSize: 32, latex: '\\frac{12{,}6\\ \\text{m}}{50\\ \\text{km}} \\approx 25\\ \\tfrac{\\text{cm}}{\\text{km}}', color: RED }), 'fade-in'),
        on(text('Sin bombas ni motores: el agua bajaba sola, <b>un palmo por kilómetro</b>. Si la pendiente era mayor, rompía el canal; si era menor, se estancaba.', 790, 440, 420, 200, { fontSize: 22, color: INK }), 'fade-up')],
        notes: 'Clic: una gota recorre el canal de lado a lado. Cifras aproximadas del acueducto que llevaba agua a Nimes (Francia), con el famoso puente del Gard.' },
      { title: 'Una ciudad de un millón', layout: 'titleOnly', bg: MARBLE, extra: [
        chartBlock({ x: 80, y: 170, w: 760, h: 470, chartType: 'line', color: RED, grid: true, dataLabels: true, yTitle: 'millones de habitantes',
          data: [['500 a. C.', 0.1], ['300 a. C.', 0.2], ['100 a. C.', 0.4], ['Año 1', 1], ['200', 1], ['400', 0.5], ['600', 0.05]].map(([label, value]) => ({ label, value })) }),
        on(card(`<div style="font-family:${H};font-size:30px;font-weight:800;color:${RED};margin-bottom:8px">¿Sabías que…?</div>Ninguna ciudad europea volvió a tener un millón de habitantes hasta Londres, hacia el año 1800.`, 880, 200, 320, 280, '#ffffff',
          { fontSize: 22, color: INK, borderColor: GOLD, radius: 8, shadow: { x: 8, y: 8, blur: 0, color: GOLD } }), 'fade-left'),
        text('Estimaciones aproximadas: los historiadores no se ponen de acuerdo.', 880, 520, 320, 90, { fontSize: 18, color: '#8a7f72', fontStyle: 'italic' })],
        notes: 'Gráfico de líneas con las cifras sobre los puntos. Pregunta: ¿por qué cayó tanto? Guerras, epidemias, el traslado de la capital a Constantinopla y el fin del grano gratis.' },
      { title: 'Contar como un romano', layout: 'titleOnly', bg: MARBLE, extra: [
        ...[['I', 1], ['V', 5], ['X', 10], ['L', 50], ['C', 100], ['D', 500], ['M', 1000]].map(([r, v], i) =>
          on(text(`<div style="font-family:${H};font-size:44px;font-weight:800;color:${RED};line-height:1.1">${r}</div><div>${v}</div>`, 90 + (i % 2) * 150, 180 + Math.floor(i / 2) * 116, 130, 100,
            { fontSize: 22, color: INK, textAlign: 'center', bg: '#ffffff', radius: 8, borderColor: '#d9d2c5', vAlign: 'middle', pad: [6, 6, 6, 6] }), 'zoom-in', { start: i ? 'withPrev' : 'click', delay: i * 120, sound: i ? '' : 'pop' })),
        tableBlock({ x: 420, y: 180, w: 780, h: 330, fontSize: 24, header: true, headBg: RED, headFg: '#ffffff', stroke: '#d9d2c5', banded: true, band: '#f3ece0',
          rows: [['Número romano', 'Cuenta', 'Valor'], ['XIV', '10 + (5 − 1)', '=10+(5-1)'], ['XLII', '(50 − 10) + 2', '=(50-10)+2'], ['CDXC', '(500 − 100) + (100 − 10)', '=(500-100)+(100-10)'], ['MMXXVI', '1000 + 1000 + 10 + 10 + 5 + 1', '=1000+1000+10+10+5+1']], colW: [3, 5, 2] }),
        text('<b>La regla:</b> un símbolo menor delante de uno mayor se resta (IV = 4); detrás, se suma (VI = 6).', 420, 540, 780, 90, { fontSize: 24, color: INK })],
        notes: 'Los siete símbolos aparecen en cadena con un clic. La columna «Valor» son fórmulas: el resultado se calcula solo. Reto: ¿cómo se escribe el año en que naciste?' },
      { layout: 'blank', bg: MARBLE, extra: [quiz('¿Qué número es XLIV?', ['46', '44', '64', '54'], 1, { time: 30 })],
        notes: 'Concurso con tiempo (30 s). XL = 40 (50 − 10) y IV = 4 (5 − 1).' },
      { layout: 'blank', bg: MARBLE, extra: [pollBlock({ kind: 'qa', question: 'Pregunta a un ingeniero romano: ¿qué te gustaría saber?', options: [], fontSize: 34, x: 60, y: 60, w: 1160, h: 600 })],
        notes: 'Preguntas del público desde el móvil: las más votadas suben. Buen cierre para resolver dudas o para preparar la próxima clase.' },
    ]));
  } },

  // 5 · Al-Andalus: dark teal, gold and red-and-cream voussoirs. A horseshoe arch, a timeline one by one,
  // a horizontal bar chart of cities, an astrolabe whose star map turns, two squares that become an
  // eight-pointed star with Transform and fill the wall with tiles, a match activity of words and a vote.
  edu_hist_alandalus: { name: 'Al-Ándalus: ciencia y jardines', cat: 'edu', summary: 'Arco de herradura, cronología uno a uno, barras horizontales, astrolabio que gira, estrella con Transformar, unir parejas y votación', make: () => {
    const NIGHT = '#0b2e33', GOLD = '#d9a441', TERRA = '#b5452b', CREAM = '#f5ead6', TURQ = '#2a9d8f', H = pairStacks('classic').heading, sqA = uid(), sqB = uid(), cap = uid();
    const tiles = (x0, y0, cols, rows, s, props = {}) => Array.from({ length: cols * rows }, (_, i) => { const c = i % cols, r = Math.floor(i / cols);
      return shape('star8', x0 + c * s, y0 + r * s, s, s, [GOLD, TURQ, TERRA][(c + r) % 3], { stroke: NIGHT, strokeWidth: 3, ...props }); });
    return numbered(build({ name: 'Al-Ándalus: ciencia y jardines', palette: 'ocean', fonts: 'classic', title: { size: 50, color: GOLD },
      decor: () => [shape('rect', 0, 704, 1280, 4, GOLD), shape('rect', 0, 710, 1280, 10, TERRA)] }, [
      { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [glow(500, 60, 700, TURQ, NIGHT, 30),
        ...tiles(-30, -30, 2, 9, 80, { opacity: 25 }),
        on(img(HORSESHOE, 740, 60, 450, 554, 'Arco de herradura con dovelas rojas y blancas'), 'zoom-in', { start: 'afterPrev', duration: 900 }),
        kicker('711 – 1492 · OCHO SIGLOS', 190, 200, 500, TURQ),
        text('Al-Ándalus', 184, 236, 540, 140, { fontFamily: H, fontSize: 96, wordart: 'gold' }),
        text('Ciencia, agua y jardines en la península ibérica', 190, 390, 480, 100, { fontFamily: H, fontSize: 32, fontStyle: 'italic', color: CREAM })],
        notes: 'Portada inspirada en la Mezquita de Córdoba: arco de herradura con dovelas rojas y blancas y su recuadro (alfiz). Al-Ándalus es el nombre árabe del territorio peninsular bajo gobierno musulmán.' },
      { title: 'Ocho siglos en seis fechas', layout: 'titleOnly', bg: NIGHT, extra: [
        dg('timeline', '711\n  Llegada desde el norte de África\n756\n  Emirato de Córdoba\n929\n  Califato de Córdoba\n1031\n  Reinos de taifas\n1238\n  Reino nazarí de Granada\n1492\n  Fin de Al-Ándalus', 90, 190, 1100, 440, { colors: 'accent', oneByOne: true })],
        notes: 'Cronología uno a uno. El califato de Córdoba (929–1031) fue el momento de mayor esplendor; la Alhambra es obra del último periodo, el nazarí.' },
      { title: 'Córdoba hacia el año 1000', layout: 'titleOnly', bg: NIGHT, extra: [
        chartBlock({ x: 80, y: 180, w: 700, h: 440, chartType: 'hbar', color: TURQ, dataLabels: true, seriesName: 'miles de habitantes',
          data: [['Bagdad', 400], ['Constantinopla', 300], ['Córdoba', 200], ['Roma', 35], ['París', 20], ['Londres', 15]].map(([label, value]) => ({ label, value, ...(label === 'Córdoba' && { color: GOLD }) })) }),
        ...[['Calles empedradas e iluminadas', 'Algo rarísimo en la Europa de entonces.'], ['Cientos de baños públicos', 'Y agua corriente en muchas casas.'], ['Una gran biblioteca', 'Las crónicas hablan de 400.000 libros.']].map(([h, d], i) =>
          on(card(`<b style="color:${GOLD}">${h}</b><br>${d}`, 820, 190 + i * 140, 380, 124, '#ffffff10', { fontSize: 22, color: CREAM, radius: 10, borderColor: '#2a9d8f80', pad: [14, 20, 14, 20], vAlign: 'middle' }), 'fade-left'))],
        notes: 'Estimaciones muy aproximadas (miles de habitantes): las fuentes varían mucho. Lo importante es la comparación: Córdoba era una de las mayores ciudades del mundo.' },
      { title: 'Ciencia que viajó', layout: 'titleOnly', bg: NIGHT, extra: [
        img(ASTRO_PLATE, 90, 170, 400, 440, 'Astrolabio: la placa con la escala de grados'),
        on(img(ASTRO_RETE, 90, 210, 400, 400, 'La red de estrellas del astrolabio, que gira'), 'spin360', { duration: 4000, sound: 'chime' }),
        ...[['Astronomía', 'Con el astrolabio se medía la altura de las estrellas, la hora y la dirección de La Meca.'], ['Álgebra', 'La palabra viene del árabe <i>al-yabr</i>, «recomponer».'], ['Números', 'Las cifras del 0 al 9 llegaron a Europa a través de Al-Ándalus, desde la India.'], ['Medicina', 'Se escribieron tratados de cirugía con dibujos de más de 200 instrumentos.']]
          .map(([h, d], i) => on(text(`<b style="font-family:${H};font-size:28px;color:${GOLD}">${h}</b><br>${d}`, 560, 180 + i * 118, 640, 110, { fontSize: 21, color: CREAM }), 'fade-left'))],
        notes: 'Primer clic: la red de estrellas del astrolabio da una vuelta completa (énfasis «girar» con campanilla). Después, un clic por ciencia.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
        text('Geometría sin figuras', 90, 70, 1100, 70, { fontFamily: H, fontSize: 50, color: TERRA }),
        keep(shape('rect', 190, 210, 300, 300, TURQ, { opacity: 85 }), sqA), keep(shape('rect', 190, 210, 300, 300, GOLD, { opacity: 85 }), sqB),
        keep(text('Empezamos con <b>dos cuadrados iguales</b>, uno encima del otro…', 620, 260, 560, 160, { fontSize: 34, color: NIGHT }), cap)],
        notes: 'Los artesanos andalusíes decoraban muros enteros con geometría: el islam evitaba representar personas en los lugares sagrados. Siguiente: giramos uno de los cuadrados (Transformar).' },
      { layout: 'blank', bg: CREAM, autoAnimate: true, extra: [
        text('Geometría sin figuras', 90, 70, 1100, 70, { fontFamily: H, fontSize: 50, color: TERRA }),
        keep(shape('rect', 190, 210, 300, 300, TURQ, { opacity: 85 }), sqA), keep(shape('rect', 190, 210, 300, 300, GOLD, { opacity: 85, rotation: 45 }), sqB),
        keep(text('…giramos uno 45° y nace una <b>estrella de ocho puntas</b>, base de muchos alicatados.', 620, 200, 560, 160, { fontSize: 34, color: NIGHT }), cap),
        ...tiles(620, 400, 7, 3, 80).map((t, i) => withAnims(t, A('zoom-in', { start: i ? 'withPrev' : 'click', delay: i * 60, duration: 400, ...(i ? {} : { sound: 'chime' }) })))],
        notes: 'Transformar: el cuadrado dorado gira 45° y la estrella aparece sola. Clic: la estrella se repite hasta cubrir la pared, como en un zócalo de la Alhambra. Actividad: dibujarla con escuadra y compás.' },
      { layout: 'blank', bg: NIGHT, extra: [pollBlock({ kind: 'match', question: 'Une cada palabra con su origen árabe', fontSize: 40, x: 60, y: 40, w: 1160, h: 640,
        options: ['Aceite = az-zayt, «el jugo de la aceituna»', 'Almohada = al-mujadda, «donde se apoya la mejilla»', 'Ojalá = law sha Allah, «si Dios quiere»', 'Azúcar = as-sukkar', 'Alcalde = al-qadi, «el juez»'] })],
        notes: 'Unir parejas con nota desde el móvil. El español tiene unas 4.000 palabras de origen árabe: muchas empiezan por «al-», el artículo árabe.' },
      { layout: 'blank', bg: NIGHT, extra: [pollBlock({ kind: 'choice', question: 'Si pudieras viajar mañana, ¿qué visitarías?', display: 'bar', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: ['Mezquita de Córdoba', 'La Alhambra', 'Medina Azahara', 'La Giralda'] })],
        notes: 'Votación en directo. Para casa: buscar una foto del monumento elegido y encontrar en ella un arco de herradura, una estrella o una inscripción.' },
    ]));
  } },

  // 6 · Castles: a castle in the dark with lit windows and a 3D knight; a feudal pyramid built from the
  // bottom with arrows of what goes up and down, the parts of a castle with the knight crossing the bridge,
  // a label activity, a day that follows the sun, a treemap, shields of arms, a quiz and a word cloud.
  edu_hist_castle: { name: 'Castillos y feudalismo', cat: 'edu', summary: 'Castillo nocturno y caballero 3D que cruza el puente, pirámide feudal que se levanta, etiquetar, sol que recorre el día, treemap y escudos', make: () => {
    const NIGHT = '#101317', STONE = '#8b8f99', RED = '#b3202a', BLUE = '#2b4f9e', GOLD = '#e0b13a', PARCH = '#efe4cc', INK = '#1d1a16', H = pairStacks('bold').heading;
    const knight = lib3d('kk-Knight'), hero = uid();
    const PARTS = [['Torre del homenaje', 'La más alta y fuerte: allí vivía el señor.', 49, 24], ['Almenas', 'Para disparar a cubierto.', 30, 40], ['Muralla', 'Muros de varios metros de grosor.', 26, 62], ['Puente levadizo', 'Se subía con cadenas para cerrar la entrada.', 50, 88], ['Foso', 'Zanja con agua alrededor de la muralla.', 82, 86]];
    return numbered(build({ name: 'Castillos y feudalismo', palette: 'revela', fonts: 'bold', title: { size: 64, color: GOLD } }, [
      { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [glow(150, -150, 560, '#f6ecd6', NIGHT, 25),
        shape('ellipse', 300, 60, 110, 110, '#f6ecd6', { fill2: '#c9cfe6', gradType: 'radial' }),
        img(CASTLE_NIGHT, 0, 420, 1280, 300, 'Silueta de un castillo con ventanas iluminadas', { fit: 'fill' }),
        kicker('EDAD MEDIA · SIGLOS IX – XV', 90, 200, 600, GOLD),
        text('CASTILLOS', 84, 210, 780, 200, { fontFamily: H, fontSize: 168, color: PARCH, letterSpacing: 6 }),
        text('Señores, caballeros y campesinos', 90, 400, 640, 60, { fontSize: 34, color: '#c7c9d1' }),
        keep(model('kk-Knight', 860, 90, 330, 420, { view: 'front', caption: '', clip: knight.rest }), hero)],
        notes: 'El caballero 3D respira tranquilo (animación de reposo) y se puede girar con el ratón. Pregunta de arranque: ¿para qué se construía un castillo: para vivir o para defenderse?' },
      { title: 'La pirámide feudal', layout: 'titleOnly', bg: NIGHT, extra: [
        ...[['Campesinos y siervos', 600, 820, '#6b7280', '#4b5260', 540], ['Caballeros', 400, 600, BLUE, '#1d3a78', 440], ['Nobles y clero', 200, 400, RED, '#7d1219', 340], ['El rey', 0, 200, GOLD, '#b0861f', 240]]
          .flatMap(([t, a, b, c1, c2, y], i) => [(i ? after : on)(img(level(820, 100, a, b, c1, c2), 90, y, 820, 100, t), 'fade-up', { duration: 450, sound: 'click' }),
            along(text(t, 290, y + 26, 420, 50, { fontFamily: H, fontSize: i === 3 ? 30 : 36, color: '#ffffff', textAlign: 'center', vAlign: 'middle', letterSpacing: 2 }), 'fade-in')]),
        on(shape('uparrow', 930, 220, 60, 200, GOLD), 'fade-up'), along(text('<b>Hacia arriba</b><br>Trabajo, tributos y lealtad', 1005, 250, 200, 140, { fontSize: 22, color: GOLD }), 'fade-up'),
        on(shape('downarrow', 930, 440, 60, 200, '#7aa2f7'), 'fade-down'), along(text('<b>Hacia abajo</b><br>Tierras (feudos) y protección', 1005, 470, 200, 140, { fontSize: 22, color: '#7aa2f7' }), 'fade-down'),
        text('Cada uno debía algo al de arriba… y recibía algo a cambio.', 90, 650, 820, 40, { fontSize: 22, color: '#9aa0aa', fontStyle: 'italic' })],
        notes: 'Primer clic: la pirámide se levanta de abajo arriba. Segundo: lo que sube (trabajo, impuestos, lealtad). Tercero: lo que baja; el de arriba daba tierras (feudos) y protección. Al menos 9 de cada 10 personas eran campesinos.' },
      { title: `<span style="color:${RED}">Las partes del castillo</span>`, layout: 'titleOnly', bg: '#e9eef3', extra: [
        img(CASTLE_DAY, 90, 170, 760, 480, 'Castillo con torre del homenaje, almenas, muralla, puente levadizo y foso'),
        ...PARTS.flatMap(([h, d, px, py], i) => [on(badge(i + 1, 90 + 760 * px / 100 - 20, 170 + 480 * py / 100 - 20, 40, RED), 'zoom-in', { sound: 'pop' }),
          along(text(`<b style="color:${RED}">${i + 1} · ${h}</b><br>${d}`, 880, 180 + i * 96, 330, 90, { fontSize: 20, color: INK }), 'fade-left')]),
        withAnims(model('kk-Knight', 120, 470, 120, 160, { caption: '', walk: { clip: knight.walk, end: knight.arrive, endOnce: true, face: true } }), path([[150, 0], [300, -30]], { duration: 3000 }))],
        notes: 'Un clic por parte (número con sonido y su explicación). El último clic: el caballero cruza el puente levadizo y lo celebra al llegar a la puerta.' },
      { layout: 'blank', bg: NIGHT, extra: [pollBlock({ kind: 'label', question: 'Etiqueta las partes del castillo', image: CASTLE_DAY, options: PARTS.map(p => p[0]),
        points: PARTS.map(p => ({ x: p[2], y: p[3] })), fontSize: 40, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Actividad «Etiquetar» con nota: desde el móvil se arrastra cada nombre a su número. Al terminar, un clic muestra las soluciones.' },
      { title: 'Un día en el castillo', layout: 'titleOnly', bg: '#16202e', extra: [
        ink([[110, 400], [300, 250], [640, 190], [980, 250], [1170, 400]], '#e0b13a55', 3, { dash: 'dash' }),
        withAnims(shape('sun', 80, 370, 64, 64, GOLD), path(rel([[112, 402], [300, 250], [640, 190], [980, 250], [1170, 402]]), { duration: 6000, start: 'click', sound: 'chime' })),
        ...[['6:00', 'Misa y pan con vino aguado'], ['9:00', 'Entrenar con la espada o trabajar en el campo'], ['12:00', 'Comida principal en el gran salón'], ['15:00', 'Caza, cetrería o impartir justicia'], ['18:00', 'Cena con juglares y música'], ['21:00', 'A dormir: las velas eran caras']]
          .map(([h, d], i) => along(card(`<div style="font-family:${H};font-size:40px;color:${GOLD};line-height:1">${h}</div><div style="margin-top:6px">${d}</div>`, 90 + i * 186, 450, 172, 200, '#ffffff10',
            { fontSize: 19, color: PARCH, radius: 10, pad: [14, 14, 14, 14] }), 'fade-up', { delay: 400 + i * 900 }))],
        notes: 'Un clic: el sol recorre el cielo y las horas del día van apareciendo a su paso (todas a la vez que el sol, con retrasos). Horario orientativo de un castillo noble.' },
      { title: '¿Quién era quién?', layout: 'titleOnly', bg: NIGHT, extra: [
        chartBlock({ x: 80, y: 170, w: 760, h: 480, chartType: 'treemap', color: STONE,
          data: [{ label: 'Campesinos y siervos', value: 85, color: '#6b7280' }, { label: 'Artesanos y mercaderes', value: 8, color: '#8a6d3b' }, { label: 'Clero', value: 4, color: RED }, { label: 'Nobles y caballeros', value: 3, color: BLUE }] }),
        on(stat('85 %', 'de la gente trabajaba la tierra y nunca se alejaba más de 20 km de su aldea', 880, 200, 330, GOLD, PARCH, 84), 'zoom-in', { sound: 'drumroll' })],
        notes: 'Gráfico de rectángulos: el área de cada uno es su parte de la población. Porcentajes aproximados para la Europa del siglo XII.' },
      { title: `<span style="color:${RED}">Escudos de armas</span>`, layout: 'titleOnly', bg: PARCH, extra: [
        ...[[`<rect width="200" height="240" fill="${RED}"/><rect x="100" width="100" height="240" fill="${GOLD}"/>`, 'Partido', 'Dividido en dos mitades'],
          [`<rect width="200" height="240" fill="${BLUE}"/><path d="M0 170 L100 70 L200 170 V210 L100 110 L0 210Z" fill="#f2f2f2"/>`, 'Con chevrón', 'Una banda en forma de tejado'],
          [`<rect width="200" height="240" fill="#2e7d32"/><rect x="80" width="40" height="240" fill="${GOLD}"/><rect y="80" width="200" height="40" fill="${GOLD}"/>`, 'Con cruz', 'Muy usada por las órdenes militares']]
          .flatMap(([svg, h, d], i) => [on(img(SHIELD(svg), 110 + i * 250, 180, 200, 240, 'Escudo ' + h.toLowerCase()), 'flip', { start: i ? 'afterPrev' : 'click' }),
            text(`<b>${h}</b><br>${d}`, 90 + i * 250, 440, 240, 90, { fontSize: 21, color: INK, textAlign: 'center' })]),
        card(`<div style="font-family:${H};font-size:34px;color:${RED}">La regla de oro</div>Nunca <b>metal sobre metal</b> (oro, plata) ni <b>color sobre color</b> (rojo, azul, verde, negro): así se distinguía de lejos en la batalla.`, 870, 180, 330, 360, '#ffffff', { fontSize: 22, color: INK, borderColor: GOLD, radius: 6 }),
        text('Diseña el tuyo: elige dos esmaltes, una partición y una figura.', 90, 580, 760, 60, { fontSize: 26, color: '#6b5a3a', fontStyle: 'italic' })],
        notes: 'Los escudos giran al entrar, uno tras otro. Los yelmos cerrados tapaban la cara: el escudo decía quién eras. Actividad: diseñar su escudo personal en una cuartilla.' },
      { layout: 'blank', bg: NIGHT, extra: [quiz('¿Qué recibía un caballero de su señor a cambio de su lealtad?', ['Un sueldo mensual', 'Un feudo: tierras', 'Un título universitario', 'Nada'], 1)],
        notes: 'Concurso con tiempo. El feudo (tierras con sus campesinos) es la base de la palabra «feudalismo».' },
      { layout: 'blank', bg: NIGHT, transition: 'convex', extra: [glow(800, 80, 520, GOLD, NIGHT, 25),
        pollBlock({ kind: 'word', question: '¿Qué animal pondrías en tu escudo?', options: [], fontSize: 38, x: 60, y: 60, w: 760, h: 600 }),
        keep(model('kk-Knight', 860, 150, 330, 420, { view: 'front', caption: '', clip: knight.arrive }), hero),
        credits(['kk-Knight'], 860, 600, 340, '#6b7280')],
        notes: 'Nube de palabras en directo: el león, el águila y el lobo suelen ganar. El caballero lo celebra. Modelo 3D CC0 (KayKit).' },
    ]));
  } },
  // 7 · Vikings: a fjord at night under the northern lights. A longship that rocks on the water, runes,
  // myths struck through with a stamp, a voyage across the North Atlantic, figures with sound, a match
  // activity of the days of the week, a 3D warrior beside a radar of what he did all year, a quiz and a rating.
  edu_hist_vikings: { name: 'Vikingos, navegantes del norte', cat: 'edu', summary: 'Fiordo bajo la aurora: barco que se mece, runas, mitos tachados con sello, travesía animada, cifras con sonido, guerrero 3D, radar y unir', make: () => {
    const BG = '#081428', AUR = '#39ff88', TEAL = '#4fd1c5', ICE = '#dbe9f5', RED = '#c8423b', GOLD = '#e0b13a', H = pairStacks('clean').heading;
    const fjord = () => [glow(-200, -260, 820, AUR, BG, 30), glow(560, -300, 760, TEAL, BG, 28),
      shape('triangle', -80, 330, 520, 300, '#0d1f38'), shape('triangle', 260, 380, 460, 250, '#10264a'), shape('triangle', 860, 300, 560, 330, '#0d1f38'),
      shape('rect', 0, 600, 1280, 120, '#0a1a33', { fill2: '#13294b', gradAngle: 180 })];
    const stamp = (t, c) => text(t, 0, 0, 220, 64, { fontSize: 34, fontWeight: 800, color: c, textAlign: 'center', vAlign: 'middle', borderColor: c, radius: 8, letterSpacing: 4, rotation: -10, pad: [0, 0, 0, 0] });
    const at = (b, x, y) => ({ ...b, x, y });
    return numbered(build({ name: 'Vikingos, navegantes del norte', palette: 'midnight', fonts: 'clean', title: { size: 50, color: ICE, bold: true },
      decor: () => [shape('rect', 0, 714, 1280, 6, AUR, { fill2: TEAL, gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [...fjord(),
        withAnims(img(LONGSHIP, 720, 380, 420, 260, 'Barco vikingo con vela a rayas y escudos'), path([[18, -10], [36, 0], [54, -10], [72, 0]], { start: 'afterPrev', duration: 4000 })),
        text('VIKINGOS', 84, 150, 800, 170, { fontFamily: H, fontSize: 150, fontWeight: 800, wordart: 'ice', letterSpacing: 4 }),
        img(runes(['f', 'u', 'th', 'a', 'r', 'k', 'h', 'n', 'i', 'a', 's'], AUR, 48), 90, 330, 528, 58, 'Runas del alfabeto futhark'),
        text('Navegantes, comerciantes y guerreros del norte · 793 – 1066', 90, 410, 600, 90, { fontSize: 28, color: ICE })],
        notes: 'El barco se mece solo sobre el agua al llegar (trayectoria en zigzag). Las runas de debajo son el principio del alfabeto vikingo: f, u, th, a, r, k… por eso se llama «futhark».' },
      { title: 'Mito o realidad', layout: 'titleOnly', bg: BG, extra: [
        ...[['Llevaban cascos con cuernos.', false, 'Se inventó en el siglo XIX para la ópera. Sus cascos eran sencillos.'], ['Llegaron a América 500 años antes que Colón.', true, 'Hay restos de un poblado vikingo en Terranova, hacia el año 1000.'],
          ['Eran sucios y desaliñados.', false, 'Se peinaban a diario y el sábado era el «día del baño».'], ['Las mujeres podían divorciarse.', true, 'Y tener tierras y negocios propios.']].flatMap(([t, ok, d], i) => {
          const x = 90 + (i % 2) * 560, y = 180 + Math.floor(i / 2) * 240;
          return [shape('rounded', x, y, 530, 210, '#ffffff0d', { stroke: '#4fd1c560', strokeWidth: 2 }),
            ok ? text(t, x + 26, y + 22, 470, 80, { fontSize: 28, fontWeight: 700, color: ICE }) : on(text(t, x + 26, y + 22, 470, 80, { fontSize: 28, fontWeight: 700, color: ICE }), 'strike'),
            ...(ok ? [on(at(stamp('REALIDAD', AUR), x + 290, y + 120), 'zoom-in', { sound: 'chime' })] : [along(at(stamp('MITO', RED), x + 290, y + 120), 'zoom-in', { sound: 'pop' })]),
            along(text(d, x + 26, y + 104, 260, 96, { fontSize: 19, color: '#a9bdd6' }), 'fade-in')]; })],
        notes: 'Un clic por tarjeta: los mitos se tachan y reciben el sello rojo; las verdades, el verde. Antes de cada clic, que voten a mano alzada: ¿mito o realidad?' },
      { title: 'Rumbo al oeste', layout: 'titleOnly', bg: BG, extra: [
        img(NORTH, 90, 170, 1100, 460, 'Mapa del Atlántico Norte: Noruega, Islandia, Groenlandia y Terranova'),
        { ...ink([[985, 420], [790, 320], [660, 290], [500, 330], [420, 410], [250, 470]], '#ffd166', 4, { dash: 'dash' }), animation: A('draw', { duration: 2400 }) },
        withAnims(shape('ellipse', 975, 410, 22, 22, RED, { stroke: '#ffffff', strokeWidth: 3 }), path(rel([[985, 420], [790, 320], [660, 290], [500, 330], [420, 410], [250, 470]]), { start: 'afterPrev', duration: 4000, sound: 'whoosh' })),
        ...[['874', 690, 335], ['985', 470, 425], ['≈ 1000', 290, 470]].map(([t, x, y], i) => along(text(t, x, y, 120, 36, { fontSize: 22, fontWeight: 700, color: '#ffd166', textAlign: 'center' }), 'fade-up', { delay: 1300 + i * 1300 }))],
        notes: 'Un clic: se dibuja la ruta y el barco la recorre de Noruega a Terranova; las fechas aparecen a su paso. Navegaban mirando el sol, las estrellas, las aves y el color del agua.' },
      { title: 'El drakkar: rápido y ligero', layout: 'titleOnly', bg: BG, extra: [...fjord().slice(0, 2),
        img(LONGSHIP, 90, 200, 620, 384, 'Barco vikingo'),
        ...[['≈ 23 m', 'de largo: como dos autobuses'], ['≈ 60', 'remeros cuando no había viento'], ['< 1 m', 'de calado: subía por los ríos hasta París']].map(([n, l], i) =>
          (i ? after : on)(stat(n, l, 780, 180 + i * 160, 420, ['#ffd166', AUR, TEAL][i], ICE, 60), 'fade-left', { sound: 'drumroll', duration: 500, delay: i ? 900 : 0 }))],
        notes: 'Un clic y las tres cifras aparecen seguidas, con redoble. Medidas aproximadas de un barco de guerra grande. El poco calado les permitía atacar ciudades del interior por los ríos.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', question: 'Los dioses nórdicos siguen en el calendario inglés: une cada día con su dios', fontSize: 38, x: 60, y: 40, w: 1160, h: 640,
        options: ['Tuesday (martes) = Tyr, dios de la guerra', 'Wednesday (miércoles) = Odín (Woden), el padre de los dioses', 'Thursday (jueves) = Thor, dios del trueno', 'Friday (viernes) = Frigg, diosa del hogar'] })],
        notes: 'Unir parejas con nota. Curiosidad para Inglés: los nombres de los días son una herencia de los pueblos germánicos del norte.' },
      { title: 'Más granjeros que guerreros', layout: 'titleOnly', bg: BG, extra: [
        model('kk-Barbarian', 70, 160, 360, 480, { caption: '', view: 'front', motion: 'swing' }),
        chartBlock({ x: 450, y: 160, w: 480, h: 480, chartType: 'radar', color: AUR, yMin: 0, yMax: 10, data: [['Granja', 9], ['Pesca', 6], ['Artesanía', 5], ['Comercio', 6], ['Viajes e incursiones', 3]].map(([label, value]) => ({ label, value })) }),
        on(text('La mayoría pasaba el año <b>sembrando, cuidando el ganado y pescando</b>. Las incursiones eran cosa de unas semanas en verano.', 960, 220, 260, 330, { fontSize: 22, color: ICE }), 'fade-left')],
        notes: 'Radar de 0 a 10 con el tiempo que se dedicaba a cada tarea (estimación para el aula). El guerrero 3D se balancea al entrar; se puede girar con el ratón.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué ciudad fundaron los vikingos?', ['Dublín', 'Lisboa', 'Atenas', 'Venecia'], 0)],
        notes: 'Dublín nació como un puerto vikingo hacia el año 841. También fundaron o poblaron York y Kiev.' },
      { layout: 'blank', bg: BG, transition: 'convex', extra: [...fjord(),
        pollBlock({ kind: 'rating', question: '¿Te habrías embarcado en un drakkar? (1 = jamás, 5 = ¡ya!)', display: 'numbers', fontSize: 40, x: 60, y: 50, w: 1160, h: 560 }),
        credits(['kk-Barbarian'], 90, 650, 1100, '#6b7f99')],
        notes: 'Valoración anónima del 1 al 5. Pedir a alguien con un 1 y a alguien con un 5 que expliquen su respuesta.' },
    ]));
  } },

  // 8 · The Silk Road: deep indigo and saffron like a silk scroll. Silk ribbons and a caravan, a parchment
  // map with the route drawn as you present, goods going each way, a waterfall of the price of silk, a
  // merchant's accounts with formulas, a 3D lantern for the caravanserais with an equation, and an order activity.
  edu_hist_silkroad: { name: 'La Ruta de la Seda', cat: 'edu', summary: 'Seda y azafrán: caravana en marcha, mapa con ruta que se traza, cascada del precio, tabla con fórmulas, farol 3D, ecuación y ordenar', make: () => {
    const BG = '#1d0f2b', SAF = '#f2a541', JADE = '#2bb59a', CRIM = '#d7263d', SILK = '#f7e7ce', H = pairStacks('editorial').heading, INK = '#3a2a1a';
    return numbered(build({ name: 'La Ruta de la Seda', palette: 'violet', fonts: 'editorial', title: { size: 48, color: SAF } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        shape('wave', -60, 420, 1400, 200, CRIM, { fill2: SAF, gradAngle: 0, opacity: 85 }), shape('wave', -60, 500, 1400, 180, JADE, { fill2: '#6b3fa0', gradAngle: 0, opacity: 70 }),
        glow(820, -220, 640, SAF, BG, 30),
        withAnims(img(CAMELS, -40, 300, 420, 120, 'Caravana de camellos'), path([[360, 0], [760, 0]], { start: 'afterPrev', duration: 9000 })),
        kicker('SIGLO II a. C. – SIGLO XV', 90, 110, 600, SAF),
        text('La Ruta<br>de la Seda', 84, 140, 760, 180, { fontFamily: H, fontSize: 76, fontWeight: 700, lineHeight: 1.08, color: SILK }),
        text('Chang’an · Samarcanda · Bagdad · Constantinopla · ', 860, 90, 330, 330, { fontSize: 22, curve: 100, color: SAF, textAlign: 'center' }),
        shape('ellipse', 935, 165, 180, 180, CRIM, { fill2: '#7a1030', gradType: 'radial' }), text('7.000<br><span style="font-size:22px">km</span>', 935, 165, 180, 180, { fontFamily: H, fontSize: 44, color: SILK, textAlign: 'center', vAlign: 'middle' })],
        notes: 'La caravana cruza la portada despacio, ella sola. La ruta no era un camino único, sino una red de caminos entre China y el Mediterráneo; el nombre se lo puso un geógrafo en el siglo XIX.' },
      { title: 'De Chang’an a Constantinopla', layout: 'titleOnly', bg: BG, extra: [
        img(SILK_MAP, 90, 175, 1100, 420, 'Mapa de la Ruta de la Seda con desiertos, montañas y ciudades'),
        { ...ink(SILK_CITIES.map(([, x, y]) => [90 + x, 175 + y]), CRIM, 5, { dash: 'dash' }), animation: A('draw', { duration: 3000, sound: 'whoosh' }) },
        ...SILK_CITIES.flatMap(([c, x, y], i) => [after(shape('ellipse', 90 + x - 9, 175 + y - 9, 18, 18, CRIM, { stroke: '#ffffff', strokeWidth: 3 }), 'zoom-in', { duration: 250, sound: 'pop' }),
          along(text(c, 90 + x - 80, 175 + y + (i % 2 ? 14 : -46), 160, 34, { fontSize: 19, fontWeight: 700, color: INK, textAlign: 'center' }), 'fade-in')]),
        text('Una caravana tardaba más de medio año en recorrerla entera… y casi nadie lo hacía: las mercancías cambiaban de manos en cada ciudad.', 90, 610, 1100, 70, { fontSize: 22, color: SILK, textAlign: 'center' })],
        notes: 'Un clic: la ruta se traza de este a oeste y las ciudades se encienden una tras otra. Mapa simplificado, sin escala.' },
      { title: 'Lo que viajaba', layout: 'titleOnly', bg: BG, extra: [
        text('← Hacia el oeste', 90, 180, 500, 50, { fontFamily: H, fontSize: 32, color: SAF }), text('Hacia el este →', 690, 180, 500, 50, { fontFamily: H, fontSize: 32, color: JADE, textAlign: 'right' }),
        shape('rect', 638, 180, 4, 470, '#ffffff30'),
        ...['Seda', 'Papel', 'Porcelana', 'Té', 'Pólvora'].map((t, i) => (i ? along : on)(card(t, 90, 250 + i * 80, 500, 64, '#f2a54122', { fontSize: 26, color: SILK, radius: 32, pad: [0, 28, 0, 28], vAlign: 'middle' }), 'fade-left', { delay: i * 150 })),
        ...['Oro y plata', 'Vidrio', 'Caballos', 'Lana', 'Vino'].map((t, i) => on(card(t, 690, 250 + i * 80, 500, 64, '#2bb59a22', { fontSize: 26, color: SILK, radius: 32, pad: [0, 28, 0, 28], vAlign: 'middle', textAlign: 'right' }), 'fade-right', { start: i ? 'withPrev' : 'click', delay: i * 150 }))],
        notes: 'Dos clics: primero lo que iba de China hacia Occidente, luego lo que viajaba al revés. Pregunta: ¿qué cosa de las dos listas sigue llegando hoy de Asia?' },
      { title: 'Lo que costaba un rollo de seda', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 170, w: 800, h: 480, chartType: 'waterfall', color: SAF, dataLabels: true,
          data: [{ label: 'Chang’an', value: 10 }, { label: 'Dunhuang', value: 6 }, { label: 'Kashgar', value: 12 }, { label: 'Samarcanda', value: 15 }, { label: 'Bagdad', value: 20 }, { label: 'Constantinopla', value: 37 }, { label: 'Total', value: 0 }] }),
        on(stat('× 10', 'se multiplicaba el precio de la seda entre China y el Mediterráneo', 920, 200, 290, CRIM, SILK, 72, { h: 240 }), 'zoom-in', { sound: 'drumroll' }),
        text('Cifras inventadas, en monedas de plata, para ver la idea: cada intermediario cobraba su parte.', 920, 480, 290, 140, { fontSize: 19, color: '#b8a8cf', fontStyle: 'italic' })],
        notes: 'Gráfico de cascada: cada ciudad suma su ganancia y la barra final se calcula sola. Por eso Europa buscó luego una ruta por mar para comprar directamente.' },
      { title: 'Las cuentas de un mercader', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 760, h: 380, fontSize: 25, header: true, headBg: CRIM, headFg: '#ffffff', stroke: '#5a4470', banded: true, band: '#6b3fa0',
          rows: [['Mercancía', 'Cantidad', 'Precio (dinares)', 'Total'], ['Rollos de seda', '12', '9', '=B2*C2'], ['Bolsas de pimienta', '20', '4', '=B3*C3'], ['Cuencos de porcelana', '30', '2', '=B4*C4'], ['Ladrillos de té', '15', '3', '=B5*C5'], ['<b>Total</b>', '', '', '=SUMA(D2:D5)']], colW: [5, 3, 4, 3] }),
        on(card(`<div style="font-family:${H};font-size:30px;color:#6b3fa0;margin-bottom:8px">Reto</div>Si en Bagdad la seda se paga a <b>15 dinares</b>, ¿cuánto gana el mercader con sus 12 rollos?`, 890, 190, 310, 300, '#ffffff', { fontSize: 23, color: INK, borderColor: SAF, radius: 10 }), 'fade-left'),
        text('Precios inventados. La columna «Total» y la última fila son fórmulas.', 90, 590, 760, 40, { fontSize: 19, color: '#b8a8cf', fontStyle: 'italic' })],
        notes: 'Tabla con fórmulas (=B2*C2 y =SUMA): si se cambia una cantidad, todo se recalcula. Solución del reto: 12 × (15 − 9) = 72 dinares de ganancia.' },
      { title: 'Caravasares: una posada cada día', layout: 'titleOnly', bg: BG, extra: [glow(40, 160, 520, SAF, BG, 30),
        model('kh-Lantern', 90, 170, 420, 470, { caption: '', autoRotate: true, view: 'three', motion: 'float' }),
        mathBlock({ x: 560, y: 190, w: 640, h: 120, fontSize: 40, latex: '\\text{días} = \\frac{7000\\ \\text{km}}{30\\ \\text{km/día}} \\approx 233', color: SILK }),
        on(text('Una caravana avanzaba unos <b>30 km al día</b>. Por eso cada jornada había un <b>caravasar</b>: patio para los camellos, agua, comida, cama… y noticias de todas partes.', 560, 340, 640, 200, { fontSize: 26, color: SILK }), 'fade-up'),
        credits(['kh-Lantern'], 560, 620, 640, '#8f7fa8')],
        notes: 'El farol 3D gira y flota. La ecuación da unos ocho meses de viaje (cifras aproximadas). En los caravasares se mezclaban lenguas, religiones e ideas.' },
      { title: 'No solo viajaban mercancías', layout: 'titleOnly', bg: BG, extra: [
        dg('cards', 'Ideas\n  Matemáticas y medicina\nReligiones\n  Budismo, islam, cristianismo\nInventos\n  Papel, brújula, pólvora\nEnfermedades\n  La peste negra, en 1347', 90, 190, 1100, 420, { colors: 'colorful', oneByOne: true })],
        notes: 'Tarjetas una a una. La peste negra llegó a Europa por estas rutas comerciales y mató a un tercio de la población.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', question: 'Ordena las ciudades de este a oeste', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: SILK_CITIES.map(c => c[0]).filter(c => c !== 'Merv') })],
        notes: 'Actividad «Ordenar» con nota: si dudan, volver al mapa. Empieza en Chang’an (hoy Xi’an, en China) y termina en Constantinopla (hoy Estambul).' },
    ]));
  } },

  // 9 · The Maya: jungle green, jade and sun. A stepped pyramid among leaves, numbers drawn with dots
  // and bars one by one, a 7 that travels into base 20 with Transform and an equation, a quiz, two
  // calendar wheels that turn at different speeds, the serpent of light on the stairs, cacao money in a table and a vote.
  edu_hist_maya: { name: 'Los mayas: tiempo y estrellas', cat: 'edu', summary: 'Selva y jade: números de puntos y rayas, Transformar a base 20, ecuación, ruedas de calendario que giran, serpiente de luz y cacao', make: () => {
    const BG = '#0f2a1d', JADE = '#3fbf8f', SUN = '#f6c344', STONE = '#e8e2cc', LEAF = '#1f5c3a', CACAO = '#6b3e26', INK = '#1d2a22', H = pairStacks('friendly').heading;
    const s7 = [uid(), uid(), uid()];
    // A Maya number from 1 to 19 (or 0, a shell): dots above, bars below, centred in a box of width w.
    const mnum = (n, x, y, w, color, ids = []) => { if (!n) return [img(SHELL, x + w / 2 - 50, y + 20, 100, 66, 'Concha: el cero maya')];
      const bars = Math.floor(n / 5), dots = n % 5, out = [], bh = 18, gap = 10, dh = 22;
      let yy = y; if (dots) { const dw = dots * dh + (dots - 1) * 10; for (let i = 0; i < dots; i++) out.push(shape('ellipse', x + (w - dw) / 2 + i * (dh + 10), yy, dh, dh, color)); yy += dh + gap; }
      for (let i = 0; i < bars; i++) { out.push(shape('rounded', x + w * 0.12, yy, w * 0.76, bh, color, { radius: 9 })); yy += bh + gap; }
      return out.map((b, i) => (ids[i] ? keep(b, ids[i]) : b)); };
    const leaves = [[-60, 420, 220, -30], [1120, 380, 240, 40], [40, 520, 200, -60], [1060, 520, 200, 70], [-40, 260, 180, -10]].map(([x, y, s, r], i) => shape('teardrop', x, y, s, s * 1.4, i % 2 ? LEAF : '#28704a', { rotation: r, opacity: 90 }));
    return numbered(build({ name: 'Los mayas: tiempo y estrellas', palette: 'forest', fonts: 'friendly', title: { size: 50, color: SUN }, body: { color: STONE } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [glow(620, -240, 760, SUN, BG, 35),
        img(MAYA_PYR, 600, 250, 600, 420, 'Pirámide escalonada maya'), ...leaves,
        kicker('MESOAMÉRICA · 2000 a. C. – 1500', 90, 200, 600, JADE),
        text('Los mayas', 84, 236, 560, 130, { fontFamily: H, fontSize: 92, fontWeight: 800, color: STONE }),
        text('Contar el tiempo, leer el cielo', 90, 370, 520, 60, { fontSize: 34, color: SUN })],
        notes: 'Los mayas vivieron en el sur de México, Guatemala y Belice. No desaparecieron: hoy más de seis millones de personas hablan lenguas mayas.' },
      { title: 'Números de puntos y rayas', layout: 'titleOnly', bg: BG, extra: [
        ...[0, 1, 4, 5, 7, 13, 19].flatMap((n, i) => { const x = 90 + i * 158;
          return [on(shape('rounded', x, 200, 140, 260, '#ffffff0d', { stroke: '#3fbf8f60', strokeWidth: 2, radius: 14 }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' }),
            ...mnum(n, x + 10, 230, 120, SUN, n === 7 ? s7 : []).map(b => along(b, 'zoom-in', { duration: 300 })),
            along(text(String(n), x, 400, 140, 50, { fontFamily: H, fontSize: 40, fontWeight: 800, color: STONE, textAlign: 'center' }), 'fade-up')]; }),
        text('<b style="color:#f6c344">•</b> punto = 1 &nbsp;&nbsp; <b style="color:#f6c344">▬</b> raya = 5 &nbsp;&nbsp; concha = 0', 90, 500, 1100, 50, { fontSize: 30, color: STONE, textAlign: 'center' }),
        text('Fueron de los primeros pueblos del mundo en usar el cero.', 90, 570, 1100, 50, { fontSize: 24, color: JADE, textAlign: 'center' })],
        notes: 'Un clic y los números aparecen uno tras otro. Pedir que adivinen el siguiente antes de que salga. El 7 es una raya y dos puntos: en la siguiente diapositiva viaja (Transformar).' },
      { title: 'Contaban de 20 en 20', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        shape('rounded', 120, 180, 300, 440, '#ffffff0d', { stroke: '#3fbf8f60', strokeWidth: 2, radius: 14 }), shape('rect', 140, 398, 260, 3, '#3fbf8f80'),
        ...mnum(2, 150, 260, 240, SUN), ...mnum(7, 150, 480, 240, SUN, s7),
        text('× 20', 430, 250, 140, 50, { fontSize: 30, color: JADE }), text('× 1', 430, 480, 140, 50, { fontSize: 30, color: JADE }),
        on(mathBlock({ x: 580, y: 230, w: 620, h: 110, fontSize: 52, latex: '2 \\cdot 20 + 7 = 47', color: STONE }), 'fade-in'),
        on(text('Igual que nosotros: la <b>posición</b> dice cuánto vale cada piso. Pero en lugar de 10, 100, 1.000… los mayas usaban 1, 20, 400…', 580, 380, 620, 200, { fontSize: 27, color: STONE }), 'fade-up')],
        notes: 'Transformar: el 7 de la diapositiva anterior baja al piso de las unidades. Los números mayas se escriben de arriba abajo: el piso de arriba vale veinte veces más.' },
      { layout: 'blank', bg: STONE, extra: [quiz('¿Cuánto vale un número maya con dos rayas y dos puntos?', ['7', '12', '22', '4'], 1)],
        notes: 'Dos rayas (5 + 5) y dos puntos (1 + 1): 12. Concurso con tiempo y puntos.' },
      { title: 'Dos calendarios que engranan', layout: 'titleOnly', bg: BG, extra: [
        on(img(GEAR(26, '#2f8f68', '260'), 90, 180, 300, 300, 'Rueda del calendario sagrado de 260 días'), 'spin360', { duration: 5000 }),
        along(img(GEAR(36, '#b8892a', '365'), 330, 270, 380, 380, 'Rueda del calendario solar de 365 días'), 'spin360', { duration: 7000 }),
        text("<b style=\"color:#3fbf8f\">Tzolk’in</b> · 260 días<br>13 × 20: el calendario de las fiestas.", 740, 190, 460, 100, { fontSize: 24, color: STONE }),
        text("<b style=\"color:#f6c344\">Haab’</b> · 365 días<br>18 meses de 20 días + 5 días «sin nombre».", 740, 310, 460, 100, { fontSize: 24, color: STONE }),
        on(mathBlock({ x: 740, y: 450, w: 460, h: 90, fontSize: 30, latex: '\\mathrm{mcm}(260,\\,365) = 18\\,980\\ \\text{días}', color: SUN }), 'fade-in'),
        on(text('= <b>52 años</b>: la «rueda calendárica», como nuestro siglo.', 740, 560, 460, 70, { fontSize: 24, color: STONE }), 'fade-up')],
        notes: 'Primer clic: las dos ruedas giran a la vez a distinta velocidad. Las mismas dos fechas solo vuelven a coincidir cada 52 años (mínimo común múltiplo).' },
      { title: 'La serpiente de luz', layout: 'titleOnly', bg: '#1a1f3a', extra: [glow(900, 120, 420, SUN, '#1a1f3a', 50),
        img(MAYA_PYR, 90, 190, 640, 448, 'Pirámide de Kukulcán'),
        ...Array.from({ length: 7 }, (_, i) => (i ? after : on)(shape('triangle', 400, 230 + i * 56, 34, 44, SUN, { rotation: 90, opacity: 90 }), 'fade-in', { duration: 300, ...(i ? {} : { sound: 'chime' }) })),
        text('En los equinoccios de primavera y otoño, el sol de la tarde dibuja en la escalera de la pirámide de Kukulcán (Chichén Itzá) <b>una serpiente de luz</b> que baja hasta la cabeza de piedra.', 780, 220, 420, 260, { fontSize: 25, color: STONE }),
        text('20 de marzo · 22 de septiembre', 780, 520, 420, 50, { fontSize: 26, fontWeight: 800, color: SUN })],
        notes: 'Un clic: los triángulos de luz aparecen escalón a escalón, como la sombra que baja. Muestra lo bien que conocían el movimiento del sol.' },
      { title: '<span style="color:#6b3e26">El cacao era dinero</span>', layout: 'titleOnly', bg: STONE, extra: [
        tableBlock({ x: 90, y: 180, w: 760, h: 380, fontSize: 25, header: true, headBg: CACAO, headFg: '#ffffff', stroke: '#c9bfa0', banded: true, band: '#f3eedd',
          rows: [['En el mercado', 'Precio (granos)', 'Cantidad', 'Total'], ['Tomate grande', '1', '4', '=B2*C2'], ['Aguacate maduro', '3', '2', '=B3*C3'], ['Tamal', '1', '3', '=B4*C4'], ['Conejo', '30', '1', '=B5*C5'], ['<b>Total</b>', '', '', '=SUMA(D2:D5)']], colW: [5, 4, 3, 3] }),
        on(stat('200', 'granos de cacao costaba un pavo', 890, 200, 310, CACAO, INK, 90), 'zoom-in', { sound: 'pop' }),
        on(text('Con el cacao también se preparaba una bebida amarga y espumosa: el antepasado del chocolate.', 890, 420, 310, 160, { fontSize: 22, color: INK }), 'fade-up'),
        text('Precios aproximados de una lista mesoamericana del siglo XVI.', 90, 590, 760, 40, { fontSize: 19, color: '#6f6a55', fontStyle: 'italic' })],
        notes: 'Tabla con fórmulas: la cesta de la compra se suma sola. Reto: ¿cuántos tomates podrías comprar con lo que cuesta un pavo?' },
      { layout: 'blank', bg: STONE, extra: [pollBlock({ kind: 'choice', question: '¿Qué aportación maya te parece más asombrosa?', display: 'pie', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: ['El cero', 'El calendario', 'Las pirámides', 'El chocolate'] })],
        notes: 'Votación en directo con gráfico circular. Pedir que justifiquen: ¿por qué el cero es tan importante?' },
    ]));
  } },

  // 10 · The printing press: cream paper, black ink and a red rubric, like a page from 1460. A red initial
  // letter, type blocks with mirrored letters that line up in the composing stick with Transform, a press
  // whose platen comes down with sound, figures with a drumroll, a bar chart, a process and fill-in-the-gaps.
  edu_hist_printing: { name: 'La imprenta: el libro se multiplica', cat: 'edu', summary: 'Página incunable: letra capital roja, tipos al revés que se componen con Transformar, prensa que baja con sonido, cifras, barras y huecos', make: () => {
    const PAPER = '#f3ecdf', INK = '#1b1b1b', RUB = '#b0201c', GREY = '#6b6b6b', H = pairStacks('classic').heading;
    const ids = 'LIBRO'.split('').map(() => uid());
    // A type block: a metal piece with its letter mirrored.
    const sort = (ch, x, y, s = 90, props = {}) => text(`<span style="display:inline-block;transform:scaleX(-1)">${ch}</span>`, x, y, s, s * 1.15,
      { fontFamily: H, fontSize: Math.round(s * 0.7), fontWeight: 700, color: '#2a2a2a', bg: '#b9b4ab', radius: 4, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], shadow: { x: 4, y: 4, blur: 0, color: '#7d786f' }, ...props });
    const page = () => [shape('rect', 60, 40, 1160, 640, 'none', { stroke: '#d8ccb4', strokeWidth: 2 })];
    return numbered(build({ name: 'La imprenta: el libro se multiplica', palette: 'grayscale', fonts: 'classic', title: { size: 50, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [...page(),
        text('L', 110, 110, 220, 220, { fontFamily: H, fontSize: 190, color: '#ffffff', bg: RUB, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 20, 0], borderColor: INK }),
        text('a imprenta', 350, 150, 820, 160, { fontFamily: H, fontSize: 120, color: INK }),
        text('Hacia 1450, un taller de Maguncia empezó a imprimir libros con letras de metal que se podían mover y volver a usar.', 110, 370, 760, 110, { fontSize: 28, color: '#3a3a3a' }),
        ...'IMPRENTA'.split('').map((ch, i) => (i ? after : on)(sort(ch, 110 + i * 100, 530, 80), 'fade-down', { duration: 250, start: 'afterPrev', sound: 'click' })),
        text('HISTORIA · EL FIN DE LA EDAD MEDIA', 640, 64, 540, 30, { fontSize: 16, letterSpacing: 4, color: RUB, textAlign: 'right' })],
        notes: 'Portada como la página de un libro antiguo: capital roja y texto negro. Los tipos caen solos uno a uno con un clic metálico: fíjate en que las letras están al revés.' },
      { title: 'Copiar a mano o imprimir', layout: 'titleOnly', bg: PAPER, extra: [
        shape('rect', 638, 190, 4, 430, '#d8ccb4'),
        text('<b>Un copista</b>', 90, 190, 520, 50, { fontFamily: H, fontSize: 34, color: RUB, textAlign: 'center' }), text('<b>Una imprenta</b>', 670, 190, 520, 50, { fontFamily: H, fontSize: 34, color: RUB, textAlign: 'center' }),
        on(stat('≈ 4', 'páginas al día, escritas a pluma', 90, 270, 520, INK, '#3a3a3a', 110, { textAlign: 'center' }), 'zoom-in', { sound: 'pop' }),
        on(stat('≈ 3.600', 'páginas al día, con una sola prensa', 670, 270, 520, RUB, '#3a3a3a', 110, { textAlign: 'center' }), 'zoom-in', { sound: 'drumroll' }),
        on(text('Un libro que costaba meses de trabajo se hacía en días… y salía mucho más barato.', 90, 560, 1100, 60, { fontSize: 28, fontStyle: 'italic', color: '#3a3a3a', textAlign: 'center' }), 'fade-up')],
        notes: 'Cifras aproximadas que se suelen citar para el siglo XV. La diferencia es de casi mil veces: pedir que calculen cuántos días tardaría un copista en hacer lo de un día de imprenta.' },
      { title: 'Letras de metal, al revés', layout: 'titleOnly', bg: PAPER, extra: [
        shape('rect', 90, 180, 700, 450, '#8a6a45', { stroke: '#5a4128', strokeWidth: 4 }),
        ...Array.from({ length: 24 }, (_, i) => shape('rect', 104 + (i % 6) * 112, 194 + Math.floor(i / 6) * 107, 100, 95, '#6b4f32')),
        ...'LIBRO'.split('').map((ch, i) => keep(sort(ch, [140, 590, 360, 250, 470][i], [215, 430, 320, 525, 215][i], 60), ids[i])),
        text('Cada letra es una pieza de metal (un <b>tipo</b>) con la forma <b>al revés</b>, como un sello. Se guardaban en una caja con un cajetín para cada letra.', 830, 200, 370, 300, { fontSize: 25, color: INK }),
        text('Por eso decimos «mayúsculas» y «minúsculas»: estaban en la parte alta y baja de la caja.', 830, 500, 370, 130, { fontSize: 20, fontStyle: 'italic', color: GREY })],
        notes: 'Las cinco letras de LIBRO están repartidas por la caja. En la siguiente diapositiva se ordenan solas en el componedor (Transformar). La anécdota de mayúsculas y minúsculas es más cierta en inglés (upper case, lower case).' },
      { title: 'Componer e imprimir', layout: 'titleOnly', bg: PAPER, autoAnimate: true, extra: [
        shape('rect', 90, 300, 560, 120, '#6b6b6b', { stroke: '#3a3a3a', strokeWidth: 3 }),
        ...'LIBRO'.split('').map((ch, i) => keep(sort(ch, 110 + (4 - i) * 104, 315, 90), ids[i])),
        text('En el componedor se leen al revés y de derecha a izquierda…', 90, 200, 560, 80, { fontSize: 24, color: GREY }),
        on(shape('rightarrow', 680, 330, 90, 60, RUB), 'fade-right', { sound: 'click' }),
        after(text('LIBRO', 800, 290, 400, 140, { fontFamily: H, fontSize: 110, fontWeight: 700, color: INK, letterSpacing: 6 }), 'fade-in', { duration: 900 }),
        after(text('…y al imprimir, ¡se leen bien!', 800, 450, 400, 60, { fontSize: 26, color: RUB, fontStyle: 'italic' }), 'fade-up')],
        notes: 'Transformar: cada tipo vuela desde la caja hasta su sitio. Un clic: se imprime la palabra. Ejercicio: escribir su nombre como lo vería un cajista (en espejo y al revés).' },
      { title: 'La prensa', layout: 'titleOnly', bg: PAPER, extra: [
        img(PRESS, 90, 170, 380, 470, 'Prensa de imprenta de madera'),
        withAnims(img(PLATEN, 168, 357, 224, 52, 'Platina de la prensa'), path([[0, 110]], { duration: 700, sound: 'click' }), path([[0, -110]], { start: 'afterPrev', duration: 700, delay: 300 })),
        ...[['Fundir los tipos', 'Metal fundido en moldes, letra a letra'], ['Componer', 'Ordenar los tipos en líneas y páginas'], ['Entintar', 'Tinta grasa, con bolas de cuero'], ['Prensar', 'La platina aprieta el papel contra los tipos'], ['Secar y encuadernar', 'Pliegos al aire; luego, coser el libro']]
          .map(([h, d], i) => on(text(`<div style="display:flex;gap:18px;align-items:center"><span style="flex:0 0 52px;height:52px;border-radius:26px;background:${RUB};color:#fff;font-weight:700;text-align:center;line-height:52px;font-size:28px">${i + 1}</span><span><b style="font-family:${H};font-size:28px">${h}</b><br><span style="color:${GREY}">${d}</span></span></div>`, 540, 180 + i * 92, 660, 84, { fontSize: 21, color: INK, vAlign: 'middle' }), 'fade-left'))],
        notes: 'Primer clic: la platina baja con un golpe y vuelve a subir (dos trayectorias encadenadas). Después, un clic por paso del proceso. La idea de la prensa venía de las prensas de uva y aceite.' },
      { title: 'Una explosión de libros', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 80, y: 170, w: 760, h: 470, chartType: 'bar', color: RUB, dataLabels: true, grid: true, yTitle: 'millones de libros',
          data: [['1454–1500', 12.6], ['Siglo XVI', 217], ['Siglo XVII', 533], ['Siglo XVIII', 1000]].map(([label, value]) => ({ label, value })) }),
        on(text(`<span style="float:left;font-family:${H};font-size:86px;line-height:.85;color:${RUB};margin:6px 10px 0 0">E</span>n cincuenta años se imprimieron más libros que en los mil años anteriores copiados a mano.`, 880, 210, 320, 260, { fontSize: 25, color: INK }), 'fade-left'),
        text('Estimaciones de historiadores económicos, redondeadas.', 880, 560, 320, 70, { fontSize: 18, fontStyle: 'italic', color: GREY })],
        notes: 'Cifras aproximadas de libros impresos en Europa occidental. Pregunta: ¿qué pasa en una sociedad cuando los libros dejan de ser un lujo?' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'gaps', question: 'Completa la historia de la imprenta', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        text: 'Hacia el año [1450], Johannes [Gutenberg] desarrolló en Maguncia la imprenta de tipos [móviles]. Cada tipo llevaba la letra al [revés]. Uno de los primeros grandes libros impresos fue la [Biblia].' })],
        notes: 'Completar huecos desde el móvil (no distingue mayúsculas ni tildes). En China y Corea ya se imprimía con tipos móviles siglos antes, con otros materiales.' },
      { layout: 'blank', bg: PAPER, transition: 'page', extra: [pollBlock({ kind: 'choice', question: '¿Cuál es la «imprenta» de nuestra época?', display: 'bar', fontSize: 40, x: 60, y: 50, w: 1160, h: 620,
        options: ['Internet', 'El móvil', 'La inteligencia artificial', 'Las redes sociales'] })],
        notes: 'Votación en directo para cerrar con un debate: ¿qué invento ha cambiado tanto como la imprenta la forma de compartir ideas?' },
    ]));
  } },
};
