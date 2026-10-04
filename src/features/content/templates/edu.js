// Example presentations: Educación. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as an image: no external pictures.
const svgURL = (w, h, body) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// The same object on two slides (Transform): give it a fixed id.
const keep = (b, id) => ({ ...b, id });
// Click-by-click and chained animations (A/withAnims), shorter to write.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A quiz question (points for speed) filling the slide.
// Slices with their own colours (d.color) and, for shares with decimals, a legend of our own (legend: false on the chart).
const slices = (cols, ...pairs) => pairs.map(([label, value], i) => ({ label, value, color: cols[i % cols.length] }));
const legend = (labels, cols, x, y, w, color, fs = 22) => text(labels.map((l, i) => `<div><span style="display:inline-block;width:.8em;height:.8em;border-radius:.2em;background:${cols[i % cols.length]};margin-right:.45em"></span>${l}</div>`).join(''), x, y, w, labels.length * fs * 1.5 + 10, { fontSize: fs, color });
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 50, x: 60, y: 40, w: 1160, h: 640, ...props });

// The volcano, in section (for the label activity and the explanation).
const VOLCANO = svgURL(800, 600, '<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d1a2e"/><stop offset="1" stop-color="#c2542d"/></linearGradient>'
  + '<radialGradient id="mg"><stop offset="0" stop-color="#ffd23f"/><stop offset=".6" stop-color="#ff6a00"/><stop offset="1" stop-color="#c1121f"/></radialGradient></defs>'
  + '<rect width="800" height="600" rx="24" fill="url(#sk)"/>'
  + '<circle cx="372" cy="70" r="34" fill="#6b5b55"/><circle cx="410" cy="52" r="40" fill="#7d6b64"/><circle cx="450" cy="72" r="30" fill="#6b5b55"/>'
  + '<path d="M0 380 H800 V576 a24 24 0 0 1 -24 24 H24 a24 24 0 0 1 -24 -24Z" fill="#4a2c1e"/>'
  + '<path d="M0 440 H800 M0 500 H800" stroke="#5e3a28" stroke-width="6"/>'
  + '<polygon points="150,420 360,130 440,130 650,420" fill="#6b4330"/><polygon points="360,130 440,130 650,420 520,420" fill="#5a3726"/>'
  + '<ellipse cx="400" cy="520" rx="170" ry="55" fill="url(#mg)"/>'
  + '<rect x="388" y="130" width="24" height="380" fill="#ff5a1f"/>'
  + '<ellipse cx="400" cy="130" rx="44" ry="11" fill="#ffb703"/>'
  + '<path d="M432 140 Q520 220 600 400" stroke="#ff8c1a" stroke-width="18" fill="none" stroke-linecap="round"/>');
// A volcano's silhouette, with its chimney (the eruption slide).
const CONE = svgURL(700, 400, '<polygon points="0,400 290,80 410,80 700,400" fill="#5a3726"/><polygon points="350,80 410,80 700,400 520,400" fill="#4a2c1e"/>'
  + '<path d="M335 80 L365 80 L372 400 L328 400Z" fill="#2b1512"/><ellipse cx="350" cy="80" rx="62" ry="12" fill="#2b1512"/>');

// A "pizza" in n equal slices with k of them coloured.
const pizza = (n, k, col, empty = '#3a2a5a', edge = '#1b1030') => svgURL(400, 400, Array.from({ length: n }, (_, i) => {
  const a0 = (-90 + i * 360 / n) * Math.PI / 180, a1 = (-90 + (i + 1) * 360 / n) * Math.PI / 180, r = 190, c = 200;
  const p = a => `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`;
  return `<path d="M${c},${c} L${p(a0)} A${r},${r} 0 ${360 / n > 180 ? 1 : 0} 1 ${p(a1)} Z" fill="${i < k ? col : empty}" stroke="${edge}" stroke-width="6"/>`;
}).join(''));

// A body silhouette with some organs (label activity).
const BODY = svgURL(400, 600, '<g fill="#1f2a44" stroke="#7aa2f7" stroke-width="4" stroke-linejoin="round">'
  + '<circle cx="200" cy="68" r="48"/><rect x="182" y="110" width="36" height="24"/>'
  + '<path d="M128 132 H272 Q290 132 292 152 L300 330 H100 L108 152 Q110 132 128 132Z"/>'
  + '<path d="M108 150 L64 300 L84 306 L124 196Z"/><path d="M292 150 L336 300 L316 306 L276 196Z"/>'
  + '<path d="M112 326 H198 L190 580 H140Z"/><path d="M202 326 H288 L260 580 H210Z"/></g>'
  + '<ellipse cx="200" cy="58" rx="34" ry="24" fill="#f7a8b8"/>'
  + '<ellipse cx="164" cy="186" rx="26" ry="40" fill="#f4b6c2" opacity=".85"/><ellipse cx="236" cy="186" rx="26" ry="40" fill="#f4b6c2" opacity=".85"/>'
  + '<path d="M214 180 c-10 -14 -30 -4 -22 12 l22 22 l22 -22 c8 -16 -12 -26 -22 -12Z" fill="#f7768e"/>'
  + '<ellipse cx="186" cy="262" rx="30" ry="20" fill="#e0af68"/>'
  + '<circle cx="168" cy="460" r="12" fill="#9ece6a"/><circle cx="234" cy="460" r="12" fill="#9ece6a"/>');

// Windmill sails (they turn) and a turbine's rotor.
const SAILS = svgURL(400, 400, '<g fill="#f5f0e6" stroke="#1a1a1a" stroke-width="5">' + [0, 90, 180, 270].map(a =>
  `<g transform="rotate(${a} 200 200)"><rect x="188" y="14" width="24" height="180"/><rect x="212" y="24" width="56" height="150"/>`
  + '<path d="M212 54 H268 M212 84 H268 M212 114 H268 M212 144 H268 M240 24 V174" fill="none" stroke-width="3"/></g>').join('') + '<circle cx="200" cy="200" r="20" fill="#1a1a1a"/></g>');
const ROTOR = svgURL(400, 400, '<g fill="#e8f0ea">' + [0, 120, 240].map(a => `<path transform="rotate(${a} 200 200)" d="M194 200 C186 120 192 40 204 14 C214 60 214 140 206 200Z"/>`).join('')
  + '<circle cx="200" cy="200" r="18" fill="#4caf7d"/></g>');

// A landscape for the water cycle: sea, land, mountain and river.
const LANDSCAPE = svgURL(1100, 470, '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f80c0"/><stop offset="1" stop-color="#14466e"/></linearGradient></defs>'
  + '<rect width="1100" height="470" rx="22" fill="#cfe8f7"/>'
  + '<path d="M0 340 Q120 320 240 340 T480 338 V470 H22 a22 22 0 0 1 -22 -22Z" fill="url(#sea)"/>'
  + '<path d="M440 470 L440 330 Q520 300 600 310 L760 120 L860 210 L920 160 L1100 330 V448 a22 22 0 0 1 -22 22Z" fill="#6aa84f"/>'
  + '<path d="M760 120 L800 168 L780 176 L740 146Z M920 160 L948 186 L930 190Z" fill="#ffffff"/>'
  + '<path d="M830 230 Q760 300 650 330 T470 360" stroke="#3d9be9" stroke-width="12" fill="none" stroke-linecap="round"/>');

// ---- The ten presentations ------------------------------------------------------
export default {

  // 1 · Volcanoes: dark and fiery, the volcano in section, an eruption that
  // happens click by click with sound, a label activity, a table and a quiz.
  edu_volcanoes: { name: 'Los volcanes', cat: 'edu', summary: 'Estilo fuego: erupción animada con sonido, partes del volcán para etiquetar, tabla, cuestionario con tiempo y cuenta atrás', make: () => {
    const BG = '#1c0d0a', H = pairStacks('bold').heading, cream = '#fff4ec', orange = '#f3a712';
    return numbered(build({ name: 'Los volcanes', palette: 'warm', fonts: 'bold', title: { size: 64, color: orange },
      decor: p => [shape('rect', 0, 708, 1280, 12, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(640, 120, 820, '#e4572e', BG, 55), glow(-200, 380, 600, '#db2b39', BG, 35),
        img(CONE, 650, 330, 600, 343, 'Silueta de un volcán'),
        on(shape('burst', 830, 180, 240, 240, '#f3a712', { fill2: '#e4572e', gradType: 'radial' }), 'zoom-in', { start: 'afterPrev', delay: 300, sound: 'whoosh' }),
        along(shape('cloud', 780, 60, 340, 160, '#6b5b55', { opacity: 85 }), 'fade-up', { delay: 400, duration: 1200 }),
        text('CIENCIAS NATURALES · 1.º ESO', 90, 170, 600, 40, { fontSize: 24, color: orange, letterSpacing: 6 }),
        { ...text('VOLCANES', 80, 210, 640, 220, { fontFamily: H, fontSize: 190, wordart: 'fire' }), animation: A('zoom-in', { duration: 900, sound: 'drumroll' }) },
        after(text('La Tierra que hierve por dentro', 90, 440, 560, 60, { fontSize: 36, color: cream }), 'fade-up')],
        notes: 'Al llegar, el título entra con un redoble y el volcán «entra en erupción» él solo (animaciones encadenadas con sonido). Pregunta inicial: ¿alguien ha visto un volcán de cerca?' },
      { title: '¿Qué es un volcán?', layout: 'titleOnly', bg: BG, extra: [
        img(VOLCANO, 90, 180, 560, 420, 'Corte de un volcán: cámara magmática, chimenea, cráter, cono y colada de lava'),
        ...[['Magma', 'Roca fundida a más de 1.000 °C que se acumula bajo tierra.'], ['Erupción', 'El magma sube por la chimenea y sale por el cráter.'], ['Lava', 'Así se llama el magma cuando llega a la superficie.']]
          .map(([h, d], i) => on(card(`<div style="font-size:30px;font-weight:700;color:${orange}">${h}</div><div>${d}</div>`, 700, 180 + i * 145, 490, 128, '#ffffff10',
            { fontSize: 24, color: cream, pad: [16, 22, 16, 22], vAlign: 'middle' }), 'fade-left'))],
        notes: 'Un clic por concepto. Insistir en la diferencia entre magma (dentro) y lava (fuera): es la confusión más habitual.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', question: 'Etiqueta las partes del volcán', image: VOLCANO,
        options: ['Cráter', 'Chimenea', 'Cámara magmática', 'Cono', 'Colada de lava'],
        points: [{ x: 50, y: 22 }, { x: 50, y: 66 }, { x: 50, y: 88 }, { x: 28, y: 58 }, { x: 72, y: 56 }], fontSize: 44, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Actividad con nota: el alumnado arrastra cada etiqueta a su número desde el móvil. Al terminar, un clic muestra las soluciones y el porcentaje de aciertos.' },
      { title: '¡Erupción!', layout: 'titleOnly', bg: BG, extra: [
        img(CONE, 90, 300, 700, 400, 'Volcán con su chimenea'),
        withAnims(shape('ellipse', 420, 640, 40, 30, '#ff6a00', { fill2: '#ffd23f', gradType: 'radial' }), path([[0, -140], [0, -270]], { duration: 1800, sound: 'drumroll' })),
        after(shape('burst', 360, 290, 160, 160, '#f3a712', { fill2: '#db2b39', gradType: 'radial' }), 'zoom-in', { sound: 'whoosh', duration: 400 }),
        ...[[[-120, -170], [-250, 40]], [[30, -200], [130, 20]], [[120, -150], [300, 60]]].map((pts, i) =>
          withAnims(shape('ellipse', 430, 360, 26, 26, '#e4572e'), A('fade-in', { start: 'withPrev', duration: 150, delay: i * 120 }), path(pts, { start: 'withPrev', duration: 1400, delay: i * 120 }))),
        along(shape('cloud', 300, 170, 280, 150, '#6b5b55', { opacity: 85 }), 'fade-up', { duration: 1500 }),
        ...[['1', 'El magma sube por la chimenea'], ['2', 'La presión rompe el tapón del cráter'], ['3', 'Salen lava, bombas volcánicas y cenizas']].map(([n, t], i) =>
          (i ? after : on)(text(`<div style="display:flex;gap:18px;align-items:center"><span style="font-size:56px;font-weight:800;color:${orange};line-height:1">${n}</span><span>${t}</span></div>`, 830, 230 + i * 120, 380, 100, { fontSize: 26, color: cream, vAlign: 'middle' }), 'fade-left'))],
        notes: 'Primer clic: el magma sube con un redoble y, al llegar arriba, el cráter estalla con un silbido y salen las bombas volcánicas (todo encadenado). Luego un clic por cada paso del texto.' },
      { title: 'Tres tipos de volcán', layout: 'titleOnly', bg: BG, extra: [
        ...[['En escudo', 'Laderas suaves y lava muy fluida. Erupciones tranquilas.', 360, 80], ['Estratovolcán', 'Capas de lava y ceniza. Altos y explosivos.', 220, 170], ['Cono de cenizas', 'Pequeños, de una sola erupción.', 150, 110]]
          .flatMap(([h, d, w, hh], i) => [
            on(shape('triangle', 90 + i * 380 + (340 - w) / 2, 380 - hh, w, hh, ['#a8c686', '#e4572e', '#f3a712'][i], { fill2: '#5a3726', gradAngle: 90 }), 'grow', { start: i ? 'afterPrev' : 'click' }),
            after(text(`<div style="font-size:34px;font-weight:700;color:${orange}">${h}</div><div>${d}</div>`, 90 + i * 380, 410, 340, 200, { fontSize: 26, color: cream, textAlign: 'center' }), 'fade-up')]),
        shape('rect', 90, 380, 1100, 4, '#ffffff30')],
        notes: 'Los tres aparecen uno detrás de otro con un solo clic. La forma depende de lo viscosa que sea la lava: cuanto más espesa, más empinado y explosivo.' },
      { title: 'Volcanes de España', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 400, fontSize: 26, header: true, headBg: '#e4572e', headFg: '#ffffff', stroke: '#5a3726', banded: true, band: '#e4572e',
          rows: [['Volcán', 'Isla o comarca', 'Altitud', 'Última erupción'], ['Teide', 'Tenerife', '3.715 m', '1798 (Chahorra)'], ['Tajogaite', 'La Palma', '≈ 1.120 m', '2021'],
            ['Timanfaya', 'Lanzarote', '≈ 510 m', '1824'], ['Tagoro', 'El Hierro', 'Submarino', '2011'], ['Croscat', 'La Garrotxa (Girona)', '≈ 790 m', 'Hace ≈ 11.500 años']], colW: [3, 4, 2, 4] }),
        text('El Teide es el pico más alto de España y el tercer volcán más alto del mundo medido desde el fondo del océano.', 90, 600, 1100, 80, { fontSize: 22, color: '#f0c987', fontStyle: 'italic' })],
        notes: 'Altitudes y fechas aproximadas, para comentar en clase. Buen momento para hablar de la erupción de La Palma de 2021, que muchos recordarán.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cómo se llama el magma cuando sale a la superficie?', ['Ceniza', 'Lava', 'Basalto', 'Vapor'], 1)],
        notes: 'Cuestionario con tiempo (20 s): más puntos cuanto antes se acierta. El alumnado responde desde el móvil con el QR.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué tipo de volcán tiene las erupciones más explosivas?', ['En escudo', 'Estratovolcán', 'Cono de cenizas', 'Todos igual'], 1)],
        notes: 'Segunda pregunta. Si fallan muchos, volver a la diapositiva de los tres tipos.' },
      { layout: 'blank', bg: BG, transition: 'convex', extra: [glow(760, 120, 560, '#e4572e', BG, 45),
        text('Reto final', 90, 160, 640, 140, { fontFamily: H, fontSize: 120, color: orange }),
        text(ul('Dibuja tu volcán en corte', 'Pon nombre a sus cinco partes', 'Explica por qué entra en erupción'), 90, 310, 640, 260, { fontSize: 32, color: cream }),
        timer(300, 860, 190, 320, { color: '#f3a712', endText: '¡Tiempo!' })],
        notes: 'Cuenta atrás de 5 minutos: empieza sola y suena al acabar. Un clic la pausa.' },
    ]));
  } },

  // 2 · The cell: soft green, a cell drawn with shapes, its parts one by one,
  // Transform zooming into the mitochondrion, a match activity and a 3D plant.
  edu_cell: { name: 'La célula', cat: 'edu', summary: 'Célula dibujada con formas, partes una a una, Transformar para acercarse, unir parejas, diagrama, planta 3D y valoración', make: () => {
    const ids = { mem: uid(), nuc: uid(), mito: uid(), vac: uid(), ttl: uid() }, ink = '#1e3320', green = '#2e7d32';
    // The cell, at (x, y) and scale k.
    const cell = (x, y, k = 1) => {
      const S = (kind, dx, dy, w, h, fill, props = {}) => shape(kind, x + dx * k, y + dy * k, w * k, h * k, fill, props);
      return [
        keep(S('ellipse', 0, 0, 520, 400, '#dcedc8', { stroke: green, strokeWidth: 8, fill2: '#f1f8e9', gradType: 'radial' }), ids.mem),
        keep(S('ellipse', 200, 130, 150, 140, '#8d6e63', { fill2: '#bcaaa4', gradType: 'radial', stroke: '#5d4037', strokeWidth: 4 }), ids.nuc),
        S('ellipse', 255, 180, 40, 40, '#4e342e'),
        keep(S('rounded', 70, 110, 110, 50, '#ef6c00', { fill2: '#ffb74d', gradAngle: 90, rotation: -20, stroke: '#bf360c', strokeWidth: 3 }), ids.mito),
        S('rounded', 380, 270, 90, 42, '#ef6c00', { fill2: '#ffb74d', gradAngle: 90, rotation: 25, stroke: '#bf360c', strokeWidth: 3 }),
        keep(S('ellipse', 110, 250, 120, 90, '#b3e5fc', { stroke: '#0277bd', strokeWidth: 3, opacity: 85 }), ids.vac),
        ...[[380, 110], [420, 150], [150, 200], [330, 320], [250, 60], [440, 210]].map(([a, b]) => S('ellipse', a, b, 14, 14, '#ad1457')),
      ];
    };
    // A numbered badge on the part and its line in the legend, with one click.
    const label = ([h, d], cx, cy, i) => [
      on(text(String(i + 1), cx - 22, cy - 22, 44, 44, { fontSize: 24, fontWeight: 800, color: '#ffffff', bg: '#ad1457', radius: 22, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }), 'zoom-in', { sound: 'pop' }),
      along(text(`<div style="display:flex;gap:16px;align-items:center"><span style="flex:0 0 44px;height:44px;border-radius:22px;background:#ad1457;color:#fff;font-weight:800;text-align:center;line-height:44px">${i + 1}</span>`
        + `<span><b>${h}</b><br><span style="font-size:22px">${d}</span></span></div>`, 700, 180 + i * 115, 490, 100, { fontSize: 28, color: ink, vAlign: 'middle' }), 'fade-left')];
    return numbered(build({ name: 'La célula', palette: 'forest', fonts: 'friendly', title: { color: green },
      decor: p => [shape('ellipse', 1130, -90, 240, 240, p.accents[1], { opacity: 30 }), shape('ellipse', 1190, 600, 140, 140, p.accents[3], { opacity: 30 })] }, [
      { layout: 'blank', transition: 'fade', extra: [
        ...cell(640, 150, 1.05).map((b, i) => withAnims(b, A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 60, duration: 500 }))),
        text('La célula', 90, 210, 560, 140, { fontFamily: pairStacks('friendly').heading, fontSize: 104, fontWeight: 800, color: green }),
        text('La unidad más pequeña de la vida', 92, 360, 520, 100, { fontSize: 34, color: ink }),
        text('BIOLOGÍA · 1.º ESO', 94, 480, 400, 40, { fontSize: 22, letterSpacing: 5, color: '#8d6e63' })],
        notes: 'La célula se monta sola, pieza a pieza, al llegar a la portada. Pregunta para empezar: ¿cuántas células creéis que tenéis? (Unos 30 billones.)' },
      { title: 'Las partes de la célula', layout: 'titleOnly', extra: [
        ...cell(90, 200, 1),
        ...label(['Membrana', 'La envuelve y decide qué entra y qué sale'], 538, 262, 0),
        ...label(['Núcleo', 'Guarda el ADN: las instrucciones'], 425, 345, 1),
        ...label(['Mitocondria', 'La central de energía'], 215, 335, 2),
        ...label(['Vacuola', 'Almacena agua y sustancias'], 260, 495, 3)],
        notes: 'Cada clic marca una parte con su número (pop) y la explica a la derecha. Pedir que imaginen la célula como una ciudad: muro, ayuntamiento, central eléctrica y almacén.' },
      { layout: 'blank', autoAnimate: true, extra: [
        ...cell(90, 160, 1),
        keep(text('Acerquémonos a la mitocondria…', 700, 300, 480, 120, { fontSize: 38, color: green, fontWeight: 700 }), ids.ttl)],
        notes: 'Transformar: en la siguiente diapositiva la mitocondria crece hasta llenar la pantalla (mismo objeto en las dos).' },
      { layout: 'blank', autoAnimate: true, transition: 'zoom', extra: [
        keep(shape('rounded', 120, 190, 560, 260, '#ef6c00', { fill2: '#ffb74d', gradAngle: 90, rotation: -8, stroke: '#bf360c', strokeWidth: 6 }), ids.mito),
        shape('wave', 170, 270, 460, 100, '#bf360c', { opacity: 45, rotation: -8 }),
        keep(text('La mitocondria', 730, 160, 470, 80, { fontSize: 48, color: green, fontWeight: 700 }), ids.ttl),
        text(ul('Transforma el alimento en energía', 'Usa oxígeno: por eso respiramos', 'Tiene su propio ADN', 'Un músculo puede tener miles en cada célula'), 730, 260, 470, 330, { fontSize: 28, color: ink })],
        notes: 'La mitocondria «viaja» desde la célula hasta aquí con Transformar. Curiosidad: el ADN mitocondrial lo heredamos solo de la madre.' },
      { title: 'Animal o vegetal', layout: 'titleOnly', extra: [
        dg('venn', 'Animal\nVegetal', 90, 180, 520, 440, { colors: 'light' }),
        ...[['🐾 Solo animal', 'Vacuolas pequeñas y centriolos', '#fff3e0'], ['🤝 Las dos', 'Membrana, núcleo, mitocondrias', '#e8f5e9'], ['🌿 Solo vegetal', 'Pared celular, cloroplastos y una vacuola grande', '#e1f5fe']]
          .map(([h, d, c], i) => on(card(`<b>${h}</b><br>${d}`, 660, 180 + i * 150, 530, 130, c, { fontSize: 26, color: ink, pad: [16, 22, 16, 22], vAlign: 'middle' }), 'fade-left', { start: i ? 'afterPrev' : 'click' }))],
        notes: 'Un clic y aparecen las tres tarjetas seguidas. La pared celular y los cloroplastos son la pista para reconocer una célula vegetal al microscopio.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'match', question: 'Une cada orgánulo con su función', fontSize: 42, x: 60, y: 40, w: 1160, h: 640,
        options: ['Núcleo = Guarda el ADN', 'Mitocondria = Produce energía', 'Ribosoma = Fabrica proteínas', 'Cloroplasto = Hace la fotosíntesis', 'Membrana = Controla qué entra y sale'] })],
        notes: 'Actividad «Unir parejas» con nota: en el móvil cada orgánulo tiene su desplegable con las funciones desordenadas.' },
      { title: 'De la célula al organismo', layout: 'titleOnly', extra: [
        dg('steps', 'Célula\n  La unidad\nTejido\n  Células iguales\nÓrgano\n  Varios tejidos\nSistema\n  Órganos que colaboran\nOrganismo\n  ¡Tú!', 90, 180, 1100, 450, { colors: 'colorful', oneByOne: true })],
        notes: 'Diagrama «Escalones» uno a uno: cada nivel con un clic. Ejemplo: célula muscular → músculo → corazón → sistema circulatorio → persona.' },
      { title: 'Una planta: millones de células', layout: 'titleOnly', extra: [
        model('kh-DiffuseTransmissionPlant', 90, 170, 480, 480, { autoRotate: true, view: 'three', caption: '' }),
        text('Cada hoja tiene <b>millones</b> de células con cloroplastos: allí la luz del Sol se convierte en alimento.', 640, 210, 550, 200, { fontSize: 32, color: ink }),
        card('🔬 Prueba en el laboratorio: una capa fina de cebolla y una gota de yodo bastan para ver las células.', 640, 440, 550, 160, '#fff8e1', { fontSize: 24, color: ink }),
        text(`Modelo 3D: ${lib3d('kh-DiffuseTransmissionPlant').credit}`, 90, 660, 1100, 30, { fontSize: 13, color: '#6d7d6e' })],
        notes: 'Modelo 3D que gira solo: se puede girar con el ratón mientras se presenta. Necesita conexión la primera vez.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'rating', question: '¿Cuánto has entendido hoy? (1 = nada, 5 = todo)', display: 'numbers', fontSize: 46, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Valoración anónima del 1 al 5: el número medio da una idea rápida de si hace falta repasar.' },
    ]));
  } },

  // 3 · The French Revolution: old paper and the tricolour, a timeline that
  // builds itself with sound, Transform, a pyramid, a put-in-order activity.
  edu_revolution: { name: 'La Revolución Francesa', cat: 'edu', summary: 'Estilo papel antiguo: texto en círculo, Transformar, pirámide social, cronología animada con sonido, ordenar hechos y votación', make: () => {
    const seal = uid(), BLUE = '#23408e', RED = '#b3202a', INK = '#3b3228', H = pairStacks('classic').heading;
    const events = [['5 may 1789', 'Estados Generales'], ['14 jul 1789', 'Toma de la Bastilla'], ['26 ago 1789', 'Derechos del Hombre'], ['1792', 'Primera República'], ['1793', 'El Terror'], ['1799', 'Golpe de Napoleón']];
    const sealAt = (x, y, d, props = {}) => keep(text('1789', x, y, d, d, { fontFamily: H, fontSize: d * 0.3, textAlign: 'center', vAlign: 'middle', color: '#ffffff', bg: BLUE, radius: d / 2, ...props }), seal);
    return numbered(build({ name: 'La Revolución Francesa', palette: 'paper', fonts: 'classic', title: { size: 54, color: BLUE },
      decor: () => [shape('rect', 0, 0, 1280, 10, BLUE), shape('rect', 0, 10, 1280, 4, '#ffffff'), shape('rect', 0, 14, 1280, 10, RED)] }, [
      { layout: 'blank', transition: 'fade', extra: [
        shape('ellipse', 770, 150, 420, 420, 'none', { stroke: RED, strokeWidth: 3 }),
        text('LIBERTÉ · ÉGALITÉ · FRATERNITÉ · LIBERTÉ · ÉGALITÉ · FRATERNITÉ · ', 750, 130, 460, 460, { fontSize: 26, curve: 100, color: RED, textAlign: 'center' }),
        sealAt(860, 240, 240),
        text('HISTORIA · 4.º ESO', 90, 190, 600, 40, { fontSize: 22, letterSpacing: 6, color: RED }),
        text('La Revolución<br>Francesa', 84, 230, 680, 240, { fontFamily: H, fontSize: 86, lineHeight: 1.05, color: INK }),
        text('Diez años que cambiaron Europa · 1789–1799', 90, 480, 640, 60, { fontSize: 30, fontStyle: 'italic', color: INK })],
        notes: 'El lema gira alrededor del sello (texto curvo en círculo). Preguntar qué significan las tres palabras y si siguen vigentes.' },
      { layout: 'blank', autoAnimate: true, extra: [
        sealAt(1040, 60, 130),
        text('<b>Antes de 1789: el Antiguo Régimen</b>', 90, 60, 900, 80, { fontFamily: H, fontSize: 50, color: BLUE }),
        dg('pyramid', 'Clero\nNobleza\nTercer estado', 90, 190, 560, 440, { colors: 'accent' }),
        ...[['0,5 %', 'Clero: no pagaba impuestos'], ['1,5 %', 'Nobleza: privilegios y tierras'], ['98 %', 'Tercer estado: campesinos, artesanos y burguesía. Pagaban casi todo.']].map(([n, d], i) =>
          on(text(`<span style="font-family:${H};font-size:48px;color:${RED}">${n}</span><br>${d}`, 700, 190 + i * 150, 490, 140, { fontSize: 24, color: INK }), 'fade-left'))],
        notes: 'Transformar: el sello de 1789 vuela a la esquina. Cifras aproximadas de población por estamento; el clic va mostrando cada grupo.' },
      { title: 'Cronología de la Revolución', layout: 'titleOnly', extra: [
        on(shape('rect', 90, 398, 1100, 6, INK), 'fade-right', { duration: 800 }),
        ...events.flatMap(([d, e], i) => { const cx = 150 + i * 196;
          return [after(shape('ellipse', cx - 18, 383, 36, 36, i < 3 ? BLUE : RED, { stroke: '#f7f1e3', strokeWidth: 4 }), 'zoom-in', { sound: 'click', duration: 350, delay: 250 }),
            along(text(`<div style="font-family:${H};font-size:26px;color:${i < 3 ? BLUE : RED}">${d}</div><div>${e}</div>`, cx - 95, i % 2 ? 440 : 230, 190, 130,
              { fontSize: 22, textAlign: 'center', vAlign: i % 2 ? 'top' : 'bottom', color: INK }), i % 2 ? 'fade-down' : 'fade-up')]; })],
        notes: 'Un solo clic: la línea se dibuja y los hechos aparecen uno detrás de otro con un «clic» de sonido. Azul: la etapa moderada; rojo: la radical.' },
      { layout: 'blank', bg: '#efe6d2', transition: 'page', extra: [
        text('“', 90, 20, 200, 240, { fontFamily: H, fontSize: 240, color: RED, lineHeight: 1 }),
        text('Los hombres nacen y permanecen libres e iguales en derechos.', 180, 220, 920, 220, { fontFamily: H, fontSize: 54, fontStyle: 'italic', color: INK }),
        text('— Declaración de los Derechos del Hombre y del Ciudadano, artículo 1 (26 de agosto de 1789)', 180, 470, 920, 80, { fontSize: 26, color: '#6b5b45' })],
        notes: 'Comentar que «hombres» excluía de hecho a las mujeres: Olympe de Gouges respondió en 1791 con su Declaración de los Derechos de la Mujer.' },
      { title: 'Las etapas', layout: 'titleOnly', extra: [
        dg('chevrons', 'Monarquía constitucional\n  1789–1792\nRepública jacobina\n  1792–1794\nDirectorio\n  1795–1799\nConsulado\n  Napoleón, 1799', 90, 200, 1100, 400, { colors: 'accent', oneByOne: true })],
        notes: 'Galones uno a uno. Remarcar cómo la Revolución empieza limitando al rey y acaba con un general en el poder.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'order', question: 'Ordena los hechos de más antiguo a más reciente', fontSize: 42, x: 60, y: 50, w: 1160, h: 620,
        options: ['Reunión de los Estados Generales', 'Toma de la Bastilla', 'Declaración de los Derechos del Hombre', 'Proclamación de la República', 'El Terror de Robespierre', 'Golpe de Estado de Napoleón'] })],
        notes: 'Actividad «Ordenar» con nota: en el móvil aparecen desordenados y se arrastran. Puntúa cada posición correcta.' },
      { title: 'Lo que dejó', layout: 'titleOnly', extra: [
        ...[['En su tiempo', BLUE, ['Fin de los privilegios', 'Soberanía nacional', 'Separación de poderes']], ['Hasta hoy', RED, ['Constituciones escritas', 'Derechos humanos', 'Sistema métrico decimal']]].map(([h, c, items], i) =>
          on(card(`<div style="font-family:${H};font-size:40px;color:${c};margin-bottom:10px">${h}</div>` + ul(...items), 100 + i * 560, 190, 520, 290, '#fffaf0',
            { fontSize: 30, color: INK, borderColor: c, radius: 6, shadow: { x: 6, y: 6, blur: 0, color: c } }), i ? 'fade-left' : 'fade-right')),
        on(text('📏 ¿Sabías que…? En 1791 se definió el metro como la diezmillonésima parte de la distancia del polo norte al ecuador.', 100, 530, 1080, 90, { fontSize: 26, fontStyle: 'italic', color: '#6b5b45' }), 'fade-up')],
        notes: 'El sistema métrico (metro, kilo) también nació de la Revolución: pocas veces se recuerda y suele sorprender.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'choice', question: '¿Qué idea de la Revolución te parece más importante hoy?', display: 'pie', fontSize: 44,
        options: ['Libertad', 'Igualdad', 'Fraternidad', 'Soberanía del pueblo'], x: 60, y: 50, w: 1160, h: 620 })],
        notes: 'Votación en directo con gráfico circular. Pedir a dos o tres personas que justifiquen su voto: buen arranque para un debate.' },
    ]));
  } },

  // 4 · Fractions: night purple and neon, pizzas drawn in SVG, equations,
  // Transform that adds two fractions, fill-in-the-gaps, a quiz and a countdown.
  edu_fractions: { name: 'Fracciones', cat: 'edu', summary: 'Estilo neón: pizzas dibujadas, ecuaciones paso a paso, suma con Transformar, completar huecos, cuestionario y reto con cuenta atrás', make: () => {
    const BG = '#1b1030', PINK = '#f15bb5', CYAN = '#00bbf9', YEL = '#fee440', FG = '#f3eefe', H = pairStacks('modern').heading;
    const pieces = Array.from({ length: 5 }, () => uid()), frame = uid(), m = (latex, x, y, w, h, fs, props = {}) => mathBlock({ x, y, w, h, fontSize: fs, latex, color: FG, ...props });
    const piece = (i, x, y, s) => keep(shape('rounded', x, y, s, s, i < 2 ? PINK : CYAN, { radius: 10, stroke: BG, strokeWidth: 4 }), pieces[i]);
    return numbered(build({ name: 'Fracciones', palette: 'violet', fonts: 'modern', title: { color: YEL },
      decor: p => [shape('rect', 0, 700, 1280, 20, p.accents[0], { fill2: p.accents[3], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, extra: [
        glow(-200, -260, 800, '#9b5de5', BG, 50),
        ...[[pizza(2, 1, PINK), 820, 90, 200], [pizza(3, 2, CYAN), 1010, 250, 180], [pizza(4, 3, YEL), 790, 380, 240], [pizza(8, 5, '#00f5d4'), 1040, 470, 150]].map(([src, x, y, s], i) =>
          withAnims(img(src, x, y, s, s, 'Círculo dividido en partes'), A('bounce', { start: i ? 'withPrev' : 'afterPrev', delay: i * 180, ...(i === 0 && { sound: 'chime' }) }))),
        text('MATEMÁTICAS · 5.º DE PRIMARIA', 90, 200, 640, 40, { fontSize: 22, letterSpacing: 6, color: CYAN }),
        text('Fracciones', 80, 240, 700, 160, { fontFamily: H, fontSize: 120, wordart: 'neon' }),
        text('Partes de un todo, sin miedo', 90, 410, 640, 60, { fontSize: 36, color: FG })],
        notes: 'Las cuatro «pizzas» rebotan al llegar, con una campanilla. Pregunta: ¿qué parte de la pizza naranja está coloreada?' },
      { title: '¿Qué es una fracción?', layout: 'titleOnly', bg: BG, extra: [
        img(pizza(8, 3, PINK), 90, 190, 400, 400, 'Pizza en 8 porciones, 3 coloreadas'),
        m('\\frac{3}{8}', 560, 220, 260, 340, 150),
        on(text(`<b style="color:${PINK}">Numerador</b><br>las partes que tomamos: <b>3</b>`, 860, 230, 330, 130, { fontSize: 28, color: FG }), 'fade-left'),
        on(shape('rect', 860, 395, 330, 4, '#ffffff40'), 'fade-in', { start: 'withPrev' }),
        on(text(`<b style="color:${CYAN}">Denominador</b><br>las partes iguales del todo: <b>8</b>`, 860, 420, 330, 130, { fontSize: 28, color: FG }), 'fade-left')],
        notes: 'Truco para recordarlo: el Denominador está abajo (D de «down»). Un clic por cada término.' },
      { title: 'Fracciones equivalentes', layout: 'titleOnly', bg: BG, extra: [
        ...[[2, 1, '\\frac{1}{2}'], [4, 2, '\\frac{2}{4}'], [8, 4, '\\frac{4}{8}']].flatMap(([n, k, l], r) => [
          ...Array.from({ length: n }, (_, i) => withAnims(shape('rect', 300 + i * 800 / n, 190 + r * 140, 800 / n, 100, i < k ? [PINK, CYAN, YEL][r] : '#3a2a5a', { stroke: BG, strokeWidth: 6 }),
            A('fade-right', { start: r === 0 && i === 0 ? 'click' : i === 0 ? 'afterPrev' : 'withPrev', duration: 400 }))),
          along(m(l, 130, 185 + r * 140, 120, 110, 40), 'fade-in')]),
        after(text('Ocupan lo mismo: multiplica arriba y abajo por el mismo número.', 110, 610, 1080, 50, { fontSize: 28, color: YEL, textAlign: 'center' }), 'fade-up')],
        notes: 'Un clic y las tres barras se construyen una tras otra: se ve que miden lo mismo. 1/2 = 2/4 = 4/8.' },
      { title: 'Sumar: mismo denominador', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        piece(0, 160, 260, 110), piece(1, 290, 260, 110),
        text('+', 520, 230, 120, 170, { fontSize: 120, textAlign: 'center', color: FG }),
        piece(2, 700, 260, 110), piece(3, 830, 260, 110), piece(4, 960, 260, 110),
        m('\\frac{2}{8}', 210, 420, 200, 160, 70), m('\\frac{3}{8}', 815, 420, 200, 160, 70)],
        notes: 'Transformar: al pasar, las cinco porciones viajan hasta la misma barra. Así se ve por qué el denominador no cambia.' },
      { title: 'Sumar: mismo denominador', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        keep(shape('rect', 240, 240, 800, 110, 'none', { stroke: '#ffffff70', strokeWidth: 4, dash: 'dash' }), frame),
        ...[0, 1, 2, 3, 4].map(i => piece(i, 240 + i * 100, 240, 100)),
        m('\\frac{2}{8} + \\frac{3}{8} = \\frac{5}{8}', 240, 400, 800, 180, 76),
        text('Se suman los numeradores; el denominador se queda igual.', 240, 600, 800, 50, { fontSize: 26, textAlign: 'center', color: YEL })],
        notes: 'La barra punteada son los 8 octavos; quedan 3 huecos libres. Preguntar cuánto falta para la unidad (3/8).' },
      { title: 'Con distinto denominador', layout: 'titleOnly', bg: BG, extra: [
        m('\\frac{1}{2} + \\frac{1}{3}', 90, 230, 380, 200, 64),
        on(m('= \\frac{3}{6} + \\frac{2}{6}', 470, 230, 440, 200, 64), 'fade-left'),
        on(m('= \\frac{5}{6}', 910, 230, 280, 200, 64, { color: YEL }), 'zoom-in', { sound: 'chime' }),
        text('① Busca un denominador común: 6 es múltiplo de 2 y de 3<br>② Convierte: 1/2 = 3/6 y 1/3 = 2/6<br>③ Suma los numeradores', 140, 470, 1000, 150, { fontSize: 28, color: CYAN })],
        notes: 'Ecuaciones paso a paso, un clic por línea. El último paso suena para celebrar.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', question: 'Completa los huecos', fontSize: 46, x: 60, y: 40, w: 1160, h: 640,
        text: 'En la fracción 3/4, el numerador es [3] y el denominador es [4]. La fracción 1/2 es equivalente a 2/[4]. Si sumo 2/5 + 1/5 obtengo [3]/5. La mitad de 10 es [5|cinco].' })],
        notes: 'Actividad «Completar huecos» con nota. En el último hueco vale «5» o «cinco» (alternativas separadas con barra).' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué fracción es la mayor?', ['1/2', '2/3', '3/4', '3/5'], 2, { time: 30 })],
        notes: 'Cuestionario con 30 segundos. Pista si hace falta: dibujar las cuatro como pizzas.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [glow(700, 60, 560, '#f15bb5', BG, 40),
        text('Reto relámpago', 90, 150, 700, 110, { fontFamily: H, fontSize: 80, color: YEL }),
        text('¿Cuántas fracciones equivalentes a $\\frac{1}{3}$ eres capaz de escribir antes de que acabe el tiempo?', 90, 280, 620, 200, { fontSize: 34, color: FG }),
        timer(120, 790, 300, 400, { style: 'digital', color: YEL, h: 180, endText: '¡Fuera lápices!' })],
        notes: 'Cuenta atrás digital de 2 minutos. Gana quien tenga más fracciones correctas (2/6, 3/9, 4/12…).' },
    ]));
  } },

  // 5 · The human body: dark "lab" look, a 3D figure that moves (Transform
  // between slides), a man walking along a path, a bar chart, a label activity.
  edu_body: { name: 'El cuerpo humano', cat: 'edu', summary: 'Estilo laboratorio: figura 3D con Transformar, personaje que camina por un recorrido, gráfico de barras, etiquetar el cuerpo y cuestionario', make: () => {
    const BG = '#0b0f19', fig = uid(), FG = '#e6e9ef', CY = '#2ac3de', H = pairStacks('tech').heading;
    const figure = (x, y, w, h, props = {}) => keep(model('kh-RiggedFigure', x, y, w, h, { clip: '*', caption: '', autoRotate: false, view: 'front', ...props }), fig);
    return numbered(build({ name: 'El cuerpo humano', palette: 'midnight', fonts: 'tech', title: { size: 50, color: FG },
      decor: () => [...Array.from({ length: 16 }, (_, i) => shape('rect', 80 * i + 40, 0, 1, 720, '#ffffff08')), shape('rect', 0, 704, 1280, 16, CY, { fill2: '#bb9af7', gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', autoAnimate: true, extra: [
        glow(640, 40, 700, '#2ac3de', BG, 35),
        figure(760, 90, 400, 560),
        text('CIENCIAS NATURALES · 6.º DE PRIMARIA', 90, 200, 640, 40, { fontSize: 22, letterSpacing: 5, color: CY }),
        text('El cuerpo<br>humano', 84, 240, 680, 260, { fontFamily: H, fontSize: 104, lineHeight: 1, wordart: 'ice' }),
        text('Una máquina perfecta, sistema a sistema', 90, 510, 620, 60, { fontSize: 32, color: '#a9b1d6' })],
        notes: 'Figura 3D animada (se carga de internet). En la siguiente diapositiva se desplaza con Transformar.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        figure(60, 120, 340, 520, { arrive: 'turn' }),
        text('<b>Muchos sistemas, un equipo</b>', 440, 60, 760, 80, { fontFamily: H, fontSize: 50, color: FG }),
        ...[['🫀', 'Circulatorio', 'Lleva oxígeno a todo el cuerpo'], ['🫁', 'Respiratorio', 'Toma oxígeno y expulsa CO₂'], ['🧠', 'Nervioso', 'Recibe, decide y ordena'],
          ['🦴', 'Locomotor', 'Huesos, músculos y articulaciones'], ['🍎', 'Digestivo', 'Saca nutrientes de la comida'], ['💧', 'Excretor', 'Filtra la sangre y elimina desechos']]
          .map(([e, h, d], i) => withAnims(card(`<div style="font-size:24px;font-weight:700;color:${CY}">${e} ${h}</div><div style="font-size:20px;opacity:.85">${d}</div>`,
            440 + (i % 2) * 380, 170 + Math.floor(i / 2) * 160, 360, 140, '#ffffff0d', { color: FG, pad: [16, 20, 16, 20], vAlign: 'middle', borderColor: '#2a2f45' }),
            A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 400 })))],
        notes: 'La figura llega desde la portada dando una vuelta (Modelo 3D ▸ Desde la anterior ▸ Llega: «Dar una vuelta hasta su vista»). Un clic muestra los seis sistemas encadenados.' },
      { title: 'En marcha: el aparato locomotor', layout: 'titleOnly', bg: BG, extra: [
        shape('rect', 60, 600, 1160, 4, '#ffffff30'),
        withAnims(model('kh-CesiumMan', 60, 330, 220, 280, { walk: { clip: '*', face: true, look: true }, caption: '' }),
          path([[260, -10], [560, 0], [880, -20]], { duration: 5000 })),
        text('<b style="color:#e0af68">206</b> huesos&nbsp;&nbsp;·&nbsp;&nbsp;<b style="color:#9ece6a">más de 600</b> músculos&nbsp;&nbsp;·&nbsp;&nbsp;<b style="color:#f7768e">más de 300</b> articulaciones',
          90, 180, 1100, 60, { fontSize: 32, color: FG, textAlign: 'center' }),
        text('Clic: camina. Los músculos tiran de los huesos y las articulaciones hacen de bisagra.', 90, 250, 1100, 50, { fontSize: 24, color: '#a9b1d6', textAlign: 'center' }),
        text(`Modelos 3D: ${lib3d('kh-CesiumMan').credit} · ${lib3d('kh-RiggedFigure').credit}`, 90, 650, 1100, 30, { fontSize: 12, color: '#6b7390' })],
        notes: 'Personaje 3D que anda por un recorrido (Animaciones ▸ Dibujar recorrido) usando su propia animación de caminar.' },
      { title: '¿Dónde están los 206 huesos?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 150, y: 170, w: 700, h: 480, chartType: 'hbar', color: '#7aa2f7', dataLabels: true,
          data: [{ label: 'Manos', value: 54 }, { label: 'Pies', value: 52 }, { label: 'Otros', value: 27 }, { label: 'Columna', value: 26 }, { label: 'Tórax', value: 25 }, { label: 'Cráneo', value: 22 }] }),
        on(card(`<div style="font-family:${H};font-size:72px;color:#e0af68;line-height:1">¡52 %!</div>de los huesos están en las manos y los pies.`, 890, 250, 300, 280, '#ffffff0d', { fontSize: 26, color: FG, textAlign: 'center', vAlign: 'middle' }), 'zoom-in')],
        notes: 'Recuento orientativo de un adulto (manos y pies incluyen muñecas y tobillos; tórax: costillas y esternón). Al nacer tenemos unos 300 huesos: muchos se sueldan al crecer.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', question: 'Señala cada órgano en el cuerpo', image: BODY, fontSize: 44, x: 60, y: 40, w: 1160, h: 640,
        options: ['Cerebro', 'Pulmón', 'Corazón', 'Estómago', 'Rodilla'],
        points: [{ x: 50, y: 10 }, { x: 37, y: 36 }, { x: 57, y: 30 }, { x: 46, y: 44 }, { x: 42, y: 77 }] })],
        notes: 'Actividad «Etiquetar una imagen» con nota: cada número del dibujo lleva un desplegable en el móvil.' },
      { title: 'Cada día, sin darte cuenta', layout: 'titleOnly', bg: BG, extra: [
        ...[['🫀', '100.000', 'latidos del corazón', '#f7768e'], ['🫁', '20.000', 'respiraciones', CY], ['💧', '1,5 l', 'de saliva', '#9ece6a']].map(([e, n, l, c], i) =>
          withAnims(card(`<div style="font-size:56px">${e}</div><div style="font-family:${H};font-size:68px;font-weight:700;color:${c};line-height:1.1">${n}</div><div>${l}</div><div style="font-size:18px;opacity:.6">aproximadamente</div>`,
            90 + i * 380, 200, 340, 380, '#ffffff0d', { fontSize: 26, color: FG, textAlign: 'center', vAlign: 'middle', borderColor: c }), A('zoom-in', { start: i ? 'afterPrev' : 'click', delay: i ? 200 : 0, sound: 'pop' })))],
        notes: 'Cifras aproximadas para un adulto en reposo. Pedir que se tomen el pulso 15 segundos y lo multipliquen por 4.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué órgano bombea la sangre por todo el cuerpo?', ['Los pulmones', 'El corazón', 'El hígado', 'Los riñones'], 1)],
        notes: 'Cuestionario con tiempo: más rápido, más puntos.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuántos huesos tiene una persona adulta?', ['106', '206', '306', '1.000'], 1)],
        notes: 'Segunda pregunta: enlaza con el gráfico de los huesos.' },
      { layout: 'section', bg: BG, title: 'Cuida tu máquina', subtitle: 'Moverse, dormir bien y comer variado: los tres mejores «mantenimientos»', transition: 'zoom',
        extra: [glow(390, -220, 500, '#2ac3de', BG, 30), withAnims({ ...icon('heart', 600, 70, 80, '#f7768e'), decorative: false, alt: 'Corazón' }, A('grow', { start: 'afterPrev', duration: 700 }))],
        notes: 'Cierre: pedir a cada alumno un hábito que vaya a mejorar esta semana.' },
    ]));
  } },

  // 6 · The water cycle: ocean blues, a cycle diagram one by one, a landscape
  // where the water moves click by click, doughnut charts, match, a NASA satellite.
  edu_water: { name: 'El ciclo del agua', cat: 'edu', summary: 'Diagrama de ciclo uno a uno, paisaje con gotas que suben y lluvia animada con sonido, gráficos de dona, unir parejas y satélite 3D', make: () => {
    const BG = '#0f2940', FG = '#f2f6fa', SKY = '#7fb8e6', H = pairStacks('clean').heading;
    const WCOL = ['#4a90d9', '#50e3c2'], FCOL = ['#e8f4fd', '#7fb8e6', '#50e3c2'];
    const drop = (x, y, s = 30, c = '#4a90d9') => shape('teardrop', x, y, s * 0.8, s, c);
    return numbered(build({ name: 'El ciclo del agua', palette: 'ocean', fonts: 'clean', title: { color: SKY, size: 50 },
      decor: p => [shape('wave', -40, 640, 1360, 110, p.accents[0], { opacity: 35 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(760, 60, 560, '#4a90d9', BG, 50),
        withAnims(shape('teardrop', 880, 150, 290, 370, '#4a90d9', { fill2: '#7fb8e6', gradAngle: 90 }), A('fade-down', { start: 'afterPrev', duration: 900 })),
        shape('ellipse', 945, 400, 48, 60, '#ffffff', { opacity: 40, rotation: 20 }),
        text('CIENCIAS · 4.º DE PRIMARIA', 90, 200, 640, 40, { fontSize: 22, letterSpacing: 6, color: '#50e3c2' }),
        text('El ciclo<br>del agua', 84, 240, 680, 260, { fontFamily: H, fontSize: 110, fontWeight: 800, lineHeight: 1, color: FG }),
        text('La misma agua, una y otra vez, desde hace millones de años', 90, 510, 620, 100, { fontSize: 30, color: SKY })],
        notes: 'La gota cae sola al llegar. Dato para empezar: el agua que bebemos podría haber pasado por un dinosaurio.' },
      { title: 'Un viaje sin fin', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Evaporación\nCondensación\nPrecipitación\nEscorrentía\nInfiltración', 240, 170, 800, 480, { colors: 'colorful', oneByOne: true })],
        notes: 'Diagrama de ciclo uno a uno: cada fase aparece con un clic. Preguntar qué fase creen que viene después antes de mostrarla.' },
      { title: 'Míralo en acción', layout: 'titleOnly', bg: BG, extra: [
        img(LANDSCAPE, 90, 180, 1100, 470, 'Paisaje con mar, montaña y río'),
        shape('sun', 130, 200, 110, 110, '#f5a623'),
        // 1 · evaporation: three drops rise from the sea.
        ...[0, 1, 2].map(i => withAnims(drop(170 + i * 90, 540, 26, '#d6ecfa'), path([[20, -150], [40, -300]], { start: i ? 'withPrev' : 'click', delay: i * 250, duration: 1600, ...(i === 0 && { sound: 'whoosh' }) }))),
        after(text('1 · Evaporación', 130, 400, 300, 44, { fontSize: 24, fontWeight: 700, color: '#0f2940', bg: '#ffffffcc', radius: 10, textAlign: 'center' }), 'fade-in'),
        // 2 · condensation: a cloud forms and travels to the mountain.
        withAnims(shape('cloud', 280, 195, 240, 130, '#ffffff'), A('zoom-in', { duration: 700 }), path([[220, -10], [440, 0]], { start: 'afterPrev', duration: 2200 })),
        after(text('2 · Condensación', 420, 340, 280, 44, { fontSize: 24, fontWeight: 700, color: '#0f2940', bg: '#ffffffcc', radius: 10, textAlign: 'center' }), 'fade-in'),
        // 3 · rain falls on the mountain.
        ...Array.from({ length: 6 }, (_, i) => withAnims(drop(745 + i * 34, 330 + (i % 2) * 20, 18), A('fade-down', { start: i ? 'withPrev' : 'click', delay: i * 120, duration: 700, ...(i === 0 && { sound: 'pop' }) }))),
        after(text('3 · Precipitación', 975, 205, 210, 44, { fontSize: 20, fontWeight: 700, color: '#0f2940', bg: '#ffffffcc', radius: 10, textAlign: 'center' }), 'fade-in'),
        // 4 · the river takes it back to the sea.
        on(text('4 · Escorrentía: el río la devuelve al mar', 560, 590, 520, 44, { fontSize: 24, fontWeight: 700, color: '#ffffff', bg: '#4a90d9', radius: 10, textAlign: 'center' }), 'fade-up')],
        notes: 'Tres clics y un cuarto: las gotas suben con un silbido, la nube se forma y viaja hasta la montaña, llueve (pop) y el río devuelve el agua al mar.' },
      { title: '¿Dónde está el agua de la Tierra?', layout: 'titleOnly', bg: BG, extra: [
        text('<b>Toda el agua</b>', 90, 175, 520, 44, { fontSize: 28, color: SKY }),
        chartBlock({ x: 90, y: 240, w: 270, h: 270, chartType: 'doughnut', legend: false, data: slices(WCOL, ['Salada', 97.5], ['Dulce', 2.5]) }),
        legend(['Salada 97,5 %', 'Dulce 2,5 %'], WCOL, 380, 330, 260, FG, 24),
        on(text('<b>Solo el agua dulce</b>', 680, 175, 520, 44, { fontSize: 28, color: SKY }), 'fade-in'),
        along(chartBlock({ x: 680, y: 240, w: 270, h: 270, chartType: 'pie', legend: false, data: slices(FCOL, ['Glaciares y hielo', 68.7], ['Subterránea', 30.1], ['Ríos y lagos', 1.2]) }), 'zoom-in'),
        along(legend(['Hielo 68,7 %', 'Subterránea 30,1 %', 'Ríos y lagos 1,2 %'], FCOL, 965, 310, 245, FG, 21), 'fade-in'),
        on(card('<div>💡 De cada 100 litros de agua del planeta, solo unos <b>0,03</b> están en ríos y lagos.</div>', 90, 560, 1100, 90, '#ffffff10', { fontSize: 26, color: FG, pad: [14, 22, 14, 22], vAlign: 'middle' }), 'fade-up')],
        notes: 'Porcentajes aproximados. De cada 100 litros de agua del planeta, solo unos 2,5 son dulces y casi todo está congelado.' },
      { title: 'Tres estados, la misma agua', layout: 'titleOnly', bg: BG, extra: [
        ...[['❄️', 'Sólido', 'Hielo y nieve', 'por debajo de 0&nbsp;°C', '#7fb8e6'], ['💧', 'Líquido', 'Mares, ríos y lluvia', 'entre 0 y 100&nbsp;°C', '#4a90d9'], ['☁️', 'Gaseoso', 'Vapor de agua', 'al evaporarse o hervir (100&nbsp;°C)', '#50e3c2']]
          .map(([e, h, d, t, c], i) => withAnims(card(`<div style="font-size:72px">${e}</div><div style="font-size:36px;font-weight:700;color:${c}">${h}</div><div>${d}</div><div style="font-size:20px;opacity:.75;margin-top:8px">${t}</div>`,
            90 + i * 380, 190, 340, 400, '#ffffff10', { fontSize: 26, color: FG, textAlign: 'center', vAlign: 'middle', borderColor: c }), A('flip', { start: i ? 'afterPrev' : 'click', duration: 600 })))],
        notes: 'Las tarjetas giran una tras otra (efecto «Voltear»). El agua es la única sustancia que encontramos de forma natural en los tres estados.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', question: 'Une cada fase con lo que ocurre', fontSize: 40, x: 60, y: 40, w: 1160, h: 640,
        options: ['Evaporación = Pasa de líquido a vapor', 'Condensación = El vapor forma nubes', 'Precipitación = Cae lluvia o nieve', 'Infiltración = Entra en el suelo'] })],
        notes: 'Actividad «Unir parejas» con nota, desde el móvil.' },
      { title: 'Vigilar la lluvia desde el espacio', layout: 'titleOnly', bg: BG, extra: [
        nasa('global-precipitation-measurement', 70, 160, 560, 480, { motion: 'orbit' }),
        text('Los satélites miden la lluvia y la nieve de todo el planeta varias veces al día.', 680, 200, 510, 170, { fontSize: 32, color: FG }),
        card('🛰️ La misión GPM, de NASA y JAXA, despegó en 2014 y sus datos ayudan a prever inundaciones y sequías.', 680, 400, 510, 180, '#ffffff10', { fontSize: 24, color: FG })],
        notes: 'Modelo 3D de NASA con una vuelta de cámara al entrar (Modelo 3D ▸ Vista ▸ Al entrar ▸ Vuelta completa al entrar). Necesita conexión.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', question: '¿Qué haces tú para ahorrar agua? (marca todas)', fontSize: 42, x: 60, y: 50, w: 1160, h: 620,
        options: ['Ducharme rápido', 'Cerrar el grifo', 'Lavadora llena', 'Regar de noche', 'Avisar de fugas'] })],
        notes: 'Votación de respuesta múltiple en directo. Comentar qué gesto ahorra más (la ducha corta).' },
      { layout: 'section', bg: BG, title: 'Cada gota cuenta', subtitle: 'Tarea: anota durante un día cuánta agua usas en casa', transition: 'fade',
        extra: [0, 1, 2].map(i => withAnims(drop(565 + i * 60, 70 + (i % 2) * 40, 70 - (i % 2) * 20, ['#4a90d9', '#7fb8e6', '#50e3c2'][i]), A('fade-down', { start: i ? 'withPrev' : 'afterPrev', delay: i * 200, duration: 700 }))),
        notes: 'Cierre con la tarea para casa; al día siguiente se comparan los datos con un gráfico.' },
    ]));
  } },

  // 7 · Don Quixote: black ink on cream, a windmill whose sails turn with a
  // whoosh, curved text, Transform between the two heroes, quotes, gaps, a quiz.
  edu_quixote: { name: 'El Quijote', cat: 'edu', summary: 'Estilo tinta y papel: molino que gira con sonido, texto curvo, citas animadas, Transformar, cronología, completar huecos y cuestionario', make: () => {
    const BG = '#f5f0e6', INK = '#1a1a1a', RED = '#9e1b1b', GREY = '#5a5450', H = pairStacks('editorial').heading, qId = uid(), sId = uid();
    const turn = (props = {}) => b => withAnims(b, A('spin360', { duration: 3000, sound: 'whoosh', ...props }));
    const mill = (x, y, k = 1, sails = b => b) => [
      shape('trapezoid', x + 70 * k, y + 160 * k, 160 * k, 300 * k, INK),
      shape('triangle', x + 60 * k, y + 100 * k, 180 * k, 80 * k, INK),
      shape('rect', x + 130 * k, y + 360 * k, 40 * k, 100 * k, BG),
      sails(img(SAILS, x - 50 * k, y - 60 * k, 400 * k, 400 * k, 'Aspas de un molino de viento'))];
    const hero = (id, x, y, w, h, n, who, d, fs = 1) => keep(card(`<div style="font-family:${H};font-size:${Math.round(110 * fs)}px;color:${RED};line-height:1">${n}</div><div style="font-size:${Math.round(32 * fs)}px;font-weight:700">${who}</div>${d ? `<div style="font-size:24px;color:${GREY};margin-top:8px">${d}</div>` : ''}`,
      x, y, w, h, '#ffffff', { color: INK, textAlign: 'center', vAlign: 'middle', borderColor: INK, radius: 4, shadow: { x: 8, y: 8, blur: 0, color: '#1a1a1a' } }), id);
    return numbered(build({ name: 'El Quijote', palette: 'grayscale', fonts: 'editorial', title: { size: 50, color: INK }, body: { color: INK },
      decor: () => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: INK, strokeWidth: 2 }), shape('rect', 50, 50, 1180, 620, 'none', { stroke: INK, strokeWidth: 1 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        text('EN UN LUGAR DE LA MANCHA', 740, 58, 460, 130, { fontSize: 26, curve: 35, color: RED, fontWeight: 700, letterSpacing: 2 }),
        ...mill(830, 235, 0.9, turn({ start: 'afterPrev' })),
        text('LENGUA Y LITERATURA · 3.º ESO', 100, 170, 620, 40, { fontSize: 22, letterSpacing: 5, color: RED }),
        text('Don Quijote<br>de la Mancha', 94, 210, 660, 250, { fontFamily: H, fontSize: 78, lineHeight: 1.1, color: INK, fontWeight: 700 }),
        text('Miguel de Cervantes · 1605 y 1615', 100, 470, 620, 60, { fontSize: 30, fontStyle: 'italic', color: GREY })],
        notes: 'Al llegar, las aspas del molino dan una vuelta con un silbido de viento. El título del arco es texto curvo.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        withAnims(text('En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.',
          150, 170, 980, 330, { fontFamily: H, fontSize: 44, fontStyle: 'italic', lineHeight: 1.4, color: INK }), A('fade-in', { start: 'afterPrev', duration: 2000 })),
        after(text('— Primera frase de la novela (capítulo I)', 150, 530, 980, 50, { fontSize: 26, color: RED }), 'fade-up')],
        notes: 'Leer la frase en voz alta y preguntar qué palabras no entienden: adarga (escudo), rocín (caballo de poco valor), astillero (soporte para lanzas).' },
      { title: 'Cervantes y su tiempo', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', '1547\n  Nace en Alcalá de Henares\n1571\n  Batalla de Lepanto\n1605\n  Primera parte\n1615\n  Segunda parte\n1616\n  Muere en Madrid', 100, 190, 1080, 440, { colors: 'outline', oneByOne: true })],
        notes: 'Cronología uno a uno. En Lepanto perdió la movilidad de la mano izquierda: de ahí el apodo de «el manco de Lepanto».' },
      { title: 'Dos personajes inseparables', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        hero(qId, 130, 190, 470, 420, 'Q', 'Don Quijote', 'Alto, flaco y soñador. Ve gigantes donde hay molinos.'),
        hero(sId, 680, 190, 470, 420, 'S', 'Sancho Panza', 'Bajo, práctico y glotón. Su escudero.')],
        notes: 'Transformar: en la siguiente las dos tarjetas se encogen y suben para dejar sitio a la comparación.' },
      { title: 'Idealismo frente a realismo', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        hero(qId, 130, 170, 470, 150, 'Q', 'Don Quijote', '', 0.55),
        hero(sId, 680, 170, 470, 150, 'S', 'Sancho Panza', '', 0.55),
        on(text(ul('Imaginación y libros de caballerías', 'Habla culta y solemne', 'Busca la gloria y la justicia'), 140, 350, 460, 280, { fontSize: 28, color: INK }), 'fade-up'),
        on(text(ul('Sentido común y refranes', 'Habla popular', 'Quiere comer, dormir… y su ínsula'), 690, 350, 460, 280, { fontSize: 28, color: INK }), 'fade-up')],
        notes: 'A lo largo de la novela se contagian: Quijote se vuelve más sensato y Sancho más soñador (la «quijotización» de Sancho).' },
      { title: '¿Gigantes o molinos?', layout: 'titleOnly', bg: BG, extra: [
        ...mill(150, 250, 0.85, turn({ duration: 2400 })),
        text('«¿Qué gigantes?», dijo Sancho Panza. «Aquellos que allí ves», respondió su amo, «de los brazos largos».', 560, 200, 620, 220, { fontFamily: H, fontSize: 32, fontStyle: 'italic', color: INK }),
        on(text('Don Quijote embiste con su lanza, el viento mueve las aspas… y caballo y caballero acaban rodando por el campo (capítulo VIII).', 560, 440, 620, 160, { fontSize: 26, color: GREY }), 'fade-up')],
        notes: 'Clic: las aspas giran con el viento (con sonido). Es el episodio más famoso; preguntar por qué creen que se ha hecho tan conocido.' },
      { title: 'Frases para recordar', layout: 'titleOnly', bg: BG, extra: [
        ...[['La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.', 'II, 58'], ['El que lee mucho y anda mucho, ve mucho y sabe mucho.', 'II, 25'],
          ['Con la iglesia hemos dado, Sancho.', 'II, 9'], ['Cada uno es artífice de su ventura.', 'II, 66']].map(([q, c], i) =>
          withAnims(card(`<div style="font-family:${H};font-style:italic">«${q}»</div><div style="font-size:20px;color:${RED};margin-top:8px">Segunda parte, cap. ${c.split(', ')[1]}</div>`,
            100 + (i % 2) * 550, 180 + Math.floor(i / 2) * 230, 530, 210, '#ffffff', { fontSize: 26, color: INK, borderColor: '#c9c2b5', radius: 4, vAlign: 'middle' }), A('fade-up', { start: i ? 'click' : 'click' })))],
        notes: 'Una cita por clic. Ojo: «Con la iglesia hemos topado» es como se suele citar, pero el texto dice «dado».' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', question: 'Completa el comienzo de la novela', fontSize: 44, x: 80, y: 70, w: 1120, h: 580,
        text: 'En un lugar de la [Mancha], de cuyo nombre no quiero [acordarme], no ha mucho tiempo que vivía un [hidalgo] de los de lanza en astillero, adarga antigua, [rocín] flaco y galgo corredor.' })],
        notes: 'Completar huecos con nota (no distingue mayúsculas ni tildes).' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cómo se llama la dama de la que está enamorado don Quijote?', ['Dulcinea del Toboso', 'Teresa Panza', 'Marcela', 'Altisidora'], 0, { x: 80, y: 70, w: 1120, h: 580 })],
        notes: 'Cuestionario con tiempo. Dulcinea es en realidad Aldonza Lorenzo, una labradora del Toboso.' },
      { layout: 'blank', bg: BG, transition: 'page', extra: [
        text('Tu propia aventura', 100, 150, 700, 100, { fontFamily: H, fontSize: 60, color: INK, fontWeight: 700 }),
        text('Escribe un episodio en el que don Quijote confunda algo de tu barrio con una aventura de caballería. Máximo diez líneas.', 100, 270, 680, 200, { fontSize: 30, color: INK }),
        ...mill(900, 160, 0.78),
        timer(600, 100, 520, 1080, { style: 'bar', h: 90, color: RED, endText: 'Fin' })],
        notes: 'Barra de tiempo de 10 minutos que se vacía. Leer en voz alta dos o tres textos al acabar.' },
    ]));
  } },

  // 8 · Renewable energy: dark green and neon, a turbine that turns, charts
  // (line, doughnut, radar), a word cloud, a vote and group work against the clock.
  edu_renewables: { name: 'Energías renovables', cat: 'edu', summary: 'Aerogenerador que gira, tarjetas, gráficos de área, dona y barras agrupadas, nube de palabras en directo, votación y cuenta atrás', make: () => {
    const BG = '#0d1512', G = '#4caf7d', O = '#e0873b', FG = '#eef6f0', H = pairStacks('websafe').heading, MIX = ['#3bb3c3', '#f3c623', '#3f6497', '#4caf7d', '#5b6660'];
    const turbine = (x, y, k = 1, start = 'afterPrev') => [
      shape('trapezoid', x + 186 * k, y + 196 * k, 28 * k, 330 * k, '#c9d6cd'),
      withAnims(img(ROTOR, x, y, 400 * k, 400 * k, 'Rotor de un aerogenerador'), A('spin360', { start, duration: 2500 }))];
    return numbered(build({ name: 'Energías renovables', palette: 'revela', fonts: 'websafe', title: { color: G, size: 50 },
      decor: p => [shape('rect', 0, 0, 1280, 8, p.accents[2]), shape('rect', 0, 0, 380, 8, p.accents[1])] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(820, -160, 620, '#e0873b', BG, 45), shape('sun', 1040, 50, 150, 150, '#f3c623'),
        ...turbine(780, 150, 0.95), ...turbine(980, 310, 0.6, 'withPrev'),
        text('TECNOLOGÍA · 2.º ESO', 90, 190, 600, 40, { fontSize: 22, letterSpacing: 6, color: O }),
        text('Energías<br>renovables', 84, 230, 700, 250, { fontFamily: H, fontSize: 100, lineHeight: 1.05, fontWeight: 700, wordart: 'gold' }),
        text('La energía que no se acaba', 90, 490, 620, 60, { fontSize: 34, color: FG })],
        notes: 'Los rotores de los aerogeneradores giran solos al llegar (efecto de énfasis «Girar 360°»).' },
      { title: '¿Renovable o no renovable?', layout: 'twoContent', bg: BG, body: `<b style="color:${G}">Renovables</b>` + ul('Se regeneran solas: sol, viento, agua', 'Casi no emiten CO₂', 'Dependen del tiempo que haga'),
        body2: `<b style="color:${O}">No renovables</b>` + ul('Petróleo, carbón, gas, uranio', 'Se agotan: tardaron millones de años en formarse', 'Emiten gases de efecto invernadero'),
        notes: 'Pedir ejemplos de cada tipo en casa y en el instituto antes de mostrar la diapositiva.' },
      { title: 'Seis fuentes limpias', layout: 'titleOnly', bg: BG, extra: [
        dg('cards', '☀️ Solar\n  Placas fotovoltaicas y térmicas\n🌬️ Eólica\n  El viento mueve las aspas\n💧 Hidráulica\n  Embalses y saltos de agua\n🌋 Geotérmica\n  El calor del interior de la Tierra\n🌿 Biomasa\n  Restos vegetales y orgánicos\n🌊 Marina\n  Olas y mareas', 90, 170, 1100, 480, { colors: 'colorful', oneByOne: true })],
        notes: 'Tarjetas una a una. España es de los países con más horas de sol de Europa: buena pregunta para debatir por qué.' },
      { title: 'Cada vez más limpia', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 120, y: 220, w: 620, h: 420, chartType: 'area', color: G, seriesName: 'Renovables (%)', dataLabels: true,
          data: [['2015', 37], ['2017', 33], ['2019', 38], ['2021', 47], ['2023', 50], ['2025', 56]].map(([label, value]) => ({ label, value })) }),
        text('<b>% de electricidad renovable</b>', 90, 170, 640, 40, { fontSize: 22, color: '#a7b8ad' }),
        text('<b>Mezcla de un año reciente</b>', 790, 170, 400, 40, { fontSize: 22, color: '#a7b8ad' }),
        chartBlock({ x: 785, y: 225, w: 210, h: 210, chartType: 'doughnut', legend: false,
          data: slices(MIX, ['Eólica', 24], ['Solar', 20], ['Hidráulica', 10], ['Otras renovables', 2], ['No renovables', 44]) }),
        legend(['Eólica 24 %', 'Solar 20 %', 'Hidráulica 10 %', 'Otras 2 %', 'No renov. 44 %'], MIX, 1005, 240, 195, FG, 18),
        card('Más de la mitad ya es renovable', 790, 480, 400, 110, '#4caf7d22', { fontSize: 26, color: FG, textAlign: 'center', vAlign: 'middle', borderColor: G })],
        notes: 'Cifras aproximadas e inventadas para clase (tendencia parecida a la real de España). Proponer buscar los datos oficiales del último año.' },
      { title: 'Comparamos tres fuentes', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 700, h: 480, chartType: 'bar', color: '#f3c623', seriesName: 'Solar',
          data: [{ label: 'Barata', value: 8 }, { label: 'Estable', value: 4 }, { label: 'Compacta', value: 5 }, { label: 'Limpia', value: 8 }, { label: 'Doméstica', value: 9 }],
          series: [{ name: 'Eólica', values: [9, 6, 4, 6, 2], color: '#3bb3c3' }, { name: 'Hidráulica', values: [7, 8, 2, 4, 1], color: '#8e6cc9' }] }),
        text('Puntuación de 0 a 10: cuanto más alta, mejor.<br><br>Ninguna es perfecta: por eso se combinan y se buscan formas de <b>almacenar</b> la energía (baterías, bombeo de agua).', 830, 220, 360, 400, { fontSize: 26, color: FG })],
        notes: 'Gráfico de barras agrupadas con tres series. Puntuaciones del 0 al 10 orientativas, para discutir: ¿estáis de acuerdo? ¿Qué cambiaríais?' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', question: '¿Qué palabra te viene a la cabeza con «energía limpia»?', fontSize: 44, x: 60, y: 40, w: 1160, h: 640, options: [] })],
        notes: 'Nube de palabras en directo: cuanto más se repite una palabra, más grande se ve.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', question: '¿Qué instalaríais en el instituto?', display: 'numbers', fontSize: 44, x: 60, y: 50, w: 1160, h: 620,
        options: ['Placas solares', 'Molino pequeño', 'Biomasa', 'Ahorrar primero'] })],
        notes: 'Votación con resultados en porcentaje. Defender después cada opción con argumentos de coste y espacio.' },
      { title: 'Proyecto: barrio 100 % renovable', layout: 'titleOnly', bg: BG, extra: [
        text(ul('Equipos de cuatro', 'Elegid dos fuentes para vuestro barrio', 'Dónde las pondríais y por qué', 'Un problema y su solución'), 90, 190, 640, 400, { fontSize: 32, color: FG }),
        timer(900, 820, 190, 360, { color: G, endText: '¡A presentar!' })],
        notes: 'Cuenta atrás de 15 minutos en anillo; empieza sola y suena al acabar. Luego, un minuto por equipo para presentar.' },
      { layout: 'section', bg: BG, title: 'El futuro se enchufa hoy', subtitle: 'Gracias · Tarea: ¿cuánta luz gasta tu casa? Busca la factura', transition: 'fade',
        extra: [...turbine(550, 20, 0.45), ...turbine(1040, 500, 0.38, 'withPrev'), ...turbine(40, 500, 0.35, 'withPrev')],
        notes: 'Cierre. La tarea conecta con la próxima clase sobre consumo y eficiencia.' },
    ]));
  } },

  // 9 · Geography of Spain: clean atlas look, a compass, concentric relief as
  // a target diagram, a rivers table with formulas, climate charts, a match.
  edu_spain: { name: 'Geografía de España', cat: 'edu', summary: 'Estilo atlas: rosa de los vientos, relieve en diana, tabla de ríos con fórmulas, gráficos de picos y lluvias, unir parejas y cuestionario', make: () => {
    const BG = '#f3f7fb', BLUE = '#156082', ORA = '#e97132', INK = '#1f2a37', H = pairStacks('modern').heading;
    return numbered(build({ name: 'Geografía de España', palette: 'office', fonts: 'modern', title: { color: BLUE, size: 48 },
      decor: p => [shape('rect', 0, 0, 1280, 6, p.accents[0]), ...Array.from({ length: 5 }, (_, i) => shape('rect', 1180 - i * 22, 676, 14, 14, i % 2 ? p.accents[1] : p.accents[0], { radius: 4 }))] }, [
      { layout: 'blank', bg: BG, transition: 'slide', extra: [
        shape('ellipse', 770, 120, 420, 420, '#ffffff', { stroke: BLUE, strokeWidth: 3 }),
        shape('ellipse', 830, 180, 300, 300, 'none', { stroke: '#9fb6c8', strokeWidth: 2, dash: 'dash' }),
        withAnims(shape('star4', 800, 150, 360, 360, BLUE, { fill2: '#0f9ed5', gradAngle: 45 }), A('spin', { start: 'afterPrev', duration: 1400 })),
        ...[['N', 950, 60], ['S', 950, 540], ['O', 700, 300], ['E', 1200, 300]].map(([l, x, y]) => text(l, x, y, 60, 60, { fontFamily: H, fontSize: 40, fontWeight: 700, textAlign: 'center', color: ORA })),
        text('GEOGRAFÍA E HISTORIA · 3.º ESO', 90, 200, 600, 40, { fontSize: 22, letterSpacing: 5, color: ORA }),
        text('Geografía<br>de España', 84, 240, 620, 240, { fontFamily: H, fontSize: 96, lineHeight: 1.05, fontWeight: 800, color: INK }),
        text('Relieve, ríos y climas', 90, 490, 600, 60, { fontSize: 34, color: BLUE })],
        notes: 'La rosa de los vientos gira al llegar. Para empezar: ¿quién sabe en qué punto cardinal está su comunidad respecto a Madrid?' },
      { title: 'Un relieve en anillos', layout: 'titleOnly', bg: BG, extra: [
        dg('target', 'Cordilleras exteriores\nDepresiones del Ebro y el Guadalquivir\nRebordes de la Meseta\nMeseta Central', 90, 170, 560, 480, { colors: 'colorful' }),
        text('La Península es como una <b>fortaleza</b>: una gran meseta en el centro, rodeada de montañas que la aíslan del mar.', 700, 200, 490, 220, { fontSize: 30, color: INK }),
        card('📏 La altitud media de España es de unos 650 m: de las más altas de Europa.', 700, 450, 490, 150, '#ffffff', { fontSize: 24, color: INK, borderColor: '#d6e2ec' })],
        notes: 'Diagrama de diana: del centro hacia fuera. Relacionarlo con por qué los ríos de la Meseta van hacia el Atlántico.' },
      { title: 'Las cumbres más altas', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 470, chartType: 'bar', color: BLUE, dataLabels: true,
          data: [{ label: 'Teide', value: 3715 }, { label: 'Mulhacén', value: 3479 }, { label: 'Aneto', value: 3404 }, { label: 'Veleta', value: 3396 }, { label: 'Posets', value: 3375 }, { label: 'Almanzor', value: 2591 }] })],
        notes: 'Altitudes en metros. El Teide (Tenerife) es el más alto de España; el Mulhacén, el de la Península.' },
      { title: 'Los grandes ríos', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 170, w: 560, h: 470, fontSize: 24, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#c5d3df', banded: true, band: '#0f9ed5',
          rows: [['Río', 'Longitud', 'Vertiente'], ['Tajo', '1.007 km', 'Atlántica'], ['Ebro', '910 km', 'Mediterránea'], ['Duero', '897 km', 'Atlántica'], ['Guadiana', '744 km', 'Atlántica'], ['Guadalquivir', '657 km', 'Atlántica'],
            ['<b>Total</b>', '=SUMA(B2:B6)', ''], ['<b>Media</b>', '=REDONDEAR(PROMEDIO(B2:B6);0)', '']], colW: [3, 3, 3] }),
        chartBlock({ x: 690, y: 170, w: 500, h: 470, chartType: 'hbar', color: '#0f9ed5', dataLabels: true,
          data: [{ label: 'Tajo', value: 1007 }, { label: 'Ebro', value: 910 }, { label: 'Duero', value: 897 }, { label: 'Guadiana', value: 744 }, { label: 'Guadalquivir', value: 657 }] })],
        notes: 'El total y la media son fórmulas (=SUMA y =PROMEDIO): si se corrige una longitud, se recalculan. Longitudes totales, incluido el tramo portugués.' },
      { title: 'Cuatro climas', layout: 'titleOnly', bg: BG, extra: [
        dg('matrix', 'Oceánico\n  Lluvia todo el año y temperaturas suaves\nMediterráneo\n  Veranos secos y calurosos\nContinental\n  Inviernos fríos y veranos calurosos\nSubtropical\n  Canarias: templado todo el año', 90, 170, 1100, 480, { colors: 'light' })],
        notes: 'La mayor parte del territorio tiene clima mediterráneo, con variantes. Preguntar cuál es el de su ciudad.' },
      { title: 'Llueve muy distinto', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 450, chartType: 'bar', color: BLUE, seriesName: 'Santander',
          data: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, i) => ({ label, value: [107, 90, 80, 98, 79, 56, 51, 67, 82, 120, 140, 118][i] })),
          series: [{ name: 'Sevilla', values: [58, 49, 40, 48, 29, 9, 2, 4, 26, 62, 82, 77], color: ORA }] }),
        text('Precipitación media mensual (mm), valores aproximados', 90, 630, 1100, 40, { fontSize: 20, color: '#5b6b7a', textAlign: 'center' })],
        notes: 'Valores aproximados. En julio, en Sevilla casi no llueve: es la sequía estival típica del clima mediterráneo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', question: 'Une cada pico con su cordillera o isla', fontSize: 42, x: 60, y: 40, w: 1160, h: 640,
        options: ['Mulhacén = Sierra Nevada', 'Aneto = Pirineos', 'Teide = Tenerife', 'Almanzor = Sierra de Gredos', 'Torre Cerredo = Picos de Europa'] })],
        notes: 'Unir parejas con nota desde el móvil.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es el río más largo que discurre solo por España?', ['Tajo', 'Ebro', 'Duero', 'Guadiana'], 1)],
        notes: 'Pregunta trampa: el Tajo es más largo, pero una parte está en Portugal. El Ebro es el más largo que nace y desemboca en España.' },
      { layout: 'section', bg: BG, title: 'Próxima parada: Europa', subtitle: 'Repasa con el mapa mudo del cuaderno', transition: 'slide',
        extra: [withAnims(shape('star4', 590, 60, 100, 100, BLUE, { fill2: '#0f9ed5', gradAngle: 45 }), A('spin', { start: 'afterPrev', duration: 1200 }))],
        notes: 'Cierre. La siguiente unidad amplía la escala a Europa.' },
    ]));
  } },

  // 10 · English for beginners: sunny and playful, in classroom mode (the class
  // follows on their phones), flip cards, a 3D robot that walks and waves,
  // a fox, three timed quizzes, the leaderboard and applause.
  edu_english: { name: 'English for beginners', cat: 'edu', summary: 'Modo aula: tarjetas que giran con sonido, robot 3D que anda y saluda, zorro 3D, tres preguntas con puntos, clasificación y aplausos', make: () => {
    const BG = '#fff6db', INK = '#22313f', C = ['#156082', '#e97132', '#196b24', '#0f9ed5', '#a02b93', '#4ea72e'], H = pairStacks('friendly').heading;
    const robot = lib3d('three-RobotExpressive');
    const bubble = (t, x, y, w, h, c, rot = 0) => [shape('speech', x, y, w, h, c, { rotation: rot }), text(t, x, y + 6, w, h * 0.72, { fontFamily: H, fontSize: 30, fontWeight: 700, color: '#ffffff', textAlign: 'center', vAlign: 'middle', rotation: rot })];
    const flip = (en, es, x, y, w, h, c, i, start = 'click') => withAnims(card(`<div style="font-family:${H};font-size:44px;font-weight:800;color:${c}">${en}</div><div style="font-size:24px;color:#5b6570">${es}</div>`,
      x, y, w, h, '#ffffff', { color: INK, textAlign: 'center', vAlign: 'middle', borderColor: c, radius: 22, shadow: { x: 0, y: 8, blur: 0, color: c } }), A('flip', { start, duration: 600, sound: 'pop' }));
    const deck = numbered(build({ name: 'English for beginners', palette: 'office', fonts: 'friendly', title: { color: C[1], size: 54 },
      decor: () => [shape('ellipse', -70, 620, 180, 180, C[3], { opacity: 30 }), shape('ellipse', 1215, -95, 150, 150, C[1], { opacity: 30 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        ...bubble('Hi!', 90, 90, 170, 120, C[3], -6), ...bubble('Good morning!', 280, 560, 300, 110, C[2], 4),
        text('Hello!', 80, 200, 720, 230, { fontFamily: H, fontSize: 190, wordart: 'retro' }),
        text('English for beginners · Unit 1', 96, 430, 680, 60, { fontSize: 36, color: INK, fontWeight: 700 }),
        text('Inglés · 3.º de primaria', 96, 490, 680, 50, { fontSize: 26, color: '#5b6570' }),
        model('three-RobotExpressive', 800, 110, 380, 520, { clip: 'Wave' })],
        notes: 'Modo aula activado (Ver ▸ Aula ▸ Modo aula): el alumnado sigue las diapositivas en su móvil y responde allí. El robot saluda: decimos todos «Hello!».' },
      { title: 'Greetings · Saludos', layout: 'titleOnly', bg: BG, extra: [
        ...[['Hello!', 'Hola'], ['Good morning!', 'Buenos días'], ['Goodbye!', 'Adiós'], ['Thank you!', 'Gracias']].map(([en, es], i) =>
          flip(en, es, 90 + (i % 2) * 560, 180 + Math.floor(i / 2) * 240, 530, 210, C[i], i))],
        notes: 'Cada clic gira una tarjeta con un «pop». Repetir en voz alta cada saludo, primero el profesor y luego toda la clase.' },
      { title: 'Animals · Animales', layout: 'titleOnly', bg: BG, extra: [
        model('kh-Fox', 60, 170, 440, 420, { view: 'three', clip: 'Survey', caption: '', bleed: 1 }),
        text('fox · zorro', 60, 600, 440, 50, { fontFamily: H, fontSize: 30, fontWeight: 700, color: C[1], textAlign: 'center' }),
        ...[['🐱 cat', 'gato'], ['🐶 dog', 'perro'], ['🐦 bird', 'pájaro'], ['🐟 fish', 'pez']].map(([en, es], i) =>
          flip(en, es, 540 + (i % 2) * 330, 180 + Math.floor(i / 2) * 230, 310, 200, C[(i + 2) % 6], i, i ? 'afterPrev' : 'click')),
        text(`Zorro 3D: ${lib3d('kh-Fox').credit}`, 540, 640, 650, 44, { fontSize: 12, color: '#8a8f96' })],
        notes: 'Un clic y las cuatro tarjetas giran seguidas. El zorro 3D se puede girar con el ratón: What is it? It is a fox!' },
      { title: 'Colours · Colores', layout: 'titleOnly', bg: BG, extra: [
        ...[['red', '#d62828'], ['blue', '#1d6fd1'], ['yellow', '#f4c20d'], ['green', '#2a9d3a'], ['orange', '#f77f00'], ['purple', '#7b2cbf']].flatMap(([n, c], i) => [
          withAnims(shape('ellipse', 120 + i * 180, 230, 140, 140, c, { stroke: '#ffffff', strokeWidth: 6, shadow: { x: 0, y: 6, blur: 0, color: '#00000030' } }),
            A('bounce', { start: i ? 'afterPrev' : 'click', duration: 500, sound: 'pop' })),
          along(text(n, 100 + i * 180, 390, 180, 60, { fontFamily: H, fontSize: 34, fontWeight: 800, color: { yellow: '#a87c00', orange: '#c95f00' }[n] || c, textAlign: 'center' }), 'fade-up', { duration: 300 })]),
        text('What colour is it? · ¿De qué color es?', 90, 520, 1100, 60, { fontSize: 32, color: INK, textAlign: 'center' })],
        notes: 'Los colores botan uno tras otro con un «pop». Después, señalar objetos de la clase y preguntar: What colour is it?' },
      { title: "Let's go to school!", layout: 'titleOnly', bg: BG, extra: [
        shape('rect', 60, 610, 1160, 8, '#e3d3a6', { radius: 4 }),
        text('🏫', 1010, 380, 200, 200, { fontSize: 150, textAlign: 'center' }),
        withAnims(model('three-RobotExpressive', 60, 300, 240, 320, { walk: { clip: robot.walk, face: true, look: true } }),
          path([[300, 0], [700, 0]], { duration: 4000 }),
          A('clip3d', { clip: 'Wave', once: true, start: 'afterPrev', duration: 2000 })),
        after(bubble('Good morning, teacher!', 640, 170, 420, 120, C[4]).at(0), 'zoom-in', { sound: 'chime' }),
        along(bubble('Good morning, teacher!', 640, 170, 420, 120, C[4]).at(1), 'zoom-in')],
        notes: 'Clic: el robot anda hasta el colegio, saluda y aparece el bocadillo (todo encadenado). Practicar el diálogo por parejas.' },
      { layout: 'blank', bg: BG, extra: [quiz('How do you say «gato» in English?', ['Dog', 'Cat', 'Fox', 'Bird'], 1, { time: 15, fontSize: 56 })],
        notes: 'Pregunta 1 de 3 con puntos: más rápido, más puntos (15 s).' },
      { layout: 'blank', bg: BG, extra: [quiz('What colour is the sun?', ['Blue', 'Green', 'Yellow', 'Purple'], 2, { time: 15, fontSize: 56 })],
        notes: 'Pregunta 2 de 3.' },
      { layout: 'blank', bg: BG, extra: [quiz('Complete: «Good ___!» (por la mañana)', ['night', 'morning', 'bye', 'thanks'], 1, { time: 15, fontSize: 56 })],
        notes: 'Pregunta 3 de 3. Después, la clasificación.' },
      { title: '🏆 Leaderboard', layout: 'titleOnly', bg: BG, extra: [pollBlock({ kind: 'board', question: '', fontSize: 40, x: 90, y: 170, w: 1100, h: 500 })],
        notes: 'La clasificación suma los puntos de las tres preguntas. Con el modo aula, cada alumno ve su posición en el móvil.' },
      { layout: 'blank', bg: BG, extra: [
        ...[[110, 90, C[1]], [1010, 110, C[3]], [190, 470, C[2]], [990, 460, C[4]]].map(([x, y, c], i) =>
          withAnims(shape('star', x, y, 150, 150, c, { stroke: '#ffffff', strokeWidth: 5 }), A('bounce', { start: i ? 'withPrev' : 'afterPrev', delay: i * 150, ...(i === 0 && { sound: 'applause' }) }))),
        text('Well done!', 240, 220, 800, 190, { fontFamily: H, fontSize: 140, wordart: 'gold', textAlign: 'center' }),
        text('¡Buen trabajo! · See you next class', 290, 420, 700, 60, { fontSize: 34, textAlign: 'center', color: INK })],
        notes: 'Las estrellas botan con aplausos al llegar. Despedida en inglés: Goodbye, everyone!' },
    ]));
    deck.classroom = true;
    return deck;
  } },
};
