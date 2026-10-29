// Example presentations: Actualidad (lo que se busca ahora). Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Cinco temas concretos del otoño de 2026 para ESO, Bachillerato y FP: las elecciones de medio mandato de EE. UU. (3 de
// noviembre), ChatGPT y la IA en clase, el Black Friday (27 de noviembre), la vivienda y la Lotería de Navidad (22 de
// diciembre). Neutrales y plurales: se presentan posturas, no se toma partido, y no llevan resultados ni encuestas.
// Las cifras que cambian con el tiempo van marcadas como ejemplo o con «comprueba el dato» en las notas. Dibujos propios
// (SVG como data URL); sin imágenes de fuera. Decimales con coma (español).

import { build, text, card, shape, icon, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, pollBlock, base, deep, big } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 34, x: 70, y: 60, w: 1140, h: 600, ...props });
const vote = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, ...props });
const FF = { space: "'Space Grotesk', sans-serif" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A row of three cards (title, text, colour): the title in its colour, dark enough to read on the card (deep).
const row3 = (items, { y = 220, h = 300, bg = '#ffffff', color = '#1f2430', ts = 26, ds = 21 } = {}) =>
  items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, 90 + i * 375, y, 350, h, bg, { color, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up'));
// Two cards side by side.
const row2 = (items, { y = 210, h = 330, bg = '#ffffff', color = '#1f2430', ts = 28, ds = 22 } = {}) =>
  items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, 90 + i * 565, y, 535, h, bg, { color, radius: 16, borderColor: col, pad: [22, 26, 18, 26] }), 'fade-up'));
// The cover: a label, the title, a line, and a drawing on the right.
const cover = ({ bg, accent, inkc, grey, sub, label, title, art, alt, size = 62 }) => ({ layout: 'blank', bg, back: [glow(1000, -120, 560, accent, bg, 16), glow(-120, 560, 520, accent, bg, 10)], extra: [
  text(label, 90, 140, 760, 36, { fontSize: 22, letterSpacing: 3, color: deep(accent, bg), fontWeight: 700 }),
  text(title, 84, 186, 780, 270, { fontSize: size, fontWeight: 800, color: inkc, lineHeight: 1.05, fontFamily: FF.space }),
  text(sub, 90, 470, 720, 130, { fontSize: 26, color: grey, lineHeight: 1.4 }),
  after(img(art, 880, 150, 330, 420, alt), 'fade-left', { duration: 800 })] });
// The closing: a challenge or a debate, and a timer to do it in class.
const closing = ({ bg, accent, inkc, grey, title, body, seconds, end }) => ({ layout: 'blank', bg, back: [glow(1000, 420, 520, accent, bg, 14)], transition: 'zoom', extra: [
  text(title, 84, 110, 820, 140, { fontSize: 50, fontWeight: 800, color: inkc, fontFamily: FF.space, lineHeight: 1.08 }),
  text(body, 84, 280, 790, 330, { fontSize: 26, color: grey, lineHeight: 1.45 }),
  timer(seconds, 930, 220, 280, { color: accent, endText: end })] });
// A numbered list of steps, one card per line (readable at a distance: the diagrams shrink long lines).
const STEPCOL = ['#2a4a8a', '#1f8a8a', '#c98a1e', '#6d4aa8', '#c0455f'];
const steps = (lines, y, h, color = '#1f2430', fs = 25) => { const L = lines.split('\n'), rh = h / L.length;
  return L.map((t, i) => on(card(`<span style="display:inline-block;width:1.7em;height:1.7em;line-height:1.7em;border-radius:50%;background:${STEPCOL[i % 5]};color:#fff;text-align:center;font-weight:800;margin-right:.7em">${i + 1}</span>${t}`,
    110, y + i * rh, 1060, rh - 10, '#ffffff', { color, radius: 14, borderColor: STEPCOL[i % 5], fontSize: fs, pad: [4, 22, 4, 18], vAlign: 'middle' }), 'fade-up')); };
// A line under a chart or table.
const foot = (t, color, y = 620, x = 110, w = 1060) => text(t, x, y, w, 56, { fontSize: 21, color, textAlign: 'center' });

// ---- Drawings (ours) ---------------------------------------------------------------
// A parliament building: dome, columns and steps.
const parliament = (c1, c2) => svgURL(330, 420,
  `<rect x="30" y="330" width="270" height="22" fill="${c2}"/><rect x="50" y="352" width="230" height="22" fill="${c2}" opacity=".8"/>`
  + [60, 105, 150, 195, 240].map(x => `<rect x="${x}" y="200" width="26" height="130" rx="4" fill="#ffffff" stroke="${c1}" stroke-width="4"/>`).join('')
  + `<path d="M40 200 H290 L165 150 Z" fill="${c1}"/><rect x="105" y="108" width="120" height="42" fill="${c1}"/><path d="M105 108 Q165 22 225 108 Z" fill="${c2}"/>`
  + `<rect x="161" y="20" width="8" height="30" fill="${c1}"/><path d="M169 22 h38 l-10 11 l10 11 h-38 z" fill="${c2}"/>`);
// A chat window with two bubbles.
const chatArt = (c1, c2) => svgURL(330, 420,
  `<rect x="10" y="20" width="310" height="380" rx="28" fill="#ffffff" stroke="${c1}" stroke-width="5"/>`
  + `<rect x="40" y="60" width="190" height="64" rx="20" fill="${c2}"/><rect x="60" y="84" width="110" height="10" rx="5" fill="#ffffff"/><rect x="60" y="102" width="70" height="10" rx="5" fill="#ffffff" opacity=".7"/>`
  + `<rect x="100" y="150" width="190" height="104" rx="20" fill="${c1}"/><rect x="122" y="176" width="140" height="10" rx="5" fill="#ffffff"/><rect x="122" y="198" width="120" height="10" rx="5" fill="#ffffff" opacity=".8"/><rect x="122" y="220" width="86" height="10" rx="5" fill="#ffffff" opacity=".6"/>`
  + `<rect x="40" y="280" width="140" height="48" rx="20" fill="${c2}"/><circle cx="76" cy="304" r="6" fill="#fff"/><circle cx="100" cy="304" r="6" fill="#fff" opacity=".7"/><circle cx="124" cy="304" r="6" fill="#fff" opacity=".4"/>`
  + `<rect x="40" y="348" width="250" height="34" rx="17" fill="none" stroke="${c1}" stroke-width="3"/><rect x="56" y="360" width="90" height="10" rx="5" fill="${c1}" opacity=".5"/>`);
// A price tag with a label.
const tagArt = (c1, c2, big1, small) => svgURL(330, 420,
  `<g transform="rotate(-12 165 210)"><path d="M40 90 H230 L300 210 L230 330 H40 Q20 330 20 310 V110 Q20 90 40 90 Z" fill="${c1}"/><circle cx="62" cy="210" r="16" fill="#ffffff"/>`
  + `<text x="160" y="205" font-family="sans-serif" font-size="74" font-weight="800" fill="#ffffff" text-anchor="middle">${big1}</text><text x="160" y="255" font-family="sans-serif" font-size="30" font-weight="700" fill="${c2}" text-anchor="middle">${small}</text></g>`);
// A house with a key.
const houseArt = (c1, c2) => svgURL(330, 420,
  `<path d="M30 200 L165 80 L300 200 Z" fill="${c2}"/><rect x="60" y="200" width="210" height="150" fill="#ffffff" stroke="${c1}" stroke-width="5"/>`
  + `<rect x="140" y="260" width="50" height="90" rx="4" fill="${c1}"/><rect x="82" y="226" width="42" height="42" fill="${c2}" opacity=".5"/><rect x="206" y="226" width="42" height="42" fill="${c2}" opacity=".5"/>`
  + `<circle cx="95" cy="380" r="18" fill="none" stroke="${c1}" stroke-width="7"/><path d="M113 380 H210 M185 380 v18 M205 380 v14" stroke="${c1}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
// A lottery ticket (a «décimo») with five digits.
const ticketArt = (c1, c2) => svgURL(330, 420,
  `<g transform="rotate(-8 165 210)"><rect x="20" y="110" width="290" height="190" rx="14" fill="#ffffff" stroke="${c1}" stroke-width="5"/><rect x="20" y="110" width="290" height="44" rx="14" fill="${c1}"/>`
  + `<text x="165" y="141" font-family="sans-serif" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="3">SORTEO DE NAVIDAD</text>`
  + [0, 1, 2, 3, 4].map(i => `<rect x="${42 + i * 52}" y="178" width="44" height="64" rx="8" fill="${c2}"/><text x="${64 + i * 52}" y="224" font-family="sans-serif" font-size="42" font-weight="800" fill="#ffffff" text-anchor="middle">${'12345'[i]}</text>`).join('')
  + `<text x="165" y="276" font-family="sans-serif" font-size="22" fill="${c1}" text-anchor="middle">20 € el décimo</text></g>`);
// A grid of 100 dots, one of them marked.
const dots100 = (c1, c2) => svgURL(420, 420, Array.from({ length: 100 }, (_, i) => { const x = 25 + (i % 10) * 41, y = 25 + Math.floor(i / 10) * 41, hit = i === 63;
  return `<circle cx="${x}" cy="${y}" r="${hit ? 17 : 14}" fill="${hit ? c2 : c1}" opacity="${hit ? 1 : .35}"${hit ? ` stroke="${c2}" stroke-width="4"` : ''}/>`; }).join(''));

export default {

  // 1 · Elecciones de medio mandato en EE. UU.
  edu_news_midterms: { name: 'Elecciones de medio mandato en EE. UU. (3 de noviembre de 2026)', cat: 'edu', summary: 'Las midterms de EE. UU. del 3 de noviembre de 2026 explicadas sin partidismo: qué se vota (Cámara, parte del Senado y gobernadores), cómo funciona el Congreso, por qué importan, cómo se vota, comparación con España, votación y cuestionario', make: () => {
    const PAPER = '#f4f1ea', INK = '#1b2233', GREY = '#566075', NAVY = '#2a4a8a', AM = '#c98a1e', TE = '#1f8a8a', PU = '#6d4aa8', S = FF.space;
    return numbered(ink(build({ name: 'Elecciones de medio mandato en EE. UU. (3 de noviembre de 2026)', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: PAPER, accent: NAVY, inkc: INK, grey: GREY, label: 'ACTUALIDAD · 3 DE NOVIEMBRE DE 2026', title: 'Elecciones de medio mandato en EE. UU.', size: 58,
        sub: 'Qué se vota, cómo funciona el Congreso y por qué se siguen en todo el mundo. Sin tomar partido: solo cómo funciona.', art: parliament(NAVY, AM), alt: 'Un edificio parlamentario con cúpula' }),
      { title: '¿Por qué «medio mandato»?', layout: 'titleOnly', bg: PAPER, extra: [
        dg('timeline', 'Noviembre de 2024\nElección presidencial\nNoviembre de 2026\nMedio mandato: se renueva el Congreso\nNoviembre de 2028\nNueva elección presidencial', 90, 195, 1100, 330, { color: INK }),
        foot('El presidente dura cuatro años; a mitad de camino, los votantes eligen otra vez parte del poder legislativo y muchos gobiernos estatales.', GREY, 560, 90, 1100)],
        notes: 'Las elecciones de medio mandato (midterms) se celebran el primer martes después del primer lunes de noviembre, dos años después de la presidencial. Aquí solo se explica el calendario: no hay elección de presidente en 2026.' },
      { title: 'Qué se vota el 3 de noviembre', layout: 'titleOnly', bg: PAPER, extra: [
        on(big('435', 'escaños de la Cámara de Representantes: se renuevan todos', 90, 200, deep(NAVY, PAPER), INK), 'zoom-in'),
        on(big('≈ 35', 'escaños del Senado (de 100): una tercera parte', 470, 200, deep(AM, PAPER), INK), 'zoom-in'),
        on(big('36', 'gobernadores de estado (de 50)', 850, 200, deep(TE, PAPER), INK), 'zoom-in'),
        foot('Además: parlamentos estatales, alcaldías y consultas locales. Cada estado tiene sus propias papeletas.', GREY, 560, 90, 1100)],
        notes: 'Cámara: 435 escaños, mandato de 2 años, todos en juego. Senado: 100 senadores, mandato de 6 años, renovación por tercios; este año unos 35 (33 ordinarios más 2 elecciones especiales). Gobernadores: 36 estados. Comprueba las cifras exactas en la web oficial de la Comisión Federal Electoral o en Ballotpedia antes de presentar.' },
      { title: 'El Congreso: dos cámaras', layout: 'titleOnly', bg: PAPER, extra: [
        ...row2([['Cámara de Representantes', '435 miembros, repartidos entre los estados según su población (más habitantes, más escaños). Mandato de 2 años: por eso se renueva entera.', NAVY],
          ['Senado', '100 senadores, 2 por estado sea grande o pequeño. Mandato de 6 años, con un tercio renovado cada 2 años. Confirma a jueces y altos cargos.', AM]], { y: 205, h: 300, ts: 29, ds: 23 }),
        foot('Una ley necesita el visto bueno de las dos cámaras y la firma del presidente.', GREY, 540, 90, 1100)],
        notes: 'Idea clave: bicameralismo. El Senado iguala a los estados; la Cámara refleja la población. Pregunta: ¿qué ventajas y qué inconvenientes tiene que dos cámaras tengan que ponerse de acuerdo?' },
      { title: 'Cómo se aprueba una ley', layout: 'titleOnly', bg: PAPER, extra: [
        ...steps('Un proyecto de ley se presenta en una de las cámaras\nSe estudia en comisiones y se vota\nLa otra cámara lo vota también\nEl presidente lo firma o lo veta\nSi hay veto, el Congreso puede anularlo con dos tercios', 200, 340, INK),
        foot('Si cada cámara está en manos distintas, o el Congreso y el presidente discrepan, cuesta más aprobar leyes.', GREY, 565, 110, 1060)],
        notes: 'Versión simplificada. Se pueden añadir los matices que se quiera: conferencia entre cámaras, «filibusterismo» en el Senado, etc.' },
      { title: 'Por qué importan', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['Leyes y presupuesto', 'El Congreso aprueba los impuestos y el gasto federal: sin su acuerdo no hay presupuesto.', NAVY],
          ['Control del gobierno', 'Puede investigar, pedir cuentas y cuestionar al Ejecutivo desde las comisiones.', TE],
          ['Nombramientos', 'El Senado confirma a jueces (incluidos los del Tribunal Supremo) y a altos cargos.', AM]], { y: 215, h: 260, ds: 22 }),
        foot('Y los gobernadores deciden mucho de lo cotidiano en su estado: educación, sanidad, carreteras o policía estatal.', GREY, 520, 90, 1100)],
        notes: 'Se presentan funciones, no valoraciones. Si el alumnado pregunta «quién va a ganar», dirígelo a fuentes oficiales y a medios con metodología explicada; no se incluyen encuestas en esta plantilla.' },
      { title: 'Cómo se vota', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cards', 'Un solo ganador por distrito: gana quien tiene más votos, aunque no pase del 50 %\nPrimarias antes de noviembre: los partidos eligen a sus candidatos\nVoto en persona, anticipado o por correo: las reglas cambian de un estado a otro\nEl censo hay que solicitarlo: la inscripción depende del estado\nNo hay segunda vuelta en la mayoría de los estados', 90, 190, 1100, 400, { color: INK }),
        foot('Es un sistema mayoritario, como los de «el ganador se lo lleva todo» que vimos en clase.', GREY, 612, 90, 1100)],
        notes: 'Detalles: el sistema mayoritario a una vuelta (first-past-the-post) en la mayoría de distritos; algunos estados usan segunda vuelta o voto por orden de preferencia en ciertas elecciones. Lo importante es que cada estado fija sus reglas. Comprueba los plazos en vote.gov.' },
      { title: 'EE. UU. y España, lado a lado', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 90, y: 190, w: 1100, h: 330, stroke: '#cfd4de', fontSize: 24,
          rows: [['', 'Congreso de EE. UU.', 'Congreso de los Diputados (España)'], ['Escaños', '435 (Cámara)', '350'], ['Duración del mandato', '2 años (Cámara)', '4 años'],
            ['Cómo se reparten', 'Un ganador por distrito (mayoritario)', 'Listas por provincia (proporcional, d’Hondt)'], ['Quién gobierna', 'Presidente elegido aparte, en otra votación', 'El presidente del Gobierno lo elige el Congreso']] }),
        foot('Dos formas de organizar el poder: la «separación de poderes» y el sistema parlamentario.', GREY, 545, 90, 1100)],
        notes: 'Comparación para ESO/Bachillerato. EE. UU. es un régimen presidencial; España, una monarquía parlamentaria. Pregunta: ¿qué sistema hace más fácil formar gobierno? ¿Cuál representa mejor a las minorías?' },
      { layout: 'blank', bg: PAPER, extra: [vote('¿Qué te parece más justo para repartir escaños?', ['Que gane quien más votos saque en cada distrito', 'Que los escaños sigan el porcentaje de votos', 'Una combinación de las dos cosas', 'Todavía no lo tengo claro'])],
        notes: 'Votación de opinión, sin respuesta correcta. Se pueden discutir las ventajas de cada sistema: gobiernos más claros frente a más voces representadas.' },
      { layout: 'blank', bg: '#e9e6dc', extra: [quiz('¿Cada cuántos años se renueva TODA la Cámara de Representantes de EE. UU.?', ['Cada año', 'Cada 2 años', 'Cada 4 años', 'Cada 6 años'], 1)],
        notes: 'Respuesta: cada 2 años. Los senadores tienen 6 años y se renuevan por tercios; el presidente, 4 años.' },
      closing({ bg: PAPER, accent: NAVY, inkc: INK, grey: GREY, title: 'Vuestro turno: elecciones en clase', seconds: 300, end: '¡A votar!',
        body: 'Elegid entre todos qué se vota en una «mini midterm» de clase (por ejemplo, el próximo juego del recreo o la salida de fin de curso). Dos reglas distintas, la misma votación: 1) gana quien más votos saque; 2) se reparten 5 «escaños» según el porcentaje. ¿Cambia el resultado? ¿Cuál os parece más justa?' }),
    ]), INK));
  } },

  // 2 · ChatGPT y la IA en clase.
  edu_news_chatgpt: { name: 'ChatGPT y la IA en clase', cat: 'edu', summary: 'Qué es ChatGPT y cómo usar la inteligencia artificial en clase sin trampas: preguntar bien (prompts), qué sí y qué no hacer con las tareas, las alucinaciones, cómo citar, privacidad y el Reglamento europeo de IA en breve', make: () => {
    const PAPER = '#f2f0fb', INK = '#1f1a36', GREY = '#5a5373', PU = '#6a41b8', TE = '#1f8f8f', AM = '#d98a1e', RE = '#c0455f', GR = '#2e9e6b', S = FF.space;
    return numbered(ink(build({ name: 'ChatGPT y la IA en clase', palette: 'violet', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: PAPER, accent: PU, inkc: INK, grey: GREY, label: 'ACTUALIDAD · IA EN EL AULA', title: 'ChatGPT y la IA en clase', size: 66,
        sub: 'Qué es, cómo preguntarle bien, qué puedes hacer (y qué no) con tus tareas y cómo usarla con cabeza.', art: chatArt(PU, TE), alt: 'Una ventana de chat con mensajes' }),
      { title: 'Qué es (y qué no es)', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cycle', 'Millones de textos\nEntrenamiento\nModelo de lenguaje\nTu pregunta\nUna respuesta que suena bien', 90, 185, 600, 430, { color: INK }),
        on(text('<b style="color:' + deep(PU, PAPER) + '">Es un modelo de lenguaje</b>: aprende patrones en una enorme cantidad de texto y escribe la respuesta que le parece más probable.<br><br><b style="color:' + deep(RE, PAPER) + '">No es una persona</b> ni un buscador: no «sabe» qué es verdad, así que puede equivocarse con total seguridad.', 730, 215, 470, 380, { fontSize: 24, color: INK, lineHeight: 1.45 }), 'fade-left')],
        notes: 'ChatGPT es el ejemplo más conocido; Gemini, Copilot, Claude y otras herramientas funcionan con la misma idea general. Insistir: suena convincente no significa que sea verdad.' },
      { title: 'Preguntar bien: el prompt', layout: 'titleOnly', bg: PAPER, extra: [
        ...steps('Rol: «Eres un profesor de 3.º de ESO»\nTarea: «Explícame la fotosíntesis»\nContexto: «Ya sé qué es una célula»\nFormato: «En 5 líneas y con un ejemplo»\nLímites: «Sin palabras técnicas»', 195, 330, INK),
        foot('Cuanto más claro es lo que pides, más útil es lo que recibes. Y si no te sirve, pide que lo mejore.', GREY, 560, 110, 1060)],
        notes: 'Un prompt es la instrucción que se le da. No hay fórmula mágica, pero estas cinco piezas ayudan. Actividad rápida: cada pareja reescribe «háblame del volcán» con las cinco piezas.' },
      { title: 'Un prompt flojo y uno bueno', layout: 'titleOnly', bg: PAPER, extra: [
        ...row2([['Flojo', '«Háblame de la Revolución Francesa»<br><br><span style="font-size:19px;color:' + GREY + '">Resultado: un texto largo y genérico que no responde a lo que necesitas.</span>', RE],
          ['Mejor', '«Soy alumno de 4.º de ESO. Resume en 6 líneas las causas de la Revolución Francesa y acaba con 2 preguntas para comprobar si lo he entendido.»<br><br><span style="font-size:19px;color:' + GREY + '">Resultado: breve, a tu nivel y te hace pensar.</span>', GR]], { y: 205, h: 350, ds: 23 })],
        notes: 'Fíjate en que el buen prompt no pide «hazme la tarea», sino ayuda para entender y comprobar. Es la diferencia entre usar la IA para aprender y usarla para evitar aprender.' },
      { title: 'Las alucinaciones', layout: 'titleOnly', bg: PAPER, extra: [
        on(icon('triangle-alert', 100, 220, 90, deep(AM, PAPER)), 'zoom-in'),
        text('Una <b>alucinación</b> es cuando la IA se inventa un dato, una cita, una ley o un enlace… y lo cuenta con tranquilidad.', 220, 205, 940, 130, { fontSize: 29, color: INK, lineHeight: 1.4 }),
        text(ul('Desconfía de cifras, fechas, nombres y citas exactas', 'Pide las fuentes… y comprueba que existen de verdad', 'Contrasta con un libro, una web oficial o el material de clase', 'Pregunta lo mismo de otra forma: si cambia, hay algo flojo'), 220, 355, 940, 250, { fontSize: 26, color: INK, lineHeight: 1.5 })],
        notes: 'Ejemplo útil: pedirle «tres artículos científicos sobre X con enlace» y comprobar que varios no existen. Es la lección más importante del tema.' },
      { title: 'Con las tareas: sí y no', layout: 'titleOnly', bg: PAPER, extra: [
        ...row2([['Sí, con cabeza', ul('Pedir que te explique algo de otra manera', 'Generar ejercicios para practicar', 'Revisar la ortografía de lo que has escrito tú', 'Sacar ideas para empezar un trabajo'), GR],
          ['No', ul('Copiar y entregarlo como tuyo', 'Usarla en un examen sin permiso', 'Inventar fuentes o datos', 'Dejar que decida por ti'), RE]], { y: 200, h: 350, ds: 24 }),
        foot('Pregunta siempre a tu profesorado qué normas hay en cada materia: no son iguales en todas partes.', GREY, 575, 90, 1100)],
        notes: 'Cada centro y cada materia pueden fijar sus reglas. Conviene acordar con el grupo una norma común y escribirla. Esta lista es orientativa.' },
      { title: 'Cómo citar la IA', layout: 'titleOnly', bg: PAPER, extra: [
        ...steps('Di qué herramienta has usado (nombre, empresa y versión)\nApunta la fecha en que la consultaste\nGuarda el prompt exacto que escribiste\nIndica para qué la usaste (ideas, corrección, resumen…)\nSi usas un dato suyo, contrástalo y cita la fuente real', 195, 320, INK),
        foot('Ejemplo: «Consultado en ChatGPT (OpenAI) el 12-11-2026 para generar ideas de portada; texto redactado por mí.»', GREY, 550, 110, 1060)],
        notes: 'Los formatos oficiales (APA, MLA) ya incluyen cómo citar herramientas de IA; consulta la guía vigente de tu centro. Lo esencial: transparencia.' },
      { title: 'Privacidad: lo que no se escribe', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['Tus datos', 'Nombre completo, dirección, teléfono, centro, claves.', RE], ['Los de otros', 'Fotos, mensajes o datos de compañeros, familia o profesorado.', AM], ['Lo íntimo', 'Problemas personales o de salud: busca a una persona de confianza.', PU]], { y: 215, h: 240, ds: 22 }),
        foot('Lo que escribes puede guardarse y usarse para mejorar el sistema. Las herramientas suelen exigir una edad mínima y permiso familiar a menores.', GREY, 490, 90, 1100)],
        notes: 'Comprueba las condiciones de uso de la herramienta que uséis: la edad mínima y el uso de datos cambian. En un centro, usa preferentemente las herramientas aprobadas por el equipo directivo.' },
      { title: 'La ley europea de IA, en breve', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Inaceptable: prohibido', 'puntuación social', RE, 330], ['Alto riesgo: reglas estrictas', 'selección de personal, evaluar alumnado', AM, 460], ['Riesgo limitado: avisar de que es IA', 'chatbots, contenido generado', TE, 590], ['Riesgo mínimo: libre', 'filtro de spam, videojuegos', GR, 720]].map(([t, d, col, w], k) =>
          on(card(`<b style="font-size:22px">${t}</b><br><span style="font-size:19px">${d}</span>`, 70 + (720 - w) / 2, 190 + k * 108, w, 96, col, { color: '#ffffff', radius: 14, textAlign: 'center', pad: [10, 12, 8, 12], vAlign: 'middle' }), 'fade-up')),
        on(text('El <b>Reglamento de IA</b> de la UE (2024) se aplica por fases:<br>· Desde 2025, prácticas prohibidas y formación en IA.<br>· Más obligaciones, incluidas las de transparencia, en 2026 y después.', 830, 215, 370, 380, { fontSize: 22, color: INK, lineHeight: 1.45 }), 'fade-left')],
        notes: 'Resumen muy simplificado: el Reglamento (UE) 2024/1689 clasifica por riesgo. Las fechas de aplicación de las obligaciones de alto riesgo se han modificado en 2026: comprueba el calendario vigente en artificialintelligenceact.eu o en el DOUE antes de presentar.' },
      { layout: 'blank', bg: PAPER, extra: [vote('¿Para qué has usado alguna vez la IA?', ['Entender algo que no me quedaba claro', 'Hacer una tarea', 'Curiosear o divertirme', 'No la he usado'])],
        notes: 'Votación anónima. Que muchos digan «hacer una tarea» abre la conversación sobre cómo usarla para aprender.' },
      { layout: 'blank', bg: '#e8e3f7', extra: [quiz('La IA te da una cita con año y autor. ¿Qué haces antes de usarla?', ['Nada: suena muy seguro', 'Compruebo en otra fuente que existe', 'Le pregunto otra vez y me quedo con la primera', 'La copio tal cual'], 1)],
        notes: 'Siempre se comprueba. Las citas inventadas son un ejemplo típico de alucinación.' },
      closing({ bg: PAPER, accent: PU, inkc: INK, grey: GREY, title: 'Las reglas de nuestra clase', seconds: 300, end: '¡Hecho!',
        body: 'Por equipos, redactad tres normas para usar la IA en esta clase: qué se puede hacer, qué no y cómo se cita. Después las comparamos, votamos las mejores y las colgamos en el aula.' }),
    ]), INK));
  } },

  // 3 · Black Friday sin caer en trampas.
  edu_news_blackfriday: { name: 'Black Friday sin caer en trampas', cat: 'edu', summary: 'Black Friday y Cyber Monday de 2026: cuándo son, cómo calcular el descuento real, los falsos descuentos, las estafas más habituales, el derecho de desistimiento de 14 días y la garantía, con un ejemplo con números y un cuestionario', make: () => {
    const PAPER = '#fbf4ea', INK = '#2b1d10', GREY = '#6b5a45', OR = '#d9731e', RE = '#c0392b', GR = '#2e8f5a', BL = '#2f6db0', AM = '#c98a1e', S = FF.space;
    return numbered(ink(build({ name: 'Black Friday sin caer en trampas', palette: 'warm', fonts: 'bold', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: PAPER, accent: OR, inkc: INK, grey: GREY, label: 'CONSUMO · VIERNES 27 DE NOVIEMBRE DE 2026', title: 'Black Friday sin caer en trampas', size: 60,
        sub: 'Cómo saber si una oferta lo es de verdad, cómo evitar estafas y qué derechos tienes si compras por internet.', art: tagArt(RE, '#ffe3cf', '−50 %', 'OFERTA'), alt: 'Una etiqueta de precio con un descuento' }),
      { title: 'Cuándo es y de dónde viene', layout: 'titleOnly', bg: PAPER, extra: [
        dg('timeline', 'Jueves 26 de noviembre\nAcción de Gracias en EE. UU.\nViernes 27 de noviembre\nBlack Friday\nLunes 30 de noviembre\nCyber Monday', 90, 195, 1100, 330, { color: INK }),
        foot('Nació en EE. UU. como arranque de las compras de Navidad. Hoy muchas tiendas alargan las ofertas a toda la semana o al mes.', GREY, 560, 90, 1100)],
        notes: 'El Black Friday es el viernes siguiente al cuarto jueves de noviembre (Acción de Gracias en EE. UU.). En 2026: 27 de noviembre; Cyber Monday: 30 de noviembre. No hay una fecha oficial en España: cada tienda decide la suya.' },
      { title: 'El descuento real', layout: 'titleOnly', bg: PAPER, extra: [
        on(text('Descuento (%) = <b>(precio antes − precio ahora) ÷ precio antes × 100</b>', 90, 200, 1100, 70, { fontSize: 33, color: INK, textAlign: 'center' }), 'fade-up'),
        ...row3([['Lo que anuncian', 'Unos cascos «de 200 € a 140 €»: <b>−30 %</b>.', OR], ['Lo que importa', 'El precio más bajo de los últimos 30 días era <b>160 €</b>.', BL], ['El descuento real', '(160 − 140) ÷ 160 × 100 = <b>12,5 %</b>.', RE]], { y: 300, h: 190, ds: 24 }),
        foot('El «precio tachado» no siempre es el precio al que se vendía de verdad. Compara con el precio de los días anteriores.', GREY, 540, 90, 1100)],
        notes: 'Ejemplo con cifras inventadas (cascos). La regla de oro: el descuento real se calcula con el precio que se aplicaba de verdad antes de la oferta, no con el «precio recomendado». En las rebajas, la norma obliga a indicar el precio anterior; en promociones como el Black Friday no siempre se muestra, así que conviene mirar un histórico de precios.' },
      { title: 'Descuento anunciado y descuento real', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 60, y: 180, w: 590, h: 440, chartType: 'bar', color: OR, dataLabels: true, grid: true, yTitle: 'Descuento (%)', seriesName: 'Anunciado',
          data: [{ label: 'Cascos', value: 30 }, { label: 'Zapatillas', value: 30 }, { label: 'Tablet', value: 25 }, { label: 'Cafetera', value: 30 }],
          series: [{ name: 'Real', values: [12.5, 0, 10, 10], color: RE }] }),
        tableBlock({ x: 680, y: 195, w: 540, h: 330, stroke: '#e1d3bf', fontSize: 21,
          rows: [['Producto', 'Antes', 'Ahora', 'Mín. 30 d'], ['Cascos', '200', '140', '160'], ['Zapatillas', '120', '84', '84'], ['Tablet', '300', '225', '250'], ['Cafetera', '90', '63', '70']] }),
        foot('Precios en euros. Cifras de ejemplo: ¡comprueba las de los productos que te interesen!', GREY, 635, 90, 1100)],
        notes: 'Cálculo del descuento real: (mínimo 30 días − precio ahora) ÷ mínimo 30 días. Cascos 20/160 = 12,5 %; zapatillas 0/84 = 0 %; tablet 25/250 = 10 %; cafetera 7/70 = 10 %. Pide al alumnado que lo compruebe con la calculadora.' },
      { title: 'Trucos que conviene conocer', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['Subir para bajar', 'Subir el precio unas semanas antes para que el «descuento» parezca mayor.', RE], ['«Hasta −70 %»', 'Solo suele afectar a un par de productos; el resto, mucho menos.', AM], ['Prisa artificial', '«¡Quedan 2!» o cuentas atrás: están hechas para que no compares.', BL]], { y: 215, h: 250, ds: 22 }),
        foot('Si dudas, espera un día: si la oferta es buena de verdad, seguirá ahí o volverá.', GREY, 500, 90, 1100)],
        notes: 'Los estudios de asociaciones de consumidores (OCU y otras) han comprobado en años anteriores que no todos los descuentos eran reales. Cita la fuente y el año concretos si los muestras.' },
      { title: 'Cómo comparar precios', layout: 'titleOnly', bg: PAPER, extra: [
        ...steps('Decide antes qué necesitas y cuánto pagarías\nMira el historial de precios en un comparador\nSuma el envío y los gastos adicionales\nCompara también garantía, devolución y reseñas\nCompra en una tienda de confianza', 195, 330, INK),
        foot('El precio más bajo no es el mejor si la tienda no responde cuando hay un problema.', GREY, 560, 110, 1060)],
        notes: 'Hay comparadores y extensiones de histórico de precios. Recomienda contrastar al menos dos fuentes.' },
      { title: 'Estafas: señales de alarma', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['La tienda falsa', 'Precios imposibles, web recién creada, solo acepta transferencia o Bizum.', RE], ['El SMS del paquete', '«Tu envío está retenido, paga 1,99 €». Es phishing para robar tus datos.', OR], ['El enlace en redes', 'Cupones o sorteos «solo hoy» que te piden iniciar sesión o datos de tu tarjeta.', AM]], { y: 205, h: 270, ds: 22 }),
        foot('Entra siempre desde la web oficial, no desde enlaces de mensajes. Paga con tarjeta o con métodos que permitan reclamar.', GREY, 510, 90, 1100)],
        notes: 'Conecta con el tema de estafas de Economía. Si has sido víctima: avisa al banco para bloquear la tarjeta, guarda pruebas y denuncia (policía o guardia civil).' },
      { title: 'Tus derechos al comprar', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['14 días para desistir', 'En compras por internet puedes devolver sin dar explicaciones en 14 días naturales (hay excepciones: productos personalizados, precintados abiertos…).', GR], ['Garantía legal', 'Los productos nuevos tienen 3 años de garantía por defectos de fábrica.', BL], ['En la tienda física', 'No hay derecho legal a devolver por no gustar: depende de la política de la tienda. Pide el cambio por escrito.', AM]], { y: 205, h: 310, ds: 22 }),
        foot('Guarda siempre el ticket, la factura o el correo de confirmación.', GREY, 545, 90, 1100)],
        notes: 'Comprueba las normas vigentes en la web del Ministerio de Consumo o en tu comunidad. El plazo de desistimiento empieza al recibir el producto. Si la tienda es de fuera de la UE, las protecciones pueden ser menores.' },
      { layout: 'blank', bg: PAPER, extra: [vote('¿Compras algo en el Black Friday?', ['Sí, lo tengo planeado', 'Solo si hay una buena oferta de algo que ya quería', 'No, prefiero no comprar', 'Aún no sé qué es esto'])],
        notes: 'Votación sin respuesta correcta. Sirve para hablar de compras planificadas frente a compras por impulso.' },
      { layout: 'blank', bg: '#f4e8d3', extra: [quiz('Un jersey costaba 80 € la semana pasada y hoy cuesta 60 €. ¿Qué descuento real tiene?', ['20 %', '25 %', '33 %', '40 %'], 1)],
        notes: '(80 − 60) ÷ 80 × 100 = 25 %. El error típico es dividir entre el precio nuevo (33 %).' },
      closing({ bg: PAPER, accent: OR, inkc: INK, grey: GREY, title: 'Detectives de ofertas', seconds: 300, end: '¡A investigar!',
        body: 'Elige un producto que te guste. Apunta su precio hoy, el «precio tachado» y los precios de 3 tiendas. Cuando llegue el Black Friday, calcula el descuento real. ¿Era una oferta de verdad?' }),
    ]), INK));
  } },

  // 4 · Vivienda: por qué cuesta tanto alquilar y comprar.
  edu_news_housing: { name: 'Vivienda: por qué cuesta tanto alquilar y comprar', cat: 'edu', summary: 'Por qué la vivienda es tan cara: las causas (oferta, demanda, pisos turísticos, tipos de interés, salarios), cuánto cuesta entrar con el cálculo de una hipoteca, qué parte del sueldo se va, las medidas posibles con sus pros y sus contras y un debate', make: () => {
    const PAPER = '#eef3f6', INK = '#1c2b3a', GREY = '#53657a', TE = '#1f8a8a', BR = '#c4553a', NAVY = '#2a4a8a', AM = '#d98a1e', GR = '#2e9e6b', S = FF.space;
    return numbered(ink(build({ name: 'Vivienda: por qué cuesta tanto alquilar y comprar', palette: 'office', fonts: 'clean', title: { color: INK, size: 44 }, body: { color: INK } }, [
      cover({ bg: PAPER, accent: TE, inkc: INK, grey: GREY, label: 'ACTUALIDAD · VIVIENDA', title: 'Vivienda: por qué cuesta tanto alquilar y comprar', size: 52,
        sub: 'Las causas, los números de una hipoteca y las medidas que se discuten, con sus pros y sus contras.', art: houseArt(NAVY, BR), alt: 'Una casa y una llave' }),
      { title: 'Cinco causas que se suman', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cards', 'Poca oferta: se construye menos vivienda asequible de la que hace falta\nMás demanda: empleo y estudios se concentran en pocas ciudades, y hay más hogares con menos personas\nOtros usos: pisos turísticos, segundas residencias e inversión\nFinanciación: si suben los tipos de interés, la hipoteca sale más cara\nSalarios que crecen más despacio que los precios', 90, 190, 1100, 410, { color: INK }),
        foot('El peso de cada causa cambia de una ciudad a otra. ¿Cuál pesa más en la tuya?', GREY, 612, 90, 1100)],
        notes: 'Se presentan las causas que suelen citar economistas, administraciones y asociaciones. Lo que se discute es su peso relativo. Evita atribuir toda la culpa a un solo colectivo.' },
      { title: 'Precios y salarios (ejemplo)', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 175, w: 1060, h: 430, chartType: 'line', color: BR, grid: true, yTitle: 'Índice (año 1 = 100)', xTitle: 'Años', seriesName: 'Precio de la vivienda',
          data: [{ label: '0', value: 100 }, { label: '2', value: 106 }, { label: '4', value: 114 }, { label: '6', value: 121 }, { label: '8', value: 134 }, { label: '10', value: 151 }],
          series: [{ name: 'Salarios', values: [100, 103, 107, 111, 118, 125], color: TE }] }),
        foot('Cifras de ejemplo para ver la idea: si el precio sube más deprisa que el sueldo, cada año cuesta más acceder. Comprueba los datos reales de tu zona.', GREY, 612, 110, 1060)],
        notes: 'Datos ilustrativos, NO reales. Para datos reales de vivienda: INE (índice de precios de vivienda), Ministerio de Vivienda, Banco de España y portales inmobiliarios. Actualiza la gráfica con los de tu ciudad.' },
      { title: 'Cuánto cuesta entrar: comprar', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 180, w: 980, h: 320, stroke: '#c7d4e0', fontSize: 23,
          rows: [['Concepto (piso de 200.000 €, ejemplo)', 'Cuánto'], ['Entrada (20 %)', '40.000 €'], ['Impuestos y gastos (≈ 10 %)', '20.000 €'], ['Ahorro necesario para empezar', '60.000 €'], ['Hipoteca: 160.000 € a 30 años al 3,5 %', '718 € al mes']] }),
        foot('La cuota mensual se calcula con la fórmula del préstamo: más tipo de interés o más plazo cambian el resultado.', GREY, 535, 150, 980)],
        notes: 'Cálculo: cuota = 160.000 × r ÷ (1 − (1 + r)^−360), con r = 0,035 ÷ 12. Resultado: 718,47 €. Con un tipo del 2 %: unos 591 €; con el 5 %: unos 859 €. Las cifras son un ejemplo: pide a alguien del banco o usa un simulador del Banco de España.' },
      { title: '¿Qué parte del sueldo se va?', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 90, y: 175, w: 700, h: 430, chartType: 'hbar', color: BR, dataLabels: true, labelColor: INK, yTitle: '% de los ingresos netos', seriesName: 'Esfuerzo',
          data: [{ label: 'Hipoteca (718 €)', value: 35.9, color: BR }, { label: 'Alquiler (850 €)', value: 42.5, color: AM }, { label: 'Recomendado', value: 30, color: TE }] }),
        on(text('Hogar con <b>2.000 €</b> netos al mes:<br><br>718 ÷ 2.000 = <b>35,9 %</b><br>850 ÷ 2.000 = <b>42,5 %</b><br><br>Se suele considerar razonable no pasar del <b>30–35 %</b>.', 830, 215, 370, 380, { fontSize: 24, color: INK, lineHeight: 1.45 }), 'fade-left')],
        notes: 'El ratio cuota ÷ ingresos netos es un indicador habitual del «esfuerzo». Los umbrales (30 %, 35 %) son orientativos. Cifras de ejemplo: puedes cambiarlas por las de tu zona.' },
      { title: 'Medidas que se discuten', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 70, y: 175, w: 1140, h: 420, stroke: '#c7d4e0', fontSize: 23,
          rows: [['Medida', 'A favor', 'En contra'],
            ['Más vivienda pública y de alquiler asequible', 'Aumenta la oferta a precios moderados', 'Tarda años y requiere suelo y dinero público'],
            ['Limitar la subida del alquiler', 'Protege rápido a quien alquila', 'Puede reducir la oferta si los propietarios se retiran'],
            ['Regular los pisos turísticos', 'Devuelve viviendas al uso residencial', 'Afecta a ingresos de propietarios y al turismo'],
            ['Ayudas al alquiler y a la compra joven', 'Alivian el gasto del hogar', 'Si no crece la oferta, pueden subir los precios'],
            ['Agilizar licencias y liberar suelo', 'Se construye antes y más', 'Preocupa el impacto en el territorio']] }),
        foot('Casi nadie propone una sola medida: lo habitual es combinar varias.', GREY, 612, 70, 1140)],
        notes: 'Tabla neutral: cada medida tiene defensores y críticos y los estudios no siempre coinciden. Pide al alumnado que busque un dato o ejemplo (en España o fuera) a favor y en contra de cada una.' },
      { title: '¿Quién decide qué?', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['Estado', 'Impuestos, ayudas estatales y leyes generales (como la de alquileres o la hipotecaria).', NAVY], ['Comunidades autónomas', 'Tienen la competencia en vivienda: planes, vivienda protegida, algunas ayudas.', TE], ['Ayuntamientos', 'Deciden sobre el urbanismo: qué suelo se edifica y las licencias.', AM]], { y: 215, h: 260, ds: 22 }),
        foot('Por eso las medidas y los precios pueden ser muy distintos según el lugar donde vivas.', GREY, 510, 90, 1100)],
        notes: 'Reparto simplificado de competencias en España. Comprueba la normativa vigente: puede variar y cambiar. En otros países, el reparto es distinto.' },
      { layout: 'blank', bg: PAPER, extra: [vote('¿Cuál crees que ayudaría más?', ['Construir más vivienda pública', 'Limitar el precio de los alquileres', 'Regular los pisos turísticos', 'Ayudas para jóvenes'])],
        notes: 'Votación de opinión sin respuesta correcta. Pide que justifiquen la respuesta con un argumento (y un posible inconveniente).' },
      { layout: 'blank', bg: '#e1eaf0', extra: [quiz('Una hipoteca cuesta 700 € al mes y el hogar ingresa 2.000 € netos. ¿Qué parte del sueldo se va?', ['25 %', '35 %', '45 %', '70 %'], 1)],
        notes: '700 ÷ 2.000 = 0,35 = 35 %.' },
      closing({ bg: PAPER, accent: TE, inkc: INK, grey: GREY, title: 'Debate: buscar un pacto', seconds: 480, end: '¡Hay pacto!',
        body: 'Cuatro papeles: una joven inquilina, un pequeño propietario, el ayuntamiento y una promotora de vivienda. Cada grupo defiende sus intereses y propone una medida. Después, entre todos, buscad un pacto que cada parte pueda aceptar.' }),
    ]), INK));
  } },

  // 5 · Lotería de Navidad: probabilidades y trampas.
  edu_news_lottery: { name: 'Lotería de Navidad: probabilidades y trampas', cat: 'edu', summary: 'La Lotería de Navidad del 22 de diciembre de 2026 con matemáticas: cómo funciona el décimo, los premios, la probabilidad real de ganar, cuánto se devuelve de media, los impuestos del premio y cómo evitar estafas y problemas con participaciones', make: () => {
    const PAPER = '#fbf3f0', INK = '#2a1a1a', GREY = '#6b5252', RE = '#c0392b', GR = '#2e8f5a', GD = '#c98a1e', BL = '#2f6db0', TE = '#1f8f8f', S = FF.space;
    return numbered(ink(build({ name: 'Lotería de Navidad: probabilidades y trampas', palette: 'warm', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: PAPER, accent: RE, inkc: INK, grey: GREY, label: 'MATEMÁTICAS · MARTES 22 DE DICIEMBRE DE 2026', title: 'Lotería de Navidad: probabilidades y trampas', size: 54,
        sub: 'Cuánto cuesta, cuánto toca, qué probabilidad hay de ganar de verdad y cómo no caer en estafas.', art: ticketArt(RE, GR), alt: 'Un décimo de lotería con cinco cifras' }),
      { title: 'Cómo funciona', layout: 'titleOnly', bg: PAPER, extra: [
        ...steps('Hay 100.000 números, del 00000 al 99999\nCada número se imprime en muchas series\nUn billete tiene 10 décimos: cada décimo cuesta 20 €\nEl 22 de diciembre se sacan los números premiados\nCada décimo del número premiado cobra el premio', 195, 340, INK),
        foot('El sorteo se celebra en Madrid, y los niños y niñas de San Ildefonso cantan los números.', GREY, 570, 110, 1060)],
        notes: 'Comprueba el precio del décimo y las condiciones en la web oficial de Loterías y Apuestas del Estado. En los últimos sorteos el décimo cuesta 20 €.' },
      { title: 'Los premios, por décimo', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 200, y: 180, w: 880, h: 360, stroke: '#e2cfc9', fontSize: 25,
          rows: [['Premio', 'Cuántos', 'Por décimo'], ['El Gordo', '1', '400.000 €'], ['Segundo', '1', '125.000 €'], ['Tercero', '1', '50.000 €'], ['Cuartos', '2', '20.000 €'], ['Quintos', '8', '6.000 €'], ['La pedrea y reintegros', 'muchos', '1.000 € · 20 €']] }),
        foot('Cifras del último sorteo conocido: comprueba las del sorteo de 2026 en Loterías y Apuestas del Estado.', GREY, 570, 200, 880)],
        notes: 'El Gordo se reparte a 400.000 € por décimo (4 millones por serie). Revisa el cuadro de premios del sorteo de 2026 antes de presentarlo.' },
      { title: 'La probabilidad real', layout: 'titleOnly', bg: PAPER, extra: [
        img(dots100(RE, RE), 60, 175, 420, 420, 'Cien puntos, uno marcado'),
        on(text(`<div style="font-size:66px;font-weight:800;color:${deep(RE, PAPER)};line-height:1.05">1 / 100.000</div><div>de que tu número sea El Gordo (0,001 %)</div>`, 510, 215, 330, 300, { fontSize: 26, textAlign: 'center', color: INK }), 'zoom-in'),
        on(text('A la izquierda, <b>1 de 100</b>. Para ver la del Gordo habría que juntar <b>mil cuadrículas</b> como esa y marcar un solo punto.', 860, 215, 340, 330, { fontSize: 24, color: INK, lineHeight: 1.45 }), 'fade-left')],
        notes: 'Con un décimo, la probabilidad de que su número salga como Gordo es 1 entre 100.000 = 0,001 %. Comprar más décimos del mismo número no cambia la probabilidad: solo multiplica el premio si toca. Comprar números distintos multiplica la probabilidad, pero también lo que gastas.' },
      { title: 'Cuánto se devuelve de media', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 90, y: 175, w: 500, h: 420, chartType: 'doughnut', color: GR,
          data: [{ label: 'Vuelve en premios', value: 14, color: GR }, { label: 'No vuelve', value: 6, color: RE }] }),
        on(text('De cada <b>20 €</b> que juegas, el sorteo reparte en premios, de media, alrededor del <b>70 %</b>: <b>14 €</b>.<br><br>Con 5 décimos al año durante 20 años (2.000 €), lo esperable es recuperar unos <b>1.400 €</b>. Cada uno puede tener más suerte o menos.', 650, 205, 550, 400, { fontSize: 25, color: INK, lineHeight: 1.45 }), 'fade-left')],
        notes: 'Se llama valor esperado. La ley destina un porcentaje de lo recaudado a premios (alrededor del 70 % en Navidad); comprueba el dato. No es una guía de inversión: es un juego de azar. No tiene sentido jugar para «ganar dinero», solo como ocio si se hace con moderación.' },
      { title: 'El premio y Hacienda', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 90, y: 175, w: 720, h: 430, chartType: 'waterfall', color: GR, dataLabels: true,
          data: [{ label: 'Premio (1 décimo)', value: 400000 }, { label: 'Retención', value: -72000 }, { label: 'Cobras', value: 0 }] }),
        on(text('Los premios de más de <b>40.000 €</b> tributan un <b>20 %</b> solo sobre lo que pasa de esa cantidad.<br><br>400.000 − 40.000 = 360.000<br>20 % de 360.000 = <b>72.000 €</b><br>Cobras <b>328.000 €</b>.', 850, 205, 350, 400, { fontSize: 23, color: INK, lineHeight: 1.45 }), 'fade-left')],
        notes: 'Comprueba el umbral exento y el tipo vigentes en la Agencia Tributaria o en Loterías: han cambiado en los últimos años. Los premios no cobrados prescriben pasado un plazo (tres meses desde la celebración del sorteo). En el País Vasco y Navarra, el régimen fiscal puede variar.' },
      { title: 'Participaciones y peñas', layout: 'titleOnly', bg: PAPER, extra: [
        ...row2([['Una participación', 'Es una parte de un décimo que se reparte entre varias personas. Cada una cobra su parte, y cada una tributa por ella.', BL],
          ['Para evitar disgustos', ul('Apuntar quién tiene qué parte y el número', 'Guardar el décimo en un lugar seguro y compartido', 'Fijar quién lo cobra y cuándo', 'Confirmar el recargo, si lo hay'), GR]], { y: 205, h: 340, ds: 22 }),
        foot('Las participaciones de bares, comercios y asociaciones deben corresponder a un décimo real: pide ver el décimo.', GREY, 570, 90, 1100)],
        notes: 'Casos frecuentes: participaciones vendidas por encima del importe del décimo, o de un décimo que no existe. Aconseja a los alumnos que, si la familia compra participaciones, comprueben quién las emite.' },
      { title: 'Estafas y trampas', layout: 'titleOnly', bg: PAPER, extra: [
        ...row3([['Décimos falsos', 'Ventas por redes sociales o WhatsApp de décimos «muy baratos» o «con premio asegurado».', RE], ['El mensaje del premio', 'Un SMS o correo dice que has ganado y te pide pagar «gastos» o tus datos bancarios.', GD], ['El comprobador falso', 'Páginas que dicen comprobar tu décimo y piden tus datos o un pago.', BL]], { y: 205, h: 270, ds: 22 }),
        foot('La lotería oficial no te cobra para darte un premio. Compra solo en administraciones autorizadas o en la web oficial.', GREY, 510, 90, 1100)],
        notes: 'Comprueba siempre en la página oficial de Loterías y Apuestas del Estado o en una administración autorizada. Si hay duda, no pagues ni des datos y avisa a un adulto o a la policía.' },
      { layout: 'blank', bg: PAPER, extra: [vote('¿Juegas a la lotería de Navidad?', ['Sí, todos los años', 'Solo si me lo regalan', 'No, pero juega mi familia', 'No juego'])],
        notes: 'Votación. Se puede hablar de la lotería como tradición, de la ilusión y de los riesgos del juego, especialmente en menores (está prohibido jugar a los menores de 18).' },
      { layout: 'blank', bg: '#f4e4de', extra: [quiz('Tienes un décimo del 12345. ¿Qué probabilidad tiene de ser El Gordo?', ['1 entre 10', '1 entre 1.000', '1 entre 100.000', '1 entre 20'], 2)],
        notes: 'Hay 100.000 números y uno solo es El Gordo. Comprar el mismo número varias veces no cambia la probabilidad.' },
      closing({ bg: PAPER, accent: RE, inkc: INK, grey: GREY, title: 'Simulamos el sorteo', seconds: 300, end: '¡Fin del sorteo!',
        body: 'Cada alumno elige un número del 00 al 99 (100 posibles). Se saca uno al azar con dados o una app. ¿Cuántos acertamos? Repetid 5 veces: ¿se parece el resultado a lo esperado (1 de cada 100 por persona)? Luego calculad lo mismo con 5 cifras.' }),
    ]), INK));
  } },

};
