// Example presentations (File ▸ Examples): complete decks with real content
// that show what Revela does — master styles and layouts, charts, tables, code
// with line steps, equations, live polls, animations (several per object,
// drawn paths), Transform, transitions, vertical stacks, diagrams, canvas
// mode, 3D characters that walk and wave, and speaker notes. Generated here,
// so no files are needed (the 3D models load from their address); each one is
// an ordinary deck that can be edited from its master.

import { A, anim, appScreen, bar, base, big, build, card, dg, glow, icon, lib3d, model, numbered, path, shape, slide, text, timer, ul, withAnims, emptyDeck, uid, chartBlock, tableBlock, codeBlock, mathBlock, PALETTES, pairStacks, ensureLayouts, masterStyles, newSlideBlocks, pollBlock, placeOnDesign, canvasDesign, LIBRARY_3D, normalizeAnim } from './templates/kit.js';
import { CATALOG, LOADERS } from './templates/catalog.js';

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
    { title: 'Ingresos por mes', layout: 'titleOnly', extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'bar', color: '#156082', grid: true, yTitle: 'miles de €',
      data: [{ label: 'Jul', value: 42 }, { label: 'Ago', value: 38 }, { label: 'Sep', value: 51 }], seriesName: '2026',
      series: [{ name: '2025', values: [35, 33, 40], color: '#a0c4dc' }] })] },
    { title: 'Evolución y reparto', layout: 'twoContent', body: '', body2: '', extra: [
      chartBlock({ x: 90, y: 180, w: 530, h: 440, chartType: 'line', color: '#e97132', grid: true, dataLabels: true, data: [{ label: 'T1', value: 96 }, { label: 'T2', value: 128 }, { label: 'T3', value: 151 }] }),
      chartBlock({ x: 660, y: 180, w: 530, h: 440, chartType: 'doughnut', color: '#156082', data: [{ label: 'Web', value: 55 }, { label: 'Tienda', value: 30 }, { label: 'Socios', value: 15 }] })] },
    { title: 'Próximos pasos', body: ul('Abrir el canal de socios en Portugal', 'Reducir el tiempo de respuesta a 24 h', 'Lanzar la versión móvil en noviembre') },
  ]) },

  pitch: { name: 'Pitch de startup', summary: 'Portada de impacto, animación morph (auto-animate) y cifras', make: () => {
    const logo = uid(), claim = uid();
    const mk = (y, size) => [{ ...text('<b>Rumbo</b>', 90, y, 600, Math.round(size * 1.3), { fontSize: size }), id: logo }];
    return build({ name: 'Pitch de startup', palette: 'violet', fonts: 'bold', title: { size: 64 },
      decor: p => [shape('rect', 0, 690, 1280, 30, p.accents[0]), shape('rect', 0, 690, 420, 30, p.accents[1])] }, [
      { layout: 'blank', autoAnimate: true, extra: [...mk(230, 150), { ...text('El copiloto de tus viajes en tren', 90, 430, 1000, 70, { fontSize: 38 }), id: claim }] },
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
    { title: 'Funciones', layout: 'titleOnly', extra: [codeBlock({ x: 90, y: 170, w: 1100, h: 440, fontSize: 30, lang: 'javascript', lineSteps: '1-3|5-7|9',
      code: 'function saludar(nombre) {\n  return `Hola, ${nombre}`;\n}\n\nconst doble = n => n * 2;\nconst lista = [1, 2, 3];\nconst dobles = lista.map(doble);\n\nconsole.log(saludar("Revela"), dobles);' })],
      notes: 'El código resalta las líneas por pasos: primero la función, luego la flecha y el map, y al final el console.log.' },
    { title: 'Arrays: los tres métodos clave', body: ul('<code>map</code>: transforma cada elemento', '<code>filter</code>: se queda con los que cumplen', '<code>reduce</code>: combina todos en un valor') },
    { title: 'Ejemplo de reduce', layout: 'titleOnly', vertical: true, extra: [codeBlock({ x: 90, y: 170, w: 1100, h: 240, fontSize: 34, lang: 'javascript', lineSteps: '1|2|3',
      code: 'const notas = [7, 9, 6];\nconst suma = notas.reduce((a, n) => a + n, 0);\nconst media = suma / notas.length;' })],
      notes: 'Esta diapositiva está debajo de la anterior (pila vertical de reveal.js): se llega con la flecha abajo.' },
    { title: 'async / await', layout: 'titleOnly', extra: [codeBlock({ x: 90, y: 170, w: 1100, h: 400, fontSize: 32, lang: 'javascript', lineSteps: '2|3|4-5',
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
    { title: 'Ejemplo: $f(x) = x^2$', layout: 'titleOnly', extra: [chartBlock({ x: 190, y: 170, w: 900, h: 470, chartType: 'line', color: '#b5651d', grid: true,
      data: [-3, -2, -1, 0, 1, 2, 3].map(x => ({ label: String(x), value: x * x })) }),
      text('Vértice en $(0, 0)$; simétrica respecto al eje $y$.', 190, 640, 900, 60, { fontSize: 26, textAlign: 'center' })] },
    { title: 'Para practicar', body: ul('Halla las raíces de $x^2 - 5x + 6$', 'Dibuja $f(x) = -x^2 + 2x$', 'Encuentra el vértice de $f(x) = 2x^2 - 8x + 3$') },
  ]) },

  science: { name: 'Ciencias: el sistema solar', summary: 'Formas, animaciones en orden, transiciones y diagrama', make: () => {
    const planets = [['Mercurio', '#b1adad', 18], ['Venus', '#e3bb76', 30], ['Tierra', '#4b9cd3', 32], ['Marte', '#c1440e', 24], ['Júpiter', '#d8ca9d', 70], ['Saturno', '#e3d9a5', 60]];
    let x = 290;
    const orbit = planets.flatMap(([n, c, r], i) => { const cx = x + r; x += r * 2 + 70;
      return [anim(shape('ellipse', cx - r, 400 - r, r * 2, r * 2, c, { alt: n }), i + 1, 'zoom-in'),
        anim(text(n, cx - 75, 490, 150, 44, { fontSize: 24, textAlign: 'center' }), i + 1)]; });
    return build({ name: 'Ciencias: el sistema solar', palette: 'ocean', fonts: 'modern', decor: p => [shape('ellipse', 1120, -80, 240, 240, p.accents[2], { opacity: 60 })] }, [
      { layout: 'title', title: 'El sistema solar', subtitle: 'Un paseo por nuestro vecindario cósmico', transition: 'zoom' },
      { title: 'Del Sol hacia fuera', layout: 'titleOnly', extra: [shape('ellipse', 40, 300, 200, 200, '#f5a623', { alt: 'Sol' }), ...orbit],
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
    const tl = [shape('rect', 140, 395, 1000, 6, '#b5651d'),
      ...events.flatMap(([y, e], i) => { const cx = 180 + i * 230; return [anim(shape('ellipse', cx - 17, 381, 34, 34, '#8b3a62'), i + 1, 'zoom-in'),
        anim(text(`<div><b>${y}</b></div><div>${e}</div>`, cx - 115, i % 2 ? 435 : 225, 230, 140, { fontSize: 28, textAlign: 'center', vAlign: i % 2 ? 'top' : 'bottom' }), i + 1)]; })];
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
    { layout: 'section', title: 'Próxima reunión', subtitle: 'Lunes 5 de octubre, a las 10:00' },
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
      icon('user', 195, 220, 90, '#e4572e'), text('<b>Investigación</b><br>Entrevistas y pruebas con usuarios', 90, 330, 300, 160, { fontSize: 28, textAlign: 'center' }),
      icon('gear', 595, 220, 90, '#f3a712'), text('<b>Diseño</b><br>Prototipos y sistemas de diseño', 490, 330, 300, 160, { fontSize: 28, textAlign: 'center' }),
      icon('bolt', 995, 220, 90, '#a8c686'), text('<b>Lanzamiento</b><br>Con el equipo hasta producción', 890, 330, 300, 160, { fontSize: 28, textAlign: 'center' })] },
    { title: 'Proyecto destacado', layout: 'twoContent', body: '<b>El reto</b>' + ul('Una app bancaria que la gente abandonaba', 'Solo el 40 % terminaba el alta'), body2: '<b>El resultado</b>' + ul('Alta en 3 pasos en lugar de 9', '<b>78 %</b> de altas completadas') },
    { layout: 'section', title: 'Hablemos', subtitle: 'laura@ejemplo.example · linkedin.com/in/laura', extra: [icon('mail', 610, 520, 60, '#f3a712')] },
  ]) },

  // 3D characters that move: their own animations, walking along a drawn path,
  // several animations one after another, and camera movements.
  moving3d: { name: 'Personajes 3D en movimiento', summary: 'Modelos 3D animados: saludan, andan por un recorrido y celebran, varias animaciones seguidas y movimientos de cámara (necesita conexión)', make: () => {
    const knight = lib3d('kk-Knight'), robot = lib3d('three-RobotExpressive');
    return numbered(build({ name: 'Personajes 3D en movimiento', palette: 'midnight', fonts: 'bold', decor: p => [shape('rect', 0, 700, 1280, 20, p.accents[0])] }, [
      { layout: 'blank', extra: [
        text('<b>Personajes 3D<br>que se mueven</b>', 90, 170, 620, 260, { fontSize: 72, color: '#f2f5fa' }),
        text('Cada uno con sus propias animaciones: saludar, andar, bailar…', 90, 450, 600, 100, { fontSize: 30, color: '#b9c4d6' }),
        model('three-RobotExpressive', 760, 120, 400, 480, { clip: 'Wave' })],
        notes: 'El robot saluda sin cortarse: la vista 3D tiene margen alrededor del marco (Modelo 3D ▸ Margen para moverse). Los modelos se cargan de internet; al insertarlos desde Recursos se guardan dentro.' },
      { title: 'Anda por donde le digas', layout: 'titleOnly', extra: [
        withAnims(model('kk-Knight', 60, 250, 290, 390, { walk: { clip: knight.walk, end: knight.arrive, endOnce: true, face: true, look: true } }),
          path([[180, -120], [460, -40], [640, -150], [860, -60]], { duration: 4200 })),
        text('Clic: el caballero sigue el recorrido, gira hacia donde va y al llegar lo celebra.<br><small>Animaciones ▸ Dibujar recorrido: dibújalo con el ratón o el dedo.</small>', 330, 560, 880, 110, { fontSize: 26, color: '#b9c4d6' })],
        notes: 'Recorrido dibujado a mano (Animaciones ▸ Dibujar recorrido). En Modelo 3D ▸ Al moverse: la animación mientras anda y la de llegada.' },
      { title: 'Varias animaciones seguidas', layout: 'titleOnly', extra: [
        withAnims(model('three-RobotExpressive', 100, 250, 260, 330, { walk: { clip: robot.walk, face: true, look: true } }),
          path([[300, 0], [560, 40]], { duration: 2400 }),
          A('clip3d', { clip: 'Wave', once: true, start: 'afterPrev', duration: 2000 }),
          A('clip3d', { clip: 'Dance', start: 'click', duration: 3000 }),
          path([[-200, -30], [-420, 0]], { duration: 2200, start: 'click' })),
        text('1 · anda hasta el centro y saluda<br>2 · baila<br>3 · vuelve andando', 820, 250, 400, 220, { fontSize: 30, color: '#f2f5fa' })],
        notes: 'Un mismo objeto con cuatro animaciones (Animaciones ▸ Añadir animación). El orden y el «después de la anterior» se cambian en el Panel.' },
      { title: 'Movimientos de cámara', layout: 'titleOnly', extra: [
        model('kh-Fox', 90, 170, 520, 350, { view: 'three', motion: 'orbit' }),
        model('kn-character', 720, 170, 400, 350, { motion: 'float' }),
        text('Vuelta completa al entrar', 90, 615, 520, 50, { fontSize: 26, textAlign: 'center', color: '#b9c4d6' }),
        text('Flotar', 720, 615, 400, 50, { fontSize: 26, textAlign: 'center', color: '#b9c4d6' })],
        notes: 'Modelo 3D ▸ Al llegar a la diapositiva: balanceo, acercar, vuelta completa, flotar o desde arriba.' },
      { layout: 'section', title: 'Ahora tú', subtitle: 'Insertar ▸ Recursos ▸ 3D con movimiento · ¿Un modelo sin esqueleto? Modelo 3D ▸ Esqueleto automático' },
    ]));
  } },

  // PowerPoint's animations and more: entrance, emphasis and exit; a curved path
  // with the object turning as it goes; several at once; and Transform (morph).
  effects: { name: 'Animaciones y efectos', summary: 'Entrada, énfasis y salida, trayectoria curva que gira con el objeto, «Transformar» entre diapositivas y Text Art', make: () => {
    const sun = uid(), cardA = uid(), cardB = uid();
    return numbered(build({ name: 'Animaciones y efectos', palette: 'ocean', fonts: 'modern' }, [
      { layout: 'blank', extra: [
        { ...text('Animaciones', 140, 220, 1000, 170, { fontSize: 120, textAlign: 'center', wordart: 'gold' }), animation: A('zoom-in', { duration: 900 }) },
        { ...text('Pulsa → para ver cada efecto', 140, 420, 1000, 60, { fontSize: 32, textAlign: 'center' }), animation: A('fade-up', { start: 'afterPrev' }) }],
        notes: 'El título es Text Art (Insertar ▸ Text Art). Las dos animaciones van una tras otra sin clic («después de la anterior»).' },
      { title: 'Entrada, énfasis y salida', layout: 'titleOnly', extra: [
        withAnims(shape('ellipse', 140, 260, 260, 260, '#f3a712'), A('fade-up'), A('grow', { start: 'afterPrev' })),
        withAnims(shape('star', 510, 260, 260, 260, '#e76f51'), A('zoom-in'), A('highlight-red', { start: 'withPrev' })),
        withAnims(shape('rounded', 880, 280, 260, 220, '#2a9d8f'), A('fade-in'), A('fade-out', { start: 'click' })),
        text('Aparece y crece · entra y se resalta · aparece y se va', 140, 570, 1000, 50, { fontSize: 26, textAlign: 'center' })],
        notes: 'Varias animaciones por objeto: Animaciones ▸ Añadir animación. «Con la anterior» y «después de la anterior» en el Panel.' },
      { title: 'Una trayectoria que gira con el objeto', layout: 'titleOnly', extra: [
        withAnims(shape('chevron', 90, 520, 130, 90, '#f3a712'),
          path([[160, -180], [420, -260], [640, -80], [880, -200], [980, -330]], { duration: 3500, turn: 'follow' })),
        text('La punta de flecha sigue una curva y apunta siempre hacia donde va.', 300, 600, 900, 50, { fontSize: 26 })],
        notes: 'Animaciones ▸ Dibujar recorrido, y en el Panel: Giro en el camino ▸ «Seguir el camino».' },
      { layout: 'blank', autoAnimate: true, extra: [
        { ...shape('ellipse', 120, 140, 180, 180, '#f3a712'), id: sun },
        { ...card('<b>Transformar</b><br>Los objetos que están en las dos diapositivas se mueven, crecen y cambian de color solos.', 360, 180, 800, 300, '#ffffff22', { fontSize: 30 }), id: cardA }],
        notes: 'Transiciones ▸ Transformar (como el Morph de PowerPoint): pasa a la siguiente.' },
      { layout: 'blank', autoAnimate: true, extra: [
        { ...shape('ellipse', 900, 60, 320, 320, '#e76f51'), id: sun },
        { ...card('<b>Transformar</b><br>Mismo objeto, otra posición, tamaño y color.', 120, 380, 700, 240, '#ffffff33', { fontSize: 30 }), id: cardA }] },
      { layout: 'section', title: 'Tu turno', subtitle: 'Animaciones ▸ Añadir animación · Panel · Dibujar recorrido', extra: [{ ...shape('star', 590, 520, 100, 100, '#f3a712'), id: cardB, animation: A('spin', { duration: 1200 }) }] },
    ]));
  } },

  // Diagrams with connectors that follow their boxes, WordArt and icons.
  diagrams: { name: 'Diagramas y diseño', summary: 'Diagramas (organigrama, cronología, Venn, pirámide, ciclo, galones) que se escriben como un esquema, uno a uno al presentar; cajas con conectores, iconos y Text Art', make: () => {
    const dg = (layout, text, o = {}) => ({ ...base(90, 170, 1100, 480), type: 'diagram', layout, colors: 'colorful', text, ...o });
    const boxes = (labels, pos, color) => labels.map((l, i) => text(`<b>${l}</b>`, ...pos(i), { fontSize: 28, textAlign: 'center', bg: color, radius: 16, color: '#ffffff', vAlign: 'middle' }));
    const links = list => list.slice(0, -1).map((b, i) => ({ ...base(0, 0, 1280, 720), type: 'connector', from: b.id, to: list[i + 1].id, color: '#9aa7b8', arrow: true }));
    const proc = boxes(['Idea', 'Prototipo', 'Prueba', 'Lanzamiento'], i => [90 + i * 290, 300, 230, 130], '#3f6497').map((b, i) => anim(b, i + 1, 'fade-right'));
    const cyc = boxes(['Planificar', 'Hacer', 'Comprobar', 'Actuar'], i => { const a = -Math.PI / 2 + i * Math.PI / 2; return [640 + 250 * Math.cos(a) - 110, 390 + 200 * Math.sin(a) - 50, 220, 100]; }, '#2a9d8f');
    return build({ name: 'Diagramas y diseño', palette: 'office', fonts: 'clean', decor: p => bar(p, 1) }, [
      { layout: 'blank', extra: [text('Diagramas', 140, 240, 1000, 160, { fontSize: 110, textAlign: 'center', wordart: 'gradient' }),
        text('Cajas unidas con conectores: mueve una y la flecha la sigue', 140, 420, 1000, 60, { fontSize: 30, textAlign: 'center' })] },
      { title: 'Organigrama', layout: 'titleOnly', extra: [dg('hierarchy', 'Dirección\n  Proyectos\n    Diseño\n    Desarrollo\n  Operaciones\n    Ventas\n    Soporte', { oneByOne: true })],
        notes: 'Insertar ▸ Diagrama. Se escribe como un esquema (doble clic): con dos espacios delante, depende del de arriba. «Uno a uno al presentar» lo va mostrando por partes.' },
      { title: 'Cronología', layout: 'titleOnly', extra: [dg('timeline', '2023\n  Idea\n2024\n  Prototipo\n2025\n  Lanzamiento\n2026\n  Crecimiento', { oneByOne: true })] },
      { title: 'Lo que hace falta', layout: 'titleOnly', extra: [dg('venn', 'Deseable\nViable\nFactible', { colors: 'light' })] },
      { title: 'Pirámide y galones', layout: 'titleOnly', extra: [dg('pyramid', 'Visión\nEstrategia\nTácticas', { w: 520 }), dg('chevrons', 'Idea\n  Pensar\nPlan\n  Organizar\nHecho\n  Revisar', { x: 640, w: 560, colors: 'accent' })] },
      { title: 'Proceso', layout: 'titleOnly', extra: [...proc, ...links(proc)],
        notes: 'Insertar ▸ Proceso. Cada caja aparece con un clic; los conectores siguen a las cajas al moverlas.' },
      { title: 'Ciclo (PDCA)', layout: 'titleOnly', extra: [...cyc, ...links([...cyc, cyc[0]])], notes: 'Insertar ▸ Ciclo.' },
      { title: 'Iconos', layout: 'titleOnly', extra: [['home', 'Inicio'], ['user', 'Persona'], ['gear', 'Ajustes'], ['bolt', 'Energía'], ['heart', 'Me gusta'], ['star', 'Favorito']].flatMap(([n, l], i) => [
        { ...icon(n, 110 + i * 180, 280, 110, ['#3f6497', '#2a9d8f', '#e76f51', '#f3a712', '#c0392b', '#7d3c98'][i]), decorative: false, alt: l },
        text(l, 75 + i * 180, 410, 180, 50, { fontSize: 26, textAlign: 'center' })]),
        notes: 'Insertar ▸ Iconos, o más de 200 000 en Insertar ▸ Recursos ▸ Iconos.' },
    ]);
  } },

  // A lively class: a curved title, a countdown for group work, a drawing that
  // draws itself, sketched and gradient shapes, an app inside a phone and a
  // browser window, and text round a shape.
  classroom: { name: 'Clase interactiva', summary: 'Título curvo, cuenta atrás para el trabajo en grupo, dibujo que se traza solo, formas a mano alzada y con degradado, maquetas de móvil y navegador, texto alrededor', make: () => {
    const app = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="720" viewBox="0 0 360 720"><rect width="360" height="720" fill="#f4f6fb"/>'
      + '<rect width="360" height="110" fill="#2e7d32"/><text x="24" y="72" font-family="sans-serif" font-size="30" font-weight="700" fill="#fff">EcoClase</text>'
      + [0, 1, 2, 3].map(i => `<rect x="20" y="${140 + i * 140}" width="320" height="120" rx="16" fill="#fff" stroke="#dde3ec"/><circle cx="72" cy="${200 + i * 140}" r="30" fill="${['#66bb6a', '#fbc02d', '#0277bd', '#ad1457'][i]}"/>`
        + `<rect x="120" y="${180 + i * 140}" width="180" height="14" rx="7" fill="#c9d1dc"/><rect x="120" y="${206 + i * 140}" width="120" height="12" rx="6" fill="#e3e8ef"/>`).join('') + '</svg>');
    const web = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#f4f6fb"/>'
      + '<rect width="1280" height="90" fill="#2e7d32"/><text x="40" y="60" font-family="sans-serif" font-size="38" font-weight="700" fill="#fff">EcoClase · Panel del grupo</text>'
      + [0, 1, 2].map(i => `<rect x="${40 + i * 410}" y="130" width="380" height="220" rx="18" fill="#fff" stroke="#dde3ec"/><text x="${70 + i * 410}" y="200" font-family="sans-serif" font-size="30" fill="#5b6675">${['Papel', 'Plástico', 'Vidrio'][i]}</text>`
        + `<text x="${70 + i * 410}" y="300" font-family="sans-serif" font-size="80" font-weight="700" fill="${['#0277bd', '#fbc02d', '#2e7d32'][i]}">${[42, 27, 15][i]} kg</text>`).join('')
      + '<rect x="40" y="390" width="1200" height="290" rx="18" fill="#fff" stroke="#dde3ec"/>'
      + [180, 120, 220, 160, 250, 200, 270].map((h, i) => `<rect x="${110 + i * 160}" y="${650 - h}" width="90" height="${h}" rx="8" fill="#66bb6a"/>`).join('') + '</svg>');
    const heart = Array.from({ length: 60 }, (_, i) => { const a = i / 59 * 2 * Math.PI; return [Math.round(200 + 160 * Math.pow(Math.sin(a), 3)), Math.round(170 - (130 * Math.cos(a) - 50 * Math.cos(2 * a) - 20 * Math.cos(3 * a) - 10 * Math.cos(4 * a)))]; });
    return numbered(build({ name: 'Clase interactiva', palette: 'forest', fonts: 'friendly', decor: p => [shape('ellipse', 1150, -60, 200, 200, p.accents[3], { sketch: true, stroke: p.fg, strokeWidth: 2 })] }, [
      { layout: 'blank', extra: [
        text('<b>¡Bienvenidos a clase!</b>', 190, 90, 900, 330, { fontSize: 78, curve: 30, color: '#2e7d32' }),
        text('Hoy: el reciclaje, en equipo', 190, 450, 900, 60, { fontSize: 34, textAlign: 'center' }),
        shape('rounded', 520, 540, 240, 90, '#66bb6a', { fill2: '#fbc02d', gradAngle: 0, sketch: true, stroke: '#1e3320', strokeWidth: 2 })],
        notes: 'El título es texto curvo (Cuadro de texto ▸ Curvar texto). La forma de abajo tiene degradado y estilo a mano alzada (pestaña Forma).' },
      { title: 'Trabajo en grupo', layout: 'titleOnly', extra: [
        text(ul('Formad equipos de cuatro', 'Anotad tres cosas que tiráis cada día', 'Pensad dónde va cada una'), 90, 190, 620, 380, { fontSize: 32 }),
        { ...base(800, 170, 380, 380), type: 'timer', seconds: 300, style: 'ring', color: '#2e7d32', auto: true, sound: true, endText: '¡Tiempo!' }],
        notes: 'La cuenta atrás empieza sola al llegar a la diapositiva y suena al acabar; un clic la pausa (Insertar ▸ Cuenta atrás).' },
      { title: 'Mira cómo se dibuja', layout: 'titleOnly', extra: [
        { ...base(140, 170, 400, 360), type: 'ink', points: heart, vw: 400, vh: 360, color: '#c62828', width: 10, animation: A('draw', { duration: 2500 }) },
        withAnims(shape('star', 700, 190, 320, 320, '#fbc02d', { stroke: '#1e3320', strokeWidth: 3, sketch: true }), A('draw', { duration: 2000, start: 'afterPrev' })),
        text('Clic: el corazón se traza como si lo dibujaras, y luego la estrella.', 140, 590, 1000, 50, { fontSize: 26 })],
        notes: 'Efecto «Dibujar» (Animaciones ▸ Dibujar, o en la pestaña Dibujo: Trazar al presentar).' },
      { title: 'Nuestra app de reciclaje', layout: 'titleOnly', extra: [
        { ...base(120, 150, 250, 500), type: 'image', src: app, alt: 'Pantalla de la app EcoClase', fit: 'cover', device: 'phone' },
        { ...base(470, 190, 700, 420), type: 'image', src: web, alt: 'El panel de EcoClase en el navegador', fit: 'cover', device: 'browser' }],
        notes: 'Imagen ▸ Dispositivo: dentro de un móvil, una tableta, un portátil, un monitor o una ventana de navegador.' },
      { title: 'Texto alrededor', layout: 'titleOnly', extra: [
        shape('ellipse', 110, 200, 220, 220, '#66bb6a', { wrap: true, fill2: '#2e7d32', gradType: 'radial' }),
        text('Reciclar no es solo separar la basura: es pensar antes de comprar, reutilizar lo que ya tenemos y reparar lo que se rompe. El papel y el cartón van al contenedor azul; los envases de plástico, las latas y los briks, al amarillo; el vidrio, al verde. Lo que no sabemos dónde va, al punto limpio. Y lo mejor de todo: la basura que no llega a existir no hay que separarla.', 90, 180, 1100, 470, { fontSize: 28 })],
        notes: 'Forma o Imagen ▸ Texto alrededor: los cuadros de texto que la tocan le dejan hueco.' },
      { layout: 'section', title: '¡Buen trabajo!', subtitle: 'Diseño ▸ Cambiar tamaño: en A4 o en vertical para el móvil' },
    ]));
  } },

  // A product launch with a neon look: a 3D product turning, Transform between
  // slides, chevrons one by one, the market as a funnel, prices and a countdown.
  launch: { name: 'Lanzamiento de producto', summary: 'Estilo neón: producto 3D girando, Transformar, galones uno a uno, embudo de mercado, precios y cuenta atrás', make: () => {
    const nova = uid(), prod = uid(), BG = '#0d0719';
    // (Its CC BY credit once, on the last slide, instead of under it on every slide.)
    const glasses = (x, y, w, h) => ({ ...model('kh-SunglassesKhronos', x, y, w, h, { autoRotate: true, view: 'front', caption: '' }), id: prod });
    return numbered(build({ name: 'NOVA · lanzamiento', palette: 'violet', fonts: 'bold', title: { size: 70, color: '#f3eefe' },
      decor: p => [shape('rect', 0, 712, 1280, 8, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-260, -300, 900, '#9b5de5', BG, 55), glow(760, 260, 800, '#f15bb5', BG, 45),
        text('PRESENTACIÓN DE PRODUCTO · 2026', 90, 150, 700, 40, { fontSize: 22, color: '#00f5d4', letterSpacing: 6 }),
        { ...text('NOVA', 80, 190, 700, 250, { fontFamily: pairStacks('bold').heading, fontSize: 210, wordart: 'neon' }), id: nova },
        text('Gafas que ven contigo', 90, 450, 640, 70, { fontSize: 44, color: '#f3eefe' }),
        glasses(700, 150, 520, 420)],
        notes: 'Plantilla «neón»: brillos con degradado radial, Text Art «Neón» y un modelo 3D que gira solo.' },
      { title: 'El problema', layout: 'titleOnly', bg: BG, extra: [
        ...[['bolt', 'Pantallas por todas partes', 'Miramos el móvil 150 veces al día.'], ['clock', 'Tiempo perdido', 'Buscar, desbloquear, volver a guardar.'], ['user', 'Nadie te mira', 'Hablamos mirando abajo, no a los ojos.']]
          .map(([ic, h, d], i) => withAnims(card(`<div style="font-size:34px;font-weight:700;color:#fee440;margin-top:70px">${h}</div><div style="opacity:.85">${d}</div>`, 90 + i * 380, 210, 340, 320, '#ffffff12', { color: '#f3eefe', fontSize: 28 }),
            A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 }))),
        ...[0, 1, 2].map(i => icon(['bolt', 'clock', 'user'][i], 122 + i * 380, 240, 56, ['#f15bb5', '#00bbf9', '#00f5d4'][i]))] },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [glow(390, 60, 600, '#9b5de5', BG, 50),
        { ...text('NOVA', 440, 40, 400, 140, { fontFamily: pairStacks('bold').heading, fontSize: 110, wordart: 'neon', textAlign: 'center' }), id: nova }, glasses(340, 180, 600, 470)],
        notes: 'Transformar (Morph): el nombre y las gafas viajan a su sitio en la diapositiva siguiente.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        { ...text('NOVA', 70, 40, 400, 110, { fontFamily: pairStacks('bold').heading, fontSize: 80, wordart: 'neon' }), id: nova }, glasses(40, 170, 440, 380),
        dg('chevrons', 'Ver\n  Realidad aumentada ligera\nOír\n  Audio abierto, sin tapar\nHablar\n  Asistente por voz\nDurar\n  18 horas de batería', 500, 170, 740, 460, { oneByOne: true })] },
      { title: 'Un mercado enorme', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 620, h: 470, chartType: 'funnel', color: '#9b5de5', data: [{ label: 'Gafas vendidas', value: 1500 }, { label: 'Con graduación', value: 900 }, { label: 'Interesados en «smart»', value: 240 }, { label: 'Nuestro objetivo', value: 60 }] }),
        text('<b style="color:#fee440;font-size:64px">60 M</b><br>de personas al alcance de NOVA: el 4 % de quienes compran gafas cada año (millones, estimación)', 770, 250, 420, 320, { fontSize: 28, color: '#f3eefe' })] },
      { title: 'Elige tu NOVA', layout: 'titleOnly', bg: BG, extra: [
        shape('rounded', 470, 170, 340, 470, '#9b5de5', { fill2: '#f15bb5', gradAngle: 45, radius: 26 }),
        ...[['Lite', '199 €', 'Audio y asistente'], ['Pro', '349 €', 'Todo, con realidad aumentada'], ['Graduadas', '449 €', 'Pro con tus lentes']].map(([n, pr, d], i) =>
          anim(card(`<div style="font-size:30px;opacity:.9">${n}</div><div style="font-size:78px;font-weight:800;line-height:1.1">${pr}</div><div style="font-size:24px">${d}</div>`,
            90 + i * 380, 190, 340, 430, i === 1 ? '#00000000' : '#ffffff12', { color: '#ffffff', textAlign: 'center', vAlign: 'middle' }), i + 1, 'zoom-in')),
        text('LA MÁS ELEGIDA', 470, 190, 340, 36, { fontSize: 20, textAlign: 'center', color: '#fee440', letterSpacing: 4 })] },
      { layout: 'blank', bg: BG, transition: 'convex', extra: [glow(340, -200, 620, '#f15bb5', BG, 45),
        text('Reserva la tuya', 90, 180, 760, 150, { fontFamily: pairStacks('bold').heading, fontSize: 110, wordart: 'neon' }),
        text('Precio de lanzamiento durante la presentación', 90, 330, 700, 60, { fontSize: 32, color: '#f3eefe' }),
        timer(600, 860, 170, 330, { color: '#00f5d4' }), text('nova.example · @novagafas', 90, 560, 700, 50, { fontSize: 28, color: '#00bbf9' }),
        text(`Modelo 3D: ${lib3d('kh-SunglassesKhronos').credit}`, 90, 650, 1100, 40, { fontSize: 13, color: '#8a7fa8' })],
        notes: 'La cuenta atrás empieza al llegar a la diapositiva y suena al acabar (Insertar ▸ Cuenta atrás).' },
    ]));
  } },

  // A travel guide with a paper look: a rising sun with curved text, the
  // itinerary as a timeline, highlights as cards and a budget that adds itself up.
  travel: { name: 'Guía de viaje: Japón', summary: 'Estilo papel: sol con texto curvo, itinerario en cronología, tarjetas, presupuesto con fórmulas y gráfico, frases útiles', make: () => build({
    name: 'Guía de viaje: Japón', palette: 'paper', fonts: 'classic', title: { size: 56, color: '#bc002d' },
    decor: p => [shape('rect', 60, 686, 1160, 2, p.accents[0])],
  }, [
    { layout: 'blank', transition: 'fade', extra: [
      shape('ellipse', 760, 120, 420, 420, '#bc002d', { fill2: '#e0485f', gradType: 'radial' }),
      text('東京 · 京都 · 大阪 · 奈良 · 東京 · 京都 · 大阪 · 奈良 · ', 730, 90, 480, 480, { fontSize: 30, curve: 100, color: '#3b3228', textAlign: 'center' }),
      text('Japón', 90, 200, 640, 200, { fontSize: 150, fontFamily: pairStacks('classic').heading, color: '#3b3228' }),
      text('Guía de 7 días en primavera', 96, 410, 620, 60, { fontSize: 36, fontStyle: 'italic', color: '#8b3a62' }),
      shape('line', 96, 490, 300, 20, 'none', { stroke: '#bc002d', strokeWidth: 3 })],
      notes: 'Texto curvo en círculo alrededor del sol (Formato ▸ Curvar texto ▸ Círculo).' },
    { title: 'El itinerario', layout: 'titleOnly', extra: [dg('timeline', 'Día 1\n  Tokio: Shibuya y Asakusa\nDía 3\n  Nikko, entre templos\nDía 4\n  Kioto: Fushimi Inari\nDía 6\n  Nara y sus ciervos\nDía 7\n  Osaka: Dotonbori', 90, 170, 1100, 470, { oneByOne: true, colors: 'colorful' })],
      notes: 'Diagrama «Cronología» uno a uno: cada parada aparece con un clic.' },
    { title: 'Lo que no te puedes perder', layout: 'titleOnly', extra: [dg('cards', '🍣 Comer\n  Sushi del mercado de Tsukiji\n⛩️ Ver\n  Los mil toriis de Fushimi Inari\n🌸 Pasear\n  El camino de la filosofía\n♨️ Descansar\n  Un onsen en Hakone', 90, 170, 1100, 470, { colors: 'light' })] },
    { title: 'Presupuesto por persona', layout: 'titleOnly', extra: [
      tableBlock({ x: 90, y: 180, w: 560, h: 420, fontSize: 26, header: true, headBg: '#bc002d', headFg: '#ffffff', stroke: '#c9bfae', banded: true, band: '#b5651d',
        rows: [['Concepto', 'Euros'], ['Vuelo', '850 €'], ['Alojamiento (7 noches)', '700 €'], ['JR Pass', '330 €'], ['Comida', '350 €'], ['Extras', '200 €'], ['<b>Total</b>', '=SUMA(ARRIBA)']], colW: [3, 2] }),
      chartBlock({ x: 690, y: 180, w: 500, h: 420, chartType: 'doughnut', color: '#bc002d',
        data: [{ label: 'Vuelo', value: 850 }, { label: 'Alojamiento', value: 700 }, { label: 'JR Pass', value: 330 }, { label: 'Comida', value: 350 }, { label: 'Extras', value: 200 }] })],
      notes: 'La fila Total es una fórmula (=SUMA(ARRIBA)): cambia un importe y se recalcula.' },
    { title: 'Frases útiles', layout: 'titleOnly', extra: [
      ...[['こんにちは', 'Konnichiwa', 'Hola'], ['ありがとう', 'Arigatō', 'Gracias'], ['すみません', 'Sumimasen', 'Perdone'], ['いくらですか', 'Ikura desu ka', '¿Cuánto cuesta?']].map(([j, r, e], i) =>
        anim(card(`<div style="font-size:44px">${j}</div><div style="font-size:24px;color:#8b3a62"><i>${r}</i></div><div style="font-size:28px">${e}</div>`, 90 + (i % 2) * 560, 170 + Math.floor(i / 2) * 250, 530, 220, '#fffaf0', { color: '#3b3228', borderColor: '#e2d6c0' }), i + 1, 'fade-in'))] },
    { layout: 'section', title: 'いってらっしゃい', subtitle: '¡Buen viaje!', transition: 'zoom' },
  ]) },

  // A class quiz, Kahoot-style: questions answered from phones with points for
  // speed, a countdown to join, the leaderboard, and a celebration.
  quiz: { name: 'Gran concurso de clase', summary: 'Estilo concurso: preguntas con puntos desde el móvil, cuenta atrás, clasificación y celebración con aplausos', make: () => {
    const BG = '#46178f', q = (question, options, correct) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 44, x: 60, y: 40, w: 1160, h: 640 });
    return numbered(build({ name: 'Gran concurso', palette: 'violet', fonts: 'friendly', title: { size: 60, color: '#ffffff' } }, [
      { layout: 'blank', bg: BG, extra: [
        shape('burst', 60, 60, 220, 220, '#fee440', { sketch: true, stroke: '#1b1030', strokeWidth: 4, rotation: -12 }), shape('star', 1010, 430, 200, 200, '#00f5d4', { sketch: true, stroke: '#1b1030', strokeWidth: 4, rotation: 14 }),
        shape('ellipse', 1040, 70, 120, 120, '#f15bb5', { sketch: true, stroke: '#1b1030', strokeWidth: 4 }), shape('triangle', 150, 470, 150, 150, '#00bbf9', { sketch: true, stroke: '#1b1030', strokeWidth: 4, rotation: 20 }),
        text('¡Gran concurso!', 190, 140, 900, 180, { fontFamily: pairStacks('friendly').heading, fontSize: 110, wordart: 'fire', textAlign: 'center' }),
        text('Saca el móvil y escanea el código de la primera pregunta', 190, 340, 900, 90, { fontSize: 32, textAlign: 'center', color: '#ffffff' }),
        timer(60, 545, 440, 190, { color: '#fee440' })],
        notes: 'Un minuto para que todo el mundo entre. Las preguntas dan puntos por acertar y por rapidez.' },
      { layout: 'blank', bg: BG, extra: [q('¿Cuál es el planeta más grande del sistema solar?', ['Marte', 'Júpiter', 'Saturno', 'La Tierra'], 1)] },
      { layout: 'blank', bg: BG, extra: [q('¿Cuántos lados tiene un hexágono?', ['5', '6', '7', '8'], 1)] },
      { layout: 'blank', bg: BG, extra: [q('¿Quién pintó el Guernica?', ['Dalí', 'Velázquez', 'Picasso', 'Goya'], 2)] },
      { title: '🏆 Clasificación', layout: 'titleOnly', bg: BG, extra: [pollBlock({ kind: 'board', question: '', fontSize: 40, x: 60, y: 160, w: 1160, h: 520 })],
        notes: 'La clasificación suma los puntos de todas las preguntas de la presentación.' },
      { layout: 'blank', bg: BG, extra: [
        ...[[120, 90, '#fee440'], [980, 110, '#00f5d4'], [200, 470, '#f15bb5'], [960, 460, '#00bbf9']].map(([x, y, c], i) =>
          withAnims(shape('star', x, y, 150, 150, c, { sketch: true, stroke: '#1b1030', strokeWidth: 4 }), A('bounce', { start: i ? 'withPrev' : 'afterPrev', delay: i * 150, ...(i === 0 && { sound: 'applause' }) }))),
        text('¡Enhorabuena!', 190, 230, 900, 180, { fontFamily: pairStacks('friendly').heading, fontSize: 110, wordart: 'gold', textAlign: 'center' }),
        text('Gracias por jugar', 340, 420, 600, 70, { fontSize: 40, textAlign: 'center', color: '#ffffff' })],
        notes: 'Las estrellas rebotan solas al llegar, con aplausos (Animaciones ▸ Sonido).' },
    ]));
  } },

  // A results dashboard: KPIs on gradients, and the charts that tell the story —
  // waterfall, funnel, treemap, bubbles — with a table that totals itself.
  dashboard: { name: 'Panel de resultados', summary: 'Estilo dashboard: indicadores con degradado, gráficos de cascada, embudo, rectángulos y burbujas, tabla con totales automáticos', make: () => {
    const BG = '#0b0f19', kpi = (n, label, x, i) => anim(text(`<div style="font-size:56px;font-weight:800;line-height:1.1">${n}</div><div style="font-size:24px;opacity:.9">${label}</div>`,
      x, 190, 255, 190, { color: '#ffffff', textAlign: 'center', vAlign: 'middle' }), i + 1, 'fade-up');
    return numbered(build({ name: 'Panel de resultados 2026', palette: 'midnight', fonts: 'tech', title: { size: 44, color: '#e6e9ef' },
      decor: () => Array.from({ length: 9 }, (_, i) => shape('rect', 0, 80 * i + 40, 1280, 1, '#ffffff0d')) }, [
      { layout: 'blank', bg: BG, extra: [glow(700, -250, 800, '#7aa2f7', BG, 40),
        text('RESULTADOS 2026', 90, 230, 900, 60, { fontSize: 26, letterSpacing: 8, color: '#7aa2f7' }),
        text('Un año en datos', 90, 280, 1000, 160, { fontFamily: pairStacks('tech').heading, fontSize: 110, wordart: 'ice' }),
        text('Ventas, clientes y márgenes · Comité de dirección', 94, 440, 900, 60, { fontSize: 30, color: '#a9b1d6' })] },
      { title: 'Lo más importante', layout: 'titleOnly', bg: BG, extra: [
        shape('rounded', 90, 190, 255, 190, '#7aa2f7', { fill2: '#bb9af7', gradAngle: 45, radius: 18 }), shape('rounded', 370, 190, 255, 190, '#9ece6a', { fill2: '#2ac3de', gradAngle: 45, radius: 18 }),
        shape('rounded', 650, 190, 255, 190, '#e0af68', { fill2: '#f7768e', gradAngle: 45, radius: 18 }), shape('rounded', 930, 190, 255, 190, '#bb9af7', { fill2: '#f7768e', gradAngle: 45, radius: 18 }),
        kpi('4,2 M€', 'ingresos', 90, 0), kpi('+23 %', 'crecimiento', 370, 1), kpi('38 %', 'margen bruto', 650, 2), kpi('1.240', 'clientes nuevos', 930, 3),
        text('Todos los indicadores por encima del objetivo, salvo la retención en el segundo trimestre.', 90, 440, 1100, 90, { fontSize: 28, color: '#a9b1d6' })] },
      { title: 'De los ingresos al beneficio', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'waterfall', color: '#9ece6a',
        data: [{ label: 'Ingresos', value: 4200 }, { label: 'Coste de ventas', value: -2600 }, { label: 'Personal', value: -700 }, { label: 'Marketing', value: -350 }, { label: 'Otros', value: -150 }, { label: 'Total', value: 0 }] })] },
      { title: 'Del visitante al cliente', layout: 'twoContent', bg: BG, body: '', body2: '', extra: [
        chartBlock({ x: 90, y: 170, w: 620, h: 480, chartType: 'funnel', color: '#7aa2f7', data: [{ label: 'Visitas', value: 120000 }, { label: 'Registros', value: 18000 }, { label: 'Pruebas', value: 5200 }, { label: 'Clientes', value: 1240 }] }),
        text('<b style="color:#e0af68;font-size:54px">1 %</b><br>de las visitas acaba siendo cliente. El mayor salto está entre la visita y el registro: solo se registra el 15 %. Ahí está la oportunidad.', 760, 250, 430, 330, { fontSize: 28, color: '#e6e9ef' })] },
      { title: 'Ventas por región', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'treemap',
        data: [{ label: 'Madrid', value: 1300 }, { label: 'Cataluña', value: 1050 }, { label: 'Andalucía', value: 700 }, { label: 'Valencia', value: 520 }, { label: 'País Vasco', value: 330 }, { label: 'Galicia', value: 180 }, { label: 'Resto', value: 120 }] })] },
      { title: 'Productos: precio, ventas y margen', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'bubble', color: '#bb9af7',
        grid: true, xTitle: 'Precio (€ al mes)', yTitle: 'Clientes', xMin: 0, xMax: 120,
        data: [{ label: '9', value: 1800 }, { label: '29', value: 1300 }, { label: '59', value: 900 }, { label: '99', value: 300 }], series: [{ name: 'Margen', values: [18, 30, 42, 55] }] }),
        text('Básico 9 € · Estándar 29 € · Pro 59 € · Empresa 99 € — tamaño de la burbuja: margen', 90, 655, 1100, 40, { fontSize: 22, color: '#a9b1d6' })] },
      { title: 'Resumen por trimestre', layout: 'titleOnly', bg: BG, extra: [tableBlock({ x: 90, y: 180, w: 1100, h: 420, fontSize: 26, header: true, headBg: '#7aa2f7', headFg: '#0b0f19', stroke: '#2a2f45', banded: true, band: '#7aa2f7',
        rows: [['Trimestre', 'Ingresos', 'Clientes nuevos'], ['T1', '850.000 €', '210'], ['T2', '960.000 €', '260'], ['T3', '1.090.000 €', '330'], ['T4', '1.300.000 €', '440'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [2, 3, 3] })],
      notes: 'Los totales son fórmulas: si cambias un trimestre, se recalculan solos.' },
    ]));
  } },

  // A design portfolio: giant type, turned shapes, text round a circle, screens
  // inside a phone and a laptop, the process one step at a time and a quote.
  folio: { name: 'Portafolio de diseño', summary: 'Estilo editorial: tipografía gigante, formas giradas, texto en círculo, pantallas en móvil y portátil, proceso uno a uno y testimonio', make: () => {
    const ACC = '#ff4d2e', INK = '#111111';
    return numbered(build({ name: 'Laura Vega · Portafolio', palette: 'grayscale', fonts: 'bold', title: { size: 90, color: INK },
      decor: () => [shape('rect', 1240, 0, 40, 720, ACC)] }, [
      { layout: 'blank', transition: 'slide', extra: [
        shape('rect', 700, 90, 420, 520, ACC, { rotation: 8 }), shape('rect', 740, 130, 420, 520, INK, { rotation: -4, opacity: 90 }),
        text('LAURA<br>VEGA', 80, 110, 700, 420, { fontFamily: pairStacks('bold').heading, fontSize: 210, lineHeight: 0.95, color: INK }),
        text('Diseño de producto · Portafolio 2026', 88, 540, 700, 60, { fontSize: 32, color: '#555555' }),
        text('✦', 870, 290, 120, 120, { fontSize: 110, color: '#ffffff', textAlign: 'center' })] },
      { layout: 'blank', extra: [
        shape('ellipse', 120, 150, 380, 380, ACC), text('LV', 120, 250, 380, 180, { fontFamily: pairStacks('bold').heading, fontSize: 150, textAlign: 'center', color: '#ffffff' }),
        text('diseño · ilustración · experiencia de usuario · ', 70, 100, 480, 480, { fontSize: 26, curve: 100, color: INK, textAlign: 'center' }),
        text('SOBRE MÍ', 620, 160, 540, 60, { fontSize: 28, color: ACC, letterSpacing: 6 }),
        text('Diseño productos digitales que la gente entiende a la primera. Diez años entre estudios, startups y organizaciones públicas.', 620, 220, 560, 260, { fontSize: 34, color: INK }),
        text('Madrid · disponible para proyectos', 620, 500, 560, 50, { fontSize: 24, color: '#555555' })] },
      { title: 'Ruta', layout: 'titleOnly', extra: [
        { ...base(90, 170, 250, 500), type: 'image', src: appScreen(360, 720, ACC, 'Ruta'), alt: 'App Ruta en el móvil', fit: 'cover', device: 'phone' },
        { ...base(400, 200, 560, 360), type: 'image', src: appScreen(1280, 800, '#111111', 'Ruta · Panel', 3), alt: 'Panel web de Ruta en un portátil', fit: 'cover', device: 'laptop' },
        text('App de transporte público para 2 millones de personas. <b>−40 %</b> de consultas al servicio de atención.', 990, 230, 230, 330, { fontSize: 24, color: INK })],
        notes: 'Imagen ▸ Dispositivo: la misma captura dentro de un móvil, una tableta, un portátil o un navegador.' },
      { title: 'Cómo trabajo', layout: 'titleOnly', extra: [dg('process', 'Investigar\n  Hablar con quien lo usará\nIdear\n  Muchas ideas, rápido\nPrototipar\n  Algo que se pueda tocar\nProbar\n  Aprender y repetir', 90, 190, 1100, 420, { colors: 'accent', oneByOne: true })] },
      { layout: 'blank', extra: [
        text('“', 80, 20, 300, 300, { fontFamily: pairStacks('bold').heading, fontSize: 320, color: ACC, lineHeight: 1 }),
        text('Laura convirtió un proceso de veinte pasos en tres pantallas. Nuestros usuarios lo notaron el primer día.', 180, 190, 950, 300, { fontSize: 48, color: INK, fontStyle: 'italic' }),
        text('— Marta Gil, directora de producto', 180, 500, 900, 60, { fontSize: 28, color: '#555555' })] },
      { layout: 'blank', transition: 'zoom', extra: [
        text('HABLEMOS', 80, 130, 1100, 270, { fontFamily: pairStacks('bold').heading, fontSize: 230, color: INK }),
        icon('mail', 90, 430, 56, ACC), text('hola@lauravega.example', 170, 430, 700, 60, { fontSize: 36, color: INK }),
        icon('location', 90, 510, 56, ACC), text('Madrid, España', 170, 510, 700, 60, { fontSize: 36, color: INK })] },
    ]));
  } },

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
      { layout: 'blank', extra: [card('<b>🔍 El detalle</b><br>Un marco pequeño dentro de otro: al llegar, la cámara se acerca como una lupa.', 140, 210, 1000, 290, '#ffffffee', { fontSize: 46, textAlign: 'center', color: '#1b2a41' })] },
      { title: '3 · La prueba', body: ul('Pruébalo con poca gente', 'Aprende rápido') },
      { title: '4 · El resultado', body: ul('Qué ha funcionado', 'Siguiente paso') },
      { layout: 'blank', extra: [card('<b style="font-size:64px">¡Cima! 🏁</b><br>Gracias · hecho con el modo lienzo de Revela', 240, 40, 800, 190, '#ffffffe6', { fontSize: 30, textAlign: 'center', color: '#1b2a41' })] },
    ]);
    placeOnDesign(deck, canvasDesign('mountain'));
    // Stops: idea, plan (with the detail inside), test, result, and the top.
    const f = deck.slides.map(s => ({ ...s.frame }));
    deck.slides[3].frame = { x: f[2].x + 150, y: f[2].y + 70, s: 0.08, r: -10 };
    deck.slides[4].frame = f[3]; deck.slides[5].frame = f[4]; deck.slides[6].frame = { ...f[5], s: 0.6 };
    // Text on the picture: light cards behind titles and lists.
    for (const s of deck.slides.slice(1)) for (const b of s.blocks) if (b.ph) Object.assign(b, { bg: '#ffffffe6', radius: 18 }, b.ph === 'body' && { h: 200 });
    return deck;
  } },
};

// Which group each of these belongs to (the gallery shows them by group).
const CAT = {'lesson': 'edu', 'report': 'biz', 'pitch': 'biz', 'coding': 'sci', 'maths': 'sci', 'science': 'edu', 'history': 'edu', 'meeting': 'biz', 'event': 'life', 'portfolio': 'life', 'moving3d': 'showcase', 'effects': 'showcase', 'diagrams': 'showcase', 'classroom': 'edu', 'launch': 'product', 'travel': 'life', 'quiz': 'edu', 'dashboard': 'data', 'folio': 'creative', 'canvas': 'showcase'};
for (const [k, v] of Object.entries(EXAMPLES_DEF)) v.cat ||= CAT[k] || 'showcase';

// The groups, and the presentations of each, from their own files (templates/*.js).
export const CATEGORIES = [['edu', 'Educación'], ['sci', 'Ciencia y universidad'], ['biz', 'Empresa'], ['product', 'Producto y tecnología'],
  ['data', 'Datos'], ['life', 'Eventos y vida personal'], ['creative', 'Estilos creativos'], ['showcase', 'Catálogo de funciones']];
// All of them listed (name, summary, group); the ones in templates/*.js are
// loaded when needed (catalog.js, made by tools/build-catalog.mjs).
export const EXAMPLES = { ...Object.fromEntries(Object.entries(EXAMPLES_DEF).map(([k, v]) => [k, { name: v.name, summary: v.summary, cat: v.cat }])), ...CATALOG };
const loaded = { ...EXAMPLES_DEF };
// At once, for the ones already here (the first twenty, or a file already loaded).
export const buildExample = key => loaded[key]?.make() || null;
// Names and summaries in another language: [name, summary] by key, from templates/names/<lang>.js (only when asked:
// with a thousand presentations they would weigh on the start-up). The first twenty are in the interface's strings.
const NAME_LANGS = ['en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
export async function exampleNames(lang) {
  if (!NAME_LANGS.includes(lang)) return {};
  try { return (await import(`./templates/names/${lang}.js`)).default; } catch { return {}; }
}
export async function loadExample(key) {
  if (!loaded[key]) { const f = CATALOG[key]?.file; if (!f || !LOADERS[f]) return null; Object.assign(loaded, (await LOADERS[f]()).default); }
  return loaded[key]?.make() || null;
}
