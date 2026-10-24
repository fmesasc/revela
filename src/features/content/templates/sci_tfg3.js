// Example presentations: defensas de trabajos académicos (III) — TFM de Biología de la Conservación, TFG de Derecho y
// tesis doctoral de Física de materiales. Each one: { name, summary, cat: 'sci', make() } → a deck (see kit.js).
// Lo que necesita quien defiende: portada institucional, una cifra que plantea el problema, la pregunta y los objetivos,
// el método dibujado, resultados con su conclusión escrita al lado, discusión, limitaciones, conclusiones y, DEBAJO
// (diapositivas verticales: vertical: true), las respuestas a las preguntas previsibles del tribunal, que solo se abren
// si se hacen. Notas con el tiempo de cada parte. Nombres y universidad inventados; los datos del caso, de ejemplo y
// marcados como tales; las fuentes del mundo, reales. Dibujos nuestros (SVG como data URL); nada de imágenes externas.

import { build, text, card, shape, icon, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, mathBlock, base, deep, pairStacks } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A label in capitals (the part of the defence, the degree…).
const label = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 4, fontWeight: 700, color, ...props });
// A card with a coloured title (dark enough to read on its own background: deep) and its text.
const tcard = (t, d, x, y, w, h, col, { bg = '#ffffff', fg = '#1f2430', ts = 25, ds = 20 } = {}) =>
  card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${fg}">${d}</span>`, x, y, w, h, bg, { color: fg, radius: 14, borderColor: col, pad: [18, 22, 16, 22] });
// The conclusion that goes beside a chart: what the reader must take from it.
const takeaway = (big, small, x, y, w, h, col, { bg = '#ffffff', fg = '#1f2430', font = '' } = {}) =>
  card(`<div style="font-size:52px;font-weight:800;line-height:1.05;color:${deep(col, bg)};${font ? `font-family:${font};` : ''}">${big}</div><div style="font-size:21px;margin-top:10px">${small}</div>`,
    x, y, w, h, bg, { color: fg, radius: 14, pad: [22, 24, 20, 24] });
// A section opener: the part's number and name (the structure of the defence, which the tribunal follows).
const section = (n, name, sub, bg, fg, accent, font) => ({ layout: 'blank', bg, transition: 'fade', extra: [
  text(String(n), 90, 150, 260, 260, { fontSize: 220, fontWeight: 800, color: accent, lineHeight: 1, fontFamily: font }),
  shape('rect', 380, 200, 4, 220, accent),
  text(name, 420, 200, 760, 110, { fontSize: 62, fontWeight: 800, color: fg, fontFamily: font, lineHeight: 1.05 }),
  text(sub, 422, 320, 760, 100, { fontSize: 26, color: fg, opacity: 80, lineHeight: 1.4 })] });
// The «backup» mark of a slide below: a question the tribunal may ask, answered only if it does.
const backup = (q, col, bg) => [shape('rounded', 84, 52, 400, 40, deep(col, bg), { radius: 20 }), text('RESPALDO · PREGUNTA PREVISIBLE', 84, 58, 400, 30, { fontSize: 14, letterSpacing: 2, fontWeight: 700, color: '#ffffff', textAlign: 'center' }),
  text(q, 84, 104, 1110, 92, { fontSize: 30, fontWeight: 700, color: deep(col, bg), lineHeight: 1.15 })];
const sample = (x, y, w, color) => text('Datos de ejemplo', x, y, w, 26, { fontSize: 15, color, fontStyle: 'italic' });

export default {

  // 1 · TFM de Biología de la Conservación: pastoreo y mariposas en prados de montaña.
  sci_thesis_bio: { name: 'Defensa de TFM: Biología de la Conservación', cat: 'sci',
    summary: 'Presentación de defensa del trabajo de fin de máster de Biología de la Conservación y Ecología: portada, una cifra de impacto, pregunta de investigación, mapa de la zona de muestreo, índice de Shannon, resultados con gráficos, especies indicadoras, implicaciones de gestión, conclusiones, diapositivas de respaldo para las preguntas del tribunal y notas con los tiempos',
    make: () => {
      const PAPER = '#f4f6ef', INK = '#1d2a1f', MOSS = '#2f6b3a', MEAD = '#8fb339', SKY = '#3f88c5', SUN = '#e3a72f', CLAY = '#b0573a', GREY = '#5b665c';
      const H = pairStacks('editorial').heading;
      // A butterfly over a meadow, drawn by us.
      const meadow = () => svgURL(360, 420, `<rect x="0" y="300" width="360" height="120" rx="18" fill="#cfe3a8"/><path d="M0 312 Q60 280 120 306 T240 300 T360 296 V420 H0Z" fill="#a9cf6e"/>`
        + Array.from({ length: 14 }, (_, i) => `<path d="M${18 + i * 25} 330 q4 -26 8 -40" stroke="#5f8f2f" stroke-width="3" fill="none"/><circle cx="${26 + i * 25}" cy="${290 - (i % 3) * 6}" r="${5 + (i % 2) * 2}" fill="${['#f2c14e', '#e86a8a', '#ffffff', '#8e7cc3'][i % 4]}"/>`).join('')
        + `<g transform="translate(180 150) rotate(-12)"><ellipse cx="-52" cy="-30" rx="54" ry="40" fill="${SUN}"/><ellipse cx="52" cy="-30" rx="54" ry="40" fill="${SUN}"/>`
        + `<ellipse cx="-40" cy="34" rx="34" ry="28" fill="${CLAY}"/><ellipse cx="40" cy="34" rx="34" ry="28" fill="${CLAY}"/>`
        + `<circle cx="-60" cy="-36" r="12" fill="#1d2a1f"/><circle cx="60" cy="-36" r="12" fill="#1d2a1f"/><circle cx="-60" cy="-36" r="5" fill="#ffffff"/><circle cx="60" cy="-36" r="5" fill="#ffffff"/>`
        + `<rect x="-7" y="-50" width="14" height="110" rx="7" fill="#1d2a1f"/><path d="M-3 -50 q-14 -34 -30 -40 M3 -50 q14 -34 30 -40" stroke="#1d2a1f" stroke-width="4" fill="none"/></g>`);
      // The study valley: three kinds of management, the transects and a scale.
      const valley = () => svgURL(640, 440, `<rect width="640" height="440" rx="18" fill="#eef3e6"/>`
        + `<path d="M0 360 C120 300 200 330 320 300 S520 250 640 270 V440 H0Z" fill="#cfe0b4"/><path d="M40 70 C160 40 260 90 300 150 C330 200 260 250 160 240 C80 232 30 170 40 70Z" fill="#9cc56b" opacity=".9"/>`
        + `<path d="M330 80 C420 50 560 70 600 140 C620 190 560 230 470 220 C390 212 320 160 330 80Z" fill="#6f9c4b" opacity=".9"/>`
        + `<path d="M180 270 C260 250 380 260 430 300 C470 340 400 390 300 384 C210 378 150 330 180 270Z" fill="#d7c66a" opacity=".9"/>`
        + `<path d="M0 410 C140 380 260 420 400 390 S600 360 640 380" stroke="#3f88c5" stroke-width="10" fill="none" stroke-linecap="round"/>`
        + [[90, 110], [150, 160], [210, 120], [240, 190], [380, 110], [450, 150], [520, 120], [560, 170], [240, 300], [300, 330], [360, 300], [330, 360]]
          .map(([x, y], i) => `<line x1="${x - 22}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#1d2a1f" stroke-width="4" stroke-dasharray="6 4"/><circle cx="${x}" cy="${y}" r="7" fill="${i < 4 ? '#2f6b3a' : i < 8 ? '#b0573a' : '#e3a72f'}" stroke="#ffffff" stroke-width="2"/>`).join('')
        + `<path d="M590 30 l12 30 l-12 -8 l-12 8 z" fill="#1d2a1f"/><text x="590" y="78" font-family="sans-serif" font-size="16" font-weight="700" fill="#1d2a1f" text-anchor="middle">N</text>`
        + `<rect x="30" y="20" width="120" height="8" fill="#1d2a1f"/><rect x="30" y="20" width="60" height="8" fill="#ffffff" stroke="#1d2a1f" stroke-width="1"/><text x="90" y="46" font-family="sans-serif" font-size="14" fill="#1d2a1f" text-anchor="middle">0 — 1 km</text>`);
      const foot = () => [shape('rect', 84, 668, 1112, 1, '#c9d3c2'), text('Universidad de Ejemplo · Facultad de Biología · Máster en Biodiversidad y Conservación · TFM 2026', 84, 676, 1112, 26, { fontSize: 14, color: GREY, textAlign: 'right' })];
      return numbered(ink(build({ name: 'Defensa de TFM: Biología de la Conservación', palette: 'forest', fonts: 'editorial', title: { color: INK, size: 42 }, body: { color: INK }, decor: foot }, [
        // Portada
        { layout: 'blank', bg: PAPER, transition: 'fade', back: [shape('rect', 0, 0, 1280, 12, MOSS), glow(1040, -100, 560, MEAD, PAPER, 22)], extra: [
          label('TRABAJO DE FIN DE MÁSTER · BIODIVERSIDAD Y CONSERVACIÓN', 90, 104, 720, deep(MOSS, PAPER), { fontSize: 15, letterSpacing: 2 }),
          text('Pastoreo y mariposas: cómo la gestión ganadera moldea la diversidad de lepidópteros en prados de montaña', 84, 148, 720, 300, { fontFamily: H, fontSize: 44, fontWeight: 700, color: INK, lineHeight: 1.15 }),
          shape('rect', 90, 468, 90, 4, CLAY),
          text('<b>Autora:</b> Irene Valdés Soria<br><b>Directores:</b> Dra. Marta Ocaña Rey y Dr. Pablo Iturbe Gil<br>Universidad de Ejemplo · Julio de 2026', 90, 492, 720, 130, { fontSize: 22, color: INK, lineHeight: 1.55 }),
          after(img(meadow(), 860, 150, 340, 400, 'Una mariposa sobre un prado de montaña'), 'fade-left', { duration: 900 })],
          notes: '≈30 s. Saluda al tribunal y di el título con tus palabras: «He estudiado si la forma de gestionar los prados con ganado cambia cuántas mariposas y cuántas especies viven en ellos». Nombres y universidad de ejemplo: pon los tuyos.' },
        // El problema en una cifra
        { layout: 'blank', bg: PAPER, extra: [
          label('EL PROBLEMA', 90, 110, 600, deep(CLAY, PAPER)),
          on(text('1 millón', 84, 150, 700, 170, { fontFamily: H, fontSize: 150, fontWeight: 800, color: deep(MOSS, PAPER), lineHeight: 1 }), 'zoom-in'),
          text('de especies animales y vegetales están amenazadas de extinción, según la evaluación mundial de la biodiversidad.', 90, 330, 640, 120, { fontSize: 28, color: INK, lineHeight: 1.4 }),
          text('Fuente: IPBES, Informe de evaluación mundial sobre la biodiversidad y los servicios de los ecosistemas, 2019.', 90, 470, 640, 60, { fontSize: 17, color: GREY, fontStyle: 'italic' }),
          after(tcard('Y en los prados de montaña…', 'Dependen de que alguien los gestione: si se abandonan, el matorral los cierra; si se intensifican, pierden flores. Las mariposas lo notan pronto.', 790, 190, 400, 300, MEAD, { bg: '#ffffff' }), 'fade-up')],
          notes: '≈1 min. Empieza por lo grande (la crisis de biodiversidad, cifra real del IPBES) y baja a tu caso: los prados seminaturales y por qué las mariposas son un buen indicador (responden rápido y se pueden contar con un método estándar).' },
        // Pregunta y objetivos
        { title: 'Pregunta de investigación y objetivos', layout: 'titleOnly', bg: PAPER, extra: [
          card(`<div style="font-size:15px;letter-spacing:3px;font-weight:700;color:${deep(SKY, '#ffffff')}">PREGUNTA</div><div style="font-family:${H};font-size:30px;line-height:1.3;margin-top:8px">¿Mantiene el pastoreo extensivo más diversidad de mariposas que el abandono o la intensificación del prado?</div>`, 90, 180, 520, 300, '#ffffff', { color: INK, radius: 16, pad: [24, 26, 22, 26] }),
          text(`<div style="font-size:15px;letter-spacing:3px;font-weight:700;color:${deep(CLAY, PAPER)}">HIPÓTESIS</div>Los prados con pastoreo extensivo tendrán más especies y una comunidad más equilibrada que los abandonados y los intensivos.`, 90, 500, 520, 130, { fontSize: 21, color: INK, lineHeight: 1.45 }),
          ...[['Objetivo 1', 'Comparar la riqueza de especies entre los tres tipos de gestión.', MOSS], ['Objetivo 2', 'Medir la diversidad con el índice de Shannon.', SKY], ['Objetivo 3', 'Identificar especies indicadoras de cada gestión.', SUN]]
            .map(([t, d, c], i) => on(tcard(t, d, 660, 180 + i * 150, 530, 130, c), 'fade-up'))],
          notes: '≈1 min. La pregunta en una frase, la hipótesis y tres objetivos que luego responderás uno a uno en los resultados. Mira al tribunal, no a la pantalla.' },
        // Estado de la cuestión
        { title: 'Estado de la cuestión', layout: 'titleOnly', bg: PAPER, extra: [
          dg('timeline', '1948\n  Shannon publica su medida de la información, base del índice de diversidad\n1977\n  Pollard propone los transectos para contar mariposas\n1993\n  Pollard y Yates estandarizan el seguimiento de mariposas\n2019\n  El IPBES alerta del declive mundial de la biodiversidad', 90, 190, 1100, 330, { color: INK }),
          text('Lo que falta: comparar las tres gestiones a la vez, en los mismos valles y con el mismo método.', 90, 560, 1100, 60, { fontSize: 23, color: deep(CLAY, PAPER), textAlign: 'center', fontWeight: 700 })],
          notes: '≈1,5 min. Cuatro hitos reales: Shannon (1948), Pollard (1977), Pollard y Yates (1993, «Monitoring Butterflies for Ecology and Conservation») e IPBES (2019). Termina con el hueco que cubre tu trabajo.' },
        section(1, 'Metodología', 'Dónde, cómo y con qué medimos', MOSS, '#ffffff', '#d7e8b4', H),
        // Zona de estudio
        { title: 'Zona de estudio y diseño del muestreo', layout: 'titleOnly', bg: PAPER, extra: [
          img(valley(), 90, 170, 640, 440, 'Mapa del valle con los tres tipos de gestión y los doce transectos'),
          ...[['Pastoreo extensivo', '4 transectos', MOSS], ['Abandono', '4 transectos', CLAY], ['Intensivo', '4 transectos', SUN]]
            .map(([t, d, c], i) => text(`<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c};vertical-align:middle;margin-right:10px"></span><b>${t}</b> · ${d}`, 770, 190 + i * 52, 420, 44, { fontSize: 22, color: INK })),
          card('<b>12 transectos de 500 m</b><br>Recorridos cada 15 días, de mayo a agosto, con sol y poco viento: 96 muestreos en total.', 770, 360, 420, 190, '#ffffff', { color: INK, fontSize: 21, radius: 14, pad: [20, 22, 18, 22] }),
          sample(770, 570, 420, GREY)],
          notes: '≈1,5 min. Señala el mapa: tres gestiones, cuatro transectos en cada una, separados para que sean independientes. Las cifras del diseño son de ejemplo: pon las tuyas.' },
        // Método e índice
        { title: 'Del conteo al índice de diversidad', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Transecto\n  500 m a paso constante\nIdentificación\n  Especie a especie\nAbundancia\n  Individuos por especie\nDiversidad\n  Índice de Shannon\nComparación\n  Modelo mixto', 90, 175, 1100, 220, { color: INK }),
          mathBlock({ x: 90, y: 420, w: 520, h: 130, fontSize: 40, color: INK, latex: "H' = -\\sum_{i=1}^{S} p_i \\ln p_i" }),
          text('<b>p<sub>i</sub></b>: proporción de individuos de la especie <i>i</i>. <b>S</b>: número de especies. Sube si hay muchas especies y repartidas por igual.', 650, 430, 540, 130, { fontSize: 22, color: INK, lineHeight: 1.45 })],
          notes: '≈1,5 min. Método de Pollard: se cuenta a ambos lados en una banda fija. Explica el índice de Shannon con una idea: no basta con tener muchas especies, también cuenta que ninguna lo domine todo.' },
        // Resultados: riqueza
        { title: 'Resultado 1 · El pastoreo extensivo duplica las especies', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 430, chartType: 'bar', color: MOSS, dataLabels: true, grid: true, yTitle: 'Especies (riqueza)',
            data: [{ label: 'Extensivo', value: 34, color: MOSS }, { label: 'Abandono', value: 22, color: CLAY }, { label: 'Intensivo', value: 15, color: SUN }] }),
          after(takeaway('×2,3', 'especies en el pastoreo extensivo frente al intensivo (34 frente a 15).', 830, 200, 360, 230, MOSS), 'fade-up'),
          sample(830, 450, 360, GREY)],
          notes: '≈1 min. Lee la conclusión, no el gráfico: «el extensivo tiene más del doble de especies que el intensivo». Responde al objetivo 1.' },
        // Resultados: Shannon
        { title: 'Resultado 2 · Una comunidad más equilibrada', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 430, chartType: 'bar', color: SKY, dataLabels: true, grid: true, yTitle: "Índice de Shannon (H')",
            data: [{ label: 'Extensivo', value: 2.9, color: MOSS }, { label: 'Abandono', value: 2.3, color: CLAY }, { label: 'Intensivo', value: 1.7, color: SUN }] }),
          after(takeaway("H' = 2,9", 'en el extensivo: muchas especies y ninguna domina. En el intensivo, dos especies son la mitad de los individuos.', 830, 200, 360, 280, SKY), 'fade-up'),
          sample(830, 500, 360, GREY)],
          notes: '≈1 min. Objetivo 2. Si el tribunal pregunta por qué Shannon y no solo la riqueza, baja a la diapositiva de respaldo (flecha abajo).' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Por qué el índice de Shannon y no solo contar especies?', SKY, '#ffffff'),
          tableBlock({ x: 84, y: 200, w: 1110, h: 330, fontSize: 21, header: true, headBg: MOSS, headFg: '#ffffff', stroke: '#d6dfcf', banded: true, band: MOSS,
            rows: [['Medida', 'Qué mide', 'Por qué la uso'], ['Riqueza (S)', 'Cuántas especies hay', 'Sencilla, pero ignora cuántos individuos tiene cada una'], ["Shannon (H')", 'Riqueza y reparto a la vez', 'Detecta comunidades dominadas por pocas especies'], ['Equitatividad de Pielou (J\')', "H' dividido por su máximo, ln S", 'Separa el reparto de la riqueza'], ['Simpson (1−D)', 'Probabilidad de que dos individuos sean de especies distintas', 'Comprobación: da el mismo orden']] }),
          text('Las cuatro medidas ordenan igual las tres gestiones: el resultado no depende del índice elegido.', 84, 560, 1110, 60, { fontSize: 22, color: INK })],
          notes: 'Respaldo: ábrela solo si preguntan. Mensaje: el resultado es robusto, todas las medidas coinciden.' },
        // Especies indicadoras
        { title: 'Resultado 3 · Especies indicadoras', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 760, h: 380, fontSize: 21, header: true, headBg: MOSS, headFg: '#ffffff', stroke: '#d6dfcf', banded: true, band: MOSS,
            rows: [['Especie', 'Extensivo', 'Abandono', 'Intensivo'], ['<i>Parnassius apollo</i> (apolo)', '18', '4', '0'], ['<i>Melanargia lachesis</i> (medioluto ibérica)', '46', '21', '5'], ['<i>Coenonympha pamphilus</i>', '38', '12', '30'], ['<i>Polyommatus icarus</i> (ícaro)', '52', '19', '61'], ['<i>Aglais urticae</i> (ortiguera)', '9', '27', '6']] }),
          after(tcard('Lo que dice la tabla', 'Apolo y medioluto dependen del prado pastado; las generalistas como el ícaro aguantan en el intensivo; la ortiguera sigue al matorral del abandono.', 880, 175, 310, 330, CLAY), 'fade-up'),
          sample(90, 575, 600, GREY)],
          notes: '≈1,5 min. Objetivo 3. Especies reales de la península; los conteos son de ejemplo. El apolo es una especie protegida: buen argumento para la gestión.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Las diferencias son estadísticamente significativas?', CLAY, '#ffffff'),
          tableBlock({ x: 84, y: 200, w: 1110, h: 260, fontSize: 22, header: true, headBg: CLAY, headFg: '#ffffff', stroke: '#e6d7cf', banded: true, band: CLAY,
            rows: [['Variable respuesta', 'Efecto de la gestión', 'p', 'Diferencias (post hoc)'], ['Riqueza', 'F = 21,4', '< 0,001', 'Extensivo > Abandono > Intensivo'], ["Shannon (H')", 'F = 15,8', '< 0,001', 'Extensivo > Abandono = Intensivo'], ['Abundancia total', 'F = 3,1', '0,07', 'Sin diferencias claras']] }),
          text('Modelo lineal mixto con el transecto como efecto aleatorio (medidas repetidas en el tiempo). Datos de ejemplo.', 84, 490, 1110, 80, { fontSize: 21, color: INK })],
          notes: 'Respaldo. Matiz importante: la abundancia total no cambia tanto; lo que cambia es qué especies hay y cómo se reparten.' },
        // Discusión
        { title: 'Discusión', layout: 'titleOnly', bg: PAPER, extra: [
          on(tcard('Coincide con lo publicado', 'La intensificación empobrece los prados y el abandono los cierra; el máximo de diversidad está en una gestión intermedia.', 90, 190, 530, 220, MOSS), 'fade-up'),
          on(tcard('Lo que aporta este trabajo', 'Compara las tres gestiones en los mismos valles y con el mismo método, e identifica especies indicadoras útiles para el seguimiento.', 660, 190, 530, 220, SKY), 'fade-up'),
          text('La idea de fondo: el prado de montaña es un paisaje cultural; su biodiversidad depende de que siga habiendo pastoreo.', 90, 450, 1100, 110, { fontFamily: H, fontSize: 28, color: INK, lineHeight: 1.4, textAlign: 'center' })],
          notes: '≈1,5 min. Relaciona tus resultados con la hipótesis de la perturbación intermedia sin entrar en citas concretas que no hayas leído. Destaca lo nuevo.' },
        // Implicaciones de gestión
        { title: 'Implicaciones para la gestión', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Mantener el pastoreo', 'Apoyar a la ganadería extensiva que conserva los prados.', MOSS], ['Evitar la intensificación', 'Sin fertilizar ni resembrar los prados con más especies.', SUN], ['Desbrozar en mosaico', 'Recuperar los abandonados por parcelas, no todo a la vez.', CLAY]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 200, 350, 260, c, { ts: 26, ds: 21 }), 'fade-up')),
          text('Indicadores para el seguimiento: apolo y medioluto ibérica.', 90, 500, 1100, 50, { fontSize: 23, color: deep(MOSS, PAPER), fontWeight: 700, textAlign: 'center' })],
          notes: '≈1 min. Lo práctico: qué haría un gestor de un espacio natural con estos resultados.' },
        // Limitaciones y futuro
        { title: 'Limitaciones y líneas futuras', layout: 'titleOnly', bg: PAPER, extra: [
          card('<b style="font-size:26px">Limitaciones</b>' + ul('Una sola temporada de muestreo', 'Cuatro transectos por gestión', 'Sin medir la oferta de flores'), 90, 190, 530, 330, '#ffffff', { color: INK, fontSize: 22, radius: 14, pad: [22, 24, 20, 24] }),
          card('<b style="font-size:26px">Líneas futuras</b>' + ul('Repetir el muestreo varios años', 'Añadir abejas y otros polinizadores', 'Medir flores y carga ganadera'), 660, 190, 530, 330, '#ffffff', { color: INK, fontSize: 22, radius: 14, pad: [22, 24, 20, 24] })],
          notes: '≈1 min. Reconocer las limitaciones antes de que te las señalen da seguridad. Cada limitación, con su línea futura enfrente.' },
        // Conclusiones
        { layout: 'blank', bg: MOSS, transition: 'zoom', extra: [
          label('CONCLUSIÓN', 90, 120, 600, '#d7e8b4'),
          text('El pastoreo extensivo mantiene los prados de montaña más ricos en mariposas.', 84, 160, 1100, 200, { fontFamily: H, fontSize: 52, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }),
          ...['Más del doble de especies que el intensivo', 'Una comunidad más equilibrada (Shannon)', 'Especies indicadoras para el seguimiento']
            .map((t, i) => on(text(`<b style="color:#d7e8b4">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 410 + i * 58, 1100, 50, { fontSize: 26, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. La idea que quieres que el tribunal recuerde y tres conclusiones, una por objetivo.' },
        // Gracias y preguntas
        { layout: 'blank', bg: PAPER, extra: [
          text('Gracias', 84, 160, 700, 130, { fontFamily: H, fontSize: 96, fontWeight: 700, color: INK }),
          text('¿Preguntas?', 90, 300, 700, 70, { fontSize: 40, color: deep(MOSS, PAPER) }),
          text('A mis directores, al personal del espacio natural y a los ganaderos que nos dejaron muestrear en sus prados.', 90, 400, 700, 110, { fontSize: 22, color: GREY, lineHeight: 1.45 }),
          timer(900, 900, 200, 300, { color: MOSS, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 15 minutos para ensayar la defensa entera. En el turno de preguntas: escucha hasta el final, agradece la pregunta y, si tienes una diapositiva de respaldo, bájala.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Y si las diferencias se debieran a la altitud o al clima, no a la gestión?', SUN, '#ffffff'),
          tcard('Cómo lo controlé', 'Los transectos de las tres gestiones están en los mismos valles y en una franja de altitud parecida, y se muestrearon los mismos días.', 84, 210, 540, 250, MOSS),
          tcard('Lo que no puedo descartar', 'Diferencias de suelo o de historia del prado. Por eso propongo repetirlo varios años y en más valles.', 654, 210, 540, 250, CLAY)],
          notes: 'Respaldo: la pregunta clásica sobre variables de confusión. Responde con lo que controlaste y reconoce lo que no.' },
      ]), INK));
    } },

  // 2 · TFG de Derecho: el derecho a la desconexión digital de las personas trabajadoras.
  sci_thesis_law: { name: 'Defensa de TFG: Derecho', cat: 'sci',
    summary: 'Presentación de defensa del trabajo de fin de grado de Derecho: portada, el artículo clave como gancho, pregunta e hipótesis, evolución normativa en línea de tiempo, marco constitucional, derecho comparado, casos de ejemplo, problemas detectados, propuesta de lege ferenda, conclusiones, diapositivas de respaldo para las preguntas del tribunal y notas con los tiempos',
    make: () => {
      const IVORY = '#f8f5ee', INK = '#221c18', OX = '#7a1f2b', GOLD = '#a8812f', SLATE = '#3d4f63', GREY = '#655c55';
      const H = pairStacks('classic').heading;
      // The scales of justice over a closed laptop with a moon: rest after work.
      const scales = () => svgURL(360, 420, `<rect x="40" y="330" width="280" height="22" rx="6" fill="#3d4f63"/><path d="M70 330 L100 270 H260 L290 330Z" fill="#cfd6df"/><rect x="104" y="276" width="152" height="50" rx="4" fill="#2b3a4a"/>`
        + `<circle cx="228" cy="300" r="12" fill="#f3e3b5"/><circle cx="234" cy="296" r="11" fill="#2b3a4a"/>`
        + `<rect x="174" y="50" width="12" height="210" rx="6" fill="${GOLD}"/><rect x="60" y="78" width="240" height="10" rx="5" fill="${GOLD}"/><circle cx="180" cy="46" r="14" fill="${GOLD}"/>`
        + `<path d="M80 88 L50 170 M80 88 L110 170 M280 88 L250 170 M280 88 L310 170" stroke="${GOLD}" stroke-width="3"/>`
        + `<path d="M40 170 Q80 205 120 170Z" fill="${OX}"/><path d="M240 170 Q280 205 320 170Z" fill="${OX}"/><rect x="140" y="256" width="80" height="12" rx="6" fill="${GOLD}"/>`);
      const foot = () => [shape('rect', 84, 668, 1112, 1, '#d9cfbf'), text('Universidad de Ejemplo · Facultad de Derecho · Grado en Derecho · Trabajo de Fin de Grado 2026', 84, 676, 1112, 26, { fontSize: 14, color: GREY, textAlign: 'right' })];
      return numbered(ink(build({ name: 'Defensa de TFG: Derecho', palette: 'paper', fonts: 'classic', title: { color: OX, size: 42 }, body: { color: INK }, decor: foot }, [
        // Portada
        { layout: 'blank', bg: IVORY, transition: 'fade', back: [shape('rect', 0, 0, 30, 720, OX), shape('rect', 30, 0, 6, 720, GOLD)], extra: [
          label('TRABAJO DE FIN DE GRADO · GRADO EN DERECHO', 100, 110, 700, deep(OX, IVORY)),
          text('El derecho a la desconexión digital de las personas trabajadoras: regulación, aplicación y propuesta de mejora', 96, 150, 720, 300, { fontFamily: H, fontSize: 44, fontWeight: 700, color: INK, lineHeight: 1.15 }),
          shape('rect', 100, 470, 90, 3, GOLD),
          text('<b>Autor:</b> Daniel Ortega Lázaro<br><b>Tutora:</b> Dra. Elena Prieto Navas · Derecho del Trabajo<br>Universidad de Ejemplo · Junio de 2026', 100, 494, 720, 130, { fontSize: 22, color: INK, lineHeight: 1.55 }),
          after(img(scales(), 860, 150, 340, 400, 'Una balanza sobre un portátil cerrado de noche'), 'fade-left', { duration: 900 })],
          notes: '≈30 s. Saluda y presenta el tema: «¿Tiene el trabajador derecho a no contestar un correo a las once de la noche? ¿Qué dice la ley y funciona?». Nombres y universidad de ejemplo.' },
        // El artículo clave
        { layout: 'blank', bg: IVORY, extra: [
          label('EL PUNTO DE PARTIDA', 100, 110, 600, deep(GOLD, IVORY)),
          shape('rect', 100, 160, 6, 300, OX),
          on(text('«Los trabajadores y los empleados públicos tendrán derecho a la desconexión digital a fin de garantizar, fuera del tiempo de trabajo legal o convencionalmente establecido, el respeto de su tiempo de descanso, permisos y vacaciones, así como de su intimidad personal y familiar.»', 130, 160, 1060, 300, { fontFamily: H, fontSize: 31, color: INK, lineHeight: 1.45 }), 'fade-in', { duration: 900 }),
          text('Artículo 88.1 de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).', 130, 490, 1060, 80, { fontSize: 20, color: GREY, fontStyle: 'italic' })],
          notes: '≈1 min. El derecho existe desde 2018. La pregunta del trabajo no es si existe, sino si la forma de regularlo lo hace eficaz.' },
        // Pregunta e hipótesis
        { title: 'Pregunta de investigación e hipótesis', layout: 'titleOnly', bg: IVORY, extra: [
          card(`<div style="font-size:15px;letter-spacing:3px;font-weight:700;color:${deep(SLATE, '#ffffff')}">PREGUNTA</div><div style="font-family:${H};font-size:29px;line-height:1.3;margin-top:8px">¿Garantiza la regulación española una desconexión digital real, o la deja en manos de cada empresa?</div>`, 90, 180, 540, 280, '#ffffff', { color: INK, radius: 14, pad: [24, 26, 22, 26] }),
          card(`<div style="font-size:15px;letter-spacing:3px;font-weight:700;color:${deep(OX, '#ffffff')}">HIPÓTESIS</div><div style="font-size:23px;line-height:1.45;margin-top:8px">La ley reconoce el derecho pero remite casi todo a la negociación colectiva y a una política interna, lo que debilita su eficacia.</div>`, 660, 180, 530, 280, '#ffffff', { color: INK, radius: 14, pad: [24, 26, 22, 26] }),
          text('Método: análisis normativo, doctrinal y de derecho comparado (España, Francia y Portugal).', 90, 500, 1100, 60, { fontSize: 22, color: GREY, textAlign: 'center' })],
          notes: '≈1 min. Pregunta, hipótesis y método jurídico: dogmático y comparado.' },
        section('I', 'Marco normativo', 'De la Constitución a la ley de trabajo a distancia', OX, '#ffffff', '#e8cf95', H),
        // Evolución normativa
        { title: 'Evolución normativa', layout: 'titleOnly', bg: IVORY, extra: [
          dg('timeline', '1978\n  Constitución: intimidad (art. 18) y descanso (art. 40.2)\n2003\n  Directiva 2003/88/CE sobre el tiempo de trabajo\n2016\n  Francia reconoce el «droit à la déconnexion»\n2018\n  LOPDGDD: art. 88 y nuevo art. 20 bis del Estatuto\n2021\n  Ley 10/2021 de trabajo a distancia (art. 18) y resolución del Parlamento Europeo', 90, 190, 1100, 360, { color: INK })],
          notes: '≈1,5 min. Cinco hitos reales. La resolución del Parlamento Europeo es de 21 de enero de 2021 y pide a la Comisión una directiva sobre el derecho a la desconexión.' },
        // Marco constitucional
        { title: 'Fundamento constitucional y europeo', layout: 'titleOnly', bg: IVORY, extra: [
          ...[['Art. 18 CE', 'Derecho a la intimidad personal y familiar.', SLATE], ['Art. 40.2 CE', 'Los poderes públicos garantizan el descanso necesario y la limitación de la jornada.', OX], ['Art. 31 CDFUE', 'Derecho a la limitación de la duración máxima del trabajo y a los descansos.', GOLD]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 200, 350, 250, c, { ts: 28, ds: 21 }), 'fade-up')),
          text('La desconexión no es un derecho nuevo de la nada: concreta en la era digital el descanso y la intimidad.', 90, 490, 1100, 80, { fontFamily: H, fontSize: 25, color: INK, textAlign: 'center', lineHeight: 1.4 })],
          notes: '≈1 min. CE: Constitución Española. CDFUE: Carta de los Derechos Fundamentales de la Unión Europea.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Qué añade exactamente el artículo 20 bis del Estatuto de los Trabajadores?', SLATE, '#ffffff'),
          card('Reconoce a los trabajadores, en el entorno digital y en los términos de la legislación de protección de datos, el derecho a la intimidad en el uso de los dispositivos que les facilita el empleador, a la desconexión digital y a la intimidad frente a la videovigilancia y la geolocalización.', 84, 200, 1110, 220, '#f6f3ec', { color: INK, fontSize: 23, radius: 14, pad: [24, 28, 22, 28] }),
          text('Paráfrasis del artículo 20 bis ET, introducido por la LOPDGDD (disposición final decimotercera). Cítalo literal en tu memoria.', 84, 450, 1110, 70, { fontSize: 19, color: GREY, fontStyle: 'italic' })],
          notes: 'Respaldo: si preguntan por la conexión con el Estatuto. Es una paráfrasis: en la memoria, el texto literal.' },
        section('II', 'Análisis', 'Cómo se regula fuera y qué falla aquí', SLATE, '#ffffff', '#e8cf95', H),
        // Derecho comparado
        { title: 'Tres modelos en Europa', layout: 'titleOnly', bg: IVORY, extra: [
          tableBlock({ x: 90, y: 180, w: 1100, h: 330, fontSize: 21, header: true, headBg: OX, headFg: '#ffffff', stroke: '#e3d8c6', banded: true, band: OX,
            rows: [['País', 'Norma', 'Modelo'], ['Francia', 'Loi n.º 2016-1088 («Loi Travail»)', 'Negociar la desconexión en la empresa; si no hay acuerdo, una carta del empleador'], ['España', 'LOPDGDD (art. 88) y Ley 10/2021 (art. 18)', 'Derecho del trabajador; política interna y remisión a la negociación colectiva'], ['Portugal', 'Lei n.º 83/2021', 'Deber del empleador de no contactar en los descansos, salvo fuerza mayor']] }),
          after(text('De la negociación (Francia) al deber de abstención del empleador (Portugal): España está en medio.', 90, 540, 1100, 70, { fontSize: 24, color: deep(OX, IVORY), fontWeight: 700, textAlign: 'center' }), 'fade-up')],
          notes: '≈2 min. La clave del trabajo: el modelo portugués pone el deber en el empleador; el español, el derecho en el trabajador. Comprueba la redacción exacta de cada norma en su fuente oficial.' },
        // Casos de ejemplo
        { title: 'Casos prácticos (ejemplos)', layout: 'titleOnly', bg: IVORY, extra: [
          tableBlock({ x: 90, y: 180, w: 1100, h: 330, fontSize: 20, header: true, headBg: SLATE, headFg: '#ffffff', stroke: '#dde2e8', banded: true, band: SLATE,
            rows: [['Caso (ejemplo)', 'Hechos', 'Cuestión jurídica'], ['Caso A', 'Mensajes del jefe por chat cada noche, con respuesta esperada', '¿Es tiempo de trabajo la disponibilidad no pactada?'], ['Caso B', 'Empresa sin política de desconexión, con convenio que no la regula', '¿Qué efecto tiene la falta de política interna?'], ['Caso C', 'Despido tras no contestar un correo en vacaciones', '¿Puede sancionarse ejercer el derecho a desconectar?']] }),
          text('Supuestos inventados para el análisis, no resoluciones reales. Sustitúyelos por la jurisprudencia que hayas estudiado, con su referencia.', 90, 530, 1100, 70, { fontSize: 19, color: GREY, fontStyle: 'italic' })],
          notes: '≈2 min. Usa los casos para mostrar los problemas. Si tu TFG analiza sentencias reales, pon aquí su tribunal, fecha y número.' },
        // Problemas detectados
        { title: 'Problemas detectados', layout: 'titleOnly', bg: IVORY, extra: [
          ...[['Remisión a la negociación', 'El contenido real del derecho depende del convenio o de la política interna de cada empresa.', OX], ['Disponibilidad difusa', 'No queda claro cuándo estar «localizable» es tiempo de trabajo.', GOLD], ['Consecuencias poco claras', 'La ley no concreta qué ocurre si la empresa no tiene política o la incumple.', SLATE]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 200, 350, 290, c, { ts: 25, ds: 21 }), 'fade-up'))],
          notes: '≈1,5 min. Tres problemas, cada uno conectado con un caso de la diapositiva anterior.' },
        // Propuesta de lege ferenda
        { title: 'Propuesta de lege ferenda', layout: 'titleOnly', bg: IVORY, extra: [
          dg('steps', 'Deber del empleador\n  No contactar fuera de la jornada, salvo urgencia justificada\nContenido mínimo\n  Qué debe incluir toda política interna\nRegistro\n  De las comunicaciones fuera del horario\nGarantía\n  Una infracción clara si se incumple', 90, 185, 1100, 330, { color: INK }),
          text('Inspirada en el deber de abstención portugués, sin renunciar al papel de la negociación colectiva.', 90, 545, 1100, 60, { fontSize: 22, color: GREY, textAlign: 'center' })],
          notes: '≈1,5 min. Tu aportación: concreta y realista. Cada medida responde a un problema.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Un deber de abstención no choca con la libertad de empresa (art. 38 CE)?', OX, '#ffffff'),
          tcard('Ponderación', 'La libertad de empresa no ampara invadir el descanso: el propio art. 40.2 CE obliga a los poderes públicos a garantizarlo.', 84, 210, 540, 250, OX),
          tcard('Proporcionalidad', 'La propuesta deja a salvo las urgencias justificadas y las guardias pactadas y retribuidas.', 654, 210, 540, 250, GOLD)],
          notes: 'Respaldo: la objeción previsible. Argumenta con ponderación de derechos y proporcionalidad.' },
        // Conclusiones
        { layout: 'blank', bg: OX, transition: 'zoom', extra: [
          label('CONCLUSIÓN', 90, 120, 600, '#e8cf95'),
          text('El derecho a desconectar existe, pero sin un deber claro del empleador depende demasiado de cada empresa.', 84, 160, 1100, 220, { fontFamily: H, fontSize: 46, fontWeight: 700, color: '#ffffff', lineHeight: 1.18 }),
          ...['Fundamento sólido: arts. 18 y 40.2 CE', 'Regulación española intermedia entre Francia y Portugal', 'Propuesta: deber de abstención con contenido mínimo y garantía']
            .map((t, i) => on(text(`<b style="color:#e8cf95">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 420 + i * 56, 1100, 50, { fontSize: 25, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. La tesis del trabajo en una frase, y tres conclusiones que responden a la pregunta.' },
        // Preguntas
        { layout: 'blank', bg: IVORY, extra: [
          text('Gracias', 96, 170, 700, 130, { fontFamily: H, fontSize: 96, fontWeight: 700, color: INK }),
          text('Quedo a disposición del tribunal.', 100, 310, 700, 60, { fontSize: 32, color: deep(OX, IVORY) }),
          text('Abajo: normas citadas.', 100, 390, 700, 50, { fontSize: 22, color: GREY }),
          timer(900, 900, 200, 300, { color: OX, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 15 minutos para ensayar. En las preguntas: si no sabes algo, dilo con calma y explica cómo lo investigarías.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('Normas citadas', SLATE, '#ffffff'),
          text(['Constitución Española de 1978, arts. 18, 38 y 40.2.', 'Carta de los Derechos Fundamentales de la Unión Europea, art. 31.', 'Directiva 2003/88/CE, relativa a determinados aspectos de la ordenación del tiempo de trabajo.',
            'Ley Orgánica 3/2018, de 5 de diciembre (LOPDGDD), art. 88.', 'Estatuto de los Trabajadores, art. 20 bis.', 'Ley 10/2021, de 9 de julio, de trabajo a distancia, art. 18.',
            'Resolución del Parlamento Europeo, de 21 de enero de 2021, sobre el derecho a la desconexión.', 'Francia: Loi n.º 2016-1088, du 8 août 2016.', 'Portugal: Lei n.º 83/2021, de 6 de dezembro.']
            .map(r => `<p style="padding-left:28px;text-indent:-28px;margin:0 0 8px">${r}</p>`).join(''), 84, 190, 1110, 440, { fontSize: 20, color: INK })],
          notes: 'Respaldo con las normas. Añade en tu memoria la doctrina y la jurisprudencia que hayas usado, con sus datos completos.' },
      ]), INK));
    } },

  // 3 · Tesis doctoral de Física de materiales: estabilidad de células solares de perovskita.
  sci_thesis_phd: { name: 'Defensa de tesis doctoral: Física de materiales', cat: 'sci',
    summary: 'Presentación de defensa de tesis doctoral de Física e Ingeniería de materiales: portada, cifras del problema, preguntas de investigación, estructura por capítulos, estado del arte, metodología con ecuaciones, resultados con curvas y gráficos, contribuciones originales, publicaciones derivadas, conclusiones, diapositivas de respaldo para las preguntas del tribunal y notas con los tiempos de 45 minutos',
    make: () => {
      const NIGHT = '#0f1622', PANEL = '#18233a', CREAM = '#eef2f8', DIM = '#9aa8be', AMBER = '#f5a524', TEAL = '#2bb3a3', ROSE = '#e8697a', SKY = '#6aa7ff';
      const H = pairStacks('tech').heading, M = "'JetBrains Mono', monospace";
      // A perovskite solar cell, its layers in section, with light coming in.
      const stack = () => svgURL(360, 420, Array.from({ length: 5 }, (_, i) => `<line x1="${60 + i * 60}" y1="10" x2="${40 + i * 60}" y2="120" stroke="${AMBER}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`).join('')
        + [['Vidrio', '#cfe3f4', 140, 30], ['ITO (contacto transparente)', '#9fc5e8', 170, 18], ['Transportador de electrones', '#6aa7ff', 188, 22], ['Perovskita', '#3a2a17', 210, 56], ['Capa de pasivación', TEAL, 266, 10], ['Transportador de huecos', '#e8697a', 276, 24], ['Contacto de oro', '#d8b04a', 300, 26]]
          .map(([n, c, y, h]) => `<rect x="40" y="${y}" width="280" height="${h}" fill="${c}"/>`).join('')
        + `<rect x="40" y="140" width="280" height="186" fill="none" stroke="#eef2f8" stroke-width="2"/><path d="M330 223 h20 M330 271 h20" stroke="#eef2f8" stroke-width="2"/>`
        + `<text x="180" y="360" font-family="sans-serif" font-size="16" fill="#9aa8be" text-anchor="middle">Sección de una célula de perovskita</text>`);
      const foot = () => [shape('rect', 84, 668, 1112, 1, '#2a3650'), text('Universidad de Ejemplo · Programa de Doctorado en Física de Materiales · Tesis doctoral 2026', 84, 676, 1112, 26, { fontSize: 14, color: DIM, textAlign: 'right' })];
      return numbered(ink(build({ name: 'Defensa de tesis doctoral: Física de materiales', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 42 }, body: { color: CREAM }, decor: foot }, [
        // Portada
        { layout: 'blank', bg: NIGHT, transition: 'fade', back: [glow(1020, -140, 640, AMBER, NIGHT, 26), glow(-160, 560, 560, TEAL, NIGHT, 18)], extra: [
          label('TESIS DOCTORAL · PROGRAMA DE DOCTORADO EN FÍSICA DE MATERIALES', 90, 100, 740, AMBER, { fontSize: 15, letterSpacing: 2 }),
          text('Ingeniería de interfaces para células solares de perovskita estables: de las horas a los miles de horas', 84, 144, 740, 300, { fontFamily: H, fontSize: 44, fontWeight: 700, color: CREAM, lineHeight: 1.14 }),
          shape('rect', 90, 466, 90, 4, AMBER),
          text('<b>Doctorando:</b> Javier Morales Abad<br><b>Directores:</b> Dra. Nuria Castell Vidal y Dr. Tomás Ibarra León<br>Universidad de Ejemplo · Octubre de 2026', 90, 490, 740, 130, { fontSize: 22, color: CREAM, lineHeight: 1.55 }),
          after(img(stack(), 860, 140, 340, 410, 'Sección de una célula solar de perovskita, capa a capa'), 'fade-left', { duration: 900 })],
          notes: '≈1 min. Saluda a la presidencia y a los miembros del tribunal. Una frase de la tesis: «He estudiado cómo hacer que estas células, muy eficientes, duren lo suficiente para ser útiles». Nombres y universidad de ejemplo.' },
        // El problema en cifras
        { layout: 'blank', bg: NIGHT, extra: [
          label('EL PROBLEMA', 90, 100, 600, ROSE),
          on(takeaway('&gt;26 %', 'de eficiencia récord en laboratorio para células de perovskita de una unión.', 90, 160, 520, 250, AMBER, { bg: PANEL, fg: CREAM, font: H }), 'fade-up'),
          on(takeaway('≈33 %', 'es el límite teórico de Shockley y Queisser para una sola unión: queda poco margen de eficiencia.', 660, 160, 530, 250, SKY, { bg: PANEL, fg: CREAM, font: H }), 'fade-up'),
          text('El cuello de botella ya no es la eficiencia: es la <b>estabilidad</b>. Muchas células pierden buena parte de su rendimiento en cientos de horas.', 90, 450, 1100, 100, { fontSize: 27, color: CREAM, lineHeight: 1.4 }),
          text('Fuentes: NREL, Best Research-Cell Efficiency Chart; W. Shockley y H. J. Queisser, J. Appl. Phys. 32, 510 (1961).', 90, 580, 1100, 40, { fontSize: 16, color: DIM, fontStyle: 'italic' })],
          notes: '≈2 min. Dos cifras reales: el récord de eficiencia (consulta el valor actualizado en la gráfica del NREL el día de la defensa) y el límite de Shockley-Queisser. Y el giro: el problema es la estabilidad.' },
        // Preguntas de investigación
        { title: 'Preguntas de investigación', layout: 'titleOnly', bg: NIGHT, extra: [
          ...[['P1', '¿Puede una capa de pasivación en la interfaz frenar la degradación sin perder eficiencia?', AMBER], ['P2', '¿Cuánto alarga la vida útil un encapsulado sencillo y barato?', TEAL], ['P3', '¿Se puede predecir la vida útil a partir de ensayos acelerados?', SKY]]
            .map(([t, d, col], i) => on(card(`<span style="font-family:${M};font-size:26px;font-weight:700;color:${col}">${t}</span>&nbsp;&nbsp;<span style="font-size:25px">${d}</span>`, 90, 180 + i * 140, 1100, 120, PANEL, { color: CREAM, radius: 14, pad: [22, 26, 20, 26] }), 'fade-up'))],
          notes: '≈2 min. Tres preguntas: cada una será un capítulo de resultados y una contribución.' },
        // Estructura
        { title: 'Estructura de la tesis', layout: 'titleOnly', bg: NIGHT, extra: [
          dg('chevrons', 'Cap. 1\n  Introducción\nCap. 2\n  Fundamentos\nCap. 3\n  Métodos\nCap. 4\n  Pasivación (P1)\nCap. 5\n  Encapsulado (P2)\nCap. 6\n  Modelo de vida (P3)\nCap. 7\n  Conclusiones', 90, 200, 1100, 260, { color: CREAM }),
          text('Hoy: lo esencial de los capítulos 4, 5 y 6, que son las tres contribuciones originales.', 90, 500, 1100, 60, { fontSize: 23, color: DIM, textAlign: 'center' })],
          notes: '≈1 min. El mapa de la defensa: el tribunal ya ha leído la tesis; recuérdale dónde está cada cosa.' },
        // Estado del arte
        { title: 'Estado del arte', layout: 'titleOnly', bg: NIGHT, extra: [
          dg('timeline', '1961\n  Shockley y Queisser: límite de eficiencia de una unión\n2009\n  Primeras células de perovskita (Kojima et al.), 3,8 %\n2012\n  Células de estado sólido por encima del 10 %\n2020\n  Protocolos de consenso ISOS para medir la estabilidad', 90, 190, 1100, 340, { color: CREAM }),
          text('Hueco que aborda la tesis: estabilizar sin sacrificar eficiencia, y predecir la vida útil con ensayos comparables.', 90, 560, 1100, 60, { fontSize: 22, color: AMBER, textAlign: 'center', fontWeight: 700 })],
          notes: '≈3 min. Hitos reales: Kojima et al., J. Am. Chem. Soc. 131, 6050 (2009); Lee et al., Science 338, 643 (2012); Khenkin et al., Nature Energy 5, 35 (2020), consenso ISOS.' },
        // Métodos
        { title: 'Métodos', layout: 'titleOnly', bg: NIGHT, extra: [
          dg('steps', 'Fabricación\n  Depósito por centrifugado y recocido\nInterfaz\n  Capa de pasivación ultrafina\nEncapsulado\n  Vidrio y sellante en los bordes\nCaracterización\n  Curvas J–V bajo AM1.5G y EQE\nEnvejecimiento\n  Protocolo ISOS-L-2', 90, 180, 700, 420, { color: CREAM }),
          mathBlock({ x: 830, y: 220, w: 360, h: 120, fontSize: 34, color: CREAM, latex: '\\eta = \\frac{J_{sc}\\,V_{oc}\\,FF}{P_{in}}' }),
          text('Eficiencia: corriente de cortocircuito, tensión en circuito abierto y factor de forma frente a la potencia incidente (1000 W/m²).', 830, 360, 360, 170, { fontSize: 20, color: DIM, lineHeight: 1.45 })],
          notes: '≈4 min. Sin detalle de laboratorio: el tribunal lo tiene en el capítulo 3. Explica qué mides y por qué con un protocolo estándar (ISOS) los resultados son comparables.' },
        // C1
        { title: 'C1 · La pasivación sube la tensión sin perder corriente', layout: 'titleOnly', bg: NIGHT, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 440, chartType: 'line', color: DIM, grid: true, xTitle: 'Tensión (V)', yTitle: 'Densidad de corriente (mA/cm²)', seriesName: 'Referencia',
            data: [0, 0.2, 0.4, 0.6, 0.8, 0.95, 1.05, 1.12].map((v, i) => ({ label: String(v).replace('.', ','), value: [23.6, 23.5, 23.3, 22.9, 21.6, 16.8, 6.1, 0][i] })),
            series: [{ name: 'Con pasivación', color: AMBER, values: [23.8, 23.7, 23.6, 23.3, 22.5, 19.9, 13.2, 4.0] }] }),
          after(takeaway('+60 mV', 'de tensión en circuito abierto: de 1,12 a 1,18 V, con la misma corriente.', 830, 200, 360, 240, AMBER, { bg: PANEL, fg: CREAM, font: H }), 'fade-up'),
          sample(830, 460, 360, DIM)],
          notes: '≈5 min. Capítulo 4. La pasivación reduce la recombinación en la interfaz: sube Voc sin perder Jsc. Si preguntan por los parámetros, baja a la tabla de respaldo.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('Parámetros fotovoltaicos completos (media ± desviación, n = 24)', '#1f6fb2', '#ffffff'),
          tableBlock({ x: 84, y: 200, w: 1110, h: 240, fontSize: 22, header: true, headBg: '#1f2a44', headFg: '#ffffff', stroke: '#dde3ee', banded: true, band: '#1f2a44',
            rows: [['Dispositivo', 'V<sub>oc</sub> (V)', 'J<sub>sc</sub> (mA/cm²)', 'FF (%)', 'η (%)'], ['Referencia', '1,12 ± 0,02', '23,6 ± 0,3', '78 ± 2', '20,6 ± 0,5'], ['Con pasivación', '1,18 ± 0,01', '23,8 ± 0,2', '81 ± 1', '22,7 ± 0,4']] }),
          text('Datos de ejemplo. Diferencias significativas en V<sub>oc</sub> y FF (t de Student, p &lt; 0,001).', 84, 470, 1110, 60, { fontSize: 21, color: '#1f2430' })],
          notes: 'Respaldo: la tabla con la dispersión. Insiste en el número de dispositivos.' },
        // C2
        { title: 'C2 · El encapsulado multiplica la vida útil', layout: 'titleOnly', bg: NIGHT, extra: [
          chartBlock({ x: 90, y: 170, w: 700, h: 440, chartType: 'line', color: DIM, grid: true, xTitle: 'Horas de envejecimiento (ISOS-L-2)', yTitle: 'Eficiencia normalizada', seriesName: 'Sin encapsular',
            data: [0, 100, 200, 300, 400, 600, 800, 1000].map((h, i) => ({ label: String(h), value: [1, 0.91, 0.84, 0.79, 0.74, 0.66, 0.6, 0.55][i] })),
            series: [{ name: 'Pasivada y encapsulada', color: TEAL, values: [1, 0.99, 0.97, 0.96, 0.95, 0.92, 0.9, 0.87] }] }),
          after(takeaway('T80 &gt; 1000 h', 'frente a unas 300 h sin encapsular (T80: tiempo hasta perder el 20 % de la eficiencia).', 830, 200, 360, 260, TEAL, { bg: PANEL, fg: CREAM, font: H }), 'fade-up'),
          sample(830, 480, 360, DIM)],
          notes: '≈5 min. Capítulo 5. El encapsulado frena la entrada de humedad y oxígeno; junto con la pasivación, la célula conserva más del 80 % tras 1000 horas.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Por qué el protocolo ISOS-L-2 y no un ensayo en exterior?', '#1f6fb2', '#ffffff'),
          tcard('Comparable', 'Los protocolos ISOS (Khenkin et al., 2020) fijan cómo envejecer y cómo informar: los resultados se pueden comparar con otros laboratorios.', 84, 210, 540, 260, '#1f6fb2'),
          tcard('Acelerado', 'Luz continua y temperatura elevada aceleran la degradación: en semanas se ve lo que en exterior tardaría meses. El exterior es la línea futura.', 654, 210, 540, 260, '#c77c0e')],
          notes: 'Respaldo: la objeción de siempre sobre ensayos de laboratorio. Reconoce que el ensayo en exterior es el siguiente paso.' },
        // C3
        { title: 'C3 · Un modelo para predecir la vida útil', layout: 'titleOnly', bg: NIGHT, extra: [
          mathBlock({ x: 90, y: 180, w: 520, h: 110, fontSize: 36, color: CREAM, latex: '\\eta(t) = \\eta_0\\, e^{-k t}' }),
          mathBlock({ x: 90, y: 310, w: 520, h: 110, fontSize: 36, color: CREAM, latex: 'k = A\\, e^{-E_a / k_B T}' }),
          text('Degradación de primer orden, con una constante que sigue la ley de Arrhenius: midiendo a varias temperaturas se estima la vida a la temperatura de uso.', 90, 440, 520, 160, { fontSize: 21, color: DIM, lineHeight: 1.45 }),
          chartBlock({ x: 650, y: 170, w: 540, h: 430, chartType: 'bar', color: SKY, dataLabels: true, grid: true, yTitle: 'T80 (h)', seriesName: 'Medido',
            data: [{ label: '85 °C', value: 1050 }, { label: '65 °C', value: 2400 }, { label: '45 °C', value: 5600 }], series: [{ name: 'Predicho', color: AMBER, values: [990, 2300, 5900] }] })],
          notes: '≈5 min. Capítulo 6. El modelo predice el T80 a una temperatura con los datos de otras, con errores por debajo del 10 % en el ejemplo. Datos de ejemplo.' },
        // Contribuciones
        { title: 'Contribuciones originales', layout: 'titleOnly', bg: NIGHT, extra: [
          ...[['C1', 'Una capa de pasivación que sube la tensión 60 mV sin perder corriente.', AMBER], ['C2', 'Un encapsulado sencillo que lleva el T80 por encima de 1000 horas.', TEAL], ['C3', 'Un modelo validado para estimar la vida útil desde ensayos acelerados.', SKY]]
            .map(([t, d, col], i) => on(card(`<div style="font-family:${M};font-size:40px;font-weight:700;color:${col}">${t}</div><div style="font-size:23px;margin-top:10px">${d}</div>`, 90 + i * 375, 200, 350, 300, PANEL, { color: CREAM, radius: 14, pad: [24, 24, 22, 24] }), 'fade-up'))],
          notes: '≈2 min. Las tres contribuciones originales, una por pregunta de investigación. Es la diapositiva que más importa al tribunal.' },
        // Publicaciones
        { title: 'Publicaciones derivadas', layout: 'titleOnly', bg: NIGHT, extra: [
          tableBlock({ x: 90, y: 180, w: 1100, h: 300, fontSize: 20, header: true, headBg: '#26324d', headFg: '#ffffff', stroke: '#2a3650', banded: true, band: '#2f3d5c', color: CREAM,
            rows: [['Año', 'Publicación (ejemplo)', 'Contribución'], ['2024', 'Morales, J. et al. Revista de ejemplo de materiales energéticos', 'C1'], ['2025', 'Morales, J. et al. Revista de ejemplo de fotovoltaica', 'C2'], ['2026', 'Morales, J. et al. Revista de ejemplo de física aplicada', 'C3']] }),
          text('Publicaciones de ejemplo: pon las tuyas con su DOI, y los congresos en los que se presentaron.', 90, 510, 1100, 60, { fontSize: 20, color: DIM, fontStyle: 'italic' })],
          notes: '≈1 min. Qué parte de la tesis está publicada y dónde. Con las reales, indica el cuartil si tu programa lo pide.' },
        // Impacto y futuro
        { title: 'Impacto y trabajo futuro', layout: 'titleOnly', bg: NIGHT, extra: [
          ...[['Impacto', 'Pasos concretos hacia células de perovskita duraderas y baratas, compatibles con tándem sobre silicio.', AMBER], ['Trabajo futuro', 'Ensayos en exterior, módulos de mayor área y alternativas sin plomo.', TEAL]]
            .map(([t, d, col], i) => on(card(`<b style="font-size:28px;color:${col}">${t}</b><br><span style="font-size:23px">${d}</span>`, 90 + i * 560, 200, 530, 260, PANEL, { color: CREAM, radius: 14, pad: [24, 26, 22, 26] }), 'fade-up'))],
          notes: '≈2 min. El impacto más allá de la tesis y lo que queda por hacer, sin prometer de más.' },
        // Conclusiones
        { layout: 'blank', bg: NIGHT, transition: 'zoom', back: [glow(640, 360, 900, AMBER, NIGHT, 18)], extra: [
          label('CONCLUSIÓN', 90, 120, 600, AMBER),
          text('Estabilizar la interfaz y encapsular bien lleva estas células de cientos a miles de horas, y su vida útil se puede predecir.', 84, 160, 1110, 230, { fontFamily: H, fontSize: 44, fontWeight: 700, color: CREAM, lineHeight: 1.18 }),
          ...['P1: sí, con 60 mV más de tensión', 'P2: T80 por encima de 1000 horas', 'P3: un modelo de Arrhenius con error inferior al 10 %']
            .map((t, i) => on(text(`<b style="color:${AMBER}">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 420 + i * 56, 1100, 50, { fontSize: 25, color: CREAM }), 'fade-up'))],
          notes: '≈2 min. La respuesta a cada pregunta de investigación. Datos de ejemplo.' },
        // Preguntas
        { layout: 'blank', bg: NIGHT, extra: [
          text('Gracias', 84, 170, 700, 130, { fontFamily: H, fontSize: 96, fontWeight: 700, color: CREAM }),
          text('A la presidencia y a los miembros del tribunal, a mis directores y al grupo de investigación.', 90, 310, 700, 110, { fontSize: 24, color: DIM, lineHeight: 1.45 }),
          timer(2700, 900, 200, 300, { color: AMBER, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 45 minutos para ensayar la exposición completa. En el debate: toma nota de cada pregunta y responde en orden.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Cuáles son las limitaciones del trabajo?', '#c4344b', '#ffffff'),
          ...[['Área pequeña', 'Dispositivos de 0,1 cm²: el escalado a módulos cambia los problemas.', '#c4344b'], ['Laboratorio', 'Ensayos acelerados en atmósfera controlada, aún sin exterior.', '#1f6fb2'], ['Plomo', 'La perovskita usada contiene plomo: hay que tratar su encapsulado y reciclaje.', '#c77c0e']]
            .map(([t, d, col], i) => tcard(t, d, 84 + i * 375, 210, 350, 260, col))],
          notes: 'Respaldo: reconocer las limitaciones con calma es parte de una buena defensa.' },
      ]), CREAM));
    } },

};
