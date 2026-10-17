// Example presentations: Empresa · recursos humanos. Ten made-up policies and programmes of a company's
// people team (performance conversations, hybrid work, an internal academy, hiring, ergonomics, pay bands,
// career paths, merging two teams, the right to disconnect and an equality plan), each with its own
// visual concept: a mixing desk, a video call, a campus crest, a corkboard, a technical sheet, a blueprint,
// a board game, a jigsaw puzzle, a city at night and hydraulic floor tiles.
// Each one: { name, summary, cat: 'biz', make() } → a deck (see kit.js for the builders).
// All the companies, people and figures are made up (the notes say so).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (own drawings: a video call, a crest, cork, a workstation, a skyline…).
const svgURL = (w, h, inner, bg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const T = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const pic = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', ...props });
const device = (src, kind, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', device: kind, ...props });
const head = k => pairStacks(k).heading;
// One after another: the first on a click (or by itself with 'afterPrev'), the rest right after it.
const chain = (i, effect = 'fade-up', props = {}) => A(effect, { start: i ? 'afterPrev' : 'click', ...props });
const kicker = (s, x, y, w, color, size = 18, props = {}) => text(s, x, y, w, size + 16, { fontSize: size, letterSpacing: 4, fontWeight: 700, color, ...props });
// A 3D model without its caption (the credits go in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// A line drawn from an SVG path in a 100 × 100 box.
const stroke = (d, x, y, w, h, color, sw = 3, props = {}) => shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: sw, ...props });
// A straight line between two points of the slide (as a path, so it can be drawn).
const seg = (x1, y1, x2, y2, color, sw = 3, props = {}) => { const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.max(2, Math.abs(x2 - x1)), h = Math.max(2, Math.abs(y2 - y1));
  const px = v => ((v - x) / w * 100).toFixed(1), py = v => ((v - y) / h * 100).toFixed(1);
  return stroke(`M${px(x1)} ${py(y1)} L${px(x2)} ${py(y2)}`, x, y, w, h, color, sw, props); };
// A big number with its label under it (`rows`: room for that many lines of label; two by default).
const stat = (n, label, x, y, w, color, fg, size = 72, { rows = 2, ...props } = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:6px">${label}</div>`,
  x, y, w, Math.round(size * 1.1 + 76 + (rows - 2) * (props.fontSize || 24) * 1.35), { fontSize: 24, color: fg, ...props });
// The same pseudo-random numbers every time.
const rnd = seed => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const MONO = "'JetBrains Mono', 'Courier New', monospace";

// ---- 2 · A video call (inside the laptop) ------------------------------------------
const CALL = [['Lucía', '#e9c9a8', '#7a8450'], ['Andrés', '#b9d2dc', '#c4603d'], ['Nuria', '#e7d7b7', '#3a2a22'], ['Iker', '#d8c3d6', '#e2a33a'],
  ['Tú', '#c9dbc0', '#c4603d'], ['Marta', '#f0d2c0', '#6f7d45'], ['Samuel', '#cfd6e6', '#8a5a3c'], ['Elena', '#efe1c4', '#2f5d6b'], ['Pablo', '#d9cdbf', '#b04a3a']];
const callSVG = () => svgURL(1280, 800, CALL.map(([n, wall, shirt], i) => {
  const x = 24 + (i % 3) * 416, y = 22 + Math.floor(i / 3) * 236, w = 400, h = 222, cx = x + w / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${wall}"/>`
    + (i % 2 ? `<rect x="${x + 28}" y="${y + 26}" width="90" height="70" rx="4" fill="#ffffff" opacity=".55"/>` : `<rect x="${x + w - 70}" y="${y + 30}" width="14" height="110" fill="#8a6a4f" opacity=".5"/><circle cx="${x + w - 63}" cy="${y + 40}" r="30" fill="#6f8f5a" opacity=".55"/>`)
    + `<path d="M${cx - 78} ${y + h} C${cx - 74} ${y + 150} ${cx + 74} ${y + 150} ${cx + 78} ${y + h} Z" fill="${shirt}"/><circle cx="${cx}" cy="${y + 108}" r="40" fill="#f2d3b8"/>`
    + `<path d="M${cx - 42} ${y + 100} C${cx - 40} ${y + 50} ${cx + 40} ${y + 50} ${cx + 42} ${y + 100} C${cx + 20} ${y + 80} ${cx - 20} ${y + 80} ${cx - 42} ${y + 100} Z" fill="${['#3a2a22', '#8a5a3c', '#1f1a17', '#c9a26b'][i % 4]}"/>`
    + `<rect x="${x + 12}" y="${y + h - 40}" width="${n.length * 13 + 26}" height="28" rx="8" fill="#000000" opacity=".55"/>` + T(x + 25, y + h - 20, 17, '#ffffff', n)
    + (i === 4 ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="#e2a33a" stroke-width="5"/>` : '')
    + (i === 7 ? `<circle cx="${x + w - 30}" cy="${y + h - 26}" r="15" fill="#c4603d"/><path d="M${x + w - 38} ${y + h - 34} l16 16" stroke="#fff" stroke-width="3"/>` : ''); }).join('')
  + `<rect x="0" y="736" width="1280" height="64" fill="#1c1714"/>` + [0, 1, 2, 3].map(i => `<circle cx="${520 + i * 60}" cy="768" r="20" fill="${i === 3 ? '#d1453b' : '#3c332d'}"/>`).join('')
  + T(40, 774, 18, '#cdbfb2', 'Reunión de equipo · martes 10:00'), '#2a2420');

// ---- 3 · A campus crest -------------------------------------------------------------
const crestSVG = (GREEN, GOLD, IVORY, BURG) => svgURL(400, 480,
  `<path d="M200 30 L360 80 V240 C360 350 285 415 200 450 C115 415 40 350 40 240 V80 Z" fill="${GREEN}" stroke="${GOLD}" stroke-width="10"/>`
  + `<path d="M200 56 L336 98 V240 C336 335 272 392 200 422 C128 392 64 335 64 240 V98 Z" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".7"/>`
  + `<path d="M120 200 C150 186 180 188 198 204 V300 C180 286 150 284 120 298 Z" fill="${IVORY}"/><path d="M280 200 C250 186 220 188 202 204 V300 C220 286 250 284 280 298 Z" fill="${IVORY}"/>`
  + [0, 1, 2, 3].map(i => `<path d="M134 ${220 + i * 18} C155 ${212 + i * 18} 172 ${213 + i * 18} 188 ${222 + i * 18}" stroke="${GREEN}" stroke-width="3" fill="none" opacity=".45"/><path d="M266 ${220 + i * 18} C245 ${212 + i * 18} 228 ${213 + i * 18} 212 ${222 + i * 18}" stroke="${GREEN}" stroke-width="3" fill="none" opacity=".45"/>`).join('')
  + `<path d="M200 118 l9 20 22 2 -17 14 6 22 -20 -12 -20 12 6 -22 -17 -14 22 -2 Z" fill="${GOLD}"/>`
  + [-1, 1].map(s => Array.from({ length: 6 }, (_, i) => { const a = (200 + i * 22) * Math.PI / 180, r = 150, cx = 200 + s * Math.cos(a) * r * -1, cy = 250 - Math.sin(a) * r * -1;
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="9" ry="20" fill="${GOLD}" transform="rotate(${(s * (i * 22 - 20)).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})" opacity=".9"/>`; }).join('')).join('')
  + `<path d="M70 360 L330 360 L350 390 L330 420 L70 420 L50 390 Z" fill="${BURG}" stroke="${GOLD}" stroke-width="4"/>`
  + T(200, 400, 26, IVORY, 'CANTERA', ' text-anchor="middle" font-weight="700" letter-spacing="6"', 'Georgia, serif'));

// ---- 4 · Cork ----------------------------------------------------------------------
const corkSVG = () => { const r = rnd(41); let dots = '';
  for (let i = 0; i < 1500; i++) dots += `<circle cx="${(r() * 1280).toFixed(0)}" cy="${(r() * 720).toFixed(0)}" r="${(0.8 + r() * 2.6).toFixed(1)}" fill="${['#a8774a', '#d9ac7b', '#8f6038', '#b98552'][Math.floor(r() * 4)]}" opacity=".8"/>`;
  return svgURL(1280, 720, dots + '<rect x="0" y="0" width="1280" height="720" fill="none" stroke="#6d4a2b" stroke-width="36"/><rect x="18" y="18" width="1244" height="684" fill="none" stroke="#4f341d" stroke-width="3"/>', '#c3925f'); };

// ---- 5 · A workstation seen from the side (1000 × 640) -----------------------------
const deskSVG = (INK, ORANGE, LINE) => svgURL(1000, 640,
  `<rect x="0" y="600" width="1000" height="6" fill="${LINE}"/>`
  + `<rect x="440" y="340" width="470" height="16" rx="3" fill="#8a929b"/><rect x="866" y="356" width="16" height="244" fill="#8a929b"/><rect x="460" y="356" width="10" height="244" fill="#a9b0b8"/>`
  + `<rect x="752" y="112" width="18" height="150" rx="4" fill="#3b4148"/><rect x="756" y="262" width="10" height="70" fill="#5b6168"/><rect x="720" y="330" width="80" height="10" rx="3" fill="#5b6168"/>`
  + `<rect x="478" y="326" width="110" height="12" rx="3" fill="#5b6168"/>`
  + `<path d="M232 182 L250 380" stroke="#5b6168" stroke-width="22" stroke-linecap="round"/><rect x="246" y="372" width="190" height="20" rx="8" fill="#5b6168"/>`
  + `<rect x="332" y="392" width="14" height="150" fill="#8a929b"/><path d="M250 560 L430 560" stroke="#5b6168" stroke-width="10" stroke-linecap="round"/><circle cx="256" cy="580" r="12" fill="${INK}"/><circle cx="424" cy="580" r="12" fill="${INK}"/>`
  + `<g stroke="${INK}" stroke-width="20" stroke-linecap="round" fill="none"><path d="M300 360 L284 206"/><path d="M302 362 L470 362 L470 588 L522 588"/><path d="M286 216 L320 330 L478 330"/></g>`
  + `<circle cx="292" cy="146" r="40" fill="${INK}"/>`
  + `<path d="M318 146 L748 146" stroke="${ORANGE}" stroke-width="3" stroke-dasharray="10 8"/>`
  + `<path d="M330 330 a26 26 0 0 0 -15 -24" stroke="${ORANGE}" stroke-width="4" fill="none"/><path d="M470 388 a26 26 0 0 1 -26 -26" stroke="${ORANGE}" stroke-width="4" fill="none"/>`, '#ffffff');

// ---- 6 · Blueprint grid ------------------------------------------------------------
const gridSVG = (bg, line) => svgURL(1280, 720,
  `<defs><pattern id="s" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${line}" stroke-width="1" opacity=".35"/></pattern>`
  + `<pattern id="b" width="160" height="160" patternUnits="userSpaceOnUse"><path d="M160 0H0V160" fill="none" stroke="${line}" stroke-width="1.5" opacity=".6"/></pattern></defs>`
  + '<rect width="1280" height="720" fill="url(#s)"/><rect width="1280" height="720" fill="url(#b)"/>', bg);
// A pay portal (browser): your band, your place in it.
const portalSVG = (NAVY, YEL, CORAL) => svgURL(1280, 760,
  `<rect width="1280" height="90" fill="${NAVY}"/>` + T(48, 58, 30, '#ffffff', 'Portal de Personas', ' font-weight="700"') + T(1000, 56, 22, '#cfe0f2', 'Hola, Carmen')
  + T(48, 160, 26, '#5d6b7a', 'Tu nivel') + T(48, 214, 48, NAVY, 'N3 · Sénior', ' font-weight="700"')
  + T(48, 300, 26, '#5d6b7a', 'Tu banda salarial (bruto anual)')
  + `<rect x="48" y="330" width="1180" height="56" rx="28" fill="#e3ebf4"/><rect x="48" y="330" width="1180" height="56" rx="28" fill="none" stroke="#9fb4c9" stroke-width="2"/>`
  + `<rect x="637" y="318" width="4" height="80" fill="${NAVY}"/>` + T(639, 420, 22, NAVY, 'Punto medio 40.500 €', ' text-anchor="middle"')
  + `<circle cx="532" cy="358" r="22" fill="${CORAL}" stroke="#ffffff" stroke-width="5"/>` + T(532, 300, 22, CORAL, 'Tú: 37.800 €', ' text-anchor="middle" font-weight="700"')
  + T(48, 420, 22, '#5d6b7a', '34.000 €') + T(1228, 420, 22, '#5d6b7a', '47.000 €', ' text-anchor="end"')
  + [['Compa-ratio', '0,93'], ['Próxima revisión', 'marzo de 2027'], ['Siguiente nivel', 'N4 · Experto/a']].map(([k, v], i) =>
    `<rect x="${48 + i * 400}" y="490" width="380" height="180" rx="16" fill="#ffffff" stroke="#d6e0ea" stroke-width="2"/>` + T(78 + i * 400, 545, 24, '#5d6b7a', k)
    + T(78 + i * 400, 620, 44, i ? NAVY : CORAL, v, ' font-weight="700"')).join(''), '#f4f7fb');

// ---- 9 · A city at night, and a clock-in app ----------------------------------------
const CITY = (() => { const r = rnd(7), out = []; let x = 0;
  while (x < 1280) { const w = 90 + Math.round(r() * 80), h = 120 + Math.round(r() * 200); out.push({ x, w, h }); x += w + 6; }
  return out; })();
const CITY_TOP = 720;
const cityWindows = () => CITY.flatMap((b, bi) => { const cols = Math.floor((b.w - 20) / 22), rows = Math.floor((b.h - 30) / 30), list = [];
  for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) list.push({ x: b.x + 14 + c * 22, y: CITY_TOP - b.h + 20 + rr * 30, bi, c, rr });
  return list; });
const citySVG = () => svgURL(1280, 720, CITY.map(b => `<rect x="${b.x}" y="${CITY_TOP - b.h}" width="${b.w}" height="${b.h}" fill="#161d38"/>`).join('')
  + cityWindows().map(w => `<rect x="${w.x}" y="${w.y}" width="12" height="16" fill="#26305a"/>`).join(''));
const clockInSVG = (NIGHT, AMBER, BLUE) => svgURL(360, 720,
  `<rect width="360" height="170" fill="${NIGHT}"/>` + T(24, 60, 18, '#aab3d1', 'Jueves, 15 de octubre') + T(24, 120, 48, '#ffffff', '17:32', ' font-weight="700"')
  + `<rect x="24" y="200" width="312" height="110" rx="18" fill="#ffffff" stroke="#e1e4ef"/>` + T(44, 238, 17, '#6b7393', 'Hoy has trabajado') + T(44, 285, 36, NIGHT, '8 h 04 min', ' font-weight="700"')
  + [['Entrada', '08:58', BLUE], ['Pausa comida', '14:00 – 14:30', '#9aa3c0'], ['Salida', '17:32', AMBER]].map(([k, v, c], i) => { const y = 340 + i * 76;
    return `<circle cx="44" cy="${y + 26}" r="9" fill="${c}"/>` + T(66, y + 22, 17, '#6b7393', k) + T(66, y + 46, 20, NIGHT, v, ' font-weight="700"') + `<rect x="24" y="${y + 66}" width="312" height="1" fill="#e1e4ef"/>`; }).join('')
  + `<rect x="24" y="580" width="312" height="64" rx="32" fill="${AMBER}"/>` + T(180, 620, 21, NIGHT, 'Fichar salida', ' text-anchor="middle" font-weight="700"')
  + T(180, 680, 15, '#6b7393', 'Desconexión activa hasta las 08:00', ' text-anchor="middle"'), '#f4f5fa');

// ---- 10 · Hydraulic floor tiles ------------------------------------------------------
const tile = (x, y, s, [bgc, a, b, c]) => { const k = s / 200;
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect width="200" height="200" fill="${bgc}"/>`
    + [[0, 0], [200, 0], [0, 200], [200, 200]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="64" fill="${a}"/><circle cx="${cx}" cy="${cy}" r="40" fill="${bgc}"/><circle cx="${cx}" cy="${cy}" r="24" fill="${c}"/>`).join('')
    + `<circle cx="100" cy="100" r="60" fill="none" stroke="${b}" stroke-width="9"/><path d="M100 46 L154 100 L100 154 L46 100 Z" fill="${c}"/>`
    + `<path d="M100 70 L130 100 L100 130 L70 100 Z" fill="${bgc}"/><circle cx="100" cy="100" r="12" fill="${a}"/>`
    + [[100, 0], [0, 100], [200, 100], [100, 200]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="14" fill="${b}"/>`).join('') + '</g>'; };
const mosaicSVG = (w, h, s, sets) => svgURL(w, h, Array.from({ length: Math.ceil(h / s) * Math.ceil(w / s) }, (_, i) => {
  const cols = Math.ceil(w / s), cx = i % cols, cy = Math.floor(i / cols); return tile(cx * s, cy * s, s, sets[(cx + cy * 2) % sets.length]); }).join(''));

// ---- 8 · A jigsaw piece (sides: 1 knob out, −1 hole in, 0 flat; top, right, bottom, left) -----------
const piecePath = ([t, r, b, l]) => { const P = [[18, 18], [82, 18], [82, 82], [18, 82]], tabs = [t, r, b, l];
  let d = 'M18 18';
  for (let i = 0; i < 4; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4], tb = tabs[i];
    if (!tb) { d += ` L${x2} ${y2}`; continue; }
    const ax = x1 + (x2 - x1) * 0.375, ay = y1 + (y2 - y1) * 0.375, bx = x1 + (x2 - x1) * 0.625, by = y1 + (y2 - y1) * 0.625;
    d += ` L${ax} ${ay} A9 9 0 1 ${tb > 0 ? 1 : 0} ${bx} ${by} L${x2} ${y2}`; }
  return d + ' Z'; };
const piece = (tabs, x, y, s, color, props = {}) => shape('custom', x, y, s, s, color, { path: piecePath(tabs), stroke: '#ffffff', strokeWidth: 4, ...props });
const PUZZLE = [[0, 1, 1, 0], [0, 0, 1, -1], [-1, -1, 0, 0], [-1, 0, 0, 1]];

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Performance conversations: a mixing desk. Faders, LEDs, tracks with a moving playhead and a 9-box.
  biz_hr_review: { name: 'Evaluación del desempeño continua', cat: 'biz',
    summary: 'Mesa de mezclas: faders en cadena, radar con dos series, pistas con cabezal que avanza, matriz de nueve casillas y valoración', make: () => {
      const BG = '#15111d', PANEL = '#211b2c', EDGE = '#3a3150', CY = '#3ee6d3', MG = '#ff5fa2', AMB = '#ffc04d', GR = '#7cf27a', FG = '#f1ecf8', DIM = '#a69cb8';
      const H = head('tech');
      const LEVELS = [0.72, 0.55, 0.86, 0.42, 0.66, 0.92], CH = ['Cliente', 'Equipo', 'Calidad', 'Ideas', 'Plazos', 'Crecer'];
      const fader = (i) => { const x = 790 + i * 70, top = 180, len = 300, v = LEVELS[i], ky = Math.round(top + (1 - v) * len - 12), c = v > 0.8 ? MG : v > 0.6 ? AMB : GR;
        return [shape('rounded', x + 17, top, 6, len, '#0b0910', { radius: 3 }),
          ...Array.from({ length: 6 }, (_, k) => shape('rect', x + 30, top + 10 + k * 50, 10, 2, EDGE)),
          shape('ellipse', x + 12, 146, 16, 16, c, { shadow: { color: c, blur: 12, x: 0, y: 0 } }),
          withAnims(shape('rounded', x, ky, 40, 24, '#d9d4e3', { radius: 5, stroke: '#ffffff', strokeWidth: 1 }), A('fade-up', { start: 'afterPrev', duration: 280, ...(i === 0 && { delay: 400, sound: 'click' }) })),
          text(CH[i], x - 15, 500, 70, 26, { fontSize: 14, color: DIM, textAlign: 'center' })]; };
      return numbered(build({ name: 'Conversaciones de desempeño', palette: 'violet', fonts: 'tech', title: { size: 44, color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(-260, -260, 820, '#3b1f5c', BG, 70)], extra: [
          kicker('NUEVO MODELO DE DESEMPEÑO · 2027', 80, 150, 600, CY),
          text('Más conversación,<br>menos formulario', 76, 195, 640, 160, { fontFamily: H, fontSize: 60, fontWeight: 700, color: FG, lineHeight: 1.1 }),
          text('Cuatro charlas al año en lugar de una nota anual. Así funcionará el nuevo ciclo de desempeño.', 80, 380, 580, 100, { fontSize: 24, lineHeight: 1.4, color: DIM }),
          shape('rect', 80, 510, 60, 4, MG),
          text('Dirección de Personas · Grupo Ardora', 80, 530, 560, 34, { fontSize: 20, color: FG }),
          shape('rounded', 750, 110, 460, 470, PANEL, { radius: 22, stroke: EDGE, strokeWidth: 2 }),
          ...LEVELS.flatMap((_, i) => fader(i)),
          text('MEZCLA DEL EQUIPO · COMPETENCIAS', 770, 535, 420, 26, { fontSize: 13, letterSpacing: 3, color: DIM, textAlign: 'center' })],
          notes: 'Grupo Ardora es una empresa inventada. La mesa de mezclas está hecha con formas: los mandos suben solos uno tras otro al llegar (animaciones «después de la anterior»). La idea: no hay una única nota, hay un equilibrio de competencias.' },
        { layout: 'blank', bg: BG, transition: 'slide', extra: [
          text('Del examen anual a la conversación continua', 80, 60, 1120, 70, { fontFamily: H, fontSize: 44, fontWeight: 700, color: FG }),
          shape('rounded', 80, 170, 480, 470, PANEL, { radius: 20, stroke: EDGE, strokeWidth: 2 }),
          kicker('HASTA 2026', 112, 196, 300, DIM, 16),
          text('1', 106, 226, 200, 170, { fontFamily: H, fontSize: 160, fontWeight: 700, color: '#6e6288', lineHeight: 1 }),
          text('evaluación al año, con una nota del 1 al 5 que nadie recordaba en marzo', 112, 400, 420, 90, { fontSize: 22, lineHeight: 1.35, color: FG }),
          text(`<span style="font-size:46px;font-weight:700;color:${MG}">18 %</span><br>de la plantilla la consideraba útil`, 112, 500, 420, 110, { fontSize: 22, color: DIM }),
          kicker('DESDE 2027', 620, 196, 300, GR, 16),
          ...[['T1 · Enero', 'Fijar objetivos y prioridades', CY], ['T2 · Abril', 'Feedback y ajuste de rumbo', AMB], ['T3 · Julio', 'Revisión 360 con compañeros', MG], ['T4 · Octubre', 'Plan de desarrollo y calibración', GR]].map(([h, d, c], i) =>
            withAnims(card(`<div style="font-family:${H};font-size:26px;font-weight:700;color:${c}">${h}</div><div style="margin-top:8px">${d}</div><div style="margin-top:10px;font-size:16px;color:${DIM}">30 minutos · cara a cara</div>`,
              620 + (i % 2) * 295, 236 + Math.floor(i / 2) * 210, 280, 190, PANEL, { fontSize: 21, color: FG, radius: 16, borderColor: c, pad: [18, 20, 18, 20] }), A('zoom-in', { start: 'click', duration: 350, sound: 'pop' })))],
          notes: 'Antes, una sola evaluación al año. Ahora, cuatro conversaciones breves: cada clic enciende la siguiente con un «pop». El 18 % sale de la encuesta interna de 2026 (dato de ejemplo).' },
        { title: 'Tu mirada y la de tu responsable', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
          chartBlock({ x: 70, y: 160, w: 640, h: 500, chartType: 'radar', color: CY, seriesName: 'Autoevaluación', yMax: 5,
            data: [{ label: 'Cliente', value: 4 }, { label: 'Calidad', value: 4.5 }, { label: 'Comunicación', value: 4.5 }, { label: 'Equipo', value: 3.5 }, { label: 'Iniciativa', value: 3 }, { label: 'Plazos', value: 4 }],
            series: [{ name: 'Responsable', values: [4, 4.5, 2.5, 4, 3.5, 3], color: MG }] }),
          ...[[CY, 'Coincidís', 'En Cliente y Calidad las dos miradas casi se tocan: ahí hay poco que hablar.'], [MG, 'La mayor distancia', 'Comunicación: dos puntos de diferencia. Ahí empieza la conversación.'], [AMB, 'La pregunta', '«¿Qué ves tú que yo no veo?» Mejor que defender una nota.']].map(([c, h, d], i) =>
            withAnims(card(`<div style="color:${c};font-weight:700;font-size:24px">${h}</div><div style="margin-top:6px">${d}</div>`, 760, 175 + i * 160, 440, 145, PANEL, { fontSize: 20, color: FG, radius: 14, borderColor: EDGE, pad: [16, 20, 16, 20] }), chain(i, 'fade-left')))],
          notes: 'Radar con dos series: la autoevaluación (turquesa) y la valoración del responsable (rosa), de 1 a 5. Las diferencias marcan los temas de la conversación. Puntuaciones de ejemplo.' },
        { title: 'Guion de una conversación de 30 minutos', layout: 'titleOnly', bg: BG, extra: (() => {
          const X0 = 220, PX = 32, lanes = [['Abrir', CY, 0, 5, 'Cómo te ha ido'], ['Escuchar', MG, 5, 15, 'Su autoevaluación primero; tú preguntas'], ['Acordar', AMB, 15, 26, 'Dos fortalezas y un foco de mejora'], ['Cerrar', GR, 26, 30, 'Próximos pasos']];
          return [
            ...[0, 5, 10, 15, 20, 25, 30].flatMap(m => [shape('rect', X0 + m * PX, 182, 1, 412, EDGE), text(`${m}′`, X0 + m * PX - 30, 160, 60, 22, { fontSize: 14, color: DIM, textAlign: 'center' })]),
            ...lanes.flatMap(([n, c, a, b, d], i) => [
              text(n, 80, 210 + i * 96, 130, 40, { fontFamily: H, fontSize: 24, fontWeight: 700, color: c }),
              shape('rounded', X0, 196 + i * 96, 30 * PX, 76, PANEL, { radius: 8 }),
              withAnims(card(d, X0 + a * PX + 3, 200 + i * 96, (b - a) * PX - 6, 68, c + '33', { fontSize: 17, color: FG, radius: 8, borderColor: c, pad: [8, 12, 8, 12], vAlign: 'middle' }), A('fade-right', { start: 'click', duration: 400 }))]),
            withAnims(shape('rect', X0 - 1, 180, 3, 420, '#ffffff'), path([[30 * PX, 0]], { start: 'click', duration: 9000 })),
            withAnims(shape('triangle', X0 - 9, 168, 20, 16, '#ffffff', { rotation: 180 }), path([[30 * PX, 0]], { start: 'withPrev', duration: 9000 })),
            text('Regla de oro: quien recibe el feedback habla al menos la mitad del tiempo.', 80, 618, 1120, 40, { fontSize: 22, color: DIM, textAlign: 'center' })]; })(),
          notes: 'Como un programa de grabación: cada pista es una fase y su ancho, los minutos. Los cuatro primeros clics colocan las pistas; el último pone en marcha el cabezal (una trayectoria de 9 segundos).' },
        { title: 'Calibración: la matriz de nueve casillas', layout: 'titleOnly', bg: BG, extra: (() => {
          const X = 210, Y = 165, CW = 196, RH = 140, NAMES = [['Enigma', 'Estrella en ascenso', 'Estrella'], ['Dilema', 'Pilar del equipo', 'Alto rendimiento'], ['A revisar', 'Eficaz', 'Experto']];
          const tint = (r, c) => [GR, CY, MG][Math.max(0, Math.min(2, c - r + 1))];
          const people = [[0, 2, 'AL'], [1, 1, 'JM'], [1, 1, 'RS'], [1, 2, 'PV'], [0, 1, 'CG'], [2, 1, 'NB'], [1, 0, 'TF'], [2, 2, 'IR'], [1, 1, 'EM']];
          return [
            ...NAMES.flatMap((row, r) => row.map((n, c) => [shape('rounded', X + c * (CW + 6), Y + r * (RH + 6), CW, RH, tint(r, c), { radius: 10, opacity: 22 }),
              text(n, X + c * (CW + 6) + 12, Y + r * (RH + 6) + 8, CW - 24, 28, { fontSize: 16, color: FG, fontWeight: 700 })])).flat(),
            text('POTENCIAL →', 70, 375, 240, 30, { fontSize: 16, letterSpacing: 3, color: DIM, rotation: -90, textAlign: 'center' }),
            text('DESEMPEÑO →', X, Y + 3 * (RH + 6) + 4, 3 * CW + 12, 30, { fontSize: 16, letterSpacing: 3, color: DIM, textAlign: 'center' }),
            ...people.map(([r, c, ini], k) => { const same = people.slice(0, k).filter(p => p[0] === r && p[1] === c).length;
              return withAnims(text(ini, X + c * (CW + 6) + 20 + same * 54, Y + r * (RH + 6) + 70, 46, 46, { fontSize: 15, fontWeight: 700, color: BG, bg: '#f1ecf8', radius: 23, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }),
                chain(k, 'zoom-in', { duration: 220, ...(k === 0 && { sound: 'pop' }) })); }),
            card(`<div style="font-family:${H};font-size:26px;font-weight:700;color:${AMB}">Cómo calibramos</div>` + ul('Responsables del área, juntos', 'Ejemplos concretos, no impresiones', 'Nadie se mueve sin un dato', 'Personas modera y toma nota'),
              830, 165, 380, 430, PANEL, { fontSize: 20, color: FG, radius: 16, borderColor: EDGE, lineHeight: 1.45 })]; })(),
          notes: 'La matriz cruza desempeño (horizontal) y potencial (vertical). Cada círculo es una persona con iniciales inventadas; un clic los coloca en cadena. La calibración evita que cada responsable puntúe con su propia vara de medir.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'rating', display: 'numbers', fontSize: 34, question: '¿Cuánto te ayudó tu última evaluación a mejorar?', x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Valoración en directo desde el móvil. Repetid la misma pregunta dentro de un año para comparar con el modelo nuevo.' },
        { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(700, 120, 700, '#3b1f5c', BG, 65)], extra: [
          text('Sube el volumen', 80, 180, 1120, 140, { fontFamily: H, fontSize: 104, fontWeight: 700, textAlign: 'center', wordart: 'neon', wordartColor: MG }),
          ...[['11 de enero', 'primera ronda de conversaciones', CY], ['2 horas', 'de formación para responsables en noviembre', AMB], ['1 plantilla', 'de una página: nada de formularios eternos', GR]].map(([n, l, c], i) =>
            withAnims(stat(n, l, 90 + i * 380, 410, 340, c, FG, 54, { textAlign: 'center', fontSize: 21 }), A('fade-up', { start: 'afterPrev', delay: i ? 0 : 500 })))],
          notes: 'Cierre con Text Art «Neón» en rosa. Las tres cifras entran solas al llegar. Fechas de ejemplo.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Hybrid work: a warm home, a video call in a laptop, the week that rearranges itself (Transform).
  biz_hr_remote: { name: 'Política de trabajo híbrido', cat: 'biz',
    summary: 'Videollamada dibujada en un portátil, semana tipo que se reordena con Transformar, lámpara 3D, tabla con fórmulas, chat y votación', make: () => {
      const CREAM = '#f7efe4', SOFT = '#efe2d1', TERRA = '#c4603d', OLIVE = '#6f7d45', INK = '#3a2a22', MUST = '#e2a33a', DIMI = '#7a6658';
      const H = head('friendly');
      const DAYS = [['Lunes', 'building-2', TERRA, 'Oficina'], ['Martes', 'users', MUST, 'Día de equipo'], ['Miércoles', 'home', OLIVE, 'Casa'], ['Jueves', 'building-2', TERRA, 'Oficina'], ['Viernes', 'home', OLIVE, 'Casa']];
      const ids = DAYS.map(() => [uid(), uid(), uid()]);
      const day = (i, x, y, w, h) => { const [n, ic, c, lab] = DAYS[i], s = Math.round(Math.min(w, h) * 0.34), fg = c === MUST ? INK : '#ffffff';
        return [{ ...shape('rounded', x, y, w, h, c, { radius: 22 }), id: ids[i][0] },
          { ...icon(ic, x + (w - s) / 2, y + h * 0.18, s, fg), id: ids[i][1] },
          { ...text(`<b>${n}</b><br>${lab}`, x + 6, y + h * 0.58, w - 12, h * 0.38, { fontSize: Math.round(Math.min(26, h / 8)), color: fg, textAlign: 'center', lineHeight: 1.2 }), id: ids[i][2] }]; };
      const LAMP = uid();
      return numbered(Object.assign(build({ name: 'Trabajo híbrido', palette: 'warm', fonts: 'friendly', title: { size: 46, color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', back: [shape('ellipse', 640, 60, 760, 760, SOFT), shape('rect', 0, 640, 1280, 80, '#e8d6c0')], extra: [
          kicker('PERSONAS · POLÍTICA 2027', 80, 140, 500, TERRA),
          text('Trabajar desde donde mejor rindes', 76, 180, 520, 230, { fontFamily: H, fontSize: 54, fontWeight: 700, color: INK, lineHeight: 1.15 }),
          text('Nuestra política de trabajo híbrido entra en vigor el 1 de enero.', 80, 420, 480, 80, { fontSize: 24, lineHeight: 1.4, color: DIMI }),
          ...[['3 días en la oficina', TERRA], ['2 desde casa', OLIVE], ['martes de equipo', MUST]].map(([t, c], i) => text(t, 80 + [0, 228, 402][i], 530, [212, 160, 200][i], 44, { fontSize: 18, fontWeight: 700, color: c === MUST ? INK : '#ffffff', bg: c, radius: 22, textAlign: 'center', vAlign: 'middle', pad: [6, 10, 6, 10] })),
          withAnims(device(callSVG(), 'laptop', 610, 150, 600, 380, 'Una videollamada de equipo con nueve personas en mosaico'), A('fade-up', { start: 'afterPrev', delay: 300, duration: 700 }))],
          notes: 'La videollamada es un dibujo propio (SVG) dentro del marco de portátil (Imagen ▸ Dispositivo). Todas las personas y fechas son inventadas.' },
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          text('Una semana tipo', 80, 60, 800, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: INK }),
          text('Tú eliges tus dos días en casa; el martes nos vemos todos.', 80, 130, 900, 44, { fontSize: 24, color: DIMI }),
          ...DAYS.flatMap((_, i) => day(i, 80 + i * 228, 220, 208, 300).map((b, k) => withAnims(b, A('fade-up', { start: i || k ? 'withPrev' : 'afterPrev', delay: i * 140, duration: 450 })))),
          text('Las reuniones de toda la empresa, siempre en martes. El resto de días, cada equipo se organiza.', 80, 560, 1120, 70, { fontSize: 22, color: INK, textAlign: 'center' })],
          notes: 'Los cinco días entran escalonados al llegar. En la diapositiva siguiente, los mismos objetos se reordenan con Transformar.' },
        { layout: 'blank', bg: CREAM, autoAnimate: true, extra: [
          text('Cada lugar, para lo suyo', 80, 60, 800, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: INK }),
          text('En la oficina · colaborar', 80, 160, 520, 40, { fontSize: 26, fontWeight: 700, color: TERRA }),
          text('Desde casa · concentrarse', 720, 160, 480, 40, { fontSize: 26, fontWeight: 700, color: OLIVE }),
          ...[0, 1, 3].flatMap((d, k) => day(d, 80 + k * 172, 215, 156, 156)),
          ...[2, 4].flatMap((d, k) => day(d, 720 + k * 172, 215, 156, 156)),
          text(ul('Talleres y lluvias de ideas', 'Incorporaciones y mentoría', 'Comida de equipo los martes'), 80, 400, 520, 200, { fontSize: 24, color: INK, lineHeight: 1.5 }),
          text(ul('Trabajo de concentración', 'Llamadas con clientes', 'Formación en línea'), 720, 400, 480, 200, { fontSize: 24, color: INK, lineHeight: 1.5 }),
          shape('rect', 660, 170, 2, 420, '#d9c4ab')],
          notes: 'Transformar: los mismos cinco días (mismos objetos) viajan desde la diapositiva anterior y se agrupan por lugar.' },
        { title: 'Tu puesto en casa: 300 € de ayuda', layout: 'titleOnly', bg: CREAM, extra: [
          tableBlock({ x: 80, y: 180, w: 620, h: 360, fontSize: 24, header: true, headBg: TERRA, headFg: '#ffffff', stroke: '#e3d3bf', banded: true, band: MUST,
            rows: [['Concepto', 'Importe'], ['Silla ergonómica', '160 €'], ['Lámpara de escritorio', '45 €'], ['Reposapiés', '25 €'], ['Auriculares con micrófono', '70 €'], ['<b>Total</b>', '=SUMA(ARRIBA)']], colW: [3, 1.4] }),
          text(`Además, <b style="color:${TERRA}">35 € al mes</b> para luz e internet en la nómina.`, 80, 570, 620, 70, { fontSize: 24, color: INK }),
          { ...m3d('kh-IridescenceLamp', 760, 150, 440, 480, { autoRotate: true, spin: 14, view: 'three', edge: 'fade' }), id: LAMP }],
          notes: 'El total es una fórmula (=SUMA(ARRIBA)): si cambia una partida, se recalcula. La lámpara 3D gira despacio. Importes de ejemplo.' },
        { title: 'Escribir antes que convocar', layout: 'titleOnly', bg: CREAM, extra: [
          ...[['Escribe el contexto completo en el primer mensaje: qué necesitas y para cuándo.', 0], ['Respuesta en el día, no en el minuto. Nadie tiene que vivir pegado al chat.', 1],
            ['Si un hilo pasa de diez mensajes, mejor una llamada de quince minutos.', 0], ['Cámara opcional. Micro en silencio si no hablas.', 1]].flatMap(([t, side], i) => {
            const x = side ? 560 : 160, y = 170 + i * 118, c = side ? OLIVE : '#ffffff', fg = side ? '#ffffff' : INK;
            return [withAnims(card(t, x, y, 560, 96, c, { fontSize: 22, color: fg, radius: 24, pad: [16, 24, 16, 24], vAlign: 'middle', shadow: { color: '#3a2a2222', blur: 10, x: 0, y: 4 } }), A(side ? 'fade-left' : 'fade-right', { start: 'click', sound: 'pop', duration: 350 })),
              withAnims(shape('ellipse', side ? 1132 : 80, y + 24, 52, 52, side ? MUST : TERRA), A('zoom-in', { start: 'withPrev', duration: 300 })),
              withAnims(text(side ? 'RR' : 'LG', side ? 1132 : 80, y + 24, 52, 52, { fontSize: 16, fontWeight: 700, color: side ? INK : '#ffffff', textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }), A('zoom-in', { start: 'withPrev', duration: 300 }))]; })],
          notes: 'Las normas de comunicación como una conversación: cada clic añade un mensaje con un «pop». Iniciales inventadas.' },
        { title: 'Seis meses de piloto', layout: 'titleOnly', bg: CREAM, transition: 'slide', extra: [
          chartBlock({ x: 80, y: 170, w: 760, h: 470, chartType: 'line', color: TERRA, seriesName: 'Satisfacción (%)', grid: true, yMin: 40, yMax: 100,
            data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((l, i) => ({ label: l, value: [62, 68, 74, 79, 81, 84][i] })),
            series: [{ name: 'Objetivos cumplidos (%)', values: [71, 73, 76, 78, 80, 82], color: OLIVE }] }),
          withAnims(stat('−34 min', 'de desplazamiento al día, de media', 880, 190, 330, TERRA, INK, 64), chain(0, 'fade-left')),
          withAnims(stat('+22', 'puntos de satisfacción en seis meses', 880, 380, 330, OLIVE, INK, 64), chain(1, 'fade-left'))],
          notes: 'Gráfico de líneas con dos series: la satisfacción sube y los objetivos no bajan. Datos de un piloto inventado con 120 personas.' },
        { layout: 'blank', bg: CREAM, extra: [pollBlock({ fontSize: 34, question: '¿Qué te ayudaría más a trabajar bien desde casa?', options: ['Una silla mejor', 'Mejor conexión', 'Menos reuniones', 'Horas de silencio'], display: 'pie', x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación en directo con resultado en tarta. Sirve para decidir en qué gastar primero el presupuesto de la ayuda.' },
        { layout: 'blank', bg: INK, transition: 'zoom', back: [glow(560, 60, 720, '#7a3a24', INK, 60)], extra: [
          text('Nos vemos<br>el martes', 80, 160, 600, 240, { fontFamily: H, fontSize: 88, fontWeight: 700, color: CREAM, lineHeight: 1.05 }),
          text('Dudas sobre la política: buzón de Personas o extensión 2040.', 80, 430, 560, 80, { fontSize: 24, color: '#e9d6c2', lineHeight: 1.4 }),
          { ...m3d('kh-IridescenceLamp', 700, 100, 480, 520, { autoRotate: false, motion: 'float', view: 'front', edge: 'fade' }), id: LAMP },
          credits(['kh-IridescenceLamp'], 80, 650, 1120, '#a88e7a')],
          notes: 'Cierre en el color oscuro de la paleta: la lámpara flota. El crédito del modelo (licencia CC BY) va en la línea pequeña de abajo.' },
      ]), { textColor: INK }));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · An internal academy: ivory, bottle green and gold; a crest with curved text, index cards, SQL, ROI.
  biz_hr_academy: { name: 'Academia interna de formación', cat: 'biz',
    summary: 'Escudo de campus con texto curvo, Text Art oro, organigrama de escuelas, fichas de curso, SQL paso a paso, ROI en ecuación y test', make: () => {
      const IVORY = '#f8f4ea', GREEN = '#1f4d3a', GOLD = '#c9a227', BURG = '#7a2738', INK = '#22302a', DIM = '#66756c', PALE = '#ece5d3';
      const H = head('classic');
      const crest = crestSVG(GREEN, GOLD, IVORY, BURG);
      return numbered(build({ name: 'Academia Cantera', palette: 'forest', fonts: 'classic', title: { size: 48, color: GREEN },
        decor: () => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: GOLD, strokeWidth: 1, opacity: 60 })] }, [
        { layout: 'blank', bg: IVORY, transition: 'fade', back: [shape('rect', 0, 0, 560, 720, GREEN)], extra: [
          text('· ENSEÑA QUIEN SABE · APRENDE QUIEN QUIERE ', 40, 110, 480, 480, { fontFamily: H, fontSize: 22, curve: 100, color: GOLD, textAlign: 'center', letterSpacing: 3 }),
          withAnims(pic(crest, 155, 185, 250, 300, 'Escudo de la Academia Cantera: un libro abierto, una estrella y laureles'), A('zoom-in', { start: 'afterPrev', duration: 700 })),
          kicker('FORMACIÓN INTERNA · CURSO 2026–2027', 620, 170, 580, BURG, 16),
          text('Academia<br>Cantera', 612, 210, 600, 230, { fontFamily: H, fontSize: 96, wordart: 'gold', lineHeight: 1.05 }),
          text('Aprende de quien tienes al lado.', 620, 450, 560, 50, { fontSize: 30, fontStyle: 'italic', color: INK }),
          text('18 cursos · 42 formadores de casa · 3 escuelas', 620, 520, 560, 40, { fontSize: 22, color: DIM })],
          notes: 'Academia Cantera es un programa inventado. El escudo es un dibujo propio (SVG) y el lema rodea el escudo como texto curvo (Cuadro de texto ▸ Curvar texto). El nombre es Text Art «Oro».' },
        { title: 'Tres escuelas, un mismo campus', layout: 'titleOnly', bg: IVORY, extra: [
          dg('hierarchy', 'Cantera\n  Técnica\n    Datos\n    Nube\n  Personas\n    Liderazgo\n    Comunicación\n  Negocio\n    Finanzas\n    Cliente', 80, 170, 1120, 470, { colors: 'colorful', oneByOne: true, fontScale: 1.5 })],
          notes: 'Diagrama de jerarquía que aparece rama a rama (Diagrama ▸ Uno a uno al presentar). Cada escuela tiene una persona de referencia que propone los cursos del año.' },
        { title: 'Cursos de otoño', layout: 'titleOnly', bg: PALE, transition: 'slide', extra: [
          ...[['Datos para todos: SQL', 'Escuela técnica', '8 h', 'Inicial', 'Equipo de Datos', GREEN], ['Dar y recibir feedback', 'Escuela de personas', '4 h', 'Para todos', 'Ana R., de Operaciones', BURG],
            ['Finanzas para no financieros', 'Escuela de negocio', '6 h', 'Inicial', 'Equipo de Control', GOLD], ['Presentar con claridad', 'Escuela de personas', '5 h', 'Intermedio', 'Diego L., de Marketing', BURG]].flatMap(([n, s, h, lv, who, c], i) => {
            const x = 80 + i * 285, y = 175;
            return [withAnims(shape('rect', x, y, 260, 430, '#ffffff', { shadow: { color: '#22302a22', blur: 14, x: 0, y: 6 } }), chain(i, 'fade-up', { duration: 400 })),
              withAnims(shape('rect', x, y, 260, 16, c), A('fade-in', { start: 'withPrev' })),
              withAnims(text(`<div style="font-size:14px;letter-spacing:2px;color:${c};font-weight:700">${s.toUpperCase()}</div><div style="font-family:${H};font-size:28px;line-height:1.15;margin-top:10px;color:${INK}">${n}</div>`, x + 20, y + 36, 220, 190, { fontSize: 16 }), A('fade-in', { start: 'withPrev' })),
              withAnims(text(`<div style="font-size:44px;font-family:${H};color:${c}">${h}</div><div>Nivel: ${lv}</div><div style="margin-top:8px;color:${DIM}">Imparte: ${who}</div>`, x + 20, y + 240, 220, 170, { fontSize: 18, color: INK }), A('fade-in', { start: 'withPrev' }))]; })],
          notes: 'Cuatro fichas de curso que entran una tras otra con un clic. Todos los formadores son compañeros de la empresa (nombres inventados).' },
        { title: 'Una clase de muestra: SQL, sesión 3', layout: 'titleOnly', bg: IVORY, extra: [
          codeBlock({ x: 80, y: 175, w: 700, h: 390, fontSize: 21, lang: 'sql', lineSteps: '1-3|4-5|6-7|8',
            code: "SELECT departamento,\n       COUNT(*)              AS personas,\n       AVG(horas_formacion)  AS media_horas\nFROM   plantilla\nWHERE  fecha_alta < '2026-01-01'\nGROUP  BY departamento\nHAVING COUNT(*) >= 10\nORDER  BY media_horas DESC;" }),
          ...[['1', 'Qué columnas quieres ver'], ['2', 'De qué tabla y con qué filtro'], ['3', 'Agrupa y quédate con los grupos grandes'], ['4', 'Ordena: primero quien más se forma']].map(([n, t], i) =>
            text(`<span style="font-family:${H};font-size:30px;color:${BURG}">${n}</span>&nbsp;&nbsp;${t}`, 820, 180 + i * 98, 380, 86, { fontSize: 21, color: INK, borderColor: '#d8cfb8', pad: [12, 16, 12, 16], radius: 8 })),
          text('Datos ficticios de plantilla: nadie aprende con datos personales reales.', 80, 600, 1120, 36, { fontSize: 19, color: DIM, fontStyle: 'italic' })],
          notes: 'Bloque de código con pasos de resaltado: cada clic ilumina una parte de la consulta, en el mismo orden que las cuatro notas de la derecha.' },
        { title: 'Horas de formación por trimestre', layout: 'titleOnly', bg: IVORY, extra: [
          chartBlock({ x: 80, y: 165, w: 760, h: 480, chartType: 'stacked', color: GREEN, seriesName: 'Técnica', grid: true, yTitle: 'Horas',
            data: ['T1', 'T2', 'T3', 'T4'].map((l, i) => ({ label: l, value: [1200, 1450, 900, 1650][i] })),
            series: [{ name: 'Personas', values: [800, 950, 600, 1100], color: BURG }, { name: 'Negocio', values: [500, 620, 400, 720], color: GOLD }] }),
          withAnims(stat('10.890 h', 'de formación en el año', 880, 190, 330, GREEN, INK, 60, { fontFamily: H }), chain(0, 'fade-left')),
          withAnims(stat('9 de 10', 'recomendarían su curso a un compañero', 880, 390, 330, BURG, INK, 60, { fontFamily: H }), chain(1, 'fade-left'))],
          notes: 'Barras apiladas por escuela: el verano baja y el otoño es el pico. Datos de ejemplo.' },
        { title: 'Lo que devuelve aprender', layout: 'titleOnly', bg: IVORY, extra: [
          mathBlock({ x: 80, y: 180, w: 1120, h: 140, fontSize: 52, latex: '\\text{ROI} = \\frac{\\text{beneficio} - \\text{coste}}{\\text{coste}} \\times 100', color: GREEN }),
          withAnims(mathBlock({ x: 80, y: 340, w: 1120, h: 130, fontSize: 44, latex: '= \\frac{186\\,000 - 120\\,000}{120\\,000} \\times 100 = 55\\,\\%', color: BURG }), A('fade-in', { start: 'click' })),
          withAnims(text('Beneficio estimado: contrataciones externas que no hicimos (110.000 €) y menos rotación en los equipos formados (76.000 €).', 160, 510, 960, 90, { fontSize: 22, color: INK, textAlign: 'center', fontStyle: 'italic' }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Dos ecuaciones: la fórmula del retorno de la inversión y, con un clic, el cálculo con los datos del año. Importes de ejemplo.' },
        { layout: 'blank', bg: PALE, extra: [pollBlock({ kind: 'quiz', fontSize: 36, question: 'En SQL, ¿qué cláusula filtra los grupos después de agrupar?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], correct: [1], time: 20, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Pregunta de test con tiempo (20 s) y respuesta correcta: HAVING. WHERE filtra filas antes de agrupar.' },
        { layout: 'blank', bg: GREEN, transition: 'zoom', extra: [
          icon('graduation-cap', 560, 110, 160, GOLD),
          text('Matrícula abierta', 80, 300, 1120, 100, { fontFamily: H, fontSize: 76, textAlign: 'center', color: IVORY }),
          text('Hasta el 31 de octubre en el portal de Personas', 80, 410, 1120, 50, { fontSize: 28, textAlign: 'center', color: GOLD }),
          text('¿Sabes algo que otros quieren aprender? Hazte formador: dos horas de preparación y el reconocimiento en tu evaluación.', 180, 500, 920, 90, { fontSize: 22, textAlign: 'center', color: '#d8e3dc', lineHeight: 1.4 })],
          notes: 'Cierre en verde botella con el icono de birrete. Invita también a proponer cursos: la academia vive de los formadores internos.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · How we hire: a corkboard with pinned paper and red string that draws itself.
  biz_hr_hiring: { name: 'Guía de selección para responsables', cat: 'biz',
    summary: 'Tablero de corcho con chinchetas e hilo rojo que se dibuja, embudo, ficha de evaluación con fórmulas, unir sesgos y cuenta atrás', make: () => {
      const PAPER = '#fffaf0', RED = '#c0392b', INK = '#2d2620', BLUE = '#2f5d8a', YEL = '#f5d76e', DIM = '#6b5d4f';
      const H = head('editorial');
      const cork = corkSVG();
      const sheet = (html, x, y, w, h, rot = 0, props = {}) => card(html, x, y, w, h, PAPER, { radius: 3, rotation: rot, color: INK, fontSize: 22, shadow: { color: '#00000066', blur: 14, x: 4, y: 6 }, ...props });
      const paper = (x, y, w, h, rot = 0) => shape('rect', x, y, w, h, PAPER, { rotation: rot, shadow: { color: '#00000066', blur: 14, x: 4, y: 6 } });
      const pin = (x, y, c = RED) => shape('ellipse', x - 11, y - 11, 22, 22, c, { fill2: '#5a1009', gradType: 'radial', shadow: { color: '#00000077', blur: 4, x: 2, y: 3 } });
      const bgCork = () => [pic(cork, 0, 0, 1280, 720, 'Tablero de corcho')];
      return numbered(build({ name: 'Así contratamos', palette: 'paper', fonts: 'editorial', title: { size: 44, color: INK } }, [
        { layout: 'blank', bg: '#c3925f', transition: 'fade', back: bgCork(), extra: [
          sheet(`<div style="font-size:16px;letter-spacing:4px;color:${RED};font-weight:700">GUÍA PARA RESPONSABLES</div><div style="font-family:${H};font-size:56px;font-weight:700;line-height:1.15;margin:14px 0">Así contratamos</div><div style="color:${DIM}">Un proceso justo, rápido y sin sorpresas para quien llega.</div>`,
            110, 190, 600, 290, -2, { pad: [36, 40, 36, 40] }),
          pin(410, 200),
          ...[['Perfil', 'Con el equipo, antes de publicar', 840, 120, 3], ['Entrevista', 'Mismas preguntas para todos', 900, 310, -3], ['Decisión', 'En panel y en 48 horas', 830, 500, 2]].flatMap(([h, d, x, y, rot], i) => [
            withAnims(seg(700, 320, x + 150, y + 16, RED, 3), chain(i, 'draw', { duration: 600, start: 'afterPrev', delay: i ? 0 : 400 })),
            withAnims(sheet(`<b style="font-family:${H};font-size:28px">${h}</b><br>${d}`, x, y, 300, 120, rot, { fontSize: 19, pad: [30, 22, 14, 22] }), A('zoom-in', { start: 'afterPrev', duration: 300, sound: 'pop' })),
            withAnims(pin(x + 150, y + 16), A('fade-in', { start: 'withPrev', duration: 200 }))]),
          pin(700, 320)],
          notes: 'El corcho es un dibujo propio (SVG con puntos aleatorios). Al llegar, el hilo rojo se dibuja hasta cada nota (efecto «Dibujar») y la nota aparece con un «pop». Es una guía inventada.' },
        { layout: 'blank', bg: '#c3925f', back: bgCork(), extra: [
          paper(80, 90, 720, 560),
          pin(440, 104),
          text('De 1.240 candidaturas a 8 contratos', 120, 125, 640, 50, { fontFamily: H, fontSize: 30, fontWeight: 700, color: INK }),
          chartBlock({ x: 150, y: 190, w: 620, h: 430, chartType: 'funnel', color: BLUE, dataLabels: true,
            data: [{ label: 'Recibidas', value: 1240 }, { label: 'Cribado', value: 310 }, { label: 'Entrevista', value: 84 }, { label: 'Prueba', value: 26 }, { label: 'Oferta', value: 9 }, { label: 'Contratadas', value: 8 }] }),
          ...[['23 días', 'de la publicación a la oferta'], ['89 %', 'de las ofertas se aceptan'], ['4,6 / 5', 'valoran el proceso quienes no entran']].map(([n, l], i) =>
            withAnims(sheet(`<div style="font-family:${H};font-size:40px;font-weight:700;color:${RED}">${n}</div><div>${l}</div>`, 850, 100 + i * 185, 350, 150, [-2, 2, -1][i], { fontSize: 20, bg: i === 1 ? YEL : PAPER, pad: [18, 22, 18, 22] }), chain(i, 'fade-left', { sound: 'pop', duration: 350 })))],
          notes: 'Embudo de selección del último año en una hoja clavada al corcho, y tres notas con los indicadores. Datos de ejemplo.' },
        { layout: 'blank', bg: '#c3925f', back: bgCork(), extra: (() => {
          const STEPS = [['Perfil', 'Lo escribe el equipo que va a trabajar con la persona.'], ['Cribado ciego', 'Sin nombre, foto ni edad en la primera lectura.'], ['Entrevista', 'Estructurada: las mismas preguntas, la misma escala.'], ['Prueba', 'Un caso real y breve; pagada si dura más de dos horas.'], ['Decisión', 'En panel, con la ficha, y respuesta a todos en 48 h.']];
          const pos = STEPS.map((_, i) => [70 + i * 235, i % 2 ? 380 : 200]);
          return [
            sheet(`<b style="font-family:${H};font-size:34px">El proceso en cinco pasos</b>`, 360, 56, 560, 84, -1, { textAlign: 'center', vAlign: 'middle', pad: [10, 20, 10, 20] }),
            ...(() => { const yarn = [], cards = [];
              STEPS.forEach(([h, d], i) => { const [x, y] = pos[i];
              if (i) yarn.push(withAnims(seg(pos[i - 1][0] + 105, pos[i - 1][1] + 14, x + 105, y + 14, RED, 3), A('draw', { start: 'click', duration: 500 })));
              cards.push(withAnims(sheet(`<div style="font-family:${H};font-size:44px;font-weight:700;color:${RED};line-height:1">${i + 1}</div><div style="font-family:${H};font-size:24px;font-weight:700;margin:6px 0">${h}</div><div>${d}</div>`, x, y, 210, 240, [-2, 1.5, -1, 2, -1.5][i], { fontSize: 18, pad: [22, 18, 16, 18], lineHeight: 1.3 }),
                  A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' })),
                withAnims(pin(x + 105, y + 14), A('fade-in', { start: 'withPrev', duration: 200 }))); });
              return [...yarn, ...cards.flat()]; })()]; })(),
          notes: 'Cada clic tiende el hilo rojo hasta el paso siguiente y clava su nota. Cinco pasos en zigzag para que se lean como un recorrido.' },
        { layout: 'blank', bg: '#c3925f', back: bgCork(), extra: [
          paper(90, 70, 1100, 580), pin(640, 84),
          text('Ficha de evaluación · Analista de datos', 140, 110, 1000, 50, { fontFamily: H, fontSize: 32, fontWeight: 700, color: INK }),
          tableBlock({ x: 140, y: 180, w: 1000, h: 330, fontSize: 23, header: true, headBg: INK, headFg: PAPER, stroke: '#d9cdb8', banded: true, band: YEL,
            rows: [['Criterio', 'Peso', 'Candidata A', 'Candidato B'], ['SQL y análisis', '0,30', '4', '3'], ['Comunicación', '0,25', '3', '5'], ['Trabajo en equipo', '0,20', '4', '4'], ['Resolución de problemas', '0,25', '5', '3'],
              ['<b>Nota ponderada</b>', '=SUMA(B2:B5)', '=B2*C2+B3*C3+B4*C4+B5*C5', '=B2*D2+B3*D3+B4*D4+B5*D5']], colW: [3.4, 1.4, 2, 2] }),
          text('Cada persona del panel puntúa del 1 al 5 <b>por separado</b>, antes de hablar. Después se comparan las fichas.', 140, 540, 1000, 80, { fontSize: 22, color: DIM })],
          notes: 'La fila final son fórmulas: la suma de pesos (debe dar 1) y la nota ponderada de cada candidatura (=B2*C2+…). Si el panel cambia una nota, todo se recalcula. Puntuaciones de ejemplo.' },
        { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'match', fontSize: 30, question: 'Une cada sesgo con lo que lo frena', options: ['Efecto halo = Puntuar cada criterio por separado', 'Afinidad = Un panel diverso', 'Primera impresión = Decidir al final, no en el minuto uno', 'Confirmación = Las mismas preguntas para todos'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Actividad de unir parejas desde el móvil: cuatro sesgos habituales en una entrevista y la práctica que los reduce.' },
        { layout: 'blank', bg: '#c3925f', back: bgCork(), extra: [
          sheet(`<div style="font-size:16px;letter-spacing:4px;color:${RED};font-weight:700">EJERCICIO EN PAREJAS</div><div style="font-family:${H};font-size:34px;font-weight:700;margin:12px 0">Convierte la pregunta</div>`
            + `<div style="font-size:24px;color:${DIM}">De esto…</div><div style="font-size:28px;margin:6px 0 16px">«¿Trabajas bien en equipo?»</div><div style="font-size:24px;color:${DIM}">…a una pregunta sobre hechos:</div><div style="font-size:28px;margin-top:6px">«Cuéntame una vez en la que…»</div>`,
            90, 130, 660, 440, -1.5, { pad: [40, 40, 36, 40] }), pin(420, 142),
          paper(830, 150, 360, 400, 2), pin(1010, 162),
          timer(180, 880, 200, 260, { color: RED, auto: false, endText: '¡Tiempo!', rotation: 2 }),
          text('3 minutos', 860, 480, 300, 40, { fontSize: 24, color: INK, textAlign: 'center', fontFamily: H, rotation: 2 })],
          notes: 'Cuenta atrás de tres minutos (se pone en marcha con un clic). Cada pareja reescribe la pregunta para preguntar por un hecho pasado, no por una opinión.' },
        { layout: 'blank', bg: '#c3925f', transition: 'zoom', back: bgCork(), extra: [
          sheet(`<div style="font-family:${H};font-size:58px;font-weight:700;line-height:1.15">Contrata despacio.<br>Cuida desde el primer día.</div>`, 150, 150, 980, 280, -1, { pad: [40, 50, 40, 50], textAlign: 'center', vAlign: 'middle' }),
          pin(640, 162), pin(220, 170, BLUE), pin(1060, 160, BLUE),
          withAnims(sheet('Guiones, fichas y plantillas: carpeta <b>Personas › Selección</b>', 420, 480, 440, 110, 2, { fontSize: 22, bg: YEL, pad: [20, 24, 20, 24] }), A('zoom-in', { start: 'afterPrev', delay: 400, sound: 'pop' }))],
          notes: 'Cierre en el corcho. La nota amarilla entra sola con un «pop» y recuerda dónde están las plantillas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Ergonomics: a technical sheet (frame, title block, orange dimension lines), a 3D chair, a labelled drawing and a stretch timer.
  biz_hr_ergonomics: { name: 'Ergonomía en el puesto de trabajo', cat: 'biz',
    summary: 'Lámina técnica con silla 3D, dibujo propio de la postura con cotas en cadena, barras, etiquetar una imagen y pausa con cuenta atrás', make: () => {
      const BG = '#f4f5f6', ORANGE = '#ff6b1a', GREY = '#5b6168', INK = '#1d2125', LINE = '#c4c9cf', TEAL = '#0f8b8d';
      const H = head('clean');
      const desk = deskSVG(INK, ORANGE, LINE);
      const CHAIR = uid();
      const mark = (n, x, y) => text(String(n), x - 17, y - 17, 34, 34, { fontSize: 18, fontWeight: 700, color: '#ffffff', bg: ORANGE, radius: 17, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] });
      return numbered(build({ name: 'Tu puesto, a tu medida', palette: 'grayscale', fonts: 'clean', title: { size: 44, color: INK },
        decor: () => [shape('rect', 24, 24, 1232, 672, 'none', { stroke: LINE, strokeWidth: 2 }), shape('rect', 960, 664, 296, 32, 'none', { stroke: LINE, strokeWidth: 2 }),
          text('GUÍA DE ERGONOMÍA · SALUD LABORAL', 966, 668, 284, 24, { fontSize: 11, letterSpacing: 1, color: GREY, textAlign: 'center' })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          kicker('LÁMINA 01', 80, 140, 400, ORANGE),
          text('Tu puesto,<br>a tu medida', 76, 180, 600, 210, { fontFamily: H, fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.05, letterSpacing: -2 }),
          text('Cinco ajustes, dos minutos y una espalda que te lo agradecerá.', 80, 410, 520, 80, { fontSize: 26, color: GREY, lineHeight: 1.35 }),
          text('Para toda la plantilla · en la oficina y en casa · 20 minutos', 80, 520, 640, 30, { fontFamily: MONO, fontSize: 15, color: GREY }),
          shape('ellipse', 760, 540, 400, 70, 'none', { stroke: ORANGE, strokeWidth: 2, dash: 'dash' }),
          seg(1190, 140, 1190, 575, ORANGE, 2), seg(1178, 140, 1202, 140, ORANGE, 2), seg(1178, 575, 1202, 575, ORANGE, 2),
          text('regulable', 1122, 345, 180, 24, { fontFamily: MONO, fontSize: 14, color: ORANGE, rotation: -90, textAlign: 'center' }),
          { ...m3d('kh-SheenChair', 740, 110, 430, 500, { autoRotate: true, spin: 16, view: 'three' }), id: CHAIR }],
          notes: 'Portada como una lámina técnica: el marco y el cajetín de la esquina son decoraciones del patrón. La silla 3D gira despacio sobre su cota naranja.' },
        { title: 'La postura de referencia', layout: 'titleOnly', bg: BG, extra: [
          pic(desk, 80, 160, 700, 448, 'Dibujo de una persona sentada ante su mesa, vista de lado, con la pantalla a la altura de los ojos', { radius: 8, borderColor: LINE }),
          ...[['Codos a 90°, hombros relajados', 304, 391], ['Espalda apoyada, entre 100° y 110°', 248, 356], ['Rodillas a 90°, pies en el suelo', 409, 413], ['El borde de la pantalla, a la altura de los ojos', 612, 239], ['La pantalla, a un brazo: de 50 a 70 cm', 451, 263]]
            .flatMap(([t, mx, my], i) => [withAnims(mark(i + 1, mx, my), A('zoom-in', { start: 'click', duration: 250, sound: 'click' })),
              withAnims(text(`<span style="color:${ORANGE};font-weight:800">${i + 1}</span>&nbsp; ${t}`, 820, 170 + i * 88, 390, 76, { fontSize: 20, color: INK, lineHeight: 1.3 }), A('fade-left', { start: 'withPrev', duration: 300 }))])],
          notes: 'Dibujo propio (SVG) de la postura de referencia. Cada clic marca un punto con su número y su explicación, con un pequeño «clic» de sonido.' },
        { title: 'Dónde duele', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 80, y: 165, w: 760, h: 470, chartType: 'hbar', color: ORANGE, dataLabels: true, grid: true, xTitle: '% de personas',
            data: [{ label: 'Cuello', value: 41 }, { label: 'Zona lumbar', value: 37 }, { label: 'Ojos cansados', value: 33 }, { label: 'Muñecas', value: 22 }, { label: 'Hombros', value: 18 }] }),
          withAnims(stat('3 de 4', 'notan alguna molestia al acabar la semana', 880, 200, 330, ORANGE, INK, 70, { fontFamily: H }), chain(0, 'fade-left')),
          withAnims(text('Encuesta interna de salud laboral · 412 respuestas', 880, 420, 330, 60, { fontFamily: MONO, fontSize: 15, color: GREY }), chain(1, 'fade-in'))],
          notes: 'Barras horizontales con las molestias más citadas (se podía marcar más de una). Datos de una encuesta inventada.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Pon nombre a cada ajuste del puesto', x: 80, y: 60, w: 1120, h: 600, image: desk,
          options: ['Respaldo', 'Altura del asiento', 'Pantalla', 'Teclado', 'Pies apoyados'], points: [{ x: 24, y: 40 }, { x: 34, y: 61 }, { x: 76, y: 30 }, { x: 53, y: 51 }, { x: 50, y: 92 }] })],
          notes: 'Actividad «Etiquetar una imagen» con el mismo dibujo: cada persona arrastra desde el móvil los nombres a los puntos.' },
        { title: 'Pausa activa: 60 segundos', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
          ...[['Cuello', 'Lleva la oreja hacia el hombro. Diez segundos por lado.'], ['Hombros', 'Diez círculos lentos hacia atrás.'], ['Ojos', 'Mira algo a más de seis metros durante veinte segundos.']].map(([h, d], i) =>
            withAnims(card(`<div style="font-family:${H};font-weight:800;font-size:26px;color:${INK}"><span style="color:${ORANGE}">${i + 1} ·</span> ${h}</div><div style="margin-top:6px">${d}</div>`, 80, 175 + i * 140, 680, 120, '#ffffff', { fontSize: 22, color: GREY, radius: 6, borderColor: LINE, pad: [16, 24, 16, 24] }), chain(i, 'fade-right'))),
          timer(60, 840, 190, 340, { color: ORANGE, auto: false, endText: '¡Listo!' }),
          text('Regla 20-20-20: cada 20 minutos, 20 segundos mirando a 20 pies (6 m).', 80, 610, 1120, 34, { fontFamily: MONO, fontSize: 16, color: GREY })],
          notes: 'Cuenta atrás de un minuto en anillo: haced los tres ejercicios a la vez que el público. Se pone en marcha con un clic.' },
        { title: 'Comprueba tu puesto en dos minutos', layout: 'titleOnly', bg: BG, extra: [
          ...['La silla te deja los pies planos en el suelo', 'Hay un palmo entre el borde del asiento y la rodilla', 'El respaldo sostiene la curva de la espalda', 'La pantalla no refleja ninguna ventana',
            'El teclado y el ratón están a la altura del codo', 'Usas un portátil con teclado y pantalla aparte'].map((t, i) => { const x = 80 + (i % 2) * 570, y = 180 + Math.floor(i / 2) * 140;
            return [shape('rect', x, y, 540, 116, '#ffffff', { stroke: LINE, strokeWidth: 2 }),
              shape('rect', x + 22, y + 34, 48, 48, 'none', { stroke: GREY, strokeWidth: 2 }),
              withAnims(icon('check', x + 24, y + 30, 50, TEAL), A('zoom-in', { start: 'click', duration: 250, sound: 'click' })),
              text(t, x + 92, y + 16, 430, 84, { fontSize: 21, color: INK, vAlign: 'middle' })]; }).flat()],
          notes: 'Una lista de comprobación: cada clic marca una casilla. Si te falta alguna, pide la revisión del puesto.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          kicker('¿TE FALTA ALGUNA CASILLA?', 80, 180, 600, ORANGE),
          text('Pide una revisión de tu puesto', 76, 220, 620, 180, { fontFamily: H, fontSize: 60, fontWeight: 800, color: INK, lineHeight: 1.1 }),
          text('Salud laboral visita tu mesa en 48 horas, también por videollamada si trabajas desde casa.', 80, 410, 600, 115, { fontSize: 24, color: GREY, lineHeight: 1.4 }),
          text('Extensión 2210 · portal de Personas › Salud', 80, 550, 560, 30, { fontFamily: MONO, fontSize: 17, color: INK }),
          { ...m3d('kh-SheenChair', 740, 120, 440, 500, { autoRotate: false, motion: 'float', view: 'front', arrive: 'turn' }), id: CHAIR }],
          notes: 'Cierre con la silla de la portada, que ahora flota de frente. Datos de contacto inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Pay bands: a blueprint. A building of six floors, bands drawn to scale, compa-ratio, formulas and the pay portal.
  biz_hr_pay: { name: 'Bandas salariales transparentes', cat: 'biz',
    summary: 'Plano azul: edificio de seis niveles en cadena, bandas a escala, compa-ratio en ecuación, tabla con fórmulas, cascada y portal', make: () => {
      const BG = '#0f3a60', GRIDL = '#8fc1ec', LINE = '#d7ecff', YEL = '#ffd166', CORAL = '#ff8f70', MINT = '#7fe0c8', DIM = '#a9c6e2', NAVY = '#0b2c4a';
      const H = head('websafe');
      const LV = [['N1', 'Inicial', 22, 30], ['N2', 'Profesional', 27, 37], ['N3', 'Sénior', 34, 47], ['N4', 'Experto/a', 43, 60], ['N5', 'Responsable', 55, 76], ['N6', 'Dirección', 68, 90]];
      const X = v => 300 + (v - 20) * 12.5;
      const lbl = (s, x, y, w, props = {}) => text(s, x, y, w, 26, { fontFamily: MONO, fontSize: 15, color: DIM, ...props });
      return numbered(build({ name: 'Bandas salariales', palette: 'ocean', fonts: 'websafe', title: { size: 42, color: LINE },
        decor: () => [pic(gridSVG(BG, GRIDL), 0, 0, 1280, 720, ''), shape('rect', 900, 656, 340, 34, 'none', { stroke: LINE, strokeWidth: 1.5 }),
          text('POLÍTICA RETRIBUTIVA 2027 · PERSONAS', 906, 661, 328, 24, { fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: LINE, textAlign: 'center' })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          kicker('PLANO N.º 01 · POLÍTICA RETRIBUTIVA', 80, 150, 620, YEL, 15, { fontFamily: MONO }),
          text('Bandas salariales,<br>a la vista', 76, 190, 660, 170, { fontFamily: H, fontSize: 62, color: LINE, lineHeight: 1.15 }),
          text('Seis niveles, una banda para cada uno y reglas claras para moverse dentro. Sin secretos.', 80, 390, 560, 100, { fontSize: 23, color: DIM, lineHeight: 1.45 }),
          seg(760, 560, 1180, 560, LINE, 3),
          ...LV.flatMap(([n, name], i) => { const y = 560 - (i + 1) * 64, w = 320 - i * 22, x = 800 + i * 11;
            return [withAnims(shape('rect', x, y, w, 60, '#d7ecff', { opacity: 14, stroke: LINE, strokeWidth: 2 }), A('fade-up', { start: 'afterPrev', duration: 260, ...(i === 0 && { delay: 400 }) })),
              withAnims(lbl(`${n} · ${name}`, x + 14, y + 17, w - 28, { color: LINE, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 260 }))]; }),
          seg(1170, 176, 1170, 560, YEL, 2), seg(1160, 176, 1180, 176, YEL, 2), seg(1160, 560, 1180, 560, YEL, 2),
          text('responsabilidad', 1078, 356, 200, 24, { fontFamily: MONO, fontSize: 13, color: YEL, rotation: -90, textAlign: 'center' })],
          notes: 'Portada como un plano: la cuadrícula y el cajetín son decoraciones del patrón, y los seis niveles se levantan solos como las plantas de un edificio. Empresa y cifras inventadas.' },
        { layout: 'blank', bg: BG, transition: 'slide', extra: [
          text('Por qué publicamos las bandas', 80, 70, 1120, 70, { fontFamily: H, fontSize: 46, color: LINE }),
          ...[['6', 'niveles: cada puesto de la empresa está en uno', YEL], ['100 %', 'de las ofertas de empleo publicarán su banda', MINT], ['< 3 %', 'de brecha de género: nuestro objetivo para 2028', CORAL]].map(([n, l, c], i) =>
            withAnims(text(`<div style="font-family:${H};font-size:84px;color:${c};line-height:1.05">${n}</div><div style="margin-top:10px">${l}</div>`, 80 + i * 380, 200, 350, 260,
              { fontSize: 23, color: LINE, borderColor: LINE, dash: 'dash', pad: [24, 26, 24, 26] }), chain(i, 'fade-up'))),
          text('La directiva europea de transparencia retributiva ya obliga a mucho de esto. Queremos ir un paso más allá.', 80, 520, 1120, 70, { fontSize: 22, color: DIM, fontStyle: 'italic' })],
          notes: 'Tres cifras en recuadros discontinuos, como cotas de un plano. Las cifras son de ejemplo.' },
        { title: 'Seis bandas, a escala', layout: 'titleOnly', bg: BG, extra: [
          lbl('Miles de euros brutos al año', 80, 124, 500),
          ...[20, 30, 40, 50, 60, 70, 80, 90].flatMap(v => [shape('rect', X(v), 170, 1, 410, LINE, { opacity: 25 }), lbl(`${v} k`, X(v) - 30, 592, 60, { textAlign: 'center' })]),
          ...LV.flatMap(([n, name, lo, hi], i) => { const y = 525 - i * 70, mid = (lo + hi) / 2;
            return [lbl(`${n} · ${name}`, 80, y + 10, 210, { color: LINE, fontSize: 16 }),
              withAnims(shape('rect', X(lo), y, X(hi) - X(lo), 44, LINE, { opacity: 22, stroke: LINE, strokeWidth: 2 }), chain(i, 'fade-right', { duration: 300 })),
              withAnims(shape('rect', X(mid) - 2, y - 6, 4, 56, YEL), A('fade-in', { start: 'withPrev', duration: 300 })),
              withAnims(lbl(`${lo}–${hi}`, X(lo) + 6, y + 10, 90, { color: LINE, fontSize: 13 }), A('fade-in', { start: 'withPrev', duration: 300 }))]; }),
          text('<span style="color:#ffd166">▮</span> punto medio de la banda', 860, 120, 340, 30, { fontFamily: MONO, fontSize: 14, color: DIM, textAlign: 'right' })],
          notes: 'Las bandas dibujadas con formas a escala: el ancho es el recorrido salarial y la raya amarilla, el punto medio. Se solapan a propósito: así se puede ascender sin un salto brusco. Cifras de ejemplo.' },
        { title: 'La tabla, con sus fórmulas', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 80, y: 165, w: 1120, h: 430, fontSize: 22, header: true, headBg: NAVY, headFg: YEL, stroke: '#4a7aa6', banded: true, band: LINE,
            rows: [['Nivel', 'Mínimo', 'Máximo', 'Punto medio', 'Amplitud (%)'], ...LV.map(([n, name, lo, hi], i) => [`${n} · ${name}`, `${lo}.000 €`, `${hi}.000 €`, `=(B${i + 2}+C${i + 2})/2`, `=REDONDEAR((C${i + 2}/B${i + 2}-1)*100;0)`])],
            colW: [3, 2, 2, 2, 2] }),
          text('Punto medio = (mínimo + máximo) / 2 · Amplitud = máximo / mínimo − 1', 80, 612, 1120, 30, { fontFamily: MONO, fontSize: 15, color: DIM })],
          notes: 'Las dos últimas columnas son fórmulas de tabla: si Personas actualiza un mínimo o un máximo, el punto medio y la amplitud se recalculan solos.' },
        { title: 'Dónde estás dentro de tu banda', layout: 'titleOnly', bg: BG, extra: [
          mathBlock({ x: 80, y: 150, w: 1120, h: 110, fontSize: 42, latex: '\\text{CR} = \\frac{\\text{salario}}{\\text{punto medio de la banda}}', color: LINE }),
          withAnims(mathBlock({ x: 80, y: 282, w: 1120, h: 96, fontSize: 36, latex: '\\text{CR} = \\frac{37\\,800}{40\\,500} = 0{,}93', color: YEL }), A('fade-in', { start: 'click' })),
          shape('rect', 140, 470, 250, 50, CORAL, { opacity: 85 }), shape('rect', 390, 470, 500, 50, MINT, { opacity: 85 }), shape('rect', 890, 470, 250, 50, '#9fbddb', { opacity: 85 }),
          text('Por debajo', 140, 470, 250, 50, { fontSize: 18, fontWeight: 700, color: NAVY, textAlign: 'center', vAlign: 'middle' }),
          text('Dentro del mercado', 390, 470, 500, 50, { fontSize: 18, fontWeight: 700, color: NAVY, textAlign: 'center', vAlign: 'middle' }),
          text('Por encima', 890, 470, 250, 50, { fontSize: 18, fontWeight: 700, color: NAVY, textAlign: 'center', vAlign: 'middle' }),
          ...['0,80', '0,90', '1,00', '1,10', '1,20'].map((t, i) => lbl(t, 110 + i * 250, 528, 60, { textAlign: 'center' })),
          withAnims(shape('triangle', 453, 442, 24, 22, YEL, { rotation: 180 }), A('fade-down', { start: 'afterPrev' })),
          withAnims(lbl('Carmen · 0,93', 385, 412, 160, { color: YEL, textAlign: 'center' }), A('fade-down', { start: 'withPrev' })),
          text('En la revisión de marzo, quien está por debajo de 0,90 entra primero en el reparto.', 80, 580, 1120, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
          notes: 'Dos ecuaciones: la definición del compa-ratio y, con un clic, el ejemplo de Carmen (persona inventada, nivel N3). Después aparece su marca sobre la escala.' },
        { title: 'Brecha de género por nivel', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
          chartBlock({ x: 80, y: 160, w: 780, h: 480, chartType: 'bar', color: '#7f9fc0', seriesName: '2025', grid: true, dataLabels: true, yTitle: '% de diferencia en el salario medio',
            data: LV.map(([n], i) => ({ label: n, value: [2.1, 4.8, 7.9, 11.2, 13.5, 9.8][i] })), series: [{ name: '2026', values: [1.4, 3.2, 5.1, 7.4, 9.0, 6.2], color: YEL }] }),
          withAnims(stat('8,2 → 5,4 %', 'brecha media de los seis niveles en un año', 900, 190, 320, YEL, LINE, 50, { fontFamily: H }), chain(0, 'fade-left')),
          withAnims(text('La brecha crece con el nivel: el plan se centra en N4 y N5, donde están los ascensos.', 900, 380, 310, 160, { fontSize: 22, color: DIM, lineHeight: 1.4 }), chain(1, 'fade-left'))],
          notes: 'Barras agrupadas: la diferencia entre el salario medio de hombres y mujeres en cada nivel, en 2025 y en 2026. Datos de ejemplo.' },
        { title: 'Revisión 2027: de dónde sale el 7,2 %', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 80, y: 160, w: 1120, h: 470, chartType: 'waterfall', color: MINT, dataLabels: true, grid: true, yTitle: 'Miles de euros',
            data: [{ label: 'IPC', value: 550 }, { label: 'Méritos', value: 370 }, { label: 'Corrección de brecha', value: 180 }, { label: 'Promociones', value: 220 }, { label: 'Total', value: 0 }] }),
          text('Miles de euros brutos al año', 80, 120, 1120, 30, { fontFamily: MONO, fontSize: 15, color: DIM })],
          notes: 'Gráfico de cascada: cada partida suma al incremento de la masa salarial, y la última barra es el total (1,32 millones sobre 18,4: un 7,2 %). Cifras de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          device(portalSVG(NAVY, YEL, CORAL), 'browser', 80, 120, 680, 430, 'El portal de Personas con tu nivel, tu banda y tu posición en ella'),
          text('Y tú, ¿dónde estás?', 800, 140, 420, 70, { fontFamily: H, fontSize: 44, color: LINE }),
          text('Desde el 1 de febrero, en tu portal:', 800, 220, 420, 40, { fontSize: 22, color: YEL }),
          withAnims(text(ul('Tu nivel y tu banda', 'Tu compa-ratio', 'Qué hace falta para el siguiente nivel', 'Cuándo es tu próxima revisión'), 800, 270, 420, 240, { fontSize: 23, color: LINE, lineHeight: 1.6 }), A('fade-left', { start: 'afterPrev', delay: 400 }))],
          notes: 'El portal es un dibujo propio (SVG) dentro de un marco de navegador. Carmen y sus cifras son inventadas.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'qa', fontSize: 34, question: '¿Qué te gustaría preguntar sobre las bandas?', options: [], x: 80, y: 60, w: 1120, h: 580 })],
          notes: 'Preguntas anónimas desde el móvil; el público vota las que más le interesan y se responden en orden.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Career paths: a board game on green felt. A 3D character walks the squares; two paths; opportunity cards flip.
  biz_hr_career: { name: 'Plan de carrera y movilidad interna', cat: 'biz',
    summary: 'Juego de mesa: personaje 3D que recorre el tablero, dado que gira, dos caminos que se dibujan, cartas que se voltean, dona y ordenar', make: () => {
      const FELT = '#1e4d3f', BOARD = '#f3e7cc', RED = '#e2574c', YEL = '#f2b33d', BLUE = '#3f7cc9', GREEN = '#4caf7d', PURP = '#8e6cc9', INK = '#24303c', CREAM = '#fff7e6', SOFTG = '#cfe3d9';
      const H = head('bold'), COLS = [RED, YEL, BLUE, GREEN, PURP];
      // Darker or lighter twins for text (yellow and green on the cream board, blue on the felt).
      const YELD = '#94650b', GREEND = '#2b8556', BLUEL = '#9cc2f2';
      const big = (s, x, y, w, h, size, color, props = {}) => text(s, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 0.95, ...props });
      const die = (x, y, s, props = {}) => { const d = s * 0.16, at = [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]];
        return [shape('rounded', x, y, s, s, '#ffffff', { radius: 16, shadow: { color: '#00000066', blur: 10, x: 4, y: 6 }, ...props }),
          ...at.map(([u, v]) => shape('ellipse', x + u * s - d / 2, y + v * s - d / 2, d, d, INK, props))]; };
      const board = (y) => [shape('rounded', 60, y, 1160, 200, BOARD, { radius: 24, shadow: { color: '#00000055', blur: 18, x: 0, y: 8 } }),
        ...Array.from({ length: 10 }, (_, i) => { const x = 92 + i * 110, c = COLS[i % 5];
          return [shape('rounded', x, y + 70, 96, 96, i === 9 ? INK : c, { radius: 12 }),
            i === 9 ? icon('flag', x + 26, y + 84, 44, YEL) : text(i ? String(i + 1) : 'SALIDA', x, y + 70, 96, 96, { fontFamily: H, fontSize: i ? 46 : 26, color: '#ffffff', textAlign: 'center', vAlign: 'middle' }),
            ...(i === 9 ? [text('META', x, y + 132, 96, 30, { fontFamily: H, fontSize: 22, color: YEL, textAlign: 'center' })] : [])]; }).flat()];
      const walker = () => m3d('kn-character', 70, 360, 140, 190, { view: 'front', walk: { clip: 'walk', end: 'jump', endOnce: true, face: true, look: true } });
      return numbered(build({ name: 'Tu carrera, casilla a casilla', palette: 'revela', fonts: 'bold', title: { size: 60, color: CREAM } }, [
        { layout: 'blank', bg: FELT, transition: 'fade', extra: (() => {
          // (The walk is made first, so that it plays on arrival and the die waits for the click.)
          const walk = withAnims(walker(), path([[990, 0]], { start: 'afterPrev', delay: 600, duration: 6000 }));
          return [
          big('TU CARRERA,<br>CASILLA A CASILLA', 80, 70, 940, 240, 118, CREAM),
          text('Plan de desarrollo profesional 2027: cómo crecer sin cambiar de empresa', 84, 316, 900, 40, { fontSize: 24, color: SOFTG }),
          ...die(1070, 90, 110).map((b, k) => withAnims(b, A('jump', { start: k ? 'withPrev' : 'click', duration: 700, ...(k === 0 && { sound: 'drumroll' }) }))),
          ...board(450),
          walk]; })(),
          notes: 'Al llegar, el personaje 3D anda por el tablero de la salida a la meta y salta al llegar (Modelo 3D ▸ Al moverse ▸ Mientras se mueve). Un clic hace saltar el dado con un redoble. Modelo de Kenney (CC0).' },
        { layout: 'blank', bg: FELT, transition: 'slide', extra: [
          big('DOS CAMINOS, EL MISMO VALOR', 80, 50, 1120, 80, 64, CREAM),
          big('ESPECIALISTA', 100, 150, 360, 50, 36, YEL), big('GESTIÓN DE PERSONAS', 820, 150, 360, 50, 36, BLUEL, { textAlign: 'right' }),
          ...[[['N6 · PRINCIPAL', 'Decide la arquitectura técnica de la empresa'], ['N5 · REFERENTE', 'Marca el estándar de su especialidad'], ['N4 · EXPERTO/A', 'Resuelve lo que nadie más sabe resolver']],
            [['N6 · DIRECCIÓN', 'Lleva un área y su presupuesto'], ['N5 · RESPONSABLE', 'Lidera un equipo y su desarrollo'], ['N4 · COORDINACIÓN', 'Organiza el trabajo de 3 a 5 personas']]].flatMap((lane, side) => {
            const x = side ? 820 : 100, c = side ? BLUE : YEL;
            return [withAnims(seg(640, 560, x + 180, 548, CREAM, 3), A('draw', { start: 'click', duration: 600 })),
              ...lane.slice().reverse().map(([h, d], k) => withAnims(card(`<div style="font-family:${H};font-size:30px;color:${side ? BLUE : YELD}">${h}</div><div>${d}</div>`, x, 438 - k * 112, 360, 100, BOARD,
                { fontSize: 19, color: INK, radius: 12, pad: [10, 18, 10, 18], borderColor: c }), A('fade-up', { start: 'afterPrev', duration: 350, sound: 'pop' })))]; }),
          card(`<div style="font-family:${H};font-size:30px;color:${YEL}">MISMO NIVEL, MISMA BANDA</div><div style="margin-top:6px">Puedes cambiar de camino una vez sin perder nivel.</div>`, 490, 260, 300, 200, '#163a30', { fontSize: 19, color: CREAM, radius: 16, textAlign: 'center', vAlign: 'middle' }),
          card(`<span style="font-family:${H};font-size:30px">SALIDA · N3 SÉNIOR</span>`, 480, 560, 320, 70, BOARD, { color: INK, radius: 12, textAlign: 'center', vAlign: 'middle', pad: [6, 10, 6, 10] })],
          notes: 'Dos caminos de carrera con el mismo valor: un clic dibuja el camino de especialista y sube sus tres casillas; otro, el de gestión. La banda salarial es la misma en los dos para cada nivel.' },
        { layout: 'blank', bg: FELT, extra: [
          big('CARTAS DE OPORTUNIDAD', 80, 50, 1120, 80, 64, CREAM),
          ...[['shuffle', 'ROTACIÓN', 'Seis meses en otro equipo con tu puesto guardado.', 'Desde un año en la empresa', RED], ['users', 'MENTORÍA', 'Una hora cada quince días con alguien de otra área.', 'Abierta a todo el mundo', BLUE],
            ['rocket', 'PROYECTO PUENTE', 'El 20 % de tu tiempo en un proyecto de otra área.', 'Con el visto bueno de tu responsable', GREEN]].flatMap(([ic, h, d, f, c], i) => {
            const x = 100 + i * 370, rot = [-3, 0, 3][i];
            return [withAnims(card(`<div style="height:100px"></div><div style="font-family:${H};font-size:46px;color:${c === GREEN ? GREEND : c}">${h}</div><div style="margin:10px 0 22px">${d}</div><div style="font-size:18px;color:#6b6252">${f}</div>`,
              x, 175, 330, 420, BOARD, { fontSize: 24, color: INK, radius: 18, borderColor: c, rotation: rot, textAlign: 'center', pad: [28, 26, 24, 26], shadow: { color: '#00000066', blur: 16, x: 0, y: 8 } }),
              A('flip', { start: 'click', duration: 600, sound: 'whoosh' })),
              withAnims(icon(ic, x + 125, 210, 80, c), A('fade-in', { start: 'afterPrev', duration: 250 }))]; })],
          notes: 'Como las cartas de un juego de mesa: cada clic voltea una (efecto «Voltear» con silbido). Las tres opciones son reales en el plan inventado de este ejemplo.' },
        { layout: 'blank', bg: BOARD, transition: 'fade', extra: [
          big('TU PLAN 70 · 20 · 10', 80, 50, 1120, 80, 64, INK),
          chartBlock({ x: 80, y: 150, w: 520, h: 500, chartType: 'doughnut', color: RED, legend: false,
            data: [{ label: 'En el día a día', value: 70, color: RED }, { label: 'Con otras personas', value: 20, color: BLUE }, { label: 'En cursos', value: 10, color: YEL }] }),
          ...[['70 %', 'En el día a día', 'Retos reales: un cliente nuevo, un proyecto que te queda grande.', RED], ['20 %', 'Con otras personas', 'Mentoría, feedback, trabajar al lado de alguien que sabe más.', BLUE], ['10 %', 'En cursos', 'Formación y lecturas, para poner nombre a lo que aprendes.', YELD]].map(([n, h, d, c], i) =>
            withAnims(text(`<div style="font-family:${H};font-size:48px;color:${c};line-height:1">${n} · ${h.toUpperCase()}</div><div style="margin-top:6px">${d}</div>`, 660, 170 + i * 160, 550, 140, { fontSize: 21, color: INK, lineHeight: 1.35 }), chain(i, 'fade-left')))],
          notes: 'Dona con un color por porción y sin leyenda: la explicación va al lado. El modelo 70-20-10 es una referencia orientativa, no una regla exacta.' },
        { layout: 'blank', bg: FELT, transition: 'slide', extra: [
          big('VACANTES CUBIERTAS DESDE DENTRO', 80, 50, 1120, 80, 60, CREAM),
          chartBlock({ x: 80, y: 150, w: 760, h: 490, chartType: 'bar', color: YEL, dataLabels: true, yMax: 60, yTitle: '% de las vacantes',
            data: [2022, 2023, 2024, 2025, 2026].map((y, i) => ({ label: String(y), value: [18, 24, 31, 38, 46][i] })) }),
          withAnims(big('46 %', 900, 200, 300, 130, 130, YEL), chain(0, 'zoom-in', { sound: 'chime' })),
          withAnims(text('de las vacantes de 2026 las cubrió alguien de casa. Dos de cada cinco ascensos vinieron de otra área.', 900, 340, 310, 160, { fontSize: 22, color: CREAM, lineHeight: 1.4 }), chain(1, 'fade-up'))],
          notes: 'Barras con etiquetas: el porcentaje de vacantes cubiertas con movilidad interna crece cada año. Datos de ejemplo.' },
        { layout: 'blank', bg: FELT, extra: [pollBlock({ kind: 'order', fontSize: 32, question: 'Ordena los pasos para pedir un cambio interno', options: ['Hablarlo con tu responsable', 'Mirar las vacantes en el portal', 'Conversación con Personas', 'Entrevista con el equipo de destino', 'Plan de traspaso de tu trabajo'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Actividad de ordenar desde el móvil: el orden correcto es el de la lista original. Hablarlo primero con tu responsable evita sorpresas.' },
        { layout: 'blank', bg: FELT, transition: 'zoom', extra: [
          big('TIRA EL DADO', 80, 90, 760, 140, 140, YEL),
          text('Tu conversación de carrera: del 2 al 20 de noviembre, con tu responsable y alguien de Personas. Trae una idea de hacia dónde quieres ir.', 84, 250, 760, 120, { fontSize: 26, color: CREAM, lineHeight: 1.4 }),
          ...die(960, 110, 120, { rotation: 12 }),
          ...board(450),
          m3d('kn-character', 1050, 360, 140, 190, { view: 'front', clip: 'jump' })],
          notes: 'Cierre: el personaje celebra en la meta. El dado está inclinado para dar sensación de movimiento.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Merging two teams: a jigsaw. Pieces fly into place, the org chart rearranges itself (Transform), the change curve.
  biz_hr_change: { name: 'Fusión de dos equipos', cat: 'biz',
    summary: 'Piezas de puzle que encajan por trayectorias, organigrama que se reordena con Transformar, curva del cambio, línea del tiempo y RACI', make: () => {
      const BG = '#f3f5f8', NAVY = '#22385a', TEAL = '#1aa39a', ORANGE = '#cc611c', YEL = '#f4c247', PINK = '#e0607a', GREYT = '#5f6b7b', TEAL2 = '#7fd0c9', ORANGE2 = '#f7bf92';
      const H = head('modern');
      const S = 230, STEP = S * 0.64, X0 = 800, Y0 = 200, PC = [TEAL, ORANGE, PINK, YEL];
      const at = k => [X0 + (k % 2) * STEP, Y0 + Math.floor(k / 2) * STEP];
      const ids = { L: uid(), R: uid(), tel: uid(), chat: uid(), rec: uid(), n1: uid(), n2: uid() };
      const box = (id, html, x, y, w, h, c, size = 20) => ({ ...card(html, x, y, w, h, c, { fontSize: size, color: c === TEAL2 || c === ORANGE2 ? NAVY : '#ffffff', radius: 12, textAlign: 'center', vAlign: 'middle', pad: [6, 10, 6, 10], fontWeight: 700 }), id });
      return numbered(build({ name: 'Dos equipos, un solo puzle', palette: 'office', fonts: 'modern', title: { size: 42, color: NAVY } }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          kicker('ATENCIÓN AL CLIENTE + SOPORTE TÉCNICO', 80, 170, 640, TEAL, 16),
          text('Dos equipos,<br>un solo puzle', 76, 210, 640, 190, { fontFamily: H, fontSize: 68, fontWeight: 800, color: NAVY, lineHeight: 1.1 }),
          text('Nace Experiencia de Cliente: qué cambia, cuándo y para quién.', 80, 420, 560, 80, { fontSize: 26, color: GREYT, lineHeight: 1.4 }),
          ...[[640, 450], [1030, 460], [980, 40], [690, 50]].map(([sx, sy], k) => { const [fx, fy] = at(k);
            return withAnims(piece(PUZZLE[k], sx, sy, S, PC[k]), path([[fx - sx, fy - sy]], { start: 'afterPrev', duration: 900, ...(k === 0 && { delay: 500 }), ...(k === 3 && { sound: 'click' }) })); })],
          notes: 'Las cuatro piezas son formas propias (un trazo con lengüetas y huecos) y encajan solas al llegar, una tras otra, con trayectorias. La fusión y la empresa son inventadas.' },
        { title: 'Por qué nos juntamos', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
          ...[['38 %', 'de los casos cambian de equipo antes de resolverse', TEAL, '#13857d'], ['2 colas', 'que el cliente no entiende: con una basta', ORANGE, ORANGE], ['−1 día', 'en el tiempo medio de resolución', PINK, '#c4405c']].flatMap(([n, l, c, fg], i) => [
            withAnims(piece(PUZZLE[i], 90 + i * 380, 165, 170, c), chain(i, 'zoom-in', { duration: 350, sound: 'pop' })),
            withAnims(stat(n, l, 100 + i * 380, 350, 330, fg, NAVY, 64, { fontFamily: H, rows: 3 }), A('fade-up', { start: 'withPrev' }))]),
          withAnims(card('Una sola puerta para el cliente y un solo equipo que resuelve de principio a fin.', 100, 560, 1080, 76, '#ffffff', { fontSize: 23, color: NAVY, radius: 12, borderColor: '#d5dbe3', textAlign: 'center', vAlign: 'middle' }), A('fade-up', { start: 'click' }))],
          notes: 'Tres razones, cada una con su pieza. Cifras de ejemplo.' },
        { title: 'Hoy: dos organigramas', layout: 'titleOnly', bg: BG, extra: [
          box(ids.L, 'Atención al cliente', 110, 190, 460, 80, TEAL, 26),
          shape('rect', 339, 270, 2, 30, GREYT), shape('rect', 185, 300, 310, 2, GREYT), ...[185, 340, 495].map(x => shape('rect', x - 1, 300, 2, 30, GREYT)),
          box(ids.tel, 'Teléfono', 110, 330, 150, 70, TEAL2, 18), box(ids.chat, 'Chat', 265, 330, 150, 70, TEAL2, 18), box(ids.rec, 'Reclamaciones', 420, 330, 150, 70, TEAL2, 17),
          box(ids.R, 'Soporte técnico', 710, 190, 460, 80, ORANGE, 26),
          shape('rect', 939, 270, 2, 30, GREYT), shape('rect', 822, 300, 236, 2, GREYT), ...[822, 1058].map(x => shape('rect', x - 1, 300, 2, 30, GREYT)),
          box(ids.n1, 'Nivel 1', 710, 330, 225, 70, ORANGE2, 18), box(ids.n2, 'Nivel 2', 945, 330, 225, 70, ORANGE2, 18),
          text('24 personas', 110, 420, 460, 34, { fontSize: 20, color: GREYT, textAlign: 'center' }), text('11 personas', 710, 420, 460, 34, { fontSize: 20, color: GREYT, textAlign: 'center' }),
          card('Hoy el cliente llama, le pasan a Soporte y vuelve a contar su problema desde el principio.', 110, 500, 1060, 90, '#ffffff', { fontSize: 22, color: NAVY, radius: 12, borderColor: '#d5dbe3', textAlign: 'center', vAlign: 'middle' })],
          notes: 'El organigrama de hoy: dos equipos separados. En la diapositiva siguiente, las mismas cajas se reordenan con Transformar.' },
        { title: 'Desde enero: un solo equipo', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
          box(uid(), 'Experiencia de Cliente', 390, 160, 500, 76, NAVY, 26),
          shape('rect', 639, 236, 2, 24, GREYT), shape('rect', 360, 260, 560, 2, GREYT), shape('rect', 359, 260, 2, 30, GREYT), shape('rect', 919, 260, 2, 30, GREYT),
          box(ids.L, 'Primera respuesta', 120, 290, 480, 72, TEAL, 24), box(ids.R, 'Resolución experta', 680, 290, 480, 72, ORANGE, 24),
          shape('rect', 359, 362, 2, 48, GREYT), shape('rect', 919, 362, 2, 48, GREYT),
          box(ids.tel, 'Teléfono', 120, 410, 150, 70, TEAL2, 18), box(ids.chat, 'Chat', 285, 410, 150, 70, TEAL2, 18), box(ids.n1, 'Nivel 1', 450, 410, 150, 70, ORANGE2, 18),
          box(ids.n2, 'Nivel 2', 680, 410, 235, 70, ORANGE2, 18), box(ids.rec, 'Reclamaciones', 925, 410, 235, 70, TEAL2, 18),
          withAnims(card('Nadie cambia de responsable directo hasta enero. Nadie pierde puesto ni salario.', 120, 530, 1040, 80, YEL, { fontSize: 24, color: NAVY, radius: 12, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }), A('fade-up', { start: 'afterPrev', delay: 600 }))],
          notes: 'Transformar: las cajas son los mismos objetos que en la diapositiva anterior y viajan a su nuevo sitio (Nivel 1 se une a la primera respuesta; Reclamaciones, a la resolución experta). El aviso amarillo entra solo.' },
        { title: 'Lo normal es que cueste', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 80, y: 160, w: 760, h: 480, chartType: 'line', color: PINK, seriesName: 'Ánimo del equipo', grid: true, yMin: 0, yMax: 100, yTitle: 'Índice de ánimo (0–100)',
            data: ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'].map((l, i) => ({ label: l, value: [70, 52, 40, 45, 58, 72, 80][i] })) }),
          ...[['Sorpresa', 'Octubre y noviembre: preguntas, rumores, cansancio.', ORANGE], ['El valle', 'Diciembre: lo viejo ya no vale y lo nuevo aún no funciona.', PINK], ['Adopción', 'Desde febrero: las primeras mejoras se notan.', TEAL]].map(([h, d, c], i) =>
            withAnims(card(`<b style="color:${c};font-size:24px">${h}</b><br>${d}`, 880, 170 + i * 155, 320, 135, '#ffffff', { fontSize: 19, color: NAVY, radius: 12, borderColor: '#d5dbe3', pad: [14, 18, 14, 18] }), chain(i, 'fade-left')))],
          notes: 'La curva del cambio: el ánimo baja antes de subir. Contarlo de antemano ayuda a que el valle no asuste. Valores ilustrativos, no medidos.' },
        { title: 'El calendario', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
          dg('timeline', 'Octubre\n  Anuncio y preguntas\nNoviembre\n  Talleres por equipos\nDiciembre\n  Herramienta y formación\nEnero\n  Nueva estructura\nMarzo\n  Primera revisión', 80, 180, 1120, 380, { colors: 'colorful', oneByOne: true, fontScale: 1.15 })],
          notes: 'Línea del tiempo que aparece hito a hito (Diagrama ▸ Uno a uno al presentar).' },
        { title: 'Quién hace qué', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 80, y: 165, w: 1120, h: 360, fontSize: 23, header: true, headBg: NAVY, headFg: '#ffffff', stroke: '#d5dbe3', banded: true, band: TEAL,
            rows: [['Tarea', 'Dirección', 'Personas', 'Responsables', 'Equipos'], ['Anunciar la fusión', 'A', 'R', 'C', 'I'], ['Diseñar los nuevos turnos', 'A', 'C', 'R', 'C'],
              ['Formar en la nueva herramienta', 'I', 'A', 'R', 'R'], ['Resolver dudas de contrato', 'A', 'R', 'C', 'I'], ['Medir el ánimo cada mes', 'I', 'A', 'R', 'C']], colW: [4, 1.6, 1.6, 1.8, 1.6] }),
          text('<b>R</b> lo hace · <b>A</b> lo aprueba · <b>C</b> se le consulta · <b>I</b> se le informa', 80, 550, 1120, 40, { fontSize: 22, color: GREYT, textAlign: 'center' })],
          notes: 'Matriz RACI: una sola A por fila, para que siempre haya alguien que decide.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'qa', fontSize: 34, question: 'Pregunta lo que quieras sobre la fusión (es anónimo)', options: [], x: 80, y: 60, w: 1120, h: 580 })],
          notes: 'Preguntas anónimas y votadas por el público: las que no dé tiempo a responder se publican después con su respuesta.' },
        { layout: 'blank', bg: NAVY, transition: 'zoom', extra: [
          text('Encajamos', 80, 210, 700, 130, { fontFamily: H, fontSize: 96, fontWeight: 800, color: '#ffffff' }),
          text('Cada pieza cuenta. Buzón de preguntas abierto hasta el 30 de noviembre.', 80, 360, 600, 90, { fontSize: 26, color: '#c9d4e4', lineHeight: 1.4 }),
          ...PC.map((c, k) => { const [x, y] = at(k); return withAnims(piece(PUZZLE[k], x, y, S, c, { stroke: NAVY }), A('pulse', { start: k ? 'withPrev' : 'afterPrev', delay: 300 + k * 150, duration: 600 })); })],
          notes: 'Cierre con el puzle completo: las piezas laten una vez al llegar (énfasis «Latido»).' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Clocking in and the right to disconnect: a city at night whose windows go out, a clock, the phone app and JSON rules.
  biz_hr_disconnect: { name: 'Registro de jornada y desconexión', cat: 'biz',
    summary: 'Ciudad de noche cuyas ventanas se apagan en cadena, reloj que gira, app en un móvil, reglas, código JSON, área, nube de palabras y farol 3D', make: () => {
      const NIGHT = '#0d1226', NIGHT2 = '#18204a', MOON = '#f4e9c8', AMBER = '#ffb547', BLUE = '#7aa2f7', ROSE = '#f7768e', DIM = '#a3abc8', FG = '#e9ecf5';
      const H = head('classic');
      // (Stars anywhere but inside the boxes [x, y, w, h] of `keep`, so none falls between the letters of a text.)
      const stars = (n, seed, maxY = 380, keep = []) => { const r = rnd(seed); return Array.from({ length: n }, () => { const d = 2 + Math.round(r() * 3), x = Math.round(40 + r() * 1200), y = Math.round(30 + r() * maxY), o = 40 + Math.round(r() * 50);
        return keep.some(([kx, ky, kw, kh]) => x > kx - 10 && x < kx + kw + 10 && y > ky - 10 && y < ky + kh + 10) ? null : shape('ellipse', x, y, d, d, '#ffffff', { opacity: o }); }).filter(Boolean); };
      const lit = (() => { const all = cityWindows(), r = rnd(23), out = []; while (out.length < 18) { const w = all[Math.floor(r() * all.length)]; if (!out.includes(w) && w.y > 420) out.push(w); } return out; })();
      const moon = (x, y, d) => [glow(x - d * 0.6, y - d * 0.6, d * 2.2, '#3a3f6e', NIGHT, 60), shape('ellipse', x, y, d, d, MOON, { fill2: '#d8c99a', gradType: 'radial' })];
      return numbered(build({ name: 'Cuando acaba la jornada, acaba', palette: 'midnight', fonts: 'classic', title: { size: 46, color: MOON } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', back: [...stars(60, 5, 380, [[76, 100, 800, 300]]), ...moon(1080, 90, 110)], extra: [
          pic(citySVG(), 0, 0, 1280, 720, 'Edificios de oficinas de noche'),
          ...lit.map((w, i) => withAnims(shape('rect', w.x, w.y, 12, 16, AMBER, { shadow: { color: AMBER, blur: 8, x: 0, y: 0 } }), A('fade-out', { start: 'afterPrev', delay: i ? 120 : 1200, duration: 250 }))),
          kicker('REGISTRO DE JORNADA Y DERECHO A DESCONECTAR', 80, 110, 760, AMBER, 15),
          text('Cuando acaba la jornada, acaba', 76, 150, 800, 160, { fontFamily: H, fontSize: 62, color: FG, lineHeight: 1.15 }),
          text('Cómo fichamos y qué esperamos fuera de horario, desde el 1 de noviembre.', 80, 320, 640, 70, { fontSize: 23, color: DIM, lineHeight: 1.4 })],
          notes: 'La ciudad es un dibujo propio (SVG); las ventanas encendidas son formas que se apagan solas una tras otra al llegar. La empresa y las fechas son inventadas.' },
        { layout: 'blank', bg: NIGHT, transition: 'slide', back: [...stars(30, 9, 600, [[110, 90, 270, 540], [460, 100, 760, 540]])], extra: [
          device(clockInSVG(NIGHT, AMBER, BLUE), 'phone', 110, 90, 270, 540, 'La app de fichaje: entrada, pausa y salida de hoy'),
          text('Fichar en diez segundos', 460, 100, 740, 70, { fontFamily: H, fontSize: 48, color: MOON }),
          ...[['smartphone', 'Desde el móvil, el ordenador o el lector de la entrada.'], ['coffee', 'Las pausas se marcan aparte y no cuentan como jornada.'], ['pencil', 'Si te olvidas, lo corriges tú en siete días y tu responsable lo valida.']].flatMap(([ic, t], i) => [
            withAnims(icon(ic, 470, 215 + i * 112, 44, AMBER), A('zoom-in', { start: 'click', duration: 300 })),
            withAnims(text(t, 540, 205 + i * 112, 660, 90, { fontSize: 24, color: FG, lineHeight: 1.35, vAlign: 'middle' }), A('fade-left', { start: 'withPrev' }))]),
          text('El registro diario de jornada es obligatorio por ley (artículo 34.9 del Estatuto de los Trabajadores).', 460, 570, 740, 60, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
          notes: 'La app es un dibujo propio dentro de un marco de móvil. Los tres puntos entran con su icono a cada clic.' },
        { layout: 'blank', bg: NIGHT, extra: [
          shape('ellipse', 110, 150, 420, 420, NIGHT2, { stroke: MOON, strokeWidth: 5 }),
          ...Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180, cx = 320 + 180 * Math.sin(a), cy = 360 - 180 * Math.cos(a), long = i % 3 === 0;
            return shape('rect', Math.round(cx - (long ? 4 : 2)), Math.round(cy - (long ? 14 : 9)), long ? 8 : 4, long ? 28 : 18, MOON, { rotation: i * 30 }); }),
          stroke('M50 50 L38 70.8', 110, 150, 420, 420, MOON, 11, { strokeLinecap: 'round' }),
          withAnims(stroke('M50 50 L50 14', 110, 150, 420, 420, AMBER, 6), A('spin360', { start: 'click', duration: 2400 })),
          shape('ellipse', 308, 348, 24, 24, AMBER),
          text('19:00', 600, 150, 600, 150, { fontFamily: H, fontSize: 130, color: AMBER, lineHeight: 1 }),
          text('A partir de aquí:', 604, 320, 600, 44, { fontSize: 28, color: MOON, fontStyle: 'italic' }),
          withAnims(text(ul('Ni correos ni mensajes de trabajo', 'Nadie espera respuesta hasta las 8:00', 'Tampoco en fines de semana ni en vacaciones'), 600, 380, 600, 200, { fontSize: 26, color: FG, lineHeight: 1.55 }), A('fade-up', { start: 'afterPrev', sound: 'chime' }))],
          notes: 'Reloj hecho con formas: la aguja larga da una vuelta completa con un clic (énfasis «Dar una vuelta») y después aparece la lista con una campanilla.' },
        { title: 'Cuatro reglas para todos', layout: 'titleOnly', bg: NIGHT, extra: [
          ...[['moon', 'Silencio de 19:00 a 8:00', 'Ni correos ni mensajes de trabajo, tampoco el fin de semana.', BLUE], ['send', 'Envío programado', 'Si escribes tarde, el correo sale a las 8:00 del día siguiente.', AMBER],
            ['bell', 'Guardias pagadas', 'Las urgencias de verdad tienen turno, teléfono y compensación.', ROSE], ['calendar', 'Reuniones de 9:30 a 17:00', 'Nada antes ni después, y los viernes por la tarde, libres.', '#9ece6a']].flatMap(([ic, h, d, c], i) => {
            const x = 80 + (i % 2) * 570, y = 170 + Math.floor(i / 2) * 230;
            return [withAnims(shape('rounded', x, y, 550, 205, NIGHT2, { radius: 18, stroke: c, strokeWidth: 2 }), A('zoom-in', { start: 'click', duration: 350, sound: 'pop' })),
              withAnims(icon(ic, x + 30, y + 30, 54, c), A('fade-in', { start: 'withPrev' })),
              withAnims(text(`<div style="font-family:${H};font-size:30px;color:${MOON}">${h}</div><div style="margin-top:8px">${d}</div>`, x + 110, y + 24, 410, 160, { fontSize: 21, color: DIM, lineHeight: 1.4 }), A('fade-in', { start: 'withPrev' }))]; })],
          notes: 'Cuatro tarjetas que aparecen a cada clic con un «pop». Las guardias se pactan con cada equipo.' },
        { title: 'Así viene configurado tu correo', layout: 'titleOnly', bg: NIGHT, extra: [
          codeBlock({ x: 80, y: 165, w: 760, h: 430, fontSize: 18, lang: 'json', lineSteps: '2|3-7|8|9',
            code: '{\n  "horario_laboral": { "inicio": "08:00", "fin": "19:00" },\n  "fuera_de_horario": {\n    "envio": "programado",\n    "programar_para": "08:00 del siguiente día laborable",\n    "aviso_al_redactar": true\n  },\n  "notificaciones_movil": "silenciadas",\n  "excepciones": ["guardia", "incidencia_critica"]\n}' }),
          ...[['1', 'Tu horario, el de tu contrato'], ['2', 'Lo que escribes tarde espera a la mañana'], ['3', 'El móvil no suena fuera de horario'], ['4', 'Solo las guardias saltan la regla']].map(([n, t], i) =>
            text(`<span style="font-family:${H};font-size:30px;color:${AMBER}">${n}</span>&nbsp;&nbsp;${t}`, 880, 175 + i * 105, 330, 90, { fontSize: 20, color: FG, borderColor: '#2c3566', radius: 10, pad: [12, 16, 12, 16], vAlign: 'middle' }))],
          notes: 'Bloque de código con pasos de resaltado: cada clic ilumina una regla de la configuración (inventada) y su explicación de la derecha.' },
        { title: 'Correos fuera de horario', layout: 'titleOnly', bg: NIGHT, transition: 'fade', extra: [
          chartBlock({ x: 80, y: 160, w: 780, h: 480, chartType: 'area', color: BLUE, grid: true, yTitle: 'Correos por persona y semana', xTitle: 'Semana del piloto',
            data: Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: [14, 13, 15, 12, 9, 7, 6, 5, 4, 4, 3, 3][i] })) }),
          withAnims(stat('−79 %', 'de correos fuera de horario en tres meses de piloto', 900, 190, 310, AMBER, FG, 80, { fontFamily: H }), chain(0, 'zoom-in', { sound: 'chime' })),
          withAnims(text('La regla empezó en la semana 5. Nadie ha perdido un cliente por esperar a las 8:00.', 900, 420, 310, 140, { fontSize: 21, color: DIM, lineHeight: 1.4 }), chain(1, 'fade-up'))],
          notes: 'Gráfico de área con los correos enviados fuera de horario por persona y semana durante el piloto. Datos de ejemplo.' },
        { layout: 'blank', bg: NIGHT, extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué vas a hacer con tus tardes?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Nube de palabras en directo: cada persona escribe una o dos palabras desde el móvil. Suele salir deporte, familia, leer…' },
        { layout: 'blank', bg: NIGHT, transition: 'zoom', transitionSpeed: 'slow', back: [...stars(50, 13, 640, [[76, 210, 680, 320], [820, 110, 360, 500]]), ...moon(170, 90, 80)], extra: [
          text('Desconecta.<br>Mañana seguimos.', 80, 220, 660, 220, { fontFamily: H, fontSize: 72, color: MOON, lineHeight: 1.15 }),
          text('Dudas sobre el fichaje: portal de Personas › Jornada.', 80, 470, 620, 40, { fontSize: 22, color: DIM }),
          m3d('kh-Lantern', 820, 110, 360, 500, { autoRotate: false, motion: 'float', view: 'three', edge: 'fade' })],
          notes: 'Cierre con un farol 3D que flota (Modelo 3D ▸ Vista ▸ Al entrar: Flotar) y la transición «Zoom» lenta.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · An equality plan: hydraulic floor tiles. A mosaic, tiles as the axes of the plan, 100 % bars, goals and a quiz.
  biz_hr_equality: { name: 'Plan de igualdad', cat: 'biz',
    summary: 'Baldosas hidráulicas dibujadas: mosaico, ejes que aparecen con sonido, barras al 100 %, tabla de metas, pasos del protocolo y test', make: () => {
      const CREAM = '#f3ead8', TEAL = '#1f6f78', OCHRE = '#d9932b', OCHRED = '#a5650f', BRICK = '#b5462f', INK = '#25313a', DIM = '#5e6a70', SAND = '#e7dac0';
      const H = head('friendly');
      const SETS = [[CREAM, TEAL, OCHRE, BRICK], [CREAM, BRICK, TEAL, OCHRE], [CREAM, OCHRE, BRICK, TEAL]];
      const one = k => svgURL(200, 200, tile(0, 0, 200, SETS[k % 3]));
      return numbered(build({ name: 'Igualdad, baldosa a baldosa', palette: 'paper', fonts: 'friendly', title: { size: 44, color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', back: [pic(mosaicSVG(560, 720, 140, SETS), 0, 0, 560, 720, 'Mosaico de baldosas hidráulicas'), shape('rect', 560, 0, 10, 720, INK)], extra: [
          kicker('PLAN DE IGUALDAD 2027–2030', 640, 170, 560, BRICK, 16),
          text('Igualdad,<br>baldosa a baldosa', 636, 220, 580, 170, { fontFamily: H, fontSize: 56, fontWeight: 700, color: INK, lineHeight: 1.12 }),
          text('Diagnóstico, medidas y calendario del segundo plan de igualdad de Conservas Mareira.', 640, 420, 540, 100, { fontSize: 24, color: DIM, lineHeight: 1.4 }),
          text('Comisión de igualdad · 640 personas en plantilla', 640, 560, 540, 34, { fontSize: 19, color: TEAL, fontWeight: 700 })],
          notes: 'Conservas Mareira es una empresa inventada. El mosaico son baldosas hidráulicas dibujadas en SVG con tres combinaciones de color.' },
        { title: 'El punto de partida', layout: 'titleOnly', bg: CREAM, transition: 'slide', extra: [
          ...[['52 %', 'de la plantilla son mujeres', TEAL], ['31 %', 'de los puestos de dirección son de mujeres', BRICK], ['7,8 %', 'de brecha en el salario medio', OCHRED], ['18 %', 'de las reducciones de jornada son de hombres', TEAL]].flatMap(([n, l, c], i) => [
            withAnims(pic(one(i), 80 + i * 290, 180, 130, 130, 'Baldosa'), chain(i, 'zoom-in', { duration: 300, sound: 'pop' })),
            withAnims(stat(n, l, 80 + i * 290, 340, 270, c, INK, 72, { fontFamily: H, fontSize: 22, rows: 3 }), A('fade-up', { start: 'withPrev' }))]),
          text('Datos del diagnóstico de 2026, con la plantilla a 31 de diciembre.', 80, 600, 1120, 34, { fontSize: 19, color: DIM, fontStyle: 'italic' })],
          notes: 'Cuatro cifras del diagnóstico, cada una con su baldosa. Datos inventados para el ejemplo.' },
        { title: 'Mujeres y hombres por nivel', layout: 'titleOnly', bg: CREAM, extra: [
          chartBlock({ x: 80, y: 160, w: 780, h: 480, chartType: 'stacked100', color: BRICK, seriesName: 'Mujeres', grid: true, dataLabels: true,
            data: [['Dirección', 31], ['Mandos intermedios', 42], ['Técnicos', 55], ['Producción', 58], ['Oficinas', 64]].map(([l, v]) => ({ label: l, value: v })),
            series: [{ name: 'Hombres', values: [69, 58, 45, 42, 36], color: TEAL }] }),
          withAnims(card(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${BRICK}">Hay talento en la base…</div><div style="margin:6px 0 16px">…pero no llega arriba. Cuanto más alto el nivel, menos mujeres.</div><div style="font-family:${H};font-size:28px;font-weight:700;color:${TEAL}">Por eso</div><div style="margin-top:6px">el plan se centra en la promoción.</div>`,
            900, 180, 310, 420, '#ffffff', { fontSize: 21, color: INK, radius: 14, pad: [24, 24, 24, 24] }), A('fade-left', { start: 'click' }))],
          notes: 'Barras apiladas al 100 %: el peso de mujeres y hombres en cada nivel. Datos de ejemplo.' },
        { title: 'Seis ejes, seis baldosas', layout: 'titleOnly', bg: CREAM, extra: [
          ...[['Selección', 'Paneles mixtos y ofertas en lenguaje neutro'], ['Promoción', 'Una candidata como mínimo en cada ascenso'], ['Retribución', 'Auditoría salarial cada año, puesto a puesto'],
            ['Conciliación', 'Horario flexible y permisos para todos'], ['Acoso', 'Protocolo claro y canal confidencial'], ['Comunicación', 'Palabras e imágenes sin estereotipos']].flatMap(([h, d], i) => {
            const x = 80 + (i % 3) * 380, y = 175 + Math.floor(i / 3) * 220;
            return [withAnims(pic(one(i), x, y, 120, 120, 'Baldosa del eje ' + h), A('zoom-in', { start: 'click', duration: 300, sound: 'pop' })),
              withAnims(text(`<div style="font-family:${H};font-size:25px;font-weight:700;color:${[TEAL, BRICK, OCHRED][i % 3]}">${h}</div><div style="margin-top:4px">${d}</div>`, x + 134, y, 226, 190, { fontSize: 19, color: INK, lineHeight: 1.35 }), A('fade-right', { start: 'withPrev' }))]; })],
          notes: 'Cada clic coloca una baldosa (con un «pop») y su eje del plan. Las seis baldosas juntas forman el suelo común.' },
        { title: 'Metas medibles', layout: 'titleOnly', bg: CREAM, transition: 'fade', extra: [
          tableBlock({ x: 80, y: 165, w: 1120, h: 400, fontSize: 23, header: true, headBg: TEAL, headFg: '#ffffff', stroke: '#d8c9ab', banded: true, band: OCHRE,
            rows: [['Indicador', 'Hoy', '2027', '2030'], ['Mujeres en dirección', '31 %', '36 %', '45 %'], ['Brecha en el salario medio', '7,8 %', '5 %', 'menos del 2 %'],
              ['Reducciones de jornada pedidas por hombres', '18 %', '30 %', '45 %'], ['Selecciones con panel mixto', '40 %', '100 %', '100 %'], ['Plantilla formada en igualdad', '22 %', '60 %', '100 %']], colW: [4.4, 1.5, 1.5, 1.8] }),
          text('La comisión revisa estos indicadores cada trimestre y publica el resultado.', 80, 590, 1120, 34, { fontSize: 20, color: DIM })],
          notes: 'Tabla con filas alternas: cada indicador con su valor de hoy y sus metas. Datos de ejemplo.' },
        { title: 'Si ocurre: el protocolo contra el acoso', layout: 'titleOnly', bg: CREAM, extra: [
          dg('steps', 'Comunica\n  Canal confidencial, también anónimo\nProtege\n  Medidas cautelares en 48 horas\nInvestiga\n  Comisión independiente, 30 días\nResuelve\n  Decisión y apoyo a la persona', 80, 170, 1120, 450, { colors: 'colorful', oneByOne: true })],
          notes: 'Diagrama de escalones que aparece paso a paso. Los plazos son los del protocolo de ejemplo.' },
        { layout: 'blank', bg: SAND, extra: [pollBlock({ kind: 'quiz', fontSize: 36, question: 'En España, ¿desde cuántas personas en plantilla es obligatorio tener un plan de igualdad?', options: ['25', '50', '100', '250'], correct: [1], time: 20, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Pregunta de test con tiempo: desde 50 personas en plantilla el plan de igualdad es obligatorio en España.' },
        { layout: 'blank', bg: CREAM, transition: 'zoom', back: [pic(mosaicSVG(1280, 180, 90, SETS), 0, 0, 1280, 180, 'Franja de baldosas hidráulicas'), shape('rect', 0, 180, 1280, 8, INK)], extra: [
          text('Cada baldosa cuenta', 80, 270, 1120, 100, { fontFamily: H, fontSize: 76, fontWeight: 700, color: INK, textAlign: 'center' }),
          text('La comisión de igualdad se reúne cada trimestre y publica sus actas en el portal. Puedes escribirle cuando quieras, también de forma anónima.', 180, 400, 920, 100, { fontSize: 24, color: DIM, textAlign: 'center', lineHeight: 1.45 }),
          withAnims(text('Próxima reunión: 15 de enero', 440, 540, 400, 50, { fontSize: 22, fontWeight: 700, color: '#ffffff', bg: BRICK, radius: 25, textAlign: 'center', vAlign: 'middle' }), A('zoom-in', { start: 'afterPrev', delay: 500, sound: 'chime' }))],
          notes: 'Cierre con una franja de baldosas arriba y la próxima fecha, que entra sola con una campanilla.' },
      ]));
    } },
};
