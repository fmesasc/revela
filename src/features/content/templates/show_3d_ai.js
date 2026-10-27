// Example presentation: Modelos 3D creados con IA (showcase).
//
// Six real 3D models made with Revela's own AI (TRELLIS.2 through Runware, from a text): a laboratory microscope, an
// animal cell in section, a toy robot, a giraffe, a doctor in a white coat and a combustion engine. They are files of
// the repository (assets/ai3d/*.glb, with a transparent cover *.webp), not from the 3D libraries, so the blocks are
// written by hand here (the `model` builder of the kit is only for the library). A photo studio / gallery look:
// slate-grey walls with a warm spotlight, brass labels like a museum's.

import { build, text, shape, A, withAnims, numbered, base } from './kit.js';

const BG = '#25292e', BG2 = '#3a3f45', PLATE = '#2f343a', LINE = '#4a5057', INK = '#f4efe6', MUTE = '#b9b1a5', BRASS = '#e3b066', DEEP = '#1b1e22';
const SERIF = "'Cormorant Garamond', serif";
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// (Absolute, from where the app is served: an exported or shared copy keeps finding the files.)
const A3 = new URL('../../../../assets/ai3d/', import.meta.url).href;
// A model of the repository (assets/ai3d/<id>.glb), with its transparent cover.
const ai3d = (id, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'model', src: `${A3}${id}.glb`, poster: `${A3}${id}.webp`,
  alt, autoRotate: false, view: 'front', ...props });
const kicker = (t, x, y, w, props = {}) => text(t, x, y, w, 30, { fontSize: 16, letterSpacing: 4, color: BRASS, fontWeight: 700, ...props });
const H = (t, x, y, w, h, size, props = {}) => text(t, x, y, w, h, { fontFamily: SERIF, fontSize: size, color: INK, fontWeight: 700, lineHeight: 1.02, ...props });
const foot = (x = 60, color = MUTE) => text('Creado con IA en Revela · TRELLIS.2', x, 674, 520, 26, { fontSize: 13, color, letterSpacing: 1 });
// The studio: a wall that is lit from above, a floor line, and a spotlight behind where the piece stands.
const studio = (cx = 380, cy = 360) => [R(0, 0, 1280, 720, BG, { fill2: DEEP, gradType: 'radial' }),
  E(cx - 330, cy - 300, 660, 600, BG2, { opacity: 0.55 }), E(cx - 250, cy - 230, 500, 460, '#4b5158', { opacity: 0.45 })];
const floor = (cx, y, w = 440) => [E(cx - w / 2, y, w, 44, '#0f1114', { opacity: 0.55 }), E(cx - w / 2 + 40, y + 8, w - 80, 26, '#0b0c0e', { opacity: 0.6 })];
// A brass-labelled fact: a number, a bold title and one or two lines.
const fact = (n, t, d, x, y, w, h = 118) => [R(x, y, w, h, PLATE, { radius: 6, stroke: LINE, strokeWidth: 1 }), R(x, y, 5, h, BRASS, { radius: 3 }),
  text(`<div style="font-family:${SERIF};font-size:26px;font-weight:700;color:${INK}"><span style="color:${BRASS}">${n}</span>&nbsp; ${t}</div><div style="margin-top:4px">${d}</div>`,
    x + 22, y, w - 34, h, { fontSize: 18, color: MUTE, lineHeight: 1.32, vAlign: 'middle', pad: [6, 6, 6, 6] })];
// One slide for one model: the piece on the left, big and turnable; on the right its label and three facts.
const piece = ({ no, id, name, title, lead, facts, notes, alt, view = 'front', spin = 14, box = [70, 70, 620, 560], by = 600, bw = 440, side = false }) => ({
  layout: 'blank', transition: 'fade', back: [...studio(380, 340), ...floor(380, by, bw)], notes,
  extra: [ai3d(id, ...box, alt, { autoRotate: true, spin, view, edge: 'fade' }),
    kicker(`PIEZA ${no} · ${name}`, 740, 66, 480), H(title, 736, 98, 490, 110, 50), text(lead, 740, 222, 480, 70, { fontSize: 19, color: INK, lineHeight: 1.3 }),
    ...facts.flatMap(([t, d], i) => withAnims0(fact(`0${i + 1}`, t, d, 740, 300 + i * 124, 480), i)), foot(740)] });
// Each fact appears with a click, one after another.
const withAnims0 = (parts, i) => parts.map((b, j) => withAnims(b, A('fade-left', { start: i || j ? 'withPrev' : 'click', duration: 420, delay: j ? 0 : 0 })));

export default {
  show_3d_ai: { name: 'Modelos 3D creados con IA', cat: 'showcase',
    summary: 'Galería de seis modelos 3D hechos con IA a partir de un texto: giran con el ratón, con datos de cada uno, ideas para clase y cómo pedirlos',
    make: () => numbered(build({ name: 'Modelos 3D creados con IA', palette: 'grayscale', fonts: 'elegant', title: { color: INK, size: 50 }, body: { color: INK }, bg: BG }, [

      // 1 · cover
      { layout: 'blank', transition: 'fade', back: [...studio(930, 350), ...floor(930, 610, 380)], extra: [
        kicker('GALERÍA · SEIS PIEZAS', 80, 130, 600), H('Modelos 3D<br>creados con IA', 76, 170, 700, 250, 92),
        text('Una frase, un minuto y una pieza que puedes girar con el ratón', 80, 440, 580, 90, { fontSize: 28, color: MUTE, lineHeight: 1.25 }),
        text('Hechos con la IA de Revela', 80, 560, 520, 40, { fontSize: 20, color: BRASS, fontWeight: 700 }), foot(80),
        ai3d('jirafa', 690, 50, 480, 590, 'Jirafa en 3D creada con IA', { autoRotate: true, spin: 12, edge: 'fade' })],
        notes: 'Todo lo que se ve en esta presentación es un modelo 3D creado con la IA de Revela a partir de una descripción escrita. La jirafa de la portada gira sola; en cada pieza se puede girar con el ratón o con el dedo.' },

      // 2 · how it is made
      { layout: 'blank', transition: 'fade', back: studio(640, 300), extra: [
        kicker('CÓMO SE HACE', 80, 60, 500), H('De una frase a una pieza en tres pasos', 76, 92, 1100, 70, 52),
        ...[['01', 'Describes', 'Escribes qué quieres, por ejemplo «un microscopio de laboratorio». Cuanto más concreto, mejor.'],
          ['02', 'La IA dibuja', 'Primero crea una imagen de referencia del objeto, con fondo liso y bien iluminada.'],
          ['03', 'Se reconstruye', 'Un modelo de Microsoft, TRELLIS.2, convierte esa imagen en un objeto en tres dimensiones.']].flatMap(([n, t, d], i) => {
          const x = 80 + i * 390; return [R(x, 200, 360, 300, PLATE, { radius: 8, stroke: LINE, strokeWidth: 1 }),
            ...[withAnims(text(n, x + 24, 214, 140, 80, { fontFamily: SERIF, fontSize: 64, color: BRASS, fontWeight: 700 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 400 })),
              withAnims(text(`<div style="font-family:${SERIF};font-size:32px;font-weight:700;color:${INK}">${t}</div><div style="margin-top:8px">${d}</div>`, x + 24, 296, 312, 190,
                { fontSize: 22, color: MUTE, lineHeight: 1.35 }), A('fade-in', { start: 'withPrev', duration: 400 }))]]; }),
        R(80, 540, 1120, 100, '#2c3137', { radius: 8, stroke: BRASS, strokeWidth: 1 }),
        text('Unos 30 a 60 segundos por modelo. El resultado es un archivo GLB de uno o dos megas, ya optimizado, que se gira con el ratón y se guarda en la presentación.', 110, 540, 1060, 100,
          { fontSize: 21, color: INK, lineHeight: 1.35, vAlign: 'middle' }), foot()],
        notes: 'Explica el proceso sin tecnicismos: descripción, imagen de referencia, reconstrucción. Los tiempos son aproximados y dependen del momento. El formato GLB es el estándar abierto para modelos 3D y lo entienden muchos programas.' },

      // 3 · the gallery
      { layout: 'blank', transition: 'fade', back: studio(640, 380), extra: [
        kicker('LA GALERÍA', 80, 60, 400), H('Seis piezas, seis ideas', 76, 92, 900, 70, 52),
        ...[['microscopio', 'Microscopio'], ['celula', 'Célula animal'], ['robot', 'Robot de juguete'], ['jirafa', 'Jirafa'], ['medico', 'Médico'], ['motor', 'Motor']].flatMap(([id, n], i) => {
          const x = 70 + i * 186; return [withAnims(R(x, 210, 170, 330, PLATE, { radius: 8, stroke: LINE, strokeWidth: 1 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 350 })),
            withAnims(img(`${A3}${id}.webp`, x + 5, 225, 160, 260, n + ' (portada)'), A('fade-up', { start: 'withPrev', duration: 350 })),
            withAnims(text(n, x, 490, 170, 40, { fontFamily: SERIF, fontSize: 21, color: BRASS, fontWeight: 700, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 350 }))]; }),
        text('Un instrumento, una célula, un juguete, un animal, una persona y una máquina: seis tipos de objeto muy distintos, todos hechos con el mismo método.', 80, 570, 1120, 80,
          { fontSize: 22, color: INK, lineHeight: 1.35 }), foot()],
        notes: 'Presenta la colección: cada pieza tiene su diapositiva con el modelo grande para girarlo. Cada una sale de una sola frase, sin modelar nada a mano.' },

      // 4-9 · the pieces
      piece({ no: '01', id: 'microscopio', name: 'MICROSCOPIO', title: 'Microscopio de laboratorio', alt: 'Microscopio de laboratorio en 3D creado con IA',
        lead: 'Una herramienta que se entiende mejor dándole vueltas: gira la pieza y busca estas partes.',
        facts: [['Oculares y objetivos', 'Por los oculares miras; los objetivos, en el revólver, son las lentes que aumentan la muestra.'],
          ['Platina', 'La mesa plana donde se sujeta la preparación, justo debajo del objetivo.'],
          ['Tornillos de enfoque', 'El grande acerca de golpe; el pequeño afina hasta ver la muestra nítida.']],
        notes: 'Idea para clase: pedir al alumnado que localice cada parte girando el modelo y que luego la nombre. Es un modelo creado por IA: es una interpretación de un microscopio, no el plano de un modelo concreto.' }),
      piece({ no: '02', id: 'celula', name: 'CÉLULA ANIMAL', title: 'Célula animal, en corte', alt: 'Célula animal en corte, modelo 3D creado con IA', by: 520, spin: 10,
        lead: 'Cortada por la mitad para ver el interior. Es una interpretación artística, no un plano exacto.',
        facts: [['Núcleo', 'La esfera central: guarda el ADN y da las órdenes a la célula.'],
          ['Orgánulos', 'Retículo endoplasmático y aparato de Golgi fabrican y empaquetan proteínas; las mitocondrias dan energía.'],
          ['Membrana', 'La piel de la célula: decide qué entra y qué sale.']],
        notes: 'Buena pieza para Biología: se puede preguntar qué orgánulos reconocen en el corte. Avisa de que la IA no distingue siempre cada orgánulo con precisión; sirve como punto de partida, no como esquema de examen.' }),
      piece({ no: '03', id: 'robot', name: 'ROBOT DE JUGUETE', title: 'Un robot con carita', alt: 'Robot de juguete en 3D creado con IA', spin: 16,
        lead: 'Un personaje inventado en segundos. Sirve para hablar de cómo se diseña algo que cae simpático.',
        facts: [['Cabeza grande', 'Las proporciones de bebé (cabeza y ojos grandes) nos parecen tiernas.'],
          ['Visor oscuro', 'Una pantalla lisa para los ojos: sencillo de dibujar y de animar.'],
          ['Formas redondeadas', 'Sin aristas y en color claro: un aspecto amable y limpio.']],
        notes: 'Para Tecnología o Plástica: cada grupo pide su propio robot cambiando el color o el material y compara resultados. Es un ejemplo de diseño de personajes.' }),
      piece({ no: '04', id: 'jirafa', name: 'JIRAFA', title: 'Jirafa: un animal hecho de adaptaciones', alt: 'Jirafa en 3D creada con IA', spin: 14,
        lead: 'Un animal completo y reconocible con solo describirlo. Gírala para ver su silueta.',
        facts: [['Cuello largo', 'Tiene siete vértebras en el cuello, las mismas que una persona, pero mucho más largas.'],
          ['Manchas', 'Cada jirafa tiene un dibujo distinto, como una huella dactilar.'],
          ['Altura', 'Alcanza las hojas más altas de las acacias, donde otros herbívoros no llegan.']],
        notes: 'Para Naturales: relacionar forma y función. Se puede pedir otro animal y comparar adaptaciones. Los datos son generales; si se quieren cifras concretas, conviene contrastarlas.' }),
      piece({ no: '05', id: 'medico', name: 'PERSONAJE', title: 'Una persona como personaje 3D', alt: 'Médico con bata blanca en 3D creado con IA', box: [150, 50, 460, 590], by: 596, bw: 360, spin: 14,
        lead: 'Un médico con bata blanca y fonendo, de cuerpo entero. Útil como figura para escenas y maquetas.',
        facts: [['Detalle', 'Pelo, bata, fonendoscopio y manos salen reconocibles desde una sola descripción.'],
          ['Aviso honesto', 'De momento es una figura quieta: no tiene esqueleto ni animación, así que no se mueve ni anda.'],
          ['Usos', 'Escenas de simulación, carteles, maquetas de un hospital o la portada de un trabajo.']],
        notes: 'Conviene ser claros: es como una estatua. Se puede girar, ampliar y colocar en una diapositiva, pero no se mueve. Para que salga bien, pedir cuerpo entero y fondo liso.' }),
      piece({ no: '06', id: 'motor', name: 'MOTOR', title: 'Motor de combustión', alt: 'Motor de combustión en 3D creado con IA', by: 580, spin: 12,
        lead: 'Cuatro tiempos en tres pasos. El modelo es una interpretación: sirve para explicar el ciclo.',
        facts: [['Admisión y compresión', 'El pistón baja y entra la mezcla de aire y combustible; al subir, la comprime.'],
          ['Explosión', 'La chispa enciende la mezcla y la fuerza empuja el pistón hacia abajo.'],
          ['Escape', 'El pistón vuelve a subir y expulsa los gases quemados.']],
        notes: 'Explicar los cuatro tiempos con el modelo girando de fondo. Aviso: la IA ha inventado la forma de las piezas; no es un esquema técnico real, y no sirve para una práctica de mecánica.' }),

      // 10 · ideas for class
      { layout: 'blank', transition: 'fade', back: studio(640, 340), extra: [
        kicker('IDEAS PARA CLASE', 80, 60, 500), H('Un modelo para cada asignatura', 76, 92, 1100, 70, 52),
        ...[['Ciencias', 'Una célula, un volcán o una flor abierta que el alumnado gira para localizar partes.'], ['Tecnología', 'Máquinas y prototipos: pedir un diseño, compararlo y mejorar la descripción.'],
          ['Historia', 'Un casco, una vasija o un edificio antiguo para observar desde todos los lados.'], ['Lengua e inglés', 'Un objeto por equipo y a describirlo en voz alta con el vocabulario nuevo.'],
          ['Plástica y diseño', 'Personajes y objetos inventados: el alumnado prueba materiales, colores y estilos.'], ['Cualquier tema', 'Una pieza propia para la portada de un trabajo o una exposición.']].flatMap(([t, d], i) => {
          const x = 80 + (i % 3) * 380, y = 200 + Math.floor(i / 3) * 210;
          return [withAnims(R(x, y, 360, 190, PLATE, { radius: 8, stroke: LINE, strokeWidth: 1 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 350 })),
            withAnims(text(`<div style="font-family:${SERIF};font-size:30px;font-weight:700;color:${BRASS}">${t}</div><div style="margin-top:6px">${d}</div>`, x + 20, y, 322, 190,
              { fontSize: 18, color: INK, lineHeight: 1.35, vAlign: 'middle' }), A('fade-in', { start: 'withPrev', duration: 350 }))]; }), foot()],
        notes: 'Cada pieza se hace en menos de un minuto, así que el alumnado puede crear la suya durante la clase. Pide que describan lo que quieren con precisión: es también un ejercicio de redacción.' },

      // 11 · how to ask for it
      { layout: 'blank', transition: 'fade', back: studio(300, 360), extra: [
        kicker('CÓMO PEDIRLO BIEN', 80, 60, 500), H('Cinco consejos para que salga a la primera', 76, 92, 1100, 70, 52),
        ...[['Un solo objeto', 'Describe una cosa, no una escena entera.'], ['Di el material', '«De madera», «de plástico blanco», «de metal oxidado».'],
          ['Fondo liso', 'Pide fondo blanco o neutro y sin sombras ni suelo.'], ['Cuerpo entero', 'Si es una persona o un animal, pide que salga entero y de pie.'],
          ['Pide una pose sencilla', 'Mejor de frente y relajado que en un gesto retorcido.']].flatMap(([t, d], i) => {
          const y = 195 + i * 90; return [withAnims(R(80, y, 1120, 78, PLATE, { radius: 6, stroke: LINE, strokeWidth: 1 }), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 350 })),
            withAnims(text(String(i + 1), 100, y, 60, 78, { fontFamily: SERIF, fontSize: 44, color: BRASS, fontWeight: 700, vAlign: 'middle' }), A('fade-left', { start: 'withPrev', duration: 350 })),
            withAnims(text(`<span style="font-family:${SERIF};font-size:28px;font-weight:700;color:${INK}">${t}</span> &nbsp; ${d}`, 170, y, 1010, 78, { fontSize: 20, color: MUTE, vAlign: 'middle', lineHeight: 1.25 }), A('fade-left', { start: 'withPrev', duration: 350 }))]; }), foot()],
        notes: 'Estos consejos salen de probar muchas descripciones. Si el resultado no convence, se cambia una sola cosa de la descripción y se vuelve a crear; es más rápido que empezar de cero.' },

      // 12 · closing
      { layout: 'blank', transition: 'fade', back: [...studio(930, 350), ...floor(930, 610, 400)], extra: [
        kicker('PRUÉBALO', 80, 120, 500), H('Crea tu propia pieza', 76, 160, 700, 190, 86),
        text('En el menú IA ▸ Crear modelo 3D con IA, elige el modo «Realista», escribe lo que quieres y espera menos de un minuto.', 80, 380, 590, 130, { fontSize: 24, color: INK, lineHeight: 1.35 }),
        R(80, 540, 360, 64, BRASS, { radius: 32 }), text('IA ▸ Crear modelo 3D con IA', 80, 540, 360, 64, { fontSize: 20, color: DEEP, fontWeight: 700, textAlign: 'center', vAlign: 'middle' }), foot(80),
        ai3d('robot', 690, 60, 480, 540, 'Robot de juguete en 3D creado con IA', { autoRotate: true, spin: 18, edge: 'fade' })],
        notes: 'Cierra animando a probarlo: el robot de la portada de cierre gira solo. Se puede crear una pieza en directo, con las ideas que proponga la clase.' },
    ])) },
};
