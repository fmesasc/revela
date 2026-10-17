// Example presentations: Catálogo del 3D (showcase). Each one: { name, summary, cat: 'showcase', make() } → a deck
// (see kit.js for the builders).
//
// Ten decks where the 3D models carry the theme, each one asking for a
// different side of them: an exhibition seen from every angle, a dance class
// with the robot's own clips, a nature documentary with a fox that walks and
// runs, a lorry on a roundabout, a launch day that moves the shuttle from slide
// to slide (Transform), a haunted house whose skeletons wake up, an
// accessibility walk in a wheelchair, a platform game level, a theatre
// rehearsal seen from above and from the stalls, and materials under the light.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';
import { motionPoints } from '../../animation/transitions.js';

// ---- Helpers of this file ---------------------------------------------------------
const FF = {
  lora: "'Lora', serif", caveat: "'Caveat', cursive", oswald: "'Oswald', sans-serif", bebas: "'Bebas Neue', sans-serif",
  anton: "'Anton', sans-serif", mono: "'JetBrains Mono', monospace", cormorant: "'Cormorant Garamond', serif", space: "'Space Grotesk', sans-serif",
  fira: "'Fira Code', monospace", merri: "'Merriweather', serif", playfair: "'Playfair Display', serif", montserrat: "'Montserrat', sans-serif",
  poppins: "'Poppins', sans-serif", georgia: "Georgia, 'Times New Roman', serif", inter: "'Inter', sans-serif", rubik: "'Rubik', sans-serif",
};
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
// A picture drawn in SVG, as a data URL (no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// A decorative picture (scenery behind everything).
const scene = (src, x, y, w, h) => img(src, x, y, w, h, '', { fit: 'fill', decorative: true });
// A label over a drawing, as a text box (so that it is translated: the text inside an SVG is not), placed as SVG
// text would be: (x, y) on the slide is its baseline, `anchor` start, middle or end.
const onPic = (t, x, y, fs, color, p = {}) => { const { anchor = 'start', w = 240, ...q } = p, left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return text(t, Math.round(left), Math.round(y - fs * 1.15), w, Math.round(fs * 1.5), { fontSize: fs, color, pad: [0, 0, 0, 0], lineHeight: 1.2,
    textAlign: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left', ...q }); };
// A stroke through points on the slide (an ink object: it can be drawn as you present, effect 'draw').
const ink = (pts, color, width = 4, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const px = Math.max(6, (80 - (Math.max(...xs) - Math.min(...xs))) / 2), py = Math.max(6, (80 - (Math.max(...ys) - Math.min(...ys))) / 2);
  const x = Math.min(...xs) - px, y = Math.min(...ys) - py, w = Math.max(...xs) - x + px, h = Math.max(...ys) - y + py;
  return { ...base(Math.round(x), Math.round(y), Math.round(w), Math.round(h)), type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// The smooth line a motion path follows, as points on the slide (to draw the same route as ink).
const curvePts = (start, rel, n = 60) => motionPoints({ pathShape: 'custom', points: [[0, 0], ...rel] }, n).map(([x, y]) => [start[0] + x, start[1] + y]);
const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
// Same object on several slides (Transform): the same id.
const same = (id, b) => ({ ...b, id });
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// Objects one after another with one click (the first waits for the click unless told otherwise).
const chain = (blocks, effect, props = {}, first = 'click') => blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// A 3D model without its caption (the credits of the deck go on one line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const n3d = (id, x, y, w, h, props = {}) => nasa(id, x, y, w, h, { caption: '', autoRotate: false, view: 'front', ...props });
const credits = (ids, x, y, w, color, props = {}) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label.replace(/ \(.*\)/, '') + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 40, { fontSize: 12, color, ...props });
// A clip of the model's own, once (then back to its resting clip).
const clip = (name, props = {}) => A('clip3d', { clip: name, once: true, duration: 1600, ...props });
// The deck's text colour (tables and polls take it): for slides whose background isn't the palette's.
const ink2 = (deck, color) => Object.assign(deck, { textColor: color });
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 5, color, fontWeight: 700, ...props });

export default {

  // ============================================================================
  // 1 · An exhibition of spacesuits: a museum hall in white and safety orange;
  //     one suit from the front, the side and the back, a timeline of five that
  //     turn, a helmet that comes closer (Transform), the glove, figures and a quiz.
  show_3d_suits: { name: 'Trajes espaciales: sesenta años', cat: 'showcase',
    summary: 'Exposición en 3D: un traje de frente, de lado y por detrás, cronología de trajes que giran, casco con Transformar, gráfico, tabla y quiz',
    make: () => {
      const INK = '#16191d', OR = '#ff5b14', MID = '#59616a', CARD = '#ffffff', LINE = '#c4c9cf';
      const H = FF.space, MONO = FF.mono, helmet = uid();
      const ruler = svgURL(1160, 30, Array.from({ length: 117 }, (_, i) => `<rect x="${i * 10}" y="${i % 10 ? 18 : 6}" width="1.5" height="${i % 10 ? 12 : 24}" fill="${MID}"/>`).join(''));
      const hall = () => [R(0, 0, 1280, 720, '#f7f8f9', { fill2: '#dce0e4', gradType: 'radial' }), R(0, 0, 12, 720, OR), scene(ruler, 60, 676, 1160, 30)];
      const H2 = (t, x, y, w, h, size, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color: INK, fontWeight: 700, lineHeight: 1.04, ...p });
      const label = (no, t, sub, x, y, w, h = 104) => card(`<div style="font-family:${MONO};font-size:13px;color:${OR};letter-spacing:2px">${no}</div>`
        + `<div style="font-family:${H};font-size:22px;font-weight:700;color:${INK};margin-top:2px">${t}</div><div style="font-size:16px;color:${MID};margin-top:2px">${sub}</div>`,
        x, y, w, h, CARD, { radius: 4, pad: [10, 16, 10, 16], borderColor: LINE });
      const SUITS = [['mercury-spacesuit', '1961', 'Mercury', 'Un traje de avión, plateado'], ['gemini-spacesuit', '1965', 'Gemini', 'El primer paseo espacial'],
        ['astronaut', '1969', 'Apolo', 'Para andar por la Luna'], ['mark-iii-spacesuit', '1988', 'Mark III', 'Prototipo rígido'],
        ['advanced-crew-escape-suit', '1994', 'ACES', 'El naranja del despegue']];

      return numbered(ink2(build({ name: 'Trajes espaciales: sesenta años', palette: 'grayscale', fonts: 'tech', title: { color: INK, size: 46 }, body: { color: INK } }, [
        { layout: 'blank', back: hall(), transition: 'fade', extra: [
          kicker('SALA 3 · EXPOSICIÓN TEMPORAL', 80, 130, 600, OR),
          H2('Trajes<br>espaciales', 74, 170, 640, 250, 108),
          text('Sesenta años vistiendo a quien sale de la Tierra', 80, 430, 560, 90, { fontSize: 30, color: MID }),
          text('1961 — 2026', 80, 545, 400, 50, { fontFamily: MONO, fontSize: 32, color: OR, fontWeight: 700 }),
          n3d('gemini-spacesuit', 720, 50, 460, 610, { autoRotate: true, spin: 12, edge: 'fade' }),
          text('Modelos 3D: NASA 3D Resources (uso libre)', 900, 640, 300, 26, { fontSize: 12, color: MID, textAlign: 'right' })],
          notes: 'El traje de la misión Gemini gira solo y despacio (Modelo 3D ▸ Girar solo, 12 °/s) y tiene los bordes difuminados, como si saliera de la luz de la vitrina. Los modelos se cargan de internet al presentar.' },

        { title: 'Una pieza, tres miradas', layout: 'titleOnly', back: hall(), extra: [
          ...[['back', 'DE FRENTE', 'Las tomas de oxígeno y de ventilación, en el pecho, a mano de las dos manos.'],
            ['side', 'DE LADO', 'Bolsillos en los muslos para las listas de comprobación y una linterna.'],
            ['front', 'POR DETRÁS', 'El arnés del paracaídas: el traje del despegue es también un traje de rescate.']].flatMap(([v, t, d], i) => { const x = 80 + i * 380;
            return [R(x, 175, 340, 470, CARD, { radius: 4, stroke: LINE, strokeWidth: 1 }),
              n3d('advanced-crew-escape-suit', x + 30, 190, 280, 300, { view: v }),
              text(`<div style="font-family:${MONO};font-size:14px;color:${OR};letter-spacing:2px">${t}</div><div style="margin-top:6px">${d}</div>`, x + 20, 505, 300, 130, { fontSize: 18, color: INK, lineHeight: 1.35 })]; })],
          notes: 'El mismo modelo tres veces, cada uno con su vista de cámara (Modelo 3D ▸ Vista). Este modelo se hizo mirando hacia atrás: su pecho se ve con «Por detrás» y su espalda con «De frente». Al presentar se puede girar cada uno con el ratón para mirar lo que no se ve.' },

        { title: 'Cinco trajes, cinco épocas', layout: 'titleOnly', back: hall(), extra: [
          R(80, 561, 1120, 3, INK),
          ...SUITS.flatMap(([id, y, n, d], i) => { const x = 80 + i * 228;
            return [withAnims(n3d(id, x + 4, 200, 200, 340, { autoRotate: true, spin: 18 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 450 })),
              withAnims(E(x + 94, 552, 20, 20, OR), A('zoom-in', { start: 'withPrev', duration: 300 })),
              withAnims(text(`<div style="font-family:${MONO};font-size:22px;color:${OR};font-weight:700">${y}</div><div style="font-family:${H};font-size:22px;font-weight:700">${n}</div><div style="font-size:15px;color:${MID}">${d}</div>`,
                x, 582, 208, 96, { fontSize: 16, color: INK, textAlign: 'center', lineHeight: 1.25 }), A('fade-in', { start: 'withPrev', duration: 300 }))]; })],
          notes: 'Un clic y los cinco trajes aparecen uno tras otro, cada uno girando sobre sí mismo como en una peana. Años redondeados al del primer uso o presentación.' },

        { layout: 'blank', back: hall(), extra: [
          kicker('PIEZA 12 · EL CASCO', 80, 140, 500, OR),
          H2('Una burbuja<br>con visera', 76, 180, 640, 200, 76),
          text('Es lo primero que imaginamos al pensar en un astronauta. Pasa a la siguiente diapositiva: la pieza se acerca y da una vuelta para que la veas entera.', 80, 390, 560, 150, { fontSize: 24, color: MID }),
          R(890, 610, 280, 36, '#cfd4d9', { radius: 4 }), R(910, 646, 240, 10, '#b4bac1'),
          same(helmet, n3d('helmet', 900, 360, 260, 260, { view: 'front' })),
          label('VITRINA 4', 'Casco de paseo espacial', 'Policarbonato y visor dorado', 870, 180, 320)],
          notes: 'El casco está pequeño en su vitrina. La diapositiva siguiente tiene el mismo modelo (el mismo objeto) y la transición Transformar.' },

        { layout: 'blank', back: hall(), autoAnimate: true, extra: [
          same(helmet, n3d('helmet', 70, 80, 600, 580, { view: 'three', arrive: 'turn' })),
          ...[['Visor dorado', 'Una capa finísima de oro filtra el sol y el calor.'], ['Burbuja de policarbonato', 'Aguanta golpes y deja ver en todas direcciones.'],
            ['Luces y cámara', 'Van encima, para trabajar en la sombra de la nave.'], ['Ventilación', 'El oxígeno entra por la nuca y barre el vaho.']].map(([t, d], i) =>
            withAnims(text(`<div style="font-family:${H};font-size:24px;font-weight:700"><span style="color:${OR}">0${i + 1}</span>&nbsp; ${t}</div><div style="color:${MID};margin-top:4px">${d}</div>`,
              720, 120 + i * 130, 480, 110, { fontSize: 20, color: INK, bg: CARD, radius: 4, pad: [14, 18, 14, 18], borderColor: LINE }), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 450 })))],
          notes: 'Transformar con 3D: el casco viaja desde su vitrina, crece y da una vuelta completa hasta la vista de tres cuartos (Modelo 3D ▸ Desde la anterior ▸ Dar una vuelta hasta su vista). Luego, con un clic, sus cuatro partes una tras otra.' },

        { layout: 'blank', back: hall(), extra: [
          pollBlock({ kind: 'quiz', question: '¿Por qué el visor del casco es dorado?', options: ['Para filtrar la luz y el calor del sol', 'Para que se vea mejor en las fotos', 'Porque el oro no se oxida al sol'], correct: [0], time: 20, fontSize: 32, x: 80, y: 60, w: 1120, h: 590 })],
          notes: 'Pregunta con tiempo desde el móvil. Una capa de oro de pocas millonésimas de milímetro refleja buena parte de la luz y del calor del sol sin dejar de ser transparente.' },

        { title: 'El guante, lo más difícil', layout: 'titleOnly', back: hall(), extra: [
          R(80, 175, 460, 470, CARD, { radius: 4, stroke: LINE, strokeWidth: 1 }),
          n3d('astronaut-glove', 100, 195, 420, 380, { view: 'three', motion: 'zoom' }),
          text('Hinchado, cada cierre de la mano cuesta: es como apretar una pelota.', 100, 585, 420, 50, { fontSize: 16, color: MID }),
          H2('30 kPa', 600, 170, 300, 80, 64, { color: OR }),
          text('de presión dentro del traje', 600, 250, 560, 40, { fontSize: 22, color: MID }),
          chartBlock({ x: 590, y: 300, w: 620, h: 340, chartType: 'hbar', color: MID, dataLabels: true, labelWidth: 38, yMax: 100,
            data: [{ label: 'Mano desnuda', value: 100, color: INK }, { label: 'Guante sin hinchar', value: 82 }, { label: 'Guante hinchado', value: 58, color: OR }, { label: 'Tras 6 h de trabajo', value: 45, color: '#b33c06' }] })],
          notes: 'El guante se acerca al entrar en la diapositiva (Modelo 3D ▸ Vista ▸ Al entrar ▸ Acercar al entrar). El gráfico es la fuerza de agarre en % de la de la mano desnuda: cifras ilustrativas, no de un ensayo real.' },

        { title: 'Más ligeros… y más pesados', layout: 'titleOnly', back: hall(), extra: [
          tableBlock({ x: 80, y: 180, w: 560, h: 430, fontSize: 22, header: true, headBg: INK, headFg: '#ffffff', stroke: LINE, banded: true, band: OR, bandAlpha: 0.07, colW: [4, 2, 3],
            rows: [['Traje', 'Año', 'Masa (kg)'], ['Mercury', '1961', '10'], ['Gemini', '1965', '15'], ['Apolo', '1969', '90'], ['Mark III', '1988', '55'], ['ACES', '1994', '13'], ['Media', '', '=PROMEDIO(C2:C6)']] }),
          chartBlock({ x: 680, y: 170, w: 520, h: 400, chartType: 'bar', color: OR, dataLabels: true, grid: true, yTitle: 'kg',
            data: [{ label: 'Mercury', value: 10 }, { label: 'Gemini', value: 15 }, { label: 'Apolo', value: 90 }, { label: 'Mark III', value: 55 }, { label: 'ACES', value: 13 }] }),
          text('El traje lunar pesa seis veces más que el de Gemini: lleva a la espalda la mochila que lo mantiene con vida.', 680, 585, 520, 60, { fontSize: 18, color: MID })],
          notes: 'La media de la tabla es una fórmula (=PROMEDIO(C2:C6)): si se corrige una masa, se recalcula. Masas aproximadas y redondeadas, con el equipo que llevaba cada traje.' },

        { layout: 'blank', back: hall(), transition: 'fade', extra: [
          n3d('mark-iii-spacesuit', 740, 70, 440, 580, { view: 'three', motion: 'float', edge: 'fade' }),
          kicker('HASTA EL 31 DE ENERO', 80, 180, 600, OR),
          H2('Ven a verlos<br>de cerca', 76, 220, 640, 200, 84),
          text('Sala 3 · martes a domingo, de 10:00 a 19:00 · entrada libre', 80, 430, 600, 70, { fontSize: 24, color: MID }),
          label('VISITAS GUIADAS', 'Sábados a las 12:00', 'Con un ingeniero de trajes jubilado', 80, 520, 420),
          text('Modelos 3D: NASA 3D Resources (uso libre). Cifras redondeadas.', 760, 640, 420, 26, { fontSize: 12, color: MID, textAlign: 'right' })],
          notes: 'Cierre con el prototipo Mark III flotando arriba y abajo (Modelo 3D ▸ Vista ▸ Al entrar ▸ Flotar).' },
      ]), INK));
    } },

  // ============================================================================
  // 2 · A dance class taught by the robot: a studio with a mirror, a barre and a
  //     wooden floor; its own clips by counts, slow motion to learn, a walk over
  //     the tape marks and a formation that changes with Transform.
  show_3d_dance: { name: 'Clase de baile con el robot', cat: 'showcase',
    summary: 'Clips de un personaje 3D por tiempos, cámara lenta, desplazamiento por las marcas del suelo, formación con Transformar y cuenta atrás',
    make: () => {
      const W = '#ffffff', PINK = '#ff4fa3', YEL = '#fee440', CY = '#00e0ff', DIM = '#cbbde6', WALL = '#2b1a47', BG = '#1a0f2e';
      const B = FF.bebas, r1 = uid(), r2 = uid(), r3 = uid(), t1 = uid(), t2 = uid(), t3 = uid(), robot = lib3d('three-RobotExpressive');
      // (The barre only from barX on: on slides with text on the left it stays behind the robot.)
      const studio = (floorY = 500, barX = 30) => [R(0, 0, 1280, floorY, WALL, { fill2: BG, gradAngle: 90 }),
        ...[0, 1, 2, 3].map(i => R(50 + i * 300, 50, 280, floorY - 110, '#ffffff', { opacity: 5, fill2: '#bba6ff', gradAngle: 45 })),
        R(barX, floorY - 160, 1250 - barX, 10, '#d9b38c', { radius: 5 }), ...[160, 640, 1120].filter(x => x > barX).map(x => R(x, floorY - 152, 8, 152, '#a9825d')),
        R(0, floorY, 1280, 720 - floorY, '#8a5a34', { fill2: '#3f2414', gradAngle: 90 }),
        ...Array.from({ length: Math.ceil((720 - floorY) / 36) }, (_, k) => R(0, floorY + 36 * (k + 1), 1280, 2, '#000000', { opacity: 18 }))];
      const tape = (x, y, c = PINK, p = {}) => text('✕', x, y, 60, 40, { fontSize: 34, color: c, textAlign: 'center', fontWeight: 700, ...p });
      const H = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: B, fontSize: size, color, lineHeight: 1, ...p });
      const count = (n, x, y, c) => text(String(n), x, y, 64, 64, { fontFamily: B, fontSize: 40, color: BG, bg: c, radius: 10, textAlign: 'center', vAlign: 'middle' });

      return numbered(ink2(build({ name: 'Clase de baile con el robot', palette: 'violet', fonts: 'bold', title: { color: W, size: 64 }, body: { color: W } }, [
        { layout: 'blank', bg: BG, back: studio(500, 700), transition: 'fade', extra: [
          kicker('ACADEMIA COMPÁS · NIVEL INICIAL', 80, 110, 640, CY, { letterSpacing: 4 }),
          H('La coreografía', 74, 150, 660, 130, 128),   // (660 wide: right-aligned in Arabic, it stays clear of the robot)
          H('del robot', 76, 275, 660, 130, 128, PINK),
          text('Bloque 1 · ocho tiempos, un desplazamiento y una formación', 80, 420, 560, 70, { fontSize: 24, color: DIM }),
          ...[5, 6, 7, 8].map((n, i) => count(n, 80 + i * 80, 560, [YEL, PINK, CY, W][i])),
          m3d('three-RobotExpressive', 760, 90, 400, 560, { clip: 'Dance', bleed: 1.3, view: 'front' })],
          notes: 'El robot baila en bucle (Modelo 3D ▸ Animación ▸ En reposo: «Dance»), con margen para que los brazos no se corten al salir de su caja. El estudio (espejos, barra y tarima) son formas con degradado.' },

        (() => {   // Warm-up by counts: each click, one of the robot's clips and the two counts it takes.
          const STEPS = [['Yes', 'Asentir', 'Cabeza arriba y abajo'], ['No', 'Negar', 'De lado a lado, sin prisa'], ['Jump', 'Saltar', 'Rodillas blandas al caer'], ['ThumbsUp', '¡Bien!', 'Pulgar arriba, a cámara']];
          // (Made in turn, clip and label, so that each label comes with its own clip: the play order is the order made.)
          const pairs = STEPS.map(([c]) => [clip(c, { duration: 1500 }), A('fade-left', { start: 'withPrev', duration: 400 })]);
          return { title: 'Calentamiento por tiempos', layout: 'titleOnly', bg: BG, back: studio(560), extra: [
            withAnims(m3d('three-RobotExpressive', 120, 170, 380, 480, { clip: 'Idle', bleed: 1.3 }), ...pairs.map(q => q[0])),
            ...STEPS.flatMap(([, n, d], i) => { const y = 180 + i * 116, c = [YEL, PINK, CY, W][i];
              return [count(2 * i + 1, 640, y, c), count(2 * i + 2, 716, y, c),
                withAnims(text(`<div style="font-family:${B};font-size:38px;color:${c};line-height:1">${n}</div><div style="font-size:18px;color:${DIM}">${d}</div>`, 806, y - 4, 400, 80, { fontSize: 18, color: W }), pairs[i][1])]; })],
            notes: 'Cada clic hace dos cosas a la vez: el robot hace una animación suya una vez (efecto «Animación del modelo 3D»: «Yes», «No», «Jump», «ThumbsUp») y aparece el nombre del paso junto a sus dos tiempos. Al acabar cada una vuelve al reposo.' };
        })(),

        { title: 'Primero, a cámara lenta', layout: 'titleOnly', bg: BG, back: studio(560), extra: [
          ...[[1, 'A tempo', '120 pulsaciones por minuto', CY], [0.4, 'Al 40 %', 'Para aprender el paso', PINK]].flatMap(([sp, n, d, c], i) => { const x = 110 + i * 560;
            return [m3d('three-RobotExpressive', x + 60, 160, 360, 400, { clip: 'Dance', clipSpeed: sp, bleed: 1.3 }),
              text(`<div style="font-family:${B};font-size:44px;color:${c};line-height:1">${n}</div><div style="font-size:20px;color:${W}">${d}</div>`, x, 590, 480, 90, { textAlign: 'center', fontSize: 20 })]; }),
          R(639, 190, 2, 470, W, { opacity: 25 })],
          notes: 'El mismo baile a dos velocidades (Modelo 3D ▸ Movimiento 3D ▸ Velocidad: 1 y 0,4). Se ensaya primero lento, mirando el de la derecha, y luego a tempo.' },

        (() => {   // The travelling step: from mark to mark across the floor, then a wave.
          const route = [[230, 40], [470, -10], [700, 30]];
          return { title: 'El desplazamiento', layout: 'titleOnly', bg: BG, back: studio(470), extra: [
            text('Del 1 al 8: cruza en diagonal pisando las marcas y saluda al llegar.', 100, 160, 900, 50, { fontSize: 26, color: DIM }),
            ...[[180, 640], [410, 680], [650, 630], [880, 670]].map(([x, y], i) => tape(x, y, i === 3 ? YEL : PINK)),
            ink(curvePts([210, 660], route), PINK, 3, { opacity: 45 }),
            withAnims(m3d('three-RobotExpressive', 100, 300, 220, 360, { walk: { clip: robot.walk, end: 'Wave', endOnce: true, face: true, look: true } }), path(route, { duration: 3600 })),
            text('Clic', 1010, 165, 110, 40, { fontSize: 20, color: BG, bg: YEL, radius: 20, textAlign: 'center', vAlign: 'middle' })],
          notes: 'Un clic: el robot anda por el recorrido dibujado (Animaciones ▸ Dibujar recorrido), mira hacia donde va mientras camina y, al llegar a la marca amarilla, se vuelve hacia el público y saluda (Modelo 3D ▸ Movimiento 3D ▸ Mientras se mueve y Al terminar el recorrido).' };
        })(),

        { layout: 'blank', bg: BG, back: studio(430), extra: [
          H('Formación en línea', 80, 60, 900, 80, 72),
          text('Tres bailarines, a la misma distancia. Pasa a la siguiente: cambiamos a triángulo.', 80, 140, 900, 40, { fontSize: 24, color: DIM }),
          same(t1, tape(220, 578)), same(t2, tape(610, 578)), same(t3, tape(1000, 578)),
          // (arrive 'reset': not the robot that walked on the slide before, which would hand them its angle mid-walk.)
          same(r1, m3d('three-RobotExpressive', 120, 300, 260, 360, { clip: 'Idle', arrive: 'reset' })), same(r2, m3d('three-RobotExpressive', 510, 300, 260, 360, { clip: 'Idle', arrive: 'reset' })),
          same(r3, m3d('three-RobotExpressive', 900, 300, 260, 360, { clip: 'Idle', arrive: 'reset' }))],
          notes: 'Tres robots y tres marcas. La siguiente diapositiva tiene los mismos objetos en otro sitio, con Transformar.' },

        { layout: 'blank', bg: BG, back: studio(430), autoAnimate: true, extra: [
          H('Formación en triángulo', 80, 60, 900, 80, 72, PINK),
          text('El del centro avanza; los de los lados se abren hacia atrás.', 80, 140, 900, 40, { fontSize: 24, color: DIM }),
          same(t1, tape(290, 490)), same(t2, tape(600, 586)), same(t3, tape(910, 490)),
          same(r1, m3d('three-RobotExpressive', 220, 260, 200, 300, { clip: 'Dance', arrive: 'keep' })), same(r2, m3d('three-RobotExpressive', 480, 250, 300, 420, { clip: 'Dance' })),
          same(r3, m3d('three-RobotExpressive', 840, 260, 200, 300, { clip: 'Dance' }))],
          notes: 'Transformar con 3D: cada robot va de su sitio en línea a su sitio en el triángulo, crece o se encoge, y al llegar empieza a bailar. Las marcas del suelo viajan con ellos.' },

        { title: 'Ensayo libre', layout: 'titleOnly', bg: BG, back: studio(600), extra: [
          text(ul('Por parejas: uno baila y el otro cuenta en voz alta', 'Primero al 40 %, luego a tempo', 'Mirad al espejo, no a los pies', 'Al acabar, cambiad los papeles'), 90, 180, 640, 360, { fontSize: 28, color: W }),
          timer(180, 820, 170, 360, { style: 'digital', color: YEL, auto: false, h: 160 }),
          text('Pulsa el reloj cuando suene la música', 800, 350, 400, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
          notes: 'Cuenta atrás de 3 minutos en estilo digital; no arranca sola, se pulsa cuando todo el mundo tiene pareja.' },

        { layout: 'blank', bg: BG, back: studio(640), extra: [
          pollBlock({ kind: 'rating', question: 'Del 1 al 5: ¿cómo te ha salido el bloque 1?', options: [], fontSize: 34, x: 80, y: 60, w: 1120, h: 540 })],
          notes: 'Valoración anónima desde el móvil: si la media baja de 3, el próximo día se repite el bloque antes de pasar al 2.' },

        { layout: 'blank', bg: BG, back: studio(500, 700), transition: 'zoom', extra: [
          withAnims(m3d('three-RobotExpressive', 760, 90, 400, 560, { clip: 'Idle', bleed: 1.3 }), clip('ThumbsUp', { start: 'afterPrev', duration: 1800 })),
          H('¡Bien hecho!', 74, 120, 700, 140, 120, YEL),
          text('Muestra final del trimestre: viernes 19, a las 19:00, en la sala grande.', 80, 270, 560, 90, { fontSize: 28, color: W }),
          text('Trae ropa cómoda y agua · la entrada es libre para las familias', 80, 375, 560, 70, { fontSize: 22, color: DIM }),
          text('Robot 3D: Tomás Laulhé y Don McCurdy (CC0)', 80, 640, 600, 28, { fontSize: 13, color: DIM })],
          notes: 'Al llegar, el robot levanta el pulgar una vez él solo (primera animación «después de la anterior») y vuelve al reposo.' },
      ]), W));
    } },

  // ============================================================================
  // 3 · A nature documentary: letterbox bars, a timecode and subtitles; the fox
  //     keeps watch, crosses a clearing walking and runs; camera-trap frames
  //     from four angles, its territory, its day in a chart.
  show_3d_fox: { name: 'Documental: un día con el zorro', cat: 'showcase',
    summary: 'Documental con 3D: el zorro vigila, cruza un claro andando y corre, fotos de cámara trampa desde cuatro ángulos, mapa y gráficos',
    make: () => {
      const W = '#ffffff', SUB = '#fff3c4', BAR = '#000000', AMB = '#f2a541', MOSS = '#a7c957', DIM = '#c9d6c3';
      const S = FF.merri;
      // Layers of pines over a sky: the same every time (a seed).
      const forest = (sky1, sky2, layers, seed = 7, ground = null) => { const r = rng(seed);
        const pine = (x, by, h, c) => { const w = h * 0.42; return `<polygon points="${x},${by - h} ${x - w / 2},${by - h * 0.3} ${x - w * 0.18},${by - h * 0.3} ${x - w * 0.62},${by} ${x + w * 0.62},${by} ${x + w * 0.18},${by - h * 0.3} ${x + w / 2},${by - h * 0.3}" fill="${c}"/>`; };
        return svgURL(1280, 580, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs><rect width="1280" height="580" fill="url(#s)"/>`
          + layers.map(([c, by, hmin, hmax, n]) => `<rect x="0" y="${by}" width="1280" height="${580 - by}" fill="${c}"/>` + Array.from({ length: n }, () => pine(r() * 1320 - 20, by + 4, hmin + r() * (hmax - hmin), c)).join('')).join('')
          + (ground ? `<rect x="0" y="${ground[1]}" width="1280" height="${580 - ground[1]}" fill="${ground[0]}"/>` : ''));
      };
      const DAWN = forest('#f7c27a', '#6f9a8d', [['#5d8077', 330, 60, 150, 26], ['#3d5e57', 390, 80, 190, 22], ['#22392f', 460, 110, 240, 16]], 11);
      const NOON = forest('#bfe3f2', '#e9f3d8', [['#7fa36b', 300, 60, 140, 24], ['#557a45', 350, 80, 170, 18]], 5, ['#b9d27f', 420]);
      const DUSK = forest('#e98a5d', '#5a4a6b', [['#6a5a73', 320, 60, 140, 26], ['#3e344a', 380, 90, 200, 20], ['#211b29', 470, 120, 240, 14]], 23);
      const film = (tc, chapter) => [R(0, 0, 1280, 70, BAR), R(0, 650, 1280, 70, BAR),
        text(chapter, 40, 18, 760, 34, { fontSize: 16, letterSpacing: 4, color: AMB, fontWeight: 700 }),
        text(tc, 1000, 18, 240, 34, { fontFamily: FF.mono, fontSize: 16, color: '#bbbbbb', textAlign: 'right' })];
      const sh = (t, s = '0 2px 8px #000000aa') => `<span style="text-shadow:${s}">${t}</span>`;
      const subtitle = (t, y = 560) => text(t, 140, y, 1000, 76, { fontSize: 25, color: SUB, textAlign: 'center', vAlign: 'middle', bg: '#000000a6', radius: 6, pad: [6, 18, 6, 18] });
      const fox = lib3d('kh-Fox');
      const TREES = rng(17);   // (one sequence for the woods on the map)

      return numbered(ink2(build({ name: 'Documental: un día con el zorro', palette: 'forest', fonts: 'editorial', title: { color: W }, body: { color: W } }, [
        { layout: 'blank', bg: BAR, transition: 'fade', back: [scene(DAWN, 0, 70, 1280, 580)], extra: [
          ...film('00:00:00:00', 'UNA SERIE DE NATURALEZA · EPISODIO 3'),
          text(sh('El zorro', '0 4px 18px #00000088'), 80, 150, 700, 130, { fontFamily: S, fontSize: 104, color: W, fontWeight: 700 }),
          text(sh('Un día cualquiera en el bosque'), 84, 285, 640, 60, { fontFamily: S, fontSize: 34, fontStyle: 'italic', color: '#fff6e6' }),
          m3d('kh-Fox', 640, 300, 560, 340, { clip: fox.rest, view: 'side', edge: 'fade' })],
          notes: 'Portada de documental: bandas negras de cine, código de tiempo y un bosque al amanecer dibujado en SVG. El zorro mira alrededor en bucle (su animación «Survey») con los bordes difuminados.' },

        { layout: 'blank', bg: BAR, transition: 'fade', back: [scene(DAWN, 0, 70, 1280, 580), R(0, 70, 1280, 580, '#000000', { opacity: 15 })], extra: [
          ...film('00:05:40:12', '05:40 · AMANECER'),
          m3d('kh-Fox', 260, 110, 760, 460, { clip: fox.rest, view: 'three', motion: 'swing' }),
          card(`<div style="font-family:${S};font-size:24px;font-weight:700;color:${AMB}">Orejas</div><div>Giran por separado, como dos antenas.</div>`, 960, 110, 280, 130, '#00000077', { fontSize: 18, color: W, radius: 8, pad: [12, 16, 12, 16] }),
          subtitle('Antes de salir del refugio, escucha. Si oye a un ratón bajo la hierba, sabrá dónde está sin verlo.')],
          notes: 'La cámara se balancea despacio al llegar (Modelo 3D ▸ Vista ▸ Al entrar ▸ Balanceo), como un plano de documental hecho con trípode.' },

        (() => {   // Crossing the clearing: it walks along a curve, the route is drawn under it as it goes.
          const route = [[260, 30], [520, -20], [800, 40]];
          return { layout: 'blank', bg: BAR, transition: 'fade', back: [scene(NOON, 0, 70, 1280, 580)], extra: [
            ...film('00:08:15:03', '08:15 · CRUZAR EL CLARO'),
            withAnims(ink(curvePts([170, 545], route), '#6b4f2a', 5, { opacity: 55 }), A('draw', { duration: 4200 })),
            withAnims(m3d('kh-Fox', 40, 400, 260, 190, { view: 'front', walk: { clip: fox.walk, end: fox.rest, face: true, look: false } }), path(route, { start: 'withPrev', duration: 4200 })),
            subtitle('A pleno día cruza el claro sin correr: prefiere el borde del bosque, donde nadie lo ve.', 80)],
          notes: 'Un clic: el zorro anda por el recorrido con su animación de andar y se gira según el camino (Modelo 3D ▸ Mientras se mueve: «Walk»). A la vez se dibuja su rastro (efecto «Dibujar» con la anterior). Al llegar, vuelve a vigilar.' };
        })(),

        (() => {   // Running: the same fox, faster clip, a quicker path; how fast compared with others.
          const route = [[420, -30], [900, 10]];
          return { layout: 'blank', bg: BAR, transition: 'fade', back: [scene(NOON, 0, 70, 1280, 580), R(0, 70, 1280, 580, '#ffffff', { opacity: 8 })], extra: [
            ...film('00:12:00:20', '12:00 · ¡A CORRER!'),
            R(700, 95, 520, 300, '#fffaf0', { opacity: 88, radius: 10 }),
            text('Velocidad punta (km/h)', 724, 105, 470, 34, { fontSize: 18, color: '#7a4a10', fontWeight: 700 }),
            chartBlock({ x: 720, y: 140, w: 480, h: 245, chartType: 'hbar', color: '#6c8f5a', dataLabels: true, labelWidth: 34,
              data: [{ label: 'Liebre', value: 70 }, { label: 'Zorro', value: 50, color: AMB }, { label: 'Corzo', value: 45 }, { label: 'Persona', value: 15 }] }),
            withAnims(m3d('kh-Fox', 60, 370, 240, 170, { view: 'front', walk: { clip: 'Run', end: fox.rest, face: true, look: false } }), path(route, { duration: 1700, sound: 'whoosh' })),
            subtitle('Algo lo ha asustado. En dos segundos está al otro lado.', 565)],
          notes: 'La misma idea que la anterior con otra animación del modelo: «Run» mientras se mueve y un recorrido más corto en tiempo (1,7 s), con un silbido. Velocidades aproximadas.' };
        })(),

        { layout: 'blank', bg: '#f1ead8', transition: 'fade', extra: [
          ...film('00:16:30:00', 'SU TERRITORIO'),
          img(svgURL(640, 520, '<rect width="640" height="520" fill="#e6dcc0"/>'
            + '<path d="M0 300 C120 260 200 340 320 300 S520 220 640 260" stroke="#5b8fb9" stroke-width="14" fill="none" stroke-linecap="round"/>'
            + Array.from({ length: 40 }, (_, i, a, r = TREES) => { const x = 30 + r() * 580, y = 30 + r() * 220; return `<circle cx="${x}" cy="${y}" r="${10 + r() * 10}" fill="#7a9a5c" opacity=".8"/>`; }).join('')
            + '<path d="M90 120 C180 40 430 60 540 140 C610 200 600 380 500 430 C380 490 170 470 100 380 C50 300 40 190 90 120 Z" fill="#d1495b" fill-opacity=".10" stroke="#d1495b" stroke-width="4" stroke-dasharray="14 10"/>'
            + '<circle cx="250" cy="380" r="16" fill="#3b2a1a"/>'
            + [[180, 180], [420, 130], [520, 360], [330, 450]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#f2a541" stroke="#3b2a1a" stroke-width="2"/>`).join('')
            + '<rect x="20" y="470" width="120" height="8" fill="#3b2a1a"/><text x="150" y="480" font-family="sans-serif" font-size="18" fill="#3b2a1a">500 m</text>'),
            70, 100, 640, 520, 'Mapa del territorio: la madriguera, el arroyo y cuatro puntos marcados en el borde'),
          // (Narrow boxes: in Arabic the text sits at their right end, and it should stay next to its point.)
          onPic('Madriguera', 70 + 275, 100 + 388, 22, '#3b2a1a', { fontWeight: 700, w: 150 }), onPic('arroyo', 70 + 400, 100 + 232, 20, '#2f5d7c', { fontStyle: 'italic', w: 110 }),
          text('Unas 300 hectáreas', 760, 100, 460, 50, { fontFamily: S, fontSize: 34, fontWeight: 700, color: '#3b2a1a' }),
          text('Marca el borde con olor en puntos fijos (en naranja) y lo recorre casi cada noche.', 760, 150, 460, 70, { fontSize: 20, color: '#5a4b3a' }),
          chartBlock({ x: 750, y: 235, w: 470, h: 400, chartType: 'doughnut',
            data: [{ label: 'Roedores', value: 40, color: '#8d6e63' }, { label: 'Frutos', value: 25, color: '#d1495b' }, { label: 'Insectos', value: 15, color: '#edae49' }, { label: 'Aves', value: 10, color: '#00798c' }, { label: 'Otros', value: 10, color: '#a7a7a7' }] })],
          notes: 'Una pausa sin 3D: el territorio dibujado en SVG y una dona con su dieta (porcentajes aproximados, cambian mucho con la estación).' },

        (() => {   // Camera trap: four frames, four angles of the same fox, night vision.
          const SHOTS = [['front', 'CAM 1 · 23:12 · 6 °C', fox.rest], ['back', 'CAM 2 · 01:47 · 4 °C', fox.walk], ['top', 'CAM 3 · 03:05 · 3 °C', fox.rest], ['low', 'CAM 4 · 05:58 · 2 °C', fox.walk]];
          return { layout: 'blank', bg: '#050805', transition: 'fade', extra: [
            ...film('00:21:04:09', 'FOTOTRAMPEO · NOCHE DEL 14 AL 15'),
            ...SHOTS.flatMap(([v, cap, c], i) => { const x = 60 + (i % 2) * 590, y = 90 + Math.floor(i / 2) * 280;
              return [R(x, y, 570, 260, '#132a17', { fill2: '#050a06', gradType: 'radial' }),
                m3d('kh-Fox', x + 135, y + 12, 300, 236, { view: v, clip: c, edge: 'hard', bleed: 1 }),
                R(x, y, 570, 260, '#9cff9c', { opacity: 8 }),
                text(cap, x + 14, y + 10, 340, 28, { fontFamily: FF.mono, fontSize: 15, color: '#b8ffb8' }),
                text('● REC', x + 470, y + 10, 86, 28, { fontFamily: FF.mono, fontSize: 15, color: '#ff5a5a', textAlign: 'right' })]; })],
          notes: 'Cuatro cámaras trampa, cuatro ángulos del mismo modelo: de frente, por detrás, desde arriba y desde abajo (Modelo 3D ▸ Vista). Con bordes de corte recto, como un fotograma, y un velo verde de visión nocturna encima.' };
        })(),

        { layout: 'blank', bg: '#f1ead8', transition: 'fade', extra: [
          ...film('00:24:40:00', 'SU DÍA, EN UN GRÁFICO'),
          text('Más despierto al amanecer y al anochecer', 80, 95, 1120, 50, { fontFamily: S, fontSize: 36, fontWeight: 700, color: '#3b2a1a' }),
          chartBlock({ x: 80, y: 160, w: 1120, h: 470, chartType: 'area', color: '#d1495b', grid: true, yTitle: 'Detecciones por hora', xTitle: 'Hora del día', seriesName: 'Este zorro',
            data: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22'].map((l, i) => ({ label: l + ' h', value: [9, 7, 10, 16, 8, 3, 2, 2, 4, 12, 17, 12][i] })) })],
          notes: 'Detecciones de las cámaras trampa a lo largo de un mes, por hora (datos inventados con la forma típica: crepuscular y nocturno).' },

        { layout: 'blank', bg: '#22392f', extra: [
          ...film('00:27:10:00', 'PREGUNTA'),
          pollBlock({ kind: 'quiz', question: '¿Cuándo es más fácil ver un zorro?', options: ['Al amanecer y al anochecer', 'A mediodía, con buena luz', 'Solo en invierno'], correct: [0], time: 20, fontSize: 32, x: 80, y: 90, w: 1120, h: 540 })],
          notes: 'Quiz con tiempo: la respuesta está en el gráfico anterior.' },

        { layout: 'blank', bg: BAR, transition: 'fade', back: [scene(DUSK, 0, 70, 1280, 580)], extra: [
          ...film('00:29:58:00', 'FIN DEL EPISODIO 3'),
          withAnims(m3d('kh-Fox', 480, 400, 320, 220, { view: 'front', walk: { clip: fox.walk, face: true, look: false } }), path([[300, 10], [560, -10]], { start: 'afterPrev', duration: 4000 }), A('fade-out', { start: 'afterPrev', duration: 600 })),
          text(sh('Mañana, en el episodio 4:<br><i>la nieve</i>'), 80, 120, 640, 140, { fontFamily: S, fontSize: 44, color: W }),
          credits(['kh-Fox'], 80, 600, 1120, '#e8dccb', { fontSize: 11 })],
          notes: 'El zorro se aleja andando solo al llegar a la diapositiva (la primera animación va «después de la anterior») y desaparece al final, como el último plano de un documental.' },
      ]), W));
    } },

  // ============================================================================
  // 4 · A course for delivery drivers: roads seen from above, Spanish road signs
  //     drawn in SVG; the lorry goes round the roundabout with its wheels turning,
  //     its blind spots (from three-quarters to above with Transform), figures.
  show_3d_truck: { name: 'Reparto: rotondas sin sustos', cat: 'showcase',
    summary: 'Camión 3D que recorre la rotonda girando las ruedas, vista desde arriba con Transformar, señales dibujadas, gráfico, tabla y ordenar',
    make: () => {
      const ASPH = '#3a3e44', ASPH2 = '#2a2d32', LANE = '#f4f4f4', YEL = '#ffcc00', BLUE = '#1d5fbf', RED = '#d7263d', GRASS = '#5f9e4f', PAPER = '#f2f3f5', INK = '#1d232b', MID = '#5d6670';
      const I = FF.inter, truck = uid(), CX = 640, CY = 390;
      // Signs, drawn: the roundabout (blue, three arrows), give way, the indicator.
      const signRound = svgURL(200, 200, '<circle cx="100" cy="100" r="96" fill="#ffffff"/><circle cx="100" cy="100" r="88" fill="' + BLUE + '"/>'
        + [0, 120, 240].map(a => `<g transform="rotate(${a} 100 100)"><path d="M100 36 A64 64 0 0 1 152 64" stroke="#fff" stroke-width="15" fill="none"/><polygon points="164,48 166,84 136,72" fill="#fff"/></g>`).join(''));
      const signYield = svgURL(200, 200, '<polygon points="10,20 190,20 100,182" fill="#ffffff" stroke="' + RED + '" stroke-width="18" stroke-linejoin="round"/>');
      const signBlink = svgURL(200, 200, '<rect x="8" y="8" width="184" height="184" rx="30" fill="#2b2b2b"/><polygon points="60,70 120,70 120,40 172,100 120,160 120,130 60,130" fill="#ffb000"/>');
      // The roundabout from above, a whole slide.
      const roads = svgURL(1280, 720, `<rect width="1280" height="720" fill="${GRASS}"/>`
        + `<rect x="0" y="${CY - 85}" width="1280" height="170" fill="${ASPH}"/><rect x="${CX - 85}" y="0" width="170" height="720" fill="${ASPH}"/>`
        + `<circle cx="${CX}" cy="${CY}" r="250" fill="${ASPH}"/><circle cx="${CX}" cy="${CY}" r="250" fill="none" stroke="#d9d9d9" stroke-width="4"/>`
        + `<circle cx="${CX}" cy="${CY}" r="110" fill="#6fb35b" stroke="#e8e8e8" stroke-width="10"/><circle cx="${CX}" cy="${CY}" r="180" fill="none" stroke="${LANE}" stroke-width="4" stroke-dasharray="22 18"/>`
        + [[0, CY, CX - 250, CY], [CX + 250, CY, 1280, CY], [CX, 0, CX, CY - 250], [CX, CY + 250, CX, 720]].map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${LANE}" stroke-width="4" stroke-dasharray="30 22"/>`).join('')
        + [[CX + 20, CY + 248, 0], [CX - 248, CY + 20, 90], [CX - 20, CY - 248, 180], [CX + 248, CY - 20, 270]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})">${[0, 1, 2, 3].map(k => `<polygon points="${x + 6 + k * 16},${y + 8} ${x + 18 + k * 16},${y + 8} ${x + 12 + k * 16},${y + 20}" fill="${LANE}"/>`).join('')}</g>`).join(''));
      const H = (t, x, y, w, h, size, color = '#ffffff', p = {}) => text(t, x, y, w, h, { fontFamily: I, fontSize: size, color, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, ...p });
      const tag = (t, x, y, w, c = YEL, fg = INK) => text(t, x, y, w, 36, { fontSize: 18, fontWeight: 700, color: fg, bg: c, radius: 6, textAlign: 'center', vAlign: 'middle' });
      const dashes = y => Array.from({ length: 12 }, (_, i) => R(40 + i * 110, y, 60, 8, YEL, { radius: 2 }));
      const lorry = (x, y, w, h, props = {}) => same(truck, m3d('kh-CesiumMilkTruck', x, y, w, h, { clip: 'Wheels', ...props }));
      // Round the roundabout: in from the south, counter-clockwise, out by the second exit (north).
      const start = [CX + 42, 640], RAD = 212;
      const ring = [70, 45, 20, -5, -30, -55, -80].map(a => [CX + RAD * Math.cos(a * Math.PI / 180), CY + RAD * Math.sin(a * Math.PI / 180)]);
      const abs = [[CX + 42, 580], [CX + 80, CY + 230], ...ring, [CX + 42, CY - 270], [CX + 42, 60]];
      const rel = abs.map(([x, y]) => [Math.round(x - start[0]), Math.round(y - start[1])]);

      return numbered(ink2(build({ name: 'Reparto: rotondas sin sustos', palette: 'office', fonts: 'clean', title: { color: INK, size: 48, font: I }, body: { color: INK } }, [
        { layout: 'blank', bg: ASPH2, transition: 'fade', back: [R(0, 0, 1280, 720, ASPH, { fill2: ASPH2, gradAngle: 90 }), ...dashes(640)], extra: [
          img(signRound, 80, 90, 110, 110, 'Señal de glorieta'),
          kicker('CURSO PARA CONDUCTORES DE REPARTO · MÓDULO 2', 80, 230, 620, YEL, { fontSize: 16, letterSpacing: 3 }),
          H('Rotondas<br>sin sustos', 74, 270, 600, 220, 96),   // (600 wide: right-aligned in Arabic, clear of the lorry)
          text('Entrar, girar y salir con un vehículo de 7 metros', 80, 500, 600, 50, { fontSize: 26, color: '#c9ced6' }),
          m3d('kh-CesiumMilkTruck', 680, 120, 560, 460, { clip: 'Wheels', view: 'three', motion: 'swing', edge: 'fade' })],
          notes: 'El camión de reparto con sus ruedas girando (su animación «Wheels» en bucle) y un balanceo de cámara al entrar. La señal de glorieta es un dibujo SVG.' },

        { title: 'Tres reglas de oro', layout: 'titleOnly', bg: PAPER, back: [R(0, 690, 1280, 30, ASPH), ...dashes(701).map(d => ({ ...d, h: 6 }))], extra: [
          ...[[signYield, 'Ceda el paso', 'Tiene preferencia quien ya circula dentro de la glorieta.'],
            [signRound, 'Carril exterior', 'Si sales por la primera o la segunda, quédate fuera desde el principio.'],
            [signBlink, 'Intermitente', 'Derecho, justo al pasar la salida anterior a la tuya.']].flatMap(([s, t, d], i) => { const x = 100 + i * 370;
            return chain([img(s, x + 80, 200, 180, 180, t), text(`<div style="font-family:${I};font-size:32px;font-weight:800">${i + 1} · ${t}</div><div style="margin-top:10px;color:${MID}">${d}</div>`, x, 410, 340, 220, { fontSize: 23, color: INK, textAlign: 'center' })],
              'zoom-in', { duration: 350 }, i ? 'afterPrev' : 'click'); })],
          notes: 'Las tres señales y sus reglas aparecen solas una tras otra con un clic. Las señales son dibujos SVG hechos a mano, no imágenes de internet.' },

        { layout: 'blank', bg: GRASS, back: [scene(roads, 0, 0, 1280, 720)], extra: [
          text(`<div style="font-family:${I};font-size:30px;font-weight:800">Salir por la segunda</div><div style="margin-top:6px">Clic: entra, gira en sentido contrario a las agujas del reloj y sale de frente.</div>`, 50, 40, 400, 170, { fontSize: 18, color: '#ffffff', bg: '#1d232bdd', radius: 10, pad: [14, 18, 14, 18] }),
          tag('Salida 1', 1000, CY - 140, 130), tag('Salida 2', CX + 110, 40, 130), tag('Salida 3', 140, CY + 110, 130),
          withAnims(ink(curvePts(start, rel), YEL, 5, { opacity: 85 }), A('draw', { duration: 5200 })),
          withAnims(lorry(start[0] - 70, start[1] - 70, 140, 140, { view: 'top', bleed: 1.3, walk: { clip: 'Wheels', face: true, look: false } }), path(rel, { start: 'withPrev', duration: 5200 }))],
          notes: 'Vista desde arriba (Modelo 3D ▸ Vista ▸ Desde arriba). Un clic: el recorrido amarillo se dibuja mientras el camión lo sigue, girándose según la curva y con las ruedas en marcha (Modelo 3D ▸ Mientras se mueve: «Wheels»; Movimiento 3D ▸ Mirar hacia donde va).' },

        { layout: 'blank', bg: PAPER, extra: [
          pollBlock({ kind: 'order', question: 'Ordena los pasos para salir de una rotonda', options: ['Mirar a la izquierda y ceder el paso', 'Entrar por el carril exterior', 'Intermitente derecho tras la salida anterior', 'Comprobar el retrovisor derecho', 'Salir sin invadir el otro carril'], fontSize: 30, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Actividad de ordenar desde el móvil: cada persona arrastra los pasos y al final se ve cuántos lo han puesto en el orden correcto.' },

        { layout: 'blank', bg: ASPH2, back: [R(0, 0, 1280, 720, ASPH, { fill2: ASPH2, gradAngle: 90 })], extra: [
          lorry(60, 120, 640, 520, { view: 'three' }),
          kicker('LO QUE NO VES', 760, 150, 440, YEL),
          H('El ángulo<br>muerto', 756, 190, 460, 170, 72),
          text('Desde la cabina, un camión de reparto no ve cuatro zonas a su alrededor. Pasa a la siguiente: lo miramos desde arriba.', 760, 380, 440, 150, { fontSize: 22, color: '#c9ced6' })],
          notes: 'El camión en tres cuartos. La diapositiva siguiente tiene el mismo modelo y Transformar: el camión gira hasta verse desde arriba.' },

        { layout: 'blank', bg: '#e9ebee', autoAnimate: true, back: [R(440, 0, 400, 720, ASPH), R(636, 0, 8, 720, LANE, { opacity: 70 })], extra: [
          // (Seen from above the lorry's nose points down: its right is the left of the screen.)
          ...chain([[500, 560, 280, 120], [400, 300, 150, 210], [730, 300, 150, 210], [500, 110, 280, 120]]
            .map(([x, y, w, h]) => R(x, y, w, h, RED, { opacity: 40, radius: 10 })), 'fade-in', { duration: 350 }),
          lorry(520, 220, 240, 300, { view: 'top', arrive: 'view' }),
          ...chain([['Delante', 'Un peatón bajito o un ciclista parado.', 60, 560], ['Derecha', 'La más peligrosa: motos y bicis al girar.', 60, 340], ['Izquierda', 'Menor, pero existe al cambiar de carril.', 900, 340], ['Detrás', 'Sin cámara no ves nada: maniobra con ayuda.', 60, 120]]
            .map(([t, d, x, y]) => text(`<div style="font-family:${I};font-weight:800;color:${RED}">${t}</div><div>${d}</div>`, x, y, 320, 110, { fontSize: 20, color: INK })), 'fade-up', { duration: 350 }),
          H('Las cuatro<br>zonas', 900, 110, 330, 120, 40, INK, { letterSpacing: 0 })],
          notes: 'Transformar con 3D: el camión llega girando hasta la vista desde arriba (Modelo 3D ▸ Desde la anterior ▸ Ir a la vista de esta diapositiva). Con un clic aparecen las cuatro zonas rojas una tras otra; con otro, su explicación.' },

        { title: 'Tu ruta de hoy', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 180, w: 540, h: 420, fontSize: 21, header: true, headBg: INK, headFg: '#ffffff', stroke: '#cfd4da', banded: true, band: YEL, bandAlpha: 0.12, colW: [4, 2, 2],
            rows: [['Parada', 'Glorietas', 'Minutos'], ['Mercado central', '2', '18'], ['Polígono norte', '4', '26'], ['Hospital', '3', '14'], ['Colegio del río', '1', '9'], ['Vuelta al almacén', '3', '22'], ['Total', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
          text('Golpes en rotondas por causa (%)', 680, 175, 520, 34, { fontSize: 20, color: MID, fontWeight: 700 }),
          chartBlock({ x: 670, y: 215, w: 540, h: 390, chartType: 'bar', color: BLUE, dataLabels: true, grid: true,
            data: [{ label: 'Carril interior', value: 38 }, { label: 'No ceder', value: 27 }, { label: 'Ángulo muerto', value: 21 }, { label: 'Velocidad', value: 14 }] })],
          notes: 'Los totales de la tabla son fórmulas (=SUMA(ARRIBA)): trece rotondas y ochenta y nueve minutos. El gráfico es de los partes de la empresa del último año (datos inventados).' },

        { layout: 'blank', bg: ASPH2, transition: 'fade', back: [R(0, 0, 1280, 720, ASPH, { fill2: ASPH2, gradAngle: 90 }), ...dashes(560)], extra: [
          H('Buena ruta', 80, 120, 700, 110, 96, YEL),
          text('Módulo 3, el jueves: marcha atrás y muelles de carga.', 80, 240, 700, 50, { fontSize: 26, color: '#e6e9ee' }),
          withAnims(m3d('kh-CesiumMilkTruck', 80, 360, 300, 220, { view: 'side2', walk: { clip: 'Wheels', face: false, look: false } }), path([[1000, 0]], { start: 'afterPrev', duration: 3500, delay: 400 })),
          credits(['kh-CesiumMilkTruck'], 80, 650, 1120, '#9aa3ad')],
          notes: 'El camión arranca solo al llegar a la diapositiva y sale por la derecha con las ruedas girando. Crédito del modelo (CC BY) en la línea de abajo.' },
      ]), INK));
    } },

  // ============================================================================
  // 5 · Launch day, from the hangar to the pad: night, floodlights and sodium
  //     light; the building comes closer, the crawler drives, the orbiter
  //     travels between slides (Transform), the countdown and lift-off.
  show_3d_launch: { name: 'Día de lanzamiento', cat: 'showcase',
    summary: 'Noche de lanzamiento: hangar que se acerca, oruga que avanza, transbordador que viaja con Transformar, cuenta atrás, ecuación y gráfico',
    make: () => {
      const NIGHT = '#05070d', NAVY = '#0e1a33', SOD = '#ffb347', STEEL = '#a9bdd3', W = '#eef3f8', RED = '#ff5d5d', GO = '#4cd98a';
      const M = pairStacks('modern').heading, MONO = FF.mono, orb = uid();
      const r = rng(41);
      const sky = svgURL(1280, 720, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT}"/><stop offset=".75" stop-color="${NAVY}"/><stop offset="1" stop-color="#2a2238"/></linearGradient>`
        + `<linearGradient id="b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff2cc" stop-opacity=".35"/><stop offset="1" stop-color="#fff2cc" stop-opacity="0"/></linearGradient></defs>`
        + `<rect width="1280" height="720" fill="url(#g)"/>` + Array.from({ length: 140 }, () => `<circle cx="${(r() * 1280).toFixed(0)}" cy="${(r() * 470).toFixed(0)}" r="${(0.5 + r() * 1.4).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`).join('')
        + [[180, -14], [1100, 12], [640, -4]].map(([x, a]) => `<polygon points="${x - 14},720 ${x + 14},720 ${x + 160 + a * 20},0 ${x - 160 + a * 20},0" fill="url(#b)" transform="rotate(${a} ${x} 720)"/>`).join('')
        + `<rect y="660" width="1280" height="60" fill="#06080c"/>`);
      const bg = () => [scene(sky, 0, 0, 1280, 720)];
      const tminus = (t, x, y, c = SOD, w = 640) => text(t, x, y, w, 40, { fontFamily: MONO, fontSize: 24, color: c, fontWeight: 700, letterSpacing: 2 });
      const H = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: M, fontSize: size, color, fontWeight: 800, lineHeight: 1.05, ...p });
      const stat = (n, u, l, x, y) => text(`<div style="font-family:${M};font-size:56px;font-weight:800;color:${SOD};line-height:1">${n}<span style="font-size:24px;color:${STEEL}"> ${u}</span></div><div style="margin-top:6px">${l}</div>`, x, y, 220, 120, { fontSize: 18, color: W });
      const orbiter = (x, y, w, h, props = {}) => same(orb, n3d('space-shuttle-d', x, y, w, h, props));

      return numbered(ink2(build({ name: 'Día de lanzamiento', palette: 'midnight', fonts: 'modern', title: { color: W, size: 48 }, body: { color: W } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', back: bg(), extra: [
          tminus('T−72 H · CENTRO DE LANZAMIENTO', 80, 150, SOD),
          H('Día de<br>lanzamiento', 76, 195, 620, 230, 84),
          text('Del hangar a la plataforma, paso a paso, en tres días y una noche.', 80, 430, 560, 80, { fontSize: 26, color: STEEL }),
          n3d('space-shuttle-d', 700, 90, 540, 520, { view: 'low', autoRotate: true, spin: 8, edge: 'fade' })],
          notes: 'El transbordador visto desde abajo (Modelo 3D ▸ Vista ▸ Desde abajo) girando muy despacio. El cielo, las estrellas y los focos son un solo dibujo SVG.' },

        { layout: 'blank', bg: NIGHT, back: bg(), extra: [
          n3d('vehicle-assembly-building-vab', 60, 110, 620, 540, { view: 'three', motion: 'zoom' }),
          tminus('T−72 H', 740, 110, SOD, 460),
          H('El hangar de montaje', 736, 150, 480, 130, 52),
          text('Aquí se pone de pie el cohete y se une todo. Las puertas tardan casi una hora en abrirse.', 740, 290, 460, 100, { fontSize: 21, color: STEEL }),
          stat('160', 'm', 'de altura', 740, 420), stat('218', 'm', 'de largo', 980, 420)],
          notes: 'El edificio se acerca al llegar la diapositiva (Modelo 3D ▸ Vista ▸ Al entrar ▸ Acercar al entrar), como un plano de dron. Medidas redondeadas.' },

        { layout: 'blank', bg: NIGHT, back: [...bg(), R(0, 560, 1280, 26, '#6d6252'), R(0, 600, 1280, 26, '#6d6252')], extra: [
          tminus('T−48 H', 80, 90),
          H('El traslado, a paso de tortuga', 76, 130, 760, 70, 46),
          mathBlock({ x: 80, y: 220, w: 560, h: 90, fontSize: 36, latex: 't = \\dfrac{d}{v} = \\dfrac{5{,}5\\ \\text{km}}{1{,}3\\ \\text{km/h}} \\approx 4{,}2\\ \\text{h}', color: W }),
          text('La oruga lleva el cohete de pie, sin que se incline ni un grado en la cuesta.', 80, 330, 560, 70, { fontSize: 21, color: STEEL }),
          withAnims(n3d('crawler', 40, 410, 420, 210, { view: 'side' }), path([[760, 0]], { duration: 6000 })),
          text('Clic: arranca', 1020, 250, 180, 40, { fontSize: 18, color: NIGHT, bg: SOD, radius: 20, textAlign: 'center', vAlign: 'middle' })],
          notes: 'Un clic: la oruga recorre la pista en seis segundos (una trayectoria recta). La ecuación es un objeto de ecuación (LaTeX). Distancia y velocidad aproximadas.' },

        { layout: 'blank', bg: NIGHT, back: bg(), extra: [
          n3d('mobile-launcher-assembled', 820, 70, 380, 590, { view: 'three' }),
          orbiter(520, 470, 300, 180, { view: 'front' }),
          tminus('T−24 H', 80, 110),
          H('En la plataforma', 76, 150, 600, 80, 56),
          ...['Torre de servicio conectada', 'Combustible: carga a T−6 h', 'Tripulación: cuarentena', 'Meteorología: en vigilancia'].map((t, i) =>
            text(`<span style="color:${i < 2 ? GO : SOD}">${i < 2 ? '●' : '○'}</span>&nbsp; ${t}`, 80, 260 + i * 56, 480, 44, { fontSize: 24, color: W })),
          text('Pasa a la siguiente: el transbordador se acerca.', 80, 520, 480, 40, { fontSize: 18, color: STEEL })],
          notes: 'La torre y, abajo, el transbordador pequeño. En la siguiente diapositiva el mismo modelo viaja y crece con Transformar.' },

        { layout: 'blank', bg: NIGHT, autoAnimate: true, back: [...bg(), glow(200, 40, 700, '#3c5a8a', NIGHT, 35)], extra: [
          orbiter(60, 90, 760, 560, { view: 'three', arrive: 'turn' }),
          ...chain([['Bodega de carga', '18 m de largo: cabe un autobús.'], ['Losetas térmicas', 'Unas 24 000, cada una con su sitio.'], ['Tres motores principales', 'Funcionan los ocho minutos y medio de subida.'], ['Ala en delta', 'Para volver planeando, sin motor.']]
            .map(([t, d], i) => text(`<div style="font-family:${M};font-weight:800;font-size:23px;color:${SOD}">${t}</div><div style="color:${STEEL}">${d}</div>`, 860, 130 + i * 128, 360, 110, { fontSize: 18, color: W, bg: '#ffffff0d', radius: 8, pad: [12, 16, 12, 16] })), 'fade-left', { duration: 400 })],
          notes: 'Transformar con 3D: el transbordador viene desde abajo a la izquierda, crece y da una vuelta completa hasta quedarse en tres cuartos (Desde la anterior ▸ Dar una vuelta hasta su vista). Un clic muestra las cuatro fichas seguidas.' },

        { title: 'Las horas de la cuenta atrás', layout: 'titleOnly', bg: NIGHT, back: bg(), extra: [
          dg('timeline', 'T−9 min\n  Pausa y ronda de go/no go\nT−31 s\n  Mandan los ordenadores de a bordo\nT−6,6 s\n  Arrancan los motores principales\nT−0\n  Encendido de los aceleradores', 80, 180, 1120, 430, { oneByOne: true, colors: 'accent', textColor: W })],
          notes: 'Diagrama de cronología que aparece hito a hito al presentar (Diagrama ▸ Uno a uno al presentar). Tiempos del procedimiento clásico, redondeados.' },

        { title: '¿Hay ventana?', layout: 'titleOnly', bg: NIGHT, back: bg(), extra: [
          chartBlock({ x: 80, y: 170, w: 760, h: 460, chartType: 'line', color: STEEL, grid: true, xTitle: 'Hora local', yTitle: 'Viento en altura (km/h)', seriesName: 'Previsión',
            data: ['02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'].map((l, i) => ({ label: l, value: [52, 58, 64, 49, 41, 38, 46][i] })),
            series: [{ name: 'Límite', values: [55, 55, 55, 55, 55, 55, 55], color: RED }] }),
          text(`<div style="font-family:${M};font-size:40px;font-weight:800;color:${GO}">05:00 – 08:00</div><div style="margin-top:8px">El viento baja del límite a partir de las cinco. La ventana se abre a las 06:12.</div>`, 880, 220, 320, 260, { fontSize: 22, color: W })],
          notes: 'Gráfico de líneas con dos series: la previsión de viento y el límite (en rojo). Datos inventados para el ejemplo.' },

        { layout: 'blank', bg: NIGHT, back: bg(), extra: [
          pollBlock({ kind: 'choice', question: 'Ronda de go/no go: ¿lanzamos a las 06:12?', options: ['Go', 'No go', 'Esperar otra ventana'], fontSize: 34, x: 80, y: 60, w: 1120, h: 560 })],
          notes: 'Votación en directo: como en la sala de control, cada puesto dice «go» o «no go». Sirve para hablar de quién decide y con qué datos.' },

        { layout: 'blank', bg: NIGHT, back: bg(), transition: 'fade', extra: [
          timer(10, 80, 240, 400, { style: 'digital', color: SOD, h: 170, sound: false, endText: '¡Despegue!' }),
          tminus('T−10 S', 80, 180),
          withAnims(n3d('space-shuttle-a', 660, 230, 600, 300, { view: 'side', rotation: -90 }), path([[0, -40], [0, -900]], { start: 'click', duration: 3200, sound: 'whoosh' })),
          withAnims(E(925, 500, 70, 120, '#ffd27a', { fill2: '#ff5a1f', gradType: 'radial', opacity: 90 }), A('zoom-in', { start: 'withPrev', duration: 300 }), path([[0, -40], [0, -900]], { start: 'withPrev', duration: 3200 })),
          text('Modelos 3D: NASA 3D Resources (uso libre). Cifras redondeadas.', 80, 660, 600, 26, { fontSize: 12, color: STEEL })],
          notes: 'La cuenta atrás de diez segundos empieza sola. Al llegar a cero, un clic: el cohete sube con su llama (una trayectoria vertical para los dos, con un silbido).' },
      ]), W));
    } },

  // ============================================================================
  // 6 · The script of a haunted house at the fair: a crypt in sickly green,
  //     skeletons that wake up from the floor, walk down a corridor, summon
  //     others and fall apart; the map, safety, what scared people most.
  show_3d_haunted: { name: 'Pasaje del terror: el guion', cat: 'showcase',
    summary: 'Esqueletos 3D que despiertan del suelo, avanzan por un pasillo, invocan y se desmoronan; mapa que se dibuja, cuenta atrás y votación',
    make: () => {
      const VOID = '#06080a', MOSS = '#7dff7a', BONE = '#ece5cf', BLOOD = '#c4213c', FOG = '#a9c4b2', PAPER = '#e2d6b8', DIM = '#8fa196';
      const G = FF.georgia, TYPE = "'Courier New', 'Liberation Mono', Courier, monospace";
      const arches = svgURL(1280, 720, `<defs><radialGradient id="v" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#16231b"/><stop offset="1" stop-color="${VOID}"/></radialGradient></defs><rect width="1280" height="720" fill="url(#v)"/>`
        + [0, 1, 2, 3, 4].map(i => { const x = i * 320 - 160; return `<path d="M${x + 30} 720 L${x + 30} 300 Q${x + 160} 90 ${x + 290} 300 L${x + 290} 720" fill="none" stroke="#1f2d24" stroke-width="26"/>`; }).join('')
        + '<path d="M0 0 L180 0 M0 0 L0 180 M0 0 L150 120 M0 0 L120 150 M0 0 L170 60 M0 0 L60 170" stroke="#c9d6cc" stroke-opacity=".25" stroke-width="1.5"/>'
        + [40, 80, 120, 160].map(r => `<path d="M${r} 0 Q${r * 0.8} ${r * 0.45} ${r * 0.94} ${r * 0.94 * 0.33} Q${r * 0.6} ${r * 0.6} ${r * 0.33} ${r * 0.94} Q${r * 0.45} ${r * 0.8} 0 ${r}" fill="none" stroke="#c9d6cc" stroke-opacity=".2" stroke-width="1.2"/>`).join(''));
      const crypt = () => [scene(arches, 0, 0, 1280, 720), glow(-100, 520, 700, '#3c7a4c', VOID, 35), glow(700, 540, 700, '#3c7a4c', VOID, 30)];
      const H = (t, x, y, w, h, size, color = BONE, p = {}) => text(t, x, y, w, h, { fontFamily: G, fontSize: size, color, lineHeight: 1.05, ...p });
      const cue = (html, x, y, w, h) => card(`<div style="font-family:${TYPE};font-size:15px;color:${BLOOD};font-weight:700;letter-spacing:2px">HOJA DE PIES</div><div style="font-family:${TYPE};margin-top:6px">${html}</div>`,
        x, y, w, h, PAPER, { fontSize: 17, color: '#2a2418', radius: 3, pad: [14, 18, 14, 18], rotation: 1.5, lineHeight: 1.45 });
      const scn = (n, t) => [text(`ESCENA ${n}`, 80, 60, 300, 34, { fontFamily: TYPE, fontSize: 18, color: MOSS, letterSpacing: 4, fontWeight: 700 }), H(t, 76, 92, 700, 70, 52)];
      const sk = id => lib3d(id);

      return numbered(ink2(build({ name: 'Pasaje del terror: el guion', palette: 'ocean', fonts: 'websafe', title: { color: BONE, font: G }, body: { color: BONE } }, [
        { layout: 'blank', bg: VOID, transition: 'fade', back: crypt(), extra: [
          text('PASAJE DEL TERROR · FERIA DE OTOÑO', 80, 150, 640, 34, { fontFamily: TYPE, fontSize: 18, color: FOG, letterSpacing: 4 }),
          text('La Cripta', 70, 185, 700, 170, { fontFamily: G, fontSize: 130, wordart: 'neon', wordartColor: MOSS }),
          text('Guion técnico para actores y técnicos · temporada 3', 80, 370, 600, 60, { fontSize: 24, color: FOG }),
          text('Leer antes del ensayo general', 80, 440, 400, 40, { fontFamily: TYPE, fontSize: 18, color: BONE, bg: BLOOD, radius: 2, textAlign: 'center', vAlign: 'middle', rotation: -2, fontWeight: 700 }),
          m3d('kk-Skeleton_Warrior', 760, 90, 420, 560, { clip: 'Taunt', edge: 'fade', bleed: 1.3 })],
          notes: 'El título es Text Art de estilo neón con un color propio (verde). El esqueleto provoca en bucle (animación «Taunt») y sus bordes se funden con la oscuridad.' },

        { title: 'El recorrido', layout: 'titleOnly', bg: VOID, back: crypt(), extra: [
          img(svgURL(760, 460, '<rect x="4" y="4" width="752" height="452" fill="#0f1712" stroke="#3a5244" stroke-width="4"/>'
            + [[4, 4, 250, 230], [254, 4, 250, 230], [504, 4, 252, 230], [4, 234, 380, 222], [384, 234, 372, 222]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#3a5244" stroke-width="4"/>`).join('')
            + '<rect x="250" y="120" width="8" height="70" fill="#0f1712"/><rect x="500" y="120" width="8" height="70" fill="#0f1712"/><rect x="560" y="230" width="90" height="8" fill="#0f1712"/><rect x="80" y="230" width="90" height="8" fill="#0f1712"/>'),
            80, 180, 760, 460, 'Plano del pasaje: entrada, osario, pasillo, sala del nigromante y salida'),
          ...[['1 · Osario', 30, 40], ['2 · Pasillo', 280, 40], ['3 · Nigromante', 530, 40], ['Salida', 410, 270], ['Entrada', 30, 270]].map(([t, x, y]) => onPic(t, 80 + x, 180 + y, 24, '#a9c4b2', { fontFamily: 'Georgia, serif', w: 215 })),
          withAnims(ink([[200, 600], [205, 480], [205, 400], [230, 330], [330, 340], [450, 330], [580, 340], [700, 320], [690, 400], [650, 480], [600, 560]], MOSS, 5), A('draw', { duration: 3500 })),
          ...[['4 min', 'por grupo'], ['8', 'personas por grupo como máximo'], ['3', 'sustos programados']].map(([n, l], i) =>
            withAnims(text(`<div style="font-family:${G};font-size:52px;color:${MOSS};line-height:1">${n}</div><div style="color:${FOG}">${l}</div>`, 900, 190 + i * 150, 300, 130, { fontSize: 20 }), A('fade-left', { start: 'afterPrev', duration: 400 })))],
          notes: 'Un clic: el camino del grupo se dibuja sobre el plano (un trazo de tinta con el efecto «Dibujar»), y después aparecen las tres cifras clave solas.' },

        { layout: 'blank', bg: VOID, back: crypt(), extra: [
          ...scn(1, 'El osario'),
          withAnims(m3d('kk-Skeleton_Minion', 120, 190, 520, 470, { clip: 'Skeletons_Inactive_Floor_Pose', bleed: 1.3, view: 'three' }),
            clip('Skeletons_Awaken_Floor', { duration: 2800, sound: 'drumroll' }), A('clip3d', { clip: 'Taunt', start: 'afterPrev', once: true, duration: 2000 })),
          cue('1. El grupo pisa la losa suelta.<br>2. Luz verde, dos segundos.<br>3. El esqueleto se levanta.<br>4. Grito grabado y apagón.', 760, 200, 420, 230),
          text('Actor: Mario · relevo: Inés', 760, 470, 420, 40, { fontSize: 20, color: FOG })],
          notes: 'Un clic encadena dos animaciones propias del modelo: despertar desde el suelo (con un redoble) y, al terminar, una provocación. Antes del clic, el esqueleto está tumbado (Modelo 3D ▸ En reposo: «Skeletons_Inactive_Floor_Pose»).' },

        { layout: 'blank', bg: VOID, back: crypt(), extra: [
          ...scn(2, 'El pasillo'),
          ...[0, 1, 2, 3].map(i => R(60 + i * 300, 610, 220, 6, MOSS, { opacity: 25 })),
          withAnims(m3d('kk-Skeleton_Rogue', 940, 300, 240, 340, { clip: 'Idle', walk: { clip: 'Walking_D_Skeletons', end: 'Taunt_Longer', endOnce: true, face: true, look: true } }),
            path([[-260, 10], [-520, -10], [-760, 0]], { duration: 5200 })),
          cue('Avanza despacio hacia el grupo, sin tocar a nadie. Se para a un metro y provoca.', 80, 180, 560, 110)],
          notes: 'Un clic: el esqueleto anda por el pasillo con su forma de andar propia («Walking_D_Skeletons»), girado hacia donde va, y al llegar se vuelve al público y provoca una vez.' },

        { layout: 'blank', bg: VOID, back: [...crypt(), glow(340, 120, 600, '#7a4cff', VOID, 25)], extra: [
          ...scn(3, 'El nigromante'),
          withAnims(m3d('kk-Skeleton_Mage', 480, 150, 320, 470, { clip: 'Idle' }), clip('Spellcast_Summon', { duration: 2400, sound: 'whoosh' })),
          ...[[160, 330], [860, 330]].map(([x, y]) => withAnims(m3d('kk-Skeleton_Minion', x, y, 260, 320, { clip: 'Idle' }),
            A('fade-in', { start: 'withPrev', delay: 700, duration: 200 }), A('clip3d', { clip: 'Spawn_Ground', start: 'withPrev', delay: 700, once: true, duration: 1800 }))),
          cue('Al alzar los brazos: humo y luz morada. Salen dos esbirros del suelo.', 820, 140, 380, 120)],
          notes: 'Un clic: el nigromante invoca (animación «Spellcast_Summon») y, a la vez con un pequeño retraso, aparecen dos esbirros que salen del suelo («Spawn_Ground»). Son tres modelos con animaciones «con la anterior».' },

        { title: 'Seguridad, antes que el susto', layout: 'titleOnly', bg: VOID, back: crypt(), extra: [
          ...[['ban', 'Nunca se toca', 'Ni al público ni a otro actor.'], ['lightbulb', 'Palabra de seguridad', '«Luz»: se encienden las luces y se para todo.'], ['users', 'Grupos de 8', 'Un monitor al principio y otro al final.']].map(([ic, t, d], i) =>
            card(`<div style="font-family:${G};font-size:28px;color:${MOSS};margin-top:58px">${t}</div><div style="margin-top:6px;color:${FOG}">${d}</div>`, 80 + i * 280, 180, 260, 300, '#ffffff0a', { fontSize: 19, color: BONE, radius: 6, borderColor: '#3a5244' })),
          ...['ban', 'lightbulb', 'users'].map((ic, i) => icon(ic, 104 + i * 280, 204, 44, MOSS)),
          timer(240, 940, 200, 260, { style: 'ring', color: MOSS, auto: false, endText: 'Siguiente grupo' }),
          text('Tiempo por grupo', 900, 480, 340, 40, { fontSize: 20, color: FOG, textAlign: 'center' })],
          notes: 'Tres normas que no se negocian y la cuenta atrás de cuatro minutos que usa el monitor de la entrada para dar paso al siguiente grupo (se pulsa para empezar).' },

        { title: '¿Qué asustó más?', layout: 'titleOnly', bg: VOID, back: crypt(), extra: [
          chartBlock({ x: 80, y: 170, w: 700, h: 460, chartType: 'bar', color: MOSS, dataLabels: true, grid: true, yTitle: '% del público',
            data: [{ label: 'Osario', value: 46 }, { label: 'Pasillo', value: 21 }, { label: 'Nigromante', value: 33 }] }),
          text(`<div style="font-family:${G};font-size:72px;color:${MOSS};line-height:1">412</div><div style="color:${FOG}">respuestas en la encuesta de salida del año pasado</div>`, 840, 200, 360, 170, { fontSize: 22 }),
          text('El pasillo asusta poco: este año el esqueleto anda más despacio y se para más cerca.', 840, 400, 360, 140, { fontSize: 21, color: BONE })],
          notes: 'Porcentaje del público que eligió cada escena como la que más miedo le dio (datos inventados para el ejemplo).' },

        { layout: 'blank', bg: VOID, back: crypt(), extra: [
          pollBlock({ kind: 'rating', question: 'Del 1 al 5, ¿cuánto miedo has pasado?', options: [], fontSize: 34, x: 80, y: 60, w: 1120, h: 560 })],
          notes: 'La votación que el público responde con el móvil al salir (código QR en la puerta).' },

        { layout: 'blank', bg: VOID, back: crypt(), transition: 'fade', extra: [
          withAnims(m3d('kk-Skeleton_Warrior', 760, 120, 400, 520, { clip: 'Idle', bleed: 1.3 }), A('clip3d', { clip: 'Death_C_Skeletons', start: 'afterPrev', delay: 600, duration: 2200 })),
          H('Fin del recorrido', 76, 190, 640, 90, 64),
          text('Ensayo general: jueves a las 20:00, con vestuario y maquillaje.', 80, 300, 600, 80, { fontSize: 26, color: FOG }),
          text('SALIDA →', 80, 430, 220, 50, { fontFamily: TYPE, fontSize: 24, color: VOID, bg: MOSS, radius: 2, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }),
          text('Personajes 3D: KayKit — Kay Lousberg (CC0)', 80, 650, 600, 28, { fontSize: 13, color: DIM })],
          notes: 'Al llegar, el esqueleto se desmorona solo en un montón de huesos (animación «Death_C_Skeletons», que se queda en su última postura).' },
      ]), BONE));
    } },

  // ============================================================================
  // 7 · An accessibility audit of a community centre: signage blue and yellow.
  //     The auditor is a 3D figure that walks; the wheelchair is the blue-and-
  //     yellow sign itself (a drawn badge) going round the plan, up the ramp and
  //     racing the walker; the chair of the hall, turning space, a checklist.
  //     (The library's soldier has wheelchair poses but no wheelchair: not used.)
  show_3d_access: { name: 'Accesibilidad: el centro cívico', cat: 'showcase',
    summary: 'Auditoría con una persona 3D que camina, recorrido que se dibuja sobre el plano, rampa con ecuación, carrera de tiempos, tabla con fórmulas y nube de palabras',
    make: () => {
      const BLUE = '#1f4e9c', NAVY = '#122f60', SKY = '#eaf1fb', YEL = '#ffd400', W = '#ffffff', INK = '#14213d', GREEN = '#2e9d5b', RED = '#d64545', GRAY = '#5f6f86';
      const P = FF.poppins;
      const H = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: P, fontSize: size, color, fontWeight: 700, lineHeight: 1.1, ...p });
      const badge = (x, y, size) => [E(x, y, size, size, YEL), icon('accessibility', x + size * 0.18, y + size * 0.18, size * 0.64, NAVY)];
      // The wheelchair sign as one picture (so that it can travel along a path).
      const SIGN = svgURL(100, 100, `<circle cx="50" cy="50" r="48" fill="${YEL}" stroke="${NAVY}" stroke-width="3"/><circle cx="54" cy="20" r="7" fill="${NAVY}"/>`
        + `<g fill="none" stroke="${NAVY}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M52 32 L49 56 H68 L74 76"/><path d="M50 42 H66"/><path d="M38 46 A20 20 0 1 0 64 74"/></g>`);
      const sign = (x, y, size, p = {}) => img(SIGN, x, y, size, size, 'Símbolo de accesibilidad: una persona en silla de ruedas', p);
      const walker = (x, y, w, h, props = {}) => m3d('kh-CesiumMan', x, y, w, h, { clip: '*', ...props });
      const ok = (t, good, x, y, w) => text(`<span style="color:${good ? GREEN : RED};font-weight:800">${good ? '✓' : '✗'}</span>&nbsp; ${t}`, x, y, w, 40, { fontSize: 20, color: INK });
      // The plan of the ground floor, from above (walls, doors, the ramp, the lift).
      const plan = svgURL(780, 520, '<rect width="780" height="520" fill="#f7f9fc"/>'
        + '<g stroke="#14213d" stroke-width="8" fill="none"><path d="M40 40 H740 V440 H460 M380 440 H40 Z"/><path d="M300 40 V200 M300 270 V440 M520 40 V150 M520 230 V440"/><path d="M520 300 H600 M680 300 H740"/></g>'
        + '<rect x="380" y="440" width="80" height="70" fill="#cfe0f7"/><g stroke="#8aa6cf" stroke-width="2">' + [0, 1, 2, 3, 4, 5].map(i => `<line x1="380" y1="${452 + i * 10}" x2="460" y2="${452 + i * 10}"/>`).join('') + '</g>'
        + '<rect x="640" y="60" width="80" height="80" fill="#ffd400" stroke="#14213d" stroke-width="3"/>'
        + '<rect x="330" y="320" width="120" height="22" fill="#d64545" opacity=".75"/>');
      // (Its labels, as text boxes over it.)
      const planLabels = (ox, oy) => [onPic('rampa 8 %', ox + 470, oy + 495, 18, '#122f60', { w: 130 }), onPic('ASC.', ox + 680, oy + 108, 18, '#14213d', { anchor: 'middle', w: 76, fontWeight: 700 }),
        ...[['Vestíbulo', 410, 300], ['Salón de actos', 170, 130], ['Aseo', 630, 380], ['Talleres', 170, 360], ['Despachos', 410, 110]].map(([t, x, y]) => onPic(t, ox + x, oy + y, 22, '#5f6f86', { anchor: 'middle', w: 200 })),
        onPic('mostrador 1,10 m', ox + 390, oy + 365, 15, '#d64545', { anchor: 'middle', w: 180 })];
      const route = [[20, -80], [65, -140], [70, -220], [100, -288], [180, -300], [250, -322]];   // (up the ramp, past the counter on its right, through the door to the lift)

      return numbered(ink2(build({ name: 'Accesibilidad: el centro cívico', palette: 'revela', fonts: 'friendly', title: { color: INK, font: P, size: 46 }, body: { color: INK } }, [
        { layout: 'blank', bg: SKY, transition: 'fade', back: [R(0, 0, 620, 720, BLUE, { fill2: NAVY, gradAngle: 90 }), R(620, 0, 14, 720, YEL)], extra: [
          ...badge(80, 90, 96),
          H('Llegar,<br>entrar<br>y moverse', 76, 220, 520, 290, 70, W),
          text('Auditoría de accesibilidad del centro cívico Las Moreras · octubre', 80, 520, 480, 80, { fontSize: 22, color: '#d6e2f5' }),
          E(760, 600, 420, 60, BLUE, { opacity: 10 }),
          walker(720, 90, 500, 540, { view: 'three', motion: 'orbit' }),
          text('La auditora recorre el edificio a pie… y en silla.', 700, 650, 520, 36, { fontSize: 18, color: GRAY, textAlign: 'center' })],
          notes: 'La persona que hace la auditoría camina en el sitio (la animación propia del modelo) y la cámara da una vuelta completa a su alrededor al llegar la diapositiva (Modelo 3D ▸ Vista ▸ Al entrar ▸ Vuelta completa al entrar).' },

        { title: 'El recorrido de prueba', layout: 'titleOnly', bg: SKY, extra: [
          img(plan, 80, 160, 780, 520, 'Plano de la planta baja: rampa de entrada, vestíbulo con mostrador, ascensor al fondo a la derecha, salón de actos, talleres, despachos y aseo'), ...planLabels(80, 160),
          withAnims(ink(curvePts([500, 640], route), BLUE, 5, { opacity: 80 }), A('draw', { duration: 6000 })),
          withAnims(sign(476, 616, 48), path(route, { start: 'withPrev', duration: 6000 }), A('pulse', { start: 'afterPrev', duration: 600 })),
          H('Lo que vimos', 900, 170, 320, 50, 30),
          ...[['Rampa de entrada', true], ['Puerta automática', true], ['Mostrador demasiado alto', false], ['Ascensor lejos de la entrada', false], ['Aseo adaptado', true]].map(([t, g], i) => ok(t, g, 900, 235 + i * 56, 330))],
          notes: 'Vista desde arriba sobre el plano. Un clic: el recorrido en silla se dibuja (efecto «Dibujar») mientras el símbolo lo sigue con una trayectoria; al llegar al ascensor, late una vez (énfasis «Latido»).' },

        { title: 'La rampa: ¿cumple?', layout: 'titleOnly', bg: SKY, extra: [
          img(svgURL(620, 300, '<polygon points="20,280 600,280 600,160" fill="#cfe0f7" stroke="#122f60" stroke-width="4"/><line x1="20" y1="290" x2="600" y2="290" stroke="#5f6f86" stroke-width="2"/>'
            + '<text x="310" y="276" font-family="sans-serif" font-size="20" fill="#122f60" text-anchor="middle">L = 6 m</text><line x1="612" y1="160" x2="612" y2="280" stroke="#d64545" stroke-width="3"/><text x="606" y="140" font-family="sans-serif" font-size="20" fill="#d64545" text-anchor="end">h = 0,48 m</text>'),
            80, 330, 620, 300, 'Perfil de la rampa: 6 metros de largo para subir 48 centímetros'),
          withAnims(sign(96, 546, 60), path([[540, -112]], { duration: 4000 })),
          mathBlock({ x: 80, y: 180, w: 640, h: 100, fontSize: 28, latex: '\\dfrac{h}{L}\\cdot 100 = \\dfrac{0{,}48}{6}\\cdot 100 = 8\\ \\%', color: INK }),
          tableBlock({ x: 780, y: 190, w: 420, h: 250, fontSize: 21, header: true, headBg: BLUE, headFg: W, stroke: '#c5d3ea', banded: true, band: BLUE, bandAlpha: 0.06, colW: [3, 2],
            rows: [['Largo del tramo', 'Pendiente máx.'], ['Menos de 3 m', '10 %'], ['De 3 a 6 m', '8 %'], ['Más de 6 m', '6 %']] }),
          text(`<b style="color:${GREEN}">✓ Cumple</b>, pero justo: con un tramo un poco más largo ya no valdría.`, 780, 470, 420, 90, { fontSize: 21, color: INK })],
          notes: 'Un clic: el símbolo sube la rampa (una trayectoria recta en diagonal). La ecuación calcula la pendiente; la tabla resume los límites habituales para rampas de uso público.' },

        { title: 'Girar sin chocar', layout: 'titleOnly', bg: SKY, extra: [
          R(120, 190, 520, 440, W, { radius: 14 }),
          E(205, 215, 330, 330, BLUE, { opacity: 10, stroke: BLUE, strokeWidth: 3, dash: 'dash' }),
          withAnims(sign(310, 320, 120), A('spin360', { duration: 1600 })),
          R(205, 562, 330, 3, BLUE),
          H('1,50 m', 290, 574, 160, 40, 26, BLUE, { textAlign: 'center' }),
          ...[['Un círculo de 1,50 m', 'libre de obstáculos delante de cada puerta y en el aseo.'], ['Puertas de 0,80 m', 'como mínimo, y que se abran sin esfuerzo.'], ['Pasillos de 1,20 m', 'para cruzarse con otra persona sin dar marcha atrás.']].map(([t, d], i) =>
            text(`<div style="font-family:${P};font-weight:700;color:${BLUE}">${t}</div><div>${d}</div>`, 720, 190 + i * 145, 480, 125, { fontSize: 22, color: INK, bg: W, radius: 14, pad: [14, 18, 14, 18] }))],
          notes: 'El círculo de giro visto desde arriba: un clic y el símbolo da una vuelta entera dentro de él (efecto «Dar una vuelta»). Si el círculo no cabe libre, la silla tiene que maniobrar adelante y atrás.' },

        { layout: 'blank', bg: SKY, back: [R(0, 520, 1280, 200, '#dfe7f3')], extra: [
          H('Una silla para el salón de actos', 80, 70, 1120, 60, 44),
          m3d('kh-SheenChair', 80, 160, 560, 500, { view: 'three', motion: 'swing' }),
          ...[['45–50 cm', 'de altura del asiento: ni hundirse ni quedarse colgando'], ['Firme', 'tapizado que no ceda al apoyarse para levantarse'], ['4 plazas libres', 'en las filas del pasillo, para quien llega en silla de ruedas']].map(([n, d], i) =>
            text(`<div style="font-family:${P};font-size:34px;font-weight:700;color:${BLUE};line-height:1.1">${n}</div><div style="margin-top:4px">${d}</div>`, 700, 170 + i * 150, 500, 130, { fontSize: 21, color: INK }))],
          notes: 'La silla elegida para el salón de actos, en 3D, con un balanceo de cámara al entrar (Modelo 3D ▸ Vista ▸ Al entrar ▸ Balanceo). Medidas habituales en guías de accesibilidad; conviene comprobar la normativa local.' },

        { title: 'Mismo trayecto, distinto tiempo', layout: 'titleOnly', bg: SKY, extra: [
          R(80, 340, 1120, 8, GRAY, { opacity: 30, radius: 4 }), R(80, 580, 1120, 8, GRAY, { opacity: 30, radius: 4 }),
          text('Andando: de la puerta al salón de actos', 80, 170, 600, 36, { fontSize: 20, color: GRAY, fontWeight: 700 }),
          text('En silla: rampa, ascensor del fondo y vuelta', 80, 420, 600, 36, { fontSize: 20, color: GRAY, fontWeight: 700 }),
          withAnims(walker(60, 200, 130, 150, { view: 'side2', walk: { clip: '*', face: false, look: false } }), path([[880, 0]], { duration: 2400 })),
          withAnims(sign(90, 490, 84), path([[880, 0]], { start: 'withPrev', duration: 4600 })),
          withAnims(H('1 min 40 s', 1000, 230, 200, 50, 30, GREEN, { textAlign: 'right' }), A('zoom-in', { start: 'withPrev', delay: 2400, duration: 300 })),
          withAnims(H('3 min 10 s', 1000, 470, 200, 50, 30, RED, { textAlign: 'right' }), A('zoom-in', { start: 'withPrev', delay: 4600, duration: 300 })),
          text('El rodeo hasta el ascensor casi duplica el tiempo: el ascensor debería estar junto a la entrada.', 80, 625, 1120, 40, { fontSize: 20, color: INK })],
          notes: 'Un clic, dos recorridos a la vez: la persona que anda (3D, con su animación de caminar) llega antes; el recorrido en silla tarda casi el doble por el rodeo. Cada tiempo aparece cuando llega cada uno (retrasos en el Panel de animación). Tiempos medidos en la visita.' },

        { title: 'La lista de comprobación', layout: 'titleOnly', bg: SKY, extra: [
          tableBlock({ x: 80, y: 170, w: 560, h: 470, fontSize: 20, header: true, headBg: NAVY, headFg: W, stroke: '#c5d3ea', banded: true, band: BLUE, bandAlpha: 0.06, colW: [5, 2, 2],
            rows: [['Zona', 'Puntos', 'Máximo'], ['Acceso y rampa', '9', '10'], ['Vestíbulo y mostrador', '4', '10'], ['Ascensor', '6', '10'], ['Aseo adaptado', '8', '10'], ['Salón de actos', '7', '10'], ['Señalización', '3', '10'], ['Total', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
          chartBlock({ x: 690, y: 170, w: 510, h: 460, chartType: 'stacked100', color: GREEN, seriesName: 'Cumple', grid: false,
            data: [{ label: 'Acceso', value: 6 }, { label: 'Vestíbulo', value: 2 }, { label: 'Ascensor', value: 3 }, { label: 'Aseo', value: 5 }, { label: 'Señales', value: 1 }],
            series: [{ name: 'A medias', values: [1, 2, 2, 1, 2], color: YEL }, { name: 'No cumple', values: [0, 3, 1, 1, 4], color: RED }] })],
          notes: 'Los totales de la tabla son fórmulas (=SUMA(ARRIBA)): 37 puntos de 60. El gráfico de barras al 100 % muestra, por zona, cuántos requisitos se cumplen, a medias o no (datos de la visita, inventados).' },

        { layout: 'blank', bg: SKY, extra: [
          pollBlock({ kind: 'word', question: '¿Qué barrera te encuentras más a menudo en los edificios públicos?', options: [], fontSize: 32, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Nube de palabras en directo: lo que más se repite sale más grande. Sirve para ordenar las mejoras por lo que de verdad molesta.' },

        { layout: 'blank', bg: SKY, transition: 'fade', back: [R(0, 0, 1280, 250, BLUE, { fill2: NAVY, gradAngle: 0 })], extra: [
          ...badge(1100, 70, 100),
          H('El plan de mejoras', 80, 80, 900, 80, 56, W),
          text('Tres cambios, por orden de urgencia', 80, 160, 900, 40, { fontSize: 24, color: '#d6e2f5' }),
          dg('chevrons', 'Ya\n  Mostrador a 0,80 m de altura\nEn 6 meses\n  Señales en braille y alto contraste\nEn 2 años\n  Ascensor junto a la entrada', 80, 300, 1120, 300, { oneByOne: true, colors: 'accent' }),
          credits(['kh-CesiumMan'], 80, 640, 1120, GRAY, { fontSize: 11 }),
          text('Silla: Eric Chadwick (CC0)', 80, 616, 600, 24, { fontSize: 11, color: GRAY })],
          notes: 'El plan como galones que aparecen uno a uno al presentar. Créditos de los modelos 3D abajo.' },
      ]), INK));
    } },

  // ============================================================================
  // 8 · A level design document for a platform game, on squared paper with
  //     sticky notes: the character's turnaround, walking and jumping a gap,
  //     the physics with an equation and code, a zoom into the level (Transform).
  show_3d_platform: { name: 'Diseño de niveles: el salto', cat: 'showcase',
    summary: 'Hoja de personaje 3D desde cuatro ángulos, andar y saltar un hueco, física con ecuación y código, Transformar el mapa del nivel y etiquetar',
    make: () => {
      const PAPER = '#f6f1e3', PEN = '#2f3a4a', BLUE = '#2f6fdf', RED = '#e2483d', NOTE = '#ffe66d', GREEN = '#58b368', DIM = '#7a7465';
      const SG = FF.space, HAND = FF.caveat, hero = uid(), map = uid();
      const grid = svgURL(1280, 720, `<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="#9cb4d8" stroke-width="1" opacity=".45"/></pattern></defs><rect width="1280" height="720" fill="${PAPER}"/><rect width="1280" height="720" fill="url(#g)"/><line x1="70" y1="0" x2="70" y2="720" stroke="#e2483d" stroke-width="2" opacity=".5"/>`);
      const sheet = () => [scene(grid, 0, 0, 1280, 720)];
      const note = (html, x, y, w, h, rot = -2, c = NOTE) => text(html, x, y, w, h, { fontFamily: HAND, fontSize: 30, color: PEN, bg: c, pad: [12, 16, 12, 16], rotation: rot, lineHeight: 1.1 });
      const hand = (t, x, y, w, h, size = 30, color = BLUE, p = {}) => text(t, x, y, w, h, { fontFamily: HAND, fontSize: size, color, lineHeight: 1.1, ...p });
      const H = (t, x, y, w, h, size, color = PEN, p = {}) => text(t, x, y, w, h, { fontFamily: SG, fontSize: size, color, fontWeight: 700, lineHeight: 1.05, ...p });
      const plat = (x, y, w, c = GREEN) => [R(x, y, w, 40, c, { sketch: true, stroke: PEN, strokeWidth: 2 }), R(x, y + 40, w, 80, '#c49a6c', { sketch: true, stroke: PEN, strokeWidth: 2 })];
      const coin = (x, y) => E(x, y, 30, 30, '#ffcb2f', { stroke: PEN, strokeWidth: 2, sketch: true });
      // The whole level, drawn: platforms, gaps, spikes, a moving platform, a spring and the flag.
      const levelArt = '<rect width="1600" height="400" fill="#dff1ff"/>'
        + [[0, 300, 380], [470, 300, 260], [820, 230, 200], [1120, 300, 480]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="24" fill="#58b368" stroke="#2f3a4a" stroke-width="3"/><rect x="${x}" y="${y + 24}" width="${w}" height="${400 - y - 24}" fill="#c49a6c" stroke="#2f3a4a" stroke-width="3"/>`).join('')
        + '<rect x="1030" y="170" width="70" height="16" fill="#8e7dff" stroke="#2f3a4a" stroke-width="3"/><path d="M1000 178 h-20 M1130 178 h20" stroke="#8e7dff" stroke-width="3" stroke-dasharray="6 5"/>'
        + Array.from({ length: 6 }, (_, i) => `<polygon points="${560 + i * 26},300 ${573 + i * 26},270 ${586 + i * 26},300" fill="#e2483d" stroke="#2f3a4a" stroke-width="2"/>`).join('')
        + [[200, 240], [240, 220], [280, 240], [900, 170], [940, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#ffcb2f" stroke="#2f3a4a" stroke-width="3"/>`).join('')
        + '<path d="M760 300 v-6 l10-8 l-20-8 l20-8 l-20-8 l10-8" fill="none" stroke="#2f3a4a" stroke-width="4"/><rect x="745" y="296" width="30" height="8" fill="#2f3a4a"/>'
        + '<line x1="1500" y1="300" x2="1500" y2="140" stroke="#2f3a4a" stroke-width="5"/><polygon points="1500,140 1560,160 1500,180" fill="#e2483d" stroke="#2f3a4a" stroke-width="3"/>'
        + '<text x="16" y="36" font-family="sans-serif" font-size="26" font-weight="700" fill="#2f3a4a">1-2</text>';
      const level = svgURL(1600, 400, levelArt);
      // (The activity's picture: the middle of the level with sky above, 4:3, so that the five points don't crowd.)
      const levelCrop = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="450 -200 800 600">'
        + '<rect x="0" y="-200" width="1600" height="200" fill="#dff1ff"/>' + levelArt + '</svg>');

      return numbered(ink2(build({ name: 'Diseño de niveles: el salto', palette: 'paper', fonts: 'tech', title: { color: PEN, font: SG, size: 46 }, body: { color: PEN } }, [
        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [
          H('Nivel 1-2:<br>el salto perfecto', 110, 110, 640, 220, 76),
          text('Documento de diseño · versión 0.3', 112, 330, 500, 40, { fontSize: 24, color: DIM }),
          note('Objetivo: que el primer salto difícil se sienta <b>justo</b>, no injusto.', 112, 420, 400, 140, -3),
          ...plat(760, 480, 200), ...plat(1040, 400, 180), coin(990, 330), coin(1030, 300), coin(1070, 290),
          hand('¡hueco!', 960, 560, 90, 40, 26, RED),
          m3d('kn-character', 790, 325, 160, 220, { clip: 'idle', view: 'three' })],
          notes: 'Papel cuadriculado (un dibujo SVG con un patrón), plataformas con trazo a mano (Forma ▸ Trazo a mano) y el personaje 3D en reposo («idle»).' },

        { title: 'Hoja del personaje', layout: 'titleOnly', bg: PAPER, back: sheet(), extra: [
          ...[['front', 'frente'], ['side', 'perfil'], ['back', 'espalda'], ['top', 'planta']].flatMap(([v, n], i) => { const x = 110 + i * 270;
            // (arrive 'reset': each keeps its own view, not the angle of the one on the slide before.)
            return [m3d('kn-character', x, 200, 220, 300, { view: v, bleed: 1, arrive: 'reset' }), hand(n, x, 510, 220, 40, 32, PEN, { textAlign: 'center' })]; }),
          R(100, 205, 1060, 2, RED, { opacity: 60 }), R(100, 495, 1060, 2, RED, { opacity: 60 }),
          hand('2 bloques de alto (80 px)', 860, 150, 320, 40, 28, RED, { textAlign: 'right' }),
          note('Siempre de perfil al jugar: la cámara sigue de lado.', 760, 575, 420, 90, 2)],
          notes: 'Una hoja de giro como las de animación: el mismo modelo cuatro veces, de frente, de perfil, de espalda y desde arriba (Modelo 3D ▸ Vista). Las líneas rojas marcan la altura del personaje.' },

        (() => {   // Walk to the edge, jump the gap, land.
          const walk = path([[260, 0]], { duration: 1800 });
          const arc = [[80, -150], [230, -190], [390, -110], [480, -80]];
          const jump = path(arc, { start: 'afterPrev', duration: 900, sound: 'pop' });
          const jumpClip = A('clip3d', { clip: 'jump', start: 'withPrev', delay: 60, once: true, duration: 900 });
          return { title: 'Andar, saltar, caer', layout: 'titleOnly', bg: PAPER, back: sheet(), extra: [
            ...plat(90, 520, 470), ...plat(860, 440, 330),
            ...[0, 1, 2, 3, 4].map(i => R(600 + i * 50, 640, 30, 30, RED, { rotation: 45, sketch: true, stroke: PEN, strokeWidth: 2 })),
            ink(curvePts([445, 520], arc), BLUE, 3, { opacity: 50 }),
            hand('3 bloques', 640, 470, 160, 40, 28, BLUE),
            withAnims(m3d('kn-character', 110, 375, 150, 200, { clip: 'idle', walk: { clip: 'walk', end: 'idle', face: true, look: true } }), walk, jump, jumpClip),
            note('Clic: anda hasta el borde y salta solo.', 860, 170, 330, 90, 2)],
            notes: 'Un clic: el personaje anda hasta el borde (con su animación de andar y mirando hacia donde va) y, después, salta siguiendo un arco con su animación «jump» y un «pop». La línea azul es el arco previsto.' };
        })(),

        { title: 'La física del salto', layout: 'titleOnly', bg: PAPER, back: sheet(), extra: [
          mathBlock({ x: 110, y: 180, w: 520, h: 90, fontSize: 34, latex: 'y(t) = v_0\\,t - \\tfrac{1}{2}\\,g\\,t^2', color: PEN }),
          mathBlock({ x: 110, y: 290, w: 520, h: 100, fontSize: 34, latex: 'h_{\\max} = \\dfrac{v_0^2}{2g}', color: PEN }),
          note('Con v₀ = 12 y g = 30 bloques/s²:<br>altura máxima = 2,4 bloques', 120, 430, 460, 120, -2),
          codeBlock({ x: 660, y: 170, w: 560, h: 420, fontSize: 17, lang: 'javascript', lineSteps: '1-3|5-7|9-11',
            code: '// Cada fotograma (dt en segundos)\nif (saltar && enSuelo) {\n  vy = V0;            // impulso inicial\n}\n'
              + 'vy -= G * dt;         // la gravedad frena\ny  += vy * dt;        // y mueve\nx  += VX * dt;\n\nif (y <= suelo) {\n  y = suelo; vy = 0;   // aterriza\n}' })],
          notes: 'La ecuación del tiro parabólico y su altura máxima (objetos de ecuación) y el mismo cálculo en código, con resaltado por pasos: tres clics recorren impulso, gravedad y aterrizaje.' },

        { title: '¿Llega o no llega?', layout: 'titleOnly', bg: PAPER, back: sheet(), extra: [
          chartBlock({ x: 100, y: 170, w: 720, h: 460, chartType: 'line', color: BLUE, grid: true, xTitle: 'Distancia (bloques)', yTitle: 'Altura (bloques)', seriesName: 'v₀ = 12',
            data: ['0', '1', '2', '3', '4', '5', '6'].map((l, i) => ({ label: l, value: [0, 1.6, 2.4, 2.4, 1.6, 0, null][i] })),
            series: [{ name: 'v₀ = 10', values: [0, 1.2, 1.6, 1.2, 0, null, null], color: RED }, { name: 'v₀ = 14', values: [0, 1.9, 3.0, 3.3, 3.0, 1.9, 0], color: GREEN }] }),
          note('El hueco mide <b>3 bloques</b>:<br>con v₀ = 10 cae dentro.<br>Elegimos 12: llega con margen.', 860, 200, 340, 200, 2),
          hand('(14 es demasiado: se pasa la plataforma)', 860, 440, 340, 90, 26, RED)],
          notes: 'Tres trayectorias en un gráfico de líneas, una por velocidad de salto; los huecos de cada serie (valores vacíos) son el suelo. Cifras del prototipo.' },

        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          H('El nivel entero', 110, 50, 700, 60, 44),
          same(map, img(level, 110, 150, 1060, 265, 'Mapa del nivel 1-2: plataformas, pinchos, un muelle, una plataforma móvil, monedas y la bandera de meta', { fit: 'fill' })),
          same(hero, m3d('kn-character', 250, 230, 60, 80, { clip: 'idle', view: 'side' })),
          note('Sección 2: el salto sobre los pinchos. Pasa a la siguiente para acercarnos.', 110, 470, 520, 110, -1),
          hand('inicio', 140, 420, 120, 40, 28, BLUE), hand('meta', 1080, 420, 100, 40, 28, BLUE)],
          notes: 'El mapa completo del nivel (un dibujo SVG) con el personaje pequeño al principio. La siguiente diapositiva tiene la misma imagen y el mismo modelo, con Transformar.' },

        { layout: 'blank', bg: PAPER, autoAnimate: true, back: sheet(), extra: [
          same(map, img(level, -160, 95, 2000, 500, 'Mapa del nivel 1-2, ampliado en la sección de los pinchos', { fit: 'fill', decorative: true })),
          same(hero, m3d('kn-character', 100, 214, 200, 260, { clip: 'idle', view: 'three', arrive: 'view' })),
          note('Sección 2', 1000, 90, 200, 60, 3, '#ffd1dc')],
          notes: 'Transformar: el mapa se amplía y se desplaza hasta la zona de los pinchos, y el personaje crece y gira hasta su vista de tres cuartos (Desde la anterior ▸ Ir a la vista de esta diapositiva).' },

        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          pollBlock({ kind: 'label', question: 'Pon nombre a cada elemento del nivel', image: levelCrop, fontSize: 28, x: 90, y: 50, w: 1120, h: 620,
            options: ['Pinchos', 'Muelle', 'Moneda', 'Plataforma móvil'], points: [{ x: 23, y: 76 }, { x: 39, y: 86 }, { x: 56, y: 60 }, { x: 77, y: 67 }] })],
          notes: 'Actividad de etiquetar: cada persona arrastra los nombres a los puntos del mapa desde el móvil.' },

        { layout: 'blank', bg: PAPER, transition: 'zoom', back: sheet(), extra: [
          ...plat(820, 470, 300),
          m3d('kn-character', 860, 200, 220, 280, { clip: 'jump', view: 'three', bleed: 1.4 }),
          R(1080, 300, 6, 170, PEN), shape('triangle', 1086, 300, 60, 44, RED, { rotation: 90, sketch: true, stroke: PEN, strokeWidth: 2 }),
          H('Prueba de juego', 110, 170, 640, 80, 64),
          text('Jueves a las 17:00 · cinco personas que no hayan visto el nivel', 112, 260, 600, 80, { fontSize: 26, color: DIM }),
          note('Apuntad dónde mueren y cuántas veces lo intentan.', 112, 380, 420, 110, -2),
          text('Personaje 3D: Kenney (CC0)', 112, 650, 400, 26, { fontSize: 13, color: DIM })],
          notes: 'El personaje salta en bucle junto a la bandera (animación en reposo «jump»).' },
      ]), PEN));
    } },

  // ============================================================================
  // 9 · A theatre rehearsal: velvet curtains, gold and the boards; the cast, the
  //     marks on the stage plan seen from above, the same scene from the stalls
  //     (Transform: the characters keep their ids and change view), line by line.
  show_3d_theater: { name: 'Teatro: el ensayo de la escena', cat: 'showcase',
    summary: 'Personajes 3D que van a sus marcas vistos desde arriba y, con Transformar, desde el patio de butacas; réplicas con sus gestos y telón',
    make: () => {
      const VEL = '#8a1020', VEL2 = '#3a050b', GOLD = '#d9ae55', BOARD = '#7a4a26', CREAM = '#f6ead2', INK = '#2a1a10', DIM = '#d8c3a0', NIGHT = '#140608';
      const PF = FF.playfair;
      const CAST = [['kk-Barbarian', 'Bruno', 'el posadero', 'Pablo Ríos', '#e07a3f'], ['kk-Mage', 'Alma', 'la viajera', 'Lucía Pons', '#9d7cff'],
        ['kk-Rogue_Hooded', 'El forastero', 'nadie sabe quién es', 'Óscar Vidal', '#5fbf8f'], ['kk-Knight', 'El alguacil', 'llega al final', 'Teresa Gil', '#5fa8e8']];
      const ids = CAST.map(() => uid()), knight = lib3d('kk-Knight');
      const curtainSVG = side => svgURL(240, 720, `<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="0">${Array.from({ length: 9 }, (_, i) => `<stop offset="${i / 8}" stop-color="${i % 2 ? VEL : VEL2}"/>`).join('')}</linearGradient></defs>`
        + `<path d="${side === 'l' ? 'M0 0 H240 Q170 360 220 720 H0 Z' : 'M0 0 H240 V720 H20 Q70 360 0 0 Z'}" fill="url(#c)"/>`);
      const valance = svgURL(1280, 90, `<rect width="1280" height="70" fill="${VEL}"/>` + Array.from({ length: 32 }, (_, i) => `<path d="M${i * 40} 70 q20 26 40 0" fill="${VEL}"/>`).join('') + `<rect y="62" width="1280" height="6" fill="${GOLD}"/>`);
      const boards = svgURL(1280, 220, `<rect width="1280" height="220" fill="${BOARD}"/>` + Array.from({ length: 14 }, (_, i) => `<line x1="${640 + (i - 7) * 70}" y1="0" x2="${640 + (i - 7) * 160}" y2="220" stroke="#4a2a12" stroke-width="2"/>`).join(''));
      const stage = (open = true) => [R(0, 0, 1280, 720, NIGHT), scene(boards, 0, 500, 1280, 220), glow(340, 160, 600, '#fff2c8', NIGHT, 18),
        scene(curtainSVG('l'), open ? 0 : 400, 0, 240, 720), scene(curtainSVG('r'), open ? 1040 : 640, 0, 240, 720), scene(valance, 0, 0, 1280, 90)];
      const H = (t, x, y, w, h, size, color = CREAM, p = {}) => text(t, x, y, w, h, { fontFamily: PF, fontSize: size, color, lineHeight: 1.05, ...p });
      const actor = (i, x, y, w, h, props = {}) => same(ids[i], m3d(CAST[i][0], x, y, w, h, { clip: 'Idle', ...props }));
      // The plan from above: where each one starts (in the wings) and their mark.
      const MARKS = [[420, 380], [640, 470], [860, 380], [640, 300]], START = [[75, 200], [75, 400], [1025, 400], [1025, 200]];
      const planSVG = svgURL(1100, 560, `<rect width="1100" height="560" fill="#8a5a33"/>` + Array.from({ length: 22 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="500" stroke="#6e4524" stroke-width="2"/>`).join('')
        + `<rect y="500" width="1100" height="60" fill="${NIGHT}"/>`
        + `<rect x="0" y="0" width="150" height="500" fill="#000" opacity=".35"/><rect x="950" y="0" width="150" height="500" fill="#000" opacity=".35"/>`
        + `<rect x="470" y="170" width="160" height="70" fill="#5a3418" stroke="${GOLD}" stroke-width="2"/>`);
      const planLabels = (ox, oy) => [onPic('PÚBLICO', ox + 550, oy + 540, 24, DIM, { anchor: 'middle', w: 600, fontFamily: 'Georgia, serif', letterSpacing: 10 }),
        onPic('hombro izq.', ox + 75, oy + 40, 20, DIM, { anchor: 'middle', w: 146, fontFamily: 'Georgia, serif' }), onPic('hombro der.', ox + 1025, oy + 40, 20, DIM, { anchor: 'middle', w: 146, fontFamily: 'Georgia, serif' }),
        onPic('mesa', ox + 550, oy + 212, 18, CREAM, { anchor: 'middle', w: 150, fontFamily: 'Georgia, serif' })];

      return numbered(ink2(build({ name: 'Teatro: el ensayo de la escena', palette: 'warm', fonts: 'classic', title: { color: GOLD, font: PF }, body: { color: CREAM } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', back: stage(), extra: [
          text('CUADERNO DE DIRECCIÓN · ENSAYO 4', 260, 130, 760, 34, { fontSize: 18, letterSpacing: 6, color: GOLD, textAlign: 'center' }),
          H('La posada del cruce', 240, 170, 800, 110, 80, CREAM, { textAlign: 'center' }),
          text('Comedia en un acto · escena 2', 340, 285, 600, 40, { fontFamily: PF, fontStyle: 'italic', fontSize: 28, color: DIM, textAlign: 'center' }),
          m3d('kk-Barbarian', 420, 340, 220, 320, { clip: 'Interact', view: 'three' }), m3d('kk-Mage', 640, 340, 220, 320, { clip: 'Idle', view: 'three' })],
          notes: 'Telón, bambalina y tarima dibujados en SVG. El posadero hace su gesto de «servir» en bucle (animación «Interact») y la viajera espera.' },

        { layout: 'blank', bg: NIGHT, back: stage(), extra: [H('El reparto', 260, 110, 760, 60, 44, GOLD, { textAlign: 'center' }), ...CAST.flatMap(([id, n, r, a, c], i) => { const x = 250 + i * 200;
          return [R(x, 200, 180, 420, '#00000066', { radius: 8, stroke: c, strokeWidth: 2 }),
            m3d(id, x + 10, 210, 160, 260, { clip: 'Idle', view: 'three' }),
            text(`<div style="font-family:${PF};font-size:23px;color:${c};font-weight:700">${n}</div><div style="font-style:italic;color:${DIM}">${r}</div><div style="margin-top:8px">${a}</div>`, x + 8, 480, 164, 130, { fontSize: 16, color: CREAM, textAlign: 'center' })]; })],
          notes: 'Los cuatro personajes en reposo, cada uno con su color: el mismo color de su marca en el plano. Nombres de actores inventados.' },

        { layout: 'blank', bg: NIGHT, extra: [
          img(planSVG, 90, 100, 1100, 560, 'Planta del escenario: hombros a los lados, una mesa al fondo y el público abajo'), ...planLabels(90, 100),
          H('Las marcas, desde arriba', 90, 30, 900, 60, 40, GOLD),
          ...MARKS.map(([x, y], i) => text('✕', 90 + x - 20, 100 + y - 20, 40, 40, { fontSize: 32, color: CAST[i][4], textAlign: 'center', fontWeight: 700 })),
          ...CAST.map((_, i) => { const [sx, sy] = START[i], [mx, my] = MARKS[i];
            return withAnims(actor(i, 90 + sx - 55, 100 + sy - 55, 110, 110, { view: 'top', arrive: 'reset', walk: { clip: knight.walk, end: 'Idle', face: true, look: false } }), path([[mx - sx, my - sy]], { start: i ? 'afterPrev' : 'click', duration: 1800 })); })],
          notes: 'La planta del escenario vista desde arriba (Modelo 3D ▸ Vista ▸ Desde arriba). Un clic: los cuatro actores salen de los hombros y van andando, uno tras otro, a su marca de color, girados hacia donde caminan.' },

        { layout: 'blank', bg: NIGHT, autoAnimate: true, back: stage(), extra: [
          H('La misma escena, desde la butaca 7', 240, 110, 800, 60, 40, GOLD, { textAlign: 'center' }),
          actor(0, 330, 320, 200, 300, { view: 'front', arrive: 'view' }), actor(1, 540, 390, 200, 300, { view: 'front', arrive: 'view' }),
          actor(2, 750, 320, 200, 300, { view: 'front', arrive: 'view' }), actor(3, 555, 250, 170, 250, { view: 'front', arrive: 'view' }),
          text('Nadie tapa a nadie: el alguacil, al fondo, queda entre la viajera y el forastero.', 290, 640, 700, 50, { fontSize: 20, color: DIM, textAlign: 'center' })],
          notes: 'Transformar con 3D: los cuatro actores son los mismos objetos que en la planta; viajan a su sitio en el escenario visto desde el público y giran de la vista desde arriba a la de frente (Desde la anterior ▸ Ir a la vista de esta diapositiva).' },

        (() => {   // Line by line: each line appears with its character's gesture.
          // (Each line's appearance and its gesture made in turn: the play order is the order they are made.)
          const LINES = [[0, 'BRUNO', '¡Cerrado! La posada no abre hasta el alba.', 'Interact', 1500],
            [1, 'ALMA', 'Traigo una carta para el dueño. Y no pienso esperar en la nieve.', 'Spellcast_Raise', 1500],
            [2, 'FORASTERO', 'Yo sí esperaré. Aquí, junto al fuego.', 'Sit_Chair_Down', 1200]].map(([i, n, l, c, d]) => [i, n, l, A('fade-in', { duration: 400 }), clip(c, { start: 'withPrev', duration: d })]);
          return { layout: 'blank', bg: NIGHT, back: stage(), extra: [
            R(250, 110, 420, 560, CREAM, { radius: 4, opacity: 96 }),
            text('ESCENA 2 · PÁGINA 14', 280, 130, 360, 30, { fontSize: 15, letterSpacing: 4, color: VEL, fontWeight: 700 }),
            ...LINES.map(([i, n, l, appear], k) => withAnims(text(`<div style="font-weight:700;letter-spacing:2px;color:${VEL}">${n}</div><div style="font-family:${PF};font-style:italic">${l}</div>`, 280, 180 + k * 150, 360, 130, { fontSize: 21, color: INK }), appear)),
            withAnims(m3d(CAST[0][0], 700, 200, 180, 260, { clip: 'Idle' }), LINES[0][4]),
            withAnims(m3d(CAST[1][0], 860, 200, 180, 260, { clip: 'Idle' }), LINES[1][4]),
            m3d('kh-SheenChair', 840, 450, 140, 160, { view: 'three' }),
            withAnims(m3d(CAST[2][0], 820, 400, 180, 230, { clip: 'Idle', view: 'three' }), LINES[2][4], A('clip3d', { clip: 'Sit_Chair_Idle', start: 'afterPrev', duration: 500 }))],
            notes: 'Tres clics, tres réplicas: cada frase aparece a la vez que el gesto de su personaje (animaciones del modelo «con la anterior»): el posadero sirve, la viajera alza los brazos y el forastero se sienta y se queda sentado.' };
        })(),

        { layout: 'blank', bg: NIGHT, back: stage(), extra: [
          H('Tiempos del ensayo', 260, 100, 760, 60, 44, GOLD, { textAlign: 'center' }),
          tableBlock({ x: 260, y: 180, w: 480, h: 400, fontSize: 21, header: true, headBg: GOLD, headFg: INK, stroke: '#5a2a20', banded: true, band: '#ffffff', bandAlpha: 0.05, colW: [4, 2],
            rows: [['Bloque', 'Minutos'], ['Entrada de Alma', '3'], ['La carta', '4'], ['El forastero', '2'], ['Llega el alguacil', '3'], ['Total', '=SUMA(ARRIBA)']] }),
          text('Pasada completa', 790, 180, 230, 34, { fontFamily: PF, fontSize: 24, color: GOLD, textAlign: 'center' }),
          timer(720, 810, 225, 190, { style: 'ring', color: GOLD, auto: false, endText: '¡Telón!' }),
          text('Pulsa al levantar el telón', 790, 430, 230, 60, { fontSize: 17, color: DIM, textAlign: 'center' })],
          notes: 'El total es una fórmula (=SUMA(ARRIBA)): doce minutos, los mismos de la cuenta atrás, que no arranca sola.' },

        { layout: 'blank', bg: NIGHT, back: stage(), extra: [
          R(70, 110, 1140, 570, NIGHT, { opacity: 94, radius: 8, stroke: GOLD, strokeWidth: 2 }),
          pollBlock({ kind: 'choice', question: '¿Qué final ensayamos el viernes?', options: ['Detienen al forastero', 'El forastero es el dueño', 'Todos cenan juntos'], fontSize: 30, x: 100, y: 140, w: 1080, h: 510 })],
          notes: 'La compañía vota desde el móvil cuál de los tres finales se ensaya primero.' },

        { layout: 'blank', bg: NIGHT, transition: 'fade', back: stage(), extra: [
          m3d('kk-Barbarian', 330, 330, 220, 320, { clip: 'Cheer' }), m3d('kk-Knight', 730, 330, 220, 320, { clip: 'Cheer', clipSpeed: 0.8 }),
          H('¡Gracias, compañía!', 240, 140, 800, 90, 66, CREAM, { textAlign: 'center' }),
          text('Ensayo 5: jueves a las 19:30, ya con vestuario', 340, 240, 600, 40, { fontSize: 24, color: DIM, textAlign: 'center' }),
          withAnims(scene(curtainSVG('l'), -240, 0, 240, 720), path([[640, 0]], { start: 'click', duration: 1800, sound: 'applause' })),
          withAnims(scene(curtainSVG('r'), 1280, 0, 240, 720), path([[-640, 0]], { start: 'withPrev', duration: 1800 })),
          text('Personajes 3D: KayKit — Kay Lousberg (CC0) · Silla: Eric Chadwick (CC0)', 340, 660, 600, 26, { fontSize: 12, color: DIM, textAlign: 'center' })],
          notes: 'Dos personajes celebran en bucle. Un clic: dos paños del telón entran desde fuera de la diapositiva y se cierran en el centro entre aplausos (dos trayectorias a la vez).' },
      ]), CREAM));
    } },

  // ============================================================================
  // 10 · Materials that play with light, in a photo studio: a seamless backdrop
  //      and softboxes; iridescence from two angles, brushed metal turning, a
  //      leaf with light through it, velvet; a table of samples and one up close.
  show_3d_materials: { name: 'Materiales que juegan con la luz', cat: 'showcase',
    summary: 'Estudio de fotografía 3D: iridiscencia desde dos ángulos, metal cepillado que gira, hoja a contraluz, terciopelo, muestras con Transformar',
    make: () => {
      const ST = '#17181c', W = '#f3f1ec', DIM = '#a9abb3', IRI = '#c9a6ff', IRI2 = '#7fd6ff', WARM = '#ffb26b', LEAF = '#9ed36a';
      const MR = FF.merri, bottle = uid();
      const studio = (c = '#4a4d57') => [R(0, 0, 1280, 720, c, { fill2: ST, gradType: 'radial' }),
        R(70, -60, 190, 88, '#ffffff', { opacity: 85, radius: 10 }), glow(-10, -160, 320, '#ffffff', ST, 25), R(1020, -60, 190, 88, '#ffffff', { opacity: 85, radius: 10 }), glow(960, -160, 320, '#ffffff', ST, 25)];
      const H = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: MR, fontSize: size, color, fontWeight: 700, lineHeight: 1.12, ...p });
      const lab = (t, x, y, w, c = DIM) => text(t, x, y, w, 30, { fontSize: 15, letterSpacing: 4, color: c, fontWeight: 700, textAlign: 'center' });
      const BY = ['kh-IridescenceLamp', 'kh-AnisotropyBarnLamp', 'kh-DiffuseTransmissionPlant', 'kh-GlamVelvetSofa', 'kh-PotOfCoals'];

      return numbered(ink2(build({ name: 'Materiales que juegan con la luz', palette: 'midnight', fonts: 'editorial', title: { color: W, font: MR, size: 44 }, body: { color: W } }, [
        { layout: 'blank', bg: ST, transition: 'fade', back: studio(), extra: [
          kicker('TALLER DE RENDERIZADO · SESIÓN 5', 80, 220, 600, IRI2, { letterSpacing: 4 }),
          H('Materiales que<br>juegan con la luz', 76, 260, 620, 190, 58),
          text('Cinco efectos que solo se entienden moviendo la cámara', 80, 470, 560, 70, { fontSize: 24, color: DIM }),
          m3d('kh-IridescenceLamp', 680, 160, 520, 500, { view: 'three', motion: 'orbit', edge: 'fade' })],
          notes: 'Un estudio de fotografía: fondo continuo (un degradado radial) y dos ventanas de luz con brillo. La lámpara da una vuelta completa al entrar para que se vea cómo cambian sus colores.' },

        { layout: 'blank', bg: ST, back: studio(), extra: [
          pollBlock({ kind: 'quiz', question: '¿Qué material cambia de color según desde dónde lo mires?', options: ['Iridiscente', 'Metal cepillado', 'Terciopelo', 'Hoja a contraluz'], correct: [0], time: 20, fontSize: 32, x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Pregunta de arranque, antes de ver nada: que cada uno apueste desde el móvil. La respuesta llega en la diapositiva siguiente; vale la pena volver a ella al final.' },

        { title: 'Iridiscencia: el color depende del ángulo', layout: 'titleOnly', bg: ST, back: studio('#3d3a4a'), extra: [
          ...[['front', 'DE FRENTE', 'Una pantalla oscura, casi mate'], ['low', 'DESDE ABAJO', 'Por dentro, el tono cambia al moverla']].flatMap(([v, t, d], i) => { const x = 110 + i * 560;
            return [m3d('kh-IridescenceLamp', x, 180, 480, 380, { view: v }), lab(t, x, 570, 480, i ? IRI2 : IRI), text(d, x, 600, 480, 34, { fontSize: 20, color: W, textAlign: 'center' })]; })],
          notes: 'La misma lámpara con dos vistas de cámara (de frente y desde abajo): por fuera apenas brilla; por dentro, la capa iridiscente cambia de color con el ángulo, como una pompa de jabón. Al presentar, gírala con el ratón.' },

        { layout: 'blank', bg: ST, back: studio('#45403a'), extra: [
          m3d('kh-AnisotropyBarnLamp', 70, 120, 600, 520, { view: 'three', autoRotate: true, spin: 30 }),
          lab('ANISOTROPÍA', 720, 170, 480, WARM),
          H('El metal cepillado', 720, 205, 480, 70, 40, W, { textAlign: 'center' }),
          text('El brillo no es un punto: se estira en la dirección de las rayas del cepillado y corre al girar la pieza.', 740, 290, 440, 140, { fontSize: 22, color: DIM, textAlign: 'center' }),
          img(svgURL(300, 120, `<ellipse cx="150" cy="48" rx="40" ry="40" fill="#ffffff" opacity=".9"/>`), 740, 450, 200, 120, 'Brillo redondo de un metal pulido'),
          onPic('pulido', 840, 549, 18, DIM, { anchor: 'middle', w: 200 }),
          img(svgURL(300, 120, `<ellipse cx="150" cy="60" rx="130" ry="12" fill="#ffffff" opacity=".9"/>`), 980, 450, 200, 120, 'Brillo estirado de un metal cepillado'),
          onPic('cepillado', 1080, 549, 18, DIM, { anchor: 'middle', w: 200 })],
          notes: 'La lámpara gira sola bastante deprisa (30 °/s) para que se vea correr el brillo alargado. Los dos dibujos comparan un brillo pulido y uno cepillado.' },

        { layout: 'blank', bg: '#0f1410', back: [R(0, 0, 1280, 720, '#0f1410'), glow(640, 60, 620, '#fff4c2', '#0f1410', 45)], extra: [
          m3d('kh-DiffuseTransmissionPlant', 600, 60, 640, 620, { view: 'low', edge: 'fade' }),
          lab('TRANSMISIÓN DIFUSA', 80, 210, 480, LEAF),
          H('Una hoja a contraluz', 80, 245, 480, 70, 40, W, { textAlign: 'center' }),
          text('La luz entra por detrás, se reparte dentro de la hoja y sale verde y suave. Mirada desde abajo, con el foco detrás, se nota más.', 100, 330, 440, 170, { fontSize: 22, color: DIM, textAlign: 'center' })],
          notes: 'La planta vista desde abajo (Modelo 3D ▸ Vista ▸ Desde abajo) con un foco cálido detrás, y los bordes difuminados para que se funda con la oscuridad.' },

        { layout: 'blank', bg: ST, back: studio('#3b3036'), extra: [
          m3d('kh-GlamVelvetSofa', 380, 180, 820, 460, { view: 'three', motion: 'swing' }),
          lab('BRILLO DE TERCIOPELO', 80, 160, 420, '#ff8fb1', { textAlign: 'left' }),
          H('El terciopelo brilla en los bordes', 80, 195, 420, 130, 38),
          text('Sus fibras de pie devuelven la luz sobre todo en los cantos: por eso un cojín parece tener un halo.', 80, 340, 380, 150, { fontSize: 21, color: DIM })],
          notes: 'El sofá se balancea al entrar (Modelo 3D ▸ Vista ▸ Al entrar ▸ Balanceo): el brillo aparece y desaparece en los cantos.' },

        { layout: 'blank', bg: ST, back: [...studio(), R(80, 470, 1120, 26, '#2a2b31', { radius: 4 })], extra: [
          H('La mesa de muestras', 80, 180, 700, 60, 40),
          ...[['kh-Avocado', 'Orgánico'], ['kh-WaterBottle', 'Metal y pintura'], ['kh-Lantern', 'Hierro viejo'], ['kh-PotOfCoals', 'Brasas que brillan']].map(([id, t], i) => { const x = 110 + i * 270;
            return id === 'kh-WaterBottle' ? same(bottle, m3d(id, x, 270, 220, 210, { view: 'three' })) : m3d(id, x, 270, 220, 210, { view: 'three' }); }),
          ...['Orgánico', 'Metal y pintura', 'Hierro viejo', 'Brasas que brillan'].map((t, i) => text(t, 110 + i * 270, 510, 220, 36, { fontSize: 20, color: W, textAlign: 'center' })),
          text('Pasa a la siguiente: miramos de cerca la botella.', 80, 590, 700, 36, { fontSize: 19, color: DIM })],
          notes: 'Cuatro modelos pequeños sobre la mesa. La botella tiene el mismo objeto en la diapositiva siguiente, que lleva Transformar.' },

        { layout: 'blank', bg: ST, autoAnimate: true, back: studio('#2f3a45'), extra: [
          same(bottle, m3d('kh-WaterBottle', 60, 80, 520, 600, { view: 'front', arrive: 'turn' })),
          H('Un material, cuatro mapas', 640, 110, 580, 60, 38),
          tableBlock({ x: 640, y: 200, w: 560, h: 330, fontSize: 20, header: true, headBg: IRI2, headFg: ST, stroke: '#3a4450', banded: true, band: '#ffffff', bandAlpha: 0.05, colW: [3, 4],
            rows: [['Mapa', 'Qué dice'], ['Color base', 'El color sin luz ni brillo'], ['Metálico', 'Dónde es metal (1) y dónde pintura (0)'], ['Rugosidad', 'Pulido (0) o mate (1)'], ['Normales', 'Relieve fino: golpes y rayas']] }),
          text('El tapón es metálico y pulido; la etiqueta, pintura mate.', 640, 560, 560, 60, { fontSize: 20, color: DIM })],
          notes: 'Transformar con 3D: la botella sale de la mesa, crece y da una vuelta completa hasta quedar de frente (Desde la anterior ▸ Dar una vuelta hasta su vista); las demás muestras desaparecen.' },

        { title: 'Cada material, en su sitio', layout: 'titleOnly', bg: ST, back: studio(), extra: [
          chartBlock({ x: 80, y: 160, w: 620, h: 480, chartType: 'radar', yMax: 10, seriesName: 'Lámpara iridiscente', color: IRI,
            data: ['Rugosidad', 'Metálico', 'Transmisión', 'Brillo de borde', 'Iridiscencia'].map((l, i) => ({ label: l, value: [3, 2, 6, 2, 10][i] })),
            series: [{ name: 'Lámpara de granero', values: [4, 10, 0, 1, 0], color: WARM }, { name: 'Planta', values: [6, 0, 9, 3, 0], color: LEAF }, { name: 'Sofá', values: [9, 0, 0, 10, 0], color: '#ff8fb1' }] }),
          codeBlock({ x: 740, y: 170, w: 460, h: 440, fontSize: 17, lang: 'json', lineSteps: '2-5|6-9',
            code: '{\n  "pbrMetallicRoughness": {\n    "metallicFactor": 1.0,\n    "roughnessFactor": 0.35\n  },\n  "extensions": {\n    "KHR_materials_anisotropy": {\n      "anisotropyStrength": 0.8\n    }\n  }\n}' })],
          notes: 'Un radar con cuatro series para comparar los materiales (puntuaciones orientativas de 0 a 10) y, a la derecha, cómo se escribe el metal cepillado en un archivo glTF: dos clics resaltan sus dos partes.' },

        { layout: 'blank', bg: ST, transition: 'fade', back: studio(), extra: [
          m3d('kh-IridescenceLamp', 760, 150, 440, 440, { view: 'front', autoRotate: true, spin: -20 }),
          H('Ahora, a fotografiar', 80, 200, 640, 80, 52),
          text('Elige una muestra, coloca dos luces y busca el ángulo donde el material se luce más.', 80, 300, 600, 110, { fontSize: 24, color: DIM }),
          credits(BY, 80, 600, 1120, '#7d808a', { fontSize: 10, h: 90 })],
          notes: 'Cierre con la lámpara girando sola al revés (velocidad negativa). Créditos de los modelos con licencia CC BY abajo; la botella, el aguacate y el farol son CC0.' },
      ]), W));
    } },

};
