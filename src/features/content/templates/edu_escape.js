// Example presentations: Escape rooms y laboratorios por asignaturas. Each one: { name, summary, cat: 'edu', make() }
// → a deck (see kit.js). Escape rooms: pistas que se revelan, un candado de 4 cifras que se va rellenando, cuenta
// atrás y cuestionarios para comprobar. Laboratorios: hipótesis → material y seguridad → procedimiento → datos →
// conclusión, con tablas y gráficos. Todos los dibujos son nuestros (SVG como data URL); no hay imágenes de fuera.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const keep = (b, id) => ({ ...b, id });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 36, x: 70, y: 60, w: 1140, h: 600, ...props });
const FF = { mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif", caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif", special: "'Special Elite', monospace" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A padlock drawn by us: the shackle open or closed, and four digit windows (strings; '?' while unknown).
const padlock = (digits, open = false, body = '#f2c14e') => svgURL(360, 440,
  `<path d="M100 180 v-50 a80 80 0 0 1 160 0 v50" fill="none" stroke="#cfd6e4" stroke-width="26" stroke-linecap="round"${open ? ' transform="translate(70 -8) rotate(16 100 110)"' : ''}/>`
  + `<rect x="60" y="178" width="240" height="210" rx="26" fill="${body}" stroke="#b5892f" stroke-width="4"/>`
  + digits.map((d, i) => `<rect x="${82 + i * 54}" y="238" width="46" height="70" rx="8" fill="#1b1f29"/><text x="${105 + i * 54}" y="292" font-family="monospace" font-size="42" font-weight="700" fill="${d === '?' ? '#6b7280' : '#f5f7fb'}" text-anchor="middle">${d}</text>`).join('')
  + `<circle cx="180" cy="356" r="12" fill="#1b1f29"/>`);
// A clue tag (torn paper look) with a number inside.
const clue = (n, label, x, y, color) => [shape('rounded', x, y, 300, 120, '#fff8e7', { radius: 10, rotation: n % 2 ? -3 : 3, stroke: '#e5d3a1', strokeWidth: 2 }),
  text(`<b style="color:${color};font-size:40px">${label}</b>`, x, y + 32, 300, 60, { fontSize: 30, textAlign: 'center', rotation: n % 2 ? -3 : 3 })];

export default {

  // 1 · Escape room de Matemáticas: cuatro retos dan cuatro cifras; un candado que se abre al final; cuenta atrás.
  edu_escape_math: { name: 'Escape room: la sala de los números', cat: 'edu', summary: 'Escape room de matemáticas: cuatro retos de cálculo y lógica que dan las cifras de un candado, pistas que se revelan, cuenta atrás y la puerta que se abre al acertar', make: () => {
    const BG = '#0e1118', PANEL = '#19202e', AM = '#f2c14e', GR = '#5fd38a', RE = '#ef6b6b', CY = '#5bb8e0', DIM = '#8a97ad', CREAM = '#eef2fa', M = FF.mono, S = FF.space;
    const retos = [['Reto 1 · Secuencia', 'La serie 2, 4, 8, 16… ¿cuál es la <b>cifra de las unidades</b> del término que sigue?', '2', '32 → unidades: 2'],
      ['Reto 2 · Operación', '¿Cuánto vale <b>7 × 8 − 53</b>?', '3', '56 − 53 = 3'],
      ['Reto 3 · Edades', 'Ana tiene el triple que su hermano, que tiene 3. ¿Cuántos años tiene Ana?', '9', '3 × 3 = 9'],
      ['Reto 4 · Geometría', '¿Cuántos lados tiene un <b>heptágono</b>?', '7', 'hepta = 7']];
    return numbered(ink(build({ name: 'Escape room: la sala de los números', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AM, BG, 30), glow(-120, 560, 520, RE, BG, 24)], extra: [
        text('MATEMÁTICAS · ESCAPE ROOM', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: AM, fontWeight: 700, fontFamily: M }),
        text('La sala de<br>los números', 84, 188, 700, 220, { fontSize: 78, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('Resolved los 4 retos, conseguid las 4 cifras y abrid el candado antes de que acabe el tiempo.', 90, 452, 640, 110, { fontSize: 27, color: DIM, lineHeight: 1.35 }),
        after(img(padlock(['?', '?', '?', '?']), 820, 150, 360, 440, 'Un candado cerrado de cuatro cifras'), 'zoom-in', { duration: 900 })],
        notes: 'Arranque de misterio. Explica la mecánica: cada reto da una cifra; con las cuatro, se abre el candado. Pon en marcha la cuenta atrás en la próxima diapositiva.' },
      { title: 'Las reglas del juego', layout: 'titleOnly', bg: BG, extra: [
        ...[['Por equipos', 'Cuatro personas; cada una lidera un reto.', CY], ['Una cifra por reto', 'Cada acierto desvela un dígito del código.', AM], ['Sin móvil', 'Solo cabeza, lápiz y papel.', RE], ['Contra el reloj', '25 minutos: luego, a poner en común.', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 210; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, x, y, 525, 180, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up', { sound: 'pop' })]; }).flat(),
        timer(1500, 1030, 150, 210, { color: AM, endText: '¡Tiempo!' })],
        notes: 'Un clic por regla; el cronómetro de 25 minutos arranca solo. Si alguien acaba antes, que ayude a otro equipo.' },
      ...retos.flatMap(([titulo, enunciado, cifra, pista], i) => [
        { title: titulo, layout: 'titleOnly', bg: BG, extra: [
          text(enunciado, 90, 190, 760, 240, { fontSize: 34, color: CREAM, lineHeight: 1.4 }),
          on(img(padlock(['1', '2', '3', '4'].map((_, k) => k < i ? retos[k][2] : '?')), 880, 150, 320, 390, 'El candado con ' + i + ' cifras puestas'), 'fade-left'),
          after(card(`La cifra es <b style="color:${GR};font-size:46px">${cifra}</b><br><span style="font-size:20px;color:${DIM}">${pista}</span>`, 90, 470, 760, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: GR, pad: [16, 22, 14, 22] }), 'zoom-in', { sound: 'pop' })],
          notes: `Reto ${i + 1}. Deja que lo resuelvan; con un clic aparece la cifra (${cifra}) y su explicación, y el candado muestra las cifras conseguidas hasta ahora.` }]),
      { layout: 'blank', bg: BG, extra: [quiz('Con las cuatro cifras en orden, ¿cuál es el código del candado?', ['2 · 3 · 9 · 7', '3 · 2 · 7 · 9', '2 · 9 · 3 · 7', '9 · 7 · 3 · 2'], 0)],
        notes: 'Comprobación: el código es 2-3-9-7 (en el orden de los retos). Trampa: confundir el orden.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GR, BG, 40)], transition: 'zoom', extra: [
        after(img(padlock(['2', '3', '9', '7'], true, GR), 460, 110, 360, 440, 'El candado abierto'), 'zoom-in', { duration: 900, sound: 'chime' }),
        text('¡Habéis escapado!', 90, 560, 1100, 100, { fontSize: 66, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: S })],
        notes: 'El candado se abre. Cierre: repasad qué tipo de problema era cada reto (secuencia, operación, proporción, geometría).' },
    ]), CREAM));
  } },

  // 2 · Laboratorio de Química: ácidos y bases con indicador de lombarda; seguridad, hipótesis, procedimiento, tabla de datos y conclusión.
  edu_lab_chem: { name: 'Laboratorio: ¿ácido o base?', cat: 'edu', summary: 'Laboratorio de química: seguridad, hipótesis y votación, el indicador de lombarda con su escala de color, procedimiento paso a paso, tabla de datos para rellenar, gráfico de pH y conclusión', make: () => {
    const PAPER = '#f4f7f6', INK = '#17251f', GR = '#2e9e6b', PUR = '#7b3fa0', RED = '#d84b3f', BLU = '#2563a8', GREY = '#5f6f68', M = FF.mono, S = FF.space;
    // The red-cabbage colour scale from acid (red/pink) through neutral (purple) to base (green/yellow).
    const SCALE = ['#d1344b', '#e0556b', '#b8528f', '#7b3fa0', '#4b57b0', '#2e8f7d', '#6fae3a', '#c7c935'];
    const phstrip = () => svgURL(960, 150, SCALE.map((c, i) => `<rect x="${i * 120}" y="10" width="120" height="90" fill="${c}"/><text x="${i * 120 + 60}" y="135" font-family="monospace" font-size="26" fill="#17251f" text-anchor="middle">${i * 2 + 1}</text>`).join('')
      + `<text x="10" y="128" font-family="sans-serif" font-size="22" fill="#d1344b" font-weight="700">ácido</text><text x="950" y="128" font-family="sans-serif" font-size="22" fill="#6fae3a" font-weight="700" text-anchor="end">base</text>`);
    const beaker = (x, y, col) => shape('custom', x, y, 90, 110, col, { path: 'M20 0 H80 V18 L70 30 V92 A8 8 0 0 1 62 100 H38 A8 8 0 0 1 30 92 V30 L20 18 Z', opacity: 80 });
    return numbered(ink(build({ name: 'Laboratorio: ¿ácido o base?', palette: 'forest', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, PUR, PAPER, 16), glow(-120, 560, 520, GR, PAPER, 16)], extra: [
        text('CIENCIAS · PRÁCTICA DE LABORATORIO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700 }),
        text('¿Ácido o base?', 84, 198, 760, 130, { fontSize: 84, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Descubrimos el pH de cosas de casa con un indicador hecho con lombarda.', 90, 340, 680, 90, { fontSize: 28, color: GREY }),
        after(img(phstrip(), 90, 470, 760, 120, 'La escala de color del indicador de lombarda'), 'fade-up', { duration: 800 }),
        beaker(980, 250, PUR), beaker(1090, 250, RED)],
        notes: 'Arranque: la col lombarda es un indicador natural. Hoy medimos si varias sustancias son ácidas o básicas por el color que toman.' },
      { title: 'Primero, seguridad', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Gafas y bata', 'Siempre puestas durante la práctica.', BLU], ['No se prueba nada', 'Ni oler de cerca; se abanica el olor hacia la nariz.', RED], ['Poca cantidad', 'Unas gotas bastan; sobra se tira donde diga el profe.', GR], ['Avisa', 'Cualquier salpicadura o duda, se avisa al momento.', PUR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:28px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'La seguridad va primero, siempre. Un clic por norma. Recordar dónde están el lavaojos y el punto de recogida de residuos.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Antes de probar: ¿cuál crees que es el MÁS ácido?', options: ['Vinagre', 'Agua con jabón', 'Zumo de limón', 'Bicarbonato disuelto'] })],
        notes: 'Hipótesis en directo: que voten antes de medir. Luego se compara con el resultado (el limón y el vinagre son ácidos; el jabón y el bicarbonato, básicos).' },
      { title: 'El indicador de lombarda', layout: 'titleOnly', bg: PAPER, extra: [
        img(phstrip(), 90, 200, 1100, 140, 'Escala de color del indicador'),
        text('El jugo de lombarda cambia de color según el pH: <b style="color:' + RED + '">rojo/rosa</b> si es ácido, <b style="color:' + PUR + '">morado</b> si es neutro, <b style="color:' + GR + '">verde/amarillo</b> si es base.', 90, 380, 1100, 120, { fontSize: 27, color: INK, lineHeight: 1.4 }),
        text('Un color, un número de pH: de 1 (muy ácido) a 14 (muy básico); 7 es neutro.', 90, 520, 1100, 50, { fontSize: 23, color: GREY })],
        notes: 'La escala relaciona color y pH. Mostrar el vaso de jugo de lombarda morado (neutro) antes de añadir nada.' },
      { title: 'El procedimiento', layout: 'titleOnly', bg: PAPER, extra: [
        dg('steps', 'Pon 2 dedos de jugo de lombarda en cada vaso\nAñade unas gotas de la sustancia a probar\nAgita suavemente y observa el color\nCompara con la escala y anota el pH\nLimpia y repite con la siguiente', 110, 200, 1060, 320, { color: INK }),
        text('Un vaso por sustancia; etiquétalos para no confundirte.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Escalera de 5 pasos. Insistir en etiquetar los vasos y en añadir pocas gotas.' },
      { title: 'Anota tus datos', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 110, y: 185, w: 1060, h: 340, stroke: '#cdd8d2',
          rows: [['Sustancia', 'Color', 'pH aprox.', '¿Ácido o base?'], ['Zumo de limón', '', '', ''], ['Vinagre', '', '', ''], ['Agua', '', '', ''], ['Agua con jabón', '', '', ''], ['Bicarbonato', '', '', '']] }),
        text('Rellena la tabla con lo que observes. La fila del agua es tu referencia neutra (morado, pH ≈ 7).', 110, 545, 1060, 60, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla para completar en clase (en la pizarra o cada equipo la suya). El agua da el morado neutro de referencia.' },
      { title: 'Lo que suele salir', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 420, chartType: 'bar', color: GR, yTitle: 'pH aprox.',
          data: [{ label: 'Limón', value: 2, color: RED }, { label: 'Vinagre', value: 3, color: RED }, { label: 'Agua', value: 7, color: PUR }, { label: 'Jabón', value: 9, color: GR }, { label: 'Bicarbonato', value: 9, color: GR }] }),
        text('Por debajo de 7, ácido; por encima, base. El agua, en medio.', 110, 610, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Gráfico de barras con valores orientativos. Comparar con la hipótesis de la votación: ¿acertasteis?' },
      { layout: 'blank', bg: '#eef3f0', extra: [quiz('Una sustancia pone el indicador VERDE. ¿Qué es?', ['Un ácido fuerte', 'Neutra', 'Una base', 'No se puede saber'], 2)],
        notes: 'Repaso: verde/amarillo = base. Rojo/rosa = ácido. Morado = neutro.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 16)], transition: 'zoom', extra: [
        text('En casa (con permiso)', 84, 140, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Haz jugo de lombarda hirviéndola un poco. Prueba con refresco, leche, zumos… Anota el color y clasifica cada uno. Trae tu tabla a la próxima clase.', 84, 250, 760, 190, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(600, 900, 210, 300, { color: GR, endText: '¡A ordenar el laboratorio!' })],
        notes: 'Diez minutos para recoger y empezar a planear la versión casera. La col lombarda es barata y el experimento es seguro en casa con supervisión.' },
    ]), INK));
  } },

  // 3 · Escape room de Historia: atrapados en una tumba; cuatro pistas de Egipto dan el código del sello.
  edu_escape_egypt: { name: 'Escape room: la tumba del faraón', cat: 'edu', summary: 'Escape room de Historia (Antiguo Egipto): jeroglíficos que son números, pistas sobre pirámides y faraones que dan el código del sello, cuenta atrás y la tumba que se abre', make: () => {
    const BG = '#140f06', PANEL = '#241a0a', GOLD = '#e8b84b', SAND = '#d9c08a', GR = '#5fd38a', RE = '#e07a5f', DIM = '#a2906a', CREAM = '#f6efdc', M = FF.mono, S = FF.space;
    const retos = [['Reto 1 · Jeroglíficos', 'Los egipcios escribían con símbolos: una herradura ∩ vale 10 y una raya | vale 1. ¿Qué cifra de las unidades es «∩ | | |»?', '3', '10 + 3 = 13 → unidades 3'],
      ['Reto 2 · Guiza', '¿Cuántas <b>grandes pirámides</b> hay en la meseta de Guiza?', '3', 'Keops, Kefrén y Micerino'],
      ['Reto 3 · Tutankamón', 'El faraón niño subió al trono con unos… ¿cuántos años?', '9', 'alrededor de los 9'],
      ['Reto 4 · Dos tierras', 'Egipto nació al unir dos reinos: el Alto y el Bajo. ¿Cuántos reinos se unieron?', '2', 'Alto + Bajo = 2']];
    return numbered(ink(build({ name: 'Escape room: la tumba del faraón', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, GOLD, BG, 26), glow(-120, 560, 520, RE, BG, 20)], extra: [
        text('HISTORIA · ESCAPE ROOM', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: GOLD, fontWeight: 700, fontFamily: M }),
        text('La tumba<br>del faraón', 84, 188, 700, 220, { fontSize: 80, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('La puerta se ha sellado tras vosotros. Resolved cuatro enigmas del Antiguo Egipto para dar con el código y salir.', 90, 452, 640, 120, { fontSize: 27, color: DIM, lineHeight: 1.35 }),
        after(img(padlock(['?', '?', '?', '?'], false, GOLD), 820, 150, 360, 440, 'El sello cerrado de la tumba'), 'zoom-in', { duration: 900 })],
        notes: 'Ambienta: estáis dentro de una pirámide. Mecánica igual que cualquier escape: cada enigma da una cifra del sello.' },
      { title: 'Cómo salir de aquí', layout: 'titleOnly', bg: BG, extra: [
        ...[['Cuatro enigmas', 'Cada uno da una cifra del sello.', GOLD], ['Por equipos', 'Repartíos los enigmas y ayudaos.', SAND], ['Con cabeza', 'Las pistas están en lo que sabéis de Egipto.', RE], ['El reloj corre', '20 minutos antes de que se cierre del todo.', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 210; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, x, y, 525, 180, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up', { sound: 'pop' })]; }).flat(),
        timer(1200, 1030, 150, 210, { color: GOLD, endText: '¡Se cierra!' })],
        notes: 'Un clic por norma; cuenta atrás de 20 minutos arranca sola.' },
      ...retos.flatMap(([titulo, enunciado, cifra, pista], i) => [
        { title: titulo, layout: 'titleOnly', bg: BG, extra: [
          text(enunciado, 90, 190, 760, 250, { fontSize: 33, color: CREAM, lineHeight: 1.4 }),
          on(img(padlock(['1', '2', '3', '4'].map((_, k) => k < i ? retos[k][2] : '?'), false, GOLD), 880, 150, 320, 390, 'El sello con ' + i + ' cifras'), 'fade-left'),
          after(card(`La cifra es <b style="color:${GR};font-size:46px">${cifra}</b><br><span style="font-size:20px;color:${DIM}">${pista}</span>`, 90, 470, 760, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: GR, pad: [16, 22, 14, 22] }), 'zoom-in', { sound: 'pop' })],
          notes: `Enigma ${i + 1}. Que lo discutan; con un clic sale la cifra (${cifra}) y el sello se actualiza.` }]),
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es el código del sello, en el orden de los enigmas?', ['3 · 3 · 9 · 2', '2 · 9 · 3 · 3', '3 · 9 · 3 · 2', '9 · 3 · 3 · 2'], 0)],
        notes: 'El código es 3-3-9-2. Distractores con las mismas cifras desordenadas.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GOLD, BG, 36)], transition: 'zoom', extra: [
        after(img(padlock(['3', '3', '9', '2'], true, GOLD), 460, 110, 360, 440, 'El sello abierto'), 'zoom-in', { duration: 900, sound: 'chime' }),
        text('¡La tumba se abre!', 90, 560, 1100, 100, { fontSize: 64, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: S })],
        notes: 'Cierre: repasad de dónde salía cada cifra. Buen momento para preguntar qué les ha sorprendido de Egipto.' },
    ]), CREAM));
  } },

  // 4 · Laboratorio de Física: el péndulo. Hipótesis, procedimiento, tabla de tiempos, gráfico y conclusión.
  edu_lab_physics: { name: 'Laboratorio: el péndulo', cat: 'edu', summary: 'Laboratorio de física: ¿de qué depende el periodo de un péndulo? Hipótesis y votación, material, procedimiento de medida, tabla de datos, gráfico longitud-periodo y conclusión', make: () => {
    const PAPER = '#f3f5fa', INK = '#1a2233', BL = '#2f6df0', OR = '#e8823b', GR = '#2e9e6b', PUR = '#7b4fb0', GREY = '#64708a', M = FF.mono, S = FF.space;
    // A pendulum: a pivot, a string at an angle and a bob, with a faint arc.
    const pendulum = (deg = 24) => { const a = deg * Math.PI / 180, x = 180 + 150 * Math.sin(a), y = 40 + 150 * Math.cos(a);
      return svgURL(360, 260, `<path d="M60 206 A160 160 0 0 1 300 206" fill="none" stroke="#c7d0e4" stroke-width="2" stroke-dasharray="4 8"/>`
        + `<rect x="120" y="28" width="120" height="14" rx="4" fill="#8794ad"/><line x1="180" y1="40" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${INK}" stroke-width="3"/>`
        + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="${BL}" stroke="#1b4fb8" stroke-width="3"/>`); };
    return numbered(ink(build({ name: 'Laboratorio: el péndulo', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, BL, PAPER, 16), glow(-120, 560, 520, OR, PAPER, 14)], extra: [
        text('FÍSICA · PRÁCTICA DE LABORATORIO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('El péndulo', 84, 198, 720, 120, { fontSize: 88, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('¿De qué depende el tiempo que tarda en ir y volver? Vamos a medirlo.', 90, 338, 640, 90, { fontSize: 28, color: GREY }),
        after(img(pendulum(26), 840, 180, 360, 300, 'Un péndulo oscilando'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: colgamos un peso de una cuerda y lo dejamos oscilar. La pregunta: ¿qué cambia el «periodo» (ir y volver una vez)?' },
      { title: 'La pregunta y la hipótesis', layout: 'titleOnly', bg: PAPER, extra: [
        text('El <b>periodo</b> es lo que tarda en una ida y vuelta. ¿De qué creéis que depende?', 90, 185, 1100, 70, { fontSize: 28, color: INK }),
        pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 270, w: 1140, h: 360,
          question: '¿Qué hará que tarde más en cada vaivén?', options: ['Un peso más pesado', 'Una cuerda más larga', 'Soltarlo desde más alto', 'Da igual, siempre tarda lo mismo'] })],
        notes: 'Hipótesis en directo. Muchos dirán «el peso» o «la altura»; la práctica mostrará que manda la longitud. No adelantar la respuesta.' },
      { title: 'Material y montaje', layout: 'twoContent', bg: PAPER, extra: [
        img(pendulum(20), 120, 200, 340, 290, 'El montaje del péndulo'),
        text(ul('Una cuerda o hilo fuerte', 'Una tuerca o peso pequeño', 'Un soporte o el canto de la mesa', 'Un cronómetro (el del móvil)', 'Una regla o cinta métrica'), 620, 210, 560, 400, { fontSize: 28, color: INK })],
        notes: 'Montaje sencillo y barato. El peso debe colgar libre y oscilar poco (ángulos pequeños, menos de 20°).' },
      { title: 'El procedimiento', layout: 'titleOnly', bg: PAPER, extra: [
        dg('steps', 'Mide la longitud de la cuerda (del soporte al centro del peso)\nSepáralo un poco (ángulo pequeño) y suéltalo\nCronometra 10 vaivenes completos\nDivide ese tiempo entre 10: ese es el periodo\nRepite con 3 longitudes distintas', 110, 200, 1060, 320, { color: INK }),
        text('Medir 10 vaivenes y dividir reduce el error del cronómetro.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Clave metodológica: medir 10 y dividir. Mantener el mismo peso y el mismo ángulo; solo cambia la longitud.' },
      { title: 'Anota tus medidas', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 190, w: 980, h: 300, stroke: '#cdd6ea',
          rows: [['Longitud (cm)', 'Tiempo de 10 vaivenes (s)', 'Periodo (s)'], ['20', '', ''], ['40', '', ''], ['60', '', ''], ['80', '', '']] }),
        text('El periodo es la tercera columna = tiempo ÷ 10. Mismo peso y mismo ángulo en todas.', 150, 520, 980, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla para rellenar. Cada equipo con sus medidas; luego se comparan.' },
      { title: 'Lo que sale al dibujarlo', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 420, chartType: 'line', color: BL, grid: true, xTitle: 'Longitud (cm)', yTitle: 'Periodo (s)', seriesName: 'Periodo',
          data: [[20, 0.9], [40, 1.27], [60, 1.55], [80, 1.79]].map(([l, p]) => ({ label: String(l), value: p })) }),
        text('Más larga la cuerda → más tarda. El peso no cambia el resultado.', 110, 610, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'La curva sube con la longitud (en realidad con su raíz cuadrada). Valores orientativos de un péndulo real.' },
      { layout: 'blank', bg: '#eaf0fa', extra: [quiz('Dos péndulos de la misma longitud, uno con doble peso. ¿Cuál tarda más en cada vaivén?', ['El más pesado', 'El más ligero', 'Tardan lo mismo', 'Depende de la altura'], 2)],
        notes: 'Resultado clásico y contraintuitivo: el periodo NO depende de la masa (a ángulos pequeños). Solo de la longitud.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, BL, PAPER, 16)], transition: 'zoom', extra: [
        text('Conclusión y reto', 84, 140, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('El periodo depende de la LONGITUD, no del peso ni de la altura (si el ángulo es pequeño). Reto: ¿qué longitud necesitas para que tarde justo 1 segundo en cada vaivén? Pruébalo.', 84, 250, 760, 200, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(480, 900, 210, 300, { color: BL, endText: '¡Comparad resultados!' })],
        notes: 'Cierre con la idea grande (solo la longitud) y un reto: ~25 cm da un periodo de ~1 s. Conecta con los relojes de péndulo.' },
    ]), INK));
  } },

  // 5 · Escape room de Lengua: enigmas de gramática y literatura abren la cámara de los libros.
  edu_escape_library: { name: 'Escape room: el misterio de la biblioteca', cat: 'edu', summary: 'Escape room de Lengua: enigmas de sílabas, categorías gramaticales y literatura que dan el código de la cámara de los libros, pistas que se revelan y cuenta atrás', make: () => {
    const BG = '#141017', PANEL = '#221a2a', VI = '#b48ce8', AM = '#e8c04b', GR = '#5fd38a', RE = '#e07a9a', DIM = '#9a8aa8', CREAM = '#f3eefa', M = FF.mono, S = FF.space;
    const retos = [['Reto 1 · Sílabas', '¿Cuántas sílabas tiene la palabra <b>biblioteca</b>?', '4', 'bi-blio-te-ca = 4'],
      ['Reto 2 · Literatura', '«El Quijote» lo escribió Cervantes. ¿En qué siglo? (solo el número)', '7', 'siglo XVII = 17 → 7'],
      ['Reto 3 · Vocales', '¿Cuántas vocales <b>distintas</b> hay en «murciélago»?', '5', 'u, i, e, a, o = 5'],
      ['Reto 4 · Gramática', 'De estas, ¿cuántas son palabras <b>variables</b>: nombre, verbo, adjetivo, adverbio?', '3', 'el adverbio es invariable → 3']];
    return numbered(ink(build({ name: 'Escape room: el misterio de la biblioteca', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 46 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, VI, BG, 26), glow(-120, 560, 520, RE, BG, 20)], extra: [
        text('LENGUA · ESCAPE ROOM', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: VI, fontWeight: 700, fontFamily: M }),
        text('El misterio de<br>la biblioteca', 84, 188, 720, 220, { fontSize: 72, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('La cámara de los libros antiguos se ha cerrado. Resolved cuatro enigmas de lengua para dar con el código.', 90, 452, 640, 120, { fontSize: 27, color: DIM, lineHeight: 1.35 }),
        after(img(padlock(['?', '?', '?', '?'], false, VI), 820, 150, 360, 440, 'Un candado cerrado'), 'zoom-in', { duration: 900 })],
        notes: 'Arranque. Cada enigma de lengua da una cifra; con las cuatro se abre la cámara.' },
      { title: 'Cómo se juega', layout: 'titleOnly', bg: BG, extra: [
        ...[['Cuatro enigmas', 'Cada uno da una cifra del código.', VI], ['Por equipos', 'Repartíos sílabas, vocales, gramática y literatura.', AM], ['Con lo aprendido', 'Las pistas están en clase de Lengua.', RE], ['El reloj corre', '20 minutos.', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 210; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, x, y, 525, 180, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up', { sound: 'pop' })]; }).flat(),
        timer(1200, 1030, 150, 210, { color: VI, endText: '¡Se cierra!' })],
        notes: 'Un clic por norma; cuenta atrás de 20 minutos.' },
      ...retos.flatMap(([titulo, enunciado, cifra, pista], i) => [
        { title: titulo, layout: 'titleOnly', bg: BG, extra: [
          text(enunciado, 90, 190, 760, 240, { fontSize: 34, color: CREAM, lineHeight: 1.4 }),
          on(img(padlock(['1', '2', '3', '4'].map((_, k) => k < i ? retos[k][2] : '?'), false, VI), 880, 150, 320, 390, 'El candado con ' + i + ' cifras'), 'fade-left'),
          after(card(`La cifra es <b style="color:${GR};font-size:46px">${cifra}</b><br><span style="font-size:20px;color:${DIM}">${pista}</span>`, 90, 470, 760, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: GR, pad: [16, 22, 14, 22] }), 'zoom-in', { sound: 'pop' })],
          notes: `Enigma ${i + 1}. Dejad que lo razonen; con un clic sale la cifra (${cifra}).` }]),
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es el código, en el orden de los enigmas?', ['4 · 7 · 5 · 3', '7 · 4 · 3 · 5', '4 · 5 · 7 · 3', '3 · 5 · 7 · 4'], 0)],
        notes: 'El código es 4-7-5-3.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GR, BG, 36)], transition: 'zoom', extra: [
        after(img(padlock(['4', '7', '5', '3'], true, GR), 460, 110, 360, 440, 'El candado abierto'), 'zoom-in', { duration: 900, sound: 'chime' }),
        text('¡La cámara se abre!', 90, 560, 1100, 100, { fontSize: 64, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: S })],
        notes: 'Cierre: repasad cada enigma (sílabas, siglo, vocales, palabras variables).' },
    ]), CREAM));
  } },

  // 6 · Laboratorio de Biología: el microscopio y las células de la cebolla. Hipótesis, procedimiento, observación y conclusión.
  edu_lab_bio: { name: 'Laboratorio: células al microscopio', cat: 'edu', summary: 'Laboratorio de biología: el microscopio y sus partes, preparar una muestra de cebolla, procedimiento paso a paso, qué observar, dibujo de la célula, tabla de observaciones y conclusión', make: () => {
    const PAPER = '#f2f6f3', INK = '#17251c', GR = '#2e9e5b', TE = '#1f8f8f', PUR = '#7b4fb0', ORA = '#e0873b', GREY = '#5f6f64', M = FF.mono, S = FF.space;
    // A simple microscope drawn by us.
    const micro = () => svgURL(300, 360, `<rect x="120" y="300" width="130" height="24" rx="8" fill="#9aa7a0"/><rect x="150" y="150" width="30" height="150" fill="#b9c4bd"/>`
      + `<rect x="120" y="60" width="70" height="90" rx="10" fill="${TE}"/><circle cx="155" cy="48" r="26" fill="#cfd8d2"/>`
      + `<rect x="100" y="200" width="150" height="14" fill="#8a968f"/><rect x="150" y="214" width="26" height="40" fill="#8a968f"/>`
      + `<circle cx="163" cy="300" r="10" fill="${ORA}"/>`);
    // A plant cell seen through the lens: wall, membrane, nucleus, vacuole.
    const cell = () => svgURL(320, 320, `<rect x="20" y="20" width="280" height="280" rx="16" fill="#eaf6ee" stroke="${GR}" stroke-width="8"/>`
      + `<rect x="34" y="34" width="252" height="252" rx="12" fill="#dff0e6" stroke="#8fd0a6" stroke-width="2"/>`
      + `<ellipse cx="110" cy="120" rx="46" ry="42" fill="${PUR}" opacity="0.8"/><text x="110" y="128" font-family="sans-serif" font-size="16" fill="#fff" text-anchor="middle">núcleo</text>`
      + `<ellipse cx="200" cy="200" rx="70" ry="60" fill="#bfe3cc" opacity="0.7"/><text x="200" y="206" font-family="sans-serif" font-size="15" fill="#2e7d46" text-anchor="middle">vacuola</text>`);
    return numbered(ink(build({ name: 'Laboratorio: células al microscopio', palette: 'forest', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, TE, PAPER, 16), glow(-120, 560, 520, GR, PAPER, 14)], extra: [
        text('BIOLOGÍA · PRÁCTICA DE LABORATORIO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700 }),
        text('Células al microscopio', 84, 198, 960, 150, { fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Vamos a ver de verdad las células de una cebolla y a dibujar lo que observamos.', 90, 340, 680, 90, { fontSize: 28, color: GREY }),
        after(img(micro(), 900, 180, 300, 360, 'Un microscopio óptico'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: el microscopio nos deja ver lo invisible. Hoy, las células de la epidermis de la cebolla, que se ven muy bien.' },
      { title: 'El microscopio y sus partes', layout: 'twoContent', bg: PAPER, extra: [
        img(micro(), 120, 200, 300, 360, 'El microscopio'),
        text(ul('<b>Oculares</b>: por donde miras', '<b>Objetivos</b>: las lentes que aumentan (×4, ×10, ×40)', '<b>Platina</b>: donde va la muestra', '<b>Tornillos</b>: enfocan subiendo y bajando', '<b>Luz</b>: ilumina la muestra desde abajo'), 560, 210, 620, 400, { fontSize: 27, color: INK, lineHeight: 1.5 })],
        notes: 'Nombrar las partes señalando el dibujo. El aumento total = ocular × objetivo (p. ej. 10 × 40 = 400 aumentos).' },
      { title: 'Seguridad y cuidado', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Con dos manos', 'Se coge por el brazo y la base.', TE], ['Empieza con poco', 'Primero el objetivo pequeño (×4), luego sube.', GR], ['Enfoca alejando', 'Acerca mirando de lado; enfoca SEPARANDO, nunca acercando a ciegas.', ORA], ['Limpieza', 'Las lentes solo con papel especial.', PUR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:27px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'La regla de oro: enfocar SEPARANDO la platina del objetivo, para no romper el cristal ni la muestra.' },
      { title: 'El procedimiento', layout: 'titleOnly', bg: PAPER, extra: [
        dg('steps', 'Separa una piel finísima de la cara interna de la cebolla\nPonla plana en el portaobjetos con una gota de agua\nAñade una gota de yodo (tiñe el núcleo) y pon el cubre\nEmpieza con ×4, centra y enfoca; luego pasa a ×10 y ×40\nDibuja lo que ves y anótalo', 110, 195, 1060, 330, { color: INK }),
        text('La piel debe quedar bien estirada, sin burbujas bajo el cubreobjetos.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'El yodo (o azul de metileno) tiñe el núcleo para verlo. Cuidado al bajar el cubre para no atrapar burbujas.' },
      { title: 'Lo que vas a ver', layout: 'twoContent', bg: PAPER, extra: [
        img(cell(), 120, 200, 320, 320, 'Una célula vegetal: pared, núcleo y vacuola'),
        text('Celdas ordenadas como ladrillos: cada una con su <b style="color:' + GR + '">pared</b>, su <b style="color:' + PUR + '">núcleo</b> y una gran <b style="color:' + TE + '">vacuola</b>. Son <b>células vegetales</b>.', 560, 220, 620, 220, { fontSize: 27, color: INK, lineHeight: 1.4 }),
        text('La pared rígida y la vacuola grande son señas de que es una planta, no un animal.', 560, 450, 620, 120, { fontSize: 23, color: GREY, lineHeight: 1.4 })],
        notes: 'Idea clave: la pared celular y la vacuola grande distinguen la célula vegetal de la animal. Comparar con una foto de células de la mejilla si hay tiempo.' },
      { title: 'Anota tus observaciones', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 190, w: 980, h: 300, stroke: '#cdd8d1',
          rows: [['Aumento', '¿Qué se ve?', '¿Núcleo?', 'Dibujo (sí/no)'], ['×4', '', '', ''], ['×10', '', '', ''], ['×40', '', '', '']] }),
        text('A más aumento, menos campo pero más detalle. Dibuja a ×40 una célula con sus partes.', 150, 520, 980, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla para rellenar con cada objetivo. El dibujo a ×40 es la entrega de la práctica.' },
      { layout: 'blank', bg: '#eaf3ee', extra: [quiz('¿Qué parte vemos SOLO en la célula vegetal (no en la animal)?', ['El núcleo', 'La pared celular', 'La membrana', 'El citoplasma'], 1)],
        notes: 'Repaso: la pared celular (y la vacuola grande) son propias de la célula vegetal.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, TE, PAPER, 16)], transition: 'zoom', extra: [
        text('Tu cuaderno de laboratorio', 84, 140, 900, 90, { fontSize: 54, fontWeight: 800, color: INK, fontFamily: S }),
        text('Entrega: el dibujo de una célula a ×40 con sus partes etiquetadas y una frase explicando cómo sabes que es vegetal. Reto: ¿qué verías en una gota de agua de charca?', 84, 250, 760, 190, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(600, 900, 210, 300, { color: GR, endText: '¡A recoger!' })],
        notes: 'Diez minutos para dibujar y recoger. El reto de la gota de charca abre la siguiente práctica (seres vivos microscópicos).' },
    ]), INK));
  } },

  // 7 · Escape room de Geografía: la vuelta al mundo; cuatro pistas geográficas dan el código del baúl del explorador.
  edu_escape_geo: { name: 'Escape room: la vuelta al mundo', cat: 'edu', summary: 'Escape room de Geografía: pistas sobre océanos, husos horarios, hemisferios y las grandes montañas que dan el código del baúl del explorador, pistas que se revelan y cuenta atrás', make: () => {
    const BG = '#07131a', PANEL = '#102230', TE = '#39c0c8', AM = '#f2c14e', GR = '#5fd38a', RE = '#e07a5f', DIM = '#8aa0ad', CREAM = '#eaf4f7', M = FF.mono, S = FF.space;
    const retos = [['Reto 1 · Océanos', '¿Cuántos <b>océanos</b> tiene la Tierra (Pacífico, Atlántico, Índico, Antártico y Ártico)?', '5', 'son 5 océanos'],
      ['Reto 2 · Husos', 'La Tierra se divide en husos horarios, uno por cada hora del día. ¿Cuál es la <b>cifra de las unidades</b> de ese número?', '4', '24 husos → unidades 4'],
      ['Reto 3 · Hemisferios', 'El ecuador parte la Tierra en hemisferio norte y sur. ¿En cuántos hemisferios?', '2', 'norte + sur = 2'],
      ['Reto 4 · El techo del mundo', 'El Everest mide unos 8848 m. ¿Cuál es la <b>cifra de los millares</b>?', '8', '8848 → millares: 8']];
    return numbered(ink(build({ name: 'Escape room: la vuelta al mundo', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, TE, BG, 28), glow(-120, 560, 520, AM, BG, 20)], extra: [
        text('GEOGRAFÍA · ESCAPE ROOM', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: TE, fontWeight: 700, fontFamily: M }),
        text('La vuelta<br>al mundo', 84, 188, 700, 220, { fontSize: 80, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('El baúl del viejo explorador está cerrado. Resolved cuatro pistas geográficas para dar con el código y partir de viaje.', 90, 452, 640, 120, { fontSize: 27, color: DIM, lineHeight: 1.35 }),
        after(img(padlock(['?', '?', '?', '?'], false, TE), 820, 150, 360, 440, 'Un candado cerrado de cuatro cifras'), 'zoom-in', { duration: 900 })],
        notes: 'Arranque: estáis en el estudio de un explorador. Cada pista da una cifra del código del baúl.' },
      { title: 'Preparad el viaje', layout: 'titleOnly', bg: BG, extra: [
        ...[['Cuatro pistas', 'Cada una da una cifra del código.', TE], ['Por equipos', 'Un continente por equipo, si queréis.', AM], ['Con el mapa', 'Vale mirar el mapa de clase, no el móvil.', RE], ['El reloj corre', '20 minutos antes de zarpar.', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 210; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, x, y, 525, 180, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up', { sound: 'pop' })]; }).flat(),
        timer(1200, 1030, 150, 210, { color: TE, endText: '¡A zarpar!' })],
        notes: 'Un clic por norma; cuenta atrás de 20 minutos.' },
      ...retos.flatMap(([titulo, enunciado, cifra, pista], i) => [
        { title: titulo, layout: 'titleOnly', bg: BG, extra: [
          text(enunciado, 90, 190, 760, 250, { fontSize: 33, color: CREAM, lineHeight: 1.4 }),
          on(img(padlock(['1', '2', '3', '4'].map((_, k) => k < i ? retos[k][2] : '?'), false, TE), 880, 150, 320, 390, 'El candado con ' + i + ' cifras'), 'fade-left'),
          after(card(`La cifra es <b style="color:${GR};font-size:46px">${cifra}</b><br><span style="font-size:20px;color:${DIM}">${pista}</span>`, 90, 470, 760, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: GR, pad: [16, 22, 14, 22] }), 'zoom-in', { sound: 'pop' })],
          notes: `Pista ${i + 1}. Dejad que la razonen; con un clic sale la cifra (${cifra}).` }]),
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál es el código del baúl, en el orden de las pistas?', ['5 · 4 · 2 · 8', '4 · 5 · 8 · 2', '5 · 2 · 4 · 8', '8 · 2 · 4 · 5'], 0)],
        notes: 'El código es 5-4-2-8.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GR, BG, 36)], transition: 'zoom', extra: [
        after(img(padlock(['5', '4', '2', '8'], true, GR), 460, 110, 360, 440, 'El candado abierto'), 'zoom-in', { duration: 900, sound: 'chime' }),
        text('¡El baúl se abre!', 90, 560, 1100, 100, { fontSize: 64, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: S })],
        notes: 'Cierre: repasad océanos, husos horarios, hemisferios y las grandes cordilleras.' },
    ]), CREAM));
  } },

  // 8 · Escape room de Inglés: the locked classroom; cuatro pistas en inglés dan el código de la puerta.
  edu_escape_english: { name: 'Escape room: the locked classroom', cat: 'edu', summary: 'Escape room de Inglés: cuatro pistas en inglés sobre vocabulario, deletreo, números y verbos irregulares que dan el código de la puerta, pistas que se revelan y cuenta atrás', make: () => {
    const BG = '#0b1016', PANEL = '#161f2b', BL = '#5aa7f0', AM = '#f2c14e', GR = '#5fd38a', RE = '#ef6b6b', DIM = '#8a97ad', CREAM = '#eef3fa', M = FF.mono, S = FF.space;
    const retos = [['Clue 1 · The week', 'How many days are there in a <b>week</b>?', '7', 'seven days'],
      ['Clue 2 · Spelling', 'How many letters are there in the word <b>FRIEND</b>?', '6', 'F-R-I-E-N-D = 6'],
      ['Clue 3 · Animals', 'How many legs does a <b>spider</b> have?', '8', 'eight legs'],
      ['Clue 4 · Irregular verbs', 'The past tense of <b>GO</b> is «went». How many letters does «went» have?', '4', 'w-e-n-t = 4']];
    return numbered(ink(build({ name: 'Escape room: the locked classroom', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, BL, BG, 28), glow(-120, 560, 520, AM, BG, 18)], extra: [
        text('ENGLISH · ESCAPE ROOM', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: BL, fontWeight: 700, fontFamily: M }),
        text('The locked<br>classroom', 84, 188, 720, 220, { fontSize: 76, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('The door is locked! Solve four clues in English to find the code and get out before the bell rings.', 90, 452, 640, 120, { fontSize: 27, color: DIM, lineHeight: 1.35 }),
        after(img(padlock(['?', '?', '?', '?'], false, BL), 820, 150, 360, 440, 'A locked padlock'), 'zoom-in', { duration: 900 })],
        notes: 'Escape en inglés. Léelo en inglés con la clase; anima a responder en inglés. Cada pista da una cifra del código.' },
      { title: 'The rules', layout: 'titleOnly', bg: BG, extra: [
        ...[['Four clues', 'Each clue gives one digit of the code.', BL], ['In teams', 'Share the clues and help each other.', AM], ['English only', 'Try to think and answer in English.', RE], ['The clock is ticking', '20 minutes!', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 210; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, x, y, 525, 180, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up', { sound: 'pop' })]; }).flat(),
        timer(1200, 1030, 150, 210, { color: BL, endText: "Time's up!" })],
        notes: 'Un clic por norma; cuenta atrás de 20 minutos.' },
      ...retos.flatMap(([titulo, enunciado, cifra, pista], i) => [
        { title: titulo, layout: 'titleOnly', bg: BG, extra: [
          text(enunciado, 90, 190, 760, 250, { fontSize: 34, color: CREAM, lineHeight: 1.4 }),
          on(img(padlock(['1', '2', '3', '4'].map((_, k) => k < i ? retos[k][2] : '?'), false, BL), 880, 150, 320, 390, 'The padlock with ' + i + ' digits'), 'fade-left'),
          after(card(`The digit is <b style="color:${GR};font-size:46px">${cifra}</b><br><span style="font-size:20px;color:${DIM}">${pista}</span>`, 90, 470, 760, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: GR, pad: [16, 22, 14, 22] }), 'zoom-in', { sound: 'pop' })],
          notes: `Clue ${i + 1}. Let them answer in English; one click reveals the digit (${cifra}).` }]),
      { layout: 'blank', bg: BG, extra: [quiz('What is the code, in the order of the clues?', ['7 · 6 · 8 · 4', '6 · 7 · 4 · 8', '7 · 8 · 6 · 4', '4 · 8 · 6 · 7'], 0)],
        notes: 'The code is 7-6-8-4.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GR, BG, 36)], transition: 'zoom', extra: [
        after(img(padlock(['7', '6', '8', '4'], true, GR), 460, 110, 360, 440, 'The padlock, open'), 'zoom-in', { duration: 900, sound: 'chime' }),
        text('You escaped!', 90, 560, 1100, 100, { fontSize: 66, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: S })],
        notes: 'Cierre: repasad vocabulario (week, friend, spider) y el pasado de «go».' },
    ]), CREAM));
  } },

  // 9 · Laboratorio de Tecnología: circuitos. Serie y paralelo, montaje, medidas y conclusión.
  edu_lab_tech: { name: 'Laboratorio: circuitos eléctricos', cat: 'edu', summary: 'Laboratorio de Tecnología: montar un circuito con pila y bombillas, comparar serie y paralelo, hipótesis y votación, procedimiento, tabla de observaciones, gráfico de brillo y conclusión', make: () => {
    const PAPER = '#f4f6fa', INK = '#182130', OR = '#e8823b', GR = '#2e9e6b', BL = '#2f6df0', RE = '#d84b3f', GREY = '#5f6b80', M = FF.mono, S = FF.space;
    const bulb = (cx, lit) => `<circle cx="${cx}" cy="46" r="26" fill="${lit ? '#ffe17a' : '#d7deea'}" stroke="#8a97ad" stroke-width="4"/>`
      + (lit ? [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return `<line x1="${(cx + 32 * Math.cos(r)).toFixed(0)}" y1="${(46 + 32 * Math.sin(r)).toFixed(0)}" x2="${(cx + 44 * Math.cos(r)).toFixed(0)}" y2="${(46 + 44 * Math.sin(r)).toFixed(0)}" stroke="#e8a900" stroke-width="3"/>`; }).join('') : '');
    const ckt = (lit, n = 1) => { const xs = n === 1 ? [220] : [150, 290]; return svgURL(440, 280,
      `<rect x="40" y="46" width="360" height="184" rx="10" fill="none" stroke="#6b7a90" stroke-width="6"/>`
      + `<rect x="170" y="206" width="100" height="44" rx="6" fill="#263040" stroke="#6b7a90" stroke-width="3"/><text x="196" y="236" font-family="monospace" font-size="26" fill="#ef6b6b" text-anchor="middle">+</text><text x="244" y="236" font-family="monospace" font-size="26" fill="#6aa7f0" text-anchor="middle">–</text>`
      + xs.map(x => bulb(x, lit)).join('')); };
    return numbered(ink(build({ name: 'Laboratorio: circuitos eléctricos', palette: 'ocean', fonts: 'tech', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, OR, PAPER, 14), glow(-120, 560, 520, BL, PAPER, 14)], extra: [
        text('TECNOLOGÍA · PRÁCTICA DE LABORATORIO', 90, 150, 760, 36, { fontSize: 22, letterSpacing: 3, color: '#b45f1b', fontWeight: 700, fontFamily: M }),
        text('Circuitos eléctricos', 84, 198, 820, 130, { fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Montamos un circuito de verdad y comparamos dos formas de conectar bombillas: en serie y en paralelo.', 90, 342, 720, 150, { fontSize: 28, color: GREY }),
        after(img(ckt(true, 1), 860, 190, 340, 260, 'Un circuito con la bombilla encendida'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: una pila, cables y bombillas. Hoy vemos qué cambia entre conectar en serie o en paralelo.' },
      { title: 'Primero, seguridad', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Solo pilas', 'Nunca el enchufe de la pared.', RE], ['Sin cortocircuitos', 'No unas los dos polos de la pila con un cable solo: se calienta.', OR], ['Monta con la pila fuera', 'Conecta la pila al final, cuando el circuito esté hecho.', BL], ['Con cuidado', 'Las bombillas encendidas un rato calientan.', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:27px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'Seguridad primero: solo pilas, nada de red; evitar cortocircuitos.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Dos bombillas iguales con una pila. ¿Cuándo brillan MÁS?', options: ['Una sola bombilla', 'Dos en serie (una tras otra)', 'Dos en paralelo (cada una a la pila)', 'Brillan igual en todos los casos'] })],
        notes: 'Hipótesis en directo antes de montar. En serie brillan menos; en paralelo, como una sola. No adelantar.' },
      { title: 'Material', layout: 'twoContent', bg: PAPER, extra: [
        img(ckt(false, 2), 110, 190, 360, 270, 'Un circuito con dos bombillas'),
        text(ul('Una pila (4,5 V) o portapilas', 'Dos o tres bombillas con portalámparas', 'Cables con pinzas', 'Un interruptor', 'Opcional: un polímetro'), 600, 210, 580, 400, { fontSize: 27, color: INK, lineHeight: 1.5 })],
        notes: 'Material barato de aula-taller. El interruptor da el toque de circuito real.' },
      { title: 'El procedimiento', layout: 'titleOnly', bg: PAPER, extra: [
        dg('steps', 'Monta el circuito con UNA bombilla y observa su brillo\nAñade otra bombilla EN SERIE (una tras otra)\nVuelve a montarlas EN PARALELO (cada una a la pila)\nEn cada caso, mira cómo brillan y anótalo\nDesenrosca una bombilla y mira qué pasa con la otra', 110, 195, 1060, 330, { color: INK }),
        text('Usa siempre la misma pila y bombillas iguales para comparar bien.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tres montajes: una, dos en serie, dos en paralelo. El último paso (desenroscar) es el que más sorprende.' },
      { title: 'Anota lo que ves', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 130, y: 190, w: 1020, h: 300, stroke: '#cdd6ea',
          rows: [['Montaje', '¿Brillan?', 'Brillo (poco/normal/mucho)', 'Si quito una…'], ['Una bombilla', '', '', '—'], ['Dos en serie', '', '', ''], ['Dos en paralelo', '', '', '']] }),
        text('Fíjate en el brillo y en qué pasa con la otra bombilla al quitar una.', 130, 520, 1020, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla para rellenar. Comparar el brillo entre montajes es la clave.' },
      { title: 'Lo que suele salir', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 420, chartType: 'bar', color: BL, yTitle: 'Brillo relativo',
          data: [{ label: 'Una', value: 10, color: GR }, { label: 'Serie (cada una)', value: 5, color: RE }, { label: 'Paralelo (cada una)', value: 10, color: BL }] }),
        text('En serie, la corriente se reparte y brillan menos; en paralelo, cada una brilla como si estuviera sola.', 110, 610, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Gráfico orientativo de brillo. Comparar con la votación de hipótesis.' },
      { layout: 'blank', bg: '#eaf0fa', extra: [quiz('En un circuito EN SERIE, desenroscas una bombilla. ¿Qué le pasa a la otra?', ['Brilla más', 'Sigue igual', 'Se apaga', 'Parpadea'], 2)],
        notes: 'Clave: en serie, si se corta una, se corta todo (como las luces viejas de Navidad). En paralelo, la otra sigue.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, OR, PAPER, 14)], transition: 'zoom', extra: [
        text('Conclusión y reto', 84, 140, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('En SERIE las bombillas comparten la corriente y brillan menos; si una falla, se apagan todas. En PARALELO cada una va a su aire. Reto: ¿cómo están conectadas las luces de tu casa, en serie o en paralelo? ¿Por qué?', 84, 250, 820, 200, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        timer(480, 920, 210, 300, { color: OR, endText: '¡A recoger!' })],
        notes: 'Cierre con la idea grande y la conexión con casa (paralelo, para que cada lámpara sea independiente).' },
    ]), INK));
  } },

  // 10 · Laboratorio del método científico: pregunta → hipótesis → experimento → datos → conclusión, con el azúcar.
  edu_lab_scientific: { name: 'Laboratorio: el método científico', cat: 'edu', summary: 'Laboratorio del método científico aplicado a un experimento sencillo (¿el agua caliente disuelve antes el azúcar?): pregunta, hipótesis y votación, variables, procedimiento, tabla de tiempos, gráfico y conclusión', make: () => {
    const PAPER = '#f5f4f8', INK = '#1e1b2e', PUR = '#6d4fb0', TE = '#1f8f8f', ORA = '#e0873b', GR = '#2e9e6b', GREY = '#6a6480', M = FF.mono, S = FF.space;
    const glass = (t) => svgURL(260, 320, `<path d="M60 40 H200 L184 280 A10 10 0 0 1 174 290 H86 A10 10 0 0 1 76 280 Z" fill="#eaf1f7" stroke="#9fb0c4" stroke-width="4"/>`
      + `<path d="M70 150 H190 L178 278 A8 8 0 0 1 170 285 H90 A8 8 0 0 1 82 278 Z" fill="${t === 'hot' ? '#f6c6b0' : t === 'warm' ? '#cfe3d6' : '#cfe0f2'}" opacity="0.85"/>`
      + Array.from({ length: 7 }, (_, i) => `<circle cx="${96 + (i % 4) * 26}" cy="${210 + (i % 3) * 22}" r="5" fill="#ffffff" opacity="0.8"/>`).join('')
      + `<rect x="150" y="20" width="12" height="170" rx="6" fill="#c9d3df"/><rect x="150" y="${t === 'hot' ? 70 : t === 'warm' ? 110 : 150}" width="12" height="${t === 'hot' ? 120 : t === 'warm' ? 80 : 40}" rx="6" fill="#d84b3f"/><circle cx="156" cy="196" r="14" fill="#d84b3f"/>`);
    return numbered(ink(build({ name: 'Laboratorio: el método científico', palette: 'violet', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, PUR, PAPER, 14), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('CIENCIA · CÓMO SE INVESTIGA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: PUR, fontWeight: 700 }),
        text('El método<br>científico', 84, 192, 760, 200, { fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Aprendemos los pasos de la ciencia resolviendo una duda de verdad: ¿el agua caliente disuelve antes el azúcar?', 90, 438, 700, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(glass('hot'), 920, 170, 260, 320, 'Un vaso con agua caliente y azúcar disolviéndose'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: la ciencia no es magia, es un método. Lo aplicamos a una pregunta sencilla de cocina.' },
      { title: 'Los pasos', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cycle', 'Pregunta\nHipótesis\nExperimento\nDatos\nAnálisis\nConclusión', 150, 185, 980, 420, { color: INK }),
        text('Un círculo: la conclusión casi siempre abre nuevas preguntas.', 150, 620, 980, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Los seis pasos en círculo. Insistir en que es un ciclo, no una línea recta.' },
      { title: '1 · La pregunta y la hipótesis', layout: 'titleOnly', bg: PAPER, extra: [
        text('<b>Pregunta:</b> ¿en qué agua se disuelve antes una cucharada de azúcar?', 90, 180, 1100, 70, { fontSize: 28, color: INK }),
        pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 265, w: 1140, h: 360,
          question: 'Tu hipótesis: ¿dónde se disolverá ANTES?', options: ['En agua fría', 'En agua templada', 'En agua caliente', 'Tardará lo mismo en todas'] })],
        notes: 'La hipótesis es una respuesta razonada ANTES de medir. Que voten; se comprueba al final.' },
      { title: '2 · Las variables', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Lo que cambiamos', 'La temperatura del agua (fría, templada, caliente).', ORA, 'variable independiente'], ['Lo que medimos', 'El tiempo que tarda en disolverse.', TE, 'variable dependiente'], ['Lo que mantenemos igual', 'Misma azúcar, misma cantidad de agua, mismo removido.', GR, 'variables controladas']].map(([t, d, col, tag], i) => { const x = 90 + i * 380; return [
          on(card(`<b style="font-size:24px;color:${col}">${t}</b><br><span style="font-size:20px;color:${INK}">${d}</span><br><span style="font-size:17px;color:${GREY}">(${tag})</span>`, x, 205, 360, 285, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat()],
        notes: 'La idea más potente de la práctica: un experimento justo cambia UNA sola cosa y mantiene el resto igual.' },
      { title: '3 · El experimento', layout: 'titleOnly', bg: PAPER, extra: [
        dg('steps', 'Prepara 3 vasos con la misma agua: fría, templada y caliente\nMide la misma cantidad de azúcar para cada uno\nEcha el azúcar a la vez y remueve igual en los tres\nCronometra hasta que el azúcar desaparezca\nApunta el tiempo de cada vaso', 110, 195, 1060, 330, { color: INK }),
        text('¡Ojo con la seguridad! El agua caliente, del grifo, no hirviendo.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Procedimiento. Insistir en «a la vez» e «igual»: eso hace justa la comparación.' },
      { title: '4 · Los datos', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 180, y: 195, w: 920, h: 260, stroke: '#d3cde6',
          rows: [['Agua', 'Temperatura aprox.', 'Tiempo en disolverse (s)'], ['Fría', '10 °C', ''], ['Templada', '25 °C', ''], ['Caliente', '45 °C', '']] }),
        text('Rellena con vuestros tiempos. Si podéis, repetid cada vaso y haced la media.', 180, 485, 920, 60, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla de datos. Repetir y promediar es buena ciencia.' },
      { title: '5 · El análisis', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 420, chartType: 'bar', color: PUR, yTitle: 'Tiempo (s)',
          data: [{ label: 'Fría', value: 95, color: '#5aa7f0' }, { label: 'Templada', value: 55, color: TE }, { label: 'Caliente', value: 25, color: ORA }] }),
        text('A más temperatura, menos tiempo: el azúcar se disuelve antes en caliente.', 110, 610, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Gráfico orientativo. Comparar con la hipótesis de la votación: ¿acertasteis?' },
      { layout: 'blank', bg: '#efeaf7', extra: [quiz('En este experimento, ¿cuál es la variable que NOSOTROS cambiamos?', ['El tiempo de disolución', 'La temperatura del agua', 'La cantidad de azúcar', 'La forma de remover'], 1)],
        notes: 'La temperatura es la variable independiente (la que cambiamos); el tiempo es la dependiente (la que medimos).' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 14)], transition: 'zoom', extra: [
        text('6 · Conclusión', 84, 140, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('El azúcar se disuelve antes cuanto más caliente está el agua. Hemos seguido el método: pregunta, hipótesis, experimento justo, datos y conclusión. Reto: ¿y si en vez de la temperatura cambias el removido? Diséñalo.', 84, 250, 820, 200, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        timer(420, 920, 210, 300, { color: PUR, endText: '¡Nueva pregunta!' })],
        notes: 'Cierre: la conclusión responde la pregunta y abre otra (el removido, la cantidad de agua…). El método vuelve a empezar.' },
    ]), INK));
  } },

};
