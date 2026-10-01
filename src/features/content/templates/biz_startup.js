// Example presentations: Empresa · pitch de startups. Ten made-up startups from very different sectors
// (agrotech, edtech, last-mile logistics, circular fashion, mental health, rural tourism, kitchen robotics,
// insurance, community energy and pets), each with its own brand and its own visual concept.
// Each one: { name, summary, cat: 'biz', make() } → a deck (see kit.js for the builders).
// All the companies, people and figures are made up (the notes say so).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (own drawings: fields, maps, screens…).
const svgURL = (w, h, inner, bg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const T = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const pic = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', ...props });
const head = k => pairStacks(k).heading;
// One after another: the first on a click (or by itself with 'afterPrev'), the rest right after it.
const chain = (i, effect = 'fade-up', props = {}) => A(effect, { start: i ? 'afterPrev' : 'click', ...props });
const kicker = (s, x, y, w, color, size = 20, props = {}) => text(s, x, y, w, size + 16, { fontSize: size, letterSpacing: 5, fontWeight: 700, color, ...props });
// A 3D model without its caption (the credits go in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color, extra = '') => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · ') + extra, x, y, w, 30, { fontSize: 12, color });
// A circle outline, and a line drawn from an SVG path in a 100 × 100 box.
const ring = (x, y, d, color, sw = 2, props = {}) => shape('ellipse', x, y, d, d, 'none', { stroke: color, strokeWidth: sw, ...props });
const stroke = (d, x, y, w, h, color, sw = 3, props = {}) => shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: sw, ...props });
// A big number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:6px">${label}</div>`,
  x, y, w, Math.round(size * 1.1 + 70), { fontSize: 24, color: fg, ...props });
const CAVEAT = "'Caveat', cursive", MONO = "'JetBrains Mono', 'Courier New', monospace";

// ---- 1 · Surco (agrotech): an aerial view of fields --------------------------------
// A patchwork of plots seen from above (furrows, olive groves, vineyards, wheat), tracks between them,
// a river and a road; with `moist` each plot is tinted from dry (red) to wet (blue).
const MOIST = [0.7, 0.35, 0.55, 0.2, 0.8, 0.45, 0.15, 0.6, 0.9, 0.3, 0.5, 0.75, 0.25, 0.65, 0.4];
const heat = f => { const a = [217, 79, 48], b = [47, 127, 209], c = a.map((v, i) => Math.round(v + (b[i] - v) * f)); return `rgb(${c.join(',')})`; };
const fieldSVG = (moist = false) => {
  const pats = [['#7a9a3f', '#5f7d2e', 20, 14, 'l'], ['#d8bf6a', '#c2a54e', -35, 12, 'l'], ['#b59a6b', '#4f6b2a', 0, 26, 'o'],
    ['#a68a5c', '#55702c', 75, 18, 'l'], ['#8d6e4f', '#755a3f', 8, 10, 'l'], ['#9cbb55', '#82a243', 50, 12, 'l']];
  const defs = pats.map(([bg, fg, ang, s, k], i) => `<pattern id="p${i}" patternUnits="userSpaceOnUse" width="${s}" height="${s}" patternTransform="rotate(${ang})"><rect width="${s}" height="${s}" fill="${bg}"/>`
    + (k === 'o' ? `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.22}" fill="${fg}"/>` : `<rect width="${s}" height="${Math.max(2, s * 0.28)}" fill="${fg}"/>`) + '</pattern>').join('');
  const xs = [-30, 250, 510, 770, 1030, 1310], ys = [-30, 240, 480, 750];
  const P = ys.map((y, r) => xs.map((x, c) => [x + ((r * 7 + c * 13) % 5 - 2) * 18 * (c % 5 ? 1 : 0), y + ((r * 11 + c * 5) % 5 - 2) * 16 * (r % 3 ? 1 : 0)]));
  let cells = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const pts = [P[r][c], P[r][c + 1], P[r + 1][c + 1], P[r + 1][c]].map(p => p.join(',')).join(' '), k = r * 5 + c;
    cells += `<polygon points="${pts}" fill="url(#p${(r * 2 + c * 3) % pats.length})" stroke="#6b5636" stroke-width="7" stroke-linejoin="round"/>`;
    if (moist) cells += `<polygon points="${pts}" fill="${heat(MOIST[k])}" opacity="0.55"/>`;
  }
  const river = '<path d="M-20 600 C 200 560, 330 690, 560 640 S 900 520, 1300 590" fill="none" stroke="#3f7fae" stroke-width="16" opacity=".85"/>';
  const road = '<path d="M760 -20 C 730 200, 820 420, 700 740" fill="none" stroke="#e7dcc3" stroke-width="12"/>';
  const pivot = '<circle cx="890" cy="330" r="92" fill="#6f9a35" stroke="#5b7f2a" stroke-width="5"/><circle cx="890" cy="330" r="60" fill="none" stroke="#86b04a" stroke-width="10"/><line x1="890" y1="330" x2="975" y2="300" stroke="#e8e8e0" stroke-width="4"/>';
  return svgURL(1280, 720, `<defs>${defs}</defs>${cells}${river}${road}${moist ? '' : pivot}`, '#6b5636');
};
// A cut of the soil with a probe and its two sensors (30 and 60 cm).
const soilSVG = svgURL(360, 300,
  '<rect width="360" height="70" fill="#cfe8d8"/><rect y="70" width="360" height="80" fill="#7a5a3c"/><rect y="150" width="360" height="80" fill="#664a31"/><rect y="230" width="360" height="70" fill="#533b27"/>'
  + '<path d="M0 72 Q 20 50 40 72 T 80 72 T 120 72 T 160 72 T 200 72 T 240 72 T 280 72 T 320 72 T 360 72" fill="#7cc35b"/>'
  + [70, 110, 250, 300].map(x => `<path d="M${x} 74 C ${x - 10} 120, ${x + 14} 150, ${x - 6} 210" fill="none" stroke="#c9a77a" stroke-width="3"/><path d="M${x} 110 l -22 30 M${x + 2} 150 l 20 26" stroke="#c9a77a" stroke-width="2"/>`).join('')
  + '<rect x="172" y="20" width="16" height="250" rx="6" fill="#d7dde2" stroke="#8a949c" stroke-width="2"/><rect x="164" y="10" width="32" height="26" rx="6" fill="#2e7d32"/>'
  + '<circle cx="180" cy="135" r="12" fill="#3fa7d6"/><circle cx="180" cy="215" r="12" fill="#3fa7d6"/>'
  + T(200, 141, 18, '#ffffff', '30 cm · 18 %', ' font-weight="700"') + T(200, 221, 18, '#ffffff', '60 cm · 24 %', ' font-weight="700"')
  + [[60, 190], [110, 250], [280, 180], [320, 260], [240, 120]].map(([x, y]) => `<path d="M${x} ${y - 8} C ${x - 5} ${y}, ${x - 5} ${y + 6}, ${x} ${y + 6} C ${x + 5} ${y + 6}, ${x + 5} ${y}, ${x} ${y - 8} Z" fill="#7fc4ea"/>`).join(''));
// The app on the phone: today's watering advice, sector by sector.
const surcoApp = svgURL(360, 720,
  '<rect width="360" height="150" fill="#14261a"/>' + T(24, 62, 30, '#7cc35b', 'surco', ' font-weight="700"') + T(24, 104, 18, '#cfe0c8', 'Finca Los Llanos · martes 14')
  + '<rect x="18" y="170" width="324" height="230" rx="18" fill="#ffffff" stroke="#dfe7da"/>' + T(38, 208, 17, '#6b7a66', 'Sector 3 · olivar') + T(38, 262, 46, '#1e3320', '15 %', ' font-weight="700"')
  + T(160, 262, 17, '#d94f30', 'humedad baja') + '<rect x="38" y="282" width="284" height="12" rx="6" fill="#eef2ea"/><rect x="38" y="282" width="80" height="12" rx="6" fill="#d94f30"/>'
  + T(38, 330, 18, '#1e3320', 'Regar 12 mm · mañana 6:00', ' font-weight="700"') + '<rect x="38" y="348" width="284" height="38" rx="19" fill="#2e7d32"/>' + T(180, 373, 17, '#ffffff', 'Programar la válvula', ' text-anchor="middle" font-weight="700"')
  + [['Sector 1 · viñedo', '24 %', '#2f7fd1'], ['Sector 2 · olivar', '19 %', '#e0a030'], ['Sector 4 · almendro', '28 %', '#2f7fd1'], ['Sector 5 · olivar', '11 %', '#d94f30']].map(([n, v, c], i) => { const y = 420 + i * 70;
    return `<rect x="18" y="${y}" width="324" height="58" rx="14" fill="#ffffff" stroke="#dfe7da"/><circle cx="46" cy="${y + 29}" r="9" fill="${c}"/>` + T(66, y + 35, 17, '#1e3320', n) + T(322, y + 35, 17, c, v, ' text-anchor="end" font-weight="700"'); }).join(''),
  '#f4f8f1');

// ---- 2 · Tiza (edtech): a squared exercise book -------------------------------------
const notebookSVG = svgURL(1280, 720,
  Array.from({ length: 41 }, (_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32}" y2="720" stroke="#d3e2ef" stroke-width="1"/>`).join('')
  + Array.from({ length: 23 }, (_, i) => `<line x1="0" y1="${i * 32}" x2="1280" y2="${i * 32}" stroke="#d3e2ef" stroke-width="1"/>`).join('')
  + '<line x1="150" y1="0" x2="150" y2="720" stroke="#e8a0a0" stroke-width="2"/><line x1="156" y1="0" x2="156" y2="720" stroke="#e8a0a0" stroke-width="1"/>'
  + '<rect width="80" height="720" fill="#fbf8f0"/>' + Array.from({ length: 11 }, (_, i) => `<circle cx="42" cy="${40 + i * 64}" r="13" fill="#e4dccb"/><circle cx="42" cy="${40 + i * 64}" r="13" fill="none" stroke="#cbbfa6" stroke-width="2"/>`).join(''),
  '#fbf8f0');
// The tutor on the phone: an exercise with fractions, a hint and the progress.
const tizaApp = svgURL(360, 720,
  '<rect width="360" height="120" fill="#2f5aa8"/>' + T(24, 58, 28, '#ffffff', 'Tiza', ' font-weight="800"') + T(24, 94, 16, '#d6e2ff', 'Fracciones · nivel 3 de 5')
  + '<rect x="24" y="140" width="312" height="14" rx="7" fill="#e3e9f5"/><rect x="24" y="140" width="200" height="14" rx="7" fill="#7bd3b0"/>'
  + T(180, 220, 22, '#2d3142', 'Calcula y simplifica:', ' text-anchor="middle"')
  + T(180, 300, 54, '#2d3142', '¾ + ⅙ = ?', ' text-anchor="middle" font-weight="700"')
  + '<rect x="40" y="340" width="280" height="64" rx="16" fill="#ffffff" stroke="#2f5aa8" stroke-width="3"/>' + T(180, 382, 30, '#2f5aa8', '11/12', ' text-anchor="middle" font-weight="700"')
  + '<rect x="24" y="430" width="312" height="120" rx="18" fill="#fff3a8"/>' + T(44, 466, 17, '#6b5800', '💡 Pista', ' font-weight="700"')
  + T(44, 496, 16, '#5a4a00', 'Busca un denominador común:') + T(44, 522, 16, '#5a4a00', '¿en qué número caben 4 y 6?')
  + '<rect x="24" y="580" width="312" height="60" rx="30" fill="#ff8fab"/>' + T(180, 618, 20, '#ffffff', 'Comprobar', ' text-anchor="middle" font-weight="800"'),
  '#fbf8f0');

// ---- 3 · Recado (last mile): a transit map -------------------------------------------
// A map of the city as a metro diagram: the lines, the hub and the stops (for the "how it works" slide).
const recadoMap = (L) => svgURL(1100, 460,
  '<rect x="0" y="0" width="1100" height="460" rx="24" fill="#f4f6f8"/>'
  + '<path d="M40 380 C 200 380, 260 300, 360 300 L 480 300" fill="none" stroke="#c9ced4" stroke-width="22" stroke-linecap="round"/>'
  + `<path d="M480 300 L 620 160 L 1060 160" fill="none" stroke="${L[0]}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="M480 300 L 1060 300" fill="none" stroke="${L[1]}" stroke-width="12" stroke-linecap="round"/>`
  + `<path d="M480 300 L 600 420 L 1000 420" fill="none" stroke="${L[2]}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`
  + [[760, 160], [900, 160], [1060, 160], [700, 300], [880, 300], [1060, 300], [780, 420], [1000, 420]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#ffffff" stroke="#1a1a1a" stroke-width="5"/>`).join('')
  + '<rect x="440" y="260" width="80" height="80" rx="18" fill="#1a1a1a"/>' + T(480, 310, 26, '#ffffff', 'HUB', ' text-anchor="middle" font-weight="800"')
  + T(40, 430, 18, '#6c757d', 'Ronda de circunvalación · llegada nocturna') + T(1060, 135, 17, '#1a1a1a', 'Ruzafa', ' text-anchor="end" font-weight="700"')
  + T(1060, 280, 17, '#1a1a1a', 'Ciutat Vella', ' text-anchor="end" font-weight="700"') + T(1000, 400, 17, '#1a1a1a', 'Benimaclet', ' text-anchor="end" font-weight="700"'));

// ---- 5 · Remanso (mental health): the app on the phone, a mood check-in and this week's plan.
const remansoApp = svgURL(360, 720,
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b5cd6"/><stop offset="1" stop-color="#e58fb0"/></linearGradient></defs>'
  + '<rect width="360" height="190" fill="url(#g)"/>' + T(24, 64, 18, '#ffffffcc', 'Miércoles') + T(24, 104, 32, '#ffffff', 'Hola, Andrés', ' font-weight="700"')
  + T(24, 150, 18, '#ffffff', '¿Cómo estás hoy?')
  + [-1, -0.5, 0, 0.5, 1].map((m, i) => { const cx = 48 + i * 66, c = ['#f28b82', '#f6ae7b', '#f7d774', '#9be3c7', '#7fd1ae'][i];
    return `<circle cx="${cx}" cy="230" r="25" fill="${c}"${i === 3 ? ' stroke="#4a2f8a" stroke-width="4"' : ''}/><circle cx="${cx - 8}" cy="224" r="3" fill="#3b2a55"/><circle cx="${cx + 8}" cy="224" r="3" fill="#3b2a55"/>`
      + `<path d="M${cx - 10} ${238 - m * 3} Q ${cx} ${238 + m * 8} ${cx + 10} ${238 - m * 3}" fill="none" stroke="#3b2a55" stroke-width="3" stroke-linecap="round"/>`; }).join('')
  + T(24, 300, 20, '#2a1850', 'Tu plan de esta semana', ' font-weight="700"')
  + [['Respiración guiada', '5 min · cada mañana', '#9be3c7'], ['Sesión con Laura, psicóloga', 'jueves · 18:00 · vídeo', '#c8b6ff'], ['Diario de tres cosas buenas', 'antes de dormir', '#ffc6a8']].map(([a, b, c], i) => { const y = 320 + i * 84;
    return `<rect x="18" y="${y}" width="324" height="70" rx="16" fill="#ffffff" stroke="#e6def8"/><rect x="18" y="${y}" width="10" height="70" rx="5" fill="${c}"/>` + T(42, y + 30, 17, '#2a1850', a, ' font-weight="700"') + T(42, y + 54, 15, '#7a6e94', b); }).join('')
  + '<rect x="18" y="600" width="324" height="58" rx="29" fill="#2a1850"/>' + T(180, 636, 18, '#ffffff', 'Hablar con alguien hoy', ' text-anchor="middle" font-weight="700"'),
  '#f6f2ff');

// ---- 6 · Alpende (rural tourism): mountains at dusk, postcards and a map of the valley.
const peaks = (y0, amp, seed, n = 9) => { let d = `M0 720 L0 ${y0}`; for (let i = 1; i <= n; i++) { const x = i * 1280 / n, y = y0 - amp * (0.4 + ((i * seed) % 7) / 7) * (i % 2 ? 1 : 0.45); d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; } return d + ' L1280 720 Z'; };
const duskSVG = (night = false) => svgURL(1280, 720,
  `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#060d18' : '#1d3557'}"/><stop offset=".55" stop-color="${night ? '#0f2940' : '#c8607a'}"/><stop offset="1" stop-color="${night ? '#1b3a57' : '#f4a261'}"/></linearGradient></defs>`
  + '<rect width="1280" height="720" fill="url(#s)"/>'
  + Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 233) % 1280}" cy="${(i * 97) % 260}" r="${i % 3 ? 1.2 : 2}" fill="#ffffff" opacity="${night ? 0.9 : 0.5}"/>`).join('')
  + (night ? '<circle cx="1080" cy="120" r="40" fill="#f4e3c3"/><circle cx="1096" cy="110" r="36" fill="#0b1a2b"/>' : '<circle cx="880" cy="430" r="80" fill="#ffd8a8" opacity=".9"/>')
  + `<path d="${peaks(420, 220, 3)}" fill="${night ? '#1c2c47' : '#7a5c8a'}"/><path d="${peaks(480, 170, 5, 11)}" fill="${night ? '#16233a' : '#55406f'}"/>`
  + `<path d="${peaks(560, 120, 2, 13)}" fill="${night ? '#101a2c' : '#33284f'}"/><path d="${peaks(630, 60, 4, 17)}" fill="${night ? '#0a1220' : '#1a1730'}"/>`
  + [[180, 610], [230, 600], [282, 614], [330, 604]].map(([x, y]) => `<path d="M${x} ${y + 30} V${y} L${x + 20} ${y - 18} L${x + 40} ${y} V${y + 30} Z" fill="${night ? '#070c16' : '#120f22'}"/><rect x="${x + 15}" y="${y + 8}" width="9" height="9" fill="#ffcf70"/>`).join(''));
const postcardSVG = (sky, hill, sun, title, place, price) => svgURL(340, 420,
  `<rect x="16" y="16" width="308" height="220" fill="${sky}"/><circle cx="240" cy="110" r="34" fill="${sun}"/>`
  + `<path d="M16 236 L16 170 Q 90 110 170 170 T 324 150 L324 236 Z" fill="${hill}"/><path d="M16 236 L16 205 Q 120 160 210 205 T 324 200 L324 236 Z" fill="${hill}" opacity=".6" style="mix-blend-mode:multiply"/>`
  + '<rect x="256" y="28" width="56" height="66" fill="#fffaf0" stroke="#b5523b" stroke-width="2" stroke-dasharray="4 3"/><circle cx="284" cy="56" r="12" fill="#e76f51"/><rect x="266" y="76" width="36" height="6" fill="#2d6a4f"/>'
  + T(24, 290, 26, '#2a2420', title, ' font-weight="700"', 'Georgia, serif') + T(24, 326, 19, '#6a5a4a', place, ' font-style="italic"', 'Georgia, serif')
  + '<line x1="24" y1="350" x2="316" y2="350" stroke="#d8c8ae" stroke-width="2"/>' + T(24, 386, 20, '#b5523b', price, ' font-weight="700"', 'Georgia, serif'),
  '#fffaf0');
const ROAD = [[60, 420], [260, 330], [480, 360], [700, 220], [920, 250], [1050, 90]];
const valleySVG = svgURL(1100, 480,
  '<rect width="1100" height="480" rx="18" fill="#efe4cc"/>'
  + [[250, 160, 1], [820, 380, 0.8], [560, 120, 0.7], [950, 120, 0.6]].map(([cx, cy, k]) => [1, 0.75, 0.5, 0.28].map(f => `<ellipse cx="${cx}" cy="${cy}" rx="${200 * k * f}" ry="${110 * k * f}" fill="none" stroke="#c9b58f" stroke-width="2"/>`).join('')).join('')
  + '<path d="M0 260 C 160 300, 300 200, 420 250 S 640 420, 820 330 S 1000 300, 1100 340" fill="none" stroke="#6fa3c8" stroke-width="9"/>'
  + `<polyline points="${ROAD.map(p => p.join(',')).join(' ')}" fill="none" stroke="#8a6d4a" stroke-width="6" stroke-dasharray="14 9" stroke-linejoin="round"/>`
  + [['Valdecuevas', 260, 330], ['La Hoz', 480, 360], ['Robledal de Arriba', 700, 220], ['Peñaseca', 920, 250], ['Fuentefría', 1050, 90]].map(([n, x, y]) =>
    `<circle cx="${x}" cy="${y}" r="9" fill="#2d6a4f" stroke="#fff" stroke-width="3"/>` + T(x, y + 36, 19, '#2a2420', n, ' text-anchor="middle" font-weight="700"', 'Georgia, serif')).join('')
  + T(1060, 456, 16, '#8a7a5a', 'N ↑ · 10 km', ' text-anchor="end"', 'Georgia, serif'));

// ---- 7 · Fogón (kitchen robot): white kitchen tiles.
const tilesSVG = svgURL(1280, 720, Array.from({ length: 18 }, (_, r) => Array.from({ length: 17 }, (_, c) =>
  `<rect x="${c * 80 - (r % 2) * 40 + 2}" y="${r * 40 + 2}" width="76" height="36" rx="5" fill="#f4f6f8" stroke="#d5dbe1" stroke-width="1.5"/>`).join('')).join(''), '#c9d0d7');

// ---- 8 · Abrigo (insurance): the app with its big switch.
const abrigoApp = svgURL(360, 720,
  T(24, 60, 26, '#1f2328', 'Abrigo', ' font-weight="700"', 'Georgia, serif') + T(24, 92, 16, '#8a939e', 'Hola, Carmen · fotógrafa')
  + '<rect x="24" y="130" width="312" height="220" rx="24" fill="#1f2328"/>' + T(48, 178, 18, '#ffd23f', 'HOY ESTÁS CUBIERTA', ' font-weight="700" letter-spacing="2"')
  + '<rect x="48" y="200" width="150" height="76" rx="38" fill="#ffd23f"/><circle cx="160" cy="238" r="30" fill="#ffffff"/>' + T(212, 250, 32, '#ffffff', 'ON', ' font-weight="700"')
  + T(48, 318, 16, '#c9ced4', 'De 8:00 a 20:00 · 2,40 €')
  + [['Accidentes', '#ffd23f'], ['Baja por enfermedad', '#ffd23f'], ['Daños a clientes', '#ffd23f'], ['Robo del material', '#c9ced4']].map(([n, c], i) => { const y = 378 + i * 64;
    return `<rect x="24" y="${y}" width="312" height="52" rx="12" fill="#ffffff" stroke="#e1e4e8"/><circle cx="50" cy="${y + 26}" r="9" fill="${c}"/>` + T(70, y + 32, 17, '#1f2328', n); }).join('')
  + '<rect x="24" y="640" width="312" height="52" rx="26" fill="#1f2328"/>' + T(180, 672, 17, '#ffffff', 'Dar un parte', ' text-anchor="middle" font-weight="700"'), '#eef0f2');
const UMBRELLA = 'M2 55 C 2 22, 28 2, 50 2 C 72 2, 98 22, 98 55 C 90 47, 82 47, 74 55 C 66 47, 58 47, 50 55 C 42 47, 34 47, 26 55 C 18 47, 10 47, 2 55 Z';

// ---- 9 · Tejado Común (community energy): a street of roofs, some with solar panels.
const roofsSVG = (night = false) => {
  const walls = night ? ['#2a3142', '#252b3a', '#30384b'] : ['#e8d5b7', '#d9c3a0', '#efe0c8'], roofs = night ? ['#4a2a2a', '#3d2424'] : ['#c4563f', '#a8452f'];
  let x = 0, out = '', i = 0;
  while (x < 1280) { const w = 120 + (i * 53) % 90, h = 120 + (i * 37) % 80, top = 300 - h, ry = top - 70, c = walls[i % 3];
    out += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${c}"/><polygon points="${x - 8},${top} ${x + w / 2},${ry} ${x + w + 8},${top}" fill="${roofs[i % 2]}"/>`;
    if (i % 3 !== 1) out += `<polygon points="${x + w * 0.12},${top - 6} ${x + w * 0.42},${ry + 14} ${x + w * 0.5},${ry + 18} ${x + w * 0.22},${top - 2}" fill="#2d4f8a" stroke="#9ad1ff" stroke-width="1.5"/>`
      + `<line x1="${x + w * 0.17}" y1="${top - 4}" x2="${x + w * 0.46}" y2="${ry + 16}" stroke="#9ad1ff" stroke-width="1"/>`;
    for (let k = 0; k < 2; k++) out += `<rect x="${x + w * (0.2 + k * 0.4)}" y="${top + h * 0.3}" width="${w * 0.2}" height="${h * 0.22}" fill="${night ? (k + i) % 3 ? '#ffcf70' : '#1a2030' : '#9ad1ff'}"/>`;
    x += w + 6; i++; }
  return svgURL(1280, 300, out);
};

// ---- 10 · Hocico (pets): paw prints.
const paw = (x, y, s, c, props = {}) => [shape('ellipse', x + s * 0.2, y + s * 0.42, s * 0.6, s * 0.5, c, props),
  ...[[0, 0.18], [0.24, 0], [0.52, 0], [0.76, 0.18]].map(([dx, dy]) => shape('ellipse', x + dx * s, y + dy * s, s * 0.24, s * 0.3, c, props))];

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Surco: irrigation with sensors for olive groves and vineyards. An aerial view of the fields with a drone's HUD.
  biz_startup_agrotech: { name: 'Pitch agrotech: riego con sensores', cat: 'biz',
    summary: 'Vista aérea de parcelas con mapa de humedad, satélite 3D de la NASA, móvil, gotas en cadena con sonido, tabla con fórmulas y treemap', make: () => {
      const DEEP = '#14261a', LEAF = '#7cc35b', CREAM = '#f4f8f1', WATER = '#3fa7d6', SOIL = '#8d6e4f', WHEAT = '#e8c766', INK = '#1e3320', GREEN = '#2e7d32', SOFT = '#a9c3a0';
      const H = head('tech');
      const drop = (x, y, c, props = {}) => shape('teardrop', x, y, 60, 80, c, props);
      return numbered(build({ name: 'Surco · riego de precisión', palette: 'forest', fonts: 'tech', title: { size: 46, color: INK } }, [
        { layout: 'blank', bg: DEEP, transition: 'fade', transitionSpeed: 'slow', extra: [
          pic(fieldSVG(), 0, 0, 1280, 720, 'Vista aérea de parcelas de olivar, viñedo y cereal'),
          shape('rect', 0, 0, 600, 720, DEEP, { opacity: 92 }), shape('rect', 600, 0, 4, 720, LEAF),
          kicker('AGROTECH · RONDA SEMILLA', 70, 150, 500, LEAF),
          text('SURCO', 64, 190, 540, 170, { fontFamily: H, fontSize: 150, fontWeight: 700, color: CREAM, letterSpacing: 6 }),
          shape('rect', 72, 372, 90, 6, LEAF),
          text('Riego de precisión para olivar y viñedo: cada gota, donde hace falta.', 70, 400, 470, 130, { fontSize: 30, lineHeight: 1.3, color: CREAM }),
          text('Pitch para inversores · Córdoba · octubre de 2026', 70, 620, 500, 36, { fontSize: 20, color: SOFT }),
          ring(805, 235, 170, '#ffffff', 2, { dash: 'dash' }), shape('rect', 889, 215, 2, 210, '#ffffff', { opacity: 70 }), shape('rect', 785, 319, 210, 2, '#ffffff', { opacity: 70 }),
          text('37°52′N · 4°46′O', 1010, 60, 220, 30, { fontFamily: MONO, fontSize: 16, color: '#ffffff', textAlign: 'right' }),
          withAnims(card('<b>Sector 3 · olivar</b><br>Humedad 15 % → regar 12 mm', 960, 440, 270, 100, '#14261ae6', { fontSize: 20, color: CREAM, radius: 10, pad: [14, 18, 14, 18], borderColor: LEAF }),
            A('zoom-in', { start: 'afterPrev', delay: 600, sound: 'pop' }))],
          notes: 'Surco es una empresa inventada y todas las cifras de esta presentación son de ejemplo. La foto aérea es un dibujo propio (SVG) con aspecto de vista de dron; la etiqueta del sector aparece sola con un «pop».' },
        { layout: 'blank', bg: CREAM, extra: [
          kicker('EL PROBLEMA', 90, 80, 600, GREEN),
          text('70 %', 80, 120, 560, 230, { fontFamily: H, fontSize: 210, fontWeight: 700, lineHeight: 1, color: '#1d78ad' }),
          text('del agua dulce que usamos se va al regadío.', 90, 360, 520, 100, { fontSize: 34, lineHeight: 1.25, color: INK }),
          ...Array.from({ length: 10 }, (_, i) => withAnims(drop(700 + (i % 5) * 100, 130 + Math.floor(i / 5) * 120, i < 7 ? WATER : '#c4cfbf'),
            i === 7 ? A('zoom-in', { start: 'click', duration: 300, sound: 'pop' }) : A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 220 }))),
          withAnims(text('Y <b>3 de cada 10 litros</b> se pierden por regar a ojo: de más, a destiempo o donde no hace falta.', 700, 400, 480, 130, { fontSize: 28, lineHeight: 1.3, color: INK }), A('fade-up', { start: 'afterPrev' })),
          shape('rect', 0, 650, 1280, 10, LEAF), shape('rect', 0, 660, 1280, 60, SOIL),
          ...Array.from({ length: 16 }, (_, i) => shape('rect', 20 + i * 80, 680, 50, 6, '#755a3f'))],
          notes: 'Primer clic: caen siete gotas azules, el agua que se aprovecha. Segundo clic: las tres grises, con un «pop», el agua que se pierde. El 70 % es el dato mundial habitual; el 30 % de pérdidas es una estimación de ejemplo.' },
        { layout: 'blank', bg: DEEP, extra: [
          kicker('CÓMO FUNCIONA', 80, 40, 500, LEAF),
          text('Del satélite a la válvula', 80, 72, 1120, 70, { fontFamily: H, fontSize: 50, fontWeight: 700, color: CREAM }),
          nasa('landsat-8', 90, 175, 320, 250, { caption: '', motion: 'float', autoRotate: true, view: 'three' }),
          text('<b style="color:#7cc35b">1 · Satélite</b><br>El vigor de cada parcela, cada cinco días, con imágenes públicas.', 80, 450, 340, 150, { fontSize: 23, lineHeight: 1.35, color: CREAM }),
          withAnims(shape('rightarrow', 425, 285, 50, 34, LEAF), A('fade-right', { start: 'click' })),
          withAnims(pic(soilSVG, 490, 175, 300, 250, 'Corte del suelo con una sonda de humedad a 30 y 60 cm', { radius: 14 }), A('fade-up', { start: 'afterPrev' })),
          withAnims(text('<b style="color:#7cc35b">2 · Sondas</b><br>Humedad a 30 y 60 cm cada 15 minutos, por radio de largo alcance.', 470, 450, 340, 150, { fontSize: 23, lineHeight: 1.35, color: CREAM }), A('fade-up', { start: 'withPrev' })),
          withAnims(shape('rightarrow', 815, 285, 50, 34, LEAF), A('fade-right', { start: 'click' })),
          withAnims(pic(surcoApp, 960, 150, 150, 300, 'La app de Surco con el riego recomendado de hoy', { device: 'phone' }), A('fade-up', { start: 'afterPrev' })),
          withAnims(text('<b style="color:#7cc35b">3 · Recomendación</b><br>Cuánto y cuándo regar, sector a sector; la válvula se abre sola.', 860, 470, 350, 150, { fontSize: 23, lineHeight: 1.35, color: CREAM }), A('fade-up', { start: 'withPrev' }))],
          notes: 'Tres piezas: el satélite 3D (modelo de la NASA, flota y gira), la sonda (dibujo propio) y la app en un móvil. Cada clic añade un paso.' },
        { layout: 'blank', bg: DEEP, transition: 'zoom', extra: [
          pic(fieldSVG(true), 0, 0, 1280, 720, 'Mapa de humedad de la finca: parcelas de rojo (seco) a azul (húmedo)'),
          shape('rounded', 50, 40, 560, 140, DEEP, { opacity: 90, radius: 16 }),
          kicker('MAPA DE HUMEDAD · HOY 6:00', 80, 62, 520, LEAF, 18),
          text('Finca Los Llanos · 120 ha', 80, 100, 520, 60, { fontFamily: H, fontSize: 38, fontWeight: 700, color: CREAM }),
          shape('rounded', 50, 618, 400, 70, DEEP, { opacity: 90, radius: 12 }),
          shape('rect', 120, 646, 220, 14, '#d94f30', { fill2: '#2f7fd1', gradAngle: 0 }),
          text('Seco', 64, 640, 56, 30, { fontSize: 17, color: CREAM }), text('Húmedo', 348, 640, 90, 30, { fontSize: 17, color: CREAM }),
          ...[[370, 330, 'S2 · 19 %', 'Regar 6 mm el jueves'], [640, 560, 'S8 · 11 %', 'Regar 18 mm hoy'], [1110, 230, 'S5 · 28 %', 'No regar esta semana']].flatMap(([x, y, h, d], i) => [
            withAnims(ring(x - 18, y - 18, 36, '#ffffff', 4), A('zoom-in', { start: 'click', duration: 300, sound: 'pop' })),
            withAnims(card(`<b>${h}</b><br>${d}`, x - (x > 900 ? 270 : -30), y + 26, 240, 84, '#ffffffee', { fontSize: 19, color: INK, radius: 10, pad: [10, 16, 10, 16] }), A('fade-up', { start: 'withPrev' }))])],
          notes: 'El mismo dibujo aéreo, ahora teñido según la humedad del suelo. Cada clic marca un sector con su recomendación (y un «pop»). Datos de ejemplo.' },
        { title: 'El piloto: cuatro fincas, dos campañas', layout: 'titleOnly', bg: CREAM, extra: [
          chartBlock({ x: 80, y: 175, w: 740, h: 470, chartType: 'bar', color: '#a1887f', seriesName: 'Riego tradicional', dataLabels: true, grid: true, yTitle: 'm³ por hectárea y año',
            data: [{ label: 'Finca A', value: 3600 }, { label: 'Finca B', value: 4100 }, { label: 'Finca C', value: 2900 }, { label: 'Finca D', value: 3800 }],
            series: [{ name: 'Con Surco', values: [2450, 2800, 2050, 2600], color: WATER }] }),
          withAnims(stat('−31 %', 'de agua por hectárea', 880, 180, 330, '#1d78ad', INK, 70), chain(0, 'fade-left')),
          withAnims(stat('+6 %', 'de cosecha por hectárea', 880, 335, 330, GREEN, INK, 70), chain(1, 'fade-left')),
          withAnims(stat('11 meses', 'para recuperar la inversión', 880, 490, 330, SOIL, INK, 70), chain(2, 'fade-left'))],
          notes: 'Barras agrupadas con etiquetas: consumo de agua con y sin Surco en las cuatro fincas del piloto. Un clic y las tres conclusiones entran en cadena. Cifras de ejemplo.' },
        { title: 'Una finca de 120 ha: lo que paga y lo que ahorra', layout: 'titleOnly', bg: CREAM, extra: [
          tableBlock({ x: 80, y: 180, w: 1120, h: 330, fontSize: 24, header: true, headBg: DEEP, headFg: CREAM, stroke: '#cfdcc8', banded: true, band: LEAF,
            rows: [['Partida (al año)', '€ por hectárea', 'Hectáreas', 'Total finca'],
              ['Agua ahorrada (1.100 m³/ha)', '99 €', '120', '=B2*C2'],
              ['Energía de bombeo ahorrada', '41 €', '120', '=B3*C3'],
              ['Suscripción Surco (sondas incluidas)', '−48 €', '120', '=B4*C4'],
              ['<b>Balance neto para el agricultor</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']], colW: [5, 2.2, 1.6, 2.2] }),
          ...[['check', 'Instalación en una mañana, sin obra'], ['check', 'Sin permanencia: se paga por campaña'], ['check', 'Funciona sin cobertura móvil']].flatMap(([ic, t], i) => [
            icon(ic, 80 + i * 380, 560, 36, GREEN), text(t, 128 + i * 380, 556, 320, 70, { fontSize: 22, lineHeight: 1.25, color: INK })])],
          notes: 'Los totales son fórmulas (=B2*C2 y =SUMA(ARRIBA)): si el inversor pregunta por otra finca, se cambian las hectáreas en directo y todo se recalcula. Precios de ejemplo.' },
        { title: 'Un mercado de 3,8 millones de hectáreas', layout: 'titleOnly', bg: '#e9efe3', extra: [
          chartBlock({ x: 80, y: 175, w: 720, h: 470, chartType: 'treemap', color: GREEN,
            data: [{ label: 'Olivar', value: 870 }, { label: 'Viñedo', value: 400 }, { label: 'Cereal', value: 380 }, { label: 'Frutales', value: 300 },
              { label: 'Cítricos', value: 270 }, { label: 'Hortícolas', value: 250 }, { label: 'Almendro', value: 210 }, { label: 'Otros', value: 1120 }] }),
          text('Hectáreas de regadío en España y Portugal, en miles, por cultivo', 840, 180, 360, 90, { fontSize: 20, color: '#5d6b58' }),
          withAnims(stat('1,3 M ha', 'de olivar y viñedo: por donde empezamos', 840, 290, 360, GREEN, INK, 60), A('fade-left')),
          withAnims(stat('60.000 ha', 'nuestro objetivo para 2029 (un 1,6 %)', 840, 460, 360, SOIL, INK, 60), A('fade-left', { start: 'afterPrev' }))],
          notes: 'Gráfico de rectángulos (treemap): el tamaño de cada cultivo es su superficie de regadío. Datos aproximados y redondeados para el ejemplo.' },
        { layout: 'blank', bg: DEEP, extra: [
          kicker('LA RONDA', 80, 70, 500, LEAF),
          text(`Buscamos <span style="color:${WHEAT}">1,2 M€</span>`, 74, 105, 700, 110, { fontFamily: H, fontSize: 78, fontWeight: 700, color: CREAM }),
          text('para pasar de 9 a 150 fincas en dos campañas', 80, 215, 640, 50, { fontSize: 26, color: SOFT }),
          chartBlock({ x: 650, y: 290, w: 300, h: 300, chartType: 'doughnut', legend: false,
            data: [{ label: 'Equipo comercial y agrónomos', value: 40, color: LEAF }, { label: 'Sondas en stock', value: 30, color: WHEAT }, { label: 'Producto y datos', value: 20, color: WATER }, { label: 'Circulante', value: 10, color: '#c98b5e' }] }),
          text('Uso de los fondos', 980, 300, 240, 40, { fontSize: 22, fontWeight: 700, color: SOFT }),
          text([[LEAF, '40 %', 'Equipo comercial y agrónomos'], [WHEAT, '30 %', 'Sondas en stock'], [WATER, '20 %', 'Producto y datos'], ['#c98b5e', '10 %', 'Circulante']]
            .map(([c, v, l]) => `<div style="margin-bottom:12px"><b style="color:${c}">${v}</b> ${l}</div>`).join(''), 980, 345, 240, 250, { fontSize: 20, lineHeight: 1.25, color: CREAM }),
          ...[['2026', '40 fincas en Córdoba y Jaén'], ['2027', 'Viñedo en La Rioja y el Alentejo'], ['2028', '150 fincas y punto de equilibrio']].flatMap(([y, d], i) => [
            withAnims(text(y, 80, 320 + i * 100, 120, 50, { fontFamily: H, fontSize: 38, fontWeight: 700, color: LEAF }), chain(i, 'fade-right')),
            withAnims(text(d, 210, 328 + i * 100, 420, 50, { fontSize: 24, color: CREAM }), A('fade-right', { start: 'withPrev' }))])],
          notes: 'Gráfico de dona con un color propio en cada porción y la leyenda automática con porcentajes. Los hitos entran en cadena con un clic.' },
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          pic(fieldSVG(), 0, 0, 1280, 720, 'Vista aérea de los campos'), shape('rect', 0, 0, 1280, 720, DEEP, { opacity: 82 }),
          text('SURCO', 140, 200, 1000, 160, { fontFamily: H, fontSize: 140, fontWeight: 700, color: CREAM, textAlign: 'center', letterSpacing: 10 }),
          text('Menos agua. Mejores cosechas. Datos que se entienden.', 140, 370, 1000, 50, { fontSize: 30, color: LEAF, textAlign: 'center' }),
          text('Marta Ruiz, cofundadora · hola@surco.example · surco.example', 140, 450, 1000, 40, { fontSize: 22, color: CREAM, textAlign: 'center' }),
          text('Modelo 3D: Landsat 8 — NASA (sin derechos de autor)', 140, 660, 1000, 26, { fontSize: 13, color: SOFT, textAlign: 'center' })],
          notes: 'Cierre sobre el mismo dibujo aéreo de la portada, oscurecido. Dejar el contacto en pantalla durante las preguntas.' },
      ]));
    } },
  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Tiza: a maths tutor app for 10–14. A squared exercise book with highlighter, post-its and handwriting.
  biz_startup_edtech: { name: 'Pitch edtech: tutor de matemáticas', cat: 'biz',
    summary: 'Cuaderno cuadriculado: pósits en cadena, letra manuscrita, ecuaciones paso a paso, móvil, cuestionario en directo, ciclo y gráficos', make: () => {
      const INK = '#2d3142', BLUE = '#2f5aa8', MARK = '#ffe066', PINK = '#ff8fab', MINT = '#2e9e78', ORANGE = '#f28c38', RED = '#e05a5a';
      const HF = head('friendly');
      const ttl = (s, w = 520) => [shape('rect', 186, 112, w, 20, MARK, { opacity: 85, rotation: -1 }),
        text(s, 190, 56, 1000, 80, { fontFamily: HF, fontSize: 46, fontWeight: 800, color: INK })];
      const hand = (s, x, y, w, h, size, color, props = {}) => text(s, x, y, w, h, { fontFamily: CAVEAT, fontSize: size, color, lineHeight: 1.1, ...props });
      return numbered(build({ name: 'Tiza · tutor de matemáticas', palette: 'paper', fonts: 'friendly', title: { color: INK },
        decor: () => [pic(notebookSVG, 0, 0, 1280, 720, '')] }, [
        { layout: 'blank', bg: '#fbf8f0', transition: 'fade', extra: [
          shape('rect', 196, 300, 470, 64, MARK, { opacity: 85, rotation: -2 }),
          text('Tiza', 190, 120, 600, 240, { fontFamily: HF, fontSize: 200, fontWeight: 800, color: INK, lineHeight: 1.1 }),
          text('El profe particular de mates<br>que cabe en el bolsillo', 196, 390, 620, 110, { fontSize: 36, lineHeight: 1.3, color: INK }),
          text('Para alumnado de 10 a 14 años · familias y colegios', 196, 540, 620, 40, { fontSize: 24, color: '#6b6f80' }),
          card(`<div style="font-family:${CAVEAT};font-size:38px;line-height:1.1">Pitch · ronda<br>pre-semilla</div><div style="margin-top:10px;font-size:22px"><b>Zaragoza, octubre 2026</b></div>`,
            900, 250, 290, 200, '#fff3a8', { rotation: 4, color: INK, radius: 4, shadow: { x: 4, y: 8, blur: 14, color: '#00000030' } }),
          hand('¾ + ⅙ = ¿?', 860, 90, 320, 80, 60, BLUE, { rotation: -6 }),
          shape('ellipse', 1080, 82, 120, 90, 'none', { stroke: RED, strokeWidth: 3, sketch: true }),
          hand('x² − 9 = 0  →  x = ±3', 790, 540, 440, 80, 46, BLUE, { rotation: 3 }),
          shape('star', 1150, 470, 60, 60, MARK, { stroke: ORANGE, strokeWidth: 2, sketch: true, rotation: 12 }),
          withAnims(stroke('M95 10 C 70 0, 30 10, 8 70 M8 70 L 2 48 M8 70 L 28 60', 770, 330, 120, 110, RED, 4), A('draw', { start: 'afterPrev', delay: 500, duration: 900 }))],
          notes: 'Tiza es una empresa inventada; las cifras son de ejemplo. Todo es un cuaderno cuadriculado: el fondo es un dibujo propio en el patrón (máster), el subrayado es un rectángulo amarillo semitransparente y la flecha se dibuja sola al llegar (efecto «Dibujar»).' },
        { layout: 'blank', bg: '#fbf8f0', extra: [...ttl('¿Os suena?', 270),
          ...[['«Llega a casa con los deberes y no sabe ni por dónde empezar.»', 'Madre de Leo, 11 años', '#fff3a8', -4],
            ['«Las fracciones se le atragantaron en quinto y ya no ha levantado cabeza.»', 'Padre de Irene, 13', '#ffd1dc', 3],
            ['«Una clase particular son 25 € la hora. No podemos todas las semanas.»', 'Madre de Hugo, 12', '#c9f0e1', -2],
            ['«En clase somos 28. No da tiempo a que me lo expliquen dos veces.»', 'Sara, 14 años', '#cfe3ff', 4]].map(([q, who, c, r], i) =>
            withAnims(card(`<div style="font-family:${CAVEAT};font-size:29px;line-height:1.1">${q}</div><div style="margin-top:12px;font-size:17px;color:#6b6f80">— ${who}</div>`,
              196 + i * 252, 180, 228, 280, c, { rotation: r, color: INK, radius: 4, pad: [18, 18, 18, 18], shadow: { x: 3, y: 7, blur: 12, color: '#00000030' } }),
            chain(i, 'fade-down', i ? {} : { sound: 'pop' }))),
          withAnims(text(`<span style="background:${MARK}">1 de cada 3 familias</span> no puede pagar clases de refuerzo, y las mates son la asignatura que más se suspende.`,
            196, 510, 1000, 100, { fontSize: 30, lineHeight: 1.35, color: INK }), A('fade-up', { start: 'click' }))],
          notes: 'Un clic: los cuatro pósits se pegan uno tras otro (el primero con un «pop»). Otro clic: el dato que resume el problema. Testimonios inventados.' },
        { layout: 'blank', bg: '#fbf8f0', extra: [...ttl('Aprende como con un buen profe', 640),
          dg('cycle', 'Diagnostica\nPropone\nCorrige\nAjusta', 180, 150, 540, 520, { oneByOne: true }),
          text(ul('<b>Diagnostica</b> en 10 minutos qué sabe y qué no', '<b>Propone</b> ejercicios a su medida, ni fáciles ni imposibles',
            '<b>Corrige</b> el razonamiento, no solo el resultado', '<b>Ajusta</b> el plan cada semana y avisa a la familia'), 720, 190, 500, 420, { fontSize: 26, lineHeight: 1.4, color: INK }),
          hand('¡Sin respuestas de memoria!', 740, 596, 480, 70, 40, RED, { rotation: -2 })],
          notes: 'Diagrama de ciclo, una fase por clic. Insistir en que corrige el razonamiento paso a paso: es lo que nos diferencia de una app de ejercicios.' },
        { layout: 'blank', bg: '#fbf8f0', extra: [...ttl('Así se ve: Lucía, 6.º de primaria', 700),
          pic(tizaApp, 230, 150, 250, 500, 'La app de Tiza con un ejercicio de fracciones y una pista', { device: 'phone' }),
          hand('Lucía lo resuelve paso a paso…', 560, 170, 600, 60, 40, BLUE),
          ...['\\frac{3}{4} + \\frac{1}{6}', '= \\frac{9}{12} + \\frac{2}{12}', '= \\frac{11}{12}'].map((l, i) =>
            withAnims(mathBlock({ x: 580, y: 240 + i * 130, w: 520, h: 120, fontSize: 40, latex: l, color: i === 2 ? BLUE : INK }), chain(i, 'fade-right'))),
          withAnims(shape('ellipse', 720, 495, 240, 130, 'none', { stroke: RED, strokeWidth: 4, sketch: true }), A('draw', { start: 'afterPrev', duration: 800 })),
          withAnims(hand('…y Tiza le explica por qué 12.', 600, 640, 600, 50, 32, RED), A('fade-in', { start: 'afterPrev' }))],
          notes: 'Ecuaciones (LaTeX) que entran paso a paso en un solo clic; al final un círculo a mano alzada se dibuja alrededor del resultado. En el móvil, la pantalla real del ejercicio con su pista.' },
        { layout: 'blank', bg: '#fbf8f0', extra: [pollBlock({ kind: 'quiz', question: 'Te toca a ti: ¿cuánto son 2/3 de 90?', options: ['30', '45', '60', '75'], correct: [2], time: 20,
          fontSize: 40, x: 190, y: 50, w: 1030, h: 620 })],
          notes: 'Cuestionario en directo con 20 segundos: los inversores responden desde el móvil, como hacen los alumnos en clase. Solución: 60 (90 ÷ 3 × 2).' },
        { layout: 'blank', bg: '#fbf8f0', extra: [...ttl('Piloto: 6 colegios, 410 alumnos', 620),
          chartBlock({ x: 190, y: 165, w: 640, h: 470, chartType: 'line', color: BLUE, seriesName: 'Con Tiza', dataLabels: true, grid: true, yTitle: 'Nota media en matemáticas',
            data: [{ label: '1.er trimestre', value: 5.1 }, { label: '2.º trimestre', value: 6.0 }, { label: '3.er trimestre', value: 6.7 }],
            series: [{ name: 'Sin Tiza', values: [5.2, 5.4, 5.6], color: '#a0a7b5' }] }),
          withAnims(stat('+1,1', 'puntos más de nota media que el grupo de control', 880, 190, 330, BLUE, INK, 76), chain(0, 'fade-left')),
          withAnims(stat('22 min', 'de uso al día, sin que nadie lo mande', 880, 380, 330, MINT, INK, 76), chain(1, 'fade-left')),
          withAnims(shape('ellipse', 778, 252, 96, 72, 'none', { stroke: RED, strokeWidth: 3, sketch: true }), A('draw', { start: 'afterPrev', duration: 700 }))],
          notes: 'Líneas con dos series y etiquetas: nota media del grupo que usó Tiza frente al grupo de control. Curso 2025-26, datos de ejemplo.' },
        { layout: 'blank', bg: '#fbf8f0', extra: [...ttl('Cómo ganamos dinero', 420),
          ...[['Familias', '7,99 €', 'al mes por alumno', ['Ejercicios ilimitados', 'Informe semanal'], PINK], ['Colegios', '3 €', 'al mes por alumno', ['Panel para el profesorado', 'Grupos y deberes'], MINT]].flatMap(([h, p, per, items, c], i) => {
            const y = 170 + i * 240;
            return [shape('rect', 196, y, 150, 40, c, { rotation: 0 }), text(h, 206, y + 4, 140, 34, { fontSize: 22, fontWeight: 800, color: '#ffffff' }),
              withAnims(card(`<div style="font-family:${HF};font-size:52px;font-weight:800;line-height:1">${p}</div><div style="font-size:20px;color:#6b6f80;margin:4px 0 8px">${per}</div><div style="font-size:21px">${items.join(' · ')}</div>`,
                196, y + 40, 420, 170, '#ffffff', { color: INK, radius: 4, borderColor: c, pad: [18, 22, 18, 22] }), chain(i, 'fade-right'))]; }),
          chartBlock({ x: 660, y: 160, w: 560, h: 480, chartType: 'stacked', color: PINK, seriesName: 'Familias', grid: true, yTitle: 'Ingresos previstos (miles de €)',
            data: [{ label: '2026', value: 60 }, { label: '2027', value: 240 }, { label: '2028', value: 520 }, { label: '2029', value: 900 }],
            series: [{ name: 'Colegios', values: [20, 180, 610, 1300], color: MINT }] })],
          notes: 'Dos fichas como pestañas de cuaderno y barras apiladas con la previsión: los colegios pesarán más a partir de 2028. Precios y previsión de ejemplo.' },
        { layout: 'blank', bg: '#fbf8f0', transition: 'page', extra: [...ttl('Quiénes somos y qué buscamos', 640),
          ...[['NI', 'Nuria Ibarra', 'CEO · 12 años de profe de mates', BLUE], ['PO', 'Pablo Ortiz', 'CTO · antes, apps educativas', ORANGE], ['AS', 'Aitana Sol', 'Diseño · ilustradora y madre', PINK]].flatMap(([ini, n, d, c], i) => [
            shape('ellipse', 210, 170 + i * 150, 110, 110, c, { sketch: true, stroke: INK, strokeWidth: 2 }),
            text(ini, 210, 200 + i * 150, 110, 50, { fontFamily: HF, fontSize: 36, fontWeight: 800, color: '#ffffff', textAlign: 'center' }),
            text(`<b>${n}</b><br><span style="font-size:20px;color:#6b6f80">${d}</span>`, 345, 192 + i * 150, 380, 80, { fontSize: 26, lineHeight: 1.3, color: INK })]),
          withAnims(card(`<div style="font-family:${CAVEAT};font-size:44px;line-height:1">Buscamos</div><div style="font-family:${HF};font-size:56px;font-weight:800;line-height:1.15">600.000 €</div>`
            + `<div style="font-size:21px;margin-top:10px">18 meses para llegar a 40 colegios y 5.000 familias</div>`, 790, 190, 400, 300, '#fff3a8',
          { rotation: -3, color: INK, radius: 4, pad: [24, 26, 24, 26], shadow: { x: 4, y: 8, blur: 14, color: '#00000030' } }), A('zoom-in', { start: 'click', sound: 'chime' })),
          hand('hola@tiza.example', 820, 560, 380, 60, 42, BLUE, { rotation: -2 })],
          notes: 'Equipo con iniciales en círculos a mano alzada. Clic: el pósit de la ronda entra con una campanilla. Personas inventadas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Recado: last mile by cargo bike. A metro map: coloured lines that draw themselves, stations and signs.
  biz_startup_lastmile: { name: 'Pitch logística: última milla', cat: 'biz',
    summary: 'Estilo plano de metro: líneas que se dibujan solas, camión 3D y bicis que recorren el mapa, tabla con fórmulas, área y cascada', make: () => {
      const INK = '#1a1a1a', L1 = '#e63946', L2 = '#2a9d8f', L3 = '#f4a261', L4 = '#457b9d', GREY = '#f1f3f5', MUTE = '#6c757d', W = '#ffffff';
      const X = u => 640 + u * 6, Y = v => 60 + v * 6;
      const station = (u, v, c = INK) => shape('ellipse', X(u) - 14, Y(v) - 14, 28, 28, W, { stroke: c, strokeWidth: 6 });
      const badge = (s, c, x, y, d = 46) => [shape('ellipse', x, y, d, d, c), text(s, x, y + d * 0.2, d, d * 0.6, { fontSize: Math.round(d * 0.4), fontWeight: 800, color: W, textAlign: 'center' })];
      const truck = lib3d('kh-CesiumMilkTruck');
      return numbered(build({ name: 'Recado · última milla', palette: 'office', fonts: 'clean', title: { size: 44, color: INK } }, [
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          ...[['M0 50 L40 50 L60 30 L100 30', L1], ['M40 0 L40 50 L60 70 L100 70', L2], ['M40 50 L40 100', L3], ['M40 50 L100 50', L4]].map(([d, c], i) =>
            withAnims(stroke(d, 640, 60, 600, 600, c, 16), A('draw', { start: 'afterPrev', duration: 700 }))),
          ...[[20, 50, L1], [75, 30, L1], [92, 30, L1], [40, 20, L2], [78, 70, L2], [40, 82, L3], [70, 50, L4], [90, 50, L4]].map(([u, v, c]) => withAnims(station(u, v), A('zoom-in', { start: 'withPrev', duration: 300 }))),
          shape('rounded', X(40) - 36, Y(50) - 36, 72, 72, INK, { radius: 16 }), text('HUB', X(40) - 36, Y(50) - 13, 72, 30, { fontSize: 18, fontWeight: 800, color: W, textAlign: 'center' }),
          kicker('PITCH · SEMILLA · VALENCIA 2026', 80, 150, 560, MUTE, 17, { letterSpacing: 3 }),
          text('Recado', 72, 185, 600, 170, { fontSize: 140, fontWeight: 800, color: INK, letterSpacing: -4 }),
          text('La última milla en bici de carga, desde un hub en cada barrio.', 80, 360, 520, 100, { fontSize: 30, lineHeight: 1.3, color: INK }),
          ...badge('L1', L1, 80, 520), ...badge('L2', L2, 136, 520), ...badge('L3', L3, 192, 520), ...badge('L4', L4, 248, 520),
          text('4 líneas · 11 barrios · entrega en menos de 2 h', 80, 585, 540, 34, { fontSize: 21, color: MUTE })],
          notes: 'Recado es una empresa inventada; todas las cifras son de ejemplo. Al llegar, las cuatro líneas se dibujan solas una tras otra (efecto «Dibujar»), como un plano de metro.' },
        { layout: 'blank', bg: W, extra: [
          shape('rounded', 80, 90, 560, 540, INK, { radius: 22 }), ...badge('!', L1, 120, 130, 56),
          text('38 %', 120, 230, 480, 170, { fontSize: 160, fontWeight: 800, color: L3, lineHeight: 1 }),
          text('de las furgonetas de reparto circula medio vacía por el centro de la ciudad.', 120, 420, 480, 140, { fontSize: 32, lineHeight: 1.3, color: W }),
          ...[['clock', L4, '22 min', 'por ruta buscando dónde parar'], ['close', L1, '1 de cada 5', 'entregas falla a la primera'], ['location', L2, '30 %', 'del tráfico de furgonetas en el centro es reparto']].flatMap(([ic, c, n, d], i) => {
            const y = 110 + i * 175;
            return [withAnims(shape('rounded', 700, y, 120, 120, c, { radius: 20 }), chain(i, 'fade-left')), withAnims(icon(ic, 730, y + 30, 60, W), A('fade-left', { start: 'withPrev' })),
              withAnims(text(`<div style="font-size:44px;font-weight:800;line-height:1.05">${n}</div><div style="font-size:23px;color:${MUTE}">${d}</div>`, 850, y + 4, 360, 120, { color: INK }), A('fade-left', { start: 'withPrev' }))]; })],
          notes: 'Estilo señal de estación: un panel negro con la cifra grande y tres pictogramas que entran en cadena con un clic. Cifras de ejemplo.' },
        { title: 'Cómo funciona: un hub en cada barrio', layout: 'titleOnly', bg: W, extra: [
          pic(recadoMap([L1, L2, L3]), 90, 170, 1100, 460, 'Plano esquemático: ronda de la ciudad, hub y tres líneas de reparto con sus paradas'),
          withAnims(m3d('kh-CesiumMilkTruck', 50, 480, 170, 120, { view: 'side' }), path([[220, -20], [440, -80]], { duration: 2400 })),
          ...[[[140, -140], [580, -140]], [[580, 0]], [[120, 120], [520, 120]]].map((pts, i) =>
            withAnims(shape('ellipse', 557, 457, 26, 26, [L1, L2, L3][i], { stroke: W, strokeWidth: 3 }), A('fade-in', { start: i ? 'withPrev' : 'afterPrev', duration: 200 }),
              path(pts, { start: 'afterPrev', duration: 2200 + i * 300 }))),
          text('<b>1</b> · Camión eléctrico de noche al hub &nbsp; <b>2</b> · Bicis de carga de 7:00 a 14:00 &nbsp; <b>3</b> · Entrega en menos de 2 h', 90, 640, 1100, 40, { fontSize: 21, color: MUTE, textAlign: 'center' })],
          notes: 'Clic: el camión 3D llega por la ronda hasta el hub (trayectoria). Después salen las tres bicis, cada una por su línea. El plano es un dibujo propio en SVG.' },
        { title: 'Furgoneta frente a bici de carga', layout: 'titleOnly', bg: W, extra: [
          tableBlock({ x: 80, y: 175, w: 1120, h: 380, fontSize: 25, header: true, headBg: INK, headFg: W, stroke: '#dee2e6', banded: true, band: L2,
            rows: [['Por entrega', 'Furgoneta diésel', 'Bici de carga Recado', 'Diferencia'], ['Coste', '4,10 €', '2,35 €', '=C2-B2'], ['Entregas por hora', '7', '11', '=C3-B3'],
              ['CO₂ emitido', '410 g', '12 g', '=C4-B4'], ['Tiempo para aparcar', '3,1 min', '0 min', '=C5-B5'], ['Entregas fallidas', '19 %', '8 %', '=C6-B6']], colW: [3.2, 2.6, 2.8, 2.2] }),
          ...badge('L2', L2, 80, 590, 40), text('La columna «Diferencia» son fórmulas: se recalcula al cambiar cualquier dato.', 136, 594, 1000, 34, { fontSize: 21, color: MUTE })],
          notes: 'Tabla con fórmulas (=C2-B2…): los porcentajes se restan como puntos. Datos medios de nuestras rutas en Valencia frente a un operador tradicional (de ejemplo).' },
        { title: 'Tracción: un año en Valencia', layout: 'titleOnly', bg: W, extra: [
          chartBlock({ x: 80, y: 170, w: 760, h: 470, chartType: 'area', color: L2, seriesName: 'Entregas por semana (miles)', grid: true,
            data: ['oct', 'nov', 'dic', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep'].map((label, i) => ({ label, value: [1.2, 1.6, 2.4, 2.1, 2.8, 3.3, 3.9, 4.6, 5.2, 5.0, 6.1, 7.4][i] })) }),
          ...[['7.400', 'entregas a la semana', L2], ['92 %', 'entregadas a la primera', L4], ['36', 'clientes: tiendas, farmacias, librerías…', L1]].map(([n, l, c], i) =>
            withAnims(stat(n, l, 890, 180 + i * 155, 320, c, INK, 62), chain(i, 'fade-left')))],
          notes: 'Gráfico de áreas con cuadrícula: entregas semanales de octubre de 2025 a septiembre de 2026. Tres cifras en cadena con un clic. Datos de ejemplo.' },
        { title: 'Lo que deja cada entrega (€)', layout: 'titleOnly', bg: GREY, extra: [
          chartBlock({ x: 80, y: 170, w: 1120, h: 400, chartType: 'waterfall', color: L2, dataLabels: true,
            data: [{ label: 'Precio medio', value: 3.2 }, { label: 'Repartidor', value: -1.3 }, { label: 'Bici y hub', value: -0.55 }, { label: 'Software y seguro', value: -0.25 }, { label: 'Total margen', value: 0 }] }),
          withAnims(text(`<b style="color:${L2}">1,10 € de margen por entrega (34 %)</b> con 11 entregas por hora y repartidores en plantilla, no autónomos.`, 80, 590, 1120, 80, { fontSize: 27, lineHeight: 1.3, color: INK, textAlign: 'center' }), A('fade-up'))],
          notes: 'Cascada: del precio que paga la tienda al margen; la última barra («Total…») se calcula sola. Clic: la conclusión.' },
        { title: 'Próximas paradas', layout: 'titleOnly', bg: W, extra: [
          withAnims(shape('rect', 120, 372, 1040, 16, L4), A('fade-right', { start: 'afterPrev', duration: 900 })),
          ...[['Valencia', '2025 · abierta', L2, true], ['Zaragoza', 'otoño de 2027', L4], ['Bilbao', 'primavera de 2028', L4], ['Lisboa', 'otoño de 2028', L4]].flatMap(([n, d, c, open], i) => {
            const x = 170 + i * 310, up = i % 2 === 0;
            return [withAnims(shape('ellipse', x - 34, 346, 68, 68, open ? c : W, { stroke: INK, strokeWidth: 8 }), A('zoom-in', { start: 'click', duration: 400, sound: 'click' })),
              withAnims(text(`<div style="font-size:36px;font-weight:800">${n}</div><div style="font-size:22px;color:${MUTE}">${d}</div>`, x - 140, up ? 230 : 440, 280, 100, { color: INK, textAlign: 'center' }), A('fade-up', { start: 'withPrev' }))]; }),
          text('Cada ciudad nueva: un hub, 12 bicis y 8 personas. Punto de equilibrio al séptimo mes.', 120, 590, 1040, 40, { fontSize: 23, color: MUTE, textAlign: 'center' })],
          notes: 'La línea se traza al llegar; cada clic «abre» una estación con un clic de sonido. Las fechas son el plan de expansión (de ejemplo).' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          shape('rounded', 80, 120, 1120, 340, INK, { radius: 26 }),
          text('PRÓXIMA PARADA', 140, 165, 700, 40, { fontSize: 24, letterSpacing: 6, color: '#adb5bd', fontWeight: 700 }),
          text('Serie semilla · 2,5 M€', 136, 225, 840, 100, { fontSize: 64, fontWeight: 800, color: W }),
          text('Para abrir tres ciudades y llegar a 40.000 entregas a la semana', 140, 345, 820, 50, { fontSize: 26, color: '#ced4da' }),
          withAnims(shape('ellipse', 990, 200, 170, 170, L3), A('zoom-in', { start: 'afterPrev', delay: 300, sound: 'chime' })),
          withAnims(shape('rightarrow', 1030, 250, 90, 70, INK), A('fade-right', { start: 'withPrev' })),
          ...badge('L1', L1, 80, 520), ...badge('L2', L2, 136, 520), ...badge('L3', L3, 192, 520), ...badge('L4', L4, 248, 520),
          text('Clara Benlloch y Javi Moreno, cofundadores · hola@recado.example', 320, 526, 880, 40, { fontSize: 24, color: INK }),
          credits(['kh-CesiumMilkTruck'], 80, 650, 1120, MUTE)],
          notes: 'Cierre con la señal de «próxima parada»: la flecha entra con una campanilla. Abrir las preguntas.' },
      ]));
    } },
  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Retal: circular fashion. A hanging clothes tag, dashed stitching, cloth colours; the tag travels (Transform).
  biz_startup_fashion: { name: 'Pitch moda circular: Retal', cat: 'biz',
    summary: 'Etiqueta de ropa que viaja con Transformar, costuras punteadas, vida de una prenda en cadena, ciclo, dona, radar y votación múltiple', make: () => {
      const CREAM = '#f3e9dc', TERRA = '#b5523b', INK = '#2b1512', OLIVE = '#6b705c', MUSTARD = '#d9a441', DENIM = '#3d5a80', ROSE = '#e8a598', BROWN = '#8a5a44';
      const HF = head('editorial'), TAG = 'M22 2 H98 V98 H22 L2 50 Z', TG = uid(), TT = uid(), TH = uid();
      const tag = (x, y, w, h, rot, size) => [
        { ...shape('custom', x, y, w, h, TERRA, { path: TAG, rotation: rot, shadow: { x: 6, y: 10, blur: 16, color: '#2b151240' } }), id: TG },
        { ...shape('ellipse', x + w * 0.1, y + h * 0.45, h * 0.1, h * 0.1, CREAM, { rotation: rot }), id: TH },
        { ...text(`<div style="font-family:${HF};font-size:${size}px;font-weight:900;letter-spacing:${Math.round(size / 14)}px;line-height:1.1">RETAL</div><div style="font-size:${Math.round(size * 0.3)}px;margin-top:6px">talla única: tu armario</div>`,
          x + w * 0.2, y + h * 0.24, w * 0.78, h * 0.56, { color: CREAM, rotation: rot, textAlign: 'center' }), id: TT }];
      const stitch = (x, y, w, h, c = TERRA) => shape('rect', x, y, w, h, 'none', { stroke: c, strokeWidth: 2, dash: 'dash' });
      const mini = (x, y, c, rot) => shape('custom', x, y, 210, 120, c, { path: TAG, rotation: rot });
      return numbered(build({ name: 'Retal · moda circular', palette: 'warm', fonts: 'editorial', title: { size: 44, color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          stitch(30, 30, 1220, 660),
          kicker('MODA CIRCULAR · PITCH 2026', 90, 160, 600, TERRA, 18),
          text('La ropa que ya existe,<br>otra vez en circulación', 86, 200, 640, 200, { fontFamily: HF, fontSize: 50, fontWeight: 700, lineHeight: 1.3, color: INK }),
          shape('rect', 92, 420, 120, 4, MUSTARD),
          text('Comprar, alquilar, arreglar y revender, en una sola app y con la ropa de tu barrio.', 90, 445, 560, 100, { fontSize: 25, lineHeight: 1.4, color: OLIVE }),
          stroke('M100 0 C 60 30, 0 40, 12 100', 800, 40, 130, 280, INK, 2),
          ...tag(760, 190, 440, 300, -8, 70)],
          notes: 'Retal es una empresa inventada; todas las cifras son de ejemplo. La etiqueta es una forma propia (un trazo libre) con su agujero y su cordel; la costura del borde es un rectángulo con línea discontinua.' },
        { layout: 'blank', bg: TERRA, autoAnimate: true, extra: [
          ...tag(990, 60, 230, 150, 6, 36),
          text('21 kg', 80, 150, 800, 230, { fontFamily: HF, fontSize: 200, fontWeight: 900, color: CREAM, lineHeight: 1 }),
          withAnims(shape('rect', 90, 395, 620, 2, 'none', { stroke: MUSTARD, strokeWidth: 3, dash: 'dash' }), A('fade-right', { start: 'afterPrev', duration: 900 })),
          text('de ropa por persona y año acaban en la basura.', 90, 420, 760, 60, { fontSize: 34, color: CREAM }),
          withAnims(text('Y menos del 1 % se recicla para hacer ropa nueva.', 90, 500, 760, 60, { fontSize: 30, color: '#ffd9c7', fontStyle: 'italic' }), A('fade-up'))],
          notes: 'Transformar: la etiqueta de la portada viaja, gira y encoge hasta la esquina, mientras el fondo cambia a terracota. La costura bajo la cifra entra sola. Cifras aproximadas, de ejemplo.' },
        { title: 'Cada prenda, varias vidas', layout: 'titleOnly', bg: CREAM, extra: [
          dg('cycle', 'Comprar\nUsar\nDevolver\nReparar\nRevender', 80, 160, 560, 500, { oneByOne: true }),
          stitch(700, 190, 500, 420),
          text(`<div style="font-family:${HF};font-size:80px;font-weight:900;color:${TERRA};line-height:1">3,4</div><div style="font-size:26px;margin:8px 0 22px">dueños de media por prenda en Retal</div>`
            + `<div style="font-size:22px;color:${OLIVE};line-height:1.45">Cada vuelta deja una comisión del 25 % para Retal y crédito para quien devuelve la prenda, que vuelve a comprar.</div>`, 730, 220, 440, 370, { color: INK })],
          notes: 'Diagrama de ciclo, una fase por clic. El dato de la derecha está dentro de una «costura» (rectángulo punteado).' },
        { title: 'La vida de la chaqueta nº 0417', layout: 'titleOnly', bg: CREAM, extra: [
          shape('rect', 80, 410, 1120, 2, 'none', { stroke: INK, strokeWidth: 3, dash: 'dash' }),
          ...[['MAR 2024', 'Nueva. La compra Lucía', DENIM], ['OCT 2024', 'Lucía la devuelve: 30 € de crédito', MUSTARD], ['NOV 2024', 'Cremallera nueva en el taller', OLIVE],
            ['ENE 2025', 'Alquilada tres meses por Marta', ROSE], ['JUN 2025', 'Vendida a Iker por 45 €', TERRA]].flatMap(([d, t, c], i) => {
            const x = 80 + i * 228, up = i % 2 === 0, y = up ? 190 : 450, rot = up ? -4 : 4;
            return [withAnims(shape('ellipse', x + 95, 402, 18, 18, c), chain(i, 'zoom-in', { duration: 300, ...(i ? {} : { sound: 'pop' }) })),
              withAnims(mini(x, y, c, rot), A('fade-down', { start: 'afterPrev', duration: 400 })),
              withAnims(text(`<b style="letter-spacing:2px">${d}</b><br>${t}`, x + 50, y + 14, 152, 92, { fontSize: 17, lineHeight: 1.3, color: c === ROSE || c === MUSTARD ? INK : '#ffffff', rotation: rot }), A('fade-in', { start: 'withPrev' }))]; })],
          notes: 'Un clic y la vida de una prenda real (inventada) se cuenta sola: cada etiqueta cae en su fecha, una tras otra. Cinco momentos, tres dueños y un arreglo.' },
        { layout: 'blank', bg: INK, extra: [
          text('¿Dónde acaba la ropa que tiramos?', 80, 60, 1120, 70, { fontFamily: HF, fontSize: 44, fontWeight: 700, color: CREAM }),
          chartBlock({ x: 90, y: 170, w: 440, h: 440, chartType: 'doughnut', legend: false,
            data: [{ label: 'Vertedero', value: 57, color: BROWN }, { label: 'Incineración', value: 25, color: TERRA }, { label: 'Reutilización', value: 12, color: '#a8c686' }, { label: 'Reciclaje', value: 6, color: MUSTARD }] }),
          ...[['57 %', 'Vertedero', BROWN], ['25 %', 'Incineración', TERRA], ['12 %', 'Reutilización', '#a8c686'], ['6 %', 'Reciclaje', MUSTARD]].map(([v, l, c], i) =>
            withAnims(text(`<span style="font-family:${HF};font-size:48px;font-weight:900;color:${c}">${v}</span>&nbsp;&nbsp;${l}`, 620, 180 + i * 90, 560, 70, { fontSize: 28, color: CREAM, vAlign: 'middle' }), chain(i, 'fade-left'))),
          withAnims(text('Retal quiere hacer crecer la parte verde.', 620, 560, 560, 50, { fontSize: 26, fontStyle: 'italic', color: '#a8c686' }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Gráfico de dona con un color propio en cada porción; la leyenda es texto grande que entra en cadena. Porcentajes aproximados en Europa, de ejemplo.' },
        { layout: 'blank', bg: INK, extra: [stitch(30, 30, 1220, 660, ROSE), pollBlock({ kind: 'multi', question: '¿Qué te frena para comprar ropa de segunda mano? (marca todas)', fontSize: 32, x: 80, y: 60, w: 1120, h: 600,
          options: ['No encuentro mi talla', 'Dudo del estado de la prenda', 'Me da pereza buscar', 'Prefiero estrenar', 'El precio no compensa'] })],
          notes: 'Votación de elección múltiple en directo. Las respuestas del público suelen coincidir con nuestras encuestas: talla y estado. Por eso cada prenda pasa por el taller y lleva medidas reales.' },
        { title: 'Tres fuentes de ingresos', layout: 'titleOnly', bg: CREAM, extra: [
          ...[['Reventa', '25 % de comisión por prenda vendida', TERRA], ['Alquiler', '19 € al mes: tres prendas a la vez', DENIM], ['Arreglos', 'Taller propio: 12 € de media', OLIVE]].map(([h, d, c], i) =>
            withAnims(card(`<div style="font-family:${HF};font-size:30px;font-weight:700;color:${c}">${h}</div><div style="font-size:21px;margin-top:6px">${d}</div>`, 80, 180 + i * 150, 460, 128, '#ffffff',
              { color: INK, radius: 6, borderColor: c, pad: [18, 22, 18, 22] }), chain(i, 'fade-right'))),
          chartBlock({ x: 590, y: 165, w: 610, h: 480, chartType: 'stacked', color: TERRA, seriesName: 'Reventa', grid: true, yTitle: 'Ingresos (miles de €)',
            data: [{ label: '2026', value: 180 }, { label: '2027', value: 520 }, { label: '2028', value: 1100 }, { label: '2029', value: 1900 }],
            series: [{ name: 'Alquiler', values: [60, 260, 640, 1200], color: DENIM }, { name: 'Arreglos', values: [40, 110, 220, 380], color: OLIVE }] })],
          notes: 'Tres tarjetas en cadena y barras apiladas con la previsión por línea de negocio. El alquiler es la que más crece. Previsión de ejemplo.' },
        { layout: 'blank', bg: INK, extra: [
          text('Una prenda nueva frente a una de Retal', 80, 60, 1120, 70, { fontFamily: HF, fontSize: 44, fontWeight: 700, color: CREAM }),
          chartBlock({ x: 80, y: 150, w: 520, h: 520, chartType: 'radar', color: TERRA, seriesName: 'Prenda nueva', yMax: 10,
            data: [{ label: 'Agua', value: 10 }, { label: 'CO₂', value: 9 }, { label: 'Residuos', value: 8 }, { label: 'Precio', value: 8 }, { label: 'Transporte', value: 6 }],
            series: [{ name: 'Prenda Retal', values: [1, 2, 1, 4, 3], color: MUSTARD }] }),
          text('Impacto de 0 a 10: cuanto más pequeña la figura, mejor.', 660, 170, 540, 70, { fontSize: 22, color: '#c9b8a8' }),
          ...[['−90 %', 'de agua: una camiseta nueva gasta unos 2.700 litros', '#8ecae6'], ['−80 %', 'de CO₂ por cada uso de la prenda', MUSTARD], ['−50 %', 'de precio frente a estrenar', ROSE]].map(([n, l, c], i) =>
            withAnims(stat(n, l, 660, 250 + i * 135, 540, c, CREAM, 52), chain(i, 'fade-left')))],
          notes: 'Radar con dos series: cuanto más pequeña la figura, menos impacto. Las tres cifras entran en cadena con un clic. Datos aproximados, de ejemplo.' },
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          stitch(30, 30, 1220, 660),
          stroke('M50 0 C 40 40, 70 60, 46 100', 300, 30, 80, 190, INK, 2),
          ...tag(150, 200, 420, 290, -5, 68).map(b => ({ ...b, id: uid() })),
          text('Buscamos 1,5 M€', 650, 210, 560, 80, { fontFamily: HF, fontSize: 56, fontWeight: 900, color: TERRA }),
          text('para abrir tres talleres y llegar a 80.000 prendas en circulación en 2028.', 650, 300, 540, 110, { fontSize: 26, lineHeight: 1.4, color: INK }),
          shape('rect', 652, 430, 120, 4, MUSTARD),
          text('Inés Valcárcel y Bruno Lago · hola@retal.example', 650, 460, 560, 40, { fontSize: 22, color: OLIVE })],
          notes: 'Cierre con la etiqueta otra vez, como al principio. Pedir la ronda y dejar el contacto en pantalla. Personas inventadas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Remanso: mental health for teams. Calm night colours, rings that breathe, a one-minute breathing break.
  biz_startup_mental: { name: 'Pitch salud mental: Remanso', cat: 'biz',
    summary: 'Noche en calma: anillos que respiran, minuto de respiración con cuenta atrás, app en el móvil, escalera, valoración y tabla con fórmulas', make: () => {
      const NIGHT = '#1b1030', DUSK = '#2a1850', LAV = '#c8b6ff', PEACH = '#ffc6a8', MINT = '#9be3c7', SOFT = '#f3eefe', DIM = '#b9aed6', DEEP = '#2a1850';
      const HF = head('modern');
      const ttl = (s, c = SOFT) => text(s, 90, 56, 1100, 70, { fontFamily: HF, fontSize: 42, fontWeight: 600, color: c });
      const rings = (cx, cy, k = 1, anim = false) => [520, 400, 280, 160].map((d, i) => {
        const r = ring(cx - d * k / 2, cy - d * k / 2, d * k, LAV, 2, { opacity: [18, 30, 50, 75][i] });
        return anim ? withAnims(r, A('zoom-in', { start: 'afterPrev', duration: 1400 - i * 200 })) : r; });
      return numbered(build({ name: 'Remanso · bienestar emocional', palette: 'violet', fonts: 'modern', title: { size: 42, color: DEEP } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', extra: [
          glow(560, -120, 820, '#5b3fa0', NIGHT, 60), glow(-260, 380, 620, '#c06c84', NIGHT, 28),
          ...rings(930, 360, 1, true), shape('ellipse', 880, 310, 100, 100, PEACH, { fill2: LAV, gradType: 'radial' }),
          kicker('PITCH · SERIE A · MADRID 2026', 90, 200, 600, MINT, 18),
          text('Remanso', 84, 240, 640, 140, { fontFamily: HF, fontSize: 110, fontWeight: 300, color: SOFT, letterSpacing: 2 }),
          text('Salud mental para equipos,<br>sin listas de espera.', 90, 390, 560, 110, { fontSize: 32, lineHeight: 1.35, color: DIM })],
          notes: 'Remanso es una empresa inventada; todas las cifras son de ejemplo. Al llegar, los anillos se abren despacio, de fuera adentro, como una respiración.' },
        { layout: 'blank', bg: DUSK, transition: 'fade', extra: [
          withAnims(glow(390, 110, 500, LAV, DUSK, 40), A('zoom-in', { start: 'afterPrev', duration: 4000 })),
          text('Antes de empezar, respiremos un minuto', 90, 60, 1100, 70, { fontFamily: HF, fontSize: 40, fontWeight: 600, color: SOFT, textAlign: 'center' }),
          timer(60, 490, 210, 300, { color: LAV, endText: 'Gracias' }),
          text('Inspira 4 segundos · mantén 4 · suelta en 6', 90, 560, 1100, 50, { fontSize: 30, color: MINT, textAlign: 'center' })],
          notes: 'Cuenta atrás de un minuto que empieza sola y suena al acabar; el brillo de detrás crece durante cuatro segundos, lo que dura una inspiración. Hacerlo de verdad: es la mejor demo del producto.' },
        { layout: 'blank', bg: NIGHT, extra: [ttl('El coste invisible'),
          chartBlock({ x: 80, y: 160, w: 700, h: 480, chartType: 'hbar', color: LAV, dataLabels: true, seriesName: '% de los días de baja',
            data: [{ label: 'Estrés y ansiedad', value: 31 }, { label: 'Lesiones musculares', value: 27 }, { label: 'Otras', value: 17 }, { label: 'Respiratorias', value: 14 }, { label: 'Depresión', value: 11 }] }),
          withAnims(stat('1 de cada 3', 'días de baja tiene un origen emocional', 830, 190, 380, PEACH, SOFT, 60), chain(0, 'fade-left')),
          withAnims(stat('9 semanas', 'de espera media para ver a un psicólogo en la sanidad pública', 830, 400, 380, MINT, SOFT, 60), chain(1, 'fade-left'))],
          notes: 'Barras horizontales con etiquetas: motivos de baja por porcentaje de días perdidos. Datos de ejemplo.' },
        { layout: 'blank', bg: NIGHT, extra: [glow(60, 60, 600, '#5b3fa0', NIGHT, 45), ttl('Remanso en el bolsillo de cada persona'),
          pic(remansoApp, 160, 150, 260, 520, 'La app de Remanso: cómo estás hoy y el plan de la semana', { device: 'phone' }),
          ...[['heart', PEACH, 'Check-in de 30 segundos', 'Cinco caras, una pregunta: así empieza el día.'], ['clock', MINT, 'Psicóloga en 48 horas', 'Por vídeo o en persona, sin pasar por la empresa.'],
            ['user', LAV, 'Plan a tu medida', 'Respiración, sueño, diario: diez minutos al día.']].flatMap(([ic, c, h, d], i) => [
            withAnims(shape('ellipse', 520, 190 + i * 150, 84, 84, c, { opacity: 25 }), chain(i, 'fade-left')),
            withAnims(icon(ic, 542, 212 + i * 150, 40, c), A('fade-left', { start: 'withPrev' })),
            withAnims(text(`<div style="font-size:30px;font-weight:600;color:${SOFT}">${h}</div><div style="font-size:22px;color:${DIM};margin-top:4px">${d}</div>`, 630, 186 + i * 150, 560, 100, {}), A('fade-left', { start: 'withPrev' }))])],
          notes: 'La app dentro de un móvil (dibujo propio en SVG). Un clic: las tres funciones entran en cadena, cada una con su icono.' },
        { layout: 'blank', bg: NIGHT, extra: [ttl('Cómo funciona'),
          dg('steps', 'Check-in\n  30 segundos al día\nPlan personal\n  Recomendado por psicólogas\nSesión en 48 h\n  Vídeo o presencial\nSeguimiento\n  Cada dos semanas', 90, 160, 1100, 480, { oneByOne: true, colors: 'colorful' })],
          notes: 'Diagrama en escalera, un peldaño por clic: cada paso sube un poco más en cuidado.' },
        { layout: 'blank', bg: DUSK, extra: [pollBlock({ kind: 'rating', question: 'Del 1 al 5: ¿con cuánta energía llegas hoy a esta reunión?', fontSize: 36, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Valoración en directo, como el check-in de la app. Comentar el resultado: así ve una empresa el ánimo de un equipo, sin saber quién ha contestado qué.' },
        { layout: 'blank', bg: NIGHT, extra: [ttl('Resultados con nuestros primeros clientes'),
          chartBlock({ x: 80, y: 160, w: 680, h: 480, chartType: 'line', color: MINT, seriesName: 'Clientes de Remanso', dataLabels: true, grid: true, yTitle: 'Días de baja por 100 personas',
            data: [{ label: 'T1', value: 41 }, { label: 'T2', value: 36 }, { label: 'T3', value: 31 }, { label: 'T4', value: 28 }],
            series: [{ name: 'Media del sector', values: [46, 44, 43, 45], color: '#8a7fa8' }] }),
          withAnims(card(`<div style="font-size:60px;line-height:.6;color:${PEACH}">“</div><div style="font-size:25px;line-height:1.45;font-style:italic">En seis meses hemos bajado un tercio las bajas, y lo que más nos dice la gente es que por fin alguien les escucha.</div>`
            + `<div style="font-size:19px;color:${DIM};margin-top:16px">— Directora de personas de una empresa logística de 400 empleados</div>`, 810, 180, 400, 440, '#ffffff10', { color: SOFT, radius: 20 }), A('fade-left'))],
          notes: 'Líneas con dos series: nuestros clientes frente a la media de su sector durante el primer año. La cita es inventada, como las cifras.' },
        { title: 'Precio por persona, privacidad por diseño', layout: 'titleOnly', bg: SOFT, extra: [
          shape('rounded', 70, 160, 1140, 300, DEEP, { radius: 18 }),
          tableBlock({ x: 90, y: 175, w: 1100, h: 270, fontSize: 25, header: true, headBg: '#9b5de5', headFg: '#ffffff', stroke: '#4a3a70', banded: true, band: '#c8b6ff',
            rows: [['Plan', '€ por persona y mes', 'Personas', 'Total al mes'], ['Esencial: app y check-in', '4 €', '250', '=B2*C2'], ['Completo: con 6 sesiones al año', '9 €', '250', '=B3*C3'],
              ['Sin límite de sesiones', '15 €', '250', '=B4*C4']], colW: [4.5, 2.6, 1.8, 2.2] }),
          ...[['check', 'La empresa solo ve datos de grupos de 10 personas o más'], ['check', 'Nunca nombres, nunca respuestas sueltas'], ['check', 'Las psicólogas trabajan para Remanso, no para la empresa']].flatMap(([ic, t], i) => [
            icon(ic, 100, 480 + i * 56, 34, '#9b5de5'), text(t, 150, 478 + i * 56, 1000, 44, { fontSize: 25, color: DEEP })])],
          notes: 'Tabla con fórmulas: el total cambia al escribir el número de personas de cada cliente (=B2*C2). Precios de ejemplo. Insistir en la privacidad: es la primera pregunta de cualquier comité.' },
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          ...rings(1000, 360, 0.9), glow(700, 60, 600, '#5b3fa0', NIGHT, 40),
          kicker('LA RONDA', 90, 140, 500, MINT, 18),
          text('Buscamos 2 M€', 84, 180, 700, 110, { fontFamily: HF, fontSize: 84, fontWeight: 300, color: SOFT }),
          text('para llegar a 60 empresas y 25.000 personas en 2028', 90, 300, 640, 80, { fontSize: 26, color: DIM }),
          chartBlock({ x: 80, y: 380, w: 540, h: 300, chartType: 'pie', labelColor: SOFT,
            data: [{ label: 'Red de psicólogas', value: 45, color: LAV }, { label: 'Producto', value: 30, color: MINT }, { label: 'Ventas', value: 25, color: PEACH }] }),
          text('Lola Arnaiz, psicóloga y cofundadora · hola@remanso.example', 660, 600, 560, 70, { fontSize: 20, color: DIM, textAlign: 'right' })],
          notes: 'Gráfico circular con un color por porción y leyenda con porcentajes: el uso de los fondos. Cerrar con calma y abrir preguntas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Alpende: rural tourism with local hosts. Mountains at dusk, a postmark, postcards and a map with a road trip.
  biz_startup_rural: { name: 'Pitch turismo rural: Alpende', cat: 'biz',
    summary: 'Montañas al atardecer y postales: farol 3D, matasellos con texto curvo, mapa con coche 3D por la ruta, barras, tarta y nube de palabras', make: () => {
      const NAVY = '#0f2940', ORANGE = '#f2a65a', CORAL = '#e76f51', SAND = '#f4e3c3', PINE = '#2d6a4f', MIST = '#a8c5da', PAPER = '#fbf3e4', INK = '#2a2420';
      const HF = head('classic');
      return numbered(build({ name: 'Alpende · pueblos con anfitrión', palette: 'ocean', fonts: 'classic', title: { size: 46, color: INK } }, [
        { layout: 'blank', bg: NAVY, transition: 'fade', transitionSpeed: 'slow', extra: [
          pic(duskSVG(), 0, 0, 1280, 720, 'Montañas al atardecer con un pueblo pequeño al pie'),
          kicker('TURISMO RURAL · PITCH 2026', 90, 140, 600, SAND, 18),
          text('<i>Alpende</i>', 80, 170, 700, 170, { fontFamily: HF, fontSize: 130, color: SAND }),
          text('Escapadas a pueblos pequeños, con quien vive en ellos.', 90, 340, 560, 100, { fontSize: 30, lineHeight: 1.35, color: SAND }),
          ring(560, 470, 170, SAND, 2), ring(578, 488, 134, SAND, 1),
          text('CORREO RURAL · ALPENDE · 2026 · ', 560, 470, 170, 170, { fontSize: 15, curve: 100, color: SAND, textAlign: 'center', fontWeight: 700 }),
          text('PITCH', 560, 538, 170, 36, { fontFamily: HF, fontSize: 26, color: SAND, textAlign: 'center' }),
          m3d('kh-Lantern', 860, 150, 340, 480, { view: 'three', motion: 'float' })],
          notes: 'Alpende es una empresa inventada; las cifras son de ejemplo. El paisaje es un dibujo propio; el matasellos es texto curvo en círculo (Curvar texto ▸ Círculo). El farol 3D flota despacio.' },
        { title: 'Pueblos que se vacían', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 80, y: 170, w: 720, h: 470, chartType: 'line', color: CORAL, seriesName: 'Habitantes en pueblos de menos de 1.000 vecinos (millones)', grid: true, dataLabels: true,
            data: [['1960', 2.9], ['1970', 2.4], ['1981', 2.0], ['1991', 1.8], ['2001', 1.6], ['2011', 1.5], ['2021', 1.4]].map(([label, value]) => ({ label, value })) }),
          withAnims(stat('6 de cada 10', 'municipios tienen menos de 1.000 vecinos', 850, 190, 360, PINE, INK, 58), chain(0, 'fade-left')),
          withAnims(stat('Agosto', 'el único mes en que se llenan las casas rurales', 850, 400, 360, CORAL, INK, 58), chain(1, 'fade-left'))],
          notes: 'Línea con etiquetas de la población de los pueblos pequeños desde 1960. Cifras aproximadas y redondeadas para el ejemplo.' },
        { title: 'Tres experiencias de este otoño', layout: 'titleOnly', bg: '#efe4cc', extra: [
          ...[['#f6c28b', '#6b8f4e', '#fff1c1', 'Hacer queso con Pilar', 'Valdecuevas (Teruel) · 2 días', 'Desde 140 € por persona'],
            ['#9cc5e0', '#4c6a8a', '#ffffff', 'Esquilar con los Arnal', 'La Hoz (Soria) · 1 día', 'Desde 60 € por persona'],
            ['#f4a261', '#8a4f2f', '#ffe3b0', 'Castañas y filandón', 'Robledal de Arriba (León) · 3 días', 'Desde 210 € por persona']].map(([sky, hill, sun, t, pl, pr], i) =>
            withAnims(pic(postcardSVG(sky, hill, sun, t, pl, pr), 90 + i * 380, 175, 340, 420, `Postal: ${t}`, { rotation: [-3, 2, -2][i], shadow: { x: 4, y: 10, blur: 16, color: '#00000035' } }),
              chain(i, 'fade-up', i ? {} : { sound: 'whoosh' })))],
          notes: 'Cada experiencia es una postal (dibujo propio con su sello). Entran en cadena con un clic. Anfitriones y pueblos inventados.' },
        { title: 'Ruta piloto: Sierra de Valdecuevas', layout: 'titleOnly', bg: PAPER, extra: [
          pic(valleySVG, 90, 165, 1100, 480, 'Mapa del valle con la carretera y cinco pueblos'),
          ...ROAD.slice(1).map(([x, y], i) => withAnims(icon('location', 90 + x - 22, 165 + y - 56, 44, CORAL), A('bounce', { start: i ? 'afterPrev' : 'click', duration: 400, ...(i ? {} : { sound: 'pop' }) }))),
          withAnims(m3d('kh-ToyCar', 90 + ROAD[0][0] - 80, 165 + ROAD[0][1] - 60, 160, 120, { view: 'three' }),
            path(ROAD.slice(1).map(([x, y]) => [x - ROAD[0][0], y - ROAD[0][1]]), { start: 'click', duration: 5000 }))],
          notes: 'Primer clic: los cinco pueblos se marcan uno tras otro, rebotando. Segundo clic: el coche 3D recorre la ruta (trayectoria por la carretera del mapa). Mapa inventado.' },
        { layout: 'blank', bg: NAVY, extra: [
          text('Llenamos los meses vacíos', 80, 56, 1120, 70, { fontFamily: HF, fontSize: 46, color: SAND }),
          chartBlock({ x: 80, y: 150, w: 1120, h: 470, chartType: 'bar', color: MIST, seriesName: 'Casas rurales (media)', grid: true, yTitle: 'Ocupación (%)',
            data: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'].map((label, i) => ({ label, value: [18, 20, 26, 34, 30, 38, 62, 85, 40, 30, 22, 28][i] })),
            series: [{ name: 'Anfitriones de Alpende', values: [46, 48, 52, 58, 55, 60, 74, 88, 62, 57, 49, 55], color: ORANGE }] }),
          withAnims(text('Las experiencias dan motivos para ir en noviembre: <b>el doble de ocupación</b> fuera del verano.', 80, 630, 1120, 50, { fontSize: 25, color: SAND, textAlign: 'center' }), A('fade-up'))],
          notes: 'Barras agrupadas por mes con cuadrícula: ocupación media del sector frente a la de nuestros anfitriones. Datos de ejemplo.' },
        { title: 'Cada euro de una escapada', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 60, y: 170, w: 720, h: 400, chartType: 'pie', labelColor: INK,
            data: [{ label: 'Anfitriones', value: 70, color: PINE }, { label: 'Alpende', value: 18, color: CORAL }, { label: 'Pagos y seguros', value: 7, color: MIST }, { label: 'Fondo del pueblo', value: 5, color: ORANGE }] }),
          withAnims(card(`<div style="font-family:${HF};font-size:72px;color:#c4502f;line-height:1">5 %</div><div style="margin-top:12px">va a un fondo que decide el propio pueblo.</div>`
            + `<div style="font-size:21px;color:#6a5a4a;margin-top:12px;font-style:italic">Este año, Valdecuevas arregla su lavadero.</div>`, 820, 210, 380, 290, '#ffffff', { fontSize: 26, color: INK, radius: 8 }), A('fade-left'))],
          notes: 'Gráfico circular con un color por porción y leyenda con porcentajes. El fondo del pueblo es lo que más gusta a los ayuntamientos.' },
        { layout: 'blank', bg: NAVY, extra: [pollBlock({ kind: 'word', question: '¿Qué pueblo te ha marcado? Escribe su nombre', options: [], fontSize: 36, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Nube de palabras en directo: cada pueblo crece cuantas más personas lo escriben. Sirve para abrir conversación y, de paso, para elegir las próximas rutas.' },
        { layout: 'blank', bg: '#0b1a2b', transition: 'fade', transitionSpeed: 'slow', extra: [
          pic(duskSVG(true), 0, 0, 1280, 720, 'Las mismas montañas de noche, con luna y ventanas encendidas'),
          glow(820, 170, 380, '#ffcf70', '#0b1a2b', 30),
          m3d('kh-Lantern', 840, 160, 340, 460, { view: 'front', autoRotate: true }),
          text('<i>Buscamos 900.000 €</i>', 80, 170, 760, 110, { fontFamily: HF, fontSize: 76, color: SAND }),
          text('para llegar a 300 anfitriones en 12 comarcas antes de 2028.', 90, 290, 640, 90, { fontSize: 28, lineHeight: 1.35, color: MIST }),
          text('Marina Gállego y Óscar Lisbona · hola@alpende.example', 90, 420, 700, 40, { fontSize: 22, color: SAND }),
          credits(['kh-Lantern', 'kh-ToyCar'], 90, 660, 1100, MIST)],
          notes: 'El paisaje de la portada, ahora de noche, y el farol encendido girando despacio. Cerrar invitando a la primera ruta.' },
      ]));
    } },
  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Fogón: a robot cook for restaurants. Steel, kitchen tickets on the rail, fire lettering and white tiles.
  biz_startup_kitchen: { name: 'Pitch robótica de cocina: Fogón', cat: 'biz',
    summary: 'Cocina profesional: comandas en el riel, Text Art de fuego, robot 3D que entra andando y saluda, receta en código, cuenta atrás y embudo', make: () => {
      const STEEL = '#15171c', STEEL2 = '#2b2f36', FLAME = '#ff6b2c', AMBER = '#ffb02e', TICKET = '#fdfbf3', TINK = '#222222', RED = '#e63946', TILE = '#e9edf1', GREY = '#9aa3ad';
      const BB = head('bold'), robot = lib3d('three-RobotExpressive');
      const ticket = (html, x, y, w, h, rot = 0, props = {}) => card(html, x, y, w, h, TICKET, { fontFamily: MONO, fontSize: 18, lineHeight: 1.45, color: TINK, radius: 2, rotation: rot, pad: [16, 18, 16, 18],
        shadow: { x: 3, y: 8, blur: 12, color: '#00000060' }, ...props });
      const steelBg = () => shape('rect', 0, 0, 1280, 720, STEEL2, { fill2: '#0e0f12', gradAngle: 90 });
      const ttl = s => text(s, 80, 44, 1120, 80, { fontFamily: BB, fontSize: 64, color: TILE, letterSpacing: 2 });
      return numbered(build({ name: 'Fogón · robot de cocina', palette: 'midnight', fonts: 'bold', title: { size: 60, color: TILE, bold: false } }, [
        { layout: 'blank', bg: STEEL, transition: 'fade', extra: [steelBg(),
          shape('rect', 60, 66, 1160, 14, '#c9ced6', { fill2: '#6b737d', gradAngle: 90 }),
          ...[['MESA 4 · 21:42', '2× WOK DE POLLO', '1× ARROZ SALTEADO'], ['MESA 9 · 21:43', '3× PAD THAI', '!! SIN CACAHUETE'], ['BARRA · 21:44', '1× TERNERA AL WOK', '1× RAMEN']].map(([h, a, b], i) =>
            ticket(`<b>${h}</b><div style="border-top:2px dashed #999;margin:8px 0"></div>${a}<br>${b}`, 650 + i * 190, 84, 170, 170, [-3, 2, -1][i], { fontSize: 15 })),
          kicker('ROBÓTICA DE COCINA · PITCH SERIE A', 80, 250, 700, AMBER, 18),
          text('FOGÓN', 74, 290, 720, 220, { fontFamily: BB, fontSize: 210, wordart: 'fire', letterSpacing: 6 }),
          text('El cocinero robot para la línea caliente', 80, 520, 640, 50, { fontSize: 32, color: TILE }),
          text('Bilbao · noviembre de 2026', 80, 590, 640, 36, { fontSize: 20, color: GREY }),
          m3d('kh-PotOfCoals', 840, 330, 360, 340, { view: 'three', autoRotate: true })],
          notes: 'Fogón es una empresa inventada; todas las cifras son de ejemplo. Portada de cocina profesional: riel de acero con tres comandas, título con Text Art «Fuego» y un brasero 3D que gira.' },
        { layout: 'blank', bg: STEEL, extra: [steelBg(), ttl('La comanda que nadie puede servir'),
          ticket('<b style="font-size:24px">COMANDA #0001 · 21:47</b><div style="border-top:2px dashed #999;margin:12px 0"></div>', 330, 150, 620, 470),
          ...['1× 50.000 puestos de cocina sin cubrir en España', '1× 3 de cada 10 cocineros deja el oficio antes de dos años', '1× Picos de 90 minutos que desbordan la línea', '----------------------------------<br><b>TOTAL: platos tarde, fríos o que no salen</b>']
            .map((l, i) => withAnims(text(l, 360, 240 + i * 82, 560, 76, { fontFamily: MONO, fontSize: 21, lineHeight: 1.35, color: TINK }), chain(i, 'fade-down', { duration: 300, sound: 'click' }))),
          withAnims(text('URGENTE', 860, 470, 300, 90, { fontFamily: BB, fontSize: 64, color: RED, textAlign: 'center', borderColor: RED, radius: 8, rotation: -10 }), A('zoom-in', { start: 'click', sound: 'pop' }))],
          notes: 'Las líneas de la comanda se «imprimen» una tras otra con un clic de impresora. Otro clic: el sello de URGENTE. Cifras de ejemplo.' },
        { layout: 'blank', bg: '#c9d0d7', transition: 'slide', extra: [
          pic(tilesSVG, 0, 0, 1280, 720, 'Pared de azulejos blancos de cocina'), shape('rect', 0, 560, 1280, 160, '#8f99a3', { fill2: '#4a525b', gradAngle: 90 }),
          shape('rect', 0, 552, 1280, 10, '#dfe4ea'),
          withAnims(m3d('three-RobotExpressive', 40, 170, 300, 400, { walk: { clip: robot.walk, end: robot.arrive, endOnce: true, face: true, look: true } }),
            path([[180, 0], [360, 0]], { start: 'afterPrev', duration: 2600 })),
          card(`<div style="font-family:${BB};font-size:58px;color:${AMBER};line-height:1">FOGÓN F1</div><div style="font-size:19px;color:${GREY};margin:6px 0 14px">Ficha técnica</div>`
            + ul('2 brazos y 4 fuegos de inducción', '120 recetas cargadas', 'Un plato cada 90 segundos', 'Ocupa 1,8 m de línea', 'Se limpia solo en 6 minutos'), 760, 90, 440, 430, STEEL, { fontSize: 24, lineHeight: 1.4, color: TILE, radius: 14 })],
          notes: 'Al llegar, el robot 3D entra andando sobre la encimera y saluda al pararse (Modelo 3D ▸ Al moverse: andar; al llegar: saludar). La pared es un dibujo propio de azulejos.' },
        { layout: 'blank', bg: '#0e0f12', extra: [ttl('La receta es código'),
          codeBlock({ x: 80, y: 150, w: 680, h: 500, fontSize: 20, lang: 'yaml', lineSteps: '1-3|4-8|9-14',
            code: 'receta: pad_thai\nraciones: 1\ntiempo_total: 95s\ningredientes:\n  - fideos_arroz: 120g\n  - gambas: 80g\n  - salsa_tamarindo: 40ml\n  - huevo: 1\npasos:\n  - wok: {fuego: 4, aceite: 10ml, temp: 230}\n  - añadir: [huevo, gambas]\n  - saltear: 25s\n  - añadir: [fideos_arroz, salsa_tamarindo]\n  - emplatar: plato_hondo' }),
          ...[['El chef la escribe una vez', 'Desde una tableta, con sus cantidades y sus tiempos.', AMBER], ['Fogón la repite mil veces', 'Igual el lunes a mediodía que el sábado a las diez.', FLAME], ['Cada plato queda registrado', 'Alérgenos, temperatura y tiempo: listo para inspección.', '#9ece6a']].map(([h, d, c], i) =>
            withAnims(card(`<div style="font-size:26px;font-weight:700;color:${c}">${h}</div><div style="font-size:20px;color:${GREY};margin-top:6px">${d}</div>`, 800, 160 + i * 165, 400, 145, STEEL2, { radius: 12, pad: [18, 22, 18, 22] }), chain(i, 'fade-left')))],
          notes: 'Bloque de código con pasos de resaltado: cada clic ilumina una parte de la receta (datos, ingredientes, pasos). Después, las tres ideas a la derecha.' },
        { layout: 'blank', bg: STEEL, extra: [steelBg(), ttl('Un pad thai en 90 segundos'),
          timer(90, 80, 190, 460, { style: 'digital', color: AMBER, h: 170, auto: false, endText: '¡Al pase!' }),
          text('Pulsa la cuenta atrás: de la comanda al pase.', 80, 380, 460, 80, { fontSize: 24, color: GREY }),
          chartBlock({ x: 580, y: 160, w: 630, h: 480, chartType: 'bar', color: GREY, seriesName: 'Cocinero (s)', dataLabels: true,
            data: [{ label: 'Pad thai', value: 240 }, { label: 'Arroz salteado', value: 210 }, { label: 'Wok de pollo', value: 200 }, { label: 'Ramen', value: 300 }],
            series: [{ name: 'Fogón (s)', values: [95, 90, 85, 120], color: FLAME }] })],
          notes: 'Cuenta atrás digital de 90 segundos que se pone en marcha con un clic (no empieza sola). Al lado, segundos por plato en hora punta: cocinero frente a Fogón. Mediciones de ejemplo.' },
        { layout: 'blank', bg: '#1f2228', extra: [ttl('Las cuentas de un restaurante medio'),
          tableBlock({ x: 80, y: 170, w: 700, h: 380, fontSize: 25, header: true, headBg: FLAME, headFg: '#ffffff', stroke: '#ffffff25', banded: true, band: AMBER,
            rows: [['Al mes', 'Importe'], ['Alquiler de Fogón (con mantenimiento)', '−2.900 €'], ['Horas extra que se evitan', '2.100 €'], ['Menos producto tirado', '950 €'],
              ['Platos extra en hora punta', '1.800 €'], ['<b>Balance mensual</b>', '=SUMA(ARRIBA)']], colW: [4, 1.7] }),
          withAnims(stat('×1,7', 'lo que devuelve cada euro de alquiler', 840, 190, 360, AMBER, TILE, 90), A('fade-left')),
          withAnims(text('Sin inversión inicial: alquiler a 36 meses, instalación en una noche y sin obra.', 840, 420, 360, 140, { fontSize: 24, lineHeight: 1.4, color: GREY }), A('fade-left', { start: 'afterPrev' }))],
          notes: 'El balance es una fórmula (=SUMA(ARRIBA)): si el restaurante tiene otras cifras, se cambian en directo. Importes de ejemplo.' },
        { layout: 'blank', bg: STEEL, extra: [steelBg(), ttl('Clientes que ya lo han probado'),
          chartBlock({ x: 130, y: 160, w: 520, h: 470, chartType: 'funnel', color: FLAME,
            data: [{ label: 'Demostraciones', value: 140 }, { label: 'Pilotos de un mes', value: 32 }, { label: 'Contratos firmados', value: 11 }] }),
          ...[['«El sábado sacamos 60 woks más y nadie se quemó las manos.»', 'Jefa de cocina · restaurante asiático, Bilbao', -2], ['«Lo que más me gusta: el plato 300 sale igual que el primero.»', 'Chef propietario · cadena de 4 locales, Vitoria', 2]].map(([q, who, r], i) =>
            withAnims(ticket(`<div style="font-size:21px">${q}</div><div style="border-top:2px dashed #999;margin:12px 0 8px"></div><div style="font-size:15px;color:#666">${who}</div>`, 700, 170 + i * 230, 500, 200, r), chain(i, 'fade-down', { sound: 'click' })))],
          notes: 'Embudo comercial: de cada cuatro demostraciones sale un piloto y uno de cada tres pilotos firma. Las opiniones son comandas pegadas; son inventadas.' },
        { layout: 'blank', bg: STEEL, transition: 'zoom', extra: [steelBg(),
          kicker('LA RONDA', 80, 150, 500, AMBER, 18),
          text('BUSCAMOS 3 M€', 74, 190, 720, 140, { fontFamily: BB, fontSize: 110, color: TILE, letterSpacing: 4 }),
          text('para fabricar 60 unidades y abrir Madrid y Barcelona en 2027.', 80, 360, 620, 90, { fontSize: 28, lineHeight: 1.35, color: GREY }),
          text('Ane Zubiri y Mikel Ortuzar · hola@fogon.example', 80, 480, 620, 40, { fontSize: 22, color: AMBER }),
          m3d('three-RobotExpressive', 800, 110, 380, 500, { clip: 'ThumbsUp', bleed: true }),
          credits(['three-RobotExpressive', 'kh-PotOfCoals'], 80, 660, 1120, GREY)],
          notes: 'Cierre: el robot levanta el pulgar. Personas inventadas. Dejar la diapositiva durante las preguntas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Abrigo: insurance by the day for the self-employed. Grey rain and one yellow umbrella.
  biz_startup_insurance: { name: 'Pitch seguros: cobertura por días', cat: 'biz',
    summary: 'Lluvia gris y paraguas amarillo: pictograma en cadena, app con interruptor, ecuación del precio, tabla con fórmulas, cronología y votación', make: () => {
      const SLATE = '#3a4048', CHAR = '#1f2328', FOG = '#eef0f2', MID = '#8a939e', YEL = '#ffd23f', DYEL = '#d9a400', W = '#ffffff';
      const HF = head('websafe');
      const rain = (n, skip = () => false, color = W, op = 22) => Array.from({ length: n }, (_, i) => [(i * 137) % 1260 + 10, (i * 89) % 640 + 20]).filter(([x, y]) => !skip(x, y))
        .map(([x, y]) => shape('rect', x, y, 2, 38, color, { opacity: op, rotation: 14 }));
      const umbrella = (x, y, w, c, handle, props = {}) => [shape('custom', x, y, w, w * 0.55, c, { path: UMBRELLA, ...props }),
        stroke('M50 0 V 80 C 50 96, 30 96, 30 84', x + w / 2 - w * 0.08, y + w * 0.29, w * 0.16, w * 0.6, handle, 6)];
      return numbered(build({ name: 'Abrigo · seguro por días', palette: 'grayscale', fonts: 'websafe', title: { size: 44, color: CHAR } }, [
        { layout: 'blank', bg: SLATE, transition: 'fade', extra: [
          ...rain(90, (x, y) => x > 740 && x < 1200 && y > 130),
          ...umbrella(780, 150, 400, YEL, '#d9dde2').map((b, i) => withAnims(b, A(i ? 'fade-in' : 'zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: 300, ...(i ? {} : { sound: 'whoosh' }) }))),
          kicker('INSURTECH · PITCH SEMILLA 2026', 80, 170, 640, YEL, 18),
          text('Abrigo', 74, 205, 640, 160, { fontFamily: HF, fontSize: 130, color: W }),
          text('El seguro que solo se enciende los días que trabajas.', 80, 380, 600, 100, { fontSize: 28, lineHeight: 1.4, color: FOG }),
          text('Para autónomos con trabajo por días: fotografía, reformas, guías, eventos.', 80, 520, 600, 70, { fontSize: 19, lineHeight: 1.4, color: '#c3c8ce' })],
          notes: 'Abrigo es una empresa inventada; todas las cifras son de ejemplo. Paleta en escala de grises con un solo color: el amarillo del paraguas, que se abre con un silbido al llegar.' },
        { title: 'Seis de cada diez, a la intemperie', layout: 'titleOnly', bg: FOG, extra: [
          ...Array.from({ length: 10 }, (_, i) => withAnims(icon('user', 90 + i * 110, 210, 90, i < 6 ? MID : DYEL), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 180 }))),
          withAnims(stat('6 de cada 10', 'autónomos no tiene seguro de accidentes ni de baja', 90, 390, 520, CHAR, '#444', 64), A('fade-up', { start: 'afterPrev' })),
          withAnims(text(`<b>¿Por qué?</b> Los seguros se pagan doce meses, pero la mitad de los encargos son por días. Para muchos no compensa… hasta que pasa algo.`, 680, 400, 520, 220, { fontSize: 25, lineHeight: 1.45, color: CHAR }), A('fade-up', { start: 'click' }))],
          notes: 'Pictograma: diez personas que aparecen en cadena, seis en gris (sin seguro). Clic: la explicación. Cifras de ejemplo.' },
        { title: 'Un interruptor, no una póliza', layout: 'titleOnly', bg: W, extra: [
          pic(abrigoApp, 130, 140, 260, 520, 'La app de Abrigo con el interruptor del día encendido', { device: 'phone' }),
          ...[['Elige qué cubrir', 'Accidentes, baja, daños a clientes o robo del material.'], ['Enciende el día', 'Con un toque, o solo al llegar a la obra o al evento.'], ['Si pasa algo, parte en 2 minutos', 'Fotos, ubicación y un formulario corto. Nada de llamadas.']].flatMap(([h, d], i) => [
            withAnims(shape('ellipse', 480, 175 + i * 160, 80, 80, YEL), chain(i, 'zoom-in')),
            withAnims(text(String(i + 1), 480, 190 + i * 160, 80, 50, { fontFamily: HF, fontSize: 40, color: CHAR, textAlign: 'center' }), A('zoom-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-family:${HF};font-size:30px;color:${CHAR}">${h}</div><div style="font-size:20px;color:#555;margin-top:6px">${d}</div>`, 590, 172 + i * 160, 610, 110, {}), A('fade-left', { start: 'withPrev' }))])],
          notes: 'La app en un móvil, con el gran interruptor amarillo. Tres pasos que entran en cadena con un clic.' },
        { layout: 'blank', bg: CHAR, extra: [
          text('Un precio justo, día a día', 80, 50, 1120, 70, { fontFamily: HF, fontSize: 44, color: W }),
          mathBlock({ x: 80, y: 135, w: 1120, h: 100, fontSize: 46, color: YEL, latex: 'P_{\\text{mes}} = d \\times \\left(b + r \\cdot k\\right)' }),
          text('<b>d</b> días encendidos · <b>b</b> precio base del día · <b>r</b> riesgo de la profesión · <b>k</b> coberturas elegidas', 80, 245, 1120, 40, { fontSize: 21, color: '#c3c8ce', textAlign: 'center' }),
          shape('rounded', 80, 310, 1120, 320, FOG, { radius: 16 }),
          tableBlock({ x: 110, y: 330, w: 1060, h: 280, fontSize: 25, header: true, headBg: CHAR, headFg: YEL, stroke: '#c9ced4', banded: true, band: MID,
            rows: [['Perfil', 'Días al mes', 'Precio del día', 'Total al mes'], ['Fotógrafa de bodas', '9', '2,40 €', '=B2*C2'], ['Fontanero', '21', '1,90 €', '=B3*C3'], ['Guía de montaña', '14', '2,10 €', '=B4*C4']], colW: [3.4, 2, 2.2, 2.2] })],
          notes: 'Ecuación del precio (LaTeX) y tabla con fórmulas: el total es días × precio del día. Precios de ejemplo; el precio del día sale de la fórmula de arriba.' },
        { title: 'Lo que paga cada uno al año (€)', layout: 'titleOnly', bg: W, extra: [
          chartBlock({ x: 80, y: 165, w: 760, h: 480, chartType: 'bar', color: MID, seriesName: 'Seguro anual tradicional', dataLabels: true, grid: true,
            data: [{ label: 'Fotógrafa', value: 540 }, { label: 'Fontanero', value: 610 }, { label: 'Guía', value: 560 }],
            series: [{ name: 'Abrigo', values: [259, 479, 353], color: DYEL }] }),
          withAnims(stat('−42 %', 'de media, y cubiertos justo los días que hace falta', 880, 190, 330, '#8f6b00', CHAR, 64, { h: 210 }), A('fade-left')),
          withAnims(stat('4 min', 'para contratar, desde el móvil', 880, 440, 330, CHAR, '#555', 64), A('fade-left', { start: 'afterPrev' }))],
          notes: 'Barras agrupadas con etiquetas: coste anual de un seguro tradicional frente a Abrigo para los tres perfiles de la tabla anterior (12 meses).' },
        { title: 'Del parte al pago, en 48 horas', layout: 'titleOnly', bg: FOG, extra: [
          dg('timeline', 'Minuto 0\n  Parte desde el móvil\nHora 2\n  Revisión automática\nHora 24\n  Perito, solo si hace falta\nHora 48\n  El dinero, en tu cuenta', 80, 170, 1120, 420, { oneByOne: true, colors: 'accent' })],
          notes: 'Cronología, un hito por clic. El 70 % de los partes pequeños se resuelve sin perito (dato de ejemplo).' },
        { layout: 'blank', bg: FOG, extra: [pollBlock({ question: '¿Qué cobertura por días echas más en falta?', options: ['Baja por enfermedad', 'Accidentes en el trabajo', 'Daños a clientes', 'Robo del material'],
          fontSize: 34, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación en directo. Nos sirve para decidir la próxima cobertura que lanzamos.' },
        { layout: 'blank', bg: YEL, transition: 'fade', extra: [
          ...umbrella(820, 150, 340, CHAR, CHAR).map((b, i) => withAnims(b, A(i ? 'fade-in' : 'bounce', { start: i ? 'withPrev' : 'afterPrev', duration: 700 }))),
          kicker('LA RONDA', 80, 170, 500, CHAR, 18),
          text('Buscamos 1,8 M€', 74, 215, 740, 110, { fontFamily: HF, fontSize: 76, color: CHAR }),
          text('para lanzar en toda España en 2027, de la mano de una aseguradora socia que pone el capital de riesgo.', 80, 340, 660, 120, { fontSize: 26, lineHeight: 1.4, color: CHAR }),
          shape('rect', 82, 490, 120, 5, CHAR),
          text('Carmen Lluch y David Sanz · hola@abrigo.example', 80, 515, 700, 40, { fontSize: 22, color: CHAR })],
          notes: 'Cierre a todo color: el amarillo del paraguas llena la diapositiva y el paraguas cae rebotando. Personas inventadas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Tejado Común: community energy. A street of roofs with panels from dawn to night; the sun crosses the sky.
  biz_startup_energy: { name: 'Pitch energía: comunidad solar', cat: 'biz',
    summary: 'Tejados del amanecer a la noche: sol que sale y cruza el cielo por un arco, diagrama radial, áreas por horas, ecuación y tabla con fórmulas', make: () => {
      const NB = '#101317', DAWN = '#1d2b53', SUN = '#ffb000', SUNL = '#ffd56b', GREEN = '#4caf7d', SKYL = '#9ad1ff', W = '#f5f7fa', DIM = '#9aa5b1';
      const HF = head('tech');
      const ttl = (s, c = W) => text(s, 80, 50, 1120, 70, { fontFamily: HF, fontSize: 44, fontWeight: 700, color: c });
      const arcPts = Array.from({ length: 8 }, (_, k) => { const t = (k + 1) / 8 * Math.PI; return [Math.round(440 * (1 - Math.cos(t))), Math.round(-308 * Math.sin(t))]; });
      return numbered(build({ name: 'Tejado Común · energía de barrio', palette: 'revela', fonts: 'tech', title: { size: 44, color: W } }, [
        { layout: 'blank', bg: DAWN, transition: 'fade', transitionSpeed: 'slow', extra: [
          shape('rect', 0, 0, 1280, 720, DAWN, { fill2: '#e07a5f', gradAngle: 90 }),
          withAnims(shape('ellipse', 830, 360, 250, 250, SUNL, { fill2: SUN, gradType: 'radial' }), path([[0, -150]], { start: 'afterPrev', duration: 3000 })),
          pic(roofsSVG(), 0, 420, 1280, 300, 'Una calle de tejados, varios con placas solares'),
          kicker('ENERGÍA COMUNITARIA · PITCH 2026', 80, 110, 700, SUNL, 18),
          text('Tejado Común', 74, 140, 900, 120, { fontFamily: HF, fontSize: 96, fontWeight: 700, color: W }),
          text('Comunidades energéticas de barrio: el sol de un tejado, para toda la calle.', 80, 270, 640, 100, { fontSize: 28, lineHeight: 1.4, color: '#ffe7d1' })],
          notes: 'Tejado Común es una empresa inventada; las cifras son de ejemplo. Al llegar, el sol sale despacio por detrás de los tejados (trayectoria hacia arriba). La calle es un dibujo propio.' },
        { layout: 'blank', bg: NB, extra: [
          shape('arc', 140, 120, 1000, 700, 'none', { stroke: DIM, strokeWidth: 2, dash: 'dash' }),
          pic(roofsSVG(true), 0, 470, 1280, 250, 'La misma calle de noche'),
          withAnims(glow(165, 435, 70, SUN, NB, 100), path(arcPts, { start: 'click', duration: 4500 })),
          text('El sol sale para todos…', 80, 40, 1120, 60, { fontFamily: HF, fontSize: 40, fontWeight: 700, color: SUNL, textAlign: 'center' }),
          withAnims(text('…pero solo 1 de cada 10 tejados de la ciudad produce energía.', 140, 640, 1000, 50, { fontSize: 28, fontWeight: 700, color: W, textAlign: 'center', bg: '#101317cc', radius: 10 }), A('fade-up', { start: 'afterPrev', sound: 'chime' }))],
          notes: 'Clic: el sol recorre el cielo por un arco (trayectoria de varios puntos) y, al ponerse, aparece la frase con una campanilla. Dato de ejemplo.' },
        { layout: 'blank', bg: NB, extra: [ttl('Un tejado grande, muchos vecinos'),
          dg('radial', 'Tejado del colegio\n  40 hogares\n  Mercado\n  Panadería\n  Taller de bicis\n  Centro de mayores', 80, 140, 640, 540),
          ...[['El tejado produce', 'Placas en el colegio o el mercado, que tienen sitio de sobra.', SUN], ['Los vecinos comparten', 'Cualquiera a menos de 2 km se apunta, sin obra en casa.', GREEN], ['Lo que sobra se vende', 'Y lo que se gana baja la cuota de todos.', SKYL]].map(([h, d, c], i) =>
            withAnims(text(`<div style="font-size:28px;font-weight:700;color:${c}">${h}</div><div style="font-size:21px;color:${DIM};margin-top:6px">${d}</div>`, 760, 180 + i * 150, 440, 130, {}), chain(i, 'fade-left')))],
          notes: 'Diagrama radial: el tejado en el centro y quien comparte su energía alrededor. A la derecha, el funcionamiento en tres ideas que entran en cadena.' },
        { layout: 'blank', bg: DAWN, extra: [ttl('Un día de junio en la calle Almendro'),
          chartBlock({ x: 80, y: 140, w: 1120, h: 500, chartType: 'area', color: SUN, seriesName: 'Producción solar (kW)', grid: true, xTitle: 'Hora del día',
            data: ['6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h'].map((label, i) => ({ label, value: [0, 60, 180, 260, 280, 230, 120, 20, 0][i] })),
            series: [{ name: 'Consumo de la comunidad (kW)', values: [40, 90, 110, 120, 130, 110, 150, 190, 120], color: SKYL }] }),
          text('A mediodía sobra energía: se guarda en una batería común y se vende el resto.', 80, 650, 1120, 40, { fontSize: 22, color: '#c8d3e6', textAlign: 'center' })],
          notes: 'Áreas con dos series y cuadrícula: producción de las placas frente al consumo de la comunidad, hora a hora. Datos de ejemplo.' },
        { layout: 'blank', bg: NB, extra: [ttl('Cuánto ahorra un hogar'),
          mathBlock({ x: 80, y: 140, w: 1120, h: 90, fontSize: 42, color: SUNL, latex: 'A = E_c\\,(p_r - p_c) + E_x\\,p_x - C' }),
          text('<b>E<sub>c</sub></b> energía compartida · <b>p<sub>r</sub></b> precio de la red · <b>p<sub>c</sub></b> precio de la comunidad · <b>E<sub>x</sub></b> excedentes · <b>C</b> cuota', 80, 235, 1120, 40, { fontSize: 20, color: DIM, textAlign: 'center' }),
          tableBlock({ x: 80, y: 300, w: 1120, h: 290, fontSize: 25, header: true, headBg: SUN, headFg: NB, stroke: '#ffffff25', banded: true, band: SUN,
            rows: [['Concepto (un hogar, al año)', 'kWh', '€ por kWh', '€ al año'], ['Energía compartida (0,22 − 0,08)', '1.150', '0,14', '=B2*C2'], ['Excedentes vendidos', '300', '0,05', '=B3*C3'],
              ['Cuota de la comunidad', '', '', '−60'], ['<b>Ahorro por hogar</b>', '', '', '=SUMA(ARRIBA)']], colW: [4.6, 1.6, 1.8, 1.8] }),
          withAnims(text('≈ 26 % menos en la factura de la luz', 80, 610, 1120, 50, { fontSize: 30, fontWeight: 700, color: GREEN, textAlign: 'center' }), A('zoom-in', { sound: 'chime' }))],
          notes: 'La ecuación (LaTeX) explica de dónde sale el ahorro; la tabla lo calcula con fórmulas (=B2*C2 y =SUMA(ARRIBA)). Precios de ejemplo.' },
        { layout: 'blank', bg: DAWN, extra: [
          shape('rect', 0, 0, 1280, 720, DAWN, { fill2: '#3d5a99', gradAngle: 90 }), pic(roofsSVG(), 0, 470, 1280, 250, 'La calle de tejados de día'),
          ttl('Lo que llevamos encendido'),
          ...[['312', 'hogares en 4 comunidades', SUNL], ['1,4 GWh', 'producidos al año', W], ['480 t', 'de CO₂ que no se emiten', GREEN]].map(([n, l, c], i) =>
            withAnims(stat(n, l, 80 + i * 380, 170, 360, c, '#e3e9f5', 72, { textAlign: 'center' }), chain(i, 'zoom-in', { sound: 'pop' })))],
          notes: 'Tres cifras grandes que entran una tras otra con un «pop». Datos de ejemplo.' },
        { layout: 'blank', bg: NB, extra: [pollBlock({ question: '¿Qué tejado del barrio encendemos primero?', display: 'pie', options: ['El colegio', 'El mercado municipal', 'El polideportivo', 'La biblioteca'],
          fontSize: 34, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación en directo con resultado en tarta: así eligen los vecinos en nuestras reuniones de barrio.' },
        { layout: 'blank', bg: NB, transition: 'fade', transitionSpeed: 'slow', extra: [
          pic(roofsSVG(true), 0, 420, 1280, 300, 'La calle de noche, con las ventanas encendidas'),
          shape('moon', 1060, 70, 90, 90, SUNL, { rotation: 20 }),
          kicker('LA RONDA', 80, 120, 500, SUN, 18),
          text('Buscamos 1,5 M€', 74, 150, 900, 110, { fontFamily: HF, fontSize: 88, fontWeight: 700, color: W }),
          text('Capital y deuda verde para 40 tejados más en 2027.', 80, 270, 800, 50, { fontSize: 28, color: '#c8d3e6' }),
          text('Irene Pastor y Samuel Okafor · hola@tejadocomun.example', 80, 340, 800, 40, { fontSize: 22, color: SUNL })],
          notes: 'Cierre de noche: las ventanas encendidas con la energía del día. Personas inventadas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Hocico: fresh dog food by subscription. Playful stickers, paw prints and a fox that walks across.
  biz_startup_pets: { name: 'Pitch mascotas: comida fresca', cat: 'biz',
    summary: 'Estilo pegatina con huellas que aparecen en cadena, zorro 3D que cruza andando, fórmula de la ración en una tabla, dona y concurso', make: () => {
      const CREAMY = '#fff6e9', TEAL = '#13867c', CORAL = '#d94f2b', BROWN = '#5a3e2b', SKYP = '#bfe9ff', PINKP = '#ffb4c6', MUSTP = '#ffc94d', W = '#ffffff';
      const HF = head('friendly'), fox = lib3d('kh-Fox');
      const trail = (n, x0, y0, dx, c, size = 54) => Array.from({ length: n }, (_, i) => paw(x0 + i * dx, y0 + (i % 2) * 34, size, c)
        .map((b, k) => withAnims(b, A('fade-in', { start: k ? 'withPrev' : 'afterPrev', duration: 200, ...(i === 0 && k === 0 ? { sound: 'pop' } : {}) })))).flat();
      return numbered(build({ name: 'Hocico · comida fresca para perros', palette: 'office', fonts: 'friendly', title: { size: 44, color: BROWN } }, [
        { layout: 'blank', bg: CREAMY, transition: 'fade', extra: [
          shape('ellipse', 700, 70, 600, 600, TEAL), shape('ellipse', 1120, 40, 120, 120, MUSTP),
          m3d('kh-Fox', 740, 150, 520, 460, { view: 'side', autoRotate: false }),
          kicker('MASCOTAS · PITCH SEMILLA 2026', 80, 150, 600, CORAL, 18),
          text('Hocico', 74, 185, 640, 170, { fontFamily: HF, fontSize: 140, fontWeight: 800, color: BROWN }),
          text('Comida fresca para perros, cocinada cada semana y a su medida.', 80, 360, 560, 100, { fontSize: 28, lineHeight: 1.4, color: BROWN }),
          shape('seal', 540, 120, 140, 140, CORAL, { rotation: 12 }), text('¡Recién<br>hecha!', 540, 158, 140, 70, { fontFamily: HF, fontSize: 22, fontWeight: 800, color: W, textAlign: 'center', rotation: 12 }),
          ...trail(6, 80, 540, 100, '#d9b99b')],
          notes: 'Hocico es una empresa inventada; todas las cifras son de ejemplo. Al llegar, unas huellas cruzan la portada en cadena (la primera con un «pop»). El zorro 3D hace de mascota de la marca.' },
        { layout: 'blank', bg: TEAL, extra: [
          text('Uno de cada dos', 80, 150, 800, 110, { fontFamily: HF, fontSize: 80, fontWeight: 800, color: W, lineHeight: 1.05 }),
          text('perros en España tiene sobrepeso.', 80, 270, 700, 60, { fontSize: 36, color: W }),
          withAnims(text('Y el pienso de siempre lleva hasta un <b>40 % de cereales y harinas</b>, y una ración «estándar» que no tiene en cuenta ni su peso ni su vida.', 80, 380, 640, 160, { fontSize: 27, lineHeight: 1.45, color: '#e6fffb' }), A('fade-up')),
          shape('custom', 840, 360, 340, 180, CORAL, { path: 'M2 20 H98 L86 96 H14 Z' }), shape('rect', 820, 340, 380, 30, '#e8603f', { radius: 15 }),
          ...Array.from({ length: 11 }, (_, i) => withAnims(shape('ellipse', 860 + (i * 31) % 300, 300 + (i % 3) * 14, 34, 28, '#b07a4f'), A('bounce', { start: i ? 'withPrev' : 'click', duration: 500, delay: i * 60 }))),
          text('PIENSO', 840, 420, 340, 60, { fontFamily: HF, fontSize: 40, fontWeight: 800, color: W, textAlign: 'center' })],
          notes: 'Un clic: la explicación; otro clic: las bolitas de pienso caen rebotando en el cuenco (forma propia). Cifras orientativas, de ejemplo.' },
        { title: 'Cada ración, calculada para tu perro', layout: 'titleOnly', bg: CREAMY, extra: [
          mathBlock({ x: 80, y: 160, w: 1120, h: 90, fontSize: 44, color: BROWN, latex: '\\text{kcal al día} = 70 \\times \\text{peso}^{0{,}75} \\times f' }),
          text('<b>f</b>: factor de actividad (1,2 tranquilo · 1,4 normal · 1,6 muy activo)', 80, 255, 1120, 40, { fontSize: 22, color: '#8a6d55', textAlign: 'center' }),
          tableBlock({ x: 140, y: 320, w: 1000, h: 250, fontSize: 26, header: true, headBg: CORAL, headFg: W, stroke: '#f0d9c4', banded: true, band: MUSTP,
            rows: [['Perro', 'Peso (kg)', 'Factor f', 'kcal al día'], ['Lupa, galga', '24', '1,6', '=REDONDEAR(70*B2^0,75*C2;0)'], ['Toby, bodeguero', '8', '1,4', '=REDONDEAR(70*B3^0,75*C3;0)'],
              ['Nala, mastina', '55', '1,2', '=REDONDEAR(70*B4^0,75*C4;0)']], colW: [3, 2, 2, 2] }),
          ...paw(1150, 600, 50, PINKP), ...paw(80, 600, 50, SKYP)],
          notes: 'La fórmula de las necesidades energéticas (en LaTeX) y la misma fórmula dentro de la tabla: =REDONDEAR(70*B2^0,75*C2;0). Cambiar el peso de un perro y ver cómo se recalcula. Orientativo, no sustituye al veterinario.' },
        { title: 'Tres recetas, cero misterios', layout: 'titleOnly', bg: W, extra: [
          text('<b>Pollo con calabaza</b> · la más pedida', 80, 160, 640, 40, { fontSize: 26, color: BROWN }),
          chartBlock({ x: 80, y: 220, w: 340, h: 340, chartType: 'doughnut', legend: false,
            data: [{ label: 'Pollo', value: 60, color: CORAL }, { label: 'Calabaza', value: 15, color: MUSTP }, { label: 'Arroz integral', value: 12, color: '#d9b99b' }, { label: 'Zanahoria', value: 8, color: '#ff9f43' }, { label: 'Aceite de salmón y minerales', value: 5, color: TEAL }] }),
          text([['Pollo', 60, CORAL], ['Calabaza', 15, MUSTP], ['Arroz integral', 12, '#d9b99b'], ['Zanahoria', 8, '#ff9f43'], ['Aceite de salmón y minerales', 5, TEAL]]
            .map(([l, v, c]) => `<div style="margin-bottom:12px"><span style="display:inline-block;width:18px;height:18px;border-radius:9px;background:${c};vertical-align:-2px;margin-right:10px"></span><b>${v} %</b> ${l}</div>`).join(''),
            450, 250, 320, 300, { fontSize: 21, lineHeight: 1.3, color: BROWN }),
          ...[['Ternera con boniato', '72 % carne · 1.320 kcal/kg', '2,90 € al día*', PINKP], ['Salmón con guisantes', '64 % pescado · 1.180 kcal/kg', '3,20 € al día*', SKYP]].map(([h, d, p, c], i) =>
            withAnims(card(`<div style="font-family:${HF};font-size:28px;font-weight:800">${h}</div><div style="font-size:20px;margin:6px 0 10px">${d}</div><div style="font-size:24px;font-weight:800">${p}</div>`,
              800, 170 + i * 220, 400, 190, c, { color: BROWN, radius: 26 }), chain(i, 'fade-left'))),
          text('* para un perro de 15 kg', 800, 610, 400, 30, { fontSize: 18, color: '#8a6d55' })],
          notes: 'Gráfico de dona con un color por ingrediente y su porcentaje en la leyenda. Las otras dos recetas entran en cadena. Composición y precios de ejemplo.' },
        { layout: 'blank', bg: SKYP, extra: [
          shape('rect', 0, 590, 1280, 130, '#8fd18a'), shape('rect', 0, 585, 1280, 12, '#6cbf66'),
          text('Lupa, nuestra jefa de cata', 80, 60, 1120, 80, { fontFamily: HF, fontSize: 52, fontWeight: 800, color: BROWN }),
          text('Cada receta pasa por 40 perros catadores antes de salir a la venta. Si no se acaba el cuenco, no sale.', 80, 150, 900, 90, { fontSize: 27, lineHeight: 1.4, color: BROWN }),
          withAnims(m3d('kh-Fox', 20, 240, 420, 380, { walk: { clip: fox.walk, face: true } }), path([[400, 0], [800, 0]], { duration: 4200 }))],
          notes: 'Clic: el zorro 3D (nuestra «Lupa») cruza la diapositiva andando por una trayectoria, con su animación de andar. Lupa es la mascota de la marca; los catadores, de ejemplo.' },
        { title: 'Tracción: nueve meses', layout: 'titleOnly', bg: W, extra: [
          chartBlock({ x: 80, y: 165, w: 760, h: 480, chartType: 'bar', color: TEAL, seriesName: 'Suscriptores (miles)', dataLabels: true,
            data: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep'].map((label, i) => ({ label, value: [0.8, 1.2, 1.7, 2.3, 3.0, 3.9, 4.6, 5.8, 7.1][i] })) }),
          withAnims(stat('81 %', 'siguen suscritos a los seis meses', 890, 190, 320, CORAL, BROWN, 80), chain(0, 'fade-left')),
          withAnims(stat('34 €', 'de pedido medio a la semana', 890, 400, 320, TEAL, BROWN, 80), chain(1, 'fade-left'))],
          notes: 'Columnas con etiquetas: suscriptores activos de enero a septiembre de 2026. Las dos cifras clave entran en cadena. Datos de ejemplo.' },
        { layout: 'blank', bg: CREAMY, extra: [pollBlock({ kind: 'quiz', question: '¿Cuál de estos alimentos es tóxico para los perros?', options: ['Zanahoria', 'Chocolate', 'Arroz cocido', 'Calabaza'], correct: [1], time: 15,
          fontSize: 40, x: 60, y: 40, w: 1160, h: 640 })],
          notes: 'Concurso con 15 segundos desde el móvil. Respuesta: el chocolate (por la teobromina). Las otras tres están en nuestras recetas.' },
        { layout: 'blank', bg: CORAL, transition: 'zoom', extra: [
          shape('ellipse', 760, 110, 500, 500, '#ff946f'),
          m3d('kh-Fox', 780, 150, 460, 420, { view: 'three', autoRotate: true }),
          kicker('LA RONDA', 80, 160, 500, W, 18),
          text('Buscamos 1 M€', 74, 205, 720, 110, { fontFamily: HF, fontSize: 80, fontWeight: 800, color: W }),
          text('para abrir cocina en Madrid y entregar en 24 h en toda la península.', 80, 330, 620, 100, { fontSize: 28, lineHeight: 1.4, color: '#fff1ea' }),
          text('Paula Riera y Nico Ferrer · guau@hocico.example', 80, 460, 640, 40, { fontSize: 23, fontWeight: 700, color: W }),
          ...trail(5, 80, 540, 110, '#ffd2c2', 40),
          credits(['kh-Fox'], 80, 670, 1120, '#fff1ea')],
          notes: 'Cierre: el zorro gira despacio sobre su círculo y las huellas vuelven a cruzar. Personas inventadas.' },
      ]));
    } },
  // @@END
};
