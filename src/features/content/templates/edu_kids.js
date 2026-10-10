// Example presentations: Educación infantil (3 a 6 años). Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Very visual: few words, big letters, drawings of our own and simple activities
// to do all together with the teacher. Every deck has its own look: a painting table, a toy train, one face that
// changes, a farm, a tree through the year, wooden blocks, a cardboard face, a road playmat, the sea bed and a
// night sky.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// The same object on two slides (Transform): a fixed id.
const keep = (b, id) => ({ ...b, id });
// One animation: on a click, after the previous one, or with it.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A shape of our own (a path in a 0–100 box stretched to the object).
const blob = (x, y, w, h, fill, props = {}) => shape('custom', x, y, w, h, fill, {
  path: 'M50 4C68 2 86 12 92 30C99 48 94 66 84 79C72 94 50 99 31 92C13 86 3 69 5 50C7 30 22 6 50 4Z', ...props });
// Fonts of our own (Google fonts loaded on demand, as in the editor's list).
const FF = { pacifico: "'Pacifico', cursive", nunito: "'Nunito', sans-serif", rubik: "'Rubik', sans-serif", quick: "'Quicksand', sans-serif",
  lobster: "'Lobster', cursive", caveat: "'Caveat', cursive", josefin: "'Josefin Sans', sans-serif", poppins: "'Poppins', sans-serif",
  bebas: "'Bebas Neue', sans-serif", raleway: "'Raleway', sans-serif", space: "'Space Grotesk', sans-serif", ubuntu: "'Ubuntu', sans-serif" };
// Big, centred words: the way we write for children who are learning to read.
const say = (html, x, y, w, h, size, color, font, props = {}) => text(html, x, y, w, h, { fontFamily: font, fontSize: size, color, textAlign: 'center', vAlign: 'middle', lineHeight: 1.1, ...props });
// The credit line of the CC BY models used in a deck (small, on its last slide).
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });
// A 3D model without its caption (its credit goes on a small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
// A whole-slide activity.
const activity = (props) => pollBlock({ fontSize: 44, x: 70, y: 50, w: 1140, h: 620, ...props });

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · Colours on a painting table: watercolour paper, paint splashes, a rainbow that paints itself,
  // pots of paint, two blobs that mix with Transform, coloured things and a colour hunt.
  edu_kids_colors: { name: 'Los colores', cat: 'edu', summary: 'Mesa de pintar: arcoíris que se dibuja solo, botes con sonido, mezclas con Transformar, iconos, unir parejas, votación y cuenta atrás', make: () => {
    const BG = '#fffaf0', INK = '#3a2e5c', R = '#e8413c', Y = '#ffc61a', B = '#2f7de1', O = '#ff8a1f', G = '#3cb64a', V = '#8e4fc9', H = FF.pacifico, Bd = FF.nunito;
    const rainbow = [R, O, Y, G, B, V], YT = '#a87400', GT = '#1f8a3a', OT = '#c95f00';
    const splats = () => [blob(-90, -80, 300, 260, R, { opacity: 18, rotation: 20 }), blob(1080, -60, 280, 240, B, { opacity: 16 }),
      blob(-60, 560, 260, 230, Y, { opacity: 22, rotation: -30 }), blob(1110, 580, 240, 200, G, { opacity: 18 }),
      ...[[230, 40, 26, R], [1040, 200, 18, B], [190, 640, 20, Y], [1050, 560, 16, G]].map(([x, y, d, c]) => shape('ellipse', x, y, d, d, c, { opacity: 30 }))];
    // A pot of paint: the pot, the paint on top and a drip.
    const pot = (x, y, c) => [shape('cylinder', x, y, 220, 230, '#ffffff', { stroke: INK, strokeWidth: 4 }), shape('ellipse', x + 4, y + 8, 212, 48, c),
      shape('teardrop', x + 150, y + 40, 34, 60, c, { rotation: 180 })];
    const word = c => `<span style="color:${c}">`;
    const mixA = uid(), mixB = uid();
    return numbered(build({ name: 'Los colores', palette: 'paper', fonts: 'editorial', title: { font: H, size: 60, color: INK, bold: false }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: splats(), transition: 'zoom', extra: [
        say(['¡', 'L', 'o', 's', ' ', 'c', 'o', 'l', 'o', 'r', 'e', 's', '!'].map((ch, i) => ch === ' ' ? ' ' : `${word([R, O, Y, G, B, V][i % 6])}${ch}</span>`).join(''), 70, 140, 600, 200, 104, INK, H, { textAlign: 'left' }),
        say('Miramos, pintamos y mezclamos', 80, 360, 640, 70, 38, INK, Bd, { textAlign: 'left', fontWeight: 700 }),
        say('Educación infantil · 3 a 5 años', 80, 440, 520, 50, 26, '#7a6f8f', Bd, { textAlign: 'left' }),
        ...rainbow.map((c, i) => after(shape('arc', 690 + i * 36, 170 + i * 36, 520 - i * 72, 520 - i * 72, 'none', { stroke: c, strokeWidth: 30 }), 'draw', { duration: 700, ...(i === 5 && { sound: 'chime' }) })),
        shape('cloud', 640, 380, 180, 110, '#ffffff', { stroke: '#c9d6ea', strokeWidth: 4 }), shape('cloud', 1090, 380, 170, 104, '#ffffff', { stroke: '#c9d6ea', strokeWidth: 4 })],
        notes: 'Al llegar, el arcoíris se pinta solo, color a color, y suena una campanilla. Preguntamos: ¿cuántos colores tiene? ¿Cuál os gusta más?' },
      { title: 'Tres botes mágicos', layout: 'titleOnly', bg: BG, back: splats(), extra: [
        ...[[R, 'ROJO'], [Y, 'AMARILLO'], [B, 'AZUL']].flatMap(([c, n], i) => {
          const x = 140 + i * 370, [p, top, drip] = pot(x, 230, c);
          return [on(p, 'bounce', { sound: 'pop' }), along(top, 'bounce'), along(drip, 'fade-down', { delay: 400 }),
            along(say(n, x - 60, 500, 340, 80, 54, c === Y ? YT : c, Bd, { fontWeight: 900 }), 'zoom-in', { delay: 300 })]; }),
        say('Con estos tres podemos hacer muchos más', 140, 610, 1000, 60, 32, '#7a6f8f', Bd)],
        notes: 'Un clic por bote: salta, suena un «pop» y aparece el nombre. Son los colores primarios: con ellos se pueden fabricar casi todos los demás.' },
      { layout: 'blank', bg: BG, back: splats(), extra: [
        say('¡Vamos a mezclar!', 140, 60, 1000, 110, 76, INK, H),
        keep(blob(170, 250, 300, 280, R), mixA), keep(blob(810, 250, 300, 280, Y), mixB),
        say('+', 540, 300, 200, 180, 150, INK, Bd, { fontWeight: 900 }),
        say('rojo', 170, 545, 300, 70, 46, R, Bd, { fontWeight: 800 }), say('amarillo', 810, 545, 300, 70, 46, YT, Bd, { fontWeight: 800 }),
        on(say('¿Qué color saldrá?', 340, 630, 600, 60, 38, V, Bd, { fontWeight: 800 }), 'fade-up')],
        notes: 'Antes de pasar, que adivinen: ¿qué color saldrá si juntamos el rojo y el amarillo? En la siguiente diapositiva las dos manchas se juntan solas (Transformar).' },
      { layout: 'blank', bg: BG, back: splats(), autoAnimate: true, transition: 'fade', extra: [
        say('¡Vamos a mezclar!', 140, 60, 1000, 110, 76, INK, H),
        keep(blob(330, 220, 300, 280, R, { opacity: 85 }), mixA), keep(blob(650, 220, 300, 280, Y, { opacity: 85 }), mixB),
        after(blob(470, 250, 340, 300, O), 'zoom-in', { duration: 900, delay: 300, sound: 'chime' }),
        after(say('¡NARANJA!', 240, 560, 800, 120, 96, OT, Bd, { fontWeight: 900 }), 'bounce')],
        notes: 'Transformar: las dos manchas se deslizan hasta juntarse y del centro sale el naranja, con campanilla. Si tenéis témperas, hacedlo de verdad en un plato.' },
      { title: 'Más mezclas', layout: 'titleOnly', bg: BG, back: splats(), extra: [
        ...[[B, Y, G, 'verde'], [R, B, V, 'morado'], [R, '#ffffff', '#f6a5b5', 'rosa']].flatMap(([a, b, c, n], i) => {
          const y = 175 + i * 172;
          return [on(blob(180, y, 150, 140, a, { stroke: '#e3dccb', strokeWidth: 3 }), 'zoom-in', { sound: 'pop' }),
            along(say('+', 340, y, 100, 140, 90, INK, Bd, { fontWeight: 900 }), 'fade-in'), along(blob(450, y, 150, 140, b, { stroke: '#e3dccb', strokeWidth: 3 }), 'zoom-in'),
            along(say('=', 610, y, 100, 140, 90, INK, Bd, { fontWeight: 900 }), 'fade-in'), after(blob(720, y - 6, 170, 154, c), 'grow'),
            along(say(n, 900, y, 260, 140, 60, c === '#f6a5b5' ? '#d0466a' : c === G ? GT : c, Bd, { fontWeight: 900, textAlign: 'left' }), 'fade-left')]; })],
        notes: 'Una fila por clic. Azul y amarillo hacen verde; rojo y azul, morado; y si al rojo le añadimos blanco sale rosa. Buen momento para mancharse las manos.' },
      { title: '¿De qué color es?', layout: 'titleOnly', bg: BG, back: splats(), extra: [
        ...[['apple', R, 'rojo', R], ['sun', '#f2b400', 'amarillo', YT], ['leaf', G, 'verde', GT], ['droplet', B, 'azul', B], ['carrot', O, 'naranja', OT]].flatMap(([ic, c, n, tc], i) => [
          shape('ellipse', 70 + i * 232, 220, 210, 210, '#ffffff', { stroke: c, strokeWidth: 6 }), icon(ic, 115 + i * 232, 265, 120, c),
          on(say(n, 60 + i * 232, 470, 230, 70, 44, tc, Bd, { fontWeight: 900 }), 'fade-up', { sound: 'pop' })]),
        say('Primero lo decimos en voz alta… ¡y luego lo comprobamos!', 140, 580, 1000, 60, 30, '#7a6f8f', Bd)],
        notes: 'Señalamos cada dibujo y la clase dice el color en voz alta. Con cada clic aparece la palabra y suena un «pop».' },
      { layout: 'blank', bg: BG, extra: [activity({ kind: 'match', question: 'Une cada cosa con su color', options: ['Fresa = Rojo', 'Plátano = Amarillo', 'Rana = Verde', 'Cielo = Azul', 'Zanahoria = Naranja'] })],
        notes: 'Actividad «Unir parejas». En infantil la hacemos todos juntos en la pizarra digital: un niño o una niña elige y la clase decide si es correcto.' },
      { layout: 'blank', bg: BG, extra: [activity({ kind: 'choice', display: 'pie', question: '¿Cuál es tu color favorito?', options: ['Rojo', 'Amarillo', 'Azul', 'Verde', 'Morado'] })],
        notes: 'Votación con resultado en tarta. Puede votar cada familia desde casa, o la maestra va pulsando mientras la clase levanta la mano.' },
      { layout: 'blank', bg: BG, back: splats(), transition: 'zoom', extra: [
        say('Juego: ¡a la caza del color!', 90, 90, 640, 200, 66, INK, H, { textAlign: 'left' }),
        say(`Busca en clase algo ${word(R)}rojo</span>, algo ${word(B)}azul</span> y algo ${word(YT)}amarillo</span>.`, 90, 310, 620, 200, 44, INK, Bd, { textAlign: 'left', fontWeight: 700 }),
        timer(60, 800, 160, 360, { color: V, endText: '¡Todos al corro!' }),
        say('Un minuto', 800, 540, 360, 60, 36, V, Bd, { fontWeight: 800 })],
        notes: 'Cuenta atrás de un minuto (empieza sola). Al terminar volvemos al corro y cada uno enseña lo que ha encontrado.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · Numbers on a toy train: a sky with clouds, a train of our own that comes in whistling, counting
  // one by one, boxes with a hidden number, a sum with apples, a chart of fruit, put in order and a countdown.
  edu_kids_numbers: { name: 'El tren de los números', cat: 'edu', summary: 'Tren dibujado que entra con sonido, contar uno a uno, números ocultos, suma en ecuación, gráfico, ordenar, concurso y cuenta atrás', make: () => {
    const SKY = '#cdefff', GRASS = '#7ccf5b', INK = '#1d3a6e', R = '#ef4b4b', Y = '#ffcb2f', B = '#3a86ff', G = '#2fbf71', P = '#a05cf0', O = '#ff8c32', H = FF.rubik;
    const cols = [R, Y, B, G, P];
    // The train: a locomotive and one wagon per number, drawn (it moves as one picture).
    const train = n => { const W = 220 + n * 170;
      const wheel = (cx) => `<circle cx="${cx}" cy="178" r="22" fill="#2b2b3a"/><circle cx="${cx}" cy="178" r="8" fill="#c9c9d6"/>`;
      const loco = `<rect x="10" y="80" width="190" height="88" rx="12" fill="${R}"/><rect x="110" y="24" width="90" height="70" rx="8" fill="#c23434"/>`
        + `<rect x="128" y="38" width="54" height="36" rx="6" fill="#e9f7ff"/><rect x="34" y="40" width="34" height="44" fill="#2b2b3a"/>`
        + `<circle cx="40" cy="22" r="16" fill="#ffffff" opacity=".9"/><circle cx="64" cy="10" r="11" fill="#ffffff" opacity=".7"/>`
        + `<rect x="0" y="150" width="210" height="10" fill="#7a2020"/>` + wheel(52) + wheel(150);
      const wagons = Array.from({ length: n }, (_, i) => { const x = 220 + i * 170, c = cols[i % 5];
        return `<rect x="${x - 14}" y="146" width="16" height="8" fill="#2b2b3a"/><rect x="${x}" y="70" width="156" height="98" rx="12" fill="${c}"/>`
          + `<rect x="${x + 10}" y="80" width="136" height="78" rx="8" fill="#ffffff" opacity=".9"/>`
          + `<text x="${x + 78}" y="146" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="66" text-anchor="middle" fill="${c === Y ? '#c79400' : c}">${i + 1}</text>`
          + wheel(x + 38) + wheel(x + 118); }).join('');
      return svgURL(W, 204, loco + wagons); };
    const sky = () => [shape('cloud', 90, 40, 190, 110, '#ffffff'), shape('cloud', 880, 70, 230, 130, '#ffffff'), shape('cloud', 560, 20, 140, 80, '#ffffff', { opacity: 80 })];
    const rails = y => [shape('rect', 0, y, 1280, 720 - y, GRASS), shape('rect', 0, y + 8, 1280, 10, '#8a5a3c'),
      ...Array.from({ length: 22 }, (_, i) => shape('rect', 10 + i * 60, y - 4, 22, 26, '#8a5a3c')), shape('rect', 0, y - 2, 1280, 6, '#6b6b7a')];
    return numbered(build({ name: 'El tren de los números', palette: 'office', fonts: 'modern', title: { font: H, size: 58, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: SKY, back: [...sky(), ...rails(612)], extra: [
        say('El tren de los números', 80, 150, 1120, 130, 92, INK, H, { fontWeight: 800 }),
        say('¡Sube! Contamos del 1 al 5', 240, 290, 800, 70, 44, R, H, { fontWeight: 700 }),
        withAnims(img(train(5), 520, 470, 728, 139, 'Un tren con locomotora y cinco vagones numerados del 1 al 5'),
          path([[-160, 0], [-320, 0], [-470, 0]], { start: 'afterPrev', duration: 2600, sound: 'whoosh' }))],
        notes: 'Al llegar, el tren entra en la estación con un silbido (trayectoria animada). Leemos juntos los números de los vagones, despacio, señalando cada uno.' },
      { title: '¡Contamos manzanas!', layout: 'titleOnly', bg: SKY, back: rails(640), extra: [
        ...[1, 2, 3, 4, 5].flatMap(i => [on(icon('apple', 80 + (i - 1) * 232, 230, 170, [R, G, R, Y, R][i - 1]), 'bounce', { sound: 'pop' }),
          along(say(String(i), 80 + (i - 1) * 232, 420, 170, 140, 120, INK, H, { fontWeight: 800 }), 'zoom-in', { delay: 200 })]),
        after(say('¡Cinco manzanas!', 340, 565, 600, 70, 46, R, H, { fontWeight: 800 }), 'fade-up', { sound: 'chime' })],
        notes: 'Un clic por manzana: salta, suena un «pop» y aparece su número. Contamos en voz alta tocando cada una con el dedo; al llegar a cinco suena la campanilla.' },
      { title: '¿Cuántos hay?', layout: 'titleOnly', bg: '#fff7e0', extra: [
        ...[['star', Y, 3, '#c79400'], ['fish', B, 2, B], ['flower', P, 4, P]].flatMap(([ic, c, n, tc], i) => {
          const x = 90 + i * 380, slots = [[0, 0], [1, 0], [0, 1], [1, 1]].slice(0, n);
          return [shape('rounded', x, 180, 340, 300, '#ffffff', { stroke: c, strokeWidth: 6 }),
            ...slots.map(([cx, cy]) => icon(ic, x + 50 + cx * 140 + (n === 3 && cy === 1 ? 70 : 0), 205 + cy * 130 + (n === 2 ? 65 : 0), 110, c)),
            shape('ellipse', x + 120, 505, 100, 100, tc), on(say(String(n), x + 120, 505, 100, 100, 70, '#ffffff', H, { fontWeight: 800 }), 'zoom-in', { sound: 'pop' })]; })],
        notes: 'Contamos cada caja todos juntos y, con un clic, aparece el número en el círculo para comprobarlo. Tres estrellas, dos peces y cuatro flores.' },
      { title: 'Juntamos manzanas', layout: 'titleOnly', bg: SKY, back: rails(650), extra: [
        shape('ellipse', 60, 220, 300, 230, '#ffffff', { opacity: 85 }), shape('ellipse', 470, 220, 360, 230, '#ffffff', { opacity: 85 }),
        icon('apple', 95, 270, 110, R), icon('apple', 215, 270, 110, R),
        icon('apple', 495, 270, 100, G), icon('apple', 600, 270, 100, G), icon('apple', 705, 270, 100, G),
        say('+', 360, 270, 110, 120, 100, INK, H, { fontWeight: 800 }),
        on(say('=', 840, 270, 90, 120, 100, INK, H, { fontWeight: 800 }), 'fade-in'),
        after(shape('ellipse', 950, 230, 220, 220, Y), 'zoom-in'), after(say('5', 950, 230, 220, 220, 150, INK, H, { fontWeight: 800 }), 'bounce', { sound: 'chime' }),
        on(mathBlock({ x: 340, y: 500, w: 600, h: 120, fontSize: 90, latex: '2 + 3 = 5', color: INK }), 'fade-up')],
        notes: 'Dos manzanas rojas y tres verdes: ¿cuántas hay en total? Primer clic, la respuesta con campanilla. Segundo clic, cómo se escribe con números (una ecuación).' },
      { title: '¿Qué fruta nos gusta más?', layout: 'titleOnly', bg: '#fff7e0', extra: [
        chartBlock({ x: 90, y: 170, w: 760, h: 490, chartType: 'bar', dataLabels: true, color: O, yMin: 0, yMax: 10, yTitle: 'manos levantadas',
          data: [{ label: 'Manzana', value: 7, color: R }, { label: 'Plátano', value: 9, color: Y }, { label: 'Uvas', value: 4, color: P }, { label: 'Pera', value: 3, color: G }] }),
        on(say('¡Gana el plátano!', 890, 250, 320, 150, 50, '#9a6e00', H, { fontWeight: 800 }), 'zoom-in', { sound: 'applause' }),
        say('Cada niño o niña elige una fruta y contamos las manos levantadas.', 890, 420, 320, 200, 28, INK, H)],
        notes: 'Gráfico de barras con los votos de la clase (datos de ejemplo: cambiadlos por los vuestros en Gráfico ▸ Datos). ¿Qué barra es la más alta? ¿Y la más baja?' },
      { layout: 'blank', bg: SKY, extra: [activity({ kind: 'order', question: 'Ordena los vagones del tren', options: ['1 · uno', '2 · dos', '3 · tres', '4 · cuatro', '5 · cinco'] })],
        notes: 'Actividad «Ordenar»: los vagones salen desordenados y hay que colocarlos del 1 al 5. La hacemos en la pizarra digital, por turnos.' },
      { layout: 'blank', bg: SKY, extra: [activity({ kind: 'quiz', question: '¿Cuántas patas tiene un perro?', options: ['2', '4', '6'], correct: [1], time: 30, fontSize: 56 })],
        notes: 'Concurso: tiempo de sobra (30 segundos). Antes de contestar, que lo comprueben a cuatro patas por la alfombra.' },
      { layout: 'blank', bg: INK, back: [shape('rect', 0, 600, 1280, 120, '#16305c'), ...Array.from({ length: 12 }, (_, i) => shape('star', 60 + i * 105, 40 + (i % 3) * 50, 24, 24, Y, { opacity: 70 }))], extra: [
        say('¡Cuenta atrás!', 90, 170, 620, 110, 72, Y, H, { fontWeight: 800, textAlign: 'left' }),
        say('Del 10 al 0 todos juntos… y el tren sale de la estación.', 90, 310, 580, 160, 42, '#ffffff', H, { textAlign: 'left' }),
        timer(10, 720, 130, 460, { style: 'digital', color: Y, endText: '¡Pi, piii!' })],
        notes: 'Cuenta atrás de 10 segundos en grande (estilo digital). La clase dice los números en voz alta y, al llegar a cero, imitamos el silbato del tren.' },
    ]));
  } },
  // ---------------------------------------------------------------------------------------
  // 3 · Emotions as one face that changes: the same drawn face glides from joy to sadness, anger, fear and
  // calm with Transform (its mouth turns, its brows tilt, its colour changes), a balloon to breathe with,
  // a vote on how we feel today and situations to match.
  edu_kids_emotions: { name: '¿Cómo me siento?', cat: 'edu', summary: 'Una cara dibujada que cambia de emoción con Transformar, guirnalda de caras, globo para respirar, votación y unir parejas', make: () => {
    const INK = '#3b2f63', H = FF.quick, S = 420, FX = 110, FY = 170;
    const ids = { face: uid(), cheekL: uid(), cheekR: uid(), eyeL: uid(), eyeR: uid(), browL: uid(), browR: uid(), mouth: uid() };
    // A face: a circle, cheeks, eyes, brows and a mouth (an arc: upside down, a smile).
    const face = (e, fx, fy, s, k = null) => { const id = n => (k ? { id: k[n] } : {}), r = v => Math.round(v * s);
      const eye = cx => shape('ellipse', fx + r(cx - e.ew / 2), fy + r(0.38 - e.eh / 2), r(e.ew), Math.max(4, r(e.eh)), INK);
      const brow = (cx, rot) => shape('rounded', fx + r(cx - 0.1), fy + r(e.by), r(0.2), Math.max(4, r(0.045)), INK, { rotation: rot });
      return [{ ...shape('ellipse', fx, fy, s, s, e.c, { stroke: e.d, strokeWidth: Math.max(3, r(0.015)) }), ...id('face') },
        { ...shape('ellipse', fx + r(0.12), fy + r(0.56), r(0.17), r(0.09), '#ff8fa3', { opacity: e.cheek ?? 55 }), ...id('cheekL') },
        { ...shape('ellipse', fx + r(0.71), fy + r(0.56), r(0.17), r(0.09), '#ff8fa3', { opacity: e.cheek ?? 55 }), ...id('cheekR') },
        { ...eye(0.34), ...id('eyeL') }, { ...eye(0.66), ...id('eyeR') }, { ...brow(0.34, e.br), ...id('browL') }, { ...brow(0.66, -e.br), ...id('browR') },
        { ...shape('arc', fx + r(0.5 - e.mw / 2), fy + r(e.mc - e.mh / 2), r(e.mw), r(e.mh), 'none', { stroke: INK, strokeWidth: Math.max(4, r(0.035)), rotation: e.smile ? 180 : 0 }), ...id('mouth') }]; };
    const E = {
      joy: { c: '#ffd23f', d: '#e5a800', bg: '#fff6cf', ew: 0.11, eh: 0.15, by: 0.19, br: -8, mw: 0.46, mh: 0.36, mc: 0.6, smile: true, name: 'Alegría', tc: '#b77f00', ic: 'sun',
        say: 'Me río, salto y doy abrazos', ask: '¿Qué te pone muy contento?' },
      sad: { c: '#8dbaf2', d: '#4f86cf', bg: '#dceaff', ew: 0.1, eh: 0.12, by: 0.22, br: -18, mw: 0.34, mh: 0.3, mc: 0.78, smile: false, name: 'Tristeza', tc: '#2f63a8', ic: 'cloud-rain',
        say: 'Lloro, quiero estar solo o que me abracen', ask: '¿Qué haces cuando estás triste?' },
      angry: { c: '#ff7d68', d: '#d94a35', bg: '#ffe0d9', ew: 0.11, eh: 0.1, by: 0.25, br: 22, mw: 0.3, mh: 0.14, mc: 0.76, smile: false, name: 'Enfado', tc: '#c0321e', ic: 'flame', cheek: 0,
        say: 'Aprieto los puños y se me pone la cara roja', ask: '¿Cómo se calma un enfado?' },
      fear: { c: '#bea6f5', d: '#8461d6', bg: '#ece3ff', ew: 0.14, eh: 0.2, by: 0.12, br: -12, mw: 0.2, mh: 0.26, mc: 0.8, smile: false, name: 'Miedo', tc: '#6a44c0', ic: 'moon', cheek: 0,
        say: 'Me tiembla el cuerpo y busco a alguien', ask: '¿Quién te ayuda cuando tienes miedo?' },
      calm: { c: '#8fdcae', d: '#47ab6f', bg: '#dcf6e6', ew: 0.13, eh: 0.025, by: 0.24, br: 0, mw: 0.3, mh: 0.2, mc: 0.6, smile: true, name: 'Calma', tc: '#257a47', ic: 'leaf',
        say: 'Respiro despacio y estoy a gusto', ask: '¿Dónde te sientes tranquilo?' } };
    const feel = (k, first, notes) => { const e = E[k];
      return { layout: 'blank', bg: e.bg, ...(first ? { transition: 'fade' } : { autoAnimate: true }), back: [glow(-200, -100, 900, '#ffffff', e.bg, 70)], extra: [
        ...face(e, FX, FY, S, ids),
        icon(e.ic, 1100, 70, 90, e.tc),
        say(e.name, 600, 140, 600, 150, 112, e.tc, H, { fontWeight: 700, textAlign: 'left' }),
        say(e.say, 600, 310, 560, 150, 44, INK, H, { fontWeight: 600, textAlign: 'left', vAlign: 'top' }),
        on(card(e.ask, 600, 500, 560, 120, '#ffffff', { fontFamily: H, fontSize: 34, color: e.tc, fontWeight: 700, vAlign: 'middle' }), 'fade-up', { sound: 'pop' })],
        notes }; };
    const order = ['joy', 'sad', 'angry', 'fear', 'calm'];
    return numbered(build({ name: '¿Cómo me siento?', palette: 'violet', fonts: 'clean', title: { font: H, size: 60, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: '#fdf7ff', back: [glow(240, 260, 800, '#f1e4ff', '#fdf7ff', 90)], transition: 'zoom', extra: [
        shape('arc', 40, 70, 1200, 260, 'none', { stroke: '#c9b6e8', strokeWidth: 5, rotation: 180 }),
        ...order.map((k, i) => { const x = 95 + i * 225, y = [150, 200, 222, 200, 150][i];
          return face(E[k], x, y, 190).map((b, j) => j ? along(b, 'bounce', { delay: i * 220 }) : after(b, 'bounce', { delay: i * 220, start: i ? 'withPrev' : 'afterPrev', ...(i === 4 && { sound: 'pop' }) })); }).flat(),
        say('¿Cómo me siento?', 140, 460, 1000, 130, 100, INK, H, { fontWeight: 700 }),
        say('Las emociones tienen nombre… ¡y cara!', 140, 590, 1000, 60, 38, '#7d6aa8', H, { fontWeight: 600 })],
        notes: 'Las cinco caras cuelgan de una guirnalda y entran rebotando al llegar. Preguntamos: ¿qué le pasa a cada una? ¿Cuál se parece a ti hoy?' },
      feel('joy', true, 'Una sola cara que irá cambiando. Imitamos la cara todos juntos delante del espejo de la clase y contamos qué nos pone alegres.'),
      feel('sad', false, 'Transformar: la boca se da la vuelta, las cejas se inclinan y la cara se vuelve azul. Estar triste está bien: lo importante es poder contarlo.'),
      feel('angry', false, 'La misma cara, ahora enfadada: cejas hacia abajo y boca apretada. Hablamos de qué podemos hacer: respirar, alejarnos un momento, pedir ayuda.'),
      feel('fear', false, 'Ojos muy abiertos y cejas arriba. Todos tenemos miedo alguna vez: a la oscuridad, a un ruido fuerte… ¿Quién nos ayuda?'),
      feel('calm', false, 'Ojos cerrados y una sonrisa pequeña: así es la calma. En la siguiente diapositiva la practicamos con el globo.'),
      { title: 'Respira como un globo', layout: 'titleOnly', bg: '#dcf6e6', extra: [
        shape('rect', 639, 520, 3, 150, '#47ab6f'),
        withAnims(shape('ellipse', 500, 190, 280, 330, '#ff7d9c', { stroke: '#e0577a', strokeWidth: 4 }), A('pulse', { duration: 6000 }), A('pulse', { start: 'afterPrev', duration: 6000 }), A('pulse', { start: 'afterPrev', duration: 6000 })),
        shape('triangle', 625, 514, 30, 22, '#e0577a', { rotation: 180 }), shape('ellipse', 560, 230, 60, 90, '#ffffff', { opacity: 45, rotation: 20 }),
        say('Cogemos aire por la nariz…<br>el globo se hincha', 70, 260, 400, 220, 38, '#257a47', H, { fontWeight: 700 }),
        say('…y lo soltamos despacito por la boca', 820, 260, 400, 220, 38, '#257a47', H, { fontWeight: 700 })],
        notes: 'Un clic: el globo se hincha y se deshincha despacio tres veces seguidas (seis segundos cada vez). Respiramos a su ritmo con una mano en la tripa.' },
      { layout: 'blank', bg: INK, extra: [activity({ kind: 'choice', display: 'bar', question: 'Y tú, ¿cómo te sientes hoy?', options: ['Alegre', 'Triste', 'Enfadado', 'Con miedo', 'Tranquilo'] })],
        notes: 'Votación de la asamblea de la mañana: cada niño o niña señala cómo se siente y la maestra va pulsando. Las barras crecen en directo.' },
      { layout: 'blank', bg: INK, extra: [activity({ kind: 'match', question: '¿Cómo se siente?', fontSize: 40,
        options: ['Me regalan un globo = Alegría', 'Se rompe mi juguete = Tristeza', 'Suena un trueno fuerte = Miedo', 'Me quitan el turno = Enfado'] })],
        notes: 'Unir parejas: la maestra lee cada situación y la clase decide la emoción. Puede haber más de una respuesta buena: hablarlo es lo importante.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · The farm: a red barn, hills and a wooden sign, animals of our own (cow, pig, hen and sheep), what
  // they give us drawn with lines, a table that adds itself up, the milk truck in 3D and a fox that sneaks in.
  edu_kids_farm: { name: 'Los animales de la granja', cat: 'edu', summary: 'Granja dibujada con animales propios, líneas que se trazan, tabla con suma, camión 3D en marcha, zorro 3D que camina, concurso y etiquetar', make: () => {
    const SKY = '#bfe6ff', GRASS = '#86c95a', DARK = '#5a9a35', WOOD = '#8a5a34', BARN = '#c8372d', INK = '#3a2a1c', H = FF.lobster, Bd = FF.nunito;
    // The animals, drawn (300 × 240).
    const legs = (xs, y, c, h = 50) => xs.map(x => `<rect x="${x}" y="${y}" width="16" height="${h}" rx="6" fill="${c}"/>`).join('');
    const cow = svgURL(300, 240, legs([70, 100, 190, 220], 160, '#ffffff') + legs([70, 100, 190, 220], 200, '#3a3a3a', 12)
      + `<ellipse cx="150" cy="130" rx="105" ry="62" fill="#ffffff" stroke="#3a3a3a" stroke-width="4"/><ellipse cx="120" cy="110" rx="30" ry="22" fill="#3a3a3a"/><ellipse cx="190" cy="150" rx="24" ry="18" fill="#3a3a3a"/>`
      + `<path d="M255 120 q30 10 22 50" stroke="#3a3a3a" stroke-width="5" fill="none"/><ellipse cx="62" cy="88" rx="42" ry="46" fill="#ffffff" stroke="#3a3a3a" stroke-width="4"/>`
      + `<path d="M40 48 q-8 -20 6 -26 M84 48 q8 -20 -6 -26" stroke="#d9b36b" stroke-width="8" fill="none" stroke-linecap="round"/>`
      + `<ellipse cx="58" cy="114" rx="34" ry="22" fill="#ffb3c1"/><circle cx="48" cy="114" r="4" fill="#3a3a3a"/><circle cx="68" cy="114" r="4" fill="#3a3a3a"/><circle cx="48" cy="78" r="6" fill="#3a3a3a"/><circle cx="78" cy="78" r="6" fill="#3a3a3a"/>`);
    const pig = svgURL(300, 240, legs([80, 110, 180, 210], 160, '#f29bb0', 50)
      + `<ellipse cx="150" cy="135" rx="100" ry="62" fill="#ffb6c8" stroke="#e07894" stroke-width="4"/><path d="M248 120 q24 -6 14 14 q-10 14 12 18" stroke="#e07894" stroke-width="5" fill="none"/>`
      + `<circle cx="70" cy="110" r="52" fill="#ffb6c8" stroke="#e07894" stroke-width="4"/><path d="M36 68 l-6 -34 l30 18 Z M96 64 l12 -32 l12 34 Z" fill="#f29bb0"/>`
      + `<ellipse cx="62" cy="126" rx="26" ry="18" fill="#f58aa5"/><ellipse cx="54" cy="126" rx="5" ry="7" fill="#a8455e"/><ellipse cx="70" cy="126" rx="5" ry="7" fill="#a8455e"/><circle cx="50" cy="94" r="6" fill="#3a2a1c"/><circle cx="84" cy="94" r="6" fill="#3a2a1c"/>`);
    const hen = svgURL(300, 240, `<path d="M130 190 v34 M170 190 v34 M120 224 h24 M160 224 h24" stroke="#f2a33a" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M210 120 q50 -60 60 -10 q-10 30 -40 40 Z" fill="#c8551f"/><ellipse cx="150" cy="140" rx="85" ry="62" fill="#fff4e0" stroke="#c9a77c" stroke-width="4"/>`
      + `<path d="M120 130 q40 40 90 0" fill="#f0dcc0" stroke="#c9a77c" stroke-width="3"/><circle cx="96" cy="78" r="40" fill="#fff4e0" stroke="#c9a77c" stroke-width="4"/>`
      + `<path d="M74 44 q6 -24 18 -6 q8 -22 18 -2 q12 -16 14 8 Z" fill="#e8413c"/><path d="M58 80 l-28 10 l28 10 Z" fill="#f2a33a"/><path d="M66 102 q-6 18 6 22 q8 -8 0 -22 Z" fill="#e8413c"/><circle cx="90" cy="72" r="6" fill="#3a2a1c"/>`);
    const sheep = svgURL(300, 240, legs([90, 120, 180, 210], 160, '#3a3a3a', 54)
      + Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<circle cx="${160 + Math.cos(a) * 82}" cy="${126 + Math.sin(a) * 46}" r="34" fill="#fbfbf6" stroke="#d8d4c6" stroke-width="3"/>`; }).join('')
      + `<ellipse cx="160" cy="126" rx="86" ry="52" fill="#fbfbf6"/><ellipse cx="70" cy="110" rx="34" ry="44" fill="#3a3a3a"/><ellipse cx="38" cy="96" rx="20" ry="10" fill="#3a3a3a" transform="rotate(-20 38 96)"/>`
      + `<circle cx="72" cy="72" r="20" fill="#fbfbf6"/><circle cx="58" cy="104" r="6" fill="#ffffff"/><circle cx="84" cy="104" r="6" fill="#ffffff"/>`);
    const milk = svgURL(160, 240, `<rect x="50" y="10" width="60" height="34" rx="6" fill="#4a8fe0"/><path d="M50 44 h60 l20 50 v130 a10 10 0 0 1 -10 10 h-80 a10 10 0 0 1 -10 -10 v-130 Z" fill="#ffffff" stroke="#9fb7d4" stroke-width="5"/><rect x="30" y="120" width="100" height="56" fill="#4a8fe0"/><text x="80" y="158" font-family="Arial Black, Arial, sans-serif" font-size="26" fill="#ffffff" text-anchor="middle">LECHE</text>`);
    const eggs = svgURL(220, 200, `<ellipse cx="110" cy="150" rx="100" ry="40" fill="#c99a5b"/><ellipse cx="70" cy="110" rx="34" ry="44" fill="#fff8ec" stroke="#d8c6a4" stroke-width="4"/><ellipse cx="140" cy="104" rx="34" ry="44" fill="#f3dcc0" stroke="#d8c6a4" stroke-width="4"/><ellipse cx="106" cy="128" rx="34" ry="44" fill="#fff8ec" stroke="#d8c6a4" stroke-width="4"/>`);
    const wool = svgURL(220, 220, `<circle cx="110" cy="110" r="90" fill="#f4a3c0"/>` + [30, 55, 80, 105, 130].map(d => `<path d="M${20 + d * 0.3} ${110 - d * 0.5} q90 ${d * 0.4} 180 ${d * 0.6}" stroke="#d96f97" stroke-width="5" fill="none"/>`).join('') + `<path d="M190 160 q30 20 20 50" stroke="#d96f97" stroke-width="6" fill="none"/>`);
    const field = () => [shape('ellipse', -200, 470, 900, 420, GRASS), shape('ellipse', 500, 430, 1100, 500, '#97d468'), shape('rect', 0, 600, 1280, 120, GRASS)];
    const fence = (y, x0 = 0, x1 = 1280) => [shape('rect', x0, y + 18, x1 - x0, 12, WOOD), shape('rect', x0, y + 48, x1 - x0, 12, WOOD),
      ...Array.from({ length: Math.floor((x1 - x0) / 90) + 1 }, (_, i) => shape('rounded', x0 + 10 + i * 90, y, 18, 84, '#a06b3e'))];
    const barn = (x, y, s = 1) => [poly(x, y, s), shape('rect', x + 20 * s, y + 130 * s, 300 * s, 200 * s, BARN),
      shape('rect', x + 120 * s, y + 200 * s, 100 * s, 130 * s, '#ffffff'), shape('rect', x + 128 * s, y + 208 * s, 84 * s, 114 * s, '#a52a22'),
      shape('rect', x + 145 * s, y + 80 * s, 50 * s, 40 * s, '#ffe08a', { stroke: '#ffffff', strokeWidth: 4 })];
    function poly(x, y, s) { return shape('custom', x, y, 340 * s, 140 * s, '#8f2a22', { path: 'M0 100 L50 0 L100 100 Z' }); }
    const animals = [[cow, 'Vaca', '¡Muuu!'], [pig, 'Cerdo', '¡Oinc!'], [hen, 'Gallina', '¡Cocorocó!'], [sheep, 'Oveja', '¡Beee!']];
    const line = (x1, y1, x2, y2, c) => shape('custom', Math.min(x1, x2), Math.min(y1, y2), Math.max(2, Math.abs(x2 - x1)), Math.max(2, Math.abs(y2 - y1)), 'none',
      { path: `M${x1 <= x2 ? 0 : 100} ${y1 <= y2 ? 0 : 100} L${x1 <= x2 ? 100 : 0} ${y1 <= y2 ? 100 : 0}`, stroke: c, strokeWidth: 8, dash: 'dash' });
    const fox = lib3d('kh-Fox');
    return numbered(build({ name: 'Los animales de la granja', palette: 'forest', fonts: 'editorial', title: { font: H, size: 62, color: '#8f2a22', bold: false }, body: { color: INK } }, [
      { layout: 'blank', bg: SKY, back: [shape('sun', 70, 50, 150, 150, '#ffd23f'), shape('cloud', 330, 60, 200, 110, '#ffffff'), ...field()], transition: 'fade', extra: [
        ...barn(860, 170, 1.05), ...fence(560, 0, 760),
        shape('rect', 300, 330, 22, 240, WOOD), shape('rect', 620, 330, 22, 240, WOOD),
        shape('rounded', 210, 160, 520, 220, '#b07a45', { stroke: '#7a4f2a', strokeWidth: 8 }),
        say('La granja', 230, 170, 480, 140, 104, '#fff4dc', H),
        say('¿Quién vive aquí?', 230, 300, 480, 60, 36, '#fff4dc', Bd, { fontWeight: 800 }),
        after(img(hen, 760, 470, 170, 136, 'Una gallina'), 'bounce', { sound: 'pop' }), after(img(cow, 1000, 470, 230, 184, 'Una vaca'), 'bounce', { sound: 'pop' })],
        notes: 'Un granero, una valla y un cartel de madera, todo dibujado con formas. Al llegar entran la gallina y la vaca. ¿Habéis estado alguna vez en una granja?' },
      { title: '¿Quién vive en la granja?', layout: 'titleOnly', bg: '#eef8e2', extra: [
        ...animals.flatMap(([src, n, snd], i) => { const x = 60 + i * 295;
          return [shape('rounded', x, 180, 270, 400, '#ffffff', { stroke: DARK, strokeWidth: 4 }), shape('rect', x + 4, 420, 262, 70, '#cdeab0'),
            on(img(src, x + 15, 230, 240, 192, n), 'bounce', { sound: 'pop' }),
            along(say(n, x, 440, 270, 70, 48, INK, Bd, { fontWeight: 900 }), 'fade-up'),
            along(say(snd, x, 510, 270, 60, 36, BARN, H), 'zoom-in', { delay: 300 })]; })],
        notes: 'Un clic por animal: entra saltando con un «pop». La clase imita el sonido antes de que aparezca escrito.' },
      { title: '¿Qué nos dan?', layout: 'titleOnly', bg: '#fff8e8', extra: [
        ...[[cow, milk, 'leche'], [hen, eggs, 'huevos'], [sheep, wool, 'lana']].flatMap(([a, p, n], i) => { const y = 170 + i * 175;
          return [img(a, 120, y, 200, 160, ['Vaca', 'Gallina', 'Oveja'][i]),
            on(line(350, y + 80, 760, y + 80, [BARN, '#e09a1f', '#d96f97'][i]), 'draw', { duration: 900, sound: 'whoosh' }),
            after(img(p, 790, y + 5, 150, 150, n), 'zoom-in'), along(say(n, 960, y + 40, 260, 80, 56, INK, H), 'fade-left')]; })],
        notes: 'Con cada clic se traza la línea de un animal a lo que nos da: leche, huevos y lana. ¿Qué más sale de la granja? Miel, queso, mantequilla…' },
      { title: '¿Cuántos animales hay?', layout: 'titleOnly', bg: '#eef8e2', extra: [
        tableBlock({ x: 110, y: 175, w: 620, h: 470, fontSize: 40, header: true, headBg: DARK, headFg: '#ffffff', stroke: '#9cc77a', colW: [3, 2],
          rows: [['Animal', 'Cuántos'], ['Vacas', '3'], ['Cerdos', '2'], ['Gallinas', '6'], ['Ovejas', '4'], ['En total', '=SUMA(ARRIBA)']] }),
        img(hen, 800, 170, 200, 160, 'Gallina'), img(sheep, 1000, 260, 220, 176, 'Oveja'),
        on(say('¡15 animales!', 780, 480, 440, 110, 64, BARN, H), 'zoom-in', { sound: 'chime' })],
        notes: 'La tabla suma sola: la última casilla es =SUMA(ARRIBA). Contamos con los dedos y comprobamos que coincide; si cambiáis un número, el total cambia.' },
      { title: 'El camión de la leche', layout: 'titleOnly', bg: SKY, back: [shape('cloud', 900, 40, 220, 110, '#ffffff'), ...field()], extra: [
        shape('rect', 0, 520, 1280, 110, '#9a9488'), ...Array.from({ length: 9 }, (_, i) => shape('rect', 30 + i * 150, 570, 80, 10, '#ffffff')),
        withAnims(m3d('kh-CesiumMilkTruck', 30, 290, 460, 320, { view: 'side' }), path([[300, 0], [550, 0], [740, 0]], { duration: 4000, sound: 'whoosh' })),
        say('Recoge la leche de las vacas y la lleva a la ciudad', 140, 170, 1000, 120, 44, INK, Bd, { fontWeight: 800 })],
        notes: 'Clic: el camión 3D recorre la carretera (trayectoria animada). Se puede girar con el ratón al presentar. Después la leche se envasa y llega a la tienda.' },
      { layout: 'blank', bg: '#2d3f6b', back: [shape('moon', 1080, 40, 110, 110, '#fff4c2'), ...Array.from({ length: 10 }, (_, i) => shape('star', 80 + i * 95, 140 + (i % 3) * 40, 18, 18, '#fff4c2', { opacity: 70 })),
        shape('ellipse', -200, 520, 1700, 400, '#3d6b3a')], extra: [
        shape('rect', 960, 330, 260, 230, '#a33a2c'), shape('custom', 940, 240, 300, 100, '#7a241c', { path: 'M0 100 L50 0 L100 100 Z' }), shape('rect', 1050, 440, 80, 120, '#5a1a14'),
        img(hen, 1010, 230, 150, 120, 'Gallina en el gallinero'),
        say('¡Shhh! Alguien se acerca…', 60, 50, 900, 110, 70, '#ffd23f', H, { textAlign: 'left' }),
        withAnims(m3d('kh-Fox', 20, 330, 400, 320, { walk: { clip: fox.walk, face: true } }), path([[260, 0], [520, 0]], { duration: 4200 })),
        on(say('¡Co-co-co! ¡La gallina avisa!', 330, 180, 620, 80, 46, '#ffffff', H), 'zoom-in', { sound: 'drumroll' }),
        text('Modelo 3D: ' + lib3d('kh-Fox').label + ' — ' + lib3d('kh-Fox').credit, 60, 668, 1160, 36, { fontSize: 12, color: '#c9d6ea' })],
        notes: 'De noche, el zorro 3D camina hacia el gallinero (clic: trayectoria con su animación de andar). Otro clic: la gallina da la alarma con un redoble. ¿Quién protege a las gallinas?' },
      { layout: 'blank', bg: '#eef8e2', extra: [activity({ kind: 'quiz', question: '¿Quién dice «muuu»?', options: ['La vaca', 'El cerdo', 'La gallina', 'La oveja'], correct: [0], time: 30, fontSize: 52 })],
        notes: 'Concurso de sonidos. Después, la maestra hace otros sonidos y la clase adivina el animal.' },
      { layout: 'blank', bg: '#eef8e2', extra: [activity({ kind: 'label', question: '¿Quién es quién?', fontSize: 44,
        image: svgURL(600, 420, `<rect width="600" height="420" fill="#cdeab0"/><rect width="600" height="140" fill="#bfe6ff"/><image href="${cow}" x="10" y="80" width="300" height="240"/><image href="${pig}" x="300" y="70" width="290" height="232"/><image href="${hen}" x="40" y="250" width="210" height="168"/><image href="${sheep}" x="320" y="230" width="240" height="192"/>`),
        options: ['Vaca', 'Cerdo', 'Gallina', 'Oveja'], points: [{ x: 26, y: 46 }, { x: 74, y: 42 }, { x: 22, y: 80 }, { x: 74, y: 82 }] })],
        notes: 'Etiquetar una imagen: cada número del dibujo es un animal. Lo resolvemos todos juntos señalando en la pizarra digital.' },
      { layout: 'blank', bg: SKY, back: field(), transition: 'zoom', extra: [
        ...fence(520),
        say('¡Somos animales!', 80, 120, 700, 120, 92, '#8f2a22', H),
        say('Cuando suene la música, cada uno imita a un animal de la granja… ¡sin decir cuál es!', 80, 260, 680, 180, 40, INK, Bd, { fontWeight: 800, textAlign: 'left' }),
        timer(30, 860, 110, 320, { color: BARN, endText: '¡Quietos!' }),
        credits(['kh-CesiumMilkTruck'], 60, 668, 1160, '#2d4a1e')],
        notes: 'Treinta segundos para imitar a un animal; al terminar, el resto adivina cuál era. Cuenta atrás con sonido.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · The seasons as one tree through the year: the same tree glides from spring to summer, autumn and
  // winter with Transform (flowers become fruit, then leaves on the ground, then snow), leaves and snow
  // falling along paths, a wheel of the year, a cycle diagram, clothes to match and a vote.
  edu_kids_seasons: { name: 'Las cuatro estaciones', cat: 'edu', summary: 'Un árbol que cambia con Transformar en cuatro estaciones, hojas y nieve que caen, rueda del año, ciclo, unir parejas y votación', make: () => {
    const INK = '#3d2b1f', H = FF.caveat, Bd = FF.nunito;
    const T = { crownA: uid(), crownB: uid(), crownC: uid(), ground: uid(), sky: uid(), dots: Array.from({ length: 9 }, () => uid()) };
    const DOT_TREE = [[290, 200], [360, 160], [440, 190], [250, 270], [330, 260], [420, 250], [490, 280], [300, 330], [450, 330]];
    // The tree: trunk and branches stay; the crown, the little dots (flowers, fruit, leaves, snow) and the ground change.
    const tree = s => [keep(shape('ellipse', -200, 540, 1000, 360, s.ground), T.ground),
      shape('rounded', 345, 330, 70, 260, '#7a5132'), shape('rounded', 300, 320, 22, 120, '#7a5132', { rotation: -35 }), shape('rounded', 438, 310, 22, 120, '#7a5132', { rotation: 35 }),
      keep(shape('ellipse', 200 + s.dx, 150 + s.dy, 220 - 2 * s.dx, 220 - 2 * s.dy, s.crown, { opacity: s.op ?? 100 }), T.crownA),
      keep(shape('ellipse', 340 + s.dx, 110 + s.dy, 220 - 2 * s.dx, 230 - 2 * s.dy, s.crown2 || s.crown, { opacity: s.op ?? 100 }), T.crownB),
      keep(shape('ellipse', 260 + s.dx, 220 + s.dy, 300 - 2 * s.dx, 170 - 2 * s.dy, s.crown, { opacity: s.op ?? 100 }), T.crownC),
      ...T.dots.map((id, i) => { const [x, y] = (s.dotsAt || DOT_TREE)[i]; return keep(shape(s.dotShape || 'ellipse', x, y, s.dotSize, s.dotSize, s.dot, { rotation: s.dotRot ? i * 37 : 0 }), id); })];
    const SEA = {
      spring: { name: 'Primavera', bg: '#eaf8de', tc: '#3f8f2f', ground: '#9ad97a', crown: '#9be07a', crown2: '#86d466', dx: 15, dy: 15, dot: '#ff9ec4', dotSize: 34, dotShape: 'star',
        icons: [['flower', '#e8558f'], ['bird', '#3f8f2f']], words: 'Salen flores y los pájaros cantan', sky: 'sun' },
      summer: { name: 'Verano', bg: '#fff3c2', tc: '#c27c00', ground: '#cfdc6b', crown: '#3f9b3a', crown2: '#348a30', dx: 0, dy: 0, dot: '#e8413c', dotSize: 30,
        icons: [['sun', '#f2a300'], ['ice-cream-cone', '#e8558f']], words: 'Hace calor, el sol brilla y hay fruta', sky: 'sun' },
      autumn: { name: 'Otoño', bg: '#ffe6cc', tc: '#c4561a', ground: '#d9a35c', crown: '#f08a24', crown2: '#d9631c', dx: 25, dy: 25, dot: '#b8501a', dotSize: 36, dotShape: 'teardrop', dotRot: true,
        dotsAt: [[120, 600], [190, 640], [520, 610], [600, 650], [80, 660], [660, 600], [240, 590], [460, 660], [380, 640]],
        icons: [['leaf', '#c4561a'], ['cloud-rain', '#5b7fa8']], words: 'Las hojas se caen y llega la lluvia', sky: 'cloud' },
      winter: { name: 'Invierno', bg: '#e4f1ff', tc: '#2f6db0', ground: '#ffffff', crown: '#ffffff', crown2: '#f2f7ff', dx: 70, dy: 75, op: 0, dot: '#ffffff', dotSize: 26, dotShape: 'star6',
        dotsAt: [[120, 120], [220, 60], [560, 90], [640, 200], [90, 300], [600, 330], [500, 40], [170, 420], [660, 430]],
        icons: [['snowflake', '#2f6db0'], ['thermometer', '#5b7fa8']], words: 'Hace frío, nieva y nos abrigamos', sky: 'snow' } };
    const season = (k, notes, extraBits = [], first = false) => { const s = SEA[k];
      return { layout: 'blank', bg: s.bg, ...(first ? { transition: 'fade' } : { autoAnimate: true }), extra: [
        ...tree(s),
        say(s.name, 760, 120, 470, 150, 120, s.tc, H, { fontWeight: 700 }),
        ...s.icons.map(([ic, c], i) => icon(ic, 850 + i * 170, 300, 120, c)),
        say(s.words, 760, 460, 470, 160, 44, INK, Bd, { fontWeight: 800 }), ...extraBits],
        notes }; };
    const quarter = (x, y, d, rot, c) => shape('custom', x, y, d, d, c, { path: 'M50 50 L50 0 A50 50 0 0 1 100 50 Z', rotation: rot, stroke: '#ffffff', strokeWidth: 6 });
    return numbered(build({ name: 'Las cuatro estaciones', palette: 'warm', fonts: 'classic', title: { font: H, size: 72, color: INK, bold: true }, body: { color: INK } }, [
      { layout: 'blank', bg: '#fffaf2', back: [glow(560, 60, 700, '#ffe9c7', '#fffaf2', 90)], transition: 'zoom', extra: [
        say('Las cuatro<br>estaciones', 70, 150, 560, 280, 116, INK, H, { fontWeight: 700, textAlign: 'left', lineHeight: 0.95 }),
        say('Un árbol nos cuenta cómo cambia el año', 70, 450, 520, 120, 40, '#8a6a52', Bd, { fontWeight: 700, textAlign: 'left' }),
        withAnims(shape('ellipse', 700, 110, 500, 500, '#ffffff', { stroke: '#e9dccb', strokeWidth: 4 }), A('spin360', { start: 'afterPrev', duration: 2400 })),
        ...[[0, '#9be07a', 'flower', '#e8558f'], [90, '#ffd25a', 'sun', '#c27c00'], [180, '#f5a25a', 'leaf', '#a8440f'], [270, '#a9d2f5', 'snowflake', '#2f6db0']].flatMap(([rot, c, ic, ic2], i) => {
          const cx = 950 + [1, 1, -1, -1][i] * 110, cy = 360 + [-1, 1, 1, -1][i] * 110;
          return [after(quarter(720, 130, 460, rot, c), 'zoom-in', { duration: 400, sound: i === 3 ? 'chime' : undefined }), along(icon(ic, cx - 50, cy - 50, 100, ic2), 'zoom-in')]; })],
        notes: 'La rueda del año se monta sola, una estación tras otra, y suena una campanilla. Preguntamos: ¿en qué estación estamos ahora?' },
      season('spring', 'Nuestro árbol en primavera: hojas verde claro y flores rosas. Fijaos bien: en las siguientes diapositivas es el mismo árbol, que va cambiando (Transformar).', [
        withAnims(icon('bird', 640, 380, 64, '#3f8f2f'), path([[-80, -60], [-160, -20], [-240, -90], [-300, -40]], { start: 'afterPrev', duration: 3000 }))], true),
      season('summer', 'Transformar: la copa crece y se vuelve verde oscuro, y las flores se convierten en frutas rojas. ¿Qué fruta comemos en verano?', [
        shape('sun', 610, 40, 140, 140, '#ffc61a')]),
      season('autumn', 'Las hojas viajan del árbol al suelo con Transformar y la copa se vuelve naranja. Un clic más: caen las últimas hojas, con un silbido.', [
        ...[[300, 230, 0], [420, 260, 1], [360, 190, 2]].map(([x, y, i]) => withAnims(shape('teardrop', x, y, 34, 34, '#d9631c', { rotation: i * 60 }),
          path([[-30, 90], [30, 180], [-20, 270], [10, 340]], { start: i ? 'withPrev' : 'click', delay: i * 400, duration: 2600, ...(i === 0 && { sound: 'whoosh' }) })))]),
      season('winter', 'El árbol se queda sin hojas y la nieve lo cubre todo. Clic: caen copos de nieve. ¿Qué ropa nos ponemos ahora?', [
        ...[[120, 20], [330, 0], [560, 30], [230, 60], [470, 70]].map(([x, y], i) => withAnims(icon('snowflake', x, y, 44, '#8fb8e8'),
          path([[20, 120], [-20, 240], [20, 380], [0, 470]], { start: i ? 'withPrev' : 'click', delay: i * 300, duration: 3600 })))]),
      { title: 'El año da vueltas', layout: 'titleOnly', bg: '#fffaf2', extra: [
        dg('cycle', 'Primavera\nVerano\nOtoño\nInvierno', 190, 150, 900, 540, { oneByOne: true, colors: 'colorful', fontScale: 2.5 })],
        notes: 'Diagrama de ciclo: un clic por estación. Después del invierno vuelve la primavera, y así siempre. ¿En qué estación es tu cumpleaños?' },
      { layout: 'blank', bg: '#5a3e2b', extra: [activity({ kind: 'match', question: '¿Cuándo nos lo ponemos?', options: ['Bufanda = Invierno', 'Bañador = Verano', 'Botas de agua = Otoño', 'Gorra y chaqueta fina = Primavera'] })],
        notes: 'Unir parejas: la maestra lee cada prenda (mejor si la lleva en una bolsa y la saca) y la clase dice la estación.' },
      { layout: 'blank', bg: '#5a3e2b', extra: [activity({ kind: 'choice', display: 'pie', question: '¿Cuál es tu estación favorita?', options: ['Primavera', 'Verano', 'Otoño', 'Invierno'] })],
        notes: 'Votación con resultado en tarta. Cada uno explica por qué la ha elegido.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · Shapes with wooden blocks on a playroom rug: blocks that fall into a tower, shapes that draw
  // themselves, a house of shapes that turns into a robot with Transform, the robot in 3D, a picture
  // to label, a quiz and a tower of blocks as a pyramid.
  edu_kids_shapes: { name: 'Formas y bloques', cat: 'edu', summary: 'Alfombra de juegos: bloques con sonido, formas que se dibujan solas, casa que se vuelve robot con Transformar, robot 3D y pirámide', make: () => {
    const RUG = '#1f7a80', RUG2 = '#22868c', W = '#fff8ec', R = '#ef476f', Y = '#ffd166', G = '#06d6a0', B = '#118ab2', P = '#9b5de5', O = '#f78c3b', H = FF.josefin;
    const rug = () => [shape('rounded', 30, 30, 1220, 660, RUG2, { radius: 40, stroke: '#ffffff40', strokeWidth: 6, dash: 'dash' }),
      ...Array.from({ length: 5 }, (_, i) => shape('ellipse', 80 + i * 260, 640, 30, 30, [R, Y, G, B, P][i], { opacity: 40 }))];
    const block = (kind, x, y, w, h, c, props = {}) => shape(kind, x, y, w, h, c, { stroke: '#00000030', strokeWidth: 4, shadow: { x: 0, y: 8, blur: 0, color: '#00000035' }, ...props });
    const tri = (x, y, w, h, c, props = {}) => block('triangle', x, y, w, h, c, props);
    // The house and the robot: the same seven pieces.
    const P7 = { wall: uid(), roof: uid(), door: uid(), winL: uid(), winR: uid(), sun: uid(), chim: uid() };
    const house = () => [keep(block('rect', 700, 190, 50, 90, P), P7.chim), keep(block('ellipse', 960, 150, 160, 160, O), P7.sun), keep(block('rect', 380, 330, 400, 300, Y), P7.wall), keep(tri(340, 170, 480, 170, R), P7.roof), keep(block('rect', 530, 470, 100, 160, B), P7.door),
      keep(block('rect', 420, 380, 80, 80, '#9bd8f2'), P7.winL), keep(block('rect', 660, 380, 80, 80, '#9bd8f2'), P7.winR)];
    const robot = () => [keep(block('rect', 625, 360, 30, 60, P), P7.chim), keep(block('ellipse', 520, 225, 240, 185, O), P7.sun), keep(block('rect', 480, 410, 320, 250, Y), P7.wall), keep(tri(565, 150, 150, 95, R), P7.roof), keep(block('rect', 590, 480, 100, 120, B), P7.door),
      keep(block('rect', 560, 280, 50, 50, '#9bd8f2'), P7.winL), keep(block('rect', 670, 280, 50, 50, '#9bd8f2'), P7.winR)];
    return numbered(build({ name: 'Formas y bloques', palette: 'revela', fonts: 'tech', title: { font: H, size: 60, color: W }, body: { color: W } }, [
      { layout: 'blank', bg: RUG, back: rug(), transition: 'zoom', extra: [
        say('Formas<br>y bloques', 90, 140, 600, 300, 120, W, H, { fontWeight: 700, textAlign: 'left', lineHeight: 0.95, wordart: 'shadow' }),
        say('Círculos, cuadrados y triángulos para construir', 90, 460, 560, 120, 38, '#d9f3f1', H, { fontWeight: 600, textAlign: 'left' }),
        ...[['rect', 760, 470, 200, 160, B], ['rect', 980, 470, 200, 160, R], ['rect', 860, 310, 220, 160, Y], ['triangle', 860, 140, 220, 170, G], ['ellipse', 1110, 380, 90, 90, P]]
          .map(([k, x, y, w, h, c], i) => after(block(k, x, y, w, h, c), 'bounce', { duration: 700, sound: 'pop' }))],
        notes: 'Al llegar, los bloques caen uno tras otro con un «pop» y forman una torre. ¿Qué formas veis?' },
      { title: 'Tres formas', layout: 'titleOnly', bg: RUG, back: rug(), extra: [
        ...[['ellipse', 'Círculo', 'redondo, sin esquinas', O], ['rect', 'Cuadrado', '4 lados iguales', B], ['triangle', 'Triángulo', '3 lados y 3 esquinas', R]].flatMap(([k, n, d, c], i) => {
          const x = 90 + i * 390;
          return [on(shape(k, x + 40, 180, 260, 240, 'none', { stroke: W, strokeWidth: 10 }), 'draw', { duration: 1200 }),
            after(block(k, x + 40, 180, 260, 240, c), 'zoom-in', { sound: 'pop' }),
            along(say(n, x, 450, 340, 80, 60, W, H, { fontWeight: 700 }), 'fade-up'), along(say(d, x, 530, 340, 60, 32, '#d9f3f1', H), 'fade-up', { delay: 200 })]; })],
        notes: 'Con cada clic, una forma se dibuja sola (como con el dedo en el aire) y luego se rellena de color. Dibujadla vosotros en la alfombra con el dedo.' },
      { title: 'Una casa de formas', layout: 'titleOnly', bg: RUG, back: rug(), extra: [
        ...house(), shape('rect', 60, 630, 1160, 8, '#ffffff50'),
        on(say('¿Cuántos cuadrados ves?', 860, 420, 380, 160, 40, W, H, { fontWeight: 700 }), 'fade-left')],
        notes: 'Una casa hecha solo con formas: un cuadrado grande, un triángulo de tejado, rectángulos y un círculo de sol. Contamos los cuadrados: la pared y dos ventanas.' },
      { title: '¡Ahora es un robot!', layout: 'titleOnly', bg: RUG, back: rug(), autoAnimate: true, extra: [
        ...robot(),
        say('Las mismas piezas… ¡otro dibujo!', 860, 420, 380, 160, 40, W, H, { fontWeight: 700 })],
        notes: 'Transformar: las mismas siete piezas de la casa vuelan y forman un robot. El sol es la cabeza, el tejado un gorro y las ventanas los ojos.' },
      { title: 'Robi, el robot de formas', layout: 'titleOnly', bg: '#173f63', back: [glow(330, 110, 640, '#2a6a9a', '#173f63', 80)], extra: [
        m3d('three-RobotExpressive', 380, 150, 520, 520, { clip: 'Wave', view: 'front' }),
        on(card('¡Hola! Tengo la cabeza redonda…', 60, 210, 340, 160, '#ffffff', { fontFamily: H, fontSize: 32, color: '#173f63', fontWeight: 700 }), 'fade-right', { sound: 'pop' }),
        on(card('…y el cuerpo como una caja.', 880, 400, 340, 160, '#ffffff', { fontFamily: H, fontSize: 32, color: '#173f63', fontWeight: 700 }), 'fade-left', { sound: 'pop' })],
        notes: 'Robot 3D que saluda sin parar (Modelo 3D ▸ Animación: Wave). Al presentar se puede girar con el ratón. ¿Qué formas tiene su cuerpo?' },
      { layout: 'blank', bg: RUG, extra: [activity({ kind: 'label', question: '¿Qué forma es?', fontSize: 44,
        image: svgURL(600, 420, `<rect width="600" height="420" fill="#fff8ec"/><rect y="330" width="600" height="90" fill="#e8d3b0"/>`
          + `<circle cx="140" cy="110" r="70" fill="#ffffff" stroke="#3a3a3a" stroke-width="8"/><path d="M140 110 V70 M140 110 H170" stroke="#3a3a3a" stroke-width="7" stroke-linecap="round"/>`
          + `<rect x="330" y="40" width="160" height="160" fill="#9bd8f2" stroke="#7a5132" stroke-width="10"/><path d="M410 40 V200 M330 120 H490" stroke="#7a5132" stroke-width="6"/>`
          + `<path d="M80 380 L200 380 L140 250 Z" fill="#ffd166" stroke="#d9963b" stroke-width="6"/><circle cx="130" cy="350" r="10" fill="#ef476f"/><circle cx="160" cy="330" r="9" fill="#ef476f"/>`
          + `<rect x="380" y="230" width="120" height="180" rx="6" fill="#ef476f"/><circle cx="480" cy="320" r="7" fill="#ffd166"/>`),
        options: ['Círculo', 'Cuadrado', 'Triángulo', 'Rectángulo'], points: [{ x: 23, y: 26 }, { x: 68, y: 29 }, { x: 23, y: 78 }, { x: 74, y: 76 }] })],
        notes: 'Etiquetar: un reloj, una ventana, un trozo de pizza y una puerta. ¿Qué forma tiene cada uno? Después buscamos esas formas por la clase.' },
      { layout: 'blank', bg: RUG, extra: [activity({ kind: 'quiz', question: '¿Cuántos lados tiene un triángulo?', options: ['2', '3', '4'], correct: [1], time: 30, fontSize: 56 })],
        notes: 'Concurso. Para comprobarlo, contamos los lados del tejado de la casa con el dedo.' },
      { title: 'Construimos una torre', layout: 'titleOnly', bg: RUG, back: rug(), extra: [
        dg('pyramid', '1 bloque\n2 bloques\n3 bloques\n4 bloques', 300, 160, 680, 380, { oneByOne: true, colors: 'colorful', fontScale: 1.5 }),
        say('¿Cuántos bloques necesitas para el piso de abajo?', 60, 560, 1160, 60, 32, '#d9f3f1', H, { fontWeight: 600 })],
        notes: 'La pirámide aparece piso a piso, de arriba abajo. En la alfombra construimos la misma torre con bloques de verdad: 1, 2, 3 y 4.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · The five senses on kraft cardboard: a cut-out face, a radial diagram, riddles of «veo, veo», buttons
  // that sound, tastes and textures on cards that turn over, a face to label and a mystery bag.
  edu_kids_senses: { name: 'Los cinco sentidos', cat: 'edu', summary: 'Cartulina recortada: cara dibujada, diagrama radial, adivinanzas, botones con cinco sonidos, tarjetas que giran, etiquetar y cuenta atrás', make: () => {
    const KRAFT = '#ecd6b0', CARD = '#fffaf0', INK = '#4a2f1d', SKIN = '#f6c9a0', HAIR = '#6b3e1f', H = FF.poppins;
    const CS = { see: '#2f7de1', hear: '#8e4fc9', smell: '#e8558f', taste: '#f08a24', touch: '#2fa36b' };
    const dots = () => Array.from({ length: 14 }, (_, i) => shape('ellipse', (i * 97) % 1240 + 20, (i * 53) % 680 + 10, 8, 8, '#c9ab7c', { opacity: 50 }));
    // A cardboard face: hair, ears, face, eyes, nose, mouth and a hand waving.
    const kid = (x, y, s) => { const r = v => Math.round(v * s);
      return [shape('ellipse', x + r(-0.04), y + r(0.38), r(0.16), r(0.22), SKIN, { stroke: INK, strokeWidth: 4, sketch: true }), shape('ellipse', x + r(0.88), y + r(0.38), r(0.16), r(0.22), SKIN, { stroke: INK, strokeWidth: 4, sketch: true }),
        shape('ellipse', x, y + r(0.05), s, r(1.0), SKIN, { stroke: INK, strokeWidth: 4, sketch: true }),
        shape('custom', x + r(0.02), y - r(0.04), r(0.96), r(0.4), HAIR, { path: 'M0 100 C0 30 30 0 50 0 C70 0 100 30 100 100 C80 60 60 55 50 70 C40 55 20 60 0 100 Z', sketch: true }),
        shape('ellipse', x + r(0.27), y + r(0.42), r(0.12), r(0.14), '#ffffff', { stroke: INK, strokeWidth: 3 }), shape('ellipse', x + r(0.61), y + r(0.42), r(0.12), r(0.14), '#ffffff', { stroke: INK, strokeWidth: 3 }),
        shape('ellipse', x + r(0.30), y + r(0.46), r(0.06), r(0.07), INK), shape('ellipse', x + r(0.64), y + r(0.46), r(0.06), r(0.07), INK),
        shape('custom', x + r(0.45), y + r(0.55), r(0.1), r(0.14), '#e9a87c', { path: 'M50 0 L100 100 L0 100 Z', stroke: INK, strokeWidth: 3 }),
        shape('arc', x + r(0.33), y + r(0.62), r(0.34), r(0.24), 'none', { stroke: '#c9363a', strokeWidth: 7, rotation: 180 })]; };
    const faceSVG = svgURL(600, 420, `<rect width="600" height="420" fill="${CARD}"/><ellipse cx="148" cy="210" rx="26" ry="40" fill="${SKIN}" stroke="${INK}" stroke-width="4"/><ellipse cx="452" cy="210" rx="26" ry="40" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>`
      + `<ellipse cx="300" cy="215" rx="150" ry="170" fill="${SKIN}" stroke="${INK}" stroke-width="4"/><path d="M155 170 C160 60 230 40 300 40 C370 40 440 60 445 170 C400 110 340 110 300 130 C260 110 200 110 155 170 Z" fill="${HAIR}"/>`
      + `<ellipse cx="245" cy="200" rx="22" ry="24" fill="#fff" stroke="${INK}" stroke-width="3"/><ellipse cx="355" cy="200" rx="22" ry="24" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="248" cy="205" r="10" fill="${INK}"/><circle cx="358" cy="205" r="10" fill="${INK}"/>`
      + `<path d="M300 225 L318 270 L282 270 Z" fill="#e9a87c" stroke="${INK}" stroke-width="3"/><path d="M250 300 Q300 345 350 300" stroke="#c9363a" stroke-width="8" fill="none" stroke-linecap="round"/>`
      + `<g transform="translate(470 250) rotate(-15)"><rect x="0" y="40" width="80" height="90" rx="30" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>${[0, 1, 2, 3].map(i => `<rect x="${4 + i * 19}" y="0" width="16" height="56" rx="8" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`).join('')}</g>`);
    const lemon = svgURL(200, 160, `<ellipse cx="100" cy="80" rx="82" ry="58" fill="#ffe13a" stroke="#d9b400" stroke-width="5"/><ellipse cx="18" cy="80" rx="12" ry="9" fill="#ffe13a" stroke="#d9b400" stroke-width="4"/><ellipse cx="182" cy="80" rx="12" ry="9" fill="#ffe13a" stroke="#d9b400" stroke-width="4"/><ellipse cx="80" cy="58" rx="26" ry="10" fill="#ffffff" opacity=".6"/>`);
    return numbered(build({ name: 'Los cinco sentidos', palette: 'paper', fonts: 'friendly', title: { font: H, size: 56, color: INK }, body: { color: INK } }, [
      { layout: 'blank', bg: KRAFT, back: dots(), transition: 'fade', extra: [
        shape('rounded', 60, 70, 560, 580, CARD, { stroke: '#c9ab7c', strokeWidth: 4, rotation: -2 }),
        ...kid(170, 140, 340),
        say('Mis cinco<br>sentidos', 680, 110, 540, 240, 92, INK, H, { fontWeight: 800, textAlign: 'left', lineHeight: 1 }),
        ...[['eye', CS.see], ['volume-2', CS.hear], ['flower', CS.smell], ['ice-cream-cone', CS.taste], ['hand-heart', CS.touch]].flatMap(([ic, c], i) => [
          after(shape('ellipse', 690 + i * 104, 420, 92, 92, c), 'zoom-in', { duration: 350, sound: 'pop' }), along(icon(ic, 710 + i * 104, 440, 52, '#ffffff'), 'zoom-in')]),
        say('Veo, oigo, huelo, saboreo y toco', 680, 540, 540, 60, 32, '#7a5a3c', H, { fontWeight: 600, textAlign: 'left' })],
        notes: 'Una cara de cartulina dibujada con formas «a mano alzada». Los cinco círculos aparecen uno tras otro con un «pop»: uno por sentido.' },
      { title: 'Con mi cuerpo descubro el mundo', layout: 'titleOnly', bg: KRAFT, back: dots(), extra: [
        dg('radial', 'Yo\n  Veo\n  Oigo\n  Huelo\n  Saboreo\n  Toco', 240, 140, 800, 540, { oneByOne: true, colors: 'colorful', fontScale: 2.2 })],
        notes: 'Diagrama radial: un clic por sentido. Para cada uno, señalamos la parte del cuerpo: ojos, orejas, nariz, lengua y manos.' },
      { title: 'Veo, veo…', layout: 'titleOnly', bg: '#dceaff', extra: [
        shape('ellipse', 80, 230, 360, 240, '#ffffff', { stroke: INK, strokeWidth: 8 }), shape('ellipse', 180, 270, 160, 160, CS.see), shape('ellipse', 225, 315, 70, 70, INK), shape('ellipse', 270, 300, 26, 26, '#ffffff'),
        card('…una cosa <b>redonda</b> y <b>roja</b> que se come', 500, 190, 480, 150, '#ffffff', { fontFamily: H, fontSize: 36, color: INK }),
        on(icon('apple', 1020, 190, 150, '#e8413c'), 'zoom-in', { sound: 'chime' }),
        card('…una cosa <b>amarilla</b> que da luz y calor', 500, 400, 480, 150, '#ffffff', { fontFamily: H, fontSize: 36, color: INK }),
        on(icon('sun', 1020, 400, 150, '#f2a300'), 'zoom-in', { sound: 'chime' })],
        notes: 'Adivinanzas de «veo, veo». La maestra lee la pista; cuando alguien acierta, un clic muestra la respuesta con una campanilla. Después inventan las suyas.' },
      { title: 'Cierra los ojos: ¿qué suena?', layout: 'titleOnly', bg: '#efe3ff', extra: [
        ...[['bell', 'Campanilla', 'chime'], ['party-popper', 'Aplausos', 'applause'], ['music', 'Tambor', 'drumroll'], ['wind', 'Viento', 'whoosh'], ['circle-help', '¡Pop!', 'pop']].flatMap(([ic, n, snd], i) => {
          const x = 60 + i * 236;
          return [shape('ellipse', x + 18, 210, 190, 190, CS.hear, { shadow: { x: 0, y: 10, blur: 0, color: '#5a2d8a' } }), on(icon(ic, x + 63, 255, 100, '#ffffff'), 'jump', { sound: snd, duration: 900 }),
            say(n, x, 430, 226, 60, 34, INK, H, { fontWeight: 700 })]; }),
        say('Un clic, un sonido. ¿Lo adivinas antes de abrir los ojos?', 120, 540, 1040, 80, 36, '#6a44a8', H, { fontWeight: 600 })],
        notes: 'Cada clic hace saltar un botón y suena: campanilla, aplausos, redoble, viento y «pop». La clase escucha con los ojos cerrados y adivina.' },
      { title: '¿A qué sabe?', layout: 'titleOnly', bg: '#fff1e2', extra: [
        ...[['dulce', 'cake', '#e8558f', null], ['salado', 'pizza', '#f08a24', null], ['ácido', null, '#c9a400', lemon]].flatMap(([n, ic, c, pic], i) => {
          const x = 80 + i * 390;
          return [on(shape('rounded', x, 180, 340, 420, '#ffffff', { stroke: c, strokeWidth: 8 }), 'flip', { sound: 'pop' }),
            along(pic ? img(pic, x + 70, 230, 200, 160, 'Un limón') : icon(ic, x + 95, 230, 150, c), 'flip'),
            along(say(n.toUpperCase(), x, 440, 340, 100, 60, c, H, { fontWeight: 800 }), 'flip')]; })],
        notes: 'Tres tarjetas que giran: dulce como un pastel, salado como una pizza, ácido como un limón. Si se puede, probamos trocitos de verdad (cuidado con las alergias).' },
      { title: '¿Cómo es al tocarlo?', layout: 'titleOnly', bg: '#e3f6ea', extra: [
        ...[['Suave', 'cloud', '#9ac7f0', null], ['Pincha', 'burst', '#7fbf4d', null], ['Frío', null, '#2f7de1', 'snowflake'], ['Caliente', null, '#e8413c', 'flame']].flatMap(([n, sh, c, ic], i) => {
          const x = 70 + (i % 2) * 580, y = 170 + Math.floor(i / 2) * 250;
          return [on(shape('rounded', x, y, 560, 220, '#ffffff', { stroke: c, strokeWidth: 6 }), 'flip', { sound: 'pop' }),
            along(sh ? shape(sh, x + 40, y + 35, 160, 150, c) : icon(ic, x + 50, y + 40, 140, c), 'flip'),
            along(say(n, x + 230, y, 310, 220, 64, INK, H, { fontWeight: 800, textAlign: 'left' }), 'flip')]; })],
        notes: 'Cuatro tarjetas que giran con un clic. Preparad una caja con algodón, una piña, un cubito de hielo y una bolsa de agua templada para tocar.' },
      { layout: 'blank', bg: KRAFT, extra: [activity({ kind: 'label', question: 'Veo, oigo, huelo, saboreo y toco con…', image: faceSVG,
        options: ['Ojos', 'Orejas', 'Nariz', 'Boca', 'Mano'],
        points: [{ x: 41, y: 48 }, { x: 25, y: 50 }, { x: 50, y: 60 }, { x: 50, y: 74 }, { x: 87, y: 66 }] })],
        notes: 'Etiquetar una imagen: cada número es una parte del cuerpo. Lo hacemos en la pizarra digital por turnos.' },
      { layout: 'blank', bg: KRAFT, back: dots(), transition: 'zoom', extra: [
        shape('teardrop', 140, 150, 360, 440, '#b5874f', { stroke: INK, strokeWidth: 5, sketch: true }), shape('rounded', 250, 190, 140, 26, '#7a4f2a', { rotation: -6 }),
        say('?', 200, 300, 240, 240, 200, '#fff4dc', H, { fontWeight: 800 }),
        say('El saco misterioso', 580, 120, 640, 100, 66, INK, H, { fontWeight: 800, textAlign: 'left' }),
        say('Mete la mano sin mirar y adivina qué es solo tocándolo.', 580, 240, 620, 160, 40, INK, H, { textAlign: 'left' }),
        timer(45, 580, 450, 620, { style: 'bar', color: CS.touch, endText: '¡Saca la mano!', h: 120 })],
        notes: 'Juego final. Cuenta atrás en barra de 45 segundos para cada turno. Objetos: una pelota, una esponja, una piña, una cuchara…' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Transport on a road playmat seen from above: a 3D toy car, vehicles that cross by air, land and
  // sea, a traffic light that changes, a chart of wheels, a concept car in 3D, matching, a vote and road safety.
  edu_kids_transport: { name: '¿Cómo viajamos?', cat: 'edu', summary: 'Alfombra de carreteras: coche de juguete 3D, vehículos que cruzan con sonido, semáforo que cambia, gráfico, coche 3D, unir y votación', make: () => {
    const MAT = '#8fcf6a', ROAD = '#5d6470', INK = '#1f2a44', SIGN = '#1e5fbf', R = '#e8413c', Y = '#ffc61a', G = '#2fbf71', H = FF.bebas, Bd = FF.nunito;
    const roads = () => [shape('rect', 0, 470, 1280, 120, ROAD), shape('rect', 820, 0, 120, 720, ROAD),
      ...Array.from({ length: 13 }, (_, i) => shape('rect', 20 + i * 100, 526, 56, 8, '#ffffff')), ...Array.from({ length: 7 }, (_, i) => shape('rect', 876, 20 + i * 100, 8, 56, '#ffffff')),
      ...[[60, 100, '#ef8a5a'], [220, 120, '#5ab0ef'], [1000, 90, '#f5c84a'], [1120, 140, '#b07ae0'], [1000, 640, '#ef8a5a'], [80, 630, '#5ab0ef']].flatMap(([x, y, c]) => [shape('rect', x, y, 110, 90, c), shape('triangle', x - 10, y - 50, 130, 52, '#a23b2a')]),
      ...[[400, 120], [560, 360], [1180, 400], [650, 640]].map(([x, y]) => shape('ellipse', x, y, 70, 70, '#4f9a3a'))];
    return numbered(build({ name: '¿Cómo viajamos?', palette: 'office', fonts: 'bold', title: { font: H, size: 66, color: INK, bold: false }, body: { color: INK } }, [
      { layout: 'blank', bg: MAT, back: roads(), transition: 'fade', extra: [
        shape('rounded', 80, 150, 640, 270, SIGN, { stroke: '#ffffff', strokeWidth: 10 }),
        say('¿Cómo viajamos?', 100, 175, 600, 140, 92, '#ffffff', H),
        say('Coches, trenes, barcos y aviones', 100, 320, 600, 70, 36, '#dbe8ff', Bd, { fontWeight: 800 }),
        shape('rect', 380, 420, 40, 60, '#9aa3b0'),
        m3d('kh-ToyCar', 780, 250, 480, 400, { autoRotate: true, view: 'three' })],
        notes: 'Una alfombra de carreteras vista desde arriba, con un coche de juguete en 3D que gira. ¿Cómo habéis venido hoy al cole?' },
      { title: 'Por el aire, por tierra y por el mar', layout: 'titleOnly', bg: '#ffffff', extra: [
        shape('rect', 0, 150, 1280, 180, '#bfe6ff'), shape('rect', 0, 330, 1280, 180, '#a6d97f'), shape('rect', 0, 400, 1280, 50, ROAD), shape('rect', 0, 510, 1280, 210, '#3a86d8'),
        shape('cloud', 900, 170, 160, 90, '#ffffff'), shape('wave', 0, 540, 1280, 60, '#5aa0e8'),
        ...[['AIRE', 180, '#1e5fbf'], ['TIERRA', 360, '#2d6a1e'], ['MAR', 560, '#ffffff']].map(([n, y, c]) => say(n, 40, y, 240, 100, 70, c, H, { textAlign: 'left' })),
        withAnims(icon('plane', 290, 180, 110, '#1f2a44'), path([[400, -20], [800, 10]], { duration: 2500, sound: 'whoosh' })),
        withAnims(icon('bus', 290, 360, 100, '#e8413c'), path([[400, 0], [800, 0]], { duration: 3000, sound: 'whoosh' })),
        withAnims(icon('ship', 290, 560, 110, '#ffffff'), path([[400, 10], [800, 0]], { duration: 4000, sound: 'whoosh' }))],
        notes: 'Un clic por vehículo: el avión vuela, el autobús va por la carretera y el barco navega (trayectorias con silbido). ¿Qué más va por el aire? ¿Y por el mar?' },
      { title: 'El semáforo', layout: 'titleOnly', bg: '#e9eef5', extra: [
        shape('rect', 300, 560, 40, 130, '#3a3f4a'), shape('rounded', 220, 150, 200, 420, '#2b2f38'),
        ...[[R, 170], [Y, 300], [G, 430]].map(([c, y]) => shape('ellipse', 255, y, 130, 130, c, { opacity: 22 })),
        ...[[R, 170, '¡Quieto!', 'Rojo: esperamos en la acera'], [Y, 300, '¡Atento!', 'Amarillo: va a cambiar'], [G, 430, '¡Ahora sí!', 'Verde: cruzamos de la mano']].flatMap(([c, y, t, d], i) => [
          on(shape('ellipse', 255, y, 130, 130, c, { shadow: { x: 0, y: 0, blur: 30, color: c } }), 'fade-in', { sound: 'click' }),
          along(say(t, 520, 200 + i * 150, 700, 80, 76, c === Y ? '#9a6e00' : c === G ? '#1d8a4a' : c, H, { textAlign: 'left' }), 'fade-left'),
          along(say(d, 520, 270 + i * 150, 700, 50, 32, INK, Bd, { textAlign: 'left', fontWeight: 700 }), 'fade-left')])],
        notes: 'Con cada clic se enciende una luz y aparece qué hacer. Jugamos al semáforo: la maestra enseña un color y la clase se para, se prepara o camina.' },
      { title: '¿Cuántas ruedas tiene?', layout: 'titleOnly', bg: '#ffffff', extra: [
        chartBlock({ x: 80, y: 160, w: 760, h: 500, chartType: 'bar', color: SIGN, dataLabels: true, yMin: 0, yMax: 6,
          data: [{ label: 'Bici', value: 2 }, { label: 'Triciclo', value: 3 }, { label: 'Coche', value: 4 }, { label: 'Camión', value: 6 }] }),
        icon('bike', 900, 200, 110, G), icon('car', 1060, 200, 110, R), icon('truck', 980, 350, 130, '#f08a24'),
        on(say('¡El camión gana!', 880, 520, 340, 90, 56, '#c45a0c', H), 'zoom-in', { sound: 'applause' })],
        notes: 'Contamos las ruedas de cada vehículo y lo vemos en un gráfico de barras. ¿Cuál tiene menos? ¿Y más? ¿Cuántas tiene un monopatín?' },
      { layout: 'blank', bg: '#1f2a44', back: [glow(260, 120, 760, '#3b5b9a', '#1f2a44', 80)], extra: [
        say('El coche del futuro', 60, 40, 900, 100, 66, '#ffffff', H, { textAlign: 'left' }),
        m3d('kh-CarConcept', 200, 150, 880, 430, { autoRotate: true, view: 'three' }),
        say('¿De qué color lo pintarías? ¿Volaría? ¿Nadaría?', 140, 590, 1000, 60, 38, '#ffffff', Bd, { fontWeight: 800 })],
        notes: 'Un coche 3D que gira solo; al presentar se puede mover con el ratón. Después cada uno dibuja su coche del futuro.' },
      { layout: 'blank', bg: '#ffffff', extra: [activity({ kind: 'match', question: '¿Por dónde va?', options: ['Barco = Por el mar', 'Avión = Por el aire', 'Tren = Por las vías', 'Autobús = Por la carretera'] })],
        notes: 'Unir parejas, todos juntos en la pizarra digital.' },
      { layout: 'blank', bg: '#ffffff', extra: [activity({ kind: 'choice', display: 'bar', question: '¿Cómo vienes al cole?', options: ['Andando', 'En coche', 'En autobús', 'En bici o patinete'] })],
        notes: 'Votación en directo: la maestra pregunta y pulsa por cada mano levantada. ¿Qué barra es la más alta?' },
      { title: 'Viajamos seguros', layout: 'titleOnly', bg: MAT, back: [shape('rect', 0, 600, 1280, 120, ROAD), ...Array.from({ length: 13 }, (_, i) => shape('rect', 20 + i * 100, 656, 56, 8, '#ffffff'))], extra: [
        ...[['shield-check', 'Siempre con el cinturón o en la sillita', SIGN], ['hand-heart', 'Por la acera, de la mano de un mayor', G], ['eye', 'Antes de cruzar, miramos a los dos lados', R]].flatMap(([ic, t, c], i) => {
          const x = 70 + i * 390;
          return [on(shape('rounded', x, 170, 360, 400, '#ffffff', { stroke: c, strokeWidth: 8, shadow: { x: 0, y: 10, blur: 0, color: '#00000030' } }), 'bounce', { sound: 'pop' }),
            along(shape('ellipse', x + 110, 200, 140, 140, c), 'bounce'), along(icon(ic, x + 140, 230, 80, '#ffffff'), 'bounce'),
            along(say(t, x + 20, 360, 320, 190, 38, INK, Bd, { fontWeight: 800 }), 'fade-up')]; }),
        credits(['kh-CarConcept'], 60, 590, 1160, '#1f3a14')],
        notes: 'Tres normas de seguridad vial, una por clic. Las repetimos en voz alta y las practicamos en el patio con un paso de cebra de tiza.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · Under the sea: a deep blue gradient with light rays, seaweed and bubbles, sea animals of our own
  // that swim along paths, big and small, a bottle in 3D that goes into the recycling bin, matching,
  // a word cloud and a swim to a countdown.
  edu_kids_sea: { name: 'Bajo el mar', cat: 'edu', summary: 'Fondo marino en degradado, peces dibujados que nadan, burbujas, grande y pequeño, botella 3D al contenedor, unir y nube de palabras', make: () => {
    const TOP = '#4fc3f7', DEEP = '#0b3d6b', SAND = '#f2d49b', W = '#ffffff', INK = '#0b2f52', H = FF.raleway, Bd = FF.nunito;
    const fish = (c, c2, left = false) => svgURL(220, 140, `${left ? '<g transform="translate(220 0) scale(-1 1)">' : '<g>'}<path d="M170 70 L218 30 L210 70 L218 110 Z" fill="${c2}"/><ellipse cx="100" cy="70" rx="80" ry="52" fill="${c}"/><path d="M80 20 q30 -24 50 4 Z" fill="${c2}"/>`
      + `<path d="M110 30 q16 40 0 80 M135 36 q14 34 0 68" stroke="${c2}" stroke-width="7" fill="none" opacity=".7"/><circle cx="55" cy="58" r="14" fill="#fff"/><circle cx="51" cy="58" r="7" fill="#1b1b2f"/><path d="M28 84 q10 8 20 0" stroke="#1b1b2f" stroke-width="4" fill="none"/></g>`);
    const octopus = svgURL(220, 220, Array.from({ length: 8 }, (_, i) => `<path d="M${50 + i * 17} 120 q${i % 2 ? 18 : -18} 40 ${i % 2 ? -6 : 6} 90" stroke="#e86fa8" stroke-width="16" fill="none" stroke-linecap="round"/>`).join('')
      + `<ellipse cx="110" cy="90" rx="72" ry="74" fill="#f08bbd"/><circle cx="85" cy="90" r="15" fill="#fff"/><circle cx="135" cy="90" r="15" fill="#fff"/><circle cx="88" cy="92" r="7" fill="#2b1b2f"/><circle cx="138" cy="92" r="7" fill="#2b1b2f"/><path d="M96 124 q14 12 28 0" stroke="#2b1b2f" stroke-width="5" fill="none"/>`);
    const crab = svgURL(240, 180, [0, 1, 2].map(i => `<path d="M${70 - i * 4} ${110 + i * 14} l-44 ${16 + i * 6} M${170 + i * 4} ${110 + i * 14} l44 ${16 + i * 6}" stroke="#d63b2e" stroke-width="9" stroke-linecap="round"/>`).join('')
      + `<path d="M60 70 q-40 -20 -30 -56 M180 70 q40 -20 30 -56" stroke="#d63b2e" stroke-width="10" fill="none"/><circle cx="30" cy="20" r="22" fill="#e8513f"/><circle cx="210" cy="20" r="22" fill="#e8513f"/><path d="M14 10 l18 12 M226 10 l-18 12" stroke="#fff" stroke-width="5"/>`
      + `<ellipse cx="120" cy="110" rx="78" ry="50" fill="#e8513f"/><path d="M100 64 v-20 M140 64 v-20" stroke="#d63b2e" stroke-width="6"/><circle cx="100" cy="40" r="12" fill="#fff"/><circle cx="140" cy="40" r="12" fill="#fff"/><circle cx="100" cy="42" r="6" fill="#222"/><circle cx="140" cy="42" r="6" fill="#222"/><path d="M104 120 q16 12 32 0" stroke="#7a1a12" stroke-width="5" fill="none"/>`);
    const turtle = svgURL(240, 180, `<ellipse cx="60" cy="140" rx="30" ry="16" fill="#7cc46a"/><ellipse cx="180" cy="140" rx="30" ry="16" fill="#7cc46a"/><ellipse cx="60" cy="50" rx="30" ry="16" fill="#7cc46a"/><ellipse cx="180" cy="50" rx="30" ry="16" fill="#7cc46a"/>`
      + `<ellipse cx="220" cy="95" rx="26" ry="22" fill="#7cc46a"/><circle cx="228" cy="88" r="5" fill="#222"/><ellipse cx="120" cy="95" rx="92" ry="64" fill="#3f8f3a"/>`
      + `<path d="M120 40 l30 22 v38 l-30 22 l-30 -22 v-38 Z" fill="#5bb04f" stroke="#2f6e2b" stroke-width="4"/><path d="M60 70 l30 -8 M60 120 l30 -8 M180 70 l-30 -8 M180 120 l-30 -8" stroke="#2f6e2b" stroke-width="4"/>`);
    const whale = svgURL(520, 300, `<path d="M440 150 q60 -70 76 -40 q-20 30 -60 46 q40 16 60 46 q-16 30 -76 -40 Z" fill="#3a6ea5"/><path d="M40 160 q0 -110 200 -110 q200 0 220 110 q-10 90 -210 90 q-210 0 -210 -90 Z" fill="#4f86c6"/>`
      + `<path d="M50 180 q180 80 400 0 q-20 70 -200 70 q-180 0 -200 -70 Z" fill="#cfe3f5"/><circle cx="130" cy="140" r="12" fill="#1b2a3a"/><path d="M90 200 q40 20 90 0" stroke="#1b2a3a" stroke-width="5" fill="none"/>`
      + `<path d="M210 50 q-10 -30 -30 -40 M210 50 q0 -34 10 -46 M210 50 q12 -30 34 -38" stroke="#9fd3f5" stroke-width="7" fill="none" stroke-linecap="round"/>`);
    const tiny = fish('#ffb703', '#fb8500');
    const sea = () => [shape('rect', 0, 0, 1280, 720, TOP, { fill2: DEEP, gradType: 'linear', gradAngle: 90 }),
      ...[[140, 0.18], [420, 0.12], [760, 0.16], [1040, 0.1]].map(([x, o]) => shape('trapezoid', x, -20, 180, 560, '#ffffff', { opacity: Math.round(o * 100), rotation: 180 })),
      shape('ellipse', -100, 610, 1500, 260, SAND),
      ...[[60, 470, '#2f9e5a'], [120, 520, '#3fbf6e'], [1120, 460, '#2f9e5a'], [1190, 510, '#3fbf6e'], [980, 540, '#5ad08a']].map(([x, y, c]) =>
        shape('custom', x, y, 60, 720 - y, c, { path: 'M40 100 C0 80 70 60 30 40 C0 25 50 10 40 0 C70 10 30 30 60 45 C90 65 30 80 60 100 Z' }))];
    const bubbles = (xs, start = 'afterPrev') => xs.map(([x, y, d], i) => withAnims(shape('ellipse', x, y, d, d, '#ffffff', { opacity: 45, stroke: '#ffffff', strokeWidth: 3 }),
      path([[10, -120], [-10, -240], [6, -y + 40]], { start: i ? 'withPrev' : start, delay: i * 300, duration: 3200 })));
    return numbered(build({ name: 'Bajo el mar', palette: 'ocean', fonts: 'clean', title: { font: H, size: 60, color: W }, body: { color: W } }, [
      { layout: 'blank', back: sea(), transition: 'fade', extra: [
        say('Bajo el mar', 140, 90, 1000, 200, 130, W, H, { fontWeight: 800, curve: 18, wordart: 'shadow' }),
        say('¿Quién vive aquí abajo?', 340, 290, 600, 70, 44, '#e3f6ff', Bd, { fontWeight: 800 }),
        withAnims(img(fish('#ff7b54', '#e0563a'), 60, 400, 200, 128, 'Un pez naranja'), path([[300, -30], [600, 20], [880, -10]], { start: 'afterPrev', duration: 5000 })),
        withAnims(img(fish('#ffd23f', '#f2a300', true), 1040, 500, 140, 90, 'Un pez amarillo'), path([[-300, 20], [-650, -10]], { start: 'withPrev', duration: 5000, delay: 600 })),
        ...bubbles([[300, 600, 30], [330, 560, 18], [900, 620, 26], [940, 580, 16]], 'withPrev')],
        notes: 'Al llegar, dos peces cruzan nadando y suben burbujas (trayectorias). El título es texto curvo, como una ola. Preguntamos: ¿qué animales viven en el mar?' },
      { title: '¿Quién vive en el mar?', layout: 'titleOnly', back: sea(), extra: [
        ...[[fish('#ff7b54', '#e0563a'), 'Pez'], [octopus, 'Pulpo'], [crab, 'Cangrejo'], [turtle, 'Tortuga']].flatMap(([src, n], i) => { const x = 70 + i * 290;
          return [on(shape('rounded', x, 170, 270, 340, '#ffffff', { opacity: 85 }), 'bounce', { sound: 'pop' }), along(img(src, x + 25, 200, 220, 190, n), 'bounce'),
            along(say(n, x, 410, 270, 80, 50, INK, H, { fontWeight: 800 }), 'fade-up')]; })],
        notes: 'Un clic por animal: entra con un «pop». ¿Cuántos brazos tiene el pulpo? ¡Ocho! ¿Y qué lleva la tortuga en la espalda?' },
      { title: 'Grande y pequeño', layout: 'titleOnly', back: sea(), extra: [
        img(whale, 60, 170, 700, 404, 'Una ballena'), img(tiny, 960, 380, 110, 70, 'Un pez pequeñito'),
        on(say('GRANDE', 80, 560, 640, 120, 110, W, H, { fontWeight: 900 }), 'zoom-in', { sound: 'drumroll' }),
        on(say('pequeño', 860, 470, 320, 60, 32, '#ffe9a8', H, { fontWeight: 700 }), 'fade-in', { sound: 'pop' })],
        notes: 'La ballena es el animal más grande del mundo; el pez, pequeñito. Decimos «GRANDE» con voz muy fuerte y «pequeño» con voz muy bajita.' },
      { layout: 'blank', back: sea(), extra: [activity({ kind: 'quiz', question: '¿Cuántos brazos tiene el pulpo?', options: ['4', '6', '8'], correct: [2], time: 30, fontSize: 56, color: W })],
        notes: 'Concurso. Para comprobarlo, volvemos al dibujo del pulpo y contamos sus brazos uno a uno.' },
      { layout: 'blank', bg: '#bfe6ff', back: [shape('rect', 0, 380, 1280, 120, '#3a86d8'), shape('wave', 0, 360, 1280, 50, '#5aa0e8'), shape('rect', 0, 480, 1280, 240, SAND)], extra: [
        say('Cuidamos el mar', 60, 40, 800, 100, 64, INK, H, { fontWeight: 800, textAlign: 'left' }),
        withAnims(m3d('kh-WaterBottle', 120, 380, 160, 260, { autoRotate: false, view: 'front' }), path([[300, -140], [620, -60], [790, 30]], { duration: 2200, sound: 'whoosh' })),
        shape('rounded', 880, 380, 240, 290, '#ffd23f', { stroke: '#d9a800', strokeWidth: 6 }), shape('rounded', 860, 350, 280, 50, '#f2b400'),
        icon('recycle', 940, 470, 120, '#2b2b2b'),
        say('Los envases van al contenedor amarillo', 340, 520, 520, 150, 42, INK, Bd, { fontWeight: 800 }),
        after(say('¡Bien hecho!', 820, 180, 400, 80, 56, '#1d7a44', H, { fontWeight: 900 }), 'zoom-in', { sound: 'applause' })],
        notes: 'Clic: la botella 3D salta de la playa al contenedor amarillo y suenan aplausos. Hablamos de no dejar basura en la playa: los peces la confunden con comida.' },
      { layout: 'blank', back: sea(), extra: [activity({ kind: 'match', question: '¿Qué tiene cada uno?', color: W, options: ['Pulpo = Ocho brazos', 'Cangrejo = Pinzas', 'Tortuga = Caparazón', 'Pez = Aletas y escamas'] })],
        notes: 'Unir parejas, todos juntos: la maestra lee y la clase señala.' },
      { layout: 'blank', back: sea(), extra: [activity({ kind: 'word', question: '¿Qué animal del mar te gusta más?', options: [], color: W })],
        notes: 'Nube de palabras: las familias pueden escribir desde casa con el móvil, o la maestra escribe lo que dice cada niño. Los nombres repetidos se ven más grandes.' },
      { layout: 'blank', back: sea(), transition: 'zoom', extra: [
        say('¡Nadamos como peces!', 80, 120, 700, 200, 84, W, H, { fontWeight: 800, textAlign: 'left' }),
        say('Brazos de pulpo, pinzas de cangrejo y aletas de pez… ¡hasta que suene!', 80, 330, 640, 160, 40, '#e3f6ff', Bd, { fontWeight: 700, textAlign: 'left' }),
        timer(60, 830, 140, 340, { color: '#ffd23f', endText: '¡A la orilla!' }),
        ...bubbles([[860, 560, 28], [1100, 600, 20], [980, 590, 16]])],
        notes: 'Un minuto de movimiento: imitamos a los animales del mar. Cuenta atrás con sonido al terminar.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · A trip to the Moon in a night sky: a rocket of our own that takes off, a countdown, the Moon going
  // round the Earth, day and night, an astronaut and the lunar module from NASA in 3D, the phases drawn and a quiz.
  edu_kids_space: { name: 'Viaje a la Luna', cat: 'edu', summary: 'Cielo nocturno: cohete que despega con sonido, cuenta atrás, Luna que gira alrededor de la Tierra, fases, astronauta y módulo lunar 3D', make: () => {
    const NIGHT = '#0d1033', INK = '#ffffff', Y = '#ffd84a', MOON = '#e6e3d8', R = '#ff5a5f', H = FF.space, Bd = FF.nunito;
    const stars = (n = 40, seed = 7) => Array.from({ length: n }, (_, i) => { const x = (i * 211 + seed * 37) % 1260 + 10, y = (i * 137 + seed * 91) % 700 + 10, d = 4 + (i % 4) * 3;
      return i % 6 ? shape('ellipse', x, y, d, d, '#ffffff', { opacity: 40 + (i % 5) * 12 }) : shape('star4', x, y, d * 3, d * 3, Y, { opacity: 80 }); });
    const rocket = svgURL(160, 300, `<path d="M80 6 C130 50 134 150 120 210 H40 C26 150 30 50 80 6 Z" fill="#f4f4f8" stroke="#c9c9d6" stroke-width="4"/><path d="M80 6 C100 22 112 44 118 64 H42 C48 44 60 22 80 6 Z" fill="${R}"/>`
      + `<circle cx="80" cy="118" r="26" fill="#6ec3ff" stroke="#3a5a8a" stroke-width="7"/><path d="M40 160 L6 230 L40 214 Z M120 160 L154 230 L120 214 Z" fill="${R}"/><rect x="58" y="208" width="44" height="22" rx="6" fill="#8a8aa0"/>`
      + `<path d="M62 232 Q80 300 98 232 Z" fill="#ffb02e"/><path d="M70 232 Q80 270 90 232 Z" fill="#fff17a"/>`);
    const moonFace = (x, y, d) => [shape('ellipse', x, y, d, d, MOON, { shadow: { x: 0, y: 0, blur: 50, color: '#fff6c8' } }),
      ...[[0.2, 0.25, 0.18], [0.55, 0.15, 0.12], [0.62, 0.55, 0.22], [0.25, 0.62, 0.12], [0.45, 0.42, 0.08]].map(([a, b, c]) => shape('ellipse', x + a * d, y + b * d, c * d, c * d, '#c9c4b4'))];
    return numbered(build({ name: 'Viaje a la Luna', palette: 'midnight', fonts: 'tech', title: { font: H, size: 60, color: Y }, body: { color: INK } }, [
      { layout: 'blank', bg: NIGHT, back: [...stars(), glow(780, -200, 800, '#2a2f6b', NIGHT, 80)], transition: 'fade', extra: [
        ...moonFace(880, 70, 300),
        say('¡Viaje a la Luna!', 70, 170, 700, 220, 96, INK, H, { fontWeight: 700, textAlign: 'left', wordart: 'neon', wordartColor: '#7aa2f7', lineHeight: 1.05 }),
        say('Abrochaos el cinturón, astronautas', 70, 410, 640, 60, 36, '#c9d3ff', Bd, { fontWeight: 700, textAlign: 'left' }),
        withAnims(img(rocket, 160, 470, 110, 206, 'Un cohete', { rotation: 35 }), path([[180, -120], [420, -260], [640, -330]], { start: 'afterPrev', duration: 3000, sound: 'whoosh' }))],
        notes: 'Al llegar, el cohete despega hacia la Luna con un silbido (trayectoria). El título brilla como un neón. ¿Quién ha visto la Luna esta semana?' },
      { title: 'Cuenta atrás para despegar', layout: 'titleOnly', bg: NIGHT, back: stars(30, 3), extra: [
        shape('rect', 0, 640, 1280, 80, '#2b2f55'), shape('rect', 300, 300, 30, 340, '#6b6f93'), shape('rect', 300, 380, 120, 16, '#6b6f93'),
        withAnims(img(rocket, 400, 260, 200, 380, 'El cohete en la plataforma'), path([[0, -300], [0, -620]], { duration: 2200, sound: 'whoosh' })),
        timer(10, 760, 190, 400, { style: 'digital', color: Y, endText: '¡Despegue!' }),
        say('Contamos todos juntos… y al llegar a cero, ¡clic!', 700, 520, 520, 100, 34, '#c9d3ff', Bd, { fontWeight: 700 })],
        notes: 'La cuenta atrás empieza sola. La clase cuenta en voz alta del 10 al 0 y, al terminar, un clic hace despegar el cohete.' },
      { title: 'La Luna da vueltas a la Tierra', layout: 'titleOnly', bg: NIGHT, back: stars(30, 5), extra: [
        shape('sun', -160, 160, 420, 420, '#ffc23a'), say('Sol', 20, 590, 200, 60, 36, Y, H, { fontWeight: 700 }),
        shape('ellipse', 520, 230, 280, 280, '#2f7de1'), shape('cloud', 560, 260, 120, 70, '#3fbf6e'), shape('cloud', 660, 380, 110, 80, '#3fbf6e'), shape('cloud', 590, 420, 70, 40, '#ffffff', { opacity: 70 }),
        say('Tierra', 560, 520, 200, 60, 36, '#9fd0ff', H, { fontWeight: 700 }),
        shape('ellipse', 400, 110, 520, 520, 'none', { stroke: '#ffffff', strokeWidth: 2, dash: 'dash', opacity: 40 }),
        withAnims(shape('ellipse', 860, 340, 80, 80, MOON), path(Array.from({ length: 13 }, (_, i) => { const a = i / 12 * Math.PI * 2; return [Math.round(-260 + 260 * Math.cos(a)), Math.round(-260 * Math.sin(a))]; }), { duration: 6000 })),
        say('Luna', 960, 350, 200, 60, 36, MOON, H, { fontWeight: 700, textAlign: 'left' })],
        notes: 'Clic: la Luna da una vuelta completa alrededor de la Tierra (trayectoria circular). El Sol nos da luz y calor; la Tierra es nuestra casa.' },
      { layout: 'blank', bg: '#8fd3ff', extra: [
        shape('rect', 640, 0, 640, 720, NIGHT), ...stars(14, 9).map(b => ({ ...b, x: 660 + (b.x % 600) })),
        shape('sun', 200, 80, 240, 240, '#ffc23a'), ...moonFace(880, 90, 220),
        shape('rect', 0, 560, 640, 160, '#7cc46a'), shape('rect', 640, 560, 640, 160, '#1d3a2a'),
        say('De día', 40, 360, 560, 100, 80, '#1d3a6e', H, { fontWeight: 700 }), say('jugamos y vamos al cole', 40, 450, 560, 60, 36, '#1d3a6e', Bd, { fontWeight: 800 }),
        say('De noche', 680, 360, 560, 100, 80, Y, H, { fontWeight: 700 }), say('cenamos y dormimos', 680, 450, 560, 60, 36, '#ffffff', Bd, { fontWeight: 800 }),
        on(icon('moon', 1150, 590, 80, Y), 'jump', { sound: 'chime' })],
        notes: 'El día y la noche, lado a lado. ¿Qué hacemos de día? ¿Y de noche? Clic: la luna pequeña salta con una campanilla, es hora de dormir.' },
      { title: 'Así viste un astronauta', layout: 'titleOnly', bg: NIGHT, back: [...stars(30, 11), glow(330, 120, 620, '#2a2f6b', NIGHT, 80)], extra: [
        nasa('astronaut', 380, 140, 520, 540, { autoRotate: true, view: 'front', caption: '' }),
        ...[['Casco', 'para respirar y ver', 60, 200], ['Guantes', 'para no tener frío', 60, 420], ['Mochila', 'con aire dentro', 940, 200], ['Botas', 'para pisar la Luna', 940, 420]].map(([t, d, x, y]) =>
          on(card(`<div style="font-size:40px;font-weight:700;color:${Y}">${t}</div><div>${d}</div>`, x, y, 280, 170, '#ffffff14', { fontFamily: H, fontSize: 28, color: INK }), 'zoom-in', { sound: 'pop' })),
        text('Modelo 3D: Astronaut — NASA', 60, 668, 600, 36, { fontSize: 12, color: '#9aa3c9' })],
        notes: 'Un astronauta en 3D de la NASA que gira. Cada clic muestra una pieza del traje. En la Luna no hay aire: por eso llevan el casco y la mochila.' },
      { title: 'La Luna cambia de forma', layout: 'titleOnly', bg: NIGHT, back: stars(30, 13), extra: [
        ...[0, 1, 2, 3].flatMap(i => { const x = 90 + i * 290, y = 230, d = 200;
          const shp = [shape('ellipse', x, y, d, d, MOON), shape('custom', x, y, d, d, MOON, { path: 'M50 0 A50 50 0 0 1 50 100 Z' }), shape('moon', x + 30, y, d - 30, d, MOON),
            shape('ellipse', x, y, d, d, '#1a1f4a', { stroke: '#4a5090', strokeWidth: 3, dash: 'dash' })][i];
          return [shape('ellipse', x, y, d, d, '#1a1f4a'), on(shp, 'zoom-in', { sound: 'chime' }), along(say(['Llena', 'Media', 'Menguante', 'Nueva'][i], x - 30, 470, d + 60, 70, 42, INK, H, { fontWeight: 700 }), 'fade-up')]; })],
        notes: 'Un clic por forma. La Luna no cambia de verdad: vemos más o menos parte iluminada por el Sol. Durante un mes podemos dibujarla cada noche en un calendario.' },
      { layout: 'blank', bg: NIGHT, extra: [activity({ kind: 'quiz', question: '¿Quién da vueltas alrededor de la Tierra?', options: ['El Sol', 'La Luna', 'Una nube'], correct: [1], time: 30, fontSize: 52, color: INK })],
        notes: 'Concurso. Recordamos la diapositiva de la Luna dando vueltas a la Tierra.' },
      { title: '¡Hemos llegado!', layout: 'titleOnly', bg: NIGHT, back: [...stars(30, 17), shape('ellipse', -200, 520, 1700, 500, '#b9b5a6'),
        ...[[180, 590, 140], [700, 620, 90], [1000, 570, 160]].map(([x, y, d]) => shape('ellipse', x, y, d, d * 0.35, '#9d9989'))], extra: [
        shape('ellipse', 1040, 120, 140, 140, '#2f7de1'), shape('cloud', 1060, 150, 70, 44, '#3fbf6e'),
        nasa('apollo-lunar-module', 380, 170, 520, 420, { autoRotate: true, view: 'three', caption: '' }),
        shape('rect', 160, 360, 8, 240, '#dcdcdc'), shape('rect', 168, 360, 140, 90, R), shape('star', 210, 380, 50, 50, '#ffffff'),
        on(say('¡Un pequeño salto!', 860, 300, 380, 140, 56, Y, H, { fontWeight: 700 }), 'zoom-in', { sound: 'applause' }),
        text('Modelo 3D: Apollo Lunar Module — NASA', 60, 668, 600, 36, { fontSize: 12, color: '#3a3a3a' })],
        notes: 'El módulo lunar 3D de la NASA gira sobre la superficie de la Luna; al fondo, la Tierra. Clic: aplausos, ¡misión cumplida! Cada niño dibuja su bandera.' },
    ]));
  } },

};
