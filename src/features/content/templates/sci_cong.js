// Example presentations: defensas de trabajos académicos con el mapa de los congresos (cuatro). Cada una, de unas veinte
// diapositivas: portada con un modelo 3D, el problema, el método, los resultados con su conclusión escrita al lado, la
// parte final que casi todos los trabajos llevan (asistencia a congresos, con el mapa que vuela de uno a otro, y
// publicaciones derivadas) y, DEBAJO (diapositivas verticales), respuestas a las preguntas previsibles del tribunal.
// Nombres, universidades, revistas y datos inventados y marcados como ejemplo; los lugares, reales (y los modelos 3D,
// de la NASA o de la biblioteca de Revela, con su crédito). Las piezas comunes están en phdkit.js.

import { build, text, card, shape, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, base, deep, pairStacks, model, lib3d } from './kit.js';
import { svgURL, img, on, after, label, tcard, takeaway, section, backup, sample, sat, mapBlock } from './phdkit.js';

const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A model of Revela's own library, with its credit (they ask for it).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const creditOf = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label.replace(/ \(.*\)/, '') + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 56, { fontSize: 11, color, lineHeight: 1.25 });
// A closing «Gracias» and a stop of the map with a note (the note shows when the map arrives there).
const stop = (name, lon, lat, cc, note, zoom = 5.2) => ({ name, lon, lat, zoom, cc, note });
const bar = (t, y, x = 30, w = 760, bg = '#0b1620d9') => text(t, x, y, w, 56, { fontSize: 22, color: '#ffffff', bg, radius: 12, pad: [8, 16, 8, 16], vAlign: 'middle' });

export default {

  // 1 · TFG de Ingeniería Aeroespacial: un nanosatélite universitario.
  sci_cong_eng: { name: 'Defensa de TFG: Ingeniería aeroespacial', cat: 'sci',
    summary: 'Defensa de un trabajo de fin de grado de Ingeniería Aeroespacial sobre un nanosatélite universitario: portada con un CubeSat en 3D, una cifra, objetivos, requisitos y subsistemas, el satélite en 3D, presupuestos de masa y de energía, ensayos de vibración, térmicos y de radio con sus resultados, conclusiones, asistencia a congresos con el mapa que vuela de uno a otro, publicaciones, respaldos para el tribunal y notas con los tiempos',
    make: () => {
      const PAPER = '#f4f6f8', INK = '#121a22', NIGHT = '#0d1620', ORG = '#ff7a1a', BLUE = '#2f80ed', MINT = '#2fb67c', RED = '#d64545', GREY = '#566370', DIMT = '#a9b8c6';
      const H = pairStacks('modern').heading;
      const foot = () => [text('Universidad de Ejemplo · Escuela de Ingeniería Aeroespacial · Grado en Ingeniería Aeroespacial · Trabajo de Fin de Grado 2026', 84, 684, 1112, 24, { fontSize: 13, color: GREY, textAlign: 'right' })];
      // Four rings and a cube outline: the cover's drawing behind the model.
      const grid = () => svgURL(520, 520, [80, 140, 200, 250].map((r, i) => `<circle cx="260" cy="260" r="${r}" fill="none" stroke="#2f80ed" stroke-opacity="${0.45 - i * 0.08}" stroke-width="2" stroke-dasharray="${4 + i * 3} 8"/>`).join(''));
      return numbered(ink(build({ name: 'Defensa de TFG: Ingeniería aeroespacial', palette: 'midnight', fonts: 'modern', title: { color: INK, size: 40 }, body: { color: INK }, decor: foot }, [
        // 1 · Cover
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(660, -100, 760, BLUE, NIGHT, 50),
          img(grid(), 660, 100, 560, 560, 'Órbitas dibujadas alrededor del satélite'),
          sat('cubesat-2-ru-generic', 690, 150, 500, 460, { spin: 20, view: 'three' }),
          label('TFG · INGENIERÍA AEROESPACIAL', 90, 120, 640, '#9fc4f5'),
          text('UniCube-1: diseño, construcción y ensayo de un nanosatélite universitario de 2U', 86, 160, 600, 300, { fontFamily: H, fontSize: 44, fontWeight: 800, color: '#ffffff', lineHeight: 1.12 }),
          shape('rect', 90, 490, 90, 4, ORG),
          text('<b>Autor:</b> Álvaro Navarro Gil<br><b>Tutores:</b> Dra. Marta Ibáñez Roca · Dr. Iván Soler Prat<br>Universidad de Ejemplo · Junio de 2026', 90, 515, 640, 130, { fontSize: 20, color: '#e3ecf5', lineHeight: 1.55 })],
          notes: '≈30 s. Saluda al tribunal y presenta el proyecto con una frase: «He diseñado y ensayado un satélite del tamaño de dos bricks de leche». Nombres y universidad de ejemplo.' },
        // 2 · The figure
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          label('EL PROYECTO, EN UNA CIFRA', 90, 130, 600, '#9fc4f5'),
          text('2,6 kg', 80, 170, 700, 200, { fontFamily: H, fontSize: 170, fontWeight: 800, color: ORG, lineHeight: 1 }),
          text('es todo lo que pesa un satélite completo: energía, radio, ordenador, control de orientación y una carga útil que mide el campo magnético terrestre', 90, 400, 600, 190, { fontSize: 28, color: '#ffffff', lineHeight: 1.35 }),
          sample(90, 610, 400, DIMT),
          sat('cubesat-1-ru-generic', 730, 130, 460, 440, { spin: 16, view: 'low' }),
          after(text('10 × 10 × 22 cm: «2U», dos unidades de un CubeSat.', 730, 585, 460, 60, { fontSize: 21, color: '#9fc4f5', textAlign: 'center' }), 'fade-up')],
          notes: '≈45 s. Empieza por la cifra: un satélite entero en 2,6 kg. Después, la pregunta del trabajo.' },
        // 3 · Question and objectives
        { title: 'Pregunta y objetivos', layout: 'titleOnly', bg: PAPER, extra: [
          on(card('¿Puede un equipo de estudiantes diseñar un satélite de 2U que cumpla los requisitos de un lanzamiento real?', 90, 175, 1100, 130, BLUE, { color: '#ffffff', fontSize: 30, radius: 16, pad: [24, 30, 24, 30], fontFamily: H, fontWeight: 700 }), 'zoom-in'),
          ...[['1 · Diseñar', 'Un satélite de 2U de menos de 2,66 kg con cuatro subsistemas.', BLUE], ['2 · Ensayar', 'Vibración, vacío térmico y enlace de radio, como exige el lanzador.', ORG], ['3 · Verificar', 'Comprobar con números que cumple todos los requisitos.', MINT]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 340, 350, 240, c, { ts: 26, ds: 21 }), 'fade-up'))],
          notes: '≈1 min. Pregunta, tres objetivos con un verbo cada uno: diseñar, ensayar, verificar. Cada resultado empezará diciendo a cuál responde.' },
        // 4 · Context
        { title: 'Por qué los nanosatélites', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: BLUE, dataLabels: true, grid: true, yTitle: 'Nanosatélites lanzados',
            data: [2014, 2016, 2018, 2020, 2022, 2024].map((y, i) => ({ label: String(y), value: [92, 101, 328, 475, 842, 1030][i], color: i > 3 ? ORG : BLUE })) }),
          after(takeaway('×11', 'más nanosatélites al año en una década: el espacio se ha abaratado y las universidades ya participan.', 850, 190, 340, 290, ORG), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Contexto en una idea: lanzar es cada vez más barato y los CubeSats permiten que un equipo universitario llegue al espacio. Datos aproximados y de ejemplo.' },
        // 5 · Subsystems
        { title: 'Cuatro subsistemas en 22 centímetros', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Energía', 'Paneles solares y baterías: 9 W de generación media.', ORG], ['Comunicaciones', 'Radio en UHF a 9 600 bit/s y antena desplegable.', BLUE], ['Control', 'Magnetopares y sensores: apuntar con un error de 5°.', MINT], ['Carga útil', 'Un magnetómetro de tres ejes para el campo terrestre.', RED]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + (i % 2) * 560, 180 + Math.floor(i / 2) * 215, 530, 195, c, { ts: 27, ds: 21 }), 'fade-up')),
          text('Cada subsistema se diseñó con un margen del 20 % sobre el requisito.', 90, 615, 1100, 44, { fontSize: 22, color: GREY, textAlign: 'center' })],
          notes: '≈1 min. Los cuatro subsistemas con una cifra cada uno. No entres en detalle: eso viene con el satélite en 3D.' },
        // 6 · The model in 3D
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, BLUE, NIGHT, 38),
          label('EL SATÉLITE POR FUERA', 90, 130, 520, '#9fc4f5'),
          text('Un cubo de 10 × 10 × 22 cm', 86, 170, 520, 150, { fontFamily: H, fontSize: 46, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }),
          ...['Cuatro caras con paneles solares', 'Antena de UHF plegada, se despliega en órbita', 'Carga útil en el extremo, lejos de la electrónica'].map((t, i) => on(text(`<b style="color:${ORG}">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 360 + i * 70, 560, 62, { fontSize: 22, color: '#e3ecf5', lineHeight: 1.3 }), 'fade-up')),
          sat('cubesat-icecube', 680, 80, 560, 560, { spin: 14, view: 'three' })],
          notes: '≈1,5 min. El modelo 3D es un CubeSat real de la NASA (ICECube): se gira con el ratón. Señala las tres decisiones de diseño que explican las cifras de después.' },
        // 7 · Mass budget
        { title: 'Presupuesto de masa: 2,41 kg de 2,66', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 760, h: 330, fontSize: 21, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#cfd9e3', banded: true, band: BLUE,
            rows: [['Subsistema', 'Masa (g)', 'Margen'], ['Estructura', '480', '10 %'], ['Energía', '690', '15 %'], ['Comunicaciones', '350', '15 %'], ['Control y ordenador', '520', '20 %'], ['Carga útil', '370', '20 %']] }),
          after(takeaway('250 g', 'de margen libre: el 9 % de la masa máxima que permite el lanzador.', 880, 190, 310, 250, MINT), 'fade-up'),
          sample(880, 460, 310, GREY)],
          notes: '≈1 min. Objetivo 1. Lo importante no es la tabla, sino el margen: 250 g libres frente al límite. Datos de ejemplo.' },
        // 8 · Power budget
        { title: 'Presupuesto de energía', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: BLUE, dataLabels: true, grid: true, yTitle: 'Potencia (W)', seriesName: 'Generada',
            data: [{ label: 'Reposo', value: 9.0 }, { label: 'Medida', value: 9.0 }, { label: 'Transmisión', value: 9.0 }],
            series: [{ name: 'Consumida', color: ORG, values: [2.1, 5.4, 8.2] }] }),
          after(takeaway('+0,8 W', 'de margen en el peor caso: transmitir con la antena desplegada y las baterías al 80 %.', 850, 190, 340, 290, MINT), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Objetivo 1. En cada modo, la generación (azul) supera al consumo (naranja). El caso límite es transmitir.' },
        // 9 · The tests
        { title: 'Tres ensayos, como un lanzamiento real', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Vibración\n  Simula el despegue\nVacío térmico\n  De −20 a +60 °C\nEnlace de radio\n  Alcance y velocidad\nFuncional\n  Todo encendido', 90, 190, 1100, 230, { color: INK }),
          after(text('Todos los ensayos se hicieron en el laboratorio de la universidad, con un modelo de vuelo completo.', 90, 470, 1100, 100, { fontSize: 24, color: GREY, textAlign: 'center', lineHeight: 1.4 }), 'fade-up')],
          notes: '≈45 s. Objetivo 2: cuatro ensayos en cadena. Cada uno tiene su resultado en las tres diapositivas siguientes.' },
        // 10 · R1 vibration
        { title: 'Resultado 1 · Aguanta el despegue', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: BLUE, grid: true, xTitle: 'Frecuencia (Hz)', yTitle: 'Aceleración (g)', seriesName: 'Antes del ensayo',
            data: [20, 60, 100, 140, 180, 220, 260].map((f, i) => ({ label: String(f), value: [0.4, 0.9, 3.8, 1.2, 0.8, 0.5, 0.3][i] })),
            series: [{ name: 'Después del ensayo', color: ORG, values: [0.4, 0.9, 3.7, 1.2, 0.8, 0.5, 0.3] }] }),
          after(takeaway('141 → 140 Hz', 'cambió la frecuencia natural tras la vibración: sin daños (el límite es del 5 %).', 850, 190, 340, 290, MINT), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Si después de vibrar la frecuencia natural es casi la misma, no se ha aflojado nada. Datos de ejemplo.' },
        // 11 · R2 thermal
        { title: 'Resultado 2 · Soporta el frío y el calor del espacio', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: BLUE, grid: true, xTitle: 'Horas de ensayo', yTitle: 'Temperatura de las baterías (°C)', seriesName: 'Medida',
            data: [0, 2, 4, 6, 8, 10, 12].map((h, i) => ({ label: String(h), value: [20, 38, 12, 41, 9, 40, 11][i] })),
            series: [{ name: 'Límite inferior', color: RED, values: [0, 0, 0, 0, 0, 0, 0] }] }),
          after(takeaway('9 °C', 'fue lo más frío que llegaron las baterías: 9 grados por encima del límite de 0 °C.', 850, 190, 340, 290, MINT), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Seis ciclos de calor y frío en vacío. Las baterías son lo más delicado: nunca bajaron de su límite.' },
        // 12 · R3 radio
        { title: 'Resultado 3 · Se oye a 1 200 km', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 760, h: 300, fontSize: 21, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#cfd9e3', banded: true, band: BLUE,
            rows: [['Prueba', 'Requisito', 'Medido'], ['Potencia de salida', '≥ 0,5 W', '0,8 W'], ['Velocidad', '9 600 bit/s', '9 600 bit/s'], ['Margen del enlace', '≥ 3 dB', '6,2 dB'], ['Errores de bits', '< 1 %', '0,2 %']] }),
          after(takeaway('6,2 dB', 'de margen en el enlace: el doble de lo exigido para hablar con la estación en tierra.', 880, 190, 310, 290, MINT), 'fade-up'),
          sample(880, 510, 310, GREY)],
          notes: '≈1 min. Objetivo 3: cumplimiento con números. Una columna de requisito, una de medida, y todo en verde.' },
        // 13 · Conclusions
        { layout: 'blank', bg: BLUE, transition: 'zoom', extra: [
          label('CONCLUSIONES', 90, 110, 600, '#cfe2ff'),
          text('Un equipo de estudiantes puede diseñar y ensayar un satélite que cumple los requisitos de un lanzamiento real.', 84, 150, 1100, 210, { fontFamily: H, fontSize: 48, fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }),
          ...['2,41 kg de 2,66 y energía de sobra en el peor caso', 'Supera vibración, vacío térmico y enlace de radio', 'Todo el diseño y los ensayos, abiertos para el próximo equipo']
            .map((t, i) => on(text(`<b style="color:${NIGHT}">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 410 + i * 62, 1100, 54, { fontSize: 27, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. La idea que quieres que el tribunal recuerde y tres conclusiones, una por objetivo.' },
        // 14 · Congress map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', route: 'arc', curve: 2, showAll: true, past: 'dim', marker: { kind: 'number', color: ORG, size: 1.2 }, pulse: 'cur', flyMs: 4500 }, [
            stop('Madrid', -3.7038, 40.4168, 'es', 'Jornadas nacionales de Ingeniería Aeroespacial · 2025 · Póster: el diseño del satélite'),
            stop('Delft', 4.3571, 52.0116, 'nl', 'Taller europeo de CubeSats · 2025 · Comunicación oral: los ensayos de vibración'),
            stop('Toulouse', 1.4442, 43.6047, 'fr', 'Congreso de pequeños satélites · 2025 · Póster con el modelo de vuelo'),
            stop('Estocolmo', 18.0686, 59.3293, 'se', 'Encuentro de estudiantes de espacio · 2026 · Charla invitada'),
            stop('Turín', 7.6869, 45.0703, 'it', 'Congreso de astronáutica para jóvenes · 2026 · Premio al mejor trabajo de grado', 5.6)]),
          bar('<b>Asistencia a congresos</b> · cinco ciudades en Europa', 640)],
          notes: '≈1,5 min. El mapa vuela de congreso en congreso, un clic cada vez, y en cada parada sale lo que presentaste. Participaciones de ejemplo: pon las tuyas.' },
        // 15 · Congress table
        { title: 'Congresos en los que he participado', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 340, fontSize: 20, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#cfd9e3', banded: true, band: BLUE,
            rows: [['Año', 'Congreso', 'Lugar', 'Participación'], ['2025', 'Jornadas nacionales de Ingeniería Aeroespacial', 'Madrid', 'Póster'], ['2025', 'Taller europeo de CubeSats', 'Delft', 'Comunicación oral'], ['2025', 'Congreso de pequeños satélites', 'Toulouse', 'Póster'], ['2026', 'Encuentro de estudiantes de espacio', 'Estocolmo', 'Charla invitada'], ['2026', 'Congreso de astronáutica para jóvenes', 'Turín', 'Comunicación oral (premio)']] }),
          sample(90, 540, 600, GREY)],
          notes: '≈45 s. La misma lista por escrito. Una frase: «presenté el proyecto en cinco foros y los comentarios mejoraron el diseño».' },
        // 16 · Publications and merits
        { title: 'Publicaciones y otros méritos', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['2025', 'Diseño de un nanosatélite 2U de bajo coste con componentes comerciales', 'Revista de Ingeniería Espacial · Coautor', BLUE], ['2026', 'Ensayos de vibración y vacío térmico en un laboratorio universitario', 'Actas del Taller de CubeSats · Primer autor', ORG]]
            .map(([y, t, j, c], i) => on(card(`<span style="font-size:19px;color:${deep(c, '#ffffff')};font-weight:700">${y}</span><br><b style="font-size:22px">${t}</b><br><span style="font-size:18px;color:${GREY}">${j}</span>`, 90, 170 + i * 120, 1100, 106, '#ffffff', { color: INK, radius: 12, borderColor: c, pad: [10, 20, 8, 20], fontSize: 20 }), 'fade-up')),
          ...[['Beca de colaboración', 'Dos años en el laboratorio de pequeños satélites.', MINT], ['Premio', 'Mejor trabajo de grado en el congreso de Turín (2026).', RED]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 560, 430, 530, 150, c, { ts: 24, ds: 20 }), 'fade-up')),
          sample(90, 610, 600, GREY)],
          notes: '≈1 min. Dos publicaciones, una beca y un premio, todo ficticio: adapta a tu caso.' },
        // 17 · Thanks
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, BLUE, NIGHT, 40),
          text('Gracias', 84, 130, 700, 140, { fontFamily: H, fontSize: 100, fontWeight: 800, color: '#ffffff' }),
          text('¿Preguntas?', 90, 290, 700, 70, { fontSize: 42, color: ORG }),
          text('A mis tutores, al laboratorio de pequeños satélites y a todo el equipo que lo soldó, lo atornilló y lo ensayó conmigo.', 90, 400, 560, 140, { fontSize: 24, color: '#e3ecf5', lineHeight: 1.45 }),
          sat('cubesat-2-ru-generic', 680, 100, 520, 440, { spin: 12, view: 'three' }),
          timer(600, 1080, 540, 110, { color: ORG, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 10 minutos para el turno de preguntas. Escucha hasta el final y, si tienes una diapositiva de respaldo, bájala.' },
        // 18-19 · Backup
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Por qué 2U y no 3U, que cabe más?', BLUE, '#ffffff'),
          tableBlock({ x: 84, y: 200, w: 1110, h: 250, fontSize: 21, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#cfd9e3', banded: true, band: BLUE,
            rows: [['', '2U', '3U'], ['Masa máxima', '2,66 kg', '4 kg'], ['Coste del lanzamiento', 'Base', '+45 %'], ['Plazo de construcción', '8 meses', '12 meses']] }),
          text('Con 2U cabían los cuatro subsistemas y la carga útil, con margen, a la mitad del coste y a tiempo para el curso.', 84, 480, 1110, 90, { fontSize: 22, color: INK, lineHeight: 1.4 })],
          notes: 'Respaldo: ábrela solo si preguntan. Mensaje: elegí 2U por coste y plazo, no por falta de ambición.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Y la radiación? ¿Aguantaría una misión real?', RED, '#ffffff'),
          tcard('Lo que he comprobado', 'Componentes con historial de vuelo y una órbita baja a 500 km, donde la dosis es pequeña: cumple una misión de un año.', 84, 210, 540, 250, MINT),
          tcard('Lo que no he medido', 'No hay ensayo de radiación propio. Para dos años de misión, haría falta una prueba con protones en un acelerador.', 654, 210, 540, 250, RED)],
          notes: 'Respaldo: reconoce lo que falta antes de que lo señalen. Es una línea futura natural.' },
      ]), INK));
    } },

  // 2 · TFM de Historia: la medida del tiempo en las ciudades europeas.
  sci_cong_hum: { name: 'Defensa de TFM: Humanidades (Historia)', cat: 'sci',
    summary: 'Defensa de un trabajo de fin de máster de Historia sobre cómo los relojes públicos cambiaron la vida de las ciudades europeas: portada con un cronógrafo en 3D, una fecha como gancho, pregunta y fuentes, método de archivo, mapa de la difusión de los relojes, resultados con gráficos, discusión, conclusiones, congresos con el mapa que vuela de uno a otro, publicaciones, respaldos para el tribunal y notas con los tiempos',
    make: () => {
      const PAPER = '#f6efe3', INK = '#2b1d14', BURG = '#7a2b2b', GOLD = '#b8892b', SEPIA = '#8c6a43', BLUE = '#2f5d7c', NIGHT = '#241913', GREY = '#6a5a4c', DIMT = '#cdbba3';
      const H = pairStacks('classic').heading;
      const foot = () => [text('Universidad de Ejemplo · Facultad de Geografía e Historia · Máster en Historia de Europa · Trabajo de Fin de Máster 2026', 84, 684, 1112, 24, { fontSize: 13, color: GREY, textAlign: 'right' })];
      // A dial drawn by us behind the model: the hours as ticks.
      const dial = () => svgURL(520, 520, `<circle cx="260" cy="260" r="240" fill="none" stroke="#b8892b" stroke-opacity=".5" stroke-width="3"/><circle cx="260" cy="260" r="205" fill="none" stroke="#b8892b" stroke-opacity=".3" stroke-width="2"/>`
        + Array.from({ length: 12 }, (_, i) => `<line x1="260" y1="30" x2="260" y2="${i % 3 ? 52 : 70}" stroke="#b8892b" stroke-opacity=".6" stroke-width="${i % 3 ? 3 : 6}" transform="rotate(${i * 30} 260 260)"/>`).join(''));
      return numbered(ink(build({ name: 'Defensa de TFM: Humanidades (Historia)', palette: 'paper', fonts: 'classic', title: { color: BURG, size: 42 }, body: { color: INK }, decor: foot }, [
        // 1 · Cover
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(640, -100, 760, GOLD, NIGHT, 40),
          img(dial(), 680, 100, 540, 540, 'Una esfera de reloj dibujada'),
          m3d('kh-ChronographWatch', 700, 140, 500, 460, { autoRotate: true, spin: 16, view: 'three', edge: 'fade' }),
          label('TRABAJO DE FIN DE MÁSTER · HISTORIA DE EUROPA', 90, 110, 640, '#e3c27a'),
          text('Las horas de la ciudad: cómo los relojes públicos cambiaron la vida cotidiana en la Europa de 1300 a 1800', 86, 150, 600, 320, { fontFamily: H, fontSize: 42, fontWeight: 700, color: '#fff8ec', lineHeight: 1.15 }),
          shape('rect', 90, 490, 90, 3, GOLD),
          text('<b>Autora:</b> Sara Beltrán Quiroga<br><b>Director:</b> Dr. Tomás Escudero Paz<br>Universidad de Ejemplo · Junio de 2026', 90, 515, 600, 120, { fontSize: 20, color: '#efe4d2', lineHeight: 1.55 }),
          creditOf(['kh-ChronographWatch'], 90, 628, 520, DIMT)],
          notes: '≈30 s. Saluda al tribunal y empieza por la pregunta cotidiana: «¿Desde cuándo miramos la hora?». Nombres y universidad de ejemplo.' },
        // 2 · The date
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          label('UNA FECHA PARA EMPEZAR', 90, 130, 600, '#e3c27a'),
          text('1335', 80, 170, 700, 210, { fontFamily: H, fontSize: 190, fontWeight: 700, color: '#e3c27a', lineHeight: 1 }),
          text('Una ciudad italiana instala uno de los primeros relojes públicos que da las horas con una campana. Dos siglos después, casi ninguna ciudad grande vive sin uno.', 90, 400, 620, 190, { fontSize: 27, color: '#fff8ec', lineHeight: 1.4 }),
          sample(90, 610, 500, DIMT),
          after(text('Antes de eso, el día lo marcaban las campanas de la iglesia: salir el sol, mediodía, ponerse el sol.', 740, 200, 450, 220, { fontSize: 24, color: '#e3c27a', lineHeight: 1.45, fontStyle: 'italic' }), 'fade-up')],
          notes: '≈1 min. El contraste: antes, el tiempo de la Iglesia (horas desiguales según la estación); después, el tiempo de la ciudad (horas iguales). Fecha aproximada, de ejemplo.' },
        // 3 · Question
        { title: 'Pregunta, hipótesis y objetivos', layout: 'titleOnly', bg: PAPER, extra: [
          on(card('¿Qué cambió en la vida de las personas cuando la ciudad empezó a medir las horas con un reloj público?', 90, 175, 1100, 130, BURG, { color: '#ffffff', fontSize: 29, radius: 16, pad: [24, 30, 24, 30], fontFamily: H, fontWeight: 700 }), 'zoom-in'),
          after(tcard('Hipótesis', 'El reloj no solo medía el tiempo: lo convirtió en una norma que fijaba cuándo trabajar, comerciar y rezar.', 90, 330, 1100, 120, GOLD), 'fade-up'),
          ...[['Recoger', 'Fuentes de archivo de seis ciudades.', BLUE], ['Cartografiar', 'Cuándo y dónde llegaron los relojes.', SEPIA], ['Explicar', 'Qué normas nuevas aparecen con ellos.', BURG]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 480, 350, 150, c, { ts: 25, ds: 20 }), 'fade-up'))],
          notes: '≈1,5 min. Pregunta, hipótesis y tres objetivos: recoger, cartografiar, explicar. Cada resultado empezará diciendo a cuál responde.' },
        // 4 · Timeline of the clock
        { title: 'Lo que ya se sabía', layout: 'titleOnly', bg: PAPER, extra: [
          dg('timeline', '1335\n  Primeros relojes públicos con campana\n1410\n  El reloj astronómico de Praga empieza a marcar las horas\n1657\n  Huygens aplica el péndulo: los relojes dejan de adelantar o atrasar\n1761\n  Harrison termina el cronómetro marino\n1884\n  La Conferencia del Meridiano fija el tiempo universal', 90, 180, 1100, 400, { color: INK }),
          sample(90, 610, 500, GREY)],
          notes: '≈1,5 min. Cinco hitos conocidos. Lo que falta es lo que hace tu trabajo: qué pasó en la vida de la gente de la ciudad. Fechas aproximadas.' },
        // 5 · Sources
        { title: 'Las fuentes: seis ciudades y 1 800 documentos', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: BURG, dataLabels: true, grid: true, yTitle: 'Documentos del corpus',
            data: [{ label: 'Milán', value: 410, color: BURG }, { label: 'Praga', value: 350, color: GOLD }, { label: 'Londres', value: 330, color: BLUE }, { label: 'Sevilla', value: 280, color: SEPIA }, { label: 'Cracovia', value: 240, color: BURG }, { label: 'Coímbra', value: 190, color: GOLD }] }),
          after(takeaway('1 800', 'ordenanzas, cuentas y diarios de seis ciudades entre 1300 y 1800, transcritos y puestos en una base de datos.', 850, 190, 340, 320, BURG), 'fade-up'),
          sample(850, 530, 340, GREY)],
          notes: '≈1 min. Objetivo 1. Seis ciudades elegidas por tener archivo continuo. Mensaje: el corpus es grande y comparable. Datos de ejemplo.' },
        // 6 · Method
        { title: 'Cómo he trabajado', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Archivos\n  Seis ciudades\nTranscripción\n  1 800 documentos\nBase de datos\n  Fecha, lugar, norma\nMapa\n  Cuándo llega el reloj\nAnálisis\n  Qué cambia después', 90, 190, 1100, 230, { color: INK }),
          after(text('Cada documento se etiquetó con la ciudad, la fecha y el tipo de norma: horarios de trabajo, mercados, puertas de la muralla y oficios religiosos.', 90, 470, 1100, 110, { fontSize: 24, color: GREY, textAlign: 'center', lineHeight: 1.45 }), 'fade-up')],
          notes: '≈1 min. Método de archivo en cinco pasos. Si el tribunal pregunta por los sesgos de las fuentes, hay respaldo.' },
        // 7 · 3D object as source
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(-120, 80, 640, GOLD, NIGHT, 30),
          m3d('kh-ChronographWatch', 40, 70, 560, 560, { autoRotate: true, spin: 14, view: 'three', edge: 'fade' }),
          label('EL OBJETO COMO FUENTE', 700, 130, 520, '#e3c27a'),
          text('Del reloj de torre al de bolsillo', 696, 170, 520, 150, { fontFamily: H, fontSize: 44, fontWeight: 700, color: '#fff8ec', lineHeight: 1.12 }),
          text('Cuando el reloj cabe en la mano, el tiempo deja de ser público y pasa a ser personal. Es el último paso del proceso que estudio.', 700, 340, 500, 200, { fontSize: 23, color: '#efe4d2', lineHeight: 1.45 }),
          after(text('Cronógrafo (siglo XX): una de las piezas que muestro en la exposición del trabajo.', 700, 560, 500, 70, { fontSize: 19, color: '#e3c27a', lineHeight: 1.35 }), 'fade-up'),
          creditOf(['kh-ChronographWatch'], 40, 628, 560, DIMT)],
          notes: '≈1 min. Una pausa visual: el objeto en 3D, que se gira con el ratón. Úsalo para recordar que la tesis habla de objetos y de personas.' },
        // 8 · R1 map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', route: 'arc', curve: 1.6, marker: { kind: 'pin', color: '#e3c27a', size: 1.2 }, pulse: 'cur', past: 'dim', flyMs: 4200 }, [
            { ...stop('Milán', 9.19, 45.4642, 'it', 'Milán: reloj público con campana desde 1335 (corpus de ejemplo).', 4.6), zoom: 4.6 },
            stop('Praga', 14.4378, 50.0755, 'cz', 'Praga: el reloj de la torre da las horas desde 1410.', 5.2), stop('Londres', -0.1276, 51.5072, 'gb', 'Londres: ordenanzas que citan «la hora del reloj» hacia 1480.', 5.2),
            stop('Sevilla', -5.9845, 37.3891, 'es', 'Sevilla: el reloj de la catedral organiza los mercados hacia 1400.', 5.2), stop('Cracovia', 19.9449, 50.0647, 'pl', 'Cracovia: la plaza del mercado se rige por el reloj desde 1500.', 5.2)]),
          bar('<b>Resultado 1 · La difusión de los relojes</b> · un clic, una ciudad', 640, 30, 760, '#241913d9')],
          notes: '≈2 min. Objetivo 2. El mapa vuela de ciudad en ciudad: dónde y cuándo llegó el reloj público. Las fechas son del corpus de ejemplo: pon las de tu investigación.' },
        // 9 · R2 norms
        { title: 'Resultado 2 · Las normas que dependen del reloj', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: BURG, grid: true, xTitle: 'Siglo', yTitle: 'Ordenanzas que fijan la hora (%)', seriesName: 'Horarios de trabajo',
            data: ['XIV', 'XV', 'XVI', 'XVII', 'XVIII'].map((c, i) => ({ label: c, value: [2, 9, 24, 46, 71][i] })),
            series: [{ name: 'Mercados y puertas', color: GOLD, values: [3, 12, 31, 52, 68] }] }),
          after(takeaway('2 % → 71 %', 'de las ordenanzas de trabajo citan una hora del reloj entre el siglo XIV y el XVIII.', 850, 190, 340, 290, BURG), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1,5 min. Objetivo 3. De casi nada a casi todo: el reloj se vuelve la medida de las normas. Datos de ejemplo.' },
        // 10 · R3 daily life
        { title: 'Resultado 3 · Una vida con horario', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Antes: las campanas', 'Trabajar «de sol a sol», comerciar «a mediodía», cerrar la puerta «al anochecer».', SEPIA], ['Después: el reloj', 'Entrar a las seis, parar a la una, abrir el mercado a las ocho en punto.', BURG], ['El efecto', 'La puntualidad se vuelve virtud: llegar tarde pasa a ser una falta con multa.', BLUE]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 190, 350, 320, c, { ts: 26, ds: 21 }), 'fade-up')),
          text('Una de las multas más antiguas del corpus: un maestro cantero por llegar tarde a la obra.', 90, 550, 1100, 50, { fontSize: 22, color: GREY, textAlign: 'center' }), sample(90, 620, 400, GREY)],
          notes: '≈1,5 min. Lo más humano del trabajo: tres escenas. Si tienes un documento concreto que ilustre la multa, enséñalo aquí.' },
        // 11 · Discussion
        { title: 'Discusión', layout: 'titleOnly', bg: PAPER, extra: [
          on(tcard('Coincide con lo publicado', 'La medida del tiempo y la disciplina del trabajo van unidas desde antes de la industria: aquí se ve en las ciudades.', 90, 190, 530, 220, BLUE), 'fade-up'),
          on(tcard('Lo que aporta este trabajo', 'Un corpus comparado de seis ciudades y un mapa de fechas que antes estaba disperso.', 660, 190, 530, 220, GOLD), 'fade-up'),
          text('La idea de fondo: antes de ser una máquina, el reloj fue una forma de gobernar.', 90, 450, 1100, 110, { fontFamily: H, fontSize: 30, color: INK, lineHeight: 1.4, textAlign: 'center' })],
          notes: '≈1,5 min. Relaciona con la bibliografía clásica sin citas largas. Destaca lo nuevo: la comparación entre ciudades.' },
        // 12 · Conclusions
        { layout: 'blank', bg: BURG, transition: 'zoom', extra: [
          label('CONCLUSIONES', 90, 110, 600, '#f0d8b0'),
          text('El reloj público convirtió el tiempo en una norma que gobernaba la ciudad.', 84, 150, 1100, 210, { fontFamily: H, fontSize: 52, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }),
          ...['Se difundió de ciudad en ciudad en menos de dos siglos', 'Las ordenanzas pasaron de casi 0 a casi todas citar la hora', 'La puntualidad nació como obligación antes que como virtud']
            .map((t, i) => on(text(`<b style="color:#f0d8b0">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 410 + i * 62, 1100, 54, { fontSize: 27, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. Tres conclusiones, una por objetivo.' },
        // 13 · Congress map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', route: 'arc', curve: 2, showAll: true, past: 'dim', marker: { kind: 'number', color: '#e3c27a', size: 1.2 }, pulse: 'cur', flyMs: 4500 }, [
            stop('Coímbra', -8.4292, 40.2033, 'pt', 'Jornadas de jóvenes historiadores · 2025 · Comunicación oral'), stop('Bolonia', 11.3426, 44.4949, 'it', 'Congreso de historia urbana · 2025 · Comunicación oral'),
            stop('Praga', 14.4378, 50.0755, 'cz', 'Seminario de historia de la ciencia · 2025 · Póster y visita al reloj astronómico'), stop('Cracovia', 19.9449, 50.0647, 'pl', 'Congreso europeo de historia moderna · 2026 · Ponencia'),
            stop('Oxford', -1.2577, 51.752, 'gb', 'Coloquio sobre la historia del tiempo · 2026 · Ponencia invitada')]),
          bar('<b>Asistencia a congresos</b> · cinco sedes en Europa', 640, 30, 760, '#241913d9')],
          notes: '≈1,5 min. El mapa vuela de congreso en congreso. En Praga, la visita al reloj astronómico: una anécdota que gusta. Participaciones de ejemplo.' },
        // 14 · Congress table
        { title: 'Congresos en los que he participado', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 340, fontSize: 20, header: true, headBg: BURG, headFg: '#ffffff', stroke: '#dccdb4', banded: true, band: BURG,
            rows: [['Año', 'Congreso', 'Lugar', 'Participación'], ['2025', 'Jornadas de jóvenes historiadores', 'Coímbra', 'Comunicación oral'], ['2025', 'Congreso de historia urbana', 'Bolonia', 'Comunicación oral'], ['2025', 'Seminario de historia de la ciencia', 'Praga', 'Póster'], ['2026', 'Congreso europeo de historia moderna', 'Cracovia', 'Ponencia'], ['2026', 'Coloquio sobre la historia del tiempo', 'Oxford', 'Ponencia invitada']] }),
          sample(90, 540, 600, GREY)],
          notes: '≈45 s. La lista por escrito. Una frase: «presenté el trabajo en cinco foros y las preguntas me hicieron afinar el argumento».' },
        // 15 · Publications
        { title: 'Publicaciones y otros méritos', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['2025', 'Las horas de la ciudad: relojes públicos en seis archivos europeos', 'Revista de Historia Urbana de Ejemplo · Primera autora', BURG], ['2026', 'La multa por llegar tarde: puntualidad y disciplina en la ciudad moderna', 'Anuario de Historia Moderna de Ejemplo · Primera autora', GOLD]]
            .map(([y, t, j, c], i) => on(card(`<span style="font-size:19px;color:${deep(c, '#ffffff')};font-weight:700">${y}</span><br><b style="font-size:22px">${t}</b><br><span style="font-size:18px;color:${GREY}">${j}</span>`, 90, 170 + i * 120, 1100, 106, '#ffffff', { color: INK, radius: 12, borderColor: c, pad: [10, 20, 8, 20], fontSize: 20 }), 'fade-up')),
          ...[['Estancia', 'Dos meses en el archivo de Praga con una beca de movilidad (2025).', BLUE], ['Exposición', 'Muestra de relojes y documentos en la biblioteca de la facultad (2026).', SEPIA]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 560, 430, 530, 150, c, { ts: 24, ds: 20 }), 'fade-up')),
          sample(90, 610, 600, GREY)],
          notes: '≈1 min. Dos artículos, una estancia y una exposición, todo ficticio: adapta a tu caso.' },
        // 16 · Thanks
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, GOLD, NIGHT, 30),
          text('Gracias', 84, 130, 700, 140, { fontFamily: H, fontSize: 100, fontWeight: 700, color: '#fff8ec' }),
          text('¿Preguntas?', 90, 290, 700, 70, { fontSize: 42, color: '#e3c27a' }),
          text('A mi director, a las archiveras y archiveros de seis ciudades y a quien me esperó con la comida fría mientras leía ordenanzas.', 90, 400, 560, 150, { fontSize: 24, color: '#efe4d2', lineHeight: 1.45 }),
          m3d('kh-ChronographWatch', 700, 100, 480, 440, { autoRotate: true, spin: 12, view: 'three', edge: 'fade' }),
          creditOf(['kh-ChronographWatch'], 90, 628, 520, DIMT),
          timer(600, 1080, 540, 110, { color: GOLD, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 10 minutos para el turno de preguntas. Escucha hasta el final y, si tienes una diapositiva de respaldo, bájala.' },
        // 17-18 · Backup
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿No habrá sesgo? Solo sobreviven los archivos de las ciudades ricas', BURG, '#ffffff'),
          tcard('Cómo lo controlé', 'Elegí ciudades de tamaño y riqueza distintos (de Cracovia a Londres) y comparé solo series continuas dentro de cada archivo.', 84, 210, 540, 250, BLUE),
          tcard('Lo que no puedo descartar', 'Lo que se perdió: archivos quemados o aún sin catalogar. Por eso hablo de «lo documentado», no de «todo lo que pasó».', 654, 210, 540, 250, BURG)],
          notes: 'Respaldo: la pregunta clásica sobre fuentes. Responde con lo que controlaste y reconoce lo que no.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Por qué empezar en 1300 y acabar en 1800?', GOLD, '#ffffff'),
          tcard('El principio', 'Hacia 1300 aún no hay relojes mecánicos públicos: sirve de punto de comparación con el mundo de las campanas.', 84, 210, 540, 250, GOLD),
          tcard('El final', 'En 1800 el reloj ya está en la mano y empieza otro proceso, el de la fábrica, que merece otra investigación.', 654, 210, 540, 250, SEPIA)],
          notes: 'Respaldo: justifica el marco cronológico. La fábrica es una línea futura natural.' },
      ]), INK));
    } },

  // 3 · TFG de Enfermería: un robot social en una residencia de mayores.
  sci_cong_nurse: { name: 'Defensa de TFG: Enfermería', cat: 'sci',
    summary: 'Defensa de un trabajo de fin de grado de Enfermería sobre un robot social contra la soledad en una residencia de mayores: portada con un robot en 3D que saluda, una cifra, pregunta, diseño del estudio y ética, el robot que responde con sus gestos, resultados con gráficos, discusión, conclusiones para la práctica, congresos con el mapa que vuela de uno a otro, publicaciones, respaldos para el tribunal y notas con los tiempos',
    make: () => {
      const PAPER = '#f1f8f7', INK = '#12302f', TEAL = '#0f8b8d', CORAL = '#e4572e', SUN = '#f0a92e', NAVY = '#1c3f5f', MINT = '#4fb58e', GREY = '#587170', NIGHT = '#0d2a2b', DIMT = '#a8cfcd';
      const H = pairStacks('editorial').heading;
      const clip = (name, props = {}) => A('clip3d', { clip: name, once: true, duration: 1600, ...props });
      const foot = () => [text('Universidad de Ejemplo · Facultad de Enfermería · Grado en Enfermería · Trabajo de Fin de Grado 2026', 84, 684, 1112, 24, { fontSize: 13, color: GREY, textAlign: 'right' })];
      // Soft circles behind the robot, like a warm room's light.
      const glowArt = () => svgURL(520, 520, [240, 190, 140].map((r, i) => `<circle cx="260" cy="270" r="${r}" fill="#f0a92e" fill-opacity="${0.1 + i * 0.05}"/>`).join(''));
      return numbered(ink(build({ name: 'Defensa de TFG: Enfermería', palette: 'forest', fonts: 'editorial', title: { color: INK, size: 40 }, body: { color: INK }, decor: foot }, [
        // 1 · Cover
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          img(glowArt(), 660, 110, 560, 560, 'Círculos de luz cálida detrás del robot'),
          withAnims(m3d('three-RobotExpressive', 700, 120, 460, 520, { clip: 'Idle', bleed: 1.3, view: 'front' }), clip('Wave', { start: 'afterPrev', delay: 600 })),
          label('TRABAJO DE FIN DE GRADO · ENFERMERÍA', 90, 120, 600, '#8fe0d9'),
          text('Compañía que se mueve: un robot social frente a la soledad de las personas mayores en una residencia', 86, 160, 580, 320, { fontFamily: H, fontSize: 42, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }),
          shape('rect', 90, 500, 90, 4, SUN),
          text('<b>Autora:</b> Noelia Ferrándiz Soto<br><b>Tutora:</b> Dra. Carmen Olmedo Reyes<br>Universidad de Ejemplo · Junio de 2026', 90, 525, 600, 120, { fontSize: 20, color: '#dff1ef', lineHeight: 1.55 }),
          creditOf(['three-RobotExpressive'], 700, 628, 520, DIMT)],
          notes: '≈30 s. Saluda al tribunal. El robot te saluda a ti: es un modelo 3D que levanta la mano al empezar. Nombres y universidad de ejemplo.' },
        // 2 · The figure
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          label('EL PROBLEMA, EN UNA CIFRA', 90, 130, 600, '#8fe0d9'),
          text('1 de cada 3', 80, 170, 690, 170, { fontFamily: H, fontSize: 108, fontWeight: 700, color: SUN, lineHeight: 1 }),
          text('personas mayores que viven en una residencia dice sentirse sola a menudo, aunque nunca esté sin gente alrededor', 90, 370, 640, 190, { fontSize: 29, color: '#ffffff', lineHeight: 1.4 }),
          sample(90, 610, 400, DIMT),
          after(text('La soledad no es estar solo: es sentirse sin compañía.', 810, 220, 380, 160, { fontSize: 25, color: '#8fe0d9', lineHeight: 1.45, fontStyle: 'italic' }), 'fade-up')],
          notes: '≈45 s. Empieza por la cifra y por la diferencia entre estar solo y sentirse solo. Dato de ejemplo.' },
        // 3 · Question
        { title: 'Pregunta, hipótesis y objetivos', layout: 'titleOnly', bg: PAPER, extra: [
          on(card('¿Reduce la soledad de las personas mayores una compañía robótica durante ocho semanas?', 90, 175, 1100, 120, TEAL, { color: '#ffffff', fontSize: 30, radius: 16, pad: [24, 30, 24, 30], fontFamily: H, fontWeight: 700 }), 'zoom-in'),
          after(tcard('Hipótesis', 'El grupo con robot puntuará menos soledad que el grupo sin él al final del estudio.', 90, 320, 1100, 110, SUN), 'fade-up'),
          ...[['Medir', 'La soledad antes y después, con una escala validada.', NAVY], ['Observar', 'Cómo cambian el ánimo y la actividad semana a semana.', TEAL], ['Escuchar', 'Qué opinan las personas residentes y el personal.', CORAL]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 460, 350, 170, c, { ts: 25, ds: 20 }), 'fade-up'))],
          notes: '≈1,5 min. Pregunta, hipótesis y tres objetivos: medir, observar, escuchar.' },
        // 4 · Context chart
        { title: 'La soledad es un problema de salud', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: TEAL, dataLabels: true, grid: true, yTitle: 'Personas que se sienten solas (%)',
            data: [{ label: '65–74 años', value: 14, color: TEAL }, { label: '75–84 años', value: 21, color: TEAL }, { label: '85 o más', value: 29, color: CORAL }, { label: 'En residencia', value: 34, color: CORAL }] }),
          after(takeaway('34 %', 'de personas en residencia se sienten solas, más del doble que entre los 65 y los 74 años.', 850, 190, 340, 290, CORAL), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Contexto: la soledad aumenta con la edad y es mayor en residencias. Datos aproximados y de ejemplo.' },
        // 5 · Study design
        { title: 'Cómo se hizo el estudio', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Selección\n  48 personas\nConsentimiento\n  Firmado por cada una\nAzar\n  24 con robot, 24 sin\nOcho semanas\n  Sesiones de 30 minutos\nMedición\n  Antes y después', 90, 190, 1100, 230, { color: INK }),
          after(text('Estudio con grupo de control: la única diferencia entre los dos grupos es la compañía del robot.', 90, 470, 1100, 100, { fontSize: 24, color: GREY, textAlign: 'center', lineHeight: 1.4 }), 'fade-up')],
          notes: '≈1 min. Diseño en cinco pasos. Insiste en el grupo de control: es lo que permite decir que el cambio se debe al robot.' },
        // 6 · The robot, 3D with clips
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: (() => {
          const r1 = 'r1', robot = withAnims(m3d('three-RobotExpressive', 40, 70, 520, 560, { clip: 'Idle', bleed: 1.3, view: 'front' }), clip('Wave', { start: 'click' }), clip('Yes', { start: 'click' }), clip('ThumbsUp', { start: 'click' }));
          return [glow(-100, 80, 640, TEAL, NIGHT, 35), robot,
            label('EL ROBOT', 640, 120, 500, '#8fe0d9'),
            text('Un compañero que responde con gestos', 636, 160, 560, 150, { fontFamily: H, fontSize: 40, fontWeight: 700, color: '#ffffff', lineHeight: 1.12 }),
            ...[['Saluda', 'al llegar la persona a la sesión.'], ['Asiente', 'mientras ella cuenta algo.'], ['Anima', 'con el pulgar arriba al terminar.']].map(([t, d], i) => on(text(`<b style="color:${SUN}">${t}</b> ${d}`, 640, 340 + i * 80, 560, 70, { fontSize: 24, color: '#e6f4f2', lineHeight: 1.35 }), 'fade-up')),
            creditOf(['three-RobotExpressive'], 40, 628, 560, DIMT)]; })(),
          notes: '≈1,5 min. Cada clic hace que el robot haga un gesto (saluda, asiente, anima) y aparece su explicación. El robot del estudio fue otro, comercial; este modelo 3D solo ilustra la idea.' },
        // 7 · Sample
        { title: 'Quiénes participaron', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 480, h: 430, chartType: 'doughnut', color: TEAL, dataLabels: true,
            data: [{ label: 'Con robot', value: 24, color: TEAL }, { label: 'Sin robot', value: 24, color: SUN }] }),
          after(takeaway('48', 'personas de 72 a 94 años (edad media, 83) en dos residencias.', 620, 190, 570, 190, NAVY), 'fade-up'),
          after(tcard('Quién quedó fuera', 'Personas con deterioro cognitivo avanzado o con una enfermedad aguda en el periodo del estudio.', 620, 400, 570, 180, CORAL), 'fade-up'),
          sample(620, 600, 400, GREY)],
          notes: '≈45 s. Muestra pequeña y bien descrita: 48 personas, dos grupos iguales. Datos de ejemplo.' },
        // 8 · Ethics
        { title: 'Ética y consentimiento', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Comité de ética', 'Aprobado por el comité de la universidad antes de empezar.', NAVY], ['Consentimiento', 'Cada persona (o su familia) firmó tras una explicación sencilla.', TEAL], ['Se puede dejar', 'Quien lo pidió dejó el estudio sin tener que explicar nada.', CORAL]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 190, 350, 320, c, { ts: 26, ds: 21 }), 'fade-up')),
          text('Los datos se guardaron con un código, sin nombres.', 90, 550, 1100, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
          notes: '≈1 min. Tres garantías. Si el tribunal pregunta por el comité, el número de aprobación está en el documento (en este ejemplo, inventado).' },
        // 9 · R1 loneliness
        { title: 'Resultado 1 · La soledad baja con el robot', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: TEAL, dataLabels: true, grid: true, yTitle: 'Escala de soledad (20–80)', seriesName: 'Antes',
            data: [{ label: 'Con robot', value: 52 }, { label: 'Sin robot', value: 51 }],
            series: [{ name: 'Después', color: CORAL, values: [41, 50] }] }),
          after(takeaway('−11 puntos', 'bajó la soledad en el grupo con robot, frente a −1 en el grupo sin él.', 850, 190, 340, 290, TEAL), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1,5 min. Objetivo 1. Mismo punto de partida (52 y 51); al final, 41 frente a 50. La diferencia es estadísticamente significativa (p < 0,01) en el ejemplo.' },
        // 10 · R2 mood
        { title: 'Resultado 2 · El ánimo mejora semana a semana', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: TEAL, grid: true, xTitle: 'Semana', yTitle: 'Ánimo (1–10)', seriesName: 'Con robot',
            data: [1, 2, 3, 4, 5, 6, 7, 8].map((w, i) => ({ label: String(w), value: [5.1, 5.4, 5.9, 6.3, 6.8, 7.0, 7.3, 7.4][i] })),
            series: [{ name: 'Sin robot', color: SUN, values: [5.0, 5.1, 5.1, 5.2, 5.1, 5.3, 5.2, 5.2] }] }),
          after(takeaway('+2,3', 'puntos de ánimo en ocho semanas con robot, frente a +0,2 sin él.', 850, 190, 340, 260, TEAL), 'fade-up'),
          sample(850, 470, 340, GREY)],
          notes: '≈1 min. Objetivo 2. El ánimo sube casi cada semana con robot y se queda plano sin él.' },
        // 11 · R3 voices
        { title: 'Resultado 3 · Lo que dicen las personas', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['«Me hace reír»', 'Residente, 86 años', TEAL], ['«Se acuerda de mi nombre»', 'Residente, 79 años', CORAL], ['«Nos da tiempo para otras cosas»', 'Auxiliar de enfermería', NAVY]]
            .map(([q, who, c], i) => on(card(`<div style="font-family:${H};font-size:30px;font-weight:700;color:${deep(c, '#ffffff')};line-height:1.2">${q}</div><div style="font-size:20px;margin-top:12px;color:${GREY}">${who}</div>`, 90 + i * 375, 190, 350, 240, '#ffffff', { color: INK, radius: 14, borderColor: c, pad: [24, 24, 20, 24] }), 'fade-up')),
          after(takeaway('9 de 10', 'personas del grupo con robot volverían a repetir la experiencia.', 90, 460, 540, 170, TEAL), 'fade-up'),
          sample(660, 520, 400, GREY)],
          notes: '≈1 min. Objetivo 3: las voces. Frases del ejemplo, inventadas; en tu trabajo, las reales y anónimas.' },
        // 12 · Discussion
        { title: 'Discusión y limitaciones', layout: 'titleOnly', bg: PAPER, extra: [
          on(tcard('Coincide con lo publicado', 'Otros estudios con robots sociales encuentran efectos parecidos en la soledad, aunque con muestras aún pequeñas.', 90, 190, 530, 210, TEAL), 'fade-up'),
          on(tcard('Lo que aporta este trabajo', 'Un grupo de control y una escala validada, en dos residencias, con la opinión del personal.', 660, 190, 530, 210, SUN), 'fade-up'),
          card('<b style="font-size:24px">Limitaciones</b>' + ul('Solo ocho semanas de seguimiento', 'Dos residencias de una misma ciudad', 'Las personas sabían si tenían robot'), 90, 430, 1100, 200, '#ffffff', { color: INK, fontSize: 21, radius: 14, pad: [18, 24, 16, 24] })],
          notes: '≈1,5 min. Reconocer las limitaciones antes de que te las señalen. La tercera (no se puede ocultar el robot) es inevitable y conviene decirlo.' },
        // 13 · Conclusions
        { layout: 'blank', bg: TEAL, transition: 'zoom', extra: [
          label('CONCLUSIONES PARA LA PRÁCTICA', 90, 110, 800, '#d7f4f1'),
          text('Un robot social puede acompañar a las personas mayores, no sustituir a quien las cuida.', 84, 150, 1100, 210, { fontFamily: H, fontSize: 48, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }),
          ...['La soledad bajó 11 puntos en ocho semanas', 'Mejoró el ánimo y gustó a casi todo el mundo', 'El personal ganó tiempo para el cuidado más humano']
            .map((t, i) => on(text(`<b style="color:${NIGHT}">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 410 + i * 62, 1100, 54, { fontSize: 27, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. Tres conclusiones y una frase que importa: el robot acompaña, no sustituye.' },
        // 14 · Congress map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', route: 'arc', curve: 2, showAll: true, past: 'dim', marker: { kind: 'number', color: SUN, size: 1.2 }, pulse: 'cur', flyMs: 4500 }, [
            stop('Madrid', -3.7038, 40.4168, 'es', 'Congreso nacional de Enfermería · 2025 · Póster con los primeros resultados'), stop('Lisboa', -9.1393, 38.7223, 'pt', 'Congreso iberoamericano de Enfermería · 2025 · Comunicación oral'),
            stop('Glasgow', -4.2518, 55.8642, 'gb', 'Congreso europeo de Enfermería geriátrica · 2025 · Póster'), stop('Copenhague', 12.5683, 55.6761, 'dk', 'Jornadas nórdicas de tecnología y cuidados · 2026 · Comunicación oral'),
            stop('Ginebra', 6.1432, 46.2044, 'ch', 'Foro internacional de salud pública · 2026 · Ponencia invitada y premio al mejor trabajo')]),
          bar('<b>Asistencia a congresos</b> · cinco ciudades de Europa', 640, 30, 760, '#0d2a2bd9')],
          notes: '≈1,5 min. El mapa vuela de congreso en congreso, un clic cada vez. En cada parada sale lo que presentaste. Participaciones de ejemplo.' },
        // 15 · Congress table
        { title: 'Congresos en los que he participado', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 340, fontSize: 20, header: true, headBg: TEAL, headFg: '#ffffff', stroke: '#cfe3e1', banded: true, band: TEAL,
            rows: [['Año', 'Congreso', 'Lugar', 'Participación'], ['2025', 'Congreso nacional de Enfermería', 'Madrid', 'Póster'], ['2025', 'Congreso iberoamericano de Enfermería', 'Lisboa', 'Comunicación oral'], ['2025', 'Congreso europeo de Enfermería geriátrica', 'Glasgow', 'Póster'], ['2026', 'Jornadas nórdicas de tecnología y cuidados', 'Copenhague', 'Comunicación oral'], ['2026', 'Foro internacional de salud pública', 'Ginebra', 'Ponencia invitada (premio)']] }),
          sample(90, 540, 600, GREY)],
          notes: '≈45 s. La lista por escrito. Una frase: «llevé el estudio a cinco foros y las preguntas de otros profesionales mejoraron el análisis».' },
        // 16 · Publications
        { title: 'Publicaciones y otros méritos', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['2025', 'Un robot social contra la soledad en residencias: ensayo con grupo de control', 'Revista de Enfermería Geriátrica de Ejemplo · Primera autora', TEAL], ['2026', 'Voces de residentes y cuidadoras ante un robot de compañía', 'Cuidados y Tecnología de Ejemplo · Primera autora', CORAL]]
            .map(([y, t, j, c], i) => on(card(`<span style="font-size:19px;color:${deep(c, '#ffffff')};font-weight:700">${y}</span><br><b style="font-size:22px">${t}</b><br><span style="font-size:18px;color:${GREY}">${j}</span>`, 90, 170 + i * 120, 1100, 106, '#ffffff', { color: INK, radius: 12, borderColor: c, pad: [10, 20, 8, 20], fontSize: 20 }), 'fade-up')),
          ...[['Beca de colaboración', 'Un curso en el grupo de investigación en cuidados.', NAVY], ['Premio', 'Mejor trabajo de grado en el foro de Ginebra (2026).', SUN]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 560, 430, 530, 150, c, { ts: 24, ds: 20 }), 'fade-up')),
          sample(90, 610, 600, GREY)],
          notes: '≈1 min. Dos artículos, una beca y un premio, todo ficticio: adapta a tu caso.' },
        // 17 · Thanks
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, TEAL, NIGHT, 35),
          text('Gracias', 84, 130, 700, 140, { fontFamily: H, fontSize: 100, fontWeight: 700, color: '#ffffff' }),
          text('¿Preguntas?', 90, 290, 700, 70, { fontSize: 42, color: SUN }),
          text('A las personas que participaron, a sus familias, al personal de las dos residencias y a mi tutora.', 90, 400, 560, 140, { fontSize: 24, color: '#dff1ef', lineHeight: 1.45 }),
          withAnims(m3d('three-RobotExpressive', 700, 100, 420, 500, { clip: 'Idle', bleed: 1.3, view: 'front' }), clip('ThumbsUp', { start: 'afterPrev', delay: 800 })),
          creditOf(['three-RobotExpressive'], 90, 628, 520, DIMT),
          timer(600, 1080, 540, 110, { color: SUN, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 10 minutos para el turno de preguntas. El robot da el pulgar arriba. Escucha hasta el final y, si tienes una diapositiva de respaldo, bájala.' },
        // 18-19 · Backup
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Por qué un robot y no un peluche o un perro de terapia?', TEAL, '#ffffff'),
          tcard('Lo que aporta el robot', 'Responde a la persona (saluda, asiente) y no se cansa ni necesita cuidados; se puede usar en residencias sin animales.', 84, 210, 540, 250, TEAL),
          tcard('Lo que no sustituye', 'Un animal ofrece contacto físico y afecto que un robot no da. Son opciones complementarias, no rivales.', 654, 210, 540, 250, CORAL)],
          notes: 'Respaldo: ábrela solo si preguntan. Mensaje: no es una competición entre opciones.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Y si la persona tiene deterioro cognitivo?', NAVY, '#ffffff'),
          tcard('En este estudio', 'Quedaron fuera las personas con deterioro avanzado: no podían entender el consentimiento ni la escala de soledad.', 84, 210, 540, 250, NAVY),
          tcard('Línea futura', 'Probar con robots más sencillos y medir con la observación de una enfermera, no con una escala que se contesta.', 654, 210, 540, 250, TEAL)],
          notes: 'Respaldo: reconoce el límite y propón una línea futura concreta.' },
      ]), INK));
    } },

  // 4 · TFM de Economía: botellas retornables en el comercio de proximidad.
  sci_cong_econ: { name: 'Defensa de TFM: Economía circular', cat: 'sci',
    summary: 'Defensa de un trabajo de fin de máster de Economía sobre un sistema de botellas retornables en el comercio de barrio: portada con una botella en 3D, una cifra, pregunta, diseño del piloto con el mapa de los barrios, la botella que se reutiliza, resultados de emisiones, costes y devoluciones, discusión, conclusiones, foros internacionales con el mapa que vuela de uno a otro, publicaciones, respaldos para el tribunal y notas con los tiempos',
    make: () => {
      const PAPER = '#f6f5ee', INK = '#1b2b24', GREEN = '#2f7d4f', AMBER = '#e8a317', CLAY = '#c4572f', BLUE = '#2b6a8f', GREY = '#5c6b62', NIGHT = '#10261b', DIMT = '#b3cdbd', LEAF = '#7bc47f';
      const H = pairStacks('modern').heading;
      const foot = () => [text('Universidad de Ejemplo · Facultad de Economía y Empresa · Máster en Economía Circular · Trabajo de Fin de Máster 2026', 84, 684, 1112, 24, { fontSize: 13, color: GREY, textAlign: 'right' })];
      // A loop of arrows drawn behind the bottle: the cycle.
      const loop = () => svgURL(520, 520, `<circle cx="260" cy="260" r="215" fill="none" stroke="#7bc47f" stroke-opacity=".55" stroke-width="6" stroke-dasharray="40 24"/><circle cx="260" cy="260" r="165" fill="none" stroke="#7bc47f" stroke-opacity=".25" stroke-width="3"/>`
        + [[260, 45, 0], [475, 260, 90], [260, 475, 180], [45, 260, 270]].map(([x, y, r]) => `<path d="M-16 -12 L16 0 L-16 12 Z" fill="#7bc47f" transform="translate(${x} ${y}) rotate(${r})"/>`).join(''));
      return numbered(ink(build({ name: 'Defensa de TFM: Economía circular', palette: 'forest', fonts: 'modern', title: { color: INK, size: 40 }, body: { color: INK }, decor: foot }, [
        // 1 · Cover
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(640, -100, 760, GREEN, NIGHT, 55),
          img(loop(), 680, 100, 540, 540, 'Un ciclo de flechas verdes'),
          m3d('kh-WaterBottle', 790, 140, 340, 460, { autoRotate: true, spin: 16, view: 'three', edge: 'fade' }),
          label('TFM · ECONOMÍA CIRCULAR', 90, 120, 640, '#a6e0ac'),
          text('Del usar y tirar al ciclo cerrado: ¿sale a cuenta la botella retornable en el comercio de barrio?', 86, 160, 600, 320, { fontFamily: H, fontSize: 42, fontWeight: 800, color: '#ffffff', lineHeight: 1.12 }),
          shape('rect', 90, 500, 90, 4, AMBER),
          text('<b>Autor:</b> Gonzalo Peña Marín<br><b>Tutora:</b> Dra. Beatriz Montalbán Díez<br>Universidad de Ejemplo · Junio de 2026', 90, 525, 600, 120, { fontSize: 20, color: '#e3f1e7', lineHeight: 1.55 }),
          creditOf(['kh-WaterBottle'], 700, 628, 520, DIMT)],
          notes: '≈30 s. Saluda al tribunal. La pregunta, en voz alta: «¿y si la botella volviera a la tienda en lugar de a la basura?». Nombres y universidad de ejemplo.' },
        // 2 · The figure
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          label('EL PILOTO, EN UNA CIFRA', 90, 130, 600, '#a6e0ac'),
          text('−62 %', 80, 170, 800, 200, { fontFamily: H, fontSize: 170, fontWeight: 800, color: AMBER, lineHeight: 1 }),
          text('de emisiones por cada litro servido cuando la botella se reutiliza al menos 20 veces, frente a la de un solo uso', 90, 400, 640, 190, { fontSize: 28, color: '#ffffff', lineHeight: 1.4 }),
          sample(90, 610, 400, DIMT),
          m3d('kh-Avocado', 800, 170, 330, 330, { autoRotate: true, spin: 18, view: 'three', edge: 'fade' }),
          creditOf(['kh-Avocado'], 760, 628, 420, DIMT)],
          notes: '≈45 s. Empieza por la cifra. El aguacate (modelo 3D) es solo un guiño al comercio de barrio. Dato de ejemplo.' },
        // 3 · Question
        { title: 'Pregunta, hipótesis y objetivos', layout: 'titleOnly', bg: PAPER, extra: [
          on(card('¿A partir de cuántos usos compensa, en dinero y en emisiones, una botella retornable en un comercio de barrio?', 90, 175, 1100, 130, GREEN, { color: '#ffffff', fontSize: 29, radius: 16, pad: [24, 30, 24, 30], fontFamily: H, fontWeight: 800 }), 'zoom-in'),
          after(tcard('Hipótesis', 'A partir de unos 8 usos la botella retornable ya cuesta menos que la de un solo uso, aunque haya que lavarla.', 90, 330, 1100, 120, AMBER), 'fade-up'),
          ...[['Medir', 'Emisiones y costes de cada tipo de botella.', BLUE], ['Probar', 'Un piloto real en doce comercios de tres barrios.', GREEN], ['Calcular', 'El punto de equilibrio para el comercio.', CLAY]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 480, 350, 150, c, { ts: 25, ds: 20 }), 'fade-up'))],
          notes: '≈1,5 min. Pregunta, hipótesis y tres objetivos: medir, probar, calcular.' },
        // 4 · Context chart
        { title: 'El problema de partida', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: GREEN, dataLabels: true, grid: true, yTitle: 'Envases de bebida por persona y año',
            data: [{ label: '2000', value: 310 }, { label: '2008', value: 340 }, { label: '2016', value: 395 }, { label: '2024', value: 430, color: CLAY }].map(x => ({ color: GREEN, ...x })) }),
          after(takeaway('+39 %', 'más envases desechables por persona en 24 años, mientras los retornables casi desaparecen del comercio de barrio.', 850, 190, 340, 320, CLAY), 'fade-up'),
          sample(850, 530, 340, GREY)],
          notes: '≈1 min. Contexto: el envase de un solo uso gana terreno. Datos de ejemplo.' },
        // 5 · The cycle
        { title: 'El ciclo de una botella retornable', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Comprar\n  El comercio la compra una vez\nVender\n  Con un depósito de 0,25 €\nDevolver\n  La clienta la trae de vuelta\nLavar\n  En una planta de la zona\nReutilizar\n  Vuelve a la estantería', 90, 190, 1100, 230, { color: INK }),
          after(text('Un ciclo cerrado: lo que hoy se tira, mañana se vuelve a llenar. El depósito es lo que lo hace funcionar.', 90, 470, 1100, 100, { fontSize: 24, color: GREY, textAlign: 'center', lineHeight: 1.4 }), 'fade-up')],
          notes: '≈1 min. El ciclo en cinco pasos; el depósito es el incentivo. El siguiente apartado enseña la botella en 3D.' },
        // 6 · The bottle 3D
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(-100, 80, 640, GREEN, NIGHT, 38),
          m3d('kh-WaterBottle', 60, 70, 480, 560, { autoRotate: true, spin: 14, view: 'three', edge: 'fade' }),
          label('LA BOTELLA', 640, 130, 500, '#a6e0ac'),
          text('Más cara al principio, más barata al final', 636, 170, 560, 170, { fontFamily: H, fontSize: 40, fontWeight: 800, color: '#ffffff', lineHeight: 1.12 }),
          ...[['1,10 €', 'cuesta la botella retornable', AMBER], ['0,12 €', 'cuesta la de un solo uso', LEAF], ['25 usos', 'es lo que aguanta antes de reciclarla', '#ffffff']].map(([n, t, c], i) => on(text(`<b style="font-size:34px;color:${c}">${n}</b> <span style="font-size:22px;color:#e3f1e7">${t}</span>`, 640, 370 + i * 70, 570, 62, { lineHeight: 1.2 }), 'fade-up')),
          creditOf(['kh-WaterBottle'], 60, 628, 480, DIMT)],
          notes: '≈1 min. El modelo 3D (se gira con el ratón) ilustra la idea: más cara al comprarla, más barata por uso si se reutiliza muchas veces. Costes de ejemplo.' },
        // 7 · Pilot map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'map', theme: 'dark', route: 'arc', curve: 1.2, marker: { kind: 'pin', color: AMBER, size: 1.2 }, pulse: 'cur', past: 'dim', flyMs: 3800 }, [
            { ...stop('Valencia', -0.3763, 39.4699, 'es', 'Tres barrios de Valencia, doce comercios: panaderías, fruterías y bares.', 12.5) },
            stop('Ruzafa', -0.3744, 39.4604, 'es', 'Ruzafa: cinco comercios; la zona con más bares.', 14.4), stop('El Carmen', -0.3813, 39.4786, 'es', 'El Carmen: cuatro comercios; mucho turismo y poco retorno.', 14.4),
            stop('Benimaclet', -0.3569, 39.4891, 'es', 'Benimaclet: tres comercios; barrio de vecinos que se conocen.', 14.4)]),
          bar('<b>El piloto</b> · un clic, un barrio', 640, 30, 560, '#10261bd9')],
          notes: '≈1,5 min. El mapa pasa de la ciudad a los tres barrios del piloto. En cada uno, cuántos comercios y qué lo distingue. Datos de ejemplo.' },
        // 8 · R1 emissions
        { title: 'Resultado 1 · Menos emisiones desde el octavo uso', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: GREEN, grid: true, xTitle: 'Número de usos', yTitle: 'g de CO₂ por litro', seriesName: 'Retornable',
            data: [1, 4, 8, 12, 16, 20, 25].map((n, i) => ({ label: String(n), value: [162, 62, 38, 31, 27, 25, 23][i] })),
            series: [{ name: 'Un solo uso', color: CLAY, values: [65, 65, 65, 65, 65, 65, 65] }] }),
          after(takeaway('8 usos', 'son suficientes para que la retornable emita menos que la de un solo uso; con 20 usos, un 62 % menos.', 850, 190, 340, 320, GREEN), 'fade-up'),
          sample(850, 530, 340, GREY)],
          notes: '≈1,5 min. Objetivo 1. La curva verde cae y cruza la roja hacia el octavo uso: tu hipótesis, confirmada. Datos de ejemplo.' },
        // 9 · R2 costs
        { title: 'Resultado 2 · Menos coste para el comercio', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: GREEN, dataLabels: true, grid: true, yTitle: 'Coste por litro (céntimos)', seriesName: 'Retornable',
            data: [{ label: 'Botella', value: 4.4 }, { label: 'Lavado', value: 3.1 }, { label: 'Transporte', value: 1.9 }, { label: 'Total', value: 9.4 }],
            series: [{ name: 'Un solo uso', color: CLAY, values: [12, 0, 1.8, 13.8] }] }),
          after(takeaway('−32 %', 'de coste total por litro: 9,4 céntimos con la retornable frente a 13,8 con la de un solo uso.', 850, 190, 340, 320, AMBER), 'fade-up'),
          sample(850, 530, 340, GREY)],
          notes: '≈1,5 min. Objetivo 2: el lavado y el transporte cuestan, pero la botella se amortiza. Datos de ejemplo.' },
        // 10 · R3 returns
        { title: 'Resultado 3 · La gente las devuelve', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: GREEN, grid: true, xTitle: 'Mes del piloto', yTitle: 'Botellas devueltas (%)', seriesName: 'Con depósito de 0,25 €',
            data: [1, 2, 3, 4, 5, 6].map((m, i) => ({ label: String(m), value: [61, 72, 80, 85, 88, 90][i] })),
            series: [{ name: 'Sin depósito', color: AMBER, values: [34, 38, 41, 43, 44, 45] }] }),
          after(takeaway('90 %', 'de devolución al sexto mes con depósito: el doble que sin él.', 850, 190, 340, 280, GREEN), 'fade-up'),
          sample(850, 490, 340, GREY)],
          notes: '≈1 min. Objetivo 3. El depósito es lo que cierra el ciclo; sin él, se pierde la mitad.' },
        // 11 · Break-even table
        { title: 'El punto de equilibrio del comercio', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 760, h: 300, fontSize: 21, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#d0dccd', banded: true, band: GREEN,
            rows: [['Comercios', 'Inversión inicial', 'Equilibrio'], ['Pequeño (50 botellas/día)', '1 400 €', '14 meses'], ['Mediano (150 botellas/día)', '3 900 €', '9 meses'], ['Grande (400 botellas/día)', '9 800 €', '6 meses']] }),
          after(takeaway('9 meses', 'es lo que tarda en recuperarse la inversión en un comercio mediano.', 880, 190, 310, 260, AMBER), 'fade-up'),
          sample(880, 470, 310, GREY)],
          notes: '≈1 min. Objetivo 3: calcular. Cuanto más vende el comercio, antes recupera. Datos de ejemplo.' },
        // 12 · Discussion
        { title: 'Discusión y limitaciones', layout: 'titleOnly', bg: PAPER, extra: [
          on(tcard('Coincide con lo publicado', 'Los estudios de análisis de ciclo de vida sitúan el equilibrio entre 5 y 15 usos según la distancia de lavado.', 90, 190, 530, 210, BLUE), 'fade-up'),
          on(tcard('Lo que aporta este trabajo', 'Datos de un piloto real en comercios de barrio, con costes y emisiones medidos con el mismo método.', 660, 190, 530, 210, GREEN), 'fade-up'),
          card('<b style="font-size:24px">Limitaciones</b>' + ul('Seis meses de piloto', 'Doce comercios de una sola ciudad', 'La planta de lavado estaba a 8 km'), 90, 430, 1100, 200, '#ffffff', { color: INK, fontSize: 21, radius: 14, pad: [18, 24, 16, 24] })],
          notes: '≈1,5 min. Lo nuevo: datos de comercios reales. La distancia al lavado es la variable más sensible; hay respaldo.' },
        // 13 · Conclusions
        { layout: 'blank', bg: GREEN, transition: 'zoom', extra: [
          label('CONCLUSIONES', 90, 110, 600, '#d5f0da'),
          text('La botella retornable sale a cuenta, al comercio y al planeta, desde el octavo uso.', 84, 150, 1100, 210, { fontFamily: H, fontSize: 48, fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }),
          ...['Con 20 usos emite un 62 % menos de CO₂', 'Cuesta un 32 % menos por litro', 'Con depósito, 9 de cada 10 botellas vuelven']
            .map((t, i) => on(text(`<b style="color:${NIGHT}">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 410 + i * 62, 1100, 54, { fontSize: 27, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. Tres conclusiones, una por objetivo.' },
        // 14 · Congress map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', route: 'arc', curve: 2, showAll: true, past: 'dim', marker: { kind: 'number', color: AMBER, size: 1.2 }, pulse: 'cur', flyMs: 5000 }, [
            stop('Ámsterdam', 4.9041, 52.3676, 'nl', 'Foro europeo de economía circular · 2025 · Comunicación oral'), stop('Londres', -0.1276, 51.5072, 'gb', 'Conferencia de envases sostenibles · 2025 · Póster'),
            stop('Singapur', 103.8198, 1.3521, 'sg', 'Cumbre asiática de comercio sostenible · 2026 · Ponencia', 6.5), stop('Ciudad del Cabo', 18.4241, -33.9249, 'za', 'Congreso de economía verde · 2026 · Comunicación oral', 6),
            stop('Nueva York', -74.006, 40.7128, 'us', 'Foro mundial de gestión de residuos · 2026 · Ponencia invitada y premio', 6)]),
          bar('<b>Foros internacionales</b> · cinco ciudades, cuatro continentes', 640, 30, 760, '#10261bd9')],
          notes: '≈1,5 min. El mapa vuela por cuatro continentes con un clic por parada. Participaciones de ejemplo: pon las tuyas.' },
        // 15 · Congress table
        { title: 'Foros en los que he participado', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 340, fontSize: 20, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#d0dccd', banded: true, band: GREEN,
            rows: [['Año', 'Foro', 'Lugar', 'Participación'], ['2025', 'Foro europeo de economía circular', 'Ámsterdam', 'Comunicación oral'], ['2025', 'Conferencia de envases sostenibles', 'Londres', 'Póster'], ['2026', 'Cumbre asiática de comercio sostenible', 'Singapur', 'Ponencia'], ['2026', 'Congreso de economía verde', 'Ciudad del Cabo', 'Comunicación oral'], ['2026', 'Foro mundial de gestión de residuos', 'Nueva York', 'Ponencia invitada (premio)']] }),
          sample(90, 540, 600, GREY)],
          notes: '≈45 s. La lista por escrito. Una frase: «el piloto despertó interés en cuatro continentes; en cada foro me preguntaron por el lavado».' },
        // 16 · Publications
        { title: 'Publicaciones y otros méritos', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['2025', '¿Cuándo compensa la botella retornable? Un piloto en comercios de barrio', 'Revista de Economía Circular de Ejemplo · Primer autor', GREEN], ['2026', 'El depósito como incentivo: devoluciones y costes en seis meses', 'Journal of Circular Retail de Ejemplo · Primer autor', AMBER]]
            .map(([y, t, j, c], i) => on(card(`<span style="font-size:19px;color:${deep(c, '#ffffff')};font-weight:700">${y}</span><br><b style="font-size:22px">${t}</b><br><span style="font-size:18px;color:${GREY}">${j}</span>`, 90, 170 + i * 120, 1100, 106, '#ffffff', { color: INK, radius: 12, borderColor: c, pad: [10, 20, 8, 20], fontSize: 20 }), 'fade-up')),
          ...[['Transferencia', 'El ayuntamiento ha ampliado el piloto a 40 comercios.', BLUE], ['Premio', 'Mejor trabajo de máster en el foro de Nueva York (2026).', CLAY]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 560, 430, 530, 150, c, { ts: 24, ds: 20 }), 'fade-up')),
          sample(90, 610, 600, GREY)],
          notes: '≈1 min. Dos artículos, una transferencia y un premio, todo ficticio: adapta a tu caso.' },
        // 17 · Thanks
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, GREEN, NIGHT, 38),
          text('Gracias', 84, 130, 700, 140, { fontFamily: H, fontSize: 100, fontWeight: 800, color: '#ffffff' }),
          text('¿Preguntas?', 90, 290, 700, 70, { fontSize: 42, color: AMBER }),
          text('A mi tutora, a los doce comercios que se atrevieron a probar y a quien devolvió una botella por veinticinco céntimos.', 90, 400, 560, 150, { fontSize: 24, color: '#e3f1e7', lineHeight: 1.45 }),
          m3d('kh-WaterBottle', 780, 100, 340, 460, { autoRotate: true, spin: 12, view: 'three', edge: 'fade' }),
          creditOf(['kh-WaterBottle'], 90, 628, 520, DIMT),
          timer(600, 1080, 540, 110, { color: AMBER, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 10 minutos para el turno de preguntas. Escucha hasta el final y, si tienes una diapositiva de respaldo, bájala.' },
        // 18-19 · Backup
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Y el agua y la energía del lavado? ¿No anulan el ahorro?', GREEN, '#ffffff'),
          tcard('Cómo lo conté', 'El lavado está dentro de los 31 g de CO₂ por litro (a 12 usos): agua, energía y transporte hasta la planta, a 8 km.', 84, 210, 540, 250, GREEN),
          tcard('Qué lo cambiaría', 'Si la planta estuviera a más de 60 km, el equilibrio pasaría de 8 a 14 usos. Por eso la proximidad importa.', 654, 210, 540, 250, CLAY)],
          notes: 'Respaldo: ábrela solo si preguntan. Es la pregunta más probable de un tribunal de economía y de ingeniería.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Doce comercios bastan para generalizar?', BLUE, '#ffffff'),
          tcard('Lo que permite decir', 'Que en comercios de barrio, con depósito y un lavado cercano, la retornable funciona: los resultados son parecidos en los tres barrios.', 84, 210, 540, 250, BLUE),
          tcard('Lo que no permite decir', 'Que lo mismo ocurra en supermercados o en otras ciudades. Por eso la línea futura es repetirlo con 40 comercios de varias ciudades.', 654, 210, 540, 250, CLAY)],
          notes: 'Respaldo: reconoce el alcance y enlaza con la transferencia al ayuntamiento (40 comercios).' },
      ]), INK));
    } },
};
