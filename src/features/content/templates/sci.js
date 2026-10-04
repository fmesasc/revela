// Example presentations: Ciencia y universidad. Each one: { name, summary, cat: 'sci', make() } → a deck
// (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid } from './kit.js';

// ---- Small helpers of this file ------------------------------------------------------
// A small uppercase label with wide spacing, above a title.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A stroke through points on the slide (a line, a curve, a trajectory): an ink object, so it can be drawn
// as you present (effect 'draw').
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
const line = (x1, y1, x2, y2, color, width = 3, props = {}) => ink([[x1, y1], [x2, y2]], color, width, props);
// A ring (an orbit, an outline): an ellipse with no fill.
const ring = (cx, cy, r, color, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, 'none', { stroke: color, strokeWidth: 2, ...props });
// A sphere: a round radial gradient from a light colour into a dark one.
const sphere = (cx, cy, r, c1, c2, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, c1, { fill2: c2, gradType: 'radial', ...props });
// Points along a curve, relative to its first point, for path().
const rel = pts => pts.map(([x, y]) => [Math.round(x - pts[0][0]), Math.round(y - pts[0][1])]).slice(1);
// A picture drawn in SVG, as a data URL (images with no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · A mission to Mars: dark rust, the same NASA rover through three slides
  // (Transform, each arriving another way), a Hohmann transfer drawn as a path.
  sci_mars: { name: 'Misión a Marte', cat: 'sci', summary: 'Estilo espacial óxido: rover 3D de la NASA con Transformar, astronauta flotando, órbita animada, ecuación y concurso', make: () => {
    const BG = '#140806', SAND = '#f0c987', RUST = '#e4572e', rover = uid(), heli = uid(), ttl = uid();
    const H = pairStacks('bold').heading;
    const rv = (x, y, w, h, props) => ({ ...nasa('mars-2020-perseverance-rover', x, y, w, h, { caption: '', ...props }), id: rover });
    // Hohmann transfer: Sun at (330, 420), Earth's orbit r=140, Mars's r=225.
    const SX = 330, SY = 420, R1 = 140, R2 = 225, a = (R1 + R2) / 2, bb = Math.sqrt(R1 * R2), cx = SX + (R2 - R1) / 2;
    const arc = Array.from({ length: 25 }, (_, i) => { const t = Math.PI - i / 24 * Math.PI; return [cx + a * Math.cos(t), SY - bb * Math.sin(t)]; });
    return numbered(build({ name: 'Misión a Marte', palette: 'warm', fonts: 'bold', title: { size: 64, color: SAND },
      decor: p => [shape('rect', 0, 712, 1280, 8, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        sphere(840, 830, 480, '#c1440e', BG, { opacity: 90 }), glow(-300, -300, 800, '#e4572e', BG, 35),
        ...[[120, 90], [300, 40], [520, 120], [1100, 70], [980, 200], [700, 60], [60, 300]].map(([x, y], i) => shape('star4', x, y, 10 + (i % 3) * 6, 10 + (i % 3) * 6, '#fff4ec', { opacity: 60 })),
        kicker('MISIÓN ARES · VENTANA DE LANZAMIENTO 2026', 90, 150, 760, RUST),
        { ...text('RUMBO A MARTE', 84, 190, 760, 200, { fontFamily: H, fontSize: 150, wordart: 'fire', lineHeight: 1 }), id: ttl },
        text('Cómo se viaja, se aterriza y se trabaja en el planeta rojo', 90, 400, 640, 100, { fontSize: 32, color: '#fff4ec' }),
        nasa('astronaut', 860, 90, 330, 420, { caption: '', autoRotate: false, view: 'three', motion: 'float', edge: 'fade' })],
        notes: 'Portada con Text Art «Fuego», un planeta hecho con degradado radial y un astronauta 3D de la NASA que flota (Modelo 3D ▸ Vista ▸ Al entrar: Flotar; bordes difuminados).' },
      { title: '¿Por qué Marte?', layout: 'titleOnly', bg: BG, extra: [
        ...[['location', 'Agua helada', 'Hay hielo bajo la superficie y en los polos: agua para beber y para fabricar combustible.'],
          ['clock', 'Un pasado habitable', 'Hace 3.500 millones de años tuvo ríos y lagos. ¿Hubo vida?'],
          ['star', 'El siguiente paso', 'Es el planeta más parecido a la Tierra al que podemos llegar hoy.']]
          .map(([ic, h, d], i) => withAnims(card(`<div style="font-size:34px;font-weight:700;color:${SAND};margin-top:74px">${h}</div><div style="opacity:.85;margin-top:8px">${d}</div>`,
            90 + i * 380, 200, 340, 340, '#ffffff10', { color: '#fff4ec', fontSize: 25, borderColor: '#e4572e55' }), A('fade-up', { start: i ? 'afterPrev' : 'click', delay: i ? 150 : 0 }))),
        ...[0, 1, 2].map(i => icon(['location', 'clock', 'star'][i], 122 + i * 380, 232, 54, [RUST, '#f3a712', '#a8c686'][i]))],
        notes: 'Las tres tarjetas entran con un solo clic, una detrás de otra («después de la anterior» con un pequeño retardo).' },
      { title: 'El viaje: una órbita de transferencia', layout: 'titleOnly', bg: BG, extra: [
        sphere(SX, SY, 34, '#fff3b0', '#f3a712'), ring(SX, SY, R1, '#669bbc', { dash: 'dash' }), ring(SX, SY, R2, '#e4572e', { dash: 'dash' }),
        sphere(SX - R1, SY, 14, '#9fd3ff', '#1d5f8a'), sphere(SX + R2, SY, 11, '#ff9a6b', '#8a2a0b'),
        text('Tierra', SX - R1 - 60, SY + 20, 120, 34, { fontSize: 20, textAlign: 'center', color: '#9fd3ff' }),
        text('Marte', SX + R2 - 60, SY + 18, 120, 34, { fontSize: 20, textAlign: 'center', color: '#ff9a6b' }),
        withAnims(shape('chevron', arc[0][0] - 16, arc[0][1] - 12, 32, 24, SAND, { rotation: -90 }), path(rel(arc), { duration: 4000, turn: 'follow', sound: 'whoosh' })),
        mathBlock({ x: 640, y: 200, w: 560, h: 130, fontSize: 44, color: '#fff4ec', latex: 't = \\pi\\sqrt{\\frac{a^3}{G M_\\odot}}' }),
        text('Medio periodo de la elipse que toca las dos órbitas: unos <b style="color:#f3a712">259 días</b> de viaje.', 660, 350, 520, 110, { fontSize: 28, color: '#fff4ec' }),
        text('Solo sale bien si Marte llega a la cita: la ventana se abre cada <b>26 meses</b>.', 660, 480, 520, 110, { fontSize: 28, color: '#fff4ec' })],
        notes: 'Clic: la nave recorre media elipse de Hohmann girando con el camino (Panel de animación ▸ Giro en el camino ▸ Seguir el camino). a es el semieje mayor de la elipse de transferencia.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(340, 60, 620, '#e4572e', BG, 40),
        kicker('EL EXPLORADOR', 90, 60, 500, RUST),
        text('Un laboratorio sobre ruedas', 90, 96, 1100, 80, { fontFamily: H, fontSize: 64, color: SAND }),
        rv(290, 170, 700, 470, { view: 'three', spin: 20 })],
        notes: 'El rover gira solo. Las tres diapositivas siguientes usan Transformar con el mismo modelo: pasa y verás cómo viaja.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        rv(40, 150, 520, 440, { view: 'side', autoRotate: false, arrive: 'turn' }),
        text('Instrumentos', 620, 60, 600, 80, { fontFamily: H, fontSize: 64, color: SAND }),
        dg('list', 'Cámaras estéreo\n  Ven en 3D y con zoom\nLáser espectrómetro\n  Analiza rocas a 7 metros\nTaladro y tubos\n  Guarda muestras para traerlas\nEstación meteorológica\n  Viento, polvo y temperatura', 620, 160, 600, 480, { colors: 'accent', oneByOne: true })],
        notes: 'Al llegar, el rover da una vuelta hasta ponerse de lado (Modelo 3D ▸ Desde la anterior ▸ Llega: «Dar una vuelta hasta su vista»). La lista aparece por partes.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        text('Cada vez más grandes', 90, 60, 700, 80, { fontFamily: H, fontSize: 64, color: SAND }),
        chartBlock({ x: 90, y: 170, w: 640, h: 440, chartType: 'hbar', color: RUST, dataLabels: true,
          data: [{ label: '1997', value: 11 }, { label: '2004', value: 185 }, { label: '2012', value: 899 }, { label: '2021', value: 1025 }] }),
        text('Masa de los rovers en kg, por año de llegada', 90, 620, 640, 40, { fontSize: 22, color: '#c9a88f' }),
        rv(760, 200, 440, 380, { view: 'front', autoRotate: false, arrive: 'front' })],
        notes: 'El mismo rover llega girando hasta quedar de frente (Al llegar: «Girar hasta quedar de frente»). Cifras aproximadas y públicas de las misiones.' },
      { title: 'Siete minutos de terror', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
        dg('timeline', 'Entrada\n  20.000 km/h\nParacaídas\n  1.600 km/h\nRetrocohetes\n  Frenado final\nGrúa aérea\n  Lo baja con cables\nContacto\n  «Toma confirmada»', 90, 180, 1100, 420, { colors: 'colorful', oneByOne: true }),
        text('La señal tarda más de 7 minutos en llegar: el aterrizaje es automático.', 90, 620, 1100, 50, { fontSize: 26, textAlign: 'center', color: '#c9a88f' })],
        notes: 'Cronología uno a uno. Cuando llega la señal de que ha entrado en la atmósfera, en realidad ya ha aterrizado… o no.' },
      { layout: 'blank', bg: BG, extra: [
        { ...nasa('ingenuity-mars-helicopter', 80, 110, 460, 500, { caption: '', view: 'low', motion: 'orbit', edge: 'free' }), id: heli },
        text('Volar en Marte', 600, 130, 600, 90, { fontFamily: H, fontSize: 72, color: SAND }),
        text('El aire marciano es 100 veces menos denso: las palas giran a unas <b style="color:#f3a712">2.500 rpm</b>.', 600, 230, 600, 120, { fontSize: 30, color: '#fff4ec' }),
        anim(big('1,8 kg', 'de helicóptero', 600, 380, RUST, '#fff4ec'), 1, 'zoom-in'),
        anim(big('72', 'vuelos', 870, 380, '#f3a712', '#fff4ec'), 2, 'zoom-in')],
        notes: 'Vista desde abajo y vuelta completa al entrar, sin corte en los bordes (Modelo 3D ▸ Encuadre ▸ Bordes: sin corte). Cifras redondeadas.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', question: '¿Cuánto tarda un mensaje de radio de Marte a la Tierra?', options: ['Un segundo', 'Entre 3 y 22 minutos', 'Unas 2 horas', 'Un día entero'], correct: [1], time: 20, fontSize: 40, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Pregunta tipo concurso con el móvil: puntos por acertar y por rapidez. Depende de dónde estén los dos planetas en sus órbitas.' },
      { layout: 'blank', bg: BG, transition: 'cube', extra: [
        shape('ellipse', -200, 500, 1680, 800, '#c1440e', { fill2: BG, gradType: 'radial' }), glow(340, -120, 600, '#f3a712', BG, 25),
        { ...text('PRÓXIMA PARADA', 140, 170, 1000, 170, { fontFamily: H, fontSize: 140, wordart: 'fire', textAlign: 'center', lineHeight: 1 }), id: ttl },
        text('¿Quién de esta clase pisará Marte?', 140, 350, 1000, 60, { fontSize: 36, textAlign: 'center', color: '#fff4ec' }),
        text('Modelos 3D: NASA 3D Resources (dominio público)', 140, 660, 1000, 30, { fontSize: 16, textAlign: 'center', color: '#c9a88f' })],
        notes: 'Transición «Cubo». El título de la portada vuelve con otro texto: mismo estilo Text Art.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · The solar system: deep space blue, planets to scale, three NASA probes with three
  // different camera views and movements, and one of them travelling to the next slide.
  sci_solar: { name: 'El sistema solar', cat: 'sci', summary: 'Planetas a escala que aparecen en cadena, tres sondas 3D con vistas y movimientos distintos, tabla, diagrama radial y emparejar', make: () => {
    const BG = '#050b18', FG = '#f2f6fa', SOFT = '#9fb3c8', voy = uid();
    const H = pairStacks('modern').heading;
    const stars = Array.from({ length: 26 }, (_, i) => { const x = (i * 397) % 1240 + 20, y = (i * 211) % 680 + 20, s = 3 + (i % 4) * 2;
      return shape('ellipse', x, y, s, s, '#ffffff', { opacity: 25 + (i % 5) * 12 }); });
    // Diameters to scale (Jupiter = 220 px), centres along a line.
    const PL = [['Mercurio', 4879, 90, '#c9c5c5', '#5d5a5a'], ['Venus', 12104, 200, '#f1d39a', '#9a6a26'], ['Tierra', 12742, 310, '#8fd0ff', '#1d5f9a'],
      ['Marte', 6779, 420, '#ff9a6b', '#8a2a0b'], ['Júpiter', 139820, 590, '#f1e2bd', '#9a7b4a'], ['Saturno', 116460, 840, '#f5ecc4', '#a08a4a'],
      ['Urano', 50724, 1040, '#c9f4f6', '#3d9aa0'], ['Neptuno', 49244, 1160, '#8aa6ff', '#24399a']];
    const k = 220 / 139820, CY = 370;
    const scale = PL.flatMap(([n, d, cx, c1, c2], i) => { const r = Math.max(4, d * k / 2);
      const p = withAnims(sphere(cx, CY, r, c1, c2), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 450 }));
      const lab = withAnims(text(n, cx - 55, 500, 110, 34, { fontSize: 20, textAlign: 'center', color: FG }), A('fade-in', { start: 'withPrev', duration: 450 }));
      return n === 'Saturno' ? [withAnims(shape('ellipse', cx - r * 1.5, CY - r * 0.28, r * 3, r * 0.56, 'none', { stroke: '#e8d9a0', strokeWidth: 6, rotation: -12, opacity: 80 }),
        A('zoom-in', { start: 'afterPrev', duration: 450 })), { ...p, animation: A('zoom-in', { start: 'withPrev', duration: 450 }) }, lab] : [p, lab]; });
    return numbered(build({ name: 'El sistema solar', palette: 'ocean', fonts: 'modern', title: { size: 50, color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [...stars,
        glow(-460, -100, 920, '#f5a623', BG, 45), sphere(60, 360, 250, '#fff6c9', '#f39c12'),
        ...[420, 540, 660].map((r, i) => ring(60, 360, r, '#7fb8e6', { dash: 'dash', opacity: 30 - i * 6 })),
        sphere(60 + 420 * Math.cos(-0.62), 360 + 420 * Math.sin(-0.62), 16, '#8fd0ff', '#1d5f9a'),
        sphere(60 + 540 * Math.cos(0.5), 360 + 540 * Math.sin(0.5), 12, '#ff9a6b', '#8a2a0b'),
        sphere(60 + 660 * Math.cos(0.45), 360 + 660 * Math.sin(0.45), 30, '#f1e2bd', '#9a7b4a'),
        kicker('CIENCIAS DE LA TIERRA Y DEL UNIVERSO', 560, 190, 660, '#f5a623'),
        text('El sistema solar', 552, 230, 680, 230, { fontFamily: H, fontSize: 96, fontWeight: 800, color: FG, lineHeight: 1.05 }),
        text('Ocho mundos, un Sol y muchas preguntas', 560, 470, 640, 60, { fontSize: 32, color: SOFT })],
        notes: 'El Sol es un degradado radial que se sale por la izquierda; las órbitas son elipses sin relleno con trazo discontinuo.' },
      { title: 'Los planetas, a escala', layout: 'titleOnly', bg: BG, extra: [...scale,
        text('Diámetros a escala; las distancias, no: Neptuno estaría a 70 metros de esta pantalla.', 90, 600, 1100, 50, { fontSize: 24, textAlign: 'center', color: SOFT })],
        notes: 'Un clic y los planetas aparecen en cadena, del Sol hacia fuera («después de la anterior»). Júpiter mide 11 veces la Tierra.' },
      { title: '¿A qué distancia del Sol?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 180, w: 680, h: 470, chartType: 'hbar', color: '#4a90d9', dataLabels: true,
          data: [['Mercurio', 0.39], ['Venus', 0.72], ['Tierra', 1], ['Marte', 1.52], ['Júpiter', 5.2], ['Saturno', 9.58], ['Urano', 19.2], ['Neptuno', 30.1]].map(([label, value]) => ({ label, value })) }),
        text('En <b>unidades astronómicas</b>: 1 UA es la distancia media Tierra-Sol, unos 150 millones de km.', 810, 200, 380, 160, { fontSize: 26, color: FG }),
        mathBlock({ x: 810, y: 400, w: 380, h: 110, fontSize: 40, color: '#f5a623', latex: 't = \\frac{d}{c} \\approx 8{,}3\\ \\text{min}' }),
        text('lo que tarda la luz del Sol en llegar a nosotros', 810, 520, 380, 80, { fontSize: 22, textAlign: 'center', color: SOFT })],
        notes: 'Gráfico de barras horizontales con etiquetas de datos. La ecuación es KaTeX: d = 1 UA, c = 300.000 km/s.' },
      { title: 'Tres sondas, tres miradas', layout: 'titleOnly', bg: BG, extra: [
        ...[0, 1, 2].map(i => shape('rounded', 90 + i * 380, 180, 340, 470, '#ffffff', { opacity: 6, radius: 22 })),
        { ...nasa('voyager-probe-a', 110, 200, 300, 330, { caption: '', autoRotate: false, view: 'front', motion: 'float', edge: 'fade' }), id: voy },
        nasa('juno-a', 490, 200, 300, 330, { caption: '', autoRotate: false, view: 'top', motion: 'swing' }),
        nasa('cassini-huygens-a', 870, 200, 300, 330, { caption: '', autoRotate: false, view: 'low', motion: 'zoom', edge: 'hard' }),
        ...[['Voyager 1', 'Desde 1977, fuera del sistema solar'], ['Juno', 'En órbita polar de Júpiter'], ['Cassini', '13 años entre los anillos de Saturno']].map(([n, d], i) =>
          text(`<b style="font-size:28px">${n}</b><br>${d}`, 110 + i * 380, 545, 300, 95, { fontSize: 21, textAlign: 'center', color: FG }))],
        notes: 'Tres modelos 3D de la NASA, cada uno con su vista (de frente, desde arriba, desde abajo) y su movimiento al llegar (flotar, balanceo, acercar).' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(-200, 40, 800, '#4a90d9', BG, 35),
        { ...nasa('voyager-probe-a', 60, 110, 600, 520, { caption: '', autoRotate: true, spin: 12, view: 'side', arrive: 'view', bleed: 1.3 }), id: voy },
        kicker('LA MÁS LEJANA', 700, 140, 500, '#50e3c2'),
        text('Voyager 1', 700, 180, 500, 90, { fontFamily: H, fontSize: 64, fontWeight: 800, color: FG }),
        text(ul('A más de <b>24.000 millones de km</b>', 'Su señal tarda casi un día en llegar', 'Lleva un disco con sonidos de la Tierra'), 700, 290, 500, 300, { fontSize: 28, color: FG })],
        notes: 'Transformar: la sonda viaja desde la tarjeta y se coloca en la vista de esta diapositiva (Al llegar: «Ir a la vista de esta diapositiva»). Cifras aproximadas.' },
      { title: 'Ficha de los planetas', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [tableBlock({ x: 90, y: 180, w: 1100, h: 470, fontSize: 22, header: true, headBg: '#4a90d9', headFg: '#ffffff', stroke: '#24405e', banded: true, band: '#4a90d9',
        rows: [['Planeta', 'Tipo', 'Lunas', 'Un día dura'], ['Mercurio', 'Rocoso', '0', '176 días'], ['Venus', 'Rocoso', '0', '117 días'], ['Tierra', 'Rocoso', '1', '24 horas'], ['Marte', 'Rocoso', '2', '24 h 40 min'],
          ['Júpiter', 'Gigante gaseoso', '95', '10 horas'], ['Saturno', 'Gigante gaseoso', '146', '10 h 40 min'], ['Urano', 'Gigante helado', '28', '17 horas'], ['Neptuno', 'Gigante helado', '16', '16 horas']], colW: [3, 4, 2, 3] })],
        notes: 'Tabla con bandas. El día solar de Mercurio y Venus es más largo que su año… o casi. Lunas confirmadas en 2024.' },
      { title: 'Más que planetas', layout: 'titleOnly', bg: BG, extra: [dg('radial', 'Sol\n  Planetas rocosos\n  Gigantes gaseosos\n  Gigantes helados\n  Planetas enanos\n  Asteroides\n  Cometas', 240, 170, 800, 490, { colors: 'colorful', oneByOne: true })],
        notes: 'Diagrama radial uno a uno: el Sol tiene el 99,8 % de la masa del sistema solar.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', question: 'Une cada planeta con su récord', fontSize: 34, x: 60, y: 40, w: 1160, h: 640,
        options: ['Júpiter = El más grande', 'Venus = El más caliente', 'Mercurio = El más cercano al Sol', 'Saturno = El menos denso', 'Neptuno = Los vientos más rápidos'] })],
        notes: 'Actividad de emparejar desde el móvil: cada uno une las parejas y Revela corrige al momento.' },
      { layout: 'blank', bg: BG, transition: 'swirl', extra: [...stars, glow(340, 60, 600, '#9b6cf0', BG, 35),
        text('Somos polvo de estrellas', 90, 250, 1100, 130, { fontFamily: H, fontSize: 68, fontWeight: 800, textAlign: 'center', wordart: 'ice' }),
        text('El hierro de tu sangre se formó dentro de una estrella', 140, 400, 1000, 60, { fontSize: 32, textAlign: 'center', color: SOFT }),
        text('Modelos 3D: NASA 3D Resources (dominio público)', 140, 660, 1000, 30, { fontSize: 16, textAlign: 'center', color: '#5d7590' })],
        notes: 'Transición «Remolino» y Text Art «Hielo». Buena frase para cerrar y abrir preguntas.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 3 · Newton's laws: a squared-paper notebook, equations, a toy car that keeps going,
  // a ball that follows its parabola while the parabola draws itself, and fill the gaps.
  sci_newton: { name: 'Física: las leyes de Newton', cat: 'sci', summary: 'Cuaderno de física: ecuaciones, coche 3D en movimiento, tiro parabólico que se dibuja, tabla con fórmulas y rellenar huecos', make: () => {
    const INK = '#2b2a33', RED = '#c0392b', BLUE = '#2f6690', H = pairStacks('websafe').heading;
    // The parabola: launched at 45°, 900 px of range and 300 px high, ground at y = 620.
    const X0 = 130, G0 = 620, parab = Array.from({ length: 31 }, (_, i) => { const x = i / 30; return [X0 + 900 * x, G0 - 1200 * x * (1 - x)]; });
    return numbered(build({ name: 'Las leyes de Newton', palette: 'paper', fonts: 'websafe', title: { size: 48, color: INK }, body: { color: INK },
      decor: () => [...Array.from({ length: 17 }, (_, i) => shape('rect', 0, 40 + i * 40, 1280, 1, '#4682b4', { opacity: 18 })), shape('rect', 66, 0, 2, 720, RED, { opacity: 45 })] }, [
      { layout: 'blank', extra: [
        kicker('FÍSICA · 1.º DE BACHILLERATO', 100, 150, 700, RED),
        text('Las leyes<br>de Newton', 96, 190, 760, 260, { fontFamily: H, fontSize: 104, color: INK, lineHeight: 1.05 }),
        text('Por qué las cosas se mueven (y por qué se paran)', 100, 470, 700, 60, { fontSize: 30, color: '#6b5d4f', fontStyle: 'italic' }),
        shape('rect', 900, 80, 24, 160, '#8d6e63'), shape('cloud', 790, 40, 300, 150, '#6b8e23'),
        withAnims(sphere(950, 220, 34, '#ff6b5b', '#a3180c'), A('path', { pathShape: 'custom', points: [[0, 300]], dx: 0, dy: 300, duration: 900, start: 'afterPrev', delay: 600 }), A('bounce', { start: 'afterPrev' })),
        line(820, 556, 1110, 556, '#6b5d4f', 3), mathBlock({ x: 800, y: 590, w: 340, h: 70, fontSize: 34, color: BLUE, latex: 'g \\approx 9{,}8\\ \\text{m/s}^2' })],
        notes: 'La manzana cae sola al llegar (trayectoria «después de la anterior») y rebota (énfasis). Todo el fondo es una cuadrícula hecha con el patrón.' },
      { title: '1.ª ley · Inercia', layout: 'titleOnly', extra: [
        text('Si sobre un cuerpo no actúa ninguna fuerza neta, sigue <b>en reposo</b> o moviéndose <b>en línea recta a velocidad constante</b>.', 100, 170, 680, 160, { fontSize: 30, color: INK }),
        mathBlock({ x: 800, y: 180, w: 400, h: 120, fontSize: 34, color: BLUE, latex: '\\sum \\vec F = 0 \\iff \\vec v = \\text{cte}' }),
        withAnims(model('kh-ToyCar', 100, 400, 280, 200, { view: 'side', autoRotate: false }), path([[780, 0]], { duration: 3500, ease: 'linear' })),
        line(100, 606, 1180, 606, INK, 3),
        text('Clic: sin rozamiento, el coche no frenaría nunca.', 100, 630, 1080, 40, { fontSize: 22, color: '#6b5d4f', fontStyle: 'italic' })],
        notes: 'Un modelo 3D (coche de juguete, vista de lado) que se mueve por una trayectoria recta. Pregunta: ¿por qué se para un coche de verdad?' },
      { title: '2.ª ley · Fuerza y aceleración', layout: 'titleOnly', extra: [
        mathBlock({ x: 100, y: 180, w: 440, h: 150, fontSize: 96, color: BLUE, latex: '\\vec F = m\\,\\vec a' }),
        anim(text('La misma fuerza acelera más a lo que tiene menos masa.', 100, 360, 440, 140, { fontSize: 30, color: INK }), 1, 'fade-up'),
        tableBlock({ x: 580, y: 190, w: 610, h: 300, fontSize: 22, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#b9ab94', banded: true, band: '#4682b4',
          rows: [['Objeto', 'F (N)', 'm (kg)', 'a (m/s²)'], ['Balón', '10', '0,5', '=B2/C2'], ['Bicicleta', '10', '12', '=B3/C3'], ['Coche', '10', '1200', '=B4/C4']], colW: [3, 2, 2, 3] }),
        text('La última columna se calcula sola: <i>a = F / m</i>.', 580, 505, 610, 50, { fontSize: 22, color: '#6b5d4f' })],
        notes: 'La tabla usa fórmulas (=B2/C2): cambia la fuerza o la masa y la aceleración se recalcula.' },
      { title: '3.ª ley · Acción y reacción', layout: 'titleOnly', extra: [
        text('Si A empuja a B, B empuja a A con una fuerza <b>igual y opuesta</b>.', 100, 170, 720, 110, { fontSize: 30, color: INK }),
        mathBlock({ x: 100, y: 290, w: 720, h: 100, fontSize: 48, color: BLUE, latex: '\\vec F_{A \\to B} = -\\,\\vec F_{B \\to A}' }),
        withAnims(shape('uparrow', 150, 420, 110, 210, BLUE), A('fade-up')),
        withAnims(shape('downarrow', 470, 420, 110, 210, RED), A('fade-down', { start: 'withPrev' })),
        text('<b>Empuje</b><br>los gases empujan el cohete hacia arriba', 270, 450, 190, 150, { fontSize: 22, color: BLUE }),
        text('<b>Gases</b><br>el cohete los empuja hacia abajo', 590, 450, 230, 150, { fontSize: 22, color: RED }),
        nasa('saturn-v', 900, 150, 260, 520, { caption: '', autoRotate: false, view: 'side', motion: 'swing', bleed: 1.3 })],
        notes: 'Un cohete no se apoya en el aire: empuja los gases y los gases lo empujan a él. Modelo 3D de la NASA con balanceo al llegar.' },
      { title: 'Tiro parabólico', layout: 'titleOnly', extra: [
        mathBlock({ x: 720, y: 160, w: 470, h: 70, fontSize: 32, color: BLUE, textAlign: 'left', latex: 'x(t) = v_0 \\cos\\theta \\; t' }),
        mathBlock({ x: 720, y: 230, w: 470, h: 80, fontSize: 32, color: BLUE, textAlign: 'left', latex: 'y(t) = v_0 \\sin\\theta \\; t - \\tfrac{1}{2} g t^2' }),
        line(100, G0, 1180, G0, INK, 3), line(X0, G0, X0 + 120, G0 - 120, RED, 3),
        text('45°', X0 + 50, G0 - 50, 80, 36, { fontSize: 22, color: RED }),
        { ...ink(parab, BLUE, 3, { dash: 'dash' }), animation: A('draw', { duration: 2200 }) },
        withAnims(sphere(X0, G0 - 16, 16, '#ffb38a', RED), path(rel(parab), { duration: 2200, start: 'withPrev', ease: 'linear' })),
        text('alcance máximo con 45°', X0 + 330, G0 + 14, 300, 40, { fontSize: 22, textAlign: 'center', color: '#6b5d4f', fontStyle: 'italic' })],
        notes: 'Clic: la parábola se dibuja (efecto «Dibujar») a la vez que la pelota la recorre (trayectoria «con la anterior»). Sin rozamiento con el aire.' },
      { title: 'Caída libre: posición y velocidad', layout: 'titleOnly', transition: 'page', extra: [
        chartBlock({ x: 100, y: 170, w: 760, h: 480, chartType: 'line', color: RED, grid: true, xTitle: 'Tiempo (s)', seriesName: 'd (m)',
          data: [0, 0.5, 1, 1.5, 2, 2.5, 3].map(t => ({ label: String(t).replace('.', ','), value: +(4.9 * t * t).toFixed(1) })),
          series: [{ name: 'v (m/s)', color: BLUE, values: [0, 0.5, 1, 1.5, 2, 2.5, 3].map(t => +(9.8 * t).toFixed(1)) }] }),
        mathBlock({ x: 890, y: 220, w: 300, h: 80, fontSize: 36, color: RED, latex: 'd = \\tfrac12 g t^2' }),
        mathBlock({ x: 890, y: 330, w: 300, h: 80, fontSize: 36, color: BLUE, latex: 'v = g\\,t' }),
        text('La velocidad crece en línea recta; la distancia, como una parábola.', 890, 440, 300, 150, { fontSize: 24, color: INK })],
        notes: 'Gráfico de líneas con dos series, cuadrícula y título del eje. Transición «Página».' },
      { layout: 'blank', extra: [pollBlock({ kind: 'gaps', question: 'Completa las tres leyes', fontSize: 32, x: 90, y: 50, w: 1100, h: 620,
        text: 'Sin fuerza neta, un cuerpo mantiene su [velocidad]. La fuerza es igual a la masa por la [aceleración]. A toda acción le corresponde una [reacción] igual y opuesta.' })],
        notes: 'Rellenar huecos desde el móvil: Revela corrige sin tener en cuenta mayúsculas ni tildes.' },
      { title: 'Resumen', layout: 'titleOnly', extra: [dg('cards', '1.ª · Inercia\n  Sin fuerza, nada cambia\n2.ª · F = m·a\n  La fuerza cambia la velocidad\n3.ª · Acción y reacción\n  Las fuerzas van en pareja', 100, 180, 1080, 420, { colors: 'outline', oneByOne: true })],
        notes: 'Diagrama de tarjetas con estilo «Contorno», que encaja con el aspecto de cuaderno.' },
      { layout: 'blank', transition: 'fade', extra: [
        text('«Si he visto más lejos es porque estoy sentado sobre hombros de gigantes.»', 160, 210, 960, 220, { fontFamily: H, fontSize: 46, fontStyle: 'italic', textAlign: 'center', color: INK }),
        text('— Isaac Newton, carta de 1676', 160, 450, 960, 50, { fontSize: 26, textAlign: 'center', color: RED })],
        notes: 'Cierre con la cita: la ciencia se construye sobre el trabajo de otros.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · Chemistry: a clean white lab, a periodic table that builds itself in a cascade,
  // a molecule drawn with shapes, a 3D brazier for combustion, and matching symbols.
  sci_chem: { name: 'Química: tabla periódica', cat: 'sci', summary: 'Laboratorio limpio: tabla periódica que se monta en cascada, moléculas con formas, brasero 3D, ecuaciones, dona y emparejar', make: () => {
    const INK = '#14313f', TEAL = '#0f9ed5', H = pairStacks('clean').heading;
    const CAT = { nm: ['No metales', '#cdeffd'], ng: ['Gases nobles', '#e4dcff'], al: ['Alcalinos', '#ffd9cc'], ae: ['Alcalinotérreos', '#ffe9c2'],
      md: ['Semimetales', '#d7f2d0'], ha: ['Halógenos', '#fff3a8'], tr: ['De transición', '#e3e8ef'], pt: ['Otros metales', '#f6dbe9'] };
    const E = 'H nm,He ng,Li al,Be ae,B md,C nm,N nm,O nm,F ha,Ne ng,Na al,Mg ae,Al pt,Si md,P nm,S nm,Cl ha,Ar ng,K al,Ca ae,Sc tr,Ti tr,V tr,Cr tr,Mn tr,Fe tr,Co tr,Ni tr,Cu tr,Zn tr,Ga pt,Ge md,As md,Se nm,Br ha,Kr ng'.split(',');
    const colOf = (n) => n === 1 ? 1 : n === 2 ? 18 : n <= 18 ? ((n - 3) % 8 < 2 ? (n - 3) % 8 + 1 : (n - 3) % 8 + 11) : n - 18;
    const rowOf = n => (n <= 2 ? 0 : n <= 10 ? 1 : n <= 18 ? 2 : 3);
    const table = E.map((e, i) => { const [s, c] = e.split(' '), n = i + 1;
      return withAnims(text(`<div style="font-size:13px;opacity:.75">${n}</div><div style="font-size:26px;font-weight:700;line-height:1.05">${s}</div>`,
        46 + (colOf(n) - 1) * 66, 180 + rowOf(n) * 78, 62, 72, { bg: CAT[c][1], radius: 8, pad: [4, 6, 4, 6], textAlign: 'center', color: INK, fontSize: 14 }),
        A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 45, duration: 350 })); });
    const legend = Object.values(CAT).map(([n, c], i) => text(`<span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:${c};vertical-align:-3px;margin-right:8px;border:1px solid #0001"></span>${n}`,
      46 + (i % 4) * 300, 520 + Math.floor(i / 4) * 44, 290, 40, { fontSize: 20, color: INK }));
    const atom = (cx, cy, r, c1, c2, label, fg = '#ffffff') => [sphere(cx, cy, r, c1, c2), text(`<b>${label}</b>`, cx - r, cy - 22, r * 2, 44, { fontSize: Math.round(r * 0.7), textAlign: 'center', color: fg })];
    return numbered(build({ name: 'Química: la tabla periódica', palette: 'office', fonts: 'clean', title: { size: 46, color: INK }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 1280, 8, TEAL), shape('hexagon', 1150, 600, 150, 130, 'none', { stroke: TEAL, strokeWidth: 2, opacity: 35 }), shape('hexagon', 1190, 520, 90, 78, 'none', { stroke: TEAL, strokeWidth: 2, opacity: 25 })] }, [
      { layout: 'blank', bg: '#f6fbfd', extra: [
        shape('hexagon', 760, 150, 420, 364, 'none', { stroke: INK, strokeWidth: 6 }), ring(970, 332, 110, TEAL, { strokeWidth: 6 }),
        ...[[865, 150], [1075, 150], [1180, 332], [1075, 514], [865, 514], [760, 332]].map(([x, y]) => sphere(x, y, 26, '#5e7480', INK)),
        kicker('QUÍMICA · 3.º ESO', 90, 210, 600, TEAL),
        text('La tabla periódica y los enlaces', 86, 250, 640, 220, { fontFamily: H, fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.08 }),
        text('Cómo se ordenan los elementos y por qué se unen', 90, 480, 620, 80, { fontSize: 28, color: '#4b6573' })],
        notes: 'Una molécula de benceno hecha con formas: un hexágono, un anillo y seis esferas con degradado.' },
      { title: '36 elementos, 4 periodos', layout: 'titleOnly', extra: [...table, ...legend],
        notes: 'La tabla se monta sola en cascada al llegar: cada casilla entra «con la anterior» con un pequeño retardo. Mostramos los cuatro primeros periodos.' },
      { title: 'Cómo leer una casilla', layout: 'titleOnly', extra: [
        text('<div style="font-size:40px;text-align:left">6</div><div style="font-size:150px;font-weight:800;line-height:1">C</div><div style="font-size:36px">Carbono</div><div style="font-size:30px;opacity:.7">12,011</div>',
          470, 170, 340, 450, { bg: '#cdeffd', radius: 24, pad: [20, 30, 20, 30], textAlign: 'center', color: INK, fontSize: 30, borderColor: TEAL }),
        ...[['Número atómico', 'protones del núcleo', 100, 200, 500, 215], ['Símbolo', 'una o dos letras', 100, 360, 560, 360], ['Nombre', '', 880, 470, 770, 500], ['Masa atómica', 'en unidades de masa (u)', 880, 540, 760, 560]]
          .flatMap(([h, d, x, y, lx, ly], i) => [anim(text(`<b>${h}</b>${d ? `<br><span style="opacity:.75">${d}</span>` : ''}`, x, y, 300, 90, { fontSize: 24, color: INK, textAlign: x < 400 ? 'right' : 'left' }), i + 1, x < 400 ? 'fade-right' : 'fade-left'),
            anim(line(x < 400 ? x + 310 : x - 10, y + 22, lx, ly, TEAL, 3), i + 1, 'fade-in')])],
        notes: 'Cada etiqueta y su línea aparecen juntas con un clic. El carbono es la base de la química de la vida.' },
      { title: 'Tres maneras de unirse', layout: 'titleOnly', extra: [dg('cards', 'Enlace iónico\n  Un átomo cede electrones a otro: sal común, NaCl\nEnlace covalente\n  Los átomos comparten electrones: agua, H₂O\nEnlace metálico\n  Un mar de electrones libres: cobre, Cu', 90, 180, 1100, 440, { colors: 'accent', oneByOne: true })],
        notes: 'Diagrama de tarjetas uno a uno, en un solo color.' },
      { title: 'La molécula de agua', layout: 'titleOnly', bg: '#f6fbfd', extra: [
        line(380, 330, 250, 470, '#5e7480', 10), line(380, 330, 510, 470, '#5e7480', 10),
        ...atom(380, 330, 80, '#ff8a80', '#c62828', 'O'), ...atom(250, 470, 50, '#ffffff', '#b0bec5', 'H', INK), ...atom(510, 470, 50, '#ffffff', '#b0bec5', 'H', INK),
        text('104,5°', 330, 430, 100, 40, { fontSize: 24, textAlign: 'center', color: TEAL }),
        mathBlock({ x: 640, y: 190, w: 540, h: 100, fontSize: 44, color: INK, latex: '2\\,\\mathrm{H_2} + \\mathrm{O_2} \\longrightarrow 2\\,\\mathrm{H_2O}' }),
        text(ul('Enlace <b>covalente</b>: comparten electrones', 'El oxígeno atrae más los electrones: la molécula es <b>polar</b>', 'Por eso el agua disuelve tantas cosas'), 640, 320, 540, 300, { fontSize: 26, color: INK })],
        notes: 'Átomos dibujados con esferas (degradado radial) y enlaces con líneas. La ecuación química está escrita con KaTeX.' },
      { title: 'Combustión: energía de los enlaces', layout: 'titleOnly', extra: [
        model('kh-PotOfCoals', 80, 170, 400, 400, { view: 'three', motion: 'zoom', edge: 'fade', bleed: 1.3 }),
        mathBlock({ x: 520, y: 170, w: 680, h: 80, fontSize: 32, color: INK, latex: '\\mathrm{CH_4} + 2\\,\\mathrm{O_2} \\longrightarrow \\mathrm{CO_2} + 2\\,\\mathrm{H_2O} + \\text{energía}' }),
        chartBlock({ x: 520, y: 270, w: 680, h: 330, chartType: 'hbar', color: '#e97132', dataLabels: true,
          data: [['Hidrógeno', 142], ['Metano', 55], ['Gasolina', 46], ['Carbón', 30], ['Madera seca', 16]].map(([label, value]) => ({ label, value })) }),
        text('Energía liberada al arder, en kJ por gramo (valores aproximados)', 520, 610, 680, 40, { fontSize: 20, color: '#4b6573' })],
        notes: 'Modelo 3D (brasero) con «Acercar al entrar» y bordes difuminados. Romper enlaces cuesta energía; formar otros más fuertes la libera.' },
      { title: '¿De qué está hecho el aire?', layout: 'twoContent', body: '', body2: '', extra: [
        chartBlock({ x: 120, y: 170, w: 460, h: 460, chartType: 'doughnut', color: TEAL, data: [{ label: 'Nitrógeno', value: 78 }, { label: 'Oxígeno', value: 21 }, { label: 'Argón y otros', value: 1 }] }),
        ...[['78 %', 'Nitrógeno, N₂', '#3f6497'], ['21 %', 'Oxígeno, O₂', '#c0392b'], ['1 %', 'Argón, CO₂ y otros', '#2b7a3b']].map(([v, l, c], i) =>
          anim(text(`<span style="font-size:60px;font-weight:800;color:${c}">${v}</span>&nbsp;&nbsp;${l}`, 660, 200 + i * 140, 520, 110, { fontSize: 30, color: INK, vAlign: 'middle' }), i + 1, 'fade-left'))],
        notes: 'Gráfico de dona; las cifras de la derecha usan los mismos colores que el gráfico y aparecen una a una.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'match', question: 'Une cada símbolo con su elemento', fontSize: 34, x: 60, y: 40, w: 1160, h: 640,
        options: ['Na = Sodio', 'Fe = Hierro', 'K = Potasio', 'Ag = Plata', 'Au = Oro'] })],
        notes: 'Emparejar desde el móvil: los símbolos que vienen del latín (natrium, ferrum, kalium, argentum, aurum) suelen confundirse.' },
      { layout: 'section', title: 'Todo lo que tocas es química', subtitle: 'Próxima clase: reacciones y ajuste de ecuaciones', transition: 'zoom', bg: '#f6fbfd',
        notes: 'Diseño «Encabezado de sección» del patrón, con transición «Zoom».' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · Statistics: an editorial look (white, black rules, one coral), a bell curve that draws
  // itself, and the charts of the subject: histogram, scatter, area, bars and bubbles.
  sci_stats: { name: 'Estadística y probabilidad', cat: 'sci', summary: 'Estilo editorial: campana que se dibuja, fórmulas, histograma, dispersión, área, barras y burbujas, y pregunta con puntos', make: () => {
    const INK = '#1b1b1b', CORAL = '#d1495b', TEAL = '#00798c', GREY = '#6d6d6d', H = pairStacks('editorial').heading;
    // Made-up but believable data, the same every time (a small pseudo-random generator).
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const heights = Array.from({ length: 60 }, () => Math.round(171 + 8 * (rnd() + rnd() + rnd() + rnd() - 2) * 1.4));
    const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
    const sd = Math.sqrt(heights.reduce((a, b) => a + (b - mean) ** 2, 0) / heights.length);
    const study = Array.from({ length: 24 }, (_, i) => { const h = +(0.5 + i * 0.4).toFixed(1); return [h, +Math.min(10, Math.max(1, 2.6 + 0.62 * h + (rnd() - 0.5) * 2.4)).toFixed(1)]; });
    const mx = study.reduce((a, p) => a + p[0], 0) / study.length, my = study.reduce((a, p) => a + p[1], 0) / study.length;
    const r = study.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / Math.sqrt(study.reduce((a, p) => a + (p[0] - mx) ** 2, 0) * study.reduce((a, p) => a + (p[1] - my) ** 2, 0));
    const fmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
    const bell = Array.from({ length: 41 }, (_, i) => { const x = 690 + i * 12.5; return [x, 560 - 300 * Math.exp(-(((x - 940) / 85) ** 2) / 2)]; });
    const rule = (y, w = 1100) => shape('rect', 90, y, w, 2, INK);
    return numbered(build({ name: 'Estadística y probabilidad', palette: 'grayscale', fonts: 'editorial', title: { size: 46, color: INK },
      decor: () => [shape('rect', 60, 30, 1160, 1, INK), text('ESTADÍSTICA · TEMA 3', 60, 666, 400, 30, { fontSize: 14, letterSpacing: 4, color: GREY })] }, [
      { layout: 'blank', extra: [
        kicker('GRADO EN CIENCIAS · PRIMER CURSO', 90, 170, 560, CORAL),
        text('Estadística y probabilidad', 86, 210, 600, 230, { fontFamily: H, fontSize: 70, fontWeight: 700, color: INK, lineHeight: 1.1 }),
        rule(462, 120),
        text('Decidir con datos… y con incertidumbre', 90, 490, 560, 60, { fontSize: 30, color: GREY, fontStyle: 'italic' }),
        line(690, 560, 1190, 560, INK, 2),
        { ...ink(bell, CORAL, 5), animation: A('draw', { start: 'afterPrev', duration: 1800 }) },
        withAnims(line(940, 250, 940, 560, TEAL, 2, { dash: 'dash' }), A('fade-in', { start: 'afterPrev' })),
        withAnims(text('μ', 920, 568, 40, 40, { fontSize: 28, textAlign: 'center', color: TEAL }), A('fade-in', { start: 'withPrev' }))],
        notes: 'La campana se dibuja sola al llegar (efecto «Dibujar» sobre un trazo) y después aparece la media. Estilo editorial: blanco, negro y un único color de acento.' },
      { title: 'Tres maneras de resumir', layout: 'titleOnly', extra: [rule(150),
        text('Datos: <b>2 · 3 · 3 · 5 · 12</b>', 90, 168, 1100, 56, { fontSize: 34, color: INK, textAlign: 'center' }),
        mathBlock({ x: 90, y: 228, w: 1100, h: 130, fontSize: 34, color: INK, latex: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i' }),
        ...[['Media', '5', 'La suma entre cuántos hay. Se deja arrastrar por el 12.', CORAL], ['Mediana', '3', 'El valor del centro al ordenarlos. Resiste a los extremos.', TEAL], ['Moda', '3', 'El que más se repite. Sirve también para categorías.', INK]]
          .map(([h, v, d, c], i) => anim(text(`<div style="font-size:24px;letter-spacing:3px;color:${c}">${h.toUpperCase()}</div><div style="font-family:${H};font-size:80px;font-weight:700;line-height:1.1;color:${c}">${v}</div><div>${d}</div>`,
            90 + i * 380, 390, 340, 250, { fontSize: 22, color: INK, borderColor: '#d0d0d0', pad: [16, 20, 16, 20] }), i + 1, 'fade-up'))],
        notes: 'Tres medidas de centralización con el mismo conjunto de datos: la media se va a 5 por culpa del 12.' },
      { title: 'Altura de 60 estudiantes', layout: 'titleOnly', extra: [rule(150),
        chartBlock({ x: 90, y: 200, w: 800, h: 400, chartType: 'histogram', color: TEAL, data: heights.map((v, i) => ({ label: String(i + 1), value: v })), xTitle: 'Altura (cm)' }),
        text(`<div style="font-family:${H};font-size:64px;font-weight:700;color:${CORAL}">${fmt(mean)}</div><div>cm de media</div>`, 930, 200, 260, 150, { fontSize: 24, color: INK }),
        text(`<div style="font-family:${H};font-size:64px;font-weight:700;color:${TEAL}">${fmt(sd)}</div><div>cm de desviación típica</div>`, 930, 380, 260, 150, { fontSize: 24, color: INK }),
        text('Datos inventados para el ejemplo.', 930, 590, 260, 40, { fontSize: 18, color: GREY, fontStyle: 'italic' })],
        notes: 'Histograma: Revela agrupa los 60 valores en intervalos (regla de Sturges). La media y la desviación se calculan en la propia plantilla a partir de los datos.' },
      { title: '¿Estudiar más sube la nota?', layout: 'titleOnly', extra: [rule(150),
        chartBlock({ x: 90, y: 180, w: 760, h: 460, chartType: 'scatter', color: CORAL, data: study.map(([h, n]) => ({ label: String(h), value: n })) }),
        text('horas de estudio por semana →', 90, 640, 760, 30, { fontSize: 18, color: GREY, textAlign: 'right' }),
        mathBlock({ x: 890, y: 200, w: 300, h: 100, fontSize: 56, color: TEAL, latex: `r = ${fmt(r, 2).replace(',', '{,}')}` }),
        text('Correlación positiva fuerte: cuantas más horas, mejor nota… de media.', 890, 320, 300, 160, { fontSize: 24, color: INK }),
        anim(text('<b>Ojo:</b> correlación no implica causalidad.', 890, 500, 300, 100, { fontSize: 24, color: CORAL }), 1, 'fade-in')],
        notes: 'Gráfico de dispersión (x = horas, y = nota). El coeficiente de Pearson se calcula a partir de los mismos datos inventados.' },
      { title: 'La campana de Gauss', layout: 'titleOnly', transition: 'fade', extra: [rule(150),
        mathBlock({ x: 90, y: 170, w: 620, h: 120, fontSize: 40, color: INK, latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' }),
        chartBlock({ x: 90, y: 300, w: 620, h: 340, chartType: 'area', color: TEAL,
          data: Array.from({ length: 13 }, (_, i) => { const z = -3 + i * 0.5; return { label: Number.isInteger(z) ? (z ? `${z > 0 ? '+' : '−'}${Math.abs(z)}σ` : 'μ') : '', value: +(Math.exp(-z * z / 2) * 100).toFixed(1) }; }) }),
        ...[['68 %', 'entre μ − σ y μ + σ'], ['95 %', 'entre μ − 2σ y μ + 2σ'], ['99,7 %', 'entre μ − 3σ y μ + 3σ']].map(([v, d], i) =>
          anim(text(`<span style="font-family:${H};font-size:52px;font-weight:700;color:${[CORAL, TEAL, INK][i]}">${v}</span><br>${d}`, 780, 180 + i * 160, 410, 140, { fontSize: 24, color: INK }), i + 1, 'fade-left'))],
        notes: 'Gráfico de área con la forma de la normal. La regla 68-95-99,7 aparece clic a clic.' },
      { title: 'Dos dados: ¿qué suma sale más?', layout: 'titleOnly', extra: [rule(150),
        chartBlock({ x: 90, y: 180, w: 760, h: 460, chartType: 'bar', color: INK, dataLabels: true,
          data: Array.from({ length: 11 }, (_, i) => ({ label: String(i + 2), value: 6 - Math.abs(i - 5) })) }),
        mathBlock({ x: 890, y: 220, w: 300, h: 110, fontSize: 44, color: CORAL, latex: 'P(7) = \\frac{6}{36} = \\frac{1}{6}' }),
        text('De las 36 combinaciones posibles, seis suman 7: es la suma más probable.', 890, 360, 300, 180, { fontSize: 24, color: INK })],
        notes: 'Gráfico de barras con etiquetas de datos: número de combinaciones que dan cada suma.' },
      { title: 'Facultades: nota, plazas y abandono', layout: 'titleOnly', extra: [rule(150),
        chartBlock({ x: 90, y: 180, w: 1100, h: 430, chartType: 'bubble', color: TEAL,
          data: [['Ciencias', 7.9], ['Salud', 11.2], ['Ingeniería', 8.6], ['Economía', 7.4], ['Letras', 6.3]].map(([label, value]) => ({ label, value })),
          series: [{ name: 'Abandono (%)', values: [18, 6, 22, 14, 25] }] }),
        text('Altura: nota de corte media · tamaño de la burbuja: abandono en primer curso (%) · datos inventados', 90, 620, 1100, 40, { fontSize: 18, color: GREY })],
        notes: 'Gráfico de burbujas: tres variables a la vez. Las cifras son inventadas, solo para el ejemplo.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'quiz', question: 'Una moneda sale cara cinco veces seguidas. ¿Probabilidad de cara en la sexta?', options: ['1/64', '1/2', 'Casi 0', 'Más de 1/2'], correct: [1], time: 30, fontSize: 38, x: 60, y: 50, w: 1160, h: 610 })],
        notes: 'La falacia del jugador: la moneda no tiene memoria. Pregunta tipo concurso con puntos por rapidez.' },
      { layout: 'blank', transition: 'blur', extra: [
        text('«Correlación no implica causalidad»', 90, 230, 1100, 140, { fontFamily: H, fontSize: 64, fontWeight: 700, textAlign: 'center', color: INK }),
        shape('rect', 590, 400, 100, 4, CORAL),
        text('La frase que hay que recordar antes de sacar conclusiones de un gráfico', 140, 430, 1000, 60, { fontSize: 28, textAlign: 'center', color: GREY })],
        notes: 'Transición «Desenfoque». Ejemplo para comentar: las ventas de helados y los ahogamientos suben a la vez… por el verano.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · Python from scratch: a dark editor look, a terminal that types itself, code with
  // highlight steps, its output appearing, an ordering activity and a countdown challenge.
  sci_python: { name: 'Programación en Python', cat: 'sci', summary: 'Estilo editor oscuro: terminal que se escribe sola, código con pasos de resaltado, salida animada, ordenar líneas y reto con cuenta atrás', make: () => {
    const BG = '#0b0f19', FG = '#e6e9ef', SOFT = '#a9b1d6', BLUE = '#7aa2f7', GREEN = '#9ece6a', YEL = '#e0af68', PUR = '#bb9af7', MONO = "'JetBrains Mono', 'Fira Code', Consolas, monospace";
    const H = pairStacks('tech').heading;
    const term = (x, y, w, h, title) => [shape('rounded', x, y, w, h, '#16161e', { radius: 14, stroke: '#2a2f45', strokeWidth: 2 }),
      ...['#f7768e', '#e0af68', '#9ece6a'].map((c, i) => shape('ellipse', x + 20 + i * 24, y + 16, 14, 14, c)),
      text(title, x + 100, y + 8, w - 200, 30, { fontSize: 16, color: '#565f89', textAlign: 'center', fontFamily: MONO })];
    const out = (t, x, y, w, props = {}) => text(t, x, y, w, 36, { fontSize: 22, color: FG, fontFamily: MONO, ...props });
    return numbered(build({ name: 'Programación en Python', palette: 'midnight', fonts: 'tech', title: { size: 50, color: FG },
      decor: p => [shape('rect', 0, 0, 10, 720, p.accents[0]), shape('rect', 0, 0, 10, 240, p.accents[2])] }, [
      { layout: 'blank', bg: BG, transition: 'slide', extra: [glow(600, -260, 800, '#7aa2f7', BG, 30),
        kicker('INFORMÁTICA · PRIMER CURSO', 90, 150, 600, GREEN),
        text('Python<br>desde cero', 86, 190, 560, 260, { fontFamily: H, fontSize: 100, fontWeight: 700, color: FG, lineHeight: 1.02 }),
        text('Variables, listas, bucles y funciones en cuatro sesiones', 90, 470, 520, 100, { fontSize: 28, color: SOFT }),
        ...term(680, 170, 520, 380, 'terminal'),
        withAnims(out('<span style="color:#9ece6a">$</span> python3 hola.py', 710, 230, 470), A('fade-in', { start: 'afterPrev', delay: 400 })),
        withAnims(out('¡Hola, mundo!', 710, 280, 470), A('fade-in', { start: 'afterPrev', delay: 500 })),
        withAnims(out('<span style="color:#9ece6a">$</span> python3 -c "print(2 ** 10)"', 710, 340, 470), A('fade-in', { start: 'afterPrev', delay: 600 })),
        withAnims(out('1024', 710, 390, 470), A('fade-in', { start: 'afterPrev', delay: 400 })),
        withAnims(out('<span style="color:#9ece6a">$</span> <span style="background:#7aa2f7">&nbsp;</span>', 710, 450, 470), A('fade-in', { start: 'afterPrev', delay: 400 }), A('fade-in-then-out', { start: 'afterPrev', duration: 900 }))],
        notes: 'La terminal «se escribe sola»: cada línea aparece después de la anterior con un retardo, sin clics. El cursor parpadea una vez al final.' },
      { title: '¿Por qué Python?', layout: 'titleOnly', bg: BG, extra: [dg('cards', 'Se lee como inglés\n  Poca sintaxis: el código se entiende\nPilas incluidas\n  Una biblioteca estándar enorme\nCiencia y datos\n  El idioma común de los laboratorios\nGratis y libre\n  Funciona en cualquier ordenador', 90, 190, 1100, 400, { colors: 'colorful', oneByOne: true })],
        notes: 'Diagrama de tarjetas uno a uno.' },
      { title: 'Variables y tipos', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 90, y: 170, w: 660, h: 330, fontSize: 24, lang: 'python', lineSteps: '1|2|3|4|6',
          code: 'nombre = "Ada"\nedad = 20\naltura = 1.68\nes_estudiante = True\n\nprint(f"{nombre} tiene {edad} años")' }),
        ...term(90, 520, 660, 110, 'salida'),
        withAnims(out('Ada tiene 20 años', 120, 570, 600, { color: GREEN }), A('fade-in')),
        tableBlock({ x: 790, y: 170, w: 400, h: 330, fontSize: 22, header: true, headBg: '#7aa2f7', headFg: '#0b0f19', stroke: '#2a2f45', banded: true, band: '#7aa2f7',
          rows: [['Tipo', 'Ejemplo'], ['<code>str</code>', '"Ada"'], ['<code>int</code>', '20'], ['<code>float</code>', '1.68'], ['<code>bool</code>', 'True']], colW: [1, 1] })],
        notes: 'Código con pasos de resaltado: cada clic ilumina una línea (1|2|3|4|6). El último clic muestra la salida.' },
      { title: 'Listas y bucles', layout: 'titleOnly', bg: BG, transition: 'push', extra: [
        codeBlock({ x: 90, y: 170, w: 700, h: 470, fontSize: 23, lang: 'python', lineSteps: '1|3-5|7-8',
          code: 'notas = [7.5, 9, 6, 8.5]\n\nfor nota in notas:\n    if nota >= 7:\n        print(nota, "notable")\n\nmedia = sum(notas) / len(notas)\nprint(f"Media: {media:.2f}")' }),
        ...term(830, 170, 360, 300, 'salida'),
        ...['7.5 notable', '9 notable', '8.5 notable', 'Media: 7.75'].map((t, i) => withAnims(out(t, 860, 220 + i * 50, 310, { color: i === 3 ? YEL : GREEN }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 300 }))),
        text('El sangrado (4 espacios) marca qué va dentro del bucle.', 830, 500, 360, 120, { fontSize: 22, color: SOFT })],
        notes: 'Tres pasos de resaltado y después la salida, línea a línea. Transición «Empujar».' },
      { title: 'Funciones', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 90, y: 170, w: 760, h: 380, fontSize: 24, lang: 'python', lineSteps: '1|3|4-5|7',
          code: 'import math\n\ndef area_circulo(r):\n    """Área de un círculo de radio r."""\n    return math.pi * r ** 2\n\nprint(area_circulo(2))   # 12.566...' }),
        mathBlock({ x: 890, y: 200, w: 300, h: 110, fontSize: 60, color: PUR, latex: 'A = \\pi r^2' }),
        text('Una función tiene un <b>nombre</b>, recibe <b>parámetros</b> y <b>devuelve</b> un resultado.', 890, 340, 300, 200, { fontSize: 24, color: FG })],
        notes: 'De la fórmula (KaTeX) al código: la misma idea escrita de dos maneras.' },
      { title: 'Qué pasa al ejecutar', layout: 'titleOnly', bg: BG, extra: [dg('chevrons', 'hola.py\n  Tu código\nIntérprete\n  Lo lee y lo revisa\nBytecode\n  Órdenes sencillas\nMáquina virtual\n  Las ejecuta', 90, 200, 1100, 400, { colors: 'accent', oneByOne: true })],
        notes: 'Proceso uno a uno. Python no se compila a mano: el intérprete lo hace por nosotros.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', question: 'Ordena las líneas para sumar los números de la lista', fontSize: 30, x: 60, y: 40, w: 1160, h: 640,
        options: ['numeros = [3, 8, 1]', 'total = 0', 'for n in numeros:', '    total += n', 'print(total)'] })],
        notes: 'Actividad «Ordenar» desde el móvil: cada estudiante recibe las líneas desordenadas.' },
      { title: 'Reto: ¿par o impar?', layout: 'titleOnly', bg: BG, extra: [
        text('Escribe una función <code>es_par(n)</code> que devuelva <code>True</code> si <i>n</i> es par.', 90, 170, 1100, 60, { fontSize: 30, color: FG }),
        codeBlock({ x: 90, y: 260, w: 680, h: 260, fontSize: 26, lang: 'python', code: 'def es_par(n):\n    # tu código aquí\n    ...\n\nprint(es_par(10))   # True' }),
        text('Pista: el operador <code>%</code> da el resto de una división.', 820, 290, 370, 120, { fontSize: 26, color: YEL }),
        timer(300, 90, 560, 1100, { style: 'bar', h: 70, color: '#9ece6a', auto: false })],
        notes: 'Cuenta atrás en forma de barra (5 minutos): empieza con un clic. Solución: return n % 2 == 0.' },
      { layout: 'section', bg: BG, title: 'import curiosidad', subtitle: 'Ejercicios y soluciones en el aula virtual', transition: 'flip',
        notes: 'Transición «Voltear». El título es un guiño a «import this», el zen de Python.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · Artificial intelligence: neon violet, a robot that waves and then travels (Transform)
  // to the next slide facing us, a timeline, a hierarchy, a network that lights up layer by
  // layer, overfitting in a chart and a word cloud.
  sci_ai: { name: 'Inteligencia artificial', cat: 'sci', summary: 'Neón violeta: robot 3D que saluda y viaja con Transformar, cronología, organigrama, red neuronal que se enciende, gráfico y nube de palabras', make: () => {
    const BG = '#140b26', FG = '#f3eefe', SOFT = '#b9aed6', PINK = '#f15bb5', CYAN = '#00bbf9', YEL = '#fee440', MINT = '#00f5d4', bot = uid();
    const H = pairStacks('friendly').heading;
    const robot = (x, y, w, h, props) => ({ ...model('three-RobotExpressive', x, y, w, h, props), id: bot });
    // A small network: 3-4-4-2 neurons.
    const layers = [3, 4, 4, 2], LX = [200, 450, 700, 950], node = (l, i) => [LX[l], 410 + (i - (layers[l] - 1) / 2) * 105];
    const links = layers.slice(0, -1).flatMap((n, l) => Array.from({ length: n }, (_, i) => Array.from({ length: layers[l + 1] }, (_, j) => [l, i, j])).flat());
    const net = [
      ...links.map(([l, i, j]) => withAnims(line(...node(l, i), ...node(l + 1, j), '#9b5de5', 2), A('draw', { start: 'withPrev', delay: l * 700, duration: 600 }))),
      ...layers.flatMap((n, l) => Array.from({ length: n }, (_, i) => { const [x, y] = node(l, i);
        return withAnims(sphere(x, y, 28, ['#00bbf9', '#9b5de5', '#f15bb5', '#fee440'][l], '#1b1030', { stroke: '#ffffff55', strokeWidth: 2 }), A('zoom-in', { start: l + i ? 'withPrev' : 'click', delay: l * 700 })); }))];
    const sig = withAnims(shape('ellipse', node(0, 1)[0] - 10, node(0, 1)[1] - 10, 20, 20, YEL), A('path', { pathShape: 'custom', points: [[250, -52], [500, 52], [750, -52]], dx: 750, dy: -52, duration: 2000, start: 'click' }));
    return numbered(build({ name: 'Inteligencia artificial', palette: 'violet', fonts: 'friendly', title: { size: 50, color: FG },
      decor: p => [shape('rect', 0, 712, 1280, 8, p.accents[0], { fill2: p.accents[3], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [glow(-200, -260, 800, '#9b5de5', BG, 45), glow(760, 260, 700, PINK, BG, 30),
        kicker('SEMINARIO DE INFORMÁTICA · 2026', 90, 170, 600, MINT),
        text('Inteligencia<br>artificial', 84, 210, 700, 250, { fontFamily: H, fontSize: 100, fontWeight: 800, wordart: 'neon', lineHeight: 1.05 }),
        text('Qué es, cómo aprende y qué no sabe hacer', 90, 480, 640, 60, { fontSize: 32, color: FG }),
        robot(800, 110, 380, 520, { clip: 'Wave', bleed: 1.5, view: 'front' })],
        notes: 'El robot saluda en bucle; la vista 3D tiene margen alrededor (Modelo 3D ▸ Encuadre ▸ Margen) para que el brazo no se corte. Pasa: viajará a la siguiente diapositiva.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(-160, 120, 600, CYAN, BG, 30),
        robot(60, 170, 330, 450, { clip: 'Idle', view: 'three', arrive: 'turn' }),
        text('¿Qué es la IA?', 440, 110, 760, 80, { fontFamily: H, fontSize: 56, fontWeight: 800, color: FG }),
        text('Programas que hacen tareas que, en una persona, llamaríamos <b style="color:#fee440">inteligentes</b>: reconocer, predecir, decidir, generar.', 440, 200, 760, 140, { fontSize: 30, color: FG }),
        ...[['Reconocer', 'una cara en una foto'], ['Predecir', 'el tiempo de mañana'], ['Generar', 'un texto o una imagen']].map(([h, d], i) =>
          anim(card(`<b style="color:${[CYAN, PINK, MINT][i]}">${h}</b><br><span style="font-size:22px">${d}</span>`, 440 + i * 260, 380, 240, 170, '#ffffff12', { fontSize: 28, color: FG }), i + 1, 'fade-up'))],
        notes: 'Transformar: el mismo robot se encoge y se va a la izquierda dando una vuelta hasta su vista de tres cuartos (Al llegar: «Dar una vuelta»).' },
      { title: 'Setenta años en cinco momentos', layout: 'titleOnly', bg: BG, extra: [dg('timeline', '1956\n  Nace el término\n1997\n  Gana al ajedrez\n2012\n  Aprendizaje profundo\n2017\n  Transformers\n2022\n  IA generativa', 90, 190, 1100, 420, { colors: 'colorful', oneByOne: true })],
        notes: 'Cronología uno a uno. Momentos clave, sin nombres propios: cada uno da para una charla.' },
      { title: 'Una familia de técnicas', layout: 'titleOnly', bg: BG, extra: [dg('hierarchy', 'Inteligencia artificial\n  Sistemas de reglas\n    Sistemas expertos\n  Aprendizaje automático\n    Supervisado\n    No supervisado\n    Por refuerzo', 90, 180, 1100, 460, { colors: 'accent', oneByOne: true })],
        notes: 'Organigrama uno a uno: el aprendizaje profundo es aprendizaje automático con redes neuronales de muchas capas.' },
      { title: 'Una neurona artificial', layout: 'titleOnly', bg: BG, extra: [
        ...[0, 1, 2].flatMap(i => [anim(line(170, 260 + i * 130, 520, 390, '#9b5de5', 3), 1, 'fade-in'), anim(sphere(150, 260 + i * 130, 34, CYAN, '#1b1030'), 1, 'zoom-in'),
          anim(text(`x<sub>${i + 1}</sub>`, 116, 236 + i * 130, 68, 48, { fontSize: 26, textAlign: 'center', color: '#ffffff' }), 1, 'zoom-in'),
          anim(text(`w<sub>${i + 1}</sub>`, 290, Math.round(260 + i * 130 + (390 - 260 - i * 130) * 130 / 350) - 46, 60, 40, { fontSize: 22, color: SOFT }), 1, 'fade-in')]),
        anim(sphere(560, 390, 62, PINK, '#1b1030'), 2, 'zoom-in'), anim(text('Σ', 500, 350, 120, 80, { fontSize: 52, textAlign: 'center', color: FG }), 2, 'zoom-in'),
        anim(shape('rightarrow', 640, 360, 130, 60, YEL), 3, 'fade-right'), anim(text('<b>y</b>', 780, 355, 80, 70, { fontSize: 44, color: YEL }), 3, 'fade-right'),
        mathBlock({ x: 860, y: 230, w: 340, h: 110, fontSize: 36, color: FG, latex: 'y = \\sigma\\Big(\\sum_i w_i x_i + b\\Big)' }),
        text('Multiplica cada entrada por su peso, suma y decide con la función de activación σ.', 860, 380, 340, 200, { fontSize: 24, color: SOFT })],
        notes: 'Tres clics: entradas con sus pesos, la suma y la salida. Aprender es ajustar los pesos w.' },
      { title: 'Una red: capa a capa', layout: 'titleOnly', bg: BG, extra: [...net, sig,
        ...['Entrada', 'Oculta 1', 'Oculta 2', 'Salida'].map((t, l) => text(t, LX[l] - 80, 630, 160, 36, { fontSize: 22, textAlign: 'center', color: SOFT })),
        text('Clic: la red se enciende capa a capa. Otro clic: una señal la atraviesa.', 1040, 260, 180, 260, { fontSize: 22, color: SOFT })],
        notes: 'Las conexiones son trazos que se dibujan (efecto «Dibujar») con retardos por capa; la señal es una trayectoria.' },
      { title: 'Aprender demasiado bien', layout: 'titleOnly', bg: BG, transition: 'convex', extra: [
        chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'line', color: CYAN, grid: true, xTitle: 'Épocas de entrenamiento', seriesName: 'Entreno',
          data: [1, 5, 10, 15, 20, 25, 30, 35, 40].map((e, i) => ({ label: String(e), value: +(1.2 * Math.exp(-i / 2.2) + 0.05).toFixed(2) })),
          series: [{ name: 'Validación', color: PINK, values: [1.25, 0.82, 0.58, 0.47, 0.44, 0.46, 0.52, 0.6, 0.69] }] }),
        text('<b style="color:#f15bb5">Sobreajuste</b>: a partir de la época 20, la red memoriza los ejemplos en vez de aprender la regla.', 890, 200, 300, 240, { fontSize: 26, color: FG }),
        anim(text('Solución: parar a tiempo, más datos o un modelo más sencillo.', 890, 460, 300, 150, { fontSize: 24, color: MINT }), 1, 'fade-up')],
        notes: 'Gráfico de líneas con dos series (error en entrenamiento y en validación). Curvas inventadas pero típicas.' },
      { title: 'Lo que hay que vigilar', layout: 'titleOnly', bg: BG, extra: [dg('matrix', 'Sesgos\nPrivacidad\nTransparencia\nTrabajo', 240, 170, 800, 470, { colors: 'colorful' })],
        notes: 'Matriz 2 × 2 para debatir: ¿qué pasa si los datos de entrenamiento ya tenían prejuicios?' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', question: 'Una palabra: ¿qué sientes ante la IA?', fontSize: 40, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Nube de palabras en directo: las palabras repetidas crecen.' },
      { layout: 'blank', bg: BG, transition: 'convex', extra: [glow(390, 120, 520, '#9b5de5', BG, 40),
        model('three-RobotExpressive', 440, 150, 400, 420, { clip: 'Dance', bleed: 1.5, view: 'front', motion: 'zoom' }),
        text('¿Y tú qué harás con ella?', 140, 40, 1000, 100, { fontFamily: H, fontSize: 60, fontWeight: 800, textAlign: 'center', wordart: 'neon' }),
        text('Gracias · preguntas', 140, 600, 1000, 60, { fontSize: 30, textAlign: 'center', color: SOFT })],
        notes: 'Cierre con el robot bailando y la cámara acercándose al entrar (Al llegar a la diapositiva: «Acercar»).' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · A thesis defence (TFG): sober and academic — white, navy and burgundy, serif titles,
  // a running footer, method, results in charts and a table that adds itself up, references.
  sci_thesis: { name: 'Defensa de TFG', cat: 'sci', summary: 'Académico sobrio: portada institucional, índice, metodología con ecuación, tabla con totales, resultados en gráficos, bibliografía y Q&A', make: () => {
    const NAVY = '#1f3864', BURG = '#8b1e3f', INK = '#1f2733', GREY = '#5f6b7a', H = pairStacks('classic').heading;
    const foot = [shape('rect', 60, 662, 1160, 1, '#c9ced6'), text('Universidad de Ejemplo · Facultad de Ciencias Agrarias · Trabajo de Fin de Grado 2026', 320, 670, 900, 30, { fontSize: 15, color: GREY, textAlign: 'right' })];
    return numbered(build({ name: 'Defensa de TFG', palette: 'office', fonts: 'classic', title: { size: 44, color: NAVY }, body: { color: INK },
      decor: () => [shape('rect', 60, 40, 60, 5, BURG), ...foot] }, [
      { layout: 'blank', transition: 'fade', extra: [
        shape('rect', 0, 0, 420, 720, NAVY), shape('rect', 420, 0, 8, 720, BURG),
        shape('seal', 130, 170, 160, 160, 'none', { stroke: '#ffffff', strokeWidth: 3, opacity: 80 }), icon('star', 180, 220, 60, '#ffffff'),
        text('UNIVERSIDAD<br>DE EJEMPLO', 60, 360, 300, 90, { fontSize: 24, letterSpacing: 4, textAlign: 'center', color: '#ffffff' }),
        text('Facultad de Ciencias Agrarias', 60, 460, 300, 40, { fontSize: 18, textAlign: 'center', color: '#c9d3e6' }),
        kicker('TRABAJO DE FIN DE GRADO · INGENIERÍA AGRÍCOLA', 490, 130, 730, BURG, { fontSize: 18, letterSpacing: 3 }),
        text('Detección temprana del estrés hídrico en viñedo con imágenes multiespectrales de dron', 486, 170, 730, 250, { fontFamily: H, fontSize: 44, fontWeight: 700, color: NAVY, lineHeight: 1.15 }),
        shape('rect', 490, 440, 100, 3, BURG),
        text('<b>Autora:</b> Lucía Ferrer Montes<br><b>Tutor:</b> Dr. Andrés Beltrán Ruiz<br>Julio de 2026', 490, 470, 700, 130, { fontSize: 24, color: INK, lineHeight: 1.5 })],
        notes: 'Portada institucional: banda de color con escudo hecho con formas. Nombres y universidad inventados. Saludar al tribunal y presentar el trabajo en una frase.' },
      { title: 'Índice', layout: 'titleOnly', extra: [
        dg('bullets', 'Introducción y objetivos\nMetodología\nDiseño experimental\nResultados\nConclusiones', 100, 180, 640, 450, { colors: 'accent' }),
        model('kh-DiffuseTransmissionPlant', 800, 160, 380, 420, { autoRotate: true, spin: 12, view: 'three', edge: 'fade' })],
        notes: 'Lista numerada (diagrama). La planta 3D gira despacio, con los bordes difuminados para que no se vea el corte del marco.' },
      { title: 'Motivación y objetivos', layout: 'titleOnly', extra: [
        text(`<div style="font-family:${H};font-size:72px;font-weight:700;color:${BURG};line-height:1.1">70 %</div><div>del agua dulce del mundo se usa para regar</div>`, 100, 170, 400, 170, { fontSize: 24, color: INK }),
        text(`<div style="font-family:${H};font-size:72px;font-weight:700;color:${NAVY};line-height:1.1">10 días</div><div>antes de que la planta muestre síntomas visibles</div>`, 100, 380, 400, 170, { fontSize: 24, color: INK }),
        shape('rect', 540, 180, 2, 450, '#c9ced6'),
        text('<b>Objetivo general</b>', 580, 170, 600, 44, { fontSize: 28, color: NAVY }),
        text('Detectar el estrés hídrico antes de que se vea a simple vista.', 580, 215, 600, 80, { fontSize: 24, color: INK }),
        text('<b>Objetivos específicos</b>' + ul('Calcular índices de vegetación por cepa', ['NDVI y NDRE'], 'Comparar tres modelos de clasificación', 'Proponer un calendario de vuelos'), 580, 310, 600, 330, { fontSize: 24, color: INK })],
        notes: 'Dos columnas: la motivación con cifras (aproximadas) y los objetivos con viñetas multinivel.' },
      { title: 'Metodología', layout: 'titleOnly', extra: [
        dg('chevrons', 'Vuelo\n  Dron con cámara multiespectral\nProcesado\n  Ortomosaico y corrección\nÍndices\n  NDVI por cepa\nModelo\n  Clasificación\nValidación\n  Con medidas de campo', 100, 170, 1080, 280, { colors: 'accent', oneByOne: true }),
        mathBlock({ x: 100, y: 480, w: 520, h: 120, fontSize: 40, color: INK, latex: '\\mathrm{NDVI} = \\frac{\\rho_{NIR} - \\rho_{R}}{\\rho_{NIR} + \\rho_{R}}' }),
        text('Una planta sana refleja mucho infrarrojo cercano (NIR) y absorbe el rojo (R). El índice va de −1 a 1.', 660, 490, 520, 120, { fontSize: 22, color: GREY })],
        notes: 'Galones uno a uno y la ecuación del NDVI en KaTeX. Explicar por qué el infrarrojo delata el estrés antes que el color.' },
      { title: 'Diseño experimental', layout: 'titleOnly', extra: [
        tableBlock({ x: 100, y: 180, w: 1080, h: 380, fontSize: 24, header: true, headBg: NAVY, headFg: '#ffffff', stroke: '#c9ced6', banded: true, band: '#1f3864',
          rows: [['Parcela', 'Tratamiento de riego', 'Cepas', 'Vuelos'], ['A', 'Riego completo (100 %)', '120', '14'], ['B', 'Déficit moderado (60 %)', '120', '14'], ['C', 'Déficit severo (30 %)', '120', '14'], ['<b>Total</b>', '', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [2, 5, 2, 2] }),
        text('Campaña de mayo a septiembre · vuelos semanales a mediodía solar · datos del ejemplo inventados', 100, 580, 1080, 40, { fontSize: 20, color: GREY, fontStyle: 'italic' })],
        notes: 'La fila Total usa fórmulas (=SUMA(ARRIBA)): si se cambia el número de cepas, se recalcula.' },
      { title: 'Resultados · evolución del NDVI', layout: 'titleOnly', transition: 'slide', extra: [
        chartBlock({ x: 100, y: 170, w: 760, h: 460, chartType: 'line', color: NAVY, grid: true, xTitle: 'Semana de la campaña', seriesName: '100 %',
          data: [1, 3, 5, 7, 9, 11, 13].map((w, i) => ({ label: 'S' + w, value: [0.71, 0.74, 0.76, 0.77, 0.76, 0.75, 0.74][i] })),
          series: [{ name: '60 %', color: '#2e75b6', values: [0.7, 0.72, 0.71, 0.68, 0.65, 0.63, 0.61] }, { name: '30 %', color: BURG, values: [0.7, 0.69, 0.64, 0.57, 0.52, 0.48, 0.45] }] }),
        text('Series: riego al 100, 60 y 30 %. El NDVI de la parcela C cae ya en la <b>semana 5</b>, unos 10 días antes de los primeros síntomas visibles.', 900, 220, 280, 260, { fontSize: 24, color: INK }),
        anim(text('Diferencias significativas desde la semana 5 (p &lt; 0,01).', 900, 500, 280, 110, { fontSize: 20, color: BURG }), 1, 'fade-in')],
        notes: 'Gráfico de líneas con tres series. Valores inventados pero coherentes con la literatura.' },
      { title: 'Resultados · comparación de modelos', layout: 'titleOnly', extra: [
        chartBlock({ x: 100, y: 170, w: 760, h: 460, chartType: 'bar', color: NAVY, dataLabels: true, grid: true, seriesName: 'Precisión',
          data: [{ label: 'Umbral', value: 71 }, { label: 'Bosque', value: 86 }, { label: 'Red CNN', value: 91 }],
          series: [{ name: 'Exhaustividad', color: BURG, values: [64, 83, 88] }] }),
        text(`<div style="font-family:${H};font-size:64px;font-weight:700;color:${NAVY}">91 %</div><div>de precisión con la red convolucional, con solo 14 vuelos</div>`, 900, 220, 280, 220, { fontSize: 22, color: INK })],
        notes: 'Barras agrupadas con dos series y etiquetas de datos.' },
      { title: 'Conclusiones', layout: 'twoContent', body: '<b>Conclusiones</b>' + ul('El NDVI detecta el estrés unos 10 días antes', 'La red convolucional es el mejor modelo', 'Basta un vuelo por semana'),
        body2: '<b>Trabajo futuro</b>' + ul('Probar en otras variedades', 'Añadir una cámara térmica', 'Una aplicación para el viticultor'),
        notes: 'Diseño «Dos contenidos» del patrón, con los títulos de columna en negrita.' },
      { title: 'Referencias', layout: 'titleOnly', extra: [
        text(['Álvarez, M. y Soto, P. (2023). Índices espectrales para el riego de precisión. <i>Revista de Agronomía Aplicada</i>, 41(2), 112–130.',
          'García-León, R. <i>et al.</i> (2024). Drones multiespectrales en viñedo: una revisión. <i>Cuadernos de Viticultura</i>, 18, 45–71.',
          'Martín, L. (2022). <i>Teledetección agrícola</i>. Editorial Universitaria de Ejemplo.',
          'Pérez, A. y Ruiz, C. (2025). Redes convolucionales para clasificar el estado hídrico de cultivos leñosos. <i>Agricultura Digital</i>, 7(1), 1–19.']
          .map(r => `<p style="padding-left:40px;text-indent:-40px;margin:0 0 18px">${r}</p>`).join(''), 100, 170, 1080, 460, { fontSize: 22, color: INK })],
        notes: 'Referencias con sangría francesa (estilo APA). Son referencias de ejemplo, inventadas: sustitúyelas por las reales.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'qa', question: 'Preguntas del tribunal y del público', options: [], fontSize: 34, x: 60, y: 60, w: 1160, h: 580 })],
        notes: 'Preguntas desde el móvil (Q&A): el público las envía y vota las más interesantes. Agradecer al tribunal y al tutor.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · Climate change: warming stripes, the curves (line, area), the greenhouse effect drawn
  // step by step, emissions as a treemap, a NASA satellite, a feedback cycle and a vote.
  sci_climate: { name: 'Cambio climático en datos', cat: 'sci', summary: 'Bandas de calentamiento, gráficos de línea, área y rectángulos, efecto invernadero que se dibuja, satélite 3D, ciclo y votación múltiple', make: () => {
    const INK = '#1e3320', GREEN = '#2e7d32', BLUE = '#0277bd', RED = '#c62828', GREY = '#5b6b5c', H = pairStacks('modern').heading;
    // Warming stripes: one stripe a year-ish, from cool blue to deep red (a smooth made-up series).
    const anomaly = Array.from({ length: 40 }, (_, i) => -0.3 + 0.08 * Math.sin(i * 1.7) + (i > 22 ? (i - 22) * 0.075 : 0) + 0.01 * i);
    const col = v => { const t = Math.max(0, Math.min(1, (v + 0.4) / 1.9)), A2 = [[8, 48, 107], [66, 146, 198], [247, 247, 247], [239, 101, 72], [103, 0, 13]];
      const k = Math.min(3, Math.floor(t * 4)), f = t * 4 - k, c = A2[k].map((a, j) => Math.round(a + (A2[k + 1][j] - a) * f));
      return '#' + c.map(x => x.toString(16).padStart(2, '0')).join(''); };
    const stripes = (y, h) => anomaly.map((v, i) => shape('rect', i * 32, y, 33, h, col(v)));
    const decades = ['1880', '1890', '1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020'];
    const temps = [-0.2, -0.25, -0.3, -0.3, -0.22, -0.1, 0.02, -0.04, -0.02, 0.0, 0.2, 0.36, 0.56, 0.8, 1.1];
    return numbered(build({ name: 'Cambio climático en datos', palette: 'forest', fonts: 'modern', title: { size: 46, color: INK },
      decor: () => stripes(708, 12) }, [
      { layout: 'blank', transition: 'fade', extra: [...stripes(0, 720),
        shape('rounded', 140, 170, 1000, 380, '#ffffff', { opacity: 94, radius: 26 }),
        kicker('CIENCIAS AMBIENTALES · SEMINARIO', 200, 220, 880, GREEN, { textAlign: 'center' }),
        text('Cambio climático: lo que dicen los datos', 190, 260, 900, 160, { fontFamily: H, fontSize: 60, fontWeight: 800, textAlign: 'center', color: INK, lineHeight: 1.1 }),
        text('Cada franja de fondo es un año: azul, más frío; rojo, más cálido que la media', 200, 450, 880, 70, { fontSize: 24, textAlign: 'center', color: GREY })],
        notes: 'Las «bandas de calentamiento» están hechas con 40 rectángulos de colores. La serie es ilustrativa, no son datos oficiales año a año.' },
      { title: 'La temperatura media sube', layout: 'titleOnly', extra: [
        chartBlock({ x: 90, y: 170, w: 780, h: 470, chartType: 'line', color: RED, grid: true, dataLabels: false, xTitle: 'Década', yTitle: '°C respecto a 1951-1980', seriesName: 'Anomalía',
          data: decades.map((d, i) => ({ label: i % 2 ? '' : d, value: temps[i] })) }),
        text(`<div style="font-family:${H};font-size:80px;font-weight:800;color:${RED};line-height:1.05">+1,2 °C</div><div>desde la época preindustrial</div>`, 910, 210, 290, 190, { fontSize: 24, color: INK }),
        anim(text('La última década es la más cálida desde que hay registros.', 910, 440, 290, 150, { fontSize: 24, color: GREY }), 1, 'fade-up')],
        notes: 'Gráfico de líneas con cuadrícula y títulos en los dos ejes. Valores por década redondeados de las series públicas.' },
      { title: 'El CO₂ no deja de crecer', layout: 'titleOnly', transition: 'wipe', extra: [
        chartBlock({ x: 90, y: 170, w: 780, h: 470, chartType: 'area', color: '#8d6e63', grid: true, dataLabels: true, yTitle: 'ppm por encima de 280',
          data: [[1960, 317], [1970, 326], [1980, 339], [1990, 354], [2000, 370], [2010, 390], [2020, 414], [2025, 426]].map(([y, v]) => ({ label: String(y), value: v - 280 })) }),
        text(`<div style="font-family:${H};font-size:80px;font-weight:800;color:#8d6e63;line-height:1.05">426</div><div>partes por millón en 2025</div>`, 910, 210, 290, 190, { fontSize: 24, color: INK }),
        text('El gráfico muestra lo que sobra sobre las 280 ppm de antes de la revolución industrial.', 910, 440, 290, 150, { fontSize: 24, color: GREY })],
        notes: 'Gráfico de área: concentración de CO₂ medida en observatorios de montaña (valores redondeados). Transición «Barrido».' },
      { title: 'El efecto invernadero, paso a paso', layout: 'titleOnly', bg: '#eef5ea', extra: [
        sphere(170, 250, 70, '#fff3b0', '#fbc02d'),
        shape('rect', 60, 420, 1160, 70, '#90caf9', { opacity: 35 }), text('Atmósfera con gases de efecto invernadero', 760, 432, 440, 44, { fontSize: 20, color: BLUE, textAlign: 'right' }),
        shape('rect', 60, 560, 1160, 90, '#66bb6a', { fill2: '#2e7d32', gradAngle: 90 }),
        { ...ink([[220, 290], [420, 450], [520, 575]], '#f9a825', 6), animation: A('draw', { duration: 1200 }) },
        withAnims(text('1 · La luz del Sol atraviesa la atmósfera', 290, 220, 420, 40, { fontSize: 22, color: INK }), A('fade-in', { start: 'withPrev' })),
        { ...ink([[560, 575], [650, 470], [700, 430]], RED, 6), animation: A('draw', { duration: 900 }) },
        withAnims(text('2 · La Tierra se calienta y emite infrarrojo', 640, 370, 520, 40, { fontSize: 22, color: INK }), A('fade-in', { start: 'withPrev' })),
        { ...ink([[700, 430], [760, 480], [820, 575]], RED, 6), animation: A('draw', { duration: 900 }) },
        withAnims(text('3 · Parte vuelve: más calor', 840, 505, 360, 40, { fontSize: 22, color: RED }), A('fade-in', { start: 'withPrev' }))],
        notes: 'Tres clics: cada flecha se dibuja (efecto «Dibujar» sobre un trazo) con su explicación. Cuantos más gases, más energía vuelve hacia abajo.' },
      { title: '¿De dónde salen las emisiones?', layout: 'titleOnly', extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 430, chartType: 'treemap', color: GREEN,
          data: [{ label: 'Energía', value: 34 }, { label: 'Industria', value: 24 }, { label: 'Agricultura y suelo', value: 22 }, { label: 'Transporte', value: 15 }, { label: 'Edificios', value: 6 }] }),
        text('Emisiones mundiales de gases de efecto invernadero por sector, en % (aprox.). Energía: electricidad y calor', 90, 615, 1100, 40, { fontSize: 20, color: GREY })],
        notes: 'Gráfico de rectángulos (treemap): el área es proporcional al porcentaje.' },
      { layout: 'blank', bg: '#0d1b2a', transition: 'zoom', extra: [glow(-200, -100, 900, '#0277bd', '#0d1b2a', 40),
        nasa('orbiting-carbon-observatory-oco-2', 60, 110, 560, 500, { caption: '', autoRotate: false, view: 'top', motion: 'orbit', edge: 'free' }),
        kicker('MEDIR DESDE EL ESPACIO', 680, 160, 520, '#66bb6a'),
        text('Un satélite que «huele» el CO₂', 680, 200, 520, 140, { fontFamily: H, fontSize: 48, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }),
        text(ul('Mide cómo la luz del Sol atraviesa la atmósfera', 'Da la vuelta a la Tierra cada 99 minutos', 'Ve qué zonas emiten y cuáles absorben'), 680, 360, 520, 260, { fontSize: 26, color: '#e3eef7' }),
        text('Modelo 3D: NASA 3D Resources', 680, 640, 520, 30, { fontSize: 16, color: '#7f93a8' })],
        notes: 'Satélite 3D de la NASA visto desde arriba, con una vuelta completa al entrar y sin corte en los bordes.' },
      { title: 'Un círculo vicioso', layout: 'titleOnly', extra: [dg('cycle', 'Más calor\nSe funde el hielo\nEl suelo oscuro refleja menos\nSe absorbe más energía', 190, 170, 900, 480, { colors: 'colorful', oneByOne: true })],
        notes: 'Ciclo uno a uno: la retroalimentación del albedo. El hielo blanco refleja la luz; el mar y la tierra oscuros la absorben.' },
      { title: 'Lo que está en tu mano', layout: 'titleOnly', extra: [
        dg('target', 'Movilidad\nEnergía en casa\nAlimentación\nConsumo', 90, 170, 620, 470, { colors: 'colorful' }),
        text(ul('Andar, bici o transporte público', 'Apagar, aislar, ajustar el termostato', 'Más verdura, menos desperdicio', 'Reparar antes que comprar'), 750, 210, 440, 400, { fontSize: 26, color: INK })],
        notes: 'Diagrama de diana: de lo que más pesa (centro) a lo que menos. Pedir un ejemplo de cada uno al grupo.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'multi', question: '¿Qué estarías dispuesto a cambiar este año?', options: ['Ir en bici o andando', 'Comer menos carne', 'Comprar menos ropa', 'Bajar la calefacción', 'Volar menos'], fontSize: 32, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Votación de respuesta múltiple: se puede marcar más de una opción.' },
      { layout: 'blank', transition: 'wipe', extra: [...stripes(0, 720),
        text('El futuro aún no está escrito', 90, 280, 1100, 120, { fontFamily: H, fontSize: 72, fontWeight: 800, textAlign: 'center', color: '#ffffff', shadow: true })],
        notes: 'Cierre con las bandas de nuevo: la última franja la decidimos nosotros.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · The brain: a dark lab with neuron glows, a neuron drawn with a signal running along
  // its axon, a walking figure for the cerebellum, a hierarchy, a chart and a label activity.
  sci_brain: { name: 'Neurociencia: el cerebro', cat: 'sci', summary: 'Estilo oscuro con brillos: neurona dibujada con impulso animado, figura 3D que camina, radial, organigrama, barras y etiquetar una imagen', make: () => {
    const BG = '#0c0f14', FG = '#eef1f6', SOFT = '#a7b0bf', PINK = '#ff6fa8', CYAN = '#3bb3c3', AMBER = '#e0873b', H = pairStacks('tech').heading;
    // Some neurons and links for the title: fixed points, so it's the same every time.
    const N = [[720, 140], [860, 90], [990, 180], [1130, 120], [800, 300], [950, 340], [1100, 290], [700, 450], [880, 500], [1040, 470], [1180, 430], [980, 620], [780, 620]];
    const E = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [2, 5], [5, 6], [3, 6], [4, 7], [7, 8], [5, 8], [8, 9], [6, 9], [9, 10], [9, 11], [8, 12], [11, 12], [6, 10]];
    const brainImg = svgURL(800, 500, '<rect x="470" y="370" width="54" height="120" rx="20" fill="#8a94a6"/>'
      + '<ellipse cx="600" cy="400" rx="105" ry="62" fill="#8e6cc9"/><ellipse cx="290" cy="235" rx="200" ry="160" fill="#3f8fd6"/>'
      + '<ellipse cx="510" cy="175" rx="180" ry="125" fill="#e0873b"/><ellipse cx="660" cy="275" rx="115" ry="115" fill="#4caf7d"/>'
      + '<ellipse cx="440" cy="335" rx="200" ry="82" fill="#c94f4f"/>', '#0c0f14');
    // The neuron: soma at (300, 380), axon to the right with myelin, terminals at the end.
    const AX = [[360, 380], [560, 360], [760, 400], [960, 380], [1060, 380]];
    return numbered(build({ name: 'Neurociencia: el cerebro', palette: 'revela', fonts: 'tech', title: { size: 48, color: FG },
      decor: () => [shape('rect', 0, 714, 1280, 6, PINK, { fill2: CYAN, gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [glow(600, -100, 800, '#8e6cc9', BG, 30),
        ...E.map(([a, b]) => line(...N[a], ...N[b], '#3bb3c355', 2)),
        ...N.map(([x, y], i) => withAnims(sphere(x, y, 10 + (i % 3) * 4, i % 2 ? PINK : CYAN, BG), A('fade-in', { start: 'afterPrev', delay: 60, duration: 250 }))),
        kicker('NEUROCIENCIA PARA CURIOSOS', 90, 200, 560, PINK),
        text('El cerebro', 84, 240, 620, 160, { fontFamily: H, fontSize: 120, fontWeight: 700, wordart: 'purple', lineHeight: 1 }),
        text('Cómo 1,4 kg de tejido piensan, recuerdan y deciden', 90, 420, 560, 100, { fontSize: 30, color: SOFT })],
        notes: 'Las neuronas del fondo se encienden solas una tras otra al llegar. Título con Text Art «Morado».' },
      { title: 'En cifras', layout: 'titleOnly', bg: BG, extra: [
        ...[['86.000', 'millones de neuronas', PINK], ['1,4 kg', 'el 2 % del peso del cuerpo', CYAN], ['20 %', 'de la energía que gastamos', AMBER]].map(([n, l, c], i) =>
          anim(text(`<div style="font-family:${H};font-size:84px;font-weight:700;color:${c};line-height:1.1">${n}</div><div>${l}</div>`, 70 + i * 390, 260, 360, 220, { fontSize: 28, textAlign: 'center', color: FG }), i + 1, 'zoom-in')),
        text('Cifras redondeadas de un adulto medio.', 90, 560, 1100, 40, { fontSize: 20, textAlign: 'center', color: SOFT })],
        notes: 'Tres cifras que aparecen con un clic cada una (efecto «Acercar»).' },
      { title: 'Un órgano, muchas tareas', layout: 'titleOnly', bg: BG, extra: [dg('radial', 'Encéfalo\n  Lóbulo frontal: planificar\n  Lóbulo parietal: tacto\n  Lóbulo temporal: oído\n  Lóbulo occipital: vista\n  Cerebelo: equilibrio\n  Tronco: respirar', 190, 165, 900, 490, { colors: 'colorful', oneByOne: true })],
        notes: 'Diagrama radial uno a uno. Ninguna zona trabaja sola: casi todo es trabajo en red.' },
      { title: 'La neurona', layout: 'titleOnly', bg: BG, extra: [
        ...[[-0.9, 1], [-2.2, 0.8], [2.3, 0.9], [1.6, 1], [-1.5, 0.7], [3.0, 0.8]].map(([a, k]) => { const x2 = 300 + 140 * k * Math.cos(a), y2 = 380 + 140 * k * Math.sin(a);
          return ink([[300, 380], [300 + 80 * k * Math.cos(a + 0.2), 380 + 80 * k * Math.sin(a + 0.2)], [x2, y2]], CYAN, 5); }),
        ink(AX, '#c9d3e0', 6),
        ...[0, 1, 2, 3].map(i => shape('rounded', 420 + i * 150, 362 + (i % 2 ? 6 : -6), 110, 34, '#f4d58d', { radius: 17, opacity: 90 })),
        ...[[-0.6], [0], [0.6]].map(([a]) => ink([[1060, 380], [1060 + 70 * Math.cos(a), 380 + 70 * Math.sin(a)]], CYAN, 5)),
        ...[-0.6, 0, 0.6].map(a => sphere(1060 + 76 * Math.cos(a), 380 + 76 * Math.sin(a), 10, PINK, BG)),
        sphere(300, 380, 60, '#ff9cc4', '#8a1f4f'), sphere(300, 380, 20, '#3b0f24', '#3b0f24'),
        ...[['Dendritas: reciben', 120, 200, CYAN], ['Soma: integra', 330, 450, PINK], ['Axón con mielina: conduce', 470, 290, '#f4d58d'], ['Terminales: transmiten', 960, 480, CYAN]].map(([t, x, y, c], i) =>
          anim(text(t, x, y, 300, 40, { fontSize: 22, color: c }), i + 1, 'fade-in')),
        withAnims(shape('ellipse', 350, 370, 20, 20, '#ffffff', { fill2: AMBER, gradType: 'radial' }), path(rel(AX), { duration: 1600, start: 'click', ease: 'linear', sound: 'pop' }))],
        notes: 'Neurona dibujada con trazos y formas. Cuatro clics para las partes; el último lanza el impulso nervioso por el axón (trayectoria con sonido).' },
      { title: 'El sistema nervioso', layout: 'titleOnly', bg: BG, transition: 'concave', extra: [dg('hierarchy', 'Sistema nervioso\n  Central\n    Encéfalo\n    Médula espinal\n  Periférico\n    Somático\n    Autónomo', 90, 180, 1100, 460, { colors: 'accent', oneByOne: true })],
        notes: 'Organigrama uno a uno. El autónomo controla lo que no decidimos: latido, digestión, sudor.' },
      { title: 'Andar sin pensar', layout: 'titleOnly', bg: BG, extra: [
        withAnims(model('kh-CesiumMan', 60, 290, 300, 300, { clip: '*', view: 'side', bleed: 1.3 }), path([[600, 0]], { duration: 6000, ease: 'linear' })),
        line(60, 592, 1220, 592, '#3a4250', 3),
        text('El <b style="color:#ff6fa8">cerebelo</b> coordina cada paso: corrige el equilibrio decenas de veces por segundo sin que lo notemos.', 440, 170, 760, 130, { fontSize: 28, color: FG }),
        dg('chevrons', 'Sentir\nCalcular\nCorregir', 440, 310, 760, 110, { colors: 'colorful' })],
        notes: 'Figura 3D animada que camina en bucle; con un clic recorre la diapositiva (trayectoria recta).' },
      { title: '¿Qué rápido va un impulso?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 680, h: 450, chartType: 'hbar', color: CYAN, dataLabels: true,
          data: [{ label: 'Motoras', value: 120 }, { label: 'Tacto', value: 60 }, { label: 'Dolor agudo', value: 20 }, { label: 'Dolor sordo', value: 1 }] }),
        text('metros por segundo, valores aproximados', 90, 625, 700, 30, { fontSize: 18, color: SOFT }),
        mathBlock({ x: 850, y: 210, w: 350, h: 110, fontSize: 36, color: PINK, latex: 't = \\frac{1{,}8\\ \\text{m}}{60\\ \\text{m/s}} = 30\\ \\text{ms}' }),
        text('Lo que tarda el tacto en llegar del pie al cerebro.', 850, 350, 350, 120, { fontSize: 24, color: FG })],
        notes: 'Barras horizontales con etiquetas y un cálculo sencillo en KaTeX.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', question: 'Pon nombre a cada parte del encéfalo', fontSize: 30, x: 60, y: 40, w: 1160, h: 640, image: brainImg,
        options: ['Lóbulo frontal', 'Lóbulo parietal', 'Lóbulo temporal', 'Lóbulo occipital', 'Cerebelo'],
        points: [{ x: 28, y: 42 }, { x: 64, y: 30 }, { x: 52, y: 68 }, { x: 84, y: 54 }, { x: 76, y: 82 }] })],
        notes: 'Actividad «Etiquetar una imagen»: cada estudiante arrastra los nombres a los puntos desde el móvil. El dibujo es un SVG hecho con elipses.' },
      { layout: 'blank', bg: BG, transition: 'diamond', extra: [glow(340, 0, 600, '#8e6cc9', BG, 35),
        text('Tu cerebro acaba de cambiar', 90, 240, 1100, 120, { fontFamily: H, fontSize: 72, fontWeight: 700, textAlign: 'center', wordart: 'purple' }),
        text('Cada cosa que aprendes refuerza unas conexiones y debilita otras: plasticidad', 140, 390, 1000, 90, { fontSize: 28, textAlign: 'center', color: SOFT })],
        notes: 'Transición «Diamante». Cerrar con la idea de plasticidad: aprender es cambiar el cerebro.' },
    ]));
  } },
};
