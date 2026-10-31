// A compact way to write the example presentations of the second thousand (templates/creative_b.js, data_b.js,
// sci_b.js, edu_b.js …): each one is data — a palette, a cover, and slides of a few kinds (cards, steps, numbers, chart,
// table, comparison, timeline, picture + points, vote, quiz, statement) — and this file draws them with the kit.
// Drawings are ours (SVG as data URLs; no outside pictures). Texts are Spanish; the rest is translated with them.

import { build, text, card, shape, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, pollBlock, base, deep, model, nasa, pairStacks, uid } from '../templates/kit.js';

const ICONS3D = new URL('../../../../assets/icons3d/', import.meta.url).href;

const svgURL = (w, h, body) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });

// ---- Drawings: 340 × 400, three colours -------------------------------------------------------------
const P = (d, f, extra = '') => `<path d="${d}" fill="${f}" ${extra}/>`;
const R = (x, y, w, h, f, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${extra}/>`;
const C = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${extra}/>`;
const L = (x1, y1, x2, y2, s, w = 8) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;
const ART = {
  bars: ([a, b, c]) => [60, 120, 90, 190, 150, 250].map((h, i) => R(30 + i * 48, 340 - h, 34, h, [a, b, c][i % 3], 8)).join('') + L(20, 346, 320, 346, '#9aa3b2', 6),
  wave: ([a, b, c]) => [a, b, c].map((col, i) => `<path d="M10 ${150 + i * 55} q40 -70 80 0 t80 0 t80 0 t80 0" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`).join('') + C(170, 320, 26, a, 'opacity=".25"'),
  grid: ([a, b, c]) => Array.from({ length: 16 }, (_, i) => R(30 + (i % 4) * 74, 70 + Math.floor(i / 4) * 74, 62, 62, [a, b, c, '#d9dee7'][(i * 7 + (i >> 2)) % 4], 12)).join(''),
  globe: ([a, b, c]) => C(170, 200, 130, a, 'opacity=".18"') + `<circle cx="170" cy="200" r="130" fill="none" stroke="${a}" stroke-width="10"/><ellipse cx="170" cy="200" rx="60" ry="130" fill="none" stroke="${b}" stroke-width="8"/>` + L(40, 200, 300, 200, b, 8) + L(62, 130, 278, 130, c, 6) + L(62, 270, 278, 270, c, 6),
  atom: ([a, b, c]) => [0, 60, 120].map((r, i) => `<ellipse cx="170" cy="200" rx="140" ry="52" fill="none" stroke="${[a, b, c][i]}" stroke-width="9" transform="rotate(${r} 170 200)"/>`).join('') + C(170, 200, 24, a) + C(300, 200, 12, b) + C(100, 140, 12, c),
  leaf: ([a, b]) => P('M170 350 C60 300 40 160 180 50 C300 140 290 300 170 350 Z', a) + L(170, 340, 175, 120, b, 8) + L(172, 250, 120, 200, b, 6) + L(172, 210, 230, 160, b, 6),
  camera: ([a, b, c]) => R(40, 120, 260, 190, '#2a3040', 28) + R(110, 90, 80, 44, '#2a3040', 12) + C(170, 215, 70, '#e9edf5') + C(170, 215, 48, a) + C(170, 215, 20, b) + C(262, 152, 11, c),
  building: ([a, b, c]) => R(60, 90, 130, 270, a, 6) + R(190, 160, 100, 200, b, 6) + Array.from({ length: 12 }, (_, i) => R(80 + (i % 3) * 36, 112 + Math.floor(i / 3) * 56, 22, 34, '#ffffff', 4, 'opacity=".85"')).join('') + R(205, 180, 30, 40, c, 4) + R(246, 180, 30, 40, c, 4) + L(30, 362, 320, 362, '#9aa3b2', 6),
  film: ([a, b, c]) => R(40, 70, 260, 260, '#2a3040', 18) + Array.from({ length: 6 }, (_, i) => R(52, 90 + i * 40, 20, 24, '#e9edf5', 4) + R(268, 90 + i * 40, 20, 24, '#e9edf5', 4)).join('') + R(92, 100, 156, 90, a, 8) + R(92, 210, 156, 90, b, 8) + P('M150 125 L150 165 L186 145 Z', '#fff') + C(170, 255, 16, c),
  type: ([a, b, c]) => `<text x="170" y="250" font-family="Georgia,serif" font-size="230" font-weight="700" fill="${a}" text-anchor="middle">Aa</text>` + L(40, 290, 300, 290, b, 6) + L(40, 320, 300, 320, c, 6),
  pen: ([a, b, c]) => P('M60 330 L90 250 L270 70 L320 120 L140 300 Z', a) + P('M60 330 L90 250 L140 300 Z', '#2a3040') + R(250, 62, 80, 36, c, 6, 'transform="rotate(45 290 80)"') + L(70, 360, 250, 360, b, 8),
  pin: ([a, b]) => `<ellipse cx="170" cy="350" rx="80" ry="18" fill="${b}" opacity=".35"/>` + P('M170 340 C80 230 70 190 70 150 A100 100 0 0 1 270 150 C270 190 260 230 170 340 Z', a) + C(170, 150, 38, '#fff'),
  layers: ([a, b, c]) => [[a, 250], [b, 190], [c, 130]].map(([col, y]) => P(`M170 ${y} L300 ${y - 55} L170 ${y - 110} L40 ${y - 55} Z`, col, 'stroke="#fff" stroke-width="5"')).join(''),
  sun: ([a, b]) => C(170, 200, 70, a) + Array.from({ length: 12 }, (_, i) => { const t = i * Math.PI / 6; return L((170 + 95 * Math.cos(t)).toFixed(0), (200 + 95 * Math.sin(t)).toFixed(0), (170 + 140 * Math.cos(t)).toFixed(0), (200 + 140 * Math.sin(t)).toFixed(0), b, 10); }).join(''),
  drop: ([a, b]) => P('M170 40 C100 150 70 200 70 250 A100 100 0 0 0 270 250 C270 200 240 150 170 40 Z', a) + P('M120 250 A55 55 0 0 0 175 305', 'none', `stroke="${b}" stroke-width="12" stroke-linecap="round"`),
  mountain: ([a, b, c]) => P('M10 340 L120 120 L210 270 L250 200 L330 340 Z', a) + P('M120 120 L158 190 L130 175 L108 195 L92 165 Z', '#fff') + C(260, 90, 34, c) + L(10, 342, 330, 342, b, 8),
  dna: ([a, b, c]) => Array.from({ length: 9 }, (_, i) => { const y = 50 + i * 38, o = Math.sin(i * 0.8) * 70; return L(170 - o, y, 170 + o, y, c, 6) + C(170 - o, y, 14, a) + C(170 + o, y, 14, b); }).join(''),
  magnet: ([a, b, c]) => P('M60 320 V160 A110 110 0 0 1 280 160 V320 H210 V160 A40 40 0 0 0 130 160 V320 Z', a) + R(60, 280, 70, 40, '#e9edf5', 0) + R(210, 280, 70, 40, '#e9edf5', 0) + [90, 170, 250].map((x, i) => L(x, 100 - i % 2 * 20, x, 60 - i % 2 * 20, [b, c, b][i], 6)).join(''),
  bulb: ([a, b]) => C(170, 150, 90, a) + R(130, 235, 80, 40, '#9aa3b2', 8) + R(140, 280, 60, 22, '#6b7487', 8) + P('M140 190 L160 140 L180 190 L200 140', 'none', `stroke="${b}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"`),
  book: ([a, b, c]) => P('M30 110 Q100 80 170 120 V330 Q100 290 30 320 Z', a) + P('M310 110 Q240 80 170 120 V330 Q240 290 310 320 Z', b) + [150, 190, 230].map(y => L(60, y, 140, y + 10, '#fff', 6) + L(200, y + 10, 280, y, '#fff', 6)).join('') + C(270, 70, 20, c),
  chat: ([a, b, c]) => P('M30 70 h200 a24 24 0 0 1 24 24 v90 a24 24 0 0 1 -24 24 h-120 l-40 40 v-40 h-40 a24 24 0 0 1 -24 -24 v-90 a24 24 0 0 1 24 -24 z', a) + P('M310 200 h-170 a24 24 0 0 0 -24 24 v90 a24 24 0 0 0 24 24 h110 l36 36 v-36 h24 a24 24 0 0 0 24 -24 v-90 a24 24 0 0 0 -24 -24 z', b) + [80, 130, 180].map(x => C(x, 140, 9, '#fff')).join('') + L(160, 270, 270, 270, c, 8),
  target: ([a, b, c]) => C(170, 200, 140, a) + C(170, 200, 100, '#fff') + C(170, 200, 70, b) + C(170, 200, 36, '#fff') + C(170, 200, 16, c),
  heart: ([a, b]) => P('M170 340 C20 230 40 90 120 90 C150 90 165 110 170 125 C175 110 190 90 220 90 C300 90 320 230 170 340 Z', a) + P('M40 215 H110 L130 170 L160 260 L185 200 H300', 'none', `stroke="${b}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"`),
  chip: ([a, b, c]) => R(80, 100, 180, 200, '#2a3040', 18) + R(120, 140, 100, 120, a, 10) + Array.from({ length: 5 }, (_, i) => L(110 + i * 30, 100, 110 + i * 30, 70, b, 8) + L(110 + i * 30, 300, 110 + i * 30, 330, b, 8) + L(80, 120 + i * 36, 50, 120 + i * 36, c, 8) + L(260, 120 + i * 36, 290, 120 + i * 36, c, 8)).join(''),
  scale: ([a, b, c]) => L(170, 80, 170, 330, '#6b7487', 10) + L(60, 130, 280, 130, a, 10) + P('M60 130 L30 230 H110 Z', b) + P('M280 130 L250 230 H330 Z', c) + R(110, 322, 120, 20, '#6b7487', 8),
  funnel: ([a, b, c]) => P('M30 80 H310 L220 200 V320 L120 350 V200 Z', a, 'opacity=".9"') + R(60, 100, 220, 14, b, 7) + R(100, 140, 140, 14, b, 7) + C(170, 270, 20, c),
  planet: ([a, b, c]) => C(170, 200, 90, a) + `<ellipse cx="170" cy="200" rx="150" ry="36" fill="none" stroke="${b}" stroke-width="10" transform="rotate(-18 170 200)"/>` + C(286, 100, 16, c) + C(60, 310, 8, c),
  flask: ([a, b, c]) => P('M130 60 H210 M140 60 V150 L60 310 A24 24 0 0 0 82 345 H258 A24 24 0 0 0 280 310 L200 150 V60', 'none', `stroke="#6b7487" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"`) + P('M100 250 H240 L270 310 A18 18 0 0 1 252 335 H88 A18 18 0 0 1 70 310 Z', a) + C(150, 220, 12, b) + C(190, 190, 9, c) + C(175, 280, 10, c),
  seismo: ([a, b]) => P('M10 200 H70 L90 120 L120 290 L150 90 L180 310 L210 150 L240 230 L260 200 H330', 'none', `stroke="${a}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"`) + L(10, 360, 330, 360, b, 6),
  stetho: ([a, b, c]) => P('M80 60 V160 A70 70 0 0 0 220 160 V60', 'none', `stroke="#6b7487" stroke-width="12" stroke-linecap="round"`) + P('M150 230 V280 A60 60 0 0 0 270 280 V240', 'none', `stroke="#6b7487" stroke-width="12" stroke-linecap="round"`) + C(270, 225, 24, a) + C(80, 56, 12, b) + C(220, 56, 12, c),
  mask: ([a, b, c]) => P('M50 90 Q170 60 290 90 V190 Q290 320 170 350 Q50 320 50 190 Z', a) + P('M90 160 Q125 140 150 165 Q125 190 90 160 Z', '#fff') + P('M190 165 Q215 140 250 160 Q215 190 190 165 Z', '#fff') + P('M110 250 Q170 310 230 250', 'none', `stroke="${b}" stroke-width="12" stroke-linecap="round"`) + C(170, 120, 10, c),
  cap: ([a, b, c]) => P('M170 80 L320 150 L170 220 L20 150 Z', a) + P('M90 190 V260 Q170 310 250 260 V190 L170 230 Z', b) + L(300, 160, 300, 270, c, 8) + C(300, 280, 14, c),
  hands: ([a, b, c]) => C(110, 170, 52, a) + C(230, 170, 52, b) + R(60, 230, 100, 110, a, 40) + R(180, 230, 100, 110, b, 40) + C(170, 110, 26, c),
};
export const artURL = (kind, cols, w = 340, h = 400) => svgURL(w, h, (ART[kind] || ART.grid)(cols));
export const ARTS = Object.keys(ART);

// ---- The deck ---------------------------------------------------------------------------------------
const TRS = ['fade', 'slide', 'zoom', 'push'];
function deckFrom(s) {
  const { bg, ink, panel = '#ffffff', muted = '#5a6170', acc, dark = false } = s;
  const stacks = pairStacks(s.fonts);
  const tc = col => (dark ? col : deep(col, panel));          // a card title's colour on its card
  const anim = s.anim || 'fade-up';
  const on = (b, e = anim, p = {}) => withAnims(b, A(e, p));
  const gl = () => [glow(1000, -140, 540, acc[0], bg, dark ? 22 : 14), glow(-140, 560, 480, acc[1] || acc[0], bg, dark ? 14 : 9)];
  const decorBack = (i) => s.decor === 'band' ? [shape('rect', 0, 0, 1280, 14, acc[0])]
    : s.decor === 'bar' ? [shape('rect', 0, 0, 16, 720, acc[i % acc.length])]
    : s.decor === 'none' ? [] : gl();
  const tr = i => (s.tr || TRS)[i % (s.tr || TRS).length];
  const cardBox = (html, x, y, w, h, col, extra = {}) => card(html, x, y, w, h, panel, { color: ink, radius: 16, borderColor: col, pad: [18, 22, 16, 22], ...extra });
  const head = (t, d, col, ts = 26, ds = 21) => `<b style="font-size:${ts}px;color:${tc(col)}">${t}</b><br><span style="font-size:${ds}px;color:${ink}">${d}</span>`;

  const kinds = {
    cards: sl => { const it = sl.items, n = it.length, out = [];
      if (n <= 2) it.forEach(([t, d], i) => out.push(on(cardBox(head(t, d, acc[i % acc.length], 30, 24), 90 + i * 565, 215, 535, 330, acc[i % acc.length], { pad: [26, 28, 22, 28] }))));
      else if (n === 3) it.forEach(([t, d], i) => out.push(on(cardBox(head(t, d, acc[i % acc.length]), 90 + i * 375, 220, 350, 320, acc[i % acc.length], { pad: [22, 24, 18, 24] }))));
      else if (n === 4) it.forEach(([t, d], i) => out.push(on(cardBox(head(t, d, acc[i % acc.length], 27, 22), 90 + (i % 2) * 560, 200 + Math.floor(i / 2) * 215, 530, 195, acc[i % acc.length], { pad: [18, 24, 16, 24] }))));
      else it.forEach(([t, d], i) => out.push(on(cardBox(head(t, d, acc[i % acc.length], 24, 20), 90 + (i % 3) * 375, 200 + Math.floor(i / 3) * 215, 350, 195, acc[i % acc.length]))));
      return { extra: out }; },
    steps: sl => ({ extra: [dg(sl.layout || 'steps', sl.items.join('\n'), 110, 200, 1060, sl.h || 340, { color: ink, ...(sl.dgp || {}) })] }),
    big: sl => ({ extra: [...sl.items.map(([n, lab], i) => on(card(`<div style="font-size:${sl.size || (String(n).length > 7 ? 50 : String(n).length > 5 ? 64 : 84)}px;font-weight:800;color:${tc(acc[i % acc.length])};line-height:1.05">${n}</div><div style="font-size:23px;color:${ink}">${lab}</div>`, 90 + i * 375, 220, 350, 290, panel, { color: ink, radius: 18, textAlign: 'center', vAlign: 'middle', borderColor: acc[i % acc.length], pad: [18, 20, 18, 20] }), 'zoom-in')),
      ...(sl.cap ? [text(sl.cap, 110, 545, 1060, 90, { fontSize: 22, color: muted, textAlign: 'center', lineHeight: 1.4 })] : [])] }),
    chart: sl => ({ extra: [
      chartBlock({ x: 70, y: 170, w: sl.side ? 790 : 1140, h: 470, chartType: sl.type || 'bar', color: acc[0], grid: true, dataLabels: !!sl.labels, xTitle: sl.x, yTitle: sl.y, seriesName: sl.name,
        data: sl.data.map(([label, value]) => ({ label, value })), ...(sl.series ? { series: sl.series.map(([name, values], i) => ({ name, values, color: acc[(i + 1) % acc.length] })) } : {}), ...(sl.cp || {}) }),
      ...(sl.side || []).map(([t, d], i) => on(cardBox(head(t, d, acc[i % acc.length], 25, 20), 890, 175 + i * (sl.side.length === 2 ? 235 : 155), 320, sl.side.length === 2 ? 215 : 140, acc[i % acc.length], { pad: [14, 18, 12, 18] }), 'fade-left'))] }),
    table: sl => ({ extra: [
      tableBlock({ x: 110, y: 185, w: 1060, h: sl.h || 330, fontSize: sl.fs || 22, header: true, headBg: dark ? acc[0] : deep(acc[0], '#ffffff', 4), headFg: '#ffffff', stroke: dark ? '#4a5266' : '#cfd5e0', banded: true, band: acc[1] || acc[0], bandAlpha: 0.1, rows: sl.rows, ...(sl.tp || {}) }),
      ...(sl.cap ? [text(sl.cap, 110, (sl.h || 330) + 205, 1060, 70, { fontSize: 22, color: muted, textAlign: 'center', lineHeight: 1.4 })] : [])] }),
    split: sl => ({ extra: [
      withAnims(img(artURL(sl.art, [acc[0], acc[1] || acc[0], acc[2] || acc[0]]), 90, 195, 340, 410, sl.alt || ''), A('fade-right', { duration: 700 })),
      text(ul(...sl.points), 480, 215, 710, 380, { fontSize: 27, color: ink, lineHeight: 1.45 })] }),
    compare: sl => ({ extra: [
      ...[sl.a, sl.b].map(([t, ...pts], i) => on(card(`<b style="font-size:30px;color:${tc(acc[i])}">${t}</b>${ul(...pts)}`, 90 + i * 590, 205, 510, sl.ch || 340, panel, { color: ink, radius: 18, borderColor: acc[i], fontSize: 24, lineHeight: 1.4, pad: [22, 26, 18, 26] }), i ? 'fade-left' : 'fade-right')),
      shape('ellipse', 570, 335, 80, 80, acc[2] || acc[0]), text('vs', 570, 355, 80, 40, { fontSize: 26, fontWeight: 800, color: '#ffffff', textAlign: 'center' })] }),
    time: sl => ({ extra: [dg('timeline', sl.items.map(([w, t]) => `${w}\n  ${t}`).join('\n'), 90, 190, 1100, sl.h || 330, { colors: 'accent', oneByOne: true }),
      ...(sl.cap ? [text(sl.cap, 110, 560, 1060, 70, { fontSize: 22, color: muted, textAlign: 'center', lineHeight: 1.4 })] : [])] }),
    say: sl => ({ extra: [shape('rect', 110, 230, 10, 250, acc[0]),
      on(text(`<span style="font-size:${sl.size || 44}px;font-weight:700;color:${ink};line-height:1.2">${sl.text}</span>`, 150, 220, 980, 270, { vAlign: 'middle', fontFamily: stacks.heading }), 'fade-in'),
      ...(sl.cap ? [text(sl.cap, 150, 520, 980, 90, { fontSize: 23, color: muted, lineHeight: 1.4 })] : [])] }),
    // A travelling map: stops = [{ name, lon, lat, zoom, cc }, …] (a click flies to each); points on the left.
    map: sl => { const st = sl.stops.map(q => ({ id: uid(), pitch: 0, bearing: 0, ...q })), fly = sl.fly || 3000;
      const steps = st.slice(1).map((q, i) => ({ effect: 'mapfly', order: i + 1, seq: i + 1, start: 'click', duration: fly, delay: 0, stop: q.id }));
      const m = { id: uid(), type: 'map', look: sl.look || 'globe', route: sl.route || 'geodesic', routeColor: acc[1] || acc[0], arrive: 'drop', marker: { kind: 'dot', color: acc[1] || acc[0], size: 1 },
        x: 520, y: 175, w: 690, h: 470, rotation: 0, edge: 'round', ...(sl.mp || {}), stops: st, animation: steps[0] || null, ...(steps.length > 1 && { anims: steps.slice(1) }) };
      return { extra: [m, text(ul(...sl.points), 90, 215, 400, 400, { fontSize: 25, color: ink, lineHeight: 1.45 })] }; },
    // One of Revela's Lottie animations beside the points.
    lottie: sl => ({ extra: [{ id: uid(), type: 'lottie', lottieId: sl.id, x: 90, y: 200, w: 380, h: 380, rotation: 0, animation: null, speed: 1, play: 'auto', ...(sl.lp || {}) },
      text(ul(...sl.points), 520, 215, 680, 400, { fontSize: 27, color: ink, lineHeight: 1.45 })] }),
    // 3D icons (resources panel): items = [[icon, title, text], …] (3 or 4), each with its picture above a card.
    icons: sl => { const it = sl.items, n = it.length, w = n === 4 ? 258 : 350, gap = n === 4 ? 22 : 25;
      return { extra: it.flatMap(([ic, t, d], i) => { const x = 90 + i * (w + gap);
        return [withAnims({ ...base(x + w / 2 - 55, 190, 110, 110), type: 'image', src: `${ICONS3D}${ic}.webp`, alt: t, fit: 'contain' }, A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 500 })),
          withAnims(cardBox(head(t, d, acc[i % acc.length], n === 4 ? 25 : 28, n === 4 ? 21 : 23), x, 315, w, 290, acc[i % acc.length], { pad: [20, 20, 16, 20], textAlign: 'center' }), A('fade-up', { start: 'withPrev' }))]; }) }; },
    model: sl => ({ extra: [
      sl.nasa ? nasa(sl.nasa, 560, 170, 650, 470, { motion: 'swing', ...(sl.mp || {}) }) : model(sl.model, 560, 170, 650, 470, { autoRotate: false, view: 'three', motion: 'swing', edge: 'fade', ...(sl.mp || {}) }),
      text(ul(...sl.points), 90, 215, 450, 400, { fontSize: 25, color: ink, lineHeight: 1.45 })] }),
    vote: sl => ({ layout: 'blank', extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question: sl.q, options: sl.o })] }),
    quiz: sl => ({ layout: 'blank', extra: [pollBlock({ kind: 'quiz', question: sl.q, options: sl.o, correct: [sl.a], time: 25, fontSize: 34, x: 70, y: 60, w: 1140, h: 600 })] }),
  };

  const cv = s.cover, art = artURL(cv.art, acc.slice(0, 3).concat(acc).slice(0, 3));
  const coverSlide = (() => { const v = cv.variant || 'right', size = cv.size || 72;
    const lab = (x, w = 700) => text(cv.label, x, 150, w, 36, { fontSize: 22, letterSpacing: 3, color: tc(acc[0]), fontWeight: 700 });
    if (v === 'center') return { layout: 'blank', bg, back: [...gl(), shape('rect', 0, 600, 1280, 120, acc[0], { opacity: 90 })], extra: [
      lab(90, 840), text(cv.title, 84, 200, 846, 230, { fontSize: size, fontWeight: 800, color: ink, lineHeight: 1.04, fontFamily: stacks.heading }),
      text(cv.sub, 90, 450, 830, 120, { fontSize: 27, color: muted, lineHeight: 1.4 }), withAnims(img(art, 960, 200, 250, 300, cv.alt || ''), A('zoom-in', { start: 'afterPrev', duration: 700 }))] };
    if (v === 'left') return { layout: 'blank', bg, back: decorBack(0), extra: [
      withAnims(img(art, 70, 150, 340, 410, cv.alt || ''), A('fade-right', { start: 'afterPrev', duration: 800 })), lab(480, 700),
      text(cv.title, 474, 196, 740, 230, { fontSize: size, fontWeight: 800, color: ink, lineHeight: 1.04, fontFamily: stacks.heading }), text(cv.sub, 480, 440, 700, 130, { fontSize: 27, color: muted, lineHeight: 1.4 })] };
    return { layout: 'blank', bg, back: gl(), extra: [lab(90), text(cv.title, 84, 196, 740, 230, { fontSize: size, fontWeight: 800, color: ink, lineHeight: 1.04, fontFamily: stacks.heading }),
      text(cv.sub, 90, 440, 680, 130, { fontSize: 27, color: muted, lineHeight: 1.4 }), withAnims(img(art, 860, 160, 340, 400, cv.alt || ''), A('fade-left', { start: 'afterPrev', duration: 800 }))] };
  })();
  const closeSlide = (() => { const c = s.close;
    return { layout: 'blank', bg, back: gl(), transition: 'zoom', extra: [
      text(c.title, 84, 120, 820, 140, { fontSize: 50, fontWeight: 800, color: ink, fontFamily: stacks.heading, lineHeight: 1.08 }),
      text(c.body, 84, 290, 780, 260, { fontSize: 27, color: muted, lineHeight: 1.45 }), timer(c.seconds, 930, 220, 280, { color: acc[0], endText: c.end })], notes: c.notes || '' }; })();

  const slides = [coverSlide, ...s.slides.map((sl, i) => {
    const k = kinds[sl.k](sl), full = k.layout === 'blank';
    return { title: full ? undefined : sl.t, layout: full ? 'blank' : 'titleOnly', bg, back: full ? [] : decorBack(i), transition: tr(i), notes: sl.n || '', ...k };
  }), closeSlide];
  const deck = build({ name: s.name, palette: s.palette, fonts: s.fonts, title: { color: ink, size: 46 }, body: { color: ink } }, slides);
  deck.textColor = ink;
  return numbered(deck);
}

export const tpl = s => ({ name: s.name, cat: s.cat, summary: s.summary, make: () => deckFrom(s) });
