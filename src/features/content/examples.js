// Example presentations (File ▸ Examples): ten complete decks with real
// content that show what Revela does — master styles and layouts, charts,
// tables, code with line steps, equations, live polls, animations,
// transitions, vertical stacks, auto-animate and speaker notes. Generated
// here, so no files or network are needed; each one is an ordinary deck that
// can be edited from its master.

import { emptyDeck, uid, chartBlock, tableBlock, codeBlock, mathBlock } from '../../core/model.js';
import { PALETTES, pairStacks } from '../design/palettes.js';
import { ensureLayouts, masterStyles, newSlideBlocks } from '../document/master.js';
import { pollBlock } from '../live/poll.js';
import { placeOnDesign } from '../design/canvasmode.js';
import { canvasDesign } from '../design/canvasdesigns.js';

// ---- Small builders ------------------------------------------------------------
// ul('a', ['a1', 'a2'], 'b'): an array right after an item nests under it.
const ul = (...items) => '<ul>' + items.map((it, i) => (Array.isArray(it) ? ''
  : `<li>${it}${Array.isArray(items[i + 1]) ? ul(...items[i + 1]) : ''}</li>`)).join('') + '</ul>';
const base = (x, y, w, h) => ({ id: uid(), x, y, w, h, rotation: 0, animation: null });
const text = (html, x, y, w, h, props = {}) => ({ ...base(x, y, w, h), type: 'text', html, fontSize: 28, ...props });
const card = (html, x, y, w, h, bg, props = {}) => text(html, x, y, w, h, { bg, radius: 18, pad: [24, 26, 24, 26], fontSize: 30, ...props });
const shape = (kind, x, y, w, h, fill, props = {}) => ({ ...base(x, y, w, h), type: 'shape', shape: kind, fill, stroke: fill, strokeWidth: 0, ...props });
const icon = (name, x, y, size, color) => ({ ...base(x, y, size, size), type: 'icon', icon: name, color, decorative: true });
const anim = (b, order, effect = 'fade-up') => ({ ...b, animation: { effect, order, duration: 500, delay: 0 } });
const big = (n, label, x, y, color, fg) => text(`<div style="font-size:96px;font-weight:800;color:${color};line-height:1.05">${n}</div><div>${label}</div>`, x, y, 340, 220, { fontSize: 30, textAlign: 'center', color: fg });

// A deck: palette + font pair → master styles, decorations and the layouts.
function build({ name, palette, fonts, decor = () => [], title = {}, body = {} }, slides) {
  const p = PALETTES[palette], st = pairStacks(fonts);
  const deck = emptyDeck();
  Object.assign(deck, { name, palette, fontPair: fonts, bodyFont: st.body });
  deck.master = { id: 'master', background: null, blocks: decor(p).map(b => ({ ...b, decorative: true })) };
  const s = masterStyles(deck);
  Object.assign(s.title, { size: 52, font: st.heading, color: p.accents[0], bold: true, ...title });
  Object.assign(s.subtitle, { size: 34, font: st.body, color: p.fg });
  Object.assign(s.body, { size: 36, font: st.body, color: p.fg, ...body });
  // Sizes that read well projected: 36 / 30 / 26 / 24 / 22 px by level.
  [36, 30, 26, 24, 22].forEach((z, i) => { s.body.levels[i].size = i ? z : s.body.size; });
  ensureLayouts(deck);
  deck.slides = slides.map(sl => slide(deck, p, sl));
  return deck;
}
function slide(deck, p, { layout = 'titleContent', title, subtitle, body, body2, notes = '', extra = [], transition = null, bg, ...rest }) {
  const lay = deck.layouts.find(l => l.id === layout);
  const blocks = newSlideBlocks(lay);
  const bodies = [body, body2];
  for (const b of blocks) {
    if (b.ph === 'title' && title != null) b.html = title;
    else if (b.ph === 'subtitle' && subtitle != null) b.html = subtitle;
    else if (b.ph === 'body') b.html = bodies.shift() ?? '';
  }
  return { id: uid(), layoutId: lay.id, background: bg || p.bg, sectionId: null, transition, hidden: false, notes, autoSlide: 0,
    blocks: [...blocks.filter(b => b.html), ...extra], ...rest };
}
const bar = (p, i = 0) => [shape('rect', 0, 0, 1280, 12, p.accents[i]), shape('rect', 0, 708, 1280, 12, p.accents[i])];

// ---- The ten examples --------------------------------------------------------------
const EXAMPLES_DEF = {
  lesson: { name: 'Clase: ciberseguridad básica', summary: 'Niveles de viñeta, tabla, votación en directo con QR y notas del orador', make: () => build({
    name: 'Clase: ciberseguridad básica', palette: 'office', fonts: 'friendly',
    decor: p => [shape('rect', 0, 0, 14, 720, p.accents[0]), icon('check', 1196, 24, 44, p.accents[1])],
  }, [
    { layout: 'title', title: 'Ciberseguridad básica', subtitle: 'Cómo protegernos en el día a día · 1.º de ciclo',
      notes: 'Presentarse y explicar el objetivo de la sesión: salir sabiendo reconocer un intento de phishing.' },
    { title: 'Qué vamos a aprender', body: ul('Qué es la ciberseguridad', ['Confidencialidad, integridad y disponibilidad'], 'Las amenazas más habituales', ['Phishing', 'Contraseñas débiles', 'Software sin actualizar'], 'Buenas prácticas para el día a día'),
      notes: 'Las viñetas usan los niveles del patrón: Tab baja de nivel, Mayús+Tab sube.' },
    { title: 'Contraseñas: débil o fuerte', extra: [tableBlock({ x: 90, y: 180, w: 1100, h: 340, fontSize: 30, header: true, stroke: '#9e9e9e', headBg: '#156082', headFg: '#ffffff',
      rows: [['Contraseña', 'Tiempo para romperla', '¿Segura?'], ['123456', 'Instantáneo', '❌'], ['Verano2026', 'Minutos', '❌'], ['caballo-lámpara-río-7', 'Siglos', '✅']], colW: [4, 4, 2] }),
      text('Truco: una frase de varias palabras es más fácil de recordar y mucho más difícil de adivinar.', 90, 545, 1100, 110, { fontSize: 30, fontStyle: 'italic' })] },
    { layout: 'blank', extra: [pollBlock({ fontSize: 34, question: '¿Cuál de estos correos es phishing?', options: ['«Tu paquete está retenido: paga 1,99 €»', '«Horario de tutorías del lunes»', '«Resumen semanal de notas»'] })],
      notes: 'Votación en directo: el alumnado escanea el QR con el móvil y el gráfico se actualiza al momento.' },
    { title: 'Tres hábitos que marcan la diferencia', layout: 'titleOnly', extra: [
      anim(card('<b>🔐 Gestor de contraseñas</b><br>Una distinta para cada servicio.', 90, 190, 340, 320, '#e8eef6', { color: '#1f1f1f' }), 1),
      anim(card('<b>📲 Doble factor</b><br>Aunque roben la contraseña, no basta.', 470, 190, 340, 320, '#fdebe1', { color: '#1f1f1f' }), 2),
      anim(card('<b>🔄 Actualizar</b><br>Las actualizaciones cierran agujeros conocidos.', 850, 190, 340, 320, '#e5f3e7', { color: '#1f1f1f' }), 3)],
      notes: 'Cada tarjeta aparece con un clic (animaciones en orden).' },
    { layout: 'section', title: '¿Preguntas?', subtitle: 'Gracias por vuestra atención', transition: 'zoom' },
  ]) },

  report: { name: 'Informe trimestral', summary: 'Cifras destacadas, gráficos de barras, líneas y dona', make: () => build({
    name: 'Informe trimestral', palette: 'office', fonts: 'modern', decor: p => bar(p, 0),
  }, [
    { layout: 'title', title: 'Informe del tercer trimestre', subtitle: 'Resultados y próximos pasos · Octubre 2026' },
    { title: 'El trimestre en cifras', layout: 'titleOnly', extra: [
      anim(big('+18 %', 'ingresos respecto al T2', 90, 230, '#156082', '#1f1f1f'), 1),
      anim(big('4,6', 'satisfacción de clientes (sobre 5)', 470, 230, '#e97132', '#1f1f1f'), 2),
      anim(big('312', 'clientes nuevos', 850, 230, '#196b24', '#1f1f1f'), 3)] },
    { title: 'Ingresos por mes', layout: 'titleOnly', extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'bar', color: '#156082',
      data: [{ label: 'Jul', value: 42 }, { label: 'Ago', value: 38 }, { label: 'Sep', value: 51 }], seriesName: '2026',
      series: [{ name: '2025', values: [35, 33, 40], color: '#a0c4dc' }] })] },
    { title: 'Evolución y reparto', layout: 'twoContent', body: '', body2: '', extra: [
      chartBlock({ x: 90, y: 180, w: 530, h: 440, chartType: 'line', color: '#e97132', data: [{ label: 'T1', value: 96 }, { label: 'T2', value: 128 }, { label: 'T3', value: 151 }] }),
      chartBlock({ x: 660, y: 180, w: 530, h: 440, chartType: 'doughnut', color: '#156082', data: [{ label: 'Web', value: 55 }, { label: 'Tienda', value: 30 }, { label: 'Socios', value: 15 }] })] },
    { title: 'Próximos pasos', body: ul('Abrir el canal de socios en Portugal', 'Reducir el tiempo de respuesta a 24 h', 'Lanzar la versión móvil en noviembre') },
  ]) },

  pitch: { name: 'Pitch de startup', summary: 'Portada de impacto, animación morph (auto-animate) y cifras', make: () => {
    const logo = uid(), claim = uid();
    const mk = (y, size) => [{ ...text('<b>Rumbo</b>', 90, y, 600, 140, { fontSize: size }), id: logo }];
    return build({ name: 'Pitch de startup', palette: 'violet', fonts: 'bold', title: { size: 64 },
      decor: p => [shape('rect', 0, 690, 1280, 30, p.accents[0]), shape('rect', 0, 690, 420, 30, p.accents[1])] }, [
      { layout: 'blank', autoAnimate: true, extra: [...mk(260, 150), { ...text('El copiloto de tus viajes en tren', 90, 430, 1000, 70, { fontSize: 38 }), id: claim }] },
      { layout: 'blank', autoAnimate: true, extra: [...mk(40, 60), { ...text('El copiloto de tus viajes en tren', 90, 120, 1000, 60, { fontSize: 28 }), id: claim },
        text(ul('Retrasos que nadie avisa', 'Conexiones perdidas', 'Billetes en cinco apps distintas'), 90, 230, 1100, 360, { fontSize: 40 })],
        notes: 'Diapositivas con «auto-animate»: el logotipo y el lema se mueven solos de una a otra.' },
      { title: 'Nuestra solución', body: ul('Avisos en tiempo real de retrasos y andenes', 'Replanificación automática si pierdes una conexión', 'Todos tus billetes en un solo sitio') },
      { title: 'Tracción', layout: 'titleOnly', extra: [anim(big('25 k', 'usuarios activos', 90, 240, '#9b5de5', '#f3eefe'), 1), anim(big('×3', 'crecimiento en 6 meses', 470, 240, '#f15bb5', '#f3eefe'), 2), anim(big('0,8 M€', 'que buscamos', 850, 240, '#fee440', '#f3eefe'), 3)] },
      { layout: 'section', title: '¡Súbete!', subtitle: 'hola@rumbo.example', transition: 'convex' },
    ]);
  } },

  coding: { name: 'Taller de programación', summary: 'Código con pasos de resaltado, desplazamiento y diapositivas verticales', make: () => build({
    name: 'Taller de programación', palette: 'midnight', fonts: 'tech', decor: p => [shape('rect', 0, 0, 10, 720, p.accents[0])],
  }, [
    { layout: 'title', title: 'Taller: JavaScript desde cero', subtitle: 'Funciones, arrays y async/await' },
    { title: 'Funciones', layout: 'titleOnly', extra: [codeBlock({ x: 90, y: 170, w: 1100, h: 440, fontSize: 26, lang: 'javascript', lineSteps: '1-3|5-7|9',
      code: 'function saludar(nombre) {\n  return `Hola, ${nombre}`;\n}\n\nconst doble = n => n * 2;\nconst lista = [1, 2, 3];\nconst dobles = lista.map(doble);\n\nconsole.log(saludar("Revela"), dobles);' })],
      notes: 'El código resalta las líneas por pasos: primero la función, luego la flecha y el map, y al final el console.log.' },
    { title: 'Arrays: los tres métodos clave', body: ul('<code>map</code>: transforma cada elemento', '<code>filter</code>: se queda con los que cumplen', '<code>reduce</code>: combina todos en un valor') },
    { title: 'Ejemplo de reduce', layout: 'titleOnly', vertical: true, extra: [codeBlock({ x: 90, y: 170, w: 1100, h: 300, fontSize: 28, lang: 'javascript', lineSteps: '1|2|3',
      code: 'const notas = [7, 9, 6];\nconst suma = notas.reduce((a, n) => a + n, 0);\nconst media = suma / notas.length;' })],
      notes: 'Esta diapositiva está debajo de la anterior (pila vertical de reveal.js): se llega con la flecha abajo.' },
    { title: 'async / await', layout: 'titleOnly', extra: [codeBlock({ x: 90, y: 170, w: 1100, h: 400, fontSize: 26, lang: 'javascript', lineSteps: '2|3|4-5',
      code: 'async function cargar() {\n  const r = await fetch("/datos.json");\n  if (!r.ok) throw new Error(r.status);\n  const datos = await r.json();\n  return datos;\n}' })] },
    { layout: 'section', title: 'Ahora te toca', subtitle: 'Ejercicios en el repositorio del curso' },
  ]) },

  maths: { name: 'Matemáticas: funciones', summary: 'Ecuaciones con KaTeX (en bloque y en línea) y gráfico de líneas', make: () => build({
    name: 'Matemáticas: funciones', palette: 'paper', fonts: 'editorial', decor: p => [shape('rect', 60, 150, 1160, 3, p.accents[0])],
  }, [
    { layout: 'title', title: 'Funciones cuadráticas', subtitle: 'Matemáticas · 4.º ESO' },
    { title: 'La forma general', layout: 'titleOnly', extra: [mathBlock({ x: 140, y: 200, w: 1000, h: 180, fontSize: 72, latex: 'f(x) = ax^2 + bx + c' }),
      text('Si $a > 0$ la parábola abre hacia arriba; si $a < 0$, hacia abajo.', 140, 440, 1000, 90, { fontSize: 34, textAlign: 'center' })] },
    { title: 'Las raíces', layout: 'titleOnly', extra: [mathBlock({ x: 140, y: 200, w: 1000, h: 200, fontSize: 60, latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' }),
      anim(text('El discriminante $\\Delta = b^2 - 4ac$ dice cuántas raíces reales hay.', 140, 450, 1000, 90, { fontSize: 34, textAlign: 'center' }), 1)] },
    { title: 'Ejemplo: $f(x) = x^2$', layout: 'titleOnly', extra: [chartBlock({ x: 190, y: 170, w: 900, h: 470, chartType: 'line', color: '#b5651d',
      data: [-3, -2, -1, 0, 1, 2, 3].map(x => ({ label: String(x), value: x * x })) }),
      text('Vértice en $(0, 0)$; simétrica respecto al eje $y$.', 190, 640, 900, 60, { fontSize: 26, textAlign: 'center' })] },
    { title: 'Para practicar', body: ul('Halla las raíces de $x^2 - 5x + 6$', 'Dibuja $f(x) = -x^2 + 2x$', 'Encuentra el vértice de $f(x) = 2x^2 - 8x + 3$') },
  ]) },

  science: { name: 'Ciencias: el sistema solar', summary: 'Formas, animaciones en orden, transiciones y diagrama', make: () => {
    const planets = [['Mercurio', '#b1adad', 18], ['Venus', '#e3bb76', 30], ['Tierra', '#4b9cd3', 32], ['Marte', '#c1440e', 24], ['Júpiter', '#d8ca9d', 70], ['Saturno', '#e3d9a5', 60]];
    let x = 250;
    const orbit = planets.map(([n, c, r], i) => { const b = anim(shape('ellipse', x, 360 - r, r * 2, r * 2, c, { alt: n }), i + 1, 'zoom-in'); x += r * 2 + 40; return b; });
    return build({ name: 'Ciencias: el sistema solar', palette: 'ocean', fonts: 'modern', decor: p => [shape('ellipse', 1120, -80, 240, 240, p.accents[2], { opacity: 60 })] }, [
      { layout: 'title', title: 'El sistema solar', subtitle: 'Un paseo por nuestro vecindario cósmico', transition: 'zoom' },
      { title: 'Del Sol hacia fuera', layout: 'titleOnly', extra: [shape('ellipse', 40, 260, 200, 200, '#f5a623', { alt: 'Sol' }), ...orbit],
        notes: 'Cada planeta aparece con un clic, en orden desde el Sol.' },
      { title: 'Planetas rocosos y gigantes', layout: 'twoContent', body: '<b>Rocosos</b>' + ul('Mercurio', 'Venus', 'Tierra', 'Marte'), body2: '<b>Gigantes</b>' + ul('Júpiter y Saturno (gas)', 'Urano y Neptuno (hielo)'), transition: 'fade' },
      { title: 'Datos curiosos', layout: 'titleOnly', extra: [
        anim(card('☀️ La luz del Sol tarda <b>8 minutos</b> en llegar a la Tierra.', 90, 190, 530, 210, '#16466b'), 1),
        anim(card('🪐 Saturno flotaría en agua: su densidad es menor.', 660, 190, 530, 210, '#16466b'), 2),
        anim(card('🌡️ Venus es el más caliente, aunque Mercurio esté más cerca.', 90, 430, 530, 210, '#16466b'), 3),
        anim(card('🌪️ La Gran Mancha Roja de Júpiter es una tormenta de siglos.', 660, 430, 530, 210, '#16466b'), 4)] },
      { layout: 'blank', extra: [pollBlock({ fontSize: 34, question: '¿Cuál es tu planeta favorito?', options: ['Tierra', 'Marte', 'Júpiter', 'Saturno'], display: 'bar' })] },
    ]);
  } },

  history: { name: 'Historia: línea de tiempo', summary: 'Línea de tiempo animada, citas y dos columnas', make: () => {
    const events = [['1450', 'Imprenta de Gutenberg'], ['1492', 'Llegada a América'], ['1687', 'Principia de Newton'], ['1789', 'Revolución francesa'], ['1969', 'Llegada a la Luna']];
    const tl = [shape('rect', 110, 395, 1060, 6, '#b5651d'),
      ...events.flatMap(([y, e], i) => { const cx = 150 + i * 245; return [anim(shape('ellipse', cx - 17, 381, 34, 34, '#8b3a62'), i + 1, 'zoom-in'),
        anim(text(`<div><b>${y}</b></div><div>${e}</div>`, cx - 125, i % 2 ? 435 : 225, 250, 140, { fontSize: 28, textAlign: 'center', vAlign: i % 2 ? 'top' : 'bottom' }), i + 1)]; })];
    return build({ name: 'Historia: línea de tiempo', palette: 'paper', fonts: 'classic', decor: p => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: p.accents[0], strokeWidth: 2 })] }, [
      { layout: 'title', title: 'Cinco momentos que cambiaron el mundo', subtitle: 'Historia · Bachillerato' },
      { title: 'Línea de tiempo', layout: 'titleOnly', extra: tl, notes: 'Cada hito aparece al hacer clic, de izquierda a derecha.' },
      { layout: 'blank', extra: [text('«La imprenta es un ejército de veintiséis soldados de plomo con el que se puede conquistar el mundo.»', 140, 220, 1000, 220, { fontSize: 40, fontStyle: 'italic', textAlign: 'center' }),
        text('— Atribuida a Johannes Gutenberg', 140, 470, 1000, 60, { fontSize: 26, textAlign: 'center' })], transition: 'fade' },
      { title: 'Causas y consecuencias', layout: 'twoContent', body: '<b>Causas</b>' + ul('Nuevas ideas', 'Cambios económicos', 'Avances técnicos'), body2: '<b>Consecuencias</b>' + ul('Difusión del conocimiento', 'Nuevos Estados', 'Revolución científica') },
    ]);
  } },

  meeting: { name: 'Reunión de equipo', summary: 'Agenda, tabla de tareas, dos columnas y diseño minimalista', make: () => build({
    name: 'Reunión de equipo', palette: 'grayscale', fonts: 'clean', title: { color: '#262626' },
  }, [
    { layout: 'title', title: 'Reunión semanal', subtitle: 'Equipo de producto · 28 de septiembre' },
    { title: 'Agenda', body: ul('Repaso de la semana (5 min)', 'Bloqueos (10 min)', 'Prioridades de la próxima (10 min)', 'Varios (5 min)') },
    { title: 'Qué salió bien · qué mejorar', layout: 'twoContent', body: '<b>Bien</b>' + ul('Lanzamos la búsqueda nueva', 'Cero incidencias graves'), body2: '<b>Mejorar</b>' + ul('Revisiones de código más cortas', 'Documentar las decisiones') },
    { title: 'Tareas', layout: 'titleOnly', extra: [tableBlock({ x: 90, y: 180, w: 1100, h: 340, fontSize: 30, header: true, stroke: '#a5a5a5', headBg: '#404040', headFg: '#ffffff', banded: true, band: '#7f7f7f',
      rows: [['Tarea', 'Responsable', 'Fecha'], ['Guía de estilo', 'Ana', '3 oct'], ['Pruebas de rendimiento', 'Luis', '6 oct'], ['Encuesta a usuarios', 'Marta', '10 oct']], colW: [6, 3, 2] })] },
    { layout: 'section', title: 'Próxima reunión: lunes 5 a las 10:00' },
  ]) },

  event: { name: 'Conferencia: programa del día', summary: 'Programa en tabla, preguntas del público (Q&A) y cierre', make: () => build({
    name: 'Conferencia: programa del día', palette: 'violet', fonts: 'modern', decor: p => [shape('rect', 0, 0, 1280, 8, p.accents[1])],
  }, [
    { layout: 'title', title: 'Jornada de innovación educativa', subtitle: 'Barcelona · 15 de noviembre de 2026', transition: 'zoom' },
    { title: 'Programa', layout: 'titleOnly', extra: [tableBlock({ x: 90, y: 170, w: 1100, h: 440, fontSize: 30, header: true, stroke: '#9b5de5', headBg: '#9b5de5', headFg: '#ffffff',
      rows: [['Hora', 'Sesión', 'Sala'], ['09:30', 'Bienvenida', 'Auditorio'], ['10:00', 'IA en el aula: usos responsables', 'Auditorio'], ['11:30', 'Talleres simultáneos', 'Aulas 1–4'], ['13:00', 'Comida', 'Patio'], ['15:00', 'Mesa redonda y clausura', 'Auditorio']], colW: [2, 7, 3] })] },
    { layout: 'blank', extra: [pollBlock({ fontSize: 34, kind: 'qa', question: 'Preguntas para la mesa redonda', options: [] })],
      notes: 'Preguntas del público: se envían desde el móvil con el QR y se votan las más interesantes.' },
    { layout: 'section', title: '¡Gracias por venir!', subtitle: 'Las diapositivas estarán en la web de la jornada' },
  ]) },

  portfolio: { name: 'Sobre mí (portafolio)', summary: 'Presentación personal: iconos, tarjetas y contacto', make: () => build({
    name: 'Sobre mí (portafolio)', palette: 'warm', fonts: 'classic', title: { color: '#f3a712' },
    decor: p => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: p.accents[1], strokeWidth: 2 })],
  }, [
    { layout: 'title', title: 'Hola, soy Laura', subtitle: 'Diseñadora de producto · 8 años haciendo cosas útiles' },
    { title: 'Lo que hago', layout: 'titleOnly', extra: [
      icon('user', 150, 200, 90, '#e4572e'), text('<b>Investigación</b><br>Entrevistas y pruebas con usuarios', 90, 310, 300, 160, { fontSize: 28, textAlign: 'center' }),
      icon('gear', 595, 200, 90, '#f3a712'), text('<b>Diseño</b><br>Prototipos y sistemas de diseño', 490, 310, 300, 160, { fontSize: 28, textAlign: 'center' }),
      icon('bolt', 1040, 200, 90, '#a8c686'), text('<b>Lanzamiento</b><br>Con el equipo hasta producción', 890, 310, 300, 160, { fontSize: 28, textAlign: 'center' })] },
    { title: 'Proyecto destacado', layout: 'twoContent', body: '<b>El reto</b>' + ul('Una app bancaria que la gente abandonaba', 'Solo el 40 % terminaba el alta'), body2: '<b>El resultado</b>' + ul('Alta en 3 pasos en lugar de 9', '<b>78 %</b> de altas completadas') },
    { layout: 'section', title: 'Hablemos', subtitle: 'laura@ejemplo.example · linkedin.com/in/laura', extra: [icon('mail', 610, 520, 60, '#f3a712')] },
  ]) },

  // Canvas mode (like Prezi): a mountain drawn on the canvas; each slide is a
  // stop on the path to the top and takes its part of the picture as background.
  canvas: { name: 'Viaje por el lienzo (tipo Prezi)', summary: 'Modo lienzo: un diseño grande de fondo y la cámara vuela y acerca de una parada a otra', make: () => {
    const deck = build({ name: 'Viaje por el lienzo', palette: 'office', fonts: 'modern' }, [
      { layout: 'blank', extra: [
        text('<b>Camino a la cima</b>', 240, 40, 800, 90, { fontSize: 64, textAlign: 'center', color: '#1b2a41' }),
        text('Pulsa → para subir parada a parada · O: ver todo el lienzo', 240, 128, 800, 40, { fontSize: 24, textAlign: 'center', color: '#1b2a41' })],
        notes: 'Modo lienzo: todas las diapositivas son marcos sobre un mismo dibujo. Diseño ▸ Vista de lienzo para moverlos, cambiar su tamaño o girarlos, o cambiar la imagen del lienzo.' },
      { title: '1 · La idea', body: ul('Todo empieza con una pregunta', 'Anota qué quieres cambiar') },
      { title: '2 · El plan', body: ul('Tres pasos, no diez', 'Quién hace qué'), notes: 'La siguiente diapositiva está dentro de esta: la cámara se acerca como una lupa.' },
      { layout: 'blank', extra: [card('<b>🔍 El detalle</b><br>Un marco pequeño dentro de otro: al llegar, la cámara se acerca como una lupa.', 140, 170, 1000, 380, '#ffffffee', { fontSize: 46, textAlign: 'center', color: '#1b2a41' })] },
      { title: '3 · La prueba', body: ul('Pruébalo con poca gente', 'Aprende rápido') },
      { title: '4 · El resultado', body: ul('Qué ha funcionado', 'Siguiente paso') },
      { layout: 'section', title: '¡Cima! 🏁', subtitle: 'Gracias · hecho con el modo lienzo de Revela' },
    ]);
    placeOnDesign(deck, canvasDesign('mountain'));
    // Stops: idea, plan (with the detail inside), test, result, and the top.
    const f = deck.slides.map(s => ({ ...s.frame }));
    deck.slides[3].frame = { x: f[2].x + 150, y: f[2].y + 70, s: 0.08, r: -10 };
    deck.slides[4].frame = f[3]; deck.slides[5].frame = f[4]; deck.slides[6].frame = { ...f[5], s: 0.6 };
    // Text on the picture: light cards behind titles and lists.
    for (const s of deck.slides.slice(1)) for (const b of s.blocks) if (b.ph) Object.assign(b, { bg: '#ffffffe6', radius: 18 });
    return deck;
  } },
};

export const EXAMPLES = Object.fromEntries(Object.entries(EXAMPLES_DEF).map(([k, v]) => [k, { name: v.name, summary: v.summary }]));
export const buildExample = key => EXAMPLES_DEF[key]?.make() || null;
