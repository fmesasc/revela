// Example presentation: Madrid en cinco piezas (showcase).
//
// A class on Madrid (ESO, Bachillerato and trips) with five real 3D models made with Revela's own AI (TRELLIS.2 through
// Runware): the bear and the strawberry tree of the Puerta del Sol, the Puerta de Alcalá, the Cibeles fountain, the Temple
// of Debod and a chulapo. They are files of the repository (assets/ai3d/madrid-*.glb with a transparent cover *.webp).
// The chulapo carries a skeleton made by Revela's own automatic rig (Idle, Walk, Run, Wave… clips): it strolls along a
// path playing «Walk». Every model is «made with AI, inspired by…»: never the real piece nor to scale.
// Look: Cibeles red and cream, granite grey and black, gold details, Abril Fatface with Cormorant Garamond, arches and a
// skyline drawn with shapes. Only facts read by the author go on the slides (sources in each slide's notes).

import { build, text, shape, A, withAnims, path, numbered, base } from './kit.js';

const RED = '#a3182a', DRED = '#5e0d19', CREAM = '#f6eedc', CREAM2 = '#e9dcc0', LINE = '#cdbd9a', INK = '#17171b', MUTE = '#4a4540',
  GRAN = '#4d5058', GRAN2 = '#2b2d33', GOLD = '#c9a24a';
const DISPLAY = "'Abril Fatface', serif", CLASSIC = "'Cormorant Garamond', serif";
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
const T = (x, y, w, h, fill, p = {}) => shape('triangle', x, y, w, h, fill, p);
// (Absolute, from where the app is served: an exported or shared copy keeps finding the files.)
const A3 = new URL('../../../../assets/ai3d/', import.meta.url).href;
const ai3d = (id, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'model', src: `${A3}${id}.glb`, poster: `${A3}${id}.webp`,
  alt, autoRotate: false, view: 'front', ...props });
const pop = b => withAnims(b, A('zoom-in', { start: 'withPrev', duration: 700 }));
const kicker = (t, x, y, w, props = {}) => text(t, x, y, w, 30, { fontSize: 16, letterSpacing: 4, color: RED, fontWeight: 700, ...props });
const H = (t, x, y, w, h, size, props = {}) => text(t, x, y, w, h, { fontFamily: DISPLAY, fontSize: size, color: INK, lineHeight: 1.08, ...props });
const sub = (t, x, y, w, h, size, props = {}) => text(t, x, y, w, h, { fontFamily: CLASSIC, fontSize: size, color: MUTE, fontWeight: 700, lineHeight: 1.2, ...props });
const foot = (x = 60, color = MUTE) => text('Madrid · modelos 3D hechos con IA en Revela', x, 678, 520, 26, { fontSize: 13, color, letterSpacing: 1 });
const cap = (t, x, y, w, color = MUTE) => text(t, x, y, w, 40, { fontFamily: CLASSIC, fontSize: 18, fontWeight: 700, color, textAlign: 'center', lineHeight: 1.1 });

// An arch: a rectangle with a half circle on top.
const arch = (x, y, w, h, fill, p = {}) => [E(x, y, w, w, fill, p), R(x, y + w / 2, w, h - w / 2, fill, p)];
// A framed arch (gold edge, cream inside) to hold a model.
const frame = (x, y, w, h, inner = CREAM, edge = GOLD) => [...arch(x, y, w, h, edge), ...arch(x + 8, y + 8, w - 16, h - 8, inner)];
// A skyline at the bottom edge: towers, a dome, a pediment and an arcade, in one colour.
const skyline = (color, op = 1, y0 = 720) => {
  const o = { opacity: op }, b = (x, w, h) => R(x, y0 - h, w, h, color, o);
  return [b(0, 120, 60), b(100, 70, 96), T(100, y0 - 140, 70, 44, color, o), b(190, 150, 70), b(360, 56, 120), T(356, y0 - 160, 64, 40, color, o),
    b(440, 150, 80), E(480, y0 - 124, 70, 70, color, o), b(540, 50, 100), b(610, 130, 66), R(650, y0 - 130, 18, 64, color, o), b(770, 60, 112), T(766, y0 - 156, 68, 44, color, o),
    b(850, 170, 74), b(1040, 80, 98), E(1048, y0 - 150, 64, 64, color, o), b(1140, 140, 60)];
};
const sunRays = (cx, cy, d, color, op) => [E(cx - d / 2, cy - d / 2, d, d, color, { opacity: op })];
// Backgrounds
const cream = () => [R(0, 0, 1280, 720, CREAM, { fill2: CREAM2, gradType: 'radial' }), R(0, 0, 1280, 14, RED), R(0, 14, 1280, 4, GOLD),
  R(0, 668, 1280, 2, LINE), R(0, 672, 1280, 1, LINE)];
const red = () => [R(0, 0, 1280, 720, RED, { fill2: DRED, gradType: 'radial' }), R(0, 0, 1280, 14, GOLD)];
const granite = () => [R(0, 0, 1280, 720, GRAN, { fill2: GRAN2, gradType: 'radial' }), R(0, 0, 1280, 14, RED), R(0, 14, 1280, 4, GOLD)];
const floor = (cx, y, w = 400, dark = '#7a6a4c') => [E(cx - w / 2, y, w, 40, dark, { opacity: 0.3 }), E(cx - w / 2 + 50, y + 8, w - 100, 24, dark, { opacity: 0.35 })];
const card = (x, y, w, h, accent = RED) => [R(x, y, w, h, '#fbf6ea', { radius: 6, stroke: LINE, strokeWidth: 1 }), R(x, y, 6, h, accent, { radius: 3 })];
// A fact: a bold title and one or two lines, on a card.
const fact = (t, d, x, y, w, h = 110, accent = RED) => [...card(x, y, w, h, accent),
  text(`<div style="font-family:${DISPLAY};font-size:24px;color:${INK}">${t}</div><div style="margin-top:4px">${d}</div>`,
    x + 22, y, w - 36, h, { fontSize: 18, color: MUTE, lineHeight: 1.3, vAlign: 'middle', pad: [6, 6, 6, 6] })];
// Each part appears with a click, one after another.
const seq = (parts, i, effect = 'fade-left') => parts.map((b, j) => withAnims(b, A(effect, { start: i || j ? 'withPrev' : 'click', duration: 420 })));

export default {
  show_madrid: { name: 'Madrid en cinco piezas 3D', cat: 'showcase',
    summary: 'Madrid para clase con cinco modelos 3D hechos con IA: Sol, Alcalá, Cibeles, Debod y un chulapo que pasea; con datos y retos',
    make: () => numbered(build({ name: 'Madrid en cinco piezas 3D', palette: 'paper', fonts: 'display', title: { color: INK, size: 46 }, body: { color: INK }, bg: CREAM }, [

      // 1 · cover
      { layout: 'blank', transition: 'fade', back: [...red(), ...sunRays(970, 360, 640, '#d4414f', 0.35), ...skyline(DRED, 0.9), R(0, 650, 1280, 70, INK), ...skyline(INK, 1, 650)], extra: [
        ...frame(760, 50, 420, 570, CREAM, GOLD),
        kicker('MADRID PARA CLASE · ESO, BACHILLERATO Y VIAJES', 80, 140, 640, { color: GOLD }),
        H('MADRID', 74, 176, 680, 150, 128, { color: CREAM, letterSpacing: 4 }),
        sub('en cinco piezas 3D', 80, 330, 640, 60, 44, { color: CREAM }),
        text('Un recorrido por sus símbolos con modelos hechos con IA: unos monumentos y un chulapo que pasea', 80, 410, 560, 100, { fontSize: 22, color: '#f1dcd8', lineHeight: 1.3 }),
        R(80, 530, 120, 4, GOLD), foot(80, '#e9c9c5'),
        pop(ai3d('madrid-alcala', 765, 110, 410, 450, 'Puerta de Alcalá en 3D, modelo creado con IA e inspirado en el monumento', { autoRotate: true, spin: 14, edge: 'fade' })),
        cap('Modelo hecho con IA, inspirado en la Puerta de Alcalá', 780, 560, 380, MUTE)],
        notes: 'Bienvenida. Vamos a recorrer Madrid con cinco piezas en tres dimensiones que se pueden girar con el ratón: el Oso y el Madroño de Sol, la Puerta de Alcalá, Cibeles, el Templo de Debod y un chulapo. Todos son modelos hechos con la IA de Revela a partir de una descripción: están inspirados en los monumentos, no son la pieza real ni están a escala, y pueden tener detalles inventados o simplificados. En la portada gira la Puerta de Alcalá.' },

      // 2 · the capital
      { layout: 'blank', transition: 'fade', back: [...cream(), ...skyline('#e2d3b2', 1, 668)], extra: [
        kicker('LA CAPITAL', 70, 56, 400), H('MADRID, CAPITAL DE ESPAÑA', 66, 88, 1000, 70, 46),
        sub('Una villa que se convirtió en corte', 70, 160, 900, 44, 30),
        ...seq([...fact('13 de febrero de 1561', 'Felipe II decide trasladar la corte a Madrid. Se la considera la primera capital permanente de la monarquía española.', 70, 230, 560, 140)], 0),
        ...seq([...fact('1601 a 1606', 'Una única excepción: durante esos años la corte estuvo en Valladolid.', 70, 390, 560, 110, GRAN)], 1),
        ...seq([...fact('Un nombre antiguo: Magerit', 'El primer nombre documentado es el andalusí Maǧrīṭ, que pasó al castellano antiguo como Magerit.', 670, 230, 540, 140, GRAN)], 2),
        ...seq([...fact('¿De dónde viene?', 'Hay dos hipótesis: «cauce de agua» (maǧra) o «matriz». La segunda es la más extendida hoy.', 670, 390, 540, 140)], 3),
        foot()],
        notes: 'Madrid no siempre fue capital. Según la Wikipedia, Felipe II decidió trasladar la corte el 13 de febrero de 1561, y se la considera la primera capital permanente de la monarquía española. Hubo una excepción entre 1601 y 1606, cuando la corte estuvo en Valladolid. El primer nombre documentado es andalusí, Maǧrīṭ, que pasó al castellano como Magerit; hay dos hipótesis sobre su origen, y la más extendida hoy es que viene del romance matrice, matriz. Pregunta para la clase: ¿qué ventajas tiene una capital en el centro del país? (es.wikipedia.org, artículo Madrid).' },

      // 3 · the bear and the tree: the coat of arms
      { layout: 'blank', transition: 'fade', back: [...cream(), ...skyline('#e2d3b2', 1, 668)], extra: [
        ...frame(70, 76, 420, 570, CREAM2, GOLD),
        pop(ai3d('madrid-oso', 90, 150, 380, 400, 'Oso y madroño en 3D, modelo creado con IA e inspirado en la estatua de la Puerta del Sol', { autoRotate: true, spin: 12, edge: 'fade' })),
        cap('Modelo hecho con IA, inspirado en la estatua de Sol', 90, 566, 380),
        kicker('EL ESCUDO', 560, 56, 500), H('UN OSO Y UN MADROÑO', 556, 88, 680, 70, 46),
        sub('Los símbolos oficiales de Madrid', 560, 160, 640, 40, 28),
        ...seq(fact('Una osa que se hizo oso', 'Según la Wikipedia, el oso era originalmente una osa.', 560, 225, 650, 100), 0),
        ...seq(fact('El árbol es un madroño', 'Se identificó así después de que sus frutos ayudaran a curar una plaga.', 560, 340, 650, 100, GRAN), 1),
        ...seq(fact('Siete estrellas', 'En 1548 se pidió a Carlos I una corona u orla azul con siete estrellas, alusión a la Osa Mayor.', 560, 455, 650, 120), 2),
        foot()],
        notes: 'Los símbolos oficiales de Madrid son el oso y el madroño, con corona real antigua. Según la Wikipedia, el oso era originalmente una osa, y el árbol se identificó como madroño después de que sus frutos ayudaran a curar una plaga. En 1548 el Consejo pidió a Carlos I añadir una corona o una orla azul con siete estrellas, que aluden a la Osa Mayor, y el rey lo concedió. Ojo: el modelo 3D es una interpretación de la IA y los frutos le han salido muy llamativos; comparadlo con el escudo real en el reto 2 (es.wikipedia.org, artículo Madrid).' },

      // 4 · statue and Puerta del Sol
      { layout: 'blank', transition: 'fade', back: [...granite(), ...sunRays(300, 380, 520, GOLD, 0.16), ...sunRays(300, 380, 360, GOLD, 0.18), ...skyline(GRAN2, 1)], extra: [
        kicker('LA PUERTA DEL SOL', 70, 56, 500, { color: GOLD }), H('LA ESTATUA Y LA PLAZA', 66, 88, 1000, 70, 46, { color: CREAM }),
        ...seq([...fact('Antonio Navarro Santafé', 'Escultor de la estatua del Oso y el Madroño, inaugurada el 10 de enero de 1967.', 70, 200, 600, 110, GOLD)], 0),
        ...seq([...fact('Piedra y bronce', 'Mide unos 4 m y pesa unas 20 toneladas. En abril de 2023 se movió al extremo este de una nueva fila de bancos.', 70, 326, 600, 130, RED)], 1),
        ...seq([...fact('¿Por qué «Sol»?', 'Era una puerta de la cerca del siglo XV con un sol decorativo, porque miraba al levante.', 70, 472, 600, 110, GOLD)], 2),
        ...seq([...fact('Kilómetro cero', 'Desde 1950, la plaza alberga el «kilómetro cero» de las carreteras radiales.', 720, 200, 490, 130, RED)], 3),
        ...seq([...fact('Las doce uvas', 'Las campanadas del reloj de la Real Casa de Correos marcan el 31 de diciembre; se televisan desde 1962.', 720, 346, 490, 160, GOLD)], 4),
        foot(60, '#c9ccd3')],
        notes: 'La estatua del Oso y el Madroño es obra de Antonio Navarro Santafé y se inauguró el 10 de enero de 1967; es de piedra y bronce sobre un pedestal de granito, mide unos cuatro metros y pesa unas veinte toneladas. Ha cambiado de sitio varias veces: la última, en abril de 2023. La plaza toma su nombre de una puerta de la cerca del siglo XV que tenía un sol decorativo porque miraba a levante. Desde 1950 tiene el kilómetro cero, y las campanadas de fin de año del reloj de la Real Casa de Correos se televisan desde 1962. (es.wikipedia.org: Estatua del Oso y el Madroño, Puerta del Sol).' },

      // 5 · Puerta de Alcalá
      { layout: 'blank', transition: 'fade', back: [...cream(), ...floor(360, 560, 480)], extra: [
        pop(ai3d('madrid-alcala', 40, 140, 640, 440, 'Puerta de Alcalá en 3D, modelo creado con IA e inspirado en el monumento', { autoRotate: true, spin: 12, edge: 'fade' })),
        cap('Modelo hecho con IA, inspirado en la Puerta de Alcalá. Tiene detalles inventados', 60, 580, 600),
        kicker('LA PUERTA DE ALCALÁ', 700, 56, 520), H('CINCO HUECOS DE GRANITO', 696, 88, 540, 130, 46),
        ...seq(fact('Francesco Sabatini', 'El arquitecto italiano que la proyectó por encargo de Carlos III.', 700, 235, 510, 100), 0),
        ...seq(fact('1769-1778', 'Las obras empezaron a comienzos de 1770 y se inauguró en 1778.', 700, 350, 510, 100, GRAN), 1),
        ...seq(fact('Tres arcos y dos dinteles', 'Cinco vanos: tres de medio punto y dos laterales adintelados. Neoclásica.', 700, 465, 510, 100), 2),
        foot()],
        notes: 'La Puerta de Alcalá está en el centro de la plaza de la Independencia y es neoclásica. La proyectó el arquitecto italiano Francesco Sabatini por encargo de Carlos III; la construcción duró de 1769 a 1778 y se inauguró en 1778. Tiene cinco vanos: tres con arco de medio punto y dos laterales con arcos adintelados. Los elementos estructurales son de piedra berroqueña, es decir, granito, y los decorativos, de caliza blanca de Colmenar de Oreja. El modelo hecho con IA simplifica la fachada e inventa detalles, como la corona de la esquina. Pide a la clase que cuente los huecos en el modelo y en una foto real. (es.wikipedia.org, artículos Puerta de Alcalá y Plaza de la Independencia).' },

      // 6 · Cibeles
      { layout: 'blank', transition: 'fade', back: [...red(), ...sunRays(330, 360, 560, '#d4414f', 0.35), ...floor(330, 560, 480, '#000000'), ...skyline(DRED, 0.9)], extra: [
        pop(ai3d('madrid-cibeles', 50, 130, 600, 440, 'Fuente de Cibeles en 3D, modelo creado con IA e inspirado en la fuente', { autoRotate: true, spin: 12, edge: 'fade' })),
        cap('Modelo hecho con IA, inspirado en la fuente de Cibeles', 60, 570, 600, '#f1dcd8'),
        kicker('LA FUENTE DE CIBELES', 700, 60, 520, { color: GOLD }), H('UNA DIOSA CON DOS LEONES', 696, 92, 540, 130, 46, { color: CREAM }),
        ...seq(fact('Cibeles y su carro', 'Diosa frigia, asociada con la griega Rea. Va en un carro tirado por dos leones: Hipómenes y Atalanta.', 700, 235, 510, 140, GOLD), 0),
        ...seq(fact('Ventura Rodríguez, 1777-1782', 'Diseñó la fuente. Gutiérrez Arribas esculpió la diosa y Roberto Michel, los leones.', 700, 390, 510, 130, GRAN), 1),
        ...seq(fact('Escenario de fiestas', 'Es un lugar de celebraciones deportivas, sobre todo del Real Madrid.', 700, 535, 510, 100, GOLD), 2),
        foot(60, '#e9c9c5')],
        notes: 'Cibeles es una diosa frigia, asociada con la griega Rea, madre de los dioses olímpicos. Va en un carro tirado por dos leones, que representan a Hipómenes y Atalanta. La fuente la diseñó Ventura Rodríguez; se construyó entre 1777 y 1782. Francisco Gutiérrez esculpió la diosa y Roberto Michel, los leones. La plaza toma su nombre de la fuente y se ha convertido en escenario de celebraciones deportivas, sobre todo del Real Madrid. En el modelo hecho con IA, el cuenco de la izquierda es una simplificación del conjunto real. (es.wikipedia.org, artículos Fuente de Cibeles y Plaza de Cibeles).' },

      // 7 · Debod
      { layout: 'blank', transition: 'fade', back: [...cream(), ...sunRays(330, 340, 540, '#f0c27a', 0.45), ...floor(330, 540, 460), ...skyline('#e2d3b2', 1, 668)], extra: [
        pop(ai3d('madrid-debod', 50, 130, 600, 420, 'Templo de Debod en 3D, modelo creado con IA e inspirado en el templo', { autoRotate: true, spin: 12, edge: 'fade' })),
        cap('Modelo hecho con IA, inspirado en el Templo de Debod', 60, 566, 600),
        kicker('EL TEMPLO DE DEBOD', 700, 56, 520), H('UN TEMPLO EGIPCIO EN MADRID', 696, 88, 540, 130, 44),
        ...seq(fact('De Nubia a Madrid', 'Estaba en Debod, junto al Nilo. Se desmontó en 1961 por la presa de Asuán.', 700, 235, 510, 110), 0),
        ...seq(fact('Un regalo de Egipto', 'En 1968, en agradecimiento por la ayuda española para salvar los templos de Nubia.', 700, 360, 510, 120, GRAN), 1),
        ...seq(fact('18 de julio de 1972', 'Se inauguró tras unos dos años de reconstrucción. Tiene unos 2200 años.', 700, 495, 510, 120), 2),
        foot()],
        notes: 'El Templo de Debod estaba en la Baja Nubia, junto al Nilo, y se desmontó en 1961 por la construcción de la presa de Asuán. Egipto lo regaló a España en 1968, en agradecimiento por la ayuda española en la campaña de la Unesco para salvar los templos de Nubia. Los bloques llegaron a Valencia en junio de 1970; la reconstrucción siguió la técnica de la anastilosis, duró unos dos años y se inauguró el 18 de julio de 1972. Tiene unos 2200 años y está dedicado a Amón de Debod e Isis. Está en el oeste de Madrid, junto a la plaza de España. El modelo con IA añade un estanque simplificado. (es.wikipedia.org, artículo Templo de Debod).' },

      // 8 · the chulapo walks
      (() => {
        const route = [[260, 12], [540, -8], [840, 10]];
        return { layout: 'blank', transition: 'fade', back: [...cream(), R(0, 628, 1280, 40, GRAN), ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => R(i * 160 + 40, 628, 80, 6, '#8a8e96')), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => R(i * 160 + 140, 646, 4, 22, GRAN2))], extra: [
          kicker('UN CHULAPO PASEA POR MADRID', 70, 48, 700), H('CHULAPOS Y CHULAPAS', 66, 78, 1000, 60, 42),
          ...[['Barrios castizos', 'Se llamaba así a la gente de Malasaña y Maravillas; también «majos» o «chisperos».', RED], ['El traje de ellos', 'Chaquetilla o chaleco con un clavel, gorra negra de cuadros, botines y pañuelo.', GRAN], ['El traje de ellas', 'Pañuelo en la cabeza con clavel, blusa blanca, vestido de lunares y mantón de Manila.', RED]].flatMap(([t, d, c], i) => fact(t, d, 70 + i * 390, 150, 370, 140, c)),
          withAnims(ai3d('madrid-chulapo', 70, 290, 200, 340, 'Chulapo con gorra de cuadros, pañuelo rojo y chaleco, en 3D creado con IA', { clip: 'Idle', walk: { clip: 'Walk', end: 'Idle', face: true, look: false, stride: 0.67 } }), path(route, { duration: 5200 })),
          text('Clic: echa a andar', 1000, 580, 230, 34, { fontSize: 16, color: CREAM, bg: RED, radius: 17, textAlign: 'center', vAlign: 'middle' }),
          text('Personaje hecho con IA, inspirado en un chulapo', 560, 584, 420, 30, { fontFamily: CLASSIC, fontSize: 18, fontWeight: 700, color: MUTE, textAlign: 'right' }), foot()],
          notes: 'Un clic y nuestro chulapo echa a andar por la calle. Es un personaje con esqueleto y animación, hecho con IA e inspirado en el traje tradicional: gorra de cuadros, chaleco y pañuelo; es una figura inventada, no un retrato. Según la Wikipedia, chulapos y chulapas eran los vecinos de barrios como Malasaña o Maravillas, también llamados majos, y el traje quedó fijado por las zarzuelas de finales del siglo XIX y principios del XX, como La verbena de la Paloma. Ellos llevan un clavel en la solapa; ellas, pañuelo en la cabeza con clavel y mantón de Manila. (es.wikipedia.org, artículo Chulapo).' };
      })(),

      // 9 · San Isidro
      { layout: 'blank', transition: 'fade', back: [...cream(), ...skyline('#e2d3b2', 1, 668)], extra: [
        kicker('LA FIESTA DEL PATRÓN', 70, 56, 500), H('SAN ISIDRO, 15 DE MAYO', 66, 88, 800, 70, 48),
        sub('La fiesta más castiza de Madrid', 70, 162, 700, 44, 30),
        ...card(70, 240, 330, 250),
        text(`<div style="font-family:${DISPLAY};font-size:104px;color:${RED};line-height:1.1">15</div><div style="font-family:${CLASSIC};font-size:32px;font-weight:700;color:${INK}">de mayo</div>`, 90, 240, 300, 250, { textAlign: 'center', vAlign: 'middle' }),
        ...seq(fact('Patrón de Madrid', 'Tras su canonización, el 12 de marzo de 1622, se aprobó su patronazgo sobre la villa.', 430, 240, 400, 120), 0),
        ...seq(fact('La pradera', 'Se celebra en la pradera de San Isidro, con música, baile y comida típica, como las rosquillas.', 430, 376, 400, 130, GRAN), 1),
        text('Mucha gente acude vestida de chulapo y chulapa.', 70, 520, 760, 50, { fontSize: 22, color: INK, lineHeight: 1.3 }),
        withAnims(ai3d('madrid-chulapo', 900, 110, 300, 500, 'Chulapo en 3D creado con IA', { autoRotate: true, spin: 12, edge: 'fade', clip: 'Idle' }), A('zoom-in', { start: 'withPrev', duration: 700 })),
        ...floor(1050, 580, 280), foot()],
        notes: 'Cada 15 de mayo Madrid celebra a San Isidro Labrador, su patrón. Según la Wikipedia, tras su canonización, el 12 de marzo de 1622, se aprobó su patronazgo sobre la villa y corte, y su festividad es el 15 de mayo. La fiesta se centra en la pradera de San Isidro, donde chulapos y chulapas acuden vestidos a la manera tradicional, con música, baile y comida típica; entre las recetas se citan las rosquillas con azúcar. Las fechas exactas de los actos cambian cada año: conviene consultarlas en la web oficial del Ayuntamiento. (es.wikipedia.org, San Isidro Labrador; spain.info, Fiestas de San Isidro).' },

      // 10 · map and walk
      { layout: 'blank', transition: 'fade', back: cream(), extra: [
        kicker('MAPA Y RECORRIDO', 70, 50, 500), H('DE SOL A ALCALÁ, CALLE ABAJO', 66, 82, 1000, 70, 44),
        // a schematic map: panel, dotted route and four stops
        R(60, 170, 760, 470, GRAN2, { radius: 10, stroke: GOLD, strokeWidth: 2 }),
        ...[[110, 280, 330, 450], [330, 450, 520, 360], [520, 360, 700, 290]].flatMap(([x1, y1, x2, y2]) => Array.from({ length: 14 }, (_, k) => {
          const t = (k + 1) / 15; return E(x1 + (x2 - x1) * t - 5, y1 + (y2 - y1) * t - 5, 10, 10, GOLD, { opacity: 0.75 }); })),
        ...[['1', 'Debod', 110, 280, -70], ['2', 'Sol', 330, 450, 30], ['3', 'Cibeles', 520, 360, 30], ['4', 'Alcalá', 700, 290, -70]].flatMap(([n, name, x, y, dy]) => [
          E(x - 22, y - 22, 44, 44, RED, { stroke: CREAM, strokeWidth: 3 }),
          text(n, x - 22, y - 22, 44, 44, { fontFamily: DISPLAY, fontSize: 24, color: CREAM, textAlign: 'center', vAlign: 'middle' }),
          text(name, x - 70, y + dy + (dy > 0 ? 20 : -2), 140, 36, { fontFamily: DISPLAY, fontSize: 24, color: CREAM, textAlign: 'center', vAlign: 'middle' })]),
        text('Esquema, no a escala', 80, 180, 240, 26, { fontSize: 14, color: '#c9ccd3' }),
        ...seq(fact('Sol, kilómetro cero', 'De la Puerta del Sol nace la calle de Alcalá.', 860, 170, 350, 100, GOLD), 0),
        ...seq(fact('Calle de Alcalá', 'Atraviesa la plaza de Cibeles y la de la Independencia, donde está la Puerta.', 860, 286, 350, 150, RED), 1),
        ...seq(fact('Debod, al oeste', 'Junto a la plaza de España y el parque del Oeste.', 860, 452, 350, 110, GRAN), 2),
        foot()],
        notes: 'Un recorrido a pie para el reto 1. La calle de Alcalá nace en la Puerta del Sol, en el kilómetro cero; atraviesa la plaza de Cibeles y la plaza de la Independencia, donde está la Puerta de Alcalá, y toma su nombre porque era el camino a Alcalá de Henares. El Templo de Debod queda al oeste, junto a la plaza de España y el parque del Oeste. El esquema del mapa es solo orientativo, no mide distancias: que el alumnado lo compare con un plano real y calcule el tiempo a pie. (es.wikipedia.org, artículos Calle de Alcalá y Templo de Debod).' },

      // 11 · how the models were made
      { layout: 'blank', transition: 'fade', back: cream(), extra: [
        kicker('CÓMO SE HICIERON ESTOS MODELOS', 70, 50, 700), H('DE UNA DESCRIPCIÓN A UNA PIEZA 3D', 66, 82, 1150, 70, 42),
        ...[['1', 'Describes', 'Escribes qué quieres: «el Templo de Debod».'], ['2', 'Imagen de referencia', 'La IA dibuja primero el objeto con fondo liso.'], ['3', 'TRELLIS.2', 'Un modelo de IA lo reconstruye en tres dimensiones.'], ['4', 'Modelo 3D', 'Un archivo GLB que se gira y se guarda en la presentación.']].flatMap(([n, t, d], i) => {
          const x = 70 + i * 295, c = i % 2 ? GRAN : RED;
          return seq([...card(x, 190, 275, 230, c), text(`<div style="font-family:${DISPLAY};font-size:54px;color:${c};line-height:1">${n}</div><div style="font-family:${DISPLAY};font-size:24px;color:${INK};margin-top:6px">${t}</div><div style="margin-top:6px">${d}</div>`, x + 20, 190, 245, 230, { fontSize: 18, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        R(70, 450, 1140, 80, RED, { radius: 8 }), text('En Revela: menú IA ▸ Crear modelo 3D con IA, modo «Realista».', 96, 450, 1090, 80, { fontSize: 24, color: CREAM, vAlign: 'middle', fontWeight: 700 }),
        text('Las personas, como el chulapo, pueden llevar esqueleto y animación: así camina por la diapositiva. Los monumentos son piezas estáticas.', 70, 550, 1140, 90, { fontSize: 20, color: INK, lineHeight: 1.35 }), foot()],
        notes: 'En una frase: se describe lo que se quiere, la IA genera una imagen de referencia, TRELLIS.2 la convierte en un modelo 3D y obtenemos un archivo que se puede girar. En Revela está en el menú IA, Crear modelo 3D con IA, con el modo Realista. Las personas pueden llevar esqueleto y animación, y por eso el chulapo anda; los monumentos son piezas estáticas. Los resultados son interpretaciones: pueden inventar o simplificar detalles, y conviene contrastarlos con fuentes.' },

      // 12 · activities
      { layout: 'blank', transition: 'fade', back: [...cream(), ...skyline('#e2d3b2', 1, 668)], extra: [
        kicker('PARA CLASE', 70, 50, 500), H('CUATRO RETOS', 66, 82, 800, 70, 46),
        ...[['Recorre', 'En un plano real, traza el paseo Debod, Sol, Cibeles y Alcalá y calcula cuánto se tarda a pie.'], ['Compara', 'Gira el oso 3D y compáralo con el escudo y la estatua de Sol: ¿qué ha inventado la IA?'],
          ['Investiga', 'Averigua de dónde vienen los nombres de la Puerta del Sol, Cibeles y la Independencia.'], ['Crea', 'Describe qué monumento madrileño pedirías a la IA ▸ Crear modelo 3D con IA y por qué.']].flatMap(([t, d], i) => {
          const x = 70 + (i % 2) * 580, y = 170 + Math.floor(i / 2) * 215, c = i % 3 === 1 ? GRAN : RED;
          return seq([...card(x, y, 560, 195, c), text(`<span style="font-family:${DISPLAY};font-size:46px;color:${c}">${i + 1}</span>&nbsp; <span style="font-family:${DISPLAY};font-size:28px;color:${INK}">${t}</span><div style="margin-top:8px">${d}</div>`, x + 26, y, 510, 195, { fontSize: 21, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        foot()],
        notes: 'Cuatro retos para trabajar en equipo. Uno, recorrer sobre un plano real el paseo entre los monumentos y estimar el tiempo. Dos, comparar el oso hecho con IA con el escudo y la estatua real para entrenar el sentido crítico. Tres, investigar el origen de los nombres: Sol viene de una puerta de la cerca del siglo XV con un sol decorativo, Cibeles de la fuente, y la plaza de la Independencia queda como investigación, porque no hemos encontrado la explicación en las fuentes consultadas. Cuatro, proponer qué modelo 3D pedirían a la IA y escribir su descripción. Se puede repartir uno por grupo.' },

      // 13 · closing gallery
      { layout: 'blank', transition: 'fade', back: [...granite(), ...skyline(GRAN2, 1)], extra: [
        kicker('MADRID EN CINCO PIEZAS', 70, 50, 600, { color: GOLD }), H('CINCO MODELOS HECHOS CON IA', 66, 82, 1100, 70, 46, { color: CREAM }),
        ...[['madrid-debod', 'Debod', 'Templo de Debod en 3D creado con IA'], ['madrid-oso', 'El Oso y el Madroño', 'Oso y madroño en 3D creado con IA'], ['madrid-cibeles', 'Cibeles', 'Fuente de Cibeles en 3D creada con IA'],
          ['madrid-alcala', 'Puerta de Alcalá', 'Puerta de Alcalá en 3D creada con IA'], ['madrid-chulapo', 'Chulapo', 'Chulapo en 3D creado con IA']].flatMap(([id, name, alt], i) => {
          const x = 50 + i * 238;
          return seq([...arch(x, 200, 220, 380, CREAM), ai3d(id, x + 4, 240, 212, 280, alt, { autoRotate: true, spin: 12, edge: 'fade', ...(id === 'madrid-chulapo' && { clip: 'Idle' }) }),
            text(name, x, 522, 220, 40, { fontFamily: DISPLAY, fontSize: 21, color: RED, textAlign: 'center', vAlign: 'middle' })], 1, 'fade-up'); }),
        text('Todos son modelos hechos con IA, inspirados en el original: no son la pieza real ni están a escala.', 70, 600, 1140, 40, { fontSize: 20, color: CREAM, textAlign: 'center' }),
        foot(60, '#c9ccd3')],
        notes: 'Para cerrar, las cinco piezas juntas. Recordad que son modelos hechos con IA, inspirados en el original: no son la pieza real ni están a escala, y pueden tener detalles inventados o simplificados. Invita a la clase a girar cada uno y a decir qué le parece más fiel y qué menos. Los datos de la presentación proceden de es.wikipedia.org y spain.info; las fuentes concretas están en las notas de cada diapositiva.' },
    ])) },
};
