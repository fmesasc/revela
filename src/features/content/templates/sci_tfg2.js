// Example presentations: defensas de TFG y TFM (II). Each one: { name, summary, cat: 'sci', make() } → a deck (see kit.js).
// Lo que de verdad se necesita para defender ante un tribunal en 15 minutos: portada institucional, el problema en una
// cifra, la pregunta y los objetivos, la metodología dibujada, los resultados con su conclusión al lado, limitaciones,
// conclusiones y, DEBAJO (diapositivas verticales), las de respaldo para las preguntas previsibles del tribunal. Notas
// con el tiempo de cada parte. Universidades, personas y datos del caso, de ejemplo; las cifras del mundo, con su fuente.
// Todos los dibujos son nuestros (SVG como data URL), sin texto dentro: los rótulos van fuera, para traducirse.

import { build, text, card, shape, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, mathBlock, model, base, deep, pairStacks } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// The part of the defence each slide belongs to, above its title («2 · METODOLOGÍA»): the structure the tribunal follows.
const eyebrow = (t, color, bg) => text(t, 100, 24, 900, 28, { fontSize: 15, letterSpacing: 2.5, fontWeight: 700, color: deep(color, bg) });
// The university's mark and footer, on every slide (the deck's master).
const decorOf = (accent, rule, grey, line) => () => [shape('rect', 84, 27, 5, 22, accent), shape('rect', 60, 662, 1160, 1, rule),
  text(line, 60, 670, 1160, 28, { fontSize: 14, color: grey, textAlign: 'right' })];
// A big figure and what it means (with its source underneath).
const stat = (big, html, x, y, w, col, fg, H, bg) => text(`<div style="font-family:${H};font-size:78px;font-weight:700;color:${deep(col, bg)};line-height:1">${big}</div><div style="margin-top:12px">${html}</div>`,
  x, y, w, 230, { fontSize: 23, color: fg, lineHeight: 1.38 });
const src = (t, grey) => `<span style="font-size:16px;color:${grey}">${t}</span>`;
// The conclusion a chart or a table leads to, written next to it — a defence never shows a mute chart.
const takeaway = (html, x, y, w, h, col, fg, bg = '#ffffff') => after(card(html, x, y, w, h, bg, { color: fg, radius: 14, borderColor: col, fontSize: 22, pad: [16, 20, 16, 20] }), 'fade-up');
// Cards from [title, text, colour] rows: two columns, or a row of n.
const grid = (items, { x0 = 100, y0 = 180, dx = 550, dy = 210, w = 530, h = 190, bg = '#ffffff', fg = '#1f2430', ts = 25, ds = 20 } = {}) =>
  items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${fg}">${d}</span>`,
    x0 + (i % 2) * dx, y0 + Math.floor(i / 2) * dy, w, h, bg, { color: fg, radius: 14, borderColor: col, pad: [16, 20, 14, 20] }), 'fade-up'));
const row = (items, { y = 190, h = 300, bg = '#ffffff', fg = '#1f2430', ts = 24, ds = 20, x0 = 100, total = 1080, gap = 24 } = {}) => {
  const w = Math.floor((total - gap * (items.length - 1)) / items.length);
  return items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${fg}">${d}</span>`,
    x0 + i * (w + gap), y, w, h, bg, { color: fg, radius: 14, borderColor: col, pad: [18, 20, 16, 20] }), 'fade-up'));
};
const sample = (x, y, w, grey) => text('<i>Datos de ejemplo</i>', x, y, w, 26, { fontSize: 15, color: grey });

export default {

  // 1 · TFM del Máster de Formación del Profesorado: una situación de aprendizaje puesta en práctica en el Prácticum.
  sci_thesis_edu: { name: 'Defensa de TFM: Máster de Formación del Profesorado', cat: 'sci',
    summary: 'Presentación de defensa del trabajo de fin de máster del Máster de Formación del Profesorado (Biología y Geología): portada institucional, el problema en dos cifras, pregunta y objetivos, marco normativo (LOMLOE, RD 217/2022, DUA), contexto del centro, situación de aprendizaje, cronograma, rúbrica, resultados del Prácticum con su prueba estadística, conclusiones, diapositivas de respaldo para las preguntas del tribunal y notas con los tiempos',
    make: () => {
      const BG = '#f7f6f1', TEAL = '#0f5e63', CORAL = '#d9542c', LEAF = '#3f8f5a', GOLD = '#c99a2e', INK = '#1e2a2b', GREY = '#5c6766', SOFT = '#ece6d6', H = pairStacks('editorial').heading;
      const seal = svgURL(300, 300, `<circle cx="150" cy="150" r="138" fill="none" stroke="#ffffff" stroke-width="4" opacity=".9"/><circle cx="150" cy="150" r="118" fill="none" stroke="#ffffff" stroke-width="1.5" opacity=".55"/>`
        + `<path d="M88 182 Q150 156 212 182 V118 Q150 92 88 118 Z" fill="#ffffff"/><path d="M150 104 V172" stroke="${TEAL}" stroke-width="3"/>`
        + `<path d="M150 98 C176 64 210 72 204 100 C184 110 162 108 150 98 Z" fill="#9fd3a8"/><path d="M150 98 C126 70 96 80 100 104 C120 112 140 108 150 98 Z" fill="#cfe9d3"/>`);
      const plate = svgURL(300, 300, `<circle cx="150" cy="150" r="128" fill="#ffffff" stroke="#d8d1bf" stroke-width="6"/><circle cx="150" cy="150" r="96" fill="#fbfaf6" stroke="#ebe5d6" stroke-width="3"/>`
        + `<path d="M150 150 L150 56 A94 94 0 0 1 238 182 Z" fill="${LEAF}" opacity=".85"/><path d="M150 150 L238 182 A94 94 0 0 1 96 228 Z" fill="${GOLD}" opacity=".85"/><path d="M150 150 L96 228 A94 94 0 0 1 150 56 Z" fill="${CORAL}" opacity=".8"/>`);
      const T = (title, eb, extra, notes, more = {}) => ({ title, layout: 'titleOnly', bg: BG, extra: [eyebrow(eb, TEAL, BG), ...extra], notes, ...more });
      return numbered(ink(build({ name: 'Defensa de TFM: Máster de Formación del Profesorado', palette: 'forest', fonts: 'editorial', title: { size: 42, color: TEAL }, body: { color: INK },
        decor: decorOf(CORAL, '#d6d0c2', GREY, 'Universidad de Ejemplo · Facultad de Educación · Trabajo de Fin de Máster 2026') }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          shape('rect', 0, 0, 440, 662, TEAL), shape('rect', 440, 0, 6, 662, CORAL),
          after(img(seal, 80, 110, 280, 280, 'Escudo de la universidad: un libro abierto con una hoja'), 'zoom-in', { duration: 700 }),
          text('UNIVERSIDAD<br>DE EJEMPLO', 60, 420, 320, 80, { fontSize: 24, letterSpacing: 4, textAlign: 'center', color: '#ffffff', fontWeight: 700 }),
          text('Facultad de Educación', 60, 508, 320, 36, { fontSize: 18, textAlign: 'center', color: '#d5ece8' }),
          text('TRABAJO DE FIN DE MÁSTER · MÁSTER EN FORMACIÓN DEL PROFESORADO · BIOLOGÍA Y GEOLOGÍA', 494, 96, 700, 60, { fontSize: 16, letterSpacing: 2, fontWeight: 700, color: deep(CORAL, BG), lineHeight: 1.4 }),
          text('Comer para cuidar el planeta: una situación de aprendizaje sobre nutrición sostenible para 3.º de ESO', 490, 170, 700, 290, { fontFamily: H, fontSize: 44, fontWeight: 700, color: TEAL, lineHeight: 1.14 }),
          shape('rect', 494, 478, 100, 4, CORAL),
          text('<b>Autora:</b> Irene Salas Vidal<br><b>Tutora:</b> Dra. Carmen Ortiz Lago<br>Junio de 2026', 494, 500, 700, 130, { fontSize: 22, color: INK, lineHeight: 1.55 })],
          notes: '≈30 s. Saluda al tribunal, di tu nombre y el título en una frase: «Propongo y pongo a prueba una situación de aprendizaje sobre nutrición sostenible en 3.º de ESO». Universidad, personas y centro son de ejemplo.' },
        T('Por qué este trabajo', '1 · INTRODUCCIÓN', [
          on(stat('1/3', 'de los alimentos que se producen para el consumo humano se pierde o se desperdicia<br>' + src('FAO (2011), <i>Global food losses and food waste</i>', GREY), 100, 180, 500, TEAL, INK, H, BG), 'fade-up'),
          on(stat('40,6 %', 'de los escolares de 6 a 9 años tiene exceso de peso en España<br>' + src('AESAN, Estudio ALADINO 2019', GREY), 660, 180, 520, CORAL, INK, H, BG), 'fade-up'),
          takeaway('Dos problemas que se cruzan cada día en el comedor escolar… y que el aula de Biología puede abordar a la vez.', 100, 470, 1080, 100, TEAL, INK)],
          '≈1 min. Dos datos reales y su fuente. La idea: la nutrición y la sostenibilidad suelen enseñarse por separado; este trabajo las une en un reto.'),
        T('Pregunta de investigación y objetivos', '1 · INTRODUCCIÓN', [
          on(card(`<span style="font-family:${H};font-size:28px;color:${TEAL}">¿Puede una situación de aprendizaje basada en un reto real mejorar a la vez los conocimientos sobre nutrición y los hábitos sostenibles del alumnado de 3.º de ESO?</span>`,
            100, 178, 1080, 140, SOFT, { radius: 16, pad: [20, 28, 20, 28] }), 'fade-up'),
          text(`<b style="color:${TEAL}">Objetivo general</b><br>Diseñar, aplicar y evaluar una situación de aprendizaje de nutrición sostenible.`, 100, 350, 480, 200, { fontSize: 23, color: INK, lineHeight: 1.45 }),
          text(`<b style="color:${TEAL}">Objetivos específicos</b>` + ul('Relacionar dieta, salud y huella de carbono', 'Aplicar el DUA a todo el grupo', 'Medir el cambio en conocimientos y hábitos'), 620, 350, 560, 260, { fontSize: 22, color: INK, lineHeight: 1.45 })],
          '≈1 min. Lee la pregunta despacio: es la que vas a responder en las conclusiones. Los objetivos específicos ordenan el resto de la presentación.'),
        T('Marco normativo y pedagógico', '2 · MARCO TEÓRICO', [
          dg('timeline', '2018\n  Pautas DUA 2.2 (CAST)\n2020\n  LOMLOE (Ley Orgánica 3/2020)\n2022\n  RD 217/2022: currículo de la ESO\n2024\n  Pautas DUA 3.0 (CAST)', 100, 180, 1080, 300, { colors: 'colorful' }),
          text('La propuesta se apoya en tres ideas: aprendizaje basado en retos, aprendizaje cooperativo (Johnson y Johnson) y Diseño Universal para el Aprendizaje.', 100, 510, 1080, 90, { fontSize: 22, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
          '≈1 min 30 s. No recites la ley: di qué te aporta cada hito. La LOMLOE y el RD 217/2022 piden situaciones de aprendizaje y competencias; el DUA da la forma de atender a todo el grupo.'),
        T('El contexto: centro y grupo', '3 · METODOLOGÍA', [
          ...row([['IES de Ejemplo', 'Centro urbano de 620 alumnos, con huerto escolar y comedor propio.', TEAL], ['3.º B de ESO', '24 alumnos y alumnas; 3 con necesidades específicas de apoyo educativo.', CORAL],
            ['Prácticum', 'Ocho sesiones de 55 minutos en marzo de 2026, con la tutora del centro.', LEAF]], { y: 190, h: 240 }),
          sample(100, 460, 400, GREY)],
          '≈1 min. Sitúa al tribunal: dónde, con quién y cuánto tiempo. Los datos del centro son de ejemplo: pon los tuyos.'),
        T('La situación de aprendizaje', '3 · METODOLOGÍA', [
          ...grid([['Contexto y reto', 'El comedor quiere un menú más sano y sostenible: el grupo lo diseña.', TEAL],
            ['Competencias específicas', 'Biología y Geología: proyectos de investigación (CE3) y hábitos saludables y sostenibles (CE5).', CORAL],
            ['Saberes básicos', 'Ecología y sostenibilidad; cuerpo humano; hábitos saludables (RD 217/2022).', LEAF],
            ['Producto final', 'Un menú semanal presentado al comedor y a las familias.', GOLD]], { y0: 178, dy: 200, h: 182 })],
          '≈2 min. Los cuatro elementos que exige la norma, en una diapositiva. Insiste en el producto final con destinatario real: es lo que da sentido al reto.'),
        T('Cronograma de las ocho sesiones', '3 · METODOLOGÍA', [
          tableBlock({ x: 100, y: 174, w: 1080, h: 440, fontSize: 17, header: true, headBg: TEAL, headFg: '#ffffff', stroke: '#d6d0c2', banded: true, band: TEAL,
            rows: [['Sesión', 'Fase', 'Actividad', 'Evidencia'], ['1', 'Activación', '¿Qué hay en tu plato? Registro de tres días', 'Diario de alimentación'],
              ['2', 'Investigación', 'Nutrientes y aparato digestivo', 'Mapa conceptual'], ['3', 'Investigación', 'Huella de carbono de los alimentos', 'Tabla comparativa'],
              ['4', 'Investigación', 'Visita al comedor y al huerto', 'Cuaderno de campo'], ['5', 'Diseño', 'Menú en equipos cooperativos', 'Borrador del menú'],
              ['6', 'Diseño', 'Cálculo nutricional y de huella', 'Hoja de cálculo'], ['7', 'Comunicación', 'Presentación al comedor', 'Exposición oral'],
              ['8', 'Cierre', 'Autoevaluación y coevaluación', 'Rúbrica']] })],
          '≈1 min 30 s. No leas la tabla: señala el recorrido (activar, investigar, diseñar, comunicar) y una sesión concreta que salió especialmente bien.'),
        T('Atención a la diversidad con el DUA', '3 · METODOLOGÍA', [
          ...row([['Implicación', 'Cada equipo elige el plato que rediseña; roles que rotan en cada sesión.', TEAL], ['Representación', 'Vídeo, infografía, lectura fácil y etiquetas reales de alimentos.', CORAL],
            ['Acción y expresión', 'El menú se presenta en cartel, vídeo o exposición: lo elige cada equipo.', LEAF]], { y: 190, h: 260 }),
          on(img(plate, 520, 470, 240, 150, 'Un plato dividido en tres partes de colores'), 'zoom-in', { start: 'afterPrev' })],
          '≈1 min 30 s. Los tres principios de CAST (pautas DUA 3.0, 2024) con una medida concreta cada uno. Si te preguntan por el alumnado con NEAE, tienes la respuesta en la diapositiva de respaldo.'),
        T('Evaluación: rúbrica del producto final', '3 · METODOLOGÍA', [
          tableBlock({ x: 100, y: 174, w: 1080, h: 400, fontSize: 17, header: true, headBg: TEAL, headFg: '#ffffff', stroke: '#d6d0c2', banded: true, band: TEAL,
            rows: [['Criterio', 'Iniciado (1)', 'En proceso (2)', 'Conseguido (3)', 'Excelente (4)'],
              ['Rigor nutricional', 'Errores graves', 'Algún desequilibrio', 'Menú equilibrado', 'Equilibrado y justificado'],
              ['Sostenibilidad', 'No la considera', 'Solo un criterio', 'Temporada y proximidad', 'Calcula la huella'],
              ['Trabajo cooperativo', 'Trabajo individual', 'Reparto desigual', 'Roles cumplidos', 'Ayuda mutua visible'],
              ['Comunicación', 'Lee el texto', 'Poco clara', 'Clara y ordenada', 'Convence al comedor']] }),
          text('Debajo: los instrumentos y su peso en la nota.', 100, 596, 1080, 32, { fontSize: 18, color: GREY, textAlign: 'center' })],
          '≈1 min 30 s. Explica un criterio con un ejemplo real. Si te preguntan cómo se califica, baja a la diapositiva de respaldo.'),
        T('Respaldo · instrumentos y peso de la evaluación', 'DIAPOSITIVA DE RESPALDO', [
          chartBlock({ x: 100, y: 174, w: 560, h: 440, chartType: 'doughnut', color: TEAL, dataLabels: true,
            data: [{ label: 'Producto final (rúbrica)', value: 40, color: TEAL }, { label: 'Diario y cuaderno', value: 25, color: CORAL }, { label: 'Prueba de conocimientos', value: 20, color: LEAF }, { label: 'Coevaluación y autoevaluación', value: 15, color: GOLD }] }),
          text('Cuatro instrumentos para no depender de un examen: el producto pesa más porque es donde se ven las competencias.', 720, 230, 460, 200, { fontSize: 23, color: INK, lineHeight: 1.45 }),
          sample(720, 450, 400, GREY)],
          'Solo si el tribunal pregunta por la calificación. Pesos de ejemplo.', { vertical: true }),
        T('Resultados del Prácticum', '4 · RESULTADOS', [
          chartBlock({ x: 100, y: 174, w: 680, h: 430, chartType: 'bar', color: '#9fb7b4', grid: true, dataLabels: true, yTitle: 'Puntuación media (0-10)', seriesName: 'Antes',
            data: [{ label: 'Conocimientos', value: 5.1 }, { label: 'Hábitos sostenibles', value: 4.6 }, { label: 'Actitud hacia la ciencia', value: 6.2 }],
            series: [{ name: 'Después', color: TEAL, values: [7.4, 6.3, 7.1] }] }),
          on(stat('+2,3', 'puntos de media en conocimientos, de 5,1 a 7,4 (n = 24)', 820, 190, 360, TEAL, INK, H, BG), 'fade-up', { start: 'afterPrev' }),
          takeaway('Mejoran las tres dimensiones; la mayor subida, en conocimientos.', 820, 440, 360, 110, CORAL, INK),
          sample(820, 572, 360, GREY)],
          '≈2 min. Di primero la conclusión y luego señala las barras. Si preguntan si la mejora es significativa, baja a la diapositiva de respaldo.'),
        T('Respaldo · ¿es significativa la mejora?', 'DIAPOSITIVA DE RESPALDO', [
          mathBlock({ x: 100, y: 190, w: 520, h: 150, fontSize: 44, color: INK, latex: 't = \\frac{\\bar{d}}{s_d / \\sqrt{n}}' }),
          text('Prueba t para muestras relacionadas (antes y después del mismo grupo); la normalidad de las diferencias se comprobó con Shapiro-Wilk (p = 0,41).', 100, 370, 520, 160, { fontSize: 21, color: GREY, lineHeight: 1.45 }),
          ...grid([['t(23) = 6,2', 'p < 0,001: la mejora en conocimientos es significativa.', TEAL]], { x0: 680, y0: 190, w: 500, h: 170 }),
          ...grid([['d = 1,3', 'Tamaño del efecto grande (d de Cohen).', CORAL]], { x0: 680, y0: 390, w: 500, h: 170 }),
          sample(680, 580, 400, GREY)],
          'Solo si lo preguntan. Media de las diferencias 2,3 con desviación típica 1,8: t = 6,2 y d ≈ 1,3. Datos de ejemplo.', { vertical: true }),
        T('Limitaciones y líneas futuras', '5 · DISCUSIÓN', [
          on(card(`<b style="font-size:26px;color:${deep(CORAL, '#ffffff')}">Limitaciones</b>` + ul('Un solo grupo, sin grupo de control', 'Ocho sesiones: efecto a corto plazo', 'Hábitos medidos con un cuestionario autoinformado'),
            100, 180, 520, 380, '#ffffff', { color: INK, radius: 14, borderColor: CORAL, fontSize: 22, pad: [20, 24, 18, 24] }), 'fade-up'),
          on(card(`<b style="font-size:26px;color:${deep(TEAL, '#ffffff')}">Líneas futuras</b>` + ul('Diseño cuasiexperimental con grupo de control', 'Medir los hábitos a los tres meses', 'Extenderla al comedor y a 1.º de Bachillerato'),
            660, 180, 520, 380, '#ffffff', { color: INK, radius: 14, borderColor: TEAL, fontSize: 22, pad: [20, 24, 18, 24] }), 'fade-up', { start: 'afterPrev' })],
          '≈1 min. Reconocer las limitaciones antes de que te las señalen da seguridad. Cada limitación tiene su línea futura enfrente.'),
        { layout: 'blank', bg: BG, extra: [eyebrow('6 · CONCLUSIONES', TEAL, BG),
          text('Un reto real convierte la nutrición en una decisión que el alumnado toma, no en un tema que estudia.', 100, 110, 1080, 170, { fontFamily: H, fontSize: 44, fontWeight: 700, color: TEAL, lineHeight: 1.18 }),
          ...row([['Aprenden más', 'Los conocimientos suben 2,3 puntos de media.', TEAL], ['Cambian hábitos', 'Mejoran las respuestas sobre consumo sostenible.', CORAL], ['Incluye a todo el grupo', 'El DUA permite participar al alumnado con NEAE.', LEAF]], { y: 320, h: 230 })],
          notes: '≈1 min. Responde a la pregunta inicial con una frase y tres conclusiones. Es lo que el tribunal recordará.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          shape('rect', 0, 0, 1280, 640, TEAL), glow(1000, 380, 520, CORAL, TEAL, 30),
          text('Gracias.<br>¿Preguntas?', 100, 150, 760, 250, { fontFamily: H, fontSize: 78, fontWeight: 700, color: '#ffffff', lineHeight: 1.08 }),
          text('A mi tutora, al IES de Ejemplo y al alumnado de 3.º B, que hizo posible la propuesta.', 100, 430, 760, 100, { fontSize: 23, color: '#d5ece8', lineHeight: 1.45 }),
          timer(600, 930, 200, 260, { color: '#ffffff', endText: 'Tiempo' })],
          notes: '≈30 s. Agradece y abre el turno de preguntas. La cuenta atrás de 10 minutos es para el turno del tribunal. Debajo tienes las respuestas a las preguntas más previsibles.' },
        T('Respaldo · preguntas previsibles del tribunal', 'DIAPOSITIVA DE RESPALDO', [
          ...grid([['¿Por qué 3.º de ESO?', 'Es el curso en que el currículo trata el cuerpo humano y los hábitos saludables (RD 217/2022).', TEAL],
            ['¿Y el alumnado con NEAE?', 'Pautas DUA: materiales en lectura fácil y elección del formato del producto final.', CORAL],
            ['¿Es extrapolable?', 'Sí: basta el menú del comedor o el de casa; el huerto es opcional.', LEAF],
            ['¿Qué cambiarías?', 'Añadir un grupo de control y medir los hábitos a los tres meses.', GOLD]], { y0: 178, dy: 200, h: 182 })],
          'Respuestas cortas preparadas. Solo se abren si el tribunal pregunta algo de esto.', { vertical: true }),
      ]), INK));
    } },

  // 2 · TFG de ADE: un plan de empresa con su viabilidad (VAN, TIR y punto de equilibrio).
  sci_thesis_biz: { name: 'Defensa de TFG: ADE y plan de empresa', cat: 'sci',
    summary: 'Presentación de defensa del trabajo de fin de grado de ADE (plan de empresa): portada, la oportunidad en cifras, pregunta y objetivos, metodología, encuesta de mercado, DAFO en matriz, marketing mix, cuenta de resultados, VAN y TIR con su fórmula, punto de equilibrio en gráfico, conclusiones, diapositivas de respaldo (hipótesis, sensibilidad y preguntas del tribunal) y notas con los tiempos',
    make: () => {
      const BG = '#f5f6fa', NAVY = '#1d2b53', AMBER = '#e89f2c', MINT = '#2a9d8f', ROSE = '#d1495b', INK = '#1b2233', GREY = '#5d667a', H = pairStacks('modern').heading;
      const bike = svgURL(380, 300, `<circle cx="92" cy="200" r="70" fill="none" stroke="${NAVY}" stroke-width="12"/><circle cx="292" cy="200" r="70" fill="none" stroke="${NAVY}" stroke-width="12"/>`
        + `<circle cx="92" cy="200" r="8" fill="${NAVY}"/><circle cx="292" cy="200" r="8" fill="${NAVY}"/>`
        + `<path d="M92 200 L160 110 L250 110 L292 200 M160 110 L200 200 L250 110 M200 200 L92 200" fill="none" stroke="${AMBER}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>`
        + `<rect x="170" y="122" width="70" height="26" rx="8" fill="${MINT}"/><path d="M200 128 L192 138 L202 138 L196 146" fill="none" stroke="#ffffff" stroke-width="3"/>`
        + `<path d="M150 92 L176 92 M250 110 L258 74 L282 70" fill="none" stroke="${NAVY}" stroke-width="10" stroke-linecap="round"/>`);
      const T = (title, eb, extra, notes, more = {}) => ({ title, layout: 'titleOnly', bg: BG, extra: [eyebrow(eb, NAVY, BG), ...extra], notes, ...more });
      return numbered(ink(build({ name: 'Defensa de TFG: ADE y plan de empresa', palette: 'ocean', fonts: 'modern', title: { size: 42, color: NAVY }, body: { color: INK },
        decor: decorOf(AMBER, '#d5d9e4', GREY, 'Universidad de Ejemplo · Facultad de Economía y Empresa · Trabajo de Fin de Grado 2026') }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(1040, 120, 560, AMBER, BG, 22), glow(-120, 560, 480, MINT, BG, 14)], extra: [
          text('TRABAJO DE FIN DE GRADO · GRADO EN ADMINISTRACIÓN Y DIRECCIÓN DE EMPRESAS', 92, 104, 720, 60, { fontSize: 16, letterSpacing: 2, fontWeight: 700, color: deep(AMBER, BG), lineHeight: 1.4 }),
          text('Pedal: plan de empresa de un servicio de bicicletas eléctricas por suscripción para estudiantes universitarios', 88, 176, 720, 280, { fontFamily: H, fontSize: 44, fontWeight: 700, color: NAVY, lineHeight: 1.12 }),
          shape('rect', 92, 470, 100, 4, AMBER),
          text('<b>Autor:</b> Daniel Prieto Gómez<br><b>Tutora:</b> Dra. Elena Ruiz Calvo<br>Universidad de Ejemplo · Julio de 2026', 92, 494, 720, 130, { fontSize: 22, color: INK, lineHeight: 1.55 }),
          after(img(bike, 860, 190, 360, 290, 'Una bicicleta eléctrica dibujada con su batería'), 'fade-left', { duration: 800 })],
          notes: '≈30 s. Presenta el proyecto en una frase: «Una bici eléctrica por 29 € al mes, con mantenimiento incluido, para quien estudia lejos del campus». Nombres y empresa, de ejemplo.' },
        T('Por qué este trabajo', '1 · INTRODUCCIÓN', [
          on(stat('≈ 25 %', 'de las emisiones de gases de efecto invernadero de la UE procede del transporte<br>' + src('Agencia Europea de Medio Ambiente (EEA)', GREY), 100, 180, 520, NAVY, INK, H, BG), 'fade-up'),
          on(stat('6 km', 'es la distancia media entre casa y campus de quienes respondieron la encuesta<br>' + src('Encuesta propia, n = 312 · datos de ejemplo', GREY), 680, 180, 500, AMBER, INK, H, BG), 'fade-up'),
          takeaway('Un trayecto diario y corto, y una alternativa cara de comprar: ahí está la oportunidad de negocio.', 100, 470, 1080, 100, NAVY, INK)],
          '≈1 min. Del problema general (movilidad y emisiones) al concreto (el trayecto al campus). La segunda cifra es de tu encuesta: sustitúyela por la tuya.'),
        T('Pregunta y objetivos', '1 · INTRODUCCIÓN', [
          on(card(`<span style="font-family:${H};font-size:28px;color:${NAVY}">¿Es viable económicamente un servicio de bicicletas eléctricas por suscripción para estudiantes en una ciudad universitaria mediana?</span>`,
            100, 178, 1080, 130, '#e9ecf4', { radius: 16, pad: [20, 28, 20, 28] }), 'fade-up'),
          ...row([['Mercado', 'Medir la demanda y el precio que se está dispuesto a pagar.', MINT], ['Modelo', 'Diseñar el servicio y su estrategia comercial.', AMBER], ['Viabilidad', 'Calcular VAN, TIR y punto de equilibrio.', NAVY]], { y: 340, h: 200 })],
          '≈1 min. Una pregunta cerrada, que las conclusiones responderán con un sí o un no argumentado.'),
        T('Metodología', '2 · METODOLOGÍA', [
          dg('chevrons', 'Entorno\n  Análisis PESTEL\nMercado\n  Encuesta a 312 estudiantes\nDiagnóstico\n  Análisis DAFO\nEstrategia\n  Marketing mix\nViabilidad\n  VAN, TIR y umbral', 100, 190, 1080, 260, { colors: 'colorful' }),
          text('Datos primarios (encuesta en línea, marzo de 2026) y secundarios (informes sectoriales y precios de proveedores).', 100, 490, 1080, 80, { fontSize: 22, color: GREY, textAlign: 'center', lineHeight: 1.4 })],
          '≈1 min. Cada fase alimenta a la siguiente: de lo general (entorno) a la cifra que decide (viabilidad).'),
        T('La oportunidad de mercado', '3 · RESULTADOS', [
          chartBlock({ x: 100, y: 174, w: 680, h: 430, chartType: 'bar', color: NAVY, grid: true, dataLabels: true, yTitle: '% de respuestas', seriesName: '¿Te suscribirías por 29 €/mes?',
            data: [{ label: 'Seguro que sí', value: 14, color: MINT }, { label: 'Probablemente', value: 27, color: MINT }, { label: 'No lo sé', value: 22, color: AMBER }, { label: 'No', value: 37, color: ROSE }] }),
          on(stat('41 %', 'se suscribiría «seguro» o «probablemente» a 29 € al mes', 820, 190, 360, MINT, INK, H, BG), 'fade-up', { start: 'afterPrev' }),
          takeaway('Con solo un 10 % de ellos en el primer año ya se superan los 400 suscriptores.', 820, 440, 360, 120, AMBER, INK),
          sample(820, 580, 360, GREY)],
          '≈1 min 30 s. La pregunta clave de la encuesta. Di la conclusión antes de enseñar las barras.'),
        T('Diagnóstico: análisis DAFO', '3 · RESULTADOS', [
          text('Negativas', 300, 172, 380, 26, { fontSize: 16, letterSpacing: 2, color: GREY, textAlign: 'center', fontWeight: 700 }),
          text('Positivas', 760, 172, 380, 26, { fontSize: 16, letterSpacing: 2, color: GREY, textAlign: 'center', fontWeight: 700 }),
          text('Internas', 96, 280, 120, 30, { fontSize: 16, letterSpacing: 2, color: GREY, fontWeight: 700 }),
          text('Externas', 96, 480, 120, 30, { fontSize: 16, letterSpacing: 2, color: GREY, fontWeight: 700 }),
          ...grid([['Debilidades', 'Marca nueva; flota pequeña al principio.', ROSE], ['Fortalezas', 'Mantenimiento incluido; puntos en el campus.', MINT],
            ['Amenazas', 'Patinetes compartidos; robos y vandalismo.', AMBER], ['Oportunidades', 'Zonas de bajas emisiones; carril bici en obras.', NAVY]], { x0: 230, y0: 206, dx: 470, dy: 200, w: 450, h: 180 })],
          '≈1 min 30 s. Lee la matriz por filas: lo que depende de nosotros (internas) y lo que no (externas). La estrategia de la siguiente diapositiva responde a esta matriz.'),
        T('Estrategia: marketing mix', '3 · RESULTADOS', [
          ...row([['Producto', 'Bici eléctrica con seguro y mantenimiento incluidos.', NAVY], ['Precio', '29 € al mes; tres meses de verano sin cuota.', AMBER],
            ['Distribución', 'Aplicación y tres puntos de recogida en el campus.', MINT], ['Comunicación', 'Embajadores en cada facultad y redes sociales.', ROSE]], { y: 190, h: 270, ts: 22, ds: 19 }),
          text('Público objetivo: universitarios a 3-10 km del campus y sin coche propio.', 100, 500, 1080, 50, { fontSize: 23, color: INK, textAlign: 'center' })],
          '≈1 min 30 s. Las cuatro P, cada una respondiendo a algo del DAFO: el mantenimiento incluido contra la debilidad de ser una marca nueva.'),
        T('Plan financiero: cuenta de resultados', '4 · VIABILIDAD', [
          tableBlock({ x: 100, y: 176, w: 1080, h: 340, fontSize: 20, header: true, headBg: NAVY, headFg: '#ffffff', stroke: '#d5d9e4', banded: true, band: NAVY,
            rows: [['Concepto (€)', 'Año 1', 'Año 2', 'Año 3'], ['Suscriptores medios', '400', '630', '750'], ['Ingresos', '139.200', '219.240', '261.000'],
              ['Costes variables', '48.000', '75.600', '90.000'], ['Costes fijos', '96.000', '96.000', '100.000'], ['<b>EBITDA</b>', '<b>−4.800</b>', '<b>47.640</b>', '<b>71.000</b>']] }),
          takeaway('Pérdidas pequeñas el primer año y beneficio desde el segundo. Debajo: las hipótesis.', 100, 540, 1080, 80, MINT, INK)],
          '≈1 min 30 s. Señala el EBITDA: negativo el año 1 (aún por debajo del punto de equilibrio) y positivo después. Si preguntan de dónde salen las cifras, baja a las hipótesis.'),
        T('Respaldo · hipótesis del plan', 'DIAPOSITIVA DE RESPALDO', [
          tableBlock({ x: 100, y: 176, w: 1080, h: 380, fontSize: 20, header: true, headBg: NAVY, headFg: '#ffffff', stroke: '#d5d9e4', banded: true, band: NAVY,
            rows: [['Hipótesis', 'Valor'], ['Cuota', '29 € al mes (348 € al año)'], ['Coste variable por suscriptor', '120 € al año (mantenimiento y seguro)'],
              ['Costes fijos', '96.000 € al año (personal, local y aplicación)'], ['Inversión inicial', '150.000 € (300 bicicletas y la aplicación)'], ['Tasa de descuento', '8 %'], ['Horizonte', '5 años']] }),
          sample(100, 580, 400, GREY)],
          'Solo si preguntan por los supuestos. Todos los valores son de ejemplo.', { vertical: true }),
        T('Viabilidad: VAN y TIR', '4 · VIABILIDAD', [
          mathBlock({ x: 100, y: 176, w: 620, h: 130, fontSize: 38, color: INK, latex: '\\mathrm{VAN} = -I_0 + \\sum_{t=1}^{5} \\frac{FC_t}{(1+k)^t}' }),
          tableBlock({ x: 100, y: 330, w: 620, h: 130, fontSize: 18, header: true, headBg: NAVY, headFg: '#ffffff', stroke: '#d5d9e4',
            rows: [['Año', '0', '1', '2', '3', '4', '5'], ['Flujo (miles de €)', '−150', '−5', '45', '65', '70', '75']] }),
          ...grid([['VAN (k = 8 %)', '38.046 €', MINT]], { x0: 780, y0: 176, w: 400, h: 130, ts: 22, ds: 40 }),
          ...grid([['TIR', '14,9 %', AMBER]], { x0: 780, y0: 326, w: 400, h: 130, ts: 22, ds: 40 }),
          takeaway('VAN positivo y TIR mayor que la tasa exigida: el proyecto crea valor.', 780, 490, 400, 110, NAVY, INK),
          sample(100, 480, 400, GREY)],
          '≈1 min 30 s. La fórmula, los flujos y el resultado. Interprétalo: la inversión se recupera y deja 38.046 € de valor actual. Si preguntan qué pasa si cambian los supuestos, baja al análisis de sensibilidad.'),
        T('Respaldo · análisis de sensibilidad', 'DIAPOSITIVA DE RESPALDO', [
          chartBlock({ x: 100, y: 176, w: 680, h: 420, chartType: 'bar', color: NAVY, grid: true, dataLabels: true, yTitle: 'VAN (miles de €)', seriesName: 'VAN',
            data: [{ label: 'Pesimista', value: -21, color: ROSE }, { label: 'Base', value: 38, color: NAVY }, { label: 'Optimista', value: 79, color: MINT }] }),
          text('Pesimista: cuota de 25 € y un 20 % menos de suscriptores. Optimista: convenio con la universidad. El precio es la variable crítica.', 820, 200, 360, 280, { fontSize: 22, color: INK, lineHeight: 1.45 }),
          sample(820, 500, 360, GREY)],
          'Solo si preguntan por el riesgo. Escenarios de ejemplo.', { vertical: true }),
        T('El punto de equilibrio', '4 · VIABILIDAD', [
          chartBlock({ x: 100, y: 174, w: 680, h: 440, chartType: 'line', color: MINT, grid: true, xTitle: 'Suscriptores', yTitle: 'Miles de € al año', seriesName: 'Ingresos',
            data: [0, 100, 200, 300, 400, 500, 600, 700, 800].map(q => ({ label: String(q), value: Math.round(q * 0.348 * 10) / 10 })),
            series: [{ name: 'Costes totales', color: ROSE, values: [0, 100, 200, 300, 400, 500, 600, 700, 800].map(q => Math.round((96 + q * 0.12) * 10) / 10) }] }),
          mathBlock({ x: 800, y: 190, w: 380, h: 120, fontSize: 30, color: INK, latex: 'Q^{*} = \\frac{CF}{p - c_v} = \\frac{96.000}{348 - 120}' }),
          on(stat('421', 'suscriptores para cubrir todos los costes', 820, 330, 360, MINT, INK, H, BG), 'fade-up', { start: 'afterPrev' })],
          '≈1 min. Donde se cruzan las líneas: 421 suscriptores. El año 1 se queda justo por debajo (400), por eso su EBITDA es negativo.'),
        { layout: 'blank', bg: BG, extra: [eyebrow('5 · CONCLUSIONES', NAVY, BG),
          text('Sí es viable: con 421 suscriptores cubre costes y, a cinco años, crea 38.046 € de valor.', 100, 110, 1080, 170, { fontFamily: H, fontSize: 44, fontWeight: 700, color: NAVY, lineHeight: 1.18 }),
          ...row([['Hay demanda', 'El 41 % pagaría 29 € al mes.', MINT], ['Es rentable', 'VAN de 38.046 € y TIR del 14,9 %.', AMBER], ['El riesgo es el precio', 'Con una cuota de 25 €, el VAN sería negativo.', ROSE]], { y: 320, h: 230 })],
          notes: '≈1 min. Responde a la pregunta de investigación con un sí argumentado y su principal riesgo.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          shape('rect', 0, 0, 1280, 640, NAVY), glow(1000, 380, 520, AMBER, NAVY, 30),
          text('Gracias.<br>¿Preguntas?', 100, 150, 760, 250, { fontFamily: H, fontSize: 78, fontWeight: 700, color: '#ffffff', lineHeight: 1.08 }),
          text('A mi tutora y a los 312 estudiantes que respondieron la encuesta.', 100, 430, 760, 90, { fontSize: 23, color: '#d9def0', lineHeight: 1.45 }),
          timer(600, 930, 200, 260, { color: '#ffffff', endText: 'Tiempo' })],
          notes: '≈30 s. Agradece y abre el turno. Debajo, las respuestas a las preguntas más previsibles.' },
        T('Respaldo · preguntas previsibles del tribunal', 'DIAPOSITIVA DE RESPALDO', [
          ...grid([['¿Por qué una tasa del 8 %?', 'Rentabilidad exigida por los socios en un proyecto de riesgo medio; la sensibilidad prueba otras.', NAVY],
            ['¿Y si entra un competidor grande?', 'Diferenciación: mantenimiento incluido, puntos en el campus y convenio con la universidad.', AMBER],
            ['¿Cómo se financia la inversión?', 'Un 60 % con préstamo y un 40 % con capital de los socios (supuesto del plan).', MINT],
            ['¿Por qué suscripción y no venta?', 'Quien estudia no puede adelantar más de mil euros; la cuota baja la barrera.', ROSE]], { y0: 178, dy: 200, h: 182 })],
          'Respuestas cortas preparadas. Solo se abren si el tribunal pregunta algo de esto.', { vertical: true }),
      ]), INK));
    } },

  // 3 · TFG de Arquitectura: la rehabilitación bioclimática de un mercado como biblioteca de barrio.
  sci_thesis_arch: { name: 'Defensa de TFG: Arquitectura', cat: 'sci',
    summary: 'Presentación de defensa del trabajo de fin de grado de Arquitectura (proyecto de rehabilitación): portada con alzado dibujado, el problema en cifras, pregunta y objetivos, lugar y contexto, idea generadora, planta y sección dibujadas, estrategia bioclimática, materiales, cumplimiento del CTE en tabla, conclusiones, diapositivas de respaldo (demanda energética, presupuesto y preguntas del tribunal) y notas con los tiempos',
    make: () => {
      const BG = '#f2f1ec', INK = '#232323', COBALT = '#2b59c3', OCHRE = '#c98a1d', BRICK = '#a64b2a', SAGE = '#5f8f6b', GREY = '#5c5b55', LINE = '#3a3a36', H = pairStacks('editorial').heading;
      // The market hall of 1928: brick base with arches, a vaulted iron roof and its skylight (an elevation, no words in it).
      const hall = svgURL(400, 320, `<rect x="20" y="300" width="360" height="4" fill="${LINE}"/>`
        + `<rect x="40" y="170" width="320" height="130" fill="#d8b49a" stroke="${LINE}" stroke-width="3"/>`
        + [0, 1, 2, 3, 4].map(i => `<path d="M${62 + i * 62} 300 V230 A24 24 0 0 1 ${110 + i * 62} 230 V300 Z" fill="#f5efe4" stroke="${LINE}" stroke-width="2.5"/>`).join('')
        + `<path d="M30 172 Q200 40 370 172 Z" fill="#9fb4c9" stroke="${LINE}" stroke-width="3"/>`
        + [1, 2, 3, 4, 5, 6].map(i => `<path d="M${30 + i * 48.5} 172 Q200 ${60 + Math.abs(i - 3.5) * 12} ${30 + i * 48.5} 172" fill="none" stroke="${LINE}" stroke-width="1" opacity=".5"/>`).join('')
        + `<rect x="160" y="70" width="80" height="26" fill="${OCHRE}" stroke="${LINE}" stroke-width="2.5"/><rect x="40" y="200" width="320" height="6" fill="${BRICK}" opacity=".7"/>`);
      // The site: blocks of the old town, the plot in blue, the square in green, the north.
      const site = svgURL(460, 400, `<rect width="460" height="400" fill="#e7e5dd"/>`
        + [[20, 20, 140, 110], [180, 20, 120, 110], [320, 20, 120, 160], [20, 150, 140, 120], [20, 290, 200, 90], [240, 290, 200, 90], [320, 200, 120, 70]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cfccc2"/>`).join('')
        + `<rect x="180" y="150" width="120" height="120" fill="${COBALT}" opacity=".9"/><rect x="306" y="200" width="8" height="70" fill="#e7e5dd"/><circle cx="380" cy="240" r="0"/>`
        + `<rect x="180" y="20" width="0" height="0"/><path d="M196 166 h88 v88 h-88 Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 5"/>`
        + `<rect x="320" y="200" width="120" height="70" fill="${SAGE}" opacity=".75"/>`
        + `<g transform="translate(410 330)"><circle r="22" fill="#ffffff" stroke="${LINE}" stroke-width="2"/><path d="M0 -16 L8 10 L0 4 L-8 10 Z" fill="${LINE}"/></g>`);
      // The idea in three moves: keep the hall, insert a wooden box, open a courtyard.
      const move = n => svgURL(260, 200, `<path d="M20 160 V90 Q130 10 240 90 V160 Z" fill="#ffffff" stroke="${LINE}" stroke-width="3"/>`
        + (n >= 2 ? `<rect x="60" y="100" width="${n >= 3 ? 70 : 140}" height="60" fill="${OCHRE}" opacity=".9"/>${n >= 3 ? '<rect x="150" y="100" width="50" height="60" fill="' + OCHRE + '" opacity=".9"/>' : ''}` : '')
        + (n >= 3 ? `<rect x="132" y="100" width="16" height="60" fill="${SAGE}"/><circle cx="140" cy="92" r="10" fill="${SAGE}"/>` : '')
        + `<rect x="10" y="160" width="240" height="4" fill="${LINE}"/>`);
      // The ground floor: zones by colour and number (the legend is beside it).
      const PLAN = [[1, 40, 250, 130, 110, '#cfd9ef'], [2, 180, 60, 240, 300, '#f0dcb5'], [3, 40, 60, 130, 180, '#d9e8d6'], [4, 430, 60, 130, 150, '#efd2c7'], [5, 430, 220, 130, 140, '#e2e0d8'], [6, 290, 150, 60, 120, '#b9d3bf']];
      const plan = svgURL(600, 400, `<rect x="30" y="50" width="540" height="320" fill="#ffffff" stroke="${LINE}" stroke-width="6"/>`
        + PLAN.map(([n, x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="${LINE}" stroke-width="2"/><circle cx="${x + 22}" cy="${y + 22}" r="15" fill="${LINE}"/><text x="${x + 22}" y="${y + 28}" font-family="sans-serif" font-size="17" font-weight="700" fill="#ffffff" text-anchor="middle">${n}</text>`).join('')
        + `<path d="M90 370 v20 M130 370 v20" stroke="${COBALT}" stroke-width="5"/><path d="M110 398 l-10 -12 h20 Z" fill="${COBALT}"/>`);
      // The section: the vault, the north skylights, air in low and out through the top; numbers for the legend.
      const section = svgURL(620, 360, `<rect x="20" y="320" width="580" height="6" fill="${LINE}"/><path d="M60 320 V170 Q310 20 560 170 V320" fill="#ffffff" stroke="${LINE}" stroke-width="5"/>`
        + `<rect x="260" y="66" width="100" height="34" fill="#cfe1f2" stroke="${LINE}" stroke-width="3"/><rect x="130" y="230" width="360" height="90" fill="${OCHRE}" opacity=".35" stroke="${OCHRE}" stroke-width="2"/>`
        + `<path d="M20 290 h70" stroke="${COBALT}" stroke-width="5"/><path d="M90 290 l-14 -9 v18 Z" fill="${COBALT}"/><path d="M150 250 C230 200 280 150 300 110" fill="none" stroke="${COBALT}" stroke-width="4" stroke-dasharray="10 7"/><path d="M310 100 l-4 -16 l14 8 Z" fill="${COBALT}"/>`
        + `<path d="M420 30 L380 100" stroke="${OCHRE}" stroke-width="5"/><path d="M372 112 l2 -18 l12 10 Z" fill="${OCHRE}"/>`
        + [[1, 55, 285], [2, 290, 40], [3, 440, 30], [4, 310, 270]].map(([n, x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${LINE}"/><text x="${x}" y="${y + 6}" font-family="sans-serif" font-size="17" font-weight="700" fill="#ffffff" text-anchor="middle">${n}</text>`).join(''));
      const swatch = kind => svgURL(120, 120, kind === 'clt' ? `<rect width="120" height="120" fill="#d9b27c"/>${[20, 44, 68, 92].map(y => `<rect x="0" y="${y}" width="120" height="3" fill="#b88d55"/>`).join('')}`
        : kind === 'brick' ? `<rect width="120" height="120" fill="#e9e3d8"/>${[0, 1, 2, 3, 4].map(r => [0, 1, 2].map(c => `<rect x="${c * 44 - (r % 2) * 22 + 2}" y="${r * 24 + 2}" width="40" height="20" fill="#b9573a"/>`).join('')).join('')}`
        : kind === 'lime' ? `<rect width="120" height="120" fill="#efebe2"/><circle cx="40" cy="50" r="18" fill="#e3ddd0"/><circle cx="85" cy="80" r="22" fill="#e6e1d6"/>`
        : `<rect width="120" height="120" fill="#cfe1f2"/><path d="M0 120 L120 0" stroke="#ffffff" stroke-width="10" opacity=".7"/><path d="M30 120 L120 30" stroke="#ffffff" stroke-width="4" opacity=".6"/>`);
      const T = (title, eb, extra, notes, more = {}) => ({ title, layout: 'titleOnly', bg: BG, extra: [eyebrow(eb, COBALT, BG), ...extra], notes, ...more });
      const legend = (items, x, y, w) => text(items.map(([n, t]) => `<b style="display:inline-block;width:30px;color:${COBALT}">${n}</b>${t}`).join('<br>'), x, y, w, 40 * items.length + 20, { fontSize: 21, color: INK, lineHeight: 1.75 });
      return numbered(ink(build({ name: 'Defensa de TFG: Arquitectura', palette: 'paper', fonts: 'editorial', title: { size: 42, color: INK }, body: { color: INK },
        decor: decorOf(COBALT, '#cfcdc4', GREY, 'Universidad de Ejemplo · Escuela de Arquitectura · Trabajo de Fin de Grado 2026') }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('TRABAJO DE FIN DE GRADO · GRADO EN FUNDAMENTOS DE LA ARQUITECTURA', 92, 100, 700, 60, { fontSize: 16, letterSpacing: 2, fontWeight: 700, color: deep(COBALT, BG), lineHeight: 1.4 }),
          text('Del mercado a la biblioteca: rehabilitación bioclimática del antiguo mercado de abastos como biblioteca de barrio', 88, 170, 700, 290, { fontFamily: H, fontSize: 44, fontWeight: 700, color: INK, lineHeight: 1.12 }),
          shape('rect', 92, 476, 100, 4, OCHRE),
          text('<b>Autora:</b> Nerea Campos Ibáñez<br><b>Tutor:</b> Dr. Jorge Llorente Mas<br>Universidad de Ejemplo · Julio de 2026', 92, 500, 700, 130, { fontSize: 22, color: INK, lineHeight: 1.55 }),
          after(img(hall, 830, 170, 400, 320, 'Alzado del antiguo mercado: base de ladrillo con arcos y cubierta abovedada con lucernario'), 'fade-left', { duration: 800 })],
          notes: '≈30 s. Presenta el proyecto con su gesto principal: conservar el mercado de 1928 y convertirlo en biblioteca de consumo casi nulo. Edificio, lugar y personas, de ejemplo.' },
        T('Por qué este trabajo', '1 · INTRODUCCIÓN', [
          on(stat('≈ 40 %', 'de la energía que consume la Unión Europea se gasta en los edificios<br>' + src('Comisión Europea (2020), «Oleada de renovación»', GREY), 100, 180, 520, COBALT, INK, H, BG), 'fade-up'),
          on(stat('85 %', 'de los edificios que existen hoy seguirán en pie en 2050<br>' + src('Comisión Europea (2020), «Oleada de renovación»', GREY), 680, 180, 500, OCHRE, INK, H, BG), 'fade-up'),
          takeaway('La arquitectura más sostenible suele ser la que ya está construida: rehabilitar antes que demoler.', 100, 470, 1080, 100, COBALT, INK)],
          '≈1 min. Dos cifras reales con su fuente. La tesis del proyecto: el patrimonio existente es la mayor oportunidad energética.'),
        T('Pregunta y objetivos', '1 · INTRODUCCIÓN', [
          on(card(`<span style="font-family:${H};font-size:28px;color:${INK}">¿Cómo convertir un mercado de 1928 en una biblioteca de consumo energético casi nulo sin perder su valor patrimonial?</span>`,
            100, 178, 1080, 130, '#e4e2da', { radius: 16, pad: [20, 28, 20, 28] }), 'fade-up'),
          ...row([['Conservar', 'Mantener la nave, los arcos y la cubierta original.', BRICK], ['Transformar', 'Encajar un programa de biblioteca sin tocar la estructura histórica.', OCHRE],
            ['Ahorrar', 'Reducir la demanda energética más de un 75 %.', SAGE]], { y: 340, h: 200 })],
          '≈1 min. Los tres verbos ordenan todo el proyecto.'),
        T('El lugar', '2 · ANÁLISIS', [
          on(img(site, 100, 176, 470, 410, 'Plano de situación: la parcela en azul entre manzanas del casco antiguo, una plaza en verde y la flecha del norte'), 'fade-up'),
          legend([['■', 'Parcela del mercado: 1.850 m²'], ['■', 'Plaza pública al este'], ['↑', 'Norte: fachada principal a sur']], 620, 196, 560),
          text('Casco antiguo, protección patrimonial de nivel 2: se conservan la fachada, la estructura y la cubierta.', 620, 370, 560, 120, { fontSize: 21, color: GREY, lineHeight: 1.45 }),
          sample(620, 520, 400, GREY)],
          '≈1 min. Sitúa el edificio: manzana cerrada, plaza al este y fachada a sur. La protección condiciona todo lo que se puede tocar.'),
        T('La idea generadora', '3 · PROYECTO', [
          ...[[1, 'Conservar la nave'], [2, 'Insertar una caja de madera'], [3, 'Abrir un patio de luz']].flatMap(([n, t], i) => [
            on(img(move(n), 100 + i * 370, 196, 330, 254, `Paso ${n} de la idea: ${t}`), 'fade-up'),
            on(text(`<b style="color:${COBALT}">${n}</b> · ${t}`, 100 + i * 370, 470, 330, 40, { fontSize: 23, color: INK, textAlign: 'center' }), 'fade-in', { start: 'withPrev' })]),
          text('La nueva arquitectura no toca la antigua: se apoya en su propia estructura de madera.', 100, 550, 1080, 50, { fontSize: 21, color: GREY, textAlign: 'center' })],
          '≈1 min 30 s. Tres gestos, uno por clic. Es la diapositiva que el tribunal más recordará: explícala sin prisa.'),
        T('La planta', '3 · PROYECTO', [
          on(img(plan, 100, 176, 600, 400, 'Planta baja con seis zonas numeradas'), 'fade-up'),
          legend([[1, 'Acceso y préstamo'], [2, 'Sala de lectura'], [3, 'Zona infantil'], [4, 'Talleres'], [5, 'Aseos e instalaciones'], [6, 'Patio de luz']], 740, 190, 440)],
          '≈1 min. Recorre la planta como lo haría un usuario: entra por el acceso (1), cruza a la sala (2) y el patio (6) ordena todo.'),
        T('La sección: luz y aire', '3 · PROYECTO', [
          on(img(section, 100, 176, 620, 360, 'Sección con la bóveda, el lucernario, la caja de madera y las flechas de luz y aire'), 'fade-up'),
          legend([[1, 'El aire fresco entra por abajo'], [2, 'Sale caliente por el lucernario'], [3, 'Luz norte, sin deslumbrar'], [4, 'La caja de madera, exenta']], 760, 190, 420)],
          '≈1 min. La sección explica el clima interior: ventilación por efecto chimenea y luz cenital norte.'),
        T('Estrategia bioclimática', '4 · ENERGÍA', [
          ...row([['Ventilación cruzada', 'Nocturna en verano: enfría la masa de la nave.', COBALT], ['Luz cenital norte', 'Lucernarios que iluminan sin calentar.', OCHRE],
            ['Inercia térmica', 'Los muros de ladrillo amortiguan los picos.', BRICK], ['Energía y agua', '40 kWp de fotovoltaica y aljibe de pluviales.', SAGE]], { y: 190, h: 280, ts: 22, ds: 19 }),
          text('Debajo: la demanda energética, antes y después.', 100, 500, 1080, 36, { fontSize: 18, color: GREY, textAlign: 'center' })],
          '≈1 min 30 s. Cuatro estrategias pasivas y activas. Si preguntan por las cifras, baja a la demanda energética.'),
        T('Respaldo · demanda energética', 'DIAPOSITIVA DE RESPALDO', [
          chartBlock({ x: 100, y: 176, w: 680, h: 420, chartType: 'bar', color: '#b7b3a8', grid: true, dataLabels: true, yTitle: 'kWh/m² · año', seriesName: 'Estado actual',
            data: [{ label: 'Calefacción', value: 92 }, { label: 'Refrigeración', value: 41 }, { label: 'Iluminación', value: 23 }],
            series: [{ name: 'Proyecto', color: COBALT, values: [18, 12, 6] }] }),
          on(stat('−77 %', 'de demanda total (de 156 a 36 kWh/m² al año)', 820, 200, 360, COBALT, INK, H, BG), 'fade-up', { start: 'afterPrev' }),
          sample(820, 460, 360, GREY)],
          'Solo si preguntan por la energía. Simulación de ejemplo con los criterios del CTE DB-HE.', { vertical: true }),
        T('Materiales', '4 · ENERGÍA', [
          ...[['clt', 'Madera contralaminada', 'Estructura de la caja: ligera, en seco y desmontable.'], ['brick', 'Ladrillo recuperado', 'De las demoliciones interiores: cero residuos.'],
            ['lime', 'Morteros de cal', 'Transpirables y compatibles con el muro histórico.'], ['glass', 'Vidrio de control solar', 'En el lucernario, con lamas exteriores.']].flatMap(([k, t, d], i) => [
            on(img(swatch(k), 100 + i * 275, 186, 110, 110, `Muestra de ${t.toLowerCase()}`), 'fade-up'),
            on(text(`<b>${t}</b><br><span style="font-size:19px;color:${GREY}">${d}</span>`, 100 + i * 275, 310, 250, 160, { fontSize: 22, color: INK, lineHeight: 1.4 }), 'fade-in', { start: 'withPrev' })]),
          model('kh-SheenChair', 1000, 470, 180, 160, { autoRotate: true, spin: 10 }),
          text('Mobiliario de lectura de madera y tejido reciclado', 640, 520, 340, 70, { fontSize: 18, color: GREY, textAlign: 'right' })],
          '≈1 min. Materiales con criterio: ligeros, reversibles y compatibles con lo histórico. La silla en 3D, para hablar del mobiliario.'),
        T('Cumplimiento del CTE', '5 · NORMATIVA', [
          tableBlock({ x: 100, y: 176, w: 1080, h: 400, fontSize: 18, header: true, headBg: INK, headFg: '#ffffff', stroke: '#cfcdc4', banded: true, band: INK,
            rows: [['Documento', 'Exigencia', 'Solución del proyecto', 'Cumple'], ['DB-SI', 'Seguridad en caso de incendio', 'Dos salidas; madera protegida (R 60)', 'Sí'],
              ['DB-SUA', 'Utilización y accesibilidad', 'Itinerario accesible y ascensor a la entreplanta', 'Sí'], ['DB-HE', 'Ahorro de energía', 'Fotovoltaica y ventilación natural', 'Sí'],
              ['DB-HR', 'Protección frente al ruido', 'Trasdosados y techo absorbente en la sala', 'Sí'], ['DB-HS', 'Salubridad', 'Ventilación híbrida con recuperador de calor', 'Sí']] }),
          text('Debajo: el presupuesto por capítulos.', 100, 596, 1080, 32, { fontSize: 18, color: GREY, textAlign: 'center' })],
          '≈1 min. El Código Técnico, documento a documento. Si preguntan por el coste, baja al presupuesto.'),
        T('Respaldo · presupuesto por capítulos', 'DIAPOSITIVA DE RESPALDO', [
          tableBlock({ x: 100, y: 176, w: 720, h: 420, fontSize: 17, header: true, headBg: INK, headFg: '#ffffff', stroke: '#cfcdc4', banded: true, band: INK,
            rows: [['Capítulo', 'Importe (€)'], ['Demoliciones y trabajos previos', '85.000'], ['Estructura y madera contralaminada', '410.000'], ['Cubierta y lucernarios', '260.000'],
              ['Fachadas y carpinterías', '230.000'], ['Instalaciones', '380.000'], ['Acabados y mobiliario', '310.000'], ['Patio y urbanización', '95.000'],
              ['Seguridad, salud y residuos', '60.000'], ['<b>Presupuesto de ejecución material</b>', '<b>1.830.000</b>']] }),
          on(stat('989 €', 'por metro cuadrado construido (1.850 m²)', 860, 200, 320, OCHRE, INK, H, BG), 'fade-up', { start: 'afterPrev' }),
          sample(860, 460, 320, GREY)],
          'Solo si preguntan por el coste. Importes de ejemplo.', { vertical: true }),
        { layout: 'blank', bg: BG, extra: [eyebrow('6 · CONCLUSIONES', COBALT, BG),
          text('Conservar no es congelar: el mercado sigue siendo el mismo edificio y sirve al barrio de otra manera.', 100, 110, 1080, 170, { fontFamily: H, fontSize: 44, fontWeight: 700, color: INK, lineHeight: 1.18 }),
          ...row([['Patrimonio', 'Se conservan fachada, arcos y cubierta.', BRICK], ['Energía', 'La demanda baja un 77 %.', COBALT], ['Barrio', 'Una biblioteca abierta a la plaza.', SAGE]], { y: 320, h: 230 })],
          notes: '≈1 min. La frase que resume el proyecto y tres conclusiones que responden a los tres objetivos.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          shape('rect', 0, 0, 1280, 640, INK), glow(1000, 380, 520, OCHRE, INK, 26),
          text('Gracias.<br>¿Preguntas?', 100, 150, 760, 250, { fontFamily: H, fontSize: 78, fontWeight: 700, color: '#ffffff', lineHeight: 1.08 }),
          text('A mi tutor y al taller de proyectos, por cada corrección.', 100, 430, 760, 90, { fontSize: 23, color: '#d8d6cf', lineHeight: 1.45 }),
          timer(600, 930, 200, 260, { color: '#ffffff', endText: 'Tiempo' })],
          notes: '≈30 s. Agradece y abre el turno. Debajo, las respuestas a las preguntas más previsibles.' },
        T('Respaldo · preguntas previsibles del tribunal', 'DIAPOSITIVA DE RESPALDO', [
          ...grid([['¿Por qué madera contralaminada?', 'Ligera para no cargar la estructura histórica, en seco y desmontable: reversible.', OCHRE],
            ['¿Cómo se protege el patrimonio?', 'Nada se ancla a la nave: la caja nueva es exenta y se puede retirar.', BRICK],
            ['¿Por qué una biblioteca?', 'El barrio no tiene ninguna a menos de 1 km y la plaza pide un uso público.', COBALT],
            ['¿Es asumible el coste?', 'Unos 989 € por m², en la línea de las rehabilitaciones públicas recientes.', SAGE]], { y0: 178, dy: 200, h: 182 })],
          'Respuestas cortas preparadas. Solo se abren si el tribunal pregunta algo de esto.', { vertical: true }),
      ]), INK));
    } },
};
