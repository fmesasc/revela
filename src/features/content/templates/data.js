// Example presentations: Datos. Each one: { name, summary, cat: 'data', make() } → a deck
// (see kit.js for the builders).
//
// Ten decks about data and how to show it, each with its own look: sales by
// region (bars, stacked, 100 %, combo), a satisfaction survey (doughnut, radar,
// live rating), household finances (waterfall, pie, tables with formulas), web
// metrics (lines, areas, funnel, sparklines), a market study (treemap, bubbles,
// scatter), demographics (population pyramid, histogram, horizontal bars),
// a basketball season (big figures, league table, negative bars), energy use
// (layered areas, several lines), an A/B test (scatter, labelled bars,
// significance) and a monthly executive dashboard (KPIs, traffic lights,
// small multiples). All the figures are made up (said in the notes).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base } from './kit.js';

// ---- Helpers (this file only) ---------------------------------------------------
// Chart data from labels and values.
const D = (labels, values) => labels.map((label, i) => ({ label, value: values[i] }));
// One animation: on entering the slide (after the previous one) or on a click.
const auto = (b, effect = 'fade-up', props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const click = (b, effect = 'fade-up', props = {}) => withAnims(b, A(effect, props));
// Several objects that appear together (the first one starts; the rest go with it).
const group = (blocks, effect = 'fade-up', props = {}, start = 'afterPrev') =>
  blocks.map((b, i) => withAnims(b, A(effect, { start: i ? 'withPrev' : start, ...props })));
// A big figure with its caption underneath.
const fig = (n, label, x, y, w, h, { color, fg, size = 88, labelSize = 24, align = 'center', ...props } = {}) =>
  text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="font-size:${labelSize}px;margin-top:8px">${label}</div>`,
    x, y, w, h, { fontSize: labelSize, color: fg, textAlign: align, ...props });
// A legend line: a coloured dot and its text.
const key = (label, color, x, y, w, { fg, size = 26, ...props } = {}) =>
  text(`<span style="color:${color}">●</span>&nbsp; ${label}`, x, y, w, Math.round(size * 1.7), { fontSize: size, color: fg, ...props });
// Pie and doughnut slices, each with its own colour (the legend is drawn apart, as text).
const slices = (labels, values, colors) => labels.map((label, i) => ({ label, value: values[i], color: colors[i] }));
// A sparkline: a tiny area chart with no labels, its floor raised so the shape shows.
const spark = (values, x, y, w, h, color, type = 'area') => {
  const lo = Math.min(...values), hi = Math.max(...values), floor = type === 'bar' ? 0 : lo - (hi - lo) * 0.35;
  return chartBlock({ x, y, w, h, chartType: type, color, data: values.map(v => ({ label: '', value: +(v - floor).toFixed(3) })) });
};
// Two scatter series on the same axes: two charts one over the other, the one
// with the smaller top value shorter so both share the scale (all values ≥ 0,
// and both reach the same largest x).
const scatterPair = (a, b, x, y, w, h, ca, cb) => {
  const top = s => Math.max(1, ...s.map(p => p[1])), M = Math.max(top(a), top(b)), floor = y + h * 54 / 60;
  const one = (s, c) => { const hh = h * top(s) / M; return chartBlock({ x, y: Math.round(floor - hh * 54 / 60), w, h: Math.round(hh), chartType: 'scatter', color: c, data: s.map(([px, py]) => ({ label: String(px), value: py })) }); };
  return [one(a, ca), one(b, cb)];
};

// =====================================================================================
// 1 · Sales by region: corporate white and blue.
const salesRegions = () => {
  const F = pairStacks('modern'), BLUE = '#156082', ORANGE = '#e97132', GREEN = '#196b24', INK = '#1f1f1f', MUTED = '#5f6b76';
  const R = ['Norte', 'Centro', 'Este', 'Sur', 'Islas'];
  const Q = [[980, 1320, 1050, 610, 150], [1040, 1380, 1120, 680, 160], [1100, 1450, 1210, 760, 210], [1230, 1610, 1340, 820, 180]];
  const tot = R.map((_, i) => Q.reduce((a, q) => a + q[i], 0));            // 4350 5760 4720 2870 700 → 18.400
  const LINES = [[1900, 2100, 1800, 1650, 450], [1450, 2660, 1320, 720, 170], [1000, 1000, 1600, 500, 80]];
  const GOAL = [4200, 5500, 5000, 2700, 800];
  const kpi = (n, label, delta, good, x, c) => group([
    shape('rect', x, 190, 255, 270, '#f4f8fb', { stroke: '#d9e4ec', strokeWidth: 2 }),
    shape('rect', x, 190, 255, 8, c),
    text(`<div style="font-size:44px;font-weight:800;line-height:1.1;color:${c}">${n}</div><div style="font-size:22px;color:${INK};margin-top:10px">${label}</div>`
      + `<div style="font-size:18px;font-weight:700;margin-top:18px;color:${good ? GREEN : '#c0392b'}">${delta}</div>`, x + 22, 225, 215, 220, { fontSize: 22, color: INK, fontFamily: F.heading })]);
  return numbered(build({ name: 'Informe de ventas por región 2026', palette: 'office', fonts: 'modern', title: { size: 44, color: BLUE },
    decor: p => [shape('rect', 0, 0, 1280, 8, p.accents[0]), text('Informe comercial 2026 · Datos ficticios', 820, 680, 420, 28, { fontSize: 16, color: '#8a96a0', textAlign: 'right' })] }, [
    { layout: 'blank', transition: 'fade', extra: [
      shape('rect', 0, 0, 600, 720, BLUE, { fill2: '#0f9ed5', gradAngle: 135 }),
      shape('ellipse', 300, 430, 420, 420, '#ffffff', { opacity: 8 }), shape('ellipse', -120, -140, 360, 360, '#ffffff', { opacity: 6 }),
      text('INFORME ANUAL · 2026', 70, 160, 440, 36, { fontSize: 20, letterSpacing: 5, color: '#cfe8f5' }),
      text('Ventas<br>por región', 70, 205, 500, 210, { fontSize: 76, lineHeight: 1.02, fontFamily: F.heading, color: '#ffffff', fontWeight: 800 }),
      text('Cinco regiones, cuatro trimestres y tres líneas de producto', 70, 450, 460, 90, { fontSize: 26, color: '#e6f3fa' }),
      auto(chartBlock({ x: 660, y: 110, w: 540, h: 360, chartType: 'bar', color: BLUE, data: D(R, tot), dataLabels: true }), 'grow', { duration: 900, delay: 200 }),
      auto(text('18,4 M€', 660, 490, 540, 90, { fontSize: 76, fontWeight: 800, color: BLUE, fontFamily: F.heading }), 'zoom-in'),
      auto(text('facturación total · <b style="color:#196b24">+12 %</b> sobre 2025', 664, 585, 540, 40, { fontSize: 24, color: MUTED }), 'fade-in')],
      notes: 'Todas las cifras de este informe son ficticias. Con el primer clic el gráfico de la portada crece (animación «Crecer») y la cifra total aparece detrás, en cadena; resume la facturación anual por región en miles de euros.' },
    { title: 'El año en cuatro cifras', layout: 'titleOnly', extra: [
      ...kpi('18,4 M€', 'facturación total', '▲ 12 % sobre 2025', true, 100, BLUE),
      ...kpi('31 %', 'de las ventas, en Centro', '▲ 2 puntos', true, 375, ORANGE),
      ...kpi('3 de 5', 'regiones sobre objetivo', '▼ Este e Islas no llegan', false, 650, GREEN),
      ...kpi('2.140', 'clientes activos', '▲ 180 nuevos', true, 925, '#0f9ed5'),
      click(text('Centro y Norte tiran del año; <b>Este e Islas</b> se quedan por debajo del objetivo y marcan las prioridades de 2027.', 100, 510, 1080, 100, { fontSize: 28, color: INK }), 'fade-in')],
      notes: 'Con un clic las cuatro tarjetas entran una tras otra, encadenadas («Después de la anterior»). La frase final llega con el segundo clic: es el mensaje que queremos que se lleven.' },
    { title: 'Ventas por región y trimestre', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'bar', color: '#b7d4e8', seriesName: 'T1', data: D(R, Q[0]), grid: true, xTitle: 'Región', yTitle: 'Miles de euros',
        series: [{ name: 'T2', values: Q[1], color: '#79add1' }, { name: 'T3', values: Q[2], color: '#3a86b8' }, { name: 'T4', values: Q[3], color: BLUE }] }), 'fade-up', { duration: 900 })],
      notes: 'Barras agrupadas con cuatro series, cuadrícula y títulos de los ejes. Del azul claro al oscuro: el año avanza. Todas las regiones crecen trimestre a trimestre salvo Islas en el T4.' },
    { title: 'Qué vende cada región', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'stacked', color: BLUE, seriesName: 'Hogar', data: D(R, LINES[0]), grid: true, dataLabels: true, yTitle: 'Miles de euros',
        series: [{ name: 'Oficina', values: LINES[1], color: ORANGE }, { name: 'Industrial', values: LINES[2], color: GREEN }] }), 'fade-up', { duration: 900 })],
      notes: 'Barras apiladas con etiquetas de datos: cada columna es el total de la región y cada color, una línea de producto (miles de euros, datos ficticios).' },
    { title: 'El peso de cada línea, en porcentaje', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 700, h: 490, chartType: 'stacked100', color: BLUE, seriesName: 'Hogar', data: D(R, LINES[0]), dataLabels: true,
        series: [{ name: 'Oficina', values: LINES[1], color: ORANGE }, { name: 'Industrial', values: LINES[2], color: GREEN }] }), 'fade-right', { duration: 800 }),
      click(card('<b>Centro</b> vive de la oficina: el 46 % de sus ventas.', 840, 190, 340, 130, '#fdf1ea', { fontSize: 24, color: INK, borderColor: ORANGE }), 'fade-left'),
      click(card('<b>Este</b> lidera en industria, con un 34 %.', 840, 345, 340, 130, '#eaf3ec', { fontSize: 24, color: INK, borderColor: GREEN }), 'fade-left'),
      click(card('<b>Sur e Islas</b> dependen del hogar: 57 % y 64 %.', 840, 500, 340, 130, '#e8f1f7', { fontSize: 24, color: INK, borderColor: BLUE }), 'fade-left')],
      notes: 'Barras apiladas al 100 %: comparan la mezcla y no el tamaño. Cada clic añade una lectura del gráfico.' },
    { title: 'Ventas frente a objetivo', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 420, chartType: 'bar', combo: true, color: BLUE, seriesName: 'Ventas', data: D(R, tot), grid: true, yTitle: 'Miles de euros',
        series: [{ name: 'Objetivo', values: GOAL, color: ORANGE }] }), 'fade-up', { duration: 900 }),
      auto(text('Norte <b style="color:#196b24">+4 %</b> · Centro <b style="color:#196b24">+5 %</b> · Este <b style="color:#c0392b">−6 %</b> · Sur <b style="color:#196b24">+6 %</b> · Islas <b style="color:#c0392b">−13 %</b>', 100, 608, 1080, 44, { fontSize: 26, color: INK, textAlign: 'center' }), 'fade-in')],
      notes: 'Gráfico combinado: las ventas en barras y el objetivo como línea sobre ellas (Gráfico ▸ Combinado). Debajo, la desviación de cada región respecto a su objetivo.' },
    { title: 'Detalle por región', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 180, w: 1080, h: 406, fontSize: 26, header: true, banded: true, firstCol: true, headBg: BLUE, headFg: '#ffffff', band: BLUE, bandAlpha: 0.1, stroke: '#d0dbe4',
        cellPad: [10, 16, 10, 16], colW: [2.2, 1.4, 1.4, 1.4, 1.4, 1.8],
        rows: [['Región', 'T1', 'T2', 'T3', 'T4', 'Total'],
          ...R.map((r, i) => [r, ...Q.map(q => q[i] + ' k€'), '=SUMA(IZQUIERDA)']),
          ['Total', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }), 'fade-in', { duration: 700 }),
      text('La columna y la fila «Total» son fórmulas (=SUMA(IZQUIERDA) y =SUMA(ARRIBA)): cambia una cifra y se recalculan.', 100, 606, 1080, 36, { fontSize: 20, color: MUTED })],
      notes: 'Tabla con estilo de bandas, fila de encabezado, primera columna en negrita y fila de totales calculada con fórmulas.' },
    { title: 'Prioridades para 2027', layout: 'titleOnly', transition: 'zoom', extra: [
      dg('cards', 'Este\n  Recuperar la industria con dos comerciales más\nIslas\n  Tienda en línea con envío en 48 horas\nCentro\n  Mantener la oficina y crecer en hogar', 100, 180, 1080, 440, { oneByOne: true, colors: 'colorful' })],
      notes: 'Diagrama de tarjetas que aparece una a una con cada clic. Cierra con una propuesta por región.' },
  ]));
};

// =====================================================================================
// 2 · Satisfaction survey: dark violet, friendly and playful.
const survey = () => {
  const F = pairStacks('friendly'), BG = '#1b1030', FG = '#f3eefe', SOFT = '#d4c6f2', YEL = '#fee440', PINK = '#f15bb5', CYAN = '#00bbf9', MINT = '#00f5d4', VIO = '#9b5de5';
  const ASPECTS = ['Atención', 'Precio', 'Rapidez', 'Calidad', 'Web', 'Entrega'];
  return numbered(build({ name: 'Encuesta de satisfacción 2026', palette: 'violet', fonts: 'friendly', title: { size: 46, color: YEL },
    decor: p => [glow(-260, -260, 620, VIO, p.bg, 30), glow(1090, 560, 400, PINK, p.bg, 18)] }, [
    { layout: 'blank', transition: 'zoom', extra: [
      text('ENCUESTA DE CLIENTES · 2026', 90, 210, 760, 40, { fontSize: 22, letterSpacing: 6, color: MINT }),
      text('¿Cómo lo<br>estamos haciendo?', 90, 260, 800, 220, { fontSize: 76, lineHeight: 1.08, fontFamily: F.heading, fontWeight: 800, color: '#ffffff' }),
      text('1.284 clientes nos han contado su experiencia', 90, 510, 760, 50, { fontSize: 30, color: SOFT }),
      auto(shape('smiley', 920, 230, 280, 280, YEL, { sketch: true, stroke: '#1b1030', strokeWidth: 5, rotation: 8 }), 'bounce', { duration: 900, sound: 'pop' }),
      auto(shape('star', 1110, 160, 90, 90, PINK, { sketch: true, stroke: '#1b1030', strokeWidth: 4, rotation: -12 }), 'zoom-in'),
      auto(shape('heart', 880, 510, 90, 90, CYAN, { sketch: true, stroke: '#1b1030', strokeWidth: 4, rotation: -10 }), 'zoom-in')],
      notes: 'Resultados de una encuesta inventada a 1.284 clientes. Al primer clic la cara sonriente cae rebotando, con sonido, y detrás aparecen la estrella y el corazón.' },
    { title: 'Quién ha respondido', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 110, y: 170, w: 470, h: 470, chartType: 'doughnut', legend: false, data: slices(['Web', 'App', 'Tienda', 'Teléfono'], [46, 28, 17, 9], [CYAN, PINK, YEL, MINT]) }), 'spin', { duration: 900 }),
      text('<b style="font-size:40px">1.284</b><br>respuestas', 245, 365, 200, 90, { fontSize: 22, color: FG, textAlign: 'center' }),
      ...[['Web', 46], ['App', 28], ['Tienda', 17], ['Teléfono', 9]].map(([l, v], i) =>
        auto(key(`<b>${v} %</b> · ${l}`, [CYAN, PINK, YEL, MINT][i], 680, 210 + i * 70, 460, { fg: FG, size: 32 }), 'fade-left', { duration: 400 })),
      auto(card('Edad media: <b>41 años</b> · Mujeres: <b>54 %</b> · Primera compra este año: <b>22 %</b>', 680, 520, 500, 110, '#2a1a4a', { fontSize: 22, color: SOFT }), 'fade-up')],
      notes: 'Gráfico de anillo con el canal por el que respondieron. El anillo gira al aparecer y la leyenda entra punto a punto.' },
    { title: 'La nota global', layout: 'titleOnly', extra: [
      auto(text(`<span style="font-size:190px;font-weight:800;color:${YEL};line-height:1">8,1</span><span style="font-size:56px;color:${SOFT}"> / 10</span>`, 100, 170, 560, 240, { fontSize: 40, fontFamily: F.heading, color: FG }), 'zoom-in', { duration: 700, sound: 'chime' }),
      ...[0, 1, 2, 3, 4].map(i => auto(shape('star', 110 + i * 100, 430, 84, 84, YEL, { opacity: i === 4 ? 25 : 100 }), 'bounce', { duration: 500 })),
      shape('rounded', 720, 190, 460, 430, '#2a1a4a', { radius: 24 }),
      text('Recomendación neta (NPS)', 760, 215, 400, 40, { fontSize: 24, color: SOFT }),
      auto(text('+42', 760, 255, 400, 120, { fontSize: 110, fontWeight: 800, color: MINT, fontFamily: F.heading }), 'zoom-in', { sound: 'pop' }),
      ...group([shape('rect', 760, 420, 210, 46, MINT), shape('rect', 970, 420, 125, 46, '#8a7fa8'), shape('rect', 1095, 420, 50, 46, PINK)], 'fade-right', { duration: 700 }),
      text(`<span style="color:${MINT}">●</span> Promotores 55 %<br><span style="color:#8a7fa8">●</span> Pasivos 32 %<br><span style="color:${PINK}">●</span> Detractores 13 %`, 760, 485, 400, 120, { fontSize: 22, color: FG, lineHeight: 1.45 })],
      notes: 'La media de las 1.284 notas es 8,1. El NPS es el porcentaje de promotores menos el de detractores: 55 − 13 = 42.' },
    { title: 'Por aspecto: 2025 frente a 2026', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 110, y: 180, w: 440, h: 440, chartType: 'radar', color: CYAN, data: D(ASPECTS, [7.2, 6.1, 6.8, 8.4, 5.9, 7.0]) }), 'fade-right', { duration: 700 }),
      text('2025', 110, 620, 440, 44, { fontSize: 28, color: CYAN, textAlign: 'center', fontWeight: 700 }),
      auto(shape('rightarrow', 590, 370, 90, 60, YEL), 'fade-right'),
      auto(chartBlock({ x: 720, y: 180, w: 440, h: 440, chartType: 'radar', color: PINK, data: D(ASPECTS, [8.4, 6.5, 7.9, 8.3, 7.6, 8.1]) }), 'fade-left', { duration: 700 }),
      text('2026', 720, 620, 440, 44, { fontSize: 28, color: PINK, textAlign: 'center', fontWeight: 700 })],
      notes: 'Dos gráficos de radar con la nota media de cada aspecto (sobre 10). La web pasa de 5,9 a 7,6 y la atención de 7,2 a 8,4; el precio sigue siendo lo más flojo.' },
    { title: 'Cómo se reparten las notas', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'bar', color: MINT, seriesName: 'Respuestas', grid: true, dataLabels: true, xTitle: 'Nota (de 1 a 10)', yTitle: 'Respuestas',
        data: D(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], [12, 9, 18, 25, 41, 78, 162, 318, 356, 265]) }), 'fade-up', { duration: 900 }),
      auto(card(`<b style="color:${YEL};font-size:44px">73 %</b><br>nos pone un 8 o más`, 260, 190, 330, 140, '#2a1a4aee', { fontSize: 24, color: FG }), 'zoom-in')],
      notes: 'Columnas con cuadrícula, etiquetas de datos y títulos en los dos ejes. 939 de 1.284 respuestas están entre el 8 y el 10.' },
    { title: 'Lo que más valoran', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 440, chartType: 'hbar', color: PINK, dataLabels: true,
        data: D(['Trato del personal', 'Calidad', 'Entrega rápida', 'Precio', 'Web fácil', 'Devoluciones'], [64, 58, 47, 31, 29, 18]) }), 'fade-right', { duration: 900 }),
      text('% de clientes que lo menciona (pregunta abierta, varias respuestas posibles)', 100, 620, 1080, 36, { fontSize: 20, color: SOFT })],
      notes: 'Barras horizontales con etiquetas de datos: cuando las categorías tienen nombres largos se leen mejor así.' },
    { layout: 'blank', extra: [
      pollBlock({ kind: 'rating', question: 'Y tú, ¿qué nota nos pones? (de 1 a 5)', fontSize: 36, x: 80, y: 60, w: 1120, h: 600 })],
      notes: 'Votación en directo de tipo valoración: el público responde desde el móvil con el código y la media aparece al momento.' },
    { layout: 'blank', extra: [
      pollBlock({ kind: 'word', question: 'Resume en una palabra tu experiencia con nosotros', options: [], fontSize: 36, x: 80, y: 60, w: 1120, h: 600 })],
      notes: 'Nube de palabras en directo: las palabras más repetidas se ven más grandes.' },
    { title: 'Plan de mejora', layout: 'titleOnly', transition: 'convex', extra: [
      dg('steps', 'Web\n  Nuevo buscador en noviembre\nPrecio\n  Programa de puntos para clientes fieles\nDevoluciones\n  Recogida gratis en casa', 100, 180, 1080, 450, { oneByOne: true, colors: 'colorful' })],
      notes: 'Diagrama de escalera, un peldaño por clic: tres cambios ligados a lo que peor puntúa.' },
  ]));
};

// =====================================================================================
// 3 · Household finances: warm paper and a classic serif.
const finance = () => {
  const F = pairStacks('classic'), INK = '#3b3228', BROWN = '#b5651d', OLIVE = '#6b8e23', STEEL = '#4682b4', PLUM = '#8b3a62', MUTED = '#7a6a58';
  const OUT = [['Vivienda', 850], ['Alimentación', 575], ['Seguros y otros', 253], ['Ocio', 190], ['Suministros', 172], ['Transporte', 160]];
  const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const IN = [2600, 2600, 2600, 2600, 2600, 3900, 2600, 2600, 2600, 2600, 2600, 3900];
  const SPEND = [2350, 2180, 2240, 2300, 2210, 2620, 2890, 2400, 2200, 2260, 2310, 2950];
  const SLICE = [BROWN, OLIVE, STEEL, PLUM, '#cd853f', '#8a9a5b'];
  let run = 0; const SAVED = IN.map((v, i) => (run += v - SPEND[i]));                 // … 4.890 € a fin de año
  return numbered(build({ name: 'Las cuentas de casa', palette: 'paper', fonts: 'classic', title: { size: 50, color: INK },
    decor: p => [shape('rect', 60, 686, 1160, 2, p.accents[0])] }, [
    { layout: 'blank', transition: 'fade', extra: [
      text('LAS CUENTAS DE CASA', 90, 170, 640, 36, { fontSize: 22, letterSpacing: 6, color: BROWN }),
      text('Un año de<br>finanzas personales', 90, 215, 700, 230, { fontSize: 76, lineHeight: 1.08, fontFamily: F.heading, color: INK }),
      text('Ingresos, gastos y ahorro de una familia de cuatro', 92, 465, 720, 50, { fontSize: 26, fontStyle: 'italic', color: PLUM }),
      shape('line', 92, 530, 260, 10, 'none', { stroke: BROWN, strokeWidth: 3 }),
      ...[0, 1, 2, 3, 4, 5].map(i => auto(shape('ellipse', 880, 520 - i * 44, 250, 80, '#cd853f', { fill2: '#f0c987', gradAngle: 90, stroke: '#8b5a2b', strokeWidth: 2 }),
        'fade-down', { duration: 350, ...(i === 0 && { delay: 300 }), sound: 'click' })),
      auto(text('€', 880, 278, 250, 80, { fontSize: 56, fontWeight: 700, color: '#8b5a2b', textAlign: 'center', fontFamily: F.heading }), 'zoom-in'),
      auto(text('+400 € al mes', 800, 150, 420, 80, { fontSize: 50, fontFamily: F.heading, wordart: 'gold', textAlign: 'center' }), 'fade-up')],
      notes: 'Una familia inventada con datos verosímiles. Con un clic las monedas se apilan una tras otra, con un pequeño sonido en cada una.' },
    { title: 'Septiembre: previsto y real', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 180, w: 720, h: 448, fontSize: 24, header: true, lines: true, headBg: INK, headFg: '#f7f1e3', stroke: '#c9bfae', cellPad: [10, 14, 10, 14], colW: [3, 2, 2, 2.2],
        rows: [['Concepto', 'Previsto', 'Real', 'Diferencia'],
          ['Vivienda', '850 €', '850 €', '=C2-B2'], ['Alimentación', '520 €', '575 €', '=C3-B3'], ['Transporte', '180 €', '160 €', '=C4-B4'],
          ['Suministros', '160 €', '172 €', '=C5-B5'], ['Ocio', '150 €', '190 €', '=C6-B6'], ['Seguros y otros', '240 €', '253 €', '=C7-B7'],
          ['<b>Total gastos</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }), 'fade-in', { duration: 700 }),
      click(card(`<div style="font-size:64px;font-family:inherit;color:${PLUM};line-height:1.1"><b>+100 €</b></div>de desviación: la comida y el ocio se escapan del plan; el transporte, en cambio, ahorra.`,
        860, 190, 320, 300, '#efe5cf', { fontSize: 24, color: INK, borderColor: '#d8c9a8' }), 'fade-left')],
      notes: 'Tabla de estilo «Mínima» (solo líneas horizontales) con fórmulas: Diferencia = Real − Previsto (=C2-B2) y totales con =SUMA(ARRIBA). Cambia un importe y todo se recalcula.' },
    { title: 'Del sueldo al ahorro', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 480, chartType: 'waterfall', color: OLIVE,
        data: [{ label: 'Sueldos', value: 2600 }, ...OUT.map(([, v], i) => ({ label: ['Casa', 'Comida', 'Seguros', 'Ocio', 'Luz y agua', 'Bus y coche'][i], value: -v })), { label: 'Total ahorro', value: 0 }] }), 'fade-up', { duration: 900 })],
      notes: 'Gráfico de cascada: cada gasto resta desde donde acabó el anterior y la barra «Total» muestra lo que queda, 400 € al mes.' },
    { title: '¿Adónde va cada euro?', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 110, y: 175, w: 460, h: 460, chartType: 'pie', legend: false, data: slices(OUT.map(o => o[0]), OUT.map(o => o[1]), SLICE) }), 'spin', { duration: 900 }),
      ...OUT.map(([l, v], i) => auto(key(`${l} · <b>${v} €</b> · ${(v / 22).toFixed(1).replace('.', ',')} %`, SLICE[i], 650, 200 + i * 66, 540, { fg: INK, size: 28 }), 'fade-left', { duration: 350 }))],
      notes: 'Gráfico circular de los 2.200 € de gasto de septiembre, con la leyenda en porcentaje. La vivienda se lleva casi cuatro de cada diez euros.' },
    { title: 'El año, mes a mes', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'line', color: OLIVE, seriesName: 'Ingresos', data: D(MONTHS, IN), grid: true, xTitle: 'Mes', yTitle: 'Euros al mes',
        series: [{ name: 'Gastos', values: SPEND, color: BROWN }] }), 'fade-right', { duration: 1000 })],
      notes: 'Dos series en un gráfico de líneas. Los picos de ingresos son las pagas extra de junio y diciembre; el de gastos de julio, las vacaciones.' },
    { title: 'Media, máximo y mínimo', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 170, w: 760, h: 470, fontSize: 22, header: true, banded: true, firstCol: true, headBg: BROWN, headFg: '#ffffff', band: BROWN, bandAlpha: 0.12, stroke: '#d8c9a8', colW: [2, 2, 2, 2],
        rows: [['Mes', 'Alimentación', 'Ocio', 'Transporte'], ['Enero', '540 €', '140 €', '170 €'], ['Febrero', '505 €', '120 €', '165 €'], ['Marzo', '530 €', '150 €', '180 €'],
          ['Abril', '560 €', '175 €', '160 €'], ['Mayo', '515 €', '135 €', '155 €'], ['Junio', '610 €', '260 €', '190 €'],
          ['Media', '=PROMEDIO(B2:B7)', '=PROMEDIO(C2:C7)', '=PROMEDIO(D2:D7)'], ['Máximo', '=MAX(B2:B7)', '=MAX(C2:C7)', '=MAX(D2:D7)'], ['Mínimo', '=MIN(B2:B7)', '=MIN(C2:C7)', '=MIN(D2:D7)']] }), 'fade-in'),
      click(card(`<b style="color:${PLUM}">Junio</b> dispara el ocio: vacaciones y dos cumpleaños.<br><br><b style="color:${OLIVE}">El transporte</b> apenas se mueve: es un gasto fijo.`, 900, 190, 280, 400, '#efe5cf', { fontSize: 24, color: INK, borderColor: '#d8c9a8' }), 'fade-left')],
      notes: 'Las tres últimas filas son fórmulas con rangos: =PROMEDIO(B2:B7), =MAX(B2:B7) y =MIN(B2:B7). Tabla con bandas y primera columna resaltada.' },
    { title: 'El colchón crece', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'area', color: STEEL, seriesName: 'Ahorro acumulado', data: D(MONTHS, SAVED), grid: true, dataLabels: true, yTitle: 'Euros ahorrados' }), 'fade-up', { duration: 1000 }),
      auto(fig('4.890 €', 'ahorrados en el año', 230, 200, 420, 140, { color: STEEL, fg: INK, size: 64, align: 'left', fontFamily: F.heading }), 'zoom-in', { sound: 'chime' })],
      notes: 'Gráfico de área con etiquetas de datos: el ahorro acumulado mes a mes. Julio es el único mes que baja.' },
    { title: 'La regla que nos funciona', layout: 'titleOnly', transition: 'page', extra: [
      dg('pyramid', 'Ahorro\nCaprichos\nNecesidades', 100, 175, 620, 470, { oneByOne: true, colors: 'colorful' }),
      ...[['20 % ahorro', 'Lo primero, el mismo día de cobro', BROWN], ['30 % caprichos', 'Ocio, ropa, regalos y viajes', OLIVE], ['50 % necesidades', 'Casa, comida, transporte y facturas', STEEL]].map(([h, t, c], i) =>
        click(text(`<b style="color:${c}">${h}</b><br>${t}`, 780, 200 + i * 145, 400, 120, { fontSize: 26, color: INK }), 'fade-left'))],
      notes: 'La regla 50/30/20 como pirámide que se construye con cada clic. Datos y familia inventados.' },
  ]));
};

// =====================================================================================
// 4 · Web and digital marketing metrics: ocean blue, technical type, blueprint grid.
const webMetrics = () => {
  const F = pairStacks('tech'), BG = '#0f2940', FG = '#f2f6fa', SOFT = '#a9c3dc', MINT = '#50e3c2', BLUE = '#4a90d9', SKY = '#7fb8e6', AMB = '#f5a623', VIO = '#9b6cf0', CARD = '#16365a';
  const W = Array.from({ length: 12 }, (_, i) => 'S' + (i + 1));
  const kpi = (label, n, delta, good, values, x, c) => group([
    shape('rounded', x, 180, 255, 330, CARD, { radius: 16, stroke: '#24507c', strokeWidth: 2 }),
    text(`<div style="font-size:18px;color:${SOFT};letter-spacing:2px">${label}</div><div style="font-size:46px;font-weight:700;color:#ffffff;line-height:1.2;margin-top:6px">${n}</div>`
      + `<div style="font-size:20px;color:${good ? MINT : '#ff7b7b'};margin-top:4px">${delta}</div>`, x + 20, 198, 220, 150, { fontSize: 20, color: FG, fontFamily: F.heading }),
    spark(values, x + 16, 370, 223, 120, c)], 'fade-up', { duration: 500 });
  return numbered(build({ name: 'Métricas web · T3 2026', palette: 'ocean', fonts: 'tech', title: { size: 44, color: MINT },
    decor: () => [...Array.from({ length: 16 }, (_, i) => shape('rect', i * 80 + 40, 0, 1, 720, '#ffffff0a')), ...Array.from({ length: 9 }, (_, i) => shape('rect', 0, i * 80 + 40, 1280, 1, '#ffffff0a'))] }, [
    { layout: 'blank', transition: 'fade', extra: [
      glow(640, -160, 760, BLUE, BG, 45),
      text('MARKETING DIGITAL · T3 2026', 90, 190, 560, 36, { fontSize: 22, letterSpacing: 5, color: MINT }),
      text('Tráfico,<br>clics y ventas', 90, 235, 600, 220, { fontSize: 80, lineHeight: 1.05, fontFamily: F.heading, fontWeight: 700, color: '#ffffff' }),
      text('Informe trimestral de la tienda en línea', 92, 470, 560, 44, { fontSize: 28, color: SOFT }),
      auto({ ...base(690, 170, 520, 360), type: 'image', src: appScreen(1280, 880, BLUE, 'Analítica · T3', 3), alt: 'Panel de analítica web en un navegador', fit: 'cover', device: 'browser' }, 'fade-left', { duration: 800 })],
      notes: 'Informe de una tienda en línea inventada. La captura del panel va dentro del marco de navegador (Imagen ▸ Dispositivo).' },
    { title: 'El trimestre de un vistazo', layout: 'titleOnly', extra: [
      ...kpi('SESIONES', '482.000', '▲ 18 % frente al T2', true, [300, 320, 310, 350, 380, 400, 420, 410, 450, 482], 100, BLUE),
      ...kpi('CONVERSIÓN', '2,6 %', '▲ 0,4 puntos', true, [2.0, 2.1, 2.1, 2.2, 2.3, 2.2, 2.4, 2.5, 2.5, 2.6], 375, MINT),
      ...kpi('COSTE POR VENTA', '14,20 €', '▼ 9 % (mejor)', true, [17, 16.5, 16.8, 16, 15.5, 15.2, 15, 14.8, 14.5, 14.2], 650, AMB),
      ...kpi('REBOTE', '41 %', '▲ 3 puntos (peor)', false, [38, 38, 39, 38, 40, 39, 40, 41, 40, 41], 925, '#ff7b7b'),
      click(text('Más visitas y más baratas. El rebote sube en el móvil: es la tarea del T4.', 100, 550, 1080, 80, { fontSize: 28, color: FG }), 'fade-in')],
      notes: 'Cuatro indicadores con su minigráfico de las últimas diez semanas (gráficos de área pequeños, sin etiquetas). Entran uno tras otro.' },
    { title: 'Sesiones por semana y canal', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'line', color: BLUE, seriesName: 'Orgánico', data: D(W, [18, 19, 21, 20, 22, 24, 23, 25, 27, 26, 28, 30]), grid: true,
        xTitle: 'Semana del trimestre', yTitle: 'Miles de sesiones',
        series: [{ name: 'Pago', values: [9, 10, 10, 12, 13, 12, 14, 15, 15, 16, 17, 18], color: AMB }, { name: 'Redes', values: [4, 5, 7, 6, 8, 9, 11, 10, 12, 13, 12, 14], color: MINT },
          { name: 'Email', values: [3, 3, 4, 3, 4, 4, 5, 4, 5, 5, 6, 6], color: VIO }] }), 'fade-right', { duration: 1100 })],
      notes: 'Líneas con cuatro series, cuadrícula y títulos de ejes. Las redes sociales casi triplican sus visitas en el trimestre.' },
    { title: 'Móvil y ordenador', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'area', color: SKY, seriesName: 'Móvil', data: D(W, [20, 22, 24, 23, 26, 28, 29, 31, 33, 34, 36, 39]), grid: true, yTitle: 'Miles de sesiones',
        series: [{ name: 'Ordenador', values: [14, 15, 18, 18, 21, 21, 24, 23, 26, 26, 27, 29], color: AMB }] }), 'fade-up', { duration: 1000 }),
      auto(card('<b>57 %</b> de las visitas ya llega desde el móvil', 160, 190, 360, 100, '#0f2940dd', { fontSize: 24, color: FG, borderColor: SKY }), 'zoom-in')],
      notes: 'Gráfico de áreas con dos series superpuestas y transparentes: se ven las dos aunque se crucen.' },
    { title: 'Del clic a la compra', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 175, w: 660, h: 470, chartType: 'funnel', color: MINT,
        data: D(['Visitas', 'Ven un producto', 'Al carrito', 'Inician el pago', 'Compran'], [482000, 196000, 38500, 16900, 12530]) }), 'fade-down', { duration: 900 }),
      ...[['Visita → producto', '40,7 %', FG], ['Producto → carrito', '19,6 %', '#ff7b7b'], ['Carrito → pago', '43,9 %', FG], ['Pago → compra', '74,1 %', FG]].map(([l, v, c], i) =>
        click(text(`<span style="color:${SOFT}">${l}</span><br><b style="font-size:34px;color:${c}">${v}</b>`, 820, 180 + i * 115, 360, 105, { fontSize: 22, color: FG }), 'fade-left'))],
      notes: 'Gráfico de embudo con cada etapa. Con cada clic aparece la tasa de paso; la fuga grande está entre ver el producto y añadirlo al carrito.' },
    { title: 'Inversión e ingresos por canal', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 430, chartType: 'bar', combo: true, color: BLUE, seriesName: 'Inversión', grid: true, dataLabels: true, yTitle: 'Miles de euros',
        data: D(['Buscadores', 'Redes', 'Afiliados', 'Email'], [18, 12, 6, 2]), series: [{ name: 'Ingresos', values: [74, 41, 22, 19], color: AMB }] }), 'fade-up', { duration: 900 }),
      auto(text('Retorno por euro invertido: Buscadores <b>4,1</b> · Redes <b>3,4</b> · Afiliados <b>3,7</b> · Email <b style="color:#50e3c2">9,5</b>', 100, 615, 1080, 40, { fontSize: 24, color: FG, textAlign: 'center' }), 'fade-in')],
      notes: 'Gráfico combinado con etiquetas: la inversión en barras y los ingresos en línea. El email es pequeño pero el más rentable.' },
    { title: 'Rendimiento de las campañas', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 180, w: 1080, h: 372, fontSize: 26, header: true, banded: true, headBg: MINT, headFg: BG, band: BLUE, bandAlpha: 0.22, stroke: '#24507c', cellPad: [12, 18, 12, 18], colW: [3, 2, 2, 2.4],
        rows: [['Campaña', 'Inversión (€)', 'Ventas', 'Coste por venta (€)'], ['Vuelta al cole', '4.200', '310', '=REDONDEAR(B2/C2;2)'], ['Rebajas de verano', '6.800', '520', '=REDONDEAR(B3/C3;2)'],
          ['Clientes fieles', '1.500', '240', '=REDONDEAR(B4/C4;2)'], ['Lanzamiento de otoño', '5.300', '295', '=REDONDEAR(B5/C5;2)'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=REDONDEAR(B6/C6;2)']] }), 'fade-in'),
      text('«Coste por venta» = Inversión ÷ Ventas (=REDONDEAR(B2/C2;2)); la fila Total suma con =SUMA(ARRIBA).', 100, 575, 1080, 36, { fontSize: 20, color: SOFT })],
      notes: 'Tabla con bandas y fórmulas que dividen dos columnas y redondean. «Clientes fieles» sale a 6,25 € por venta: la más eficiente.' },
    { title: 'Próximos pasos', layout: 'titleOnly', transition: 'slide', extra: [
      dg('chevrons', 'Móvil\n  Página de producto el doble de rápida\nCarrito\n  Envío gratis desde 40 €\nEmail\n  Doblar la inversión', 100, 220, 1080, 420, { oneByOne: true, colors: 'accent' })],
      notes: 'Diagrama de galones, uno por clic: cada paso ataca un dato del informe (rebote en móvil, fuga del carrito, retorno del email).' },
  ]));
};

// =====================================================================================
// 5 · Market study: warm dark brown, editorial serif, overlapping bubbles.
const marketStudy = () => {
  const F = pairStacks('editorial'), BG = '#2b1512', FG = '#fff4ec', SOFT = '#e3c9b8', RED = '#e4572e', GOLD = '#f3a712', SAGE = '#a8c686', BLUE = '#669bbc', SAND = '#f0c987';
  const BR = ['Marca blanca', 'Soyuna', 'Avenal', 'Nubia', 'Almendra Real', 'VerdeVida'];     // by price per litre, low to high
  const PRICE = ['1,10 €', '1,65 €', '1,90 €', '2,30 €', '2,70 €', '3,20 €'];
  const bub = { x: 100, y: 175, w: 1080, h: 430 };
  const PROT = [[0.4, 1.1], [0.6, 1.3], [0.8, 1.2], [1.0, 1.6], [1.0, 1.9], [1.2, 1.7], [1.5, 2.1], [1.8, 2.0], [2.0, 2.6], [2.4, 2.4], [2.6, 2.9], [2.9, 3.1], [3.2, 3.0], [3.4, 3.5]];
  return numbered(build({ name: 'Estudio de mercado: bebidas vegetales', palette: 'warm', fonts: 'editorial', title: { size: 44, color: GOLD },
    decor: p => [shape('rect', 100, 682, 1080, 1, '#ffffff22'), ...[RED, GOLD, SAGE].map((c, i) => shape('ellipse', 1140 + i * 18, 676, 12, 12, c))] }, [
    { layout: 'blank', transition: 'fade', extra: [
      ...[[760, 110, 300, RED], [960, 230, 220, GOLD], [820, 360, 190, SAGE], [1010, 430, 150, BLUE], [700, 400, 110, SAND]].map(([x, y, d, c], i) =>
        auto(shape('ellipse', x, y, d, d, c, { opacity: 82 }), 'zoom-in', { duration: 500, ...(i === 0 && { delay: 200 }) })),
      text('ESTUDIO DE MERCADO · 2026', 90, 190, 600, 36, { fontSize: 22, letterSpacing: 5, color: GOLD }),
      text('Bebidas<br>vegetales', 90, 235, 600, 230, { fontSize: 96, lineHeight: 1.02, fontFamily: F.heading, fontWeight: 700, color: FG }),
      text('Tamaño, competidores y huecos libres en el mercado nacional', 92, 480, 560, 90, { fontSize: 28, color: SOFT })],
      notes: 'Estudio con marcas y cifras inventadas. Las burbujas de la portada anticipan el gráfico de burbujas de la diapositiva 4.' },
    { title: 'Un mercado que no para de crecer', layout: 'titleOnly', extra: [
      auto(fig('1.240 M€', 'ventas en 2026', 100, 170, 340, 150, { color: GOLD, fg: SOFT, size: 64, fontFamily: F.heading }), 'zoom-in', { sound: 'pop' }),
      auto(fig('+9 %', 'de crecimiento anual medio', 470, 170, 340, 150, { color: SAGE, fg: SOFT, size: 64, fontFamily: F.heading }), 'zoom-in', { sound: 'pop' }),
      auto(fig('38 %', 'de los hogares compra', 840, 170, 340, 150, { color: BLUE, fg: SOFT, size: 64, fontFamily: F.heading }), 'zoom-in', { sound: 'pop' }),
      auto(chartBlock({ x: 100, y: 345, w: 1080, h: 310, chartType: 'bar', color: RED, seriesName: 'Ventas (M€)', dataLabels: true,
        data: D(['2021', '2022', '2023', '2024', '2025', '2026'], [820, 905, 980, 1060, 1150, 1240]) }), 'fade-up', { duration: 900 })],
      notes: 'Con un clic, tres cifras grandes entran encadenadas con un sonido y, debajo, las ventas de los últimos seis años en millones de euros.' },
    { title: 'Quién se lleva el mercado', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 450, chartType: 'treemap', color: RED,
        data: D(['Avenal', 'Marca blanca', 'Soyuna', 'Almendra Real', 'VerdeVida', 'Otras', 'Nubia'], [27, 22, 19, 12, 8, 7, 5]) }), 'zoom-in', { duration: 900 }),
      text('Cuota de mercado en valor, en %. Marcas ficticias.', 100, 630, 1080, 34, { fontSize: 20, color: SOFT })],
      notes: 'Gráfico de rectángulos (treemap): el área de cada marca es su cuota. Tres marcas y la marca blanca suman el 80 %.' },
    { title: 'Precio, ventas y margen por marca', layout: 'titleOnly', extra: [
      auto(chartBlock({ ...bub, chartType: 'bubble', color: GOLD, data: D(BR, [273, 236, 335, 62, 149, 99]), series: [{ name: 'Margen', values: [9, 18, 22, 27, 31, 35] }] }), 'grow', { duration: 900 }),
      ...BR.map((_, i) => text(PRICE[i], bub.x + bub.w * (8 + (i + 1) / 6 * 86) / 100 - 50, bub.y + bub.h + 4, 100, 30, { fontSize: 20, color: SOFT, textAlign: 'center' })),
      text('Ventas (M€) ↑', 100, 170, 300, 30, { fontSize: 20, color: SOFT }),
      text('Precio por litro →', 880, 640, 300, 30, { fontSize: 20, color: SOFT, textAlign: 'right' }),
      text('Tamaño de la burbuja: margen', 400, 640, 480, 30, { fontSize: 20, color: SOFT, textAlign: 'center' })],
      notes: 'Gráfico de burbujas: a la derecha, más caro; arriba, más ventas; cuanto mayor la burbuja, más margen. Las marcas caras venden menos pero ganan más por litro.' },
    { title: '¿Más proteína, más caro?', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 150, y: 175, w: 800, h: 430, chartType: 'scatter', color: SAGE, data: PROT.map(([g, e]) => ({ label: String(g), value: e })) }), 'fade-in', { duration: 900 }),
      text('Precio (€/L) ↑', 150, 168, 300, 30, { fontSize: 20, color: SOFT }),
      text('Proteína por 100 ml (g) →', 650, 615, 300, 30, { fontSize: 20, color: SOFT, textAlign: 'right' }),
      click(card(`<div style="font-size:44px;color:${SAGE};font-weight:700;white-space:nowrap">r = 0,95</div>Cada gramo de proteína se paga a unos <b>0,70 € más</b> por litro.`, 970, 230, 250, 330, '#3d211b', { fontSize: 22, color: FG }), 'fade-left')],
      notes: 'Gráfico de dispersión con 14 productos: proteína en el eje horizontal y precio en el vertical. La relación es casi lineal (datos simulados).' },
    { title: 'Qué busca cada comprador', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 470, chartType: 'hbar', color: GOLD, seriesName: '18 a 34 años', dataLabels: true,
        data: D(['Sabor', 'Salud', 'Precio', 'Sostenible', 'Proteína', 'Sin azúcar'], [72, 48, 55, 61, 44, 39]), series: [{ name: 'Más de 55', values: [64, 71, 52, 29, 23, 58], color: BLUE }] }), 'fade-right', { duration: 900 })],
      notes: 'Barras horizontales con dos series y etiquetas: % que lo considera decisivo. Los jóvenes miran la sostenibilidad; los mayores, la salud y el azúcar.' },
    { title: 'Cuatro tipos de comprador', layout: 'titleOnly', extra: [
      dg('matrix', 'Cuidadosos\n  Salud ante todo, pagan más\nConvencidos\n  Veganos, compra fija semanal\nPrácticos\n  Precio y marca blanca\nCuriosos\n  Prueban cada novedad', 140, 175, 1000, 480, { oneByOne: true, colors: 'colorful' })],
      notes: 'Matriz 2 × 2 que se descubre por cuadrantes. Los «cuidadosos» y los «curiosos» son los que más pagan por la proteína.' },
    { layout: 'blank', transition: 'zoom', extra: [
      text('LA OPORTUNIDAD', 140, 170, 1000, 40, { fontSize: 24, letterSpacing: 6, color: GOLD, textAlign: 'center' }),
      auto(text('Una bebida de avena con <span style="color:#a8c686">proteína</span> a menos de <span style="color:#f3a712">2 € el litro</span>: nadie ocupa todavía ese hueco.', 140, 230, 1000, 260,
        { fontSize: 54, fontFamily: F.heading, color: FG, textAlign: 'center', lineHeight: 1.25 }), 'fade-up', { duration: 900 }),
      text('Fuente: panel simulado de 2.000 hogares y 14 productos · Datos ficticios', 140, 560, 1000, 34, { fontSize: 20, color: SOFT, textAlign: 'center' })],
      notes: 'La conclusión cruza el gráfico de burbujas (precio) y el de dispersión (proteína).' },
  ]));
};

// =====================================================================================
// 6 · Population and demographics: soft green, clean sans.
const demographics = () => {
  const F = pairStacks('clean'), INK = '#1e3320', GREEN = '#2e7d32', LEAF = '#66bb6a', MEN = '#0277bd', WOMEN = '#ad1457', MUTED = '#55705a';
  const AGES = ['80+', '70–79', '60–69', '50–59', '40–49', '30–39', '20–29', '10–19', '0–9'];
  const M = [2.1, 3.6, 5.4, 7.6, 8.1, 6.2, 5.0, 4.9, 4.6], Wm = [3.4, 4.3, 5.9, 7.9, 8.1, 6.0, 4.8, 4.6, 4.3];
  // A sample of 120 neighbours' ages, spread over each decade as in the pyramid.
  const sample = AGES.slice().reverse().flatMap((_, d) => { const n = Math.round((M[8 - d] + Wm[8 - d]) * 1.2); return Array.from({ length: n }, (_, k) => Math.min(94, d * 10 + ((k * 7 + d * 3) % 10))); });
  // The pyramid: two horizontal bar charts back to back, on the same scale.
  const wR = 520, xR = 640, zeroL = xR + 0.06 * wR, wL = wR * 0.74 / (0.74 * 8.1 / 9.1), xL = zeroL - wL * (22 + 74 * 8.1 / 9.1) / 100;
  return numbered(build({ name: 'Así cambia nuestra población', palette: 'forest', fonts: 'clean', title: { size: 46, color: GREEN },
    decor: () => [shape('wave', -40, 668, 1360, 80, '#d7e8d2')] }, [
    { layout: 'blank', transition: 'fade', extra: [
      text('PADRÓN MUNICIPAL · 2006–2026', 90, 180, 600, 36, { fontSize: 22, letterSpacing: 5, color: GREEN }),
      text('Así cambia<br>nuestra población', 90, 225, 660, 170, { fontSize: 60, lineHeight: 1.08, fontFamily: F.heading, fontWeight: 800, color: INK }),
      text('Un municipio de 48.000 habitantes en veinte años de datos', 92, 420, 560, 90, { fontSize: 28, color: MUTED }),
      ...Array.from({ length: 12 }, (_, i) => auto(icon('user', 760 + (i % 4) * 110, 170 + Math.floor(i / 4) * 130, 90, [MEN, WOMEN, LEAF][i % 3]), 'fade-up', { duration: 300 }))],
      notes: 'Un municipio imaginario; todas las cifras son simuladas. Con un clic, los iconos de personas aparecen uno tras otro, encadenados.' },
    { title: 'Pirámide de población 2026', layout: 'titleOnly', extra: [
      text('Hombres', xL + wL * 0.22, 168, 300, 36, { fontSize: 26, fontWeight: 700, color: MEN }),
      text('Mujeres', xR + wR - 300, 168, 300, 36, { fontSize: 26, fontWeight: 700, color: WOMEN, textAlign: 'right' }),
      auto(chartBlock({ x: Math.round(xL), y: 205, w: Math.round(wL), h: 450, chartType: 'hbar', color: MEN, data: D(AGES.map(() => ''), M.map(v => -v)) }), 'fade-left', { duration: 900 }),
      withAnims(chartBlock({ x: xR, y: 205, w: wR, h: 450, chartType: 'hbar', color: WOMEN, data: D(AGES, Wm) }), A('fade-right', { start: 'withPrev', duration: 900 })),
      auto(card('<b>% de la población</b> por sexo y edad. La base se estrecha: nacen menos niños.', 50, 470, 250, 150, '#ffffffcc', { fontSize: 20, color: INK, pad: [12, 14, 12, 14] }), 'fade-in')],
      notes: 'Una pirámide de población hecha con dos gráficos de barras horizontales espalda con espalda (los hombres con valores negativos). El grupo más numeroso es el de 40 a 59 años.' },
    { title: 'Edades de una muestra de vecinos', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'histogram', color: LEAF, data: sample.map(v => ({ label: '', value: v })), grid: true, dataLabels: true,
        xTitle: 'Edad (años)', yTitle: 'Personas' }), 'fade-up', { duration: 900 })],
      notes: `Histograma: el gráfico agrupa solo las ${sample.length} edades en tramos iguales y cuenta cuántas hay en cada uno.` },
    { title: 'Habitantes por barrio', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 760, h: 480, chartType: 'hbar', color: GREEN, dataLabels: true,
        data: D(['Centro', 'Ensanche', 'La Vega', 'Los Pinos', 'El Molino', 'Las Eras'], [11200, 9800, 8100, 7300, 6400, 5200]) }), 'fade-right', { duration: 900 }),
      click(fig('+31 %', 'crece Las Eras desde 2016, el barrio de las casas nuevas', 900, 200, 280, 200, { color: LEAF, fg: INK, size: 64, labelSize: 22 }), 'zoom-in'),
      click(fig('−8 %', 'pierde el Centro: casas más pequeñas y vecinos mayores', 900, 420, 280, 200, { color: WOMEN, fg: INK, size: 64, labelSize: 22 }), 'zoom-in')],
      notes: 'Barras horizontales ordenadas de mayor a menor, con etiquetas de datos. Las dos cifras de la derecha entran con un clic.' },
    { title: 'Nacimientos y defunciones', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 430, chartType: 'line', color: LEAF, seriesName: 'Nacimientos', grid: true, xTitle: 'Año', yTitle: 'Personas al año',
        data: D(['2006', '2010', '2014', '2018', '2022', '2026'], [520, 505, 460, 410, 380, 365]), series: [{ name: 'Defunciones', values: [330, 345, 370, 395, 430, 445], color: '#8d6e63' }] }), 'fade-right', { duration: 1000 }),
      auto(text('Desde 2020 hay más defunciones que nacimientos: la población crece por quienes llegan a vivir aquí.', 100, 612, 1080, 50, { fontSize: 24, color: INK, textAlign: 'center' }), 'fade-in')],
      notes: 'Dos líneas con etiquetas de datos que se cruzan: el crecimiento natural se vuelve negativo.' },
    { title: 'Hogares por tamaño', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'bar', color: '#a5d6a7', seriesName: '2006', grid: true, dataLabels: true, xTitle: 'Personas en el hogar', yTitle: '% de los hogares',
        data: D(['1', '2', '3', '4', '5 o más'], [18, 27, 22, 23, 10]), series: [{ name: '2026', values: [29, 32, 19, 15, 5], color: GREEN }] }), 'fade-up', { duration: 900 })],
      notes: 'Columnas agrupadas: 2006 en verde claro, 2026 en verde oscuro. Los hogares de una persona pasan del 18 % al 29 %.' },
    { title: 'Veinte años en cinco indicadores', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 180, w: 1080, h: 400, fontSize: 26, header: true, lines: true, headBg: GREEN, headFg: '#ffffff', stroke: '#9fbf9f', cellPad: [12, 18, 12, 18], colW: [3.2, 2, 2, 2],
        rows: [['Indicador', '2006', '2026', 'Cambio'], ['Habitantes', '41.300', '48.000', '=C2-B2'], ['Edad media', '38,2 años', '44,6 años', '=C3-B3'],
          ['Mayores de 65', '14 %', '21 %', '=C4-B4'], ['Nacidos fuera', '6 %', '17 %', '=C5-B5'], ['Personas por hogar', '2,8', '2,4', '=C6-B6']] }), 'fade-in'),
      text('La columna «Cambio» se calcula sola (=C2-B2…) y conserva la unidad de cada fila.', 100, 600, 1080, 36, { fontSize: 20, color: MUTED })],
      notes: 'Tabla de estilo «Mínima» con encabezado de color y fórmulas de diferencia: años, porcentajes y personas.' },
    { layout: 'blank', transition: 'zoom', extra: [
      text('Tres cosas que recordar', 100, 120, 1080, 70, { fontSize: 46, fontWeight: 800, color: GREEN, fontFamily: F.heading }),
      auto(fig('+16 %', 'más habitantes que en 2006', 100, 280, 340, 220, { color: GREEN, fg: INK, size: 96, labelSize: 26 }), 'zoom-in', { sound: 'pop' }),
      auto(fig('44,6', 'años de edad media (6,4 más)', 470, 280, 340, 220, { color: '#8d6e63', fg: INK, size: 96, labelSize: 26 }), 'zoom-in', { sound: 'pop' }),
      auto(fig('1 de 6', 'vecinos nació en otro país', 840, 280, 340, 220, { color: WOMEN, fg: INK, size: 96, labelSize: 26 }), 'zoom-in', { sound: 'pop' })],
      notes: 'Cierre con tres cifras grandes que entran encadenadas tras un clic, con sonido. Datos simulados.' },
  ]));
};

// =====================================================================================
// 7 · A basketball season: black, orange and huge condensed type.
const season = () => {
  const F = pairStacks('bold'), BG = '#101317', FG = '#ffffff', OR = '#e0873b', GREY = '#9aa3ad', DARK = '#1b2027';
  const big = (n, label, x, i) => auto(fig(n, label, x, 220, 255, 230, { color: i % 2 ? FG : OR, fg: GREY, size: 104, labelSize: 32, fontFamily: F.heading }),
    'zoom-in', { duration: 500, sound: i ? 'pop' : 'drumroll', ...(i === 0 && { delay: 200 }) });
  const T = [['Marina Basket', 27, 7], ['Sierra Alta', 25, 9], ['CB Ribera', 24, 10], ['Unión Llanos', 21, 13], ['Puerto Azul', 18, 16], ['Las Torres', 15, 19], ['Valle Oeste', 12, 22], ['Monteclaro', 10, 24]];
  const ball = [shape('ellipse', 800, 140, 420, 420, OR, { fill2: '#a8521a', gradType: 'radial' }), shape('ellipse', 900, 140, 220, 420, 'none', { stroke: '#2b1608', strokeWidth: 6 }),
    shape('rect', 1007, 140, 6, 420, '#2b1608'), shape('rect', 800, 347, 420, 6, '#2b1608')];
  return numbered(build({ name: 'CB Ribera · Temporada 2025-26', palette: 'revela', fonts: 'bold', title: { size: 64, color: OR },
    decor: () => [shape('rect', 1205, -150, 36, 330, OR, { rotation: 22 }), shape('rect', 1255, -150, 14, 330, OR, { rotation: 22 }), shape('rect', 0, 580, 14, 330, OR, { rotation: 22 })] }, [
    { layout: 'blank', transition: 'zoom', extra: [
      ...group(ball, 'bounce', { duration: 1000, sound: 'whoosh' }),
      text('CB RIBERA', 90, 150, 600, 50, { fontSize: 34, letterSpacing: 8, color: OR, fontFamily: F.heading }),
      text('TEMPORADA<br>2025–26', 90, 200, 680, 290, { fontSize: 140, lineHeight: 0.95, fontFamily: F.heading, color: FG }),
      text('La temporada en cifras · Informe para socios', 92, 500, 640, 44, { fontSize: 28, color: GREY })],
      notes: 'Un club y unos jugadores inventados. Al primer clic el balón (cuatro formas animadas a la vez) cae y rebota con un silbido.' },
    { title: 'El año en cuatro números', layout: 'titleOnly', extra: [
      big('24', 'victorias en 34 partidos', 100, 0), big('86,4', 'puntos por partido', 375, 1), big('3.º', 'puesto en la liga', 650, 2), big('12.800', 'espectadores de media', 925, 3),
      click(text('La mejor temporada del club desde 2011', 100, 520, 1080, 60, { fontSize: 40, textAlign: 'center', color: OR, fontFamily: F.heading, letterSpacing: 2 }), 'fade-up', { sound: 'applause' })],
      notes: 'Un clic y las cuatro cifras entran encadenadas, con redoble y golpes de sonido. El último clic trae la frase y un aplauso.' },
    { title: 'Clasificación final', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 165, w: 1080, h: 468, fontSize: 24, header: true, banded: true, headBg: OR, headFg: BG, band: '#ffffff', bandAlpha: 0.06, stroke: '#2a2f36', cellPad: [8, 16, 8, 16], colW: [0.8, 4, 1, 1, 1, 1.4],
        rows: [['Pos.', 'Equipo', 'G', 'P', 'PJ', 'Puntos'], ...T.map(([t, g, p], i) => {
          const r = i + 2, me = t === 'CB Ribera', w = s => (me ? `<b style="color:${OR}">${s}</b>` : s);
          return [w(`${i + 1}`), w(t), String(g), String(p), `=C${r}+D${r}`, `=C${r}*2+D${r}`];
        })] }), 'fade-up', { duration: 700 })],
      notes: 'Tabla con bandas: PJ (=C2+D2) y Puntos (=C2*2+D2, dos por victoria y uno por derrota) son fórmulas. Nuestra fila va en naranja.' },
    { title: 'Diferencia de puntos, mes a mes', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'bar', color: OR, seriesName: 'Diferencia media', grid: true, dataLabels: true, yTitle: 'Puntos por partido',
        data: D(['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'], [-3, 4, 10, -2, 13, 7, 7, 13]) }), 'fade-up', { duration: 900 })],
      notes: 'Columnas con valores negativos: crecen hacia abajo desde la línea del cero. Octubre y enero, los dos baches de la temporada.' },
    { title: 'La carrera por el título', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'line', color: OR, seriesName: 'CB Ribera', grid: true, dataLabels: true, xTitle: 'Jornada', yTitle: 'Victorias acumuladas',
        data: D(['J5', 'J10', 'J15', 'J20', 'J25', 'J30', 'J34'], [3, 7, 11, 14, 18, 21, 24]), series: [{ name: 'Marina (líder)', values: [4, 9, 13, 17, 20, 24, 27], color: GREY }] }), 'fade-right', { duration: 1100 })],
      notes: 'Dos líneas con etiquetas: nunca estuvimos a más de tres victorias del líder.' },
    { title: 'Máximos anotadores', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 780, h: 480, chartType: 'hbar', color: OR, dataLabels: true,
        data: D(['M. Lera', 'I. Soto', 'D. Ferrer', 'H. Prieto', 'A. Núñez'], [605, 483, 425, 371, 286]) }), 'fade-right', { duration: 900 }),
      click(fig('17,8', 'puntos por partido de Marcos Lera, máximo anotador de la liga', 920, 230, 260, 300, { color: OR, fg: GREY, size: 96, labelSize: 30, fontFamily: F.heading }), 'zoom-in', { sound: 'pop' })],
      notes: 'Puntos totales en la temporada (jugadores inventados). La cifra de la derecha entra con un clic.' },
    { title: 'En casa y fuera', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 640, h: 480, chartType: 'stacked', color: OR, seriesName: 'Victorias', dataLabels: true,
        data: D(['En casa', 'Fuera'], [14, 10]), series: [{ name: 'Derrotas', values: [3, 7], color: '#4a525d' }] }), 'fade-up', { duration: 900 }),
      auto(fig('82 %', 'de victorias en nuestra pista: la afición juega', 790, 230, 390, 280, { color: OR, fg: GREY, size: 120, labelSize: 34, fontFamily: F.heading }), 'zoom-in')],
      notes: 'Columnas apiladas con etiquetas dentro de cada tramo: 14 de 17 partidos ganados en casa.' },
    { title: 'Perfil del equipo', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 190, y: 170, w: 460, h: 480, chartType: 'radar', color: OR,
        data: D(['Ataque', 'Defensa', 'Rebote', 'Triples', 'Tiros libres', 'Pases'], [88, 64, 71, 92, 58, 79]) }), 'zoom-in', { duration: 900 }),
      click(card(`<b style="color:${OR}">Lo mejor</b><br>Triples: 2.º de la liga<br>Ataque: 86,4 puntos`, 680, 200, 500, 170, DARK, { fontSize: 28, color: FG }), 'fade-left'),
      click(card(`<b style="color:#c94f4f">A mejorar</b><br>Tiros libres: 71 % de acierto<br>Defensa en el último cuarto`, 680, 400, 500, 170, DARK, { fontSize: 28, color: FG }), 'fade-left')],
      notes: 'Radar con el percentil del equipo en cada faceta respecto a la liga (100 = el mejor).' },
    { layout: 'blank', transition: 'zoom', extra: [
      ...[[110, 90, OR, 'star'], [1010, 110, '#ffffff', 'star6'], [190, 480, '#ffffff', 'star4'], [990, 470, OR, 'star']].map(([x, y, c, s], i) =>
        withAnims(shape(s, x, y, 150, 150, c, { opacity: 90 }), A('bounce', { start: i ? 'withPrev' : 'afterPrev', delay: i * 150, ...(i === 0 && { sound: 'applause' }) }))),
      text('¡GRACIAS, AFICIÓN!', 140, 230, 1000, 170, { fontSize: 140, fontFamily: F.heading, wordart: 'fire', textAlign: 'center' }),
      text('Nos vemos en la pretemporada · Datos ficticios', 240, 420, 800, 50, { fontSize: 30, color: GREY, textAlign: 'center' })],
      notes: 'Con un clic las estrellas rebotan, con un aplauso. Texto con efecto WordArt «Fuego».' },
  ]));
};

// =====================================================================================
// 8 · Energy at home: deep teal night, solar yellow.
const energy = () => {
  const F = pairStacks('modern'), BG = '#06171c', FG = '#e6f1f2', SOFT = '#9fbcc0', SUN = '#f5c542', GREEN = '#5ed39b', CYAN = '#2ac3de', PINK = '#f7768e', CARD = '#0d262d';
  const H = Array.from({ length: 12 }, (_, i) => `${i * 2} h`);
  const baseL = [0.3, 0.3, 0.3, 0.3, 0.35, 0.4, 0.4, 0.4, 0.45, 0.4, 0.35, 0.3], clima = [0.2, 0.1, 0.1, 0.2, 0.3, 0.6, 0.9, 1.0, 0.8, 0.7, 0.8, 0.5], cook = [0.05, 0.05, 0.05, 0.4, 0.2, 0.3, 1.2, 0.3, 0.2, 0.4, 1.4, 0.3];
  const r2 = v => +v.toFixed(2), withClima = baseL.map((v, i) => r2(v + clima[i])), all = withClima.map((v, i) => r2(v + cook[i]));
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const USE = [420, 380, 350, 300, 280, 340, 420, 410, 320, 300, 350, 430], SOLAR = [110, 160, 250, 320, 380, 410, 430, 400, 310, 220, 140, 100];
  const GRID = USE.map((u, i) => Math.round(u - Math.min(u * 0.75, SOLAR[i] * 0.6)));
  const S = sl => ({ bg: BG, ...sl });
  return numbered(build({ name: 'Energía en casa', palette: 'midnight', fonts: 'modern', title: { size: 44, color: SUN },
    decor: () => [shape('rect', 0, 714, 1280, 6, SUN, { fill2: GREEN, gradAngle: 0 })] }, [
    S({ layout: 'blank', transition: 'fade', extra: [
      glow(700, -330, 900, SUN, BG, 40),
      auto(shape('sun', 980, 70, 170, 170, SUN), 'spin', { duration: 900 }),
      ...[0, 1, 2, 3, 4, 5].map(i => auto(shape('parallelogram', 760 + (i % 3) * 150, 400 + Math.floor(i / 3) * 95, 150, 85, '#1d4e89', { fill2: '#2f6fb5', gradAngle: 90, stroke: '#9fc4ea', strokeWidth: 2 }), 'fade-up', { duration: 300 })),
      text('INFORME DE CONSUMO · 2026', 90, 190, 600, 36, { fontSize: 22, letterSpacing: 5, color: GREEN }),
      text('Energía<br>en casa', 90, 235, 600, 230, { fontSize: 96, lineHeight: 1.02, fontFamily: F.heading, fontWeight: 800, color: FG }),
      text('Un año de consumo, placas solares y factura en una vivienda de cuatro personas', 92, 480, 600, 90, { fontSize: 26, color: SOFT })],
      notes: 'Datos simulados de una vivienda tipo. Al primer clic el sol gira y los paneles solares se colocan uno tras otro.' }),
    S({ title: 'Un día de consumo, hora a hora', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'area', color: PINK, seriesName: 'Cocina y otros', data: D(H, all), grid: true, xTitle: 'Hora del día', yTitle: 'Potencia (kW)',
        series: [{ name: 'Climatización', values: withClima, color: CYAN }, { name: 'Base', values: baseL, color: GREEN }] }), 'fade-up', { duration: 1000 })],
      notes: 'Áreas apiladas: cada capa se suma a la de debajo (consumo base, climatización y, encima, cocina y otros). Los picos de las 12 h y las 20 h son las comidas.' }),
    S({ title: 'Mes a mes: consumo, sol y red', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'line', color: PINK, seriesName: 'Consumo', data: D(MONTHS, USE), grid: true, xTitle: 'Mes', yTitle: 'kWh al mes',
        series: [{ name: 'Solar', values: SOLAR, color: SUN }, { name: 'Red', values: GRID, color: CYAN }] }), 'fade-right', { duration: 1100 })],
      notes: 'Tres series en un gráfico de líneas. En verano las placas cubren buena parte del consumo y lo comprado a la red cae.' }),
    S({ title: '¿En qué se va la electricidad?', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 450, chartType: 'treemap', color: '#1f8a9e',
        data: D(['Climatización', 'Cocina', 'Agua caliente', 'Frigorífico', 'Iluminación', 'Lavadora', 'Electrónica', 'Otros'], [31, 18, 16, 12, 8, 7, 6, 2]) }), 'zoom-in', { duration: 900 }),
      text('% del consumo anual por uso', 100, 630, 1080, 34, { fontSize: 20, color: SOFT })],
      notes: 'Gráfico de rectángulos con el reparto del consumo: climatizar la casa es casi un tercio.' }),
    S({ title: 'La factura: antes y después de las placas', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'bar', color: '#5b6b73', seriesName: '2025', grid: true, dataLabels: true, xTitle: 'Trimestre', yTitle: 'Euros',
        data: D(['T1', 'T2', 'T3', 'T4'], [312, 228, 265, 298]), series: [{ name: '2026', values: [214, 118, 121, 196], color: SUN }] }), 'fade-up', { duration: 900 })],
      notes: 'Columnas agrupadas con etiquetas: la factura baja en todos los trimestres, sobre todo en primavera y verano.' }),
    S({ title: 'Lo que cuesta cada periodo (septiembre)', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 180, w: 1080, h: 330, fontSize: 24, header: true, banded: true, headBg: SUN, headFg: BG, band: CYAN, bandAlpha: 0.12, stroke: '#1f3d45', cellPad: [12, 16, 12, 16], colW: [1.4, 3, 1.6, 1.6, 1.6],
        rows: [['Periodo', 'Horas', 'Consumo', 'Precio por kWh', 'Coste (€)'], ['Punta', '10–14 h y 18–22 h', '96 kWh', '0,24 €', '=REDONDEAR(C2*D2;2)'],
          ['Llano', '8–10, 14–18 y 22–24 h', '104 kWh', '0,16 €', '=REDONDEAR(C3*D3;2)'], ['Valle', '0–8 h y fines de semana', '120 kWh', '0,09 €', '=REDONDEAR(C4*D4;2)'],
          ['<b>Total</b>', '', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']] }), 'fade-in'),
      click(card(`Pasar la lavadora y el lavavajillas al <b style="color:${GREEN}">periodo valle</b> ahorra unos <b style="color:${SUN}">9 € al mes</b>.`, 100, 540, 1080, 100, CARD, { fontSize: 26, color: FG, textAlign: 'center' }), 'fade-up')],
      notes: 'Tabla con bandas y fórmulas: Coste = Consumo × Precio (=REDONDEAR(C2*D2;2)) y totales con =SUMA(ARRIBA).' }),
    S({ title: 'Lo que ahorran las placas', layout: 'titleOnly', extra: [
      auto(fig('−38 %', 'en la factura anual', 100, 165, 340, 140, { color: SUN, fg: SOFT, size: 64 }), 'zoom-in', { sound: 'pop' }),
      auto(fig('2,1 t', 'de CO₂ evitadas al año', 470, 165, 340, 140, { color: GREEN, fg: SOFT, size: 64 }), 'zoom-in', { sound: 'pop' }),
      auto(fig('7 años', 'para recuperar la inversión', 840, 165, 340, 140, { color: CYAN, fg: SOFT, size: 64 }), 'zoom-in', { sound: 'pop' }),
      auto(chartBlock({ x: 100, y: 310, w: 1080, h: 360, chartType: 'line', color: GREEN, yTitle: 'Euros', seriesName: 'Ahorro', grid: true, xTitle: 'Años desde la instalación',
        data: D(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], [0, 800, 1600, 2400, 3200, 4000, 4800, 5600, 6400, 7200, 8000]), series: [{ name: 'Inversión', values: Array(11).fill(5600), color: PINK }] }), 'fade-right', { duration: 1000 })],
      notes: 'Tres cifras grandes animadas y, debajo, el ahorro acumulado frente a la inversión de 5.600 €: se cruzan en el séptimo año.' }),
    S({ title: 'Cinco hábitos que más ahorran', layout: 'titleOnly', transition: 'convex', extra: [
      dg('radial', 'Ahorro\n  Termostato a 20 °C\n  Lavadora en valle\n  Luces LED\n  Sin modo espera\n  Ducha corta', 240, 165, 800, 500, { oneByOne: true, colors: 'colorful' })],
      notes: 'Diagrama radial que aparece pieza a pieza. Cierra el informe con acciones concretas.' }),
  ]));
};

// =====================================================================================
// 9 · An A/B test: white lab notebook, grid paper, a serif and one orange.
const abTest = () => {
  const F = pairStacks('websafe'), INK = '#111111', MUTED = '#5c5c5c', GA = '#5b6770', OB = '#e4572e';
  const days = Array.from({ length: 14 }, (_, i) => i + 1);
  const ca = [25, 27, 24, 26, 28, 23, 25, 27, 26, 24, 28, 25, 26, 27], cb = [31, 30, 33, 29, 32, 34, 31, 30, 33, 32, 35, 31, 32, 33];
  const [sa, sb] = scatterPair(days.map((d, i) => [d, ca[i]]), days.map((d, i) => [d, cb[i]]), 130, 175, 760, 430, GA, OB);
  return numbered(build({ name: 'Experimento A/B: el botón de compra', palette: 'grayscale', fonts: 'websafe', title: { size: 42, color: INK },
    decor: () => [...Array.from({ length: 32 }, (_, i) => shape('rect', i * 40 + 20, 0, 1, 720, '#2060a012')), ...Array.from({ length: 18 }, (_, i) => shape('rect', 0, i * 40 + 20, 1280, 1, '#2060a012')),
      shape('rect', 60, 0, 2, 720, '#e4572e55')] }, [
    { layout: 'blank', transition: 'fade', extra: [
      text('EXPERIMENTO A/B · OCTUBRE 2026', 100, 170, 560, 36, { fontSize: 20, letterSpacing: 4, color: OB }),
      text('El botón<br>que vende más', 100, 215, 580, 220, { fontSize: 72, lineHeight: 1.1, fontFamily: F.heading, color: INK }),
      text('Dos versiones, 48.000 visitas y una decisión basada en datos', 102, 450, 540, 90, { fontSize: 26, color: MUTED }),
      auto(shape('rounded', 720, 170, 210, 300, GA, { radius: 18, shadow: { x: 0, y: 10, blur: 24, color: '#00000033' } }), 'fade-right', { duration: 600 }),
      withAnims(text('A', 720, 210, 210, 180, { fontSize: 150, fontFamily: F.heading, color: '#ffffff', textAlign: 'center' }), A('fade-right', { start: 'withPrev', duration: 600 })),
      withAnims(text('«Añadir a la cesta»', 720, 400, 210, 50, { fontSize: 20, color: '#ffffff', textAlign: 'center' }), A('fade-right', { start: 'withPrev', duration: 600 })),
      auto(text('vs', 930, 280, 80, 70, { fontSize: 44, fontStyle: 'italic', color: MUTED, textAlign: 'center' }), 'zoom-in'),
      auto(shape('rounded', 1010, 170, 210, 300, OB, { radius: 18, shadow: { x: 0, y: 10, blur: 24, color: '#00000033' } }), 'fade-left', { duration: 600 }),
      withAnims(text('B', 1010, 210, 210, 180, { fontSize: 150, fontFamily: F.heading, color: '#ffffff', textAlign: 'center' }), A('fade-left', { start: 'withPrev', duration: 600 })),
      withAnims(text('«Comprar ahora»', 1010, 400, 210, 50, { fontSize: 20, color: '#ffffff', textAlign: 'center' }), A('fade-left', { start: 'withPrev', duration: 600 }))],
      notes: 'Un experimento inventado en una tienda en línea. A es el botón actual, gris; B es naranja, con otro texto y fijo al pie de la pantalla en el móvil.' },
    { title: 'Hipótesis y medida', layout: 'titleOnly', extra: [
      card(`<b style="color:${OB}">Hipótesis</b><br>Un botón más visible y con un verbo directo hará que más visitas acaben en compra.`, 100, 180, 480, 230, '#fff7f3', { fontSize: 26, color: INK, borderColor: '#f3c2b0' }),
      card(`<b style="color:${GA}">Medida principal</b><br>Conversión: compras ÷ visitas, por versión y por dispositivo.`, 100, 430, 480, 200, '#f3f5f6', { fontSize: 26, color: INK, borderColor: '#cfd6da' }),
      click(mathBlock({ x: 640, y: 190, w: 540, h: 120, fontSize: 44, latex: 'p = \\frac{\\text{compras}}{\\text{visitas}}', color: INK }), 'fade-in'),
      click(mathBlock({ x: 620, y: 360, w: 580, h: 200, fontSize: 40, latex: 'z = \\frac{p_B - p_A}{\\sqrt{\\hat p\\,(1-\\hat p)\\left(\\frac{1}{n_A}+\\frac{1}{n_B}\\right)}}', color: INK }), 'fade-in'),
      click(text('Si |z| > 1,96, la diferencia no es casualidad (95 % de confianza).', 640, 580, 540, 60, { fontSize: 22, color: MUTED, textAlign: 'center' }), 'fade-in')],
      notes: 'Las dos ecuaciones aparecen con un clic cada una: la conversión de cada versión y la prueba z para comparar dos proporciones.' },
    { title: 'Cómo lo hicimos', layout: 'titleOnly', extra: [
      dg('process', 'Reparto al azar\n  La mitad ve A y la otra mitad B\n14 días\n  Dos semanas completas\n48.000 visitas\n  24.000 por versión\nMedición\n  Compras por visita', 100, 190, 1080, 330, { oneByOne: true, colors: 'accent' }),
      click(card('<b>Regla de parada fijada antes de empezar:</b> 14 días completos y 24.000 visitas por versión. Nada de mirar los datos a mitad y parar cuando «parece» que gana una.', 100, 530, 1080, 120, '#f3f5f6', { fontSize: 22, color: INK, borderColor: '#cfd6da' }), 'fade-up')],
      notes: 'Diagrama de proceso, un paso por clic. Dos semanas completas evitan que pese más un día de la semana que otro.' },
    { title: 'Compras por cada 1.000 visitas', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 170, w: 1080, h: 490, chartType: 'bar', color: GA, seriesName: 'A · actual', grid: true, dataLabels: true, xTitle: 'Dispositivo', yTitle: 'Compras por 1.000 visitas',
        data: D(['Móvil', 'Ordenador', 'Tableta', 'Total'], [21, 34, 26, 26]), series: [{ name: 'B · nuevo', values: [29, 37, 28, 32], color: OB }] }), 'fade-up', { duration: 900 })],
      notes: 'Columnas agrupadas con etiquetas de datos: B gana en los tres dispositivos y, sobre todo, en el móvil (de 21 a 29).' },
    { title: 'Día a día', layout: 'titleOnly', extra: [
      auto(sa, 'fade-in', { duration: 700 }), auto(sb, 'fade-in', { duration: 700 }),
      text('Compras por 1.000 visitas ↑', 130, 165, 400, 30, { fontSize: 20, color: MUTED }),
      text('Día del experimento →', 590, 610, 300, 30, { fontSize: 20, color: MUTED, textAlign: 'right' }),
      key('A · actual', GA, 930, 220, 250, { fg: INK, size: 26 }), key('B · nuevo', OB, 930, 270, 250, { fg: INK, size: 26 }),
      click(card('<b>B gana los 14 días.</b> No es un día bueno: es una diferencia que se repite.', 930, 360, 250, 220, '#fff7f3', { fontSize: 22, color: INK, borderColor: '#f3c2b0' }), 'fade-left')],
      notes: 'Gráfico de dispersión con dos series en los mismos ejes (cada punto, un día). Los puntos naranjas quedan siempre por encima de los grises.' },
    { title: '¿Es significativo?', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 175, w: 1080, h: 232, fontSize: 26, header: true, lines: true, firstCol: true, headBg: INK, headFg: '#ffffff', stroke: '#9a9a9a', cellPad: [10, 18, 10, 18], colW: [2.4, 2, 2, 2.4],
        rows: [['Versión', 'Visitas', 'Compras', 'Conversión (%)'], ['A · actual', '24.000', '624', '=REDONDEAR(C2/B2*100;2)'], ['B · nuevo', '24.000', '768', '=REDONDEAR(C3/B3*100;2)'],
          ['Diferencia', '', '=C3-C2', '=D3-D2']] }), 'fade-in'),
      auto(fig('+23 %', 'más compras con B', 100, 440, 340, 200, { color: OB, fg: MUTED, size: 64, fontFamily: F.heading }), 'zoom-in', { sound: 'drumroll' }),
      auto(fig('z = 3,9', 'muy por encima de 1,96', 470, 440, 340, 200, { color: INK, fg: MUTED, size: 64, fontFamily: F.heading }), 'zoom-in'),
      auto(fig('p &lt; 0,001', 'no es casualidad', 840, 440, 340, 200, { color: INK, fg: MUTED, size: 64, fontFamily: F.heading }), 'zoom-in', { sound: 'chime' })],
      notes: 'La tabla calcula sola la conversión (=REDONDEAR(C2/B2*100;2)) y las diferencias. Las tres cifras resumen la prueba estadística.' },
    { layout: 'blank', extra: [
      text('SI LO APLICAMOS A TODAS LAS VISITAS', 140, 150, 1000, 40, { fontSize: 22, letterSpacing: 4, color: OB, textAlign: 'center' }),
      auto(text('+187.000 €', 140, 210, 1000, 190, { fontSize: 170, fontFamily: F.heading, color: INK, textAlign: 'center' }), 'bounce', { duration: 900, sound: 'applause' }),
      auto(text('al año: 1,2 millones de visitas × 0,6 puntos más de conversión × 26 € de pedido medio', 190, 430, 900, 90, { fontSize: 26, color: MUTED, textAlign: 'center' }), 'fade-in')],
      notes: 'Estimación sencilla del impacto anual: visitas × mejora de conversión × pedido medio. Cifras inventadas.' },
    { title: 'Conclusiones', layout: 'titleOnly', transition: 'fade', extra: [
      dg('list', 'Adoptar B\n  En todos los dispositivos desde el lunes\nEl móvil, el gran ganador\n  +38 % de conversión: 29 frente a 21 por mil\nSiguiente prueba\n  Separar el color del texto del botón', 100, 180, 1080, 450, { oneByOne: true, colors: 'light' })],
      notes: 'Lista que aparece punto a punto. La siguiente prueba separa los dos cambios para saber cuál pesa más.' },
  ]));
};

// =====================================================================================
// 10 · Monthly executive dashboard: light grey, white cards, traffic lights.
const execPanel = () => {
  const F = pairStacks('clean'), BG = '#eef1f5', INK = '#1f2a37', MUTED = '#6b7785', BLUE = '#156082', OK = '#2e9e5b', MID = '#f2a900', BAD = '#d64545', LINE = '#dde3ea';
  const light = c => ({ [OK]: 'En objetivo', [MID]: 'Vigilar', [BAD]: 'Fuera de objetivo' }[c]);
  const tile = (label, n, goal, c, values, x, y) => group([
    shape('rounded', x, y, 340, 220, '#ffffff', { radius: 14, stroke: LINE, strokeWidth: 2, shadow: { x: 0, y: 4, blur: 14, color: '#1f2a3714' } }),
    shape('ellipse', x + 296, y + 22, 24, 24, c),
    text(`<div style="font-size:16px;letter-spacing:2px;color:${MUTED}">${label}</div><div style="font-size:42px;font-weight:800;color:${INK};line-height:1.25">${n}</div><div style="font-size:17px;color:${MUTED}">Objetivo: ${goal}</div>`
      + `<div style="font-size:17px;font-weight:700;color:${c};margin-top:8px">${light(c)}</div>`, x + 22, y + 18, 200, 190, { fontSize: 17, color: INK }),
    spark(values, x + 200, y + 110, 124, 90, c === BAD ? BAD : BLUE)], 'fade-up', { duration: 450 });
  const mini = (name, yoy, values, color, x, y) => [
    shape('rounded', x, y, 530, 225, '#ffffff', { radius: 14, stroke: LINE, strokeWidth: 2 }),
    text(`<b>${name}</b><br><span style="font-size:40px;font-weight:800;color:${color}">${yoy}</span><br><span style="font-size:16px;color:${MUTED}">frente a septiembre de 2025</span>`, x + 24, y + 22, 190, 180, { fontSize: 22, color: INK }),
    auto(spark(values, x + 225, y + 25, 285, 185, color, 'bar'), 'fade-up', { duration: 500 })];
  const S = sl => ({ bg: BG, ...sl });
  const SLICE = [BLUE, '#0f9ed5', '#7fb3d5', '#9aa9b8'];
  const M9 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
  return numbered(build({ name: 'Panel ejecutivo · Septiembre 2026', palette: 'office', fonts: 'clean', title: { size: 40, color: INK },
    decor: () => [shape('rect', 0, 0, 1280, 6, BLUE), text('Panel ejecutivo · Septiembre 2026 · Datos ficticios', 760, 682, 480, 26, { fontSize: 15, color: '#8a96a3', textAlign: 'right' })] }, [
    S({ layout: 'blank', transition: 'fade', extra: [
      shape('rounded', 80, 90, 1120, 520, '#ffffff', { radius: 24, stroke: LINE, strokeWidth: 2, shadow: { x: 0, y: 10, blur: 30, color: '#1f2a3722' } }),
      text('COMITÉ DE DIRECCIÓN', 150, 170, 600, 36, { fontSize: 20, letterSpacing: 5, color: BLUE }),
      text('Panel ejecutivo', 150, 210, 640, 110, { fontSize: 80, fontWeight: 800, fontFamily: F.heading, color: INK }),
      text('Septiembre de 2026 · Resultados del mes', 152, 330, 640, 50, { fontSize: 28, color: MUTED }),
      ...[[OK, '8', 'en objetivo'], [MID, '3', 'a vigilar'], [BAD, '1', 'fuera de objetivo']].flatMap(([c, n, l], i) => group([
        shape('ellipse', 152 + i * 240, 440, 64, 64, c),
        text(`<b style="font-size:36px;line-height:1">${n}</b><br><span style="color:${MUTED}">${l}</span>`, 228 + i * 240, 432, 170, 80, { fontSize: 20, color: INK })], 'bounce', { duration: 600 })),
      auto(spark([3410, 3280, 3550, 3600, 3720, 3900, 3480, 3310, 3820], 860, 170, 290, 200, BLUE), 'fade-left', { duration: 800 }),
      text('Ingresos mensuales 2026', 860, 380, 290, 30, { fontSize: 18, color: MUTED, textAlign: 'center' })],
      notes: 'Panel mensual de una empresa inventada. Los semáforos resumen los doce indicadores del mes y rebotan con el primer clic.' }),
    S({ title: 'Indicadores del mes', layout: 'titleOnly', extra: [
      ...tile('INGRESOS', '3,82 M€', '3,70 M€', OK, [3.41, 3.28, 3.55, 3.6, 3.72, 3.9, 3.48, 3.31, 3.82], 100, 160),
      ...tile('MARGEN BRUTO', '36,4 %', '38 %', MID, [38.5, 38.1, 37.9, 37.6, 37.2, 37.0, 36.8, 36.6, 36.4], 470, 160),
      ...tile('CLIENTES NUEVOS', '412', '380', OK, [300, 320, 340, 335, 360, 390, 350, 330, 412], 840, 160),
      ...tile('RECOMENDACIÓN', '+41', '+40', OK, [33, 35, 34, 36, 38, 37, 39, 40, 41], 100, 410),
      ...tile('ENTREGA', '3,6 días', '3 días', BAD, [2.8, 2.9, 2.9, 3.0, 3.1, 3.2, 3.4, 3.5, 3.6], 470, 410),
      ...tile('ROTACIÓN', '1,1 %', '1,5 %', OK, [1.6, 1.5, 1.4, 1.4, 1.3, 1.2, 1.3, 1.2, 1.1], 840, 410)],
      notes: 'Seis indicadores con su semáforo y un minigráfico de los nueve meses. Con un clic las tarjetas entran una tras otra, encadenadas.' }),
    S({ title: 'Ingresos frente a presupuesto', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 100, y: 165, w: 1080, h: 495, chartType: 'bar', combo: true, color: BLUE, seriesName: 'Real', grid: true, xTitle: 'Mes', yTitle: 'Miles de euros',
        data: D(M9, [3410, 3280, 3550, 3600, 3720, 3900, 3480, 3310, 3820]), series: [{ name: 'Presupuesto', values: [3400, 3350, 3500, 3550, 3650, 3800, 3550, 3400, 3700], color: MID }] }), 'fade-up', { duration: 900 })],
      notes: 'Gráfico combinado: columnas con el dato real y una línea con el presupuesto. Julio y agosto quedan por debajo; septiembre recupera.' }),
    S({ title: 'Cumplimiento por área', layout: 'titleOnly', extra: [
      auto(tableBlock({ x: 100, y: 170, w: 1080, h: 420, fontSize: 21, header: true, banded: true, firstCol: true, headBg: INK, headFg: '#ffffff', band: BLUE, bandAlpha: 0.07, stroke: LINE, cellPad: [10, 16, 10, 16], colW: [4, 1.5, 1.2, 2, 2.4],
        rows: [['Área · indicador', 'Objetivo', 'Real', 'Cumplimiento (%)', 'Estado'],
          ...[['Ventas · ingresos (k€)', '3.700', '3.820', OK], ['Finanzas · margen (%)', '38', '36,4', MID], ['Marketing · contactos', '1.500', '1.420', MID],
            ['Atención · recomendación', '40', '41', OK], ['Personas · formación (h)', '600', '640', OK], ['Operaciones · a tiempo (%)', '95', '88', BAD]]
            .map(([a, g, r, c], i) => [a, g, r, `=REDONDEAR(C${i + 2}/B${i + 2}*100;1)`, `<span style="color:${c}">●</span> ${light(c)}`]),
          ['Media', '', '', '=PROMEDIO(D2:D7)', '']] }), 'fade-in'),
      click(text('El cumplimiento es una fórmula (=REDONDEAR(C2/B2*100;1)); la última fila, =PROMEDIO(D2:D7).', 100, 630, 1080, 34, { fontSize: 19, color: MUTED }), 'fade-in')],
      notes: 'Tabla con semáforo por fila, fórmulas de cumplimiento y una fila final con la media. Operaciones es el único indicador en rojo.' }),
    S({ title: 'Las cuatro unidades de negocio', layout: 'titleOnly', extra: [
      ...mini('Hogar', '+6 %', [610, 590, 640, 650, 660, 700, 630, 600, 680], BLUE, 100, 165),
      ...mini('Empresas', '+3 %', [1300, 1250, 1320, 1330, 1380, 1400, 1280, 1210, 1390], '#0f9ed5', 650, 165),
      ...mini('Tienda en línea', '+31 %', [700, 690, 760, 790, 820, 880, 800, 790, 920], OK, 100, 415),
      ...mini('Servicios', '−4 %', [800, 750, 830, 830, 860, 920, 770, 710, 830], BAD, 650, 415)],
      notes: 'Pequeños múltiplos: el mismo minigráfico de barras para cada unidad (ingresos de enero a septiembre, miles de euros). La tienda en línea crece un 31 %.' }),
    S({ title: 'De dónde vienen los ingresos', layout: 'titleOnly', extra: [
      auto(chartBlock({ x: 110, y: 175, w: 450, h: 450, chartType: 'doughnut', legend: false, data: slices(['Empresas', 'Tienda en línea', 'Servicios', 'Hogar'], [1390, 920, 830, 680], SLICE) }), 'spin', { duration: 900 }),
      text('<b style="font-size:38px">3,82 M€</b><br>septiembre', 235, 360, 200, 80, { fontSize: 20, color: INK, textAlign: 'center' }),
      ...[['Empresas', '36 %'], ['Tienda en línea', '24 %'], ['Servicios', '22 %'], ['Hogar', '18 %']].map(([l, v], i) =>
        auto(key(`<b>${v}</b> · ${l}`, SLICE[i], 640, 200 + i * 62, 520, { fg: INK, size: 28 }), 'fade-left', { duration: 350 })),
      click(card('La tienda en línea pasa del <b>18 %</b> al <b>24 %</b> de los ingresos en un año.', 640, 470, 540, 120, '#ffffff', { fontSize: 24, color: INK, borderColor: LINE }), 'fade-up')],
      notes: 'Gráfico de anillo con el total en el centro y la leyenda en porcentajes, que entra punto a punto.' }),
    S({ title: 'Riesgos y decisiones', layout: 'titleOnly', extra: [
      ...[[BAD, 'Plazo de entrega: 3,6 días', 'Segundo turno en el almacén de octubre a diciembre'], [MID, 'Margen bruto: 36,4 %', 'Renegociar las tarifas de transporte antes de noviembre'],
        [MID, 'Contactos de marketing: 95 %', 'Pasar 20.000 € de ferias a anuncios en buscadores']].flatMap(([c, risk, act], i) => group([
        shape('rounded', 100, 175 + i * 150, 1080, 130, '#ffffff', { radius: 14, stroke: LINE, strokeWidth: 2 }),
        shape('rect', 100, 175 + i * 150, 10, 130, c),
        shape('ellipse', 140, 213 + i * 150, 54, 54, c),
        text(`<div><b style="font-size:28px">${risk}</b><br><span style="color:${MUTED}">Decisión:</span> ${act}</div>`, 220, 190 + i * 150, 930, 100, { fontSize: 24, color: INK, vAlign: 'middle' })], 'fade-right', { duration: 500 }, 'click'))],
      notes: 'Un riesgo y su decisión por clic, con el color del semáforo en la barra y el círculo de la izquierda.' }),
    S({ layout: 'blank', extra: [
      pollBlock({ kind: 'choice', display: 'pie', question: '¿Cuál debe ser la prioridad del cuarto trimestre?', options: ['Plazo de entrega', 'Margen', 'Tienda en línea', 'Servicios'], fontSize: 34, x: 80, y: 60, w: 1120, h: 600 })],
      notes: 'Votación en directo con resultado en gráfico circular: el comité vota desde el móvil y se ve al momento.' }),
  ]));
};

export default {
  data_sales_regions: { name: 'Ventas por región', cat: 'data', make: salesRegions,
    summary: 'Barras agrupadas, apiladas y al 100 %, gráfico combinado con objetivo, tabla con totales por fórmula y KPIs animados' },
  data_satisfaction: { name: 'Encuesta de satisfacción', cat: 'data', make: survey,
    summary: 'Anillo con leyenda, radares comparados, columnas con etiquetas, NPS, valoración y nube de palabras en directo' },
  data_home_finance: { name: 'Finanzas personales', cat: 'data', make: finance,
    summary: 'Cascada del sueldo al ahorro, gráfico circular, líneas y área, tablas con SUMA, PROMEDIO, MAX y MIN' },
  data_web_metrics: { name: 'Métricas web y marketing', cat: 'data', make: webMetrics,
    summary: 'KPIs con minigráficos, líneas de cuatro series, áreas, embudo de conversión, combinado y tabla con fórmulas' },
  data_market_study: { name: 'Estudio de mercado', cat: 'data', make: marketStudy,
    summary: 'Cifras grandes, gráfico de rectángulos, burbujas, dispersión, barras horizontales de dos series y matriz 2 × 2' },
  data_population: { name: 'Población y demografía', cat: 'data', make: demographics,
    summary: 'Pirámide de población, histograma, barras horizontales, líneas que se cruzan y tabla de indicadores con fórmulas' },
  data_season_stats: { name: 'Temporada en cifras', cat: 'data', make: season,
    summary: 'Cifras gigantes con sonido, clasificación con fórmulas, barras negativas, líneas, apiladas y radar del equipo' },
  data_energy: { name: 'Energía y consumo', cat: 'data', make: energy,
    summary: 'Áreas apiladas por hora, líneas de tres series, rectángulos, columnas con etiquetas y tabla de tarifas calculada' },
  data_ab_test: { name: 'Experimento A/B', cat: 'data', make: abTest,
    summary: 'Ecuaciones, dispersión de dos series, columnas con etiquetas, tabla de conversión con fórmulas y cifras de significación' },
  data_exec_panel: { name: 'Panel ejecutivo mensual', cat: 'data', make: execPanel,
    summary: 'KPIs con semáforos y minigráficos, combinado frente a presupuesto, múltiplos pequeños, anillo y votación' },
};
