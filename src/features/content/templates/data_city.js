// Example presentations: Datos urbanos de ciudades ficticias (tráfico, aire, vivienda, ruido, bicis,
// turismo, arbolado, residuos, agua y presupuestos participativos). Each one: { name, summary, cat: 'data', make() }
// → a deck (see kit.js for the builders). Every city and every figure is made up.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (maps, plans and drawings made for each deck).
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
// The i-th of a chain: the first on a click, the rest right after it.
const chain = (b, i, effect = 'fade-up', props = {}) => withAnims(b, A(effect, { start: i ? 'afterPrev' : 'click', ...props }));
// Points of an arc (for inks and paths).
const arcPts = (cx, cy, r, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });

// ---- Valdeloma (traffic): a night street map on the right half of the slide ----------
const valdelomaMap = (() => {
  let s = '';
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) s += `<rect x="${652 + i * 60}" y="${66 + j * 60}" width="48" height="48" rx="5" fill="#19212c"/>`;
  s += '<path d="M630 520 C 800 470 900 610 1270 540" stroke="#0e2a44" stroke-width="40" fill="none"/>';
  s += '<circle cx="940" cy="360" r="200" stroke="#36404e" stroke-width="10" fill="none"/>';
  s += '<path d="M680 650 L1230 100" stroke="#36404e" stroke-width="12"/><path d="M640 300 L1250 300" stroke="#36404e" stroke-width="8"/>';
  s += '<path d="M1000 60 L1000 680" stroke="#36404e" stroke-width="8"/>';
  s += '<text x="1150" y="600" font-family="sans-serif" font-size="16" fill="#3d6a92" font-style="italic">río Lomo</text>';
  return svgURL(1280, 720, `<defs><radialGradient id="f" cx="0.73" cy="0.5" r="0.45"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b0f14"/></radialGradient></defs>${s}<rect width="1280" height="720" fill="url(#f)"/>`);
})();

// ---- Brisamar (air): the skyline at the bottom of the slide -------------------------
const skyline = color => svgURL(1280, 260, (() => {
  const b = [[0, 120, 90], [80, 70, 60], [130, 150, 110], [230, 90, 70], [290, 180, 80], [360, 110, 120], [470, 60, 70], [530, 140, 90], [610, 200, 60], [660, 100, 110],
    [760, 160, 80], [830, 80, 90], [910, 130, 70], [970, 210, 50], [1010, 120, 100], [1100, 90, 70], [1160, 150, 120]];
  return b.map(([x, h, w]) => `<rect x="${x}" y="${260 - h}" width="${w}" height="${h}" fill="${color}"/>`).join('')
    + `<rect x="625" y="20" width="8" height="40" fill="${color}"/><path d="M990 50 l10 -40 l10 40z" fill="${color}"/>`
    + [[150, 140], [180, 140], [150, 170], [380, 180], [410, 180], [540, 160], [790, 130], [1040, 170], [1070, 170], [1190, 150]].map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="18" fill="#ffffff" opacity="0.12"/>`).join('');
})());
// The air quality index as a half dial with six bands.
const aqiDial = svgURL(600, 330, (() => {
  const cols = ['#50c8a8', '#9fd36a', '#f2d64b', '#f29b38', '#e0533d', '#8e3a7a'], cx = 300, cy = 300, R = 270, r = 170;
  return cols.map((c, i) => { const a0 = Math.PI + i * Math.PI / 6, a1 = a0 + Math.PI / 6, p = (rr, a) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
    return `<path d="M${p(R, a0)} A${R} ${R} 0 0 1 ${p(R, a1)} L${p(r, a1)} A${r} ${r} 0 0 0 ${p(r, a0)}Z" fill="${c}" stroke="#ffffff" stroke-width="4"/>`; }).join('')
    + `<circle cx="${cx}" cy="${cy}" r="18" fill="#22313f"/>`;
})());
const needle = (len, color) => svgURL(400, 400, `<path d="M200 192 L${200 + len} 200 L200 208 Z" fill="${color}"/><circle cx="200" cy="200" r="16" fill="${color}"/><circle cx="200" cy="200" r="6" fill="#ffffff"/>`);

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Traffic in Valdeloma: a night control room — a street map with congestion traced live,
  // a traffic light that lights up the figures, a heat table, Webster's formula and adaptive greens in code.
  data_city_traffic: { name: 'Tráfico en hora punta', cat: 'data', summary: 'Sala de control nocturna: mapa con atascos trazados, semáforo que se enciende, tabla de calor, fórmula de Webster, código y camión 3D', make: () => {
    const BG = '#0b0f14', FG = '#e6edf3', DIM = '#8b949e', RED = '#ff5f56', AMB = '#ffbd2e', GRN = '#3fd16b', CY = '#58a6ff', PANEL = '#151b24';
    const H = pairStacks('tech').heading;
    const map = (props = {}) => img(valdelomaMap, 0, 0, 1280, 720, 'Plano nocturno de Valdeloma con sus avenidas', props);
    // The congestion, traced over the map's roads.
    const jam = [
      [[[690, 640], [860, 470], [1000, 330]], RED], [[[1000, 330], [1110, 220], [1220, 110]], AMB],
      [arcPts(940, 360, 200, 200, 330, 20), AMB], [arcPts(940, 360, 200, -30, 120, 20), GRN], [[[640, 300], [800, 300], [1000, 300]], RED], [[[1000, 300], [1250, 300]], GRN]];
    const light = (y, on, off) => [shape('ellipse', 132, y, 106, 106, off), withAnims(shape('ellipse', 132, y, 106, 106, on, { fill2: on + '88', gradType: 'radial', shadow: { x: 0, y: 0, blur: 30, color: on } }),
      A('fade-in', { duration: 250, sound: 'click' }))];
    const lightRow = (y, n, label, c) => withAnims(text(`<span style="font-family:${H};font-size:66px;font-weight:700;color:${c}">${n}</span>&nbsp;&nbsp;${label}`, 320, y, 880, 110, { fontSize: 28, color: FG, vAlign: 'middle' }),
      A('fade-left', { start: 'withPrev', duration: 450 }));
    const pin = (n, x, y, i) => [withAnims(shape('ellipse', x - 20, y - 20, 40, 40, RED, { stroke: '#ffffff', strokeWidth: 3 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' })),
      withAnims(text(`<b>${n}</b>`, x - 20, y - 14, 40, 30, { fontSize: 20, color: '#ffffff', textAlign: 'center' }), A('zoom-in', { start: 'withPrev', duration: 300 }))];
    const HOURS = Array.from({ length: 24 }, (_, i) => (i % 3 ? '' : String(i)));
    const SPEED = [[31, 12, 22, 19, 14, 27], [30, 11, 21, 18, 13, 26], [30, 12, 21, 18, 13, 26], [29, 11, 20, 17, 12, 24], [31, 14, 21, 16, 11, 21], [34, 28, 19, 23, 20, 18], [36, 33, 25, 26, 22, 27]];
    const heat = v => (v < 15 ? '#8e2a2a' : v < 22 ? '#7a5a12' : '#1f5f2e'), cellBg = {};
    SPEED.forEach((r, i) => r.forEach((v, j) => { cellBg[`${i + 1},${j + 1}`] = heat(v); }));
    return numbered(build({ name: 'Valdeloma · tráfico en hora punta', palette: 'midnight', fonts: 'tech', title: { color: FG, size: 46 }, body: { color: FG },
      decor: () => Array.from({ length: 20 }, (_, i) => shape('rect', 20 + i * 64, 702, 36, 5, AMB, { opacity: 45 })) }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [map()], extra: [
        kicker('CONTROL DE TRÁFICO · INFORME 2026', 80, 180, 560, AMB),
        text('Valdeloma<br>en hora punta', 80, 224, 540, 200, { fontFamily: H, fontSize: 76, fontWeight: 700, color: FG, lineHeight: 1.05 }),
        text('Qué pasa en nuestras calles entre las 7:30 y las 9:30, y qué podemos cambiar', 80, 452, 500, 90, { fontSize: 26, color: DIM }),
        ...jam.map(([pts, c], i) => withAnims(ink(pts, c, 7), A('draw', { start: i ? 'withPrev' : 'afterPrev', delay: i * 350, duration: 1400 })))],
        notes: 'Portada: el plano es un dibujo SVG propio y, al llegar, se trazan solos los atascos (efecto «Dibujar» en trazos de tinta). Rojo: parado; ámbar: lento; verde: fluido.' },
      { layout: 'blank', bg: BG, transition: 'push', extra: [
        shape('rounded', 112, 120, 146, 420, PANEL, { stroke: '#30363d', strokeWidth: 3, radius: 30 }), shape('rect', 175, 540, 20, 120, '#30363d'),
        text('Un trayecto medio en hora punta', 320, 80, 880, 60, { fontFamily: H, fontSize: 40, color: FG, fontWeight: 700 }),
        ...light(140, RED, '#3a1d1d'), lightRow(138, '38 min', 'para recorrer 9 km de casa al trabajo', RED),
        ...light(277, AMB, '#3a311a'), lightRow(275, '+11 min', 'más que en 2019 por el mismo camino', AMB),
        ...light(414, GRN, '#16301c'), lightRow(412, '2 de 3', 'de esos trayectos miden menos de 5 km', GRN),
        text('Datos de ejemplo: encuesta de movilidad y sensores de espira (inventados).', 320, 600, 880, 40, { fontSize: 20, color: DIM })],
        notes: 'Cada clic enciende una luz del semáforo (con sonido de clic) y su cifra entra a la vez. El dato verde abre la puerta a alternativas: muchos trayectos son cortos.' },
      { layout: 'titleOnly', title: 'El día dibuja dos montañas', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 160, w: 800, h: 480, chartType: 'line', color: RED, seriesName: 'Laborable', grid: true, xTitle: 'Hora del día', yTitle: 'Vehículos por hora',
          data: D(HOURS, [600, 400, 300, 300, 400, 900, 2200, 4100, 4900, 3800, 3000, 2800, 3000, 3200, 2900, 2700, 3100, 3800, 4300, 4000, 3000, 2100, 1400, 900]),
          series: [{ name: 'Sábado', values: [900, 700, 500, 400, 400, 500, 800, 1300, 1900, 2500, 3000, 3300, 3400, 3100, 2700, 2600, 2800, 3000, 2900, 2600, 2200, 1900, 1600, 1200], color: CY }] }),
        ...[['8:00', 'Punta de mañana: 4.900 vehículos por hora en la Ronda', RED], ['18:30', 'Punta de tarde, más repartida entre las 17 y las 20 h', AMB], ['Sábado', 'Una sola loma a mediodía, sin picos', CY]].map(([h, d, c], i) =>
          chain(card(`<div style="font-family:${H};font-size:34px;font-weight:700;color:${c}">${h}</div>${d}`, 900, 180 + i * 150, 310, 132, PANEL, { fontSize: 20, color: FG, radius: 12, pad: [12, 18, 12, 18], borderColor: '#30363d' }), i, 'fade-left'))],
        notes: 'Gráfico de líneas de dos series con los vehículos por hora en la Ronda (datos inventados). Las tres notas entran seguidas con un solo clic.' },
      { layout: 'titleOnly', title: 'Velocidad media en el centro', bg: BG, transition: 'fade', extra: [
        tableBlock({ x: 70, y: 165, w: 840, h: 470, fontSize: 22, header: true, headBg: '#1f2633', headFg: AMB, stroke: BG, cellBg,
          rows: [['', '6–8 h', '8–10 h', '10–14 h', '14–17 h', '17–20 h', '20–24 h'], ...['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((d, i) => [d, ...SPEED[i].map(String)])], colW: [2.6, 2, 2, 2.3, 2.3, 2.3, 2.3] }),
        ...[[RED, '#8e2a2a', 'Menos de 15 km/h', 'atasco'], [AMB, '#7a5a12', 'De 15 a 22 km/h', 'lento'], [GRN, '#1f5f2e', 'Más de 22 km/h', 'fluido']].map(([c, f, l, w], i) => [
          shape('rounded', 950, 200 + i * 90, 56, 56, f, { stroke: c, strokeWidth: 3, radius: 10 }),
          text(`<b style="color:${c}">${w}</b><br>${l}`, 1024, 196 + i * 90, 210, 70, { fontSize: 20, color: FG })]).flat(),
        text('Los martes y jueves de 8 a 10, el centro va más despacio que una bicicleta.', 950, 480, 270, 150, { fontSize: 22, color: DIM })],
        notes: 'Una tabla de calor: cada celda lleva su color de fondo según la velocidad. Datos inventados de las espiras del centro.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [map({ opacity: 90 })], extra: [
        text('Cinco cruces,<br>la mitad del atasco', 70, 60, 540, 140, { fontFamily: H, fontSize: 52, fontWeight: 700, color: FG, lineHeight: 1.1 }),
        chartBlock({ x: 110, y: 220, w: 520, h: 410, chartType: 'hbar', color: RED, dataLabels: true, xTitle: 'Minutos de retraso en hora punta',
          data: D(['1. Glorieta del Puerto', '2. Ronda y la Loma', '3. Puente Viejo', '4. Plaza del Mercado', '5. Cuesta San Blas'], [14, 11, 9, 7, 6]) }),
        ...[[1, 814, 516], [2, 1096, 234], [3, 1000, 556], [4, 1000, 300], [5, 749, 300]].map(([n, x, y], i) => pin(n, x, y, i)).flat()],
        notes: 'Cada clic encadena los cinco puntos negros sobre el plano, con un «pop». El gráfico de barras horizontales ordena los cruces por minutos perdidos (inventados).' },
      { layout: 'titleOnly', title: 'Quién ocupa la calzada a las 8:30', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 60, y: 160, w: 540, h: 480, chartType: 'doughnut',
          data: [{ label: 'Coche particular', value: 61, color: CY }, { label: 'Reparto y carga', value: 23, color: AMB }, { label: 'Taxi y VTC', value: 7, color: '#bb9af7' }, { label: 'Autobús', value: 6, color: GRN }, { label: 'Moto', value: 3, color: RED }] }),
        m3d('kh-CesiumMilkTruck', 640, 150, 580, 330, { autoRotate: false, view: 'three', motion: 'swing', edge: 'fade' }),
        card(`<b style="color:${AMB}">Una de cada cuatro</b> plazas de la calzada es una furgoneta de reparto. En doble fila, resta un carril entero en 9 de cada 10 calles del centro.`,
          650, 490, 560, 150, PANEL, { fontSize: 23, color: FG, radius: 12, borderColor: '#30363d' })],
        notes: 'Anillo con un color propio por porción y la leyenda con porcentajes. El camión 3D se balancea al llegar (Modelo 3D ▸ Al entrar ▸ Balanceo).' },
      { layout: 'titleOnly', title: 'Semáforos que aprenden', bg: BG, transition: 'fade', extra: [
        text('Ciclo óptimo de Webster', 70, 165, 540, 40, { fontSize: 22, color: AMB, letterSpacing: 2 }),
        mathBlock({ x: 70, y: 210, w: 540, h: 140, fontSize: 52, color: FG, latex: 'C_0 = \\dfrac{1{,}5\\,L + 5}{1 - Y}' }),
        text('<b>L</b>: segundos perdidos en cada ciclo<br><b>Y</b>: suma de la ocupación de cada fase', 70, 370, 540, 90, { fontSize: 22, color: DIM }),
        card(`Con L = 12 s e Y = 0,75 → <b style="color:${GRN}">C₀ = 92 s</b>`, 70, 490, 540, 80, PANEL, { fontSize: 26, color: FG, radius: 12, vAlign: 'middle', borderColor: '#30363d' }),
        codeBlock({ x: 650, y: 165, w: 570, h: 340, fontSize: 18, lang: 'python', lineSteps: '2|3-4|5-6|7',
          code: '# reparte el verde de un ciclo\ndef repartir(fases, ciclo, perdido):\n    Y = sum(f.ocupa for f in fases)\n    util = ciclo - perdido\n    for f in fases:\n        f.verde = round(util * f.ocupa / Y)\n    return fases' }),
        text('Cada 5 minutos, con los datos de las espiras, el verde se reparte según la cola de cada calle.', 650, 525, 570, 90, { fontSize: 22, color: DIM })],
        notes: 'La fórmula de Webster calcula el ciclo; el código, paso a paso (resaltado por líneas con cada clic), reparte el verde en proporción a la ocupación de cada fase.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ fontSize: 32, question: '¿Qué medida probarías primero en Valdeloma?', x: 80, y: 60, w: 1120, h: 600,
        options: ['Ola verde en la Loma', 'Carril bus en la Ronda', 'Reparto antes de las 10', 'Zona 30 en el centro'] })],
        notes: 'Votación en directo: el público vota desde el móvil con el código QR. Comenta el resultado con los datos de los cinco cruces.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(700, 120, 520, '#3a2a0a', BG, 70)], extra: [
        text('¿Preguntas?', 80, 200, 600, 110, { fontFamily: H, fontSize: 90, fontWeight: 700, color: FG }),
        text('El turno dura lo que un semáforo largo', 84, 320, 560, 50, { fontSize: 26, color: DIM }),
        timer(300, 84, 400, 420, { style: 'digital', color: AMB, w: 420, h: 130 }),
        m3d('kh-ToyCar', 720, 140, 480, 440, { autoRotate: true, spin: 20, view: 'three', edge: 'fade' }),
        credits(['kh-CesiumMilkTruck'], 80, 650, 1100, '#5b6470')],
        notes: 'Cuenta atrás digital de cinco minutos para las preguntas (empieza sola). El coche de juguete gira en 3D. Próxima revisión de los datos: enero de 2027.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Air quality in Brisamar: a hazy sky that clears up with Transform, a half-dial index with a swinging
  // needle, the interpolation formula, lines with gaps, radar by station and a table with formulas.
  data_city_air: { name: 'Calidad del aire en Brisamar', cat: 'data', summary: 'Cielo que se despeja con Transformar, índice con aguja, ecuación, líneas con huecos, radar, tabla con fórmulas y valoración', make: () => {
    const INK = '#22313f', DIM = '#5b6b78', SMOG1 = '#b8a586', SMOG2 = '#e9e1cf', SKY1 = '#5fb0e5', SKY2 = '#e3f3fc', PAPER = '#f6f9fb';
    const C1 = '#e0533d', C2 = '#2b7bb9', C3 = '#3aa17e', SKY = uid(), SUN = uid(), CITY = uid();
    const sky = (c1, c2) => ({ ...shape('rect', 0, 0, 1280, 720, c1, { fill2: c2, gradAngle: 90 }), id: SKY });
    const sun = (x, y, d, c, op) => ({ ...shape('ellipse', x, y, d, d, c, { opacity: op }), id: SUN });
    const city = c => ({ ...img(skyline(c), 0, 460, 1280, 260, 'Silueta de los edificios de Brisamar'), id: CITY });
    const smog = [[120, 70], [300, 456], [520, 80], [760, 400], [880, 60], [1040, 220], [1180, 120], [420, 40], [640, 450], [980, 360], [40, 440], [1120, 330], [800, 300], [40, 260]]
      .map(([x, y], i) => shape('ellipse', x, y, 10 + (i % 4) * 6, 10 + (i % 4) * 6, '#6e5d45', { opacity: 25 + (i % 3) * 10 }));
    const BANDS = [['#50c8a8', 'Buena', '0–50'], ['#9fd36a', 'Razonable', '51–100'], ['#f2d64b', 'Regular', '101–150'], ['#f29b38', 'Desfavorable', '151–200'], ['#e0533d', 'Muy desfavorable', '201–250'], ['#8e3a7a', 'Extremo', '251–300']];
    const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return numbered(build({ name: 'Brisamar · calidad del aire', palette: 'grayscale', fonts: 'clean', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: SMOG2, transition: 'fade', transitionSpeed: 'slow', back: [sky(SMOG1, SMOG2), sun(860, 70, 200, '#f4e7c4', 70), city('#4a4136'), ...smog], extra: [
        kicker('OBSERVATORIO DEL AIRE · BRISAMAR 2026', 90, 120, 700, '#5a4a36'),
        text('¿Qué respiramos<br>en Brisamar?', 90, 160, 900, 220, { fontSize: 88, fontWeight: 800, color: '#2e271f', lineHeight: 1.05, letterSpacing: -1 }),
        text('Siete años de medidas en doce estaciones', 94, 390, 800, 50, { fontSize: 30, color: '#4f4436' })],
        notes: 'Portada con un cielo turbio: un rectángulo con degradado, partículas (elipses semitransparentes) y la silueta de la ciudad, un dibujo SVG propio.' },
      { layout: 'blank', bg: SKY2, autoAnimate: true, transition: 'fade', back: [sky(SKY1, SKY2), sun(940, 50, 240, '#ffd75e', 100), city('#24445e')], extra: [
        text('<span style="text-shadow:0 4px 24px #1d5a8a66">−34 %</span>', 90, 90, 700, 180, { fontSize: 160, fontWeight: 800, color: '#ffffff' }),
        text('de dióxido de nitrógeno (NO₂) en el centro entre 2019 y 2026', 96, 280, 640, 90, { fontSize: 32, color: INK }),
        chain(card('Media anual: <b>41 µg/m³</b> → <b>27 µg/m³</b>', 96, 390, 520, 64, '#ffffffcc', { fontSize: 24, color: INK, radius: 32, pad: [14, 26, 14, 26] }), 0, 'fade-up')],
        notes: 'Transformar: el mismo cielo, el mismo sol y la misma silueta (mismo id) cambian de color, de tamaño y de brillo. Las partículas, que no están aquí, se desvanecen solas.' },
      { layout: 'titleOnly', title: 'Un índice, seis colores', bg: PAPER, transition: 'slide', extra: [
        img(aqiDial, 90, 190, 600, 330, 'Semicírculo del índice con seis tramos de color'),
        { ...img(needle(215, INK), 190, 290, 400, 400, 'Aguja del índice'), rotation: 217, animation: A('spin', { start: 'afterPrev', duration: 1400, delay: 300 }) },
        text('Hoy, 11:00 · Estación Centro<br><b style="font-size:34px">62 · Razonable</b>', 90, 540, 600, 100, { fontSize: 22, color: DIM, textAlign: 'center' }),
        ...BANDS.map(([c, n, r], i) => [shape('rounded', 760, 182 + i * 76, 52, 52, c, { radius: 12 }),
          text(`<b>${n}</b><br><span style="color:${DIM}">Índice ${r}</span>`, 830, 176 + i * 76, 380, 66, { fontSize: 21, color: INK })]).flat()],
        notes: 'El semicírculo es un dibujo SVG; la aguja es otra imagen girada que entra con el efecto «Girar» al llegar a la diapositiva.' },
      { layout: 'titleOnly', title: 'Del sensor al índice', bg: PAPER, transition: 'fade', extra: [
        mathBlock({ x: 90, y: 170, w: 1100, h: 150, fontSize: 50, color: INK, latex: 'I = \\dfrac{I_{alto} - I_{bajo}}{C_{alto} - C_{bajo}}\\,\\left(C - C_{bajo}\\right) + I_{bajo}' }),
        text('C es la concentración medida y [C<sub>bajo</sub>, C<sub>alto</sub>] el tramo en el que cae; el índice se reparte en línea recta dentro de ese tramo.', 140, 330, 1000, 70, { fontSize: 22, color: DIM, textAlign: 'center' }),
        ...[['Parque Alto', '18 µg/m³', '23', BANDS[0][0]], ['Centro', '52 µg/m³', '62', BANDS[1][0]], ['Puerto', '98 µg/m³', '113', BANDS[2][0]]].map(([s, c, v, col], i) =>
          chain(card(`<div style="color:${DIM}">${s} · NO₂ ${c}</div><div style="font-size:64px;font-weight:800;line-height:1.1">${v}</div>`, 90 + i * 375, 440, 350, 180, '#ffffff',
            { fontSize: 22, color: INK, textAlign: 'center', borderColor: col, radius: 16, shadow: { x: 0, y: 6, blur: 18, color: '#0000001a' } }), i, 'fade-up'))],
        notes: 'Ecuación del índice (interpolación lineal por tramos) y tres ejemplos que entran seguidos con un clic. Tramos y valores inventados para el ejemplo.' },
      { layout: 'titleOnly', title: 'NO₂ mes a mes, por estación', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 160, w: 820, h: 480, chartType: 'line', color: C1, seriesName: 'Puerto', grid: true, yTitle: 'µg/m³ (media mensual)',
          data: D(M, [52, 49, 47, 44, 41, 43, null, null, 46, 50, 53, 55]),
          series: [{ name: 'Centro', values: [38, 36, 33, 29, 26, 24, 22, 21, 27, 33, 37, 40], color: C2 }, { name: 'Parque Alto', values: [19, 17, 15, 13, 11, 10, 9, 9, 12, 15, 18, 20], color: C3 }] }),
        card('<b>El hueco del verano</b><br>El sensor del Puerto estuvo en revisión en julio y agosto: la línea se corta, no se inventa.', 920, 190, 290, 210, '#ffffff', { fontSize: 21, color: INK, borderColor: C1, radius: 14 }),
        card('<b>Invierno, peor</b><br>Más calefacciones y menos viento que limpie el aire.', 920, 430, 290, 170, '#ffffff', { fontSize: 21, color: INK, borderColor: C2, radius: 14 })],
        notes: 'Gráfico de líneas de tres series con huecos (valores vacíos) donde faltan medidas. Datos inventados.' },
      { layout: 'titleOnly', title: 'Cada estación, su huella', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 150, w: 560, h: 510, chartType: 'radar', color: C1, seriesName: 'Puerto', data: D(['NO₂', 'PM10', 'PM2,5', 'Ozono', 'SO₂'], [92, 70, 66, 35, 48]),
          series: [{ name: 'Centro', values: [68, 55, 60, 40, 12], color: C2 }, { name: 'Parque Alto', values: [25, 38, 42, 78, 8], color: C3 }] }),
        ...[[C1, 'Puerto', 'Barcos atracados y camiones: el único con azufre (SO₂) alto.'], [C2, 'Centro', 'El tráfico manda: NO₂ y partículas finas en hora punta.'], [C3, 'Parque Alto', 'Poco tráfico, pero más ozono: se forma con sol, lejos de los tubos de escape.']].map(([c, n, d], i) =>
          chain(text(`<b style="color:${c};font-size:28px">${n}</b><br>${d}`, 680, 190 + i * 150, 520, 130, { fontSize: 22, color: INK, borderColor: c, pad: [12, 18, 12, 18], radius: 12 }), i, 'fade-left'))],
        notes: 'Radar de tres series: cada eje es un contaminante en % del valor límite (inventado). Las explicaciones entran seguidas.' },
      { layout: 'titleOnly', title: 'Días con aire regular o peor, por barrio', bg: PAPER, transition: 'fade', extra: [
        tableBlock({ x: 90, y: 170, w: 1100, h: 420, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d5dde4', banded: true, band: C2,
          rows: [['Barrio', 'Días buenos o razonables', 'Días regulares o peores', '% de días malos'],
            ['Puerto', '301', '64', '=REDONDEAR(C2/(B2+C2)*100;1)'], ['Centro', '329', '36', '=REDONDEAR(C3/(B3+C3)*100;1)'], ['Ensanche', '341', '24', '=REDONDEAR(C4/(B4+C4)*100;1)'],
            ['Las Dunas', '352', '13', '=REDONDEAR(C5/(B5+C5)*100;1)'], ['Parque Alto', '358', '7', '=REDONDEAR(C6/(B6+C6)*100;1)'], ['<b>Toda la ciudad</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=REDONDEAR(C7/(B7+C7)*100;1)']], colW: [3, 3, 3, 2.4] }),
        text('La última columna y los totales son fórmulas: cambia los días y se recalcula sola.', 90, 610, 1100, 40, { fontSize: 20, color: DIM })],
        notes: 'Tabla con fórmulas (=C2/(B2+C2)*100 y =SUMA(ARRIBA)). Datos de 2025, inventados.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [pollBlock({ kind: 'rating', fontSize: 34, question: '¿Cómo valoras el aire de tu barrio?', x: 90, y: 70, w: 1100, h: 580 })],
        notes: 'Valoración de 1 (muy malo) a 5 (muy bueno) desde el móvil: compara la media con el mapa de días malos.' },
      { layout: 'blank', bg: SKY2, autoAnimate: true, transition: 'fade', back: [sky(SKY1, SKY2), sun(80, 60, 180, '#ffd75e', 100), city('#24445e')], extra: [
        text('<span style="text-shadow:0 3px 18px #1d5a8a66">Respirar mejor<br>es un dato que se cambia</span>', 300, 70, 900, 200, { fontSize: 60, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }),
        ...['Zona de bajas emisiones hasta el Puerto (2027)', 'Enchufes en los muelles: barcos con el motor apagado', '30.000 árboles más en cuatro años'].map((t, i) =>
          chain(card(t, 300, 290 + i * 76, 760, 60, '#ffffffd9', { fontSize: 24, color: INK, radius: 30, pad: [12, 26, 12, 26] }), i, 'fade-up', { duration: 450 }))],
        notes: 'Cierre con Transformar: el sol se va a la otra esquina. Tres medidas que entran seguidas con un clic.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Housing in Puerto Albar: an architect's blueprint — a floor plan drawn in SVG, squares to scale,
  // a combined chart, the effort rate as an equation, a table with formulas, a scatter, a 3D sofa and a timeline.
  data_city_housing: { name: 'Vivienda: el precio de quedarse', cat: 'data', summary: 'Plano de arquitecto: planta en SVG, superficies a escala, combinado, ecuación, tabla con fórmulas, dispersión y sofá 3D', make: () => {
    const BP = '#0f3b63', DEEP = '#0b2d4d', LN = '#e8f3ff', DIM = '#9fc0de', YEL = '#ffd166', COR = '#ff8a65', MINT = '#7be0c3';
    const S = pairStacks('websafe'), H = S.heading;
    const grid = svgURL(1280, 720, Array.from({ length: 33 }, (_, i) => `<path d="M${i * 40} 0V720" stroke="#ffffff" stroke-opacity="${i % 5 ? 0.06 : 0.13}"/>`).join('')
      + Array.from({ length: 19 }, (_, i) => `<path d="M0 ${i * 40}H1280" stroke="#ffffff" stroke-opacity="${i % 5 ? 0.06 : 0.13}"/>`).join(''));
    const T = (x, y, sz, str, extra = '') => `<text x="${x}" y="${y}" font-family="Verdana,sans-serif" font-size="${sz}" fill="${LN}" text-anchor="middle"${extra}>${str}</text>`;
    const plan = svgURL(560, 480, `<g fill="none" stroke="${LN}" stroke-linecap="square">`
      + '<rect x="50" y="40" width="480" height="384" stroke-width="8"/><path d="M338 40V150M338 200V320M338 370V424M338 282H530" stroke-width="4"/>'
      + `<path d="M120 40H260" stroke="${BP}" stroke-width="10"/><path d="M120 36H260M120 44H260" stroke-width="2"/>`
      + `<path d="M440 424H500" stroke="${BP}" stroke-width="10"/><path d="M440 420H500M440 428H500" stroke-width="2"/>`
      + `<path d="M150 424H210" stroke="${BP}" stroke-width="10"/><path d="M150 424A60 60 0 0 1 210 364" stroke-width="1.5" stroke-dasharray="4 4"/>`
      + '<path d="M338 150A50 50 0 0 1 388 200" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M338 320A50 50 0 0 0 388 370" stroke-width="1.5" stroke-dasharray="4 4"/>'
      + '<rect x="60" y="50" width="200" height="40" stroke-width="2"/><circle cx="100" cy="70" r="10" stroke-width="1.5"/><circle cx="135" cy="70" r="10" stroke-width="1.5"/>'
      + '<rect x="70" y="250" width="56" height="140" rx="6" stroke-width="2"/><rect x="170" y="290" width="90" height="60" rx="4" stroke-width="1.5"/>'
      + '<rect x="390" y="70" width="120" height="150" rx="4" stroke-width="2"/><rect x="400" y="78" width="45" height="26" rx="4" stroke-width="1.5"/><rect x="455" y="78" width="45" height="26" rx="4" stroke-width="1.5"/>'
      + '<rect x="470" y="300" width="50" height="50" stroke-width="1.5"/><path d="M470 300L520 350M520 300L470 350" stroke-width="1"/><ellipse cx="420" cy="398" rx="14" ry="18" stroke-width="1.5"/>'
      + '<path d="M50 456H530M50 448V464M530 448V464M28 40V424M20 40H36M20 424H36" stroke-width="1.5"/></g>'
      + T(290, 474, 15, '7,50 m') + T(16, 232, 15, '6,00 m', ' transform="rotate(-90 16 232)"')
      + T(196, 200, 17, 'Salón-cocina') + T(196, 222, 14, '27,0 m²', ` fill-opacity="0.7"`) + T(434, 250, 16, 'Dormitorio') + T(434, 270, 13, '11,4 m²', ` fill-opacity="0.7"`)
      + T(400, 320, 15, 'Baño') + T(400, 338, 13, '6,6 m²', ` fill-opacity="0.7"`));
    const back = [img(grid, 0, 0, 1280, 720, 'Cuadrícula de plano')];
    const sq = (x, y, side, c, label, m2) => [
      withAnims(shape('rect', x, y, side, side, c, { opacity: 22, stroke: c, strokeWidth: 3 }), A('zoom-in', { duration: 500, start: 'afterPrev' })),
      text(`<b>${m2}</b>`, x, y + side / 2 - 26, side, 52, { fontSize: 36, color: LN, textAlign: 'center', fontFamily: H }),
      text(label, x - 40, y + side + 14, side + 80, 40, { fontSize: 20, color: DIM, textAlign: 'center' })];
    const YEARS = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
    const DIST = [[2, 18.4], [4, 17.6], [5, 18.9], [7, 17.1], [9, 16.8], [11, 16.2], [12, 17.0], [15, 15.1], [18, 14.9], [21, 15.4], [24, 13.8], [27, 13.1], [30, 14.0], [34, 12.3], [38, 12.6], [42, 11.4]];
    return numbered(build({ name: 'Puerto Albar · vivienda', palette: 'ocean', fonts: 'websafe', title: { color: LN, size: 44, font: H }, body: { color: LN },
      decor: () => [shape('rect', 1040, 668, 200, 30, 'none', { stroke: '#ffffff40', strokeWidth: 1 }), text('PUERTO ALBAR · VIVIENDA', 1040, 674, 200, 20, { fontSize: 11, color: '#ffffff80', textAlign: 'center', letterSpacing: 2 })] }, [
      { layout: 'blank', bg: BP, transition: 'fade', back, extra: [
        kicker('OBSERVATORIO DE VIVIENDA · HOJA 01', 80, 160, 560, YEL),
        text('Puerto Albar:<br>el precio<br>de quedarse', 80, 200, 540, 280, { fontFamily: H, fontSize: 70, color: '#ffffff', lineHeight: 1.1 }),
        text('Diez años de alquileres, sueldos y barrios, en diez láminas', 84, 500, 520, 80, { fontSize: 22, color: DIM }),
        withAnims(img(plan, 650, 100, 560, 480, 'Planta de un piso de 45 m² con salón-cocina, dormitorio y baño'), A('fade-in', { start: 'afterPrev', duration: 1200 })),
        text(`45 m² · <b style="color:${YEL}">1.080 €/mes</b>`, 650, 590, 560, 40, { fontSize: 24, color: LN, textAlign: 'center' })],
        notes: 'Portada en estilo plano: la cuadrícula y la planta del piso son dibujos SVG propios. La planta aparece sola al llegar. Es el piso tipo de La Marina (precio inventado).' },
      { layout: 'titleOnly', title: 'Lo que alquilan 1.000 € al mes', bg: BP, transition: 'push', back, extra: [
        ...sq(170, 200, 300, MINT, '2016 · a 7,2 €/m²', '139 m²'),
        ...sq(790, 288, 212, COR, '2026 · a 14,1 €/m²', '71 m²'),
        withAnims(shape('ellipse', 560, 300, 150, 150, YEL), A('zoom-in', { start: 'afterPrev', duration: 400, sound: 'pop' })),
        withAnims(text('<b>+96 %</b>', 560, 350, 150, 50, { fontSize: 34, color: DEEP, textAlign: 'center', fontFamily: H }), A('zoom-in', { start: 'withPrev', duration: 400 })),
        text('Dibujado a escala: el lado del cuadrado crece con la raíz de la superficie.', 90, 620, 1100, 36, { fontSize: 18, color: DIM, textAlign: 'center' })],
        notes: 'Los dos cuadrados están a escala: con el mismo dinero, hoy se alquila la mitad de superficie. Las piezas entran solas una tras otra. Precios inventados.' },
      { layout: 'titleOnly', title: 'El alquiler corre, el sueldo camina', bg: BP, transition: 'fade', back, extra: [
        chartBlock({ x: 80, y: 160, w: 1120, h: 470, chartType: 'bar', combo: true, color: COR, seriesName: 'Alquiler (índice)', grid: true, yTitle: 'Índice, 2016 = 100',
          data: D(YEARS, [100, 106, 113, 121, 124, 122, 131, 145, 160, 178, 196]), series: [{ name: 'Salario medio (índice)', values: [100, 101, 103, 105, 106, 104, 109, 113, 117, 120, 123], color: MINT }] })],
        notes: 'Gráfico combinado: columnas para el alquiler y una línea para el salario, los dos con 2016 como base 100 (datos inventados). En diez años, el alquiler casi se duplica y el salario sube un 23 %.' },
      { layout: 'titleOnly', title: 'La tasa de esfuerzo', bg: BP, transition: 'fade', back, extra: [
        mathBlock({ x: 80, y: 170, w: 620, h: 150, fontSize: 40, color: LN, latex: 'E = \\dfrac{\\text{alquiler}}{\\text{ingresos netos}} \\times 100' }),
        text(`Por encima del <b style="color:${YEL}">30 %</b>, un hogar vive en sobreesfuerzo: lo que queda no llega para el resto de gastos.`, 740, 180, 460, 150, { fontSize: 24, color: LN }),
        text('Hogar tipo de La Marina: 1.080 € de alquiler y 2.350 € de ingresos netos', 80, 380, 1120, 40, { fontSize: 22, color: DIM }),
        shape('rounded', 80, 440, 1120, 56, DEEP, { stroke: '#ffffff40', strokeWidth: 1, radius: 28 }),
        withAnims(shape('rounded', 80, 440, 515, 56, COR, { radius: 28 }), A('fade-right', { duration: 1200 })),
        shape('rect', 414, 424, 3, 88, YEL), text('30 %', 380, 516, 70, 34, { fontSize: 20, color: YEL, textAlign: 'center' }),
        withAnims(text(`<b>E = 46 %</b>`, 610, 444, 300, 50, { fontSize: 30, color: '#ffffff', fontFamily: H }), A('fade-in', { start: 'afterPrev' }))],
        notes: 'Ecuación de la tasa de esfuerzo y una barra hecha con formas: se rellena con un clic hasta el 46 %, muy por encima de la marca del 30 %.' },
      { layout: 'titleOnly', title: 'Barrio a barrio', bg: BP, transition: 'fade', back, extra: [
        tableBlock({ x: 80, y: 165, w: 1120, h: 430, fontSize: 24, header: true, headBg: '#ffffff', headFg: DEEP, stroke: '#ffffff40', banded: true, band: '#7fb8e6',
          rows: [['Barrio', 'Alquiler medio (€)', 'Ingresos del hogar (€)', 'Esfuerzo (%)'],
            ['Casco Viejo', '1.240', '2.300', '=REDONDEAR(B2/C2*100;1)'], ['La Marina', '1.080', '2.350', '=REDONDEAR(B3/C3*100;1)'], ['Ensanche', '1.150', '2.900', '=REDONDEAR(B4/C4*100;1)'],
            ['San Telmo', '820', '2.050', '=REDONDEAR(B5/C5*100;1)'], ['Los Pinares', '690', '2.400', '=REDONDEAR(B6/C6*100;1)'], ['<b>Media</b>', '=PROMEDIO(B2:B6)', '=PROMEDIO(C2:C6)', '=REDONDEAR(B7/C7*100;1)']], colW: [3, 3, 3, 2.4] }),
        text('Tabla con fórmulas: =REDONDEAR(B2/C2*100;1) en cada barrio y =PROMEDIO(B2:B6) en la media.', 80, 612, 1120, 36, { fontSize: 18, color: DIM })],
        notes: 'El esfuerzo se calcula en la propia tabla: cambia un alquiler o un ingreso y se recalcula. Datos inventados del padrón y del registro de fianzas.' },
      { layout: 'titleOnly', title: 'Cuanto más lejos, más barato (un poco)', bg: BP, transition: 'fade', back, extra: [
        chartBlock({ x: 80, y: 160, w: 720, h: 480, chartType: 'scatter', color: YEL, grid: true, xTitle: 'Minutos en transporte público hasta el centro', yTitle: '€/m² al mes',
          data: DIST.map(([t, p]) => ({ label: String(t), value: p })) }),
        text('Recta ajustada', 840, 190, 360, 34, { fontSize: 20, color: DIM, letterSpacing: 2 }),
        mathBlock({ x: 840, y: 230, w: 360, h: 80, fontSize: 36, color: LN, latex: 'p = 18{,}5 - 0{,}17\\,t' }),
        card(`Cada 10 minutos más de viaje, el metro cuadrado baja <b style="color:${YEL}">1,7 €</b>. Alejarse ahorra poco y cuesta mucho tiempo.`, 840, 350, 360, 220, DEEP, { fontSize: 22, color: LN, radius: 12, borderColor: '#ffffff40' })],
        notes: 'Diagrama de dispersión de 16 anuncios (inventados) y la recta de regresión como ecuación.' },
      { layout: 'blank', bg: BP, transition: 'zoom', back, extra: [
        shape('rect', 80, 130, 560, 440, 'none', { stroke: LN, strokeWidth: 2, dash: 'dash' }),
        text('Salón compartido · 4,0 × 3,2 m', 80, 584, 560, 34, { fontSize: 18, color: DIM, textAlign: 'center' }),
        m3d('kh-GlamVelvetSofa', 110, 150, 500, 400, { autoRotate: true, spin: 16, view: 'three', edge: 'fade' }),
        text('El salón compartido', 700, 120, 520, 70, { fontFamily: H, fontSize: 46, color: '#ffffff' }),
        ...[['31,8 años', 'edad media a la que se deja la casa familiar'], ['41 %', 'de 25 a 34 años comparte piso'], ['3 de cada 10', 'se plantea irse de la ciudad']].map(([n, d], i) =>
          chain(text(`<div style="font-family:${H};font-size:52px;color:${[YEL, COR, MINT][i]};line-height:1.1">${n}</div>${d}`, 700, 210 + i * 140, 520, 130, { fontSize: 22, color: LN }), i, 'fade-left'))],
        notes: 'El sofá 3D gira despacio dentro de un rectángulo discontinuo que hace de habitación. Las tres cifras (inventadas) entran seguidas.' },
      { layout: 'titleOnly', title: 'El plan, sobre el calendario', bg: BP, transition: 'fade', back, extra: [
        dg('timeline', '2025\n  Censo de viviendas vacías\n2026\n  Bolsa pública de alquiler\n2027\n  600 viviendas en la antigua estación\n2029\n  Alquiler un 25 % más bajo', 110, 170, 1060, 420, { colors: 'light', oneByOne: true })],
        notes: 'Línea de tiempo como diagrama, uno a uno: cada clic añade un hito del plan municipal de vivienda (inventado).' },
      { layout: 'blank', bg: BP, transition: 'fade', back, extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué dos medidas priorizarías en Puerto Albar?', x: 80, y: 50, w: 1120, h: 600,
        options: ['Más vivienda pública', 'Menos pisos turísticos', 'Ayuda a jóvenes', 'Recargo a pisos vacíos', 'Más transporte público'] })],
        notes: 'Votación de opción múltiple: cada persona marca dos medidas desde el móvil. Cierra con el resultado y los créditos del sofá 3D.' },
      { layout: 'blank', bg: BP, transition: 'fade', back, extra: [
        text('Quedarse también<br>es un derecho', 80, 200, 1120, 220, { fontFamily: H, fontSize: 80, color: '#ffffff', textAlign: 'center', lineHeight: 1.15 }),
        text('Datos abiertos del observatorio: vivienda.puertoalbar.example', 80, 450, 1120, 40, { fontSize: 24, color: YEL, textAlign: 'center' }),
        credits(['kh-GlamVelvetSofa'], 80, 620, 940, DIM)],
        notes: 'Cierre: la frase resume la tesis. Recuerda que todos los datos son de ejemplo.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Noise in Sotoverde: a sound-wave nightclub look — an equalizer that rises by itself, a decibel ruler
  // that sounds, the log equation, a noise map with glowing bands, stacked complaints, a quiz and a listening minute.
  data_city_noise: { name: 'El ruido de Sotoverde', cat: 'data', summary: 'Onda que se alza sola, regla de decibelios con sonidos, ecuación, mapa de ruido, barras apiladas, concurso y cuenta atrás', make: () => {
    const BG = '#12081d', FG = '#f3eefe', DIM = '#a99bc4', MAG = '#ff3ea5', CY = '#3ee8ff', YEL = '#fee440', ORA = '#ff8a3d', PAN = '#1f1230';
    const H = pairStacks('bold').heading, DBU = `<span style="font-family:${pairStacks('bold').body};font-size:30px">dB</span>`;
    const mix = (a, b, t) => '#' + [0, 2, 4].map(k => Math.round(parseInt(a.slice(1 + k, 3 + k), 16) * (1 - t) + parseInt(b.slice(1 + k, 3 + k), 16) * t).toString(16).padStart(2, '0')).join('');
    const wave = Array.from({ length: 40 }, (_, i) => { const h = Math.round(24 + 190 * Math.abs(Math.sin(i * 0.47) * Math.cos(i * 0.11 + 0.6)) + (i % 3) * 8);
      return withAnims(shape('rounded', 92 + i * 27.6, 560 - h / 2, 18, h, mix(CY, MAG, i / 39), { radius: 9 }), A('grow', { start: i ? 'withPrev' : 'afterPrev', delay: i * 35, duration: 380 })); });
    const yDb = db => Math.round(620 - (db - 30) * 480 / 90);
    const LEVELS = [[30, 'Biblioteca'], [45, 'Calle tranquila de noche'], [60, 'Conversación normal'], [75, 'Avenida con tráfico'], [90, 'Moto acelerando'], [100, 'Martillo neumático'], [110, 'Concierto, primera fila']];
    const noiseMap = svgURL(1280, 720, '<defs><filter id="b" filterUnits="userSpaceOnUse" x="0" y="0" width="1280" height="720"><feGaussianBlur stdDeviation="14"/></filter></defs>'
      + Array.from({ length: 12 }, (_, i) => Array.from({ length: 10 }, (_, j) => `<rect x="${530 + i * 60}" y="${50 + j * 62}" width="46" height="48" rx="4" fill="#1d1130"/>`).join('')).join('')
      + (() => { const roads = [['M600 610 C 760 570 920 650 1270 520', 1], ['M600 70 L1200 670', 0.85], ['M520 300 H1270', 0.6], ['M760 60 V680', 0.35]];
        return roads.map(([d, k]) => `<g fill="none" stroke-linecap="round" filter="url(#b)"><path d="${d}" stroke="${CY}" stroke-opacity="0.22" stroke-width="${Math.round(150 * k)}"/>`
          + `<path d="${d}" stroke="${YEL}" stroke-opacity="0.35" stroke-width="${Math.round(80 * k)}"/><path d="${d}" stroke="${MAG}" stroke-opacity="${(0.75 * k).toFixed(2)}" stroke-width="${Math.round(34 * k)}"/></g>`
          + `<path d="${d}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3" fill="none"/>`).join(''); })()
      + `<circle cx="1010" cy="220" r="70" fill="${MAG}" opacity="0.55" filter="url(#b)"/><text x="1010" y="160" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">Plaza de la Paja</text>`
      + '<text x="1200" y="500" font-family="sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.7" text-anchor="end">Autovía del Soto</text>');
    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];   // (whole: «Mar» would be March too, to translate)
    return numbered(build({ name: 'Sotoverde · mapa de ruido', palette: 'violet', fonts: 'bold', title: { color: FG, size: 64, font: H, bold: false }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(240, -260, 800, '#3a1250', BG, 70)], extra: [
        text('SOTOVERDE SUENA', 90, 70, 1100, 200, { fontFamily: H, fontSize: 150, textAlign: 'center', wordart: 'neon', wordartColor: MAG, letterSpacing: 6 }),
        text('Mapa estratégico de ruido · 2026', 90, 285, 1100, 50, { fontSize: 30, color: DIM, textAlign: 'center', letterSpacing: 3 }),
        ...wave],
        notes: 'Portada: el título es Text Art de estilo neón con color propio y la onda son 40 barras con degradado de color que crecen solas, en cascada, al llegar.' },
      { layout: 'blank', bg: BG, transition: 'slide', extra: [
        text('¿Cuánto suena la ciudad?', 420, 50, 800, 80, { fontFamily: H, fontSize: 64, color: FG }),
        shape('rounded', 150, 140, 26, 480, MAG, { fill2: CY, gradAngle: 90, radius: 13 }),
        ...[30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map(db => [shape('rect', 184, yDb(db) - 1, 14, 2, DIM), text(db + ' dB', 206, yDb(db) - 13, 90, 26, { fontSize: 18, color: DIM })]).flat(),
        shape('line', 140, 497, 1060, 1, 'none', { stroke: YEL, strokeWidth: 2, dash: 'dash' }),
        text('Límite recomendado de día: 53 dB', 860, 503, 340, 30, { fontSize: 18, color: YEL, textAlign: 'right' }),
        ...LEVELS.map(([db, l], i) => { const c = mix(CY, MAG, (db - 30) / 80);
          return [withAnims(shape('line', 290, yDb(db), 120, 1, 'none', { stroke: c, strokeWidth: 2 }), A('fade-right', { duration: 250, sound: 'click' })),
            withAnims(text(`<b style="color:${c}">${db} dB</b> &nbsp;${l}`, 420, yDb(db) - 20, 420, 40, { fontSize: 22, color: FG, bg: PAN, radius: 20, pad: [6, 16, 6, 16] }), A('fade-right', { start: 'withPrev', duration: 250 }))]; }).flat()],
        notes: 'Regla de decibelios dibujada con formas. Cada clic añade un sonido de la ciudad, de menos a más, con un pequeño «clic». La línea amarilla es el límite recomendado de día.' },
      { layout: 'titleOnly', title: 'Una escala que engaña', bg: BG, transition: 'fade', extra: [
        mathBlock({ x: 90, y: 180, w: 640, h: 150, fontSize: 56, color: FG, latex: 'L = 10\\,\\log_{10}\\left(\\dfrac{I}{I_0}\\right)' }),
        text('El nivel sonoro <i>L</i>, en decibelios, compara la intensidad <i>I</i> con la del umbral de audición <i>I</i><sub>0</sub>: es una escala logarítmica.', 760, 190, 440, 140, { fontSize: 24, color: DIM }),
        ...[['+3 ' + DBU, 'el doble de energía sonora', CY], ['+10 ' + DBU, 'se oye el doble de fuerte', YEL], ['90 + 90 = 93', 'dos motos no dan 180 dB', MAG]].map(([n, d, c], i) =>
          chain(card(`<div style="font-family:${H};font-size:64px;color:${c};line-height:1.05">${n}</div>${d}`, 90 + i * 375, 400, 350, 210, PAN, { fontSize: 22, color: FG, textAlign: 'center', vAlign: 'middle', radius: 16, pad: [20, 16, 20, 16] }), i, 'zoom-in', { sound: 'pop', duration: 400 }))],
        notes: 'Ecuación del nivel sonoro y tres consecuencias que sorprenden, una por clic con un «pop». Dos fuentes iguales suben el nivel solo 3 dB.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [img(noiseMap, 0, 0, 1280, 720, 'Mapa de ruido de Sotoverde: bandas de color alrededor de las vías principales')], extra: [
        text('Mapa de ruido<br>de día', 70, 70, 420, 160, { fontFamily: H, fontSize: 72, color: FG, lineHeight: 1 }),
        ...[[MAG, 'Más de 75 dB'], [YEL, 'De 65 a 75 dB'], [CY, 'De 55 a 65 dB']].map(([c, l], i) => [shape('rounded', 74, 262 + i * 56, 40, 40, c, { radius: 20, opacity: 85 }), text(l, 130, 266 + i * 56, 320, 34, { fontSize: 22, color: FG })]).flat(),
        chain(text(`<span style="font-family:${H};font-size:80px;color:${MAG};line-height:1">41 %</span><br>de los vecinos vive con más de 65 dB de día en su fachada`, 70, 450, 400, 200, { fontSize: 22, color: FG }), 0, 'fade-up')],
        notes: 'El mapa es un dibujo SVG con bandas difuminadas alrededor de cada vía (como las isófonas de un mapa de ruido real). Datos inventados.' },
      { layout: 'titleOnly', title: 'Quejas por día de la semana', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 80, y: 150, w: 1120, h: 500, chartType: 'stacked', color: MAG, seriesName: 'Ocio nocturno', grid: true, yTitle: 'Quejas en 2025', data: D(DAYS, [12, 10, 14, 22, 58, 71, 30]),
          series: [{ name: 'Terrazas', values: [6, 6, 7, 10, 22, 28, 19], color: ORA }, { name: 'Vecinos', values: [9, 8, 9, 10, 14, 19, 15], color: YEL }, { name: 'Tráfico', values: [14, 13, 13, 15, 17, 9, 6], color: CY }, { name: 'Obras', values: [25, 27, 26, 24, 20, 2, 1], color: '#9b5de5' }] })],
        notes: 'Barras apiladas: entre semana mandan las obras y el tráfico; el viernes y el sábado, el ocio nocturno y las terrazas. Datos inventados del registro de quejas.' },
      { layout: 'titleOnly', title: 'Vecinos por encima del límite', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 80, y: 150, w: 760, h: 500, chartType: 'hbar', color: ORA, seriesName: 'De día (más de 65 dB)', dataLabels: true, xTitle: '% de la población del distrito',
          data: D(['Centro', 'Ribera', 'Las Eras', 'Soto Norte', 'Pinar'], [52, 31, 24, 18, 8]), series: [{ name: 'De noche (más de 55 dB)', values: [38, 19, 12, 9, 4], color: '#9b5de5' }] }),
        card(`<div style="font-family:${H};font-size:56px;color:${YEL};line-height:1">1 de cada 3</div>vecinos del Centro duerme con el ruido por encima de lo recomendado.`, 880, 220, 320, 300, PAN, { fontSize: 24, color: FG, radius: 16, vAlign: 'middle' })],
        notes: 'Barras horizontales de dos series, día y noche. El Centro destaca en las dos. Datos inventados.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 40, x: 60, y: 40, w: 1160, h: 640, time: 20, correct: [2],
        question: '¿Cuántos decibelios hay en una avenida con tráfico intenso?', options: ['45 dB', '60 dB', '75 dB', '95 dB'] })],
        notes: 'Concurso desde el móvil, con puntos por rapidez. Respuesta: unos 75 dB, como en la regla de la segunda diapositiva.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...[520, 420, 320].map((d, i) => shape('ellipse', 640 - d / 2, 380 - d / 2, d, d, 'none', { stroke: [CY, '#9b5de5', MAG][i], strokeWidth: 2, opacity: 30 + i * 20 })),
        text('Un minuto de escucha', 90, 50, 1100, 80, { fontFamily: H, fontSize: 64, color: FG, textAlign: 'center' }),
        timer(60, 520, 260, 240, { color: MAG }),
        text('Cerrad los ojos y contad los sonidos que oís. ¿Cuántos son de la ciudad?', 190, 620, 900, 50, { fontSize: 26, color: DIM, textAlign: 'center' })],
        notes: 'Cuenta atrás de un minuto (empieza sola y suena al acabar). Pide silencio total; después, cada persona escribe lo que ha oído en la nube de palabras.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué has oído en ese minuto?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras en directo: los sonidos más repetidos crecen. Suele salir el tráfico, aunque estemos dentro de una sala.' },
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(340, 160, 600, '#2a0f3d', BG, 70)], extra: [
        withAnims(ink([[90, 420], [470, 420], [510, 340], [550, 500], [590, 380], [620, 440], [650, 420], [1190, 420]], MAG, 4), A('draw', { start: 'afterPrev', duration: 2200 })),
        text('Gracias por bajar el volumen', 90, 180, 1100, 110, { fontFamily: H, fontSize: 90, textAlign: 'center', wordart: 'neon', wordartColor: CY }),
        text('Plan de acción contra el ruido 2026–2030 · ruido.sotoverde.example', 90, 520, 1100, 40, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Cierre: un trazo de tinta que se dibuja solo como la línea de un sonómetro que vuelve a la calma.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Shared bikes in Ribanova: a transit-map look — coloured lines at 45°, stations as circles, a bike
  // that rides a line, figures in station rings, two charts, the app in a phone, a table and code.
  data_city_bikes: { name: 'Pedalia: un año de bici compartida', cat: 'data', summary: 'Plano tipo metro, bici que recorre una línea, cifras con sonido, líneas, apiladas, app en móvil, tabla y código', make: () => {
    const BG = '#f4f8f1', INK = '#1e3320', DIM = '#5d6f5f', L1 = '#2e9e44', L2 = '#f2a71b', L3 = '#1f78c1', L4 = '#c2185b';
    const F = pairStacks('friendly').heading;
    const LINES = [[L1, 'M560 560 H760 L900 420 H1220'], [L2, 'M700 110 V330 L850 480 V640'], [L3, 'M560 180 H820 L1040 400 V640'], [L4, 'M1200 140 L1060 280 H620']];
    const STOPS = [[600, 560], [700, 560], [980, 420], [1140, 420], [1220, 420], [700, 110], [850, 560], [850, 640], [560, 180], [620, 180], [760, 180], [1040, 520], [1040, 640], [1200, 140], [1130, 210], [800, 280], [620, 280]];
    const HUBS = [[700, 180], [700, 280], [845, 475], [920, 280], [1040, 420]];
    const NAMES = [[700, 96, 'Estación Norte', 'middle'], [1220, 452, 'Universidad', 'end'], [868, 470, 'Plaza Mayor', 'start'], [1056, 640, 'Hospital', 'start'], [560, 166, 'Puerto', 'start'], [940, 272, 'Mercado', 'start']];
    const metro = (op = 1) => svgURL(1280, 720, `<g opacity="${op}">` + LINES.map(([c, d]) => `<path d="${d}" stroke="${c}" stroke-width="14" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`).join('')
      + STOPS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#ffffff" stroke="${INK}" stroke-width="4"/>`).join('')
      + HUBS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#ffffff" stroke="${INK}" stroke-width="5"/>`).join('')
      + NAMES.map(([x, y, t, a]) => `<text x="${x}" y="${y}" font-family="Nunito,sans-serif" font-size="17" font-weight="700" fill="${INK}" text-anchor="${a}">${t}</text>`).join('') + '</g>');
    const bike = svgURL(120, 80, `<g fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="56" r="20"/><circle cx="96" cy="56" r="20"/>`
      + `<path d="M24 56 L46 24 L80 24 L96 56 M46 24 L60 56 L80 24 M60 56 L24 56" stroke="${L1}"/><path d="M40 16 H54 M80 24 L76 10 H88"/></g><circle cx="60" cy="56" r="5" fill="${INK}"/>`);
    const H24 = Array.from({ length: 24 }, (_, i) => (i % 3 ? '' : String(i)));
    const MON = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const app = svgURL(360, 720, `<rect width="360" height="720" fill="#eef4ea"/>`
      + Array.from({ length: 7 }, (_, i) => `<path d="M0 ${80 + i * 70}H360M${i * 60} 0V430" stroke="#d6e2d0" stroke-width="10"/>`).join('')
      + `<path d="M40 380 L140 280 H330" stroke="${L1}" stroke-width="8" fill="none"/><circle cx="140" cy="280" r="22" fill="${L1}"/><text x="140" y="287" font-family="sans-serif" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">3</text>`
      + `<circle cx="260" cy="180" r="16" fill="${L2}"/><circle cx="70" cy="140" r="16" fill="#c9d4c5"/><circle cx="300" cy="370" r="16" fill="${L1}"/>`
      + `<rect x="0" y="430" width="360" height="290" rx="24" fill="#ffffff"/><rect x="150" y="444" width="60" height="6" rx="3" fill="#d6e2d0"/>`
      + `<text x="24" y="494" font-family="sans-serif" font-size="24" font-weight="700" fill="${INK}">Plaza Mayor</text><text x="24" y="522" font-family="sans-serif" font-size="16" fill="${DIM}">a 120 m · 2 min andando</text>`
      + [['3', 'bicis', L1], ['1', 'eléctrica', L2], ['12', 'anclajes', L3]].map(([n, l, c], i) => `<rect x="${24 + i * 108}" y="548" width="96" height="76" rx="14" fill="#f4f8f1"/><text x="${72 + i * 108}" y="586" font-family="sans-serif" font-size="28" font-weight="700" fill="${c}" text-anchor="middle">${n}</text><text x="${72 + i * 108}" y="610" font-family="sans-serif" font-size="14" fill="${DIM}" text-anchor="middle">${l}</text>`).join('')
      + `<rect x="24" y="642" width="312" height="52" rx="26" fill="${L1}"/><text x="180" y="675" font-family="sans-serif" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">Desbloquear bici</text>`);
    return numbered(build({ name: 'Pedalia · bici compartida de Ribanova', palette: 'forest', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK },
      decor: () => [L1, L2, L3, L4].map((c, i) => shape('rect', 1080 + i * 40, 40, 32, 8, c, { radius: 4 })) }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [img(metro(), 0, 0, 1280, 720, 'Plano de las cuatro líneas de carril bici de Ribanova con sus estaciones')], extra: [
        kicker('RIBANOVA · BALANCE 2025', 70, 380, 460, L1),
        text('Pedalia,<br>un año sobre<br>dos ruedas', 70, 420, 400, 220, { fontFamily: F, fontSize: 56, fontWeight: 700, color: INK, lineHeight: 1.08 }),
        withAnims(img(bike, 500, 494, 120, 80, 'Una bicicleta'), path([[200, 0], [340, -140], [660, -140]], { start: 'afterPrev', duration: 3200 }))],
        notes: 'El plano tipo metro es un dibujo SVG propio. Al llegar, la bici recorre la línea verde con una trayectoria personalizada (Animaciones ▸ Trayectoria).' },
      { layout: 'titleOnly', title: 'El año en cuatro paradas', bg: BG, transition: 'push', extra: [
        shape('rect', 120, 396, 1040, 14, L1, { fill2: L3, gradAngle: 0, radius: 7 }),
        ...[['1,2 M', 'viajes', L1], ['64', 'estaciones', L2], ['1.150', 'bicis, 40 % eléctricas', L3], ['14 min', 'por viaje', L4]].map(([n, l, c], i) =>
          [chain(shape('ellipse', 95 + i * 293, 288, 230, 230, '#ffffff', { stroke: c, strokeWidth: 12 }), i, 'zoom-in', { sound: 'pop', duration: 350 }),
            withAnims(text(`<div style="font-family:${F};font-size:50px;font-weight:700;color:${c};line-height:1.1">${n}</div>${l}`, 115 + i * 293, 323, 190, 160,
              { fontSize: 20, color: INK, textAlign: 'center', vAlign: 'middle' }), A('zoom-in', { start: 'withPrev', duration: 350 }))]).flat(),
        text('Datos de ejemplo del primer año de servicio.', 120, 600, 1040, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Cuatro cifras como estaciones de una línea: entran seguidas con un «pop» en un solo clic. Datos inventados.' },
      { layout: 'titleOnly', title: 'Laborables con dos picos', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 820, h: 500, chartType: 'line', color: L1, seriesName: 'Laborable', grid: true, xTitle: 'Hora de salida', yTitle: 'Viajes por hora',
          data: D(H24, [20, 10, 5, 4, 6, 40, 260, 610, 720, 330, 210, 230, 300, 360, 280, 240, 330, 560, 640, 470, 300, 190, 110, 50]),
          series: [{ name: 'Fin de semana', values: [60, 40, 25, 15, 10, 15, 40, 90, 160, 260, 350, 400, 410, 380, 340, 360, 390, 400, 370, 300, 220, 160, 110, 80], color: L4 }] }),
        ...[['8:00', 'Al trabajo y a clase', L1], ['18:30', 'Vuelta a casa', L1], ['12–18 h', 'Fin de semana: paseo', L4]].map(([h, d, c], i) =>
          chain(text(`<b style="font-family:${F};font-size:34px;color:${c}">${h}</b><br>${d}`, 930, 195 + i * 140, 280, 126, { fontSize: 22, color: INK, borderColor: c, radius: 14, pad: [10, 18, 10, 18], bg: '#ffffff' }), i, 'fade-left'))],
        notes: 'Gráfico de líneas de dos series: los laborables tienen dos picos de ida y vuelta; el fin de semana, una loma por la tarde (datos inventados).' },
      { layout: 'titleOnly', title: 'La eléctrica gana en invierno', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 1140, h: 500, chartType: 'stacked', color: L3, seriesName: 'Eléctrica', grid: true, dataLabels: true, yTitle: 'Miles de viajes',
          data: D(MON, [52, 55, 63, 70, 78, 74, 61, 48, 80, 82, 66, 54]), series: [{ name: 'Mecánica', values: [28, 31, 42, 55, 68, 70, 60, 46, 66, 58, 39, 29], color: L2 }] })],
        notes: 'Barras apiladas por mes: en verano se igualan; con frío y cuestas, se prefiere la eléctrica. Agosto baja porque la ciudad se vacía (datos inventados).' },
      { layout: 'titleOnly', title: 'Para qué se coge la bici', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 60, y: 160, w: 660, h: 480, chartType: 'doughnut',
          data: [{ label: 'Trabajo', value: 41, color: L1 }, { label: 'Estudios', value: 19, color: L3 }, { label: 'Ocio', value: 22, color: L4 }, { label: 'Compras', value: 11, color: L2 }, { label: 'Gestiones', value: 7, color: '#8d6e63' }] }),
        withAnims({ ...img(app, 880, 150, 250, 500, 'App de Pedalia: estación Plaza Mayor con 3 bicis libres'), fit: 'cover', device: 'phone' }, A('fade-up', { duration: 600 }))],
        notes: 'Anillo con colores propios por porción (encuesta inventada a 3.000 personas) y la app dentro de un móvil (Imagen ▸ Dispositivo ▸ Móvil): la pantalla es un SVG hecho a medida.' },
      { layout: 'titleOnly', title: 'Estaciones que se vacían', bg: BG, transition: 'fade', extra: [
        tableBlock({ x: 70, y: 160, w: 760, h: 440, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d6e2d0', banded: true, band: L1,
          rows: [['Estación (7 a 10 h)', 'Salidas', 'Llegadas', 'Saldo'], ['Estación Norte', '182', '41', '=C2-B2'], ['Universidad', '36', '164', '=C3-B3'],
            ['Plaza Mayor', '95', '120', '=C4-B4'], ['Hospital', '28', '77', '=C5-B5'], ['Puerto', '88', '52', '=C6-B6'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [3.4, 2, 2, 2] }),
        card(`<b style="color:${L4}">Norte se vacía</b> en hora punta: bajan en bici al centro y vuelven en tren. Dos furgonetas suben 140 bicis cada mañana.`, 870, 200, 340, 240, '#ffffff',
          { fontSize: 23, color: INK, borderColor: L4, radius: 16 })],
        notes: 'Tabla con fórmulas: el saldo es =C2-B2 y los totales =SUMA(ARRIBA). Un saldo negativo es una estación que se queda sin bicis.' },
      { layout: 'titleOnly', title: 'A qué estación va primero la furgoneta', bg: BG, transition: 'fade', extra: [
        codeBlock({ x: 70, y: 160, w: 720, h: 330, fontSize: 21, lang: 'python', lineSteps: '1|2-3|4-5|7',
          code: 'def horas_hasta_vaciarse(est):\n    neto = est.salidas_hora - est.llegadas_hora\n    if neto <= 0:\n        return float("inf")   # no se vacía\n    return est.bicis / neto\n\nruta = sorted(estaciones, key=horas_hasta_vaciarse)' }),
        ...[['Norte', '0,6 h', L4], ['Puerto', '2,1 h', '#b36b00'], ['Plaza Mayor', 'no se vacía', L1]].map(([n, h, c], i) =>
          chain(text(`<b style="font-size:26px">${i + 1}. ${n}</b><br><span style="color:${c};font-weight:700">${h}</span>`, 820, 170 + i * 130, 390, 110, { fontSize: 22, color: INK, bg: '#ffffff', radius: 14, borderColor: c, pad: [12, 18, 12, 18] }), i, 'fade-left')),
        text('Cada 15 minutos se recalcula el orden con los datos de los anclajes.', 70, 590, 1140, 40, { fontSize: 22, color: DIM })],
        notes: 'Código con pasos de resaltado: cada clic marca una parte. Después, el orden de la ruta para esta mañana (ejemplo inventado).' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ fontSize: 32, display: 'pie', question: '¿Dónde pondrías la próxima estación?', x: 80, y: 60, w: 1120, h: 600,
        options: ['Polígono de Las Lomas', 'Cementerio y huertos', 'Barrio de la Estación', 'Playa de Poniente'] })],
        notes: 'Votación con el resultado en gráfico circular. La estación ganadora se estudiará en el plan de 2027.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [img(metro(0.25), 0, 0, 1280, 720, 'Plano de líneas, en suave'), shape('rounded', 80, 200, 1120, 230, BG, { opacity: 90, radius: 30 })], extra: [
        text('¡Nos vemos en la estación!', 90, 220, 1100, 120, { fontFamily: F, fontSize: 76, fontWeight: 700, color: INK, textAlign: 'center' }),
        text('pedalia.ribanova.example · abono anual 40 € · primera media hora gratis', 90, 350, 1100, 50, { fontSize: 26, color: DIM, textAlign: 'center' }),
        withAnims(img(bike, 60, 520, 120, 80, 'Una bicicleta'), path([[520, 0], [1040, 0]], { start: 'afterPrev', duration: 3500 }))],
        notes: 'Cierre: el plano queda de fondo, muy suave, y la bici cruza la diapositiva de lado a lado.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Tourism in Isla Marena: a vintage travel poster — a sun with curved text, sea stripes, a pictogram
  // of people, area, treemap and 100 % bars, a walker on the promenade, a tax table and a postcard to close.
  data_city_tourism: { name: 'Turismo en Isla Marena', cat: 'data', summary: 'Cartel de viaje: sol con texto curvo, pictograma, áreas, rectángulos, barras al 100 %, paseante 3D, tabla y postal', make: () => {
    const CREAM = '#f6e7cf', SAND = '#ecd3a8', TERRA = '#d9572b', TEAL = '#1f7a7a', SEA = '#2f9c9c', SUN = '#f2b33d', INK = '#3a2418', DIM = '#7a5a44';
    const S = pairStacks('editorial'), H = S.heading;
    const island = svgURL(400, 120, `<path d="M0 120 C 60 70 120 40 190 50 C 250 58 300 90 400 120 Z" fill="${TEAL}"/><path d="M150 52 C 152 30 156 18 162 4" stroke="${INK}" stroke-width="5" fill="none"/>`
      + `<path d="M162 6 c -20 -2 -32 6 -40 16 M162 6 c 18 -6 32 0 40 10 M162 6 c -6 -14 -20 -18 -30 -16 M162 6 c 10 -14 26 -14 34 -8" stroke="${INK}" stroke-width="4" fill="none"/>`);
    const stripes = (y0, n, h) => Array.from({ length: n }, (_, i) => shape('rect', 40, y0 + i * h, 1200, h, [SEA, TEAL][i % 2], { opacity: 100 - i * 6 }));
    const people = (y, n, size, gap) => Array.from({ length: n }, (_, i) => withAnims(icon('user', 90 + i * gap, y, size, i ? TERRA : TEAL),
      A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 160, ...(i ? {} : { sound: 'pop' }) })));
    const MON = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return numbered(build({ name: 'Isla Marena · turismo', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 48, font: H }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 1280, 720, 'none', { stroke: TERRA, strokeWidth: 6 })] }, [
      { layout: 'blank', bg: CREAM, transition: 'fade', back: [
        shape('ellipse', 780, 60, 340, 340, SUN, { fill2: TERRA, gradType: 'radial' }), ...stripes(450, 6, 38),
        img(island, 820, 352, 400, 120, 'Silueta de la isla con una palmera')], extra: [
        shape('rect', 40, 40, 1200, 640, 'none', { stroke: INK, strokeWidth: 3 }),
        text('RECUERDO DE ISLA MARENA · TEMPORADA 2026 · ', 745, 25, 410, 410, { fontSize: 21, curve: 100, color: INK, letterSpacing: 3 }),
        text('Isla<br>Marena', 90, 80, 600, 260, { fontFamily: H, fontSize: 112, fontWeight: 700, color: INK, lineHeight: 1.05 }),
        text('El turismo en cifras', 96, 345, 600, 50, { fontSize: 32, color: TERRA, fontStyle: 'italic' }),
        text('Observatorio Insular de Turismo · informe anual', 96, 610, 700, 40, { fontSize: 22, color: '#ffffff' })],
        notes: 'Portada como un cartel de viaje antiguo: sol con degradado radial, franjas de mar con opacidad decreciente, la isla en SVG y un texto curvo alrededor del sol.' },
      { layout: 'titleOnly', title: 'Uno por nueve', bg: CREAM, transition: 'push', extra: [
        text('<b>Agosto</b> · por cada vecino, nueve visitantes', 90, 160, 1100, 40, { fontSize: 26, color: INK }),
        ...people(210, 10, 96, 110),
        text('<b>Febrero</b> · uno por uno', 90, 360, 1100, 40, { fontSize: 26, color: INK }),
        ...people(410, 2, 96, 110),
        shape('rounded', 90, 560, 1100, 80, SAND, { radius: 14 }),
        text(`<b style="color:${TEAL}">48.000</b> vecinos · <b style="color:${TERRA}">61.000</b> plazas turísticas · <b style="color:${TERRA}">2,9 M</b> visitantes al año`, 110, 578, 1060, 44, { fontSize: 26, color: INK, textAlign: 'center' })],
        notes: 'Pictograma con iconos de persona: el primero de cada fila es un vecino (verde azulado) y el resto, visitantes. Entran en cadena con un clic. Datos inventados.' },
      { layout: 'titleOnly', title: 'Una isla que se llena y se vacía', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 840, h: 500, chartType: 'area', color: TERRA, seriesName: 'Visitantes presentes', grid: true, yTitle: 'Miles de personas en la isla',
          data: D(MON, [38, 41, 52, 70, 96, 180, 330, 432, 210, 95, 46, 40]), series: [{ name: 'Vecinos', values: [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48], color: TEAL }] }),
        card(`<div style="font-family:${H};font-size:54px;color:${TERRA};line-height:1.1">71 %</div>de las pernoctaciones del año se concentra de junio a septiembre.`, 950, 200, 260, 240, SAND, { fontSize: 22, color: INK, radius: 16 })],
        notes: 'Gráfico de áreas de dos series: los visitantes que hay cada día de media frente a los vecinos, que son siempre los mismos. Datos inventados.' },
      { layout: 'titleOnly', title: 'De dónde vienen', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 800, h: 500, chartType: 'treemap', color: TERRA,
          data: D(['Resto del país', 'Alemania', 'Reino Unido', 'Francia', 'Nórdicos', 'Italia', 'Otros'], [34, 17, 14, 9, 8, 6, 12]) }),
        ...[['5,8 noches', 'estancia media'], ['112 €', 'gasto por persona y día'], ['38 %', 'repite visita']].map(([n, l], i) =>
          chain(text(`<div style="font-family:${H};font-size:40px;color:${TEAL};line-height:1.15">${n}</div>${l}`, 910, 170 + i * 160, 300, 130, { fontSize: 22, color: INK }), i, 'fade-left'))],
        notes: 'Gráfico de rectángulos: el área de cada uno es su parte del total de visitantes (datos inventados). Las cifras de la derecha entran en cadena.' },
      { layout: 'titleOnly', title: 'Dónde duermen', bg: CREAM, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 1140, h: 500, chartType: 'stacked100', color: TERRA, seriesName: 'Hotel', dataLabels: true,
          data: D(['2016', '2018', '2020', '2022', '2024', '2026'], [62, 58, 57, 51, 47, 44]),
          series: [{ name: 'Vivienda turística', values: [14, 20, 22, 29, 34, 37], color: SUN }, { name: 'Camping y albergue', values: [12, 11, 12, 10, 9, 9], color: TEAL }, { name: 'Otros', values: [12, 11, 9, 10, 10, 10], color: '#b08968' }] })],
        notes: 'Barras al 100 %: en diez años, la vivienda turística pasa del 14 % al 37 % de las plazas. Datos inventados.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', back: [shape('rect', 30, 30, 1220, 440, '#fbefdc', { fill2: CREAM, gradAngle: 90 }), ...stripes(600, 3, 38)], extra: [
        shape('rect', 40, 590, 1200, 10, SAND),
        text('Paseo de las Gaviotas, un día de agosto', 90, 60, 1100, 60, { fontFamily: H, fontSize: 44, fontWeight: 700, color: INK }),
        ...[['18.000', 'paseos al día'], ['3,4 km', 'de paseo marítimo'], ['1 de cada 4', 'vecinos lo evita en agosto']].map(([n, l], i) =>
          chain(text(`<span style="font-family:${H};font-size:44px;color:${[TERRA, TEAL, TERRA][i]}">${n}</span><br>${l}`, 90 + i * 380, 150, 340, 120, { fontSize: 22, color: INK }), i, 'fade-down')),
        withAnims(m3d('kh-CesiumMan', 60, 330, 220, 280, { walk: { clip: '*', face: true, look: true } }), path([[420, 0], [960, 0]], { duration: 6000 }))],
        notes: 'Clic: las cifras caen una tras otra y luego el paseante 3D camina por el paseo (Modelo 3D ▸ Mientras se mueve, con una trayectoria). Datos inventados.' },
      { layout: 'titleOnly', title: 'La tasa turística', bg: CREAM, transition: 'fade', extra: [
        tableBlock({ x: 70, y: 160, w: 1140, h: 420, fontSize: 24, header: true, headBg: TERRA, headFg: '#ffffff', stroke: SAND, banded: true, band: SUN,
          rows: [['Alojamiento', 'Pernoctaciones (miles)', 'Tasa (€ por noche)', 'Recaudación (miles de €)'],
            ['Hotel de 4 y 5 estrellas', '820', '2,5', '=B2*C2'], ['Hotel de 1 a 3 estrellas', '380', '1,5', '=B3*C3'], ['Vivienda turística', '960', '2', '=B4*C4'],
            ['Camping y albergue', '210', '0,5', '=B5*C5'], ['Cruceros (por escala)', '140', '1', '=B6*C6'], ['<b>Total</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']], colW: [3.4, 2.6, 2.2, 2.8] }),
        text('Fórmulas en la tabla: =B2*C2 por fila y =SUMA(ARRIBA) en el total. Tasas propuestas, de ejemplo.', 70, 600, 1140, 40, { fontSize: 20, color: DIM })],
        notes: 'La recaudación se calcula sola: prueba a cambiar una tasa delante del público y verás el nuevo total.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿En qué invertirías lo que se recauda? Elige dos', x: 80, y: 60, w: 1120, h: 600,
        options: ['Vivienda asequible', 'Playas y senderos', 'Bus gratis en verano', 'Desalinizadora', 'Temporada baja'] })],
        notes: 'Votación de opción múltiple: cada persona marca dos destinos para la tasa.' },
      { layout: 'blank', bg: SAND, transition: 'page', extra: [
        shape('rect', 120, 80, 1040, 560, '#fffaf1', { shadow: { x: 0, y: 12, blur: 30, color: '#3a241833' } }),
        shape('rect', 660, 130, 2, 460, '#d9c4a3'),
        text('¡Gracias por venir!<br><br>Volved en temporada baja: hay sitio, calma y mejores precios. La isla es más isla en noviembre.', 170, 130, 450, 280, { fontFamily: H, fontSize: 28, fontStyle: 'italic', color: INK, lineHeight: 1.35 }),
        m3d('kh-SunglassesKhronos', 150, 390, 480, 240, { autoRotate: false, motion: 'float', view: 'front' }),
        shape('rect', 960, 120, 160, 190, '#fffaf1', { stroke: TERRA, strokeWidth: 4, dash: 'dash' }),
        shape('ellipse', 990, 150, 100, 100, SUN, { fill2: TERRA, gradType: 'radial' }),
        text('ISLA MARENA<br>0,50 €', 960, 255, 160, 50, { fontSize: 14, color: TERRA, textAlign: 'center', fontWeight: 700 }),
        text('ISLA MARENA · OCTUBRE 2026 · ', 840, 160, 180, 180, { fontSize: 15, curve: 100, color: '#3a241899', rotation: -12 }),
        ...[0, 1, 2].map(i => shape('rect', 720, 420 + i * 60, 400, 2, '#c9b08b')),
        text('A todo el público<br>Salón de plenos<br>Isla Marena', 720, 380, 400, 180, { fontSize: 24, color: INK, lineHeight: 2.45 }),
        credits(['kh-CesiumMan', 'kh-SunglassesKhronos'], 120, 660, 1040, DIM)],
        notes: 'Cierre en forma de postal: sello con borde discontinuo, matasellos con texto curvo y las gafas de sol 3D flotando. Transición «Página».' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Street trees of Robledal del Río: a herbarium sheet — a hand-drawn tree with tape, a specimen label,
  // a 3D plant that moves with Transform, treemap, histogram, the 3-30-300 rule, an equation with a table and a match.
  data_city_trees: { name: 'Inventario del arbolado urbano', cat: 'data', summary: 'Pliego de herbario: árbol dibujado, planta 3D con Transformar, rectángulos, histograma, ecuación, tabla y emparejar', make: () => {
    const PAPER = '#f3ecd9', INK = '#3b3228', LEAF = '#4f6b2f', MOSS = '#86a63f', BARK = '#8a5a2b', LABEL = '#fffaf0', RUST = '#b5651d', DIM = '#7b6d5c', PLANT = uid();
    const S = pairStacks('classic'), H = S.heading;
    const tree = svgURL(380, 520, `<g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">`
      + `<path d="M176 500 C 180 420 172 360 178 300 C 182 250 170 220 160 190 M186 500 C 192 430 196 360 192 300 C 190 260 204 230 222 200" stroke="${BARK}" stroke-width="5"/>`
      + `<path d="M178 300 C 150 280 120 270 96 250 M192 300 C 220 286 256 276 286 250 M184 250 C 186 220 188 190 190 150" stroke="${BARK}" stroke-width="4"/>`
      + [[190, 120, 80], [110, 190, 72], [270, 190, 74], [150, 110, 60], [235, 105, 58], [80, 250, 52], [300, 250, 54], [190, 210, 70]].map(([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${MOSS}" fill-opacity="0.35" stroke="${LEAF}"/>`).join('')
      + `<path d="M120 500 H260" stroke="${INK}" stroke-width="2"/><path d="M140 506 c 10 6 20 6 30 0 M200 506 c 10 6 20 6 30 0" stroke="${DIM}" stroke-width="2"/></g>`);
    const leaf = c => svgURL(120, 200, `<path d="M60 190 C 58 150 58 120 60 100 C 20 90 4 50 20 10 C 40 30 60 20 60 4 C 60 20 80 30 100 10 C 116 50 100 90 60 100" fill="${c}" fill-opacity="0.75" stroke="${INK}" stroke-width="2"/>`
      + `<path d="M60 100 V 20 M60 70 L 34 44 M60 70 L 86 44 M60 50 L 40 30 M60 50 L 80 30" stroke="${INK}" stroke-width="1.5" fill="none"/>`);
    const tape = (x, y, w, rot) => shape('rect', x, y, w, 30, '#e8dcc0', { opacity: 80, rotation: rot });
    const plant = (x, y, w, h, props) => ({ ...m3d('kh-DiffuseTransmissionPlant', x, y, w, h, props), id: PLANT });
    let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const DIAM = Array.from({ length: 80 }, () => Math.round(8 + 46 * Math.pow(rnd(), 1.6) + 14 * rnd()));
    const field = (k, v) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #b9a98c;padding:6px 0"><span style="color:${DIM}">${k}</span><b>${v}</b></div>`;
    return numbered(build({ name: 'Robledal del Río · arbolado', palette: 'forest', fonts: 'classic', title: { color: LEAF, size: 50, font: H }, body: { color: INK },
      decor: () => [text('Herbario urbano de Robledal del Río', 860, 676, 380, 24, { fontSize: 13, color: DIM, fontStyle: 'italic', textAlign: 'right' })] }, [
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        img(tree, 90, 70, 380, 520, 'Dibujo a mano de un árbol de copa redonda'),
        tape(170, 70, 120, -8), tape(120, 560, 110, 6), tape(330, 560, 110, -5),
        { ...img(leaf(MOSS), 1090, 60, 90, 150, 'Hoja prensada'), rotation: 18 },
        kicker('HERBARIO URBANO · INVENTARIO 2026', 560, 130, 600, RUST),
        text('El arbolado<br>de Robledal del Río', 560, 170, 660, 200, { fontFamily: H, fontSize: 64, color: INK, lineHeight: 1.1 }),
        text('Quién da sombra a la ciudad, cuánto CO₂ guarda y dónde falta', 562, 380, 600, 80, { fontSize: 26, color: DIM, fontStyle: 'italic' }),
        card(field('Ejemplares', '48.312') + field('Especies', '74') + field('Censo', 'marzo–septiembre 2026'), 760, 480, 420, 170, LABEL,
          { fontSize: 20, color: INK, radius: 4, borderColor: INK, pad: [12, 20, 12, 20], shadow: { x: 3, y: 4, blur: 0, color: '#3b322833' } })],
        notes: 'Portada como un pliego de herbario: el árbol y la hoja son dibujos SVG propios, sujetos con «cinta» (rectángulos semitransparentes girados), y la etiqueta del pliego abajo.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        plant(80, 80, 460, 560, { autoRotate: true, spin: 12, view: 'three' }),
        text('Cada árbol, una ficha', 600, 70, 600, 70, { fontFamily: H, fontSize: 50, color: LEAF }),
        shape('rect', 600, 160, 580, 470, LABEL, { stroke: INK, strokeWidth: 2, shadow: { x: 4, y: 5, blur: 0, color: '#3b322833' } }),
        text('Ficha n.º 18.204 · calle del Molino, 12', 630, 180, 520, 36, { fontSize: 20, color: RUST, fontStyle: 'italic' }),
        ...[['Especie', '<i>Celtis australis</i> (almez)'], ['Perímetro del tronco', '142 cm'], ['Altura', '11 m'], ['Estado', 'bueno'], ['Alcorque', '1,2 × 1,2 m'], ['CO₂ que fija', '38 kg al año']].map(([k, v], i) =>
          chain(text(field(k, v), 630, 228 + i * 64, 520, 56, { fontSize: 22, color: INK }), i, 'fade-in', { duration: 300 }))],
        notes: 'La planta 3D gira despacio. Con un clic, los campos de la ficha se rellenan uno tras otro, como en la tableta del inventario. Datos de ejemplo.' },
      { layout: 'blank', bg: PAPER, autoAnimate: true, extra: [
        plant(900, 300, 300, 360, { autoRotate: false, view: 'front', arrive: 'turn' }),
        text('El censo, en tres números', 90, 70, 900, 70, { fontFamily: H, fontSize: 50, color: LEAF }),
        ...[['48.312', 'árboles en calles y parques', LEAF], ['74', 'especies distintas', RUST], ['1 de cada 3', 'vecinos tiene un árbol delante de su portal', BARK]].map(([n, l, c], i) =>
          chain(text(`<span style="font-family:${H};font-size:76px;color:${c};line-height:1">${n}</span><br>${l}`, 90, 170 + i * 160, 760, 150, { fontSize: 26, color: INK }), i, 'fade-right'))],
        notes: 'Transformar: la planta viaja desde la diapositiva anterior, se encoge a la esquina y llega dando una vuelta. Cifras inventadas.' },
      { layout: 'titleOnly', title: 'Quién da la sombra', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 160, w: 780, h: 480, chartType: 'treemap', color: LEAF,
          data: D(['Plátano de sombra', 'Almez', 'Tilo', 'Jacaranda', 'Olmo', 'Pino', 'Acacia', 'Otras 67 especies'], [22, 14, 9, 8, 7, 7, 5, 28]) }),
        card(`<b style="color:${RUST}">Regla del 10 %</b><br>Ninguna especie debería pasar del 10 % del arbolado: una sola plaga se llevaría hoy <b>uno de cada cinco</b> árboles.`, 890, 200, 320, 300, LABEL,
          { fontSize: 23, color: INK, radius: 4, borderColor: INK })],
        notes: 'Gráfico de rectángulos con el reparto por especies (%, inventado). El plátano de sombra duplica el máximo recomendable.' },
      { layout: 'titleOnly', title: 'Muchos jóvenes, pocos veteranos', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 160, w: 820, h: 480, chartType: 'histogram', color: MOSS, grid: true, dataLabels: true, xTitle: 'Diámetro del tronco a 1,30 m (cm)', yTitle: 'Árboles de la muestra',
          data: DIAM.map(v => ({ label: '', value: v })) }),
        { ...img(leaf(LEAF), 1000, 170, 110, 180, 'Hoja prensada'), rotation: -14 },
        text('Muestra de 80 árboles. Solo los grandes, de más de 50 cm, dan de verdad sombra y frescor: hay que cuidarlos.', 920, 380, 300, 220, { fontSize: 22, color: INK, fontStyle: 'italic' })],
        notes: 'Histograma: Revela agrupa solo los diámetros en tramos (regla de Sturges). Muestra inventada.' },
      { layout: 'titleOnly', title: 'La regla 3 · 30 · 300', bg: PAPER, transition: 'fade', extra: [
        ...[['3', 'árboles a la vista desde cada casa', '82 %', 'de los hogares lo cumple'], ['30', '% del barrio cubierto por copas', '21 %', 'de cobertura media'], ['300', 'metros como mucho hasta un parque', '64 %', 'de los vecinos lo tiene']].map(([n, l, v, d], i) => [
          chain(shape('ellipse', 120 + i * 370, 170, 260, 260, [MOSS, RUST, BARK][i], { opacity: 25, sketch: true, stroke: INK, strokeWidth: 3 }), i, 'zoom-in', { sound: 'pop', duration: 400 }),
          withAnims(text(`<span style="font-family:${H};font-size:96px;color:${INK}">${n}</span>`, 120 + i * 370, 230, 260, 130, { textAlign: 'center' }), A('zoom-in', { start: 'withPrev', duration: 400 })),
          withAnims(text(l, 100 + i * 370, 450, 300, 70, { fontSize: 22, color: INK, textAlign: 'center' }), A('fade-up', { start: 'withPrev', duration: 400 })),
          withAnims(text(`<b style="font-size:30px;color:${[LEAF, RUST, BARK][i]}">${v}</b><br>${d}`, 100 + i * 370, 530, 300, 90, { fontSize: 20, color: DIM, textAlign: 'center' }), A('fade-up', { start: 'withPrev', duration: 400 }))]).flat()],
        notes: 'Círculos con trazo a mano (sketch). La regla 3-30-300 resume un barrio sano; las cifras de Robledal (inventadas) muestran que la copa es lo que más falta.' },
      { layout: 'titleOnly', title: 'Copa de árbol por barrio', bg: PAPER, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 160, w: 1140, h: 470, chartType: 'hbar', color: LEAF, seriesName: 'Copa de árbol (%)', dataLabels: true, xTitle: '% de la superficie del barrio',
          data: D(['Parque del Río', 'Las Huertas', 'Centro histórico', 'El Molino', 'Polígono Sur'], [38, 27, 14, 19, 6]), series: [{ name: 'Objetivo', values: [30, 30, 30, 30, 30], color: '#d8c7a5' }] })],
        notes: 'Barras horizontales frente al objetivo del 30 %. Solo un barrio lo cumple; el polígono es una isla de calor. Datos inventados.' },
      { layout: 'titleOnly', title: 'Cuánto CO₂ guardan', bg: PAPER, transition: 'fade', extra: [
        mathBlock({ x: 70, y: 160, w: 560, h: 100, fontSize: 40, color: INK, latex: 'B = a\\,D^{\\,b}' }),
        mathBlock({ x: 70, y: 270, w: 560, h: 100, fontSize: 40, color: INK, latex: 'CO_2 = 3{,}67 \\times 0{,}5 \\times B' }),
        text('<b>B</b>: biomasa seca (kg) según el diámetro <b>D</b> y dos constantes de cada especie. La mitad de la madera es carbono, y cada kilo de carbono son 3,67 kg de CO₂.',
          70, 400, 560, 200, { fontSize: 22, color: DIM }),
        tableBlock({ x: 670, y: 160, w: 540, h: 400, fontSize: 21, header: true, headBg: LEAF, headFg: '#ffffff', stroke: '#d8c7a5', banded: true, band: MOSS,
          rows: [['Especie', 'Árboles', 'kg CO₂ por árbol y año', 'Toneladas al año'], ['Plátano', '10.630', '42', '=B2*C2/1000'], ['Almez', '6.760', '38', '=B3*C3/1000'],
            ['Tilo', '4.350', '27', '=B4*C4/1000'], ['Jacaranda', '3.860', '19', '=B5*C5/1000'], ['<b>Total</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']], colW: [2.2, 1.8, 2.4, 2.2] }),
        text('Tabla con fórmulas (=B2*C2/1000). Coeficientes de ejemplo.', 670, 580, 540, 40, { fontSize: 18, color: DIM })],
        notes: 'Dos ecuaciones (alometría y paso a CO₂) y una tabla que las aplica por especie con fórmulas. Cifras de ejemplo, no de un inventario real.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [pollBlock({ kind: 'match', fontSize: 30, question: 'Une cada árbol con su seña', x: 80, y: 60, w: 1120, h: 600,
        options: ['Plátano de sombra = Corteza que se cae a placas', 'Jacaranda = Flores moradas en mayo', 'Pino piñonero = Copa en forma de paraguas', 'Almez = Frutos pequeños y negros'] })],
        notes: 'Actividad de emparejar desde el móvil: cada persona une el árbol con su seña y se corrige sola.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        img(tree, 860, 120, 330, 452, 'Dibujo a mano de un árbol'), tape(930, 118, 110, 7),
        { ...img(leaf(RUST), 120, 470, 80, 130, 'Hoja prensada'), rotation: -24 }, { ...img(leaf(MOSS), 200, 500, 70, 115, 'Hoja prensada'), rotation: 12 },
        text('Plantar hoy<br>la sombra de 2050', 90, 160, 720, 220, { fontFamily: H, fontSize: 72, color: INK, lineHeight: 1.1 }),
        text('2.500 árboles al año · alcorques más grandes · riego por goteo', 94, 390, 740, 90, { fontSize: 24, color: LEAF, fontStyle: 'italic' }),
        credits(['kh-DiffuseTransmissionPlant'], 320, 620, 520, DIM)],
        notes: 'Cierre con el mismo árbol dibujado y dos hojas prensadas. Propón el plan de plantación.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Waste in Villa Cardo: the five bin colours as the whole design — bins that bounce in with a pop,
  // a giant figure, a waterfall from bin to landfill, stacked areas, a pie by bin colour, a pyramid, a match and a table.
  data_city_waste: { name: 'Lo que tiramos en Villa Cardo', cat: 'data', summary: 'Contenedores que saltan con sonido, cifra gigante, cascada, apiladas, tarta por colores, embudo, emparejar y tabla', make: () => {
    const INK = '#1f2328', DIM = '#5c6470', SOFT = '#f3f5f7', YEL = '#f4c430', BLU = '#1e6fd9', GRN = '#2e9e4f', BRN = '#8b5a2b', GRY = '#7a7f87';
    const M = pairStacks('modern'), H = M.heading;
    const BINS = [[YEL, 'Envases'], [BLU, 'Papel y cartón'], [GRN, 'Vidrio'], [BRN, 'Orgánica'], [GRY, 'Resto']];
    const bin = (x, y, s, c, label, i, anim = true) => {
      const parts = [shape('rounded', x, y + 30 * s, 150 * s, 180 * s, c, { radius: 14 * s }), shape('rounded', x - 10 * s, y, 170 * s, 30 * s, c, { radius: 8 * s, stroke: INK, strokeWidth: 0, opacity: 85 }),
        shape('rounded', x + 45 * s, y + 8 * s, 60 * s, 10 * s, INK, { radius: 5 * s, opacity: 60 }), shape('rect', x + 30 * s, y + 70 * s, 90 * s, 4 * s, '#ffffff', { opacity: 50 }),
        ...(label ? [text(label, x - 30 * s, y + 222 * s, 210 * s, 34 * s, { fontSize: Math.round(20 * s), color: INK, textAlign: 'center', fontWeight: 700 })] : [])];
      return anim ? parts.map((p, k) => withAnims(p, A('bounce', { start: k ? 'withPrev' : 'afterPrev', duration: 500, ...(k ? {} : { sound: 'pop' }) }))) : parts;
    };
    const YRS = ['2015', '2017', '2019', '2021', '2023', '2025'];
    return numbered(build({ name: 'Villa Cardo · residuos', palette: 'office', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK },
      decor: () => BINS.map(([c], i) => shape('rect', i * 256, 712, 256, 8, c)) }, [
      { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
        kicker('RESIDUOS MUNICIPALES · BALANCE 2025', 190, 70, 900, DIM, { textAlign: 'center' }),
        text('Lo que tiramos en Villa Cardo', 40, 110, 1200, 100, { fontFamily: H, fontSize: 56, fontWeight: 800, color: INK, textAlign: 'center' }),
        text('Cinco colores, 31.000 toneladas y una meta para 2030', 90, 210, 1100, 50, { fontSize: 28, color: DIM, textAlign: 'center' }),
        ...BINS.map(([c, l], i) => bin(155 + i * 210, 330, 1, c, l, i)).flat()],
        notes: 'Portada: los cinco contenedores son formas (cuerpo, tapa, asa) y entran solos uno tras otro dando un bote, con un «pop» cada uno.' },
      { layout: 'blank', bg: SOFT, transition: 'push', extra: [
        text('Cada vecino genera', 90, 90, 700, 50, { fontSize: 30, color: DIM }),
        chain(text('412 kg', 80, 130, 760, 220, { fontFamily: H, fontSize: 200, fontWeight: 800, color: INK, letterSpacing: -6 }), 0, 'zoom-in', { sound: 'drumroll', duration: 900 }),
        text('de basura al año: <b>1,13 kg al día</b>, como una bolsa grande cada dos días.', 90, 360, 700, 100, { fontSize: 30, color: INK }),
        ...[['2015', 438, GRY], ['2025', 412, BLU], ['Meta 2030', 380, GRN]].map(([y, v, c], i) => [
          text(`<b>${y}</b>`, 880, 150 + i * 130, 300, 34, { fontSize: 22, color: INK }),
          chain(shape('rounded', 880, 190 + i * 130, Math.round(v * 0.68), 40, c, { radius: 8 }), i, 'fade-right', { start: 'afterPrev', duration: 600 }),
          text(`${v} kg`, 890, 194 + i * 130, 200, 34, { fontSize: 22, color: '#ffffff', fontWeight: 700 })]).flat(),
        text('Kilos por vecino y año (datos de ejemplo).', 880, 560, 320, 60, { fontSize: 18, color: DIM })],
        notes: 'Cifra gigante con redoble al aparecer. A la derecha, barras hechas con formas: 2015, 2025 y la meta. Datos inventados.' },
      { layout: 'titleOnly', title: 'Del cubo al vertedero', bg: '#ffffff', transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 1140, h: 500, chartType: 'waterfall', color: GRN, dataLabels: true, yTitle: 'kg por vecino y año',
          data: [{ label: 'Generado', value: 412 }, { label: 'Envases', value: -38 }, { label: 'Papel', value: -29 }, { label: 'Vidrio', value: -22 }, { label: 'Orgánica', value: -51 }, { label: 'Planta', value: -34 }, { label: 'Total', value: 0 }] })],
        notes: 'Cascada: de los 412 kg, cada contenedor separado y la planta de tratamiento restan; la última barra («Total») es lo que acaba en el vertedero, 238 kg. Datos inventados.' },
      { layout: 'titleOnly', title: 'Diez años separando', bg: '#ffffff', transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 1140, h: 500, chartType: 'stacked', color: BRN, seriesName: 'Orgánica', grid: true, yTitle: 'kg por vecino y año', data: D(YRS, [4, 9, 18, 30, 44, 51]),
          series: [{ name: 'Envases', values: [24, 27, 30, 33, 36, 38], color: YEL }, { name: 'Papel y cartón', values: [22, 24, 25, 27, 28, 29], color: BLU }, { name: 'Vidrio', values: [15, 17, 18, 19, 21, 22], color: GRN }] })],
        notes: 'Barras apiladas: lo que se separa en cada contenedor, año a año. El marrón de la orgánica, que llegó en 2017, es lo que más crece. Datos inventados.' },
      { layout: 'titleOnly', title: 'Lo que hay en el contenedor gris', bg: SOFT, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 640, h: 500, chartType: 'pie',
          data: [{ label: 'Orgánica', value: 38, color: BRN }, { label: 'Envases', value: 14, color: YEL }, { label: 'Papel y cartón', value: 11, color: BLU }, { label: 'Textil', value: 7, color: '#b04a8f' }, { label: 'Vidrio', value: 5, color: GRN }, { label: 'Resto de verdad', value: 25, color: GRY }] }),
        ...bin(820, 180, 1.3, GRY, 'Resto', 0, false),
        chain(card(`<b style="font-size:40px;color:${BRN}">3 de cada 4</b><br>kilos del gris tenían otro contenedor.`, 760, 520, 450, 120, '#ffffff', { fontSize: 22, color: INK, radius: 14, pad: [12, 20, 12, 20] }), 0, 'fade-up')],
        notes: 'Tarta con el color de cada contenedor en su porción (caracterización de 2025, inventada). Solo una cuarta parte del gris es «resto» de verdad.' },
      { layout: 'titleOnly', title: 'Antes que reciclar', bg: '#ffffff', transition: 'fade', extra: [
        dg('funnel', 'Prevenir\nReutilizar\nReciclar\nValorizar\nEliminar', 70, 160, 640, 480, { colors: 'colorful', oneByOne: true }),
        text(ul('<b>Prevenir</b>: el mejor residuo es el que no existe', '<b>Reutilizar</b>: tienda de segunda mano en el punto limpio', '<b>Reciclar</b>: separar bien en cada contenedor', '<b>Valorizar</b>: compost o energía con lo que no se recicla', '<b>Eliminar</b>: el vertedero, solo para lo que no tiene arreglo'),
          760, 170, 450, 470, { fontSize: 22, color: INK, lineHeight: 1.4 })],
        notes: 'La jerarquía de residuos como embudo, uno a uno: arriba lo más deseable y abajo, lo último.' },
      { layout: 'blank', bg: SOFT, transition: 'fade', extra: [pollBlock({ kind: 'match', fontSize: 32, question: '¿A qué contenedor va?', x: 80, y: 60, w: 1120, h: 600,
        options: ['Brik de leche = Amarillo', 'Caja de pizza sin restos = Azul', 'Tarro de mermelada = Verde', 'Pieles de fruta = Marrón', 'Pañal usado = Gris'] })],
        notes: 'Actividad de emparejar desde el móvil: cada residuo con su contenedor. El brik va al amarillo y el pañal, al gris.' },
      { layout: 'titleOnly', title: 'Barrio a barrio', bg: '#ffffff', transition: 'fade', extra: [
        tableBlock({ x: 70, y: 160, w: 1140, h: 420, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#dde1e6', banded: true, band: GRY,
          rows: [['Barrio', 'Separado (t)', 'Contenedor gris (t)', '% separado'],
            ['Casco Antiguo', '1.820', '3.950', '=REDONDEAR(B2/(B2+C2)*100;1)'], ['La Vega', '2.640', '3.410', '=REDONDEAR(B3/(B3+C3)*100;1)'], ['Los Olivos', '3.100', '3.020', '=REDONDEAR(B4/(B4+C4)*100;1)'],
            ['San Roque', '1.460', '3.880', '=REDONDEAR(B5/(B5+C5)*100;1)'], ['El Ejido', '2.210', '2.940', '=REDONDEAR(B6/(B6+C6)*100;1)'], ['<b>Villa Cardo</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=REDONDEAR(B7/(B7+C7)*100;1)']], colW: [3, 2.6, 3, 2.4] }),
        text('Fórmulas: =REDONDEAR(B2/(B2+C2)*100;1) por barrio y =SUMA(ARRIBA) en el total. Toneladas de 2025, inventadas.', 70, 600, 1140, 40, { fontSize: 18, color: DIM })],
        notes: 'Tabla con fórmulas: el porcentaje separado se recalcula si cambian las toneladas. Los Olivos, con contenedor marrón desde 2017, va en cabeza.' },
      { layout: 'blank', bg: '#ffffff', transition: 'zoom', extra: [
        text('La meta de 2030', 90, 90, 1100, 80, { fontFamily: H, fontSize: 60, fontWeight: 800, color: INK, textAlign: 'center' }),
        text('Separar más de la mitad de lo que tiramos', 90, 175, 1100, 50, { fontSize: 28, color: DIM, textAlign: 'center' }),
        shape('rounded', 140, 290, 1000, 70, SOFT, { radius: 35 }),
        withAnims(shape('rounded', 140, 290, 395, 70, BLU, { radius: 35, fill2: GRN, gradAngle: 0 }), A('fade-right', { start: 'afterPrev', duration: 1200 })),
        shape('rect', 688, 270, 4, 110, INK), text('<b>55 %</b> en 2030', 600, 390, 180, 40, { fontSize: 22, color: INK, textAlign: 'center' }),
        text('<b>39,5 %</b> hoy', 160, 304, 300, 44, { fontSize: 26, color: '#ffffff' }),
        ...BINS.map(([c, l], i) => bin(215 + i * 190, 470, 0.55, c, '', i, false)).flat()],
        notes: 'Cierre: la barra (formas) se llena sola hasta el 39,5 % actual (el total de la tabla anterior) y la marca negra señala el 55 % de 2030. Pide a cada barrio un compromiso concreto.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Water in Fuentelinda: deep water and waves — a reservoir whose level drops with Transform,
  // lines by year, a doughnut, a household day in bars, the tariff as equation and table, a shower timer and a quiz.
  data_city_water: { name: 'El agua de Fuentelinda', cat: 'data', summary: 'Embalse que se vacía con Transformar, líneas, anillo, barras, tarifa con ecuación y fórmulas, ducha con cuenta atrás', make: () => {
    const BG = '#04213a', DEEP = '#021627', AQUA = '#3ec5e0', LIGHT = '#bfefff', FG = '#ffffff', DIM = '#8fb3c9', WARN = '#ffb347', PAN = '#08304f', WATER = uid(), LVL = uid(), CAP = uid();
    const waves = svgURL(1280, 200, [[60, 0.25, 0], [90, 0.4, 140], [120, 0.7, 60]].map(([y, op, ph]) =>
      `<path d="M${-ph} ${y} ${Array.from({ length: 10 }, (_, i) => `Q ${i * 160 - ph + 40} ${y - 26} ${i * 160 - ph + 80} ${y} T ${i * 160 - ph + 160} ${y}`).join(' ')} V200 H${-ph}Z" fill="${AQUA}" fill-opacity="${op}"/>`).join(''));
    const TIDS = Array.from({ length: 10 }, () => uid());
    const tank = (pct, c1, c2) => { const h = Math.round(480 * pct);
      return [shape('rounded', 120, 120, 360, 480, PAN, { radius: 20 }),
        { ...shape('rounded', 120, 600 - h, 360, h, c1, { fill2: c2, gradAngle: 90, radius: 20 }), id: WATER },
        ...[25, 50, 75].map(p => [shape('rect', 120, 600 - 4.8 * p, 30, 2, LIGHT, { opacity: 60 }), text(p + ' %', 156, 600 - 4.8 * p - 14, 70, 28, { fontSize: 16, color: LIGHT })]).flat(),
        shape('rounded', 120, 120, 360, 480, 'none', { stroke: LIGHT, strokeWidth: 4, radius: 20 })].map((o, i) => (o.id === WATER ? o : { ...o, id: TIDS[i] })); };
    const MON = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return numbered(build({ name: 'Fuentelinda · agua', palette: 'revela', fonts: 'clean', title: { color: FG, size: 48 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(700, 0, 700, '#0b4a75', BG, 70), img(waves, 0, 520, 1280, 200, 'Olas')], extra: [
        withAnims(shape('teardrop', 860, 90, 300, 400, AQUA, { fill2: '#0a5d8a', gradType: 'radial' }), A('fade-down', { start: 'afterPrev', duration: 1200 })),
        kicker('EL CICLO URBANO DEL AGUA · 2026', 90, 170, 700, AQUA),
        text('Fuentelinda,<br>gota a gota', 90, 210, 760, 220, { fontSize: 92, fontWeight: 800, color: FG, lineHeight: 1.02, letterSpacing: -2 }),
        text('De dónde viene, cuánta gastamos y cuánta se pierde', 94, 440, 700, 90, { fontSize: 28, color: DIM })],
        notes: 'Portada: la gota es una forma con degradado radial que cae al llegar, y las olas son un dibujo SVG propio con tres capas transparentes.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...tank(0.82, AQUA, '#0a6ea8'),
        { ...text('82 %', 560, 150, 640, 190, { fontSize: 170, fontWeight: 800, color: AQUA, letterSpacing: -4 }), id: LVL },
        { ...text('Embalse del Cierzo · marzo de 2024', 566, 340, 640, 50, { fontSize: 30, color: FG }), id: CAP },
        text('96 de sus 117 hectómetros cúbicos: agua para casi tres años.', 566, 410, 600, 90, { fontSize: 24, color: DIM })],
        notes: 'El depósito está hecho con formas: el agua es un rectángulo con degradado. En la diapositiva siguiente, Transformar lo vacía.' },
      { layout: 'blank', bg: DEEP, autoAnimate: true, transition: 'fade', extra: [
        ...tank(0.39, WARN, '#a8641a'),
        { ...text('39 %', 560, 150, 640, 190, { fontSize: 170, fontWeight: 800, color: WARN, letterSpacing: -4 }), id: LVL },
        { ...text('Septiembre de 2025 · sequía', 566, 340, 640, 50, { fontSize: 30, color: FG }), id: CAP },
        ...['Riego de parques solo de noche', 'Fuentes ornamentales apagadas', 'Campaña «Cada gota cuenta» en los colegios'].map((t, i) =>
          chain(text(`<span style="color:${WARN}">●</span>&nbsp; ${t}`, 566, 420 + i * 56, 640, 46, { fontSize: 24, color: FG }), i, 'fade-left'))],
        notes: 'Transformar: el agua baja y cambia de color, y la cifra cambia (mismo id en las dos diapositivas). Luego, con un clic, las medidas de emergencia. Datos inventados.' },
      { layout: 'titleOnly', title: 'El embalse, mes a mes', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 1140, h: 500, chartType: 'line', color: AQUA, seriesName: '2024', grid: true, yMin: 0, yMax: 100, yTitle: '% de capacidad',
          data: D(MON, [80, 81, 82, 80, 76, 70, 63, 57, 52, 50, 51, 53]),
          series: [{ name: '2025', values: [54, 53, 52, 51, 49, 47, 44, 41, 39, 40, 44, 49], color: WARN }, { name: '2026', values: [55, 60, 66, 70, 71, 69, 66, 64, 63, null, null, null], color: '#9be15d' }] })],
        notes: 'Tres años en un gráfico de líneas: 2026 se corta en septiembre (valores vacíos) porque aún no ha terminado. Eje de 0 a 100 % (yMin y yMax). Datos inventados.' },
      { layout: 'titleOnly', title: 'Adónde va el agua', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 640, h: 500, chartType: 'doughnut',
          data: [{ label: 'Hogares', value: 62, color: AQUA }, { label: 'Pérdidas en la red', value: 14, color: WARN }, { label: 'Comercios', value: 9, color: '#7aa2f7' }, { label: 'Industria', value: 8, color: '#bb9af7' }, { label: 'Riego de parques', value: 7, color: '#9be15d' }] }),
        chain(card(`<div style="font-size:64px;font-weight:800;color:${WARN};line-height:1">14 %</div>se escapa por tuberías viejas antes de llegar a ningún grifo: más que todo el riego y la industria juntos.`,
          770, 200, 440, 300, PAN, { fontSize: 24, color: FG, radius: 18 }), 0, 'fade-left')],
        notes: 'Anillo con un color por uso. Las pérdidas en la red son el segundo «consumidor» de la ciudad (datos inventados).' },
      { layout: 'titleOnly', title: 'Un día en casa: 128 litros por persona', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 820, h: 500, chartType: 'hbar', color: AQUA, dataLabels: true, xTitle: 'Litros por persona y día',
          data: D(['Ducha', 'Inodoro', 'Grifos', 'Lavadora', 'Cocina y lavavajillas', 'Otros'], [38, 30, 25, 15, 12, 8]) }),
        ...[['Ducha corta', '−20 L'], ['Cisterna de doble pulsador', '−12 L'], ['Grifo cerrado al lavarse', '−8 L']].map(([t, v], i) =>
          chain(text(`<b style="color:#9be15d;font-size:30px">${v}</b><br>${t}`, 930, 190 + i * 140, 280, 110, { fontSize: 22, color: FG, bg: PAN, radius: 14, pad: [10, 18, 10, 18] }), i, 'fade-left'))],
        notes: 'Barras horizontales con el reparto de un día y tres gestos que ahorran, en cadena. Datos inventados de una encuesta de hogares.' },
      { layout: 'titleOnly', title: 'Cómo se calcula el recibo', bg: BG, transition: 'fade', extra: [
        mathBlock({ x: 70, y: 140, w: 1140, h: 150, fontSize: 34, color: FG, latex: 'R = C_{\\text{fija}} + \\sum_{i=1}^{3} m_i \\cdot p_i' }),
        tableBlock({ x: 170, y: 310, w: 940, h: 290, fontSize: 24, header: true, headBg: AQUA, headFg: DEEP, stroke: '#1d4a6e', banded: true, band: AQUA,
          rows: [['Tramo del mes', 'm³', '€ por m³', 'Importe (€)'], ['Bloque 1 · de 0 a 6 m³', '6', '0,45', '=B2*C2'], ['Bloque 2 · de 6 a 12 m³', '6', '0,85', '=B3*C3'],
            ['Bloque 3 · más de 12 m³', '3', '1,90', '=B4*C4'], ['Cuota fija', '', '', '7,5'], ['<b>Recibo del mes</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']], colW: [3.6, 1.4, 1.6, 2] }),
        text('Gastar más cuesta más por cada metro cúbico: el tercer tramo es cuatro veces el primero. Tarifas de ejemplo.', 120, 612, 1040, 60, { fontSize: 18, color: DIM, textAlign: 'center' })],
        notes: 'La ecuación del recibo por bloques y la tabla que la aplica con fórmulas (=B2*C2 y =SUMA(ARRIBA)). Un hogar de 15 m³ al mes.' },
      { layout: 'blank', bg: BG, transition: 'fade', back: [img(waves, 0, 540, 1280, 200, 'Olas')], extra: [
        text('La ducha de 4 minutos', 90, 70, 700, 80, { fontSize: 56, fontWeight: 800, color: FG }),
        text('4 minutos ≈ 40 litros<br>10 minutos ≈ 100 litros', 94, 170, 600, 100, { fontSize: 30, color: DIM, lineHeight: 1.5 }),
        timer(240, 470, 260, 300, { color: AQUA }),
        m3d('kh-WaterBottle', 920, 100, 260, 460, { autoRotate: false, motion: 'float', view: 'three' }),
        text('Lo que te ahorras en una semana:<br><b style="color:#9be15d">280 botellas de litro y medio</b>', 90, 330, 360, 160, { fontSize: 24, color: FG })],
        notes: 'Cuenta atrás de cuatro minutos (empieza sola): déjala correr mientras hablas de la ducha. La botella 3D flota al llegar. Una semana ahorrando 60 L al día son 420 L, unas 280 botellas.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 38, x: 60, y: 40, w: 1160, h: 640, time: 20, correct: [2],
        question: 'De cada 100 litros que salen de la potabilizadora, ¿cuántos se pierden en fugas?', options: ['3', '8', '14', '30'] })],
        notes: 'Concurso con puntos por rapidez. Respuesta: 14 litros, como en el anillo de los usos.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(340, 120, 600, '#0b4a75', BG, 70), img(waves, 0, 520, 1280, 200, 'Olas')], extra: [
        text('Cada gota cuenta', 90, 200, 1100, 140, { fontSize: 110, fontWeight: 800, textAlign: 'center', wordart: 'ice' }),
        text('Renovar 40 km de tuberías antes de 2030 · contadores inteligentes en todos los portales', 90, 360, 1100, 80, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Cierre con Text Art de estilo helado. La botella 3D (Microsoft, CC0) no necesita crédito.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Participatory budget of Lomaalta: a civic poster — big type, a ballot box drawn in SVG with ballots
  // that fall in, a doughnut by district, chevrons, a combo chart, a drum-roll reveal, a table with formulas and a stamp.
  data_city_budget: { name: 'Presupuestos participativos', cat: 'data', summary: 'Cartel cívico: urna con papeletas que caen, anillo, galones, combinado, resultados con redoble, tabla con fórmulas', make: () => {
    const BG = '#f5f0e6', INK = '#1b1b1e', RED = '#d7263d', YEL = '#f4b400', BLUE = '#2a4d9b', GRN = '#2a9d6f', DIM = '#5b5750', CARD = '#ffffff';
    const H = pairStacks('bold').heading;
    const urn = svgURL(420, 420, `<path d="M60 150 H360 L340 400 H80 Z" fill="${BLUE}"/><path d="M40 120 H380 V160 H40 Z" fill="#20407f"/><rect x="150" y="132" width="120" height="14" rx="7" fill="${INK}"/>`
      + `<path d="M210 220 l14 30 33 4 -24 23 6 33 -29 -16 -29 16 6 -33 -24 -23 33 -4z" fill="${YEL}"/><text x="210" y="360" font-family="sans-serif" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="6">LOMAALTA</text>`);
    const ballot = svgURL(120, 150, `<rect x="4" y="4" width="112" height="142" fill="#ffffff" stroke="${INK}" stroke-width="3"/><rect x="18" y="22" width="22" height="22" fill="none" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M20 24 L38 42 M38 24 L20 42" stroke="${RED}" stroke-width="5"/><path d="M50 33 H100 M18 70 H100 M18 90 H100 M18 110 H80" stroke="#9a948a" stroke-width="5"/>`);
    const RESULTS = [['Sombra en el patio del colegio Las Eras', 3410], ['Carril bici hasta la estación', 2980], ['Biblioteca abierta de noche en exámenes', 2640], ['Parque para perros en el distrito Sur', 2120], ['Fuentes de agua potable', 1870], ['Huertos en la azotea del mercado', 1530]];
    return numbered(build({ name: 'Lomaalta · presupuestos participativos', palette: 'office', fonts: 'bold', title: { color: INK, size: 66, font: H, bold: false }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 1280, 14, RED), shape('rect', 0, 14, 1280, 6, YEL)] }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [shape('rect', 700, -100, 260, 1000, YEL, { rotation: 18, opacity: 35 })], extra: [
        kicker('PRESUPUESTOS PARTICIPATIVOS · 2026', 80, 76, 640, RED),
        text(`<span style="text-shadow:6px 6px 0 ${INK}">TÚ<br>DECIDES</span>`, 70, 130, 680, 300, { fontFamily: H, fontSize: 150, color: RED, lineHeight: 0.95 }),
        text('2 millones de euros del presupuesto municipal, repartidos por votación vecinal', 80, 450, 560, 90, { fontSize: 28, color: INK }),
        text('Resultados de la sexta edición', 80, 560, 560, 40, { fontSize: 24, color: DIM }),
        img(urn, 800, 230, 400, 400, 'Urna azul con una estrella amarilla'),
        ...[[830, 60, -12], [1090, 40, 10], [960, 110, -4]].map(([x, y, r], i) => withAnims({ ...img(ballot, x, y, 84, 105, 'Papeleta con una cruz'), rotation: r },
          path([[Math.round((958 - x) / 2), -30], [958 - x, 290 - y]], { start: 'afterPrev', duration: 900 }), A('fade-out', { start: 'afterPrev', duration: 200, sound: 'pop' })))],
        notes: 'Portada tipo cartel: el título lleva una sombra dura y la urna es un dibujo SVG. Al llegar, tres papeletas caen una tras otra en la ranura (trayectorias) y desaparecen con un «pop».' },
      { layout: 'titleOnly', title: 'Dos millones, cinco distritos', bg: BG, transition: 'push', extra: [
        chartBlock({ x: 70, y: 160, w: 620, h: 480, chartType: 'doughnut',
          data: [{ label: 'Sur', value: 520, color: RED }, { label: 'Norte', value: 460, color: BLUE }, { label: 'Centro', value: 380, color: YEL }, { label: 'Este', value: 340, color: GRN }, { label: 'Oeste', value: 300, color: '#8e6cc9' }] }),
        chain(text(`<span style="font-family:${H};font-size:110px;color:${RED};line-height:1">2.000.000 €</span>`, 720, 200, 500, 130, { textAlign: 'right' }), 0, 'zoom-in', { sound: 'chime' }),
        text('Cada distrito recibe según su población y su renta: el Sur, con menos renta, recibe más por vecino.', 760, 360, 460, 140, { fontSize: 24, color: INK, textAlign: 'right' })],
        notes: 'Anillo con el reparto por distrito, en miles de euros (inventado). La cifra entra con una campanilla.' },
      { layout: 'titleOnly', title: 'Así se decide', bg: BG, transition: 'fade', extra: [
        dg('chevrons', 'Propones\n  Cualquier vecino desde 16 años\nEstudiamos\n  ¿Es legal, viable y municipal?\nVotas\n  Hasta 3 proyectos de tu distrito\nSe hace\n  Obras durante el año siguiente', 70, 170, 1140, 300, { oneByOne: true, colors: 'colorful', fontScale: 1.25 }),
        ...[['Febrero', '412 propuestas'], ['Abril', '96 viables'], ['Mayo', '11.200 votos'], ['2026–2027', '14 proyectos']].map(([m, d], i) =>
          chain(text(`<b style="font-family:${H};font-size:40px;color:${[RED, BLUE, '#b07d00', GRN][i]}">${m}</b><br>${d}`, 80 + i * 285, 490, 260, 110, { fontSize: 24, color: INK, textAlign: 'center' }), i, 'fade-up'))],
        notes: 'Galones uno a uno: cada clic añade una fase. Después, el calendario y las cifras de la edición (inventadas).' },
      { layout: 'titleOnly', title: 'Cada año vota más gente', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 70, y: 150, w: 820, h: 500, chartType: 'bar', combo: true, color: BLUE, seriesName: 'Votantes', grid: true, yTitle: 'Personas',
          data: D(['2021', '2022', '2023', '2024', '2025', '2026'], [3100, 4800, 6200, 5900, 8400, 11200]), series: [{ name: 'Menores de 30', values: [400, 900, 1500, 1600, 2700, 4100], color: RED }] }),
        card(`<div style="font-family:${H};font-size:80px;color:${RED};line-height:1">14 %</div>del censo mayor de 16 años votó en 2026. Los menores de 30 ya son más de un tercio.`, 930, 200, 280, 290, CARD, { fontSize: 22, color: INK, radius: 0, borderColor: INK, shadow: { x: 8, y: 8, blur: 0, color: INK } })],
        notes: 'Gráfico combinado: columnas para todos los votantes y una línea para los menores de 30. La caída de 2024 coincidió con una votación solo por internet. Datos inventados.' },
      { layout: 'titleOnly', title: 'Y los más votados son…', bg: BG, transition: 'fade', extra: [
        withAnims(chartBlock({ x: 70, y: 150, w: 780, h: 500, chartType: 'hbar', color: BLUE, dataLabels: true, labelWidth: 44, xTitle: 'Votos', data: D(RESULTS.map(r => r[0]), RESULTS.map(r => r[1])) }),
          A('fade-in', { duration: 1500, sound: 'drumroll' })),
        withAnims(card(`<div style="font-family:${H};font-size:44px;color:${RED};line-height:1.05">1.º · 3.410 votos</div>Sombra en el patio del colegio Las Eras: toldos y doce árboles antes del verano.`,
          890, 200, 320, 250, CARD, { fontSize: 22, color: INK, radius: 0, borderColor: INK, shadow: { x: 8, y: 8, blur: 0, color: RED } }), A('zoom-in', { start: 'afterPrev', duration: 500, sound: 'applause' }))],
        notes: 'Momento de los resultados: un clic y el gráfico aparece con un redoble; al terminar, entra el ganador con aplausos.' },
      { layout: 'titleOnly', title: 'Lo que cabe en dos millones', bg: BG, transition: 'fade', extra: [
        tableBlock({ x: 70, y: 160, w: 1140, h: 440, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d9d2c3', banded: true, band: YEL,
          rows: [['Proyecto', 'Votos', 'Coste (miles de €)'], ...RESULTS.slice(0, 5).map(([n, v], i) => [n, String(v).replace(/(\d)(\d{3})$/, '$1.$2'), ['520', '610', '180', '240', '150'][i]]),
            ['<b>Total aprobado</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)'], ['<b>Pasa a la siguiente edición</b>', '', '=2000-C7']], colW: [5, 2, 2.6] }),
        text('Fórmulas: =SUMA(ARRIBA) en los totales y =2000-C7 para lo que sobra. El sexto proyecto no cabe este año.', 70, 615, 1140, 40, { fontSize: 18, color: DIM })],
        notes: 'Tabla con fórmulas: si cambia el coste de un proyecto, el total y el sobrante se recalculan solos. Costes de ejemplo.' },
      { layout: 'titleOnly', title: 'Cómo van las obras', bg: BG, transition: 'fade', extra: [
        ...[['Sombra en el colegio Las Eras', 100, 'terminado', GRN], ['Carril bici hasta la estación', 45, 'en obras', YEL], ['Biblioteca abierta de noche', 100, 'terminado', GRN], ['Parque para perros', 20, 'adjudicado', BLUE], ['Fuentes de agua potable', 70, 'en obras', YEL]].map(([n, p, st, c], i) => [
          text(n, 70, 170 + i * 92, 420, 40, { fontSize: 24, color: INK, fontWeight: 700 }),
          shape('rect', 500, 172 + i * 92, 500, 34, '#e6dfd0'),
          chain(shape('rect', 500, 172 + i * 92, Math.round(5 * p), 34, c), i, 'fade-right', { duration: 600 }),
          text(`<b>${p} %</b> · ${st}`, 1020, 172 + i * 92, 220, 40, { fontSize: 20, color: INK })]).flat()],
        notes: 'Barras de avance hechas con formas, que se llenan seguidas con un clic. Estado a octubre de 2026 (inventado).' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ fontSize: 32, display: 'pie', question: '¿Qué tema pondrías en el centro de la edición de 2027?', x: 80, y: 60, w: 1120, h: 600,
        options: ['Sombra y calor', 'Juventud y ocio', 'Mayores y cuidados', 'Movilidad a pie y en bici'] })],
        notes: 'Votación con resultado en gráfico circular: el tema más votado tendrá una bolsa propia en 2027.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [shape('rect', -100, 520, 1500, 120, YEL, { rotation: -6, opacity: 45 })], extra: [
        text('GRACIAS POR DECIDIR', 40, 160, 1200, 160, { fontFamily: H, fontSize: 128, color: INK, textAlign: 'center' }),
        text('Propuestas para 2027 desde el 1 de febrero · decide.lomaalta.example', 80, 330, 1120, 50, { fontSize: 28, color: DIM, textAlign: 'center' }),
        withAnims(text('VOTADO', 870, 420, 300, 110, { fontFamily: H, fontSize: 80, color: RED, textAlign: 'center', borderColor: RED, radius: 12, pad: [6, 10, 6, 10], rotation: -12 }),
          A('zoom-in', { start: 'afterPrev', delay: 500, duration: 300, sound: 'applause' }))],
        notes: 'Cierre: el sello «VOTADO» cae con aplausos medio segundo después de llegar.' },
    ]));
  } },
};
