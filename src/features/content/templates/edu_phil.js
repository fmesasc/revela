// Example presentations: Filosofía y ética. Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Ideas grandes con esquemas, dibujos propios (SVG como data URL; nada de imágenes externas), votaciones para los
// dilemas y un cierre que invita a pensar. Dilemas y ética de la IA: se plantean posturas sin adoctrinar.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d, deep } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 34, x: 70, y: 60, w: 1140, h: 600, ...props });
const vote = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, ...props });
const FF = { mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif", serif: "'Fraunces', Georgia, serif", bebas: "'Bebas Neue', sans-serif" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// Two-by-two cards from [title, desc, color] rows; returns an array to spread into extra.
const gridCards = (items, { x0 = 90, y0 = 210, dx = 575, dy = 200, w = 525, h = 170, bg = '#ffffff', color = '#1a2233', ts = 27, ds = 22 }) =>
  items.map(([t, d, col], i) => { const x = x0 + (i % 2) * dx, y = y0 + Math.floor(i / 2) * dy;
    return on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${color}">${d}</span>`, x, y, w, h, bg, { color, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up'); });
// A thinking head with a big question mark.
const headThink = (acc) => svgURL(300, 330, `<path d="M70 318 Q40 175 120 102 Q205 28 255 112 Q290 175 252 245 Q247 282 258 318 Z" fill="#e8ecf5" stroke="#9aa7bd" stroke-width="4"/>`
  + `<text x="168" y="214" font-family="Georgia, serif" font-size="128" font-weight="700" fill="${acc}" text-anchor="middle">?</text>`);
// A stylized classical bust on a pedestal.
const bust = (robe = '#cbd5e1', hair = '#8a7d6b') => svgURL(220, 310, `<rect x="72" y="256" width="76" height="40" fill="#9aa3b2"/><rect x="54" y="246" width="112" height="16" rx="4" fill="#b4bcc9"/>`
  + `<path d="M70 246 Q70 156 110 156 Q150 156 150 246 Z" fill="${robe}"/>`
  + `<circle cx="110" cy="124" r="46" fill="#e9d8c3"/>`
  + `<path d="M62 126 Q58 64 110 66 Q162 64 158 126 Q158 100 110 100 Q62 100 62 126" fill="${hair}"/>`
  + `<circle cx="95" cy="122" r="5" fill="#4a3f33"/><circle cx="125" cy="122" r="5" fill="#4a3f33"/>`
  + `<path d="M96 144 Q110 153 124 144" stroke="#8a7d6b" stroke-width="3" fill="none"/>`);
// A balance (scales of justice), beam tilted `tilt` degrees.
const scales = (tilt = 0) => svgURL(360, 300, `<rect x="172" y="74" width="16" height="188" fill="#8a7a52"/><rect x="116" y="258" width="128" height="16" rx="6" fill="#8a7a52"/>`
  + `<g transform="rotate(${tilt} 180 76)"><rect x="56" y="70" width="248" height="12" rx="6" fill="#c9a84a"/>`
  + `<line x1="80" y1="78" x2="80" y2="124" stroke="#c9a84a" stroke-width="3"/><line x1="280" y1="78" x2="280" y2="124" stroke="#c9a84a" stroke-width="3"/>`
  + `<path d="M48 124 h64 l-12 36 h-40 Z" fill="#e0c565"/><path d="M248 124 h64 l-12 36 h-40 Z" fill="#e0c565"/></g>`
  + `<circle cx="180" cy="76" r="10" fill="#9a8438"/>`);
// A trolley on tracks that fork. Five figures on the upper branch, one on the lower.
const trolley = () => svgURL(470, 280, `<line x1="20" y1="150" x2="210" y2="150" stroke="#8795ad" stroke-width="9"/>`
  + `<path d="M210 150 L450 104" stroke="#8795ad" stroke-width="9" fill="none"/><path d="M210 150 L450 206" stroke="#8795ad" stroke-width="9" fill="none"/>`
  + [0, 1, 2, 3, 4].map(i => `<circle cx="${300 + i * 32}" cy="${120 - i * 6}" r="9" fill="#e07a5f"/>`).join('')
  + `<circle cx="360" cy="198" r="9" fill="#5fd38a"/>`
  + `<rect x="44" y="108" width="120" height="58" rx="8" fill="#d84b3f"/><rect x="150" y="120" width="18" height="30" fill="#b53a30"/>`
  + `<circle cx="74" cy="176" r="16" fill="#2a2a2a"/><circle cx="134" cy="176" r="16" fill="#2a2a2a"/>`);
// Plato's cave: a fire, a wall, seated prisoners and a shadow.
const cave = () => svgURL(470, 300, `<circle cx="66" cy="168" r="24" fill="#f2a33c"/><ellipse cx="66" cy="168" rx="70" ry="120" fill="#f2a33c" opacity="0.18"/>`
  + `<rect x="168" y="70" width="12" height="180" fill="#5a4a36"/>`
  + `<rect x="318" y="96" width="70" height="150" rx="8" fill="#2a2016"/><circle cx="353" cy="124" r="20" fill="#3b2f22"/>`
  + `<path d="M404 250 l34 -70 l34 70 Z" fill="#4a3a28" opacity="0.8"/>`, '#161108');
// A broken chain: three links, the middle one snapped.
const chain = () => svgURL(360, 190, `<g fill="none" stroke="#c9a84a" stroke-width="14"><ellipse cx="78" cy="96" rx="34" ry="24"/><ellipse cx="282" cy="96" rx="34" ry="24"/></g>`
  + `<path d="M150 96 l26 -20 m-26 20 l26 20 m32 -20 l-26 -20 m26 20 l-26 20" stroke="#e07a5f" stroke-width="9" fill="none" stroke-linecap="round"/>`);
// A simple robot head.
const robot = (acc = '#5aa7f0') => svgURL(300, 300, `<line x1="150" y1="58" x2="150" y2="92" stroke="#9aa7bd" stroke-width="5"/><circle cx="150" cy="50" r="10" fill="${acc}"/>`
  + `<rect x="68" y="92" width="164" height="140" rx="22" fill="#dbe3ef" stroke="#9aa7bd" stroke-width="4"/>`
  + `<circle cx="116" cy="150" r="19" fill="${acc}"/><circle cx="184" cy="150" r="19" fill="${acc}"/>`
  + `<rect x="110" y="194" width="80" height="14" rx="7" fill="#8a97ad"/>`);

export default {

  // 1 · ¿Qué es la filosofía? Aprender a preguntarse por todo.
  edu_phil_what: { name: 'Filosofía: el arte de preguntar', cat: 'edu', summary: 'Qué es la filosofía y para qué sirve: el amor a la sabiduría, las grandes preguntas, las ramas (metafísica, ética, lógica…), opinar frente a argumentar y una votación para reconocer una pregunta filosófica', make: () => {
    const PAPER = '#f4f2ee', INK = '#20242e', AC = '#9a5bd0', TE = '#1f8f8f', AM = '#d79b2b', GR = '#2e9e6b', GREY = '#5f6678', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Filosofía: el arte de preguntar', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -130, 560, AC, PAPER, 14), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('FILOSOFÍA · PARA EMPEZAR', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: AC, fontWeight: 700 }),
        text('El arte de<br>preguntar', 84, 196, 720, 200, { fontSize: 82, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: SE }),
        text('La filosofía no empieza con respuestas, sino con buenas preguntas sobre lo que damos por supuesto.', 90, 440, 680, 110, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(headThink(AC), 900, 170, 300, 330, 'Una cabeza pensando, con un gran signo de interrogación'), 'zoom-in', { duration: 800 })],
        notes: 'Arranque: todos hacemos filosofía cuando preguntamos «¿por qué?». Hoy vemos qué es y para qué sirve.' },
      { title: '¿Qué significa la palabra?', layout: 'titleOnly', bg: PAPER, extra: [
        text('<b style="color:' + AC + '">Filo-</b> = amor &nbsp;·&nbsp; <b style="color:' + TE + '">-sofía</b> = sabiduría', 90, 210, 1100, 80, { fontSize: 40, color: INK, textAlign: 'center', fontFamily: S }),
        text('«Amor a la sabiduría»: no es saberlo todo, sino <b>querer entender</b>. El filósofo no presume de saber; busca, duda y razona.', 150, 330, 980, 140, { fontSize: 30, color: INK, lineHeight: 1.45, textAlign: 'center' }),
        text('Nació hace unos 2500 años en Grecia, cuando alguien dejó de explicar el mundo con mitos y empezó a buscar razones.', 150, 500, 980, 90, { fontSize: 24, color: GREY, lineHeight: 1.4, textAlign: 'center' })],
        notes: 'Etimología. La idea clave: filosofar es desear entender, no acumular datos. El paso del mito al logos (la razón).' },
      { title: 'Las grandes preguntas', layout: 'titleOnly', bg: PAPER, extra: gridCards([
        ['¿Qué es real?', 'El ser, el tiempo, el universo, Dios…', AC],
        ['¿Qué puedo conocer?', 'La verdad, los sentidos, la razón, la ciencia.', TE],
        ['¿Qué debo hacer?', 'El bien, el deber, la justicia, la libertad.', AM],
        ['¿Qué es el ser humano?', 'La mente, el cuerpo, la muerte, el sentido.', GR]],
        { y0: 205, color: INK }) },
      { title: 'Las ramas de la filosofía', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cards', 'Metafísica — ¿qué existe de verdad?\nEpistemología — ¿cómo conocemos?\nÉtica — ¿cómo debemos actuar?\nLógica — ¿qué razonamientos valen?\nEstética — ¿qué es la belleza y el arte?\nPolítica — ¿cómo vivir juntos?', 90, 185, 1100, 420, { color: INK }),
        text('Todas parten de una pregunta; todas usan la razón para responderla.', 90, 622, 1100, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Mapa de ramas. No hace falta memorizarlas; sí ver que cada una nace de una pregunta distinta.' },
      { title: 'Opinar no es argumentar', layout: 'twoContent', bg: PAPER, extra: [
        on(card('<b style="font-size:30px;color:' + deep(AM, '#fbf3e3') + '">Opinar</b><br><span style="font-size:24px">«A mí me parece…». Vale, pero no convence por sí solo.</span>', 110, 220, 500, 200, '#fbf3e3', { color: INK, radius: 16, borderColor: AM, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card('<b style="font-size:30px;color:' + deep(GR, '#e9f5ee') + '">Argumentar</b><br><span style="font-size:24px">«Pienso X <b>porque</b> Y». Da razones que otro puede examinar.</span>', 660, 220, 500, 200, '#e9f5ee', { color: INK, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('Filosofar es pasar de «lo que me parece» a «las razones que lo sostienen».', 110, 470, 1050, 60, { fontSize: 26, color: INK, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Distinción clave para todo el curso: una opinión se defiende con razones, y las razones se pueden discutir.' },
      { layout: 'blank', bg: PAPER, extra: [vote('¿Cuál de estas es una pregunta FILOSÓFICA?', ['¿Qué hora es?', '¿Cuánto pesa la Luna?', '¿Qué hace que una vida sea buena?', '¿Cuándo llueve mañana?'])],
        notes: 'Votación. Las otras tres las responden un reloj, una báscula o el parte del tiempo; la de la vida buena no tiene respuesta medible: es filosófica.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 430, 520, AC, PAPER, 14)], transition: 'zoom', extra: [
        text('Para pensar en casa', 84, 150, 820, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: SE }),
        text('Elige algo que todo el mundo da por obvio (el tiempo, el dinero, la amistad) y hazle tres «¿por qué?» seguidos. Trae tus preguntas, no las respuestas.', 84, 262, 820, 170, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        after(img(headThink(TE), 940, 180, 280, 310, 'Cabeza pensando'), 'fade-left', { duration: 700 })],
        notes: 'Cierre: la filosofía es un hábito, no una asignatura de memorizar. El reto entrena el preguntar.' },
    ]), INK));
  } },

  // 2 · Los griegos: Sócrates, Platón y Aristóteles.
  edu_phil_greeks: { name: 'Sócrates, Platón y Aristóteles', cat: 'edu', summary: 'Los tres grandes filósofos griegos: el método de Sócrates (preguntar), las ideas de Platón (el mundo de las Ideas) y Aristóteles (observar la realidad), su línea de tiempo y un quiz para distinguirlos', make: () => {
    const BG = '#141019', PANEL = '#221a2c', AC = '#c8a24a', VI = '#b48ce8', TE = '#52c7c0', GR = '#5fd38a', DIM = '#9a8aa8', CREAM = '#f4eefa', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Sócrates, Platón y Aristóteles', palette: 'midnight', fonts: 'editorial', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AC, BG, 24), glow(-120, 560, 520, VI, BG, 18)], extra: [
        text('FILOSOFÍA · GRECIA CLÁSICA', 90, 140, 680, 36, { fontSize: 22, letterSpacing: 4, color: AC, fontWeight: 700 }),
        text('Los tres<br>maestros', 84, 188, 700, 220, { fontSize: 80, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: SE }),
        text('En la Atenas de hace 2400 años, tres hombres encadenados —maestro y discípulo— cambiaron para siempre el modo de pensar.', 90, 452, 640, 130, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
        after(img(bust('#c9b48a', '#6b5c44'), 980, 170, 220, 310, 'Un busto clásico'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: Sócrates enseñó a Platón, y Platón a Aristóteles. Una cadena de ideas.' },
      { title: 'Una cadena de maestros', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', 'Sócrates (470–399 a. C.) — preguntar sin descanso\nPlatón (427–347 a. C.) — el mundo de las Ideas\nAristóteles (384–322 a. C.) — observar la realidad', 90, 220, 1100, 300, { color: CREAM }),
        text('Cada uno fue discípulo del anterior… y acabó llevándole la contraria en algo.', 90, 560, 1100, 50, { fontSize: 23, color: DIM, textAlign: 'center' })],
        notes: 'Línea de tiempo. La relación maestro-discípulo y cómo cada uno superó al anterior.' },
      { title: 'Sócrates: solo sé que no sé nada', layout: 'twoContent', bg: BG, extra: [
        img(bust('#b9c4d6', '#5a5a5a'), 140, 200, 220, 310, 'Busto de Sócrates'),
        text('No escribió nada. Paraba a la gente en la plaza y <b style="color:' + AC + '">preguntaba</b> hasta que veían que no sabían lo que creían saber.', 560, 215, 620, 180, { fontSize: 27, color: CREAM, lineHeight: 1.45 }),
        on(card('La <b>mayéutica</b>: ayudar a «dar a luz» las ideas con preguntas, como una partera.', 560, 410, 620, 130, PANEL, { color: CREAM, radius: 14, borderColor: AC, fontSize: 24, pad: [16, 20, 14, 20] }), 'fade-up')],
        notes: 'Sócrates y el preguntar. La ironía («no sé nada») y la mayéutica. Murió condenado por «corromper a la juventud».' },
      { title: 'Platón: el mundo de las Ideas', layout: 'twoContent', bg: BG, extra: [
        img(bust('#c9b0e0', '#5b4a72'), 140, 200, 220, 310, 'Busto de Platón'),
        text('Lo que vemos son copias imperfectas. Lo de verdad real son las <b style="color:' + VI + '">Ideas</b>: la Belleza, la Justicia, el Bien, perfectas y eternas.', 560, 215, 620, 190, { fontSize: 27, color: CREAM, lineHeight: 1.45 }),
        on(card('Fundó la <b>Academia</b>, la primera «universidad» de Occidente.', 560, 420, 620, 110, PANEL, { color: CREAM, radius: 14, borderColor: VI, fontSize: 24, pad: [16, 20, 14, 20] }), 'fade-up')],
        notes: 'Platón: dos mundos, el sensible (copias) y el inteligible (las Ideas). La Academia.' },
      { title: 'Aristóteles: mirar la realidad', layout: 'twoContent', bg: BG, extra: [
        img(bust('#a9d6cf', '#4a5a52'), 140, 200, 220, 310, 'Busto de Aristóteles'),
        text('Discípulo de Platón, le discutió: lo real no está en otro mundo, está <b style="color:' + TE + '">aquí</b>. Para conocer hay que <b>observar</b> y clasificar.', 560, 215, 620, 190, { fontSize: 27, color: CREAM, lineHeight: 1.45 }),
        on(card('Padre de la lógica y de muchas ciencias. Maestro de Alejandro Magno.', 560, 420, 620, 110, PANEL, { color: CREAM, radius: 14, borderColor: TE, fontSize: 24, pad: [16, 20, 14, 20] }), 'fade-up')],
        notes: 'Aristóteles baja la filosofía a la tierra: observación, clasificación, lógica. Base de la ciencia posterior.' },
      { layout: 'blank', bg: BG, extra: [quiz('«Lo real son las Ideas perfectas, y lo que vemos son copias». ¿De quién es esta idea?', ['De Sócrates', 'De Platón', 'De Aristóteles', 'De los tres'], 1)],
        notes: 'Quiz. La teoría de las Ideas es de Platón. Sócrates preguntaba; Aristóteles observaba lo concreto.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, AC, BG, 30)], transition: 'zoom', extra: [
        text('Tres formas de buscar la verdad', 90, 220, 1100, 120, { fontSize: 50, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: SE, lineHeight: 1.1 }),
        text('Preguntar (Sócrates) · Elevarse a las Ideas (Platón) · Observar el mundo (Aristóteles). Las tres siguen vivas hoy.', 140, 400, 1000, 100, { fontSize: 27, color: DIM, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Cierre: cada método sigue presente en cómo pensamos. Preguntar, idealizar, observar.' },
    ]), CREAM));
  } },

  // 3 · Lógica: argumentos y falacias.
  edu_phil_logic: { name: 'Pensar bien: argumentos y falacias', cat: 'edu', summary: 'Introducción a la lógica: qué es un argumento (premisas y conclusión), un silogismo clásico, las falacias más comunes (ad hominem, generalización, falsa causa…) y un quiz para cazarlas', make: () => {
    const PAPER = '#eef1f6', INK = '#1a2130', BL = '#2f6df0', GR = '#2e9e6b', RE = '#d84b3f', AM = '#d79b2b', GREY = '#5f6b80', S = FF.space, M = FF.mono;
    return numbered(ink(build({ name: 'Pensar bien: argumentos y falacias', palette: 'ocean', fonts: 'clean', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, BL, PAPER, 14), glow(-120, 560, 520, AM, PAPER, 12)], extra: [
        text('FILOSOFÍA · LÓGICA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('Pensar bien', 84, 198, 760, 120, { fontSize: 86, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('No basta con tener opiniones: hay que saber razonarlas. Y saber cuándo un razonamiento hace trampa.', 90, 338, 700, 150, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(img(svgURL(320, 300, `<rect x="30" y="40" width="260" height="60" rx="10" fill="#dce6fb" stroke="${BL}" stroke-width="3"/><rect x="30" y="120" width="260" height="60" rx="10" fill="#dce6fb" stroke="${BL}" stroke-width="3"/><path d="M160 186 l0 44 m-16 -16 l16 16 l16 -16" stroke="${GR}" stroke-width="5" fill="none"/><rect x="60" y="236" width="200" height="56" rx="10" fill="#e3f5ea" stroke="${GR}" stroke-width="3"/>`), 900, 190, 320, 300, 'Dos premisas que llevan a una conclusión'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: la lógica es la gramática del pensamiento. Distinguir un buen razonamiento de uno tramposo.' },
      { title: '¿Qué es un argumento?', layout: 'titleOnly', bg: PAPER, extra: [
        text('Un argumento = una o más <b style="color:' + BL + '">premisas</b> (razones) que sostienen una <b style="color:' + GR + '">conclusión</b>.', 90, 200, 1100, 90, { fontSize: 30, color: INK, lineHeight: 1.4, textAlign: 'center' }),
        on(card('<b style="color:' + BL + '">Premisa 1:</b> Todos los seres humanos son mortales.', 190, 320, 900, 70, '#dce6fb', { color: INK, radius: 10, fontSize: 25, pad: [14, 22, 12, 22] }), 'fade-up'),
        after(card('<b style="color:' + BL + '">Premisa 2:</b> Sócrates es un ser humano.', 190, 402, 900, 70, '#dce6fb', { color: INK, radius: 10, fontSize: 25, pad: [14, 22, 12, 22] }), 'fade-up'),
        after(card('<b style="color:' + GR + '">Conclusión:</b> Luego Sócrates es mortal.', 190, 484, 900, 70, '#e3f5ea', { color: INK, radius: 10, fontSize: 25, pad: [14, 22, 12, 22] }), 'zoom-in')],
        notes: 'El silogismo clásico. Si las premisas son verdaderas y la forma es válida, la conclusión se impone.' },
      { title: 'Válido y verdadero no son lo mismo', layout: 'twoContent', bg: PAPER, extra: [
        on(card('<b style="font-size:28px;color:' + BL + '">Válido</b><br><span style="font-size:23px">La conclusión se sigue de las premisas. Es cuestión de <b>forma</b>.</span>', 110, 215, 500, 200, '#ffffff', { color: INK, radius: 16, borderColor: BL, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card('<b style="font-size:28px;color:' + GR + '">Verdadero</b><br><span style="font-size:23px">Las premisas se corresponden con la realidad. Es cuestión de <b>hechos</b>.</span>', 660, 215, 500, 200, '#ffffff', { color: INK, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('Se puede razonar de forma válida a partir de premisas falsas… y llegar a una conclusión falsa.', 110, 450, 1050, 100, { fontSize: 25, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Distinción fina pero importante: validez (forma) frente a verdad (contenido). Un argumento sólido necesita las dos.' },
      { title: 'Falacias: trampas del razonar', layout: 'titleOnly', bg: PAPER, extra: gridCards([
        ['Ad hominem', 'Atacar a quien habla en vez de a lo que dice.', RE],
        ['Generalización apresurada', 'De unos pocos casos, saltar a «todos».', AM],
        ['Falsa causa', 'Si pasó después, creer que fue la causa.', BL],
        ['Autoridad mal usada', '«Lo dijo un famoso» no lo hace verdad.', GR]],
        { y0: 200, color: INK }) },
      { title: 'Más trampas frecuentes', layout: 'titleOnly', bg: PAPER, extra: gridCards([
        ['Hombre de paja', 'Deformar lo que dijo el otro para rebatirlo fácil.', RE],
        ['Falso dilema', 'Presentar solo dos opciones cuando hay más.', AM],
        ['Pendiente resbaladiza', '«Si permitimos esto, pasará lo peor».', BL],
        ['Apelar a la mayoría', '«Todo el mundo lo hace», luego está bien.', GR]],
        { y0: 200, color: INK }) },
      { layout: 'blank', bg: PAPER, extra: [quiz('«No le hagas caso sobre el clima: ni siquiera terminó el instituto». ¿Qué falacia es?', ['Falsa causa', 'Ad hominem', 'Falso dilema', 'Generalización'], 1)],
        notes: 'Quiz. Ataca a la persona, no al argumento: ad hominem. Que lo justifiquen antes de revelar.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 430, 520, BL, PAPER, 14)], transition: 'zoom', extra: [
        text('Caza-falacias', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Durante una semana, apunta una falacia que oigas o leas (en clase, en un anuncio, en una red). Trae el ejemplo y di qué trampa hace.', 84, 262, 820, 170, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        text('Pensar bien es, sobre todo, detectar cuándo nos quieren convencer sin razones.', 84, 470, 760, 80, { fontSize: 23, color: BL, lineHeight: 1.4 })],
        notes: 'Cierre: la lógica es una herramienta de autodefensa intelectual. El reto la lleva a la vida diaria.' },
    ]), INK));
  } },

  // 4 · Ética: ¿qué está bien? Las grandes teorías.
  edu_phil_ethics: { name: 'Ética: ¿qué está bien?', cat: 'edu', summary: 'Las grandes teorías éticas para decidir qué está bien: consecuencialismo (las consecuencias), deontología (el deber, Kant) y ética de la virtud (el carácter, Aristóteles), comparadas con un caso y una votación', make: () => {
    const PAPER = '#f3f1ec', INK = '#231f1a', GR = '#2e9e6b', BL = '#2f6df0', RE = '#d84b3f', AM = '#c98a2b', GREY = '#5f685f', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Ética: ¿qué está bien?', palette: 'warm', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, AM, PAPER, 16), glow(-120, 560, 520, GR, PAPER, 12)], extra: [
        text('FILOSOFÍA · ÉTICA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: AM, fontWeight: 700 }),
        text('¿Qué está<br>bien?', 84, 196, 720, 200, { fontSize: 84, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: SE }),
        text('Todos decidimos qué está bien y qué está mal. La ética estudia con qué razones lo decidimos.', 90, 440, 680, 110, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(scales(0), 920, 180, 300, 300, 'Una balanza equilibrada'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: la ética no impone normas, estudia las razones del bien y del mal. Tres grandes respuestas.' },
      { title: 'Moral y ética', layout: 'twoContent', bg: PAPER, extra: [
        on(card('<b style="font-size:28px;color:' + AM + '">Moral</b><br><span style="font-size:24px">Las normas concretas que seguimos («no mientas»).</span>', 110, 220, 500, 180, '#ffffff', { color: INK, radius: 16, borderColor: AM, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card('<b style="font-size:28px;color:' + GR + '">Ética</b><br><span style="font-size:24px">La reflexión sobre esas normas: ¿por qué? ¿son justas?</span>', 660, 220, 500, 180, '#ffffff', { color: INK, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('La moral es el mapa; la ética, preguntarse si el mapa está bien dibujado.', 110, 440, 1050, 60, { fontSize: 26, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Distinción moral/ética. No es memorismo: es ver que la ética cuestiona, no solo obedece.' },
      { title: 'Tres formas de decidir', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cards', 'Consecuencias — mira el resultado: lo bueno es lo que trae más bien al mayor número (utilitarismo)\nDeber — mira la norma: hay deberes que valen siempre, pase lo que pase (Kant)\nCarácter — mira a la persona: obra como obraría alguien justo y prudente (Aristóteles)', 90, 190, 1100, 410, { color: INK }),
        text('Ante un mismo caso, cada teoría se fija en algo distinto.', 90, 618, 1100, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Las tres familias éticas. Consecuencialismo, deontología, virtud. No decir cuál es «la buena».' },
      { title: 'Kant y la regla de oro filosófica', layout: 'titleOnly', bg: PAPER, extra: [
        text('«Actúa solo según una norma que quisieras que <b>todo el mundo</b> siguiera.»', 120, 215, 1040, 110, { fontSize: 32, color: INK, textAlign: 'center', lineHeight: 1.4, fontFamily: SE }),
        on(card('¿Puedo mentir para librarme de un lío? Kant: ¿querrías que <b>todos</b> mintieran siempre? No. Entonces, no.', 180, 360, 920, 120, '#fbf2e2', { color: INK, radius: 14, borderColor: AM, fontSize: 25, pad: [16, 22, 14, 22] }), 'fade-up'),
        text('Para Kant, las personas son un fin en sí mismas: nunca solo un medio para mis planes.', 180, 510, 920, 70, { fontSize: 24, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'El imperativo categórico, explicado sencillo. La universalización y la dignidad de la persona.' },
      { title: 'Un mismo caso, tres miradas', layout: 'titleOnly', bg: PAPER, extra: [
        text('Encuentras una cartera con dinero y el DNI del dueño.', 90, 190, 1100, 50, { fontSize: 27, color: INK, textAlign: 'center' }),
        ...gridCards([
          ['Consecuencias', 'Devolverla crea confianza y más bien general.', BL],
          ['Deber', 'Robar está mal siempre; hay que devolverla.', RE],
          ['Carácter', '¿Qué haría una persona honrada? Devolverla.', GR]],
          { x0: 90, y0: 270, dx: 390, w: 360, h: 180, color: INK })],
        notes: 'Las tres coinciden aquí, pero por razones distintas. En otros casos no coincidirán: ahí está lo interesante.' },
      { layout: 'blank', bg: PAPER, extra: [vote('Mientes a un amigo para no hacerle daño. ¿Qué pesa más para ti?', ['El buen resultado (no sufre)', 'El deber de no mentir', 'Lo que haría alguien honesto', 'Depende del caso'])],
        notes: 'Votación sin respuesta correcta: sirve para ver que cada quien usa una teoría distinta sin saberlo.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 430, 520, AM, PAPER, 14)], transition: 'zoom', extra: [
        text('No hay examen de esto', 84, 150, 860, 90, { fontSize: 54, fontWeight: 800, color: INK, fontFamily: SE }),
        text('La ética no te da la respuesta hecha: te da herramientas para decidir mejor y poder explicar por qué. Reto: piensa una decisión difícil que hayas tomado y mírala con las tres teorías.', 84, 258, 860, 190, { fontSize: 27, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre: la ética no es adoctrinar; es dar herramientas para razonar decisiones. Reto personal.' },
    ]), INK));
  } },

  // 5 · Dilemas morales: el tranvía y sus variantes. Votación en directo.
  edu_phil_dilemmas: { name: 'Dilemas morales: el tranvía', cat: 'edu', summary: 'El famoso dilema del tranvía y sus variantes para pensar la ética en directo: votaciones de la clase, por qué cambiamos de respuesta y qué revela cada versión, planteado de forma neutral para debatir', make: () => {
    const BG = '#11131a', PANEL = '#1d2130', AC = '#e0b145', RE = '#ef6b6b', GR = '#5fd38a', BL = '#5aa7f0', DIM = '#95a0b5', CREAM = '#eef2fa', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Dilemas morales: el tranvía', palette: 'midnight', fonts: 'clean', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AC, BG, 22), glow(-120, 560, 520, RE, BG, 16)], extra: [
        text('FILOSOFÍA · DILEMAS', 90, 140, 680, 36, { fontSize: 22, letterSpacing: 4, color: AC, fontWeight: 700 }),
        text('El dilema<br>del tranvía', 84, 188, 640, 220, { fontSize: 78, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: SE }),
        text('Un experimento mental famoso: no tiene respuesta correcta, pero nos obliga a mirar cómo decidimos.', 90, 452, 640, 120, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
        after(img(trolley(), 760, 210, 440, 260, 'Un tranvía en una vía que se bifurca'), 'fade-left', { duration: 800 })],
        notes: 'Arranque. Advertir: no hay respuesta «buena». Es para pensar y debatir con respeto.' },
      { title: 'La situación', layout: 'titleOnly', bg: BG, extra: [
        img(trolley(), 90, 180, 470, 260, 'Tranvía que se dirige hacia cinco personas'),
        text('Un tranvía sin frenos va hacia <b style="color:' + RE + '">cinco personas</b> atadas a la vía. Tú estás junto a una palanca: si la accionas, el tranvía cambia a otra vía… donde hay <b style="color:' + GR + '">una persona</b>.', 620, 210, 560, 240, { fontSize: 27, color: CREAM, lineHeight: 1.45 }),
        text('No hay más opciones. El tiempo corre.', 620, 470, 560, 50, { fontSize: 23, color: DIM })],
        notes: 'Planteamiento. Dejar que entiendan bien las opciones antes de votar. Sin opinar tú todavía.' },
      { layout: 'blank', bg: BG, extra: [vote('¿Accionas la palanca?', ['Sí: desvío el tranvía (muere 1 en vez de 5)', 'No: no intervengo'])],
        notes: 'Primera votación. Suele ganar «sí». Anota el resultado para compararlo luego.' },
      { title: '¿Por qué «sí»? ¿Por qué «no»?', layout: 'twoContent', bg: BG, extra: [
        on(card('<b style="font-size:27px;color:' + GR + '">Quien desvía</b><br><span style="font-size:23px">Mira las consecuencias: 1 muerto es mejor que 5.</span>', 110, 220, 500, 190, PANEL, { color: CREAM, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card('<b style="font-size:27px;color:' + RE + '">Quien no actúa</b><br><span style="font-size:23px">No quiere ser quien <b>decide</b> matar a alguien que estaba a salvo.</span>', 660, 220, 500, 190, PANEL, { color: CREAM, radius: 16, borderColor: RE, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('¿Hay diferencia entre causar una muerte y permitir cinco? Ahí empieza el debate.', 110, 450, 1050, 60, { fontSize: 25, color: DIM, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Las dos lógicas: consecuencialista (contar) y deontológica (no usar a nadie como medio). Dar voz a ambas.' },
      { title: 'La variante del puente', layout: 'titleOnly', bg: BG, extra: [
        text('Mismo tranvía hacia cinco personas. Ahora estás en un puente, junto a una persona muy corpulenta. Si la <b>empujas</b> a la vía, su cuerpo para el tranvía y salva a los cinco. ¿Lo haces?', 100, 200, 1080, 200, { fontSize: 30, color: CREAM, lineHeight: 1.45, textAlign: 'center' }),
        text('Las cuentas son iguales: 1 por 5. Pero casi nadie empuja. ¿Por qué?', 100, 430, 1080, 70, { fontSize: 25, color: DIM, textAlign: 'center' })],
        notes: 'La variante incómoda. Mismo cálculo, intuición opuesta. Introduce la idea de usar a alguien «como medio».' },
      { layout: 'blank', bg: BG, extra: [vote('En la versión del puente, ¿empujas a la persona?', ['Sí', 'No'])],
        notes: 'Segunda votación. Casi siempre gana «no», aunque la cuenta sea idéntica. Comparar con la primera votación.' },
      { title: '¿Qué nos enseña?', layout: 'titleOnly', bg: BG, extra: gridCards([
        ['No solo contamos', 'Si solo importara el número, ambas respuestas serían iguales. No lo son.', BL],
        ['Usar a alguien pesa', 'Empujar convierte a la persona en un instrumento. Eso nos frena.', AC],
        ['Actuar vs. permitir', 'Sentimos distinto hacer un daño que no evitarlo.', GR],
        ['No hay respuesta única', 'Personas sensatas eligen distinto. Lo valioso es razonarlo.', RE]],
        { y0: 190, bg: PANEL, color: CREAM }) },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, AC, BG, 28)], transition: 'zoom', extra: [
        text('Los dilemas no se «resuelven»', 90, 210, 1100, 130, { fontSize: 48, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: SE, lineHeight: 1.1 }),
        text('Se piensan. Reto: inventa tu propio dilema (con coche autónomo, con un secreto, con el reparto de algo) y tráelo para votarlo en clase.', 150, 390, 980, 130, { fontSize: 27, color: DIM, textAlign: 'center', lineHeight: 1.45 })],
        notes: 'Cierre neutral: lo importante es razonar y escuchar, no «ganar». El reto conecta con la ética de la IA.' },
    ]), CREAM));
  } },

  // 6 · Teoría del conocimiento: la caverna y la duda.
  edu_phil_knowledge: { name: '¿Qué podemos conocer?', cat: 'edu', summary: 'Teoría del conocimiento: los sentidos nos engañan, el mito de la caverna de Platón, la duda de Descartes («pienso, luego existo») y la diferencia entre opinión, creencia y saber, con un quiz', make: () => {
    const BG = '#0d1016', PANEL = '#191e2a', AC = '#e0a23c', TE = '#4fc7c0', VI = '#b48ce8', GR = '#5fd38a', DIM = '#95a0b5', CREAM = '#eef2fa', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: '¿Qué podemos conocer?', palette: 'midnight', fonts: 'editorial', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AC, BG, 22), glow(-120, 560, 520, TE, BG, 16)], extra: [
        text('FILOSOFÍA · CONOCIMIENTO', 90, 140, 700, 36, { fontSize: 22, letterSpacing: 4, color: AC, fontWeight: 700 }),
        text('¿Qué podemos<br>conocer?', 84, 188, 640, 220, { fontSize: 72, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: SE }),
        text('¿Y si lo que llamas «real» fueran solo sombras? La teoría del conocimiento pregunta qué podemos saber de verdad.', 90, 452, 660, 120, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
        after(img(cave(), 760, 200, 440, 290, 'La caverna de Platón: fuego, muro y sombras'), 'fade-left', { duration: 800 })],
        notes: 'Arranque con el gancho de la caverna. ¿Distinguimos la realidad de su apariencia?' },
      { title: 'Los sentidos engañan', layout: 'titleOnly', bg: BG, extra: [
        text('Un palo recto parece torcido dentro del agua. El Sol «sale» y «se pone»… pero es la Tierra la que gira.', 120, 210, 1040, 130, { fontSize: 30, color: CREAM, lineHeight: 1.45, textAlign: 'center' }),
        on(card('Si los sentidos a veces nos mienten, ¿podemos fiarnos de ellos para conocer el mundo?', 200, 380, 880, 120, PANEL, { color: CREAM, radius: 14, borderColor: AC, fontSize: 27, pad: [18, 24, 16, 24] }), 'fade-up')],
        notes: 'Punto de partida escéptico: los sentidos fallan. De aquí nacen la caverna y la duda.' },
      { title: 'El mito de la caverna', layout: 'twoContent', bg: BG, extra: [
        img(cave(), 110, 200, 440, 290, 'Prisioneros mirando sombras en el muro'),
        text('Unos prisioneros, atados desde niños, solo ven <b style="color:' + AC + '">sombras</b> en el muro y creen que son la realidad. Si uno sale y ve el Sol, al volver nadie le cree.', 600, 210, 580, 230, { fontSize: 26, color: CREAM, lineHeight: 1.45 }),
        on(card('Para Platón, salir de la caverna es educarse: pasar de las apariencias a las Ideas.', 600, 450, 580, 100, PANEL, { color: CREAM, radius: 14, borderColor: VI, fontSize: 23, pad: [14, 20, 12, 20] }), 'fade-up')],
        notes: 'La alegoría. Las sombras = lo que aceptamos sin pensar; salir = aprender a cuestionar. El que vuelve molesta.' },
      { title: 'Descartes: dudar de todo', layout: 'titleOnly', bg: BG, extra: [
        text('¿Y si todo fuera un sueño o un engaño? Descartes decide dudar de <b>todo</b>… hasta encontrar algo seguro.', 120, 200, 1040, 120, { fontSize: 30, color: CREAM, lineHeight: 1.45, textAlign: 'center' }),
        after(card('<b style="color:' + TE + ';font-size:34px">«Pienso, luego existo»</b><br><span style="font-size:24px">Puedo dudar de todo, pero no de que estoy dudando. Y dudar es pensar.</span>', 220, 360, 840, 160, PANEL, { color: CREAM, radius: 16, borderColor: TE, pad: [18, 26, 16, 26] }), 'zoom-in')],
        notes: 'La duda metódica y el «cogito». Lo único indudable: que pienso. Base del conocimiento moderno.' },
      { title: 'Opinión, creencia y saber', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Opinión — «me parece», sin pruebas\nCreencia — lo doy por cierto, pero podría equivocarme\nSaber — creencia verdadera y justificada con razones', 110, 220, 1060, 300, { color: CREAM }),
        text('Saber no es solo acertar: es acertar y poder explicar por qué.', 110, 560, 1060, 50, { fontSize: 23, color: DIM, textAlign: 'center' })],
        notes: 'Los tres niveles. La definición clásica de conocimiento: creencia verdadera justificada.' },
      { layout: 'blank', bg: BG, extra: [quiz('En la caverna, ¿qué representan las sombras del muro?', ['La verdad absoluta', 'Las cosas que aceptamos sin cuestionar', 'Los sueños', 'El conocimiento científico'], 1)],
        notes: 'Quiz. Las sombras = las apariencias que tomamos por reales sin examinarlas.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, AC, BG, 28)], transition: 'zoom', extra: [
        text('Sal de tu caverna', 90, 220, 1100, 110, { fontSize: 56, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: SE }),
        text('Reto: piensa en una cosa que creías segura y que resultó falsa. ¿Cómo lo descubriste? Eso es salir de la caverna.', 150, 390, 980, 120, { fontSize: 27, color: DIM, textAlign: 'center', lineHeight: 1.45 })],
        notes: 'Cierre: conocer es un esfuerzo activo de salir de lo que damos por hecho. El reto lo hace personal.' },
    ]), CREAM));
  } },

  // 7 · Libertad y responsabilidad.
  edu_phil_freedom: { name: 'Libertad y responsabilidad', cat: 'edu', summary: '¿Somos libres? El debate entre determinismo y libre albedrío, qué condiciona nuestras decisiones, por qué la libertad trae responsabilidad y una votación sobre un caso, planteado para debatir', make: () => {
    const PAPER = '#f1f3f0', INK = '#1b2420', GR = '#2e9e6b', OR = '#e0873b', BL = '#2f6df0', RE = '#d84b3f', GREY = '#5f6b63', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Libertad y responsabilidad', palette: 'forest', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, GR, PAPER, 14), glow(-120, 560, 520, OR, PAPER, 12)], extra: [
        text('FILOSOFÍA · LIBERTAD', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700 }),
        text('¿Somos<br>libres?', 84, 196, 720, 200, { fontSize: 84, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: SE }),
        text('Creemos elegir a cada paso. Pero ¿y si todo lo que hacemos ya estuviera decidido por causas anteriores?', 90, 440, 680, 110, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(chain(), 880, 230, 340, 190, 'Una cadena rota'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: la sensación de libertad frente a la pregunta de si de verdad somos libres.' },
      { title: 'Dos posturas', layout: 'twoContent', bg: PAPER, extra: [
        on(card('<b style="font-size:28px;color:' + OR + '">Determinismo</b><br><span style="font-size:23px">Todo tiene una causa. Tus decisiones también: genes, educación, circunstancias.</span>', 110, 215, 500, 210, '#ffffff', { color: INK, radius: 16, borderColor: OR, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card('<b style="font-size:28px;color:' + GR + '">Libre albedrío</b><br><span style="font-size:23px">Aunque haya causas, de verdad podríamos haber elegido otra cosa.</span>', 660, 215, 500, 210, '#ffffff', { color: INK, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('Y una tercera vía: somos libres aunque condicionados, porque podemos reflexionar antes de actuar.', 110, 460, 1050, 70, { fontSize: 24, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'El debate clásico. No zanjarlo: presentar también el compatibilismo (tercera vía) sin tecnicismos.' },
      { title: '¿Qué condiciona lo que elijo?', layout: 'titleOnly', bg: PAPER, extra: gridCards([
        ['Lo que soy', 'Carácter, genes, cómo me criaron.', OR],
        ['Lo que me rodea', 'Familia, amigos, cultura, dinero.', BL],
        ['Lo que siento', 'Miedos, deseos, impulsos del momento.', RE],
        ['Lo que pienso', 'Aquí entra la razón: puedo parar y decidir.', GR]],
        { y0: 200, color: INK }) },
      { title: 'Libertad = responsabilidad', layout: 'titleOnly', bg: PAPER, extra: [
        text('Solo responde de sus actos quien pudo elegir. Por eso no juzgamos igual a quien actúa <b>libremente</b> que a quien fue forzado.', 120, 210, 1040, 140, { fontSize: 30, color: INK, lineHeight: 1.45, textAlign: 'center' }),
        on(card('Cuanta más libertad tienes, más respondes de lo que haces. Por eso crecer es ganar libertad… y responsabilidad.', 190, 390, 900, 130, '#e9f3ec', { color: INK, radius: 14, borderColor: GR, fontSize: 26, pad: [18, 24, 16, 24] }), 'fade-up')],
        notes: 'La bisagra del tema: sin libertad no hay responsabilidad. Conecta con el derecho (atenuantes, mayoría de edad).' },
      { layout: 'blank', bg: PAPER, extra: [vote('Alguien comete una falta presionado por su grupo. ¿Es igual de responsable que si lo hiciera solo?', ['Sí, igual de responsable', 'Algo menos responsable', 'Mucho menos responsable', 'Depende de la presión'])],
        notes: 'Votación-debate. Sirve para ver cómo graduamos la responsabilidad según la libertad real. Sin respuesta correcta.' },
      { title: 'Ser libre cuesta', layout: 'titleOnly', bg: PAPER, extra: [
        dg('process', 'Hacer lo que todos hacen es cómodo\nParar y pensar da miedo y da trabajo\nElegir con razones propias es, de verdad, ser libre', 110, 220, 1060, 300, { color: INK }),
        text('Dejarse llevar también es una elección… de no elegir.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Idea existencialista sencilla (Sartre): estamos «condenados a ser libres». No decidir ya es decidir.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 430, 520, GR, PAPER, 14)], transition: 'zoom', extra: [
        text('Tu próxima decisión', 84, 150, 860, 90, { fontSize: 54, fontWeight: 800, color: INK, fontFamily: SE }),
        text('Reto: en una decisión pequeña de esta semana, para diez segundos antes de actuar y pregúntate «¿elijo yo esto o me estoy dejando llevar?». Anótalo.', 84, 258, 860, 180, { fontSize: 28, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre práctico: la libertad se entrena parando a pensar. El reto la lleva a la vida diaria.' },
    ]), INK));
  } },

  // 8 · Justicia, derechos y convivencia.
  edu_phil_justice: { name: 'Justicia y convivencia', cat: 'edu', summary: 'Qué es la justicia: repartir con criterio (igualdad, mérito, necesidad), el «velo de ignorancia» de Rawls, los derechos humanos como acuerdo mínimo y una votación sobre cómo repartir de forma justa', make: () => {
    const PAPER = '#eef0f4', INK = '#1a2030', BL = '#2f6df0', GR = '#2e9e6b', AM = '#d79b2b', VI = '#7b5bd0', GREY = '#5f6678', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Justicia y convivencia', palette: 'ocean', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, BL, PAPER, 14), glow(-120, 560, 520, VI, PAPER, 12)], extra: [
        text('FILOSOFÍA · JUSTICIA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('¿Qué es<br>justo?', 84, 196, 720, 200, { fontSize: 84, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: SE }),
        text('Vivimos juntos y hay que repartir cosas: notas, turnos, dinero, oportunidades. ¿Con qué criterio es justo?', 90, 440, 680, 110, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(scales(0), 920, 180, 300, 300, 'La balanza de la justicia'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: la justicia aparece siempre que hay que repartir algo entre varios. Problema cotidiano.' },
      { title: 'Repartir una tarta', layout: 'titleOnly', bg: PAPER, extra: gridCards([
        ['A partes iguales', 'Lo mismo para cada uno. ¿Siempre es lo más justo?', BL],
        ['Según el mérito', 'Más para quien más se esforzó o aportó.', AM],
        ['Según la necesidad', 'Más para quien más lo necesita.', GR],
        ['Según lo acordado', 'Lo que se pactó antes entre todos.', VI]],
        { y0: 200, color: INK }) },
      { title: 'El velo de ignorancia (Rawls)', layout: 'titleOnly', bg: PAPER, extra: [
        text('Imagina que decides las reglas de la sociedad <b>sin saber</b> qué lugar ocuparás en ella: rico o pobre, sano o enfermo, aquí o en otro país.', 120, 200, 1040, 150, { fontSize: 30, color: INK, lineHeight: 1.45, textAlign: 'center' }),
        on(card('Como podrías ser el que peor está, elegirías reglas que protejan también al más débil. Eso, dice Rawls, es lo justo.', 190, 390, 900, 130, '#e7eefc', { color: INK, radius: 14, borderColor: BL, fontSize: 26, pad: [18, 24, 16, 24] }), 'fade-up')],
        notes: 'El experimento mental de Rawls, explicado sencillo: la justicia como lo que elegiríamos sin saber quiénes seremos.' },
      { title: 'Derechos humanos: el mínimo común', layout: 'titleOnly', bg: PAPER, extra: [
        text('Tras guerras terribles, el mundo acordó en 1948 unos <b style="color:' + GR + '">derechos</b> para todas las personas, solo por serlo.', 120, 195, 1040, 110, { fontSize: 29, color: INK, lineHeight: 1.4, textAlign: 'center' }),
        ...gridCards([
          ['Dignidad e igualdad', 'Nadie vale más que otro ante la ley.', BL],
          ['Libertad', 'De pensar, creer, expresarse, moverse.', AM],
          ['Vida y seguridad', 'Nadie puede ser torturado ni esclavizado.', GR],
          ['Educación y salud', 'Condiciones para una vida digna.', VI]],
          { y0: 320, color: INK })],
        notes: 'Los derechos humanos como acuerdo mínimo universal, no como opinión. Nacen del «nunca más».' },
      { title: 'Justicia no es lo mismo que igualdad', layout: 'twoContent', bg: PAPER, extra: [
        on(card('<b style="font-size:27px;color:' + deep(AM) + '">Igualdad</b><br><span style="font-size:23px">Dar lo mismo a todos.</span>', 110, 230, 500, 170, '#ffffff', { color: INK, radius: 16, borderColor: AM, pad: [20, 24, 18, 24] }), 'fade-up'),
        on(card('<b style="font-size:27px;color:' + deep(GR) + '">Equidad</b><br><span style="font-size:23px">Dar a cada uno lo que necesita para tener las mismas oportunidades.</span>', 660, 230, 500, 170, '#ffffff', { color: INK, radius: 16, borderColor: GR, pad: [20, 24, 18, 24] }), 'fade-up'),
        text('A veces tratar a todos igual es injusto: no todos parten del mismo sitio.', 110, 440, 1050, 60, { fontSize: 25, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Distinción igualdad/equidad, clave hoy. La imagen típica de las cajas para ver por encima de la valla.' },
      { layout: 'blank', bg: PAPER, extra: [vote('Hay que repartir 3 ordenadores entre 10 alumnos. ¿Qué es más justo?', ['Sorteo (azar, todos igual)', 'A quien saca mejores notas', 'A quien no tiene ninguno en casa', 'Turnos para todos'])],
        notes: 'Votación-debate. Cada opción responde a un criterio de justicia distinto. Ninguna es «la correcta».' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 430, 520, BL, PAPER, 14)], transition: 'zoom', extra: [
        text('Justicia de cada día', 84, 150, 860, 90, { fontSize: 54, fontWeight: 800, color: INK, fontFamily: SE }),
        text('La justicia no es solo de los tribunales: está en cómo repartís el trabajo en un grupo o los turnos en casa. Reto: detecta un reparto injusto a tu alrededor y propón uno mejor.', 84, 258, 860, 190, { fontSize: 27, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre: la justicia empieza en lo pequeño. El reto la baja a lo cotidiano.' },
    ]), INK));
  } },

  // 9 · La vida buena: Aristóteles y los estoicos.
  edu_phil_happiness: { name: 'La vida buena: la felicidad', cat: 'edu', summary: 'Qué es una vida buena según la filosofía: la felicidad como plenitud y el término medio de Aristóteles, el placer sereno de los epicúreos y el dominio de uno mismo de los estoicos, con una reflexión final', make: () => {
    const PAPER = '#f3f0ea', INK = '#241f18', AM = '#c9902b', GR = '#2e9e6b', TE = '#1f8f8f', RE = '#c05a43', GREY = '#5f685c', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'La vida buena: la felicidad', palette: 'warm', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, AM, PAPER, 16), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('FILOSOFÍA · LA FELICIDAD', 90, 150, 700, 36, { fontSize: 22, letterSpacing: 3, color: deep(AM, PAPER), fontWeight: 700 }),
        text('La vida<br>buena', 84, 196, 720, 200, { fontSize: 84, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: SE }),
        text('Todo el mundo quiere ser feliz. Pero ¿qué es la felicidad? Los filósofos llevan 2000 años dando respuestas.', 90, 440, 700, 110, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(svgURL(300, 320, `<path d="M40 280 Q150 60 260 280" fill="none" stroke="${AM}" stroke-width="6"/><circle cx="150" cy="96" r="26" fill="${AM}"/>${[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return `<line x1="${(150+34*Math.cos(r)).toFixed(0)}" y1="${(96+34*Math.sin(r)).toFixed(0)}" x2="${(150+48*Math.cos(r)).toFixed(0)}" y2="${(96+48*Math.sin(r)).toFixed(0)}" stroke="${AM}" stroke-width="4"/>`}).join('')}`), 920, 180, 300, 320, 'Un sol sobre un camino'), 'zoom-in', { duration: 800 })],
        notes: 'Arranque: la felicidad es el fin que todos buscan, pero cada escuela la entiende distinto.' },
      { title: 'Aristóteles: florecer', layout: 'titleOnly', bg: PAPER, extra: [
        text('La felicidad (<i>eudaimonía</i>) no es un rato de placer, sino una <b>vida lograda</b>: desarrollar lo mejor de uno con buenos hábitos.', 120, 200, 1040, 140, { fontSize: 30, color: INK, lineHeight: 1.45, textAlign: 'center' }),
        on(card('Se es valiente, honrado o generoso <b>practicándolo</b>, hasta que se vuelve costumbre. La virtud es un hábito.', 190, 390, 900, 130, '#fbf2e2', { color: INK, radius: 14, borderColor: AM, fontSize: 26, pad: [18, 24, 16, 24] }), 'fade-up')],
        notes: 'Eudaimonía = plenitud, no euforia. Las virtudes se adquieren por repetición, como tocar un instrumento.' },
      { title: 'El término medio', layout: 'titleOnly', bg: PAPER, extra: [
        dg('process', 'Cobardía — defecto\nValentía — el justo medio\nTemeridad — exceso', 150, 215, 980, 230, { color: INK }),
        text('La virtud suele estar en el punto medio entre pasarse y quedarse corto. Ni temerario ni cobarde: valiente.', 150, 480, 980, 80, { fontSize: 25, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'El término medio aristotélico con el ejemplo de la valentía. Otros: generosidad entre tacañería y derroche.' },
      { title: 'Epicuro: el placer sereno', layout: 'twoContent', bg: PAPER, extra: [
        text('No se trata de darse todos los gustos, sino de disfrutar lo sencillo y <b style="color:' + GR + '">quitarse miedos y dolores</b>: la amistad, la calma, pan y conversación.', 110, 220, 560, 240, { fontSize: 27, color: INK, lineHeight: 1.45 }),
        on(card('Deseos necesarios (comer), deseos vanos (lujo sin fin). La paz viene de limitar los vanos.', 710, 230, 470, 200, '#e9f3ec', { color: INK, radius: 16, borderColor: GR, fontSize: 24, pad: [18, 22, 16, 22] }), 'fade-up')],
        notes: 'Epicuro mal entendido: no es derroche, es placer moderado y ausencia de dolor. La amistad como gran bien.' },
      { title: 'Los estoicos: lo que depende de mí', layout: 'twoContent', bg: PAPER, extra: [
        text('No puedo controlar lo que me pasa, pero sí <b style="color:' + TE + '">cómo respondo</b>. Preocúpate solo de lo que está en tu mano; lo demás, acéptalo con calma.', 110, 220, 560, 240, { fontSize: 27, color: INK, lineHeight: 1.45 }),
        on(card('Depende de mí: mis actos, mi esfuerzo, mi actitud.\nNo depende de mí: el clima, lo que digan, el pasado.', 710, 230, 470, 200, '#e4f1f1', { color: INK, radius: 16, borderColor: TE, fontSize: 23, pad: [18, 22, 16, 22] }), 'fade-up')],
        notes: 'El estoicismo (Epicteto, Marco Aurelio): la dicotomía del control. Muy actual (tiene que ver con la ansiedad).' },
      { layout: 'blank', bg: PAPER, extra: [vote('De todo esto, ¿qué crees que da MÁS felicidad duradera?', ['Tener muchas cosas y lujos', 'Buenas relaciones y amistades', 'Lograr metas que te importan', 'Calma y aceptar lo que no controlas'])],
        notes: 'Votación-reflexión. Los estudios actuales de bienestar apuntan a relaciones y sentido, más que a cosas. Pero que debatan.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 430, 520, AM, PAPER, 14)], transition: 'zoom', extra: [
        text('¿Y para ti?', 84, 150, 860, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: SE }),
        text('Reto: escribe en una frase qué sería para ti «una vida buena». Guárdala y vuelve a leerla dentro de unos años.', 84, 262, 860, 150, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        text('Las tres escuelas coinciden en algo: la felicidad se cultiva, no se compra.', 84, 448, 820, 70, { fontSize: 23, color: deep(AM, PAPER), lineHeight: 1.4 })],
        notes: 'Cierre: no hay receta única, pero sí un hilo común. El reto es una invitación personal, sin corregir.' },
    ]), INK));
  } },

  // 10 · Ética de la tecnología y la IA (tema de actualidad, integrado).
  edu_phil_ai: { name: 'Ética de la tecnología y la IA', cat: 'edu', summary: 'La ética aplicada a la tecnología y la inteligencia artificial: privacidad y datos, sesgos, quién responde cuando decide una máquina, deepfakes y empleo, con dilemas y una votación, de forma neutral', make: () => {
    const BG = '#0b1016', PANEL = '#161f2b', AC = '#5aa7f0', GR = '#5fd38a', AM = '#e0b145', RE = '#ef6b6b', VI = '#b48ce8', DIM = '#8fa0b5', CREAM = '#eef3fa', S = FF.space, SE = FF.serif;
    return numbered(ink(build({ name: 'Ética de la tecnología y la IA', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AC, BG, 24), glow(-120, 560, 520, VI, BG, 16)], extra: [
        text('FILOSOFÍA · ÉTICA Y TECNOLOGÍA', 90, 140, 720, 36, { fontSize: 22, letterSpacing: 4, color: AC, fontWeight: 700 }),
        text('¿Máquinas<br>que deciden?', 84, 188, 760, 220, { fontSize: 70, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: SE }),
        text('La IA ya recomienda, filtra y decide cosas que nos afectan. Las preguntas que plantea son, en el fondo, filosóficas.', 90, 452, 660, 120, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
        after(img(robot(AC), 920, 170, 300, 300, 'La cabeza de un robot'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: la tecnología avanza rápido; la pregunta por lo que está bien, no. Aquí se juntan.' },
      { title: 'Poder y responsabilidad', layout: 'titleOnly', bg: BG, extra: [
        text('Toda tecnología <b>puede</b> hacer cosas; la ética pregunta si <b>debe</b> hacerlas y quién responde si salen mal.', 120, 210, 1040, 130, { fontSize: 30, color: CREAM, lineHeight: 1.45, textAlign: 'center' }),
        on(card('Un martillo no es bueno ni malo; depende del uso. Con la IA pasa igual… pero decide mucho más que un martillo.', 200, 380, 880, 130, PANEL, { color: CREAM, radius: 14, borderColor: AC, fontSize: 26, pad: [18, 24, 16, 24] }), 'fade-up')],
        notes: 'Idea marco: la técnica no es neutral del todo cuando decide por nosotros. La pregunta pasa de «puedo» a «debo».' },
      { title: 'Cuatro dilemas de hoy', layout: 'titleOnly', bg: BG, extra: gridCards([
        ['Privacidad', '¿Hasta dónde pueden saber de ti tus datos y tu móvil?', AC],
        ['Sesgos', 'Si la IA aprende de datos injustos, repite la injusticia.', AM],
        ['Responsabilidad', 'Si un coche autónomo atropella, ¿quién responde?', RE],
        ['Verdad', 'Deepfakes: vídeos y voces falsos que parecen reales.', VI]],
        { y0: 190, bg: PANEL, color: CREAM }) },
      { title: 'El sesgo: basura entra, basura sale', layout: 'twoContent', bg: BG, extra: [
        text('La IA no es «objetiva» por ser una máquina. Aprende de ejemplos humanos; si esos ejemplos tienen prejuicios, los <b style="color:' + AM + '">aprende y los amplía</b>.', 110, 215, 560, 230, { fontSize: 27, color: CREAM, lineHeight: 1.45 }),
        on(card('Ejemplo: una IA de currículums entrenada con contrataciones pasadas sexistas… aprende a descartar mujeres.', 710, 225, 470, 210, PANEL, { color: CREAM, radius: 16, borderColor: AM, fontSize: 23, pad: [18, 22, 16, 22] }), 'fade-up')],
        notes: 'Punto importante y contraintuitivo: una máquina puede ser injusta sin «querer». El sesgo viene de los datos.' },
      { title: 'El coche y el dilema del tranvía', layout: 'titleOnly', bg: BG, extra: [
        text('Un coche autónomo no puede frenar a tiempo: o sigue recto y atropella a dos personas, o gira y choca poniendo en riesgo a su pasajero. ¿Qué debería tener programado?', 100, 200, 1080, 190, { fontSize: 29, color: CREAM, lineHeight: 1.45, textAlign: 'center' }),
        text('El viejo dilema del tranvía, ahora escrito en código por alguien, antes de que pase.', 100, 420, 1080, 70, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Conecta con la plantilla de dilemas. Lo nuevo: alguien decide por adelantado y para todos. ¿Quién y con qué criterio?' },
      { layout: 'blank', bg: BG, extra: [vote('¿Quién debería responder si un coche autónomo causa un accidente?', ['El fabricante del coche', 'Quien programó la IA', 'La persona que iba dentro', 'Hace falta una ley nueva'])],
        notes: 'Votación-debate. No hay consenso legal todavía; por eso es filosofía viva. Que argumenten.' },
      { title: 'Principios que se proponen', layout: 'titleOnly', bg: BG, extra: [
        dg('list', 'Transparencia — saber cuándo decide una IA y por qué\nResponsabilidad — que siempre haya un humano que responda\nEquidad — vigilar y corregir los sesgos\nPrivacidad — tus datos son tuyos\nControl humano — en lo importante, la última palabra es de una persona', 90, 185, 1100, 430, { color: CREAM })],
        notes: 'Principios habituales en las guías de ética de la IA. No son ley universal; son propuestas en debate.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, AC, BG, 28)], transition: 'zoom', extra: [
        text('La máquina calcula; tú decides', 90, 215, 1100, 120, { fontSize: 48, fontWeight: 800, color: CREAM, textAlign: 'center', fontFamily: SE, lineHeight: 1.1 }),
        text('Reto: busca un uso de IA de tu día a día (recomendaciones, filtros, corrector) y pregúntate qué decide por ti… y qué deberías decidir tú.', 150, 390, 980, 130, { fontSize: 27, color: DIM, textAlign: 'center', lineHeight: 1.45 })],
        notes: 'Cierre neutral y con agencia: la tecnología es herramienta; el criterio sigue siendo humano. Reto personal.' },
    ]), CREAM));
  } },

};
