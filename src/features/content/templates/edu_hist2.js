// Example presentations: Historia moderna y contemporánea para el aula. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Ten topics, each with its own look: a portolan chart, soot and brick, an engraved
// encyclopedia plate, a telegraph office, a trench map, Art Deco gold, the suffragette colours, mission control,
// the concrete of the Berlin Wall and a green phosphor terminal.

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
// A stroke through points on the slide (a route, a wall, a cable): an ink object, so it can be drawn as you present.
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// Points relative to the first one (for path()).
const rel = pts => pts.map(([x, y]) => [Math.round(x - pts[0][0]), Math.round(y - pts[0][1])]).slice(1);
// An exact rectangle: the editor draws 'rect' 2 % inside its box on every side, so the box is made a little
// bigger (a full-slide band then really reaches the edges, and thin rules line up with the text).
const rect = (x, y, w, h, fill, props = {}) => { const W = Math.round(w * 25 / 24), H = Math.round(h * 25 / 24);
  return shape('rect', Math.round(x - (W - w) / 2), Math.round(y - (H - h) / 2), W, H, fill, props); };
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A round numbered badge.
const badge = (n, x, y, d, bg, fg = '#ffffff', props = {}) => text(String(n), x, y, d, d, { fontSize: Math.round(d * 0.5), fontWeight: 800, color: fg, bg, radius: d / 2, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], ...props });
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 44, x: 60, y: 40, w: 1160, h: 640, ...props });
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:6px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 80), { fontSize: 24, color: fg, ...props });
// The credits of the 3D models of a deck, in one small line.
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });
// A small deterministic random (the same drawing every time).
const rnd = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
// Font stacks used for a look of their own (handwriting, typewriter, terminal, posters).
const HAND = "'Caveat', cursive", TYPE = "'Courier New', monospace", MONO = "'JetBrains Mono', monospace", DECO = "'Abril Fatface', serif", STENCIL = "'Oswald', sans-serif";

// ---- Drawings ---------------------------------------------------------------------
// 1 · The first voyage round the world: a portolan chart. Rhumb lines from two wind roses, a compass rose,
// and the world drawn from Spain westwards to Spain again (longitude −400° … +5°), so the route always runs left.
const RHUMBS = svgURL(1280, 720, [[980, 300], [260, 520]].map(([cx, cy], k) => Array.from({ length: 32 }, (_, i) => {
  const t = i * Math.PI / 16; return `<path d="M${cx} ${cy} L${(cx + 1600 * Math.cos(t)).toFixed(0)} ${(cy + 1600 * Math.sin(t)).toFixed(0)}" stroke="${['#b8361e', '#2f6b5e', '#3b2a1a', '#2f6b5e'][i % 4]}" stroke-width="${i % 4 ? 0.8 : 1.4}" opacity=".32"/>`; }).join('')).join('')
  + '<rect x="18" y="18" width="1244" height="684" fill="none" stroke="#8a6a3a" stroke-width="3"/><rect x="28" y="28" width="1224" height="664" fill="none" stroke="#8a6a3a" stroke-width="1"/>');
const ROSE = svgURL(400, 400, '<circle cx="200" cy="200" r="190" fill="#f3e6c4" stroke="#3b2a1a" stroke-width="3"/><circle cx="200" cy="200" r="172" fill="none" stroke="#3b2a1a" stroke-width="1.5"/>'
  + Array.from({ length: 64 }, (_, i) => { const t = i * Math.PI / 32, r0 = i % 2 ? 176 : 168; return `<path d="M${(200 + r0 * Math.cos(t)).toFixed(1)} ${(200 + r0 * Math.sin(t)).toFixed(1)} L${(200 + 188 * Math.cos(t)).toFixed(1)} ${(200 + 188 * Math.sin(t)).toFixed(1)}" stroke="#3b2a1a" stroke-width="1.5"/>`; }).join('')
  + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * 45 - 90, long = i % 2 === 0, R = long ? 165 : 110, w = long ? 22 : 16, t = a * Math.PI / 180, n = (a + 90) * Math.PI / 180;
    const tip = `${(200 + R * Math.cos(t)).toFixed(1)},${(200 + R * Math.sin(t)).toFixed(1)}`, l = `${(200 + w * Math.cos(n)).toFixed(1)},${(200 + w * Math.sin(n)).toFixed(1)}`, r = `${(200 - w * Math.cos(n)).toFixed(1)},${(200 - w * Math.sin(n)).toFixed(1)}`;
    return `<polygon points="200,200 ${tip} ${l}" fill="${long ? '#b8361e' : '#2f6b5e'}"/><polygon points="200,200 ${tip} ${r}" fill="${long ? '#7a1f10' : '#1e4a40'}"/>`; }).join('')
  + '<circle cx="200" cy="200" r="14" fill="#c08a2b" stroke="#3b2a1a" stroke-width="2"/>'
  + '<path d="M200 6 q-14 18 0 34 q14 -16 0 -34Z M186 30 q-14 -4 -14 8 q8 2 14 -8Z M214 30 q14 -4 14 8 q-8 2 -14 -8Z" fill="#b8361e"/>');
const NAO = svgURL(90, 80, '<path d="M8 50 Q45 70 84 50 L78 62 Q45 76 14 62Z" fill="#5a3a1e"/><path d="M44 8 V52" stroke="#3b2a1a" stroke-width="3"/><path d="M24 14 V50" stroke="#3b2a1a" stroke-width="2"/>'
  + '<path d="M30 12 Q46 26 30 44 H58 Q72 26 58 12Z" fill="#f6efdc" stroke="#3b2a1a" stroke-width="1.5"/><path d="M14 18 Q22 30 14 42 H32 Q38 30 32 18Z" fill="#f6efdc" stroke="#3b2a1a" stroke-width="1.5"/>'
  + '<path d="M38 22 h12 M44 16 v12" stroke="#b8361e" stroke-width="3"/><path d="M44 8 l12 -4 v6Z" fill="#b8361e"/>');
const GW = 1100, GH = 470, G = (lon, lat) => [Math.round((lon + 400) / 405 * GW), Math.round((60 - lat) / 120 * GH)];
const LANDS = [
  [[-165, 60], [-130, 56], [-124, 40], [-110, 23], [-95, 16], [-80, 8], [-80, -5], [-72, -20], [-73, -40], [-70, -54], [-65, -55], [-58, -38], [-48, -28], [-40, -22], [-35, -7], [-50, 0], [-60, 10], [-75, 11], [-83, 12], [-90, 20], [-97, 27], [-82, 26], [-80, 25], [-76, 35], [-70, 42], [-60, 47], [-55, 52], [-65, 60]],
  [[-10, 60], [-5, 58], [-2, 50], [-9, 43], [-9, 37], [-6, 36], [-10, 30], [-17, 21], [-17, 14], [-8, 5], [9, 4], [12, -5], [15, -28], [20, -35], [35, -25], [40, -15], [51, 11], [43, 12], [32, 31], [35, 36], [30, 45], [30, 60]],
  [[30, 60], [140, 60], [142, 45], [122, 30], [108, 20], [105, 10], [100, 2], [98, 15], [90, 22], [80, 8], [72, 20], [57, 25], [50, 30], [35, 32], [30, 45]],
  [[114, -22], [130, -12], [142, -11], [153, -27], [147, -38], [135, -35], [115, -34]],
];
const ISLES = [[122, 12, 14, 26], [114, 1, 30, 20], [140, -5, 34, 12], [103, 0, 10, 26]];
const WORLD = (() => { let s = '<rect width="1100" height="470" rx="16" fill="#efe0bb"/>';
  for (const sh of [0, -360]) {
    s += LANDS.map(l => `<polygon points="${l.map(([lo, la]) => G(lo + sh, la).join(',')).join(' ')}" fill="#d9c08c" stroke="#8a6a3a" stroke-width="2"/>`).join('');
    s += ISLES.map(([lo, la, rx, ry]) => { const [x, y] = G(lo + sh, la); return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry / 2}" fill="#d9c08c" stroke="#8a6a3a" stroke-width="2"/>`; }).join(''); }
  s += '<g font-family="Georgia,serif" font-style="italic" fill="#2f6b5e" font-size="20">' + [['Mar Océano', -50, 15], ['Mar del Sur', -150, -28], ['Océano Índico', -285, -18]].map(([t, lo, la]) => { const [x, y] = G(lo, la); return `<text x="${x}" y="${y}" text-anchor="middle">${t}</text>`; }).join('') + '</g>';
  s += '<path d="M0 235 H1100" stroke="#b8361e" stroke-width="1" stroke-dasharray="6 6" opacity=".6"/><text x="12" y="228" font-family="Georgia,serif" font-size="13" fill="#b8361e">Ecuador</text>';
  return svgURL(GW, GH, s + '<rect x="4" y="4" width="1092" height="462" rx="14" fill="none" stroke="#8a6a3a" stroke-width="3"/>'); })();
const ROUTE = [[-6.4, 36.8], [-15.5, 28], [-30, 5], [-43, -23], [-67.7, -49.3], [-70.9, -53], [-82, -44], [-100, -20], [-150, 0], [-215.2, 13.4], [-236.1, 10.3], [-232.6, 0.7], [-236, -9], [-280, -35], [-341.5, -36], [-375, -10], [-383.5, 15], [-370, 32], [-366.4, 36.8]];
const STOPS = [['Sanlúcar', 0, 'sep. 1519', -160, -6, 'right'], ['Río de Janeiro', 3, 'dic. 1519', 12, 0], ['Estrecho', 5, 'nov. 1520', -170, -20, 'right'], ['Guam', 9, 'mar. 1521', -10, -60], ['Molucas', 11, 'nov. 1521', -176, 14, 'right'], ['Cabo de Buena Esperanza', 14, 'may. 1522', -40, 10], ['Sanlúcar', 18, 'sep. 1522', 14, -22]];
// A globe of meridians that turns (for the lost day).
const GLOBE = svgURL(360, 360, '<circle cx="180" cy="180" r="170" fill="#2f6b5e"/>' + [30, 70, 110, 150].map(r => `<ellipse cx="180" cy="180" rx="${r}" ry="170" fill="none" stroke="#efe0bb" stroke-width="2" opacity=".7"/>`).join('')
  + [-120, -60, 0, 60, 120].map(y => `<path d="M${180 - Math.sqrt(170 * 170 - y * y)} ${180 + y} H${180 + Math.sqrt(170 * 170 - y * y)}" stroke="#efe0bb" stroke-width="2" opacity=".7"/>`).join('')
  + '<path d="M180 10 V350" stroke="#efe0bb" stroke-width="3"/><circle cx="180" cy="180" r="170" fill="none" stroke="#3b2a1a" stroke-width="4"/>');

// 2 · The Industrial Revolution: soot and brick. A skyline of mills, a gear, a locomotive and a steam engine on a blueprint.
const MILLS = svgURL(1280, 330, (() => { let s = '<g fill="#3a1d14">';
  s += '<rect x="0" y="200" width="1280" height="130"/>';
  [[40, 120, 260], [330, 150, 220], [580, 90, 300], [910, 140, 330]].forEach(([x, y, w]) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${330 - y}"/>`;
    for (let i = 0; i < w / 40; i++) s += `<path d="M${x + i * 40} ${y} l40 -26 v26Z"/>`; });
  [[120, 10, 26], [460, 30, 24], [700, 0, 30], [820, 40, 22], [1150, 20, 28]].forEach(([x, y, w]) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${330 - y}"/><rect x="${x - 4}" y="${y}" width="${w + 8}" height="10"/>`; });
  s += '</g>';
  const r = rnd(11);
  [[40, 120, 260], [330, 150, 220], [580, 90, 300], [910, 140, 330]].forEach(([x, y, w]) => { for (let row = 0; row < 3; row++) for (let i = 0; i < Math.floor(w / 36); i++)
    if (r() > 0.3) s += `<rect x="${x + 14 + i * 36}" y="${y + 30 + row * 50}" width="16" height="26" fill="${r() > 0.5 ? '#f2a541' : '#d97b29'}" opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`; });
  return s; })());
const GEAR = (n, color, hole = '#1c1a19') => svgURL(300, 300, `<g fill="${color}">` + Array.from({ length: n }, (_, i) => `<rect x="138" y="4" width="24" height="40" rx="4" transform="rotate(${i * 360 / n} 150 150)"/>`).join('')
  + `<circle cx="150" cy="150" r="118"/></g><circle cx="150" cy="150" r="80" fill="none" stroke="${hole}" stroke-width="10" opacity=".35"/>`
  + Array.from({ length: 6 }, (_, i) => { const t = i * Math.PI / 3; return `<circle cx="${(150 + 82 * Math.cos(t)).toFixed(1)}" cy="${(150 + 82 * Math.sin(t)).toFixed(1)}" r="16" fill="${hole}"/>`; }).join('') + `<circle cx="150" cy="150" r="26" fill="${hole}"/>`);
const LOCO = svgURL(380, 170, '<rect x="40" y="60" width="200" height="70" rx="30" fill="#2b2b2b"/><rect x="230" y="30" width="110" height="100" fill="#8e3b24"/><rect x="250" y="46" width="70" height="40" fill="#f2a541"/>'
  + '<rect x="220" y="22" width="130" height="14" fill="#1c1a19"/><path d="M70 60 V18 h30 V60Z" fill="#1c1a19"/><path d="M62 18 h46 v-10 h-46Z" fill="#c99a3b"/><rect x="140" y="44" width="22" height="18" rx="8" fill="#c99a3b"/>'
  + '<path d="M20 130 L40 100 V130Z" fill="#c99a3b"/>' + [[80, 132, 26], [150, 132, 26], [280, 124, 36]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1c1a19" stroke="#c99a3b" stroke-width="5"/><circle cx="${x}" cy="${y}" r="5" fill="#c99a3b"/>`).join('')
  + '<path d="M80 132 H280" stroke="#c99a3b" stroke-width="6"/>');
const BLUEGRID = svgURL(1280, 720, Array.from({ length: 33 }, (_, i) => `<path d="M${i * 40} 0 V720" stroke="#ffffff" stroke-width="${i % 5 ? 0.5 : 1.2}" opacity=".18"/>`).join('')
  + Array.from({ length: 19 }, (_, i) => `<path d="M0 ${i * 40} H1280" stroke="#ffffff" stroke-width="${i % 5 ? 0.5 : 1.2}" opacity=".18"/>`).join(''));
// The engine: boiler, cylinder (the piston and the flywheel go apart, to move).
const ENGINE = svgURL(640, 400, '<g fill="none" stroke="#e8f1ff" stroke-width="3">'
  + '<rect x="20" y="170" width="170" height="190" rx="70"/><path d="M60 170 V120 h30 v50"/><path d="M105 360 v20 M40 380 H190"/>'
  + '<path d="M190 230 H240 V200"/><rect x="240" y="150" width="170" height="100"/><path d="M240 200 H410" stroke-dasharray="8 6" opacity=".6"/>'
  + '<path d="M410 200 H470"/><circle cx="520" cy="200" r="8"/><path d="M470 200 L512 200"/><path d="M190 300 H230" stroke-dasharray="6 6"/>'
  + '<path d="M300 150 V120 H350 V150"/></g><g font-family="sans-serif" font-size="14" fill="#9ec3ff"><text x="62" y="270">CALDERA</text><text x="250" y="112">CILINDRO</text></g>');
const PISTON = svgURL(140, 90, '<rect x="2" y="2" width="40" height="86" fill="#c99a3b" stroke="#e8f1ff" stroke-width="3"/><rect x="42" y="38" width="96" height="14" fill="#e8f1ff"/>');
const FLYWHEEL = svgURL(260, 260, '<circle cx="130" cy="130" r="120" fill="none" stroke="#e8f1ff" stroke-width="12"/>' + Array.from({ length: 6 }, (_, i) => `<path d="M130 130 L${(130 + 116 * Math.cos(i * Math.PI / 3)).toFixed(1)} ${(130 + 116 * Math.sin(i * Math.PI / 3)).toFixed(1)}" stroke="#e8f1ff" stroke-width="6"/>`).join('')
  + '<circle cx="130" cy="130" r="18" fill="#c99a3b"/><circle cx="130" cy="40" r="10" fill="#c99a3b"/>');

// 3 · The Enlightenment: an engraved plate (double rules, hatching) and the scales of the three powers.
const plate = (w, h, label) => svgURL(w, h, `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="#1b1a17" stroke-width="3"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="#1b1a17" stroke-width="1"/>`
  + (label ? `<text x="${w - 24}" y="34" text-anchor="end" font-family="Georgia,serif" font-size="15" letter-spacing="3" fill="#7a5c3a">${label}</text>` : ''));
const HATCH = (w, h, color = '#1b1a17') => svgURL(w, h, Array.from({ length: Math.ceil((w + h) / 9) }, (_, i) => `<path d="M${i * 9} 0 L${i * 9 - h} ${h}" stroke="${color}" stroke-width="1" opacity=".25"/>`).join(''));
const SCALES = svgURL(520, 420, '<g stroke="#1b1a17" stroke-width="4" fill="none"><path d="M260 40 V380"/><path d="M200 380 H320"/><path d="M60 110 H460"/><circle cx="260" cy="40" r="12" fill="#c8a24a"/>'
  + '<path d="M60 110 L20 230 M60 110 L100 230 M460 110 L420 230 M460 110 L500 230"/><path d="M10 230 Q60 280 110 230Z M410 230 Q460 280 510 230Z" fill="#c8a24a"/></g>'
  + Array.from({ length: 30 }, (_, i) => `<path d="M${226 + i * 2.4} 380 L${232 + i * 2.4} 300" stroke="#1b1a17" stroke-width=".8" opacity=".35"/>`).join(''));

// 4 · The telegraph: a mahogany desk, a brass key, a paper tape with dots and dashes, the North Atlantic and its cable.
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
const morseTxt = c => MORSE[c].replace(/\./g, '·').replace(/-/g, '–');
const KEY = svgURL(380, 220, '<rect x="10" y="150" width="360" height="56" rx="10" fill="#6b3a22"/><rect x="10" y="150" width="360" height="12" rx="6" fill="#8a4e2e"/>'
  + '<rect x="60" y="120" width="40" height="34" fill="#b8892f"/><circle cx="80" cy="118" r="16" fill="#d2a64a"/><path d="M80 112 L300 96" stroke="#d2a64a" stroke-width="12" stroke-linecap="round"/>'
  + '<rect x="250" y="132" width="26" height="22" fill="#b8892f"/><ellipse cx="310" cy="86" rx="34" ry="14" fill="#1c1410"/><rect x="300" y="86" width="20" height="20" fill="#1c1410"/>'
  + '<circle cx="40" cy="178" r="7" fill="#d2a64a"/><circle cx="340" cy="178" r="7" fill="#d2a64a"/><path d="M40 178 Q20 210 0 214" stroke="#b8673a" stroke-width="4" fill="none"/>');
const ATLANTIC = svgURL(1000, 420, '<rect width="1000" height="420" rx="18" fill="#1d3a52"/>'
  + Array.from({ length: 8 }, (_, i) => `<path d="M${330 + i * 50} ${60 + (i % 3) * 110} q12 -8 24 0 t24 0" stroke="#2f5a7a" stroke-width="3" fill="none"/>`).join('')
  + '<g fill="#6b4a32" stroke="#b8892f" stroke-width="2"><path d="M0 0 H250 L290 50 L240 110 L200 190 L170 250 L110 330 L60 420 H0Z"/><ellipse cx="300" cy="150" rx="34" ry="26"/>'
  + '<path d="M780 0 H1000 V420 H880 L860 340 L800 310 L790 260 L840 220 L870 170 L900 120 L860 60Z"/><path d="M790 100 L820 50 L846 70 L840 140 L815 190 L785 170Z"/><ellipse cx="748" cy="140" rx="24" ry="34"/></g>'
  + '<g font-family="sans-serif" font-size="17" fill="#f3ead2"><text x="20" y="40">América</text><text x="890" y="40">Europa</text><text x="250" y="200">Terranova</text><text x="660" y="200">Irlanda</text><text x="430" y="360" font-style="italic" fill="#9ec1dc">Océano Atlántico</text></g>');
const TELEGRAM = svgURL(560, 420, '<rect x="4" y="4" width="552" height="412" rx="6" fill="#f3ead2" stroke="#b8673a" stroke-width="3"/><rect x="4" y="4" width="552" height="62" rx="6" fill="#b8673a"/>'
  + '<text x="280" y="46" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="10" fill="#f3ead2">TELEGRAMA</text>'
  + '<g font-family="sans-serif" font-size="13" fill="#8a5a3a"><text x="24" y="96">DESTINO</text><text x="300" y="96">N.º DE PALABRAS</text><text x="24" y="146">TEXTO</text></g>'
  + [110, 186, 236, 286, 336, 386].map(y => `<path d="M24 ${y} H536" stroke="#d6c39a" stroke-width="1.5"/>`).join('')
  + '<g font-family="Courier New,monospace" font-size="22" fill="#1d2f4f" font-weight="700"><text x="110" y="100">MADRID</text><text x="440" y="100">10</text>'
  + '<text x="24" y="178">LLEGO MARTES TREN NOCHE STOP</text><text x="24" y="228">TRAED PARAGUAS STOP</text><text x="24" y="278">ABRAZOS STOP</text></g>');

// 5 · The Great War: barbed wire, poppies, a trench in cross-section and a letter from the front.
const WIRE = (w, color = '#1b1b1b') => svgURL(w, 80, `<path d="M0 30 Q${w / 4} 50 ${w / 2} 30 T${w} 30" stroke="${color}" stroke-width="3" fill="none"/><path d="M0 50 Q${w / 4} 30 ${w / 2} 50 T${w} 50" stroke="${color}" stroke-width="3" fill="none"/>`
  + Array.from({ length: Math.floor(w / 46) }, (_, i) => `<path d="M${20 + i * 46} 28 l12 24 M${32 + i * 46} 28 l-12 24" stroke="${color}" stroke-width="3"/>`).join(''));
const POPPY = svgURL(120, 200, '<path d="M60 90 Q66 140 56 200" stroke="#3d5a2a" stroke-width="5" fill="none"/><path d="M58 150 q-24 -6 -30 -24 q22 2 30 24Z" fill="#4f6b34"/>'
  + [[-24, -10], [24, -10], [-18, 20], [18, 20], [0, -26]].map(([dx, dy]) => `<ellipse cx="${60 + dx}" cy="${58 + dy}" rx="30" ry="26" fill="#c62828" stroke="#8e1b1b" stroke-width="2"/>`).join('')
  + '<circle cx="60" cy="58" r="13" fill="#1a1a1a"/><circle cx="60" cy="58" r="5" fill="#4f6b34"/>');
const TRENCH = svgURL(1000, 440, '<rect width="1000" height="440" fill="#bfc6c1"/><rect y="150" width="1000" height="290" fill="#6b5537"/>'
  + '<path d="M0 150 Q120 140 240 150 L330 150 L330 380 L480 380 L480 300 L520 300 L520 150 L640 150 Q760 140 1000 150 V440 H0Z" fill="#6b5537"/>'
  + '<path d="M330 150 L330 380 L480 380 L480 300 L520 300 L520 150Z" fill="#3f3122"/>'
  + '<path d="M230 290 h100 v90 h-100Z" fill="#2a2016"/><path d="M226 286 h108 M232 286 v94 M328 286 v94" stroke="#8a6a3a" stroke-width="7"/>'
  + Array.from({ length: 7 }, (_, i) => `<rect x="${340 + i * 20}" y="368" width="14" height="10" fill="#a07b4a"/>`).join('') + '<rect x="336" y="376" width="144" height="5" fill="#7a5a32"/>'
  + [[500, 132], [540, 132], [580, 132], [520, 112], [560, 112], [540, 92], [280, 136], [310, 136], [295, 118]].map(([x, y]) => `<rect x="${x}" y="${y}" width="40" height="20" rx="8" fill="#c2a878" stroke="#7a6240" stroke-width="2"/>`).join('')
  + [700, 760, 820].map(x => `<path d="M${x} 150 V96" stroke="#3a2a1a" stroke-width="5"/>`).join('') + '<path d="M690 104 L830 140 M690 140 L830 104 M690 122 H830" stroke="#222" stroke-width="2.5"/>'
  + [[900, 160, 60], [960, 170, 34]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r / 3}" fill="#4a3b2a"/>`).join('')
  + '<path d="M0 260 Q500 240 1000 270" stroke="#5a4630" stroke-width="2" fill="none" opacity=".6"/><path d="M0 330 Q500 310 1000 340" stroke="#5a4630" stroke-width="2" fill="none" opacity=".6"/>'
  + '<g font-family="Verdana,sans-serif" font-size="15" fill="#2a2a2a"><text x="20" y="40">← retaguardia</text><text x="840" y="40">enemigo →</text></g>');
const TRENCH_PARTS = [['Parapeto', 'Sacos terreros frente a las balas', 55, 23], ['Banqueta de tiro', 'Escalón para asomarse y disparar', 49.5, 66], ['Entarimado', 'Tablas para no hundirse en el barro', 40.5, 84],
  ['Refugio', 'Cueva para dormir durante los bombardeos', 28, 72], ['Alambrada', 'Espino para frenar los asaltos', 76, 24], ['Tierra de nadie', 'Cráteres entre las dos líneas', 92, 41]];

// 6 · The Crash of 1929: Art Deco gold on black.
const SUNBURST = (c = '#d4af37') => svgURL(1280, 720, Array.from({ length: 24 }, (_, i) => { const a0 = Math.PI + i * Math.PI / 24, a1 = a0 + Math.PI / 48;
  return `<path d="M640 760 L${(640 + 1600 * Math.cos(a0)).toFixed(0)} ${(760 + 1600 * Math.sin(a0)).toFixed(0)} L${(640 + 1600 * Math.cos(a1)).toFixed(0)} ${(760 + 1600 * Math.sin(a1)).toFixed(0)}Z" fill="${c}" opacity=".12"/>`; }).join(''));
const DECO_FRAME = (c = '#d4af37') => svgURL(1280, 720, `<g fill="none" stroke="${c}"><rect x="30" y="30" width="1220" height="660" stroke-width="2"/><rect x="42" y="42" width="1196" height="636" stroke-width="1"/>`
  + [[30, 30, 1, 1], [1250, 30, -1, 1], [30, 690, 1, -1], [1250, 690, -1, -1]].map(([x, y, sx, sy]) => `<path d="M${x} ${y + sy * 90} h${sx * 30} v${-sy * 30} h${sx * 30} v${-sy * 30} h${sx * 30}" stroke-width="3"/>`).join('') + '</g>');
const TICKER = '▼ ACERO −12 · ▼ RADIO −34 · ▼ AUTOMÓVIL −18 · ▼ TELÉFONOS −22 · ▼ COBRE −16 · ▲ ORO +1';

// 7 · The suffragists: a rosette in purple, white and green, a ballot box and its papers.
const ROSETTE = svgURL(300, 380, '<path d="M120 200 L80 370 L112 350 L130 378 L150 210Z" fill="#5b2a86"/><path d="M180 200 L220 370 L188 350 L170 378 L150 210Z" fill="#2e7d32"/>'
  + Array.from({ length: 24 }, (_, i) => { const a0 = i * Math.PI / 12, a1 = a0 + Math.PI / 12, P = (r, a) => `${(150 + r * Math.cos(a)).toFixed(1)},${(150 + r * Math.sin(a)).toFixed(1)}`;
    return `<path d="M${P(60, a0)} L${P(138, a0 + 0.04)} L${P(138, a1 - 0.04)} L${P(60, a1)}Z" fill="${['#5b2a86', '#fbf8f2', '#2e7d32'][i % 3]}" stroke="#3a1a5a" stroke-width="1"/>`; }).join('')
  + '<circle cx="150" cy="150" r="64" fill="#c9a227" stroke="#8a6d10" stroke-width="3"/><circle cx="150" cy="150" r="52" fill="none" stroke="#fbf8f2" stroke-width="2" stroke-dasharray="4 4"/>'
  + '<text x="150" y="162" text-anchor="middle" font-family="Poppins,sans-serif" font-size="34" font-weight="800" fill="#2a1240">VOTO</text>');
const URN = svgURL(420, 360, '<path d="M40 110 H380 L360 350 H60Z" fill="#a9c7e8" opacity=".55" stroke="#fbf8f2" stroke-width="4"/><rect x="30" y="90" width="360" height="30" rx="6" fill="#fbf8f2"/><rect x="150" y="100" width="120" height="10" rx="5" fill="#2a1240"/>'
  + '<rect x="90" y="240" width="120" height="80" fill="#fbf8f2" transform="rotate(-12 150 280)"/><rect x="200" y="250" width="120" height="80" fill="#efe6f7" transform="rotate(9 260 290)"/>'
  + '<text x="210" y="210" text-anchor="middle" font-family="Poppins,sans-serif" font-size="26" font-weight="800" fill="#fbf8f2" letter-spacing="6">URNA</text>');
const BALLOT = svgURL(120, 80, '<rect x="2" y="2" width="116" height="76" rx="3" fill="#fbf8f2" stroke="#5b2a86" stroke-width="2"/><path d="M60 4 V76" stroke="#d9cfe6" stroke-width="2"/><rect x="14" y="20" width="34" height="5" fill="#b9a8cf"/><rect x="14" y="34" width="28" height="5" fill="#b9a8cf"/><path d="M76 30 l10 12 l18 -24" stroke="#2e7d32" stroke-width="6" fill="none" stroke-linecap="round"/>');

// 8 · The space race: a control-room panel (scanlines) and the free-return trajectory between the Earth and the Moon.
const SCAN = svgURL(1280, 720, Array.from({ length: 180 }, (_, i) => `<rect y="${i * 4}" width="1280" height="1" fill="#ffffff" opacity=".035"/>`).join('')
  + [[22, 22], [1258, 22], [22, 698], [1258, 698]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#2b4a5a" stroke="#4f7a8c" stroke-width="2"/>`).join(''));
const EARTH_MOON = svgURL(1100, 380, '<defs><radialGradient id="e" cx=".4" cy=".35"><stop offset="0" stop-color="#7fc8ff"/><stop offset="1" stop-color="#1c4f8a"/></radialGradient><radialGradient id="m" cx=".4" cy=".35"><stop offset="0" stop-color="#e9e6dc"/><stop offset="1" stop-color="#8d8a80"/></radialGradient></defs>'
  + Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 197) % 1100}" cy="${(i * 113) % 380}" r="${1 + (i % 3) * 0.6}" fill="#ffffff" opacity=".5"/>`).join('')
  + '<circle cx="120" cy="200" r="86" fill="url(#e)"/><path d="M70 160 q30 -20 50 0 t40 10 q-10 30 -40 26 t-50 -36Z M90 240 q30 10 40 30 q-30 10 -46 -10Z" fill="#3f9d5a" opacity=".85"/>'
  + '<circle cx="980" cy="190" r="36" fill="url(#m)"/><circle cx="970" cy="180" r="6" fill="#7a776e"/><circle cx="992" cy="204" r="4" fill="#7a776e"/>'
  + '<g font-family="Space Grotesk,sans-serif" font-size="18" fill="#9fb3c0"><text x="120" y="320" text-anchor="middle">Tierra</text><text x="980" y="262" text-anchor="middle">Luna</text></g>');
const FREE_RETURN = [[200, 175], [420, 128], [700, 150], [880, 205], [960, 240], [1030, 222], [1032, 165], [985, 136], [930, 152], [870, 205], [690, 262], [420, 272], [205, 228]];

// 9 · The Berlin Wall: concrete slabs with graffiti, the divided city and the death strip.
const WALL = (graffiti = true) => { const r = rnd(29), C = ['#ff4d6d', '#ffd60a', '#3a86ff', '#06d6a0', '#ff8c42', '#c77dff']; let s = '';
  for (let i = 0; i < 16; i++) { const x = i * 80; s += `<rect x="${x}" y="24" width="79" height="276" fill="${i % 2 ? '#a3a19b' : '#9a9893'}"/><path d="M${x + 79} 24 V300" stroke="#6f6d68" stroke-width="2"/>`;
    for (let k = 0; k < 4; k++) s += `<circle cx="${x + 10 + r() * 60}" cy="${40 + r() * 240}" r="${1 + r() * 2}" fill="#7d7b76"/>`; }
  s += '<rect x="0" y="6" width="1280" height="26" rx="13" fill="#b4b2ac" stroke="#7d7b76" stroke-width="2"/>';
  if (graffiti) { for (let i = 0; i < 26; i++) { const x = r() * 1220, y = 90 + r() * 180, c = C[i % C.length];
      s += `<path d="M${x} ${y} q${20 + r() * 30} ${-40 - r() * 30} ${50 + r() * 40} 0 t${40 + r() * 30} ${10 - r() * 20}" stroke="${c}" stroke-width="${6 + r() * 6}" fill="none" stroke-linecap="round" opacity=".85"/>`; }
    s += [['LIBERTAD', 120, 200, '#ffd60a', -4], ['NO MÁS MUROS', 520, 160, '#ff4d6d', 3], ['1989', 980, 230, '#3a86ff', -6]].map(([t, x, y, c, a]) =>
      `<text x="${x}" y="${y}" font-family="Anton,Impact,sans-serif" font-size="58" fill="${c}" stroke="#1b1b1b" stroke-width="3" paint-order="stroke" transform="rotate(${a} ${x} ${y})">${t}</text>`).join(''); }
  return svgURL(1280, 300, s); };
const BERLIN_SHAPE = [[60, 200], [120, 90], [260, 40], [330, 45], [420, 50], [560, 90], [650, 180], [660, 300], [600, 410], [450, 460], [360, 455], [280, 450], [140, 400], [70, 320]];
const BERLIN = svgURL(700, 480, `<polygon points="${BERLIN_SHAPE.map(p => p.join(',')).join(' ')}" fill="#e7e2d6" stroke="#5c6670" stroke-width="3"/>`
  + '<path d="M330 45 L350 150 L330 230 L380 300 L360 455 L450 460 L600 410 L660 300 L650 180 L560 90 L420 50Z" fill="#c9c3b6"/>'
  + '<path d="M120 90 L260 40 L330 45 L350 150 L92 150Z" fill="#b9cbe8"/><path d="M92 150 L350 150 L330 230 L362 280 L66 280 L60 200Z" fill="#cfe3c8"/><path d="M66 280 L362 280 L380 300 L360 455 L280 450 L140 400 L70 320Z" fill="#f2d8b4"/>'
  + '<path d="M40 330 Q300 300 680 360" stroke="#5aa0d8" stroke-width="5" fill="none" opacity=".7"/>'
  + '<g font-family="Montserrat,sans-serif" font-size="20" font-weight="700" fill="#2a2f36" text-anchor="middle"><text x="225" y="115">Francés</text><text x="200" y="225">Británico</text><text x="230" y="380">Estadounidense</text><text x="510" y="250">Soviético</text></g>'
  + '<g font-family="Montserrat,sans-serif" font-size="17" fill="#5c6670" text-anchor="middle"><text x="215" y="250">BERLÍN OESTE</text><text x="510" y="275">BERLÍN ESTE</text></g>');
const BERLIN_WALL_PTS = [[330, 45], [260, 40], [120, 90], [60, 200], [70, 320], [140, 400], [280, 450], [360, 455], [380, 300], [330, 230], [350, 150], [330, 45]];
const STRIP = svgURL(1000, 360, '<rect width="1000" height="360" fill="#2b3a55"/><rect y="250" width="1000" height="110" fill="#6b6a5e"/>'
  + '<rect x="60" y="120" width="34" height="130" fill="#9a9893"/><path d="M190 250 V150 M230 250 V150 M270 250 V150 M190 160 H270 M190 190 H270 M190 220 H270" stroke="#c9c9c9" stroke-width="3"/>'
  + '<rect x="345" y="70" width="40" height="180" fill="#b4b2ac"/><rect x="330" y="40" width="70" height="40" fill="#8a8a8a"/><rect x="338" y="48" width="54" height="14" fill="#ffe08a"/>'
  + '<rect x="430" y="246" width="140" height="10" fill="#3f3f3f"/><path d="M470 250 V160 M530 250 V160" stroke="#8a8a8a" stroke-width="4"/><circle cx="470" cy="156" r="8" fill="#ffe08a"/><circle cx="530" cy="156" r="8" fill="#ffe08a"/>'
  + '<path d="M600 250 L625 300 H665 L690 250Z" fill="#3e3d36"/><rect x="710" y="250" width="160" height="8" fill="#d9cfae"/>' + Array.from({ length: 12 }, (_, i) => `<path d="M${716 + i * 13} 252 l6 4" stroke="#b8ad8a" stroke-width="2"/>`).join('')
  + '<rect x="900" y="96" width="40" height="154" fill="#a3a19b"/><rect x="896" y="88" width="48" height="16" rx="8" fill="#b4b2ac"/><path d="M904 160 q10 -20 20 0 t14 0" stroke="#ff4d6d" stroke-width="5" fill="none"/>'
  + '<g font-family="Montserrat,sans-serif" font-size="18" font-weight="700" fill="#ffffff"><text x="20" y="40">← ESTE</text><text x="900" y="40">OESTE →</text></g>');
const STRIP_PARTS = [['Muro interior', 'Para que nadie se acercara siquiera', 7.7], ['Valla con alarma', 'Al tocarla avisaba a los guardias', 23], ['Torre de vigilancia', 'Guardias con orden de disparar', 36.5], ['Camino de patrulla', 'Iluminado toda la noche', 50],
  ['Foso antivehículos', 'Para frenar coches y camiones', 64.5], ['Franja de arena', 'Rastrillada: delataba cada huella', 79], ['Muro exterior', 'El que se ve en las fotos: 3,6 m', 92]];

// 10 · From ARPANET to the web: a green phosphor terminal, the first network, packets and an old web page.
const OLDWEB = svgURL(800, 520, '<rect width="800" height="520" fill="#ffffff"/><rect width="800" height="40" fill="#d6d6d6"/><text x="20" y="27" font-family="Times New Roman,serif" font-size="18" fill="#333">Proyecto WorldWideWeb</text>'
  + '<text x="40" y="110" font-family="Times New Roman,serif" font-size="44" font-weight="700" fill="#000">World Wide Web</text>'
  + '<text x="40" y="160" font-family="Times New Roman,serif" font-size="22" fill="#000">La web es un proyecto para compartir documentos</text><text x="40" y="190" font-family="Times New Roman,serif" font-size="22" fill="#000">con <tspan fill="#0000ee" text-decoration="underline">enlaces</tspan> entre ordenadores de todo el mundo.</text>'
  + ['Qué es la web', 'Cómo empezar', 'Lista de servidores', 'Preguntas frecuentes', 'Ayuda'].map((t, i) => `<text x="60" y="${250 + i * 40}" font-family="Times New Roman,serif" font-size="22" fill="#0000ee" text-decoration="underline">• ${t}</text>`).join(''));
// Name, x, y and where its label goes (above, below or left of the dot).
const NODES69 = [['Los Ángeles', 430, 560, 'below'], ['Santa Bárbara', 290, 470, 'left'], ['Bahía de San Francisco', 230, 290, 'above'], ['Utah', 640, 300, 'above']];

// ---- The ten presentations ------------------------------------------------------
export default {

  // 1 · The first voyage round the world, on a portolan chart: rhumb lines, a compass rose that turns with
  // curved text, spices with a table that works out the profit, the route drawn as the nao sails always west,
  // the crew dwindling in a line chart, a page of the chronicle, the lost day with an equation, order and quiz.
  edu_hist2_circumnav: { name: 'La primera vuelta al mundo', cat: 'edu', summary: 'Carta portulana: rosa de los vientos que gira, ruta que se traza con la nao, tabla con fórmulas, gráfico, ecuación, ordenar y concurso', make: () => {
    const PARCH = '#ecdcb4', INK = '#3b2a1a', VERM = '#b8361e', SEA = '#2f6b5e', OCHRE = '#c08a2b';
    const H = pairStacks('classic').heading, MX = 90, MY = 175, S = 1;
    const route = ROUTE.map(([lo, la]) => { const [x, y] = G(lo, la); return [MX + x * S, MY + y * S]; });
    const parch = [img(RHUMBS, 0, 0, 1280, 720, 'Líneas de rumbo de una carta portulana', { fit: 'fill', decorative: true })];
    return numbered(build({ name: 'La primera vuelta al mundo', palette: 'paper', fonts: 'classic', title: { size: 46, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: PARCH, transition: 'fade', extra: [...parch,
        glow(760, 80, 560, '#ffffff', PARCH, 45),
        on(img(ROSE, 790, 150, 400, 400, 'Rosa de los vientos de treinta y dos rumbos'), 'spin360', { start: 'afterPrev', duration: 4000 }),
        text('MAR OCÉANO · MAR DEL SUR · ESPECIERÍA · ', 755, 115, 470, 470, { fontFamily: H, fontSize: 22, curve: 100, color: VERM, textAlign: 'center', letterSpacing: 3 }),
        kicker('HISTORIA MODERNA · 2.º ESO', 90, 150, 600, VERM),
        text('La primera vuelta al mundo', 84, 190, 640, 220, { fontFamily: H, fontSize: 76, fontWeight: 700, color: INK, lineHeight: 1.05 }),
        rect(90, 425, 120, 5, VERM),
        text('Cinco naos zarparon de Sanlúcar en 1519.<br>Tres años después volvió una sola, con 18 hombres.', 90, 450, 600, 100, { fontSize: 26, color: INK })],
        notes: 'Al llegar, la rosa de los vientos da una vuelta completa. Pregunta de arranque: ¿cómo sabes dónde estás en mitad del océano, sin GPS ni mapas del sitio al que vas?' },
      { title: '¿Por qué arriesgarlo todo? Por las especias', layout: 'titleOnly', bg: PARCH, extra: [
        tableBlock({ x: 90, y: 185, w: 700, h: 300, fontSize: 24, header: true, headBg: VERM, headFg: '#fff8e6', stroke: '#c9b07a', banded: true, band: '#e2cc98', 
          rows: [['Especia', 'En las Molucas', 'En Sevilla', 'Se multiplica'], ['Clavo', '2', '42', '=C2/B2'], ['Nuez moscada', '3', '60', '=C3/B3'], ['Canela', '4', '52', '=C4/B4'], ['Pimienta', '5', '30', '=C5/B5']], colW: [3, 2.4, 2.2, 2.6] }),
        text('Precio en ducados por quintal (cifras aproximadas para el aula). La última columna son fórmulas.', 90, 495, 700, 60, { fontSize: 18, color: '#6e5536', fontStyle: 'italic' }),
        on(card(`<b style="color:${VERM}">El mundo partido en dos</b><br>El Tratado de Tordesillas (1494) daba a Portugal la ruta del este. Castilla buscó llegar a las islas de las especias <b>navegando hacia el oeste</b>.`, 830, 185, 360, 300, '#f6ead0',
          { fontSize: 25, color: INK, borderColor: SEA, radius: 6 }), 'fade-left'),
        on(stat('26 toneladas', 'de clavo trajo la nao Victoria: bastaron para pagar todo el viaje', 90, 560, 1100, '#8a5a10', INK, 46, { textAlign: 'left' }), 'fade-up', { sound: 'chime' })],
        notes: 'Las especias conservaban y daban sabor a la comida, y servían de medicina. Cambia un precio de la tabla: la columna «Se multiplica» se recalcula sola.' },
      { title: 'Siempre hacia el oeste', layout: 'titleOnly', bg: PARCH, extra: [
        img(WORLD, MX, MY, GW, GH, 'Mapa del mundo desde España hacia el oeste hasta volver a España'),
        on(ink(route, VERM, 4), 'draw', { duration: 9000, sound: 'whoosh' }),
        along(img(NAO, route[0][0] - 30, route[0][1] - 52, 60, 54, 'La nao Victoria'), 'path', { pathShape: 'custom', points: [[0, 0], ...rel(route)], dx: rel(route).at(-1)[0], dy: rel(route).at(-1)[1], duration: 9000 }),
        ...STOPS.map(([n, i, d, dx, dy, al]) => { const [x, y] = route[i]; return text(`<b>${n}</b><br>${d}`, x + dx, y + dy, 150, 52, { fontSize: 15, color: INK, lineHeight: 1.1, textAlign: al || 'left' }); }),
        ...STOPS.map(([, i]) => shape('ellipse', route[i][0] - 6, route[i][1] - 6, 12, 12, VERM))],
        notes: 'Un clic: la ruta se traza mientras la nao navega, siempre hacia el oeste, hasta volver a España por el otro lado del mapa. Las fechas son las de llegada a cada punto.' },
      { title: 'Tres años, 239 hombres', layout: 'titleOnly', bg: PARCH, extra: [
        chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'line', color: VERM, grid: true, dataLabels: true, yTitle: 'tripulantes',
          data: [['Sep. 1519', 239], ['Abr. 1520', 225], ['Nov. 1520', 166], ['Mar. 1521', 145], ['May. 1521', 115], ['Nov. 1521', 104], ['Ene. 1522', 60], ['Sep. 1522', 18]].map(([label, value]) => ({ label, value })) }),
        on(stat('18 de 239', 'volvieron a Sanlúcar en la nao Victoria', 880, 200, 320, VERM, INK, 64), 'zoom-in', { sound: 'drumroll' }),
        on(text(ul('Una nao se hundió y otra desertó', 'El escorbuto y el hambre en el Pacífico', 'Combates en Filipinas', 'La Trinidad se quedó en las Molucas'), 880, 380, 320, 260, { fontSize: 20, color: INK }), 'fade-up')],
        notes: 'Cifras aproximadas: las fuentes no coinciden en el número exacto. Algunos supervivientes más volvieron después, presos o en otros barcos.' },
      { layout: 'blank', bg: '#d9c294', transition: 'page', extra: [
        rect(120, 60, 1040, 600, '#f3e6c4', { rotation: -1.5, shadow: true }),
        ...Array.from({ length: 11 }, (_, i) => rect(170, 150 + i * 44, 940, 1, '#c9b07a', { rotation: -1.5 })),
        text('Diario de a bordo · Mar del Sur, 1521', 180, 90, 700, 50, { fontFamily: H, fontSize: 26, fontStyle: 'italic', color: VERM, rotation: -1.5 }),
        text('«Comíamos bizcocho que ya no era bizcocho, sino polvo lleno de gusanos, y bebíamos un agua amarilla y podrida. Comimos también las pieles de cuero que cubrían las vergas…»',
          180, 160, 920, 280, { fontFamily: HAND, fontSize: 44, color: INK, rotation: -1.5, lineHeight: 1.25 }),
        text('— Crónica de un tripulante italiano del viaje (adaptada)', 560, 450, 540, 40, { fontSize: 20, color: '#6e5536', rotation: -1.5, textAlign: 'right' }),
        // Each enemy (its icon and its word) comes in together, one after the other.
        ...[['droplet', 'Agua podrida'], ['triangle-alert', 'Escorbuto'], ['wind', 'Tormentas'], ['users', 'Motines']].flatMap(([ic, t], i) => [
          on(icon(ic, 286 + i * 230, 505, 46, SEA), 'fade-up', { start: i ? 'afterPrev' : 'click' }),
          along(text(`<span style="font-weight:700">${t}</span>`, 210 + i * 230, 560, 200, 40, { fontSize: 22, color: VERM, textAlign: 'center', rotation: -1.5 }), 'fade-up')])],
        notes: 'Más de tres meses sin tocar tierra cruzando el Pacífico. El escorbuto es la falta de vitamina C: encías hinchadas, heridas que no se cierran. Un clic muestra los enemigos a bordo, uno tras otro.' },
      { title: 'El misterio del día perdido', layout: 'titleOnly', bg: PARCH, extra: [
        on(img(GLOBE, 90, 200, 360, 360, 'Globo terráqueo con meridianos'), 'spin360', { duration: 3000 }),
        text('Al llegar a Cabo Verde, el diario decía <b>miércoles</b>… pero en tierra era <b>jueves</b>.', 500, 190, 690, 100, { fontSize: 28, color: INK }),
        on(mathBlock({ x: 500, y: 300, w: 690, h: 90, fontSize: 44, latex: '\\frac{360^{\\circ}}{24\\ \\text{h}} = 15^{\\circ}\\ \\text{por hora}', color: SEA }), 'fade-in'),
        on(card('Cada 15° que navegas hacia el oeste, el Sol sale <b>una hora más tarde</b>. Al dar la vuelta completa, la tripulación vivió <b>un amanecer menos</b> que los que se quedaron en casa.', 500, 410, 690, 170, '#f6ead0',
          { fontSize: 23, color: INK, borderColor: VERM, radius: 6 }), 'fade-up')],
        notes: 'El globo gira con el primer clic. Es el origen de la línea internacional de cambio de fecha. Pregunta: si hubieran dado la vuelta hacia el este, ¿ganarían o perderían un día?' },
      { layout: 'blank', bg: PARCH, extra: [...parch, pollBlock({ kind: 'order', question: 'Ordena las etapas del viaje', fontSize: 38, x: 60, y: 50, w: 1160, h: 620,
        options: ['Salida de Sanlúcar de Barrameda', 'Invierno en la bahía de San Julián', 'Paso del estrecho al Mar del Sur', 'Travesía del Pacífico', 'Llegada a las Molucas', 'Vuelta por el cabo de Buena Esperanza'] })],
        notes: 'Actividad «Poner en orden» desde el móvil. Pista: mirad el mapa de la ruta, siempre hacia el oeste.' },
      { layout: 'blank', bg: PARCH, transition: 'convex', extra: [...parch, quiz('¿Por qué dirección buscaba Castilla llegar a las islas de las especias?', ['Por el este, rodeando África', 'Por el oeste, cruzando el océano', 'Por tierra, atravesando Asia', 'Por el Polo Norte'], 1)],
        notes: 'Concurso con tiempo: más puntos cuanto antes se acierta. El Tratado de Tordesillas reservaba la ruta del este a Portugal.' },
    ]));
  } },

  // 2 · The Industrial Revolution: soot and brick. Mills against a red sky with smoke that rises, gears that turn,
  // workshop against factory, a steam engine on a blueprint whose piston and flywheel move, coal in an area chart
  // with a 3D brazier, a train that crosses a timeline, a child's working week that adds itself up, words and a quiz.
  edu_hist2_industry: { name: 'Revolución Industrial: vapor y carbón', cat: 'edu', summary: 'Hollín y ladrillo: humo que sube, engranajes que giran, máquina de vapor en plano animada, brasero 3D, tren, tabla que suma, nube y concurso', make: () => {
    const SOOT = '#1c1a19', BRICK = '#8e3b24', BRICK2 = '#c0583a', STEAM = '#ece6da', BRASS = '#c99a3b', CREAM = '#efe7da', PRINT = '#14406b', DARK = '#2a2420';
    const H = pairStacks('bold').heading;
    const sky = rect(0, 0, 1280, 720, SOOT, { fill2: '#3b1d16', gradAngle: 90 });
    return numbered(build({ name: 'Revolución Industrial: vapor y carbón', palette: 'warm', fonts: 'bold', title: { size: 60, color: BRICK }, body: { color: DARK },
      decor: () => [rect(0, 714, 1280, 6, BRICK)] }, [
      { layout: 'blank', bg: SOOT, transition: 'fade', extra: [sky, glow(240, 300, 800, '#d9622b', SOOT, 40),
        ...[[640, 330, 0], [760, 360, 700], [1050, 350, 1300]].map(([x, y, d], i) => withAnims(shape('cloud', x, y, 150, 90, '#8a8580', { opacity: 55 }),
          A('path', { start: i ? 'withPrev' : 'afterPrev', pathShape: 'custom', points: [[0, 0], [20, -45], [40, -80]], dx: 40, dy: -80, duration: 5000, delay: d }))),
        img(MILLS, 0, 390, 1280, 330, 'Siluetas de fábricas y chimeneas'),
        on(img(GEAR(14, BRASS), 1010, 50, 220, 220, 'Engranaje'), 'spin360', { start: 'withPrev', duration: 6000 }),
        on(img(GEAR(10, '#8a6a2a'), 880, 40, 130, 130, 'Engranaje pequeño'), 'spin360', { start: 'withPrev', duration: 4000 }),
        kicker('HISTORIA CONTEMPORÁNEA · 4.º ESO', 90, 70, 640, BRASS),
        text('REVOLUCIÓN<br>INDUSTRIAL', 84, 105, 820, 250, { fontFamily: H, fontSize: 124, color: STEAM, lineHeight: 0.95, letterSpacing: 2 }),
        text('Vapor, carbón y fábricas · 1760-1850', 90, 350, 520, 50, { fontSize: 28, color: '#f2c9a8' })],
        notes: 'Al llegar, el humo sube de las chimeneas y los engranajes giran solos. Pregunta: ¿qué objetos de vuestra mochila se hicieron a mano y cuáles en una fábrica?' },
      { title: 'Del taller a la fábrica', layout: 'titleOnly', bg: CREAM, extra: [
        shape('rounded', 90, 180, 520, 460, '#e2d3bb', { radius: 16 }), icon('home', 120, 205, 54, '#7a5a3a'),
        text('<b>ANTES</b> · el taller en casa', 190, 210, 400, 50, { fontSize: 28, color: '#7a5a3a' }),
        text(ul('Toda la familia hila y teje', 'Herramientas sencillas, a mano', 'Se trabaja al ritmo del día y las estaciones', 'Se vende al comerciante del pueblo'), 120, 280, 470, 250, { fontSize: 23, color: DARK }),
        stat('1 huso', 'por hilandera con la rueca', 120, 520, 470, '#7a5a3a', DARK, 44),
        on(shape('rounded', 670, 180, 520, 460, BRICK, { radius: 16, fill2: '#5e2617', gradAngle: 135 }), 'fade-left'),
        along(shape('rightarrow', 618, 380, 44, 60, BRICK), 'fade-right'),
        along(icon('building-2', 700, 205, 54, BRASS), 'fade-left'),
        along(text('<b>DESPUÉS</b> · la fábrica', 770, 210, 400, 50, { fontSize: 28, color: STEAM }), 'fade-left'),
        along(text(ul('Cientos de obreros bajo un mismo techo', 'Máquinas movidas por agua y por vapor', 'Horario fijo marcado por la sirena', 'Se produce en masa y más barato'), 700, 280, 470, 250, { fontSize: 23, color: STEAM }), 'fade-left'),
        on(stat('1.000 husos', 'en una sola hiladora mecánica', 700, 520, 470, BRASS, STEAM, 44), 'zoom-in', { sound: 'pop' })],
        notes: 'Primer clic: aparece la fábrica. Segundo: la cifra. Una sola máquina de hilar podía mover cientos o miles de husos a la vez (cifra orientativa de mediados del siglo XIX).' },
      { layout: 'blank', bg: PRINT, extra: [img(BLUEGRID, 0, 0, 1280, 720, 'Cuadrícula de plano', { fit: 'fill', decorative: true }),
        text('PLANO N.º 1 · MÁQUINA DE VAPOR DE DOBLE EFECTO', 90, 50, 900, 40, { fontSize: 20, letterSpacing: 4, color: '#9ec3ff' }),
        text('Así se mueve el mundo', 90, 85, 900, 80, { fontFamily: H, fontSize: 64, color: '#ffffff' }),
        img(ENGINE, 70, 200, 640, 400, 'Esquema: caldera, cilindro y biela'),
        on(img(PISTON, 330, 355, 140, 90, 'Pistón y vástago'), 'path', { pathShape: 'custom', points: [[0, 0], [70, 0], [0, 0], [70, 0], [0, 0]], dx: 0, dy: 0, duration: 3000, sound: 'whoosh' }),
        along(img(FLYWHEEL, 470, 270, 260, 260, 'Volante de inercia'), 'spin360', { duration: 3000 }),
        ...[['1', 'Caldera', 'El carbón hierve el agua: el vapor sale a presión.'], ['2', 'Cilindro', 'El vapor empuja el pistón, primero por un lado y luego por el otro.'], ['3', 'Biela y volante', 'Convierten el vaivén en un giro que mueve telares, bombas y ruedas.']]
          .map(([n, h, d], i) => on(text(`<b style="color:${BRASS}">${n} · ${h}</b><br>${d}`, 790, 210 + i * 120, 400, 110, { fontSize: 21, color: '#e8f1ff' }), 'fade-left')),
        on(mathBlock({ x: 790, y: 580, w: 400, h: 70, fontSize: 32, latex: '1\\ \\text{CV} \\approx 735\\ \\text{W}', color: '#ffffff' }), 'fade-in')],
        notes: 'Primer clic: el pistón va y viene y el volante gira a la vez. Luego, una pieza por clic. El «caballo de vapor» nació para vender máquinas comparándolas con los caballos que sustituían.' },
      { title: `<span style="color:${STEAM}">El carbón lo movía todo</span>`, layout: 'titleOnly', bg: SOOT, extra: [glow(780, 300, 520, BRICK2, SOOT, 35),
        chartBlock({ x: 80, y: 180, w: 720, h: 470, chartType: 'area', color: BRICK2, grid: true, yTitle: 'millones de toneladas al año',
          data: [['1700', 3], ['1750', 5], ['1800', 11], ['1830', 23], ['1850', 50], ['1870', 110], ['1900', 225]].map(([label, value]) => ({ label, value })) }),
        model('kh-PotOfCoals', 860, 170, 340, 280, { autoRotate: true, view: 'top', caption: '' }),
        on(stat('× 75', 'creció la producción de carbón británica en dos siglos', 860, 450, 340, BRASS, STEAM, 64), 'zoom-in', { sound: 'drumroll' }),
        credits(['kh-PotOfCoals'], 80, 660, 1120, '#8a8580')],
        notes: 'Producción aproximada de carbón en Gran Bretaña. El brasero 3D gira solo: arrástralo para verlo por todos lados. Pregunta: ¿qué pasó con el aire de las ciudades?' },
      { title: 'El ferrocarril acorta el mundo', layout: 'titleOnly', bg: CREAM, extra: [
        dg('timeline', '1769\n  Máquina de vapor mejorada\n1785\n  Telar mecánico\n1825\n  Primer tren de viajeros\n1848\n  Barcelona-Mataró\n1851\n  Exposición Universal de Londres', 90, 175, 1100, 280, { colors: 'accent', oneByOne: true }),
        rect(0, 640, 1280, 8, '#5a4a3a'), ...Array.from({ length: 32 }, (_, i) => rect(i * 40 + 6, 648, 24, 10, '#7a5a3a')),
        on(img(LOCO, 40, 495, 300, 135, 'Locomotora de vapor'), 'path', { start: 'afterPrev', pathShape: 'custom', points: [[0, 0], [900, 0]], dx: 900, dy: 0, duration: 4000, sound: 'whoosh' }),
        text('De Madrid a Barcelona: <b>varios días</b> en diligencia (hacia 1800) · <b>menos de un día</b> en tren (hacia 1900)', 90, 462, 1100, 46, { fontSize: 24, color: DARK, textAlign: 'center' })],
        notes: 'Al llegar, el tren cruza la vía. Después, la línea del tiempo aparece hito a hito, uno por clic. Duraciones de viaje aproximadas.' },
      { title: `<span style="color:${STEAM}">La semana de una hilandera de 12 años</span>`, layout: 'titleOnly', bg: SOOT, extra: [glow(900, 300, 520, BRICK2, SOOT, 25),
        tableBlock({ x: 90, y: 180, w: 620, h: 440, fontSize: 23, header: true, headBg: BRICK, headFg: '#ffffff', stroke: '#5a4a3a', banded: true, band: BRICK2,
          rows: [['Día', 'Entra', 'Sale', 'Horas'], ['Lunes', '5:30', '20:00', '14'], ['Martes', '5:30', '20:00', '14'], ['Miércoles', '5:30', '20:00', '14'], ['Jueves', '5:30', '20:00', '14'], ['Viernes', '5:30', '20:00', '14'], ['Sábado', '5:30', '16:00', '10'], ['Total', '', '', '=SUMA(ARRIBA)']], colW: [3, 2, 2, 2] }),
        on(icon('clock', 760, 190, 70, BRASS), 'teeter', { start: 'afterPrev' }),
        text('Con media hora para comer, de pie junto a la máquina.', 850, 195, 340, 80, { fontSize: 22, color: STEAM }),
        on(card('<b>Ley de Fábricas de 1833</b><br>Prohibido trabajar antes de los 9 años. De 9 a 13 años, como mucho 9 horas al día… y 2 horas de escuela.', 760, 310, 430, 230, '#ffffff',
          { fontSize: 22, color: DARK, borderColor: BRICK, radius: 8 }), 'fade-up'),
        text('Horario reconstruido a partir de testimonios de la época.', 760, 560, 430, 60, { fontSize: 18, color: '#a89a8a', fontStyle: 'italic' })],
        notes: 'La fila «Total» es una fórmula (=SUMA(ARRIBA)): cambia un día y se recalcula. Comparad: ¿cuántas horas de clase tenéis vosotros a la semana?' },
      { layout: 'blank', bg: SOOT, extra: [sky, img(GEAR(14, '#3a2a20'), 980, 440, 360, 360, 'Engranaje decorativo', { decorative: true, opacity: 60 }),
        pollBlock({ kind: 'word', question: '¿Qué invento de hoy cambia el mundo tanto como el vapor?', options: [], fontSize: 38, x: 60, y: 60, w: 1160, h: 600 })],
        notes: 'Nube de palabras en directo. Suele salir la inteligencia artificial, el móvil o internet: buen momento para comparar las ventajas y los problemas de cada revolución.' },
      { layout: 'blank', bg: SOOT, transition: 'convex', extra: [quiz('¿En qué país empezó la Revolución Industrial?', ['Francia', 'Gran Bretaña', 'Alemania', 'España'], 1)],
        notes: 'Tenía carbón y hierro, colonias que compraban sus productos, capital para invertir y una agricultura que necesitaba menos manos.' },
    ]));
  } },

  // 3 · The Enlightenment: from the dark to the light. A lamp in 3D lights up the night, an engraved plate with
  // the tree of knowledge, a quotation, the scales of the three powers, literacy in two series, «without the
  // people» struck out, match the thinkers with their ideas and a debate.
  edu_hist2_enlight: { name: 'La Ilustración: atrévete a saber', cat: 'edu', summary: 'De la noche a la luz: lámpara 3D, texto curvo, lámina grabada con jerarquía, balanza de poderes, barras dobles, tachado, unir y votación', make: () => {
    const PAPER = '#f4efe3', INK = '#1b1a17', SEPIA = '#7a5c3a', GOLD = '#c8a24a', NIGHT = '#14110d', BLUE = '#2d4a6b';
    const H = pairStacks('editorial').heading;
    return numbered(build({ name: 'La Ilustración: atrévete a saber', palette: 'office', fonts: 'editorial', title: { size: 46, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
        on(glow(640, 60, 640, GOLD, NIGHT, 55), 'fade-in', { start: 'afterPrev', duration: 2500, delay: 400 }),
        model('kh-AnisotropyBarnLamp', 800, 150, 320, 380, { autoRotate: true, view: 'front', caption: '' }),
        text('SAPERE AUDE · ATRÉVETE A SABER · ', 720, 100, 480, 480, { fontFamily: H, fontSize: 22, curve: 100, color: GOLD, textAlign: 'center', letterSpacing: 4 }),
        kicker('HISTORIA MODERNA · 4.º ESO', 90, 170, 600, GOLD),
        text('La Ilustración', 84, 210, 640, 120, { fontFamily: H, fontSize: 80, color: '#f6efdc', fontWeight: 700 }),
        text('El siglo XVIII enciende la luz de la razón', 90, 340, 580, 100, { fontSize: 32, color: '#d9cfb8' }),
        credits(['kh-AnisotropyBarnLamp'], 90, 660, 900, '#6b6150')],
        notes: 'La sala está a oscuras y, al llegar, la luz se enciende sola detrás de la lámpara. «Ilustración» viene de iluminar: sacar a las personas de la oscuridad de la ignorancia.' },
      { title: 'Cuatro ideas que lo cambiaron todo', layout: 'titleOnly', bg: PAPER, transition: 'fade', extra: [
        ...[['brain', 'Razón', 'Todo debe pasar por la crítica: nada es cierto solo porque «siempre ha sido así».'], ['scale', 'Igualdad', 'Las personas nacen libres e iguales en derechos.'], ['book-open', 'Saber', 'La educación y la ciencia hacen mejores a las sociedades.'], ['sprout', 'Progreso', 'La humanidad puede mejorar y ser feliz en esta vida.']]
          .flatMap(([ic, h, d], i) => { const x = 90 + i * 280;
            return [after(img(plate(260, 420, `FIG. ${['I', 'II', 'III', 'IV'][i]}`), x, 190, 260, 420, 'Marco de lámina'), 'fade-up', { delay: i ? 250 : 400 }),
              along(img(HATCH(200, 130), x + 30, 240, 200, 130, 'Rayado de grabado', { decorative: true }), 'fade-up'),
              along(icon(ic, x + 90, 265, 80, BLUE), 'fade-up'),
              along(text(`<div style="font-family:${H};font-size:30px;font-weight:700;margin-bottom:8px">${h}</div>${d}`, x + 20, 390, 220, 210, { fontSize: 21, color: INK, textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Las cuatro láminas aparecen solas, como las ilustraciones de un libro antiguo. Pregunta: ¿cuál de las cuatro ideas te parece más revolucionaria para un rey absoluto?' },
      { title: 'La Enciclopedia: ordenar todo el saber', layout: 'titleOnly', bg: PAPER, extra: [
        img(plate(760, 470, 'PLANCHE I'), 90, 175, 760, 470, 'Marco de lámina grabada'),
        dg('hierarchy', 'Conocimiento humano\n  Memoria\n    Historia\n  Razón\n    Filosofía\n    Ciencias\n  Imaginación\n    Poesía y artes', 120, 225, 700, 390, { colors: 'outline', oneByOne: true, textColor: INK, fontScale: 2.2 }),
        after(stat('28', 'volúmenes entre 1751 y 1772', 890, 190, 300, BLUE, INK, 80), 'zoom-in', { delay: 300 }),
        after(stat('72.000', 'artículos, con láminas de oficios y máquinas', 890, 400, 300, BLUE, INK, 64), 'zoom-in')],
        notes: 'Al llegar salen solas las cifras; después, el árbol crece rama a rama, una por clic. El árbol del conocimiento de la Enciclopedia dividía el saber en tres facultades: memoria, razón e imaginación. Cifras redondeadas. Fue prohibida varias veces… y se siguió imprimiendo.' },
      { layout: 'blank', bg: PAPER, transition: 'page', extra: [
        img(plate(1180, 620), 50, 50, 1180, 620, 'Marco', { decorative: true }),
        text('“', 110, 60, 120, 130, { fontFamily: H, fontSize: 160, color: GOLD, lineHeight: 0.8 }),
        text('La Ilustración es la salida del ser humano de su minoría de edad. Ten el valor de servirte de tu propio entendimiento.', 200, 190, 900, 260, { fontFamily: H, fontSize: 44, color: INK, lineHeight: 1.3 }),
        on(text('— Immanuel Kant, «¿Qué es la Ilustración?», 1784', 200, 480, 900, 50, { fontSize: 26, color: SEPIA }), 'fade-in'),
        on(text('«Minoría de edad»: dejar que otros piensen por ti.', 200, 560, 900, 50, { fontSize: 24, color: BLUE, fontStyle: 'italic' }), 'fade-up')],
        notes: 'Cita adaptada. Debate de un minuto: ¿en qué cosas dejamos hoy que otros piensen por nosotros? (anuncios, redes, el grupo…).' },
      { title: 'Que el poder frene al poder', layout: 'titleOnly', bg: PAPER, extra: [
        img(SCALES, 90, 180, 520, 420, 'Balanza de la justicia'),
        ...[['Legislativo', 'Hace las leyes', 'Parlamento', '#8e3b24'], ['Ejecutivo', 'Las aplica y gobierna', 'Gobierno', BLUE], ['Judicial', 'Juzga si se cumplen', 'Jueces', '#3d6b3a']]
          .map(([h, d, who, c], i) => on(card(`<div style="font-family:${H};font-size:28px;color:${c};font-weight:700">${h}</div>${d} · <i>${who}</i>`, 660, 185 + i * 130, 530, 112, '#ffffff',
            { fontSize: 22, color: INK, borderColor: c, radius: 6, vAlign: 'middle' }), 'fade-left', { sound: 'click' })),
        on(text('Montesquieu, <i>El espíritu de las leyes</i> (1748): si un mismo rey hace las leyes, gobierna y juzga, nadie está a salvo.', 90, 600, 1100, 70, { fontSize: 22, color: SEPIA }), 'fade-up')],
        notes: 'Un clic por poder. Es la base de casi todas las constituciones actuales. Pregunta: ¿quién hace las leyes en España? ¿Y quién las aplica?' },
      { title: 'Leer ya no era solo cosa de unos pocos', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 80, y: 180, w: 720, h: 470, chartType: 'bar', color: BLUE, seriesName: 'Hombres', grid: true, dataLabels: true, yMax: 60, yTitle: '% que sabía firmar',
          data: [{ label: '1686-1690', value: 29 }, { label: '1786-1790', value: 47 }], series: [{ name: 'Mujeres', values: [14, 27], color: GOLD }] }),
        on(card('En Francia, cada vez más gente podía <b>firmar su acta de matrimonio</b>. Los cafés, los salones y los periódicos hicieron circular las ideas.', 840, 200, 350, 260, '#ffffff',
          { fontSize: 22, color: INK, borderColor: GOLD, radius: 6 }), 'fade-left'),
        text('Datos aproximados de una encuesta histórica francesa.', 840, 480, 350, 60, { fontSize: 18, color: SEPIA, fontStyle: 'italic' })],
        notes: 'Saber firmar es la forma con la que los historiadores estiman la alfabetización antigua. Fijaos en la diferencia entre hombres y mujeres: ¿por qué crees que existía?' },
      { title: 'El despotismo ilustrado', layout: 'titleOnly', bg: PAPER, extra: [
        text('Algunos reyes adoptaron ideas ilustradas: academias, caminos, canales, jardines botánicos… pero <b>sin renunciar a su poder absoluto</b>.', 90, 180, 1100, 100, { fontSize: 27, color: INK }),
        text(`<span style="font-family:${H};font-size:58px;font-weight:700">«Todo para el pueblo,</span>`, 90, 320, 1100, 90, { color: INK, textAlign: 'center' }),
        on(text(`<span style="font-family:${H};font-size:58px;font-weight:700;color:#8e3b24">pero sin el pueblo»</span>`, 90, 410, 1100, 90, { textAlign: 'center' }), 'strike', { sound: 'click' }),
        on(card('La Revolución Francesa (1789) tachó la segunda mitad de la frase: <b>el pueblo quería decidir</b>.', 240, 540, 800, 100, BLUE, { fontSize: 24, color: '#ffffff', radius: 6, textAlign: 'center', vAlign: 'middle' }), 'fade-up')],
        notes: 'Un clic tacha «pero sin el pueblo». En España, el reinado de Carlos III es el gran ejemplo de despotismo ilustrado.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'match', question: 'Une cada pensador con su idea', fontSize: 34, x: 60, y: 50, w: 1160, h: 620,
        options: ['Montesquieu = Separación de poderes', 'Rousseau = La soberanía es del pueblo', 'Voltaire = Tolerancia religiosa', 'Diderot = La Enciclopedia', 'Adam Smith = Libertad de mercado'] })],
        notes: 'Actividad «Unir parejas» con nota desde el móvil. Después, un clic muestra las soluciones.' },
      { layout: 'blank', bg: PAPER, transition: 'convex', extra: [img(HATCH(1280, 720, SEPIA), 0, 0, 1280, 720, 'Rayado', { fit: 'fill', decorative: true, opacity: 40 }),
        pollBlock({ kind: 'choice', question: '¿Qué idea ilustrada necesita más luz hoy?', fontSize: 38, x: 60, y: 60, w: 1160, h: 600, options: ['Pensar por uno mismo', 'Separar los poderes', 'La tolerancia', 'Educación para todos'] })],
        notes: 'Votación en directo, sin respuesta correcta. Pide a dos personas que defiendan opciones distintas en 30 segundos.' },
    ]));
  } },
  // 4 · The telegraph: a mahogany desk. A paper tape that prints «HOLA» dot by dot with clicks, the Morse alphabet
  // with SOS pulsing, a race across the Atlantic (a ship that crawls, a spark that flies along the cable drawn as you
  // present), a translator in code step by step, a line chart, a process, fill in the gaps and a telegram against the clock.
  edu_hist2_telegraph: { name: 'El telégrafo: el mundo en minutos', cat: 'edu', summary: 'Oficina de telégrafos: cinta Morse que se imprime con sonido, carrera por el Atlántico, código por pasos, gráfico, huecos y cuenta atrás', make: () => {
    const MAHOG = '#3e1f14', MAHOG2 = '#5b2e1d', BRASS = '#d2a64a', TAPE = '#f3ead2', INKB = '#1d2f4f', COPPER = '#b8673a', CREAM = '#f6eee0';
    const wood = [rect(0, 0, 1280, 720, MAHOG2, { fill2: MAHOG, gradAngle: 160 }), ...Array.from({ length: 9 }, (_, i) => rect(0, 40 + i * 80, 1280, 2, '#2a140c', { opacity: 35 }))];
    // The tape on the cover: «HOLA» in dots and dashes.
    const tape = []; let tx = 150;
    for (const ch of 'HOLA') { const x0 = tx;
      [...MORSE[ch]].forEach((sym, j) => { const w = sym === '.' ? 22 : 60;
        tape.push(withAnims(shape(sym === '.' ? 'ellipse' : 'rounded', tx, 589, w, 22, INKB, { radius: 11 }), A('zoom-in', { start: 'afterPrev', duration: 160, delay: j ? 60 : 260, sound: 'click' }))); tx += w + 16; });
      tape.push(text(ch, x0, 628, tx - x0 - 16, 40, { fontFamily: TYPE, fontSize: 26, fontWeight: 700, color: BRASS, textAlign: 'center' })); tx += 40; }
    const M = 0.76, mx = 90, my = 170, at = ([x, y]) => [Math.round(mx + x * M), Math.round(my + y * M)];
    const cable = [[725, 160], [640, 196], [520, 214], [410, 200], [330, 160]].map(at);
    return numbered(build({ name: 'El telégrafo: el mundo en minutos', palette: 'revela', fonts: 'clean', title: { size: 48, color: BRASS }, body: { color: CREAM } }, [
      { layout: 'blank', bg: MAHOG, transition: 'fade', extra: [...wood, glow(820, 40, 520, BRASS, MAHOG, 25),
        img(KEY, 820, 170, 380, 220, 'Manipulador de telégrafo de latón sobre madera'),
        kicker('HISTORIA CONTEMPORÁNEA · SIGLO XIX', 90, 110, 640, BRASS),
        text('El telégrafo', 84, 150, 700, 130, { fontSize: 96, fontWeight: 800, color: CREAM }),
        text('Cuando el mundo empezó a hablar en minutos', 90, 290, 700, 100, { fontSize: 32, color: '#e8cfa8' }),
        rect(0, 570, 1280, 60, TAPE, { shadow: true }), rect(0, 574, 1280, 2, '#d6c39a'), rect(0, 624, 1280, 2, '#d6c39a'),
        ...tape],
        notes: 'Al llegar, la cinta imprime sola «HOLA» en Morse, punto a punto, con el clic del receptor. Pregunta: ¿cuánto tardaba una carta de Madrid a Nueva York en 1850? (unas dos semanas).' },
      { title: 'Un alfabeto de puntos y rayas', layout: 'titleOnly', bg: MAHOG, back: wood, extra: [
        ...Object.keys(MORSE).map((c, i) => card(`<div style="font-size:36px;font-weight:800;color:${INKB};line-height:1.1">${c}</div><div style="font-family:${TYPE};font-size:22px;font-weight:700;color:${COPPER};letter-spacing:1px">${morseTxt(c)}</div>`,
          90 + (i % 13) * 86, 180 + Math.floor(i / 13) * 130, 78, 118, TAPE, { radius: 8, pad: [10, 4, 8, 4], textAlign: 'center', fontSize: 20 })),
        on(card(`<span style="font-family:${TYPE};font-weight:700;font-size:54px;letter-spacing:8px">··· ––– ···</span>`, 90, 450, 560, 110, TAPE, { color: '#b3202a', textAlign: 'center', vAlign: 'middle', radius: 10 }), 'color-pulse', { sound: 'click' }),
        text('<b style="color:#ffffff">SOS</b>: tres cortos, tres largos, tres cortos. No significa nada: se eligió porque es imposible de confundir.', 690, 450, 500, 120, { fontSize: 23, color: '#e8cfa8' }),
        text('Las letras más usadas tienen los códigos más cortos: <b>E</b> es un punto y <b>T</b>, una raya.', 90, 590, 1100, 60, { fontSize: 22, color: '#d9c4a0' })],
        notes: 'Un clic hace latir el SOS. El código se pensó para el inglés: por eso la E y la T son las más cortas. Reto: ¿quién escribe su nombre en Morse en 30 segundos?' },
      { title: 'Carrera por el Atlántico', layout: 'titleOnly', bg: INKB, extra: [
        img(ATLANTIC, mx, my, 760, 319, 'Mapa del Atlántico Norte entre Irlanda y Terranova'),
        on(ink(cable, BRASS, 4), 'draw', { duration: 1800 }),
        on(icon('ship', 662, 262, 44, '#ffffff'), 'path', { pathShape: 'custom', points: [[0, 0], [-140, 40], [-290, 60]], dx: -290, dy: 60, duration: 7000 }),
        // The spark: it appears at Ireland and flies along the cable.
        withAnims(shape('lightning', cable[0][0] - 14, cable[0][1] - 24, 30, 44, '#ffd84a'), A('zoom-in', { start: 'withPrev', duration: 200, delay: 300 }),
          A('path', { start: 'afterPrev', pathShape: 'custom', points: [[0, 0], ...rel(cable)], dx: rel(cable).at(-1)[0], dy: rel(cable).at(-1)[1], duration: 600, sound: 'whoosh' })),
        on(stat('≈ 10 días', 'tardaba la noticia en barco de vapor', 890, 180, 300, '#9ec1dc', CREAM, 56), 'fade-left'),
        on(stat('minutos', 'por el cable submarino desde 1866', 890, 380, 300, BRASS, CREAM, 64), 'zoom-in', { sound: 'chime' }),
        text('El primer cable (1858) solo funcionó tres semanas; el de 1866 ya no se rompió.', 90, 520, 760, 70, { fontSize: 22, color: '#c9d8e6' })],
        notes: 'Primer clic: se tiende el cable. Segundo: el barco sale despacio hacia América y, a la vez, el mensaje cruza el cable como un rayo. Luego, las dos cifras.' },
      { title: 'Traducir a Morse con un programa', layout: 'titleOnly', bg: '#1a1210', extra: [
        codeBlock({ x: 90, y: 180, w: 770, h: 400, fontSize: 20, lang: 'javascript', lineSteps: '1-2|4-8|10',
          code: "// Cada letra, su código (solo unas pocas)\nconst MORSE = { H: '....', O: '---', L: '.-..', A: '.-', S: '...' };\n\nfunction aMorse(texto) {\n  return texto.toUpperCase().split('')\n    .map(letra => MORSE[letra] ?? '/')\n    .join(' ');\n}\n\naMorse('Hola');  // '.... --- .-.. .-'" }),
        card(`<div style="font-size:18px;letter-spacing:3px;color:${COPPER}">SALIDA</div><div style="font-family:${TYPE};font-size:23px;font-weight:700;color:${INKB};margin-top:10px;white-space:nowrap">···· ––– ·–·· ·–</div>`, 890, 180, 300, 150, TAPE, { radius: 10, fontSize: 20 }),
        text(ul('Una <b>tabla</b> de letras y códigos', 'Recorre el texto letra a letra', 'Une los códigos con espacios'), 890, 360, 300, 220, { fontSize: 23, color: CREAM })],
        notes: 'El código resalta por pasos: la tabla, la función y el resultado. El telégrafo fue el primer «código» que cruzó el mundo: hoy los ordenadores siguen convirtiendo letras en señales.' },
      { title: 'Una red bajo el mar', layout: 'titleOnly', bg: MAHOG, back: wood, extra: [
        chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'line', color: BRASS, grid: true, dataLabels: true, yTitle: 'miles de km de cable submarino',
          data: [['1860', 3], ['1866', 9], ['1870', 30], ['1880', 90], ['1890', 160], ['1900', 300]].map(([label, value]) => ({ label, value })) }),
        on(stat('1872', 'Londres ya podía hablar con Australia', 890, 200, 300, BRASS, CREAM, 72), 'fade-left'),
        on(card('Se tendían desde barcos enormes, con kilómetros de cable de cobre forrado de gutapercha, una resina de árbol.', 890, 410, 300, 220, '#ffffff14', { fontSize: 21, color: CREAM, radius: 8 }), 'fade-up')],
        notes: 'Cifras aproximadas e ilustrativas. Hoy los cables submarinos de fibra óptica siguen llevando casi todo el tráfico de internet entre continentes.' },
      { layout: 'titleOnly', bg: CREAM, title: `<span style="color:${MAHOG2}">Del mostrador a tu puerta</span>`, extra: [
        dg('process', 'Escribir\n  Se cuentan las palabras y se paga\nPulsar\n  El telegrafista lo pasa a Morse\nViajar\n  Impulsos eléctricos por el hilo\nCopiar\n  Otro telegrafista lo descifra\nEntregar\n  Un mensajero lo lleva en bici', 90, 180, 1100, 320, { colors: 'colorful', oneByOne: true }),
        on(img(KEY, 90, 520, 220, 128, 'Manipulador de telégrafo'), 'jump', { start: 'afterPrev', sound: 'click' }),
        text('Un telegrafista experto enviaba unas <b>30 palabras por minuto</b>: más rápido que muchos escribiendo a mano.', 340, 540, 850, 90, { fontSize: 24, color: INKB, vAlign: 'middle' })],
        notes: 'Un paso por clic. Los mensajeros eran a menudo chicos de 12 a 15 años. Cifra de velocidad orientativa.' },
      { layout: 'blank', bg: MAHOG, extra: [...wood, pollBlock({ kind: 'gaps', question: 'Descifra y completa', fontSize: 36, x: 60, y: 50, w: 1160, h: 620,
        text: 'El mensaje ··· ––– ··· significa [SOS]. La letra con el código más corto es la [E]: un solo punto. El cable de 1866 unió Irlanda con [Terranova]. En los telegramas, el punto final se escribía con la palabra [STOP].' })],
        notes: 'Completar huecos con nota, desde el móvil (no distingue mayúsculas ni tildes).' },
      { layout: 'blank', bg: MAHOG, transition: 'convex', extra: [...wood,
        img(TELEGRAM, 90, 150, 560, 420, 'Impreso de telegrama con un mensaje de ejemplo'),
        text('Tu telegrama', 700, 150, 500, 70, { fontSize: 50, fontWeight: 800, color: BRASS }),
        text('Cada palabra costaba dinero. Escribe un mensaje de <b>10 palabras como máximo</b> y termina las frases con STOP.', 700, 230, 500, 140, { fontSize: 25, color: CREAM }),
        timer(180, 800, 400, 260, { style: 'digital', color: BRASS, endText: '¡STOP!' })],
        notes: 'Cuenta atrás de 3 minutos: empieza sola. Después, se leen en voz alta: ¿se entiende el mensaje sin artículos ni preposiciones?' },
    ]));
  } },

  // 5 · The Great War: a trench map in khaki. Poppies that grow by the barbed wire, two blocs and a chain of declarations
  // like dominoes, a trench in cross-section, a letter from the front censored line by line with a stamp, soldiers in
  // a horizontal bar chart, new weapons that flip in, label the trench, and a minute of silence at eleven.
  edu_hist2_ww1: { name: '1914: la guerra de las trincheras', cat: 'edu', summary: 'Caqui y amapolas: alambrada, efecto dominó, trinchera en corte, carta censurada con tachado y sello, barras, etiquetar y minuto de silencio', make: () => {
    const KHAKI = '#5d5a3c', MUD = '#3a2f22', PAPER = '#e9e0c9', POP = '#c62828', INK = '#2a2a24', SAND = '#c9b98f', OLIVE = '#4f5a2e';
    return numbered(build({ name: '1914: la guerra de las trincheras', palette: 'forest', fonts: 'websafe', title: { size: 46, color: INK, font: STENCIL }, body: { color: INK } }, [
      { layout: 'blank', bg: MUD, transition: 'fade', extra: [rect(0, 0, 1280, 720, KHAKI, { fill2: MUD, gradAngle: 180 }),
        text('1914', 700, 240, 540, 230, { fontFamily: STENCIL, fontSize: 200, fontWeight: 700, color: '#ffffff', opacity: 8, textAlign: 'right' }),
        img(WIRE(1280, '#15130f'), 0, 470, 1280, 80, 'Alambrada de espino', { decorative: true }),
        ...[[110, 520, 90], [280, 545, 70], [760, 530, 80], [980, 510, 100], [1130, 550, 70]].map(([x, y, w], i) => after(img(POPPY, x, y, w, w * 1.66, 'Amapola'), 'wipe', { dir: 'bottom', duration: 700, delay: i ? 150 : 500 })),
        kicker('HISTORIA CONTEMPORÁNEA · 4.º ESO', 90, 130, 640, SAND),
        text('LA GRAN GUERRA', 84, 170, 1110, 140, { fontFamily: STENCIL, fontSize: 112, fontWeight: 700, color: PAPER, letterSpacing: 6 }),
        text('1914-1918 · La vida en las trincheras', 90, 320, 720, 60, { fontSize: 32, color: SAND })],
        notes: 'Las amapolas crecen solas junto a la alambrada: fueron las primeras flores en brotar en los campos de batalla y hoy son el símbolo del recuerdo.' },
      { title: 'Dos bloques y una chispa', layout: 'titleOnly', bg: PAPER, extra: [
        card(`<div style="font-family:${STENCIL};font-size:30px;color:#2b4f7e">LOS ALIADOS</div>` + ul('Francia', 'Reino Unido', 'Rusia', 'Italia (desde 1915)', 'Estados Unidos (desde 1917)'), 90, 180, 330, 420, '#dfe6ee', { fontSize: 22, color: INK, radius: 6 }),
        card(`<div style="font-family:${STENCIL};font-size:30px;color:#7a2a1a">POTENCIAS CENTRALES</div>` + ul('Alemania', 'Austria-Hungría', 'Imperio otomano', 'Bulgaria'), 860, 180, 330, 420, '#eedfd6', { fontSize: 22, color: INK, radius: 6 }),
        on(card('<b>28 de junio de 1914</b><br>Asesinan en Sarajevo al heredero de Austria-Hungría', 460, 180, 360, 100, POP, { fontSize: 19, color: '#ffffff', radius: 6, textAlign: 'center', vAlign: 'middle' }), 'zoom-in', { sound: 'pop' }),
        ...[['28 jul.', 'Austria-Hungría → Serbia'], ['1 ago.', 'Alemania → Rusia'], ['3 ago.', 'Alemania → Francia'], ['4 ago.', 'Reino Unido → Alemania']].map(([d, t], i) =>
          after(card(`<b>${d}</b> · ${t}`, 466 + i * 6, 300 + i * 76, 340, 60, '#ffffff', { fontSize: 17, pad: [8, 12, 8, 12], color: INK, radius: 4, borderColor: KHAKI, vAlign: 'middle', rotation: [-3, 2, -2, 3][i] }), 'fade-down', { duration: 400, delay: 250, sound: 'click' })),
        text('Declaraciones de guerra: cada alianza arrastró a la siguiente, como fichas de dominó.', 90, 620, 1100, 50, { fontSize: 21, color: '#5a5442', textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Un clic: el atentado. Después las declaraciones de guerra caen solas una tras otra, como un dominó. En cinco semanas, media Europa estaba en guerra.' },
      { title: 'Una trinchera por dentro', layout: 'titleOnly', bg: PAPER, extra: [
        img(TRENCH, 90, 180, 760, 334, 'Corte de una trinchera con parapeto, banqueta de tiro, entarimado, refugio y alambrada'),
        ...TRENCH_PARTS.flatMap(([h, d, px, py], i) => [on(badge(i + 1, Math.round(90 + 760 * px / 100 - 17), Math.round(180 + 334 * py / 100 - 17), 34, POP), 'zoom-in', { sound: 'pop' }),
          along(text(`<b>${i + 1} · ${h}</b><br>${d}`, 880, 176 + i * 82, 320, 78, { fontSize: 18, color: INK }), 'fade-left')]),
        text('Las dos líneas enemigas podían estar a menos de 100 metros. Entre ellas, nadie sobrevivía mucho tiempo.', 90, 540, 760, 80, { fontSize: 22, color: '#5a5442' })],
        notes: 'Un clic por parte. Las trincheras se excavaban en zigzag para que una explosión no recorriera toda la línea. Después lo etiquetarán ellos.' },
      { layout: 'blank', bg: MUD, transition: 'page', extra: [
        rect(170, 50, 940, 620, '#efe6cf', { rotation: -1.5, shadow: true }),
        text('Frente del Somme, 3 de julio de 1916', 220, 80, 600, 40, { fontSize: 20, color: '#6b6040', rotation: -1.5, fontStyle: 'italic' }),
        ...[['Querida madre:', false], ['Aquí seguimos, con el barro hasta las rodillas.', false], ['Ayer cayeron tres compañeros junto al bosque.', true], ['Las ratas son tan grandes como gatos.', false],
          ['Dicen que atacaremos el jueves al amanecer.', true], ['No te preocupes: como bien y pienso mucho en casa.', false], ['Tu hijo que te quiere', false]]
          .map(([l, cut], i) => { const b = text(l, 220, 130 + i * 70, i === 6 ? 540 : 860, 64, { fontFamily: HAND, fontSize: 40, color: '#1d2a4a', rotation: -1.5 }); return cut ? on(b, 'strike', { sound: 'click' }) : b; }),
        on(text('CENSURADO', 790, 540, 280, 84, { fontFamily: STENCIL, fontSize: 52, fontWeight: 700, color: POP, borderColor: POP, radius: 8, rotation: -14, textAlign: 'center', vAlign: 'middle', opacity: 85 }), 'zoom-in', { sound: 'pop' })],
        notes: 'Carta inventada, basada en cartas reales. Un clic por cada línea que tacha el censor; el último, el sello. Pregunta: ¿por qué crees que se tachaban precisamente esas frases?' },
      { title: 'Millones de soldados movilizados', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'hbar', color: OLIVE, dataLabels: true,
          data: [['Alemania', 13], ['Rusia', 12], ['Imperio británico', 8.9], ['Francia', 8.4], ['Austria-Hungría', 7.8], ['Italia', 5.6], ['Estados Unidos', 4.3]].map(([label, value]) => ({ label, value })) }),
        on(stat('65 millones', 'de soldados en total (aprox.)', 880, 200, 330, POP, INK, 44), 'zoom-in', { sound: 'drumroll' }),
        on(text('Más de <b>9 millones</b> murieron en combate. Fue la primera guerra «industrial»: se fabricaban armas en cadena.', 880, 400, 320, 200, { fontSize: 22, color: INK }), 'fade-up')],
        notes: 'Cifras aproximadas en millones; las fuentes varían. Para dimensionarlo: España tiene hoy unos 48 millones de habitantes.' },
      { title: `<span style="color:${PAPER}">Armas nuevas, guerra nueva</span>`, layout: 'titleOnly', bg: MUD, extra: [
        img(WIRE(1280, '#15130f'), 0, 620, 1280, 80, 'Alambrada', { decorative: true }),
        ...[['target', 'Ametralladora', '600 disparos por minuto: atacar a pie era un suicidio'], ['wind', 'Gas tóxico', 'Nubes de cloro y mostaza: aparecen las máscaras'], ['truck', 'Carro de combate', 'Un tractor blindado para cruzar las alambradas'],
          ['plane', 'Avión', 'Primero para espiar; después, para combatir'], ['ship', 'Submarino', 'Hundía barcos de mercancías y de pasajeros']]
          .flatMap(([ic, h, d], i) => [(i ? after : on)(card(`<div style="font-family:${STENCIL};font-size:26px;color:${SAND};margin-top:80px">${h}</div><div>${d}</div>`, 90 + i * 224, 190, 206, 320, '#ffffff12',
            { fontSize: 19, color: PAPER, radius: 6, textAlign: 'center' }), 'flip', { delay: i ? 150 : 0 }), along(icon(ic, 165 + i * 224, 215, 56, POP), 'fade-in')])],
        notes: 'Las tarjetas giran una tras otra. Ninguna de estas armas logró romper el frente durante años: la guerra se estancó en las trincheras.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'label', question: 'Etiqueta las partes de la trinchera', image: TRENCH, options: TRENCH_PARTS.map(p => p[0]),
        points: TRENCH_PARTS.map(p => ({ x: p[2], y: p[3] })), fontSize: 38, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Actividad «Etiquetar una imagen» con nota desde el móvil: se arrastra cada nombre a su número. Al terminar, un clic muestra las soluciones.' },
      { layout: 'blank', bg: '#1d1a14', transition: 'fade', extra: [glow(760, 120, 520, POP, '#1d1a14', 25),
        img(POPPY, 980, 300, 160, 266, 'Amapola del recuerdo'),
        text('11 · 11 · 11', 90, 140, 820, 150, { fontFamily: STENCIL, fontSize: 120, fontWeight: 700, color: POP, letterSpacing: 4 }),
        text('A las <b>11</b> de la mañana del <b>11</b> de noviembre (mes <b>11</b>) de 1918 callaron las armas: el armisticio.', 90, 300, 760, 120, { fontSize: 30, color: PAPER }),
        text('Un minuto de silencio por quienes vivieron las trincheras', 90, 450, 520, 90, { fontSize: 24, color: SAND }),
        timer(60, 640, 440, 190, { style: 'digital', color: PAPER, auto: false, endText: 'Gracias' })],
        notes: 'La cuenta atrás se inicia con un clic, cuando la clase esté preparada. En muchos países el 11 de noviembre se guarda todavía este minuto de silencio.' },
    ]));
  } },

  // 6 · The Crash of 1929: Art Deco gold on black. A sunburst with a ticker tape running, the roaring twenties in three
  // figures, the index that climbs and falls with an arrow that drops, buying on margin with a table of formulas and an
  // equation, a newspaper front page, a spiral in a cycle diagram, unemployment in bars and a quiz.
  edu_hist2_crash29: { name: 'El crac del 29', cat: 'edu', summary: 'Art déco en negro y oro: cinta bursátil, gráfico que se desploma, tabla con fórmulas, ecuación, portada de periódico, ciclo y concurso', make: () => {
    const BLACK = '#0e0e10', GOLD = '#d4af37', GOLD2 = '#f1d98a', CREAM = '#f4ecd8', RED = '#c0392b', GREEN = '#3c9a62', NEWS = '#efe9dc', NINK = '#1f1d1a';
    const H = pairStacks('editorial').heading;
    const deco = [img(SUNBURST(), 0, 0, 1280, 720, 'Rayos art déco', { fit: 'fill', decorative: true }), img(DECO_FRAME(), 0, 0, 1280, 720, 'Marco art déco', { fit: 'fill', decorative: true })];
    return numbered(build({ name: 'El crac del 29', palette: 'midnight', fonts: 'editorial', title: { size: 46, color: GOLD, font: DECO, bold: false }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BLACK, transition: 'fade', extra: [...deco,
        kicker('HISTORIA CONTEMPORÁNEA · 4.º ESO', 90, 150, 1100, GOLD2, { textAlign: 'center' }),
        text('EL CRAC DEL 29', 90, 190, 1100, 170, { fontFamily: DECO, fontSize: 130, wordart: 'gold', textAlign: 'center', letterSpacing: 4 }),
        text('Jueves negro · 24 de octubre de 1929 · Nueva York', 90, 380, 1100, 50, { fontSize: 30, color: CREAM, textAlign: 'center' }),
        rect(43, 560, 1194, 64, '#000000'), rect(43, 560, 1194, 2, GOLD), rect(43, 622, 1194, 2, GOLD),
        after(text(TICKER, 70, 574, 1140, 40, { fontFamily: TYPE, fontSize: 20, fontWeight: 700, color: GOLD2, textAlign: 'center' }), 'fade-left', { duration: 2500, delay: 300 })],
        notes: 'La cinta de cotizaciones corre sola, como en las oficinas de bolsa de la época (valores inventados). Pregunta: ¿qué es una acción?' },
      { title: 'Los felices años veinte', layout: 'titleOnly', bg: BLACK, back: [deco[0]], extra: [
        ...[['car', '1 de cada 5', 'estadounidenses tenía coche en 1929'], ['music', '12 millones', 'de hogares compraron su primera radio'], ['trending-up', '× 4', 'subió la bolsa entre 1924 y 1929']]
          .flatMap(([ic, n, d], i) => [after(card(`<div style="font-family:${DECO};font-size:56px;color:${GOLD};line-height:1.1;margin-top:90px">${n}</div><div style="margin-top:10px">${d}</div>`, 90 + i * 375, 190, 350, 280, '#1a1a1e',
            { fontSize: 23, color: CREAM, radius: 2, borderColor: GOLD, textAlign: 'center' }), 'fade-up', { delay: i ? 250 : 300 }),
            along(icon(ic, 235 + i * 375, 220, 60, GOLD2), 'fade-up')]),
        text('Jazz, cine, electrodomésticos… y la idea de que la bolsa solo podía subir.', 90, 520, 1100, 50, { fontSize: 24, color: GOLD2, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Las tarjetas aparecen solas. Cifras aproximadas de Estados Unidos. Muchas compras se hacían a plazos: aparece la sociedad de consumo.' },
      { title: 'Subir como un cohete, caer como una piedra', layout: 'titleOnly', bg: BLACK, extra: [
        chartBlock({ x: 80, y: 180, w: 780, h: 470, chartType: 'line', color: GOLD, grid: true, dataLabels: true, yTitle: 'índice de la bolsa de Nueva York',
          data: [['1924', 100], ['1926', 150], ['1928', 240], ['Sep. 1929', 381], ['Nov. 1929', 198], ['1930', 165], ['1931', 90], ['Jul. 1932', 41]].map(([label, value]) => ({ label, value })) }),
        on(shape('downarrow', 920, 170, 70, 110, RED), 'path', { pathShape: 'custom', points: [[0, 0], [0, 110]], dx: 0, dy: 110, duration: 900, sound: 'whoosh' }),
        on(stat('−89 %', 'cayeron las acciones de 1929 a 1932', 900, 420, 300, RED, CREAM, 80), 'zoom-in', { sound: 'drumroll' })],
        notes: 'Valores aproximados del principal índice bursátil de Nueva York. La bolsa no recuperó el nivel de 1929 hasta 1954: ¡25 años!' },
      { title: 'Comprar a crédito: la trampa', layout: 'titleOnly', bg: BLACK, extra: [
        text('Pones <b>100 $</b>, el banco te presta <b>900 $</b> y compras acciones por <b>1.000 $</b>.', 90, 170, 1100, 50, { fontSize: 26, color: CREAM }),
        tableBlock({ x: 90, y: 240, w: 760, h: 300, fontSize: 24, header: true, headBg: GOLD, headFg: BLACK, stroke: '#3a3a40', banded: true, band: GOLD,
          rows: [['Si la bolsa…', 'Tus acciones', 'Debes', 'Te queda'], ['Sube un 20 %', '1.200 $', '900 $', '=B2-C2'], ['Se queda igual', '1.000 $', '900 $', '=B3-C3'], ['Baja un 10 %', '900 $', '900 $', '=B4-C4'], ['Baja un 30 %', '700 $', '900 $', '=B5-C5']], colW: [3, 2.2, 2, 2] }),
        on(mathBlock({ x: 890, y: 250, w: 300, h: 110, fontSize: 36, latex: '\\frac{1000}{100} = \\times 10', color: GOLD2 }), 'fade-in'),
        on(text('Con 10 veces más dinero prestado, una caída del 10 % <b>borra todo lo tuyo</b>. Con un 30 %, debes dinero que ya no tienes.', 890, 380, 300, 200, { fontSize: 21, color: CREAM }), 'fade-up'),
        text('La columna «Te queda» son fórmulas: cambia el valor de las acciones y se recalcula.', 90, 560, 760, 60, { fontSize: 19, color: '#a8a08a', fontStyle: 'italic' })],
        notes: 'Se llamaba comprar «al margen». Cuando la bolsa caía, el banco exigía el dinero: había que vender a cualquier precio, y eso hundía todavía más la bolsa.' },
      { layout: 'blank', bg: NEWS, transition: 'page', extra: [
        text('LA GACETA DE LA TARDE', 90, 50, 1100, 70, { fontFamily: DECO, fontSize: 56, color: NINK, textAlign: 'center' }),
        rect(90, 128, 1100, 3, NINK), rect(90, 134, 1100, 1, NINK),
        text('Nueva York · Viernes, 25 de octubre de 1929 · Edición extra · 5 centavos', 90, 140, 1100, 30, { fontSize: 16, color: '#5a554c', textAlign: 'center', letterSpacing: 2 }),
        on(text('PÁNICO EN LA BOLSA: 13 MILLONES DE ACCIONES VENDIDAS EN UN SOLO DÍA', 90, 185, 1100, 160, { fontFamily: H, fontSize: 52, fontWeight: 900, color: NINK, textAlign: 'center', lineHeight: 1.1 }), 'fade-down', { sound: 'drumroll' }),
        rect(90, 360, 1100, 1, NINK),
        ...[['Gritos en el parquet', 'Miles de personas se agolparon ayer ante la Bolsa. Los corredores no daban abasto: las órdenes de venta llegaban más rápido de lo que se podían anotar.'],
          ['Los bancos intentan frenar la caída', 'Un grupo de banqueros compró acciones a mediodía para dar confianza. La calma duró pocas horas.'],
          ['«Es un tropiezo pasajero»', 'Los expertos consultados por este diario creen que la economía es sólida y que los precios se recuperarán en semanas.']]
          .map(([h, d], i) => text(`<div style="font-family:${H};font-weight:700;font-size:22px;margin-bottom:6px">${h}</div>${d}`, 90 + i * 375, 380, 350, 260, { fontSize: 18, color: NINK, lineHeight: 1.35 })),
        ...[1, 2].map(i => rect(90 + i * 375 - 13, 380, 1, 240, '#8a8478'))],
        notes: 'Periódico inventado con datos reales: el Jueves negro se vendieron casi 13 millones de acciones. Fijaos en la tercera columna: ¿acertaron los expertos?' },
      { title: 'Una espiral que no se detenía', layout: 'titleOnly', bg: BLACK, back: [deco[0]], extra: [
        dg('cycle', 'Cae la bolsa\nQuiebran bancos\nSe pierden los ahorros\nSe compra menos\nCierran fábricas\nCrece el paro', 260, 170, 760, 500, { colors: 'accent', oneByOne: true, fontScale: 1.2 })],
        notes: 'Un paso por clic, y vuelta a empezar: es un círculo vicioso. Pregunta: ¿en qué punto del círculo podría intervenir un gobierno para romperlo?' },
      { title: 'Uno de cada cuatro, sin trabajo', layout: 'titleOnly', bg: BLACK, extra: [
        chartBlock({ x: 80, y: 180, w: 720, h: 470, chartType: 'bar', color: RED, grid: true, dataLabels: true, yTitle: '% de paro en Estados Unidos',
          data: [['1929', 3], ['1930', 9], ['1931', 16], ['1932', 24], ['1933', 25], ['1935', 20], ['1937', 14]].map(([label, value]) => ({ label, value })) }),
        on(card(`<div style="font-family:${DECO};font-size:34px;color:${GOLD}">El New Deal</div>Desde 1933, el Estado contrata a millones de personas para construir presas, carreteras y escuelas, y crea los subsidios de paro.`, 840, 190, 350, 330, '#1a1a1e',
          { fontSize: 22, color: CREAM, borderColor: GOLD, radius: 2 }), 'fade-left'),
        text('Datos aproximados.', 840, 540, 350, 40, { fontSize: 18, color: '#8a8478', fontStyle: 'italic' })],
        notes: 'La crisis cruzó el océano y llegó a Europa. En Alemania, el paro ayudó al ascenso de los partidos extremistas: un aviso para la década siguiente.' },
      { layout: 'blank', bg: BLACK, transition: 'convex', extra: [quiz('¿Qué era comprar acciones «al margen»?', ['Comprarlas solo en los márgenes del día', 'Comprarlas con dinero prestado', 'Comprarlas en otro país', 'Comprar acciones del Estado'], 1)],
        notes: 'Concurso con tiempo. Comprar con dinero prestado multiplicó las ganancias en la subida… y las pérdidas en la caída.' },
    ]));
  } },
  // 7 · The suffragists: purple, white and green. A sash that sweeps in and a rosette with curved text, a timeline of
  // pins that bounce in country by country, the 1931 vote in a doughnut beside a quotation, two strategies side by side,
  // ballots that drop into the urn with sound, women in parliament in bars, fill in the gaps and a debate.
  edu_hist2_suffrage: { name: 'Sufragistas: el voto de la mujer', cat: 'edu', summary: 'Morado, blanco y verde: escarapela con texto curvo, línea del tiempo que cae, dona, urna con sonido, barras, huecos y debate', make: () => {
    const BG = '#2a1240', CREAM = '#fbf8f2', PURPLE = '#5b2a86', LILAC = '#c9a8f0', GREEN = '#2e7d32', MINT = '#8fdc98', GOLD = '#e0b83a';
    const H = pairStacks('friendly').heading, X = y => Math.round(110 + (y - 1890) * 12.47);
    const PINS = [[1893, 'Nueva Zelanda', 'A1'], [1906, 'Finlandia', 'B1'], [1913, 'Noruega', 'A2'], [1918, 'Reino Unido*', 'B2'], [1920, 'Estados Unidos', 'A1'], [1931, 'España', 'B1'], [1944, 'Francia', 'A2'], [1946, 'Italia', 'B2'], [1971, 'Suiza', 'A1']];
    const LV = { A1: 190, A2: 300, B1: 470, B2: 570 };
    return numbered(build({ name: 'Sufragistas: el voto de la mujer', palette: 'violet', fonts: 'friendly', title: { size: 48, color: CREAM }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [glow(760, -80, 640, PURPLE, BG, 60),
        ...[PURPLE, CREAM, GREEN].map((c, i) => after(rect(-260, 520 + i * 58, 1800, 58, c, { rotation: -10 }), 'fade-right', { duration: 600, delay: i ? 0 : 300 })),
        after(img(ROSETTE, 955, 135, 190, 240, 'Escarapela morada, blanca y verde con la palabra VOTO'), 'zoom-in', { sound: 'pop' }),
        text('VOTO PARA LAS MUJERES · VOTO PARA LAS MUJERES · ', 860, 40, 380, 380, { fontFamily: H, fontSize: 20, fontWeight: 700, curve: 100, color: LILAC, textAlign: 'center', letterSpacing: 2 }),
        kicker('HISTORIA CONTEMPORÁNEA · 4.º ESO', 90, 120, 640, MINT),
        text('Sufragistas', 84, 160, 760, 140, { fontFamily: H, fontSize: 108, fontWeight: 800, color: CREAM }),
        text('Votar no fue un regalo: la larga lucha por el voto de las mujeres', 90, 310, 680, 100, { fontSize: 30, color: LILAC })],
        notes: 'Al llegar, la banda cruza la diapositiva y aparece la escarapela. Morado (dignidad), blanco (pureza) y verde (esperanza) eran los colores del movimiento británico.' },
      { title: '¿Cuándo pudieron votar?', layout: 'titleOnly', bg: BG, extra: [
        rect(100, 418, 1090, 4, CREAM), ...[1890, 1910, 1930, 1950, 1970].map(y => text(String(y), X(y) - 30, 648, 60, 30, { fontSize: 16, color: LILAC, textAlign: 'center' })),
        ...[1890, 1910, 1930, 1950, 1970].map(y => rect(X(y) - 1, 410, 2, 20, LILAC)),
        ...PINS.flatMap(([y, c, lv], i) => { const x = X(y), top = LV[lv], above = lv[0] === 'A', sp = c === 'España';
          const stem = above ? rect(x - 1, top + 66, 2, 420 - top - 66, sp ? GOLD : LILAC) : rect(x - 1, 422, 2, top - 422, sp ? GOLD : LILAC);
          const cx = Math.max(90, Math.min(1190 - 140, x - 70));
          return [(i ? after : on)(card(`<div style="font-size:24px;font-weight:800;line-height:1">${y}</div><div>${c}</div>`, cx, top, 140, 66, sp ? GOLD : PURPLE,
            { fontSize: 16, color: sp ? BG : CREAM, radius: 8, pad: [6, 8, 6, 8], textAlign: 'center', vAlign: 'middle' }), 'bounce', { duration: 500, delay: i ? 120 : 0, sound: 'pop' }),
            along(stem, 'fade-in'), along(shape('ellipse', x - 8, 412, 16, 16, sp ? GOLD : MINT), 'zoom-in')]; }),
        text('* Desde 1918 las mayores de 30 años; en igualdad con los hombres, desde 1928.', 90, 672, 1100, 30, { fontSize: 15, color: LILAC })],
        notes: 'Un clic y los países caen uno tras otro. Pregunta: ¿os sorprende alguna fecha? Suiza no aprobó el voto femenino en todo el país hasta 1971.' },
      { title: 'España, 1 de octubre de 1931', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 180, w: 520, h: 440, chartType: 'doughnut', data: [{ label: 'A favor', value: 161, color: GREEN }, { label: 'En contra', value: 121, color: '#c0392b' }, { label: 'Ausentes', value: 188, color: '#6a5a82' }] }),
        text('«Resolved lo que queráis, pero afrontando la responsabilidad de dar entrada a esa mitad del género humano en la política.»', 640, 190, 560, 280, { fontFamily: H, fontSize: 30, color: CREAM, lineHeight: 1.3 }),
        text('— Clara Campoamor, diputada, en el debate de la Constitución', 640, 470, 560, 60, { fontSize: 20, color: LILAC }),
        on(card('El voto femenino se aprobó por <b>161 votos contra 121</b>. Muchos diputados prefirieron no votar.', 640, 550, 560, 100, PURPLE, { fontSize: 21, color: CREAM, radius: 10, vAlign: 'middle' }), 'fade-up')],
        notes: 'Votación de las Cortes Constituyentes sobre el artículo del voto femenino. Curiosidad: otra diputada, Victoria Kent, pidió aplazarlo porque temía el voto conservador de las mujeres.' },
      { title: 'Dos caminos hacia el voto', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<div style="font-family:${H};font-size:32px;font-weight:800;color:${CREAM}">Convencer</div><div style="color:${LILAC};margin-bottom:10px">Las «sufragistas»</div>` + ul('Peticiones con miles de firmas', 'Periódicos y folletos', 'Marchas pacíficas', 'Debates y conferencias'), 90, 190, 520, 340, PURPLE, { fontSize: 26, color: CREAM, radius: 16 }), 'fade-right'),
        on(card(`<div style="font-family:${H};font-size:32px;font-weight:800;color:${CREAM}">Llamar la atención</div><div style="color:${MINT};margin-bottom:10px">Las «militantes»</div>` + ul('Romper escaparates', 'Encadenarse a las verjas', 'Huelgas de hambre en prisión', 'Interrumpir mítines'), 670, 190, 520, 340, GREEN, { fontSize: 26, color: CREAM, radius: 16 }), 'fade-left'),
        text('«Hechos, no palabras», decía el lema de las militantes británicas.', 90, 570, 1100, 50, { fontSize: 22, color: LILAC, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Un clic por camino. Debate: ¿qué estrategia creéis que fue más eficaz? Las dos se reforzaron: unas abrían la puerta a las otras.' },
      { layout: 'blank', bg: BG, transition: 'push', extra: [glow(180, 160, 520, PURPLE, BG, 55),
        img(URN, 120, 300, 420, 360, 'Urna transparente'),
        ...[[-30, -6], [10, 4], [-10, -3], [20, 7], [0, 0]].map(([dx, rot], i) => withAnims(img(BALLOT, 270 + dx, 110 + i * 6, 120, 80, 'Papeleta', { rotation: rot }),
          A('path', { start: i ? 'afterPrev' : 'click', pathShape: 'custom', points: [[0, 0], [-dx, 300 - i * 6]], dx: -dx, dy: 300 - i * 6, duration: 600, sound: 'pop' }), A('fade-out', { start: 'afterPrev', duration: 150 }))),
        text('19 de noviembre<br>de 1933', 600, 110, 600, 140, { fontFamily: H, fontSize: 52, lineHeight: 1.15, fontWeight: 800, color: GOLD }),
        text('Por primera vez, las españolas votan en unas elecciones generales.', 600, 270, 600, 100, { fontSize: 30, color: CREAM }),
        on(stat('≈ 6,8 millones', 'de mujeres con derecho a voto: más de la mitad del censo', 600, 400, 600, MINT, CREAM, 64), 'zoom-in', { sound: 'applause' })],
        notes: 'Con un clic, las papeletas caen una tras otra en la urna; con el siguiente, la cifra, con aplausos. Cifra del censo aproximada.' },
      { title: 'Del voto al escaño', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'bar', color: MINT, grid: true, dataLabels: true, yMax: 50, yTitle: '% de diputadas en el Congreso',
          data: [['1931', 0.6], ['1977', 6], ['1989', 15], ['2000', 28], ['2008', 36], ['2019', 44]].map(([label, value]) => ({ label, value })) }),
        on(stat('3 de 470', 'diputadas en las Cortes de 1931', 880, 200, 310, GOLD, CREAM, 56), 'fade-left'),
        on(text('Votar fue el primer paso. Ser elegidas, gobernar y dirigir llevó (y lleva) mucho más tiempo.', 880, 400, 310, 200, { fontSize: 23, color: CREAM }), 'fade-up')],
        notes: 'Porcentajes aproximados de diputadas en el Congreso de los Diputados. Entre 1939 y 1977 no hubo elecciones libres en España.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', question: 'Completa la historia del voto', fontSize: 36, x: 60, y: 50, w: 1160, h: 620,
        text: 'El primer país en reconocer el voto de las mujeres fue [Nueva Zelanda], en 1893. En España se aprobó en [1931] y las mujeres votaron por primera vez en [1933]. El lema de las militantes británicas era «Hechos, no [palabras]».' })],
        notes: 'Completar huecos con nota, desde el móvil (no distingue mayúsculas ni tildes).' },
      { layout: 'blank', bg: BG, transition: 'convex', extra: [glow(900, 380, 520, GREEN, BG, 30),
        pollBlock({ kind: 'choice', question: '¿Debería poder votarse a los 16 años?', fontSize: 40, x: 60, y: 60, w: 1160, h: 600, options: ['Sí, en todas', 'Solo municipales', 'No, a los 18', 'No lo tengo claro'] })],
        notes: 'Votación en directo para abrir un debate: hoy, en algunos países ya se vota a los 16. ¿Qué argumentos se usaban hace cien años contra el voto de las mujeres? ¿Se parecen a los de ahora?' },
    ]));
  } },

  // 8 · The space race: mission control. NASA's Saturn V in 3D that moves with Transform, a scoreboard in a table,
  // the stages of the rocket, the escape velocity as an equation, the free-return trajectory drawn as the capsule
  // flies it, the lunar module and an astronaut in 3D, the budget in an area chart, a quiz and the final countdown.
  edu_hist2_space: { name: 'La carrera espacial', cat: 'edu', summary: 'Control de misión: Saturno V 3D con Transformar, tabla, ecuación, trayectoria que se traza, módulo lunar 3D, áreas, concurso y cuenta atrás', make: () => {
    const BG = '#0c1a22', PANEL = '#14303d', AMBER = '#ffb000', PHOS = '#7cf29a', RED = '#e63946', STEEL = '#9fb3c0', WHITE = '#e8f1f5';
    const H = pairStacks('tech').heading, SAT = uid();
    const scan = img(SCAN, 0, 0, 1280, 720, 'Líneas de pantalla', { fit: 'fill', decorative: true });
    const saturn = (x, y, w, h, props = {}) => keep(nasa('saturn-v', x, y, w, h, { caption: '', autoRotate: true, view: 'front', ...props }), SAT);
    const readout = (label, value, x, y, w, color = AMBER) => card(`<div style="font-size:15px;letter-spacing:3px;color:${STEEL}">${label}</div><div style="font-family:${MONO};font-size:34px;font-weight:700;color:${color}">${value}</div>`,
      x, y, w, 96, PANEL, { radius: 6, borderColor: '#2b4a5a', pad: [12, 16, 12, 16] });
    return numbered(build({ name: 'La carrera espacial', palette: 'ocean', fonts: 'tech', title: { size: 46, color: AMBER }, body: { color: WHITE } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [glow(780, 60, 620, '#1f6f8b', BG, 45), scan,
        saturn(860, 40, 330, 620),
        kicker('CONTROL DE MISIÓN · 1957-1969', 90, 140, 700, AMBER),
        text('LA CARRERA ESPACIAL', 84, 180, 760, 200, { fontFamily: H, fontSize: 84, fontWeight: 700, color: WHITE, lineHeight: 1 }),
        text('Dos superpotencias, una Guerra Fría y un objetivo: la Luna', 90, 380, 680, 90, { fontSize: 28, color: STEEL }),
        ...Array.from({ length: 6 }, (_, i) => after(shape('ellipse', 92 + i * 40, 520, 22, 22, [PHOS, PHOS, AMBER, PHOS, RED, PHOS][i]), 'zoom-in', { duration: 200, delay: i ? 80 : 400, sound: i === 5 ? 'chime' : undefined })),
        text('ESTADO: LISTO PARA EL LANZAMIENTO', 90, 560, 700, 40, { fontFamily: MONO, fontSize: 20, color: PHOS }),
        text('Modelos 3D: NASA 3D Resources', 90, 672, 400, 30, { fontSize: 12, color: '#5f7a88' })],
        notes: 'Al llegar se encienden los pilotos del panel. El Saturno V gira solo: arrástralo para verlo. Pregunta: ¿por qué dos países gastaron fortunas en llegar a un sitio sin aire ni agua?' },
      { title: 'El marcador de la carrera', layout: 'titleOnly', bg: BG, back: [scan], extra: [
        tableBlock({ x: 90, y: 180, w: 780, h: 440, fontSize: 24, header: true, headBg: AMBER, headFg: BG, stroke: '#2b4a5a', banded: true, band: '#4f7a8c',
          rows: [['Hito', 'URSS', 'EE. UU.'], ['Primer satélite artificial', '1957', '1958'], ['Primer ser vivo en órbita', '1957', '1961'], ['Primer ser humano en órbita', '1961', '1962'], ['Primera mujer en el espacio', '1963', '1983'], ['Primer paseo espacial', '1965', '1965'], ['Primeras personas en la Luna', '—', '1969']], colW: [5, 2, 2] }),
        on(readout('VENTAJA INICIAL', 'URSS', 910, 190, 280, RED), 'fade-left'),
        on(readout('META FINAL', 'EE. UU.', 910, 310, 280, PHOS), 'fade-left'),
        on(text('Cada «primera vez» era propaganda: demostraba al mundo qué sistema era mejor.', 910, 440, 280, 180, { fontSize: 21, color: WHITE }), 'fade-up')],
        notes: 'La URSS ganó casi todas las primeras etapas (el Sputnik, la perra Laika, Yuri Gagarin, Valentina Tereshkova). Estados Unidos respondió con el programa Apolo.' },
      { title: 'Un cohete de 36 pisos', layout: 'titleOnly', bg: BG, autoAnimate: true, back: [scan], extra: [
        saturn(80, 150, 360, 540, { autoRotate: false }),
        ...[['FASE 1', '5 motores · 2 min 40 s · llega a 68 km de altura'], ['FASE 2', '5 motores · 6 min · casi hasta la órbita'], ['FASE 3', '1 motor · órbita y rumbo a la Luna'], ['NAVES', 'Módulo lunar, de servicio y cápsula de mando']]
          .map(([h, d], i) => on(card(`<span style="font-family:${MONO};color:${AMBER};font-weight:700">${h}</span> · ${d}`, 480, 180 + i * 86, 420, 74, PANEL, { fontSize: 19, color: WHITE, radius: 6, vAlign: 'middle' }), 'fade-right')),
        on(readout('ALTURA', '110 m', 940, 180, 250), 'zoom-in'), on(readout('MASA', '2.900 t', 940, 296, 250), 'zoom-in'), on(readout('EMPUJE', '34 MN', 940, 412, 250, RED), 'zoom-in'),
        text('Solo volvía a la Tierra la cápsula de mando: 3,2 m de alto.', 480, 560, 720, 60, { fontSize: 22, color: STEEL })],
        notes: 'Transformar: el Saturno V viaja desde la portada y se queda quieto para estudiarlo. Un clic por fase y luego las cifras (aproximadas).' },
      { title: 'Escapar de la Tierra', layout: 'titleOnly', bg: BG, back: [scan], extra: [glow(-120, 360, 600, '#2b7bbf', BG, 60),
        on(mathBlock({ x: 420, y: 190, w: 600, h: 130, fontSize: 54, latex: 'v_e = \\sqrt{\\frac{2\\,G\\,M}{R}}', color: WHITE }), 'fade-in'),
        on(mathBlock({ x: 300, y: 340, w: 840, h: 100, fontSize: 32, latex: 'v_e = \\sqrt{\\frac{2 \\cdot 6{,}67\\cdot10^{-11} \\cdot 5{,}97\\cdot10^{24}}{6{,}37\\cdot10^{6}}} \\approx 11{,}2\\ \\text{km/s}', color: PHOS }), 'fade-in'),
        on(readout('VELOCIDAD DE ESCAPE', '40.300 km/h', 300, 480, 400), 'zoom-in', { sound: 'drumroll' }),
        on(readout('MADRID-BARCELONA', 'en 45 s', 740, 480, 400, PHOS), 'zoom-in'),
        text('G: constante de gravitación · M: masa de la Tierra · R: radio de la Tierra', 300, 600, 840, 40, { fontSize: 18, color: STEEL })],
        notes: 'La velocidad mínima para escapar de la gravedad terrestre sin seguir empujando. Para la Luna no hacía falta tanto: bastaba algo menos, unos 10,8 km/s, en el momento justo.' },
      { title: 'Ida y vuelta en forma de ocho', layout: 'titleOnly', bg: BG, extra: [
        img(EARTH_MOON, 90, 170, 1100, 380, 'La Tierra y la Luna'),
        on(ink(FREE_RETURN.map(([x, y]) => [x + 90, y + 170]), AMBER, 3), 'draw', { duration: 6000 }),
        along(shape('triangle', FREE_RETURN[0][0] + 90 - 10, FREE_RETURN[0][1] + 170 - 10, 20, 20, WHITE), 'path', { pathShape: 'custom', points: [[0, 0], ...rel(FREE_RETURN)], dx: rel(FREE_RETURN).at(-1)[0], dy: rel(FREE_RETURN).at(-1)[1], duration: 6000 }),
        ...[['DÍA 0', 'Despegue · 16 jul.', 90], ['DÍA 3', 'Órbita lunar · 19 jul.', 380], ['DÍA 4', 'Alunizaje · 20 jul.', 670], ['DÍA 8', 'Amerizaje · 24 jul.', 960]].map(([d, t, x], i) =>
          after(card(`<span style="font-family:${MONO};color:${AMBER};font-weight:700">${d}</span><br>${t}`, x, 570, 230, 80, PANEL, { fontSize: 19, color: WHITE, radius: 6 }), 'fade-up', { delay: i ? 900 : 0 }))],
        notes: 'Un clic: la trayectoria se dibuja mientras la nave la recorre. Es una «trayectoria de retorno libre»: si fallaban los motores, la gravedad de la Luna los devolvía a casa. Fechas del Apolo 11 (1969).' },
      { layout: 'blank', bg: '#05080b', transition: 'fade', back: [scan], extra: [
        nasa('apollo-lunar-module', 60, 90, 520, 480, { caption: '', autoRotate: true, view: 'three' }),
        nasa('astronaut', 560, 150, 220, 420, { caption: '', autoRotate: false, view: 'front' }),
        text('«Es un pequeño paso para el hombre, pero un gran salto para la humanidad.»', 800, 170, 400, 280, { fontFamily: H, fontSize: 34, color: WHITE, lineHeight: 1.25 }),
        text('Al pisar la Luna · 21 de julio de 1969 (hora europea)', 800, 470, 400, 70, { fontSize: 19, color: STEEL }),
        on(text('ÁGUILA HA ALUNIZADO', 800, 560, 400, 40, { fontFamily: MONO, fontSize: 22, color: PHOS, letterSpacing: 2 }), 'fade-in', { sound: 'chime' })],
        notes: 'Módulo lunar y traje espacial en 3D (NASA). Unos 600 millones de personas lo vieron en directo por televisión. Hora: madrugada del 21 de julio en Europa.' },
      { title: 'Lo que costaba la Luna', layout: 'titleOnly', bg: BG, back: [scan], extra: [
        chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'area', color: '#3fb6d8', grid: true, yTitle: '% del presupuesto federal de EE. UU.',
          data: [['1959', 0.5], ['1961', 0.9], ['1963', 2.3], ['1965', 4.3], ['1966', 4.4], ['1968', 2.7], ['1970', 2.0], ['1975', 1.0]].map(([label, value]) => ({ label, value })) }),
        on(readout('MÁXIMO, 1966', '4,4 %', 890, 190, 300), 'zoom-in'),
        on(text('Unas <b>400.000 personas</b> trabajaron en el programa Apolo. Después del alunizaje, el presupuesto cayó en picado.', 890, 320, 300, 220, { fontSize: 22, color: WHITE }), 'fade-up')],
        notes: 'Porcentajes aproximados del presupuesto de la agencia espacial estadounidense. Hoy ronda el 0,4 %. Debate: ¿mereció la pena?' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué país puso en órbita el primer satélite artificial?', ['Estados Unidos', 'La Unión Soviética', 'Francia', 'China'], 1)],
        notes: 'El Sputnik 1 (1957): una esfera de 58 cm que solo emitía un pitido… y que asustó a todo Occidente.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [glow(780, 60, 620, '#e8743b', BG, 35), scan,
        saturn(860, 40, 330, 620),
        text('T menos', 90, 150, 500, 70, { fontFamily: MONO, fontSize: 40, color: STEEL }),
        timer(10, 90, 230, 300, { style: 'digital', color: AMBER, endText: '¡DESPEGUE!' }),
        text('Recordad: cada «primera vez» fue también una carrera entre dos formas de ver el mundo.', 90, 560, 680, 90, { fontSize: 24, color: WHITE })],
        notes: 'Cuenta atrás de 10 segundos para despedir la clase: empieza sola y suena al terminar. Que la cuenten en voz alta.' },
    ]));
  } },

  // 9 · The Berlin Wall: concrete and spray paint. A wall with graffiti under searchlights, the divided city with the wall
  // drawn round West Berlin, the death strip in cross-section, people voting with their feet in bars, East and West
  // side by side, the fall of the wall slab by slab with fireworks and applause, order the events and a word cloud.
  edu_hist2_berlinwall: { name: 'El Muro de Berlín', cat: 'edu', summary: 'Hormigón y grafiti: focos que barren, muro que se dibuja en el mapa, franja de la muerte, barras, comparativa, muro que cae, ordenar y nube', make: () => {
    const SKY = '#1f2a3d', NIGHT = '#141a26', CONC = '#9a9893', EAST = '#5c6670', LIGHT = '#eef0f2', PINK = '#ff4d6d', YEL = '#ffd60a', BLUE = '#3a86ff', MINTG = '#06d6a0';
    const H = pairStacks('modern').heading, S = 0.95, mx = 90, my = 180;
    return numbered(build({ name: 'El Muro de Berlín', palette: 'revela', fonts: 'modern', title: { size: 46, color: LIGHT }, body: { color: LIGHT } }, [
      { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [rect(0, 0, 1280, 720, SKY, { fill2: NIGHT, gradAngle: 180 }),
        ...[[160, -60, 18], [900, -60, -16]].map(([x, y, r]) => on(shape('triangle', x, y, 260, 560, '#fff6c8', { opacity: 12, rotation: 180 + r }), 'teeter', { start: 'afterPrev', duration: 2000 })),
        img(WALL(), 0, 400, 1280, 300, 'Muro de hormigón cubierto de grafitis'),
        kicker('HISTORIA CONTEMPORÁNEA · 4.º ESO', 90, 110, 700, YEL),
        text('EL MURO DE BERLÍN', 84, 150, 1110, 120, { fontFamily: H, fontSize: 88, fontWeight: 800, color: LIGHT }),
        text('1961-1989 · Una ciudad partida en dos', 90, 270, 800, 60, { fontSize: 32, color: '#c9d2dc' })],
        notes: 'Los focos barren el cielo al llegar. Pregunta de arranque: imagina que una mañana te levantas y no puedes cruzar a la otra mitad de tu ciudad, donde viven tus abuelos.' },
      { title: 'Una isla dentro de otro país', layout: 'titleOnly', bg: NIGHT, extra: [
        img(BERLIN, mx, my, 665, 456, 'Berlín dividido en cuatro sectores'),
        on(ink(BERLIN_WALL_PTS.map(([x, y]) => [mx + x * S, my + y * S]), PINK, 6), 'draw', { duration: 3000, sound: 'whoosh' }),
        text('Tras la Segunda Guerra Mundial, los vencedores se repartieron Alemania y también Berlín, que quedó <b>dentro</b> de la Alemania comunista.', 800, 180, 390, 180, { fontSize: 22, color: LIGHT }),
        on(stat('155 km', 'de muro rodeaban Berlín Oeste, desde el 13 de agosto de 1961', 800, 370, 390, PINK, LIGHT, 56, { fontSize: 20 }), 'zoom-in'),
        on(stat('28 años', 'duró la ciudad partida', 800, 520, 390, YEL, LIGHT, 56, { fontSize: 20 }), 'zoom-in')],
        notes: 'Un clic: el muro se dibuja alrededor de Berlín Oeste (los sectores francés, británico y estadounidense). Se levantó en una sola noche, primero con alambre de espino.' },
      { title: 'La franja de la muerte', layout: 'titleOnly', bg: NIGHT, extra: [
        img(STRIP, 90, 180, 760, 274, 'Corte de la frontera: muro interior, valla, torre, camino, foso, arena y muro exterior'),
        ...STRIP_PARTS.flatMap(([h, d, px], i) => [on(badge(i + 1, Math.round(90 + 760 * px / 100 - 16), 466, 32, PINK), 'zoom-in', { sound: 'pop' }),
          along(text(`<b>${i + 1} · ${h}</b> — ${d}`, 880, 180 + i * 64, 320, 60, { fontSize: 17, color: LIGHT }), 'fade-left')]),
        text('Más de 140 personas murieron intentando cruzar.', 90, 540, 760, 50, { fontSize: 24, color: YEL })],
        notes: 'Un clic por elemento, de este a oeste. La cifra de víctimas es la de las investigaciones más aceptadas; algunas fuentes dan números mayores.' },
      { title: 'Votar con los pies', layout: 'titleOnly', bg: NIGHT, extra: [
        chartBlock({ x: 80, y: 180, w: 780, h: 470, chartType: 'bar', color: BLUE, grid: true, dataLabels: true, yTitle: 'miles de personas que huyeron al Oeste',
          data: [['1950', 198], ['1953', 331], ['1956', 279], ['1959', 144], ['1960', 199], ['1961', 207], ['1962', 21], ['1965', 29]].map(([label, value]) => ({ label, value })) }),
        on(stat('≈ 2,7', 'millones se marcharon entre 1949 y 1961, muchos jóvenes y con estudios', 900, 200, 300, YEL, LIGHT, 64, { h: 230 }), 'fade-left'),
        on(text('Después de 1961 la cifra se desploma: <b>el muro cerró la salida</b>.', 900, 440, 300, 140, { fontSize: 22, color: LIGHT }), 'fade-up')],
        notes: 'Cifras aproximadas. «Votar con los pies»: irse de un país es una forma de decir lo que se piensa de él. Pregunta: ¿por qué perder médicos e ingenieros era un problema grave?' },
      { layout: 'blank', bg: NIGHT, extra: [
        rect(0, 0, 620, 720, EAST), rect(660, 0, 620, 720, '#20263a'),
        rect(620, 0, 40, 720, CONC), rect(614, 0, 52, 20, '#b4b2ac'),
        text('ESTE', 90, 60, 480, 70, { fontFamily: H, fontSize: 56, fontWeight: 800, color: '#d6dbe0' }),
        text('OESTE', 710, 60, 480, 70, { fontFamily: H, fontSize: 56, fontWeight: 800, color: YEL }),
        ...[['store', 'Tiendas con colas y poca variedad', 'Escaparates llenos'], ['car', 'Coche: hasta 15 años de espera', 'Coches de muchas marcas'], ['plane', 'Viajar al Oeste: prohibido', 'Libertad para viajar'], ['newspaper', 'Prensa controlada por el partido', 'Prensa libre y plural']]
          .flatMap(([ic, e, w], i) => [on(icon(ic, 90, 180 + i * 120, 48, '#d6dbe0'), 'fade-right'), along(text(e, 160, 180 + i * 120, 420, 90, { fontSize: 24, color: '#eef0f2' }), 'fade-right'),
            along(icon(ic, 710, 180 + i * 120, 48, [PINK, YEL, BLUE, MINTG][i]), 'fade-left'), along(text(w, 780, 180 + i * 120, 420, 90, { fontSize: 24, color: LIGHT }), 'fade-left')])],
        notes: 'Un clic por fila: el mismo aspecto de la vida, a cada lado. Ojo: el Este tenía vivienda barata y pleno empleo; el Oeste, paro y desigualdad. Que la clase busque matices.' },
      { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
        ...Array.from({ length: 16 }, (_, i) => withAnims(rect(i * 80, 420, 79, 300, i % 2 ? '#a3a19b' : CONC, { stroke: '#6f6d68', strokeWidth: 2 }),
          A('path', { start: i ? 'withPrev' : 'click', pathShape: 'custom', points: [[0, 0], [((i % 3) - 1) * 30, 340]], dx: ((i % 3) - 1) * 30, dy: 340, duration: 900, delay: (i * 7 % 16) * 70, sound: i ? undefined : 'whoosh' }))),
        ...[[110, 440, PINK], [380, 500, YEL], [640, 430, BLUE], [900, 490, MINTG], [1060, 410, YEL], [250, 540, PINK]].map(([x, y, c], i) => after(shape('burst', x, y, 140, 140, c, { opacity: 85 }), 'zoom-in', { duration: 400, delay: i ? 120 : 300, sound: i ? undefined : 'applause' })),
        text('9 de noviembre de 1989', 90, 150, 1100, 100, { fontFamily: H, fontSize: 76, fontWeight: 800, color: LIGHT, textAlign: 'center' }),
        text('Un error en una rueda de prensa abre la frontera: miles de personas cruzan esa misma noche.', 190, 260, 900, 100, { fontSize: 28, color: '#d6dbe0', textAlign: 'center' })],
        notes: 'Un clic: el muro se derrumba y estallan los fuegos (con aplausos). Un portavoz anunció por error que se podía viajar «inmediatamente»: la gente fue a los puestos fronterizos y los guardias acabaron abriendo.' },
      { layout: 'blank', bg: NIGHT, extra: [img(WALL(false), 0, 600, 1280, 120, 'Muro', { fit: 'cover', focusY: 0, decorative: true, opacity: 50 }), pollBlock({ kind: 'order', question: 'Ordena los hechos', fontSize: 38, x: 60, y: 40, w: 1160, h: 560,
        options: ['Berlín, partido en cuatro sectores', 'Bloqueo de Berlín y puente aéreo', 'Se levanta el muro', 'Cae el muro', 'Alemania se reunifica'] })],
        notes: 'Actividad «Poner en orden» con nota desde el móvil. Soluciones: 1945, 1948, 1961, 1989 y 1990. Pista: entre la construcción y la caída pasaron 28 años.' },
      { layout: 'blank', bg: NIGHT, transition: 'convex', extra: [img(WALL(), 0, 560, 1280, 160, 'Muro con grafitis', { fit: 'cover', focusY: 0, decorative: true, opacity: 70 }),
        pollBlock({ kind: 'word', question: '¿Qué muros, visibles o invisibles, separan hoy a las personas?', options: [], fontSize: 36, x: 60, y: 40, w: 1160, h: 500 })],
        notes: 'Nube de palabras en directo. Suelen aparecer fronteras, el dinero, el idioma o los prejuicios: buen cierre para hablar de convivencia.' },
    ]));
  } },

  // 10 · From ARPANET to the web: a green phosphor terminal. Lines that type themselves with clicks, LOGIN cut to «LO»,
  // the first network of four nodes drawn as you present, packets that travel by different roads and arrive out of order,
  // the code of a first web page beside an old monitor, internet users in an area chart, chevrons, a quiz and questions.
  edu_hist2_internet: { name: 'De ARPANET a la web', cat: 'edu', summary: 'Terminal de fósforo verde: texto que se teclea solo, red que se dibuja, paquetes por rutas distintas, código HTML, monitor, áreas y concurso', make: () => {
    const TERM = '#050a06', PHOS = '#33ff66', PHOS2 = '#1f9e40', AMBER = '#ffcc33', DIM = '#0f2914', MINT = '#c8ffd8';
    const glowTxt = (str, c = PHOS) => `<span style="text-shadow:0 0 6px ${c},0 0 14px ${c}">${str}</span>`;
    const scan = img(SCAN, 0, 0, 1280, 720, 'Líneas de pantalla', { fit: 'fill', decorative: true });
    const LINES = ['> CONECTANDO CON NODO 2 (500 km) ...', '> L', '> O', '> G', '*** SISTEMA CAÍDO ***'];
    const routers = [[420, 270], [420, 520], [640, 210], [640, 390], [640, 580], [880, 300], [880, 500]];
    const routes = [[0, 2, 5], [1, 3, 5], [0, 3, 6], [1, 4, 6]];
    const src = [130, 395], dst = [1070, 395];
    return numbered(build({ name: 'De ARPANET a la web', palette: 'midnight', fonts: 'tech', title: { size: 44, color: PHOS, font: MONO }, body: { color: MINT } }, [
      { layout: 'blank', bg: TERM, transition: 'fade', back: [scan], extra: [
        shape('rounded', 60, 60, 1160, 600, DIM, { radius: 18, stroke: PHOS2, strokeWidth: 3, opacity: 70 }),
        ...[0, 1, 2].map(i => shape('ellipse', 90 + i * 30, 82, 14, 14, [PHOS2, AMBER, '#ff5f56'][i])),
        text('DE ARPANET<br>A LA WEB', 100, 130, 1080, 220, { fontFamily: MONO, fontSize: 92, fontWeight: 700, color: PHOS, lineHeight: 1.05 }),
        ...LINES.map((l, i) => after(text(l, 110, 380 + i * 46, 1000, 42, { fontFamily: MONO, fontSize: 26, color: i === 4 ? AMBER : MINT }), 'fade-in', { duration: 150, delay: i === 0 ? 500 : 500, sound: 'click' })),
        after(rect(110, 612, 18, 30, PHOS), 'pulse', { duration: 800 })],
        notes: 'Las líneas se teclean solas al llegar. Así fue, más o menos, el primer mensaje entre dos ordenadores de la red ARPANET, el 29 de octubre de 1969.' },
      { title: 'El primer mensaje: «LO»', layout: 'titleOnly', bg: TERM, back: [scan], extra: [
        ...'LOGIN'.split('').map((c, i) => { const b = text(glowTxt(c, i < 2 ? PHOS : '#2d6a3e'), 140 + i * 200, 200, 180, 220, { fontFamily: MONO, fontSize: 200, fontWeight: 700, color: i < 2 ? PHOS : '#2d6a3e', textAlign: 'center' });
          return i < 2 ? b : on(b, 'fade-out', { start: i === 2 ? 'click' : 'withPrev', duration: 700 }); }),
        on(text('29 de octubre de 1969, 22:30. Un estudiante intenta escribir <b>LOGIN</b> de un ordenador a otro. El sistema se cuelga tras dos letras: el primer mensaje de la historia de internet fue «LO».', 140, 460, 1000, 160, { fontSize: 26, color: MINT }), 'fade-up')],
        notes: 'Primer clic: se apagan las letras que no llegaron. Una hora después lo arreglaron y el LOGIN completo funcionó.' },
      { title: '1969: una red de cuatro nodos', layout: 'titleOnly', bg: TERM, back: [scan], extra: [
        shape('rounded', 90, 180, 700, 470, DIM, { radius: 12, opacity: 70 }),
        ...[[0, 2], [0, 1], [1, 2], [2, 3]].map(([a, b], i) => (i ? after : on)(ink([NODES69[a].slice(1, 3), NODES69[b].slice(1, 3)], PHOS, 4), 'draw', { duration: 600 })),
        ...NODES69.flatMap(([n, x, y, at]) => [shape('ellipse', x - 16, y - 16, 32, 32, PHOS, { stroke: TERM, strokeWidth: 4 }),
          at === 'left' ? text(n, x - 260, y - 18, 236, 36, { fontFamily: MONO, fontSize: 19, color: MINT, textAlign: 'right' })
            : text(n, x - 150, at === 'above' ? y - 58 : y + 22, 300, 36, { fontFamily: MONO, fontSize: 19, color: MINT, textAlign: 'center' })]),
        on(stat('4', 'ordenadores conectados en diciembre de 1969', 840, 190, 350, PHOS, MINT, 80), 'fade-left'),
        on(stat('1.000.000', 'en 1992, solo 23 años después', 840, 410, 350, AMBER, MINT, 64), 'zoom-in', { sound: 'chime' })],
        notes: 'Los cuatro primeros nodos eran universidades y centros de investigación del oeste de Estados Unidos. Un clic dibuja las conexiones; luego, el crecimiento (cifras aproximadas).' },
      { title: 'Trocear para viajar: los paquetes', layout: 'titleOnly', bg: TERM, back: [scan], extra: [
        ...routes.flatMap(rt => { const pts = [src, ...rt.map(k => routers[k]), dst]; return [ink(pts, '#1c5a2e', 3)]; }),
        ...routers.map(([x, y]) => shape('ellipse', x - 14, y - 14, 28, 28, DIM, { stroke: PHOS2, strokeWidth: 3 })),
        card(glowTxt('HOLA MUNDO'), 70, 280, 140, 60, DIM, { fontFamily: MONO, fontSize: 20, color: PHOS, borderColor: PHOS2, radius: 6, textAlign: 'center', vAlign: 'middle', pad: [4, 4, 4, 4] }),
        card('HOLA MUNDO', 1010, 280, 140, 60, PHOS, { fontFamily: MONO, fontSize: 20, color: TERM, radius: 6, textAlign: 'center', vAlign: 'middle', pad: [4, 4, 4, 4], opacity: 100 }),
        ...routes.map((rt, i) => { const pts = [src, ...rt.map(k => routers[k]), dst].map(([x, y]) => [x - 24, y - 16]), end = [dst[0] - 24 + (i - 1.5) * 52 - 0, dst[1] + 60];
          const all = [...pts, end], r = rel(all);
          return withAnims(text(String(i + 1), pts[0][0] + (i - 1.5) * 6, pts[0][1] + (i - 1.5) * 6, 48, 32, { fontFamily: MONO, fontSize: 18, fontWeight: 700, color: TERM, bg: [PHOS, AMBER, '#7fd4ff', '#ff8fa3'][i], radius: 4, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }),
            A('path', { start: i ? 'withPrev' : 'click', pathShape: 'custom', points: [[0, 0], ...r], dx: r.at(-1)[0], dy: r.at(-1)[1], duration: [3200, 2400, 3800, 2800][i] })); }),
        text('El mensaje se parte en paquetes numerados. Cada uno busca su camino y, al llegar, se vuelven a ordenar. Si un nodo cae, hay otras rutas.', 90, 600, 1100, 80, { fontSize: 22, color: MINT, textAlign: 'center' })],
        notes: 'Un clic: los cuatro paquetes salen a la vez por rutas distintas y llegan desordenados. Esa idea, la conmutación de paquetes, hace que la red aguante aunque falle un trozo.' },
      { title: '1991: la primera página web', layout: 'titleOnly', bg: TERM, back: [scan], extra: [
        codeBlock({ x: 90, y: 180, w: 560, h: 420, fontSize: 19, lang: 'html', lineSteps: '1-2|3-4|5-7',
          code: '<html>\n<head><title>Proyecto WorldWideWeb</title></head>\n<body>\n<h1>World Wide Web</h1>\n<p>La web es un proyecto para compartir\ndocumentos con <a href="ayuda.html">enlaces</a>.</p>\n</body>\n</html>' }),
        { ...base(690, 190, 500, 360), type: 'image', src: OLDWEB, alt: 'Una página web de 1991 en un monitor', fit: 'cover', device: 'monitor' },
        text('Internet ya existía: la web le puso <b>páginas y enlaces</b>.', 690, 580, 500, 60, { fontSize: 22, color: MINT, textAlign: 'center' })],
        notes: 'El código resalta por pasos: cabecera, título y párrafo con un enlace. Página de ejemplo inspirada en la primera web, creada en un laboratorio europeo de física.' },
      { title: 'De unos pocos a casi todos', layout: 'titleOnly', bg: TERM, back: [scan], extra: [
        chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'area', color: PHOS2, grid: true, yMax: 80, yTitle: '% de la población mundial en internet',
          data: [['1995', 0.8], ['2000', 6.7], ['2005', 15.8], ['2010', 28.7], ['2015', 40], ['2020', 59], ['2024', 67]].map(([label, value]) => ({ label, value })) }),
        on(stat('2 de cada 3', 'personas del mundo usan internet', 870, 200, 330, PHOS, MINT, 46), 'zoom-in'),
        on(text('Y aun así, unos <b>2.600 millones</b> siguen sin conexión: la brecha digital.', 880, 420, 310, 160, { fontSize: 22, color: MINT }), 'fade-up')],
        notes: 'Datos aproximados de organismos internacionales. Pregunta: ¿qué cosas de tu día a día no podrías hacer sin conexión?' },
      { title: 'Hitos de la red', layout: 'titleOnly', bg: TERM, back: [scan], extra: [
        dg('chevrons', '1969\n  ARPANET\n1971\n  Correo con @\n1983\n  TCP/IP\n1991\n  La web\n2007\n  Internet en el bolsillo', 90, 220, 1100, 300, { colors: 'outline', oneByOne: true, textColor: MINT, fontScale: 1.3 }),
        text('Cada paso tardó años en llegar a todo el mundo… y cada uno cambió cómo nos comunicamos.', 90, 560, 1100, 60, { fontSize: 22, color: MINT, textAlign: 'center' })],
        notes: 'Un hito por clic. El protocolo TCP/IP (1983) es el «idioma común» que permite que redes distintas hablen entre sí: por eso decimos que ahí nace internet.' },
      { layout: 'blank', bg: TERM, extra: [quiz('¿Qué permitió en 1983 que redes distintas se entendieran?', ['El lenguaje HTML', 'El protocolo TCP/IP', 'La fibra óptica', 'El wifi'], 1)],
        notes: 'Concurso con tiempo. HTML es el lenguaje de las páginas web (1991); la fibra y el wifi llegaron después.' },
      { layout: 'blank', bg: TERM, transition: 'convex', back: [scan], extra: [pollBlock({ kind: 'qa', question: '¿Qué le preguntarías a quien envió aquel primer «LO»?', options: [], fontSize: 36, x: 60, y: 60, w: 1160, h: 600 })],
        notes: 'Preguntas y respuestas en directo: la clase envía preguntas desde el móvil y vota las mejores. Cierre: internet tiene poco más de 50 años.' },
    ]));
  } },
};
