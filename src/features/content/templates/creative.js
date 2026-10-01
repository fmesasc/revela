// Example presentations: Estilos creativos. Each one: { name, summary, cat: 'creative', make() } → a deck
// (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, lib3d } from './kit.js';

// ---- Helpers of this file ------------------------------------------------------
// Fonts of the catalogue (their stacks, so the editor and the export load them).
const FF = {
  anton: "'Anton', sans-serif", bebas: "'Bebas Neue', sans-serif", caveat: "'Caveat', cursive", pacifico: "'Pacifico', cursive",
  mono: "'JetBrains Mono', monospace", abril: "'Abril Fatface', serif", playfair: "'Playfair Display', serif", cormorant: "'Cormorant Garamond', serif",
  josefin: "'Josefin Sans', sans-serif", poppins: "'Poppins', sans-serif", space: "'Space Grotesk', sans-serif",
};
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
const withId = (b, id) => ({ ...b, id });
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// The same pseudo-random numbers every time (stars, dots…).
const rng = seed => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
// A deck whose slides may carry `tp` (props for their title placeholder) and the
// deck `titleAll` (props for every title placeholder: a glow, a letter spacing…).
function mk(cfg, slides, titleAll = null) {
  const tps = slides.map(s => s.tp);
  const deck = build(cfg, slides.map(({ tp, ...s }) => s));
  deck.slides.forEach((s, i) => { for (const b of s.blocks) if (b.ph === 'title') Object.assign(b, titleAll || {}, tps[i] || {});
    s.blocks = [...s.blocks.filter(b => !b.ph), ...s.blocks.filter(b => b.ph)]; });   // (titles over the decoration)
  return deck;
}
// A picture made of pixels (rows of characters, one colour per character), as an SVG image.
const pixelArt = (rows, colors, alt) => {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const rects = rows.flatMap((r, y) => [...r].map((c, x) => (colors[c] ? `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${colors[c]}"/>` : ''))).join('');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`);
};
const img = (src, x, y, w, h, alt, props = {}) => ({ id: uid(), x, y, w, h, rotation: 0, animation: null, type: 'image', src, alt, fit: 'contain', ...props });

export default {

  // ============================================================================
  // 1 · Brutalismo: black blocks, giant type, one loud yellow, hard shadows.
  creative_brutalism: { name: 'Brutalismo: manifiesto web', cat: 'creative',
    summary: 'Estilo brutalista: tipografía gigante, bloques negros, texto vertical, sombras duras, tachado animado, tabla y votación',
    make: () => {
      const INK = '#111111', Y = '#ffe600', W = '#ffffff';
      const huge = (t, x, y, w, h, size, color, p = {}) => text(t, x, y, w, h, { fontFamily: FF.anton, fontSize: size, lineHeight: 0.92, color, ...p });
      const rules = [['01', 'El contenido va primero. Siempre.'], ['02', 'Un tipo de letra. Como mucho, dos.'], ['03', 'Si no se entiende en tres segundos, fuera.'],
        ['04', 'Ningún carrusel que se mueva solo.'], ['05', 'Los botones parecen botones.'], ['06', 'Menos de 500 kB por página.']];
      return numbered(mk({ name: 'Brutalismo: manifiesto web', palette: 'grayscale', fonts: 'bold', title: { size: 88, color: INK } }, [
        { layout: 'blank', bg: W, transition: 'none', extra: [
          R(0, 470, 1280, 250, INK),
          huge('SIN<br>ADORNOS', 60, 50, 900, 420, 200, INK),
          text('MANIFIESTO DEL DISEÑO WEB HONESTO · ESTUDIO HORMIGÓN · 2026', 60, 545, 990, 50, { fontSize: 22, color: W, letterSpacing: 3, fontWeight: 700 }),
          text('→', 1060, 500, 160, 180, { fontSize: 150, color: Y, fontFamily: FF.anton, textAlign: 'center' }),
          withAnims(shape('burst', 900, 90, 300, 300, Y, { stroke: INK, strokeWidth: 5, rotation: 12, html: 'SEIS<br>REGLAS', fontFamily: FF.anton, fontSize: 46, color: INK, lineHeight: 0.95 }),
            A('zoom-in', { duration: 300, sound: 'pop' }), A('spin', { start: 'afterPrev', duration: 700 }))],
          notes: 'Portada brutalista: una sola tipografía condensada, enorme, y un bloque negro que corta la diapositiva. Con el primer clic entra la pegatina amarilla y gira (dos animaciones seguidas en el mismo objeto).' },
        { layout: 'blank', bg: INK, transition: 'wipe', extra: [
          R(900, 0, 380, 720, Y),
          huge('01', 60, 50, 300, 130, 120, Y),
          text('EL PROBLEMA', 64, 200, 700, 50, { fontSize: 30, color: W, letterSpacing: 10, fontWeight: 700 }),
          at(huge('2,4 MB', 56, 250, 820, 270, 250, W), 'zoom-in', { duration: 350 }),
          text('pesa de media la portada de una web. Diez veces más que en 2010. Casi todo es decoración que nadie pidió.', 64, 540, 790, 130, { fontSize: 30, color: '#d9d9d9' }),
          text('CARGANDO… CARGANDO…', 960, 40, 260, 640, { fontFamily: FF.anton, fontSize: 104, color: INK, vertical: true, lineHeight: 1 })],
          notes: 'Cifras inventadas pero verosímiles. El texto de la franja amarilla es texto vertical (Formato ▸ Dirección del texto).' },
        { title: 'LAS REGLAS', layout: 'titleOnly', bg: W, transition: 'push', extra: rules.map(([n, r], i) =>
          withAnims(card(`<div style="font-family:${FF.anton};font-size:64px;line-height:1;color:${Y}">${n}</div><div style="margin-top:14px">${r}</div>`,
            60 + (i % 3) * 393, 190 + Math.floor(i / 3) * 255, 365, 225, INK, { radius: 0, color: W, fontSize: 28, fontWeight: 700, shadow: { x: 12, y: 12, blur: 0, color: Y } }),
          A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 250 }))),
          notes: 'Las seis tarjetas aparecen de golpe, una tras otra, con un solo clic. Sombra dura sin desenfoque: el truco brutalista (Formato ▸ Sombra, desenfoque 0).' },
        { layout: 'blank', bg: Y, transition: 'none', extra: [
          huge('LO QUE SOBRA', 60, 40, 1100, 140, 120, INK),
          ...['SOMBRAS SUAVES', 'CARRUSELES', 'VENTANAS EMERGENTES', 'VÍDEOS QUE SE REPRODUCEN SOLOS'].map((t, i) =>
            withAnims(huge(t, 60, 200 + i * 92, 1160, 84, 70, INK), A('strike', { duration: 400 }))),
          at(text('Tacha. Borra. Respira.', 60, 590, 560, 80, { fontSize: 36, fontWeight: 700, color: Y, bg: INK, pad: [14, 22, 14, 22], radius: 0, vAlign: 'middle' }), 'fade-in', { start: 'afterPrev' })],
          notes: 'Cada clic tacha una línea (efecto de énfasis «Tachar»). Al final aparece la consigna en el bloque negro.' },
        { title: 'PESO MEDIO DE UNA PORTADA', layout: 'titleOnly', bg: W, transition: 'push', extra: [
          chartBlock({ x: 60, y: 190, w: 760, h: 470, chartType: 'bar', color: INK, grid: true, dataLabels: true, yTitle: 'kB',
            data: [{ label: '2010', value: 500 }, { label: '2014', value: 1100 }, { label: '2018', value: 1700 }, { label: '2022', value: 2100 }, { label: '2026', value: 2400 }] }),
          R(860, 190, 360, 470, INK, { shadow: { x: 12, y: 12, blur: 0, color: Y } }),
          huge('×5', 860, 230, 360, 240, 220, Y, { textAlign: 'center' }),
          text('en dieciséis años, y la conexión media no ha ido tan deprisa.', 890, 480, 300, 160, { fontSize: 28, color: W, fontWeight: 700 })],
          notes: 'Datos inventados para el ejemplo. Gráfico de columnas en negro con rejilla y etiquetas de datos: sin colores, sin adornos.' },
        { title: 'CASO: BIBLIOTECA MUNICIPAL', layout: 'titleOnly', bg: W, transition: 'push', extra: [
          tableBlock({ x: 60, y: 200, w: 1160, h: 400, fontSize: 32, header: true, headBg: INK, headFg: Y, stroke: INK,
            rows: [['', 'Antes', 'Después'], ['Peso de la portada', '3,1 MB', '420 kB'], ['Carga con 4G', '6,8 s', '1,2 s'], ['Tipos de letra', '5', '1'], ['Visitas que se van al instante', '58 %', '21 %']], colW: [5, 3, 3] }),
          text('Rediseño en seis semanas. Mismo contenido, nada de decoración.', 60, 630, 1160, 50, { fontSize: 26, color: '#444444', fontWeight: 700 })],
          notes: 'Caso inventado. La tabla usa el estilo del manifiesto: cabecera negra con letra amarilla y bordes gruesos.' },
        { layout: 'blank', bg: W, transition: 'none', extra: [
          R(40, 40, 1200, 640, 'none', { stroke: INK, strokeWidth: 10 }),
          pollBlock({ fontSize: 34, x: 80, y: 70, w: 1120, h: 580, question: '¿Qué quitarías HOY de tu web?', options: ['El carrusel de la portada', 'Ventanas emergentes', 'La tercera tipografía', 'Nada: está perfecta'] })],
          notes: 'Votación en directo: el público responde con el móvil desde el QR. Comentad el resultado antes de pasar.' },
        { layout: 'blank', bg: INK, transition: 'none', extra: [
          huge('MENOS.', 60, 60, 900, 240, 230, W),
          at(huge('MEJOR.', 60, 300, 900, 240, 230, Y), 'zoom-in', { duration: 300 }),
          text('hola@hormigon.example', 64, 600, 700, 60, { fontSize: 30, color: W, letterSpacing: 2 }),
          withAnims(R(980, 400, 220, 220, Y), A('spin360', { start: 'afterPrev', duration: 900 }))],
          notes: 'Cierre en dos palabras. Despedíos sin transición: cortar en seco también es una decisión de diseño.' },
      ]));
    } },

  // ============================================================================
  // 2 · Synthwave: a neon sunset, a grid that draws itself, a dancing robot.
  creative_synthwave: { name: 'Synthwave: festival Neón 86', cat: 'creative',
    summary: 'Estilo retro años 80: sol con degradado, rejilla que se dibuja, neón con brillo, Transformar, robot 3D que baila y nube de palabras',
    make: () => {
      const BG = '#12002b', PINK = '#ff2e88', CYAN = '#00f0ff', YEL = '#ffe45e', sun = uid(), floorId = uid();
      const neon = c => ({ x: 0, y: 0, blur: 14, color: c });
      // The floor: a perspective grid, as one path in a 100×100 box.
      const gridPath = [...Array.from({ length: 9 }, (_, k) => { const y = (100 * Math.pow(k / 8, 1.8)).toFixed(1); return `M-60 ${y}H160`; }),
        ...Array.from({ length: 17 }, (_, i) => `M${(50 + (i - 8) * 3).toFixed(1)} 0L${(50 + (i - 8) * 26).toFixed(1)} 100`)].join('');
      const floor = (y, p = {}) => [R(0, y, 1280, 720 - y, '#2a0450', { fill2: BG, gradAngle: 90 }),
        { ...shape('custom', 0, y, 1280, 720 - y, 'none', { path: gridPath, stroke: PINK, strokeWidth: 2, opacity: 85 }), ...p }];
      const sky = R(0, 0, 1280, 720, BG, { fill2: '#5b0e6b', gradAngle: 90 });
      const sunDisk = (x, y, d) => withId(E(x, y, d, d, YEL, { fill2: PINK, gradAngle: 90 }), sun);
      const stars = (() => { const r = rng(86); return Array.from({ length: 28 }, () => E(Math.round(r() * 1260), Math.round(r() * 330), 4, 4, '#ffffff', { opacity: 40 + Math.round(r() * 50) })); })();
      const lineup = [['VIERNES 14', PINK, 'Láser Tropical', 'Vinilo Rosa · Radio Palmera'], ['SÁBADO 15', CYAN, 'Los Cassette', 'Chica Walkman · Turbo Arcade'], ['DOMINGO 16', YEL, 'Medianoche Eléctrica', 'Sintetizador Azul · Los Hologramas']];
      return numbered(mk({ name: 'Festival Neón 86', palette: 'violet', fonts: 'tech', title: { size: 66, color: '#ff5ec4', font: FF.pacifico, bold: false } }, [
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          sky, ...stars,
          sunDisk(470, 250, 340),
          ...[[372, 8], [396, 11], [422, 14], [450, 17]].map(([y, h]) => R(440, y, 400, h, '#3a0858')),
          ...floor(470, { animation: A('draw', { duration: 2600 }) }),
          text('NEÓN 86', 90, 100, 1100, 200, { fontFamily: FF.anton, fontSize: 170, textAlign: 'center', wordart: 'retro', letterSpacing: 6 }),
          text('Festival', 200, 20, 360, 110, { fontFamily: FF.pacifico, fontSize: 66, color: '#ff5ec4', rotation: -10, shadow: neon(PINK) }),
          text('MÚSICA · RECREATIVOS · PATINES', 90, 548, 1100, 50, { fontSize: 30, textAlign: 'center', color: CYAN, letterSpacing: 8, fontWeight: 700, shadow: neon(CYAN) }),
          text('Valencia · 14, 15 y 16 de agosto de 2027', 90, 610, 1100, 50, { fontSize: 28, textAlign: 'center', color: '#ffffff' })],
          notes: 'Portada synthwave: cielo con degradado lineal, sol con degradado cortado por franjas y una rejilla en perspectiva (una sola forma libre). Clic: la rejilla se dibuja (efecto «Dibujar»).' },
        { title: 'El cartel', layout: 'titleOnly', bg: BG, autoAnimate: true, transition: 'fade', extra: [
          sunDisk(1060, 40, 140),
          ...floor(600),
          ...lineup.map(([d, c, head, rest], i) => withAnims(card(`<div style="font-size:22px;letter-spacing:5px;color:${c};font-weight:700">${d}</div>`
            + `<div style="font-family:${FF.anton};font-size:50px;line-height:1.1;margin:18px 0 14px;color:#ffffff">${head}</div><div style="font-size:24px;color:#d9c8f0">${rest}</div>`,
          80 + i * 380, 190, 350, 330, '#ffffff10', { borderColor: c, radius: 22, shadow: neon(c), textAlign: 'center', vAlign: 'middle' }),
          A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 450, ...(i === 0 && { sound: 'whoosh' }) })))],
          tp: { shadow: neon(PINK) },
          notes: 'Transformar: el sol de la portada viaja a la esquina. Grupos inventados. Las tarjetas son cuadros con borde de neón (borde de color y sombra sin desplazamiento, que hace de brillo).' },
        { title: 'Una noche cualquiera', layout: 'titleOnly', bg: BG, transition: 'convex', extra: [
          ...floor(600),
          R(100, 398, 1080, 4, CYAN, { shadow: neon(CYAN) }),
          ...[['18:00', 'Recreativos abiertos', PINK], ['19:30', 'Concurso de patines', CYAN], ['21:00', 'Primer concierto', YEL], ['23:30', 'Cabeza de cartel', PINK], ['02:00', 'Sesión de vinilos', CYAN]].flatMap(([h, d, c], i) => {
            const cx = 160 + i * 240, up = i % 2 === 0;
            return [withAnims(E(cx - 16, 384, 32, 32, c, { shadow: neon(c) }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, ...(i === 0 && { sound: 'chime' }) })),
              at(text(`<div style="font-family:${FF.anton};font-size:54px;line-height:1;color:${c}">${h}</div><div style="margin-top:8px">${d}</div>`, cx - 115, up ? 210 : 440, 230, 150,
                { fontSize: 24, color: '#ffffff', textAlign: 'center', vAlign: up ? 'bottom' : 'top' }), 'fade-in', { start: 'withPrev', duration: 400 })];
          })],
          tp: { shadow: neon(PINK) },
          notes: 'Cronología de neón hecha con formas: con un clic se encienden las cinco paradas una tras otra, con una campanilla al empezar.' },
        { layout: 'blank', bg: BG, transition: 'convex', extra: [
          ...floor(470),
          shape('triangle', 760, -40, 300, 560, PINK, { fill2: BG, gradAngle: 90, opacity: 35, rotation: 14 }),
          shape('triangle', 980, -40, 300, 560, CYAN, { fill2: BG, gradAngle: 90, opacity: 30, rotation: -14 }),
          E(850, 560, 340, 80, CYAN, { fill2: BG, gradType: 'radial', opacity: 70 }),
          model('three-RobotExpressive', 830, 120, 380, 500, { clip: 'Dance' }),
          text('Pista de baile', 80, 90, 640, 110, { fontFamily: FF.pacifico, fontSize: 66, color: '#ff5ec4', shadow: neon(PINK) }),
          text('Concurso de baile robótico', 84, 210, 640, 60, { fontSize: 34, color: CYAN, fontWeight: 700, shadow: neon(CYAN) }),
          text(ul('Parejas o en solitario', 'Tres minutos por actuación', 'Gana quien mejor imite al robot'), 84, 280, 640, 200, { fontSize: 30, color: '#ffffff' })],
          notes: 'Un modelo 3D con su animación «Dance» en bucle. Los focos son triángulos con degradado hacia el fondo y transparencia, girados.' },
        { title: 'Entradas vendidas', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 80, y: 180, w: 760, h: 470, chartType: 'area', color: PINK, grid: true,
            data: [{ label: 'Mar', value: 900 }, { label: 'Abr', value: 2100 }, { label: 'May', value: 4300 }, { label: 'Jun', value: 8200 }, { label: 'Jul', value: 13600 }, { label: 'Ago', value: 18400 }] }),
          card(`<div style="font-family:${FF.anton};font-size:96px;line-height:1;color:${CYAN}">18.400</div><div style="margin-top:12px">entradas a una semana del festival</div><div style="margin-top:22px;font-size:22px;color:#d9c8f0">Aforo: 20.000 por día</div>`,
            880, 220, 320, 380, '#ffffff10', { borderColor: CYAN, shadow: neon(CYAN), color: '#ffffff', fontSize: 28, vAlign: 'middle', textAlign: 'center' })],
          tp: { shadow: neon(PINK) },
          notes: 'Cifras inventadas. Gráfico de área acumulada en rosa neón sobre el fondo oscuro.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          ...floor(620),
          pollBlock({ kind: 'word', fontSize: 34, x: 80, y: 50, w: 1120, h: 560, question: '¿Qué canción de los 80 no puede faltar?', options: [] })],
          notes: 'Nube de palabras en directo: cada persona escribe una canción desde el móvil y las más repetidas crecen.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          sky, ...stars, sunDisk(460, 280, 360),
          ...[[400, 8], [426, 11], [454, 14], [486, 17]].map(([y, h]) => R(440, y, 400, h, '#3a0858')),
          ...floor(520),
          text('Las puertas se abren en', 90, 60, 1100, 60, { fontSize: 34, textAlign: 'center', color: '#ffffff', letterSpacing: 4 }),
          timer(600, 440, 120, 400, { style: 'digital', color: CYAN, h: 150, w: 400, shadow: neon(CYAN) }),
          text('neon86.example · ¡nos vemos en la pista!', 90, 600, 1100, 60, { fontSize: 32, textAlign: 'center', color: '#ff5ec4', fontWeight: 700, shadow: neon(PINK) })],
          notes: 'Cuenta atrás digital de diez minutos: empieza sola al llegar y suena al acabar.' },
      ], null));
    } },

  // ============================================================================
  // 3 · Watercolour on paper: soft blots, sketched shapes, handwriting.
  creative_watercolor: { name: 'Acuarela: huerto en el balcón', cat: 'creative',
    summary: 'Estilo acuarela y papel: manchas con degradado radial, formas a mano alzada, letra manuscrita, dibujo que se traza solo y 3D',
    make: () => {
      const PAPER = '#f7f1e3', INK = '#3b3228', GREEN = '#4f7942', TERRA = '#c86b4a';
      // A watercolour blot: a soft radial gradient into the paper, a little see-through, sometimes two shapes.
      const blot = (kind, x, y, w, h, c, rot = 0, op = 55) => shape(kind, x, y, w, h, c, { fill2: PAPER, gradType: 'radial', opacity: op, rotation: rot });
      const hand = (t, x, y, w, h, size, color = TERRA, p = {}) => text(t, x, y, w, h, { fontFamily: FF.caveat, fontSize: size, color, ...p });
      const sk = (kind, x, y, w, h, fill, p = {}) => shape(kind, x, y, w, h, fill, { sketch: true, stroke: INK, strokeWidth: 2, ...p });
      // A sprout, drawn as ink: the stem, then two leaves.
      const sprout = [[200, 340], [204, 300], [198, 250], [202, 200], [200, 160], [170, 130], [130, 120], [110, 140], [140, 165], [180, 168], [200, 160],
        [220, 120], [260, 90], [300, 92], [292, 125], [250, 150], [205, 158]];
      const plant = lib3d('kh-DiffuseTransmissionPlant');
      return mk({ name: 'Un huerto en el balcón', palette: 'paper', fonts: 'classic', title: { size: 58, color: GREEN } }, [
        { layout: 'blank', transition: 'fade', transitionSpeed: 'slow', extra: [
          blot('cloud', -120, -80, 620, 420, '#9cc58a', -8), blot('ellipse', 900, 380, 520, 460, '#f2b8a0', 0, 60), blot('ellipse', 760, -60, 380, 340, '#c9b6e4', 0, 45),
          blot('teardrop', 60, 470, 260, 300, '#a8d0e6', 200, 45),
          text('Un huerto<br>en tu balcón', 90, 160, 700, 280, { fontFamily: FF.playfair, fontSize: 92, color: GREEN, lineHeight: 1.05 }),
          hand('guía para empezar en primavera', 96, 450, 640, 70, 50, TERRA, { rotation: -3 }),
          sk('line', 100, 520, 300, 20, 'none', { stroke: TERRA, strokeWidth: 3 }),
          model('kh-DiffuseTransmissionPlant', 800, 110, 400, 480, { motion: 'float', view: 'front', caption: '' }),
          text(`Modelo 3D: ${plant.credit}`, 800, 620, 400, 40, { fontSize: 12, color: '#8a7f70', textAlign: 'center' })],
          notes: 'Las manchas de acuarela son formas con degradado radial hacia el color del papel y algo de transparencia, superpuestas. El título manuscrito usa la fuente Caveat.' },
        { title: 'Lo que necesitas', layout: 'titleOnly', transition: 'fade', extra: [
          blot('cloud', 820, -60, 520, 300, '#9cc58a', 6, 40),
          ...[['🪴', 'Macetas hondas', 'Al menos 20 cm de tierra para tomates y pimientos.', '#e8f1df'], ['🌱', 'Buen sustrato', 'Mezcla de tierra y compost; nunca tierra del parque.', '#fbe6dc'],
            ['💧', 'Riego constante', 'Mejor poco y a menudo. Un goteo sencillo te salva en agosto.', '#e1eef6'], ['☀️', 'Sol, mucho sol', 'De cinco a seis horas de sol directo al día.', '#fbf1cf']]
            .map(([e, h, d, c], i) => withAnims(sk('rounded', 90 + (i % 2) * 560, 185 + Math.floor(i / 2) * 240, 530, 215, c, {
              html: `<div style="font-size:44px;line-height:1">${e}</div><div style="font-family:${FF.playfair};font-size:32px;color:${GREEN};margin:6px 0">${h}</div><div>${d}</div>`, fontSize: 25, color: INK, rotation: i % 2 ? 1 : -1 }),
            A('fade-in', { start: i ? 'afterPrev' : 'click', duration: 700 })))],
          notes: 'Tarjetas con trazo a mano alzada (Forma ▸ Estilo boceto) y un poco giradas, para que no parezcan de ordenador.' },
        { title: 'Calendario de siembra', layout: 'titleOnly', transition: 'fade', extra: [
          blot('ellipse', 120, 200, 1040, 470, '#c9e0b8', 0, 45),
          tableBlock({ x: 140, y: 200, w: 1000, h: 400, fontSize: 28, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#cdbfa6', banded: true, band: '#6b8e23',
            rows: [['Planta', 'Siembra', 'Cosecha', 'Sol'], ['Tomate', 'Marzo y abril', 'Julio a septiembre', '☀️☀️☀️'], ['Lechuga', 'Casi todo el año', 'A los 45 días', '☀️'],
              ['Albahaca', 'Abril y mayo', 'Junio a septiembre', '☀️☀️'], ['Fresas', 'Octubre o marzo', 'Mayo y junio', '☀️☀️'], ['Rábanos', 'Febrero a octubre', 'A los 25 días', '☀️']], colW: [3, 4, 4, 2] }),
          hand('¡los rábanos son los más rápidos!', 760, 615, 440, 60, 36, TERRA, { rotation: -2 })],
          notes: 'Calendario orientativo para clima mediterráneo. La tabla va sobre una mancha de acuarela verde.' },
        { title: 'Un ciclo que no se acaba', layout: 'titleOnly', transition: 'fade', extra: [
          dg('cycle', 'Sembrar\nRegar\nCosechar\nCompostar', 80, 180, 640, 480, { colors: 'light', oneByOne: true }),
          blot('cloud', 760, 220, 460, 330, '#f2d48a', 4, 50),
          hand('Lo que sobra de la cocina vuelve a la tierra como compost: nada se tira.', 790, 270, 400, 240, 44, INK, { rotation: -2 })],
          notes: 'Diagrama de ciclo uno a uno. La nota manuscrita resume la idea: las cáscaras y posos acaban en el compost.' },
        { title: 'Mira cómo crece', layout: 'titleOnly', transition: 'fade', extra: [
          withAnims(blot('ellipse', 120, 220, 460, 420, '#9cc58a', 0, 55), A('fade-in', { duration: 1200 })),
          { id: uid(), x: 150, y: 200, w: 400, h: 420, rotation: 0, type: 'ink', points: sprout, vw: 400, vh: 380, color: GREEN, width: 9, animation: A('draw', { duration: 3000, start: 'withPrev' }) },
          at(hand('← hojas nuevas', 470, 270, 300, 60, 44, TERRA), 'fade-right', { start: 'afterPrev' }),
          at(hand('← tallo', 380, 450, 200, 60, 44, TERRA), 'fade-right', { start: 'afterPrev' }),
          text('Las primeras dos hojas no son «hojas de verdad»: son los cotiledones, la reserva de energía de la semilla. Las siguientes ya son las de la planta.', 900, 230, 320, 380, { fontSize: 26, color: INK })],
          notes: 'Clic: la mancha aparece y el brote se dibuja solo (efecto Dibujar sobre un trazo de tinta). Después llegan las etiquetas manuscritas.' },
        { title: 'De hueso a planta', layout: 'titleOnly', transition: 'fade', extra: [
          blot('ellipse', 70, 170, 480, 480, '#cfe3a8', 0, 60),
          model('kh-Avocado', 120, 200, 380, 420, { motion: 'swing', view: 'three' }),
          ...['Lava el hueso y clávale tres palillos.', 'Sumerge la base en un vaso de agua.', 'Cambia el agua cada semana.', 'En seis u ocho semanas brota: pásalo a maceta.'].map((s, i) =>
            at(text(`<div><span style="font-family:${FF.caveat};font-size:52px;color:${TERRA}">${i + 1}</span>&nbsp;&nbsp;${s}</div>`, 600, 190 + i * 112, 620, 100, { fontSize: 30, color: INK, vAlign: 'middle' }),
              'fade-up', { duration: 600 }))],
          notes: 'El aguacate es un modelo 3D que se balancea al llegar. Cada paso aparece con un clic.' },
        { layout: 'blank', transition: 'fade', extra: [
          blot('cloud', -100, -60, 560, 360, '#9cc58a', -6, 40), blot('ellipse', 1000, 480, 400, 360, '#f2b8a0', 0, 45),
          pollBlock({ fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: '¿Qué plantarías primero?', options: ['Tomates', 'Hierbas aromáticas', 'Lechugas', 'Fresas'] })],
          notes: 'Votación con el móvil. Aprovechad el resultado para recomendar por dónde empezar.' },
        { layout: 'blank', transition: 'fade', transitionSpeed: 'slow', extra: [
          blot('ellipse', 390, 110, 500, 500, '#f2d48a', 0, 70),
          text('cultiva · cuida · cosecha · comparte · cultiva · cuida · cosecha · comparte · ', 365, 85, 550, 550, { fontFamily: FF.caveat, fontSize: 38, curve: 100, color: GREEN, textAlign: 'center' }),
          hand('¡Gracias!', 390, 290, 500, 140, 110, TERRA, { textAlign: 'center' }),
          text('Taller de huerto urbano · Centro cívico del barrio', 140, 640, 1000, 40, { fontSize: 24, textAlign: 'center', color: INK })],
          notes: 'Texto curvo en círculo alrededor de una mancha amarilla, como un sol pintado.' },
      ]);
    } },

  // ============================================================================
  // 4 · Glassmorphism: see-through cards over coloured lights.
  creative_glass: { name: 'Glassmorphism: app de finanzas', cat: 'creative',
    summary: 'Tarjetas translúcidas sobre brillos de color, móvil con la app, gráfico de dona, Transformar una tarjeta y votación de valoración',
    make: () => {
      const BG = '#0a0f24', V = '#7a5cff', C = '#00d4ff', P = '#ff5fa2', W = '#ffffff', goal = uid(), goalBar = uid(), goalFill = uid();
      const lights = (k = 0) => [glow(-200 + k * 60, -260, 760, V, BG, 80), glow(760 - k * 80, 260, 700, P, BG, 65), glow(380, 420 - k * 40, 560, C, BG, 55)];
      const glass = (html, x, y, w, h, p = {}) => card(`<div>${html}</div>`, x, y, w, h, '#ffffff1a', { borderColor: '#ffffff40', radius: 28, color: W, shadow: { x: 0, y: 24, blur: 40, color: '#00000066' }, ...p });
      const pane = (x, y, w, h) => shape('rounded', x, y, w, h, '#ffffff1a', { stroke: '#ffffff40', strokeWidth: 1.5, radius: 28, shadow: { x: 0, y: 24, blur: 40, color: '#00000066' } });
      const chip = (t, x, y, c) => glass(`<span style="color:${c}">●</span> ${t}`, x, y, 300, 64, { fontSize: 22, radius: 32, pad: [16, 22, 16, 22], vAlign: 'middle' });
      const progress = (x, y, w, pct, c) => [withId(shape('rounded', x, y, w, 16, '#ffffff26', { radius: 8 }), goalBar), withId(shape('rounded', x, y, Math.round(w * pct), 16, c, { fill2: P, gradAngle: 0, radius: 8 }), goalFill)];
      const cats = [['Vivienda', 38, '#3f6497'], ['Comida', 22, '#c0392b'], ['Transporte', 12, '#2b7a3b'], ['Ocio', 10, '#d68910'], ['Otros', 18, '#7d3c98']];
      return numbered(mk({ name: 'Brisa · finanzas claras', palette: 'midnight', fonts: 'clean', title: { size: 50, color: W } }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          ...lights(),
          glass(`<div style="font-size:22px;letter-spacing:6px;opacity:.8">PRESENTACIÓN DE PRODUCTO · 2026</div><div style="font-size:150px;font-weight:800;line-height:1.05;margin-top:8px">Brisa</div><div style="font-size:36px;opacity:.9">Tus finanzas, claras como el cristal</div>`,
            240, 170, 800, 380, { textAlign: 'center', vAlign: 'middle' }),
          at(chip('+12 % de ahorro', 60, 90, C), 'fade-down', { start: 'afterPrev', duration: 700 }),
          at(chip('0 € de comisiones', 920, 590, P), 'fade-up', { start: 'afterPrev', duration: 700 }),
          at(chip('Todo en un solo lugar', 60, 600, V), 'fade-right', { start: 'afterPrev', duration: 700 })],
          notes: 'Glassmorphism: tarjetas blancas con poca opacidad y borde fino sobre brillos de color (degradados radiales). App inventada.' },
        { title: 'Todo tu dinero, de un vistazo', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
          ...lights(1),
          ...[['Saldo total', '8.420 €', 'en 3 cuentas', C], ['Ahorrado este mes', '640 €', '+18 % que en agosto', '#7dffb0'], ['Suscripciones', '47 €', '5 activas · 1 sin usar', P]].map(([l, n, d, c], i) =>
            withAnims(glass(`<div style="font-size:24px;opacity:.8">${l}</div><div style="font-size:64px;font-weight:800;line-height:1.15;white-space:nowrap">${n}</div><div style="font-size:22px;color:${c}">${d}</div>`,
              90 + i * 375, 220, 345, 300, { vAlign: 'middle' }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 }))),
          text('Conecta tus bancos en dos minutos. Brisa solo lee tus movimientos: nunca mueve tu dinero.', 90, 570, 1100, 80, { fontSize: 28, color: '#cfd6ff' })],
          notes: 'Datos de ejemplo. Las tres tarjetas aparecen seguidas con un clic.' },
        { title: '¿A dónde se va?', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
          ...lights(2),
          pane(90, 180, 500, 480),
          chartBlock({ x: 130, y: 210, w: 420, h: 420, chartType: 'doughnut', data: cats.map(([l, v]) => ({ label: l, value: v })) }),
          glass(cats.map(([l, v, c]) => `<div style="display:flex;justify-content:space-between;margin:10px 0"><span><span style="color:${c};font-size:34px;line-height:0">●</span> ${l}</span><b>${v} %</b></div>`).join(''),
            640, 180, 550, 360, { fontSize: 30 }),
          text('La vivienda se lleva más de un tercio. El ocio, solo un 10 %.', 640, 570, 550, 90, { fontSize: 24, color: '#cfd6ff' })],
          notes: 'Gráfico de dona dentro de una tarjeta de cristal y la leyenda en otra. Porcentajes de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'convex', extra: [
          ...lights(1),
          img(appScreen(360, 720, V, 'Brisa', 4), 500, 60, 280, 600, 'Pantalla de la app Brisa en un móvil', { fit: 'cover', device: 'phone' }),
          at(glass('🍽️ Has gastado un <b>15 % menos</b> en comida', 90, 140, 370, 110, { fontSize: 24, vAlign: 'middle' }), 'fade-right', { duration: 600 }),
          at(glass('💡 Recibo de la luz: <b>58 €</b> el día 5', 90, 420, 370, 110, { fontSize: 24, vAlign: 'middle' }), 'fade-right', { start: 'afterPrev', duration: 600 }),
          at(glass('✈️ Objetivo «Lisboa» al <b>72&nbsp;%</b>', 820, 260, 370, 110, { fontSize: 24, vAlign: 'middle' }), 'fade-left', { start: 'afterPrev', duration: 600 }),
          text('Avisos que ayudan, no que agobian', 820, 400, 370, 120, { fontSize: 34, fontWeight: 800, color: W })],
          notes: 'Imagen dentro de un móvil (Imagen ▸ Dispositivo) y avisos en tarjetas de cristal que entran por los lados.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          ...lights(),
          text('Objetivos de ahorro', 90, 70, 900, 80, { fontSize: 50, fontWeight: 800, color: W }),
          withId(glass('<div style="font-size:24px;opacity:.8">OBJETIVO</div><div style="font-size:40px;font-weight:800">✈️ Viaje a Lisboa</div>', 90, 220, 420, 200), goal),
          ...progress(130, 370, 340, 0.72, C),
          text('Toca un objetivo para ver el detalle →', 580, 290, 560, 60, { fontSize: 28, color: '#cfd6ff' })],
          notes: 'Pasa a la siguiente: la tarjeta crece con Transformar (mismo objeto en las dos diapositivas).' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          ...lights(2),
          withId(glass('<div style="font-size:24px;opacity:.8">OBJETIVO</div><div style="font-size:56px;font-weight:800">✈️ Viaje a Lisboa</div>'
            + '<div style="display:flex;gap:60px;margin-top:150px;font-size:26px"><div><div style="opacity:.7">Ahorrado</div><b style="font-size:46px">864 €</b></div><div><div style="opacity:.7">Meta</div><b style="font-size:46px">1.200 €</b></div><div><div style="opacity:.7">Al mes</div><b style="font-size:46px">120 €</b></div></div>',
          90, 70, 1100, 580, { pad: [40, 50, 40, 50] }), goal),
          ...progress(140, 260, 1000, 0.72, C),
          text('72 %', 1040, 200, 100, 44, { fontSize: 30, fontWeight: 800, color: C, textAlign: 'right' })],
          notes: 'Transformar (como el Morph de PowerPoint): la tarjeta y la barra de progreso crecen hasta ocupar la pantalla.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          ...lights(1),
          pane(60, 40, 1160, 640),
          pollBlock({ kind: 'rating', fontSize: 34, x: 100, y: 70, w: 1080, h: 580, question: 'Del 1 al 5: ¿cuánto controlas hoy tus gastos?', options: [] })],
          notes: 'Valoración de 1 a 5 desde el móvil. Una media baja es la mejor entrada para la demostración.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          ...lights(),
          glass('<div style="font-size:96px;font-weight:800;line-height:1.1">Pruébala gratis</div><div style="font-size:34px;margin-top:16px;opacity:.9">brisa.example · iOS y Android</div>', 190, 200, 900, 320, { textAlign: 'center', vAlign: 'middle' })],
          notes: 'Cierre limpio: una sola tarjeta de cristal con la llamada a la acción.' },
      ]));
    } },

  // ============================================================================
  // 5 · Comic: panels, speech and thought bubbles, sound effects in Text Art.
  creative_comic: { name: 'Cómic: superpoderes animales', cat: 'creative',
    summary: 'Estilo cómic: viñetas, bocadillos de diálogo y pensamiento, onomatopeyas en Text Art que rebotan, zorro 3D, gráfico y concurso',
    make: () => {
      const INK = '#141414', YEL = '#ffe14d', RED = '#e8322f', BLUE = '#2f7de1', PAGE = '#fffbea';
      const panel = (x, y, w, h, fill, rot = 0) => R(x, y, w, h, fill, { stroke: INK, strokeWidth: 6, rotation: rot });
      const bubble = (kind, t, x, y, w, h, p = {}) => shape(kind, x, y, w, h, '#ffffff', { stroke: INK, strokeWidth: 4, html: t, fontSize: 26, color: INK, fontFamily: FF.poppins, fontWeight: 700, ...p });
      const sfx = (t, x, y, w, h, size, wa, rot, p = {}) => text(t, x, y, w, h, { fontFamily: FF.anton, fontSize: size, wordart: wa, rotation: rot, textAlign: 'center', letterSpacing: 2, ...p });
      const caption = (t, x, y, w, h, p = {}) => text(t, x, y, w, h, { bg: YEL, borderColor: INK, fontSize: 24, fontWeight: 800, color: INK, pad: [10, 16, 10, 16], radius: 0, fontFamily: FF.poppins, ...p });
      // Halftone dots in a corner (bigger near the corner).
      const dots = (rows = 6) => { const out = []; for (let i = 0; i < 9; i++) for (let j = 0; j < rows; j++) { const d = Math.round(22 * (1 - Math.hypot(i, j) / 11)); if (d > 3) out.push(E(1250 - i * 34 - d / 2, 18 + j * 34 - d / 2, d, d, BLUE, { opacity: 35 })); } return out; };
      const fox = lib3d('kh-Fox');
      return numbered(mk({ name: 'Superpoderes animales', palette: 'office', fonts: 'friendly', title: { size: 56, color: INK, font: FF.anton, bold: false }, decor: () => [] }, [
        { layout: 'blank', bg: YEL, transition: 'zoom', extra: [
          ...dots(),
          shape('burst', 300, 60, 700, 600, RED, { stroke: INK, strokeWidth: 6, rotation: -6 }),
          sfx('SUPERPODERES', 90, 200, 1100, 160, 128, 'retro', -4),
          sfx('ANIMALES', 290, 390, 700, 140, 116, 'outline', -4, { color: '#ffffff' }),
          caption('Nº 1 · CIENCIAS NATURALES · 3.º DE PRIMARIA', 60, 50, 600, 50),
          withAnims(shape('burst', 960, 450, 270, 240, BLUE, { stroke: INK, strokeWidth: 5, rotation: 10, html: '¡POW!', fontFamily: FF.anton, fontSize: 44, color: '#ffffff' }),
            A('zoom-in', { duration: 300, sound: 'pop' }), A('bounce', { start: 'afterPrev' }))],
          notes: 'Portada de cómic: Text Art «Retro» y «Contorno», una explosión como fondo y otra que, con un clic, entra con un pop y rebota.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [
          ...[[50, 40, 580, 300, '#bfe3ff', -0.6], [650, 40, 580, 300, '#ffd6e0', 0.6], [50, 360, 1180, 320, '#d8f5c8', 0]].map(([x, y, w, h, c, r]) => panel(x, y, w, h, c, r)),
          ...[
            [text('🦐', 80, 130, 200, 200, { fontSize: 140 }), bubble('speech', '¡Golpeo tan rápido que el agua hierve!', 300, 60, 310, 170, { fontSize: 24 }), caption('LA GAMBA MANTIS', 80, 270, 300, 46), sfx('¡CRAC!', 420, 230, 200, 90, 66, 'fire', -10)],
            [text('🐙', 680, 130, 200, 200, { fontSize: 140 }), bubble('speechround', '¡Tengo tres corazones y sangre azul!', 890, 60, 320, 170, { fontSize: 24 }), caption('EL PULPO', 680, 270, 200, 46), sfx('BLUB', 1030, 240, 180, 80, 58, 'ice', 8)],
            [text('🦎', 90, 420, 240, 230, { fontSize: 170 }), bubble('speech', 'Si pierdo una pata… ¡me crece otra! Y hasta parte del corazón.', 360, 400, 470, 170), caption('EL AJOLOTE: SE REGENERA', 360, 600, 420, 46), sfx('¡ZAS!', 890, 450, 300, 160, 120, 'retro', -8)],
          ].flatMap((group, i) => group.map((b, k) => ({ ...b, animation: A(k ? 'zoom-in' : 'fade-in', { start: k ? 'withPrev' : 'click', duration: 400, ...(k === 3 && { sound: 'pop' }) }) })))],
          notes: 'Una página con tres viñetas. Cada clic llena una viñeta: el animal, su bocadillo, el cartucho de texto y la onomatopeya a la vez.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [
          panel(50, 40, 700, 640, '#cfe8ff'),
          model('kh-Fox', 80, 140, 640, 520, { view: 'three', motion: 'swing', caption: '' }),
          caption('EL ZORRO ROJO: SUPEROÍDO', 70, 60, 400, 46),
          bubble('thought', 'Oigo a un ratón bajo un metro de nieve…', 790, 50, 420, 300, { fontSize: 28 }),
          at(text('Gira las orejas como antenas y salta de cabeza sobre la nieve justo donde está su presa.', 790, 400, 430, 200, { fontSize: 28, color: INK }), 'fade-up'),
          sfx('ÑIC ÑIC', 520, 560, 220, 90, 54, 'outline', -8),
          text(`Modelo 3D: ${fox.credit}`, 790, 640, 430, 36, { fontSize: 12, color: '#6b6b6b' })],
          notes: 'Un zorro 3D dentro de una viñeta, con un bocadillo de pensamiento (forma «Bocadillo de pensamiento») y texto que aparece con un clic.' },
        { title: '¿QUIÉN CORRE MÁS?', layout: 'titleOnly', bg: PAGE, transition: 'cube', extra: [
          ...dots(4),
          panel(50, 170, 1180, 500, '#ffffff'),
          chartBlock({ x: 90, y: 200, w: 820, h: 440, chartType: 'hbar', color: RED, dataLabels: true,
            data: [{ label: 'Guepardo', value: 110 }, { label: 'Berrendo', value: 88 }, { label: 'León', value: 80 }, { label: 'Caballo', value: 70 }, { label: 'Humano', value: 44 }] }),
          withAnims(shape('burst', 920, 210, 290, 270, YEL, { stroke: INK, strokeWidth: 5, html: '¡ZOOM!', fontFamily: FF.anton, fontSize: 42, color: INK }), A('spin', { duration: 800 })),
          text('Velocidad máxima en km/h (aproximada)', 930, 520, 270, 110, { fontSize: 24, fontWeight: 700, color: INK, textAlign: 'center' })],
          tp: { rotation: -2 },
          notes: 'Velocidades máximas aproximadas en carreras cortas. Clic: la explosión entra girando (efecto «Girar»).' },
        { title: '¿DE QUIÉN ES ESTE SONIDO?', layout: 'titleOnly', bg: YEL, transition: 'cube', extra: [
          ...dots(4),
          ...[['GRRR', 'purple', -8, '🐻 oso'], ['CROAC', 'ice', 6, '🐸 rana'], ['KIKIRIKÍ', 'fire', -4, '🐓 gallo'], ['MUUU', 'retro', 8, '🐄 vaca']].flatMap(([s, wa, r, who], i) => {
            const x = 70 + (i % 2) * 580, y = 190 + Math.floor(i / 2) * 250;
            return [panel(x, y, 560, 220, '#ffffff', r / 4),
              withAnims(sfx(s, x + 20, y + 20, 520, 130, 100, wa, r), A('zoom-in', { duration: 300 }), A('bounce', { start: 'afterPrev' })),
              at(text(who, x + 20, y + 150, 520, 56, { fontSize: 32, fontWeight: 800, textAlign: 'center', color: INK }), 'fade-in', { start: 'afterPrev' })];
          })],
          notes: 'Onomatopeyas en Text Art con giro: cada una entra con un clic, rebota y luego aparece el animal. Buen momento para que adivine la clase antes de que salga la respuesta.' },
        { layout: 'blank', bg: BLUE, transition: 'zoom', extra: [
          pollBlock({ kind: 'quiz', fontSize: 40, x: 60, y: 40, w: 1160, h: 640, time: 20, correct: [0],
            question: '¿Qué animal puede sobrevivir en el espacio exterior?', options: ['El tardígrado', 'La cucaracha', 'El pulpo', 'La hormiga'] })],
          notes: 'Concurso con puntos desde el móvil. Respuesta: el tardígrado, un animal de medio milímetro que aguanta el vacío y el frío extremo.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [
          panel(50, 40, 1180, 640, '#ffd6e0', 0),
          bubble('thought', '¿Y tú? ¿Qué superpoder animal elegirías?', 380, 90, 520, 330, { fontSize: 34 }),
          caption('CONTINUARÁ…', 840, 560, 340, 70, { fontSize: 40, textAlign: 'center', vAlign: 'middle' }),
          withAnims(sfx('FIN', 90, 360, 420, 230, 200, 'retro', -8, { lineHeight: 1 }), A('zoom-in', { duration: 400, sound: 'applause' }))],
          notes: 'Cierre: un bocadillo de pensamiento con la pregunta para la clase. Con un clic entra «FIN», con aplausos.' },
      ]));
    } },

  // ============================================================================
  // 6 · Fashion magazine: a masthead, serif type, columns, big quotes.
  creative_fashion: { name: 'Revista de moda: otoño lento', cat: 'creative',
    summary: 'Estilo revista: cabecera en serif, reloj 3D en portada, columnas con capitular, cita grande, paleta de temporada y gráfico',
    make: () => {
      const IVORY = '#f4efe8', INK = '#1a1a1a', CAMEL = '#b08a5b', WINE = '#6e1e2b', GREY = '#6b6258';
      const rule = (x, y, w, c = INK, h = 2) => R(x, y, w, h, c);
      const folio = n => text(`MIRADA · Nº 47 · OTOÑO 2026 · ${n}`, 60, 668, 1160, 30, { fontSize: 16, color: GREY, letterSpacing: 4 });
      const watch = lib3d('kh-ChronographWatch');
      const barcode = (() => { const r = rng(47), out = []; let x = 0; while (x < 120) { const w = 2 + Math.round(r() * 5); out.push(R(500 + x, 590, w, 60, INK)); x += w + 2 + Math.round(r() * 4); } return out; })();
      return numbered(mk({ name: 'MIRADA · revista de moda', palette: 'grayscale', fonts: 'classic', title: { size: 60, color: INK, bold: false } }, [
        { layout: 'blank', bg: IVORY, transition: 'fade', extra: [
          E(700, 260, 440, 440, '#e3d6c4'), R(700, 480, 440, 200, '#e3d6c4'),
          model('kh-ChronographWatch', 720, 280, 400, 380, { autoRotate: true, view: 'front', caption: '' }),
          text('MIRADA', 60, 20, 1160, 190, { fontFamily: FF.abril, fontSize: 170, color: INK, textAlign: 'center', letterSpacing: 24 }),
          rule(60, 215, 1160, INK, 2),
          text('Nº 47 · OTOÑO 2026 · 6,50 €', 60, 225, 600, 30, { fontSize: 18, letterSpacing: 4, color: GREY }),
          text('Otoño<br><i>lento</i>', 60, 270, 600, 260, { fontFamily: FF.playfair, fontSize: 110, lineHeight: 1, color: WINE }),
          text('El armario de diez prendas<br>Colores que calman<br>Comprar menos, elegir mejor', 64, 540, 560, 120, { fontSize: 24, lineHeight: 1.45, color: INK }),
          ...barcode],
          notes: 'Portada de revista: cabecera en Abril Fatface con mucho espaciado, un arco (círculo + rectángulo) como fondo del reloj 3D y un código de barras hecho con rectángulos.' },
        { layout: 'blank', bg: IVORY, transition: 'slide', extra: [
          text('CARTA DE LA EDITORA', 60, 60, 400, 30, { fontSize: 18, letterSpacing: 6, color: CAMEL }),
          text('Vestirse<br>despacio', 60, 100, 420, 260, { fontFamily: FF.playfair, fontSize: 84, lineHeight: 1.02, color: INK }),
          rule(60, 380, 120, WINE, 4),
          text('Este número nació de una pregunta incómoda: ¿cuántas prendas usamos de verdad?', 60, 410, 400, 200, { fontFamily: FF.playfair, fontStyle: 'italic', fontSize: 28, color: GREY }),
          text(`<span style="font-family:${FF.abril};font-size:92px;float:left;line-height:.8;margin:6px 10px 0 0;color:${WINE}">E</span>n cada temporada nos prometen que todo ha cambiado. Pero los armarios que más admiramos no cambian: crecen despacio, con piezas que se repiten sin aburrir. `
            + 'Hemos pasado tres meses con veinte personas que compran menos de diez prendas al año. Ninguna lo vive como un sacrificio; casi todas hablan de alivio. '
            + 'En las páginas que siguen encontrarás sus trucos, una paleta pensada para combinar sin esfuerzo y un armario de diez piezas que da para cien conjuntos. '
            + 'No te pedimos que lo tires todo. Solo que, la próxima vez, mires dos veces.', 520, 70, 700, 570, { fontSize: 26, lineHeight: 1.55, columns: 2, color: INK }),
          text('— La redacción', 900, 600, 320, 50, { fontFamily: FF.playfair, fontStyle: 'italic', fontSize: 26, color: WINE, textAlign: 'right' }),
          folio('3')],
          notes: 'Texto en dos columnas (Formato ▸ Columnas) con letra capitular y la entradilla en cursiva: maquetación de revista.' },
        { layout: 'blank', bg: WINE, transition: 'fade', extra: [
          text('“', 60, 10, 300, 320, { fontFamily: FF.abril, fontSize: 340, color: CAMEL, lineHeight: 1 }),
          at(text('La elegancia consiste en quitar, no en añadir.', 160, 230, 980, 300, { fontFamily: FF.playfair, fontStyle: 'italic', fontSize: 92, color: IVORY, lineHeight: 1.15 }), 'fade-up', { duration: 900 }),
          at(text('— Una sastra de Valencia, cuarenta años de oficio', 160, 570, 960, 50, { fontSize: 26, color: '#e8d9c4', letterSpacing: 2 }), 'fade-in', { start: 'afterPrev' })],
          notes: 'Cita a toda página, con unas comillas gigantes. Testimonio anónimo inventado para el ejemplo.' },
        { title: 'La paleta de la temporada', layout: 'titleOnly', bg: IVORY, transition: 'slide', extra: [
          ...[['Camel', CAMEL], ['Burdeos', WINE], ['Salvia', '#9aa58a'], ['Tinta', '#1f2a44'], ['Hueso', '#e3d6c4']].flatMap(([n, c], i) => [
            withAnims(R(60 + i * 236, 190, 216, 400, c, { shadow: { x: 0, y: 10, blur: 20, color: '#0000001f' } }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 })),
            withAnims(text(n.toUpperCase(), 60 + i * 236, 210, 60, 360, { vertical: true, fontSize: 30, letterSpacing: 8, color: i === 4 ? INK : IVORY, fontWeight: 700 }), A('fade-in', { start: 'withPrev', duration: 500 })),
            text(c.toUpperCase(), 60 + i * 236, 600, 216, 40, { fontSize: 20, letterSpacing: 3, color: GREY })]),
          folio('12')],
          notes: 'Cinco muestras de color con el nombre en texto vertical. Aparecen seguidas, de izquierda a derecha.' },
        { title: 'Diez prendas, cien conjuntos', layout: 'titleOnly', bg: IVORY, transition: 'slide', extra: [
          ...['Abrigo de lana camel', 'Jersey de cuello alto', 'Camisa blanca de algodón', 'Pantalón recto oscuro', 'Vaquero clásico', 'Falda midi', 'Chaqueta de punto', 'Vestido negro sencillo', 'Botín de piel', 'Pañuelo de seda'].map((t, i) =>
            text(`<div><span style="font-family:${FF.playfair};font-style:italic;color:${WINE};font-size:34px">${String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp; ${t}</div>`, 60 + Math.floor(i / 5) * 590, 190 + (i % 5) * 88, 560, 70,
              { fontSize: 28, color: INK, vAlign: 'middle' })),
          ...Array.from({ length: 5 }, (_, i) => [rule(60, 262 + i * 88, 560, '#cbbfae', 1), rule(650, 262 + i * 88, 570, '#cbbfae', 1)]).flat(),
          folio('24')],
          notes: 'Lista numerada en dos columnas con filetes finos: un recurso clásico de revista.' },
        { title: 'Cómo compramos ahora', layout: 'titleOnly', bg: IVORY, transition: 'slide', extra: [
          chartBlock({ x: 60, y: 190, w: 700, h: 430, chartType: 'hbar', color: WINE, dataLabels: true,
            data: [{ label: 'Menos y mejor', value: 62 }, { label: 'Igual', value: 27 }, { label: 'Más', value: 11 }] }),
          text(`<div style="font-family:${FF.abril};font-size:150px;line-height:1;color:${CAMEL}">62 %</div><div style="font-family:${FF.playfair};font-style:italic;font-size:30px">de nuestras lectoras dice comprar menos ropa que hace tres años.</div>`,
            820, 210, 400, 400, { color: INK }),
          folio('31')],
          notes: 'Encuesta inventada a lectoras (porcentajes). Gráfico de barras en el color de la temporada.' },
        { layout: 'blank', bg: INK, transition: 'fade', transitionSpeed: 'slow', extra: [
          text('MIRADA', 60, 120, 1160, 190, { fontFamily: FF.abril, fontSize: 170, color: IVORY, textAlign: 'center', letterSpacing: 24 }),
          rule(540, 330, 200, CAMEL, 3),
          text('En el próximo número', 60, 370, 1160, 50, { fontSize: 26, letterSpacing: 6, color: CAMEL, textAlign: 'center' }),
          text('<i>Invierno: el abrigo que dura veinte años</i>', 60, 430, 1160, 80, { fontFamily: FF.playfair, fontSize: 48, color: IVORY, textAlign: 'center' }),
          text(`Modelo 3D de la portada: ${watch.credit}`, 60, 640, 1160, 40, { fontSize: 12, color: '#8a8178', textAlign: 'center' })],
          notes: 'Contraportada: la cabecera en claro sobre negro y el adelanto del siguiente número.' },
      ]));
    } },

  // ============================================================================
  // 7 · Japanese minimalism: white, a red sun, vertical text, slow fades.
  creative_zen: { name: 'Minimalismo japonés: el té', cat: 'creative',
    summary: 'Minimalismo japonés: mucho blanco, sol rojo que se transforma, texto vertical, ensō que se pinta solo y cuenta atrás',
    make: () => {
      const PAPER = '#fbfaf6', INK = '#2b2b2b', RED = '#c8102e', GREY = '#8c8c8c', sun = uid();
      const slow = { transition: 'fade', transitionSpeed: 'slow' };
      const vtext = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { vertical: true, fontSize: size, color, letterSpacing: 10, fontFamily: FF.cormorant, ...p });
      const ens = Array.from({ length: 64 }, (_, i) => { const a = -1.9 + i / 63 * 5.9, r = 150 + Math.sin(i / 5) * 4; return [Math.round(200 + r * Math.cos(a)), Math.round(200 + r * Math.sin(a))]; });
      return numbered(mk({ name: 'La pausa del té', palette: 'paper', fonts: 'editorial', title: { size: 46, color: INK, font: FF.cormorant, bold: false } }, [
        { layout: 'blank', bg: PAPER, ...slow, extra: [
          withAnims(withId(E(700, 140, 320, 320, RED), sun), A('fade-in', { duration: 2000 })),
          vtext('茶の湯', 1110, 80, 110, 420, 76),
          text('La pausa', 100, 400, 700, 140, { fontFamily: FF.cormorant, fontSize: 120, color: INK, lineHeight: 1 }),
          R(104, 550, 60, 2, RED),
          text('Una introducción a la ceremonia del té', 100, 575, 700, 50, { fontSize: 26, color: GREY, letterSpacing: 2 })],
          notes: 'Mucho espacio en blanco, un solo color de acento y texto vertical en japonés (cha no yu, «agua caliente para el té»). Con un clic, el sol sale despacio.' },
        { layout: 'blank', bg: PAPER, ...slow, extra: [
          vtext('一期一会', 1040, 70, 140, 580, 100, INK),
          E(1000, 600, 24, 24, RED),
          text('<i>Ichigo ichie</i>', 100, 200, 700, 60, { fontFamily: FF.cormorant, fontSize: 40, color: RED }),
          at(text('Cada encuentro sucede una sola vez. Por eso se cuida cada gesto.', 100, 280, 760, 200, { fontFamily: FF.cormorant, fontSize: 54, color: INK, lineHeight: 1.2 }), 'fade-in', { duration: 1500 })],
          notes: '«Una vez, un encuentro»: la idea que sostiene toda la ceremonia. Leedla en voz alta y dejad unos segundos de silencio.' },
        { title: 'Cuatro principios', layout: 'titleOnly', bg: PAPER, ...slow, extra: [
          ...[['和', 'Wa', 'Armonía'], ['敬', 'Kei', 'Respeto'], ['清', 'Sei', 'Pureza'], ['寂', 'Jaku', 'Calma']].flatMap(([k, r, m], i) => {
            const x = 140 + i * 270;
            return [withAnims(text(k, x, 210, 200, 200, { fontSize: 150, textAlign: 'center', color: i === 0 ? RED : INK, fontFamily: FF.cormorant }), A('fade-in', { start: i ? 'afterPrev' : 'click', duration: 900 })),
              withAnims(text(`<i>${r}</i><br>${m}`, x - 20, 440, 240, 130, { fontSize: 38, textAlign: 'center', color: GREY, fontFamily: FF.cormorant }), A('fade-in', { start: 'withPrev', duration: 900 }))];
          }),
          R(140, 590, 1000, 1, '#d9d4c7')],
          notes: 'Wa, kei, sei, jaku. Aparecen uno tras otro con un solo clic, despacio.' },
        { layout: 'blank', bg: PAPER, ...slow, extra: [
          { id: uid(), x: 120, y: 140, w: 440, h: 440, rotation: 0, type: 'ink', points: ens, vw: 400, vh: 400, color: INK, width: 22, animation: A('draw', { duration: 3200 }) },
          text('Ensō', 680, 210, 500, 90, { fontFamily: FF.cormorant, fontSize: 76, color: INK }),
          text('El círculo se pinta de un solo trazo, sin corregir. Queda abierto a propósito: lo imperfecto también está completo.', 680, 320, 500, 220, { fontFamily: FF.cormorant, fontSize: 34, color: GREY, lineHeight: 1.3 }),
          E(690, 560, 16, 16, RED)],
          notes: 'Clic: el ensō se traza como un pincel (efecto Dibujar sobre un trazo de tinta).' },
        { title: 'El camino del cuenco', layout: 'titleOnly', bg: PAPER, ...slow, extra: [
          R(160, 380, 960, 1, '#cfc9ba'),
          ...['Purificar', 'Calentar', 'Batir', 'Servir', 'Contemplar'].flatMap((s, i) => {
            const cx = 160 + i * 240;
            return [withAnims(E(cx - 9, 371, 18, 18, i === 4 ? RED : INK), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 500 })),
              withAnims(text(s, cx - 120, i % 2 ? 410 : 300, 240, 60, { fontSize: 40, textAlign: 'center', fontFamily: FF.cormorant, color: INK }), A('fade-in', { start: 'withPrev', duration: 700 }))];
          })],
          notes: 'Cinco pasos en una línea, sin cajas ni flechas: el orden lo dicen el espacio y la línea.' },
        { layout: 'blank', bg: PAPER, ...slow, extra: [
          withId(E(1110, 60, 80, 80, RED), sun),
          text('Deja reposar el agua', 100, 120, 700, 80, { fontFamily: FF.cormorant, fontSize: 60, color: INK }),
          text('Hierve y espera hasta unos 80 °C. Mientras tanto, solo respira.', 100, 220, 520, 140, { fontFamily: FF.cormorant, fontSize: 34, color: GREY, lineHeight: 1.3 }),
          timer(180, 760, 210, 360, { color: RED })],
          notes: 'Cuenta atrás de tres minutos en rojo. Proponed a la sala tres minutos de silencio real.' },
        { layout: 'blank', bg: PAPER, autoAnimate: true, transitionSpeed: 'slow', extra: [
          withId(E(440, 100, 400, 400, RED), sun),
          vtext('ありがとう', 590, 130, 100, 340, 54, '#ffffff', { letterSpacing: 6 }),
          text('Gracias', 140, 540, 1000, 80, { fontFamily: FF.cormorant, fontSize: 56, color: INK, textAlign: 'center' }),
          text('Taller de té · sala 2', 140, 620, 1000, 40, { fontSize: 22, color: GREY, textAlign: 'center', letterSpacing: 4 })],
          notes: 'Transformar: el sol pequeño de la esquina crece hasta el centro. Dentro, «arigatō» en vertical.' },
      ]));
    } },

  // ============================================================================
  // 8 · Bauhaus: circles, triangles and squares in the primaries.
  creative_bauhaus: { name: 'Bauhaus: forma y función', cat: 'creative',
    summary: 'Arte geométrico Bauhaus: composición de formas primarias que giran y rebotan, cronología, Transformar una retícula y actividad de emparejar',
    make: () => {
      const CREAM = '#f2ede3', INK = '#111111', RED = '#e63329', BLUE = '#1f4e9c', YEL = '#f6c40f';
      const head = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: FF.josefin, fontSize: size, fontWeight: 700, color, letterSpacing: 2, ...p });
      // The grid of nine pieces, for Transform: the same ids on both slides.
      const ids = Array.from({ length: 9 }, () => uid());
      const kinds = [['ellipse', RED], ['rect', BLUE], ['triangle', YEL], ['pie', INK], ['ellipse', YEL], ['rect', RED], ['triangle', BLUE], ['rect', INK], ['ellipse', BLUE]];
      const gridA = kinds.map(([k, c], i) => withId(shape(k, 700 + (i % 3) * 170, 150 + Math.floor(i / 3) * 170, 150, 150, c), ids[i]));
      const posB = [[60, 40, 520, 520, 0], [560, 360, 300, 300, 0], [880, 80, 340, 300, 180], [880, 380, 300, 300, 90], [600, 60, 220, 220, 0], [40, 560, 520, 100, 0], [1060, 560, 160, 120, 0], [560, 40, 30, 640, 0], [330, 300, 180, 180, 0]];
      const gridB = kinds.map(([k, c], i) => { const [x, y, w, h, r] = posB[i]; return withId(shape(k, x, y, w, h, c, { rotation: r }), ids[i]); });
      return numbered(mk({ name: 'Bauhaus: forma y función', palette: 'office', fonts: 'modern', title: { size: 54, color: INK, font: FF.josefin } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          at(E(640, 70, 520, 520, BLUE), 'zoom-in', { duration: 700 }),
          withAnims(shape('pie', 900, 330, 340, 340, RED, { rotation: 90 }), A('spin', { start: 'afterPrev', duration: 700 })),
          at(shape('triangle', 660, 400, 280, 240, YEL), 'fade-up', { start: 'afterPrev', duration: 500 }),
          at(R(60, 470, 640, 26, INK), 'fade-right', { start: 'afterPrev', duration: 500 }),
          at(R(980, 60, 26, 260, INK), 'fade-down', { start: 'withPrev', duration: 500 }),
          head('BAUHAUS', 60, 230, 700, 150, 118, INK, { letterSpacing: 4 }),
          head('Forma y función · 1919–1933', 64, 520, 640, 50, 32, RED),
          text('Una escuela que cambió la forma de las cosas cotidianas', 64, 580, 560, 80, { fontSize: 24, color: INK })],
          notes: 'Composición de formas primarias que se monta sola al empezar: círculo, cuarto de círculo que gira, triángulo y barras.' },
        { title: 'Tres ciudades, catorce años', layout: 'titleOnly', bg: CREAM, transition: 'push', extra: [
          R(100, 380, 1080, 14, INK),
          ...[['ellipse', RED, '1919', 'Weimar', 'Nace la escuela: arte y oficio juntos'], ['rect', BLUE, '1925', 'Dessau', 'Edificio propio, todo de vidrio'], ['triangle', YEL, '1932', 'Berlín', 'Un último traslado'], ['rect', INK, '1933', 'Cierre', 'Presiones políticas: la escuela se disuelve']]
            .flatMap(([k, c, y, city, d], i) => { const x = 140 + i * 280; return [
              withAnims(shape(k, x, 327, 120, 120, c, { rotation: k === 'rect' && c === INK ? 45 : 0 }), A('zoom-in', { start: 'click', duration: 400 })),
              at(head(y, x - 40, 200, 200, 70, 54, c === YEL ? '#b58d00' : c), 'fade-down', { start: 'withPrev' }),
              at(text(`<b>${city}</b><br>${d}`, x - 50, 470, 220, 150, { fontSize: 24, textAlign: 'center', color: INK }), 'fade-up', { start: 'withPrev' })]; })],
          notes: 'Cronología hecha a mano con formas: cada clic añade una etapa. Weimar, Dessau y Berlín.' },
        { title: 'Un color para cada forma', layout: 'titleOnly', bg: CREAM, transition: 'push', extra: [
          withAnims(shape('triangle', 110, 200, 300, 270, YEL), A('zoom-in', { duration: 400 }), A('spin', { start: 'afterPrev', duration: 900 })),
          withAnims(R(500, 200, 270, 270, RED), A('zoom-in', { duration: 400 }), A('bounce', { start: 'afterPrev' })),
          withAnims(E(870, 200, 290, 290, BLUE), A('zoom-in', { duration: 400 }), A('grow', { start: 'afterPrev' })),
          text('En la escuela se preguntó qué color pedía cada forma: el triángulo, agudo, pedía amarillo; el cuadrado, firme, rojo; el círculo, sereno, azul.', 110, 530, 1060, 120, { fontSize: 28, textAlign: 'center', color: INK })],
          notes: 'Una encuesta famosa de la escuela. Cada forma entra y luego hace su propio énfasis: girar, rebotar y crecer.' },
        { title: 'La retícula', layout: 'titleOnly', bg: CREAM, transition: 'fade', extra: [
          ...gridA,
          text('Nueve piezas en orden. Tres formas, tres colores primarios y el negro.<br><br>Pasa a la siguiente diapositiva…', 100, 220, 520, 300, { fontSize: 30, color: INK })],
          notes: 'Las nueve formas tienen el mismo identificador que en la diapositiva siguiente: Transformar las lleva a su nuevo sitio.' },
        { layout: 'blank', bg: CREAM, autoAnimate: true, extra: [
          ...gridB,
          head('Mismas piezas,<br>otra composición', 620, 300, 260, 120, 26, INK, { letterSpacing: 1 })],
          notes: 'Transformar (Morph): las mismas nueve piezas cambian de tamaño, posición y giro. Así se ve cómo una retícula sostiene composiciones muy distintas.' },
        { title: 'Los talleres', layout: 'titleOnly', bg: CREAM, transition: 'push', extra: [
          dg('radial', 'Diseño\n  Metal\n  Textil\n  Madera\n  Imprenta\n  Cerámica\n  Escena', 100, 170, 700, 500, { colors: 'colorful' }),
          text('En lugar de aulas, talleres: cada estudiante aprendía un oficio con las manos y lo llevaba a la industria.', 840, 260, 360, 300, { fontSize: 28, color: INK })],
          notes: 'Diagrama radial con los talleres de la escuela. El de imprenta inventó buena parte de la tipografía moderna.' },
        { layout: 'blank', bg: CREAM, transition: 'push', extra: [
          pollBlock({ kind: 'match', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: 'Une cada forma con su color', options: ['Triángulo = Amarillo', 'Cuadrado = Rojo', 'Círculo = Azul'] })],
          notes: 'Actividad de emparejar desde el móvil: cada persona une las formas con sus colores y se corrige sola.' },
        { layout: 'blank', bg: INK, transition: 'zoom', extra: [
          withAnims(E(120, 160, 400, 400, RED), A('spin360', { duration: 1200 })),
          shape('triangle', 360, 330, 260, 230, YEL),
          R(540, 180, 26, 360, CREAM),
          head('Diseñar<br>es ordenar.', 620, 200, 600, 260, 96, CREAM, { lineHeight: 1.05 }),
          head('Gracias', 624, 500, 400, 60, 36, YEL)],
          notes: 'Cierre: el círculo da una vuelta completa al llegar.' },
      ]));
    } },

  // ============================================================================
  // 9 · Space: stars, nebula glows, NASA models, a probe on a path.
  creative_space: { name: 'Galaxia: mirar al pasado', cat: 'creative',
    summary: 'Estilo espacial: estrellas, nebulosas con brillo, modelos 3D de la NASA, sonda que recorre los planetas, texto curvo y concurso',
    make: () => {
      const BG = '#05060f', W = '#eef2ff', V = '#7b2ff7', PK = '#ff4ecd', CY = '#00c2ff', SOFT = '#aab4d6';
      const starfield = () => { const r = rng(2026); return Array.from({ length: 70 }, () => { const d = 2 + Math.round(r() * 3); return E(Math.round(r() * 1270), Math.round(r() * 710), d, d, '#ffffff', { opacity: 30 + Math.round(r() * 60) }); }); };
      const nebula = (x, y, d, c, o = 45) => glow(x, y, d, c, BG, o);
      const planet = (x, y, d, c1, c2, label) => [shape('ellipse', x, y, d, d, c1, { fill2: c2, gradType: 'radial' }), text(label, x + d / 2 - 90, y + d + 6, 180, 36, { fontSize: 20, textAlign: 'center', color: SOFT })];
      // The probe's trajectory: the "curve" shape (a cubic Bézier in its box), and points on it.
      const ORB = [100, 300, 1080, 360], BZ = [[3, 82], [28, -8], [72, -8], [97, 82]];
      const on = t => { const u = 1 - t, k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
        return [0, 1].map(j => ORB[j] + k.reduce((acc, c, i) => acc + c * BZ[i][j], 0) / 100 * ORB[j + 2]); };
      const glass = (html, x, y, w, h, p = {}) => card(`<div>${html}</div>`, x, y, w, h, '#ffffff10', { borderColor: '#ffffff30', color: W, fontSize: 24, radius: 20, ...p });
      return numbered(mk({ name: 'Mirar al pasado', palette: 'midnight', fonts: 'tech', title: { size: 50, color: W } }, [
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [...starfield(),
          nebula(-200, -250, 800, V, 55), nebula(820, 320, 640, PK, 35),
          shape('ellipse', -150, 560, 1000, 760, '#2f6fd0', { fill2: '#071330', gradType: 'radial', opacity: 95 }),
          text('cada estrella que ves es una postal del pasado', 0, 488, 700, 160, { fontSize: 26, curve: 18, color: CY, letterSpacing: 3 }),
          text('VIAJE AL ESPACIO PROFUNDO', 80, 120, 700, 40, { fontSize: 24, letterSpacing: 8, color: CY }),
          text('Mirar al<br>pasado', 80, 160, 760, 280, { fontFamily: FF.space, fontSize: 120, lineHeight: 1, wordart: 'purple' }),
          nasa('astronaut', 820, 60, 400, 500, { autoRotate: false, motion: 'float', view: 'front', caption: '' })],
          notes: 'Estrellas en el patrón (puntos con opacidad distinta), nebulosas con degradado radial, un planeta y texto curvo sobre su horizonte. El astronauta 3D de la NASA flota.' },
        { title: 'La luz tarda en llegar', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [...starfield(),
          nebula(700, -200, 700, V, 35),
          R(100, 400, 1080, 2, '#ffffff40'),
          ...[['Luna', '1,3 segundos', 14, '#cfd3dc'], ['Sol', '8 minutos', 34, '#ffc94d'], ['Neptuno', '4 horas', 26, '#4b7bec'], ['Próxima Centauri', '4,2 años', 22, '#ff8a65'], ['Andrómeda', '2,5 millones de años', 60, PK]].flatMap(([n, t, d, c], i) => {
            const cx = 160 + i * 240;
            return [withAnims(shape('ellipse', cx - d / 2, 401 - d / 2, d, d, c, { fill2: BG, gradType: 'radial', ...(n === 'Sol' && { fill2: '#ff7b00' }) }), A('zoom-in', { start: 'click', duration: 500 })),
              at(text(`<b>${n}</b><br><span style="color:${CY}">${t}</span>`, cx - 115, i % 2 ? 450 : 240, 230, 110, { fontSize: 24, textAlign: 'center', color: W, vAlign: i % 2 ? 'top' : 'bottom' }), 'fade-in', { start: 'withPrev' })];
          }),
          text('Lo que vemos de Andrómeda salió de allí antes de que existiéramos.', 100, 610, 1080, 50, { fontSize: 26, textAlign: 'center', color: SOFT })],
          notes: 'Cada clic añade un objeto y el tiempo que tarda su luz en llegarnos (valores redondeados).' },
        { title: 'Dos ojos en el cielo', layout: 'titleOnly', bg: BG, transition: 'convex', extra: [...starfield(),
          nebula(-100, 200, 600, CY, 30), nebula(700, 150, 600, PK, 30),
          nasa('hubble-space-telescope-a', 90, 160, 520, 300, { caption: '' }),
          nasa('james-webb-space-telescope-a', 670, 160, 520, 300, { caption: '' }),
          glass('<b style="font-size:34px">Hubble</b><br>En órbita desde 1990<br>Espejo de 2,4 m<br>Luz visible y ultravioleta', 90, 470, 520, 200),
          glass('<b style="font-size:34px">Webb</b><br>Lanzado en 2021<br>Espejo de 6,5 m<br>Infrarrojo, a 1,5 millones de km', 670, 470, 520, 200)],
          notes: 'Dos modelos 3D de la NASA que giran solos, con sus datos en tarjetas translúcidas.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [...starfield(),
          nebula(500, -100, 900, PK, 40), nebula(-200, 300, 700, V, 40),
          nasa('crab-nebula', 560, 40, 680, 640, { autoRotate: false, motion: 'orbit', caption: '' }),
          text('La nebulosa del Cangrejo', 80, 160, 520, 140, { fontFamily: FF.space, fontSize: 56, fontWeight: 700, color: W, lineHeight: 1.1 }),
          text('Restos de una estrella que explotó. Su luz llegó a la Tierra en el año 1054 y se vio de día durante semanas.', 80, 330, 480, 220, { fontSize: 28, color: SOFT })],
          notes: 'Modelo 3D de la NASA con un movimiento de cámara «vuelta completa» al llegar.' },
        { title: 'El gran viaje de una sonda', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [...starfield(),
          shape('curve', ...ORB, 'none', { stroke: '#ffffff50', strokeWidth: 2, dash: 'dash' }),
          ...[[0.24, 120, '#e3b98a', '#7a4a20', 'Júpiter · 1979'], [0.44, 104, '#f1dca0', '#8a6d2c', 'Saturno · 1981'], [0.64, 78, '#a6f0f2', '#2d8a94', 'Urano · 1986'], [0.84, 78, '#5b8cff', '#17307a', 'Neptuno · 1989']]
            .flatMap(([t, d, c1, c2, l]) => { const [cx, cy] = on(t); return planet(Math.round(cx - d / 2), Math.round(cy - d / 2), d, c1, c2, l); }),
          withAnims(nasa('voyager-probe-a', Math.round(on(0.03)[0] - 70), Math.round(on(0.03)[1] - 70), 140, 140, { autoRotate: true, caption: '' }),
            path([0.13, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74, 0.84, 0.95].map(t => [Math.round(on(t)[0] - on(0.03)[0]), Math.round(on(t)[1] - on(0.03)[1])]), { duration: 6500 }))],
          notes: 'Clic: la sonda recorre los cuatro planetas gigantes, como hizo una de las Voyager. El recorrido es una animación de trayectoria sobre un modelo 3D.' },
        { title: 'Planetas fuera del sistema solar', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [...starfield(),
          chartBlock({ x: 90, y: 180, w: 760, h: 470, chartType: 'area', color: CY, grid: true,
            data: [{ label: '1995', value: 1 }, { label: '2000', value: 50 }, { label: '2005', value: 180 }, { label: '2010', value: 500 }, { label: '2015', value: 2000 }, { label: '2020', value: 4300 }, { label: '2025', value: 6000 }] }),
          glass(`<div style="font-size:80px;font-weight:700;color:${CY};line-height:1">6.000</div><div style="margin-top:10px">exoplanetas confirmados, aproximadamente</div><div style="margin-top:20px;color:${SOFT};font-size:22px">En 1995 conocíamos uno.</div>`, 890, 230, 300, 360, { vAlign: 'middle' })],
          notes: 'Cifras aproximadas y redondeadas de exoplanetas confirmados acumulados.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [...starfield(),
          pollBlock({ kind: 'quiz', fontSize: 40, x: 60, y: 40, w: 1160, h: 640, time: 20, correct: [1],
            question: '¿Cuánto tarda la luz del Sol en llegar a la Tierra?', options: ['8 segundos', 'Unos 8 minutos', 'Unas 8 horas', '8 días'] })],
          notes: 'Pregunta de concurso con puntos por rapidez. Respuesta: unos ocho minutos y veinte segundos.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [...starfield(),
          nebula(240, -60, 800, V, 45),
          withAnims(shape('moon', 520, 140, 240, 240, '#f4f1e8', { rotation: -20 }), A('fade-in', { duration: 1500 })),
          text('Seguimos mirando', 90, 430, 1100, 110, { fontFamily: FF.space, fontSize: 80, textAlign: 'center', wordart: 'ice' }),
          text('¿Preguntas? · Club de astronomía', 90, 560, 1100, 50, { fontSize: 28, textAlign: 'center', color: SOFT, letterSpacing: 3 })],
          notes: 'Modelos 3D: NASA 3D Resources (dominio público). Cierre con una luna creciente que aparece despacio.' },
      ]));
    } },

  // ============================================================================
  // 10 · Pixel art / video game: pixel sprites, HUD, KayKit heroes that walk.
  creative_pixel: { name: 'Pixel art: tu primer videojuego', cat: 'creative',
    summary: 'Estilo videojuego retro: sprites de píxeles, marcador, personajes 3D que andan y saltan, código por pasos, concurso y cuenta atrás',
    make: () => {
      const BG = '#1a1c2c', SKY = '#29366f', W = '#f4f4f4', YEL = '#ffcd75', RED = '#b13e53', GRN = '#38b764', LIME = '#a7f070', CY = '#73eff7', BLUE = '#41a6f6';
      const C = { k: '#1a1c2c', r: '#b13e53', o: '#ef7d57', y: '#ffcd75', w: '#f4f4f4', g: '#38b764', l: '#a7f070', b: '#3b5dc9', c: '#73eff7', d: '#566c86', n: '#5d275d', t: '#257179' };
      const HEART = pixelArt(['.rr.rr.', 'rrrrrrr', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], C);
      const COIN = pixelArt(['..yyyy..', '.yooooy.', 'yoyyyyoy', 'yoyooyoy', 'yoyooyoy', 'yoyyyyoy', '.yooooy.', '..yyyy..'], C);
      const CLOUD = pixelArt(['....wwww......', '..wwwwwwww....', '.wwwwwwwwwww..', 'wwwwwwwwwwwwww', '.cccccccccccc.'], C);
      const BLOCK = pixelArt(['llllllll', 'gggggggg', 'gtgggtgg', 'tttttttt', 'dddkdddd', 'dkdddddk', 'dddddkdd', 'kdddkddd'], C);
      const STAR = pixelArt(['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'], C);
      const px = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: FF.mono, fontSize: size, color, fontWeight: 700, ...p });
      const ground = (y, n = 20) => Array.from({ length: n }, (_, i) => img(BLOCK, i * 64, y, 64, 64, 'Bloque de suelo', { decorative: true }));
      const hud = () => [img(HEART, 60, 30, 36, 36, 'Vida'), img(HEART, 104, 30, 36, 36, 'Vida'), img(HEART, 148, 30, 36, 36, 'Vida'),
        px('PUNTOS 004250', 440, 28, 400, 44, 28, W, { textAlign: 'center' }), img(COIN, 1050, 30, 36, 36, 'Moneda'), px('× 17', 1094, 28, 130, 44, 28, YEL)];
      const knight = lib3d('kk-Knight'), hero = lib3d('kn-character');
      const stat = (label, v, c, x, y) => [px(label, x, y, 110, 26, 16, '#94b0c2'), R(x + 110, y + 6, 120, 14, '#333c57'), R(x + 110, y + 6, Math.round(120 * v / 5), 14, c)];
      const heroes = [['kk-Knight', 'CABALLERO', [5, 1, 3]], ['kk-Mage', 'MAGA', [2, 5, 3]], ['kk-Rogue', 'PÍCARA', [3, 2, 5]], ['kk-Barbarian', 'BÁRBARO', [5, 1, 2]]];
      return numbered(mk({ name: 'Pixel Quest · taller de videojuegos', palette: 'revela', fonts: 'tech', title: { size: 44, color: YEL, font: FF.mono } }, [
        { layout: 'blank', bg: SKY, transition: 'fade', extra: [
          img(CLOUD, 60, 300, 196, 70, 'Nube', { decorative: true }), img(CLOUD, 980, 320, 238, 85, 'Nube', { decorative: true }),
          ...hud(),
          text('PIXEL QUEST', 90, 150, 1100, 160, { fontFamily: FF.mono, fontSize: 120, textAlign: 'center', wordart: 'retro', letterSpacing: 4 }),
          px('Taller: diseña tu primer videojuego', 90, 320, 1100, 50, 30, CY, { textAlign: 'center' }),
          px('▶ PULSA START', 90, 400, 1100, 50, 34, W, { textAlign: 'center' }),
          ...ground(656),
          withAnims(model('kk-Knight', 20, 420, 190, 240, { walk: { clip: knight.walk, end: knight.arrive, endOnce: true, face: true, look: true } }),
            path([[300, 0], [600, 0], [900, 0]], { duration: 5000 }))],
          notes: 'Pantalla de título: sprites de píxeles (imágenes SVG hechas en la propia plantilla), marcador arriba y un caballero 3D que cruza la pantalla andando al hacer clic y celebra al llegar.' },
        { title: 'ELIGE PERSONAJE', layout: 'titleOnly', bg: BG, transition: 'slide', extra: heroes.flatMap(([id, n, [f, m, v]], i) => {
          const x = 60 + i * 295;
          return [R(x, 180, 275, 480, '#262b44', { stroke: i === 1 ? YEL : '#566c86', strokeWidth: i === 1 ? 6 : 3 }),
            model(id, x + 20, 190, 235, 290, { view: 'front' }),
            px(n, x, 485, 275, 40, 26, i === 1 ? YEL : W, { textAlign: 'center' }),
            ...stat('FUERZA', f, RED, x + 20, 540), ...stat('MAGIA', m, BLUE, x + 20, 575), ...stat('VELOC.', v, GRN, x + 20, 610)];
        }).concat([withAnims(px('▼', 400, 128, 120, 50, 40, YEL, { textAlign: 'center' }), A('bounce'))]),
          notes: 'Cuatro personajes 3D (KayKit, CC0) en sus casillas, con barras de atributos hechas con rectángulos. Clic: la flecha amarilla cae rebotando sobre la elegida.' },
        { title: 'EL BUCLE DEL JUEGO', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
          dg('cycle', 'Leer los controles\nMover el mundo\nDibujar la pantalla', 60, 170, 700, 500, { colors: 'colorful', oneByOne: true }),
          px('60', 820, 230, 380, 180, 160, LIME, { textAlign: 'center', wordart: 'retro' }),
          px('veces por segundo', 820, 420, 380, 50, 28, W, { textAlign: 'center' }),
          text('Todo videojuego repite estos tres pasos sin parar. Si tarda más de 16 milisegundos en una vuelta, el juego «va a tirones».', 820, 490, 380, 170, { fontSize: 22, color: '#94b0c2' })],
          notes: 'Diagrama de ciclo uno a uno. 1000 ms entre 60 vueltas da unos 16 ms por fotograma.' },
        { title: 'DISEÑO DE NIVELES', layout: 'titleOnly', bg: SKY, transition: 'slide', extra: [
          img(CLOUD, 980, 160, 196, 70, 'Nube', { decorative: true }),
          ...ground(656),
          ...[[380, 520, 3], [640, 420, 3], [900, 320, 4]].flatMap(([x, y, n]) => Array.from({ length: n }, (_, k) => img(BLOCK, x + k * 56, y, 56, 56, 'Plataforma', { decorative: true }))),
          ...[[420, 460], [690, 360], [960, 260], [1060, 260]].map(([x, y], i) => withAnims(img(COIN, x, y, 40, 40, 'Moneda'), A('spin', { start: 'withPrev', duration: 900, delay: 400 + i * 200 }))),
          withAnims(model('kn-character', 60, 470, 150, 190, { walk: { clip: hero.walk, end: 'jump', endOnce: true, face: true, look: true } }),
            path([[180, 0], [330, -110], [560, -200], [830, -300], [960, -300]], { duration: 4800 })),
          px('Reglas: cada salto cabe en un salto. Cada moneda enseña el camino.', 60, 180, 860, 70, 22, W)],
          notes: 'Clic: el personaje sube por las plataformas siguiendo un recorrido, con su animación de andar, y salta al llegar. Las monedas giran a la vez.' },
        { title: 'EL BUCLE EN CÓDIGO', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
          codeBlock({ x: 60, y: 170, w: 760, h: 480, fontSize: 24, lang: 'javascript', lineSteps: '1-5|6-8|9',
            code: 'function bucle(t) {\n  leerControles();\n  moverMundo(t);\n  dibujar();\n  requestAnimationFrame(bucle);\n}\n\nrequestAnimationFrame(bucle);\n// ¡y ya tienes un juego en marcha!' }),
          img(STAR, 880, 200, 120, 120, 'Estrella'),
          px('requestAnimationFrame', 860, 350, 360, 40, 22, CY),
          text('pide al navegador que vuelva a llamar a la función justo antes de dibujar la siguiente imagen: unas 60 veces por segundo.', 860, 395, 360, 220, { fontSize: 22, color: W })],
          notes: 'Código con pasos de resaltado: primero la función del bucle, luego la llamada que lo arranca y al final el comentario.' },
        { layout: 'blank', bg: '#0f0f1a', transition: 'flash', extra: [
          px('JEFE FINAL', 60, 50, 600, 60, 44, RED),
          px('ESQUELETO GUERRERO', 60, 110, 600, 40, 24, W),
          R(60, 170, 520, 34, '#333c57', { stroke: W, strokeWidth: 3 }),
          ...[3, 2, 1, 0].map(i => withAnims(R(66 + i * 128, 176, 124, 22, i < 2 ? RED : '#ef7d57'), A('fade-out', { duration: 250 }))),
          model('kk-Skeleton_Warrior', 700, 80, 480, 580, { view: 'front' }),
          text(ul('Tiene un patrón: ataca, descansa, ataca', 'Avísalo antes de cada golpe (luz, sonido)', 'Cada clic: un golpe a su barra de vida'), 60, 260, 600, 340, { fontSize: 30, color: W })],
          notes: 'Cuatro clics: la barra de vida del jefe baja segmento a segmento (efecto de salida «Desvanecer»). Un buen jefe enseña su patrón antes de atacar.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          pollBlock({ kind: 'quiz', fontSize: 40, x: 60, y: 40, w: 1160, h: 640, time: 15, correct: [2],
            question: 'Un juego a 60 FPS, ¿cuántas imágenes dibuja cada segundo?', options: ['6', '30', '60', '600'] })],
          notes: 'Concurso desde el móvil con puntos por rapidez. FPS: fotogramas por segundo.' },
        { layout: 'blank', bg: '#000000', transition: 'fade', extra: [
          px('¿CONTINUAR?', 90, 90, 1100, 130, 100, RED, { textAlign: 'center', wordart: 'retro' }),
          timer(10, 490, 250, 300, { style: 'digital', color: W, h: 150 }),
          px('INSERTA MONEDA', 90, 430, 1100, 50, 32, YEL, { textAlign: 'center' }),
          model('kk-Knight', 110, 340, 260, 330, { clip: knight.arrive }),
          img(COIN, 960, 520, 100, 100, 'Moneda'),
          px('Gracias por jugar · Taller de videojuegos', 90, 640, 1100, 40, 22, '#94b0c2', { textAlign: 'center' })],
          notes: 'Cierre de recreativa: cuenta atrás digital de diez segundos y el caballero celebrando en bucle.' },
      ]));
    } },
};
