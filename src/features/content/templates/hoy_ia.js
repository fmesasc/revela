// Example presentation: Actualidad — la IA hoy (noviembre de 2026). { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Una plantilla con datos contrastados (INE, Eurostat, Comisión Europea, FMI, OIT, OCDE, AIE, UNESCO, Foro Económico Mundial):
// uso de la IA por la ciudadanía y las empresas, el Reglamento europeo de IA y su «ómnibus» (calendario a noviembre de 2026),
// empleo, energía, educación y riesgos. Cada cifra lleva su organismo, su año y, en las notas del orador, el documento y la
// fecha de publicación. La investigación (cifra → fuente → enlace → fecha) está en docs/plantillas-actualidad/hoy_ia.md.
// Todo el texto va en bloques (para poder traducirlo); lo que cambia deprisa está marcado con su fecha y en la última diapositiva.
// Iconos 3D: 3dicons.co (CC0). Tema propio: papel cálido, tinta azul oscuro y cuatro acentos.

import { build, text, shape, ul, A, withAnims, numbered, glow, chartBlock, tableBlock, pollBlock, timer, base, deep } from './kit.js';

const AI = new URL('../../../../assets/icons3d/', import.meta.url).href;
const FF = { head: "'Space Grotesk', sans-serif" };
const ico = (id, x, y, s, alt, props = {}) => ({ ...base(x, y, s, s), type: 'image', src: `${AI}${id}.webp`, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const seq = (b, i, effect = 'fade-up') => on(b, effect, { start: i ? 'afterPrev' : 'click' });

// The theme: warm paper, dark blue ink, four accents.
const T = { bg: '#f6f1e7', l: ['#fb923c', '#38bdf8', '#a78bfa'], op: [34, 28, 22], ink: '#1d2433', soft: '#566074', acc: '#c2410c',
  cols: ['#c2410c', '#0e7490', '#6d28d9', '#15803d'], head: '#1d2433', headFg: '#ffffff', panel: 'rgba(255,255,255,0.74)', edge: 'rgba(29,36,51,0.16)', line: 'rgba(29,36,51,0.22)' };
const lights = [glow(-160, -180, 640, T.l[0], T.bg, T.op[0]), glow(760, 330, 700, T.l[1], T.bg, T.op[1]), glow(470, -260, 520, T.l[2], T.bg, T.op[2])];
const top = shape('rect', 0, 0, 1280, 10, T.acc);
const glass = (html, x, y, w, h, props = {}) => text(html, x, y, w, h, { bg: T.panel, borderColor: T.edge, borderWidth: 1.5, radius: 22,
  pad: [18, 24, 18, 24], glass: 14, color: T.ink, fontSize: 24, ...props });
const panel = (x, y, w, h) => shape('rounded', x, y, w, h, '#ffffff', { opacity: 72, stroke: T.edge, strokeWidth: 1.5, radius: 22 });
const heading = (t, w = 1140) => text(t, 70, 30, w, 100, { fontSize: 40, fontWeight: 800, color: T.ink, fontFamily: FF.head, lineHeight: 1.08 });
const label = (t, x, y, w) => text(t, x, y, w, 30, { fontSize: 20, letterSpacing: 3, fontWeight: 700, color: T.acc });
const source = (t, y = 616) => text(t, 70, y, 1140, 56, { fontSize: 18, color: T.soft, lineHeight: 1.3 });
const credit = text('Iconos 3D: 3dicons.co · Vijay Verma (CC0)', 70, 686, 520, 26, { fontSize: 14, color: T.soft, letterSpacing: 1 });
const slideOf = (extra, notes, o = {}) => ({ layout: 'blank', bg: T.bg, back: [...lights, top], extra, notes, transition: 'fade', ...o });
const tbl = (rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 22, header: true, headBg: T.head, headFg: T.headFg, stroke: T.line,
  banded: true, band: T.ink, bandAlpha: 0.06, color: T.ink, rows, ...o });
const poll = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, color: T.ink, ...props });

// A chart on a white panel at the left, a text at the right, the source under them and a 3D icon by the title.
const chart = (title, chartProps, side, src, notes, icon, alt, sideSize = 22) => slideOf([heading(title, 1010), on(ico(icon, 1110, 14, 110, alt), 'zoom-in', { start: 'withPrev' }),
  panel(70, 150, 690, 450), chartBlock({ x: 86, y: 162, w: 658, h: 426, labelColor: T.ink, ...chartProps }),
  seq(glass(side, 790, 150, 420, 450, { fontSize: sideSize, lineHeight: 1.35, vAlign: 'middle' }), 0, 'fade-left'), source(src), credit], notes);

// Columns, each with a coloured title and a body.
const columns = (title, cols, notes, src, h = 440, fs = 0) => { const n = cols.length, gap = 22, w = (1140 - gap * (n - 1)) / n;
  return slideOf([heading(title), ...cols.map(([c, t, body], i) => seq(glass(`<div style="font-size:28px;font-weight:800;color:${deep(c, '#ffffff')};margin-bottom:.35em">${t}</div><div style="font-size:${fs || (n === 3 ? 21 : 22)}px;line-height:1.33">${body}</div>`,
    70 + i * (w + gap), 150, w, h, { pad: [20, 22, 16, 22], borderColor: c, borderWidth: 2.5 }), i)), ...(src ? [source(src)] : [])], notes); };

// ---- Texts that come up more than once ------------------------------------------------
const FUENTE_INE26 = 'Fuente: INE, Encuesta TIC en hogares 2026 (11-nov-2026) y 2025 (20-nov-2025). Personas que usaron IA generativa en los tres últimos meses.';

export default {

  edu_hoy_ia: { name: 'Actualidad: la IA hoy', cat: 'edu',
    summary: 'La inteligencia artificial en 2026 con datos oficiales: quién la usa (INE, Eurostat), el Reglamento europeo de IA y su aplazamiento (calendario a noviembre de 2026), empleo (FMI, OIT, OCDE), consumo de energía (AIE), educación (OCDE, UNESCO) y riesgos; con gráficos, votación, debate cronometrado y fuentes con fecha',
    make: () => numbered(build({ name: 'Actualidad: la IA hoy', palette: 'paper', fonts: 'modern', title: { color: T.ink, size: 44 }, body: { color: T.ink } }, [

      // 1 · Cover with the hook: one figure.
      slideOf([panel(70, 130, 700, 440), label('ACTUALIDAD · NOVIEMBRE DE 2026', 110, 172, 640),
        text('La inteligencia artificial en 2026', 104, 214, 640, 160, { fontSize: 56, fontWeight: 800, color: T.ink, lineHeight: 1.05, fontFamily: FF.head }),
        text('Regulación, empleo y uso real: lo que dicen los datos oficiales y lo que todavía no sabemos.', 110, 400, 620, 150, { fontSize: 25, color: T.soft, lineHeight: 1.35 }),
        on(glass(`<div style="text-align:center"><div style="font-size:92px;font-weight:800;color:${T.acc};line-height:1">54,8 %</div><div style="font-size:22px;margin-top:.3em">de las personas de 16 a 74 años en España usó IA generativa en los tres últimos meses</div><div style="font-size:17px;color:${T.soft};margin-top:.5em">INE, 11 de noviembre de 2026</div></div>`,
          820, 200, 390, 360, { vAlign: 'middle', glass: 16 }), 'fade-up', { start: 'afterPrev' }),
        on(ico('chat-text', 940, 90, 150, 'Un mensaje'), 'zoom-in', { start: 'afterPrev' }), credit],
      'Portada. Plantilla de actualidad para profesorado, empresa y divulgación. Todas las cifras son oficiales, llevan su año y su fuente (notas de cada diapositiva y última diapositiva), y están actualizadas a 15 de noviembre de 2026. Cifra de la portada: INE, Encuesta sobre equipamiento y uso de TIC en los hogares 2026, nota de prensa del 11 de noviembre de 2026 (54,8 % de las personas de 16 a 74 años usó herramientas de IA generativa en los tres últimos meses; recogida de datos del 6 de abril al 16 de julio de 2026). Neutral: se presentan datos y varias lecturas, no consignas.'),

      // 2 · Citizens: Spain 2025 → 2026.
      chart('España: más de la mitad ya usa IA generativa',
        { chartType: 'bar', color: '#94a3b8', seriesName: '2025', grid: true, dataLabels: true, yMin: 0, yMax: 100, yTitle: '% de personas (tres últimos meses)',
          alt: 'Gráfico de barras: uso de IA generativa en España en 2025 y 2026. De 16 a 74 años: 37,9 % y 54,8 %. De 16 a 24 años: 75,6 % y 83,3 %.',
          data: [{ label: '16 a 74 años', value: 37.9 }, { label: '16 a 24 años', value: 75.6 }], series: [{ name: '2026', values: [54.8, 83.3], color: '#c2410c' }] },
        `<b style="color:${deep(T.acc)}">+16,9 puntos</b> en un año: del 37,9 % de 2025 al 54,8 % de 2026.<br><br>Entre los 16 y los 24 años, el 83,3 %.<br><br>En la UE, en 2025: el 32,7 %, con Dinamarca (48,4 %) arriba y Rumanía (17,8 %) abajo (Eurostat).`,
        FUENTE_INE26 + ' UE: Eurostat, 16-dic-2025.',
        'INE, notas de prensa de la Encuesta TIC en hogares: 2026 (publicada el 11-nov-2026; recogida del 6-abr al 16-jul-2026): 54,8 % de 16 a 74 años (+16,9 puntos respecto a 2025), 83,3 % de 16 a 24 años. 2025 (publicada el 20-nov-2025; recogida del 31-mar al 13-jul-2025): 37,9 % y 75,6 %. Eurostat, noticia «32.7 % of EU people used generative AI tools in 2025» (16-dic-2025): 32,7 % de 16 a 74 años en la UE; por finalidad: personal 25,1 %, trabajo 15,1 %, educación formal 9,4 %; Dinamarca 48,4 %, Estonia 46,6 %, Malta 46,5 %; Rumanía 17,8 %, Italia 19,9 %, Bulgaria 22,5 %. Matiz importante: es uso declarado en una encuesta, «en los tres últimos meses»; no mide cuánto ni para qué. Las encuestas de opinión de otras entidades dan cifras distintas porque preguntan otra cosa (por ejemplo, «alguna vez»).',
        'chart', 'Un gráfico'),

      // 3 · Companies: EU 2021–2025.
      chart('Empresas: de 1 de cada 12 a 1 de cada 5 en la UE',
        { chartType: 'bar', color: '#0e7490', seriesName: 'Empresas (10 o más personas)', grid: true, dataLabels: true, yMin: 0, yMax: 50, yTitle: '% de empresas que usan IA',
          alt: 'Gráfico de barras: porcentaje de empresas de la UE con 10 o más personas que usan IA: 7,7 % en 2021, 8,1 % en 2023, 13,5 % en 2024 y 20,0 % en 2025.',
          data: [{ label: '2021', value: 7.7 }, { label: '2023', value: 8.1 }, { label: '2024', value: 13.5 }, { label: '2025', value: 20 }] },
        `<b>UE, 2025: el 20,0 %</b> (13,5 % en 2024).<br>Dinamarca, 42,0 %; Rumanía, 5,2 %.<br><br><b>España</b> (INE, primer trimestre de 2026): el 33,6 % de las de 10 o más personas y el 21,4 % de las de menos de 10.<br><br><span style="font-size:18px;color:${T.soft}">Son dos encuestas distintas: no se pueden comparar de forma directa.</span>`,
        'Fuentes: Eurostat, noticia del 11-dic-2025 (la serie no incluye 2022); INE, Encuesta TIC y comercio electrónico en las empresas, primer trimestre de 2026 (22-oct-2026).',
        'Eurostat, «20 % of EU enterprises use AI technologies» (11-dic-2025): UE, empresas de 10 o más personas empleadas: 20,0 % en 2025, 13,5 % en 2024, 8,1 % en 2023 y 7,7 % en 2021 (no hay dato de 2022 en la noticia). Mayor uso: Dinamarca 42,0 %, Finlandia 37,8 %, Suecia 35,0 %; menor: Rumanía 5,2 %, Polonia 8,4 %, Bulgaria 8,5 %. Tipos de IA (UE, 2025): analizar lenguaje escrito 11,8 %, generar imágenes, vídeo o audio 9,5 %, generar texto o voz 8,8 %. INE, nota de prensa de 22-oct-2026: 33,6 % de las empresas de 10 o más personas usaron IA en el primer trimestre de 2026 (industria 29,1 %, construcción 22,6 %, servicios 38,2 %); 21,4 % de las de menos de 10. Aviso del INE: desde 2025 la encuesta usa la CNAE-2025 y sus datos no son estrictamente comparables con los de años anteriores. Por eso no se compara la cifra del INE con la de Eurostat ni se afirma que España «supere» a la UE.',
        'computer', 'Un ordenador'),

      // 4 · The AI Act: the calendar, November 2026.
      slideOf([heading('El Reglamento de IA: calendario a noviembre de 2026'),
        tbl([['Fecha', 'Qué se aplica', 'Estado hoy'],
          ['1 ago. 2024', 'Entra en vigor el Reglamento (UE) 2024/1689', 'En vigor'],
          ['2 feb. 2025', 'Prácticas prohibidas y formación en IA', 'Se aplica'],
          ['2 ago. 2025', 'Reglas para los modelos de IA de uso general', 'Se aplica'],
          ['2 ago. 2026', 'Aplicación general, con la transparencia; la Comisión puede sancionar a los proveedores de esos modelos', 'Se aplica'],
          ['2 dic. 2026', 'Nueva prohibición (contenido sexual no consentido y abuso infantil) y marcado de contenidos generados', 'Pendiente'],
          ['2 dic. 2027', 'Alto riesgo: sistemas del Anexo III (empleo, educación…)', 'Aplazado (antes: 2 ago. 2026)'],
          ['2 ago. 2028', 'Alto riesgo: IA en productos regulados (Anexo I)', 'Aplazado (antes: 2 ago. 2027)']],
          70, 132, 1140, 390, { fontSize: 20, colW: [1.2, 4.3, 2.1] }),
        glass('<b>El «ómnibus» (Reglamento (UE) 2026/1744, en vigor desde el 27 de julio de 2026)</b> aplaza el alto riesgo, añade la nueva prohibición, refuerza la Oficina de IA y amplía las ventajas de las pymes. Nada se elimina: se retrasa.', 70, 532, 1140, 76, { fontSize: 19, lineHeight: 1.25, vAlign: 'middle', pad: [8, 22, 8, 22] }),
        source('Fuente: Comisión Europea, «AI Act» (marco regulador de la IA), consultado el 15-nov-2026.', 622)],
      'Calendario del Reglamento (UE) 2024/1689 tal y como queda tras el Reglamento (UE) 2026/1744 («ómnibus digital» de IA), publicado en el DOUE el 24 de julio de 2026 y en vigor desde el 27 de julio de 2026. Fuente principal: página «AI Act» de la Comisión Europea (digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), que da: entrada en vigor 1-ago-2024; prohibiciones y alfabetización 2-feb-2025; gobernanza y modelos de uso general 2-ago-2025; aplicación general 2-ago-2026; prohibición nueva en diciembre de 2026; alto riesgo del Anexo III el 2-dic-2027 y del Anexo I el 2-ago-2028. La página de directrices sobre modelos de uso general añade que la Comisión puede hacer cumplir (con multas) esas obligaciones desde el 2-ago-2026 y que los modelos anteriores a agosto de 2025 tienen hasta el 2-ago-2027. Los días exactos del 2-dic-2026 (nueva prohibición y plazo del marcado de contenidos del artículo 50.2) salen de resúmenes jurídicos del texto (Future of Privacy Forum, Law and Technology): comprobarlos en EUR-Lex. «Se aplica» significa que la fecha ya ha pasado. Los sistemas del Anexo III incluyen usos en empleo y en educación. EL «ÓMNIBUS»: propuesta de la Comisión el 19-nov-2025; acuerdo político entre Parlamento y Consejo el 7-may-2026; en vigor el 27-jul-2026. Según la Comisión, aplaza el alto riesgo, añade la prohibición de los sistemas que generan material sexual no consentido o de abuso infantil, refuerza las competencias de la Oficina de IA, extiende los requisitos simplificados de las pymes a las empresas medianas pequeñas (small mid-caps), da más acceso a bancos de pruebas (incluido uno europeo) y aclara la relación con la legislación de seguridad de productos (por ejemplo, maquinaria). Varios análisis jurídicos señalan que la formación en IA (artículo 4) pasó de «garantizar» a «fomentar»: comprobar en EUR-Lex. Nada se elimina: se retrasa. Lectura: hay quien ve en el aplazamiento una simplificación necesaria y quien ve una pérdida de protección; los hechos son las fechas.'),

      // 6 · Work: exposure is not job loss.
      chart('Empleo: «expuesto» no es lo mismo que «perdido»',
        { chartType: 'bar', color: '#6d28d9', seriesName: '% del empleo expuesto a la IA', grid: true, dataLabels: true, yMin: 0, yMax: 80, yTitle: '% del empleo expuesto (FMI, 2024)',
          alt: 'Gráfico de barras: porcentaje aproximado del empleo expuesto a la IA según el FMI: mundo, casi 40 %; economías avanzadas, alrededor del 60 %; mercados emergentes, 40 %; países de renta baja, 26 %.',
          data: [{ label: 'Mundo', value: 40 }, { label: 'Economías avanzadas', value: 60 }, { label: 'Emergentes', value: 40 }, { label: 'Renta baja', value: 26 }] },
        `<b>Exposición</b> mide qué tareas podría hacer la IA, no cuántos empleos desaparecen.<br><br><b>FMI (2024):</b> en las economías avanzadas, la mitad de los puestos expuestos podría ganar productividad y en la otra mitad la IA haría tareas clave.<br><br><b>OIT (2025):</b> solo el 3,3 % del empleo mundial está en el grupo de mayor exposición.`,
        'Fuentes: FMI, blog de K. Georgieva (14-ene-2024); OIT, Documento de trabajo 140 (20-may-2025). Cifras aproximadas y anteriores a 2026.',
        'FMI, blog «AI Will Transform the Global Economy. Let’s Make Sure It Benefits Humanity» (K. Georgieva, 14-ene-2024): casi el 40 % del empleo mundial está expuesto a la IA; en economías avanzadas, alrededor del 60 %; en mercados emergentes, el 40 %; en países de renta baja, el 26 %. En economías avanzadas, aproximadamente la mitad de los puestos expuestos podría beneficiarse de la integración de la IA y, en la otra mitad, la IA podría hacer tareas clave, con menos demanda de trabajo, salarios y contratación. OIT y NASK, «Generative AI and Jobs: A Refined Global Index of Occupational Exposure» (Documento de trabajo 140, 20-may-2025): el 3,3 % del empleo mundial está en la categoría de mayor exposición (4,7 % del empleo femenino y 2,4 % del masculino); en países de renta alta, la exposición total es del 34 % del empleo, frente al 11 % en los de renta baja. La OIT insiste en que lo más probable es la transformación de los empleos, no su eliminación. Son estimaciones de exposición (datos de 2023-2024), no pérdidas medidas.',
        'zoom', 'Una lupa'),

      // 7 · Work: what the data say and what they do not.
      columns('Empleo en 2026: lo que se ve y lo que no',
        [[T.cols[3], 'Lo que se ve', ul('Sin señales de desplazamiento generalizado por la IA en los sectores (OCDE, jun. 2026)', 'Las vacantes de los sectores más expuestos crecieron más que las demás, salvo en EE. UU.', 'La falta de competencias digitales frena su adopción')],
         [T.cols[0], 'Lo que preocupa', ul('Jóvenes que empiezan: evidencia preliminar y desigual', 'Más desigualdad: ganan más las personas muy cualificadas (FMI, ene. 2026)', 'Cerca de 1 de cada 10 vacantes avanzadas pide una competencia nueva')],
         [T.cols[2], 'Cómo leerlo', ul('Son pocos años de datos', 'La exposición no es despido', 'Un anuncio de una empresa no es una estadística', 'Lo que valga hoy puede cambiar: mira la fecha')]],
        'OCDE, Perspectivas Económicas (junio de 2026), valoración general: «no hay señales de desplazamiento laboral generalizado debido a la adopción de IA por las empresas a nivel de sector»; las vacantes de las industrias más expuestas a la IA aumentaron más que las de otros sectores en el año hasta abril de 2026 en la mayoría de economías con datos, con EE. UU. como excepción notable; otro análisis de la OCDE no halla sustitución de trabajadores por IA y señala que la falta de personas con competencias digitales es un freno para adoptarla. OCDE, Perspectivas de Empleo 2026 (julio de 2026): algunos estudios no hallan efectos significativos en el empleo y otros sugieren un impacto desproporcionado en quienes empiezan su carrera; la OCDE califica esa conclusión de preliminar. FMI, nota de debate SDN/2026/001 «Bridging Skill Gaps for the Future: New Jobs Creation in the AI Age» (enero de 2026): alrededor de una de cada diez vacantes en economías avanzadas exige al menos una competencia nueva (en emergentes, la mitad); las nuevas competencias suben salarios y empleo en conjunto, pero aumentan la polarización (ganan sobre todo las muy cualificadas y, por el consumo de servicios, las poco cualificadas) y se asocian a menos empleo en ocupaciones muy expuestas y poco complementarias. Los textos íntegros de la OCDE no se pudieron abrir (acceso denegado): las frases proceden de su texto citado en búsquedas; comprobar en oecd.org.',
        'Fuentes: OCDE, Perspectivas Económicas (jun-2026) y de Empleo (jul-2026); FMI, nota SDN/2026/001 (ene-2026).'),

      // 8 · Energy.
      chart('Centros de datos: el doble de electricidad en 2030 (previsión)',
        { chartType: 'bar', color: '#c2410c', seriesName: 'TWh', grid: true, dataLabels: true, yMin: 0, yMax: 1100, yTitle: 'TWh de electricidad al año',
          alt: 'Gráfico de barras: electricidad que consumen los centros de datos en el mundo: 415 TWh en 2024, 485 TWh en 2025 y 950 TWh previstos para 2030.',
          data: [{ label: '2024', value: 415, color: '#0e7490' }, { label: '2025', value: 485, color: '#0e7490' }, { label: '2030 (previsión)', value: 950, color: '#fdba74' }] },
        `<b>+17 %</b> en 2025, frente al +3 % de toda la demanda eléctrica mundial.<br><b>+50 %</b> en los centros de datos dedicados a la IA.<br><br>Previsión de la AIE: alrededor del 3 % de la electricidad mundial en 2030.<br><br>Cada tarea de IA gasta cada vez menos, pero se hacen muchas más.`,
        'Fuente: AIE, «Energy and AI» (2025: dato de 2024) y «Key Questions on Energy and AI» (16-abr-2026: datos de 2025 y previsión). La barra de 2030 es una previsión, no un dato.',
        'Agencia Internacional de la Energía (AIE). «Energy and AI» (2025): en 2024 los centros de datos consumieron unos 415 TWh, alrededor del 1,5 % de la electricidad mundial (EE. UU. 45 %, China 25 %, Europa 15 % de ese consumo). «Key Questions on Energy and AI» (16-abr-2026): la demanda eléctrica de los centros de datos creció un 17 % en 2025 (la de toda la electricidad, un 3 %), la de los centros centrados en IA un 50 %; la previsión central es pasar de 485 TWh en 2025 a 950 TWh en 2030, alrededor del 3 % de la demanda mundial de electricidad; «medida por tarea, la eficiencia energética de la IA mejora a un ritmo sin precedentes en la historia de la energía». La previsión depende del mercado y de la financiación, y de cuellos de botella (turbinas, transformadores, chips, conexiones a la red). El informe de 2025 hablaba de 945 TWh en 2030 partiendo de 415 TWh en 2024; el de 2026, de 950 TWh partiendo de 485 TWh en 2025: es la misma previsión, con los datos al día.',
        'flash', 'Un rayo'),

      // 9 · Education: teachers (TALIS 2024).
      chart('En el aula: un tercio del profesorado ya la ha usado',
        { chartType: 'hbar', color: '#15803d', grid: false, dataLabels: true, xTitle: '% que la usó en el último año',
          alt: 'Gráfico de barras horizontales: porcentaje del profesorado de secundaria baja que usó IA en su trabajo en el último año, TALIS 2024: Australia 66, Estados Unidos 43, Países Bajos 37, media de la OCDE 36, España 35, Suecia 31, Francia 14.',
          data: [{ label: 'Australia', value: 66 }, { label: 'EE. UU.', value: 43 }, { label: 'Países Bajos', value: 37 }, { label: 'Media OCDE', value: 36, color: '#1d2433' }, { label: 'España', value: 35, color: '#c2410c' }, { label: 'Suecia', value: 31 }, { label: 'Francia', value: 14 }] },
        `Profesorado de <b>secundaria baja</b> que usó IA en su trabajo en los 12 meses anteriores a la encuesta de 2024.<br><br>De quienes <b>no</b> la usaron, el <b>75 %</b> (en España y en la OCDE) dice que no tiene los conocimientos ni las habilidades.`,
        'Fuente: OCDE, TALIS 2024 (resultados publicados el 7-oct-2025), notas por país. Datos de 2024: la situación de 2026 puede ser otra.',
        'OCDE, TALIS 2024 «Results from TALIS 2024: The State of Teaching» (7-oct-2025) y notas por país: el 36 % del profesorado de secundaria baja de la media de la OCDE declara haber usado IA en su trabajo en los 12 meses anteriores; España 35 %, Estados Unidos 43 %, Países Bajos 37 %, Suecia 31 %, Australia 66 %, Francia 14 %. De quienes no la usaron para enseñar, el 75 % (en España y en la media de la OCDE) dijo que carece de conocimientos y habilidades (el 33 % en España cita falta de infraestructura; media OCDE 37 %). La encuesta es de 2024, anterior al auge de 2025-2026: conviene tratarla como punto de partida.',
        'notebook', 'Un cuaderno'),

      // 10 · Education: students and universities.
      columns('Alumnado y universidad: qué muestran las evaluaciones',
        [[T.cols[1], 'PISA 2025 (sept. 2026)', 'Quien usa IA para resumir, buscar o redactar saca de media unos <b>20 puntos menos</b> en ciencias (como un curso). Quien la usa para aprender una o dos veces por semana, un resultado parecido al de quien no la usa. <b>Es una correlación, no una causa.</b>'],
         [T.cols[3], 'OCDE (ene. 2026)', 'La IA generativa de uso general mejora el <b>rendimiento en la tarea</b>, pero no siempre el <b>aprendizaje</b>. Con un diseño pedagógico claro puede ayudar a aprender.'],
         [T.cols[2], 'UNESCO (sept. 2025)', 'Encuesta a 400 cátedras y redes de 90 países: el 19 % tiene una política formal de IA y el 42 % la está elaborando. Muestra <b>no representativa</b>.']],
        'PISA 2025 (primeros resultados publicados el 8-sep-2026; informe sobre aprendizaje en el mundo digital: mayo de 2027). Fuente: blog «Education and Skills Today» de la OCDE, «Generative AI and student learning: what the PISA data reveal» (A. Schleicher, 13-oct-2026): quienes usan chatbots de IA para resumir textos, investigar o redactar sacan de media unos 20 puntos menos en ciencias que quienes no los usan (aproximadamente un curso escolar); quienes los usan una o dos veces por semana para aprender rinden de forma similar a quienes no los usan (media OCDE); en Canadá y Nueva Zelanda la diferencia es de 29 y 36 puntos, y en Tailandia y Macao (China) es positiva; las estimaciones de Canadá y Nueva Zelanda requieren cautela. El autor advierte que los resultados no representan necesariamente una relación causal (puede que el alumnado que va peor recurra más a la IA). OCDE, Digital Education Outlook 2026 (enero de 2026): las herramientas generales de IA generativa pueden mejorar el rendimiento en las tareas, pero no llevan necesariamente a mejorar el aprendizaje. UNESCO, encuesta de cátedras y redes UNITWIN (2-sep-2025): 400 respuestas de 90 países; el 19 % tiene una política formal de IA y el 42 % la está elaborando (en total, casi dos tercios); alrededor del 90 % usa herramientas de IA en su trabajo. Es una muestra de quien responde, no representativa de todas las universidades.',
        'Fuentes: OCDE (PISA 2025, 8-sep-2026; blog del 13-oct-2026; Digital Education Outlook 2026); UNESCO (2-sep-2025).', 440, 23),

      // 11 · Risks.
      slideOf([heading('Riesgos: qué dicen las fuentes y cómo trabajarlos'),
        tbl([['Riesgo', 'Qué dicen las fuentes', 'Para trabajar en clase'],
          ['Desinformación', 'Foro Económico Mundial (2026): 2.º riesgo a dos años. Marcado de los contenidos generados por IA: desde el 2 de diciembre de 2026', 'Contrastar con dos fuentes; ver quién publica y cuándo'],
          ['Sesgos', 'La IA que decide sobre empleo o educación es de «alto riesgo»: sus obligaciones, desde el 2 de diciembre de 2027', 'Preguntar con qué datos se entrenó y quién revisa la decisión'],
          ['Derechos de autor', 'Desde agosto de 2025, los proveedores de modelos de uso general deben tener una política de derechos de autor y resumir sus datos de entrenamiento. Código de buenas prácticas: 22 firmantes', 'Citar el uso de la IA; comprobar la licencia de lo que se publica']],
          70, 140, 1140, 440, { fontSize: 21, colW: [1.3, 4, 2.6] }),
        source('Fuentes: Foro Económico Mundial, Informe de Riesgos Globales 2026 (enero de 2026); Comisión Europea (AI Act, directrices y Código de buenas prácticas de IA de uso general).')],
      'Foro Económico Mundial, Global Risks Report 2026 (enero de 2026, encuesta a más de 1.300 personas expertas): la desinformación ocupa el 2.º puesto entre los riesgos a dos años (la confrontación geoeconómica, el 1.º) y el 4.º a diez años; los resultados adversos de la IA pasan del puesto 30 a dos años al 5.º a diez años, la mayor subida de los 33 riesgos. Se comprobó en los resúmenes oficiales del Foro (la página no se pudo abrir). Comisión Europea: el Código de buenas prácticas de IA de uso general se publicó el 10-jul-2025, con capítulos de transparencia, derechos de autor y seguridad; en la página aparecen 22 empresas firmantes (xAI firmó solo el de seguridad) y la lista puede ampliarse. Las obligaciones de los modelos de uso general se aplican desde el 2-ago-2025 y la Comisión puede sancionarlas desde el 2-ago-2026. No se incluyen cifras de pleitos por derechos de autor ni de casos de sesgo porque no se han contrastado con una fuente oficial. Para trabajar: pedir ejemplos reales y comprobarlos.'),

      // 12 · What can be done.
      columns('Qué se puede hacer',
        [[T.cols[1], 'A título personal', ul('Contrastar lo que genera la IA con una fuente fiable', 'Decir cuándo y para qué la has usado', 'No pegar datos personales ni de otras personas', 'Formarte: la falta de competencias digitales es el freno principal (OCDE)')],
         [T.cols[0], 'En el centro, la empresa o la sociedad', ul('Acordar normas de uso: qué se permite y cómo se cita', 'Formar al profesorado y a las plantillas: el 75 % de quien no la usa dice que le falta formación (TALIS)', 'Seguir el calendario del Reglamento: 2 de diciembre de 2026 y 2 de diciembre de 2027', 'Pedir transparencia a los proveedores sobre datos y marcado de contenidos')]],
        'Propuestas que se apoyan en las diapositivas anteriores (OCDE: freno de competencias digitales; TALIS 2024: 75 % de falta de conocimientos; Reglamento de IA: fechas de diciembre de 2026 y diciembre de 2027). Son sugerencias, no recomendaciones oficiales: cada centro o empresa decide. Pedir al grupo que añada una medida a cada columna.', null, 440),

      // 13 · Poll.
      slideOf([poll('¿Qué aspecto de la IA te preocupa más?', ['El empleo', 'La desinformación', 'Los sesgos y la discriminación', 'Los derechos de autor', 'El consumo de energía', 'Cómo afecta al aprendizaje'])],
        'Votación en vivo. Pedir que cada persona justifique su voto en una frase y buscar en las diapositivas anteriores qué dato apoya o matiza esa preocupación.'),

      // 14 · Debate with timer.
      slideOf([heading('Para debatir (5 minutos)'),
        glass(ul('Si más de la mitad de la población usa IA, ¿qué normas de uso necesitamos?', 'Exposición o pérdida de empleo: ¿qué datos nos faltan para saberlo?', '¿Es razonable aplazar una norma cuando la tecnología cambia tan deprisa?', '¿Cuándo compensa el gasto de energía de una herramienta de IA?'), 70, 150, 760, 430, { fontSize: 26, lineHeight: 1.35, vAlign: 'middle' }),
        timer(300, 880, 190, 300, { color: T.acc, endText: '¡Tiempo!' }), credit],
        'Debate en grupos de cuatro: una pregunta por grupo y cinco minutos. Que cada grupo apoye su respuesta en una cifra de la presentación y diga de qué organismo y de qué año es. Neutral: aceptar posturas distintas siempre que se apoyen en datos.'),

      // 15 · Sources and date.
      slideOf([heading('Fuentes y fecha de consulta'),
        tbl([['Organismo — documento', 'Enlace', 'Consultado'],
          ['INE — Encuesta TIC en hogares 2026 y 2025', 'ine.es/dyngs/Prensa/TICH2026.htm', '15-nov-2026'],
          ['INE — TIC y comercio electrónico en empresas, 1.er trim. 2026', 'ine.es/dyngs/Prensa/ETICCE20251T2026.htm', '15-nov-2026'],
          ['Eurostat — empresas (11-dic-2025) y personas (16-dic-2025) que usan IA', 'ec.europa.eu/eurostat/…/ddn-20251211-2', '15-nov-2026'],
          ['Comisión Europea — AI Act, directrices y Código de buenas prácticas', 'digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai', '15-nov-2026'],
          ['Reglamento (UE) 2026/1744 (DOUE, 24-jul-2026)', 'eur-lex.europa.eu/eli/reg/2026/1744/oj', 'por resúmenes'],
          ['FMI — blog (14-ene-2024) y nota SDN/2026/001 (ene-2026)', 'imf.org/en/publications/staff-discussion-notes', '15-nov-2026'],
          ['OIT — Documento de trabajo 140 (20-may-2025)', 'ilo.org/publications/generative-ai-and-jobs-…', '15-nov-2026'],
          ['OCDE — Perspectivas Económicas (jun-2026) y de Empleo (jul-2026)', 'oecd.org/en/publications', 'por resúmenes'],
          ['AIE — Energy and AI (2025) y Key Questions on Energy and AI (16-abr-2026)', 'iea.org/reports/key-questions-on-energy-and-ai', '15-nov-2026'],
          ['OCDE — TALIS 2024, PISA 2025 y Digital Education Outlook 2026', 'oecdedutoday.com/generative-ai-and-student-learning-…', '15-nov-2026'],
          ['UNESCO — encuesta sobre IA en educación superior (2-sep-2025)', 'unesco.org/en/articles/unesco-survey-two-thirds-…', '15-nov-2026'],
          ['Foro Económico Mundial — Informe de Riesgos Globales 2026', 'weforum.org/publications/global-risks-report-2026', 'por resúmenes']],
          70, 128, 1140, 432, { fontSize: 14, colW: [4.1, 4.3, 1.9] }),
        glass(`<b style="color:${deep(T.acc, '#ffffff')}">Antes de presentarla: comprueba si hay datos nuevos.</b> Revisa sobre todo las fechas del Reglamento de IA (EUR-Lex) y las cifras del INE y de Eurostat, que se actualizan cada año.`, 70, 574, 1000, 96, { fontSize: 20, lineHeight: 1.3, vAlign: 'middle', pad: [10, 22, 10, 22] }),
        on(ico('tick', 1100, 568, 110, 'Una marca de verificación'), 'zoom-in', { start: 'withPrev' }), credit],
        'Última diapositiva: fuentes y fecha de consulta (15 de noviembre de 2026). Enlaces completos: INE https://www.ine.es/dyngs/Prensa/TICH2026.htm , https://www.ine.es/dyngs/Prensa/TICH2025.htm , https://www.ine.es/dyngs/Prensa/ETICCE20251T2026.htm ; Eurostat https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20251211-2 y https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20251216-3 ; Comisión Europea https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai , https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers , https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai ; Reglamento (UE) 2026/1744 https://eur-lex.europa.eu/eli/reg/2026/1744/oj (el texto no se pudo abrir: fechas de diciembre de 2026 por resúmenes jurídicos); FMI https://www.imf.org/en/blogs/articles/2024/01/14/ai-will-transform-the-global-economy-lets-make-sure-it-benefits-humanity y https://www.imf.org/en/publications/staff-discussion-notes/issues/2026/01/09/bridging-skill-gaps-for-the-future-new-jobs-creation-in-the-ai-age-572136 ; OIT https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure ; OCDE https://www.oecd.org/en/publications/oecd-employment-outlook-2026_7e710f54-en/full-report.html y el Economic Outlook de junio de 2026 (acceso denegado: citado a través de resúmenes del texto); AIE https://www.iea.org/reports/energy-and-ai/executive-summary y https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary ; TALIS https://www.oecd.org/en/publications/results-from-talis-2024-country-notes_e127f9e2-en/spain_27b4ffaa-en.html ; PISA https://oecdedutoday.com/generative-ai-and-student-learning-what-the-pisa-data-reveal/ ; UNESCO https://www.unesco.org/en/articles/unesco-survey-two-thirds-higher-education-institutions-have-or-are-developing-guidance-ai-use ; Foro Económico Mundial https://www.weforum.org/publications/global-risks-report-2026/ . Qué cambia deprisa: el calendario del Reglamento (nuevas reformas), las encuestas anuales (INE publica a mediados de noviembre; Eurostat, a mediados de diciembre) y las previsiones de energía.'),
    ])) },
};
