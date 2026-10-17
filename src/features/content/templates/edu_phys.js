// Example presentations: Física y química de secundaria. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Every deck has its own topic and its own look: a road at night with its
// signs, the deep sea seen from a porthole, a fairground at night, a circuit board, an engraving in a
// science museum, a recipe card on kitchen tiles, a recording studio, a dark optics room, a thermometer
// from ice to flame and a rack of test tubes in indicator colours.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// The same object on two slides (Transform): a fixed id.
const keep = (b, id) => ({ ...b, id });
// One animation: on a click, after the previous one, or with it.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// Straight strokes through points of the slide (a shape of our own, so «Dibujar» traces it); closed: back to the start.
const lines = (pts, color, width = 4, closed = false, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys), w = Math.max(2, Math.max(...xs) - x), h = Math.max(2, Math.max(...ys) - y);
  const d = 'M' + pts.map(([a, b]) => `${+((a - x) / w * 100).toFixed(2)} ${+((b - y) / h * 100).toFixed(2)}`).join(' L') + (closed ? ' Z' : '');
  return shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: width, ...props });
};
// A polygon of our own (points in a 0–100 box stretched to the object).
const poly = (pts, x, y, w, h, fill, props = {}) => shape('custom', x, y, w, h, fill, { path: 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z', ...props });
// A sine wave as a stroke (cycles across the box), so it can be drawn while presenting.
const wave = (x, y, w, h, cycles, color, width = 4, props = {}) => {
  const n = Math.max(40, Math.round(cycles * 36)), pts = Array.from({ length: n + 1 }, (_, i) => `${+(i / n * 100).toFixed(2)} ${+(50 - 48 * Math.sin(i / n * cycles * 2 * Math.PI)).toFixed(2)}`);
  return shape('custom', x, y, w, h, 'none', { path: 'M' + pts.join(' L'), stroke: color, strokeWidth: width, ...props });
};
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 40, x: 70, y: 50, w: 1140, h: 620, ...props });
// An equation.
const m = (latex, x, y, w, h, fontSize, color, p = {}) => mathBlock({ x, y, w, h, fontSize, latex, color, ...p });
// Fonts of our own (Google fonts loaded on demand, as in the editor's list).
const FF = { oswald: "'Oswald', sans-serif", lora: "'Lora', serif", lobster: "'Lobster', cursive", poppins: "'Poppins', sans-serif", mono: "'JetBrains Mono', monospace",
  cormorant: "'Cormorant Garamond', serif", pacifico: "'Pacifico', cursive", merri: "'Merriweather', serif", anton: "'Anton', sans-serif", mont: "'Montserrat', sans-serif",
  raleway: "'Raleway', sans-serif", rubik: "'Rubik', sans-serif", quick: "'Quicksand', sans-serif", nunito: "'Nunito', sans-serif" };
// The credit line of the CC BY models used in a deck (small).
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 11, color });
// A smooth hill-and-valley line through key points (cosine easing between them), sampled every few pixels.
const ease = (keys, x) => { for (let i = 0; i < keys.length - 1; i++) { const [x0, y0] = keys[i], [x1, y1] = keys[i + 1];
  if (x <= x1) { const t = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * (1 - Math.cos(Math.PI * t)) / 2; } } return keys.at(-1)[1]; };
// The deck's own text colour (tables, activities and charts take it), for palettes whose text doesn't suit our backgrounds.
const withFg = (deck, color) => { deck.textColor = color; return deck; };
const trackPts = (keys, step = 10) => { const out = []; for (let x = keys[0][0]; x <= keys.at(-1)[0]; x += step) out.push([x, +ease(keys, x).toFixed(1)]); return out; };

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · Kinematics on a road at night: asphalt, lane markings, blue road signs, a speed limit sign,
  // a 3D car that drives across, an average-speed camera section, km/h → m/s with formulas, a v–t line.
  edu_phys_motion: { name: 'Cinemática: velocidad y aceleración', cat: 'edu', summary: 'Carretera de noche: coche 3D que cruza, radar de tramo animado, tabla que pasa km/h a m/s, gráfica v-t, barras apiladas y concurso', make: () => {
    const ASPH = '#24272b', ROAD = '#34383e', W = '#f4f4f2', SIGN = '#1d5fb4', YEL = '#ffc928', RED = '#e03a2f', GRN = '#3fbf74', DIM = '#b7bec7', H = FF.oswald;
    const asphalt = () => [glow(-300, -420, 1000, '#30353b', ASPH, 60), glow(820, 320, 820, '#2c3035', ASPH, 50)];
    const road = (y, h = 90) => [shape('rect', 0, y, 1280, h, ROAD), shape('rect', 0, y + 6, 1280, 4, W, { opacity: 80 }), shape('rect', 0, y + h - 10, 1280, 4, W, { opacity: 80 }),
      ...Array.from({ length: 11 }, (_, i) => shape('rect', 20 + i * 124, y + h / 2 - 3, 64, 6, W, { opacity: 85 }))];
    const hd = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.05, ...p });
    const gantry = x => [shape('rect', x, 150, 14, 200, '#8d96a0'), shape('rect', x, 150, 140, 16, '#8d96a0'), shape('rect', x + 92, 166, 46, 30, '#111418', { stroke: '#8d96a0', strokeWidth: 2 }),
      shape('ellipse', x + 102, 172, 18, 18, '#4aa3ff')];
    return numbered(withFg(build({ name: 'Cinemática: velocidad y aceleración', palette: 'office', fonts: 'bold', title: { font: H, color: W, size: 50, bold: false }, body: { color: W } }, [
      { layout: 'blank', bg: ASPH, back: [...asphalt(), ...road(520, 150)], extra: [
        shape('rounded', 80, 80, 700, 330, SIGN, { stroke: W, strokeWidth: 6 }),
        text('FÍSICA Y QUÍMICA · 4.º DE ESO', 120, 110, 620, 40, { fontSize: 22, letterSpacing: 4, color: '#cfe0f7', fontWeight: 700 }),
        hd('CINEMÁTICA', 115, 150, 640, 130, 110),
        text('Velocidad y aceleración, contadas desde la carretera', 120, 300, 620, 90, { fontSize: 30, color: W }),
        shape('rect', 1012, 330, 16, 190, '#9aa3ad'),
        on(shape('ellipse', 900, 90, 240, 240, W, { stroke: RED, strokeWidth: 28 }), 'zoom-in', { start: 'afterPrev', sound: 'pop' }),
        along(hd('100', 900, 158, 240, 110, 96, '#1a1a1a', { textAlign: 'center' }), 'zoom-in'),
        withAnims(model('kh-CarConcept', 940, 480, 320, 180, { caption: '', view: 'side' }), path([[-880, 0]], { start: 'afterPrev', duration: 3500, sound: 'whoosh' }))],
        notes: 'Al llegar se enciende la señal de límite y el coche cruza la carretera. Pregunta de arranque: ¿cómo sabe un radar a qué velocidad vas?' },
      { title: 'Posición y desplazamiento', layout: 'titleOnly', bg: ASPH, back: [...asphalt(), ...road(400, 80)], extra: [
        text('La <b>posición</b> se mide desde un origen: aquí, el km 0. El <b>desplazamiento</b> es cuánto cambia la posición.', 100, 175, 1080, 90, { fontSize: 28, color: DIM }),
        ...[0, 1, 2, 3, 4].flatMap(k => { const cx = 160 + k * 240;
          return [shape('rounded', cx - 30, 300, 60, 90, W), shape('rect', cx - 30, 300, 60, 20, RED), text(String(k * 10), cx - 30, 328, 60, 40, { fontSize: 26, fontWeight: 700, color: '#1f2226', textAlign: 'center' })]; }),
        withAnims(icon('car', 365, 405, 70, YEL), path([[480, 0]], { duration: 2200, sound: 'whoosh' })),
        after(shape('doublearrow', 400, 500, 480, 26, YEL, { stroke: YEL, strokeWidth: 3 }), 'fade-in'),
        along(hd('Δx = 20 km', 400, 530, 480, 50, 36, YEL, { textAlign: 'center' }), 'fade-up'),
        on(m('x_0 = 10\\ \\text{km} \\quad\\longrightarrow\\quad x = 30\\ \\text{km} \\qquad \\Delta x = x - x_0 = 20\\ \\text{km}', 100, 600, 1080, 70, 32, W), 'fade-up')],
        notes: 'Un clic: el coche va del km 10 al km 30 y aparece la flecha del desplazamiento. Otro clic: la fórmula. Si diera la vuelta y volviera al km 10, el desplazamiento sería cero aunque haya recorrido 40 km.' },
      { title: 'Velocidad media: el radar de tramo', layout: 'titleOnly', bg: ASPH, back: [...asphalt(), ...road(250, 90)], extra: [
        ...gantry(150), ...gantry(1040),
        text('09:00:00', 90, 352, 220, 40, { fontFamily: FF.mono, fontSize: 24, color: YEL, textAlign: 'center' }),
        text('09:05:00', 980, 352, 220, 40, { fontFamily: FF.mono, fontSize: 24, color: YEL, textAlign: 'center' }),
        shape('doublearrow', 330, 362, 620, 22, DIM, { stroke: DIM, strokeWidth: 2 }), hd('10 km', 560, 385, 160, 40, 30, DIM, { textAlign: 'center' }),
        withAnims(icon('car', 120, 262, 66, YEL), path([[920, 0]], { duration: 2400, sound: 'whoosh' })),
        on(m('\\bar v = \\dfrac{\\Delta x}{\\Delta t} = \\dfrac{10\\ \\text{km}}{5\\ \\text{min}} = \\dfrac{10\\ \\text{km}}{\\tfrac{1}{12}\\ \\text{h}}', 90, 440, 700, 130, 36, W), 'fade-up'),
        on(hd('120 km/h', 820, 440, 380, 120, 100, YEL, { textAlign: 'center' }), 'zoom-in', { sound: 'chime' }),
        text('El tramo está limitado a 100 km/h: aunque frene delante de cada cámara, la media lo delata.', 90, 590, 700, 90, { fontSize: 26, color: DIM }),
        on(shape('seal', 960, 550, 140, 140, RED, { rotation: -12 }), 'bounce', { sound: 'pop' }),
        along(hd('MULTA', 960, 598, 140, 44, 34, W, { textAlign: 'center', rotation: -12 }), 'bounce')],
        notes: 'Dos cámaras anotan la hora a la que pasa la matrícula. 10 km en 5 minutos (1/12 de hora) dan 120 km/h de media. La velocidad media solo mira el total: no sabe si frenó o aceleró por el camino.' },
      { title: 'De km/h a m/s', layout: 'titleOnly', bg: ASPH, back: asphalt(), extra: [
        tableBlock({ x: 90, y: 180, w: 640, h: 440, fontSize: 26, header: true, headBg: SIGN, headFg: W, stroke: '#ffffff40', banded: true, band: '#ffffff', bandAlpha: 0.06, color: W, colW: [5, 2, 2],
          rows: [['Móvil', 'km/h', 'm/s'], ['Persona andando', '5', '=REDONDEAR(B2/3,6;1)'], ['Bicicleta', '18', '=REDONDEAR(B3/3,6;1)'], ['Coche en ciudad', '50', '=REDONDEAR(B4/3,6;1)'],
            ['Coche en autovía', '120', '=REDONDEAR(B5/3,6;1)'], ['Tren de alta velocidad', '300', '=REDONDEAR(B6/3,6;1)']] }),
        m('1\\ \\dfrac{\\text{km}}{\\text{h}} = \\dfrac{1000\\ \\text{m}}{3600\\ \\text{s}} = \\dfrac{1}{3{,}6}\\ \\dfrac{\\text{m}}{\\text{s}}', 780, 185, 420, 130, 30, W),
        text('Para pasar de km/h a m/s, <b>divide entre 3,6</b>. Para volver, multiplica.', 780, 340, 420, 120, { fontSize: 28, color: W }),
        on(card(`<div style="font-family:${H};font-size:44px;color:#1a1a1a">36 km/h = 10 m/s</div><div style="font-size:20px;color:#1a1a1a">el truco para comprobar de cabeza</div>`, 780, 490, 420, 130, YEL, { textAlign: 'center', vAlign: 'middle', pad: [14, 16, 14, 16] }), 'fade-up')],
        notes: 'La tercera columna es una fórmula: =REDONDEAR(B2/3,6;1). Cambiad una velocidad y se recalcula. En física se trabaja en unidades del SI: metros y segundos.' },
      { title: 'MRUA: cuando la velocidad cambia', layout: 'titleOnly', bg: ASPH, back: asphalt(), extra: [
        chartBlock({ x: 80, y: 175, w: 660, h: 480, chartType: 'line', color: YEL, grid: true, labelColor: DIM, xTitle: 't (s)', yTitle: 'v (m/s)', yMin: 0, yMax: 35, seriesName: 'Velocidad del coche',
          data: [0, 5, 10, 15, 20, 25].map((t, i) => ({ label: String(t), value: [0, 15, 30, 30, 30, 0][i] })) }),
        on(card('<b>0 → 10 s</b> · acelera<br><span style="font-size:22px">a = +3 m/s²</span>', 780, 180, 420, 90, GRN, { color: '#0d2416', fontSize: 26, pad: [12, 18, 12, 18] }), 'fade-left'),
        on(card('<b>10 → 20 s</b> · velocidad constante<br><span style="font-size:22px">a = 0</span>', 780, 285, 420, 90, SIGN, { color: W, fontSize: 26, pad: [12, 18, 12, 18] }), 'fade-left'),
        on(card('<b>20 → 25 s</b> · frena<br><span style="font-size:22px">a = −6 m/s²</span>', 780, 390, 420, 90, RED, { color: W, fontSize: 26, pad: [12, 18, 12, 18] }), 'fade-left'),
        on(m('\\begin{aligned} v &= v_0 + a\\,t \\\\ x &= x_0 + v_0\\,t + \\tfrac{1}{2}\\,a\\,t^2 \\end{aligned}', 780, 500, 420, 150, 32, W), 'fade-up', { sound: 'chime' })],
        notes: 'La pendiente de la gráfica v-t es la aceleración: 30 m/s en 10 s dan 3 m/s². El área bajo la línea es la distancia recorrida: 150 + 300 + 75 = 525 m. Datos de ejemplo.' },
      { title: 'Distancia para detenerse', layout: 'titleOnly', bg: ASPH, back: asphalt(), extra: [
        chartBlock({ x: 80, y: 175, w: 700, h: 480, chartType: 'stacked', color: YEL, seriesName: 'Reacción (1 s)', grid: true, dataLabels: true, labelColor: DIM, yTitle: 'metros', xTitle: 'velocidad (km/h)',
          data: [{ label: '50', value: 13.9 }, { label: '90', value: 25 }, { label: '120', value: 33.3 }],
          series: [{ name: 'Frenado', values: [13.8, 44.6, 79.4], color: RED }] }),
        m('d = v \\cdot t_r + \\dfrac{v^2}{2\\,a}', 820, 185, 380, 110, 38, W),
        text('Mientras reaccionas, el coche sigue a la misma velocidad. Al frenar, la distancia crece con el <b>cuadrado</b> de la velocidad.', 820, 310, 380, 190, { fontSize: 25, color: DIM }),
        on(card(`<div style="font-family:${H};font-size:60px;color:${YEL};line-height:1">113 m</div><div style="font-size:20px">para parar desde 120 km/h: más que un campo de fútbol</div>`, 820, 510, 380, 140, '#ffffff12', { color: W, pad: [12, 18, 12, 18] }), 'zoom-in', { sound: 'pop' })],
        notes: 'Cálculo con 1 s de reacción y una deceleración de 7 m/s² (asfalto seco). A 50 km/h se para en 28 m; a 120 km/h en 113 m: la velocidad se multiplica por 2,4 y la distancia por 4.' },
      { layout: 'blank', bg: ASPH, back: asphalt(), extra: [quiz('Un coche va a 72 km/h. ¿Cuántos metros recorre cada segundo?', ['7,2 m', '20 m', '36 m', '259 m'], 1)],
        notes: 'Concurso desde el móvil: 72 ÷ 3,6 = 20 m/s. Quien elija 259 ha multiplicado en vez de dividir.' },
      { layout: 'blank', bg: ASPH, back: [...asphalt(), ...road(600, 80)], transition: 'slide', extra: [
        hd('RETO PARA EL CUADERNO', 90, 90, 760, 70, 54, YEL),
        text('Una ciclista sale del reposo y acelera a <b>0,5 m/s²</b> durante <b>20 s</b>.', 90, 180, 700, 100, { fontSize: 34, color: W }),
        text(ul('¿Qué velocidad alcanza, en m/s y en km/h?', '¿Qué distancia ha recorrido?', 'Dibuja su gráfica v-t'), 90, 300, 700, 220, { fontSize: 28, color: W }),
        timer(240, 900, 150, 300, { style: 'digital', color: YEL, endText: '¡Bolis abajo!' }),
        icon('bike', 1005, 470, 90, YEL), text('Solución en las notas', 900, 560, 300, 30, { fontSize: 20, color: DIM, textAlign: 'center' }),
        credits(['kh-CarConcept'], 90, 560, 760, '#8a929c')],
        notes: 'Cuenta atrás de 4 minutos. Solución: v = 0 + 0,5 · 20 = 10 m/s = 36 km/h; x = ½ · 0,5 · 20² = 100 m.' },
    ]), W));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · Pressure and buoyancy in the deep sea: water that darkens with depth, a brass porthole,
  // bubbles that rise, a bathyscaphe that sinks with Transform, a table of depths with formulas.
  edu_phys_buoyancy: { name: 'Presión y flotación', cat: 'edu', summary: 'Fondo del mar: burbujas que suben, presión con fórmulas, batiscafo que baja con Transformar, empuje, barras, botella 3D y concurso', make: () => {
    const SURF = '#1b8cbf', DEEP = '#03182a', MID = '#0a3d5c', FOAM = '#e3f7ff', CY = '#5fd3f3', BRASS = '#d4a24c', CORAL = '#ff7a59', DIM = '#a6cadb', H = FF.lora;
    const sea = (top = SURF, bottom = DEEP) => `linear-gradient(180deg,${top} 0%,${MID} 45%,${bottom} 100%)`;
    const rays = () => [glow(160, -520, 900, '#ffffff', MID, 18), glow(-200, 380, 700, '#0b4f74', DEEP, 40)];
    const hd = (t, x, y, w, h, size, color = FOAM, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, ...p });
    const bubble = (x, y, d, dy, delay, first = false) => withAnims(shape('ellipse', x, y, d, d, '#ffffff22', { stroke: FOAM, strokeWidth: 2 }),
      path([[6, dy / 3], [-6, dy * 2 / 3], [0, dy]], { start: first ? 'afterPrev' : 'withPrev', delay, duration: 3200 }));
    // The bathyscaphe (same ids on two slides, so Transform takes it down).
    const ids = { hull: uid(), cab: uid(), win: uid(), fin: uid(), beam: uid(), gauge: uid(), mark: uid() };
    const scaphe = (x, y) => [keep(shape('ellipse', x + 300, y + 40, 520, 260, '#ffd166', { fill2: 'transparent', gradType: 'radial', opacity: 30 }), ids.beam),
      keep(shape('rounded', x, y, 320, 110, '#f2c14e', { stroke: '#7a5a12', strokeWidth: 3 }), ids.hull), keep(shape('rect', x + 30, y - 40, 60, 40, '#e0a82e', { stroke: '#7a5a12', strokeWidth: 3 }), ids.fin),
      keep(shape('ellipse', x + 110, y + 70, 120, 120, '#c9ced6', { stroke: '#5a6170', strokeWidth: 4 }), ids.cab), keep(shape('ellipse', x + 140, y + 100, 60, 60, '#9fe3ff', { stroke: '#2b3340', strokeWidth: 4 }), ids.win)];
    const ruler = () => [shape('rect', 1150, 180, 10, 480, '#ffffff40'), ...[0, 1, 2, 3, 4].map(i => shape('rect', 1140, 180 + i * 120, 30, 3, '#ffffff70')),
      ...[['0 m', 180], ['1 000 m', 300], ['2 000 m', 420], ['3 000 m', 540], ['4 000 m', 655]].map(([t, y]) => text(t, 1010, y - 16, 120, 30, { fontSize: 18, color: DIM, textAlign: 'right' }))];
    return numbered(build({ name: 'Presión y flotación', palette: 'ocean', fonts: 'clean', title: { font: H, color: FOAM, size: 50 }, body: { color: FOAM } }, [
      { layout: 'blank', bg: sea(), back: rays(), extra: [
        text('FÍSICA Y QUÍMICA · 2.º DE ESO', 90, 160, 600, 40, { fontSize: 22, letterSpacing: 5, color: CY, fontWeight: 700 }),
        hd('Bajo presión', 84, 200, 700, 130, 104, FOAM, { fontStyle: 'italic' }),
        text('Por qué duelen los oídos al bucear y por qué flota un barco de acero', 90, 350, 600, 100, { fontSize: 32, color: DIM }),
        shape('ellipse', 840, 150, 340, 340, BRASS, { fill2: '#8a6420', gradType: 'radial' }),
        shape('ellipse', 872, 182, 276, 276, DEEP, { fill2: '#0b4f74', gradType: 'radial', stroke: '#6b4a14', strokeWidth: 6 }),
        ...Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return shape('ellipse', 1010 + 154 * Math.cos(a) - 9, 320 + 154 * Math.sin(a) - 9, 18, 18, '#f3d58a', { stroke: '#6b4a14', strokeWidth: 2 }); }),
        hd('−3 700 m', 880, 285, 260, 70, 50, FOAM, { textAlign: 'center' }),
        text('368 atmósferas', 880, 355, 260, 40, { fontSize: 22, color: CY, textAlign: 'center' }),
        bubble(130, 640, 26, -300, 0, true), bubble(210, 660, 16, -360, 300), bubble(560, 650, 22, -280, 600), bubble(680, 670, 14, -320, 150), bubble(760, 640, 30, -260, 900)],
        notes: 'Portada vista desde el ojo de buey de un batiscafo a 3 700 m, la profundidad media del océano. Las burbujas suben solas al llegar. Pregunta: ¿qué nos aplastaría allí abajo?' },
      { title: 'Presión: la fuerza repartida', layout: 'titleOnly', bg: sea('#11779f'), back: rays(), extra: [
        m('P = \\dfrac{F}{S} \\qquad [\\text{Pa} = \\text{N/m}^2]', 90, 175, 1100, 80, 40, FOAM),
        text('La misma persona (600 N) apoyada sobre tres superficies distintas:', 90, 265, 1100, 40, { fontSize: 26, color: DIM, textAlign: 'center' }),
        ...[['mountain', 'Raquetas de nieve', '0,3 m²', '2 000 Pa', CY], ['person-standing', 'Zapatillas', '0,04 m²', '15 000 Pa', '#9be7a8'], ['triangle-alert', 'Todo el peso en un tacón fino', '0,0001 m²', '6 000 000 Pa', CORAL]]
          .flatMap(([ic, t, s, p, c], i) => { const x = 90 + i * 375;
            return [on(shape('rounded', x, 330, 350, 320, '#ffffff14', { stroke: c, strokeWidth: 2 }), 'fade-up'),
              along(icon(ic, x + 145, 350, 60, c), 'fade-up'), along(text(t, x + 15, 420, 320, 70, { fontSize: 24, color: FOAM, textAlign: 'center', fontWeight: 700 }), 'fade-up'),
              along(text(s, x + 15, 495, 320, 40, { fontSize: 22, color: DIM, textAlign: 'center' }), 'fade-up'),
              along(hd(p, x + 10, 550, 330, 70, i === 2 ? 40 : 46, c, { textAlign: 'center', fontWeight: 700 }), 'zoom-in')]; })],
        notes: 'Tres clics. Misma fuerza, superficies muy distintas: por eso las raquetas no se hunden en la nieve y un tacón fino marca el parqué. Cifras redondeadas para el ejemplo.' },
      { title: 'Cuanto más hondo, más presión', layout: 'titleOnly', bg: sea('#0e6a92'), back: rays(), extra: [
        m('P = \\rho \\cdot g \\cdot h', 90, 175, 520, 80, 44, FOAM),
        text('ρ del agua de mar ≈ 1 025 kg/m³ · g = 9,8 m/s²', 90, 255, 600, 40, { fontSize: 22, color: DIM }),
        tableBlock({ x: 90, y: 310, w: 760, h: 340, fontSize: 24, header: true, headBg: '#0b4f74', headFg: FOAM, stroke: '#ffffff40', banded: true, band: '#ffffff', bandAlpha: 0.06, color: FOAM, colW: [2, 4, 3],
          rows: [['Profundidad (m)', 'Dónde', 'Agua (atm)'], ['10', 'Buceo con botella', '=REDONDEAR(A2*1025*9,8/101325;1)'], ['40', 'Límite del buceo deportivo', '=REDONDEAR(A3*1025*9,8/101325;1)'],
            ['1000', 'Un cachalote cazando', '=REDONDEAR(A4*1025*9,8/101325;0)'], ['3700', 'Fondo medio del océano', '=REDONDEAR(A5*1025*9,8/101325;0)'], ['10900', 'La fosa más profunda', '=REDONDEAR(A6*1025*9,8/101325;0)']] }),
        on(card(`<div style="font-family:${H};font-size:56px;color:${CY};line-height:1">10 m</div><div style="font-size:24px">de agua añaden ≈ 1 atmósfera</div>`, 890, 310, 300, 170, '#ffffff14', { color: FOAM, textAlign: 'center', vAlign: 'middle' }), 'zoom-in', { sound: 'pop' }),
        text('Arriba, el aire ya aprieta 1 atm: súmala para tener la presión total.', 890, 500, 300, 150, { fontSize: 22, color: DIM })],
        notes: 'La tercera columna se calcula sola: =A2*1025*9,8/101325 pasa los pascales a atmósferas (1 atm = 101 325 Pa). Cambiad una profundidad y se recalcula.' },
      { title: 'Bajamos: 200 m', layout: 'titleOnly', bg: sea('#0f7aa6', MID), back: rays(), extra: [
        ...ruler(), keep(shape('ellipse', 1143, 196, 24, 24, CORAL), ids.mark),
        ...scaphe(160, 230),
        keep(card(`<div style="font-size:22px;color:${DIM}">MANÓMETRO</div><div style="font-family:${H};font-size:54px;color:${FOAM};line-height:1.1">21 atm</div>`, 620, 220, 330, 140, '#00000040', { textAlign: 'center' }), ids.gauge),
        text('Cada centímetro cuadrado del casco soporta el peso de unos 21 kg.', 620, 390, 340, 120, { fontSize: 24, color: FOAM }),
        text('Aún llega algo de luz azul.', 620, 530, 340, 50, { fontSize: 22, color: DIM, fontStyle: 'italic' })],
        notes: 'Primera parada: 200 m, unas 21 atmósferas en total (20 del agua y 1 del aire). En la siguiente diapositiva, Transformar hunde el mismo batiscafo hasta 3 700 m.' },
      { title: 'Bajamos: 3 700 m', layout: 'titleOnly', bg: sea('#0a3d5c', '#010a14'), back: [glow(-200, 380, 700, '#06263c', '#010a14', 40)], autoAnimate: true, transition: 'fade', extra: [
        ...ruler(), keep(shape('ellipse', 1143, 620, 24, 24, CORAL), ids.mark),
        ...scaphe(160, 440),
        keep(card(`<div style="font-size:22px;color:${DIM}">MANÓMETRO</div><div style="font-family:${H};font-size:54px;color:${CORAL};line-height:1.1">368 atm</div>`, 620, 220, 330, 140, '#00000040', { textAlign: 'center' }), ids.gauge),
        text('Oscuridad total: solo vemos lo que alumbra el foco.', 620, 390, 340, 120, { fontSize: 24, color: FOAM }),
        text('Por eso el casco es una esfera de acero muy grueso: reparte la presión.', 160, 200, 420, 120, { fontSize: 22, color: DIM })],
        notes: 'Transformar: el batiscafo, su foco y la marca de la regla se deslizan hacia abajo y el manómetro cambia de cifra. A 3 700 m la presión es 368 veces la de la superficie.' },
      { title: 'El empuje de Arquímedes', layout: 'titleOnly', bg: sea('#0e6a92'), back: rays(), extra: [
        shape('rect', 90, 330, 520, 320, '#5fd3f355', { stroke: FOAM, strokeWidth: 3 }),
        shape('rect', 270, 400, 160, 160, BRASS, { stroke: '#6b4a14', strokeWidth: 3 }),
        on(shape('downarrow', 315, 555, 70, 110, CORAL), 'fade-down'), along(text('Peso', 395, 600, 120, 40, { fontSize: 26, color: CORAL, fontWeight: 700 }), 'fade-in'),
        on(shape('uparrow', 315, 290, 70, 110, CY), 'fade-up', { sound: 'whoosh' }), along(text('Empuje', 395, 282, 140, 40, { fontSize: 26, color: CY, fontWeight: 700 }), 'fade-in'),
        text('Todo cuerpo sumergido recibe un empuje hacia arriba igual al <b>peso del fluido que desaloja</b>.', 660, 180, 540, 140, { fontSize: 28, color: FOAM }),
        on(m('E = \\rho_{\\text{fluido}} \\cdot V_{\\text{sumergido}} \\cdot g', 660, 340, 540, 80, 34, CY), 'fade-left'),
        on(m('E = 1000 \\cdot 0{,}001 \\cdot 9{,}8 = 9{,}8\\ \\text{N}', 660, 440, 540, 70, 32, FOAM), 'fade-left'),
        text('Un bloque de 1 litro sumergido en agua dulce recibe 9,8 N de empuje, sea de lo que sea.', 660, 540, 540, 100, { fontSize: 22, color: DIM })],
        notes: 'Dos fuerzas sobre el bloque: el peso hacia abajo y el empuje hacia arriba. Si el empuje gana, sube; si gana el peso, se hunde. El empuje no depende del material del bloque, solo de su volumen.' },
      { title: '¿Flota o se hunde?', layout: 'titleOnly', bg: sea('#0e6a92'), back: rays(), extra: [
        chartBlock({ x: 80, y: 175, w: 720, h: 480, chartType: 'hbar', color: CY, dataLabels: true, labelColor: FOAM, seriesName: 'Densidad (kg/m³)',
          data: [['Corcho', 240], ['Madera de pino', 500], ['Hielo', 917], ['Aceite', 920], ['Agua dulce', 1000], ['Agua de mar', 1025], ['Aluminio', 2700], ['Hierro', 7870]].map(([label, value]) => ({ label, value })) }),
        card('<b>ρ cuerpo &lt; ρ fluido</b><br>flota', 840, 190, 360, 110, '#5fd3f333', { color: FOAM, fontSize: 26, textAlign: 'center', vAlign: 'middle' }),
        card('<b>ρ cuerpo &gt; ρ fluido</b><br>se hunde', 840, 315, 360, 110, '#ff7a5933', { color: FOAM, fontSize: 26, textAlign: 'center', vAlign: 'middle' }),
        on(text('¿Y un barco de hierro? Su casco encierra mucho aire: la densidad <b>media</b> del barco es menor que la del agua.', 840, 450, 360, 200, { fontSize: 23, color: FOAM }), 'fade-up')],
        notes: 'Densidades aproximadas. El hielo flota en el agua porque es un 8 % menos denso: por eso los lagos se hielan por arriba y los peces sobreviven debajo.' },
      { layout: 'blank', bg: sea(), extra: [quiz('Un cubito de hielo flota en agua dulce. ¿Qué parte queda bajo el agua?', ['Un 10 %', 'La mitad', 'Un 92 %', 'Todo el cubito'], 2)],
        notes: 'La fracción sumergida es el cociente de densidades: 917 / 1000 ≈ 0,92. De un iceberg solo vemos la punta: alrededor del 10 % (en agua de mar, algo más).' },
      { layout: 'blank', bg: sea('#11779f'), back: rays(), transition: 'zoom', extra: [
        hd('Experimento: el ludión', 90, 90, 700, 80, 60),
        text(ul('Llena una botella de plástico hasta arriba', 'Mete un capuchón de bolígrafo con un poco de plastilina', 'Cierra y aprieta la botella: ¡baja!', 'Suelta: vuelve a subir'), 90, 200, 640, 300, { fontSize: 28, color: FOAM }),
        text('¿Por qué? Explícalo con la presión y el empuje.', 90, 520, 640, 50, { fontSize: 26, color: CY, fontWeight: 700 }),
        model('kh-WaterBottle', 820, 120, 260, 420, { caption: '', autoRotate: true, view: 'front', motion: 'float' }),
        timer(180, 1080, 520, 130, { color: CY, endText: '¡A probar!' })],
        notes: 'Al apretar, la presión comprime la burbuja de aire del capuchón: entra agua, aumenta su densidad media y se hunde. Cuenta atrás de 3 minutos para montarlo por parejas.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 3 · Mechanical energy on a roller coaster at night: violet sky, a track with light bulbs that a
  // car rides, neon Text Art, Ep/Ec stacked, the speed at the bottom, a table with formulas and a doughnut.
  edu_phys_coaster: { name: 'Energía en la montaña rusa', cat: 'edu', summary: 'Feria de noche: vagón que recorre la vía, neón, energías apiladas punto a punto, velocidad paso a paso, tabla con fórmulas, dona y reto', make: () => {
    const NIGHT = '#150b2e', PURP = '#2c1659', PINK = '#ff4fa3', BULB = '#ffd84a', MINT = '#4ff0c2', SKY = '#8fb2ff', W = '#fff7fb', DIM = '#cdbdea', H = FF.lobster, B = FF.poppins;
    const sky = `linear-gradient(180deg,${NIGHT} 0%,${PURP} 100%)`;
    const stars = () => [glow(700, -500, 1100, '#3d2180', NIGHT, 50), ...[[120, 60], [340, 120], [610, 50], [880, 90], [1160, 140], [1010, 40], [470, 200], [230, 250]].map(([x, y], i) => shape('star4', x, y, 10 + (i % 3) * 4, 10 + (i % 3) * 4, '#ffffff', { opacity: 70 }))];
    // The track (slide coordinates): rails, supports and bulbs, drawn as one picture.
    const KEYS = [[40, 650], [300, 420], [560, 665], [800, 520], [1040, 655], [1240, 560]], PTS = trackPts(KEYS);
    const TRACK = svgURL(1280, 720, PTS.filter((_, i) => i % 8 === 0).map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x}" y2="720" stroke="#6a4bb0" stroke-width="5"/>`).join('')
      + `<polyline points="${PTS.map(p => p.join(',')).join(' ')}" fill="none" stroke="${PINK}" stroke-width="9" stroke-linejoin="round"/>`
      + `<polyline points="${PTS.map(([x, y]) => `${x},${y + 14}`).join(' ')}" fill="none" stroke="#a23a7a" stroke-width="5"/>`
      + PTS.filter((_, i) => i % 5 === 2).map(([x, y]) => `<circle cx="${x}" cy="${y - 10}" r="5" fill="${BULB}"/>`).join(''));
    const ride = PTS.filter((_, i) => i % 2 === 0).map(([x, y]) => [x - PTS[0][0], y - PTS[0][1]]);
    const hd = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, ...p });
    // The small track with its four points (slide 3).
    const MK = [[0, 170], [110, 30], [230, 200], [330, 72], [440, 180]], MP = trackPts(MK, 5);
    const MINI = svgURL(460, 240, `<polyline points="${MP.map(p => p.join(',')).join(' ')}" fill="none" stroke="${PINK}" stroke-width="6"/>`
      + [['A', 110, 30], ['B', 230, 200], ['C', 291, 115], ['D', 330, 72]].map(([l, x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${BULB}"/><text x="${x}" y="${y + 6}" font-family="sans-serif" font-weight="700" font-size="16" text-anchor="middle" fill="${NIGHT}">${l}</text>`).join(''));
    return numbered(build({ name: 'Energía en la montaña rusa', palette: 'violet', fonts: 'friendly', title: { font: H, color: BULB, size: 54, bold: false }, body: { color: W } }, [
      { layout: 'blank', bg: sky, back: stars(), extra: [
        img(TRACK, 0, 0, 1280, 720, 'Vía de la montaña rusa con bombillas'),
        text('FÍSICA Y QUÍMICA · 4.º DE ESO', 90, 80, 600, 40, { fontFamily: B, fontSize: 22, letterSpacing: 4, color: MINT, fontWeight: 700 }),
        text('La energía de la<br>montaña rusa', 80, 120, 820, 220, { fontFamily: H, fontSize: 92, lineHeight: 1.1, wordart: 'neon', wordartColor: PINK }),
        text('Subir cuesta energía. Bajar la devuelve. ¿Dónde está mientras tanto?', 90, 320, 960, 50, { fontFamily: B, fontSize: 26, color: DIM }),
        withAnims(shape('rounded', PTS[0][0] - 28, PTS[0][1] - 34, 56, 30, MINT, { stroke: W, strokeWidth: 2 }), path(ride, { start: 'afterPrev', duration: 6500, sound: 'whoosh' }))],
        notes: 'Al llegar, el vagón recorre la vía (recorrido animado). Pregunta: ¿en qué punto va más rápido? ¿Y más despacio?' },
      { title: 'Dos energías en un viaje', layout: 'titleOnly', bg: sky, back: stars(), extra: [
        on(card(`<div style="font-family:${H};font-size:44px;color:${MINT}">Potencial</div><div style="font-size:24px">la que da la <b>altura</b></div>`, 90, 185, 520, 150, '#ffffff12', { color: W, fontFamily: B }), 'fade-right'),
        along(m('E_p = m \\cdot g \\cdot h', 90, 350, 520, 90, 42, MINT), 'fade-right'),
        on(card(`<div style="font-family:${H};font-size:44px;color:${PINK}">Cinética</div><div style="font-size:24px">la que da la <b>velocidad</b></div>`, 670, 185, 520, 150, '#ffffff12', { color: W, fontFamily: B }), 'fade-left'),
        along(m('E_c = \\tfrac{1}{2} \\cdot m \\cdot v^2', 670, 350, 520, 90, 42, PINK), 'fade-left'),
        on(m('E_m = E_p + E_c = \\text{constante}', 190, 490, 900, 90, 44, BULB), 'zoom-in', { sound: 'chime' }),
        text('(si no hubiera rozamiento)', 190, 590, 900, 40, { fontFamily: B, fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Dos clics para las dos energías y otro para la conservación. Unidades: masa en kg, altura en m, velocidad en m/s y energía en julios.' },
      { title: 'Punto a punto', layout: 'titleOnly', bg: sky, back: stars(), extra: [
        chartBlock({ x: 80, y: 175, w: 640, h: 480, chartType: 'stacked', color: MINT, seriesName: 'Ep (kJ)', grid: true, dataLabels: true, labelColor: DIM, yMax: 200,
          data: [['A · 40 m', 196], ['B · 0 m', 0], ['C · 20 m', 98], ['D · 30 m', 147]].map(([label, value]) => ({ label, value })),
          series: [{ name: 'Ec (kJ)', values: [0, 196, 98, 49], color: PINK }] }),
        img(MINI, 750, 180, 460, 240, 'Vía con los puntos A, B, C y D'),
        text('Vagón con pasajeros: <b>500 kg</b>. Cada barra mide lo mismo: <b>196 kJ</b>.', 760, 440, 440, 90, { fontFamily: B, fontSize: 24, color: W }),
        on(text('Lo que pierde una energía lo gana la otra.', 760, 550, 440, 90, { fontFamily: H, fontSize: 34, color: BULB }), 'fade-up')],
        notes: 'Ep = 500 · 9,8 · 40 = 196 000 J en A. En B toda es cinética; en C, mitad y mitad. La barra total no cambia: la energía mecánica se conserva (sin rozamiento).' },
      { title: '¿A qué velocidad llega abajo?', layout: 'titleOnly', bg: sky, back: stars(), extra: [
        on(m('m\\,g\\,h = \\tfrac{1}{2}\\,m\\,v^2', 90, 190, 620, 80, 42, W), 'fade-up'),
        on(m('v = \\sqrt{2\\,g\\,h}', 90, 290, 620, 90, 42, MINT), 'fade-up'),
        on(m('v = \\sqrt{2 \\cdot 9{,}8 \\cdot 40} \\approx 28\\ \\text{m/s}', 90, 400, 620, 90, 40, W), 'fade-up'),
        on(hd('≈ 101 km/h', 760, 250, 440, 140, 96, BULB, { textAlign: 'center' }), 'zoom-in', { sound: 'pop' }),
        on(card('¡La masa se simplifica! Llegue lleno o vacío, el vagón baja igual de rápido.', 760, 430, 440, 150, PINK, { color: W, fontFamily: B, fontSize: 25 }), 'fade-up'),
        text('Paso a paso: un clic por línea.', 90, 520, 620, 40, { fontFamily: B, fontSize: 20, color: DIM })],
        notes: 'Toda la energía potencial de arriba se convierte en cinética abajo. Al igualar, la m está a los dos lados y se va. 28 m/s · 3,6 ≈ 101 km/h.' },
      { title: 'La tabla de la vía', layout: 'titleOnly', bg: sky, back: stars(), extra: [
        tableBlock({ x: 80, y: 180, w: 640, h: 400, fontSize: 25, header: true, headBg: '#5b2fa8', headFg: BULB, stroke: '#ffffff40', banded: true, band: '#ffffff', bandAlpha: 0.07, color: W, colW: [2, 2, 2, 2],
          rows: [['h (m)', 'Ep (kJ)', 'Ec (kJ)', 'v (m/s)'], ...[40, 30, 20, 10, 0].map((h, i) => [String(h), `=REDONDEAR(500*9,8*A${i + 2}/1000;1)`, `=196-B${i + 2}`, `=REDONDEAR((2*C${i + 2}*1000/500)^0,5;1)`])] }),
        chartBlock({ x: 760, y: 180, w: 440, h: 400, chartType: 'line', color: PINK, grid: true, labelColor: DIM, xTitle: 'altura (m)', yTitle: 'v (m/s)', seriesName: 'Velocidad',
          data: [40, 30, 20, 10, 0].map((h, i) => ({ label: String(h), value: [0, 14, 19.8, 24.2, 28][i] })) }),
        text('Las columnas se calculan solas: cambia la altura y mira la velocidad.', 80, 600, 1120, 50, { fontFamily: B, fontSize: 22, color: DIM })],
        notes: 'Fórmulas: Ep =REDONDEAR(500*9,8*A2/1000;1), Ec =196-B2 y v =REDONDEAR((2*C2*1000/500)^0,5;1). La velocidad no crece en línea recta con lo que baja: va con la raíz.' },
      { title: 'La energía no desaparece: se transforma', layout: 'titleOnly', bg: sky, back: stars(), extra: [
        dg('chevrons', 'Motor eléctrico\nPotencial arriba\nCinética abajo\nCalor y sonido', 80, 185, 1120, 150, { oneByOne: true, colors: 'colorful', fontScale: 0.9 }),
        chartBlock({ x: 80, y: 360, w: 560, h: 300, chartType: 'doughnut', color: PINK, labelColor: W,
          data: [{ label: 'Rozamiento con la vía', value: 45, color: PINK }, { label: 'Frenos al final', value: 27, color: BULB }, { label: 'Resistencia del aire', value: 25, color: SKY }, { label: 'Sonido', value: 3, color: MINT }] }),
        text('¿Adónde van los 196 kJ en una vuelta completa? Se convierten en <b>energía térmica</b>: la vía y los frenos se calientan.', 680, 380, 520, 180, { fontFamily: B, fontSize: 25, color: W }),
        text('Reparto inventado para el ejemplo', 680, 590, 520, 40, { fontFamily: B, fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'La cadena de transformaciones aparece paso a paso. Con rozamiento la energía mecánica disminuye, pero la energía total se conserva: se dispersa como calor.' },
      { layout: 'blank', bg: sky, extra: [quiz('Si la primera bajada fuera el doble de alta, la velocidad abajo…', ['Se duplicaría', 'Se multiplicaría por 1,41', 'Se multiplicaría por 4', 'No cambiaría'], 1)],
        notes: 'v = √(2gh): al duplicar h, la velocidad se multiplica por √2 ≈ 1,41. Quien elija «el doble» ha olvidado la raíz.' },
      { layout: 'blank', bg: sky, back: stars(), transition: 'convex', extra: [
        text('¡Diseña tu bajada!', 80, 90, 760, 110, { fontFamily: H, fontSize: 80, wordart: 'neon', wordartColor: MINT }),
        text('Queremos que el vagón llegue abajo a <b>72 km/h</b>. ¿Desde qué altura tiene que caer?', 90, 220, 700, 130, { fontFamily: B, fontSize: 32, color: W }),
        text(ul('Pasa 72 km/h a m/s', 'Despeja h de v = √(2gh)', 'Compara con un edificio (un piso ≈ 3 m)'), 90, 360, 700, 220, { fontFamily: B, fontSize: 26, color: W }),
        timer(240, 880, 170, 320, { color: BULB, endText: '¡Arriba!' }),
        text('Solución en las notas', 880, 510, 320, 40, { fontFamily: B, fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Cuenta atrás de 4 minutos. Solución: 72 km/h = 20 m/s; h = v² / 2g = 400 / 19,6 ≈ 20,4 m, unos 7 pisos.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · Electric circuits on a circuit board: green solder mask, copper tracks and pads, white
  // silkscreen, a LED that lights up, current that runs round a series loop, a table and a scatter, code.
  edu_phys_circuits: { name: 'Circuitos y ley de Ohm', cat: 'edu', summary: 'Placa de circuito: corriente que recorre la pista, LED que luce, ley de Ohm, serie y paralelo, tabla con fórmulas, dispersión y código', make: () => {
    const PCB = '#0b3d2a', CU = '#d9a441', PAD = '#e8c170', SILK = '#f2f5ef', LED = '#ff3b3b', GRN = '#62f08d', DIM = '#a9c9b6', H = FF.mono;
    const TRACES = svgURL(1280, 720, [[[0, 690], [260, 690], [300, 650], [620, 650]], [[1280, 40], [1010, 40], [970, 80], [700, 80]], [[0, 120], [40, 120], [80, 160], [80, 260]],
      [[1280, 600], [1220, 600], [1180, 640], [1180, 720]], [[620, 0], [620, 30], [660, 60]], [[0, 520], [30, 520]]].map(pts => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${CU}" stroke-opacity=".35" stroke-width="8" stroke-linejoin="round"/>`
      + `<circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="11" fill="${PAD}" fill-opacity=".45"/>`).join('')
      + Array.from({ length: 6 }, (_, i) => `<circle cx="${1140 + (i % 3) * 30}" cy="${660 + Math.floor(i / 3) * 26}" r="7" fill="none" stroke="${PAD}" stroke-opacity=".4" stroke-width="3"/>`).join(''));
    const silk = (t, x, y, w, h, size, color = SILK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.15, ...p });
    // A resistor (zigzag) between two points on a horizontal wire, as a stroke.
    const zig = (x, y, w) => lines([[x, y], ...Array.from({ length: 6 }, (_, i) => [x + (i + 0.5) * w / 6, y + (i % 2 ? 14 : -14)]), [x + w, y]], SILK, 3);
    const battery = (x, y) => [shape('rect', x - 22, y - 4, 44, 8, PCB), shape('rect', x - 26, y - 6, 52, 4, SILK), shape('rect', x - 14, y + 4, 28, 4, SILK)];
    const dot = (x, y) => shape('ellipse', x - 8, y - 8, 16, 16, GRN, { fill2: 'transparent', gradType: 'radial' });
    return numbered(withFg(build({ name: 'Circuitos y ley de Ohm', palette: 'forest', fonts: 'tech', title: { font: H, color: PAD, size: 46 }, body: { color: SILK },
      decor: () => [img(TRACES, 0, 0, 1280, 720, 'Pistas de cobre de la placa', { fit: 'fill' })] }, [
      { layout: 'blank', bg: PCB, extra: [
        silk('U1 · FÍSICA Y QUÍMICA · 3.º ESO', 100, 150, 620, 30, 20, DIM, { letterSpacing: 3 }),
        silk('CIRCUITOS<br>ELÉCTRICOS', 92, 190, 640, 200, 84, SILK, { fontWeight: 700, lineHeight: 1.05 }),
        silk('Voltaje, intensidad y resistencia: la ley de Ohm', 100, 410, 620, 80, 28, PAD),
        lines([[760, 470], [760, 260], [1080, 260], [1080, 470], [760, 470]], CU, 10),
        ...battery(760, 365),
        shape('rect', 880, 248, 90, 24, '#1e2a2a', { stroke: PAD, strokeWidth: 2 }),
        ...[892, 912, 932].map((x, i) => shape('rect', x, 248, 8, 24, ['#8a4b2a', '#111111', '#8a4b2a'][i])),
        shape('ellipse', 1048, 345, 64, 64, '#5a1010', { stroke: SILK, strokeWidth: 3 }),
        silk('LED1', 1000, 420, 120, 30, 18, DIM, { textAlign: 'center' }), silk('R1 150 Ω', 860, 210, 140, 30, 18, DIM, { textAlign: 'center' }), silk('+ 5 V', 640, 350, 100, 30, 18, DIM, { textAlign: 'right' }),
        withAnims(dot(760, 470), path([[0, -210], [320, -210], [320, 0], [0, 0]], { start: 'afterPrev', duration: 2600 })),
        after(glow(990, 287, 180, LED, PCB, 90), 'fade-in', { duration: 700, sound: 'click' }),
        along(shape('ellipse', 1052, 349, 56, 56, LED, { fill2: '#ffd0d0', gradType: 'radial' }), 'fade-in', { duration: 700 })],
        notes: 'Portada con aspecto de placa: pistas de cobre y serigrafía blanca. Al llegar, un electrón da la vuelta al circuito y el LED se enciende. Pregunta: ¿para qué sirve la resistencia R1?' },
      { title: 'Tres magnitudes', layout: 'titleOnly', bg: PCB, extra: [
        ...[['V', 'Voltaje', 'voltio (V)', 'El empuje que da la pila. Como la altura de un depósito de agua.', 'battery-full', PAD], ['I', 'Intensidad', 'amperio (A)', 'Cuánta carga pasa cada segundo. Como el caudal de una tubería.', 'waves', GRN],
          ['R', 'Resistencia', 'ohmio (Ω)', 'Lo que frena el paso de la corriente. Como un estrechamiento del tubo.', 'shield-check', '#ff9b6b']].flatMap(([s, n, u, t, ic, c], i) => { const x = 90 + i * 375;
          return [on(shape('rounded', x, 180, 350, 460, '#ffffff0c', { stroke: c, strokeWidth: 2 }), 'fade-up'),
            along(silk(s, x + 20, 195, 120, 100, 90, c, { fontWeight: 700 }), 'fade-up'), along(icon(ic, x + 270, 215, 56, c), 'fade-up'),
            along(silk(n, x + 24, 310, 310, 44, 32, SILK, { fontWeight: 700 }), 'fade-up'), along(silk(u, x + 24, 358, 310, 34, 22, c), 'fade-up'),
            along(text(t, x + 24, 405, 306, 150, { fontSize: 25, color: DIM }), 'fade-up'), along(shape('rect', x + 24, 560, 302, 2, c, { opacity: 50 }), 'fade-up'),
            ...[i === 0 ? [lines([[x + 60, 600], [x + 160, 600]], c, 3), shape('rect', x + 160, 578, 4, 44, c), shape('rect', x + 180, 588, 4, 24, c), lines([[x + 184, 600], [x + 290, 600]], c, 3)]
              : i === 1 ? [lines([[x + 60, 600], [x + 145, 600]], c, 3), shape('ellipse', x + 145, 575, 50, 50, 'none', { stroke: c, strokeWidth: 3 }), silk('A', x + 145, 583, 50, 34, 24, c, { textAlign: 'center', fontWeight: 700 }), lines([[x + 195, 600], [x + 290, 600]], c, 3)]
              : [lines([[x + 60, 600], [x + 120, 600], ...Array.from({ length: 6 }, (_, k) => [x + 130 + k * 20, k % 2 ? 614 : 586]), [x + 240, 600], [x + 290, 600]], c, 3)]][0].map(b => along(b, 'fade-up'))]; })],
        notes: 'Tres clics. La analogía del agua ayuda: el voltaje es la diferencia de altura, la intensidad el caudal y la resistencia lo estrecho del tubo.' },
      { title: 'La ley de Ohm', layout: 'titleOnly', bg: PCB, extra: [
        m('V = I \\cdot R', 90, 200, 560, 140, 88, PAD),
        poly([[50, 0], [100, 100], [0, 100]], 780, 180, 360, 300, '#ffffff10', { stroke: PAD, strokeWidth: 4 }),
        shape('rect', 840, 360, 240, 4, PAD), shape('rect', 958, 364, 4, 112, PAD),
        on(silk('V', 900, 260, 120, 90, 72, PAD, { textAlign: 'center', fontWeight: 700 }), 'zoom-in'),
        on(silk('I', 845, 380, 110, 80, 64, GRN, { textAlign: 'center', fontWeight: 700 }), 'zoom-in'),
        on(silk('R', 965, 380, 110, 80, 64, '#ff9b6b', { textAlign: 'center', fontWeight: 700 }), 'zoom-in'),
        text('Tapa con el dedo lo que buscas: lo que queda arriba se divide entre lo de abajo.', 780, 500, 420, 120, { fontSize: 22, color: DIM, textAlign: 'center' }),
        on(card('Bombilla de linterna: <b>4,5 V</b> y <b>0,3 A</b><br>R = 4,5 ÷ 0,3 = <b style="color:#62f08d">15 Ω</b>', 90, 400, 600, 150, '#ffffff10', { color: SILK, fontSize: 28 }), 'fade-up', { sound: 'pop' })],
        notes: 'El triángulo es un truco para despejar: tapa R y queda V/I; tapa I y queda V/R. Si duplicamos el voltaje con la misma resistencia, la intensidad se duplica.' },
      { title: 'En serie o en paralelo', layout: 'titleOnly', bg: PCB, extra: [
        silk('EN SERIE', 90, 180, 520, 40, 26, PAD, { fontWeight: 700 }),
        lines([[130, 440], [130, 260], [570, 260], [570, 440], [130, 440]], CU, 6), ...battery(130, 350),
        shape('rect', 220, 248, 120, 24, PCB), zig(220, 260, 120), shape('rect', 380, 248, 120, 24, PCB), zig(380, 260, 120),
        silk('R₁', 250, 215, 60, 30, 20, DIM, { textAlign: 'center' }), silk('R₂', 410, 215, 60, 30, 20, DIM, { textAlign: 'center' }),
        withAnims(dot(130, 440), path([[0, -180], [440, -180], [440, 0], [0, 0]], { duration: 3000 })),
        m('R_{eq} = R_1 + R_2', 90, 480, 520, 70, 34, SILK),
        text('Un solo camino: si una bombilla se funde, se apagan todas.', 90, 560, 520, 80, { fontSize: 22, color: DIM }),
        silk('EN PARALELO', 680, 180, 520, 40, 26, PAD, { fontWeight: 700 }),
        lines([[720, 440], [720, 250], [1160, 250], [1160, 440], [720, 440]], CU, 6), lines([[860, 250], [860, 340], [1020, 340], [1020, 250]], CU, 6),
        ...battery(720, 345),
        shape('rect', 880, 238, 120, 24, PCB), zig(880, 250, 120), shape('rect', 880, 328, 120, 24, PCB), zig(880, 340, 120),
        silk('R₁', 910, 205, 60, 30, 20, DIM, { textAlign: 'center' }), silk('R₂', 910, 360, 60, 30, 20, DIM, { textAlign: 'center' }),
        m('\\dfrac{1}{R_{eq}} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}', 680, 470, 520, 90, 32, SILK),
        text('Varios caminos: así están los enchufes de casa.', 680, 570, 520, 70, { fontSize: 22, color: DIM })],
        notes: 'Un clic: un electrón recorre el circuito en serie. En serie las resistencias se suman; en paralelo la resistencia total es menor que la más pequeña de ellas.' },
      { title: 'En el laboratorio: medimos', layout: 'titleOnly', bg: PCB, extra: [
        tableBlock({ x: 80, y: 180, w: 520, h: 380, fontSize: 24, fontFamily: H, header: true, headBg: '#14563c', headFg: PAD, stroke: '#ffffff40', banded: true, band: '#ffffff', bandAlpha: 0.06, color: SILK, colW: [2, 2, 2],
          rows: [['V (V)', 'I (mA)', 'R (Ω)'], ...[['1,5', '15'], ['3', '30'], ['4,5', '44'], ['6', '61'], ['9', '90']].map(([v, i], k) => [v, i, `=REDONDEAR(A${k + 2}/B${k + 2}*1000;0)`])] }),
        chartBlock({ x: 640, y: 175, w: 560, h: 400, chartType: 'scatter', color: GRN, grid: true, labelColor: DIM, xTitle: 'V (voltios)', yTitle: 'I (mA)', xMin: 0, xMax: 10, yMin: 0, yMax: 100, seriesName: 'Medidas',
          data: [[1.5, 15], [3, 30], [4.5, 44], [6, 61], [9, 90]].map(([x, y]) => ({ label: String(x), value: y })) }),
        on(text('Los puntos caen sobre una recta: la resistencia es <b style="color:#e8c170">constante, unos 100 Ω</b>. Es un conductor óhmico.', 80, 585, 1120, 70, { fontSize: 24, color: SILK }), 'fade-up')],
        notes: 'Medidas de ejemplo con una resistencia de 100 Ω. La tercera columna es una fórmula: =REDONDEAR(A2/B2*1000;0) (los mA pasan a A). Pequeñas diferencias: errores de medida.' },
      { title: 'Calcular la resistencia de un LED', layout: 'titleOnly', bg: PCB, extra: [
        // (Its own animation, so its three steps come before the card, which talks about the last one.)
        after(codeBlock({ x: 80, y: 175, w: 700, h: 470, fontSize: 20, lang: 'python', lineSteps: '1-4|6-7|9-12',
          code: '# Resistencia para proteger un LED rojo\nV_fuente = 5.0    # voltios\nV_led = 2.0       # lo que «gasta» el LED\nI_led = 0.020     # 20 mA\n\nR = (V_fuente - V_led) / I_led\nprint(f"R = {R:.0f} ohmios")    # R = 150 ohmios\n\n# Valor comercial igual o mayor\nserie = [100, 120, 150, 180, 220, 270, 330]\nelegida = min(r for r in serie if r >= R)\nprint("Usa una de", elegida, "ohmios")' }), 'fade-in', { duration: 300 }),
        m('\\begin{aligned} R &= \\dfrac{V - V_{LED}}{I} \\\\[4pt] &= \\dfrac{5 - 2}{0{,}02} = 150\\ \\Omega \\end{aligned}', 820, 180, 380, 180, 30, PAD),
        text('Sin resistencia, el LED recibe demasiada corriente y se quema en un segundo.', 820, 380, 380, 110, { fontSize: 24, color: SILK }),
        on(card('Si la que tienes es de 220 Ω, también vale: el LED brillará un poco menos.', 820, 505, 380, 130, '#ffffff10', { color: DIM, fontSize: 22 }), 'fade-up')],
        notes: 'El código se resalta en tres pasos: datos, cálculo y elección de un valor comercial. Es la ley de Ohm aplicada a la resistencia, con la tensión que le queda después del LED.' },
      { layout: 'blank', bg: PCB, extra: [quiz('Dos resistencias de 100 Ω en paralelo equivalen a…', ['200 Ω', '100 Ω', '50 Ω', '0 Ω'], 2)],
        notes: '1/R = 1/100 + 1/100 = 2/100, así que R = 50 Ω. En paralelo la corriente tiene dos caminos y pasa más fácilmente.' },
      { layout: 'blank', bg: PCB, transition: 'fade', extra: [
        silk('SEGURIDAD ANTE TODO', 90, 100, 900, 60, 48, PAD, { fontWeight: 700 }),
        dg('cards', 'Nunca toques un enchufe con las manos mojadas\nDesconecta antes de manipular un circuito\nNo pongas un cable directo entre los bornes de la pila\nEn el laboratorio, pilas: nunca la red de casa', 90, 200, 1100, 360, { oneByOne: true, colors: 'accent' }),
        icon('triangle-alert', 1110, 95, 70, PAD)],
        notes: 'Normas que aparecen una a una. Un cortocircuito entre los bornes de la pila hace que se caliente mucho: la resistencia del cable es casi cero y la intensidad se dispara.' },
    ]), SILK));
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · Atomic models as a museum engraving: cream paper, a double frame, sepia ink, a timeline,
  // the same electrons travelling from Thomson's pudding to Rutherford's nucleus and Bohr's orbits (Transform).
  edu_phys_atom: { name: 'Modelos atómicos', cat: 'edu', summary: 'Grabado de museo: línea del tiempo, electrones que viajan de Thomson a Bohr con Transformar, partículas alfa, tabla y etiquetas', make: () => {
    const PAPER = '#f3ead8', INK = '#2d2418', SEPIA = '#8a5a2b', RED = '#a63d2f', BLUE = '#2f5d8a', GREY = '#8c8478', DIM = '#6f6150', H = FF.cormorant;
    const frame = () => [shape('rect', 24, 24, 1232, 672, 'none', { stroke: SEPIA, strokeWidth: 3 }), shape('rect', 34, 34, 1212, 652, 'none', { stroke: SEPIA, strokeWidth: 1 })];
    const hd = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.05, ...p });
    // The atom's parts, with fixed ids so Transform carries them from model to model.
    const S = uid(), E = Array.from({ length: 6 }, () => uid()), CX = 380, CY = 430;
    const el = (i, x, y) => keep(shape('ellipse', x - 16, y - 16, 32, 32, BLUE, { stroke: INK, strokeWidth: 2 }), E[i]);
    const ring = (r, p = {}) => shape('ellipse', CX - r, CY - r, 2 * r, 2 * r, 'none', { stroke: SEPIA, strokeWidth: 2, ...p });
    const side = (title, body, y = 190) => [hd(title, 690, y, 510, 60, 44, SEPIA, { fontStyle: 'italic' }), text(body, 690, y + 70, 510, 300, { fontSize: 26, color: INK, lineHeight: 1.35 })];
    const COVER = svgURL(420, 420, [0, 60, 120].map(a => `<ellipse cx="210" cy="210" rx="190" ry="62" fill="none" stroke="${SEPIA}" stroke-width="2.5" transform="rotate(${a} 210 210)"/>`).join('')
      + `<circle cx="210" cy="210" r="30" fill="${RED}" stroke="${INK}" stroke-width="2"/>` + [[400, 210, 0], [210, 210, 60], [210, 210, 120]].map(([, , a], i) => {
        const r = a * Math.PI / 180, x = 210 + 190 * Math.cos(r) * (i ? -1 : 1), y = 210 + 190 * Math.sin(r) * (i ? -1 : 1); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${BLUE}"/>`; }).join(''));
    const LABEL = svgURL(560, 560, `<rect width="560" height="560" fill="${PAPER}"/><circle cx="280" cy="280" r="230" fill="none" stroke="${SEPIA}" stroke-width="3" stroke-dasharray="10 8"/>`
      + [[250, 260, RED], [300, 255, GREY], [275, 300, RED], [235, 305, GREY], [320, 298, RED], [280, 225, GREY]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="26" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('')
      + `<circle cx="510" cy="280" r="20" fill="${BLUE}" stroke="${INK}" stroke-width="2"/><circle cx="50" cy="280" r="20" fill="${BLUE}" stroke="${INK}" stroke-width="2"/>`);
    return numbered(build({ name: 'Modelos atómicos', palette: 'paper', fonts: 'classic', title: { font: H, color: INK, size: 54 }, body: { color: INK }, decor: frame }, [
      { layout: 'blank', bg: PAPER, extra: [
        text('FÍSICA Y QUÍMICA · 3.º DE ESO', 100, 150, 600, 40, { fontSize: 20, letterSpacing: 5, color: SEPIA }),
        hd('Dentro<br>del átomo', 92, 190, 640, 240, 116, INK, { fontStyle: 'italic' }),
        shape('rect', 100, 445, 120, 3, RED),
        text('Doscientos años de modelos para algo que nadie puede ver a simple vista', 100, 470, 560, 110, { fontSize: 28, color: DIM }),
        after(img(COVER, 760, 150, 420, 420, 'Grabado de un átomo con tres órbitas'), 'zoom-in', { duration: 1400 }),
        after(text('LÁMINA I', 760, 590, 420, 30, { fontSize: 16, letterSpacing: 6, color: SEPIA, textAlign: 'center' }), 'fade-in')],
        notes: 'Portada con aspecto de lámina de museo: papel crema, tinta sepia y doble marco. Pregunta inicial: si nadie ha visto un átomo a simple vista, ¿cómo sabemos cómo es?' },
      { title: 'Doscientos años de modelos', layout: 'titleOnly', bg: PAPER, extra: [
        dg('timeline', '1808 · Dalton\n  Esferas macizas e indivisibles\n1897 · Thomson\n  Descubre el electrón: el «pudin de pasas»\n1911 · Rutherford\n  Un núcleo diminuto y mucho vacío\n1913 · Bohr\n  Electrones en órbitas fijas\n1926 · Modelo actual\n  Nubes de probabilidad (orbitales)',
          90, 190, 1100, 420, { oneByOne: true, colors: 'outline', textColor: INK })],
        notes: 'Cada modelo aparece con un clic. Ninguno es «falso»: cada uno explicaba los experimentos de su época y se sustituyó cuando apareció uno que no encajaba.' },
      { title: 'Thomson: el pudin de pasas', layout: 'titleOnly', bg: PAPER, extra: [
        keep(shape('ellipse', CX - 190, CY - 190, 380, 380, '#e9c2ae', { stroke: SEPIA, strokeWidth: 3 }), S),
        ...[[300, 300], [470, 300], [250, 420], [520, 410], [320, 540], [450, 560], [380, 360]].map(([x, y]) => text('+', x - 15, y - 22, 30, 40, { fontSize: 32, fontWeight: 700, color: RED, textAlign: 'center' })),
        el(0, 290, 360), el(1, 430, 330), el(2, 340, 450), el(3, 470, 470), el(4, 260, 510), el(5, 400, 560),
        ...side('Una esfera positiva', 'La carga positiva llena todo el átomo, como una masa de bizcocho, y los <b style="color:#2f5d8a">electrones</b> (negativos) están incrustados como pasas.<br><br>El conjunto es neutro.')],
        notes: 'Thomson descubrió el electrón en 1897 con los rayos catódicos. Su modelo explicaba que los átomos fueran neutros. En la siguiente, Transformar lleva estos mismos electrones al modelo de Rutherford.' },
      { title: 'Rutherford: casi todo es vacío', layout: 'titleOnly', bg: PAPER, autoAnimate: true, transition: 'fade', extra: [
        ring(190, { dash: 'dash' }),
        keep(shape('ellipse', CX - 22, CY - 22, 44, 44, RED, { stroke: INK, strokeWidth: 2 }), S),
        ...[30, 90, 150, 210, 270, 330].map((a, i) => el(i, CX + 190 * Math.cos(a * Math.PI / 180), CY + 190 * Math.sin(a * Math.PI / 180))),
        ...[[300, false], [430, true], [560, false]].map(([y, back], i) => withAnims(shape('ellipse', 92, y - 9, 18, 18, '#d4a24c', { stroke: INK, strokeWidth: 1 }),
          path(back ? [[248, 0], [120, -70]] : [[540, i ? 12 : -12]], { start: i ? 'afterPrev' : 'click', duration: back ? 1600 : 1400, ...(back && { sound: 'pop' }) }))),
        ...side('Un núcleo diminuto', 'Bombardeó una lámina de oro con partículas alfa: casi todas la atravesaban, pero <b>unas pocas rebotaban</b>.<br><br>Conclusión: la carga positiva está concentrada en un núcleo minúsculo y los electrones giran lejos.')],
        notes: 'Transformar: la esfera positiva se encoge hasta ser el núcleo y los electrones se alejan. Un clic lanza tres partículas alfa: dos atraviesan y una rebota contra el núcleo, como en el experimento de 1911.' },
      { title: 'Bohr: órbitas con energía fija', layout: 'titleOnly', bg: PAPER, autoAnimate: true, transition: 'fade', extra: [
        ring(110), ring(200),
        keep(shape('ellipse', CX - 32, CY - 32, 64, 64, RED, { stroke: INK, strokeWidth: 2 }), S),
        hd('6+', CX - 32, CY - 22, 64, 44, 30, '#ffffff', { textAlign: 'center', fontWeight: 700 }),
        el(0, CX + 110, CY), el(1, CX - 110, CY), ...[45, 135, 225, 315].map((a, i) => el(i + 2, CX + 200 * Math.cos(a * Math.PI / 180), CY + 200 * Math.sin(a * Math.PI / 180))),
        ...side('Niveles de energía', 'Los electrones solo pueden estar en ciertas órbitas. Al saltar de una exterior a otra interior, <b>emiten luz</b> de un color concreto.<br><br>Aquí, un átomo de carbono: 2 electrones en la primera capa y 4 en la segunda.')],
        notes: 'Transformar otra vez: los seis electrones se colocan en dos capas (2 y 4), la configuración del carbono. El modelo de Bohr explicó por qué cada elemento emite unos colores concretos (su espectro).' },
      { title: 'Las tres partículas', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 90, y: 180, w: 700, h: 260, fontSize: 25, header: true, headBg: SEPIA, headFg: PAPER, stroke: '#8a5a2b80', banded: true, band: SEPIA, bandAlpha: 0.08, color: INK, colW: [3, 2, 3, 3],
          rows: [['Partícula', 'Carga', 'Masa (u)', 'Dónde está'], ['Protón', '+1', '1,0073', 'Núcleo'], ['Neutrón', '0', '1,0087', 'Núcleo'], ['Electrón', '−1', '0,00055', 'Corteza']] }),
        m('{}^{A}_{Z}\\mathrm{X} \\qquad A = Z + N', 830, 190, 370, 100, 34, INK),
        text('<b>Z</b>: número atómico (protones)<br><b>A</b>: número másico<br><b>N</b>: neutrones', 830, 300, 370, 140, { fontSize: 24, color: DIM }),
        on(m('{}^{12}_{\\ 6}\\mathrm{C}', 140, 490, 220, 110, 54, INK), 'fade-up'),
        on(m('{}^{14}_{\\ 6}\\mathrm{C}', 400, 490, 220, 110, 54, RED), 'fade-up'),
        on(text('<b>Isótopos</b>: mismo elemento (mismo Z), distinto número de neutrones. El carbono-14 sirve para datar restos antiguos.', 660, 480, 540, 140, { fontSize: 24, color: INK }), 'fade-left')],
        notes: 'El electrón pesa casi 2 000 veces menos que el protón: la masa del átomo está en el núcleo. El carbono-12 tiene 6 neutrones y el carbono-14, 8.' },
      { layout: 'blank', bg: PAPER, transition: 'zoom', extra: [
        text('UNA CUESTIÓN DE ESCALA', 100, 120, 1080, 40, { fontSize: 22, letterSpacing: 6, color: SEPIA, textAlign: 'center' }),
        hd('100 000', 100, 170, 1080, 200, 190, RED, { textAlign: 'center' }),
        text('veces más grande es el átomo que su núcleo', 100, 380, 1080, 60, { fontSize: 34, color: INK, textAlign: 'center' }),
        shape('ellipse', 628, 480, 24, 24, RED, { stroke: INK, strokeWidth: 1 }),
        on(text('Si el núcleo fuera una canica de 1 cm en el centro de la plaza del pueblo, los electrones más cercanos estarían a medio kilómetro.', 190, 530, 900, 110, { fontSize: 26, color: DIM, textAlign: 'center', fontStyle: 'italic' }), 'fade-up')],
        notes: 'Cifra gigante. Un átomo mide unos 10⁻¹⁰ m y su núcleo unos 10⁻¹⁵ m: cien mil veces menos. Por eso decimos que la materia está «casi vacía».' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'label', fontSize: 28, question: 'Pon nombre a cada parte del átomo', x: 80, y: 60, w: 1120, h: 600, image: LABEL,
        options: ['Protón', 'Neutrón', 'Electrón', 'Órbita'], points: [{ x: 57, y: 53 }, { x: 42, y: 55 }, { x: 91, y: 50 }, { x: 50, y: 9 }] })],
        notes: 'Actividad «Etiquetar una imagen» desde el móvil: los protones son las bolas rojas del núcleo; los neutrones, las grises. Revela corrige solo.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('Un átomo de sodio tiene Z = 11 y A = 23. ¿Cuántos neutrones tiene?', ['11', '12', '23', '34'], 1)],
        notes: 'N = A − Z = 23 − 11 = 12. Quien responda 34 ha sumado; quien responda 11 ha confundido neutrones con protones.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · Chemical reactions as a recipe: kitchen tiles, a recipe card, a fizzing flask, the
  // reaction as an equation, a scale and two tables that add up, ball molecules and fill-in gaps.
  edu_phys_reactions: { name: 'Reacciones químicas: la receta', cat: 'edu', summary: 'Cocina de azulejos: ficha de receta, matraz que burbujea, ecuaciones, balanza con tablas que suman, moléculas de bolas, huecos y líneas', make: () => {
    const TILE = '#f4f1ea', CARD = '#fffdf8', INK = '#2e2a26', TOM = '#c8442f', BASIL = '#4f7f3a', BUTTER = '#f1c75b', BLUE = '#2f6690', DIM = '#7a7064', H = FF.pacifico, B = FF.merri;
    const TILES = svgURL(1280, 720, Array.from({ length: 17 }, (_, i) => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="720" stroke="#d9d3c7" stroke-width="3"/>`).join('')
      + Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${i * 80}" x2="1280" y2="${i * 80}" stroke="#d9d3c7" stroke-width="3"/>`).join(''));
    const recipe = (x, y, w, h, rot = 0) => [shape('rect', x, y, w, h, CARD, { rotation: rot, shadow: { x: 0, y: 8, blur: 20, color: '#00000025' } }), shape('rect', x, y, w, 14, TOM, { rotation: rot })];
    const hd = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.3, ...p });
    // A molecule from balls: [dx, dy, r, colour, letter] around (x, y).
    const ball = (x, y, r, c, l) => [shape('ellipse', x - r, y - r, 2 * r, 2 * r, c, { stroke: INK, strokeWidth: 2 }), text(l, x - r, y - 14, 2 * r, 28, { fontSize: 18, fontWeight: 700, color: c === '#2b2b2b' ? '#ffffff' : INK, textAlign: 'center' })];
    const mol = (x, y, parts) => parts.flatMap(([dx, dy, r, c, l]) => ball(x + dx, y + dy, r, c, l));
    const Cb = '#2b2b2b', Hb = '#ffffff', Ob = '#e05a47';
    const CH4 = [[-30, -30, 14, Hb, 'H'], [30, -30, 14, Hb, 'H'], [-30, 30, 14, Hb, 'H'], [30, 30, 14, Hb, 'H'], [0, 0, 24, Cb, 'C']], O2 = [[-18, 0, 20, Ob, 'O'], [18, 0, 20, Ob, 'O']];
    const CO2 = [[-38, 0, 20, Ob, 'O'], [38, 0, 20, Ob, 'O'], [0, 0, 24, Cb, 'C']], H2O = [[-28, 20, 14, Hb, 'H'], [28, 20, 14, Hb, 'H'], [0, 0, 22, Ob, 'O']];
    const FLASK = svgURL(300, 380, `<path d="M115 20 H185 V140 L280 340 Q290 365 262 365 H38 Q10 365 20 340 L115 140 Z" fill="#ffffff" fill-opacity=".55" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
      + `<path d="M74 230 H226 L276 338 Q284 356 262 356 H38 Q16 356 24 338 Z" fill="${BUTTER}" fill-opacity=".85"/><rect x="105" y="8" width="90" height="18" rx="6" fill="${INK}"/>`);
    return numbered(build({ name: 'Reacciones químicas: la receta', palette: 'grayscale', fonts: 'editorial', title: { font: H, color: TOM, size: 46, bold: false }, body: { color: INK, font: B },
      decor: () => [img(TILES, 0, 0, 1280, 720, 'Azulejos de cocina', { fit: 'fill' })] }, [
      { layout: 'blank', bg: TILE, extra: [
        ...recipe(90, 110, 640, 500, -2),
        text('RECETA N.º 1 · 3.º DE ESO', 140, 160, 540, 30, { fontFamily: B, fontSize: 18, letterSpacing: 4, color: DIM, rotation: -2 }),
        hd('Reacciones<br>químicas', 130, 195, 560, 220, 68, TOM, { rotation: -2, lineHeight: 1.25 }),
        text('<b>Ingredientes:</b> los reactivos<br><b>El plato:</b> los productos<br><b>El secreto:</b> nada se pierde, todo se transforma', 140, 440, 560, 140, { fontFamily: B, fontSize: 22, color: INK, rotation: -2, lineHeight: 1.45 }),
        img(FLASK, 850, 230, 300, 380, 'Matraz con líquido amarillo'),
        ...[[930, 470, 22, 0], [990, 500, 16, 250], [1040, 455, 26, 500], [960, 520, 14, 800], [1060, 510, 18, 1100]].map(([x, y, d, dl], i) => withAnims(shape('ellipse', x, y, d, d, '#ffffff', { stroke: INK, strokeWidth: 2 }),
          path([[i % 2 ? 8 : -8, -120], [0, -330]], { start: i ? 'withPrev' : 'afterPrev', delay: dl, duration: 2400, ...(i === 0 && { sound: 'pop' }) }), A('fade-out', { start: 'afterPrev', duration: 300 })))],
        notes: 'Portada: una ficha de receta sobre azulejos y un matraz del que salen burbujas al llegar. La idea de toda la clase: una reacción es una receta en la que los ingredientes se convierten en algo nuevo.' },
      { title: '¿Cambio físico o químico?', layout: 'titleOnly', bg: TILE, extra: [
        ...recipe(90, 180, 520, 300), ...recipe(670, 180, 520, 300),
        icon('snowflake', 120, 215, 50, BLUE), text('Físico', 185, 212, 300, 60, { fontFamily: H, fontSize: 38, color: BLUE }),
        text(ul('El hielo se funde', 'El azúcar se disuelve en la leche', 'El papel se rompe'), 120, 280, 460, 130, { fontFamily: B, fontSize: 23, color: INK }),
        text('La sustancia sigue siendo la misma.', 120, 420, 460, 40, { fontFamily: B, fontSize: 20, color: DIM, fontStyle: 'italic' }),
        icon('flame', 700, 215, 50, TOM), text('Químico', 765, 212, 300, 60, { fontFamily: H, fontSize: 38, color: TOM }),
        text(ul('El pan se tuesta', 'El hierro se oxida', 'El huevo se cuaja en la sartén'), 700, 280, 460, 130, { fontFamily: B, fontSize: 23, color: INK }),
        text('Aparecen sustancias nuevas.', 700, 420, 460, 40, { fontFamily: B, fontSize: 20, color: DIM, fontStyle: 'italic' }),
        text('Pistas de que hay reacción:', 90, 515, 1100, 40, { fontFamily: B, fontSize: 22, color: INK, fontWeight: 700 }),
        ...[['wind', 'Sale un gas'], ['sparkles', 'Cambia el color'], ['thermometer', 'Calor o frío'], ['lightbulb', 'Se emite luz'], ['droplet', 'Aparece un sólido']].flatMap(([ic, t], i) => [
          on(card(t, 90 + i * 224, 565, 204, 80, CARD, { color: INK, fontFamily: B, fontSize: 19, pad: [10, 12, 10, 58], vAlign: 'middle', shadow: { x: 0, y: 4, blur: 10, color: '#00000020' } }), 'fade-up'),
          along(icon(ic, 102 + i * 224, 585, 38, [BASIL, BUTTER, TOM, '#d9a400', BLUE][i]), 'fade-up')])],
        notes: 'Dos fichas: cambios físicos (la sustancia no cambia) y químicos (aparecen sustancias nuevas). Las pistas salen una a una. Ojo: un cambio de color no siempre es reacción.' },
      { title: 'La receta: reactivos → productos', layout: 'titleOnly', bg: TILE, extra: [
        ...recipe(70, 180, 1140, 460),
        m('\\mathrm{NaHCO_3 + CH_3COOH \\longrightarrow CH_3COONa + H_2O + CO_2}', 90, 220, 1100, 90, 34, INK),
        on(shape('rect', 120, 320, 470, 6, BASIL), 'fade-in'), along(text('REACTIVOS · los ingredientes', 120, 335, 470, 40, { fontFamily: B, fontSize: 20, color: BASIL, fontWeight: 700, textAlign: 'center' }), 'fade-in'),
        on(shape('rect', 680, 320, 480, 6, TOM), 'fade-in'), along(text('PRODUCTOS · el plato', 680, 335, 480, 40, { fontFamily: B, fontSize: 20, color: TOM, fontWeight: 700, textAlign: 'center' }), 'fade-in'),
        ...[['Bicarbonato', 'el de la repostería', BASIL], ['Vinagre', 'ácido acético', BASIL], ['Acetato de sodio', 'queda disuelto', TOM], ['Dióxido de carbono', '¡la espuma!', TOM]].flatMap(([n, d, c], i) => [
          on(text(`<span style="font-family:${H};font-size:30px;color:${c}">${n}</span><br><span style="font-size:20px;color:${DIM}">${d}</span>`, 110 + i * 270, 420, 250, 120, { fontFamily: B, textAlign: 'center', fontSize: 20 }), 'fade-up')]),
        text('Las sustancias de partida desaparecen y aparecen otras con propiedades distintas.', 110, 570, 1060, 50, { fontFamily: B, fontSize: 22, color: INK, textAlign: 'center' })],
        notes: 'La reacción del volcán casero. A la izquierda de la flecha, lo que mezclamos; a la derecha, lo que se forma. La espuma es el CO₂ que se escapa.' },
      { title: 'Nada se pierde: conservación de la masa', layout: 'titleOnly', bg: TILE, extra: [
        shape('rect', 328, 380, 6, 40, DIM), shape('rect', 946, 380, 6, 40, DIM),
        shape('rounded', 300, 420, 680, 14, INK), shape('triangle', 600, 434, 80, 86, INK),
        tableBlock({ x: 90, y: 180, w: 480, h: 200, fontSize: 22, fontFamily: B, header: true, headBg: BASIL, headFg: '#ffffff', stroke: '#2e2a2640', color: INK, colW: [3, 2],
          rows: [['Antes', 'Masa (g)'], ['Bicarbonato', '8,4'], ['Vinagre', '100'], ['Total', '=SUMA(ARRIBA)']] }),
        tableBlock({ x: 710, y: 180, w: 480, h: 200, fontSize: 22, fontFamily: B, header: true, headBg: TOM, headFg: '#ffffff', stroke: '#2e2a2640', color: INK, colW: [3, 2],
          rows: [['Después', 'Masa (g)'], ['Líquido del vaso', '104'], ['CO₂ (gas)', '4,4'], ['Total', '=SUMA(ARRIBA)']] }),
        on(m('108{,}4\\ \\text{g} = 108{,}4\\ \\text{g}', 390, 530, 500, 70, 40, BASIL), 'zoom-in', { sound: 'chime' }),
        text('En un vaso abierto la balanza marcaría 4,4 g menos: el gas se escapa. Con un globo en la boca de la botella, la masa no cambia.', 90, 610, 1100, 60, { fontFamily: B, fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Las dos tablas suman solas (=SUMA(ARRIBA)). La ley de conservación de la masa: en una reacción la masa total de los reactivos es igual a la de los productos. Cantidades calculadas para 0,1 mol de bicarbonato.' },
      { title: 'Ajustar la ecuación', layout: 'titleOnly', bg: TILE, extra: [
        ...recipe(70, 175, 1140, 300),
        ...mol(160, 300, CH4), text('+', 225, 270, 40, 60, { fontSize: 44, color: INK, textAlign: 'center' }),
        ...mol(310, 300, O2), ...mol(310, 390, O2).map((b, k) => withAnims(b, A('zoom-in', k ? { start: 'withPrev' } : { sound: 'pop' }))),
        shape('rightarrow', 420, 280, 140, 40, DIM),
        ...mol(650, 300, CO2), text('+', 720, 270, 40, 60, { fontSize: 44, color: INK, textAlign: 'center' }),
        ...mol(820, 300, H2O), ...mol(960, 300, H2O).map(b => withAnims(b, A('zoom-in', { start: 'withPrev' }))),
        m('\\mathrm{CH_4 + O_2 \\longrightarrow CO_2 + H_2O}', 90, 500, 520, 70, 30, DIM),
        on(m('\\mathrm{CH_4 + 2\\,O_2 \\longrightarrow CO_2 + 2\\,H_2O}', 640, 500, 560, 70, 30, TOM), 'fade-left'),
        text('Sin ajustar: 2 O a la izquierda y 3 a la derecha.', 90, 580, 520, 60, { fontFamily: B, fontSize: 20, color: DIM }),
        text('Ajustada: 1 C, 4 H y 4 O a cada lado.', 640, 580, 560, 60, { fontFamily: B, fontSize: 20, color: INK })],
        notes: 'La combustión del gas de la cocina (metano). Con un clic aparecen a la vez la segunda molécula de oxígeno y la segunda de agua: así cuadran los átomos. Solo se cambian los números de delante, nunca los subíndices.' },
      { layout: 'blank', bg: TILE, extra: [pollBlock({ kind: 'gaps', fontSize: 38, x: 80, y: 60, w: 1120, h: 600, question: 'Ajusta las ecuaciones: escribe el coeficiente que falta',
        text: '[2] H₂ + O₂ → [2] H₂O\nN₂ + [3] H₂ → [2] NH₃\n[2] Mg + O₂ → [2] MgO' })],
        notes: 'Actividad «Completar huecos» con nota, desde el móvil. Formación del agua, del amoniaco y del óxido de magnesio (la llama blanca de las bengalas).' },
      { title: 'Más deprisa o más despacio', layout: 'titleOnly', bg: TILE, extra: [
        ...recipe(70, 175, 640, 480),
        chartBlock({ x: 90, y: 200, w: 600, h: 440, chartType: 'line', color: BLUE, grid: true, seriesName: 'Vinagre a 20 °C', xTitle: 'tiempo (s)', yTitle: 'CO₂ (mL)', yMin: 0,
          data: [0, 10, 20, 30, 40, 50, 60].map((t, i) => ({ label: String(t), value: [0, 30, 52, 68, 79, 86, 90][i] })),
          series: [{ name: 'Vinagre a 40 °C', values: [0, 55, 80, 88, 90, 90, 90], color: TOM }] }),
        ...[['thermometer', 'Temperatura', 'más caliente, más rápida', TOM], ['flask-conical', 'Concentración', 'más reactivo por litro', BLUE], ['puzzle', 'Superficie', 'en polvo antes que en trozos', BASIL], ['sparkles', 'Catalizador', 'la acelera sin gastarse', '#b8860b']]
          .flatMap(([ic, t, d, c], i) => [on(icon(ic, 760, 195 + i * 115, 50, c), 'fade-left'), along(text(`<b>${t}</b><br><span style="font-size:19px;color:${DIM}">${d}</span>`, 830, 188 + i * 115, 380, 90, { fontFamily: B, fontSize: 24, color: INK }), 'fade-left')])],
        notes: 'Gráfica de ejemplo: el mismo vinagre a 20 °C y a 40 °C. Al final sale el mismo gas (lo que hay de bicarbonato), pero en caliente sale antes. Cuatro factores, uno por clic.' },
      { layout: 'blank', bg: TILE, transition: 'page', extra: [
        ...recipe(90, 90, 700, 540, 1.5),
        hd('El volcán, paso a paso', 130, 120, 620, 80, 46, TOM, { rotation: 1.5 }),
        text(ul('Gafas puestas y mesa protegida', '2 cucharadas de bicarbonato en el vaso', 'Unas gotas de colorante', 'Vierte 100 mL de vinagre… ¡y observa!', 'Anota tres pistas de que ha habido reacción'), 130, 220, 620, 320, { fontFamily: B, fontSize: 24, color: INK, rotation: 1.5, lineHeight: 1.5 }),
        timer(300, 880, 180, 300, { style: 'ring', color: TOM, endText: '¡Al lío!' }),
        icon('shield-check', 980, 520, 90, BASIL)],
        notes: 'Cuenta atrás de 5 minutos para hacerlo por grupos. Pistas que deberían anotar: sale un gas (espuma), se enfría un poco el vaso y desaparece el sólido.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · Waves and sound in a recording studio: dark panels, neon waveforms that draw themselves,
  // equaliser bars, a phone with a sound meter, a lightning bolt with a drum roll and a countdown.
  edu_phys_sound: { name: 'Ondas y sonido', cat: 'edu', summary: 'Estudio de grabación: ondas de neón que se dibujan, ecualizador, partes de la onda, barras, sonómetro en el móvil, trueno y concurso', make: () => {
    const BG = '#0b0f1e', PANEL = '#151b33', CY = '#2de2e6', MAG = '#ff3cac', LIME = '#c6ff3d', W = '#eef2ff', DIM = '#9aa3c7', H = FF.anton, B = FF.mont;
    const studio = () => [glow(-300, -360, 900, '#1b2350', BG, 60), glow(900, 380, 700, '#2a1240', BG, 50)];
    const hd = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.05, ...p });
    const tx = (t, x, y, w, h, size = 24, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: B, fontSize: size, color, ...p });
    const METER = svgURL(360, 720, `<rect width="360" height="720" fill="#0e1226"/>`
      + `<path d="M60 330 A120 120 0 0 1 300 330" fill="none" stroke="#2a3155" stroke-width="26"/><path d="M60 330 A120 120 0 0 1 252 234" fill="none" stroke="${LIME}" stroke-width="26"/>`
      + `<text x="180" y="320" font-family="sans-serif" font-size="64" font-weight="700" text-anchor="middle" fill="${W}">72</text><text x="180" y="360" font-family="sans-serif" font-size="24" text-anchor="middle" fill="${DIM}">dB</text>`
      + Array.from({ length: 14 }, (_, i) => { const h = [60, 90, 70, 120, 150, 110, 80, 130, 170, 140, 100, 120, 90, 70][i]; return `<rect x="${30 + i * 22}" y="${640 - h}" width="14" height="${h}" rx="4" fill="${h > 140 ? MAG : CY}"/>`; }).join('')
      );
    return numbered(build({ name: 'Ondas y sonido', palette: 'midnight', fonts: 'modern', title: { font: H, color: CY, size: 52, bold: false }, body: { color: W } }, [
      { layout: 'blank', bg: BG, back: studio(), extra: [
        tx('FÍSICA Y QUÍMICA · 2.º DE ESO', 90, 120, 600, 40, 22, LIME, { letterSpacing: 5, fontWeight: 700 }),
        text('ONDAS<br>Y SONIDO', 80, 160, 700, 260, { fontFamily: H, fontSize: 120, lineHeight: 1.02, wordart: 'neon', wordartColor: CY }),
        tx('Todo lo que oyes es aire que vibra', 90, 430, 600, 50, 30, DIM),
        after(wave(700, 170, 500, 200, 3, CY, 5), 'draw', { duration: 1500, sound: 'chime' }),
        along(wave(700, 200, 500, 140, 6, MAG, 3, { opacity: 80 }), 'draw', { duration: 1500, delay: 300 }),
        ...Array.from({ length: 22 }, (_, i) => { const h = [60, 90, 130, 100, 160, 190, 150, 120, 170, 140, 100, 80, 120, 160, 130, 90, 70, 110, 140, 100, 70, 50][i];
          return withAnims(shape('rounded', 90 + i * 50, 660 - Math.round(h * 0.7), 34, Math.round(h * 0.7), i % 5 === 4 ? MAG : CY, { opacity: 85 }), A('fade-up', { start: 'withPrev', delay: 400 + i * 50, duration: 400 })); })],
        notes: 'Al llegar se dibujan dos ondas de neón y sube el ecualizador. Pregunta: si el sonido es aire que vibra, ¿qué pasa donde no hay aire?' },
      { title: 'Las partes de una onda', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        shape('rect', 90, 400, 1100, 2, DIM, { opacity: 60 }),
        wave(90, 260, 1100, 280, 2.5, CY, 5),
        on(shape('doublearrow', 790, 457, 140, 26, LIME, { stroke: LIME, strokeWidth: 3, rotation: 90 }), 'fade-in'), along(tx('Amplitud', 670, 448, 175, 40, 24, LIME, { fontWeight: 700, textAlign: 'right' }), 'fade-in'),
        on(shape('doublearrow', 200, 212, 440, 26, MAG, { stroke: MAG, strokeWidth: 3 }), 'fade-in'), along(tx('Longitud de onda λ', 270, 172, 300, 40, 24, MAG, { fontWeight: 700, textAlign: 'center' }), 'fade-in'),
        on(tx('Cresta', 1020, 215, 120, 36, 22, W, { textAlign: 'center' }), 'fade-down'), along(tx('Valle', 360, 548, 120, 36, 22, W, { textAlign: 'center' }), 'fade-up'),
        tx('<b>Amplitud</b>: cuánto se aleja del reposo → el <b>volumen</b>. <b>Longitud de onda</b>: distancia entre dos crestas.', 90, 600, 1100, 70, 22, DIM)],
        notes: 'Un clic por parte: amplitud, longitud de onda, cresta y valle. Una onda transporta energía, no materia: el aire vibra en su sitio.' },
      { title: 'Grave o agudo: la frecuencia', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        shape('rounded', 90, 180, 530, 240, PANEL), wave(120, 230, 470, 140, 2, CY, 4), tx('GRAVE · 220 Hz', 120, 380, 470, 30, 20, CY, { letterSpacing: 3, fontWeight: 700 }),
        shape('rounded', 660, 180, 530, 240, PANEL), wave(690, 230, 470, 140, 8, MAG, 4), tx('AGUDO · 880 Hz', 690, 380, 470, 30, 20, MAG, { letterSpacing: 3, fontWeight: 700 }),
        on(m('f = \\dfrac{1}{T} \\qquad v = \\lambda \\cdot f', 90, 450, 530, 100, 40, W), 'fade-up'),
        on(m('\\lambda = \\dfrac{340}{440} \\approx 0{,}77\\ \\text{m}', 660, 450, 530, 100, 40, LIME), 'fade-up', { sound: 'chime' }),
        tx('Frecuencia: vibraciones por segundo (hercios). La nota «la» con la que se afinan las orquestas vibra 440 veces por segundo.', 90, 575, 1100, 80, 22, DIM)],
        notes: 'Más frecuencia, sonido más agudo. Las dos ondas tienen la misma amplitud (mismo volumen). Con v = 340 m/s, el la de 440 Hz tiene una longitud de onda de 77 cm.' },
      { title: '¿Por dónde viaja más rápido?', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        chartBlock({ x: 80, y: 175, w: 760, h: 470, chartType: 'hbar', color: CY, dataLabels: true, labelColor: W, seriesName: 'Velocidad del sonido (m/s)',
          data: [['Aire (20 °C)', 343], ['Agua', 1480], ['Madera', 3500], ['Vidrio', 4500], ['Acero', 5900]].map(([label, value]) => ({ label, value })) }),
        card(`<div style="font-family:${H};font-size:64px;color:${MAG};line-height:1">0 m/s</div><div style="font-size:24px">en el vacío</div>`, 880, 190, 320, 170, PANEL, { color: W, fontFamily: B, textAlign: 'center', vAlign: 'middle' }),
        on(tx('El sonido necesita un medio: partículas que choquen unas con otras. En los sólidos están más juntas y la vibración pasa antes.', 880, 390, 320, 250, 22, DIM), 'fade-up')],
        notes: 'Valores aproximados (dependen de la temperatura y del material). Por eso los indios de las películas ponían la oreja en el raíl: el tren se oye antes por el acero.' },
      { title: 'Cuánto ruido: los decibelios', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        img(METER, 90, 170, 230, 440, 'Pantalla de un sonómetro en el móvil marcando 72 dB', { fit: 'cover', device: 'phone' }),
        tx('Sonómetro del móvil: 72 dB de tráfico', 70, 616, 270, 50, 17, DIM, { textAlign: 'center' }),
        ...[['Umbral del dolor', 130, '#ff3c5a'], ['Concierto', 110, MAG], ['Tráfico denso', 80, '#ffb03c'], ['Conversación', 60, LIME], ['Biblioteca', 40, CY], ['Susurro', 30, '#7fb2ff']].flatMap(([t, db, c], i) => [
          on(shape('rect', 400, 180 + i * 78, Math.round(140 + db * 3.3), 62, c, { opacity: 85 }), 'fade-right', { start: i ? 'withPrev' : 'click', delay: i * 120 }),
          along(tx(`<b>${db} dB</b> · ${t}`, 414, 193 + i * 78, Math.round(140 + db * 3.3) - 24, 40, 22, BG), 'fade-right', { delay: i * 120 })]),
        tx('Cada 10 dB más, el sonido lleva <b>10 veces más energía</b>.', 980, 200, 220, 200, 22, W),
        tx('A partir de 85 dB durante horas, el oído se daña.', 980, 420, 220, 160, 22, MAG)],
        notes: 'Una aplicación de sonómetro en el móvil (pantalla inventada) mide el ruido de la clase. Escala de decibelios con ejemplos: la escala es logarítmica.' },
      { title: 'Relámpago y trueno', layout: 'titleOnly', bg: 'linear-gradient(180deg,#05070f 0%,#1a1f3a 100%)', back: studio(), extra: [
        shape('cloud', 90, 170, 360, 180, '#3a4166'), shape('cloud', 260, 150, 300, 150, '#4a5280'),
        on(shape('lightning', 250, 300, 120, 220, LIME), 'zoom-in', { duration: 200 }),
        after(tx('¡BRRROOOM!', 120, 540, 420, 60, 40, W, { fontWeight: 800, textAlign: 'center', letterSpacing: 4 }), 'fade-in', { delay: 2500, sound: 'drumroll' }),
        tx('La luz llega casi al instante; el sonido, a 340 m/s. Cuenta los segundos entre los dos:', 620, 180, 580, 110, 26, W),
        timer(3, 700, 300, 140, { style: 'digital', color: LIME, auto: false, sound: false }),
        m('d = v \\cdot t = 340 \\cdot 3 = 1\\,020\\ \\text{m}', 620, 470, 580, 80, 36, CY),
        on(card('Regla rápida: <b>segundos ÷ 3 = kilómetros</b> hasta la tormenta.', 620, 570, 580, 80, PANEL, { color: W, fontFamily: B, fontSize: 24, vAlign: 'middle' }), 'fade-up')],
        notes: 'Clic: cae el rayo; el trueno suena (redoble) unos segundos después. La cuenta atrás de 3 s se arranca a mano al ver el rayo. Tres segundos: la tormenta está a un kilómetro.' },
      { layout: 'blank', bg: BG, extra: [quiz('En las películas se oyen explosiones en el espacio. ¿Por qué en realidad no se oirían?', ['Porque hace mucho frío', 'Porque no hay aire que vibre', 'Porque el sonido va demasiado rápido', 'Porque los cascos lo impiden'], 1)],
        notes: 'El sonido es una onda mecánica: necesita un medio material. En el vacío no hay partículas que transmitan la vibración. La luz sí viaja por el vacío.' },
      { layout: 'blank', bg: BG, back: studio(), transition: 'zoom', extra: [
        hd('EXPERIMENTO: EL TELÉFONO DE VASOS', 90, 100, 1100, 70, 52, LIME),
        tx(ul('Dos vasos de yogur y 5 m de hilo', 'Un agujero en cada fondo y un nudo por dentro', 'Hilo tenso: habla por un vaso y escucha por el otro', '¿Y si el hilo está flojo? ¿Y si lo pisa alguien?'), 90, 200, 700, 320, 28, W),
        wave(840, 250, 340, 120, 4, CY, 4), timer(300, 90, 560, 1100, { style: 'bar', h: 70, color: MAG, endText: '¿Se oye?' })],
        notes: 'Cuenta atrás en barra de 5 minutos. El hilo tenso transmite la vibración mejor que el aire (es un sólido). Si está flojo o alguien lo toca, la vibración se pierde.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Light in a dark optics room: laser beams that draw themselves, a prism that splits white
  // light, a mirror and a water tank with real angles, refractive indices with formulas, 3D sunglasses.
  edu_phys_light: { name: 'La luz: reflexión y refracción', cat: 'edu', summary: 'Sala de óptica a oscuras: prisma que abre el arcoíris, rayos que se dibujan, ley de Snell, índices con fórmulas, gafas 3D y concurso', make: () => {
    const BG = '#07080d', RED = '#ff3b30', GRN = '#3dff7a', W = '#f5f3ee', GOLD = '#ffd36b', GLASS = '#7fc8ff', DIM = '#a7a9b4', H = FF.raleway;
    const dark = () => [glow(-260, -300, 760, '#141826', BG, 60), glow(900, 420, 600, '#16121f', BG, 50)];
    const hd = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, ...p });
    const RAINBOW = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#5e5ce6', '#bf5af2'];
    const SPECTRUM = svgURL(1100, 80, `<defs><linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#7a2bd6"/><stop offset=".17" stop-color="#3949ff"/><stop offset=".33" stop-color="#00b4ff"/>`
      + `<stop offset=".5" stop-color="#2ee85c"/><stop offset=".66" stop-color="#ffe600"/><stop offset=".82" stop-color="#ff8a00"/><stop offset="1" stop-color="#ff1e1e"/></linearGradient></defs><rect width="1100" height="80" rx="10" fill="url(#s)"/>`);
    return numbered(build({ name: 'La luz: reflexión y refracción', palette: 'revela', fonts: 'editorial', title: { font: H, color: W, size: 48, bold: false }, body: { color: W } }, [
      { layout: 'blank', bg: BG, back: dark(), extra: [
        text('FÍSICA Y QUÍMICA · 2.º DE ESO', 90, 120, 600, 40, { fontFamily: H, fontSize: 22, letterSpacing: 6, color: GOLD, fontWeight: 600 }),
        hd('LA LUZ', 84, 160, 820, 150, 120, W, { letterSpacing: 24, fontWeight: 300 }),
        text('Reflexión, refracción y colores', 90, 320, 520, 50, { fontFamily: H, fontSize: 32, color: DIM }),
        after(lines([[0, 560], [700, 440]], W, 5), 'draw', { duration: 900 }),
        poly([[50, 0], [100, 100], [0, 100]], 640, 330, 220, 220, '#ffffff14', { stroke: '#dfe8ff', strokeWidth: 3 }),
        ...RAINBOW.map((c, i) => after(poly([[0, 0], [100, i * 100 / 7], [100, (i + 1) * 100 / 7]], 790, 420, 490, 280 + 0, c, { opacity: 85 }), 'fade-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 120, duration: 700, ...(i === 0 && { sound: 'chime' }) }))],
        notes: 'Al llegar, un rayo de luz blanca entra en el prisma y sale abierto en los colores del arcoíris. Pregunta: ¿de dónde salen esos colores, si la luz entra blanca?' },
      { title: 'En línea recta… y muy deprisa', layout: 'titleOnly', bg: BG, back: dark(), extra: [
        glow(-120, 230, 360, '#ffcc33', BG, 95), shape('ellipse', 1080, 330, 60, 60, '#3a7bd5', { stroke: '#9fd0ff', strokeWidth: 2 }),
        shape('rect', 180, 359, 900, 2, GOLD, { opacity: 40 }),
        withAnims(shape('ellipse', 170, 350, 20, 20, GOLD), path([[900, 0]], { start: 'afterPrev', duration: 5000 })),
        text('Sol', 50, 470, 120, 40, { fontFamily: H, fontSize: 24, color: GOLD, textAlign: 'center' }), text('Tierra', 1050, 400, 120, 40, { fontFamily: H, fontSize: 24, color: '#9fd0ff', textAlign: 'center' }),
        hd('300 000 km/s', 300, 180, 680, 120, 92, GOLD, { textAlign: 'center', fontWeight: 300 }),
        on(m('t = \\dfrac{d}{c} = \\dfrac{1{,}5 \\cdot 10^{11}\\ \\text{m}}{3 \\cdot 10^{8}\\ \\text{m/s}} = 500\\ \\text{s}', 240, 450, 800, 110, 36, W), 'fade-up'),
        on(text('La luz del Sol que ves salió de allí hace <b>8 minutos y 20 segundos</b>.', 200, 575, 880, 90, { fontFamily: H, fontSize: 26, color: W, textAlign: 'center' }), 'fade-up', { sound: 'pop' })],
        notes: 'Un fotón viaja del Sol a la Tierra (animación lenta). La luz va en línea recta: por eso hay sombras. Es lo más rápido que existe, y aun así tarda 500 segundos en llegar.' },
      { title: 'Reflexión: el ángulo del rebote', layout: 'titleOnly', bg: BG, back: dark(), extra: [
        shape('rect', 140, 560, 620, 14, '#c9d2e0', { fill2: '#6b7686', gradAngle: 90 }),
        lines([[450, 200], [450, 560]], DIM, 2, false, { dash: 'dash' }), text('normal', 460, 200, 100, 30, { fontFamily: H, fontSize: 18, color: DIM }),
        on(lines([[170, 230], [450, 560]], RED, 5), 'draw', { duration: 900 }),
        after(lines([[450, 560], [730, 230]], RED, 5), 'draw', { duration: 900, sound: 'click' }),
        on(text('î = 40°', 330, 330, 110, 40, { fontFamily: H, fontSize: 26, color: GOLD, textAlign: 'right' }), 'fade-in'),
        along(text('r̂ = 40°', 465, 330, 110, 40, { fontFamily: H, fontSize: 26, color: GOLD }), 'fade-in'),
        m('\\hat{i} = \\hat{r}', 820, 200, 380, 100, 60, GOLD),
        text('El ángulo de incidencia es igual al de reflexión, medidos los dos desde la <b>normal</b> (la perpendicular al espejo).', 820, 320, 380, 180, { fontFamily: H, fontSize: 25, color: W }),
        text('Rayo incidente, normal y rayo reflejado están en el mismo plano.', 820, 520, 380, 100, { fontFamily: H, fontSize: 22, color: DIM })],
        notes: 'Clic: el láser llega al espejo y rebota con el mismo ángulo. Truco: en el billar, la bola rebota en la banda igual que la luz en un espejo.' },
      { title: 'Refracción: la luz se desvía', layout: 'titleOnly', bg: BG, back: dark(), extra: [
        shape('rect', 90, 400, 640, 260, GLASS, { opacity: 25 }), shape('rect', 90, 398, 640, 3, GLASS),
        text('aire · n = 1', 100, 180, 200, 30, { fontFamily: H, fontSize: 20, color: DIM }), text('agua · n = 1,33', 100, 620, 240, 30, { fontFamily: H, fontSize: 20, color: GLASS }),
        lines([[430, 190], [430, 650]], DIM, 2, false, { dash: 'dash' }),
        on(lines([[210, 180], [430, 400]], GRN, 5), 'draw', { duration: 800 }),
        after(lines([[430, 400], [581, 640]], GRN, 5), 'draw', { duration: 800 }),
        on(text('θ₁ = 45°', 300, 260, 120, 36, { fontFamily: H, fontSize: 24, color: GOLD, textAlign: 'right' }), 'fade-in'),
        along(text('θ₂ = 32°', 520, 450, 120, 36, { fontFamily: H, fontSize: 24, color: GOLD }), 'fade-in'),
        m('n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2', 770, 180, 430, 70, 32, GOLD),
        tableBlock({ x: 770, y: 270, w: 430, h: 250, fontSize: 21, header: true, headBg: '#1d2233', headFg: GOLD, stroke: '#ffffff30', color: W, colW: [3, 2, 3],
          rows: [['Medio', 'n', 'v (km/s)'], ['Aire', '1,0003', '=REDONDEAR(300000/B2;0)'], ['Agua', '1,33', '=REDONDEAR(300000/B3;0)'], ['Vidrio', '1,5', '=REDONDEAR(300000/B4;0)'], ['Diamante', '2,42', '=REDONDEAR(300000/B5;0)']] }),
        text('Al entrar en un medio más lento, el rayo se acerca a la normal.', 770, 540, 430, 90, { fontFamily: H, fontSize: 22, color: DIM })],
        notes: 'Con θ₁ = 45°: sen θ₂ = 0,707 / 1,33 = 0,53, así que θ₂ ≈ 32°. La tabla calcula la velocidad de la luz en cada medio: =300000/n. Por eso un lápiz parece roto dentro de un vaso de agua.' },
      { title: 'Los colores de la luz blanca', layout: 'titleOnly', bg: BG, back: dark(), extra: [
        img(SPECTRUM, 90, 190, 1100, 80, 'Espectro visible del violeta al rojo', { fit: 'fill' }),
        ...[['400 nm', 90], ['500 nm', 457], ['600 nm', 823], ['700 nm', 1150]].map(([t, x]) => text(t, x - 10, 280, 100, 30, { fontFamily: H, fontSize: 18, color: DIM })),
        text('violeta', 90, 150, 200, 30, { fontFamily: H, fontSize: 20, color: '#b48cff' }), text('rojo', 990, 150, 200, 30, { fontFamily: H, fontSize: 20, color: RED, textAlign: 'right' }),
        on(shape('rounded', 90, 350, 520, 290, '#ffffff0c', { stroke: '#ffffff40', strokeWidth: 1 }), 'fade-up'),
        along(text('Con luz blanca', 110, 365, 480, 40, { fontFamily: H, fontSize: 26, color: W, fontWeight: 600 }), 'fade-up'),
        along(icon('apple', 285, 420, 140, RED), 'zoom-in'),
        along(text('Refleja el rojo y absorbe el resto: la vemos roja.', 110, 575, 480, 60, { fontFamily: H, fontSize: 20, color: DIM, textAlign: 'center' }), 'fade-up'),
        on(shape('rounded', 670, 350, 520, 290, '#3dff7a10', { stroke: '#3dff7a60', strokeWidth: 1 }), 'fade-up'),
        along(text('Con luz verde', 690, 365, 480, 40, { fontFamily: H, fontSize: 26, color: GRN, fontWeight: 600 }), 'fade-up'),
        along(icon('apple', 865, 420, 140, '#2a2a2a'), 'zoom-in'),
        along(text('No hay rojo que reflejar: la vemos casi negra.', 690, 575, 480, 60, { fontFamily: H, fontSize: 20, color: DIM, textAlign: 'center' }), 'fade-up')],
        notes: 'La luz blanca es la suma de todos los colores (de 400 a 700 nanómetros). El color de un objeto es el que refleja. Dos clics: la misma manzana con luz blanca y con luz verde.' },
      { title: 'Transparente, translúcido, opaco', layout: 'titleOnly', bg: BG, back: dark(), extra: [
        model('kh-SunglassesKhronos', 760, 170, 440, 360, { caption: '', autoRotate: true, view: 'three', motion: 'float' }),
        ...[['Transparente', 'Deja pasar la luz y se ve a través: vidrio, agua, aire.', GLASS], ['Translúcido', 'Deja pasar algo de luz, pero no se ve con nitidez: papel vegetal, vidrio esmerilado.', GOLD], ['Opaco', 'No deja pasar la luz: madera, metal, tu mano.', DIM]]
          .flatMap(([t, d, c], i) => [on(text(t, 90, 185 + i * 150, 600, 44, { fontFamily: H, fontSize: 32, color: c, fontWeight: 600 }), 'fade-right'), along(text(d, 90, 232 + i * 150, 620, 80, { fontFamily: H, fontSize: 22, color: W }), 'fade-right')]),
        text('Las lentes de unas gafas de sol son transparentes, pero filtran parte de la luz y casi toda la ultravioleta.', 760, 545, 440, 100, { fontFamily: H, fontSize: 20, color: DIM }),
        credits(['kh-SunglassesKhronos'], 90, 650, 1100, '#6f7280')],
        notes: 'Tres tipos de materiales según cómo dejan pasar la luz, uno por clic. Las gafas de sol en 3D giran: sus lentes son transparentes pero tintadas.' },
      { layout: 'blank', bg: BG, extra: [quiz('Un rayo de luz pasa del aire al agua inclinado. ¿Qué le ocurre?', ['Se aleja de la normal', 'Se acerca a la normal', 'Sigue recto siempre', 'Rebota entero'], 1)],
        notes: 'Al pasar a un medio con más índice (más lento), el rayo se acerca a la normal. Al salir del agua al aire, se aleja: por eso la piscina parece menos profunda.' },
      { layout: 'blank', bg: BG, back: dark(), transition: 'fade', extra: [
        hd('Un arcoíris en casa', 90, 100, 800, 90, 64, W, { fontWeight: 300 }),
        text(ul('Un vaso de agua lleno hasta arriba', 'Una linterna o un rayo de sol', 'Una hoja blanca en el suelo', 'Busca el ángulo: ¿en qué orden salen los colores?'), 90, 220, 680, 300, { fontFamily: H, fontSize: 28, color: W }),
        ...RAINBOW.map((c, i) => shape('arc', 820 + i * 18, 200 + i * 18, 360 - i * 36, 360 - i * 36, 'none', { stroke: c, strokeWidth: 16 })),
        timer(240, 920, 470, 160, { color: GOLD, endText: '¿Lo veis?' })],
        notes: 'Cuenta atrás de 4 minutos. El agua del vaso hace de prisma. Los colores salen siempre en el mismo orden: rojo, naranja, amarillo, verde, azul, añil y violeta.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · Heat and changes of state on a thermometer: from ice blue to flame orange, mercury that rises,
  // a 3D pot of coals, scales with formulas, the heating curve and a triangle of changes of state.
  edu_phys_heat: { name: 'Calor y cambios de estado', cat: 'edu', summary: 'Del hielo a la llama: termómetro que sube, brasero 3D, escalas con fórmulas, curva de calentamiento, cambios de estado y concurso', make: () => {
    const CREAM = '#fff4e6', INK = '#3a2318', FLAME = '#ff6b1a', EMBER = '#d7263d', ICE = '#2f8fc4', GOLD = '#f6ae2d', DIM = '#7d5a48', H = FF.rubik;
    const warmBg = 'linear-gradient(90deg,#e6f4fc 0%,#fff4e6 45%,#ffe0c7 100%)';
    const scale = () => [shape('rect', 0, 0, 14, 720, ICE), shape('rect', 1266, 0, 14, 720, FLAME), ...Array.from({ length: 17 }, (_, i) => shape('rect', 14, 40 + i * 40, i % 4 ? 10 : 22, 2, ICE, { opacity: 60 }))];
    const hd = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, fontWeight: 700, ...p });
    // The changes of state: three nodes and a pair of arrows (heating / cooling) between each two.
    const node = (cx, cy, t, ic, c) => [shape('ellipse', cx - 85, cy - 85, 170, 170, '#ffffff', { stroke: c, strokeWidth: 5, shadow: { x: 0, y: 6, blur: 14, color: '#00000020' } }), icon(ic, cx - 30, cy - 62, 60, c), hd(t, cx - 80, cy + 4, 160, 40, 26, c, { textAlign: 'center' })];
    const arrows = ([x1, y1], [x2, y2], up, down, uo, dn) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI, ux = dx / L, uy = dy / L, px = -uy, py = ux,
      mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = L - 220, ar = (o, rot, c) => shape('rightarrow', Math.round(mx + px * o - len / 2), Math.round(my + py * o - 17), Math.round(len), 34, c, { rotation: +rot.toFixed(1) }),
      lab = (o, t, c) => text(t, Math.round(mx + px * o - 130), Math.round(my + py * o - 18), 260, 36, { fontFamily: H, fontSize: 21, color: c, fontWeight: 700, textAlign: 'center' });
      return [on(ar(-24, a, FLAME), 'fade-in'), along(lab(uo, up, FLAME), 'fade-in'), along(ar(24, a + 180, ICE), 'fade-in'), along(lab(dn, down, ICE), 'fade-in')]; };
    const SOL = [300, 545], LIQ = [980, 545], GAS = [640, 265];
    return numbered(withFg(build({ name: 'Calor y cambios de estado', palette: 'warm', fonts: 'websafe', title: { font: H, color: INK, size: 48 }, body: { color: INK }, decor: scale }, [
      { layout: 'blank', bg: warmBg, extra: [
        shape('rounded', 120, 90, 70, 470, '#ffffff', { stroke: INK, strokeWidth: 4 }), shape('ellipse', 100, 520, 110, 110, EMBER, { stroke: INK, strokeWidth: 4 }),
        ...Array.from({ length: 9 }, (_, i) => shape('rect', 190, 130 + i * 45, i % 2 ? 14 : 26, 3, INK)),
        after(shape('rect', 145, 230, 20, 320, EMBER), 'fade-up', { duration: 1800, sound: 'whoosh' }),
        text('FÍSICA Y QUÍMICA · 2.º DE ESO', 290, 150, 560, 40, { fontFamily: H, fontSize: 22, letterSpacing: 4, color: FLAME, fontWeight: 700 }),
        hd('Calor y<br>cambios de estado', 284, 190, 600, 170, 58),
        text('Por qué hierve el agua, por qué quema el metal y cómo viaja la energía', 290, 400, 520, 110, { fontFamily: H, fontSize: 28, color: DIM }),
        model('kh-PotOfCoals', 900, 170, 330, 380, { caption: '', autoRotate: true, view: 'three' }),
        credits(['kh-PotOfCoals'], 290, 650, 960, DIM)],
        notes: 'Al llegar, el mercurio del termómetro sube. El brasero 3D gira. Pregunta: ¿es lo mismo calor que temperatura?' },
      { title: '¿Calor o temperatura?', layout: 'titleOnly', bg: CREAM, extra: [
        card(`<div style="font-size:30px;font-weight:700;color:${FLAME}">Temperatura</div><div>Lo rápido que se mueven, de media, las partículas. Se mide en °C o en K.</div>`, 90, 180, 530, 200, '#ffffff', { color: INK, fontFamily: H, fontSize: 24, shadow: { x: 0, y: 6, blur: 14, color: '#00000018' } }),
        card(`<div style="font-size:30px;font-weight:700;color:${EMBER}">Calor</div><div>Energía que pasa de un cuerpo caliente a uno frío. Se mide en julios (J).</div>`, 660, 180, 530, 200, '#ffffff', { color: INK, fontFamily: H, fontSize: 24, shadow: { x: 0, y: 6, blur: 14, color: '#00000018' } }),
        icon('coffee', 120, 420, 80, EMBER), text('Una taza de café<br><b>0,2 L a 90 °C</b>', 220, 425, 330, 80, { fontFamily: H, fontSize: 24, color: INK }),
        icon('droplet', 660, 420, 80, ICE), text('Una bañera<br><b>150 L a 40 °C</b>', 760, 425, 330, 80, { fontFamily: H, fontSize: 24, color: INK }),
        on(card('¿Cuál tiene más energía térmica? <b>La bañera</b>: está más fría, pero tiene muchísimas más partículas.', 90, 540, 1100, 100, GOLD, { color: INK, fontFamily: H, fontSize: 26, vAlign: 'middle' }), 'zoom-in', { sound: 'pop' })],
        notes: 'La temperatura no depende de cuánta materia haya; la energía térmica, sí. El calor fluye siempre del cuerpo más caliente al más frío, hasta que se igualan (equilibrio térmico).' },
      { title: 'Tres escalas, un termómetro', layout: 'titleOnly', bg: CREAM, extra: [
        tableBlock({ x: 90, y: 180, w: 700, h: 360, fontSize: 25, header: true, headBg: FLAME, headFg: '#ffffff', stroke: '#3a231830', banded: true, band: GOLD, bandAlpha: 0.12, color: INK, colW: [3, 2, 2, 2],
          rows: [['Qué pasa', '°C', 'K', '°F'], ['Coinciden °C y °F', '-40', '=B2+273', '=1,8*B2+32'],
            ['El agua se congela', '0', '=B3+273', '=1,8*B3+32'], ['Cuerpo humano', '37', '=B4+273', '=1,8*B4+32'], ['El agua hierve', '100', '=B5+273', '=1,8*B5+32']] }),
        m('T(\\text{K}) = T(^{\\circ}\\text{C}) + 273', 830, 190, 380, 70, 30, INK),
        m('T(^{\\circ}\\text{F}) = 1{,}8 \\cdot T(^{\\circ}\\text{C}) + 32', 830, 280, 380, 70, 28, INK),
        on(card(`<div style="font-size:52px;font-weight:700;color:${ICE};line-height:1">0 K</div><div>el cero absoluto: −273 °C. Nada puede estar más frío.</div>`, 830, 390, 380, 170, '#ffffff', { color: INK, fontFamily: H, fontSize: 22, textAlign: 'center' }), 'zoom-in'),
        text('Las columnas K y °F son fórmulas: cambia los °C.', 90, 560, 700, 40, { fontFamily: H, fontSize: 20, color: DIM })],
        notes: 'La escala Kelvin es la del Sistema Internacional: empieza en el cero absoluto. Fórmulas de la tabla: =B2+273 y =1,8*B2+32. A −40 grados, Celsius y Fahrenheit marcan lo mismo.' },
      { title: 'La curva de calentamiento del agua', layout: 'titleOnly', bg: CREAM, extra: [
        chartBlock({ x: 80, y: 175, w: 720, h: 480, chartType: 'line', color: FLAME, grid: true, xTitle: 'tiempo (min)', yTitle: 'temperatura (°C)', yMin: -30, yMax: 120, seriesName: 'Agua al fuego',
          data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((t, i) => ({ label: String(t), value: [-20, -10, 0, 0, 0, 25, 50, 75, 100, 100, 100, 100, 110][i] })) }),
        ...[['Hielo que se calienta', ICE], ['0 °C: se funde (meseta)', '#1f6e9c'], ['Agua que se calienta', GOLD], ['100 °C: hierve (meseta)', FLAME], ['Vapor que se calienta', EMBER]].map(([t, c], i) =>
          on(card(t, 840, 180 + i * 92, 360, 76, c, { color: i === 2 ? INK : '#ffffff', fontFamily: H, fontSize: 22, pad: [10, 16, 10, 16], vAlign: 'middle', fontWeight: 600 }), 'fade-left'))],
        notes: 'En las mesetas la temperatura no sube aunque sigamos calentando: toda la energía se usa en cambiar de estado (romper uniones entre partículas). Datos de ejemplo.' },
      { title: 'Los cambios de estado', layout: 'titleOnly', bg: CREAM, extra: [
        ...node(...SOL, 'Sólido', 'snowflake', ICE), ...node(...LIQ, 'Líquido', 'droplet', '#2a9d8f'), ...node(...GAS, 'Gas', 'cloud', '#8a7a9c'),
        ...arrows(SOL, LIQ, 'fusión', 'solidificación', -55, 95), ...arrows(LIQ, GAS, 'vaporización', 'condensación', 135, 92), ...arrows(SOL, GAS, 'sublimación', 'sublimación inversa', -92, -135),
        text('<span style="color:#ff6b1a">■</span> absorben calor · <span style="color:#2f8fc4">■</span> desprenden calor', 760, 200, 440, 40, { fontFamily: H, fontSize: 20, color: DIM, textAlign: 'right' })],
        notes: 'Tres clics: cada pareja de flechas aparece con sus nombres. Naranja: el cambio necesita calor. Azul: el cambio desprende calor. Ejemplo de sublimación: el hielo seco; de sublimación inversa: la escarcha.' },
      { title: 'Q = m · c · ΔT', layout: 'titleOnly', bg: CREAM, extra: [
        m('Q = m \\cdot c \\cdot \\Delta T', 90, 180, 520, 80, 44, INK),
        text('Calentar 2 L de agua de 20 °C a 100 °C:', 90, 280, 540, 40, { fontFamily: H, fontSize: 24, color: DIM }),
        on(m('Q = 2 \\cdot 4180 \\cdot 80', 90, 330, 520, 70, 36, INK), 'fade-up'),
        on(m('Q = 668\\,800\\ \\text{J} \\approx 669\\ \\text{kJ}', 90, 410, 520, 70, 36, FLAME), 'fade-up', { sound: 'chime' }),
        text('<b>c</b>, el calor específico: julios para subir 1 °C un kilo de sustancia.', 90, 510, 520, 100, { fontFamily: H, fontSize: 22, color: INK }),
        chartBlock({ x: 660, y: 175, w: 540, h: 470, chartType: 'hbar', color: FLAME, dataLabels: true, seriesName: 'c (J/kg·°C)',
          data: [['Agua', 4180], ['Aceite', 1970], ['Aluminio', 900], ['Hierro', 450], ['Cobre', 385]].map(([label, value]) => ({ label, value })) })],
        notes: 'El agua tiene un calor específico muy alto: cuesta mucho calentarla y tarda en enfriarse. Por eso el mar suaviza el clima de la costa y la sartén de hierro se calienta antes que el agua de la olla.' },
      { title: 'Cómo viaja el calor', layout: 'titleOnly', bg: CREAM, extra: [
        ...[['Conducción', 'De partícula a partícula, por contacto. La cuchara metálica dentro de la sopa.', 'utensils', EMBER], ['Convección', 'El fluido caliente sube y el frío baja. El agua de la olla, el aire de la calefacción.', 'refresh-cw', GOLD], ['Radiación', 'Sin contacto y hasta por el vacío. El calor del Sol o de unas brasas.', 'sun', FLAME]]
          .flatMap(([t, d, ic, c], i) => { const x = 90 + i * 375;
            return [on(shape('rounded', x, 190, 350, 440, '#ffffff', { shadow: { x: 0, y: 6, blur: 14, color: '#00000018' } }), 'fade-up'), along(shape('rect', x, 190, 350, 12, c), 'fade-up'),
              along(icon(ic, x + 135, 235, 80, c), 'zoom-in'), along(hd(t, x + 20, 340, 310, 50, 32, c, { textAlign: 'center' }), 'fade-up'),
              along(text(d, x + 28, 405, 294, 200, { fontFamily: H, fontSize: 23, color: INK, textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Tres formas de transmitir el calor, una por clic. En una olla al fuego están las tres: conducción por el metal, convección en el agua y radiación de la llama.' },
      { layout: 'blank', bg: warmBg, extra: [quiz('Una cuchara de metal y otra de madera llevan un rato en la sopa. ¿Por qué quema más la de metal?', ['Está más caliente', 'El metal conduce mejor el calor', 'La madera tiene más energía', 'El metal produce calor'], 1)],
        notes: 'Las dos están casi a la misma temperatura, pero el metal es buen conductor: al tocarlo, nos pasa el calor muy deprisa. La madera es un aislante.' },
      { layout: 'blank', bg: warmBg, transition: 'fade', extra: [
        hd('Para casa: ¿cuánto tarda en hervir?', 90, 100, 1000, 80, 52),
        text(ul('Calienta 1 L de agua y cronometra hasta que hierva', 'Repite con 2 L en el mismo fuego', 'Compara: ¿tarda el doble?', 'Calcula Q en los dos casos'), 90, 210, 700, 300, { fontFamily: H, fontSize: 28, color: INK }),
        timer(600, 880, 190, 300, { style: 'ring', color: FLAME, endText: '¡Hierve!' }),
        text('Con un adulto delante y con cuidado con el vapor.', 90, 560, 700, 50, { fontFamily: H, fontSize: 22, color: EMBER, fontWeight: 700 })],
        notes: 'Cuenta atrás de 10 minutos como referencia. Con el doble de agua hace falta el doble de energía; con el mismo fuego, tardará aproximadamente el doble.' },
    ]), INK));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · Acids and bases on a rack of test tubes: the universal indicator's colours, a pH scale with
  // everyday products, a table that counts powers of ten, red cabbage and a titration curve.
  edu_phys_acids: { name: 'Ácidos, bases y pH', cat: 'edu', summary: 'Gradilla de tubos de colores que se llenan uno a uno, escala de pH con productos, tabla de potencias de 10, lombarda, valoración y ordenar', make: () => {
    const BG = '#fbfaff', INK = '#22223b', DIM = '#5c5c7a', LINE = '#d8d6ea', H = FF.quick, B = FF.nunito;
    const PH = ['#d7191c', '#e8392b', '#f26b2e', '#f89a31', '#fbc531', '#e6d63a', '#b5d43b', '#5fbf4a', '#2fa86a', '#1f8f8a', '#2268a8', '#2b4f9e', '#3b3a91', '#4b2a86', '#5a1f7a'];
    const hd = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, fontWeight: 700, ...p });
    const tx = (t, x, y, w, h, size = 24, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: B, fontSize: size, color, ...p });
    const tube = (x, y, w, h, c, fill = 0.6) => [shape('rounded', x, y, w, h, '#ffffff', { stroke: '#9a98b8', strokeWidth: 3, radius: w / 2 }), shape('rounded', x + 4, y + h * (1 - fill), w - 8, h * fill - 4, c, { radius: (w - 8) / 2 })];
    const SCALE = svgURL(1100, 60, `<defs><linearGradient id="p" x1="0" x2="1">${PH.map((c, i) => `<stop offset="${(i / 14).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect width="1100" height="60" rx="30" fill="url(#p)"/>`);
    const at = p => 90 + p / 14 * 1100;
    const pin = (p, t, top, i) => { const x = at(p);
      return [on(shape('ellipse', x - 9, 351, 18, 18, '#ffffff', { stroke: INK, strokeWidth: 3 }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 }),
        along(shape('rect', x - 1, top ? 270 : 400, 3, 60, INK), 'fade-in'),
        along(tx(`<b>pH ${String(p).replace('.', ',')}</b><br>${t}`, x - 75, top ? 200 : 465, 150, 70, 19, INK, { textAlign: 'center', lineHeight: 1.15 }), 'fade-in')]; };
    return numbered(build({ name: 'Ácidos, bases y pH', palette: 'office', fonts: 'friendly', title: { font: H, color: INK, size: 48 }, body: { color: INK, font: B },
      decor: () => [shape('rect', 0, 0, 1280, 10, PH[0], { fill2: PH[14], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, extra: [
        tx('FÍSICA Y QUÍMICA · 3.º DE ESO', 90, 90, 600, 40, 22, PH[10], { letterSpacing: 5, fontWeight: 700 }),
        hd('Ácidos, bases y pH', 84, 130, 1100, 110, 92),
        tx('Del limón a la lejía: cómo se mide lo ácido que es algo', 90, 250, 900, 50, 30, DIM),
        shape('rounded', 70, 600, 1140, 30, '#c9b79c', { radius: 8 }),
        ...PH.flatMap((c, i) => tube(100 + i * 74, 360, 44, 250, c, 0.55 + (i % 3) * 0.08).map((b, k) => withAnims(b, A('fade-up', { start: i || k ? 'withPrev' : 'afterPrev', delay: i * 110, duration: 400, ...(i === 0 && k === 0 && { sound: 'pop' }) })))),
        ...PH.map((c, i) => tx(String(i), 100 + i * 74, 640, 44, 30, 20, INK, { textAlign: 'center', fontWeight: 700 }))],
        notes: 'Quince tubos de ensayo, del pH 0 al 14, con los colores del indicador universal: aparecen uno tras otro. Pregunta: ¿qué tienen en común el limón y el vinagre?' },
      { title: 'Ácidos y bases, cara a cara', layout: 'titleOnly', bg: BG, extra: [
        shape('rounded', 90, 180, 520, 400, '#fff1ee', { stroke: PH[1], strokeWidth: 3 }), shape('rounded', 670, 180, 520, 400, '#eef1ff', { stroke: PH[11], strokeWidth: 3 }),
        hd('Ácidos', 120, 200, 460, 50, 40, PH[1]), hd('Bases', 700, 200, 460, 50, 40, PH[11]),
        tx(ul('Sabor agrio', 'En agua liberan iones H⁺', 'Vuelven <b>rojo</b> el tornasol', 'Limón, vinagre, jugo gástrico'), 120, 260, 460, 220, 24),
        tx(ul('Sabor amargo, tacto jabonoso', 'En agua liberan iones OH⁻', 'Vuelven <b>azul</b> el tornasol', 'Jabón, bicarbonato, lejía'), 700, 260, 460, 220, 24),
        on(m('\\mathrm{HCl \\longrightarrow H^+ + Cl^-}', 120, 500, 460, 70, 32, PH[1]), 'fade-up'),
        on(m('\\mathrm{NaOH \\longrightarrow Na^+ + OH^-}', 700, 500, 460, 70, 32, PH[11]), 'fade-up'),
        icon('triangle-alert', 90, 605, 36, PH[2]), tx('En el laboratorio nada se prueba ni se toca: el sabor es solo para entenderlo.', 136, 608, 1050, 40, 20, DIM)],
        notes: 'Comparativa de propiedades. Las ecuaciones muestran qué ion libera cada uno en el agua: el ácido clorhídrico libera H⁺ y el hidróxido de sodio, OH⁻.' },
      { title: 'La escala de pH', layout: 'titleOnly', bg: BG, extra: [
        img(SCALE, 90, 330, 1100, 60, 'Escala de pH del 0 al 14 en colores', { fit: 'fill' }),
        ...[0, 7, 14].map(p => tx(String(p), at(p) - 30, 555, 60, 30, 22, INK, { textAlign: 'center', fontWeight: 700 })),
        tx('← más ácido', 90, 600, 300, 30, 20, PH[1]), tx('neutro', 580, 600, 120, 30, 20, '#2f8a3a', { textAlign: 'center' }), tx('más básico →', 890, 600, 300, 30, 20, PH[12], { textAlign: 'right' }),
        ...[[1.5, 'Jugo gástrico', true], [2.2, 'Limón', false], [4.2, 'Tomate', true], [5, 'Café', false], [7, 'Agua pura', true], [8.3, 'Bicarbonato', false], [10, 'Jabón', true], [11.5, 'Amoníaco', false], [13, 'Lejía', true]]
          .flatMap(([p, t, top], i) => pin(p, t, top, i))],
        notes: 'Un clic y los productos se colocan uno tras otro en la escala. Por debajo de 7, ácido; 7, neutro; por encima, básico (o alcalino). Valores aproximados.' },
      { title: 'Cada punto, diez veces más', layout: 'titleOnly', bg: BG, extra: [
        m('\\mathrm{pH} = -\\log\\,[\\mathrm{H_3O^+}]', 90, 180, 560, 80, 40, INK),
        tableBlock({ x: 90, y: 290, w: 620, h: 340, fontSize: 24, header: true, headBg: PH[11], headFg: '#ffffff', stroke: LINE, banded: true, band: PH[9], bandAlpha: 0.08, color: INK, colW: [2, 3, 4],
          rows: [['pH', '[H₃O⁺] (mol/L)', 'Veces más ácido que el agua'], ['7', '10⁻⁷', '=10^(7-A2)'], ['5', '10⁻⁵', '=10^(7-A3)'], ['3', '10⁻³', '=10^(7-A4)'], ['2', '10⁻²', '=10^(7-A5)']] }),
        on(card(`<div style="font-family:${H};font-size:64px;font-weight:700;color:${PH[1]};line-height:1">×1 000</div><div>El limón (pH 2) es mil veces más ácido que el café (pH 5).</div>`, 760, 290, 430, 220, '#fff1ee', { color: INK, fontFamily: B, fontSize: 24, textAlign: 'center', vAlign: 'middle' }), 'zoom-in', { sound: 'pop' }),
        tx('La escala es logarítmica: bajar un punto multiplica por 10 la acidez.', 760, 540, 430, 90, 22, DIM)],
        notes: 'La última columna es una fórmula: =10^(7-A2). Cambiad un pH y se recalcula. pH significa «potencial de hidrógeno»: mide la concentración de iones H₃O⁺.' },
      { title: 'Un indicador de cocina: la lombarda', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Trocear la lombarda\nHervirla 10 minutos\nColar el caldo morado\nAñadirlo a cada muestra', 90, 175, 1100, 140, { colors: 'accent', fontScale: 0.9 }),
        ...[['Limón', 2, '#d6215b'], ['Vinagre', 3, '#cf3b8c'], ['Agua', 7, '#7a4ca8'], ['Bicarbonato', 8.3, '#3a6fc4'], ['Jabón', 10, '#2f9e6b'], ['Lejía', 13, '#d9c234']].flatMap(([t, p, c], i) => {
          const x = 140 + i * 175; return [...tube(x + 35, 350, 60, 220, c, 0.62).map((b, k) => withAnims(b, A('fade-up', { start: k ? 'withPrev' : 'click', duration: 400 }))),
            along(tx(`<b>${t}</b><br>pH ${String(p).replace('.', ',')}`, x - 10, 580, 150, 60, 20, INK, { textAlign: 'center', lineHeight: 1.15 }), 'fade-up')]; })],
        notes: 'La lombarda contiene antocianinas, que cambian de color con el pH: rojo en ácidos, morado en neutro, azul-verde en bases y amarillo en bases muy fuertes. Un tubo por clic.' },
      { title: 'Neutralización', layout: 'titleOnly', bg: BG, extra: [
        m('\\mathrm{HCl + NaOH \\longrightarrow NaCl + H_2O}', 90, 175, 1100, 70, 34, INK),
        tx('ácido + base → sal + agua', 90, 250, 1100, 40, 22, DIM, { textAlign: 'center' }),
        chartBlock({ x: 80, y: 300, w: 700, h: 360, chartType: 'line', color: PH[10], grid: true, xTitle: 'NaOH añadido (mL)', yTitle: 'pH', yMin: 0, yMax: 14, seriesName: 'pH del vaso',
          data: Array.from({ length: 16 }, (_, i) => ({ label: String(i * 2), value: [1, 1.09, 1.18, 1.27, 1.37, 1.48, 1.6, 1.75, 1.95, 2.28, 7, 11.68, 11.96, 12.11, 12.22, 12.3][i] })) }),
        on(card('<b>Punto de equivalencia</b><br>A los 20 mL todo el ácido se ha neutralizado: el pH salta de 2 a 12 con muy poca base.', 820, 310, 380, 180, '#eefaf1', { color: INK, fontFamily: B, fontSize: 22 }), 'fade-left'),
        on(card('<b>En la vida real</b><br>Un antiácido neutraliza el exceso de ácido del estómago.', 820, 510, 380, 140, '#eef1ff', { color: INK, fontFamily: B, fontSize: 22 }), 'fade-left')],
        notes: 'Curva de valoración de ejemplo: 20 mL de ácido clorhídrico a los que se añade hidróxido de sodio gota a gota. El salto brusco de pH es el punto de equivalencia.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', fontSize: 36, x: 80, y: 60, w: 1120, h: 600, question: 'Ordena de más ácido a más básico',
        options: ['Limón', 'Café', 'Agua pura', 'Bicarbonato', 'Lejía'] })],
        notes: 'Actividad de ordenar desde el móvil; Revela la corrige. Orden: limón (2), café (5), agua pura (7), bicarbonato (8,3) y lejía (13).' },
      { layout: 'blank', bg: BG, extra: [quiz('Una disolución pasa de pH 4 a pH 2. ¿Qué le ha pasado a su acidez?', ['Se ha duplicado', 'Es 20 veces mayor', 'Es 100 veces mayor', 'Ha bajado a la mitad'], 2)],
        notes: 'Dos puntos menos de pH: 10 × 10 = 100 veces más ácida. El error típico es pensar que la escala es lineal y responder «el doble».' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        hd('Para recordar', 90, 110, 700, 80, 64),
        ...[['pH < 7', 'ácido', PH[1]], ['pH = 7', 'neutro', PH[7]], ['pH > 7', 'básico', PH[11]]].flatMap(([a, b, c], i) => [
          on(shape('rounded', 90 + i * 375, 230, 350, 220, c), 'zoom-in', { start: i ? 'afterPrev' : 'click' }),
          along(hd(a, 90 + i * 375, 270, 350, 80, 60, '#ffffff', { textAlign: 'center' }), 'zoom-in'), along(hd(b, 90 + i * 375, 360, 350, 50, 34, '#ffffff', { textAlign: 'center', fontWeight: 500 }), 'zoom-in')]),
        tx('Y si algo es muy ácido o muy básico: guantes, gafas y nada de mezclar productos de limpieza.', 90, 510, 1100, 80, 26, DIM, { textAlign: 'center' }),
        ...PH.map((c, i) => shape('rect', 90 + i * 1100 / 15, 620, 1100 / 15, 16, c))],
        notes: 'Resumen final. Muy importante en casa: no mezclar lejía con amoniaco ni con productos ácidos (como desincrustantes), porque se desprenden gases tóxicos.' },
    ]));
  } },
};
