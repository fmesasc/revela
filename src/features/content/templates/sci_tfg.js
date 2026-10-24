// Example presentations: defensas de TFG (Informática, Psicología, Enfermería). Each one: { name, summary, cat: 'sci',
// make() } → a deck (see kit.js). Lo que ayuda de verdad a defender ante un tribunal: portada institucional, el problema
// en una cifra (con su fuente real), pregunta y objetivos, método dibujado, resultados con la conclusión escrita junto a
// cada gráfico, limitaciones, conclusiones, turno de preguntas con cuenta atrás y diapositivas de respaldo DEBAJO
// (vertical) para las preguntas previsibles. Notas con el tiempo de cada parte (≈15 min). Nombres y universidad
// inventados; los datos del caso, «de ejemplo». Dibujos propios (SVG como data URL); nada de imágenes externas.

import { build, text, card, shape, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, codeBlock, appScreen, base, deep, pairStacks } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A small label in capitals.
const kicker = (t, x, y, w, color, size = 18) => text(t, x, y, w, 32, { fontSize: size, letterSpacing: 3, fontWeight: 700, color });
// The finding, written next to its chart or table: what the tribunal has to take away.
const takeaway = (html, x, y, w, h, accent, inkc, bg = '#ffffff') => on(card(html, x, y, w, h, bg, { color: inkc, radius: 14, borderColor: accent, fontSize: 23, pad: [18, 20, 16, 20] }), 'fade-left');
// Cards in a row from [title, text, colour]: the title in its colour, dark enough on the card (deep).
const cards = (items, { x0 = 90, y = 200, w = 350, gap = 25, h = 250, bg = '#ffffff', inkc = '#1f2733', ts = 25, ds = 20 } = {}) =>
  items.map(([t, d, col], i) => on(card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${inkc}">${d}</span>`,
    x0 + i * (w + gap), y, w, h, bg, { color: inkc, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up'));
// The footer every slide carries: the university, the faculty, the kind of work. (A grey that reads on light and dark.)
const footer = (txt, line, accent, foot) => () => [shape('rect', 60, 662, 1160, 1, line), shape('rect', 60, 40, 56, 5, accent),
  text(txt, 60, 668, 1160, 30, { fontSize: 15, color: foot, textAlign: 'right' })];

export default {

  // 1 · Informática: un modelo ligero que detecta phishing en el navegador.
  sci_thesis_cs: { name: 'Defensa de TFG: Ingeniería Informática', cat: 'sci', summary: 'Presentación de defensa del trabajo de fin de grado de Ingeniería Informática: portada institucional, el problema en una cifra, pregunta y objetivos, estado de la cuestión, arquitectura del sistema, el modelo en código, métricas en gráfico y matriz de confusión, demo, discusión, conclusiones y diapositivas de respaldo para las preguntas del tribunal, con notas y tiempos', make: () => {
    const BG = '#f5f8fc', NAVY = '#0b2545', TEAL = '#0e7c86', CORAL = '#e4572e', GOLD = '#f2a541', INK = '#1c2533', GREY = '#5c6779', LINE = '#d3dbe6', FOOT = '#7d8aa0', H = pairStacks('tech').heading;
    const art = svgURL(330, 400, `<rect x="30" y="110" width="270" height="180" rx="16" fill="#ffffff" stroke="#9fb3cc" stroke-width="4"/>`
      + `<path d="M34 118 L165 210 L296 118" fill="none" stroke="#9fb3cc" stroke-width="4"/>`
      + `<path d="M165 20 V80 a28 28 0 1 1 -28 28" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"/>`
      + `<path d="M200 240 l50 -20 l50 20 v40 c0 38 -28 58 -50 70 c-22 -12 -50 -32 -50 -70z" fill="${TEAL}" stroke="#ffffff" stroke-width="5"/>`
      + `<path d="M228 282 l15 15 l28 -32" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`);
    return numbered(ink(build({ name: 'Defensa de TFG: Ingeniería Informática', palette: 'ocean', fonts: 'tech', title: { size: 42, color: NAVY }, body: { color: INK },
      decor: footer('Universidad de Ejemplo · Escuela de Ingeniería · Trabajo de Fin de Grado 2026', LINE, TEAL, FOOT) }, [
      { layout: 'blank', bg: NAVY, back: [glow(1050, -100, 560, TEAL, NAVY, 30), glow(-150, 560, 480, CORAL, NAVY, 16)], transition: 'fade', extra: [
        kicker('TRABAJO DE FIN DE GRADO · INGENIERÍA INFORMÁTICA', 90, 110, 760, '#7fd1d8'),
        text('Detección de correos de phishing con un modelo ligero que funciona en el navegador', 86, 150, 760, 260, { fontFamily: H, fontSize: 50, fontWeight: 700, color: '#ffffff', lineHeight: 1.12 }),
        shape('rect', 90, 430, 90, 4, CORAL),
        text('<b>Autor:</b> Daniel Ortega Ruiz<br><b>Tutora:</b> Dra. Elena Sanz Prieto<br>Universidad de Ejemplo · Escuela de Ingeniería · Junio de 2026', 90, 455, 760, 140, { fontSize: 22, color: '#c8d6ea', lineHeight: 1.55 }),
        after(img(art, 880, 150, 330, 400, 'Un sobre con un anzuelo, protegido por un escudo'), 'fade-left', { duration: 800 })],
        notes: '≈30 s. Saluda al tribunal y presenta el trabajo en una frase: «He construido un detector de phishing que cabe en el navegador». Nombres y universidad son de ejemplo: pon los tuyos.' },
      { layout: 'blank', bg: BG, extra: [
        kicker('EL PROBLEMA', 90, 120, 600, deep(CORAL, BG)),
        text(`<div style="font-family:${H};font-size:150px;font-weight:700;line-height:1;color:${NAVY}">68 %</div>`, 84, 160, 620, 190),
        text('de las brechas de seguridad implican a una persona que comete un error o cae en un engaño.', 90, 360, 620, 130, { fontSize: 30, color: INK, lineHeight: 1.35 }),
        text('Fuente: Verizon, Data Breach Investigations Report 2024.', 90, 510, 620, 40, { fontSize: 18, color: GREY }),
        on(card(`<b style="color:${deep(TEAL, '#ffffff')}">El phishing</b> es la puerta de entrada más común: un correo que parece de tu banco, de tu universidad o de tu jefe.`, 760, 200, 430, 270, '#ffffff', { color: INK, fontSize: 25, radius: 16, borderColor: TEAL, pad: [26, 26, 24, 26] }), 'fade-left')],
        notes: '≈1 min. Empieza por el problema, no por el método: una cifra y por qué importa. El dato es real (informe DBIR 2024 de Verizon); si tu tema es otro, busca la cifra equivalente con su fuente.' },
      { title: 'Pregunta de investigación y objetivos', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<span style="font-size:18px;letter-spacing:3px;color:${deep(TEAL, '#e8f4f5')}"><b>PREGUNTA</b></span><br><span style="font-family:${H};font-size:28px;color:${NAVY}">¿Puede un modelo pequeño, que se ejecuta en el propio navegador, detectar el phishing casi tan bien como un modelo grande en la nube?</span>`,
          90, 170, 1100, 175, '#e8f4f5', { color: NAVY, radius: 16, borderColor: TEAL, pad: [20, 26, 18, 26] }), 'fade-up'),
        ...cards([['Objetivo 1', 'Reunir y etiquetar un corpus de correos legítimos y de phishing.', TEAL], ['Objetivo 2', 'Comparar cuatro modelos, del más simple al más grande.', CORAL], ['Objetivo 3', 'Llevar el mejor modelo ligero a una extensión del navegador.', GOLD]],
          { y: 375, h: 240, ts: 24, ds: 21 })],
        notes: '≈1 min. La pregunta en una frase que se pueda responder con «sí» o «no» al final. Tres objetivos, uno por fase del trabajo.' },
      { title: 'Estado de la cuestión', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', 'Listas negras\n  años 2000: dominios y remitentes conocidos\nFiltros bayesianos\n  2002: P. Graham, «A Plan for Spam»\nAprendizaje clásico\n  años 2010: SVM y bosques aleatorios\nTransformers\n  desde 2019: BERT y sus variantes\nEste trabajo\n  un modelo ligero en el navegador',
          90, 175, 1100, 400, { colors: 'colorful' }),
        text('El hueco: los mejores modelos son grandes y viven en la nube; ninguno llega al correo de cada estudiante.', 90, 590, 1100, 50, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: '≈1,5 min. Cuenta la evolución en una línea de tiempo y termina en el hueco que cubre tu trabajo. Graham (2002) y BERT (Devlin y otros, 2019) son referencias reales.' },
      { title: 'Arquitectura del sistema', layout: 'titleOnly', bg: BG, extra: [
        dg('chevrons', 'Correo\n  quien lo recibe lo abre\nRasgos\n  texto, enlaces y cabeceras\nModelo\n  regresión logística de 2 MB\nPuntuación\n  de 0 a 1\nAviso\n  si supera 0,8', 90, 180, 1100, 260, { colors: 'colorful' }),
        ...cards([['Todo en local', 'El correo nunca sale del ordenador.', TEAL], ['Rápido', 'Menos de 30 ms por correo (datos de ejemplo).', CORAL], ['Explicable', 'Muestra qué rasgos han hecho saltar el aviso.', GOLD]],
          { y: 465, h: 170, ts: 23, ds: 19 })],
        notes: '≈1,5 min. Recorre el flujo de izquierda a derecha. Insiste en la decisión de diseño clave: ejecutarlo en el navegador, por privacidad.' },
      { title: 'El modelo, en código', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 90, y: 180, w: 700, h: 330, lang: 'python', fontSize: 20,
          code: 'from sklearn.pipeline import make_pipeline\nfrom sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.linear_model import LogisticRegression\n\nmodelo = make_pipeline(\n    TfidfVectorizer(ngram_range=(1, 2), min_df=3),\n    LogisticRegression(class_weight="balanced"))\nmodelo.fit(X_entreno, y_entreno)' }),
        text(ul('TF-IDF de palabras y de pares de palabras', 'Clases equilibradas: hay menos phishing que correo legítimo', 'Exportado a ONNX para ejecutarlo en el navegador'), 830, 190, 360, 330, { fontSize: 23, color: INK, lineHeight: 1.45 }),
        text('Debajo: el corpus con el que se entrenó.', 90, 540, 700, 40, { fontSize: 19, color: GREY })],
        notes: '≈1,5 min. No leas el código: explica las tres decisiones de la derecha. Si el tribunal pregunta por los datos, baja a la diapositiva de respaldo.' },
      { title: 'Respaldo · el corpus', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        tableBlock({ x: 150, y: 185, w: 980, h: 300, fontSize: 24, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE, banded: true, band: TEAL,
          rows: [['Conjunto', 'Correos', 'Phishing', 'Legítimos'], ['Entrenamiento', '8.400', '2.100', '6.300'], ['Validación', '1.800', '450', '1.350'], ['Prueba', '1.800', '450', '1.350'], ['<b>Total</b>', '<b>12.000</b>', '<b>3.000</b>', '<b>9.000</b>']] }),
        text('Datos de ejemplo · reparto 70 / 15 / 15 estratificado · correos en español e inglés.', 150, 510, 980, 40, { fontSize: 20, color: GREY, textAlign: 'center' })],
        notes: 'Respaldo: solo si preguntan por los datos. Explica de dónde salen los correos y cómo se etiquetaron.' },
      { title: 'Resultados · cuatro modelos', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 90, y: 175, w: 760, h: 450, chartType: 'bar', color: NAVY, grid: true, seriesName: 'Precisión',
          data: [{ label: 'Listas negras', value: 92 }, { label: 'Bayes ingenuo', value: 89 }, { label: 'Regresión log.', value: 94 }, { label: 'DistilBERT', value: 97 }],
          series: [{ name: 'Exhaustividad', color: TEAL, values: [41, 86, 93, 96] }, { name: 'F1', color: CORAL, values: [57, 87, 94, 96] }] }),
        takeaway(`<b style="font-size:30px;color:${deep(CORAL, '#ffffff')}">F1 = 0,94</b><br>con un modelo de 2 MB: a 2 puntos de DistilBERT, que ocupa unos 260 MB.`, 880, 200, 310, 250, CORAL, INK),
        text('Datos de ejemplo · conjunto de prueba (1.800 correos).', 880, 480, 310, 70, { fontSize: 18, color: GREY })],
        notes: '≈2 min. La conclusión primero, el gráfico después. Explica qué es la exhaustividad: cuánto phishing se detecta. Las listas negras aciertan cuando avisan, pero se les escapa casi todo.' },
      { title: 'Respaldo · matriz de confusión', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        tableBlock({ x: 150, y: 185, w: 760, h: 240, fontSize: 24, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE,
          rows: [['', 'Predicho: phishing', 'Predicho: legítimo'], ['<b>Real: phishing</b>', '<b>419</b> aciertos', '31 se cuelan'], ['<b>Real: legítimo</b>', '27 falsas alarmas', '<b>1.323</b> aciertos']],
          cellBg: { '1,1': '#d9f0ec', '2,2': '#d9f0ec', '1,2': '#fbe3dc', '2,1': '#fdf0d8' } }),
        text('Precisión = 419 / (419 + 27) = 0,94<br>Exhaustividad = 419 / 450 = 0,93', 940, 200, 260, 200, { fontSize: 22, color: INK, lineHeight: 1.6 }),
        text('Datos de ejemplo · regresión logística sobre el conjunto de prueba.', 150, 450, 760, 40, { fontSize: 19, color: GREY })],
        notes: 'Respaldo: si preguntan cómo se calculan las métricas. Las 31 que se cuelan son el riesgo real: explica qué tipo de correos son.' },
      { title: 'Demostración', layout: 'titleOnly', bg: BG, extra: [
        img(appScreen(360, 640, CORAL, 'Aviso de phishing', 4), 150, 170, 260, 460, 'La extensión avisando de un correo sospechoso'),
        ...[['Aviso al abrir el correo', 'Una banda roja antes de que hagas clic en el enlace.', CORAL], ['Explica por qué', '«El remitente imita a tu banco» · «El enlace no coincide».', TEAL], ['Sin enviar nada', 'El modelo viaja con la extensión: el correo no sale del ordenador.', GOLD]]
          .map(([t, d, col], i) => on(card(`<b style="font-size:24px;color:${deep(col, '#ffffff')}">${t}</b><br><span style="font-size:20px">${d}</span>`, 470, 175 + i * 150, 720, 130, '#ffffff', { color: INK, radius: 14, borderColor: col, pad: [16, 22, 14, 22] }), 'fade-left'))],
        notes: '≈1,5 min. Si puedes, haz la demo en directo; si no, enseña esta captura y cuenta un caso real en el que avisó.' },
      { title: 'Discusión', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 250, fontSize: 22, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE, banded: true, band: TEAL,
          rows: [['Trabajo', 'Modelo', 'F1', '¿Dónde se ejecuta?'], ['Estudio A (ejemplo, 2021)', 'SVM', '0,91', 'Servidor'], ['Estudio B (ejemplo, 2023)', 'BERT ajustado', '0,97', 'Nube'], ['<b>Este TFG</b>', 'Regresión logística + TF-IDF', '<b>0,94</b>', '<b>Navegador</b>']] }),
        takeaway('Rinde como los modelos clásicos de la literatura y se acerca a los grandes, <b>sin sacar el correo del ordenador</b>.', 90, 460, 1100, 120, TEAL, INK)],
        notes: '≈1,5 min. Compárate con la literatura con honestidad. Los estudios A y B son de ejemplo: sustitúyelos por los que hayas citado.' },
      { title: 'Limitaciones y trabajo futuro', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<b style="font-size:26px;color:${deep(CORAL, '#ffffff')}">Limitaciones</b>` + ul('Corpus solo en español e inglés', 'Correos que imitan a compañeros de trabajo', 'No analiza imágenes ni adjuntos'), 90, 180, 530, 400, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: CORAL, pad: [24, 26, 22, 26] }), 'fade-up'),
        on(card(`<b style="font-size:26px;color:${deep(TEAL, '#ffffff')}">Trabajo futuro</b>` + ul('Analizar también los adjuntos', 'Aprender de los avisos que confirma el usuario', 'Probarlo con usuarios reales durante un curso'), 660, 180, 530, 400, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: TEAL, pad: [24, 26, 22, 26] }), 'fade-up')],
        notes: '≈1 min. Reconocer las limitaciones antes de que te las pregunten da confianza al tribunal.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 400, 520, TEAL, BG, 14)], extra: [
        kicker('CONCLUSIÓN', 90, 130, 600, deep(TEAL, BG)),
        text('Un modelo de 2 MB, en el navegador, detecta 9 de cada 10 correos de phishing sin enviar nada a la nube.', 84, 170, 1100, 220, { fontFamily: H, fontSize: 48, fontWeight: 700, color: NAVY, lineHeight: 1.15 }),
        ...cards([['Sí, se puede', 'La respuesta a la pregunta: F1 de 0,94.', TEAL], ['Privacidad', 'El correo no sale del ordenador.', CORAL], ['Aplicable ya', 'Una extensión que cualquiera puede instalar.', GOLD]], { y: 420, h: 180, ts: 24, ds: 20 })],
        notes: '≈1 min. Responde a la pregunta del principio con una frase. Tres conclusiones, ni una más.' },
      { layout: 'blank', bg: NAVY, back: [glow(1050, -100, 560, TEAL, NAVY, 30)], transition: 'fade', extra: [
        text('¿Preguntas?', 84, 190, 760, 140, { fontFamily: H, fontSize: 96, fontWeight: 700, color: '#ffffff' }),
        text('Gracias al tribunal y a mi tutora.<br>Daniel Ortega Ruiz · dortega@ejemplo.edu', 90, 350, 760, 110, { fontSize: 26, color: '#c8d6ea', lineHeight: 1.5 }),
        timer(600, 930, 200, 270, { color: '#7fd1d8', endText: 'Fin del turno' }),
        text('Turno de preguntas', 900, 490, 330, 40, { fontSize: 20, color: '#c8d6ea', textAlign: 'center' })],
        notes: '≈30 s. Agradece y abre el turno. Debajo hay respaldo para la pregunta más probable: los ataques que intentan engañar al modelo.' },
      { title: 'Respaldo · ¿y si el atacante adapta el correo?', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        ...cards([['El riesgo', 'Correos escritos para esquivar el modelo: palabras raras, enlaces acortados.', CORAL], ['Lo que ya hace', 'Mira también enlaces y cabeceras, no solo el texto: es más difícil de engañar.', TEAL], ['Cómo reforzarlo', 'Reentrenar con los correos que se cuelan y con ejemplos adversarios.', GOLD]], { y: 190, h: 330, ts: 25, ds: 21 })],
        notes: 'Respaldo: la pregunta clásica sobre robustez. Reconoce el riesgo y explica la defensa en capas.' },
    ]), INK));
  } },

  // 2 · Psicología: uso problemático del móvil y ansiedad en universitarios.
  sci_thesis_psy: { name: 'Defensa de TFG: Psicología', cat: 'sci', summary: 'Presentación de defensa del trabajo de fin de grado de Psicología: portada, el problema en una cifra de la OMS, pregunta e hipótesis, marco teórico, método con escalas validadas (SAS-SV y GAD-7), resultados con gráfico de medias y tabla de correlaciones, ética, limitaciones, conclusiones y diapositivas de respaldo para las preguntas del tribunal, con notas y tiempos', make: () => {
    const BG = '#fbf9fd', PLUM = '#3d2c6b', VIO = '#7a5cc2', CORAL = '#e07a5f', SAGE = '#4f9384', INK = '#241f33', GREY = '#615b73', LINE = '#e2dcee', FOOT = '#7f7898', H = pairStacks('editorial').heading;
    const art = svgURL(300, 420, `<rect x="70" y="20" width="160" height="300" rx="26" fill="#2a1f4d" stroke="#c9b8f0" stroke-width="5"/><rect x="88" y="52" width="124" height="230" rx="8" fill="#4b3a86"/>`
      + `<polyline points="92,170 118,170 130,130 146,215 160,150 172,185 184,170 208,170" fill="none" stroke="#f4a28c" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
      + `<circle cx="150" cy="300" r="7" fill="#c9b8f0"/>` + [0, 1, 2].map(i => `<circle cx="${110 + i * 40}" cy="370" r="10" fill="#c9b8f0" opacity="${(0.4 + i * 0.3).toFixed(1)}"/>`).join(''));
    return numbered(ink(build({ name: 'Defensa de TFG: Psicología', palette: 'violet', fonts: 'editorial', title: { size: 42, color: PLUM }, body: { color: INK },
      decor: footer('Universidad de Ejemplo · Facultad de Psicología · Trabajo de Fin de Grado 2026', LINE, VIO, FOOT) }, [
      { layout: 'blank', bg: BG, back: [shape('rect', 0, 0, 470, 720, PLUM), glow(1000, 420, 520, VIO, BG, 12)], transition: 'fade', extra: [
        after(img(art, 85, 140, 300, 420, 'Un móvil con una línea de pulso agitada'), 'fade-up', { duration: 800 }),
        kicker('TRABAJO DE FIN DE GRADO · PSICOLOGÍA', 520, 120, 690, deep(VIO, BG)),
        text('Uso problemático del móvil y ansiedad en estudiantes universitarios: un estudio correlacional', 516, 160, 690, 280, { fontFamily: H, fontSize: 46, fontWeight: 700, color: PLUM, lineHeight: 1.14 }),
        shape('rect', 520, 455, 90, 4, CORAL),
        text('<b>Autora:</b> Marta Gil Romero<br><b>Tutor:</b> Dr. Pablo Navarro Ibáñez<br>Universidad de Ejemplo · Junio de 2026', 520, 480, 690, 130, { fontSize: 22, color: INK, lineHeight: 1.55 })],
        notes: '≈30 s. Saluda y presenta el estudio en una frase. Nombres y universidad son de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [
        kicker('EL PROBLEMA', 90, 120, 600, deep(CORAL, BG)),
        text(`<div style="font-family:${H};font-size:130px;font-weight:700;line-height:1;color:${PLUM}">301 millones</div>`, 84, 160, 1100, 170),
        text('de personas vivían con un trastorno de ansiedad en el mundo en 2019.', 90, 340, 700, 100, { fontSize: 30, color: INK, lineHeight: 1.35 }),
        text('Fuente: Organización Mundial de la Salud, nota descriptiva «Trastornos de ansiedad» (2023).', 90, 450, 700, 60, { fontSize: 18, color: GREY }),
        on(card(`<b style="color:${deep(VIO, '#ffffff')}">Y en la universidad</b>, el móvil está siempre a mano. ¿Tiene algo que ver con cómo nos sentimos?`, 830, 340, 360, 230, '#ffffff', { color: INK, fontSize: 23, radius: 16, borderColor: VIO, pad: [22, 24, 20, 24] }), 'fade-left')],
        notes: '≈1 min. El dato de la OMS es real. Pasa de lo global a tu población: los estudiantes.' },
      { title: 'Pregunta e hipótesis', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<span style="font-size:18px;letter-spacing:3px;color:${deep(VIO, '#f1ecfa')}"><b>PREGUNTA</b></span><br><span style="font-family:${H};font-size:29px;color:${PLUM}">¿Se relaciona el uso problemático del móvil con los síntomas de ansiedad en estudiantes universitarios?</span>`,
          90, 170, 1100, 160, '#f1ecfa', { color: PLUM, radius: 16, borderColor: VIO, pad: [20, 26, 18, 26] }), 'fade-up'),
        ...cards([['H1', 'A más uso problemático del móvil, más síntomas de ansiedad.', VIO], ['H2', 'La relación se mantiene al tener en cuenta las horas de sueño.', CORAL]], { y: 360, w: 537, h: 220, ts: 30, ds: 23 })],
        notes: '≈1 min. Dos hipótesis claras y que se puedan contrastar. La segunda descarta una explicación alternativa: dormir poco.' },
      { title: 'Marco teórico', layout: 'titleOnly', bg: BG, extra: [
        ...cards([['Kwon y otros (2013)', 'Crean la SAS-SV, una escala de 10 ítems para medir la adicción al smartphone.', VIO], ['Spitzer y otros (2006)', 'Crean el GAD-7, 7 preguntas para cribar la ansiedad generalizada.', CORAL], ['Elhai y otros (2017)', 'Revisión sistemática: el uso problemático del móvil se asocia con ansiedad y depresión.', SAGE]],
          { y: 185, h: 330, ts: 24, ds: 21 }),
        text('Lo que falta: datos de estudiantes universitarios españoles que controlen el sueño.', 90, 545, 1100, 50, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: '≈1,5 min. Tres trabajos reales y bien conocidos que sostienen tu estudio. Termina con el hueco que cubres.' },
      { title: 'Método', layout: 'titleOnly', bg: BG, extra: [
        kicker('DISEÑO TRANSVERSAL CORRELACIONAL', 90, 170, 1100, deep(VIO, BG)),
        ...cards([['Participantes', '312 estudiantes de grado de 18 a 25 años, muestreo incidental (datos de ejemplo).', VIO], ['Instrumentos', 'SAS-SV, GAD-7 y horas de sueño autoinformadas.', CORAL], ['Procedimiento', 'Cuestionario en línea, anónimo, de 15 minutos, con consentimiento informado.', SAGE]],
          { y: 215, h: 260, ts: 25, ds: 21 }),
        text('Debajo: las escalas y su fiabilidad en esta muestra.', 90, 505, 1100, 40, { fontSize: 19, color: GREY })],
        notes: '≈1,5 min. Quién, con qué y cómo. Si el tribunal pregunta por la fiabilidad de las escalas, baja al respaldo.' },
      { title: 'Respaldo · las escalas', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        tableBlock({ x: 90, y: 185, w: 1100, h: 230, fontSize: 22, header: true, headBg: PLUM, headFg: '#ffffff', stroke: LINE, banded: true, band: VIO,
          rows: [['Escala', 'Qué mide', 'Ítems', 'Rango', 'α de Cronbach*'], ['SAS-SV', 'Uso problemático del móvil', '10', '10–60', '0,86'], ['GAD-7', 'Síntomas de ansiedad', '7', '0–21', '0,89']] }),
        text('* En esta muestra · datos de ejemplo. El GAD-7 usa 5, 10 y 15 como puntos de corte de ansiedad leve, moderada y grave.', 90, 440, 1100, 70, { fontSize: 20, color: GREY })],
        notes: 'Respaldo: fiabilidad y puntos de corte. Un α por encima de 0,80 se considera buena fiabilidad.' },
      { title: 'Resultados · ansiedad por nivel de uso', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 90, y: 175, w: 720, h: 450, chartType: 'bar', color: VIO, grid: true, dataLabels: true, yTitle: 'GAD-7 (media)', seriesName: 'GAD-7',
          data: [{ label: 'Uso bajo', value: 4.8, color: SAGE }, { label: 'Uso moderado', value: 6.9, color: VIO }, { label: 'Uso alto', value: 9.6, color: CORAL }] }),
        takeaway(`<b style="font-size:28px;color:${deep(CORAL, '#ffffff')}">El doble</b><br>de síntomas de ansiedad en el grupo de uso alto que en el de uso bajo.<br><span style="font-size:19px">F(2, 309) = 21,4; p &lt; 0,001</span>`, 850, 200, 340, 290, CORAL, INK),
        text('Datos de ejemplo · n = 312.', 850, 515, 340, 40, { fontSize: 18, color: GREY })],
        notes: '≈2 min. La conclusión primero. El grupo de uso alto se acerca al punto de corte de ansiedad moderada (10).' },
      { title: 'Resultados · correlaciones', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 185, w: 720, h: 280, fontSize: 24, header: true, headBg: PLUM, headFg: '#ffffff', stroke: LINE,
          rows: [['', 'SAS-SV', 'GAD-7', 'Sueño (h)'], ['<b>SAS-SV</b>', '—', '', ''], ['<b>GAD-7</b>', '0,41**', '—', ''], ['<b>Sueño (h)</b>', '−0,28**', '−0,33**', '—']],
          cellBg: { '2,1': '#ead9f7', '3,1': '#fbe3dc', '3,2': '#fbe3dc' } }),
        text('** p &lt; 0,01 · datos de ejemplo.', 90, 480, 720, 40, { fontSize: 19, color: GREY }),
        takeaway(`<b style="font-size:28px;color:${deep(VIO, '#ffffff')}">r = 0,41</b><br>Una relación moderada (Cohen, 1988), en la dirección que predecía H1.`, 850, 200, 340, 260, VIO, INK)],
        notes: '≈1,5 min. Explica el tamaño del efecto con palabras: moderado. Dormir menos se asocia con más ansiedad y con más uso del móvil.' },
      { title: 'Respaldo · ¿es significativo y es importante?', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        ...cards([['p < 0,01', 'Si no hubiera relación, sería muy improbable encontrar una así por azar.', VIO], ['Tamaño del efecto', 'Cohen: r de 0,1 pequeño, 0,3 moderado y 0,5 grande. Aquí, 0,41.', CORAL], ['Controlando el sueño', 'La correlación parcial baja a 0,35 y sigue siendo significativa: se apoya H2.', SAGE]],
          { y: 190, h: 330, ts: 24, ds: 21 })],
        notes: 'Respaldo: la diferencia entre significativo e importante. Los umbrales de Cohen (1988) son reales; los valores, de ejemplo.' },
      { title: 'Discusión', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<b style="font-size:26px;color:${deep(SAGE, '#ffffff')}">Coincide con…</b>` + ul('La revisión de Elhai y otros (2017): la asociación aparece en muchas muestras', 'Estudios que relacionan menos sueño con más ansiedad'), 90, 180, 530, 380, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: SAGE, pad: [24, 26, 22, 26] }), 'fade-up'),
        on(card(`<b style="font-size:26px;color:${deep(VIO, '#ffffff')}">Lo que aporta</b>` + ul('Una muestra universitaria española', 'La relación se mantiene al controlar el sueño', 'Escalas validadas y breves, fáciles de repetir'), 660, 180, 530, 380, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: VIO, pad: [24, 26, 22, 26] }), 'fade-up')],
        notes: '≈1,5 min. Sitúa tus resultados en la literatura: en qué coinciden y qué añaden.' },
      { title: 'Consideraciones éticas', layout: 'titleOnly', bg: BG, extra: [
        ...cards([['Consentimiento informado', 'Cada participante lo aceptó antes de empezar y podía abandonar en cualquier momento.', VIO], ['Datos anónimos', 'Sin nombres ni correos; tratamiento según el RGPD.', SAGE], ['Recursos de ayuda', 'Al final del cuestionario, el servicio psicológico de la universidad.', CORAL]],
          { y: 190, h: 300, ts: 24, ds: 21 }),
        text('Aprobado por el comité de ética de la universidad (ejemplo: dictamen favorable 2026/014).', 90, 515, 1100, 50, { fontSize: 20, color: GREY, textAlign: 'center' })],
        notes: '≈1 min. En Psicología el tribunal siempre valora la ética: dilo aunque no te lo pregunten.' },
      { title: 'Limitaciones y líneas futuras', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<b style="font-size:26px;color:${deep(CORAL, '#ffffff')}">Limitaciones</b>` + ul('Diseño transversal: no permite hablar de causas', 'Medidas de autoinforme', 'Muestra incidental de una sola universidad'), 90, 180, 530, 380, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: CORAL, pad: [24, 26, 22, 26] }), 'fade-up'),
        on(card(`<b style="font-size:26px;color:${deep(SAGE, '#ffffff')}">Líneas futuras</b>` + ul('Un estudio longitudinal a lo largo del curso', 'Medir el uso real con el propio móvil', 'Comparar entre grados y universidades'), 660, 180, 530, 380, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: SAGE, pad: [24, 26, 22, 26] }), 'fade-up')],
        notes: '≈1 min. La principal limitación es que no se puede hablar de causa; anticípalo.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 400, 520, VIO, BG, 14)], extra: [
        kicker('CONCLUSIÓN', 90, 130, 600, deep(VIO, BG)),
        text('A más uso problemático del móvil, más ansiedad: una relación moderada que se mantiene aunque tengamos en cuenta el sueño.', 84, 170, 1100, 230, { fontFamily: H, fontSize: 44, fontWeight: 700, color: PLUM, lineHeight: 1.18 }),
        ...cards([['H1, apoyada', 'r = 0,41 entre uso del móvil y ansiedad.', VIO], ['H2, apoyada', 'Sigue tras controlar el sueño.', SAGE], ['Para el campus', 'Base para programas de uso saludable del móvil.', CORAL]], { y: 425, h: 180, ts: 24, ds: 20 })],
        notes: '≈1 min. Responde a la pregunta y cierra con la aplicación práctica.' },
      { layout: 'blank', bg: PLUM, back: [glow(1050, -100, 560, VIO, PLUM, 30)], transition: 'fade', extra: [
        text('¿Preguntas?', 84, 190, 760, 140, { fontFamily: H, fontSize: 96, fontWeight: 700, color: '#ffffff' }),
        text('Gracias al tribunal y a mi tutor.<br>Marta Gil Romero · mgil@ejemplo.edu', 90, 350, 760, 110, { fontSize: 26, color: '#ddd2f5', lineHeight: 1.5 }),
        timer(600, 930, 200, 270, { color: '#c9b8f0', endText: 'Fin del turno' }),
        text('Turno de preguntas', 900, 490, 330, 40, { fontSize: 20, color: '#ddd2f5', textAlign: 'center' })],
        notes: '≈30 s. Debajo, el respaldo para la pregunta que casi siempre llega: ¿correlación o causa?' },
      { title: 'Respaldo · ¿correlación implica causa?', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        text('No. Un estudio transversal no puede decir qué causa qué. Hay al menos tres explicaciones:', 90, 175, 1100, 70, { fontSize: 25, color: INK }),
        ...cards([['El móvil → ansiedad', 'Las notificaciones y la comparación constante aumentan la ansiedad.', VIO], ['Ansiedad → el móvil', 'Quien está ansioso usa el móvil para evadirse.', CORAL], ['Un tercer factor', 'El estrés académico podría aumentar las dos cosas.', SAGE]], { y: 260, h: 280, ts: 24, ds: 21 })],
        notes: 'Respaldo: reconoce el límite y propón el estudio longitudinal como siguiente paso.' },
    ]), INK));
  } },

  // 3 · Enfermería: revisión sistemática sobre educación sanitaria e insuficiencia cardiaca.
  sci_thesis_nurse: { name: 'Defensa de TFG: Enfermería', cat: 'sci', summary: 'Presentación de defensa del trabajo de fin de grado de Enfermería, una revisión sistemática: portada, el problema en una cifra, pregunta PICO, estrategia de búsqueda, diagrama de flujo PRISMA, tabla de estudios incluidos, resultados en gráfico, calidad de la evidencia (GRADE), propuesta de cuidados, conclusiones y diapositivas de respaldo para las preguntas del tribunal, con notas y tiempos', make: () => {
    const BG = '#f3f9f8', TEAL = '#0f7d72', NAVY = '#1d3557', RED = '#d64550', AMBER = '#e9a23b', INK = '#1b2a33', GREY = '#5a6b72', LINE = '#d3e3e0', FOOT = '#6f8389', H = pairStacks('clean').heading;
    const art = svgURL(330, 400, `<path d="M165 340 C 60 260 20 200 20 140 C 20 90 60 55 105 55 C 135 55 155 72 165 92 C 175 72 195 55 225 55 C 270 55 310 90 310 140 C 310 200 270 260 165 340 Z" fill="${RED}"/>`
      + `<polyline points="40,180 110,180 130,140 150,230 172,110 192,200 206,180 290,180" fill="none" stroke="#ffffff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`
      + `<rect x="235" y="250" width="70" height="70" rx="14" fill="${TEAL}"/><rect x="262" y="262" width="16" height="46" rx="3" fill="#ffffff"/><rect x="247" y="277" width="46" height="16" rx="3" fill="#ffffff"/>`);
    // A box of the PRISMA flow diagram.
    const box = (html, x, y, w, h, col, bg = '#ffffff') => on(card(html, x, y, w, h, bg, { color: INK, radius: 10, borderColor: col, fontSize: 20, pad: [10, 14, 10, 14], textAlign: 'center' }), 'fade-in');
    return numbered(ink(build({ name: 'Defensa de TFG: Enfermería', palette: 'forest', fonts: 'clean', title: { size: 42, color: NAVY }, body: { color: INK },
      decor: footer('Universidad de Ejemplo · Facultad de Enfermería · Trabajo de Fin de Grado 2026', LINE, TEAL, FOOT) }, [
      { layout: 'blank', bg: BG, back: [shape('rect', 0, 0, 24, 720, TEAL), glow(1050, -100, 560, RED, BG, 10)], transition: 'fade', extra: [
        kicker('TRABAJO DE FIN DE GRADO · ENFERMERÍA', 90, 110, 760, deep(TEAL, BG)),
        text('Educación sanitaria enfermera y adherencia al tratamiento en la insuficiencia cardiaca: una revisión sistemática', 86, 150, 760, 290, { fontFamily: H, fontSize: 44, fontWeight: 700, color: NAVY, lineHeight: 1.15 }),
        shape('rect', 90, 455, 90, 4, RED),
        text('<b>Autora:</b> Irene Campos Vidal<br><b>Tutora:</b> Dra. Rosa Medina Lago<br>Universidad de Ejemplo · Junio de 2026', 90, 480, 760, 130, { fontSize: 22, color: INK, lineHeight: 1.55 }),
        after(img(art, 880, 150, 330, 400, 'Un corazón con un trazo de electrocardiograma y una cruz sanitaria'), 'fade-left', { duration: 800 })],
        notes: '≈30 s. Saluda y presenta el trabajo: una revisión sistemática sobre el papel de la enfermera. Nombres y universidad son de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [
        kicker('EL PROBLEMA', 90, 120, 600, deep(RED, BG)),
        text(`<div style="font-family:${H};font-size:140px;font-weight:700;line-height:1;color:${NAVY}">64 millones</div>`, 84, 160, 1100, 180),
        text('de personas viven con insuficiencia cardiaca en el mundo.', 90, 350, 700, 100, { fontSize: 30, color: INK, lineHeight: 1.35 }),
        text('Fuente: Global Burden of Disease Study 2017 (The Lancet, 2018).', 90, 460, 700, 40, { fontSize: 18, color: GREY }),
        on(card(`<b style="color:${deep(TEAL, '#ffffff')}">No seguir el tratamiento</b> —la medicación, la dieta, el control del peso— es una de las causas evitables de reingreso.`, 830, 330, 360, 250, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: TEAL, pad: [22, 24, 20, 24] }), 'fade-left')],
        notes: '≈1 min. La cifra de prevalencia es real (GBD 2017). Une el problema con lo que puede hacer la enfermera: educar.' },
      { title: 'La pregunta, en formato PICO', layout: 'titleOnly', bg: BG, extra: [
        ...[['P · Pacientes', 'Adultos con insuficiencia cardiaca crónica', NAVY], ['I · Intervención', 'Educación sanitaria estructurada dirigida por enfermeras', TEAL], ['C · Comparación', 'Atención habitual', AMBER], ['O · Resultados', 'Adherencia al tratamiento y reingresos', RED]]
          .map(([t, d, col], i) => on(card(`<b style="font-size:26px;color:${deep(col, '#ffffff')}">${t}</b><br><span style="font-size:21px">${d}</span>`, 90 + (i % 2) * 560, 180 + Math.floor(i / 2) * 175, 530, 155, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')),
        text('¿Mejora la educación enfermera la adherencia y reduce los reingresos frente a la atención habitual?', 90, 545, 1100, 70, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: '≈1 min. El formato PICO es el estándar para formular preguntas clínicas: cada letra, una parte de la pregunta.' },
      { title: 'Estrategia de búsqueda', layout: 'titleOnly', bg: BG, extra: [
        ...['PubMed', 'CINAHL', 'Scopus', 'Biblioteca Cochrane'].map((d, i) => on(card(`<b>${d}</b>`, 90 + i * 280, 175, 250, 64, '#ffffff', { color: NAVY, radius: 32, borderColor: TEAL, fontSize: 22, pad: [12, 16, 12, 16], textAlign: 'center' }), 'fade-up')),
        codeBlock({ x: 90, y: 270, w: 1100, h: 150, lang: 'plaintext', fontSize: 21,
          code: '("heart failure") AND ("nursing education" OR "patient education")\nAND ("medication adherence" OR "readmission")' }),
        text('Ensayos clínicos aleatorizados · 2015-2025 · inglés y español. Debajo: los criterios de inclusión y exclusión.', 90, 445, 1100, 70, { fontSize: 21, color: GREY })],
        notes: '≈1 min. Cuatro bases de datos reales y la ecuación con los operadores booleanos. Si preguntan por los criterios, baja al respaldo.' },
      { title: 'Respaldo · criterios', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        tableBlock({ x: 90, y: 185, w: 1100, h: 300, fontSize: 21, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE, banded: true, band: TEAL,
          rows: [['Inclusión', 'Exclusión'], ['Ensayos clínicos aleatorizados', 'Estudios observacionales y revisiones'], ['Adultos con insuficiencia cardiaca', 'Pacientes pediátricos o en cuidados paliativos'], ['Educación dirigida por enfermeras', 'Intervenciones solo farmacológicas'], ['Mide adherencia o reingresos', 'Sin texto completo disponible']] })],
        notes: 'Respaldo: justifica cada criterio si te lo piden.' },
      { title: 'Selección de estudios · diagrama PRISMA', layout: 'titleOnly', bg: BG, extra: [
        ...['Identificación', 'Cribado', 'Elegibilidad', 'Incluidos'].map((t, i) => text(`<b>${t}</b>`, 90, 197 + i * 110, 200, 36, { fontSize: 19, color: deep(TEAL, BG) })),
        box('Registros identificados<br><b>842</b>', 320, 180, 420, 70, NAVY),
        box('Registros cribados<br><b>611</b>', 320, 290, 420, 70, NAVY),
        box('Textos completos evaluados<br><b>63</b>', 320, 400, 420, 70, NAVY),
        box('Estudios incluidos<br><b>12</b>', 320, 510, 420, 70, TEAL, '#e3f3f0'),
        ...[250, 360, 470].map(y => shape('rect', 528, y, 4, 40, '#9fb4b1')),
        ...[[215, 'Duplicados eliminados: <b>231</b>'], [325, 'Excluidos por título y resumen: <b>548</b>'], [435, 'Excluidos: <b>51</b> (población 22, intervención 17, diseño 12)']]
          .map(([y, t]) => [shape('rect', 740, y, 70, 4, '#9fb4b1'), box(t, 810, y - 33, 380, 70, RED)]).flat(),
        text('Según PRISMA 2020 (Page y otros, 2021) · datos de ejemplo.', 320, 595, 870, 36, { fontSize: 18, color: GREY })],
        notes: '≈1,5 min. Recorre el embudo de arriba abajo. PRISMA 2020 es la guía real; los números son de ejemplo (cuadran: 842 − 231 = 611, etc.).' },
      { title: 'Estudios incluidos', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 175, w: 1100, h: 330, fontSize: 19, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE, banded: true, band: TEAL,
          rows: [['Estudio', 'País', 'n', 'Intervención', 'Adherencia'], ['Estudio 1 (2018)', 'España', '210', '3 sesiones + llamadas', '↑ significativa'], ['Estudio 2 (2019)', 'Italia', '164', 'Enfermera de enlace', '↑ significativa'], ['Estudio 3 (2020)', 'EE. UU.', '320', 'Telemonitorización', '↑ significativa'], ['Estudio 4 (2022)', 'China', '188', 'Material educativo', 'Sin diferencias'], ['Estudio 5 (2023)', 'Brasil', '142', 'Visitas a domicilio', '↑ significativa']] }),
        text('5 de los 12 estudios incluidos · nombres y datos de ejemplo: sustitúyelos por los de tu revisión.', 90, 520, 1100, 40, { fontSize: 19, color: GREY })],
        notes: '≈1 min. No leas la tabla: señala el patrón (casi todos mejoran) y la excepción.' },
      { title: 'Resultados · adherencia', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 90, y: 175, w: 760, h: 450, chartType: 'bar', color: TEAL, grid: true, yTitle: '% de pacientes adherentes', seriesName: 'Educación enfermera',
          data: [{ label: 'Est. 1', value: 78 }, { label: 'Est. 2', value: 81 }, { label: 'Est. 3', value: 74 }, { label: 'Est. 4', value: 69 }, { label: 'Est. 5', value: 83 }],
          series: [{ name: 'Atención habitual', color: AMBER, values: [61, 63, 58, 66, 59] }] }),
        takeaway(`<b style="font-size:28px;color:${deep(TEAL, '#ffffff')}">9 de 12</b><br>estudios: mejor adherencia con educación enfermera, de +12 a +24 puntos.`, 880, 200, 310, 250, TEAL, INK),
        text('Datos de ejemplo.', 880, 475, 310, 40, { fontSize: 18, color: GREY })],
        notes: '≈2 min. La conclusión primero. El estudio 4 (solo material escrito) no mejora: lo que funciona es el contacto con la enfermera.' },
      { title: 'Calidad de la evidencia · GRADE', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 260, fontSize: 22, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE,
          rows: [['Resultado', 'Estudios', 'Efecto', 'Certeza'], ['Adherencia', '12', 'Mejora', 'Moderada'], ['Reingresos', '7', 'Reducción', 'Baja'], ['Calidad de vida', '5', 'Mejora leve', 'Baja']],
          cellBg: { '1,3': '#d7efe9', '2,3': '#fdf0d8', '3,3': '#fdf0d8' } }),
        text('Debajo: el riesgo de sesgo de cada estudio (herramienta RoB 2 de Cochrane).', 90, 465, 1100, 40, { fontSize: 20, color: GREY })],
        notes: '≈1 min. GRADE es el sistema estándar para valorar la certeza de la evidencia. Explica por qué en reingresos es baja: pocos estudios y resultados distintos.' },
      { title: 'Respaldo · riesgo de sesgo (RoB 2)', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        tableBlock({ x: 90, y: 185, w: 1100, h: 300, fontSize: 20, header: true, headBg: NAVY, headFg: '#ffffff', stroke: LINE,
          rows: [['Estudio', 'Aleatorización', 'Desviaciones', 'Datos perdidos', 'Medición', 'Global'], ['Estudio 1', 'Bajo', 'Bajo', 'Bajo', 'Algunas dudas', 'Algunas dudas'], ['Estudio 2', 'Bajo', 'Bajo', 'Bajo', 'Bajo', 'Bajo'], ['Estudio 3', 'Bajo', 'Algunas dudas', 'Bajo', 'Bajo', 'Algunas dudas'], ['Estudio 4', 'Algunas dudas', 'Alto', 'Bajo', 'Algunas dudas', 'Alto']],
          cellBg: { '1,4': '#fdf0d8', '1,5': '#fdf0d8', '2,5': '#d7efe9', '3,2': '#fdf0d8', '3,5': '#fdf0d8', '4,1': '#fdf0d8', '4,2': '#f9dadd', '4,4': '#fdf0d8', '4,5': '#f9dadd' } }),
        text('Datos de ejemplo.', 90, 505, 1100, 36, { fontSize: 18, color: GREY })],
        notes: 'Respaldo: si preguntan por la calidad de los estudios. Los dominios son los de RoB 2.' },
      { title: 'Propuesta de cuidados', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Valoración inicial\n  conocimientos y apoyo familiar\nEducación en 3 sesiones\n  medicación, dieta y signos de alarma\nMétodo teach-back\n  el paciente lo explica con sus palabras\nSeguimiento telefónico\n  a las 2, 4 y 8 semanas\nEvaluación\n  adherencia y reingresos a los 3 meses',
          90, 180, 1100, 400, { colors: 'colorful' })],
        notes: '≈1,5 min. Traduce la evidencia a un plan que la enfermera pueda aplicar mañana. El teach-back es una técnica real y muy recomendada.' },
      { title: 'Limitaciones y líneas futuras', layout: 'titleOnly', bg: BG, extra: [
        on(card(`<b style="font-size:26px;color:${deep(RED, '#ffffff')}">Limitaciones</b>` + ul('Medidas de adherencia distintas en cada estudio', 'Seguimientos cortos, casi siempre de 6 meses o menos', 'Solo estudios en inglés y español'), 90, 180, 530, 380, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: RED, pad: [24, 26, 22, 26] }), 'fade-up'),
        on(card(`<b style="font-size:26px;color:${deep(TEAL, '#ffffff')}">Líneas futuras</b>` + ul('Un ensayo con la propuesta en un hospital de la zona', 'Seguimiento a un año', 'Incluir a la familia cuidadora'), 660, 180, 530, 380, '#ffffff', { color: INK, fontSize: 22, radius: 16, borderColor: TEAL, pad: [24, 26, 22, 26] }), 'fade-up')],
        notes: '≈1 min. Las limitaciones de una revisión son, sobre todo, las de los estudios que incluye.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 400, 520, TEAL, BG, 14)], extra: [
        kicker('CONCLUSIÓN', 90, 130, 600, deep(TEAL, BG)),
        text('La educación sanitaria dirigida por enfermeras mejora la adherencia al tratamiento en la insuficiencia cardiaca, con una certeza moderada.', 84, 170, 1100, 230, { fontFamily: H, fontSize: 42, fontWeight: 700, color: NAVY, lineHeight: 1.18 }),
        ...cards([['Lo que funciona', 'El contacto con la enfermera, no solo el folleto.', TEAL], ['Reingresos', 'Tienden a bajar, con evidencia aún baja.', AMBER], ['Para la práctica', 'Una propuesta de cuidados lista para probar.', RED]], { y: 425, h: 180, ts: 24, ds: 20 })],
        notes: '≈1 min. Responde a la pregunta PICO con una frase y su nivel de certeza.' },
      { layout: 'blank', bg: NAVY, back: [glow(1050, -100, 560, TEAL, NAVY, 30)], transition: 'fade', extra: [
        text('¿Preguntas?', 84, 190, 760, 140, { fontFamily: H, fontSize: 96, fontWeight: 700, color: '#ffffff' }),
        text('Gracias al tribunal y a mi tutora.<br>Irene Campos Vidal · icampos@ejemplo.edu', 90, 350, 760, 110, { fontSize: 26, color: '#cfe3df', lineHeight: 1.5 }),
        timer(600, 930, 200, 270, { color: '#8fd6cb', endText: 'Fin del turno' }),
        text('Turno de preguntas', 900, 490, 330, 40, { fontSize: 20, color: '#cfe3df', textAlign: 'center' })],
        notes: '≈30 s. Debajo, el respaldo para una pregunta habitual: ¿por qué no hay metaanálisis?' },
      { title: 'Respaldo · ¿por qué no un metaanálisis?', layout: 'titleOnly', bg: BG, vertical: true, extra: [
        ...cards([['Medidas distintas', 'Cada estudio mide la adherencia a su manera: no se pueden sumar.', RED], ['Intervenciones distintas', 'De un folleto a visitas a domicilio: no son comparables.', AMBER], ['Lo que se hizo', 'Una síntesis narrativa con la certeza de GRADE.', TEAL]], { y: 190, h: 330, ts: 24, ds: 21 })],
        notes: 'Respaldo: la heterogeneidad es la razón más honesta y habitual.' },
    ]), INK));
  } },

};
