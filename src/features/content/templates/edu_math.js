// Example presentations: Matemáticas escolares (primaria y secundaria). Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Every deck has its own topic and its own look: a chalkboard, a fair's
// gaming table, a blueprint, a supermarket ticket, a squared notebook, the sea and the mountain, a
// botanical book, a terminal, a treasure map and a tiled Nasrid wall.

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
// A stroke through points of the slide (an ink object, so it can be drawn while presenting).
const ink = (pts, color, width = 4, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), px = Math.max(6, (80 - (Math.max(...xs) - Math.min(...xs))) / 2), py = Math.max(6, (80 - (Math.max(...ys) - Math.min(...ys))) / 2);
  const x = Math.min(...xs) - px, y = Math.min(...ys) - py, w = Math.max(...xs) - x + px, h = Math.max(...ys) - y + py;
  return { ...base(Math.round(x), Math.round(y), Math.round(w), Math.round(h)), type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// A polygon of our own (points in a 0–100 box stretched to the object).
const poly = (pts, x, y, w, h, fill, props = {}) => shape('custom', x, y, w, h, fill, { path: 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z', ...props });
// Straight strokes through points of the slide (a shape of our own, so «Dibujar» traces it); closed: back to the start.
const lines = (pts, color, width = 4, closed = false, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys), w = Math.max(2, Math.max(...xs) - x), h = Math.max(2, Math.max(...ys) - y);
  const d = 'M' + pts.map(([a, b]) => `${+((a - x) / w * 100).toFixed(2)} ${+((b - y) / h * 100).toFixed(2)}`).join(' L') + (closed ? ' Z' : '');
  return shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: width, ...props });
};
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 44, x: 70, y: 50, w: 1140, h: 620, ...props });
// Fonts of our own (Google fonts loaded on demand, as in the editor's list).
const FF = { caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif", mono: "'JetBrains Mono', monospace", courier: "'Courier New', Courier, monospace",
  space: "'Space Grotesk', sans-serif", playfair: "'Playfair Display', serif", cormorant: "'Cormorant Garamond', serif", oswald: "'Oswald', sans-serif",
  dancing: "'Dancing Script', cursive", merri: "'Merriweather', serif", inter: "'Inter', sans-serif", lora: "'Lora', serif" };
// The credit line of the CC BY models used in a deck (small, on its last slide).
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });

// A die face (n pips), drawn.
const die = (n, fill = '#fff4e0', pip = '#3d0c18', edge = '#c9b38a') => svgURL(200, 200, `<rect x="8" y="8" width="184" height="184" rx="34" fill="${fill}" stroke="${edge}" stroke-width="6"/>`
  + ({ 1: [[100, 100]], 2: [[58, 58], [142, 142]], 3: [[56, 56], [100, 100], [144, 144]], 4: [[58, 58], [142, 58], [58, 142], [142, 142]],
    5: [[56, 56], [144, 56], [100, 100], [56, 144], [144, 144]], 6: [[58, 52], [142, 52], [58, 100], [142, 100], [58, 148], [142, 148]] }[n])
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="${pip}"/>`).join(''));

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · Pythagoras on a chalkboard: chalk lettering, a figure that draws itself, the proof
  // without words with Transform, a table of triples that works itself out, a shortcut walked in 3D.
  edu_math_pythagoras: { name: 'El teorema de Pitágoras', cat: 'edu', summary: 'Pizarra de tiza: figura que se dibuja sola, demostración sin palabras con Transformar, ternas con fórmulas, atajo en 3D y concurso', make: () => {
    const BG = '#1f3d33', CH = '#f3f0e6', YE = '#f7e17b', PK = '#f5a9bd', BL = '#a7d8f2', GR = '#bfe3a6', DIM = '#bccbc3', H = FF.caveat;
    const chalk = (html, x, y, w, h, size, color = CH, p = {}) => text(html, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, ...p });
    const m = (latex, x, y, w, h, fs, color = CH, p = {}) => mathBlock({ x, y, w, h, fontSize: fs, latex, color, ...p });
    // (The wooden frame and the chalk on its tray go over the chalk dust: in each slide's back layer.)
    const dust = () => [glow(-260, -320, 900, '#2c5547', BG, 70), glow(760, 380, 760, '#29503f', BG, 60),
      shape('rect', 0, 0, 1280, 16, '#7b5534'), shape('rect', 0, 704, 1280, 16, '#7b5534'), shape('rect', 0, 0, 16, 720, '#6d4a2c'), shape('rect', 1264, 0, 16, 720, '#6d4a2c'),
      shape('rounded', 980, 692, 90, 10, '#f3f0e6'), shape('rounded', 1090, 693, 60, 9, '#f5a9bd'), shape('rounded', 1165, 692, 46, 10, '#f7e17b')];
    // The proof: a square of side a + b with four equal right triangles in two arrangements.
    const a = 165, b = 220, S = a + b, X0 = 110, Y0 = 215, tris = [uid(), uid(), uid(), uid()], frame = uid(), cols = [PK, BL, YE, GR];
    // (Triangle with its right angle top-left, a across and b down, turned 0/90/180/270°: placed by the box it shows.)
    const tri = (i, rot, vx, vy) => { const vw = rot % 180 ? b : a, vh = rot % 180 ? a : b, cx = X0 + vx + vw / 2, cy = Y0 + vy + vh / 2;
      return keep(poly([[0, 0], [100, 0], [0, 100]], cx - a / 2, cy - b / 2, a, b, cols[i], { rotation: rot, stroke: BG, strokeWidth: 3 }), tris[i]); };
    const box = () => keep(shape('rect', X0 - 6, Y0 - 6, S + 12, S + 12, 'none', { stroke: CH, strokeWidth: 3, sketch: true }), frame);
    const walker = lib3d('kn-character');
    return numbered(build({ name: 'El teorema de Pitágoras', palette: 'warm', fonts: 'friendly', title: { font: H, size: 66, color: YE, bold: false }, body: { color: CH },
      decor: () => [shape('rect', 0, 0, 1280, 16, '#7b5534'), shape('rect', 0, 704, 1280, 16, '#7b5534'), shape('rect', 0, 0, 16, 720, '#6d4a2c'), shape('rect', 1264, 0, 16, 720, '#6d4a2c')] }, [
      { layout: 'blank', bg: BG, back: dust(), extra: [
        chalk('Matemáticas · 2.º de ESO', 90, 140, 560, 50, 36, YE),
        chalk('El teorema<br>de Pitágoras', 80, 195, 640, 250, 108, CH, { lineHeight: 1 }),
        chalk('Tres cuadrados, un triángulo y una idea de hace 2500 años', 90, 470, 560, 110, 34, DIM),
        after(lines([[800, 300], [800, 450], [1000, 450]], CH, 5, true), 'draw', { duration: 1300 }),
        after(shape('rect', 650, 300, 150, 150, '#f5a9bd30', { stroke: PK, strokeWidth: 3, sketch: true }), 'draw', { duration: 900 }),
        along(chalk('a²', 650, 340, 150, 70, 54, PK, { textAlign: 'center' }), 'fade-in', { delay: 500 }),
        after(shape('rect', 800, 450, 200, 200, '#a7d8f230', { stroke: BL, strokeWidth: 3, sketch: true }), 'draw', { duration: 900 }),
        along(chalk('b²', 800, 515, 200, 70, 54, BL, { textAlign: 'center' }), 'fade-in', { delay: 500 }),
        after(shape('rect', 850, 150, 250, 250, '#f7e17b30', { stroke: YE, strokeWidth: 3, sketch: true, rotation: 36.87 }), 'draw', { duration: 1100 }),
        along(chalk('c²', 900, 235, 150, 80, 64, YE, { textAlign: 'center' }), 'fade-in', { delay: 600 })],
        notes: 'El triángulo y sus tres cuadrados se dibujan solos al llegar, como si fueran de tiza. Pregunta de arranque: ¿qué relación habrá entre las áreas de los tres cuadrados?' },
      { title: '¿Qué dice el teorema?', layout: 'titleOnly', bg: BG, back: dust(), extra: [
        lines([[210, 215], [210, 545], [650, 545]], CH, 5, true), lines([[210, 505], [250, 505], [250, 545]], CH, 3),
        on(chalk('cateto <i>a</i>', 50, 350, 150, 60, 40, PK, { textAlign: 'right' }), 'fade-right'),
        on(chalk('cateto <i>b</i>', 330, 560, 220, 60, 40, BL, { textAlign: 'center' }), 'fade-up'),
        on(chalk('hipotenusa <i>c</i>', 318, 330, 260, 60, 40, YE, { textAlign: 'center', rotation: 36.87 }), 'fade-in'),
        on(chalk('En todo triángulo <u>rectángulo</u>, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos.', 720, 185, 500, 230, 38), 'fade-in'),
        on(m('a^2 + b^2 = c^2', 720, 430, 500, 120, 64, YE), 'zoom-in', { sound: 'chime' }),
        chalk('La hipotenusa es el lado más largo: el que está enfrente del ángulo recto.', 720, 575, 500, 90, 28, DIM)],
        notes: 'Un clic por cada lado: primero los nombres, después el enunciado y la fórmula (suena una campanilla). Insistir: solo vale para triángulos rectángulos.' },
      { title: 'Una demostración sin palabras', layout: 'titleOnly', bg: BG, back: dust(), extra: [
        box(), tri(0, 0, 0, 0), tri(1, 90, a, 0), tri(2, 180, b, a), tri(3, 270, 0, b),
        chalk('c²', X0 + S / 2 - 60, Y0 + S / 2 - 45, 120, 90, 80, CH, { textAlign: 'center' }),
        chalk('Un cuadrado de lado <span style="color:#f7e17b">a + b</span> y, dentro, cuatro triángulos rectángulos iguales.', 600, 210, 600, 140, 38),
        on(chalk('El hueco que dejan es un cuadrado inclinado de lado <span style="color:#f7e17b">c</span>: su área es <b>c²</b>.', 600, 370, 600, 140, 38), 'fade-up'),
        on(chalk('Ahora movemos los triángulos sin girarlos… →', 600, 540, 600, 70, 34, PK), 'fade-in')],
        notes: 'Primera colocación. Al pasar a la siguiente diapositiva, Transformar desliza los mismos cuatro triángulos a su nueva posición: el área libre no cambia.' },
      { title: 'Una demostración sin palabras', layout: 'titleOnly', bg: BG, back: dust(), autoAnimate: true, transition: 'fade', extra: [
        box(), tri(0, 0, 0, a), tri(1, 90, a, 0), tri(2, 180, 0, a), tri(3, 270, a, 0),
        chalk('a²', X0, Y0 + a / 2 - 40, a, 80, 64, CH, { textAlign: 'center' }),
        chalk('b²', X0 + a, Y0 + a + b / 2 - 45, b, 90, 80, CH, { textAlign: 'center' }),
        chalk('Mismo cuadrado grande, mismos cuatro triángulos…', 600, 210, 600, 110, 38),
        chalk('…y ahora el hueco son <b>dos</b> cuadrados: uno de área <b style="color:#f5a9bd">a²</b> y otro de área <b style="color:#a7d8f2">b²</b>.', 600, 330, 600, 140, 38),
        on(m('a^2 + b^2 = c^2', 600, 500, 600, 110, 60, YE), 'zoom-in', { sound: 'chime' })],
        notes: 'Transformar: los triángulos rosa, amarillo y verde viajan a su sitio. Si el hueco era c² antes y ahora es a² + b², las dos áreas son iguales. Es la demostración más famosa por reordenación.' },
      { title: 'Ternas pitagóricas', layout: 'titleOnly', bg: BG, back: dust(), extra: [
        tableBlock({ x: 90, y: 180, w: 680, h: 440, fontSize: 34, fontFamily: H, header: true, headBg: '#2f5a4b', headFg: YE, stroke: '#f3f0e680', colW: [2, 2, 3, 3],
          rows: [['a', 'b', 'a² + b²', 'c = √(a² + b²)'], ['3', '4', '=A2^2+B2^2', '=C2^0,5'], ['5', '12', '=A3^2+B3^2', '=C3^0,5'], ['8', '15', '=A4^2+B4^2', '=C4^0,5'],
            ['7', '24', '=A5^2+B5^2', '=C5^0,5'], ['20', '21', '=A6^2+B6^2', '=C6^0,5']] }),
        chalk('Tres números enteros que cumplen el teorema: los lados de un triángulo rectángulo «exacto».', 820, 190, 380, 200, 34),
        on(chalk('Truco: multiplica una terna y sale otra.<br><span style="color:#f7e17b">3-4-5 → 6-8-10 → 9-12-15</span>', 820, 410, 380, 160, 32, PK), 'fade-up')],
        notes: 'La tabla calcula sola: la tercera columna es =A2^2+B2^2 y la cuarta saca la raíz con =C2^0,5. Cambia un cateto y todo se recalcula. Los albañiles marcan ángulos rectos con una cuerda de 3, 4 y 5 palmos.' },
      { title: 'El atajo del parque', layout: 'titleOnly', bg: BG, back: dust(), extra: [
        shape('rect', 120, 300, 600, 250, '#2d5a3d', { stroke: GR, strokeWidth: 3, sketch: true }),
        ...[[180, 340], [610, 470], [430, 330], [250, 470]].map(([x, y]) => shape('ellipse', x, y, 46, 46, '#3f7a4f', { stroke: '#1f3d33', strokeWidth: 2 })),
        chalk('120 m', 340, 555, 160, 50, 34, BL, { textAlign: 'center' }), chalk('50 m', 728, 380, 50, 80, 26, PK, { lineHeight: 1.1 }),
        lines([[120, 550], [720, 300]], YE, 4, false, { dash: 'dash' }),
        withAnims(model('kn-character', 60, 430, 120, 150, { walk: { clip: walker.walk, end: walker.arrive, endOnce: true, face: true, look: true } }),
          path([[150, -62], [300, -125], [450, -187], [600, -250]], { duration: 4200 })),
        chalk('Rodeando: 120 + 50 = <b>170 m</b>', 780, 200, 440, 60, 36, CH),
        on(m('\\sqrt{120^2 + 50^2} = 130', 780, 290, 440, 90, 38, YE), 'fade-in'),
        on(chalk('Por la diagonal: <b>130 m</b>.<br>Se ahorra <span style="color:#bfe3a6">40 m</span> en cada paseo.', 780, 410, 440, 140, 36, CH), 'fade-up', { sound: 'pop' })],
        notes: 'Clic: el personaje cruza el parque por la diagonal (recorrido animado con su animación de andar y un salto al llegar). Después, el cálculo y el ahorro. Medidas inventadas para el ejemplo.' },
      { layout: 'blank', bg: BG, back: dust(), extra: [quiz('Una escalera de 5 m se apoya en la pared con el pie a 3 m. ¿A qué altura llega?', ['2 m', '4 m', '8 m', '√34 m'], 1, { fontSize: 40 })],
        notes: 'Concurso desde el móvil. Aquí la incógnita es un cateto: 5² − 3² = 16, y la raíz de 16 es 4. Quien elija √34 ha sumado en vez de restar.' },
      { layout: 'blank', bg: BG, back: dust(), transition: 'zoom', extra: [
        chalk('Reto para el cuaderno', 90, 110, 700, 90, 72, YE),
        chalk('Una rampa para la puerta del colegio sube <b>1 m</b> en <b>2,4 m</b> de recorrido horizontal. ¿Cuánto mide la rampa?', 90, 220, 640, 200, 40),
        lines([[110, 600], [530, 600], [530, 425]], CH, 4, true), chalk('2,4 m', 260, 605, 120, 50, 30, BL), chalk('1 m', 545, 490, 80, 50, 30, PK), chalk('?', 280, 455, 60, 60, 44, YE),
        timer(180, 840, 170, 340, { color: YE, endText: '¡Tizas abajo!' }),
        chalk('Solución en las notas', 840, 540, 340, 50, 28, DIM, { textAlign: 'center' })],
        notes: 'Cuenta atrás de 3 minutos. Solución: √(2,4² + 1²) = √6,76 = 2,6 m. Es la terna 5-12-13 dividida entre 5.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · Probability at a fair's gaming table: burgundy felt and gold, dice that roll in with a
  // drum roll, chips, a scale from impossible to certain, a tree, two charts and the gambler's fallacy.
  edu_math_probability: { name: 'Probabilidad: medir la suerte', cat: 'edu', summary: 'Mesa de juego burdeos y oro: dados que ruedan con redoble, texto curvo, regla de Laplace, árbol uno a uno, barras, líneas y concurso', make: () => {
    const BG = '#3d0c18', FELT = '#5a1424', GOLD = '#e9c46a', CR = '#fff4e0', TEAL = '#2a9d8f', RED = '#e63946', DIM = '#e8cfc0', H = FF.bebas;
    const felt = () => [glow(-110, -560, 1500, '#6b1a2c', BG, 75), shape('rect', 40, 696, 1200, 3, GOLD, { opacity: 60 })];
    const chip = (x, y, d, c) => shape('ellipse', x, y, d, d, c, { stroke: '#ffffff', strokeWidth: 6, dash: 'dash' });
    const sums = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
    return numbered(build({ name: 'Probabilidad: medir la suerte', palette: 'revela', fonts: 'bold', title: { color: GOLD, size: 64 }, body: { color: CR },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: felt(), transition: 'zoom', extra: [
        text('MATEMÁTICAS · 3.º DE ESO', 90, 160, 600, 40, { fontSize: 24, letterSpacing: 6, color: TEAL, fontWeight: 700 }),
        text('PROBABILIDAD', 80, 190, 760, 210, { fontFamily: H, fontSize: 146, color: GOLD, lineHeight: 1.3 }),
        text('¿Se puede medir la suerte? Sí: con un número entre 0 y 1.', 90, 410, 600, 110, { fontSize: 36, color: CR }),
        shape('ellipse', 830, 120, 380, 380, FELT, { stroke: GOLD, strokeWidth: 3 }),
        text('CARA · CRUZ · CARA · CRUZ · CARA · CRUZ · ', 810, 100, 420, 420, { fontSize: 26, curve: 100, color: GOLD, letterSpacing: 4, textAlign: 'center' }),
        after(img(die(5), 880, 190, 150, 150, 'Dado con un cinco', { rotation: -14 }), 'spin', { duration: 900, sound: 'drumroll' }),
        along(img(die(2), 1010, 300, 150, 150, 'Dado con un dos', { rotation: 18 }), 'spin', { duration: 900, delay: 250 }),
        text('Un dado no tiene memoria, pero las matemáticas sí.', 90, 560, 700, 50, { fontSize: 26, color: DIM, fontStyle: 'italic' })],
        notes: 'Al llegar, los dos dados ruedan sobre el tapete con un redoble. El texto «cara · cruz» es texto curvo alrededor del tapete.' },
      { title: 'La regla de Laplace', layout: 'titleOnly', bg: BG, back: felt(), extra: [
        mathBlock({ x: 190, y: 160, w: 900, h: 170, fontSize: 44, color: CR, latex: 'P(A) = \\dfrac{\\text{casos favorables}}{\\text{casos posibles}}' }),
        ...[['1/2', 'Cara al lanzar una moneda', TEAL], ['1/6', 'Un 6 al tirar un dado', RED], ['4/40', 'Un as de una baraja española de 40 cartas', '#b07d2b']].flatMap(([f, t, c], i) => [
          on(chip(145 + i * 400, 345, 190, c), 'zoom-in', { sound: 'pop' }),
          along(text(f, 145 + i * 400, 400, 190, 80, { fontFamily: H, fontSize: 72, color: '#ffffff', textAlign: 'center' }), 'zoom-in'),
          along(text(t, 75 + i * 400, 555, 330, 90, { fontSize: 26, color: CR, textAlign: 'center' }), 'fade-up')]),
        text('Solo vale si todos los casos son igual de probables.', 140, 652, 1000, 36, { fontSize: 20, color: DIM, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Tres fichas, un clic cada una. 4/40 se simplifica a 1/10. Preguntar: ¿vale Laplace para un dado trucado? No: los casos ya no son equiprobables.' },
      { title: 'De imposible a seguro', layout: 'titleOnly', bg: BG, back: felt(), extra: [
        shape('rounded', 140, 360, 1000, 36, RED, { fill2: TEAL, gradAngle: 0 }),
        ...[['0 · imposible', 140], ['0,5', 640], ['1 · seguro', 1140]].map(([t, x]) => text(t, x - 90, 405, 180, 40, { fontSize: 24, color: DIM, textAlign: 'center' })),
        ...[[0, 'Sacar un 7 con un dado', '0', true], [1 / 6, 'Un 6 con un dado', '1/6', false], [0.5, 'Cara con una moneda', '1/2', true], [5 / 6, 'Menos de 6 con un dado', '5/6', false], [1, 'Un número del 1 al 6', '1', true]]
          .flatMap(([p, t, f, top]) => { const px = 140 + 1000 * p, cx = Math.min(1020, Math.max(40, px - 110));
            return [on(card(`<div style="font-size:22px">${t}</div><div style="font-family:${H};font-size:44px;color:${GOLD};line-height:1.1">P = ${f}</div>`, cx, top ? 175 : 470, 220, 130, '#ffffff14', { color: CR, pad: [12, 14, 10, 14], textAlign: 'center' }), top ? 'fade-down' : 'fade-up'),
              along(shape('triangle', px - 14, top ? 318 : 404, 28, 30, GOLD, { rotation: top ? 180 : 0 }), 'fade-in')]; })],
        notes: 'Cinco sucesos, un clic cada uno, se colocan en la escala. La probabilidad siempre está entre 0 (imposible) y 1 (seguro). Pedir al grupo que coloque otros: «que mañana sea lunes», «que llueva hoy».' },
      { title: 'Dos monedas: el árbol', layout: 'titleOnly', bg: BG, back: felt(), extra: [
        dg('hierarchy', 'Lanzo dos monedas\n  Cara\n    Cara · Cara\n    Cara · Cruz\n  Cruz\n    Cruz · Cara\n    Cruz · Cruz', 60, 175, 760, 470, { oneByOne: true, colors: 'accent' }),
        card(`<div style="font-family:${H};font-size:46px;color:${GOLD}">4 caminos</div><div>igual de probables</div>`, 860, 190, 360, 150, '#ffffff14', { color: CR, fontSize: 26 }),
        on(mathBlock({ x: 860, y: 370, w: 360, h: 80, fontSize: 34, color: CR, latex: 'P(\\text{dos caras}) = \\tfrac{1}{4}' }), 'fade-left'),
        on(mathBlock({ x: 860, y: 470, w: 360, h: 80, fontSize: 34, color: CR, latex: 'P(\\text{una de cada}) = \\tfrac{2}{4}' }), 'fade-left'),
        text('¡Cuidado! «Una de cada» sale el doble que «dos caras».', 860, 570, 360, 90, { fontSize: 22, color: DIM })],
        notes: 'El árbol aparece rama a rama. Error típico: creer que hay tres casos (dos caras, dos cruces, una de cada) igual de probables.' },
      { title: 'Dos dados: ¿qué suma sale más?', layout: 'titleOnly', bg: BG, back: felt(), extra: [
        chartBlock({ x: 70, y: 175, w: 760, h: 470, chartType: 'bar', color: GOLD, dataLabels: true, grid: true, yTitle: 'casos de 36', xTitle: 'suma',
          data: sums.map((v, i) => ({ label: String(i + 2), value: v })) }),
        text('<span style="font-size:22px;letter-spacing:4px;color:#2a9d8f">LA MÁS PROBABLE</span>', 880, 185, 340, 40, { fontSize: 22 }),
        text(`<span style="font-family:${H};font-size:150px;color:${GOLD};line-height:1">7</span>`, 880, 220, 340, 160, { fontSize: 30 }),
        on(text('Seis maneras de sumar 7:<br>1+6 · 2+5 · 3+4 · 4+3 · 5+2 · 6+1', 880, 390, 340, 120, { fontSize: 26, color: CR }), 'fade-up'),
        on(mathBlock({ x: 880, y: 530, w: 340, h: 90, fontSize: 40, color: GOLD, latex: 'P(7) = \\tfrac{6}{36} = \\tfrac{1}{6}' }), 'zoom-in', { sound: 'chime' })],
        notes: 'Hay 36 parejas posibles (6 × 6). El 2 y el 12 solo salen de una manera; el 7, de seis. Por eso en tantos juegos de mesa el 7 es especial.' },
      { title: 'La ley de los grandes números', layout: 'titleOnly', bg: BG, back: felt(), extra: [
        chartBlock({ x: 70, y: 175, w: 780, h: 470, chartType: 'line', color: GOLD, grid: true, yMin: 0, yMax: 0.8, seriesName: 'Frecuencia de cara', xTitle: 'lanzamientos',
          data: [10, 20, 50, 100, 200, 500, 1000, 2000].map((n, i) => ({ label: String(n), value: [0.7, 0.35, 0.58, 0.46, 0.53, 0.488, 0.507, 0.498][i] })),
          series: [{ name: 'Probabilidad teórica', values: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], color: TEAL }] }),
        text('Con pocos lanzamientos, cualquier cosa. Con miles, la frecuencia se acerca a <b style="color:#e9c46a">0,5</b>.', 890, 200, 330, 230, { fontSize: 30, color: CR }),
        on(card('La probabilidad no adivina el próximo lanzamiento: describe lo que pasa <b>a la larga</b>.', 890, 450, 330, 190, TEAL, { color: '#ffffff', fontSize: 25 }), 'fade-up')],
        notes: 'Datos de una simulación (inventados para el ejemplo). La línea dorada baila mucho al principio y se estabiliza alrededor de la teórica.' },
      { layout: 'blank', bg: BG, extra: [quiz('Ana ha sacado cinco caras seguidas. En el sexto lanzamiento, ¿qué es más probable?', ['Cara: está en racha', 'Cruz: ya le toca', 'Las dos igual'], 2, { fontSize: 40 })],
        notes: 'La «falacia del jugador»: la moneda no recuerda lo anterior. Cada lanzamiento sigue siendo 1/2 y 1/2.' },
      { layout: 'blank', bg: BG, back: felt(), transition: 'convex', extra: [
        text('EXPERIMENTO EN PAREJAS', 90, 110, 800, 90, { fontFamily: H, fontSize: 80, color: GOLD }),
        text(ul('Lanzad una moneda <b>20 veces</b>', 'Apuntad cuántas caras salen', 'Calculad la frecuencia: caras ÷ 20', 'Sumamos los datos de toda la clase'), 90, 220, 640, 300, { fontSize: 32, color: CR }),
        img(die(6), 900, 210, 130, 130, 'Dado con un seis', { rotation: 10 }), img(die(3), 1060, 250, 110, 110, 'Dado con un tres', { rotation: -12 }),
        timer(240, 90, 560, 1100, { style: 'bar', h: 80, color: GOLD, endText: '¡A contar!' }),
        text('La suerte no tiene memoria.', 760, 420, 460, 60, { fontSize: 34, color: DIM, fontStyle: 'italic', textAlign: 'right' })],
        notes: 'Cuenta atrás en barra de 4 minutos. Al juntar los datos de toda la clase (unos 300 lanzamientos) la frecuencia suele quedar muy cerca de 0,5: la ley de los grandes números en directo.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 3 · Areas and volumes as a blueprint: a squared grid, white strokes and dimension lines,
  // a title block as a table, a 3D bottle measured, a table that works out the volumes and three cones.
  edu_math_volumes: { name: 'Áreas y volúmenes', cat: 'edu', summary: 'Plano técnico azul: cajetín en tabla, desarrollo plano, botella 3D medida, volúmenes con fórmulas, barras, conos que llenan y emparejar', make: () => {
    const BG = '#0b3a63', W = '#eaf4ff', CY = '#7fd1ff', YE = '#ffd166', OR = '#ff9f5a', DIM = '#a9c7e3', H = FF.space, M = FF.mono;
    const GRID = svgURL(1280, 720, Array.from({ length: 33 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="720" stroke="#ffffff" stroke-opacity="${i % 5 ? 0.06 : 0.14}"/>`).join('')
      + Array.from({ length: 19 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="1280" y2="${i * 40}" stroke="#ffffff" stroke-opacity="${i % 5 ? 0.06 : 0.14}"/>`).join(''));
    const lbl = (t, x, y, w, color = YE, p = {}) => text(t, x, y, w, 40, { fontFamily: M, fontSize: 22, color, ...p });
    const m = (latex, x, y, w, h, fs, color = W, p = {}) => mathBlock({ x, y, w, h, fontSize: fs, latex, color, ...p });
    // The drawing of a cylinder with its dimensions (the cover).
    const CYL = svgURL(420, 460, '<g fill="none" stroke="#eaf4ff" stroke-width="3"><ellipse cx="190" cy="70" rx="140" ry="40"/><path d="M50 70 V370 M330 70 V370"/>'
      + '<path d="M50 370 A140 40 0 0 0 330 370"/><path d="M50 370 A140 40 0 0 1 330 370" stroke-dasharray="10 8" stroke-opacity=".6"/></g>'
      + '<g stroke="#ffd166" stroke-width="2" fill="#ffd166"><path d="M190 70 H330" stroke-dasharray="6 5"/><circle cx="190" cy="70" r="5"/>'
      + '<path d="M375 70 V370"/><path d="M368 82 L375 66 L382 82Z M368 358 L375 374 L382 358Z"/><path d="M340 70 H390 M340 370 H390" stroke-opacity=".5"/></g>'
      + '<text x="225" y="58" font-family="monospace" font-size="24" fill="#ffd166">r = 4</text><text x="388" y="230" font-family="monospace" font-size="24" fill="#ffd166" transform="rotate(90 388 230)" text-anchor="middle">h = 10</text>');
    const vols = [['Cubo', 'arista 5', '=5^3', 125], ['Prisma', '4 × 6 × 10', '=4*6*10', 240], ['Cilindro', 'r 3 · h 10', '=3,1416*3^2*10', 282.7], ['Cono', 'r 3 · h 10', '=3,1416*3^2*10/3', 94.2], ['Esfera', 'r 4', '=4/3*3,1416*4^3', 268.1]];
    return numbered(build({ name: 'Áreas y volúmenes', palette: 'ocean', fonts: 'tech', title: { color: W, size: 50 }, body: { color: W },
      decor: () => [img(GRID, 0, 0, 1280, 720, 'Cuadrícula del plano', { fit: 'fill' }), shape('rect', 24, 24, 1232, 672, 'none', { stroke: '#ffffff', strokeWidth: 2, opacity: 55 })] }, [
      { layout: 'blank', bg: BG, extra: [
        lbl('PLANO N.º 01 · GEOMETRÍA DEL ESPACIO', 80, 170, 640, CY, { letterSpacing: 2 }),
        text('ÁREAS Y<br>VOLÚMENES', 74, 210, 660, 240, { fontFamily: H, fontSize: 92, fontWeight: 700, color: W, lineHeight: 1 }),
        text('Cuánto papel envuelve un cuerpo y cuánta agua cabe dentro', 80, 475, 560, 100, { fontSize: 32, color: DIM }),
        after(img(CYL, 760, 80, 420, 460, 'Plano de un cilindro de radio 4 y altura 10'), 'fade-in', { duration: 1200 }),
        tableBlock({ x: 760, y: 560, w: 440, h: 110, fontSize: 17, fontFamily: M, stroke: '#eaf4ff', colW: [2, 3],
          rows: [['PROYECTO', 'Cuerpos geométricos'], ['CURSO', '1.º de ESO · Matemáticas'], ['ESCALA', '1 : 1 · medidas en cm']] })],
        notes: 'Portada con aspecto de plano: cuadrícula, cotas en amarillo y un cajetín (es una tabla). El cilindro reaparece más adelante con una botella de verdad.' },
      { title: 'Primero, las áreas', layout: 'titleOnly', bg: BG, extra: [
        ...[['Cuadrado', 'A = l^2', '5 cm → 25 cm²', 'rect', 120, 120], ['Rectángulo', 'A = b \\cdot h', '6 × 3 → 18 cm²', 'rect', 180, 100], ['Triángulo', 'A = \\dfrac{b \\cdot h}{2}', '6 × 4 ÷ 2 → 12 cm²', 'triangle', 170, 130], ['Círculo', 'A = \\pi r^2', 'r = 2 → 12,57 cm²', 'ellipse', 130, 130]]
          .flatMap(([n, f, ex, kind, sw, sh], i) => { const x0 = 70 + i * 290;
            return [on(shape('rect', x0, 180, 270, 470, '#ffffff08', { stroke: CY, strokeWidth: 2, dash: 'dash' }), 'fade-up'),
              along(text(n.toUpperCase(), x0, 200, 270, 40, { fontFamily: M, fontSize: 22, color: CY, textAlign: 'center', letterSpacing: 2 }), 'fade-up'),
              along(shape(kind, x0 + 135 - sw / 2, 320 - sh / 2, sw, sh, '#7fd1ff22', { stroke: W, strokeWidth: 3 }), 'fade-up'),
              along(m(f, x0 + 10, 410, 250, 110, 38), 'fade-up'),
              along(text(ex, x0 + 10, 560, 250, 60, { fontFamily: M, fontSize: 20, color: YE, textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Cuatro fichas, un clic cada una. El área se mide en unidades cuadradas: cm², m²… Repaso rápido antes de pasar al espacio.' },
      { title: 'Desarrollo plano de un cubo', layout: 'titleOnly', bg: BG, extra: [
        ...[[1, 0, 'tapa'], [0, 1, 'lateral'], [1, 1, 'lateral'], [2, 1, 'lateral'], [3, 1, 'lateral'], [1, 2, 'base']].flatMap(([c, r, t], i) => [
          withAnims(shape('rect', 90 + c * 125, 185 + r * 125, 125, 125, i === 5 ? '#ffd16633' : '#7fd1ff22', { stroke: W, strokeWidth: 2 }), A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 220, duration: 400 })),
          withAnims(text(t, 90 + c * 125, 230 + r * 125, 125, 36, { fontFamily: M, fontSize: 18, color: DIM, textAlign: 'center' }), A('fade-in', { start: 'withPrev', delay: i * 220 }))]),
        lbl('l = 5 cm', 215, 145, 125, YE, { textAlign: 'center' }),
        text('Seis caras cuadradas iguales: si lo recortas y lo doblas por las líneas, se cierra el cubo.', 680, 190, 520, 130, { fontSize: 30, color: W }),
        on(m('A_{total} = 6 \\cdot l^2', 680, 340, 520, 90, 44, W), 'fade-left'),
        on(m('= 6 \\cdot 5^2 = 150\\ \\text{cm}^2', 680, 440, 520, 90, 44, YE), 'fade-left', { sound: 'chime' }),
        text('Prisma de aristas a, b, c: A = 2(ab + ac + bc)', 680, 580, 540, 50, { fontFamily: M, fontSize: 18, color: DIM })],
        notes: 'Las seis caras aparecen solas, una tras otra. Proponer recortar el desarrollo en cartulina: es la mejor manera de ver por qué el área total es 6 · l².' },
      { title: 'Volumen de un cilindro', layout: 'titleOnly', bg: BG, extra: [
        model('kh-WaterBottle', 90, 160, 380, 500, { caption: '', autoRotate: true, view: 'front', motion: 'float' }),
        shape('doublearrow', 330, 400, 420, 30, YE, { rotation: 90, stroke: YE, strokeWidth: 3 }), lbl('h = 22', 560, 395, 120),
        shape('doublearrow', 190, 640, 180, 24, YE, { stroke: YE, strokeWidth: 3 }), lbl('d = 7', 380, 632, 100),
        m('V = A_{base} \\cdot h = \\pi r^2 h', 700, 190, 500, 90, 42, W),
        on(m('V = \\pi \\cdot 3{,}5^2 \\cdot 22', 700, 300, 500, 80, 40, CY), 'fade-left'),
        on(m('V \\approx 847\\ \\text{cm}^3', 700, 395, 500, 80, 40, CY), 'fade-left'),
        on(text(`<span style="font-family:${H};font-size:96px;font-weight:700;color:${YE}">≈ 0,85 L</span>`, 700, 490, 500, 120, { fontSize: 30, textAlign: 'center' }), 'zoom-in', { sound: 'pop' }),
        lbl('1 dm³ = 1 000 cm³ = 1 litro', 700, 620, 500, DIM, { textAlign: 'center', fontSize: 18 })],
        notes: 'La botella 3D flota y gira; las cotas son las de una botella real aproximada a un cilindro (medidas inventadas). Un clic por paso del cálculo. 847 cm³ son casi 0,85 litros.' },
      { title: 'Volúmenes que se calculan solos', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 70, y: 180, w: 640, h: 400, fontSize: 24, fontFamily: M, header: true, headBg: '#1d5e94', headFg: YE, stroke: '#eaf4ff70', banded: true, band: CY, colW: [3, 3, 3],
          rows: [['Cuerpo', 'Medidas (cm)', 'Volumen (cm³)'], ...vols.map(([n, d, f]) => [n, d, f])] }),
        chartBlock({ x: 750, y: 180, w: 460, h: 400, chartType: 'bar', color: CY, dataLabels: true, data: vols.map(([n, , , v]) => ({ label: n, value: v })) }),
        text('π se escribe 3,1416 en las fórmulas de la tabla: cambia una medida y el volumen se recalcula.', 70, 600, 1140, 50, { fontSize: 22, color: DIM })],
        notes: 'Fórmulas de la tabla: cubo =5^3, prisma =4*6*10, cilindro =3,1416*3^2*10, cono la tercera parte y esfera =4/3*3,1416*4^3. El cono y el cilindro tienen las mismas medidas: comparar sus barras.' },
      { title: 'Tres conos llenan un cilindro', layout: 'titleOnly', bg: BG, extra: [
        ...[0, 1, 2].map(i => withAnims(shape('rect', 778, 444 - i * 92, 264, 92, CY, { opacity: 70 }), A('fade-up', { start: 'afterPrev', sound: 'pop', duration: 400 }))),
        shape('cylinder', 770, 190, 280, 420, 'none', { stroke: W, strokeWidth: 3 }),
        ...[0, 1, 2].map(i => withAnims(shape('triangle', 110 + i * 190, 400, 150, 220, '#ffd16633', { stroke: YE, strokeWidth: 3 }),
          path([[(700 - i * 190) / 2, -300], [700 - i * 190, -260]], { duration: 1100 }), A('fade-out', { start: 'afterPrev', duration: 300 }))),
        lbl('mismo radio · misma altura', 110, 640, 560, DIM),
        m('V_{cono} = \\dfrac{1}{3}\\,\\pi r^2 h', 90, 190, 520, 120, 46, YE)],
        notes: 'Tres clics: cada cono «vuela» hasta el cilindro, desaparece y el agua sube un tercio. Con conos y un cilindro de plástico de igual base y altura se puede hacer en clase con arroz.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', question: 'Une cada cuerpo con su volumen', fontSize: 32, x: 80, y: 60, w: 1120, h: 600,
        options: ['Cubo = l³', 'Cilindro = π · r² · h', 'Cono = π · r² · h ÷ 3', 'Esfera = 4/3 · π · r³', 'Prisma = área de la base · h'] })],
        notes: 'Actividad de relacionar desde el móvil: se corrige sola. Pista para la esfera: es la única con r al cubo y sin altura.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        lbl('ENCARGO FINAL', 80, 110, 400, CY, { letterSpacing: 4 }),
        text('¿Cuántos litros de aire caben en nuestra clase?', 74, 145, 720, 210, { fontFamily: H, fontSize: 60, fontWeight: 700, color: W, lineHeight: 1.1 }),
        text(ul('Medid largo, ancho y alto con la cinta métrica', 'Calculad el volumen en m³', 'Pasadlo a litros: 1 m³ = 1 000 L'), 80, 380, 660, 240, { fontSize: 28, color: W }),
        timer(300, 850, 170, 330, { color: YE, endText: '¡Medidas!' }),
        text('Una clase de 8 × 6 × 3 m tiene 144 m³:<br><b style="color:#ffd166">144 000 litros</b>', 780, 530, 470, 100, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Cuenta atrás de 5 minutos para medir por grupos. El ejemplo de abajo sirve para comprobar el orden de magnitud.' },
    ]));
  } },
  // ---------------------------------------------------------------------------------------
  // 4 · Proportionality at the supermarket: a till receipt (zigzag paper, monospaced type),
  // price tags, a table that multiplies, two lines (direct and inverse), sale prices with formulas.
  edu_math_proportion: { name: 'Proporcionalidad en el súper', cat: 'edu', summary: 'Ticket de compra: sello que rebota, tabla de proporcionalidad con fórmulas, regla de tres paso a paso, rebajas calculadas, líneas y huecos', make: () => {
    const BG = '#e7e3da', PAPER = '#fffdf7', INK = '#2b2b2b', RED = '#d62828', TAG = '#ffd23f', TEAL = '#1b7f79', DIM = '#6d675c', C = FF.courier, G = 'Georgia, serif';
    // A strip of receipt paper: zigzag at the top and the bottom.
    const zig = (n = 18, t = 2) => { const top = Array.from({ length: n * 2 + 1 }, (_, i) => `${+(i * 50 / n).toFixed(2)} ${i % 2 ? 0 : t}`);
      const bottom = Array.from({ length: n * 2 + 1 }, (_, i) => `${+(100 - i * 50 / n).toFixed(2)} ${i % 2 ? 100 : 100 - t}`);
      return 'M' + top.join(' L') + ' L' + bottom.join(' L') + ' Z'; };
    const receipt = (x, y, w, h, n) => shape('custom', x, y, w, h, PAPER, { path: zig(n, 16 / h * 100 / 2), shadow: { x: 0, y: 8, blur: 18, color: '#00000030' } });
    const mono = (t, x, y, w, h, size = 22, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: C, fontSize: size, color, lineHeight: 1.35, ...p });
    const tag = (html, x, y, w, h, fill = TAG, p = {}) => card(html, x, y, w, h, fill, { color: INK, radius: 10, pad: [12, 16, 12, 16], fontFamily: G, textAlign: 'center', vAlign: 'middle', shadow: { x: 0, y: 4, blur: 8, color: '#00000025' }, ...p });
    const BARS = svgURL(260, 70, Array.from({ length: 46 }, (_, i) => `<rect x="${4 + i * 5.5}" y="0" width="${[1, 2, 3, 1, 2, 1][(i * 7) % 6]}" height="56" fill="#2b2b2b"/>`).join('')
      + '<text x="130" y="68" font-family="monospace" font-size="11" text-anchor="middle" fill="#2b2b2b">8 4 1 2 3 4 5 6 7 8 9 0 1 2</text>');
    const items = [['Manzanas  2 kg', '3,60'], ['Pan  1 ud', '1,20'], ['Leche  6 L', '5,40'], ['Tomates  1,5 kg', '3,15'], ['Arroz  2 paq.', '2,80']];
    return numbered(build({ name: 'Proporcionalidad en el súper', palette: 'grayscale', fonts: 'websafe', title: { font: C, color: INK, size: 48 }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 1280, 8, RED)] }, [
      { layout: 'blank', bg: BG, extra: [
        text('MATEMÁTICAS · 1.º DE ESO', 90, 170, 600, 40, { fontFamily: C, fontSize: 24, color: RED, letterSpacing: 4, fontWeight: 700 }),
        text('Proporcionalidad', 84, 215, 700, 110, { fontFamily: G, fontSize: 74, fontWeight: 700, color: INK }),
        text('Regla de tres y porcentajes con la compra de cada día', 90, 340, 600, 100, { fontSize: 32, color: DIM }),
        tag('<div style="font-size:18px">Manzanas golden</div><div style="font-size:44px;font-weight:700">1,80 €<span style="font-size:20px">/kg</span></div>', 90, 480, 260, 120),
        receipt(800, 40, 360, 640, 18),
        mono('MERCADO DE LA PLAZA', 820, 90, 320, 30, 22, INK, { textAlign: 'center', fontWeight: 700 }),
        mono('C/ Mayor, 12 · 14-10-2026 · 18:32', 820, 124, 320, 30, 15, DIM, { textAlign: 'center' }),
        shape('rect', 830, 168, 300, 2, INK, { dash: 'dash', opacity: 60 }),
        mono(items.map(i => i[0]).join('<br>'), 840, 185, 220, 160, 19),
        mono(items.map(i => i[1]).join('<br>'), 1040, 185, 90, 160, 19, INK, { textAlign: 'right' }),
        shape('rect', 830, 360, 300, 2, INK, { dash: 'dash', opacity: 60 }),
        mono('TOTAL', 840, 375, 150, 36, 26, INK, { fontWeight: 700 }), mono('16,15 €', 980, 375, 150, 36, 26, INK, { fontWeight: 700, textAlign: 'right' }),
        mono('IVA incluido', 830, 425, 300, 30, 14, DIM, { textAlign: 'center' }),
        img(BARS, 850, 470, 260, 70, 'Código de barras del ticket'),
        after(shape('seal', 1020, 540, 160, 160, RED, { rotation: -14 }), 'bounce', { sound: 'pop' }),
        along(text('-20 %', 1020, 590, 160, 60, { fontFamily: G, fontSize: 40, fontWeight: 700, color: '#ffffff', textAlign: 'center', rotation: -14 }), 'bounce')],
        notes: 'Portada: un ticket de papel (forma propia con dientes y sombra) y un sello de rebajas que cae con un «pop». Pregunta inicial: si 2 kg de manzanas cuestan 3,60 €, ¿cuánto cuestan 5 kg?' },
      { title: '¿Directa o inversa?', layout: 'titleOnly', bg: BG, extra: [
        on(shape('rounded', 90, 180, 520, 460, PAPER, { shadow: { x: 0, y: 6, blur: 14, color: '#00000020' } }), 'fade-right'),
        along(text('DIRECTA', 130, 205, 440, 50, { fontFamily: C, fontSize: 34, fontWeight: 700, color: TEAL, letterSpacing: 4 }), 'fade-right'),
        along(text('Si una magnitud se multiplica por 2, la otra <b>también</b>.', 130, 260, 440, 90, { fontSize: 26, color: INK }), 'fade-right'),
        along(shape('uparrow', 140, 380, 60, 110, TEAL), 'fade-right'), along(shape('uparrow', 330, 380, 60, 110, TEAL), 'fade-right'),
        along(text('kilos', 115, 500, 110, 40, { fontFamily: C, fontSize: 22, textAlign: 'center' }), 'fade-right'), along(text('euros', 305, 500, 110, 40, { fontFamily: C, fontSize: 22, textAlign: 'center' }), 'fade-right'),
        along(text('El cociente es constante', 130, 570, 440, 40, { fontSize: 22, color: DIM, fontStyle: 'italic' }), 'fade-right'),
        on(shape('rounded', 670, 180, 520, 460, PAPER, { shadow: { x: 0, y: 6, blur: 14, color: '#00000020' } }), 'fade-left'),
        along(text('INVERSA', 710, 205, 440, 50, { fontFamily: C, fontSize: 34, fontWeight: 700, color: RED, letterSpacing: 4 }), 'fade-left'),
        along(text('Si una magnitud se multiplica por 2, la otra se <b>divide</b> entre 2.', 710, 260, 440, 90, { fontSize: 26, color: INK }), 'fade-left'),
        along(shape('uparrow', 720, 380, 60, 110, RED), 'fade-left'), along(shape('downarrow', 910, 380, 60, 110, RED), 'fade-left'),
        along(text('pintores', 685, 500, 130, 40, { fontFamily: C, fontSize: 22, textAlign: 'center' }), 'fade-left'), along(text('días', 885, 500, 110, 40, { fontFamily: C, fontSize: 22, textAlign: 'center' }), 'fade-left'),
        along(text('El producto es constante', 710, 570, 440, 40, { fontSize: 22, color: DIM, fontStyle: 'italic' }), 'fade-left')],
        notes: 'Dos clics: primero la proporcionalidad directa y luego la inversa. Ojo: no todo lo que «sube a la vez» es proporcional (la edad y la altura, por ejemplo).' },
      { title: 'La tabla de las manzanas', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 150, fontSize: 28, fontFamily: C, header: false, firstCol: true, stroke: '#2b2b2b55', colW: [4, 2, 2, 2, 2, 2],
          rows: [['Kilos', '1', '2', '3', '5', '8'], ['Precio (€)', '=B1*1,8', '=C1*1,8', '=D1*1,8', '=E1*1,8', '=F1*1,8']] }),
        chartBlock({ x: 90, y: 360, w: 620, h: 300, chartType: 'line', color: TEAL, grid: true, xTitle: 'kilos', yTitle: 'euros',
          data: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => ({ label: String(k), value: +(k * 1.8).toFixed(2) })) }),
        tag('<div style="font-size:20px">constante de proporcionalidad</div><div style="font-size:54px;font-weight:700">1,80 €/kg</div>', 770, 380, 420, 150),
        on(text('Precio ÷ kilos da siempre lo mismo. La gráfica es una <b>recta que pasa por el origen</b>.', 770, 555, 420, 110, { fontSize: 24, color: INK }), 'fade-up')],
        notes: 'La fila de precios son fórmulas (=B1*1,8): si cambia el precio por kilo, se cambia en una y se copia. En la gráfica, 0 kg cuestan 0 €: por eso la recta sale del origen.' },
      { title: 'Regla de tres, paso a paso', layout: 'titleOnly', bg: BG, extra: [
        tag('<div style="font-size:22px">3 kg</div><div style="font-size:46px;font-weight:700">5,40 €</div>', 110, 200, 240, 130),
        tag('<div style="font-size:22px">7 kg</div><div style="font-size:46px;font-weight:700">¿x?</div>', 110, 380, 240, 130, '#ffe9a8'),
        text('MISMA PROPORCIÓN', 110, 540, 240, 40, { fontFamily: C, fontSize: 18, color: DIM, textAlign: 'center', letterSpacing: 2 }),
        on(mathBlock({ x: 440, y: 180, w: 740, h: 140, fontSize: 40, color: INK, latex: '\\dfrac{3}{5{,}40} = \\dfrac{7}{x}' }), 'fade-left'),
        on(mathBlock({ x: 440, y: 330, w: 740, h: 140, fontSize: 40, color: INK, latex: 'x = \\dfrac{7 \\cdot 5{,}40}{3}' }), 'fade-left'),
        on(mathBlock({ x: 440, y: 480, w: 740, h: 90, fontSize: 48, color: RED, latex: 'x = 12{,}60\\ \\text{€}' }), 'zoom-in', { sound: 'click' }),
        text('Atajo: primero el precio de 1 kg (5,40 ÷ 3 = 1,80) y luego × 7.', 400, 600, 820, 50, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Tres clics: la proporción, el despeje y el resultado (con sonido de caja). Enseñar también el método de reducción a la unidad: suele entenderse mejor.' },
      { title: 'Rebajas: el porcentaje en la etiqueta', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 760, h: 360, fontSize: 26, fontFamily: C, header: true, headBg: INK, headFg: TAG, stroke: '#2b2b2b40', lines: true, colW: [4, 3, 3, 3],
          rows: [['Producto', 'Antes', 'Descuento', 'Ahora'], ['Zapatillas', '60 €', '25 %', '=B2*(1-C2)'], ['Mochila', '32 €', '15 %', '=B3*(1-C3)'], ['Sudadera', '28 €', '50 %', '=B4*(1-C4)'],
            ['<b>Total</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']] }),
        mathBlock({ x: 90, y: 565, w: 760, h: 80, fontSize: 34, color: INK, latex: '25\\%\\ \\text{de}\\ 60 = 0{,}25 \\cdot 60 = 15' }),
        after(shape('seal', 920, 200, 280, 280, RED, { rotation: 8 }), 'bounce', { sound: 'pop' }),
        along(text('<div style="font-size:24px;letter-spacing:3px">AHORRAS</div><div style="font-size:58px;font-weight:700;line-height:1.1">33,80 €</div>', 920, 280, 280, 120, { fontFamily: G, color: '#ffffff', textAlign: 'center', rotation: 8 }), 'bounce'),
        text('Precio final = precio × (1 − descuento)', 900, 520, 320, 90, { fontFamily: C, fontSize: 21, color: INK, textAlign: 'center' })],
        notes: 'La columna «Ahora» es =B2*(1-C2): los porcentajes se guardan como fracciones (25 % = 0,25). La fila Total suma con =SUMA(ARRIBA). 120 € − 86,20 € = 33,80 € de ahorro.' },
      { title: 'Proporcionalidad inversa', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 180, w: 680, h: 470, chartType: 'line', color: RED, grid: true, dataLabels: true, xTitle: 'pintores', yTitle: 'días',
          data: [1, 2, 3, 4, 5, 6].map(n => ({ label: String(n), value: +(12 / n).toFixed(1) })) }),
        text('Pintar el gimnasio', 820, 185, 380, 44, { fontSize: 28, color: INK, fontWeight: 700 }),
        text('1 pintor tarda 12 días; con más pintores, menos días.', 820, 235, 380, 90, { fontSize: 25, color: INK }),
        on(mathBlock({ x: 820, y: 350, w: 380, h: 150, fontSize: 32, color: TEAL, latex: '\\begin{aligned} 2 \\cdot 6 &= 12 \\\\ 3 \\cdot 4 &= 12 \\\\ 4 \\cdot 3 &= 12 \\end{aligned}' }), 'fade-up'),
        on(tag('pintores × días = <b>12</b> siempre', 820, 530, 380, 90, PAPER, { fontSize: 26 }), 'zoom-in')],
        notes: 'La gráfica no es una recta: es una curva que baja cada vez más despacio (una hipérbola). Pregunta trampa: ¿y con 1000 pintores? Ahí el modelo deja de tener sentido.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', question: 'Completa los huecos', fontSize: 38, x: 70, y: 50, w: 1140, h: 620,
        text: 'Si 4 cuadernos cuestan 6 €, 10 cuadernos cuestan [15] €. El 25 % de 80 es [20]. Si 3 grifos llenan un depósito en 8 horas, 6 grifos lo llenan en [4] horas. Una camiseta de 20 € rebajada un 10 % cuesta [18] €.' })],
        notes: 'Actividad «Completar huecos» desde el móvil, con nota. Mezcla directa, inversa y porcentajes a propósito: primero hay que decidir de qué tipo es cada una.' },
      { layout: 'blank', bg: BG, transition: 'cover', extra: [
        receipt(420, 40, 440, 640, 22),
        text('TICKET DE LA CLASE', 440, 85, 400, 40, { fontFamily: C, fontSize: 28, fontWeight: 700, color: INK, textAlign: 'center' }),
        shape('rect', 460, 140, 360, 2, INK, { dash: 'dash', opacity: 60 }),
        ...[['Directa', 'cociente constante'], ['Inversa', 'producto constante'], ['Regla de tres', 'proporción y despeje'], ['Porcentaje', 'precio × (1 − d)']].map(([a, b], i) =>
          withAnims(mono(`<b>✓ ${a}</b><br><span style="color:${DIM}">  ${b}</span>`, 470, 160 + i * 82, 350, 76, 22), A('fade-down', { start: i ? 'afterPrev' : 'click', sound: 'click', duration: 350 }))),
        shape('rect', 460, 500, 360, 2, INK, { dash: 'dash', opacity: 60 }),
        mono('GRACIAS POR SU VISITA', 440, 515, 400, 30, 20, INK, { textAlign: 'center', fontWeight: 700 }),
        img(BARS, 510, 560, 260, 70, 'Código de barras'),
        text('¿Dudas? Se aceptan devoluciones… de ejercicios.', 60, 300, 330, 120, { fontFamily: G, fontSize: 28, color: DIM, fontStyle: 'italic' }),
        tag('<div style="font-size:18px">Próxima clase</div><div style="font-size:34px;font-weight:700">Escalas y mapas</div>', 920, 290, 300, 120, TAG, { rotation: 3 })],
        notes: 'Resumen como un ticket: un clic y las cuatro líneas se «imprimen» una tras otra, cada una con su clic de caja registradora.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · School statistics in a squared notebook: graph paper with a red margin, post-its and
  // highlighter, the class's own data, a frequency table with formulas, bars, a doughnut, a histogram.
  edu_math_stats: { name: 'Estadística: media, mediana y moda', cat: 'edu', summary: 'Cuaderno cuadriculado: notas adhesivas en cascada, frecuencias con fórmulas, barras, dona con grados, histograma y votación en directo', make: () => {
    const BG = '#fbfdff', BLUE = '#1f4e9c', HL = '#fff176', PK = '#f48fb1', GRN = '#66bb6a', INK = '#263238', DIM = '#607d8b', H = FF.inter, HAND = FF.dancing;
    const PAPER = svgURL(1280, 720, Array.from({ length: 41 }, (_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32}" y2="720" stroke="#b9d4ee" stroke-width="1"/>`).join('')
      + Array.from({ length: 23 }, (_, i) => `<line x1="0" y1="${i * 32}" x2="1280" y2="${i * 32}" stroke="#b9d4ee" stroke-width="1"/>`).join('')
      + '<line x1="64" y1="0" x2="64" y2="720" stroke="#e57373" stroke-width="3"/>');
    const hl = (x, y, w, h, c = HL) => shape('rect', x, y, w, h, c, { opacity: 70, rotation: -1 });
    const postit = (html, x, y, s, c, rot, p = {}) => card(html, x, y, s, s, c, { radius: 4, color: INK, textAlign: 'center', vAlign: 'middle', rotation: rot, shadow: { x: 2, y: 6, blur: 10, color: '#00000030' }, pad: [8, 8, 8, 8], ...p });
    const hours = [8, 7, 9, 8, 6, 8, 10, 7, 8, 9, 7, 8, 6, 9, 8, 7, 8, 10, 9, 7, 8, 6, 9, 7, 8];
    const heights = [142, 151, 148, 155, 139, 160, 147, 152, 149, 144, 158, 153, 150, 146, 162, 151, 143, 155, 149, 157, 141, 154, 148, 152, 165];
    const COLS = ['#ffe873', '#ffb3c7', '#b5e8ff', '#c8f7c5'];
    return numbered(build({ name: 'Estadística: media, mediana y moda', palette: 'office', fonts: 'clean', title: { color: BLUE, size: 50 }, body: { color: INK },
      decor: () => [img(PAPER, 0, 0, 1280, 720, 'Hoja cuadriculada', { fit: 'fill' })] }, [
      { layout: 'blank', bg: BG, extra: [
        text('MATEMÁTICAS · 6.º DE PRIMARIA', 110, 150, 600, 40, { fontSize: 22, color: DIM, letterSpacing: 4, fontWeight: 700 }),
        text('Estadística<br>de la clase', 104, 190, 640, 220, { fontFamily: H, fontSize: 96, fontWeight: 800, color: BLUE, lineHeight: 1.02 }),
        hl(108, 440, 470, 50),
        text('media, mediana y moda', 112, 438, 520, 56, { fontFamily: HAND, fontSize: 44, color: INK }),
        text('Con los datos de nuestra propia clase', 110, 520, 560, 50, { fontSize: 28, color: DIM }),
        ...[['x̄', 'media', COLS[0], -6, 790, 140], ['Me', 'mediana', COLS[1], 5, 980, 230], ['Mo', 'moda', COLS[2], -3, 820, 380]].map(([s, l, c, r, x, y], i) =>
          withAnims(postit(`<div style="font-size:84px;font-weight:800;line-height:1">${s}</div><div style="font-family:${HAND};font-size:34px">${l}</div>`, x, y, 200, c, r), A('bounce', { start: i ? 'afterPrev' : 'afterPrev', sound: 'pop', duration: 500 })))],
        notes: 'Tres notas adhesivas caen una tras otra con un «pop». Hoy usaremos datos de la clase: cuántas horas dormimos.' },
      { title: '¿Cuántas horas dormís?', layout: 'titleOnly', bg: BG, extra: [
        ...hours.map((h, i) => withAnims(postit(`<b style="font-size:32px">${h}</b>`, 100 + (i % 5) * 88, 185 + Math.floor(i / 5) * 88, 74, COLS[h % 4], ((i * 37) % 9) - 4),
          A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 70, duration: 300 }))),
        text('25 respuestas (datos inventados)', 100, 635, 440, 36, { fontSize: 20, color: DIM, fontStyle: 'italic' }),
        tableBlock({ x: 600, y: 185, w: 590, h: 380, fontSize: 26, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#b9d4ee', banded: true, band: '#b5e8ff', colW: [2, 2, 3],
          rows: [['Horas', 'Alumnos', 'Horas × alumnos'], ['6', '3', '=A2*B2'], ['7', '6', '=A3*B3'], ['8', '9', '=A4*B4'], ['9', '5', '=A5*B5'], ['10', '2', '=A6*B6'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
        text('La tabla de frecuencias resume los 25 datos en 5 filas.', 600, 585, 590, 60, { fontSize: 22, color: DIM })],
        notes: 'Las 25 notas aparecen en cascada al llegar. La tabla calcula sola: cada fila multiplica (=A2*B2) y la última suma (=SUMA(ARRIBA)): 25 alumnos y 197 horas en total.' },
      { title: 'Tres maneras de resumir', layout: 'titleOnly', bg: BG, extra: [
        ...[['MEDIA', 'Repartir a partes iguales', '\\bar{x} = \\dfrac{197}{25} = 7{,}88\\ \\text{h}', BLUE, '#b5e8ff'], ['MEDIANA', 'El dato del medio, ordenados', '\\text{dato } 13.^{\\text{o}} \\rightarrow 8\\ \\text{h}', '#c2185b', '#ffb3c7'], ['MODA', 'El dato que más se repite', '8\\ \\text{h}\\ (9\\ \\text{alumnos})', '#2e7d32', '#c8f7c5']]
          .flatMap(([t, d, f, c, band], i) => { const x = 90 + i * 375;
            return [on(shape('rect', x, 185, 350, 380, '#ffffff', { shadow: { x: 0, y: 6, blur: 14, color: '#00000022' } }), 'fade-up'),
              along(shape('rect', x, 185, 350, 18, band), 'fade-up'),
              along(text(t, x + 24, 230, 300, 50, { fontSize: 34, fontWeight: 800, color: c, letterSpacing: 3 }), 'fade-up'),
              along(text(d, x + 24, 290, 300, 80, { fontFamily: HAND, fontSize: 34, color: INK }), 'fade-up'),
              along(mathBlock({ x: x + 14, y: 410, w: 322, h: 110, fontSize: 30, color: INK, latex: f }), 'fade-up')]; }),
        text('Las tres resumen los mismos 25 datos con un solo número.', 90, 600, 1100, 44, { fontSize: 24, color: DIM, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Un clic por tarjeta. La media puede no ser un dato real (nadie duerme 7,88 h exactas). La mediana: con 25 datos ordenados, el del medio es el 13.º.' },
      { title: 'La moda se ve a simple vista', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 200, w: 700, h: 440, chartType: 'bar', color: BLUE, dataLabels: true, grid: true, xTitle: 'horas de sueño', yTitle: 'alumnos',
          data: [6, 7, 8, 9, 10].map((h, i) => ({ label: h + ' h', value: [3, 6, 9, 5, 2][i] })) }),
        after(postit(`<div style="font-family:${HAND};font-size:36px">¡la moda!</div><div style="font-size:22px">la barra más alta</div>`, 860, 210, 220, COLS[0], 4), 'bounce', { sound: 'pop' }),
        text('En un diagrama de barras, la moda es la categoría con la barra más alta: <b>8 horas</b>.', 860, 470, 340, 150, { fontSize: 26, color: INK })],
        notes: 'Diagrama de barras con etiquetas y cuadrícula. Preguntar: ¿se puede ver la media en esta gráfica? (No directamente; la moda sí).' },
      { title: '¿Cómo venimos al colegio?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 70, y: 180, w: 560, h: 380, chartType: 'doughnut',
          data: [['Andando', 11, '#66bb6a'], ['Autobús', 7, '#42a5f5'], ['Coche', 5, '#ef5350'], ['Bici', 2, '#ffca28']].map(([label, value, color]) => ({ label, value, color })) }),
        tableBlock({ x: 680, y: 190, w: 510, h: 300, fontSize: 24, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#b9d4ee', colW: [3, 2, 3],
          rows: [['Medio', 'Alumnos', 'Grados'], ['Andando', '11', '=B2/25*360'], ['Autobús', '7', '=B3/25*360'], ['Coche', '5', '=B4/25*360'], ['Bici', '2', '=B5/25*360']] }),
        hl(680, 520, 510, 44, '#c8f7c5'),
        text('Cada alumno vale 360° ÷ 25 = 14,4°', 690, 520, 500, 44, { fontSize: 26, color: INK, vAlign: 'middle' }),
        text('Datos inventados para el ejemplo', 70, 600, 560, 36, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Gráfico de dona con un color por medio de transporte y su porcentaje. La tabla calcula los grados de cada sector (=B2/25*360) para dibujarlo con transportador en el cuaderno.' },
      { title: 'Medidas con decimales: el histograma', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 180, w: 720, h: 460, chartType: 'histogram', color: '#7e57c2', dataLabels: true, xTitle: 'altura (cm)', yTitle: 'alumnos', data: heights.map(v => ({ label: '', value: v })) }),
        text('Las alturas casi nunca se repiten: se agrupan en <b>intervalos</b> y se cuentan.', 860, 200, 340, 160, { fontSize: 28, color: INK }),
        postit(`<div style="font-size:22px">Las barras van <b>pegadas</b>: los intervalos son continuos</div>`, 900, 400, 240, COLS[1], -3)],
        notes: 'El histograma agrupa las 25 alturas (inventadas) en intervalos de 5 cm, solo. Diferencia con el diagrama de barras: aquí la variable es continua y las barras se tocan.' },
      { title: 'Cuando la media engaña', layout: 'titleOnly', bg: BG, extra: [
        text('Paga semanal de siete amigos (en euros):', 90, 180, 900, 50, { fontSize: 28, color: INK }),
        shape('rect', 110, 380, 1060, 4, INK),
        ...[0, 10, 20, 30, 40, 50, 60].map(v => text(String(v), 110 + v * 17.5 - 30, 395, 60, 36, { fontSize: 22, color: DIM, textAlign: 'center' })),
        ...[[5, 0], [5, 1], [6, 0], [7, 0], [8, 0], [9, 0]].map(([v, k]) => shape('ellipse', 110 + v * 17.5 - 16, 344 - k * 34, 32, 32, BLUE)),
        on(shape('ellipse', 110 + 60 * 17.5 - 16, 344, 32, 32, '#e53935'), 'bounce', { sound: 'pop' }),
        along(text('¡60 €!', 1080, 290, 120, 40, { fontSize: 26, color: '#e53935', fontWeight: 700, textAlign: 'center' }), 'fade-in'),
        on(mathBlock({ x: 90, y: 460, w: 520, h: 90, fontSize: 36, color: INK, latex: '\\bar{x} = \\dfrac{100}{7} \\approx 14{,}3\\ \\text{€}' }), 'fade-up'),
        on(mathBlock({ x: 660, y: 460, w: 520, h: 90, fontSize: 36, color: '#2e7d32', latex: '\\text{Me} = 7\\ \\text{€}' }), 'fade-up'),
        text('Un solo dato extremo dispara la media; la mediana ni se inmuta.', 90, 590, 1100, 50, { fontSize: 28, color: INK, textAlign: 'center', fontWeight: 600 })],
        notes: 'Seis amigos con pagas parecidas y uno con 60 € (el punto rojo cae con un clic). La media dice 14,3 €, pero nadie del grupo recibe algo parecido. Para datos con extremos, mejor la mediana.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 38, question: '¿Cuántas horas dormiste anoche?', options: ['6 o menos', '7', '8', '9 o más'], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación en directo con el móvil: los datos de la clase de hoy. Con los resultados en pantalla, calculad la moda y la mediana.' },
      { layout: 'blank', bg: BG, transition: 'page', extra: [
        text('Tu turno', 110, 120, 600, 110, { fontFamily: HAND, fontSize: 96, color: BLUE }),
        hl(110, 250, 560, 46),
        text('Con los datos de la votación:', 116, 248, 560, 50, { fontSize: 30, color: INK, fontWeight: 600 }),
        text(ul('Haz la tabla de frecuencias', 'Calcula la media, la mediana y la moda', 'Dibuja el diagrama de barras', '¿Qué medida describe mejor a la clase?'), 110, 320, 640, 300, { fontSize: 30, color: INK }),
        timer(600, 840, 180, 340, { color: BLUE, endText: '¡Lápices arriba!' }),
        postit('<div style="font-family:' + HAND + ';font-size:30px">Trabajo en parejas</div>', 900, 540, 220, COLS[3], 3, { h: 110 })],
        notes: 'Cuenta atrás de 10 minutos. Cerrar comparando las tres medidas con los datos reales de la votación.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · Integers from the sea bed to the summit: sky, mountain and sea split by the zero,
  // a number line with opposites jumping, a thermometer chart, a submarine that rises and dives.
  edu_math_integers: { name: 'Números enteros: mar y montaña', cat: 'edu', summary: 'Del fondo del mar a la cumbre: recta con saltos, Text Art hielo, temperaturas bajo cero, submarino que sube y baja, ordenar y concurso', make: () => {
    const SKY = '#cfe8fb', SKY2 = '#8ecae6', SEA = '#1d7fb0', DEEP = '#04203a', NAVY = '#0b2545', W = '#ffffff', ICE = '#8ecae6', RED = '#ef476f', BLU = '#3a86ff', SAND = '#ffd166', H = pairStacks('modern').heading;
    const SUB = svgURL(220, 110, '<rect x="96" y="18" width="46" height="30" rx="8" fill="#ffb703"/><rect x="114" y="2" width="6" height="20" fill="#fb8500"/><rect x="114" y="2" width="20" height="6" fill="#fb8500"/>'
      + '<ellipse cx="110" cy="66" rx="92" ry="34" fill="#ffb703"/><circle cx="70" cy="64" r="11" fill="#cfe8fb" stroke="#fb8500" stroke-width="4"/><circle cx="108" cy="64" r="11" fill="#cfe8fb" stroke="#fb8500" stroke-width="4"/>'
      + '<circle cx="146" cy="64" r="11" fill="#cfe8fb" stroke="#fb8500" stroke-width="4"/><path d="M18 66 L2 48 L2 84Z" fill="#fb8500"/>');
    const BACK = svgURL(1280, 720, '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8fb"/><stop offset="1" stop-color="#8ecae6"/></linearGradient>'
      + '<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d7fb0"/><stop offset="1" stop-color="#04203a"/></linearGradient></defs><rect width="1280" height="380" fill="url(#s)"/><rect y="380" width="1280" height="340" fill="url(#d)"/>');
    const scene = () => [img(BACK, 0, 0, 1280, 720, 'Cielo y mar', { fit: 'fill' }),
      poly([[0, 100], [38, 8], [52, 30], [64, 0], [100, 100]], 640, 120, 600, 262, '#5c677d'), poly([[0, 100], [44, 0], [100, 100]], 870, 120, 140, 70, W, { opacity: 90 }),
      shape('rect', -30, 378, 1340, 4, W, { opacity: 80 })];
    const tick = (v, x, y, c) => text((v > 0 ? '+' : '') + v, x - 30, y, 60, 36, { fontSize: 22, color: c, textAlign: 'center', fontWeight: 700 });
    return numbered(build({ name: 'Números enteros: mar y montaña', palette: 'violet', fonts: 'modern', title: { color: W, size: 50 }, body: { color: W } }, [
      { layout: 'blank', bg: NAVY, extra: [...scene(),
        text('MATEMÁTICAS · 1.º DE ESO', 80, 70, 600, 40, { fontSize: 22, letterSpacing: 5, color: NAVY, fontWeight: 700 }),
        text('Números enteros', 74, 110, 640, 200, { fontFamily: H, fontSize: 92, fontWeight: 800, color: NAVY, lineHeight: 1 }),
        text('+3 000 m', 900, 70, 140, 40, { fontSize: 24, color: NAVY, fontWeight: 700 }),
        text('0 m · nivel del mar', 80, 330, 400, 40, { fontSize: 24, color: NAVY, fontWeight: 700 }),
        text('Por encima y por debajo del cero', 80, 430, 640, 60, { fontSize: 38, color: W }),
        withAnims(img(SUB, 860, 520, 220, 110, 'Submarino amarillo'), A('fade-left', { start: 'afterPrev', duration: 900 }), path([[-40, -14], [-80, 0], [-120, -10]], { start: 'afterPrev', duration: 2600 })),
        text('−200 m', 1110, 560, 120, 40, { fontSize: 24, color: SAND, fontWeight: 700 })],
        notes: 'Portada en dos mundos: por encima del nivel del mar, positivos; por debajo, negativos. El submarino entra y patrulla solo.' },
      { title: 'Los enteros están por todas partes', layout: 'titleOnly', bg: NAVY, extra: [
        ...[['−5 °C', 'Una mañana de enero en la sierra', ICE], ['−2', 'La segunda planta del garaje', '#bdb2ff'], ['−20 €', 'Gastar más de lo que tienes', RED], ['+2 500 m', 'La altura de un pico', '#80ed99']].map(([n, t, c], i) =>
          withAnims(card(`<div style="font-family:${H};font-size:${n.length > 6 ? 44 : 54}px;font-weight:800;color:${c};line-height:1.1;white-space:nowrap">${n}</div><div style="margin-top:14px">${t}</div>`, 90 + i * 280, 240, 260, 230, '#ffffff10', { color: W, fontSize: 24, borderColor: c + '80' }),
            A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 }))),
        text('Los <b>enteros</b> son los naturales, sus opuestos y el cero:  … −3, −2, −1, 0, +1, +2, +3 …', 90, 590, 1100, 50, { fontSize: 26, color: ICE, textAlign: 'center' })],
        notes: 'Cuatro tarjetas en cadena tras un clic. Pedir más ejemplos: goles a favor y en contra, años antes de Cristo, pisos del ascensor.' },
      { title: 'La recta numérica', layout: 'titleOnly', bg: NAVY, extra: [
        shape('doublearrow', 70, 330, 1140, 30, W, { stroke: W, strokeWidth: 3 }),
        ...Array.from({ length: 13 }, (_, k) => k - 6).flatMap(v => [shape('rect', 640 + v * 85 - 1.5, 334, 3, 22, W), tick(v, 640 + v * 85, 370, v < 0 ? RED : v > 0 ? BLU : W)]),
        on(shape('ellipse', 640 - 4 * 85 - 16, 329, 32, 32, RED), 'zoom-in', { sound: 'pop' }), along(shape('ellipse', 640 + 4 * 85 - 16, 329, 32, 32, BLU), 'zoom-in'),
        on(shape('curve', 640 - 4 * 85, 230, 340, 100, 'none', { stroke: RED, strokeWidth: 4, dash: 'dash' }), 'draw', { duration: 900 }),
        along(shape('curve', 640, 230, 340, 100, 'none', { stroke: BLU, strokeWidth: 4, dash: 'dash' }), 'draw', { duration: 900 }),
        along(text('4 pasos', 400, 190, 140, 40, { fontSize: 24, color: RED, textAlign: 'center' }), 'fade-in'), along(text('4 pasos', 740, 190, 140, 40, { fontSize: 24, color: BLU, textAlign: 'center' }), 'fade-in'),
        on(mathBlock({ x: 90, y: 450, w: 540, h: 90, fontSize: 40, color: W, latex: '|-4| = |+4| = 4' }), 'fade-up'),
        on(text('−4 y +4 son <b>opuestos</b>: a la misma distancia del cero, en lados distintos.', 680, 450, 520, 100, { fontSize: 26, color: W }), 'fade-up'),
        text('Más a la izquierda, más pequeño:  −5 < −2 < 0 < 3', 90, 590, 1100, 50, { fontSize: 28, color: SAND, textAlign: 'center', fontWeight: 700 })],
        notes: 'Clic 1: aparecen −4 y +4. Clic 2: los dos arcos se dibujan hasta el cero (el valor absoluto es la distancia). Error típico: pensar que −5 es mayor que −2 «porque 5 es mayor que 2».' },
      { title: 'Una semana bajo cero', layout: 'titleOnly', bg: '#0e2a47', extra: [
        chartBlock({ x: 80, y: 180, w: 720, h: 470, chartType: 'bar', color: ICE, grid: true, dataLabels: true, yTitle: '°C', seriesName: 'Mínima',
          data: ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => ({ label: d, value: [-6, -3, 0, 2, -1, -4, 1][i] })) }),
        text('−6 °C', 840, 200, 380, 150, { fontFamily: H, fontSize: 110, fontWeight: 800, wordart: 'ice', textAlign: 'center' }),
        text('la mínima del lunes', 840, 350, 380, 40, { fontSize: 24, color: ICE, textAlign: 'center' }),
        on(card('Del lunes (−6) al jueves (+2) la temperatura <b>subió 8 grados</b>: 2 − (−6) = 8', 840, 430, 380, 180, '#ffffff12', { color: W, fontSize: 24 }), 'fade-up')],
        notes: 'Las barras crecen hacia abajo desde el cero (mínimas de una semana de invierno inventadas). El −6 °C está en Text Art «hielo».' },
      { title: 'El submarino: sumar y restar', layout: 'titleOnly', bg: DEEP, back: [shape('rect', -40, -10, 1360, 210, '#0d3b66', { fill2: DEEP, gradAngle: 180 })], extra: [
        ...[0, -10, -20, -30, -40].map(v => [shape('rect', 120, 200 - v * 9, 1040, 2, W, { opacity: v ? 25 : 80 }), text(v + ' m', 40, 186 - v * 9, 76, 30, { fontSize: 20, color: v ? ICE : W, textAlign: 'right' })]).flat(),
        withAnims(img(SUB, 230, 425, 200, 100, 'Submarino'), path([[0, -40], [0, -108]], { duration: 1600 }), path([[60, 60], [120, 117]], { start: 'click', duration: 2000 })),
        mathBlock({ x: 640, y: 230, w: 540, h: 70, fontSize: 34, color: W, latex: '\\text{Empieza a } -30\\ \\text{m}' }),
        withAnims(mathBlock({ x: 640, y: 320, w: 540, h: 70, fontSize: 34, color: SAND, latex: '-30 + 12 = -18' }), A('fade-left', { start: 'withPrev', delay: 0 })),
        withAnims(mathBlock({ x: 640, y: 410, w: 540, h: 70, fontSize: 34, color: RED, latex: '-18 - 25 = -43' }), A('fade-left', { start: 'click' })),
        text('Subir es sumar; bajar es restar.', 640, 520, 540, 50, { fontSize: 26, color: ICE, textAlign: 'center' })],
        notes: 'Clic 1: el submarino sube 12 m (de −30 a −18) y aparece la suma. Clic 2: baja 25 m hasta −43, con la resta. Cada raya del fondo son 10 metros.' },
      { title: 'La regla de los signos', layout: 'titleOnly', bg: NAVY, extra: [
        tableBlock({ x: 90, y: 190, w: 420, h: 360, fontSize: 56, header: true, firstCol: true, headBg: '#1b3a63', headFg: SAND, stroke: '#ffffff50',
          rows: [['×', '+', '−'], ['+', `<span style="color:${BLU}">+</span>`, `<span style="color:${RED}">−</span>`], ['−', `<span style="color:${RED}">−</span>`, `<span style="color:${BLU}">+</span>`]] }),
        on(mathBlock({ x: 580, y: 190, w: 600, h: 80, fontSize: 40, color: W, latex: '(-3) \\cdot (-4) = +12' }), 'fade-left'),
        on(mathBlock({ x: 580, y: 290, w: 600, h: 80, fontSize: 40, color: W, latex: '(-2) \\cdot (+5) = -10' }), 'fade-left'),
        on(mathBlock({ x: 580, y: 390, w: 600, h: 80, fontSize: 40, color: W, latex: '(-20) : (-4) = +5' }), 'fade-left'),
        text('Signos iguales, resultado positivo; signos distintos, negativo. Vale también para dividir.', 580, 500, 600, 100, { fontSize: 25, color: ICE })],
        notes: 'La tabla resume la regla. Truco de clase: «el amigo de mi amigo es mi amigo; el enemigo de mi enemigo, también».' },
      { layout: 'blank', bg: NAVY, extra: [pollBlock({ kind: 'order', fontSize: 40, question: 'Ordena de menor a mayor', options: ['−8', '−3', '0', '+2', '+7'], x: 90, y: 60, w: 1100, h: 600 })],
        notes: 'Actividad «Ordenar» desde el móvil: cada alumno recibe los números desordenados y la corrección es automática.' },
      { layout: 'blank', bg: NAVY, extra: [quiz('A las 7:00 había −5 °C y a las 15:00, 7 °C. ¿Cuántos grados subió?', ['2 °C', '12 °C', '−12 °C', '7 °C'], 1)],
        notes: 'Concurso con puntos por rapidez. 7 − (−5) = 12. Quien responde 2 ha restado 7 − 5 sin tener en cuenta el signo.' },
      { layout: 'blank', bg: NAVY, transition: 'zoom', extra: [...scene(),
        text('De la cumbre más alta…', 70, 60, 560, 50, { fontSize: 30, color: NAVY, fontWeight: 700 }),
        text('+8 849 m', 70, 110, 560, 110, { fontFamily: H, fontSize: 88, fontWeight: 800, color: NAVY }),
        text('…a la fosa más profunda', 70, 420, 560, 50, { fontSize: 30, color: W, fontWeight: 700 }),
        text('−10 935 m', 70, 470, 600, 110, { fontFamily: H, fontSize: 88, fontWeight: 800, color: SAND }),
        on(mathBlock({ x: 660, y: 470, w: 560, h: 90, fontSize: 34, color: W, latex: '8849 - (-10\\,935) = 19\\,784\\ \\text{m}' }), 'zoom-in', { sound: 'drumroll' }),
        text('casi 20 km de diferencia', 660, 570, 560, 40, { fontSize: 24, color: ICE, textAlign: 'center' })],
        notes: 'Cierre: la altura aproximada del Everest y la profundidad aproximada de la fosa de las Marianas (las medidas varían según la fuente). Un clic: la resta con redoble.' },
    ]));
  } },
  // ---------------------------------------------------------------------------------------
  // 7 · Sequences and patterns in nature, as an old botanical book: cream paper, gold and green,
  // Fibonacci squares with their spiral drawn, pebbles, matchsticks, code, the golden ratio, a sunflower.
  edu_math_sequences: { name: 'Sucesiones y patrones', cat: 'edu', summary: 'Libro de botánica: espiral de Fibonacci que se traza sola, piedras en cadena, palillos con fórmulas, código, planta 3D y número de oro', make: () => {
    const BG = '#f6f0e1', GOLD = '#b8892b', GREEN = '#4f6f3a', INK = '#2f2a22', TERRA = '#b5563a', DIM = '#7a6e5a', HD = FF.playfair, IT = FF.cormorant;
    // The Fibonacci squares (units; y down) and the spiral through them: quarter arcs that join smoothly.
    const SQ = [[0, 0, 1], [1, 0, 1], [0, -2, 2], [-3, -2, 3], [-3, 1, 5], [2, -2, 8], [-3, -15, 13]], U = 22, OX = 880 + 3 * U, OY = 140 + 15 * U;
    const corners = ([x, y, s]) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]], same = (a, b) => a[0] === b[0] && a[1] === b[1];
    const spiral = (() => { for (let st = 0; st < 4; st++) for (const sg of [1, -1]) {
      let pin = corners(SQ[0])[st], arcs = [], ok = true;
      for (let k = 0; k < SQ.length && ok; k++) { const cs = corners(SQ[k]), i = cs.findIndex(c => same(c, pin)); if (i < 0) { ok = false; break; }
        const pout = cs[(i + 2) % 4], c = [cs[(i + 1) % 4], cs[(i + 3) % 4]].find(q => Math.sign((pin[0] - q[0]) * (pout[1] - q[1]) - (pin[1] - q[1]) * (pout[0] - q[0])) === sg);
        if (k + 1 < SQ.length && !corners(SQ[k + 1]).some(q => same(q, pout))) ok = false;
        if (arcs.length) { const pc = arcs.at(-1).c, d1 = [pin[0] - pc[0], pin[1] - pc[1]], d2 = [pin[0] - c[0], pin[1] - c[1]]; if (d1[0] * d2[1] - d1[1] * d2[0] !== 0 || d1[0] * d2[0] + d1[1] * d2[1] <= 0) ok = false; }
        arcs.push({ c, pin, pout }); pin = pout; }
      if (ok) return arcs.flatMap(({ c, pin, pout }) => { const a0 = Math.atan2(pin[1] - c[1], pin[0] - c[0]); let a1 = Math.atan2(pout[1] - c[1], pout[0] - c[0]), r = Math.hypot(pin[0] - c[0], pin[1] - c[1]);
        while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; while (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
        return Array.from({ length: 10 }, (_, j) => { const a = a0 + (a1 - a0) * j / 9; return [OX + (c[0] + r * Math.cos(a)) * U, OY + (c[1] + r * Math.sin(a)) * U]; }); });
    } return []; })();
    // A sunflower head: seeds every 137.5° (the golden angle).
    const SUN = svgURL(400, 400, '<circle cx="200" cy="200" r="196" fill="#e9b949"/><circle cx="200" cy="200" r="150" fill="#5b3a1a"/>'
      + Array.from({ length: 330 }, (_, i) => { const r = 8.1 * Math.sqrt(i + 1), a = (i + 1) * 137.508 * Math.PI / 180;
        return `<circle cx="${(200 + r * Math.cos(a)).toFixed(1)}" cy="${(200 + r * Math.sin(a)).toFixed(1)}" r="${(2.2 + i / 140).toFixed(1)}" fill="${i % 3 ? '#c98a2e' : '#f2c46d'}"/>`; }).join(''));
    const stick = (x, y, vertical) => shape('rounded', x, y, vertical ? 9 : 70, vertical ? 70 : 9, '#d9b26f', { stroke: '#a67c3d', strokeWidth: 1 });
    const fig = (k, ox, oy) => [...Array.from({ length: k }, (_, i) => [stick(ox + i * 70, oy, false), stick(ox + i * 70, oy + 66, false)]).flat(),
      ...Array.from({ length: k + 1 }, (_, i) => stick(ox + i * 70 - 3, oy + 2, true))];
    const leaf = (x, y, s, rot, c = GREEN) => shape('teardrop', x, y, s * 0.6, s, c, { rotation: rot, opacity: 75 });
    return numbered(build({ name: 'Sucesiones y patrones', palette: 'paper', fonts: 'classic', title: { color: GREEN, size: 52, font: HD }, body: { color: INK },
      decor: () => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: GOLD, strokeWidth: 1.5, opacity: 70 })] }, [
      { layout: 'blank', bg: BG, extra: [
        text('MATEMÁTICAS · 3.º DE ESO', 90, 170, 600, 40, { fontSize: 22, letterSpacing: 5, color: GOLD, fontWeight: 700 }),
        text('Sucesiones', 84, 210, 700, 140, { fontFamily: HD, fontSize: 110, fontStyle: 'italic', color: INK }),
        text('Patrones que se repiten… y se pueden predecir', 90, 360, 640, 100, { fontFamily: IT, fontSize: 42, fontStyle: 'italic', color: GREEN }),
        text('1 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · …', 90, 500, 640, 50, { fontSize: 30, color: TERRA, letterSpacing: 2 }),
        ...SQ.map(([x, y, s], i) => withAnims(poly([[0, 0], [100, 0], [100, 100], [0, 100]], OX + x * U, OY + y * U, s * U, s * U, i % 2 ? '#b8892b14' : '#4f6f3a12', { stroke: GOLD, strokeWidth: 1.5 }),
          A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 180, duration: 350 }))),
        ...SQ.slice(3).map(([x, y, s]) => text(String(s), OX + x * U, OY + y * U + s * U / 2 - 28, s * U, 56, { fontFamily: HD, fontSize: Math.min(40, 10 + s * 3), color: DIM, textAlign: 'center' })),
        after(ink(spiral, TERRA, 4), 'draw', { duration: 2400 })],
        notes: 'Los cuadrados de Fibonacci aparecen solos (sus lados son 1, 1, 2, 3, 5, 8 y 13) y después la espiral se traza a través de ellos, cuarto de círculo a cuarto de círculo.' },
      { title: '¿Qué número viene después?', layout: 'titleOnly', bg: BG, extra: [
        ...[3, 7, 11, 15, 19].map((n, i) => withAnims(card(`<b>${n}</b>`, 100 + i * 190, 230, 140, 140, ['#e7dcc2', '#dfe6d3', '#efd9cf'][i % 3], { radius: 70, fontFamily: HD, fontSize: 52, textAlign: 'center', vAlign: 'middle', color: INK, borderColor: GOLD }),
          A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 350 }))),
        ...[0, 1, 2, 3].map(i => withAnims(text('+4', 225 + i * 190, 180, 80, 40, { fontSize: 26, color: TERRA, textAlign: 'center', fontWeight: 700 }), A('fade-down', { start: i ? 'withPrev' : 'click', delay: i * 150 }))),
        on(card('<b>?</b>', 1050, 230, 140, 140, GOLD, { radius: 70, fontFamily: HD, fontSize: 60, textAlign: 'center', vAlign: 'middle', color: '#ffffff' }), 'bounce', { sound: 'pop' }),
        on(mathBlock({ x: 100, y: 430, w: 520, h: 100, fontSize: 48, color: GREEN, latex: 'a_n = 4n - 1' }), 'fade-up'),
        on(text('El <b>término general</b> da cualquier término sin calcular los anteriores: <i>a</i><sub>100</sub> = 4·100 − 1 = 399.', 660, 420, 520, 140, { fontSize: 28, color: INK }), 'fade-up')],
        notes: 'Un clic: las piedras aparecen en cadena. Otro: las diferencias (+4). Otro: la interrogación rebota; que la clase diga 23. Luego el término general.' },
      { title: 'Sumar o multiplicar', layout: 'titleOnly', bg: BG, extra: [
        text('ARITMÉTICA · se suma siempre lo mismo', 90, 170, 520, 40, { fontSize: 22, letterSpacing: 2, color: GREEN, fontWeight: 700 }),
        chartBlock({ x: 90, y: 215, w: 520, h: 300, chartType: 'bar', color: GREEN, dataLabels: true, data: [2, 5, 8, 11, 14, 17].map((v, i) => ({ label: 'a' + (i + 1), value: v })) }),
        mathBlock({ x: 90, y: 535, w: 520, h: 80, fontSize: 32, color: GREEN, latex: 'a_n = a_1 + (n-1)\\,d \\qquad d = 3' }),
        text('GEOMÉTRICA · se multiplica por lo mismo', 670, 170, 540, 40, { fontSize: 22, letterSpacing: 2, color: TERRA, fontWeight: 700 }),
        chartBlock({ x: 670, y: 215, w: 520, h: 300, chartType: 'bar', color: TERRA, dataLabels: true, data: [1, 2, 4, 8, 16, 32].map((v, i) => ({ label: 'a' + (i + 1), value: v })) }),
        mathBlock({ x: 670, y: 535, w: 520, h: 80, fontSize: 32, color: TERRA, latex: 'a_n = a_1 \\cdot r^{\\,n-1} \\qquad r = 2' }),
        shape('rect', 639, 180, 2, 440, GOLD, { opacity: 60 })],
        notes: 'Izquierda: crece en escalera, siempre 3 más. Derecha: empieza despacio y se dispara, cada vez el doble. Pregunta: si doblas un papel 10 veces, ¿cuántas capas? (1024).' },
      { title: 'Cuadrados de palillos', layout: 'titleOnly', bg: BG, extra: [
        ...[[1, 140, 4], [2, 360, 7], [3, 640, 10]].flatMap(([k, ox, n]) => [on(text(`n = ${k} · ${n} palillos`, ox + k * 35 - 120, 275, 240, 36, { fontSize: 22, color: DIM, textAlign: 'center' }), 'fade-in'),
          ...fig(k, ox, 185).map(b => along(b, 'fade-in'))]),
        text('…', 930, 190, 120, 60, { fontSize: 56, color: GOLD }),
        tableBlock({ x: 90, y: 345, w: 560, h: 300, fontSize: 26, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#cdbf9f', banded: true, band: GOLD, colW: [2, 3],
          rows: [['Cuadrados (n)', 'Palillos'], ['1', '=3*A2+1'], ['2', '=3*A3+1'], ['3', '=3*A4+1'], ['10', '=3*A5+1'], ['100', '=3*A6+1']] }),
        mathBlock({ x: 710, y: 360, w: 480, h: 100, fontSize: 50, color: TERRA, latex: 'p_n = 3n + 1' }),
        text('Cada cuadrado nuevo añade 3 palillos al primero, que lleva 4. La tabla usa la fórmula: cambia <i>n</i> y se recalcula.', 710, 480, 480, 150, { fontSize: 26, color: INK })],
        notes: 'Tres clics: aparecen las figuras 1, 2 y 3. La tabla calcula los palillos con =3*A2+1: con 100 cuadrados hacen falta 301. Que lo comprueben con palillos de verdad.' },
      { title: 'Fibonacci en el código… y en las plantas', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 90, y: 180, w: 640, h: 300, fontSize: 24, lang: 'python', lineSteps: '1|2-3|4|6',
          code: 'a, b = 1, 1\nfor n in range(10):\n    print(a, end=" ")\n    a, b = b, a + b\n\n# 1 1 2 3 5 8 13 21 34 55' }),
        text('Cada término es la suma de los dos anteriores. Las hojas de muchas plantas giran según esta sucesión para no taparse el sol.', 90, 500, 640, 130, { fontSize: 26, color: INK }),
        model('kh-DiffuseTransmissionPlant', 770, 160, 420, 450, { caption: '', autoRotate: true, view: 'three', motion: 'swing' }),
        credits(['kh-DiffuseTransmissionPlant'], 770, 620, 420, DIM)],
        notes: 'Código con pasos de resaltado: los valores iniciales, el bucle, la línea que hace la magia (a, b = b, a + b) y la salida. La planta 3D gira despacio.' },
      { title: 'El número de oro', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 180, w: 640, h: 450, chartType: 'line', color: TERRA, grid: true, seriesName: 'Cociente de dos términos seguidos',
          data: ['1/1', '2/1', '3/2', '5/3', '8/5', '13/8', '21/13', '34/21', '55/34'].map(l => { const [a, b] = l.split('/'); return { label: l, value: +(a / b).toFixed(3) }; }),
          series: [{ name: 'φ', values: Array(9).fill(1.618), color: GOLD }] }),
        text('φ ≈ 1,618', 760, 180, 440, 130, { fontFamily: HD, fontSize: 96, wordart: 'gold', textAlign: 'center' }),
        on(mathBlock({ x: 760, y: 320, w: 440, h: 100, fontSize: 40, color: INK, latex: '\\varphi = \\dfrac{1 + \\sqrt{5}}{2}' }), 'fade-in'),
        on(img(SUN, 880, 440, 200, 200, 'Cabeza de girasol con semillas en espiral'), 'zoom-in', { duration: 900 })],
        notes: 'Si divides cada término de Fibonacci entre el anterior, el cociente oscila y se acerca a φ. En el girasol, cada semilla gira 137,5° respecto a la anterior (el ángulo de oro): por eso salen espirales.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', question: 'Completa las sucesiones', fontSize: 40, x: 80, y: 60, w: 1120, h: 600,
        text: '3, 6, 12, 24, [48]… · 5, 8, 11, 14, [17]… · 1, 1, 2, 3, 5, 8, [13]… · 100, 90, 80, [70]… · En 2, 4, 6, 8… el término general es a_n = [2n]' })],
        notes: 'Actividad «Completar huecos» desde el móvil. Hay una geométrica, dos aritméticas (una que baja) y la de Fibonacci.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        img(SUN, 90, 110, 500, 500, 'Girasol', { rotation: 0 }),
        leaf(560, 470, 120, 40), leaf(100, 520, 100, -50),
        text('Sal a buscar patrones', 660, 170, 540, 160, { fontFamily: HD, fontSize: 66, fontStyle: 'italic', color: INK, lineHeight: 1.1 }),
        text(ul('Cuenta las espirales de una piña: saldrán 8 y 13', 'Las pipas de un girasol: 34 y 55', 'Los pétalos de una margarita: a menudo 21 o 34'), 660, 350, 540, 220, { fontSize: 26, color: INK }),
        text('Trae una foto a la próxima clase', 660, 600, 540, 40, { fontFamily: IT, fontSize: 32, fontStyle: 'italic', color: GREEN })],
        notes: 'Cierre con tarea de campo: contar espirales de verdad. Casi siempre salen números de Fibonacci consecutivos.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Prime numbers in a green-phosphor terminal: numbers typed one after another, rectangles of
  // squares, the sieve of Eratosthenes click by click, a factor tree, code and why spies love primes.
  edu_math_primes: { name: 'Números primos', cat: 'edu', summary: 'Terminal verde: neón propio, criba de Eratóstenes clic a clic con 100 casillas, árbol de factores, código por pasos, concurso y reto', make: () => {
    const BG = '#07110b', G = '#39ff88', AM = '#ffb000', W = '#d8ffe6', DIM = '#5f8f72', CELL = '#0f2418', M = FF.mono;
    const t = (s, x, y, w, h, size = 24, color = W, p = {}) => text(s, x, y, w, h, { fontFamily: M, fontSize: size, color, lineHeight: 1.3, ...p });
    const isP = n => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every(d => n % d);
    const scan = () => [shape('rect', -20, -20, 1320, 760, BG, { fill2: '#0d2116', gradType: 'radial', opacity: 100 })];
    const term = (x, y, w, h, title) => [shape('rounded', x, y, w, h, '#0b1a11', { stroke: G, strokeWidth: 2, opacity: 95 }),
      ...[0, 1, 2].map(i => shape('ellipse', x + 22 + i * 24, y + 16, 14, 14, ['#ff5f56', '#ffbd2e', '#27c93f'][i])), t(title, x + 100, y + 8, w - 200, 30, 16, DIM, { textAlign: 'center' })];
    // The sieve: which click takes each number away (0: 1 with the 2s; 1–4: multiples of 2, 3, 5, 7).
    const out = n => (n === 1 ? 1 : [2, 3, 5, 7].findIndex(p => n > p && n % p === 0) + 1);
    const cells = Array.from({ length: 100 }, (_, i) => i + 1);
    const sieve = cells.map(n => card(String(n), 80 + ((n - 1) % 10) * 50, 175 + Math.floor((n - 1) / 10) * 50, 46, 46, CELL, { fontFamily: M, fontSize: 20, color: W, radius: 6, pad: [0, 0, 0, 0], textAlign: 'center', vAlign: 'middle' }));
    const steps = ['Tacha el 1 y los múltiplos de 2', 'Ahora los múltiplos de 3', 'Los múltiplos de 5', 'Y los múltiplos de 7', 'Lo que queda: 25 primos'];
    const sieveAnimated = [];
    for (let k = 1; k <= 4; k++) {
      sieveAnimated.push(withAnims(t('> ' + steps[k - 1], 660, 200 + (k - 1) * 70, 560, 60, 24, k === 1 ? G : W), A('fade-in', { start: 'click', duration: 300 })));
      sieve.forEach((c, i) => { if (out(i + 1) === k) c.animation = A('semi-fade-out', { start: 'withPrev', duration: 400, delay: (i % 10) * 20 }); });
    }
    sieveAnimated.push(withAnims(t('> ' + steps[4], 660, 480, 560, 60, 26, AM, { fontWeight: 700 }), A('fade-in', { start: 'click', duration: 300, sound: 'chime' })));
    sieve.forEach((c, i) => { if (isP(i + 1)) { c.animation = A('highlight-green', { start: 'withPrev', duration: 500 }); c.borderColor = G + '90'; } });
    // The factor tree of 84.
    const nodes = [[84, 330, 190, 0], [2, 220, 310, 1], [42, 440, 310, 1], [2, 330, 430, 2], [21, 550, 430, 2], [3, 440, 550, 3], [7, 660, 550, 3]];
    const edges = [[0, 1], [0, 2], [2, 3], [2, 4], [4, 5], [4, 6]];
    const node = ([n, x, y]) => card(String(n), x - 42, y - 42, 84, 84, isP(n) ? AM : '#0b1a11', { radius: 42, fontFamily: M, fontSize: 30, color: isP(n) ? BG : G, textAlign: 'center', vAlign: 'middle', borderColor: G, pad: [0, 0, 0, 0], fontWeight: 700 });
    return numbered(build({ name: 'Números primos', palette: 'midnight', fonts: 'tech', title: { color: G, size: 46, font: M }, body: { color: W } }, [
      { layout: 'blank', bg: BG, back: scan(), extra: [
        t('// matemáticas · 1.º de ESO', 90, 130, 600, 40, 22, DIM),
        text('PRIMOS', 80, 170, 700, 190, { fontFamily: FF.bebas, fontSize: 190, wordart: 'neon', wordartColor: G, lineHeight: 1 }),
        t('Los átomos de los números', 90, 380, 600, 50, 34, W),
        ...term(720, 150, 480, 380, 'terminal — criba.py'),
        t('> buscar_primos(30)', 750, 210, 420, 40, 24, G),
        ...[2, 3, 5, 7, 11, 13, 17, 19, 23, 29].map((n, i) => withAnims(t(String(n), 755 + (i % 5) * 84, 270 + Math.floor(i / 5) * 60, 80, 44, 34, i % 2 ? W : AM, { fontWeight: 700 }),
          A('fade-in', { start: 'afterPrev', duration: 150, delay: i ? 120 : 600, sound: 'click' }))),
        t('> _', 750, 420, 200, 40, 24, G),
        t('Un primo solo se divide entre 1 y entre sí mismo.', 90, 470, 580, 90, 24, DIM)],
        notes: 'Al llegar, los diez primeros primos se «teclean» en el terminal uno tras otro, con un clic de teclado cada uno. El título es Text Art neón con color propio.' },
      { title: '> rectangulos(12) vs rectangulos(7)', layout: 'titleOnly', bg: BG, back: scan(), extra: [
        ...[[1, 12], [2, 6], [3, 4]].flatMap(([r, c], k) => Array.from({ length: r * c }, (_, i) => withAnims(shape('rect', 90 + (i % c) * 30 + [0, 0, 240][k], [200, 290, 290][k] + Math.floor(i / c) * 30, 26, 26, G, { opacity: 85 }),
          A('zoom-in', { start: i ? 'withPrev' : 'click', delay: i * 25, duration: 250 })))),
        t('12 = 1 × 12 = 2 × 6 = 3 × 4', 90, 450, 560, 40, 24, G), t('→ compuesto', 90, 490, 520, 40, 24, W),
        ...Array.from({ length: 7 }, (_, i) => withAnims(shape('rect', 720 + i * 30, 200, 26, 26, AM), A('zoom-in', { start: i ? 'withPrev' : 'click', delay: i * 40, duration: 250 }))),
        on(t('2 × ? · 3 × ? … no cabe en ningún otro rectángulo', 720, 290, 480, 80, 22, DIM), 'fade-in'),
        t('7 = 1 × 7', 720, 450, 480, 40, 24, AM), t('→ primo', 720, 490, 480, 40, 24, W)],
        notes: 'Con 12 cuadraditos se pueden hacer tres rectángulos distintos: 12 es compuesto. Con 7 solo cabe una fila: 7 es primo. Se puede hacer con fichas o con cubos encajables.' },
      { title: '> criba_de_eratostenes(100)', layout: 'titleOnly', bg: BG, back: scan(), extra: [...sieve, ...sieveAnimated,
        t('Eratóstenes, hace más de 2200 años, sin ordenador.', 660, 590, 560, 70, 20, DIM)],
        notes: 'Cuatro clics: en cada uno se apagan los múltiplos de 2, 3, 5 y 7 (con el 1 en el primero). El quinto ilumina en verde los 25 primos que quedan. Basta con llegar al 7 porque 11 × 11 ya pasa de 100.' },
      { title: '> factorizar(84)', layout: 'titleOnly', bg: BG, back: scan(), extra: [
        node(nodes[0]),
        ...[[1, 2], [3, 4], [5, 6]].flatMap(pair => [...pair.map((b, j) => { const [a] = edges.find(e => e[1] === b), [, x1, y1] = nodes[a], [, x2, y2] = nodes[b];
            return withAnims(lines([[x1, y1 + 42], [x2, y2 - 42]], G, 3), A('draw', { start: j ? 'withPrev' : 'click', duration: 400 })); }),
          ...pair.map((b, j) => withAnims(node(nodes[b]), A('zoom-in', { start: j ? 'withPrev' : 'afterPrev', duration: 300 })))]),
        on(mathBlock({ x: 760, y: 200, w: 440, h: 140, fontSize: 46, color: AM, latex: '84 = 2^2 \\cdot 3 \\cdot 7' }), 'zoom-in', { sound: 'chime' }),
        t('Los primos son las piezas con las que se construyen todos los demás números… y cada número tiene <b>una sola</b> receta.', 760, 360, 440, 220, 24, W)],
        notes: 'Árbol de factores: cada clic abre una rama (se dibuja la línea y aparecen los dos factores). Los primos, en ámbar, ya no se rompen más. Es el teorema fundamental de la aritmética.' },
      { title: '> es_primo(n)', layout: 'titleOnly', bg: BG, back: scan(), extra: [
        codeBlock({ x: 90, y: 180, w: 680, h: 420, fontSize: 24, lang: 'python', lineSteps: '1-3|4-6|7|9-10',
          code: 'def es_primo(n):\n    if n < 2:\n        return False\n    for d in range(2, int(n ** 0.5) + 1):\n        if n % d == 0:\n            return False\n    return True\n\nprint(es_primo(97))   # True\nprint(es_primo(91))   # False: 7 × 13' }),
        t('¿Por qué basta con probar hasta la raíz de n?', 820, 190, 380, 110, 24, AM),
        t('Si n = a × b y los dos fueran mayores que √n, el producto pasaría de n. Uno de los dos siempre es pequeño.', 820, 310, 380, 230, 22, W)],
        notes: 'Código por pasos: el caso especial, la búsqueda de divisores, la respuesta y dos pruebas. 91 parece primo y no lo es (7 × 13): gran ejemplo para la clase.' },
      { title: '> por_que_importan()', layout: 'titleOnly', bg: BG, back: scan(), extra: [
        ...term(90, 180, 520, 260, 'multiplicar.py'), t('> 61 × 53', 120, 240, 460, 40, 30, G), on(t('3233', 120, 300, 460, 80, 64, W, { fontWeight: 700 }), 'fade-in', { sound: 'click' }), t('0,000001 s', 120, 390, 460, 36, 20, DIM),
        ...term(670, 180, 520, 260, 'factorizar.py'), t('> 3233 = ? × ?', 700, 240, 460, 40, 30, G), on(t('buscando…', 700, 300, 460, 80, 52, AM, { fontWeight: 700 }), 'fade-in'), t('con 600 cifras: miles de años', 700, 390, 460, 36, 20, DIM),
        on(t('Multiplicar dos primos es fácil; deshacer la multiplicación es dificilísimo. En eso se basa el candado de las compras y los mensajes por internet.', 90, 480, 1100, 120, 26, W, { textAlign: 'center' }), 'fade-up')],
        notes: 'La criptografía de clave pública multiplica dos primos enormes. Con números pequeños es fácil (3233 = 61 × 53), pero con cientos de cifras no se conoce un método rápido para separarlos. Tiempos aproximados.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál de estos números es primo?', ['51', '57', '59', '91'], 2, { fontSize: 48 })],
        notes: 'Concurso: 51 = 3 × 17, 57 = 3 × 19 y 91 = 7 × 13. Solo 59 es primo. Truco: si las cifras suman múltiplo de 3, el número es múltiplo de 3.' },
      { layout: 'blank', bg: BG, back: scan(), transition: 'flash', extra: [
        ...term(90, 120, 640, 470, 'reto.sh'),
        t('> reto --desde 100 --hasta 130', 120, 180, 580, 40, 24, G),
        t('Encuentra todos los primos entre 100 y 130.', 120, 250, 580, 100, 34, W, { fontWeight: 700 }),
        t('Pista: solo hace falta probar 2, 3, 5, 7 y 11.', 120, 380, 580, 60, 24, DIM),
        t('> _', 120, 500, 200, 40, 24, G),
        timer(180, 800, 200, 360, { style: 'digital', color: G, h: 200, endText: 'FIN' }),
        t('Solución en las notas', 800, 430, 360, 40, 20, DIM, { textAlign: 'center' })],
        notes: 'Cuenta atrás digital de 3 minutos. Solución: 101, 103, 107, 109, 113 y 127 (seis primos).' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · Cartesian coordinates as a treasure map: parchment with burnt edges, a compass rose with
  // curved text, a plane whose points pop up, a pirate who walks the clues, a boat drawn joining points.
  edu_math_coordinates: { name: 'Coordenadas: el mapa del tesoro', cat: 'edu', summary: 'Mapa del tesoro: rosa de los vientos con texto curvo, puntos que aparecen, pirata 3D que sigue pistas, barco que se dibuja y etiquetar', make: () => {
    const BG = '#6b4a2b', PARCH = '#efdfb8', INK = '#4a3020', RED = '#b3261e', SEA = '#3d7ea6', OLIVE = '#5f7d2a', DIM = '#7b6243', HD = FF.merri, IT = FF.cormorant;
    const parch = () => [shape('ellipse', -220, -260, 1720, 1240, PARCH, { fill2: BG, gradType: 'radial' })];
    // A Cartesian plane drawn as an image: x0..x1, y0..y1 with a cell size and a margin.
    const plane = (x0, x1, y0, y1, c, m, extra = '') => { const W = (x1 - x0) * c + 2 * m, H = (y1 - y0) * c + 2 * m, X = x => m + (x - x0) * c, Y = y => m + (y1 - y) * c;
      let s = '';
      for (let x = x0; x <= x1; x++) s += `<line x1="${X(x)}" y1="${m}" x2="${X(x)}" y2="${H - m}" stroke="#4a3020" stroke-opacity=".22"/>`;
      for (let y = y0; y <= y1; y++) s += `<line x1="${m}" y1="${Y(y)}" x2="${W - m}" y2="${Y(y)}" stroke="#4a3020" stroke-opacity=".22"/>`;
      s += `<line x1="${m - 10}" y1="${Y(0)}" x2="${W - m + 10}" y2="${Y(0)}" stroke="#4a3020" stroke-width="3"/><line x1="${X(0)}" y1="${m - 10}" x2="${X(0)}" y2="${H - m + 10}" stroke="#4a3020" stroke-width="3"/>`;
      for (let x = x0; x <= x1; x++) if (x) s += `<text x="${X(x)}" y="${Y(0) + 20}" font-family="Georgia" font-size="15" fill="#4a3020" text-anchor="middle">${x}</text>`;
      for (let y = y0; y <= y1; y++) if (y) s += `<text x="${X(0) - 8}" y="${Y(y) + 5}" font-family="Georgia" font-size="15" fill="#4a3020" text-anchor="end">${y}</text>`;
      return svgURL(W, H, extra + s); };
    // (The plane of slides 2, 3 and the activity: −5…5, cells of 42, margin 40 → 500 × 500, origin in the middle.)
    const P = (x, y) => [330 + 42 * x, 430 - 42 * y], planeId = uid();
    const PLANE = plane(-5, 5, -5, 5, 42, 40);
    const dot = (x, y, c = RED, s = 20) => { const [px, py] = P(x, y); return shape('ellipse', px - s / 2, py - s / 2, s, s, c, { stroke: '#ffffff', strokeWidth: 2 }); };
    const ROSE = svgURL(300, 300, '<circle cx="150" cy="150" r="100" fill="none" stroke="#4a3020" stroke-width="2"/><circle cx="150" cy="150" r="86" fill="none" stroke="#4a3020" stroke-width="1" stroke-dasharray="4 4"/>'
      + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<polygon points="150,${a % 90 ? 92 : 58} 160,150 150,${a % 90 ? 208 : 242} 140,150" fill="${a % 90 ? '#c9a46a' : a % 180 ? '#4a3020' : '#b3261e'}" transform="rotate(${a} 150 150)"/>`).join('')
      + '<circle cx="150" cy="150" r="9" fill="#efdfb8" stroke="#4a3020" stroke-width="2"/>');
    // The island on its grid (−5…5 × −4…4, cells of 52, margin 30): origin at (360, 408) on the slide.
    const isl = (x, y) => [30 + (x + 5) * 52, 30 + (4 - y) * 52];
    const MAP = plane(-5, 5, -4, 4, 52, 30, `<rect width="580" height="476" fill="#9cc3d5" opacity=".55"/><path d="M80 300 C60 200 140 120 240 110 C330 60 470 90 520 170 C560 250 520 380 420 410 C320 450 160 430 80 300Z" fill="#e8cf96" stroke="#b08a4e" stroke-width="3"/>`
      + `<path d="M${isl(3, 2).join(' ')}m-14 -14l28 28m0 -28l-28 28" stroke="#b3261e" stroke-width="7" stroke-linecap="round"/>`
      + '<path d="M210 210 l0 -50 M210 160 c-20 -10 -40 0 -46 10 M210 160 c18 -14 40 -10 48 0 M210 160 c-6 -16 6 -30 20 -32" stroke="#5f7d2a" stroke-width="6" fill="none" stroke-linecap="round"/>'
      + `<path d="M${isl(-4, -3)[0] - 26} ${isl(-4, -3)[1] + 6} h52 l-10 16 h-32z" fill="#6b4a2b"/>`);
    const CHEST = svgURL(300, 240, '<rect x="30" y="100" width="240" height="120" rx="10" fill="#8a5a2b" stroke="#4a3020" stroke-width="5"/><path d="M30 100 Q150 10 270 100Z" fill="#a8703a" stroke="#4a3020" stroke-width="5"/>'
      + '<rect x="135" y="110" width="30" height="40" rx="4" fill="#e3b341" stroke="#4a3020" stroke-width="3"/><path d="M30 150 H270" stroke="#e3b341" stroke-width="8"/>'
      + [[70, 92], [110, 70], [160, 64], [205, 78], [235, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#f2c94c" stroke="#b8892b" stroke-width="3"/>`).join(''));
    const rogue = lib3d('kk-Rogue');
    const boat = [[-4, -1], [4, -1], [3, -3], [-3, -3]], mast = [[0, -1], [0, 4]], sail = [[0, 4], [3, 0], [0, 0]];
    const toPx = pts => pts.map(([x, y]) => P(x, y));
    return numbered(build({ name: 'Coordenadas: el mapa del tesoro', palette: 'forest', fonts: 'editorial', title: { color: INK, size: 48, font: HD }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: parch(), extra: [
        text('MATEMÁTICAS · 6.º DE PRIMARIA', 110, 170, 600, 40, { fontSize: 22, letterSpacing: 4, color: RED, fontWeight: 700 }),
        text('Coordenadas cartesianas', 104, 210, 640, 200, { fontFamily: HD, fontSize: 68, fontWeight: 700, color: INK, lineHeight: 1.1 }),
        text('El mapa del tesoro', 110, 420, 600, 70, { fontFamily: IT, fontSize: 52, fontStyle: 'italic', color: DIM }),
        withAnims(img(ROSE, 800, 150, 340, 340, 'Rosa de los vientos'), A('spin', { start: 'afterPrev', duration: 1400 })),
        text('NORTE · ESTE · SUR · OESTE · NORTE · ESTE · SUR · OESTE · ', 780, 130, 380, 380, { fontFamily: HD, fontSize: 18, curve: 100, color: INK, letterSpacing: 3, textAlign: 'center' }),
        lines([[150, 600], [300, 560], [470, 610], [620, 570]], RED, 4, false, { dash: 'dash' }),
        text('✕', 630, 545, 60, 60, { fontSize: 48, color: RED, fontWeight: 700 })],
        notes: 'Portada de pergamino: el borde oscuro es un brillo radial del color del papel sobre fondo marrón. La rosa de los vientos gira al entrar y el texto curvo la rodea.' },
      { title: 'Dos ejes y un origen', layout: 'titleOnly', bg: BG, back: parch(), extra: [
        keep(img(PLANE, 80, 180, 500, 500, 'Plano cartesiano de −5 a 5'), planeId),
        on(text('eje X · abscisas →', 600, 400, 260, 40, { fontSize: 24, color: SEA, fontWeight: 700 }), 'fade-left'),
        on(text('↑ eje Y · ordenadas', 345, 150, 300, 36, { fontSize: 24, color: OLIVE, fontWeight: 700 }), 'fade-down'),
        on(text('origen (0, 0)', 340, 440, 160, 34, { fontSize: 20, color: RED, fontWeight: 700 }), 'zoom-in', { sound: 'pop' }),
        ...[['I', 3, 3], ['II', -3, 3], ['III', -3, -3], ['IV', 3, -3]].map(([q, x, y], i) => { const [px, py] = P(x, y); return withAnims(text(q, px - 40, py - 30, 80, 60, { fontFamily: HD, fontSize: 44, color: DIM, textAlign: 'center' }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 })); }),
        text('Cuatro <b>cuadrantes</b>, numerados en sentido contrario a las agujas del reloj.', 880, 470, 330, 150, { fontSize: 24, color: INK })],
        notes: 'Un clic por elemento: eje horizontal, eje vertical, origen y los cuatro cuadrantes en cadena.' },
      { title: 'Cada punto, su pareja de números', layout: 'titleOnly', bg: BG, back: parch(), transition: 'fade', extra: [
        keep(img(PLANE, 80, 180, 500, 500, 'Plano cartesiano de −5 a 5'), planeId),
        ...[['A', 2, 3], ['B', -3, 1], ['C', -2, -4], ['D', 4, -2]].flatMap(([n, x, y], i) => { const [px, py] = P(x, y);
          return [withAnims(dot(x, y), A('zoom-in', { start: 'click', sound: 'pop', duration: 300 })),
            withAnims(text(`${n}(${x}, ${y})`.replace(/-/g, '−'), px + 10, py - 38, 120, 34, { fontSize: 22, color: RED, fontWeight: 700 }), A('fade-in', { start: 'withPrev' }))]; }),
        card(`<div style="font-family:${HD};font-size:40px;font-weight:700">(x, y)</div><div style="margin-top:10px">Primero cuánto <b>andas</b> (horizontal), después cuánto <b>subes o bajas</b> (vertical).</div>`, 640, 200, 560, 230, '#f6ead0', { color: INK, fontSize: 26, borderColor: '#c9a46a' }),
        text('«Primero se anda por el pasillo y luego se sube la escalera».', 640, 470, 560, 90, { fontFamily: IT, fontSize: 32, fontStyle: 'italic', color: DIM })],
        notes: 'Cuatro clics, un punto por cuadrante. Error típico: cambiar el orden y poner (3, 2) en vez de (2, 3).' },
      { title: 'Siguiendo las pistas', layout: 'titleOnly', bg: BG, back: parch(), extra: [
        img(MAP, 70, 170, 580, 476, 'Mapa de una isla sobre una cuadrícula con una X en (3, 2)'),
        withAnims(model('kk-Rogue', 97, 439, 110, 140, { walk: { clip: rogue.walk, end: rogue.arrive, endOnce: true, face: true, look: true } }),
          path([[130, 0], [260, 0], [260, -130], [260, -260], [312, -260], [364, -260]], { duration: 5200 })),
        withAnims(img(CHEST, 540, 215, 90, 72, 'Cofre del tesoro'), A('bounce', { start: 'afterPrev', sound: 'chime' })),
        card(ul('Desembarca en <b>(−4, −3)</b>', 'Anda <b>5</b> hacia la derecha', 'Sube <b>5</b> hacia el norte', 'Anda <b>2</b> más a la derecha', '¿Dónde está el tesoro?'), 700, 180, 500, 330, '#f6ead0', { color: INK, fontSize: 26, borderColor: '#c9a46a' }),
        on(text('¡En el punto <b>(3, 2)</b>!', 700, 540, 500, 60, { fontFamily: HD, fontSize: 36, color: RED, textAlign: 'center' }), 'zoom-in')],
        notes: 'Clic: el pirata 3D sigue las pistas por las líneas de la cuadrícula y celebra al llegar; aparece el cofre. Otro clic: la respuesta. Las pistas son sumas sobre la recta: −4 + 5 + 2 = 3 y −3 + 5 = 2.' },
      { title: 'Une los puntos', layout: 'titleOnly', bg: BG, back: parch(), extra: [
        keep(img(PLANE, 80, 180, 500, 500, 'Plano cartesiano de −5 a 5'), planeId),
        ...[...boat, [0, 4], [3, 0]].map(([x, y]) => dot(x, y, INK, 12)),
        on(lines(toPx(boat), '#8a5a2b', 5, true), 'draw', { duration: 1400 }),
        after(lines(toPx(mast), INK, 5), 'draw', { duration: 600 }),
        after(lines(toPx(sail), RED, 5, true, { fill: '#b3261e30' }), 'draw', { duration: 1000, sound: 'whoosh' }),
        tableBlock({ x: 660, y: 190, w: 540, h: 330, fontSize: 24, header: true, headBg: INK, headFg: PARCH, stroke: '#c9a46a', banded: true, band: '#c9a46a', colW: [3, 2, 2],
          rows: [['Trazo', 'Desde', 'Hasta'], ['Casco', '(−4, −1)', '(4, −1)'], ['', '(3, −3)', '(−3, −3)'], ['Mástil', '(0, −1)', '(0, 4)'], ['Vela', '(0, 4)', '(3, 0)'], ['', '(0, 0)', '(0, 4)']] }),
        text('Un clic y el barco se dibuja trazo a trazo.', 660, 550, 540, 50, { fontSize: 24, color: DIM, fontStyle: 'italic' })],
        notes: 'Un clic: casco, mástil y vela se trazan seguidos con el efecto «Dibujar». Para casa: inventar un dibujo y dictar sus puntos a un compañero.' },
      { layout: 'blank', bg: BG, back: parch(), extra: [pollBlock({ kind: 'label', question: 'Arrastra cada nombre a su punto', fontSize: 30, x: 80, y: 60, w: 1120, h: 600,
        image: plane(-5, 5, -5, 5, 42, 40, '<circle cx="334" cy="124" r="10" fill="#b3261e"/><circle cx="124" cy="208" r="10" fill="#b3261e"/><circle cx="166" cy="418" r="10" fill="#b3261e"/><circle cx="418" cy="334" r="10" fill="#b3261e"/>'),
        options: ['(2, 3)', '(−3, 1)', '(−2, −4)', '(4, −2)'], points: [{ x: 66.8, y: 24.8 }, { x: 24.8, y: 41.6 }, { x: 33.2, y: 83.6 }, { x: 83.6, y: 66.8 }] })],
        notes: 'Actividad «Etiquetar una imagen»: cada alumno arrastra las coordenadas a su punto desde el móvil. Son los mismos puntos de antes, sin letras.' },
      { layout: 'blank', bg: BG, back: parch(), extra: [quiz('¿En qué cuadrante está el punto (−5, 2)?', ['I', 'II', 'III', 'IV'], 1, { fontSize: 48 })],
        notes: 'Concurso: x negativa (izquierda) e y positiva (arriba): segundo cuadrante.' },
      { layout: 'blank', bg: BG, back: parch(), transition: 'zoom', extra: [
        withAnims(img(CHEST, 440, 240, 400, 320, 'Cofre del tesoro abierto con monedas'), A('bounce', { start: 'afterPrev', sound: 'applause', duration: 800 })),
        text('¡Tesoro encontrado!', 140, 100, 1000, 130, { fontFamily: HD, fontSize: 84, fontWeight: 700, wordart: 'fill', wordartColor: RED, textAlign: 'center' }),
        text('Próxima expedición: hundir la flota con coordenadas', 140, 590, 1000, 50, { fontFamily: IT, fontSize: 36, fontStyle: 'italic', color: INK, textAlign: 'center' })],
        notes: 'Cierre con Text Art oro y aplausos. Idea para la próxima sesión: «hundir la flota» en el plano con números negativos.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · Symmetry and tilings as a Nasrid wall: indigo, gold, teal and terracotta, eight-pointed
  // stars, a butterfly that unfolds, the three moves of the plane, a table of angles and a honeycomb.
  edu_math_symmetry: { name: 'Simetría y mosaicos', cat: 'edu', summary: 'Azulejos nazaríes: estrella que gira, mariposa que se refleja, traslación, giro y simetría animados, tabla de ángulos y panal', make: () => {
    const BG = '#13223f', GOLD = '#d4a640', TEAL = '#1f8a8a', TERRA = '#c0583a', CR = '#f3e9d2', BLUE = '#2a5d9f', DIM = '#a9b4cc', HD = FF.merri, IT = FF.cormorant;
    // A tile of eight-pointed stars and crosses, repeated (an SVG pattern).
    const TILES = (w, h, s = 100) => svgURL(w, h, `<defs><pattern id="t" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="#1b3158"/>`
      + `<g transform="translate(${s / 2} ${s / 2}) scale(${s / 100})"><rect x="-30" y="-30" width="60" height="60" fill="#1f8a8a" stroke="#d4a640" stroke-width="3"/><rect x="-30" y="-30" width="60" height="60" fill="#1f8a8a" stroke="#d4a640" stroke-width="3" transform="rotate(45)"/>`
      + `<circle r="12" fill="#c0583a" stroke="#d4a640" stroke-width="2"/></g>`
      + `<g fill="#c0583a" stroke="#d4a640" stroke-width="2"><rect x="${-8}" y="${-8}" width="16" height="16" transform="rotate(45)"/><rect x="${s - 8}" y="-8" width="16" height="16" transform="rotate(45 ${s} 0)"/>`
      + `<rect x="-8" y="${s - 8}" width="16" height="16" transform="rotate(45 0 ${s})"/><rect x="${s - 8}" y="${s - 8}" width="16" height="16" transform="rotate(45 ${s} ${s})"/></g></pattern></defs><rect width="${w}" height="${h}" fill="url(#t)"/>`);
    const wing = '<path d="M220 150 C170 20 40 0 20 70 C5 130 90 160 220 160Z" fill="#c0583a" stroke="#f3e9d2" stroke-width="4"/>'
      + '<path d="M220 165 C120 170 40 210 60 270 C80 320 180 290 220 200Z" fill="#d4a640" stroke="#f3e9d2" stroke-width="4"/>'
      + '<circle cx="95" cy="85" r="22" fill="#1f8a8a" stroke="#f3e9d2" stroke-width="3"/><circle cx="120" cy="240" r="16" fill="#2a5d9f" stroke="#f3e9d2" stroke-width="3"/>'
      + '<rect x="208" y="60" width="12" height="250" rx="6" fill="#3a2a1a"/>';
    const WING = svgURL(220, 320, wing), WING_R = svgURL(220, 320, `<g transform="translate(220 0) scale(-1 1)">${wing}</g>`);
    const L = [[0, 0], [55, 0], [55, 35], [30, 35], [30, 100], [0, 100]], LM = L.map(([x, y]) => [100 - x, y]);
    const ghost = (x, y, pts = L) => poly(pts, x, y, 110, 160, 'none', { stroke: DIM, strokeWidth: 2, dash: 'dash' });
    const piece = (x, y, c, pts = L) => poly(pts, x, y, 110, 160, c, { stroke: CR, strokeWidth: 2 });
    const hex = Array.from({ length: 6 }, (_, r) => Array.from({ length: 8 }, (_, c) => [r, c])).flat();
    return numbered(build({ name: 'Simetría y mosaicos', palette: 'revela', fonts: 'editorial', title: { color: GOLD, size: 50, font: HD }, body: { color: CR },
      decor: () => [shape('rect', 0, 0, 1280, 6, GOLD), shape('rect', 0, 714, 1280, 6, GOLD)] }, [
      { layout: 'blank', bg: BG, extra: [
        img(TILES(520, 720), 760, 0, 520, 720, 'Mosaico de estrellas de ocho puntas', { fit: 'fill' }),
        shape('rect', 740, 0, 20, 720, GOLD),
        withAnims(shape('star8', 900, 220, 260, 260, GOLD, { stroke: CR, strokeWidth: 4 }), A('spin', { start: 'afterPrev', duration: 1400, sound: 'chime' })),
        text('MATEMÁTICAS · 2.º DE ESO', 90, 170, 600, 40, { fontSize: 22, letterSpacing: 5, color: TEAL, fontWeight: 700 }),
        text('Simetría<br>y mosaicos', 84, 210, 640, 230, { fontFamily: HD, fontSize: 86, fontWeight: 700, color: CR, lineHeight: 1.08 }),
        text('La geometría que cubre paredes sin dejar huecos', 90, 460, 600, 100, { fontFamily: IT, fontSize: 40, fontStyle: 'italic', color: GOLD })],
        notes: 'El panel derecho es un mosaico propio (un patrón SVG que se repite). La estrella de ocho puntas entra girando con una campanilla.' },
      { title: 'El eje de simetría', layout: 'titleOnly', bg: BG, extra: [
        img(WING, 160, 200, 220, 320, 'Ala izquierda de una mariposa'),
        on(img(WING_R, 380, 200, 220, 320, 'Ala derecha, reflejo de la izquierda'), 'flip', { duration: 900, sound: 'whoosh' }),
        shape('rect', 378, 170, 4, 400, GOLD, { opacity: 90 }), text('eje', 350, 580, 60, 34, { fontSize: 22, color: GOLD, textAlign: 'center' }),
        text('Cada punto tiene su reflejo al otro lado del eje, <b>a la misma distancia</b>.', 690, 200, 500, 140, { fontSize: 30, color: CR }),
        on(text('Letras con eje: <span style="color:#d4a640;font-size:38px;letter-spacing:4px">A H M O T X</span>', 690, 380, 520, 80, { fontSize: 28, color: CR }), 'fade-up'),
        on(text('Letras sin eje: <span style="color:#c0583a;font-size:38px;letter-spacing:4px">F G J P R</span>', 690, 480, 520, 80, { fontSize: 28, color: CR }), 'fade-up')],
        notes: 'Clic: el ala derecha aparece dándose la vuelta, como un reflejo en un espejo. Después, letras que tienen eje de simetría y letras que no.' },
      { title: 'Tres movimientos del plano', layout: 'titleOnly', bg: BG, extra: [
        ...[['TRASLACIÓN', 'desliza sin girar', TEAL], ['GIRO', 'da vueltas alrededor de un punto', GOLD], ['SIMETRÍA', 'refleja en un espejo', TERRA]].flatMap(([n, d, c], i) => [
          shape('rounded', 80 + i * 380, 180, 360, 460, '#ffffff0d', { stroke: c, strokeWidth: 2 }),
          text(n, 80 + i * 380, 200, 360, 44, { fontFamily: HD, fontSize: 30, fontWeight: 700, color: c, textAlign: 'center', letterSpacing: 3 }),
          text(d, 100 + i * 380, 560, 320, 60, { fontSize: 24, color: DIM, textAlign: 'center' })]),
        ghost(115, 300), ghost(285, 300), withAnims(piece(115, 300, TEAL), path([[85, 0], [170, 0]], { duration: 1200 })),
        ghost(585, 300), on(piece(585, 300, GOLD), 'spin360', { duration: 1400 }), shape('ellipse', 633, 373, 14, 14, CR),
        piece(880, 300, TERRA), shape('rect', 1019, 270, 3, 220, CR, { dash: 'dash' }), on(piece(1050, 300, TERRA, LM), 'flip', { duration: 900 })],
        notes: 'Tres clics: la pieza verde se traslada hasta su contorno, la dorada da una vuelta entera alrededor de su centro y la roja aparece reflejada al otro lado del eje. Con estos movimientos se construyen todos los mosaicos.' },
      { title: '¿Qué polígonos regulares embaldosan?', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 80, y: 180, w: 740, h: 400, fontSize: 25, header: true, headBg: GOLD, headFg: BG, stroke: '#ffffff40', banded: true, band: TEAL, colW: [3, 2, 3, 3],
          rows: [['Polígono', 'Lados', 'Ángulo interior', '360° ÷ ángulo'], ['Triángulo', '3', '=180*(B2-2)/B2', '=360/C2'], ['Cuadrado', '4', '=180*(B3-2)/B3', '=360/C3'],
            ['Pentágono', '5', '=180*(B4-2)/B4', '=360/C4'], ['Hexágono', '6', '=180*(B5-2)/B5', '=360/C5'], ['Octógono', '8', '=180*(B6-2)/B6', '=360/C6']] }),
        text('Solo encajan alrededor de un vértice si 360 ÷ ángulo da un número <b>entero</b>.', 80, 600, 740, 60, { fontSize: 24, color: DIM }),
        ...[['triangle', TEAL, '✓'], ['rect', GOLD, '✓'], ['hexagon', TERRA, '✓'], ['pentagon', '#5b6b8c', '✗']].flatMap(([k, c, m], i) => { const x = 880 + (i % 2) * 170, y = 190 + Math.floor(i / 2) * 210;
          return [on(shape(k, x, y, 130, 130, c, { stroke: CR, strokeWidth: 2 }), 'zoom-in', { sound: i === 3 ? 'click' : 'pop' }),
            along(text(m, x, y + 135, 130, 50, { fontSize: 38, color: i === 3 ? TERRA : '#7bd88f', textAlign: 'center', fontWeight: 700 }), 'fade-in')]; })],
        notes: 'La tabla calcula el ángulo interior (=180*(B2-2)/B2) y cuántos caben en una vuelta (=360/C2). Solo triángulos, cuadrados y hexágonos dan entero: son los únicos polígonos regulares que embaldosan solos.' },
      { title: 'El panal: hexágonos sin huecos', layout: 'titleOnly', bg: BG, extra: [
        ...hex.map(([r, c]) => withAnims(shape('hexagon', 80 + c * 74.8 + (r % 2) * 37.4, 175 + r * 64.8, 90, 90, (r + c) % 3 ? GOLD : '#e8b94f', { stroke: '#8a6420', strokeWidth: 3, ...((r * 3 + c) % 5 ? {} : { fill: '#b8862a' }) }),
          A('zoom-in', { start: r + c ? 'withPrev' : 'afterPrev', delay: (r + c) * 90, duration: 300 }))),
        text('Las abejas no saben geometría, pero el hexágono es la forma que cubre el plano con <b>menos borde</b> para la misma superficie: menos cera.', 790, 200, 410, 260, { fontSize: 28, color: CR }),
        on(text('3 hexágonos en cada vértice:<br><b style="color:#d4a640;font-size:40px">3 × 120° = 360°</b>', 790, 480, 410, 120, { fontSize: 26, color: CR }), 'fade-up')],
        notes: 'El panal se construye solo en una oleada en diagonal al llegar. Es la «conjetura del panal», demostrada matemáticamente en 1999.' },
      { title: 'Mosaicos nazaríes', layout: 'titleOnly', bg: BG, extra: [
        on(img(TILES(600, 440, 110), 80, 180, 600, 440, 'Mosaico de estrellas de ocho puntas y cruces', { fit: 'fill', shadow: { x: 0, y: 10, blur: 24, color: '#00000066' } }), 'zoom-in', { duration: 900 }),
        text('En los zócalos de la Alhambra de Granada se repite una pieza con traslaciones, giros y simetrías.', 730, 190, 470, 170, { fontSize: 28, color: CR }),
        card(`<div style="font-family:${HD};font-size:72px;font-weight:700;color:${GOLD};line-height:1">17</div><div>grupos de simetría distintos tiene el plano; en la Alhambra se han encontrado muchos de ellos</div>`, 730, 390, 470, 230, '#ffffff10', { color: CR, fontSize: 24, borderColor: GOLD + '80' })],
        notes: 'Mosaico inspirado en los alicatados nazaríes (dibujo propio). Los matemáticos demostraron que solo hay 17 maneras esencialmente distintas de llenar el plano repitiendo un motivo.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuántos ejes de simetría tiene un hexágono regular?', ['3', '4', '6', '12'], 2, { fontSize: 48 })],
        notes: 'Concurso: 3 ejes que unen vértices opuestos y 3 que unen los puntos medios de lados opuestos: 6. En general, un polígono regular de n lados tiene n ejes.' },
      { layout: 'blank', bg: BG, transition: 'cube', extra: [
        img(TILES(260, 720, 130), 0, 0, 260, 720, 'Franja de mosaico', { fit: 'fill' }), shape('rect', 260, 0, 12, 720, GOLD),
        text('Taller: tu propia tesela', 320, 90, 880, 80, { fontFamily: HD, fontSize: 54, fontWeight: 700, color: GOLD }),
        dg('steps', 'Dibuja un cuadrado\nRecorta un trozo de un lado\nPégalo en el lado opuesto\nCalca la pieza muchas veces', 320, 190, 560, 420, { oneByOne: true, colors: 'accent' }),
        timer(900, 930, 230, 280, { color: GOLD, endText: '¡A pegar!' }),
        text('Cartulina, tijeras y celo', 910, 540, 320, 40, { fontFamily: IT, fontSize: 30, fontStyle: 'italic', color: DIM, textAlign: 'center' })],
        notes: 'Pasos uno a uno y cuenta atrás de 15 minutos. Es la técnica de las teselas «a lo Escher»: lo que se quita de un lado se añade en el opuesto, así la pieza sigue encajando.' },
    ]));
  } },
};
