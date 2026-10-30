// Example presentations: Actualidad (3). Temas concretos que se buscan en las próximas semanas: Navidad (tradiciones y consumo),
// Nochevieja y propósitos, Reyes Magos y Papá Noel, el 25N, la Constitución y los puentes de diciembre, la cuesta de enero y la IA
// en el aula. Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Iconos 3D (3dicons.co, CC0: assets/icons3d/<id>.webp) sobre luces suaves y paneles de cristal (`glass`). Todo el texto va en
// bloques, para poder traducirlo. Las cifras que cambian con el tiempo o que conviene comprobar van avisadas en las notas del
// orador y en la última diapositiva de cada una («Antes de presentarla: comprueba esto»). Los números de ejemplo lo dicen.

import { build, text, shape, ul, A, withAnims, numbered, glow, chartBlock, tableBlock, pollBlock, timer, base, deep } from './kit.js';

const AI = new URL('../../../../assets/icons3d/', import.meta.url).href;
const FF = { head: "'Space Grotesk', sans-serif" };
const ico = (id, x, y, s, alt, props = {}) => ({ ...base(x, y, s, s), type: 'image', src: `${AI}${id}.webp`, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const seq = (b, i, effect = 'fade-up') => on(b, effect, { start: i ? 'afterPrev' : 'click' });

// A theme: dark or light ground, three lights behind the glass, the ink, the secondary ink and four accent colours.
const DARK = (bg, l, acc, cols) => ({ dark: true, bg, l, ink: '#ffffff', soft: '#d6d3ee', acc, cols, head: 'rgba(255,255,255,0.22)', headFg: '#ffffff',
  panel: 'rgba(255,255,255,0.10)', edge: 'rgba(255,255,255,0.38)', line: 'rgba(255,255,255,0.30)', band: '#ffffff', op: [80, 62, 48] });
const LIGHT = (bg, l, ink, soft, acc, cols) => ({ dark: false, bg, l, ink, soft, acc, cols, head: acc, headFg: '#ffffff',
  panel: 'rgba(255,255,255,0.68)', edge: 'rgba(20,30,50,0.16)', line: 'rgba(20,30,50,0.22)', band: ink, op: [34, 28, 22] });

const lights = T => [glow(-160, -180, 640, T.l[0], T.bg, T.op[0]), glow(760, 330, 700, T.l[1], T.bg, T.op[1]), glow(470, -260, 520, T.l[2], T.bg, T.op[2])];
const glass = (T, html, x, y, w, h, props = {}) => text(html, x, y, w, h, { bg: T.panel, borderColor: T.edge, borderWidth: 1.5, radius: 24,
  pad: [20, 26, 20, 26], glass: 18, color: T.ink, fontSize: 26, ...props });
const heading = (T, t) => text(t, 70, 34, 1140, 100, { fontSize: 42, fontWeight: 800, color: T.ink, fontFamily: FF.head, lineHeight: 1.08 });
const label = (T, t, x, y, w) => text(t, x, y, w, 30, { fontSize: 20, letterSpacing: 3, fontWeight: 700, color: T.dark ? T.acc : deep(T.acc, '#ffffff') });
const note = (T, t, y = 612, x = 70, w = 1140) => text(t, x, y, w, 60, { fontSize: 20, color: T.soft, lineHeight: 1.3 });
const credit = T => text('Iconos 3D: 3dicons.co · Vijay Verma (CC0)', 70, 678, 520, 28, { fontSize: 15, color: T.soft, letterSpacing: 1 });
const slideOf = (T, extra, notes, o = {}) => ({ layout: 'blank', bg: T.bg, back: lights(T), extra, notes, transition: 'fade', ...o });
const tc = (T, c) => (T.dark ? c : deep(c, '#ffffff'));
const tbl = (T, rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 23, header: true, headBg: T.head, headFg: T.headFg, stroke: T.line,
  banded: true, band: T.band, bandAlpha: 0.06, color: T.ink, rows, ...o });
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 34, x: 70, y: 60, w: 1140, h: 600, ...props });
const poll = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, ...props });

// ---- Slides -----------------------------------------------------------------------
// The cover: a glass panel with the kicker, the title and a line, and 3D icons at the right.
const cover = (T, kicker, title, sub, icons, notes, fs = 54) => slideOf(T, [
  glass(T, '', 70, 130, 700, 440, { glass: 22 }), label(T, kicker, 110, 172, 620),
  text(title, 104, 214, 640, 210, { fontSize: fs, fontWeight: 800, color: T.ink, lineHeight: 1.05, fontFamily: FF.head }),
  text(sub, 110, 430, 620, 130, { fontSize: 25, color: T.soft, lineHeight: 1.35 }),
  ...icons.map(([id, alt, x, y, s], i) => on(ico(id, x, y, s, alt), i ? 'zoom-in' : 'fade-up', { start: 'afterPrev' })), credit(T)], notes);   // (on their own when the cover appears: the cover's picture on the website shows them)

// Three or four cards: a 3D icon over a title and a line, on glass.
const cards = (T, title, items, notes, foot) => { const n = items.length, w = n === 4 ? 262 : 360, gap = (1140 - n * w) / (n - 1), big = n === 4 ? 140 : 190;
  return slideOf(T, [heading(T, title), ...items.flatMap(([id, alt, t, d], i) => { const x = 70 + i * (w + gap);
    return [seq(glass(T, `<div style="text-align:center"><b style="font-size:${n === 4 ? 28 : 31}px;color:${tc(T, T.cols[i % 4])}">${t}</b><br><span style="font-size:${n === 4 ? 22 : 24}px;color:${T.soft}">${d}</span></div>`,
      x, 270, w, 330, { vAlign: 'bottom', pad: [18, 18, 20, 18] }), i), along(ico(id, x + (w - big) / 2, 270 - big * 0.3, big, alt), 'zoom-in')]; }),
    ...(foot ? [note(T, foot, 618)] : []), credit(T)], notes); };
const along = (b, effect, props = {}) => on(b, effect, { start: 'withPrev', ...props });

// A glass panel with a list at the left and a big 3D icon at the right.
const list = (T, title, items, id, alt, notes, foot) => slideOf(T, [heading(T, title),
  glass(T, ul(...items), 70, 150, 760, foot ? 370 : 380, { fontSize: 26, lineHeight: 1.35 }),
  on(ico(id, 880, 190, 300, alt), 'zoom-in'), ...(foot ? [note(T, foot, 540, 70, 760)] : []), credit(T)], notes);

// A table on glass, with a line under it if needed.
const table = (T, title, rows, notes, o = {}) => slideOf(T, [heading(T, title),
  tbl(T, rows, 70, 150, 1140, Math.min(o.h || rows.length * 54, 440), { fontSize: o.fs || 23, ...(o.colW && { colW: o.colW }) }),
  ...(o.foot ? [note(T, o.foot, o.footY || 612)] : []), credit(T)], notes);

// A chart on glass at the left, and a text at the right.
const chart = (T, title, chartProps, side, notes) => slideOf(T, [heading(T, title), glass(T, '', 70, 150, 700, 460, { glass: 20 }),
  chartBlock({ x: 90, y: 165, w: 660, h: 430, labelColor: T.ink, ...chartProps }),
  glass(T, side, 800, 150, 410, 460, { fontSize: 24, lineHeight: 1.38, vAlign: 'middle' }), credit(T)], notes);

// A line of steps (a timeline): a point and a panel for each.
const steps = (T, title, items, notes, foot) => { const n = items.length, gap = 18, w = (1140 - gap * (n - 1)) / n, fs = n >= 5 ? 21 : n === 4 ? 23 : 26, ls = n >= 5 ? 26 : n === 4 ? 30 : 34;
  return slideOf(T, [heading(T, title), shape('rect', 70, 217, 1140, 4, T.line, { opacity: 90 }),
    ...items.flatMap(([l, d], i) => { const x = 70 + i * (w + gap);
      return [seq(glass(T, `<b style="font-size:${ls}px;color:${tc(T, T.cols[i % 4])}">${l}</b><br><span style="font-size:${fs}px;color:${T.ink}">${d}</span>`, x, 245, w, 330, { pad: [18, 16, 16, 16], fontSize: fs, lineHeight: 1.3 }), i),
        along(shape('ellipse', x + w / 2 - 11, 207, 22, 22, T.cols[i % 4]), 'zoom-in')]; }),
    ...(foot ? [note(T, foot, 600)] : []), credit(T)], notes); };

// Two or three columns, each with a coloured title and a body (a list, a line…).
const columns = (T, title, cols, notes, foot) => { const n = cols.length, gap = 24, w = (1140 - gap * (n - 1)) / n;
  return slideOf(T, [heading(T, title), ...cols.map(([c, t, body], i) => seq(glass(T, `<div style="font-size:30px;font-weight:800;color:${tc(T, c)};margin-bottom:.3em">${t}</div><div style="font-size:${n === 3 ? 23 : 25}px;color:${T.ink};line-height:1.35">${body}</div>`,
    70 + i * (w + gap), 150, w, foot ? 400 : 360, { pad: [22, 24, 18, 24], borderColor: c }), i, 'fade-up')), ...(foot ? [note(T, foot, 566)] : []), credit(T)], notes); };

const pollSlide = (T, q, opts, notes) => slideOf(T, [poll(q, opts, { color: T.ink })], notes);
const quizSlide = (T, q, opts, correct, notes) => slideOf(T, [quiz(q, opts, correct, { color: T.ink })], notes);
// The challenge: the task at the left and a timer at the right.
const reto = (T, title, body, notes, secs = 300, end = '¡Tiempo!') => slideOf(T, [heading(T, title), glass(T, body, 70, 150, 760, 400, { fontSize: 29, lineHeight: 1.4, vAlign: 'middle' }),
  timer(secs, 880, 190, 300, { color: T.acc, endText: end }), credit(T)], notes);
// What to check before using the deck: every deck ends with this slide.
const verify = (T, items, notes) => slideOf(T, [heading(T, 'Antes de presentarla: comprueba esto'), glass(T, ul(...items), 70, 150, 800, 320, { fontSize: 25, lineHeight: 1.35 }),
  on(ico('tick', 910, 170, 260, 'Una marca de verificación'), 'zoom-in'), credit(T)], notes);

export default {

  // 1 · Navidad: de dónde vienen las tradiciones.
  edu_hoy_navidad: { name: 'Navidad: tradiciones y su origen', cat: 'edu',
    summary: 'De dónde vienen el árbol, el belén, los regalos y el sorteo del 22 de diciembre: línea del tiempo, símbolos, Navidad en España y en el mundo, votación, dos preguntas y un reto para contar una tradición familiar',
    make: () => { const T = DARK('#1a0f14', ['#dc2626', '#16a34a', '#f59e0b'], '#fcd34d', ['#fca5a5', '#86efac', '#fcd34d', '#f9a8d4']);
      return numbered(build({ name: 'Navidad: tradiciones y su origen', palette: 'midnight', fonts: 'tech', title: { color: '#ffffff', size: 44 }, body: { color: '#ffffff' } }, [
        cover(T, 'NAVIDAD 2026', 'Navidad: tradiciones y su origen', 'De dónde vienen el árbol, el belén, los regalos y el sorteo del 22 de diciembre.',
          [['gift', 'Un regalo', 810, 80, 320], ['star', 'Una estrella', 770, 390, 200], ['heart', 'Un corazón', 1000, 420, 200]],
          'Portada. Cinco minutos para saber por qué hacemos lo que hacemos en Navidad. Material para ESO, Bachillerato y FP, neutral en lo religioso: se explica el origen de cada costumbre, sin entrar en creencias.'),
        steps(T, 'Una fiesta con mucha historia', [['17–23 dic.', 'Los romanos celebran las Saturnales con banquetes y regalos.'], ['Año 336', 'Primera mención conocida de la Natividad el 25 de diciembre, en Roma.'],
          ['1223', 'San Francisco de Asís monta un belén viviente en Greccio (Italia).'], ['1812', 'Primer Sorteo de Navidad, celebrado en Cádiz.'], ['Siglo XIX', 'El árbol de Navidad se extiende por Europa desde Alemania.']],
          'Pulsar para ir revelando cada hito. Son fechas de referencia: para la del 336 y la de 1812, comprueba una fuente fiable (por ejemplo, una enciclopedia o Loterías y Apuestas del Estado) y ajusta si tu centro usa otra.'),
        cards(T, 'Símbolos y de dónde vienen', [['bulb', 'Una bombilla', 'Las luces', 'Luz en el día más corto del año'], ['star', 'Una estrella', 'La estrella', 'Recuerda la estrella de los Reyes Magos'],
          ['gift', 'Un regalo', 'Los regalos', 'Vienen de las Saturnales y de San Nicolás'], ['tea-cup', 'Una taza', 'La mesa', 'Compartir cena en familia en Nochebuena']],
          'Cada tarjeta tiene su icono 3D. Pedir al alumnado que añada un símbolo que falte (el belén, el turrón, los villancicos) y busque de dónde viene.'),
        table(T, 'Navidad en España, región a región', [['Dónde', 'Tradición'], ['Cataluña', 'El Tió de Nadal «caga» regalos y el caganer sale en el belén'], ['País Vasco y Navarra', 'Olentzero, el carbonero que trae regalos'],
          ['Toda España', 'Nochebuena, Misa del Gallo y Sorteo de Navidad el 22 de diciembre'], ['Toda España', 'Los Reyes Magos el 5 y 6 de enero']],
          'Ejemplos conocidos; hay muchos más en cada comunidad. Invitar al alumnado a aportar las de su pueblo o su familia.', { colW: [2, 5] }),
        table(T, 'Navidad en el mundo', [['País', 'Tradición'], ['México', 'Las posadas, del 16 al 24 de diciembre'], ['Países Bajos', 'Sinterklaas llega el 5 de diciembre'], ['Italia', 'La Befana trae regalos el 6 de enero'],
          ['Filipinas', 'La temporada navideña empieza en septiembre'], ['Alemania', 'Mercados de Navidad durante el Adviento'], ['Australia', 'Se celebra en pleno verano']],
          'Buscar cada país en un mapa. Comprobar las fechas de las posadas y de Sinterklaas si se quiere precisión.', { colW: [2, 5] }),
        pollSlide(T, '¿Cuál es tu tradición favorita?', ['La cena de Nochebuena', 'Montar el belén o el árbol', 'Los regalos', 'El sorteo de Navidad', 'Los villancicos'],
          'Votación. Pedir a cada persona que justifique su elección en una frase.'),
        quizSlide(T, '¿Quién montó el primer belén viviente conocido?', ['San Francisco de Asís', 'Carlos III', 'Santa Claus', 'Martín Lutero'], 0,
          'Respuesta: San Francisco de Asís, en Greccio, en 1223. Carlos III popularizó los belenes en España, pero no fue el primero.'),
        quizSlide(T, '¿En qué ciudad se celebró el primer Sorteo de Navidad?', ['Cádiz', 'Madrid', 'Sevilla', 'Barcelona'], 0,
          'Respuesta: Cádiz, en 1812, durante las Cortes. Comprobar la fecha en la web de Loterías y Apuestas del Estado.'),
        reto(T, 'Reto: mi tradición familiar', 'Pregunta en casa por una tradición de Navidad: de dónde viene y desde cuándo se hace. Prepara una diapositiva con una foto o un dibujo.',
          'Reto de cinco minutos para empezar a pensar el trabajo. Respetar que no todas las familias celebran la Navidad: se puede elegir otra celebración de invierno.', 300, '¡A contar!'),
        verify(T, ['Las fechas de las diapositivas 2 y 8 (año 336 y año 1812).', 'Las costumbres de tu comunidad y de las familias de tu clase.', 'Que nadie quede fuera: ofrece celebraciones de otras culturas y religiones.'],
          'Esta lista resume lo que conviene revisar antes de usar la presentación en clase.'),
      ]));
    } },

  // 2 · Navidad sin agobios: consumo y ahorro.
  edu_hoy_navidad_ahorro: { name: 'Navidad sin agobios: consumo y ahorro', cat: 'edu',
    summary: 'Cómo hacer un presupuesto navideño, ahorrar durante el año, calcular descuentos, distinguir una oferta real de una trampa y pensar en las probabilidades del sorteo: tarjetas, gráfico, tablas con cuentas, comparación, votación, pregunta y un reto',
    make: () => { const T = DARK('#08201c', ['#14b8a6', '#f59e0b', '#ec4899'], '#5eead4', ['#5eead4', '#fcd34d', '#f9a8d4', '#93c5fd']);
      return numbered(build({ name: 'Navidad sin agobios: consumo y ahorro', palette: 'midnight', fonts: 'tech', title: { color: '#ffffff', size: 44 }, body: { color: '#ffffff' } }, [
        cover(T, 'CONSUMO Y AHORRO', 'Navidad sin agobios', 'Cómo hacer un presupuesto, comparar precios y no caer en las trampas de las ofertas.',
          [['wallet', 'Una cartera', 800, 70, 320], ['euro', 'Una moneda de euro', 780, 400, 200], ['bag', 'Una bolsa de la compra', 1000, 420, 200]],
          'Portada. Tema de consumo responsable para ESO, Bachillerato y FP: economía personal, matemáticas y pensamiento crítico ante la publicidad.'),
        cards(T, 'Antes de gastar', [['calculator', 'Una calculadora', 'Presupuesto', 'Fija un tope total y otro por persona'], ['notebook', 'Un cuaderno', 'Lista', 'Anota a quién regalas y qué'],
          ['zoom-in', 'Una lupa', 'Comparar', 'Mira el precio en varias tiendas'], ['money-bag', 'Una bolsa de dinero', 'Ahorro', 'Aparta algo cada mes del año']],
          'Cuatro hábitos sencillos. Preguntar cuál hace falta primero y por qué.'),
        chart(T, 'Reparte tu presupuesto (ejemplo)', { chartType: 'doughnut', color: '#5eead4', data: [{ label: 'Regalos', value: 150, color: '#5eead4' }, { label: 'Comida y cena', value: 120, color: '#fcd34d' },
          { label: 'Decoración', value: 30, color: '#f9a8d4' }, { label: 'Desplazamientos', value: 80, color: '#93c5fd' }, { label: 'Imprevistos', value: 20, color: '#c4b5fd' }] },
          '<b>Total: 400 €</b><br><br>Cifras de ejemplo: cámbialas por las tuyas.<br>Suma: 150 + 120 + 30 + 80 + 20 = 400.',
          'Los importes son inventados para practicar. Pedir al alumnado que cambie los porcentajes según su familia y calcule cuánto sería cada parte.'),
        table(T, 'Pequeños ahorros, gran diferencia', [['Ahorro al mes', 'En 12 meses'], ['10 €', '120 €'], ['25 €', '300 €'], ['40 €', '480 €'], ['50 €', '600 €']],
          'Cuentas sencillas: cantidad mensual por doce. Preguntar cuánto habría que ahorrar al mes para tener 360 € (respuesta: 30 €).', { colW: [1, 1], foot: 'Sin intereses. Multiplica por 12.', footY: 520 }),
        columns(T, 'Oferta real o trampa', [['#86efac', 'Señales de una buena oferta', ul('El precio anterior es verdadero y se puede comprobar', 'Otras tiendas lo confirman', 'Lo necesitabas antes de verlo')],
          ['#fca5a5', 'Señales de trampa', ul('Una cuenta atrás que te mete prisa', 'Un descuento sobre un precio inflado', '«Últimas unidades» sin ninguna prueba')]],
          'La normativa europea de consumo obliga a indicar, en muchos casos, el precio más bajo de los últimos 30 días cuando se anuncia un descuento; comprueba el detalle en la web de Consumo.'),
        table(T, 'Descuentos: haz la cuenta', [['Precio inicial', 'Descuento', 'Precio final'], ['80 €', '25 %', '60 €'], ['120 €', '30 %', '84 €'], ['50 €', '20 %', '40 €'], ['200 €', '15 %', '170 €'], ['100 €', '20 % y luego 10 %', '72 €']],
          'Último caso: dos descuentos seguidos no suman 30 %. 100 € menos el 20 % son 80 €; y 80 € menos el 10 % son 72 €.', { colW: [1, 1.4, 1], foot: 'Precio final = precio inicial × (1 − descuento).', footY: 560 }),
        list(T, 'La Lotería de Navidad: ¿qué probabilidad hay?', ['Hay 100.000 números, del 00000 al 99999.', 'La probabilidad de que tu número sea el Gordo es de 1 entre 100.000: un 0,001 %.', 'Un décimo es entretenimiento, no una forma de ahorrar.', 'Compartir un número en grupo reparte el gasto y el premio.'],
          'money-bag', 'Una bolsa de dinero', 'Cálculo: 1 ÷ 100.000 = 0,00001 = 0,001 %. Comprueba el precio del décimo y los premios en la web de Loterías y Apuestas del Estado.'),
        pollSlide(T, '¿Cuánto gastas en regalos?', ['Menos de 50 €', 'Entre 50 y 150 €', 'Entre 150 y 300 €', 'Más de 300 €'], 'Votación anónima. No pedir a nadie que explique su respuesta: cada familia tiene su situación.'),
        quizSlide(T, 'Un abrigo cuesta 100 €. Lo rebajan un 20 % y luego otro 10 %. ¿Cuánto cuesta ahora?', ['72 €', '70 €', '75 €', '80 €'], 0, 'Respuesta: 72 €. 100 × 0,8 = 80 y 80 × 0,9 = 72.'),
        reto(T, 'Reto: mi presupuesto', 'Haz tu presupuesto navideño: personas, regalo y tope de cada uno. Después busca el precio en tres tiendas y calcula cuánto ahorras.',
          'Reto de cinco minutos para empezar. Se puede continuar en casa y comparar presupuestos.', 300, '¡A calcular!'),
        verify(T, ['El precio y los premios del Sorteo de Navidad del año (Loterías y Apuestas del Estado).', 'La norma de descuentos del último precio de 30 días (Consumo).', 'Que las cifras de los ejemplos no se tomen como reales: están inventadas.'],
          'Los importes de presupuesto y descuentos son ejemplos para practicar. Solo las normas y los datos del sorteo hay que comprobarlos.'),
      ]));
    } },

  // 3 · Nochevieja y propósitos que se cumplen.
  edu_hoy_nochevieja: { name: 'Nochevieja y propósitos que se cumplen', cat: 'edu',
    summary: 'Las doce uvas, cómo recibe el mundo el año nuevo por husos horarios y un método para que los propósitos duren: por qué fallan, objetivos concretos, cuánto tarda un hábito, un tablero de cuatro semanas, votación, pregunta y un reto',
    make: () => { const T = DARK('#0b1030', ['#6366f1', '#f59e0b', '#ec4899'], '#fcd34d', ['#a5b4fc', '#fcd34d', '#f9a8d4', '#86efac']);
      return numbered(build({ name: 'Nochevieja y propósitos que se cumplen', palette: 'midnight', fonts: 'tech', title: { color: '#ffffff', size: 44 }, body: { color: '#ffffff' } }, [
        cover(T, 'FIN DE AÑO', 'Nochevieja y propósitos que se cumplen', 'Las doce uvas, el cambio de año en el mundo y un método para que tus propósitos sobrevivan a febrero.',
          [['star', 'Una estrella', 810, 70, 320], ['clock', 'Un reloj', 770, 400, 200], ['trophy', 'Un trofeo', 1000, 420, 200]],
          'Portada. Dos partes: la fiesta (uvas y husos horarios) y el método (propósitos concretos y hábitos).', 50),
        cards(T, 'Las doce uvas', [['clock', 'Un reloj', 'El reloj', 'El de la Puerta del Sol, en Madrid, marca el momento'], ['star', 'Una estrella', 'Las campanadas', 'Una uva por campanada: doce deseos'],
          ['calender', 'Un calendario', 'El origen', 'Una explicación popular dice que fue en 1909; hay otras']],
          'La explicación de 1909 (un excedente de uvas en Alicante) es la más repetida, pero no la única: otra dice que la burguesía madrileña imitó una costumbre francesa. Preséntalo como «se cuenta que».'),
        table(T, 'El año nuevo llega por turnos', [['Lugar', 'Huso', 'Reciben el año a las… (hora de Madrid)'], ['Kiritimati (Kiribati)', 'UTC+14', '31 dic., 11:00'], ['Auckland (Nueva Zelanda)', 'UTC+13', '31 dic., 12:00'],
          ['Sídney (Australia)', 'UTC+11', '31 dic., 14:00'], ['Tokio (Japón)', 'UTC+9', '31 dic., 16:00'], ['Madrid (España)', 'UTC+1', '1 ene., 00:00'], ['Las Palmas (Canarias)', 'UTC+0', '1 ene., 01:00'],
          ['Nueva York (EE. UU.)', 'UTC−5', '1 ene., 06:00'], ['Honolulú (EE. UU.)', 'UTC−10', '1 ene., 11:00'], ['Pago Pago (Samoa Americana)', 'UTC−11', '1 ene., 12:00']],
          'Husos de invierno (en Auckland y Sídney ya es horario de verano). Comprobar los husos en timeanddate.com si se quiere precisión. Cálculo: diferencia con Madrid en horas.', { colW: [3, 1.2, 2.6], fs: 21, h: 450 }),
        list(T, 'Por qué fallan los propósitos', ['Son demasiado vagos: «ponerme en forma».', 'Quieren cambiar todo a la vez.', 'Dependen solo de la fuerza de voluntad.', 'No hay un plan para los días malos.'],
          'target', 'Una diana', 'Cuatro causas habituales. Pedir al alumnado que piense un propósito suyo que haya fallado y a cuál de las cuatro se parece.'),
        steps(T, 'Un propósito bien planteado', [['Específico', 'Qué quiero hacer, exactamente'], ['Medible', 'Cómo sabré que avanzo'], ['Alcanzable', 'Realista para mí'], ['Relevante', 'Me importa de verdad'], ['Con fecha', 'Cuándo empiezo y cuándo lo revisaré']],
          'Es el método SMART (en inglés: Specific, Measurable, Achievable, Relevant, Time-bound) adaptado. Cinco preguntas para convertir un deseo en un plan.'),
        table(T, 'Del propósito vago al concreto', [['Propósito vago', 'Propósito concreto'], ['Hacer más deporte', 'Caminar 30 minutos los lunes, miércoles y viernes'], ['Ahorrar', 'Apartar 50 € el día 1 de cada mes'],
          ['Leer más', 'Leer 15 minutos antes de dormir'], ['Comer mejor', 'Tomar fruta de postre cinco días a la semana']],
          'Ejercicio: reescribir tres propósitos vagos del alumnado en forma concreta.', { colW: [2, 3.4] }),
        cards(T, '¿Cuánto tarda en formarse un hábito?', [['rocket', 'Un cohete', '18 días', 'El caso más rápido del estudio'], ['target', 'Una diana', '66 días', 'El valor central (mediana)'], ['calender', 'Un calendario', '254 días', 'El caso más lento']],
          'Estudio de Lally y colaboradores (University College London, 2009) con 96 personas: el tiempo medio fue de 66 días y variaba mucho de una persona a otra. Comprobar la referencia antes de citarla.', 'Es un mito que sean 21 días: depende de la persona y del hábito.'),
        table(T, 'Tablero de cuatro semanas', [['Semana', 'L', 'M', 'X', 'J', 'V', 'S', 'D'], ['1', '☐', '☐', '☐', '☐', '☐', '☐', '☐'], ['2', '☐', '☐', '☐', '☐', '☐', '☐', '☐'], ['3', '☐', '☐', '☐', '☐', '☐', '☐', '☐'], ['4', '☐', '☐', '☐', '☐', '☐', '☐', '☐']],
          'Para imprimir o copiar. Marcar cada día que se cumple el propósito. Si se falla un día, no pasa nada: lo importante es no fallar dos seguidos.', { colW: [2, 1, 1, 1, 1, 1, 1, 1], h: 300 }),
        pollSlide(T, '¿Cuál es tu propósito para 2027?', ['Hacer más deporte', 'Ahorrar', 'Estudiar mejor', 'Dormir más'], 'Votación. Después, que cada persona lo reescriba con el método de la diapositiva 5.'),
        quizSlide(T, '¿Cuál es un propósito bien planteado?', ['Caminar 30 minutos tres días por semana', 'Ponerme en forma', 'Ser mejor persona', 'Ahorrar mucho'], 0, 'Respuesta: el primero, porque es específico, medible y tiene frecuencia.'),
        reto(T, 'Reto: mi propósito concreto', 'Escribe un propósito con el método: qué, cuánto, cuándo y cómo sabrás que lo cumples. Compártelo con un compañero o una compañera.',
          'Cinco minutos. Que lo lean en voz alta y su pareja compruebe si cumple las cinco preguntas.', 300, '¡Tiempo!'),
        verify(T, ['La referencia del estudio de los 66 días (Lally y colaboradores, 2009).', 'Los husos horarios y los horarios de verano antes de la fecha.', 'La explicación de las uvas: preséntala como una de las posibles.'],
          'Lo más delicado de la presentación es la fecha de las uvas y los husos. El resto son ejercicios.'),
      ]));
    } },

  // 4 · Reyes Magos y Papá Noel.
  edu_hoy_reyes: { name: 'Reyes Magos y Papá Noel', cat: 'edu',
    summary: 'Quién trae los regalos en cada país y de dónde vienen estas historias: San Nicolás y los Reyes Magos en la historia, comparación entre tradiciones, el roscón, votación, dos preguntas y un reto de entrevista',
    make: () => { const T = DARK('#150f2e', ['#7c3aed', '#f59e0b', '#ef4444'], '#fcd34d', ['#c4b5fd', '#fcd34d', '#fca5a5', '#86efac']);
      return numbered(build({ name: 'Reyes Magos y Papá Noel', palette: 'midnight', fonts: 'tech', title: { color: '#ffffff', size: 44 }, body: { color: '#ffffff' } }, [
        cover(T, '25 DE DICIEMBRE · 6 DE ENERO', 'Reyes Magos y Papá Noel', 'Quién trae los regalos en cada país, de dónde vienen estas historias y qué tienen en común.',
          [['crown', 'Una corona', 810, 70, 320], ['gift', 'Un regalo', 770, 400, 200], ['star', 'Una estrella', 1000, 420, 200]],
          'Portada. Tema cultural e histórico. Se cuentan las dos tradiciones con el mismo respeto, sin entrar en creencias.'),
        steps(T, 'De obispo a Papá Noel', [['Siglo IV', 'San Nicolás, obispo de Myra (hoy Turquía), famoso por su generosidad.'], ['5 de dic.', 'En los Países Bajos, Sinterklaas reparte regalos esa noche.'],
          ['Siglo XIX', 'En Estados Unidos nace Santa Claus; el dibujante Thomas Nast fija su imagen.'], ['1931', 'Un anuncio de refrescos populariza el traje rojo, que ya existía.']],
          'Resumen de una evolución larga. Las fechas del siglo IV y del siglo XIX son aproximadas; comprobar los detalles de Nast y del anuncio de 1931 en una enciclopedia.'),
        steps(T, 'Los Reyes Magos', [['El Evangelio', 'Habla de «magos de Oriente» que siguen una estrella. No dice cuántos eran ni que fueran reyes.'], ['Tres regalos', 'Oro, incienso y mirra: de ahí la tradición de que fueran tres.'],
          ['Los nombres', 'Siglos después aparecen Melchor, Gaspar y Baltasar.'], ['Hoy', 'Cabalgatas el 5 de enero y regalos la mañana del 6.']],
          'El Evangelio de Mateo habla de «magos» sin decir su número. La tradición de tres reyes y sus nombres es posterior. Presentarlo como historia de la tradición.'),
        table(T, 'Papá Noel y los Reyes, frente a frente', [['', 'Papá Noel', 'Reyes Magos'], ['Cuándo', 'Noche del 24 al 25 de diciembre', 'Noche del 5 al 6 de enero'], ['Cómo llegan', 'En trineo, por la chimenea', 'En camello, con cabalgata'],
          ['Qué se deja', 'Leche y galletas (en EE. UU.)', 'Zapatos, agua y comida para los camellos']], 'Comparar sin tomar partido. Muchas familias celebran las dos.', { colW: [1.2, 2.4, 2.4] }),
        table(T, 'Quién trae los regalos en el mundo', [['Lugar', 'Quién los trae'], ['Países Bajos', 'Sinterklaas (5-6 de diciembre)'], ['Italia', 'La Befana (6 de enero)'], ['País Vasco', 'Olentzero (24 de diciembre)'],
          ['Cataluña', 'El Tió de Nadal y los Reyes Magos'], ['Estados Unidos', 'Santa Claus (25 de diciembre)'], ['Rusia', 'Ded Moroz, el Abuelo Frío (Año Nuevo)']],
          'Ubicar cada uno en un mapa. Las fechas pueden variar según la zona; comprobar si se quiere precisión.', { colW: [2, 4] }),
        cards(T, 'El roscón de Reyes', [['crown', 'Una corona', 'La forma', 'Una corona, como la de los reyes'], ['gift', 'Un regalo', 'La sorpresa', 'Esconde un haba y una figurita'], ['tea-cup', 'Una taza', 'El relleno', 'Con nata, crema, trufa o sin nada']],
          'El haba suele significar que quien la encuentra paga el roscón; la figurita, que es el «rey» o la «reina» del día. Hay variantes según la zona.'),
        pollSlide(T, '¿Quién te trae los regalos en tu casa?', ['Papá Noel', 'Los Reyes Magos', 'Los dos', 'Otra persona o tradición'], 'Votación. Hay familias que celebran de otra manera: recibir cualquier respuesta con naturalidad.'),
        quizSlide(T, '¿Cuántos Reyes Magos nombra el Evangelio de Mateo?', ['Ninguno: habla de «magos» sin decir cuántos', 'Tres', 'Dos', 'Siete'], 0,
          'Respuesta: ninguno. Habla de «magos de Oriente» sin decir su número. Lo de tres viene de los tres regalos.'),
        quizSlide(T, '¿Qué obispo inspiró al Papá Noel actual?', ['San Nicolás de Myra', 'San Francisco', 'San Jorge', 'San Valentín'], 0, 'Respuesta: San Nicolás de Myra, del siglo IV, en lo que hoy es Turquía.'),
        reto(T, 'Reto: entrevista', 'Pregunta a una persona mayor cómo vivía la Navidad y los Reyes de niña o de niño: qué recibía, quién traía los regalos y qué comían. Compara con hoy.',
          'Cinco minutos para preparar las preguntas. La entrevista se hace en casa y se comparte en clase.', 300, '¡A preguntar!'),
        verify(T, ['Las fechas del siglo IV y del siglo XIX, y lo de 1931.', 'Las tradiciones de tu región y las de las familias de tu clase.', 'Que nadie quede fuera si su familia no celebra estas fiestas.'],
          'Material cultural: lo único que conviene verificar son las fechas aproximadas del historial.'),
      ]));
    } },

  // 5 · 25N: contra la violencia hacia las mujeres.
  edu_hoy_25n: { name: '25N: contra la violencia hacia las mujeres', cat: 'edu',
    summary: 'Una sesión del 25 de noviembre con cuidado: por qué se conmemora, formas de violencia, señales de alerta, mitos y realidades, qué hacer, cómo acompañar, recursos (016, 112), datos oficiales por rellenar, una pregunta, una votación y un reto de manifiesto',
    make: () => { const T = LIGHT('#f6f0ff', ['#8b5cf6', '#ec4899', '#38bdf8'], '#2b1450', '#5b4a7a', '#6d28d9', ['#6d28d9', '#be185d', '#0f766e', '#b45309']);
      return numbered(build({ name: '25N: contra la violencia hacia las mujeres', palette: 'lavanda', fonts: 'modern', title: { color: '#2b1450', size: 44 }, body: { color: '#2b1450' } }, [
        cover(T, '25 DE NOVIEMBRE', '25N: contra la violencia hacia las mujeres', 'Qué es, cómo se reconoce, qué hacer y adónde acudir. Información para ayudar y para pedir ayuda.',
          [['heart', 'Un corazón', 810, 70, 320], ['megaphone', 'Un megáfono', 770, 400, 200], ['sheild', 'Un escudo', 1000, 420, 200]],
          'Portada. Antes de la sesión, hablar con el equipo de orientación o el tutor: puede haber alumnado afectado. Ofrecer siempre una vía para hablar en privado. Usar un tono sereno, sin imágenes duras.', 46),
        steps(T, 'Por qué el 25 de noviembre', [['1960', 'Las hermanas Mirabal (Patria, Minerva y María Teresa) son asesinadas por la dictadura de Trujillo, en la República Dominicana.'],
          ['1999', 'La ONU declara el 25 de noviembre día internacional (resolución 54/134).'], ['Hoy', 'Se conmemora con actos, manifiestos y campañas en todo el mundo.']],
          'La fecha recuerda a las hermanas Mirabal. La resolución de la ONU es del 17 de diciembre de 1999. Comprobar los datos en la web de Naciones Unidas.'),
        cards(T, 'Formas de violencia', [['heart', 'Un corazón', 'Física', 'Golpes, empujones, agresiones'], ['chat-bubble', 'Un bocadillo de diálogo', 'Psicológica', 'Insultos, humillaciones, amenazas'],
          ['lock', 'Un candado', 'Sexual', 'Cualquier acto sin consentimiento'], ['mobile', 'Un móvil', 'Económica y digital', 'Control del dinero, del móvil y de las redes']],
          'Las formas se pueden dar a la vez. Recordar que la violencia psicológica y digital también es violencia, aunque no deje marcas.'),
        list(T, 'Señales de alerta en una relación', ['Controla con quién hablas y qué haces.', 'Revisa tu móvil o tus redes.', 'Te aísla de amigas, amigos y familia.', 'Te humilla o se burla en público.', 'Te hace sentir culpable de todo.'],
          'flag', 'Una bandera', 'Una sola señal no lo demuestra, pero varias juntas son motivo para pedir ayuda.', 'Mejor hablar de «señales» que de «tipos de personas»: lo importante es la conducta, no etiquetar.'),
        table(T, 'Mitos y realidades', [['Mito', 'Realidad'], ['«Es un problema privado»', 'Es un problema social que nos afecta a todos'], ['«Solo pasa en ciertos ambientes»', 'Ocurre en cualquier edad, clase social y país'],
          ['«Si fuera grave, se iría»', 'Salir de una relación violenta es difícil y peligroso'], ['«Los celos son una prueba de amor»', 'Los celos y el control no son amor']],
          'Cuatro mitos frecuentes. Pedir al alumnado que aporte otros que haya oído y los contraste.', { colW: [2.4, 3.4] }),
        steps(T, 'Si estás sufriendo violencia', [['1', 'Busca un lugar seguro. Tu seguridad es lo primero.'], ['2', 'Pide ayuda: llama al 016, o al 112 si hay peligro inmediato.'], ['3', 'Guarda pruebas: mensajes, fotos, partes médicos.'], ['4', 'Cuéntalo a alguien de confianza.']],
          'Los pasos pueden hacerse en otro orden. Lo esencial es no estar a solas. Comprobar los teléfonos en la web del Ministerio de Igualdad antes de presentar.'),
        columns(T, 'Si alguien te lo cuenta', [['#0f766e', 'Qué hacer', ul('Escucha sin juzgar', 'Cree lo que cuenta y dile que no es culpa suya', 'Ofrece información y acompaña')],
          ['#b91c1c', 'Qué no hacer', ul('No exijas que lo deje ya', 'No culpes ni le quites importancia', 'No te enfrentes tú solo al agresor')]],
          'Acompañar no es resolver: es estar y facilitar que la persona llegue a los recursos. Si hay peligro, llamar al 112.'),
        cards(T, 'Recursos en España', [['mobile', 'Un móvil', '016', 'Atención a víctimas de violencia de género. Gratuito, 24 horas y confidencial'], ['megaphone', 'Un megáfono', '112', 'Emergencias: si hay peligro inmediato'],
          ['heart', 'Un corazón', '900 20 20 10', 'ANAR: ayuda a niñas, niños y adolescentes']],
          'Comprobar los teléfonos en las webs oficiales antes de presentar (Ministerio de Igualdad, Fundación ANAR). El 016 no aparece en la factura, pero puede quedar en el registro del teléfono: conviene saber cómo borrarlo. También existe un correo y un WhatsApp del 016; consúltalos en la web del Ministerio.'),
        cards(T, 'Datos oficiales: complétalos tú', [['calender', 'Un calendario', '___', 'Mujeres asesinadas este año'], ['mobile', 'Un móvil', '___', 'Llamadas al 016 el último año'], ['sheild', 'Un escudo', '___', 'Órdenes de protección dictadas']],
          'Esta diapositiva se deja vacía a propósito: las cifras cambian cada año. Fuente: Delegación del Gobierno contra la Violencia de Género (Ministerio de Igualdad), en su portal estadístico. Anotar siempre la fecha de consulta.'),
        quizSlide(T, '¿Qué teléfono gratuito atiende a víctimas de violencia de género en España?', ['016', '091', '060', '010'], 0, 'Respuesta: el 016. El 091 es la Policía Nacional; el 060 y el 010 son de información administrativa.'),
        pollSlide(T, '¿Qué podemos hacer en el centro?', ['Un manifiesto de clase', 'Un mural', 'Una charla con una profesional', 'Una campaña en las redes del centro'], 'Votación para decidir una acción conjunta. Recoger las ideas aunque no salgan elegidas.'),
        reto(T, 'Reto: nuestro manifiesto', 'En grupos, escribid tres compromisos para una convivencia sin violencia en el centro. Leed el manifiesto el 25 de noviembre.',
          'Cinco minutos para el primer borrador. Después, unir los de todos los grupos en un solo manifiesto.', 300, '¡Tiempo!'),
        verify(T, ['Los teléfonos 016, 112 y ANAR, en las webs oficiales.', 'Los datos oficiales de la diapositiva 9, con la fecha de consulta.', 'Hablar antes con orientación y tener un protocolo por si alguien necesita ayuda.'],
          'Es un tema sensible. Preparar la sesión con el equipo de orientación y no obligar a nadie a hablar de su experiencia.'),
      ]));
    } },

  // 6 · Día de la Constitución y puentes de diciembre.
  edu_hoy_constitucion: { name: 'Día de la Constitución y puentes de diciembre', cat: 'edu',
    summary: 'Cómo se aprobó la Constitución de 1978, cómo está organizada y qué derechos reconoce, más el calendario de diciembre de 2026 y cómo calcular un puente: línea del tiempo, gráfico, tarjetas, tablas, dos preguntas, votación y un reto',
    make: () => { const T = LIGHT('#fbf3e4', ['#dc2626', '#f59e0b', '#fb923c'], '#3a1d12', '#6b4a3a', '#b91c1c', ['#b91c1c', '#b45309', '#0f766e', '#4338ca']);
      return numbered(build({ name: 'Día de la Constitución y puentes de diciembre', palette: 'paper', fonts: 'modern', title: { color: '#3a1d12', size: 44 }, body: { color: '#3a1d12' } }, [
        cover(T, '6 DE DICIEMBRE', 'Día de la Constitución y puentes de diciembre', 'Cómo se aprobó la Constitución de 1978, qué contiene y cómo calcular un puente.',
          [['flag', 'Una bandera', 810, 70, 320], ['calender', 'Un calendario', 770, 400, 200], ['sheild', 'Un escudo', 1000, 420, 200]],
          'Portada. Tema de educación cívica y matemáticas del calendario. Neutral y plural: se explican los hechos, sin valorar.', 46),
        steps(T, 'Cómo se aprobó', [['31 oct. 1978', 'Las Cortes aprueban el texto.'], ['6 dic. 1978', 'El pueblo español la ratifica en referéndum.'], ['27 dic. 1978', 'El rey la sanciona.'], ['29 dic. 1978', 'Se publica en el BOE y entra en vigor.']],
          'Fechas de referencia. Comprobarlas en la web del Congreso de los Diputados, que tiene la historia de la Constitución.'),
        chart(T, 'El referéndum del 6 de diciembre de 1978', { chartType: 'doughnut', color: '#b91c1c', data: [{ label: 'Sí (aprox.)', value: 88, color: '#b91c1c' }, { label: 'Otras respuestas (aprox.)', value: 12, color: '#d6c3a5' }] },
          'Votó que sí casi 9 de cada 10 personas que participaron. Participó aproximadamente 2 de cada 3 personas con derecho a voto.',
          'Cifras redondeadas: el resultado exacto del referéndum se consulta en la web del Congreso o del Ministerio del Interior. Pedir al alumnado que busque el dato exacto y compare.'),
        cards(T, 'Cómo está organizada', [['flag', 'Una bandera', 'Título preliminar', 'Principios básicos del Estado'], ['sheild', 'Un escudo', 'Título I', 'Derechos y deberes (arts. 10 a 55)'],
          ['crown', 'Una corona', 'Título II', 'La Corona (arts. 56 a 65)'], ['setting', 'Un engranaje', 'Títulos III a X', 'Poderes, territorio y reforma (arts. 66 a 169)']],
          'La Constitución tiene 169 artículos, un título preliminar y diez títulos. Comprobar el desglose en el texto oficial (BOE).'),
        table(T, 'Derechos que reconoce', [['Artículo', 'Derecho'], ['14', 'Igualdad ante la ley'], ['15', 'Vida e integridad'], ['16', 'Libertad ideológica y religiosa'], ['20', 'Libertad de expresión'],
          ['27', 'Educación'], ['35', 'Trabajo'], ['47', 'Vivienda digna']], 'Pedir al alumnado que lea el artículo 27 completo y diga a quién afecta. Todos los números se pueden comprobar en el texto oficial.', { colW: [1, 4], h: 420 }),
        table(T, 'Diciembre de 2026, en el calendario', [['Día', 'Fecha', 'Qué es'], ['Domingo', '6 de diciembre', 'Día de la Constitución'], ['Lunes', '7 de diciembre', '¿Puente? Depende de tu comunidad'],
          ['Martes', '8 de diciembre', 'Inmaculada Concepción'], ['Jueves', '24 de diciembre', 'Nochebuena'], ['Viernes', '25 de diciembre', 'Navidad']],
          'En 2026 el 6 de diciembre cae en domingo. Cuando un festivo cae en domingo, cada comunidad decide si lo traslada al lunes. Comprobar el calendario laboral oficial de tu comunidad en el boletín autonómico.', { colW: [1.2, 1.8, 3], foot: 'El calendario laboral oficial lo publica cada año el BOE y cada comunidad.', footY: 512 }),
        table(T, 'Calcula un puente', [['El festivo cae en…', 'El puente es…', 'Días libres seguidos'], ['Martes', 'El lunes', '4 (de sábado a martes)'], ['Jueves', 'El viernes', '4 (de jueves a domingo)'],
          ['Miércoles', 'El lunes y el martes, o el jueves y el viernes', '5 (pidiendo 2 días)'], ['Lunes o viernes', 'No hay puente', '3 sin pedir ningún día']],
          'Cuentas con el calendario. Ampliar con el calendario laboral de tu comunidad.', { colW: [1.6, 3, 2.4], foot: 'Un puente es un día laborable entre un festivo y un fin de semana.', footY: 520 }),
        quizSlide(T, 'Si el 8 de diciembre es martes, ¿cuántos días libres seguidos tienes si pides el lunes 7?', ['4 (de sábado a martes)', '3', '5', '2'], 0,
          'Respuesta: 4, de sábado 5 a martes 8. Sábado, domingo, lunes (pedido) y martes (festivo).'),
        quizSlide(T, '¿Cuántos artículos tiene la Constitución española de 1978?', ['169', '100', '200', '75'], 0, 'Respuesta: 169. Comprobar en el texto oficial del BOE.'),
        pollSlide(T, '¿Qué haces en el puente?', ['Viajar', 'Descansar en casa', 'Estudiar', 'Estar con la familia'], 'Votación. Sirve de cierre ligero.'),
        reto(T, 'Reto: redacta tu artículo', 'Escribid en grupo un artículo para una constitución de clase: un derecho y un deber. Leedlo en voz alta y votadlo.',
          'Cinco minutos. Fomentar el debate: ¿hay derechos que chocan entre sí?', 300, '¡Tiempo!'),
        verify(T, ['El calendario laboral de 2026 de tu comunidad (BOE y boletín autonómico).', 'Las cifras del referéndum (la presentación las redondea).', 'La estructura y los artículos, en el texto oficial de la Constitución.'],
          'Los datos del calendario de 2026 están calculados para el año indicado. Si se reutiliza en otro año, recalcular los días de la semana.'),
      ]));
    } },

  // 7 · La cuesta de enero: finanzas personales.
  edu_hoy_cuesta_enero: { name: 'La cuesta de enero: finanzas personales', cat: 'edu',
    summary: 'Por qué llega la cuesta de enero y cómo organizarse: la regla 50/30/20 con cuentas, gastos hormiga, interés compuesto, fondo de emergencia, trampas y mejores hábitos, con votación, pregunta y un reto de una semana de gastos',
    make: () => { const T = LIGHT('#eef7f1', ['#22c55e', '#14b8a6', '#f59e0b'], '#10301f', '#3f5f4d', '#15803d', ['#15803d', '#b45309', '#0f766e', '#be185d']);
      return numbered(build({ name: 'La cuesta de enero: finanzas personales', palette: 'salvia', fonts: 'modern', title: { color: '#10301f', size: 44 }, body: { color: '#10301f' } }, [
        cover(T, 'FINANZAS PERSONALES', 'La cuesta de enero', 'Por qué llega, cómo se organiza un presupuesto y trucos para llegar a fin de mes.',
          [['wallet', 'Una cartera', 810, 70, 320], ['calender', 'Un calendario', 770, 400, 200], ['money-bag', 'Una bolsa de dinero', 1000, 420, 200]],
          'Portada. Educación financiera básica para ESO, Bachillerato y FP, con cuentas que se pueden hacer en clase.'),
        steps(T, 'Por qué existe la cuesta de enero', [['Navidad', 'Regalos, comidas y viajes en pocas semanas.'], ['Rebajas', 'Empiezan en enero y invitan a comprar más.'],
          ['Pagos anuales', 'Seguros, cuotas y suscripciones que se cobran de golpe.'], ['Precios', 'Algunas tarifas se actualizan a principios de año.']],
          'Cuatro causas habituales. Preguntar cuál afecta más a las familias del alumnado. Comprobar qué tarifas suben en enero de este año.'),
        chart(T, 'La regla 50/30/20', { chartType: 'doughnut', color: '#15803d', data: [{ label: 'Necesidades', value: 50, color: '#15803d' }, { label: 'Deseos', value: 30, color: '#f59e0b' }, { label: 'Ahorro', value: 20, color: '#14b8a6' }] },
          '<b>50 %</b> necesidades: vivienda, comida, transporte.<br><b>30 %</b> deseos: ocio y caprichos.<br><b>20 %</b> ahorro: fondo de emergencia y metas.',
          'Es una regla orientativa popularizada por Elizabeth Warren en un libro de 2005. En muchas zonas la vivienda supera el 50 %: adaptarla a la realidad.'),
        table(T, 'Hazlo con tu sueldo (ejemplo)', [['Ingresos al mes', 'Necesidades (50 %)', 'Deseos (30 %)', 'Ahorro (20 %)'], ['1.000 €', '500 €', '300 €', '200 €'], ['1.400 €', '700 €', '420 €', '280 €'], ['1.800 €', '900 €', '540 €', '360 €'], ['2.200 €', '1.100 €', '660 €', '440 €']],
          'Cada fila se calcula multiplicando por 0,5, 0,3 y 0,2. Importes de ejemplo.', { colW: [1.4, 1.6, 1.4, 1.4], foot: 'Ejemplos: no son sueldos reales.', footY: 480 }),
        cards(T, 'Los gastos hormiga', [['cup', 'Una taza', 'Un café al día', '1,50 € × 220 días = 330 € al año'], ['video-camera', 'Una cámara de vídeo', 'Una suscripción olvidada', '9 € al mes = 108 € al año'], ['bag', 'Una bolsa de la compra', 'Comida a domicilio', '12 € a la semana = 624 € al año']],
          'Pequeños gastos que casi no se notan pero suman. Importes de ejemplo; pedir al alumnado que calcule los suyos.'),
        table(T, 'El interés compuesto', [['Años', 'Capital con 1.000 € al 3 % anual'], ['1', '1.030,00 €'], ['5', '1.159,27 €'], ['10', '1.343,92 €'], ['20', '1.806,11 €']],
          'Fórmula: capital × 1,03 elevado al número de años. Ejemplo teórico, con un 3 % anual constante, sin comisiones ni impuestos; los intereses reales cambian.', { colW: [1, 3], foot: 'Ejemplo teórico: los intereses reales cambian con el tiempo y el producto.', footY: 480 }),
        list(T, 'El fondo de emergencia', ['Es dinero guardado para imprevistos: una avería, una factura, una baja.', 'Una recomendación habitual: entre 3 y 6 meses de gastos básicos.', 'Se guarda en un sitio seguro y al que se puede acceder.', 'Se empieza poco a poco: 20 € a la semana son 1.040 € al año.'],
          'money-bag', 'Una bolsa de dinero', 'La recomendación de 3 a 6 meses es orientativa y depende de cada situación. 20 × 52 = 1.040.'),
        columns(T, 'Trampas que empeoran la cuesta', [['#b91c1c', 'Cuidado con…', ul('Créditos rápidos con intereses muy altos', 'Pagar a plazos, «sin intereses», lo que no puedes pagar', 'Comprar en rebajas lo que no necesitabas')],
          ['#15803d', 'Mejor…', ul('Esperar 24 horas antes de una compra no urgente', 'Comparar precios y comprar solo lo planeado', 'Pagar al contado lo que se pueda')]],
          'Hablar de la diferencia entre necesidad y deseo. Un crédito rápido puede costar mucho más de lo que se pidió.'),
        pollSlide(T, '¿Cómo llevas el control de tu dinero?', ['Una hoja de cálculo', 'Una aplicación', 'Lo apunto en un cuaderno', 'No lo controlo'], 'Votación. Después, hablar de cuál es más fácil de mantener.'),
        quizSlide(T, 'Con unos ingresos de 1.800 € al mes, ¿cuánto sería el ahorro según la regla 50/30/20?', ['360 €', '180 €', '540 €', '900 €'], 0, 'Respuesta: 360 €. El 20 % de 1.800 es 360.'),
        reto(T, 'Reto: mi semana de gastos', 'Apunta todos tus gastos de una semana y clasifícalos en necesidades, deseos y ahorro. ¿Se parece a la regla 50/30/20?',
          'Cinco minutos para empezar. La semana se completa en casa y se comenta después.', 300, '¡A apuntar!'),
        verify(T, ['Las tarifas y precios que suben en enero de este año.', 'La recomendación del fondo de emergencia, que cambia con cada situación.', 'Los intereses reales de cuentas y créditos: los de la presentación son ejemplos.'],
          'Todas las cifras de la presentación son ejemplos para practicar, salvo las reglas citadas, que son orientativas.'),
      ]));
    } },

  // 8 · IA en el aula: usos, ética y normas.
  edu_hoy_ia_aula: { name: 'IA en el aula: usos, ética y normas', cat: 'edu',
    summary: 'Cómo usar la inteligencia artificial en clase con criterio: usos útiles, semáforo de uso en las tareas, dónde falla, qué datos no compartir, el Reglamento europeo de IA, preguntas de ética, cómo citar su uso, votación, pregunta y un reto para la norma de aula',
    make: () => { const T = DARK('#071a2e', ['#3b82f6', '#14b8a6', '#8b5cf6'], '#7dd3fc', ['#7dd3fc', '#86efac', '#fcd34d', '#f9a8d4']);
      return numbered(build({ name: 'IA en el aula: usos, ética y normas', palette: 'midnight', fonts: 'tech', title: { color: '#ffffff', size: 44 }, body: { color: '#ffffff' } }, [
        cover(T, 'INTELIGENCIA ARTIFICIAL', 'IA en el aula: usos, ética y normas', 'Para qué sirve, dónde falla, qué dice la ley y cómo ponernos de acuerdo en clase.',
          [['bulb', 'Una bombilla', 810, 70, 320], ['chat-text', 'Un bocadillo con texto', 770, 400, 200], ['sheild', 'Un escudo', 1000, 420, 200]],
          'Portada. Para ESO, Bachillerato, FP y profesorado. No se citan marcas: lo importante son los criterios, no la herramienta.', 50),
        cards(T, 'Cuatro usos útiles', [['bulb', 'Una bombilla', 'Explicar', 'Pedir otra explicación del mismo tema'], ['pencil', 'Un lápiz', 'Practicar', 'Generar ejercicios y corregirlos'],
          ['notebook', 'Un cuaderno', 'Organizar', 'Esquemas, resúmenes y calendarios'], ['chat-bubble', 'Un bocadillo de diálogo', 'Traducir', 'Entender textos en otros idiomas']],
          'Usos que apoyan el aprendizaje sin sustituirlo. Preguntar cuál han probado ya y qué tal fue.'),
        columns(T, 'Semáforo de uso en las tareas', [['#86efac', 'Verde: permitido', 'Pedir ideas para empezar o revisar la ortografía.'], ['#fcd34d', 'Ámbar: con permiso y citándolo', 'Resumir un texto o mejorar un borrador propio.'],
          ['#fca5a5', 'Rojo: no permitido', 'Entregar como propio un trabajo hecho por la IA.']],
          'Es una propuesta: cada centro o docente fija sus reglas. Adaptar los ejemplos a la asignatura y comunicarlos al alumnado al empezar el curso.'),
        list(T, 'Dónde falla la IA', ['Se inventa datos y fuentes con total seguridad (alucinaciones).', 'Repite los sesgos de los datos con los que aprendió.', 'No conoce lo que pasó después de su entrenamiento.', 'No comprende: calcula el texto más probable.'],
          'target', 'Una diana', 'Pedir ejemplos reales de errores y comprobarlos juntos. Contrastar siempre con una fuente fiable.'),
        list(T, 'Qué no debemos pegar', ['Nombres, fotos o datos del alumnado.', 'Notas, informes o datos de salud.', 'Contraseñas o claves.', 'Exámenes que aún no se han hecho.', 'Trabajo de otras personas sin su permiso.'],
          'lock', 'Un candado', 'La protección de datos (RGPD y la ley española) obliga a cuidar los datos personales. En España, el consentimiento propio para tratar datos se da desde los 14 años; comprueba la norma de tu centro.'),
        table(T, 'Qué dice la UE: el Reglamento de IA', [['Fecha', 'Qué ocurre'], ['1 de agosto de 2024', 'Entra en vigor el Reglamento (UE) 2024/1689'], ['2 de febrero de 2025', 'Prohíbe ciertas prácticas y exige formación básica en IA'],
          ['2 de agosto de 2025', 'Reglas para modelos de IA de uso general'], ['2 de agosto de 2026', 'Fecha prevista para los sistemas de alto riesgo, como algunos de educación']],
          'Fechas del texto original. Pueden haberse modificado por reformas posteriores: comprobarlas en el sitio oficial de la UE (EUR-Lex) y en el del Ministerio competente.', { colW: [1.6, 3.4], foot: 'Comprueba si las fechas se han aplazado.', footY: 500 }),
        cards(T, 'Ética: cuatro preguntas', [['pencil', 'Un lápiz', '¿Es mío?', 'Autoría y honestidad'], ['zoom-in', 'Una lupa', '¿Es verdad?', 'Contrastar con fuentes'], ['heart', 'Un corazón', '¿Es justo?', 'Acceso igual para todos'], ['sheild', 'Un escudo', '¿Es seguro?', 'Privacidad y datos']],
          'Cuatro preguntas para decidir en cada caso. Pedir un ejemplo de cada una.'),
        pollSlide(T, '¿Para qué has usado la IA este curso?', ['Para dudas de estudio', 'Para corregir textos', 'Para hacer trabajos', 'No la he usado'], 'Votación anónima. Sin juzgar: sirve para saber de dónde partimos.'),
        list(T, 'Cómo citar el uso de la IA', ['Para qué la usé: ______', 'Qué herramienta y cuándo: ______', 'Qué le pedí: ______', 'Qué cambié o comprobé yo: ______'],
          'file-text', 'Un documento', 'Modelo de declaración para añadir al final de un trabajo. Cada docente puede ajustarlo.'),
        quizSlide(T, '¿Qué es una «alucinación» de la IA?', ['Una respuesta inventada que parece cierta', 'Un fallo de la pantalla', 'Un virus', 'Una imagen borrosa'], 0, 'Respuesta: una respuesta inventada que parece cierta. Por eso hay que contrastar.'),
        reto(T, 'Reto: nuestra norma de aula', 'En grupos, escribid tres normas sobre cuándo se puede usar la IA en esta clase y cómo se cita. Votad las mejores.',
          'Cinco minutos. El resultado puede convertirse en el acuerdo de uso de la clase.', 300, '¡Tiempo!'),
        verify(T, ['Las fechas del Reglamento de IA (EUR-Lex): pueden haberse aplazado.', 'Las normas de tu centro y de tu consejería sobre IA y protección de datos.', 'Que ninguna herramienta pida datos del alumnado sin autorización.'],
          'La normativa cambia deprisa. Comprobarla siempre en fuentes oficiales antes de presentar.'),
      ]));
    } },
};
