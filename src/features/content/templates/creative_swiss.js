// Example presentations: Estilo suizo (tipográfico internacional). Each one: { name, summary, cat: 'creative', make() } → a deck
// (see kit.js for the builders). Ten subjects, ten readings of the style: grids, big type, asymmetry, white space, one strong colour.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ------------------------------------------------------
// Fonts of the catalogue (their stacks, so the editor and the export load them).
const FF = {
  oswald: "'Oswald', sans-serif", inter: "'Inter', sans-serif", work: "'Work Sans', sans-serif", fira: "'Fira Sans', sans-serif",
  space: "'Space Grotesk', sans-serif", rubik: "'Rubik', sans-serif", raleway: "'Raleway', sans-serif", ubuntu: "'Ubuntu', sans-serif",
  dm: "'DM Sans', sans-serif", mono: "'JetBrains Mono', monospace", helv: "'Helvetica Neue', Helvetica, sans-serif",
  roboto: "'Roboto', sans-serif", merri: "'Merriweather', serif", mont: "'Montserrat', sans-serif", lora: "'Lora', serif",
};
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
const withId = (b, id) => ({ ...b, id });
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// A line of type: html, box, size, colour, family (and more props).
const T = (html, x, y, w, h, size, color, font, p = {}) => text(html, x, y, w, h, { fontSize: size, color, fontFamily: font, ...p });
// The columns of a grid, as hairlines (Swiss posters show their skeleton).
const cols = (n, x0, x1, color, opacity = 18, y = 0, h = 720) => Array.from({ length: n + 1 }, (_, i) => R(Math.round(x0 + (x1 - x0) * i / n), y, 1, h, color, { opacity }));
// An SVG picture as a data URL, and an image object.
const svgURL = (w, h, inner, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg === 'none' ? '' : `<rect width="${w}" height="${h}" fill="${bg}"/>`}${inner}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const S = (x, y, s, fill, str, extra = '', ff = 'Helvetica, Arial, sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
// The credits of the CC BY models of a deck, in one small line.
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 40, { fontSize: 12, color });
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });

export default {

  // ============================================================================
  // 1 · A film festival's programme: black screen, one cinema red, a giant edition number that becomes a band (Transform).
  creative_swiss_film: { name: 'Festival de cine: el programa', cat: 'creative',
    summary: 'Suizo en negro y rojo: número gigante que se vuelve banda con Transformar, secciones en rejilla, tabla, barras, votación y cuenta atrás',
    make: () => {
      const BG = '#0b0b0b', RED = '#ff3b1f', W = '#f4f2ec', G = '#8d8a83', FRAME = uid(), NUM = uid(), NAME = uid();
      const OS = FF.oswald;
      const frame = (x, y, w, h) => withId(R(x, y, w, h, RED), FRAME);
      const num = (x, y, w, h, size, color = BG) => withId(T('14', x, y, w, h, size, color, OS, { fontWeight: 700, lineHeight: 0.8, letterSpacing: -8 }), NUM);
      const fname = (x, y, w, h, size) => withId(T('FESTIVAL DE CINE<br>DE ORILLA', x, y, w, h, size, W, OS, { fontWeight: 700, lineHeight: 0.95 }), NAME);
      const label = (t, x, y, w, color = RED) => T(t, x, y, w, 30, 18, color, FF.roboto, { letterSpacing: 4, fontWeight: 700 });
      // The opening film's still: sea, a low red sun, a pier (an SVG of its own).
      const still = svgURL(960, 400, `<rect width="960" height="400" fill="#141414"/><rect y="250" width="960" height="150" fill="#1f1f1f"/>`
        + `<circle cx="640" cy="250" r="120" fill="${RED}"/><rect y="250" width="960" height="150" fill="#1b1b1b" opacity="0.92"/>`
        + Array.from({ length: 9 }, (_, i) => `<rect x="${380 + i * 6}" y="${270 + i * 14}" width="${520 - i * 40}" height="3" fill="${RED}" opacity="${0.7 - i * 0.07}"/>`).join('')
        + `<rect x="0" y="236" width="300" height="10" fill="#d9d6cf"/>` + Array.from({ length: 6 }, (_, i) => `<rect x="${20 + i * 52}" y="246" width="8" height="60" fill="#d9d6cf"/>`).join('')
        + `<rect x="250" y="196" width="8" height="40" fill="#d9d6cf"/><circle cx="254" cy="190" r="7" fill="#d9d6cf"/>`, '#141414');
      return numbered(build({ name: 'Festival de Cine de Orilla', palette: 'revela', fonts: 'bold', title: { color: W } }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          ...cols(6, 60, 1220, W, 10),
          T('PROGRAMA OFICIAL · 9—18 OCTUBRE 2026', 40, 60, 40, 600, 16, G, FF.roboto, { vertical: true, rotation: 180, letterSpacing: 6, fontWeight: 700 }),
          at(frame(640, 0, 640, 720), 'fade-left', { start: 'afterPrev', duration: 700, sound: 'whoosh' }),
          at(num(660, 150, 600, 520, 560), 'fade-up', { start: 'afterPrev', duration: 700 }),
          label('14.ª EDICIÓN', 120, 80, 400),
          fname(116, 120, 520, 180, 70),
          T('9—18 octubre 2026', 120, 330, 500, 60, 40, W, OS),
          T('112 películas<br>38 países<br>6 salas', 120, 470, 300, 150, 26, G, FF.roboto, { lineHeight: 1.4 }),
          R(120, 420, 60, 6, RED)],
          notes: 'Portada a la suiza: rejilla de seis columnas a la vista, todo alineado a la izquierda y un único color fuerte. El bloque rojo y el número entran solos al empezar (con sonido de barrido). Datos del festival inventados para la plantilla.' },
        { layout: 'blank', bg: BG, autoAnimate: true, transition: 'none', extra: [
          ...cols(6, 60, 1220, W, 10),
          frame(0, 0, 1280, 230),
          num(40, 20, 300, 200, 220),
          fname(360, 66, 700, 120, 46),
          ...[['112', 'películas en competición y fuera de ella'], ['38', 'países, de Islandia a Senegal'], ['6', 'salas y una pantalla en la playa'], ['41', 'estrenos en España']].map(([n, l], i) =>
            at(T(`<div style="font-family:${OS};font-size:120px;font-weight:700;line-height:1;color:${i === 0 ? RED : W}">${n}</div><div style="margin-top:14px;border-top:2px solid ${W};padding-top:12px">${l}</div>`,
              60 + i * 290, 300, 260, 340, 24, G, FF.roboto), 'fade-up', { start: i ? 'afterPrev' : 'click', delay: i ? 80 : 0, duration: 450 }))],
          notes: 'Transformar: el bloque rojo de la portada se encoge hasta ser una banda y el 14 viaja a la esquina (mismos objetos en las dos diapositivas). Con un clic entran las cuatro cifras en cadena. Cifras de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          T('Seis secciones', 60, 50, 700, 80, 64, W, OS, { fontWeight: 700 }),
          T('Cada una con su jurado, su sala y su color de entrada.', 60, 140, 700, 40, 24, G, FF.roboto),
          ...[['01', 'Sección Oficial', 'Dieciséis largometrajes optan a la Concha de Sal.'], ['02', 'Nuevos Directores', 'Óperas primas y segundas películas.'], ['03', 'Orilla Documental', 'Lo real, contado con mirada de autor.'],
            ['04', 'Cine en la Playa', 'Proyecciones gratuitas al anochecer.'], ['05', 'Retrospectiva', 'Cine mudo restaurado, con música en directo.'], ['06', 'Orilla Joven', 'Un jurado de 50 estudiantes de 16 a 19 años.']]
            .flatMap(([n, t, d], i) => { const x = 60 + (i % 3) * 390, y = 230 + Math.floor(i / 3) * 230;
              return [at(R(x, y, 360, 3, i === 0 ? RED : W), 'fade-right', { start: i % 3 ? 'afterPrev' : 'click', duration: 300 }),
                at(T(`<span style="color:${RED};font-family:${OS};font-weight:700">${n}</span><br><b style="font-size:32px;color:${W}">${t}</b><br>${d}`, x, y + 16, 360, 190, 22, G, FF.roboto, { lineHeight: 1.35 }), 'fade-up', { start: 'withPrev', duration: 400 })]; })],
          notes: 'Rejilla de tres por dos: cada clic monta una fila y sus tres secciones entran encadenadas. La línea roja marca la sección principal.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          R(0, 0, 360, 720, '#151515'),
          T('SÁBADO', 60, 60, 280, 60, 40, RED, OS, { fontWeight: 700, letterSpacing: 4 }),
          T('10', 54, 100, 280, 240, 230, W, OS, { fontWeight: 700, lineHeight: 0.9 }),
          T('OCT', 60, 330, 280, 60, 40, RED, OS, { fontWeight: 700, letterSpacing: 4 }),
          T('Un día cualquiera del festival: siete pases en cuatro salas, de las diez de la mañana a la medianoche.', 60, 440, 260, 200, 20, G, FF.roboto, { lineHeight: 1.45 }),
          tableBlock({ x: 410, y: 60, w: 810, h: 600, fontSize: 21, header: true, lines: true, headBg: RED, headFg: BG, stroke: '#4a4a4a', colW: [2, 3, 7, 4], fontFamily: FF.roboto,
            rows: [['Hora', 'Sala', 'Película', 'Sección'], ['10:00', 'Teatro Mar', 'Los relojes de arena', 'Nuevos Directores'], ['12:30', 'Sala 2', 'Cartas desde el faro', 'Orilla Documental'],
              ['16:00', 'Teatro Mar', 'El último tranvía', 'Sección Oficial'], ['17:45', 'Sala 3', 'Amanecer (1927, restaurada)', 'Retrospectiva'], ['19:30', 'Sala 2', 'La casa de las grullas', 'Sección Oficial'],
              ['21:30', 'Playa Norte', 'Verano azul marino', 'Cine en la Playa'], ['23:59', 'Teatro Mar', 'Noche de cortos', 'Orilla Joven']] })],
          notes: 'Programa de un sábado en tabla de solo líneas horizontales, como un horario impreso. La columna izquierda, con la fecha gigante, deja respirar la tabla. Títulos inventados.' },
        { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
          label('PELÍCULA INAUGURAL · VIERNES 9 · 20:30 · TEATRO MAR', 60, 60, 1100),
          at(img(still, 60, 110, 960, 400, 'Fotograma: un sol rojo se pone sobre el mar junto a un embarcadero'), 'fade-in', { start: 'afterPrev', duration: 1200 }),
          T('La marea<br>de septiembre', 60, 540, 620, 150, 62, W, OS, { fontWeight: 700, lineHeight: 0.95 }),
          T('Dir. Inés Arranz<br>España · Portugal · 2026<br>104 min · VOSE', 720, 548, 300, 120, 20, G, FF.roboto, { lineHeight: 1.45 }),
          T('«Una película sobre lo que el mar devuelve y lo que se queda.»', 1060, 110, 160, 400, 24, W, FF.roboto, { fontStyle: 'italic', lineHeight: 1.35 }),
          R(1060, 540, 160, 6, RED)],
          notes: 'Fotograma dibujado en SVG (sol rojo, mar y embarcadero), con proporción de pantalla de cine. Aparece fundiéndose al llegar. Película y directora inventadas.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          T('Entradas vendidas', 60, 50, 700, 80, 56, W, OS, { fontWeight: 700 }),
          T('Miles de entradas por sección, edición de 2025', 60, 122, 700, 40, 22, G, FF.roboto),
          chartBlock({ x: 60, y: 190, w: 760, h: 470, chartType: 'hbar', color: RED, dataLabels: true, grid: false,
            data: [{ label: 'Oficial', value: 41 }, { label: 'Playa', value: 33 }, { label: 'Nuevos', value: 19 }, { label: 'Joven', value: 14 }, { label: 'Documental', value: 12 }, { label: 'Retrospectiva', value: 7 }] }),
          R(880, 190, 2, 470, '#3a3a3a'),
          at(T(`<div style="font-family:${OS};font-size:120px;font-weight:700;line-height:1;color:${RED}">126k</div><div style="margin-top:10px">entradas en total, un 18 % más que el año anterior</div>`, 920, 220, 300, 330, 24, W, FF.roboto), 'zoom-in', { duration: 600 })],
          notes: 'Barras horizontales con las etiquetas en la propia barra; la cifra total entra con un clic. Datos inventados para la plantilla.' },
        { layout: 'blank', bg: BG, transition: 'cover', extra: [
          R(0, 0, 420, 720, RED),
          T('VOTA', 50, 40, 340, 170, 140, BG, OS, { fontWeight: 700, lineHeight: 0.9 }),
          T('Premio del Público', 54, 220, 330, 120, 40, BG, OS, { fontWeight: 700, lineHeight: 1.05 }),
          T('Escanea el código con el móvil al salir de la sala. Un voto por persona y película.', 54, 520, 320, 140, 22, BG, FF.roboto, { lineHeight: 1.4 }),
          pollBlock({ fontSize: 30, display: 'bar', question: '¿Qué película de la Sección Oficial te ha emocionado más?', x: 470, y: 60, w: 750, h: 600,
            options: ['El último tranvía', 'La casa de las grullas', 'Los años de sal', 'Nadie mira al norte'] })],
          notes: 'Votación en directo: el público vota desde el móvil y las barras se actualizan solas. La franja roja hace de cartel de la votación.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          ...cols(6, 60, 1220, W, 10),
          R(0, 600, 1280, 120, RED),
          T('La primera sesión empieza en', 60, 70, 700, 60, 34, G, FF.roboto),
          timer(600, 60, 150, 760, { style: 'digital', color: W, h: 260, endText: '¡Se apagan las luces!' }),
          T('Apaga el móvil. Disfruta de la película.', 60, 450, 700, 60, 30, W, OS),
          T('festivalorilla.example · #Orilla26', 60, 630, 700, 50, 26, BG, OS, { fontWeight: 700, letterSpacing: 2 }),
          T('14', 900, 300, 320, 280, 240, '#1e1e1e', OS, { fontWeight: 700, textAlign: 'right', lineHeight: 0.85, decorative: true })],
          notes: 'Cuenta atrás digital de diez minutos para la proyección inaugural: arranca sola y avisa con sonido al terminar. Déjala en pantalla mientras entra el público.' },
      ]));
    } },


  // ============================================================================
  // 2 · A foundation's annual report: white paper, cobalt blue, a twelve-column grid, numbers that speak.
  creative_swiss_foundation: { name: 'Memoria anual de una fundación', cat: 'creative',
    summary: 'Suizo en blanco y azul cobalto: año gigante, carta a toda tinta, cifras en cadena, ecuación, dona, área, galones y cuentas con fórmulas',
    make: () => {
      const W = '#ffffff', BLUE = '#1f3fd1', INK = '#111827', GREY = '#6b7280', LINE = '#d9dce3', PALE = '#e8ecfb';
      const IN = FF.inter;
      const kicker = (t, x, y, w, color = BLUE) => T(t, x, y, w, 30, 16, color, IN, { fontWeight: 700, letterSpacing: 3 });
      const folio = (n, t, color = GREY) => [R(60, 664, 1160, 1, color, { opacity: 40 }), T(`${n} · ${t}`, 60, 672, 600, 30, 14, color, IN, { letterSpacing: 2 }),
        T('Fundación Alba · Memoria 2025', 820, 672, 400, 30, 14, color, IN, { textAlign: 'right', letterSpacing: 2 })];
      return numbered(build({ name: 'Fundación Alba · Memoria 2025', palette: 'office', fonts: 'clean', title: { color: INK, size: 48 } }, [
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          ...cols(12, 60, 1220, BLUE, 8),
          kicker('MEMORIA ANUAL', 60, 60, 400),
          T('Leer cambia<br>el lugar donde<br>vives.', 60, 100, 620, 230, 56, INK, IN, { fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 }),
          T('Fundación Alba para la lectura<br>Bibliotecas, clubes y libros para los pueblos pequeños', 60, 350, 560, 70, 20, GREY, IN, { lineHeight: 1.45 }),
          T('01 Carta<br>02 Cifras<br>03 Programas<br>04 Cuentas', 930, 64, 290, 140, 18, INK, IN, { lineHeight: 1.6 }),
          at(T('2025', 44, 380, 1200, 330, 340, BLUE, IN, { fontWeight: 700, letterSpacing: -18, lineHeight: 0.95 }), 'fade-up', { start: 'afterPrev', duration: 900 })],
          notes: 'Portada de memoria con la rejilla de doce columnas a la vista (líneas muy suaves). El año, enorme y en el único color, entra solo al empezar. La fundación y todas sus cifras son inventadas.' },
        { layout: 'blank', bg: BLUE, transition: 'wipe', extra: [
          kicker('01 · CARTA DE LA PRESIDENTA', 60, 60, 600, '#c7d0f7'),
          T('“', 50, 60, 200, 280, 220, W, IN, { fontWeight: 700, lineHeight: 1 }),
          at(T('Este año abrimos la biblioteca número cien. Está en un pueblo de 212 habitantes, en la antigua escuela, y los martes por la tarde no queda una silla libre.', 260, 140, 860, 330, 42, W, IN, { fontWeight: 500, lineHeight: 1.3 }), 'fade-in', { start: 'afterPrev', duration: 900 }),
          R(260, 520, 80, 4, W),
          T('<b>Carmen Olivar</b><br>Presidenta del patronato', 260, 540, 500, 80, 22, '#dfe5fc', IN, { lineHeight: 1.45 }),
          ...folio('01', 'Carta', '#c7d0f7')],
          notes: 'La carta, a toda tinta en el color de la fundación: una sola idea grande y mucho aire. Persona inventada.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('02 · CIFRAS', 60, 60, 400),
          T('Un año en cuatro números', 60, 92, 900, 70, 48, INK, IN, { fontWeight: 700, letterSpacing: -1 }),
          ...[['100', 'bibliotecas rurales abiertas'], ['48.300', 'lectores atendidos'], ['612', 'clubes de lectura'], ['1,84 M€', 'de gasto en programas']].map(([n, l], i) =>
            at(T(`<div style="font-size:64px;font-weight:700;letter-spacing:-2px;line-height:1.1;color:${i ? INK : BLUE}">${n}</div><div style="margin-top:12px;padding-top:12px;border-top:3px solid ${i ? INK : BLUE}">${l}</div>`,
              60 + i * 290, 210, 270, 200, 20, GREY, IN), 'fade-up', { start: i ? 'afterPrev' : 'click', duration: 450 })),
          R(60, 450, 1160, 1, LINE),
          T('Lo que cuesta cada lector', 60, 470, 360, 40, 22, INK, IN, { fontWeight: 700 }),
          T('Gasto en programas entre lectores atendidos. Bajó de 44 € en 2024 a 38 € este año.', 60, 510, 360, 120, 18, GREY, IN, { lineHeight: 1.45 }),
          at(mathBlock({ x: 460, y: 470, w: 760, h: 150, fontSize: 46, latex: '\\text{coste} = \\frac{1\\,840\\,000\\ \\text{€}}{48\\,300\\ \\text{lectores}} \\approx 38\\ \\text{€}', color: BLUE }), 'fade-in', { duration: 600 }),
          ...folio('02', 'Cifras')],
          notes: 'Cuatro cifras que entran en cadena con un clic, alineadas a la rejilla, y debajo la ecuación del coste por lector (bloque de ecuación). Cifras de ejemplo.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('02 · CIFRAS', 60, 60, 400),
          T('¿A dónde va cada euro?', 60, 92, 900, 70, 48, INK, IN, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 40, y: 180, w: 640, h: 460, chartType: 'doughnut', color: BLUE,
            data: [{ label: 'Bibliotecas rurales', value: 46, color: BLUE }, { label: 'Clubes de lectura', value: 22, color: '#5a73e0' }, { label: 'Libros y lotes', value: 17, color: '#9aaaf0' },
              { label: 'Formación', value: 9, color: '#c9d2f8' }, { label: 'Gestión', value: 6, color: '#9ca3af' }] }),
          at(T(`<div style="font-size:120px;font-weight:700;line-height:1;color:${BLUE};letter-spacing:-4px">94 %</div>`, 760, 200, 460, 140, 20, INK, IN), 'zoom-in', { duration: 500 }),
          at(T('de cada euro llega directamente a los programas. Solo el 6 % se queda en gestión, auditoría y oficina.', 760, 350, 440, 140, 24, INK, IN, { lineHeight: 1.4 }), 'fade-up', { start: 'afterPrev' }),
          ...folio('02', 'Cifras')],
          notes: 'Dona con un color por porción (tonos del mismo azul, la gestión en gris) y la leyenda con los porcentajes. La cifra grande resume el mensaje. Datos inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('02 · CIFRAS', 60, 60, 400),
          T('Lectores atendidos, 2019–2025', 60, 92, 900, 70, 48, INK, IN, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 60, y: 190, w: 820, h: 450, chartType: 'area', color: BLUE, grid: true, dataLabels: true, seriesName: 'Lectores (miles)',
            data: [{ label: '2019', value: 21 }, { label: '2020', value: 14 }, { label: '2021', value: 26 }, { label: '2022', value: 33 }, { label: '2023', value: 39 }, { label: '2024', value: 42 }, { label: '2025', value: 48 }] }),
          R(920, 200, 4, 120, BLUE),
          T('<b>2020</b><br>Los clubes pasaron al teléfono y a la radio local: perdimos un tercio de los lectores, pero ningún pueblo.', 940, 196, 280, 200, 20, INK, IN, { lineHeight: 1.45 }),
          R(920, 420, 4, 120, BLUE),
          T('<b>2025</b><br>Récord: más del doble que antes de la pandemia.', 940, 416, 280, 130, 20, INK, IN, { lineHeight: 1.45 }),
          ...folio('02', 'Cifras')],
          notes: 'Gráfico de área con etiquetas de datos; a la derecha, dos notas al margen con una barra azul, como en una memoria impresa. Datos inventados.' },
        { layout: 'blank', bg: PALE, transition: 'push', extra: [
          kicker('03 · PROGRAMAS', 60, 60, 400),
          T('Cómo llega un libro a un pueblo', 60, 92, 1000, 70, 48, INK, IN, { fontWeight: 700, letterSpacing: -1 }),
          dg('chevrons', 'Escuchar al pueblo\nAbrir la biblioteca\nFormar a quien la lleva\nCrear el club\nVolver cada año', 60, 230, 1160, 220, { colors: 'accent', oneByOne: true }),
          ...[['8 semanas', 'de la primera visita a la apertura'], ['3 voluntarios', 'de media en cada biblioteca'], ['12 visitas', 'de seguimiento al año']].map(([n, l], i) =>
            T(`<b style="color:${BLUE};font-size:30px">${n}</b><br>${l}`, 60 + i * 390, 510, 360, 100, 20, INK, IN, { lineHeight: 1.4 })),
          ...folio('03', 'Programas')],
          notes: 'Diagrama de galones que aparece paso a paso (uno a uno), sobre un fondo azul muy claro para separar el capítulo. Debajo, tres datos de apoyo en la rejilla de tres columnas.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('04 · CUENTAS', 60, 60, 400),
          T('Ingresos', 60, 92, 500, 70, 48, INK, IN, { fontWeight: 700, letterSpacing: -1 }),
          T('En miles de euros. Las sumas y la variación se calculan con fórmulas en la propia tabla.', 60, 170, 300, 160, 20, GREY, IN, { lineHeight: 1.45 }),
          tableBlock({ x: 420, y: 100, w: 800, h: 520, fontSize: 24, header: true, lines: true, headBg: W, headFg: BLUE, stroke: LINE, colW: [5, 2, 2, 2], fontFamily: IN,
            rows: [['Origen', '2024', '2025', 'Variación'], ['Socios y donantes', '812', '934', '=C2-B2'], ['Empresas', '426', '488', '=C3-B3'], ['Ayuntamientos', '310', '355', '=C4-B4'],
              ['Fundaciones amigas', '198', '240', '=C5-B5'], ['Venta de libros', '64', '71', '=C6-B6'], ['<b>Total</b>', '=SUMA(B2:B6)', '=SUMA(C2:C6)', '=SUMA(D2:D6)']] }),
          at(T('+278', 60, 430, 300, 100, 80, BLUE, IN, { fontWeight: 700, letterSpacing: -2 }), 'fade-up'),
          T('mil euros más que en 2024', 60, 530, 300, 40, 20, INK, IN),
          ...folio('04', 'Cuentas')],
          notes: 'Tabla de solo líneas con fórmulas: la variación es la resta de las dos columnas (=C2-B2) y los totales, sumas de rangos. Si cambias una cifra, se recalcula. Cuentas inventadas.' },
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          R(0, 0, 500, 720, BLUE),
          T('Gracias', 60, 60, 420, 110, 84, W, IN, { fontWeight: 700, letterSpacing: -2 }),
          T('a 2.140 socios, 310 voluntarias y voluntarios y 64 ayuntamientos que abren la puerta cada semana.', 60, 190, 380, 200, 24, '#dfe5fc', IN, { lineHeight: 1.45 }),
          T('fundacionalba.example<br>hola@fundacionalba.example', 60, 600, 400, 70, 18, W, IN, { lineHeight: 1.5 }),
          pollBlock({ fontSize: 28, display: 'bar', question: '¿Qué programa debería crecer más en 2026?', x: 560, y: 60, w: 660, h: 600,
            options: ['Bibliotecas rurales', 'Clubes de lectura', 'Libros en lectura fácil', 'Formación de mediadores'] })],
          notes: 'Cierre para la asamblea de socios: agradecimiento en la columna azul y una votación en directo desde el móvil para decidir prioridades del año que viene.' },
      ]));
    } },


  // ============================================================================
  // 3 · An exhibition poster: concrete grey, one lime disc, a 3D chair that turns and travels (Transform).
  creative_swiss_chairs: { name: 'Exposición: la silla moderna', cat: 'creative',
    summary: 'Cartel suizo gris y lima: silla 3D que gira y viaja con Transformar, cronología encadenada, dona, butaca 3D, tabla con fórmulas y ordenar',
    make: () => {
      const BG = '#e7e5e0', INK = '#151515', LIME = '#d4f000', GREY = '#6e6b66', CHAIR = uid(), DISC = uid(), TITLE = uid();
      const WS = FF.work;
      const kicker = (t, x, y, w, color = INK) => T(t, x, y, w, 30, 16, color, WS, { fontWeight: 700, letterSpacing: 4 });
      const chair = (x, y, w, h, props) => withId(m3d('kh-SheenChair', x, y, w, h, props), CHAIR);
      const disc = (x, y, d) => withId(E(x, y, d, d, LIME), DISC);
      const title = (x, y, w, h, size) => withId(T('La silla<br>moderna', x, y, w, h, size, INK, WS, { fontWeight: 700, lineHeight: 0.92, letterSpacing: -3 }), TITLE);
      return numbered(build({ name: 'La silla moderna · exposición', palette: 'grayscale', fonts: 'modern', title: { color: INK } }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          disc(600, 70, 580),
          chair(620, 90, 540, 540, { autoRotate: true, spin: 16, view: 'three', edge: 'fade' }),
          kicker('MUSEO DE DISEÑO DE VALDELUZ', 60, 60, 520),
          title(56, 110, 560, 240, 116),
          T('Cien años de sentarse<br>de otra manera', 60, 370, 500, 90, 28, INK, WS, { lineHeight: 1.25 }),
          R(60, 540, 520, 3, INK),
          ...[['Fechas', '15 nov 2026<br>28 mar 2027'], ['Lugar', 'Sala A<br>Planta baja'], ['Entrada', '8 €<br>Domingos libre']].map(([h, v], i) =>
            T(`<b>${h}</b><br>${v}`, 60 + i * 180, 556, 170, 100, 18, INK, WS, { lineHeight: 1.45 })),
          T('1925 — 2025 · CIEN AÑOS SENTADOS', 1210, 60, 40, 600, 16, INK, WS, { vertical: true, rotation: 180, letterSpacing: 6, fontWeight: 700 })],
          notes: 'Portada en forma de cartel: un disco lima, la silla 3D girando sola encima (Modelo 3D ▸ Girar solo) y la información en una rejilla de tres columnas. El museo y las fechas son inventados.' },
        { layout: 'blank', bg: BG, autoAnimate: true, transition: 'none', extra: [
          disc(70, 150, 420),
          chair(40, 120, 480, 480, { autoRotate: false, view: 'side', arrive: 'view' }),
          title(60, 40, 600, 80, 44),
          T('Cuatro salas', 620, 120, 600, 70, 54, INK, WS, { fontWeight: 700, letterSpacing: -1 }),
          ...[['1', 'Tubo de acero', 'Cuando la bicicleta inspiró a los muebles.'], ['2', 'Madera curvada', 'Contrachapado moldeado al vapor.'], ['3', 'Una sola pieza', 'El plástico permite sillas sin uniones.'], ['4', 'Lo que viene', 'Sillas de redes de pesca recicladas.']].flatMap(([n, t, d], i) => [
            at(R(620, 214 + i * 110, 600, 2, INK), 'fade-right', { start: i ? 'afterPrev' : 'click', duration: 300 }),
            at(T(`<span style="font-size:44px;font-weight:700">${n}</span>`, 620, 222 + i * 110, 70, 80, 20, INK, WS), 'fade-up', { start: 'withPrev', duration: 300 }),
            at(T(`<b style="font-size:28px">${t}</b><br>${d}`, 700, 226 + i * 110, 520, 80, 20, GREY, WS, { lineHeight: 1.35 }), 'fade-up', { start: 'withPrev', duration: 300 })])],
          notes: 'Transformar: el disco, la silla y el título vienen de la portada a su nuevo sitio; la silla llega girando hasta verse de lado (Modelo 3D ▸ Al llegar ▸ Ir a la vista). Con un clic, las cuatro salas en cadena.' },
        { layout: 'blank', bg: INK, transition: 'push', extra: [
          kicker('RECORRIDO', 60, 60, 400, LIME),
          T('Un siglo en seis sillas', 60, 92, 900, 70, 54, '#f2f0eb', WS, { fontWeight: 700, letterSpacing: -1 }),
          at(R(60, 436, 1160, 6, LIME), 'fade-right', { start: 'afterPrev', duration: 800 }),
          ...[['1925', 'Tubo de acero curvado'], ['1946', 'Contrachapado moldeado'], ['1958', 'Fibra de vidrio'], ['1972', 'Polipropileno apilable'], ['2001', 'Aluminio fundido'], ['2025', 'Plástico de redes recicladas']].flatMap(([y, d], i) => { const x = 60 + i * 200;
            return [at(R(x, 420, 38, 38, LIME, { rotation: 45 }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'click' }),
              at(T(y, x, 330, 190, 70, 54, '#f2f0eb', WS, { fontWeight: 700, letterSpacing: -1 }), 'fade-down', { start: 'withPrev', duration: 300 }),
              at(T(d, x, 490, 180, 100, 22, '#b9b6af', WS, { lineHeight: 1.35 }), 'fade-up', { start: 'withPrev', duration: 300 })]; }),
          T('El recorrido sigue este orden: empieza en la sala 1, junto a la taquilla, y termina en el patio.', 60, 180, 700, 70, 22, '#b9b6af', WS, { lineHeight: 1.4 })],
          notes: 'Cronología dibujada con formas: la línea se traza sola y, con un clic, los seis hitos entran uno tras otro con un pequeño sonido de clic.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          kicker('LA COLECCIÓN', 60, 60, 400),
          T('214 piezas,<br>cinco materiales', 60, 92, 560, 150, 54, INK, WS, { fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }),
          T('La madera sigue siendo la reina, pero el plástico reciclado ya ocupa una sala entera.', 60, 270, 460, 120, 24, GREY, WS, { lineHeight: 1.4 }),
          chartBlock({ x: 560, y: 80, w: 660, h: 580, chartType: 'doughnut', color: INK,
            data: [{ label: 'Madera', value: 38, color: INK }, { label: 'Metal', value: 24, color: '#4d4a46' }, { label: 'Plástico', value: 21, color: LIME }, { label: 'Tejido', value: 11, color: '#9a968f' }, { label: 'Otros', value: 6, color: '#c8c4bc' }] }),
          at(T('38 %', 60, 440, 400, 140, 120, INK, WS, { fontWeight: 700, letterSpacing: -4 }), 'fade-up'),
          T('de las piezas son de madera', 60, 580, 400, 40, 22, INK, WS)],
          notes: 'Dona con un color propio por material: los grises y un solo acento lima para el plástico, que es la historia de la exposición. Datos de ejemplo.' },
        { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
          R(660, 0, 620, 720, LIME),
          m3d('kh-ChairDamaskPurplegold', 700, 80, 540, 560, { view: 'three', motion: 'orbit', edge: 'fade' }),
          kicker('PIEZA DESTACADA', 60, 60, 400),
          T('Nº 087', 56, 92, 560, 140, 120, INK, WS, { fontWeight: 700, letterSpacing: -4 }),
          T('Butaca de salón con tapicería de damasco', 60, 240, 540, 90, 32, INK, WS, { lineHeight: 1.2 }),
          ...[['Taller', 'Ribera, Valencia'], ['Año', '1962'], ['Materiales', 'Haya, muelles y damasco'], ['Procedencia', 'Donación de una familia']].flatMap(([k, v], i) => [
            R(60, 380 + i * 64, 540, 1, INK, { opacity: 40 }),
            T(k, 60, 390 + i * 64, 200, 40, 20, GREY, WS), T(v, 260, 390 + i * 64, 340, 40, 20, INK, WS, { fontWeight: 600 })])],
          notes: 'Ficha de catálogo con filetes finos y la butaca 3D dando una vuelta completa al llegar (Modelo 3D ▸ Al llegar ▸ Vuelta completa). Taller y procedencia inventados.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          kicker('VISITAS EN GRUPO', 60, 60, 400),
          T('¿Cuánto cuesta<br>venir con la clase?', 60, 92, 520, 150, 50, INK, WS, { fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }),
          T('El importe y el total se calculan solos: cambia el número de personas y la tabla hace la cuenta.', 60, 270, 440, 120, 22, GREY, WS, { lineHeight: 1.4 }),
          T('Domingos: entrada libre para todos.', 60, 560, 440, 80, 24, INK, WS, { fontWeight: 700, bg: LIME, pad: [14, 18, 14, 18], radius: 0 }),
          tableBlock({ x: 560, y: 100, w: 660, h: 440, fontSize: 24, header: true, lines: true, headBg: INK, headFg: LIME, stroke: '#9a968f', colW: [4, 2, 2, 2], fontFamily: WS,
            rows: [['Entrada', 'Precio', 'Personas', 'Importe'], ['General', '8 €', '2', '=B2*C2'], ['Estudiante', '4 €', '25', '=B3*C3'], ['Profesorado', '0 €', '2', '=B4*C4'], ['Audioguía', '2 €', '29', '=B5*C5'], ['<b>Total</b>', '', '=SUMA(C2:C4)', '=SUMA(D2:D5)']] })],
          notes: 'Tabla con fórmulas: cada importe es precio por personas (=B2*C2) y los totales son sumas de rangos. Precios de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          R(0, 0, 400, 720, LIME),
          kicker('JUEGO', 50, 60, 300),
          T('Ordena<br>el siglo', 50, 100, 320, 200, 72, INK, WS, { fontWeight: 700, lineHeight: 0.95, letterSpacing: -2 }),
          T('Arrastra desde el móvil las sillas, de la más antigua a la más reciente. Las fechas están en la sala 1.', 50, 330, 300, 200, 22, INK, WS, { lineHeight: 1.4 }),
          pollBlock({ kind: 'order', fontSize: 28, question: 'De la más antigua a la más reciente', x: 450, y: 60, w: 770, h: 600,
            options: ['Silla de tubo de acero', 'Silla de contrachapado moldeado', 'Silla de fibra de vidrio', 'Silla apilable de polipropileno', 'Silla de redes de pesca recicladas'] })],
          notes: 'Actividad de ordenar desde el móvil: cada visitante pone las sillas en orden y se corrige sola. El orden correcto es el de la cronología.' },
        { layout: 'blank', bg: LIME, transition: 'zoom', extra: [
          T('Siéntate.', 50, 120, 1100, 260, 230, INK, WS, { fontWeight: 700, letterSpacing: -10, lineHeight: 1 }),
          R(60, 420, 1160, 3, INK),
          ...[['Museo de Diseño de Valdeluz', 'Paseo del Río 4'], ['Martes a domingo', '10:00 — 20:00'], ['museodiseno.example', '#LaSillaModerna']].map(([a, b], i) =>
            T(`<b>${a}</b><br>${b}`, 60 + i * 390, 440, 360, 90, 22, INK, WS, { lineHeight: 1.45 })),
          credits(['kh-ChairDamaskPurplegold'], 60, 650, 1160, '#4d5a00')],
          notes: 'Cierre a toda tinta en el color de la exposición: una palabra gigante y la información en tres columnas.' },
      ]));
    } },


  // ============================================================================
  // 4 · A natural history museum's visitor guide: wayfinding signs — black panels, signal yellow, pictograms, a plan with the route.
  creative_swiss_museum: { name: 'Guía del museo de historia natural', cat: 'creative',
    summary: 'Señalética suiza en negro y amarillo: plano propio con un recorrido animado, zorro 3D que anda, columnas, tabla, etiquetar y pictogramas',
    make: () => {
      const W = '#ffffff', K = '#111111', Y = '#ffd200', GREY = '#5c5c5c', FI = FF.fira;
      const sign = (n, x, y, s = 64, bgc = Y, fg = K) => T(`<b>${n}</b>`, x, y, s, s, Math.round(s * 0.6), fg, FI, { bg: bgc, textAlign: 'center', vAlign: 'middle', radius: 0, pad: [0, 0, 0, 0] });
      const kicker = (t, x, y, w, color = K) => T(t, x, y, w, 30, 16, color, FI, { fontWeight: 700, letterSpacing: 4 });
      // The ground floor plan (1000 × 520): walls, numbered rooms, the hall; with or without the rooms' names.
      const ROOMS = [[40, 40, 260, 320, '1', 'Minerales'], [320, 40, 360, 320, '2', 'Dinosaurios'], [700, 40, 260, 320, '3', 'Fauna ibérica'], [620, 380, 340, 120, '4', 'Océanos'], [40, 380, 340, 120, '', 'Tienda']];
      const plan = names => svgURL(1000, 520, `<rect x="20" y="20" width="960" height="500" fill="#f4f4f1" stroke="${K}" stroke-width="8"/>`
        + ROOMS.map(([x, y, w, h, n, t]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${K}" stroke-width="4"/>`
          + (n ? `<rect x="${x + 16}" y="${y + 16}" width="44" height="44" fill="${Y}"/>` + S(x + 38, y + 49, 30, K, n, ' font-weight="700" text-anchor="middle"') : '')
          + (names ? S(x + (n ? 72 : 18), y + 48, 24, K, t, ' font-weight="700"') : '')).join('')
        + `<rect x="430" y="400" width="160" height="120" fill="${K}"/>` + S(510, 506, 20, '#ffffff', 'Entrada', ' text-anchor="middle" font-weight="700"')
        + [[310, 180], [690, 180], [830, 360], [380, 440], [620, 440], [510, 400]].map(([x, y]) => `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" fill="#f4f4f1"/>`).join(''));
      return numbered(build({ name: 'Museo de Historia Natural · Guía', palette: 'forest', fonts: 'friendly', title: { color: K } }, [
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          kicker('MUSEO DE HISTORIA NATURAL', 60, 60, 600),
          T('Guía<br>de visita', 54, 100, 720, 300, 136, K, FI, { fontWeight: 700, lineHeight: 0.95, letterSpacing: -3 }),
          T('Dos plantas, siete salas y cuatro millones y medio de seres que esperan a que los mires.', 60, 420, 620, 100, 26, GREY, FI, { lineHeight: 1.4 }),
          R(60, 560, 160, 16, Y),
          R(840, 0, 440, 720, K),
          ...[['↑', 'Salas 1 — 4', 'Planta baja'], ['↗', 'Salas 5 — 7', 'Planta 1 · escalera y ascensor'], ['←', 'Tienda y consigna', ''], ['→', 'Cafetería', 'Patio de los ginkgos']].flatMap(([a, t, d], i) => [
            at(T(`<b>${a}</b>`, 880, 80 + i * 150, 72, 72, 46, K, FI, { bg: Y, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }), 'fade-left', { start: 'afterPrev', duration: 350 }),
            at(T(`<b style="font-size:30px">${t}</b>${d ? '<br>' + d : ''}`, 976, 80 + i * 150, 270, 110, 18, '#d0d0d0', FI, { lineHeight: 1.35, color: W }), 'fade-left', { start: 'withPrev', duration: 350 })])],
          notes: 'Portada como un cartel de señalética: a la derecha, un panel negro con flechas en cuadrados amarillos que entran solos, uno tras otro. El museo y sus datos son inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('PLANTA BAJA', 60, 50, 400),
          T('Recorrido recomendado · 90 minutos', 60, 80, 900, 60, 40, K, FI, { fontWeight: 700 }),
          img(plan(true), 60, 150, 820, 426, 'Plano de la planta baja con cuatro salas numeradas, la tienda y la entrada'),
          withAnims(E(460, 476, 36, 36, Y, { stroke: K, strokeWidth: 4 }),
            path([[-279, -180], [-8, -180], [263, -180], [230, 0]], { duration: 5000, start: 'click' })),
          ...[['1', 'Minerales', '15 min'], ['2', 'Dinosaurios', '30 min'], ['3', 'Fauna ibérica', '25 min'], ['4', 'Océanos', '20 min']].flatMap(([n, t, m], i) => [
            sign(n, 930, 160 + i * 110, 56),
            T(`<b>${t}</b><br>${m}`, 1002, 160 + i * 110, 220, 70, 22, K, FI, { lineHeight: 1.3 })]),
          T('Clic: el punto amarillo hace el recorrido.', 60, 600, 820, 40, 20, GREY, FI)],
          notes: 'Plano dibujado en SVG dentro de la plantilla. Con un clic, el punto amarillo sigue el recorrido recomendado (animación de trayectoria con varios puntos, suave y a velocidad constante).' },
        { layout: 'blank', bg: '#f4f4f1', transition: 'push', extra: [
          sign('3', 60, 60, 110),
          T('Fauna ibérica', 200, 60, 700, 80, 64, K, FI, { fontWeight: 700, letterSpacing: -1 }),
          T('Planta baja · al fondo a la derecha', 202, 136, 600, 40, 22, GREY, FI),
          ...[['148', 'especies naturalizadas'], ['12', 'dioramas a tamaño real'], ['1', 'zorro que no para quieto']].map(([n, l], i) =>
            T(`<div style="font-size:64px;font-weight:700;line-height:1">${n}</div><div style="margin-top:8px">${l}</div>`, 860, 220 + i * 140, 360, 130, 20, K, FI)),
          R(840, 220, 4, 400, Y),
          R(60, 640, 760, 8, K),
          withAnims(m3d('kh-Fox', 40, 360, 300, 290, { view: 'side', walk: { clip: 'Walk', end: 'Survey', face: true, look: true } }),
            path([[220, -10], [460, 0]], { duration: 4200 })),
          T('El zorro es el carnívoro más extendido de la península: vive en bosques, campos y hasta en las afueras de las ciudades.', 60, 220, 740, 100, 24, K, FI, { lineHeight: 1.4 })],
          notes: 'Con un clic, el zorro 3D cruza la sala andando y, al llegar, se para a olfatear (Modelo 3D ▸ Al moverse: animación de andar y de llegada). Cifras de la sala inventadas.' },
        { layout: 'blank', bg: K, transition: 'push', extra: [
          kicker('LA COLECCIÓN', 60, 60, 400, Y),
          at(T('4,5', 54, 90, 520, 260, 260, Y, FI, { fontWeight: 700, letterSpacing: -10, lineHeight: 1 }), 'zoom-in', { start: 'afterPrev', duration: 600 }),
          T('millones de ejemplares, aunque solo el 2 % está a la vista. El resto se estudia en los almacenes.', 60, 370, 440, 160, 28, W, FI, { lineHeight: 1.35 }),
          chartBlock({ x: 560, y: 70, w: 660, h: 580, chartType: 'bar', color: Y, dataLabels: true, grid: false, yTitle: 'Miles de ejemplares',
            data: [{ label: 'Insectos', value: 3100 }, { label: 'Moluscos', value: 620 }, { label: 'Plantas', value: 410 }, { label: 'Minerales', value: 210 }, { label: 'Vertebrados', value: 150 }, { label: 'Fósiles', value: 60 }] })],
          notes: 'Columnas en el amarillo de la señalética: miles de ejemplares de cada colección. Los insectos ganan por goleada. Cifras de ejemplo.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('HORARIOS Y TARIFAS', 60, 60, 400),
          T('Cuándo venir', 60, 92, 600, 70, 54, K, FI, { fontWeight: 700, letterSpacing: -1 }),
          tableBlock({ x: 60, y: 190, w: 700, h: 400, fontSize: 24, header: true, lines: true, headBg: Y, headFg: K, stroke: '#bdbdbd', colW: [4, 4, 3], fontFamily: FI,
            rows: [['Día', 'Horario', 'Entrada'], ['Martes a viernes', '10:00 — 18:00', '7 €'], ['Sábados', '10:00 — 20:00', '7 €'], ['Domingos y festivos', '10:00 — 15:00', 'Gratis'], ['Primer jueves', '18:00 — 22:00', 'Gratis'], ['Lunes', 'Cerrado', '—']] }),
          R(820, 190, 400, 400, K),
          icon('clock', 860, 230, 80, Y),
          T('<b style="color:#ffd200">Truco</b><br>Los martes por la mañana hay menos gente: la sala de dinosaurios es casi para ti.', 860, 340, 330, 220, 24, W, FI, { lineHeight: 1.4 })],
          notes: 'Tabla de horarios con cabecera amarilla, como un cartel de taquilla, y un panel negro con un consejo. Horarios y precios de ejemplo.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          pollBlock({ kind: 'label', fontSize: 28, question: '¿Te orientas? Pon cada sala en su número', image: plan(false), x: 60, y: 40, w: 1160, h: 640,
            options: ['Minerales', 'Dinosaurios', 'Fauna ibérica', 'Océanos'], points: [{ x: 19, y: 39 }, { x: 56, y: 39 }, { x: 87, y: 39 }, { x: 79, y: 86 }] })],
          notes: 'Actividad de etiquetar una imagen desde el móvil: el plano sin nombres y cuatro etiquetas para arrastrar a cada sala. Ideal antes de empezar la visita con un grupo escolar.' },
        { layout: 'blank', bg: '#f4f4f1', transition: 'push', extra: [
          kicker('SERVICIOS', 60, 60, 400),
          T('Todo lo que necesitas', 60, 92, 900, 70, 54, K, FI, { fontWeight: 700, letterSpacing: -1 }),
          ...[['user', 'Visitas guiadas', 'Sábados a las 12:00'], ['location', 'Punto de encuentro', 'Junto al esqueleto de ballena'], ['home', 'Consigna', 'Gratuita, en la planta baja'],
            ['heart', 'Primeros auxilios', 'Pregunta en taquilla'], ['clock', 'Talleres en familia', 'Domingos a las 11:00'], ['mail', 'Información', 'museonatural.example']].flatMap(([ic, t, d], i) => {
            const x = 60 + (i % 3) * 390, y = 200 + Math.floor(i / 3) * 220;
            return [at(R(x, y, 110, 110, K), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 250 }), at(icon(ic, x + 25, y + 25, 60, Y), 'zoom-in', { start: 'withPrev', duration: 250 }),
              at(T(`<b>${t}</b><br>${d}`, x + 130, y + 10, 240, 100, 22, K, FI, { lineHeight: 1.35 }), 'fade-left', { start: 'withPrev', duration: 250 })]; })],
          notes: 'Pictogramas en cuadrados negros con el icono en amarillo, como en la señalética del edificio. Entran en cadena con un solo clic.' },
        { layout: 'blank', bg: Y, transition: 'wipe', extra: [
          T('<b>→</b>', 60, 60, 220, 220, 180, Y, FI, { bg: K, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }),
          T('Salida', 60, 300, 900, 170, 150, K, FI, { fontWeight: 700, letterSpacing: -4, lineHeight: 1 }),
          T('Gracias por la visita. Con tu entrada vuelves gratis durante 30 días.', 64, 470, 820, 90, 30, K, FI, { lineHeight: 1.3 }),
          R(60, 600, 1160, 4, K),
          T('Calle del Jardín Botánico 2 · museonatural.example', 60, 620, 1160, 40, 20, K, FI, { fontWeight: 700 }),
          credits(['kh-Fox'], 60, 664, 1160, '#5c4b00')],
          notes: 'Cierre en amarillo señal, con la flecha de salida en negro: la misma familia de carteles que el resto.' },
      ]));
    } },


  // ============================================================================
  // 5 · A graphic design conference: graphite, one cyan, the twelve-column grid as the theme itself (it builds, measures and codes the grid).
  creative_swiss_designconf: { name: 'Congreso de diseño: Rejilla 27', cat: 'creative',
    summary: 'Grafito y cian: la rejilla se monta sola y se convierte con Transformar, cifra de contorno, fórmula, cronología, código CSS, nube y descanso',
    make: () => {
      const BG = '#16181b', CY = '#00e0c6', W = '#f1f3f4', G = '#8b9096', SG = FF.space;
      const BLK = Array.from({ length: 5 }, () => uid()), TTL = uid();
      const kicker = (t, x, y, w, color = CY) => T(t, x, y, w, 30, 16, color, SG, { fontWeight: 700, letterSpacing: 4 });
      const colX = i => Math.round(60 + i * (1160 + 20) / 12);          // (12 columns of 78 px with 20 px gutters, 60 px margins)
      const span = n => Math.round(n * 78.33 + (n - 1) * 20);
      const ttl = (x, y, w, h, size) => withId(T('Rejilla', x, y, w, h, size, W, SG, { fontWeight: 700, letterSpacing: -4, lineHeight: 1 }), TTL);
      // Five cyan blocks on the grid: a composition on the cover, the column being measured on the next slide.
      const blocksA = [[0, 0, 2, 120], [3, 0, 1, 120], [9, 1, 3, 120], [8, 5, 1, 80], [10, 0, 2, 40]].map(([c, r, n, h], i) =>
        at(withId(R(colX(c), 60 + r * 100, span(n), h, CY, { opacity: i % 2 ? 60 : 100 }), BLK[i]), 'zoom-in', { start: 'afterPrev', duration: 250 }));
      const blocksB = [[0, 120, 1, 480], [1, 120, 1, 480], [2, 120, 1, 480], [3, 120, 1, 480], [4, 120, 1, 480]].map(([c, y, n, h], i) =>
        withId(R(colX(c), y, span(n), h, CY, { opacity: i ? 18 : 100 }), BLK[i]));
      return numbered(build({ name: 'Rejilla 27 · congreso de diseño', palette: 'midnight', fonts: 'tech', title: { color: W } }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          ...cols(12, 60, 1240, CY, 14).filter((_, i) => i < 12).flatMap((l, i) => [l, R(colX(i) + 78, 0, 1, 720, CY, { opacity: 14 })]),
          ...blocksA,
          ttl(46, 330, 900, 200, 200),
          T(`<span style="color:transparent;-webkit-text-stroke:4px ${CY}">27</span>`, 900, 330, 330, 200, 200, CY, SG, { fontWeight: 700, letterSpacing: -6, lineHeight: 1 }),
          T('Congreso de diseño gráfico', 60, 550, 700, 50, 32, W, SG),
          T('Zaragoza · 5 y 6 de marzo de 2027 · Sala Ebro', 60, 600, 700, 40, 22, G, SG)],
          notes: 'Portada: la rejilla de doce columnas dibujada con filetes y cinco bloques cian que caen en su sitio uno tras otro al empezar. El «27» es solo contorno (trazo cian sin relleno). Congreso inventado.' },
        { layout: 'blank', bg: BG, autoAnimate: true, transition: 'none', extra: [
          ...cols(12, 60, 1240, CY, 10).filter((_, i) => i < 12).flatMap((l, i) => [l, R(colX(i) + 78, 0, 1, 720, CY, { opacity: 10 })]),
          ...blocksB,
          ttl(560, 40, 600, 80, 56),
          kicker('UNA FÓRMULA', 560, 130, 600),
          T('¿Cuánto mide una columna?', 560, 160, 660, 60, 36, W, SG, { fontWeight: 700 }),
          mathBlock({ x: 540, y: 250, w: 680, h: 120, fontSize: 40, color: W, latex: 'c = \\frac{W - 2m - (n-1)\\,g}{n}' }),
          at(mathBlock({ x: 540, y: 380, w: 680, h: 110, fontSize: 36, color: CY, latex: '\\frac{1280 - 120 - 11 \\cdot 20}{12} \\approx 78{,}3\\ \\text{px}' }), 'fade-up'),
          at(T('W ancho · m margen · g medianil · n columnas', 560, 520, 660, 40, 20, G, SG), 'fade-up', { start: 'afterPrev' }),
          T('↔ 78 px', colX(0), 610, 200, 40, 22, CY, SG, { fontWeight: 700 })],
          notes: 'Transformar: los cinco bloques de la portada se convierten en las cinco primeras columnas y el título se va arriba. La fórmula (bloque de ecuación) explica el ancho de columna; con un clic, los números de esta misma diapositiva.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          kicker('PROGRAMA · VIERNES 5', 60, 60, 600),
          T('Un día, cinco charlas', 60, 92, 900, 70, 52, W, SG, { fontWeight: 700, letterSpacing: -1 }),
          dg('timeline', '09:30 Acreditación\n10:00 La rejilla invisible\n11:30 Carteles sin adornos\n13:00 Comida\n15:30 Tipos que se leen lejos\n17:00 Mesa redonda', 60, 200, 1160, 400, { colors: 'accent', oneByOne: true })],
          notes: 'Cronología como diagrama: cada clic añade una franja del programa (Diagrama ▸ Uno a uno). Títulos de charlas inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('PONENTES', 60, 60, 600, '#008f7e'),
          T('Cuatro miradas<br>sobre la rejilla', 60, 92, 520, 150, 52, BG, SG, { fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }),
          ...[['MV', 'Marta Vidal', 'Diseñadora de señalética', 'Ha ordenado tres aeropuertos con una sola rejilla.', 640, 70], ['JB', 'Jon Bastida', 'Tipógrafo', 'Dibuja letras para leer a cincuenta metros.', 940, 70],
            ['AR', 'Aina Roig', 'Directora de arte editorial', 'Rediseñó un diario en doce columnas.', 640, 380], ['LT', 'Lucas Tena', 'Profesor de diseño', 'Treinta años enseñando a dejar blanco.', 940, 380]].flatMap(([m, n, r, d, x, y], i) => [
            at(T(`<b>${m}</b>`, x, y, 90, 90, 36, BG, SG, { bg: CY, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 }),
            at(T(`<b style="font-size:26px">${n}</b><br><span style="color:#008f7e">${r}</span><br>${d}`, x, y + 106, 270, 170, 18, '#4a4f55', SG, { lineHeight: 1.4 }), 'fade-up', { start: 'withPrev', duration: 300 })]),
          R(60, 300, 520, 3, BG),
          T('El congreso reúne cada año a quien diseña con orden: señalética, libros, carteles, pantallas.', 60, 330, 480, 140, 24, '#4a4f55', SG, { lineHeight: 1.4 })],
          notes: 'Una diapositiva en blanco para cambiar de ritmo: los ponentes entran en cadena, cada uno con un monograma en un cuadrado cian. Personas inventadas.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          kicker('TALLER · SÁBADO 6', 60, 60, 600),
          T('La rejilla en CSS', 60, 92, 600, 70, 52, W, SG, { fontWeight: 700, letterSpacing: -1 }),
          codeBlock({ x: 60, y: 186, w: 680, h: 480, fontSize: 22, lang: 'css', lineSteps: '1-5|7-9|11-13',
            code: '.pagina {\n  display: grid;\n  grid-template-columns: repeat(12, 1fr);\n  gap: 20px;\n  padding: 0 60px;\n}\n\n.titular {\n  grid-column: 1 / 8;\n}\n\n.foto {\n  grid-column: 8 / 13;\n}' }),
          ...Array.from({ length: 12 }, (_, i) => R(800 + i * 35, 200, 28, 300, CY, { opacity: 16 })),
          at(R(800, 220, 7 * 35 - 7, 90, W), 'fade-right', { duration: 400 }),
          at(R(800 + 7 * 35, 220, 5 * 35 - 7, 260, CY), 'fade-left', { duration: 400 }),
          T('Doce columnas, dos líneas de código por elemento. Con cada clic se resalta un paso.', 800, 530, 420, 100, 20, G, SG, { lineHeight: 1.45 })],
          notes: 'Bloque de código con pasos de resaltado: primero la rejilla, luego el titular y por último la foto. A la derecha, la página resultante en miniatura, que se monta con dos clics.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          kicker('ASISTENTES', 60, 60, 600),
          T('¿Quién viene?', 60, 92, 600, 70, 52, W, SG, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 60, y: 180, w: 760, h: 480, chartType: 'stacked100', color: CY, seriesName: 'Estudios', grid: true,
            data: [{ label: '2024', value: 38 }, { label: '2025', value: 34 }, { label: '2026', value: 31 }],
            series: [{ name: 'Estudiantes', values: [30, 33, 36], color: '#5d6b73' }, { name: 'Empresas', values: [22, 20, 18], color: '#b8c2c8' }, { name: 'Autónomos', values: [10, 13, 15], color: '#33544f' }] }),
          T(`<div style="font-size:110px;font-weight:700;line-height:1;color:${CY}">36 %</div><div style="margin-top:10px">de las entradas de 2026 fueron para estudiantes: por primera vez, el grupo más grande.</div>`, 860, 220, 360, 380, 22, W, SG, { lineHeight: 1.4 })],
          notes: 'Barras apiladas al cien por cien: el peso de cada perfil cada año. El cian solo marca los estudios de diseño; el resto, en grises. Datos inventados.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          pollBlock({ kind: 'word', fontSize: 34, question: 'Una palabra para el estilo suizo', x: 60, y: 60, w: 1160, h: 600 })],
          notes: 'Nube de palabras en directo: el público escribe desde el móvil y las palabras más repetidas crecen. Suele salir «orden», «claridad» y «Helvetica».' },
        { layout: 'blank', bg: CY, transition: 'fade', extra: [
          T('Pausa', 60, 60, 600, 160, 150, BG, SG, { fontWeight: 700, letterSpacing: -6, lineHeight: 1 }),
          T('Café y bocadillos en la planta 2.<br>Volvemos con «Tipos que se leen lejos».', 64, 240, 560, 120, 26, BG, SG, { lineHeight: 1.4 }),
          timer(900, 700, 120, 460, { color: BG, endText: '¡A la sala!' })],
          notes: 'Cuenta atrás de quince minutos en anillo, sobre el cian: arranca sola al llegar y suena al terminar. Déjala proyectada durante la pausa.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          ...cols(12, 60, 1240, CY, 10).filter((_, i) => i < 12).flatMap((l, i) => [l, R(colX(i) + 78, 0, 1, 720, CY, { opacity: 10 })]),
          R(colX(0), 60, span(4), 280, CY),
          T('Gracias', colX(4), 60, span(8), 160, 150, W, SG, { fontWeight: 700, letterSpacing: -6, lineHeight: 1 }),
          T('Hasta la edición 28.', colX(4), 230, span(8), 60, 34, G, SG),
          T('rejilla27.example<br>#Rejilla27', colX(0), 560, span(4), 90, 26, W, SG, { fontWeight: 700, lineHeight: 1.4 })],
          notes: 'Cierre con la misma rejilla de la portada: un bloque de cuatro columnas y el agradecimiento a partir de la quinta.' },
      ]));
    } },


  // ============================================================================
  // 6 · A publisher's autumn catalogue: cream paper, petrol teal, a shelf of spines, Swiss book covers drawn in SVG.
  creative_swiss_publisher: { name: 'Catálogo de otoño de una editorial', cat: 'creative',
    summary: 'Papel crema y verde petróleo: estantería de lomos verticales, portadas en SVG, tableta, tarta, pedido con fórmulas, calendario y huecos',
    make: () => {
      const CREAM = '#f3eee4', INK = '#1c1a17', TEAL = '#007c78', GREY = '#77706a', RB = FF.rubik, SER = FF.merri;
      const kicker = (t, x, y, w, color = TEAL) => T(t, x, y, w, 30, 16, color, RB, { fontWeight: 700, letterSpacing: 4 });
      // A Swiss book cover (300 × 450): a geometric figure, the title set flush left, the author at the foot.
      const cover = (kind, title, author, bg, fg = INK, ac = TEAL) => svgURL(300, 450, ({
        circle: `<circle cx="190" cy="250" r="110" fill="${ac}"/><circle cx="96" cy="330" r="40" fill="${fg}"/>`,
        stripes: Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${170 + i * 24}" width="${300 - i * 28}" height="12" fill="${i % 3 ? fg : ac}"/>`).join(''),
        grid: Array.from({ length: 16 }, (_, i) => `<rect x="${30 + (i % 4) * 62}" y="${160 + Math.floor(i / 4) * 62}" width="50" height="50" fill="${i === 6 ? ac : fg}" opacity="${i === 6 ? 1 : 0.85}"/>`).join(''),
        diagonal: `<path d="M0 450 L300 150 L300 450 Z" fill="${ac}"/><rect x="30" y="300" width="80" height="8" fill="${fg}"/>`,
      })[kind] + S(26, 56, 30, fg, title[0], ' font-weight="700"') + (title[1] ? S(26, 92, 30, fg, title[1], ' font-weight="700"') : '') + S(26, 428, 15, fg, author), bg);
      const BOOKS = [['circle', ['El año', 'del faro'], 'Nuria Saldaña', '#ebe4d6'], ['stripes', ['Agua', 'quieta'], 'Tomás Elcano', '#f7f3ea'], ['grid', ['Ciudades', 'menores'], 'Berta Quiroga', '#e4ece9'], ['diagonal', ['La última', 'cosecha'], 'Ismael Fuentes', '#efe6e0']];
      // The spines of the shelf on the cover: [x, width, height, colour, title].
      const SPINES = [[700, 54, 520, TEAL, 'EL AÑO DEL FARO'], [758, 40, 470, INK, 'AGUA QUIETA'], [802, 62, 560, '#c9c0b0', 'CIUDADES MENORES'], [868, 46, 500, INK, 'LA ÚLTIMA COSECHA'],
        [918, 70, 540, '#e2d9c8', 'POESÍA REUNIDA'], [992, 36, 430, TEAL, 'NORTE'], [1032, 58, 510, '#8a8178', 'CARTAS AL RÍO'], [1094, 44, 480, INK, 'LOS AÑOS LENTOS'], [1142, 76, 550, TEAL, 'ATLAS DEL SILENCIO']];
      // An e-book page on the tablet.
      const ebook = svgURL(800, 600, S(80, 90, 18, GREY, 'CAPÍTULO 1', ' letter-spacing="4"') + S(80, 150, 40, INK, 'El año del faro', ' font-weight="700"', 'Georgia, serif')
        + Array.from({ length: 11 }, (_, i) => `<rect x="80" y="${200 + i * 32}" width="${i === 10 ? 300 : 620 - (i % 3) * 30}" height="10" rx="5" fill="#c9c2b6"/>`).join('')
        + `<rect x="80" y="560" width="640" height="4" fill="#e3ddd2"/><rect x="80" y="560" width="210" height="4" fill="${TEAL}"/>`, '#fbf8f2');
      return numbered(build({ name: 'Ediciones Ladera · Otoño 2026', palette: 'paper', fonts: 'editorial', title: { color: INK } }, [
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
          kicker('EDICIONES LADERA', 60, 60, 500),
          T('Catálogo<br>de otoño', 54, 100, 600, 260, 110, INK, RB, { fontWeight: 700, lineHeight: 0.95, letterSpacing: -3 }),
          T('2026', 60, 350, 300, 80, 64, TEAL, RB, { fontWeight: 700 }),
          T('Nueve libros nuevos, tres colecciones y una sola idea: publicar poco y cuidarlo mucho.', 60, 460, 520, 100, 24, GREY, RB, { lineHeight: 1.4 }),
          R(660, 640, 580, 8, INK),
          ...SPINES.map(([x, w, h, c, t], i) => at(T(t, x, 640 - h, w, h, Math.min(20, w * 0.38), [INK, '#8a8178'].includes(c) || c === TEAL ? '#ffffff' : INK, RB,
            { bg: c, vertical: true, rotation: 180, fontWeight: 700, letterSpacing: 3, pad: [16, 0, 16, 0], textAlign: 'left' }), 'fade-up', { start: 'afterPrev', duration: 220, delay: i ? 0 : 200 }))],
          notes: 'Portada con una estantería: cada lomo es un cuadro de texto vertical con fondo de color, y entran solos uno tras otro. Editorial, libros y autores inventados.' },
        { layout: 'blank', bg: CREAM, transition: 'push', extra: [
          kicker('NOVEDADES', 60, 60, 500),
          T('Cuatro portadas, una familia', 60, 92, 900, 70, 50, INK, RB, { fontWeight: 700, letterSpacing: -1 }),
          ...BOOKS.map(([k, t, a, bg], i) => at(img(cover(k, t, a, bg), 60 + i * 295, 190, 260, 390, `Portada de «${t.join(' ')}», de ${a}`, { shadow: true }),
            'fade-up', { start: i ? 'afterPrev' : 'click', duration: 400 })),
          T('Misma rejilla, misma letra, una figura distinta en cada libro.', 60, 610, 1100, 40, 22, GREY, RB)],
          notes: 'Las portadas están dibujadas en SVG dentro de la plantilla: título arriba a la izquierda, autor al pie y una figura geométrica. Entran en cadena con un clic.' },
        { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
          R(0, 0, 520, 720, '#e6e0d3'),
          img(cover('circle', ['El año', 'del faro'], 'Nuria Saldaña', '#ebe4d6'), 110, 100, 320, 480, 'Portada de «El año del faro»', { shadow: true }),
          kicker('LIBRO DEL MES', 580, 70, 500),
          T('El año del faro', 576, 100, 640, 80, 56, INK, RB, { fontWeight: 700, letterSpacing: -1 }),
          T('Nuria Saldaña · Novela · 312 páginas · 21,90 €', 580, 180, 640, 40, 20, GREY, RB),
          R(580, 240, 80, 4, TEAL),
          at(T('«Aquel invierno aprendimos que la luz no avisa: gira, vuelve y nos encuentra siempre en el mismo sitio.»', 580, 270, 620, 200, 30, INK, SER, { fontStyle: 'italic', lineHeight: 1.5 }), 'fade-in', { duration: 900 }),
          T('Una farera, su hija y un pueblo de la costa que espera un barco que nunca llega.', 580, 500, 600, 90, 22, GREY, RB, { lineHeight: 1.45 })],
          notes: 'La novela destacada: portada grande sobre un fondo de papel y la primera cita en serifa (Merriweather), que entra con un clic. Todo inventado.' },
        { layout: 'blank', bg: CREAM, transition: 'push', extra: [
          kicker('LAS COLECCIONES', 60, 60, 500),
          T('Qué publicamos', 60, 92, 600, 70, 50, INK, RB, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 40, y: 180, w: 640, h: 480, chartType: 'pie', color: TEAL,
            data: [{ label: 'Narrativa', value: 48, color: TEAL }, { label: 'Ensayo', value: 27, color: INK }, { label: 'Poesía', value: 15, color: '#8a8178' }, { label: 'Ilustrado', value: 10, color: '#c9c0b0' }] }),
          ...[['Faro', 'Narrativa', 'Novela y cuento de autores nuevos.'], ['Ensayo breve', 'Ensayo', 'Menos de 150 páginas, siempre.'], ['Verso suelto', 'Poesía', 'Un poemario por estación.']].map(([n, g, d], i) =>
            at(T(`<b style="font-size:28px">${n}</b> <span style="color:${TEAL}">· ${g}</span><br>${d}`, 740, 210 + i * 140, 480, 110, 20, GREY, RB, { lineHeight: 1.5 }), 'fade-left', { start: i ? 'afterPrev' : 'click' })),
          R(720, 210, 3, 380, TEAL)],
          notes: 'Tarta con un color por colección (el verde petróleo para la narrativa, que es casi la mitad del catálogo) y las tres colecciones a la derecha. Porcentajes de ejemplo.' },
        { layout: 'blank', bg: CREAM, transition: 'push', extra: [
          kicker('PARA LIBRERÍAS', 60, 60, 500),
          T('Hoja de<br>pedido', 60, 92, 340, 120, 50, INK, RB, { fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }),
          T('Escribe los ejemplares: el importe, el descuento de librería y el total se calculan con fórmulas.', 60, 230, 300, 200, 22, GREY, RB, { lineHeight: 1.45 }),
          T('30 %', 60, 440, 300, 110, 96, TEAL, RB, { fontWeight: 700, letterSpacing: -3 }),
          T('de descuento en novedades', 60, 550, 300, 40, 20, INK, RB),
          tableBlock({ x: 420, y: 100, w: 800, h: 540, fontSize: 22, header: true, lines: true, headBg: TEAL, headFg: '#ffffff', stroke: '#cfc6b5', colW: [5, 2, 2, 2], fontFamily: RB,
            rows: [['Título', 'PVP', 'Ejemplares', 'Importe'], ['El año del faro', '21,90 €', '10', '=B2*C2'], ['Agua quieta', '18,50 €', '6', '=B3*C3'], ['Ciudades menores', '16,00 €', '4', '=B4*C4'],
              ['La última cosecha', '19,50 €', '8', '=B5*C5'], ['Subtotal', '', '=SUMA(C2:C5)', '=SUMA(D2:D5)'], ['Descuento (30 %)', '', '', '=D6*0,3'], ['<b>Total</b>', '', '', '=D6-D7']] })],
          notes: 'Tabla con fórmulas encadenadas: importe por título, subtotal, descuento y total (=D6-D7). Cambia los ejemplares y todo se recalcula. Precios de ejemplo.' },
        { layout: 'blank', bg: INK, transition: 'push', extra: [
          kicker('CALENDARIO', 60, 60, 500, '#6fd1cc'),
          T('Cuándo llega<br>cada libro', 60, 92, 420, 150, 50, CREAM, RB, { fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }),
          T('Fechas de llegada a librerías. Las presentaciones con autor se anuncian dos semanas antes.', 60, 270, 380, 140, 20, '#b5ada2', RB, { lineHeight: 1.45 }),
          R(520, 70, 2, 580, '#4a453e'),
          ...[['SEP', '18', 'El año del faro', 'Narrativa'], ['OCT', '02', 'Agua quieta', 'Narrativa'], ['OCT', '23', 'Ciudades menores', 'Ensayo breve'], ['NOV', '13', 'La última cosecha', 'Narrativa'], ['DIC', '04', 'Poesía reunida', 'Verso suelto']].flatMap(([m, d, t, c], i) => { const y = 80 + i * 112;
            return [at(R(512, y + 18, 18, 18, TEAL), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 250 }),
              at(T(`<b style="font-size:40px;color:#ffffff">${d}</b> <span style="color:#6fd1cc">${m}</span>`, 560, y, 220, 60, 20, CREAM, RB, { letterSpacing: 2 }), 'fade-right', { start: 'withPrev', duration: 250 }),
              at(T(`<b style="font-size:26px">${t}</b><br><span style="color:#b5ada2">${c}</span>`, 780, y, 440, 80, 20, CREAM, RB, { lineHeight: 1.35 }), 'fade-right', { start: 'withPrev', duration: 250 })]; })],
          notes: 'Calendario vertical hecho con formas y texto: un clic y las cinco fechas entran encadenadas. Fechas inventadas.' },
        { layout: 'blank', bg: CREAM, transition: 'push', extra: [
          kicker('TAMBIÉN EN DIGITAL', 60, 60, 500),
          T('Cada libro, el mismo día en papel y en pantalla', 60, 92, 520, 160, 44, INK, RB, { fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }),
          T(ul('Sin protección que moleste: marca de agua con tu nombre', 'La misma maqueta, adaptada a la pantalla', 'Un 40 % más barato que la edición en papel'), 60, 290, 520, 300, 22, INK, RB, { lineHeight: 1.5 }),
          { ...base(660, 110, 560, 420), type: 'image', src: ebook, alt: 'Una página del libro electrónico en una tableta', fit: 'cover', device: 'tablet' }],
          notes: 'La página del libro electrónico es un SVG dentro del marco de una tableta (Imagen ▸ Dispositivo). Precio orientativo.' },
        { layout: 'blank', bg: CREAM, transition: 'push', extra: [
          pollBlock({ kind: 'gaps', fontSize: 34, question: 'Completa la primera frase de «El año del faro»', x: 60, y: 60, w: 1160, h: 600,
            text: 'Aquel [invierno] aprendimos que la [luz] no avisa: gira, vuelve y nos encuentra siempre en el mismo [sitio].', options: [] })],
          notes: 'Actividad de completar huecos desde el móvil, para un club de lectura o una presentación en librería: la frase es la cita del libro del mes.' },
        { layout: 'blank', bg: TEAL, transition: 'fade', extra: [
          T('Leer despacio<br>también es leer.', 60, 120, 1000, 260, 100, '#ffffff', RB, { fontWeight: 700, lineHeight: 1, letterSpacing: -3 }),
          R(60, 440, 1160, 2, '#ffffff'),
          ...[['Ediciones Ladera', 'Calle del Molino 9, Logroño'], ['Pedidos', 'pedidos@ladera.example'], ['Prensa', 'prensa@ladera.example']].map(([a, b], i) =>
            T(`<b>${a}</b><br>${b}`, 60 + i * 390, 460, 360, 80, 22, '#ffffff', RB, { lineHeight: 1.45 }))],
          notes: 'Cierre a toda tinta en verde petróleo con el lema de la casa y los contactos en tres columnas.' },
      ]));
    } },


  // ============================================================================
  // 7 · A symphony orchestra's season: night blue, amber, concentric arcs like sound rings, numbers sitting on a stave.
  creative_swiss_orchestra: { name: 'Orquesta sinfónica: temporada 26/27', cat: 'creative',
    summary: 'Azul noche y ámbar: arcos que giran, texto curvo, cifras sobre un pentagrama, ciclos, tabla, ecuación, barras, votación y aplausos',
    make: () => {
      const BG = '#0d1626', AMB = '#ffb000', W = '#f4f1ea', G = '#8e97a8', RW = FF.raleway, LINE = '#2a3650';
      const kicker = (t, x, y, w, color = AMB) => T(t, x, y, w, 30, 16, color, RW, { fontWeight: 700, letterSpacing: 5 });
      // Sound rings: arcs of many radii, widths and lengths around one centre (an SVG of its own).
      const rings = (seed) => { let k = seed; const r = () => (k = (k * 9301 + 49297) % 233280) / 233280;
        return svgURL(1000, 1000, Array.from({ length: 13 }, (_, i) => { const rad = 70 + i * 34, a0 = r() * 360, len = 60 + r() * 220, a1 = a0 + len, P = a => [500 + rad * Math.cos(a * Math.PI / 180), 500 + rad * Math.sin(a * Math.PI / 180)];
          const [x0, y0] = P(a0), [x1, y1] = P(a1), amber = i % 4 === 1;
          return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${rad} ${rad} 0 ${len > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${amber ? AMB : W}" stroke-opacity="${amber ? 1 : 0.35 + r() * 0.4}" stroke-width="${amber ? 16 : 4 + Math.round(r() * 8)}" stroke-linecap="butt"/>`; }).join('')
          + `<circle cx="500" cy="500" r="34" fill="${AMB}"/>`); };
      return numbered(build({ name: 'Orquesta Sinfónica de Vallehondo · 26/27', palette: 'ocean', fonts: 'classic', title: { color: W } }, [
        { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
          withAnims(img(rings(7), 660, -120, 820, 820, 'Arcos concéntricos como ondas de sonido', { decorative: true }), A('spin360', { start: 'afterPrev', duration: 6000 })),
          kicker('ORQUESTA SINFÓNICA DE VALLEHONDO', 60, 60, 600),
          at(T('Temporada', 54, 300, 700, 120, 104, W, RW, { fontWeight: 300, letterSpacing: -2, lineHeight: 1 }), 'fade-up', { start: 'afterPrev', duration: 800, sound: 'chime' }),
          T('26/27', 54, 410, 700, 150, 140, AMB, RW, { fontWeight: 700, letterSpacing: -4, lineHeight: 1 }),
          T('dieciséis conciertos · cuatro ciclos · una ciudad', 40, 560, 560, 130, 20, G, RW, { curve: -14, letterSpacing: 4 })],
          notes: 'Portada inspirada en los carteles de conciertos suizos: arcos concéntricos (un SVG propio) que dan una vuelta lenta al empezar, y el título con un sonido de campanillas. Texto curvo abajo. Orquesta inventada.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          kicker('LA TEMPORADA EN CIFRAS', 60, 60, 600),
          T('Una partitura de números', 60, 92, 900, 70, 50, W, RW, { fontWeight: 700 }),
          ...Array.from({ length: 5 }, (_, i) => R(60, 340 + i * 40, 1160, 2, G, { opacity: 50 })),
          T('𝄞', 50, 280, 130, 260, 180, W, FF.lora, { lineHeight: 1 }),
          ...[['16', 'conciertos', 200, 340], ['4', 'ciclos', 470, 420], ['92', 'músicos', 740, 300], ['21.000', 'butacas vendidas en la 25/26', 980, 380]].flatMap(([n, l, x, y], i) => [
            at(E(x, y - 18, 56, 40, AMB, { rotation: -20 }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' }),
            at(T(`<b style="font-size:54px;color:${W}">${n}</b><br>${l}`, x - 20, y < 360 ? 530 : 190, 260, 130, 20, G, RW, { lineHeight: 1.2 }), 'fade-up', { start: 'withPrev', duration: 300 })])],
          notes: 'Cinco filetes forman un pentagrama y cada cifra es una nota ámbar que suena al entrar (sonido «pop»). Un clic y las cuatro llegan encadenadas. Cifras inventadas.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('CUATRO CICLOS', 60, 60, 600, '#b37a00'),
          T('Elige cómo escuchar', 60, 92, 900, 70, 50, BG, RW, { fontWeight: 700 }),
          ...[['Grandes sinfonías', 'Ocho conciertos de viernes con el repertorio de siempre.', 0], ['Cámara', 'Cuartetos y quintetos en el foyer, a media luz.', 90], ['En familia', 'Domingos a las doce, con cuentos y menos de una hora.', 180], ['Músicas de hoy', 'Estrenos de compositoras y compositores vivos.', 270]].flatMap(([t, d, rot], i) => {
            const x = 60 + (i % 2) * 590, y = 200 + Math.floor(i / 2) * 230;
            return [at(shape('blockarc', x, y, 150, 150, i % 2 ? BG : AMB, { rotation: rot }), 'spin', { start: i ? 'afterPrev' : 'click', duration: 500 }),
              at(T(`<b style="font-size:30px;color:${BG}">${t}</b><br>${d}`, x + 180, y + 20, 380, 140, 21, '#4a5163', RW, { lineHeight: 1.45 }), 'fade-left', { start: 'withPrev', duration: 400 })]; })],
          notes: 'Cada ciclo tiene su símbolo: el mismo medio anillo girado 0°, 90°, 180° y 270°, como en una identidad suiza. Entran girando, uno tras otro.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          kicker('OTOÑO', 60, 60, 600),
          T('Los primeros conciertos', 60, 92, 900, 70, 50, W, RW, { fontWeight: 700 }),
          tableBlock({ x: 60, y: 190, w: 1160, h: 430, fontSize: 22, header: true, banded: true, band: AMB, bandAlpha: 0.08, headBg: AMB, headFg: BG, stroke: LINE, colW: [2, 6, 3, 3], fontFamily: RW,
            rows: [['Fecha', 'Programa', 'Dirección', 'Solista'], ['Vie 25 sep', 'Sinfonía «Del Nuevo Mundo» · Obertura de temporada', 'Elena Brandt', '—'], ['Vie 9 oct', 'Concierto para violín y orquesta · Danzas sinfónicas', 'Pablo Ureña', 'Mei Arasaki, violín'],
              ['Dom 18 oct', 'Pedro y el lobo (en familia)', 'Lucía Garrido', 'Narradora: Inés Lago'], ['Vie 6 nov', 'Réquiem · con el Coro de Vallehondo', 'Elena Brandt', 'Cuatro voces solistas'], ['Jue 26 nov', 'Tres estrenos de hoy', 'Ana Soler', 'Ensemble de la orquesta']] })],
          notes: 'Tabla con cabecera ámbar y bandas muy suaves para leer las filas en la penumbra. Directores, solistas y fechas inventados.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          img(rings(31), 700, 120, 520, 520, 'Arcos concéntricos', { decorative: true, opacity: 60 }),
          kicker('ANTES DE EMPEZAR', 60, 60, 600),
          T('La orquesta afina en La', 60, 92, 900, 70, 50, W, RW, { fontWeight: 700 }),
          T('El oboe da el La de 440 hercios y todos se ajustan a él. Las demás notas salen de una sola fórmula:', 60, 190, 620, 100, 24, G, RW, { lineHeight: 1.45 }),
          mathBlock({ x: 60, y: 300, w: 620, h: 140, fontSize: 52, color: W, latex: 'f(n) = 440 \\cdot 2^{\\frac{n-49}{12}}\\ \\text{Hz}' }),
          ...[['La 4', 'n = 49', '440 Hz'], ['Do 5', 'n = 52', '523,3 Hz'], ['La 5', 'n = 61', '880 Hz']].map(([nm, n, f], i) =>
            at(T(`<b style="color:${AMB};font-size:26px">${nm}</b><br>${n}<br><b style="color:${W}">${f}</b>`, 60 + i * 210, 480, 190, 120, 20, G, RW, { lineHeight: 1.4 }), 'fade-up', { start: i ? 'afterPrev' : 'click' }))],
          notes: 'Ecuación de la afinación temperada: cada semitono multiplica la frecuencia por la raíz duodécima de dos; n es la tecla del piano. Tres ejemplos entran con un clic.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('ABONOS', 60, 60, 600, '#b37a00'),
          T('Abonarse sale a cuenta', 60, 92, 900, 70, 50, BG, RW, { fontWeight: 700 }),
          chartBlock({ x: 60, y: 180, w: 760, h: 480, chartType: 'bar', color: BG, seriesName: 'Con abono (€)', grid: true, dataLabels: true,
            data: [{ label: 'Completo (16)', value: 320 }, { label: 'Sinfónico (8)', value: 180 }, { label: 'Familias (4)', value: 40 }, { label: 'Joven (16)', value: 96 }],
            series: [{ name: 'Entradas sueltas (€)', values: [480, 240, 60, 480], color: AMB }] }),
          T(`<div style="font-family:${RW};font-size:110px;font-weight:700;line-height:1;color:${BG}">6 €</div><div style="margin-top:12px">por concierto con el abono joven, para menores de 30 años.</div>`, 870, 220, 350, 330, 24, '#4a5163', RW, { lineHeight: 1.4 })],
          notes: 'Barras agrupadas: precio del abono frente a comprar las mismas entradas sueltas. El ahorro del abono joven es el mensaje. Precios de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          img(rings(55), -260, 260, 700, 700, 'Arcos concéntricos', { decorative: true, opacity: 50 }),
          pollBlock({ fontSize: 30, display: 'pie', question: '¿Qué obra te gustaría escuchar la próxima temporada?', x: 380, y: 60, w: 840, h: 600,
            options: ['Una sinfonía romántica', 'Una ópera en versión de concierto', 'Bandas sonoras de cine', 'Un estreno encargado por la orquesta'] })],
          notes: 'Votación en directo con resultado en tarta: el público elige desde el móvil y lo tenemos en cuenta para la temporada 27/28.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          withAnims(img(rings(7), 210, -150, 860, 860, 'Arcos concéntricos', { decorative: true, opacity: 70 }), A('spin360', { start: 'afterPrev', duration: 9000 })),
          at(T('Nos vemos<br>en la sala', 60, 230, 1160, 260, 110, W, RW, { fontWeight: 700, textAlign: 'center', lineHeight: 1, letterSpacing: -2 }), 'zoom-in', { start: 'afterPrev', duration: 700, sound: 'applause' }),
          T('Abonos a la venta desde el 1 de septiembre · orquestavallehondo.example', 140, 620, 1000, 44, 20, AMB, RW, { textAlign: 'center', letterSpacing: 2, bg: BG, pad: [8, 12, 8, 12] })],
          notes: 'Cierre: los arcos giran detrás y el título entra con un aplauso (sonido de la animación). Buen momento para dar las fechas de venta.' },
      ]));
    } },


  // ============================================================================
  // 8 · The visual identity of a school sports games: white, one magenta, pictograms drawn on a geometric system.
  creative_swiss_games: { name: 'Juegos escolares: la identidad', cat: 'creative',
    summary: 'Blanco y magenta, paleta propia: pictogramas en SVG, figura 3D que recorre la ciudad, líneas, medallero con fórmulas, pasos y concurso',
    make: () => {
      const W = '#ffffff', MG = '#e4007c', K = '#1a1a1a', G = '#6d6d6d', PALE = '#fbe5f1', UB = FF.ubuntu;
      const kicker = (t, x, y, w, color = MG) => T(t, x, y, w, 30, 16, color, UB, { fontWeight: 700, letterSpacing: 4 });
      // Pictograms on a 200 × 200 grid: round-capped strokes and a round head (one stroke width for all).
      const FIG = {
        atletismo: { head: [116, 40], lines: [[[108, 62], [90, 118]], [[104, 76], [132, 96], [152, 82]], [[104, 76], [78, 92], [64, 74]], [[90, 118], [122, 140], [118, 180]], [[90, 118], [68, 150], [36, 158]]] },
        natación: { head: [154, 92], lines: [[[66, 110], [132, 102]], [[112, 104], [140, 70], [172, 62]], [[66, 110], [30, 118]]], waves: true },
        ciclismo: { head: [124, 44], lines: [[[60, 150], [100, 112], [150, 150]], [[100, 112], [116, 68]], [[116, 72], [146, 100]], [[100, 112], [96, 150]]], wheels: true },
        baloncesto: { head: [92, 40], lines: [[[94, 62], [100, 120]], [[96, 74], [122, 44], [130, 26]], [[96, 74], [70, 100]], [[100, 120], [80, 176]], [[100, 120], [128, 170]]], ball: [154, 22] },
        fútbol: { head: [82, 40], lines: [[[84, 62], [92, 120]], [[86, 74], [60, 102]], [[86, 74], [116, 94]], [[92, 120], [72, 176]], [[92, 120], [130, 150]]], ball: [156, 166] },
        salto: { head: [40, 86], lines: [[[58, 96], [100, 76], [140, 96]], [[140, 96], [172, 120]], [[80, 84], [70, 120]]], bar: true },
      };
      const picto = (kind, color, bg = 'none') => { const f = FIG[kind], pl = pts => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
        return svgURL(200, 200, f.lines.map(pl).join('') + `<circle cx="${f.head[0]}" cy="${f.head[1]}" r="17" fill="${color}"/>`
          + (f.ball ? `<circle cx="${f.ball[0]}" cy="${f.ball[1]}" r="15" fill="${color}"/>` : '') + (f.wheels ? `<circle cx="56" cy="150" r="30" fill="none" stroke="${color}" stroke-width="10"/><circle cx="154" cy="150" r="30" fill="none" stroke="${color}" stroke-width="10"/>` : '')
          + (f.waves ? [140, 168].map(y => `<path d="M20 ${y} q20 -14 40 0 t40 0 t40 0 t40 0" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>`).join('') : '')
          + (f.bar ? `<line x1="20" y1="150" x2="180" y2="150" stroke="${color}" stroke-width="8" stroke-linecap="round"/><line x1="20" y1="150" x2="20" y2="190" stroke="${color}" stroke-width="8"/><line x1="180" y1="150" x2="180" y2="190" stroke="${color}" stroke-width="8"/>` : ''), bg); };
      const deck = numbered(build({ name: 'Juegos Escolares Vallehondo 27', palette: 'office', fonts: 'modern', title: { color: K } }, [
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          R(0, 0, 600, 720, MG),
          at(img(picto('atletismo', W), 80, 120, 440, 440, 'Pictograma de una persona corriendo'), 'fade-right', { start: 'afterPrev', duration: 700 }),
          kicker('IDENTIDAD VISUAL', 660, 60, 500),
          T('Juegos<br>Escolares', 656, 100, 580, 230, 96, K, UB, { fontWeight: 700, lineHeight: 1, letterSpacing: -2 }),
          T('Vallehondo 27', 660, 330, 580, 80, 56, MG, UB, { fontWeight: 700 }),
          R(660, 440, 560, 2, K),
          ...[['1.800', 'deportistas'], ['12', 'deportes'], ['9', 'días']].map(([n, l], i) => T(`<b style="font-size:44px">${n}</b><br>${l}`, 660 + i * 190, 460, 180, 100, 20, G, UB, { lineHeight: 1.2 })),
          T('Del 3 al 11 de julio de 2027', 660, 610, 560, 40, 22, K, UB)],
          notes: 'Portada de la identidad: el pictograma de atletismo, dibujado en SVG, entra solo sobre el campo magenta. Un único color y una sola familia tipográfica (Ubuntu). Juegos inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('EL SISTEMA', 60, 60, 500),
          T('Seis pictogramas, una regla', 60, 92, 900, 70, 50, K, UB, { fontWeight: 700, letterSpacing: -1 }),
          T('Un solo grosor de trazo, cabeza redonda y ángulos de 45°: así se reconocen de lejos.', 60, 160, 1000, 40, 22, G, UB),
          ...Object.keys(FIG).flatMap((k, i) => { const x = 60 + i * 197, y = 260;
            return [at(R(x, y, 180, 180, PALE), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 }),
              at(img(picto(k, MG), x + 10, y + 10, 160, 160, 'Pictograma de ' + k), 'zoom-in', { start: 'withPrev', duration: 300 }),
              at(T(k[0].toUpperCase() + k.slice(1), x, y + 196, 180, 40, 22, K, UB, { fontWeight: 700, textAlign: 'center' }), 'fade-up', { start: 'withPrev', duration: 300 })]; }),
          R(60, 560, 1160, 1, '#dddddd'),
          T('Trazo 16 · cabeza 34 · rejilla de 200 × 200', 60, 580, 700, 40, 18, G, FF.mono)],
          notes: 'Los seis pictogramas están dibujados en la propia plantilla con líneas de trazo redondo: cada clic los coloca en cadena sobre su cuadrado rosa.' },
        { layout: 'blank', bg: PALE, transition: 'push', extra: [
          kicker('LA LLAMA', 60, 60, 500),
          T('Ocho kilómetros por los barrios', 60, 92, 1000, 70, 50, K, UB, { fontWeight: 700, letterSpacing: -1 }),
          ...[0, 1, 2, 3].map(i => R(0, 560 + i * 36, 1280, 3, MG, { opacity: 40 + i * 15 })),
          ...[['Salida', 'Plaza Mayor', 80], ['Km 3', 'Barrio del Río', 420], ['Km 6', 'Colegio Las Eras', 760], ['Meta', 'Estadio', 1080]].map(([a, b, x]) =>
            T(`<b style="color:${MG}">${a}</b><br>${b}`, x, 200, 180, 70, 20, K, UB, { lineHeight: 1.3 })),
          ...[80, 420, 760, 1080].map(x => R(x, 280, 3, 260, MG, { opacity: 50 })),
          withAnims(m3d('kh-CesiumMan', 20, 300, 220, 300, { view: 'front', walk: { clip: '*', face: true, look: true } }),
            path([[340, 0], [680, 0], [1000, 0]], { duration: 7000 }))],
          notes: 'Clic: la figura 3D recorre andando las cuatro etapas del relevo de la llama (animación de trayectoria; Modelo 3D ▸ Al moverse). Las bandas magenta hacen de calles de la pista.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('INSCRIPCIONES', 60, 60, 500),
          T('El mes de las inscripciones', 60, 92, 900, 70, 50, K, UB, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 60, y: 180, w: 800, h: 480, chartType: 'line', color: MG, seriesName: 'Chicas', grid: true, xTitle: 'Semana', yTitle: 'Inscripciones acumuladas',
            data: [{ label: '1', value: 90 }, { label: '2', value: 260 }, { label: '3', value: 590 }, { label: '4', value: 980 }],
            series: [{ name: 'Chicos', values: [160, 380, 620, 940], color: K }] }),
          T(`<div style="font-size:110px;font-weight:700;line-height:1;color:${MG}">51 %</div><div style="margin-top:12px">de las inscripciones son de chicas: la primera edición en la que superan a los chicos.</div>`, 900, 220, 320, 340, 22, K, UB, { lineHeight: 1.4 })],
          notes: 'Líneas con dos series: chicas en magenta y chicos en negro. Se cruzan en la última semana. Datos inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('MEDALLERO', 60, 60, 500),
          T('Tras la primera semana', 60, 92, 900, 70, 50, K, UB, { fontWeight: 700, letterSpacing: -1 }),
          tableBlock({ x: 60, y: 190, w: 820, h: 440, fontSize: 24, header: true, lines: true, headBg: K, headFg: W, stroke: '#cfcfcf', colW: [5, 2, 2, 2, 2], fontFamily: UB,
            rows: [['Colegio', 'Oro', 'Plata', 'Bronce', 'Total'], ['CEIP Las Eras', '9', '6', '4', '=SUMA(IZQUIERDA)'], ['IES Río Claro', '7', '8', '7', '=SUMA(IZQUIERDA)'], ['Colegio San Blas', '6', '5', '9', '=SUMA(IZQUIERDA)'],
              ['IES Vallehondo', '4', '7', '5', '=SUMA(IZQUIERDA)'], ['CEIP El Molino', '2', '3', '6', '=SUMA(IZQUIERDA)'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
          ...[['#d4a017', 'Oro'], ['#a7a9ac', 'Plata'], ['#b0703c', 'Bronce']].map(([c, l], i) => withAnims(E(960 + i * 90, 260, 70, 70, c), A('bounce', { start: i ? 'afterPrev' : 'click', duration: 600 }))),
          T('Cada total se suma solo, por filas y por columnas.', 940, 360, 280, 120, 22, G, UB, { lineHeight: 1.4 })],
          notes: 'Medallero con fórmulas: el total de cada colegio es =SUMA(IZQUIERDA) y la última fila suma hacia arriba. Las tres medallas botan con un clic. Resultados inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('LA COMPETICIÓN', 60, 60, 500),
          T('De la inauguración a las finales', 60, 92, 1000, 70, 50, K, UB, { fontWeight: 700, letterSpacing: -1 }),
          dg('steps', 'Inauguración\nFase de grupos\nCuartos\nSemifinales\nFinales y clausura', 60, 200, 1160, 420, { colors: 'accent', oneByOne: true })],
          notes: 'Diagrama de escalones que sube paso a paso (uno a uno): cada clic, una fase más cerca de la final.' },
        { layout: 'blank', bg: PALE, transition: 'push', extra: [
          pollBlock({ kind: 'quiz', fontSize: 32, question: '¿Qué pictograma usa olas en su dibujo?', options: ['Atletismo', 'Natación', 'Ciclismo', 'Salto'], correct: [1], time: 15, x: 60, y: 60, w: 1160, h: 600 })],
          notes: 'Pregunta de concurso desde el móvil: puntos por acertar y por rapidez. Sirve para comprobar que se ha entendido el sistema de pictogramas.' },
        { layout: 'blank', bg: MG, transition: 'zoom', extra: [
          img(picto('baloncesto', W), 820, 140, 380, 380, 'Pictograma de baloncesto'),
          T('¿Te apuntas<br>de voluntario?', 60, 140, 760, 240, 88, W, UB, { fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }),
          T('Buscamos 400 personas para cronometrar, acompañar y animar.', 64, 400, 700, 80, 28, W, UB, { lineHeight: 1.35 }),
          T('juegosvallehondo.example/voluntariado', 64, 540, 700, 50, 26, K, UB, { fontWeight: 700, bg: W, pad: [10, 16, 10, 16], radius: 0 }),
          credits(['kh-CesiumMan'], 60, 664, 1160, '#ffd1e8')],
          notes: 'Cierre a toda tinta en magenta con el pictograma en blanco y la llamada al voluntariado.' },
      ]));
      // (A palette of its own, the games' colours: diagrams and new objects take the magenta.)
      return Object.assign(deck, { palette: 'custom', customPalette: { name: 'Juegos 27', bg: W, fg: K, accents: [MG, K, '#f07ab8', '#6d6d6d', '#b8005f', '#fbe5f1'] } });
    } },


  // ============================================================================
  // 9 · A type foundry presents a new typeface: a specimen — giant letters, measured anatomy, a size scale, a glyph grid, one violet.
  creative_swiss_typeface: { name: 'Muestrario de una tipografía nueva', cat: 'creative',
    summary: 'Muestrario en blanco y violeta: letras que viajan con Transformar, anatomía medida, escala con fórmula, glifos, radar y licencias',
    make: () => {
      const W = '#fafafa', K = '#0a0a0a', VI = '#5b2bff', G = '#737373', LG = '#e4e4e4', DM = FF.dm, MO = FF.mono;
      const AA = uid();
      const kicker = (t, x, y, w, color = VI) => T(t, x, y, w, 30, 15, color, MO, { fontWeight: 700, letterSpacing: 3 });
      const aa = (x, y, w, h, size, color = K) => withId(T('Aa', x, y, w, h, size, color, DM, { fontWeight: 700, lineHeight: 1, letterSpacing: -12 }), AA);
      // The anatomy lines of «Hxg» set at 360 px (box top at 150): ascender, cap height, x-height, baseline, descender.
      const LINES = [['Altura de mayúsculas', 205], ['Altura de la x', 275], ['Línea base', 458], ['Descendente', 538]];
      return numbered(build({ name: 'Lago Grotesk · muestrario', palette: 'grayscale', fonts: 'clean', title: { color: K } }, [
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          aa(40, 90, 760, 440, 420),
          R(700, 90, 40, 40, VI),
          kicker('FUNDICIÓN TIPOS DEL LAGO · 2027', 60, 50, 600, K),
          T('Lago Grotesk', 820, 300, 420, 70, 50, K, DM, { fontWeight: 700, letterSpacing: -1 }),
          T('Una palo seco para pantallas pequeñas y carteles grandes. Dos pesos, sus cursivas y 612 glifos.', 820, 380, 400, 140, 22, G, DM, { lineHeight: 1.45 }),
          R(820, 560, 400, 1, K),
          T('Regular · <b>Negrita</b> · <i>Cursiva</i>', 820, 576, 400, 40, 22, K, DM)],
          notes: 'Portada de muestrario: dos letras enormes, un cuadrado violeta como único color y la ficha a la derecha. La fundición y la tipografía son inventadas; en pantalla se muestra con DM Sans.' },
        { layout: 'blank', bg: W, autoAnimate: true, transition: 'none', extra: [
          aa(1040, 30, 200, 110, 100, VI),
          kicker('ANATOMÍA', 60, 50, 400),
          T('Hxg', 60, 150, 680, 400, 360, K, DM, { fontWeight: 700, lineHeight: 1, letterSpacing: -6 }),
          ...LINES.flatMap(([l, y], i) => [
            at(R(40, y, 820, 2, i === 2 ? VI : G, { opacity: i === 2 ? 100 : 70 }), 'fade-right', { start: i ? 'afterPrev' : 'click', duration: 400 }),
            at(T(`${l}`, 880, y - 16, 340, 34, 20, i === 2 ? VI : K, MO), 'fade-left', { start: 'withPrev', duration: 400 })]),
          T('Altura de la x generosa: un 70 % de la mayúscula. Se lee bien a 12 px.', 880, 600, 340, 80, 18, G, DM, { lineHeight: 1.4 })],
          notes: 'Transformar: el «Aa» de la portada viaja a la esquina en violeta. Con un clic, las líneas guía se trazan una tras otra (la línea base, en violeta).' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('ESCALA', 60, 50, 400),
          T('Siete tamaños que se llevan bien', 60, 80, 900, 60, 44, K, DM, { fontWeight: 700, letterSpacing: -1 }),
          mathBlock({ x: 820, y: 170, w: 400, h: 100, fontSize: 40, color: VI, latex: 's_n = 16 \\cdot 1{,}25^{\\,n}' }),
          T('Cada tamaño es el anterior por 1,25 (una tercera mayor, como en música).', 830, 290, 380, 100, 20, G, DM, { lineHeight: 1.45 }),
          ...[16, 20, 25, 31, 39, 49, 61].reduce((acc, s, i) => { const y = acc.y; acc.out.push(
            at(T(`<span style="font-family:${MO};font-size:14px;color:${G}">${s}</span>`, 60, y + s * 0.5, 50, 24, 14, G, MO), 'fade-up', { start: i ? 'afterPrev' : 'click', duration: 200 }),
            at(T('Lago lee lejos', 120, y, 680, Math.round(s * 1.25), s, i === 6 ? VI : K, DM, { fontWeight: i > 3 ? 700 : 400, lineHeight: 1.1 }), 'fade-up', { start: 'withPrev', duration: 200 }));
            acc.y += Math.round(s * 1.25) + 10; return acc; }, { y: 170, out: [] }).out],
          notes: 'Escala modular: la fórmula (bloque de ecuación) da cada tamaño a partir de 16 px. Los siete tamaños entran en cadena con un clic.' },
        { layout: 'blank', bg: K, transition: 'push', extra: [
          kicker('JUEGO DE CARACTERES', 60, 50, 600, '#a991ff'),
          T('612 glifos, del ñ al ¿', 60, 80, 900, 60, 44, W, DM, { fontWeight: 700, letterSpacing: -1 }),
          ...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789¿?¡!áéíóú€&@'.slice(0, 80).split('').map((c, i) => { const x = 60 + (i % 16) * 72.5, y = 170 + Math.floor(i / 16) * 98;
            return at(T(c, x, y, 70, 92, 46, c === 'Ñ' || c === 'ñ' ? W : '#d9d9d9', DM, { fontWeight: 700, textAlign: 'center', vAlign: 'middle', bg: c === 'Ñ' || c === 'ñ' ? VI : '#1c1c1c', pad: [0, 0, 0, 0], radius: 0 }),
              'fade-in', { start: i % 16 ? 'withPrev' : (i ? 'afterPrev' : 'click'), duration: 250 }); })],
          notes: 'Rejilla de glifos de 16 columnas sobre negro; la eñe, en violeta, porque la tipografía nació para el español. Cada fila entra después de la anterior.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('LEGIBILIDAD', 60, 50, 400),
          T('Lo que no se confunde', 60, 80, 900, 60, 44, K, DM, { fontWeight: 700, letterSpacing: -1 }),
          R(640, 170, 1, 470, K),
          ...[['Grotesca clásica', FF.helv, K, 60], ['Lago Grotesk', DM, VI, 680]].flatMap(([n, f, c, x], j) => [
            T(n, x, 180, 520, 40, 20, c, MO, { fontWeight: 700 }),
            at(T('Il1 rn m<br>Ill-lit 1990', x, 230, 540, 260, 92, K, f, { lineHeight: 1.15 }), j ? 'fade-left' : 'fade-right', { start: j ? 'afterPrev' : 'click', duration: 500 }),
            T(j ? 'La ele lleva cola, la i mayúscula tiene remates y el uno, bandera: tres letras que ya no se confunden.' : 'La i mayúscula, la ele y el uno se parecen demasiado. Y «rn» puede leerse «m».',
              x, 520, 520, 110, 20, G, DM, { lineHeight: 1.45 })])],
          notes: 'Comparativa a dos columnas. A la izquierda, una grotesca clásica; a la derecha, la nuestra (simulada con DM Sans, que también distingue mejor estas letras).' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('CARÁCTER', 60, 50, 400),
          T('Su forma, en seis medidas', 60, 80, 600, 60, 44, K, DM, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 40, y: 160, w: 640, h: 500, chartType: 'radar', color: VI, seriesName: 'Lago Grotesk', yMin: 0, yMax: 10,
            data: [{ label: 'Altura de x', value: 9 }, { label: 'Apertura', value: 8 }, { label: 'Anchura', value: 6 }, { label: 'Contraste', value: 3 }, { label: 'Espaciado', value: 7 }, { label: 'Peso', value: 6 }],
            series: [{ name: 'Grotesca clásica', values: [6, 4, 6, 2, 5, 6], color: '#a3a3a3' }] }),
          T('<b>Más abierta y más alta</b><br>Las letras «c», «e» y «s» tienen la boca más abierta: en tamaños pequeños no se cierran y se distinguen mejor.', 760, 220, 460, 200, 24, K, DM, { lineHeight: 1.45 }),
          T('Escala de 0 a 10, medida sobre la «n» y la «o».', 760, 480, 460, 70, 18, G, MO)],
          notes: 'Radar con dos series: la nueva tipografía frente a una grotesca clásica. Medidas orientativas, inventadas para la plantilla.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('LICENCIAS', 60, 50, 400),
          T('Lo que cuesta usarla', 60, 80, 600, 60, 44, K, DM, { fontWeight: 700, letterSpacing: -1 }),
          tableBlock({ x: 60, y: 170, w: 780, h: 420, fontSize: 22, header: true, lines: true, headBg: K, headFg: W, stroke: '#cfcfcf', colW: [4, 3, 2, 3], fontFamily: DM,
            rows: [['Licencia', 'Por estilo', 'Estilos', 'Total'], ['Escritorio', '40 €', '4', '=B2*C2'], ['Web (hasta 100.000 visitas)', '60 €', '4', '=B3*C3'], ['Aplicación móvil', '120 €', '2', '=B4*C4'], ['<b>Pedido de ejemplo</b>', '', '=SUMA(C2:C4)', '=SUMA(D2:D4)']] }),
          T('−30 %', 900, 180, 320, 110, 96, VI, DM, { fontWeight: 700, letterSpacing: -3 }),
          T('para estudiantes y entidades sin ánimo de lucro.', 904, 300, 300, 110, 22, K, DM, { lineHeight: 1.4 })],
          notes: 'Tabla de licencias con fórmulas: total por línea (=B2*C2) y suma del pedido. Precios inventados.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          T('Ag', 40, 60, 360, 300, 260, VI, DM, { fontWeight: 700, lineHeight: 1, letterSpacing: -8 }),
          T('La próxima: una versión estrecha para titulares.', 60, 380, 320, 160, 28, K, DM, { lineHeight: 1.3 }),
          pollBlock({ fontSize: 30, display: 'bar', question: '¿Cómo la llamamos?', x: 440, y: 60, w: 780, h: 600, options: ['Lago Condensed', 'Lago Estrecha', 'Lago Titular', 'Junco'] })],
          notes: 'Votación en directo para bautizar la siguiente variante. Muy útil al final de una presentación de lanzamiento.' },
        { layout: 'blank', bg: K, transition: 'zoom', extra: [
          T('Gracias', 50, 180, 1180, 300, 260, VI, DM, { wordart: 'fill', wordartColor: VI, letterSpacing: -12, lineHeight: 1 }),
          R(60, 500, 1160, 1, '#404040'),
          T('Descarga la versión de prueba en tiposdellago.example', 60, 520, 800, 40, 22, W, DM),
          T('Lago Grotesk 1.0', 900, 520, 320, 40, 22, G, MO, { textAlign: 'right' })],
          notes: 'Cierre con la palabra en Text Art de relleno violeta, a toda la anchura sobre negro.' },
      ]));
    } },


  // ============================================================================
  // 10 · A blood donation campaign: a Swiss public-service poster — white, one blood red, a drop that grows to fill the screen (Transform).
  creative_swiss_blood: { name: 'Campaña: dona sangre', cat: 'creative',
    summary: 'Cartel público en blanco y rojo: gota que llena la pantalla con Transformar, proceso, sí o espera, dona, barras, móvil y concurso',
    make: () => {
      const W = '#ffffff', RED = '#d0021b', K = '#141414', G = '#666666', PINK = '#fde8ea', HV = FF.helv, DROP = uid(), HEAD = uid();
      const kicker = (t, x, y, w, color = RED) => T(t, x, y, w, 30, 16, color, HV, { fontWeight: 700, letterSpacing: 4 });
      const drop = (x, y, w, h, props = {}) => withId(shape('teardrop', x, y, w, h, RED, props), DROP);
      const head = (html, x, y, w, h, size, color) => withId(T(html, x, y, w, h, size, color, HV, { fontWeight: 700, lineHeight: 1, letterSpacing: -3 }), HEAD);
      // The booking app on the phone.
      const appBook = svgURL(360, 720, `<rect width="360" height="150" fill="${RED}"/>` + S(24, 70, 18, '#ffffffcc', 'Donar sangre') + S(24, 112, 30, '#fff', 'Pide tu cita', ' font-weight="700"')
        + S(24, 196, 16, '#666', 'POLIDEPORTIVO SUR · JUEVES 14', ' letter-spacing="1"')
        + ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'].map((h, i) => { const x = 24 + (i % 2) * 162, y = 220 + Math.floor(i / 2) * 76, on = i === 3, off = i === 1 || i === 6;
          return `<rect x="${x}" y="${y}" width="150" height="60" fill="${on ? RED : '#fff'}" stroke="${off ? '#ddd' : RED}" stroke-width="2"/>` + S(x + 75, y + 38, 20, on ? '#fff' : off ? '#bbb' : K, h, ' text-anchor="middle" font-weight="700"'); }).join('')
        + `<rect x="24" y="560" width="312" height="64" fill="${K}"/>` + S(180, 600, 20, '#fff', 'Confirmar 18:30', ' text-anchor="middle" font-weight="700"'), '#f7f7f7');
      const deck = numbered(build({ name: 'Dona sangre · campaña de otoño', palette: 'forest', fonts: 'websafe', title: { color: K } }, [
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          at(drop(800, 60, 400, 560), 'zoom-in', { start: 'afterPrev', duration: 700, sound: 'pop' }),
          kicker('CAMPAÑA DE OTOÑO · HERMANDAD DE DONANTES', 60, 60, 700),
          head('Una bolsa.<br>Tres vidas.', 56, 150, 720, 300, 120, K),
          T('Dona sangre: tarda menos que un café y no se puede fabricar.', 60, 470, 620, 90, 28, G, HV, { lineHeight: 1.35 }),
          R(60, 600, 120, 10, RED)],
          notes: 'Cartel de servicio público a la suiza: tipografía de palo seco, todo a la izquierda y una gota roja enorme que entra sola. Campaña y entidad inventadas.' },
        { layout: 'blank', bg: W, autoAnimate: true, transition: 'none', extra: [
          drop(-600, -600, 2480, 1900),
          at(R(0, 0, 1280, 720, RED), 'fade-in', { start: 'afterPrev', duration: 300 }),
          head('Cada<br>2 segundos', 60, 120, 1100, 280, 130, W),
          T('alguien en un hospital necesita una transfusión. Operaciones, partos, accidentes, tratamientos contra el cáncer.', 64, 440, 760, 140, 30, W, HV, { lineHeight: 1.4 })],
          notes: 'Transformar: la gota de la portada crece hasta llenar toda la pantalla y el titular cambia de sitio y de color. Dato orientativo, citado a menudo en campañas.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('CÓMO ES DONAR', 60, 60, 600),
          T('Cuatro pasos, 40 minutos', 60, 92, 900, 70, 52, K, HV, { fontWeight: 700, letterSpacing: -1 }),
          dg('process', 'Formulario\nCharla con el médico\nDonación: 10 minutos\nDescanso y bocadillo', 60, 220, 1160, 260, { colors: 'accent', oneByOne: true }),
          T('Trae tu DNI y no vengas en ayunas.', 60, 540, 900, 50, 28, RED, HV, { fontWeight: 700 })],
          notes: 'Diagrama de proceso que aparece paso a paso. La donación en sí dura unos diez minutos; con la entrevista y el descanso, unos cuarenta.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('¿PUEDO DONAR?', 60, 60, 600),
          R(0, 160, 640, 560, PINK), R(640, 160, 640, 560, '#f2f2f2'),
          T('Sí, si…', 60, 190, 560, 70, 52, RED, HV, { fontWeight: 700 }),
          T('Mejor espera si…', 700, 190, 560, 70, 52, K, HV, { fontWeight: 700 }),
          ...[['tienes entre 18 y 65 años', 'pesas más de 50 kilos', 'te encuentras bien hoy', 'han pasado 2 meses desde la última vez'], ['tienes fiebre o un resfriado', 'te has hecho un tatuaje hace menos de 4 meses', 'estás embarazada o acabas de dar a luz', 'has viajado hace poco a zonas con paludismo']].flatMap((list, j) =>
            list.flatMap((t, i) => [at(icon(j ? 'close' : 'check', 60 + j * 640, 290 + i * 90, 44, j ? K : RED), 'zoom-in', { start: i || j ? 'afterPrev' : 'click', duration: 250 }),
              at(T(t, 120 + j * 640, 290 + i * 90, 480, 70, 24, K, HV, { lineHeight: 1.3 }), 'fade-left', { start: 'withPrev', duration: 250 })]))],
          notes: 'Comparativa a dos columnas con iconos: un clic y los requisitos aparecen en cadena. Orientativo: el equipo médico decide siempre el día de la donación.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          kicker('GRUPOS SANGUÍNEOS', 60, 60, 600),
          T('¿Cuál es el tuyo?', 60, 92, 600, 70, 52, K, HV, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 40, y: 180, w: 700, h: 480, chartType: 'doughnut', color: RED,
            data: [{ label: '0+', value: 36, color: RED }, { label: 'A+', value: 34, color: '#e8495c' }, { label: '0−', value: 9, color: K }, { label: 'A−', value: 8, color: '#4d4d4d' },
              { label: 'B+', value: 8, color: '#f29aa5' }, { label: 'AB+', value: 3, color: '#f8c9cf' }, { label: 'B− y AB−', value: 2, color: '#b3b3b3' }] }),
          T(`<div style="font-size:120px;font-weight:700;line-height:1;color:${K};letter-spacing:-4px">0−</div><div style="margin-top:12px">es el donante universal: sirve para cualquiera, pero solo lo tiene 1 de cada 11 personas.</div>`,
            800, 230, 420, 330, 24, K, HV, { lineHeight: 1.4 })],
          notes: 'Dona con un color por grupo: rojos para los Rh positivos y negros y grises para los negativos. Porcentajes aproximados de la población.' },
        { layout: 'blank', bg: K, transition: 'push', extra: [
          kicker('RESERVAS DE ESTA SEMANA', 60, 60, 700, '#ff6b7d'),
          T('Días de sangre que quedan', 60, 92, 900, 70, 52, W, HV, { fontWeight: 700, letterSpacing: -1 }),
          chartBlock({ x: 60, y: 180, w: 780, h: 480, chartType: 'bar', color: RED, dataLabels: true, grid: true, yTitle: 'Días de reserva', yMin: 0, yMax: 10,
            data: [{ label: '0+', value: 4 }, { label: '0−', value: 2 }, { label: 'A+', value: 7 }, { label: 'A−', value: 5 }, { label: 'B+', value: 8 }, { label: 'AB+', value: 9 }] }),
          R(880, 200, 4, 200, RED),
          T('<b style="color:#ff6b7d">Alerta en 0−</b><br>Con menos de tres días de reserva, los hospitales empiezan a aplazar operaciones.', 904, 196, 320, 220, 24, W, HV, { lineHeight: 1.4 })],
          notes: 'Columnas sobre negro con el eje de 0 a 10 días; la nota al margen señala el grupo en alerta. Datos inventados para la plantilla.' },
        { layout: 'blank', bg: PINK, transition: 'push', extra: [
          kicker('PIDE CITA', 60, 60, 600),
          T('Sin colas:<br>elige tu hora', 60, 92, 600, 150, 64, K, HV, { fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }),
          T('Desde el móvil, en dos toques. Te avisamos la víspera y, cuando tu sangre llega a un hospital, te llega un mensaje.', 60, 290, 560, 160, 26, K, HV, { lineHeight: 1.4 }),
          T('donasangre.example', 60, 500, 420, 60, 30, W, HV, { fontWeight: 700, bg: RED, pad: [12, 18, 12, 18], radius: 0 }),
          at({ ...base(820, 40, 320, 640), type: 'image', src: appBook, alt: 'App para pedir cita: horas libres del jueves y la de las 18:30 elegida', fit: 'cover', device: 'phone' }, 'fade-up', { start: 'afterPrev', duration: 600 })],
          notes: 'Pantalla de la app (un SVG propio) dentro del marco de un móvil (Imagen ▸ Dispositivo). Entra sola al llegar a la diapositiva.' },
        { layout: 'blank', bg: W, transition: 'push', extra: [
          pollBlock({ kind: 'quiz', fontSize: 32, question: '¿Cuántas veces al año puede donar sangre un hombre en España?', options: ['Dos', 'Cuatro', 'Seis', 'Doce'], correct: [1], time: 20, x: 60, y: 60, w: 1160, h: 600 })],
          notes: 'Pregunta de concurso desde el móvil. Respuesta: cuatro veces al año los hombres y tres las mujeres, con dos meses como mínimo entre donaciones.' },
        { layout: 'blank', bg: RED, transition: 'zoom', extra: [
          withAnims(shape('teardrop', 960, 100, 220, 300, W), A('spin360', { start: 'afterPrev', duration: 900 })),
          T('Te esperamos.', 60, 100, 860, 160, 120, W, HV, { fontWeight: 700, letterSpacing: -4, lineHeight: 1 }),
          R(60, 420, 1160, 3, W),
          ...[['Jueves 14', '17:00 — 21:00'], ['Polideportivo Sur', 'Avenida del Parque 3'], ['Gracias', 'por cada gota']].map(([a, b], i) =>
            T(`<b style="font-size:32px">${a}</b><br>${b}`, 60 + i * 390, 440, 360, 100, 22, W, HV, { lineHeight: 1.35 }))],
          notes: 'Cierre a toda tinta en rojo: la gota blanca da una vuelta al llegar y abajo, la información en tres columnas.' },
      ]));
      // (The campaign's own palette: diagrams, polls and new objects take its red.)
      return Object.assign(deck, { palette: 'custom', customPalette: { name: 'Dona sangre', bg: W, fg: K, accents: [RED, K, '#e8495c', '#666666', '#8f0012', PINK] } });
    } },
};
