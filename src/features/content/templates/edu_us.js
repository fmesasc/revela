// Example presentations: Para EE. UU. (US classroom). Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Twelve decks for the American school calendar and curriculum — Thanksgiving, Veterans Day, Election Day, the three branches,
// how a bill becomes law, the Constitution, Native American Heritage Month, Hour of Code, money for teens, college applications,
// back-to-school night and classroom procedures. The authoring language is Spanish like the rest of the catalogue; the English
// version (i18n/en/edu_us.js) is the one that matters for the US and uses American spelling, dates and dollars.
// 3D icons (3dicons.co, CC0: assets/icons3d/<id>.webp) over soft lights and glass panels (see show_icons3d.js).
// Figures that change or that a teacher must check (dates, thresholds, deadlines) are said so in the speaker notes.

import { build, text, ul, A, withAnims, numbered, glow, chartBlock, tableBlock, pollBlock, base } from './kit.js';

const AI = new URL('../../../../assets/icons3d/', import.meta.url).href;
const WH = '#ffffff', SOFT = '#d9d4f2';
const FF = { head: "'Space Grotesk', sans-serif" };
const COLS = ['#ffd166', '#7dd3fc', '#f9a8d4', '#86efac'];
// What each 3D icon is (alternative text).
const ALT = { bulb: 'Una bombilla', pencil: 'Un lápiz', megaphone: 'Un megáfono', trophy: 'Un trofeo', clock: 'Un despertador', heart: 'Un corazón',
  puzzle: 'Una pieza de puzle', calender: 'Un calendario', notebook: 'Un cuaderno', calculator: 'Una calculadora', computer: 'Un ordenador', target: 'Una diana',
  tool: 'Unas herramientas', rocket: 'Un cohete', star: 'Una estrella', medal: 'Una medalla', flag: 'Una bandera', 'money-bag': 'Una bolsa de dinero', chart: 'Un gráfico',
  lock: 'Un candado', sheild: 'Un escudo', key: 'Una llave', mail: 'Un sobre de correo', 'chat-bubble': 'Una conversación', 'chat-text': 'Un mensaje',
  zoom: 'Una lupa', 'thumb-up': 'Un pulgar hacia arriba', gift: 'Un regalo', card: 'Una tarjeta de pago', dollar: 'Un dólar', wallet: 'Una cartera',
  folder: 'Una carpeta', 'file-text': 'Un documento', bookmark: 'Un marcador', location: 'Una ubicación', 'map-pin': 'Una chincheta de mapa', tick: 'Una marca de verificación',
  link: 'Un enlace', crown: 'Una corona', sun: 'Un sol', fire: 'Una llama', bag: 'Una bolsa', brush: 'Un pincel', 'color-palette': 'Una paleta de colores',
  'tea-cup': 'Una taza', headphone: 'Unos auriculares', mic: 'Un micrófono', locker: 'Una taquilla', lab: 'Un matraz', flash: 'Un rayo', umbrella: 'Un paraguas', mobile: 'Un móvil', 'video-camera': 'Una cámara de vídeo' };
const ico = (id, x, y, s, props = {}) => ({ ...base(x, y, s, s), type: 'image', src: `${AI}${id}.webp`, alt: ALT[id], fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const glass = (html, x, y, w, h, props = {}) => text(html, x, y, w, h, { bg: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.38)', borderWidth: 1.5,
  radius: 24, pad: [20, 26, 20, 26], glass: 18, color: WH, fontSize: 26, ...props });
const lights = (T) => [glow(-160, -180, 640, T.l[0], T.bg, 80), glow(760, 330, 700, T.l[1], T.bg, 62), glow(470, -260, 520, T.l[2], T.bg, 48)];
const heading = (t) => text(t, 70, 40, 1140, 80, { fontSize: 46, fontWeight: 800, color: WH, fontFamily: FF.head });
const label = (t, x, y, w, color) => text(t, x, y, w, 30, { fontSize: 20, letterSpacing: 3, fontWeight: 700, color });
const note = (t, y = 650) => text(t, 70, y, 1140, 36, { fontSize: 20, color: SOFT });
const credit = (x = 70, y = 668) => text('Iconos 3D: 3dicons.co · Vijay Verma (CC0)', x, y, 520, 30, { fontSize: 16, color: SOFT, letterSpacing: 1 });
const tbl = (rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 23, header: true, headBg: 'rgba(255,255,255,0.22)', headFg: WH, stroke: 'rgba(255,255,255,0.28)',
  banded: true, band: '#ffffff', bandAlpha: 0.05, color: WH, rows, ...o });
const quizBlock = (question, options, correct) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 34, x: 70, y: 60, w: 1140, h: 600 });
const chain = (i) => ({ start: i ? 'afterPrev' : 'click' });
const slideOf = (T, extra, notes) => ({ layout: 'blank', bg: T.bg, back: lights(T), extra, notes, transition: 'fade' });

// ---- Slide kinds --------------------------------------------------------------------
// Cover: a glass panel with the kicker, title and subtitle, and three icons [id, x, y, size].
const cover = (T, kicker, title, sub, icons, notes) => slideOf(T, [glass('', 70, 150, 700, 430, { glass: 22 }),
  label(kicker, 110, 190, 620, T.ac), text(title, 104, 236, 640, 190, { fontSize: 52, fontWeight: 800, color: WH, lineHeight: 1.05, fontFamily: FF.head }),
  text(sub, 110, 440, 620, 110, { fontSize: 25, color: SOFT, lineHeight: 1.35 }),
  ...icons.map(([id, x, y, s], i) => on(ico(id, x, y, s), i ? 'zoom-in' : 'fade-up', { start: 'afterPrev' })), credit(110, 610)], notes);   // (on their own when the cover appears: the cover's picture on the website shows them)
// Three or four cards [icon, title, line]: an icon over a title and a line, on glass.
const tiles = (T, title, items, foot, notes) => { const n = items.length, w = n === 3 ? 340 : 260, gap = n === 3 ? 385 : 290, x0 = n === 3 ? 80 : 70, big = n === 3 ? 190 : 170;
  return slideOf(T, [heading(title), ...items.flatMap(([id, tt, ln], i) => { const x = x0 + i * gap, y = 300;
    return [on(glass(`<div style="text-align:center"><b style="font-size:30px;color:${COLS[i]}">${tt}</b><br><span style="font-size:23px;color:${SOFT}">${ln}</span></div>`,
      x, y, w, 290, { vAlign: 'bottom', pad: [20, 20, 22, 20] }), 'fade-up', chain(i)), ico(id, x + (w - big) / 2, y - big * 0.28, big)]; }), note(foot, 630)], notes); };
// Four steps in a row on one glass panel [icon, label, line], and a line under it.
const steps = (T, title, items, foot, notes) => slideOf(T, [heading(title), glass('', 70, 160, 1140, 350, { glass: 20 }),
  ...items.flatMap(([id, tt, ln], i) => [on(ico(id, 110 + i * 280, 180, 150), 'zoom-in', chain(i)),
    text(`<div style="text-align:center"><b style="font-size:28px;color:${T.ac}">${tt}</b><br><span style="font-size:21px;color:${SOFT}">${ln}</span></div>`, 70 + i * 280, 340, 250, 160, { fontSize: 21 })]),
  glass(foot, 70, 535, 1140, 90, { fontSize: 24 })], notes);
// A list on glass with an icon on the right.
const bullets = (T, title, items, id, notes, foot) => slideOf(T, [heading(title), glass(ul(...items), 70, 150, 760, 440, { fontSize: 27, lineHeight: 1.35 }),
  on(ico(id, 860, 160, 320), 'zoom-in'), ...(foot ? [glass(foot, 860, 480, 350, 110, { fontSize: 21 })] : []), credit()], notes);
// A table on glass with an icon on the right.
const table = (T, title, rows, id, caption, notes, o = {}) => slideOf(T, [heading(title), glass('', 70, 150, o.w || 820, o.h || 470, { glass: 20 }),
  tbl(rows, 95, 175, (o.w || 820) - 50, (o.h || 470) - 50, o.table || {}), on(ico(id, 930, 160, 270), 'fade-up'),
  glass(caption, 920, 450, 290, 170, { fontSize: 21, lineHeight: 1.3 }), credit()], notes);
const quiz = (T, q, options, correct, notes) => ({ layout: 'blank', bg: T.bg, back: lights(T), transition: 'fade', extra: [quizBlock(q, options, correct)], notes });
const close = (T, title, line, icons, notes) => slideOf(T, [text(title, 90, 170, 700, 150, { fontSize: 60, fontWeight: 800, color: WH, fontFamily: FF.head }),
  glass(line, 90, 340, 620, 160, { fontSize: 28, lineHeight: 1.35 }),
  ...icons.map(([id, x, y, s], i) => on(ico(id, x, y, s), 'zoom-in', i ? { start: 'afterPrev' } : {})), credit(90, 640)], notes);
const deck = (name, T, slides) => numbered(build({ name, palette: 'midnight', fonts: 'tech', title: { color: WH, size: 44 }, body: { color: WH } }, slides));

const AUTUMN = { bg: '#2a1405', l: ['#f97316', '#b45309', '#facc15'], ac: '#fbbf24' };
const FLAG = { bg: '#0b1530', l: ['#2563eb', '#dc2626', '#94a3b8'], ac: '#93c5fd' };
const CIVIC = { bg: '#0c1733', l: ['#3b82f6', '#be123c', '#f59e0b'], ac: '#fcd34d' };
const EARTH = { bg: '#1f1208', l: ['#c2410c', '#0f766e', '#ca8a04'], ac: '#fdba74' };
const TECH = { bg: '#071326', l: ['#06b6d4', '#8b5cf6', '#22c55e'], ac: '#67e8f9' };
const MONEY = { bg: '#06201a', l: ['#10b981', '#22d3ee', '#a3e635'], ac: '#6ee7b7' };
const PURPLE = { bg: '#150f33', l: ['#7c3aed', '#ec4899', '#22d3ee'], ac: '#ffd166' };
const SCHOOL = { bg: '#0f1c3f', l: ['#3b82f6', '#f59e0b', '#ec4899'], ac: '#fcd34d' };

export default {

  // 1 · Thanksgiving
  edu_us_thanksgiving: { name: 'Acción de Gracias: historia y gratitud', cat: 'edu',
    summary: 'Lección de Thanksgiving para EE. UU.: qué se celebra, historia desde 1621 hasta 1941 con una mirada completa que incluye al pueblo wampanoag, tradiciones, una actividad de gratitud y un cuestionario',
    make: () => { const T = AUTUMN; return deck('Acción de Gracias: historia y gratitud', T, [
      cover(T, 'CUARTO JUEVES DE NOVIEMBRE', 'Acción de Gracias: historia y gratitud', 'Qué celebramos, de dónde viene y cómo dar las gracias en clase.',
        [['gift', 800, 90, 300], ['heart', 770, 400, 200], ['sun', 1000, 430, 200]],
        'Portada. Thanksgiving se celebra el cuarto jueves de noviembre. Lección pensada para primaria y secundaria; el nivel se adapta con las preguntas.'),
      tiles(T, 'Qué celebramos', [['sun', 'La cosecha', 'Dar gracias por lo que ha dado la tierra'], ['heart', 'La familia', 'Una comida compartida con quienes queremos'], ['thumb-up', 'La gratitud', 'Reconocer lo bueno que tenemos']],
        'Tres ideas que se repiten en todas las casas.', 'Tres ideas centrales. Preguntar al grupo qué tradiciones tienen en casa; no todas las familias celebran la fiesta igual ni la celebran.'),
      steps(T, 'Una historia en cuatro fechas', [['flag', '1621', 'Banquete de la cosecha en Plymouth con el pueblo wampanoag'], ['star', '1789', 'Washington proclama un día de acción de gracias'],
        ['pencil', '1863', 'Lincoln lo declara día nacional'], ['calender', '1941', 'El Congreso fija el cuarto jueves de noviembre']], 'Las fechas ayudan a ver que la fiesta cambió mucho con los años.',
        'Cuatro hitos. Datos a verificar con la fuente que use el centro: banquete de 1621 en Plymouth (Massachusetts), proclamación de Washington de 1789, proclamación de Lincoln de 1863 y ley del Congreso de 1941.'),
      bullets(T, 'Una mirada completa', ['El banquete de 1621 lo compartieron colonos y <b>wampanoag</b>.', 'Para muchos pueblos nativos, este día también es de <b>memoria y duelo</b>.',
        'Hay <b>más de una forma</b> de contar la misma historia.', 'Escuchar distintas voces nos ayuda a entender mejor.'], 'bookmark',
        'Diapositiva para tratar el tema con respeto. Mencionar que desde 1970 algunos pueblos nativos de Nueva Inglaterra celebran un Día Nacional de Duelo (verificar con fuentes del centro). Adaptar al nivel.'),
      steps(T, 'Tradiciones de hoy', [['gift', 'La mesa', 'Pavo, puré y pastel de calabaza'], ['location', 'El viaje', 'Muchas familias viajan para reunirse'], ['video-camera', 'El desfile', 'Un desfile y fútbol americano por la tele'], ['bag', 'Las compras', 'Al día siguiente empieza la temporada de compras']],
        'Cada familia tiene sus propias costumbres: ¿cuáles son las tuyas?', 'Costumbres frecuentes en EE. UU.; son generales y no representan a todas las familias.'),
      quiz(T, '¿Qué día se celebra Thanksgiving en Estados Unidos?', ['El último jueves de noviembre', 'El cuarto jueves de noviembre', 'El primer jueves de noviembre', 'El 4 de julio'], 1,
        'Respuesta: el cuarto jueves de noviembre (así lo fija una ley de 1941). Es distinto del último jueves cuando noviembre tiene cinco.'),
      close(T, 'Gracias', 'Escribe una nota a alguien a quien quieras darle las gracias y guárdala en el frasco de la clase.', [['heart', 800, 120, 300], ['star', 1000, 400, 190], ['gift', 780, 400, 190]],
        'Actividad de gratitud: cada alumno escribe una nota de agradecimiento y la deposita en un frasco; se leen algunas en voz alta.')]); } },

  // 2 · Veterans Day
  edu_us_veterans: { name: 'Día de los Veteranos', cat: 'edu',
    summary: 'El Veterans Day del 11 de noviembre explicado en clase: historia desde el armisticio de 1918, diferencia con el Memorial Day, las ramas de las Fuerzas Armadas, formas de dar las gracias a los veteranos y un cuestionario',
    make: () => { const T = FLAG; return deck('Día de los Veteranos', T, [
      cover(T, '11 DE NOVIEMBRE', 'Día de los Veteranos', 'Honramos a quienes han servido en las Fuerzas Armadas.', [['flag', 800, 90, 310], ['medal', 770, 410, 200], ['star', 1000, 430, 200]],
        'Portada. Veterans Day se celebra cada 11 de noviembre en EE. UU. Tratar el tema con respeto; en el aula puede haber familias con militares.'),
      tiles(T, 'Qué es el Día de los Veteranos', [['calender', 'Cuándo', 'Cada 11 de noviembre'], ['flag', 'A quién', 'A todas las personas que han servido'], ['heart', 'Cómo', 'Con ceremonias, desfiles y gracias']],
        'Es un día para agradecer, no solo para recordar.', 'Tres ideas básicas.'),
      steps(T, 'Cómo empezó', [['clock', '1918', 'Acaba la Primera Guerra Mundial a las 11 de la mañana del 11 del 11'], ['calender', '1919', 'Se celebra el primer Día del Armisticio'], ['file-text', '1938', 'Se convierte en fiesta nacional'], ['medal', '1954', 'Pasa a llamarse Día de los Veteranos']],
        'Primero recordaba el fin de una guerra; hoy honra a todos los veteranos.', 'Cuatro fechas. Verificar las fechas con una fuente oficial (por ejemplo, el Departamento de Asuntos de los Veteranos).'),
      table(T, 'Veterans Day y Memorial Day', [['', 'Veterans Day', 'Memorial Day'], ['Fecha', '11 de noviembre', 'Último lunes de mayo'], ['Honra a', 'A todos los que han servido', 'A quienes murieron en el servicio'], ['Ambiente', 'Gratitud y desfiles', 'Recuerdo y respeto']],
        'flag', 'Se confunden mucho: una da las gracias, la otra recuerda.', 'Comparación clásica que preguntan los alumnos. Memorial Day es el último lunes de mayo.', { table: { fontSize: 22 } }),
      bullets(T, 'Las seis ramas', ['<b>Ejército</b>: la más numerosa', '<b>Armada</b>: opera en el mar', '<b>Fuerza Aérea</b>: opera en el aire', '<b>Cuerpo de Marines</b>: fuerza de despliegue rápido', '<b>Fuerza Espacial</b>: creada en 2019', '<b>Guardia Costera</b>: protege costas y puertos'], 'sheild',
        'Seis ramas de las Fuerzas Armadas. La Guardia Costera depende del Departamento de Seguridad Nacional en tiempos de paz.'),
      steps(T, 'Cómo dar las gracias', [['mail', 'Escribe', 'Una carta o una tarjeta'], ['mic', 'Escucha', 'Su historia, si quiere contarla'], ['chat-bubble', 'Invita', 'A hablar con la clase'], ['heart', 'Apoya', 'A organizaciones de veteranos']],
        'Un «gracias» sincero ya es mucho.', 'Actividad: tarjetas para veteranos de la comunidad. Si hay alumnos con familiares militares, preguntar antes de nombrarlos.'),
      quiz(T, '¿A quién honra el Día de los Veteranos?', ['Solo a quienes murieron en combate', 'A todas las personas que han servido', 'A los presidentes', 'A los policías'], 1, 'Respuesta: a todas las personas que han servido en las Fuerzas Armadas, vivas o no.'),
      close(T, 'Gracias por servir', 'A todas las personas que han servido a su país: gracias.', [['star', 800, 120, 300], ['flag', 1000, 400, 190], ['medal', 780, 400, 190]], 'Cierre con un minuto de silencio opcional.')]); } },

  // 3 · Election Day 2026
  edu_us_election: { name: 'Día de las elecciones en EE. UU.', cat: 'edu',
    summary: 'Cómo funcionan las elecciones en Estados Unidos, con las de mitad de mandato del 3 de noviembre de 2026: qué se vota, cómo se vota, elección presidencial y Colegio Electoral, quién puede votar y un cuestionario; neutral',
    make: () => { const T = CIVIC; return deck('Día de las elecciones en EE. UU.', T, [
      cover(T, 'MITAD DE MANDATO · 3 NOV 2026', 'Día de las elecciones en EE. UU.', 'Cómo funciona el voto: una explicación neutral para clase.', [['flag', 800, 90, 310], ['tick', 790, 410, 200], ['megaphone', 1000, 430, 200]],
        'Portada. Presentación neutral: explica el proceso, no pide el voto para nadie. El 3 de noviembre de 2026 hay elecciones de mitad de mandato (primer martes después del primer lunes de noviembre).'),
      tiles(T, 'Qué se vota en 2026', [['star', 'Cámara de Representantes', 'Los 435 escaños'], ['sheild', 'Senado', 'Un tercio de los escaños'], ['location', 'Estados y ciudades', 'Gobernadores y cargos locales']],
        'No se vota presidente: son las elecciones de mitad de mandato.', 'Las mid-terms se celebran a mitad del mandato presidencial de cuatro años. Los cargos exactos varían por estado: verificar la papeleta local.'),
      steps(T, 'Cómo se vota', [['file-text', '1 · Registrarse', 'En la mayoría de los estados hay que registrarse'], ['zoom', '2 · Informarse', 'Conocer candidatos y propuestas'], ['tick', '3 · Votar', 'En persona o por correo, según el estado'], ['chart', '4 · Contar', 'Se cuentan y se certifican los resultados']],
        'Las reglas cambian de un estado a otro: se consultan en la web oficial de tu estado.', 'Cuatro pasos generales. Las reglas (registro, voto adelantado o por correo, documentos) las fija cada estado: comprobar las del estado del centro.'),
      table(T, 'Elecciones presidenciales y de mitad de mandato', [['', 'Presidenciales', 'De mitad de mandato'], ['Cada', '4 años', '2 años (Cámara)'], ['Se elige', 'Presidente y vicepresidente', 'Congreso y cargos locales'], ['Clave', '270 de 538 votos electorales', 'Mayorías en el Congreso']],
        'chart', 'El presidente se elige por el Colegio Electoral.', 'El Colegio Electoral tiene 538 electores y hacen falta 270 para ganar. La Cámara se renueva cada dos años.', { table: { fontSize: 21 } }),
      bullets(T, '¿Quién puede votar?', ['Ciudadanos de EE. UU.', 'Con <b>18 años</b> o más.', 'Registrados, en casi todos los estados.', 'Con las reglas de su estado.'], 'tick',
        'El voto a los 18 años llegó con la Enmienda 26 (1971). Los requisitos exactos los fija cada estado.'),
      quiz(T, '¿Cuántos votos electorales hacen falta para ganar la presidencia?', ['100', '270', '435', '538'], 1, 'Respuesta: 270 de 538. 538 es el total; 435 son los escaños de la Cámara.'),
      close(T, 'Tu voz cuenta', 'Informarse y participar es una forma de ciudadanía.', [['megaphone', 800, 120, 300], ['tick', 1000, 400, 190], ['flag', 780, 400, 190]], 'Cierre neutral. Se puede proponer una votación simulada en clase.')]); } },

  // 4 · Three branches
  edu_us_branches: { name: 'Las tres ramas del gobierno de EE. UU.', cat: 'edu',
    summary: 'Poder legislativo, ejecutivo y judicial de Estados Unidos: qué hace cada rama, cómo se compone el Congreso, el presidente, el Tribunal Supremo, los frenos y contrapesos y un cuestionario',
    make: () => { const T = FLAG; return deck('Las tres ramas del gobierno de EE. UU.', T, [
      cover(T, 'EDUCACIÓN CÍVICA', 'Las tres ramas del gobierno de EE. UU.', 'Quién hace las leyes, quién las aplica y quién las interpreta.', [['sheild', 800, 90, 310], ['star', 780, 410, 200], ['key', 1000, 430, 200]],
        'Portada. Tema típico de educación cívica (civics) en secundaria.'),
      tiles(T, 'Tres ramas, tres tareas', [['file-text', 'Legislativa', 'El Congreso hace las leyes'], ['flag', 'Ejecutiva', 'El presidente las aplica'], ['sheild', 'Judicial', 'Los tribunales las interpretan']],
        'Ninguna rama manda sola: así se evita el abuso de poder.', 'Separación de poderes establecida en los tres primeros artículos de la Constitución.'),
      table(T, 'El Congreso', [['', 'Senado', 'Cámara de Representantes'], ['Miembros', '100', '435'], ['Mandato', '6 años', '2 años'], ['Edad mínima', '30 años', '25 años'], ['Cuántos por estado', '2', 'Según población']],
        'file-text', 'Para aprobar una ley, las dos cámaras deben estar de acuerdo.', 'Datos del Congreso de EE. UU. Verificar si cambian.', { table: { fontSize: 21 } }),
      bullets(T, 'La rama ejecutiva', ['El <b>presidente</b> dirige el país y las Fuerzas Armadas.', 'El <b>vicepresidente</b> lo sustituye si falta.', 'El <b>gabinete</b> dirige los departamentos.', 'Mandato de cuatro años, con un máximo de dos mandatos.'], 'flag',
        'Límite de dos mandatos: Enmienda 22.'),
      bullets(T, 'La rama judicial', ['El <b>Tribunal Supremo</b> tiene nueve jueces.', 'Los jueces federales son nombrados por el presidente y confirmados por el Senado.', 'Pueden declarar que una ley es contraria a la Constitución.', 'Los jueces federales tienen cargo vitalicio.'], 'sheild',
        'Revisión judicial desde Marbury contra Madison (1803).'),
      table(T, 'Frenos y contrapesos', [['Quién', 'Puede frenar a…', 'Cómo'], ['El presidente', 'El Congreso', 'Vetando una ley'], ['El Congreso', 'El presidente', 'Anulando el veto con dos tercios'], ['El Tribunal Supremo', 'Las otras ramas', 'Declarando algo inconstitucional'], ['El Senado', 'El presidente', 'Confirmando nombramientos']],
        'lock', 'Cada rama controla a las otras dos.', 'Ejemplos habituales de checks and balances.', { w: 840, table: { fontSize: 20 } }),
      quiz(T, '¿Qué rama del gobierno hace las leyes?', ['La ejecutiva', 'La judicial', 'La legislativa', 'Ninguna'], 2, 'Respuesta: la legislativa, es decir, el Congreso.'),
      close(T, 'Poder repartido', 'Separar los poderes protege las libertades de todos.', [['sheild', 800, 120, 300], ['key', 1000, 400, 190], ['flag', 780, 400, 190]], 'Cierre.')]); } },

  // 5 · How a bill becomes a law
  edu_us_bill: { name: 'Cómo se aprueba una ley en EE. UU.', cat: 'edu',
    summary: 'El camino de un proyecto de ley en Estados Unidos paso a paso: idea, comité, votación en cada cámara, firma o veto del presidente y cómo se anula un veto; con una actividad para escribir tu propio proyecto',
    make: () => { const T = CIVIC; return deck('Cómo se aprueba una ley en EE. UU.', T, [
      cover(T, 'EDUCACIÓN CÍVICA', 'Cómo se aprueba una ley en EE. UU.', 'De una idea a la firma del presidente.', [['file-text', 800, 90, 310], ['pencil', 780, 410, 200], ['tick', 1000, 430, 200]],
        'Portada. Es el clásico «How a bill becomes a law» de la clase de civics.'),
      steps(T, 'Cuatro pasos hasta la ley', [['bulb', '1 · Idea', 'Un congresista presenta un proyecto'], ['folder', '2 · Comité', 'Se estudia, se cambia y se vota'], ['megaphone', '3 · Pleno', 'Votan las dos cámaras'], ['flag', '4 · Presidente', 'Firma o veta']],
        'El proyecto puede morir en cualquier paso: la mayoría no llega al final.', 'Camino simplificado. Cada cámara debe aprobar el mismo texto.'),
      bullets(T, 'El comité', ['Los comités se especializan: educación, salud, defensa…', 'Celebran <b>audiencias</b> con expertos.', 'Pueden cambiar el texto (<i>enmiendas</i>).', 'Si votan a favor, pasa al pleno.'], 'folder', 'Mucho trabajo real se hace en los comités.'),
      bullets(T, 'Las dos cámaras', ['El proyecto debe aprobarse en el <b>Senado</b> y en la <b>Cámara</b>.', 'Si los textos difieren, un comité mixto los iguala.', 'Después, ambas cámaras votan la versión final.'], 'megaphone', 'Ambas cámaras deben aprobar el mismo texto.'),
      table(T, 'El presidente decide', [['Opción', 'Qué pasa'], ['Firmar', 'Es ley'], ['Vetar', 'Vuelve al Congreso'], ['No hacer nada', 'Es ley a los 10 días (sin contar domingos) si el Congreso sigue reunido'], ['Anular el veto', 'Hacen falta dos tercios en cada cámara']],
        'flag', 'Anular un veto es muy difícil.', 'Plazo de diez días sin contar domingos, y excepciones (veto de bolsillo): verificar con fuente oficial.', { w: 840, table: { fontSize: 21 } }),
      quiz(T, '¿Qué mayoría hace falta para anular un veto?', ['La mitad', 'Dos tercios de cada cámara', 'Tres cuartos', 'Unanimidad'], 1, 'Respuesta: dos tercios de cada cámara.'),
      close(T, 'Tu propio proyecto', 'Escribe un proyecto de ley para tu clase y vótalo con tus compañeros.', [['pencil', 800, 120, 300], ['tick', 1000, 400, 190], ['file-text', 780, 400, 190]], 'Actividad: simulación en clase con comité y pleno.')]); } },

  // 6 · Constitution and Bill of Rights
  edu_us_constitution: { name: 'La Constitución y la Carta de Derechos', cat: 'edu',
    summary: 'La Constitución de EE. UU. y sus diez primeras enmiendas: fecha, estructura, los derechos de la Carta de Derechos, cómo se cambia, otras enmiendas clave y un cuestionario',
    make: () => { const T = FLAG; return deck('La Constitución y la Carta de Derechos', T, [
      cover(T, '17 DE SEPTIEMBRE DE 1787', 'La Constitución y la Carta de Derechos', 'Las reglas del juego de Estados Unidos.', [['file-text', 800, 90, 310], ['sheild', 780, 410, 200], ['star', 1000, 430, 200]],
        'Portada. El Día de la Constitución se celebra el 17 de septiembre (se firmó en 1787).'),
      tiles(T, 'Lo básico', [['calender', '1787', 'Se firma en Filadelfia'], ['file-text', '7 artículos', 'Organizan el gobierno'], ['star', '27 enmiendas', 'Los cambios aprobados']],
        'Empieza con «Nosotros, el pueblo».', 'Datos básicos; verificar si cambian.'),
      table(T, 'La Carta de Derechos (1.ª–5.ª)', [['Enmienda', 'Protege'], ['1.ª', 'Religión, expresión, prensa, reunión y petición'], ['2.ª', 'Portar armas'], ['3.ª', 'No alojar soldados en casa'], ['4.ª', 'Contra registros injustificados'], ['5.ª', 'Debido proceso y no autoincriminarse']],
        'sheild', 'Las diez primeras se aprobaron en 1791.', 'Resumen simplificado; para el texto exacto usar la fuente oficial.', { table: { fontSize: 21 } }),
      table(T, 'La Carta de Derechos (6.ª–10.ª)', [['Enmienda', 'Protege'], ['6.ª', 'Juicio rápido y abogado'], ['7.ª', 'Jurado en casos civiles'], ['8.ª', 'Sin castigos crueles ni inusuales'], ['9.ª', 'Otros derechos del pueblo'], ['10.ª', 'Poderes de los estados']],
        'lock', 'Protegen a las personas frente al gobierno.', 'Resumen simplificado.', { table: { fontSize: 21 } }),
      steps(T, 'Otras enmiendas clave', [['flag', '13.ª · 1865', 'Abolió la esclavitud'], ['sheild', '14.ª · 1868', 'Igual protección ante la ley'], ['megaphone', '19.ª · 1920', 'Voto de las mujeres'], ['tick', '26.ª · 1971', 'Voto a los 18 años']],
        'Cambiarla es difícil: dos tercios del Congreso y tres cuartos de los estados.', 'Cuatro enmiendas importantes. Para cambiar la Constitución hacen falta dos tercios de ambas cámaras y la ratificación de tres cuartos de los estados.'),
      quiz(T, '¿Qué es la Carta de Derechos?', ['El preámbulo', 'Las diez primeras enmiendas', 'Un tratado', 'La Declaración de Independencia'], 1, 'Respuesta: las diez primeras enmiendas, de 1791.'),
      close(T, 'Nosotros, el pueblo', '¿Qué derecho te parece el más importante hoy y por qué?', [['star', 800, 120, 300], ['sheild', 1000, 400, 190], ['file-text', 780, 400, 190]], 'Debate de cierre.')]); } },

  // 7 · Native American Heritage Month
  edu_us_nahm: { name: 'Mes de la Herencia Nativa Americana', cat: 'edu',
    summary: 'Noviembre, Mes de la Herencia Nativa Americana, para clase y con respeto: naciones soberanas, culturas vivas, aportaciones, cómo hablar con precisión, una actividad de investigación y un cuestionario',
    make: () => { const T = EARTH; return deck('Mes de la Herencia Nativa Americana', T, [
      cover(T, 'NOVIEMBRE', 'Mes de la Herencia Nativa Americana', 'Pueblos con historia, presente y futuro.', [['sun', 800, 90, 310], ['bookmark', 780, 410, 200], ['heart', 1000, 430, 200]],
        'Portada. Noviembre es el mes de la herencia nativa americana en EE. UU. Abordar con respeto; preferir fuentes escritas por pueblos nativos.'),
      tiles(T, 'Naciones vivas', [['flag', 'Más de 570', 'Naciones tribales con reconocimiento federal'], ['mic', 'Muchas lenguas', 'Cada nación tiene la suya'], ['sun', 'Hoy', 'Comunidades, arte, ciencia y política']],
        'No es un pueblo: son muchos, y viven hoy.', 'Dato a verificar: número de tribus con reconocimiento federal, que se actualiza.'),
      bullets(T, 'Aportaciones', ['Las «tres hermanas»: <b>maíz, frijol y calabaza</b>.', 'Nombres de lugares de todo el país.', 'Los <i>code talkers</i>, como los navajos en la Segunda Guerra Mundial.', 'Arte, música y literatura de hoy.'], 'bulb',
        'Cuatro ejemplos. Evitar hablar solo del pasado.'),
      bullets(T, 'Hablar con precisión', ['Cuando se pueda, nombra la <b>nación</b> concreta.', 'Usa el <b>presente</b>, no solo el pasado.', 'Evita mascotas y disfraces.', 'Pregunta cómo prefiere llamarse cada persona.'], 'chat-bubble',
        'Consejos de lenguaje respetuoso; los pueblos nativos no son un bloque único.'),
      steps(T, 'Investigamos', [['location', 'Descubre', 'Qué pueblos vivieron en tu zona'], ['file-text', 'Lee', 'Fuentes de pueblos nativos'], ['mic', 'Escucha', 'Voces actuales'], ['pencil', 'Comparte', 'Un póster o una exposición']],
        'Usa siempre fuentes escritas por pueblos nativos.', 'Actividad de investigación en grupos.'),
      quiz(T, 'Cuando es posible, ¿cómo conviene referirse a una persona nativa?', ['Con un apodo', 'Por el nombre de su nación', 'Como «indio» a secas', 'No se debe hablar de ello'], 1, 'Respuesta: por el nombre de su nación (por ejemplo, navajo o cherokee).'),
      close(T, 'Aprender juntos', 'Sus historias son parte de la historia de todos.', [['heart', 800, 120, 300], ['sun', 1000, 400, 190], ['bookmark', 780, 400, 190]], 'Cierre.')]); } },

  // 8 · Hour of Code
  edu_us_hourofcode: { name: 'La Hora del Código', cat: 'edu',
    summary: 'Una hora para descubrir la programación en la Semana de la Educación en Ciencias de la Computación: qué es un algoritmo, bucles y condicionales, actividad sin ordenador, Grace Hopper y un cuestionario',
    make: () => { const T = TECH; return deck('La Hora del Código', T, [
      cover(T, 'SEMANA DE LA INFORMÁTICA · DICIEMBRE', 'La Hora del Código', 'Una hora para descubrir cómo se programa.', [['computer', 800, 90, 310], ['rocket', 780, 410, 200], ['bulb', 1000, 430, 200]],
        'Portada. La Hora del Código acompaña la Semana de la Educación en Ciencias de la Computación, en diciembre; comprobar las fechas del año.'),
      tiles(T, 'Tres ideas de programación', [['tool', 'Algoritmo', 'Pasos ordenados para resolver algo'], ['flash', 'Bucle', 'Repetir una acción varias veces'], ['puzzle', 'Condicional', 'Si pasa esto, hago aquello']],
        'Con estas tres ideas ya se pueden construir muchos programas.', 'Tres conceptos de pensamiento computacional.'),
      steps(T, 'Un robot hace un sándwich', [['notebook', '1 · Escribe', 'Los pasos para hacerlo'], ['target', '2 · Prueba', 'Un compañero hace de robot'], ['zoom', '3 · Depura', 'Busca qué ha fallado'], ['star', '4 · Mejora', 'Escribe los pasos mejor']],
        'Actividad sin ordenador: el robot solo hace lo que dice el papel.', 'Actividad clásica para entender que los ordenadores siguen instrucciones exactas.'),
      bullets(T, 'Un programa sencillo', ['<b>Repetir 4 veces</b>:', 'avanzar 10 pasos', 'girar a la derecha', '→ ¡Dibuja un cuadrado!'], 'computer', 'Ejemplo en pseudocódigo: un bucle que dibuja un cuadrado.'),
      bullets(T, 'Grace Hopper', ['Pionera de la computación (1906–1992).', 'Creó uno de los primeros <b>compiladores</b>.', 'Ayudó a que se programara en un lenguaje parecido al inglés.', 'Fue almirante de la Armada de EE. UU.'], 'medal', 'Datos a verificar: Grace Hopper nació el 9 de diciembre de 1906. La Semana de la Informática coincide con esa fecha.'),
      quiz(T, '¿Qué es un algoritmo?', ['Un tipo de ordenador', 'Una serie de pasos para resolver un problema', 'Un error', 'Un juego'], 1, 'Respuesta: una serie ordenada de pasos para resolver un problema.'),
      close(T, 'Sigue programando', 'Elige un reto y sigue practicando en casa.', [['rocket', 800, 120, 300], ['computer', 1000, 400, 190], ['star', 780, 400, 190]], 'Cierre.')]); } },

  // 9 · Financial literacy for teens
  edu_us_money: { name: 'Finanzas personales para adolescentes', cat: 'edu',
    summary: 'Educación financiera para secundaria en EE. UU.: la regla 50/30/20, historial de crédito y puntuación, interés compuesto, ahorro y jubilación (401(k)), con datos de ejemplo y un cuestionario',
    make: () => { const T = MONEY; return deck('Finanzas personales para adolescentes', T, [
      cover(T, 'EDUCACIÓN FINANCIERA', 'Finanzas personales para adolescentes', 'Presupuesto, crédito, interés compuesto y ahorro.', [['money-bag', 800, 90, 310], ['chart', 780, 410, 200], ['wallet', 1000, 430, 200]],
        'Portada. Las cifras de esta presentación son ejemplos. Comprobar las condiciones actuales en fuentes oficiales.'),
      slideOf(T, [heading('La regla 50/30/20'), glass('', 70, 150, 600, 470, { glass: 20 }),
        chartBlock({ x: 90, y: 170, w: 560, h: 430, chartType: 'doughnut', legend: false, labelColor: WH,
          data: [{ label: 'Necesidades', value: 50, color: '#6ee7b7' }, { label: 'Deseos', value: 30, color: '#fcd34d' }, { label: 'Ahorro', value: 20, color: '#7dd3fc' }] }),
        glass(`<b style="color:#6ee7b7">50 % Necesidades</b><br>Vivienda, comida, transporte<br><br><b style="color:#fcd34d">30 % Deseos</b><br>Ocio y caprichos<br><br><b style="color:#7dd3fc">20 % Ahorro</b><br>Y pagar deudas`, 710, 150, 500, 470, { fontSize: 26, lineHeight: 1.3 }), credit()],
        'Regla orientativa 50/30/20: es una guía, no una norma. Cada persona la adapta.'),
      table(T, 'La puntuación de crédito', [['Puntuación (FICO)', 'Se considera'], ['300–579', 'Mala'], ['580–669', 'Regular'], ['670–739', 'Buena'], ['740–799', 'Muy buena'], ['800–850', 'Excelente']],
        'card', 'Cuanto más alta, mejores condiciones al pedir un préstamo.', 'Rangos habituales de FICO (300–850); pueden variar según el modelo. Verificar.', { table: { fontSize: 22 } }),
      slideOf(T, [heading('El interés compuesto'), glass('', 70, 150, 820, 480, { glass: 20 }),
        chartBlock({ x: 90, y: 165, w: 780, h: 450, chartType: 'bar', color: '#6ee7b7', dataLabels: true, labelColor: WH, yTitle: 'Dólares', seriesName: 'Saldo',
          data: [{ label: 'Hoy', value: 1000 }, { label: '5 años', value: 1276 }, { label: '10 años', value: 1629 }, { label: '20 años', value: 2653 }, { label: '30 años', value: 4322 }] }),
        on(ico('chart', 930, 160, 270), 'fade-up'),
        glass('1.000 $ al 5 % anual crecen hasta unos <b>4.322 $</b> en 30 años.', 920, 450, 290, 170, { fontSize: 21, lineHeight: 1.3 }), credit()],
        'Ejemplo: 1.000 $ al 5 % anual compuesto: 1.276 $ a 5 años, 1.629 $ a 10, 2.653 $ a 20 y 4.322 $ a 30 (cifras redondeadas). Es un ejemplo, no una promesa de rendimiento.'),
      steps(T, 'Cuatro hábitos', [['lock', 'Fondo de emergencia', 'De tres a seis meses de gastos'], ['card', 'Deudas', 'Evitar intereses altos de tarjeta'], ['money-bag', 'Jubilación', 'Un plan 401(k) con aportación de la empresa'], ['target', 'Metas', 'Ahorrar para algo concreto']],
        'Empezar pronto es la mejor ventaja.', 'Orientaciones generales, no asesoramiento financiero. Un 401(k) es un plan de jubilación de empresa en EE. UU.'),
      quiz(T, 'En la regla 50/30/20, ¿qué parte se dedica al ahorro?', ['El 10 %', 'El 20 %', 'El 30 %', 'El 50 %'], 1, 'Respuesta: el 20 % (50 % necesidades, 30 % deseos).'),
      close(T, 'Empieza hoy', 'Haz tu presupuesto del mes con tus propios números.', [['wallet', 800, 120, 300], ['dollar', 1000, 400, 190], ['star', 780, 400, 190]], 'Actividad: presupuesto personal.')]); } },

  // 10 · College applications
  edu_us_college: { name: 'Camino a la universidad: SAT, ACT y solicitudes', cat: 'edu',
    summary: 'Guía para el último año de secundaria en EE. UU.: calendario de solicitudes, SAT frente a ACT, la ayuda federal FAFSA, becas y lista de comprobación, con fechas a verificar y un cuestionario',
    make: () => { const T = PURPLE; return deck('Camino a la universidad: SAT, ACT y solicitudes', T, [
      cover(T, 'ÚLTIMO CURSO DE SECUNDARIA', 'Camino a la universidad', 'SAT, ACT, FAFSA y solicitudes: el calendario del último año.', [['notebook', 800, 90, 310], ['target', 780, 410, 200], ['trophy', 1000, 430, 200]],
        'Portada. Las fechas límite cambian de un año y de una universidad a otra: verificar siempre en la web de cada una.'),
      table(T, 'Calendario del último año', [['Cuándo', 'Qué hacer'], ['Agosto', 'Se abre la Common App'], ['Octubre', 'Se abre la solicitud de ayuda federal (FAFSA)'], ['1 de noviembre', 'Plazo habitual de admisión anticipada'], ['Enero', 'Plazos de admisión regular'], ['1 de mayo', 'Día para decidir dónde estudiar']],
        'calender', 'Los plazos varían según la universidad.', 'Fechas habituales, no oficiales: verificar cada año y en cada universidad.', { table: { fontSize: 21 } }),
      table(T, 'SAT frente a ACT', [['', 'SAT', 'ACT'], ['Puntuación', '400–1600', '1–36'], ['Formato', 'Digital', 'En papel o en ordenador'], ['Secciones', 'Lectura y escritura, matemáticas', 'Inglés, matemáticas, lectura y ciencias'], ['Mejor si…', 'Prefieres menos tiempo por pregunta', 'Prefieres un ritmo más rápido']],
        'notebook', 'Muchas universidades ya no exigen estas pruebas.', 'Datos generales; el formato y la política de cada universidad cambian. Verificar.', { table: { fontSize: 20 } }),
      tiles(T, 'La ayuda federal (FAFSA)', [['money-bag', 'Becas', 'Ayuda que no se devuelve'], ['card', 'Préstamos', 'Dinero que hay que devolver'], ['tool', 'Trabajo', 'Empleo en el campus']],
        'Es gratis: nunca pagues por rellenarla.', 'FAFSA = Free Application for Federal Student Aid. Verificar fechas y requisitos en la web oficial del Departamento de Educación.'),
      bullets(T, 'Lista de comprobación', ['Notas y cursos avanzados (AP).', 'Cartas de recomendación.', 'Un ensayo personal con tu voz.', 'Actividades y voluntariado.', 'Becas: busca desde el principio.'], 'tick', 'Lista orientativa.'),
      quiz(T, '¿Cuál es la puntuación máxima del SAT?', ['36', '800', '1600', '2400'], 2, 'Respuesta: 1600. El ACT llega a 36.'),
      close(T, 'Tú puedes', 'Haz tu calendario personal con las fechas de tus universidades.', [['trophy', 800, 120, 300], ['target', 1000, 400, 190], ['star', 780, 400, 190]], 'Cierre.')]); } },

  // 11 · Back-to-school night
  edu_us_backtoschool: { name: 'Noche de bienvenida para familias', cat: 'edu',
    summary: 'Presentación para la Back-to-School Night o la reunión con las familias: presentación del docente, plan del curso, horario, notas y tareas, comunicación, cómo ayudar en casa y la asociación de familias (PTA)',
    make: () => { const T = SCHOOL; return deck('Noche de bienvenida para familias', T, [
      cover(T, 'BIENVENIDAS FAMILIAS', 'Noche de bienvenida', 'Un curso de aprendizaje en equipo entre la escuela y casa.', [['heart', 800, 90, 310], ['bulb', 780, 410, 200], ['star', 1000, 430, 200]],
        'Portada. Sustituir por el nombre del docente, el grupo y el curso.'),
      bullets(T, 'Quién soy', ['Mi nombre y mi grupo.', 'Mi formación y años de experiencia.', 'Por qué me encanta enseñar.', 'Cómo contactar conmigo.'], 'pencil', 'Rellenar con tus datos y una foto o dibujo.'),
      tiles(T, 'Lo que aprenderemos', [['notebook', 'Lectura y escritura', 'Comprender y expresarse'], ['calculator', 'Matemáticas', 'Pensar y resolver'], ['lab', 'Ciencias y sociales', 'Preguntar y descubrir']],
        'Cada trimestre incluye un proyecto.', 'Adaptar a la materia y a los estándares del estado.'),
      table(T, 'Un día típico', [['Hora', 'Actividad'], ['8:30', 'Llegada y rutina de la mañana'], ['9:00', 'Lectura y escritura'], ['10:30', 'Matemáticas'], ['12:00', 'Almuerzo y recreo'], ['1:00', 'Ciencias o sociales']],
        'clock', 'Cada alumno recibe una copia del horario.', 'Horario de ejemplo.', { table: { fontSize: 22 } }),
      steps(T, 'Notas y tareas', [['file-text', 'Tareas', 'Unos veinte minutos al día'], ['target', 'Criterios', 'Rúbricas claras'], ['tick', 'Evaluación', 'Pruebas y proyectos'], ['mail', 'Informes', 'Notas cada trimestre']],
        'Pregúntame cuando algo no esté claro.', 'Ejemplo: sustituir por la política real.'),
      steps(T, 'Cómo comunicarnos', [['mail', 'Correo', 'Respondo en 24 horas'], ['mobile', 'Aplicación', 'Avisos y calendario'], ['chat-bubble', 'Tutorías', 'Con cita previa'], ['megaphone', 'Boletín', 'Cada semana']],
        'Ayúdame a ayudar a tu hijo o hija.', 'Sustituir por los canales reales del centro.'),
      bullets(T, 'Cómo ayudar en casa', ['Un lugar y una hora para estudiar.', 'Leer juntos cada día.', 'Hablar del colegio durante la cena.', 'Animar el esfuerzo, no solo la nota.'], 'heart', 'Consejos generales.'),
      close(T, 'Gracias por venir', '¿Preguntas? Hablamos ahora o por correo. También necesitamos voluntarios para la asociación de familias (PTA).', [['heart', 800, 120, 300], ['star', 1000, 400, 190], ['bulb', 780, 400, 190]], 'Cierre. Presentar la PTA o asociación de familias del centro.')]); } },

  // 12 · Classroom rules and procedures
  edu_us_classroom: { name: 'Normas y rutinas de clase', cat: 'edu',
    summary: 'Normas y rutinas para el aula de primaria o secundaria en EE. UU.: valores comunes, entrada y salida, cómo pedir ayuda, simulacros de seguridad, consecuencias y reconocimientos; se adapta a cualquier grupo',
    make: () => { const T = SCHOOL; return deck('Normas y rutinas de clase', T, [
      cover(T, 'EMPEZAMOS BIEN', 'Normas y rutinas de clase', 'Lo que esperamos de todos y cómo nos ayudamos.', [['sheild', 800, 90, 310], ['heart', 780, 410, 200], ['puzzle', 1000, 430, 200]],
        'Portada. Presentar las normas con el grupo y, mejor, construirlas juntos.'),
      tiles(T, 'Nuestras tres normas', [['heart', 'Sé respetuoso', 'Con las personas y las cosas'], ['tick', 'Sé responsable', 'Haz tu parte'], ['bulb', 'Sé curioso', 'Pregunta y aprende']],
        'Tres normas fáciles de recordar.', 'Normas de ejemplo (estilo PBIS). Adaptar al grupo.'),
      steps(T, 'Entrar y salir', [['clock', '1 · Entra', 'Saluda y deja tus cosas'], ['pencil', '2 · Empieza', 'Haz la tarea de la pizarra'], ['notebook', '3 · Trabaja', 'Atiende y participa'], ['bag', '4 · Recoge', 'Ordena y espera la señal']],
        'Una rutina clara ahorra tiempo para aprender.', 'Rutinas de ejemplo.'),
      bullets(T, 'Cómo pedir ayuda', ['Primero, <b>revisa tus apuntes</b>.', 'Pregunta a un compañero.', 'Levanta la mano.', 'Usa el pase para salir del aula.'], 'chat-bubble', 'Ejemplo de la secuencia «tres antes que yo».'),
      bullets(T, 'Simulacros de seguridad', ['<b>Simulacro de incendio</b>: salimos en fila.', '<b>Simulacro de encierro</b>: silencio y sigo las instrucciones.', '<b>Simulacro de tornado o terremoto</b>, según el estado.', 'Mantengo la calma y escucho al docente.'], 'sheild',
        'Los simulacros varían por estado y centro: seguir el protocolo oficial de la escuela. Tratar con tranquilidad y adaptar a la edad.'),
      steps(T, 'Si hay un problema', [['chat-bubble', '1 · Aviso', 'Un recordatorio amable'], ['clock', '2 · Pausa', 'Un momento para calmarse'], ['pencil', '3 · Charla', 'Hablamos en privado'], ['mail', '4 · Familia', 'Avisamos a casa']],
        'Las consecuencias enseñan, no humillan.', 'Escalera de ejemplo; sustituir por la política del centro.'),
      quiz(T, 'Quieres ayuda en clase. ¿Qué haces primero?', ['Grito', 'Levanto la mano o pregunto con respeto', 'Me voy', 'Espero sin decir nada'], 1, 'Respuesta: levantar la mano o preguntar con respeto.'),
      close(T, 'Somos un equipo', 'Firmamos juntos el compromiso de clase.', [['star', 800, 120, 300], ['heart', 1000, 400, 190], ['trophy', 780, 400, 190]], 'Cierre: firmar un cartel de compromiso.')]); } },
};
