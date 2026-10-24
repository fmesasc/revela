// Example presentations: Tutoría y convivencia (ESO). Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Sesiones de tutoría listas para el aula: dinámicas, votaciones anónimas, dibujos propios (SVG como data URL; nada de
// imágenes externas) y notas para quien tutoriza — cómo conducir la dinámica y qué hacer si alguien cuenta algo
// delicado (escuchar, no prometer secreto y derivar al equipo de orientación). Datos solo con su fuente.

import { build, text, card, shape, icon, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, pollBlock, base, deep } from './kit.js';

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
// Two-by-two cards from [title, desc, color] rows: the title in its colour, dark enough to read on the card (deep).
const grid = (items, { x0 = 90, y0 = 205, dx = 560, dy = 205, w = 530, h = 180, bg = '#ffffff', color = '#1f2430', ts = 27, ds = 22 } = {}) =>
  items.map(([t, d, col], i) => { const x = x0 + (i % 2) * dx, y = y0 + Math.floor(i / 2) * dy;
    return on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, x, y, w, h, bg, { color, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up'); });
// A row of three cards (title, text, colour), same look.
const row3 = (items, { y = 220, h = 300, bg = '#ffffff', color = '#1f2430', ts = 26, ds = 21 } = {}) =>
  items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, 90 + i * 375, y, 350, h, bg, { color, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up'));
// The cover: a label, the title, a line, and a drawing on the right.
const cover = ({ bg, accent, inkc, sub, label, title, art, alt, size = 74 }) => ({ layout: 'blank', bg, back: [glow(1000, -120, 560, accent, bg, 16), glow(-120, 560, 520, accent, bg, 10)], extra: [
  text(label, 90, 150, 700, 36, { fontSize: 22, letterSpacing: 3, color: deep(accent, bg), fontWeight: 700 }),
  text(title, 84, 196, 740, 230, { fontSize: size, fontWeight: 800, color: inkc, lineHeight: 1.04, fontFamily: FF.space }),
  text(sub, 90, 440, 680, 130, { fontSize: 27, color: '#5a6170', lineHeight: 1.4 }),
  after(img(art, 860, 160, 340, 400, alt), 'fade-left', { duration: 800 })] });
// The closing: a commitment or challenge, and a timer to do it in class.
const closing = ({ bg, accent, inkc, title, body, seconds, end }) => ({ layout: 'blank', bg, back: [glow(1000, 420, 520, accent, bg, 14)], transition: 'zoom', extra: [
  text(title, 84, 120, 820, 140, { fontSize: 50, fontWeight: 800, color: inkc, fontFamily: FF.space, lineHeight: 1.08 }),
  text(body, 84, 290, 780, 260, { fontSize: 27, color: '#4f5666', lineHeight: 1.45 }),
  timer(seconds, 930, 220, 280, { color: accent, endText: end })] });

// ---- Drawings (ours) ---------------------------------------------------------------
// Faces in a circle: a class meeting.
const circleOfFaces = (cols) => svgURL(340, 400, cols.map((c, i) => { const a = (i / cols.length) * Math.PI * 2 - Math.PI / 2, x = 170 + 120 * Math.cos(a), y = 190 + 120 * Math.sin(a);
  return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="34" fill="${c}"/><circle cx="${(x - 10).toFixed(0)}" cy="${(y - 6).toFixed(0)}" r="4" fill="#1f2430"/><circle cx="${(x + 10).toFixed(0)}" cy="${(y - 6).toFixed(0)}" r="4" fill="#1f2430"/><path d="M${(x - 12).toFixed(0)} ${(y + 9).toFixed(0)} Q${x.toFixed(0)} ${(y + 20).toFixed(0)} ${(x + 12).toFixed(0)} ${(y + 9).toFixed(0)}" stroke="#1f2430" stroke-width="3" fill="none" stroke-linecap="round"/>`; }).join('')
  + `<circle cx="170" cy="190" r="46" fill="#ffffff" stroke="#d6dbe5" stroke-width="3"/><text x="170" y="200" font-family="sans-serif" font-size="28" font-weight="700" fill="#5a6170" text-anchor="middle">1º</text>`);
// The six basic emotions (Ekman) as a wheel.
const EMO = [['Alegría', '#f2c14e'], ['Sorpresa', '#5bb8e0'], ['Miedo', '#7b6bd0'], ['Tristeza', '#4f7fd1'], ['Asco', '#5fb37a'], ['Ira', '#e0604d']];
const wheel = () => svgURL(400, 400, EMO.map(([n, c], i) => { const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2, r = 180, cx = 200, cy = 200;
  const p = (a, rr) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`, m = (a0 + a1) / 2;
  return `<path d="M${cx} ${cy} L${p(a0, r)} A${r} ${r} 0 0 1 ${p(a1, r)} Z" fill="${c}" stroke="#fff" stroke-width="4"/><text x="${(cx + 118 * Math.cos(m)).toFixed(0)}" y="${(cy + 118 * Math.sin(m) + 8).toFixed(0)}" font-family="sans-serif" font-size="22" font-weight="700" fill="#1f2430" text-anchor="middle">${n}</text>`; }).join('')
  + `<circle cx="200" cy="200" r="52" fill="#ffffff"/><text x="200" y="208" font-family="sans-serif" font-size="20" font-weight="700" fill="#5a6170" text-anchor="middle">¿Cómo estás?</text>`);
// An emotional thermometer from 1 (very bad) to 5 (very good).
const thermo = () => svgURL(240, 420, `<rect x="90" y="20" width="60" height="320" rx="30" fill="#eef1f6" stroke="#c9d0dc" stroke-width="4"/>`
  + ['#e0604d', '#e8a14a', '#f2c14e', '#9cc95a', '#4fb36f'].map((c, i) => `<rect x="100" y="${276 - i * 62}" width="40" height="56" rx="10" fill="${c}"/><text x="186" y="${312 - i * 62}" font-family="sans-serif" font-size="30" font-weight="700" fill="#5a6170">${i + 1}</text>`).join('')
  + `<circle cx="120" cy="370" r="42" fill="#e0604d" stroke="#c9d0dc" stroke-width="4"/>`);
// A shield: stopping bullying together.
const shield = (c) => svgURL(320, 380, `<path d="M160 20 L290 70 Q290 250 160 350 Q30 250 30 70 Z" fill="${c}" opacity="0.18" stroke="${c}" stroke-width="8"/>`
  + `<circle cx="120" cy="170" r="30" fill="${c}"/><circle cx="200" cy="170" r="30" fill="${c}"/><path d="M80 250 Q120 200 160 250 Q200 200 240 250 L240 270 L80 270 Z" fill="${c}"/>`);
// A phone with a message bubble and a footprint: the digital footprint.
const phonePrint = (c) => svgURL(300, 420, `<rect x="40" y="10" width="220" height="400" rx="34" fill="#1f2430"/><rect x="56" y="44" width="188" height="330" rx="12" fill="#f4f6fb"/>`
  + `<rect x="74" y="70" width="140" height="44" rx="14" fill="#dfe6f3"/><rect x="104" y="128" width="122" height="44" rx="14" fill="${c}"/>`
  + `<ellipse cx="150" cy="268" rx="38" ry="54" fill="#c9d0dc"/>` + [[118, 196], [138, 186], [160, 184], [180, 190], [196, 204]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#c9d0dc"/>`).join(''));
// A notebook and a clock: studying.
const studyArt = (c) => svgURL(340, 400, `<rect x="30" y="60" width="200" height="270" rx="14" fill="#ffffff" stroke="#c9d0dc" stroke-width="4"/>`
  + [100, 140, 180, 220, 260].map(y => `<line x1="56" y1="${y}" x2="204" y2="${y}" stroke="#dfe6f3" stroke-width="5" stroke-linecap="round"/>`).join('')
  + `<line x1="56" y1="100" x2="150" y2="100" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`
  + `<circle cx="250" cy="300" r="70" fill="#ffffff" stroke="${c}" stroke-width="8"/><line x1="250" y1="300" x2="250" y2="254" stroke="#1f2430" stroke-width="6" stroke-linecap="round"/><line x1="250" y1="300" x2="282" y2="318" stroke="#1f2430" stroke-width="6" stroke-linecap="round"/>`);
// A week calendar.
const weekArt = (c) => svgURL(360, 360, `<rect x="20" y="40" width="320" height="290" rx="18" fill="#ffffff" stroke="#c9d0dc" stroke-width="4"/><rect x="20" y="40" width="320" height="58" rx="18" fill="${c}"/>`
  + Array.from({ length: 15 }, (_, i) => `<rect x="${44 + (i % 5) * 58}" y="${118 + Math.floor(i / 5) * 66}" width="44" height="48" rx="8" fill="${[2, 6, 13].includes(i) ? c : '#eef1f6'}" opacity="${[2, 6, 13].includes(i) ? 0.85 : 1}"/>`).join(''));
// Two speech bubbles meeting: solving a conflict.
const talkArt = (a, b) => svgURL(360, 360, `<path d="M20 60 h180 a20 20 0 0 1 20 20 v80 a20 20 0 0 1 -20 20 h-120 l-30 30 v-30 h-10 a20 20 0 0 1 -20 -20 v-80 a20 20 0 0 1 20 -20 z" fill="${a}"/>`
  + `<path d="M340 170 h-180 a20 20 0 0 0 -20 20 v80 a20 20 0 0 0 20 20 h120 l30 30 v-30 h10 a20 20 0 0 0 20 -20 v-80 a20 20 0 0 0 -20 -20 z" fill="${b}"/>`
  + [60, 110, 160].map(x => `<circle cx="${x}" cy="120" r="9" fill="#ffffff"/>`).join('') + [200, 250, 300].map(x => `<circle cx="${x}" cy="230" r="9" fill="#ffffff"/>`).join(''));
// Figures of different heights and colours side by side: diversity.
const peopleArt = (cols) => svgURL(380, 360, cols.map((c, i) => { const x = 40 + i * 62, h = [170, 210, 150, 230, 190][i % 5];
  return `<circle cx="${x + 22}" cy="${330 - h - 26}" r="22" fill="${c}"/><rect x="${x}" y="${330 - h}" width="44" height="${h}" rx="18" fill="${c}"/>`; }).join('') + `<line x1="20" y1="332" x2="360" y2="332" stroke="#c9d0dc" stroke-width="4"/>`);
// A crescent moon over a phone: sleep and screens.
const moonArt = (c) => svgURL(340, 400, `<circle cx="210" cy="110" r="80" fill="${c}"/><circle cx="246" cy="86" r="72" fill="#f3f1fa"/>`
  + [[70, 60], [110, 130], [300, 210], [60, 200]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`).join('')
  + `<rect x="90" y="230" width="120" height="160" rx="18" fill="#1f2430"/><rect x="100" y="246" width="100" height="120" rx="8" fill="#3a4152"/>`);
// A path that forks into three: choosing what to study.
const forkArt = (cols) => svgURL(360, 400, `<path d="M180 390 L180 250" stroke="#c9d0dc" stroke-width="22" stroke-linecap="round"/>`
  + `<path d="M180 250 Q180 180 70 120" stroke="${cols[0]}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M180 250 L180 80" stroke="${cols[1]}" stroke-width="18" stroke-linecap="round"/><path d="M180 250 Q180 180 290 120" stroke="${cols[2]}" stroke-width="18" fill="none" stroke-linecap="round"/>`
  + `<circle cx="70" cy="110" r="26" fill="${cols[0]}"/><circle cx="180" cy="66" r="26" fill="${cols[1]}"/><circle cx="290" cy="110" r="26" fill="${cols[2]}"/>`);

export default {

  // 1 · El primer día: nos conocemos y acordamos las normas.
  edu_tut_welcome: { name: 'Tutoría: el primer día', cat: 'edu', summary: 'Primera sesión de tutoría: dinámicas para conocerse (dos verdades y una mentira, la línea), qué esperamos del curso, normas de clase propuestas y votadas entre todos y un compromiso firmado con cuenta atrás', make: () => {
    const BG = '#f5f6fa', INK = '#1f2430', BL = '#3f6ad8', OR = '#e0873b', GR = '#2e9e6b', PU = '#7b5bd0', RE = '#d8504a';
    return numbered(ink(build({ name: 'Tutoría: el primer día', palette: 'revela', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: BL, inkc: INK, label: 'TUTORÍA · PRIMER DÍA', title: 'Nos<br>conocemos', sub: 'Un curso entero juntos empieza hoy: quiénes somos, qué esperamos y cómo queremos convivir.', art: circleOfFaces([BL, OR, GR, PU, RE, '#f2c14e', '#5bb8e0']), alt: 'Caras en círculo alrededor del grupo' }),
      { title: 'Lo que haremos hoy', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Romper el hielo con dos dinámicas\nContar qué esperamos de este curso\nProponer normas de clase\nVotarlas entre todos\nFirmar nuestro compromiso', 110, 200, 1060, 330, { color: INK })],
        notes: 'Presenta el plan de la sesión. Que vean que las normas no vienen impuestas: las van a proponer y votar ellos.' },
      { title: 'Dinámica 1 · Dos verdades y una mentira', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Cómo se juega', 'Cada persona dice tres frases sobre sí misma: dos son verdad y una es mentira.', BL],
          ['El resto adivina', 'La clase vota cuál es la mentira. Gana quien despista a más gente.', OR],
          ['Un ejemplo', '«Tengo tres hermanos», «He estado en Italia», «Toco la batería».', GR],
          ['La regla', 'Nada que te incomode contar: solo lo que quieras compartir.', PU]], { bg: '#ffffff' })],
        notes: 'Empieza tú con tus tres frases: rompe el hielo y da el tono. Deja claro que nadie está obligado a contar nada personal.' },
      { title: 'Dinámica 2 · La línea', layout: 'titleOnly', bg: BG, extra: [
        text('Leo una frase y os colocáis en una línea imaginaria: a la izquierda «nada que ver conmigo», a la derecha «totalmente yo».', 110, 190, 1060, 100, { fontSize: 27, color: INK, lineHeight: 1.4 }),
        text(ul('Me gusta más el verano que el invierno', 'Prefiero trabajar en grupo que solo', 'Me cuesta hablar en público', 'Hago algún deporte o actividad fuera del instituto', 'Este año quiero mejorar en algo concreto'), 130, 310, 1000, 300, { fontSize: 27, color: INK, lineHeight: 1.5 })],
        notes: 'Con una frase cada vez. Sirve para ver afinidades sin que nadie tenga que hablar. Si el espacio no deja moverse, que levanten la mano del 1 al 5.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué es lo que MÁS esperas de este curso?', ['Aprender cosas útiles', 'Hacer buenos amigos', 'Aprobar sin agobios', 'Descubrir qué me gusta'])],
        notes: 'Votación anónima. Comentad el resultado: os ayuda como tutor/a a saber qué les mueve.' },
      { title: 'Normas que nos ayudan a convivir', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Respeto', 'Escuchar sin interrumpir y sin burlas.', BL], ['Puntualidad', 'Llegar a tiempo es respetar el tiempo de todos.', OR],
          ['Móvil', 'Guardado salvo cuando se use para una actividad.', GR], ['Ayuda', 'Si alguien lo pasa mal, lo contamos a un adulto.', RE]], { bg: '#ffffff' })],
        notes: 'Son ejemplos para arrancar. Pide propuestas por grupos (5 minutos) y escribidlas en la pizarra antes de votar.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Qué norma os parece MÁS importante para este grupo?', ['Respetar el turno de palabra', 'Nada de burlas ni motes', 'Cuidar el material y el aula', 'Pedir ayuda si alguien lo pasa mal'])],
        notes: 'Votad las normas propuestas por la clase (cámbialas aquí por las vuestras). La más votada encabeza el cartel del aula.' },
      { layout: 'blank', bg: BG, extra: [quiz('Si alguien de clase lo está pasando mal, ¿qué es lo mejor que puedes hacer?', ['No meterte, no es asunto tuyo', 'Contárselo a un adulto de confianza', 'Comentarlo en el grupo de clase', 'Esperar a que se arregle solo'], 1)],
        notes: 'Idea clave del curso: pedir ayuda para otra persona no es chivarse, es cuidar. Recuérdales que tu puerta está abierta.' },
      closing({ bg: BG, accent: BL, inkc: INK, title: 'Nuestro compromiso', body: 'Escribid las normas votadas en un cartel y que cada persona lo firme. Lo colgamos en el aula y lo revisaremos a mitad de trimestre: ¿se cumple? ¿hay que cambiar algo?', seconds: 600, end: '¡A firmar!' }),
    ]), INK));
  } },

  // 2 · Las emociones: ponerles nombre.
  edu_tut_emotions: { name: 'Tutoría: ponerle nombre a lo que sientes', cat: 'edu', summary: 'Sesión de educación emocional: las seis emociones básicas en una rueda, para qué sirve cada una, el termómetro emocional, una votación anónima de cómo llegamos hoy y estrategias para calmarse', make: () => {
    const BG = '#f7f5fb', INK = '#221f2e', PU = '#7b5bd0', OR = '#e0873b', BL = '#4f7fd1', GR = '#3fa36a', RE = '#d8504a', AM = '#d9a43a';
    return numbered(ink(build({ name: 'Tutoría: ponerle nombre a lo que sientes', palette: 'violet', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'TUTORÍA · EMOCIONES', title: 'Ponerle nombre<br>a lo que sientes', size: 66, sub: 'Lo que se nombra se entiende mejor. Hoy aprendemos a reconocer nuestras emociones sin juzgarlas.', art: wheel(), alt: 'Rueda de las seis emociones básicas' }),
      { layout: 'blank', bg: BG, extra: [vote('Sin nombres: ¿cómo llegas hoy, del 1 (muy mal) al 5 (muy bien)?', ['1 · Muy mal', '2 · Regular tirando a mal', '3 · Normal', '4 · Bien', '5 · Muy bien'])],
        notes: 'Votación anónima de entrada. No comentes casos concretos. Si salen varios 1, al final de la sesión ofrece hablar en privado.' },
      { title: 'Seis emociones básicas', layout: 'twoContent', bg: BG, extra: [
        img(wheel(), 110, 190, 400, 400, 'Rueda de emociones'),
        text('El psicólogo Paul Ekman describió seis emociones que se reconocen en las caras de culturas de todo el mundo: <b>alegría, tristeza, miedo, ira, asco y sorpresa</b>.<br><br>Ninguna es «mala»: todas nos avisan de algo.', 580, 210, 600, 380, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Ekman (años 70) estudió las expresiones faciales en distintas culturas. Hoy se habla de muchas más emociones; estas seis son un buen punto de partida.' },
      { title: '¿Para qué sirve cada una?', layout: 'titleOnly', bg: BG, extra: [
        ...[['Miedo', 'Nos protege del peligro.', PU], ['Ira', 'Nos avisa de una injusticia o un límite.', RE], ['Tristeza', 'Nos ayuda a pedir apoyo y a cerrar etapas.', BL],
          ['Alegría', 'Nos acerca a lo que nos hace bien.', AM], ['Asco', 'Nos aleja de lo que puede dañarnos.', GR], ['Sorpresa', 'Nos pone en alerta ante lo nuevo.', OR]].map(([t, d, col], i) =>
          on(card(`<b style="font-size:26px;color:${deep(col)}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, 90 + (i % 3) * 375, 205 + Math.floor(i / 3) * 205, 350, 180, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up'))],
        notes: 'Que pongan un ejemplo propio de cuándo una emoción «difícil» les fue útil (el miedo antes de cruzar, la ira ante una injusticia).' },
      { title: 'El termómetro emocional', layout: 'twoContent', bg: BG, extra: [
        img(thermo(), 150, 190, 240, 420, 'Termómetro emocional del 1 al 5'),
        text(ul('<b>1-2</b>: estoy muy alterado/a. Primero, calmarme', '<b>3</b>: noto la emoción, pero puedo pensar', '<b>4-5</b>: estoy bien para hablar y decidir'), 520, 220, 660, 300, { fontSize: 27, color: INK, lineHeight: 1.5 }),
        text('Antes de responder a algo que te ha afectado, mira tu termómetro.', 520, 520, 660, 80, { fontSize: 23, color: '#5a6170', lineHeight: 1.4 })],
        notes: 'El termómetro ayuda a decidir CUÁNDO hablar: con el termómetro en rojo, mejor esperar.' },
      { title: 'Para calmarte', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Para y respira: 4 segundos dentro, 4 fuera, varias veces\nPonle nombre: «estoy enfadado/a porque…»\nAléjate un momento si lo necesitas\nHabla con alguien de confianza\nVuelve al tema cuando estés en verde', 110, 200, 1060, 340, { color: INK })],
        notes: 'Practicad la respiración 4-4 un minuto juntos. Es sencilla y se puede hacer en cualquier sitio.' },
      { layout: 'blank', bg: BG, extra: [quiz('Un compañero te dice algo que te sienta fatal. ¿Qué es lo primero?', ['Contestarle en el momento', 'Respirar y mirar tu termómetro', 'Contarlo en el grupo de clase', 'Hacer como que no pasa nada'], 1)],
        notes: 'Primero calmarse; después decidir si hablarlo, cómo y con quién.' },
      { title: 'Cuándo pedir ayuda', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Si dura mucho', 'Si estás triste o con miedo casi todos los días durante semanas.', BL], ['Si te desborda', 'Si no puedes dormir, comer o concentrarte.', RE],
          ['A quién', 'Tu familia, tu tutor/a, el equipo de orientación del instituto.', GR], ['Fuera del instituto', 'Teléfono ANAR de ayuda a niños y adolescentes: 900 20 20 10, gratuito y a cualquier hora.', PU]], { bg: '#ffffff' })],
        notes: 'Si alguien te cuenta algo delicado: escucha, agradece la confianza, no prometas guardar el secreto si hay riesgo y deriva al equipo de orientación. El 900 20 20 10 es de la Fundación ANAR.' },
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Mi reto de la semana', body: 'Cada día, antes de dormir, ponle nombre a una emoción que hayas sentido y a qué te avisaba. Una frase basta. El viernes, quien quiera, comparte una.', seconds: 300, end: '¡Reto aceptado!' }),
    ]), INK));
  } },

  // 3 · Acoso escolar: verlo y pararlo.
  edu_tut_bullying: { name: 'Tutoría: acoso escolar, verlo y pararlo', cat: 'edu', summary: 'Sesión contra el acoso escolar: qué es y qué no es, los tres rasgos que lo definen, los papeles de quien acosa, la víctima y los testigos, qué hacer, a quién acudir y por qué pedir ayuda no es chivarse', make: () => {
    const BG = '#f4f7f6', INK = '#1d2624', TE = '#1f8f84', RE = '#d8504a', OR = '#e0873b', BL = '#3f6ad8', PU = '#7b5bd0';
    return numbered(ink(build({ name: 'Tutoría: acoso escolar, verlo y pararlo', palette: 'forest', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: TE, inkc: INK, label: 'TUTORÍA · CONVIVENCIA', title: 'Acoso escolar:<br>verlo y pararlo', size: 68, sub: 'El acoso se para cuando el grupo deja de mirar hacia otro lado. Hoy aprendemos a verlo y a actuar.', art: shield(TE), alt: 'Un escudo con personas juntas' }),
      { layout: 'blank', bg: BG, extra: [vote('Sin nombres: ¿has visto alguna vez una situación de acoso en el instituto?', ['Sí, varias veces', 'Sí, alguna vez', 'No estoy seguro/a', 'No'])],
        notes: 'Votación anónima: nunca pidas nombres ni casos en público. Si alguien quiere contar algo, ofrece hablar después en privado.' },
      { title: 'Qué es el acoso', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Intencionado', 'Se hace daño a propósito, no es un accidente.', RE], ['Repetido', 'Pasa una y otra vez, no es un hecho aislado.', OR], ['Desigual', 'Quien lo sufre no puede defenderse fácilmente.', PU]], { y: 205, h: 250 }),
        text('Así lo definió el investigador noruego Dan Olweus, pionero en su estudio.', 90, 500, 1100, 50, { fontSize: 22, color: '#5a6170', textAlign: 'center' })],
        notes: 'Los tres rasgos (Olweus): intención, repetición y desequilibrio de poder. Una pelea puntual entre iguales es un conflicto, no acoso — pero también hay que atenderla.' },
      { title: 'Puede ser…', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Físico', 'Golpes, empujones, romper o esconder cosas.', RE], ['Verbal', 'Insultos, motes, burlas, amenazas.', OR],
          ['Social', 'Excluir, aislar, difundir rumores.', PU], ['Ciberacoso', 'Lo mismo, a través del móvil y las redes.', BL]], { bg: '#ffffff' })],
        notes: 'El acoso social (excluir, ignorar) es el más difícil de ver y hace mucho daño. Pide ejemplos generales, sin señalar a nadie.' },
      { title: 'Tres papeles', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Quien acosa', 'Busca poder o atención. También necesita ayuda para cambiar.', RE], ['Quien lo sufre', 'Suele callar por miedo o vergüenza. No es culpable.', BL], ['Los testigos', 'Son la mayoría. Si actúan, el acoso se para.', TE]], { y: 205, h: 260 }),
        text('El papel de los testigos es el que más puede cambiar las cosas.', 90, 500, 1100, 50, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'Insiste en los testigos: reírse o mirar «da permiso». Apoyar a la víctima o avisar a un adulto lo frena.' },
      { title: 'Si lo ves, puedes…', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'No reírte ni grabarlo\nAcompañar a quien lo sufre\nDecir «para» si es seguro hacerlo\nContárselo a un adulto de confianza\nUsar el buzón o el protocolo del centro', 110, 200, 1060, 340, { color: INK })],
        notes: 'Recuerda el protocolo de convivencia de tu centro y dónde está el buzón anónimo, si lo hay.' },
      { layout: 'blank', bg: BG, extra: [quiz('Contarle a un profesor que alguien sufre acoso es…', ['Chivarse', 'Pedir ayuda para otra persona', 'Meterse donde no te llaman', 'Inútil'], 1)],
        notes: 'Mensaje central: chivarse es buscar que castiguen a alguien por algo sin importancia; pedir ayuda es proteger a quien lo pasa mal.' },
      { title: 'A quién acudir', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['En el instituto', 'Tu tutor/a, cualquier profesor/a, el equipo de orientación, la dirección.', TE], ['En casa', 'Tu familia o un adulto de confianza.', BL],
          ['Teléfono ANAR', '900 20 20 10: gratuito, confidencial y a cualquier hora.', PU], ['Si hay peligro', 'Llama al 112.', RE]], { bg: '#ffffff' })],
        notes: 'Si alguien te cuenta un caso: escucha, cree, no prometas secreto, protege y activa el protocolo del centro con el equipo de orientación y la dirección.' },
      closing({ bg: BG, accent: TE, inkc: INK, title: 'Nuestro pacto', body: 'Por grupos, escribid una frase para un cartel: «En esta clase, si vemos acoso…». Elegimos entre todos la mejor y la colgamos en la puerta.', seconds: 480, end: '¡Pacto hecho!' }),
    ]), INK));
  } },

  // 4 · Ciberacoso y redes.
  edu_tut_cyber: { name: 'Tutoría: ciberacoso y redes sociales', cat: 'edu', summary: 'Sesión sobre la vida en las redes: la huella digital, privacidad de las cuentas, piensa antes de publicar, qué es el ciberacoso, qué hacer si te pasa (capturas, bloquear, denunciar, pedir ayuda) y la línea 017 de INCIBE', make: () => {
    const BG = '#f3f6fb', INK = '#1b2233', BL = '#3f6ad8', PU = '#7b5bd0', RE = '#d8504a', GR = '#2e9e6b', OR = '#e0873b';
    return numbered(ink(build({ name: 'Tutoría: ciberacoso y redes sociales', palette: 'ocean', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: BL, inkc: INK, label: 'TUTORÍA · VIDA DIGITAL', title: 'Lo que pasa<br>en las redes', size: 70, sub: 'Las redes son parte de nuestra vida. Hoy hablamos de cómo cuidarte y cuidar a los demás en ellas.', art: phonePrint(BL), alt: 'Un móvil con mensajes y una huella' }),
      { layout: 'blank', bg: BG, extra: [vote('Sin nombres: ¿cuántas horas al día usas el móvil fuera de clase?', ['Menos de 1', 'De 1 a 3', 'De 3 a 5', 'Más de 5'])],
        notes: 'Votación anónima, sin juzgar. Sirve de punto de partida para hablar de cómo lo usamos, no de cuánto.' },
      { title: 'Tu huella digital', layout: 'twoContent', bg: BG, extra: [
        img(phonePrint(BL), 140, 190, 300, 420, 'Huella digital'),
        text(ul('Lo que publicas puede copiarse, reenviarse y guardarse', 'Borrar no siempre lo hace desaparecer', 'Quien te busque dentro de unos años puede encontrarlo', 'Tu ubicación y tus fotos dicen mucho de ti'), 540, 210, 640, 380, { fontSize: 27, color: INK, lineHeight: 1.5 })],
        notes: 'Idea clave: en internet, lo que se publica es difícil de borrar del todo. Una captura basta para que circule.' },
      { title: 'Antes de publicar, piensa', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['¿Es verdad?', 'No compartas rumores ni bulos.', BL], ['¿Es amable?', 'Si no lo dirías a la cara, no lo escribas.', GR],
          ['¿Es necesario?', 'No todo hay que contarlo ni enseñarlo.', OR], ['¿Te importaría que lo viera tu familia?', 'Si la respuesta es sí, piénsalo dos veces.', PU]], { bg: '#ffffff' })],
        notes: 'Una regla sencilla para recordar. Podéis hacer un cartel con las cuatro preguntas.' },
      { title: 'Cuida tu privacidad', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Pon tus cuentas en privado\nAcepta solo a gente que conoces de verdad\nNo compartas tu ubicación en directo\nUsa contraseñas distintas y no las prestes\nRevisa qué apps tienen acceso a tus fotos', 110, 200, 1060, 340, { color: INK })],
        notes: 'Podéis hacerlo en el momento con el móvil: poner la cuenta en privado lleva un minuto.' },
      { title: 'Ciberacoso', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Mensajes', 'Insultos o amenazas repetidas por chat o redes.', RE], ['Exclusión', 'Sacar a alguien de un grupo a propósito o burlarse en él.', OR], ['Difundir', 'Compartir fotos, vídeos o capturas para humillar.', PU]], { y: 205, h: 260 }),
        text('Compartir o reírse de ese contenido también hace daño.', 90, 500, 1100, 50, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'Difundir imágenes íntimas de otra persona sin permiso, además de hacer mucho daño, puede ser delito.' },
      { title: 'Si te pasa…', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'No contestes ni te enfrentes\nHaz capturas de pantalla (son pruebas)\nBloquea y denuncia en la propia red\nCuéntaselo a un adulto de confianza\nPide ayuda: tutor/a, orientación, familia', 110, 200, 1060, 340, { color: INK })],
        notes: 'Las capturas son importantes: si luego se borra, queda la prueba.' },
      { layout: 'blank', bg: BG, extra: [quiz('Te llega al grupo una foto humillante de un compañero. ¿Qué haces?', ['La reenvío, ya la ha visto todo el mundo', 'No la comparto y aviso a un adulto', 'Me río pero no la reenvío', 'Salgo del grupo sin decir nada'], 1)],
        notes: 'No reenviar corta la cadena; avisar a un adulto protege a la víctima. Reírse también la alimenta.' },
      { title: 'Ayuda especializada', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['017', 'Línea de ayuda en ciberseguridad de INCIBE: gratuita y confidencial, también por chat.', BL], ['900 20 20 10', 'Teléfono ANAR de ayuda a niños y adolescentes, a cualquier hora.', PU],
          ['En el instituto', 'Tu tutor/a y el equipo de orientación.', GR], ['Si hay delito o peligro', 'La policía o el 112.', RE]], { bg: '#ffffff' })],
        notes: 'El 017 es el servicio «Tu Ayuda en Ciberseguridad» del INCIBE. Si un alumno te cuenta un caso, activa el protocolo del centro.' },
      closing({ bg: BG, accent: BL, inkc: INK, title: 'Reto: revisa tu cuenta', body: 'Hoy mismo, revisa la privacidad de tus redes: ¿quién ve lo que publicas? ¿compartes tu ubicación? Cambia una cosa y, quien quiera, lo cuenta en la próxima tutoría.', seconds: 300, end: '¡Revisado!' }),
    ]), INK));
  } },

  // 5 · Técnicas de estudio.
  edu_tut_study: { name: 'Tutoría: estudiar mejor, no más', cat: 'edu', summary: 'Sesión de técnicas de estudio: la curva del olvido de Ebbinghaus en un gráfico, el repaso espaciado, la práctica de recuperación, esquemas y mapas, un ambiente sin distracciones y la técnica Pomodoro con cuenta atrás', make: () => {
    const BG = '#f6f7f3', INK = '#1f2420', GR = '#2e9e6b', OR = '#e0873b', BL = '#3f6ad8', PU = '#7b5bd0', RE = '#d8504a';
    return numbered(ink(build({ name: 'Tutoría: estudiar mejor, no más', palette: 'forest', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: GR, inkc: INK, label: 'TUTORÍA · TÉCNICAS DE ESTUDIO', title: 'Estudiar mejor,<br>no más', size: 70, sub: 'No se trata de pasar más horas con el libro, sino de aprovecharlas. La ciencia de la memoria nos da pistas.', art: studyArt(GR), alt: 'Un cuaderno y un reloj' }),
      { layout: 'blank', bg: BG, extra: [vote('¿Cómo estudias normalmente para un examen?', ['Leo y releo el tema', 'Hago resúmenes o esquemas', 'Me pregunto a mí mismo/a', 'Lo dejo para la noche anterior'])],
        notes: 'Votación anónima. Releer es lo más común y de lo menos eficaz; vamos a ver por qué.' },
      { title: 'La curva del olvido', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 380, chartType: 'line', color: RE, grid: true, xTitle: 'Tiempo desde que lo aprendiste', yTitle: '% que se conserva', seriesName: 'Recuerdo',
          data: [['Al aprender', 100], ['20 min', 58], ['1 hora', 44], ['9 horas', 36], ['1 día', 34], ['2 días', 28], ['6 días', 25], ['31 días', 21]].map(([l, v]) => ({ label: l, value: v })) }),
        text('Fuente: Hermann Ebbinghaus, «Sobre la memoria» (1885): lo que ahorraba al volver a aprender sílabas sin sentido.', 110, 575, 1060, 60, { fontSize: 20, color: '#5a6170', textAlign: 'center' })],
        notes: 'Ebbinghaus midió cuánto le costaba reaprender listas de sílabas sin sentido. Olvidamos rápido al principio; repasar en el momento justo frena la caída.' },
      { title: 'El repaso espaciado', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', 'Día 1: aprendes el tema\nDía 2: primer repaso (10 min)\nDía 4: segundo repaso\nDía 7: tercer repaso\nAntes del examen: repaso final', 110, 200, 1060, 320, { color: INK }),
        text('Repasar poco y a menudo vence a una sola sesión larga.', 110, 550, 1060, 50, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'El repaso espaciado está entre las técnicas con más apoyo en la investigación educativa. Ayúdales a planificarlo en la agenda.' },
      { title: 'Tres técnicas que funcionan', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Pregúntate', 'Cierra el libro e intenta explicarlo o responder preguntas. Recordar fortalece la memoria.', GR], ['Esquemas', 'Ordena las ideas: lo principal arriba, los detalles colgando.', BL], ['Explícalo', 'Si puedes contárselo a otra persona, lo has entendido.', PU]], { y: 205, h: 300 })],
        notes: 'La práctica de recuperación (preguntarse) es mucho más eficaz que releer. Proponles hacer sus propias preguntas de examen.' },
      { title: 'Tu sitio de estudio', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Móvil lejos', 'En otra habitación o en silencio y boca abajo.', RE], ['Todo a mano', 'Material preparado antes de empezar.', OR],
          ['Luz y orden', 'Una mesa despejada y buena iluminación.', GR], ['Mismo horario', 'Estudiar a la misma hora crea costumbre.', BL]], { bg: '#ffffff' })],
        notes: 'El móvil a la vista distrae aunque no lo uses. Pide que cada uno elija UN cambio para su sitio de estudio.' },
      { title: 'La técnica Pomodoro', layout: 'titleOnly', bg: BG, extra: [
        text('25 minutos de concentración total y 5 de descanso. Cada cuatro, un descanso largo. La ideó Francesco Cirillo a finales de los años 80.', 110, 190, 760, 200, { fontSize: 28, color: INK, lineHeight: 1.45 }),
        text(ul('Elige una tarea concreta', 'Pon el temporizador', 'Si te distraes, apúntalo y sigue', 'Descansa de verdad: levántate'), 110, 400, 760, 220, { fontSize: 25, color: INK, lineHeight: 1.45 }),
        timer(1500, 930, 230, 260, { color: GR, endText: '¡Descanso!' })],
        notes: 'Podéis probar un pomodoro corto en clase. El temporizador ya está puesto en 25 minutos.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué técnica ayuda MÁS a recordar a largo plazo?', ['Releer el tema muchas veces', 'Subrayar todo el libro', 'Repasar espaciado y preguntarse', 'Estudiar todo la noche anterior'], 2)],
        notes: 'Repaso espaciado + práctica de recuperación. Subrayar y releer dan sensación de saber, pero se olvida antes.' },
      closing({ bg: BG, accent: GR, inkc: INK, title: 'Tu plan para el próximo examen', body: 'Apunta en tu agenda la fecha del próximo examen y, hacia atrás, tres días de repaso corto. En cada uno: cierra el libro y pregúntate. Comparamos resultados después.', seconds: 300, end: '¡Plan hecho!' }),
    ]), INK));
  } },

  // 6 · Organiza tu tiempo.
  edu_tut_time: { name: 'Tutoría: organiza tu tiempo', cat: 'edu', summary: 'Sesión de organización: en qué se nos va el tiempo, la agenda semanal en una tabla, la matriz de Eisenhower para separar lo urgente de lo importante, dividir tareas grandes y un reto de la semana', make: () => {
    const BG = '#f7f6f2', INK = '#24211a', OR = '#e0873b', BL = '#3f6ad8', GR = '#2e9e6b', RE = '#d8504a', PU = '#7b5bd0';
    return numbered(ink(build({ name: 'Tutoría: organiza tu tiempo', palette: 'warm', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: OR, inkc: INK, label: 'TUTORÍA · ORGANIZACIÓN', title: 'Organiza<br>tu tiempo', sub: 'Exámenes, deberes, deporte, amigos, descanso… Todo cabe si sabes dónde ponerlo.', art: weekArt(OR), alt: 'Un calendario semanal' }),
      { layout: 'blank', bg: BG, extra: [vote('¿Qué te roba más tiempo sin que te des cuenta?', ['El móvil y las redes', 'Los videojuegos o series', 'Empezar tarde las tareas', 'No saber por dónde empezar'])],
        notes: 'Votación anónima. Sin juicios: se trata de ser conscientes.' },
      { title: 'Tu semana, de un vistazo', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 100, y: 185, w: 1080, h: 330, stroke: '#ded8cc',
          rows: [['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], ['Tarde 1', 'Deberes', 'Deporte', 'Deberes', 'Repaso', 'Libre'], ['Tarde 2', 'Repaso', 'Deberes', 'Música', 'Deberes', 'Amigos'], ['Noche', 'Leer', 'Leer', 'Leer', 'Leer', 'Libre']] }),
        text('Un ejemplo: rellena el tuyo con tus horarios reales, incluido el tiempo libre.', 100, 540, 1080, 50, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'Que cada uno haga su propia tabla. Importante: el descanso y el ocio también se planifican.' },
      { title: 'Urgente o importante', layout: 'titleOnly', bg: BG, extra: [
        dg('matrix', 'Urgente e importante: hazlo ya\nImportante, no urgente: planifícalo\nUrgente, no importante: hazlo rápido\nNi una cosa ni otra: déjalo para luego', 160, 185, 960, 400, { color: INK }),
        text('La «matriz de Eisenhower», popularizada por Stephen Covey.', 160, 600, 960, 40, { fontSize: 21, color: '#5a6170', textAlign: 'center' })],
        notes: 'Lo importante que no es urgente (estudiar con tiempo, hacer deporte) es lo que más se olvida y lo que más cuenta.' },
      { layout: 'blank', bg: BG, extra: [quiz('Tienes examen en dos semanas. ¿En qué casilla está estudiarlo HOY?', ['Urgente e importante', 'Importante, no urgente', 'Urgente, no importante', 'Ni una cosa ni otra'], 1)],
        notes: 'Importante pero aún no urgente: es el momento ideal para planificarlo y empezar.' },
      { title: 'Trocea lo grande', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Un trabajo de 10 páginas\nBuscar información (lunes)\nHacer el índice (martes)\nEscribir 2 páginas al día\nRevisar y entregar', 110, 210, 1060, 300, { color: INK }),
        text('Una tarea enorme asusta; cinco pequeñas, no.', 110, 540, 1060, 50, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'Dividir en pasos con fecha evita dejarlo todo para el final.' },
      { title: 'Trucos que ayudan', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Empieza por lo difícil', 'Cuando tienes más energía.', RE], ['Agenda siempre', 'Apunta las fechas en cuanto te las dicen.', BL],
          ['Bloques cortos', 'Mejor 3 ratos de 25 minutos que uno de 2 horas.', GR], ['Prémiate', 'Tras cumplir, algo que te guste.', PU]], { bg: '#ffffff' })],
        notes: 'Pide a cada uno que elija un truco y lo pruebe esta semana.' },
      closing({ bg: BG, accent: OR, inkc: INK, title: 'Reto de la semana', body: 'Rellena tu tabla de la semana y cumple al menos tres de los bloques que te propongas. El próximo día, cuenta qué te funcionó y qué no.', seconds: 420, end: '¡A planificar!' }),
    ]), INK));
  } },

  // 7 · Resolver conflictos.
  edu_tut_conflict: { name: 'Tutoría: resolver conflictos', cat: 'edu', summary: 'Sesión de convivencia: qué es un conflicto, formas de afrontarlo, la escucha activa, los mensajes «yo», los pasos de la mediación y un rol-play con votación para decidir cómo acabaría', make: () => {
    const BG = '#f5f6fb', INK = '#1f2233', BL = '#3f6ad8', OR = '#e0873b', GR = '#2e9e6b', PU = '#7b5bd0', RE = '#d8504a';
    return numbered(ink(build({ name: 'Tutoría: resolver conflictos', palette: 'revela', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: BL, inkc: INK, label: 'TUTORÍA · CONVIVENCIA', title: 'Resolver<br>conflictos', sub: 'Discutir es normal; lo importante es cómo lo resolvemos. Hoy practicamos herramientas para hacerlo bien.', art: talkArt(BL, OR), alt: 'Dos bocadillos de diálogo' }),
      { title: 'Ante un conflicto, podemos…', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Huir', 'Evitarlo. A veces se enquista.', PU], ['Imponernos', 'Gano yo, pierdes tú. Deja heridas.', RE],
          ['Ceder siempre', 'Pierdo yo para no discutir. Acumula malestar.', OR], ['Colaborar', 'Buscamos juntos una salida en la que ganemos los dos.', GR]], { bg: '#ffffff' })],
        notes: 'Ninguna forma es siempre mala, pero colaborar es la que mejor cuida la relación.' },
      { title: 'Escucha activa', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Mira a la persona y deja el móvil\nNo interrumpas\nResume lo que has entendido: «O sea, que…»\nPregunta: «¿Cómo te sentiste?»\nNo juzgues ni des consejos sin que te los pidan', 110, 200, 1060, 340, { color: INK })],
        notes: 'Practicad en parejas: uno cuenta algo (2 minutos) y el otro resume. Después, cambio.' },
      { title: 'Mensajes «yo»', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<b style="font-size:26px;color:${deep(RE)}">En vez de</b><br><span style="font-size:24px">«¡Siempre llegas tarde, eres un desastre!»</span>`, 90, 205, 530, 210, '#ffffff', { color: INK, radius: 16, borderColor: RE, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card(`<b style="font-size:26px;color:${deep(GR)}">Prueba con</b><br><span style="font-size:22px">«Me siento mal cuando llegas tarde, porque te espero sola. Me gustaría que me avisaras.»</span>`, 660, 205, 530, 210, '#ffffff', { color: INK, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('La fórmula: <b>Me siento</b> ___ <b>cuando</b> ___ <b>porque</b> ___. <b>Me gustaría</b> ___.', 90, 430, 1100, 80, { fontSize: 28, color: INK, textAlign: 'center' }),
        text('Hablas de lo que sientes tú, no atacas a la otra persona.', 90, 520, 1100, 50, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'Que cada uno transforme una frase acusadora en un mensaje yo.' },
      { title: 'Los pasos de la mediación', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Calmarse\nContar cada parte su versión\nEntender cómo se siente el otro\nProponer soluciones\nAcordar y revisar', 110, 210, 1060, 300, { color: INK }),
        text('Una persona mediadora no juzga ni decide: ayuda a que las dos partes se entiendan.', 110, 540, 1060, 60, { fontSize: 23, color: '#5a6170', textAlign: 'center' })],
        notes: 'Si el centro tiene alumnado mediador, explica cómo acudir a él.' },
      { title: 'Rol-play', layout: 'titleOnly', bg: BG, extra: [
        text('Laura y Diego tienen que hacer un trabajo juntos. Laura lo ha hecho casi todo y Diego lo ha entregado con su nombre delante. Laura está muy enfadada.', 110, 195, 1060, 160, { fontSize: 28, color: INK, lineHeight: 1.45 }),
        text(ul('Dos voluntarios hacen de Laura y Diego', 'Primero, como saldría mal', 'Después, con escucha activa y mensajes «yo»'), 110, 380, 1060, 220, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'Dales 3 minutos para preparar. Agradece a los voluntarios. Nadie debe hacer de sí mismo ni de un caso real.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Cuál sería la mejor salida para Laura y Diego?', ['Laura se lo cuenta al profesor sin hablar con Diego', 'Hablan con calma y corrigen el nombre juntos', 'Laura no vuelve a trabajar con Diego', 'Diego le pide perdón y lo dejan así'])],
        notes: 'Debate: hay varias respuestas razonables. Lo importante es que la solución repare lo que pasó y cuide la relación.' },
      closing({ bg: BG, accent: BL, inkc: INK, title: 'Reto de la semana', body: 'Usa al menos un mensaje «yo» esta semana: en casa, con un amigo o en clase. El próximo día, quien quiera cuenta cómo le fue.', seconds: 300, end: '¡A practicar!' }),
    ]), INK));
  } },

  // 8 · Igualdad y respeto.
  edu_tut_equality: { name: 'Tutoría: igualdad y respeto', cat: 'edu', summary: 'Sesión de convivencia en igualdad: qué es un estereotipo, de dónde vienen, cómo influyen en las elecciones, la diversidad que nos rodea, el lenguaje que respeta y una votación y debate para que el alumnado razone su postura', make: () => {
    const BG = '#f6f5f9', INK = '#222033', PU = '#7b5bd0', BL = '#3f6ad8', GR = '#2e9e6b', OR = '#e0873b', RE = '#d8504a';
    return numbered(ink(build({ name: 'Tutoría: igualdad y respeto', palette: 'violet', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'TUTORÍA · IGUALDAD', title: 'Igualdad<br>y respeto', sub: 'Todos somos diferentes y todos merecemos el mismo respeto. Hoy pensamos juntos en cómo tratarnos.', art: peopleArt([PU, BL, GR, OR, RE]), alt: 'Personas distintas una al lado de otra' }),
      { title: '¿Qué es un estereotipo?', layout: 'titleOnly', bg: BG, extra: [
        text('Una idea simplificada sobre un grupo de personas que se aplica a todas por igual: «los de tal sitio son…», «las chicas no…», «los chicos no…».', 110, 190, 1060, 150, { fontSize: 29, color: INK, lineHeight: 1.45 }),
        ...row3([['Simplifica', 'Mete a muchas personas distintas en el mismo saco.', PU], ['Se aprende', 'Lo absorbemos de la publicidad, las series, el entorno.', BL], ['Limita', 'Puede hacer que alguien no se atreva con lo que le gusta.', OR]], { y: 360, h: 220 })],
        notes: 'Pide ejemplos generales de estereotipos que hayan oído (sin dirigirlos a nadie de la clase).' },
      { layout: 'blank', bg: BG, extra: [vote('¿Alguna vez has dejado de hacer algo que te gustaba por lo que pudieran pensar?', ['Sí, varias veces', 'Alguna vez', 'No', 'Prefiero no responder'])],
        notes: 'Votación anónima. Normaliza que a todos nos pasa y abre el debate sin señalar.' },
      { title: 'Los estereotipos influyen', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['En los estudios', 'Hay carreras con mucha diferencia entre chicos y chicas.', BL], ['En las aficiones', 'Deportes, música o juegos que «parecen» de unos u otros.', GR],
          ['En el trato', 'Bromas que repiten ideas que hacen daño.', RE], ['En las expectativas', 'Lo que se espera de alguien por cómo es.', PU]], { bg: '#ffffff' })],
        notes: 'Plantea preguntas abiertas: ¿por qué creéis que pasa? ¿qué se podría hacer? Deja que razonen y escuchen otras opiniones.' },
      { title: 'La diversidad que nos rodea', layout: 'twoContent', bg: BG, extra: [
        img(peopleArt([PU, BL, GR, OR, RE]), 110, 200, 380, 360, 'Diversidad'),
        text(ul('Orígenes y culturas', 'Formas de ser y de pensar', 'Capacidades', 'Creencias', 'Familias y gustos'), 560, 220, 620, 340, { fontSize: 28, color: INK, lineHeight: 1.5 }),
        text('Las diferencias enriquecen al grupo; el respeto lo sostiene.', 560, 560, 620, 60, { fontSize: 23, color: '#5a6170' })],
        notes: 'Pon en valor la diversidad del propio grupo sin exponer a nadie.' },
      { title: 'Un lenguaje que respeta', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'No usar insultos sobre cómo es alguien\nNo hacer «bromas» que humillan a un grupo\nLlamar a cada persona como pide\nSi alguien se siente mal, escuchar y disculparse\nSi oyes algo ofensivo, puedes decir «eso no mola»', 110, 200, 1060, 340, { color: INK })],
        notes: 'El objetivo no es prohibir palabras, sino pensar en el efecto que tienen en los demás.' },
      { layout: 'blank', bg: BG, extra: [quiz('Un compañero hace una «broma» que deja en ridículo a un grupo de personas. ¿Qué es lo más respetuoso?', ['Reírse para no quedar mal', 'Decir con calma que no tiene gracia', 'Grabarlo para enseñarlo', 'Hacer otra broma igual'], 1)],
        notes: 'Decirlo con calma, sin atacar, es lo que más ayuda a que cambie el ambiente.' },
      { title: 'Debate', layout: 'titleOnly', bg: BG, extra: [
        text('«Cada persona debería poder elegir sus estudios y aficiones sin que importe lo que se espera de ella por ser como es.»', 110, 200, 1060, 160, { fontSize: 30, color: INK, lineHeight: 1.45, fontStyle: 'italic' }),
        text(ul('¿Estás de acuerdo? ¿Por qué?', '¿Qué lo hace difícil a veces?', '¿Qué podemos hacer en esta clase?'), 110, 390, 1060, 200, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Modera para que se escuchen todas las posturas con respeto. Tu papel es hacer preguntas, no dar la respuesta.' },
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Nuestro compromiso', body: 'Por grupos, escribid una norma de clase sobre el respeto a las diferencias. La votamos y la añadimos al cartel de normas del aula.', seconds: 420, end: '¡Compromiso!' }),
    ]), INK));
  } },

  // 9 · Bienestar: sueño, pantallas y descanso.
  edu_tut_wellbeing: { name: 'Tutoría: sueño, pantallas y descanso', cat: 'edu', summary: 'Sesión de bienestar: cuántas horas hay que dormir según la edad (Academia Americana de Medicina del Sueño), por qué el sueño importa para aprender, el móvil antes de dormir, hábitos de descanso, votación anónima y plan personal', make: () => {
    const BG = '#f3f1fa', INK = '#211e33', PU = '#6a52c9', BL = '#3f6ad8', GR = '#2e9e6b', OR = '#e0873b', RE = '#d8504a';
    return numbered(ink(build({ name: 'Tutoría: sueño, pantallas y descanso', palette: 'violet', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: PU, inkc: INK, label: 'TUTORÍA · BIENESTAR', title: 'Dormir bien<br>también es estudiar', size: 66, sub: 'El sueño es cuando el cerebro guarda lo aprendido. Hoy vemos cuánto necesitamos y qué nos lo roba.', art: moonArt(PU), alt: 'Una luna sobre un móvil' }),
      { layout: 'blank', bg: BG, extra: [vote('Sin nombres: ¿cuántas horas duermes una noche normal de clase?', ['Menos de 6', 'Entre 6 y 7', 'Entre 7 y 8', 'Más de 8'])],
        notes: 'Votación anónima. Compararemos con lo que recomiendan los especialistas.' },
      { title: '¿Cuánto hay que dormir?', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 200, y: 190, w: 880, h: 250, stroke: '#d9d4ea',
          rows: [['Edad', 'Horas recomendadas'], ['6 a 12 años', '9 a 12 horas'], ['13 a 18 años', '8 a 10 horas'], ['Personas adultas', '7 horas o más']] }),
        text('Fuente: Academia Americana de Medicina del Sueño (AASM): Paruthi y otros, 2016, para niños y adolescentes; Watson y otros, 2015, para adultos.', 200, 465, 880, 90, { fontSize: 20, color: '#5a6170', textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Compara con la votación: muchos adolescentes duermen por debajo de lo recomendado entre semana.' },
      { title: 'Mientras duermes…', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Memoria', 'El cerebro ordena y consolida lo aprendido durante el día.', PU], ['Ánimo', 'Dormir poco hace que estés más irritable y triste.', BL],
          ['Atención', 'Con sueño cuesta más concentrarse y se cometen más errores.', OR], ['Salud', 'El cuerpo crece, se repara y se defiende mejor.', GR]], { bg: '#ffffff' })],
        notes: 'Dormir no es perder el tiempo: es parte del aprendizaje.' },
      { title: 'El móvil antes de dormir', layout: 'twoContent', bg: BG, extra: [
        img(moonArt(PU), 120, 190, 340, 400, 'El móvil en la cama'),
        text(ul('Lo que ves te mantiene alerta: mensajes, vídeos, juegos', 'La luz de la pantalla puede retrasar la hora de sueño', 'Las notificaciones despiertan aunque no lo notes'), 540, 220, 640, 320, { fontSize: 27, color: INK, lineHeight: 1.5 }),
        text('Muchos especialistas aconsejan dejar las pantallas un rato antes de dormir.', 540, 550, 640, 70, { fontSize: 22, color: '#5a6170', lineHeight: 1.4 })],
        notes: 'El efecto más claro es que el contenido nos activa y nos quita tiempo de sueño; la luz también influye.' },
      { title: 'Hábitos que ayudan', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Acostarte y levantarte a horas parecidas\nDejar el móvil fuera de la cama\nCenar ligero y evitar bebidas con cafeína por la tarde\nUn rato tranquilo antes de dormir: leer, música suave\nMoverte durante el día', 110, 200, 1060, 340, { color: INK })],
        notes: 'Que cada uno elija el hábito que le resulte más fácil de cambiar.' },
      { layout: 'blank', bg: BG, extra: [quiz('Según la AASM, ¿cuántas horas debería dormir alguien de 15 años?', ['6 horas', 'Entre 8 y 10 horas', 'Entre 11 y 13 horas', 'Da igual si el fin de semana recupera'], 1)],
        notes: 'Entre 8 y 10 horas. Recuperar el fin de semana no compensa del todo dormir poco a diario.' },
      { title: 'Si te cuesta dormir', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Si es de vez en cuando', 'Es normal: nervios, un examen, un problema.', GR], ['Si es casi siempre', 'Coméntalo en casa y con tu médico/a.', OR],
          ['Si es por preocupaciones', 'Habla con alguien de confianza o con orientación.', PU], ['Teléfono ANAR', '900 20 20 10, si necesitas hablar con alguien.', BL]], { bg: '#ffffff' })],
        notes: 'Si alguien te cuenta que no duerme por preocupaciones serias, escucha y deriva al equipo de orientación.' },
      closing({ bg: BG, accent: PU, inkc: INK, title: 'Mi plan de descanso', body: 'Esta semana, elige una hora para dejar el móvil y una hora para acostarte, y apúntalas. El próximo día, cuenta cómo has dormido.', seconds: 300, end: '¡A descansar!' }),
    ]), INK));
  } },

  // 10 · Orientación: ¿qué quiero estudiar?
  edu_tut_future: { name: 'Tutoría: ¿qué quiero estudiar?', cat: 'edu', summary: 'Sesión de orientación académica y profesional: conocer tus intereses, los caminos tras la ESO (Bachillerato y sus modalidades, FP de grado medio y superior, universidad), profesiones, una votación y un plan de pasos', make: () => {
    const BG = '#f4f7f6', INK = '#1d2624', TE = '#1f8f84', BL = '#3f6ad8', OR = '#e0873b', PU = '#7b5bd0', GR = '#2e9e6b';
    return numbered(ink(build({ name: 'Tutoría: ¿qué quiero estudiar?', palette: 'ocean', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      cover({ bg: BG, accent: TE, inkc: INK, label: 'TUTORÍA · ORIENTACIÓN', title: '¿Qué quiero<br>estudiar?', sub: 'No hace falta tenerlo todo claro. Hoy exploramos qué te gusta y qué caminos hay después de la ESO.', art: forkArt([TE, BL, OR]), alt: 'Un camino que se divide en tres' }),
      { layout: 'blank', bg: BG, extra: [vote('¿Qué te atrae más ahora mismo?', ['Ciencia y tecnología', 'Letras, idiomas y sociedad', 'Arte, diseño y comunicación', 'Un oficio práctico desde ya'])],
        notes: 'Votación anónima. Es normal cambiar de idea; esto es solo un punto de partida.' },
      { title: 'Conócete', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['¿Qué te gusta hacer?', 'Lo que haces sin que te lo pidan.', TE], ['¿Qué se te da bien?', 'Pregunta también a quien te conoce.', BL],
          ['¿Qué valoras?', 'Ayudar, crear, investigar, organizar, ganar dinero…', OR], ['¿Cómo te gusta trabajar?', 'Con gente o solo, en un despacho o al aire libre.', PU]], { bg: '#ffffff' })],
        notes: 'Que respondan por escrito las cuatro preguntas. Es la base de cualquier decisión.' },
      { title: 'Caminos después de la ESO', layout: 'titleOnly', bg: BG, extra: [
        dg('hierarchy', 'Título de la ESO\n  Bachillerato (2 cursos)\n    Universidad\n    FP de grado superior\n  FP de grado medio\n    FP de grado superior\n    Mundo laboral', 110, 190, 1060, 380, { color: INK }),
        text('Los caminos se conectan: elegir uno no cierra los demás.', 110, 590, 1060, 40, { fontSize: 22, color: '#5a6170', textAlign: 'center' })],
        notes: 'Recuerda también la FP de grado básico y las pruebas de acceso. Para la universidad tras el Bachillerato hay una prueba de acceso.' },
      { title: 'Las modalidades del Bachillerato', layout: 'titleOnly', bg: BG, extra: [
        ...grid([['Ciencias y Tecnología', 'Ciencias, ingenierías, salud.', TE], ['Humanidades y Ciencias Sociales', 'Derecho, economía, idiomas, educación.', BL],
          ['Artes', 'Bellas artes, diseño, artes escénicas, música y danza.', OR], ['General', 'Una opción más amplia, sin especializarse tanto.', PU]], { bg: '#ffffff' })],
        notes: 'Son las cuatro modalidades de la LOMLOE. Consulta cuáles ofrece vuestro centro y los de la zona.' },
      { title: 'La Formación Profesional', layout: 'titleOnly', bg: BG, extra: [
        ...row3([['Grado medio', 'Tras la ESO. Dos cursos, con prácticas en empresas.', TE], ['Grado superior', 'Tras el Bachillerato o un grado medio. Abre la puerta a la universidad.', BL], ['Familias', 'Sanidad, informática, mecánica, hostelería, imagen y sonido, y muchas más.', OR]], { y: 205, h: 290 })],
        notes: 'La FP tiene mucha salida laboral. Animad a visitar la web oficial TodoFP del Ministerio de Educación para ver todos los ciclos.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Desde qué estudios se puede llegar a la universidad?', ['Solo desde el Bachillerato', 'Desde el Bachillerato o desde una FP de grado superior', 'Solo desde una FP de grado medio', 'Desde ninguno sin examen'], 1)],
        notes: 'Bachillerato (con la prueba de acceso) o FP de grado superior. Los caminos están conectados.' },
      { title: 'Investiga una profesión', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Elige una profesión que te llame la atención\nBusca qué se estudia para llegar a ella\nAverigua cómo es un día de trabajo\nPregunta a alguien que se dedique a eso\nApunta qué te gusta y qué no', 110, 200, 1060, 340, { color: INK })],
        notes: 'Pueden hacerlo como trabajo para la próxima tutoría y compartirlo en dos minutos.' },
      closing({ bg: BG, accent: TE, inkc: INK, title: 'Mi plan de pasos', body: 'Escribe tres pasos para este curso: algo que vas a investigar, alguien con quien vas a hablar (familia, orientación) y una decisión que puedes tomar ya. Lo revisamos en la próxima tutoría.', seconds: 420, end: '¡Plan hecho!' }),
    ]), INK));
  } },

};
