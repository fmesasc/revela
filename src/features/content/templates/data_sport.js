// Example presentations: Analítica deportiva (goles esperados en fútbol, una etapa de montaña, una maratón
// popular, el saque en tenis, el 100 m lisos, la natación, la carga y las lesiones, el mapa de tiro en
// baloncesto, el Elo en ajedrez y la asistencia a un estadio). Each one: { name, summary, cat: 'data', make() }
// → a deck (see kit.js for the builders). Every club, athlete and figure is made up.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (pitches, courts, profiles and maps drawn for each deck).
const svgURL = (w, h, inner, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'fill', ...props });
// A stroke through points on the slide: an ink object, so it can be traced while presenting (effect 'draw').
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// A 3D model without its caption (the credits go in one small line on the last slide).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 40, { fontSize: 12, color });
// Labels and values → chart data.
const D = (labels, values) => labels.map((label, i) => ({ label, value: values[i] }));
// A small uppercase line above a title.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 5, color, ...props });
// Animations: on a click; on its own when the slide (or the previous one) is done; the i-th of a chain.
const click = (b, effect = 'fade-up', props = {}) => withAnims(b, A(effect, props));
const auto = (b, effect = 'fade-up', props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const chain = (b, i, effect = 'fade-up', props = {}) => withAnims(b, A(effect, { start: i ? 'afterPrev' : 'click', ...props }));
// A figure with its label under it.
const fig = (n, label, x, y, w, h, { color, fg, size = 80, labelSize = 22, font = '', align = 'left', ...props } = {}) =>
  text(`<div style="font-size:${size}px;font-weight:700;line-height:1.05;color:${color}${font ? `;font-family:${font}` : ''}">${n}</div><div style="margin-top:8px">${label}</div>`,
    x, y, w, h, { fontSize: labelSize, color: fg, textAlign: align, ...props });
const r1 = v => Math.round(v * 10) / 10;
// The deck's own text colour (tables, polls and charts follow it) when the palette's doesn't suit its backgrounds.
const ink2 = (deck, color) => Object.assign(deck, { textColor: color });

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Expected goals: a mown pitch seen from above, a chalk tactics board — shots traced into the goal,
  // a scoreboard against the xG, a shot map that pops shot by shot, the logistic model, code and a quiz.
  data_sport_xg: { name: 'Goles esperados (xG)', cat: 'data', summary: 'Pizarra sobre el césped: disparos trazados, marcador frente a xG, mapa de tiros uno a uno, ecuación logística, código, tabla y concurso', make: () => {
    const G1 = '#1f5f31', G2 = '#246b38', DARK = '#0c2414', CHALK = '#f3f7ef', DIM = '#a9c7b0', YEL = '#ffd23f', RED = '#ff6b5f', CYAN = '#7fd6ff', PANEL = '#123b20';
    const H = pairStacks('modern').heading;
    const stripes = (w, h, n) => Array.from({ length: n }, (_, i) => `<rect x="${i * w / n}" y="0" width="${w / n + 1}" height="${h}" fill="${i % 2 ? G2 : G1}"/>`).join('');
    const L = `stroke="${CHALK}" stroke-width="4" fill="none" opacity="0.85"`;
    const pitch = (fade = true) => svgURL(1280, 720, stripes(1280, 720, 12)
      + `<rect x="60" y="60" width="1160" height="600" ${L}/><path d="M640 60V660" ${L}/><circle cx="640" cy="360" r="92" ${L}/><circle cx="640" cy="360" r="6" fill="${CHALK}"/>`
      + `<rect x="60" y="182" width="182" height="356" ${L}/><rect x="1038" y="182" width="182" height="356" ${L}/><rect x="60" y="280" width="61" height="160" ${L}/><rect x="1159" y="280" width="61" height="160" ${L}/>`
      + `<circle cx="182" cy="360" r="5" fill="${CHALK}"/><circle cx="1098" cy="360" r="5" fill="${CHALK}"/><path d="M242 286 A95 95 0 0 1 242 434" ${L}/><path d="M1038 286 A95 95 0 0 0 1038 434" ${L}/>`
      + `<rect x="1220" y="328" width="18" height="64" ${L}/><rect x="42" y="328" width="18" height="64" ${L}/>`
      + (fade ? `<defs><linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="${DARK}" stop-opacity="0.95"/><stop offset="0.5" stop-color="${DARK}" stop-opacity="0.75"/><stop offset="0.75" stop-color="${DARK}" stop-opacity="0"/></linearGradient></defs><rect width="1280" height="720" fill="url(#f)"/>` : ''));
    // The attacking half, goal at the top: 9 px per metre (68 m wide, 52,5 m deep).
    const half = svgURL(640, 500, stripes(640, 500, 6)
      + `<rect x="14" y="14" width="612" height="472.5" ${L}/><rect x="138.6" y="14" width="362.7" height="148.5" ${L}/><rect x="237.6" y="14" width="164.7" height="49.5" ${L}/>`
      + `<circle cx="320" cy="113" r="4" fill="${CHALK}"/><path d="M254.2 162.5 A82.35 82.35 0 0 0 385.8 162.5" ${L}/><path d="M237.65 486.5 A82.35 82.35 0 0 1 402.35 486.5" ${L}/>`
      + `<rect x="287" y="2" width="66" height="12" ${L}/>`);
    const HX = 70, HY = 150, at = (mx, my) => [HX + 14 + mx * 9, HY + 14 + my * 9];
    // Almenara's 13 shots: [metres across, metres from the goal line, xG, goal?, penalty?]
    const SHOTS = [[34, 11, 0.76, 0, 1], [30, 6, 0.41, 1], [37, 8, 0.32, 0], [36, 4, 0.27, 0], [31, 12, 0.14, 0], [40, 13, 0.12, 0], [28, 16, 0.09, 0], [22, 10, 0.08, 0],
      [45, 18, 0.06, 0], [34, 22, 0.05, 0], [50, 9, 0.05, 0], [33, 25, 0.04, 0], [20, 22, 0.02, 0]];
    const dot = ([mx, my, xg, goal, pen], i) => { const d = Math.round(12 + 60 * Math.sqrt(xg)), [cx, cy] = at(mx, my);
      return chain(shape('ellipse', cx - d / 2, cy - d / 2, d, d, goal ? YEL : '#ffffff22', { stroke: goal ? DARK : pen ? RED : CHALK, strokeWidth: goal ? 2 : 3 }), i, 'zoom-in', { duration: 220, sound: 'pop' }); };
    // Distance and angle of a shot, as a chalk drawing.
    const angle = svgURL(460, 400, `<rect width="460" height="400" rx="18" fill="${PANEL}"/>`
      + `<path d="M40 40H420" stroke="${CHALK}" stroke-width="3" opacity="0.6"/><rect x="180" y="26" width="100" height="14" fill="none" stroke="${CHALK}" stroke-width="3"/>`
      + `<path d="M180 40 L310 300 L280 40" fill="${YEL}" fill-opacity="0.25" stroke="${YEL}" stroke-width="3"/><path d="M230 40 L310 300" stroke="${CYAN}" stroke-width="3" stroke-dasharray="10 8"/>`
      + `<path d="M286 252 A50 50 0 0 1 302 249" stroke="${YEL}" stroke-width="4" fill="none"/><circle cx="310" cy="300" r="12" fill="#ffffff"/>`
      + `<text x="320" y="240" font-family="sans-serif" font-size="30" font-style="italic" fill="${YEL}">θ</text><text x="236" y="190" font-family="sans-serif" font-size="30" font-style="italic" fill="${CYAN}">d</text>`
      + '');
    const MIN = ["0′", "10′", "20′", "30′", "40′", "50′", "60′", "70′", "80′", "90′"];
    return numbered(ink2(build({ name: 'CD Almenara 1-2 Racing Solana · goles esperados', palette: 'forest', fonts: 'modern', title: { color: CHALK, size: 44 }, body: { color: CHALK } }, [
      { layout: 'blank', bg: DARK, transition: 'fade', back: [img(pitch(), 0, 0, 1280, 720, 'Campo de fútbol visto desde arriba, con el césped a franjas')], extra: [
        kicker('ANÁLISIS DE PARTIDO · JORNADA 9', 80, 180, 560, YEL),
        text('¿Merecimos<br>ganar?', 80, 222, 600, 200, { fontFamily: H, fontSize: 84, fontWeight: 700, color: CHALK, lineHeight: 1.02 }),
        text('CD Almenara 1 – 2 Racing Solana, contado con goles esperados (xG)', 82, 444, 520, 80, { fontSize: 26, color: DIM }),
        ...[[[880, 230], [1050, 300], [1222, 344]], [[960, 500], [1100, 420], [1222, 372]], [[1090, 320], [1160, 340], [1222, 356]]].map((pts, i) =>
          withAnims(ink(pts, i === 1 ? YEL : CHALK, 5, { dash: i === 1 ? '' : 'dash' }), A('draw', { start: i ? 'withPrev' : 'afterPrev', delay: i * 450, duration: 1200 })))],
        notes: 'Un partido inventado. El campo es un dibujo SVG propio y, al llegar, se trazan solos tres disparos (efecto «Dibujar» en trazos de tinta): el amarillo fue el gol.' },
      { layout: 'blank', bg: DARK, transition: 'push', extra: [
        text('El marcador miente un poco', 80, 60, 1120, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: CHALK }),
        ...[['CD ALMENARA', 430], ['RACING SOLANA', 730]].map(([t, x]) => text(t, x, 150, 260, 40, { fontSize: 22, letterSpacing: 4, color: DIM, textAlign: 'center' })),
        text('Goles', 80, 236, 320, 60, { fontSize: 32, color: CHALK }),
        ...[['1', 430], ['2', 730]].map(([n, x]) => text(n, x, 200, 260, 140, { fontFamily: H, fontSize: 110, fontWeight: 700, color: CHALK, bg: '#06160b', radius: 16, textAlign: 'center', vAlign: 'middle' })),
        click(text('Goles esperados', 80, 400, 330, 90, { fontSize: 32, color: YEL }), 'fade-right', { sound: 'drumroll' }),
        ...[['2,41', 430], ['0,87', 730]].map(([n, x]) => withAnims(text(n, x, 370, 260, 140, { fontFamily: H, fontSize: 92, fontWeight: 700, color: YEL, bg: '#06160b', radius: 16, textAlign: 'center', vAlign: 'middle', borderColor: YEL }),
          A('flip', { start: 'afterPrev', duration: 500 }))),
        click(text('Creamos casi <b style="color:#ffd23f">tres veces más</b> peligro. Ellos marcaron dos de sus cinco disparos.', 1020, 200, 200, 310, { fontSize: 24, color: CHALK, vAlign: 'middle' }), 'fade-left'),
        text('xG: la probabilidad de que cada disparo acabe en gol, sumada para todo el partido.', 80, 580, 1120, 50, { fontSize: 22, color: DIM })],
        notes: 'Primer clic: aparece la fila del xG con un redoble y las dos cifras giran una tras otra. Segundo clic: la lectura. Datos inventados.' },
      { layout: 'blank', bg: DARK, transition: 'fade', extra: [
        text('Trece disparos, uno a uno', 70, 50, 700, 70, { fontFamily: H, fontSize: 42, fontWeight: 700, color: CHALK }),
        img(half, HX, HY, 640, 500, 'Medio campo de ataque con las áreas, visto desde arriba'),
        ...SHOTS.map(dot),
        card(`<div style="font-family:${H};font-size:56px;font-weight:700;color:${YEL};line-height:1">2,41 xG</div><div style="margin-top:6px">13 disparos · 1 gol</div>`, 760, 150, 450, 150, PANEL, { fontSize: 24, color: CHALK, radius: 14 }),
        ...[[YEL, DARK, 'Gol (0,41)'], ['#ffffff22', CHALK, 'Disparo que no entró'], ['#ffffff22', RED, 'Penalti fallado (0,76)']].map(([f, s, t], i) => [
          shape('ellipse', 780, 340 + i * 58, 36, 36, f, { stroke: s, strokeWidth: 3 }), text(t, 834, 338 + i * 58, 370, 40, { fontSize: 23, color: CHALK, vAlign: 'middle' })]).flat(),
        text('El tamaño de cada círculo es su xG: cuanto más cerca y más centrado, más grande.', 780, 530, 420, 90, { fontSize: 21, color: DIM })],
        notes: 'Un clic y los 13 disparos aparecen encadenados con un «pop», del más claro al más lejano. Los círculos son formas sobre un medio campo dibujado en SVG.' },
      { layout: 'blank', bg: DARK, transition: 'fade', extra: [
        text('Cómo se calcula el xG de un disparo', 70, 50, 1140, 70, { fontFamily: H, fontSize: 42, fontWeight: 700, color: CHALK }),
        text('Un modelo logístico ajustado con miles de disparos de la liga', 70, 130, 640, 40, { fontSize: 22, color: DIM }),
        mathBlock({ x: 70, y: 190, w: 640, h: 150, fontSize: 40, color: CHALK, latex: '\\text{xG} = \\dfrac{1}{1 + e^{-(\\beta_0 + \\beta_1 d + \\beta_2 \\theta)}}' }),
        ...[['β₁ < 0', 'cada metro más lejos, menos probabilidad'], ['β₂ > 0', 'cuanto más abierto el ángulo, más portería'], ['De cabeza', 'resta: el remate es menos preciso']].map(([k, t], i) =>
          chain(text(`<b style="color:${YEL}">${k}</b>&nbsp;&nbsp;${t}`, 70, 380 + i * 64, 640, 50, { fontSize: 23, color: CHALK, vAlign: 'middle' }), i, 'fade-right')),
        img(angle, 760, 170, 450, 391, 'Esquema de un disparo: la distancia d y el ángulo θ hacia los postes'),
        text('<i>d</i>: distancia al centro de la portería<br><i>θ</i>: ángulo entre los dos postes', 780, 490, 410, 60, { fontSize: 17, color: DIM, textAlign: 'center' }),
        text('Mismo disparo: a 6 m vale 0,41; a 16 m, 0,12; a 25 m, 0,04.', 760, 590, 450, 60, { fontSize: 20, color: DIM })],
        notes: 'La ecuación se edita con LaTeX (Insertar ▸ Ecuación). Las tres claves entran seguidas con un clic. Coeficientes y valores, ilustrativos.' },
      { layout: 'titleOnly', title: 'El xG, minuto a minuto', bg: DARK, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 790, h: 500, chartType: 'line', color: YEL, seriesName: 'Almenara', grid: true, xTitle: 'Minuto', yTitle: 'xG acumulado',
          data: D(MIN, [0, 0.12, 0.3, 0.38, 0.47, 1.23, 1.4, 1.81, 2.15, 2.41]), series: [{ name: 'Solana', values: [0, 0.05, 0.41, 0.45, 0.45, 0.5, 0.58, 0.62, 0.85, 0.87], color: CYAN }] }),
        ...[["21′", 'Gol de Solana en su primer disparo claro', CYAN], ["47′", 'Penalti fallado: 0,76 que se esfuman', RED], ["63′", 'Gol de Almenara tras centro raso', YEL], ["84′", 'Contra de Solana: 1-2 con 0,23 xG', CYAN]].map(([m, t, c], i) =>
          chain(card(`<b style="font-family:${H};font-size:28px;color:${c}">${m}</b>&nbsp; ${t}`, 880, 165 + i * 118, 340, 100, PANEL, { fontSize: 20, color: CHALK, radius: 12, pad: [10, 16, 10, 16], vAlign: 'middle' }), i, 'fade-left'))],
        notes: 'Líneas de dos series con el xG acumulado. Cada escalón es una ocasión; las cuatro claves del partido entran seguidas con un clic.' },
      { layout: 'titleOnly', title: 'El modelo, en diez líneas', bg: DARK, transition: 'fade', extra: [
        codeBlock({ x: 60, y: 160, w: 720, h: 400, fontSize: 20, lang: 'python', lineSteps: '3|5-6|7-8|9|11',
          code: 'import math\n\nB0, B_DIST, B_ANG = -1.10, -0.11, 1.45   # ajustados\n\ndef xg(distancia, angulo, cabeza=False):\n    z = B0 + B_DIST * distancia + B_ANG * angulo\n    if cabeza:\n        z -= 0.65\n    return 1 / (1 + math.exp(-z))\n\npartido = sum(xg(*t) for t in disparos)   # 2,41' }),
        ...[['1', 'Coeficientes ajustados con 38.000 disparos de cinco temporadas'], ['2', 'Se calcula para cada disparo, con su distancia y su ángulo'], ['3', 'Se suman todos: el xG del partido']].map(([n, t], i) =>
          chain(text(`<span style="font-family:${H};font-size:40px;font-weight:700;color:${YEL}">${n}</span><br>${t}`, 820, 160 + i * 140, 390, 130, { fontSize: 21, color: CHALK }), i, 'fade-left'))],
        notes: 'Código con pasos de resaltado: cada clic marca una parte del modelo. A la derecha, la idea en tres pasos.' },
      { layout: 'titleOnly', title: 'Quién convierte lo que genera', bg: DARK, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 760, h: 450, fontSize: 23, header: true, headBg: YEL, headFg: DARK, stroke: '#2f5a3a', banded: true, band: CHALK, bandAlpha: 0.06, color: CHALK, colW: [3.2, 1.4, 1.4, 1.4, 1.9],
          rows: [['Jugador', 'Tiros', 'xG', 'Goles', 'Goles − xG'], ['D. Olmedo (delantero)', '5', '1,32', '0', '=D2-C2'], ['R. Baena (mediapunta)', '3', '0,54', '1', '=D3-C3'],
            ['T. Quirós (extremo)', '2', '0,30', '0', '=D4-C4'], ['M. Vidal (central)', '1', '0,18', '0', '=D5-C5'], ['Resto', '2', '0,07', '0', '=D6-C6'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
        click(card(`<b style="color:${RED}">Olmedo: −1,32</b> en un partido.<br><br>En la temporada va <b style="color:${YEL}">+0,8</b>: es una mala tarde, no un mal delantero.`, 860, 190, 360, 300, PANEL, { fontSize: 24, color: CHALK, radius: 14 }), 'fade-left')],
        notes: 'Tabla con fórmulas: la última columna resta (=D2-C2) y la fila Total suma (=SUMA(ARRIBA)). Un valor negativo es «perdonar».' },
      { layout: 'blank', bg: DARK, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 32, question: '¿Qué disparo tiene más xG?', x: 80, y: 60, w: 1120, h: 600, time: 20,
        options: ['Un penalti', 'Cabezazo en el área pequeña', 'Mano a mano tras pase al hueco', 'Falta directa a 20 m'], correct: [0] })],
        notes: 'Concurso con tiempo: gana el penalti (unos 0,76). El mano a mano ronda 0,35; el cabezazo, 0,30; la falta directa, 0,06.' },
      { layout: 'blank', bg: DARK, transition: 'zoom', back: [img(pitch(false), 0, 0, 1280, 720, 'Campo de fútbol visto desde arriba'), shape('rect', 0, 0, 1280, 720, DARK, { opacity: 55 })], extra: [
        shape('ellipse', 470, 190, 340, 340, DARK, { opacity: 90, stroke: CHALK, strokeWidth: 4 }),
        text('FÚTBOL Y DATOS · ALMENARA 2026 · FÚTBOL Y DATOS · ALMENARA 2026 · ', 455, 175, 370, 370, { fontSize: 19, curve: 100, color: YEL, letterSpacing: 3 }),
        text('¿Preguntas?', 490, 310, 300, 60, { fontFamily: H, fontSize: 38, fontWeight: 700, color: CHALK, textAlign: 'center' }),
        text('El resultado se olvida; el xG avisa de lo que viene.', 240, 590, 800, 50, { fontSize: 26, color: CHALK, textAlign: 'center' })],
        notes: 'Cierre con el círculo central y un texto curvo que lo rodea (Cuadro de texto ▸ Efectos de texto ▸ Curvar texto). Próximo informe: después de la jornada 10.' },
    ]), CHALK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · A mountain stage: a race roadbook on cream paper — a profile coloured by slope that a rider climbs,
  // the climbs in a table with formulas, kilometre by kilometre, the power equation, a scatter of the
  // favourites, zones in a doughnut, the time gaps and the cyclist's glasses in 3D.
  data_sport_climb: { name: 'Etapa reina: el Alto de Peñaroja', cat: 'data', summary: 'Libro de ruta: perfil coloreado que un ciclista sube, tabla de puertos con fórmulas, ecuación de potencia, dispersión, anillo y gafas 3D', make: () => {
    const PAPER = '#f5eedf', INK = '#2c2620', DIM = '#6f6253', RED = '#b8322a', BLUE = '#2f5d8a', CARD = '#fffaf0', RULE = '#d9ccb4';
    const H = pairStacks('editorial').heading;
    const KEY = [[0, 620], [12, 590], [24, 720], [34, 820], [42, 1180], [52, 760], [62, 640], [80, 610], [92, 720], [100, 960], [108, 1420], [118, 1010], [130, 760], [142, 700], [152, 820], [160, 1090], [166, 1420], [172, 1820], [178, 2150]];
    const alt = km => { for (let i = 1; i < KEY.length; i++) if (km <= KEY[i][0]) { const [a, b] = [KEY[i - 1], KEY[i]]; return a[1] + (b[1] - a[1]) * (km - a[0]) / (b[0] - a[0]); } return 2150; };
    const PTS = Array.from({ length: 90 }, (_, i) => { const km = i * 2; return [km, alt(km)]; });
    PTS.push([178, 2150]);
    const slopeCol = s => (s < 0 ? '#b9cfdf' : s < 3 ? '#9cc27a' : s < 6 ? '#f0c64a' : s < 9 ? '#ea8a3a' : '#b8322a');
    // The profile, at (X0, Y0) on the slide, W × H px: 0–178 km and 400–2.300 m.
    const PX = 80, PY = 390, PW = 1120, PH = 250, sx = km => PX + km / 178 * PW, sy = m => PY + PH - (m - 400) / 1900 * PH;
    const profile = svgURL(PW, PH + 40, PTS.slice(1).map(([km, m], i) => { const [k0, m0] = PTS[i], s = (m - m0) / ((km - k0) * 10);
      return `<path d="M${sx(k0) - PX} ${PH} L${sx(k0) - PX} ${sy(m0) - PY} L${sx(km) - PX} ${sy(m) - PY} L${sx(km) - PX} ${PH} Z" fill="${slopeCol(s)}" stroke="${slopeCol(s)}" stroke-width="0.6"/>`; }).join('')
      + `<path d="M${PTS.map(([km, m]) => `${(sx(km) - PX).toFixed(1)} ${(sy(m) - PY).toFixed(1)}`).join(' L')}" fill="none" stroke="${INK}" stroke-width="2.5"/>`
      + `<path d="M0 ${PH}H${PW}" stroke="${INK}" stroke-width="2"/>`
      + [0, 25, 50, 75, 100, 125, 150, 178].map(k => `<path d="M${sx(k) - PX} ${PH}v8" stroke="${INK}" stroke-width="2"/><text x="${sx(k) - PX}" y="${PH + 30}" font-family="sans-serif" font-size="18" fill="${DIM}" text-anchor="${k === 0 ? 'start' : k === 178 ? 'end' : 'middle'}">${k} km</text>`).join(''));
    const climbs = [[42, 1180, 'Pto. de la Sabina', '2.ª'], [108, 1420, 'Collado del Lobo', '1.ª'], [178, 2150, 'Alto de Peñaroja', 'HC']];
    const flag = ([km, m, n, c]) => [shape('ellipse', sx(km) - 15, sy(m) - 50, 30, 30, c === 'HC' ? RED : INK),
      text(`<b>${c}</b>`, sx(km) - 15, sy(m) - 46, 30, 22, { fontSize: 12, color: '#ffffff', textAlign: 'center' }),
      km > 170 ? text(`${n}<br><span style="color:${DIM}">${String(m).replace(/\B(?=(\d{3})+$)/g, '.')} m</span>`, sx(km) - 250, sy(m) - 58, 225, 50, { fontSize: 17, color: INK, textAlign: 'right', lineHeight: 1.15 })
        : text(`${n}<br><span style="color:${DIM}">${String(m).replace(/\B(?=(\d{3})+$)/g, '.')} m</span>`, sx(km) - 110, sy(m) - 112, 220, 60, { fontSize: 17, color: INK, textAlign: 'center', lineHeight: 1.15 })];
    // The rider climbs along the profile, from its start.
    const ride = PTS.filter((_, i) => i % 2 === 0 || i === PTS.length - 1).map(([km, m]) => [Math.round(sx(km) - sx(0)), Math.round(sy(m) - sy(PTS[0][1]))]);
    const SLOPE = [6.0, 6.8, 7.4, 8.0, 8.6, 6.9, 6.4, 7.6, 9.0, 11.3, 14.0, 9.2, 7.8, 8.4, 7.1, 5.5];
    const RIDERS = [['J. Marlés', 44.6, 6.35], ['A. Ruidera', 44.9, 6.31], ['P. Ostiz', 45.4, 6.24], ['L. Cabanes', 45.8, 6.2], ['E. Sarrió', 46.3, 6.14], ['N. Garro', 46.5, 6.1], ['T. Velilla', 47.1, 6.04], ['C. Mompó', 47.5, 5.98],
      ['R. Iturbe', 48.2, 5.9], ['F. Lezama', 48.6, 5.86], ['M. Albiol', 49.3, 5.79], ['S. Prat', 50.1, 5.7], ['D. Urquiza', 51.0, 5.6], ['G. Riaño', 51.6, 5.55]];
    return numbered(build({ name: 'Etapa 14 · Alto de Peñaroja', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 42 }, body: { color: INK },
      decor: () => [shape('rect', 60, 46, 1160, 2, INK), shape('rect', 60, 52, 1160, 1, INK)] }, [
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        kicker('LIBRO DE RUTA · ETAPA 14 · SÁBADO 11 DE JULIO', 80, 80, 760, RED),
        text('Valdecierzo → Alto de Peñaroja', 80, 118, 900, 80, { fontFamily: H, fontSize: 50, fontWeight: 700, color: INK }),
        text('La etapa reina, leída con datos: pendientes, vatios y segundos', 82, 196, 900, 44, { fontSize: 26, color: DIM, fontStyle: 'italic' }),
        ...[['178 km', 'de recorrido'], ['4.120 m', 'de desnivel positivo'], ['3', 'puertos, uno fuera de categoría']].map(([n, l], i) =>
          text(`<b style="font-family:${H};font-size:30px;color:${INK}">${n}</b> <span style="color:${DIM}">${l}</span>`, 80 + i * 340, 252, 330, 44, { fontSize: 20 })),
        img(profile, PX, PY, PW, PH + 40, 'Perfil de la etapa coloreado por pendiente, con tres puertos'),
        ...climbs.map(flag).flat(),
        withAnims(shape('ellipse', sx(0) - 11, sy(PTS[0][1]) - 11, 22, 22, RED, { stroke: '#ffffff', strokeWidth: 4 }), path(ride, { start: 'afterPrev', duration: 7000, delay: 300 }))],
        notes: 'El perfil es un dibujo SVG propio, coloreado por pendiente como en los libros de ruta. Al llegar, el punto rojo recorre la etapa entera siguiendo una trayectoria propia. Etapa y datos, inventados.' },
      { layout: 'titleOnly', title: 'Los tres puertos', bg: PAPER, transition: 'fade', extra: [
        tableBlock({ x: 80, y: 160, w: 1120, h: 270, fontSize: 24, header: true, lines: true, headBg: INK, headFg: PAPER, stroke: RULE, color: INK, colW: [3.4, 1.1, 1.3, 1.9, 2.1, 1.9],
          rows: [['Puerto', 'Cat.', 'Cima (km)', 'Longitud (km)', 'Pendiente media (%)', 'Desnivel (m)'],
            ['Puerto de la Sabina', '2.ª', '42', '9,6', '5,6', '=REDONDEAR(D2*E2*10; 0)'], ['Collado del Lobo', '1.ª', '108', '12,4', '6,4', '=REDONDEAR(D3*E3*10; 0)'], ['<b style="color:#b8322a">Alto de Peñaroja</b>', '<b>HC</b>', '178', '16,2', '8,1', '=REDONDEAR(D4*E4*10; 0)']] }),
        ...[['5,6–6,4 %', 'Sabina y Lobo: puertos de desgaste, para el equipo'], ['14 %', 'la rampa del km 172, a seis de meta'], ['1.312 m', 'de desnivel en la subida final: una hora de esfuerzo']].map(([n, t], i) =>
          chain(card(`<div style="font-family:${H};font-size:38px;font-weight:700;color:${i === 1 ? RED : BLUE}">${n}</div>${t}`, 80 + i * 380, 470, 360, 160, CARD, { fontSize: 21, color: INK, radius: 6, borderColor: RULE }), i, 'fade-up'))],
        notes: 'Tabla de estilo «solo líneas»: el desnivel es una fórmula (longitud × pendiente × 10, redondeado: =REDONDEAR(D2*E2*10; 0)). Las tres tarjetas entran seguidas con un clic.' },
      { layout: 'titleOnly', title: 'Peñaroja, kilómetro a kilómetro', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 1140, h: 470, chartType: 'bar', color: '#ea8a3a', seriesName: 'Pendiente media', grid: true, dataLabels: true, yTitle: 'Pendiente (%)', xTitle: 'Kilómetro de la subida', yMin: 0, yMax: 16,
          data: D(SLOPE.map((_, i) => String(i + 1)), SLOPE) }),
        text('El km 11 de la subida (el 172 de la etapa), al 14 %: allí se ganó.', 70, 630, 1140, 40, { fontSize: 22, color: RED, textAlign: 'right', fontStyle: 'italic' })],
        notes: 'Columnas con etiquetas: la pendiente media de cada uno de los 16 kilómetros. La media sale al 8,1 %, como en la tabla; la rampa del km 11 es la del ataque.' },
      { layout: 'titleOnly', title: 'Cuánta potencia pide la subida', bg: PAPER, transition: 'fade', extra: [
        mathBlock({ x: 70, y: 170, w: 1140, h: 130, fontSize: 38, color: INK, latex: 'P = \\dfrac{m\\,g\\,v\\,(\\sin\\theta + C_{rr}\\cos\\theta) + \\tfrac{1}{2}\\,\\rho\\,C_dA\\,v^{3}}{\\eta}' }),
        ...[['m g v sin θ', 'subir el peso: casi todo el esfuerzo'], ['Crr', 'rozamiento de las ruedas'], ['½ ρ CdA v³', 'el aire: poco a 19 km/h'], ['η', 'rendimiento de la transmisión']].map(([k, t], i) =>
          chain(text(`<b style="color:${BLUE}">${k}</b><br>${t}`, 70 + i * 290, 330, 270, 100, { fontSize: 21, color: INK }), i, 'fade-up')),
        click(card(`Ciclista de <b>62 kg</b> (70 con la bici) al 8,1 % a <b>19 km/h</b> → <b style="color:${RED}">345 W</b>, es decir, <b style="color:${RED}">5,6 W/kg</b> durante 50 minutos`,
          70, 470, 1140, 110, CARD, { fontSize: 24, color: INK, radius: 6, borderColor: RED, vAlign: 'middle', textAlign: 'center' }), 'zoom-in', { sound: 'chime' })],
        notes: 'Ecuación de la potencia en una subida (LaTeX). Con un clic entran sus cuatro términos, uno tras otro, y con otro clic el ejemplo resuelto. Valores aproximados.' },
      { layout: 'titleOnly', title: 'Vatios por kilo frente al reloj', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 800, h: 490, chartType: 'scatter', color: BLUE, grid: true, xTitle: 'Minutos en la subida final', yTitle: 'W/kg medios', xMin: 44, xMax: 52, yMin: 5.4, yMax: 6.5,
          dataLabels: true, data: RIDERS.map(([n, t, w], i) => ({ label: String(t), value: w, name: i ? '' : n })) }),
        card(`<div style="font-family:${H};font-size:44px;font-weight:700;color:${RED}">≈ 45 s</div>por cada 0,1 W/kg de diferencia en una subida de 50 minutos.`, 900, 190, 310, 220, CARD, { fontSize: 22, color: INK, radius: 6, borderColor: RULE }),
        text('Los 14 primeros de la etapa. Potencias estimadas a partir del tiempo, el peso y la pendiente.', 900, 440, 310, 140, { fontSize: 19, color: DIM })],
        notes: 'Dispersión con escala ajustada (xMin, xMax, yMin, yMax) y el nombre del ganador sobre su punto (etiquetas de datos con d.name; los demás, vacíos). La relación es casi una recta.' },
      { layout: 'titleOnly', title: 'Dónde gastó la energía el ganador', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 620, h: 490, chartType: 'doughnut',
          data: [{ label: 'Z1 recuperación', value: 22, color: '#b9cfdf' }, { label: 'Z2 fondo', value: 31, color: '#9cc27a' }, { label: 'Z3 tempo', value: 19, color: '#f0c64a' },
            { label: 'Z4 umbral', value: 17, color: '#ea8a3a' }, { label: 'Z5 VO₂ máx.', value: 8, color: RED }, { label: 'Z6 anaeróbico', value: 3, color: '#5a1c18' }] }),
        ...[['4 h 52′', 'en bici: la mitad, rodando tranquilo'], ['28′', 'por encima del umbral, casi todo en Peñaroja'], ['3′', 'a tope: el ataque del km 172']].map(([n, t], i) =>
          chain(text(`<b style="font-family:${H};font-size:36px;color:${[BLUE, '#c46a1e', RED][i]}">${n}</b><br>${t}`, 750, 180 + i * 150, 460, 120, { fontSize: 22, color: INK }), i, 'fade-left'))],
        notes: 'Anillo con un color por zona de potencia, los mismos del perfil: tiempo del ganador en cada zona, en %. Tres lecturas entran seguidas con un clic.' },
      { layout: 'titleOnly', title: 'La meta, en segundos', bg: PAPER, transition: 'fade', extra: [
        fig('4 h 52′ 17″', 'Jon Marlés, ganador de la etapa y nuevo líder', 70, 170, 400, 140, { color: RED, fg: INK, size: 52, font: H }),
        text('Media: 36,6 km/h<br>Último kilómetro: 2′ 41″', 70, 320, 400, 70, { fontSize: 21, color: DIM }),
        click(card(`<b style="color:${RED}">Cambio de líder</b><br>N. Garro llegaba de líder y cede 2′ 12″: el maillot pasa a Marlés.`, 70, 430, 400, 150, CARD, { fontSize: 21, color: INK, radius: 6, borderColor: RULE }), 'fade-up'),
        chartBlock({ x: 500, y: 150, w: 710, h: 480, chartType: 'hbar', color: BLUE, dataLabels: true, xTitle: 'Segundos perdidos con el ganador',
          data: D(['A. Ruidera', 'P. Ostiz', 'L. Cabanes', 'E. Sarrió', 'N. Garro', 'T. Velilla'], [18, 41, 66, 95, 132, 171]) })],
        notes: 'Barras horizontales con el retraso de los favoritos. El líder anterior, Garro, pierde más de dos minutos y el maillot.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [pollBlock({ fontSize: 32, question: 'Eres director: ¿dónde mandas atacar a tu líder?', x: 80, y: 70, w: 1120, h: 580,
        options: ['En el descenso del Lobo', 'Al pie de Peñaroja', 'En la rampa del 14 %', 'Esperar al esprint final'] })],
        notes: 'Votación en directo. El ganador atacó en la rampa del 14 %: compara con lo que vote la sala.' },
      { layout: 'blank', bg: PAPER, transition: 'zoom', back: [img(profile, PX, 340, PW, PH + 40, 'Perfil de la etapa', { opacity: 35 })], extra: [
        kicker('MAÑANA · JORNADA DE DESCANSO', 80, 100, 600, RED),
        text('Gracias por<br>subir con nosotros', 80, 140, 620, 180, { fontFamily: H, fontSize: 56, fontWeight: 700, color: INK, lineHeight: 1.15 }),
        text('Datos de potencia estimados; equipos y corredores, inventados.', 82, 330, 600, 40, { fontSize: 20, color: DIM }),
        m3d('kh-SunglassesKhronos', 720, 70, 480, 320, { autoRotate: true, spin: 25, view: 'front', edge: 'fade' }),
        credits(['kh-SunglassesKhronos'], 80, 660, 1120, DIM)],
        notes: 'Cierre: unas gafas de ciclista que giran en 3D y el perfil de fondo, muy suave.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · A city marathon: the cover is a race bib with its four pins — big numbers, a finish-time
  // distribution with spikes before 3:00, 3:30 and 4:00, the wall at km 30, a robot pacer that runs
  // across, splits with formulas, a water bottle in 3D, a quiz and a finisher's medal with curved text.
  data_sport_marathon: { name: 'Maratón: lo que cuentan las llegadas', cat: 'data', summary: 'Dorsal de portada, cifras con sonido, histograma de llegadas, el muro del km 30, liebre robot 3D que corre, tabla con fórmulas y medalla', make: () => {
    const OR = '#ff5a1f', OR2 = '#ff8a3d', NAVY = '#1b2a4a', CREAM = '#fff6ec', TEAL = '#11998e', YEL = '#ffc93c', DIM = '#6b6f80', WHITE = '#ffffff';
    const H = pairStacks('friendly').heading;
    const pin = (x, y, left) => [shape('rect', left ? x - 42 : x + 22, y + 10, 46, 6, '#9aa1ab', { radius: 3 }), shape('ellipse', x, y, 26, 26, '#c9ced6', { stroke: '#8a919c', strokeWidth: 3 })];
    // Finishers by 5-minute bucket, 2:30 to 5:55: the spikes just before the round times.
    const BK = Array.from({ length: 42 }, (_, i) => 150 + i * 5);
    const FIN = BK.map(m => { const g = Math.round(520 * Math.exp(-(((m - 238) / 38) ** 2))) + 6; return m === 175 ? g + 120 : m === 205 ? g + 210 : m === 235 ? g + 260 : g; });
    return numbered(ink2(build({ name: 'Maratón de Puerto Lince 2026', palette: 'warm', fonts: 'friendly', title: { color: NAVY, size: 46 }, body: { color: NAVY } }, [
      { layout: 'blank', bg: OR, transition: 'zoom', back: [shape('rect', 0, 0, 1280, 720, OR, { fill2: '#e8431a', gradAngle: 135 }), glow(-200, -260, 760, YEL, OR, 40)], extra: [
        auto(shape('rounded', 300, 110, 680, 480, WHITE, { radius: 18, shadow: { x: 0, y: 14, blur: 30, color: '#00000044' } }), 'fade-down', { duration: 700 }),
        withAnims(shape('rect', 300, 110, 680, 74, NAVY, { radius: 0 }), A('fade-down', { start: 'withPrev', duration: 700 })),
        withAnims(text('MARATÓN DE PUERTO LINCE · 1 DE MARZO DE 2026', 400, 126, 480, 44, { fontSize: 16, letterSpacing: 1, color: WHITE, textAlign: 'center', vAlign: 'middle' }), A('fade-down', { start: 'withPrev', duration: 700 })),
        withAnims(text('9.412', 300, 196, 680, 210, { fontFamily: H, fontSize: 180, fontWeight: 800, color: NAVY, textAlign: 'center', letterSpacing: -4 }), A('fade-down', { start: 'withPrev', duration: 700 })),
        withAnims(text('llegadas a meta y lo que nos cuentan sus tiempos', 320, 414, 640, 90, { fontSize: 26, color: DIM, textAlign: 'center' }), A('fade-down', { start: 'withPrev', duration: 700 })),
        withAnims(shape('rect', 300, 516, 680, 74, OR, { fill2: YEL, gradAngle: 0 }), A('fade-down', { start: 'withPrev', duration: 700 })),
        withAnims(text('42,195 km · informe para corredores y voluntarios', 400, 532, 480, 44, { fontSize: 19, color: NAVY, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }), A('fade-down', { start: 'withPrev', duration: 700 })),
        ...[[318, 128], [936, 128, 1], [318, 546], [936, 546, 1]].map(([x, y, l]) => pin(x, y, l).map(b => withAnims(b, A('zoom-in', { start: 'afterPrev', duration: 150, sound: 'click' })))).flat()],
        notes: 'La portada es un dorsal hecho con formas: cae al llegar y luego se clavan los cuatro imperdibles, con un clic de sonido. Carrera y cifras, inventadas.' },
      { layout: 'blank', bg: CREAM, transition: 'push', extra: [
        text('La carrera en cuatro números', 80, 60, 1120, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: NAVY }),
        ...[['3 h 58′', 'tiempo mediano: la mitad llegó antes', OR, 'timer'], ['31 %', 'de mujeres, récord de la prueba', TEAL, 'users'], ['1 de 3', 'corría su primera maratón', NAVY, 'medal'], ['14 °C', 'en la salida a las 8:30', '#c2185b', 'thermometer']].map(([n, l, c, ic], i) =>
          [chain(shape('rounded', 80 + i * 285, 190, 260, 330, WHITE, { radius: 22, stroke: c, strokeWidth: 4 }), i, 'zoom-in', { sound: 'pop', duration: 350 }),
            withAnims(icon(ic, 182 + i * 285, 222, 56, c), A('zoom-in', { start: 'withPrev', duration: 350 })),
            withAnims(fig(n, l, 100 + i * 285, 300, 220, 200, { color: c, fg: NAVY, size: 54, labelSize: 22, font: H, align: 'center' }), A('zoom-in', { start: 'withPrev', duration: 350 }))]).flat(),
        text('Datos de cronometraje con chip (inventados para este ejemplo).', 80, 580, 1120, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Un clic y las cuatro cifras entran encadenadas, cada una con un «pop».' },
      { layout: 'titleOnly', title: 'Todos quieren bajar de una hora redonda', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 850, h: 500, chartType: 'bar', color: OR, seriesName: 'Corredores', grid: true, xTitle: 'Horas hasta meta (tramos de 5 minutos)', yTitle: 'Corredores',
          data: D(BK.map(m => (m % 60 === 0 ? String(m / 60) : '')), FIN) }),
        ...[['2:55–3:00', '+120 corredores sobre lo esperable'], ['3:25–3:30', '+210: la liebre de 3:30 funciona'], ['3:55–4:00', '+260: el pico más alto de todos']].map(([t, d], i) =>
          chain(card(`<b style="font-family:${H};font-size:28px;color:${OR}">${t}</b><br>${d}`, 940, 170 + i * 150, 280, 130, WHITE, { fontSize: 20, color: NAVY, radius: 16, borderColor: '#f3d6c2' }), i, 'fade-left'))],
        notes: 'Columnas de 5 en 5 minutos: justo antes de las 3, las 3:30 y las 4 horas aparecen picos. Es la «barrera psicológica»: se aprieta el último kilómetro para bajar de la marca.' },
      { layout: 'titleOnly', title: 'El muro del kilómetro 30', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'line', color: TEAL, seriesName: 'Menos de 3 h', grid: true, xTitle: 'Kilómetro', yTitle: 'Ritmo medio (min/km)', yMin: 4, yMax: 7,
          data: D(['5', '10', '15', '20', '25', '30', '35', '40', '42'], [4.05, 4.04, 4.05, 4.06, 4.08, 4.12, 4.2, 4.22, 4.15]),
          series: [{ name: '3 a 4 h', values: [5.12, 5.1, 5.12, 5.16, 5.22, 5.35, 5.62, 5.75, 5.6], color: OR }, { name: 'Más de 4 h', values: [5.85, 5.88, 5.95, 6.05, 6.2, 6.45, 6.82, 6.95, 6.8], color: NAVY }] }),
        click(card(`<div style="font-family:${H};font-size:52px;font-weight:800;color:${OR};line-height:1">+38 s</div>por kilómetro pierde a partir del km 30 quien corre entre 3 y 4 horas`, 950, 190, 270, 270, WHITE, { fontSize: 21, color: NAVY, radius: 16, borderColor: OR }), 'zoom-in', { sound: 'pop' }),
        text('Los de menos de 3 h apenas lo notan: llegan con el ritmo entrenado.', 950, 490, 270, 130, { fontSize: 19, color: DIM })],
        notes: 'Líneas de tres grupos con el eje de valores ajustado (de 4 a 7 min/km). Cuanto más alta la línea, más lento. El muro: el glucógeno se agota hacia el km 30.' },
      { layout: 'blank', bg: NAVY, transition: 'slide', back: [shape('rect', 0, 560, 1280, 160, '#24375e'), ...Array.from({ length: 16 }, (_, i) => shape('rect', i * 84, 636, 46, 6, '#ffffff55'))], extra: [
        kicker('LAS LIEBRES', 80, 70, 400, YEL),
        text('<span style="font-size:110px;font-family:' + H + ';font-weight:800;color:' + YEL + '">612</span>', 80, 100, 420, 150, { fontSize: 24 }),
        text('corredores entraron en menos de 3:30 detrás de nuestras liebres', 80, 250, 400, 120, { fontSize: 26, color: WHITE }),
        chartBlock({ x: 520, y: 70, w: 690, h: 400, chartType: 'stacked100', color: TEAL, seriesName: 'Cumplen su objetivo', dataLabels: true, legend: true,
          data: D(['Con liebre', 'Sin liebre'], [71, 46]), series: [{ name: 'A menos de 5 min', values: [19, 27], color: YEL }, { name: 'Más lejos', values: [10, 27], color: '#ff8fab' }] }),
        withAnims(m3d('three-RobotExpressive', 20, 470, 190, 230, { walk: { clip: 'Running', face: true, look: true } }), path([[520, 0], [1040, 0]], { start: 'afterPrev', duration: 4000 }))],
        notes: 'Barras al 100 %: con liebre, el 71 % cumple su objetivo; sin ella, el 46 %. Al llegar, el robot (modelo 3D animado, clip «Running») cruza corriendo como una liebre. Encuesta inventada a 2.100 corredores.' },
      { layout: 'titleOnly', title: 'Los parciales de la ganadora', bg: CREAM, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 760, h: 440, fontSize: 24, header: true, banded: true, headBg: OR, headFg: WHITE, band: OR, bandAlpha: 0.1, stroke: '#f3d6c2', color: NAVY, colW: [3, 2, 2, 2.2],
          rows: [['Tramo', 'Km', 'Minutos', 'Ritmo (min/km)'], ['Salida – km 10', '10', '34,2', '=C2/B2'], ['Km 10 – media', '11,1', '38,1', '=C3/B3'], ['Media – km 30', '8,9', '30,9', '=C4/B4'],
            ['Km 30 – meta', '12,2', '42,9', '=C5/B5'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=C6/B6']] }),
        fig('2 h 26′ 06″', 'Dorsal F12, ganadora en categoría femenina', 860, 190, 360, 170, { color: OR, fg: NAVY, size: 46, font: H }),
        click(card('Su segunda mitad fue solo minuto y medio más lenta: <b>reparto casi perfecto</b>.', 860, 410, 360, 160, WHITE, { fontSize: 22, color: NAVY, radius: 16, borderColor: TEAL }), 'fade-left')],
        notes: 'Tabla con fórmulas: el ritmo es minutos ÷ km (=C2/B2) y el total suma los tramos (=SUMA(ARRIBA)). Cambia un parcial y todo se recalcula.' },
      { layout: 'titleOnly', title: 'Lo que se bebe en 42 km', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 720, h: 490, chartType: 'stacked', color: TEAL, seriesName: 'Agua', grid: true, yTitle: 'Botellas', xTitle: 'Avituallamiento (km)',
          data: D(['5', '10', '15', '20', '25', '30', '35', '40'], [3100, 4300, 4700, 4900, 4600, 4800, 4100, 2900]),
          series: [{ name: 'Bebida isotónica', values: [0, 600, 900, 1300, 1500, 2100, 1900, 1100], color: OR2 }] }),
        m3d('kh-WaterBottle', 800, 140, 200, 380, { autoRotate: true, spin: 30, view: 'front', edge: 'fade' }),
        fig('42.800', 'botellas · el 92 % acabó en el contenedor amarillo', 1020, 220, 200, 260, { color: TEAL, fg: NAVY, size: 46, font: H }),
        text('Pista: los puestos del 25 al 35 piden más isotónica.', 820, 560, 400, 70, { fontSize: 20, color: DIM })],
        notes: 'Columnas apiladas por avituallamiento y una botella 3D que gira sola. Del km 25 en adelante sube la isotónica: buena pista para repartir el material.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 34, question: '¿En qué minuto entró más gente en meta?', x: 80, y: 60, w: 1120, h: 600, time: 20,
        options: ['3:29', '3:59', '4:14', '4:44'], correct: [1] })],
        notes: 'Concurso con tiempo desde el móvil. Respuesta: 3:59. El minuto antes de las cuatro horas es el más concurrido de toda la carrera.' },
      { layout: 'blank', bg: NAVY, transition: 'zoom', back: [glow(700, 60, 620, YEL, NAVY, 35)], extra: [
        withAnims(shape('rect', 905, 60, 44, 210, OR, { rotation: -16 }), A('fade-down', { start: 'afterPrev', duration: 500 })),
        withAnims(shape('rect', 990, 60, 44, 210, TEAL, { rotation: 16 }), A('fade-down', { start: 'withPrev', duration: 500 })),
        withAnims(shape('ellipse', 800, 220, 340, 340, YEL, { fill2: '#c98a12', gradType: 'radial', stroke: '#e2a91e', strokeWidth: 8 }), A('bounce', { start: 'afterPrev', duration: 900, sound: 'applause' })),
        withAnims(text('FINISHER · PUERTO LINCE 2026 · 42,195 KM · ', 815, 235, 310, 310, { fontSize: 19, curve: 100, color: '#5a3c00', letterSpacing: 3 }), A('fade-in', { start: 'withPrev', duration: 600, delay: 400 })),
        withAnims(text('42', 870, 322, 200, 130, { fontFamily: H, fontSize: 96, fontWeight: 800, color: '#5a3c00', textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 600, delay: 400 })),
        text('Gracias,<br>9.412 veces', 80, 200, 640, 220, { fontFamily: H, fontSize: 80, fontWeight: 800, color: WHITE, lineHeight: 1.1 }),
        text('Próxima edición: 7 de marzo de 2027 · inscripciones en octubre', 82, 440, 640, 80, { fontSize: 26, color: '#c9d3e6' }),
        text('Modelos 3D: Robot expresivo y Botella, de dominio público (CC0).', 80, 650, 700, 30, { fontSize: 13, color: '#8d9ab5' })],
        notes: 'Cierre: la medalla de finisher cae y rebota con un aplauso; su texto curvo rodea el disco. Gracias a los 1.400 voluntarios.' },
    ]), NAVY));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · The serve: clay court and cream paper, an elegant serif — a ball that bounces in, figures in a
  // 2 × 2 newspaper grid, every serve on the court and then Transform zooms into the deuce box,
  // a radar against the tour, 100 % bars by situation, the reaction-time equation and a ball with curved text.
  data_sport_serve: { name: 'Anatomía de un saque', cat: 'data', summary: 'Tierra batida: pelota que bota, saques sobre la pista y zoom al cuadro con Transformar, radar, barras al 100 %, ecuación y votación', make: () => {
    const CLAY = '#c4602f', CLAY2 = '#a24b21', LINE = '#fbf4ea', BALL = '#d9f24a', GREEN = '#1d4a35', CREAM = '#f6efe4', INK = '#2b1c14', DIM = '#7c6a5c', RULE = '#dccbb6';
    const H = pairStacks('classic').heading;
    const S = 44, W = 23.77 * S, Hh = 10.97 * S;
    const court = (op = 1) => svgURL(Math.round(W + 16), Math.round(Hh + 16), `<g transform="translate(8 8)" stroke="${LINE}" stroke-width="4" fill="none" opacity="${op}">`
      + `<rect width="${W}" height="${Hh}"/><path d="M0 ${1.37 * S}H${W}M0 ${9.6 * S}H${W}M${(11.885 - 6.4) * S} ${1.37 * S}V${9.6 * S}M${(11.885 + 6.4) * S} ${1.37 * S}V${9.6 * S}M${(11.885 - 6.4) * S} ${5.485 * S}H${(11.885 + 6.4) * S}"/>`
      + `<path d="M0 ${5.485 * S}h12M${W} ${5.485 * S}h-12"/></g><path d="M${8 + 11.885 * S} 0V${Hh + 16}" stroke="#2b1c14" stroke-width="6" opacity="${op}"/>`);
    const CX = 109, CY = 160, O = [CX + 8, CY + 8];
    // The 24 first serves to the deuce box: [metres along, metres across, result]
    const SERVES = [[17.6, 5.8, 'a'], [17.9, 5.7, 'a'], [17.2, 6.0, 'w'], [16.8, 5.9, 'w'], [17.5, 6.3, 'w'], [18.0, 6.1, 'a'], [16.4, 6.2, 'l'], [17.0, 5.7, 'w'], [17.7, 6.5, 'w'], [16.9, 6.4, 'l'], [17.3, 5.6, 'w'],
      [17.4, 7.4, 'w'], [16.6, 7.6, 'l'], [17.8, 7.2, 'w'], [17.0, 7.9, 'l'],
      [17.7, 9.2, 'a'], [17.9, 9.4, 'w'], [17.1, 9.0, 'w'], [16.5, 8.9, 'l'], [17.5, 8.7, 'w'], [18.1, 9.1, 'w'], [16.9, 9.3, 'w'], [17.3, 8.8, 'l'], [17.6, 9.5, 'w']];
    const SID = SERVES.map(() => uid()), BOX = uid();
    const col = r => (r === 'a' ? BALL : r === 'w' ? LINE : INK);
    const serveDot = ([mx, my, r], i, big) => { const d = big ? 30 : 16, x = big ? 74 + (mx - 11.885) * 104 : O[0] + mx * S, y = big ? 190 + (my - 5.485) * 104 : O[1] + my * S;
      return { ...shape('ellipse', Math.round(x - d / 2), Math.round(y - d / 2), d, d, col(r), { stroke: r === 'l' ? LINE : INK, strokeWidth: 2 }), id: SID[i] }; };
    const ball = svgURL(120, 120, `<circle cx="60" cy="60" r="56" fill="${BALL}"/><path d="M14 30 C48 46 48 74 14 92" stroke="#ffffff" stroke-width="6" fill="none"/><path d="M106 30 C72 46 72 74 106 92" stroke="#ffffff" stroke-width="6" fill="none"/>`);
    return numbered(ink2(build({ name: 'Torneo de Valdorna · el saque de Lucía Arnedo', palette: 'revela', fonts: 'classic', title: { color: INK, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', bg: CLAY, transition: 'fade', back: [shape('rect', 0, 0, 1280, 720, CLAY, { fill2: CLAY2, gradType: 'radial' }), img(court(0.35), 440, 190, 800, 370, 'Líneas de una pista de tenis', { rotation: -8 })], extra: [
        kicker('VALDORNA 2026 · INFORME DE RENDIMIENTO', 80, 160, 700, LINE),
        text('Anatomía<br>de un saque', 76, 200, 680, 240, { fontFamily: H, fontSize: 96, fontStyle: 'italic', color: LINE, lineHeight: 1.02 }),
        text('Los 412 saques de Lucía Arnedo, de la primera ronda a la final', 80, 460, 560, 80, { fontSize: 26, color: '#fde6d4' }),
        shape('rect', 80, 560, 120, 4, BALL),
        withAnims(img(ball, 1120, 60, 70, 70, 'Una pelota de tenis'), path([[-160, 250], [-300, 120], [-430, 330], [-520, 260], [-600, 380]], { start: 'afterPrev', duration: 1800, sound: 'pop' }))],
        notes: 'Portada en tierra batida: las líneas de la pista son un dibujo SVG girado y la pelota entra botando (trayectoria propia, con sonido). Jugadora y torneo, inventados.' },
      { layout: 'blank', bg: CREAM, transition: 'push', extra: [
        text('Cinco partidos, cuatro cifras', 80, 60, 1120, 70, { fontFamily: H, fontSize: 46, color: INK }),
        shape('rect', 80, 140, 1120, 2, INK), shape('rect', 639, 170, 2, 470, RULE), shape('rect', 80, 414, 1120, 1, RULE),
        ...[['68 %', 'de primeros saques dentro (el circuito: 62 %)'], ['186 km/h', 'el más rápido, en el segundo set de la final'], ['11', 'aces en cinco partidos: casi la mitad, a la T'], ['79 %', 'de puntos ganados cuando entra el primero']].map(([n, l], i) =>
          chain(fig(n, l, 100 + (i % 2) * 580, 190 + Math.floor(i / 2) * 250, 520, 200, { color: CLAY, fg: INK, size: 76, labelSize: 23, font: H }), i, 'fade-up', { duration: 450 }))],
        notes: 'Cuatro cifras en rejilla de periódico, separadas por filetes. Con un clic entran una tras otra. Datos inventados.' },
      { layout: 'blank', bg: CLAY, transition: 'fade', extra: [
        text('Dónde bota cada primer saque', 80, 50, 900, 70, { fontFamily: H, fontSize: 44, color: LINE }),
        text('Lado de iguales · 24 saques de la final', 80, 112, 700, 40, { fontSize: 22, color: '#fde6d4' }),
        img(court(), CX, CY, Math.round(W + 16), Math.round(Hh + 16), 'Pista de tenis vista desde arriba'),
        { ...shape('rect', Math.round(O[0] + 11.885 * S), Math.round(O[1] + 5.485 * S), Math.round(6.4 * S), Math.round(4.115 * S), '#ffffff10', { stroke: BALL, strokeWidth: 3 }), id: BOX },
        ...SERVES.map((sv, i) => withAnims(serveDot(sv, i, false), A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 60, duration: 250 }))),
        ...[[BALL, INK, 'Ace'], [LINE, INK, 'Punto ganado'], [INK, LINE, 'Punto perdido']].map(([f, s, t], i) => [shape('ellipse', 120 + i * 300, 670, 20, 20, f, { stroke: s, strokeWidth: 2 }),
          text(t, 150 + i * 300, 664, 200, 32, { fontSize: 20, color: LINE })]).flat()],
        notes: 'Al llegar, los botes aparecen solos, muy seguidos. El recuadro amarillo marca el cuadro de saque: en la diapositiva siguiente, Transformar lo amplía.' },
      { layout: 'blank', bg: CLAY, transition: 'fade', autoAnimate: true, extra: [
        { ...shape('rect', 74, 190, 666, 428, '#ffffff10', { stroke: BALL, strokeWidth: 4 }), id: BOX },
        shape('line', 74, Math.round(190 + 1.315 * 104), 666, 2, 'none', { stroke: LINE, strokeWidth: 2, dash: 'dash' }), shape('line', 74, Math.round(190 + 2.815 * 104), 666, 2, 'none', { stroke: LINE, strokeWidth: 2, dash: 'dash' }),
        text('Red', 74, 150, 200, 34, { fontSize: 20, color: '#fde6d4', letterSpacing: 3 }), text('Línea de saque', 540, 150, 200, 34, { fontSize: 20, color: '#fde6d4', textAlign: 'right', letterSpacing: 1 }),
        ...SERVES.map((sv, i) => serveDot(sv, i, true)),
        text('El cuadro, de cerca', 790, 60, 420, 60, { fontFamily: H, fontSize: 40, color: LINE }),
        ...[['T', '46 %', '4 aces · 82 % ganados'], ['Cuerpo', '17 %', 'sorpresa: 2 de 4 ganados'], ['Abierto', '37 %', '1 ace · 78 % ganados']].map(([z, p, d], i) =>
          chain(card(`<div style="font-family:${H};font-size:44px;color:${BALL}">${p}</div><b>${z}</b> · ${d}`, 790, 170 + i * 150, 420, 130, '#00000026', { fontSize: 22, color: LINE, radius: 10 }), i, 'fade-left'))],
        notes: 'Transformar (autoAnimate): el recuadro y cada bote viajan a su nueva posición, ampliados. Las líneas discontinuas separan las tres zonas: T, cuerpo y abierto.' },
      { layout: 'titleOnly', title: 'Arnedo frente al circuito', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 640, h: 500, chartType: 'radar', color: CLAY, seriesName: 'L. Arnedo', yMax: 100,
          data: D(['Primeros dentro', 'Ganados con el 1.º', 'Ganados con el 2.º', 'Aces', 'Velocidad', 'Bolas de break salvadas'], [78, 86, 58, 74, 81, 69]),
          series: [{ name: 'Media del top 50', values: [60, 60, 60, 60, 60, 60], color: GREEN }] }),
        ...[['Su arma', 'el primer saque: entra y gana', CLAY], ['Su punto débil', 'el segundo: 54 % de puntos ganados', GREEN]].map(([h, t, c], i) =>
          chain(card(`<div style="font-family:${H};font-size:32px;color:${c};font-style:italic">${h}</div>${t}`, 770, 200 + i * 200, 440, 170, '#ffffff', { fontSize: 23, color: INK, radius: 4, borderColor: RULE }), i, 'fade-left'))],
        notes: 'Radar de dos series: percentiles de la jugadora frente a la media del top 50, que es 60 en todos los ejes (datos inventados).' },
      { layout: 'titleOnly', title: 'Bajo presión, busca la T', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 820, h: 490, chartType: 'stacked100', color: CLAY, seriesName: 'T', dataLabels: true,
          data: D(['1.er set', '2.º set', '3.er set', 'Bolas de break'], [41, 44, 47, 63]), series: [{ name: 'Cuerpo', values: [21, 18, 16, 9], color: '#d8b48f' }, { name: 'Abierto', values: [38, 38, 37, 28], color: GREEN }] }),
        click(card(`<div style="font-family:${H};font-size:60px;color:${CLAY}">63 %</div>de sus saques con bola de break en contra van a la T.<br><br><i>Una pista para quien le reste.</i>`, 930, 190, 280, 380, '#ffffff', { fontSize: 22, color: INK, radius: 4, borderColor: RULE }), 'fade-left')],
        notes: 'Barras al 100 %: reparto del primer saque por zonas según el momento del partido. Con presión, se refugia en su golpe más seguro.' },
      { layout: 'titleOnly', title: 'Menos de medio segundo para restar', bg: CREAM, transition: 'fade', extra: [
        mathBlock({ x: 70, y: 170, w: 560, h: 110, fontSize: 44, color: INK, latex: 't = \\dfrac{d}{v}' }),
        mathBlock({ x: 70, y: 300, w: 560, h: 110, fontSize: 36, color: CLAY, latex: '\\dfrac{24\\ \\text{m}}{52\\ \\text{m/s}} \\approx 460\\ \\text{ms}' }),
        text('A 186 km/h (casi 52 m/s), la pelota cruza la pista en menos de lo que tarda un parpadeo y medio.', 70, 440, 560, 110, { fontSize: 23, color: INK }),
        chartBlock({ x: 680, y: 160, w: 530, h: 420, chartType: 'hbar', color: CLAY, dataLabels: true, xTitle: 'Velocidad media (km/h)',
          data: D(['Primer saque plano', 'Primer saque cortado', 'Segundo saque liftado'], [174, 158, 141]) })],
        notes: 'Dos ecuaciones: la general y el ejemplo con números (LaTeX). A la derecha, la velocidad media de cada tipo de saque, en barras horizontales.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [pollBlock({ fontSize: 32, question: '30-40 y bola de break en contra: ¿dónde sacarías?', x: 80, y: 70, w: 1120, h: 580,
        options: ['A la T', 'Al cuerpo', 'Abierto', 'Segundo saque seguro'] })],
        notes: 'Votación en directo. Compara con los datos: ella va a la T el 63 % de las veces, y su rival lo sabe.' },
      { layout: 'blank', bg: GREEN, transition: 'zoom', back: [glow(700, 40, 640, '#2f6b4f', GREEN, 70)], extra: [
        auto(img(ball, 840, 200, 280, 280, 'Una pelota de tenis'), 'zoom-in', { duration: 700 }),
        auto(text('VALDORNA 2026 · JUEGO, SET Y DATOS · ', 790, 150, 380, 380, { fontSize: 20, curve: 100, color: LINE, letterSpacing: 3 }), 'fade-in', { duration: 800 }),
        text('Juego, set<br>y datos', 80, 190, 640, 250, { fontFamily: H, fontSize: 96, fontStyle: 'italic', wordart: 'gold', lineHeight: 1.05 }),
        text('Gracias · Preguntas', 84, 470, 600, 50, { fontSize: 30, color: LINE, letterSpacing: 2 })],
        notes: 'Cierre en verde de club: la pelota entra con un zoom y el texto curvo la rodea. Título en Text Art de estilo dorado.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · The 100 metres: a black stadium at night, a yellow timing board and a red track in perspective —
  // the time in neon, five phases as chevrons, speed every 10 m, the results with formulas,
  // a photo-finish drawn as a strip, stride × frequency, a ten-second countdown and an ordering activity.
  data_sport_sprint: { name: '100 metros en 9,94 segundos', cat: 'data', summary: 'Estadio de noche: marca en neón, fases en galones, velocidad cada 10 m, tabla con fórmulas, foto finish, reloj 3D y cuenta atrás', make: () => {
    const BLACK = '#07090d', YEL = '#ffd400', TARTAN = '#b9432f', GREY = '#8a93a3', WHITE = '#f4f6fa', PANEL = '#141922', CY = '#4fd1ff';
    const H = pairStacks('bold').heading;
    const track = svgURL(1280, 300, `<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a1e14"/><stop offset="1" stop-color="${TARTAN}"/></linearGradient></defs>`
      + `<path d="M420 0 H860 L1480 300 H-200 Z" fill="url(#t)"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${420 + i * 55} 0 L${-200 + i * 210} 300" stroke="#ffffff" stroke-width="${1 + i * 0.1}" opacity="0.8"/>`).join('')
      + Array.from({ length: 8 }, (_, i) => `<text x="${-200 + i * 210 + 105 + 40}" y="285" font-family="sans-serif" font-size="30" font-weight="700" fill="#ffffff" opacity="0.85" text-anchor="middle">${i + 1}</text>`).join(''));
    // The photo-finish: a strip of a single line in time — streaks, three torsos and the time scale.
    const runner = (x, y, c, lane) => `<g transform="translate(${x} ${y})"><circle cx="0" cy="-118" r="22" fill="#2a1d18"/><path d="M-26 -94 Q0 -104 30 -92 L36 -10 L-30 -10 Z" fill="${c}"/>`
      + `<rect x="-14" y="-74" width="34" height="28" fill="#ffffff"/><text x="3" y="-53" font-family="sans-serif" font-size="20" font-weight="700" fill="#111" text-anchor="middle">${lane}</text>`
      + `<path d="M30 -88 L70 -60" stroke="#2a1d18" stroke-width="14" stroke-linecap="round"/><path d="M-20 -10 L-24 70 M24 -10 L40 70" stroke="#2a1d18" stroke-width="16" stroke-linecap="round"/></g>`;
    const tx = t => 40 + (t - 9.9) / 0.2 * 620;
    const finish = svgURL(700, 460, `<rect width="700" height="460" fill="#1b1f27"/>` + Array.from({ length: 70 }, (_, i) => `<rect x="${i * 10}" y="0" width="${3 + (i * 7) % 5}" height="380" fill="#ffffff" opacity="${0.03 + ((i * 13) % 7) / 100}"/>`).join('')
      + runner(tx(9.94), 340, YEL, 4) + runner(tx(10.01), 350, CY, 5) + runner(tx(10.05), 345, '#ff6b9a', 3)
      + `<path d="M${tx(9.94) + 70} 0V380" stroke="${YEL}" stroke-width="2" stroke-dasharray="6 6"/><rect y="380" width="700" height="80" fill="#0d1016"/>`
      + [9.9, 9.95, 10.0, 10.05, 10.1].map(t => `<path d="M${tx(t)} 380v14" stroke="#ffffff" stroke-width="2"/><text x="${tx(t)}" y="424" font-family="monospace" font-size="20" fill="#ffffff" text-anchor="middle">${t.toFixed(2).replace('.', ',')}</text>`).join(''));
    const RES = [['4', 'R. Almansa', '0,142', '9,94'], ['5', 'J. Ferrán', '0,131', '10,01'], ['3', 'M. Duarte', '0,158', '10,05'], ['6', 'S. Lobato', '0,149', '10,09'], ['2', 'A. Corbalán', '0,166', '10,12'], ['7', 'E. Ibarrola', '0,139', '10,18'], ['8', 'N. Sastre', '0,171', '10,21'], ['1', 'L. Quintero', '0,154', '10,30']];
    return numbered(build({ name: 'Final de 100 m · Campeonato de la Costa', palette: 'midnight', fonts: 'bold', title: { color: WHITE, size: 60 }, body: { color: WHITE } }, [
      { layout: 'blank', bg: BLACK, transition: 'fade', back: [img(track, 0, 420, 1280, 300, 'Pista de atletismo roja en perspectiva, con ocho calles'), glow(760, -160, 620, '#2a2f3d', BLACK, 80)], extra: [
        kicker('FINAL · 100 M LISOS · COSTA 2026', 80, 110, 560, YEL),
        text('Diez segundos,<br>cien datos', 76, 150, 560, 230, { fontFamily: H, fontSize: 104, color: WHITE, lineHeight: 0.95 }),
        auto(text('9,94', 640, 90, 580, 300, { fontFamily: H, fontSize: 280, wordart: 'neon', wordartColor: YEL, textAlign: 'right' }), 'zoom-in', { duration: 600, sound: 'drumroll', delay: 300 }),
        text('Nuevo récord del campeonato · viento +0,8 m/s', 640, 370, 580, 40, { fontSize: 24, color: GREY, textAlign: 'right' })],
        notes: 'Portada de estadio nocturno: la pista es un dibujo SVG en perspectiva y la marca entra sola con un redoble, en Text Art de estilo neón, de color amarillo. Atletas y marcas, inventados.' },
      { layout: 'titleOnly', title: 'Una carrera, cinco fases', bg: BLACK, transition: 'push', extra: [
        dg('chevrons', 'Reacción\n  0,142 s en el taco\nSalida\n  0 a 30 m, cuerpo inclinado\nAceleración\n  30 a 60 m, zancada más larga\nVelocidad máxima\n  60 a 80 m: 11,6 m/s\nResistencia\n  80 a 100 m: frena el que menos', 70, 190, 1140, 360, { oneByOne: true, colors: 'colorful', textColor: WHITE }),
        text('Cada clic, una fase. Ganar es sobre todo perder menos velocidad al final.', 70, 600, 1140, 40, { fontSize: 22, color: GREY })],
        notes: 'Diagrama de galones que aparece fase a fase. La reacción no decide la carrera: lo hace la última parte.' },
      { layout: 'titleOnly', title: 'Velocidad cada 10 metros', bg: BLACK, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 160, w: 840, h: 490, chartType: 'line', color: YEL, seriesName: 'Almansa (1.º)', grid: true, xTitle: 'Final del tramo (m)', yTitle: 'Velocidad media (m/s)', yMin: 4, yMax: 12,
          data: D(['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'], [5.6, 9.2, 10.5, 11.1, 11.4, 11.6, 11.6, 11.5, 11.3, 11.1]),
          series: [{ name: 'Lobato (4.º)', values: [5.7, 9.3, 10.5, 11.0, 11.3, 11.4, 11.3, 11.1, 10.8, 10.5], color: CY }] }),
        ...[['Hasta el 60', 'van juntos: 0,02 s de diferencia', CY], ['Del 60 al 100', 'Almansa pierde 0,5 m/s; Lobato, 0,9', YEL]].map(([h, t, c], i) =>
          chain(card(`<div style="font-family:${H};font-size:40px;color:${c}">${h}</div>${t}`, 940, 220 + i * 190, 280, 160, PANEL, { fontSize: 21, color: WHITE, radius: 6 }), i, 'fade-left'))],
        notes: 'Líneas de dos atletas con el eje de valores ajustado (de 4 a 12 m/s). La diferencia está en los últimos 40 metros.' },
      { layout: 'titleOnly', title: 'El resultado, al milésimo', bg: BLACK, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 820, h: 480, fontSize: 22, header: true, banded: true, headBg: YEL, headFg: BLACK, band: '#ffffff', bandAlpha: 0.05, stroke: '#232a36', color: WHITE, colW: [1.2, 2.8, 1.8, 1.6, 1.9],
          rows: [['Calle', 'Atleta', 'Reacción (s)', 'Marca (s)', 'Al ganador'], ...RES.map(([c, n, r, m], i) => [c, i ? n : `<b style="color:${YEL}">${n}</b>`, r, m, `=D${i + 2}-9,94`])] }),
        click(card(`<div style="font-family:${H};font-size:48px;color:${CY}">0,131 s</div>La mejor reacción fue de Ferrán… y llegó segundo.`, 920, 200, 300, 220, PANEL, { fontSize: 22, color: WHITE, radius: 6 }), 'fade-left'),
        click(card(`<div style="font-family:${H};font-size:48px;color:${YEL}">0,36 s</div>separan al primero del último: unos 3,5 metros.`, 920, 440, 300, 200, PANEL, { fontSize: 22, color: WHITE, radius: 6 }), 'fade-left')],
        notes: 'Tabla con bandas: la última columna es una fórmula (=D3-9,94, con coma decimal). Dos clics traen las dos lecturas.' },
      { layout: 'blank', bg: BLACK, transition: 'fade', extra: [
        text('La foto finish', 70, 50, 700, 80, { fontFamily: H, fontSize: 60, color: WHITE }),
        img(finish, 70, 150, 700, 460, 'Foto finish: tres atletas cruzan la línea, con la escala de tiempo debajo'),
        m3d('kh-ChronographWatch', 820, 120, 380, 330, { autoRotate: true, spin: 18, view: 'front', edge: 'fade' }),
        text('No es una foto: es <b style="color:' + YEL + '">una sola línea</b>, la de meta, fotografiada 2.000 veces por segundo. El eje horizontal es el tiempo.', 820, 470, 390, 160, { fontSize: 22, color: WHITE })],
        notes: 'La foto finish es un dibujo SVG: tres torsos con su dorsal sobre una escala de tiempo. El reloj 3D gira solo.' },
      { layout: 'titleOnly', title: 'Zancada × frecuencia', bg: BLACK, transition: 'fade', extra: [
        mathBlock({ x: 70, y: 170, w: 1140, h: 110, fontSize: 52, color: WHITE, latex: 'v = L \\times f' }),
        ...[['Almansa', '2,45 m × 4,74 Hz', '11,6 m/s', YEL], ['Lobato', '2,49 m × 4,58 Hz', '11,4 m/s', CY]].map(([n, f, v, c], i) =>
          chain(card(`<div style="font-family:${H};font-size:36px;color:${c}">${n}</div><div style="font-size:30px;margin:6px 0">${f}</div><div style="font-family:${H};font-size:64px;color:${c}">= ${v}</div>`, 120 + i * 540, 320, 500, 260, PANEL, { fontSize: 24, color: WHITE, radius: 6, textAlign: 'center' }), i, 'zoom-in')),
        text('L: longitud de la zancada · f: zancadas por segundo. Lobato pisa más largo; Almansa, más rápido.', 70, 610, 1140, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'La velocidad punta es el producto de la zancada por su frecuencia (ecuación en LaTeX). Dos maneras de correr igual de rápido.' },
      { layout: 'blank', bg: BLACK, transition: 'zoom', extra: [
        text('Cierra los ojos: esto dura una final', 80, 90, 1120, 80, { fontFamily: H, fontSize: 64, color: WHITE, textAlign: 'center' }),
        timer(10, 340, 220, 600, { style: 'digital', color: YEL, w: 600, h: 230 }),
        text('Cuenta atrás de 10 segundos: empieza sola y suena al acabar', 80, 510, 1120, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Una cuenta atrás digital de diez segundos (Insertar ▸ Cuenta atrás): deja que la sala sienta lo poco que dura una carrera.' },
      { layout: 'blank', bg: BLACK, transition: 'fade', extra: [pollBlock({ kind: 'order', fontSize: 30, question: 'Ordena las fases de un 100 m', x: 80, y: 60, w: 1120, h: 600,
        options: ['Reacción en los tacos', 'Salida', 'Aceleración', 'Velocidad máxima', 'Resistencia a la velocidad'] })],
        notes: 'Actividad de ordenar desde el móvil: cada persona pone las fases en su orden y se corrige sola.' },
      { layout: 'blank', bg: BLACK, transition: 'fade', back: [img(track, 0, 480, 1280, 240, 'Pista de atletismo', { opacity: 50 })], extra: [
        text('¿PREGUNTAS?', 80, 160, 1120, 200, { fontFamily: H, fontSize: 180, color: WHITE, textAlign: 'center' }),
        text('Próxima cita: final de 200 m, el domingo a las 19:40', 80, 360, 1120, 50, { fontSize: 28, color: YEL, textAlign: 'center' }),
        credits(['kh-ChronographWatch'], 80, 420, 1120, '#8a93a3')],
        notes: 'Cierre sobrio, con la pista de fondo y el crédito del modelo 3D en una línea pequeña.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · The 200 m freestyle: the pool from above, lane ropes and tiles — a swimmer that crosses the cover,
  // v = SR × DPS, splits per length, small multiples of rate and distance per stroke, turns in stacked bars,
  // a lane where the swimmer does four lengths with the split times, a training table and a word cloud.
  data_sport_swim: { name: 'Brazada a brazada: 200 m libre', cat: 'data', summary: 'Piscina vista desde arriba: nadadora que hace cuatro largos, ecuación, múltiplos pequeños, columnas apiladas, tabla con fórmulas y nube', make: () => {
    const WATER = '#1386c0', WATER2 = '#46bfe6', DEEP = '#073a5a', INK = '#0b2a44', FOAM = '#eef8fc', TILE = '#d7eef7', RED = '#e63946', OR = '#ff9f1c', ORT = '#c2410c', DIM = '#5a7488', WHITE = '#ffffff';
    const H = pairStacks('clean').heading;
    const rope = (y, w) => Array.from({ length: Math.ceil(w / 18) }, (_, i) => `<circle cx="${i * 18 + 9}" cy="${y}" r="7" fill="${Math.floor(i / 4) % 3 === 0 ? RED : Math.floor(i / 4) % 3 === 1 ? WHITE : '#1d4ed8'}"/>`).join('');
    const pool = (w, h, lanes) => svgURL(w, h, `<defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${WATER2}"/><stop offset="1" stop-color="${WATER}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#w)"/>`
      + Array.from({ length: Math.ceil(w / 40) }, (_, i) => `<path d="M${i * 40} 0V${h}" stroke="#ffffff" stroke-opacity="0.07"/>`).join('') + Array.from({ length: Math.ceil(h / 40) }, (_, i) => `<path d="M0 ${i * 40}H${w}" stroke="#ffffff" stroke-opacity="0.07"/>`).join('')
      + Array.from({ length: lanes }, (_, i) => { const y = (i + 0.5) * h / lanes; return `<rect x="60" y="${y - 6}" width="${w - 120}" height="12" fill="${DEEP}" opacity="0.55"/><rect x="60" y="${y - 22}" width="12" height="44" fill="${DEEP}" opacity="0.55"/><rect x="${w - 72}" y="${y - 22}" width="12" height="44" fill="${DEEP}" opacity="0.55"/>`; }).join('')
      + Array.from({ length: 6 }, (_, i) => `<path d="M${i * 230 - 40} ${40 + (i % 3) * 210} q 40 -14 80 0 t 80 0" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3" fill="none"/>`).join('')
      + Array.from({ length: lanes + 1 }, (_, i) => rope(i * h / lanes, w)).join(''));
    const swimmer = svgURL(90, 40, `<ellipse cx="40" cy="20" rx="34" ry="11" fill="${DEEP}" opacity="0.35"/><ellipse cx="34" cy="20" rx="26" ry="8" fill="#ffffff" opacity="0.5"/><circle cx="72" cy="20" r="11" fill="${OR}"/><path d="M8 12 Q40 0 66 12" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.8"/>`);
    const winner = svgURL(90, 40, `<ellipse cx="40" cy="20" rx="34" ry="11" fill="${DEEP}" opacity="0.35"/><ellipse cx="34" cy="20" rx="26" ry="8" fill="#ffffff" opacity="0.5"/><circle cx="72" cy="20" r="11" fill="${RED}"/><path d="M8 12 Q40 0 66 12" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.8"/>`);
    const LEN = ['1.er largo', '2.º largo', '3.er largo', '4.º largo'];
    return numbered(ink2(build({ name: 'Brazada a brazada · 200 m libre', palette: 'ocean', fonts: 'clean', title: { color: INK, size: 44 }, body: { color: INK } }, [
      { layout: 'blank', bg: FOAM, transition: 'fade', back: [img(pool(720, 720, 6), 560, 0, 720, 720, 'Piscina vista desde arriba, con seis calles y corcheras')], extra: [
        kicker('ANÁLISIS DE CARRERA · 200 M LIBRE', 70, 170, 480, WATER, { letterSpacing: 3 }),
        text('Brazada<br>a brazada', 66, 210, 480, 210, { fontFamily: H, fontSize: 88, fontWeight: 800, color: INK, lineHeight: 1 }),
        text('Los 200 m libre de Irene Lasa, largo a largo: frecuencia, distancia por ciclo y virajes', 70, 440, 450, 110, { fontSize: 24, color: DIM }),
        withAnims(img(swimmer, 620, 282, 90, 40, 'Una nadadora vista desde arriba'), path([[520, 0]], { start: 'afterPrev', duration: 3500 }))],
        notes: 'La piscina es un dibujo SVG (azulejos, líneas del fondo y corcheras de colores). Al llegar, la nadadora cruza su calle. Nadadora y marcas, inventadas.' },
      { layout: 'titleOnly', title: 'La velocidad tiene dos palancas', bg: FOAM, transition: 'push', extra: [
        mathBlock({ x: 70, y: 160, w: 1140, h: 110, fontSize: 56, color: INK, latex: 'v = \\text{SR} \\times \\text{DPS}' }),
        ...[['refresh-cw', 'SR', 'Frecuencia: ciclos de brazos por minuto', '42 ciclos/min'], ['ruler', 'DPS', 'Distancia que avanza en cada ciclo', '2,05 m/ciclo'], ['waves', 'v', 'Velocidad de nado limpio', '86 m/min = 1,44 m/s']].map(([ic, k, t, ex], i) =>
          [chain(shape('rounded', 70 + i * 390, 320, 360, 260, WHITE, { radius: 20, stroke: TILE, strokeWidth: 3 }), i, 'fade-up'),
            withAnims(icon(ic, 100 + i * 390, 345, 48, [WATER, ORT, DEEP][i]), A('fade-up', { start: 'withPrev' })),
            withAnims(text(`<div style="font-family:${H};font-size:40px;font-weight:800;color:${[WATER, ORT, DEEP][i]}">${k}</div><div>${t}</div><div style="margin-top:14px;font-weight:700">${ex}</div>`, 100, 400, 310, 190, { fontSize: 22, color: INK, x: 100 + i * 390 }), A('fade-up', { start: 'withPrev' }))]).flat()],
        notes: 'La ecuación en LaTeX y sus dos factores en tarjetas que entran una tras otra. Para ir más rápido: más ciclos, o más metros en cada uno.' },
      { layout: 'titleOnly', title: 'Largo a largo', bg: FOAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 820, h: 500, chartType: 'bar', color: WATER, seriesName: 'Irene Lasa (4.ª)', grid: true, dataLabels: true, yTitle: 'Segundos', yMin: 26, yMax: 33,
          data: D(LEN, [28.9, 31.2, 31.8, 31.0]), series: [{ name: 'Ganadora', values: [28.4, 30.4, 30.7, 30.1], color: OR }] }),
        fig('2:02,9', 'su marca; la ganadora, 1:59,6', 920, 190, 300, 170, { color: WATER, fg: INK, size: 64, font: H }),
        click(card('El tercer largo le cuesta <b>1,1 s</b> más que a la ganadora: ahí se escapa la medalla.', 920, 400, 300, 200, WHITE, { fontSize: 22, color: INK, radius: 16, borderColor: OR }), 'fade-left')],
        notes: 'Columnas agrupadas con etiquetas y el eje desde 26 s para que se vean las diferencias (indícalo al público).' },
      { layout: 'titleOnly', title: 'Frecuencia arriba, distancia abajo', bg: FOAM, transition: 'fade', extra: [
        text('Frecuencia (ciclos/min)', 70, 150, 540, 40, { fontSize: 22, color: WATER, fontWeight: 700 }),
        chartBlock({ x: 60, y: 190, w: 560, h: 420, chartType: 'line', color: WATER, seriesName: 'Lasa', grid: true, yMin: 34, yMax: 48,
          data: D(['1', '2', '3', '4'], [44, 41, 40, 43]), series: [{ name: 'Ganadora', values: [43, 41, 41, 42], color: OR }] }),
        text('Distancia por ciclo (m)', 670, 150, 540, 40, { fontSize: 22, color: DEEP, fontWeight: 700 }),
        chartBlock({ x: 660, y: 190, w: 560, h: 420, chartType: 'line', color: WATER, seriesName: 'Lasa', grid: true, yMin: 1.7, yMax: 2.2,
          data: D(['1', '2', '3', '4'], [2.05, 2.02, 1.96, 1.88]), series: [{ name: 'Ganadora', values: [2.08, 2.06, 2.04, 2.0], color: OR }] }),
        text('Largo de 50 m. La ganadora mantiene la brazada larga hasta el final.', 70, 630, 1140, 40, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Dos gráficos pequeños, lado a lado y con la misma forma, en vez de uno con dos escalas. En el 4.º largo Lasa sube la frecuencia porque la brazada se le acorta.' },
      { layout: 'titleOnly', title: 'Lo que pasa fuera del nado', bg: FOAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 820, h: 500, chartType: 'stacked', color: DEEP, seriesName: 'Salida o viraje (primeros 15 m)', grid: true, dataLabels: true, yTitle: 'Segundos',
          data: D(LEN, [6.4, 7.6, 7.9, 7.7]), series: [{ name: 'Nado limpio (30 m)', values: [18.9, 19.8, 20.1, 19.6], color: WATER2 }, { name: 'Llegada al muro (5 m)', values: [3.6, 3.8, 3.8, 3.7], color: OR }] }),
        click(card(`<div style="font-family:${H};font-size:52px;font-weight:800;color:${DEEP}">−0,6 s</div>si sus tres virajes fueran como los de la ganadora: más patada bajo el agua.`, 920, 210, 300, 300, WHITE, { fontSize: 22, color: INK, radius: 16, borderColor: DEEP }), 'zoom-in', { sound: 'pop' })],
        notes: 'Columnas apiladas: cada largo partido en salida o viraje, nado limpio y llegada. Los virajes son tiempo «gratis» que se entrena aparte.' },
      { layout: 'blank', bg: FOAM, transition: 'fade', extra: [
        text('Los cuatro largos, en directo', 70, 50, 1140, 70, { fontFamily: H, fontSize: 44, fontWeight: 800, color: INK }),
        img(pool(1140, 240, 2), 70, 210, 1140, 240, 'Dos calles de piscina vistas desde arriba'),
        withAnims(img(swimmer, 140, 250, 90, 40, 'Irene Lasa'), path([[960, 0], [0, 0], [960, 0], [0, 0]], { start: 'click', duration: 9000 })),
        withAnims(img(winner, 140, 370, 90, 40, 'La ganadora'), path([[960, 0], [0, 0], [960, 0], [0, 0]], { start: 'withPrev', duration: 8760 })),
        ...[['28,9', 1070, 160, 2250], ['1:00,1', 70, 160, 4500], ['1:31,9', 1070, 460, 6750], ['2:02,9', 70, 460, 9000]].map(([t, x, y, ms], i) =>
          withAnims(text(`<b>${t}</b>`, x, y, 140, 44, { fontSize: 28, color: i === 3 ? ORT : DEEP, textAlign: x === 70 ? 'left' : 'right' }), A('zoom-in', { start: 'withPrev', delay: ms, duration: 300, sound: 'click' }))),
        text('Un clic: Lasa (gorro naranja) y la ganadora (gorro rojo) nadan los 200 m; en cada pared, el paso de Lasa.', 70, 560, 1140, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Dos trayectorias de ida y vuelta, cada una con la duración proporcional a su marca: la ganadora llega antes. Los tiempos de paso de Lasa aparecen con un retraso calculado para coincidir con cada pared (con un clic de sonido).' },
      { layout: 'titleOnly', title: 'La sesión de mañana', bg: FOAM, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 800, h: 450, fontSize: 23, header: true, banded: true, headBg: DEEP, headFg: WHITE, band: WATER, bandAlpha: 0.08, stroke: TILE, color: INK, colW: [3.6, 1.5, 1.5, 1.6],
          rows: [['Serie', 'Reps', 'Metros', 'Total'], ['Calentamiento variado', '1', '600', '=B2*C2'], ['Virajes con 5 patadas', '12', '25', '=B3*C3'], ['50 a ritmo de 200 (DPS ≥ 2,0)', '8', '50', '=B4*C4'],
            ['100 progresivos', '4', '100', '=B5*C5'], ['Vuelta a la calma', '1', '300', '=B6*C6'], ['<b>Total de la sesión</b>', '', '', '=SUMA(ARRIBA)']] }),
        card(`<b style="color:${ORT}">Objetivo:</b> mantener 2,0 m por ciclo en el tercer largo sin bajar de 40 ciclos por minuto.`, 900, 200, 320, 260, WHITE, { fontSize: 23, color: INK, radius: 16, borderColor: OR })],
        notes: 'Tabla con fórmulas: cada total es repeticiones × metros (=B2*C2) y la última fila los suma. Cambia una serie y la sesión se recalcula.' },
      { layout: 'blank', bg: FOAM, transition: 'fade', extra: [pollBlock({ kind: 'word', fontSize: 32, question: 'En una palabra: ¿qué te pide el tercer largo?', x: 80, y: 70, w: 1120, h: 580 })],
        notes: 'Nube de palabras en directo: el público escribe desde el móvil y las palabras repetidas crecen.' },
      { layout: 'blank', bg: DEEP, transition: 'zoom', back: [img(pool(1280, 720, 6), 0, 0, 1280, 720, 'Piscina vista desde arriba', { opacity: 35 })], extra: [
        shape('rounded', 240, 220, 800, 260, DEEP, { opacity: 88, radius: 30 }),
        text('Gracias', 240, 250, 800, 120, { fontFamily: H, fontSize: 96, fontWeight: 800, color: WHITE, textAlign: 'center' }),
        text('Nos vemos en la calle 4 · Datos de ejemplo', 240, 380, 800, 50, { fontSize: 28, color: '#bfe6f5', textAlign: 'center' })],
        notes: 'Cierre con la piscina de fondo, apagada, y un panel oscuro para que el texto se lea bien.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Training load and injuries in a handball team: a physio's clipboard — a body map with hotspots,
  // the ACWR equation and a marker that slides into the red zone, the season's ratio, injuries by month,
  // the code that warns, the weekly load with formulas, the return-to-play cycle and a 3D figure.
  data_sport_load: { name: 'Carga de entrenamiento y lesiones', cat: 'data', summary: 'Parte de fisioterapia: mapa del cuerpo, ecuación ACWR con marcador que avanza, líneas, apiladas, código, tabla con fórmulas, ciclo y figura 3D', make: () => {
    const BG = '#f3f7f7', TEAL = '#0f7c84', CORAL = '#e8604c', INK = '#1d2b36', AMBER = '#e89a2c', GREEN = '#3aa76d', DIM = '#5d6d78', SLATE = '#2f4858', WHITE = '#ffffff', LINE = '#d5e2e3';
    const H = pairStacks('websafe').heading;
    const body = svgURL(300, 620, `<g fill="#cfe5e4" stroke="${TEAL}" stroke-width="3">`
      + `<circle cx="150" cy="60" r="40"/><rect x="132" y="98" width="36" height="24"/><path d="M80 130 Q150 112 220 130 L212 300 Q150 316 88 300 Z"/>`
      + `<path d="M80 134 L44 290 L62 296 L100 170 Z"/><path d="M220 134 L256 290 L238 296 L200 170 Z"/>`
      + `<path d="M90 300 L84 450 L96 590 L132 590 L140 450 L148 310 Z"/><path d="M210 300 L216 450 L204 590 L168 590 L160 450 L152 310 Z"/></g>`
      + `<path d="M84 600 h52 M164 600 h52" stroke="${TEAL}" stroke-width="10" stroke-linecap="round"/>`);
    const BX = 120, BY = 110;
    const SPOTS = [[1, 'Isquiotibiales', 8, '19 días de baja de media', 110, 380], [2, 'Tobillo', 6, '12 días: esguinces en el aterrizaje', 196, 570], [3, 'Rodilla', 5, '34 días: la lesión más larga', 108, 455], [4, 'Hombro', 4, '9 días: lanzadoras y laterales', 222, 140], [5, 'Aductor', 2, '7 días', 160, 320]];
    const WEEKS = Array.from({ length: 34 }, (_, i) => String(i + 1));
    const ACWR = [1.0, 1.08, 1.15, 1.12, 1.05, 1.1, 1.18, 1.2, 1.12, 1.08, 1.15, 1.28, 1.45, 1.62, 1.3, 1.05, 0.72, 0.85, 1.12, 1.2, 1.18, 1.1, 1.08, 1.15, 1.22, 1.38, 1.55, 1.2, 1.05, 1.0, 1.1, 1.12, 1.06, 0.98];
    const zx = v => 120 + (v - 0.5) / 1.5 * 1040;
    return numbered(build({ name: 'BM Arenal · carga y lesiones 2025-26', palette: 'office', fonts: 'websafe', title: { color: INK, size: 42 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        shape('rounded', 110, 60, 540, 620, SLATE, { radius: 26 }), shape('rect', 140, 110, 480, 540, WHITE, { shadow: { x: 0, y: 4, blur: 10, color: '#00000033' } }),
        shape('rounded', 290, 40, 180, 64, '#b8c2cc', { radius: 14, stroke: '#8794a0', strokeWidth: 3 }), shape('ellipse', 365, 52, 30, 30, SLATE),
        kicker('PARTE DE CARGA · SERVICIO MÉDICO', 180, 140, 420, CORAL, { fontSize: 15, letterSpacing: 3 }),
        text('Carga<br>y lesiones', 176, 180, 420, 150, { fontFamily: H, fontSize: 56, color: INK, lineHeight: 1.08 }),
        text('BM Arenal · temporada 2025-26', 180, 340, 420, 40, { fontSize: 20, color: DIM }),
        ...[['Jugadoras en seguimiento', '16'], ['Sesiones registradas', '214'], ['Lesiones con baja', '25']].map(([l, v], i) => [
          shape('rect', 180, 438 + i * 60, 400, 1, LINE),
          text(l, 180, 400 + i * 60, 300, 34, { fontSize: 18, color: DIM }), text(`<b>${v}</b>`, 480, 398 + i * 60, 100, 36, { fontFamily: H, fontSize: 24, color: TEAL, textAlign: 'right' })]).flat(),
        text('Revisado por: equipo de fisioterapia', 180, 590, 400, 30, { fontSize: 15, color: DIM, fontStyle: 'italic' }),
        m3d('kh-RiggedFigure', 720, 90, 460, 560, { view: 'front', autoRotate: true, spin: 15, edge: 'fade' })],
        notes: 'Portada como una carpeta de fisioterapia hecha con formas, y una figura articulada en 3D que gira. Club y datos, inventados.' },
      { layout: 'blank', bg: BG, transition: 'push', extra: [
        text('Dónde duele: 25 lesiones', 560, 60, 660, 70, { fontFamily: H, fontSize: 42, color: INK }),
        img(body, BX, BY - 50, 300, 620, 'Silueta del cuerpo humano, de frente'),
        ...SPOTS.map(([n, , c, , x, y], i) => { const d = 26 + c * 6;
          return [chain(shape('ellipse', BX + x - d / 2, BY - 50 + y - d / 2, d, d, CORAL, { opacity: 85, stroke: WHITE, strokeWidth: 3 }), i, 'zoom-in', { sound: 'pop', duration: 300 }),
            withAnims(text(`<b>${n}</b>`, BX + x - 20, BY - 50 + y - 14, 40, 28, { fontSize: 18, color: WHITE, textAlign: 'center' }), A('zoom-in', { start: 'withPrev', duration: 300 })),
            withAnims(text(`<span style="font-family:${H};font-size:28px;color:${CORAL}">${n}</span>&nbsp; <b>${SPOTS[i][1]}: ${c}</b><br><span style="color:${DIM}">${SPOTS[i][3]}</span>`, 560, 160 + i * 96, 640, 86, { fontSize: 21, color: INK }),
              A('fade-left', { start: 'withPrev', duration: 300 }))]; }).flat()],
        notes: 'Mapa del cuerpo dibujado en SVG: un clic y las cinco zonas aparecen encadenadas, con su número y su explicación. El tamaño del círculo es el número de lesiones.' },
      { layout: 'titleOnly', title: 'Una cuenta sencilla avisa del riesgo', bg: BG, transition: 'fade', extra: [
        mathBlock({ x: 70, y: 150, w: 640, h: 130, fontSize: 36, color: INK, latex: '\\text{ACWR} = \\dfrac{C_{7}}{\\overline{C}_{28}}' }),
        mathBlock({ x: 740, y: 160, w: 470, h: 110, fontSize: 30, color: TEAL, latex: 'C = \\text{RPE} \\times t' }),
        text('C₇: carga de los últimos 7 días · C̄₂₈: media semanal de los últimos 28 días', 70, 290, 640, 60, { fontSize: 18, color: DIM }),
        text('RPE: esfuerzo que siente la jugadora, de 1 a 10, al acabar cada sesión · t: minutos', 740, 280, 470, 60, { fontSize: 18, color: DIM }),
        shape('rect', zx(0.5), 420, zx(0.8) - zx(0.5), 60, AMBER), shape('rect', zx(0.8), 420, zx(1.3) - zx(0.8), 60, GREEN), shape('rect', zx(1.3), 420, zx(1.5) - zx(1.3), 60, '#f0c75e'), shape('rect', zx(1.5), 420, zx(2.0) - zx(1.5), 60, CORAL),
        ...[['Poca carga', 0.5, 0.8], ['Zona segura', 0.8, 1.3], ['Atención', 1.3, 1.5], ['Riesgo alto', 1.5, 2.0]].map(([t, a, b]) => text(t, zx(a), 434, zx(b) - zx(a), 34, { fontSize: 18, color: WHITE, textAlign: 'center', fontWeight: 700 })),
        ...[0.5, 0.8, 1.3, 1.5, 2.0].map(v => text(String(v).replace('.', ','), zx(v) - 40, 490, 80, 30, { fontSize: 18, color: DIM, textAlign: 'center' })),
        withAnims(shape('triangle', zx(1.0) - 18, 380, 36, 32, INK, { rotation: 180 }), path([[zx(1.62) - zx(1.0), 0]], { start: 'click', duration: 1600, sound: 'whoosh' })),
        click(text(`<b style="color:${CORAL}">Semana 14: 1,62.</b> Tres partidos en ocho días después del parón… y cuatro lesiones musculares.`, 120, 560, 1040, 70, { fontSize: 22, color: INK, textAlign: 'center' }), 'fade-up')],
        notes: 'Dos ecuaciones en LaTeX y una escala hecha con formas. Primer clic: el marcador viaja de 1,0 a 1,62 (trayectoria, con sonido). Segundo clic: lo que pasó esa semana.' },
      { layout: 'titleOnly', title: 'La temporada, semana a semana', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'line', color: TEAL, seriesName: 'ACWR del equipo', grid: true, xTitle: 'Semanas 1 a 34 (septiembre a mayo)', yTitle: 'ACWR', yMin: 0.5, yMax: 1.8,
          data: D(WEEKS.map(() => ''), ACWR), series: [{ name: 'Umbral de riesgo', values: WEEKS.map(() => 1.5), color: CORAL }] }),
        ...[['Semana 14', '1,62 → 4 lesiones', CORAL], ['Semana 17', '0,72: Navidad sin entrenar', '#b86e00'], ['Semana 27', '1,55 → 3 lesiones', CORAL]].map(([h, t, c], i) =>
          chain(card(`<b style="font-family:${H};font-size:24px;color:${c}">${h}</b><br>${t}`, 950, 180 + i * 140, 270, 116, WHITE, { fontSize: 19, color: INK, radius: 10, borderColor: LINE }), i, 'fade-left'))],
        notes: 'Líneas: el ACWR medio del equipo y el umbral de 1,5 como una segunda serie constante. Tras la caída de Navidad, la vuelta brusca vuelve a disparar el riesgo.' },
      { layout: 'titleOnly', title: 'Lesiones por mes y tipo', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'stacked', color: CORAL, seriesName: 'Muscular', grid: true, dataLabels: true, yTitle: 'Lesiones',
          data: D(['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'], [1, 1, 4, 1, 2, 1, 3, 1, 0]),
          series: [{ name: 'Articular', values: [1, 0, 1, 0, 2, 1, 1, 0, 1], color: TEAL }, { name: 'Sobrecarga', values: [0, 1, 0, 0, 1, 0, 1, 1, 0], color: AMBER }] }),
        click(card(`<div style="font-family:${H};font-size:52px;color:${CORAL}">60 %</div>de las lesiones musculares llegaron con el ACWR por encima de 1,3.`, 950, 200, 270, 280, WHITE, { fontSize: 21, color: INK, radius: 10, borderColor: CORAL }), 'fade-left')],
        notes: 'Columnas apiladas con etiquetas por tipo de lesión. Noviembre y marzo coinciden con los dos picos de carga.' },
      { layout: 'titleOnly', title: 'El aviso, automático', bg: BG, transition: 'fade', extra: [
        codeBlock({ x: 60, y: 160, w: 720, h: 380, fontSize: 20, lang: 'python', lineSteps: '1-4|6-7|8-9',
          code: 'def acwr(cargas, hoy):\n    aguda = sum(cargas[hoy - 6:hoy + 1]) / 7\n    cronica = sum(cargas[hoy - 27:hoy + 1]) / 28\n    return aguda / cronica\n\nfor jugadora in plantilla:\n    r = acwr(jugadora.cargas, hoy)\n    if r > 1.5:\n        avisar(jugadora, f"ACWR {r:.2f}")' }),
        ...[['clipboard-list', 'Cada jugadora apunta su RPE en el móvil al acabar'], ['bell', 'A las 22:00 el programa revisa a toda la plantilla'], ['stethoscope', 'Si alguien pasa de 1,5, el preparador lo sabe antes del día siguiente']].map(([ic, t], i) =>
          [chain(icon(ic, 820, 180 + i * 130, 48, TEAL), i, 'fade-left'), withAnims(text(t, 890, 176 + i * 130, 330, 100, { fontSize: 20, color: INK }), A('fade-left', { start: 'withPrev' }))]).flat()],
        notes: 'Código con pasos de resaltado: primero la función, luego el bucle y por último el aviso. A la derecha, cómo se usa en el día a día.' },
      { layout: 'titleOnly', title: 'La semana 27, jugadora a jugadora', bg: BG, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 860, h: 420, fontSize: 21, header: true, banded: true, headBg: TEAL, headFg: WHITE, band: TEAL, bandAlpha: 0.07, stroke: LINE, color: INK, colW: [2.6, 1.3, 1.5, 1.6, 1.9, 1.3],
          rows: [['Jugadora', 'RPE', 'Minutos', 'Carga', 'Media 4 sem.', 'ACWR'], ['N.º 11 · extremo', '7,5', '420', '=B2*C2', '2.010', '=D2/E2'], ['N.º 14 · central', '7,2', '400', '=B3*C3', '2.090', '=D3/E3'],
            ['N.º 7 · lateral', '6,8', '390', '=B4*C4', '2.080', '=D4/E4'], ['N.º 1 · portera', '5,4', '330', '=B5*C5', '1.850', '=D5/E5'], ['N.º 3 · pivote', '6,1', '350', '=B6*C6', '2.270', '=D6/E6']] }),
        click(card(`<b style="color:${CORAL}">N.º 11: 1,57</b><br>Descansa el jueves y juega solo la segunda parte del sábado.`, 950, 200, 270, 250, WHITE, { fontSize: 21, color: INK, radius: 10, borderColor: CORAL }), 'fade-left'),
        text('Carga en unidades arbitrarias (RPE × minutos).', 60, 600, 860, 30, { fontSize: 17, color: DIM })],
        notes: 'Tabla con fórmulas: la carga es =B2*C2 y el ACWR, =D2/E2. Cambia los minutos de una jugadora y verás cómo se mueve su riesgo.' },
      { layout: 'titleOnly', title: 'Vuelta al juego en cinco pasos', bg: BG, transition: 'fade', extra: [
        dg('cycle', 'Reposo relativo\nFuerza en gimnasio\nCarrera y cambios de ritmo\nEntreno con el equipo\nPartido con minutos', 70, 150, 620, 500, { oneByOne: true, colors: 'colorful', fontScale: 1.1 }),
        card('<b>Regla del 10 %</b><br>En la vuelta, la carga semanal no sube más de un 10 % respecto a la anterior.<br><br><b>Alta</b> cuando el ACWR lleva dos semanas entre 0,8 y 1,3.', 740, 250, 470, 250, WHITE, { fontSize: 21, color: INK, radius: 10, borderColor: TEAL })],
        notes: 'Diagrama de ciclo que aparece paso a paso: el protocolo de vuelta tras una lesión muscular.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué más medirías cada día? (elige varias)', x: 80, y: 60, w: 1120, h: 560,
        options: ['Horas de sueño', 'Dolor muscular', 'Estado de ánimo', 'Salto vertical', 'Pulso en reposo'] }),
        credits(['kh-RiggedFigure'], 80, 650, 1120, DIM)],
        notes: 'Votación de respuesta múltiple. Las respuestas más votadas entrarán en el cuestionario de la próxima temporada.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · The shot chart: a honey parquet floor with painted lines — a shot arc traced on the cover,
  // effective field goal %, a half court with zones coloured by efficiency, the shift to the three in 100 %
  // bars, two lines that cross, points per shot, players with formulas and a quiz.
  data_sport_shots: { name: 'Desde dónde se gana: mapa de tiro', cat: 'data', summary: 'Parqué de madera: tiro trazado, ecuación eFG, media pista con zonas por eficiencia, barras al 100 %, líneas que se cruzan y concurso', make: () => {
    const NAVY = '#13294b', HOT = '#d7263d', ORG = '#f49d37', ORT = '#b85c00', SAND = '#f6d28a', ICE = '#9fc5d6', COLD = '#2e86ab', CREAM = '#fbf3e4', INK = '#1c1c24', DIM = '#6a5f52', WHITE = '#ffffff';
    const H = pairStacks('tech').heading;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const parquet = (w, h) => svgURL(w, h, Array.from({ length: Math.ceil(h / 36) }, (_, r) => { let x = -rnd() * 300, out = '';
      while (x < w) { const L = 220 + rnd() * 260, tone = ['#d9a566', '#cf9a5a', '#e2b276', '#d49f60', '#c99254'][Math.floor(rnd() * 5)];
        out += `<rect x="${x.toFixed(0)}" y="${r * 36}" width="${L.toFixed(0)}" height="36" fill="${tone}" stroke="#b07c42" stroke-width="1.2"/>`; x += L; } return out; }).join(''));
    const FLOOR = parquet(1280, 720);
    // Half court, 40 px per metre (15 × 14 m), rim at (300, 63); zones coloured by eFG %.
    const ARC = 'M36 0 L36 119.6 A270 270 0 0 0 564 119.6 L564 0 Z';
    const ZONES = [['Aro', 64, 300, 118], ['Pintura', 44, 300, 190], ['Media izquierda', 37, 120, 110], ['Media central', 39, 300, 285], ['Media derecha', 36, 480, 110],
      ['Esquina izquierda', 58, 18, 60], ['Esquina derecha', 60, 582, 60], ['Ala izquierda', 52, 80, 330], ['Ala derecha', 51, 520, 330], ['Frontal', 49, 300, 440]];
    const heat = v => (v >= 58 ? HOT : v >= 52 ? ORG : v >= 46 ? SAND : v >= 40 ? ICE : COLD);
    const Z = Object.fromEntries(ZONES.map(([n, v]) => [n, heat(v)]));
    const shotMap = svgURL(600, 560, `<defs><clipPath id="in"><path d="${ARC}"/></clipPath><mask id="out"><rect width="600" height="560" fill="#fff"/><path d="${ARC}" fill="#000"/></mask></defs>`
      + `<rect width="600" height="560" fill="#e9c48f"/>`
      + `<g clip-path="url(#in)"><rect x="0" y="0" width="202" height="300" fill="${Z['Media izquierda']}"/><rect x="398" y="0" width="202" height="300" fill="${Z['Media derecha']}"/><rect x="202" y="232" width="196" height="100" fill="${Z['Media central']}"/>`
      + `<rect x="202" y="0" width="196" height="232" fill="${Z.Pintura}"/><circle cx="300" cy="63" r="80" fill="${Z.Aro}"/></g>`
      + `<g mask="url(#out)"><rect x="0" y="0" width="60" height="140" fill="${Z['Esquina izquierda']}"/><rect x="540" y="0" width="60" height="140" fill="${Z['Esquina derecha']}"/>`
      + `<path d="M0 140 L60 140 L230 560 L0 560 Z" fill="${Z['Ala izquierda']}"/><path d="M600 140 L540 140 L370 560 L600 560 Z" fill="${Z['Ala derecha']}"/><path d="M60 140 L540 140 L370 560 L230 560 Z" fill="${Z.Frontal}"/><rect x="0" y="0" width="60" height="140" fill="${Z['Esquina izquierda']}"/><rect x="540" y="0" width="60" height="140" fill="${Z['Esquina derecha']}"/></g>`
      + `<g stroke="#ffffff" stroke-width="4" fill="none"><rect x="2" y="2" width="596" height="556"/><path d="${ARC}"/><rect x="202" y="2" width="196" height="230"/><circle cx="300" cy="232" r="72"/>`
      + `<path d="M250 63 A50 50 0 0 0 350 63"/><path d="M270 40 H330"/><circle cx="300" cy="63" r="9"/><path d="M228 558 A72 72 0 0 1 372 558"/></g>`);
    const MX = 80, MY = 150, MS = 0.92;
    const SEASONS = ['16-17', '17-18', '18-19', '19-20', '20-21', '21-22', '22-23', '23-24', '24-25', '25-26'];
    return numbered(ink2(build({ name: 'Atlético Pinares · mapa de tiro 2025-26', palette: 'warm', fonts: 'tech', title: { color: NAVY, size: 44 }, body: { color: INK } }, [
      { layout: 'blank', bg: '#d9a566', transition: 'fade', back: [img(FLOOR, 0, 0, 1280, 720, 'Suelo de parqué de madera')], extra: [
        shape('rect', 820, 0, 300, 420, NAVY, { opacity: 92 }), shape('ellipse', 820, 270, 300, 300, 'none', { stroke: WHITE, strokeWidth: 6 }), shape('rect', 820, 0, 300, 420, 'none', { stroke: WHITE, strokeWidth: 6 }),
        shape('rect', 930, 60, 80, 6, WHITE), shape('ellipse', 945, 66, 50, 30, 'none', { stroke: ORG, strokeWidth: 6 }),
        kicker('ATLÉTICO PINARES · TEMPORADA 2025-26', 80, 210, 640, NAVY, { fontWeight: 700 }),
        text('Desde dónde<br>se gana', 76, 250, 700, 220, { fontFamily: H, fontSize: 96, fontWeight: 700, color: NAVY, lineHeight: 1 }),
        text('Un mapa de tiro: qué zonas dan puntos y cuáles los quitan', 80, 480, 640, 70, { fontSize: 28, color: INK }),
        withAnims(ink([[700, 700], [760, 470], [830, 270], [900, 140], [965, 78]], WHITE, 5, { dash: 'dash' }), A('draw', { start: 'afterPrev', duration: 1500, delay: 300 })),
        withAnims(shape('ellipse', 940, 50, 40, 40, ORG, { stroke: '#8a3e00', strokeWidth: 2 }), A('bounce', { start: 'afterPrev', duration: 600, sound: 'pop' }))],
        notes: 'El parqué es un dibujo SVG (tablas de madera de tonos distintos) y la zona pintada, formas. Al llegar se traza un tiro (efecto «Dibujar») y el balón entra en el aro. Club inventado.' },
      { layout: 'titleOnly', title: 'No todos los aciertos valen igual', bg: CREAM, transition: 'push', extra: [
        mathBlock({ x: 70, y: 160, w: 640, h: 130, fontSize: 38, color: INK, latex: '\\text{eFG\\%} = \\dfrac{a + \\tfrac{1}{2}\\,a_3}{n}' }),
        text('<b>a</b>: tiros de campo anotados · <b>a₃</b>: triples anotados · <b>n</b>: tiros intentados', 70, 300, 640, 70, { fontSize: 20, color: DIM }),
        text('El triple vale un 50 % más: el eFG lo cuenta y deja comparar zonas.', 70, 390, 640, 70, { fontSize: 24, color: INK }),
        ...[['Media distancia', '41 % × 2', '0,82', COLD], ['Triple de esquina', '39 % × 3', '1,17', ORT], ['Bandeja', '62 % × 2', '1,24', HOT]].map(([z, c, p, col], i) =>
          chain(card(`<div style="font-size:20px;color:${DIM}">${z} · ${c}</div><div style="font-family:${H};font-size:46px;font-weight:700;color:${col}">${p} <span style="font-size:22px">puntos por tiro</span></div>`, 760, 160 + i * 155, 450, 135, WHITE, { fontSize: 20, color: INK, radius: 4, borderColor: '#e8d9bf' }), i, 'fade-left'))],
        notes: 'La ecuación del porcentaje efectivo (LaTeX) y tres tiros comparados en puntos por intento: un triple fallado dos de cada tres veces rinde más que un tiro de dos «seguro».' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
        img(shotMap, MX, MY, Math.round(600 * MS), Math.round(560 * MS), 'Media pista con diez zonas de tiro coloreadas según su eficiencia'),
        text('Eficiencia por zona', 690, 60, 520, 60, { fontFamily: H, fontSize: 42, fontWeight: 700, color: NAVY }),
        text('eFG % de los 2.312 tiros del equipo en liga regular', 690, 120, 520, 40, { fontSize: 20, color: DIM }),
        text('Media pista', MX, 100, 400, 40, { fontSize: 20, color: DIM, letterSpacing: 2 }),
        ...ZONES.map(([n, v, x, y], i) => withAnims(text(`<b>${v}</b>`, Math.round(MX + x * MS - 34), Math.round(MY + y * MS - 18), 68, 36, { fontSize: 24, color: v >= 58 || v < 40 ? WHITE : INK, textAlign: 'center' }),
          A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 200 }))),
        ...[[HOT, '58 % o más'], [ORG, '52–57 %'], [SAND, '46–51 %'], [ICE, '40–45 %'], [COLD, 'menos de 40 %']].map(([c, t], i) => [shape('rect', 690, 200 + i * 52, 44, 36, c, { radius: 4 }), text(t, 750, 200 + i * 52, 300, 36, { fontSize: 21, color: INK, vAlign: 'middle' })]).flat(),
        click(card(`Las <b style="color:${HOT}">esquinas</b> rinden como una bandeja; la <b style="color:${COLD}">media distancia</b>, como un mal día.`, 690, 480, 520, 130, WHITE, { fontSize: 22, color: INK, radius: 4, borderColor: '#e8d9bf' }), 'fade-up')],
        notes: 'La media pista es un SVG con zonas recortadas por la línea de triple (máscaras). Un clic y las cifras aparecen zona a zona; otro, la conclusión.' },
      { layout: 'titleOnly', title: 'Diez años moviendo el tiro', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 1150, h: 500, chartType: 'stacked100', color: HOT, seriesName: 'Cerca del aro', dataLabels: true,
          data: D(['16-17', '18-19', '20-21', '22-23', '24-25', '25-26'], [34, 35, 36, 37, 38, 38]),
          series: [{ name: 'Media distancia', values: [36, 31, 25, 19, 15, 13], color: COLD }, { name: 'Triple', values: [30, 34, 39, 44, 47, 49], color: ORG }] })],
        notes: 'Barras al 100 %: reparto de los tiros del equipo por temporadas. La media distancia pasa del 36 % al 13 %; el triple llega casi a la mitad.' },
      { layout: 'titleOnly', title: 'Las líneas se cruzan en 2021', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'line', color: ORG, seriesName: 'Triples intentados', grid: true, xTitle: 'Temporada', yTitle: 'Intentos por partido',
          data: D(SEASONS.map((v, i) => (i % 3 ? '' : v)), [19.4, 21.0, 22.8, 24.1, 26.5, 28.9, 30.2, 31.8, 32.5, 33.6]), series: [{ name: 'Tiros de media distancia', values: [23.5, 22.1, 20.0, 18.2, 15.9, 13.0, 11.8, 10.4, 9.6, 8.9], color: COLD }] }),
        click(card(`<div style="font-family:${H};font-size:52px;font-weight:700;color:${ORT}">×1,7</div>triples por partido en diez años, en toda la liga.`, 950, 210, 270, 230, WHITE, { fontSize: 21, color: INK, radius: 4, borderColor: '#e8d9bf' }), 'zoom-in', { sound: 'pop' })],
        notes: 'Dos líneas que se cruzan: los triples suben y la media distancia baja. Datos de toda la liga, inventados.' },
      { layout: 'titleOnly', title: 'Puntos por tiro, zona a zona', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 1150, h: 480, chartType: 'hbar', color: NAVY, dataLabels: true, xTitle: 'Puntos por intento',
          data: D(['Aro', 'Esquina derecha', 'Esquina izquierda', 'Ala izquierda', 'Ala derecha', 'Frontal', 'Pintura', 'Media central', 'Media izquierda', 'Media derecha'], [1.28, 1.2, 1.16, 1.04, 1.02, 0.98, 0.88, 0.78, 0.74, 0.72]) })],
        notes: 'Barras horizontales ordenadas: puntos por intento (eFG × 2). Del aro a la media distancia hay más de medio punto por tiro.' },
      { layout: 'titleOnly', title: 'Perfil de tiro de la plantilla', bg: CREAM, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 860, h: 420, fontSize: 22, header: true, banded: true, headBg: NAVY, headFg: WHITE, band: ORG, bandAlpha: 0.1, stroke: '#e8d9bf', color: INK, colW: [2.8, 1.2, 1.2, 1.3, 1.6],
          rows: [['Jugador', 'TC', 'T3', 'TCI', 'eFG %'], ['C. Navas (base)', '142', '61', '301', '=(B2+C2/2)/D2*100'], ['O. Mbaye (alero)', '188', '74', '352', '=(B3+C3/2)/D3*100'],
            ['P. Rius (escolta)', '121', '58', '268', '=(B4+C4/2)/D4*100'], ['H. Lindqvist (pívot)', '201', '3', '318', '=(B5+C5/2)/D5*100'], ['A. Varela (ala-pívot)', '96', '22', '214', '=(B6+C6/2)/D6*100']] }),
        click(card(`<b style="color:${ORT}">Mbaye</b>: el más eficiente fuera; <b style="color:${HOT}">Lindqvist</b> vive en la pintura y casi no tira de tres.`, 950, 200, 270, 280, WHITE, { fontSize: 21, color: INK, radius: 4, borderColor: '#e8d9bf' }), 'fade-left')],
        notes: 'Tabla con fórmulas: el eFG % se calcula en cada fila, =(B2+C2/2)/D2*100. Jugadores inventados.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 32, question: '¿Qué tiro da más puntos por intento?', x: 80, y: 60, w: 1120, h: 600, time: 20,
        options: ['Media distancia al 45 %', 'Triple de esquina al 39 %', 'Tiro en la pintura al 50 %', 'Triple frontal al 31 %'], correct: [1] })],
        notes: 'Concurso: 0,90; 1,17; 1,00 y 0,93 puntos por intento. Gana el triple de esquina, aunque falle seis de cada diez.' },
      { layout: 'blank', bg: '#d9a566', transition: 'zoom', back: [img(FLOOR, 0, 0, 1280, 720, 'Suelo de parqué')], extra: [
        shape('rect', 240, 200, 800, 300, NAVY, { opacity: 94 }), shape('rect', 256, 216, 768, 268, 'none', { stroke: WHITE, strokeWidth: 3 }),
        text('Tira de donde más rinde', 260, 250, 760, 90, { fontFamily: H, fontSize: 56, fontWeight: 700, color: WHITE, textAlign: 'center' }),
        text('Gracias · ¿Preguntas?', 260, 360, 760, 60, { fontSize: 32, color: ORG, textAlign: 'center' })],
        notes: 'Cierre sobre el parqué, con un rótulo pintado de azul marino.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · The Elo rating in a chess club: black and ivory squares, brass details — a 3D knight on the board,
  // the two formulas, the expected-score curve, a worked example in steps, the club's ratings, a tournament
  // table with formulas, a histogram, the update in code, a quiz and the knight walking off.
  data_sport_elo: { name: 'Elo: cómo se mide la fuerza', cat: 'data', summary: 'Tablero nocturno: caballero 3D, ecuaciones, curva esperada, ejemplo paso a paso, histograma, tabla con fórmulas, código y concurso', make: () => {
    const BG = '#121212', IVORY = '#f1ead9', BRASS = '#c9a25c', GREY = '#9c968a', SQD = '#2b2b2b', SQL = '#d9cfba', PANEL = '#1e1e1e', RED = '#d0603f';
    const H = pairStacks('editorial').heading;
    const board = (n = 8, s = 60) => svgURL(n * s + 16, n * s + 16, `<rect width="${n * s + 16}" height="${n * s + 16}" fill="#5a4426"/>` + Array.from({ length: n * n }, (_, k) => { const i = k % n, j = Math.floor(k / n);
      return `<rect x="${8 + i * s}" y="${8 + j * s}" width="${s}" height="${s}" fill="${(i + j) % 2 ? SQD : SQL}"/>`; }).join(''));
    const KNIGHT = uid();
    const DIFF = [-600, -500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500, 600];
    const RATINGS = [1180, 1240, 1290, 1320, 1350, 1380, 1405, 1420, 1440, 1460, 1475, 1490, 1500, 1515, 1530, 1540, 1555, 1560, 1575, 1590, 1600, 1610, 1620, 1630, 1640, 1650, 1655, 1665, 1675, 1680, 1690,
      1700, 1710, 1720, 1730, 1740, 1750, 1760, 1775, 1790, 1800, 1815, 1830, 1845, 1860, 1880, 1900, 1915, 1930, 1950, 1975, 2000, 2020, 2050, 2080, 2110, 2150, 2190, 2240, 2310];
    return numbered(ink2(build({ name: 'Club de Ajedrez Torreblanca · el Elo', palette: 'grayscale', fonts: 'editorial', title: { color: IVORY, size: 42 }, body: { color: IVORY } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(560, -100, 800, '#3a3122', BG, 70)], extra: [
        img(board(), 700, 150, 496, 496, 'Tablero de ajedrez'),
        { ...m3d('kk-Knight', 760, 60, 380, 520, { view: 'front', clip: 'Idle' }), id: KNIGHT },
        kicker('CLUB DE AJEDREZ TORREBLANCA · SEMINARIO', 80, 190, 600, BRASS),
        text('El número que ordena el tablero', 76, 230, 580, 220, { fontFamily: H, fontSize: 56, fontWeight: 700, color: IVORY, lineHeight: 1.15 }),
        text('Cómo funciona el Elo, con nuestros propios torneos', 80, 470, 560, 70, { fontSize: 26, color: GREY })],
        notes: 'Portada nocturna: un tablero dibujado en SVG y un caballero en 3D sobre él (el mismo de la última diapositiva). Club, socios y puntuaciones, inventados.' },
      { layout: 'titleOnly', title: 'Dos fórmulas, toda la idea', bg: BG, transition: 'push', extra: [
        text('1 · Lo que se espera de ti', 70, 150, 540, 40, { fontSize: 24, color: BRASS }),
        mathBlock({ x: 70, y: 200, w: 540, h: 130, fontSize: 36, color: IVORY, latex: 'E_A = \\dfrac{1}{1 + 10^{(R_B - R_A)/400}}' }),
        text('2 · Lo que cambia tu Elo', 670, 150, 540, 40, { fontSize: 24, color: BRASS }),
        mathBlock({ x: 670, y: 200, w: 540, h: 130, fontSize: 36, color: IVORY, latex: "R_A' = R_A + K\\,(S_A - E_A)" }),
        ...[['R', 'la puntuación de cada jugador'], ['S', 'el resultado: 1 gana, ½ tablas, 0 pierde'], ['K', 'cuánto se mueve: 20 en nuestro club'], ['400', 'escala: 400 puntos son 10 veces más fuerza']].map(([k, t], i) =>
          chain(text(`<b style="font-family:${H};color:${BRASS};font-size:30px">${k}</b>&nbsp;&nbsp;${t}`, 70 + (i % 2) * 600, 400 + Math.floor(i / 2) * 90, 560, 70, { fontSize: 22, color: IVORY, vAlign: 'middle' }), i, 'fade-up'))],
        notes: 'Las dos fórmulas del sistema Elo en LaTeX. Un clic y entran sus cuatro piezas, una tras otra.' },
      { layout: 'titleOnly', title: 'Cuánto esperar según la diferencia', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'line', color: BRASS, seriesName: 'Puntuación esperada', grid: true, xTitle: 'Tu Elo menos el del rival', yTitle: 'Puntos esperados (%)', yMin: 0, yMax: 100,
          data: D(DIFF.map(String), DIFF.map(d => Math.round(100 / (1 + 10 ** (-d / 400))))) }),
        ...[['+100', '64 de cada 100 puntos'], ['+200', '76 de cada 100'], ['+400', '91: casi siempre ganas']].map(([d, t], i) =>
          chain(card(`<b style="font-family:${H};font-size:30px;color:${BRASS}">${d}</b><br>${t}`, 950, 190 + i * 140, 270, 116, PANEL, { fontSize: 20, color: IVORY, radius: 6 }), i, 'fade-left'))],
        notes: 'La curva logística de la puntuación esperada, calculada con la fórmula (línea con el eje de 0 a 100). Es simétrica: −100 da 36 %.' },
      { layout: 'titleOnly', title: 'Un ejemplo de los martes', bg: BG, transition: 'fade', extra: [
        ...[['La partida', 'Ana (1.850) contra Bruno (2.010)'], ['Lo esperado', 'Diferencia −160 → E = 0,28'], ['El resultado', '¡Gana Ana! S = 1'], ['El cambio', '1.850 + 20 × (1 − 0,28) = <b>1.864,4</b>']].map(([h, t], i) =>
          [chain(card(`<div style="font-family:${H};font-size:26px;color:${BRASS};margin-bottom:10px">${h}</div>${t}`, 70 + i * 290, 220, 250, 230, PANEL, { fontSize: 22, color: IVORY, radius: 6, borderColor: '#3a3a3a' }), i, 'fade-up', { duration: 400 }),
            ...(i < 3 ? [withAnims(shape('chevron', 326 + i * 290, 315, 28, 40, BRASS), A('fade-in', { start: 'withPrev', duration: 300 }))] : [])]).flat(),
        click(text(`Bruno pierde lo mismo: <b style="color:${RED}">−14,4</b>. El Elo no se crea ni se destruye, se reparte.`, 70, 510, 1140, 60, { fontSize: 26, color: IVORY, textAlign: 'center' }), 'fade-up', { sound: 'chime' })],
        notes: 'El ejemplo entra paso a paso, encadenado con un clic; las flechas son formas «galón». Último clic: la conservación de puntos, con sonido.' },
      { layout: 'titleOnly', title: 'Un año en el club', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 1150, h: 500, chartType: 'line', color: BRASS, seriesName: 'Ana', grid: true, yTitle: 'Elo', yMin: 1700, yMax: 2100,
          data: D(['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'], [1802, 1815, 1830, 1824, 1850, 1864, 1880, 1902, 1915, 1931, 1928, 1946]),
          series: [{ name: 'Bruno', values: [2032, 2025, 2018, 2020, 2010, 1996, 1990, 1998, 1985, 1979, 1982, 1976], color: IVORY }, { name: 'Carmen', values: [1740, 1752, 1771, 1790, 1785, 1802, 1828, 1840, 1866, 1890, 1910, 1932], color: RED }] })],
        notes: 'Tres socios durante doce meses (líneas de tres series, eje de 1.700 a 2.100). Carmen sube casi 200 puntos: el torneo de verano fue suyo.' },
      { layout: 'titleOnly', title: 'Torneo de otoño: Elo nuevo', bg: BG, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 880, h: 400, fontSize: 22, header: true, lines: true, headBg: BRASS, headFg: BG, stroke: '#3a3a3a', color: IVORY, colW: [2.6, 1.4, 1.4, 1.6, 1.8],
          rows: [['Jugador', 'Elo', 'Puntos', 'Esperados', 'Elo nuevo'], ['Carmen V.', '1.932', '4,5', '3,1', '=REDONDEAR(B2+20*(C2-D2); 0)'], ['Ana L.', '1.946', '3,5', '3,2', '=REDONDEAR(B3+20*(C3-D3); 0)'],
            ['Bruno M.', '1.976', '3', '3,6', '=REDONDEAR(B4+20*(C4-D4); 0)'], ['Diego R.', '1.890', '2', '2,7', '=REDONDEAR(B5+20*(C5-D5); 0)'], ['Elena S.', '1.840', '2', '2,4', '=REDONDEAR(B6+20*(C6-D6); 0)']] }),
        text('Cinco rondas, K = 20. «Esperados» es la suma de E en sus cinco partidas.', 60, 590, 880, 40, { fontSize: 19, color: GREY }),
        click(card(`<div style="font-family:${H};font-size:44px;color:${BRASS}">+28</div>para Carmen: hizo 1,4 puntos más de lo esperado.`, 980, 200, 240, 260, PANEL, { fontSize: 21, color: IVORY, radius: 6 }), 'fade-left')],
        notes: 'Tabla con fórmulas: el Elo nuevo se calcula fila a fila con =REDONDEAR(B2+20*(C2-D2); 0). Cambia un resultado y se actualiza.' },
      { layout: 'titleOnly', title: 'Así se reparten los 60 socios', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'histogram', color: BRASS, seriesName: 'Socios', bins: 8, grid: true, xTitle: 'Elo', yTitle: 'Socios', data: RATINGS.map(v => ({ label: '', value: v })) }),
        ...[['1.660', 'Elo mediano del club'], ['2.310', 'nuestro mejor jugador'], ['8', 'socios por encima de 2.000']].map(([n, t], i) =>
          chain(fig(n, t, 960, 170 + i * 150, 260, 130, { color: BRASS, fg: IVORY, size: 44, labelSize: 19, font: H }), i, 'fade-left'))],
        notes: 'Un histograma con 8 tramos calculados a partir de los 60 valores (Gráfico ▸ Histograma). La forma de campana es la habitual en cualquier club.' },
      { layout: 'titleOnly', title: 'La actualización, en código', bg: BG, transition: 'fade', extra: [
        codeBlock({ x: 60, y: 160, w: 760, h: 340, fontSize: 21, lang: 'javascript', lineSteps: '1-3|5-6|7-8',
          code: 'function esperado(ra, rb) {\n  return 1 / (1 + 10 ** ((rb - ra) / 400));\n}\n\nfunction actualizar(ra, rb, resultado, k = 20) {\n  const e = esperado(ra, rb);\n  return ra + k * (resultado - e);\n}' }),
        text('actualizar(1850, 2010, 1)  →  1864,4', 60, 520, 760, 50, { fontSize: 24, color: BRASS, fontFamily: 'monospace' }),
        card('<b>¿Y K?</b><br>Los clubes usan K = 40 con los nuevos (para que lleguen rápido a su nivel) y K = 10 con los veteranos muy estables.', 860, 170, 360, 330, PANEL, { fontSize: 21, color: IVORY, radius: 6 })],
        notes: 'Código con pasos de resaltado: el valor esperado, la llamada y el cambio. Debajo, el resultado del ejemplo de Ana.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 32, question: 'Ganas a alguien con 400 puntos más (K = 20). ¿Cuánto sube tu Elo?', x: 80, y: 60, w: 1120, h: 600, time: 25,
        options: ['+2', '+10', '+18', '+20'], correct: [2] })],
        notes: 'Concurso: E = 0,09, así que 20 × (1 − 0,09) ≈ +18. Nunca se ganan más de K puntos en una partida.' },
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(340, 200, 600, '#3a3122', BG, 60)], extra: [
        img(board(8, 30), 80, 420, 256, 256, 'Tablero de ajedrez pequeño'),
        text('Jaque mate a las dudas', 380, 150, 820, 90, { fontFamily: H, fontSize: 56, fontWeight: 700, color: IVORY, textAlign: 'right' }),
        text('¿Preguntas? · Torneo de invierno: 12 de diciembre', 380, 250, 820, 50, { fontSize: 26, color: BRASS, textAlign: 'right' }),
        withAnims({ ...m3d('kk-Knight', 100, 300, 280, 380, { walk: { clip: 'Walking_A', end: 'Cheer', endOnce: true, face: true, look: true } }), id: KNIGHT }, path([[420, 0], [820, 0]], { start: 'afterPrev', duration: 3500 }))],
        notes: 'El caballero 3D echa a andar por la parte de abajo y celebra al final (Modelo 3D ▸ «Mientras se mueve»: el clip Walking_A; al terminar, Cheer). Modelo de dominio público.' },
    ]), IVORY));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Filling the stadium: a match ticket at night under the floodlights — the stands coloured by
  // occupancy, attendance by match, price against occupancy, the matchday income as a treemap, the
  // online funnel, season tickets with formulas, a vote and a seat in 3D with a countdown.
  data_sport_stadium: { name: 'Llenar el estadio', cat: 'data', summary: 'Entrada de partido: gradas por ocupación, áreas, dispersión de dos series, rectángulos, embudo, tabla con fórmulas, votación y butaca 3D', make: () => {
    const NIGHT = '#120a24', CARD = '#221540', PINK = '#f15bb5', YEL = '#fee440', CYAN = '#00bbf9', MINT = '#00f5d4', PURP = '#9b5de5', TICKET = '#fff8e7', INKT = '#22163d', DIM = '#a99cc8', WHITE = '#ffffff';
    const H = pairStacks('modern').heading;
    const occ = v => (v >= 95 ? MINT : v >= 85 ? CYAN : v >= 70 ? PURP : PINK);
    const STANDS = [['Fondo norte', 97], ['Preferencia', 88], ['Tribuna', 94], ['Fondo sur', 61]];
    const bowl = svgURL(620, 480, `<rect x="10" y="10" width="600" height="460" rx="200" fill="#1a1033"/>`
      + `<path d="M130 30 H490 Q520 30 520 60 V90 H100 V60 Q100 30 130 30Z" fill="${occ(97)}"/><path d="M130 450 H490 Q520 450 520 420 V390 H100 V420 Q100 450 130 450Z" fill="${occ(61)}"/>`
      + `<path d="M30 130 V350 Q30 380 60 380 H90 V100 H60 Q30 100 30 130Z" fill="${occ(94)}"/><path d="M590 130 V350 Q590 380 560 380 H530 V100 H560 Q590 100 590 130Z" fill="${occ(88)}"/>`
      + `<rect x="120" y="110" width="380" height="260" fill="#2a7a3b"/><g stroke="#ffffff" stroke-width="3" fill="none" opacity="0.8"><rect x="130" y="120" width="360" height="240"/><path d="M130 240 H490"/><circle cx="310" cy="240" r="34"/><rect x="250" y="120" width="120" height="44"/><rect x="250" y="316" width="120" height="44"/></g>`);
    const BW = 620, BX = 70, BY = 150;
    const LBL = [['Fondo norte', 97, 310, 60], ['Fondo sur', 61, 310, 420], ['Tribuna', 94, 60, 240], ['Preferencia', 88, 560, 240]];
    const M = ['J1', 'J3', 'J5', 'J7', 'J9', 'J11', 'J13', 'J15', 'J17', 'J19', 'J21', 'J23', 'J25', 'J27', 'J29', 'J31', 'J33', 'J35', 'J37'];
    const ATT = [24100, 19800, 21500, 27900, 16200, 18400, 22800, 11200, 15600, 26300, 20100, 17300, 21900, 14800, 23600, 25200, 19400, 24800, 27600];
    return numbered(build({ name: 'UD Robledal · llenar el estadio', palette: 'violet', fonts: 'modern', title: { color: WHITE, size: 44 }, body: { color: WHITE } }, [
      { layout: 'blank', bg: NIGHT, transition: 'fade', back: [glow(-200, -300, 700, PURP, NIGHT, 45), glow(900, -320, 640, CYAN, NIGHT, 30), ...[[140, 60], [1060, 50]].map(([x, y]) => [shape('rect', x + 43, y + 50, 4, 70, '#3a3158'), shape('rounded', x, y, 90, 54, '#2a2240', { radius: 6 }),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => shape('ellipse', x + 8 + (k % 4) * 20, y + 7 + Math.floor(k / 4) * 22, 15, 15, '#fffbe6', { opacity: 90 }))]).flat()], extra: [
        auto(shape('rounded', 140, 190, 1000, 340, TICKET, { radius: 22, shadow: { x: 0, y: 16, blur: 30, color: '#00000088' } }), 'fade-right', { duration: 700, sound: 'whoosh' }),
        ...[[808, 168], [808, 508]].map(([x, y]) => withAnims(shape('ellipse', x, y, 44, 44, NIGHT), A('fade-right', { start: 'withPrev', duration: 700 }))),
        withAnims(shape('line', 830, 220, 2, 280, 'none', { stroke: '#c9b9a0', strokeWidth: 3, dash: 'dash' }), A('fade-right', { start: 'withPrev', duration: 700 })),
        withAnims(text('ENTRADA · TRIBUNA ESTE · FILA 12 · ASIENTO 7', 190, 225, 600, 34, { fontSize: 17, letterSpacing: 3, color: '#7a6a9a' }), A('fade-right', { start: 'withPrev', duration: 700 })),
        withAnims(text('Llenar el estadio', 186, 270, 620, 100, { fontFamily: H, fontSize: 68, fontWeight: 800, color: INKT }), A('fade-right', { start: 'withPrev', duration: 700 })),
        withAnims(text('Asistencia y taquilla de la UD Robledal · temporada 2025-26', 190, 380, 600, 80, { fontSize: 24, color: '#5b4d78' }), A('fade-right', { start: 'withPrev', duration: 700 })),
        withAnims(shape('rect', 190, 470, 160, 8, PINK), A('fade-right', { start: 'withPrev', duration: 700 })),
        ...Array.from({ length: 22 }, (_, i) => withAnims(shape('rect', 880 + i * 10 + (i % 3) * 2, 240, i % 4 ? 4 : 7, 190, INKT), A('fade-right', { start: 'withPrev', duration: 700 }))),
        withAnims(text('N.º 004127', 860, 446, 260, 34, { fontSize: 18, color: '#7a6a9a', textAlign: 'center', letterSpacing: 3 }), A('fade-right', { start: 'withPrev', duration: 700 }))],
        notes: 'La portada es una entrada hecha con formas (muescas, línea perforada y código de barras) que entra con un silbido bajo los focos del estadio. Club y cifras, inventados.' },
      { layout: 'blank', bg: NIGHT, transition: 'push', extra: [
        text('Así se llena<br>cada grada', 740, 50, 480, 110, { fontFamily: H, fontSize: 42, lineHeight: 1.05, fontWeight: 800, color: WHITE }),
        img(bowl, BX, BY, BW, 480, 'Plano del estadio visto desde arriba con las cuatro gradas coloreadas por ocupación'),
        ...LBL.map(([n, v, x, y], i) => chain(text(`<b>${v} %</b>`, BX + x - 50, BY + y - 18, 100, 36, { fontSize: i < 2 ? 26 : 19, color: INKT, textAlign: 'center' }), i, 'zoom-in', { sound: 'pop', duration: 250 })),
        ...[[MINT, '95 % o más'], [CYAN, '85–94 %'], [PURP, '70–84 %'], [PINK, 'menos de 70 %']].map(([c, t], i) => [shape('rounded', 740, 170 + i * 52, 40, 32, c, { radius: 6 }), text(t, 796, 168 + i * 52, 300, 36, { fontSize: 22, color: WHITE, vAlign: 'middle' })]).flat(),
        click(card(`<b style="color:${PINK}">Fondo sur: 61 %</b><br>Sin cubierta y a pleno sol en los partidos de las 16:00. 4.200 asientos vacíos de media.`, 740, 400, 470, 200, CARD, { fontSize: 22, color: WHITE, radius: 16 }), 'fade-left')],
        notes: 'El plano es un SVG propio con cada grada coloreada según su ocupación media; las cifras aparecen encadenadas con un clic y otro clic trae la explicación.' },
      { layout: 'titleOnly', title: 'Diecinueve partidos en casa', bg: NIGHT, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'area', color: CYAN, seriesName: 'Espectadores', grid: true, yMin: 0, yMax: 28000, xTitle: 'Jornada', yTitle: 'Espectadores', data: D(M, ATT) }),
        ...[['27.900', 'Derbi, domingo a las 18:30', MINT], ['11.200', 'Lunes a las 21:00, con lluvia', PINK], ['21.500', 'Media: 77 % del aforo', YEL]].map(([n, t, c], i) =>
          chain(card(`<b style="font-family:${H};font-size:32px;color:${c}">${n}</b><br>${t}`, 950, 170 + i * 150, 270, 124, CARD, { fontSize: 19, color: WHITE, radius: 14 }), i, 'fade-left'))],
        notes: 'Gráfico de áreas con el eje fijado en el aforo (28.000). Los picos son derbis y fines de semana; los valles, lunes y horarios de televisión.' },
      { layout: 'titleOnly', title: '¿Sube el precio, baja la grada?', bg: NIGHT, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 860, h: 500, chartType: 'scatter', color: MINT, seriesName: 'Fin de semana', grid: true, xTitle: 'Precio medio de la entrada (€)', yTitle: 'Ocupación (%)', xMin: 10, xMax: 50, yMin: 30, yMax: 100,
          data: [[18, 92], [22, 95], [25, 90], [28, 94], [32, 88], [35, 97], [38, 84], [42, 99], [45, 80], [30, 91]].map(([x, y]) => ({ label: String(x), value: y })),
          series: [{ name: 'Entre semana', color: PINK, x: [15, 18, 20, 24, 27, 30, 34, 38, 40], values: [62, 58, 55, 52, 47, 44, 40, 38, 35] }] }),
        click(card('El fin de semana, el precio <b>casi no importa</b>. Entre semana, cada 5 € más cuestan unos 6 puntos de ocupación.', 950, 200, 270, 300, CARD, { fontSize: 21, color: WHITE, radius: 14 }), 'fade-left')],
        notes: 'Dispersión de dos series con escala fija: en verde los partidos de fin de semana; en rosa, los de entre semana. Datos simulados.' },
      { layout: 'titleOnly', title: 'De dónde sale cada euro del día de partido', bg: NIGHT, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 1160, h: 450, chartType: 'treemap', color: PURP,
          data: [{ label: 'Abonos', value: 46, color: PURP }, { label: 'Entradas sueltas', value: 21, color: CYAN }, { label: 'Bar y comida', value: 14, color: PINK }, { label: 'Palcos', value: 9, color: '#f7a072' },
            { label: 'Tienda', value: 6, color: MINT }, { label: 'Aparcamiento', value: 4, color: YEL }] }),
        text('% de los ingresos de taquilla y estadio · 9,8 millones de euros en la temporada', 60, 620, 1160, 34, { fontSize: 20, color: DIM })],
        notes: 'Gráfico de rectángulos: el área es la parte de los ingresos. Los abonos son casi la mitad: fidelizar importa más que vender sueltas.' },
      { layout: 'titleOnly', title: 'La compra por internet, paso a paso', bg: NIGHT, transition: 'fade', extra: [
        chartBlock({ x: 100, y: 150, w: 700, h: 490, chartType: 'funnel', color: PINK,
          data: [{ label: 'Visitan la web', value: 100000 }, { label: 'Eligen asiento', value: 38000 }, { label: 'Llegan al pago', value: 19500 }, { label: 'Compran', value: 14200 }] }),
        click(card(`<div style="font-family:${H};font-size:48px;font-weight:800;color:${YEL}">62 %</div>abandona al elegir asiento: el plano no se ve bien en el móvil.`, 830, 200, 390, 220, CARD, { fontSize: 22, color: WHITE, radius: 14 }), 'fade-left'),
        click(text('Prueba en marzo: plano nuevo para móvil → +9 % de compras.', 830, 460, 390, 90, { fontSize: 22, color: MINT }), 'fade-up')],
        notes: 'Embudo de conversión de la venta en línea en una temporada. El mayor abandono está en el plano de asientos.' },
      { layout: 'titleOnly', title: 'Abonos 2026-27: la cuenta', bg: NIGHT, transition: 'fade', extra: [
        tableBlock({ x: 60, y: 160, w: 860, h: 420, fontSize: 22, header: true, banded: true, headBg: PURP, headFg: WHITE, band: WHITE, bandAlpha: 0.05, stroke: '#3a2a5c', color: WHITE, colW: [2.6, 1.6, 1.6, 2.2],
          rows: [['Grada', 'Precio (€)', 'Abonados', 'Ingresos (€)'], ['Tribuna', '420', '6.100', '=B2*C2'], ['Preferencia', '360', '5.400', '=B3*C3'], ['Fondo norte', '210', '6.800', '=B4*C4'],
            ['Fondo sur (−20 %)', '168', '3.900', '=B5*C5'], ['<b>Total</b>', '', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
        card(`<b style="color:${MINT}">Propuesta:</b> rebajar un 20 % el fondo sur y poner toldos. Si se llenara como el norte, ganaríamos <b>350.000 €</b> más en el bar.`, 950, 200, 270, 330, CARD, { fontSize: 20, color: WHITE, radius: 14 })],
        notes: 'Tabla con fórmulas: ingresos = precio × abonados (=B2*C2) y los totales con =SUMA(ARRIBA). Cambia el precio del fondo sur y mira el total.' },
      { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué te haría venir a más partidos? (varias)', x: 80, y: 60, w: 1120, h: 600,
        options: ['Horarios de fin de semana', 'Entradas más baratas', 'Grada cubierta', 'Mejor comida y bebida', 'Transporte de vuelta'] })],
        notes: 'Votación de respuesta múltiple desde el móvil: las respuestas entrarán en la encuesta oficial a los abonados.' },
      { layout: 'blank', bg: NIGHT, transition: 'zoom', back: [glow(560, -200, 820, PURP, NIGHT, 45)], extra: [
        text('Tu asiento<br>te espera', 80, 170, 600, 220, { fontFamily: H, fontSize: 80, fontWeight: 800, color: WHITE, lineHeight: 1.05 }),
        text('Preguntas: tenemos lo que dura un descanso', 84, 410, 560, 50, { fontSize: 24, color: DIM }),
        timer(900, 84, 480, 140, { style: 'ring', color: YEL }),
        m3d('kh-SheenChair', 680, 120, 520, 480, { autoRotate: true, spin: 20, view: 'three', edge: 'fade' })],
        notes: 'Cierre con una butaca en 3D que gira y una cuenta atrás de quince minutos, lo que dura el descanso de un partido. Modelo de dominio público.' },
    ]));
  } },
};
