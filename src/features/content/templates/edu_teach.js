// Example presentations: Formación del profesorado y pedagogía (claustros, cursos de formación, oposiciones). Each one:
// { name, summary, cat: 'edu', make() } → a deck (see kit.js). Metodologías explicadas para aplicarlas el lunes:
// qué es, cómo se hace, errores comunes, una votación para el claustro y un reto para el aula. Dibujos propios (SVG
// como data URL; nada de imágenes externas) y referencias solo reales y atribuidas.

import { build, text, card, ul, A, withAnims, numbered, glow, dg, timer, tableBlock, pollBlock, base, deep } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 30, fontSize: 32, x: 70, y: 60, w: 1140, h: 600, ...props });
const vote = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, ...props });
const FF = { space: "'Space Grotesk', sans-serif" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });
const GREY = '#5a6170';
// Two-by-two cards from [title, desc, color] rows: the title in its colour, dark enough to read on the card (deep).
const grid = (items, { x0 = 90, y0 = 205, dx = 560, dy = 205, w = 530, h = 180, bg = '#ffffff', color = '#1f2430', ts = 26, ds = 21 } = {}) =>
  items.map(([t, d, col], i) => { const x = x0 + (i % 2) * dx, y = y0 + Math.floor(i / 2) * dy;
    return on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, x, y, w, h, bg, { color, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up'); });
// A row of three cards (title, text, colour), same look.
const row3 = (items, { y = 210, h = 300, bg = '#ffffff', color = '#1f2430', ts = 25, ds = 21 } = {}) =>
  items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, 90 + i * 375, y, 350, h, bg, { color, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up'));
// Two columns to compare (left and right), each with a heading in its colour and a list.
const versus = ([lt, lc, li], [rt, rc, ri], { y = 200, h = 330, bg = '#ffffff', color = '#1f2430' } = {}) => [
  on(card(`<b style="font-size:27px;color:${deep(lc, bg)}">${lt}</b>${ul(...li)}`, 90, y, 530, h, bg, { color, radius: 16, borderColor: lc, fontSize: 22, pad: [20, 24, 18, 24] }), 'fade-right'),
  on(card(`<b style="font-size:27px;color:${deep(rc, bg)}">${rt}</b>${ul(...ri)}`, 660, y, 530, h, bg, { color, radius: 16, borderColor: rc, fontSize: 22, pad: [20, 24, 18, 24] }), 'fade-left')];
// The cover: a label, the title, a line, and a drawing on the right (the title's box ends well before it: in Arabic
// the text goes to the right of its box).
const cover = ({ bg, accent, inkc, sub, label, title, art, alt, size = 70 }) => ({ layout: 'blank', bg, back: [glow(1000, -120, 560, accent, bg, 16), glow(-120, 560, 520, accent, bg, 10)], extra: [
  text(label, 90, 150, 700, 36, { fontSize: 22, letterSpacing: 3, color: deep(accent, bg), fontWeight: 700 }),
  text(title, 84, 196, 730, 230, { fontSize: size, fontWeight: 800, color: inkc, lineHeight: 1.04, fontFamily: FF.space }),
  text(sub, 90, 440, 680, 140, { fontSize: 26, color: GREY, lineHeight: 1.4 }),
  after(img(art, 860, 160, 340, 400, alt), 'fade-left', { duration: 800 })] });
// The closing: a challenge for the classroom, and a timer to plan it right there.
const closing = ({ bg, accent, inkc, title, body, seconds, end }) => ({ layout: 'blank', bg, back: [glow(1000, 420, 520, accent, bg, 14)], transition: 'zoom', extra: [
  text(title, 84, 120, 820, 140, { fontSize: 50, fontWeight: 800, color: inkc, fontFamily: FF.space, lineHeight: 1.08 }),
  text(body, 84, 290, 780, 280, { fontSize: 26, color: '#4f5666', lineHeight: 1.45 }),
  timer(seconds, 930, 220, 280, { color: accent, endText: end })] });

// ---- Drawings (ours) ---------------------------------------------------------------
// A house and a classroom joined by arrows: the flipped classroom.
const flipArt = (c) => svgURL(340, 400, `<path d="M40 150 L120 80 L200 150 V250 H40 Z" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/><rect x="100" y="190" width="40" height="60" fill="${c}"/>`
  + `<rect x="150" y="270" width="160" height="110" rx="10" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/><rect x="170" y="290" width="120" height="50" rx="4" fill="#2f3a4a"/>`
  + `<path d="M215 120 Q300 140 290 240" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M276 228 L290 250 L304 228" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
// A badge, stars and level bars: games and gamification.
const gameArt = (c) => svgURL(340, 400, `<circle cx="170" cy="150" r="90" fill="#ffffff" stroke="${c}" stroke-width="10"/>`
  + `<path d="M170 95 L186 132 L226 135 L195 160 L205 199 L170 177 L135 199 L145 160 L114 135 L154 132 Z" fill="${c}"/>`
  + `<path d="M120 230 L100 300 L135 285 L150 320 L170 240 Z" fill="${c}" opacity="0.6"/><path d="M220 230 L240 300 L205 285 L190 320 L170 240 Z" fill="${c}" opacity="0.6"/>`
  + [0, 1, 2, 3].map(i => `<rect x="${60 + i * 60}" y="${370 - (i + 1) * 12}" width="40" height="${(i + 1) * 12}" rx="4" fill="#c9d0dc"/>`).join(''));
// A speech bubble with a tick and an arrow forward: feedback.
const feedbackArt = (c) => svgURL(340, 400, `<path d="M30 60 h260 a24 24 0 0 1 24 24 v130 a24 24 0 0 1 -24 24 h-170 l-46 40 v-40 h-44 a24 24 0 0 1 -24 -24 v-130 a24 24 0 0 1 24 -24 z" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/>`
  + `<path d="M90 150 L135 195 L230 105" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="M60 340 H250" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M228 316 L256 340 L228 364" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`);
// A rubric: a grid with levels filled in.
const rubricArt = (c) => svgURL(340, 400, `<rect x="30" y="50" width="280" height="300" rx="14" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/>`
  + [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(k => `<rect x="${50 + k * 64}" y="${80 + r * 66}" width="54" height="52" rx="6" fill="${k === 0 ? '#e4e8f0' : r === k - 1 || (r === 3 && k === 3) ? c : '#f3f5f9'}"/>`).join('')).join(''));
// Three paths into one: Universal Design for Learning.
const duaArt = (a, b, c) => svgURL(340, 400, `<path d="M50 60 C50 200 170 200 170 300" fill="none" stroke="${a}" stroke-width="18" stroke-linecap="round"/>`
  + `<path d="M170 60 V300" fill="none" stroke="${b}" stroke-width="18" stroke-linecap="round"/><path d="M290 60 C290 200 170 200 170 300" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="round"/>`
  + `<circle cx="170" cy="330" r="38" fill="#ffffff" stroke="#2f3a4a" stroke-width="8"/><circle cx="170" cy="330" r="12" fill="#2f3a4a"/>`);
// A lightbulb over a box: a project and its product.
const pblArt = (c) => svgURL(340, 400, `<circle cx="170" cy="120" r="70" fill="#fff6d6" stroke="${c}" stroke-width="8"/><rect x="145" y="185" width="50" height="34" rx="6" fill="#c9d0dc"/>`
  + `<path d="M150 120 L165 140 L190 100" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="M60 270 L170 230 L280 270 L170 310 Z" fill="${c}" opacity="0.85"/><path d="M60 270 V340 L170 380 V310 Z" fill="${c}"/><path d="M280 270 V340 L170 380 V310 Z" fill="${c}" opacity="0.7"/>`);
// Four people around a table: cooperative learning.
const coopArt = (cols) => svgURL(340, 400, `<rect x="90" y="150" width="160" height="110" rx="20" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/>`
  + [[170, 90], [310, 205], [170, 320], [30, 205]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="34" fill="${cols[i]}"/><circle cx="${x}" cy="${y - 4}" r="12" fill="#ffffff" opacity="0.85"/>`).join('')
  + `<path d="M130 205 H210" stroke="#c9d0dc" stroke-width="5" stroke-dasharray="6 8"/><path d="M170 175 V235" stroke="#c9d0dc" stroke-width="5" stroke-dasharray="6 8"/>`);
// A chip next to an open book: AI and teaching.
const aiArt = (c) => svgURL(340, 400, `<rect x="40" y="70" width="150" height="150" rx="18" fill="#2f3a4a"/><rect x="75" y="105" width="80" height="80" rx="8" fill="${c}"/>`
  + [0, 1, 2, 3].map(i => `<rect x="${58 + i * 34}" y="52" width="12" height="18" rx="3" fill="#2f3a4a"/><rect x="${58 + i * 34}" y="220" width="12" height="18" rx="3" fill="#2f3a4a"/>`).join('')
  + `<path d="M120 300 Q190 270 250 300 V370 Q190 340 120 370 Z" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/><path d="M250 300 Q310 270 330 300 V370 Q310 340 250 370" fill="#ffffff" stroke="#c9d0dc" stroke-width="5"/>`);
// Puzzle pieces fitting: a learning situation and its elements.
const puzzleArt = (a, b, c, d) => { const piece = (x, y, col) => `<path d="M${x} ${y} h48 a14 14 0 1 1 24 0 h48 v48 a14 14 0 1 0 0 24 v48 h-120 Z" fill="${col}"/>`;
  return svgURL(340, 400, piece(40, 60, a) + piece(170, 60, b) + piece(40, 200, c) + piece(170, 200, d)); };
// Desks in rows facing a board: the classroom.
const classArt = (c) => svgURL(340, 400, `<rect x="40" y="40" width="260" height="70" rx="8" fill="#2f3a4a"/><path d="M70 80 h80" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`
  + [0, 1, 2].map(r => [0, 1, 2].map(k => `<rect x="${50 + k * 90}" y="${150 + r * 75}" width="70" height="40" rx="6" fill="#ffffff" stroke="#c9d0dc" stroke-width="4"/><circle cx="${85 + k * 90}" cy="${205 + r * 75}" r="10" fill="${c}" opacity="${0.5 + 0.15 * r}"/>`).join('')).join(''));

export default {

  // 1 · Aula invertida.
  edu_teach_flipped: { name: 'Formación docente: el aula invertida', cat: 'edu', summary: 'El aula invertida (flipped classroom) de Bergmann y Sams: qué es, qué pasa antes, durante y después de clase, ventajas y riesgos, cómo empezar con una sola unidad y una votación para el claustro', make: () => {
    const BG = '#f5f6fa', INK = '#1f2433', BL = '#3f6ad8', OR = '#e0873b', GR = '#2e9e6b', RE = '#d8504a';
    return numbered(ink(build({ name: 'Formación docente: el aula invertida', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: BL, inkc: INK, label: 'FORMACIÓN DOCENTE · METODOLOGÍAS', title: 'El aula<br>invertida', sub: 'La explicación, en casa; la práctica, en clase, donde estás tú para ayudar.', art: flipArt(BL), alt: 'Una casa y un aula unidas por una flecha' }),
      { title: 'Qué es (y qué no es)', layout: 'titleOnly', bg: BG, extra: [
        text('Popularizada por Jonathan Bergmann y Aaron Sams, docentes de química en Colorado, a partir de 2007: grababan sus explicaciones para que el alumnado las viera antes y dedicaban la clase a resolver problemas.', 90, 190, 1100, 130, { fontSize: 26, color: INK, lineHeight: 1.45 }),
        ...versus(['Sí es', GR, ['Mover la explicación fuera del aula', 'Usar la clase para practicar, debatir y resolver dudas', 'Que el docente acompañe más y hable menos']],
          ['No es', RE, ['Mandar vídeos y desentenderse', 'Sustituir al docente por pantallas', 'Más deberes de los de siempre']], { y: 330, h: 300 })],
        notes: 'Aclara el malentendido más común: no es «poner vídeos». Lo que se invierte es el uso del tiempo de clase.' },
      { title: 'Antes, durante y después', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Antes (en casa)', 'Un vídeo corto o una lectura, con 2-3 preguntas para comprobar que se ha visto.', BL], ['Durante (en clase)', 'Dudas al empezar, práctica guiada, trabajo en grupo, el docente circula.', OR], ['Después', 'Aplicar en un reto o proyecto; repasar con preguntas de recuperación.', GR]], { y: 205, h: 320 })],
        notes: 'La clave está en el «durante»: si la clase sigue siendo una explicación, no se ha invertido nada.' },
      { title: 'El vídeo que funciona', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Corto', 'Mejor varios de pocos minutos que uno largo.', BL], ['Con tu voz', 'El alumnado conecta más con su docente que con un desconocido.', OR],
          ['Con una tarea', 'Dos o tres preguntas o un formulario para traer a clase.', GR], ['Accesible', 'Subtítulos y alternativa en texto para quien no tiene conexión.', RE]])],
        notes: 'Prevé la brecha digital: material en papel o la posibilidad de verlo en el centro.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué te frena más para probar el aula invertida?', ['El tiempo de preparar el material', 'Que no lo vean en casa', 'La brecha digital del alumnado', 'Nada: ya lo hago'])],
        notes: 'Votación para el claustro. Usa el resultado para orientar la siguiente diapositiva hacia el freno más votado.' },
      { title: 'Ventajas y riesgos', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Ventajas', GR, ['Cada cual ve la explicación a su ritmo', 'Más tiempo de clase para practicar', 'El docente detecta dificultades a tiempo']],
          ['Riesgos', RE, ['Quien no prepara se queda atrás', 'Depender de la conexión en casa', 'Cargar al alumnado con más trabajo']], { y: 200, h: 320 })],
        notes: 'Para quien no ha visto el material: un rincón en clase donde verlo los primeros minutos.' },
      { title: 'Cómo empezar', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Elige UNA unidad, no el curso entero\nGraba o selecciona 2-3 vídeos breves\nAñade preguntas para traer a clase\nDiseña la sesión de práctica en clase\nPregunta al alumnado qué le ha servido', 110, 200, 1060, 340, { color: INK })],
        notes: 'Empezar pequeño es lo que más éxito tiene. Al final de la unidad, recoger opiniones y ajustar.' },
      { layout: 'blank', bg: BG, extra: [quiz('En el aula invertida, ¿qué se hace sobre todo en clase?', ['Ver los vídeos todos juntos', 'Escuchar la explicación del docente', 'Practicar, resolver dudas y trabajar en grupo', 'Hacer exámenes'], 2)],
        notes: 'La clase se dedica a lo que más necesita al docente cerca: practicar y resolver dudas.' },
      closing({ bg: BG, accent: BL, inkc: INK, title: 'Tu primera unidad invertida', body: 'Elige una unidad de las próximas semanas y escribe: qué verán antes (y cómo comprobarás que lo han visto), qué harán en clase y cómo lo evaluarás. Compártelo con quien tengas al lado.', seconds: 600, end: '¡A planificar!' }),
    ]), INK));
  } },

  // 2 · Gamificación y aprendizaje basado en juegos.
  edu_teach_gamification: { name: 'Formación docente: gamificación', cat: 'edu', summary: 'Gamificación frente a aprendizaje basado en juegos: mecánicas (puntos, insignias, niveles, retos), motivación intrínseca y extrínseca, errores comunes, cómo diseñar una gamificación sencilla y un quiz para el claustro', make: () => {
    const BG = '#f7f5fb', INK = '#221f33', PU = '#7b5bd0', OR = '#e0873b', GR = '#2e9e6b', BL = '#3f6ad8', RE = '#d8504a';
    return numbered(ink(build({ name: 'Formación docente: gamificación', palette: 'violet', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'FORMACIÓN DOCENTE · METODOLOGÍAS', title: 'Gamificar<br>el aula', sub: 'Usar lo que hace atractivos a los juegos para aprender mejor, no solo para ganar puntos.', art: gameArt(PU), alt: 'Una insignia con una estrella y barras de nivel' }),
      { title: 'Dos cosas distintas', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Gamificación', PU, ['Elementos de juego en algo que no es un juego', 'Puntos, insignias, niveles, una narrativa', 'Ejemplo: la unidad como una misión con niveles']],
          ['Aprendizaje basado en juegos', OR, ['Aprender jugando a un juego concreto', 'Un juego de mesa, un escape room, un videojuego', 'Ejemplo: un escape room de matemáticas']], { y: 200, h: 330 })],
        notes: 'Distinguirlas evita confusiones en el claustro: se pueden combinar, pero no son lo mismo.' },
      { title: 'Las mecánicas más usadas', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Puntos', 'Reconocen el esfuerzo y el avance.', PU], ['Insignias', 'Señalan logros concretos: «experto en fracciones».', OR],
          ['Niveles', 'Muestran el progreso y desbloquean retos nuevos.', GR], ['Retos y narrativa', 'Una historia que da sentido a las tareas.', BL]])],
        notes: 'La narrativa suele ser lo que más engancha; los puntos solos se gastan pronto.' },
      { title: 'Motivación: dentro y fuera', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Intrínseca', GR, ['Aprender porque interesa o reta', 'Sentirse capaz, con autonomía', 'Dura más en el tiempo']],
          ['Extrínseca', OR, ['Aprender por el premio o la nota', 'Útil para arrancar', 'Si es lo único, desaparece con el premio']], { y: 200, h: 300 }),
        text('Según la teoría de la autodeterminación (Deci y Ryan), la motivación crece con autonomía, competencia y relación con los demás.', 90, 530, 1100, 80, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'El riesgo de la gamificación mal diseñada es sustituir la curiosidad por la caza de puntos.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Has gamificado alguna vez una unidad?', ['Sí, y funcionó', 'Sí, pero se desinfló', 'No, pero quiero probar', 'No lo veo para mi materia'])],
        notes: 'Votación para el claustro. Invita a quien votó «funcionó» a contar qué hizo.' },
      { title: 'Errores comunes', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Solo puntos', 'Sin historia ni retos con sentido, la novedad dura dos semanas.', RE], ['Ranking público', 'Puede hundir a quien va al final: mejor progreso personal o por equipos.', OR], ['Demasiado complejo', 'Si las reglas cuestan más que el contenido, simplifica.', PU]], { y: 205, h: 310 })],
        notes: 'El ranking público es el error más delicado: valora alternativas que no expongan a nadie.' },
      { title: 'Diseña una gamificación sencilla', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Objetivo de aprendizaje primero, juego después\nUna narrativa breve que dé sentido\n3-4 niveles con retos de dificultad creciente\nRecompensas que reconozcan el avance, no solo el acierto\nRevisa a mitad: ¿siguen motivados? ¿aprenden?', 110, 200, 1060, 340, { color: INK })],
        notes: 'Si el objetivo de aprendizaje no está claro, ninguna mecánica lo salva.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué es aprendizaje basado en juegos (y no gamificación)?', ['Dar puntos por entregar tareas', 'Jugar a un escape room de la materia', 'Un ranking semanal de notas', 'Insignias por asistencia'], 1)],
        notes: 'El escape room es un juego en sí: aprendizaje basado en juegos. Lo demás son elementos de juego.' },
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Tu misión de prueba', body: 'Piensa en una unidad y dale una narrativa en una frase («Hay que salvar la ciudad de…»), tres niveles y una recompensa que reconozca el progreso. Cuéntaselo a un compañero en dos minutos.', seconds: 480, end: '¡Misión lista!' }),
    ]), INK));
  } },

  // 3 · Evaluación formativa.
  edu_teach_assessment: { name: 'Formación docente: evaluación formativa', cat: 'edu', summary: 'La evaluación formativa: para qué sirve, diferencia con calificar, un buen feedback, autoevaluación y coevaluación, tickets de salida y otras técnicas rápidas, con una votación y un reto para el aula', make: () => {
    const BG = '#f4f7f5', INK = '#1d2622', GR = '#2e9e6b', BL = '#3f6ad8', OR = '#e0873b', PU = '#7b5bd0', RE = '#d8504a';
    return numbered(ink(build({ name: 'Formación docente: evaluación formativa', palette: 'forest', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: GR, inkc: INK, label: 'FORMACIÓN DOCENTE · EVALUACIÓN', title: 'Evaluar<br>para aprender', sub: 'La evaluación formativa no pone notas: da información para mejorar mientras aún se está a tiempo.', art: feedbackArt(GR), alt: 'Un bocadillo con una marca de verificación y una flecha' }),
      { title: 'Evaluar no es calificar', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Evaluación formativa', GR, ['Durante el aprendizaje', 'Para ajustar la enseñanza y orientar al alumnado', 'Información: qué va bien y qué falta']],
          ['Calificación', BL, ['Al final de un periodo', 'Para certificar un resultado', 'Un número o una nota']], { y: 200, h: 320 }),
        text('Paul Black y Dylan Wiliam («Inside the Black Box», 1998) reunieron la investigación que muestra su efecto en el aprendizaje.', 90, 540, 1100, 70, { fontSize: 21, color: GREY, textAlign: 'center' })],
        notes: 'La diferencia clave: cuándo se hace y para qué se usa la información.' },
      { title: 'Un feedback que sirve', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['¿Adónde voy?', 'El objetivo y cómo es un buen trabajo.', GR], ['¿Cómo voy?', 'Qué está ya conseguido, con ejemplos concretos.', BL], ['¿Qué sigue?', 'Un paso concreto para mejorar.', OR]], { y: 205, h: 260 }),
        text('Las tres preguntas del feedback según John Hattie y Helen Timperley (2007).', 90, 500, 1100, 50, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Un «bien» o un «mejorable» no dan información. Pide al claustro reescribir un comentario vago con estas tres preguntas.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué haces más a menudo al corregir un trabajo?', ['Pongo nota y poco comentario', 'Comentario general', 'Comentarios concretos para mejorar', 'Les pido que lo corrijan y vuelvan a entregar'])],
        notes: 'Votación para el claustro, sin juicios. Abre la conversación sobre el tiempo que exige un buen feedback.' },
      { title: 'Que el alumnado también evalúe', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Autoevaluación', PU, ['Con una lista de criterios clara', 'Antes de entregar: «¿lo cumple?»', 'Desarrolla la autonomía']],
          ['Coevaluación', OR, ['Entre compañeros, con una guía', 'Comentarios respetuosos y concretos', 'Aprenden también al evaluar']], { y: 200, h: 320 })],
        notes: 'Sin criterios claros, la autoevaluación se convierte en «me pongo un 10». Usa una rúbrica o una lista de control.' },
      { title: 'Técnicas rápidas para el aula', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Ticket de salida', 'Una pregunta al terminar: lo entregan al salir y lo lees en 5 minutos.', GR], ['Semáforo', 'Verde, amarillo o rojo: cómo de seguros se sienten.', RE],
          ['Pizarras blancas', 'Todos responden a la vez y lo ves de un vistazo.', BL], ['Votación en directo', 'Una pregunta en el móvil y los resultados al momento.', PU]])],
        notes: 'El ticket de salida es la técnica con mejor relación esfuerzo-información. La votación en directo se puede hacer con esta misma herramienta.' },
      { title: 'Ejemplo de ticket de salida', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 190, y: 190, w: 900, h: 300, stroke: '#cfdad3',
          rows: [['Pregunta', 'Respuesta'], ['Lo más importante que he aprendido hoy', ''], ['Algo que todavía no entiendo', ''], ['Del 1 al 4, ¿cómo de seguro/a me siento?', '']] }),
        text('Tres preguntas, un minuto. Mañana empiezas la clase por lo que más se repitió en la segunda.', 190, 520, 900, 70, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Lo importante es usar la información: si nadie cambia la clase por lo que dicen los tickets, el alumnado deja de tomárselos en serio.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál de estos es un ejemplo de evaluación FORMATIVA?', ['El examen final de la evaluación', 'Un ticket de salida que cambia la clase siguiente', 'La nota media del trimestre', 'El boletín de notas'], 1)],
        notes: 'Formativa es la que se usa para ajustar mientras se aprende.' },
      closing({ bg: BG, accent: GR, inkc: INK, title: 'Tu primer ticket de salida', body: 'Escribe ahora el ticket de salida de tu próxima clase: una pregunta sobre lo esencial y otra sobre lo que no ha quedado claro. Y decide qué harás al día siguiente con las respuestas.', seconds: 300, end: '¡Listo!' }),
    ]), INK));
  } },

  // 4 · Diseñar una rúbrica.
  edu_teach_rubric: { name: 'Formación docente: diseñar una rúbrica', cat: 'edu', summary: 'Cómo diseñar una rúbrica paso a paso: criterios, niveles de logro y descriptores, una rúbrica de ejemplo para una exposición oral, otra en blanco para rellenar, errores frecuentes y un quiz', make: () => {
    const BG = '#f6f5f1', INK = '#24221c', OR = '#e0873b', BL = '#3f6ad8', GR = '#2e9e6b', RE = '#d8504a', PU = '#7b5bd0';
    return numbered(ink(build({ name: 'Formación docente: diseñar una rúbrica', palette: 'warm', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: OR, inkc: INK, label: 'FORMACIÓN DOCENTE · EVALUACIÓN', title: 'Diseñar<br>una rúbrica', sub: 'Una tabla que dice, antes de empezar, cómo es un trabajo excelente. Evaluar se vuelve claro y justo.', art: rubricArt(OR), alt: 'Una rejilla con niveles marcados' }),
      { title: 'Las piezas de una rúbrica', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Criterios', 'Qué se evalúa: contenido, organización, expresión…', OR], ['Niveles de logro', 'Cuatro suele bastar: inicial, en proceso, conseguido, excelente.', BL], ['Descriptores', 'Lo que se observa en cada nivel de cada criterio.', GR]], { y: 205, h: 290 })],
        notes: 'Los descriptores son lo que da valor a la rúbrica: tienen que poder observarse.' },
      { title: 'Ejemplo: exposición oral', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 400, stroke: '#ddd6c8',
          rows: [['Criterio', 'Inicial', 'En proceso', 'Conseguido', 'Excelente'],
            ['Contenido', 'Ideas sueltas o con errores', 'Ideas correctas pero incompletas', 'Ideas correctas y completas', 'Completas, con ejemplos propios'],
            ['Organización', 'Sin orden claro', 'Orden a ratos', 'Introducción, desarrollo y cierre', 'Además, transiciones claras'],
            ['Expresión oral', 'Lee el texto', 'Lee casi siempre', 'Habla con apoyo en notas', 'Habla con naturalidad y mira al público'],
            ['Tiempo', 'Muy por debajo o por encima', 'Se desvía bastante', 'Se ajusta con poco margen', 'Se ajusta exactamente']] })],
        notes: 'Repasa en voz alta cómo cambia cada descriptor de un nivel a otro: lo que cambia es observable.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Compartes la rúbrica con el alumnado ANTES de la tarea?', ['Siempre', 'A veces', 'Solo al corregir', 'No uso rúbricas'])],
        notes: 'Votación para el claustro. Compartirla antes convierte la rúbrica en una guía de trabajo, no solo de corrección.' },
      { title: 'Paso a paso', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Parte de los criterios de evaluación de tu programación\nElige 3-5 criterios, no más\nDescribe primero el nivel «conseguido»\nDespués el excelente y los inferiores\nPruébala con un trabajo real y ajústala', 110, 200, 1060, 340, { color: INK })],
        notes: 'Empezar por «conseguido» ayuda: es lo que esperamos de la mayoría.' },
      { title: 'Errores frecuentes', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Palabras vagas', '«Bien», «regular», «poco»: no se pueden observar.', RE], ['Demasiados criterios', 'Más de cinco hace la rúbrica imposible de usar.', OR],
          ['Contar en vez de valorar', '«Tres fuentes» no garantiza que sean buenas.', PU], ['Niveles que se solapan', 'Cada trabajo debe caer en un solo nivel.', BL]])],
        notes: 'El error más común es el lenguaje vago. Pide que cambien «bien organizado» por algo observable.' },
      { title: 'Tu rúbrica (en blanco)', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 380, stroke: '#ddd6c8',
          rows: [['Criterio', 'Inicial', 'En proceso', 'Conseguido', 'Excelente'], ['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']] }),
        text('Rellénala con una tarea de tu materia: empieza por la columna «Conseguido».', 90, 580, 1100, 50, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Plantilla para trabajar en el taller: se puede editar directamente en la tabla.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es el mejor descriptor para «Expresión oral: conseguido»?', ['Lo hace bien', 'Habla con apoyo en notas, sin leer todo el texto', 'Regular', 'Mejor que la vez anterior'], 1)],
        notes: 'El descriptor observable es el que cualquier docente aplicaría igual.' },
      closing({ bg: BG, accent: OR, inkc: INK, title: 'Una rúbrica para tu próxima tarea', body: 'Elige una tarea de este trimestre y escribe sus 3 criterios y el nivel «conseguido» de cada uno. Después, intercambiadla por parejas: ¿la aplicaría igual otra persona?', seconds: 600, end: '¡Rúbrica lista!' }),
    ]), INK));
  } },

  // 5 · Diseño Universal para el Aprendizaje.
  edu_teach_dua: { name: 'Formación docente: Diseño Universal para el Aprendizaje', cat: 'edu', summary: 'El Diseño Universal para el Aprendizaje (DUA) de CAST y la inclusión: por qué diseñar para la diversidad desde el principio, sus tres principios (implicación, representación, acción y expresión), ejemplos de aula y una votación', make: () => {
    const BG = '#f4f6fa', INK = '#1e2433', TE = '#1f8f8f', BL = '#3f6ad8', OR = '#e0873b', PU = '#7b5bd0', GR = '#2e9e6b';
    return numbered(ink(build({ name: 'Formación docente: Diseño Universal para el Aprendizaje', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: TE, inkc: INK, label: 'FORMACIÓN DOCENTE · INCLUSIÓN', title: 'Diseño Universal<br>para el<br>Aprendizaje', size: 58, sub: 'Diseñar las clases para la diversidad desde el principio, en lugar de adaptar después.', art: duaArt(OR, BL, PU), alt: 'Tres caminos distintos que llegan a la misma meta' }),
      { title: 'La idea de partida', layout: 'titleOnly', bg: BG, extra: [
        text('El DUA lo desarrolló CAST (Center for Applied Special Technology, EE. UU.) a partir de los años 90. Toma la idea del diseño universal en arquitectura: una rampa sirve a quien va en silla de ruedas, pero también a quien lleva un carro o una maleta.', 90, 190, 1100, 160, { fontSize: 26, color: INK, lineHeight: 1.45 }),
        ...row3([['Sin alumno «medio»', 'Cada aula es diversa: diseñamos para esa variedad.', TE], ['Barreras, no déficits', 'Buscamos qué del diseño impide aprender.', OR], ['Desde el principio', 'Menos adaptaciones a posteriori.', PU]], { y: 370, h: 210 })],
        notes: 'En España, la LOMLOE recoge el DUA como principio de atención a la diversidad.' },
      { title: 'Los tres principios', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Implicación', 'El porqué: motivar y mantener el interés de formas distintas.', OR], ['Representación', 'El qué: presentar la información de varias maneras.', BL], ['Acción y expresión', 'El cómo: dejar demostrar lo aprendido de formas diversas.', PU]], { y: 205, h: 290 }),
        text('Fuente: CAST, pautas del Diseño Universal para el Aprendizaje (versión 3.0, 2024).', 90, 520, 1100, 50, { fontSize: 21, color: GREY, textAlign: 'center' })],
        notes: 'Cada principio se asocia a redes cerebrales distintas en el modelo de CAST: afectivas, de reconocimiento y estratégicas.' },
      { title: 'Múltiples formas de implicación', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Elegir', 'Dar opciones de tema, orden o formato.', OR], ['Relevancia', 'Conectar con la vida y los intereses del grupo.', GR],
          ['Reto ajustado', 'Tareas con varios niveles de dificultad.', BL], ['Clima seguro', 'Equivocarse forma parte de aprender.', PU]])],
        notes: 'Pequeñas elecciones (orden de las tareas, con quién trabajar) ya aumentan la implicación.' },
      { title: 'Múltiples formas de representación', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Texto y audio', 'El mismo contenido leído y escuchado.', BL], ['Visual', 'Esquemas, imágenes, vídeos con subtítulos.', TE],
          ['Vocabulario', 'Glosarios y apoyo para palabras clave.', OR], ['Ideas previas', 'Activarlas antes de lo nuevo.', PU]])],
        notes: 'Subtítulos y lectura en voz alta ayudan a muchos más alumnos que los que tienen una necesidad diagnosticada.' },
      { title: 'Múltiples formas de acción y expresión', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Formatos', 'Escrito, oral, en vídeo, en una presentación.', PU], ['Herramientas', 'Dictado, corrector, calculadora cuando no es lo evaluado.', BL],
          ['Planificar', 'Guías y listas de pasos para tareas largas.', GR], ['Feedback', 'Revisiones intermedias antes de la entrega.', OR]])],
        notes: 'La pregunta clave: ¿qué estoy evaluando? Si es la comprensión de la historia, ¿importa que la cuenten por escrito o en un audio?' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué principio del DUA te resulta más fácil de aplicar mañana?', ['Implicación', 'Representación', 'Acción y expresión', 'Ya aplico los tres'])],
        notes: 'Votación para el claustro. Agrupa después a los docentes por el principio que eligieron para compartir ideas.' },
      { layout: 'blank', bg: BG, extra: [quiz('Dejar elegir entre entregar un trabajo escrito o un audio aplica sobre todo el principio de…', ['Implicación', 'Representación', 'Acción y expresión', 'Ninguno'], 2)],
        notes: 'Elegir cómo demostrar lo aprendido es acción y expresión.' },
      closing({ bg: BG, accent: TE, inkc: INK, title: 'Una barrera menos', body: 'Piensa en una actividad de tu próxima semana. ¿Qué barrera puede encontrar alguien de tu grupo? Escribe un cambio para cada principio: una opción de implicación, una de representación y una de expresión.', seconds: 600, end: '¡Diseño listo!' }),
    ]), INK));
  } },

  // 6 · Aprendizaje basado en proyectos.
  edu_teach_pbl: { name: 'Formación docente: aprendizaje basado en proyectos', cat: 'edu', summary: 'El aprendizaje basado en proyectos (ABP): la pregunta guía, las fases de un proyecto, un producto final para un público real, cómo evaluarlo, errores habituales, una votación y un reto para diseñar el tuyo', make: () => {
    const BG = '#f8f6f1', INK = '#26221a', AM = '#d79b2b', GR = '#2e9e6b', BL = '#3f6ad8', RE = '#d8504a', PU = '#7b5bd0';
    return numbered(ink(build({ name: 'Formación docente: aprendizaje basado en proyectos', palette: 'warm', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: AM, inkc: INK, label: 'FORMACIÓN DOCENTE · METODOLOGÍAS', title: 'Aprender<br>con proyectos', sub: 'Una pregunta que importa, varias semanas de trabajo y un producto que alguien de verdad va a ver.', art: pblArt(AM), alt: 'Una bombilla sobre una caja' }),
      { title: 'Qué hace que un proyecto lo sea', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Una pregunta guía', 'Abierta, retadora y con sentido para el alumnado.', AM], ['Indagación', 'Investigan, preguntan, prueban: no copian.', BL],
          ['Voz y elección', 'Toman decisiones sobre el cómo.', GR], ['Producto público', 'Lo presentan a alguien más allá del docente.', PU]])],
        notes: 'Estos rasgos se inspiran en el modelo de «Gold Standard PBL» de PBLWorks (Buck Institute for Education).' },
      { title: 'La pregunta guía', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Pregunta pobre', RE, ['«¿Qué es el reciclaje?»', 'Se responde buscando en internet', 'No pide decidir nada']],
          ['Pregunta guía', GR, ['«¿Cómo podemos reducir a la mitad la basura del recreo?»', 'Pide investigar y proponer', 'Tiene un público: el centro']], { y: 200, h: 330 })],
        notes: 'La pregunta guía decide el proyecto. Pide al claustro reformular una pregunta «de enciclopedia».' },
      { title: 'Las fases', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', 'Lanzamiento: el reto y la pregunta\nInvestigación: fuentes, entrevistas, datos\nDiseño: propuestas y prototipos\nRevisión: feedback y mejora\nPresentación al público', 110, 200, 1060, 330, { color: INK })],
        notes: 'La fase de revisión es la que más se recorta por falta de tiempo y la que más mejora la calidad.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué te parece más difícil de un proyecto?', ['Encontrar una buena pregunta guía', 'Encajarlo en la programación', 'Evaluarlo con justicia', 'Gestionar los grupos'])],
        notes: 'Votación para el claustro. Usa el resultado para dedicar más tiempo a esa parte.' },
      { title: 'Cómo evaluarlo', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['El proceso', 'Diario de proyecto, revisiones intermedias, observación.', BL], ['El producto', 'Una rúbrica conocida desde el primer día.', AM], ['Lo individual', 'Cada persona demuestra lo que ha aprendido, no solo el grupo.', GR]], { y: 205, h: 290 })],
        notes: 'Evaluar solo el producto final del grupo esconde quién ha aprendido y quién no.' },
      { title: 'Errores habituales', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Proyecto de postre', 'Al final de la unidad, después de explicarlo todo.', RE], ['Manualidad sin contenido', 'Mucho cartón y poco aprendizaje.', AM],
          ['Sin público', 'Si solo lo ve el docente, se pierde el sentido.', PU], ['Sin andamiaje', 'Lanzar al grupo sin guías ni hitos.', BL]])],
        notes: 'En el ABP el proyecto ES la unidad: el contenido se aprende al hacerlo, no antes.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es la mejor pregunta guía?', ['¿Qué es un ecosistema?', '¿Cómo podemos atraer más aves al patio del colegio?', 'Haz un mural sobre los animales', '¿Cuántos animales hay en España?'], 1)],
        notes: 'Pide investigar, decidir y actuar, y tiene un público real.' },
      closing({ bg: BG, accent: AM, inkc: INK, title: 'Tu pregunta guía', body: 'Escribe una pregunta guía para un proyecto de tu materia, el producto final y el público que lo verá. Leedla en voz alta por grupos: ¿dan ganas de responderla?', seconds: 480, end: '¡Pregunta lista!' }),
    ]), INK));
  } },

  // 7 · Aprendizaje cooperativo.
  edu_teach_coop: { name: 'Formación docente: aprendizaje cooperativo', cat: 'edu', summary: 'El aprendizaje cooperativo según Johnson y Johnson: interdependencia positiva y responsabilidad individual, estructuras sencillas (1-2-4, folio giratorio, lápices al centro), el puzle de Aronson y los roles del equipo', make: () => {
    const BG = '#f3f6f6', INK = '#1c2626', TE = '#1f8f8f', OR = '#e0873b', PU = '#7b5bd0', BL = '#3f6ad8', RE = '#d8504a', GR = '#2e9e6b';
    return numbered(ink(build({ name: 'Formación docente: aprendizaje cooperativo', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: TE, inkc: INK, label: 'FORMACIÓN DOCENTE · METODOLOGÍAS', title: 'Aprender<br>cooperando', sub: 'No es poner mesas juntas: es que nadie pueda tener éxito si el resto del equipo no lo tiene.', art: coopArt([TE, OR, PU, BL]), alt: 'Cuatro personas alrededor de una mesa' }),
      { title: 'Grupo no es lo mismo que equipo', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Trabajo en grupo', RE, ['Uno hace casi todo', 'Se reparten partes y se juntan al final', 'La nota es igual para todos']],
          ['Aprendizaje cooperativo', GR, ['Cada uno es imprescindible', 'Se ayudan a aprender', 'Cada persona responde de lo que sabe']], { y: 200, h: 320 })],
        notes: 'Pregunta al claustro por su peor experiencia de «trabajo en grupo»: casi siempre falta alguno de los elementos esenciales.' },
      { title: 'Los dos pilares', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Interdependencia positiva', TE, ['El éxito de cada uno depende del de todos', 'Un objetivo común', 'Recursos o roles repartidos']],
          ['Responsabilidad individual', OR, ['Nadie se esconde en el grupo', 'Cada persona demuestra lo aprendido', 'Preguntas al azar, pruebas individuales']], { y: 200, h: 300 }),
        text('David y Roger Johnson (Universidad de Minnesota) los señalan entre los elementos esenciales del aprendizaje cooperativo.', 90, 530, 1100, 70, { fontSize: 21, color: GREY, textAlign: 'center' })],
        notes: 'Los otros elementos que proponen: interacción cara a cara, habilidades sociales y reflexión del equipo sobre cómo ha trabajado.' },
      { title: 'Estructuras sencillas', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['1-2-4', 'Primero solo, luego en pareja, luego los cuatro: una respuesta común.', TE], ['Folio giratorio', 'Un folio que pasa por todos; cada uno añade su parte.', OR],
          ['Lápices al centro', 'Se habla con los lápices en el centro; se escribe solo cuando todos lo tienen claro.', PU], ['Lectura compartida', 'Uno lee, otro resume, otro pregunta; y rotan.', BL]], { h: 190 })],
        notes: 'Son estructuras que cualquier docente puede usar mañana, en cualquier materia, en 10-15 minutos.' },
      { title: 'El puzle de Aronson', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Equipos base: cada miembro recibe una parte del tema\nGrupos de expertos: quienes tienen la misma parte la estudian juntos\nVuelta al equipo base: cada uno enseña su parte\nPrueba individual de todo el tema', 110, 200, 1060, 300, { color: INK }),
        text('Lo ideó Elliot Aronson en 1971 en Austin (Texas) para mejorar la convivencia en aulas recién integradas.', 110, 530, 1060, 60, { fontSize: 21, color: GREY, textAlign: 'center' })],
        notes: 'La interdependencia es total: nadie puede aprender el tema completo sin sus compañeros.' },
      { title: 'Roles dentro del equipo', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Coordinación', 'Cuida que todos participen y del tiempo.', TE], ['Secretaría', 'Anota acuerdos y dudas.', OR],
          ['Portavoz', 'Comunica lo que ha decidido el equipo.', PU], ['Material', 'Prepara y recoge lo necesario.', BL]])],
        notes: 'Rota los roles cada cierto tiempo para que todos los practiquen.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué estructura cooperativa vas a probar primero?', ['1-2-4', 'Folio giratorio', 'Lápices al centro', 'Puzle de Aronson'])],
        notes: 'Votación para el claustro. Propón probarla en la misma semana y compartir cómo fue.' },
      { layout: 'blank', bg: BG, extra: [quiz('En el puzle de Aronson, ¿por qué cada persona es imprescindible?', ['Porque la nota es grupal', 'Porque solo ella ha estudiado su parte con los expertos', 'Porque el docente la elige', 'No lo es'], 1)],
        notes: 'Cada miembro aporta una parte que nadie más del equipo tiene: interdependencia positiva.' },
      closing({ bg: BG, accent: TE, inkc: INK, title: 'Mañana, un 1-2-4', body: 'Elige una pregunta de tu próxima clase y planifica un 1-2-4: dos minutos solos, tres en pareja, cinco en equipo. Al final, pide a un portavoz al azar que explique la respuesta de su equipo.', seconds: 300, end: '¡Probado!' }),
    ]), INK));
  } },

  // 8 · La IA en el aula para docentes.
  edu_teach_ai: { name: 'Formación docente: la IA en el aula', cat: 'edu', summary: 'La inteligencia artificial para docentes: usos para preparar clase, riesgos (sesgos, errores inventados, privacidad de los datos del alumnado), cómo evaluar en tiempos de IA, normas de centro y un debate con votación', make: () => {
    const BG = '#f4f5fa', INK = '#1d2133', BL = '#3f6ad8', PU = '#7b5bd0', GR = '#2e9e6b', OR = '#e0873b', RE = '#d8504a';
    return numbered(ink(build({ name: 'Formación docente: la IA en el aula', palette: 'ocean', fonts: 'tech', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'FORMACIÓN DOCENTE · ACTUALIDAD', title: 'La IA<br>en el aula', sub: 'Qué puede hacer por tu trabajo, qué riesgos tiene y cómo evaluar cuando el alumnado también la usa.', art: aiArt(PU), alt: 'Un chip junto a un libro abierto' }),
      { layout: 'blank', bg: BG, extra: [vote('¿Usas ya la IA para preparar tus clases?', ['A diario', 'De vez en cuando', 'La he probado poco', 'No la uso'])],
        notes: 'Votación para el claustro, sin juicios: el punto de partida suele ser muy diverso.' },
      { title: 'Usos que ahorran tiempo', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Materiales', 'Ejemplos, ejercicios con varios niveles, textos adaptados.', BL], ['Evaluación', 'Ideas de preguntas y borradores de rúbricas.', GR],
          ['Atención a la diversidad', 'Versiones en lectura fácil o con apoyo visual.', PU], ['Comunicación', 'Borradores de circulares o resúmenes.', OR]])],
        notes: 'Siempre como borrador: la revisión y la decisión final son del docente.' },
      { title: 'Riesgos que hay que conocer', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Errores inventados', 'Puede afirmar datos o citas falsas con total seguridad: hay que comprobar.', RE], ['Sesgos', 'Reproduce estereotipos de los datos con que se entrenó.', OR], ['Privacidad', 'Nunca datos personales del alumnado en herramientas no autorizadas por el centro.', PU]], { y: 205, h: 310 })],
        notes: 'La protección de datos del alumnado es lo más serio: el RGPD y la normativa de cada administración educativa aplican.' },
      { title: 'Evaluar en tiempos de IA', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Tareas fáciles de delegar', RE, ['Un resumen de un tema conocido', 'Una redacción genérica en casa', 'Respuestas que están en internet']],
          ['Tareas que muestran lo aprendido', GR, ['El proceso: borradores y decisiones', 'Defensa oral del trabajo', 'Aplicar a un caso local o propio']], { y: 200, h: 330 })],
        notes: 'Los detectores de texto generado con IA no son fiables: no conviene basar una sanción en ellos.' },
      { title: 'Usarla CON el alumnado', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Explicar qué es y cómo «inventa» respuestas\nPedir que verifiquen lo que dice con fuentes\nCompararla con su propio razonamiento\nCitar cuándo y cómo la han usado', 110, 200, 1060, 320, { color: INK })],
        notes: 'Enseñar a usarla críticamente forma parte de la competencia digital. Revisa la edad mínima y las condiciones de cada herramienta.' },
      { title: 'Normas de centro', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Qué herramientas', 'Las autorizadas por el centro o la administración.', BL], ['Para qué', 'Usos permitidos y no permitidos en las tareas.', GR],
          ['Cómo declararlo', 'Una forma sencilla de indicar que se ha usado.', PU], ['Datos', 'Qué información nunca se introduce.', RE]])],
        notes: 'Una norma común en el centro evita que cada docente tenga una regla distinta.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué NO deberías introducir en una herramienta de IA no autorizada por el centro?', ['Un tema de historia', 'Nombres y notas de tu alumnado', 'Una pregunta de física', 'Un texto de dominio público'], 1)],
        notes: 'Los datos personales del alumnado están protegidos: solo en herramientas autorizadas.' },
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Una tarea a prueba de IA', body: 'Elige una tarea que pongas a menudo y rediséñala para que muestre el proceso: con borradores, una defensa oral breve o un caso cercano. Compártela con quien tengas al lado.', seconds: 600, end: '¡Rediseñada!' }),
    ]), INK));
  } },

  // 9 · Situaciones de aprendizaje (LOMLOE).
  edu_teach_situations: { name: 'Formación docente: situaciones de aprendizaje', cat: 'edu', summary: 'Las situaciones de aprendizaje de la LOMLOE: qué son, sus elementos (contexto, reto, saberes básicos, competencias específicas, criterios de evaluación), un ejemplo completo y una plantilla para diseñar la tuya', make: () => {
    const BG = '#f6f5f9', INK = '#221f2e', PU = '#7b5bd0', OR = '#e0873b', BL = '#3f6ad8', GR = '#2e9e6b', RE = '#d8504a';
    return numbered(ink(build({ name: 'Formación docente: situaciones de aprendizaje', palette: 'violet', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'FORMACIÓN DOCENTE · LOMLOE', title: 'Situaciones<br>de aprendizaje', size: 66, sub: 'Retos en un contexto real que movilizan las competencias, los saberes y la evaluación a la vez.', art: puzzleArt(PU, OR, BL, GR), alt: 'Cuatro piezas de puzle que encajan' }),
      { title: 'Qué dice la norma', layout: 'titleOnly', bg: BG, extra: [
        text('Los reales decretos de enseñanzas mínimas de la LOMLOE (RD 157/2022 de Primaria y RD 217/2022 de ESO) definen las situaciones de aprendizaje como situaciones y actividades que implican el despliegue de actuaciones asociadas a competencias clave y competencias específicas, y que contribuyen a su adquisición y desarrollo.', 90, 190, 1100, 200, { fontSize: 25, color: INK, lineHeight: 1.45 }),
        text('Dicho de forma sencilla: un reto con sentido que obliga a usar lo aprendido.', 90, 420, 1100, 60, { fontSize: 26, color: deep(PU, BG), fontWeight: 700 })],
        notes: 'Cada comunidad autónoma concreta su formato en sus propios decretos: conviene revisar el modelo de la tuya.' },
      { title: 'Sus elementos', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Contexto\nReto o pregunta\nSaberes básicos\nCompetencias específicas\nCriterios de evaluación', 160, 180, 960, 440, { color: INK })],
        notes: 'Todos los elementos se conectan: el reto pide saberes, los saberes desarrollan competencias, los criterios las evalúan.' },
      { title: 'Ejemplo: «Un recreo con menos residuos»', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 400, stroke: '#ddd8ea',
          rows: [['Elemento', 'En esta situación'], ['Contexto', 'El patio del centro y los residuos del recreo'], ['Reto', 'Proponer al consejo escolar un plan para reducirlos'],
            ['Saberes', 'Recogida de datos, porcentajes, gráficos, texto argumentativo'], ['Producto', 'Un informe con datos y una presentación al consejo'], ['Evaluación', 'Rúbrica del informe y de la exposición, conocida desde el inicio']] })],
        notes: 'Un ejemplo interdisciplinar (Matemáticas, Lengua, Biología y Geología). Adaptable a cualquier curso de ESO.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Cuál es tu mayor dificultad al diseñar situaciones de aprendizaje?', ['Encontrar un contexto real', 'Conectar con los criterios de evaluación', 'El tiempo que llevan', 'Coordinarse con otras materias'])],
        notes: 'Votación para el claustro. La coordinación entre departamentos suele salir muy votada: buena ocasión para proponer una situación compartida.' },
      { title: 'De la idea al diseño', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Parte de un contexto cercano al alumnado\nFormula el reto como una pregunta o encargo\nElige competencias específicas y criterios de evaluación\nSelecciona los saberes básicos necesarios\nDiseña actividades, producto e instrumentos de evaluación', 110, 200, 1060, 340, { color: INK })],
        notes: 'Empezar por los criterios de evaluación ayuda a que la situación no se quede en una actividad bonita.' },
      { title: 'Plantilla para tu situación', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 380, stroke: '#ddd8ea',
          rows: [['Elemento', 'Tu situación de aprendizaje'], ['Contexto', ''], ['Reto', ''], ['Competencias específicas', ''], ['Criterios de evaluación', ''], ['Producto final', '']] })],
        notes: 'Se puede rellenar directamente en la tabla durante el taller.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué elemento NO es propio de una situación de aprendizaje?', ['Un contexto', 'Un reto', 'Criterios de evaluación', 'Copiar el temario del libro'], 3)],
        notes: 'La situación parte de un reto en contexto, no de reproducir el libro de texto.' },
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Tu primera situación', body: 'Rellena las tres primeras filas de la plantilla: contexto, reto y competencias específicas. Si tenéis tiempo, buscad por parejas una situación que comparta dos materias.', seconds: 900, end: '¡Diseñada!' }),
    ]), INK));
  } },

  // 10 · Gestión del aula y clima.
  edu_teach_classroom: { name: 'Formación docente: gestión del aula y clima', cat: 'edu', summary: 'Gestión del aula y buen clima: normas construidas con el grupo, rutinas que ahorran tiempo, refuerzo positivo, prevenir conflictos antes de que aparezcan, la primera semana con un grupo nuevo y una votación', make: () => {
    const BG = '#f5f7f4', INK = '#1e251f', GR = '#2e9e6b', OR = '#e0873b', BL = '#3f6ad8', PU = '#7b5bd0', RE = '#d8504a';
    return numbered(ink(build({ name: 'Formación docente: gestión del aula y clima', palette: 'forest', fonts: 'modern', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: GR, inkc: INK, label: 'FORMACIÓN DOCENTE · CONVIVENCIA', title: 'Un aula<br>que funciona', sub: 'Normas, rutinas y relaciones: lo que hace posible enseñar y aprender con calma.', art: classArt(GR), alt: 'Un aula con pupitres frente a la pizarra' }),
      { title: 'Prevenir antes que corregir', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Relación', 'Conocer los nombres, saludar en la puerta, interesarse.', GR], ['Estructura', 'Normas claras y rutinas que todos conocen.', BL], ['Clases que enganchan', 'Ritmo, variedad y tareas al alcance.', OR]], { y: 205, h: 300 })],
        notes: 'La mayoría de los problemas de disciplina se previenen con estas tres cosas antes de que aparezcan.' },
      { title: 'Normas construidas con el grupo', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', '¿Cómo queremos que sea esta clase?\nPropuestas por grupos\nPocas normas, en positivo\nQué pasa si no se cumplen (acordado)\nRevisarlas pasado un tiempo', 110, 200, 1060, 330, { color: INK })],
        notes: 'Cuatro o cinco normas en positivo («Escuchamos a quien habla») funcionan mejor que una lista larga de prohibiciones.' },
      { title: 'Rutinas que ahorran tiempo', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Entrada', 'Una tarea breve en la pizarra para empezar al momento.', GR], ['Señal de atención', 'Un gesto o una palabra que todos reconocen.', BL],
          ['Material', 'Cómo se reparte y se recoge sin perder minutos.', OR], ['Cierre', 'Un minuto para resumir y ordenar antes de salir.', PU]])],
        notes: 'Las rutinas se enseñan y se practican las primeras semanas, como cualquier contenido.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué momento de la clase te cuesta más gestionar?', ['El inicio', 'Las transiciones entre actividades', 'El trabajo en grupo', 'Los últimos minutos'])],
        notes: 'Votación para el claustro. Las transiciones suelen ser el punto débil: buena ocasión para compartir rutinas.' },
      { title: 'Refuerzo positivo', layout: 'titleOnly', bg: BG, extra: [
        ...versus(['Funciona', GR, ['Reconocer conductas concretas', 'En privado si así se siente mejor', 'Más reconocimientos que correcciones']],
          ['No funciona', RE, ['Elogios vagos («muy bien»)', 'Solo fijarse en lo que falla', 'Premios que se vuelven lo único']], { y: 200, h: 330 })],
        notes: '«Has esperado tu turno para hablar» informa; «muy bien» no. El reconocimiento concreto refuerza la conducta.' },
      { title: 'Si aparece un conflicto', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Mantén la calma y baja la voz\nSepara la conducta de la persona\nHabla en privado, no delante del grupo\nAplica lo acordado, con coherencia\nRepara y vuelve a empezar', 110, 200, 1060, 330, { color: INK })],
        notes: 'Para conflictos graves o repetidos, coordinarse con tutoría, jefatura y el plan de convivencia del centro.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es un refuerzo positivo eficaz?', ['«Muy bien»', '«Has ayudado a tu compañero sin que te lo pidieran»', 'Un punto extra en el examen', '«No está mal»'], 1)],
        notes: 'Concreto y sobre la conducta: así se sabe qué repetir.' },
      closing({ bg: BG, accent: GR, inkc: INK, title: 'Tu primera semana', body: 'Elige tres rutinas que enseñarás la primera semana con un grupo (entrada, señal de atención y cierre, por ejemplo) y escribe cómo las practicaréis. Compartidlas por departamentos.', seconds: 480, end: '¡Plan listo!' }),
    ]), INK));
  } },

};
