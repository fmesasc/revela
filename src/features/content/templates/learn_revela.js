// Example presentations: Aprende Revela (showcase). Each one: { name, summary, cat: 'showcase', make() } → a deck
// (see kit.js for the builders).
//
// Ten lessons that teach Revela step by step, one task each, and that USE what
// they teach: the animations lesson is animated, the live-polls one has polls
// that work, the Transform one transforms, the presenting one carries notes on
// every slide… The names of tabs and buttons are the interface's own (Spanish),
// written «Pestaña ▸ Botón». Each lesson has its own visual idea: a recipe card,
// a house move, a theatre, a metamorphosis, a cockpit, a TV quiz show, a cork
// board, a chat under the northern lights, a swatch book and a departures board.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';
import { motionPoints } from '../../animation/transitions.js';

// ---- Helpers of this file ---------------------------------------------------------
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const RR = (x, y, w, h, fill, radius = 16, p = {}) => shape('rounded', x, y, w, h, fill, { radius, ...p });
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
// A picture drawn in SVG, as a data URL (no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, s, fill, str, extra = '') => `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${s}" fill="${fill}"${extra}>${esc(str)}</text>`;
// One animation on an object; objects one after another (the first waits for the click unless told otherwise).
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
const chain = (blocks, effect, props = {}, first = 'click') => blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// The same object on several slides (Transform): the same id.
const same = (id, b) => ({ ...b, id });
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 5, color, fontWeight: 700, ...props });
// «Pestaña ▸ Botón», as a pill (where to click).
const where = (path, x, y, w, bg, color, props = {}) => text(path.replace(/ ▸ /g, ' <b>▸</b> '), x, y, w, 42, { fontSize: 21, bg, color, radius: 21, pad: [0, 16, 0, 16], vAlign: 'middle', ...props });
// A key of the keyboard.
const key = (k, x, y, w, props = {}) => text(`<b>${k}</b>`, x, y, w, 52, { fontSize: 22, textAlign: 'center', vAlign: 'middle', bg: '#fbfbfd', color: '#1d2230', radius: 10,
  borderColor: '#c4c9d4', shadow: { x: 0, y: 4, blur: 0, color: '#9aa1b0' }, ...props });
// A numbered step: a disc with the number and the text beside it.
const stepRow = (n, html, x, y, w, c, fg, props = {}) => [
  E(x, y, 48, 48, c), text(`<b>${n}</b>`, x, y, 48, 48, { fontSize: 24, color: props.numColor || '#ffffff', textAlign: 'center', vAlign: 'middle' }),
  text(html, x + 66, y - 2, w - 66, props.h || 56, { fontSize: props.size || 24, color: fg, vAlign: 'middle', lineHeight: 1.25 })];
// The deck's text colour (tables and polls take it): for slides whose background isn't the palette's.
const inkColor = (deck, color) => Object.assign(deck, { textColor: color });
// A 3D model without its caption (credits on one line, when the licence asks for one).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
// A stroke through points on the slide (an ink object: it can be drawn as you present, effect 'draw').
const ink = (pts, color, width = 4, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const px = Math.max(6, (80 - (Math.max(...xs) - Math.min(...xs))) / 2), py = Math.max(6, (80 - (Math.max(...ys) - Math.min(...ys))) / 2);
  const x = Math.min(...xs) - px, y = Math.min(...ys) - py, w = Math.max(...xs) - x + px, h = Math.max(...ys) - y + py;
  return { ...base(Math.round(x), Math.round(y), Math.round(w), Math.round(h)), type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
const curvePts = (start, rel, n = 60) => motionPoints({ pathShape: 'custom', points: [[0, 0], ...rel] }, n).map(([x, y]) => [start[0] + x, start[1] + y]);
// Contrast between two colours (WCAG), to print it next to the samples.
const lum = hex => { const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(1).replace('.', ','); };

// A made-up but faithful picture of Revela's editor: title bar, the ribbon's tabs (the real
// ones), a few buttons of the open tab (one of them highlighted), the slides panel and a slide.
const TABS = ['Archivo', 'Inicio', 'Insertar', 'Dibujar', 'Diseño', 'Transiciones', 'Animaciones', 'Ver', 'IA'];
const editorSVG = ({ tab = 'Inicio', buttons = [], hi = -1, accent = '#3f6497', slide = '', slideBg = '#ffffff' }) => {
  const W = 1200, H = 720; let x = 20, s = '';
  s += `<rect width="${W}" height="48" fill="#1e2330"/><circle cx="34" cy="24" r="12" fill="${accent}"/>` + T(56, 31, 20, '#ffffff', 'Revela', ' font-weight="700"')
    + T(150, 31, 17, '#aab2c5', 'Mi presentación') + `<rect x="1040" y="10" width="140" height="28" rx="14" fill="#2f3647"/>` + T(1068, 30, 16, '#ffffff', '✦ Asistente');
  s += `<rect y="48" width="${W}" height="46" fill="#ffffff"/>`;
  for (const tb of TABS) { const w = tb.length * 11 + 28, on = tb === tab;
    if (on) s += `<rect x="${x}" y="88" width="${w}" height="4" rx="2" fill="${accent}"/>`;
    s += T(x + 14, 78, 19, on ? accent : '#4a5164', tb, on ? ' font-weight="700"' : ''); x += w; }
  s += `<rect y="94" width="${W}" height="104" fill="#f6f7fa"/><rect y="197" width="${W}" height="1" fill="#dde1e8"/>`;
  x = 20; buttons.forEach((b, i) => { const w = Math.max(104, b.length * 9.5 + 28), on = i === hi;
    if (on) s += `<rect x="${x - 4}" y="100" width="${w + 8}" height="92" rx="10" fill="${accent}22" stroke="${accent}" stroke-width="3"/>`;
    s += `<rect x="${x + w / 2 - 17}" y="112" width="34" height="34" rx="8" fill="${on ? accent : '#c9d1e0'}"/>` + T(x + w / 2, 176, 16, '#2b3040', b, ' text-anchor="middle"'); x += w + 10; });
  s += `<rect y="198" width="190" height="${H - 198}" fill="#eceff4"/>`;
  [0, 1, 2, 3].forEach(i => { s += `<rect x="28" y="${214 + i * 104}" width="134" height="76" rx="4" fill="${i ? '#ffffff' : slideBg}" stroke="${i ? '#d3d8e2' : accent}" stroke-width="${i ? 1 : 3}"/>`
    + T(12, 230 + i * 104, 13, '#7a8296', String(i + 1)); });
  s += `<rect x="190" y="198" width="${W - 190}" height="${H - 198}" fill="#e3e6ec"/>`
    + `<rect x="252" y="222" width="840" height="472" fill="${slideBg}"/><g transform="translate(252 222) scale(${840 / 1280})">${slide}</g>`;
  return svgURL(W, H, s, '#e3e6ec');
};

// Objects that enter together: the first one with `start`, the rest with it.
const together = (objs, effect, start = 'click', props = {}) => objs.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'withPrev' : start })));

export default {

  // ============================================================================
  // 1 · The first presentation, as a recipe card: five steps, five minutes (a
  //     real countdown on the cover), gallery, layouts (the slides use them),
  //     writing with levels, a picture and presenting.
  learn_revela_first: { name: 'Tu primera presentación en 5 minutos', cat: 'showcase',
    summary: 'Una receta en cinco pasos: galería de ejemplos, diseños de diapositiva, escribir, insertar una imagen y presentar, con cuenta atrás',
    make: () => {
      const CREAM = '#fbf4e4', CARD = '#fffdf8', TOM = '#d9472b', BASIL = '#3f7d4e', INK = '#2f2a25', MUTED = '#7b6f60', MUST = '#e9b23a', LINE = '#e7dcc6';
      const H = pairStacks('friendly').heading;
      const gingham = svgURL(1280, 44, Array.from({ length: 27 }, (_, i) => `<rect x="${i * 48}" y="0" width="24" height="44" fill="${TOM}" opacity=".3"/>`).join('')
        + `<rect x="0" y="11" width="1280" height="22" fill="${TOM}" opacity=".3"/>`, CREAM);
      const strip = y => img(gingham, 0, y, 1280, 44, '', { fit: 'cover', decorative: true });
      // The header of a step: its number, its title and five dots for the five minutes.
      const header = (n, title, fg = INK, dim = MUTED) => [
        kicker(`PASO ${n} DE 5`, 90, 52, 400, TOM),
        text(title, 86, 82, 880, 72, { fontFamily: H, fontSize: 46, color: fg, fontWeight: 700 }),
        ...[0, 1, 2, 3, 4].map(i => E(1010 + i * 36, 70, 22, 22, i < n ? TOM : LINE)),
        text(`Minuto ${n}`, 1000, 100, 190, 32, { fontSize: 20, color: dim, textAlign: 'center' })];
      // A made-up gallery («Nueva presentación»), for the laptop.
      const gallery = svgURL(1280, 800,
        T(48, 70, 36, '#1f2330', 'Nueva presentación', ' font-weight="700"')
        + `<rect x="720" y="34" width="512" height="50" rx="25" fill="#f1f3f7" stroke="#d9dde6"/>` + T(752, 67, 22, '#7d8597', '🔍 Buscar…')
        + [['Empezar de cero', '#e9edf5'], ['Crear con IA', '#efe8fb'], ['Abrir un archivo', '#e8f4ee']].map(([l, c], i) =>
          `<rect x="48" y="${120 + i * 110}" width="300" height="90" rx="14" fill="${c}"/>` + T(76, 174 + i * 110, 24, '#2b3040', l, ' font-weight="600"')).join('')
        + `<rect x="384" y="112" width="860" height="420" rx="16" fill="#fff6e6" stroke="${TOM}" stroke-width="4"/>`
        + T(410, 152, 26, TOM, 'Presentaciones de ejemplo', ' font-weight="700"')
        + [['#26315f', '#ffcf5c'], ['#f4efe6', '#d9472b'], ['#0f2940', '#50e3c2'], ['#1b1030', '#f15bb5'], ['#f4f8f1', '#2e7d32'], ['#ffffff', '#156082']].map(([bg, ac], i) => {
          const x = 410 + (i % 3) * 276, y = 176 + Math.floor(i / 3) * 172;
          return `<rect x="${x}" y="${y}" width="256" height="144" rx="8" fill="${bg}" stroke="#e1d9c8"/><rect x="${x + 20}" y="${y + 30}" width="140" height="16" rx="6" fill="${ac}"/>`
            + `<rect x="${x + 20}" y="${y + 60}" width="200" height="9" rx="4" fill="${ac}" opacity=".45"/><rect x="${x + 20}" y="${y + 78}" width="170" height="9" rx="4" fill="${ac}" opacity=".3"/>`
            + `<circle cx="${x + 214}" cy="${y + 110}" r="18" fill="${ac}" opacity=".7"/>`; }).join('')
        + T(48, 600, 26, '#2b3040', 'Temas vacíos', ' font-weight="700"')
        + ['#3f6497', '#b5651d', '#2e7d32', '#9b5de5', '#404040'].map((c, i) => `<rect x="${48 + i * 238}" y="624" width="216" height="122" rx="10" fill="#ffffff" stroke="#dfe3ea"/>`
          + `<rect x="${68 + i * 238}" y="650" width="120" height="14" rx="6" fill="${c}"/><rect x="${68 + i * 238}" y="680" width="170" height="8" rx="4" fill="#d5d9e2"/>`).join(''), '#ffffff');
      // A photo for step 4 (a drawn landscape).
      const photo = svgURL(740, 660, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd59a"/><stop offset=".55" stop-color="#ffb07a"/><stop offset="1" stop-color="#f7d9b8"/></linearGradient></defs>`
        + `<rect width="740" height="660" fill="url(#s)"/><circle cx="520" cy="250" r="78" fill="#fff1c9"/>`
        + `<path d="M0 380 L140 250 L260 350 L400 210 L560 360 L740 260 V660 H0Z" fill="#c9785a"/><path d="M0 450 L180 340 L330 430 L520 320 L740 420 V660 H0Z" fill="#8f5a48"/>`
        + `<rect y="500" width="740" height="160" fill="#5e8fa8"/><path d="M0 520 Q180 505 370 520 T740 520" stroke="#cfe6ef" stroke-width="4" fill="none" opacity=".7"/>`
        + `<path d="M120 500 L120 420" stroke="#3b2a1f" stroke-width="10"/><circle cx="120" cy="400" r="46" fill="${BASIL}"/><circle cx="96" cy="420" r="30" fill="#356b42"/>`, '#ffd59a');
      const tip = (html, x, y, w, h, props = {}) => card(`<span style="color:${TOM};font-weight:800">Consejo · </span>${html}`, x, y, w, h, '#fff8ea', { fontSize: 22, color: INK, borderColor: '#f0d9a8', radius: 14, pad: [16, 22, 16, 22], vAlign: 'middle', lineHeight: 1.35, ...props });
      const row = (n, html, x, y, w) => stepRow(n, html, x, y, w, TOM, INK, { size: 22, h: 62 });

      return numbered(build({ name: 'Mi primera presentación', palette: 'paper', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK, size: 32 } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', back: [strip(0), strip(676)], extra: [
          RR(70, 96, 720, 560, CARD, 18, { rotation: -1.5, stroke: LINE, strokeWidth: 2, shadow: { x: 0, y: 10, blur: 24, color: '#5a3b1a22' } }),
          kicker('RECETA RÁPIDA · NIVEL: MUY FÁCIL', 120, 140, 620, TOM),
          text('Tu primera<br>presentación', 116, 178, 640, 180, { fontFamily: H, fontSize: 74, color: INK, fontWeight: 800, lineHeight: 1.05 }),
          text('en 5 minutos, sin experiencia previa', 120, 372, 620, 50, { fontSize: 32, color: TOM, fontStyle: 'italic' }),
          R(120, 440, 620, 2, LINE),
          ...[['clock', '5 minutos'], ['user', 'Una persona'], ['sparkles', 'Muy fácil']].flatMap(([ic, l], i) => [icon(ic, 120 + i * 205, 470, 34, BASIL), text(l, 162 + i * 205, 466, 170, 42, { fontSize: 22, color: INK, vAlign: 'middle' })]),
          text('Ingredientes: una idea, un título y una foto.', 120, 540, 620, 44, { fontSize: 22, color: MUTED }),
          E(860, 150, 330, 330, CARD, { shadow: { x: 0, y: 10, blur: 24, color: '#5a3b1a22' } }),
          timer(300, 885, 175, 280, { color: TOM, sound: true }),
          text('El reloj ya corre: ¡a por ello!', 850, 500, 350, 44, { fontSize: 24, color: INK, textAlign: 'center', fontWeight: 700 })],
          notes: 'La cuenta atrás de 5 minutos (Insertar ▸ Cuenta atrás) empieza sola al llegar a esta diapositiva. Propón al público que siga la receta a la vez que tú: al acabar el reloj, todos tendrán su primera presentación.' },

        { layout: 'titleOnly', title: 'La receta, en cinco pasos', bg: CREAM, back: [strip(676)], extra: [
          ...[['Elige un punto de partida', 'un ejemplo, un tema vacío o de cero', 'Archivo ▸ Plantillas'], ['Escoge el diseño', 'portada, título y contenido, dos columnas…', 'Inicio ▸ Diseño'],
            ['Escribe tus ideas', 'pocas palabras por diapositiva', 'Inicio ▸ Texto'], ['Añade una imagen', 'una foto dice más que tres viñetas', 'Inicio ▸ Imagen'],
            ['Preséntala', 'a pantalla completa, y a contar', 'Ver ▸ Presentar']].flatMap(([t, d, w], i) => { const y = 192 + i * 94;
            return together([RR(90, y - 12, 1100, 80, i % 2 ? CARD : '#f6ecd8', 14), ...row(i + 1, `<b>${t}</b><br><span style="color:${MUTED}">${d}</span>`, 112, y, 720),
              where(w, 880, y + 7, 290, '#ffffff', INK, { borderColor: LINE })], 'fade-left', i ? 'afterPrev' : 'click', { duration: 450 }); })],
        notes: 'Un clic y los cinco pasos entran uno detrás de otro (Comienzo: Después de la anterior). A la derecha, dónde está cada cosa: siempre «Pestaña ▸ Botón».' },

        { layout: 'blank', bg: CREAM, back: [strip(676)], extra: [
          ...header(1, 'Elige por dónde empezar'),
          ...[['Abre <b>Archivo ▸ Plantillas</b>.'], ['En «Nueva presentación», mira las <b>Presentaciones de ejemplo</b>.'], ['Escribe en el buscador: «clase», «viaje», «informe»…'], ['Haz clic en la que te guste: se abre para que la cambies.']]
            .flatMap(([t], i) => together(row(i + 1, t, 90, 196 + i * 78, 500), 'fade-up', i ? 'afterPrev' : 'click')),
          tip('¿Prefieres un lienzo limpio? Elige <b>Empezar de cero</b> o uno de los <b>Temas vacíos</b>.', 90, 520, 500, 120),
          withAnims({ ...base(630, 170, 590, 400), type: 'image', src: gallery, alt: 'La ventana Nueva presentación, con las presentaciones de ejemplo', fit: 'cover', device: 'laptop' }, A('fade-in', { start: 'afterPrev', duration: 700 }))],
        notes: 'La ventana «Nueva presentación» tiene tres caminos: empezar de cero, crear con IA o abrir un archivo; debajo, las presentaciones de ejemplo y los temas vacíos. La captura del portátil es un dibujo de ejemplo de esa ventana.' },

        { layout: 'twoContent', title: 'Paso 2 · Escoge el diseño', bg: CREAM, back: [strip(676)],
          body: ul('<b>Inicio ▸ Nueva</b> (Ctrl + M) añade otra diapositiva', '<b>Inicio ▸ Diseño</b> cambia el de la diapositiva que tienes delante', 'Lo que ya has escrito se conserva'),
          body2: ul('<b>Portada</b>: título grande', '<b>Título y contenido</b>: la más usada', '<b>Dos contenidos</b>: como esta', '<b>Encabezado de sección</b>: cambio de tema', '<b>En blanco</b>: lienzo libre'),
          extra: [kicker('PASO 2 DE 5', 100, 24, 400, TOM), ...[0, 1, 2, 3, 4].map(i => E(1010 + i * 36, 30, 18, 18, i < 2 ? TOM : LINE))],
          notes: 'Esta diapositiva usa el diseño «Dos contenidos»: dos recuadros de texto, uno a cada lado. Prueba a cambiarla a «Título y contenido» desde Inicio ▸ Diseño: el texto se queda.' },

        { layout: 'titleContent', title: 'Paso 3 · Escribe tus ideas', bg: CREAM, back: [strip(676)],
          body: ul('Haz clic donde pone «Haz clic para añadir texto» y escribe', ['Intro: un punto nuevo', 'Inicio ▸ Aumentar sangría: un nivel más adentro'],
            'Escribe «- » al empezar una línea y tendrás una lista con viñetas', 'Escribe «/» al empezar una línea para insertar una imagen, una tabla o una ecuación', 'Las faltas salen subrayadas: clic derecho para ver sugerencias, o <b>Ver ▸ Ortografía</b> (F7) para revisarlas todas'),
          extra: [kicker('PASO 3 DE 5', 100, 24, 400, TOM), ...[0, 1, 2, 3, 4].map(i => E(1010 + i * 36, 30, 18, 18, i < 3 ? TOM : LINE))],
          notes: 'El texto de esta diapositiva tiene dos niveles de viñeta, como los que vas a escribir. La barra «/» al empezar una línea abre un menú para insertar cosas sin ir a la cinta. El idioma de corrección se cambia en la barra inferior. Para →, €, ✓ y otros símbolos, el botón «Símbolos y emojis» de la pestaña Inicio: búscalos o dibújalos. Y recuerda: pocas palabras por diapositiva.' },

        { layout: 'blank', bg: CREAM, back: [strip(676)], extra: [
          ...header(4, 'Añade una imagen'),
          R(100, 186, 430, 460, '#ffffff', { rotation: -4, shadow: { x: 0, y: 12, blur: 22, color: '#5a3b1a33' } }),
          withAnims(img(photo, 128, 212, 374, 334, 'Paisaje dibujado: montañas al atardecer junto a un lago', { rotation: -4, fit: 'cover' }), A('drop', { start: 'afterPrev', duration: 900, sound: 'pop' })),
          text('Mi primera foto', 150, 566, 340, 50, { fontFamily: H, fontSize: 28, color: MUTED, textAlign: 'center', rotation: -4 }),
          ...[['<b>Inicio ▸ Imagen</b> y elige una foto de tu equipo.'], ['¿Sin fotos? <b>Insertar ▸ Imágenes en línea</b>: con licencia libre.'],
            ['Tira de una esquina para el tamaño; <b>doble clic</b> para recortarla.'], ['Suelta otra imagen encima para cambiarla: se queda su tamaño.']]
            .flatMap(([t], i) => together(row(i + 1, t, 600, 190 + i * 80, 590), 'fade-up', 'click')),
          tip('Describe la foto para quien no la ve: <b>IA ▸ Texto alternativo</b> lo escribe por ti.', 600, 520, 590, 110)],
        notes: 'La foto cae sola al llegar (Animaciones ▸ Más efectos ▸ Caer, con el sonido «Pop»). Cada clic muestra un paso. La foto es un dibujo hecho para la plantilla.' },

        { layout: 'blank', bg: INK, transition: 'zoom', extra: [
          ...header(5, 'Preséntala', CREAM, '#c9bba6'),
          ...[['F5', 'Presentar desde el principio'], ['Mayús + F5', 'Presentar desde esta diapositiva'], ['→ · Espacio', 'Siguiente paso o diapositiva'], ['←', 'Volver atrás'], ['B', 'Pantalla en negro: que te miren a ti']]
            .flatMap(([k, l], i) => together([key(k, 90, 196 + i * 82, 170, { fontSize: k.length > 4 ? 19 : 24 }), text(l, 284, 196 + i * 82, 500, 52, { fontSize: 25, color: CREAM, vAlign: 'middle' })], 'fade-right', i ? 'afterPrev' : 'click', { duration: 400 })),
          E(830, 180, 360, 360, TOM, { opacity: 25 }),
          withAnims(E(850, 200, 320, 320, TOM, { html: '<span style="margin-left:24px">▶</span>', fontSize: 150, color: '#ffffff', shadow: { x: 0, y: 14, blur: 30, color: '#00000066' } }), A('pulse', { start: 'afterPrev', duration: 900 })),
          text('También con el botón ▶ de la barra de arriba, o <b>Ver ▸ Presentar</b>.', 800, 560, 420, 80, { fontSize: 22, color: '#d8ccb8', textAlign: 'center' })],
        notes: 'Para salir de la presentación, Esc. Al presentar, la tecla S abre la vista del moderador con tus notas: lo verás en la lección «Presentar como un profesional».' },

        { layout: 'blank', bg: CREAM, transition: 'fade', back: [strip(0), strip(676)], extra: [
          RR(90, 96, 1100, 540, CARD, 22, { stroke: LINE, strokeWidth: 2, shadow: { x: 0, y: 10, blur: 24, color: '#5a3b1a22' } }),
          text('¡Hecho!', 140, 124, 600, 110, { fontFamily: H, fontSize: 84, color: TOM, fontWeight: 800 }),
          text('Ya tienes tu primera presentación.', 144, 248, 600, 50, { fontSize: 30, color: INK }),
          ...chain(['Punto de partida', 'Diseño de cada diapositiva', 'Texto con pocas palabras', 'Una imagen', 'Presentar con F5'].map((t, i) =>
            text(`<span style="color:${BASIL};font-weight:800">✓</span>  ${t}`, 144, 312 + i * 58, 560, 50, { fontSize: 26, color: INK, vAlign: 'middle' })), 'zoom-in', { duration: 350 }, 'afterPrev'),
          text('<b>Siguientes recetas</b>', 790, 150, 360, 44, { fontSize: 26, color: INK }),
          ...['Animaciones', 'Transformar', 'Votaciones en directo', 'Diseño y Text Art', 'Exportar a PDF'].map((t, i) =>
            text(t, 790, 210 + i * 70, 360, 52, { fontSize: 24, color: i === 2 ? INK : '#ffffff', bg: [TOM, BASIL, MUST, '#4682b4', '#8b3a62'][i], radius: 26, pad: [0, 22, 0, 22], vAlign: 'middle' }))],
        notes: 'Repasa los cinco pasos: entran solos, uno detrás de otro. Las «siguientes recetas» son las otras lecciones de esta serie, en la galería de presentaciones de ejemplo.' },
      ]));
    } },

  // ============================================================================
  // 2 · Importing a PowerPoint, as a house move: boxes that drop in, a table of
  //     what travels, the master as a family tree, animations that still play,
  //     boxes that unpack themselves with Transform, notes and the way back.
  learn_revela_pptx: { name: 'Importar un PowerPoint y seguir', cat: 'showcase',
    summary: 'Una mudanza: cómo importar un .pptx, qué se conserva (patrón, animaciones, Transformar, notas) y cómo volver a exportarlo',
    make: () => {
      const WALL = '#f3eee6', FLOOR = '#d8c19c', NAVY = '#1d3557', ORANGE = '#e97132', GREEN = '#2e7d4f', INK = '#22252b', MUTED = '#5f646e', LINE = '#e0d6c4';
      const HG = pairStacks('websafe').heading;
      const boxSVG = (c1, c2) => svgURL(300, 240, `<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
        + `<rect x="6" y="40" width="288" height="194" rx="6" fill="url(#k)"/><path d="M6 40 L40 6 H260 L294 40Z" fill="${c2}"/><rect x="132" y="6" width="36" height="228" fill="#ead9b2" opacity=".9"/>`
        + `<path d="M6 40 H294" stroke="#00000022" stroke-width="3"/><ellipse cx="60" cy="90" rx="22" ry="8" fill="#00000030"/><ellipse cx="240" cy="90" rx="22" ry="8" fill="#00000030"/>`);
      const BOX = boxSVG('#d1a468', '#a77a43');
      const IDS = ['PATRÓN', 'ANIMACIONES', 'TRANSFORMAR', 'NOTAS'].map(l => [l, uid(), uid()]);
      // A box and its sticker (each with the same ids on every slide: Transform moves them).
      const box = (i, x, y, w, extra = {}) => { const [l, a, b] = IDS[i], h = Math.round(w * 0.8);
        return [same(a, img(BOX, x, y, w, h, 'Caja de mudanza', { ...extra })),
          same(b, text(l, x + w * 0.1, y + h * 0.48, w * 0.8, Math.max(30, Math.round(h * 0.2)), { fontSize: Math.max(12, Math.round(w * 0.06)), textAlign: 'center', vAlign: 'middle', bg: '#ffffff', color: NAVY, radius: 6, fontWeight: 700, pad: [0, 4, 0, 4] }))]; };
      const tipCard = (html, x, y, w, h, c) => card(html, x, y, w, h, '#ffffff', { fontSize: 22, color: INK, borderColor: LINE, radius: 14, pad: [16, 22, 16, 22], vAlign: 'middle', lineHeight: 1.35, shadow: { x: 0, y: 4, blur: 0, color: c } });

      return numbered(build({ name: 'Mudanza a Revela', palette: 'office', fonts: 'websafe', title: { color: NAVY, size: 46 }, body: { color: INK, size: 28 } }, [
        { layout: 'blank', bg: WALL, transition: 'fade', back: [R(0, 590, 1280, 130, FLOOR), R(0, 586, 1280, 6, '#bfa57c')], extra: [
          kicker('MUDANZA SIN SUSTOS', 90, 110, 500, ORANGE),
          text('Tu PowerPoint se muda a Revela', 86, 146, 620, 170, { fontFamily: HG, fontSize: 60, color: NAVY, lineHeight: 1.1 }),
          text('Qué viaja en la mudanza, qué se adapta y cómo seguir trabajando con él', 90, 330, 580, 90, { fontSize: 24, color: MUTED, lineHeight: 1.4 }),
          text('<b>presentación.pptx</b>', 90, 450, 280, 50, { fontSize: 20, bg: '#ffffff', color: ORANGE, radius: 25, pad: [0, 18, 0, 18], vAlign: 'middle', borderColor: '#f2c2a4' }),
          icon('arrow', 386, 457, 36, MUTED),
          text('<b>Revela</b>', 440, 450, 160, 50, { fontSize: 20, bg: NAVY, color: '#ffffff', radius: 25, pad: [0, 18, 0, 18], vAlign: 'middle', textAlign: 'center' }),
          ...[[0, 720, 420, 240], [3, 970, 420, 230], [1, 830, 228, 240]].flatMap(([i, x, y, w], k) =>
            box(i, x, y, w).map((b, j) => withAnims(b, A('drop', { start: k || j ? (j ? 'withPrev' : 'afterPrev') : 'afterPrev', duration: 700, ...(j || k ? {} : { sound: 'pop' }) }))))],
          notes: 'Las cajas caen solas al llegar, una detrás de otra (Animaciones ▸ Más efectos ▸ Caer). Idea de la lección: abrir tu PowerPoint en Revela sin perder el trabajo hecho.' },

        { layout: 'titleOnly', title: 'Cómo se importa', bg: WALL, extra: [
          dg('process', 'Archivo ▸ Importar PPTX / ODP\n  En la pestaña Archivo\nElige el archivo\n  .pptx de PowerPoint u .odp\nRevela lo convierte\n  Sin salir del navegador\nRepasa y guarda\n  Archivo ▸ Guardar',
            90, 180, 1100, 250, { oneByOne: true, colors: 'accent', fontScale: 1.1 }),
          tipCard('<b>¿Solo unas diapositivas?</b><br><b>Archivo ▸ Reutilizar diapositivas</b> las añade a la presentación que tienes abierta.', 90, 470, 530, 150, ORANGE),
          tipCard('<b>¿Está en Google Slides?</b><br><b>Archivo ▸ Desde Google Slides</b> la trae de tu Drive, sin descargarla antes.', 660, 470, 530, 150, NAVY)],
        notes: 'El diagrama aparece paso a paso al presentar (Diagrama ▸ Uno a uno al presentar). Un archivo .odp de LibreOffice se importa igual, con el mismo botón.' },

        { layout: 'titleOnly', title: 'Qué viaja en las cajas', bg: WALL, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 430, fontSize: 22, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE, banded: true, band: '#efe6d6', color: INK, colW: [3.2, 5.4, 1.4],
            rows: [['En tu PowerPoint', 'En Revela', '¿Llega?'],
              ['Patrón y diseños', 'Diseño ▸ Patrón de diapositivas, con sus diseños', '✓ Sí'],
              ['Colores y fuentes del tema', 'Los mismos, en Diseño ▸ Colores y Diseño ▸ Fuentes', '✓ Sí'],
              ['Animaciones y trayectorias', 'Animaciones ▸ Panel de animación', '✓ Sí'],
              ['Transición Transformar', 'Transiciones ▸ Transformar', '✓ Sí'],
              ['Notas y comentarios', 'Ver ▸ Notas · Ver ▸ Comentarios', '✓ Sí'],
              ['Tablas, gráficos, fotos, vídeos', 'Objetos de Revela que puedes editar', '✓ Sí'],
              ['Sombras y SmartArt', 'Se aproximan o se omiten', '≈ Revisa']] }),
          text('Las transiciones y las diapositivas ocultas también se conservan.', 90, 624, 1100, 40, { fontSize: 21, color: MUTED })],
        notes: 'Lo que no tiene equivalente exacto se aproxima o se omite: revisa sobre todo los diagramas SmartArt, que conviene rehacer con Insertar ▸ Diagrama.' },

        { layout: 'titleOnly', title: 'El patrón se muda entero', bg: WALL, extra: [
          dg('hierarchy', 'Patrón de diapositivas\n  Portada\n  Título y contenido\n  Dos contenidos\n  En blanco', 70, 180, 640, 350, { colors: 'accent', fontScale: 1.2 }),
          text('El logo, el pie y los estilos de tu plantilla quedan en el patrón; cada diapositiva conserva su diseño.', 90, 548, 600, 90, { fontSize: 22, color: MUTED, lineHeight: 1.35 }),
          ...[['Abre <b>Diseño ▸ Patrón de diapositivas</b>.'], ['Cambia el logo, el fondo o un estilo: cambia en todas.'], ['Añade un diseño con <b>Insertar diseño</b>.'], ['Vuelve con <b>Cerrar vista Patrón</b>.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 760, 200 + i * 98, 430, ORANGE, INK, { size: 22, h: 70 }), 'fade-left', i ? 'afterPrev' : 'click'))],
        notes: 'El patrón de PowerPoint se convierte en el de Revela, con sus diseños. Si la plantilla usa varios patrones, llegan todos los que usan sus diapositivas.' },

        { layout: 'titleOnly', title: 'Las animaciones siguen ahí', bg: WALL, extra: [
          RR(90, 180, 600, 440, '#ffffff', 16, { stroke: LINE, strokeWidth: 2, shadow: { x: 0, y: 8, blur: 20, color: '#00000018' } }),
          at(text('Mudanzas por meses', 120, 200, 540, 54, { fontFamily: HG, fontSize: 32, color: NAVY }), 'fly-in', { duration: 700 }),
          at(chartBlock({ x: 120, y: 270, w: 400, h: 320, chartType: 'bar', color: ORANGE, dataLabels: true, labelColor: INK,
            data: [{ label: 'Jun', value: 14 }, { label: 'Jul', value: 22 }, { label: 'Ago', value: 31 }, { label: 'Sep', value: 18 }] }), 'wipe', { start: 'afterPrev', duration: 800 }),
          at(shape('seal', 520, 280, 160, 160, GREEN, { html: '<b>+40&nbsp;%</b>', fontSize: 22, color: '#ffffff' }), 'zoom-in', { start: 'afterPrev' }),
          withAnims(icon('truck', 540, 480, 70, NAVY), A('fade-in'), path([[-60, 0], [-180, 0]], { start: 'afterPrev', duration: 1200 })),
          ...[['1', 'Título', 'Desplazar hacia dentro', 'Al hacer clic'], ['2', 'Gráfico', 'Barrido', 'Después de la anterior'], ['3', 'Sello', 'Zoom', 'Después de la anterior'],
            ['4', 'Camión', 'Aparecer y trayectoria', 'Al hacer clic']].map(([n, o, e, s], i) =>
            text(`<b style="color:${ORANGE}">${n}</b>  <b>${o}</b> · ${e}<br><span style="color:${MUTED}">${s}</span>`, 730, 186 + i * 86, 460, 74, { fontSize: 21, color: INK, lineHeight: 1.35 })),
          where('Animaciones ▸ Panel de animación', 730, 548, 460, '#ffffff', NAVY, { borderColor: LINE, fontSize: 20 })],
        notes: 'Haz clic para ver las animaciones tal como llegarían de PowerPoint: entrada, barrido encadenado, un sello y una trayectoria. En el panel de animación ves el orden, el inicio, la duración y el retraso de cada una. Datos del gráfico inventados.' },

        { layout: 'blank', bg: WALL, back: [R(0, 590, 1280, 130, FLOOR), R(0, 586, 1280, 6, '#bfa57c')], extra: [
          kicker('TRANSFORMAR · ANTES', 90, 70, 500, ORANGE),
          text('Todo sigue en cajas…', 86, 104, 620, 70, { fontFamily: HG, fontSize: 46, color: NAVY }),
          text('Una presentación con la transición Transformar llega con ella. Pasa a la siguiente diapositiva y mira las cajas.', 90, 190, 560, 110, { fontSize: 24, color: MUTED, lineHeight: 1.4 }),
          ...box(0, 760, 420, 200), ...box(1, 970, 420, 200), ...box(2, 760, 260, 200), ...box(3, 970, 260, 200)],
        notes: 'Esta diapositiva y la siguiente tienen las mismas cajas (el mismo objeto). La siguiente lleva Transiciones ▸ Transformar: al pasar, cada caja viaja a su sitio.' },

        { layout: 'blank', bg: WALL, autoAnimate: true, back: [R(0, 590, 1280, 130, FLOOR), R(0, 586, 1280, 6, '#bfa57c')], extra: [
          kicker('TRANSFORMAR · DESPUÉS', 90, 70, 500, ORANGE),
          text('…y cada una va a su sitio', 86, 104, 760, 70, { fontFamily: HG, fontSize: 46, color: NAVY }),
          R(80, 340, 1120, 14, '#8a6a43'),
          ...box(0, 105, 204, 170), ...box(1, 395, 204, 170), ...box(2, 685, 204, 170), ...box(3, 975, 204, 170),
          ...['El patrón, con sus diseños', 'Entradas, énfasis y salidas', 'Por objetos, palabras o caracteres', 'Del orador, para la vista del moderador'].map((t, i) =>
            text(t, 90 + i * 290, 372, 260, 70, { fontSize: 20, color: INK, textAlign: 'center', lineHeight: 1.3 })),
          where('Transiciones ▸ Transformar', 90, 480, 380, '#ffffff', NAVY, { borderColor: LINE })],
        notes: 'Transformar en acción: las cajas cambian de sitio y de tamaño a la vez. En PowerPoint se llama igual, Transformar, y Revela respeta si era por objetos, por palabras o por caracteres.' },

        { layout: 'titleOnly', title: 'Tus notas y el camino de vuelta', bg: WALL, extra: [
          RR(90, 180, 560, 420, '#fffdf8', 14, { stroke: LINE, strokeWidth: 2 }),
          text('<b>Notas</b>', 116, 196, 300, 40, { fontSize: 22, color: NAVY }),
          R(116, 240, 508, 2, LINE),
          text('Saluda y cuenta en una frase por qué cambiamos de herramienta. Pregunta quién ha usado ya Revela. Cifras del gráfico: datos de ejemplo del curso pasado.',
            116, 256, 508, 200, { fontSize: 22, color: INK, lineHeight: 1.5, fontStyle: 'italic' }),
          text('Las notas del orador llegan intactas: ábrelas con <b>Ver ▸ Notas</b> y, al presentar, pulsa <b>S</b> para la vista del moderador.', 116, 476, 508, 110, { fontSize: 20, color: MUTED, lineHeight: 1.4 }),
          dg('cycle', 'Importar PPTX / ODP\nEditar en Revela\nExportar PowerPoint', 700, 170, 490, 330, { colors: 'colorful', fontScale: 1 }),
          text('<b>Archivo ▸ Exportar PowerPoint</b> la devuelve a .pptx con notas, animaciones y Transformar; el 3D y las ecuaciones van como imagen.', 700, 510, 490, 110, { fontSize: 20, color: INK, lineHeight: 1.4 })],
        notes: 'El recuadro de la izquierda imita el panel de notas. La ida y vuelta funciona: puedes empezar en PowerPoint, seguir en Revela y devolverlo a quien lo necesite en .pptx.' },
      ]));
    } },

  // ============================================================================
  // 3 · Animations, as a theatre: the curtain opens (paths with applause), the
  //     four kinds of animation each doing what it says, an actor that walks on
  //     stage, spotlights that switch on by click, with the previous and after
  //     it, a dancing route, the animation pane and «Más efectos».
  learn_revela_anim: { name: 'Animaciones paso a paso', cat: 'showcase',
    summary: 'Un teatro: entrada, énfasis, salida y trayectorias, Comienzo con la anterior o después, panel de animación, Más efectos y sonidos',
    make: () => {
      const BG = '#0d0a0c', VEL = '#8a1224', VEL2 = '#3d0710', GOLD = '#e3b85c', CREAM = '#f6ead2', DIM = '#bba98f', WOOD = '#5a3520', WOOD2 = '#2a170d', SPOT = '#fff3c4';
      const HP = pairStacks('classic').heading;
      // (Each fold its own gradient: a pattern of the 83 px fold, repeated.)
      const fold = svgURL(660, 720, `<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${VEL2}"/><stop offset=".45" stop-color="${VEL}"/><stop offset=".6" stop-color="#a51c30"/><stop offset="1" stop-color="${VEL2}"/></linearGradient>`
        + `<pattern id="p" width="82.5" height="720" patternUnits="userSpaceOnUse"><rect width="82.5" height="720" fill="url(#f)"/></pattern></defs><rect width="660" height="720" fill="url(#p)"/>`
        + `<rect y="684" width="660" height="36" fill="${GOLD}" opacity=".9"/><rect y="690" width="660" height="4" fill="${VEL2}" opacity=".5"/>`);
      const valance = svgURL(1280, 120, `<rect width="1280" height="70" fill="${VEL2}"/>` + Array.from({ length: 16 }, (_, i) => `<path d="M${i * 80} 66 Q${i * 80 + 40} 118 ${i * 80 + 80} 66 Z" fill="${VEL}"/>`).join('')
        + `<rect y="62" width="1280" height="6" fill="${GOLD}"/>` + Array.from({ length: 64 }, (_, i) => `<rect x="${i * 20 + 8}" y="68" width="4" height="${10 + (i % 2) * 4}" fill="${GOLD}" opacity=".8"/>`).join(''));
      const floor = [shape('trapezoid', -120, 560, 1520, 160, WOOD, { fill2: WOOD2, gradAngle: 90, flipV: true }), R(0, 556, 1280, 6, '#7a4a2c')];
      const curtains = (props = {}) => [img(fold, 0, 0, 660, 720, 'Telón rojo (izquierda)', { fit: 'fill', ...props.l }), img(fold, 620, 0, 660, 720, 'Telón rojo (derecha)', { fit: 'fill', ...props.r })];
      const drape = svgURL(210, 720, `<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${VEL2}"/><stop offset=".45" stop-color="${VEL}"/><stop offset=".6" stop-color="#a51c30"/><stop offset="1" stop-color="${VEL2}"/></linearGradient>`
        + `<pattern id="p" width="35" height="720" patternUnits="userSpaceOnUse"><rect width="35" height="720" fill="url(#f)"/></pattern></defs><rect width="210" height="720" fill="url(#p)"/>`
        + `<rect y="684" width="210" height="36" fill="${GOLD}" opacity=".9"/>`);
      const drapes = () => [img(drape, 0, 0, 190, 720, '', { fit: 'cover', decorative: true }), img(drape, 1090, 0, 190, 720, '', { fit: 'cover', decorative: true })];
      const head = (k, t) => [kicker(k, 90, 120, 700, GOLD), text(t, 86, 152, 1000, 70, { fontFamily: HP, fontSize: 48, color: CREAM })];
      const top = img(valance, 0, 0, 1280, 120, '', { fit: 'fill', decorative: true });

      // The animation pane, drawn (as Animaciones ▸ Panel de animación shows it).
      const pane = svgURL(560, 420, `<rect width="560" height="420" rx="14" fill="#f7f4ee"/><rect width="560" height="56" rx="14" fill="#e9e2d4"/><rect y="40" width="560" height="16" fill="#e9e2d4"/>`
        + T(22, 37, 22, '#2a2420', 'Panel de animación', ' font-weight="700"')
        + [['1', 'Máscara', 'Subir', 'Al hacer clic', 0, 90, '#2e7d32'], ['', 'Máscara', 'Agrandar', 'Después de la anterior', 90, 110, '#f9a825'], ['', 'Máscara', 'Encoger', 'Después de la anterior', 200, 90, '#f9a825'], ['2', 'Máscara', 'Desaparecer', 'Al hacer clic', 0, 120, '#c62828']]
          .map(([n, o, e, s, x0, w, c], i) => { const y = 80 + i * 82;
            return `<rect x="14" y="${y}" width="532" height="70" rx="10" fill="#ffffff" stroke="#e1d9c8"/>` + T(30, y + 42, 22, '#8a1224', n, ' font-weight="700"')
              + `<rect x="58" y="${y + 18}" width="14" height="34" rx="4" fill="${c}"/>` + T(84, y + 32, 19, '#2a2420', `${o} · ${e}`, ' font-weight="600"') + T(84, y + 56, 16, '#7a6e60', s)
              + `<rect x="${330 + x0 * 0.6}" y="${y + 26}" width="${w * 0.9}" height="18" rx="9" fill="${c}" opacity=".8"/>`; }).join(''));
      // A stage light: the lamp, its cone (it switches on with its animation) and the pool of light on the floor.
      const lamp = (x, opts) => [RR(x + 70, 236, 80, 50, '#1c1c1c', 12, { stroke: '#555', strokeWidth: 2 }), E(x + 90, 272, 40, 24, '#3a3a3a'),
        withAnims(shape('triangle', x, 282, 220, 270, SPOT, { fill2: BG, gradAngle: 90, opacity: 45 }), A('fade-in', { duration: 700, ...opts })),
        withAnims(E(x - 10, 520, 240, 70, SPOT, { opacity: 35 }), A('fade-in', { duration: 700, start: 'withPrev' }))];
      const route = [[160, -150], [360, -40], [560, -170], [760, -60], [900, -120]];

      return numbered(build({ name: 'Función de animaciones', palette: 'midnight', fonts: 'classic', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(340, 60, 600, '#6b4a1f', BG, 50), ...floor], extra: [
          kicker('LECCIÓN DE ESTRENO', 340, 190, 600, GOLD, { textAlign: 'center' }),
          withAnims(text('Animaciones', 190, 226, 900, 160, { fontFamily: HP, fontSize: 124, textAlign: 'center', wordart: 'gold' }), A('zoom-in', { start: 'afterPrev', delay: 300, duration: 1200, sound: 'applause' })),
          withAnims(text('Haz que cada objeto entre en escena a su tiempo', 230, 400, 820, 50, { fontSize: 32, color: CREAM, textAlign: 'center', fontStyle: 'italic' }), A('fade-up', { start: 'afterPrev', duration: 800 })),
          ...drapes(), top],
        notes: 'Al llegar, el título entra solo con un zoom y el sonido «Aplausos» (Comienzo: Después de la anterior, la primera animación arranca sin clic); después, el subtítulo. El telón se cerrará en la última diapositiva.' },

        { layout: 'blank', bg: BG, back: [glow(340, 200, 600, '#3a2410', BG, 40)], extra: [top, ...head('LOS CUATRO TIPOS', 'Cada animación tiene un papel'),
          ...[['Entrada', 'El objeto aparece en escena.', 'Animaciones ▸ Aparecer', '#2e7d32'], ['Énfasis', 'Ya está a la vista y llama la atención.', 'Animaciones ▸ Agrandar', '#f9a825'],
            ['Salida', 'El objeto se va de la escena.', 'Animaciones ▸ Desaparecer', '#c62828'], ['Trayectoria', 'Se mueve por un camino.', 'Animaciones ▸ Trayectoria', '#4f8fd6']].flatMap(([t, d, w, c], i) => { const x = 90 + i * 280;
            const star = shape('star', x + 85, 270, 90, 90, GOLD);
            const fx = [withAnims(star, A('zoom-in', { duration: 700 })), withAnims(star, A('grow', { size: 140 }), A('shrink', { size: 72, start: 'afterPrev' })),
              withAnims(star, A('fade-out', { duration: 700 })), withAnims(star, path([[60, -30], [0, -60], [-60, -30], [0, 0]], { duration: 1800 }))][i];
            return [RR(x, 240, 260, 380, '#1b1416', 16, { stroke: c, strokeWidth: 2 }), R(x, 240, 260, 10, c), fx,
              text(`<b>${t}</b>`, x + 20, 384, 220, 46, { fontFamily: HP, fontSize: 28, color: CREAM, textAlign: 'center' }),
              text(d, x + 20, 436, 220, 70, { fontSize: 20, color: DIM, textAlign: 'center', lineHeight: 1.3 }),
              text(w.replace(' ▸ ', ' ▸<br>'), x + 20, 530, 220, 64, { fontSize: 18, color: CREAM, textAlign: 'center', bg: '#2a2022', radius: 12, vAlign: 'middle' })]; })],
        notes: 'Cuatro clics, cuatro estrellas: la primera entra (Zoom), la segunda se agranda y vuelve a su tamaño, la tercera se va y la cuarta da una vuelta. Así se ve la diferencia entre entrada, énfasis, salida y trayectoria.' },

        { layout: 'blank', bg: BG, extra: [top, ...head('PASO A PASO', 'Tu primera animación'),
          ...[['Selecciona el objeto en la diapositiva.'], ['En <b>Animaciones</b>, elige un efecto: Aparecer, Subir, Zoom…'], ['En <b>Comienzo</b>, elige cuándo: <i>Al hacer clic</i>.'],
            ['Ajusta <b>Duración (s)</b> y <b>Retardo (s)</b>.'], ['Pulsa <b>Animaciones ▸ Reproducir</b> para verla.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 90, 250 + i * 80, 560, VEL, CREAM, { size: 23, h: 64 }), 'fade-right', i ? 'afterPrev' : 'click', { duration: 400 })),
          RR(700, 240, 500, 400, '#150f10', 18, { stroke: '#3a2a20', strokeWidth: 2 }),
          glow(760, 270, 380, '#6b4a1f', '#150f10', 55),
          shape('trapezoid', 700, 540, 500, 100, WOOD, { fill2: WOOD2, gradAngle: 90, flipV: true }),
          withAnims(m3d('kk-Mage', 960, 250, 230, 380, { walk: { clip: 'Walking_A', end: 'Cheer', endOnce: true, face: true, look: true } }),
            path([[-170, 0]], { start: 'afterPrev', duration: 2600 }))],
        notes: 'El mago entra solo en escena con una trayectoria y, al llegar, saluda (Modelo 3D ▸ Mientras se mueve: anda, y al llegar celebra). Los cinco pasos aparecen con un clic, uno detrás de otro.' },

        { layout: 'blank', bg: BG, back: [...floor], extra: [
          ...[{}, { start: 'withPrev' }, { start: 'afterPrev' }, { start: 'afterPrev', delay: 1000, sound: 'chime' }]
            .flatMap((a, i) => lamp(110 + i * 280, a)),
          top, ...head('COMIENZO', 'El orden de la función'),
          ...[['Al hacer clic', 'espera tu clic'], ['Con la anterior', 'a la vez que la 1'], ['Después de la anterior', 'sola, cuando acaba la 2'], ['Después de la anterior', 'y con Retardo 1 s']].map(([s, d], i) =>
            text(`<b>${i + 1} · ${s}</b><br><span style="color:${DIM}">${d}</span>`, 90 + i * 280, 600, 260, 70, { fontSize: 20, color: CREAM, textAlign: 'center', lineHeight: 1.3 })),
          R(110, 230, 1060, 6, '#2a2a2a')],
        notes: 'Un solo clic enciende los cuatro focos: el 1 espera el clic, el 2 va «Con la anterior», el 3 «Después de la anterior» y el 4 igual pero con un retardo de un segundo y el sonido «Campanilla».' },

        { layout: 'blank', bg: BG, back: [...floor], extra: [top, ...head('TRAYECTORIAS', 'Un camino para cada actor'),
          ink(curvePts([155, 525], route), '#e3b85c66', 4),
          withAnims(icon('person-standing', 110, 470, 90, GOLD), path(route, { duration: 3200 })),
          withAnims(icon('person-standing', 110, 380, 70, '#f6ead2'), path(route.map(([x, y]) => [x, y * 0.6]), { start: 'withPrev', delay: 300, duration: 3200 })),
          card('<b>Animaciones ▸ Trayectoria</b>: un camino que ajustas en el panel · <b>Animaciones ▸ Dibujar recorrido</b>: lo trazas con el ratón o el dedo.', 90, 596, 1100, 90, '#1b1416', { fontSize: 21, color: CREAM, lineHeight: 1.4, borderColor: '#3a2a20', vAlign: 'middle' })],
        notes: 'Un clic y los dos bailarines siguen el camino dorado. El segundo va «Con la anterior» y con un pequeño retardo: así parecen bailar juntos.' },

        { layout: 'blank', bg: BG, extra: [top, ...head('EL PANEL DE ANIMACIÓN', 'Todas las animaciones, en orden'),
          img(pane, 90, 250, 560, 420, 'El panel de animación con cuatro animaciones de la máscara'),
          withAnims(icon('smile', 760, 290, 110, GOLD), A('fade-up'), A('grow', { start: 'afterPrev', size: 130 }), A('shrink', { start: 'afterPrev', size: 77 }), A('fade-out')),
          text('Un objeto puede tener varias: esta máscara entra, se agranda, vuelve a su tamaño y se va.', 900, 280, 300, 140, { fontSize: 21, color: DIM, lineHeight: 1.4 }),
          text(ul('<b>Animaciones ▸ Panel de animación</b>: orden, inicio, duración y retraso', '<b>Añadir animación</b>: otra más al mismo objeto', '<b>Copiar animación</b>: clic y luego en otro objeto', '<b>Sonido</b>: Aplausos, Redoble, Campanilla…'),
            700, 440, 500, 230, { fontSize: 20, color: CREAM, lineHeight: 1.4 })],
        notes: 'El dibujo de la izquierda es lo que verías en el panel para la máscara: una entrada, dos énfasis encadenados y una salida. Dos clics: uno para la entrada y el énfasis, otro para la salida.' },

        { layout: 'blank', bg: BG, back: [glow(340, 160, 600, '#3a2410', BG, 40)], extra: [top, ...head('ANIMACIONES ▸ MÁS EFECTOS', 'Todo el repertorio'),
          ...[['wipe', 'Barrido'], ['wheel', 'Rueda'], ['boomerang', 'Bumerán'], ['drop', 'Caer'], ['swivel', 'Girar sobre sí'], ['whip', 'Látigo']].map(([fx, l], i) =>
            withAnims(RR(90 + (i % 3) * 375, 250 + Math.floor(i / 3) * 190, 350, 160, ['#8a1224', '#5c2a6b', '#1f5f74', '#7a5418', '#2f5f2f', '#6b2c1c'][i], 18, { html: `<b>${l}</b>`, fontSize: 34, color: CREAM, fontFamily: HP }),
              A(fx, { start: i ? 'afterPrev' : 'click', duration: 900, ...(i === 5 && { sound: 'drumroll' }) }))),
          text('Entradas, énfasis y salidas como en PowerPoint: pasa el ratón por un efecto para verlo antes de elegirlo.', 90, 640, 1100, 40, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Un clic y los seis efectos se presentan solos, cada uno con su nombre. El último suena con «Redoble». En el editor, al pasar el ratón por un efecto lo ves antes de elegirlo.' },

        { layout: 'blank', bg: BG, transition: 'fade', back: [...floor, glow(390, 120, 500, '#6b4a1f', BG, 45)], extra: [
          kicker('CONSEJOS DEL DIRECTOR', 250, 150, 600, GOLD),
          ...[['Menos es más', 'una o dos animaciones por diapositiva'], ['Que cuente algo', 'anima para explicar, no para adornar'], ['Mismo efecto', 'para las cosas que son iguales'], ['Encadena', 'con «Después de la anterior», sin clics']]
            .map(([t, d], i) => at(text(`<b style="color:${GOLD}">${t}</b><br>${d}`, 250 + (i % 2) * 400, 200 + Math.floor(i / 2) * 150, 380, 120, { fontSize: 25, color: CREAM, lineHeight: 1.35 }), 'fade-up', { start: i ? 'afterPrev' : 'click' })),
          ...drapes(), top],
        notes: 'Cuatro consejos que entran con un clic, uno detrás de otro. En la siguiente diapositiva baja el telón.' },

        { layout: 'blank', bg: BG, transition: 'fade', back: [...floor], extra: [
          ...curtains().map((c, i) => withAnims(c, A('fly-in', { dir: i ? 'right' : 'left', duration: 1800, start: i ? 'withPrev' : 'afterPrev', ...(i ? {} : { sound: 'applause' }) }))),
          top,
          withAnims(text('¡Bravo!', 240, 250, 800, 170, { fontFamily: HP, fontSize: 140, textAlign: 'center', wordart: 'gold' }), A('zoom-in', { start: 'afterPrev', duration: 900 })),
          withAnims(text('Ahora te toca a ti: anima tu primera diapositiva', 240, 430, 800, 50, { fontSize: 30, color: CREAM, textAlign: 'center', fontStyle: 'italic' }), A('fade-in', { start: 'afterPrev' }))],
        notes: 'El telón baja solo al llegar: cada mitad entra desde su lado («Desplazar hacia dentro», desde la izquierda y desde la derecha, a la vez) con aplausos, y encima aparece el saludo final.' },
      ]));
    } },

  // ============================================================================
  // 4 · Transform, as a metamorphosis: the same six circles are a caterpillar,
  //     travel, become a chrysalis and then a butterfly (by objects); then a
  //     sentence whose words change places and a word whose letters do.
  learn_revela_morph: { name: 'Transformar: la metamorfosis', cat: 'showcase',
    summary: 'De oruga a mariposa con Transformar: Duplicar animando, por objetos, por palabras y por caracteres, en diapositivas que se transforman',
    make: () => {
      const BG = '#f3f8ee', LEAF = '#2e7d32', LEAF2 = '#7cb342', DEEP = '#173a1d', SUN = '#f6c445', WING = '#f08a24', WING2 = '#c43e12', BROWN = '#6d4c2f', MUTED = '#526352', LINE = '#d6e5cc';
      const HE = pairStacks('editorial').heading;
      const SEG = Array.from({ length: 6 }, () => uid()), WORD = uid(), LET = uid(), TITLE = uid();
      // The six circles in each state: [x, y, w, h, colour, rotation].
      const draw = st => st.map(([x, y, w, h, c, r = 0], i) => same(SEG[i], E(x, y, w, h, c, { rotation: r, stroke: '#00000022', strokeWidth: i === 5 ? 0 : 2 })));
      const larva = (x, y, d, c1 = LEAF2, c2 = LEAF) => Array.from({ length: 6 }, (_, i) => { const k = i === 5 ? 1.25 : 1;
        return [x + i * d * 0.78, y + (i % 2 ? -d * 0.12 : 0) - (k - 1) * d * 0.5, d * k, d * k, i === 5 ? c2 : i % 2 ? c1 : '#8bc34a']; });
      const leaf = (x, y, w, h, r = 0) => shape('custom', x, y, w, h, LEAF, { path: 'M0 50 Q30 0 100 8 Q78 70 0 50 Z', fill2: LEAF2, gradAngle: 30, rotation: r });
      const title = (x, y, w, h, size) => same(TITLE, text('Transformar', x, y, w, h, { fontFamily: HE, fontSize: size, color: DEEP, fontWeight: 700 }));
      const explain = (html, x, y, w, h, props = {}) => text(html, x, y, w, h, { fontSize: 24, color: DEEP, lineHeight: 1.45, ...props });

      return build({ name: 'La metamorfosis de Transformar', palette: 'forest', fonts: 'editorial', title: { color: DEEP, size: 46 }, body: { color: DEEP } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(780, 60, 560, '#fff4c2', BG, 70), shape('wave', 0, 600, 1280, 120, LINE, { opacity: 70 })], extra: [
          kicker('LECCIÓN 4 · TRANSICIONES', 90, 170, 600, LEAF),
          title(84, 200, 720, 130, 76),
          text('La transición que convierte una diapositiva en la siguiente: los objetos viajan, crecen y cambian de color.', 90, 340, 560, 130, { fontSize: 28, color: MUTED, lineHeight: 1.4 }),
          where('Transiciones ▸ Transformar', 90, 500, 400, '#ffffff', DEEP, { borderColor: LINE }),
          leaf(700, 330, 520, 300, -6), ...draw(larva(760, 410, 70))],
        notes: 'Fíjate en la oruga: son seis círculos. En las próximas diapositivas son los mismos seis objetos, y Transformar los lleva de un estado a otro.' },

        { layout: 'blank', bg: BG, autoAnimate: true, back: [glow(-100, 200, 600, '#fff4c2', BG, 60)], extra: [
          title(90, 60, 520, 80, 52), kicker('1 · LO QUE HACE', 690, 76, 500, LEAF, { textAlign: 'right' }),
          ...draw(larva(110, 300, 120)),
          explain('Si un objeto está en dos diapositivas seguidas, al pasar de una a otra <b>viaja</b>: cambia de sitio, de tamaño, de color y de giro.', 760, 230, 430, 200),
          explain('La oruga ha cruzado la pantalla y ha crecido: no hay ninguna animación, solo dos diapositivas.', 760, 450, 430, 130, { color: MUTED, fontSize: 22 })],
        notes: 'Esta diapositiva lleva Transiciones ▸ Transformar. La oruga es la misma de la portada en otro sitio y más grande; el título también ha encogido y subido.' },

        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          title(90, 60, 520, 80, 52), kicker('2 · PASO A PASO', 690, 76, 500, LEAF, { textAlign: 'right' }),
          ...draw(larva(880, 560, 44)),
          ...[['Termina la diapositiva de partida.'], ['Pulsa <b>Transiciones ▸ Duplicar animando</b>: copia la diapositiva y le pone Transformar.'],
            ['En la copia, mueve, agranda, gira o cambia de color lo que quieras.'], ['Presenta: Revela anima el cambio de una a otra.']]
            .flatMap(([t], i) => stepRow(i + 1, t, 90, 190 + i * 92, 760, LEAF, DEEP, { size: 24, h: 76 })),
          card('<b>¿Cómo empareja los objetos?</b> Por ser el mismo objeto (al duplicar) o por tener el mismo contenido. Los que solo están en una diapositiva aparecen o se van con un fundido.', 90, 560, 740, 120, '#ffffff', { fontSize: 20, color: DEEP, lineHeight: 1.4, borderColor: LINE, radius: 14, pad: [14, 20, 14, 20] })],
        notes: 'Duplicar animando es el atajo: en un clic tienes la copia con Transformar puesta. La oruga se ha ido a la esquina, pequeña: sigue siendo el mismo objeto.' },

        { layout: 'blank', bg: '#eef3e6', autoAnimate: true, extra: [
          title(90, 60, 520, 80, 52), kicker('3 · POR OBJETOS', 690, 76, 500, LEAF, { textAlign: 'right' }),
          R(700, 170, 520, 16, BROWN, { radius: 8 }), leaf(1040, 120, 180, 90, 12), R(948, 186, 4, 40, BROWN),
          ...draw([[905, 222, 90, 90, '#8d7a46'], [895, 280, 110, 110, '#7d6b3c'], [900, 360, 100, 100, '#8d7a46'], [912, 430, 76, 76, '#7d6b3c'], [925, 488, 50, 60, '#6b5b33'], [920, 214, 60, 30, '#5d4f2c']]),
          explain('La oruga se ha hecho crisálida: los seis círculos se han juntado, han cambiado de tamaño y de color.', 90, 200, 560, 150),
          explain('Es Transformar <b>por objetos</b>, el que se usa casi siempre: cada objeto viaja entero de una diapositiva a la siguiente.', 90, 380, 560, 150),
          where('Transiciones ▸ Objetos', 90, 560, 340, '#ffffff', DEEP, { borderColor: LINE })],
        notes: 'En la cinta, junto a Transformar, se elige qué se transforma: Objetos, Palabras o Caracteres. Por objetos es la opción normal.' },

        { layout: 'blank', bg: '#fff8e8', autoAnimate: true, back: [glow(560, 40, 640, '#ffe08a', '#fff8e8', 70)], extra: [
          title(90, 60, 520, 80, 52), kicker('4 · ¡MARIPOSA!', 690, 76, 500, WING2, { textAlign: 'right' }),
          ...draw([[640, 170, 260, 200, WING, -28], [880, 170, 260, 200, WING, 28], [690, 360, 190, 150, WING2, 24], [880, 360, 190, 150, WING2, -24], [865, 210, 50, 290, DEEP], [865, 168, 50, 50, DEEP]]),
          explain('Los mismos seis círculos: cuatro son ahora alas y dos, el cuerpo y la cabeza.', 90, 220, 480, 150),
          explain('Cambiar el color, el giro y la forma de golpe, con una transición, es lo que hace Transformar mejor que ninguna animación.', 90, 400, 480, 180, { color: MUTED, fontSize: 22 })],
        notes: 'Momento estrella: deja unos segundos de silencio para que el público vea la transformación.' },

        { layout: 'blank', bg: BG, extra: [
          kicker('5 · POR PALABRAS', 90, 76, 600, LEAF),
          same(WORD, text('La oruga duerme dentro de su capullo', 90, 230, 1100, 200, { fontFamily: HE, fontSize: 64, color: DEEP, textAlign: 'center', lineHeight: 1.25 })),
          explain('Pasa a la siguiente: las palabras que se repiten cambian de sitio.', 90, 520, 1100, 50, { textAlign: 'center', color: MUTED })],
        notes: 'Esta diapositiva no lleva Transformar; la siguiente sí, «por palabras». El cuadro de texto es el mismo en las dos.' },

        { layout: 'blank', bg: BG, autoAnimate: true, morphBy: 'words', extra: [
          kicker('5 · POR PALABRAS', 90, 76, 600, LEAF),
          same(WORD, text('Dentro de su capullo la oruga duerme', 90, 230, 1100, 200, { fontFamily: HE, fontSize: 64, color: DEEP, textAlign: 'center', lineHeight: 1.25 })),
          where('Transiciones ▸ Palabras', 90, 520, 360, '#ffffff', DEEP, { borderColor: LINE }),
          explain('Útil para reordenar una frase, completar una lista o corregir un texto delante del público.', 480, 512, 710, 80, { fontSize: 22, color: MUTED })],
        notes: 'Transformar por palabras: cada palabra viaja a su nuevo sitio. Las que no estaban aparecen con un fundido.' },

        { layout: 'blank', bg: '#fff8e8', extra: [
          kicker('6 · POR CARACTERES', 90, 76, 600, WING2),
          same(LET, text('ALAS', 140, 180, 1000, 260, { fontFamily: HE, fontSize: 240, textAlign: 'center', wordart: 'gradient', wordartColor: WING, letterSpacing: 24 })),
          explain('Y ahora, letra a letra…', 90, 520, 1100, 50, { textAlign: 'center', color: MUTED })],
        notes: 'La palabra es Text Art con degradado naranja. En la siguiente diapositiva, con Transformar por caracteres, cada letra va a su sitio nuevo.' },

        { layout: 'blank', bg: '#fff8e8', autoAnimate: true, morphBy: 'chars', extra: [
          kicker('6 · POR CARACTERES', 90, 76, 600, WING2),
          same(LET, text('SALA', 140, 180, 1000, 260, { fontFamily: HE, fontSize: 240, textAlign: 'center', wordart: 'gradient', wordartColor: WING, letterSpacing: 24 })),
          where('Transiciones ▸ Caracteres', 90, 500, 380, '#ffffff', DEEP, { borderColor: '#f1d9b0' }),
          explain('<b>Consejo</b>: palabras cortas y con las mismas letras: el cambio se entiende mejor.', 500, 492, 690, 90, { fontSize: 22, color: MUTED }),
          text('ALAS → SALA: las mismas cuatro letras en otro orden.', 90, 610, 1100, 40, { fontSize: 20, color: BROWN, textAlign: 'center' })],
        notes: 'Transformar por caracteres: las letras que se repiten viajan; perfecto para anagramas, fórmulas que cambian o una palabra que se corrige.' },
      ]);
    } },

  // ============================================================================
  // 5 · Presenting like a pro, as a cockpit: a pre-flight checklist, the
  //     presenter view and the phone remote (drawn), pointer and ink keys with a
  //     drawn circle and a laser dot, a whiteboard slide that draws itself, a
  //     countdown and the table of keys. Notes on every slide.
  learn_revela_present: { name: 'Presentar como un profesional', cat: 'showcase',
    summary: 'Una cabina de vuelo: vista del moderador, notas, mando con el móvil, puntero láser y tinta, pizarra, cuenta atrás y atajos',
    make: () => {
      const NAVY = '#06172a', PANEL = '#0d2742', AMBER = '#ffb547', CYAN = '#4fd1ff', GREEN = '#5ee38b', TXT = '#e8f1fa', DIM = '#8fb0cc', RED = '#ff4d4d', LINE = '#1d4166';
      const HT = pairStacks('tech').heading;
      const head = (k, t, fg = TXT, w = 1000) => [kicker(k, 90, 56, 800, AMBER), text(t, 86, 88, w, 70, { fontFamily: HT, fontSize: 46, color: fg, fontWeight: 700 })];
      // The instrument on the cover: an artificial horizon with its scale.
      const gauge = svgURL(460, 460, `<defs><clipPath id="c"><circle cx="230" cy="230" r="170"/></clipPath></defs>`
        + `<circle cx="230" cy="230" r="222" fill="#0a2036" stroke="${LINE}" stroke-width="6"/>`
        + Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180, r1 = i % 3 ? 204 : 192;
          return `<line x1="${230 + 214 * Math.cos(a)}" y1="${230 + 214 * Math.sin(a)}" x2="${230 + r1 * Math.cos(a)}" y2="${230 + r1 * Math.sin(a)}" stroke="${i % 3 ? DIM : TXT}" stroke-width="${i % 3 ? 2 : 4}"/>`; }).join('')
        + `<g clip-path="url(#c)" transform="rotate(-8 230 230)"><rect x="0" y="0" width="460" height="240" fill="#1f6fae"/><rect x="0" y="240" width="460" height="240" fill="#7a4a24"/>`
        + `<line x1="0" y1="240" x2="460" y2="240" stroke="#ffffff" stroke-width="4"/>`
        + [-60, -30, 30, 60].map(d => `<line x1="${200}" y1="${240 + d}" x2="260" y2="${240 + d}" stroke="#ffffff" stroke-width="3" opacity=".8"/>`).join('') + `</g>`
        + `<path d="M120 236 H200 L230 262 L260 236 H340" stroke="${AMBER}" stroke-width="10" fill="none" stroke-linejoin="round"/><circle cx="230" cy="236" r="9" fill="${AMBER}"/>`);
      // The presenter view (S while presenting), drawn.
      const pv = svgURL(1200, 680, `<rect width="1200" height="680" fill="#11161f"/>`
        + `<rect x="24" y="24" width="1152" height="56" rx="10" fill="#1b2230"/>` + T(48, 61, 24, '#ffffff', 'Tiempo  00:07:42', ' font-weight="700"')
        + T(400, 61, 20, '#9aa6ba', 'Ritmo') + `<rect x="470" y="44" width="420" height="14" rx="7" fill="#2a3446"/><rect x="470" y="44" width="300" height="14" rx="7" fill="${GREEN}"/>` + T(1000, 61, 20, '#9aa6ba', 'Total 20:00')
        + `<rect x="24" y="104" width="720" height="405" rx="8" fill="${NAVY}"/>` + T(70, 200, 46, '#ffffff', 'Antes de despegar', ' font-weight="700"')
        + [0, 1, 2].map(i => `<rect x="70" y="${250 + i * 70}" width="34" height="34" rx="6" fill="none" stroke="${AMBER}" stroke-width="4"/><rect x="124" y="${258 + i * 70}" width="${380 - i * 60}" height="18" rx="9" fill="#2c4a6c"/>`).join('')
        + T(774, 128, 20, '#9aa6ba', 'Siguiente') + `<rect x="774" y="142" width="402" height="226" rx="8" fill="${NAVY}"/>` + `<circle cx="975" cy="255" r="70" fill="none" stroke="${CYAN}" stroke-width="8"/>`
        + T(774, 404, 20, '#9aa6ba', 'Notas') + `<rect x="774" y="418" width="402" height="238" rx="8" fill="#1b2230"/>`
        + ['Saluda y presenta', 'la lista: cinco', 'comprobaciones antes', 'de empezar.'].map((l, i) => T(796, 462 + i * 44, 30, '#ffffff', l)).join('')
        + `<rect x="24" y="532" width="720" height="124" rx="8" fill="#1b2230"/>` + [0, 1, 2, 3, 4, 5].map(i => `<rect x="${44 + i * 116}" y="552" width="100" height="56" rx="4" fill="${i === 1 ? AMBER : '#2a3446'}"/>`).join(''));
      // The phone remote, drawn.
      const remote = svgURL(360, 720, `<rect width="360" height="720" fill="#0e1520"/>`
        + `<circle cx="34" cy="44" r="8" fill="${GREEN}"/>` + T(52, 51, 19, '#ffffff', 'Mando conectado', ' font-weight="700"')
        + `<rect x="20" y="80" width="320" height="180" rx="10" fill="${NAVY}"/>` + T(44, 150, 26, '#ffffff', 'Vista del', ' font-weight="700"') + T(44, 184, 26, '#ffffff', 'moderador', ' font-weight="700"')
        + `<rect x="20" y="280" width="152" height="40" rx="20" fill="#24324a"/>` + T(70, 307, 17, '#ffffff', 'Notas') + `<rect x="188" y="280" width="152" height="40" rx="20" fill="#121b29" stroke="#24324a"/>` + T(205, 307, 17, '#9aa6ba', 'Panel táctil')
        + ['Recuerda: la tecla S', 'abre esta vista en el', 'ordenador del atril.'].map((l, i) => T(24, 360 + i * 32, 21, '#dce6f2', l)).join('')
        + `<rect x="20" y="500" width="152" height="190" rx="18" fill="#24324a"/>` + T(96, 606, 22, '#ffffff', 'Anterior', ' text-anchor="middle"')
        + `<rect x="188" y="500" width="152" height="190" rx="18" fill="${AMBER}"/>` + T(264, 606, 22, '#1d1300', 'Siguiente', ' text-anchor="middle" font-weight="700"'));

      return numbered(inkColor(build({ name: 'Cabina del orador', palette: 'ocean', fonts: 'tech', title: { color: TXT, size: 46 }, body: { color: TXT } }, [
        { layout: 'blank', bg: NAVY, transition: 'fade', back: [glow(700, 60, 640, '#123c66', NAVY, 70)], extra: [
          kicker('CABINA DEL ORADOR', 90, 170, 640, AMBER),
          text('Presentar como un profesional', 86, 206, 640, 200, { fontFamily: HT, fontSize: 68, color: TXT, fontWeight: 700, lineHeight: 1.05 }),
          text('Notas, vista del moderador, mando, puntero y reloj: todo lo que necesitas a mano.', 90, 430, 580, 90, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
          ...[['NOTAS', 'LISTAS', GREEN], ['MANDO', 'CONECTADO', CYAN], ['TIEMPO', '20 MIN', AMBER]].map(([a, b, c], i) =>
            text(`<span style="color:${DIM}">${a}</span><br><b style="color:${c}">${b}</b>`, 90 + i * 200, 548, 180, 70, { fontSize: 18, color: TXT, letterSpacing: 2, bg: PANEL, radius: 10, pad: [8, 14, 8, 14], lineHeight: 1.35 })),
          withAnims(img(gauge, 760, 130, 440, 440, 'Instrumento de cabina: horizonte artificial'), A('spin', { start: 'afterPrev', duration: 1400 }))],
        notes: 'Bienvenida. Esta lección se presenta como un piloto antes de despegar: primero la lista, luego los instrumentos. Las notas de cada diapositiva te sirven de guion; ábrelas al presentar con la tecla S.' },

        { layout: 'blank', bg: NAVY, extra: [...head('ANTES DE DESPEGAR', 'La lista de comprobación'),
          ...[['Escribe las notas de cada diapositiva', 'Ver ▸ Notas'], ['Ensaya y guarda el tiempo de cada una', 'Ver ▸ Ensayar intervalos'], ['Pide consejo: ritmo y muletillas', 'Ver ▸ Ensayar con entrenador'],
            ['Conecta el móvil como mando', 'Ver ▸ Conectar móvil'], ['Despega desde la primera', 'Ver ▸ Presentar']].flatMap(([t, w], i) => { const y = 196 + i * 92;
            return [RR(90, y, 1100, 76, PANEL, 12), RR(112, y + 18, 40, 40, NAVY, 8, { stroke: AMBER, strokeWidth: 3 }),
              text(t, 176, y, 560, 76, { fontSize: 25, color: TXT, vAlign: 'middle' }), where(w, 800, y + 17, 370, NAVY, CYAN, { borderColor: LINE, fontSize: 20 }),
              at(text('✓', 112, y + 12, 40, 50, { fontSize: 34, color: GREEN, textAlign: 'center', fontWeight: 800 }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, delay: i ? 250 : 0, ...(i === 4 && { sound: 'chime' }) })]; })],
        notes: 'Un clic y las cinco comprobaciones se marcan solas. El entrenador escucha tu ensayo y te dice si vas deprisa, qué muletillas repites y cuánto tiempo hablas en cada diapositiva.' },

        { layout: 'blank', bg: NAVY, extra: [...head('LA TECLA S', 'La vista del moderador'),
          img(pv, 90, 186, 740, 420, 'La vista del moderador: diapositiva actual, siguiente, notas, tiempo y ritmo'),
          ...[[330, 380], [664, 214], [664, 400], [124, 202]].map(([x, y], i) => at(E(x, y, 40, 40, AMBER, { html: `<b>${i + 1}</b>`, fontSize: 20, color: '#1d1300' }), 'zoom-in', { start: 'click', duration: 300 })),
          ...[['La diapositiva que ve el público'], ['La siguiente, para enlazar sin mirar atrás'], ['Tus notas, con letra grande'], ['Tiempo y Ritmo: cuánto llevas y cuánto te queda']].map(([t], i) =>
            text(`<b style="color:${AMBER}">${i + 1}</b>  ${t}`, 870, 200 + i * 92, 330, 80, { fontSize: 22, color: TXT, lineHeight: 1.3 })),
          text('Se abre en otra ventana: llévala a tu pantalla y deja las diapositivas en el proyector.', 90, 628, 1100, 40, { fontSize: 20, color: DIM })],
        notes: 'Al presentar, pulsa S. La vista del moderador tiene varias disposiciones: Predeterminada, Ancha, Alta o Solo notas. Haz clic en el reloj para ponerlo a cero si empiezas tarde.' },

        { layout: 'blank', bg: NAVY, back: [glow(820, 120, 520, '#123c66', NAVY, 60)], extra: [...head('VER ▸ CONECTAR MÓVIL', 'Tu móvil es el mando', TXT, 740),
          ...[['Pulsa <b>Ver ▸ Conectar móvil</b>.'], ['En el móvil, escanea el QR (o abre la dirección y escribe el código).'], ['Pasa las diapositivas y lee tus notas en la mano.'], ['En el <b>Panel táctil</b>: puntero, foco y lupa.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 90, 200 + i * 90, 640, AMBER, TXT, { size: 23, h: 74, numColor: '#1d1300' }), 'fade-right', i ? 'afterPrev' : 'click')),
          card('Solo un móvil a la vez controla la presentación; si alguien escribe el código, te pide permiso.', 90, 560, 640, 100, PANEL, { fontSize: 20, color: DIM, lineHeight: 1.4, radius: 12, vAlign: 'middle' }),
          withAnims({ ...base(860, 120, 270, 540), type: 'image', src: remote, alt: 'El mando en el móvil: notas y botones Anterior y Siguiente', fit: 'cover', device: 'phone' }, A('fade-up', { start: 'afterPrev', duration: 800 }))],
        notes: 'El móvil y el ordenador se conectan con el QR; el enlace lleva una clave. Puedes cerrar la ventana de conexión: el móvil sigue conectado mientras presentas.' },

        { layout: 'blank', bg: NAVY, extra: [...head('SEÑALA SIN MOVERTE', 'Puntero láser y tinta'),
          ...[['Ctrl + L', 'Puntero láser'], ['Ctrl + P', 'Lápiz'], ['Ctrl + I', 'Resaltador'], ['E', 'Borrar la tinta'], ['B', 'Pantalla en negro'], ['W', 'Pantalla en blanco']].flatMap(([k, l], i) => { const x = 90 + (i % 2) * 300, y = 200 + Math.floor(i / 2) * 110;
            return [key(k, x, y, 120, { fontSize: 20 }), text(l, x + 134, y - 6, 160, 64, { fontSize: 21, color: TXT, vAlign: 'middle', lineHeight: 1.2 })]; }),
          text('Clic derecho al presentar: todas las herramientas en un menú.', 90, 540, 560, 70, { fontSize: 21, color: DIM, lineHeight: 1.35 }),
          RR(700, 186, 500, 440, '#f4f7fb', 16),
          chartBlock({ x: 730, y: 230, w: 440, h: 360, chartType: 'bar', color: '#4a90d9', dataLabels: true, labelColor: '#1d2a3a',
            data: [{ label: 'Ene', value: 42 }, { label: 'Feb', value: 55 }, { label: 'Mar', value: 87, color: '#e8590c' }, { label: 'Abr', value: 61 }] }),
          at(ink(Array.from({ length: 40 }, (_, k) => { const a = -Math.PI / 2 + k / 39 * 2.15 * Math.PI; return [995 + 78 * Math.cos(a), 330 + 118 * Math.sin(a)]; }), RED, 6), 'draw', { duration: 1200 }),
          withAnims(E(760, 600, 22, 22, RED, { shadow: { x: 0, y: 0, blur: 14, color: RED } }), A('fade-in', { start: 'afterPrev' }), path([[90, -150], [190, -260], [240, -300]], { start: 'afterPrev', duration: 1600 }))],
        notes: 'Dos clics: el primero dibuja el círculo rojo alrededor de marzo, como harías con el lápiz; el segundo, un punto rojo que imita el puntero láser y va hacia esa barra. Datos inventados.' },

        { layout: 'blank', bg: '#fbfcfd', extra: [
          kicker('¿Y LA PIZARRA?', 90, 56, 600, '#c26a00'),
          text('Una diapositiva en blanco', 86, 88, 900, 70, { fontFamily: HT, fontSize: 46, color: '#14263a', fontWeight: 700 }),
          ...[['Inicio ▸ Nueva y, en Inicio ▸ Diseño, <b>En blanco</b>.'], ['Al presentar, <b>Ctrl + P</b> y dibuja con el ratón o el dedo.'], ['La tinta se queda en su diapositiva aunque vayas y vuelvas.'], ['En el editor también: <b>Dibujar ▸ Lápiz</b>.']]
            .flatMap(([t], i) => stepRow(i + 1, t, 90, 200 + i * 92, 560, '#14263a', '#14263a', { size: 23, h: 74 })),
          ...[[[[720, 260], [900, 250], [905, 340], [722, 348], [720, 258]], '#1d5fa8'], [[[905, 300], [1010, 300]], '#1d5fa8'], [[[990, 285], [1012, 300], [990, 316]], '#1d5fa8'],
            [Array.from({ length: 30 }, (_, k) => { const a = k / 29 * 2.05 * Math.PI; return [1090 + 70 * Math.cos(a), 300 + 60 * Math.sin(a)]; }), '#d1495b'],
            [[[760, 460], [820, 430], [880, 470], [940, 420], [1000, 465], [1060, 425], [1120, 455]], '#2a9d5c']]
            .map(([pts, c], i) => at(ink(pts, c, 6), 'draw', { start: i ? 'afterPrev' : 'click', duration: 700 })),
          text('Idea', 740, 278, 150, 50, { fontSize: 30, color: '#1d5fa8', textAlign: 'center', fontStyle: 'italic' }),
          text('Público', 1030, 278, 120, 44, { fontSize: 22, color: '#d1495b', textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Los trazos de la derecha son tinta: se dibujan solos con la animación «Dibujar», como si escribieras en la pizarra. Al presentar, con Ctrl + P dibujas tú encima de cualquier diapositiva.' },

        { layout: 'blank', bg: NAVY, back: [glow(640, 200, 560, '#123c66', NAVY, 60)], extra: [...head('EL RELOJ DE CABINA', 'Controla el tiempo'),
          RR(700, 200, 490, 260, PANEL, 22, { stroke: LINE, strokeWidth: 2 }),
          text('PAUSA', 700, 220, 490, 40, { fontSize: 22, color: AMBER, textAlign: 'center', letterSpacing: 8, fontWeight: 700 }),
          timer(120, 740, 262, 410, { style: 'digital', color: TXT, h: 150, w: 410 }),
          text('Insertar ▸ Cuenta atrás: empieza sola al llegar', 700, 480, 490, 40, { fontSize: 19, color: DIM, textAlign: 'center' }),
          text(ul('<b>Vista del moderador</b>: el tiempo que llevas y el ritmo de cada diapositiva', '<b>Ver ▸ Ensayar intervalos</b>: cronometra cada una y guarda los tiempos', '<b>Ver ▸ Apuntador</b>: tus notas grandes, desplazándose solas', '<b>Transiciones ▸ Avance automático (s)</b>: pasa sola'),
            90, 200, 570, 430, { fontSize: 23, color: TXT, lineHeight: 1.5 })],
        notes: 'La cuenta atrás de dos minutos empieza al llegar a esta diapositiva: úsala para una pausa o una actividad corta. El apuntador es ideal para grabar un vídeo o una videollamada.' },

        { layout: 'blank', bg: NAVY, extra: [...head('ATAJOS DE CABINA', 'Las teclas al presentar'),
          tableBlock({ x: 90, y: 176, w: 700, h: 500, fontSize: 20, header: true, headBg: AMBER, headFg: '#1d1300', stroke: LINE, banded: true, band: '#0d2742', color: TXT, colW: [2, 3],
            rows: [['Tecla', 'Qué hace'], ['→ · Espacio · ←', 'Siguiente · anterior'], ['S', 'Vista del moderador'], ['O', 'Vista general'], ['Esc', 'Salir de la presentación'], ['F', 'Pantalla completa'],
              ['C', 'Subtítulos en directo'], ['Ctrl + L', 'Puntero láser'], ['B · W', 'Pantalla en negro · en blanco'], ['E', 'Borrar la tinta']] }),
          card(`<b style="color:${AMBER}">Clic derecho</b> al presentar: todas las herramientas, y también <b>Elegir a alguien al azar</b> para que participe.`, 830, 190, 360, 190, PANEL, { fontSize: 22, color: TXT, lineHeight: 1.45, radius: 14 }),
          card(`<b style="color:${GREEN}">Buen vuelo</b><br>Llega diez minutos antes, prueba el proyector y respira.`, 830, 410, 360, 160, PANEL, { fontSize: 22, color: TXT, lineHeight: 1.45, radius: 14 })],
        notes: 'La lista completa de atajos está en Ver ▸ Atajos. Repásalos en voz alta con la vista del moderador abierta antes del día de la presentación.' },
      ]), TXT));
    } },

  // ============================================================================
  // 6 · Live polls and activities, as a TV quiz show: an ON AIR sign, how it
  //     works with a phone, and real ones to answer — a vote, a word cloud, a
  //     quiz with time and points, a countdown with the leaderboard and an
  //     activity to put in order.
  learn_revela_live: { name: 'Votaciones y actividades en directo', cat: 'showcase',
    summary: 'Un plató de concurso: votación, nube de palabras, cuestionario con puntos, cuenta atrás, clasificación y actividad de ordenar, de verdad',
    make: () => {
      const ST = '#12052a', MAG = '#f15bb5', YEL = '#fee440', CYAN = '#00bbf9', MINT = '#00f5d4', W = '#f6f0ff', DIM = '#bfaee6', PANEL = '#22104a', LINE = '#3b2370';
      const HB = pairStacks('bold').heading;
      const head = (k, t, w = 1100) => [kicker(k, 90, 46, 800, MINT), text(t, 86, 76, w, 80, { fontFamily: HB, fontSize: 64, color: W, letterSpacing: 1 })];
      const beams = [shape('triangle', 60, -40, 360, 760, CYAN, { fill2: ST, gradAngle: 90, opacity: 22, rotation: 18 }), shape('triangle', 860, -40, 360, 760, MAG, { fill2: ST, gradAngle: 90, opacity: 22, rotation: -18 })];
      const crowd = Array.from({ length: 14 }, (_, i) => { const x = 20 + i * 92, y = 640 + (i % 2) * 18;
        return [E(x, y, 80, 120, '#0a0218'), E(x + 18, y - 44, 44, 52, '#0a0218'), ...(i % 3 === 1 ? [R(x + 54, y - 20, 14, 24, CYAN, { radius: 3, shadow: { x: 0, y: 0, blur: 10, color: CYAN } })] : [])]; }).flat();
      const vote = svgURL(360, 720, `<rect width="360" height="720" fill="#f4f0ff"/><rect width="360" height="110" fill="${MAG}"/>` + T(24, 70, 26, '#ffffff', 'Votación en directo', ' font-weight="700"')
        + T(24, 160, 22, '#2a1550', '¿Qué actividad probarías', ' font-weight="700"') + T(24, 190, 22, '#2a1550', 'primero con tu clase?', ' font-weight="700"')
        + ['Una votación', 'Una nube de palabras', 'Un cuestionario', 'Preguntas del público'].map((o, i) => `<rect x="24" y="${230 + i * 92}" width="312" height="72" rx="14" fill="${i === 2 ? CYAN : '#ffffff'}" stroke="#d9cff2" stroke-width="2"/>`
          + T(46, 274 + i * 92, 20, i === 2 ? '#ffffff' : '#2a1550', o, i === 2 ? ' font-weight="700"' : '')).join('')
        + `<rect x="24" y="620" width="312" height="64" rx="32" fill="#2a1550"/>` + T(180, 660, 22, '#ffffff', 'Enviar', ' text-anchor="middle" font-weight="700"'));
      const side = (html, x, y, w, h) => card(html, x, y, w, h, PANEL, { fontSize: 21, color: W, lineHeight: 1.45, radius: 16, borderColor: LINE, pad: [18, 22, 18, 22] });

      return numbered(inkColor(build({ name: '¡En directo!', palette: 'violet', fonts: 'bold', title: { color: W, size: 60 }, body: { color: W } }, [
        { layout: 'blank', bg: ST, transition: 'zoom', back: [...beams, glow(390, 80, 500, '#4a1d8a', ST, 60)], extra: [
          withAnims(text('EN DIRECTO', 390, 96, 500, 90, { fontFamily: HB, fontSize: 76, textAlign: 'center', wordart: 'neon', wordartColor: MAG, letterSpacing: 8 }), A('flicker', { start: 'afterPrev', duration: 1200, sound: 'drumroll' })),
          text('Votaciones y actividades', 60, 214, 1160, 130, { fontFamily: HB, fontSize: 104, color: W, textAlign: 'center' }),
          text('El público responde con su móvil y los resultados salen al instante', 190, 350, 900, 50, { fontSize: 28, color: DIM, textAlign: 'center' }),
          where('Insertar ▸ Votación en directo', 440, 430, 400, PANEL, YEL, { borderColor: LINE, textAlign: 'center' }),
          ...crowd],
        notes: 'El cartel de «En directo» parpadea al llegar (Animaciones ▸ Más efectos ▸ Titilar, con el sonido «Redoble»). En esta lección hay votaciones de verdad: proyecta y pide a la gente que saque el móvil.' },

        { layout: 'blank', bg: ST, back: [glow(820, 100, 520, '#3b1670', ST, 60)], extra: [...head('CÓMO FUNCIONA', 'Tres pasos y a jugar', 760),
          ...[['Prepárala', '<b>Insertar ▸ Votación en directo</b>: elige el tipo, escribe la pregunta y las opciones.', MAG], ['Preséntala', 'En la diapositiva aparece un <b>código QR</b>.', CYAN],
            ['Que voten', 'Cada persona escanea el QR con su móvil y responde: el resultado se mueve al instante.', YEL]].flatMap(([t, d, c], i) => { const y = 190 + i * 140;
            return together([RR(90, y, 680, 120, PANEL, 18, { stroke: c, strokeWidth: 2 }), text(`<b>${i + 1}</b>`, 110, y + 20, 80, 80, { fontFamily: HB, fontSize: 72, color: c, textAlign: 'center', vAlign: 'middle' }),
              text(`<b style="color:${c}">${t}</b><br>${d}`, 206, y + 10, 540, 100, { fontSize: 21, color: W, lineHeight: 1.4, vAlign: 'middle' })], 'fade-right', i ? 'afterPrev' : 'click'); }),
          text('Los móviles se conectan directamente a este ordenador, sin servidor: funciona bien con decenas de personas.', 90, 620, 680, 60, { fontSize: 19, color: DIM, lineHeight: 1.35 }),
          withAnims({ ...base(880, 120, 270, 540), type: 'image', src: vote, alt: 'Pantalla del móvil al votar: la pregunta y cuatro opciones', fit: 'cover', device: 'phone' }, A('fade-up', { start: 'afterPrev', duration: 700 }))],
        notes: 'El móvil de la derecha es un dibujo de lo que ve el público al votar. En la siguiente diapositiva hay una votación real con esta misma pregunta.' },

        { layout: 'blank', bg: ST, extra: [
          pollBlock({ kind: 'choice', fontSize: 28, x: 70, y: 50, w: 790, h: 620, display: 'bar', color: W, question: '¿Qué actividad probarías primero con tu clase?', options: ['Una votación', 'Una nube de palabras', 'Un cuestionario con puntos', 'Preguntas del público'] }),
          side(`<b style="color:${YEL}">Tipo: Una opción</b><br>Cada persona elige una respuesta.<br><br><b style="color:${YEL}">Mostrar resultados como</b><br>Barras, Circular o Cifras.<br><br><b style="color:${YEL}">Borrar resultados</b><br>Para empezar de cero antes de la sesión.`, 900, 70, 310, 580)],
        notes: 'Votación real: al presentar sale el QR. Para cambiar la pregunta, las opciones o cómo se ven los resultados, selecciónala y pulsa Votación ▸ Editar votación.' },

        { layout: 'blank', bg: ST, extra: [...head('TIPOS DE ACTIVIDAD', 'Un formato para cada momento'),
          ...chain([['', 'Una opción', MAG], ['', 'Varias opciones', CYAN], ['', 'Valoración 1 a 5', YEL], ['', 'Nube de palabras', MINT], ['', 'Preguntas del público', MAG],
            ['(con respuesta correcta y puntos)', 'Cuestionario', YEL], ['Actividad:', 'ordenar', MINT], ['Actividad:', 'unir parejas', CYAN], ['Actividad:', 'completar huecos', MAG], ['Actividad:', 'etiquetar una imagen', YEL]].map(([pre, l, c], i) => {
            const x = 90 + (i % 5) * 222, y = 190 + Math.floor(i / 5) * 200, small = pre && `<div style="font-size:16px;color:${DIM};margin-top:4px">${pre}</div>`;
            return text(`<div style="color:${c};font-size:40px;line-height:1">●</div>${pre && pre.startsWith('Act') ? small : ''}<div style="margin-top:6px"><b>${l}</b></div>${pre && !pre.startsWith('Act') ? small : ''}`,
              x, y, 200, 170, { fontSize: 22, color: W, bg: PANEL, radius: 16, textAlign: 'center', vAlign: 'middle', pad: [10, 12, 10, 12], borderColor: LINE }); }), 'zoom-in', { duration: 250 }),
          text('Y más: clasificar en grupos, crucigrama, sopa de letras, memoria, rueda de letras, adivinar un número, respuesta dibujada, con foto o de voz…', 90, 600, 1100, 70, { fontSize: 21, color: DIM, lineHeight: 1.4 })],
        notes: 'Todos están en el desplegable «Tipo» de la votación. Las actividades (ordenar, unir parejas, completar huecos, etiquetar…) se corrigen solas y dan puntos.' },

        { layout: 'blank', bg: ST, back: [glow(340, 160, 600, '#3b1670', ST, 50)], extra: [
          pollBlock({ kind: 'word', fontSize: 30, x: 70, y: 50, w: 1140, h: 560, color: W, question: 'En una palabra: ¿cómo te sientes antes de presentar?', options: [] }),
          text('Tipo: <b>Nube de palabras</b> · las más repetidas salen más grandes · puedes activar <b>Tapar las palabrotas</b>', 90, 630, 1100, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Nube de palabras en directo: cuanto más se repite una palabra, más grande sale. Comenta las tres más grandes con el público.' },

        { layout: 'blank', bg: ST, extra: [
          pollBlock({ kind: 'quiz', fontSize: 30, x: 70, y: 50, w: 790, h: 620, time: 20, correct: [0], color: W, question: '¿Qué tecla abre la vista del moderador al presentar?', options: ['S', 'P', 'M', 'F'] }),
          side(`<b style="color:${YEL}">Tipo: Cuestionario</b><br>Con respuesta correcta y puntos.<br><br><b style="color:${YEL}">La correcta</b><br>Pon un asterisco (*) delante en las opciones.<br><br><b style="color:${YEL}">Puntos</b><br>De 500 a 1000 al acertar: más cuanto antes.`, 900, 70, 310, 580)],
        notes: 'Cuestionario con 20 segundos para responder. Al acabar el tiempo (o con un clic) se ve la respuesta correcta, la S, y quién va ganando.' },

        { layout: 'blank', bg: ST, back: [glow(40, 160, 560, '#4a1d8a', ST, 55)], extra: [...head('CUENTA ATRÁS Y CLASIFICACIÓN', 'Que se note la emoción'),
          E(110, 200, 360, 360, PANEL),
          timer(60, 140, 230, 300, { color: YEL }),
          text('Insertar ▸ Cuenta atrás<br><span style="color:' + DIM + '">empieza sola al llegar</span>', 90, 580, 400, 80, { fontSize: 22, color: W, textAlign: 'center', lineHeight: 1.4 }),
          pollBlock({ kind: 'board', fontSize: 26, x: 540, y: 180, w: 670, h: 480, color: W, question: 'Clasificación', options: [] })],
        notes: 'Un minuto de cuenta atrás para pensar, y a la derecha la clasificación con los puntos de todos los cuestionarios de la presentación (tipo «Clasificación de los cuestionarios»).' },

        { layout: 'blank', bg: ST, extra: [
          pollBlock({ kind: 'order', fontSize: 28, x: 70, y: 50, w: 1140, h: 560, color: W, question: 'Ordena los pasos para lanzar una votación',
            options: ['Insertar ▸ Votación en directo', 'Elegir el tipo y escribir la pregunta', 'Presentar la diapositiva', 'El público escanea el QR', 'Ver los resultados al instante'] }),
          text('Tipo: <b>Actividad: ordenar</b> · escribe los pasos en su orden; cada móvil los recibe desordenados', 90, 630, 1100, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Actividad de ordenar: cada persona recibe los pasos mezclados en el móvil, los ordena y Revela la corrige sola.' },

        { layout: 'blank', bg: ST, transition: 'zoom', back: [...beams], extra: [...head('DESPUÉS DEL DIRECTO', 'Y los resultados, ¿dónde están?'),
          ...[['Ver ▸ Resultados del público', 'Los puntos de cada participante en cada cuestionario y actividad.', CYAN], ['Descargar resultados (CSV)', 'En la ventana de cada votación, para abrirlos en una hoja de cálculo.', YEL],
            ['Ver ▸ En sus dispositivos', 'El público sigue las diapositivas en su móvil, con un código y un QR en la esquina.', MAG], ['Responder más tarde, sin presentar', 'Abre la actividad con un enlace para que cada uno responda cuando quiera.', MINT]]
            .map(([t, d, c], i) => at(card(`<b style="color:${c}">${t}</b><br>${d}`, 90 + (i % 2) * 560, 200 + Math.floor(i / 2) * 200, 530, 170, PANEL, { fontSize: 22, color: W, lineHeight: 1.45, radius: 16, borderColor: LINE }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 400 })),
          text('¡Gracias por jugar!', 90, 610, 1100, 60, { fontFamily: HB, fontSize: 48, color: YEL, textAlign: 'center', letterSpacing: 2 })],
        notes: 'Para responder más tarde, la presentación tiene que estar guardada en tu nube de Revela. Las preguntas también se pueden llevar a Moodle con Archivo ▸ Exportar preguntas.' },
      ]), W));
    } },

  // ============================================================================
  // 7 · Collaborating and sharing, as a cork board: index cards and sticky
  //     notes, the permissions table, a slide that carries real comments (one of
  //     them a task), the share dialog in a browser, a timeline of versions and
  //     an activity that pairs needs with tools.
  learn_revela_collab: { name: 'Colaborar y compartir', cat: 'showcase',
    summary: 'Un tablón de corcho: colaborar a la vez, permisos al compartir, comentarios y tareas reales, enlaces, versiones y una actividad de unir',
    make: () => {
      const CORK = '#c4955f', FRAME = '#5b3a1e', PAPER = '#fffdf6', YEL = '#ffe873', PINK = '#ffc2d3', BLUE = '#b8e0ff', GREEN = '#cdf1b0', PIN = '#d7263d', INK = '#2b2420', MUTED = '#6a5a4a';
      const HC = pairStacks('clean').heading;
      let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      const cork = svgURL(1280, 720, Array.from({ length: 900 }, () => `<circle cx="${(rnd() * 1280).toFixed(0)}" cy="${(rnd() * 720).toFixed(0)}" r="${(1 + rnd() * 2.6).toFixed(1)}" fill="${rnd() > 0.5 ? '#9c6f3f' : '#dcae78'}" opacity=".55"/>`).join(''), CORK);
      const board = [img(cork, 0, 0, 1280, 720, '', { fit: 'cover', decorative: true }), R(0, 0, 1280, 22, FRAME), R(0, 698, 1280, 22, FRAME), R(0, 0, 22, 720, FRAME), R(1258, 0, 22, 720, FRAME)];
      const pin = (x, y, c = PIN) => [E(x - 11, y - 11, 22, 22, c, { shadow: { x: 2, y: 3, blur: 4, color: '#00000055' } }), E(x - 5, y - 7, 7, 7, '#ffffff', { opacity: 60 })];
      const note = (html, x, y, w, h, c, rot = 0, props = {}) => [R(x, y, w, h, c, { rotation: rot, html, fontSize: 22, color: INK, shadow: { x: 3, y: 6, blur: 10, color: '#00000040' }, ...props }), ...pin(x + w / 2, y + 14)];
      const paper = (x, y, w, h, rot = 0) => [R(x, y, w, h, PAPER, { rotation: rot, shadow: { x: 3, y: 8, blur: 14, color: '#00000045' } }), ...pin(x + 30, y + 22, '#2a6fdb'), ...pin(x + w - 30, y + 22, '#2a6fdb')];
      const head = (t, x = 70, y = 52, w = 760) => [R(x, y, w, 84, PAPER, { rotation: -1, shadow: { x: 3, y: 6, blur: 10, color: '#00000040' } }),
        text(t, x + 24, y + 8, w - 48, 68, { fontFamily: HC, fontSize: 40, color: INK, fontWeight: 800, vAlign: 'middle', rotation: -1 })];
      const TITLE = uid();
      const share = svgURL(1000, 640, `<rect width="1000" height="640" fill="#ffffff"/>` + T(40, 64, 30, '#1f2330', 'Compartir', ' font-weight="700"')
        + T(40, 120, 21, '#1f2330', '¿Quién puede abrirla?', ' font-weight="700"')
        + [['Cualquiera que tenga el enlace o el archivo (sin contraseña)', 0], ['Solo quien sepa la contraseña (se pide al abrirla)', 1]].map(([l, on], i) =>
          `<circle cx="56" cy="${162 + i * 48}" r="11" fill="none" stroke="#2a6fdb" stroke-width="3"/>${on ? `<circle cx="56" cy="${162 + i * 48}" r="5" fill="#2a6fdb"/>` : ''}` + T(80, 169 + i * 48, 19, '#2b3040', l)).join('')
        + `<rect x="80" y="246" width="420" height="46" rx="8" fill="#f3f5f9" stroke="#d6dbe5"/>` + T(96, 276, 18, '#8a91a2', 'Contraseña')
        + T(40, 346, 21, '#1f2330', 'Caduca', ' font-weight="700"') + `<rect x="140" y="320" width="200" height="40" rx="8" fill="#f3f5f9" stroke="#d6dbe5"/>` + T(156, 347, 18, '#2b3040', '30 días')
        + `<rect x="40" y="396" width="920" height="56" rx="10" fill="#f3f5f9" stroke="#d6dbe5"/>` + T(60, 431, 18, '#5a6275', 'https://…/v/7f3c9a#k=…')
        + `<rect x="760" y="404" width="190" height="40" rx="20" fill="#2a6fdb"/>` + T(855, 430, 18, '#ffffff', 'Copiar enlace', ' text-anchor="middle" font-weight="700"')
        + `<rect x="40" y="480" width="200" height="44" rx="22" fill="#eef2f8"/>` + T(140, 508, 17, '#2b3040', 'Insertar (iframe)', ' text-anchor="middle"')
        + T(40, 590, 19, '#5a6275', 'Visitas: 128') + `<rect x="760" y="560" width="190" height="44" rx="22" fill="#ffffff" stroke="#d1495b" stroke-width="2"/>` + T(855, 588, 17, '#d1495b', 'Dejar de compartir', ' text-anchor="middle"'));
      const t0 = Date.UTC(2026, 9, 6, 9, 14);

      return numbered(inkColor(build({ name: 'Tablón del equipo', palette: 'warm', fonts: 'clean', title: { color: INK, size: 44 }, body: { color: INK } }, [
        { layout: 'blank', bg: CORK, transition: 'fade', back: board, extra: [
          ...paper(330, 170, 620, 360, -1),
          text('Colaborar<br>y compartir', 380, 214, 520, 180, { fontFamily: HC, fontSize: 72, color: INK, fontWeight: 800, lineHeight: 1.02, rotation: -1 }),
          text('Comentarios, permisos, enlaces y versiones: trabajar en equipo sin perder nada.', 384, 398, 520, 116, { fontSize: 24, color: MUTED, lineHeight: 1.4, rotation: -1 }),
          ...[['Comenta', YEL, 80, 110, -6], ['Comparte', PINK, 1010, 120, 5], ['Recupera', BLUE, 90, 470, 4], ['Edita a la vez', GREEN, 1000, 470, -4]].flatMap(([t, c, x, y, r]) =>
            together(note(`<b>${t}</b>`, x, y, 190, 150, c, r, { fontSize: 26, fontFamily: HC }), 'zoom-in', 'afterPrev', { duration: 350 }))],
        notes: 'Portada de tablón: las notas adhesivas entran solas una detrás de otra. La lección cubre las cuatro: comentar, compartir con permisos, recuperar versiones y editar a la vez.' },

        { layout: 'blank', bg: CORK, back: board, extra: [...head('Tres maneras de trabajar juntos'),
          ...[['users', 'Editar a la vez', 'Archivo ▸ Colaborar', 'Enlaces para ver, comentar o editar al mismo tiempo, y un chat.', YEL],
            ['user-plus', 'Con personas concretas', 'Archivo ▸ Personas', 'Desde tu nube de Revela: cada persona con su permiso. Es del plan Pro.', PINK],
            ['link', 'Con un enlace o archivo', 'Archivo ▸ Compartir', 'Enlace privado o archivo con contraseña, también para insertar en una web.', BLUE]].flatMap(([ic, t, w, d, c], i) => { const x = 70 + i * 390, r = [-2, 1.5, -1][i];
            return together([...note('', x, 180, 360, 440, c, r), icon(ic, x + 30, 220, 54, INK),
              text(`<b>${t}</b>`, x + 30, 284, 300, 76, { fontFamily: HC, fontSize: 26, color: INK, rotation: r, lineHeight: 1.15, vAlign: 'middle' }),
              text(w, x + 30, 372, 300, 44, { fontSize: 20, color: INK, bg: '#ffffffaa', radius: 8, pad: [0, 10, 0, 10], vAlign: 'middle', fontWeight: 700, rotation: r }),
              text(d, x + 30, 432, 300, 150, { fontSize: 22, color: INK, lineHeight: 1.4, rotation: r })], 'fade-up', i ? 'afterPrev' : 'click'); })],
        notes: 'Compartir con personas concretas es del plan Pro; el enlace funciona en todos los planes. Con Archivo ▸ Llamada hay además videollamada con quienes trabajan en la presentación (Pro).' },

        { layout: 'blank', bg: CORK, back: board, extra: [...head('Permisos: quién puede hacer qué'),
          ...paper(60, 170, 790, 470, 0),
          tableBlock({ x: 90, y: 210, w: 730, h: 400, fontSize: 21, header: true, headBg: '#2a6fdb', headFg: '#ffffff', stroke: '#e4dccb', banded: true, band: '#f5efe2', color: INK, colW: [2.4, 1.1, 1.4, 1.1, 2.4],
            rows: [['Permiso', 'Ver', 'Comentar', 'Editar', 'Descargar o copiar'], ['Solo presentar', '✓', '✗', '✗', '✗ nunca'], ['Puede ver', '✓', '✗', '✗', 'según los ajustes'],
              ['Puede comentar', '✓', '✓', '✗', 'según los ajustes'], ['Puede editar', '✓', '✓', '✓', '✓']] }),
          ...note('<b>Acceso hasta</b><br>Pon fecha de fin; vacío, sin fecha de fin.', 900, 180, 300, 190, YEL, 3, { fontSize: 21 }),
          ...note('<b>Ajustes de permisos</b><br>Que quien ve o comenta no pueda descargarla, imprimirla ni copiarla.', 900, 410, 300, 220, GREEN, -2, { fontSize: 21 })],
        notes: '«Solo presentar» deja verla como presentación, nunca permite copiar y no ve las notas del orador. En Ajustes de permisos decides también si quien edita puede compartirla y cambiar permisos.' },

        { layout: 'blank', bg: CORK, back: board, comments: [
          { id: uid(), text: '¿Ponemos la hora de salida más grande? @Marta', author: 'Lucía', time: t0, blockId: TITLE, resolved: false,
            replies: [{ id: uid(), text: 'Hecho: ahora se ve desde el fondo.', author: 'Marta', time: t0 + 3600e3 }] },
          { id: uid(), text: '+Jorge revisa el presupuesto antes del viernes', author: 'Lucía', time: t0 + 7200e3, blockId: null, resolved: false, replies: [], assignee: 'Jorge', due: '2026-10-16' }], extra: [
          ...head('Comentarios y tareas'),
          ...paper(60, 170, 600, 470, 1),
          same(TITLE, text('Excursión al planetario', 96, 214, 520, 60, { fontFamily: HC, fontSize: 34, color: INK, fontWeight: 800, rotation: 1 })),
          text('Salida: <b>8:30</b> desde la puerta principal<br>Vuelta: 14:00<br>Presupuesto: 12 € por alumno', 100, 290, 520, 140, { fontSize: 24, color: INK, lineHeight: 1.6, rotation: 1 }),
          shape('speechround', 330, 430, 300, 130, YEL, { html: '<b>Lucía:</b> ¿Ponemos la hora de salida más grande? <b style="color:#2a6fdb">@Marta</b>', fontSize: 18, color: INK, rotation: 1, shadow: { x: 2, y: 4, blur: 8, color: '#00000040' } }),
          ...[['Abre <b>Ver ▸ Comentarios</b>.'], ['Selecciona un objeto y comenta: queda unido a él.'], ['Escribe <b>+nombre</b> y será una tarea para esa persona.'], ['Resuélvelo cuando esté hecho.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 700, 196 + i * 100, 500, PIN, INK, { size: 22, h: 76 }).map(b => b.type === 'text' && b.w > 100 ? { ...b, bg: PAPER, radius: 10, pad: [0, 12, 0, 12] } : b), 'fade-left', i ? 'afterPrev' : 'click'))],
        notes: 'Esta diapositiva lleva dos comentarios de verdad: ábrelos con Ver ▸ Comentarios. Uno está unido al título y tiene respuesta; el otro es una tarea para Jorge con fecha. Las menciones con @ salen resaltadas.' },

        { layout: 'blank', bg: CORK, back: board, extra: [...head('Un enlace para compartir'),
          ...[['Pulsa <b>Archivo ▸ Compartir</b>.'], ['Elige quién puede abrirla: con el enlace, o solo con contraseña.'], ['Si quieres, que <b>Caduque</b> en unos días.'], ['<b>Copiar enlace</b> y envíalo.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 70, 196 + i * 92, 460, PIN, INK, { size: 22, h: 76 }).map(b => b.type === 'text' && b.w > 100 ? { ...b, bg: PAPER, radius: 10, pad: [0, 12, 0, 12] } : b), 'fade-right', i ? 'afterPrev' : 'click')),
          ...note('Con <b>Insertar (iframe)</b> la pones en la web del centro o en Moodle.', 70, 570, 460, 100, BLUE, -1, { fontSize: 20 }),
          { ...base(580, 170, 640, 470), type: 'image', src: share, alt: 'La ventana Compartir: quién puede abrirla, contraseña, caducidad y enlace', fit: 'cover', device: 'browser' }],
        notes: 'La ventana del navegador es un dibujo de Archivo ▸ Compartir. En ella ves también cuántas visitas ha tenido el enlace y puedes dejar de compartir cuando quieras.' },

        { layout: 'blank', bg: CORK, back: board, extra: [...head('Versiones: vuelve a ayer'),
          ...paper(60, 170, 1160, 290, 0),
          dg('timeline', 'Lunes 9:14\n  Automática\nMartes 18:02\n  «Antes de la revisión»\nMiércoles 11:30\n  Automática\nHoy\n  Versión actual', 90, 210, 1100, 230, { oneByOne: true, colors: 'colorful', textColor: INK }),
          ...note('<b>Archivo ▸ Versiones</b><br>Guardar versión… y ponle un nombre que recuerdes.', 70, 490, 340, 170, YEL, -2, { fontSize: 21 }),
          ...note('<b>Restaurar</b><br>La versión actual se guarda antes en el historial.', 470, 490, 340, 170, PINK, 1.5, { fontSize: 21 }),
          ...note('<b>Ver ▸ Control de cambios</b><br>Cada cambio con su autor, para aceptarlo o rechazarlo.', 870, 490, 340, 170, GREEN, -1, { fontSize: 21 })],
        notes: 'El historial guarda versiones automáticas y las que tú nombras. Restaurar no borra nada: lo de ahora pasa al historial antes. Fechas de ejemplo.' },

        { layout: 'blank', bg: CORK, back: board, extra: [
          ...paper(50, 44, 1180, 630, 0),
          pollBlock({ kind: 'match', fontSize: 28, x: 80, y: 80, w: 1120, h: 570, color: INK, question: 'Une cada necesidad con su herramienta',
            options: ['Que la revise sin tocar nada = Puede comentar', 'Editar a la vez = Archivo ▸ Colaborar', 'Volver a lo de ayer = Archivo ▸ Versiones', 'Ponerla en la web del centro = Insertar (iframe)'] })],
        notes: 'Actividad de unir parejas: el público la resuelve en el móvil y Revela la corrige sola. Repasa en voz alta cada pareja al terminar.' },

        { layout: 'blank', bg: CORK, back: board, extra: [...head('Antes de compartir, comprueba…', 70, 52, 820),
          ...[['Los permisos', 'ver, comentar o editar', YEL, -3], ['La fecha de fin', 'en Acceso hasta', PINK, 2], ['Una versión con nombre', 'por si hay que volver', BLUE, -1], ['Comentarios resueltos', 'nada pendiente', GREEN, 3]]
            .flatMap(([t, d, c, r], i) => together(note(`<div style="font-size:34px;color:#2e7d32">✓</div><b>${t}</b><br>${d}`, 70 + i * 292, 200, 260, 260, c, r, { fontSize: 24, lineHeight: 1.35 }), 'drop', i ? 'afterPrev' : 'click', { duration: 600 })),
          text('¡Buen trabajo en equipo!', 70, 540, 1140, 80, { fontFamily: HC, fontSize: 52, color: PAPER, fontWeight: 800, textAlign: 'center', shadow: { x: 0, y: 3, blur: 8, color: '#00000066' } })],
        notes: 'Cuatro comprobaciones antes de mandar el enlace. Las notas caen una detrás de otra con un clic (Animaciones ▸ Más efectos ▸ Caer).' },
      ]), INK));
    } },

  // ============================================================================
  // 8 · Revela's AI, as a chat under the northern lights: a robot that waves,
  //     what you need, a conversation that writes a presentation, a text that
  //     gets shorter (Transform by words), a picture, the assistant and the rest.
  learn_revela_ai: { name: 'La IA de Revela', cat: 'showcase',
    summary: 'Un chat bajo la aurora: crear una presentación, reescribir textos (con Transformar por palabras), imágenes, el asistente y más ayudas',
    make: () => {
      const BG = '#0b0d1a', A1 = '#3bb3c3', A2 = '#8e6cc9', A3 = '#4caf7d', W = '#f2f4ff', DIM = '#a5acc8', USER = '#2b3c6e', AIB = '#f4f1ff', AIT = '#1d1a33', PANEL = '#151a33', LINE = '#2a3157';
      const HM = pairStacks('modern').heading;
      const aurora = [glow(-200, -300, 900, A2, BG, 45), glow(700, -360, 800, A1, BG, 40), glow(300, 380, 700, A3, BG, 18),
        shape('wave', -100, 40, 1500, 220, A1, { fill2: A2, gradAngle: 0, opacity: 16, rotation: -6 })];
      const head = (k, t) => [kicker(k, 90, 50, 800, A1), text(t, 86, 82, 1100, 70, { fontFamily: HM, fontSize: 44, color: W, fontWeight: 700 })];
      // Chat bubbles: the person (right, dark) and the AI (left, light).
      const you = (html, x, y, w, h, fs = 22) => text(html, x, y, w, h, { fontSize: fs, color: W, bg: USER, radius: 20, pad: [14, 20, 14, 20], lineHeight: 1.4, vAlign: 'middle' });
      const ai = (html, x, y, w, h, fs = 22) => text(html, x, y, w, h, { fontSize: fs, color: AIT, bg: AIB, radius: 20, pad: [14, 20, 14, 20], lineHeight: 1.4, vAlign: 'middle' });
      const SENT = uid();
      const sentence = (html, size) => same(SENT, text(html, 120, 230, 1040, 220, { fontFamily: HM, fontSize: size, color: W, textAlign: 'center', vAlign: 'middle', lineHeight: 1.3 }));
      const tools = hi => ['Más corto', 'Más formal', 'Más sencillo', 'Corregir', 'En viñetas', 'Traducir'].map((l, i) =>
        text(l, 90 + i * 186, 520, 172, 52, { fontSize: 20, textAlign: 'center', vAlign: 'middle', radius: 26, color: i === hi ? AIT : W, bg: i === hi ? A1 : PANEL, borderColor: i === hi ? A1 : LINE, fontWeight: i === hi ? 700 : 400 }));
      const light = svgURL(640, 480, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7c6a3"/><stop offset=".5" stop-color="#f3a6a0"/><stop offset="1" stop-color="#b7c9e8"/></linearGradient>`
        + `<filter id="b"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="640" height="480" fill="url(#s)"/>`
        + `<circle cx="470" cy="250" r="60" fill="#ffe6b8" opacity=".9" filter="url(#b)"/>`
        + `<path d="M0 330 Q160 300 320 330 T640 320 V480 H0Z" fill="#7aa0c8" opacity=".85" filter="url(#b)"/><path d="M0 380 Q200 350 400 380 T640 370 V480 H0Z" fill="#5b7fae" opacity=".8" filter="url(#b)"/>`
        + `<path d="M60 330 L120 250 L240 260 L300 330Z" fill="#6d5a6e" opacity=".9" filter="url(#b)"/>`
        + `<path d="M178 330 L190 150 L222 150 L234 330Z" fill="#fbf6ef"/><path d="M190 190 H222 V214 H188Z M186 250 H226 V274 H184Z" fill="#d1495b"/>`
        + `<rect x="184" y="126" width="44" height="26" fill="#3b3550"/><path d="M178 126 L206 104 L234 126Z" fill="#d1495b"/><circle cx="206" cy="139" r="7" fill="#ffe08a"/>`
        + `<path d="M213 139 L420 90 L420 170Z" fill="#fff3c4" opacity=".35"/>`, '#f7c6a3');

      return numbered(build({ name: 'Con la IA de Revela', palette: 'revela', fonts: 'modern', title: { color: W, size: 44 }, body: { color: W } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: aurora, extra: [
          kicker('LECCIÓN 8 · PESTAÑA IA', 90, 180, 600, A1),
          text('La IA<br>de Revela', 86, 222, 680, 200, { fontFamily: HM, fontSize: 84, color: W, fontWeight: 800, lineHeight: 1.05 }),
          text('Tu ayudante para crear, reescribir e ilustrar. Ella propone; tú decides.', 90, 440, 600, 90, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
          where('Asistente', 90, 556, 200, PANEL, W, { borderColor: LINE, textAlign: 'center' }),
          text('el botón de la barra de arriba', 306, 556, 360, 42, { fontSize: 20, color: DIM, vAlign: 'middle' }),
          m3d('three-RobotExpressive', 800, 110, 400, 540, { clip: 'Wave', view: 'front', edge: 'fade' })],
        notes: 'El robot saluda en bucle (Modelo 3D ▸ animación «Wave»). Esta lección enseña las funciones de la pestaña IA y el botón Asistente de la barra superior.' },

        { layout: 'blank', bg: BG, back: aurora, extra: [...head('ANTES DE EMPEZAR', 'Lo que necesitas'),
          ...[['sparkles', 'En revelaslides.com', 'La IA viene incluida, sin claves. Con el plan Pro, cada mes tienes créditos de IA.', A1],
            ['key', 'En otra instalación', '<b>IA ▸ Conectar IA</b>: con OpenRouter o con tu propia clave, y eliges el modelo.', A2],
            ['eye', 'Siempre, revisa', 'La IA propone cambios: tú eliges cuáles aplicar y lo deshaces con Ctrl + Z.', A3]].flatMap(([ic, t, d, c], i) => { const x = 90 + i * 375;
            return together([RR(x, 200, 350, 400, PANEL, 22, { stroke: c, strokeWidth: 2 }), E(x + 30, 230, 76, 76, c, { opacity: 25 }), icon(ic, x + 48, 248, 40, c),
              text(`<b>${t}</b>`, x + 30, 324, 290, 72, { fontSize: 25, color: W, lineHeight: 1.2, vAlign: 'middle' }), text(d, x + 30, 404, 290, 180, { fontSize: 22, color: DIM, lineHeight: 1.45 })], 'fade-up', i ? 'afterPrev' : 'click'); })],
        notes: 'Conectar IA está en la pestaña IA, grupo Ajustes. Lo que propone la IA no se aplica hasta que lo aceptas.' },

        { layout: 'blank', bg: BG, back: aurora, extra: [...head('IA ▸ CREAR PRESENTACIÓN', 'Pídela como a un compañero'),
          ...[['Pulsa <b>IA ▸ Crear presentación</b>.'], ['Di el tema, el público y la duración.'], ['O parte de un documento o de fotos.'], ['Revisa y ajusta lo que quieras.']]
            .flatMap(([t], i) => stepRow(i + 1, t, 90, 200 + i * 90, 470, A2, W, { size: 22, h: 70 })),
          text('También desde la galería: <b>Crear con IA</b>.', 90, 570, 470, 60, { fontSize: 20, color: DIM }),
          RR(610, 180, 590, 470 + 0, PANEL, 22, { stroke: LINE, strokeWidth: 2 }),
          ...chain([you('Una clase de 20 minutos sobre el ciclo del agua para 2.º de ESO, con una actividad al final', 750, 198, 430, 104, 20),
            ai('Te propongo 8 diapositivas: evaporación, condensación, precipitación, escorrentía… y un cuestionario final.', 630, 314, 470, 124, 20),
            you('¡Perfecto! Añade un esquema del ciclo', 810, 450, 370, 84, 20),
            ai('Hecho: diapositiva 5, con un diagrama de ciclo ✓', 630, 548, 400, 84, 20)], 'fade-up', { duration: 450, delay: 300 })],
        notes: 'La conversación aparece sola, burbuja a burbuja, con un clic (Comienzo: Después de la anterior y un pequeño retardo). Es un ejemplo de cómo pedirla: tema, público, duración y lo que no puede faltar.' },

        { layout: 'blank', bg: BG, back: aurora, extra: [...head('IA ▸ TEXTO SELECCIONADO', 'Reescribir sin empezar de cero'),
          RR(90, 200, 1100, 290, PANEL, 22, { stroke: LINE, strokeWidth: 2 }),
          sentence('Si en algún momento tienes cualquier tipo de duda sobre la actividad pregunta a tu profesor sin ningún miedo', 36),
          ...tools(0),
          text('Selecciona el texto y elige qué hacer. Pasa a la siguiente diapositiva…', 90, 600, 1100, 40, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Con un texto seleccionado, el grupo «Texto seleccionado» de la pestaña IA lo acorta, lo hace más formal o más sencillo, lo corrige, lo pone en viñetas o lo traduce.' },

        { layout: 'blank', bg: BG, back: aurora, autoAnimate: true, morphBy: 'words', extra: [...head('IA ▸ MÁS CORTO', 'Lo mismo, con menos palabras'),
          RR(90, 200, 1100, 290, PANEL, 22, { stroke: A1, strokeWidth: 2 }),
          sentence('Si tienes dudas pregunta a tu profesor', 52),
          ...tools(0),
          text('Las palabras que se quedan viajan a su sitio: es <b>Transiciones ▸ Transformar</b> por palabras.', 90, 600, 1100, 40, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Antes y después de «Más corto», con Transformar por palabras: las palabras que se mantienen viajan y el resto se desvanece. Un buen truco para enseñar una corrección.' },

        { layout: 'blank', bg: BG, back: aurora, extra: [...head('IA ▸ CREAR IMAGEN', 'Describe la imagen que quieres'),
          you('Acuarela de un faro al atardecer, colores suaves, mar en calma', 90, 200, 470, 110),
          withAnims(img(light, 620, 190, 580, 435, 'Acuarela de un faro al atardecer con el mar en calma', { fit: 'cover', radius: 18 }), A('dissolve', { start: 'afterPrev', duration: 1600 })),
          text(ul('Di el estilo: acuarela, foto, dibujo plano…', 'Di los colores y el ambiente', '<b>IA ▸ Texto alternativo</b> la describe para quien no la ve', '<b>Insertar ▸ Crear 3D con IA</b>: también objetos en 3D'),
            90, 340, 490, 280, { fontSize: 21, color: W, lineHeight: 1.5 }),
          text('Imagen de ejemplo dibujada para esta plantilla', 620, 636, 580, 30, { fontSize: 16, color: DIM, textAlign: 'right' })],
        notes: 'La acuarela aparece sola con un efecto de disolver (Animaciones ▸ Más efectos). Es un dibujo hecho para la plantilla, no una imagen generada.' },

        { layout: 'blank', bg: BG, back: aurora, extra: [...head('EL ASISTENTE', 'Pide cambios con tus palabras'),
          RR(90, 190, 760, 470, PANEL, 22, { stroke: LINE, strokeWidth: 2 }),
          ...chain([you('Pon los títulos en azul marino y añade una diapositiva de resumen al final', 330, 214, 500, 110),
            ai('Te propongo dos cambios. Elige cuáles aplicar:', 110, 344, 520, 64),
            ai('☑ Títulos en azul marino · 9 diapositivas<br>☑ Nueva diapositiva «Resumen»', 110, 424, 620, 110),
            you('Aplica los dos 👍', 580, 560, 250, 64)], 'fade-up', { duration: 450, delay: 300 }),
          text('<b>Asistente</b>, en la barra de arriba o en <b>IA ▸ Asistente</b>: la IA propone los cambios diapositiva a diapositiva y tú eliges. También le puedes adjuntar fotos o documentos.', 890, 200, 310, 300, { fontSize: 21, color: W, lineHeight: 1.5 }),
          m3d('three-RobotExpressive', 930, 470, 220, 200, { clip: 'Yes', view: 'front', edge: 'fade' })],
        notes: 'El asistente trabaja sobre la presentación abierta: colores, textos, diapositivas nuevas… Siempre te enseña la propuesta antes de aplicarla.' },

        { layout: 'blank', bg: BG, back: aurora, extra: [...head('MEJORAR LA PRESENTACIÓN', 'Más ayudas en la pestaña IA'),
          ...chain([['Mejorar diapositiva', 'otra composición para esta'], ['Revisar presentación', 'qué cambiar, diapositiva a diapositiva'], ['Ensayar preguntas', 'las que te pueden hacer al acabar'], ['Cuestionario en directo', 'preguntas sobre lo presentado'],
            ['Notas de todas', 'notas del orador para cada una'], ['Traducir presentación', 'a otro idioma, entera'], ['Nivel de lectura', 'para otra edad o lectura fácil'], ['Voz en off', 'una voz lee tus notas']].map(([t, d], i) =>
            text(`<b style="color:${[A1, A2, A3, '#e0873b'][i % 4]}">${t}</b><br>${d}`, 90 + (i % 4) * 280, 200 + Math.floor(i / 4) * 200, 260, 170, { fontSize: 21, color: W, bg: PANEL, radius: 18, pad: [18, 20, 18, 20], borderColor: LINE, lineHeight: 1.45 })), 'zoom-in', { duration: 300 }),
          text('Todas están en la pestaña <b>IA</b>, en el grupo «Mejorar la presentación».', 90, 610, 1100, 40, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'Un clic y aparecen las ocho, una detrás de otra. «Ensayar preguntas» es muy útil antes de una defensa o una entrevista.' },

        { layout: 'blank', bg: BG, transition: 'fade', back: aurora, extra: [
          kicker('BUENAS PRÁCTICAS', 90, 120, 600, A1),
          text('Pide bien, revisa siempre', 86, 152, 730, 80, { fontFamily: HM, fontSize: 44, color: W, fontWeight: 800 }),
          ...[['Sé concreto', 'tema, público, tono y duración'], ['Da contexto', 'adjunta tus apuntes o documentos'], ['Comprueba los datos', 'cifras, fechas y nombres'], ['Cuida la privacidad', 'nada de datos personales de nadie']]
            .flatMap(([t, d], i) => together(stepRow(i + 1, `<b>${t}</b> · ${d}`, 90, 270 + i * 88, 680, [A1, A2, A3, '#e0873b'][i], W, { size: 24, h: 64 }), 'fade-right', i ? 'afterPrev' : 'click')),
          m3d('three-RobotExpressive', 820, 150, 380, 520, { clip: 'ThumbsUp', view: 'front', edge: 'fade' })],
        notes: 'Cierre: cuatro consejos para usar la IA con cabeza. El robot levanta el pulgar (animación «ThumbsUp» del modelo).' },
      ]));
    } },

  // ============================================================================
  // 9 · Design, as a swatch book on a white gallery wall: a fan of swatches,
  //     the layers (theme, master, layouts, slide), the nine palettes and the
  //     eight font pairs in their own type, the master as a tree, contrast
  //     worked out, Text Art and curved text, design ideas and four rules.
  learn_revela_design: { name: 'Diseño: patrón, temas y colores', cat: 'showcase',
    summary: 'Un muestrario: patrón y diseños de diapositiva, temas, paletas y fuentes, contraste calculado, Text Art, texto curvo e ideas de diseño',
    make: () => {
      const INK = '#111111', GREY = '#666666', LINE = '#e4e4e4', SOFT = '#f6f6f4';
      const HE = pairStacks('editorial').heading;
      const head = (k, t) => [kicker(k, 90, 54, 800, GREY), text(t, 86, 86, 1100, 70, { fontFamily: HE, fontSize: 44, color: INK, fontWeight: 700 }), R(90, 166, 80, 4, INK)];
      const swatch = (c, label, x, y, rot) => RR(x, y, 130, 430, c, 10, { rotation: rot, html: `<div style="background:#ffffff;color:#222;padding:10px 6px 12px;font-size:14px;line-height:1.3"><b>${label}</b><br>${c.toUpperCase()}</div>`,
        vAlign: 'bottom', fontSize: 14, color: INK, shadow: { x: 0, y: 8, blur: 18, color: '#00000030' } });
      const FAN = [['#d1495b', 'Granada'], ['#e0873b', 'Naranja'], ['#f6c445', 'Mostaza'], ['#4caf7d', 'Hoja'], ['#3bb3c3', 'Laguna'], ['#3f6497', 'Revela'], ['#8e6cc9', 'Lavanda']];
      const PAL = [['revela', 'Revela'], ['office', 'Office'], ['ocean', 'Océano'], ['forest', 'Bosque'], ['warm', 'Cálido'], ['paper', 'Papel'], ['violet', 'Violeta'], ['midnight', 'Medianoche'], ['grayscale', 'Escala de grises']];
      const FONTS = [['modern', 'Moderna', 'Montserrat / Open Sans'], ['classic', 'Clásica', 'Playfair Display / Lato'], ['editorial', 'Editorial', 'Merriweather / PT Sans'], ['clean', 'Limpia', 'Inter'],
        ['tech', 'Técnica', 'Space Grotesk / DM Sans'], ['bold', 'Impacto', 'Bebas Neue / Roboto'], ['friendly', 'Amable', 'Poppins / Nunito'], ['websafe', 'Sin descargas', 'Georgia / Verdana']];
      // A small slide drawn with shapes (for the master tree and the design ideas).
      const mini = (x, y, w, bg, parts) => [R(x, y, w, w * 9 / 16, bg, { stroke: LINE, strokeWidth: 2, shadow: { x: 0, y: 4, blur: 10, color: '#00000018' } }), ...parts.map(([k, a, b, c, d, f, p = {}]) =>
        shape(k, x + a * w, y + b * w * 9 / 16, c * w, d * w * 9 / 16, f, p))];

      return numbered(build({ name: 'Muestrario de diseño', palette: 'grayscale', fonts: 'editorial', title: { color: INK, size: 44 }, body: { color: INK } }, [
        { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
          kicker('LECCIÓN 9 · PESTAÑA DISEÑO', 90, 200, 500, GREY),
          text('Diseño', 84, 236, 560, 150, { fontFamily: HE, fontSize: 124, color: INK, fontWeight: 700 }),
          text('Patrón, temas, colores, fuentes y Text Art: que todas tus diapositivas hablen el mismo idioma.', 90, 400, 500, 120, { fontSize: 26, color: GREY, lineHeight: 1.45 }),
          ...FAN.map(([c, l], i) => withAnims(swatch(c, l, 690 + i * 52, 130 + Math.abs(i - 3) * 14, (i - 3) * 9), A('fade-up', { start: 'afterPrev', duration: 350 })))],
        notes: 'El abanico de muestras entra solo al llegar. Cada muestra es una forma con su texto dentro, girada unos grados.' },

        { layout: 'blank', bg: '#ffffff', extra: [...head('LAS CAPAS', 'De lo general a lo concreto'),
          ...[['Tema', 'Colores y fuentes de toda la presentación', '#3f6497'], ['Patrón de diapositivas', 'Fondo, logo y estilos de texto comunes', '#4caf7d'],
            ['Diseños', 'Portada, Título y contenido, Dos contenidos…', '#e0873b'], ['Diapositiva', 'Tu contenido, sobre su diseño', '#d1495b']].flatMap(([t, d, c], i) =>
            together([RR(90 + i * 50, 200 + i * 96, 620, 150, SOFT, 14, { stroke: c, strokeWidth: 3, shadow: { x: 0, y: 6, blur: 14, color: '#00000018' } }),
              R(90 + i * 50, 200 + i * 96, 14, 150, c),
              text(`<b>${t}</b> <span style="color:${GREY}">· ${d}</span>`, 124 + i * 50, 206 + i * 96, 580, 80, { fontSize: 22, color: INK, vAlign: 'middle', lineHeight: 1.3 })], 'fade-down', i ? 'afterPrev' : 'click', { duration: 400 })),
          text('Cambia una capa de arriba y cambia todo lo que tiene debajo.', 900, 230, 300, 160, { fontFamily: HE, fontSize: 28, color: INK, lineHeight: 1.35 }),
          text('<b>Diseño ▸ Temas</b>, <b>Diseño ▸ Patrón de diapositivas</b> e <b>Inicio ▸ Diseño</b>.', 900, 430, 300, 140, { fontSize: 21, color: GREY, lineHeight: 1.45 })],
        notes: 'Piensa el diseño por capas: el tema manda sobre el patrón, el patrón sobre los diseños y el diseño sobre cada diapositiva. Así, un cambio bien hecho arriba ahorra cien cambios abajo.' },

        { layout: 'blank', bg: '#ffffff', extra: [...head('DISEÑO ▸ COLORES · DISEÑO ▸ FUENTES', 'Nueve paletas y ocho parejas de letras'),
          ...PAL.flatMap(([k, l], i) => { const y = 196 + i * 50, p = PALETTES[k];
            return [text(l, 90, y, 200, 40, { fontSize: 20, color: INK, vAlign: 'middle' }), R(296, y + 6, 28, 28, p.bg, { stroke: LINE, strokeWidth: 2 }),
              ...p.accents.map((c, j) => E(336 + j * 36, y + 6, 28, 28, c))]; }),
          ...FONTS.map(([k, l, f], i) => text(`<span style="font-family:${pairStacks(k).heading};font-size:28px">${l}</span>  <span style="color:${GREY}">${f}</span>`,
            640, 192 + i * 56, 560, 50, { fontSize: 18, color: INK, vAlign: 'middle' }))],
        notes: 'A la izquierda, las nueve paletas de Diseño ▸ Colores (el fondo y sus seis colores). A la derecha, las ocho parejas de Diseño ▸ Fuentes, cada una escrita con su propia letra de títulos.' },

        { layout: 'blank', bg: '#ffffff', extra: [...head('DISEÑO ▸ PATRÓN DE DIAPOSITIVAS', 'Un cambio, todas las diapositivas'),
          ...[['Abre <b>Diseño ▸ Patrón de diapositivas</b>.'], ['Cambia el fondo, el logo o un estilo de texto: cambia en todas.'], ['Añade un diseño con <b>Insertar diseño</b>, o un marcador con <b>Insertar marcador…</b>'], ['Vuelve con <b>Cerrar vista Patrón</b>.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 90, 200 + i * 100, 500, INK, INK, { size: 22, h: 80 }), 'fade-right', i ? 'afterPrev' : 'click')),
          ...mini(660, 200, 300, '#ffffff', [['rect', 0, 0, 1, 0.08, '#3f6497'], ['rect', 0.08, 0.2, 0.6, 0.12, '#cfd8e6'], ['ellipse', 0.86, 0.8, 0.08, 0.14, '#e0873b']]),
          text('Patrón', 660, 376, 300, 34, { fontSize: 18, color: GREY, textAlign: 'center' }),
          R(800, 410, 4, 40, '#bbbbbb'), R(700, 450, 404, 4, '#bbbbbb'),
          ...[0, 1, 2].flatMap(i => [R(700 + i * 200, 450, 4, 30, '#bbbbbb'),
            ...mini(612 + i * 200, 484, 180, '#ffffff', [['rect', 0, 0, 1, 0.08, '#3f6497'], ...[[['rect', 0.15, 0.35, 0.7, 0.2, '#cfd8e6']], [['rect', 0.08, 0.2, 0.84, 0.1, '#cfd8e6'], ['rect', 0.08, 0.38, 0.84, 0.45, '#eef1f6']], [['rect', 0.08, 0.2, 0.84, 0.1, '#cfd8e6'], ['rect', 0.08, 0.38, 0.4, 0.45, '#eef1f6'], ['rect', 0.52, 0.38, 0.4, 0.45, '#eef1f6']]][i], ['ellipse', 0.86, 0.8, 0.08, 0.14, '#e0873b']]),
            text(['Portada', 'Título y contenido', 'Dos contenidos'][i], 612 + i * 200, 592, 180, 30, { fontSize: 16, color: GREY, textAlign: 'center' })]),
          text('La barra azul y el punto naranja están en el patrón: salen en todos sus diseños.', 640, 630, 560, 64, { fontSize: 18, color: GREY })],
        notes: 'El árbol de la derecha es el patrón con tres de sus diseños: lo que pongas en el patrón (la barra, el logo) sale en todos. Cada diseño añade sus propios marcadores.' },

        { layout: 'blank', bg: '#ffffff', extra: [...head('COLOR CON CABEZA', 'Que se lea: el contraste'),
          ...[['#ffffff', '#111111'], ['#3f6497', '#ffffff'], ['#1e3320', '#f4f8f1'], ['#767676', '#ffffff'], ['#f6c445', '#ffffff'], ['#ff8fab', '#f3eefe']].map(([fg, bg], i) => {
            const r = contrast(fg, bg), ok = parseFloat(r.replace(',', '.')) >= 4.5;
            return text(`<div style="font-family:${HE};font-size:34px;color:${fg}">Aa Texto</div><div style="margin-top:10px;font-size:18px;color:${ok ? '#2e7d32' : '#c62828'};font-weight:700">${ok ? '✓' : '✗'} ${r} : 1</div>`,
              90 + (i % 3) * 250, 200 + Math.floor(i / 3) * 210, 230, 180, { bg, radius: 14, pad: [22, 22, 22, 22], borderColor: LINE, fontSize: 18 }); }),
          text('Para texto normal, busca <b>4,5 : 1</b> o más. Revela te avisa en la ventana del tema si el texto apenas se lee sobre su fondo.', 880, 200, 320, 200, { fontSize: 22, color: INK, lineHeight: 1.5 }),
          text('<b>Diseño ▸ Kit de marca</b>: los colores, las fuentes y el logo de tu centro o empresa, guardados para reutilizarlos.', 880, 420, 320, 200, { fontSize: 20, color: GREY, lineHeight: 1.5 })],
        notes: 'Las cifras de contraste se calculan con la fórmula de accesibilidad WCAG a partir de los dos colores de cada muestra. El amarillo sobre blanco y el rosa sobre lila no llegan.' },

        { layout: 'blank', bg: '#ffffff', extra: [...head('INSERTAR ▸ TEXT ART', 'Letras con efectos'),
          ...[['fill', '#ffffff', 'relleno'], ['outline', '#ffffff', 'contorno'], ['shadow', '#ffffff', 'sombra'], ['gradient', '#ffffff', 'degradado'], ['neon', '#14121f', 'neón'], ['gold', '#1b1712', 'oro']].map(([wa, bg, l], i) => {
            const x = 90 + (i % 3) * 230, y = 196 + Math.floor(i / 3) * 210;
            return [R(x, y, 210, 190, bg, { stroke: LINE, strokeWidth: 2 }), text('Arte', x + 10, y + 26, 190, 100, { fontFamily: HE, fontSize: 64, textAlign: 'center', wordart: wa, ...(wa === 'gradient' && { wordartColor: '#d1495b' }) }),
              text(l, x + 10, y + 138, 190, 34, { fontSize: 18, color: bg === '#ffffff' ? GREY : '#d8d2c4', textAlign: 'center' })]; }).flat(),
          E(860, 210, 300, 300, '#111111'),
          text('HECHO CON REVELA · HECHO CON REVELA · ', 840, 190, 340, 340, { fontSize: 22, curve: 100, color: '#111111', textAlign: 'center', fontWeight: 700, letterSpacing: 3 }),
          text('Aa', 860, 300, 300, 120, { fontFamily: HE, fontSize: 92, textAlign: 'center', vAlign: 'middle', wordart: 'gold' }),
          text('Texto curvo: <b>Cuadro de texto ▸ Efectos de texto ▸ Curvar texto</b>', 820, 560, 380, 80, { fontSize: 18, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Seis estilos de Text Art; con «Color del efecto» cambias el color del neón, del relleno o del degradado. El sello de la derecha es un texto curvo al cien por cien alrededor de un círculo.' },

        { layout: 'blank', bg: '#ffffff', extra: [...head('DISEÑO ▸ IDEAS DE DISEÑO', 'El mismo contenido, tres composiciones'),
          ...[[[['rect', 0.06, 0.18, 0.4, 0.1, '#111111'], ['rect', 0.06, 0.36, 0.36, 0.05, '#bbbbbb'], ['rect', 0.06, 0.46, 0.3, 0.05, '#bbbbbb'], ['rect', 0.52, 0, 0.48, 1, '#3bb3c3']]],
            [[['rect', 0, 0, 1, 1, '#3f6497'], ['rect', 0.08, 0.62, 0.55, 0.12, '#ffffff'], ['rect', 0.08, 0.8, 0.35, 0.05, '#cfd8e6']]],
            [[['rect', 0.25, 0.14, 0.5, 0.1, '#111111'], ['ellipse', 0.17, 0.42, 0.12, 0.22, '#e0873b'], ['ellipse', 0.44, 0.42, 0.12, 0.22, '#4caf7d'], ['ellipse', 0.71, 0.42, 0.12, 0.22, '#8e6cc9'],
              ['rect', 0.14, 0.74, 0.18, 0.04, '#bbbbbb'], ['rect', 0.41, 0.74, 0.18, 0.04, '#bbbbbb'], ['rect', 0.68, 0.74, 0.18, 0.04, '#bbbbbb']]]].flatMap(([parts], i) =>
            together([...mini(90 + i * 380, 220, 340, '#ffffff', parts), text(['Texto y foto', 'Foto a sangre', 'Tres ideas con iconos'][i], 90 + i * 380, 420, 340, 36, { fontSize: 20, color: INK, textAlign: 'center' })], 'zoom-in', i ? 'afterPrev' : 'click')),
          text('<b>Diseño ▸ Ideas de diseño</b> propone composiciones para la diapositiva que tienes delante (escribe antes su título). <b>Diseño ▸ Diseñar plantilla con IA</b> te propone tres diseños completos de la plantilla.', 90, 500, 1100, 110, { fontSize: 22, color: INK, lineHeight: 1.5 })],
        notes: 'Tres propuestas de composición para el mismo contenido, como las que ofrece Ideas de diseño. Elige la que mejor cuente lo que quieres decir.' },

        { layout: 'blank', bg: SOFT, transition: 'fade', extra: [...head('PARA TERMINAR', 'Cuatro reglas de oro'),
          ...[['Contraste', 'lo importante, que destaque', [['rect', 0, 0, 0.3, 1, '#dddddd'], ['rect', 0.38, 0, 0.62, 1, '#111111']]],
            ['Alineación', 'todo, sobre líneas invisibles', [['rect', 0, 0, 0.9, 0.22, '#111111'], ['rect', 0, 0.38, 0.6, 0.22, '#888888'], ['rect', 0, 0.76, 0.75, 0.22, '#888888']]],
            ['Repetición', 'los mismos colores y estilos', [['ellipse', 0, 0.2, 0.26, 0.6, '#d1495b'], ['ellipse', 0.37, 0.2, 0.26, 0.6, '#d1495b'], ['ellipse', 0.74, 0.2, 0.26, 0.6, '#d1495b']]],
            ['Proximidad', 'junto lo que va junto', [['rect', 0, 0, 0.2, 0.4, '#3f6497'], ['rect', 0.24, 0, 0.2, 0.4, '#3f6497'], ['rect', 0.66, 0.6, 0.2, 0.4, '#4caf7d'], ['rect', 0.8, 0.6, 0.2, 0.4, '#4caf7d']]]]
            .flatMap(([t, d, parts], i) => { const x = 90 + (i % 2) * 560, y = 200 + Math.floor(i / 2) * 230;
              return together([RR(x, y, 530, 200, '#ffffff', 16, { stroke: LINE, strokeWidth: 2 }), ...parts.map(([k, a, b, c, h, f]) => shape(k, x + 30 + a * 150, y + 50 + b * 100, c * 150, h * 100, f)),
                text(`<b style="font-family:${HE};font-size:30px">${t}</b><br>${d}`, x + 210, y + 40, 300, 120, { fontSize: 21, color: INK, lineHeight: 1.4, vAlign: 'middle' })], 'fade-up', i ? 'afterPrev' : 'click'); })],
        notes: 'Cuatro principios clásicos del diseño gráfico, con un dibujo mínimo de cada uno. Repásalos antes de dar una presentación por terminada.' },
      ]));
    } },

  // ============================================================================
  // 10 · Exporting, as an airport departures board: split-flap rows that turn
  //      over, which format for what, a PDF boarding pass, PowerPoint and ODP,
  //      a film strip for video, the web and the classroom, notes pages, the
  //      keyboard shortcuts for the trip and a last vote.
  learn_revela_export: { name: 'Exportar y llevártelo', cat: 'showcase',
    summary: 'Un panel de salidas: PDF, PowerPoint, vídeo, página web, SCORM, imprimir con notas y atajos de teclado, con votación final',
    make: () => {
      const BOARD = '#0e0e10', FLAP = '#1c1c21', YEL = '#ffcc33', W = '#f2f2f2', GREY = '#8e8e96', GREEN = '#3ddc84', RED = '#ff5a5f', BLUE = '#5aa9ff', LINE = '#2c2c33';
      const HM = pairStacks('modern').heading, MONO = "'Courier New', 'Liberation Mono', Courier, monospace";
      // A split-flap cell: dark plate, a thin line through the middle and the text in yellow capitals.
      const flap = (t, x, y, w, c = YEL, size = 24) => [RR(x, y, w, 54, FLAP, 6), text(`<b>${t}</b>`, x + 12, y, w - 24, 54, { fontFamily: MONO, fontSize: size, color: c, vAlign: 'middle', letterSpacing: 2 }), R(x, y + 26, w, 2, '#000000', { opacity: 60 })];
      const head = (k, t, w = 1100) => [kicker(k, 90, 50, 800, YEL), text(t, 86, 82, w, 70, { fontFamily: HM, fontSize: 44, color: W, fontWeight: 700 })];
      const strip = svgURL(1100, 260, `<rect width="1100" height="260" fill="#111"/>` + Array.from({ length: 28 }, (_, i) => `<rect x="${10 + i * 39.3}" y="12" width="22" height="20" rx="3" fill="#2b2b2b"/><rect x="${10 + i * 39.3}" y="228" width="22" height="20" rx="3" fill="#2b2b2b"/>`).join('')
        + [['#0e0e10', YEL], ['#f4efe6', '#d9472b'], ['#06172a', '#ffb547'], ['#12052a', '#f15bb5'], ['#ffffff', '#111111']].map(([bg, ac], i) => { const x = 20 + i * 216;
          return `<rect x="${x}" y="46" width="196" height="168" rx="4" fill="${bg}"/><rect x="${x + 18}" y="80" width="110" height="16" rx="6" fill="${ac}"/><rect x="${x + 18}" y="110" width="150" height="9" rx="4" fill="${ac}" opacity=".45"/>`
            + `<rect x="${x + 18}" y="128" width="130" height="9" rx="4" fill="${ac}" opacity=".3"/><circle cx="${x + 160}" cy="176" r="18" fill="${ac}" opacity=".7"/>`; }).join(''));
      const page = svgURL(420, 594, `<rect width="420" height="594" fill="#ffffff"/><rect x="40" y="40" width="340" height="191" fill="#0e0e10"/><rect x="62" y="80" width="150" height="18" rx="6" fill="${YEL}"/>`
        + `<rect x="62" y="112" width="220" height="9" rx="4" fill="#666"/><rect x="62" y="130" width="190" height="9" rx="4" fill="#555"/>` + T(40, 270, 16, '#999', 'Diapositiva 3')
        + Array.from({ length: 9 }, (_, i) => `<rect x="40" y="${296 + i * 30}" width="${[340, 320, 330, 280, 340, 300, 250, 330, 200][i]}" height="10" rx="5" fill="#d0d0d0"/>`).join(''), '#ffffff');

      return numbered(inkColor(build({ name: 'Salidas: exportar', palette: 'midnight', fonts: 'modern', title: { color: W, size: 44 }, body: { color: W } }, [
        { layout: 'blank', bg: BOARD, transition: 'fade', extra: [
          icon('plane', 90, 52, 48, YEL),
          text('Exportar y llevártelo', 156, 40, 800, 74, { fontFamily: HM, fontSize: 50, color: W, fontWeight: 800, vAlign: 'middle' }),
          text('SALIDAS', 980, 54, 210, 50, { fontFamily: MONO, fontSize: 30, color: YEL, textAlign: 'right', fontWeight: 700, letterSpacing: 4 }),
          ...[['DESTINO', 90], ['BOTÓN EN ARCHIVO', 360], ['PUERTA', 820], ['ESTADO', 950]].map(([t, x]) => text(t, x, 140, 300, 30, { fontSize: 16, color: GREY, letterSpacing: 3, fontWeight: 700 })),
          ...[['PDF', 'EXPORTAR PDF', 'A1', 'EMBARCANDO', GREEN], ['POWERPOINT', 'EXPORTAR POWERPOINT', 'A2', 'A TIEMPO', YEL], ['VÍDEO', 'EXPORTAR VÍDEO', 'B1', 'A TIEMPO', YEL],
            ['WEB', 'EXPORTAR HTML', 'B2', 'A TIEMPO', YEL], ['MOODLE', 'EXPORTAR SCORM', 'C1', 'A TIEMPO', YEL], ['PAPEL', 'DOCUMENTOS Y NOTAS', 'C2', 'ÚLTIMA LLAMADA', RED]]
            .flatMap(([d, b, g, e, c], i) => { const y = 180 + i * 68;
              return together([...flap(d, 90, y, 260), ...flap(b, 360, y, 450, W, 21), ...flap(g, 820, y, 120), ...flap(e, 950, y, 240, c, 20)], 'flip', 'afterPrev', { duration: 500, delay: i ? 0 : 300, ...(i ? {} : { sound: 'click' }) }); }),
          text('Todos los botones están en la pestaña Archivo, en el grupo «Salida». Y al final, los atajos de teclado para el viaje.', 90, 600, 1100, 70, { fontSize: 21, color: GREY, lineHeight: 1.4 })],
        notes: 'Las filas del panel se dan la vuelta solas al llegar, una detrás de otra (efecto Voltear, Después de la anterior). Cada destino es una forma de sacar la presentación de Revela.' },

        { layout: 'blank', bg: BOARD, extra: [...head('¿A DÓNDE VAS?', 'Qué formato necesito'),
          tableBlock({ x: 90, y: 180, w: 1100, h: 480, fontSize: 22, header: true, headBg: YEL, headFg: '#111111', stroke: LINE, banded: true, band: FLAP, color: W, colW: [4, 1.6, 4],
            rows: [['Si quieres…', 'Formato', 'Botón'], ['Enviarla por correo o imprimirla', 'PDF', 'Archivo ▸ Exportar PDF'], ['Seguir editándola en PowerPoint', '.pptx', 'Archivo ▸ Exportar PowerPoint'],
              ['Abrirla en LibreOffice u OnlyOffice', '.odp', 'Archivo ▸ Exportar ODP'], ['Ponerla en redes o en una pantalla', 'MP4 o GIF', 'Archivo ▸ Exportar vídeo'],
              ['Abrirla en cualquier navegador', 'HTML', 'Archivo ▸ Exportar HTML'], ['Subirla a Moodle con nota', 'SCORM', 'Archivo ▸ Exportar SCORM'],
              ['Estudiar con fichas', 'Página web', 'Archivo ▸ Fichas y práctica'], ['Una imagen por diapositiva', 'PNG o JPG', 'Archivo ▸ Exportar imágenes']] })],
        notes: 'Una tabla para decidir rápido. Si dudas, el PDF es el formato que abre todo el mundo; el PowerPoint, el que permite que otra persona siga editando.' },

        { layout: 'blank', bg: BOARD, extra: [...head('PUERTA A1', 'PDF: la tarjeta de embarque'),
          RR(90, 190, 560, 300, '#f6f3ea', 18, { shadow: { x: 0, y: 10, blur: 24, color: '#00000088' } }), E(574, 170, 40, 40, BOARD), E(574, 470, 40, 40, BOARD), R(593, 214, 2, 252, '#c9c3b4'),
          text('TARJETA DE EMBARQUE', 120, 210, 440, 34, { fontFamily: MONO, fontSize: 18, color: '#8a8270', letterSpacing: 3, fontWeight: 700 }),
          ...[['PASAJERO', 'Tu presentación'], ['DESTINO', 'PDF'], ['ASIENTO', 'Una página por diapositiva']].map(([k, v], i) =>
            text(`<span style="font-size:14px;color:#8a8270;letter-spacing:2px">${k}</span><br><b>${v}</b>`, 120, 256 + i * 70, 440, 64, { fontSize: 24, color: '#1b1a17', lineHeight: 1.3 })),
          text('<b>A1</b>', 600, 290, 40, 90, { fontFamily: MONO, fontSize: 22, color: '#1b1a17', textAlign: 'center' }),
          ...[['Pulsa <b>Archivo ▸ Exportar PDF</b>.'], ['Elige <b>Con el texto seleccionable</b>: se puede buscar, copiar y leer en voz alta.'], ['O <b>Solo imágenes</b>, si nadie debe copiar el texto.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 700, 200 + i * 100, 500, YEL, W, { size: 22, h: 80, numColor: '#111111' }), 'fade-left', i ? 'afterPrev' : 'click')),
          card('Una página por diapositiva, exactamente como se ve: 3D, fórmulas y efectos incluidos.', 90, 530, 1100, 90, FLAP, { fontSize: 22, color: W, radius: 14, vAlign: 'middle', borderColor: LINE })],
        notes: 'El PDF se crea en el propio navegador, sin ventana de impresión: también funciona en el móvil. Recomendado: con el texto seleccionable.' },

        { layout: 'blank', bg: BOARD, extra: [...head('PUERTAS A2 Y A3', 'PowerPoint y ODP'),
          ...[['.pptx', 'Archivo ▸ Exportar PowerPoint', 'Textos, formas, tablas y gráficos editables, con sus notas, animaciones y Transformar.', '#e97132'],
            ['.odp', 'Archivo ▸ Exportar ODP', 'OpenDocument, para seguir en LibreOffice u OnlyOffice.', BLUE]].flatMap(([ext, b, d, c], i) => { const x = 90 + i * 560;
            return together([RR(x, 190, 530, 270, FLAP, 18, { stroke: c, strokeWidth: 2 }), text(`<b>${ext}</b>`, x + 30, 214, 300, 90, { fontFamily: MONO, fontSize: 64, color: c }),
              text(b, x + 30, 316, 470, 40, { fontSize: 22, color: W, fontWeight: 700 }), text(d, x + 30, 366, 470, 100, { fontSize: 21, color: GREY, lineHeight: 1.45 })], 'fade-up', i ? 'afterPrev' : 'click'); }),
          card('<b style="color:' + YEL + '">Equipaje especial</b> · Lo que PowerPoint no tiene (modelos 3D, iconos, ecuaciones, votaciones) viaja como imagen: se ve igual, pero no se edita allí.', 90, 500, 1100, 110, '#1a1a1f', { fontSize: 22, color: W, radius: 14, lineHeight: 1.45, vAlign: 'middle', borderColor: LINE })],
        notes: 'Exportar a PowerPoint es la mejor opción si otra persona va a seguir editando. Comprueba en PowerPoint las diapositivas con 3D o con votaciones: allí son imágenes.' },

        { layout: 'blank', bg: BOARD, extra: [...head('PUERTA B1', 'Vídeo: MP4 o GIF animado'),
          withAnims(img(strip, 90, 180, 1100, 260, 'Tira de película con cinco diapositivas'), A('wipe', { dir: 'right', start: 'afterPrev', duration: 1600 })),
          ...[['Archivo ▸ Exportar vídeo', 'y elige MP4 o GIF animado.'], ['Segundos por diapositiva', 'para las que no tienen avance automático.'], ['Animaciones y 3D', 'salen como imagen fija; entre diapositivas, un fundido.']]
            .map(([t, d], i) => text(`<b style="color:${YEL}">${t}</b><br>${d}`, 90 + i * 375, 470, 350, 110, { fontSize: 21, color: W, lineHeight: 1.45 })),
          text('Para MP4, usa Chrome o Edge. El tiempo de cada diapositiva se marca en Transiciones ▸ Avance automático (s).', 90, 600, 1100, 60, { fontSize: 20, color: GREY, lineHeight: 1.4 })],
        notes: 'La tira de película se desvela sola con un barrido de izquierda a derecha. El vídeo se hace en el navegador y tarda unos minutos: Revela te dice cuántos segundos durará.' },

        { layout: 'blank', bg: BOARD, extra: [...head('PUERTAS B2 Y C1', 'La web y el aula'),
          ...[['globe', 'Archivo ▸ Exportar HTML', 'Un archivo que se abre en cualquier navegador o que subes a la web del centro.', BLUE],
            ['school', 'Archivo ▸ Exportar SCORM', 'Para Moodle o Canvas: cada alumno la recorre a su ritmo y la plataforma recibe su nota.', GREEN],
            ['book-open', 'Archivo ▸ Fichas y práctica', 'Una página para estudiar: fichas que se dan la vuelta y práctica, también sin internet.', YEL],
            ['download', 'Archivo ▸ Exportar preguntas', 'Los cuestionarios como banco de preguntas: Moodle XML, GIFT, Kahoot (Excel) o CSV.', RED]].map(([ic, t, d, c], i) => {
            const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 230;
            return together([RR(x, y, 530, 200, FLAP, 16, { stroke: LINE, strokeWidth: 2 }), icon(ic, x + 28, y + 28, 46, c), text(t, x + 94, y + 26, 410, 50, { fontSize: 22, color: W, fontWeight: 700, vAlign: 'middle' }),
              text(d, x + 28, y + 92, 474, 90, { fontSize: 20, color: GREY, lineHeight: 1.45 })], 'zoom-in', i ? 'afterPrev' : 'click', { duration: 350 }); }).flat()],
        notes: 'Cuatro salidas para la escuela: la página web, el paquete SCORM con nota, las fichas para estudiar y el banco de preguntas para Moodle o Kahoot.' },

        { layout: 'blank', bg: BOARD, extra: [...head('PUERTA C2 · ÚLTIMA LLAMADA', 'Imprimir con tus notas', 740),
          withAnims(img(page, 860, 120, 300, 424, 'Página de notas: la diapositiva arriba y sus notas debajo', { shadow: { x: 0, y: 12, blur: 24, color: '#00000099' }, rotation: 3 }), A('fade-up', { start: 'afterPrev', duration: 800 })),
          ...[['Pulsa <b>Archivo ▸ Documentos y notas</b>.'], ['Elige <b>Páginas de notas</b>: la diapositiva arriba y tus notas debajo.'], ['O varias diapositivas por página, para repartir al público.'], ['Imprime, o guarda como PDF desde el navegador.']]
            .flatMap(([t], i) => together(stepRow(i + 1, t, 90, 200 + i * 96, 700, YEL, W, { size: 23, h: 78, numColor: '#111111' }), 'fade-right', i ? 'afterPrev' : 'click')),
          text('¿Solo las diapositivas? <b>Archivo ▸ Imprimir</b>.', 90, 600, 700, 50, { fontSize: 21, color: GREY })],
        notes: 'Las páginas de notas son tu chuleta en papel: llévalas aunque presentes con la vista del moderador, por si falla algo.' },

        { layout: 'blank', bg: BOARD, extra: [...head('PARA EL VIAJE', 'Atajos de teclado útiles'),
          ...[['Ctrl + S', 'Guardar'], ['Ctrl + Z', 'Deshacer'], ['Ctrl + Y', 'Rehacer'], ['Ctrl + D', 'Duplicar'], ['Ctrl + M', 'Nueva diapositiva'], ['Ctrl + G', 'Agrupar'],
            ['Ctrl + K', 'Buscar comandos'], ['Ctrl + F', 'Buscar y reemplazar'], ['F5', 'Presentar'], ['Mayús + F5', 'Desde esta diapositiva']].flatMap(([k, l], i) => {
            const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 82;
            return [key(k, x, y, 170, { fontSize: k.length > 8 ? 18 : 21 }), text(l, x + 190, y, 340, 52, { fontSize: 23, color: W, vAlign: 'middle' })]; }),
          text('La lista completa: <b>Ver ▸ Atajos</b>. En Mac, Ctrl es ⌘.', 90, 610, 1100, 44, { fontSize: 21, color: GREY })],
        notes: 'Diez atajos que ahorran tiempo cada día. Ctrl + K abre el buscador de comandos: escribe lo que quieres hacer («exportar», «tabla»…) y Revela te lleva al botón.' },

        { layout: 'blank', bg: BOARD, transition: 'fade', extra: [
          pollBlock({ kind: 'choice', fontSize: 28, x: 70, y: 50, w: 1140, h: 520, display: 'bar', color: W, question: '¿Qué formato vas a usar más?', options: ['PDF', 'PowerPoint', 'Vídeo', 'Página web o SCORM'] }),
          ...flap('BUEN VIAJE', 90, 600, 300), ...flap('PUERTA CERRADA', 410, 600, 360, RED, 22), ...flap('FIN', 790, 600, 120, GREEN)],
        notes: 'Votación final en directo: el público responde con el móvil. Comenta el resultado y recuerda dónde está cada botón.' },
      ]), W));
    } },
};
