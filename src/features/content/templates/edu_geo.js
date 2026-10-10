// Example presentations: Geografía física y humana para el aula. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Ten topics, each with its own look: a watercolour field notebook (rivers), a weather
// station on graph paper (climographs), an orienteering map (topographic maps), a bold census poster (population
// pyramids), dunes at sunset (deserts), a city at night from above (cities), a lighthouse and a tide table (coasts),
// a vintage alpine poster (mountains), an airport departures board (time zones) and a children's jigsaw atlas
// (continents and oceans).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const deco = (src, x, y, w, h, alt, props = {}) => img(src, x, y, w, h, alt, { fit: 'fill', decorative: true, ...props });
// The same object on two slides (Transform): give it a fixed id.
const keep = (b, id) => ({ ...b, id });
// Click-by-click and chained animations, shorter to write.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A stroke through points on the slide (a river, a route): an ink object, so it can be drawn as you present.
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// Points relative to the first one (for path()).
const rel = pts => pts.map(([x, y]) => [Math.round(x - pts[0][0]), Math.round(y - pts[0][1])]).slice(1);
// A smooth line through points (Catmull-Rom): sampled points, and the same curve as SVG path data.
const smooth = (pts, n = 8) => { const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  out.push(pts.at(-1)); return out; };
const curveD = pts => pts.map((p, i) => { if (!i) return `M${p[0]} ${p[1]}`; const a = pts[i - 2] || pts[i - 1], b = pts[i - 1], c = pts[i + 1] || p, f = n => n.toFixed(1);
  return ` C${f(b[0] + (p[0] - a[0]) / 6)} ${f(b[1] + (p[1] - a[1]) / 6)} ${f(p[0] - (c[0] - b[0]) / 6)} ${f(p[1] - (c[1] - b[1]) / 6)} ${p[0]} ${p[1]}`; }).join('');
const move = (pts, dx, dy, k = 1) => pts.map(([x, y]) => [x * k + dx, y * k + dy]);
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A round numbered badge.
const badge = (n, x, y, d, bg, fg = '#ffffff', props = {}) => text(String(n), x, y, d, d, { fontSize: Math.round(d * 0.5), fontWeight: 800, color: fg, bg, radius: d / 2, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], ...props });
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 40, x: 60, y: 50, w: 1160, h: 620, ...props });
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:6px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 80), { fontSize: 24, color: fg, ...props });
// The credits of the 3D models of a deck, in one small line.
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// A small deterministic random (the same drawing every time).
const rnd = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const series = (labels, values) => labels.map((label, i) => ({ label, value: values[i] }));
// Font stacks for a look of their own (handwriting, a departures board).
const HAND = "'Caveat', cursive", MONO = "'JetBrains Mono', monospace";

// ---- Drawings ---------------------------------------------------------------------
// 1 · A river in watercolour: mountains, hills, a tributary, two meanders and a delta (760 × 560).
const RIVER = [[640, 58], [626, 100], [598, 134], [610, 172], [576, 206], [528, 234], [500, 262], [506, 296], [462, 322], [400, 330], [330, 315], [276, 340], [262, 390],
  [290, 430], [350, 440], [392, 470], [380, 510], [320, 526], [250, 512], [190, 514], [130, 522], [88, 524]];
const TRIB = [[372, 132], [392, 184], [446, 222], [500, 258]];
const WASH = '<filter id="w" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="10"/></filter>';
const LANDSCAPE = (paper = '#f6f1e4') => svgURL(760, 560, `<defs>${WASH}</defs><rect width="760" height="560" fill="${paper}"/>`
  + '<g filter="url(#w)">'
  + '<path d="M20 330 Q200 250 380 290 T760 280 V560 H20Z" fill="#cfe0a8" opacity=".75"/>'
  + '<path d="M0 420 Q240 360 480 420 T760 400 V560 H0Z" fill="#b7d38c" opacity=".7"/>'
  + '<path d="M300 210 Q420 150 540 200 T760 190 V300 H300Z" fill="#9dbf72" opacity=".7"/>'
  + '<path d="M430 190 L520 60 L585 140 L655 18 L720 110 L760 70 V220 H430Z" fill="#9a8b78" opacity=".85"/>'
  + '<path d="M500 82 L520 60 L540 86 L528 80 L516 92Z M636 44 L655 18 L676 48 L664 42 L652 56 L642 46Z M708 92 L720 110 L728 98 L740 84 L760 70 V96 L744 100Z" fill="#ffffff"/>'
  + '<path d="M0 470 C50 480 95 510 130 560 H0Z" fill="#7fb6d8" opacity=".85"/>'
  + '<path d="M70 512 Q92 506 108 526 Q96 548 70 552 Q52 536 70 512Z" fill="#e8d6a0"/>'
  + '</g>'
  + Array.from({ length: 9 }, (_, i) => `<path d="M${16 + i * 13} ${500 + (i % 3) * 16} q6 -4 12 0" stroke="#4f8db7" stroke-width="2" fill="none" opacity=".6"/>`).join('')
  + Array.from({ length: 14 }, (_, i) => { const r = rnd(5 + i); const x = 120 + r() * 600, y = 250 + r() * 200; return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(6 + r() * 7).toFixed(0)}" fill="#5f8f3e" opacity=".55"/>`; }).join('')
  + `<path d="${curveD(TRIB)}" stroke="#2f7fb5" stroke-width="3" fill="none" stroke-linecap="round"/>`
  + `<path d="${curveD(RIVER.slice(0, 8))}" stroke="#2f7fb5" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
  + `<path d="${curveD(RIVER.slice(7, 15))}" stroke="#2f7fb5" stroke-width="6" fill="none" stroke-linecap="round"/>`
  + `<path d="${curveD(RIVER.slice(14))}" stroke="#2f7fb5" stroke-width="9" fill="none" stroke-linecap="round"/>`
  + '<path d="M90 524 L64 540 M90 524 L78 552 M90 524 L98 548" stroke="#2f7fb5" stroke-width="3" stroke-linecap="round"/>'
  + '<path d="M262 396 Q246 392 254 372 M392 476 Q408 486 398 500" stroke="#e8d6a0" stroke-width="7" fill="none" stroke-linecap="round"/>');
// The long profile of a river: steep, then gentle, then almost flat (1100 × 240).
const PROFILE = svgURL(1100, 240, `<defs>${WASH}</defs>`
  + `<path filter="url(#w)" d="M0 240 V30 ${Array.from({ length: 23 }, (_, i) => { const x = i * 50; return `L${x} ${(222 - 192 * Math.exp(-x / 260)).toFixed(1)}`; }).join(' ')} L1100 222 V240Z" fill="#d9c7a3" opacity=".85"/>`
  + `<path d="M0 30 ${Array.from({ length: 23 }, (_, i) => { const x = i * 50; return `L${x} ${(222 - 192 * Math.exp(-x / 260)).toFixed(1)}`; }).join(' ')}" stroke="#2f7fb5" stroke-width="6" fill="none" stroke-linecap="round"/>`
  + '<path d="M360 0 V240 M740 0 V240" stroke="#2b3a2e" stroke-width="2" stroke-dasharray="6 8" opacity=".5"/>');
const DROP = svgURL(200, 260, `<defs>${WASH}</defs><path filter="url(#w)" d="M100 10 C150 90 190 140 190 175 A90 90 0 0 1 10 175 C10 140 50 90 100 10Z" fill="#7fb6d8" opacity=".85"/><path d="M60 170 Q62 130 92 110" stroke="#ffffff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/>`);

// 2 · A weather station: millimetre graph paper, a thermometer and a rain gauge.
const MM = (w, h, c = '#bcd8c8') => svgURL(w, h, Array.from({ length: Math.ceil(w / 10) + 1 }, (_, i) => `<path d="M${i * 10} 0 V${h}" stroke="${c}" stroke-width="${i % 5 ? 0.5 : 1.1}" opacity="${i % 5 ? 0.6 : 0.9}"/>`).join('')
  + Array.from({ length: Math.ceil(h / 10) + 1 }, (_, i) => `<path d="M0 ${i * 10} H${w}" stroke="${c}" stroke-width="${i % 5 ? 0.5 : 1.1}" opacity="${i % 5 ? 0.6 : 0.9}"/>`).join(''));
const THERMO = svgURL(160, 560, '<rect x="50" y="10" width="60" height="460" rx="30" fill="#ffffff" stroke="#1d2b36" stroke-width="5"/><circle cx="80" cy="490" r="58" fill="#ffffff" stroke="#1d2b36" stroke-width="5"/>'
  + '<circle cx="80" cy="490" r="44" fill="#d6452f"/><rect x="68" y="380" width="24" height="120" fill="#d6452f"/>'
  + Array.from({ length: 21 }, (_, i) => `<path d="M${i % 5 ? 112 : 104} ${440 - i * 20} H126" stroke="#1d2b36" stroke-width="${i % 5 ? 2 : 3}"/>`).join('')
  + [0, 10, 20, 30, 40].map((t, i) => `<text x="132" y="${446 - i * 100}" font-family="Space Grotesk,sans-serif" font-size="18" fill="#1d2b36">${t}</text>`).join(''));
const MERCURY = svgURL(24, 300, '<rect width="24" height="300" rx="12" fill="#d6452f"/>');
const GAUGE = svgURL(200, 300, '<path d="M20 20 H180 L130 90 H70Z" fill="#e8eef3" stroke="#1d2b36" stroke-width="4"/><rect x="60" y="90" width="80" height="200" rx="8" fill="#ffffff" stroke="#1d2b36" stroke-width="4"/>'
  + '<rect x="64" y="200" width="72" height="86" rx="4" fill="#2f74c0" opacity=".75"/>' + Array.from({ length: 9 }, (_, i) => `<path d="M140 ${280 - i * 20} h-14" stroke="#1d2b36" stroke-width="2"/>`).join('')
  + '<text x="100" y="160" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-size="22" font-weight="700" fill="#1d2b36">mm</text>');

// 3 · An orienteering map: brown contour lines round two hills, a lake, paths, the course in magenta.
const HILLS = [[430, 330, 250, 170, 1.0], [930, 300, 200, 140, 0.8]];
const CONTOURS = (w = 1280, h = 720, faint = false) => svgURL(w, h, `<rect width="${w}" height="${h}" fill="#fbf7ee"/>`
  + `<path d="M0 ${h * 0.76} Q${w * 0.3} ${h * 0.66} ${w * 0.55} ${h * 0.8} T${w} ${h * 0.72} V${h} H0Z" fill="#cfe8b8" opacity=".7"/>`
  + `<ellipse cx="${w * 0.6}" cy="${h * 0.14}" rx="110" ry="54" fill="#7cc3ea" stroke="#2b7fbf" stroke-width="2"/>`
  + HILLS.map(([cx, cy, rx, ry, a], k) => Array.from({ length: 9 }, (_, i) => { const s = 1 - i * 0.105, r = rnd(31 + k * 7 + i);
    const ph = r() * 6, pts = Array.from({ length: 40 }, (_, j) => { const t = j / 40 * Math.PI * 2, wob = 1 + 0.08 * Math.sin(3 * t + ph) + 0.05 * Math.sin(5 * t + ph * 2);
      return [cx + Math.cos(t) * rx * s * wob + i * 9 * a, cy + Math.sin(t) * ry * s * wob - i * 4]; });
    return `<path d="${curveD([...pts, pts[0]])}Z" fill="none" stroke="#b06a2c" stroke-width="${i % 5 === 0 ? 3 : 1.6}" opacity="${faint ? 0.45 : 0.9}"/>`; }).join('')).join('')
  + `<path d="M0 ${h * 0.55} C${w * 0.2} ${h * 0.5} ${w * 0.35} ${h * 0.95} ${w * 0.6} ${h * 0.9} S${w * 0.9} ${h * 0.6} ${w} ${h * 0.62}" stroke="#1f1f1f" stroke-width="2.5" stroke-dasharray="10 7" fill="none" opacity="${faint ? 0.4 : 0.8}"/>`
  + `<path d="M${w * 0.6} ${h * 0.21} C${w * 0.54} ${h * 0.4} ${w * 0.62} ${h * 0.5} ${w * 0.58} ${h}" stroke="#2b7fbf" stroke-width="3" fill="none" opacity="${faint ? 0.5 : 1}"/>`);
const FLAG = svgURL(120, 120, '<rect x="6" y="6" width="108" height="108" fill="#ffffff" stroke="#c4561e" stroke-width="4"/><path d="M6 6 L114 114 L6 114Z" fill="#f07c22"/>');
const SCALEBAR = svgURL(640, 90, Array.from({ length: 4 }, (_, i) => `<rect x="${20 + i * 150}" y="30" width="150" height="20" fill="${i % 2 ? '#ffffff' : '#1f1f1f'}" stroke="#1f1f1f" stroke-width="2"/>`).join('')
  + ['0', '250 m', '500 m', '750 m', '1 km'].map((t, i) => `<text x="${20 + i * 150}" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="18" fill="#1f1f1f">${t}</text>`).join('')
  + '<text x="20" y="20" font-family="Inter,sans-serif" font-size="16" fill="#6b5a48">1 : 25 000  ·  ▬ = 1 cm</text>');
const SYMBOLS = svgURL(900, 520, '<rect width="900" height="520" fill="#fbf7ee"/>'
  + [0, 1, 2, 3, 4, 5].map(i => `<path d="M60 ${80 + i * 40} C260 ${40 + i * 44} 460 ${120 + i * 30} 700 ${70 + i * 40}" stroke="#b06a2c" stroke-width="${i === 3 ? 3 : 1.6}" fill="none"/>`).join('')
  + '<path d="M120 500 C220 400 320 380 420 300 S620 200 840 230" stroke="#2b7fbf" stroke-width="4" fill="none"/><rect x="560" y="330" width="250" height="140" rx="30" fill="#7fc97f" opacity=".75"/>'
  + '<path d="M40 420 C200 460 330 470 520 430" stroke="#1f1f1f" stroke-width="3" stroke-dasharray="10 7" fill="none"/>'
  + '<path d="M740 70 L770 120 H710Z" fill="none" stroke="#1f1f1f" stroke-width="3"/><circle cx="740" cy="104" r="5" fill="#1f1f1f"/>');

// 4 · Population pyramids: ten-year age groups, % of the population by sex.
const AGES = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80+'];
const PYR = {
  young: [[14, 11, 9, 6.5, 4.5, 2.5, 1.5, 0.7, 0.3], [13.5, 10.8, 9, 6.7, 4.7, 2.7, 1.6, 0.8, 0.4]],
  steady: [[6.5, 6.5, 6.4, 6.3, 6.2, 6, 5.3, 4, 2.8], [6.2, 6.2, 6.2, 6.2, 6.2, 6.1, 5.6, 4.6, 3.6]],
  old: [[4.3, 4.8, 5.3, 6.5, 7.6, 7.4, 6.2, 4.6, 3.2], [4.1, 4.5, 5.1, 6.3, 7.5, 7.5, 6.6, 5.3, 4.9]],
};

// 5 · The desert at sunset: dunes in layers, a caravan, an oasis in cross-section.
const DUNES = (c = ['#c9853f', '#a5612b', '#7d4320', '#e9b872']) => svgURL(1280, 340, `<path d="M0 120 Q160 40 340 110 T700 90 T1060 70 T1280 100 V340 H0Z" fill="${c[0]}"/>`
  + `<path d="M0 190 Q220 110 460 180 T900 160 T1280 170 V340 H0Z" fill="${c[1]}"/>`
  + `<path d="M0 260 Q260 200 560 250 T1280 240 V340 H0Z" fill="${c[2]}"/>`
  + `<path d="M340 110 Q420 150 460 180" stroke="${c[3]}" stroke-width="3" fill="none" opacity=".7"/><path d="M700 90 Q780 120 900 160" stroke="${c[3]}" stroke-width="3" fill="none" opacity=".6"/>`);
const STARS = (w, h, n, seed = 3) => { const r = rnd(seed); return svgURL(w, h, Array.from({ length: n }, () => `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#ffffff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`).join('')); };
const CAMEL = svgURL(130, 90, '<path d="M14 40 Q10 20 24 16 Q34 14 34 28 Q40 18 52 22 Q58 8 74 10 Q92 12 96 34 Q104 32 108 22 Q112 12 122 16 L126 24 Q118 24 116 34 Q110 50 96 50 L94 86 H88 L86 54 H48 L44 86 H38 L36 52 Q20 50 14 40Z" fill="#3b1c14"/>');
const OASIS = svgURL(1000, 440, '<rect width="1000" height="440" fill="#f6d7a7"/><rect y="0" width="1000" height="150" fill="#fbe9c8"/>'
  + '<path d="M0 150 Q160 80 330 140 Q500 175 640 140 Q820 80 1000 150 V250 H0Z" fill="#e2a65a"/>'
  + '<path d="M0 250 H1000 V340 H0Z" fill="#c98b4a"/><path d="M0 250 H1000 V340 H0Z" fill="#4f9fd6" opacity=".45"/>'
  + '<path d="M0 340 H1000 V440 H0Z" fill="#6b4a32"/>' + Array.from({ length: 20 }, (_, i) => `<path d="M${i * 52} 372 l26 14 l26 -14" stroke="#4d3423" stroke-width="3" fill="none"/>`).join('')
  + '<path d="M430 150 Q500 128 570 150 L560 166 H440Z" fill="#4f9fd6"/>'
  + [[400, 150], [610, 150], [470, 140]].map(([x, y]) => `<path d="M${x} ${y} q6 -60 -4 -110" stroke="#6b4a32" stroke-width="9" fill="none"/>`
    + [[-50, 10], [40, 6], [-30, -18], [30, -22], [0, -28]].map(([dx, dy]) => `<path d="M${x - 4} ${y - 110} q${dx / 2} ${dy - 16} ${dx} ${dy + 14}" stroke="#2f6b34" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')).join('')
  + '<rect x="720" y="110" width="40" height="190" fill="#8a6a4a"/><rect x="712" y="104" width="56" height="14" fill="#5a4030"/><rect x="734" y="118" width="12" height="170" fill="#2f6aa0" opacity=".6"/>');

// 6 · A city at night from above: dark blocks, glowing streets, lights; and three kinds of street plan.
const CITYNIGHT = (() => { const r = rnd(17); let s = '<rect width="1280" height="720" fill="#3a2a12"/>';
  for (let gx = 0; gx < 22; gx++) for (let gy = 0; gy < 13; gy++) { const x = gx * 60 - 10, y = gy * 60 - 14;
    const park = (gx === 14 && gy === 4) || (gx === 15 && gy === 4) || (gx === 6 && gy === 9);
    s += `<rect x="${x + 5}" y="${y + 5}" width="50" height="50" rx="3" fill="${park ? '#13261c' : '#111726'}"/>`;
    if (!park) for (let k = 0; k < 3; k++) if (r() > 0.45) s += `<rect x="${(x + 10 + r() * 36).toFixed(0)}" y="${(y + 10 + r() * 36).toFixed(0)}" width="3" height="3" fill="${r() > 0.7 ? '#ffffff' : '#ffd38a'}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`; }
  s += '<path d="M-20 520 C200 470 360 600 620 560 S1000 380 1300 430" stroke="#0a1220" stroke-width="54" fill="none"/><path d="M-20 520 C200 470 360 600 620 560 S1000 380 1300 430" stroke="#1b2c4a" stroke-width="40" fill="none"/>';
  s += '<path d="M0 312 H1280 M760 0 V720" stroke="#ffb547" stroke-width="6" opacity=".55"/>';
  for (let i = 0; i < 160; i++) s += `<circle cx="${(Math.round(r() * 21) * 60 - 10 + (r() > 0.5 ? 0 : 30)).toFixed(0)}" cy="${(Math.round(r() * 12) * 60 - 14 + (r() > 0.5 ? 30 : 0)).toFixed(0)}" r="${(1.5 + r() * 2).toFixed(1)}" fill="#ffcf7a" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  return svgURL(1280, 720, s); })();
const PLAN = kind => { const r = rnd(kind.length * 13), st = '#ffcf7a', bl = '#1d2540'; let s = `<rect width="360" height="300" rx="14" fill="#141a2e"/>`;
  if (kind === 'irregular') { for (let i = 0; i < 26; i++) { const x = 20 + r() * 300, y = 20 + r() * 240, w = 30 + r() * 40, h = 24 + r() * 36;
      s += `<path d="M${x} ${y} l${w} ${r() * 10 - 5} l${r() * 10 - 5} ${h} l${-w} ${r() * 10 - 5}Z" fill="${bl}" stroke="${st}" stroke-width="2" transform="rotate(${(r() * 40 - 20).toFixed(0)} ${x} ${y})"/>`; }
    s += `<path d="M30 260 C90 200 120 220 170 150 S250 90 330 60" stroke="${st}" stroke-width="5" fill="none"/>`; }
  if (kind === 'grid') { for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) s += `<path d="M${30 + i * 52} ${28 + j * 52} h36 l8 8 v28 l-8 8 h-36 l-8 -8 v-28Z" fill="${bl}" stroke="${st}" stroke-width="2"/>`;
    s += `<path d="M20 290 L340 20" stroke="${st}" stroke-width="5"/>`; }
  if (kind === 'radial') { s += [40, 80, 120].map(rr => `<circle cx="180" cy="150" r="${rr}" fill="none" stroke="${st}" stroke-width="4"/>`).join('')
      + Array.from({ length: 8 }, (_, i) => `<path d="M180 150 L${(180 + 175 * Math.cos(i * Math.PI / 4)).toFixed(0)} ${(150 + 175 * Math.sin(i * Math.PI / 4)).toFixed(0)}" stroke="${st}" stroke-width="3"/>`).join('')
      + `<circle cx="180" cy="150" r="20" fill="${st}"/>`; }
  return svgURL(360, 300, s); };

// 7 · A lighthouse on a cliff, its beam, a coast with all its shapes and a cliff that the sea wears away.
const LIGHTHOUSE = svgURL(300, 560, '<path d="M0 560 L0 470 Q40 430 90 440 L110 420 Q160 400 210 430 L260 420 Q300 430 300 470 V560Z" fill="#1d2a36"/>'
  + '<path d="M110 420 L124 130 H176 L190 420Z" fill="#f4f1ea"/>' + [0, 1, 2].map(i => { const y0 = 170 + i * 84, y1 = y0 + 42, k = t => 124 - (t - 130) * 14 / 290;
    return `<path d="M${k(y0).toFixed(1)} ${y0} H${(300 - k(y0)).toFixed(1)} L${(300 - k(y1)).toFixed(1)} ${y1} H${k(y1).toFixed(1)}Z" fill="#d64541"/>`; }).join('')
  + '<rect x="112" y="118" width="76" height="14" fill="#1d2a36"/><rect x="128" y="76" width="44" height="44" fill="#fff3b0"/><path d="M122 76 L150 48 L178 76Z" fill="#d64541"/><path d="M128 76 V120 M150 76 V120 M172 76 V120" stroke="#1d2a36" stroke-width="3"/>'
  + '<rect x="138" y="360" width="24" height="40" rx="12" fill="#1d2a36"/>');
const BEAM = svgURL(1000, 1000, '<defs><linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#fff3b0" stop-opacity=".75"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient><linearGradient id="l" x1="1" x2="0"><stop offset="0" stop-color="#fff3b0" stop-opacity=".75"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient></defs>'
  + '<path d="M500 500 L1000 410 V590Z" fill="url(#r)"/><path d="M500 500 L0 410 V590Z" fill="url(#l)"/>');
const COAST = (labels = false) => svgURL(1100, 480, '<rect width="1100" height="480" rx="16" fill="#2f6f9f"/>'
  + Array.from({ length: 16 }, (_, i) => `<path d="M${40 + (i * 157) % 1020} ${30 + (i * 71) % 260} q10 -6 20 0 t20 0" stroke="#5c96c2" stroke-width="2.5" fill="none"/>`).join('')
  + '<g fill="#d9c79a" stroke="#6b5a3a" stroke-width="2.5"><path d="M0 480 L0 330 L280 330 C300 440 540 440 560 330 L610 322 L650 200 L690 322 L760 330 C770 420 900 420 905 330 L1100 322 V480Z"/>'
  + '<rect x="92" y="226" width="24" height="108"/><ellipse cx="104" cy="160" rx="92" ry="75"/><ellipse cx="880" cy="140" rx="72" ry="40"/></g>'
  + '<rect x="94" y="330" width="20" height="6" fill="#d9c79a"/>'
  + '<path d="M0 480 L0 380 Q200 360 280 400 Q420 470 560 400 L700 380 Q800 460 905 400 L1100 390 V480Z" fill="#9fbf7a" opacity=".8"/><ellipse cx="104" cy="170" rx="60" ry="40" fill="#9fbf7a" opacity=".8"/>'
  + '<path d="M300 382 C340 432 500 432 540 382" stroke="#f3e2b0" stroke-width="12" fill="none" stroke-linecap="round"/>'
  + '<path d="M905 330 L1100 322" stroke="#6b5a3a" stroke-width="9"/>' + Array.from({ length: 10 }, (_, i) => `<path d="M${915 + i * 18} 336 l6 14" stroke="#6b5a3a" stroke-width="2"/>`).join('')
  + (labels ? '<g font-family="Lato,sans-serif" font-size="20" font-weight="700" fill="#0f2940" text-anchor="middle"><text x="104" y="165">Península</text><text x="880" y="146">Isla</text></g>' : ''));
const CLIFF = stage => svgURL(340, 300, '<rect width="340" height="300" rx="14" fill="#14466b"/><path d="M0 220 H340 V300 H0Z" fill="#2f6f9f"/>'
  + '<path d="M0 60 H200 L210 90 L196 130 L214 170 L206 220 H0Z" fill="#8a7a66"/><path d="M0 60 H200 L196 70 H0Z" fill="#7fa65a"/>'
  + (stage === 0 ? '<path d="M206 220 Q178 214 176 186 Q186 168 212 170Z" fill="#14466b"/>' : '')
  + (stage === 1 ? '<path d="M200 60 H290 L296 100 L284 140 L300 220 H262 Q258 170 230 166 Q212 170 206 220Z" fill="#8a7a66"/><path d="M200 60 H290 L288 70 H200Z" fill="#7fa65a"/>' : '')
  + (stage === 2 ? '<path d="M262 220 L270 130 L286 110 L298 140 L302 220Z" fill="#8a7a66"/><path d="M216 218 l10 -14 l14 6 l8 8Z" fill="#6f6252"/>' : '')
  + Array.from({ length: 5 }, (_, i) => `<path d="M${20 + i * 64} 236 q12 -8 24 0 t24 0" stroke="#e9f3f8" stroke-width="3" fill="none"/>`).join(''));
const LIFEBUOY = svgURL(400, 400, '<circle cx="200" cy="200" r="150" fill="none" stroke="#f4f1ea" stroke-width="80"/>'
  + [0, 1, 2, 3].map(i => `<path d="M${(200 + 150 * Math.cos(i * Math.PI / 2 - 0.3)).toFixed(1)} ${(200 + 150 * Math.sin(i * Math.PI / 2 - 0.3)).toFixed(1)} A150 150 0 0 1 ${(200 + 150 * Math.cos(i * Math.PI / 2 + 0.3)).toFixed(1)} ${(200 + 150 * Math.sin(i * Math.PI / 2 + 0.3)).toFixed(1)}" stroke="#d64541" stroke-width="80" fill="none"/>`).join('')
  + '<circle cx="200" cy="200" r="190" fill="none" stroke="#1d2a36" stroke-width="3" opacity=".4"/><circle cx="200" cy="200" r="110" fill="none" stroke="#1d2a36" stroke-width="3" opacity=".4"/>');

// 8 · A vintage alpine poster: flat layers of mountains, snow, pines and a dawn sky.
const POSTER = (w = 1280, h = 720) => svgURL(w, h, '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc7d9"/><stop offset="1" stop-color="#f2e3c4"/></linearGradient></defs>'
  + `<rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.78}" cy="${h * 0.3}" r="70" fill="#f6d36b"/>`
  + `<path d="M0 ${h * 0.62} L${w * 0.12} ${h * 0.42} L${w * 0.22} ${h * 0.52} L${w * 0.38} ${h * 0.3} L${w * 0.5} ${h * 0.46} L${w * 0.62} ${h * 0.36} L${w * 0.78} ${h * 0.5} L${w * 0.9} ${h * 0.4} L${w} ${h * 0.5} V${h} H0Z" fill="#7f9cb5"/>`
  + `<path d="M${w * 0.3} ${h * 0.75} L${w * 0.55} ${h * 0.2} L${w * 0.72} ${h * 0.55} L${w * 0.82} ${h * 0.45} L${w} ${h * 0.7} V${h} H${w * 0.3}Z" fill="#3d5a73"/>`
  + `<path d="M${w * 0.55} ${h * 0.2} L${w * 0.6} ${h * 0.31} L${w * 0.57} ${h * 0.29} L${w * 0.55} ${h * 0.33} L${w * 0.52} ${h * 0.28} L${w * 0.5} ${h * 0.31}Z" fill="#fbfaf5"/>`
  + `<path d="M0 ${h * 0.8} Q${w * 0.25} ${h * 0.66} ${w * 0.5} ${h * 0.78} T${w} ${h * 0.76} V${h} H0Z" fill="#2f4f3a"/>`
  + Array.from({ length: 18 }, (_, i) => { const x = 30 + i * 72, y = h * 0.8 + (i % 3) * 8; return `<path d="M${x} ${y} l18 -56 l18 56Z" fill="#203a2a"/>`; }).join(''));
const MOUNTAIN = svgURL(1000, 420, '<rect width="1000" height="420" fill="#eef3f6"/><path d="M0 400 L120 330 L300 60 L420 220 L470 190 L520 220 L640 110 L800 300 L870 350 L1000 360 V420 H0Z" fill="#58799a"/>'
  + '<path d="M300 60 L338 116 L318 108 L300 128 L282 104 L262 116Z M640 110 L672 152 L652 146 L640 160 L626 146 L610 152Z" fill="#fbfaf5"/>'
  + '<path d="M0 400 L120 330 L200 372 L320 350 L470 370 L600 345 L800 380 L1000 360 V420 H0Z" fill="#2f4f3a"/>'
  + '<path d="M800 300 Q860 400 960 360" stroke="#4f9fd6" stroke-width="6" fill="none"/>');
const RIDGE = svgURL(1280, 720, '<rect width="1280" height="720" fill="#f2e3c4"/><path d="M0 700 L140 650 L340 560 L520 470 L700 360 L860 250 L980 170 L1040 150 L1120 200 L1280 300 V720 H0Z" fill="#58799a"/>'
  + '<path d="M980 170 L1040 150 L1100 186 L1060 182 L1036 200 L1012 186Z" fill="#fbfaf5"/><path d="M0 720 V700 L140 650 L340 560 L420 600 L200 720Z" fill="#2f4f3a"/>'
  + '<path d="M1040 150 V96" stroke="#1d2a36" stroke-width="4"/><path d="M1040 96 L1084 110 L1040 124Z" fill="#c8432b"/>');

// 9 · Time zones: a globe of meridians and the world in 24 bands.
const GLOBE = svgURL(360, 360, '<circle cx="180" cy="180" r="170" fill="#1f4f8a"/>' + [40, 85, 130].map(r => `<ellipse cx="180" cy="180" rx="${r}" ry="170" fill="none" stroke="#ffcf3f" stroke-width="2" opacity=".6"/>`).join('')
  + [-120, -60, 0, 60, 120].map(y => `<path d="M${(180 - Math.sqrt(170 * 170 - y * y)).toFixed(1)} ${180 + y} H${(180 + Math.sqrt(170 * 170 - y * y)).toFixed(1)}" stroke="#ffcf3f" stroke-width="2" opacity=".6"/>`).join('')
  + '<path d="M110 120 q30 -30 60 -10 q20 30 -10 50 q-40 10 -50 -40Z M190 200 q40 -10 50 30 q-10 40 -40 30 q-20 -30 -10 -60Z" fill="#4caf7d" opacity=".9"/><path d="M180 10 V350" stroke="#ffffff" stroke-width="3"/>');
const BANDS = svgURL(1152, 360, Array.from({ length: 24 }, (_, i) => `<rect x="${i * 48}" y="0" width="48" height="360" fill="${i % 2 ? '#1a2230' : '#222c3d'}"/>`).join('')
  + Array.from({ length: 24 }, (_, i) => { const o = i - 11; return `<text x="${i * 48 + 24}" y="30" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="15" fill="${o === 0 ? '#ffcf3f' : '#8a96a8'}">${o > 0 ? '+' + o : o === 0 ? '0' : '−' + -o}</text>`; }).join('')
  + '<path d="M552 44 V360" stroke="#ffcf3f" stroke-width="3"/><path d="M1146 44 V360" stroke="#f7768e" stroke-width="3" stroke-dasharray="8 6"/>'
  + '<g fill="#3a4a62"><path d="M60 80 Q160 60 250 110 L230 190 L180 210 L150 170 L90 140Z"/><path d="M200 220 L260 230 L250 330 L220 330Z"/><path d="M520 80 L620 70 L640 120 L600 150 L540 140Z"/><path d="M540 160 L640 160 L650 260 L600 320 L560 230Z"/><path d="M640 60 L960 60 L980 140 L880 200 L780 170 L680 150Z"/><path d="M900 250 L1000 240 L1010 300 L930 310Z"/></g>');

// 10 · A children's atlas: each continent its own colour (and its own picture, so they can pop in one by one).
const WG = (lon, lat) => [Math.round((lon + 180) / 360 * 1100), Math.round((84 - lat) / 168 * 520)];
const CONTINENTS = [
  ['América del Norte', '#ff7b54', [[[-168, 66], [-140, 70], [-95, 74], [-80, 72], [-62, 60], [-55, 50], [-70, 43], [-76, 35], [-81, 25], [-97, 18], [-90, 15], [-83, 9], [-78, 8], [-88, 14], [-105, 20], [-117, 32], [-124, 40], [-125, 50], [-135, 58], [-150, 60], [-165, 60]],
    [[-55, 82], [-25, 80], [-20, 70], [-44, 60], [-55, 68]]], [-100, 48]],
  ['América del Sur', '#ffc93c', [[[-80, 10], [-72, 12], [-60, 8], [-50, 0], [-35, -6], [-40, -22], [-50, -30], [-58, -38], [-65, -42], [-68, -55], [-74, -50], [-72, -30], [-71, -18], [-80, -5], [-78, 2]]], [-60, -15]],
  ['Europa', '#8e7dff', [[[-10, 36], [-9, 44], [-2, 48], [-5, 50], [5, 53], [8, 57], [5, 62], [15, 69], [28, 71], [40, 67], [60, 68], [60, 45], [48, 42], [40, 41], [28, 41], [26, 38], [22, 37], [15, 38], [12, 42], [8, 44], [3, 43], [0, 39], [-5, 36]],
    [[-8, 58], [-3, 59], [0, 52], [-5, 50], [-6, 54]]], [22, 54]],
  ['África', '#3ec98e', [[[-17, 15], [-17, 21], [-10, 30], [-5, 36], [10, 37], [11, 33], [20, 31], [32, 31], [35, 28], [43, 12], [51, 12], [42, -2], [40, -15], [35, -25], [28, -33], [20, -35], [15, -28], [12, -17], [13, -5], [9, 4], [-5, 5], [-12, 8]],
    [[44, -16], [50, -14], [48, -25], [44, -24]]], [20, 5]],
  ['Asia', '#ff5d8f', [[[60, 68], [70, 73], [100, 78], [140, 72], [180, 68], [180, 62], [160, 58], [140, 52], [135, 40], [122, 30], [120, 22], [108, 18], [105, 8], [100, 2], [98, 15], [92, 22], [88, 22], [80, 10], [77, 8], [72, 20], [66, 25], [57, 25], [50, 30], [48, 30], [56, 24], [52, 16], [43, 13], [35, 28], [35, 36], [40, 41], [48, 42], [60, 45]],
    [[130, 32], [142, 36], [145, 44], [140, 42]], [[95, 5], [105, -6], [120, -8], [118, 2], [108, 2]]], [95, 45]],
  ['Oceanía', '#ff9f1c', [[[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -18], [153, -26], [150, -37], [140, -38], [132, -32], [115, -34]],
    [[131, -2], [141, -3], [150, -10], [141, -9]], [[167, -45], [173, -40], [178, -38], [172, -46]]], [134, -26]],
  ['Antártida', '#ffffff', [[[-180, -70], ...Array.from({ length: 19 }, (_, i) => [-180 + i * 20, -66 - (i % 3) * 3]), [180, -70], [180, -84], [-180, -84]]], [0, -77]],
];
const contSVG = (only = null, opts = {}) => svgURL(1100, 520, (opts.sea ? '<rect width="1100" height="520" rx="24" fill="#5ec4f0"/>' : '')
  + CONTINENTS.filter((c, i) => only == null || i === only).map(([, col, polys]) => polys.map(p => `<polygon points="${p.map(([lo, la]) => WG(lo, la).join(',')).join(' ')}" fill="${opts.mono || col}" stroke="${opts.mono ? opts.mono : '#24527a'}" stroke-width="3" stroke-linejoin="round"/>`).join('')).join(''));

// ---- The ten presentations ------------------------------------------------------
export default {

  // 1 · The journey of a river, as a watercolour field notebook: the river is drawn while a drop follows it, the long
  // profile with its three stretches, a zoom into a meander with Transform, the flow as an area chart and an equation,
  // a table with formulas, a picture to label, a quiz and a word cloud.
  edu_geo_river: { name: 'El viaje de un río', cat: 'edu', summary: 'Acuarela: río que se dibuja con una gota que lo recorre, zoom con Transformar, caudal con ecuación, tabla con fórmulas y etiquetar', make: () => {
    const PAPER = '#f6f1e4', INK = '#2b3a2e', BLUE = '#2f7fb5', OCHRE = '#9c6316', GREEN = '#5b8c3a', SOFT = '#ece4d0';
    const H = pairStacks('friendly').heading;
    const LX = 470, LY = 120, land = LANDSCAPE(PAPER);
    const riverOnSlide = smooth(move(RIVER, LX, LY), 6);
    const ZK = 2.2, ZX = -75, ZY = -546;      // (the meander zoom: the same picture, 2,2 times bigger)
    const landId = uid();
    return numbered(build({ name: 'El viaje de un río', palette: 'forest', fonts: 'friendly', title: { size: 46, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        img(land, LX, LY, 760, 560, 'Paisaje en acuarela: un río baja de las montañas hasta el mar'),
        after(ink(riverOnSlide, '#1d5f8f', 5, { opacity: 80 }), 'draw', { duration: 6000 }),
        along(icon('droplet', riverOnSlide[0][0] - 18, riverOnSlide[0][1] - 18, 36, '#1d5f8f'), 'path', { pathShape: 'custom', points: [[0, 0], ...rel(riverOnSlide)], dx: rel(riverOnSlide).at(-1)[0], dy: rel(riverOnSlide).at(-1)[1], duration: 6000 }),
        kicker('CUADERNO DE CAMPO · 1.º ESO', 70, 150, 420, GREEN, { fontSize: 16, letterSpacing: 3 }),
        text('El viaje<br>de un río', 66, 190, 420, 230, { fontFamily: H, fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.02 }),
        text('Del manantial al mar, tramo a tramo', 70, 440, 380, 100, { fontFamily: HAND, fontSize: 40, color: BLUE, lineHeight: 1.1 })],
        notes: 'Al llegar, el río se dibuja solo mientras una gota lo recorre desde la montaña hasta el delta. Pregunta de arranque: ¿de dónde sale el agua de un río que nunca se seca en verano?' },

      { title: 'Tres tramos, tres trabajos', layout: 'titleOnly', bg: PAPER, extra: [
        img(PROFILE, 90, 190, 1100, 240, 'Perfil de un río: muy inclinado al principio y casi llano al final'),
        ...[['Curso alto', 110], ['Curso medio', 470], ['Curso bajo', 850]].map(([t, x]) => text(t, x, 180, 300, 50, { fontFamily: HAND, fontSize: 36, color: OCHRE, fontWeight: 700 })),
        ...[['mountain', 'Erosiona', 'Mucha pendiente: el agua corre rápida y excava valles estrechos, en forma de V.'],
          ['waves', 'Transporta', 'Menos pendiente: arrastra arena y cantos rodados y empieza a serpentear.'],
          ['sprout', 'Deposita', 'Casi llano: el agua va lenta, suelta lo que lleva y forma llanuras y deltas.']].map(([ic, t, d], i) =>
          on(card(`<b style="font-size:28px;color:${BLUE}">${t}</b><br>${d}`, 90 + i * 375, 455, 350, 205, '#ffffff', { fontSize: 21, color: INK, radius: 14, pad: [20, 22, 20, 84], borderColor: SOFT }), 'fade-up')),
        ...[['mountain', 0], ['waves', 1], ['sprout', 2]].map(([ic, i]) => on(icon(ic, 112 + i * 375, 478, 50, OCHRE), 'fade-up', { start: 'withPrev' }))],
        notes: 'El perfil longitudinal: cuanta más pendiente, más fuerza tiene el agua. Un clic por tramo; cada verbo resume su trabajo: erosionar, transportar, depositar.' },

      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        keep(img(land, LX, LY, 760, 560, 'Paisaje en acuarela del río', { decorative: true }), landId),
        kicker('ZOOM AL CURSO MEDIO', 70, 170, 380, GREEN, { fontSize: 16, letterSpacing: 3 }),
        text('Las curvas del río', 66, 210, 400, 140, { fontFamily: H, fontSize: 56, fontWeight: 800, color: INK, lineHeight: 1.05 }),
        text('En la llanura el río no va recto: serpentea. Cada una de esas curvas se llama <b>meandro</b>.', 70, 370, 370, 160, { fontSize: 26, color: INK }),
        on(shape('ellipse', 700, 430, 210, 230, 'none', { stroke: OCHRE, strokeWidth: 4, dash: 'dash' }), 'zoom-in', { start: 'afterPrev', delay: 400 }),
        text('Pasa a la siguiente: nos acercamos', 70, 560, 380, 50, { fontFamily: HAND, fontSize: 30, color: OCHRE })],
        notes: 'El círculo marca los meandros. La diapositiva siguiente usa Transformar: la misma acuarela crece hasta llenar la pantalla, como si voláramos hacia ella.' },

      { layout: 'blank', bg: PAPER, autoAnimate: true, extra: [
        keep(img(land, ZX, ZY, Math.round(760 * ZK), Math.round(560 * ZK), 'Detalle de los meandros del río', { decorative: true }), landId),
        badge(1, 400, 330, 52, OCHRE), badge(2, 590, 250, 52, GREEN),
        on(card(`<b style="color:${OCHRE}">1 · Orilla de fuera</b><br>El agua corre más deprisa y <b>erosiona</b>: la orilla retrocede.`, 890, 120, 330, 170, '#fffdf7ee', { fontSize: 22, color: INK, radius: 14 }), 'fade-left'),
        on(card(`<b style="color:${GREEN}">2 · Orilla de dentro</b><br>El agua va lenta y <b>deposita</b> arena: nace una playa de río.`, 890, 310, 330, 170, '#fffdf7ee', { fontSize: 22, color: INK, radius: 14 }), 'fade-left'),
        on(card(`<b style="color:${BLUE}">Con los años…</b><br>la curva se cierra, el río la corta y queda un <b>lago en herradura</b>.`, 890, 500, 330, 170, '#fffdf7ee', { fontSize: 22, color: INK, radius: 14 }), 'fade-left')],
        notes: 'Transformar acerca la misma imagen. Dibuja con el dedo la corriente: por fuera va más rápida (erosiona) y por dentro más lenta (deposita). Por eso los meandros se van haciendo más curvos con el tiempo.' },

      { title: '¿Cuánta agua lleva?', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 70, y: 175, w: 700, h: 480, chartType: 'area', color: BLUE, grid: true, yTitle: 'Caudal (m³/s)', seriesName: 'Río Albar',
          data: series(MONTHS, [38, 44, 52, 64, 70, 48, 22, 12, 14, 26, 34, 40]) }),
        mathBlock({ x: 820, y: 180, w: 390, h: 100, fontSize: 56, latex: 'Q = S \\cdot v', color: INK }),
        text('<b>Q</b> caudal (m³/s) · <b>S</b> sección del cauce (m²) · <b>v</b> velocidad del agua (m/s)', 820, 290, 390, 100, { fontSize: 20, color: '#5b5346' }),
        on(card(`40 m² × 1,5 m/s = <b style="color:${BLUE}">60 m³/s</b><br><span style="font-size:20px">Una piscina olímpica cada 40 segundos.</span>`, 820, 410, 390, 150, '#ffffff', { fontSize: 26, color: INK, radius: 14, borderColor: SOFT }), 'zoom-in', { sound: 'pop' }),
        text('Río inventado, con un régimen típico: crece con las lluvias y el deshielo de primavera.', 820, 580, 390, 80, { fontFamily: HAND, fontSize: 24, color: OCHRE })],
        notes: 'El río Albar es inventado, pero su curva es la de muchos ríos de la península: máximo en primavera (lluvia y nieve que se derrite) y estiaje en verano. Calcula el ejemplo en voz alta antes de mostrarlo.' },

      { title: 'Los grandes ríos, a pie', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 70, y: 180, w: 760, h: 400, fontSize: 24, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#d9cfb8', banded: true, band: SOFT,
          rows: [['Río', 'Longitud (km)', 'Desemboca en', 'Días a pie'], ['Tajo', '1.007', 'Atlántico', '=REDONDEAR(B2/40;0)'], ['Ebro', '910', 'Mediterráneo', '=REDONDEAR(B3/40;0)'],
            ['Duero', '897', 'Atlántico', '=REDONDEAR(B4/40;0)'], ['Guadiana', '744', 'Atlántico', '=REDONDEAR(B5/40;0)'], ['Guadalquivir', '657', 'Atlántico', '=REDONDEAR(B6/40;0)']], colW: [3, 2.6, 3, 2.2] }),
        text('La última columna son fórmulas: cambia una longitud y se recalcula.', 70, 600, 760, 50, { fontFamily: HAND, fontSize: 28, color: OCHRE }),
        on(card(`<b style="font-size:28px">¿Cómo lo calculo?</b><br>Andando a 5 km/h durante 8 horas al día recorres <b style="color:${BLUE}">40 km</b>. Divide la longitud del río entre 40.`, 870, 180, 340, 280, '#ffffff', { fontSize: 23, color: INK, radius: 14, borderColor: SOFT }), 'fade-left'),
        on(icon('person-standing', 1010, 490, 80, GREEN), 'jump', { start: 'afterPrev' })],
        notes: 'Las longitudes varían un poco según la fuente: son las de los libros de texto. Propón el reto: ¿cuántos días tardarías en recorrer el río de tu provincia?' },

      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Pon nombre a cada parte del río', x: 80, y: 50, w: 1120, h: 620,
        image: LANDSCAPE('#ffffff'), options: ['Nacimiento', 'Afluente', 'Meandro', 'Delta', 'Montaña'],
        points: [{ x: 84, y: 11 }, { x: 56, y: 34 }, { x: 36, y: 72 }, { x: 11, y: 95 }, { x: 77, y: 30 }] })],
        notes: 'Actividad «Etiquetar una imagen»: cada alumno arrastra los nombres a los puntos desde el móvil y se corrige solo. El afluente es el río pequeño que se une por la izquierda.' },

      { layout: 'blank', bg: PAPER, extra: [quiz('En un meandro, ¿por qué orilla erosiona más el río?', ['Por la de fuera, donde corre más deprisa', 'Por la de dentro, donde va más lento', 'Por las dos por igual', 'Por ninguna: en los meandros solo deposita'], 0, { fontSize: 38 })],
        notes: 'Concurso con puntos por rapidez. Si fallan muchos, vuelve a la diapositiva del zoom y dibuja la corriente con el lápiz.' },

      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'word', fontSize: 38, question: '¿Qué río pasa más cerca de tu casa?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras en directo: saldrán ríos, arroyos y hasta acequias. Pregunta después a qué río grande van a parar sus aguas.' },

      { layout: 'blank', bg: PAPER, transition: 'zoom', extra: [
        after(img(DROP, 830, 150, 300, 390, 'Una gota de agua en acuarela'), 'bounce', { sound: 'pop' }),
        text('Todo río empieza<br>en una gota.', 90, 210, 700, 240, { fontFamily: HAND, fontSize: 92, color: BLUE, lineHeight: 1.05 }),
        text('Próxima clase: ¿adónde va el agua cuando no llueve?', 94, 480, 640, 50, { fontSize: 24, color: INK })],
        notes: 'Cierre. Enlaza con la próxima clase: los acuíferos y las fuentes, el agua que no se ve.' },
    ]));
  } },

  // 2 · Reading a climograph, at a school weather station: graph paper, a thermometer whose mercury rises, a combo
  // chart (bars and a line), a table with formulas and two equations, three small climographs side by side, a NASA
  // weather satellite in 3D, matching pairs, a quiz and a challenge with a countdown.
  edu_geo_climograph: { name: 'Leer un climograma', cat: 'edu', summary: 'Estación meteorológica: termómetro que sube, barras con línea, tabla con fórmulas, ecuaciones, satélite 3D, unir y reto con cuenta atrás', make: () => {
    const BG = '#f9fbfa', INK = '#1d2b36', RED = '#d6452f', BLUE = '#2f74c0', GREEN = '#2e8b57', MUTED = '#5d6b76', LINE = '#d5e2da';
    const T = [11, 12, 14, 16, 19, 23, 26, 27, 24, 19, 15, 12], P = [62, 55, 48, 42, 28, 8, 2, 5, 22, 58, 74, 80];
    const climo = (x, y, w, h, t, p, props = {}) => chartBlock({ x, y, w, h, chartType: 'bar', combo: true, color: BLUE, seriesName: 'Precipitación (mm)',
      data: series(months, p), series: [{ name: 'Temperatura × 2 (°C)', values: t.map(v => v * 2), color: RED }], ...props });
    const paper = () => [deco(MM(1280, 720), 0, 0, 1280, 720, 'Papel milimetrado')];
    const H = pairStacks('tech').heading;
    return numbered(build({ name: 'Leer un climograma', palette: 'office', fonts: 'tech', title: { size: 46, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: paper(), extra: [
        shape('rect', 60, 120, 700, 480, '#ffffff', { opacity: 88 }),
        kicker('ESTACIÓN METEOROLÓGICA DEL INSTITUTO', 90, 150, 640, GREEN, { fontSize: 16, letterSpacing: 4 }),
        text('Leer un<br>climograma', 86, 190, 660, 210, { fontFamily: H, fontSize: 84, fontWeight: 700, color: INK, lineHeight: 1 }),
        text('Un año entero de temperatura y lluvia en un solo gráfico.', 90, 410, 620, 90, { fontSize: 28, color: MUTED }),
        text('LAT. 37° N · ALT. 12 m · SERIE 1991-2020', 90, 520, 470, 44, { fontFamily: MONO, fontSize: 18, color: INK, bg: '#eef4f0', radius: 6, pad: [8, 14, 8, 14] }),
        img(GAUGE, 830, 330, 150, 225, 'Pluviómetro con agua recogida'),
        img(THERMO, 1010, 90, 130, 455, 'Termómetro'),
        after(img(MERCURY, 1065, 228, 20, 190, 'Mercurio del termómetro', { fit: 'fill' }), 'fade-up', { duration: 1600 }),
        text('Pluviómetro', 820, 565, 170, 34, { fontSize: 18, color: MUTED, textAlign: 'center' }),
        text('Termómetro', 990, 565, 170, 34, { fontSize: 18, color: MUTED, textAlign: 'center' })],
        notes: 'Al llegar, el mercurio sube hasta 27 °C, la media de agosto de nuestra estación. Pregunta: ¿qué dos instrumentos necesitamos para dibujar un climograma? El termómetro y el pluviómetro.' },

      { title: 'Así se lee un climograma', layout: 'titleOnly', bg: BG, extra: [
        climo(60, 170, 780, 490, T, P, { grid: true, yTitle: 'mm  ·  °C × 2' }),
        on(card(`<b style="color:${BLUE}">Barras azules</b><br>La lluvia de cada mes, en milímetros.`, 870, 175, 350, 140, '#ffffff', { fontSize: 22, color: INK, radius: 10, borderColor: LINE }), 'fade-left'),
        on(card(`<b style="color:${RED}">Línea roja</b><br>La temperatura media. Escala doble: 10 °C van a la altura de 20 mm.`, 870, 335, 350, 160, '#ffffff', { fontSize: 22, color: INK, radius: 10, borderColor: LINE }), 'fade-left'),
        on(card('<b>Meses secos</b><br>Donde la línea pasa por encima de las barras (P &lt; 2T): de mayo a septiembre.', 870, 515, 350, 150, '#fff6e0', { fontSize: 22, color: INK, radius: 10, borderColor: '#f0d9a0' }), 'fade-left', { sound: 'chime' })],
        notes: 'Es la convención de Gaussen: la escala de temperatura es la mitad que la de lluvia. Así, cuando la línea queda por encima de las barras, ese mes llueve menos de lo que se evapora: es un mes árido.' },

      { title: 'Las cuentas de la estación', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 60, y: 170, w: 1160, h: 160, fontSize: 21, header: true, headBg: INK, headFg: '#ffffff', stroke: LINE,
          rows: [['', ...months, 'Año'], ['T (°C)', ...T.map(String), '=REDONDEAR(PROMEDIO(IZQUIERDA);1)'], ['P (mm)', ...P.map(String), '=SUMA(IZQUIERDA)']], colW: [2, ...months.map(() => 1), 1.8] }),
        on(mathBlock({ x: 60, y: 370, w: 600, h: 100, fontSize: 38, latex: '\\bar{T} = \\frac{\\sum T}{12} = 18{,}2\\ ^{\\circ}\\mathrm{C}', color: INK }), 'fade-up'),
        on(mathBlock({ x: 60, y: 500, w: 600, h: 90, fontSize: 32, latex: 'A = T_{\\max} - T_{\\min} = 27 - 11 = 16\\ ^{\\circ}\\mathrm{C}', color: RED }), 'fade-up'),
        on(card(`<b style="font-size:26px">Diagnóstico</b><br>Media alta e inviernos suaves (ningún mes baja de 10 °C), lluvia escasa (484 mm al año) y verano seco.<br><b style="color:${GREEN}">→ Clima mediterráneo</b>`, 700, 370, 520, 240, '#ffffff', { fontSize: 22, color: INK, radius: 10, borderColor: LINE }), 'zoom-in', { sound: 'chime' }),
        text('La columna «Año» son fórmulas: media de temperaturas y suma de lluvias.', 60, 615, 620, 70, { fontSize: 18, color: MUTED })],
        notes: 'La última columna se calcula sola: cambia un mes y se recalcula. La amplitud térmica (16 °C) es moderada: el mar suaviza las temperaturas. Lejos del mar, la amplitud se dispara.' },

      { title: 'Tres climas, tres dibujos', layout: 'titleOnly', bg: BG, extra: [
        ...[['Ecuatorial', GREEN, [27, 27, 27, 27, 27, 26, 26, 26, 27, 27, 27, 27], [260, 250, 300, 280, 220, 150, 140, 150, 190, 240, 260, 270], 'Calor todo el año y lluvia casi a diario: la línea nunca supera a las barras.'],
          ['Mediterráneo', RED, T, P, 'Inviernos suaves y verano seco: la línea pasa por encima de las barras en verano.'],
          ['Continental', BLUE, [-8, -6, 0, 8, 15, 19, 21, 20, 14, 7, -1, -6], [22, 20, 25, 38, 55, 70, 75, 65, 45, 35, 30, 25], 'Inviernos helados, veranos templados y más lluvia en verano. Gran amplitud.']].map(([n, c, t, p, d], i) => [
          text(n, 60 + i * 395, 165, 370, 44, { fontFamily: H, fontSize: 30, fontWeight: 700, color: c }),
          climo(60 + i * 395, 210, 370, 320, t, p, { legend: false }),
          on(text(d, 60 + i * 395, 545, 370, 110, { fontSize: 20, color: INK }), 'fade-up')]).flat()],
        notes: 'Tres climogramas con la misma escala doble. Pide que describan cada uno con tres palabras antes de mostrar el texto (un clic por clima). Datos redondeados de estaciones tipo.' },

      { layout: 'blank', bg: '#0f1d2b', transition: 'zoom', extra: [
        nasa('cloudsat-a', 700, 90, 520, 520, { motion: 'float', spin: 10 }),
        kicker('TIEMPO ≠ CLIMA', 80, 110, 500, '#7fd1a8', { fontSize: 18 }),
        text('El <b>tiempo</b> es lo que hace hoy.<br>El <b>clima</b> es lo que suele hacer: la media de 30 años.', 76, 150, 600, 200, { fontFamily: H, fontSize: 36, color: '#ffffff', lineHeight: 1.2 }),
        ...[['thermometer', 'Estaciones en tierra', 'miden cada día, a la misma hora'], ['cloud', 'Satélites', 'ven las nubes y la lluvia desde el espacio'], ['ship', 'Barcos y boyas', 'toman datos en mitad del océano']].map(([ic, t, d], i) => [
          on(icon(ic, 80, 390 + i * 85, 50, '#7fd1a8'), 'fade-right', { start: i ? 'afterPrev' : 'click' }),
          along(text(`<b>${t}</b>: ${d}`, 150, 390 + i * 85, 520, 60, { fontSize: 22, color: '#dfe8ee', vAlign: 'middle' }), 'fade-right')]).flat()],
        notes: 'Modelo 3D de la NASA: el satélite CloudSat, que estudia las nubes con un radar. Un clic muestra de dónde salen los datos. Recalca la diferencia: un verano lluvioso no cambia el clima.' },

      { layout: 'blank', bg: BG, back: paper(), extra: [pollBlock({ kind: 'match', fontSize: 28, question: 'Une cada pista con su clima', x: 80, y: 50, w: 1120, h: 620,
        options: ['Calor y lluvia todo el año = Ecuatorial', 'Verano seco y caluroso = Mediterráneo', 'Ningún mes pasa de 10 °C = Polar', 'Lluvia repartida y veranos frescos = Oceánico', 'Inviernos helados lejos del mar = Continental'] })],
        notes: 'Unir parejas desde el móvil, con corrección automática. El oceánico y el continental son los que más se confunden: la clave es la distancia al mar.' },

      { layout: 'blank', bg: BG, extra: [quiz('En un climograma, un mes es árido cuando…', ['La línea de temperatura queda por encima de las barras', 'Las barras pasan de 100 mm', 'La temperatura baja de 0 °C', 'Las barras y la línea se cruzan en enero'], 0, { fontSize: 34 })],
        notes: 'Concurso con puntos por rapidez. La respuesta es la regla de Gaussen: P < 2T.' },

      { title: 'Tu turno: el climograma de tu localidad', layout: 'titleOnly', bg: BG, back: paper(), extra: [
        dg('steps', 'Busca los datos\n  Medias de 30 años\nDibuja los ejes\n  mm a la izquierda, °C a la derecha\nBarras de lluvia\n  Una por mes, en azul\nLínea de temperatura\n  Escala doble, en rojo\nMarca los meses secos\n  Donde la línea gana', 60, 180, 780, 470, { oneByOne: true, colors: 'accent' }),
        timer(300, 900, 200, 300, { color: RED, endText: '¡Lápices arriba!' }),
        text('5 minutos', 900, 520, 300, 50, { fontFamily: H, fontSize: 30, fontWeight: 700, color: INK, textAlign: 'center' })],
        notes: 'Reto final con cuenta atrás de cinco minutos. Los pasos aparecen uno a uno. Si no hay datos de su localidad, usad los de la estación más cercana.' },
    ]));
  } },

  // 3 · Reading a topographic map, as an orienteering map: contours round two hills, the course drawn in magenta,
  // the scale with an equation and a scale bar, a table with formulas, a mountain sliced into contour lines with
  // Transform, matching symbols, a hooded walker who follows the course, a quiz and a compass.
  edu_geo_topomap: { name: 'Leer un mapa topográfico', cat: 'edu', summary: 'Mapa de orientación: recorrido que se dibuja, escala con ecuación, tabla con fórmulas, curvas de nivel con Transformar y corredora 3D', make: () => {
    const CREAM = '#fbf7ee', BROWN = '#b06a2c', MAG = '#c2187a', BLUE = '#2b7fbf', INK = '#1f1f1f', ORANGE = '#f07c22', MUTED = '#6b5a48';
    const H = pairStacks('clean').heading;
    const map = (faint = false) => [deco(CONTOURS(1280, 720, faint), 0, 0, 1280, 720, 'Mapa topográfico con curvas de nivel')];
    const control = (x, y, n, props = {}) => [shape('ellipse', x - 26, y - 26, 52, 52, 'none', { stroke: MAG, strokeWidth: 4, ...props }), text(String(n), x + 26, y - 50, 40, 36, { fontSize: 24, fontWeight: 800, color: MAG })];
    const start = (x, y) => shape('triangle', x - 28, y - 30, 56, 50, 'none', { stroke: MAG, strokeWidth: 4 });
    const finish = (x, y) => [shape('ellipse', x - 28, y - 28, 56, 56, 'none', { stroke: MAG, strokeWidth: 4 }), shape('ellipse', x - 18, y - 18, 36, 36, 'none', { stroke: MAG, strokeWidth: 4 })];
    // The mountain in slices (side view) and its contour lines (seen from above): the same ellipses, for Transform.
    const ringIds = [0, 1, 2, 3, 4].map(() => uid()), labIds = [0, 1, 2, 3, 4].map(() => uid());
    const L = i => 290 + 100 * i, W = i => 700 - 140 * i, sideY = i => 600 - 80 * i, topH = i => Math.round(W(i) * 0.55);
    const HILL = svgURL(1280, 720, `<path d="M180 640 C240 630 270 610 ${L(0)} 600 L${L(1)} 520 L${L(2)} 440 L${L(3)} 360 L${L(4)} 280 Q760 200 ${L(4) + W(4)} 280 L${L(3) + W(3)} 360 L${L(2) + W(2)} 440 L${L(1) + W(1)} 520 L${L(0) + W(0)} 600 C1010 620 1040 632 1100 640Z" fill="#e8d3ad" stroke="${BROWN}" stroke-width="2"/>`);
    const course = [[150, 600], [330, 330], [640, 200], [980, 260], [1120, 560]];
    const route = smooth(course, 10);
    return numbered(build({ name: 'Leer un mapa topográfico', palette: 'paper', fonts: 'clean', title: { size: 46, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: CREAM, transition: 'fade', back: map(), extra: [
        shape('rect', 60, 130, 560, 440, CREAM, { opacity: 94, radius: 8 }),
        kicker('ORIENTACIÓN · GEOGRAFÍA 1.º ESO', 90, 160, 500, MAG, { fontSize: 16, letterSpacing: 4 }),
        text('Leer un mapa topográfico', 86, 200, 510, 200, { fontFamily: H, fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.04 }),
        text('Escala, curvas de nivel y signos: el mapa habla si sabes escucharlo.', 90, 420, 500, 110, { fontSize: 25, color: MUTED }),
        start(700, 560), ...control(840, 300, 1), ...control(1080, 190, 2), ...control(1160, 480, 3), ...finish(980, 610),
        after(ink([[700, 540], [828, 324]], MAG, 4), 'draw', { duration: 700 }), after(ink([[864, 290], [1054, 200]], MAG, 4), 'draw', { duration: 700 }),
        after(ink([[1090, 216], [1152, 454]], MAG, 4), 'draw', { duration: 700 }), after(ink([[1140, 498], [1004, 596]], MAG, 4), 'draw', { duration: 700 }),
        after(img(FLAG, 1030, 120, 44, 44, 'Baliza de orientación'), 'bounce', { sound: 'pop' })],
        notes: 'Un mapa de orientación de verdad usa estos colores: marrón para el relieve, azul para el agua, negro para caminos y magenta para el recorrido. Al llegar, el recorrido se dibuja de baliza en baliza.' },

      { title: 'La escala: cuánto encoge el mundo', layout: 'titleOnly', bg: CREAM, extra: [
        mathBlock({ x: 80, y: 180, w: 660, h: 100, fontSize: 48, latex: 'D = d \\times E', color: INK }),
        img(SCALEBAR, 90, 300, 640, 90, 'Escala gráfica de 1 kilómetro dividida en cuatro tramos'),
        on(stat('1 cm = 250 m', 'en un mapa a escala 1 : 25 000', 90, 420, 640, MAG, INK, 72), 'zoom-in', { sound: 'pop' }),
        on(card(`<b style="color:${BROWN}">Escala grande · 1 : 5 000</b><br>Mucho detalle, poco territorio: el plano de tu barrio.`, 800, 180, 410, 190, '#ffffff', { fontSize: 23, color: INK, radius: 8, borderColor: '#e6dccb' }), 'fade-left'),
        on(card(`<b style="color:${BLUE}">Escala pequeña · 1 : 1 000 000</b><br>Poco detalle, mucho territorio: el mapa de España.`, 800, 390, 410, 190, '#ffffff', { fontSize: 23, color: INK, radius: 8, borderColor: '#e6dccb' }), 'fade-left')],
        notes: 'El truco de siempre: «grande» o «pequeña» se refiere a la fracción, no al territorio. 1/5 000 es un número más grande que 1/1 000 000.' },

      { title: 'De centímetros a kilómetros', layout: 'titleOnly', bg: CREAM, extra: [
        tableBlock({ x: 70, y: 180, w: 800, h: 380, fontSize: 25, header: true, headBg: BROWN, headFg: '#ffffff', stroke: '#e6dccb', banded: true, band: '#f3eadb',
          rows: [['Mapa (cm)', 'Escala 1 :', 'Real (km)', 'Tipo de mapa'], ['4', '25.000', '=A2*B2/100000', 'Excursionista'], ['2', '50.000', '=A3*B3/100000', 'Topográfico'],
            ['7,5', '200.000', '=A4*B4/100000', 'Provincial'], ['3', '1.000.000', '=A5*B5/100000', 'De España']], colW: [2.2, 2.6, 2.2, 3] }),
        text('La columna «Real» son fórmulas: prueba a cambiar los centímetros.', 70, 580, 800, 40, { fontSize: 20, color: MUTED }),
        on(card(`<b style="font-size:28px;color:${MAG}">¿Por qué entre 100 000?</b><br>Porque en un kilómetro caben 100 000 centímetros.`, 910, 180, 300, 260, '#ffffff', { fontSize: 24, color: INK, radius: 8, borderColor: '#e6dccb' }), 'flip'),
        on(icon('ruler', 1020, 470, 80, BROWN), 'teeter', { start: 'afterPrev' })],
        notes: 'Haz la primera fila en la pizarra: 4 cm × 25 000 = 100 000 cm = 1 km. La tabla hace el resto con fórmulas.' },

      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
        deco(HILL, 0, 0, 1280, 720, 'Una montaña vista de lado'),
        text('Una montaña en rodajas', 80, 50, 900, 80, { fontFamily: H, fontSize: 46, fontWeight: 800, color: INK }),
        text('Imagina que la cortamos cada 100 metros de altura…', 80, 125, 900, 44, { fontSize: 24, color: MUTED }),
        ...[0, 1, 2, 3, 4].map(i => keep(shape('ellipse', L(i), sideY(i) - 18, W(i), 36, '#f3e4c4', { stroke: BROWN, strokeWidth: 3 }), ringIds[i])),
        ...[0, 1, 2, 3, 4].map(i => keep(text(`${(i + 1) * 100} m`, L(i) - 120, sideY(i) - 18, 100, 36, { fontSize: 20, fontWeight: 700, color: BROWN, textAlign: 'right', vAlign: 'middle' }), labIds[i]))],
        notes: 'Cada rodaja es una curva de nivel: une todos los puntos que están a la misma altura. Pasa a la siguiente: con Transformar, miramos la montaña desde arriba.' },

      { layout: 'blank', bg: CREAM, autoAnimate: true, extra: [
        text('Vista desde arriba: curvas de nivel', 80, 50, 1000, 80, { fontFamily: H, fontSize: 46, fontWeight: 800, color: INK }),
        ...[0, 1, 2, 3, 4].map(i => keep(shape('ellipse', L(i), 400 - topH(i) / 2, W(i), topH(i), '#f3e4c4', { stroke: BROWN, strokeWidth: 3 }), ringIds[i])),
        ...[0, 1, 2, 3, 4].map(i => keep(text(`${(i + 1) * 100} m`, L(i) + W(i) / 2 - 45, 400 + topH(i) / 2 - 16, 90, 30, { fontSize: 18, fontWeight: 700, color: BROWN, textAlign: 'center', vAlign: 'middle', bg: '#f3e4c4', pad: [0, 0, 0, 0] }), labIds[i])),
        on(card('<b>Separadas</b><br>pendiente suave: se sube paseando', 40, 220, 230, 170, '#ffffff', { fontSize: 21, color: INK, radius: 8, borderColor: '#e6dccb' }), 'fade-right'),
        on(card(`<b style="color:${MAG}">Juntas</b><br>pendiente fuerte: ¡cuesta arriba!`, 1010, 220, 230, 170, '#ffffff', { fontSize: 21, color: INK, radius: 8, borderColor: '#e6dccb' }), 'fade-left')],
        notes: 'Transformar convierte las rodajas en anillos. A la izquierda las curvas están separadas (pendiente suave); a la derecha, casi pegadas (ladera empinada). Compáralo con la silueta de la diapositiva anterior.' },

      { layout: 'blank', bg: CREAM, extra: [pollBlock({ kind: 'match', fontSize: 28, question: 'Une cada signo del mapa con lo que significa', x: 80, y: 50, w: 1120, h: 620,
        options: ['Línea marrón fina = Curva de nivel', 'Línea azul = Río o arroyo', 'Triángulo con un punto = Vértice geodésico', 'Mancha verde = Vegetación difícil de cruzar', 'Línea negra discontinua = Senda'] })],
        notes: 'Unir parejas desde el móvil. Los vértices geodésicos son los pilares de las cumbres: puntos de altura medida con precisión.' },

      { layout: 'blank', bg: CREAM, back: map(true), transition: 'fade', extra: [
        text('De baliza en baliza', 70, 40, 520, 64, { fontFamily: H, fontSize: 40, fontWeight: 800, color: INK, bg: CREAM, radius: 6, pad: [6, 14, 6, 14] }),
        start(...course[0]), ...control(...course[1], 1), ...control(...course[2], 2), ...control(...course[3], 3), ...finish(...course[4]),
        on(ink(route, MAG, 4, { opacity: 85 }), 'draw', { duration: 8000 }),
        along(model('kk-Rogue_Hooded', course[0][0] - 60, course[0][1] - 150, 120, 160, { walk: { clip: lib3d('kk-Rogue_Hooded').walk, end: lib3d('kk-Rogue_Hooded').arrive, endOnce: true, face: true, look: true } }),
          'path', { pathShape: 'custom', points: [[0, 0], ...rel(route)], dx: rel(route).at(-1)[0], dy: rel(route).at(-1)[1], duration: 8000 }),
        text('Clic: ¡salida!', 1040, 640, 190, 44, { fontSize: 20, fontWeight: 700, color: '#ffffff', bg: MAG, radius: 22, textAlign: 'center', vAlign: 'middle' })],
        notes: 'Un clic: la corredora sigue el recorrido de baliza en baliza mientras se dibuja, y celebra al llegar a la meta. Pregunta por qué el tramo 2-3 rodea la colina en lugar de subirla.' },

      { layout: 'blank', bg: CREAM, extra: [quiz('En un mapa 1 : 50 000, dos pueblos están a 6 cm. ¿Qué distancia real hay?', ['300 m', '3 km', '30 km', '6 km'], 1, { fontSize: 36 })],
        notes: 'Concurso por rapidez: 6 × 50 000 = 300 000 cm = 3 km.' },

      { layout: 'blank', bg: CREAM, back: map(true), transition: 'zoom', extra: [
        shape('rect', 0, 220, 1280, 280, CREAM, { opacity: 92 }),
        after(icon('compass', 120, 260, 200, MAG), 'spin360', { duration: 2000 }),
        text('El norte, arriba.<br>La escala, a mano.<br>Las curvas te cuentan la montaña.', 380, 250, 840, 220, { fontFamily: H, fontSize: 44, fontWeight: 800, color: INK, lineHeight: 1.15, vAlign: 'middle' })],
        notes: 'Cierre. Propuesta: en la próxima clase, una carrera de orientación por el patio con un mapa hecho por vosotros.' },
    ]));
  } },

  // 4 · Population pyramids, as a bold census poster: a pyramid that builds itself bar by bar, the three shapes
  // morphing into one another with Transform, the demographic transition in a line chart, rates as equations,
  // putting the phases in order, a quiz, a vote with a pie and a closing bar that pulses.
  edu_geo_pyramids: { name: 'Pirámides de población', cat: 'edu', summary: 'Cartel de censo: pirámide que se construye barra a barra, tres formas con Transformar, gráfico de líneas, ecuaciones, ordenar y concurso', make: () => {
    const BG = '#1b1030', PINK = '#f15bb5', CYAN = '#00bbf9', YEL = '#fee440', LAV = '#c9b8f0', PANEL = '#2a1b47';
    const BB = pairStacks('bold').heading;
    const ids = AGES.map(() => [uid(), uid()]), descId = uid(), nameId = uid();
    // A pyramid: men to the left, women to the right of a column of ages.
    const pyramid = (data, cx, k, bottom, bh = 46, gap = 6, opts = {}) => AGES.map((a, i) => {
      const y = bottom - (i + 1) * (bh + gap) + gap, [m, f] = [data[0][i] * k, data[1][i] * k];
      const out = [
        { ...shape('rect', Math.round(cx - 40 - m), y, Math.round(m), bh, CYAN, { radius: 4 }), ...(opts.ids && { id: opts.ids[i][0] }) },
        { ...shape('rect', cx + 40, y, Math.round(f), bh, PINK, { radius: 4 }), ...(opts.ids && { id: opts.ids[i][1] }) }];
      if (opts.labels !== false) out.push(text(a, cx - 40, y, 80, bh, { fontSize: Math.min(20, bh * 0.5), color: LAV, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }));
      return out; }).flat();
    const desc = (name, body, color) => [keep(text(name, 860, 190, 360, 80, { fontFamily: BB, fontSize: 64, color, letterSpacing: 2 }), nameId),
      keep(card(body, 860, 290, 360, 240, PANEL, { fontSize: 22, color: '#f3eefe', radius: 14 }), descId)];
    const sexes = [text('HOMBRES', 100, 175, 220, 44, { fontFamily: BB, fontSize: 34, color: CYAN, letterSpacing: 3 }), text('MUJERES', 640, 175, 200, 44, { fontFamily: BB, fontSize: 34, color: PINK, letterSpacing: 3, textAlign: 'right' })];
    const years = ['1850', '1870', '1890', '1910', '1930', '1950', '1970', '1990', '2010', '2030'];
    return numbered(build({ name: 'Pirámides de población', palette: 'violet', fonts: 'bold', title: { size: 60, color: YEL, font: BB }, body: { color: '#f3eefe' } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(700, 120, 640, '#9b5de5', BG, 45)], extra: [
        kicker('GEOGRAFÍA HUMANA · 3.º ESO', 76, 150, 520, YEL, { fontSize: 18 }),
        text('PIRÁMIDES<br>DE POBLACIÓN', 70, 190, 620, 300, { fontFamily: BB, fontSize: 132, color: '#ffffff', lineHeight: 0.92, letterSpacing: 2 }),
        text('Lo que la edad de un país cuenta de su pasado y de su futuro.', 76, 500, 540, 90, { fontSize: 26, color: LAV }),
        ...pyramid(PYR.young, 960, 16, 650, 40, 6, { labels: false }).map((b, j) => after(b, j % 2 ? 'fade-right' : 'fade-left', { duration: 220, start: j % 2 ? 'withPrev' : 'afterPrev' }))],
        notes: 'Al llegar, la pirámide se construye sola, de los niños (abajo) a los mayores (arriba). Los hombres siempre a la izquierda en azul; las mujeres a la derecha.' },

      { title: 'Cómo se lee', layout: 'titleOnly', bg: BG, extra: [
        ...sexes, ...pyramid(PYR.young, 470, 24, 660, 46, 6, { ids }),
        on(card(`<b style="color:${YEL}">Cada barra</b><br>El % de la población que tiene esa edad.`, 860, 180, 360, 140, PANEL, { fontSize: 22, color: '#f3eefe', radius: 14 }), 'fade-left'),
        on(card(`<b style="color:${YEL}">La base</b><br>Los nacimientos. Ancha: nacen muchos niños.`, 860, 340, 360, 140, PANEL, { fontSize: 22, color: '#f3eefe', radius: 14 }), 'fade-left'),
        on(card(`<b style="color:${YEL}">La cima</b><br>Los mayores. Estrecha: pocos llegan a viejos.`, 860, 500, 360, 140, PANEL, { fontSize: 22, color: '#f3eefe', radius: 14 }), 'fade-left')],
        notes: 'La forma de la pirámide resume dos cosas: cuántos nacen (la base) y cuánto se vive (la cima). Cifras inventadas pero típicas.' },

      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...sexes, ...pyramid(PYR.young, 470, 24, 660, 46, 6, { ids }),
        ...desc('EXPANSIVA', `Base muy ancha y cima estrecha: <b>muchos nacimientos</b> y una vida más corta.<br><br><span style="color:${LAV}">Una población joven que crece deprisa.</span>`, YEL)],
        notes: 'Primera forma: la expansiva, típica de países con mucha natalidad. Pasa a la siguiente: con Transformar, la pirámide cambia de forma.' },

      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        ...sexes, ...pyramid(PYR.steady, 470, 24, 660, 46, 6, { ids }),
        ...desc('ESTACIONARIA', `Casi recta, como una campana: nacen menos niños y se vive más.<br><br><span style="color:${LAV}">La población apenas cambia.</span>`, CYAN)],
        notes: 'Transformar: las mismas barras cambian de tamaño. La natalidad baja y la esperanza de vida sube.' },

      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        ...sexes, ...pyramid(PYR.old, 470, 24, 660, 46, 6, { ids }),
        ...desc('REGRESIVA', `Base estrecha y centro ancho: <b>pocos nacimientos</b> y muchos adultos y mayores.<br><br><span style="color:${LAV}">Una población que envejece. Es la de muchos países europeos.</span>`, PINK)],
        notes: 'La forma de bulbo o de urna. Fíjate en la cima: hay más mujeres que hombres, porque ellas viven más años de media.' },

      { title: 'La transición demográfica', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 60, y: 170, w: 790, h: 490, chartType: 'line', color: PINK, seriesName: 'Natalidad (‰)', grid: true, yTitle: 'por cada mil habitantes',
          data: series(years, [38, 37, 36, 33, 28, 22, 20, 13, 10, 8]), series: [{ name: 'Mortalidad (‰)', values: [30, 29, 26, 20, 15, 11, 9, 9, 9, 11], color: CYAN }] }),
        on(stat('+13 ‰', 'crecía la población hacia 1910: la mortalidad ya había bajado y la natalidad, todavía no', 890, 190, 330, YEL, '#f3eefe', 76, { h: 270 }), 'zoom-in'),
        on(text('La distancia entre las dos líneas es el <b>crecimiento natural</b>.', 890, 470, 330, 140, { fontSize: 24, color: LAV }), 'fade-up')],
        notes: 'Un país europeo inventado, con cifras redondeadas. Primero baja la mortalidad (vacunas, agua limpia, más comida) y después, la natalidad. Al final las dos líneas casi se tocan.' },

      { title: 'Las cuentas de un pueblo', layout: 'titleOnly', bg: BG, extra: [
        text('Villanueva (inventado): 8.000 habitantes · 72 nacimientos · 96 defunciones en un año', 70, 165, 1140, 44, { fontSize: 24, color: LAV }),
        on(mathBlock({ x: 70, y: 240, w: 720, h: 100, fontSize: 40, latex: 'TN = \\frac{72}{8\\,000} \\times 1\\,000 = 9\\ ‰', color: PINK }), 'fade-up'),
        on(mathBlock({ x: 70, y: 370, w: 720, h: 100, fontSize: 40, latex: 'TM = \\frac{96}{8\\,000} \\times 1\\,000 = 12\\ ‰', color: CYAN }), 'fade-up'),
        on(mathBlock({ x: 70, y: 500, w: 720, h: 90, fontSize: 40, latex: 'CN = TN - TM = -3\\ ‰', color: '#ffffff' }), 'fade-up'),
        on(stat('−3 ‰', 'Villanueva pierde población… salvo que llegue gente nueva a vivir allí.', 860, 250, 360, YEL, '#f3eefe', 110), 'zoom-in', { sound: 'drumroll' })],
        notes: 'Tasa de natalidad (TN), de mortalidad (TM) y crecimiento natural (CN), siempre por cada mil habitantes. Muchos pueblos pequeños están así; las migraciones pueden cambiar el resultado.' },

      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena las fases de la transición demográfica', x: 80, y: 50, w: 1120, h: 620,
        options: ['Natalidad y mortalidad muy altas', 'Baja la mortalidad; la natalidad sigue alta', 'Baja también la natalidad', 'Natalidad y mortalidad bajas'] })],
        notes: 'Actividad de ordenar desde el móvil, con nota automática. La pista está en el gráfico de líneas: primero cae una línea y después la otra.' },

      { layout: 'blank', bg: BG, extra: [quiz('Una pirámide con la base estrecha y la cima ancha indica que la población…', ['Está envejeciendo', 'Tiene muchos nacimientos', 'Es muy joven', 'Crece muy deprisa'], 0, { fontSize: 36 })],
        notes: 'Concurso con puntos por rapidez. Es la pirámide regresiva.' },

      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        ...pyramid(PYR.steady, 960, 22, 640, 40, 6).map(b => b.type === 'shape' ? { ...b, opacity: 35 } : b),
        withAnims(shape('rect', 960 - 40 - Math.round(6.5 * 22), 640 - 2 * 46 + 6, Math.round(6.5 * 22) + 80 + Math.round(6.2 * 22), 40, YEL, { radius: 4 }), A('color-pulse', { start: 'afterPrev', duration: 1400 })),
        text('TU EDAD TAMBIÉN<br>ESTÁ EN LA PIRÁMIDE', 70, 190, 640, 310, { fontFamily: BB, fontSize: 96, color: '#ffffff', lineHeight: 0.95 }),
        text('Busca tu barra: la de 10 a 19 años.', 76, 520, 560, 60, { fontSize: 28, color: YEL })],
        notes: 'Cierre: la barra amarilla es la de los alumnos. Pregunta final: ¿cómo será esta barra cuando tengáis 50 años?' },
    ]));
  } },

  // 5 · Deserts, at sunset: a caravan crossing the dunes, a gold Text Art figure and a bar chart of rainfall, four
  // kinds of desert, a day of temperatures in a line chart, a fox walking over the sand (3D), an oasis in
  // cross-section, myths struck out, a quiz and a starry night.
  edu_geo_deserts: { name: 'Los desiertos', cat: 'edu', summary: 'Dunas al atardecer: caravana que avanza, Text Art dorado, gráficos de barras y líneas, zorro 3D, oasis dibujado, mitos tachados y concurso', make: () => {
    const SKY1 = '#f6a04d', SKY2 = '#5b2a5c', SUN = '#ffd27a', CREAM = '#fff4ec', SAND = '#e9b872', DARK = '#2b1512', PANEL = '#3b1f1a', NIGHT = '#1a1033';
    const H = pairStacks('editorial').heading;
    const sky = (a = SKY2, b = SKY1) => shape('rect', -20, -20, 1320, 760, a, { fill2: b, gradType: 'linear', gradAngle: 90 });
    const ridge = [[0, 0], [200, -40], [420, -20], [640, -50], [900, -36], [1200, -20]];
    const fox = lib3d('kh-Fox');
    return numbered(build({ name: 'Los desiertos', palette: 'warm', fonts: 'editorial', title: { size: 46, color: SAND }, body: { color: CREAM } }, [
      { layout: 'blank', bg: SKY2, transition: 'fade', back: [sky(), glow(780, 130, 420, SUN, SKY1, 90), shape('ellipse', 910, 260, 160, 160, SUN)], extra: [
        deco(DUNES(), 0, 380, 1280, 340, 'Dunas'),
        ...[0, 1, 2].map(i => withAnims(img(CAMEL, -180 + i * 90, 440 - i * 4, 110, 76, 'Caravana de camellos', { decorative: true }),
          path(ridge, { start: i ? 'withPrev' : 'afterPrev', duration: 12000 }))),
        kicker('GEOGRAFÍA FÍSICA · 1.º ESO', 84, 110, 500, '#ffe3b8', { fontSize: 18 }),
        text('Los desiertos', 80, 150, 760, 130, { fontFamily: H, fontSize: 96, fontWeight: 700, color: CREAM }),
        text('Donde el agua es un tesoro', 84, 280, 700, 60, { fontFamily: H, fontSize: 34, fontStyle: 'italic', color: '#ffe3b8' })],
        notes: 'Al llegar, una caravana cruza las dunas despacio. Pregunta de arranque: ¿qué tiene que pasar para que un lugar sea un desierto? Casi todos dirán «calor»: veremos que no.' },

      { layout: 'blank', bg: DARK, transition: 'fade', extra: [
        kicker('LA REGLA', 80, 140, 400, SAND, { fontSize: 18 }),
        text('&lt; 250', 70, 180, 560, 190, { fontFamily: H, fontSize: 160, fontWeight: 700, wordart: 'gold', lineHeight: 1 }),
        text('milímetros de lluvia al año: eso es lo que define un desierto, no el calor.', 80, 390, 520, 140, { fontSize: 30, color: CREAM }),
        text('Cifras aproximadas', 80, 600, 400, 36, { fontSize: 18, color: '#c9a98a' }),
        on(chartBlock({ x: 640, y: 120, w: 580, h: 520, chartType: 'hbar', color: SKY1, dataLabels: true, xTitle: 'mm de lluvia al año',
          data: [{ label: 'Atacama (Chile)', value: 1, color: '#e4572e' }, { label: 'Sáhara central', value: 25, color: '#e4572e' }, { label: 'Almería', value: 200, color: SAND },
            { label: 'Madrid', value: 420, color: '#669bbc' }, { label: 'Santiago de Compostela', value: 1800, color: '#669bbc' }] }), 'fade-left')],
        notes: 'Almería es el lugar más seco de la península y aun así no llega a ser un desierto. En algunos puntos de Atacama han pasado años sin llover.' },

      { title: 'No todos son de arena ni de calor', layout: 'titleOnly', bg: DARK, extra: [
        ...[['sun', 'Cálidos', 'Cerca de los trópicos: el aire seco baja y no deja llover.', 'Sáhara'],
          ['waves', 'Costeros', 'Una corriente fría del mar enfría el aire y no se forman nubes.', 'Atacama'],
          ['wind', 'De interior', 'Tan lejos del mar que la humedad no llega. Inviernos helados.', 'Gobi'],
          ['snowflake', 'Polares', 'Hace tanto frío que el aire casi no lleva vapor de agua.', 'Antártida']].map(([ic, t, d, ex], i) => [
          on(shape('rect', 60 + i * 295, 190, 275, 440, PANEL, { radius: 18 }), 'fade-up'),
          along(icon(ic, 90 + i * 295, 220, 64, i === 3 ? '#a8d8ff' : SUN), 'fade-up'),
          along(text(`<b style="font-size:30px;color:${CREAM}">${t}</b><br>${d}`, 82 + i * 295, 300, 235, 230, { fontSize: 21, color: '#f3dcc8' }), 'fade-up'),
          along(text(`Ej.: ${ex}`, 82 + i * 295, 560, 235, 40, { fontFamily: H, fontSize: 22, fontStyle: 'italic', color: SAND }), 'fade-up')]).flat()],
        notes: 'Un clic por tipo. La sorpresa: la Antártida es el desierto más grande del mundo, porque casi no nieva.' },

      { title: 'Un día en el desierto', layout: 'titleOnly', bg: DARK, extra: [
        chartBlock({ x: 60, y: 170, w: 760, h: 490, chartType: 'line', color: SKY1, grid: true, dataLabels: true, yTitle: 'Temperatura (°C)', seriesName: 'Un día de verano',
          data: series(['0 h', '3 h', '6 h', '9 h', '12 h', '15 h', '18 h', '21 h', '24 h'], [14, 9, 6, 20, 38, 44, 34, 22, 13]) }),
        on(stat('38 °C', 'de diferencia entre el amanecer y la tarde', 860, 180, 360, SUN, CREAM, 96), 'zoom-in', { sound: 'whoosh' }),
        on(card('Sin nubes ni humedad, nada guarda el calor: de día el sol abrasa y de noche el calor se escapa hacia el cielo.', 860, 420, 360, 220, PANEL, { fontSize: 22, color: CREAM, radius: 14 }), 'fade-up')],
        notes: 'Cifras de un día típico de verano en un desierto cálido. Por eso los pueblos del desierto se tapan con ropa amplia: protege del sol de día y del frío de noche.' },

      { layout: 'blank', bg: SKY2, transition: 'fade', back: [sky('#7a3a58', '#f2b36a')], extra: [
        deco(DUNES(['#d9a05a', '#b8743a', '#8d5129', '#f3cf96']), 0, 420, 1280, 300, 'Dunas'),
        withAnims(model('kh-Fox', 40, 400, 280, 200, { view: 'side', caption: '', walk: { clip: fox.walk, end: fox.rest, face: true, look: false } }), path([[160, -10], [330, 6]], { duration: 4000 })),
        text('Vivir con poca agua', 640, 90, 600, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: CREAM }),
        ...[['moon', 'Sale de noche, cuando refresca.'], ['droplet', 'Casi no bebe: saca el agua de lo que come.'], ['paw-print', 'Pelo en las plantas: la arena no le quema.'], ['sun', 'Orejas enormes: por ellas suelta el calor.']].map(([ic, t], i) => [
          on(icon(ic, 650, 190 + i * 66, 40, SUN), 'fade-left', { start: 'afterPrev' }), along(text(t, 704, 186 + i * 66, 520, 50, { fontSize: 24, color: CREAM, vAlign: 'middle' }), 'fade-left')]).flat(),
        credits(['kh-Fox'], 60, 670, 1160, '#ffe8cf')],
        notes: 'Un clic: el zorro cruza la duna. Es un zorro común en 3D: el zorro del desierto (el fénec) tiene las orejas aún más grandes. Las adaptaciones aparecen solas una tras otra.' },

      { title: 'El secreto de un oasis', layout: 'titleOnly', bg: DARK, extra: [
        img(OASIS, 60, 175, 860, 378, 'Corte de un oasis: palmeras, laguna, pozo, acuífero y roca impermeable'),
        text('<b>agua subterránea (acuífero)</b>', 72, 404, 420, 30, { fontSize: 16, color: '#ffffff' }),
        text('<b>roca impermeable</b>', 72, 510, 420, 30, { fontSize: 16, color: '#f6d7a7' }),
        ...[[1, 492, 210], [2, 498, 282], [3, 700, 236], [4, 590, 410]].map(([n, x, y]) => on(badge(n, x, y, 40, '#e4572e'), 'zoom-in')),
        ...[['Palmeras', 'Sus raíces llegan al agua del subsuelo.'], ['Laguna', 'El agua subterránea sale sola a la superficie.'], ['Pozo', 'Donde no sale, se cava hasta encontrarla.'], ['Acuífero', 'Agua de lluvias muy antiguas, guardada entre la roca.']].map(([t, d], i) =>
          along(text(`<b style="color:${SAND}">${i + 1} · ${t}</b><br>${d}`, 950, 175 + i * 118, 280, 108, { fontSize: 19, color: CREAM }), 'fade-left', { delay: 200 })),
        text('Dibujo esquemático, no a escala.', 60, 570, 860, 36, { fontSize: 18, color: '#c9a98a' })],
        notes: 'Un clic por parte. Un oasis no es un milagro: es un sitio donde el agua subterránea está cerca de la superficie. Algunos acuíferos del Sáhara guardan agua de hace miles de años.' },

      { title: 'Tres mitos', layout: 'titleOnly', bg: DARK, extra: [
        ...[['«Todos los desiertos son de arena.»', 'Solo una parte son dunas: casi todo es roca y piedra.'],
          ['«En el desierto siempre hace calor.»', 'De noche puede helar, y la Antártida también es un desierto.'],
          ['«En el desierto no vive nadie.»', 'Millones de personas viven en desiertos y en sus bordes.']].map(([m, t], i) => [
          on(text(m, 70, 190 + i * 150, 560, 110, { fontFamily: H, fontSize: 30, fontStyle: 'italic', color: CREAM, vAlign: 'middle' }), 'strike'),
          after(card(t, 660, 190 + i * 150, 560, 110, PANEL, { fontSize: 23, color: SAND, radius: 12, vAlign: 'middle' }), 'fade-left')]).flat()],
        notes: 'Un clic tacha cada mito y aparece la realidad. Pregunta antes de cada clic: ¿verdadero o falso?' },

      { layout: 'blank', bg: DARK, extra: [quiz('¿Cuál es el desierto más grande del mundo?', ['El Sáhara', 'La Antártida', 'El Gobi', 'Atacama'], 1, { fontSize: 40 })],
        notes: 'Concurso con puntos por rapidez. La Antártida (unos 14 millones de km²) supera al Sáhara (unos 9 millones). Si eligen el Sáhara, vuelve a la regla de los 250 mm.' },

      { layout: 'blank', bg: NIGHT, transition: 'fade', back: [deco(STARS(1280, 460, 160, 7), 0, 0, 1280, 460, 'Cielo estrellado')], extra: [
        shape('ellipse', 1010, 90, 110, 110, '#f6efd2'), shape('ellipse', 990, 76, 100, 100, NIGHT),
        deco(DUNES(['#3a2a52', '#2a1f40', '#1c1530', '#5a4a7a']), 0, 400, 1280, 320, 'Dunas de noche'),
        after(text('De noche, el desierto<br>se enfría y se llena de estrellas.', 80, 140, 820, 200, { fontFamily: H, fontSize: 52, color: CREAM, lineHeight: 1.2 }), 'fade-in', { duration: 1500 }),
        after(text('Próxima parada: la sabana.', 84, 360, 600, 50, { fontSize: 26, color: SAND }), 'fade-up')],
        notes: 'Cierre tranquilo. Enlaza con la próxima clase: qué ocurre en el borde del desierto, donde empieza a llover un poco más.' },
    ]));
  } },

  // 6 · Cities, as a city at night from above: a neon title, urban growth in an area chart, three street plans,
  // the rings of a city with Transform, a radial diagram of functions, a doughnut of how people move with a toy car
  // driving round the block (3D), a vote with several answers and a quiz.
  edu_geo_cities: { name: 'La ciudad: cómo crece', cat: 'edu', summary: 'Ciudad nocturna desde arriba: Text Art neón, gráfico de área, planos dibujados, anillos con Transformar, diagrama radial y coche 3D', make: () => {
    const BG = '#0b0f19', AMBER = '#ffb547', BLUE = '#7aa2f7', TEAL = '#2ac3de', FG = '#e6e9ef', MUTED = '#9aa5ba', PANEL = '#151c2e';
    const H = pairStacks('modern').heading;
    const ring = [uid(), uid()];
    return numbered(build({ name: 'La ciudad: cómo crece', palette: 'midnight', fonts: 'modern', title: { size: 46, color: AMBER }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [deco(CITYNIGHT, 0, 0, 1280, 720, 'Una ciudad de noche vista desde arriba'), shape('rect', 0, 0, 1280, 720, BG, { fill2: '#0b0f19', opacity: 55 }),
        shape('rect', 0, 0, 760, 720, BG, { opacity: 80 })], extra: [
        kicker('GEOGRAFÍA URBANA · 3.º ESO', 80, 170, 500, TEAL, { fontSize: 18 }),
        text('CIUDADES', 70, 210, 680, 170, { fontFamily: H, fontSize: 124, fontWeight: 800, wordart: 'neon', wordartColor: AMBER, letterSpacing: 4 }),
        text('Cómo nacen, cómo crecen<br>y cómo se organizan', 80, 400, 620, 120, { fontSize: 34, color: FG, lineHeight: 1.25 }),
        after(shape('rect', 80, 390, 140, 4, AMBER), 'fade-right', { duration: 800 })],
        notes: 'Una ciudad cualquiera vista desde un avión de noche: las calles brillan y se adivina el río. Pregunta de arranque: ¿cuál es la calle más antigua de tu ciudad y cómo lo sabes?' },

      { title: 'Un planeta cada vez más urbano', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 60, y: 170, w: 800, h: 490, chartType: 'area', color: TEAL, grid: true, yMin: 0, yMax: 100, yTitle: '% de la población mundial', seriesName: 'Población urbana',
          data: series(['1950', '1970', '1990', '2010', '2030', '2050'], [30, 37, 43, 52, 60, 68]) }),
        on(stat('68 %', 'de la humanidad vivirá en ciudades en 2050, según las previsiones', 900, 190, 320, AMBER, FG, 110, { h: 280 }), 'zoom-in', { sound: 'chime' }),
        on(text('En 1950 era menos de un tercio. Desde 2007, más de la mitad.', 900, 470, 320, 120, { fontSize: 24, color: MUTED }), 'fade-up')],
        notes: 'Cifras redondeadas de las estimaciones de Naciones Unidas; de 2030 en adelante son previsiones. Pregunta: ¿por qué la gente se va a las ciudades?' },

      { title: 'Tres maneras de trazar las calles', layout: 'titleOnly', bg: BG, extra: [
        ...[['irregular', 'Irregular', 'Calles estrechas y torcidas que crecieron sin plan. Típico de los cascos antiguos.'],
          ['grid', 'Ortogonal', 'En cuadrícula, con calles rectas y paralelas. Típico de los ensanches del siglo XIX.'],
          ['radial', 'Radiocéntrico', 'Anillos alrededor de un centro, unidos por calles que salen como radios.']].map(([k, t, d], i) => [
          on(img(PLAN(k), 60 + i * 395, 180, 370, 308, `Plano ${t.toLowerCase()}`), 'zoom-in'),
          along(text(`<b style="color:${AMBER};font-size:28px">${t}</b><br>${d}`, 60 + i * 395, 505, 370, 160, { fontSize: 21, color: FG }), 'fade-up')]).flat()],
        notes: 'Un clic por plano. Muchas ciudades mezclan los tres: un casco irregular, un ensanche en cuadrícula y rondas que lo rodean.' },

      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        keep(shape('ellipse', 440, 160, 400, 400, AMBER, { opacity: 85 }), ring[0]),
        keep(text('Casco antiguo', 440, 320, 400, 80, { fontFamily: H, fontSize: 40, fontWeight: 800, color: BG, textAlign: 'center', vAlign: 'middle' }), ring[1]),
        text('Todo empezó aquí', 80, 70, 900, 70, { fontFamily: H, fontSize: 44, fontWeight: 800, color: FG }),
        text('Una plaza, un mercado, una iglesia o un castillo: el origen de la ciudad.', 80, 600, 1120, 50, { fontSize: 24, color: MUTED, textAlign: 'center' })],
        notes: 'El casco antiguo es el núcleo original. Pasa a la siguiente: con Transformar nos alejamos y vemos cómo creció la ciudad a su alrededor.' },

      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        text('Y la ciudad creció en anillos', 80, 70, 900, 70, { fontFamily: H, fontSize: 44, fontWeight: 800, color: FG }),
        on(shape('ellipse', 110, 165, 1060, 480, 'none', { stroke: BLUE, strokeWidth: 3, dash: 'dash' }), 'zoom-in'),
        along(text('Área metropolitana: pueblos unidos a la ciudad', 340, 186, 600, 36, { fontSize: 20, color: BLUE, textAlign: 'center' }), 'fade-in'),
        ...[[180, 400], [1050, 360], [300, 560], [960, 560]].map(([x, y]) => along(shape('ellipse', x, y, 40, 30, BLUE, { opacity: 60 }), 'zoom-in')),
        on(shape('ellipse', 260, 222, 760, 360, '#1f2a44', { stroke: TEAL, strokeWidth: 3 }), 'zoom-in'),
        along(text('Periferia: barrios nuevos, polígonos, centros comerciales', 330, 246, 620, 36, { fontSize: 20, color: TEAL, textAlign: 'center' }), 'fade-in'),
        on(shape('ellipse', 410, 290, 460, 224, '#2c3554', { stroke: '#bb9af7', strokeWidth: 3 }), 'zoom-in'),
        along(text('Ensanche: calles rectas', 470, 306, 340, 34, { fontSize: 20, color: '#d6c4ff', textAlign: 'center' }), 'fade-in'),
        keep(shape('ellipse', 565, 360, 150, 120, AMBER, { opacity: 85 }), ring[0]),
        keep(text('Casco', 565, 395, 150, 50, { fontFamily: H, fontSize: 24, fontWeight: 800, color: BG, textAlign: 'center', vAlign: 'middle' }), ring[1])],
        notes: 'Transformar encoge el casco antiguo y lo deja en el centro. Cada clic añade un anillo: el ensanche, la periferia y el área metropolitana, donde la ciudad se une con los pueblos de alrededor.' },

      { title: '¿Para qué sirve una ciudad?', layout: 'titleOnly', bg: BG, extra: [
        dg('radial', 'Ciudad\n  Vivir\n  Comprar\n  Trabajar\n  Gobernar\n  Aprender\n  Divertirse', 240, 160, 800, 510, { oneByOne: true, colors: 'colorful', fontScale: 1.2 })],
        notes: 'Las funciones urbanas: residencial, comercial, industrial, administrativa, educativa y de ocio. Pide un ejemplo de cada una en vuestra ciudad.' },

      { title: '¿Cómo nos movemos?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 40, y: 165, w: 640, h: 480, chartType: 'doughnut', color: TEAL,
          data: [{ label: 'A pie', value: 34, color: '#9ece6a' }, { label: 'Coche', value: 33, color: '#f7768e' }, { label: 'Transporte público', value: 22, color: BLUE }, { label: 'Bicicleta', value: 6, color: AMBER }, { label: 'Otros', value: 5, color: '#565f89' }] }),
        img(PLAN('grid'), 720, 190, 500, 417, 'Plano en cuadrícula'),
        withAnims(model('kh-ToyCar', 690, 545, 100, 100, { view: 'top', bleed: 1.3 }), path([[0, 0], [440, -2], [440, -380], [0, -380], [0, -2]], { duration: 6000, sound: 'whoosh' })),
        text('Viajes en un día laborable en una ciudad media (inventado)', 50, 650, 600, 36, { fontSize: 17, color: MUTED })],
        notes: 'Un clic: el coche da la vuelta a la manzana. Datos inventados, pero parecidos a los de muchas ciudades medianas: casi un tercio de los viajes se hace a pie. Pregunta: ¿cuántos de vosotros venís andando?' },

      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué mejorarías primero en tu barrio? Elige dos', x: 80, y: 50, w: 1120, h: 620,
        options: ['Más árboles y sombra', 'Carriles bici seguros', 'Autobús más frecuente', 'Plazas para jugar y sentarse', 'Menos coches aparcados en la acera'] })],
        notes: 'Votación con varias respuestas desde el móvil. Después, que cada grupo defienda una propuesta como si fuera al pleno del ayuntamiento.' },

      { layout: 'blank', bg: BG, extra: [quiz('Los ensanches del siglo XIX tienen casi siempre un plano…', ['Irregular', 'Ortogonal (en cuadrícula)', 'Radiocéntrico', 'Lineal'], 1, { fontSize: 38 })],
        notes: 'Concurso con puntos por rapidez. Las calles rectas facilitaban la luz, la ventilación y el tráfico de carruajes.' },
    ]));
  } },

  // 7 · Coasts and tides, by a lighthouse at night: a beam that sweeps the sea, the shapes of a coast named one by one,
  // a cliff worn into a cave, an arch and a stack, the tide as a line chart with its period, a tide table with
  // formulas, a coast to label, a quiz and a lifebuoy with curved text.
  edu_geo_coasts: { name: 'Costas y mareas', cat: 'edu', summary: 'Faro con haz que gira, formas de la costa una a una, acantilado que se erosiona, mareas en gráfico y tabla con fórmulas, etiquetar', make: () => {
    const NAVY = '#0f2940', SEA = '#14466b', FOAM = '#e9f3f8', SAND = '#e6cf9c', RED = '#d64541', LIGHT = '#fff3b0', MUTED = '#9fb8cc';
    const H = pairStacks('classic').heading;
    const tag = (t, x, y, w = 150) => text(t, x - w / 2, y - 18, w, 36, { fontSize: 19, fontWeight: 700, color: NAVY, bg: FOAM, radius: 18, textAlign: 'center', vAlign: 'middle', pad: [0, 8, 0, 8] });
    const hours = Array.from({ length: 13 }, (_, i) => i * 2), tide = hours.map(t => Math.round((2.1 + 1.6 * Math.cos(2 * Math.PI * (t - 6.2) / 12.42)) * 10) / 10);
    return numbered(build({ name: 'Costas y mareas', palette: 'ocean', fonts: 'classic', title: { size: 48, color: LIGHT }, body: { color: FOAM } }, [
      { layout: 'blank', bg: NAVY, transition: 'fade', back: [deco(STARS(1280, 420, 90, 11), 0, 0, 1280, 420, 'Estrellas'), shape('rect', -20, 560, 1320, 180, SEA)], extra: [
        after(deco(BEAM, 550, -270, 1000, 1000, 'Haz de luz del faro'), 'spin360', { duration: 8000 }),
        img(LIGHTHOUSE, 900, 140, 300, 560, 'Faro sobre las rocas'),
        ...Array.from({ length: 6 }, (_, i) => shape('curve', 40 + i * 140, 600 + (i % 2) * 30, 90, 24, 'none', { stroke: '#4a8ab8', strokeWidth: 3 })),
        kicker('GEOGRAFÍA FÍSICA · 1.º ESO', 84, 160, 500, LIGHT, { fontSize: 18 }),
        text('Costas<br>y mareas', 80, 200, 700, 240, { fontFamily: H, fontSize: 96, fontWeight: 700, color: '#ffffff', lineHeight: 1.02 }),
        text('Donde la tierra se encuentra con el mar', 84, 450, 700, 50, { fontFamily: H, fontSize: 30, fontStyle: 'italic', color: MUTED })],
        notes: 'Al llegar, el haz del faro barre la noche. Pregunta: ¿para qué sirve un faro si hoy los barcos llevan GPS? (Siguen siendo una referencia cuando todo falla.)' },

      { title: 'Las formas de la costa', layout: 'titleOnly', bg: NAVY, extra: [
        img(COAST(), 90, 170, 1100, 480, 'Mapa de una costa con península, istmo, golfo, cabo, bahía, isla, playa y acantilado'),
        ...[['Península', 194, 320], ['Istmo', 194, 452], ['Golfo', 510, 545], ['Playa', 510, 630], ['Cabo', 740, 340], ['Bahía', 922, 545], ['Isla', 970, 250], ['Acantilado', 1100, 465]].map(([t, x, y]) =>
          on(tag(t, x, y), 'zoom-in', { sound: 'pop' }))],
        notes: 'Un clic por forma. Truco: la península casi es una isla (pen-ínsula); el istmo es el cuello que la une; el golfo es una bahía muy grande; el cabo, la punta que se mete en el mar.' },

      { title: 'El mar esculpe los acantilados', layout: 'titleOnly', bg: NAVY, extra: [
        ...[['1 · Cueva', 'Las olas golpean la roca blanda y abren un hueco.'], ['2 · Arco', 'La cueva atraviesa el cabo de lado a lado.'], ['3 · Farallón', 'El techo del arco se hunde: queda una columna en el mar.']].map(([t, d], i) => [
          (i ? after : on)(img(CLIFF(i), 60 + i * 400, 180, 360, 318, t), 'fade-up'),
          along(text(`<b style="color:${LIGHT};font-size:28px">${t}</b><br>${d}`, 60 + i * 400, 515, 360, 120, { fontSize: 21, color: FOAM }), 'fade-up')]).flat(),
        ...[0, 1].map(i => shape('arrow', 425 + i * 400, 320, 30, 30, LIGHT, { stroke: LIGHT, strokeWidth: 3 })),
        text('En rocas blandas, la costa puede retroceder más de un metro al año.', 60, 640, 1160, 40, { fontSize: 19, color: MUTED, fontStyle: 'italic' })],
        notes: 'Un clic y las tres etapas aparecen encadenadas. Son siglos de trabajo de las olas. Si tenéis cerca una costa con farallones, este es el momento de enseñar una foto propia.' },

      { title: 'La marea sube y baja', layout: 'titleOnly', bg: NAVY, extra: [
        chartBlock({ x: 60, y: 170, w: 780, h: 490, chartType: 'line', color: '#50e3c2', grid: true, yMin: 0, yMax: 4.5, yTitle: 'Altura del agua (m)', seriesName: 'Un día en el puerto',
          data: series(hours.map(String), tide), xTitle: 'hora del día' }),
        mathBlock({ x: 880, y: 190, w: 340, h: 90, fontSize: 40, latex: 'T \\approx 12\\,\\text{h}\\ 25\\,\\text{min}', color: LIGHT }),
        text('entre una pleamar y la siguiente', 880, 285, 340, 40, { fontSize: 20, color: MUTED, textAlign: 'center' }),
        on(card('<b>Pleamar</b>: el agua llega a lo más alto.<br><b>Bajamar</b>: a lo más bajo.<br>Dos de cada al día.', 880, 350, 340, 180, '#123a5c', { fontSize: 22, color: FOAM, radius: 14 }), 'fade-up'),
        on(icon('moon', 1010, 555, 80, LIGHT), 'pulse', { start: 'afterPrev' })],
        notes: 'La Luna atrae el agua del océano y forma dos «abultamientos»: por eso hay dos pleamares al día. Cada día la marea llega unos 50 minutos más tarde. Curva calculada para un puerto inventado.' },

      { title: 'Tabla de mareas', layout: 'titleOnly', bg: NAVY, extra: [
        tableBlock({ x: 60, y: 170, w: 740, h: 440, fontSize: 24, header: true, headBg: '#4a90d9', headFg: '#ffffff', stroke: '#2a5578', banded: true, band: '#7fb8e6',
          rows: [['Día', 'Pleamar (m)', 'Bajamar (m)', 'Diferencia (m)'], ['Lunes', '3,8', '0,6', '=B2-C2'], ['Martes', '4,1', '0,3', '=B3-C3'], ['Miércoles', '4,3', '0,1', '=B4-C4'],
            ['Jueves', '3,9', '0,5', '=B5-C5'], ['Viernes', '3,4', '1,0', '=B6-C6'], ['<b>Media</b>', '=REDONDEAR(PROMEDIO(ARRIBA);1)', '=REDONDEAR(PROMEDIO(ARRIBA);1)', '=REDONDEAR(PROMEDIO(ARRIBA);1)']], colW: [2.4, 2.4, 2.4, 2.6] }),
        text('Puerto inventado. La columna de la derecha y la fila de medias son fórmulas.', 60, 625, 740, 40, { fontSize: 18, color: MUTED }),
        on(card(`<b style="color:${LIGHT}">Mareas vivas</b><br>Con luna llena o nueva, el Sol y la Luna tiran a la vez: la diferencia es máxima (miércoles).`, 840, 170, 380, 210, '#123a5c', { fontSize: 22, color: FOAM, radius: 14 }), 'fade-left'),
        on(card(`<b style="color:${RED}">¡Cuidado!</b><br>Mira la tabla antes de caminar por la arena o las rocas: la marea sube más deprisa de lo que parece.`, 840, 400, 380, 210, '#123a5c', { fontSize: 22, color: FOAM, radius: 14 }), 'fade-left')],
        notes: 'Las tablas de mareas se publican para cada puerto. Cambia una cifra: la diferencia y la media se recalculan solas.' },

      { layout: 'blank', bg: NAVY, extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Pon nombre a cada forma de la costa', x: 80, y: 50, w: 1120, h: 620,
        image: COAST(), options: ['Península', 'Istmo', 'Golfo', 'Cabo', 'Bahía', 'Isla'],
        points: [{ x: 9.5, y: 31 }, { x: 9.5, y: 58 }, { x: 38, y: 76 }, { x: 59, y: 44 }, { x: 75.5, y: 76 }, { x: 80, y: 29 }] })],
        notes: 'Etiquetar desde el móvil, con corrección automática. Golfo y bahía se confunden: el golfo es mucho más grande y abierto.' },

      { layout: 'blank', bg: NAVY, extra: [quiz('¿Qué provoca, sobre todo, las mareas?', ['El viento', 'La atracción de la Luna', 'Las corrientes marinas', 'El agua de los ríos'], 1, { fontSize: 40 })],
        notes: 'Concurso por rapidez. El Sol también influye, pero menos: por eso las mareas vivas coinciden con luna llena y luna nueva.' },

      { layout: 'blank', bg: NAVY, transition: 'zoom', back: [shape('rect', -20, 560, 1320, 180, SEA)], extra: [
        after(img(LIFEBUOY, 120, 140, 400, 400, 'Salvavidas'), 'spin360', { duration: 1600 }),
        text('OLAS · MAREAS · CORRIENTES · VIENTO · ', 90, 110, 460, 460, { fontFamily: H, fontSize: 26, curve: 100, color: LIGHT, textAlign: 'center', letterSpacing: 3 }),
        text('El mar siempre<br>tiene la última palabra.', 600, 220, 620, 200, { fontFamily: H, fontSize: 52, fontStyle: 'italic', color: '#ffffff', lineHeight: 1.15 }),
        text('Próxima clase: los ríos que llegan al mar.', 604, 440, 600, 50, { fontSize: 24, color: MUTED })],
        notes: 'Cierre con el salvavidas y su texto en círculo (Cuadro de texto ▸ Efectos de texto ▸ Curvar texto). Enlaza con la desembocadura de los ríos: deltas y estuarios.' },
    ]));
  } },

  // 8 · Mountains, as a vintage alpine poster: the parts of a mountain named one by one, temperature against
  // altitude as an equation and a table with formulas, the vegetation belts as a pyramid diagram, a walker climbing
  // to the summit (3D), the highest peaks in a bar chart, putting peaks in order and a quiz.
  edu_geo_mountains: { name: 'Las montañas', cat: 'edu', summary: 'Cartel alpino: partes del relieve una a una, ecuación y tabla de temperatura, pisos en pirámide, excursionista 3D que sube y ordenar', make: () => {
    const CREAM = '#f4ecd8', RED = '#c8432b', INK = '#1d2a36', SLATE = '#3d5a73', PINE = '#2f4f3a', MUTED = '#6b6458', SNOW = '#fbfaf5';
    const G = "Georgia, 'Times New Roman', serif", V = 'Verdana, Geneva, sans-serif';
    const hiker = lib3d('kn-character');
    const climb = [[60, 620], [300, 520], [520, 420], [700, 320], [860, 220], [980, 140]];
    const tag = (t, x, y) => text(t, x, y, 170, 40, { fontFamily: G, fontSize: 22, fontWeight: 700, color: SNOW, bg: RED, radius: 4, textAlign: 'center', vAlign: 'middle', pad: [0, 6, 0, 6] });
    return numbered(build({ name: 'Las montañas', palette: 'grayscale', fonts: 'websafe', title: { size: 48, color: RED, font: G }, body: { color: INK, font: V } }, [
      { layout: 'blank', bg: CREAM, transition: 'fade', back: [deco(POSTER(), 0, 0, 1280, 720, 'Cartel de montañas')], extra: [
        text('LAS MONTAÑAS', 70, 60, 1000, 110, { fontFamily: G, fontSize: 76, fontWeight: 700, color: RED, letterSpacing: 8 }),
        text('Un viaje de 0 a 8.849 metros', 76, 180, 700, 50, { fontFamily: G, fontSize: 32, fontStyle: 'italic', color: INK }),
        shape('rect', 0, 630, 1280, 90, CREAM),
        text('GEOGRAFÍA FÍSICA · 1.º ESO', 70, 650, 700, 50, { fontFamily: V, fontSize: 22, letterSpacing: 6, color: INK, vAlign: 'middle' })],
        notes: 'Portada con aire de cartel de viajes antiguo: colores planos, sin degradados en las montañas. Pregunta de arranque: ¿cuál es la montaña más alta que has visto con tus propios ojos?' },

      { title: 'Las partes de una montaña', layout: 'titleOnly', bg: CREAM, extra: [
        img(MOUNTAIN, 140, 180, 1000, 420, 'Dos cumbres unidas por un collado, sus laderas y un valle con un río'),
        ...[['Cima', 355, 190], ['Collado', 385, 360], ['Ladera', 160, 400], ['Valle', 960, 470], ['Pie', 760, 560]].map(([t, x, y]) => on(tag(t, x, y), 'fade-down', { sound: 'click' })),
        text('Cima: el punto más alto · Collado: el paso entre dos cimas · Ladera: la pendiente · Valle: la zona baja por donde corre el agua · Pie: donde empieza la subida.', 140, 615, 1000, 70, { fontSize: 18, color: MUTED })],
        notes: 'Un clic por parte. Los collados han sido siempre los pasos naturales de caminos, cañadas y carreteras.' },

      { title: 'Cuanto más alto, más frío', layout: 'titleOnly', bg: CREAM, extra: [
        mathBlock({ x: 70, y: 180, w: 560, h: 100, fontSize: 46, latex: 'T_h = T_0 - 6{,}5 \\cdot h', color: INK }),
        text('<b>T₀</b>: temperatura abajo (°C) · <b>h</b>: altura que subimos (km)', 70, 285, 560, 60, { fontSize: 20, color: MUTED }),
        tableBlock({ x: 70, y: 360, w: 560, h: 300, fontSize: 22, header: true, headBg: SLATE, headFg: SNOW, stroke: '#d8ccb0', banded: true, band: '#e8dcc0',
          rows: [['Altura (km)', 'Temperatura (°C)'], ['0', '=20-6,5*A2'], ['1', '=20-6,5*A3'], ['2', '=20-6,5*A4'], ['3', '=20-6,5*A5'], ['4', '=20-6,5*A6']], colW: [1, 1] }),
        on(card(`<b style="font-family:${G};font-size:28px;color:${RED}">Por eso hay nieve en verano</b><br>Con 20 °C en el valle, a 3 km de altura apenas pasamos de 0 °C.`, 690, 180, 520, 220, '#ffffff', { fontSize: 23, color: INK, radius: 4, borderColor: '#d8ccb0' }), 'fade-left'),
        on(icon('snowflake', 900, 450, 120, SLATE), 'spin360', { start: 'afterPrev', duration: 1500 })],
        notes: 'El aire se enfría unos 6,5 °C por cada kilómetro que subimos. La segunda columna de la tabla son fórmulas: cambia el 20 por la temperatura de hoy en tu pueblo.' },

      { title: 'Los pisos de vegetación', layout: 'titleOnly', bg: CREAM, extra: [
        dg('pyramid', 'Nieve\nRoquedo\nPrados alpinos\nBosque de coníferas\nBosque de hayas y robles\nCultivos y prados', 80, 170, 700, 500, { oneByOne: true, colors: 'accent', fontScale: 0.9 }),
        text('Al subir, el paisaje cambia por franjas: como si viajáramos hacia el norte.', 830, 200, 380, 160, { fontFamily: G, fontSize: 30, fontStyle: 'italic', color: INK }),
        text('Las alturas de cada piso cambian según la montaña y la orientación de la ladera (solana o umbría).', 830, 400, 380, 140, { fontSize: 20, color: MUTED })],
        notes: 'Un clic por piso, de la cumbre hacia abajo. En una montaña de la península, los prados alpinos empiezan hacia los 2.000 metros; en los Alpes, algo más abajo por estar más al norte.' },

      { layout: 'blank', bg: CREAM, transition: 'fade', back: [deco(RIDGE, 0, 0, 1280, 720, 'Ladera que sube hasta una cumbre con bandera')], extra: [
        text('Rumbo a la cumbre', 70, 60, 600, 70, { fontFamily: G, fontSize: 48, fontWeight: 700, color: RED }),
        withAnims(model('kn-character', climb[0][0] - 50, climb[0][1] - 130, 100, 130, { walk: { clip: hiker.walk, end: hiker.arrive, endOnce: true, face: true, look: true } }),
          path(rel(smooth(climb, 6)), { duration: 7000 })),
        ...[['1.000 m · bosque', 330, 440], ['2.000 m · prados', 560, 340], ['3.000 m · roca y nieve', 740, 240]].map(([t, x, y], i) =>
          after(text(t, x, y, 300, 40, { fontSize: 20, fontWeight: 700, color: INK, bg: SNOW, radius: 20, textAlign: 'center', vAlign: 'middle' }), 'fade-down', { delay: i ? 1400 : 1200 })),
        text('Clic: empieza la subida', 70, 140, 360, 40, { fontSize: 20, color: MUTED })],
        notes: 'Un clic: la excursionista sube por la ladera y salta al llegar a la cumbre. Por el camino aparecen los pisos: cada mil metros, otro paisaje.' },

      { title: 'Las más altas de cada continente', layout: 'titleOnly', bg: CREAM, extra: [
        chartBlock({ x: 60, y: 170, w: 820, h: 500, chartType: 'hbar', color: SLATE, dataLabels: true, xTitle: 'metros',
          data: [{ label: 'Everest (Asia)', value: 8849 }, { label: 'Aconcagua (América)', value: 6961 }, { label: 'Kilimanjaro (África)', value: 5895 }, { label: 'Elbrús (Europa)', value: 5642 },
            { label: 'Vinson (Antártida)', value: 4892 }, { label: 'Puncak Jaya (Oceanía)', value: 4884 }, { label: 'Teide (España)', value: 3715, color: RED }, { label: 'Mulhacén (península)', value: 3479, color: RED }] }),
        on(stat('8.849 m', 'El Everest: allí arriba el aire tiene un tercio del oxígeno que al nivel del mar', 920, 200, 300, RED, INK, 56, { h: 300 }), 'zoom-in')],
        notes: 'Las dos últimas barras son las cumbres de España: el Teide (en Canarias) y el Mulhacén (en Sierra Nevada), la más alta de la península.' },

      { layout: 'blank', bg: CREAM, extra: [pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena de más alta a más baja', x: 80, y: 50, w: 1120, h: 620,
        options: ['Everest', 'Aconcagua', 'Kilimanjaro', 'Mont Blanc', 'Teide', 'Mulhacén'] })],
        notes: 'Ordenar desde el móvil, con nota automática. El Mont Blanc (unos 4.806 m) es la trampa: no está en el gráfico anterior.' },

      { layout: 'blank', bg: CREAM, extra: [quiz('Al pie de una montaña hay 20 °C. ¿Cuántos grados habrá unos 2.000 m más arriba?', ['Unos 7 °C', 'Unos 18 °C', 'Unos 0 °C', 'Unos −20 °C'], 0, { fontSize: 36 })],
        notes: 'Concurso por rapidez: 20 − 6,5 × 2 = 7 °C.' },

      { layout: 'blank', bg: CREAM, transition: 'zoom', back: [deco(POSTER(), 0, 0, 1280, 720, 'Cartel de montañas')], extra: [
        shape('rect', 0, 520, 1280, 200, CREAM, { opacity: 92 }),
        after(text('NOS VEMOS EN LA CUMBRE', 70, 550, 1140, 90, { fontFamily: G, fontSize: 56, fontWeight: 700, color: RED, letterSpacing: 4, textAlign: 'center' }), 'fade-up', { sound: 'chime' }),
        text('Próxima clase: cómo se forman las cordilleras', 70, 650, 1140, 40, { fontSize: 22, color: INK, textAlign: 'center' })],
        notes: 'Cierre con el cartel. Enlaza con la tectónica de placas: las montañas también nacen y mueren.' },
    ]));
  } },

  // 9 · Time zones, as an airport departures board: rows that flip in one after another, the Earth turning with
  // its equation, noon travelling west over 24 bands, a table with formulas for local times, the date line with a
  // 3D watch, a quiz, fill in the gaps and a challenge with a countdown.
  edu_geo_timezones: { name: 'Husos horarios', cat: 'edu', summary: 'Panel de aeropuerto con filas que giran, Tierra que rota con ecuación, Sol que cruza los husos, tabla con fórmulas, reloj 3D y huecos', make: () => {
    const BG = '#101317', BOARD = '#1a1d22', FLAP = '#24282f', YEL = '#ffcf3f', FG = '#f2f2f2', MUTED = '#8a96a8', RED = '#f7768e', GREEN = '#4caf7d';
    const H = pairStacks('tech').heading;
    const rows = [['MADRID', '12:00', 'UTC+1'], ['LONDRES', '11:00', 'UTC+0'], ['NUEVA YORK', '06:00', 'UTC−5'], ['TOKIO', '20:00', 'UTC+9'], ['SÍDNEY', '21:00', 'UTC+10'], ['HONOLULU', '01:00', 'UTC−10']];
    const flap = (t, x, y, w, color = YEL) => text(t, x, y, w, 50, { fontFamily: MONO, fontSize: 30, fontWeight: 700, color, bg: FLAP, radius: 4, vAlign: 'middle', pad: [0, 14, 0, 14], letterSpacing: 2 });
    return numbered(build({ name: 'Husos horarios', palette: 'revela', fonts: 'tech', title: { size: 46, color: YEL }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        text('Husos horarios', 80, 50, 800, 90, { fontFamily: H, fontSize: 68, fontWeight: 700, color: FG }),
        text('¿Qué hora es ahora mismo en el resto del mundo?', 84, 140, 900, 50, { fontSize: 28, color: MUTED }),
        shape('rect', 60, 210, 1160, 460, BOARD, { radius: 12 }),
        ...[['CIUDAD', 90], ['HORA', 680], ['HUSO', 900]].map(([t, x]) => text(t, x, 225, 300, 34, { fontFamily: MONO, fontSize: 18, color: MUTED, letterSpacing: 4 })),
        ...rows.map(([c, h, u], i) => [after(flap(c, 90, 265 + i * 66, 560), 'flip', { duration: 380, sound: 'click' }), along(flap(h, 680, 265 + i * 66, 190, FG), 'flip', { duration: 380 }),
          along(flap(u, 900, 265 + i * 66, 290, i === 0 ? GREEN : MUTED), 'flip', { duration: 380 })]).flat()],
        notes: 'Al llegar, el panel se rellena fila a fila, como en un aeropuerto. Horas en horario de invierno de Europa. Pregunta: si llamas a Tokio a las 12 del mediodía, ¿les pillas comiendo o cenando?' },

      { title: 'La Tierra gira: 15° cada hora', layout: 'titleOnly', bg: BG, extra: [
        after(img(GLOBE, 820, 190, 380, 380, 'Globo terráqueo con meridianos'), 'spin360', { duration: 4000 }),
        mathBlock({ x: 80, y: 200, w: 680, h: 120, fontSize: 56, latex: '\\frac{360^\\circ}{24\\ \\text{h}} = 15^\\circ/\\text{h}', color: YEL }),
        on(text('La Tierra da una vuelta completa (360°) en un día. Por eso el mundo se divide en <b>24 husos</b> de 15° cada uno.', 80, 360, 680, 130, { fontSize: 26, color: FG }), 'fade-up'),
        on(text('Gira hacia el este: el Sol sale antes en Tokio que en Madrid, y en Madrid antes que en Nueva York.', 80, 500, 680, 130, { fontSize: 26, color: MUTED }), 'fade-up')],
        notes: 'El globo da una vuelta al llegar. Haz la cuenta con ellos: 360 entre 24. Es la clave de todo lo demás.' },

      { title: 'El mediodía viaja hacia el oeste', layout: 'titleOnly', bg: BG, extra: [
        img(BANDS, 64, 180, 1152, 360, 'El mundo dividido en 24 husos horarios'),
        withAnims(icon('sun', 1100, 250, 64, YEL), path([[-1080, 0]], { duration: 6000, start: 'afterPrev' })),
        text('Meridiano de Greenwich (UTC 0)', 430, 550, 380, 36, { fontSize: 19, color: YEL, textAlign: 'center' }),
        text('Línea internacional de cambio de fecha', 830, 550, 390, 36, { fontSize: 19, color: RED, textAlign: 'right' }),
        text('Cada franja es un huso de 15°. Los números son las horas que se suman o se restan a la de Greenwich.', 64, 600, 1152, 70, { fontSize: 22, color: MUTED })],
        notes: 'El Sol recorre los husos de este a oeste: es el mediodía que viaja. En la realidad los límites de los husos se tuercen para seguir las fronteras de los países.' },

      { title: '¿Qué hora es allí?', layout: 'titleOnly', bg: BG, extra: [
        text('Cuando en Londres son las 12:00…', 70, 160, 760, 44, { fontSize: 26, color: MUTED }),
        tableBlock({ x: 70, y: 215, w: 760, h: 440, fontSize: 23, header: true, headBg: YEL, headFg: BG, stroke: '#2c323b', banded: true, band: '#2a2f38',
          rows: [['Ciudad', 'Huso (h)', 'Hora local'], ['Londres', '0', '=12+B2'], ['Madrid', '+1', '=12+B3'], ['Moscú', '+3', '=12+B4'], ['Pekín', '+8', '=12+B5'], ['Tokio', '+9', '=12+B6'], ['Nueva York', '−5', '=12+B7'], ['Los Ángeles', '−8', '=12+B8']], colW: [3, 2, 2] }),
        on(card(`<b style="color:${YEL};font-size:28px">La regla</b><br>Hora local = hora de Greenwich + huso.<br><br>La columna de la derecha son fórmulas: cambia un huso y se recalcula.`, 880, 215, 340, 300, '#1f242c', { fontSize: 22, color: FG, radius: 12 }), 'fade-left'),
        on(icon('plane', 1000, 545, 90, YEL), 'path', { start: 'afterPrev', pathShape: 'custom', points: [[0, 0], [60, -30], [120, 0]], dx: 120, dy: 0, duration: 1500 })],
        notes: 'Horario de invierno. Si el resultado pasa de 24 o baja de 0, hay que cambiar de día: lo vemos en la siguiente.' },

      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        model('kh-ChronographWatch', 760, 120, 460, 480, { autoRotate: true, spin: 14, view: 'front', motion: 'float' }),
        kicker('LÍNEA DE CAMBIO DE FECHA', 80, 120, 600, RED, { fontSize: 18 }),
        text('Un día que se gana<br>o se pierde', 76, 160, 640, 170, { fontFamily: H, fontSize: 58, fontWeight: 700, color: FG, lineHeight: 1.05 }),
        on(card(`<b style="color:${YEL}">Hacia el oeste → +1 día</b><br>Sales de Los Ángeles el lunes y cruzas el Pacífico: llegas el miércoles a Japón.`, 80, 360, 620, 130, '#1f242c', { fontSize: 22, color: FG, radius: 12 }), 'fade-right'),
        on(card(`<b style="color:${RED}">Hacia el este → −1 día</b><br>De vuelta, puedes aterrizar «antes» de haber despegado.`, 80, 510, 620, 110, '#1f242c', { fontSize: 22, color: FG, radius: 12 }), 'fade-right')],
        notes: 'La línea sigue más o menos el meridiano 180°, en mitad del Pacífico, y se desvía para no partir países. El reloj 3D se puede girar con el ratón.' },

      { layout: 'blank', bg: BG, extra: [quiz('En Madrid (UTC+1) son las 10:00. ¿Qué hora es en Nueva York (UTC−5)?', ['04:00', '05:00', '15:00', '16:00'], 0, { fontSize: 36 })],
        notes: 'Concurso por rapidez: hay 6 horas de diferencia (de +1 a −5) y Nueva York va por detrás: 10 − 6 = 4.' },

      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', fontSize: 38, x: 80, y: 50, w: 1120, h: 620, question: 'Completa las frases',
        text: 'La Tierra gira [15] grados cada hora. El mundo se divide en [24] husos. Si viajas hacia el [este], tienes que adelantar el reloj.' })],
        notes: 'Completar huecos desde el móvil: no distingue mayúsculas ni tildes. Repasa la última con el ejemplo de Tokio.' },

      { title: 'Reto: el reloj de la clase', layout: 'titleOnly', bg: BG, extra: [
        text(ul('Son las 9:00 en Madrid. ¿Qué hora es en Pekín (+8)?', 'Un partido empieza a las 20:00 en Nueva York (−5). ¿A qué hora lo ves en Madrid?', 'Sales de Madrid a las 10:00 y el vuelo a Tokio (+9) dura 14 horas. ¿A qué hora llegas?'), 70, 180, 740, 450, { fontSize: 26, color: FG }),
        timer(120, 880, 190, 320, { color: YEL, endText: '¡Tiempo!' }),
        text('2 minutos, por parejas', 860, 530, 360, 44, { fontSize: 22, color: MUTED, textAlign: 'center' })],
        notes: 'Reto con cuenta atrás de dos minutos. Soluciones: 16:00 (9 − 1 + 8); a las 2:00 de la madrugada del día siguiente (20 + 6); a las 8:00 del día siguiente, hora de Tokio (10 + 14 + 8 = 32 → 8:00).' },
    ]));
  } },

  // 10 · Continents and oceans for primary school, as a children's jigsaw atlas: the continents pop in one by one with a
  // sound, seven or six, a treemap of their sizes, a doughnut of the oceans, a robot walking round the world (3D),
  // matching animals, labelling the map, a quiz and a closing in Text Art with applause.
  edu_geo_continents: { name: 'Continentes y océanos', cat: 'edu', summary: 'Atlas infantil: continentes que aparecen con sonido, mapa de árbol, dona de océanos, robot 3D que cruza el mundo, unir y etiquetar', make: () => {
    const SEA = '#5ec4f0', DEEP = '#24527a', WHITE = '#ffffff', INK = '#1d3557', YEL = '#ffc93c', PANEL = '#e9f7fd';
    const H = pairStacks('friendly').heading;
    const MX = 90, MY = 165, waves = () => [deco(svgURL(1280, 720, Array.from({ length: 40 }, (_, i) => `<path d="M${(i * 173) % 1260} ${20 + (i * 97) % 690} q10 -7 20 0 t20 0" stroke="#ffffff" stroke-width="3" fill="none" opacity=".35"/>`).join('')), 0, 0, 1280, 720, 'Olas')];
    const robot = lib3d('three-RobotExpressive');
    const eq = Array.from({ length: 9 }, (_, i) => [MX + 60 + i * 120, MY + 300 + (i % 2 ? -14 : 0)]);
    return numbered(build({ name: 'Continentes y océanos', palette: 'office', fonts: 'friendly', title: { size: 50, color: DEEP }, body: { color: INK } }, [
      { layout: 'blank', bg: SEA, transition: 'fade', back: waves(), extra: [
        text('Continentes y océanos', 80, 26, 1120, 90, { fontFamily: H, fontSize: 64, fontWeight: 800, color: WHITE, textAlign: 'center', shadow: true }),
        text('Geografía · 3.º de primaria', 80, 118, 1120, 40, { fontSize: 24, color: DEEP, textAlign: 'center', fontWeight: 700 }),
        ...CONTINENTS.map(([n], i) => after(img(contSVG(i), MX, MY, 1100, 520, n, { decorative: i > 0, alt: i ? n : 'Mapa del mundo con los continentes de colores' }), 'bounce', { sound: 'pop', duration: 500 }))],
        notes: 'Al llegar, los continentes aparecen uno a uno con un «pop», como piezas de un puzle. Pregunta: ¿cuál es el nuestro? ¿Y cuál es el más grande?' },

      { title: '¿Siete o seis?', layout: 'titleOnly', bg: WHITE, extra: [
        on(card(`<div style="font-size:150px;font-weight:800;line-height:1;color:#d9481b">7</div><b>Siete continentes</b><br>Si contamos América del Norte y América del Sur por separado.`, 90, 200, 520, 340, PANEL, { fontSize: 26, color: INK, textAlign: 'center', radius: 30 }), 'flip', { sound: 'pop' }),
        on(card(`<div style="font-size:150px;font-weight:800;line-height:1;color:#158a5c">6</div><b>Seis continentes</b><br>Si juntamos toda América en uno solo, como se hace en muchos libros.`, 670, 200, 520, 340, PANEL, { fontSize: 26, color: INK, textAlign: 'center', radius: 30 }), 'flip', { sound: 'pop' })],
        notes: 'Las dos formas de contar son correctas: depende del país y del libro. Lo importante es saber por qué.' },

      { title: '¿Cuál es el más grande?', layout: 'titleOnly', bg: WHITE, extra: [
        chartBlock({ x: 70, y: 170, w: 820, h: 490, chartType: 'treemap', color: DEEP, dataLabels: true,
          data: [['Asia', 44.6], ['África', 30.4], ['América del Norte', 24.7], ['América del Sur', 17.8], ['Antártida', 14.2], ['Europa', 10.2], ['Oceanía', 8.5]].map(([label, value]) => ({ label, value, color: CONTINENTS.find(c => c[0] === label)[1] === '#ffffff' ? '#cfd8e3' : CONTINENTS.find(c => c[0] === label)[1] })) }),
        on(stat('Asia', 'es el más grande: casi un tercio de toda la tierra firme', 930, 200, 290, DEEP, INK, 80, { h: 260 }), 'zoom-in', { sound: 'chime' }),
        text('Millones de km², redondeados', 930, 560, 290, 40, { fontSize: 18, color: '#5c6f82' })],
        notes: 'Cada rectángulo es tan grande como el continente. Europa es de los pequeños: solo Oceanía es menor.' },

      { title: 'Mucha más agua que tierra', layout: 'titleOnly', bg: WHITE, extra: [
        chartBlock({ x: 60, y: 160, w: 640, h: 500, chartType: 'doughnut', color: DEEP,
          data: [{ label: 'Pacífico', value: 165, color: '#1e6fa8' }, { label: 'Atlántico', value: 106, color: '#3a9bd9' }, { label: 'Índico', value: 73, color: '#6cc3ef' }, { label: 'Antártico', value: 20, color: '#a9def7' }, { label: 'Ártico', value: 14, color: '#d4effb' }] }),
        on(stat('71 %', 'de la Tierra está cubierta de agua', 760, 190, 440, '#1e6fa8', INK, 120), 'zoom-in', { sound: 'whoosh' }),
        on(text('El Pacífico solo es más grande que todos los continentes juntos.', 760, 480, 440, 120, { fontSize: 26, color: INK }), 'fade-up')],
        notes: 'Cinco océanos, en millones de km² redondeados. Juego: si lanzas una pelota hinchable que es un globo terráqueo, casi siempre la cogerás con el dedo sobre agua.' },

      { layout: 'blank', bg: SEA, transition: 'fade', back: waves(), extra: [
        img(contSVG(null, { mono: '#bfe3f2' }), MX, MY, 1100, 520, 'Mapa del mundo'),
        text('La vuelta al mundo a pie', 80, 40, 800, 70, { fontFamily: H, fontSize: 46, fontWeight: 800, color: WHITE }),
        withAnims(model('three-RobotExpressive', eq[0][0] - 60, eq[0][1] - 150, 120, 160, { walk: { clip: robot.walk, end: robot.arrive, endOnce: true, face: true, look: true } }), path(rel(smooth(eq, 6)), { duration: 8000 })),
        on(card(`<b style="font-size:40px;color:${DEEP}">40.075 km</b><br>mide la vuelta por el ecuador. Andando 8 horas al día… ¡unos 1.000 días!`, 840, 110, 380, 200, WHITE, { fontSize: 22, color: INK, radius: 24 }), 'fade-left', { start: 'afterPrev' })],
        notes: 'Un clic: el robot cruza el mapa por el ecuador y saluda al llegar. Cuenta: 40.075 km entre 40 km al día salen unos 1.000 días, ¡casi tres años!' },

      { layout: 'blank', bg: WHITE, extra: [pollBlock({ kind: 'match', fontSize: 32, question: '¿En qué continente vive cada animal?', x: 80, y: 50, w: 1120, h: 620,
        options: ['Canguro = Oceanía', 'Pingüino emperador = Antártida', 'Jirafa = África', 'Panda gigante = Asia', 'Llama = América del Sur'] })],
        notes: 'Unir parejas desde el móvil o la tableta, con corrección automática. Pide después otro animal de Europa.' },

      { layout: 'blank', bg: WHITE, extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Pon su nombre a cada continente', x: 80, y: 50, w: 1120, h: 620,
        image: contSVG(null, { sea: true }), options: CONTINENTS.map(c => c[0]),
        points: CONTINENTS.map(c => { const [x, y] = WG(...c[3]); return { x: Math.round(x / 11), y: Math.round(y / 5.2) }; }) })],
        notes: 'Etiquetar el mapa desde el móvil: se corrige solo. Los colores ayudan a los más pequeños a recordar cada continente.' },

      { layout: 'blank', bg: WHITE, extra: [quiz('¿Cuál es el océano más grande?', ['El Atlántico', 'El Índico', 'El Pacífico', 'El Ártico'], 2, { fontSize: 44 })],
        notes: 'Concurso con puntos por rapidez. Pista si hace falta: el de la dona más grande.' },

      { layout: 'blank', bg: SEA, transition: 'zoom', back: waves(), extra: [
        img(contSVG(null), 190, 260, 900, 425, 'Mapa del mundo con los continentes de colores', { opacity: 85 }),
        after(text('¡Buen viaje, exploradores!', 80, 70, 1120, 160, { fontFamily: H, fontSize: 84, fontWeight: 800, wordart: 'gradient', textAlign: 'center' }), 'zoom-in', { sound: 'applause' })],
        notes: 'Cierre con aplausos. Tarea: traer de casa algo (una foto, un objeto, una postal) que venga de otro continente.' },
    ]));
  } },

};
