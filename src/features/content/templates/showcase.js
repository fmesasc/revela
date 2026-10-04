// Example presentations: Catálogo de funciones. Each one: { name, summary, cat: 'showcase', make() } → a deck
// (see kit.js for the builders).
//
// Ten reference decks, one per feature, that go through ALL its options — one
// slide per group, with the name of each option (in Spanish, as the editor
// shows it, and its value in the file) under each example.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid } from './kit.js';
import { motionPoints } from '../../animation/transitions.js';
import { SHAPE_CATALOG } from '../../../render/svg.js';

// ---- Small helpers of this file ------------------------------------------------------
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
// A value as it is written in the file (transition: 'fade'…), in a monospaced type.
const code = s => `<span style="font-family:${MONO};font-size:.82em">${s}</span>`;
// A small uppercase label with wide spacing, above a title.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 5, color, ...props });
// The caption under an example: its name in bold and its value in the file below.
const cap = (label, value, x, y, w, color, props = {}) => text(`<div><b>${label}</b></div>${value ? `<div style="font-family:${MONO};font-size:.78em;opacity:.75">${value}</div>` : ''}`,
  x, y, w, value ? 62 : 34, { fontSize: 20, textAlign: 'center', color, lineHeight: 1.25, ...props });
// A pill with a word in it.
const pill = (html, x, y, w, bg, color, props = {}) => text(`<div>${html}</div>`, x, y, w, 34, { fontSize: 16, bg, color, radius: 17, pad: [0, 10, 0, 10], textAlign: 'center', vAlign: 'middle', ...props });
// A picture drawn in SVG, as a data URL (images with no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const image = (src, x, y, w, h, alt, props = {}) => ({ id: uid(), x, y, w, h, rotation: 0, animation: null, type: 'image', src, alt, fit: 'cover', ...props });
// Same object on several slides (Transform): the same id.
const same = (id, b) => ({ ...b, id });
// A stroke through points on the slide: an ink object, so it can be drawn as you present (effect 'draw').
const ink = (pts, color, width = 4, props = {}) => {
  // (at least 80 px each way: very thin boxes are drawn taller than they are)
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), px = Math.max(6, (80 - (Math.max(...xs) - Math.min(...xs))) / 2), py = Math.max(6, (80 - (Math.max(...ys) - Math.min(...ys))) / 2);
  const x = Math.min(...xs) - px, y = Math.min(...ys) - py, w = Math.max(...xs) - x + px, h = Math.max(...ys) - y + py;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// A grid of cells: the x and y of cell i (cols across, from x0/y0, each dx/dy apart).
const cell = (i, cols, x0, y0, dx, dy) => [x0 + (i % cols) * dx, y0 + Math.floor(i / cols) * dy];

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · Every slide transition: each slide comes in with one and (many) leave with
  // another, at different speeds; the strip at the bottom says where we are.
  showcase_transitions: { name: 'Catálogo: transiciones', cat: 'showcase', summary: 'Las 22 transiciones de diapositiva, una a una: entrada, salida distinta, direcciones, velocidad y avance automático', make: () => {
    const p = PALETTES.revela, C = p.accents, OLD = '#3a4252', W = '#f2f5fa', DIM = '#9aa4b5';
    const H = pairStacks('modern').heading;
    const BGS = ['#101317', '#121a2b', '#1a1430', '#0f2225', '#24170f', '#141a12', '#1d1220'];
    // [value, name, what it does, exit (value, name), speed, direction (value, name)]
    const T = [
      ['fade', 'Fundido', 'La nueva aparece mientras la anterior se desvanece. La más discreta: vale para casi todo.', ['none', 'Ninguna'], '', null],
      ['slide', 'Deslizar', 'La nueva entra desde un lado y empuja el ritmo hacia delante. La clásica de reveal.js.', ['cover', 'Cubrir'], 'fast', null],
      ['push', 'Empujar', 'La nueva empuja a la anterior fuera de la pantalla. Se elige desde dónde: abajo, arriba, derecha o izquierda.', ['drop', 'Desde arriba'], '', ['top', 'Desde arriba']],
      ['convex', 'Convexa', 'Las dos giran como sobre un cilindro visto por fuera. Con su pareja, Cóncava, por dentro.', ['concave', 'Cóncava'], '', null],
      ['zoom', 'Zoom', 'La nueva crece desde el centro: perfecta para entrar en un tema o en un detalle.', ['shrink', 'Encoger'], 'slow', null],
      ['flip', 'Voltear', 'Se da la vuelta como una tarjeta sobre su eje vertical.', ['rise', 'Elevar'], '', null],
      ['wipe', 'Barrido', 'Un borde recto barre la pantalla y descubre la nueva. Desde la derecha, izquierda, abajo o arriba.', ['fall', 'Caer'], '', ['left', 'Desde la izquierda']],
      ['split', 'Dividir', 'Se abre desde el centro como dos puertas, en vertical o en horizontal.', ['swirl', 'Remolino'], 'fast', ['horizontal', 'Horizontal']],
      ['circle', 'Círculo', 'La nueva se asoma por un círculo que crece desde el centro.', ['blur', 'Desenfocar'], '', null],
      ['diamond', 'Rombo', 'Como el círculo, pero por un rombo: un toque más geométrico.', ['flash', 'Destello'], '', null],
      ['cube', 'Cubo', 'Las dos son caras de un cubo que gira. Muy vistosa: mejor para cambios de bloque.', null, 'slow', null],
      ['page', 'Página', 'La anterior se pasa como la hoja de un libro. Esta diapositiva avanza sola a los 6 segundos.', null, '', null],
      ['gallery', 'Galería', 'Las diapositivas se desplazan como cuadros en una pared, una junto a otra.', null, '', null],
    ];
    const SPEED = { fast: 'Rápida', slow: 'Lenta', '': 'Normal' };
    // A sketch of what each transition does: the old slide (grey) and the new one (colour).
    const BX = 730, BY = 175, BW = 450, BH = 300;
    const sketch = (kind, c) => {
      const o = (x, y, w, h, pr = {}) => shape('rounded', BX + x, BY + y, w, h, OLD, { radius: 10, ...pr });
      const n = (k, x, y, w, h, pr = {}) => shape(k, BX + x, BY + y, w, h, c, { radius: 10, ...pr });
      const full = () => o(45, 40, 360, 220);
      switch (kind) {
        case 'fade': return [o(45, 40, 300, 190), n('rounded', 105, 70, 300, 190, { opacity: 70 })];
        case 'slide': return [o(-10, 50, 220, 200, { opacity: 60 }), n('rounded', 230, 50, 220, 200), shape('leftarrow', BX + 150, BY + 125, 120, 50, W)];
        case 'push': return [n('rounded', 95, -20, 260, 150), o(95, 150, 260, 150), shape('downarrow', BX + 200, BY + 95, 50, 110, W)];
        case 'convex': return [o(30, 60, 190, 190, { rotation: -14 }), n('rounded', 230, 60, 190, 190, { rotation: 14 })];
        case 'zoom': return [full(), n('rounded', 165, 110, 120, 80), shape('quadarrow', BX + 175, BY + 95, 100, 100, W, { opacity: 85 })];
        case 'flip': return [o(60, 40, 200, 220, { opacity: 50 }), n('parallelogram', 200, 40, 200, 220)];
        case 'wipe': return [full(), n('rect', 45, 40, 190, 220), shape('rect', BX + 233, BY + 30, 6, 240, W)];
        case 'split': return [full(), n('rect', 45, 105, 360, 90), shape('updownarrow', BX + 200, BY + 30, 50, 240, W, { opacity: 80 })];
        case 'circle': return [full(), n('ellipse', 140, 65, 170, 170)];
        case 'diamond': return [full(), n('diamond', 130, 55, 190, 190)];
        case 'cube': return [n('cube', 105, 20, 240, 240)];
        case 'page': return [full(), n('foldedcorner', 45, 40, 250, 220)];
        case 'gallery': return [o(-5, 90, 120, 120), n('rounded', 135, 50, 180, 200), o(335, 90, 120, 120)];
        default: return [];
      }
    };
    const strip = cur => T.map(([, name], i) => pill(name, 90 + i * 84.5 | 0, 650, 80, i === cur ? C[i % 5] : '#ffffff12', i === cur ? '#ffffff' : DIM, { fontSize: 14, pad: [0, 2, 0, 2] }));
    const slides = T.map(([v, name, what, out, speed, dir], i) => {
      const c = C[i % 5], bg = BGS[i % BGS.length], val = dir ? `${v}-${dir[0]}` : v;
      return { layout: 'blank', bg, transition: v, ...(dir && { transitionDir: dir[0] }), ...(out && { transitionOut: out[0] }), ...(speed && { transitionSpeed: speed }),
        ...(v === 'gallery' && { autoSlide: 0 }), ...(v === 'page' && { autoSlide: 6000 }),
        extra: [
          glow(-200, -260, 700, c, bg, 30),
          kicker(`DIAPOSITIVA ${String(i + 1).padStart(2, '0')} DE ${T.length} · ENTRA CON`, 90, 110, 600, c),
          text(name, 86, 145, 620, 120, { fontFamily: H, fontSize: 92, color: W, lineHeight: 1.05 }),
          text(code(`transition: '${v}'`) + (dir ? `<br>${code(`transitionDir: '${dir[0]}'`)} · ${dir[1]}` : ''), 90, 272, 620, dir ? 70 : 40, { fontSize: 22, color: c, lineHeight: 1.45 }),
          text(what, 90, dir ? 360 : 330, 600, 130, { fontSize: 26, color: '#d5dbe6', lineHeight: 1.35 }),
          pill(`Velocidad: <b>${SPEED[speed]}</b>`, 90, 520, 200, '#ffffff14', W, { fontSize: 17 }),
          pill(out ? `Sale con: <b>${out[1]}</b> ${code(`'${out[0]}'`)}` : i === T.length - 1 ? 'Es la última diapositiva' : 'Sale con: la de la siguiente', 300, 520, 330, out ? c + '55' : '#ffffff14', W, { fontSize: 17 }),
          shape('rounded', BX - 20, BY - 25, BW + 40, BH + 95, '#ffffff', { opacity: 5, radius: 22 }),
          ...sketch(v, c),
          text(`<span style="color:${OLD}">■</span> la anterior &nbsp; <span style="color:${c}">■</span> la nueva`, BX, BY + BH + 20, BW, 34, { fontSize: 17, color: DIM, textAlign: 'center' }),
          ...strip(i)],
        notes: `${name} (${val}). ${what}${out ? ` Al salir de esta diapositiva se usa otra: ${out[1]} (Transiciones ▸ Opciones ▸ Salida).` : ''}${speed ? ` Velocidad ${SPEED[speed].toLowerCase()} solo en esta diapositiva.` : ''}${v === 'page' ? ' Avance automático: Transiciones ▸ Avance automático (s): 6.' : ''}` };
    });
    const groups = [['Básicas', ['Ninguna', 'Fundido', 'Deslizar', 'Empujar', 'Convexa', 'Cóncava', 'Zoom']], ['En 3D', ['Voltear', 'Cubo', 'Página', 'Galería', 'Caer']],
      ['Por una forma', ['Barrido', 'Dividir', 'Círculo', 'Rombo']], ['Efectos', ['Elevar', 'Cubrir', 'Desde arriba', 'Remolino', 'Encoger', 'Desenfocar', 'Destello']]];
    return build({ name: 'Catálogo: transiciones', palette: 'revela', fonts: 'modern', title: { color: W } }, [
      { layout: 'blank', bg: '#101317', extra: [
        glow(700, -300, 900, C[0], '#101317', 45), glow(-300, 300, 700, C[4], '#101317', 30),
        kicker('CATÁLOGO DE FUNCIONES · 1', 90, 90, 600, C[1]),
        text('Todas las transiciones', 86, 125, 1000, 110, { fontFamily: H, fontSize: 76, color: W }),
        text('22 maneras de pasar de una diapositiva a otra. Cada una entra con la suya; muchas salen con otra distinta.', 90, 235, 1000, 50, { fontSize: 26, color: '#c4ccd8' }),
        ...groups.flatMap(([g, names], r) => [text(g, 90, 320 + r * 78, 200, 40, { fontSize: 22, color: C[r], fontWeight: 700, vAlign: 'middle' }),
          ...names.map((nm, k) => pill(nm, 270 + k * 131, 323 + r * 78, 124, '#ffffff10', W, { fontSize: 16, pad: [0, 4, 0, 4], borderColor: C[r] + '88' }))]),
        text('Pulsa → para verlas en acción · Transiciones ▸ elige una, su salida, dirección y velocidad', 90, 640, 1100, 40, { fontSize: 20, color: DIM })],
        notes: 'Una diapositiva por transición: su nombre, cómo se escribe y un dibujo de lo que hace. Abajo, la tira marca en cuál estamos. Transiciones ▸ Aplicar a todas la copia en toda la presentación.' },
      ...slides,
    ]);
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · Every object animation: entrance, emphasis and exit, motion paths, drawing,
  // starting with or after the one before, sounds, and several on one object.
  showcase_animations: { name: 'Catálogo: animaciones', cat: 'showcase', summary: 'Todas las animaciones de objeto: entrada, énfasis, salida, trayectorias, dibujar, encadenadas, sonidos y varias en un objeto', make: () => {
    const p = PALETTES.ocean, C = p.accents, BG = '#0f2940', W = '#f2f6fa', DIM = '#a9bdd1', CARD = '#ffffff10';
    const H = pairStacks('friendly').heading;
    const tile = (label, value, x, y, w, h, c) => card(`<div style="font-size:26px;font-weight:700;color:${W}">${label}</div><div style="font-family:${MONO};font-size:17px;color:${c};margin-top:6px">${value}</div>`,
      x, y, w, h, CARD, { fontSize: 22, textAlign: 'center', vAlign: 'middle', borderColor: c + '66', pad: [10, 12, 10, 12] });
    const IN = [['Aparecer', 'fade-in'], ['Desde abajo', 'fade-up'], ['Desde arriba', 'fade-down'], ['Desde la derecha', 'fade-left'], ['Desde la izquierda', 'fade-right'],
      ['Acercar', 'zoom-in'], ['Crecer', 'grow'], ['Encoger', 'shrink'], ['Girar', 'spin'], ['Voltear', 'flip'], ['Rebotar', 'bounce']];
    const EMPH = [['Vuelta completa', 'spin360'], ['Resaltar en rojo', 'highlight-red'], ['Resaltar en verde', 'highlight-green'], ['Resaltar en azul', 'highlight-blue'],
      ['Rojo mientras dura', 'highlight-current-red'], ['Verde mientras dura', 'highlight-current-green'], ['Azul mientras dura', 'highlight-current-blue'], ['Tachar', 'strike']];
    const OUT = [['Desaparecer', 'fade-out', 'Está y se va.'], ['Atenuar', 'semi-fade-out', 'Se queda a media luz.'], ['Aparecer y desaparecer', 'fade-in-then-out', 'Entra y se va en el paso siguiente.'],
      ['Aparecer y atenuar', 'fade-in-then-semi-out', 'Entra y queda a media luz después.'], ['Solo en su paso', 'current-visible', 'Se ve únicamente en su clic.']];
    const PATHS = [['Línea', "pathShape: 'line'", { pathShape: 'line', dx: 240, dy: 0 }], ['Arco', "pathShape: 'arc'", { pathShape: 'arc', dx: 240, dy: 0 }],
      ['Onda', "pathShape: 'wave'", { pathShape: 'wave', dx: 240, dy: 0 }], ['Bucle', "pathShape: 'loop'", { pathShape: 'loop', dx: 240, dy: 0 }],
      ['Dibujado a mano', "pathShape: 'custom'", { pathShape: 'custom', points: [[0, 0], [50, -60], [110, 10], [170, -50], [240, 0]], dx: 240, dy: 0 }],
      ['Gira con el camino', "turn: 'follow'", { pathShape: 'custom', points: [[0, 0], [70, -70], [150, -10], [200, -70], [240, -20]], dx: 240, dy: -20, turn: 'follow' }]];
    const SOUNDS = [['Clic', 'click', 'ellipse'], ['Pop', 'pop', 'burst'], ['Campanilla', 'chime', 'star'], ['Silbido', 'whoosh', 'rightarrow'], ['Redoble', 'drumroll', 'cylinder'], ['Aplausos', 'applause', 'smiley']];
    const heart = Array.from({ length: 60 }, (_, i) => { const a = i / 59 * 2 * Math.PI; return [Math.round(260 + 120 * Math.pow(Math.sin(a), 3)), Math.round(330 - (98 * Math.cos(a) - 38 * Math.cos(2 * a) - 15 * Math.cos(3 * a) - 8 * Math.cos(4 * a)))]; });
    const sign = Array.from({ length: 50 }, (_, i) => { const t = i / 49; return [Math.round(820 + 330 * t), Math.round(560 - 26 * Math.sin(t * Math.PI * 5) - 20 * t)]; });
    return numbered(build({ name: 'Catálogo: animaciones', palette: 'ocean', fonts: 'friendly', title: { color: W, size: 46 },
      decor: () => [shape('rect', 0, 700, 1280, 20, C[0], { fill2: C[3], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, extra: [
        glow(760, -220, 760, C[0], BG, 50), glow(-260, 360, 640, C[5], BG, 35),
        kicker('CATÁLOGO DE FUNCIONES · 2', 90, 140, 600, C[2]),
        { ...text('Animaciones', 84, 170, 900, 150, { fontFamily: H, fontSize: 120, wordart: 'gold' }), animation: A('zoom-in', { duration: 900 }) },
        { ...text('Todas las que puede tener un objeto, con su nombre y cómo se escribe', 90, 330, 1100, 50, { fontSize: 30, color: W }), animation: A('fade-up', { start: 'afterPrev' }) },
        ...[['Entrada', 11], ['Énfasis', 8], ['Salida', 5], ['Trayectorias', 6], ['Dibujar', 1], ['Sonidos', 6]].map(([n, k], i) =>
          withAnims(pill(`<b>${n}</b> · ${k}`, 90 + i * 180, 430, 168, CARD, W, { fontSize: 19, borderColor: C[i] }), A('fade-up', { start: 'afterPrev', duration: 350 }))),
        text('Animaciones ▸ Añadir animación · el Panel de animación ordena, encadena y cambia la duración', 90, 520, 1000, 40, { fontSize: 22, color: DIM })],
        notes: 'Hasta las de la portada están animadas: el título entra al hacer clic y el resto lo sigue sin más clics («después de la anterior»).' },
      { title: 'Entrada: once maneras de aparecer', layout: 'titleOnly', bg: BG, extra: [
        ...IN.map(([n, v], i) => { const [x, y] = cell(i, 4, 90, 175, 280, 160); return withAnims(tile(n, `'${v}'`, x, y, 260, 140, C[i % 6]), A(v, { start: i ? 'afterPrev' : 'click', duration: 650 })); }),
        card('<b>Un solo clic</b><br>y todas en cadena, cada una «después de la anterior».', 930, 495, 260, 140, '#4a90d933', { fontSize: 20, color: W, vAlign: 'middle', textAlign: 'center' })],
        notes: 'Cada tarjeta entra con el efecto que lleva escrito. Solo la primera espera al clic; las demás van «después de la anterior».' },
      { title: 'Énfasis: el objeto ya está y llama la atención', layout: 'titleOnly', bg: BG, extra: EMPH.flatMap(([n, v], i) => {
        const [x, y] = cell(i, 4, 90, 180, 280, 240), demo = v === 'spin360' ? shape('star', x + 85, y + 10, 90, 90, C[2])
          : text(v === 'strike' ? 'Precio: 49 €' : 'Revela', x, y + 20, 260, 70, { fontSize: 40, textAlign: 'center', color: W, fontWeight: 700 });
        return [shape('rounded', x, y - 10, 260, 220, '#ffffff', { opacity: 6, radius: 18 }), withAnims(demo, A(v, { duration: 900 })), cap(n, `'${v}'`, x, y + 125, 260, W)]; }),
        notes: 'Ocho clics, uno por efecto. «Mientras dura» resalta solo durante su paso y vuelve a su color en el siguiente.' },
      { title: 'Salida: irse o quedarse a media luz', layout: 'titleOnly', bg: BG, extra: OUT.flatMap(([n, v, d], i) => { const x = 90 + i * 225;
        return [withAnims(shape('ellipse', x + 35, 200, 140, 140, C[i], { fill2: C[(i + 3) % 6], gradType: 'radial' }), A(v, { duration: 700 })),
          cap(n, `'${v}'`, x - 5, 370, 220, W), text(d, x, 445, 210, 90, { fontSize: 19, color: DIM, textAlign: 'center' })]; }),
        notes: 'Las de salida parten de un objeto visible: al hacer clic se va (o se atenúa). Las dos de «aparecer y…» entran primero y se van al paso siguiente.' },
      { title: 'Trayectorias: seis caminos', layout: 'titleOnly', bg: BG, extra: PATHS.flatMap(([n, v, a], i) => {
        const [x, y] = cell(i, 3, 90, 170, 375, 255), sx = x + 40, sy = y + (a.pathShape === 'loop' ? 70 : 130), pts = motionPoints(a, 40);
        const obj = a.turn ? shape('chevron', sx - 26, sy - 22, 52, 44, C[2]) : shape('ellipse', sx - 22, sy - 22, 44, 44, C[i % 6]);
        return [shape('rounded', x, y, 350, 230, '#ffffff', { opacity: 6, radius: 18 }), ink(pts.map(([px, py]) => [sx + px, sy + py]), '#ffffff40', 2),
          withAnims(obj, A('path', { ...a, duration: 2600, start: i ? 'withPrev' : 'click' })), cap(n, v, x, y + 168, 350, W)]; }),
        notes: 'Un clic y las seis a la vez («con la anterior»). La línea fina es el camino. Animaciones ▸ Dibujar recorrido para trazarlo a mano; en el Panel de animación, «Giro en el camino».' },
      { title: 'Dibujar: se traza solo al presentar', layout: 'titleOnly', bg: BG, extra: [
        withAnims(ink(heart, '#ff6b81', 9), A('draw', { duration: 2200 })),
        withAnims(shape('star', 520, 205, 240, 240, C[2], { stroke: W, strokeWidth: 3, sketch: true }), A('draw', { duration: 1800, start: 'afterPrev' })),
        withAnims(ink(sign, C[3], 5), A('draw', { duration: 1600, start: 'afterPrev' })),
        withAnims(shape('sun', 840, 230, 120, 120, C[2]), A('path', { pathShape: 'line', dx: 250, dy: 0, spin: 720, duration: 2200, start: 'click' })),
        cap('Un dibujo a mano', "effect: 'draw'", 140, 470, 240, W), cap('Una forma', "'draw' · sketch", 520, 470, 240, W),
        cap('Una firma', "'draw'", 840, 600, 340, W, { y: 600 }), cap('Rodar: camino + giro', 'spin: 720', 840, 380, 340, W)],
        notes: 'El efecto Dibujar traza los dibujos a mano y el contorno de las formas como si se hicieran en directo. El sol rueda: es una trayectoria con dos vueltas de giro (spin: 720).' },
      { title: 'Cuándo empieza cada una', layout: 'titleOnly', bg: BG, extra: [
        ...[['Al hacer clic', "start: 'click'", {}], ['Con la anterior', "start: 'withPrev'", { start: 'withPrev' }], ['Después de la anterior', "start: 'afterPrev'", { start: 'afterPrev' }],
          ['Después, con retraso y más lenta', "delay: 800 · duration: 1500", { start: 'afterPrev', delay: 800, duration: 1500 }]].flatMap(([n, v, o], i) => { const y = 185 + i * 112;
          return [text(`<div><b>${n}</b></div><div style="font-family:${MONO};font-size:18px;color:${C[i]}">${v}</div>`, 90, y, 430, 80, { fontSize: 26, color: W, vAlign: 'middle' }),
            shape('rounded', 540, y + 12, 650, 56, '#ffffff', { opacity: 6, radius: 12 }),
            withAnims(shape('rounded', 540, y + 12, 650 - i * 90, 56, C[i], { radius: 12, fill2: C[(i + 1) % 6], gradAngle: 0 }), A('fade-right', { duration: 700, ...o }))]; }),
        text('Un clic arranca las cuatro barras: la segunda a la vez que la primera, la tercera al terminar ellas y la cuarta espera 0,8 s.', 90, 630, 1100, 40, { fontSize: 20, color: DIM })],
        notes: 'En el Panel de animaciones: Inicio (al hacer clic, con la anterior, después de la anterior), Retraso y Duración de cada una.' },
      { title: 'Con sonido', layout: 'titleOnly', bg: BG, extra: SOUNDS.flatMap(([n, v, k], i) => { const [x, y] = cell(i, 3, 90, 180, 375, 245);
        return [shape('rounded', x, y, 350, 220, '#ffffff', { opacity: 6, radius: 18 }),
          withAnims(shape(k, x + 125, y + 25, 100, 100, C[i], k === 'smiley' || k === 'cylinder' ? {} : { stroke: W, strokeWidth: 0 }), A(i % 2 ? 'bounce' : 'zoom-in', { sound: v, duration: 700 })),
          cap(n, `sound: '${v}'`, x, y + 145, 350, W)]; }),
        notes: 'Seis clics, seis sonidos (hechos en el navegador, sin archivos). Panel de animación ▸ Sonido; también se puede poner uno propio.' },
      { title: 'Varias animaciones en un mismo objeto', layout: 'titleOnly', bg: BG, extra: [
        ...[['1', 'Entra', "'zoom-in' · clic"], ['2', 'Da una vuelta', "'spin360' · después"], ['3', 'Viaja en onda', "'path' · después"], ['4', 'Se va', "'fade-out' · clic"]].map(([k, n, v], i) =>
          card(`<div style="font-size:30px;font-weight:800;color:${C[i]}">${k}</div><div><b>${n}</b></div><div style="font-family:${MONO};font-size:16px;color:${DIM}">${v}</div>`,
            90 + i * 280, 175, 260, 150, CARD, { fontSize: 22, color: W, textAlign: 'center', vAlign: 'middle' })),
        ink(motionPoints({ pathShape: 'wave', dx: 820, dy: 0 }, 40).map(([px, py]) => [220 + px, 520 + py]), '#ffffff40', 2),
        withAnims(shape('star', 150, 450, 140, 140, C[2], { stroke: W, strokeWidth: 2 }), A('zoom-in'), A('spin360', { start: 'afterPrev', duration: 900 }),
          A('path', { pathShape: 'wave', dx: 820, dy: 0, start: 'afterPrev', duration: 2400 }), A('fade-out', { start: 'click' })),
        text('Dos clics en total: el resto va solo', 90, 345, 600, 40, { fontSize: 20, color: DIM })],
        notes: 'Un objeto puede llevar todas las animaciones que haga falta (Animaciones ▸ Añadir animación). Aquí cuatro: dos esperan al clic y dos van solas detrás.' },
      { layout: 'blank', bg: BG, extra: [glow(380, 60, 520, C[0], BG, 45),
        text('Dónde está cada cosa', 140, 120, 1000, 90, { fontFamily: H, fontSize: 64, color: W, textAlign: 'center' }),
        ...[['Añadir animación', 'Para poner otra más al mismo objeto'], ['Panel de animaciones', 'Orden, inicio, retraso y duración'], ['Dibujar recorrido', 'Un camino a mano, con el ratón o el dedo'], ['Sonido', 'Seis sonidos o uno propio']].map(([h, d], i) => {
          const [x, y] = cell(i, 2, 150, 260, 500, 150);
          return withAnims(card(`<div style="font-size:28px;font-weight:700;color:${C[i]}">${h}</div><div style="margin-top:6px">${d}</div>`, x, y, 470, 125, CARD, { fontSize: 22, color: W, vAlign: 'middle' }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 450 })); })],
        notes: 'Todo está en la pestaña Animaciones. El botón Probar las reproduce en el editor sin presentar.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 3 · 3D in depth: camera views, moves on arrival, turning by itself, edges and
  // room around the model, its own animations, walking a path, and Transform.
  showcase_3d: { name: 'Catálogo: el 3D a fondo', cat: 'showcase', summary: 'Modelos 3D con todas sus opciones: vistas, movimientos al entrar, giro, bordes, margen, clips, andar y llegada con Transformar', make: () => {
    const p = PALETTES.midnight, C = p.accents, BG = '#0b0f19', W = '#e6e9ef', DIM = '#8f9bb3', H = pairStacks('tech').heading;
    const hub = uid(), knight = { walk: 'Walking_A', end: 'Cheer' };
    const frame = (x, y, w, h, c = '#ffffff') => shape('rounded', x, y, w, h, c, { opacity: 5, radius: 16 });
    const box = (x, y, w, h) => shape('rect', x, y, w, h, 'none', { stroke: '#7aa2f7', strokeWidth: 1.5, dash: 'dash' });
    const hubble = (x, y, w, h, props) => same(hub, nasa('hubble-space-telescope-a', x, y, w, h, { caption: '', autoRotate: false, ...props }));
    const credit = t => text(t, 90, 668, 1100, 28, { fontSize: 14, color: '#5d6884' });
    return numbered(build({ name: 'Catálogo: el 3D a fondo', palette: 'midnight', fonts: 'tech', title: { color: W, size: 46 },
      decor: () => [shape('rect', 0, 0, 1280, 6, C[0], { fill2: C[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, extra: [
        glow(640, -200, 820, C[1], BG, 40), glow(-300, 300, 700, C[5], BG, 25),
        kicker('CATÁLOGO DE FUNCIONES · 3', 90, 150, 600, C[5]),
        text('El 3D<br>a fondo', 84, 185, 640, 230, { fontFamily: H, fontSize: 100, color: W, lineHeight: 1.02 }),
        text('Cada opción de un modelo 3D, con su nombre en el menú y en el archivo.', 90, 425, 620, 80, { fontSize: 26, color: '#b8c0d6' }),
        ...['view', 'motion', 'autoRotate', 'spin', 'edge', 'bleed', 'clip', 'walk', 'arrive'].map((t, i) => pill(code(t), 90 + (i % 3) * 200, 515 + Math.floor(i / 3) * 44, 186, '#ffffff10', C[i % 6], { fontSize: 17 })),
        nasa('astronaut', 770, 90, 420, 540, { caption: '', autoRotate: true, spin: 25, view: 'three', edge: 'fade' }),
        credit('Modelos 3D: NASA 3D Resources; KayKit (Kay Lousberg), Kenney y three.js, CC0. Se cargan de internet al presentar.')],
        notes: 'El astronauta de la NASA gira solo y despacio (autoRotate con spin de 25 °/s) y tiene los bordes difuminados. Los modelos necesitan conexión; al insertarlos desde GIF y stickers se guardan dentro.' },
      { title: 'Vistas: desde dónde mira la cámara', layout: 'titleOnly', bg: BG, extra: [['front', 'De frente'], ['three', 'Tres cuartos'], ['side', 'De lado'], ['back', 'Por detrás'], ['top', 'Desde arriba'], ['low', 'Desde abajo']]
        .flatMap(([v, n], i) => { const [x, y] = [90 + (i % 3) * 375, 165 + Math.floor(i / 3) * 255];
          return [frame(x, y, 350, 235), model('kk-Knight', x + 85, y + 8, 180, 172, { view: v, bleed: 1 }), cap(n, `view: '${v}'`, x, y + 178, 350, W)]; }),
        notes: 'El mismo caballero seis veces, cada uno con su vista (Modelo 3D ▸ Vista ▸ Cámara). Al presentar se puede girar con el ratón; la vista es desde donde empieza.' },
      { title: 'Al entrar: un movimiento de cámara', layout: 'titleOnly', bg: BG, extra: [...[['none', 'Ninguno', 'kh-CesiumMilkTruck'], ['swing', 'Balanceo', 'kh-Fox'], ['zoom', 'Acercar', 'kh-AnimatedMorphCube'],
        ['orbit', 'Vuelta completa', 'kh-SunglassesKhronos'], ['float', 'Flotar', 'kn-character'], ['top', 'Desde arriba', 'kn-soldier']]
        .flatMap(([v, n, m], i) => { const [x, y] = [90 + (i % 3) * 375, 165 + Math.floor(i / 3) * 255];
          return [frame(x, y, 350, 235), model(m, x + 75, y + 8, 200, 172, { view: 'three', bleed: 1, caption: '', ...(v !== 'none' && { motion: v }) }), cap(n, `motion: '${v}'`, x, y + 178, 350, W)]; }),
        credit('Modelos: Cesium Milk Truck, Fox y Sunglasses Khronos — Khronos glTF Sample Assets (CC BY 4.0; marcas de sus titulares); Kenney (CC0).')],
        notes: 'Modelo 3D ▸ Vista ▸ Al entrar: el movimiento se hace cada vez que llega la diapositiva. Se ve al presentar.' },
      { title: 'Girar solo: sí, no, deprisa o al revés', layout: 'titleOnly', bg: BG, extra: [...[['No gira', 'autoRotate: false', { autoRotate: false }], ['Gira (normal)', 'autoRotate: true', { autoRotate: true }],
        ['Deprisa', 'spin: 90', { autoRotate: true, spin: 90 }], ['Al revés', 'spin: -40', { autoRotate: true, spin: -40 }]]
        .flatMap(([n, v, o], i) => { const x = 90 + i * 280;
          return [frame(x, 180, 260, 400), model('kh-CesiumMilkTruck', x + 10, 200, 240, 280, { view: 'three', caption: '', ...o }), cap(n, v, x, 500, 260, W)]; }),
        credit('Modelo: Cesium Milk Truck — Khronos glTF Sample Assets (CC BY 4.0; Cesium es marca de su titular).')],
        notes: 'Modelo 3D ▸ Girar solo. La velocidad (spin) se da en grados por segundo; si es negativa, gira en sentido contrario.' },
      { title: 'Bordes: qué pasa cuando se sale del marco', layout: 'titleOnly', bg: BG, extra: [
        ...[['hard', 'Corte recto'], ['fade', 'Difuminado'], ['free', 'Sin corte (más espacio)']].flatMap(([v, n], i) => { const x = 130 + i * 370;
          return [box(x + 40, 230, 250, 290), model('three-RobotExpressive', x + 40, 230, 250, 290, { clip: 'Dance', bleed: 1.3, edge: v }), cap(n, `edge: '${v}'`, x, 545, 330, W)]; }),
        text('La línea discontinua es la caja del objeto en la diapositiva.', 90, 620, 1100, 34, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Modelo 3D ▸ Encuadre ▸ Bordes. Con margen, el modelo puede salirse de su caja al bailar: el borde se corta recto, se difumina o no se corta (la vista ocupa el triple).' },
      { title: 'Margen: sitio para moverse sin cortarse', layout: 'titleOnly', bg: BG, extra: [
        ...[['1', 'Ninguno'], ['1.3', 'Poco'], ['1.5', 'Normal'], ['2', 'Mucho']].flatMap(([v, n], i) => { const x = 110 + i * 275;
          return [box(x + 40, 250, 170, 250), model('three-RobotExpressive', x + 40, 250, 170, 250, { clip: 'Wave', bleed: +v }), cap(n, `bleed: ${v}`, x, 540, 250, W)]; }),
        text('Sin margen, la mano que saluda se corta en el borde de la caja.', 90, 620, 1100, 34, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Modelo 3D ▸ Encuadre ▸ Margen. La vista 3D se dibuja más grande que la caja (1,3; 1,5 o 2 veces) y el modelo se ve igual de grande.' },
      { title: 'Sus propias animaciones (clips)', layout: 'titleOnly', bg: BG, extra: [
        ...[['three-RobotExpressive', 'Bailar en bucle', "clip: 'Dance'", { clip: 'Dance' }], ['three-RobotExpressive', 'Una sola vez', "clipOnce: true", { clip: 'ThumbsUp', clipOnce: true }],
          ['kk-Knight', 'Celebrar', "clip: 'Cheer'", { clip: 'Cheer' }], ['kn-character', 'A cámara lenta', 'clipSpeed: 0.5', { clip: 'walk', clipSpeed: 0.5 }]]
          .flatMap(([m, n, v, o], i) => { const x = 90 + i * 280;
            return [frame(x, 180, 260, 400), model(m, x + 40, 215, 180, 250, { view: 'three', bleed: 1.3, ...o }), cap(n, v, x, 500, 260, W)]; })],
        notes: 'Modelo 3D ▸ Animación ▸ En reposo: cualquiera de las del modelo. Movimiento 3D: una vez o en bucle, y la velocidad.' },
      { title: 'Andar por un recorrido', layout: 'titleOnly', bg: BG, extra: [
        ink(motionPoints({ pathShape: 'custom', points: [[0, 0], [200, -60], [420, 10], [620, -70], [800, -20]] }, 60).map(([px, py]) => [215 + px, 470 + py]), '#7aa2f755', 3),
        withAnims(model('kk-Knight', 90, 320, 250, 300, { walk: { clip: knight.walk, end: knight.end, endOnce: true, face: true, look: true } }),
          path([[0, 0], [200, -60], [420, 10], [620, -70], [800, -20]], { duration: 4500 })),
        card(`<div style="font-family:${MONO};font-size:18px;line-height:1.6">walk: {<br>&nbsp; clip: 'Walking_A',<br>&nbsp; end: 'Cheer',<br>&nbsp; face: true, look: true<br>}</div>`, 830, 170, 360, 210, '#ffffff0c', { color: C[2], fontSize: 18 }),
        text('Clic: anda siguiendo la línea, mira hacia donde va y al llegar lo celebra y se vuelve hacia el público.', 90, 170, 700, 100, { fontSize: 24, color: '#b8c0d6' })],
        notes: 'Animaciones ▸ Dibujar recorrido para el camino; Modelo 3D ▸ Al moverse ▸ Mientras se mueve: la animación mientras anda (clip); la de llegada (end), en Modelo 3D ▸ Movimiento 3D ▸ Al terminar el recorrido.' },
      { layout: 'blank', bg: BG, extra: [glow(-200, 120, 700, C[0], BG, 30),
        kicker('LLEGADA DESDE LA ANTERIOR · 1 DE 2', 90, 110, 700, C[0]),
        text('El mismo modelo en dos diapositivas seguidas', 90, 150, 560, 130, { fontFamily: H, fontSize: 46, color: W }),
        text('Con Transformar y el mismo objeto (mismo id), el telescopio viaja a su nuevo sitio y tamaño. Pasa a la siguiente.', 90, 300, 540, 140, { fontSize: 24, color: '#b8c0d6' }),
        hubble(820, 170, 300, 300, { view: 'front' }), cap('Aquí: de frente', "view: 'front'", 820, 480, 300, W),
        credit('Telescopio espacial Hubble — NASA 3D Resources')],
        notes: 'Esta diapositiva y la siguiente tienen el mismo modelo con el mismo id; la siguiente lleva Transformar (autoAnimate).' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(500, 40, 760, C[1], BG, 30),
        hubble(560, 90, 640, 520, { view: 'three', arrive: 'turn' }),
        kicker('LLEGADA DESDE LA ANTERIOR · 2 DE 2', 90, 110, 640, C[1]),
        ...[['keep', 'Seguir como estaba'], ['front', 'Girar hasta quedar de frente'], ['view', 'Ir a la vista de esta diapositiva'], ['turn', 'Dar una vuelta hasta su vista'], ['reset', 'Empezar de cero']]
          .map(([v, n], i) => text(`<div><b>${n}</b></div><div style="font-family:${MONO};font-size:16px;color:${v === 'turn' ? C[2] : DIM}">arrive: '${v}'${v === 'turn' ? ' ← esta' : ''}</div>`,
            90, 160 + i * 88, 460, 76, { fontSize: 22, color: W, bg: v === 'turn' ? '#9ece6a22' : '#ffffff08', radius: 12, pad: [8, 16, 8, 16], vAlign: 'middle' })),
        credit('Telescopio espacial Hubble — NASA 3D Resources')],
        notes: 'Modelo 3D ▸ Desde la anterior ▸ Llega. Aquí da una vuelta completa mientras viaja y acaba en la vista de tres cuartos.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · Transform (Morph): the same objects carry on from slide to slide — a title
  // that shrinks into place, shapes that stretch, turn and change colour, bars that
  // grow, a picture, a 3D model, and letters that rearrange themselves.
  showcase_morph: { name: 'Catálogo: Transformar', cat: 'showcase', summary: 'Transformar (Morph) paso a paso: texto que cambia de tamaño y sitio, formas, barras que crecen, imagen, 3D y letras que se reordenan', make: () => {
    const p = PALETTES.violet, C = p.accents, BG = '#120a24', W = '#f3eefe', DIM = '#b7a9d6', H = pairStacks('bold').heading;
    const T = uid(), CI = uid(), SQ = uid(), ST = uid(), PIC = uid(), M3 = uid(), WORD = uid(), bars = [uid(), uid(), uid(), uid()];
    const title = (x, y, w, h, size) => same(T, text('TRANSFORMAR', x, y, w, h, { fontFamily: H, fontSize: size, wordart: 'neon', lineHeight: 1 }));
    const step = (k, t) => kicker(`${k} · ${t}`, 690, 70, 500, C[2], { textAlign: 'right' });
    const note = (html, y = 600) => text(html, 90, y, 1100, 70, { fontSize: 22, color: DIM });
    const BARS = [['2023', 120, C[0]], ['2024', 190, C[1]], ['2025', 300, C[3]], ['2026', 400, C[4]]];
    const barsAt = grown => BARS.flatMap(([y, v, c], i) => { const h = grown ? v : Math.round(v / 8), x = (grown ? 470 : 830) + i * (grown ? 170 : 90), w = grown ? 120 : 62, base = grown ? 540 : 590;
      return [same(bars[i], shape('rounded', x, base - h, w, h, c, { radius: 8 }))]; });
    const pic = svgURL(900, 600, '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1055"/><stop offset=".6" stop-color="#d16ba5"/><stop offset="1" stop-color="#ffc996"/></linearGradient></defs>'
      + '<rect width="900" height="600" fill="url(#s)"/><circle cx="640" cy="300" r="90" fill="#fee440" opacity=".9"/>'
      + '<path d="M0 420 L170 250 L300 360 L450 200 L620 380 L760 280 L900 380 V600 H0Z" fill="#3a1c71"/><path d="M0 480 L220 360 L390 450 L560 330 L900 470 V600 H0Z" fill="#1b0f33"/>'
      + '<rect y="520" width="900" height="80" fill="#00bbf9" opacity=".35"/>');
    const glasses = (x, y, w, h, props) => same(M3, model('kh-SunglassesKhronos', x, y, w, h, { caption: '', autoRotate: false, view: 'front', ...props }));
    const credit = text('Modelo 3D: Sunglasses — Khronos glTF Sample Assets (CC BY 4.0; Khronos es marca de su titular)', 90, 668, 1100, 28, { fontSize: 14, color: '#6f5f93' });
    return build({ name: 'Catálogo: Transformar', palette: 'violet', fonts: 'bold', title: { color: W },
      decor: p0 => [shape('rect', 0, 712, 1280, 8, p0.accents[0], { fill2: p0.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, extra: [glow(-260, -280, 860, C[0], BG, 50), glow(800, 300, 700, C[1], BG, 35),
        kicker('CATÁLOGO DE FUNCIONES · 4', 90, 150, 600, C[4]),
        title(80, 190, 800, 180, 160),
        text('Lo que está en dos diapositivas seguidas viaja solo de una a otra: se mueve, crece, gira y cambia de color.', 90, 390, 640, 110, { fontSize: 30, color: W }),
        same(CI, shape('ellipse', 930, 80, 260, 260, C[0])), same(SQ, shape('rect', 1020, 440, 170, 170, C[3])), same(ST, shape('star', 830, 450, 150, 150, C[2]))],
        notes: 'Transiciones ▸ Transformar en la diapositiva de destino. Los objetos que son el mismo (mismo id, como al duplicar la diapositiva) o tienen el mismo contenido se emparejan y viajan.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(-200, -300, 700, C[0], BG, 30),
        title(90, 60, 560, 90, 84), step(1, 'TEXTO'),
        text('<div style="font-size:64px;font-weight:800;color:#fee440;line-height:1">160 → 84 px</div><div style="margin-top:14px">El título ha encogido y ha subido a la esquina. No es otro cuadro de texto: es el mismo, con otro tamaño y otro sitio.</div>',
          90, 210, 640, 300, { fontSize: 30, color: W }),
        same(CI, shape('ellipse', 830, 470, 110, 110, C[0])), same(SQ, shape('rect', 970, 470, 110, 110, C[3])), same(ST, shape('star', 1100, 465, 110, 110, C[2])),
        note(`Dos diapositivas, el mismo objeto (mismo ${code('id')}) y ${code('autoAnimate: true')} en la segunda.`)],
        notes: 'El título y las tres formas vienen de la portada. El párrafo es nuevo: aparece con un fundido.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [title(90, 60, 560, 90, 84), step(2, 'FORMAS'),
        same(CI, shape('ellipse', 90, 210, 330, 200, C[1])), same(SQ, shape('rect', 520, 215, 190, 190, C[4], { rotation: 45 })), same(ST, shape('star', 850, 180, 260, 260, C[5], { rotation: 36 })),
        cap('Se estira y cambia de color', 'w, h, fill', 90, 440, 330, W), cap('Gira 45°: el cuadrado es un rombo', 'rotation: 45', 460, 440, 310, W), cap('Crece, gira y cambia de color', 'rotation · fill', 830, 460, 300, W),
        ...barsAt(false),
        note('Abajo a la derecha asoman cuatro barras muy bajas: en la siguiente crecen.', 600)],
        notes: 'Las formas son las mismas de antes con otro tamaño, giro y color. Las cuatro barras son nuevas aquí y preparan la siguiente diapositiva.' },
      { layout: 'blank', bg: BG, autoAnimate: true, aaDuration: 1.6, extra: [title(90, 60, 560, 90, 84), step(3, 'UN GRÁFICO QUE CRECE'),
        same(CI, shape('ellipse', 90, 190, 70, 42, C[1])), same(SQ, shape('rect', 190, 190, 42, 42, C[4], { rotation: 45 })), same(ST, shape('star', 260, 184, 54, 54, C[5], { rotation: 36 })),
        ...barsAt(true),
        ...BARS.map(([y, v], i) => text(`<b>${y}</b>`, 470 + i * 170, 550, 120, 40, { fontSize: 24, color: W, textAlign: 'center' })),
        ...BARS.map(([, v], i) => text(`${v} k`, 470 + i * 170, 500 - v, 120, 34, { fontSize: 22, color: '#fee440', textAlign: 'center' })),
        text('Las barras son las mismas formas de la diapositiva anterior, ahora más altas. Esta transición dura más: 1,6 s.', 90, 270, 340, 230, { fontSize: 22, color: W }),
        note(`Duración propia de la transformación: ${code('aaDuration: 1.6')} (Transiciones ▸ Configuración ▸ Transformar ▸ Duración). Cifras inventadas: usuarios por año.`, 615)],
        notes: 'Un gráfico que crece hecho con formas: cada barra tiene el mismo id en las dos diapositivas. Las cifras son de ejemplo.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [title(90, 60, 560, 90, 84), step(4, 'IMÁGENES'),
        same(PIC, image(pic, 870, 200, 300, 200, 'Paisaje: montañas y un lago al atardecer', { radius: 14 })),
        text('Una imagen pequeña, en la esquina…', 90, 220, 640, 120, { fontSize: 40, color: W, fontWeight: 700 }),
        text('…pasa a la siguiente y se hace grande, como al abrir una foto en el móvil.', 90, 350, 600, 120, { fontSize: 28, color: DIM }),
        note('Funciona igual con fotos, capturas y vídeos: misma imagen en las dos diapositivas.')],
        notes: 'La imagen es un dibujo SVG hecho para esta plantilla (no hay archivos externos).' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [title(90, 40, 420, 70, 64), step(4, 'IMÁGENES'),
        same(PIC, image(pic, 240, 130, 800, 533, 'Paisaje: montañas y un lago al atardecer', { radius: 14 }))],
        notes: 'La misma imagen, ocho veces más grande. El título también ha encogido un poco más.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [title(90, 60, 560, 90, 84), step(5, 'MODELOS 3D'),
        glasses(880, 190, 300, 220),
        text('Un modelo 3D también viaja…', 90, 230, 650, 70, { fontSize: 40, color: W, fontWeight: 700 }),
        text('…y además puede girar por el camino hasta la vista de la diapositiva siguiente.', 90, 310, 620, 120, { fontSize: 28, color: DIM }),
        note(`Modelo 3D ▸ Desde la anterior ▸ Llega: ${code("arrive: 'turn'")} da una vuelta completa mientras viaja.`), credit],
        notes: 'Las gafas son el mismo modelo en esta diapositiva y en la siguiente.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(240, 40, 800, C[0], BG, 30), title(90, 40, 420, 70, 64), step(5, 'MODELOS 3D'),
        glasses(190, 120, 900, 500, { view: 'three', arrive: 'turn', autoRotate: true, spin: 20 }), credit],
        notes: 'Llega dando una vuelta y acaba en la vista de tres cuartos; después sigue girando despacio (spin: 20).' },
      { layout: 'blank', bg: BG, extra: [step(6, 'LETRAS'),
        same(WORD, text('ROMA', 140, 190, 1000, 260, { fontFamily: H, fontSize: 260, textAlign: 'center', wordart: 'gold', letterSpacing: 20 })),
        note('Pasa a la siguiente: cada letra va a su nuevo sitio.', 520)],
        notes: 'Esta diapositiva no lleva Transformar; la siguiente sí, «por caracteres».' },
      { layout: 'blank', bg: BG, autoAnimate: true, morphBy: 'chars', extra: [step(6, 'LETRAS'),
        same(WORD, text('AMOR', 140, 190, 1000, 260, { fontFamily: H, fontSize: 260, textAlign: 'center', wordart: 'gold', letterSpacing: 20 })),
        text(`<div><b>Transformar por caracteres</b> ${code("morphBy: 'chars'")}: las letras que se repiten viajan.</div><div>Por palabras ${code("morphBy: 'words'")}: lo mismo con palabras enteras.</div>`, 90, 500, 1100, 110, { fontSize: 24, color: W, textAlign: 'center' })],
        notes: 'Transiciones ▸ Entre diapositivas: por objetos, por palabras o por caracteres.' },
    ]);
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · Text Art and type: the ten Text Art styles, every curve, columns, the five
  // bullet levels, the eight font pairs, alignment, box and spacing.
  showcase_text: { name: 'Catálogo: Text Art y tipografía', cat: 'showcase', summary: 'Los 10 estilos de Text Art, texto curvo, columnas, cinco niveles de viñetas, los 8 pares de letra, alineación y espaciado', make: () => {
    const p = PALETTES.paper, C = p.accents, INK = '#3b3228', SOFT = '#7a6a58', PAPER = '#fffaf0', LINE = '#e2d6c0', H = pairStacks('editorial').heading;
    const ART = [['fill', 'Relleno', PAPER], ['outline', 'Contorno', '#cd853f'], ['shadow', 'Sombra', '#6b8e23'], ['gradient', 'Degradado', PAPER], ['neon', 'Neón', '#1e1a2e'],
      ['gold', 'Oro', '#2b2622'], ['fire', 'Fuego', '#2b1512'], ['ice', 'Hielo', '#16324a'], ['purple', 'Púrpura', PAPER], ['retro', 'Retro', '#2b2622']];
    const CURVES = [['0', 'Recto'], ['20', 'Arco suave'], ['45', 'Arco'], ['75', 'Arco cerrado'], ['-20', 'Hacia abajo suave'], ['-45', 'Hacia abajo'], ['100', 'Círculo']];
    const PAIRS = [['modern', 'Moderna'], ['classic', 'Clásica'], ['editorial', 'Editorial'], ['clean', 'Limpia'], ['tech', 'Técnica'], ['bold', 'Impacto'], ['friendly', 'Amable'], ['websafe', 'Sin descargas']];
    const paper = (x, y, w, h, pr = {}) => shape('rounded', x, y, w, h, PAPER, { stroke: LINE, strokeWidth: 1.5, radius: 14, ...pr });
    const lorem2 = 'La tipografía es la voz del texto escrito. Una misma frase parece seria, alegre o técnica según la letra con que se escriba. Por eso conviene elegir pocas familias: una para los títulos, que dé carácter, y otra para el texto, que se lea sin esfuerzo a cualquier tamaño. Al proyectar, mejor letras grandes, líneas cortas y buen contraste entre la letra y el fondo.';
    const lorem3 = 'Las columnas ayudan cuando hay mucho texto seguido: los ojos recorren líneas más cortas y se pierden menos al saltar de una a otra. En una diapositiva, sin embargo, lo normal es escribir poco. Por eso aquí sirven sobre todo para folletos, notas impresas, glosarios o listas largas de nombres y fechas. Si el texto no cabe, la columna siguiente lo recoge y el cuadro reparte las líneas por igual.';
    return build({ name: 'Catálogo: Text Art y tipografía', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 46 },
      decor: p0 => [shape('rect', 60, 686, 1160, 2, p0.accents[0])] }, [
      { layout: 'blank', extra: [
        kicker('CATÁLOGO DE FUNCIONES · 5', 90, 160, 600, C[0]),
        text('Text Art<br>y tipografía', 86, 195, 660, 230, { fontFamily: H, fontSize: 84, color: INK, lineHeight: 1.1 }),
        text('Estilos, curvas, columnas, viñetas, pares de letra y todo lo que se puede hacer con un cuadro de texto.', 90, 440, 600, 100, { fontSize: 28, color: SOFT }),
        shape('ellipse', 800, 170, 340, 340, C[0], { fill2: '#8b4513', gradType: 'radial' }),
        text('TEXTO CURVO · TEXT ART · COLUMNAS · VIÑETAS · ', 760, 130, 420, 420, { fontSize: 26, curve: 100, color: INK, textAlign: 'center', letterSpacing: 2 }),
        text('Aa', 800, 240, 340, 200, { fontFamily: H, fontSize: 140, color: PAPER, textAlign: 'center', vAlign: 'middle' })],
        notes: 'Portada con texto curvo en círculo alrededor de una forma con degradado radial (Cuadro de texto ▸ Efectos de texto ▸ Curvar texto ▸ Círculo).' },
      { title: 'Text Art: diez estilos', layout: 'titleOnly', extra: ART.flatMap(([v, n, bg], i) => { const [x, y] = cell(i, 5, 90, 175, 222, 235), dark = bg !== PAPER;
        return [shape('rounded', x, y, 206, 150, bg, { radius: 14, stroke: LINE, strokeWidth: dark ? 0 : 1.5 }),
          text('Revela', x, y + 30, 206, 90, { fontFamily: H, fontSize: 50, wordart: v, textAlign: 'center', vAlign: 'middle' }), cap(n, `wordart: '${v}'`, x, y + 158, 206, INK)]; }),
        notes: 'Insertar ▸ Text Art, también con un cuadro de texto seleccionado. Cada estilo sobre el fondo que mejor le sienta.' },
      { title: 'Texto curvo: siete formas', layout: 'titleOnly', extra: [
        ...CURVES.flatMap(([v, n], i) => { const [x, y] = cell(i, 4, 90, 170, 280, 250), circ = v === '100';
          return [paper(x, y, 260, 180), circ ? text('ALREDEDOR · DE UN CÍRCULO · ', x + 55, y + 15, 150, 150, { fontSize: 16, curve: 100, color: C[3], textAlign: 'center', letterSpacing: 1 })
            : text('Texto curvo', x + 10, y + 30, 240, 120, { fontSize: 36, curve: +v, color: C[i % 6], textAlign: 'center', fontFamily: H }), cap(n, `curve: ${v}`, x, y + 185, 260, INK)]; }),
        card('Cuadro de texto ▸ Efectos de texto ▸ <b>Curvar texto</b>. Los valores van de −100 a 100: positivos hacia arriba, negativos hacia abajo y 100 da la vuelta entera.', 930, 420, 260, 180, '#f0e6d2', { fontSize: 19, color: INK })],
        notes: 'El texto curvo sigue siendo texto: se edita con doble clic y se puede cambiar de tamaño y color como cualquier otro.' },
      { title: 'Columnas: dos y tres', layout: 'titleOnly', extra: [
        kicker('COLUMNS: 2', 90, 165, 400, C[0]), text(lorem2, 90, 200, 1100, 190, { fontSize: 24, columns: 2, color: INK, textAlign: 'justify', lineHeight: 1.4 }),
        kicker('COLUMNS: 3', 90, 405, 400, C[0]), text(lorem3, 90, 440, 1100, 220, { fontSize: 22, columns: 3, color: INK, textAlign: 'justify', lineHeight: 1.4 })],
        notes: 'Cuadro de texto ▸ Párrafo ▸ Columnas (1, 2 o 3). El texto pasa solo de una columna a la siguiente.' },
      { title: 'Cinco niveles de viñetas', layout: 'twoContent',
        body: ul('Nivel 1 · 36 px', ['Nivel 2 · 30 px', ['Nivel 3 · 26 px', ['Nivel 4 · 24 px', ['Nivel 5 · 22 px']]]], 'Otra idea de primer nivel', ['Con su detalle debajo']),
        body2: '<ol><li>Numerada: primer paso</li><li>Segundo paso</li><li>Tercer paso<ol><li>Un subpaso</li><li>Otro subpaso</li></ol></li></ol>',
        notes: 'Los tamaños de cada nivel vienen del patrón (Diseño ▸ Patrón de diapositivas). Tab baja un nivel; Mayús+Tab lo sube.' },
      { title: 'Pares de tipos de letra', layout: 'titleOnly', extra: PAIRS.flatMap(([v, n], i) => { const [x, y] = cell(i, 4, 90, 170, 280, 250), st = pairStacks(v);
        const hn = st.heading.split(',')[0].replace(/'/g, ''), bn = st.body.split(',')[0].replace(/'/g, '');
        return [paper(x, y, 260, 230), text(`<div style="font-family:${st.heading};font-size:${hn.length > 11 ? 26 : 32}px;line-height:1.15;color:${C[i % 6]}">${hn}</div><div style="font-family:${st.body};font-size:19px;margin-top:8px">${bn}<br>para el texto: Aa Bb 123</div>`,
          x + 18, y + 18, 224, 130, { color: INK }), cap(n, `fonts: '${v}'`, x, y + 160, 260, INK)]; }),
        notes: 'Diseño ▸ Fuentes: el par cambia los títulos y el texto de toda la presentación. «Sin descargas» usa letras que ya tiene cualquier ordenador.' },
      { title: 'Alineación y cuadro', layout: 'titleOnly', extra: [
        ...[['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha'], ['justify', 'Justificado']].flatMap(([v, n], i) => { const x = 90 + i * 280;
          return [text('Un párrafo corto para ver cómo se alinea en su cuadro de texto.', x, 170, 260, 130, { fontSize: 20, textAlign: v, color: INK, borderColor: LINE, borderDash: 'dash', pad: [12, 14, 12, 14] }),
            cap(n, `textAlign: '${v}'`, x, 305, 260, INK)]; }),
        ...[['top', 'Arriba'], ['middle', 'En medio'], ['bottom', 'Abajo']].flatMap(([v, n], i) => { const x = 90 + i * 375;
          return [text('Texto', x, 395, 350, 150, { fontSize: 26, vAlign: v, textAlign: 'center', color: INK, bg: '#f0e6d2', radius: 14 + i * 12, pad: [10, 10, 10, 10] }),
            cap(n, `vAlign: '${v}' · radius: ${14 + i * 12}`, x, 552, 350, INK)]; })],
        notes: 'Cuadro de texto ▸ Párrafo: alineación horizontal y vertical. Relleno y borde, esquinas redondeadas (radius) y márgenes interiores (pad).' },
      { title: 'Espaciado y efectos de fuente', layout: 'titleOnly', extra: [
        ...[0, 4, 12].flatMap((v, i) => [text('ESPACIADO', 90 + i * 375, 175, 350, 60, { fontSize: 34, letterSpacing: v, color: INK, textAlign: 'center', fontFamily: H }), cap(['Normal', 'Abierto', 'Muy abierto'][i], `letterSpacing: ${v}`, 90 + i * 375, 238, 350, SOFT)]),
        ...[1, 1.4, 1.9].flatMap((v, i) => [text('Tres líneas de texto<br>para ver el aire<br>entre una y otra', 90 + i * 375, 320, 350, 140, { fontSize: 22, lineHeight: v, color: INK, textAlign: 'center', bg: PAPER, borderColor: LINE }), cap(`Interlineado ${String(v).replace('.', ',')}`, `lineHeight: ${v}`, 90 + i * 375, 465, 350, SOFT)]),
        text(`<b>Negrita</b> · <i>Cursiva</i> · <u>Subrayado</u> · <s>Tachado</s> · <span style="font-variant:small-caps">Versalitas</span> · <mark style="background:#f3d27a">Resaltado</mark> · H<sub>2</sub>O · m<sup>2</sup> · <span style="color:${C[3]}">Color</span>`,
          90, 560, 1100, 60, { fontSize: 28, color: INK, textAlign: 'center' })],
        notes: 'Espaciado entre letras e interlineado en Cuadro de texto ▸ Fuente y Párrafo; los efectos, con los botones de la cinta o los atajos (Ctrl+B, Ctrl+I, Ctrl+U).' },
    ]);
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · Shapes: the whole catalogue by kind (every shape with its name), lines and
  // dashes, gradients and transparency, outlines, the hand-drawn look, shadows,
  // text inside shapes and turning them.
  showcase_shapes: { name: 'Catálogo: formas', cat: 'showcase', summary: 'Todas las formas por categorías con su nombre, líneas y guiones, degradados, opacidad, trazo a mano, sombras, texto dentro y giro', make: () => {
    const p = PALETTES.forest, C = p.accents, INK = '#1e3320', SOFT = '#5d6f5f', H = pairStacks('clean').heading;
    const seen = new Set(), groups = SHAPE_CATALOG.map(([g, list]) => [g, list.filter(([k]) => k !== 'freeform' && !seen.has(k) && seen.add(k))]);
    const of = name => groups.find(([g]) => g === name)[1];
    const basics = of('Básicas'), lines = of('Líneas');
    const misc = [['Cintas', of('Cintas')], ['Flechas', of('Flechas')], ['Estrellas', of('Estrellas')]];
    const misc2 = [['Bocadillos', of('Bocadillos')], ['Diagrama de flujo', of('Diagrama de flujo')], ['Botones de acción', of('Botones de acción')], ['Matemáticas', of('Matemáticas')]];
    const OPEN = ['arc', 'leftbracket', 'rightbracket', 'leftbrace', 'rightbrace'];
    // A grid of shapes, each with its name and its value underneath.
    const grid = list => list.flatMap(([k, n, c], i) => { const [x, y] = cell(i, 6, 90, 170, 185, 165), open = OPEN.includes(k);
      return [shape('rounded', x, y, 172, 152, '#ffffff', { radius: 14, stroke: '#dfe8dc', strokeWidth: 1 }),
        shape(k, x + 51, y + 14, 70, 70, open ? 'none' : c, open ? { stroke: c, strokeWidth: 4 } : {}),
        cap(n, `'${k}'`, x + 4, y + 92, 164, INK, { fontSize: 15, h: 56 })]; });
    const legend = sets => text(sets.map(([g], i) => `<span style="color:${C[[0, 4, 5, 3][i]]}">■</span> ${g}`).join(' &nbsp; '), 90, 664, 1100, 30, { fontSize: 18, color: SOFT });
    const tint = (sets, cols) => sets.flatMap(([, list], i) => list.map(([k, n]) => [k, n, cols[i]]));
    return build({ name: 'Catálogo: formas', palette: 'forest', fonts: 'clean', title: { color: INK, size: 44 },
      decor: p0 => [shape('rect', 0, 0, 1280, 8, p0.accents[0]), shape('rect', 0, 8, 1280, 4, p0.accents[3])] }, [
      { layout: 'blank', extra: [
        shape('ellipse', 760, 90, 300, 300, C[1], { opacity: 85 }), shape('star', 980, 300, 220, 220, C[3], { rotation: 12 }), shape('hexagon', 700, 340, 240, 210, C[4], { opacity: 90 }),
        shape('cloud', 900, 70, 230, 150, '#ffffff', { stroke: INK, strokeWidth: 2, sketch: true }), shape('heart', 640, 140, 110, 100, C[5], { rotation: -12 }),
        shape('rightarrow', 1040, 560, 160, 80, C[0]), shape('donut', 600, 520, 110, 110, C[2]),
        kicker('CATÁLOGO DE FUNCIONES · 6', 90, 170, 500, C[0]),
        text('Formas', 86, 205, 560, 140, { fontFamily: H, fontSize: 110, color: INK, fontWeight: 800 }),
        text(`${seen.size} formas en ${groups.length - 1} familias, más líneas, degradados, sombras, trazo a mano y texto dentro.`, 90, 360, 500, 120, { fontSize: 28, color: SOFT })],
        notes: 'Insertar ▸ Formas. Todas se pueden rellenar, bordear, girar, sombrear y llevar texto.' },
      { title: `Básicas (1 de 2)`, layout: 'titleOnly', extra: grid(basics.slice(0, 18).map(([k, n], i) => [k, n, C[i % 2 ? 1 : 0]])),
        notes: 'Pasa el ratón por Insertar ▸ Formas para ver el nombre de cada una. Debajo de cada forma, su nombre y cómo se escribe en el archivo.' },
      { title: `Básicas (2 de 2)`, layout: 'titleOnly', extra: grid(basics.slice(18).map(([k, n], i) => [k, n, C[i % 2 ? 1 : 0]])),
        notes: 'Las abiertas (arco, corchetes y llaves) se dibujan como una línea, sin relleno.' },
      { title: 'Cintas, flechas y estrellas', layout: 'titleOnly', extra: [...grid(tint(misc, [C[2], C[4], C[3]])), legend(misc)],
        notes: 'El galón (chevron) y el pentágono-flecha sirven para procesos; la explosión, para destacar una cifra.' },
      { title: 'Bocadillos, flujo, acción y matemáticas', layout: 'titleOnly', extra: [...grid(tint(misc2, [C[0], C[4], C[5], C[3]])), legend(misc2)],
        notes: 'Los botones de acción van a la diapositiva anterior, la siguiente, la primera o la última al presentar.' },
      { title: 'Líneas y guiones', layout: 'titleOnly', extra: [
        ...lines.flatMap(([k, n], i) => { const y = 185 + i * 105;
          return [shape(k, 110, y - 20, 330, 100, 'none', { stroke: C[i], strokeWidth: 4 }), cap(n, `'${k}'`, 460, y + 2, 180, INK, { textAlign: 'left' })]; }),
        ink([[110, 625], [160, 590], [230, 640], [300, 585], [380, 630], [440, 600]], C[5], 4), cap('Forma libre', 'a mano', 460, 592, 180, INK, { textAlign: 'left' }),
        ...[['solid', 'Continua'], ['dash', 'Guiones'], ['dot', 'Puntos'], ['dashDot', 'Guion y punto']].flatMap(([v, n], i) => { const y = 185 + i * 110;
          return [shape('line', 700, y + 10, 300, 40, 'none', { stroke: INK, strokeWidth: 2 + i * 2, dash: v }), cap(n, `dash: '${v}' · ${2 + i * 2} px`, 1010, y, 200, INK, { textAlign: 'left' })]; })],
        notes: 'Forma ▸ Estilo de forma: color, grosor y tipo de línea. La forma libre se dibuja con el ratón o el dedo (pestaña Dibujo).' },
      { title: 'Relleno: degradado y transparencia', layout: 'titleOnly', extra: [
        ...[[0, 'Lineal 0°'], [45, 'Lineal 45°'], [90, 'Lineal 90°'], [135, 'Lineal 135°'], [180, 'Lineal 180°'], ['radial', 'Radial']].flatMap(([a, n], i) => { const x = 90 + i * 185;
          return [shape(a === 'radial' ? 'ellipse' : 'rounded', x + 11, 175, 150, 150, C[4], { fill2: C[1], ...(a === 'radial' ? { gradType: 'radial' } : { gradAngle: a }), radius: 18 }),
            cap(n, a === 'radial' ? "gradType: 'radial'" : `gradAngle: ${a}`, x - 5, 335, 182, INK)]; }),
        ...Array.from({ length: 12 }, (_, k) => shape('rect', 90 + k * 92, 440, 46, 150, '#dfe8dc')),
        ...[100, 75, 50, 25].flatMap((o, i) => [shape('ellipse', 140 + i * 270, 455, 130, 130, C[5], { opacity: o }), cap(`Opacidad ${o} %`, `opacity: ${o}`, 105 + i * 270, 600, 200, INK)])],
        notes: 'Forma ▸ Relleno: un color, un degradado de dos colores (lineal con su ángulo, o radial) y la transparencia. Las rayas de detrás dejan ver cuánto se transparenta.' },
      { title: 'Contorno, trazo a mano y sombras', layout: 'titleOnly', extra: [
        ...[['Sin borde', 'strokeWidth: 0', {}], ['Borde fino', 'strokeWidth: 3', { stroke: INK, strokeWidth: 3 }], ['Borde grueso', 'strokeWidth: 8', { stroke: INK, strokeWidth: 8 }],
          ['Borde a guiones', "dash: 'dash'", { stroke: INK, strokeWidth: 3, dash: 'dash' }], ['A mano', 'sketch: true', { stroke: INK, strokeWidth: 2, sketch: true }], ['A mano (estrella)', 'sketch: true', { stroke: INK, strokeWidth: 2, sketch: true }]]
          .flatMap(([n, v, o], i) => { const x = 90 + i * 185; return [shape(i === 5 ? 'star' : 'rounded', x + 26, 175, 120, 110, C[3], { radius: 16, ...o }), cap(n, v, x - 5, 295, 182, INK)]; }),
        ...[['Sin sombra', 'shadow: —', null], ['Suave', 'x 4 · y 6 · blur 10', {}], ['Dura', 'x 10 · y 10 · blur 0', { x: 10, y: 10, blur: 0, color: '#1e332055' }],
          ['Brillo de color', 'x 0 · y 0 · blur 24', { x: 0, y: 0, blur: 24, color: '#66bb6acc' }], ['Lejana', 'x 18 · y 24 · blur 16', { x: 18, y: 24, blur: 16, color: '#00000044' }]]
          .flatMap(([n, v, sh], i) => { const x = 90 + i * 222; return [shape('rounded', x + 40, 400, 130, 120, '#ffffff', { radius: 16, stroke: '#dfe8dc', strokeWidth: 1, ...(sh && { shadow: sh }) }), cap(n, v, x, 540, 210, INK)]; })],
        notes: 'Forma ▸ Estilo de forma (grosor, guiones) y Trazo a mano. La sombra se activa en Organizar ▸ Sombra; aquí se ven sus valores: desplazamiento, desenfoque y color.' },
      { title: 'Texto dentro de las formas, y giro', layout: 'titleOnly', extra: [
        shape('speechround', 90, 180, 300, 220, C[0], { html: '¡Hola!<br>Doble clic para escribir', fontSize: 24 }),
        shape('hexagon', 430, 190, 220, 200, C[4], { html: '<div><b>Hexágono</b></div><div>con texto</div>', fontSize: 24 }),
        shape('burst', 690, 170, 240, 240, C[3], { html: '<b>¡NUEVO!</b>', fontSize: 24, color: INK }),
        shape('homeplate', 970, 230, 220, 110, C[5], { html: 'Paso 1', fontSize: 28 }),
        cap('Bocadillo', 'html + fontSize', 90, 410, 300, INK), cap('Hexágono', 'el texto se ajusta', 430, 410, 220, INK), cap('Explosión', 'color del texto', 690, 410, 240, INK), cap('Flecha', 'homeplate', 970, 410, 220, INK),
        ...[-30, -10, 0, 15, 45].flatMap((r, i) => [shape('rounded', 145 + i * 220, 505, 110, 80, C[1], { rotation: r, radius: 12, html: `${r}°`, fontSize: 22, color: INK }), cap('', `rotation: ${r}`, 110 + i * 220, 610, 180, SOFT)])],
        notes: 'Todas las formas cerradas admiten texto: doble clic y escribe. El texto se coloca dentro del hueco útil de cada forma. Para girar, el asa redonda de arriba.' },
    ]);
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · Every chart type, two per slide, with its options: series, combo, grid, data
  // labels and axis titles. The figures belong to a made-up chain of cafés.
  showcase_charts: { name: 'Catálogo: gráficos', cat: 'showcase', summary: 'Los 15 tipos de gráfico, dos por diapositiva, con series, combinado, cuadrícula, etiquetas y títulos de ejes, y la tabla de opciones', make: () => {
    const p = PALETTES.office, C = p.accents, INK = '#1f1f1f', SOFT = '#5f6368', H = pairStacks('websafe').heading;
    const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], d = (labels, values) => labels.map((label, i) => ({ label, value: values[i] }));
    // A panel with a chart and, underneath, its name, its value and the options it shows.
    const panel = (i, name, opts, props) => { const x = i ? 655 : 90;
      return [shape('rounded', x, 165, 535, 485, '#f6f8fb', { radius: 16, stroke: '#e3e7ee', strokeWidth: 1 }),
        chartBlock({ x: x + 20, y: 185, w: 495, h: 365, color: C[0], ...props }),
        text(`<div><b>${name}</b> <span style="font-family:${MONO};font-size:.8em;color:${C[0]}">chartType: '${props.chartType}'</span></div><div style="font-size:.78em;color:${SOFT}">${opts}</div>`,
          x + 20, 565, 495, 70, { fontSize: 22, color: INK })]; };
    const two = (title, a, b, notes) => ({ title, layout: 'titleOnly', extra: [...panel(0, ...a), ...panel(1, ...b)], notes: notes + ' Cifras inventadas: una cadena de cafeterías de ejemplo.' });
    const waits = [2, 4, 5, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 18, 20, 22, 25, 28, 32];
    return build({ name: 'Catálogo: gráficos', palette: 'office', fonts: 'websafe', title: { color: INK, size: 42 }, decor: p0 => bar(p0, 0) }, [
      { layout: 'blank', extra: [
        kicker('CATÁLOGO DE FUNCIONES · 7', 90, 170, 500, C[1]),
        text('Gráficos', 86, 205, 560, 130, { fontFamily: H, fontSize: 100, color: INK }),
        text('Los quince tipos, con sus opciones. Todos se editan como una tabla y pueden leer los datos de un CSV.', 90, 350, 500, 130, { fontSize: 28, color: SOFT }),
        chartBlock({ x: 660, y: 110, w: 530, h: 250, chartType: 'bar', color: C[0], data: d(M, [42, 38, 51, 47, 55, 61]), seriesName: '2026', series: [{ name: '2025', values: [35, 33, 40, 41, 44, 50], color: C[3] }] }),
        chartBlock({ x: 660, y: 390, w: 250, h: 250, chartType: 'doughnut', color: C[1], data: d(['Café', 'Té', 'Zumo'], [62, 23, 15]) }),
        chartBlock({ x: 940, y: 390, w: 250, h: 250, chartType: 'radar', color: C[4], data: d(['Sabor', 'Precio', 'Rapidez', 'Trato', 'Local'], [9, 6, 7, 9, 8]) })],
        notes: 'Insertar ▸ Gráfico. Los datos se cambian con Gráfico ▸ Editar datos, o se vinculan a un CSV que se actualiza solo.' },
      two('Barras: sencillas y combinadas', ['Barras', 'Dos series · cuadrícula · etiquetas de datos', { chartType: 'bar', data: d(M, [42, 38, 51, 47, 55, 61]), seriesName: '2026', series: [{ name: '2025', values: [35, 33, 40, 41, 44, 50] }], grid: true, dataLabels: true }],
        ['Barras con línea', "combo: true · la segunda serie es una línea", { chartType: 'bar', data: d(M, [42, 38, 51, 47, 55, 61]), seriesName: 'Cafés', series: [{ name: 'Objetivo', values: [40, 40, 45, 45, 50, 55] }], combo: true, grid: true }],
        'A la izquierda, dos años comparados mes a mes; a la derecha, las ventas frente al objetivo dibujado como línea (combo).'),
      two('Barras apiladas', ['Apiladas', 'Cada barra suma sus partes', { chartType: 'stacked', data: d(['Centro', 'Puerto', 'Campus', 'Estación'], [320, 210, 260, 180]), seriesName: 'Café', series: [{ name: 'Té', values: [90, 70, 140, 40] }, { name: 'Zumo', values: [60, 50, 90, 30] }] }],
        ['Apiladas al 100 %', 'Partes como porcentaje de cada barra', { chartType: 'stacked100', data: d(['Centro', 'Puerto', 'Campus', 'Estación'], [320, 210, 260, 180]), seriesName: 'Café', series: [{ name: 'Té', values: [90, 70, 140, 40] }, { name: 'Zumo', values: [60, 50, 90, 30] }] }],
        'Ventas semanales por tienda y bebida: en número a la izquierda y en proporción a la derecha.'),
      two('Barras horizontales e histograma', ['Barras horizontales', 'Etiquetas largas que se leen bien', { chartType: 'hbar', color: C[2], data: d(['Café con leche', 'Capuchino', 'Té verde', 'Zumo de naranja', 'Chocolate'], [540, 410, 260, 220, 150]), dataLabels: true }],
        ['Histograma', 'Agrupa 30 valores en tramos solo', { chartType: 'histogram', color: C[3], data: waits.map((v, i) => ({ label: String(i + 1), value: v })), xTitle: 'Minutos de espera', yTitle: 'Clientes' }],
        'El histograma no necesita etiquetas: reparte los valores (minutos de espera de 30 clientes) en tramos y cuenta cuántos caen en cada uno.'),
      two('Líneas y áreas', ['Líneas', 'Dos series · cuadrícula · títulos de los ejes', { chartType: 'line', color: C[1], data: d(M, [12, 14, 19, 24, 29, 33]), seriesName: 'Frías', series: [{ name: 'Calientes', values: [40, 37, 31, 25, 18, 14], color: C[0] }], grid: true, xTitle: 'Mes', yTitle: 'Ventas (miles)' }],
        ['Área', 'Como la línea, con la superficie rellena', { chartType: 'area', color: C[3], data: d(M, [120, 150, 170, 210, 260, 300]), seriesName: 'Clientes de la app', grid: true }],
        'Las líneas cuentan tendencias: el calor del verano cambia lo que se pide.'),
      two('Circular y anillo', ['Circular', 'Partes de un todo', { chartType: 'pie', data: d(['Café', 'Té', 'Zumos', 'Bollería'], [48, 17, 12, 23]) }],
        ['Anillo', 'dataLabels: true · el centro queda libre', { chartType: 'doughnut', color: C[1], data: d(['Tienda', 'Para llevar', 'App', 'Reparto'], [41, 27, 20, 12]), dataLabels: true }],
        'Para pocas partes (hasta cinco o seis). Si hay más, mejor barras.'),
      two('Dispersión y burbujas', ['Dispersión', 'x = etiqueta numérica · y = valor', { chartType: 'scatter', color: C[4], data: [[14, 120], [16, 150], [18, 170], [20, 230], [22, 260], [24, 310], [26, 330], [28, 400], [30, 420], [32, 480]].map(([x, y]) => ({ label: String(x), value: y })) }],
        ['Burbujas', 'El tamaño, de la segunda serie (margen)', { chartType: 'bubble', color: C[0], data: d(['Café', 'Té', 'Zumo', 'Batido', 'Bollería'], [540, 260, 220, 120, 380]), series: [{ name: 'Margen', values: [70, 65, 40, 55, 30] }] }],
        'Dispersión: temperatura (°C) frente a bebidas frías vendidas. Burbujas: ventas de cada producto y, por el tamaño, su margen.'),
      two('Radar y cascada', ['Radar', 'Varios criterios de un vistazo', { chartType: 'radar', color: C[2], data: d(['Sabor', 'Precio', 'Rapidez', 'Trato', 'Limpieza', 'Ambiente'], [9, 6, 7, 9, 8, 7]) }],
        ['Cascada', 'Sumas y restas hasta el total', { chartType: 'waterfall', color: C[5], data: d(['Ingresos', 'Materia prima', 'Personal', 'Alquiler', 'Otros', 'Beneficio'], [980, -310, -380, -120, -60, 0]) }],
        'El radar resume la encuesta de clientes (de 0 a 10). La cascada va de los ingresos al beneficio, en miles de euros; la última barra, con valor 0, es el total.'),
      two('Embudo y rectángulos', ['Embudo', 'Cada paso, menos que el anterior', { chartType: 'funnel', color: C[3], data: d(['Ven la oferta', 'Abren la app', 'Piden', 'Repiten'], [12000, 5200, 2100, 900]) }],
        ['Rectángulos', 'El área de cada uno, su peso', { chartType: 'treemap', data: d(['Centro', 'Campus', 'Puerto', 'Estación', 'Aeropuerto', 'Mercado'], [470, 490, 330, 250, 180, 120]) }],
        'El embudo cuenta una conversión; los rectángulos, qué parte de las ventas hace cada tienda.'),
      { title: 'Opciones de cualquier gráfico', layout: 'titleOnly', extra: [tableBlock({ x: 90, y: 165, w: 1100, h: 480, fontSize: 22, header: true, headBg: C[0], headFg: '#ffffff', stroke: '#c9d3df', banded: true, band: C[0],
        rows: [['Opción', 'En el archivo', 'Para qué'], ['Tipo de gráfico', "chartType: 'bar'…", 'Uno de los 15 tipos (y mapas)'], ['Color', "color: '#156082'", 'El de la primera serie'],
          ['Series', 'series: [{ name, values }]', 'Más columnas de datos'], ['Combinado', 'combo: true', 'Barras con las demás series en línea'], ['Cuadrícula', 'grid: true', 'Líneas guía con la escala'],
          ['Etiquetas de datos', 'dataLabels: true', 'El valor escrito en cada barra o sector'], ['Títulos de los ejes', "xTitle · yTitle", 'Qué se mide en cada eje'], ['Datos vinculados', 'Vincular CSV', 'Se actualiza al cambiar el archivo']].map((r, i) => i ? [r[0], `<span style="font-family:${MONO}">${r[1]}</span>`, r[2]] : r),
        colW: [3, 4, 5] })],
        notes: 'Todo en la pestaña Gráfico: Editar datos, Vincular CSV, Tipo, Color, Cuadrícula y Etiquetas de datos.' },
    ]);
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Every diagram layout (written as an outline) and the four colour schemes,
  // several shown one item at a time. The story: a neighbourhood film festival.
  showcase_diagrams: { name: 'Catálogo: diagramas', cat: 'showcase', summary: 'Los 15 diseños de diagrama escritos como esquema, los 4 esquemas de color y la aparición uno a uno al presentar', make: () => {
    const p = PALETTES.warm, C = p.accents, BG = '#2b1512', W = '#fff4ec', DIM = '#d9bfae', H = pairStacks('classic').heading;
    const lab = (n, v, x, y, w, extra = '') => cap(n, `layout: '${v}'${extra}`, x, y, w, W);
    const panel = (x, y, w, h) => shape('rounded', x, y, w, h, '#ffffff', { opacity: 5, radius: 16 });
    return build({ name: 'Catálogo: diagramas', palette: 'warm', fonts: 'classic', title: { color: C[1], size: 48 },
      decor: p0 => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: p0.accents[1] + '55', strokeWidth: 1.5 })] }, [
      { layout: 'blank', bg: BG, extra: [glow(620, -160, 760, C[0], BG, 40),
        kicker('CATÁLOGO DE FUNCIONES · 8', 100, 170, 500, C[1]),
        text('Diagramas', 96, 205, 600, 130, { fontFamily: H, fontSize: 96, color: W }),
        text('Quince diseños que se escriben como un esquema: cada línea, una caja; con dos espacios delante, depende de la de arriba.', 100, 350, 540, 140, { fontSize: 27, color: DIM }),
        dg('radial', 'Festival\n  Películas\n  Voluntarios\n  Patrocinio\n  Público\n  Sede', 680, 120, 500, 480, { colors: 'colorful' })],
        notes: 'Toda la presentación cuenta cómo organizar un festival de cine de barrio. Insertar ▸ Diagrama; doble clic para escribir el esquema.' },
      { title: 'Listas', layout: 'titleOnly', bg: BG, extra: [
        dg('list', 'Elegir la sede\nBuscar películas\nPedir permisos\nAnunciarlo', 100, 175, 300, 380), lab('Lista vertical', 'list', 100, 570, 300),
        dg('bullets', 'Reservar el local\nContratar el sonido\nImprimir carteles\nAbrir la taquilla', 425, 175, 330, 380), lab('Lista numerada', 'bullets', 425, 570, 330),
        dg('cards', 'Cortos\n  De diez minutos\nDel barrio\n  Hechos aquí\nClásicos\n  En versión original', 780, 175, 400, 380), lab('Tarjetas', 'cards', 780, 570, 400)],
        notes: 'En «Tarjetas» la línea con dos espacios delante es el texto de debajo de cada título.' },
      { title: 'Proceso y galones', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Idea\nEquipo\nProgramación\nDifusión\nEstreno', 100, 165, 1080, 180, { oneByOne: true }), lab('Proceso', 'process', 100, 350, 1080, ' · oneByOne: true'),
        dg('chevrons', 'Marzo\n  Convocatoria\nMayo\n  Selección\nJulio\n  Proyecciones\nSeptiembre\n  Balance', 100, 425, 1080, 180, { colors: 'accent' }), lab('Galones', 'chevrons', 100, 610, 1080)],
        notes: 'El proceso aparece paso a paso al presentar («Uno a uno al presentar», oneByOne). Los galones usan un solo color en tonos.' },
      { title: 'Escalera y cronología', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Barrio\nCiudad\nComarca\nRegión', 100, 165, 520, 400), lab('Escalera', 'steps', 100, 575, 520),
        dg('timeline', '2023\n  Primera edición\n2024\n  Mil espectadores\n2025\n  Sección infantil\n2026\n  Cine al aire libre', 660, 165, 520, 400, { oneByOne: true }), lab('Cronología', 'timeline', 660, 575, 520, ' · uno a uno')],
        notes: 'La escalera para crecer por etapas; la cronología, con su año y lo que pasó, aparece hito a hito.' },
      { title: 'Ciclo y radial', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Proyectar\nEscuchar al público\nMejorar\nVolver a proyectar', 100, 165, 520, 400, { oneByOne: true }), lab('Ciclo', 'cycle', 100, 575, 520, ' · uno a uno'),
        dg('radial', 'Proyección\n  Pantalla\n  Sonido\n  Sillas\n  Luz\n  Permisos', 660, 165, 520, 400, { colors: 'light' }), lab('Radial', 'radial', 660, 575, 520, " · colors: 'light'")],
        notes: 'El ciclo para lo que se repite cada año; el radial, para lo que gira alrededor de una idea.' },
      { title: 'Organigrama', layout: 'titleOnly', bg: BG, extra: [
        dg('hierarchy', 'Coordinación\n  Programación\n    Selección\n    Derechos\n  Producción\n    Sede\n    Técnica\n  Comunicación\n    Redes\n    Prensa', 100, 165, 1080, 420, { oneByOne: true }),
        lab('Organigrama', 'hierarchy', 100, 600, 1080, ' · uno a uno: cada rama con un clic')],
        notes: 'Tres niveles: cada dos espacios de sangría, un nivel más abajo. Al presentar aparece por partes.' },
      { title: 'Venn y matriz', layout: 'titleOnly', bg: BG, extra: [
        dg('venn', 'Buenas películas\nPrecio popular\nUn sitio bonito', 100, 165, 520, 400), lab('Venn', 'venn', 100, 575, 520),
        dg('matrix', 'Urgente e importante\nImportante\nUrgente\nPuede esperar', 660, 165, 520, 400, { colors: 'accent' }), lab('Matriz 2 × 2', 'matrix', 660, 575, 520)],
        notes: 'Venn: el festival ideal está donde se cruzan las tres. La matriz ordena las tareas por urgencia e importancia.' },
      { title: 'Pirámide, embudo y diana', layout: 'titleOnly', bg: BG, extra: [
        dg('pyramid', 'Patrocinio\nVoluntarios\nVecinos', 100, 175, 340, 380), lab('Pirámide', 'pyramid', 100, 570, 340),
        dg('funnel', 'Ven el cartel\nCompran entrada\nVienen\nRepiten', 470, 175, 340, 380), lab('Embudo', 'funnel', 470, 570, 340),
        dg('target', 'Cultura\nBarrio\nFamilias\nNiños', 840, 175, 340, 380), lab('Diana', 'target', 840, 570, 340)],
        notes: 'Las tres de «relación»: niveles que se apoyan, pasos que se van estrechando y círculos concéntricos.' },
      { title: 'Cuatro esquemas de color', layout: 'titleOnly', bg: BG, extra: [['colorful', 'Colorido'], ['accent', 'Un color'], ['light', 'Claro'], ['outline', 'Contorno']]
        .flatMap(([v, n], i) => { const [x, y] = cell(i, 2, 100, 165, 550, 250);
          return [panel(x, y, 530, 230), dg('chevrons', 'Idea\nPlan\nFestival', x + 20, y + 15, 490, 150, { colors: v }), cap(n, `colors: '${v}'`, x, y + 168, 530, W)]; }),
        notes: 'Diagrama ▸ Colores. Los colores salen de la paleta de la presentación: si cambias la paleta, cambian todos los diagramas.' },
    ]);
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · Polls and activities answered from phones: every kind, the countdown in its
  // three styles, and classroom mode (the deck follows on the students' devices).
  showcase_polls: { name: 'Catálogo: votaciones y actividades', cat: 'showcase', summary: 'Los 11 tipos de votación y actividad desde el móvil, cuenta atrás en sus tres estilos, clasificación y modo aula', make: () => {
    const p = PALETTES.violet, C = p.accents, BG = '#1d1140', W = '#ffffff', DIM = '#cbbcf0', H = pairStacks('friendly').heading;
    const head = (n, v, x, w, sub = '') => text(`<div><b>${n}</b> <span style="font-family:${MONO};font-size:.72em;color:${C[2]}">kind: '${v}'</span></div>${sub ? `<div style="font-size:.7em;color:${DIM}">${sub}</div>` : ''}`,
      x, 36, w, sub ? 76 : 44, { fontSize: 28, color: W });
    const poll = (props, x = 60, w = 1160, y = 120, h = 560) => pollBlock({ fontSize: 30, x, y, w, h, ...props });
    const half = (i, n, v, sub, props) => [head(n, v, i ? 660 : 60, 560, sub), poll({ fontSize: 34, ...props }, i ? 660 : 60, 560, 125, 555)];
    const flower = svgURL(600, 600, '<rect width="600" height="600" fill="#f4f1ff"/><path d="M300 330 C300 420 290 500 300 590" stroke="#4caf50" stroke-width="16" fill="none"/>'
      + '<path d="M300 470 C360 420 430 430 470 460 C420 500 350 500 300 470Z" fill="#66bb6a"/>'
      + [0, 72, 144, 216, 288].map(a => `<ellipse cx="300" cy="190" rx="55" ry="95" fill="#f15bb5" transform="rotate(${a} 300 280)"/>`).join('')
      + '<circle cx="300" cy="280" r="55" fill="#fee440"/><path d="M220 590 Q300 560 380 590" stroke="#8d6e63" stroke-width="10" fill="none"/>');
    const deck = build({ name: 'Catálogo: votaciones y actividades', palette: 'violet', fonts: 'friendly', title: { color: W, size: 44 } }, [
      { layout: 'blank', bg: BG, extra: [glow(700, -250, 800, C[0], BG, 45), glow(-250, 350, 600, C[1], BG, 30),
        kicker('CATÁLOGO DE FUNCIONES · 9', 90, 120, 600, C[4]),
        text('Votaciones<br>y actividades', 86, 150, 700, 210, { fontFamily: H, fontSize: 80, color: W, lineHeight: 1.05, fontWeight: 700 }),
        text('El público responde desde el móvil escaneando el QR. Once tipos, una cuenta atrás y el modo aula.', 90, 370, 640, 90, { fontSize: 27, color: DIM }),
        ...[['Elección', 'choice'], ['Varias', 'multi'], ['Valoración', 'rating'], ['Nube', 'word'], ['Preguntas', 'qa'], ['Concurso', 'quiz'], ['Clasificación', 'board'],
          ['Ordenar', 'order'], ['Relacionar', 'match'], ['Huecos', 'gaps'], ['Etiquetar', 'label']].map(([n, v], i) =>
          pill(`<b>${n}</b> ${code(v)}`, 90 + (i % 4) * 270, 485 + Math.floor(i / 4) * 50, 256, '#ffffff14', W, { fontSize: 18, borderColor: C[i % 6] + 'aa' })),
        timer(90, 960, 150, 230, { style: 'ring', color: C[4], auto: false, sound: false })],
        notes: 'Cada votación muestra su QR al presentar; los resultados se ven en directo. Esta presentación tiene activado el modo aula (pestaña Ver ▸ Aula ▸ Modo aula).' },
      { layout: 'blank', bg: BG, extra: [head('Elección única', 'choice', 60, 1160, 'Una opción por persona; resultado en barras'),
        poll({ kind: 'choice', display: 'bar', question: '¿Con qué película abrimos el festival?', options: ['Una comedia', 'Un documental del barrio', 'Un clásico en versión original'], y: 130, h: 550 })],
        notes: 'Votación ▸ Editar votación: pregunta, opciones y cómo se muestran los resultados (barras, tarta o números).' },
      { layout: 'blank', bg: BG, extra: [head('Varias respuestas', 'multi', 60, 1160, 'Se marcan todas las que se quiera; resultado en tarta'),
        poll({ kind: 'multi', display: 'pie', question: '¿Qué días puedes venir?', options: ['Viernes por la tarde', 'Sábado', 'Domingo por la mañana'], y: 130, h: 550 })],
        notes: 'Con display: \'pie\' el resultado sale en un gráfico circular.' },
      { layout: 'blank', bg: BG, extra: [...half(0, 'Valoración', 'rating', 'De 1 a 5, se ve la media', { kind: 'rating', display: 'numbers', question: '¿Qué tal la sesión?', options: [] }),
        ...half(1, 'Nube de palabras', 'word', 'Las más repetidas, más grandes', { kind: 'word', question: 'El festival en una palabra', options: [] })],
        notes: 'La valoración da la media de estrellas; la nube agranda las palabras que más se repiten.' },
      { layout: 'blank', bg: BG, extra: [...half(0, 'Preguntas del público', 'qa', 'Se envían y se votan', { kind: 'qa', question: 'Preguntas para el coloquio', options: [] }),
        ...half(1, 'Clasificación', 'board', 'Suma los puntos de los concursos', { kind: 'board', question: '' })],
        notes: 'Preguntas: las más votadas suben arriba, ideal para coloquios. Clasificación: se actualiza sola con los puntos de cada concurso y actividad de la presentación.' },
      { layout: 'blank', bg: '#46178f', extra: [head('Concurso', 'quiz', 60, 1160, 'Respuesta correcta y 20 segundos: puntos por acertar y por rapidez'),
        poll({ kind: 'quiz', question: '¿En qué año se proyectó la primera película en público?', options: ['1895', '1910', '1927', '1939'], correct: [0], time: 20, fontSize: 36, y: 130, h: 550 })],
        notes: 'Como Kahoot: cada acierto suma entre 500 y 1000 puntos según lo rápido que se conteste.' },
      { layout: 'blank', bg: BG, extra: [...half(0, 'Ordenar', 'order', 'Se escriben en el orden correcto', { kind: 'order', question: 'Ordena: rodar un corto', options: ['Guion', 'Rodaje', 'Montaje', 'Estreno'] }),
        ...half(1, 'Relacionar', 'match', 'Parejas «izquierda = derecha»', { kind: 'match', question: 'Cada oficio, su tarea', options: ['Guion = Historia', 'Montaje = Planos', 'Dirección = Rodaje'] })],
        notes: 'En el móvil aparecen desordenados; Revela corrige y da puntos por cada acierto.' },
      { layout: 'blank', bg: BG, extra: [...half(0, 'Rellenar huecos', 'gaps', 'Entre corchetes, la respuesta', { kind: 'gaps', question: 'Completa la frase', options: [], text: 'El cine llegó a España en [1896]. La primera película en color se llamó «[La Cucaracha]».' }),
        ...half(1, 'Etiquetar una imagen', 'label', 'Cada etiqueta, en su punto', { kind: 'label', question: 'Partes de una flor', options: ['Pétalo', 'Tallo', 'Hoja', 'Centro'], image: flower, points: [{ x: 50, y: 22 }, { x: 50, y: 70 }, { x: 70, y: 79 }, { x: 50, y: 47 }] })],
        notes: 'En los huecos valen varias respuestas con [a|b]. La imagen de la flor es un dibujo SVG hecho para esta plantilla.' },
      { title: 'Cuenta atrás: tres estilos', layout: 'titleOnly', bg: BG, extra: [
        ...[['ring', 'Anillo', 300], ['bar', 'Barra', 120], ['digital', 'Números', 60]].flatMap(([v, n, sec], i) => { const x = 90 + i * 375;
          return [shape('rounded', x, 175, 350, 380, '#ffffff', { opacity: 7, radius: 18 }), timer(sec, x + 55, 200, 240, { style: v, color: C[[4, 2, 1][i]], auto: i === 0, sound: true, endText: '¡Tiempo!' }),
            cap(n, `style: '${v}' · ${sec} s`, x, 470, 350, W)]; }),
        text(`Empieza sola al llegar ${code('auto')} · suena al acabar ${code('sound')} · texto final ${code('endText')} · un clic la pausa`, 90, 590, 1100, 40, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Insertar ▸ Cuenta atrás. Minutos y segundos, estilo y color en su pestaña. Aquí solo la primera empieza sola.' },
      { title: 'Modo aula y a su ritmo', layout: 'titleOnly', bg: BG, extra: [
        ...[['Modo aula', 'El alumnado sigue las diapositivas en su móvil o portátil (código y QR en la esquina) y responde ahí. Activado en esta presentación.', 'deck.classroom'],
          ['A su ritmo', 'Se presenta sin móviles: cada persona responde las actividades dentro de las diapositivas, para practicar o en casa.', 'Ver ▸ Aula ▸ A su ritmo'],
          ['Resultados del aula', 'Los puntos de cada alumno en cada concurso y actividad, y descarga en CSV.', 'Resultados del aula'],
          ['En la plataforma', 'Como tarea de Moodle u otra plataforma (LTI): el servidor corrige y devuelve la nota.', 'Compartir en el aula']]
          .map(([h, d, v], i) => { const [x, y] = cell(i, 2, 90, 175, 560, 235);
            return card(`<div style="font-size:30px;font-weight:800;color:${C[[4, 2, 0, 1][i]]}">${h}</div><div style="margin-top:8px">${d}</div><div style="font-family:${MONO};font-size:16px;color:${DIM};margin-top:10px">${v}</div>`,
              x, y, 540, 210, '#ffffff12', { fontSize: 21, color: W }); })],
        notes: 'Todo en la pestaña Presentación con diapositivas: Modo aula, A su ritmo y Resultados del aula.' },
    ]);
    deck.classroom = true;
    return deck;
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · Other objects: code with line steps, equations, icons, devices around a
  // screen, tables with styles and formulas, slide zooms and connectors.
  showcase_objects: { name: 'Catálogo: multimedia y objetos', cat: 'showcase', summary: 'Código con pasos, ecuaciones, iconos, cinco dispositivos, tablas con estilos y fórmulas, zoom de diapositiva y conectores', make: () => {
    const INK = '#141414', SOFT = '#5c5c5c', ACC = '#e8590c', BLUE = '#1971c2', GREEN = '#2f9e44', LIGHT = '#f3f3f1', H = pairStacks('modern').heading;
    const ICONS = ['check', 'close', 'plus', 'arrow', 'circle', 'square', 'triangle', 'star', 'heart', 'home', 'mail', 'clock', 'location', 'bolt', 'user', 'gear'];
    const dev = (kind, src, x, y, w, h, alt) => image(src, x, y, w, h, alt, { device: kind });
    const box = (html, x, y, w, h, bg) => text(html, x, y, w, h, { fontSize: 24, bg, color: '#ffffff', radius: 14, textAlign: 'center', vAlign: 'middle', fontWeight: 700 });
    const link = (a, b, props = {}) => ({ id: uid(), x: 0, y: 0, w: 1280, h: 720, rotation: 0, animation: null, type: 'connector', from: a.id, to: b.id, color: '#8a8a8a', arrow: true, width: 3, ...props });
    const zoom = (x, y) => ({ id: uid(), x, y, w: 320, h: 180, rotation: 0, animation: null, type: 'slideref', target: null, returnBack: true });
    const zooms = [zoom(90, 230), zoom(480, 230), zoom(870, 230)];
    const n1 = box('Idea', 90, 200, 200, 90, ACC), n2 = box('Prototipo', 540, 200, 200, 90, BLUE), n3 = box('Prueba', 990, 200, 200, 90, GREEN),
      n4 = box('Datos', 90, 470, 200, 90, '#495057'), n5 = box('Informe', 540, 470, 200, 90, '#862e9c'), n6 = box('Decisión', 990, 470, 200, 90, '#c2255c');
    const deck = build({ name: 'Catálogo: multimedia y objetos', palette: 'grayscale', fonts: 'modern', title: { color: INK, size: 44 },
      decor: () => [shape('rect', 1240, 0, 40, 720, ACC)] }, [
      { layout: 'blank', extra: [
        shape('rect', 700, 90, 440, 520, LIGHT, { rotation: 6 }), dev('phone', appScreen(360, 720, ACC, 'Agenda'), 760, 140, 200, 400, 'Una app de agenda en un móvil'),
        mathBlock({ x: 970, y: 150, w: 220, h: 90, fontSize: 34, latex: 'e^{i\\pi}+1=0', color: INK }), icon('star', 1000, 420, 90, ACC), icon('bolt', 900, 470, 70, BLUE),
        kicker('CATÁLOGO DE FUNCIONES · 10', 90, 170, 560, ACC),
        text('Multimedia<br>y objetos', 86, 205, 600, 220, { fontFamily: H, fontSize: 84, color: INK, lineHeight: 1.05, fontWeight: 800 }),
        text('Código, ecuaciones, iconos, dispositivos, tablas, zoom de diapositiva y conectores.', 90, 440, 560, 100, { fontSize: 28, color: SOFT })],
        notes: 'Todo está en la pestaña Insertar. Cada objeto tiene además su propia pestaña al seleccionarlo.' },
      { title: 'Código con pasos', layout: 'titleOnly', extra: [
        codeBlock({ x: 90, y: 165, w: 740, h: 470, fontSize: 24, lang: 'python', lineSteps: '1-2|4-6|8-9',
          code: 'precios = [3.5, 2.0, 4.25]\ncantidad = [2, 1, 3]\n\ntotal = 0\nfor p, c in zip(precios, cantidad):\n    total += p * c\n\niva = total * 0.21\nprint(f"Total: {total + iva:.2f} €")' }),
        card(`<div style="font-family:${MONO};font-size:17px;color:${ACC}">lineSteps: '1-2|4-6|8-9'</div><div style="margin-top:10px">Cada clic resalta un grupo de líneas: primero los datos, luego el bucle y al final el resultado.</div>`
          + `<div style="font-family:${MONO};font-size:20px;color:${ACC};margin-top:16px">lang: 'python'</div><div style="margin-top:6px">Colores según el lenguaje.</div>`, 860, 165, 330, 470, LIGHT, { fontSize: 22, color: INK })],
        notes: 'Insertar ▸ Código. En «Editar código y pasos» se escriben los grupos de líneas separados por |.' },
      { title: 'Ecuaciones', layout: 'titleOnly', extra: [
        ...[['x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', 'Fracción y raíz'], ['\\int_0^1 x^2\\,dx = \\frac{1}{3}', 'Integral'], ['\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', 'Suma'],
          ['A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', 'Matriz']].flatMap(([l, n], i) => { const [x, y] = cell(i, 2, 90, 165, 560, 200);
          return [shape('rounded', x, y, 540, 180, LIGHT, { radius: 14 }), mathBlock({ x: x + 20, y: y + 10, w: 500, h: 120, fontSize: 40, latex: l, color: INK }), cap(n, '', x, y + 135, 540, SOFT)]; }),
        text('También dentro del texto, entre dólares: el área del círculo es $A = \\pi r^2$.', 90, 590, 1100, 50, { fontSize: 26, color: INK, textAlign: 'center' })],
        notes: 'Insertar ▸ Ecuación (LaTeX, con KaTeX). En un cuadro de texto, lo que va entre $ y $ se escribe como ecuación.' },
      { title: 'Iconos', layout: 'titleOnly', extra: ICONS.flatMap((n, i) => { const [x, y] = cell(i, 8, 90, 180, 140, 220), c = [ACC, BLUE, GREEN, INK][i % 4];
        return [shape('rounded', x, y, 124, 124, LIGHT, { radius: 18 }), { ...icon(n, x + 27, y + 27, 70, c), decorative: false, alt: n }, cap('', `'${n}'`, x - 8, y + 130, 140, SOFT)]; }),
        notes: 'Los dieciséis iconos de Revela (Insertar ▸ Iconos); en Insertar ▸ Iconos en línea hay más de 200 000. Cambian de color con su pestaña.' },
      { title: 'Dispositivos: móvil, tableta y portátil', layout: 'titleOnly', extra: [
        dev('phone', appScreen(360, 720, ACC, 'Agenda'), 110, 170, 220, 440, 'App de agenda en un móvil'), cap('Móvil', "device: 'phone'", 90, 620, 260, INK),
        dev('tablet', appScreen(768, 1024, BLUE, 'Agenda · Semana', 5), 400, 180, 320, 420, 'App de agenda en una tableta'), cap('Tableta', "device: 'tablet'", 430, 620, 260, INK),
        dev('laptop', appScreen(1280, 800, GREEN, 'Agenda · Panel', 3), 770, 240, 420, 290, 'Panel de la agenda en un portátil'), cap('Portátil', "device: 'laptop'", 850, 620, 260, INK)],
        notes: 'Imagen ▸ Dispositivo: la captura se coloca dentro de la pantalla. Las pantallas de esta diapositiva son dibujos SVG.' },
      { title: 'Dispositivos: monitor y navegador', layout: 'titleOnly', extra: [
        dev('monitor', appScreen(1920, 1080, '#495057', 'Agenda · Equipo', 3), 90, 190, 520, 380, 'Agenda del equipo en un monitor'), cap('Monitor', "device: 'monitor'", 220, 590, 260, INK),
        dev('browser', appScreen(1280, 800, ACC, 'agenda.example', 3), 670, 200, 520, 340, 'La web de la agenda en un navegador'), cap('Navegador', "device: 'browser'", 800, 590, 260, INK)],
        notes: 'La misma opción sirve para fotos y capturas reales: Imagen ▸ Dispositivo ▸ Monitor o Ventana del navegador.' },
      { title: 'Tablas con estilo', layout: 'titleOnly', extra: [
        tableBlock({ x: 90, y: 175, w: 530, h: 300, fontSize: 22, header: true, headBg: ACC, headFg: '#ffffff', stroke: '#e9a37f', banded: true, band: ACC,
          rows: [['Sala', 'Plazas', 'Pantalla'], ['Azul', '24', 'Sí'], ['Verde', '12', 'No'], ['Grande', '80', 'Sí']], colW: [3, 2, 2] }),
        cap('Encabezado y bandas', 'header · banded · band', 90, 490, 530, INK),
        tableBlock({ x: 660, y: 175, w: 530, h: 300, fontSize: 22, header: true, headBg: '', headFg: '', stroke: '#9a9a9a', lines: true,
          rows: [['Turno', 'Lunes', 'Martes'], ['Mañana', 'Ana', 'Luis'], ['Tarde', 'Marta', 'Marta'], ['Noche', 'Cerrado', '']], colW: [2, 2, 2],
          merges: [{ r: 3, c: 1, rs: 1, cs: 2 }], cellBg: { '2,1': '#ffe8cc', '2,2': '#ffe8cc' } }),
        cap('Mínima, celdas combinadas y color', 'lines · merges · cellBg', 660, 490, 530, INK),
        text('Tabla ▸ Estilo de tabla: sencilla, cuadrícula, tres de bandas y mínima, con los colores de la paleta.', 90, 590, 1100, 40, { fontSize: 22, color: SOFT, textAlign: 'center' })],
        notes: 'La segunda tabla une dos celdas de la última fila y colorea las de Marta.' },
      { title: 'Tablas que calculan', layout: 'titleOnly', extra: [
        tableBlock({ x: 90, y: 175, w: 720, h: 420, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#bdbdbd', banded: true, band: '#7f7f7f',
          rows: [['Producto', 'Precio', 'Unidades', 'Importe'], ['Cuaderno', '3,50 €', '4', '=B2*C2'], ['Rotuladores', '6,20 €', '2', '=B3*C3'], ['Carpeta', '2,80 €', '5', '=B4*C4'],
            ['<b>Total</b>', '', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)'], ['<b>Media</b>', '=PROMEDIO(B2:B4)', '', '=MAX(D2:D4)']], colW: [3, 2, 2, 2] }),
        card(`<div><b>Fórmulas</b></div><div style="font-family:${MONO};font-size:18px;line-height:1.8;margin-top:8px">=B2*C2<br>=SUMA(ARRIBA)<br>=PROMEDIO(B2:B4)<br>=MAX(D2:D4)</div><div style="margin-top:10px">Cambia un precio y todo se recalcula.</div>`,
          850, 175, 340, 420, LIGHT, { fontSize: 22, color: INK })],
        notes: 'Las celdas que empiezan por = calculan: SUMA, PROMEDIO, MIN, MAX, CONTAR, PRODUCTO y REDONDEAR, con ARRIBA, IZQUIERDA o rangos como B2:B4. Precios de ejemplo.' },
      { title: 'Zoom de diapositiva', layout: 'titleOnly', extra: [
        ...zooms, ...['Código', 'Iconos', 'Tablas'].map((n, i) => cap(n, "type: 'slideref'", 90 + i * 390, 420, 320, INK)),
        text('Al presentar, un clic en una miniatura salta a esa diapositiva y, al terminar, vuelve aquí (Volver aquí). Sirve como índice o menú.', 90, 520, 1100, 80, { fontSize: 24, color: SOFT, textAlign: 'center' })],
        notes: 'Insertar ▸ Zoom: una miniatura viva de otra diapositiva. Si la cambias, la miniatura se actualiza sola.' },
      { title: 'Conectores entre formas', layout: 'titleOnly', extra: [n1, n2, n3, n4, n5, n6,
        link(n1, n2), link(n2, n6, { route: 'curve', color: BLUE }), link(n1, n5, { route: 'elbow', color: ACC }), link(n4, n5, { dash: 'dash' }), link(n5, n6, { arrowStart: true, color: '#c2255c' }), link(n3, n6, { color: GREEN, dash: 'dot' }),
        cap('Recto', "route: 'straight'", 300, 160, 230, SOFT), cap('Curvo', "route: 'curve'", 820, 300, 200, SOFT), cap('De codo', "route: 'elbow'", 428, 330, 130, SOFT, { textAlign: 'left', fontSize: 18 }),
        cap('A guiones', "dash: 'dash'", 300, 575, 230, SOFT), cap('Flecha en los dos extremos', 'arrowStart: true', 740, 575, 240, SOFT), cap('Punteado', "dash: 'dot'", 1100, 330, 120, SOFT, { textAlign: 'left' })],
        notes: 'Selecciona dos objetos y pulsa Conectar (Inicio ▸ Organizar): la línea los sigue cuando se mueven. En su pestaña: recto, de codo o curvo, flechas y tipo de línea.' },
    ]);
    // The zooms point at the slides of code, icons and tables.
    [1, 3, 6].forEach((k, i) => { zooms[i].target = deck.slides[k].id; });
    return deck;
  } },
};
