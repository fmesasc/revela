// Example presentations: Biología escolar (primaria y secundaria). Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Every deck has its own topic and its own look: a sunlit leaf, a monk's
// garden notebook, a neon laboratory, a metro map, a beating red heart, a field notebook, a microscope's
// eyepiece, an open sky, a spring meadow and a nautical chart.

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
// An arrow from one point of the slide to another (the catalogue's arrow, turned).
const arrowTo = (x1, y1, x2, y2, color, thick = 18, props = {}) => {
  const len = Math.hypot(x2 - x1, y2 - y1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return shape('rightarrow', Math.round(mx - len / 2), Math.round(my - thick / 2), Math.round(len), thick, color, { rotation: +(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI).toFixed(1), ...props });
};
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 40, x: 70, y: 50, w: 1140, h: 620, ...props });
// Fonts of our own (Google fonts loaded on demand, as in the editor's list).
const FF = { caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif", mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif",
  playfair: "'Playfair Display', serif", dancing: "'Dancing Script', cursive", merri: "'Merriweather', serif", inter: "'Inter', sans-serif",
  lora: "'Lora', serif", pacifico: "'Pacifico', cursive", montserrat: "'Montserrat', sans-serif", poppins: "'Poppins', sans-serif", oswald: "'Oswald', sans-serif" };
// The credit line of the CC BY models used in a deck (small, on its last slide).
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });

// A leaf seen from above, with its veins.
const LEAF = svgURL(600, 400, '<path d="M30 200 C140 30 430 10 570 200 C430 390 140 370 30 200Z" fill="#3c9446" stroke="#b6e04c" stroke-width="5"/>'
  + '<path d="M30 200 L570 200" stroke="#d9f19a" stroke-width="6" stroke-linecap="round"/>'
  + [1, 2, 3, 4, 5].map(i => { const x = 40 + i * 88, d = 120 - Math.abs(i - 3) * 22;
    return `<path d="M${x} 200 Q${x + 30} ${200 - d * 0.5} ${x + 70} ${200 - d}" stroke="#d9f19a" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + `<path d="M${x} 200 Q${x + 30} ${200 + d * 0.5} ${x + 70} ${200 + d}" stroke="#d9f19a" stroke-width="3" fill="none" stroke-linecap="round"/>`; }).join(''));

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · Photosynthesis as a green factory: a dark leaf-green world lit by a yellow sun, a 3D plant,
  // what goes in and comes out, a Transform into the chloroplast, the equation, the elodea experiment.
  edu_bio_photosynthesis: { name: 'Fotosíntesis: la fábrica verde', cat: 'edu', summary: 'Hoja al sol: planta 3D, entradas y salidas animadas, Transformar al cloroplasto, ecuación, tabla con medias, cuenta atrás, líneas y huecos', make: () => {
    const BG = '#0e2617', LIME = '#b6e04c', SUN = '#ffd24a', CR = '#f2f7e6', SKY = '#8fd3ff', DIM = '#a9c4a4', PANEL = '#173a24', H = FF.inter;
    const leafId = uid();
    const light = () => [glow(820, -330, 900, '#c9a82a', BG, 40), glow(-320, 320, 820, '#1d5530', BG, 60)];
    // A chloroplast: an oval with its stacks of thylakoids (grana).
    const CHLORO = svgURL(400, 300, '<ellipse cx="200" cy="150" rx="190" ry="120" fill="#2e7d32" stroke="#b6e04c" stroke-width="6"/><ellipse cx="200" cy="150" rx="170" ry="102" fill="#7cc576"/>'
      + [[95, 110], [165, 175], [235, 105], [300, 170], [140, 70], [250, 200]].map(([x, y]) => [0, 1, 2, 3, 4].map(k => `<rect x="${x - 22}" y="${y - 22 + k * 9}" width="44" height="7" rx="3.5" fill="#1b5e20"/>`).join('')).join('')
      + '<path d="M117 110 L143 175 M187 175 L213 105 M257 105 L278 170" stroke="#1b5e20" stroke-width="4"/>');
    // The elodea in a beaker under a lamp.
    const ELODEA = svgURL(400, 300, '<rect x="20" y="20" width="70" height="26" rx="6" fill="#ffd24a"/><path d="M90 33 L150 33" stroke="#ffd24a" stroke-width="4"/><path d="M40 46 L20 120 M70 46 L90 120" stroke="#ffd24a" stroke-opacity=".35" stroke-width="18"/>'
      + '<rect x="190" y="60" width="160" height="220" rx="10" fill="#8fd3ff" fill-opacity=".25" stroke="#f2f7e6" stroke-width="4"/><rect x="194" y="110" width="152" height="166" rx="8" fill="#8fd3ff" fill-opacity=".35"/>'
      + '<path d="M270 270 C260 220 285 190 268 140 M268 200 L240 180 M270 230 L300 210 M268 165 L295 150 M266 250 L238 236" stroke="#3c9446" stroke-width="7" fill="none" stroke-linecap="round"/>'
      + '<circle cx="268" cy="125" r="6" fill="#f2f7e6"/><circle cx="276" cy="100" r="5" fill="#f2f7e6"/><circle cx="264" cy="80" r="4" fill="#f2f7e6"/>'
      + '<text x="120" y="290" font-family="sans-serif" font-size="18" fill="#a9c4a4" text-anchor="middle">10 cm</text><path d="M60 270 L185 270" stroke="#a9c4a4" stroke-width="2" stroke-dasharray="6 5"/>');
    const pill = (html, x, y, w, color) => card(html, x, y, w, 96, PANEL, { color: CR, fontSize: 26, pad: [14, 18, 14, 86], radius: 48, stroke: color, strokeWidth: 3, vAlign: 'middle' });
    return numbered(build({ name: 'Fotosíntesis: la fábrica verde', palette: 'ocean', fonts: 'clean', title: { color: LIME, size: 50, font: H }, body: { color: CR },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: light(), extra: [
        ...[0, 1, 2].map(i => shape('rect', 760 + i * 110, -80, 26, 520, SUN, { rotation: 28, opacity: 10 })),
        text('CIENCIAS NATURALES · 1.º DE ESO', 90, 150, 600, 40, { fontSize: 22, letterSpacing: 5, color: LIME, fontWeight: 700 }),
        text('La fábrica<br>verde', 80, 195, 660, 270, { fontFamily: H, fontSize: 118, fontWeight: 800, color: CR, lineHeight: 1 }),
        text('Cómo una hoja convierte luz, agua y aire en alimento', 90, 480, 560, 100, { fontSize: 32, color: DIM }),
        shape('rounded', 92, 610, 70, 8, SUN),
        model('kh-DiffuseTransmissionPlant', 740, 90, 460, 560, { caption: '', autoRotate: true, view: 'three', motion: 'float' })],
        notes: 'Portada con una planta en 3D que gira despacio. Pregunta de arranque: ¿de dónde saca una planta su comida si no come?' },
      { title: 'Lo que entra y lo que sale', layout: 'titleOnly', bg: BG, back: light(), extra: [
        keep(img(LEAF, 400, 250, 480, 320, 'Hoja con sus nervios'), leafId),
        ...[['<b>Luz</b> del Sol', 'sun', SUN, 190], ['<b>CO₂</b> del aire', 'wind', SKY, 345], ['<b>Agua</b> de la raíz', 'droplet', '#7fb8ff', 500]].flatMap(([t, ic, c, y], i) => [
          on(pill(t, 70, y, 300, c), 'fade-right', { sound: i ? undefined : 'pop' }),
          along(icon(ic, 96, y + 26, 44, c), 'fade-right'),
          along(arrowTo(380, y + 48, 470, 410 - 0 * i, c, 14), 'fade-right')]),
        on(arrowTo(830, 360, 930, 290, '#ffffff', 14), 'fade-left'),
        along(pill('<b>O₂</b> al aire', 940, 240, 270, '#ffffff'), 'fade-left'),
        along(icon('sparkles', 966, 266, 44, '#ffffff'), 'fade-left'),
        ...[0, 1, 2].map(i => after(shape('ellipse', 800 + i * 20, 330 - i * 6, 18, 18, '#ffffff', { opacity: 70 }), 'path', { points: [[0, 0], [40, -60], [90, -110]], duration: 900 })),
        on(arrowTo(830, 470, 930, 520, SUN, 14), 'fade-left'),
        along(pill('<b>Glucosa</b>: alimento', 940, 470, 270, SUN), 'fade-left'),
        along(icon('flame', 966, 496, 44, SUN), 'fade-left')],
        notes: 'Tres clics para las entradas: luz, dióxido de carbono (entra por los estomas) y agua (sube por el tallo). Después salen el oxígeno, con sus burbujas, y la glucosa, que la planta usa como alimento y para crecer.' },
      { title: 'Dentro de la hoja: el cloroplasto', layout: 'titleOnly', bg: BG, back: light(), autoAnimate: true, transition: 'fade', extra: [
        keep(img(LEAF, 60, 470, 270, 180, 'Hoja con sus nervios'), leafId),
        shape('ellipse', 230, 520, 40, 40, 'none', { stroke: '#ffffff', strokeWidth: 3 }),
        lines([[262, 525], [430, 260]], '#ffffff', 2, false, { dash: 'dash', opacity: 60 }), lines([[262, 555], [470, 600]], '#ffffff', 2, false, { dash: 'dash', opacity: 60 }),
        shape('ellipse', 360, 175, 460, 460, '#10301d', { stroke: LIME, strokeWidth: 4 }),
        after(img(CHLORO, 400, 255, 380, 300, 'Cloroplasto con sus pilas de tilacoides'), 'zoom-in', { duration: 800 }),
        on(text('<b style="color:#b6e04c">Clorofila</b>: el pigmento verde que atrapa la luz.', 860, 200, 360, 120, { fontSize: 28, color: CR }), 'fade-left'),
        on(text('<b style="color:#b6e04c">Tilacoides</b>: las «pilas de monedas» donde se capta la energía.', 860, 345, 360, 120, { fontSize: 28, color: CR }), 'fade-left'),
        on(text('Cada célula de una hoja tiene entre <b style="color:#ffd24a">20 y 100</b> cloroplastos.', 860, 490, 360, 120, { fontSize: 28, color: CR }), 'fade-left')],
        notes: 'Transformar: la hoja de la diapositiva anterior se encoge y se aparta, y la lupa nos lleva al cloroplasto. Comparar con una fábrica: la clorofila es el panel solar y los tilacoides, las máquinas.' },
      { layout: 'blank', bg: BG, back: light(), extra: [
        text('La receta, en una línea', 90, 70, 1100, 80, { fontFamily: H, fontSize: 52, fontWeight: 800, color: LIME }),
        after(mathBlock({ x: 70, y: 175, w: 1140, h: 150, fontSize: 50, color: CR,
          latex: '6\\,\\mathrm{CO_2} + 6\\,\\mathrm{H_2O} \\xrightarrow[\\text{clorofila}]{\\text{luz}} \\mathrm{C_6H_{12}O_6} + 6\\,\\mathrm{O_2}' }), 'zoom-in', { sound: 'chime' }),
        ...[['CO₂', 'dióxido de carbono', 'entra por los estomas', SKY], ['H₂O', 'agua', 'sube desde la raíz', '#7fb8ff'], ['C₆H₁₂O₆', 'glucosa', 'alimento y materia para crecer', SUN], ['O₂', 'oxígeno', 'sale al aire', '#ffffff']]
          .map(([f, n, d, c], i) => on(card(`<div style="font-size:40px;font-weight:800;color:${c}">${f}</div><div style="font-weight:700">${n}</div><div style="font-size:21px;color:${DIM}">${d}</div>`,
            70 + i * 288, 380, 268, 200, PANEL, { color: CR, fontSize: 26, textAlign: 'center', pad: [20, 16, 16, 16] }), 'fade-up')),
        text('Los números indican cuántas moléculas: los átomos que entran son los mismos que salen.', 90, 615, 1100, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'La ecuación aparece sola con una campanilla; después, un clic por cada sustancia. Contad átomos con la clase: 6 carbonos, 18 oxígenos y 12 hidrógenos a cada lado.' },
      { title: 'Experimento: la elodea burbujea', layout: 'titleOnly', bg: BG, back: light(), extra: [
        tableBlock({ x: 70, y: 185, w: 680, h: 340, fontSize: 24, header: true, headBg: '#2f7d3b', headFg: '#ffffff', stroke: '#b6e04c80', color: CR, colW: [3, 2, 2, 2, 2],
          rows: [['Lámpara a…', 'Prueba 1', 'Prueba 2', 'Prueba 3', 'Media'], ['10 cm', '42', '38', '40', '=PROMEDIO(B2:D2)'], ['20 cm', '26', '23', '26', '=PROMEDIO(B3:D3)'],
            ['30 cm', '14', '12', '13', '=PROMEDIO(B4:D4)'], ['40 cm', '7', '8', '6', '=PROMEDIO(B5:D5)'], ['50 cm', '4', '3', '5', '=PROMEDIO(B6:D6)']] }),
        text('Burbujas de oxígeno por minuto. Datos inventados para el ejemplo.', 70, 540, 680, 40, { fontSize: 20, color: DIM }),
        img(ELODEA, 800, 175, 400, 300, 'Lámpara iluminando una elodea dentro de un vaso de agua'),
        text('Contad burbujas durante 1 minuto:', 800, 490, 400, 40, { fontSize: 22, color: CR }),
        timer(60, 800, 540, 400, { style: 'bar', h: 70, color: SUN, endText: '¡Tiempo! Apuntad el número' })],
        notes: 'La columna «Media» se calcula sola con =PROMEDIO(B2:D2). Cuanto más cerca está la lámpara, más burbujas: más luz, más fotosíntesis. La cuenta atrás de 1 minuto sirve para hacerlo en clase.' },
      { title: 'Más luz… hasta un límite', layout: 'titleOnly', bg: BG, back: light(), extra: [
        chartBlock({ x: 60, y: 175, w: 790, h: 480, chartType: 'line', color: LIME, grid: true, yTitle: 'burbujas por minuto', xTitle: 'intensidad de la luz (%)',
          seriesName: 'Aire normal', data: [0, 10, 20, 30, 40, 50, 60, 70, 80].map((x, i) => ({ label: String(x), value: [0, 10, 19, 27, 33, 37, 39, 40, 40][i] })),
          series: [{ name: 'Con más CO₂', color: SUN, values: [0, 12, 23, 33, 42, 49, 54, 56, 57] }] }),
        text('Al principio, cuanta más luz, más rápido. Luego la curva se aplana: algo más se ha acabado.', 890, 190, 330, 210, { fontSize: 28, color: CR }),
        on(card('<b>Factor limitante</b>: lo que escasea frena todo lo demás. Con más CO₂, la planta llega más alto.', 890, 420, 330, 210, '#2f7d3b', { color: '#ffffff', fontSize: 24 }), 'fade-up')],
        notes: 'Datos inventados para el ejemplo. Los invernaderos aprovechan esta idea: añaden CO₂ para que las plantas crezcan más deprisa.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', question: 'Completa la receta de la hoja', fontSize: 34, x: 70, y: 50, w: 1140, h: 620,
        text: 'Las plantas toman [dióxido de carbono|CO2] del aire y [agua] del suelo. Con la energía de la [luz] fabrican [glucosa|azúcar] y liberan [oxígeno|O2] al aire.' })],
        notes: 'Actividad de rellenar huecos desde el móvil. Se aceptan «CO2» y «O2» escritos sin subíndice.' },
      { layout: 'blank', bg: BG, back: light(), transition: 'zoom', extra: [
        img(LEAF, 760, 300, 560, 373, 'Hoja con sus nervios', { rotation: -24, opacity: 55 }),
        text('«Cada bocado que comes<br>empezó en una hoja.»', 90, 190, 900, 220, { fontFamily: H, fontSize: 64, fontWeight: 800, color: CR, lineHeight: 1.15 }),
        text('Incluso un filete: la vaca comió hierba, y la hierba comió luz.', 90, 430, 700, 100, { fontSize: 32, color: LIME }),
        credits(['kh-DiffuseTransmissionPlant'], 90, 650, 900, DIM)],
        notes: 'Cierre: toda la energía de las cadenas alimentarias entra por la fotosíntesis. Tarea: poner una planta en la oscuridad tres días y comparar.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · Mendel in his garden notebook: parchment, sepia ink and a handwritten hand, peas drawn
  // one by one, the generations with Transform, a Punnett square as a table, his real numbers.
  edu_bio_mendel: { name: 'Mendel y los guisantes', cat: 'edu', summary: 'Cuaderno de huerto: guisantes que aparecen, generaciones con Transformar, cuadro de Punnett, barras y dona, línea del tiempo y concurso', make: () => {
    const BG = '#f3e9d2', INK = '#3b2a1a', SEP = '#7a5c3a', YE = '#e3b62b', GR = '#6e9a34', RED = '#9b3d2a', DIM = '#8a7356', H = FF.playfair, HAND = FF.dancing;
    const page = () => [shape('rect', 30, 30, 1220, 660, 'none', { stroke: SEP, strokeWidth: 2, sketch: true, opacity: 70 }), shape('rect', 40, 40, 1200, 640, 'none', { stroke: SEP, strokeWidth: 1, opacity: 40 }),
      glow(-200, -200, 700, '#e8d6ae', BG, 70), glow(900, 400, 700, '#eadbb9', BG, 60)];
    const pea = (x, y, d, c) => shape('ellipse', x, y, d, d, c, { stroke: INK, strokeWidth: 2, sketch: true, fill2: '#ffffff', gradType: 'radial' });
    const hand = (t, x, y, w, h, size, color = SEP, p = {}) => text(t, x, y, w, h, { fontFamily: HAND, fontSize: size, color, lineHeight: 1.1, ...p });
    const POD = svgURL(460, 240, '<path d="M20 150 C90 40 360 20 440 90 C380 190 120 230 20 150Z" fill="#8fb04a" stroke="#3b2a1a" stroke-width="4"/><path d="M40 145 C140 110 330 80 425 95" stroke="#3b2a1a" stroke-width="2" fill="none" stroke-dasharray="8 6"/>'
      + '<path d="M440 90 C455 70 450 50 435 40" stroke="#3b2a1a" stroke-width="4" fill="none"/>');
    // The generations: the same peas move from one slide to the next.
    const P = [uid(), uid()], F1 = [uid(), uid(), uid(), uid()], lbl = [uid(), uid()], cross = uid();
    return numbered(build({ name: 'Mendel y los guisantes', palette: 'paper', fonts: 'classic', title: { color: INK, size: 50, font: H }, body: { color: INK },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: page(), extra: [
        text('BIOLOGÍA · 4.º DE ESO · GENÉTICA', 100, 140, 600, 36, { fontSize: 20, letterSpacing: 4, color: RED, fontWeight: 700 }),
        text('Mendel y los<br>guisantes', 92, 185, 600, 230, { fontFamily: H, fontSize: 92, fontWeight: 700, color: INK, lineHeight: 1.05 }),
        text('Cómo ocho años en un huerto descubrieron las leyes de la herencia', 100, 440, 560, 100, { fontSize: 30, color: SEP }),
        img(POD, 730, 170, 460, 240, 'Vaina de guisantes dibujada a mano', { rotation: -8 }),
        ...[[805, 275, YE], [880, 262, GR], [955, 250, YE], [1030, 238, YE], [1100, 228, GR]].map(([x, y, c], i) =>
          withAnims(pea(x, y, 58, c), A('zoom-in', { start: i ? 'afterPrev' : 'afterPrev', duration: 350, sound: 'pop' }))),
        hand('Pisum sativum<br>huerto del monasterio, 1856', 780, 440, 420, 100, 36, SEP),
        shape('line', 780, 550, 380, 4, SEP, { stroke: SEP, strokeWidth: 2, sketch: true })],
        notes: 'Portada de cuaderno de huerto: los guisantes salen de la vaina uno a uno. Gregor Mendel cruzó miles de plantas de guisante entre 1856 y 1863.' },
      { title: 'Caracteres con dos versiones', layout: 'titleOnly', bg: BG, back: page(), extra: [
        ...[['Color de la semilla', 'amarilla', 'verde', YE, GR, 'ellipse'], ['Forma de la semilla', 'lisa', 'rugosa', '#d9c27a', '#d9c27a', 'pea'], ['Color de la flor', 'púrpura', 'blanca', '#7b4b94', '#ffffff', 'flower'], ['Altura de la planta', 'alta', 'enana', GR, GR, 'stem']]
          .flatMap(([t, a, b, ca, cb, k], i) => { const x = 80 + i * 285, sh = (c, cx, small) => k === 'stem' ? shape('rect', cx - 7, small ? 400 : 300, 14, small ? 70 : 170, c, { stroke: INK, strokeWidth: 2, sketch: true })
              : k === 'flower' ? shape('star6', cx - 40, 340, 80, 80, c, { stroke: INK, strokeWidth: 2, sketch: true })
              : k === 'pea' && small ? shape('cloud', cx - 38, 345, 76, 70, c, { stroke: INK, strokeWidth: 2, sketch: true }) : pea(cx - 38, 345, 76, c);
            return [on(shape('rounded', x, 190, 260, 420, '#fffaf0', { stroke: SEP, strokeWidth: 2, sketch: true }), 'fade-up'),
              along(text(t, x + 10, 210, 240, 70, { fontFamily: H, fontSize: 26, fontWeight: 700, color: INK, textAlign: 'center' }), 'fade-up'),
              along(sh(ca, x + 75, false), 'fade-up'), along(sh(cb, x + 185, true), 'fade-up'),
              along(text(`<b>${a}</b>`, x + 15, 490, 120, 40, { fontSize: 24, color: INK, textAlign: 'center' }), 'fade-up'),
              along(text(b, x + 125, 490, 120, 40, { fontSize: 24, color: DIM, textAlign: 'center' }), 'fade-up'),
              along(hand(i === 3 ? 'siempre una u otra' : 'nunca a medias', x + 10, 545, 240, 50, 28, RED, { textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Mendel eligió siete caracteres que aparecían en dos versiones claras, sin término medio. Aquí van cuatro, un clic cada uno. Elegir bien lo que se mide es la mitad de un buen experimento.' },
      { title: 'Primer cruce: ¿y el verde?', layout: 'titleOnly', bg: BG, back: page(), extra: [
        keep(hand('Padres (P)', 90, 200, 260, 60, 40), lbl[0]),
        keep(pea(420, 190, 90, YE), P[0]), keep(text('×', 530, 195, 70, 80, { fontFamily: H, fontSize: 60, color: SEP, textAlign: 'center' }), cross), keep(pea(620, 190, 90, GR), P[1]),
        lines([[510, 300], [510, 360], [665, 360], [665, 300]], SEP, 2, false, { sketch: true }), lines([[587, 360], [587, 400]], SEP, 2, false, { sketch: true }),
        keep(hand('Hijos (F1)', 90, 440, 260, 60, 40), lbl[1]),
        ...F1.map((id, i) => keep(after(pea(380 + i * 110, 420, 90, YE), 'zoom-in', { duration: 400, sound: i ? undefined : 'pop' }), id)),
        on(card('¡Todos amarillos! El verde parece haber desaparecido…', 860, 200, 360, 190, '#fffaf0', { color: INK, fontSize: 28, stroke: SEP, strokeWidth: 2 }), 'fade-left'),
        on(hand('…pero solo está escondido.', 860, 430, 360, 100, 40, RED), 'fade-up')],
        notes: 'Cruce de una planta de semilla amarilla con otra de semilla verde (las dos de raza pura). Todos los hijos salen amarillos. ¿Dónde se ha metido el verde? Lo veremos en la siguiente generación.' },
      { title: 'Segundo cruce: vuelve el verde', layout: 'titleOnly', bg: BG, back: page(), autoAnimate: true, transition: 'fade', extra: [
        keep(hand('Padres (P)', 90, 170, 200, 40, 28), lbl[0]),
        keep(pea(320, 165, 50, YE), P[0]), keep(text('×', 375, 160, 50, 60, { fontFamily: H, fontSize: 40, color: SEP, textAlign: 'center' }), cross), keep(pea(430, 165, 50, GR), P[1]),
        keep(hand('F1', 90, 260, 200, 40, 28), lbl[1]),
        ...F1.map((id, i) => keep(pea(320 + i * 60, 255, 50, YE), id)),
        hand('Nietos (F2)', 90, 380, 220, 50, 36, INK),
        ...[YE, YE, GR, YE].map((c, i) => after(pea(320 + i * 120, 360, 96, c), 'zoom-in', { duration: 400, delay: i === 2 ? 300 : 0, sound: i === 2 ? 'chime' : undefined })),
        on(text('<b>6.022</b> amarillas<br><b>2.001</b> verdes', 320, 500, 460, 100, { fontSize: 34, color: INK }), 'fade-up'),
        on(card(`<div style="font-family:${H};font-size:72px;font-weight:700;color:${RED};line-height:1">3 : 1</div><div>tres amarillas por cada verde</div>`, 860, 340, 360, 230, '#fffaf0', { color: INK, fontSize: 26, textAlign: 'center', stroke: SEP, strokeWidth: 2 }), 'zoom-in')],
        notes: 'Transformar: padres e hijos suben y se hacen pequeños. Al cruzar los hijos entre sí, el verde reaparece en una de cada cuatro semillas. 6.022 y 2.001 son los recuentos que publicó Mendel en 1866.' },
      { title: 'El cuadro de Punnett', layout: 'titleOnly', bg: BG, back: page(), extra: [
        tableBlock({ x: 90, y: 200, w: 420, h: 420, fontSize: 56, fontFamily: H, stroke: INK, color: INK, colW: [1, 1, 1],
          rows: [['', 'A', 'a'], ['A', 'AA', 'Aa'], ['a', 'Aa', 'aa']],
          cellBg: { '1,1': '#f1d77a', '1,2': '#f1d77a', '2,1': '#f1d77a', '2,2': '#b8d38e', '0,1': '#efe2c4', '0,2': '#efe2c4', '1,0': '#efe2c4', '2,0': '#efe2c4' } }),
        hand('polen de un padre →', 160, 160, 300, 40, 30, SEP),
        on(text('<b>A</b> = amarillo, <b>dominante</b>: con una sola copia ya se nota.', 570, 200, 640, 90, { fontSize: 28, color: INK }), 'fade-left'),
        on(text('<b>a</b> = verde, <b>recesivo</b>: solo se ve si hay dos copias (aa).', 570, 300, 640, 90, { fontSize: 28, color: INK }), 'fade-left'),
        on(mathBlock({ x: 570, y: 410, w: 640, h: 90, fontSize: 40, color: INK, latex: 'P(\\text{verde}) = P(aa) = \\tfrac{1}{4}' }), 'zoom-in', { sound: 'chime' }),
        on(hand('Cada padre aporta una letra: el hijo lleva una de cada uno.', 570, 530, 640, 80, 34, RED), 'fade-up')],
        notes: 'Cada progenitor F1 es Aa. Las cuatro casillas son igual de probables: tres llevan al menos una A (amarillas) y una es aa (verde). Es el 3 : 1 del recuento real.' },
      { title: 'Los números de Mendel', layout: 'titleOnly', bg: BG, back: page(), extra: [
        chartBlock({ x: 70, y: 175, w: 700, h: 480, chartType: 'hbar', color: GR, dataLabels: true, grid: true, xTitle: 'dominantes por cada recesivo', labelWidth: 42,
          data: [['Forma de semilla', 2.96], ['Color de semilla', 3.01], ['Color de flor', 3.15], ['Forma de vaina', 2.95], ['Color de vaina', 2.82], ['Posición de flor', 3.14], ['Altura del tallo', 2.84]].map(([label, value]) => ({ label, value })) }),
        chartBlock({ x: 810, y: 190, w: 400, h: 340, chartType: 'doughnut', data: [{ label: 'Amarillas', value: 6022, color: YE }, { label: 'Verdes', value: 2001, color: GR }] }),
        hand('Siete caracteres… y siempre cerca de 3.', 810, 560, 400, 80, 32, RED, { textAlign: 'center' })],
        notes: 'Proporciones calculadas a partir de los recuentos que publicó Mendel (por ejemplo, 5.474 lisas frente a 1.850 rugosas). La dona muestra el color de la semilla: el 75 % y el 25 %.' },
      { layout: 'blank', bg: BG, back: page(), extra: [quiz('Cruzas una planta Aa con otra aa. ¿Qué proporción de guisantes verdes esperas?', ['1 de cada 4', '1 de cada 2', '3 de cada 4', 'Ninguno'], 1)],
        notes: 'Concurso. Cuadro rápido: Aa × aa da Aa, Aa, aa, aa. La mitad son verdes. Este «cruce prueba» sirve para saber si una planta amarilla es AA o Aa.' },
      { title: 'De un huerto al ADN', layout: 'titleOnly', bg: BG, back: page(), extra: [
        dg('timeline', '1866\n  Mendel publica sus leyes\n1900\n  Tres científicos las redescubren\n1953\n  Se describe la doble hélice del ADN\n2003\n  Se lee el genoma humano completo',
          70, 200, 1140, 360, { oneByOne: true, colors: 'accent', textColor: INK }),
        hand('Nadie le hizo caso en vida: tardaron 34 años en entenderle.', 90, 590, 1100, 60, 36, RED, { textAlign: 'center' })],
        notes: 'La línea del tiempo aparece hito a hito. Mendel no sabía qué eran los «factores» que pasaban de padres a hijos: hoy los llamamos genes.' },
      { layout: 'blank', bg: BG, back: page(), transition: 'page', extra: [
        hand('Un huerto,', 100, 170, 700, 110, 96, INK),
        hand('paciencia', 160, 280, 700, 110, 96, GR),
        hand('y matemáticas.', 220, 390, 800, 110, 96, RED),
        ...[[880, 210, YE], [960, 260, GR], [1040, 200, YE], [930, 340, YE]].map(([x, y, c]) => pea(x, y, 70, c)),
        text('Tarea: busca en tu familia un carácter que «se salte» una generación.', 100, 560, 1000, 50, { fontSize: 26, color: SEP })],
        notes: 'Cierre. Ojo con la tarea: casi todos los caracteres humanos (color de ojos, altura) dependen de muchos genes; no siguen el 3 : 1 tan limpio como los guisantes.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 3 · DNA in a neon laboratory: Text Art in neon, a double helix that builds itself rung by rung,
  // base pairing, Python that transcribes and translates, genome sizes, a mutation and matching.
  edu_bio_dna: { name: 'El ADN, la receta de la vida', cat: 'edu', summary: 'Laboratorio de neón: hélice que se monta sola, Text Art, bases que se emparejan, código Python por pasos, barras, mutación y unir parejas', make: () => {
    const BG = '#070b1f', CY = '#38f2ff', MG = '#ff4fd8', FG = '#e8ecff', DIM = '#8f9bc4', PANEL = '#111834', H = FF.space, M = FF.mono;
    const BASE = { A: '#ff6b6b', T: '#ffd166', C: '#4dd6ff', G: '#9dff6a' }, PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' };
    const lab = () => [glow(-300, -300, 900, '#1a2a6c', BG, 60), glow(800, 300, 800, '#3a0f4f', BG, 50)];
    // The double helix: two strands (a drawing) and the rungs, one shape per base, that build up in turn.
    const HX = 980, HY = 70, HH = 580, AMP = 120, seq = 'ATGCCGTATCAGGT';
    const STRANDS = svgURL(300, HH, [1, -1].map(s => `<path d="${Array.from({ length: 59 }, (_, i) => { const t = i / 58, y = t * HH, x = 150 + s * AMP * Math.sin(t * Math.PI * 3);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join(' ')}" stroke="${s > 0 ? CY : MG}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join(''));
    const rungs = [...seq].flatMap((b, i) => { const t = (i + 0.5) / seq.length, y = HY + t * HH, dx = AMP * Math.sin(t * Math.PI * 3);
      if (Math.abs(dx) < 18) return [];
      const xl = HX - Math.abs(dx), xm = HX, w = Math.abs(dx), [l, r] = dx > 0 ? [PAIR[b], b] : [b, PAIR[b]];
      return [withAnims(shape('rect', xl, y - 5, w, 10, BASE[l]), A('grow', { start: 'afterPrev', duration: 160 })), along(shape('rect', xm, y - 5, w, 10, BASE[r]), 'fade-in', { duration: 160 })]; });
    const letter = (b, x, y, d = 64) => shape('rounded', x, y, d, d, BASE[b], { radius: 12 });
    const letterT = (b, x, y, d = 64) => text(b, x, y, d, d, { fontFamily: M, fontSize: d * 0.55, fontWeight: 700, color: '#0b1020', textAlign: 'center', vAlign: 'middle' });
    return numbered(build({ name: 'El ADN, la receta de la vida', palette: 'midnight', fonts: 'tech', title: { color: CY, size: 48, font: H }, body: { color: FG },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: lab(), extra: [
        text('BIOLOGÍA · 4.º DE ESO', 90, 150, 500, 36, { fontFamily: M, fontSize: 20, letterSpacing: 6, color: MG }),
        text('ADN', 80, 180, 620, 230, { fontFamily: H, fontSize: 200, fontWeight: 700, wordart: 'neon', wordartColor: CY, lineHeight: 1 }),
        text('La receta de la vida, escrita con cuatro letras', 90, 430, 560, 100, { fontSize: 34, color: FG }),
        text('A · T · C · G', 90, 550, 400, 50, { fontFamily: M, fontSize: 30, color: DIM, letterSpacing: 6 }),
        img(STRANDS, HX - 150, HY, 300, HH, 'Doble hélice de ADN'), ...rungs],
        notes: 'Al llegar, la doble hélice se monta peldaño a peldaño: cada peldaño es una pareja de bases. El título es Text Art de neón.' },
      { title: 'Del cuerpo a la letra', layout: 'titleOnly', bg: BG, back: lab(), extra: [
        dg('chevrons', 'Cuerpo\nCélula\nNúcleo\nCromosoma\nGen\nBase', 60, 180, 1160, 160, { oneByOne: true, colors: 'colorful', fontScale: 1.4 }),
        ...[['≈ 2 m', 'de ADN dentro de cada célula, plegado en un núcleo de 6 µm', CY], ['46', 'cromosomas en cada célula humana: 23 de la madre y 23 del padre', MG], ['3.200 M', 'de parejas de bases: la receta completa de una persona', '#9dff6a']]
          .map(([n, t, c], i) => on(card(`<div style="font-family:${H};font-size:60px;font-weight:700;color:${c};line-height:1.1">${n}</div><div style="font-size:23px;color:${FG}">${t}</div>`,
            60 + i * 395, 390, 370, 250, PANEL, { stroke: c, strokeWidth: 2, pad: [22, 24, 20, 24] }), 'fade-up'))],
        notes: 'El diagrama aparece paso a paso, de lo grande a lo pequeño. Si se estirara todo el ADN de un cuerpo humano, iría y volvería al Sol varias veces.' },
      { title: 'Cuatro letras, dos parejas', layout: 'titleOnly', bg: BG, back: lab(), extra: [
        ...[...'TACGGT'].flatMap((b, i) => { const y = 180 + i * 78;
          return [letter(b, 140, y), letterT(b, 140, y), shape('rect', 210, y + 29, 90, 6, '#ffffff', { opacity: 30 }),
            withAnims(letter(PAIR[b], 300, y), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 300, sound: i ? undefined : 'pop' })), along(letterT(PAIR[b], 300, y), 'fade-left', { duration: 300 })]; }),
        text('hebra molde', 100, 650, 150, 30, { fontFamily: M, fontSize: 16, color: DIM, textAlign: 'center' }), text('complementaria', 255, 650, 160, 30, { fontFamily: M, fontSize: 16, color: DIM, textAlign: 'center' }),
        card(`<span style="color:${BASE.A}">A</span> siempre con <span style="color:${BASE.T}">T</span><br><span style="color:${BASE.C}">C</span> siempre con <span style="color:${BASE.G}">G</span>`, 520, 190, 680, 170, PANEL, { fontFamily: M, fontSize: 44, color: FG, textAlign: 'center', vAlign: 'middle' }),
        on(text('Por eso, si conoces una hebra, conoces la otra: así se copia el ADN antes de que la célula se divida.', 520, 400, 680, 140, { fontSize: 30, color: FG }), 'fade-up'),
        on(text('Adenina · Timina · Citosina · Guanina', 520, 570, 680, 50, { fontFamily: M, fontSize: 22, color: DIM }), 'fade-in')],
        notes: 'Un clic y la hebra complementaria se escribe sola, letra a letra. Pedir a la clase que la diga en voz alta antes de que aparezca.' },
      { title: 'Del ADN a la proteína, en Python', layout: 'titleOnly', bg: BG, back: lab(), extra: [
        codeBlock({ x: 60, y: 170, w: 790, h: 470, fontSize: 20, lang: 'python', lineSteps: '1|2-4|5-8|9',
          code: 'adn = "TACGGTAAACTT"\n# 1. Transcripción: ADN → ARN mensajero\npareja = {"A": "U", "T": "A", "C": "G", "G": "C"}\narn = "".join(pareja[b] for b in adn)   # AUGCCAUUUGAA\n'
            + '# 2. Traducción: cada 3 letras, un aminoácido\ncodones = [arn[i:i+3] for i in range(0, len(arn), 3)]\ncodigo = {"AUG": "Met", "CCA": "Pro",\n          "UUU": "Phe", "GAA": "Glu"}\nprint([codigo[c] for c in codones])   # Met, Pro, Phe, Glu' }),
        ...[['ADN', 'TAC GGT AAA CTT', CY], ['ARN mensajero', 'AUG CCA UUU GAA', MG], ['Proteína', 'Met · Pro · Phe · Glu', '#9dff6a']].flatMap(([n, q, c], i) => [
          card(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${c}">${n}</div><div style="font-family:${M};font-size:20px">${q}</div>`, 890, 175 + i * 160, 330, 112, PANEL, { color: FG, stroke: c, strokeWidth: 2, pad: [14, 18, 12, 18] }),
          ...(i < 2 ? [shape('downarrow', 1040, 292 + i * 160, 30, 38, c)] : [])]),
        text('Un <b>codón</b> = tres letras = un aminoácido.', 890, 600, 330, 60, { fontSize: 21, color: DIM })],
        notes: 'El código se resalta por pasos: la hebra de ADN, la transcripción (con U en lugar de T), los codones y la proteína. La tabla real del código genético tiene 64 codones; aquí solo están los cuatro que necesitamos.' },
      { title: '¿Más ADN, más complejo?', layout: 'titleOnly', bg: BG, back: lab(), extra: [
        chartBlock({ x: 60, y: 170, w: 780, h: 490, chartType: 'hbar', color: CY, dataLabels: true, grid: true, xTitle: 'millones de pares de bases',
          data: [['Bacteria', 5], ['Levadura', 12], ['Mosca de la fruta', 140], ['Gallina', 1100], ['Ser humano', 3200], ['Cebolla', 16000], ['Pez pulmonado', 43000]]
            .map(([label, value]) => ({ label, value })) }),
        text('La cebolla tiene <b style="color:#38f2ff">cinco veces</b> más ADN que tú.', 880, 200, 340, 140, { fontSize: 32, color: FG }),
        on(card('El tamaño del genoma no mide la complejidad: mucho ADN no lleva instrucciones para fabricar proteínas.', 880, 380, 340, 250, PANEL, { color: FG, fontSize: 25, stroke: MG, strokeWidth: 2 }), 'fade-up')],
        notes: 'Valores aproximados y redondeados. El pez pulmonado australiano tiene uno de los genomas animales más grandes que se conocen.' },
      { title: 'Una letra cambiada', layout: 'titleOnly', bg: BG, back: lab(), extra: [
        text('Normal', 70, 205, 160, 50, { fontFamily: M, fontSize: 26, color: DIM }),
        ...[...'CTGAGGAG'].flatMap((b, i) => [letter(b, 240 + i * 74, 190, 64), letterT(b, 240 + i * 74, 190, 64)]),
        text('Mutada', 70, 335, 160, 50, { fontFamily: M, fontSize: 26, color: DIM }),
        ...[...'CTGAGGTG'].flatMap((b, i) => i === 6 ? [on(letter(b, 240 + i * 74, 320, 64), 'zoom-in', { sound: 'pop' }), along(letterT(b, 240 + i * 74, 320, 64), 'zoom-in')]
          : [letter(b, 240 + i * 74, 320, 64), letterT(b, 240 + i * 74, 320, 64)]),
        on(shape('ellipse', 120, 450, 170, 170, '#d7263d', { fill2: '#ff6b6b', gradType: 'radial', stroke: '#ffffff', strokeWidth: 2 }), 'fade-up'),
        along(text('glóbulo rojo normal', 90, 630, 230, 40, { fontSize: 20, color: DIM, textAlign: 'center' }), 'fade-up'),
        along(shape('moon', 400, 450, 110, 170, '#d7263d', { rotation: -30, stroke: '#ffffff', strokeWidth: 2 }), 'fade-up'),
        along(text('en forma de hoz', 350, 630, 230, 40, { fontSize: 20, color: DIM, textAlign: 'center' }), 'fade-up'),
        card('Una <b>A</b> cambia por una <b>T</b>: el aminoácido ya no es el mismo y la hemoglobina se deforma.', 880, 190, 340, 230, PANEL, { color: FG, fontSize: 26, stroke: CY, strokeWidth: 2 }),
        on(text('Así se produce la anemia falciforme: una sola letra entre 3.200 millones.', 880, 450, 340, 170, { fontSize: 26, color: MG }), 'fade-up')],
        notes: 'Primer clic: aparece la letra cambiada. Segundo: las consecuencias en los glóbulos rojos. Muchas mutaciones no tienen ningún efecto, y algunas son útiles: son la materia prima de la evolución.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', question: 'Une cada palabra con su significado', fontSize: 28, x: 60, y: 40, w: 1160, h: 640,
        options: ['Gen = Fragmento de ADN con una instrucción', 'Cromosoma = ADN enrollado y empaquetado', 'Codón = Tres bases que indican un aminoácido', 'Mutación = Cambio en la secuencia de bases', 'Genoma = Todo el ADN de un ser vivo'] })],
        notes: 'Actividad de unir parejas desde el móvil: cada estudiante relaciona cinco términos con su definición. Repasar después los que más fallos tengan.' },
      { layout: 'blank', bg: BG, back: lab(), transition: 'zoom', extra: [
        text('Eres 3.200 millones<br>de letras', 90, 180, 1100, 260, { fontFamily: H, fontSize: 96, fontWeight: 700, wordart: 'neon', wordartColor: MG, lineHeight: 1.1 }),
        text('…y compartes el 99,9 % de ellas con cualquier otra persona del planeta.', 90, 470, 900, 100, { fontSize: 34, color: FG }),
        text('Para debatir: ¿quién debería poder leer tu ADN?', 90, 600, 900, 50, { fontFamily: M, fontSize: 24, color: CY })],
        notes: 'Cierre con Text Art de neón. Abrir un pequeño debate: pruebas genéticas, privacidad, seguros médicos.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · Digestion as a metro line: a cream map with a thick orange line, stations, a sandwich that
  // rides it, a departures board as a table, enzymes as the line's machines, times and an ordering task.
  edu_bio_digestion: { name: 'El viaje de un bocadillo', cat: 'edu', summary: 'Plano de metro: la línea D se dibuja, un bocadillo la recorre, panel de salidas en tabla, enzimas, barras, ordenar paradas y Text Art', make: () => {
    const BG = '#fbf6ec', INK = '#1e1e24', OR = '#f28c28', RED = '#d64545', BL = '#2e6fb7', GR = '#3a9d5d', DIM = '#6b6b75', BOARD = '#1c1c22', AMB = '#ffb627', H = FF.bebas;
    const sign = (x, y, d = 90) => [shape('ellipse', x, y, d, d, OR, { stroke: '#ffffff', strokeWidth: 6 }), text('D', x, y, d, d, { fontFamily: H, fontSize: d * 0.72, color: '#ffffff', textAlign: 'center', vAlign: 'middle' })];
    // The line: stations in order (x, y, name, time, label side).
    const ST = [[150, 250, 'Boca', '1 min', 'up'], [430, 250, 'Esófago', '10 s', 'up'], [620, 420, 'Estómago', '2-4 h', 'down'], [880, 420, 'Duodeno', '', 'up'],
      [1110, 420, 'Intestino delgado', '3-5 h', 'up'], [1110, 600, '', '', ''], [720, 600, 'Intestino grueso', '1-2 días', 'down'], [330, 600, 'Recto', '', 'down']];
    const route = ST.map(([x, y]) => [x, y]);
    const station = ([x, y, n, t, side]) => n ? [shape('ellipse', x - 20, y - 20, 40, 40, '#ffffff', { stroke: INK, strokeWidth: 7 }),
      text(`<b>${n}</b>${t ? `<br><span style="font-size:20px;color:${DIM}">${t}</span>` : ''}`, side === 'right' ? x + 30 : x - 110, side === 'up' ? y - 98 : side === 'down' ? y + 30 : y - 34, 220, 70,
        { fontSize: 25, color: INK, textAlign: side === 'right' ? 'left' : 'center', lineHeight: 1.15 })] : [];
    return numbered(build({ name: 'El viaje de un bocadillo', palette: 'paper', fonts: 'bold', title: { color: INK, size: 64, font: H }, body: { color: INK },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: [shape('rect', 0, 0, 1280, 120, INK), shape('rect', 0, 120, 1280, 10, OR)], extra: [
        ...sign(70, 15), text('LÍNEA D · DIGESTIVA', 180, 30, 600, 60, { fontFamily: H, fontSize: 52, color: '#ffffff', letterSpacing: 3 }),
        text('BIOLOGÍA · 3.º DE ESO', 900, 42, 320, 40, { fontSize: 22, color: AMB, textAlign: 'right', fontWeight: 700 }),
        text('EL VIAJE DE<br>UN BOCADILLO', 80, 190, 900, 260, { fontFamily: H, fontSize: 130, color: INK, lineHeight: 0.95 }),
        text('De la boca al intestino grueso en siete paradas… y casi dos días de trayecto.', 90, 455, 760, 100, { fontSize: 32, color: DIM }),
        shape('rect', 80, 610, 1120, 16, OR, { radius: 8 }),
        ...[80, 360, 640, 920, 1180].map((x, i) => withAnims(shape('ellipse', x, 598, 40, 40, '#ffffff', { stroke: INK, strokeWidth: 7 }), A('zoom-in', { start: 'afterPrev', duration: 250 }))),
        after(shape('rounded', 60, 560, 70, 40, '#e9b872', { stroke: INK, strokeWidth: 3, radius: 18 }), 'path', { points: [[0, 0], [1140, 0]], duration: 2600, sound: 'whoosh' })],
        notes: 'Portada con estética de metro. Las estaciones se encienden y un bocadillo recorre la línea. Vamos a seguir su viaje por el aparato digestivo.' },
      { layout: 'blank', bg: BG, extra: [
        ...sign(60, 40, 70), text('PLANO DE LA LÍNEA', 150, 45, 700, 70, { fontFamily: H, fontSize: 60, color: INK }),
        after(lines(route, OR, 18, false, { strokeLinecap: 'round' }), 'draw', { duration: 2200 }),
        ...ST.flatMap(station),
        on(shape('rounded', 115, 225, 70, 50, '#e9b872', { stroke: INK, strokeWidth: 3, radius: 20 }), 'path', { points: route.map(([x, y]) => [x - 150, y - 250]), duration: 6000, sound: 'whoosh' }),
        text('Pulsa: el bocadillo hace el viaje', 860, 60, 360, 40, { fontSize: 20, color: DIM, textAlign: 'right' })],
        notes: 'La línea se dibuja sola; con un clic, el bocadillo la recorre entera. Los tiempos son orientativos: dependen de lo que comamos.' },
      { layout: 'blank', bg: BOARD, extra: [
        text('PRÓXIMAS SALIDAS', 80, 50, 700, 80, { fontFamily: H, fontSize: 66, color: AMB, letterSpacing: 4 }),
        ...sign(1110, 45, 80),
        tableBlock({ x: 80, y: 160, w: 1120, h: 470, fontSize: 25, fontFamily: FF.mono, header: true, headBg: '#2c2c34', headFg: AMB, color: '#f5f0e1', stroke: '#3b3b45', lines: true, colW: [3, 6, 2],
          rows: [['ESTACIÓN', 'QUÉ LE PASA AL BOCADILLO', 'TIEMPO'], ['Boca', 'Los dientes lo trituran; la saliva empieza con el pan', '1 min'], ['Esófago', 'Baja empujado por los músculos, en ola (peristaltismo)', '10 s'],
            ['Estómago', 'Ácido y pepsina deshacen las proteínas', '2-4 h'], ['Intestino delgado', 'Se termina la digestión y se absorben los nutrientes', '3-5 h'],
            ['Intestino grueso', 'Se recupera el agua; se forman las heces', '1-2 días']].map((r, i) => i ? r.map((c, j) => `<span style="color:${j === 2 ? AMB : '#f5f0e1'}">${c}</span>`) : r) }),
        text('Tiempos orientativos para una persona adulta', 80, 650, 800, 36, { fontSize: 20, color: '#9a9aa6' })],
        notes: 'Un panel de salidas como el de una estación: es una tabla con líneas horizontales y letra de máquina. Preguntar: ¿en qué parada pasamos más tiempo?' },
      { title: 'Las máquinas de la línea', layout: 'titleOnly', bg: BG, extra: [
        ...[['Amilasa', 'Boca', 'Corta el almidón del pan en azúcares', OR, 'apple'], ['Pepsina', 'Estómago', 'Rompe las proteínas del jamón', RED, 'flame'], ['Bilis', 'Hígado', 'Separa la grasa en gotitas, como el jabón', GR, 'droplet'], ['Lipasa', 'Páncreas', 'Deshace las grasas ya separadas', BL, 'sparkles']]
          .flatMap(([n, w, d, c, ic], i) => { const x = 70 + i * 290;
            return [on(shape('rounded', x, 190, 270, 400, '#ffffff', { stroke: c, strokeWidth: 4, radius: 18 }), 'fade-up'),
              along(shape('rect', x, 190, 270, 70, c, { radius: 0 }), 'fade-up'),
              along(text(n.toUpperCase(), x, 198, 270, 60, { fontFamily: H, fontSize: 46, color: '#ffffff', textAlign: 'center' }), 'fade-up'),
              along(icon(ic, x + 105, 290, 60, c), 'fade-up'),
              along(text(`Estación: <b>${w}</b>`, x + 15, 370, 240, 40, { fontSize: 22, color: DIM, textAlign: 'center' }), 'fade-up'),
              along(text(d, x + 20, 420, 230, 170, { fontSize: 26, color: INK, textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Las enzimas son las tijeras de la digestión: cada una corta un tipo de alimento. La bilis no es una enzima, pero ayuda como un detergente. Un clic por máquina.' },
      { title: '¿Dónde pasa más tiempo?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 60, y: 175, w: 760, h: 470, chartType: 'hbar', color: OR, dataLabels: true, grid: true, xTitle: 'horas (valores medios)',
          data: [['Boca', 0.02], ['Estómago', 3], ['Intestino delgado', 4], ['Intestino grueso', 36]].map(([label, value]) => ({ label, value })) }),
        text(`<div style="font-family:${FF.oswald};font-size:110px;font-weight:700;color:#c25e0a;line-height:1">7 m</div><div>mide el intestino delgado de un adulto</div>`, 860, 190, 360, 230, { fontSize: 28, color: INK }),
        on(card('Por dentro está lleno de pliegues y vellosidades: su superficie es de unos <b>30 m²</b>, como un piso pequeño.', 860, 440, 360, 200, INK, { color: '#ffffff', fontSize: 24 }), 'fade-up')],
        notes: 'Valores medios, muy variables entre personas. La mayor parte del tiempo, el bocadillo (lo que queda de él) está en el intestino grueso.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', question: 'Ordena las paradas de la línea D', fontSize: 30, x: 80, y: 60, w: 1120, h: 600,
        options: ['Boca', 'Esófago', 'Estómago', 'Intestino delgado', 'Intestino grueso', 'Recto'] })],
        notes: 'Actividad de ordenar desde el móvil. Quien ponga el intestino grueso antes que el delgado suele dejarse llevar por el nombre: el «delgado» es mucho más largo.' },
      { title: 'Consejos del maquinista', layout: 'titleOnly', bg: BG, extra: [
        ...[['droplet', 'Bebe agua', 'El intestino grueso la necesita para trabajar bien.', BL], ['carrot', 'Come fibra', 'Fruta, verdura y legumbres: el tren no se atasca.', GR],
          ['clock', 'Mastica despacio', 'La boca es la primera estación: no te la saltes.', OR], ['dumbbell', 'Muévete', 'El ejercicio ayuda a que la línea circule.', RED]]
          .flatMap(([ic, t, d, c], i) => { const x = 80 + (i % 2) * 570, y = 190 + Math.floor(i / 2) * 230;
            return [on(shape('ellipse', x, y, 130, 130, c), 'zoom-in', { sound: 'click' }), along(icon(ic, x + 33, y + 33, 64, '#ffffff'), 'zoom-in'),
              along(text(`<div style="font-family:${H};font-size:48px;color:${c === OR ? '#c25e0a' : c}">${t}</div><div>${d}</div>`, x + 160, y, 380, 150, { fontSize: 25, color: INK }), 'fade-right')]; })],
        notes: 'Cuatro hábitos, un clic cada uno. Pedir a la clase un quinto consejo y escribirlo en la pizarra.' },
      { layout: 'blank', bg: INK, transition: 'push', back: [shape('rect', 0, 300, 1280, 16, OR)], extra: [
        ...sign(595, 120, 90),
        text('FIN DE TRAYECTO', 90, 340, 1100, 170, { fontFamily: H, fontSize: 130, wordart: 'retro', textAlign: 'center', lineHeight: 1.1 }),
        text('Gracias por viajar en la línea D. Recuerde llevarse todos sus nutrientes.', 140, 520, 1000, 60, { fontSize: 30, color: '#ffffff', textAlign: 'center' })],
        notes: 'Cierre con Text Art retro. Para casa: dibujar el plano de la línea D en el cuaderno con las cinco estaciones principales.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · The heart as a tireless pump: a deep red cover with a heartbeat drawn across it, huge
  // numbers, two circuits drawn in red and blue, blood walking the chambers, a pulse lab with a
  // timer and formulas, a training curve, a man walking in 3D and a quiz.
  edu_bio_heart: { name: 'El corazón, una bomba incansable', cat: 'edu', summary: 'Rojo y azul: latido dibujado, cifras gigantes, circuitos trazados, gota por el corazón, pulso con cuenta atrás y fórmulas, 3D y concurso', make: () => {
    const DARK = '#2a0710', BG = '#fff8f6', RED = '#d7263d', DRED = '#8c1023', BL = '#2b59c3', INK = '#2b1a1f', DIM = '#7a6066', PINK = '#ffd9df', H = FF.montserrat;
    const ecg = (y, color, w = 6) => lines([[0, y], [300, y], [340, y - 30], [370, y + 20], [400, y - 150], [430, y + 90], [460, y], [560, y], [600, y - 40], [640, y], [900, y], [940, y - 30], [970, y + 20], [1000, y - 150], [1030, y + 90], [1060, y], [1280, y]], color, w);
    const ch = { ra: [430, 250], rv: [430, 420], la: [650, 250], lv: [650, 420] };
    return numbered(build({ name: 'El corazón, una bomba incansable', palette: 'office', fonts: 'modern', title: { color: DRED, size: 46, font: H }, body: { color: INK },
      decor: () => [] }, [
      { layout: 'blank', bg: DARK, back: [glow(700, -200, 900, '#7a1024', DARK, 60)], extra: [
        text('BIOLOGÍA · 3.º DE ESO · APARATO CIRCULATORIO', 90, 120, 800, 36, { fontSize: 20, letterSpacing: 4, color: '#ff8fa0', fontWeight: 700 }),
        text('El corazón,<br>una bomba<br>incansable', 80, 160, 700, 330, { fontFamily: H, fontSize: 84, fontWeight: 800, color: '#ffffff', lineHeight: 1.05 }),
        after(ecg(590, '#ff4d6d', 5), 'draw', { duration: 2400 }),
        withAnims(shape('heart', 860, 150, 300, 280, RED, { fill2: DRED, gradType: 'radial' }), A('pulse', { start: 'afterPrev', duration: 700, sound: 'drumroll' }), A('pulse', { start: 'afterPrev', duration: 700 }), A('pulse', { start: 'afterPrev', duration: 700 }))],
        notes: 'El electrocardiograma se dibuja solo y el corazón late. Pedir que se pongan dos dedos en el cuello: ¿lo notáis?' },
      { layout: 'blank', bg: BG, extra: [
        text('Un día cualquiera de tu corazón', 90, 70, 1100, 70, { fontFamily: H, fontSize: 46, fontWeight: 800, color: DRED }),
        ...[['100.000', 'latidos al día', RED], ['7.000 l', 'de sangre bombeada al día', BL], ['300 g', 'pesa: como un puño cerrado', DRED]].map(([n, t, c], i) =>
          on(text(`<div style="font-family:${H};font-size:84px;font-weight:800;color:${c};line-height:1.1">${n}</div><div>${t}</div>`, 70 + i * 390, 230, 360, 250, { fontSize: 30, color: INK, textAlign: 'center' }), 'zoom-in', { sound: 'pop' })),
        ...[0, 1].map(i => shape('rect', 448 + i * 390, 250, 3, 200, PINK)),
        text('Unos 3.000 millones de latidos en toda una vida, sin descansar ni una noche.', 140, 540, 1000, 80, { fontSize: 28, color: DIM, textAlign: 'center' })],
        notes: 'Tres cifras, un clic cada una. Con 70 latidos por minuto: 70 × 60 × 24 ≈ 100.000. Cada latido mueve unos 70 ml de sangre. Valores aproximados para una persona adulta en reposo.' },
      { title: 'Dos circuitos, un corazón', layout: 'titleOnly', bg: BG, extra: [
        shape('rounded', 330, 180, 140, 90, '#f3d6dc', { stroke: DIM, strokeWidth: 2, radius: 30 }), text('Pulmones', 330, 205, 140, 40, { fontSize: 22, color: INK, textAlign: 'center', fontWeight: 700 }),
        shape('rounded', 300, 560, 200, 90, '#f3d6dc', { stroke: DIM, strokeWidth: 2, radius: 30 }), text('Resto del cuerpo', 300, 585, 200, 40, { fontSize: 22, color: INK, textAlign: 'center', fontWeight: 700 }),
        shape('heart', 340, 355, 120, 110, RED),
        on(lines([[370, 370], [250, 330], [250, 225], [330, 225]], BL, 8), 'draw', { duration: 900 }),
        after(lines([[470, 225], [550, 225], [550, 330], [430, 370]], RED, 8), 'draw', { duration: 900 }),
        on(lines([[430, 455], [600, 500], [600, 605], [500, 605]], RED, 8), 'draw', { duration: 900 }),
        after(lines([[300, 605], [200, 605], [200, 480], [370, 445]], BL, 8), 'draw', { duration: 900 }),
        on(card('<b style="color:#2b59c3">Circulación menor</b><br>corazón → pulmones → corazón. La sangre suelta CO₂ y se carga de oxígeno.', 700, 190, 520, 190, '#ffffff', { color: INK, fontSize: 25, stroke: BL, strokeWidth: 3 }), 'fade-left'),
        on(card('<b style="color:#d7263d">Circulación mayor</b><br>corazón → cuerpo → corazón. Reparte oxígeno y nutrientes a todas las células.', 700, 420, 520, 190, '#ffffff', { color: INK, fontSize: 25, stroke: RED, strokeWidth: 3 }), 'fade-left')],
        notes: 'Primer clic: el circuito pulmonar se dibuja (azul de ida, rojo de vuelta). Segundo: el circuito general. El azul es solo un convenio: la sangre pobre en oxígeno es roja oscura, no azul.' },
      { title: 'El viaje por las cuatro cavidades', layout: 'titleOnly', bg: BG, extra: [
        ...[['ra', 'Aurícula derecha', BL], ['rv', 'Ventrículo derecho', BL], ['la', 'Aurícula izquierda', RED], ['lv', 'Ventrículo izquierdo', RED]].flatMap(([k, n, c]) => { const [x, y] = ch[k];
          return [shape('rounded', x - 100, y - 70, 200, 140, c === BL ? '#dfe7fb' : '#fde0e4', { stroke: c, strokeWidth: 4, radius: 26 }), text(n, x - 95, y - 30, 190, 60, { fontSize: 22, color: INK, textAlign: 'center', fontWeight: 700, lineHeight: 1.15 })]; }),
        shape('rect', 538, 170, 4, 340, DIM), text('tu derecha está a la izquierda del dibujo', 330, 525, 420, 30, { fontSize: 17, color: DIM, textAlign: 'center' }),
        on(shape('ellipse', 410, 150, 40, 40, '#5b2a86', { stroke: '#ffffff', strokeWidth: 3 }), 'path', { points: [[0, 0], [0, 80], [0, 250], [-150, 250], [-150, -90], [0, -90], [220, -90], [220, 80], [220, 250], [380, 250], [380, -60]], duration: 6500, sound: 'whoosh' }),
        text('Pulsa: una gota de sangre hace el recorrido completo.', 820, 190, 400, 80, { fontSize: 24, color: DIM }),
        ...['Llega del cuerpo a la aurícula derecha', 'El ventrículo derecho la manda a los pulmones', 'Vuelve oxigenada a la aurícula izquierda', 'El ventrículo izquierdo la lanza por la aorta'].map((t, i) =>
          on(text(`<b style="color:${i < 2 ? BL : RED}">${i + 1}</b>  ${t}`, 820, 280 + i * 90, 400, 80, { fontSize: 23, color: INK }), 'fade-left'))],
        notes: 'Con un clic la gota recorre el corazón: entra a la aurícula derecha, baja al ventrículo, sale hacia los pulmones, vuelve por la izquierda y sale por la aorta. Después, los cuatro pasos por escrito. Las válvulas impiden que la sangre vuelva atrás.' },
      { title: 'Laboratorio: mide tu pulso', layout: 'titleOnly', bg: BG, extra: [
        timer(15, 90, 200, 300, { color: RED, endText: '¡Para y cuenta!' }),
        text('Cuenta los latidos durante 15 segundos y multiplica por 4.', 70, 530, 340, 100, { fontSize: 24, color: INK, textAlign: 'center' }),
        tableBlock({ x: 460, y: 200, w: 760, h: 300, fontSize: 25, header: true, banded: true, band: RED, headBg: RED, headFg: '#ffffff', stroke: '#e6b8c0', color: INK, colW: [5, 3, 3],
          rows: [['Situación', 'Latidos en 15 s', 'Por minuto'], ['En reposo', '18', '=B2*4'], ['Tras 20 sentadillas', '31', '=B3*4'], ['Tras 2 min de descanso', '22', '=B4*4']] }),
        on(card('La última columna se calcula sola: cambia tus números y verás tu pulso por minuto.', 460, 530, 760, 100, PINK, { color: INK, fontSize: 24, vAlign: 'middle' }), 'fade-up')],
        notes: 'Cuenta atrás de 15 segundos con aviso sonoro. La tabla tiene fórmulas (=B2*4): se pueden escribir los datos de cada estudiante en clase. Datos de ejemplo inventados.' },
      { title: 'El pulso durante una carrera', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 60, y: 170, w: 800, h: 490, chartType: 'line', color: RED, grid: true, yMin: 50, yMax: 190, xTitle: 'minutos', yTitle: 'latidos por minuto', seriesName: 'Sin entrenar',
          data: [0, 2, 4, 6, 8, 10, 12, 14, 16].map((m, i) => ({ label: String(m), value: [78, 120, 155, 168, 172, 160, 130, 112, 100][i] })),
          series: [{ name: 'Entrenada', color: BL, values: [60, 98, 128, 140, 144, 120, 88, 72, 66] }] }),
        text('Correr de 0 a 8 minutos y descansar después.', 900, 190, 320, 90, { fontSize: 24, color: DIM }),
        on(card('Un corazón entrenado bombea más sangre en cada latido: le basta latir menos y se recupera antes.', 900, 300, 320, 260, '#ffffff', { color: INK, fontSize: 25, stroke: BL, strokeWidth: 3 }), 'fade-up')],
        notes: 'Datos inventados para el ejemplo. Fijarse en dos cosas: el pulso en reposo (más bajo en la persona entrenada) y lo rápido que baja al parar.' },
      { title: 'Cuida tu bomba', layout: 'titleOnly', bg: BG, extra: [
        withAnims(model('kh-CesiumMan', 60, 230, 260, 360, { walk: { clip: '*', face: true, look: true }, caption: '' }), path([[160, 0], [320, 0]], { duration: 4000, start: 'afterPrev' })),
        shape('rect', 60, 590, 600, 6, PINK, { radius: 3 }),
        ...[['Camina 30 minutos al día', 'heart-pulse'], ['Menos sal y menos bollería', 'utensils'], ['Duerme entre 8 y 10 horas', 'moon'], ['Nada de tabaco', 'ban']].map(([t], i) =>
          on(card(t, 720, 190 + i * 112, 500, 90, '#ffffff', { color: INK, fontSize: 27, stroke: RED, strokeWidth: 2, vAlign: 'middle', pad: [12, 20, 12, 90] }), 'fade-left')),
        ...['heart-pulse', 'utensils', 'moon', 'ban'].map((ic, i) => icon(ic, 745, 210 + i * 112, 48, RED))],
        notes: 'El personaje 3D cruza la diapositiva andando al llegar. Cuatro hábitos, un clic cada uno: el corazón es un músculo y se entrena.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué vaso lleva la sangre del corazón a los pulmones?', ['Arteria pulmonar', 'Vena pulmonar', 'Aorta', 'Vena cava'], 0)],
        notes: 'Pregunta trampa: la arteria pulmonar lleva sangre pobre en oxígeno. Arteria = sale del corazón; vena = llega al corazón, sea cual sea el oxígeno que lleve.' },
      { layout: 'blank', bg: DARK, transition: 'zoom', back: [glow(340, 60, 600, '#7a1024', DARK, 70)], extra: [
        withAnims(shape('heart', 515, 150, 250, 230, RED, { fill2: DRED, gradType: 'radial' }), A('pulse', { start: 'afterPrev', duration: 700, sound: 'drumroll' }), A('pulse', { start: 'afterPrev', duration: 700 })),
        text('Late sin que se lo pidas.<br>Cuídalo sin que te lo pida.', 140, 420, 1000, 170, { fontFamily: H, fontSize: 52, fontWeight: 800, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }),
        credits(['kh-CesiumMan'], 140, 640, 1000, '#c99aa4')],
        notes: 'Cierre. Propuesta: anotar el pulso en reposo cada mañana durante una semana y hacer una gráfica.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · The Mediterranean wood in a field notebook: kraft paper, tape and museum labels, a fox
  // that walks in 3D, a chain one by one, a food web that draws itself, the 10 % rule in a table,
  // predators and prey in a chart and a picture to label.
  edu_bio_ecosystem: { name: 'El bosque: quién come a quién', cat: 'edu', summary: 'Cuaderno de campo en papel kraft: zorro 3D que anda, cadena trófica, red que se dibuja, pirámide y tabla del 10 %, líneas y etiquetar', make: () => {
    const BG = '#e8dcc0', INK = '#3e2f1c', GR = '#4f6b2a', TER = '#b5562b', OCH = '#c99a2e', DIM = '#7a6a50', CARD = '#f6efdc', H = FF.merri, HAND = FF.caveat;
    const kraft = () => [glow(-250, -250, 800, '#efe5cd', BG, 70), glow(850, 380, 700, '#dccda9', BG, 60), shape('rect', 0, 0, 1280, 720, 'none', { stroke: '#c9b88f', strokeWidth: 14 })];
    const tape = (x, y, w, rot) => shape('rect', x, y, w, 34, '#f4ecd0', { opacity: 75, rotation: rot, stroke: '#d8c9a2', strokeWidth: 1 });
    const hand = (t, x, y, w, h, size, color = DIM, p = {}) => text(t, x, y, w, h, { fontFamily: HAND, fontSize: size, color, lineHeight: 1.1, ...p });
    const fox = lib3d('kh-Fox');
    // The food web: nodes and who is eaten by whom (energy goes along the arrow).
    const N = { aguila: [480, 205, 'Águila'], zorro: [290, 340, 'Zorro'], lagartija: [690, 340, 'Lagartija'], conejo: [160, 475, 'Conejo'], raton: [470, 475, 'Ratón'],
      saltamontes: [780, 475, 'Saltamontes'], hierba: [300, 615, 'Hierba'], encina: [640, 615, 'Encina'] };
    const EDGES = [['hierba', 'conejo'], ['hierba', 'saltamontes'], ['encina', 'raton'], ['encina', 'saltamontes'], ['saltamontes', 'lagartija'], ['conejo', 'zorro'], ['raton', 'zorro'],
      ['conejo', 'aguila'], ['raton', 'aguila'], ['lagartija', 'aguila'], ['lagartija', 'zorro']];
    const edge = ([a, b], i) => { const [x1, y1] = N[a], [x2, y2] = N[b], L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      const k = 1 / Math.hypot(ux / 84, uy / 34);
      return withAnims(arrowTo(x1 + ux * k, y1 + uy * k, x2 - ux * (k + 4), y2 - uy * (k + 4), i < 4 ? GR : TER, 14), A('fade-in', { start: i ? 'afterPrev' : 'click', duration: 260 })); };
    // A wood to label: an oak, a rabbit, a fox, mushrooms and an eagle (simple shapes).
    const WOOD = svgURL(1000, 560, '<rect width="1000" height="560" fill="#f6efdc"/><rect y="440" width="1000" height="120" fill="#c8d59a"/>'
      + '<rect x="160" y="230" width="40" height="230" fill="#7a5230"/><circle cx="180" cy="200" r="110" fill="#5d7f34"/><circle cx="110" cy="250" r="70" fill="#6b8f3a"/><circle cx="250" cy="250" r="70" fill="#6b8f3a"/>'
      + '<ellipse cx="420" cy="455" rx="45" ry="32" fill="#b9a18a"/><circle cx="460" cy="425" r="22" fill="#b9a18a"/><ellipse cx="465" cy="390" rx="7" ry="24" fill="#b9a18a"/><ellipse cx="452" cy="392" rx="7" ry="24" fill="#a68d76"/>'
      + '<ellipse cx="640" cy="440" rx="70" ry="34" fill="#d9792b"/><path d="M700 425 L745 395 L740 440 Z" fill="#d9792b"/><path d="M712 400 L720 375 L730 402 Z" fill="#7a3d15"/><path d="M575 440 C530 420 520 470 560 470" fill="#d9792b"/><circle cx="725" cy="418" r="4" fill="#3e2f1c"/>'
      + '<rect x="842" y="470" width="14" height="30" fill="#efe3c8"/><ellipse cx="849" cy="470" rx="28" ry="14" fill="#b5562b"/><rect x="882" y="480" width="10" height="22" fill="#efe3c8"/><ellipse cx="887" cy="480" rx="20" ry="10" fill="#b5562b"/>'
      + '<path d="M540 100 Q600 60 600 100 Q600 60 660 100 L640 104 Q600 85 600 115 Q600 85 560 104 Z" fill="#3e2f1c"/>');
    return numbered(build({ name: 'El bosque: quién come a quién', palette: 'forest', fonts: 'editorial', title: { color: INK, size: 46, font: H }, body: { color: INK },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: kraft(), extra: [
        hand('Cuaderno de campo · salida del 14 de abril', 90, 120, 645, 50, 36, TER),
        text('Quién come<br>a quién', 84, 170, 640, 250, { fontFamily: H, fontSize: 92, fontWeight: 700, color: INK, lineHeight: 1.08 }),
        text('Cadenas y redes tróficas del bosque mediterráneo', 90, 430, 600, 100, { fontSize: 32, color: DIM }),
        text('CIENCIAS NATURALES · 2.º DE ESO', 90, 560, 600, 36, { fontSize: 20, letterSpacing: 4, color: GR, fontWeight: 700 }),
        shape('rounded', 740, 150, 460, 430, CARD, { stroke: '#c9b88f', strokeWidth: 2, rotation: 2 }), tape(900, 132, 150, -4),
        withAnims(model('kh-Fox', 740, 220, 260, 260, { caption: '', view: 'side', walk: { clip: fox.walk, face: true, look: true }, clip: fox.rest }), path([[180, 0]], { start: 'afterPrev', duration: 3000 })),
        hand('Vulpes vulpes — visto junto al arroyo', 760, 520, 420, 50, 32, INK, { textAlign: 'center' })],
        notes: 'Portada de cuaderno de campo: el zorro en 3D cruza la ficha andando al llegar. Pregunta inicial: ¿qué come un zorro? ¿Y quién se lo come a él?' },
      { title: 'Los habitantes del bosque', layout: 'titleOnly', bg: BG, back: kraft(), extra: [
        ...[['Encina', 'Productor', 'tree-pine', GR], ['Saltamontes', 'Consumidor primario', 'leaf', OCH], ['Conejo', 'Consumidor primario', 'paw-print', OCH], ['Lagartija', 'Consumidor secundario', 'sun', TER],
          ['Zorro', 'Consumidor secundario', 'paw-print', TER], ['Águila', 'Consumidor terciario', 'bird', INK], ['Setas', 'Descomponedor', 'sprout', '#7a5c3a'], ['Lombriz', 'Descomponedor', 'recycle', '#7a5c3a']]
          .flatMap(([n, r, ic, c], i) => { const x = 80 + (i % 4) * 285, y = 190 + Math.floor(i / 4) * 230, rot = [-2, 1.5, -1, 2][i % 4];
            return [on(shape('rounded', x, y, 260, 200, CARD, { stroke: c, strokeWidth: 3, rotation: rot }), 'fade-down', { duration: 400 }),
              along(icon(ic, x + 20, y + 22, 46, c), 'fade-down'),
              along(text(n, x + 80, y + 28, 175, 50, { fontFamily: H, fontSize: 24, fontWeight: 700, color: INK }), 'fade-down'),
              along(hand(r, x + 20, y + 100, 220, 80, 32, c), 'fade-down')]; })],
        notes: 'Fichas de museo, un clic cada una. Productores: fabrican su alimento con la luz. Consumidores: comen a otros seres vivos. Descomponedores: reciclan los restos y devuelven los minerales al suelo.' },
      { title: 'Una cadena trófica', layout: 'titleOnly', bg: BG, back: kraft(), extra: [
        dg('chevrons', 'Bellota\nRatón de campo\nCulebra\nÁguila culebrera', 70, 210, 1140, 170, { oneByOne: true, colors: 'colorful', fontScale: 1.3 }),
        hand('las flechas indican hacia dónde va la energía →', 90, 410, 900, 50, 36, TER),
        on(card('Cada eslabón es un <b>nivel trófico</b>. Las cadenas reales rara vez tienen más de cuatro o cinco: la energía no da para más.', 90, 490, 760, 150, CARD, { color: INK, fontSize: 26, stroke: '#c9b88f', strokeWidth: 2 }), 'fade-up'),
        tape(760, 470, 120, 8)],
        notes: 'La cadena aparece eslabón a eslabón. El águila culebrera se alimenta casi solo de serpientes: un buen ejemplo de especialista.' },
      { title: 'La red trófica', layout: 'titleOnly', bg: BG, back: kraft(), extra: [
        ...Object.values(N).flatMap(([x, y, n]) => [shape('ellipse', x - 80, y - 30, 160, 60, CARD, { stroke: INK, strokeWidth: 2, sketch: true }),
          text(n, x - 80, y - 20, 160, 40, { fontSize: 22, fontWeight: 700, color: INK, textAlign: 'center' })]),
        ...EDGES.map(edge),
        hand('Un clic: las flechas aparecen una tras otra.', 920, 200, 300, 90, 30, DIM),
        on(card('Si un animal come de varias cadenas, las cadenas se cruzan y forman una <b>red</b>. Cuantas más conexiones, más estable es el ecosistema.', 920, 330, 300, 300, CARD, { color: INK, fontSize: 23, stroke: '#c9b88f', strokeWidth: 2 }), 'fade-left')],
        notes: 'Las flechas verdes salen de los productores; las terracota, de los consumidores. Preguntar: si desaparecen los conejos, ¿qué comerá el zorro? Tiene alternativas: por eso las redes aguantan mejor que las cadenas.' },
      { title: 'Solo pasa el 10 %', layout: 'titleOnly', bg: BG, back: kraft(), extra: [
        dg('pyramid', 'Águila\nZorro\nConejo\nHierba', 70, 180, 560, 460, { colors: 'colorful', fontScale: 1.3 }),
        tableBlock({ x: 680, y: 190, w: 530, h: 300, fontSize: 24, header: true, headBg: GR, headFg: '#ffffff', banded: true, band: OCH, stroke: '#c9b88f', colW: [5, 3],
          rows: [['Nivel', 'Energía (kcal)'], ['Productores', '10.000'], ['Consumidores 1.º', '=B2*0,1'], ['Consumidores 2.º', '=B3*0,1'], ['Consumidores 3.º', '=B4*0,1']] }),
        on(hand('El resto se gasta en moverse, respirar y mantener el calor del cuerpo.', 680, 520, 530, 110, 34, TER), 'fade-up')],
        notes: 'La tabla calcula cada nivel con =B2*0,1: de 10.000 kcal en las plantas solo llegan 10 al águila. Por eso hay muchas más plantas que conejos, y muchos más conejos que águilas. Cifras redondas, para el ejemplo.' },
      { title: 'Conejos y zorros', layout: 'titleOnly', bg: BG, back: kraft(), extra: [
        chartBlock({ x: 60, y: 170, w: 820, h: 480, chartType: 'line', color: OCH, grid: true, xTitle: 'año del censo', yTitle: 'individuos por km²', seriesName: 'Conejos',
          data: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y, i) => ({ label: String(y), value: [40, 62, 75, 58, 35, 28, 44, 66, 72, 50][i] })),
          series: [{ name: 'Zorros', color: TER, values: [4, 5, 8, 10, 8, 5, 4, 6, 9, 9] }] }),
        hand('Primero suben los conejos… y después, los zorros.', 910, 190, 310, 130, 36, INK),
        on(card('Cuando hay muchos zorros, cazan tantos conejos que estos bajan; sin comida, bajan también los zorros. Y vuelta a empezar.', 910, 340, 310, 290, CARD, { color: INK, fontSize: 23, stroke: '#c9b88f', strokeWidth: 2 }), 'fade-up')],
        notes: 'Datos inventados de un censo imaginario. La curva de los depredadores va siempre un poco por detrás de la de sus presas.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', question: '¿Qué papel tiene cada ser vivo del dibujo?', fontSize: 28, x: 60, y: 40, w: 1160, h: 640, image: WOOD,
        options: ['Productor', 'Consumidor primario', 'Consumidor secundario', 'Descomponedor', 'Consumidor terciario'],
        points: [{ x: 18, y: 36 }, { x: 43, y: 80 }, { x: 64, y: 78 }, { x: 85, y: 85 }, { x: 60, y: 17 }] })],
        notes: 'Actividad de etiquetar desde el móvil: la encina, el conejo, el zorro, las setas y el águila. Las setas son la pieza que más se olvida.' },
      { layout: 'blank', bg: BG, back: kraft(), transition: 'page', extra: [
        hand('Para pensar en grupo', 90, 110, 700, 60, 44, TER),
        text('¿Qué pasaría en el bosque si desaparecieran todos los zorros?', 90, 180, 760, 200, { fontFamily: H, fontSize: 50, fontWeight: 700, color: INK, lineHeight: 1.2 }),
        text(ul('Pensad en los conejos y en la hierba', 'Y en las águilas, que compiten con el zorro', 'Una frase de conclusión por grupo'), 90, 410, 700, 200, { fontSize: 28, color: INK }),
        timer(180, 900, 200, 280, { style: 'digital', color: TER, endText: '¡Puesta en común!' }),
        credits(['kh-Fox'], 90, 650, 1100, DIM)],
        notes: 'Tres minutos de debate en grupos con cuenta atrás. Respuesta esperada: suben los conejos, baja la hierba y el bosque puede empobrecerse. Ejemplo real: los lobos de Yellowstone.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · Microbes through a microscope's eyepiece: black around a glowing round field, curved text,
  // a Transform from ×40 to ×400, shapes of bacteria, good and bad, the yeast balloon in a chart.
  edu_bio_microbes: { name: 'Microbios: el mundo invisible', cat: 'edu', summary: 'Ocular de microscopio: texto curvo, Transformar de 40 a 400 aumentos, formas de bacterias, levadura en líneas, votación y Text Art', make: () => {
    const BG = '#0b0614', LAV = '#efe8ff', VI = '#7c4dff', PK = '#ff6fae', TE = '#2ec4b6', YE = '#ffd166', FG = '#f3eefe', DIM = '#a99bc9', H = FF.poppins;
    // The eyepiece: a round field of light, and a mask (the slide's black with a round hole) laid over what is inside.
    const CX = 340, CY = 430, R = 245, MX = 40, MY = 160, MW = 600, MH = 550;
    const field = () => shape('ellipse', CX - R, CY - R, 2 * R, 2 * R, LAV, { fill2: '#b9a6e6', gradType: 'radial' });
    const MASK = svgURL(MW, MH, `<path fill-rule="evenodd" fill="${BG}" d="M0 0 H${MW} V${MH} H0 Z M${CX - MX - R} ${CY - MY} a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0 Z"/>`
      + `<circle cx="${CX - MX}" cy="${CY - MY}" r="${R + 4}" fill="none" stroke="#3a2d5c" stroke-width="10"/>`);
    const mask = () => img(MASK, MX, MY, MW, MH, 'Ocular del microscopio', { fit: 'fill' });
    const hair = uid(), yeast = [uid(), uid(), uid(), uid(), uid()], YX = [[230, 520], [330, 600], [430, 500], [500, 590], [190, 610]];
    const BUGS = svgURL(900, 260, '<g fill="#7c4dff">' + [[60, 100], [100, 90], [80, 135], [125, 128], [45, 145], [105, 170], [150, 95]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20"/>`).join('') + '</g>'
      + '<g fill="#ff6fae">' + [[360, 70, 20], [420, 150, -30], [480, 90, 60], [390, 190, 10]].map(([x, y, r]) => `<rect x="${x - 45}" y="${y - 14}" width="90" height="28" rx="14" transform="rotate(${r} ${x} ${y})"/>`).join('') + '</g>'
      + '<g fill="none" stroke="#2ec4b6" stroke-width="12" stroke-linecap="round">' + [[640, 80], [690, 150], [660, 200]].map(([x, y]) => `<path d="M${x} ${y} q20 -30 40 0 t40 0 t40 0 t40 0"/>`).join('') + '</g>');
    const panel = (k) => svgURL(260, 220, `<rect width="260" height="220" rx="24" fill="#1a1030"/>` + (k === 0 ? [[90, 110], [130, 100], [110, 145], [150, 140], [75, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#7c4dff"/>`).join('')
      : k === 1 ? [[100, 80, 20], [160, 130, -30], [110, 160, 10]].map(([x, y, r]) => `<rect x="${x - 45}" y="${y - 14}" width="90" height="28" rx="14" fill="#ff6fae" transform="rotate(${r} ${x} ${y})"/>`).join('')
      : [[50, 90], [70, 150]].map(([x, y]) => `<path d="M${x} ${y} q20 -30 40 0 t40 0 t40 0 t40 0" fill="none" stroke="#2ec4b6" stroke-width="12" stroke-linecap="round"/>`).join('')));
    const eyeTitle = (t, sub) => [text(t, 700, 170, 520, 70, { fontFamily: H, fontSize: 44, fontWeight: 700, color: FG }), text(sub, 700, 240, 520, 40, { fontSize: 22, color: YE, letterSpacing: 3, fontWeight: 700 })];
    return numbered(build({ name: 'Microbios: el mundo invisible', palette: 'violet', fonts: 'friendly', title: { color: FG, size: 48, font: H }, body: { color: FG },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: [glow(600, 0, 800, '#2a1650', BG, 60)], extra: [
        text('CIENCIAS NATURALES · 1.º DE ESO', 80, 150, 560, 36, { fontSize: 20, letterSpacing: 5, color: PK, fontWeight: 700 }),
        text('Microbios', 72, 185, 620, 130, { fontFamily: H, fontSize: 104, fontWeight: 800, color: FG, lineHeight: 1.1 }),
        text('el mundo invisible', 80, 315, 600, 70, { fontFamily: H, fontSize: 48, fontWeight: 300, color: DIM }),
        text('Seres vivos tan pequeños que caben mil en el punto de esta i.', 80, 430, 520, 100, { fontSize: 30, color: FG }),
        shape('ellipse', 730, 140, 440, 440, LAV, { fill2: '#b9a6e6', gradType: 'radial', stroke: '#3a2d5c', strokeWidth: 14 }),
        after(img(BUGS, 760, 280, 380, 110, 'Bacterias de tres formas: cocos, bacilos y espirilos'), 'zoom-in', { duration: 900 }),
        text('OBJETIVO 40× · OCULAR 10× · AUMENTO TOTAL 400× · ', 700, 110, 500, 500, { fontSize: 22, curve: 100, color: YE, letterSpacing: 4, textAlign: 'center', fontWeight: 700 })],
        notes: 'Portada con forma de ocular: el texto curvo rodea el campo del microscopio y las bacterias aparecen al enfocar.' },
      { layout: 'blank', bg: BG, extra: [
        field(), keep(shape('rect', MX, CY - 12, MW, 24, '#7a5230', { opacity: 85 }), hair),
        ...YX.map(([x, y], i) => keep(shape('ellipse', x, y, 10, 8, '#c58b2a'), yeast[i])),
        mask(),
        text('Mirar con lupa no basta', 60, 60, 1160, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: FG }),
        ...eyeTitle('Aumento × 40', 'UN PELO Y LEVADURA DE PANADERÍA'),
        text('El pelo ya es una línea gruesa. Las levaduras son puntitos.', 700, 300, 520, 110, { fontSize: 30, color: FG }),
        text('¿Y las bacterias? Aún no se ven: hay que acercarse más…', 700, 430, 520, 110, { fontSize: 30, color: DIM })],
        notes: 'Primera vista, como en el microscopio del laboratorio con el objetivo pequeño. Al pasar de diapositiva, Transformar hace el zum.' },
      { layout: 'blank', bg: BG, autoAnimate: true, transition: 'fade', extra: [
        field(), keep(shape('rect', MX, CY - 230, MW, 200, '#7a5230', { opacity: 85 }), hair),
        ...YX.map(([x, y], i) => keep(shape('ellipse', x - 30, y - 30, 70, 56, '#c58b2a', { stroke: '#8c5d14', strokeWidth: 3 }), yeast[i])),
        ...[[300, 470, 20], [380, 560, -30], [470, 455, 60], [260, 600, 10], [550, 520, -15], [400, 640, 40]].map(([x, y, r]) => shape('rounded', x, y, 26, 9, PK, { rotation: r, radius: 5 })),
        mask(),
        text('Mirar con lupa no basta', 60, 60, 1160, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: FG }),
        ...eyeTitle('Aumento × 400', 'DIEZ VECES MÁS CERCA'),
        text('El pelo llena el campo. Las levaduras son células ovaladas.', 700, 300, 520, 110, { fontSize: 30, color: FG }),
        on(text('Por fin, las <b style="color:#ff6fae">bacterias</b>: bastoncitos rosas de unas 2 µm.', 700, 430, 520, 110, { fontSize: 30, color: FG }), 'fade-up'),
        on(text('1 µm (micra) = una milésima de milímetro', 700, 570, 520, 50, { fontSize: 22, color: YE }), 'fade-in')],
        notes: 'Transformar: el pelo y las levaduras crecen diez veces y aparecen las bacterias. Un pelo mide unas 70 µm de grosor; una levadura, unas 5 µm; una bacteria, 1 o 2 µm.' },
      { title: 'Tres formas de bacteria', layout: 'titleOnly', bg: BG, extra: [
        ...[['Cocos', 'Redondas. Algunas forman cadenas o racimos.', 'en la piel y la garganta', VI], ['Bacilos', 'Con forma de bastón.', 'en el yogur (lactobacilos)', PK], ['Espirilos', 'En espiral, como un muelle.', 'en el agua de charcas', TE]]
          .flatMap(([n, d, w, c], i) => { const x = 70 + i * 390;
            return [on(img(panel(i), x + 55, 190, 260, 220, n), 'zoom-in', { sound: 'pop' }),
              along(text(n, x, 430, 370, 60, { fontFamily: H, fontSize: 40, fontWeight: 700, color: c, textAlign: 'center' }), 'fade-up'),
              along(text(d, x + 20, 495, 330, 80, { fontSize: 25, color: FG, textAlign: 'center' }), 'fade-up'),
              along(text(w, x + 20, 585, 330, 40, { fontSize: 21, color: DIM, textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Un clic por forma. Los nombres de muchas bacterias delatan su forma: Streptococcus (cocos en cadena), Lactobacillus (bacilos de la leche).' },
      { title: '¿Amigos o enemigos?', layout: 'titleOnly', bg: BG, extra: [
        shape('rect', 638, 190, 4, 440, '#3a2d5c'),
        text('NOS AYUDAN', 70, 185, 540, 50, { fontFamily: H, fontSize: 30, fontWeight: 800, color: TE, letterSpacing: 3 }),
        text('NOS FASTIDIAN', 680, 185, 540, 50, { fontFamily: H, fontSize: 30, fontWeight: 800, color: PK, letterSpacing: 3 }),
        ...[['Convierten la leche en yogur y queso', 'cake'], ['Hacen subir la masa del pan (levaduras)', 'pizza'], ['Ayudan a digerir en el intestino', 'smile'], ['Convierten los restos en abono', 'recycle']].flatMap(([t, ic], i) => [
          on(icon(ic, 70, 260 + i * 95, 44, TE), 'fade-right'), along(text(t, 130, 258 + i * 95, 480, 60, { fontSize: 25, color: FG }), 'fade-right')]),
        ...[['Caries en los dientes', 'frown'], ['Intoxicaciones por comida mal guardada', 'triangle-alert'], ['Infecciones como la otitis', 'thermometer'], ['Estropean los alimentos', 'ban']].flatMap(([t, ic], i) => [
          on(icon(ic, 680, 260 + i * 95, 44, PK), 'fade-left'), along(text(t, 740, 258 + i * 95, 480, 60, { fontSize: 25, color: FG }), 'fade-left')])],
        notes: 'Alternar un clic a cada lado. La mayoría de los microbios son inofensivos o útiles; solo una pequeña parte causa enfermedades.' },
      { title: 'Experimento: la levadura infla un globo', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 60, y: 170, w: 800, h: 480, chartType: 'line', color: TE, grid: true, xTitle: 'minutos', yTitle: 'contorno del globo (cm)', seriesName: 'Agua tibia (35 °C)', yMin: 0,
          data: [0, 10, 20, 30, 40, 50, 60].map((m, i) => ({ label: String(m), value: [0, 4, 11, 19, 26, 31, 34][i] })),
          series: [{ name: 'Agua fría (10 °C)', color: VI, values: [0, 1, 2, 4, 6, 8, 10] }, { name: 'Agua hirviendo', color: PK, values: [0, 0, 0, 0, 0, 0, 0] }] }),
        text('Botella con agua, azúcar y levadura; un globo en la boca.', 900, 185, 320, 120, { fontSize: 25, color: FG }),
        on(card('La levadura come azúcar y suelta <b>CO₂</b>: el gas infla el globo. Con calor moderado trabaja más; el agua hirviendo la mata.', 900, 330, 320, 290, '#1a1030', { color: FG, fontSize: 23, stroke: VI, strokeWidth: 2 }), 'fade-up')],
        notes: 'Datos inventados de un experimento de clase. Es la misma fermentación que hace subir el pan y deja los agujeritos de la miga.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', question: '¿Dónde crees que hay más bacterias?', fontSize: 36, x: 80, y: 60, w: 1120, h: 600,
        options: ['El móvil', 'El pomo del baño', 'El teclado', 'La tabla de cortar'] })],
        notes: 'Votación de opinión, sin respuesta correcta en pantalla. En muchos muestreos, la tabla de cortar y el móvil salen peor que el pomo del baño, que se limpia más a menudo.' },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(340, 60, 600, '#2a1650', BG, 70)], extra: [
        text('Nunca estás solo', 90, 200, 1100, 160, { fontFamily: H, fontSize: 104, fontWeight: 800, wordart: 'purple', textAlign: 'center' }),
        text('En tu cuerpo viven unos <b style="color:#ffd166">38 billones</b> de bacterias: más o menos tantas como células tuyas.', 190, 400, 900, 110, { fontSize: 32, color: FG, textAlign: 'center' }),
        img(BUGS, 465, 560, 350, 100, 'Bacterias de tres formas')],
        notes: 'Cierre con Text Art. La cifra es una estimación científica reciente; la mayoría de esas bacterias viven en el intestino y nos ayudan.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Breathing in an open sky: soft blue, clouds, lungs that breathe, the path of the air one
  // step at a time, breathing in and out with Transform, air in and out in two doughnuts, a 3D
  // bottle for the experiment with averages, a one‑minute count and a quiz.
  edu_bio_respiration: { name: 'Respirar: el viaje del aire', cat: 'edu', summary: 'Cielo abierto: pulmones que respiran, camino del aire, Transformar al inspirar y espirar, dos donas, botella 3D, cuenta atrás y concurso', make: () => {
    const SKY = '#dff1fb', NAVY = '#0d3b66', CO = '#ee6c4d', TE = '#1b998b', LUNG = '#f4a3a8', DLUNG = '#d9667a', DIM = '#4d6b85', H = "Georgia, serif";
    const clouds = () => [glow(-200, -260, 800, '#ffffff', SKY, 70), ...[[900, 40, 220], [1040, 90, 160]].map(([x, y, w]) => shape('cloud', x, y, w, w * 0.55, '#ffffff', { opacity: 80 }))];
    // The lungs: trachea, bronchi and two lobes (the left one smaller, for the heart).
    const LUNGS = svgURL(400, 420, '<path d="M200 0 V120" stroke="#9fb7c9" stroke-width="30" stroke-linecap="round"/><path d="M200 115 L140 175 M200 115 L260 175" stroke="#9fb7c9" stroke-width="20" stroke-linecap="round"/>'
      + '<path d="M150 120 C60 130 20 250 30 360 C35 410 120 410 170 380 C190 300 185 200 150 120Z" fill="#f4a3a8" stroke="#d9667a" stroke-width="5"/>'
      + '<path d="M250 120 C340 130 380 250 370 360 C365 410 290 405 245 375 C235 330 250 300 230 270 C215 220 225 160 250 120Z" fill="#f4a3a8" stroke="#d9667a" stroke-width="5"/>'
      + '<path d="M140 175 L110 240 M110 240 L80 280 M110 240 L125 300 M260 175 L290 240 M290 240 L320 285 M290 240 L275 300" stroke="#d9667a" stroke-width="6" stroke-linecap="round" fill="none"/>');
    const lungId = uid(), diaId = uid(), capId = uid();
    const breathe = (big) => [keep(img(LUNGS, big ? 80 : 110, big ? 170 : 200, big ? 400 : 340, big ? 420 : 357, 'Pulmones con la tráquea y los bronquios'), lungId),
      keep(shape('custom', 60, big ? 615 : 545, 440, big ? 30 : 100, 'none', { path: 'M0 100 Q50 0 100 100', stroke: CO, strokeWidth: 8 }), diaId),
      keep(text('diafragma', 200, big ? 655 : 650, 160, 40, { fontSize: 20, color: CO, textAlign: 'center' }), capId)];
    return numbered(build({ name: 'Respirar: el viaje del aire', palette: 'grayscale', fonts: 'websafe', title: { color: NAVY, size: 48, font: H }, body: { color: NAVY },
      decor: () => [] }, [
      { layout: 'blank', bg: SKY, back: clouds(), extra: [
        text('BIOLOGÍA · 3.º DE ESO · APARATO RESPIRATORIO', 90, 150, 700, 36, { fontSize: 18, letterSpacing: 4, color: TE, fontWeight: 700 }),
        text('Respirar', 82, 185, 680, 150, { fontFamily: H, fontSize: 120, color: NAVY, lineHeight: 1.1 }),
        text('el viaje del aire', 90, 335, 680, 80, { fontFamily: H, fontSize: 56, fontStyle: 'italic', color: CO }),
        text('Unas 20.000 veces al día, sin pensarlo.', 90, 460, 600, 100, { fontSize: 30, color: DIM }),
        withAnims(img(LUNGS, 790, 140, 380, 400, 'Pulmones'), A('pulse', { start: 'afterPrev', duration: 3500 }), A('pulse', { start: 'afterPrev', duration: 3500 }))],
        notes: 'Los pulmones «respiran» dos veces al llegar (énfasis lento). Pedir a la clase que respire al mismo ritmo.' },
      { title: 'El camino del aire', layout: 'titleOnly', bg: SKY, back: clouds(), extra: [
        img(LUNGS, 80, 170, 400, 420, 'Pulmones'),
        ...[['Nariz', 'filtra, calienta y humedece el aire'], ['Faringe y laringe', 'el cruce con la comida; la laringe tiene la voz'], ['Tráquea', 'un tubo reforzado con anillos'], ['Bronquios y bronquiolos', 'se ramifican como un árbol al revés'], ['Alvéolos', 'saquitos donde el oxígeno pasa a la sangre']]
          .flatMap(([n, d], i) => { const y = 180 + i * 94, c = [TE, '#3a8fb7', NAVY, '#9b5de5', CO][i];
            return [on(shape('ellipse', 540, y + 8, 64, 64, c), 'fade-left', { sound: i ? undefined : 'pop' }), along(text(String(i + 1), 540, y + 8, 64, 64, { fontSize: 30, fontWeight: 700, color: '#ffffff', textAlign: 'center', vAlign: 'middle' }), 'fade-left'),
              along(text(`<b style="font-family:Georgia,serif;font-size:30px;color:${c}">${n}</b><br>${d}`, 625, y, 600, 84, { fontSize: 22, color: NAVY, lineHeight: 1.2 }), 'fade-left')]; })],
        notes: 'Los escalones aparecen uno a uno, del exterior hacia dentro. En los pulmones hay unos 300 millones de alvéolos: extendidos, ocuparían media pista de tenis.' },
      { title: 'Inspirar', layout: 'titleOnly', bg: SKY, back: clouds(), extra: [
        ...breathe(true),
        text('El diafragma <b>baja</b> y las costillas se abren.', 580, 200, 640, 100, { fontSize: 32, color: NAVY }),
        text('El pecho se hace más grande: el aire <b>entra</b> solo, como en un fuelle.', 580, 320, 640, 130, { fontSize: 32, color: NAVY }),
        on(card('Inspiración: un movimiento <b>activo</b>, los músculos trabajan.', 580, 490, 640, 110, '#ffffff', { color: TE, fontSize: 28, vAlign: 'middle' }), 'fade-up')],
        notes: 'Pon la mano en el abdomen y respira hondo: al inspirar, se hincha. Es el diafragma que baja empujando las vísceras.' },
      { title: 'Espirar', layout: 'titleOnly', bg: SKY, back: clouds(), autoAnimate: true, transition: 'fade', extra: [
        ...breathe(false),
        text('El diafragma <b>sube</b> y las costillas se cierran.', 580, 200, 640, 100, { fontSize: 32, color: NAVY }),
        text('El pecho se hace más pequeño: el aire <b>sale</b> empujado.', 580, 320, 640, 130, { fontSize: 32, color: NAVY }),
        on(card('Espiración: en reposo es <b>pasiva</b>, basta con relajar los músculos.', 580, 490, 640, 110, '#ffffff', { color: CO, fontSize: 28, vAlign: 'middle' }), 'fade-up')],
        notes: 'Transformar: los pulmones se encogen y el diafragma sube. Ir y volver entre esta diapositiva y la anterior varias veces es como ver respirar.' },
      { title: '¿Qué cambia en el aire?', layout: 'titleOnly', bg: SKY, back: clouds(), extra: [
        text('Aire que entra', 70, 175, 540, 50, { fontFamily: H, fontSize: 32, color: NAVY, textAlign: 'center' }),
        text('Aire que sale', 670, 175, 540, 50, { fontFamily: H, fontSize: 32, color: NAVY, textAlign: 'center' }),
        chartBlock({ x: 70, y: 230, w: 540, h: 360, chartType: 'doughnut', data: [{ label: 'Nitrógeno', value: 78, color: '#9fb7c9' }, { label: 'Oxígeno', value: 21, color: TE }, { label: 'CO₂ (casi nada)', value: 0.04, color: CO }, { label: 'Otros gases', value: 0.96, color: '#c9d6e0' }] }),
        on(chartBlock({ x: 670, y: 230, w: 540, h: 360, chartType: 'doughnut', data: [{ label: 'Nitrógeno', value: 78, color: '#9fb7c9' }, { label: 'Oxígeno', value: 16, color: TE }, { label: 'CO₂', value: 4, color: CO }, { label: 'Vapor y otros', value: 2, color: '#c9d6e0' }] }), 'fade-left'),
        text('El nitrógeno entra y sale igual. Nos quedamos oxígeno y devolvemos CO₂ y vapor de agua.', 140, 610, 1000, 70, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Valores aproximados. Echa el aliento en un espejo frío: el vaho es el vapor de agua que sale. Con agua de cal, el CO₂ del aliento la enturbia.' },
      { title: 'Experimento: ¿cuánto aire te cabe?', layout: 'titleOnly', bg: SKY, back: clouds(), extra: [
        model('kh-WaterBottle', 70, 170, 260, 470, { caption: '', autoRotate: true, view: 'front', motion: 'float' }),
        text(ul('Llena una botella de 5 l de agua', 'Ponla boca abajo en un barreño', 'Sopla por un tubo todo el aire que puedas', 'Mide el agua que ha salido'), 350, 180, 420, 400, { fontSize: 25, color: NAVY }),
        tableBlock({ x: 800, y: 190, w: 420, h: 300, fontSize: 24, header: true, headBg: TE, headFg: '#ffffff', banded: true, band: TE, stroke: '#9fb7c9', colW: [3, 2],
          rows: [['Persona', 'Litros'], ['Ana', '3,1'], ['Bruno', '3,6'], ['Carla', '2,8'], ['Media', '=PROMEDIO(B2:B4)']] }),
        on(card('Es la <b>capacidad vital</b>: lo máximo que puedes soltar tras inspirar a fondo.', 800, 515, 420, 120, '#ffffff', { color: NAVY, fontSize: 22 }), 'fade-up')],
        notes: 'La botella 3D gira despacio. La media se calcula sola con =PROMEDIO(B2:B4). Datos de ejemplo inventados; en adolescentes suele estar entre 2,5 y 4 litros.' },
      { title: 'Respiraciones por minuto', layout: 'titleOnly', bg: SKY, back: clouds(), extra: [
        timer(60, 80, 200, 300, { color: TE, endText: '¿Cuántas has contado?' }),
        text('Cuenta en silencio cuántas veces respiras en un minuto.', 60, 530, 340, 100, { fontSize: 24, color: NAVY, textAlign: 'center' }),
        chartBlock({ x: 440, y: 180, w: 780, h: 470, chartType: 'bar', color: NAVY, dataLabels: true, grid: true, yTitle: 'respiraciones por minuto',
          data: [['Bebé', 40], ['Niño de 6 años', 22], ['Adolescente', 16], ['Adulto', 14], ['Deportista en reposo', 10]].map(([label, value]) => ({ label, value })) })],
        notes: 'Cuenta atrás de un minuto. Valores típicos en reposo, aproximados. Cuanto más pequeño es el cuerpo, más deprisa respira.' },
      { layout: 'blank', bg: SKY, extra: [quiz('¿Dónde pasa el oxígeno del aire a la sangre?', ['En la tráquea', 'En los bronquios', 'En los alvéolos', 'En el diafragma'], 2)],
        notes: 'Concurso. Los alvéolos son sacos diminutos rodeados de capilares: sus paredes son tan finas que los gases las atraviesan.' },
      { layout: 'blank', bg: NAVY, transition: 'fade', back: [glow(340, 60, 600, '#1b5a8c', NAVY, 70)], extra: [
        withAnims(shape('ellipse', 540, 120, 200, 200, TE, { fill2: '#7fd1c7', gradType: 'radial', opacity: 85 }), A('pulse', { start: 'afterPrev', duration: 8000 }), A('pulse', { start: 'afterPrev', duration: 8000 }), A('pulse', { start: 'afterPrev', duration: 8000 })),
        text('Respira hondo', 140, 360, 1000, 100, { fontFamily: H, fontSize: 72, color: '#ffffff', textAlign: 'center' }),
        text('Inspira mientras el círculo crece; suelta el aire mientras se encoge.', 140, 470, 1000, 60, { fontSize: 28, color: '#bcd3e6', textAlign: 'center' })],
        notes: 'Cierre tranquilo: tres respiraciones lentas guiadas por el círculo (énfasis de 8 segundos). Respirar despacio calma el corazón: lo comprobamos con el pulso.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · From flower to fruit in a spring meadow: cream and pastel, hills and flowers, a bee that
  // flies a path, the parts of a flower, a picture to label, pollinators in a treemap, a flower that
  // turns into a fruit with Transform, a 3D avocado, a year of an almond tree and a word cloud.
  edu_bio_pollination: { name: 'De la flor al fruto', cat: 'edu', summary: 'Prado de primavera: abeja que vuela, partes de la flor, etiquetar, treemap, Transformar de flor a fruto, aguacate 3D, cronología y nube', make: () => {
    const BG = '#fff8e7', INK = '#3a2e22', YE = '#f7b801', PK = '#ff7eb6', LF = '#5bb85c', DLF = '#3d8b40', SK = '#cbe8ff', DIM = '#7a6a58', H = FF.pacifico;
    const meadow = () => [shape('ellipse', -200, 560, 900, 360, '#d6efc0'), shape('ellipse', 500, 590, 1000, 340, '#c4e6a8')];
    const BEE = svgURL(160, 120, '<ellipse cx="60" cy="40" rx="30" ry="22" fill="#e8f4ff" fill-opacity=".85" stroke="#9cc" stroke-width="2"/><ellipse cx="95" cy="38" rx="26" ry="20" fill="#e8f4ff" fill-opacity=".85" stroke="#9cc" stroke-width="2"/>'
      + '<ellipse cx="80" cy="75" rx="52" ry="34" fill="#f7b801"/><rect x="62" y="42" width="14" height="66" fill="#2b2118"/><rect x="92" y="44" width="14" height="62" fill="#2b2118"/>'
      + '<circle cx="132" cy="70" r="20" fill="#2b2118"/><circle cx="139" cy="64" r="5" fill="#fff"/><path d="M28 75 L10 75" stroke="#2b2118" stroke-width="5"/>');
    // A flower in section: petals, sepals, stamens (filament and anther), and the pistil (stigma, style, ovary).
    const FLOWER = svgURL(500, 500, '<path d="M250 470 V400" stroke="#3d8b40" stroke-width="16"/>'
      + '<ellipse cx="120" cy="230" rx="110" ry="60" fill="#ff7eb6" transform="rotate(-35 120 230)"/><ellipse cx="380" cy="230" rx="110" ry="60" fill="#ff7eb6" transform="rotate(35 380 230)"/>'
      + '<path d="M170 400 Q150 350 200 330 L230 380 Z M330 400 Q350 350 300 330 L270 380 Z" fill="#5bb85c"/>'
      + '<ellipse cx="250" cy="370" rx="55" ry="45" fill="#7ccf6b" stroke="#3d8b40" stroke-width="4"/><circle cx="232" cy="370" r="10" fill="#fff8e7"/><circle cx="268" cy="370" r="10" fill="#fff8e7"/>'
      + '<rect x="243" y="90" width="14" height="240" fill="#7ccf6b"/><ellipse cx="250" cy="80" rx="30" ry="20" fill="#3d8b40"/>'
      + '<path d="M210 330 Q180 230 160 140 M290 330 Q320 230 340 140" stroke="#b08a3a" stroke-width="6" fill="none"/><ellipse cx="158" cy="125" rx="16" ry="26" fill="#f7b801"/><ellipse cx="342" cy="125" rx="16" ry="26" fill="#f7b801"/>');
    const P = [uid(), uid(), uid(), uid()], ovary = uid(), stem = uid();
    const hand = (t, x, y, w, h, size, color = DIM, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.3, ...p });
    const petal = (i, x, y, rot, op = 100) => keep(shape('ellipse', x, y, 150, 80, PK, { rotation: rot, opacity: op, stroke: '#e0559a', strokeWidth: 2 }), P[i]);
    return numbered(build({ name: 'De la flor al fruto', palette: 'forest', fonts: 'friendly', title: { color: DLF, size: 44, font: H }, body: { color: INK },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: [shape('rect', 0, 0, 1280, 720, SK, { fill2: BG, gradAngle: 180 }), ...meadow()], extra: [
        text('CIENCIAS NATURALES · 2.º DE PRIMARIA Y 1.º DE ESO', 90, 120, 800, 36, { fontSize: 20, letterSpacing: 3, color: DLF, fontWeight: 700 }),
        hand('De la flor<br>al fruto', 84, 150, 660, 280, 92, INK, { lineHeight: 1.35 }),
        text('Cómo una abeja, un poco de polen y unas semanas convierten una flor en una manzana', 90, 440, 620, 100, { fontSize: 28, color: DIM }),
        ...[[880, 420, PK], [1020, 470, '#b48cff'], [1150, 410, YE]].flatMap(([x, y, c]) => [shape('rect', x + 27, y + 60, 8, 200, DLF), shape('star6', x, y, 62, 62, c), shape('ellipse', x + 21, y + 21, 20, 20, YE)]),
        after(img(BEE, 760, 190, 130, 98, 'Abeja'), 'path', { points: [[0, 0], [90, -40], [180, 40], [260, 0], [300, 190]], duration: 3600, sound: 'whoosh' })],
        notes: 'La abeja vuela por un recorrido y se posa en la primera flor. Pregunta: ¿por qué visitan las flores las abejas? (Buscan néctar; lo del polen es un «accidente» muy útil).' },
      { title: 'Las partes de la flor', layout: 'titleOnly', bg: BG, back: meadow(), extra: [
        img(FLOWER, 340, 160, 500, 500, 'Flor cortada por la mitad'),
        ...[['Pétalo', 'atrae a los insectos', 60, 250, 460, 390, '#d63d86'], ['Antera', 'fabrica el polen', 60, 380, 495, 290, '#b08a3a'], ['Sépalo', 'protege el capullo', 60, 520, 525, 535, DLF],
          ['Estigma', 'recoge el polen', 900, 210, 622, 240, DLF], ['Estilo', 'el tubo hasta el ovario', 900, 340, 600, 380, DLF], ['Ovario', 'guarda los óvulos', 900, 470, 645, 530, DLF]]
          .flatMap(([n, d, x, y, px, py, c], i) => [on(text(`<b style="color:${c}">${n}</b><br><span style="font-size:20px;color:${DIM}">${d}</span>`, x, y, 280, 80, { fontSize: 28, color: INK, textAlign: x < 600 ? 'right' : 'left' }), x < 600 ? 'fade-right' : 'fade-left'),
            along(lines([[x < 600 ? x + 290 : x - 10, y + 22], [px, py]], c, 2), 'fade-in')])],
        notes: 'Un clic por parte. Los estambres (filamento y antera) son la parte masculina; el pistilo (estigma, estilo y ovario), la femenina. Muchas flores tienen las dos.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', question: 'Pon nombre a las partes de la flor', fontSize: 28, x: 60, y: 40, w: 1160, h: 640, image: FLOWER,
        options: ['Pétalo', 'Antera', 'Estigma', 'Sépalo', 'Ovario'], points: [{ x: 24, y: 46 }, { x: 32, y: 25 }, { x: 50, y: 16 }, { x: 35, y: 78 }, { x: 50, y: 70 }] })],
        notes: 'Actividad de etiquetar el mismo dibujo desde el móvil. Quien confunda estigma y antera: el polen sale de la antera y llega al estigma.' },
      { title: 'El viaje del polen', layout: 'titleOnly', bg: BG, back: meadow(), extra: [
        ...[[120, PK], [900, '#b48cff']].flatMap(([x, c]) => [shape('rect', x + 77, 420, 10, 220, DLF), shape('star6', x, 330, 170, 170, c), shape('ellipse', x + 60, 390, 50, 50, YE)]),
        hand('flor A', 140, 520, 130, 50, 30, DIM, { textAlign: 'center' }), hand('flor B', 920, 520, 130, 50, 30, DIM, { textAlign: 'center' }),
        lines([[205, 349], [405, 229], [655, 289], [825, 209], [985, 349]], DIM, 2, false, { dash: 'dash', opacity: 50 }),
        on(img(BEE, 140, 300, 130, 98, 'Abeja'), 'path', { points: [[0, 0], [200, -120], [450, -60], [620, -140], [780, 0]], duration: 3800, sound: 'whoosh' }),
        along(shape('ellipse', 180, 380, 16, 16, YE, { stroke: '#b08a3a', strokeWidth: 2 }), 'path', { points: [[0, 0], [200, -120], [450, -60], [620, -140], [780, 0]], duration: 3800 }),
        ...['1 · Busca néctar en la flor A', '2 · Se le pega el polen de las anteras', '3 · Lo deja en el estigma de la flor B'].map((t, i) =>
          on(text(t, 380 + 0 * i, 470 + i * 50, 520, 46, { fontSize: 25, color: INK, fontWeight: 700 }), 'fade-up'))],
        notes: 'Clic: la abeja vuela de la flor A a la B llevando un grano de polen (los dos recorridos van a la vez). Después, los tres pasos. Esto es la polinización cruzada.' },
      { title: 'Quién visita el romero', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 60, y: 170, w: 760, h: 480, chartType: 'treemap', dataLabels: true,
          data: [['Abejas', 46, YE], ['Abejorros', 18, '#e08a2e'], ['Moscas', 12, LF], ['Mariposas', 7, PK], ['Escarabajos', 4, '#8a6d4a']].map(([label, value, color]) => ({ label, value, color })) }),
        hand('recuento de la clase', 860, 180, 360, 60, 30, DLF),
        text('Visitas a un romero del patio durante una hora.', 860, 250, 360, 90, { fontSize: 26, color: INK }),
        on(card('Las abejas hacen más de la mitad del trabajo, pero no están solas: moscas, mariposas y escarabajos también polinizan.', 860, 370, 360, 260, '#ffffff', { color: INK, fontSize: 23, stroke: LF, strokeWidth: 2 }), 'fade-up')],
        notes: 'Datos inventados de un recuento de ejemplo. Propuesta: hacer el recuento de verdad en primavera y comparar con estos.' },
      { title: 'Después de la polinización…', layout: 'titleOnly', bg: BG, back: meadow(), extra: [
        keep(shape('rect', 495, 470, 14, 180, DLF), stem),
        petal(0, 330, 300, -30), petal(1, 520, 300, 30), petal(2, 350, 410, 20), petal(3, 500, 410, -20),
        keep(shape('ellipse', 465, 360, 74, 74, '#7ccf6b', { stroke: DLF, strokeWidth: 3 }), ovary),
        text('El grano de polen baja por el estilo hasta el ovario y fecunda un óvulo.', 800, 220, 420, 160, { fontSize: 28, color: INK }),
        on(hand('Ahora, ¡a esperar!', 800, 420, 420, 70, 40, '#d63d86'), 'fade-up')],
        notes: 'Una flor ya polinizada. Al pasar a la siguiente diapositiva, Transformar hace caer los pétalos y engorda el ovario: así nace el fruto.' },
      { title: '…el ovario se hace fruto', layout: 'titleOnly', bg: BG, back: meadow(), autoAnimate: true, transition: 'fade', extra: [
        keep(shape('rect', 495, 170, 14, 140, '#8a6d4a'), stem),
        petal(0, 120, 560, -80, 70), petal(1, 260, 585, 70, 70), petal(2, 560, 600, 10, 70), petal(3, 680, 570, -60, 70),
        keep(shape('ellipse', 400, 290, 210, 230, '#d94f4f', { stroke: '#a33434', strokeWidth: 3, fill2: '#ff8a7a', gradType: 'radial' }), ovary),
        text('Ovario → <b>fruto</b><br>Óvulos → <b>semillas</b>', 800, 200, 420, 110, { fontSize: 30, color: INK }),
        model('kh-Avocado', 850, 320, 300, 290, { caption: '', autoRotate: true, view: 'three' }),
        hand('el aguacate: un fruto con una sola semilla', 800, 600, 420, 50, 22, DIM, { textAlign: 'center' })],
        notes: 'Transformar: los pétalos caen al suelo y el ovario crece hasta ser una manzana. El aguacate en 3D es otro fruto: dentro tiene una única semilla, el hueso.' },
      { title: 'Un año en el almendro', layout: 'titleOnly', bg: BG, back: meadow(), extra: [
        dg('timeline', 'Febrero\n  Florece, antes que las hojas\nMarzo\n  Abejas: polinización\nAbril\n  Caen los pétalos; cuaja el fruto\nAgosto\n  Se recogen las almendras', 70, 190, 1140, 360, { oneByOne: true, colors: 'colorful', textColor: INK })],
        notes: 'El almendro es de los primeros en florecer: si hiela durante la floración, se pierde la cosecha. Muchos agricultores alquilan colmenas en marzo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', question: '¿Qué harías para ayudar a los polinizadores? Escribe una palabra', options: [], fontSize: 36, x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras. Ideas: flores, hoteles de insectos, no usar insecticidas, agua, setos. Cierre: sin polinizadores no habría ni manzanas ni almendras.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · Adaptation on a nautical chart: a night-blue sea chart with contour lines and a compass rose,
  // a ship that sails a drawn route, four finch beaks, the drought in bars and inheritance in dots,
  // the cycle of natural selection, a beak that grows with Transform and a quiz.
  edu_bio_evolution: { name: 'Adaptación: el pico de los pinzones', cat: 'edu', summary: 'Carta náutica nocturna: barco que navega una ruta, picos dibujados, barras de la sequía, dispersión, ciclo, Transformar del pico y concurso', make: () => {
    const BG = '#13293d', CR = '#efe6d2', SAND = '#d9c08f', LINE = '#3b5a75', RED = '#e07a5f', YE = '#f2cc8f', DIM = '#9fb3c4', H = FF.merri;
    const CHART = svgURL(1280, 720, Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100 + 40}" y1="0" x2="${i * 100 + 40}" y2="720" stroke="#2b4760" stroke-width="1"/>`).join('')
      + Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 100 + 60}" x2="1280" y2="${i * 100 + 60}" stroke="#2b4760" stroke-width="1"/>`).join('')
      + '<rect x="20" y="20" width="1240" height="680" fill="none" stroke="#3b5a75" stroke-width="3"/><rect x="30" y="30" width="1220" height="660" fill="none" stroke="#3b5a75" stroke-width="1"/>');
    const sea = () => [img(CHART, 0, 0, 1280, 720, 'Cuadrícula de carta náutica', { fit: 'fill' })];
    const ROSE = svgURL(200, 200, '<circle cx="100" cy="100" r="90" fill="none" stroke="#9fb3c4" stroke-width="2"/><circle cx="100" cy="100" r="70" fill="none" stroke="#9fb3c4" stroke-width="1"/>'
      + '<path d="M100 10 L112 100 L100 190 L88 100 Z" fill="#efe6d2"/><path d="M10 100 L100 88 L190 100 L100 112 Z" fill="#9fb3c4"/><path d="M100 10 L112 100 L88 100 Z" fill="#e07a5f"/>'
      + '<text x="100" y="8" font-family="serif" font-size="18" fill="#efe6d2" text-anchor="middle">N</text>');
    const island = (x, y, w, h, rot = 0) => shape('cloud', x, y, w, h, SAND, { rotation: rot, stroke: '#b89b62', strokeWidth: 3 });
    // A finch's head with a beak of a given depth and length.
    const finch = (depth, len, color = '#5b4636') => svgURL(240, 200, `<circle cx="90" cy="100" r="70" fill="${color}"/><circle cx="110" cy="80" r="9" fill="#fff"/><circle cx="112" cy="80" r="5" fill="#111"/>`
      + `<path d="M150 ${100 - depth / 2} Q${150 + len * 0.6} ${100 - depth / 3} ${150 + len} 104 Q${150 + len * 0.6} ${100 + depth / 3} 150 ${100 + depth / 2} Z" fill="#e7c48a" stroke="#8a6d3b" stroke-width="3"/>`);
    const head = uid(), beak = uid(), eye = uid(), yr = uid();
    const route = [[0, 0], [120, -60], [300, -40], [420, 60], [560, 40]];
    return numbered(build({ name: 'Adaptación: el pico de los pinzones', palette: 'revela', fonts: 'editorial', title: { color: YE, size: 46, font: H }, body: { color: CR },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: sea(), extra: [
        text('BIOLOGÍA · 4.º DE ESO · EVOLUCIÓN', 90, 110, 600, 36, { fontSize: 20, letterSpacing: 4, color: RED, fontWeight: 700 }),
        text('Adaptación', 84, 150, 700, 120, { fontFamily: H, fontSize: 88, fontWeight: 700, color: CR, lineHeight: 1.1 }),
        text('el pico de los pinzones', 90, 265, 640, 70, { fontFamily: H, fontSize: 44, fontStyle: 'italic', color: YE }),
        text('Unas islas, unos pájaros y una sequía que mostraron la evolución en directo', 90, 360, 560, 110, { fontSize: 28, color: DIM }),
        island(700, 470, 160, 100, -10), island(880, 380, 120, 80, 15), island(1020, 470, 180, 110, 5), island(980, 290, 80, 60), island(760, 330, 70, 50, -20),
        img(ROSE, 1030, 90, 170, 170, 'Rosa de los vientos'),
        after(lines(route.map(([x, y]) => [640 + x, 600 + y]), YE, 3, false, { dash: 'dash' }), 'draw', { duration: 2200 }),
        along(icon('ship', 620, 575, 44, CR), 'path', { points: route, duration: 2200 }),
        text('Archipiélago de Galápagos · Pacífico', 640, 640, 560, 36, { fontSize: 20, color: DIM, fontStyle: 'italic' })],
        notes: 'Portada en carta náutica: la ruta del barco se dibuja y el barco la recorre. Darwin pasó por estas islas en 1835; los pinzones le hicieron pensar.' },
      { title: 'Un archipiélago, muchos picos', layout: 'titleOnly', bg: BG, back: sea(), extra: [
        ...[['Grueso y corto', 'parte semillas duras', 70, 40], ['Fino y puntiagudo', 'caza insectos', 20, 60], ['Largo y curvo', 'liba flores de cactus', 28, 80], ['Recto y fuerte', 'usa una espina como herramienta', 34, 52]]
          .flatMap(([n, d, dep, len], i) => { const x = 70 + i * 290;
            return [on(shape('rounded', x, 190, 270, 440, '#1b3650', { stroke: LINE, strokeWidth: 2 }), 'fade-up'),
              along(img(finch(dep, len, ['#5b4636', '#7a6a4f', '#4a4a3a', '#6b5440'][i]), x + 15, 210, 240, 200, 'Cabeza de pinzón: pico ' + n.toLowerCase()), 'fade-up'),
              along(text(n, x + 10, 430, 250, 50, { fontFamily: H, fontSize: 26, fontWeight: 700, color: YE, textAlign: 'center' }), 'fade-up'),
              along(text(d, x + 15, 490, 240, 100, { fontSize: 24, color: CR, textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Cuatro formas de pico para cuatro maneras de comer. Todas las especies de pinzones de las islas descienden de unos pocos antepasados llegados del continente.' },
      { title: 'La gran sequía', layout: 'titleOnly', bg: BG, back: sea(), extra: [
        chartBlock({ x: 60, y: 170, w: 780, h: 480, chartType: 'bar', color: DIM, grid: true, xTitle: 'profundidad del pico (mm)', yTitle: '% de los pinzones', seriesName: 'Antes de la sequía',
          data: ['7', '8', '9', '10', '11', '12'].map((l, i) => ({ label: l, value: [8, 24, 34, 22, 9, 3][i] })),
          series: [{ name: 'Supervivientes', color: RED, values: [2, 10, 28, 32, 19, 9] }] }),
        text('Un año casi sin lluvia: solo quedaron semillas grandes y duras.', 880, 190, 340, 140, { fontSize: 28, color: CR }),
        on(card('Murieron muchos más pinzones de pico fino. Los de pico grueso podían partir las semillas y sobrevivieron.', 880, 360, 340, 260, '#1b3650', { color: CR, fontSize: 24, stroke: RED, strokeWidth: 2 }), 'fade-up')],
        notes: 'Basado en estudios reales de una isla de Galápagos; las cifras de la gráfica están simplificadas para el ejemplo. La barra roja se desplaza hacia los picos grandes.' },
      { title: '¿Se hereda el pico?', layout: 'titleOnly', bg: BG, back: sea(), extra: [
        chartBlock({ x: 60, y: 170, w: 780, h: 480, chartType: 'scatter', color: YE, grid: true, xTitle: 'pico medio de los padres (mm)', yTitle: 'pico de la cría (mm)', xMin: 8, xMax: 12, yMin: 8, yMax: 12, seriesName: 'Familias',
          data: [[8.4, 8.7], [8.8, 8.9], [9.1, 9.4], [9.3, 9.1], [9.6, 9.8], [9.9, 10.1], [10.2, 10.0], [10.4, 10.6], [10.7, 10.5], [11.0, 11.2], [11.3, 11.0], [11.6, 11.5], [9.0, 8.8], [10.1, 10.4]].map(([x, y]) => ({ label: String(x), value: y })) }),
        text('Cada punto es una familia: los padres y una de sus crías.', 880, 190, 340, 120, { fontSize: 26, color: CR }),
        on(card('Padres de pico grueso tienen crías de pico grueso. Si no se heredara, la sequía no cambiaría nada en la generación siguiente.', 880, 340, 340, 280, '#1b3650', { color: CR, fontSize: 24, stroke: YE, strokeWidth: 2 }), 'fade-up')],
        notes: 'Gráfico de dispersión con datos inventados que imitan la tendencia real: la nube de puntos sube en diagonal. Eso significa que el carácter se hereda.' },
      { title: 'La selección natural, en cuatro pasos', layout: 'titleOnly', bg: BG, back: sea(), extra: [
        dg('cycle', 'Variación\nHerencia\nLucha\nSelección', 70, 175, 560, 480, { colors: 'colorful', fontScale: 1.5 }),
        ...[['Variación', 'no hay dos pinzones iguales: unos nacen con el pico más grueso que otros.'], ['Herencia', 'las crías se parecen a sus padres.'], ['Lucha', 'nacen más pinzones de los que la isla puede alimentar.'], ['Selección', 'sobreviven y crían más los mejor adaptados al ambiente de ese momento.']]
          .map(([n, d], i) => on(text(`<b style="color:${YE}">${n}:</b> ${d}`, 680, 190 + i * 115, 540, 105, { fontSize: 25, color: CR }), 'fade-left'))],
        notes: 'El ciclo aparece paso a paso. Con estas cuatro condiciones, la población cambia generación tras generación sin que nadie lo planee.' },
      { title: 'Generación de 1976', layout: 'titleOnly', bg: BG, back: sea(), extra: [
        keep(shape('ellipse', 200, 220, 320, 320, '#5b4636'), head), keep(shape('ellipse', 400, 300, 40, 40, '#ffffff', { stroke: '#111111', strokeWidth: 10 }), eye),
        keep(shape('triangle', 480, 345, 120, 70, '#e7c48a', { rotation: 90, stroke: '#8a6d3b', strokeWidth: 3 }), beak),
        keep(text('pico medio: 9,4 mm', 200, 580, 440, 50, { fontFamily: H, fontSize: 30, color: YE, textAlign: 'center' }), yr),
        text('Antes de la sequía, el pico medio de la isla era más bien fino.', 760, 220, 440, 160, { fontSize: 30, color: CR }),
        text('Siguiente diapositiva: la misma población, dos años después →', 760, 430, 440, 120, { fontSize: 24, color: DIM, fontStyle: 'italic' })],
        notes: 'Un pinzón «medio» de la población. Al pasar a la siguiente diapositiva, Transformar engorda su pico. Cifras redondeadas para el ejemplo.' },
      { title: 'Generación de 1978', layout: 'titleOnly', bg: BG, back: sea(), autoAnimate: true, transition: 'fade', extra: [
        keep(shape('ellipse', 200, 220, 320, 320, '#5b4636'), head), keep(shape('ellipse', 400, 300, 40, 40, '#ffffff', { stroke: '#111111', strokeWidth: 10 }), eye),
        keep(shape('triangle', 470, 325, 150, 110, '#e7c48a', { rotation: 90, stroke: '#8a6d3b', strokeWidth: 3 }), beak),
        keep(text('pico medio: 9,8 mm', 200, 580, 440, 50, { fontFamily: H, fontSize: 30, color: RED, textAlign: 'center' }), yr),
        text('Los hijos de los supervivientes nacieron con el pico, de media, un 4 % más grueso.', 760, 220, 440, 160, { fontSize: 30, color: CR }),
        on(card('Ningún pinzón cambió su pico: cambió <b>la población</b>, porque sobrevivieron unos y no otros.', 760, 420, 440, 170, '#1b3650', { color: CR, fontSize: 25, stroke: RED, strokeWidth: 2 }), 'fade-up', { sound: 'chime' })],
        notes: 'Transformar: el pico crece y cambia la cifra. Insistir en la idea clave: los individuos no evolucionan; evolucionan las poblaciones.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Por qué aumentó el pico medio de los pinzones tras la sequía?', ['Lo estiraron a fuerza de usarlo', 'Sobrevivieron más los de pico grueso y tuvieron crías', 'Los pájaros decidieron cambiar', 'Por casualidad, sin relación con la sequía'], 1, { fontSize: 34 })],
        notes: 'La primera opción es la idea de Lamarck (los caracteres adquiridos se heredan), muy intuitiva pero equivocada. La correcta es la selección natural.' },
      { layout: 'blank', bg: BG, back: sea(), transition: 'convex', extra: [
        img(ROSE, 540, 90, 200, 200, 'Rosa de los vientos'),
        text('La evolución no es un plan:<br>es un filtro.', 140, 320, 1000, 200, { fontFamily: H, fontSize: 60, fontWeight: 700, color: CR, textAlign: 'center', lineHeight: 1.25 }),
        text('Cada generación pasa por él… y lo que pasa, se hereda.', 140, 540, 1000, 60, { fontSize: 30, color: YE, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Cierre. Tarea: buscar otro ejemplo de selección natural observado en poco tiempo (las polillas de los abedules, las bacterias resistentes a los antibióticos).' },
    ]));
  } },


};
