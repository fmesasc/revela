// Example presentations: Eventos y vida personal. Each one: { name, summary, cat: 'life', make() } → a deck
// (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file -------------------------------------------------------------
const svgURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const img = (src, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, fit: 'cover', ...props });
// The same animation on a group of objects: the first one starts it (click / after the previous), the rest go with it.
const together = (blocks, effect = 'fade-up', start = 'click', props = {}) =>
  blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'withPrev' : start })));
const keep = (b, id) => ({ ...b, id });                    // (the same id on two slides: Transform moves it)
// Pie and doughnut charts draw their slices in these colours, without labels: a legend beside them.
const PIE = ['#3f6497', '#c0392b', '#2b7a3b', '#d68910', '#7d3c98', '#16a085'];
const pieData = pairs => pairs.map(([label, value], i) => ({ label, value, color: PIE[i % PIE.length] }));   // (the slices in the legend's colours)
const legend = (labels, x, y, w, color, fontSize = 22) => labels.flatMap((l, i) => [shape('rounded', x, y + i * (fontSize + 18) + 4, fontSize, fontSize, PIE[i % PIE.length], { radius: 5 }),
  text(l, x + fontSize + 12, y + i * (fontSize + 18) - 4, w - fontSize - 12, fontSize + 16, { fontSize, color, vAlign: 'middle' })]);
// numbered(), and on section slides the shapes (glows, decorations) under the title and subtitle.
const finish = deck => { for (const sl of deck.slides) if (sl.layoutId === 'section') sl.blocks.sort((a, b) => (b.type === 'shape') - (a.type === 'shape'));
  return numbered(deck); };
const credit3d = id => `Modelo 3D: ${lib3d(id).credit}`;
// A child of a rotated group (a photo inside a polaroid…): where its box goes so it turns with the parent.
const turned = (pcx, pcy, deg, dx, dy, w, h) => { const a = deg * Math.PI / 180;
  return [Math.round(pcx + dx * Math.cos(a) - dy * Math.sin(a) - w / 2), Math.round(pcy + dx * Math.sin(a) + dy * Math.cos(a) - h / 2), w, h]; };

export default {
  // ---------------------------------------------------------------------------------
  // 1 · A wedding invitation: classic type, gold, the couple's story, the day's plan,
  // a map with the route drawn, RSVP from the phone and a countdown for the toast.
  life_wedding: { name: 'Invitación de boda', cat: 'life',
    summary: 'Tipografía clásica y oro: Text Art, texto curvo, cronología de la pareja, mapa con recorrido animado, votación y cuenta atrás',
    make: () => {
      const BG = '#fbf7ef', INK = '#3b3228', GOLD = '#b8964f', SOFT = '#f3ead6', ROSE = '#c98b7f';
      const head = pairStacks('classic').heading;
      const map = svgURL('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="450" viewBox="0 0 640 450">'
        + '<rect width="640" height="450" fill="#efe6d2"/>'
        + '<path d="M0 310 Q160 270 320 310 T640 290 V450 H0Z" fill="#e2e4c8"/><path d="M0 0 H640 V70 Q480 110 320 60 T0 90Z" fill="#e8dfc6"/>'
        + '<path d="M-10 150 C150 190 260 90 400 140 S560 230 650 180" stroke="#a9cbe0" stroke-width="20" fill="none"/>'
        + '<path d="M0 240 L640 210 M330 0 L300 450 M470 450 L600 0" stroke="#fffaf0" stroke-width="7" fill="none" opacity=".9"/>'
        + '<polyline points="60,380 200,320 300,250 420,200 560,90" fill="none" stroke="#c9b48a" stroke-width="20" stroke-linejoin="round" stroke-linecap="round"/>'
        + '<polyline points="60,380 200,320 300,250 420,200 560,90" fill="none" stroke="#ffffff" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>'
        + [[110, 120], [150, 90], [520, 300], [560, 330], [600, 290], [240, 400], [380, 380], [90, 230], [480, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#9aa77a" opacity=".8"/>`).join('')
        + '<circle cx="60" cy="380" r="14" fill="#3b3228"/><circle cx="60" cy="380" r="6" fill="#fff"/>'
        + '<circle cx="560" cy="90" r="30" fill="none" stroke="#b8964f" stroke-width="4" stroke-dasharray="6 6"/>'
        + '<text x="88" y="420" font-family="Georgia,serif" font-size="22" fill="#3b3228">Toledo · estación</text>'
        + '<text x="420" y="45" font-family="Georgia,serif" font-size="22" font-style="italic" fill="#3b3228">Finca El Olivar</text>'
        + '<text x="250" y="140" font-family="Georgia,serif" font-size="17" fill="#5f87a3" font-style="italic">río Tajo</text>'
        + '<text x="330" y="292" font-family="sans-serif" font-size="15" fill="#8b7a5a">CM-4000 · 18 min</text></svg>');
      const plan = [['12:30', 'Ceremonia bajo los olivos', 'heart'], ['13:30', 'Cóctel en el jardín', 'star'], ['15:00', 'Banquete en el patio', 'home'], ['18:30', 'Primer baile y fiesta', 'bolt'], ['23:30', 'Resopón y despedida', 'clock']];
      return finish(build({ name: 'Elena & Tomás · Nos casamos', palette: 'paper', fonts: 'classic', title: { size: 50, color: INK, bold: false },
        body: { color: INK },
        decor: () => [shape('rect', 28, 28, 1224, 664, 'none', { stroke: GOLD, strokeWidth: 2 }), shape('rect', 40, 40, 1200, 640, 'none', { stroke: GOLD, strokeWidth: 1, opacity: 55 })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          glow(-260, -260, 700, '#f2d9cf', BG, 70), glow(860, 360, 640, '#efe2bf', BG, 80),
          text('NOS CASAMOS', 390, 92, 500, 150, { fontSize: 30, curve: 28, color: GOLD }),
          withAnims(text('Elena &amp; Tomás', 140, 210, 1000, 190, { fontFamily: head, fontSize: 124, wordart: 'gold', textAlign: 'center' }), A('zoom-in', { duration: 1200, start: 'afterPrev' })),
          shape('line', 440, 430, 170, 4, 'none', { stroke: GOLD, strokeWidth: 2 }), shape('heart', 622, 418, 36, 32, ROSE), shape('line', 670, 430, 170, 4, 'none', { stroke: GOLD, strokeWidth: 2 }),
          withAnims(text('Sábado, 12 de junio de 2027', 140, 462, 1000, 60, { fontSize: 38, fontStyle: 'italic', textAlign: 'center', color: INK }), A('fade-up', { start: 'afterPrev' })),
          withAnims(text('FINCA EL OLIVAR · TOLEDO', 140, 532, 1000, 44, { fontSize: 24, letterSpacing: 6, textAlign: 'center', color: '#8b6f47' }), A('fade-up', { start: 'withPrev' }))],
        notes: 'Portada con Text Art «Oro» y texto curvo encima. Los nombres y la fecha aparecen solos, uno tras otro (después de la anterior). Nombres y lugar son inventados: cámbialos por los vuestros.' },
        { title: 'Nuestra historia', layout: 'titleOnly', bg: BG, extra: [
          dg('timeline', '2016\n  Nos conocimos en la facultad\n2019\n  Primer viaje: Lisboa en tren\n2022\n  Nuestra primera casa\n2025\n  La pedida, al atardecer\n2027\n  ¡Sí, quiero!', 90, 180, 1100, 440, { oneByOne: true, colors: 'accent' }),
          shape('heart', 1130, 76, 50, 44, ROSE, { sketch: true, stroke: INK, strokeWidth: 2 })],
          notes: 'Cronología uno a uno: cada hito aparece con un clic. Es buen momento para contar una anécdota breve de cada año.' },
        { title: 'El gran día', layout: 'titleOnly', bg: BG, extra: [
          shape('rect', 141, 215, 2, 370, GOLD, { opacity: 60 }),
          ...plan.flatMap(([h, what, ic], i) => { const y = 190 + i * 92;
            return together([shape('ellipse', 110, y, 64, 64, SOFT, { stroke: GOLD, strokeWidth: 2 }), icon(ic, 128, y + 18, 28, GOLD),
              text(`<b>${h}</b>`, 200, y + 6, 110, 52, { fontSize: 30, vAlign: 'middle', color: GOLD }), text(what, 310, y + 6, 450, 52, { fontSize: 30, vAlign: 'middle', color: INK })], 'fade-right', i ? 'afterPrev' : 'click', { duration: 500 }); }),
          card('<div style="font-size:24px;letter-spacing:4px;color:#8b6f47">AL AIRE LIBRE</div><div style="font-size:34px;margin:10px 0 14px"><b>Bajo los olivos</b></div>La ceremonia será en el jardín. Habrá sombra, abanicos y limonada fresca para todos.',
            800, 230, 380, 330, SOFT, { fontSize: 26, color: INK, borderColor: GOLD, borderDash: 'dash', vAlign: 'middle' })],
          notes: 'Clic: el programa aparece hora a hora, cada fila después de la anterior. La tarjeta de la derecha tiene un borde discontinuo dorado.' },
        { title: 'Cómo llegar', layout: 'titleOnly', bg: BG, extra: [
          img(map, 90, 180, 640, 450, { alt: 'Mapa de la estación de Toledo a la Finca El Olivar', radius: 16 }),
          withAnims(shape('heart', 130, 543, 40, 36, ROSE, { stroke: '#ffffff', strokeWidth: 2 }), path([[140, -60], [240, -130], [360, -180], [500, -290]], { duration: 3200, sound: 'chime' })),
          text(ul('<b>En coche:</b> CM-4000 dirección Puebla, km 12. Aparcamiento en la finca.', '<b>En autobús:</b> sale a las 11:45 de la estación y vuelve a la 01:00.', '<b>Dónde dormir:</b> 20 habitaciones reservadas en el pueblo; pedid el código «Olivar».'), 770, 190, 420, 450, { fontSize: 25, color: INK })],
          notes: 'Clic: el corazón recorre el camino desde la estación hasta la finca (trayectoria dibujada) con una campanilla. El mapa es un dibujo SVG hecho a medida.' },
        { title: 'Detalles para invitados', layout: 'titleOnly', bg: BG, extra: [
          ...[['user', 'Vestimenta', 'Formal de verano. Mejor tacón ancho: ¡hay césped!'], ['star', 'Peques', 'Mesa propia con monitores, talleres y cine.'], ['heart', 'Regalos', 'Lo mejor es que vengáis. Habrá una urna para el viaje.']].map(([ic, h, d], i) =>
            anim(card(`<div style="font-size:34px;margin-top:84px"><b>${h}</b></div><div style="font-size:26px;margin-top:10px">${d}</div>`, 90 + i * 380, 210, 340, 360, '#ffffff', { color: INK, textAlign: 'center', borderColor: '#e4d6b8' }), i + 1, 'zoom-in')),
          ...[0, 1, 2].map(i => icon(['user', 'star', 'heart'][i], 228 + i * 380, 242, 64, GOLD))],
          notes: 'Tres tarjetas que entran con un clic cada una. Los iconos están en Insertar ▸ Iconos.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 34, question: '¿Nos acompañarás el 12 de junio?', options: ['¡Sí, allí estaré!', 'Iré con acompañante', 'Lo siento, no podré ir'], x: 90, y: 70, w: 1100, h: 580 })],
          notes: 'Confirmación en directo: cada invitado escanea el QR con el móvil y responde. El resultado se puede descargar en CSV.' },
        { layout: 'blank', bg: BG, extra: [
          text('¡Que empiece la cuenta atrás!', 100, 150, 620, 170, { fontFamily: head, fontSize: 58, color: INK }),
          text('Faltan <b>254 días</b> para el gran día. Hoy brindamos por el anuncio: levantad las copas cuando el reloj llegue a cero.', 100, 340, 600, 200, { fontSize: 30, color: INK }),
          timer(20, 790, 170, 380, { color: GOLD, endText: '¡Salud!' })],
          notes: 'La cuenta atrás (Insertar ▸ Cuenta atrás) empieza sola al llegar a la diapositiva y suena al terminar.' },
        { layout: 'section', bg: BG, title: '¡Os esperamos!', subtitle: 'Confirmad antes del 1 de mayo · elenaytomas.example', transition: 'zoom', extra: [
          ...[[200, 150, 70], [1010, 170, 56], [1060, 520, 80], [170, 520, 50]].map(([x, y, s], i) =>
            withAnims(shape('heart', x, y, s, s * 0.9, i % 2 ? GOLD : ROSE, { sketch: true, stroke: INK, strokeWidth: 2 }), A('bounce', { start: i ? 'withPrev' : 'afterPrev', delay: i * 200 })))],
          notes: 'Cierre con transición «Zoom»: los corazones dibujados a mano rebotan al llegar.' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 2 · A children's birthday party: bright colours, 3D characters that dance and
  // cheer, sketched balloons, a quiz from the phones and a countdown for the games.
  life_kids_party: { name: 'Cumpleaños infantil', cat: 'life',
    summary: 'Colores vivos: robot 3D que baila, personajes que celebran, globos a mano alzada, concurso con puntos y cuenta atrás',
    make: () => {
      const INK = '#23324d', SKY = '#d9f1ff', CREAM = '#fff4d6', RED = '#ff5a5f', YEL = '#ffc93c', BLUE = '#3fa7f5', GREEN = '#3cbf7f', PURPLE = '#9b5de5';
      const fr = pairStacks('friendly').heading, robot = lib3d('three-RobotExpressive');
      const balloon = (x, y, c, s = 1) => [shape('rect', x + 44 * s, y + 116 * s, 2, 130 * s, INK),
        shape('triangle', x + 37 * s, y + 104 * s, 16 * s, 14 * s, c), shape('ellipse', x, y, 90 * s, 112 * s, c, { sketch: true, stroke: INK, strokeWidth: 3 })];
      const q = (question, options, correct) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 42, x: 70, y: 60, w: 1140, h: 600 });
      return finish(build({ name: '¡Leo cumple 7!', palette: 'office', fonts: 'friendly', title: { size: 56, color: INK }, body: { color: INK },
        decor: () => [RED, YEL, BLUE, GREEN, PURPLE, RED, YEL, BLUE, GREEN, PURPLE, RED, YEL].map((c, i) => shape(i % 3 ? 'ellipse' : 'star', 30 + i * 106, i % 2 ? 16 : 24, 18, 18, c)) }, [
        { layout: 'blank', bg: SKY, transition: 'zoom', extra: [
          ...balloon(60, 380, RED), ...balloon(150, 430, YEL, 0.8), ...balloon(1150, 60, GREEN, 0.7),
          shape('burst', 790, 150, 430, 430, YEL, { sketch: true, stroke: INK, strokeWidth: 3, rotation: 8 }),
          text('<b>¡LEO CUMPLE 7!</b>', 180, 60, 640, 240, { fontFamily: fr, fontSize: 80, curve: 26, color: RED }),
          withAnims(text('Fiesta de aventureros', 130, 290, 740, 100, { fontFamily: fr, fontSize: 50, wordart: 'retro', textAlign: 'center' }), A('zoom-in', { start: 'afterPrev', sound: 'pop' })),
          text('Sábado 17 de octubre · 17:00', 230, 410, 540, 54, { fontSize: 32, textAlign: 'center', color: INK, bg: '#ffffff', radius: 27 }),
          model('three-RobotExpressive', 830, 170, 360, 450, { clip: 'Dance' })],
          notes: 'Título con texto curvo y Text Art «Retro». El robot 3D baila sin parar (Modelo 3D ▸ Animación ▸ En reposo: Dance). Los globos son formas a mano alzada.' },
        { title: '¿Cuándo, dónde y qué traer?', layout: 'titleOnly', bg: CREAM, extra: [
          ...[['clock', RED, '#ffe0e1', 'Cuándo', 'Sábado 17 de octubre<br>de 17:00 a 20:00'], ['location', BLUE, '#dcefff', 'Dónde', 'Ludoteca La Colmena<br>calle del Tren, 12'], ['star', GREEN, '#dcf7e9', 'Qué traer', 'Un disfraz de aventurero y ganas de jugar']]
            .flatMap(([ic, c, f, h, d], i) => together([shape('rounded', 90 + i * 380, 190, 340, 430, f, { sketch: true, stroke: INK, strokeWidth: 3 }), icon(ic, 220 + i * 380, 225, 80, c),
              text(`<div style="font-size:38px;font-weight:800;color:${c}">${h}</div><div style="margin-top:8px">${d}</div>`, 115 + i * 380, 330, 290, 250, { fontSize: 30, textAlign: 'center', color: INK })], 'bounce', 'click', { sound: 'pop' }))],
          notes: 'Cada tarjeta entra rebotando con un «pop» al hacer clic (Panel de animación ▸ Sonido).' },
        { title: 'Invitados especiales', layout: 'titleOnly', bg: SKY, extra: [
          ...[['kk-Knight', 'Sir Leo el Valiente', RED], ['kk-Mage', 'Lúa la Maga', PURPLE], ['kk-Barbarian', 'Bruno el Fuerte', GREEN]].flatMap(([id, n, c], i) => [
            shape('ellipse', 160 + i * 380, 470, 200, 44, '#9fd3f2'),
            model(id, 110 + i * 380, 170, 300, 400, { clip: 'Cheer', clipSpeed: [1, 0.8, 1.2][i], view: 'front' }),
            text(n, 90 + i * 380, 590, 340, 50, { fontSize: 30, fontWeight: 800, textAlign: 'center', color: c })])],
          notes: 'Tres personajes 3D celebrando, cada uno a su velocidad (Modelo 3D ▸ Movimiento 3D ▸ Velocidad). ¡Ven disfrazado de uno de ellos!' },
        { title: 'El plan de la tarde', layout: 'titleOnly', bg: CREAM, extra: [
          dg('steps', '17:00\n  Búsqueda del tesoro\n17:45\n  Merienda\n18:30\n  ¡Tarta y velas!\n19:00\n  Piñata\n19:30\n  Baile loco', 90, 180, 1100, 470, { colors: 'colorful', oneByOne: true, fontScale: 1.4 })],
          notes: 'Diagrama «Escalera» que aparece peldaño a peldaño.' },
        { layout: 'blank', bg: SKY, extra: [q('¿Cuántas velas soplará Leo?', ['5', '6', '7', '8'], 2)],
          notes: 'Concurso desde el móvil: puntos por acertar y por rapidez. Los mayores pueden ayudar a los peques a votar.' },
        { layout: 'blank', bg: CREAM, extra: [q('¿Cuál es el animal favorito de Leo?', ['El dinosaurio', 'El pulpo', 'El zorro', 'El delfín'], 2)],
          notes: 'La respuesta aparece en la diapositiva siguiente, con el zorro en 3D.' },
        { layout: 'blank', bg: SKY, transition: 'zoom', extra: [
          text('¡El zorro!', 90, 90, 500, 140, { fontFamily: fr, fontSize: 96, wordart: 'fire' }),
          text('Leo dice que es «el más listo del bosque». ¿Quién lo ha acertado?', 90, 250, 480, 160, { fontSize: 32, color: INK }),
          model('kh-Fox', 560, 110, 640, 520, { view: 'three', motion: 'orbit' })],
          notes: 'El zorro da una vuelta completa al llegar (Modelo 3D ▸ Vista ▸ Al entrar: vuelta completa). Su crédito CC BY aparece debajo.' },
        { title: '¡Baile de las estatuas!', layout: 'titleOnly', bg: CREAM, extra: [
          withAnims(model('three-RobotExpressive', 90, 300, 260, 340, { walk: { clip: robot.walk, face: true, look: true } }),
            path([[260, -20], [480, 0]], { duration: 2400 }),
            A('clip3d', { clip: 'Dance', start: 'afterPrev', duration: 4000 }),
            A('clip3d', { clip: 'Wave', once: true, start: 'click', duration: 2000 })),
          text(ul('Cuando suena la música, ¡a bailar!', 'Cuando para, ¡estatua!', 'Quien se mueva, ayuda al robot'), 760, 190, 440, 280, { fontSize: 30, color: INK }),
          timer(30, 790, 500, 380, { style: 'bar', h: 120, color: RED, endText: '¡Estatuas!' })],
          notes: 'Clic: el robot entra andando y baila; otro clic, saluda. La barra de abajo es una cuenta atrás de 30 segundos.' },
        { layout: 'blank', bg: SKY, extra: [
          ...[[110, 90, YEL], [1000, 110, GREEN], [190, 460, RED], [980, 450, PURPLE]].map(([x, y, c], i) =>
            withAnims(shape('star', x, y, 150, 150, c, { sketch: true, stroke: INK, strokeWidth: 4 }), A('bounce', { start: i ? 'withPrev' : 'afterPrev', delay: i * 150, ...(i === 0 && { sound: 'applause' }) }))),
          text('¡Gracias por venir!', 140, 250, 1000, 150, { fontFamily: fr, fontSize: 84, wordart: 'gold', textAlign: 'center' }),
          text('Leo y su familia', 340, 410, 600, 60, { fontSize: 36, textAlign: 'center', color: INK })],
          notes: 'Las estrellas rebotan solas al llegar, con aplausos.' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 3 · A visual CV: a portrait with text round it, the career as a timeline,
  // skill bars that fill in turn, a radar of strengths, work in devices, languages.
  life_cv: { name: 'Currículum visual', cat: 'life',
    summary: 'Texto en círculo, cifras, cronología uno a uno, barras de habilidades animadas, radar, pantallas en dispositivos y contacto',
    make: () => {
      const BG = '#0f2940', FG = '#f2f6fa', MINT = '#50e3c2', SUN = '#f5a623', SKYB = '#7fb8e6', MUTE = '#a9c1d9', head = pairStacks('clean').heading;
      const skills = [['Investigación con usuarios', 95, MINT], ['Prototipado y diseño visual', 90, SKYB], ['Análisis de datos (SQL, Python)', 75, SUN], ['Facilitación de talleres', 85, '#b8e986'], ['Accesibilidad web', 80, '#9b6cf0']];
      return finish(build({ name: 'Marina Solís · Currículum', palette: 'ocean', fonts: 'clean', title: { size: 48, color: FG }, body: { color: FG },
        decor: () => [shape('rect', 0, 0, 1280, 6, MINT, { fill2: SKYB, gradAngle: 0 })] }, [
        { layout: 'blank', bg: BG, extra: [
          glow(-200, 120, 760, '#1d4f7a', BG, 80),
          shape('ellipse', 150, 190, 340, 340, MINT, { fill2: '#4a90d9', gradAngle: 135 }),
          text('MS', 150, 270, 340, 180, { fontFamily: head, fontSize: 130, fontWeight: 800, textAlign: 'center', color: '#0f2940' }),
          text('diseño · datos · personas · accesibilidad · ', 100, 140, 440, 440, { fontSize: 24, curve: 100, color: MUTE }),
          text('CURRÍCULUM 2026', 640, 170, 560, 40, { fontSize: 22, letterSpacing: 8, color: MINT }),
          text('Marina Solís', 640, 215, 580, 120, { fontFamily: head, fontSize: 88, fontWeight: 800, color: FG }),
          text('Diseñadora UX y analista de datos', 640, 335, 580, 60, { fontSize: 34, color: SKYB }),
          ...[['mail', 'marina.solis@correo.example'], ['location', 'Valencia · trabajo en remoto'], ['user', 'portfolio.marinasolis.example']].flatMap(([ic, t], i) =>
            [icon(ic, 640, 432 + i * 58, 34, MINT), text(t, 690, 426 + i * 58, 520, 46, { fontSize: 26, color: FG })])],
          notes: 'Retrato sustituido por las iniciales en un círculo con degradado y texto curvo alrededor. Persona y datos inventados: pon los tuyos.' },
        { title: 'Sobre mí', layout: 'titleOnly', bg: BG, extra: [
          text('Convierto lo que la gente hace y dice en productos más fáciles de usar. Me muevo entre la investigación, el diseño y los datos, y me encanta enseñar a otros equipos a hacerlo.', 100, 190, 560, 400, { fontSize: 32, color: FG, lineHeight: 1.4 }),
          ...[['8', 'años de experiencia', MINT], ['40+', 'proyectos entregados', SUN], ['3', 'idiomas', SKYB]].map(([n, l, c], i) =>
            together([shape('rounded', 730, 190 + i * 140, 460, 120, '#ffffff', { opacity: 7, radius: 16 }),
              text(n, 750, 195 + i * 140, 170, 110, { fontFamily: head, fontSize: 72, fontWeight: 800, color: c, vAlign: 'middle', textAlign: 'center' }),
              text(l, 930, 195 + i * 140, 250, 110, { fontSize: 28, color: FG, vAlign: 'middle' })], 'fade-left')).flat()],
          notes: 'Las tres cifras entran desde la derecha con un clic cada una.' },
        { title: 'Trayectoria', layout: 'titleOnly', bg: BG, extra: [
          dg('timeline', '2016\n  Grado en Bellas Artes\n2018\n  Máster en Interacción\n2019\n  Diseñadora en agencia\n2022\n  UX en banca digital\n2025\n  Líder de diseño y datos', 90, 180, 1100, 450, { oneByOne: true, colors: 'colorful' })],
          notes: 'Cronología uno a uno: cuenta en una frase qué aprendiste en cada etapa.' },
        { title: 'Habilidades', layout: 'titleOnly', bg: BG, extra: [
          ...skills.flatMap(([n, v, c], i) => { const y = 190 + i * 88;
            return [text(n, 100, y, 440, 40, { fontSize: 26, color: FG }), text(v + ' %', 470, y, 130, 40, { fontSize: 24, textAlign: 'right', color: c }),
              shape('rounded', 100, y + 46, 500, 16, '#ffffff', { opacity: 15 }),
              withAnims(shape('rounded', 100, y + 46, Math.round(500 * v / 100), 16, c), A('fade-right', { start: i ? 'afterPrev' : 'click', duration: 500 }))]; }),
          chartBlock({ x: 680, y: 170, w: 520, h: 480, chartType: 'radar', color: MINT, yMax: 100,
            data: [{ label: 'Investigar', value: 95 }, { label: 'Diseñar', value: 90 }, { label: 'Datos', value: 75 }, { label: 'Enseñar', value: 85 }, { label: 'Liderar', value: 70 }, { label: 'Escribir', value: 80 }] })],
          notes: 'Las barras se llenan una tras otra con un clic. A la derecha, el mismo perfil en un gráfico de radar (valores de autoevaluación).' },
        { title: 'Proyectos destacados', layout: 'titleOnly', bg: BG, extra: [
          img(appScreen(360, 720, '#1f8a70', 'Mi Salud'), 100, 175, 240, 470, { alt: 'App Mi Salud en un móvil', device: 'phone' }),
          img(appScreen(1280, 800, '#4a90d9', 'Banca · Panel', 3), 400, 210, 520, 330, { alt: 'Panel de banca en un portátil', device: 'laptop' }),
          card('<b style="color:#50e3c2">App de citas médicas</b><br>Tiempo para pedir cita: de 6 a 2 minutos.', 960, 190, 240, 200, '#ffffff12', { fontSize: 22, color: FG, pad: [16, 18, 16, 18] }),
          card('<b style="color:#f5a623">Banca digital</b><br>−35 % de llamadas al servicio de ayuda.', 960, 420, 240, 200, '#ffffff12', { fontSize: 22, color: FG, pad: [16, 18, 16, 18] })],
          notes: 'Imagen ▸ Dispositivo: la misma captura dentro de un móvil o un portátil. Las pantallas son dibujos SVG de ejemplo; las cifras, inventadas.' },
        { title: 'Idiomas y herramientas', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 100, y: 190, w: 500, h: 224, fontSize: 26, header: true, headBg: MINT, headFg: '#0f2940', stroke: '#2c4f70', banded: true, band: SKYB,
            rows: [['Idioma', 'Nivel'], ['Español', 'Nativo'], ['Inglés', 'C1'], ['Francés', 'B2']], colW: [3, 2] }),
          text('Certificados oficiales; inglés en el trabajo diario desde 2020.', 100, 440, 500, 90, { fontSize: 22, color: MUTE }),
          ...['Figma', 'Python', 'SQL', 'Miro', 'HTML y CSS', 'Revela', 'Tableau', 'Notion'].map((t, i) =>
            anim(text(t, 680 + (i % 2) * 260, 190 + Math.floor(i / 2) * 100, 230, 70, { fontSize: 28, textAlign: 'center', vAlign: 'middle', color: FG, bg: ['#4a90d922', '#50e3c222', '#f5a62322', '#9b6cf022'][i % 4], borderColor: [SKYB, MINT, SUN, '#9b6cf0'][i % 4], radius: 35 }), 1, 'zoom-in'))],
          notes: 'Tabla con filas en bandas; las herramientas son cuadros de texto con borde redondeado («píldoras») que entran todas juntas.' },
        { layout: 'section', bg: BG, title: 'Hablemos', subtitle: 'marina.solis@correo.example · Disponible desde enero', transition: 'convex', extra: [
          glow(340, 30, 600, '#1d4f7a', BG, 90), shape('donut', 1060, 520, 150, 150, MINT, { opacity: 25 }), shape('donut', 70, 60, 140, 140, SUN, { opacity: 25 }),
          withAnims(icon('mail', 610, 540, 60, MINT), A('bounce', { start: 'afterPrev' }))],
          notes: 'Cierre con transición «Convexa». Deja el correo en pantalla durante las preguntas.' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 4 · A trip round Italy: a sun with the cities in a circle, the route with
  // connectors, the itinerary, a budget that works itself out, a matching game.
  life_italy: { name: 'Viaje por Italia', cat: 'life',
    summary: 'Texto en círculo, ruta con conectores y recorrido animado, cronología, presupuesto con fórmulas, gráficos y actividad de emparejar',
    make: () => {
      const BG = '#f6eee0', INK = '#3a2e25', TERRA = '#c65d3b', OLIVE = '#6b7d3a', BLUE = '#2f6690', head = pairStacks('editorial').heading;
      const cities = [['Venecia', 950, 205], ['Florencia', 830, 320], ['Roma', 900, 430], ['Nápoles', 1000, 530], ['Amalfi', 1070, 610]];
      const dots = cities.map(([n, x, y]) => ({ ...shape('ellipse', x - 16, y - 16, 32, 32, TERRA, { stroke: '#ffffff', strokeWidth: 3 }), alt: n }));
      const links = dots.slice(0, -1).map((d, i) => ({ ...base(0, 0, 1280, 720), type: 'connector', from: d.id, to: dots[i + 1].id, color: OLIVE, arrow: true, dash: 'dash', width: 3 }));
      return finish(build({ name: 'Italia en diez días', palette: 'paper', fonts: 'editorial', title: { size: 50, color: TERRA }, body: { color: INK },
        decor: () => [shape('rect', 60, 680, 380, 4, OLIVE), shape('rect', 440, 680, 400, 4, '#e9e1cf'), shape('rect', 840, 680, 380, 4, TERRA)] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          shape('ellipse', 760, 130, 400, 400, TERRA, { fill2: '#e8955f', gradType: 'radial' }),
          text('Roma · Florencia · Venecia · Nápoles · Amalfi · ', 720, 90, 480, 480, { fontSize: 28, curve: 100, color: INK }),
          text('Italia', 90, 180, 640, 220, { fontFamily: head, fontSize: 170, color: INK }),
          text('Diez días de norte a sur, en tren', 96, 410, 620, 60, { fontSize: 36, fontStyle: 'italic', color: TERRA }),
          text('MAYO 2027 · CUATRO AMIGOS · 1.470 € POR PERSONA', 96, 490, 680, 40, { fontSize: 20, letterSpacing: 3, color: OLIVE })],
          notes: 'Texto curvo en círculo alrededor del sol (Cuadro de texto ▸ Efectos de texto ▸ Curvar texto ▸ Círculo). Viaje y cifras inventados como ejemplo.' },
        { title: 'La ruta', layout: 'titleOnly', bg: BG, extra: [
          text(ul('<b>Venecia</b> · 2 noches', '<b>Florencia</b> · 3 noches, con Siena', '<b>Roma</b> · 3 noches', '<b>Nápoles</b> · 1 noche', '<b>Costa Amalfitana</b> · 1 noche'), 100, 190, 560, 340, { fontSize: 30, color: INK }),
          text('Todo en tren: el trayecto más largo, Venecia–Florencia, dura 2 h 15 min.', 100, 540, 560, 90, { fontSize: 24, fontStyle: 'italic', color: OLIVE }),
          ...links, ...dots,
          ...cities.map(([n, x, y], i) => text(n, i % 2 || i === 4 ? x - 196 : x + 26, y - 22, 170, 44, { fontSize: 24, fontWeight: 700, color: INK, textAlign: i % 2 || i === 4 ? 'right' : 'left' })),
          withAnims(shape('rounded', 936, 191, 28, 28, BLUE, { stroke: '#ffffff', strokeWidth: 2 }), path([[-120, 115], [-50, 225], [50, 325], [120, 405]], { duration: 4000 }))],
          notes: 'Las paradas están unidas con conectores discontinuos: si mueves una ciudad, la flecha la sigue. Clic: el tren (el cuadrado azul) recorre la ruta.' },
        { title: 'Itinerario', layout: 'titleOnly', bg: BG, extra: [
          dg('timeline', 'Días 1–2\n  Venecia y Burano\nDías 3–5\n  Florencia y Siena\nDías 6–8\n  Roma y el Vaticano\nDía 9\n  Nápoles\nDía 10\n  Amalfi y Positano', 90, 180, 1100, 450, { oneByOne: true, colors: 'colorful' })],
          notes: 'Diagrama «Cronología» uno a uno.' },
        { title: 'Presupuesto por persona', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 90, y: 180, w: 620, h: 430, fontSize: 24, header: true, headBg: TERRA, headFg: '#ffffff', stroke: '#d8ccb6', banded: true, band: '#cd853f',
            rows: [['Concepto', 'Precio (€)', 'Veces', 'Total (€)'], ['Vuelos ida y vuelta', '180', '1', '=B2*C2'], ['Alojamiento (noche)', '65', '9', '=B3*C3'], ['Trenes', '160', '1', '=B4*C4'],
              ['Comidas (día)', '45', '10', '=B5*C5'], ['Museos y visitas', '95', '1', '=B6*C6'], ['<b>Total</b>', '', '', '=SUMA(ARRIBA)']], colW: [4, 2, 2, 2] }),
          chartBlock({ x: 750, y: 180, w: 260, h: 260, chartType: 'pie', color: TERRA, legend: false,
            data: pieData([['Vuelos', 180], ['Alojamiento', 585], ['Trenes', 160], ['Comidas', 450], ['Museos', 95]]) }),
          ...legend(['Vuelos', 'Alojamiento', 'Trenes', 'Comidas', 'Museos'], 1030, 200, 170, INK),
          text('Dormir y comer se llevan <b>más del 70&nbsp;%</b> del presupuesto.', 750, 480, 440, 110, { fontSize: 26, color: INK, fontStyle: 'italic' })],
          notes: 'Cada fila multiplica precio por veces (=B2*C2) y la última suma la columna (=SUMA(ARRIBA)): cambia un precio y todo se recalcula.' },
        { title: 'Qué comer en cada ciudad', layout: 'titleOnly', bg: BG, extra: [
          ...[['Venecia', 'Cicchetti', 'Tapas en barras de madera junto al canal.'], ['Florencia', 'Bistecca', 'Chuletón a la brasa para compartir.'], ['Roma', 'Cacio e pepe', 'Pasta con queso pecorino y pimienta.'],
            ['Nápoles', 'Pizza', 'Masa blanda y horno de leña.'], ['Amalfi', 'Limoncello', 'Licor de limón para la sobremesa.'], ['Siempre', 'Gelato', 'Uno al día, como mínimo.']].map(([c, d, t], i) =>
            anim(card(`<div style="font-size:20px;letter-spacing:3px;color:${[TERRA, OLIVE, BLUE][i % 3]}">${c.toUpperCase()}</div><div style="font-size:34px;font-family:${head};margin:4px 0 6px">${d}</div><div style="font-size:22px">${t}</div>`,
              90 + (i % 3) * 375, 180 + Math.floor(i / 3) * 240, 350, 215, '#fffaf2', { color: INK, borderColor: '#e2d6c0', pad: [20, 22, 20, 22] }), i + 1, 'fade-up'))],
          notes: 'Seis tarjetas que aparecen con un clic cada una.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada frase con su traducción', x: 80, y: 60, w: 1120, h: 590,
          options: ['Buongiorno = Buenos días', 'Grazie mille = Muchas gracias', 'Il conto, per favore = La cuenta, por favor', 'Quanto costa? = ¿Cuánto cuesta?', 'Dov\'è la stazione? = ¿Dónde está la estación?'] })],
          notes: 'Actividad de emparejar desde el móvil: cada uno une las frases y la corrección es automática.' },
        { title: 'El tiempo en mayo', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 480, chartType: 'bar', color: TERRA, seriesName: 'Máxima (°C)', dataLabels: true,
            data: [{ label: 'Venecia', value: 21 }, { label: 'Florencia', value: 24 }, { label: 'Roma', value: 24 }, { label: 'Nápoles', value: 23 }, { label: 'Amalfi', value: 22 }],
            series: [{ name: 'Mínima (°C)', values: [13, 12, 13, 14, 15], color: BLUE }] }),
          card('<b>En la maleta</b><br>Chaqueta fina, calzado cómodo y algo para cubrir hombros en las iglesias.', 890, 220, 300, 330, '#fffaf2', { fontSize: 26, color: INK, borderColor: '#e2d6c0' })],
          notes: 'Temperaturas medias aproximadas de mayo, solo como orientación.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          shape('ellipse', 440, 140, 400, 400, OLIVE, { fill2: '#9bb35c', gradType: 'radial', opacity: 90 }),
          text('Buon viaggio!', 240, 80, 800, 320, { fontFamily: head, fontSize: 92, curve: 40, color: TERRA }),
          text('¡Arrivederci!', 440, 300, 400, 90, { fontFamily: head, fontSize: 56, textAlign: 'center', color: '#ffffff' }),
          text('Salida: 3 de mayo · Barajas, T4 · 07:40', 240, 580, 800, 50, { fontSize: 28, textAlign: 'center', color: INK })],
          notes: 'Cierre con texto en arco sobre un círculo con degradado radial.' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 5 · A recipe: the 3D avocado that travels between slides (Transform), the
  // ingredients in a table that adds up, the steps in order, a timer to rest.
  life_recipe: { name: 'Receta: guacamole', cat: 'life',
    summary: 'Aguacate 3D que viaja entre diapositivas (Transformar), ingredientes con fórmulas, pasos uno a uno, cuenta atrás y valoración',
    make: () => {
      const BG = '#1f120f', FG = '#fff4ec', GREEN = '#a8c686', LIME = '#d4e157', ORANGE = '#f3a712', RED = '#e4572e', head = pairStacks('bold').heading;
      const avo = uid(), title = uid();
      const avocado = (x, y, w, h, p = {}) => keep(model('kh-Avocado', x, y, w, h, { autoRotate: true, view: 'three', ...p }), avo);
      return finish(build({ name: 'Guacamole de verdad', palette: 'warm', fonts: 'bold', title: { size: 72, color: GREEN, bold: false }, body: { color: FG },
        decor: () => [shape('rect', 0, 700, 1280, 20, GREEN, { fill2: LIME, gradAngle: 0 })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          glow(560, -120, 820, '#3d5a24', BG, 70),
          text('RECETA PARA 4 · 15 MINUTOS', 90, 170, 600, 40, { fontSize: 24, letterSpacing: 6, color: ORANGE }),
          keep(text('GUACAMOLE', 80, 210, 700, 200, { fontFamily: head, fontSize: 190, color: GREEN }), title),
          text('de verdad, machacado a mano', 90, 410, 620, 60, { fontSize: 38, color: FG }),
          ...[['clock', '15 min'], ['user', '4 raciones'], ['star', 'Fácil']].flatMap(([ic, t], i) => [icon(ic, 92 + i * 220, 510, 36, ORANGE), text(t, 136 + i * 220, 504, 170, 48, { fontSize: 26, color: FG })]),
          avocado(700, 110, 520, 520)],
          notes: 'El aguacate es un modelo 3D (GIF y stickers ▸ 3D con movimiento) que gira solo. En la siguiente diapositiva viaja a su sitio con Transformar.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          keep(text('INGREDIENTES', 80, 50, 700, 110, { fontFamily: head, fontSize: 90, color: GREEN }), title),
          tableBlock({ x: 90, y: 180, w: 720, h: 440, fontSize: 25, header: true, headBg: GREEN, headFg: '#1f120f', stroke: '#4a3530', banded: true, band: GREEN, bandAlpha: 0.12,
            rows: [['Ingrediente', 'Cantidad', 'Precio'], ['Aguacates maduros', '3', '2,70 €'], ['Lima', '1', '0,40 €'], ['Cebolla morada', '½', '0,25 €'], ['Tomate', '1', '0,35 €'], ['Cilantro fresco', 'un puñado', '0,90 €'], ['Sal y chile', 'al gusto', '0,10 €'], ['<b>Total</b>', '', '=SUMA(ARRIBA)']], colW: [5, 3, 2] }),
          avocado(860, 200, 340, 340)],
          notes: 'Transformar: el título y el aguacate se mueven solos desde la portada. El total de la tabla es una fórmula (=SUMA(ARRIBA)); precios orientativos.' },
        { title: 'Paso a paso', layout: 'titleOnly', bg: BG, extra: [
          dg('list', 'Cortar\n  Abre los aguacates, quita el hueso y saca la pulpa\nMachacar\n  Con un tenedor: mejor con tropezones que en puré\nPicar\n  Cebolla, tomate sin semillas y cilantro, muy fino\nAliñar\n  Zumo de lima, sal y una pizca de chile\nServir\n  Al momento, con totopos templados', 90, 180, 1100, 480, { oneByOne: true, colors: 'colorful', fontScale: 1.4 })],
          notes: 'Diagrama «Lista vertical» uno a uno: cada paso aparece con un clic; explícalo mientras tanto.' },
        { layout: 'blank', bg: BG, extra: [
          text('EL TRUCO', 90, 120, 520, 120, { fontFamily: head, fontSize: 110, wordart: 'fire' }),
          text('Deja el hueso dentro del cuenco y cubre con film tocando la superficie: así no se oscurece.', 90, 260, 560, 220, { fontSize: 36, color: FG }),
          withAnims(text('Y la lima, siempre al final.', 90, 500, 560, 60, { fontSize: 32, color: LIME, fontStyle: 'italic' }), A('fade-up', { sound: 'pop' })),
          model('kh-Avocado', 700, 120, 480, 480, { view: 'front', motion: 'zoom' })],
          notes: 'El aguacate se acerca al llegar (Modelo 3D ▸ Vista ▸ Al entrar: acercar). Clic: aparece el último consejo con un «pop».' },
        { title: 'Reposo en la nevera', layout: 'titleOnly', bg: BG, extra: [
          text(ul('Tapa el cuenco con el hueso dentro', 'Mientras, calienta los totopos en el horno', 'Corta unos gajos de lima para servir'), 90, 190, 620, 360, { fontSize: 32, color: FG }),
          timer(300, 800, 180, 400, { color: GREEN, endText: '¡A la mesa!' })],
          notes: 'Cuenta atrás de cinco minutos: empieza sola y suena al terminar. Un clic la pausa.' },
        { title: 'Por ración', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 90, y: 200, w: 400, h: 400, chartType: 'doughnut', color: GREEN, legend: false,
            data: pieData([['Grasas (g)', 15], ['Hidratos (g)', 9], ['Fibra (g)', 7], ['Proteínas (g)', 2]]) }),
          ...legend(['Grasas · 15 g', 'Hidratos · 9 g', 'Fibra · 7 g', 'Proteínas · 2 g'], 510, 300, 220, FG, 24),
          ...[['190', 'kcal por ración', GREEN], ['80 %', 'grasas insaturadas', ORANGE], ['0', 'azúcares añadidos', RED]].map(([n, l, c], i) =>
            anim(text(`<span style="font-family:${head};font-size:80px;color:${c}">${n}</span><br>${l}`, 820, 180 + i * 160, 370, 150, { fontSize: 26, color: FG }), i + 1, 'fade-left'))],
          notes: 'Valores aproximados, solo de ejemplo. Las tres cifras entran con un clic cada una.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'rating', fontSize: 36, question: '¿Qué nota le das a este guacamole?', x: 90, y: 70, w: 1100, h: 580 })],
          notes: 'Valoración de 1 a 5 desde el móvil; se ve la media al momento.' },
        { layout: 'section', bg: BG, title: '¡Buen provecho!', subtitle: 'La próxima: pico de gallo y tortillas caseras', transition: 'zoom', extra: [
          glow(340, -250, 600, '#3d5a24', BG, 80),
          ...[[120, 110, 120], [1060, 470, 150], [1080, 90, 80], [150, 500, 90]].map(([x, y, d], i) => withAnims(shape('ellipse', x, y, d, d, i % 2 ? LIME : GREEN, { stroke: '#f0f4c3', strokeWidth: 6, opacity: 85 }), A('zoom-in', { start: i ? 'withPrev' : 'afterPrev', delay: i * 150 })))],
          notes: 'Cierre con transición «Zoom».' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 6 · A training plan from zero to 5 km: a 3D runner, phases, a week that adds up,
  // progress and effort charts, an interval timer and a word cloud.
  life_fitness: { name: 'Plan de entrenamiento: 5 km', cat: 'life',
    summary: 'Corredor 3D, Text Art fuego, fases con degradados, semana con fórmulas, gráficos de progreso, pirámide, cuenta atrás y nube de palabras',
    make: () => {
      const BG = '#101317', FG = '#ffffff', ORANGE = '#e0873b', GREEN = '#4caf7d', CYAN = '#3bb3c3', RED = '#c94f4f', PURP = '#8e6cc9', MUTE = '#9aa3ad';
      const head = pairStacks('tech').heading, runner = lib3d('kn-character');
      return finish(build({ name: 'De 0 a 5 km', palette: 'revela', fonts: 'tech', title: { size: 50, color: FG }, body: { color: FG },
        decor: () => [shape('rect', 60, 40, 60, 6, ORANGE), shape('rect', 126, 40, 30, 6, GREEN), shape('rect', 162, 40, 14, 6, CYAN)] }, [
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          glow(640, -160, 900, '#5a3415', BG, 70),
          text('PLAN DE ENTRENAMIENTO · 8 SEMANAS', 90, 170, 700, 40, { fontSize: 24, letterSpacing: 6, color: ORANGE }),
          withAnims(text('DE 0 A 5 KM', 80, 210, 760, 170, { fontFamily: head, fontSize: 120, fontWeight: 800, wordart: 'fire' }), A('zoom-in', { start: 'afterPrev', duration: 800 })),
          text('Tres días a la semana, media hora cada día y sin lesiones.', 90, 390, 640, 100, { fontSize: 34, color: FG }),
          ...[['8', 'semanas'], ['24', 'sesiones'], ['5 km', 'seguidos']].flatMap(([n, l], i) => [
            text(n, 90 + i * 210, 520, 190, 70, { fontFamily: head, fontSize: 56, fontWeight: 800, color: [ORANGE, GREEN, CYAN][i] }),
            text(l, 90 + i * 210, 590, 190, 40, { fontSize: 24, color: MUTE })]),
          model('kh-CesiumMan', 820, 120, 400, 520, { view: 'side', caption: '' })],
          notes: 'Text Art «Fuego» que entra con zoom. El corredor 3D camina en bucle (su animación propia). El plan es un ejemplo general: no sustituye el consejo de un profesional.' },
        { title: 'Cómo funciona', layout: 'titleOnly', bg: BG, extra: [
          ...[['SEMANAS 1–3', 'Andar y trotar', '1 min trotando, 90 s andando, ocho veces.', ORANGE, '#e0503b'], ['SEMANAS 4–6', 'Alargar', 'De 5 a 12 minutos seguidos, con pausas cortas.', GREEN, '#2f8f84'], ['SEMANAS 7–8', 'Consolidar', 'De 20 a 30 minutos sin parar: ¡los 5 km!', CYAN, PURP]]
            .flatMap(([k, h, d, c1, c2], i) => together([shape('rounded', 90 + i * 375, 190, 350, 420, c1, { fill2: c2, gradAngle: 135, radius: 22 }),
              text(`<div style="font-size:20px;letter-spacing:4px;opacity:.85">${k}</div><div style="font-family:${head};font-size:44px;font-weight:800;margin:14px 0">${h}</div><div style="font-size:26px">${d}</div>`, 115 + i * 375, 220, 300, 260, { color: '#ffffff', fontSize: 26 }),
              text(`0${i + 1}`, 115 + i * 375, 470, 300, 130, { fontFamily: head, fontSize: 120, fontWeight: 800, color: '#ffffff', opacity: 30, textAlign: 'right', lineHeight: 1 })],
              'fade-up', i ? 'afterPrev' : 'click'))],
          notes: 'Clic: las tres fases aparecen una tras otra (después de la anterior). Fondos con degradado lineal.' },
        { title: 'Una semana tipo', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 470, fontSize: 24, header: true, headBg: ORANGE, headFg: '#101317', stroke: '#2a3038',
            rows: [['Día', 'Sesión', 'Minutos'], ['Lunes', 'Intervalos: 8 × (1 min trote + 90 s andando)', '30'], ['Martes', 'Descanso', '0'], ['Miércoles', 'Fuerza: piernas y core', '25'],
              ['Jueves', 'Descanso', '0'], ['Viernes', 'Intervalos largos: 5 × (3 min + 2 min)', '35'], ['Sábado', 'Rodaje suave y estiramientos', '30'], ['Domingo', 'Descanso o paseo largo', '0'], ['<b>Total</b>', '', '=SUMA(ARRIBA)']],
            colW: [2, 7, 2], cellBg: Object.fromEntries([2, 4, 7].flatMap(r => [0, 1, 2].map(c => [`${r},${c}`, '#1f2a24']))) })],
          notes: 'Los días de descanso tienen otro fondo (color de celda). El total semanal es una fórmula: cambia una sesión y se recalcula.' },
        { title: 'Tu progreso', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 480, chartType: 'line', color: ORANGE, seriesName: 'Real', grid: true, yTitle: 'Minutos seguidos',
            data: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((l, i) => ({ label: l, value: [1, 2, 3, 5, 8, 12, 20, 30][i] })),
            series: [{ name: 'Objetivo', values: [1, 2, 3, 5, 10, 15, 22, 30], color: '#5c6670' }] }),
          text(`<span style="font-family:${head};font-size:72px;font-weight:800;color:${GREEN}">×30</span><br>de 1 minuto a media hora seguida en ocho semanas`, 890, 230, 300, 300, { fontSize: 28, color: FG })],
          notes: 'Gráfico de líneas con dos series: lo real (datos de ejemplo) frente al objetivo.' },
        { title: 'Zonas de esfuerzo', layout: 'titleOnly', bg: BG, extra: [
          dg('pyramid', 'Z5 · Máximo\nZ4 · Umbral\nZ3 · Tempo\nZ2 · Aeróbico\nZ1 · Suave', 90, 180, 520, 460, { colors: 'colorful' }),
          chartBlock({ x: 660, y: 180, w: 530, h: 380, chartType: 'hbar', color: GREEN, dataLabels: true,
            data: [{ label: 'Z1', value: 35 }, { label: 'Z2', value: 45 }, { label: 'Z3', value: 12 }, { label: 'Z4', value: 6 }, { label: 'Z5', value: 2 }] }),
          text('% del tiempo en cada zona: el 80 % suave, el 20 % intenso.', 660, 580, 530, 60, { fontSize: 24, color: MUTE })],
          notes: 'Pirámide de zonas y barras horizontales con etiquetas de datos. Porcentajes orientativos.' },
        { title: 'Intervalos: ¡ahora tú!', layout: 'titleOnly', bg: BG, extra: [
          text(ul('Trota 1 minuto a ritmo de charla', 'Cuando suene, anda 90 segundos', 'Repite ocho veces'), 90, 180, 620, 260, { fontSize: 32, color: FG }),
          withAnims(model('kn-character', 60, 440, 180, 220, { walk: { clip: runner.walk, face: true } }), path([[220, 0], [460, 0]], { duration: 3000 })),
          timer(60, 800, 180, 380, { color: GREEN, endText: '¡Anda!' })],
          notes: 'La cuenta atrás de un minuto empieza al llegar y suena al acabar. Clic: el personaje 3D cruza andando (trayectoria con su animación de andar).' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué te motiva a correr?', options: [], x: 90, y: 70, w: 1100, h: 580 })],
          notes: 'Nube de palabras en directo: cada persona escribe una palabra desde el móvil y las más repetidas crecen.' },
        { layout: 'blank', bg: BG, transition: 'convex', extra: [
          glow(300, -300, 700, '#5a3415', BG, 70),
          text('¡A POR ELLO!', 140, 200, 1000, 170, { fontFamily: head, fontSize: 130, fontWeight: 800, wordart: 'fire', textAlign: 'center' }),
          text('Primera sesión: lunes a las 7:30 · Parque del río, junto a la fuente', 140, 400, 1000, 60, { fontSize: 30, color: FG, textAlign: 'center' }),
          text(credit3d('kh-CesiumMan'), 140, 640, 1000, 30, { fontSize: 13, color: '#6b7480', textAlign: 'center' })],
          notes: 'Cierre con transición «Convexa».' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 7 · A book club: a shelf of sketched spines, the book's cover drawn with
  // shapes, quotes that move with Transform, characters, a rating and a vote.
  life_bookclub: { name: 'Club de lectura', cat: 'life',
    summary: 'Estantería a mano alzada, portada con formas, citas que se transforman, diagrama radial, valoración y votación del próximo libro',
    make: () => {
      const BG = '#1b1030', FG = '#f3eefe', PURP = '#9b5de5', PINK = '#f15bb5', YEL = '#fee440', CYAN = '#00bbf9', MINT = '#00f5d4', MUTE = '#b9a9d6';
      const serif = pairStacks('websafe').heading, Q = uid(), QT = uid(), QA = uid();
      const spines = [[70, 300, PURP], [60, 340, PINK], [80, 280, CYAN], [56, 320, YEL], [74, 360, MINT], [64, 300, '#ff8fab']];
      let sx = 780;
      const shelf = spines.map(([w, h, c], i) => { const b = withAnims(shape('rect', sx, 600 - h, w, h, c, { sketch: true, stroke: '#0d0718', strokeWidth: 3, ...(i === 5 && { rotation: 12 }) }),
        A('fade-down', { start: i ? 'withPrev' : 'afterPrev', delay: i * 120 })); sx += w + 8; return b; });
      const quote = (glyphX, color, q, who) => [keep(text('“', glyphX, 60, 260, 300, { fontFamily: serif, fontSize: 300, color, lineHeight: 1 }), Q),
        keep(text(q, 170, 200, 940, 300, { fontFamily: serif, fontSize: 46, fontStyle: 'italic', color: FG, vAlign: 'middle' }), QT),
        keep(text(who, 170, 520, 940, 50, { fontSize: 26, color: MUTE }), QA)];
      return finish(build({ name: 'Club de lectura · octubre', palette: 'violet', fonts: 'websafe', title: { size: 50, color: YEL }, body: { color: FG },
        decor: () => [shape('rect', 0, 0, 12, 720, PURP, { fill2: PINK, gradAngle: 90 })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          glow(600, 100, 760, '#3b1d66', BG, 80),
          text('SESIÓN DE OCTUBRE · BIBLIOTECA', 90, 180, 660, 40, { fontSize: 22, letterSpacing: 4, color: MINT }),
          text('Club de lectura', 80, 220, 700, 220, { fontFamily: serif, fontSize: 92, wordart: 'neon', wordartColor: PURP, lineHeight: 1.05 }),
          text('Este mes: «El faro de las horas»', 90, 450, 660, 60, { fontSize: 34, fontStyle: 'italic', color: FG }),
          text('Jueves 15 de octubre · 19:00 · Sala de lectura', 90, 530, 660, 50, { fontSize: 26, color: MUTE }),
          shape('rect', 760, 600, 470, 14, '#5b3a2a', { sketch: true, stroke: '#0d0718', strokeWidth: 3 }), ...shelf],
          notes: 'Los lomos son rectángulos con trazo a mano alzada que caen sobre la balda, uno tras otro. El libro y su autora son inventados para el ejemplo.' },
        { title: 'El libro del mes', layout: 'titleOnly', bg: BG, extra: [
          shape('rect', 108, 188, 330, 450, '#000000', { opacity: 35, radius: 6 }),
          shape('rect', 90, 170, 330, 450, '#1b3a6b', { fill2: '#5a2d82', gradAngle: 160 }),
          shape('ellipse', 165, 230, 180, 180, YEL, { fill2: '#1b3a6b', gradType: 'radial', opacity: 70 }),
          shape('trapezoid', 225, 330, 60, 170, '#f3eefe'), shape('rect', 230, 380, 50, 18, PINK), shape('rect', 230, 440, 50, 18, PINK),
          shape('wave', 90, 500, 330, 90, '#0e2547', { opacity: 90 }),
          text('EL FARO<br>DE LAS HORAS', 110, 190, 290, 100, { fontFamily: serif, fontSize: 30, fontWeight: 700, textAlign: 'center', color: '#ffffff', letterSpacing: 2 }),
          text('Inés Valcárcel', 110, 580, 290, 36, { fontSize: 20, textAlign: 'center', color: '#e8dcff' }),
          text('En un faro del norte, una farera recibe cada noche una carta que aún no se ha escrito. Una novela sobre el tiempo, la memoria y las familias que se eligen.', 480, 180, 710, 260, { fontFamily: serif, fontSize: 32, color: FG, lineHeight: 1.4 }),
          ...[['312', 'páginas'], ['2024', 'publicación'], ['4,3', 'nota media del club']].flatMap(([n, l], i) => [
            text(n, 480 + i * 240, 480, 220, 70, { fontFamily: serif, fontSize: 56, fontWeight: 700, color: [YEL, MINT, PINK][i] }), text(l, 480 + i * 240, 555, 220, 64, { fontSize: 22, color: MUTE })])],
          notes: 'Portada dibujada con formas: degradados, un faro con un trapecio y una onda para el mar. Libro inventado: cambia el texto por el vuestro.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: quote(70, PINK, 'Hay luces que no sirven para ver, sino para que otros sepan dónde estamos.', '— Capítulo 3, página 41'),
          notes: 'Transformar: las comillas, la cita y la referencia son los mismos objetos en la diapositiva siguiente, y se mueven y cambian solos.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [...quote(950, CYAN, 'Todos guardamos una carta que no nos atrevemos a abrir.', '— Capítulo 11, página 187'),
          withAnims(text('¿Cuál es la vuestra?', 170, 590, 940, 50, { fontSize: 30, color: YEL }), A('fade-up'))],
          notes: 'Las comillas viajan al otro lado y cambian de color. Clic: aparece la pregunta para abrir el debate.' },
        { title: 'Los personajes', layout: 'titleOnly', bg: BG, extra: [
          dg('radial', 'Marta, la farera\n  Lía, su hija\n  Andrés, el cartógrafo\n  Don Elías, el cartero\n  El pueblo de Arnela', 90, 170, 1100, 480, { colors: 'colorful', oneByOne: true })],
          notes: 'Diagrama radial uno a uno: la protagonista en el centro y quienes la rodean.' },
        { title: 'Para el debate', layout: 'titleOnly', bg: BG, extra: [
          ...['¿Quién escribe las cartas? ¿Importa saberlo?', '¿Qué representa el faro para Marta y para Lía?', '¿El final cierra la historia o la abre?', '¿Qué personaje os ha cambiado de opinión?'].flatMap((t, i) =>
            together([text(String(i + 1), 90 + (i % 2) * 560, 195 + Math.floor(i / 2) * 230, 90, 120, { fontFamily: serif, fontSize: 96, fontWeight: 700, color: [PINK, CYAN, YEL, MINT][i], lineHeight: 1 }),
              text(t, 190 + (i % 2) * 560, 205 + Math.floor(i / 2) * 230, 430, 160, { fontSize: 32, color: FG })], 'fade-up'))],
          notes: 'Cuatro preguntas que aparecen con un clic cada una. Dejad unos minutos para cada una.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'rating', display: 'numbers', fontSize: 36, question: '¿Cuántas estrellas le das al libro?', x: 90, y: 70, w: 1100, h: 580 })],
          notes: 'Valoración de 1 a 5 desde el móvil, mostrada como cifra (la media).' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 34, display: 'pie', question: '¿Qué leemos en noviembre?', x: 90, y: 70, w: 1100, h: 580,
          options: ['«La cocina de las mareas»', '«Diario de un invierno largo»', '«Los mapas de Ulla»', '«Nadie pinta el viento»'] })],
          notes: 'Votación del próximo libro, en gráfico circular. Los títulos son inventados.' },
        { layout: 'section', bg: BG, title: 'Nos vemos el jueves 12 de noviembre', subtitle: '19:00 · Sala de lectura · Trae tu libro y tu taza', transition: 'page', extra: [
          glow(340, -260, 600, '#3b1d66', BG, 80),
          ...[[110, 90, PINK], [1100, 520, CYAN], [1110, 110, YEL]].map(([x, y, c]) => shape('star4', x, y, 70, 70, c, { opacity: 80 }))],
          notes: 'Cierre con transición «Página» (como pasar una hoja).' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 8 · Moving house: a house drawn with shapes, the plan as a timeline, a checklist
  // that strikes items out, 3D furniture that lands on the floor plan (Transform).
  life_moving: { name: 'Mudanza y nuevo hogar', cat: 'life',
    summary: 'Casa con formas a mano, cronología, lista que se tacha, muebles 3D que pasan al plano con Transformar, presupuesto y actividad de ordenar',
    make: () => {
      const BG = '#f5f2ed', INK = '#2b2b2b', WOOD = '#c49a6c', SAGE = '#7d9471', CLAY = '#d97b5a', GREY = '#8c8c8c', head = pairStacks('modern').heading;
      const SOFA = uid(), CHAIR = uid();
      const sk = { sketch: true, stroke: INK, strokeWidth: 3 };
      return finish(build({ name: 'Nos mudamos', palette: 'grayscale', fonts: 'modern', title: { size: 50, color: INK }, body: { color: INK },
        decor: () => [shape('rect', 60, 664, 1160, 2, '#d9d2c5')] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          shape('rect', 810, 300, 330, 260, '#ffffff', sk), shape('triangle', 780, 150, 390, 170, CLAY, sk),
          shape('rect', 935, 420, 80, 140, WOOD, sk), shape('rect', 850, 350, 66, 56, '#cfe3ef', sk), shape('rect', 1034, 350, 66, 56, '#cfe3ef', sk),
          shape('rect', 1060, 170, 40, 80, GREY, sk),
          ...[[690, 470, 120], [600, 500, 90], [640, 410, 80]].map(([x, y, s], i) => withAnims(shape('cube', x, y, s, s, WOOD, { ...sk, strokeWidth: 2 }), A('fade-down', { start: i ? 'afterPrev' : 'afterPrev', duration: 400, sound: i === 0 ? 'pop' : '' }))),
          text('DE LA CALLE MAYOR 8 A LA CALLE DEL OLMO 23', 90, 180, 680, 40, { fontSize: 20, letterSpacing: 2, color: SAGE }),
          text('Nos mudamos', 80, 240, 560, 260, { fontFamily: head, fontSize: 96, fontWeight: 800, color: INK, lineHeight: 1.05 }),
          text('Plan de mudanza · del 1 al 15 de noviembre', 90, 510, 520, 90, { fontSize: 30, color: GREY })],
          notes: 'La casa y las cajas están hechas con formas (rectángulos, triángulo y cubos) con trazo a mano alzada. Las cajas caen una tras otra al llegar.' },
        { title: 'La cuenta atrás', layout: 'titleOnly', bg: BG, extra: [
          dg('timeline', '4 semanas\n  Presupuestos y fecha\n3 semanas\n  Vaciar el trastero\n2 semanas\n  Cambiar suministros\n1 semana\n  Embalar lo que no usamos\nEl día\n  Llaves, fotos y ¡a cargar!', 90, 180, 1100, 450, { oneByOne: true, colors: 'outline' })],
          notes: 'Cronología con colores «Contorno», uno a uno.' },
        { title: 'Lista de tareas', layout: 'titleOnly', bg: BG, extra: [
          ...[['Pedir tres presupuestos de mudanza', true], ['Reservar el ascensor con la comunidad', true], ['Dar de alta luz, agua e internet', true], ['Cambiar el domicilio en el padrón', false], ['Etiquetar cajas por habitación', false], ['Preparar la caja del primer día', false]].flatMap(([t, done], i) => {
            const y = 185 + i * 76, box = shape('rounded', 100, y + 8, 40, 40, '#ffffff', { stroke: INK, strokeWidth: 2, radius: 8 }), label = text(t, 170, y, 640, 56, { fontSize: 28, color: INK, vAlign: 'middle' });
            return done ? [box, withAnims(icon('check', 104, y + 12, 32, SAGE), A('zoom-in', { sound: 'click' })), withAnims(label, A('strike', { start: 'withPrev' }))] : [box, label]; }),
          card('<b>Truco</b><br>Una caja «primer día» con cargadores, sábanas, cafetera, papel higiénico y herramientas.', 850, 200, 340, 290, '#ebe4d8', { fontSize: 26, color: INK })],
          notes: 'Cada clic marca una tarea y la tacha (efecto «Tachar» junto con la marca). Las pendientes quedan sin tachar.' },
        { title: '¿Qué nos llevamos?', layout: 'titleOnly', bg: BG, extra: [
          keep(model('kh-GlamVelvetSofa', 80, 190, 520, 360, { view: 'three', caption: '' }), SOFA),
          keep(model('kh-SheenChair', 640, 210, 280, 340, { view: 'three', caption: '' }), CHAIR),
          model('kh-IridescenceLamp', 950, 200, 260, 360, { view: 'front', autoRotate: true, caption: '' }),
          ...[['Sofá · se viene', SAGE, 80, 520], ['Butaca · se viene', SAGE, 640, 280], ['Lámpara · se vende', CLAY, 950, 260]].map(([t, c, x, w]) =>
            text(t, x, 580, w, 50, { fontSize: 24, fontWeight: 700, textAlign: 'center', color: '#ffffff', bg: c, radius: 25, vAlign: 'middle' }))],
          notes: 'Muebles en 3D de la biblioteca: arrastra para girarlos. En la siguiente diapositiva el sofá y la butaca bajan al plano con Transformar.' },
        { title: 'El salón nuevo · 22 m²', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
          shape('rect', 90, 180, 760, 460, '#fbf9f5', { stroke: INK, strokeWidth: 8 }),
          shape('rect', 300, 174, 240, 14, '#cfe3ef', { stroke: INK, strokeWidth: 2 }), shape('rect', 840, 480, 20, 110, WOOD),
          text('puerta', 740, 520, 90, 30, { fontSize: 18, textAlign: 'right', color: GREY }),
          shape('rounded', 230, 370, 420, 210, SAGE, { opacity: 35, radius: 20 }),
          keep(model('kh-GlamVelvetSofa', 220, 430, 440, 200, { view: 'top', caption: '' }), SOFA),
          keep(model('kh-SheenChair', 640, 260, 170, 170, { view: 'top', caption: '' }), CHAIR),
          text('ventana', 300, 196, 240, 30, { fontSize: 18, textAlign: 'center', color: GREY }),
          text(ul('Sofá frente a la ventana', 'Butaca junto a la luz', 'Alfombra de 2 × 3 m', 'Paso libre de 90 cm'), 890, 200, 320, 300, { fontSize: 26, color: INK }),
          text(`Modelos 3D: ${lib3d('kh-GlamVelvetSofa').credit} · ${lib3d('kh-SheenChair').credit}`, 890, 580, 320, 60, { fontSize: 12, color: GREY })],
          notes: 'Transformar: el sofá y la butaca de la diapositiva anterior bajan al plano y se ven desde arriba (Modelo 3D ▸ Vista ▸ Cámara: desde arriba).' },
        { title: 'Presupuesto', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 90, y: 180, w: 560, h: 420, fontSize: 25, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d9d2c5', banded: true, band: WOOD,
            rows: [['Concepto', 'Importe'], ['Camión y 3 operarios', '650 €'], ['Cajas y embalaje', '90 €'], ['Limpieza del piso antiguo', '120 €'], ['Pintura del salón', '300 €'], ['Cambio de cerradura', '80 €'], ['<b>Total</b>', '=SUMA(ARRIBA)']], colW: [3, 2] }),
          chartBlock({ x: 690, y: 200, w: 510, h: 340, chartType: 'hbar', color: CLAY, dataLabels: true,
            data: [{ label: 'Camión', value: 650 }, { label: 'Pintura', value: 300 }, { label: 'Limpieza', value: 120 }, { label: 'Cajas', value: 90 }, { label: 'Cerradura', value: 80 }] })],
          notes: 'El total es una fórmula. Importes de ejemplo.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', fontSize: 32, question: '¿En qué orden se hace? Ordénalo desde el móvil', x: 90, y: 70, w: 1100, h: 580,
          options: ['Pedir presupuestos', 'Reservar la fecha', 'Embalar por habitaciones', 'Cargar el camión', 'Montar los muebles'] })],
          notes: 'Actividad de ordenar: cada uno recibe los pasos desordenados y la corrección es automática.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          text('¡Hogar, dulce hogar!', 90, 150, 760, 210, { fontFamily: head, fontSize: 84, fontWeight: 800, color: INK, lineHeight: 1.05 }),
          text('Fiesta de bienvenida: sábado 22 a las 19:00 · Calle del Olmo 23, 2.º B', 90, 390, 640, 100, { fontSize: 30, color: GREY }),
          model('kh-Lantern', 880, 140, 300, 460, { autoRotate: true, view: 'three', motion: 'float' })],
          notes: 'El farol 3D flota y gira solo. Cierre con transición «Zoom».' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 9 · A graduation: mortarboards drawn with shapes, the two years as a timeline,
  // polaroids that flip in, numbers with a drum roll, thanks, and applause.
  life_graduation: { name: 'Graduación y fin de curso', cat: 'life',
    summary: 'Text Art oro, birretes con formas, polaroids que giran al entrar, cifras con redoble, agradecimientos, nube de palabras y aplausos',
    make: () => {
      const BG = '#0b0f19', FG = '#e6e9ef', GOLD = '#e0af68', BLUE = '#7aa2f7', LILA = '#bb9af7', GREEN = '#9ece6a', PINK = '#f7768e', MUTE = '#a9b1d6';
      const head = pairStacks('classic').heading;
      // A mortarboard: the board, the cap under it and the tassel.
      const cap = (x, y, s, c = '#1a1f2e') => [shape('rounded', x + 55 * s, y + 40 * s, 90 * s, 50 * s, c, { stroke: GOLD, strokeWidth: 2, radius: 8 * s }),
        shape('diamond', x, y, 200 * s, 80 * s, c, { stroke: GOLD, strokeWidth: 2 }), shape('ellipse', x + 92 * s, y + 32 * s, 16 * s, 16 * s, GOLD),
        shape('rect', x + 150 * s, y + 40 * s, 4 * s, 70 * s, GOLD), shape('teardrop', x + 142 * s, y + 104 * s, 20 * s, 28 * s, GOLD)];
      const photos = [['Viaje a la nieve', BLUE, LILA, -6], ['Feria de ciencias', GREEN, '#2ac3de', 4], ['El musical', PINK, GOLD, -3], ['Último día', GOLD, PINK, 6]];
      return finish(build({ name: 'Graduación 2026', palette: 'midnight', fonts: 'classic', title: { size: 50, color: GOLD, bold: false }, body: { color: FG },
        decor: () => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: GOLD, strokeWidth: 1, opacity: 40 })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          glow(-300, -300, 900, '#28324f', BG, 80), glow(780, 300, 700, '#3a2c1a', BG, 60),
          text('PROMOCIÓN 2024–2026', 100, 170, 620, 40, { fontSize: 24, letterSpacing: 8, color: BLUE }),
          withAnims(text('Graduación', 90, 220, 720, 180, { fontFamily: head, fontSize: 112, wordart: 'gold' }), A('zoom-in', { start: 'afterPrev', duration: 900 })),
          text('2.º de Bachillerato · IES Valle del Tajo', 100, 410, 640, 60, { fontSize: 34, fontStyle: 'italic', color: FG }),
          text('Viernes 19 de junio · Salón de actos', 100, 480, 640, 50, { fontSize: 26, color: MUTE }),
          ...together(cap(820, 220, 1.8), 'bounce', 'afterPrev')],
          notes: 'Text Art «Oro» y un birrete hecho con formas (rombo, rectángulo redondeado y gota) que rebota al llegar. Centro y nombres inventados.' },
        { title: 'Nuestros dos años', layout: 'titleOnly', bg: BG, extra: [
          dg('timeline', 'Sept. 2024\n  El primer día\nDic. 2024\n  Viaje a la nieve\nMarzo 2025\n  Semana de la ciencia\nSept. 2025\n  Último curso\nJunio 2026\n  ¡Graduados!', 90, 180, 1100, 450, { oneByOne: true, colors: 'colorful' })],
          notes: 'Cronología uno a uno. Buen momento para que alguien de la clase cuente cada recuerdo.' },
        { title: 'Recuerdos', layout: 'titleOnly', bg: BG, extra: photos.flatMap(([cap1, c1, c2, r], i) => {
          const cx = 210 + i * 287, cy = 440;
          const fr = shape('rect', cx - 125, cy - 150, 250, 300, '#fbfaf6', { rotation: r, shadow: { x: 4, y: 8, blur: 14, color: '#00000088' } });
          const [px, py, pw, ph] = turned(cx, cy, r, 0, -30, 220, 210), [tx, ty, tw, th] = turned(cx, cy, r, 0, 112, 230, 50), [ix, iy] = turned(cx, cy, r, 0, -30, 70, 70);
          return together([fr, shape('rect', px, py, pw, ph, c1, { fill2: c2, gradAngle: 135, rotation: r }), { ...icon(['star', 'bolt', 'heart', 'user'][i], ix, iy, 70, '#ffffff'), rotation: r },
            text(cap1, tx, ty, tw, th, { fontFamily: pairStacks('friendly').heading, fontSize: 22, textAlign: 'center', vAlign: 'middle', color: '#3b3228', rotation: r })], 'flip', 'click', { sound: 'click' }); }),
          notes: 'Las fotos son huecos con degradado: haz clic derecho ▸ Cambiar imagen o arrastra vuestras fotos encima. Cada polaroid entra girando («Voltear») con un clic.' },
        { title: 'En cifras', layout: 'titleOnly', bg: BG, extra: [
          withAnims(big('86', 'graduadas y graduados', 90, 230, GOLD, FG), A('zoom-in', { sound: 'drumroll' })),
          withAnims(big('3.400', 'horas de clase', 470, 230, BLUE, FG), A('zoom-in', { start: 'afterPrev', delay: 300 })),
          withAnims(big('12', 'excursiones', 850, 230, GREEN, FG), A('zoom-in', { start: 'afterPrev', delay: 300 })),
          text('…y un número incontable de cafés antes de los exámenes.', 90, 520, 1100, 60, { fontSize: 28, fontStyle: 'italic', textAlign: 'center', color: MUTE })],
          notes: 'Clic: redoble de tambor y las tres cifras aparecen una tras otra. Datos de ejemplo.' },
        { title: 'Gracias', layout: 'titleOnly', bg: BG, extra: [
          ...[['A las familias', 'por los madrugones, los ánimos y la paciencia.', PINK], ['Al profesorado', 'por enseñarnos mucho más que el temario.', GOLD], ['Al personal del centro', 'conserjería, limpieza y secretaría: sin vosotros, nada funciona.', GREEN], ['A los compañeros', 'por cada apunte prestado y cada risa.', BLUE]].flatMap(([h, d, c], i) =>
            together([shape('rounded', 90 + (i % 2) * 560, 180 + Math.floor(i / 2) * 230, 540, 210, '#ffffff', { opacity: 6, radius: 18 }), icon('heart', 120 + (i % 2) * 560, 210 + Math.floor(i / 2) * 230, 48, c),
              text(`<b style="color:${c}">${h}</b><br>${d}`, 190 + (i % 2) * 560, 200 + Math.floor(i / 2) * 230, 420, 170, { fontSize: 28, color: FG })], 'fade-up'))],
          notes: 'Cuatro agradecimientos que aparecen con un clic cada uno. Leedlos entre varias personas.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', fontSize: 36, question: 'Una palabra para estos dos años', options: [], x: 90, y: 70, w: 1100, h: 580 })],
          notes: 'Nube de palabras: el público responde desde el móvil y las palabras más repetidas se ven más grandes.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('“', 90, 60, 200, 220, { fontFamily: head, fontSize: 240, color: GOLD, lineHeight: 1 }),
          text('Lo que habéis aprendido aquí no cabe en un boletín de notas. Llevadlo con vosotros a donde vayáis.', 190, 200, 900, 260, { fontFamily: head, fontSize: 46, fontStyle: 'italic', color: FG }),
          text('— Vuestra tutora, en el último día de clase', 190, 480, 900, 50, { fontSize: 26, color: MUTE })],
          notes: 'Una cita de despedida, sobria y con mucho aire alrededor.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          glow(340, -100, 600, '#3a2c1a', BG, 70),
          text('¡Enhorabuena!', 140, 250, 1000, 180, { fontFamily: head, fontSize: 130, wordart: 'gold', textAlign: 'center' }),
          text('Promoción 2026 · Ahora, a por lo siguiente', 140, 440, 1000, 60, { fontSize: 32, textAlign: 'center', color: FG }),
          ...[[120, 560, 0.7, -260], [480, 590, 0.6, -330], [760, 580, 0.65, -300], [1040, 560, 0.7, -280]].flatMap(([x, y, s, dy], i) =>
            cap(x, y, s).map((b, k) => withAnims(b, path([[i % 2 ? 40 : -40, dy / 2], [i % 2 ? 20 : -20, dy]], { duration: 1600, start: i + k ? 'withPrev' : 'afterPrev', delay: i * 120, ...(i + k === 0 && { sound: 'applause' }) }))))],
          notes: 'Al llegar, los birretes salen volando hacia arriba (trayectorias, todas a la vez) mientras suenan aplausos.' },
      ]));
    } },

  // ---------------------------------------------------------------------------------
  // 10 · An urban vegetable garden: the 3D plant that moves with Transform, the
  // sowing calendar as a coloured table, the cycle, a chart, and label-the-plant.
  life_garden: { name: 'Huerto urbano', cat: 'life',
    summary: 'Planta 3D con Transformar, calendario de siembra en tabla de colores, ciclo, Venn, gráficos de riego y crecimiento, actividad de etiquetar',
    make: () => {
      const BG = '#f4f8f1', INK = '#1e3320', GREEN = '#2e7d32', LEAF = '#66bb6a', SOIL = '#8d6e63', SUN = '#fbc02d', BLUE = '#0277bd', BERRY = '#ad1457', SOW = '#81c784', CROP = '#ffb74d';
      const fr = pairStacks('friendly').heading, PLANT = uid();
      const plant = (x, y, w, h, p = {}) => keep(model('kh-DiffuseTransmissionPlant', x, y, w, h, { view: 'front', caption: '', ...p }), PLANT);
      const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      const crops = [['Tomate', [2, 3], [6, 7, 8]], ['Lechuga', [1, 2, 8, 9], [3, 4, 10, 11]], ['Calabacín', [3, 4], [5, 6, 7]], ['Zanahoria', [2, 3, 7], [5, 6, 9, 10]], ['Judía verde', [3, 4, 5], [6, 7, 8]], ['Fresa', [8, 9], [3, 4, 5]]];
      const cellBg = {}; crops.forEach(([, s, c], r) => { s.forEach(m => (cellBg[`${r + 1},${m + 1}`] = SOW)); c.forEach(m => (cellBg[`${r + 1},${m + 1}`] = CROP)); });
      const tomato = svgURL('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#eef6e8"/>'
        + '<rect y="400" width="400" height="100" fill="#8d6e63"/><path d="M200 400 L200 440 M200 420 L165 465 M200 425 L240 470 M200 440 L190 490 M170 455 L150 480 M235 462 L262 488" stroke="#f3e0c7" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + '<path d="M200 400 C195 320 206 220 200 70" stroke="#4c8c2b" stroke-width="10" fill="none" stroke-linecap="round"/>'
        + '<path d="M200 250 C160 200 110 210 90 230 C120 260 170 260 200 250Z" fill="#66bb6a"/><path d="M202 320 C240 280 300 290 320 310 C290 340 240 340 202 320Z" fill="#66bb6a"/>'
        + '<path d="M200 130 C220 110 240 100 250 92" stroke="#4c8c2b" stroke-width="5" fill="none"/>' + [0, 72, 144, 216, 288].map(a => `<ellipse cx="250" cy="76" rx="9" ry="18" fill="#fbc02d" transform="rotate(${a} 250 90)"/>`).join('') + '<circle cx="250" cy="90" r="7" fill="#f57f17"/>'
        + '<path d="M203 180 C240 170 270 170 288 182" stroke="#4c8c2b" stroke-width="5" fill="none"/><circle cx="290" cy="210" r="32" fill="#e53935"/><path d="M276 180 L290 190 L304 180 L298 194 L290 186 L282 194Z" fill="#2e7d32"/></svg>');
      return finish(build({ name: 'Nuestro huerto urbano', palette: 'forest', fonts: 'friendly', title: { size: 52, color: GREEN }, body: { color: INK },
        decor: () => [shape('wave', -40, 650, 1360, 110, LEAF, { opacity: 25 })] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          withAnims(shape('sun', 1060, 50, 150, 150, SUN), A('spin360', { start: 'afterPrev', duration: 2500 })),
          glow(650, 60, 640, '#dcedc8', BG, 90),
          text('HUERTO DE LA AZOTEA · 2027', 90, 170, 620, 40, { fontSize: 22, letterSpacing: 4, color: SOIL }),
          text('Nuestro huerto', 80, 210, 640, 260, { fontFamily: fr, fontSize: 104, fontWeight: 800, color: GREEN, lineHeight: 1.05 }),
          text('Qué plantar, cuándo y cómo cuidarlo entre todos', 90, 480, 600, 100, { fontSize: 32, color: INK }),
          plant(720, 120, 460, 520)],
          notes: 'La planta es un modelo 3D con transmisión de luz en las hojas. En la siguiente diapositiva se mueve con Transformar. El sol gira una vez al llegar.' },
        { title: '¿Por qué un huerto?', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
          plant(80, 170, 330, 440),
          ...[['heart', BERRY, 'Comemos mejor', 'Verdura de temporada recién cogida, sin envases.'], ['user', BLUE, 'Hacemos barrio', 'Veinte vecinos, un turno de riego cada uno.'], ['star', '#a66f00', 'Aprendemos', 'Los peques ven de dónde sale lo que comen.']].flatMap(([ic, c, h, d], i) =>
            together([icon(ic, 470, 200 + i * 140, 56, c), text(`<b style="color:${c}">${h}</b><br>${d}`, 550, 186 + i * 140, 640, 110, { fontSize: 28, color: INK })], 'fade-left'))],
          notes: 'Transformar: la planta viaja de la portada a la izquierda. Las tres razones entran con un clic cada una.' },
        { title: 'Calendario de siembra', layout: 'titleOnly', bg: BG, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 400, fontSize: 22, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#cfdcc6',
            rows: [['Cultivo', ...months], ...crops.map(([n]) => [n, ...months.map(() => '')])], colW: [4, ...months.map(() => 1)], cellBg }),
          shape('rounded', 90, 600, 30, 30, SOW, { radius: 6 }), text('Siembra', 130, 596, 200, 40, { fontSize: 24, color: INK }),
          shape('rounded', 300, 600, 30, 30, CROP, { radius: 6 }), text('Cosecha', 340, 596, 200, 40, { fontSize: 24, color: INK }),
          text('Orientativo: ajústalo un mes según tu zona.', 600, 596, 590, 40, { fontSize: 20, color: SOIL, fontStyle: 'italic', textAlign: 'right' })],
          notes: 'Tabla con celdas de color: verde para sembrar y naranja para cosechar. Calendario orientativo.' },
        { title: 'El ciclo del huerto', layout: 'titleOnly', bg: BG, extra: [
          dg('cycle', 'Sembrar\nRegar\nCuidar\nCosechar\nCompostar', 190, 170, 900, 480, { colors: 'colorful', oneByOne: true })],
          notes: 'Diagrama de ciclo uno a uno: lo que se cosecha vuelve a la tierra como compost.' },
        { title: 'Buenos vecinos', layout: 'titleOnly', bg: BG, extra: [
          dg('venn', 'Tomate\nAlbahaca\nCaléndula', 90, 180, 560, 450, { colors: 'light' }),
          text(ul('<b>La albahaca</b> aleja a la mosca blanca del tomate', '<b>La caléndula</b> atrae a las mariquitas, que se comen el pulgón', '<b>Juntas</b> aprovechan mejor el agua y la sombra'), 700, 200, 490, 420, { fontSize: 28, color: INK })],
          notes: 'Diagrama de Venn: plantas que se ayudan entre sí (asociaciones de cultivos).' },
        { title: 'Agua: lluvia y riego', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 480, chartType: 'stacked', color: BLUE, seriesName: 'Lluvia (l/m²)', grid: true, yTitle: 'Litros por m² al mes',
            data: ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'].map((l, i) => ({ label: l, value: [40, 35, 15, 5, 8, 25][i] })),
            series: [{ name: 'Riego (l/m²)', values: [20, 35, 70, 95, 90, 45], color: LEAF }] }),
          card('<b>Riego por goteo</b><br>Ahorra hasta la mitad del agua. Riega al amanecer o al anochecer.', 890, 230, 300, 320, '#e6f1df', { fontSize: 26, color: INK })],
          notes: 'Barras apiladas: lo que llueve y lo que hay que regar cada mes. Datos aproximados de ejemplo.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Pon nombre a cada parte de la tomatera', x: 90, y: 60, w: 1100, h: 600,
          image: tomato, options: ['Raíz', 'Tallo', 'Hoja', 'Flor', 'Fruto'], points: [{ x: 50, y: 90 }, { x: 50, y: 70 }, { x: 30, y: 47 }, { x: 62, y: 18 }, { x: 72, y: 42 }] })],
          notes: 'Actividad «Etiquetar una imagen»: cada persona arrastra los nombres a los puntos desde el móvil. El dibujo es un SVG hecho a medida.' },
        { title: 'Cómo crece una tomatera', layout: 'titleOnly', bg: BG, extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 480, chartType: 'area', color: GREEN, grid: true, yTitle: 'Altura (cm)', data: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((l, i) => ({ label: l, value: [5, 9, 15, 24, 36, 50, 63, 75][i] })) }),
          text(`<span style="font-family:${fr};font-size:80px;font-weight:800;color:${GREEN}">75 cm</span><br>en ocho semanas desde el trasplante`, 890, 240, 300, 280, { fontSize: 28, color: INK })],
          notes: 'Gráfico de área con la altura media (en cm) medida cada semana. Datos de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          text('¡Manos a la tierra!', 90, 200, 660, 230, { fontFamily: fr, fontSize: 84, fontWeight: 800, color: GREEN, lineHeight: 1.05 }),
          text('Próxima jornada: sábado a las 10:00 en la azotea. Trae guantes y una botella de agua.', 90, 440, 600, 120, { fontSize: 30, color: INK }),
          model('kh-DiffuseTransmissionPlant', 780, 130, 400, 500, { view: 'three', motion: 'orbit', caption: '' }),
          text(credit3d('kh-DiffuseTransmissionPlant'), 90, 610, 680, 30, { fontSize: 13, color: SOIL })],
          notes: 'La planta da una vuelta completa al llegar (Modelo 3D ▸ Vista ▸ Al entrar: vuelta completa). Cierre con transición «Zoom».' },
      ]));
    } },
};
