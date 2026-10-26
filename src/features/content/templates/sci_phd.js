// Example presentations: defensa de tesis doctoral (grande, ~50 diapositivas). Un ejemplo completo para quien tiene que
// defender cuatro años de trabajo: portada con un modelo 3D, una cifra que plantea el problema, el mapa de la zona que
// viaja de un punto a otro, los instrumentos como modelos 3D que giran, el método dibujado, los resultados con su
// conclusión escrita al lado, discusión, conclusiones y la parte que casi todas las tesis llevan al final: asistencia a
// congresos (el mapa vuela de uno a otro), publicaciones derivadas y otros méritos. Debajo (diapositivas verticales),
// las respuestas a las preguntas previsibles del tribunal. Nombres, universidad, revistas y datos inventados y marcados
// como ejemplo; los lugares y los satélites, reales (modelos 3D de la NASA, libres de derechos).

import { build, text, card, shape, ul, A, withAnims, numbered, glow, dg, timer, chartBlock, tableBlock, mathBlock, codeBlock, base, deep, pairStacks, nasa, uid } from './kit.js';
import { svgURL, img, on, after, label, tcard, takeaway, section, backup, sample, sat, mapBlock } from './phdkit.js';

export default {

  // 1 · Tesis doctoral en Ciencias de la Tierra: el hielo de Svalbard medido desde el espacio.
  sci_phd_cryo: { name: 'Defensa de tesis doctoral: Ciencias de la Tierra', cat: 'sci',
    summary: 'Defensa de tesis doctoral de unas 50 diapositivas sobre el hielo de Svalbard medido desde el espacio: portada con satélite en 3D, mapa de la zona que viaja, instrumentos en 3D, método, resultados con gráficos, discusión, conclusiones, asistencia a congresos con el mapa que vuela de uno a otro, publicaciones derivadas, otros méritos y diapositivas de respaldo para las preguntas del tribunal',
    make: () => {
      const PAPER = '#f2f7f9', INK = '#0e2a3a', GLAC = '#1f7a9e', NIGHT = '#08202f', ICE = '#bfe3f0', AMBER = '#e39a3b', RED = '#c4493c', GREY = '#566b78', MINT = '#4fb59a', CARD = '#ffffff', DIMT = '#a9c4d2';
      const H = pairStacks('editorial').heading;
      const ink = (deck, color) => Object.assign(deck, { textColor: color });
      // Places (real). Svalbard first, then the congresses' cities.
      const SV = {
        nya: { name: 'Ny-Ålesund', lon: 11.93, lat: 78.92, zoom: 8.2, cc: 'no' }, lyr: { name: 'Longyearbyen', lon: 15.63, lat: 78.22, zoom: 8.2, cc: 'no' },
        kon: { name: 'Glaciar Kongsvegen', lon: 13.2, lat: 78.75, zoom: 9.6, cc: 'no', pitch: 55, bearing: 20 }, han: { name: 'Glaciar Hansbreen', lon: 15.6, lat: 77.05, zoom: 9.6, cc: 'no', pitch: 55, bearing: -20 } };
      const CONG = [
        { name: 'Viena', lon: 16.3738, lat: 48.2082, zoom: 5.2, cc: 'at', note: 'Asamblea General de la EGU · 2023 · Póster: primeros resultados con ICESat-2' },
        { name: 'San Francisco', lon: -122.4194, lat: 37.7749, zoom: 5.2, cc: 'us', note: 'Reunión de otoño de la AGU · 2023 · Comunicación oral: fusión con GRACE-FO' },
        { name: 'Tromsø', lon: 18.9553, lat: 69.6492, zoom: 5.2, cc: 'no', note: 'Jornadas del Ártico · 2024 · Comunicación oral y mesa redonda' },
        { name: 'Hobart', lon: 147.3272, lat: -42.8821, zoom: 5.2, cc: 'au', note: 'Congreso de investigación polar · 2024 · Póster con estudiantes de doctorado' },
        { name: 'Tokio', lon: 139.6917, lat: 35.6895, zoom: 5.2, cc: 'jp', note: 'Simposio de observación de la Tierra · 2025 · Ponencia invitada' },
        { name: 'Lisboa', lon: -9.1393, lat: 38.7223, zoom: 5.2, cc: 'pt', note: 'Congreso nacional de glaciología · 2025 · Resultados finales de la tesis' }];
      // Ice and a satellite: a drawn cover figure behind the real 3D model.
      const rings = () => svgURL(520, 520, [60, 110, 160, 210, 250].map((r, i) => `<circle cx="260" cy="260" r="${r}" fill="none" stroke="#bfe3f0" stroke-opacity="${0.5 - i * 0.07}" stroke-width="2"/>`).join('')
);
      const foot = () => [text('Universidad de Ejemplo · Escuela de Doctorado · Programa de Ciencias de la Tierra y del Clima · Tesis doctoral 2026', 84, 684, 1112, 24, { fontSize: 13, color: GREY, textAlign: 'right' })];
      return numbered(ink(build({ name: 'Defensa de tesis doctoral: Ciencias de la Tierra', palette: 'ocean', fonts: 'editorial', title: { color: INK, size: 40 }, body: { color: INK }, decor: foot }, [
        // 1 · Cover
        { layout: 'blank', bg: NIGHT, transition: 'fade', back: [], extra: [
          glow(640, -120, 760, GLAC, NIGHT, 55),
          img(rings(), 660, 100, 560, 560, 'Anillos concéntricos alrededor del satélite'),
          sat('ice-clouds-and-land-elevation-satellite-2-icesat-2-a', 690, 130, 500, 480, { spin: 18 }),
          label('TESIS DOCTORAL · CIENCIAS DE LA TIERRA', 90, 120, 620, ICE),
          text('Midiendo el hielo desde el espacio: balance de masa de los glaciares de Svalbard con altimetría láser y gravimetría por satélite', 86, 160, 620, 330, { fontFamily: H, fontSize: 40, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }),
          shape('rect', 90, 510, 90, 3, AMBER),
          text('<b>Doctoranda:</b> Lucía Ferrer Aranda<br><b>Directores:</b> Dr. Martín Cabrera Soto · Dra. Irene Vidal Roca<br>Universidad de Ejemplo · Junio de 2026', 90, 530, 640, 120, { fontSize: 20, color: '#e6f1f6', lineHeight: 1.55 })],
          notes: '≈30 s. Saluda al tribunal, agradece su presencia y presenta el título con una frase: «He medido cuánto hielo pierden los glaciares de Svalbard combinando dos satélites». Nombres y universidad de ejemplo.' },
        // 2 · The figure
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(-200, 300, 800, GLAC, NIGHT, 40),
          label('EL PROBLEMA, EN UNA CIFRA', 90, 130, 600, ICE),
          text('−9,8', 80, 170, 620, 230, { fontFamily: H, fontSize: 190, fontWeight: 800, color: AMBER, lineHeight: 1 }),
          text('mil millones de toneladas de hielo al año perdían los glaciares de Svalbard entre 2018 y 2024', 90, 420, 560, 170, { fontSize: 30, color: '#ffffff', lineHeight: 1.35 }),
          sample(90, 612, 400, DIMT),
          sat('landsat-8', 700, 120, 500, 460, { spin: 10, view: 'low' }),
          after(text('Una cifra que nadie había medido con esta precisión en el archipiélago entero.', 700, 590, 500, 70, { fontSize: 21, color: ICE, textAlign: 'center', lineHeight: 1.35 }), 'fade-up')],
          notes: '≈1 min. Empieza por la cifra, no por el título. Pregunta: «¿Cómo se mide el peso del hielo de todo un archipiélago ártico?». Eso es la tesis. El dato es de ejemplo.' },
        // 3 · Roadmap
        { title: 'De qué voy a hablar', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Introducción\n  El hielo y el mar\nDatos\n  Tres satélites\nMétodo\n  Fusionar medidas\nResultados\n  Cuatro hallazgos\nDifusión\n  Congresos y artículos', 90, 190, 1100, 230, { color: INK }),
          after(text('Cuarenta minutos, cinco partes. Las preguntas más probables están detrás, en las diapositivas de respaldo: bajo cada parte, con la flecha hacia abajo.', 90, 470, 1100, 100, { fontSize: 24, color: GREY, lineHeight: 1.45 }), 'fade-up'),
          timer(2400, 1080, 560, 110, { color: GLAC, endText: '¡Tiempo!' })],
          notes: '≈30 s. Presenta la estructura en una frase por parte. El temporizador es de 40 minutos: ponlo en marcha al empezar para ir a tu ritmo.' },

        // ---------- 1 · Introducción
        section(1, 'Introducción', 'Por qué importa el hielo de Svalbard', NIGHT, '#ffffff', AMBER, H),
        // 5 · Sea level
        { title: 'El hielo que se funde sube el mar', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: GLAC, grid: true, xTitle: 'Año', yTitle: 'Aportación al nivel del mar (mm, acumulada)', seriesName: 'Glaciares de montaña y casquetes',
            data: [2002, 2006, 2010, 2014, 2018, 2022].map((y, i) => ({ label: String(y), value: [0, 4, 9, 15, 22, 31][i] })),
            series: [{ name: 'Capas de hielo (Groenlandia y Antártida)', color: AMBER, values: [0, 5, 12, 21, 31, 44] }] }),
          after(takeaway('1 de cada 3', 'milímetros de subida del mar viene hoy del hielo de glaciares y casquetes, fuera de las grandes capas.', 850, 190, 340, 280, GLAC), 'fade-up'),
          sample(850, 490, 340, GREY)],
          notes: '≈1 min. Contexto general en una sola idea: los glaciares pequeños pesan mucho en la subida del mar porque se funden rápido. Datos de ejemplo.' },
        // 6 · Svalbard, the map that travels
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', terrain: true, route: 'arc', curve: 1.5, marker: { kind: 'pin', color: AMBER, size: 1.1 }, pulse: 'cur', past: 'dim', motion: 'orbit', speed: 'slow', flyMs: 4500 },
            [{ ...SV.lyr, zoom: 6.2, note: 'Svalbard: 60 000 km² de hielo a 78° N, el 57 % del archipiélago.' }, { ...SV.nya, note: 'Ny-Ålesund, la base científica más al norte: donde instalé las estacas.' },
              { ...SV.kon, note: 'Kongsvegen: un glaciar de 100 km² que avanza a saltos.' }, { ...SV.han, note: 'Hansbreen: un frente que retrocede casi 100 m al año.' }]),
          text('<b>Svalbard</b> · un clic, un lugar', 30, 640, 520, 56, { fontSize: 22, color: '#ffffff', bg: '#08202fd9', radius: 12, pad: [8, 16, 8, 16], vAlign: 'middle' })],
          notes: '≈1,5 min. El mapa vuela de punto en punto con cada clic: primero el archipiélago entero, luego Ny-Ålesund (la base), Kongsvegen y Hansbreen, los dos glaciares donde validé las medidas. Ve despacio: es la imagen del sitio donde trabajas.' },
        // 7 · The problem
        { title: 'Medir un archipiélago entero es difícil', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Desde tierra', 'Estacas y radar: muy precisos, pero solo en unos pocos glaciares y semanas al año.', AMBER], ['Desde el aire', 'Campañas con avión: cubren más, pero caras y escasas (una cada varios años).', RED], ['Desde el espacio', 'Cobertura total y continua. El reto: cada satélite mide una cosa distinta y con errores distintos.', GLAC]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 190, 350, 290, c, { ts: 28, ds: 22 }), 'fade-up')),
          text('Esta tesis: combinar las medidas de los satélites para tener una sola cifra, con su incertidumbre.', 90, 520, 1100, 80, { fontSize: 25, color: deep(GLAC, PAPER), fontWeight: 700, textAlign: 'center', lineHeight: 1.35 })],
          notes: '≈1 min. El problema práctico: cada método mide una parte. La solución que propones es fusionarlos. Esto lleva a la pregunta.' },
        // 8 · State of the art
        { title: 'Lo que ya se sabía', layout: 'titleOnly', bg: PAPER, extra: [
          dg('timeline', '1960\n  Los primeros inventarios de glaciares con fotografía aérea\n2002\n  GRACE pesa el hielo midiendo cómo cambia la gravedad\n2003\n  ICESat mide por primera vez la altura del hielo con láser desde el espacio\n2018\n  ICESat-2 y GRACE-FO: láser y gravedad, más precisos y a la vez\n2021\n  Primeros trabajos que combinan ambos, solo en Groenlandia', 90, 180, 1100, 400, { color: INK }),
          sample(90, 610, 400, GREY)],
          notes: '≈1,5 min. Una línea de tiempo con cinco hitos, sin citas largas. Los años y los hitos son aproximados; en tu tesis pon tus referencias exactas.' },
        // 9 · The gap and the question
        { layout: 'blank', bg: PAPER, extra: [
          label('LA LAGUNA', 90, 110, 500, deep(RED, PAPER)),
          text('Nadie había combinado láser y gravedad en todo Svalbard.', 86, 150, 560, 280, { fontFamily: H, fontSize: 46, fontWeight: 700, color: INK, lineHeight: 1.15 }),
          after(tcard('Qué falta', 'El láser da la altura con detalle pero no sabe cuánto pesa lo que se pierde. La gravedad da el peso pero con un píxel de 300 km: demasiado grande para un archipiélago.', 90, 450, 560, 190, RED), 'fade-up'),
          label('LA PREGUNTA', 720, 110, 480, deep(GLAC, PAPER)),
          on(card('¿Cuánto hielo pierde Svalbard, dónde, y con qué certeza, si se combinan los dos satélites?', 720, 150, 470, 290, GLAC, { color: '#ffffff', fontSize: 31, radius: 16, pad: [28, 28, 28, 28], fontFamily: H, fontWeight: 700 }), 'zoom-in'),
          after(tcard('Hipótesis', 'Combinarlos reduce la incertidumbre a la mitad respecto al mejor de los dos por separado.', 720, 470, 470, 170, AMBER), 'fade-up')],
          notes: '≈1,5 min. Esta es la diapositiva central de la introducción: lo que falta, la pregunta y la hipótesis. Léelas despacio.' },
        // 10 · Objectives
        { title: 'Tres objetivos', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['1', 'Medir', 'Calcular el balance de masa de todos los glaciares de Svalbard entre 2018 y 2024.', GLAC], ['2', 'Fusionar', 'Combinar altimetría láser y gravimetría en un método reproducible, con su incertidumbre.', AMBER], ['3', 'Explicar', 'Separar qué parte de la pérdida viene del verano y cuál del frente que se desprende.', MINT]]
            .map(([n, t, d, c], i) => on(tcard(`${n} · ${t}`, d, 90 + i * 375, 200, 350, 330, c, { ts: 30, ds: 22 }), 'fade-up')),
          text('Cada objetivo responde a un resultado; los verás en ese orden.', 90, 570, 1100, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
          notes: '≈1 min. Tres objetivos, tres verbos: medir, fusionar, explicar. Más adelante, cada resultado empezará diciendo a qué objetivo responde.' },

        // ---------- 2 · Datos
        section(2, 'Datos e instrumentos', 'Tres satélites que miran el mismo hielo', NIGHT, '#ffffff', AMBER, H),
        // 12 · ICESat-2
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 60, 640, GLAC, NIGHT, 45),
          label('INSTRUMENTO 1 · ALTURA', 90, 130, 520, ICE),
          text('ICESat-2: un láser que cuenta fotones', 86, 170, 560, 190, { fontFamily: H, fontSize: 48, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
          text('Lanza 10 000 pulsos de láser por segundo y mide cuánto tardan en volver. Resultado: la altura del hielo con precisión de centímetros, a lo largo de líneas finas.', 90, 380, 560, 190, { fontSize: 24, color: '#e6f1f6', lineHeight: 1.45 }),
          after(text('Lo que da: <b>cuánto baja el hielo</b>. Lo que no da: cuánto pesa.', 90, 590, 560, 70, { fontSize: 22, color: AMBER, lineHeight: 1.35 }), 'fade-up'),
          sat('ice-clouds-and-land-elevation-satellite-2-icesat-2-a', 680, 80, 560, 560, { spin: 14 })],
          notes: '≈1,5 min. El modelo 3D es el satélite real (NASA): se gira con el ratón si quieres enseñar la antena y el láser. Mensaje: mide la altura, no el peso.' },
        // 13 · GRACE-FO
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(-160, 100, 640, MINT, NIGHT, 35),
          sat('gravity-recovery-and-climate-experiment-grace-a', 40, 80, 560, 560, { spin: 14 }),
          label('INSTRUMENTO 2 · MASA', 700, 130, 520, ICE),
          text('GRACE-FO: dos satélites que se pesan', 696, 170, 520, 190, { fontFamily: H, fontSize: 46, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
          text('Dos satélites idénticos, uno detrás del otro, a 220 km. Cuando el de delante pasa sobre más masa, se adelanta un poco: la distancia entre ambos delata el peso del hielo.', 700, 380, 500, 200, { fontSize: 23, color: '#e6f1f6', lineHeight: 1.45 }),
          after(text('Lo que da: <b>cuánto pesa</b>. Lo que no da: dónde, con detalle.', 700, 590, 500, 70, { fontSize: 22, color: AMBER, lineHeight: 1.35 }), 'fade-up')],
          notes: '≈1,5 min. Explica la idea con el ejemplo de dos coches en fila: el primero acelera al pasar un monte. Mensaje: mide el peso, pero con píxel grande.' },
        // 14 · Landsat 8
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, AMBER, NIGHT, 28),
          label('INSTRUMENTO 3 · FRENTE Y SUPERFICIE', 90, 130, 560, ICE),
          text('Landsat 8: la foto del glaciar', 86, 170, 560, 190, { fontFamily: H, fontSize: 48, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
          text('Una imagen cada 16 días, a 30 metros por píxel. Sirve para ver dónde está el frente, cuánto se ha desprendido y qué parte del glaciar es nieve y cuál hielo.', 90, 380, 560, 190, { fontSize: 24, color: '#e6f1f6', lineHeight: 1.45 }),
          after(text('Lo que da: <b>dónde</b> termina el hielo. Lo que no da: cuánto pesa.', 90, 590, 560, 70, { fontSize: 22, color: AMBER, lineHeight: 1.35 }), 'fade-up'),
          sat('landsat-8', 680, 80, 560, 560, { spin: 12, view: 'low' })],
          notes: '≈1 min. Landsat sirve para no equivocarse con el contorno: sin saber dónde acaba el glaciar, la altura del láser no vale.' },
        // 15 · The fleet together
        { title: 'Juntos, miden lo que ninguno puede solo', layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          text('Juntos, miden lo que ninguno puede solo', 84, 50, 1112, 80, { fontFamily: H, fontSize: 40, fontWeight: 700, color: '#ffffff' }),
          ...[['ice-clouds-and-land-elevation-satellite-2-icesat-2-a', 'ICESat-2', 'Altura', 'cm', GLAC], ['gravity-recovery-and-climate-experiment-grace-a', 'GRACE-FO', 'Masa', '300 km', MINT], ['landsat-8', 'Landsat 8', 'Contorno', '30 m', AMBER], ['jason-continuity-of-service-sentinel-6', 'Sentinel-6', 'Nivel del mar', 'mm', RED]]
            .map(([id, n, what, res, c], i) => [on(sat(id, 50 + i * 305, 170, 280, 300, { spin: 16 + i * 3 }), 'fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 }),
              text(`<b style="color:${c};font-size:26px">${n}</b><br><span style="font-size:21px;color:#e6f1f6">${what} · ${res}</span>`, 50 + i * 305, 490, 280, 90, { textAlign: 'center', lineHeight: 1.35 })]).flat(),
          text('Cuatro miradas al mismo hielo. La tesis usa las tres primeras para el balance de masa y la cuarta para comprobar a dónde va el agua.', 90, 600, 1100, 80, { fontSize: 22, color: ICE, textAlign: 'center', lineHeight: 1.4 })],
          notes: '≈1 min. Enseña los cuatro modelos girando. Aparecen uno a uno con un clic. Sentinel-6 es el que mide el nivel del mar: cierra la historia (el hielo que pierdes sube el mar).' },
        // 16 · Field campaign
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(60, 90, 700, 540, { look: 'satellite', terrain: true, edge: 'round', marker: { kind: 'star', color: AMBER, size: 1.3 }, pulse: 'cur', motion: 'orbit', speed: 'slow' }, [{ ...SV.kon, zoom: 10.4, pitch: 60, bearing: 30 }]),
          label('CAMPAÑA DE CAMPO', 800, 130, 400, ICE),
          text('Tres veranos en Kongsvegen', 796, 170, 400, 150, { fontFamily: H, fontSize: 40, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
          ...['42 estacas perforadas en el hielo', 'Receptores GPS cada 500 m', 'Tres campañas (2022, 2023 y 2024)'].map((t, i) => on(text(`<b style="color:${AMBER}">${i + 1}</b>&nbsp;&nbsp;${t}`, 800, 340 + i * 70, 400, 60, { fontSize: 22, color: '#e6f1f6', lineHeight: 1.3 }), 'fade-up')),
          after(text('Sirvieron para comprobar que el satélite no se equivoca: más adelante, la validación.', 800, 560, 400, 90, { fontSize: 20, color: ICE, lineHeight: 1.4 }), 'fade-up')],
          notes: '≈1 min. El mismo mapa, ahora inclinado sobre el glaciar donde trabajaste. Cuenta una anécdota breve de campo: da credibilidad. Los números de la campaña son de ejemplo.' },
        // 17 · Data table
        { title: 'Los datos, en una tabla', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 1100, h: 340, fontSize: 21, header: true, headBg: GLAC, headFg: '#ffffff', stroke: '#cfe1ea', banded: true, band: GLAC,
            rows: [['Producto', 'Satélite', 'Periodo', 'Resolución', 'Para qué lo uso'], ['Altura del hielo (ATL06)', 'ICESat-2', '2018–2024', '17 m a lo largo de la traza', 'Cambio de altura'], ['Anomalías de masa (mascons)', 'GRACE-FO', '2018–2024', '≈300 km, mensual', 'Masa total'], ['Imágenes ópticas', 'Landsat 8', '2018–2024', '30 m, cada 16 días', 'Contorno y frente'], ['Estacas y GPS', 'Campo', '2022–2024', 'Puntual', 'Validación']] }),
          after(text('Tres fuentes abiertas y gratuitas: cualquiera puede repetir el cálculo.', 90, 545, 1100, 60, { fontSize: 24, color: deep(GLAC, PAPER), fontWeight: 700 }), 'fade-up'), sample(90, 620, 400, GREY)],
          notes: '≈1 min. No leas la tabla: di que son datos abiertos y que el trabajo es reproducible. Esa es una de las aportaciones de la tesis.' },
        // 18 · Processing flow
        { title: 'De los satélites a una cifra', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Descargar\n  Tres productos abiertos\nLimpiar\n  Quitar nubes y errores\nCorregir\n  Nieve, rebote del suelo\nFusionar\n  Láser + gravedad\nIncertidumbre\n  Mil simulaciones', 90, 190, 1100, 230, { color: INK }),
          after(text('Todo el código y los datos intermedios están publicados con la tesis.', 90, 470, 1100, 60, { fontSize: 24, color: GREY, textAlign: 'center' }), 'fade-up')],
          notes: '≈45 s. Resumen del flujo: cinco pasos; el siguiente apartado entra en los tres más importantes.' },

        // ---------- 3 · Método
        section(3, 'Método', 'Cómo se fusionan el láser y la gravedad', NIGHT, '#ffffff', AMBER, H),
        // 20 · Equation
        { title: 'Convertir altura en masa', layout: 'titleOnly', bg: PAPER, extra: [
          mathBlock({ x: 90, y: 180, w: 760, h: 150, fontSize: 40, color: INK, latex: '\\dot{M} = \\rho \\int_{A} \\left( \\dot{h} - \\dot{h}_{\\mathrm{nieve}} \\right) \\mathrm{d}A' }),
          after(text('<b>Ṁ</b> es lo que perdemos cada año. Se obtiene sumando, en todo el glaciar, el cambio de altura del láser (ḣ) menos lo que se debe a la nieve (que pesa mucho menos que el hielo), multiplicado por la densidad ρ.', 90, 360, 760, 190, { fontSize: 23, color: INK, lineHeight: 1.45 }), 'fade-up'),
          after(takeaway('ρ = 850', 'kg/m³ de densidad media usada: entre la nieve (400) y el hielo (917).', 880, 190, 310, 250, AMBER), 'fade-up'),
          sample(880, 460, 310, GREY)],
          notes: '≈1,5 min. La ecuación importante: no la demuestres, explícala. «El láser dice cuánto baja; la densidad dice cuánto pesa lo que bajó».' },
        // 21 · Fusion picture
        { title: 'Fusionar: cada medida corrige a la otra', layout: 'titleOnly', bg: PAPER, extra: [
          img(svgURL(560, 330, `<rect width="560" height="330" rx="14" fill="#e8f2f7"/><g fill="none" stroke-width="5" stroke-linecap="round"><path d="M30 290 Q120 210 200 230 T360 170 T530 130" stroke="${GLAC}"/><path d="M30 275 Q120 245 200 245 T360 210 T530 170" stroke="${MINT}" stroke-dasharray="2 12"/><path d="M30 282 Q120 228 200 237 T360 190 T530 150" stroke="${AMBER}" stroke-width="7"/></g>`), 90, 190, 560, 330, 'Tres curvas: láser, gravedad y su fusión'),
          ...[['Láser (detalle, sin peso)', GLAC, 90], ['Gravedad (peso, sin detalle)', MINT, 285], ['Fusión', AMBER, 480]].map(([t, c, x]) => [shape('ellipse', x, 543, 12, 12, c), text(t, x + 18, 535, x === 480 ? 150 : 170, 30, { fontSize: 15, color: INK })]).flat(),
          after(tcard('Cómo', 'La gravedad fija el total del glaciar; el láser reparte ese total por zonas. Un filtro (de Kalman) mezcla las dos según su fiabilidad en cada instante.', 690, 190, 500, 200, GLAC), 'fade-up'),
          after(tcard('Qué se gana', 'El píxel de 300 km pasa a 1 km, y el error baja de ±3,1 a ±1,6 mil millones de toneladas al año.', 690, 410, 500, 160, AMBER), 'fade-up'),
          sample(90, 580, 400, GREY)],
          notes: '≈2 min. El corazón del método. Explica con la metáfora: la gravedad dice cuánto cuesta la compra; el láser dice qué hay en cada bolsa. Juntos, sabes el total y el reparto.' },
        // 22 · Corrections
        { title: 'Lo que hay que corregir antes', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['La nieve no es hielo', 'El láser mide la superficie; si cae nieve, sube. Se resta con un modelo de compactación de la nieve.', GLAC], ['El suelo sube', 'Al irse el hielo, la roca se levanta despacio (rebote glaciar). La gravedad lo nota: se corrige con un modelo del manto.', AMBER], ['Las nubes engañan', 'Un pulso de láser que rebota en una nube no mide el hielo. Se descartan con filtros de calidad.', RED]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 190, 350, 330, c, { ts: 26, ds: 21 }), 'fade-up')),
          text('Cada corrección tiene su error, y todos entran en la incertidumbre final.', 90, 560, 1100, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
          notes: '≈1,5 min. Tres correcciones, una por tarjeta. Si el tribunal es de geofísica, detente en el rebote glaciar: hay diapositiva de respaldo.' },
        // 23 · Uncertainty
        { title: 'Cuánta confianza tengo en la cifra', layout: 'titleOnly', bg: PAPER, extra: [
          dg('chevrons', 'Error del láser\n  ±2 cm de altura\nError de la nieve\n  ±15 % de densidad\nError del rebote\n  ±0,8 Gt al año\nMil simulaciones\n  Se repite el cálculo\nResultado\n  Cifra ± incertidumbre', 90, 190, 1100, 230, { color: INK }),
          after(takeaway('±1,6 Gt', 'al año: la incertidumbre del balance total. Es la mitad que usando solo la gravedad.', 90, 450, 520, 190, MINT), 'fade-up'),
          after(text('Un método de Monte Carlo: se repite el cálculo mil veces dejando que cada error varíe al azar, y el abanico de resultados es la incertidumbre.', 650, 450, 540, 190, { fontSize: 22, color: INK, lineHeight: 1.45 }), 'fade-up'),
          sample(90, 650, 400, GREY)],
          notes: '≈1,5 min. Una cifra sin su incertidumbre no vale. Lee la cifra y cierra con la comparación: la fusión reduce a la mitad la incertidumbre. Es tu hipótesis, confirmada.' },
        // 24 · Validation
        { title: 'Comprobación con medidas de campo', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 760, h: 300, fontSize: 21, header: true, headBg: GLAC, headFg: '#ffffff', stroke: '#cfe1ea', banded: true, band: GLAC,
            rows: [['Glaciar', 'Estacas (m/año)', 'Satélites (m/año)', 'Diferencia'], ['Kongsvegen', '−0,42', '−0,45', '0,03'], ['Hansbreen', '−0,91', '−0,86', '0,05'], ['Austfonna (borde)', '−0,33', '−0,36', '0,03']] }),
          after(takeaway('0,04 m/año', 'de diferencia media entre lo que midieron las estacas y lo que dicen los satélites.', 880, 190, 310, 260, MINT), 'fade-up'),
          after(text('El método reproduce el campo con un error menor que la incertidumbre anunciada.', 90, 510, 760, 90, { fontSize: 23, color: deep(GLAC, PAPER), fontWeight: 700, lineHeight: 1.35 }), 'fade-up'),
          sample(880, 470, 310, GREY)],
          notes: '≈1 min. Cierra el método. Es la prueba de que la fusión funciona antes de enseñar resultados. Datos de ejemplo.' },

        // ---------- 4 · Resultados
        section(4, 'Resultados', 'Cuatro hallazgos, uno por pregunta', NIGHT, '#ffffff', AMBER, H),
        // 26 · R1 total loss
        { title: 'Resultado 1 · Svalbard pierde 9,8 mil millones de toneladas al año', layout: 'titleOnly', bg: PAPER, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: GLAC, grid: true, xTitle: 'Año', yTitle: 'Pérdida acumulada (mil mill. t)', seriesName: 'Fusión láser + gravedad',
            data: [2018, 2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => ({ label: String(y), value: [0, -8.1, -19.6, -28.4, -40.2, -48.9, -58.8][i] })),
            series: [{ name: 'Solo gravedad (GRACE-FO)', color: AMBER, values: [0, -7.2, -21.5, -30.9, -43.8, -50.1, -61.3] }] }),
          after(takeaway('−9,8 ± 1,6', 'mil millones de toneladas al año entre 2018 y 2024: casi el doble de lo que se estimaba antes.', 850, 190, 340, 290, GLAC), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1,5 min. Objetivo 1. Lee la conclusión, no el gráfico. Las dos curvas coinciden en la tendencia; la fusión tiene la mitad de incertidumbre. Datos de ejemplo.' },
        // 27 · R2 by glacier
        { title: 'Resultado 2 · No todos los glaciares pierden igual', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: GLAC, dataLabels: true, grid: true, yTitle: 'Balance (m de agua eq. al año)',
            data: [{ label: 'Hansbreen', value: -1.12, color: RED }, { label: 'Kronebreen', value: -0.84, color: RED }, { label: 'Kongsvegen', value: -0.45, color: AMBER }, { label: 'Monacobreen', value: -0.31, color: AMBER }, { label: 'Austfonna', value: -0.22, color: MINT }] }),
          after(takeaway('×5', 'es lo que más pierde Hansbreen que Austfonna: los frentes que terminan en el mar se desprenden más rápido.', 850, 190, 340, 310, RED), 'fade-up'),
          sample(850, 520, 340, GREY)],
          notes: '≈1,5 min. Objetivo 1, ahora por zonas: la ventaja de la fusión es que se ve el detalle a 1 km. Los glaciares que acaban en el mar pierden más.' },
        // 27b · R2 on the map: where it is lost most (the map flies to three glaciers)
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', terrain: true, route: 'arc', curve: 1.3, marker: { kind: 'pin', color: RED, size: 1.2 }, pulse: 'cur', past: 'dim', motion: 'orbit', speed: 'slow', flyMs: 4500 },
            [{ ...SV.lyr, zoom: 6.2, note: 'El archipiélago, con la pérdida de cada sector a 1 km de resolución.' }, { name: 'Hansbreen', lon: 15.6, lat: 77.05, zoom: 9.8, cc: 'no', pitch: 55, bearing: -25, note: 'Hansbreen: −1,12 m al año. Un frente que cae al mar y retrocede casi 100 m al año.' },
              { name: 'Kronebreen', lon: 12.6, lat: 78.9, zoom: 9.8, cc: 'no', pitch: 55, bearing: 15, note: 'Kronebreen: −0,84 m al año. Aceleró en 2021 con el calentamiento del fiordo.' },
              { name: 'Austfonna', lon: 26.0, lat: 79.8, zoom: 8.4, cc: 'no', pitch: 45, bearing: 0, note: 'Austfonna: −0,22 m al año. El casquete grande, más alto y más frío, resiste mejor.' }]),
          text('<b>Resultado 2 en el mapa</b> · un clic, un glaciar', 30, 640, 640, 56, { fontSize: 22, color: '#ffffff', bg: '#08202fd9', radius: 12, pad: [8, 16, 8, 16], vAlign: 'middle' })],
          notes: '≈1,5 min. Vuelve al mapa del principio, ahora con resultados: el mapa vuela a los tres glaciares del gráfico anterior y cada nota recuerda la cifra. Datos de ejemplo.' },
        // 28 · R3 altitude
        { title: 'Resultado 3 · La pérdida es mayor a baja altitud', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'line', color: GLAC, grid: true, xTitle: 'Altitud (m)', yTitle: 'Cambio de altura (m al año)', seriesName: '2018–2021',
            data: [0, 200, 400, 600, 800, 1000].map((a, i) => ({ label: String(a), value: [-2.6, -1.9, -1.1, -0.6, -0.2, 0.1][i] })),
            series: [{ name: '2021–2024', color: RED, values: [-3.4, -2.5, -1.6, -0.9, -0.4, 0] }] }),
          after(takeaway('−0,8 m', 'más bajo cada año en los glaciares de menos de 400 m de altitud en 2021–2024 que en 2018–2021.', 850, 190, 340, 290, RED), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Objetivo 2: el láser dice dónde baja el hielo. La línea roja, más baja que la azul en las partes bajas, indica que la fusión se acelera.' },
        // 29 · R4 seasonality
        { title: 'Resultado 4 · El verano pesa más que el frente', layout: 'titleOnly', bg: PAPER, extra: [
          chartBlock({ x: 90, y: 170, w: 720, h: 430, chartType: 'bar', color: GLAC, dataLabels: true, grid: true, yTitle: 'Pérdida (mil mill. t al año)',
            data: [{ label: 'Fusión en verano', value: 6.4, color: AMBER }, { label: 'Frente que se desprende', value: 3.4, color: RED }] }),
          after(takeaway('65 %', 'de la pérdida viene de la fusión en la superficie en verano; el 35 % restante, del hielo que cae al mar.', 850, 190, 340, 290, AMBER), 'fade-up'),
          sample(850, 500, 340, GREY)],
          notes: '≈1 min. Objetivo 3: separar causas. Cierra el bloque de resultados: dos tercios fusión, un tercio frentes. Datos de ejemplo.' },
        // 30 · Compare with models
        { title: 'Comparación con otros estudios', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 175, w: 1100, h: 300, fontSize: 21, header: true, headBg: GLAC, headFg: '#ffffff', stroke: '#cfe1ea', banded: true, band: GLAC,
            rows: [['Estudio (ficticio)', 'Método', 'Pérdida (Gt/año)', 'Incertidumbre'], ['Esta tesis', 'Láser + gravedad', '−9,8', '±1,6'], ['Equipo A, 2023', 'Solo gravedad', '−10,4', '±3,1'], ['Equipo B, 2022', 'Solo láser (ICESat-2)', '−7,9', '±2,2'], ['Modelo regional', 'Clima + hielo', '−6,5', '±3,5']] }),
          after(text('Mi cifra cae entre las medidas con satélite, con la menor incertidumbre. El modelo regional parece quedarse corto.', 90, 505, 1100, 90, { fontSize: 24, color: deep(GLAC, PAPER), fontWeight: 700, lineHeight: 1.35 }), 'fade-up'), sample(90, 620, 400, GREY)],
          notes: '≈1 min. Los estudios son ficticios: en tu tesis, pon los reales. Mensaje: coherente con los demás y más precisa.' },
        // 31 · Summary of numbers
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          label('RESUMEN DE RESULTADOS', 90, 90, 600, ICE),
          ...[['−9,8', 'mil millones de toneladas al año perdidas', AMBER], ['±1,6', 'de incertidumbre, la mitad que antes', MINT], ['×5', 'entre el glaciar que más y el que menos pierde', RED], ['65 %', 'de la pérdida viene del verano', ICE]]
            .map(([n, t, c], i) => on(text(`<div style="font-family:${H};font-size:84px;font-weight:800;color:${c};line-height:1">${n}</div><div style="font-size:22px;color:#e6f1f6;margin-top:8px">${t}</div>`, 90 + (i % 2) * 560, 160 + Math.floor(i / 2) * 250, 520, 220, { lineHeight: 1.2 }), 'fade-up')),
          sample(90, 650, 400, DIMT)],
          notes: '≈45 s. Los cuatro números que el tribunal debe recordar. Cada uno responde a un objetivo.' },

        // ---------- 5 · Discusión y conclusiones
        section(5, 'Discusión', 'Qué significa y qué queda por hacer', NIGHT, '#ffffff', AMBER, H),
        // 33 · Discussion
        { title: 'Discusión', layout: 'titleOnly', bg: PAPER, extra: [
          on(tcard('Coincide con lo publicado', 'El Ártico europeo se calienta cuatro veces más rápido que la media mundial; que pierda más hielo del previsto es coherente.', 90, 190, 530, 220, GLAC), 'fade-up'),
          on(tcard('Lo que aporta este trabajo', 'Primera cifra para todo el archipiélago con láser y gravedad a la vez, con código abierto y su incertidumbre.', 660, 190, 530, 220, AMBER), 'fade-up'),
          text('La idea de fondo: ningún satélite mide solo el hielo, pero varios juntos sí.', 90, 450, 1100, 110, { fontFamily: H, fontSize: 30, color: INK, lineHeight: 1.4, textAlign: 'center' })],
          notes: '≈1,5 min. Relaciona tus resultados con la literatura sin citas largas. Destaca lo nuevo: la fusión y la apertura del código.' },
        // 34 · Sea level equivalence
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, GLAC, NIGHT, 40),
          label('¿Y EL NIVEL DEL MAR?', 90, 130, 520, ICE),
          text('Cada año, Svalbard sube el mar 0,03 mm', 86, 170, 560, 200, { fontFamily: H, fontSize: 46, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
          text('Parece poco, pero es el 1 % de lo que sube el mar en todo el planeta y, sobre todo, sirve de aviso: todos los glaciares del Ártico siguen el mismo camino.', 90, 400, 560, 190, { fontSize: 23, color: '#e6f1f6', lineHeight: 1.45 }),
          sample(90, 620, 400, DIMT),
          sat('jason-continuity-of-service-sentinel-6', 680, 80, 560, 560, { spin: 14 })],
          notes: '≈1 min. Cierra el círculo con Sentinel-6, el satélite que mide el mar. Conversión: 362 mil millones de toneladas son 1 mm de nivel del mar; 9,8 → 0,03 mm.' },
        // 35 · Limitations
        { title: 'Limitaciones y líneas futuras', layout: 'titleOnly', bg: PAPER, extra: [
          card('<b style="font-size:26px">Limitaciones</b>' + ul('Solo siete años de datos (2018–2024)', 'Resolución de 1 km: no ve los glaciares más pequeños', 'Modelo de nieve con mucha incertidumbre en invierno'), 90, 190, 530, 340, '#ffffff', { color: INK, fontSize: 22, radius: 14, pad: [22, 24, 20, 24] }),
          card('<b style="font-size:26px">Líneas futuras</b>' + ul('Alargar la serie con los próximos años de ICESat-2', 'Añadir radar (CryoSat-2) para los glaciares pequeños', 'Aplicar el método a Groenlandia y los Andes'), 660, 190, 530, 340, '#ffffff', { color: INK, fontSize: 22, radius: 14, pad: [22, 24, 20, 24] })],
          notes: '≈1 min. Reconocer las limitaciones antes de que te las señalen da seguridad. Cada limitación, con su línea futura enfrente.' },
        // 35b · Contributions
        { title: 'Tres aportaciones de la tesis', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Un método', 'Fusión de láser y gravedad con filtro de Kalman, con la mitad de incertidumbre que cada fuente por separado.', GLAC], ['Una cifra', 'El primer balance de masa de todo Svalbard (2018–2024) con su incertidumbre: −9,8 ± 1,6 mil millones de toneladas al año.', AMBER], ['Un código', 'Todo abierto: datos, código y cuaderno para repetirlo en otra región con un archivo de configuración.', MINT]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + i * 375, 200, 350, 320, c, { ts: 30, ds: 22 }), 'fade-up')),
          text('Cada aportación es verificable por cualquiera: es lo que más me importa de este trabajo.', 90, 560, 1100, 60, { fontSize: 24, color: GREY, textAlign: 'center' })],
          notes: '≈1 min. Las tres aportaciones antes de las conclusiones: un método, una cifra y un código. Es lo que el tribunal evaluará como «contribución original».' },
        // 36 · Conclusions
        { layout: 'blank', bg: GLAC, transition: 'zoom', extra: [
          label('CONCLUSIONES', 90, 110, 600, '#d6efff'),
          text('Combinar láser y gravedad mide el hielo de Svalbard con la mitad de incertidumbre.', 84, 150, 1100, 210, { fontFamily: H, fontSize: 50, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 }),
          ...['Svalbard pierde 9,8 ± 1,6 mil millones de toneladas de hielo al año', 'Los glaciares que acaban en el mar pierden hasta cinco veces más', 'El 65 % de la pérdida es fusión de verano: el resto, hielo que cae']
            .map((t, i) => on(text(`<b style="color:${NIGHT}">${i + 1}</b>&nbsp;&nbsp;${t}`, 90, 410 + i * 62, 1100, 54, { fontSize: 27, color: '#ffffff' }), 'fade-up'))],
          notes: '≈1 min. La idea que quieres que el tribunal recuerde y tres conclusiones, una por objetivo.' },

        // ---------- 6 · Difusión
        section(6, 'Producción científica', 'Congresos, artículos y otros méritos', NIGHT, '#ffffff', AMBER, H),
        // 37b · Open code
        { title: 'Código y datos abiertos', layout: 'titleOnly', bg: PAPER, extra: [
          codeBlock({ x: 90, y: 175, w: 640, h: 330, lang: 'python', fontSize: 20, code: '# Same mass balance, another region\nfrom cryofusion import Region, balance\n\nregion = Region.from_config("greenland.yaml")\nresult = balance(region, years=(2018, 2024), runs=1000)\n\nprint(result.mass_gt_per_year, result.uncertainty)' }),
          after(tcard('Qué se publica', 'Los datos intermedios, el código (licencia abierta) y un cuaderno que reproduce todas las figuras de la tesis.', 770, 175, 420, 200, MINT), 'fade-up'),
          after(tcard('Qué cambia otra región', 'Solo un archivo de configuración: límites, modelo de nieve y corrección del suelo.', 770, 395, 420, 160, GLAC), 'fade-up'),
          sample(90, 560, 600, GREY)],
          notes: '≈1 min. Un ejemplo de código (ficticio: el paquete no existe) para enseñar que el trabajo es reproducible. Pon tu repositorio y su DOI.' },
        // 38 · Congresses on the map
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          mapBlock(0, 0, 1280, 720, { look: 'satellite', route: 'arc', curve: 2, showAll: true, past: 'dim', marker: { kind: 'number', color: AMBER, size: 1.2 }, pulse: 'cur', flyMs: 5000 }, CONG),
          text('<b>Asistencia a congresos</b> · seis ciudades, tres continentes', 30, 640, 760, 56, { fontSize: 22, color: '#ffffff', bg: '#08202fd9', radius: 12, pad: [8, 16, 8, 16], vAlign: 'middle' })],
          notes: '≈2 min. El mapa vuela de congreso en congreso con cada clic: Viena, San Francisco, Tromsø, Hobart, Tokio y Lisboa. En cada parada aparece qué presentaste. Participaciones de ejemplo: pon las tuyas.' },
        // 39 · Congress table
        { title: 'Congresos en los que he participado', layout: 'titleOnly', bg: PAPER, extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 400, fontSize: 19, header: true, headBg: GLAC, headFg: '#ffffff', stroke: '#cfe1ea', banded: true, band: GLAC,
            rows: [['Año', 'Congreso', 'Lugar', 'Participación'], ['2023', 'Asamblea General de la EGU', 'Viena', 'Póster'], ['2023', 'Reunión de otoño de la AGU', 'San Francisco', 'Comunicación oral'], ['2024', 'Jornadas del Ártico', 'Tromsø', 'Comunicación oral y mesa redonda'], ['2024', 'Congreso de investigación polar', 'Hobart', 'Póster'], ['2025', 'Simposio de observación de la Tierra', 'Tokio', 'Ponencia invitada'], ['2025', 'Congreso nacional de glaciología', 'Lisboa', 'Comunicación oral']] }),
          sample(90, 600, 600, GREY)],
          notes: '≈1 min. La misma lista, para quien la quiera leer. Una frase: «presenté los resultados parciales en seis foros y el feedback mejoró el método».' },
        // 40 · Publications
        { title: 'Publicaciones derivadas de la tesis', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['2024', 'Combinar altimetría láser y gravimetría para el balance de masa de Svalbard', 'Revista de Glaciología Aplicada · Primera autora', 'Q1 · 48 citas', GLAC], ['2025', 'Una incertidumbre honesta: simulaciones para el balance de masa por satélite', 'Journal of Polar Remote Sensing · Primera autora', 'Q1 · 21 citas', AMBER], ['2025', 'Código abierto para el análisis conjunto de ICESat-2 y GRACE-FO', 'Software de Ciencias de la Tierra · Coautora', 'Q2 · 9 citas', MINT], ['2026', 'Frentes que se desprenden: separar fusión y desprendimiento', 'En revisión · Primera autora', 'Enviado', RED]]
            .map(([y, t, j, m, c], i) => on(card(`<span style="font-size:19px;color:${deep(c, '#ffffff')};font-weight:700">${y} · ${m}</span><br><b style="font-size:22px">${t}</b><br><span style="font-size:18px;color:${GREY}">${j}</span>`, 90, 170 + i * 118, 1100, 104, '#ffffff', { color: INK, radius: 12, borderColor: c, pad: [10, 20, 8, 20], fontSize: 20 }), 'fade-up')),
          sample(90, 650, 800, GREY)],
          notes: '≈1,5 min. Tres artículos y uno en revisión, más el código publicado. Títulos, revistas y citas ficticios: pon los tuyos. Si el tribunal pregunta, el DOI está en el documento de la tesis.' },
        // 41 · Other merits
        { title: 'Otros méritos durante el doctorado', layout: 'titleOnly', bg: PAPER, extra: [
          ...[['Estancia en Noruega', 'Tres meses en el centro polar de Tromsø (2024).', GLAC], ['Docencia', '120 horas de prácticas de teledetección en el Grado de Ciencias Ambientales.', AMBER], ['Premio', 'Mejor comunicación de estudiantes en las Jornadas del Ártico (2024).', MINT], ['Divulgación', 'Charlas en 12 institutos y un vídeo con 40 000 visitas.', RED]]
            .map(([t, d, c], i) => on(tcard(t, d, 90 + (i % 2) * 560, 180 + Math.floor(i / 2) * 210, 530, 190, c, { ts: 26, ds: 21 }), 'fade-up')),
          sample(90, 620, 400, GREY)],
          notes: '≈1 min. Rápido: cuatro méritos que completan la tesis. Todo ficticio, adapta a tu caso.' },
        // 42 · Timeline
        { title: 'Cuatro años de trabajo', layout: 'titleOnly', bg: PAPER, extra: [
          dg('timeline', '2022\n  Primera campaña de campo y puesta a punto de los datos\n2023\n  Primeros resultados y primeros congresos\n2024\n  Estancia en Tromsø, artículo principal y segunda campaña\n2025\n  Método final, código abierto y ponencia invitada\n2026\n  Redacción y defensa de la tesis', 90, 190, 1100, 380, { color: INK }),
          sample(90, 610, 400, GREY)],
          notes: '≈45 s. Cierra la parte de méritos con la línea temporal de la tesis.' },
        // 43 · Thanks
        { layout: 'blank', bg: NIGHT, transition: 'fade', extra: [
          glow(700, 80, 640, GLAC, NIGHT, 40),
          text('Gracias', 84, 130, 700, 140, { fontFamily: H, fontSize: 100, fontWeight: 700, color: '#ffffff' }),
          text('¿Preguntas?', 90, 290, 700, 70, { fontSize: 42, color: AMBER }),
          text('A mis directores, al equipo de campo en Ny-Ålesund, a la Escuela de Doctorado y a mi familia.', 90, 400, 560, 140, { fontSize: 24, color: '#e6f1f6', lineHeight: 1.45 }),
          sat('ice-clouds-and-land-elevation-satellite-2-icesat-2-a', 680, 100, 520, 440, { spin: 12 }),
          timer(900, 1080, 540, 110, { color: AMBER, endText: '¡Tiempo!' })],
          notes: 'Cuenta atrás de 15 minutos para el turno de preguntas. Escucha hasta el final, agradece la pregunta y, si tienes una diapositiva de respaldo, bájala.' },
        // ---------- Respaldo
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Por qué ICESat-2 y no CryoSat-2, que usa radar?', GLAC, '#ffffff'),
          tableBlock({ x: 84, y: 200, w: 1110, h: 270, fontSize: 21, header: true, headBg: GLAC, headFg: '#ffffff', stroke: '#cfe1ea', banded: true, band: GLAC,
            rows: [['', 'ICESat-2 (láser)', 'CryoSat-2 (radar)'], ['Resolución sobre el hielo', '17 m a lo largo de la traza', '≈300 m'], ['Penetra en la nieve', 'No: mide la superficie', 'Sí, unos metros'], ['Problema', 'Las nubes lo tapan', 'Pierde precisión en pendientes']] }),
          text('Con láser, la altura es más exacta y no depende de cuánto penetre la señal. CryoSat-2 está en las líneas futuras: ayudaría con los glaciares pequeños.', 84, 500, 1110, 100, { fontSize: 22, color: INK, lineHeight: 1.4 })],
          notes: 'Respaldo: ábrela solo si preguntan. Mensaje: elegí el láser por su exactitud, y el radar queda como mejora.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Cómo afecta el rebote del suelo a la gravedad?', AMBER, '#ffffff'),
          tcard('El problema', 'Al irse el hielo, la roca se levanta despacio. La gravedad lo nota como si hubiera más masa aunque no la hay: sin corregir, el hielo parece perder menos.', 84, 210, 540, 260, AMBER),
          tcard('La solución', 'Un modelo del manto terrestre calcula ese rebote y se resta. Su error (±0,8 mil millones de toneladas al año) entra en la incertidumbre final.', 654, 210, 540, 260, GLAC)],
          notes: 'Respaldo. Si el tribunal es de geofísica, añade que probaste con dos modelos del manto y la diferencia cabe en la incertidumbre.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Funcionaría el método en otros lugares, como Groenlandia?', MINT, '#ffffff'),
          tcard('Sí, con ajustes', 'El método no depende de Svalbard: solo necesita los dos satélites y un modelo de nieve local. Groenlandia es más grande y más fría: la nieve pesa más en el cálculo.', 84, 210, 540, 260, MINT),
          tcard('Lo que habría que cambiar', 'La resolución (a 5 km bastaría), el modelo de nieve y la corrección del suelo. El código está preparado para cambiar de zona con un archivo de configuración.', 654, 210, 540, 260, GLAC)],
          notes: 'Respaldo: enlaza con las líneas futuras. Muestra que el trabajo es reproducible y reutilizable.' },
        { vertical: true, layout: 'blank', bg: '#ffffff', extra: [...backup('¿Y si las nubes sesgan los datos del láser?', RED, '#ffffff'),
          tcard('Cómo lo controlé', 'Descarté los pulsos con nubes por una medida de calidad del propio satélite y comprobé que quitar el 20 % más de datos no cambia la cifra más de 0,2.', 84, 210, 540, 250, GLAC),
          tcard('Lo que no puedo descartar', 'Que haya meses sin datos buenos en invierno polar. Por eso la fusión con la gravedad, que no depende de las nubes, es tan útil.', 654, 210, 540, 250, RED)],
          notes: 'Respaldo: la pregunta clásica sobre sesgos. Responde con lo que controlaste y reconoce lo que no.' },
      ]), INK));
    } },
};
