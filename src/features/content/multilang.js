// Two example presentations in eleven languages (File ▸ Examples), each with 3D and animations, made to show the
// multilingual presentations (features/document/languages.js): their texts' table is multilang-texts.js, loaded only
// when one of them is opened, and opened in another language, that one is their original (rebase) and the rest stay
// in the table — Ver ▸ Idiomas shows it, and a student opening the link sees it in theirs.
//   telescopes — NASA's Hubble and Webb in 3D, a path from the Earth to L2, Transform, a slide below and a poll.
//   storyrobot — a tale: a robot, a fox and a mage that walk in, wave and talk in bubbles that appear one by one.

import { A, build, card, glow, icon, model, nasa, numbered, path, shape, text, withAnims, uid, pollBlock, lib3d } from './templates/kit.js';

// (The 3D models' authors — the fox's licence, CC BY 4.0, asks for it —, the same in every language.)
export const CREDITS = '3D: Robot — Tomás Laulhé (CC0) · Fox — PixelMannen (CC0), tomkranis (CC BY 4.0) · Mage — KayKit (CC0)';
const kicker = (s, x, y, w, color) => text(s, x, y, w, 40, { fontSize: 20, letterSpacing: 5, fontWeight: 700, color });
const bubble = (kind, html, x, y, w, h, props = {}) => shape(kind, x, y, w, h, '#ffffff', { stroke: '#2b2d42', strokeWidth: 3, html, fontSize: 26, color: '#2b2d42', fontWeight: 700, ...props });

export const EXAMPLES_ML = {
  telescopes: { name: 'Telescopios espaciales: de Hubble a Webb', cat: 'sci', summary: 'En 11 idiomas: telescopios 3D de la NASA, el viaje a L2 animado, Transformar, una diapositiva debajo para profundizar y votación', make: () => {
    const BG = '#070b1a', GOLD = '#f5c451', SKY = '#8fb8ff', webb = uid(), ttl = uid();
    const stars = [[90, 80], [260, 150], [470, 60], [640, 130], [1180, 90], [1010, 210], [820, 50], [60, 420], [1220, 520], [330, 640]]
      .map(([x, y], i) => shape('star4', x, y, 8 + (i % 3) * 5, 8 + (i % 3) * 5, '#ffffff', { opacity: 55 }));
    return numbered(build({ name: 'Telescopios espaciales: de Hubble a Webb', palette: 'midnight', fonts: 'modern', title: { color: '#f2f5fa' },
      decor: p => [shape('rect', 0, 712, 1280, 8, GOLD, { fill2: SKY, gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        ...stars, glow(820, -200, 760, '#3b4fd8', BG, 40),
        kicker('CIENCIAS · EL UNIVERSO', 90, 150, 600, GOLD),
        { ...text('Ojos en el espacio', 84, 190, 680, 220, { fontSize: 104, fontWeight: 800, color: '#ffffff', lineHeight: 1 }), id: ttl, animation: A('zoom-in', { duration: 900 }) },
        { ...text('De Hubble a Webb: cómo vemos el universo', 90, 430, 620, 100, { fontSize: 34, color: SKY }), animation: A('fade-up', { start: 'afterPrev' }) },
        { ...nasa('james-webb-space-telescope-a', 700, 110, 540, 500, { caption: '', alt: 'El telescopio espacial James Webb en 3D', autoRotate: false, view: 'three', motion: 'orbit', edge: 'fade' }), id: webb }],
        notes: 'El telescopio James Webb en 3D (NASA): da una vuelta al entrar y se puede girar con el ratón.' },
      { title: '¿Por qué subirlo al espacio?', layout: 'titleOnly', bg: BG, extra: [
        ...[['cloud', 'Sin aire que tiemble', 'La atmósfera desenfoca las estrellas: allí arriba la imagen es nítida.'],
          ['sun', 'Luz que no llega al suelo', 'El aire bloquea casi todo el infrarrojo y el ultravioleta.'],
          ['clock', 'Día y noche, todo el año', 'Sin nubes ni amaneceres: puede observar sin parar.']]
          .flatMap(([ic, h, tx], i) => [{ ...card(`<b>${h}</b><br>${tx}`, 90 + i * 380, 270, 340, 250, '#ffffff12', { fontSize: 28, color: '#e8ecf6' }), animation: A('fade-up') },
            { ...icon(ic, 120 + i * 380, 190, 70, GOLD), animation: A('zoom-in', { start: 'withPrev' }) }])],
        notes: 'Cada tarjeta aparece con un clic. Pregunta antes: ¿por qué las estrellas parpadean?' },
      { title: 'Hubble: 35 años mirando', layout: 'titleOnly', bg: BG, extra: [
        nasa('hubble-space-telescope-a', 70, 150, 480, 480, { caption: '', alt: 'El telescopio espacial Hubble en 3D', autoRotate: false, view: 'three', motion: 'float', edge: 'fade' }),
        ...[['1990', 'puesto en órbita'], ['547 km', 'sobre la Tierra'], ['2,4 m', 'de espejo']].map(([n, l], i) =>
          ({ ...text(`<span style="color:${GOLD};font-weight:800">${n}</span><br>${l}`, 640 + (i % 2) * 300, 190 + Math.floor(i / 2) * 210, 280, 170, { fontSize: 34, color: '#e8ecf6', textAlign: 'center' }), animation: A('zoom-in', { start: i ? 'afterPrev' : 'click' }) }))],
        notes: 'El Hubble flota en el espacio. Las cifras entran una tras otra con un solo clic.' },
      { title: 'Webb: un espejo de oro', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        { ...nasa('james-webb-space-telescope-a', 600, 120, 640, 560, { caption: '', alt: 'El telescopio espacial James Webb en 3D', autoRotate: true, view: 'three', edge: 'fade' }), id: webb },
        { ...text('<ul><li>Lanzado en 2021</li><li>Un espejo de 6,5 m hecho de 18 hexágonos</li><li>Ve en infrarrojo: atraviesa el polvo</li></ul>', 90, 200, 520, 300, { fontSize: 30, color: '#e8ecf6' }), animation: A('fade-right') }],
        notes: 'Transformar: el Webb de la portada llega aquí más grande. Si preguntan cómo cabe en un cohete, baja (↓): está debajo.' },
      { title: 'Así se despliega', layout: 'titleOnly', bg: BG, vertical: true, autoAnimate: true, extra: [
        { ...nasa('james-webb-space-telescope-a', 900, 330, 330, 330, { caption: '', alt: 'El telescopio espacial James Webb en 3D', autoRotate: true, view: 'three', edge: 'fade' }), id: webb },
        ...['Viaja plegado dentro del cohete', 'Abre el parasol: del tamaño de una pista de tenis', 'Despliega el espejo secundario y las alas', 'Alinea sus 18 espejos con precisión de nanómetros']
          .map((s, i) => ({ ...card(`<b>${i + 1}</b> · ${s}`, 90, 190 + i * 118, 760, 96, '#ffffff14', { fontSize: 26, color: '#e8ecf6' }), animation: A('fade-left') }))],
        notes: 'Diapositiva debajo de la anterior: solo si hace falta. Cuatro clics, un paso cada uno. Vuelve arriba (↑) para seguir.' },
      { title: 'Un viaje de 1,5 millones de km', layout: 'titleOnly', bg: BG, extra: [
        shape('ellipse', 110, 330, 170, 170, '#2e6fd8', { fill2: '#0b2a63', gradType: 'radial' }),
        text('Tierra', 110, 510, 170, 40, { fontSize: 24, textAlign: 'center', color: SKY }),
        shape('ellipse', 1050, 380, 70, 70, 'none', { stroke: GOLD, strokeWidth: 3, dash: 'dash' }),
        text('Punto L2', 990, 460, 190, 40, { fontSize: 24, textAlign: 'center', color: GOLD }),
        withAnims(icon('rocket', 260, 360, 64, '#ffffff'), path([[220, -150], [520, -170], [800, 40]], { duration: 4000, turn: 'follow' })),
        { ...text('Allí la Tierra, la Luna y el Sol quedan siempre detrás de su parasol: el telescopio está a la sombra y muy frío.', 300, 560, 880, 100, { fontSize: 26, color: '#e8ecf6' }), animation: A('fade-up', { start: 'afterPrev' }) }],
        notes: 'Clic: el cohete sigue un recorrido curvo y gira hacia donde va.' },
      { title: 'La luz es una máquina del tiempo', layout: 'titleOnly', bg: BG, extra: [
        ...[['El Sol', '8 minutos'], ['Andrómeda', '2,5 millones de años'], ['Las galaxias de Webb', 'más de 13.000 millones de años']].map(([w, d], i) =>
          ({ ...card(`<b>${w}</b><br><span style="color:${GOLD}">${d}</span>`, 90 + i * 380, 220, 340, 220, '#ffffff12', { fontSize: 28, color: '#e8ecf6', textAlign: 'center' }), animation: A('fade-up') })),
        { ...text('Lo que vemos es la luz que salió hace tanto tiempo: cuanto más lejos miramos, más atrás en el tiempo.', 90, 500, 1100, 110, { fontSize: 30, color: '#ffffff', textAlign: 'center' }), animation: A('fade-in', { start: 'afterPrev' }) }],
        notes: 'Tres clics: cada distancia con lo que tarda su luz en llegarnos.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 34, question: '¿Qué te gustaría que observara Webb?', options: ['Planetas con agua', 'Agujeros negros', 'Las primeras galaxias', 'Nuestro sistema solar'], x: 80, y: 60, w: 1120, h: 600, color: '#f2f5fa' })],
        notes: 'Votación en directo: escanean el QR con el móvil y el gráfico crece al momento.' },
      { layout: 'section', bg: BG, title: '¿Preguntas?', subtitle: 'Modelos 3D: NASA 3D Resources', extra: [{ ...shape('star4', 600, 520, 80, 80, GOLD), animation: A('spin', { duration: 1400 }) }] },
    ]));
  } },

  storyrobot: { name: 'Cuento: el robot que quería hablar con todos', cat: 'edu', summary: 'En 11 idiomas: personajes 3D que entran andando, saludan y hablan en bocadillos que aparecen uno a uno, y una nube de palabras', make: () => {
    const robot = lib3d('three-RobotExpressive'), fox = lib3d('kh-Fox'), mage = lib3d('kk-Mage');
    const SKYC = '#bfe3f5', GRASS = '#7cc36a', INK = '#2b2d42';
    const scene = () => [shape('rect', 0, 520, 1280, 200, GRASS), shape('ellipse', 1040, 50, 150, 150, '#ffd166'), shape('cloud', 160, 70, 220, 110, '#ffffff', { opacity: 90 })];
    const narr = (html, props = {}) => card(html, 60, 40, 760, 120, '#ffffffd9', { fontSize: 28, color: INK, ...props });
    return numbered(build({ name: 'Cuento: el robot que quería hablar con todos', palette: 'warm', fonts: 'friendly', title: { color: INK } }, [
      { layout: 'blank', bg: SKYC, transition: 'zoom', extra: [
        ...scene(),
        { ...text('El robot que quería hablar con todos', 70, 150, 640, 260, { fontSize: 66, fontWeight: 800, color: INK, lineHeight: 1.05 }), animation: A('zoom-in', { duration: 800 }) },
        { ...text('Un cuento para leer en tu idioma', 70, 420, 600, 60, { fontSize: 32, color: '#3d5a80' }), animation: A('fade-up', { start: 'afterPrev' }) },
        model('three-RobotExpressive', 780, 130, 380, 470, { clip: 'Wave', alt: 'Robo, el robot' })],
        notes: 'Arriba a la derecha de la vista compartida, cada alumno elige su idioma.' },
      { layout: 'blank', bg: SKYC, extra: [
        ...scene(), narr('Había una vez un robot llamado Robo. Le encantaba saludar a todo el mundo.'),
        withAnims(model('three-RobotExpressive', -40, 220, 280, 360, { alt: 'Robo, el robot', walk: { clip: robot.walk, face: true, look: true } }),
          path([[420, 0]], { duration: 2600 }), A('clip3d', { clip: 'Wave', once: true, start: 'afterPrev', duration: 2000 })),
        { ...bubble('speechround', '¡Hola! ¿Quieres jugar?', 600, 200, 330, 150), animation: A('zoom-in', { start: 'afterPrev' }) }],
        notes: 'Clic: Robo entra andando, saluda y dice hola.' },
      { layout: 'blank', bg: SKYC, extra: [
        ...scene(), narr('Una zorra se acercó, pero no entendía a Robo: hablaba otra lengua.'),
        withAnims(model('kh-Fox', 1300, 290, 420, 300, { alt: 'La zorra', caption: '', view: 'three', walk: { clip: fox.walk, face: true, look: true } }),
          path([[-560, 0]], { duration: 3000 })),
        { ...bubble('speech', '?', 980, 190, 160, 120, { fontSize: 60 }), animation: A('zoom-in', { start: 'afterPrev' }) },
        withAnims(model('three-RobotExpressive', 380, 220, 280, 360, { alt: 'Robo, el robot', clip: 'Idle' }), A('clip3d', { clip: 'No', once: true, start: 'click', duration: 1800 }))],
        notes: 'La zorra llega andando… y no se entienden. Otro clic: Robo niega con la cabeza.' },
      { layout: 'blank', bg: SKYC, extra: [
        ...scene(), narr('Entonces llegó una maga sabia.'),
        model('three-RobotExpressive', 300, 220, 260, 340, { alt: 'Robo, el robot', clip: 'Idle' }), model('kh-Fox', 560, 300, 400, 290, { alt: 'La zorra', caption: '', view: 'three', clip: fox.rest }),
        withAnims(model('kk-Mage', 1300, 200, 260, 360, { alt: 'La maga', walk: { clip: mage.walk, end: mage.arrive, endOnce: true, face: true, look: true } }),
          path([[-380, 0]], { duration: 2600 })),
        { ...bubble('speechround', 'Escuchar con atención es la primera lengua de todos.', 820, 170, 400, 170, { fontSize: 24 }), animation: A('zoom-in', { start: 'afterPrev' }) }],
        notes: 'La maga entra andando y lo celebra al llegar.' },
      { title: 'Aprendieron sus palabras', layout: 'titleOnly', bg: SKYC, extra: [
        ...[['Hola', 'waving_hand'], ['Gracias', 'favorite'], ['Amigo', 'groups'], ['Jugamos', 'sports_esports']].map(([w, ic], i) =>
          ({ ...card(`<b>${w}</b>`, 90 + i * 285, 260, 250, 160, '#ffffff', { fontSize: 40, color: INK, textAlign: 'center', vAlign: 'middle' }), animation: A('bounce') })),
        text('Cada uno enseñó sus palabras a los demás.', 90, 480, 1100, 60, { fontSize: 30, color: INK, textAlign: 'center' })],
        notes: 'Cuatro clics, una palabra cada uno. Pregunta cómo se dice cada una en las lenguas de la clase.' },
      { layout: 'blank', bg: SKYC, extra: [
        ...scene(), narr('Y desde ese día, los tres jugaron juntos cada tarde.'),
        withAnims(model('three-RobotExpressive', 250, 210, 290, 370, { alt: 'Robo, el robot', clip: 'Idle' }), A('clip3d', { clip: 'Dance', start: 'click', duration: 4000 })),
        withAnims(model('kk-Mage', 600, 210, 260, 360, { alt: 'La maga', clip: 'Idle' }), A('clip3d', { clip: mage.arrive, start: 'withPrev', duration: 3000 })),
        model('kh-Fox', 860, 300, 400, 290, { alt: 'La zorra', caption: '', view: 'three', clip: fox.rest }),
        { ...bubble('speechround', '¡Ahora hablamos con todos!', 860, 170, 340, 150), animation: A('zoom-in', { start: 'withPrev' }) }],
        notes: 'Clic: Robo baila y la maga lo celebra.' },
      { layout: 'blank', bg: SKYC, extra: [pollBlock({ kind: 'word', fontSize: 34, question: '¿Cómo se dice «hola» en tu idioma?', options: [], x: 80, y: 60, w: 1120, h: 600, color: INK })],
        notes: 'Nube de palabras: cada alumno escribe «hola» en su lengua desde el móvil.' },
      { layout: 'blank', bg: SKYC, extra: [...scene(),
        { ...text('Fin', 90, 170, 800, 160, { fontSize: 110, fontWeight: 800, color: INK }), animation: A('zoom-in') },
        text('¿Qué otras palabras te gustaría enseñar?', 90, 340, 800, 70, { fontSize: 34, color: '#3d5a80' }),
        model('three-RobotExpressive', 960, 200, 260, 340, { alt: 'Robo, el robot', clip: 'ThumbsUp' }),
        text(CREDITS, 90, 650, 1100, 40, { fontSize: 14, color: '#2b2d42', opacity: 80 })] },
    ]));
  } },
};

// Their texts in the other ten languages (multilang-texts.js), on the deck: { base: 'es', langs, texts }.
export async function withTexts(key, deck) {
  const all = (await import('./multilang-texts.js')).default, texts = all[key] || {};
  deck.i18n = { base: 'es', langs: Object.keys(texts), texts, force: null };
  return deck;
}
