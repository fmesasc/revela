// Example presentations: Animaciones explicativas — lessons built around an «Animación con IA» (features/content/
// aianim.js). Each one's animation was written by the AI and reviewed by hand, or drawn by hand in the same form
// (templates/scenes/*.js); in the presentation each click plays one stage and it stops, like a video in segments, and
// it can be changed like any other: select it ▸ IA ▸ Animación con IA (another version, the length of each stage,
// steps or continuous). Its texts read in every language (sceneAnim: words). The rest of each lesson: what we knew
// before (a vote), the stages one by one, the data, a quiz, a review with the animation looping and a task to close.

import { build, text, card, shape, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, mathBlock, pollBlock, deep } from './kit.js';
import { aiAnimBlock, sceneAnim } from '../aianim.js';
import agua from './scenes/agua.js';
import mitosis from './scenes/mitosis.js';
import motor from './scenes/motor.js';
import luna from './scenes/luna.js';
import corazon from './scenes/corazon.js';
import fotosintesis from './scenes/fotosintesis.js';
import pitagoras from './scenes/pitagoras.js';
import placas from './scenes/placas.js';

// ---- Helpers of this file ---------------------------------------------------------
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 34, x: 70, y: 60, w: 1140, h: 600, ...props });
const vote = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, ...props });
const m = (latex, x, y, w, h, fontSize, color, p = {}) => mathBlock({ x, y, w, h, fontSize, latex, color, ...p });
const FF = "'Space Grotesk', sans-serif";
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// The animation: by steps (a click, a stage) or looping (on the cover and the review).
const film = (def, topic, x, y, w, mode = 'steps') => ({ ...aiAnimBlock({ ...sceneAnim(def, topic), mode }, { x, y, w, h: Math.round(w * 9 / 16) }), alt: topic });

// The cover: a label, the title, a line, and the animation looping on the right.
const cover = ({ bg, accent, inkc, label, title, sub, def, topic }) => ({ layout: 'blank', bg, back: [glow(900, -160, 620, accent, bg, 14), glow(-140, 520, 520, accent, bg, 9)], extra: [
  text(label, 80, 130, 520, 36, { fontSize: 20, letterSpacing: 3, color: deep(accent, bg), fontWeight: 700 }),
  text(title, 74, 172, 540, 230, { fontSize: 64, fontWeight: 800, color: inkc, lineHeight: 1.04, fontFamily: FF }),
  text(sub, 80, 420, 500, 150, { fontSize: 25, color: '#4f5666', lineHeight: 1.4 }),
  after(shape('rect', 626, 186, 600, 338, '#ffffff', { radius: 22, shadow: true }), 'fade-left', { duration: 700 }),
  after(film(def, topic, 640, 200, 572, 'loop'), 'fade-left', { duration: 700 })] });
// The animation by steps, as large as fits under the title.
const stepsSlide = ({ bg, title, def, topic, notes }) => ({ title, layout: 'titleOnly', bg, extra: [film(def, topic, 165, 132, 950)],
  notes: notes + ' Cada clic reproduce una fase y la animación se para al final de ella; al volver atrás se queda al final de la anterior. Para cambiar cuánto dura cada fase, o pedir otra versión, selecciónala y pulsa IA ▸ Animación con IA.' });
// The stages one by one: two by two cards, each in its colour.
const stages = (items, { bg, inkc }) => items.map(([t, d, col], i) => on(card(`<b style="font-size:27px;color:${deep(col, '#ffffff')}">${i + 1}. ${t}</b><br><span style="font-size:22px;color:${inkc}">${d}</span>`,
  90 + (i % 2) * 560, 190 + Math.floor(i / 2) * 230, 530, 205, '#ffffff', { color: inkc, radius: 16, borderColor: col, borderWidth: 3, lineHeight: 1.35, pad: [20, 24, 20, 24] }), 'fade-up'));
// The review: the animation looping, and three ideas to keep.
const review = ({ bg, accent, inkc, def, topic, ideas, notes }) => ({ title: 'Repaso', layout: 'titleOnly', bg, extra: [
  film(def, topic, 70, 170, 640, 'loop'),
  ...ideas.map((x, i) => on(card(`<b style="color:${deep(accent, '#ffffff')}">${i + 1}</b>&nbsp; ${x}`, 740, 170 + i * 122, 470, 108, '#ffffff', { color: inkc, fontSize: 23, radius: 14, lineHeight: 1.3, vAlign: 'middle', pad: [12, 18, 12, 18] }), 'fade-left'))],
  notes });
// The closing: a task to do in class, against the clock.
const closing = ({ bg, accent, inkc, title, body, seconds, end }) => ({ layout: 'blank', bg, back: [glow(1000, 420, 520, accent, bg, 14)], transition: 'zoom', extra: [
  text(title, 84, 120, 820, 140, { fontSize: 50, fontWeight: 800, color: inkc, fontFamily: FF, lineHeight: 1.08 }),
  text(body, 84, 290, 780, 280, { fontSize: 26, color: '#4f5666', lineHeight: 1.45 }),
  timer(seconds, 930, 220, 280, { color: accent, endText: end })] });
const deckOf = (name, inkc, slides) => numbered(ink(build({ name, palette: 'revela', fonts: 'friendly', title: { color: inkc, size: 44 }, body: { color: inkc } }, slides), inkc));

export default {
  // 1 · El ciclo del agua (Primaria y 1.º de ESO).
  edu_anim_water: { name: 'El ciclo del agua, animado', cat: 'edu', summary: 'Animación con IA por fases —evaporación, condensación, precipitación y escorrentía—, una por clic, tarjetas de cada fase, dónde está el agua de la Tierra en un gráfico, concurso y repaso con la animación en bucle', make: () => {
    const BG = '#f1f7fc', INK = '#17324d', BL = '#2b7ec9', TE = '#1f9e8f', GR = '#4c9a3f', OR = '#e0873b', topic = 'El ciclo del agua';
    return deckOf('El ciclo del agua, animado', INK, [
      cover({ bg: BG, accent: BL, inkc: INK, label: 'CIENCIAS NATURALES', title: 'El viaje sin fin del agua', sub: 'La misma agua lleva millones de años dando vueltas entre el mar, el cielo y la tierra.', def: agua, topic }),
      { layout: 'blank', bg: BG, extra: [vote('El agua que bebes hoy… ¿podría haber pasado antes por un dinosaurio?', ['Sí, es la misma agua que da vueltas', 'No, el agua se gasta y se fabrica nueva', 'Solo la del mar', 'No lo sé'])],
        notes: 'Pregunta para despertar la curiosidad, sin corregir todavía. Respuesta: sí. La cantidad de agua de la Tierra es prácticamente la misma desde hace muchísimo tiempo; lo que cambia es dónde está y en qué estado.' },
      stepsSlide({ bg: BG, title: 'El ciclo, paso a paso', def: agua, topic,
        notes: 'Antes de cada clic, pregunta: ¿qué creéis que pasará ahora? Después, que lo cuenten con sus palabras.' }),
      { title: 'Qué pasa en cada fase', layout: 'titleOnly', bg: BG, extra: stages([
        ['Evaporación', 'El sol calienta el mar, los ríos y el suelo: el agua líquida pasa a vapor y sube. Las plantas también sueltan vapor (transpiración).', OR],
        ['Condensación', 'Arriba hace más frío: el vapor se enfría y forma gotitas diminutas alrededor de partículas de polvo. Así nacen las nubes.', BL],
        ['Precipitación', 'Las gotitas chocan, se unen y pesan cada vez más, hasta que caen como lluvia, nieve o granizo.', TE],
        ['Escorrentía e infiltración', 'Parte del agua corre por la superficie hasta los ríos y el mar; otra se filtra en el suelo y forma acuíferos.', GR]], { bg: BG, inkc: INK }),
        notes: 'Una tarjeta por clic. Relaciona cada fase con un cambio de estado: evaporación (líquido → gas), condensación (gas → líquido), y en la nieve, solidificación.' },
      { title: '¿Dónde está el agua de la Tierra?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 160, w: 620, h: 500, chartType: 'doughnut', colors: [BL, '#9fd3f2', TE, OR], labelColor: INK,
          data: [{ label: 'Océanos', value: 96.5 }, { label: 'Glaciares y hielo', value: 1.74 }, { label: 'Agua subterránea', value: 1.69 }, { label: 'Lagos, ríos, aire…', value: 0.07 }] }),
        on(card('<b style="font-size:46px">96,5 %</b><br>es agua salada de los océanos.', 760, 190, 440, 150, BL, { color: '#ffffff', fontSize: 25, radius: 16 }), 'fade-left'),
        on(card('Del agua dulce, la mayor parte está <b>helada</b> o <b>bajo tierra</b>: la de ríos y lagos es una parte diminuta.', 760, 365, 440, 170, '#ffffff', { color: INK, fontSize: 24, radius: 16, borderColor: TE, borderWidth: 3 }), 'fade-left'),
        text('Fuente: USGS, a partir de Gleick (1996).', 760, 560, 440, 40, { fontSize: 18, color: '#5a6a7a' })],
        notes: 'Datos del Servicio Geológico de Estados Unidos (USGS). Si toda el agua de la Tierra cupiera en una botella de 1,5 litros, la de ríos y lagos sería apenas una gota. Por eso cuidar el agua dulce importa.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué fase del ciclo forma las nubes?', ['La evaporación', 'La condensación', 'La precipitación', 'La infiltración'], 1)],
        notes: 'Si dudan entre evaporación y condensación: el vapor es invisible; lo que vemos en una nube son gotitas de agua líquida, y por eso es condensación.' },
      review({ bg: BG, accent: BL, inkc: INK, def: agua, topic, ideas: ['El sol mueve el ciclo: sin su calor no habría evaporación.', 'El agua cambia de estado, pero no se pierde: da vueltas.', 'El agua dulce que podemos usar es muy poca.'],
        notes: 'La animación da vueltas sola mientras repasáis. Pide a alguien que la narre en voz alta sin leer los pies.' }),
      closing({ bg: BG, accent: BL, inkc: INK, title: 'El ciclo en una bolsa', body: 'Por parejas: dibujad el ciclo en una bolsa de plástico con cierre, con un poco de agua dentro, y pegadla a una ventana soleada. En unos días veréis gotas arriba y «lluvia» bajando. Anotad qué fase veis en cada sitio.', seconds: 600, end: '¡A la ventana!' }),
    ]);
  } },

  // 2 · La mitosis (Biología, 4.º de ESO y Bachillerato).
  edu_anim_mitosis: { name: 'La mitosis, animada', cat: 'edu', summary: 'Animación con IA de la mitosis fase a fase, una por clic, tarjetas con lo que hace cada fase, el ciclo celular en un gráfico, mitosis frente a meiosis en una tabla, concurso y repaso en bucle', make: () => {
    const BG = '#f6f3fb', INK = '#2a2140', PU = '#7b5bd0', PK = '#d0508f', BL = '#3f6ad8', GR = '#2e9e6b', topic = 'La mitosis';
    return deckOf('La mitosis, animada', INK, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'BIOLOGÍA · LA CÉLULA', title: 'Una célula se convierte en dos', sub: 'Cómo reparte una célula su ADN para que las dos hijas sean idénticas.', def: mitosis, topic }),
      { layout: 'blank', bg: BG, extra: [vote('¿Cuántas células crees que se dividen en tu cuerpo cada segundo?', ['Unas pocas', 'Cientos', 'Millones', 'Ninguna: ya estamos hechos'])],
        notes: 'Sin corregir todavía. Se estima que el cuerpo humano adulto renueva del orden de 300 000 millones de células al día, unos 3–4 millones por segundo (Sender y Milo, 2021). Casi todas se forman por mitosis.' },
      stepsSlide({ bg: BG, title: 'La mitosis, fase a fase', def: mitosis, topic,
        notes: 'Pide que se fijen en los cromosomas: cómo se condensan, se alinean y se separan. Antes de cada clic, que digan qué esperan ver.' }),
      { title: 'Qué hace cada fase', layout: 'titleOnly', bg: BG, extra: stages([
        ['Profase', 'Los cromosomas, ya duplicados, se condensan y se ven; se forma el huso y la envoltura del núcleo se deshace.', PU],
        ['Metafase', 'Los cromosomas se alinean en el centro de la célula, en la placa ecuatorial, sujetos por las fibras del huso.', BL],
        ['Anafase', 'Las cromátidas hermanas se separan y cada una viaja hacia un polo opuesto de la célula.', PK],
        ['Telofase y citocinesis', 'Se forman dos núcleos nuevos y la célula se estrangula hasta partirse en dos células hijas.', GR]], { bg: BG, inkc: INK }),
        notes: 'Regla para recordarlas en orden: «PMAT». La interfase no es una fase de la mitosis: es cuando la célula crece y copia su ADN.' },
      { title: 'El ciclo celular', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 160, w: 600, h: 490, chartType: 'doughnut', colors: ['#b9a8ea', BL, '#8fb0f0', PK], labelColor: INK,
          data: [{ label: 'G1 · crece', value: 11 }, { label: 'S · copia el ADN', value: 8 }, { label: 'G2 · se prepara', value: 4 }, { label: 'M · mitosis', value: 1 }] }),
        on(card('En una célula humana en cultivo, el ciclo dura <b>unas 24 horas</b>, y la mitosis, solo <b>una</b>.', 730, 190, 470, 160, PU, { color: '#ffffff', fontSize: 25, radius: 16 }), 'fade-left'),
        on(card('Por eso, al microscopio, casi todas las células están en interfase.', 730, 375, 470, 130, '#ffffff', { color: INK, fontSize: 24, radius: 16, borderColor: PK, borderWidth: 3 }), 'fade-left'),
        text('Horas aproximadas: Alberts et al., Biología molecular de la célula.', 730, 530, 470, 60, { fontSize: 18, color: '#5f5875' })],
        notes: 'Los tiempos cambian mucho de un tipo de célula a otro: hay células que se dividen en minutos (embriones tempranos) y otras que casi nunca (neuronas).' },
      { title: 'Mitosis y meiosis', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 170, w: 1100, h: 400, fontSize: 25, header: true, headBg: PU, headFg: '#ffffff', banded: true, band: PU, bandAlpha: 0.07, color: INK, colW: [3, 4, 4],
          rows: [['', 'Mitosis', 'Meiosis'], ['¿Para qué?', 'Crecer y reparar tejidos', 'Formar gametos'], ['Divisiones', 'Una', 'Dos seguidas'], ['Células hijas', '2, idénticas', '4, distintas entre sí'],
            ['Cromosomas (humanos)', '46 → 46', '46 → 23'], ['¿Dónde?', 'En casi todo el cuerpo', 'En ovarios y testículos']] })],
        notes: 'La meiosis reduce a la mitad los cromosomas para que, al unirse óvulo y espermatozoide, el cigoto vuelva a tener 46.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿En qué fase se separan las cromátidas hermanas?', ['Profase', 'Metafase', 'Anafase', 'Telofase'], 2)],
        notes: 'Truco: anafase, de «ana-», hacia arriba o hacia atrás: las cromátidas viajan a los polos.' },
      review({ bg: BG, accent: PU, inkc: INK, def: mitosis, topic, ideas: ['Antes de dividirse, la célula copia su ADN.', 'Cada célula hija recibe una copia exacta de cada cromosoma.', 'Sirve para crecer y reparar: el cáncer es una mitosis sin control.'],
        notes: 'Mientras la animación da vueltas, que alguien la pare con el dedo en cada fase y la nombre.' }),
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Mitosis con plastilina', body: 'Por grupos: modelad dos pares de cromosomas con plastilina de dos colores (cada uno con su copia unida por el centro) y representad las cuatro fases sobre un folio. Fotografiad cada fase.', seconds: 900, end: '¡Fotos!' }),
    ]);
  } },

  // 3 · El motor de cuatro tiempos (Tecnología, 4.º de ESO).
  edu_anim_engine: { name: 'El motor de cuatro tiempos, animado', cat: 'edu', summary: 'Animación con IA del ciclo Otto —admisión, compresión, combustión y escape—, un tiempo por clic, qué hacen las válvulas y el pistón en una tabla, la relación de compresión en una ecuación, concurso y repaso', make: () => {
    const BG = '#f4f5f7', INK = '#1d2433', OR = '#e0702f', BL = '#2f6dd0', RE = '#d0453f', GY = '#6b7486', topic = 'El motor de cuatro tiempos';
    return deckOf('El motor de cuatro tiempos, animado', INK, [
      cover({ bg: BG, accent: OR, inkc: INK, label: 'TECNOLOGÍA · MÁQUINAS TÉRMICAS', title: 'Cuatro tiempos y una chispa', sub: 'Cómo convierte un motor de gasolina el combustible en movimiento.', def: motor, topic }),
      { layout: 'blank', bg: BG, extra: [vote('¿Qué mueve de verdad el pistón de un motor de gasolina?', ['La gasolina al quemarse empuja el gas', 'Un imán', 'La batería', 'El aire que entra'])],
        notes: 'Sin corregir. La respuesta es la primera: los gases de la combustión, muy calientes, se expanden y empujan el pistón.' },
      stepsSlide({ bg: BG, title: 'El ciclo de cuatro tiempos', def: motor, topic,
        notes: 'Fíjate con la clase en las dos válvulas y en el sentido del pistón en cada tiempo. Cuatro tiempos = dos vueltas del cigüeñal.' }),
      { title: 'Qué pasa en cada tiempo', layout: 'titleOnly', bg: BG, extra: stages([
        ['Admisión', 'El pistón baja con la válvula de admisión abierta: entra la mezcla de aire y gasolina.', BL],
        ['Compresión', 'Las dos válvulas cerradas; el pistón sube y comprime la mezcla en un espacio muy pequeño.', GY],
        ['Combustión', 'La bujía salta, la mezcla se quema y los gases empujan el pistón hacia abajo: es el único tiempo que da fuerza.', RE],
        ['Escape', 'Se abre la válvula de escape y el pistón sube y expulsa los gases quemados.', OR]], { bg: BG, inkc: INK }),
        notes: 'El tiempo de combustión se llama también «explosión» o «expansión». El volante de inercia mantiene el giro durante los otros tres.' },
      { title: 'Válvulas, pistón y cigüeñal', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 170, w: 1100, h: 380, fontSize: 25, header: true, headBg: INK, headFg: '#ffffff', banded: true, band: OR, bandAlpha: 0.08, color: INK, colW: [3, 3, 3, 2, 3],
          rows: [['Tiempo', 'Admisión', 'Escape', 'Pistón', 'Cigüeñal'], ['1. Admisión', 'Abierta', 'Cerrada', 'Baja', '0°–180°'], ['2. Compresión', 'Cerrada', 'Cerrada', 'Sube', '180°–360°'],
            ['3. Combustión', 'Cerrada', 'Cerrada', 'Baja', '360°–540°'], ['4. Escape', 'Cerrada', 'Abierta', 'Sube', '540°–720°']] })],
        notes: 'Simplificado: en los motores reales las válvulas abren un poco antes y cierran un poco después (adelanto y retraso) para llenar y vaciar mejor el cilindro.' },
      { title: 'La relación de compresión', layout: 'titleOnly', bg: BG, extra: [
        m('r = \\dfrac{V_{\\text{cilindrada}} + V_{\\text{cámara}}}{V_{\\text{cámara}}}', 90, 180, 620, 170, 40, INK),
        m('r = \\dfrac{500 + 50}{50} = 11', 90, 380, 620, 110, 36, deep(OR, BG)),
        on(card('Cuanto más se comprime la mezcla, más trabajo saca el motor de cada gota de gasolina.', 760, 180, 430, 160, OR, { color: '#ffffff', fontSize: 24, radius: 16 }), 'fade-left'),
        on(card('Gasolina: en torno a <b>10:1</b>. Diésel: mucho más, entre <b>15:1 y 22:1</b>, porque enciende por compresión, sin bujía.', 760, 365, 430, 190, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: BL, borderWidth: 3 }), 'fade-left')],
        notes: 'Ejemplo: un cilindro de 500 cm³ con una cámara de combustión de 50 cm³ tiene una relación de 11:1. Los valores reales varían según el motor.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿En qué tiempo hace fuerza el motor?', ['Admisión', 'Compresión', 'Combustión', 'Escape'], 2)],
        notes: 'Solo uno de cada cuatro tiempos empuja: por eso los coches tienen varios cilindros desfasados, para que siempre haya uno empujando.' },
      review({ bg: BG, accent: OR, inkc: INK, def: motor, topic, ideas: ['Cuatro tiempos: admisión, compresión, combustión y escape.', 'Un ciclo completo son dos vueltas del cigüeñal.', 'Solo la combustión da fuerza; el resto la gasta.'],
        notes: 'Con la animación en bucle, pide que digan en voz alta el tiempo justo cuando empieza. Con práctica lo cantan al ritmo.' }),
      closing({ bg: BG, accent: OR, inkc: INK, title: 'Del motor al coche eléctrico', body: 'Por parejas: haced una tabla que compare este motor con uno eléctrico (piezas que se mueven, ruido, emisiones en el uso, mantenimiento). Después, una frase con vuestra conclusión.', seconds: 600, end: '¡A compartir!' }),
    ]);
  } },

  // 4 · Las fases de la Luna (Primaria y 1.º de ESO).
  edu_anim_moon: { name: 'Las fases de la Luna, animadas', cat: 'edu', summary: 'Animación con IA de la órbita de la Luna y cómo la vemos desde la Tierra, una fase por clic, los días del ciclo en una tabla, el truco de la C y la D, concurso, repaso en bucle y diario lunar', make: () => {
    const BG = '#f2f3f8', INK = '#1e2240', IN = '#4b4fb8', GO = '#d8a32f', TE = '#2f8f9d', GY = '#6d7290', topic = 'Las fases de la Luna';
    return deckOf('Las fases de la Luna, animadas', INK, [
      cover({ bg: BG, accent: IN, inkc: INK, label: 'CIENCIAS · EL UNIVERSO', title: 'La Luna no cambia: cambia lo que vemos', sub: 'Siempre tiene media cara iluminada por el Sol. Lo que varía es cuánto de esa mitad vemos.', def: luna, topic }),
      { layout: 'blank', bg: BG, extra: [vote('¿Por qué crees que la Luna cambia de forma?', ['Porque la sombra de la Tierra la tapa', 'Porque vemos más o menos su parte iluminada', 'Porque las nubes la tapan', 'Porque la Luna cambia de tamaño'])],
        notes: 'Muchos adultos creen que es la sombra de la Tierra: eso solo pasa en los eclipses de Luna, que son raros. Las fases se deben a cuánto vemos de su mitad iluminada.' },
      stepsSlide({ bg: BG, title: 'La Luna alrededor de la Tierra', def: luna, topic,
        notes: 'Que se fijen en dos cosas a la vez: dónde está la Luna en su órbita y cómo se ve desde la Tierra. La mitad que mira al Sol siempre está iluminada.' }),
      { title: 'Las cuatro fases principales', layout: 'titleOnly', bg: BG, extra: stages([
        ['Luna nueva', 'Está entre la Tierra y el Sol: nos da su cara oscura y casi no la vemos.', GY],
        ['Cuarto creciente', 'Ha dado un cuarto de vuelta: vemos iluminada la mitad derecha (desde el hemisferio norte).', TE],
        ['Luna llena', 'La Tierra está entre el Sol y la Luna: vemos entera su cara iluminada.', GO],
        ['Cuarto menguante', 'Tres cuartos de vuelta: vemos iluminada la mitad izquierda. Después vuelve a ser nueva.', IN]], { bg: BG, inkc: INK }),
        notes: 'Entre una y otra están las fases intermedias: creciente, gibosa creciente, gibosa menguante y menguante.' },
      { title: 'Un ciclo de 29,5 días', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 170, w: 640, h: 360, fontSize: 25, header: true, headBg: IN, headFg: '#ffffff', banded: true, band: IN, bandAlpha: 0.07, color: INK, colW: [4, 3],
          rows: [['Fase', 'Día del ciclo'], ['Luna nueva', '0'], ['Cuarto creciente', '≈ 7,4'], ['Luna llena', '≈ 14,8'], ['Cuarto menguante', '≈ 22,1']] }),
        on(card('<b>Mes sinódico:</b> 29,53 días de una luna nueva a la siguiente.', 780, 180, 420, 140, IN, { color: '#ffffff', fontSize: 24, radius: 16 }), 'fade-left'),
        on(card('<b>El truco</b> (hemisferio norte): la Luna es mentirosa. Si parece una <b>C</b>, decrece; si parece una <b>D</b>, crece.', 780, 345, 420, 190, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: GO, borderWidth: 3 }), 'fade-left')],
        notes: 'La Luna tarda 27,3 días en dar una vuelta a la Tierra (mes sidéreo), pero como la Tierra también avanza alrededor del Sol, necesita unos dos días más para volver a la misma fase. En el hemisferio sur el truco es al revés.' },
      { layout: 'blank', bg: BG, extra: [quiz('En luna llena, ¿dónde está la Luna?', ['Entre la Tierra y el Sol', 'Al otro lado de la Tierra, opuesta al Sol', 'Detrás del Sol', 'Encima del polo norte'], 1)],
        notes: 'En luna llena, Sol y Luna están en lados opuestos: por eso la luna llena sale al anochecer, cuando el Sol se pone.' },
      review({ bg: BG, accent: IN, inkc: INK, def: luna, topic, ideas: ['La Luna no da luz: refleja la del Sol.', 'Siempre está iluminada la mitad que mira al Sol.', 'Vemos más o menos de esa mitad según dónde está en su órbita.'],
        notes: 'Con la animación en bucle, pide que digan la fase justo antes de que aparezca su nombre.' }),
      closing({ bg: BG, accent: IN, inkc: INK, title: 'Diario lunar', body: 'Durante dos semanas, dibujad cada noche (o al atardecer) la forma de la Luna y la hora. Al final, ordenad los dibujos y comprobad el truco de la C y la D. Ahora: preparad la plantilla del diario.', seconds: 420, end: '¡A mirar el cielo!' }),
    ]);
  } },

  // 5 · El corazón y la circulación (Biología, 3.º de ESO).
  edu_anim_heart: { name: 'El corazón y la circulación, animados', cat: 'edu', summary: 'Animación con IA del ciclo cardíaco y las dos circulaciones, una fase por clic, el recorrido de la sangre paso a paso, el gasto cardíaco en una ecuación, frecuencia en reposo y en ejercicio en un gráfico, concurso y repaso', make: () => {
    const BG = '#fbf3f3', INK = '#3a1b22', RE = '#c8323e', BL = '#3360c4', PK = '#d9707c', GR = '#3d9a6b', topic = 'El corazón y la circulación';
    return deckOf('El corazón y la circulación, animados', INK, [
      cover({ bg: BG, accent: RE, inkc: INK, label: 'BIOLOGÍA · CUERPO HUMANO', title: 'Una bomba que no descansa', sub: 'Unos 100 000 latidos al día para llevar oxígeno a cada célula del cuerpo.', def: corazon, topic }),
      { layout: 'blank', bg: BG, extra: [vote('La sangre que sale del corazón hacia el cuerpo… ¿de qué color es?', ['Roja intensa', 'Azul', 'Depende de la hora', 'Transparente'])],
        notes: 'La sangre nunca es azul: la oxigenada es rojo intenso y la que vuelve con poco oxígeno, rojo oscuro. En los dibujos se pinta de azul para distinguirla, y las venas se ven azuladas por cómo atraviesa la luz la piel.' },
      stepsSlide({ bg: BG, title: 'El corazón por dentro', def: corazon, topic,
        notes: 'Recuerda la convención de colores: rojo, sangre con mucho oxígeno; azul, con poco. Que sigan con el dedo el recorrido de la sangre.' }),
      { title: 'El recorrido de la sangre', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Cuerpo\nAurícula derecha\nVentrículo derecho\nPulmones\nAurícula izquierda\nVentrículo izquierdo\nArteria aorta', 90, 190, 1100, 200, { color: INK }),
        on(card('<b style="color:' + deep(BL, '#ffffff') + '">Circulación pulmonar</b><br>Ventrículo derecho → pulmones → aurícula izquierda. La sangre suelta CO₂ y coge oxígeno.', 90, 430, 530, 180, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: BL, borderWidth: 3 }), 'fade-up'),
        on(card('<b style="color:' + deep(RE, '#ffffff') + '">Circulación general</b><br>Ventrículo izquierdo → aorta → todo el cuerpo → venas cavas → aurícula derecha.', 660, 430, 530, 180, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: RE, borderWidth: 3 }), 'fade-up')],
        notes: 'La circulación es doble (pasa dos veces por el corazón en cada vuelta) y cerrada (siempre va por vasos) y completa (la sangre oxigenada no se mezcla con la que no lo está).' },
      { title: 'Cuánta sangre bombea', layout: 'titleOnly', bg: BG, extra: [
        m('\\text{Gasto cardíaco} = \\text{frecuencia} \\times \\text{volumen por latido}', 80, 175, 1120, 90, 34, INK),
        m('70\\ \\tfrac{\\text{latidos}}{\\text{min}} \\times 70\\ \\text{ml} \\approx 4{,}9\\ \\tfrac{\\text{L}}{\\text{min}}', 80, 280, 1120, 100, 36, deep(RE, BG)),
        chartBlock({ x: 80, y: 400, w: 620, h: 270, chartType: 'bar', color: RE, labelColor: INK, yTitle: 'latidos/min', seriesName: 'Frecuencia cardíaca',
          data: [{ label: 'Durmiendo', value: 55 }, { label: 'En reposo', value: 70 }, { label: 'Andando', value: 100 }, { label: 'Corriendo', value: 160 }] }),
        on(card('En reposo, un adulto suele tener entre <b>60 y 100</b> latidos por minuto. En un minuto, el corazón mueve casi toda su sangre: unos 5 litros.', 740, 420, 460, 210, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: PK, borderWidth: 3 }), 'fade-left')],
        notes: 'Valores orientativos para un adulto sano; las cifras del gráfico son de ejemplo. Actividad rápida: que se tomen el pulso 15 segundos y lo multipliquen por 4.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué cavidad del corazón envía la sangre a todo el cuerpo?', ['Aurícula derecha', 'Ventrículo derecho', 'Aurícula izquierda', 'Ventrículo izquierdo'], 3)],
        notes: 'Por eso su pared es la más gruesa: tiene que empujar la sangre hasta los pies y la cabeza.' },
      review({ bg: BG, accent: RE, inkc: INK, def: corazon, topic, ideas: ['Cuatro cavidades: dos aurículas reciben, dos ventrículos impulsan.', 'Las válvulas hacen que la sangre vaya en un solo sentido.', 'Dos circulaciones: la pulmonar y la general.'],
        notes: 'El «pum-pum» del latido es el sonido de las válvulas al cerrarse. Con la animación en bucle, que lo marquen con palmadas.' }),
      closing({ bg: BG, accent: RE, inkc: INK, title: 'Tu pulso, en datos', body: 'Tomaos el pulso en reposo durante 15 segundos y multiplicadlo por 4. Después, 30 saltos y volved a medir. Apuntad los datos de la clase en una tabla y calculad la media de cada columna.', seconds: 480, end: '¡A medir!' }),
    ]);
  } },

  // 6 · La fotosíntesis (Biología, 2.º y 3.º de ESO).
  edu_anim_photo: { name: 'La fotosíntesis, animada', cat: 'edu', summary: 'Animación con IA de la fotosíntesis —luz, agua, CO₂, fase luminosa y ciclo de Calvin—, una fase por clic, la ecuación química, entradas y salidas en una tabla, concurso y repaso en bucle', make: () => {
    const BG = '#f2f8f1', INK = '#1d3322', GR = '#3d9a3f', YE = '#d8a21f', BL = '#2f7fc4', BR = '#8a5a34', topic = 'La fotosíntesis';
    return deckOf('La fotosíntesis, animada', INK, [
      cover({ bg: BG, accent: GR, inkc: INK, label: 'BIOLOGÍA · LAS PLANTAS', title: 'Comer luz', sub: 'Cómo fabrican las plantas su alimento con luz, agua y aire… y nos dejan el oxígeno.', def: fotosintesis, topic }),
      { layout: 'blank', bg: BG, extra: [vote('Un árbol pesa toneladas. ¿De dónde sale casi toda esa materia?', ['De la tierra', 'Del agua', 'Del aire (el CO₂)', 'Del sol'])],
        notes: 'La mayoría responde «de la tierra». Van Helmont lo comprobó en el siglo XVII: el sauce ganó 74 kg y la tierra apenas perdió peso. Hoy sabemos que la mayor parte de la masa seca de una planta es carbono que viene del CO₂ del aire.' },
      stepsSlide({ bg: BG, title: 'La fotosíntesis, paso a paso', def: fotosintesis, topic,
        notes: 'Que se fijen en qué entra (luz, agua, CO₂) y qué sale (glucosa y oxígeno), y por dónde.' }),
      { title: 'Qué pasa en cada fase', layout: 'titleOnly', bg: BG, extra: stages([
        ['Captar la luz', 'La clorofila de los cloroplastos absorbe sobre todo la luz roja y azul; refleja la verde.', YE],
        ['Agua y CO₂', 'El agua sube desde la raíz por el xilema; el CO₂ entra por los estomas de las hojas.', BL],
        ['Fase luminosa', 'Con la energía de la luz se rompe el agua: se libera oxígeno y se guarda energía química (ATP y NADPH).', GR],
        ['Ciclo de Calvin', 'Con esa energía, el CO₂ se fija y se convierte en glucosa: el alimento de la planta.', BR]], { bg: BG, inkc: INK }),
        notes: 'El oxígeno que respiramos viene del agua, no del CO₂: se descubrió en 1941 marcando el oxígeno del agua con un isótopo (Ruben y Kamen).' },
      { title: 'La ecuación de la fotosíntesis', layout: 'titleOnly', bg: BG, extra: [
        m('6\\,\\mathrm{CO_2} + 6\\,\\mathrm{H_2O} \\xrightarrow{\\text{luz}} \\mathrm{C_6H_{12}O_6} + 6\\,\\mathrm{O_2}', 80, 175, 1120, 120, 42, INK),
        tableBlock({ x: 90, y: 330, w: 1100, h: 250, fontSize: 25, header: true, headBg: GR, headFg: '#ffffff', banded: true, band: GR, bandAlpha: 0.08, color: INK, colW: [3, 4, 4],
          rows: [['', 'Entra', 'Sale'], ['Materia', 'Dióxido de carbono y agua', 'Glucosa y oxígeno'], ['Energía', 'Luz del sol', 'Energía química en la glucosa'], ['Por dónde', 'Raíz (agua) y estomas (CO₂)', 'Estomas (O₂) y floema (azúcares)']] })],
        notes: 'Haced el recuento de átomos a cada lado: 6 C, 12 H y 18 O. La ecuación está ajustada. La glucosa se usa para crecer, para respirar y se guarda como almidón.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿De dónde viene el oxígeno que liberan las plantas?', ['Del CO₂', 'Del agua', 'De la glucosa', 'De la tierra'], 1)],
        notes: 'Pregunta trampa: lo lógico parece el CO₂ (lleva dos oxígenos), pero el O₂ sale de romper moléculas de agua en la fase luminosa.' },
      review({ bg: BG, accent: GR, inkc: INK, def: fotosintesis, topic, ideas: ['Entran luz, agua y CO₂; salen glucosa y oxígeno.', 'Ocurre en los cloroplastos, gracias a la clorofila.', 'Casi toda la vida de la Tierra depende de ella.'],
        notes: 'Pregunta final: ¿las plantas respiran? Sí: respiran día y noche; de día, además, hacen fotosíntesis y producen más oxígeno del que gastan.' }),
      closing({ bg: BG, accent: GR, inkc: INK, title: 'Burbujas de oxígeno', body: 'Diseñad un experimento con una ramita de elodea en agua con una pizca de bicarbonato: contad las burbujas en un minuto con la lámpara cerca y lejos. ¿Qué variable cambiáis? ¿Cuál medís? ¿Qué esperáis?', seconds: 600, end: '¡Hipótesis!' }),
    ]);
  } },

  // 7 · El teorema de Pitágoras (Matemáticas, 2.º de ESO).
  edu_anim_pythagoras: { name: 'El teorema de Pitágoras, animado', cat: 'edu', summary: 'Demostración animada del teorema de Pitágoras con los cuadrados sobre los lados, una fase por clic, la fórmula, ternas pitagóricas en una tabla con fórmulas, un problema de la escalera, concurso y repaso en bucle', make: () => {
    const BG = '#f4f6fb', INK = '#1d2540', BL = '#3f6ad8', OR = '#e0873b', GR = '#2e9e6b', PU = '#7b5bd0', topic = 'El teorema de Pitágoras';
    return deckOf('El teorema de Pitágoras, animado', INK, [
      cover({ bg: BG, accent: BL, inkc: INK, label: 'MATEMÁTICAS · GEOMETRÍA', title: 'Tres cuadrados que encajan', sub: 'Por qué en todo triángulo rectángulo a² + b² = c², visto sin una sola cuenta.', def: pitagoras, topic }),
      { layout: 'blank', bg: BG, extra: [vote('Un triángulo rectángulo tiene catetos de 3 y 4 cm. ¿Cuánto mide la hipotenusa?', ['5 cm', '7 cm', '6 cm', '12 cm'])],
        notes: 'Muchos dirán 7 (sumar los catetos). Deja la duda abierta: la animación la resuelve.' },
      stepsSlide({ bg: BG, title: 'La demostración, paso a paso', def: pitagoras, topic,
        notes: 'Antes de cada clic, que digan qué creen que va a pasar con las piezas. La clave: el área no cambia al mover las piezas.' }),
      { title: 'El teorema', layout: 'titleOnly', bg: BG, extra: [
        m('a^2 + b^2 = c^2', 80, 180, 560, 150, 72, deep(BL, BG)),
        m('3^2 + 4^2 = 9 + 16 = 25 = 5^2', 80, 360, 560, 90, 36, INK),
        on(card('<b>Catetos</b> (a y b): los dos lados que forman el ángulo recto.', 690, 180, 510, 120, '#ffffff', { color: INK, fontSize: 24, radius: 16, borderColor: OR, borderWidth: 3 }), 'fade-left'),
        on(card('<b>Hipotenusa</b> (c): el lado más largo, enfrente del ángulo recto.', 690, 320, 510, 120, '#ffffff', { color: INK, fontSize: 24, radius: 16, borderColor: BL, borderWidth: 3 }), 'fade-left'),
        on(card('Solo vale para triángulos <b>rectángulos</b>.', 690, 460, 510, 90, PU, { color: '#ffffff', fontSize: 24, radius: 16 }), 'fade-left')],
        notes: 'El área del cuadrado construido sobre la hipotenusa es igual a la suma de las áreas de los cuadrados construidos sobre los catetos. Ya lo usaban los babilonios más de mil años antes de Pitágoras (tablilla Plimpton 322).' },
      { title: 'Ternas pitagóricas', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 170, w: 700, h: 400, fontSize: 26, header: true, headBg: BL, headFg: '#ffffff', banded: true, band: BL, bandAlpha: 0.07, color: INK, colW: [2, 2, 3],
          rows: [['a', 'b', 'c = √(a² + b²)'], ['3', '4', '=(A2^2+B2^2)^0,5'], ['5', '12', '=(A3^2+B3^2)^0,5'], ['8', '15', '=(A4^2+B4^2)^0,5'], ['6', '8', '=(A5^2+B5^2)^0,5']] }),
        on(card('Tres números enteros que cumplen el teorema forman una <b>terna pitagórica</b>.', 830, 180, 370, 170, GR, { color: '#ffffff', fontSize: 24, radius: 16 }), 'fade-left'),
        on(card('6, 8, 10 es el 3, 4, 5 multiplicado por 2. ¿Encuentras otra así?', 830, 375, 370, 160, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: GR, borderWidth: 3 }), 'fade-left')],
        notes: 'La tercera columna es una fórmula: eleva a 0,5, que es la raíz cuadrada. Cambiad los catetos y comprobad si sale un número entero.' },
      { title: 'Un problema: la escalera', layout: 'titleOnly', bg: BG, extra: [
        text('Una escalera de <b>5 m</b> se apoya en una pared con el pie a <b>1,4 m</b> de ella. ¿A qué altura llega?', 90, 175, 1100, 90, { fontSize: 28, color: INK, lineHeight: 1.4 }),
        on(m('h = \\sqrt{5^2 - 1{,}4^2} = \\sqrt{25 - 1{,}96} = \\sqrt{23{,}04} = 4{,}8\\ \\text{m}', 90, 300, 1100, 110, 38, deep(OR, BG)), 'fade-up'),
        on(card('Si conoces la hipotenusa y un cateto, <b>resta</b>: b² = c² − a².', 90, 450, 1100, 100, '#ffffff', { color: INK, fontSize: 25, radius: 16, borderColor: OR, borderWidth: 3, vAlign: 'middle' }), 'fade-up')],
        notes: 'Deja que lo intenten antes de mostrar la solución (clic). Error típico: sumar en lugar de restar cuando lo que falta es un cateto.' },
      { layout: 'blank', bg: BG, extra: [quiz('Una pantalla de 16 × 12 pulgadas, ¿cuánto mide en diagonal?', ['28 pulgadas', '20 pulgadas', '24 pulgadas', '18 pulgadas'], 1)],
        notes: '16² + 12² = 256 + 144 = 400, y √400 = 20. Es la terna 3, 4, 5 multiplicada por 4. Las pantallas se venden por su diagonal.' },
      review({ bg: BG, accent: BL, inkc: INK, def: pitagoras, topic, ideas: ['En un triángulo rectángulo, a² + b² = c².', 'Los cuadrados son áreas: las piezas encajan sin sobrar nada.', 'Sirve para calcular distancias que no se pueden medir.'],
        notes: 'Con la animación en bucle, pide que alguien explique la demostración solo con gestos.' }),
      closing({ bg: BG, accent: BL, inkc: INK, title: 'Pitágoras en el aula', body: 'Por grupos: medid el largo y el ancho de la pizarra, de una mesa y de una ventana, calculad su diagonal con el teorema y comprobadla con la cinta métrica. ¿Cuánto os habéis desviado?', seconds: 720, end: '¡A medir!' }),
    ]);
  } },

  // 8 · La tectónica de placas (Geología, 4.º de ESO).
  edu_anim_plates: { name: 'La tectónica de placas, animada', cat: 'edu', summary: 'Animación con IA de los límites de placas —convergente, divergente y transformante— con volcanes y terremotos, uno por clic, ejemplos en una tabla, la velocidad de las placas en un gráfico, concurso y repaso', make: () => {
    const BG = '#f7f4ef', INK = '#2c2219', OR = '#d4622a', BR = '#8a5a34', BL = '#2f7fc4', GR = '#5d8a3a', topic = 'La tectónica de placas';
    return deckOf('La tectónica de placas, animada', INK, [
      cover({ bg: BG, accent: OR, inkc: INK, label: 'GEOLOGÍA · LA TIERRA DINÁMICA', title: 'El suelo que se mueve', sub: 'Las placas avanzan unos centímetros al año: lo bastante para levantar cordilleras y abrir océanos.', def: placas, topic }),
      { layout: 'blank', bg: BG, extra: [vote('¿A qué velocidad crees que se mueven las placas de la Tierra?', ['Como crecen las uñas', 'Como anda una persona', 'Como un coche', 'No se mueven'])],
        notes: 'Respuesta: más o menos como crecen las uñas, unos pocos centímetros al año. Lento, pero en millones de años son miles de kilómetros.' },
      stepsSlide({ bg: BG, title: 'Los límites entre placas', def: placas, topic,
        notes: 'En cada clic, pregunta: ¿se acercan, se separan o se deslizan? ¿Qué se forma ahí?' }),
      { title: 'Tres tipos de límite', layout: 'titleOnly', bg: BG, extra: stages([
        ['Convergente', 'Las placas chocan: una oceánica se hunde bajo otra (subducción) y aparecen fosas, volcanes y cordilleras.', OR],
        ['Divergente', 'Las placas se separan: el magma sube, se enfría y forma corteza nueva en las dorsales oceánicas.', BL],
        ['Transformante', 'Las placas se deslizan de lado una junto a otra: no se crea ni se destruye corteza, pero hay terremotos.', BR],
        ['El motor', 'El calor del interior de la Tierra y el peso de las placas que se hunden las mantienen en movimiento.', GR]], { bg: BG, inkc: INK }),
        notes: 'La litosfera está rota en unas quince placas grandes que «flotan» sobre el manto, más plástico. Wegener propuso la deriva continental en 1912; la tectónica de placas se aceptó en los años sesenta.' },
      { title: 'Ejemplos en el mapa', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 170, w: 1100, h: 330, fontSize: 25, header: true, headBg: INK, headFg: '#ffffff', banded: true, band: OR, bandAlpha: 0.08, color: INK, colW: [3, 4, 4],
          rows: [['Límite', 'Ejemplo', 'Qué se ve'], ['Convergente', 'Los Andes (Nazca bajo Sudamérica)', 'Volcanes, cordillera, terremotos'], ['Convergente', 'Himalaya (India contra Eurasia)', 'Las montañas más altas'],
            ['Divergente', 'Dorsal mesoatlántica, Islandia', 'Volcanes, fisuras, corteza nueva'], ['Transformante', 'Falla de San Andrés (California)', 'Terremotos']] }),
        text('Las Canarias son volcánicas, pero no están en un límite de placas: su origen aún se investiga (una pluma del manto es la hipótesis más aceptada).', 90, 525, 1100, 80, { fontSize: 22, color: '#5c5045', lineHeight: 1.4 })],
        notes: 'Situad cada ejemplo en un mapa mundial. El Himalaya sigue creciendo unos milímetros al año porque la India sigue empujando.' },
      { title: 'Lento, pero imparable', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 165, w: 680, h: 470, chartType: 'bar', horizontal: true, color: OR, labelColor: INK, xTitle: 'cm al año', seriesName: 'Velocidad aproximada',
          data: [{ label: 'Dorsal mesoatlántica', value: 2.5 }, { label: 'Uñas (crecimiento)', value: 3.5 }, { label: 'India hacia Eurasia', value: 4 }, { label: 'Placa del Pacífico', value: 9 }] }),
        on(card('A unos 2,5 cm al año, el Atlántico se ha ensanchado unos <b>13 metros</b> desde que Colón lo cruzó en 1492.', 800, 190, 400, 190, OR, { color: '#ffffff', fontSize: 24, radius: 16 }), 'fade-left'),
        text('Valores aproximados (USGS, NASA).', 800, 410, 400, 40, { fontSize: 18, color: '#5c5045' })],
        notes: 'Las velocidades varían según el punto de cada límite; estos valores son orientativos. La cuenta: unos 530 años × 2,5 cm ≈ 1 325 cm ≈ 13 m. En el Atlántico Norte la apertura es de unos 2–3 cm al año; en el Sur, algo más.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué ocurre en un límite divergente?', ['Una placa se hunde bajo otra', 'Las placas se separan y se forma corteza nueva', 'Las placas se deslizan de lado', 'Nada: no hay movimiento'], 1)],
        notes: 'Islandia es un lugar privilegiado: allí se puede caminar entre la placa norteamericana y la euroasiática (Þingvellir).' },
      review({ bg: BG, accent: OR, inkc: INK, def: placas, topic, ideas: ['La litosfera está dividida en placas que se mueven.', 'Chocan, se separan o se deslizan de lado.', 'En sus límites hay volcanes, terremotos y cordilleras.'],
        notes: 'Con la animación en bucle, que digan el tipo de límite justo cuando aparece.' }),
      closing({ bg: BG, accent: OR, inkc: INK, title: 'Detectives de terremotos', body: 'Por parejas: buscad en la web del Instituto Geográfico Nacional los terremotos de la última semana en la península y Canarias. Marcadlos en un mapa: ¿dónde se concentran? ¿Por qué creéis que es así?', seconds: 720, end: '¡Al mapa!' }),
    ]);
  } },
};
