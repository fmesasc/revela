// Example presentations: Fondos en movimiento (showcase). Each one: { name, summary, cat: 'showcase', make() } → a deck (see kit.js).
// Four classes (ESO and Bachillerato) whose slides have a looping VIDEO as their background: volcano, waves, aurora and storm;
// rainforest, waterfall, coral reef and autumn forest; Roman Forum, medieval castle, pyramids and Viking ship; nebula, Earth from
// orbit, Mars and Saturn. The videos are 5-second loops made with AI (a FLUX picture animated with Seedance 2.5 through Runware,
// first frame = last frame so they close without a jump), files of the repository (assets/video/<name>.mp4, with a cover
// <name>.webp). Every slide with a video carries a dark layer behind its text; the rest of the slides are ours (drawings in SVG
// without words, charts, tables, diagrams, a quiz). The videos are illustrative: the history deck says so on the slides.
// Facts are stable and marked «aprox.» when they are rounded. Decimals with a comma (Spanish).

import { build, text, card, shape, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, pollBlock, base, deep } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// (Absolute, from where the app is served: an exported or shared copy keeps finding the files.)
const AV = new URL('../../../../assets/video/', import.meta.url).href;
const svgURL = (w, h, body) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 34, x: 70, y: 60, w: 1140, h: 600, ...props });
const FF = { space: "'Space Grotesk', sans-serif" };
const WH = '#f4f6f8', GR = '#c9d1db';
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A dark layer behind text that goes over a video.
const scrim = (x, y, w, h, op = 55) => shape('rect', x, y, w, h, '#000000', { opacity: op });
const AI = 'Vídeo generado con IA (ilustrativo)';
const aiNote = (x, y, w, t = AI) => text(t, x, y, w, 28, { fontSize: 16, color: '#dfe5ec', letterSpacing: 1 });
const vid = v => ({ bgVideo: `${AV}${v}.mp4`, bgPoster: `${AV}${v}.jpg`, bgVideoLoop: true, bgVideoMuted: true });
// The cover: a video, a dark panel on the left, a label, the title and a line.
const cover = (T, v, label, title, sub, notes) => ({ layout: 'blank', bg: T.bg, ...vid(v), transition: 'fade', back: [scrim(0, 0, 860, 720, 52)], extra: [
  text(label, 80, 140, 740, 36, { fontSize: 22, letterSpacing: 3, color: T.ac, fontWeight: 700 }),
  text(title, 74, 188, 740, 260, { fontSize: 62, fontWeight: 800, color: WH, lineHeight: 1.05, fontFamily: FF.space }),
  text(sub, 80, 460, 720, 140, { fontSize: 27, color: GR, lineHeight: 1.4 }),
  aiNote(80, 650, 770, AI + ' · imagen FLUX + animación Seedance 2.5')], notes });
// A chapter: the video, a dark panel with the topic and its three key ideas.
const chap = (T, v, kick, title, points, notes, foot = AI) => ({ layout: 'blank', bg: T.bg, ...vid(v), transition: 'fade', back: [scrim(50, 80, 660, 570, 58)], extra: [
  text(kick, 86, 108, 600, 30, { fontSize: 20, letterSpacing: 3, color: T.ac, fontWeight: 700 }),
  text(title, 82, 146, 610, 120, { fontSize: 46, fontWeight: 800, color: WH, lineHeight: 1.06, fontFamily: FF.space }),
  on(text(ul(...points), 86, 290, 590, 310, { fontSize: 30, color: WH, lineHeight: 1.35 }), 'fade-up'),
  aiNote(86, 610, 600, foot)], notes });
// Observe and describe: the whole video, a question at the bottom and a timer.
const observe = (T, v, question, notes, secs = 60) => ({ layout: 'blank', bg: T.bg, ...vid(v), transition: 'fade', back: [scrim(0, 450, 1280, 270, 62)], extra: [
  text('OBSERVA Y DESCRIBE', 70, 468, 700, 30, { fontSize: 20, letterSpacing: 4, color: T.ac, fontWeight: 700 }),
  text(question, 70, 506, 920, 156, { fontSize: 34, fontWeight: 700, color: WH, lineHeight: 1.2, fontFamily: FF.space }),
  timer(secs, 1030, 480, 190, { color: T.ac, endText: '¡Ya!' }),
  aiNote(70, 668, 600)], notes });
// A plain slide of ours: a title and what is in `extra`.
const plain = (T, title, extra, notes) => ({ title, layout: 'titleOnly', bg: T.bg, back: [glow(960, -150, 520, T.ac, T.bg, 14)], extra, notes });
// A row of cards (title, text, colour).
const cardsRow = (T, items, { y = 215, h = 240, ts = 30, ds = 25, w = 350, gap = 25 } = {}) => items.map(([t, d, col], i) =>
  on(card(`<b style="font-size:${ts}px;color:${col}">${t}</b><br><span style="font-size:${ds}px;color:${WH}">${d}</span>`, 90 + i * (w + gap), y, w, h, T.panel, { color: WH, radius: 16, borderColor: col, borderWidth: 2 }), 'fade-up'));
const note = (t, y = 620, x = 90, w = 1100) => text(t, x, y, w, 56, { fontSize: 22, color: GR, textAlign: 'center' });
const tbl = (T, rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 23, header: true, headBg: T.ac2, headFg: '#ffffff', stroke: '#3a4658', banded: true, band: '#ffffff', bandAlpha: 0.06, color: WH, rows, ...o });
const quizSlide = (T, q, opts, correct, notes) => ({ layout: 'blank', bg: T.bg, extra: [quiz(q, opts, correct)], notes });
// The closing: what to take away, and how the videos were made.
const closing = (T, v, title, lines, notes) => ({ layout: 'blank', bg: T.bg, ...vid(v), transition: 'zoom', back: [scrim(50, 70, 1180, 580, 62)], extra: [
  text(title, 90, 100, 1100, 90, { fontSize: 48, fontWeight: 800, color: WH, fontFamily: FF.space }),
  text(ul(...lines), 90, 210, 1100, 270, { fontSize: 30, color: WH, lineHeight: 1.35 }),
  text('<b>Cómo se hicieron los vídeos.</b> Una imagen creada con FLUX se animó con Seedance 2.5 a través de Runware, haciendo que el último fotograma sea igual que el primero para que el bucle no dé saltos. Son ilustrativos, hechos con IA.', 90, 510, 1100, 120, { fontSize: 22, color: GR, lineHeight: 1.4 })], notes });

// ---- Drawings (ours, without words: the labels are text objects) -------------------
// A volcano seen in section: the cone, the conduit, the magma chamber and an ash cloud.
const volcanoArt = () => svgURL(520, 400,
  `<rect y="330" width="520" height="70" fill="#4a3a33"/><path d="M40 330 L210 120 L250 100 L290 120 L470 330 Z" fill="#6b4f43"/>`
  + `<path d="M250 100 L250 340" stroke="#e8591f" stroke-width="22" stroke-linecap="round"/><ellipse cx="250" cy="372" rx="130" ry="26" fill="#e8591f"/><ellipse cx="250" cy="372" rx="82" ry="14" fill="#ffb347"/>`
  + `<path d="M226 104 Q200 40 244 22 Q250 -8 296 16 Q344 12 330 56 Q352 90 290 108 Z" fill="#8a8f98" opacity=".9"/>`
  + `<path d="M246 108 C216 200 190 250 168 330" stroke="#ff7a2f" stroke-width="8" fill="none" stroke-linecap="round"/>`
  + Array.from({ length: 6 }, (_, i) => `<circle cx="${230 + i * 14}" cy="${62 - (i % 3) * 18}" r="4" fill="#ffb347"/>`).join(''));
// A wave: crest, trough and the wavelength between two crests.
const waveArt = () => svgURL(520, 300,
  `<path d="M10 160 C60 20 110 20 160 160 S260 300 310 160 S410 20 460 160 S500 260 510 160" fill="none" stroke="#5fd0e6" stroke-width="8" stroke-linecap="round"/>`
  + `<line x1="10" y1="160" x2="510" y2="160" stroke="#dfe5ec" stroke-width="2" stroke-dasharray="8 8"/>`
  + `<line x1="85" y1="48" x2="385" y2="48" stroke="#ffd166" stroke-width="4"/><path d="M85 40 v16 M385 40 v16" stroke="#ffd166" stroke-width="4"/>`
  + `<line x1="235" y1="160" x2="235" y2="272" stroke="#ff7a8a" stroke-width="4"/><path d="M227 262 l8 12 l8 -12" fill="#ff7a8a"/>`);
// The Sun, the solar wind, the Earth with its magnetic field.
const auroraArt = () => svgURL(520, 320,
  `<circle cx="70" cy="160" r="54" fill="#ffc83d"/>` + [70, 120, 200, 250].map((y, i) => `<path d="M130 ${y} C190 ${y - 18} 220 ${y + 18} 280 ${y}" stroke="#ffd98a" stroke-width="4" fill="none" stroke-dasharray="3 9" stroke-linecap="round" opacity="${0.95 - i * 0.1}"/>`).join('')
  + `<circle cx="420" cy="160" r="46" fill="#3d7bd8"/><path d="M406 130 q14 -10 22 6 q-10 14 -22 -6z M398 168 q16 6 22 22 q-18 4 -22 -22z" fill="#4aa86b"/>`
  + `<path d="M420 60 C500 70 506 250 420 260 C334 250 340 70 420 60 Z" fill="none" stroke="#7ee0b0" stroke-width="3" opacity=".85"/><path d="M420 30 C540 50 546 270 420 290 C294 270 300 50 420 30 Z" fill="none" stroke="#7ee0b0" stroke-width="2" opacity=".5"/>`
  + `<ellipse cx="420" cy="112" rx="22" ry="7" fill="#58f0a0" opacity=".85"/><ellipse cx="420" cy="208" rx="22" ry="7" fill="#58f0a0" opacity=".85"/>`);
// A storm cloud with a bolt, and a person far away.
const boltArt = () => svgURL(520, 320,
  `<g fill="#5b6675"><ellipse cx="170" cy="86" rx="92" ry="52"/><ellipse cx="280" cy="64" rx="104" ry="58"/><ellipse cx="380" cy="94" rx="86" ry="48"/><rect x="96" y="86" width="364" height="50" rx="25"/></g>`
  + `<path d="M290 130 L252 200 L284 200 L240 286 L322 188 L288 188 L318 130 Z" fill="#ffe27a" stroke="#fff3b0" stroke-width="3" stroke-linejoin="round"/>`
  + `<rect y="296" width="520" height="24" fill="#2c3a2c"/><circle cx="450" cy="278" r="9" fill="#e9eef5"/><rect x="443" y="287" width="14" height="22" rx="4" fill="#e9eef5"/>`);
// A rainforest in layers: the tall trees, the canopy, the understory and the floor.
const layersArt = () => svgURL(520, 400,
  `<rect width="520" height="400" fill="#10261c"/><rect y="0" width="520" height="95" fill="#18362a"/><rect y="95" width="520" height="130" fill="#1d4a34"/><rect y="225" width="520" height="105" fill="#26603f"/><rect y="330" width="520" height="70" fill="#4a3a2a"/>`
  + `<g fill="#2f8a4f">` + [60, 250, 430].map(x => `<ellipse cx="${x}" cy="62" rx="62" ry="30"/>`).join('') + `</g>`
  + `<g fill="#3fae63">` + [20, 110, 190, 270, 350, 430, 500].map((x, i) => `<ellipse cx="${x}" cy="${150 + (i % 2) * 14}" rx="50" ry="34"/>`).join('') + `</g>`
  + `<g stroke="#5b3d24" stroke-width="12">` + [60, 250, 430].map(x => `<path d="M${x} 90 V338"/>`).join('') + `</g>`
  + `<g fill="#58c47f">` + [30, 150, 330, 470].map((x, i) => `<path d="M${x} 330 q-30 -60 ${i % 2 ? 40 : -40} -80 q40 30 40 80z"/>`).join('') + `</g>`);
// A coral polyp with the algae living in its tissue.
const coralArt = () => svgURL(520, 400,
  `<rect width="520" height="400" fill="#0c3a5a"/><path d="M150 400 V250 Q150 200 260 200 Q370 200 370 250 V400 Z" fill="#f08a6a"/>`
  + Array.from({ length: 9 }, (_, i) => `<path d="M${170 + i * 22} 204 q${i % 2 ? -14 : 14} -70 ${i % 2 ? -4 : 6} -130" stroke="#ffb199" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')
  + Array.from({ length: 16 }, (_, i) => `<circle cx="${178 + (i * 37) % 170}" cy="${232 + (i * 53) % 130}" r="9" fill="#4fd18b"/>`).join('')
  + `<path d="M60 400 V330 q0 -40 40 -40 q40 0 40 40 V400 Z" fill="#c25aa0"/><path d="M400 400 V310 q0 -34 36 -34 q36 0 36 34 V400 Z" fill="#e3a63a"/>`);
// Three leaves: green, yellow and red.
const leavesArt = () => svgURL(520, 260,
  [['#3f9a4a', 20], ['#e2b72b', 190], ['#c8402c', 360]].map(([c, x]) => `<path d="M${x + 70} 20 C${x + 150} 70 ${x + 150} 170 ${x + 70} 230 C${x - 10} 170 ${x - 10} 70 ${x + 70} 20 Z" fill="${c}"/><path d="M${x + 70} 30 V250 M${x + 70} 110 L${x + 30} 80 M${x + 70} 110 L${x + 110} 80 M${x + 70} 160 L${x + 30} 130 M${x + 70} 160 L${x + 110} 130" stroke="#ffffff" stroke-opacity=".45" stroke-width="4" fill="none"/>`).join(''));
// The feudal pyramid: four tiers, narrow at the top.
const feudalArt = () => svgURL(520, 360,
  [['#d9a441', 'M260 10 L330 90 H190 Z'], ['#b8863a', 'M180 100 H340 L380 170 H140 Z'], ['#8f6a31', 'M130 180 H390 L430 250 H90 Z'], ['#6a4d28', 'M80 260 H440 L490 340 H30 Z']].map(([c, d]) => `<path d="${d}" fill="${c}" stroke="#1a1410" stroke-width="3"/>`).join(''));
// The Great Pyramid with one of the ramps proposed to build it.
const pyramidArt = () => svgURL(520, 340,
  `<rect y="290" width="520" height="50" fill="#d9b86a"/><path d="M60 290 L270 36 L480 290 Z" fill="#e8c878"/><path d="M270 36 L480 290 H350 Z" fill="#c9a24a"/>`
  + `<path d="M40 300 L300 120" stroke="#8f5a2a" stroke-width="18" stroke-linecap="round"/><path d="M40 300 L300 120" stroke="#c98a4a" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 12"/>`
  + `<circle cx="438" cy="60" r="26" fill="#ffd166"/>`);
// A map-like route: Scandinavia, Iceland, Greenland and Newfoundland, with the ship's path.
const routeArt = () => svgURL(600, 360,
  `<rect width="600" height="360" fill="#14323f"/>`
  + `<path d="M470 60 q40 -20 80 10 l10 80 q-30 40 -80 30 z" fill="#4c6b5a"/><path d="M270 80 q40 -10 60 20 l-20 40 q-40 0 -50 -30 z" fill="#4c6b5a"/><path d="M110 40 q60 -20 80 20 l-10 90 q-40 40 -70 0 z" fill="#d8e6ee"/><path d="M20 230 q60 -30 100 10 l10 50 q-60 30 -110 -10 z" fill="#4c6b5a"/>`
  + `<path d="M500 120 C420 100 380 130 300 110 C240 95 200 120 160 110 C110 130 90 200 60 250" stroke="#ffd166" stroke-width="5" fill="none" stroke-dasharray="4 12" stroke-linecap="round"/>`
  + [[500, 120], [300, 110], [160, 110], [60, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#ffd166" stroke="#14323f" stroke-width="3"/>`).join(''));
// The life of a star is a diagram; here, the orbit of the space station: Earth, its orbit and the station.
const orbitArt = () => svgURL(520, 380,
  `<circle cx="260" cy="200" r="120" fill="#2c6fc4"/><path d="M190 150 q40 -26 70 -6 q20 22 -14 44 q-40 8 -56 -38z M270 232 q40 -6 56 20 q-18 36 -48 20 q-20 -18 -8 -40z" fill="#4aa86b"/>`
  + `<ellipse cx="260" cy="200" rx="170" ry="170" fill="none" stroke="#ffd166" stroke-width="3" stroke-dasharray="6 10"/>`
  + `<rect x="418" y="150" width="34" height="14" rx="3" fill="#e9eef5"/><rect x="404" y="154" width="62" height="6" fill="#8fa4ff"/><rect x="432" y="136" width="6" height="42" fill="#8fa4ff"/>`);
// Saturn with its rings.
const saturnArt = () => svgURL(520, 340,
  `<ellipse cx="260" cy="170" rx="240" ry="60" fill="none" stroke="#d9c7a0" stroke-width="22" opacity=".9" transform="rotate(-16 260 170)"/>`
  + `<circle cx="260" cy="170" r="92" fill="#e3c88e"/><path d="M172 150 H348 M170 180 H350 M182 208 H338" stroke="#c9a46a" stroke-width="9" opacity=".8"/>`
  + `<path d="M24 210 q236 80 472 -80" stroke="#f1e3c0" stroke-width="14" fill="none" opacity=".95" transform="rotate(-16 260 170)" stroke-linecap="round"/>`);

// ---- The four decks --------------------------------------------------------------
const THEMES = {
  earth: { bg: '#15110f', panel: '#241a16', ac: '#ff9a4d', ac2: '#b5471c' },
  nature: { bg: '#0b1a14', panel: '#15291f', ac: '#5ed59a', ac2: '#1f7a4d' },
  history: { bg: '#18130e', panel: '#2a2118', ac: '#e3b054', ac2: '#8a5a1a' },
  space: { bg: '#090b1a', panel: '#151a33', ac: '#9db0ff', ac2: '#3b4fb8' },
};

export default {

  // 1 · La Tierra en movimiento
  show_motion_earth: { name: 'La Tierra en movimiento: volcanes, olas, auroras y tormentas', cat: 'showcase',
    summary: 'Cuatro fenómenos de la Tierra con vídeos en bucle de fondo hechos con IA: volcanes (magma, erupciones y La Palma 2021), olas y tsunamis, auroras y tormentas con rayos; con dibujos, tablas, un cálculo, una actividad de observar y un cuestionario',
    make: () => { const T = THEMES.earth, AM = '#ffb35c', BL = '#5fd0e6', GN = '#58f0a0', YE = '#ffd166';
      return numbered(ink(build({ name: 'La Tierra en movimiento: volcanes, olas, auroras y tormentas', palette: 'warm', fonts: 'editorial', title: { color: WH, size: 44 }, body: { color: WH } }, [
        cover(T, 'earth_volcano', 'CIENCIAS DE LA TIERRA · ESO Y BACHILLERATO', 'La Tierra en movimiento', 'Volcanes, olas, auroras y tormentas: cuatro fenómenos que muestran un planeta vivo. Vídeos generados con IA (ilustrativos).',
          'Portada. El vídeo de fondo es un bucle de 5 segundos generado con IA (una imagen de FLUX animada con Seedance 2.5): es ilustrativo, no una grabación real. Pregunta de arranque: ¿qué fenómeno de la naturaleza os impresiona más y por qué?'),
        plain(T, 'Cuatro fenómenos, una sola Tierra', [
          ...cardsRow(T, [['Volcanes', 'Magma que sube desde el interior', '#ff9a4d'], ['Olas', 'Energía que viaja por el mar', '#5fd0e6'], ['Auroras', 'El Sol y el campo magnético', '#58f0a0']], { w: 350 }),
          note('Y las tormentas: cómo nace un rayo y cómo calcular a qué distancia está.', 500)],
          'Índice. Cada fenómeno tiene su vídeo de fondo y una diapositiva con datos. Todo lo que aparece sobre el vídeo es ilustrativo.'),
        plain(T, 'Volcanes: del magma a la lava', [
          img(volcanoArt(), 70, 170, 560, 430, 'Un volcán en sección con su cámara de magma, el conducto y una nube de ceniza'),
          text('Nube de ceniza y gases', 440, 200, 330, 34, { fontSize: 24, color: GR }), text('Conducto', 360, 380, 200, 34, { fontSize: 24, color: WH }), text('Cámara magmática', 215, 603, 260, 34, { fontSize: 24, color: GR, textAlign: 'center' }),
          on(card('<b style="font-size:28px;color:#ffb35c">Magma y lava</b><br>Bajo tierra se llama <b>magma</b>; al salir a la superficie, <b>lava</b>. Los gases disueltos deciden si la erupción es suave o explosiva.', 780, 215, 420, 210, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: AM, borderWidth: 2 }), 'fade-left'),
          on(card('<b style="font-size:28px;color:#ffb35c">¿Por qué explota?</b><br>Un magma muy viscoso atrapa los gases: la presión crece hasta romper. Uno más fluido deja escapar el gas y fluye.', 780, 440, 420, 210, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: AM, borderWidth: 2 }), 'fade-left')],
          'Esquema simplificado de un volcán en sección. Magma y lava: mismo material, distinta posición. Efusiva (lava fluida, como en Hawái) frente a explosiva (magma viscoso con gases, como el Vesubio). Es un dibujo ilustrativo, no a escala.'),
        plain(T, 'Dónde hay volcanes y qué pasó en La Palma', [
          tbl(T, [['Dato', 'Qué sabemos'], ['Cinturón de Fuego del Pacífico', 'Rodea el océano Pacífico: concentra la mayoría de los volcanes activos y de los terremotos (aprox. 75 % y 90 %)'], ['Tipo de erupción', 'Efusiva: lava fluida · Explosiva: ceniza, gases y bombas volcánicas'],
            ['La Palma (Canarias), 2021', 'Erupción del 19 de septiembre al 13 de diciembre: 85 días, la más larga de la isla en tiempos históricos'], ['Cómo se vigila', 'Sismógrafos, medidores de gases y deformación del terreno, y satélites']], 90, 190, 1100, 360),
          note('Los datos son aproximados: comprueba las cifras más recientes en el Instituto Geográfico Nacional y el Instituto Geológico y Minero (IGN, IGME).', 580)],
          'Datos estables: la erupción del volcán de Tajogaite (Cumbre Vieja, La Palma) duró del 19 de septiembre al 13 de diciembre de 2021. Las cifras del Cinturón de Fuego son aproximadas. Pregunta: ¿por qué hay tantos volcanes en los bordes del Pacífico? (Tectónica de placas).'),
        chap(T, 'earth_ocean', 'OLAS Y OCÉANOS', 'La energía que viaja por el mar', ['Las olas las crea sobre todo el <b>viento</b>', 'Dependen de su fuerza, su duración y la distancia de mar abierto', 'Viaja la energía, no el agua'],
          'Capítulo del mar. Vídeo ilustrativo (IA). Idea clave: en una ola el agua sube y baja describiendo círculos; lo que avanza es la energía. Se puede lanzar un corcho al agua para verlo.'),
        plain(T, 'Anatomía de una ola y tsunamis', [
          img(waveArt(), 70, 170, 600, 346, 'Una ola dibujada con la longitud de onda entre dos crestas y la amplitud'),
          text('Longitud de onda', 250, 188, 300, 32, { fontSize: 22, color: YE }), text('Amplitud', 410, 440, 200, 32, { fontSize: 22, color: '#ff7a8a' }),
          on(card('<b style="font-size:27px;color:#5fd0e6">Un tsunami no es una ola de viento</b><br>Lo causa un terremoto, un deslizamiento o un volcán bajo el mar. Su longitud de onda es de cientos de kilómetros.', 720, 200, 480, 210, T.panel, { color: WH, radius: 16, fontSize: 22, borderColor: BL, borderWidth: 2 }), 'fade-left'),
          on(card('<b style="font-size:27px;color:#5fd0e6">Velocidad en mar abierto</b><br>v = √(g · h). Con h = 4.000 m: √(9,8 · 4.000) ≈ 198 m/s, unos <b>710 km/h</b> (aprox.).', 720, 430, 480, 190, T.panel, { color: WH, radius: 16, fontSize: 22, borderColor: BL, borderWidth: 2 }), 'fade-left')],
          'Cálculo para Bachillerato: la velocidad de las ondas largas en aguas profundas es √(g·h). Con 4.000 m de profundidad sale unos 198 m/s (aprox. 710 km/h). Al acercarse a la costa la profundidad baja, la velocidad disminuye y la altura de la ola crece. Ejemplo histórico: el tsunami del océano Índico (26 de diciembre de 2004). Ver más: Centro Internacional de Información sobre Tsunamis.'),
        chap(T, 'earth_aurora', 'AURORAS', 'Luces del viento solar', ['El Sol lanza partículas cargadas: el <b>viento solar</b>', 'El <b>campo magnético</b> de la Tierra las guía hacia los polos', 'Al chocar con el aire, brillan'],
          'Capítulo de las auroras. Vídeo ilustrativo (IA). Las auroras boreales (norte) y australes (sur) se ven mejor cerca de los polos y con cielo oscuro.'),
        plain(T, 'Cómo se forma una aurora', [
          img(auroraArt(), 60, 190, 600, 370, 'El Sol, el viento solar y la Tierra con su campo magnético'),
          text('Sol', 110, 448, 100, 30, { fontSize: 22, color: YE }), text('Viento solar', 215, 505, 200, 30, { fontSize: 22, color: GR }), text('Campo magnético', 450, 536, 260, 30, { fontSize: 22, color: GN }),
          tbl(T, [['Color', 'Gas y altura (aprox.)'], ['Verde', 'Oxígeno, a unos 100–150 km'], ['Rojo', 'Oxígeno, a más de 200 km'], ['Azul y violeta', 'Nitrógeno, a menos altura']], 700, 210, 510, 270, { fontSize: 22 }),
          text('Hay más auroras cuando el Sol está más activo (ciclo de unos 11 años).', 700, 500, 510, 90, { fontSize: 22, color: GR })],
          'Las partículas del viento solar, atrapadas por el campo magnético, bajan por los polos y excitan los átomos de la atmósfera. El color depende del gas y de la altura. Los números son aproximados.'),
        chap(T, 'earth_storm', 'TORMENTAS', 'Rayos, truenos y distancias', ['Las nubes de tormenta separan cargas eléctricas', 'El rayo calienta el aire y crea el trueno', 'Cuenta los segundos para saber a qué distancia está'],
          'Capítulo de las tormentas. Vídeo ilustrativo (IA).'),
        plain(T, 'A qué distancia está el rayo', [
          img(boltArt(), 60, 175, 560, 345, 'Una nube de tormenta con un rayo y una persona lejos'),
          on(card('<b style="font-size:28px;color:#ffd166">Regla de los segundos</b><br>El sonido recorre unos 343 m/s: cada <b>3 segundos</b> entre el relámpago y el trueno son aproximadamente <b>1 km</b>.', 660, 200, 540, 200, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: YE, borderWidth: 2 }), 'fade-left'),
          tbl(T, [['Segundos', 'Distancia (aprox.)'], ['3', '1 km'], ['9', '3 km'], ['15', '5 km']], 660, 420, 540, 190, { fontSize: 23 }),
          note('Si el trueno llega en menos de 30 segundos, busca refugio en un edificio o un coche cerrado.', 585, 60, 560)],
          'Cálculo: distancia (km) ≈ segundos ÷ 3. La luz llega casi al instante; el sonido tarda. Seguridad: no refugiarse bajo árboles aislados; alejarse del agua y de los objetos metálicos altos.'),
        observe(T, 'earth_volcano', 'Mira el volcán durante un minuto. ¿Qué ves moverse? ¿De qué color es la lava y por qué crees que brilla? Describe tres cosas con precisión.',
          'Actividad de observación: sirve para practicar vocabulario científico. La lava brilla por su temperatura (más de 1.000 °C, aprox.). Es un vídeo ilustrativo generado con IA: se puede comentar qué detalles son realistas y cuáles no.'),
        quizSlide(T, 'Si cuentas 6 segundos entre el relámpago y el trueno, ¿a qué distancia está el rayo?', ['A unos 2 km', 'A unos 6 km', 'A unos 18 km', 'A 600 m'], 0,
          'Respuesta: 6 ÷ 3 = 2 km (aprox.). Se puede repetir con otros tiempos.'),
        closing(T, 'earth_aurora', 'Un planeta vivo', ['Los volcanes reciclan el interior de la Tierra', 'Las olas y los tsunamis transportan energía', 'Las auroras vienen del Sol y del campo magnético', 'Un rayo está a 1 km por cada 3 segundos'],
          'Cierre. Recordar que los vídeos son ilustrativos y están hechos con IA.')
      ]), WH)); } },

  // 2 · Naturaleza en bucle
  show_motion_nature: { name: 'Naturaleza en bucle: selva, agua dulce, arrecifes y bosque', cat: 'showcase',
    summary: 'Cuatro ecosistemas con vídeos en bucle de fondo hechos con IA: la selva y sus capas, el ciclo del agua y las cascadas, los arrecifes de coral y su simbiosis, y por qué cambian de color las hojas en otoño; con dibujos, gráfico, tablas y cuestionario',
    make: () => { const T = THEMES.nature, GN = '#5ed59a', BL = '#6cc4f0', CO = '#ff9a7a', OR = '#f2a43a';
      return numbered(ink(build({ name: 'Naturaleza en bucle: selva, agua dulce, arrecifes y bosque', palette: 'esmeralda', fonts: 'editorial', title: { color: WH, size: 44 }, body: { color: WH } }, [
        cover(T, 'nat_jungle', 'BIOLOGÍA Y GEOLOGÍA · ESO Y BACHILLERATO', 'Naturaleza en bucle', 'Selva, agua dulce, arrecifes de coral y bosque de otoño: cuatro ecosistemas para mirar con calma y entender. Vídeos generados con IA (ilustrativos).',
          'Portada. El vídeo es un bucle de 5 segundos generado con IA (imagen de FLUX animada con Seedance 2.5): ilustrativo, no una grabación real. Pregunta de arranque: ¿qué ecosistema creéis que tiene más especies por metro cuadrado?'),
        plain(T, 'Cuatro ecosistemas', [
          ...cardsRow(T, [['Selva', 'La mayor biodiversidad en tierra', '#5ed59a'], ['Agua dulce', 'Ríos, lagos y cascadas', '#6cc4f0'], ['Arrecife', 'La selva del mar', '#ff9a7a']], { w: 350 }),
          note('Y el bosque caducifolio: por qué las hojas cambian de color en otoño.', 500)], 'Índice del recorrido. Todos los vídeos son ilustrativos y generados con IA.'),
        plain(T, 'La selva: cuatro pisos de vida', [
          img(layersArt(), 70, 170, 560, 430, 'Una selva dibujada en cuatro capas: árboles emergentes, dosel, sotobosque y suelo'),
          text('Emergentes', 650, 205, 220, 32, { fontSize: 24, color: GN }), text('Dosel', 650, 325, 220, 32, { fontSize: 24, color: GN }), text('Sotobosque', 650, 445, 220, 32, { fontSize: 24, color: GN }), text('Suelo', 650, 545, 220, 32, { fontSize: 24, color: GN }),
          on(card('Las selvas tropicales ocupan una pequeña parte de la superficie de la Tierra (aprox. 6 %), pero albergan <b>más de la mitad de las especies terrestres</b> (aprox.). Cada capa tiene su luz, su humedad y sus animales.', 890, 190, 320, 400, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: GN, borderWidth: 2 }), 'fade-left')],
          'Esquema simplificado de las capas de un bosque tropical (emergente, dosel, sotobosque y suelo). Las cifras de superficie y especies son aproximadas: comprueba el dato en WWF o la FAO. Actividad: ¿qué animal vive en cada capa?'),
        chap(T, 'nat_waterfall', 'AGUA DULCE', 'El agua que no es del mar', ['Solo aprox. un 2,5 % del agua del planeta es dulce', 'La mayor parte está en glaciares y hielo', 'Una cascada es erosión en acción'],
          'Capítulo del agua dulce. Vídeo ilustrativo (IA).'),
        plain(T, 'El ciclo del agua', [
          dg('cycle', 'Evaporación\nCondensación\nPrecipitación\nEscorrentía y ríos', 70, 185, 560, 430, { color: WH }),
          on(card('<b style="font-size:27px;color:#6cc4f0">Cascadas y erosión</b><br>El agua desgasta la roca blanda bajo la roca dura: el salto retrocede río arriba poco a poco. Así las cataratas del Niágara han ido retrocediendo.', 670, 195, 540, 230, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: BL, borderWidth: 2 }), 'fade-left'),
          on(card('<b style="font-size:27px;color:#6cc4f0">¿Cuánta agua dulce hay?</b><br>Casi el 70 % de la dulce está en glaciares y casquetes (aprox.); los ríos y lagos son una parte muy pequeña.', 670, 440, 540, 180, T.panel, { color: WH, radius: 16, fontSize: 22, borderColor: BL, borderWidth: 2 }), 'fade-left')],
          'El ciclo del agua: el Sol evapora, el vapor se condensa en nubes, precipita y vuelve por escorrentía y ríos. Cifras aproximadas del reparto de agua dulce (hielo, aguas subterráneas, superficie). Comprobar en el Servicio Geológico de EE. UU. (USGS).'),
        chap(T, 'nat_reef', 'ARRECIFES DE CORAL', 'La selva del mar', ['Ocupan menos del 1 % del fondo marino (aprox.)', 'Viven en ellos cerca de una cuarta parte de las especies marinas (aprox.)', 'Se forman por la acumulación de esqueletos de coral'],
          'Capítulo de los arrecifes. Vídeo ilustrativo (IA).'),
        plain(T, 'Coral y alga: una simbiosis', [
          img(coralArt(), 70, 170, 520, 400, 'Un pólipo de coral con tentáculos y algas diminutas dentro'),
          text('Tentáculos', 400, 205, 180, 30, { fontSize: 22, color: CO }), text('Algas (zooxantelas)', 70, 585, 260, 30, { fontSize: 22, color: GN }),
          on(card('<b style="font-size:27px;color:#5ed59a">Se necesitan</b><br>El alga hace la fotosíntesis y da azúcares al coral. El coral le da refugio y nutrientes. Es una <b>simbiosis</b>.', 650, 190, 560, 220, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: GN, borderWidth: 2 }), 'fade-left'),
          on(card('<b style="font-size:27px;color:#ff9a7a">Blanqueamiento</b><br>Si el agua se calienta demasiado durante semanas, el coral expulsa las algas y se queda blanco. Aún puede recuperarse si baja la temperatura.', 650, 430, 560, 200, T.panel, { color: WH, radius: 16, fontSize: 22, borderColor: CO, borderWidth: 2 }), 'fade-left')],
          'Esquema simplificado de un pólipo (sin escala). El blanqueamiento no es muerte inmediata: si el estrés cesa, el coral puede recuperar sus algas. Ejemplo para citar: la Gran Barrera de Coral, en Australia (unos 2.300 km, aprox.).'),
        chap(T, 'nat_forest', 'BOSQUE CADUCIFOLIO', 'Por qué se vuelven rojas las hojas', ['En otoño los días son más cortos y frescos', 'La clorofila (verde) se degrada', 'Aparecen los amarillos y naranjas que ya estaban, y nuevos rojos'],
          'Capítulo del bosque de otoño. Vídeo ilustrativo (IA).'),
        plain(T, 'Pigmentos de una hoja a lo largo del año', [
          img(leavesArt(), 60, 175, 560, 280, 'Tres hojas: una verde, una amarilla y una roja'),
          chartBlock({ x: 640, y: 175, w: 570, h: 420, chartType: 'line', color: GN, grid: true, labelColor: WH, yTitle: 'Cantidad relativa (ilustrativa)', seriesName: 'Clorofila (verde)',
            data: [{ label: 'Jun', value: 100 }, { label: 'Ago', value: 95 }, { label: 'Sep', value: 70 }, { label: 'Oct', value: 25 }, { label: 'Nov', value: 5 }],
            series: [{ name: 'Carotenoides (amarillo y naranja)', values: [30, 30, 30, 28, 20], color: OR }] }),
          text('Los datos del gráfico son ilustrativos.', 70, 480, 540, 40, { fontSize: 22, color: GR })],
          'Los carotenoides están en la hoja todo el año, pero la clorofila los tapa. Al degradarse, aparecen. Las antocianinas (rojos y púrpuras) se fabrican en otoño. El gráfico es esquemático, no son medidas reales.'),
        observe(T, 'nat_waterfall', 'Mira la cascada durante un minuto. ¿Qué se mueve y qué permanece quieto? ¿Qué ocurre con la niebla del fondo? Describe el sonido que imaginas.',
          'Actividad de observación: vocabulario del agua en movimiento. Se puede relacionar con el ciclo del agua y con la erosión. El vídeo es ilustrativo y está hecho con IA.'),
        quizSlide(T, '¿Qué pigmento hace que una hoja sea verde?', ['Carotenoides', 'Clorofila', 'Antocianinas', 'Melanina'], 1, 'Respuesta: la clorofila. Los carotenoides son amarillos y naranjas; las antocianinas, rojas y púrpuras.'),
        closing(T, 'nat_forest', 'Ecosistemas para cuidar', ['La selva guarda gran parte de la biodiversidad', 'El agua dulce es escasa y hay que cuidarla', 'El coral y el alga se necesitan', 'La luz y la temperatura cambian el color del bosque'],
          'Cierre. Los vídeos son ilustrativos.')
      ]), WH)); } },

  // 3 · Historia con atmósfera
  show_motion_history: { name: 'Historia con atmósfera: Roma, castillos, pirámides y vikingos', cat: 'showcase',
    summary: 'Cuatro escenas de historia con vídeos en bucle de fondo hechos con IA (ambientación artística, no reconstrucciones exactas): el Foro romano, el castillo y el feudalismo, las pirámides de Giza y los barcos vikingos; con línea de tiempo, esquemas, tabla y cuestionario',
    make: () => { const T = THEMES.history, GO = '#e3b054', RE = '#e0705a', BL = '#7fc4d8', GN = '#9ad07a', FT = 'Ambientación artística generada con IA: no es una reconstrucción exacta';
      return numbered(ink(build({ name: 'Historia con atmósfera: Roma, castillos, pirámides y vikingos', palette: 'grafito', fonts: 'editorial', title: { color: WH, size: 44 }, body: { color: WH } }, [
        cover(T, 'his_forum', 'HISTORIA · ESO Y BACHILLERATO', 'Historia con atmósfera', 'Roma, un castillo medieval, las pirámides y los vikingos. Vídeos de ambientación generados con IA: no son reconstrucciones exactas.',
          'Portada. Los vídeos de fondo son una ambientación artística generada con IA (imagen de FLUX animada con Seedance 2.5); no son reconstrucciones históricas exactas y pueden tener detalles inventados. Sirven para crear atmósfera y para discutir cómo se imagina el pasado.'),
        plain(T, 'Cuatro épocas, cuatro escenas', [
          ...cardsRow(T, [['Roma', 'Del Foro a un imperio', '#e3b054'], ['Edad Media', 'Castillos y señores', '#e0705a'], ['Egipto', 'Las pirámides de Giza', '#7fc4d8']], { w: 350 }),
          note('Y los vikingos: barcos, viajes y Vinland.', 500)], 'Índice. Insistir en que los vídeos son ambientación artística: la historia se conoce por fuentes, no por un vídeo.'),
        plain(T, 'Roma: de una ciudad a un imperio', [
          dg('timeline', '753 a. C.\nFundación de Roma (tradición)\n509 a. C.\nComienza la República\n27 a. C.\nAugusto, primer emperador\n212 d. C.\nEdicto de Caracalla: ciudadanía para los libres del Imperio\n476 d. C.\nCae el Imperio romano de Occidente', 70, 180, 1140, 330, { color: WH }),
          note('La fecha de 753 a. C. es la que da la tradición y la leyenda de Rómulo; la arqueología habla de una aldea anterior.', 560)],
          'Fechas de referencia. 753 a. C. es la fundación legendaria. El Foro Romano era el centro político, religioso y comercial. El Edicto de Caracalla (212) dio la ciudadanía a la mayoría de los habitantes libres. Comprobar en un manual o en un museo.'),
        chap(T, 'his_castle', 'EDAD MEDIA', 'El castillo y el señor', ['Un castillo defendía y también administraba el territorio', 'Los campesinos trabajaban la tierra del señor', 'Se llamaba feudalismo: protección a cambio de lealtad'],
          'Capítulo medieval. Ambientación artística, no un castillo concreto.', FT),
        plain(T, 'La pirámide feudal', [
          img(feudalArt(), 70, 170, 540, 380, 'Una pirámide de cuatro niveles'),
          text('Rey', 270, 222, 150, 30, { fontSize: 24, color: '#1a1410', textAlign: 'center', fontWeight: 700 }), text('Nobles', 245, 298, 200, 30, { fontSize: 24, color: '#1a1410', textAlign: 'center', fontWeight: 700 }), text('Caballeros', 215, 382, 260, 30, { fontSize: 24, color: WH, textAlign: 'center', fontWeight: 700 }), text('Campesinos', 215, 472, 260, 30, { fontSize: 24, color: WH, textAlign: 'center', fontWeight: 700 }),
          tbl(T, [['Quién', 'Qué daba / qué recibía'], ['Rey', 'Tierras a los nobles / ayuda militar'], ['Noble', 'Protección / lealtad y tropas'], ['Caballero', 'Combatía / un feudo o sueldo'], ['Campesino', 'Trabajo y rentas / protección']], 650, 200, 560, 330, { fontSize: 22 })],
          'Esquema simplificado: en la práctica había muchas más relaciones. La Edad Media se suele situar entre 476 y 1453 o 1492 (convención). Actividad: dibujar la pirámide de su localidad hoy y compararla.', FT),
        chap(T, 'his_pyramids', 'EGIPTO', 'Las pirámides de Giza', ['La Gran Pirámide (Keops) se construyó hacia el 2560 a. C. (aprox.)', 'Tenía unos 146 m de altura originales (aprox.)', 'Quienes la hicieron eran obreros organizados, no esclavos'],
          'Capítulo de Egipto. Ambientación artística, no una reconstrucción. El tema de quién la construyó se apoya en hallazgos de poblados de obreros y tumbas de trabajadores.', FT),
        plain(T, 'Cómo pudieron construirla: hipótesis', [
          img(pyramidArt(), 60, 170, 560, 350, 'La Gran Pirámide con una rampa apoyada en un lado'),
          tbl(T, [['Hipótesis', 'Idea'], ['Rampa recta', 'Un plano inclinado desde la cantera'], ['Rampa envolvente', 'Una rampa que gira alrededor de la pirámide'], ['Arena mojada', 'Menos fricción al arrastrar el trineo (estudio de 2014)'], ['Palancas y cuerdas', 'Para subir y colocar bloques']], 650, 190, 560, 360, { fontSize: 22 }),
          note('No hay una única respuesta: los arqueólogos siguen investigando.', 600, 70, 1140)],
          'Presentar como hipótesis, sin sensacionalismo ni teorías sin base. Son unos 2,3 millones de bloques (aprox.). Si queréis profundizar: Museo Egipcio, Instituto Francés de Arqueología Oriental.', FT),
        chap(T, 'his_viking', 'VIKINGOS', 'Barcos y viajes', ['Los drakkar eran ligeros y de poco calado: remontaban ríos', 'Usaban vela cuadrada y remos', 'Llegaron a Islandia, Groenlandia y América'],
          'Capítulo vikingo. Ambientación artística.', FT),
        plain(T, 'La ruta hacia el oeste', [
          img(routeArt(), 60, 170, 640, 384, 'Un mapa esquemático con una ruta de barco de Escandinavia a Terranova'),
          text('Escandinavia', 540, 356, 190, 30, { fontSize: 22, color: GO }), text('Islandia', 320, 325, 160, 30, { fontSize: 22, color: GO }), text('Groenlandia', 120, 165, 180, 30, { fontSize: 22, color: GO }), text('Vinland', 80, 485, 140, 30, { fontSize: 22, color: GO }),
          tbl(T, [['Año (aprox.)', 'Hecho'], ['870', 'Se asientan en Islandia'], ['985', 'Erik el Rojo, en Groenlandia'], ['1000', 'Leif Erikson llega a Vinland']], 740, 200, 470, 250, { fontSize: 22 }),
          text('En L’Anse aux Meadows (Terranova, Canadá) hay un asentamiento vikingo confirmado, Patrimonio Mundial de la UNESCO.', 740, 470, 470, 130, { fontSize: 21, color: GR })],
          'Mapa esquemático, sin escala. Las fechas son aproximadas y vienen de las sagas y de la arqueología. L’Anse aux Meadows es el único asentamiento vikingo en América confirmado hasta hoy.', FT),
        observe(T, 'his_forum', 'Mira el Foro un minuto. ¿Qué elementos reconoces? ¿Qué crees que el vídeo no puede saber sobre cómo era de verdad?',
          'Actividad crítica: distinguir qué es una fuente histórica y qué es una imaginación artística. En el Foro real había mucho más ruido, color (los templos estaban pintados) y gente.'),
        quizSlide(T, '¿Qué fue el feudalismo?', ['Un sistema de lealtades: protección a cambio de servicio', 'Un tipo de castillo', 'Un imperio de Oriente', 'La ley romana'], 0,
          'Respuesta: un sistema de relaciones personales entre señores, vasallos y campesinos.'),
        closing(T, 'his_viking', 'Imaginar el pasado, con cuidado', ['Roma pasó de ciudad a república e imperio', 'El feudalismo organizó la Edad Media', 'Las pirámides se explican con hipótesis', 'Los vikingos cruzaron el Atlántico'],
          'Cierre. Recordar que los vídeos son ambientación artística con IA.')
      ]), WH)); } },

  // 4 · Viaje por el espacio
  show_motion_space: { name: 'Viaje por el espacio: nebulosas, órbita, Marte y Saturno', cat: 'showcase',
    summary: 'Cuatro destinos del espacio con vídeos en bucle de fondo hechos con IA: una nebulosa y el nacimiento de las estrellas, la Tierra vista desde la órbita de la ISS, Marte (gravedad y rovers) y Saturno (sus anillos y su densidad); con cálculos, tablas, gráfico y cuestionario',
    make: () => { const T = THEMES.space, BL = '#9db0ff', PK = '#f08ad0', OR = '#ffb35c', GN = '#7fe0b8';
      return numbered(ink(build({ name: 'Viaje por el espacio: nebulosas, órbita, Marte y Saturno', palette: 'midnight', fonts: 'editorial', title: { color: WH, size: 44 }, body: { color: WH } }, [
        cover(T, 'spa_nebula', 'ASTRONOMÍA · ESO Y BACHILLERATO', 'Viaje por el espacio', 'Una nebulosa, la Tierra desde la órbita, Marte y Saturno: cuatro destinos para entender nuestro lugar en el cosmos. Vídeos generados con IA (ilustrativos).',
          'Portada. Los vídeos son bucles de 5 segundos generados con IA (imagen de FLUX animada con Seedance 2.5): ilustrativos, no imágenes reales de telescopio. Pregunta de arranque: ¿qué lugar del sistema solar os gustaría visitar y por qué?'),
        plain(T, 'Cuatro destinos', [
          ...cardsRow(T, [['Nebulosa', 'Donde nacen las estrellas', '#f08ad0'], ['Órbita', 'La Tierra desde la ISS', '#9db0ff'], ['Marte', 'El planeta rojo', '#ffb35c']], { w: 350 }),
          note('Y Saturno, el planeta de los anillos.', 500)], 'Índice del viaje. Todos los vídeos son ilustrativos.'),
        plain(T, 'Nebulosas: la cuna de las estrellas', [
          dg('cycle', 'Nube de gas y polvo\nProtoestrella\nEstrella\nGigante roja\nNebulosa planetaria o supernova', 70, 175, 600, 440, { color: WH }),
          on(card('<b style="font-size:27px;color:#f08ad0">¿Qué es una nebulosa?</b><br>Una enorme nube de gas (sobre todo hidrógeno) y polvo. Si la gravedad la hace colapsar, nace una estrella.', 700, 195, 510, 220, T.panel, { color: WH, radius: 16, fontSize: 23, borderColor: PK, borderWidth: 2 }), 'fade-left'),
          on(card('<b style="font-size:27px;color:#f08ad0">Un ejemplo</b><br>La nebulosa de Orión está a unos 1.300 años luz (aprox.) y se ve a simple vista en la espada de Orión, bajo el cinturón.', 700, 430, 510, 190, T.panel, { color: WH, radius: 16, fontSize: 22, borderColor: PK, borderWidth: 2 }), 'fade-left')],
          'Ciclo de vida de una estrella simplificado (las estrellas de poca masa terminan como nebulosa planetaria; las muy masivas, como supernova). Distancias aproximadas: comprobar en la ESA o la NASA.'),
        chap(T, 'spa_orbit', 'ÓRBITA TERRESTRE', 'La Tierra desde 400 km', ['La ISS vuela a unos 400 km de altura (aprox.)', 'Da una vuelta a la Tierra en unos 90 minutos', 'Ve unos 16 amaneceres al día (aprox.)'],
          'Capítulo de la órbita. Vídeo ilustrativo (IA).'),
        plain(T, 'Cuánto corre la Estación Espacial', [
          img(orbitArt(), 60, 170, 520, 380, 'La Tierra con la órbita de una estación espacial'),
          text('Órbita', 280, 160, 120, 30, { fontSize: 22, color: '#ffd166' }), text('Radio de la Tierra: 6.371 km', 150, 550, 340, 30, { fontSize: 22, color: GR }),
          tbl(T, [['Cálculo', 'Resultado (aprox.)'], ['Radio de la órbita: 6.371 + 400', '6.771 km'], ['Longitud de la órbita: 2π · 6.771', '≈ 42.500 km'], ['Tiempo por vuelta (aprox.)', '≈ 92 min = 1,53 h'], ['Velocidad: 42.500 ÷ 1,53', '≈ 27.700 km/h']], 620, 190, 590, 330, { fontSize: 22 }),
          note('Unos 7,7 km por segundo: más rápido que una bala.', 570, 620, 560)],
          'Cálculo para ESO/Bachillerato. La ISS orbita a unos 400 km y tarda unos 92 minutos en cada vuelta (se redondea a 90). Datos aproximados: comprobar en la NASA o la ESA.'),
        chap(T, 'spa_mars', 'MARTE', 'El planeta rojo', ['Su gravedad es solo el 38 % de la terrestre (aprox.)', 'Su polvo es rojizo por el óxido de hierro', 'Lo exploran robots: rovers como Curiosity y Perseverance'],
          'Capítulo de Marte. Vídeo ilustrativo (IA). Perseverance aterrizó en 2021 en el cráter Jezero y lleva el helicóptero Ingenuity (que voló en 2021-2024).'),
        plain(T, 'Tu peso en otros mundos', [
          tbl(T, [['Lugar', 'Gravedad (m/s²)', 'Una persona de 50 kg «pesa»…'], ['Tierra', '9,8', '50 kg'], ['Luna', '1,6', '≈ 8 kg'], ['Marte', '3,7', '≈ 19 kg'], ['Júpiter (nubes)', '24,8', '≈ 127 kg']], 90, 190, 1100, 330, { fontSize: 23 }),
          note('La masa no cambia; lo que cambia es la fuerza con la que el planeta te atrae (peso).', 570)],
          'Cálculo: la «masa equivalente» es masa × (g del lugar ÷ 9,8). Para Marte: 50 × 3,7 ÷ 9,8 ≈ 19 kg. Para la Luna: 50 × 1,6 ÷ 9,8 ≈ 8 kg. Aclarar la diferencia entre masa y peso.'),
        chap(T, 'spa_saturn', 'SATURNO', 'El planeta de los anillos', ['Sus anillos son sobre todo hielo de agua (aprox.)', 'Son enormes pero muy finos', 'Es menos denso que el agua'],
          'Capítulo de Saturno. Vídeo ilustrativo (IA). Titán es su mayor luna.'),
        plain(T, 'Saturno flotaría en el agua', [
          chartBlock({ x: 70, y: 180, w: 700, h: 430, chartType: 'hbar', color: BL, dataLabels: true, labelColor: WH, yTitle: 'Densidad media (g/cm³)', seriesName: 'Densidad',
            data: [{ label: 'Saturno', value: 0.69 }, { label: 'Agua', value: 1 }, { label: 'Urano', value: 1.27 }, { label: 'Júpiter', value: 1.33 }, { label: 'Neptuno', value: 1.64 }, { label: 'Tierra', value: 5.51 }] }),
          img(saturnArt(), 790, 190, 420, 280, 'Saturno con sus anillos'),
          text('Densidad menor que 1 g/cm³: flotaría en un océano imaginario lo bastante grande. Es un gigante gaseoso, sobre todo hidrógeno y helio.', 790, 480, 420, 140, { fontSize: 21, color: GR })],
          'Densidades medias aproximadas (g/cm³): Saturno 0,69; Júpiter 1,33; Urano 1,27; Neptuno 1,64; Tierra 5,51; agua 1,0. Es una comparación didáctica: no existe un océano tan grande.'),
        observe(T, 'spa_orbit', 'Mira la Tierra desde la órbita. ¿Qué ves en el borde del planeta? ¿Qué colores hay y de dónde crees que vienen? Describe lo que sentirías al verla.',
          'Actividad de observación. El vídeo es ilustrativo (IA): no es una imagen real. Se puede comparar con fotos reales de la ISS (NASA).'),
        quizSlide(T, '¿Cuánto «pesaría» en Marte una persona de 50 kg?', ['≈ 8 kg', '≈ 19 kg', '≈ 50 kg', '≈ 127 kg'], 1, 'Respuesta: ≈ 19 kg (50 × 3,7 ÷ 9,8).'),
        closing(T, 'spa_saturn', 'Nuestro lugar en el cosmos', ['Las estrellas nacen en nubes de gas y polvo', 'La ISS da una vuelta cada 90 minutos', 'En Marte pesarías el 38 % que en la Tierra', 'Saturno es menos denso que el agua'],
          'Cierre. Los vídeos son ilustrativos y generados con IA.')
      ]), WH)); } },
};
