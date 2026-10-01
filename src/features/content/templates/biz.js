// Example presentations: Empresa. Each one: { name, summary, cat: 'biz', make() } → a deck
// (see kit.js for the builders). All the companies, people and figures are made up.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, lib3d, base } from './kit.js';

// ---- Helpers ---------------------------------------------------------------------
const head = k => pairStacks(k).heading;
// One after another: the first on a click, the rest right after it.
const chain = (i, effect = 'fade-up', props = {}) => A(effect, { start: i ? 'afterPrev' : 'click', ...props });
// Pie and doughnut slices take these colours, in order (their legend is drawn by hand).
const PIE = ['#3f6497', '#c0392b', '#2b7a3b', '#d68910', '#7d3c98', '#16a085'];
const legend = (items, x, y, w, color, size = 22) => text(items.map(([c, l]) =>
  `<div style="margin:0 0 ${Math.round(size * 0.55)}px"><span style="display:inline-block;width:${size * 0.8}px;height:${size * 0.8}px;border-radius:4px;background:${c};vertical-align:-1px;margin-right:12px"></span>${l}</div>`).join(''),
x, y, w, Math.round(items.length * size * 1.9) + 10, { fontSize: size, color });
// A small label in capitals with spacing (kickers over the titles).
const kicker = (s, x, y, w, color, size = 22) => text(s, x, y, w, size + 16, { fontSize: size, letterSpacing: 5, color, fontWeight: 700 });

export default {

  // 1 · Strategic plan and OKRs: clean white, blue and orange.
  biz_strategy: { name: 'Plan estratégico y OKR', cat: 'biz', summary: 'Estilo limpio en blanco: cifras que entran en cadena, pirámide, prioridades con iconos, tabla de OKR, barras de avance, radar y galones', make: () => {
    const B = '#156082', O = '#e97132', G = '#196b24', LB = '#0f9ed5', INK = '#1f1f1f';
    const prio = [['location', B, '01', 'Crecer en el sur de Europa', 'Abrir Oporto y Lyon y vender fuera de España uno de cada cuatro euros.'],
      ['heart', O, '02', 'Clientes que repiten', 'Renovar nueve de cada diez contratos con un servicio sin sorpresas.'],
      ['gear', G, '03', 'Operación eficiente', 'Menos kilómetros en vacío y un coste por envío un 8 % más bajo.']];
    return numbered(build({ name: 'Plan estratégico 2027', palette: 'office', fonts: 'modern', title: { size: 48 },
      decor: p => [shape('rect', 0, 0, 1280, 8, p.accents[0]), shape('rect', 0, 0, 240, 8, p.accents[1])] }, [
      { layout: 'blank', transition: 'fade', extra: [
        shape('rect', 820, 0, 460, 720, B, { fill2: LB, gradAngle: 135 }),
        shape('ellipse', 1010, -120, 360, 360, '#ffffff', { opacity: 10 }),
        text('2027', 840, 470, 420, 200, { fontFamily: head('modern'), fontSize: 150, fontWeight: 800, color: '#ffffff', opacity: 30, textAlign: 'right' }),
        text(ul('3 prioridades', '6 resultados clave', '4 trimestres'), 860, 150, 380, 220, { fontSize: 30, color: '#ffffff' }),
        kicker('PLAN ESTRATÉGICO · OKR', 90, 190, 660, O),
        text('<b>Crecer<br>con foco</b>', 90, 240, 680, 210, { fontFamily: head('modern'), fontSize: 88, lineHeight: 1.05, color: INK }),
        shape('rect', 92, 470, 120, 6, O),
        text('Nortia Logística · Comité de dirección · enero de 2027', 90, 500, 700, 50, { fontSize: 26, color: '#5a5a5a' })],
        notes: 'Portada con un bloque de color en degradado a la derecha. Nortia es una empresa inventada: todas las cifras de esta presentación son de ejemplo.' },
      { title: 'De dónde partimos', layout: 'titleOnly', extra: [
        ...[['38 M€', 'facturación en 2026', B], ['+11 %', 'crecimiento anual', O], ['92 %', 'entregas a tiempo', G]].map(([n, l, c], i) =>
          withAnims(big(n, l, 90 + i * 380, 210, c, INK), chain(i, 'zoom-in'))),
        withAnims(text('Crecemos por encima del sector (+6 %), pero el margen operativo ha bajado dos puntos: el reto de 2027 es crecer <b>sin perder rentabilidad</b>.', 90, 480, 1100, 100, { fontSize: 28, color: '#404040' }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Un clic y las tres cifras entran una tras otra (después de la anterior). Insistir en la última frase: crecer sí, pero con margen.' },
      { title: 'Visión, objetivos e iniciativas', layout: 'titleOnly', extra: [
        dg('pyramid', 'Visión\nObjetivos\nIniciativas', 90, 180, 560, 460, { colors: 'accent', oneByOne: true }),
        card('«Ser en 2030 la red logística de referencia del sur de Europa: entregas a tiempo, sin sorpresas y con la mitad de emisiones.»', 720, 210, 470, 290, '#eef4f8', { fontSize: 30, fontStyle: 'italic', color: INK, vAlign: 'middle' }),
        shape('rect', 720, 210, 8, 290, B),
        text('— Visión 2030, aprobada por el consejo', 720, 520, 470, 40, { fontSize: 22, color: '#5a5a5a' })],
        notes: 'La pirámide va de lo más estable (la visión) a lo que cambia cada trimestre (las iniciativas). Se muestra por niveles, uno por clic.' },
      { title: 'Tres prioridades para 2027', layout: 'titleOnly', extra: prio.flatMap(([ic, c, n, h, d], i) => { const x = 90 + i * 385;
        return [withAnims(card(`<div style="font-size:22px;font-weight:700;letter-spacing:3px;color:${c};margin-top:84px">${n}</div><div style="font-size:31px;font-weight:700;line-height:1.15;margin:6px 0 14px">${h}</div><div style="font-size:22px;color:#404040">${d}</div>`,
          x, 190, 340, 380, '#f3f6f9', { color: INK, radius: 14 }), A('fade-up', { start: 'click' })),
        withAnims(shape('rect', x, 190, 340, 8, c), A('fade-in', { start: 'withPrev' })),
        withAnims(icon(ic, x + 26, 222, 56, c), A('zoom-in', { start: 'withPrev' }))]; }),
        notes: 'Cada prioridad entra con un clic, con su icono y su color. Son las tres de las que cuelgan los OKR de la siguiente diapositiva.' },
      { title: 'Los OKR del año', layout: 'titleOnly', extra: [tableBlock({ x: 90, y: 180, w: 1100, h: 440, fontSize: 22, header: true, headBg: B, headFg: '#ffffff', stroke: '#c8d3dc', banded: true, band: B,
        rows: [['Objetivo', 'Resultado clave', 'Meta', 'Responsable'],
          ['<b>O1 · Crecer en el sur de Europa</b>', 'KR1 · Ventas fuera de España', '25 %', 'Internacional'],
          ['', 'KR2 · Centros abiertos en Oporto y Lyon', '2', 'Operaciones'],
          ['<b>O2 · Clientes que repiten</b>', 'KR3 · Contratos renovados', '90 %', 'Ventas'],
          ['', 'KR4 · NPS de clientes', '≥ 45', 'Clientes'],
          ['<b>O3 · Operación eficiente</b>', 'KR5 · Coste por envío', '−8 %', 'Operaciones'],
          ['', 'KR6 · Kilómetros en vacío', '< 12 %', 'Flota']], colW: [4, 5, 1.5, 2.3] })],
        notes: 'Tres objetivos, dos resultados clave cada uno, todos medibles y con una persona responsable. Las metas son de ejemplo.' },
      { title: 'Cómo vamos: avance al cerrar marzo', layout: 'titleOnly', extra: [
        chartBlock({ x: 90, y: 175, w: 760, h: 460, chartType: 'hbar', color: B, dataLabels: true, seriesName: '% de la meta',
          data: [{ label: 'KR1 Ventas fuera', value: 38 }, { label: 'KR2 Centros', value: 50 }, { label: 'KR3 Renovación', value: 82 }, { label: 'KR4 NPS', value: 64 }, { label: 'KR5 Coste', value: 45 }, { label: 'KR6 Vacío', value: 18 }] }),
        withAnims(card('<div style="font-size:72px;font-weight:800;line-height:1;color:#e97132">5 de 6</div><div style="margin-top:14px">resultados clave van por encima del 25 % que tocaba a final de marzo.</div><div style="margin-top:14px;color:#c0392b"><b>KR6</b> necesita un plan: rutas de vuelta compartidas.</div>',
          900, 200, 290, 420, '#fdf1ea', { fontSize: 23, color: INK }), A('fade-left'))],
        notes: 'Barras horizontales con etiquetas de datos: el porcentaje de la meta anual conseguido. Clic: la conclusión.' },
      { title: 'Autodiagnóstico de capacidades', layout: 'titleOnly', extra: [
        chartBlock({ x: 60, y: 165, w: 580, h: 490, chartType: 'radar', color: B,
          data: [{ label: 'Tecnología', value: 3 }, { label: 'Red propia', value: 4 }, { label: 'Marca', value: 3.5 }, { label: 'Talento', value: 4 }, { label: 'Emisiones', value: 2 }, { label: 'Servicio', value: 4.5 }] }),
        text('Puntuación de 1 a 5 del comité de dirección', 640, 190, 550, 40, { fontSize: 22, color: '#5a5a5a' }),
        withAnims(card('<b style="color:#c0392b">Emisiones · 2/5</b><br>Flota eléctrica en tres ciudades antes de diciembre.', 640, 250, 550, 170, '#fbeeee', { fontSize: 26, color: INK }), A('fade-left')),
        withAnims(card('<b style="color:#156082">Tecnología · 3/5</b><br>Seguimiento en tiempo real para todos los clientes.', 640, 450, 550, 170, '#eef4f8', { fontSize: 26, color: INK }), A('fade-left', { start: 'afterPrev' }))],
        notes: 'El radar enseña de un vistazo dónde somos fuertes y dónde no. Las dos brechas más grandes se convierten en iniciativas.' },
      { title: 'Hoja de ruta por trimestres', layout: 'titleOnly', extra: [
        dg('chevrons', 'T1\n  Plan de apertura en Oporto\nT2\n  Portal de clientes nuevo\nT3\n  Centro de Lyon operativo\nT4\n  Flota eléctrica en 3 ciudades', 90, 200, 1100, 400, { oneByOne: true })],
        notes: 'Galones uno a uno: un trimestre por clic. Cada hito tiene detrás un resultado clave.' },
      { layout: 'section', title: 'Un año, tres prioridades, un equipo', subtitle: 'Próxima revisión de los OKR: 15 de abril', transition: 'zoom',
        notes: 'Cierre: recordar la fecha de la próxima revisión y abrir el turno de preguntas.' },
    ]));
  } },

  // 2 · Quarterly results for the board: dark navy, gold details, serious type.
  biz_board: { name: 'Resultados trimestrales al consejo', cat: 'biz', summary: 'Azul oscuro y dorado: indicadores grandes animados con sonido, cascada, embudo, barras apiladas y tabla con fórmulas frente a presupuesto', make: () => {
    const BG = '#0f2940', A1 = '#4a90d9', A2 = '#7fb8e6', GOLD = '#f5a623', MINT = '#50e3c2', W = '#f2f6fa';
    const kpis = [['12,4&nbsp;M€', 'ingresos', '▲ 3 % sobre presupuesto', MINT], ['+14 %', 'frente al T3 de 2025', '▲ 2 puntos sobre el plan', MINT],
      ['2,1&nbsp;M€', 'EBITDA', '▲ 0,2 M€ sobre el plan', MINT], ['17 %', 'margen EBITDA', '▼ 1 punto bajo el plan', '#ff8a80']];
    return numbered(build({ name: 'Veltra · Resultados T3 2026', palette: 'ocean', fonts: 'clean', title: { size: 46, color: '#ffffff' },
      decor: () => [text('CONFIDENCIAL · CONSEJO DE ADMINISTRACIÓN', 760, 24, 480, 28, { fontSize: 14, letterSpacing: 3, color: A2, textAlign: 'right' }),
        shape('rect', 100, 690, 1080, 1, '#ffffff22')] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(700, -260, 860, A1, BG, 45), glow(-320, 380, 720, MINT, BG, 22),
        kicker('VELTRA ENERGÍA', 100, 180, 700, GOLD, 24),
        text('<b>Resultados del<br>tercer trimestre</b>', 100, 230, 980, 220, { fontFamily: head('clean'), fontSize: 84, lineHeight: 1.05, color: '#ffffff' }),
        shape('rect', 102, 475, 110, 5, GOLD),
        text('Consejo de administración · 21 de octubre de 2026', 100, 505, 900, 50, { fontSize: 28, color: A2 })],
        notes: 'Veltra Energía es una empresa inventada; las cifras son de ejemplo. Objetivo de la sesión: aprobar el presupuesto de 2027 y la cobertura de paneles.' },
      { title: 'El trimestre en cuatro cifras', layout: 'titleOnly', bg: BG, extra: [
        ...kpis.flatMap(([n, l, d, dc], i) => { const x = 100 + i * 275;
          return [withAnims(shape('rounded', x, 200, 255, 250, '#ffffff', { opacity: 8, radius: 16 }), chain(i, 'zoom-in', { duration: 500, ...(i === 0 && { sound: 'chime' }) })),
            withAnims(shape('rect', x, 200, 255, 6, i === 3 ? '#ff8a80' : GOLD), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-size:54px;font-weight:800;line-height:1.1;color:#ffffff">${n}</div><div style="font-size:23px;color:${A2};margin-bottom:14px">${l}</div><div style="font-size:19px;color:${dc}">${d}</div>`,
              x + 18, 230, 225, 200, { textAlign: 'left', color: W }), A('fade-up', { start: 'withPrev' }))]; }),
        withAnims(text('El mejor trimestre de nuestra historia en ingresos. El margen baja por el coste de los paneles importados, ya cubierto al 80 % para 2027.', 100, 500, 1080, 110, { fontSize: 27, color: A2 }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Un solo clic: las cuatro tarjetas entran en cadena y suena una campanilla con la primera (Animaciones ▸ Sonido). Detenerse en el margen: es la única cifra bajo el plan.' },
      { title: 'Del ingreso al EBITDA (M€)', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 100, y: 180, w: 1080, h: 460, chartType: 'waterfall', color: MINT,
        data: [{ label: 'Ingresos', value: 12.4 }, { label: 'Compras', value: -6.1 }, { label: 'Personal', value: -2.6 }, { label: 'Operación', value: -1.1 }, { label: 'Otros gastos', value: -0.5 }, { label: 'Total EBITDA', value: 0 }] })],
        notes: 'Gráfico de cascada: cada barra parte de donde acabó la anterior y la última («Total…») se calcula sola.' },
      { title: 'Cartera comercial', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 100, y: 180, w: 640, h: 460, chartType: 'funnel', color: A1,
          data: [{ label: 'Contactos', value: 420 }, { label: 'Estudios', value: 160 }, { label: 'Ofertas', value: 74 }, { label: 'Firmados', value: 31 }] }),
        withAnims(text(`<div style="font-size:64px;font-weight:800;color:${GOLD};line-height:1.1">42 %</div><div>de las ofertas acaban firmadas (35 % hace un año).</div><div style="margin-top:20px;color:${A2}">El cuello de botella está en los estudios técnicos: proponemos dos ingenieros más.</div>`,
          790, 220, 390, 400, { fontSize: 27, color: W }), A('fade-left'))],
        notes: 'Embudo de ventas: proyectos de autoconsumo para empresas. La conclusión entra con un clic.' },
      { title: 'Ingresos por línea de negocio (M€)', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 100, y: 175, w: 1080, h: 470, chartType: 'stacked', color: A1, seriesName: 'Solar', grid: true,
        data: [{ label: 'T1 25', value: 5.1 }, { label: 'T2 25', value: 5.8 }, { label: 'T3 25', value: 6.2 }, { label: 'T4 25', value: 5.9 }, { label: 'T1 26', value: 5.7 }, { label: 'T2 26', value: 6.6 }, { label: 'T3 26', value: 7.3 }],
        series: [{ name: 'Eólica', values: [2.4, 2.2, 2.0, 2.6, 2.7, 2.4, 2.3], color: MINT }, { name: 'Servicios', values: [2.0, 2.2, 2.7, 2.6, 2.5, 2.8, 2.8], color: GOLD }] })],
        notes: 'Barras apiladas con cuadrícula y leyenda: la solar tira del crecimiento; la eólica depende del viento del trimestre.' },
      { title: 'Real frente a presupuesto (M€)', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 100, y: 180, w: 1080, h: 400, fontSize: 25, header: true, headBg: GOLD, headFg: BG, stroke: '#ffffff30', banded: true, band: A1,
          rows: [['Partida', 'Presupuesto', 'Real', 'Desviación'], ['Ingresos', '12,04', '12,40', '=C2-B2'], ['Compras', '-5,80', '-6,10', '=C3-B3'],
            ['Personal', '-2,65', '-2,60', '=C4-B4'], ['Otros gastos', '-1,69', '-1,60', '=C5-B5'], ['<b>EBITDA</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [4, 3, 3, 3] }),
        text('Desviación y totales son fórmulas: si cambia una cifra, se recalculan solos.', 100, 600, 1080, 40, { fontSize: 20, color: A2 })],
        notes: 'Tabla con fórmulas (=C2-B2 y =SUMA(ARRIBA)): se puede actualizar en la propia reunión sin rehacer cuentas.' },
      { title: 'Riesgos que vigilamos', layout: 'titleOnly', bg: BG, extra: [['Precio de los paneles', 'Alto', '#ff8a80', 'Cobertura del 80 % firmada para 2027; buscamos un segundo proveedor europeo.'],
        ['Plazos de conexión a red', 'Medio', GOLD, 'Tres proyectos esperan permiso; reclamación conjunta con la asociación del sector.'],
        ['Rotación de técnicos', 'Bajo', MINT, 'Nuevo plan de carrera; la rotación ha bajado del 14 % al 9 %.']].flatMap(([h, lv, c, d], i) => { const y = 185 + i * 160;
        return [withAnims(card(`<div style="font-size:28px;font-weight:700;color:#ffffff">${h}</div><div style="font-size:22px;color:${A2};margin-top:6px">${d}</div>`, 100, y, 1080, 140, '#ffffff0d', { pad: [20, 200, 20, 40], color: W, vAlign: 'middle' }), chain(i, 'fade-right')),
          withAnims(shape('rect', 100, y, 8, 140, c), A('fade-in', { start: 'withPrev' })),
          withAnims(text(lv, 1010, y + 48, 140, 44, { fontSize: 22, fontWeight: 700, textAlign: 'center', vAlign: 'middle', color: BG, bg: c, radius: 22 }), A('fade-in', { start: 'withPrev' }))]; }),
        notes: 'Tres riesgos con su nivel y su medida. Entran uno tras otro con un clic.' },
      { title: 'Qué pedimos al consejo', layout: 'titleOnly', bg: BG, extra: [
        dg('bullets', 'Aprobar el presupuesto de 2027\n  Ingresos de 52 M€ y EBITDA de 9 M€\nAutorizar la cobertura de paneles\n  Hasta 6 M€ con dos proveedores\nAmpliar el equipo técnico\n  Dos ingenieros para estudios de autoconsumo', 100, 185, 1080, 450, { oneByOne: true, colors: 'accent' })],
        notes: 'Tres decisiones, cada una con su cifra. Lista numerada que aparece punto a punto.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [glow(380, 60, 520, A1, BG, 35),
        text('<b>Gracias</b>', 140, 220, 1000, 140, { fontFamily: head('clean'), fontSize: 100, textAlign: 'center', color: '#ffffff' }),
        text('Próximo consejo: 20 de enero de 2027 · cierre del ejercicio', 140, 380, 1000, 50, { fontSize: 28, textAlign: 'center', color: A2 }),
        shape('rect', 590, 460, 100, 4, GOLD)],
        notes: 'Abrir el turno de preguntas. El informe completo se envía por escrito a los consejeros.' },
    ]));
  } },

  // 3 · Marketing plan: warm, brown and orange, poster type.
  biz_marketing: { name: 'Plan de marketing de campaña', cat: 'biz', summary: 'Estilo cálido: texto en círculo, público objetivo, embudo, mezcla de canales, calendario en tabla, presupuesto con fórmula y votación', make: () => {
    const BG = '#2b1512', OR = '#e4572e', YE = '#f3a712', GR = '#a8c686', BL = '#669bbc', SA = '#f0c987', W = '#fff4ec';
    const mix = [['Redes sociales', 35], ['Colaboraciones', 20], ['Búsqueda', 18], ['Email y CRM', 15], ['Tienda y eventos', 12]];
    return numbered(build({ name: 'Brasa · Otoño lento', palette: 'warm', fonts: 'bold', title: { size: 64, color: YE, bold: false },
      decor: p => [shape('rect', 0, 704, 1280, 16, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        shape('ellipse', 780, 130, 400, 400, OR, { fill2: YE, gradType: 'radial' }),
        text('OTOÑO LENTO · CAFÉ DE TEMPORADA · OTOÑO LENTO · CAFÉ DE TEMPORADA · ', 735, 85, 490, 490, { fontSize: 24, curve: 100, color: SA, textAlign: 'center' }),
        text('☕', 880, 230, 200, 200, { fontSize: 130, textAlign: 'center' }),
        kicker('PLAN DE MARKETING · SEP–DIC 2026', 90, 170, 640, YE),
        text('Otoño<br>lento', 84, 210, 640, 330, { fontFamily: head('bold'), fontSize: 170, lineHeight: 0.92, color: W }),
        text('Brasa · café de especialidad', 90, 560, 640, 50, { fontSize: 30, color: SA })],
        notes: 'Texto curvo en círculo alrededor del sol de la portada (Cuadro de texto ▸ Curvar texto). Brasa es una marca inventada.' },
      { title: 'Lo que queremos conseguir', layout: 'titleOnly', bg: BG, extra: [
        ...[['+25 %', 'ventas en la tienda online', OR], ['8.000', 'suscriptores nuevos', YE], ['4,7', 'valoración media de clientes', GR]].map(([n, l, c], i) =>
          withAnims(big(n, l, 90 + i * 380, 210, c, W), chain(i, 'fade-up'))),
        text('Frente al mismo periodo de 2025 · seguimiento semanal en el panel de la campaña', 90, 520, 1100, 50, { fontSize: 24, color: SA, textAlign: 'center' })],
        notes: 'Tres objetivos medibles. Las cifras son de ejemplo.' },
      { title: 'Para quién: Marta, 34 años', layout: 'titleOnly', bg: BG, extra: [
        shape('ellipse', 110, 200, 200, 200, OR, { fill2: YE, gradAngle: 135 }), icon('user', 150, 240, 120, W),
        text('<b>Marta, 34</b><br>Diseñadora en Valencia<br>Teletrabaja tres días', 80, 420, 260, 140, { fontSize: 24, textAlign: 'center', color: W }),
        withAnims(card(`<div style="color:${YE};font-weight:700;font-size:30px;margin-bottom:8px">Qué busca</div>` + ul('Un café que le alegre la mañana', 'Comprar sin salir de casa', 'Saber de dónde viene', 'Probar orígenes nuevos'), 380, 190, 390, 380, '#ffffff10', { fontSize: 26, color: W }), A('fade-up')),
        withAnims(card(`<div style="color:${OR};font-weight:700;font-size:30px;margin-bottom:8px">Qué le frena</div>` + ul('El precio frente al súper', 'No sabe qué tueste elegir', 'Envíos que tardan', 'Suscripciones difíciles de cancelar'), 800, 190, 390, 380, '#ffffff10', { fontSize: 26, color: W }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Perfil de cliente (buyer persona) construido con 40 entrevistas y los datos de la tienda online.' },
      { title: 'El recorrido del cliente', layout: 'titleOnly', bg: BG, extra: [
        dg('funnel', 'Descubrir\nConsiderar\nComprar\nRepetir', 90, 180, 540, 460, { oneByOne: true }),
        text([['Descubrir', 'Vídeos cortos con baristas y colaboraciones', OR], ['Considerar', 'Guía de tuestes y reseñas de clientes', YE], ['Comprar', 'Caja de cata con envío en 24 h', GR], ['Repetir', 'Suscripción mensual con un 10 % de descuento', BL]]
          .map(([h, d, c]) => `<div style="height:115px"><div style="font-size:28px;font-weight:700;color:${c}">${h}</div><div style="font-size:23px">${d}</div></div>`).join(''), 690, 180, 500, 460, { color: W })],
        notes: 'Embudo en diagrama, una etapa por clic; a la derecha, la acción principal de cada etapa.' },
      { title: 'Dónde invertimos', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 100, y: 175, w: 470, h: 470, chartType: 'doughnut', color: OR, data: mix.map(([label, value]) => ({ label, value })) }),
        legend(mix.map(([l, v], i) => [PIE[i], `<b>${v} %</b> ${l}`]), 640, 200, 540, W, 28),
        text('Más vídeo y colaboraciones; menos anuncios de búsqueda que en 2025 (−8 puntos).', 640, 520, 540, 100, { fontSize: 24, color: SA })],
        notes: 'Gráfico de dona con su leyenda: reparto del presupuesto por canal.' },
      { title: 'Calendario de la campaña', layout: 'titleOnly', bg: BG, extra: [tableBlock({ x: 90, y: 180, w: 1100, h: 430, fontSize: 22, header: true, headBg: OR, headFg: '#ffffff', stroke: '#ffffff30', banded: true, band: OR,
        rows: [['Canal', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
          ['<b>Redes sociales</b>', 'Adelanto', 'Lanzamiento', 'Recetas de otoño', 'Ideas de regalo'],
          ['<b>Email</b>', 'Lista de espera', 'Novedades', 'Semana de ofertas', 'Navidad'],
          ['<b>Colaboraciones</b>', '—', 'Tres baristas', 'Dos cafeterías', 'Caja regalo'],
          ['<b>Tienda física</b>', '—', 'Cata de lanzamiento', '—', 'Mercado navideño'],
          ['<b>Prensa</b>', 'Nota de prensa', '—', 'Reportaje', '—']], colW: [2.3, 2, 2, 2, 2] })],
        notes: 'Calendario en tabla con bandas: qué hace cada canal cada mes.' },
      { title: 'Presupuesto y retorno', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 560, h: 430, fontSize: 25, header: true, headBg: YE, headFg: BG, stroke: '#ffffff30', banded: true, band: YE,
          rows: [['Canal', 'Importe'], ['Redes sociales', '14.000 €'], ['Colaboraciones', '8000 €'], ['Búsqueda', '7200 €'], ['Email y CRM', '6000 €'], ['Tienda y eventos', '4800 €'], ['<b>Total</b>', '=SUMA(ARRIBA)']], colW: [3, 2] }),
        withAnims(text(`<div style="font-family:${head('bold')};font-size:96px;line-height:1;color:${YE}">×4,2</div><div>retorno esperado por cada euro invertido</div>`, 720, 190, 470, 200, { fontSize: 26, color: W }), A('fade-left')),
        withAnims(text(`<div style="font-family:${head('bold')};font-size:96px;line-height:1;color:${OR}">38 €</div><div>coste máximo por cliente nuevo</div>`, 720, 410, 470, 200, { fontSize: 26, color: W }), A('fade-left', { start: 'afterPrev' }))],
        notes: 'El total es una fórmula (=SUMA(ARRIBA)). El retorno y el coste por cliente son los límites que vigilaremos cada semana.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 34, question: '¿Qué pieza lanzamos primero?', options: ['Vídeo «De la finca a tu taza»', 'Caja de cata con tres orígenes', 'Recetas de otoño con baristas', 'Sorteo con cafeterías amigas'], x: 80, y: 50, w: 1120, h: 620 })],
        notes: 'Votación en directo: el equipo escanea el QR y vota desde el móvil. El resultado decide el orden de lanzamiento.' },
      { layout: 'section', title: 'A por el otoño', subtitle: 'Arranque: lunes 15 de septiembre · marketing@brasa.example', bg: BG, transition: 'zoom',
        notes: 'Cierre: repartir responsables por canal y fijar la primera revisión a las dos semanas.' },
    ]));
  } },

  // 4 · Sales and forecast: minimalist grey with a teal accent.
  biz_sales: { name: 'Ventas y previsión anual', cat: 'biz', summary: 'Minimalista en gris: barras y líneas combinadas, escenarios, fórmula de previsión, tabla con fórmulas, barras apiladas y horizontales', make: () => {
    const T = '#0f766e', C = '#e76f51', INK = '#111111', MUTE = '#6b7280', LIGHT = '#f3f4f6';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const sales = [820, 760, 910, 980, 1050, 1120, 990, 870, 1080, 1160, 1240, 1390];
    const stat = (k, n, c, d) => `<div style="font-size:18px;letter-spacing:3px;color:${MUTE}">${k}</div><div style="font-size:48px;font-weight:700;line-height:1.1;color:${c}">${n}</div><div style="font-size:20px;color:${MUTE};margin-bottom:22px">${d}</div>`;
    return numbered(build({ name: 'Kalma Hogar · Ventas 2026', palette: 'grayscale', fonts: 'tech', title: { size: 44, color: INK },
      decor: () => [shape('rect', 0, 0, 8, 720, T)] }, [
      { layout: 'blank', transition: 'fade', extra: [
        kicker('INFORME COMERCIAL', 90, 200, 520, T, 20),
        text(`<b>Ventas 2026</b><br><span style="color:#9ca3af">y previsión 2027</span>`, 90, 240, 660, 200, { fontFamily: head('tech'), fontSize: 66, lineHeight: 1.1, color: INK }),
        text('Dirección comercial · Kalma Hogar · enero de 2027', 90, 470, 640, 40, { fontSize: 24, color: MUTE }),
        chartBlock({ x: 780, y: 200, w: 420, h: 320, chartType: 'area', color: T, data: months.map((m, i) => ({ label: m[0], value: sales[i] })) })],
        notes: 'Portada minimalista: mucho blanco, un solo color de acento y un gráfico de área como ilustración. Kalma Hogar es inventada; todos los datos son de ejemplo.' },
      { title: 'Facturación mensual frente a objetivo (k€)', layout: 'titleOnly', extra: [
        chartBlock({ x: 90, y: 165, w: 1100, h: 450, chartType: 'bar', combo: true, grid: true, color: T, seriesName: 'Facturación',
          data: months.map((m, i) => ({ label: m, value: sales[i] })), series: [{ name: 'Objetivo', values: [850, 850, 900, 950, 1000, 1050, 1050, 950, 1050, 1100, 1200, 1350], color: C }] }),
        text('Total 2026: <b>12,4 M€</b>. Por debajo del objetivo hasta julio y por encima todo el segundo semestre.', 90, 625, 1100, 50, { fontSize: 22, color: MUTE })],
        notes: 'Gráfico combinado (Gráfico ▸ Combinado): la facturación en barras y el objetivo como línea encima, con cuadrícula y escala.' },
      { title: 'Previsión 2027 por trimestre (M€)', layout: 'titleOnly', extra: [
        chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'line', grid: true, color: T, seriesName: 'Base',
          data: [{ label: 'T1', value: 3.1 }, { label: 'T2', value: 3.4 }, { label: 'T3', value: 3.5 }, { label: 'T4', value: 4.5 }],
          series: [{ name: 'Pesimista', values: [2.9, 3.0, 3.1, 3.9], color: '#9ca3af' }, { name: 'Optimista', values: [3.3, 3.7, 3.9, 5.0], color: C }] }),
        withAnims(text(stat('OPTIMISTA', '15,9 M€', C, '+29 % · dos tiendas nuevas') + stat('BASE', '14,5 M€', T, '+17 % · el plan aprobado') + stat('PESIMISTA', '12,9 M€', '#9ca3af', '+4 % · consumo débil'),
          900, 180, 290, 460, { color: INK }), A('fade-left'))],
        notes: 'Tres escenarios como tres series de líneas. El base es el que se presupuesta; los otros dos marcan el margen de maniobra.' },
      { title: 'Cómo calculamos la previsión', layout: 'titleOnly', extra: [
        mathBlock({ x: 140, y: 180, w: 1000, h: 170, fontSize: 64, latex: 'P = \\sum_{i=1}^{n} I_i \\cdot p_i', color: INK }),
        ...[['P', 'previsión de ventas del periodo'], ['I<sub>i</sub> · p<sub>i</sub>', 'importe de cada oportunidad por su probabilidad de cierre'], ['n', 'oportunidades en el embudo (412 hoy)']].map(([s, d], i) =>
          withAnims(card(`<div style="font-size:40px;font-weight:700;color:${T};font-style:italic">${s}</div><div>${d}</div>`, 90 + i * 380, 400, 340, 190, LIGHT, { fontSize: 24, color: INK, radius: 10 }), chain(i, 'fade-up')))],
        notes: 'Ecuación con KaTeX. La previsión no es una intuición: es la suma de cada oportunidad por su probabilidad.' },
      { title: 'Pipeline ponderado (k€)', layout: 'titleOnly', extra: [
        tableBlock({ x: 90, y: 175, w: 1100, h: 410, fontSize: 25, header: true, headBg: T, headFg: '#ffffff', stroke: '#d1d5db', lines: true,
          rows: [['Etapa', 'Importe', 'Probabilidad (%)', 'Ponderado'], ['Prospección', '4200', '10', '=B2*C2/100'], ['Cualificada', '2800', '25', '=B3*C3/100'],
            ['Propuesta', '1900', '50', '=B4*C4/100'], ['Negociación', '1100', '75', '=B5*C5/100'], ['Cierre', '600', '90', '=B6*C6/100'], ['<b>Total</b>', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']], colW: [3, 2, 2.4, 2] }),
        text('La columna «Ponderado» y los totales son fórmulas: cambia una probabilidad y todo se recalcula.', 90, 605, 1100, 40, { fontSize: 20, color: MUTE })],
        notes: 'La fórmula de la diapositiva anterior, en una tabla: =B2*C2/100 en cada fila y =SUMA(ARRIBA) en los totales.' },
      { title: 'Ventas por región (k€)', layout: 'titleOnly', extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 470, chartType: 'stacked', grid: true, color: T, seriesName: 'Norte',
        data: [{ label: 'T1', value: 820 }, { label: 'T2', value: 900 }, { label: 'T3', value: 870 }, { label: 'T4', value: 1050 }],
        series: [{ name: 'Centro', values: [930, 1010, 980, 1200], color: '#14b8a6' }, { name: 'Sur', values: [560, 640, 600, 760], color: '#99f6e4' }, { name: 'Exportación', values: [330, 420, 520, 760], color: C }] })],
        notes: 'Barras apiladas por trimestre. La exportación casi se duplica en el año: es la región que más crece.' },
      { title: 'Los cinco productos que más venden (k€)', layout: 'titleOnly', extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 460, chartType: 'hbar', color: T, dataLabels: true, seriesName: 'Ventas 2026',
        data: [{ label: 'Sofá modular Nube', value: 2150 }, { label: 'Colchón Bruma', value: 1780 }, { label: 'Mesa extensible Roble', value: 1240 }, { label: 'Lámpara Faro', value: 860 }, { label: 'Silla Brisa', value: 720 }] })],
        notes: 'Barras horizontales: para nombres largos se leen mejor que las verticales. Cinco productos suman más de la mitad de la facturación.' },
      { layout: 'blank', transition: 'fade', extra: [
        kicker('OBJETIVO 2027', 90, 180, 600, T, 22),
        withAnims(text('14,5 M€', 84, 210, 760, 220, { fontFamily: head('tech'), fontSize: 180, fontWeight: 700, color: INK }), A('zoom-in', { start: 'afterPrev', sound: 'drumroll', duration: 900 })),
        text('+17 % sobre 2026 · escenario base', 90, 440, 760, 50, { fontSize: 30, color: T }),
        text(ul('Dos tiendas nuevas en marzo', 'Exportación: 25 % de las ventas', 'Ticket medio de 410 €'), 860, 220, 340, 260, { fontSize: 26, color: INK })],
        notes: 'La cifra entra sola con un redoble al llegar a la diapositiva (después de la anterior, con sonido).' },
    ]));
  } },

  // 5 · Onboarding: light green, friendly, with a 3D robot that waves and walks.
  biz_onboarding: { name: 'Bienvenida a nuevos empleados', cat: 'biz', summary: 'Estilo amable: robot 3D que saluda y recorre la semana andando, organigrama uno a uno, valores con iconos y actividad de emparejar', make: () => {
    const G = '#2e7d32', LG = '#66bb6a', BR = '#8d6e63', YE = '#fbc02d', BL = '#0277bd', PK = '#ad1457', INK = '#1e3320', BG = '#f4f8f1';
    const robot = lib3d('three-RobotExpressive');
    const days = [['Lunes', 'Acogida y portátil'], ['Martes', 'Formación de producto'], ['Miércoles', 'Comida con tu equipo'], ['Jueves', 'Tu primera tarea'], ['Viernes', 'Café con dirección']];
    return numbered(build({ name: 'Bienvenida a Tándem', palette: 'forest', fonts: 'friendly', title: { size: 50 },
      decor: p => [shape('ellipse', 1150, -100, 240, 240, p.accents[1], { opacity: 25 }), shape('ellipse', -90, 630, 180, 180, p.accents[3], { opacity: 35 })] }, [
      { layout: 'blank', transition: 'fade', extra: [
        shape('ellipse', 790, 150, 400, 400, LG, { fill2: BG, gradType: 'radial', opacity: 60 }),
        model('three-RobotExpressive', 760, 110, 440, 520, { clip: 'Wave' }),
        kicker('BIENVENIDA · SEMANA 1', 90, 170, 620, BR),
        text('<b>¡Hola!</b>', 90, 205, 640, 110, { fontFamily: head('friendly'), fontSize: 92, lineHeight: 1.1, color: G }),
        text('<b>Te damos la bienvenida a Tándem</b>', 90, 320, 640, 130, { fontFamily: head('friendly'), fontSize: 46, lineHeight: 1.15, color: INK }),
        text('Todo lo que necesitas para tu primera semana', 90, 470, 660, 50, { fontSize: 28, color: '#4a6b4d' })],
        notes: 'El robot 3D saluda en bucle (Modelo 3D ▸ Animación: Wave). Tándem es una empresa inventada.' },
      { title: 'Tándem en pocas palabras', layout: 'titleOnly', extra: [
        ...[['2012', 'el año en que empezamos', G], ['140', 'personas en 4 ciudades', BL], ['92 %', 'de clientes nos recomiendan', PK]].map(([n, l, c], i) =>
          withAnims(big(n, l, 90 + i * 380, 200, c, INK), chain(i, 'bounce'))),
        text('Hacemos software de reservas para clínicas y centros deportivos: <b>3 millones de citas al mes</b> pasan por nuestra plataforma.', 90, 470, 1100, 100, { fontSize: 28, textAlign: 'center', color: INK })],
        notes: 'Tres cifras con efecto rebote, una tras otra. Datos de ejemplo.' },
      { title: 'Cómo nos organizamos', layout: 'titleOnly', extra: [
        dg('hierarchy', 'Dirección general\n  Producto\n    Diseño\n    Desarrollo\n  Clientes\n    Ventas\n    Soporte\n  Personas y finanzas', 90, 175, 1100, 470, { oneByOne: true })],
        notes: 'Organigrama escrito como un esquema (con sangría): aparece por ramas, uno a uno. Señalar en qué equipo está la persona nueva.' },
      { title: 'Nuestros valores', layout: 'titleOnly', extra: [['heart', PK, 'Cuidamos', 'A las personas antes que a los plazos.'], ['user', BL, 'Hablamos claro', 'Mejor una verdad a tiempo que una sorpresa.'],
        ['bolt', '#e0a100', 'Probamos rápido', 'Una prueba pequeña vale más que una reunión larga.'], ['star', G, 'Bien hecho', 'Lo terminamos como si fuera para nosotros.']].flatMap(([ic, c, h, d], i) => { const x = 90 + i * 280;
        return [withAnims(shape('ellipse', x + 70, 210, 120, 120, c), chain(i, 'zoom-in')),
          withAnims(icon(ic, x + 100, 240, 60, '#ffffff'), A('spin', { start: 'withPrev', duration: 700 })),
          withAnims(text(`<div style="font-size:30px;font-weight:700;color:${c === '#e0a100' ? '#a87400' : c}">${h}</div><div>${d}</div>`, x, 355, 260, 240, { fontSize: 25, textAlign: 'center', color: INK }), A('fade-up', { start: 'withPrev' }))]; }),
        notes: 'Cuatro valores con su icono. Pedir a alguien del equipo un ejemplo real de cada uno.' },
      { title: 'Tu primera semana', layout: 'titleOnly', extra: [
        shape('rounded', 120, 516, 1040, 10, '#cfe3cf', { radius: 5 }),
        ...days.flatMap(([d, t], i) => { const cx = 160 + i * 240;
          return [shape('ellipse', cx - 18, 503, 36, 36, [G, BL, YE, PK, BR][i], { stroke: '#ffffff', strokeWidth: 4 }),
            text(`<b>${d}</b><br>${t}`, cx - 115, 555, 230, 100, { fontSize: 21, textAlign: 'center', color: INK })]; }),
        withAnims(model('three-RobotExpressive', 60, 250, 200, 270, { walk: { clip: robot.walk, end: robot.arrive, endOnce: true, face: true, look: true } }),
          path([[240, 0], [480, 0], [720, 0], [960, 0]], { duration: 6000 })),
        text('Clic: el robot recorre la semana día a día', 700, 180, 490, 40, { fontSize: 22, color: '#4a6b4d', textAlign: 'right' })],
        notes: 'El robot anda por un recorrido (Animaciones ▸ Dibujar recorrido) con la animación de andar y, al llegar, saluda. Comentar cada día mientras avanza.' },
      { title: 'Lo que te damos', layout: 'titleOnly', extra: [['Portátil y accesos listos el primer día', G], ['Una mentora o un mentor durante 6 semanas', BL], ['300 € para tu puesto en casa', PK],
        ['Plan de formación en la plataforma interna', BR], ['Horario flexible desde el primer día', '#e0a100'], ['Conversaciones a los 30, 60 y 90 días', LG]].flatMap(([t, c], i) => { const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 140;
        return [withAnims(shape('ellipse', x, y + 10, 64, 64, c), chain(i, 'zoom-in', { duration: 400 })), withAnims(icon('check', x + 14, y + 24, 36, '#ffffff'), A('fade-in', { start: 'withPrev' })),
          withAnims(text(t, x + 86, y, 450, 90, { fontSize: 26, vAlign: 'middle', color: INK }), A('fade-right', { start: 'withPrev' }))]; }),
        notes: 'La lista entera aparece con un solo clic, punto tras punto.' },
      { layout: 'blank', extra: [pollBlock({ kind: 'match', question: '¿A quién acudo si…?', fontSize: 30, x: 60, y: 40, w: 1160, h: 640,
        options: ['Mi portátil no arranca = Soporte interno', 'Quiero pedir vacaciones = Personas', 'Tengo una idea de producto = Producto', 'Tengo una factura de un viaje = Finanzas'] })],
        notes: 'Actividad de emparejar desde el móvil: cada situación con su equipo. Al cerrar se ve cuántos han acertado cada pareja.' },
      { layout: 'blank', transition: 'zoom', extra: [
        model('kn-character', 880, 170, 300, 420, { clip: 'jump' }),
        text('<b>¡Nos alegra tenerte aquí!</b>', 90, 220, 760, 200, { fontFamily: head('friendly'), fontSize: 66, lineHeight: 1.1, color: G }),
        text('Cualquier duda: personas@tandem.example · canal #bienvenida', 90, 450, 760, 50, { fontSize: 26, color: INK })],
        notes: 'Cierre con un personaje 3D que salta. Recordar el canal de bienvenida y presentar a la mentora o mentor.' },
    ]));
  } },

  // 6 · Proposal to a client: paper and serif, like a printed dossier.
  biz_proposal: { name: 'Propuesta comercial a un cliente', cat: 'biz', summary: 'Estilo papel: sello, proceso uno a uno, maquetas en portátil y móvil, precios, presupuesto con IVA en fórmulas, cronología y garantías', make: () => {
    const BR = '#b5651d', OL = '#6b8e23', SB = '#4682b4', PL = '#8b3a62', INK = '#3b3228', SOFT = '#fffaf0', LINE = '#e2d6c0', MUTE = '#7a6a58';
    const tiers = [['Esencial', '18.500 €', 'Web nueva y motor de reservas<br>Tres idiomas<br>Soporte durante 6 meses'],
      ['Completa', '32.000 €', 'Todo lo de Esencial<br>Panel de precios y ofertas<br>Integración con vuestro PMS<br>Soporte durante 12 meses'],
      ['Premium', '46.000 €', 'Todo lo de Completa<br>App para huéspedes<br>Programa de fidelización<br>Soporte durante 24 meses']];
    return numbered(build({ name: 'Propuesta · Hoteles Mirador', palette: 'paper', fonts: 'editorial', title: { size: 44, color: INK },
      decor: p => [shape('rect', 60, 680, 1160, 2, p.accents[0]), text('Estudio Cierzo · Propuesta para Hoteles Mirador', 60, 686, 700, 28, { fontSize: 14, color: MUTE })] }, [
      { layout: 'blank', transition: 'fade', extra: [
        shape('rect', 60, 50, 1160, 600, 'none', { stroke: LINE, strokeWidth: 2 }),
        kicker('PROPUESTA N.º 2026-114', 120, 140, 600, BR, 20),
        text('Una web de reservas a la altura de vuestros hoteles', 120, 190, 800, 240, { fontFamily: head('editorial'), fontSize: 56, lineHeight: 1.18, color: INK }),
        shape('rect', 122, 455, 120, 3, BR),
        text('Preparada para Hoteles Mirador por Estudio Cierzo<br>3 de noviembre de 2026 · válida durante 60 días', 120, 480, 820, 90, { fontSize: 24, color: MUTE }),
        shape('seal', 960, 170, 200, 200, BR, { rotation: -8 }),
        text('<b>2026</b><br>a medida', 960, 225, 200, 90, { fontSize: 24, textAlign: 'center', vAlign: 'middle', color: '#ffffff', rotation: -8 })],
        notes: 'Portada tipo dosier impreso: marco fino, sello girado y tipografía con remate. Cliente y estudio son inventados.' },
      { title: 'Lo que nos habéis contado', layout: 'titleOnly', extra: [
        text('“', 80, 140, 120, 140, { fontFamily: head('editorial'), fontSize: 150, color: BR, lineHeight: 1 }),
        text('Nuestros clientes reservan por intermediarios porque la web es lenta y no funciona bien en el móvil.', 140, 200, 500, 260, { fontFamily: head('editorial'), fontSize: 32, fontStyle: 'italic', lineHeight: 1.35, color: INK }),
        text('— Dirección comercial, reunión del 14 de octubre', 140, 480, 500, 60, { fontSize: 22, color: MUTE }),
        withAnims(card(`<div style="font-size:26px;font-weight:700;color:${BR};margin-bottom:12px">Lo que necesitáis</div>`
          + '<div style="margin-bottom:12px"><b>1 ·</b> Más reservas directas (hoy, el 22 %)</div><div style="margin-bottom:12px"><b>2 ·</b> Una web rápida en el móvil</div><div><b>3 ·</b> Cambiar precios y ofertas sin depender de nadie</div>',
          700, 190, 490, 400, SOFT, { fontSize: 26, color: INK, borderColor: LINE }), A('fade-left'))],
        notes: 'Empezar por el problema del cliente, con sus palabras. Clic: los tres objetivos que guían la propuesta.' },
      { title: 'Cómo lo haremos', layout: 'titleOnly', extra: [
        dg('process', 'Descubrir\n  Entrevistas y datos\nDiseñar\n  Prototipo con huéspedes\nConstruir\n  Web, reservas y panel\nLanzar\n  Migración y formación', 90, 200, 1100, 400, { colors: 'light', oneByOne: true })],
        notes: 'Proceso en cuatro fases, una por clic. Insistir en que el prototipo se prueba con huéspedes reales antes de construir.' },
      { title: 'Así se verá', layout: 'titleOnly', extra: [
        { ...base(90, 190, 620, 400), type: 'image', src: appScreen(1280, 800, BR, 'Hoteles Mirador · Reserva tu estancia', 3), alt: 'La web de reservas en un portátil', fit: 'cover', device: 'laptop' },
        { ...base(750, 170, 220, 450), type: 'image', src: appScreen(360, 720, SB, 'Mirador', 4), alt: 'La reserva desde el móvil', fit: 'cover', device: 'phone' },
        text('<b>Reserva en tres pasos</b><br>Fechas, habitación y pago, sin registrarse.<br><br><b>Precio directo</b><br>Siempre igual o mejor que en los intermediarios.', 1000, 200, 200, 420, { fontSize: 20, color: INK })],
        notes: 'Maquetas dentro de un portátil y un móvil (Imagen ▸ Dispositivo). Son bocetos, no el diseño final.' },
      { title: 'Tres opciones', layout: 'titleOnly', extra: [
        ...tiers.map(([n, pr, d], i) => { const hot = i === 1;
          return withAnims(card(`<div style="font-size:28px;font-family:${head('editorial')}">${n}</div><div style="font-size:56px;font-weight:700;line-height:1.2;margin:6px 0">${pr}</div><div style="font-size:18px;opacity:.8;margin-bottom:16px">pago único · IVA aparte</div><div style="font-size:21px;line-height:1.45">${d}</div>`,
            90 + i * 380, 200, 340, 400, hot ? BR : SOFT, { color: hot ? '#ffffff' : INK, textAlign: 'center', borderColor: hot ? BR : LINE, pad: [44, 24, 24, 24], ...(hot && { shadow: { x: 0, y: 10, blur: 24, color: '#3b322855' } }) }), chain(i, 'zoom-in')); }),
        text('RECOMENDADA', 470, 210, 340, 30, { fontSize: 16, letterSpacing: 4, textAlign: 'center', color: '#fde7c8' })],
        notes: 'Tres niveles de precio: la opción central se destaca con color y sombra. Los precios son de ejemplo.' },
      { title: 'Detalle económico · opción Completa', layout: 'titleOnly', extra: [
        tableBlock({ x: 90, y: 180, w: 700, h: 440, fontSize: 23, header: true, headBg: BR, headFg: '#ffffff', stroke: LINE, banded: true, band: BR,
          rows: [['Concepto', 'Importe'], ['Descubrimiento y diseño', '7500 €'], ['Desarrollo web y motor de reservas', '16.000 €'], ['Panel de precios e integración con el PMS', '6000 €'],
            ['Migración, formación y lanzamiento', '2500 €'], ['<b>Subtotal</b>', '=SUMA(B2:B5)'], ['IVA (21 %)', '=B6*21 %'], ['<b>Total</b>', '=B6+B7']], colW: [3.2, 1.4] }),
        withAnims(card(`<div style="font-size:26px;font-weight:700;color:${BR};margin-bottom:10px">Forma de pago</div>` + ul('40 % a la firma', '40 % al aprobar el diseño', '20 % en el lanzamiento'),
          830, 180, 360, 300, SOFT, { fontSize: 24, color: INK, borderColor: LINE }), A('fade-left'))],
        notes: 'Subtotal, IVA y total son fórmulas (=SUMA(B2:B5), =B6*21 %, =B6+B7): si cambia una partida, el presupuesto se recalcula.' },
      { title: 'Calendario: 14 semanas', layout: 'titleOnly', extra: [
        dg('timeline', 'Semanas 1–2\n  Descubrimiento\nSemanas 3–5\n  Diseño y prototipo\nSemanas 6–11\n  Desarrollo\nSemanas 12–13\n  Pruebas con huéspedes\nSemana 14\n  Lanzamiento', 90, 190, 1100, 420, { oneByOne: true })],
        notes: 'Cronología uno a uno. Si se firma antes del 20 de noviembre, el lanzamiento llega antes de Semana Santa.' },
      { title: 'Nuestras garantías', layout: 'titleOnly', extra: [['Precio cerrado', 'El importe no cambia si no cambia el alcance.', OL], ['Plazo comprometido', 'Si nos retrasamos por nuestra causa, descontamos un 2 % por semana.', SB],
        ['Soporte incluido', '12 meses de corrección de errores y actualizaciones de seguridad.', PL], ['Vuestro código', 'La web y los datos son vuestros desde el primer día.', BR]].flatMap(([h, d, c], i) => { const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 225;
        return [withAnims(card(`<div style="font-size:28px;font-weight:700;color:${c};margin-bottom:6px">${h}</div><div>${d}</div>`, x, y, 540, 200, SOFT, { fontSize: 23, color: INK, borderColor: LINE, pad: [26, 26, 24, 108], vAlign: 'middle' }), chain(i, 'fade-in')),
          withAnims(shape('ellipse', x + 26, y + 68, 64, 64, c), A('zoom-in', { start: 'withPrev' })), withAnims(icon('check', x + 40, y + 82, 36, '#ffffff'), A('fade-in', { start: 'withPrev' }))]; }),
        notes: 'Cuatro garantías por escrito: es lo que más tranquiliza a un cliente que ya ha tenido malas experiencias.' },
      { title: 'Siguientes pasos', layout: 'titleOnly', extra: [
        text('<div style="margin-bottom:18px"><b style="color:#b5651d">1</b> · Revisión de la propuesta con vuestro equipo</div><div style="margin-bottom:18px"><b style="color:#b5651d">2</b> · Firma y reunión de arranque</div><div><b style="color:#b5651d">3</b> · Primera sesión de descubrimiento en vuestro hotel de Zaragoza</div>', 90, 190, 560, 330, { fontSize: 27, color: INK }),
        shape('rect', 740, 330, 450, 2, INK), text('Aceptado por Hoteles Mirador · fecha y firma', 740, 340, 450, 30, { fontSize: 18, color: MUTE }),
        shape('rect', 740, 480, 450, 2, INK), text('Por Estudio Cierzo · Clara Ruiz, directora', 740, 490, 450, 30, { fontSize: 18, color: MUTE }),
        text('clara@cierzo.example · cierzo.example', 90, 580, 700, 40, { fontSize: 22, color: BR })],
        notes: 'Cerrar con pasos concretos y fechas. Las líneas de firma convierten la diapositiva en una página que se puede imprimir.' },
    ]));
  } },

  // 7 · SWOT and competition: graphite with four bright colours, web-safe fonts.
  biz_swot: { name: 'Análisis DAFO y competencia', cat: 'biz', summary: 'Fondo grafito: DAFO por cuadrantes, matriz de estrategias, mapa de posicionamiento, barras agrupadas, Venn, tarta y votación múltiple', make: () => {
    const BG = '#101317', BL = '#3f6497', OR = '#e0873b', GR = '#4caf7d', RD = '#c94f4f', CY = '#3bb3c3', W = '#ffffff', MUTE = '#9aa3ad';
    const quad = [['Fortalezas', GR, ['Centros en barrios con mucho paso', 'Clases dirigidas con lista de espera', 'Cuota media un 12 % más baja']],
      ['Debilidades', RD, ['App antigua y poco usada', 'Pocos servicios de valor añadido', 'Rotación alta de monitores']],
      ['Oportunidades', BL, ['Más interés por la salud', 'Empresas que pagan el gimnasio', 'Barrios nuevos sin oferta']],
      ['Amenazas', OR, ['Cadenas de bajo coste en expansión', 'Subida de la energía', 'Entrenar en casa con apps']]];
    const share = [['Bajo coste A', 28], ['Municipales', 22], ['Pulso', 18], ['Bajo coste B', 14], ['Boutique y premium', 10], ['Otros', 8]];
    return numbered(build({ name: 'Pulso · DAFO y competencia', palette: 'revela', fonts: 'websafe', title: { size: 46, color: W },
      decor: () => [GR, RD, BL, OR].map((c, i) => shape('rect', 1150 + i * 22, 676, 16, 16, c, { radius: 3 })) }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...quad.flatMap(([h, c], i) => { const x = 770 + (i % 2) * 216, y = 150 + Math.floor(i / 2) * 216;
          return [withAnims(shape('rounded', x, y, 200, 200, c, { radius: 14 }), A('zoom-in', { start: 'afterPrev', duration: 400 })),
            withAnims(text(h[0], x, y + 30, 200, 140, { fontFamily: head('websafe'), fontSize: 110, textAlign: 'center', vAlign: 'middle', color: W }), A('fade-in', { start: 'withPrev' }))]; }),
        kicker('ANÁLISIS ESTRATÉGICO', 90, 200, 600, OR),
        text('DAFO y<br>competencia', 90, 240, 640, 230, { fontFamily: head('websafe'), fontSize: 86, lineHeight: 1.1, color: W }),
        text('Gimnasios Pulso · marzo de 2027', 90, 490, 640, 50, { fontSize: 24, color: MUTE })],
        notes: 'Las cuatro letras entran solas al llegar, en cadena. Pulso es una cadena inventada; los datos son de ejemplo.' },
      { title: 'El DAFO de Pulso', layout: 'titleOnly', bg: BG, extra: [
        text('POSITIVO', 170, 160, 500, 30, { fontSize: 16, letterSpacing: 5, textAlign: 'center', color: MUTE }),
        text('NEGATIVO', 690, 160, 500, 30, { fontSize: 16, letterSpacing: 5, textAlign: 'center', color: MUTE }),
        text('INTERNO', 30, 285, 200, 30, { fontSize: 16, letterSpacing: 5, textAlign: 'center', color: MUTE, rotation: -90 }),
        text('EXTERNO', 30, 515, 200, 30, { fontSize: 16, letterSpacing: 5, textAlign: 'center', color: MUTE, rotation: -90 }),
        ...quad.flatMap(([h, c, items], i) => { const x = 170 + (i % 2) * 520, y = 195 + Math.floor(i / 2) * 230;
          return [withAnims(card(`<div style="font-size:28px;font-weight:700;color:${c};margin-bottom:6px">${h}</div>` + items.map(t => `<div style="margin:4px 0">· ${t}</div>`).join(''), x, y, 500, 215, '#ffffff0d', { fontSize: 22, color: W, pad: [18, 22, 18, 30] }), chain(0, 'fade-in')),
            withAnims(shape('rect', x, y, 6, 215, c), A('fade-in', { start: 'withPrev' }))]; })],
        notes: 'Cuadrantes hechos a mano con las etiquetas de los ejes (interno/externo, positivo/negativo). Uno por clic.' },
      { title: 'Estrategias cruzadas', layout: 'titleOnly', bg: BG, extra: [
        dg('matrix', 'Ofensivas · F + O\n  Abrir 3 centros en barrios nuevos\nReorientación · D + O\n  App nueva con planes para empresas\nDefensivas · F + A\n  Bono de clases ilimitadas\nSupervivencia · D + A\n  Placas solares en 6 centros', 90, 180, 1100, 460, { oneByOne: true })],
        notes: 'Matriz 2 × 2 (diagrama): cada cuadrante cruza dos letras del DAFO y propone una acción.' },
      { title: 'Mapa de posicionamiento', layout: 'titleOnly', bg: BG, extra: [
        shape('rect', 160, 620, 1020, 3, '#59616b'), shape('rect', 160, 180, 3, 443, '#59616b'),
        text('Precio →', 980, 630, 200, 30, { fontSize: 20, textAlign: 'right', color: MUTE }),
        text('↑ Experiencia', 175, 175, 260, 30, { fontSize: 20, color: MUTE }),
        ...[['Bajo coste A', 260, 500, 100, '#59616b'], ['Bajo coste B', 430, 545, 70, '#59616b'], ['Municipales', 310, 320, 90, '#59616b'], ['Boutique', 1080, 240, 70, '#59616b'], ['Club premium', 990, 410, 90, '#59616b'], ['Pulso', 640, 420, 100, OR]]
          .flatMap(([l, cx, cy, d, c]) => [shape('ellipse', cx - d / 2, cy - d / 2, d, d, c, { opacity: c === OR ? 100 : 75 }), text(l, cx - 100, cy + d / 2 + 4, 200, 30, { fontSize: 19, textAlign: 'center', color: c === OR ? OR : '#c5ccd4', fontWeight: c === OR ? 700 : 400 })]),
        withAnims(shape('ellipse', 690, 195, 310, 160, 'none', { stroke: GR, strokeWidth: 3, dash: 'dash' }), A('zoom-in')),
        withAnims(text('Hueco: buena experiencia a precio medio', 715, 240, 260, 70, { fontSize: 20, textAlign: 'center', color: GR, fontWeight: 700 }), A('fade-in', { start: 'withPrev' }))],
        notes: 'Mapa perceptual hecho con formas: el tamaño de cada círculo es su número de centros. Clic: el hueco que proponemos ocupar.' },
      { title: 'Cómo nos puntúan los socios (sobre 10)', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 470, chartType: 'bar', grid: true, color: OR, seriesName: 'Pulso',
        data: [{ label: 'Precio', value: 7.8 }, { label: 'Instalaciones', value: 6.1 }, { label: 'Clases', value: 8.6 }, { label: 'Horario', value: 7.2 }, { label: 'App', value: 4.9 }],
        series: [{ name: 'Bajo coste', values: [8.9, 5.8, 5.2, 8.1, 7.4], color: '#7d8590' }, { name: 'Premium', values: [4.1, 8.9, 8.2, 7.0, 8.0], color: BL }] })],
        notes: 'Barras agrupadas con tres series: ganamos en clases, perdemos claramente en la app. Encuesta a 1.900 socios (datos de ejemplo).' },
      { title: 'Dónde podemos ganar', layout: 'titleOnly', bg: BG, extra: [
        dg('venn', 'Lo que valoran los socios\nLo que hacemos bien\nLo que nadie ofrece', 90, 170, 640, 480),
        withAnims(text(`<div style="font-size:30px;font-weight:700;color:${OR};margin-bottom:10px">En el centro</div><div>Clases dirigidas de calidad, a precio medio y pagadas por la empresa del socio.</div>`, 780, 260, 410, 300, { fontSize: 28, color: W }), A('fade-left'))],
        notes: 'Venn de tres círculos: donde se cruzan está nuestra propuesta de valor.' },
      { title: 'Cuota de mercado en nuestras ciudades', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 100, y: 180, w: 450, h: 450, chartType: 'pie', color: OR, data: share.map(([label, value]) => ({ label, value })) }),
        legend(share.map(([l, v], i) => [PIE[i], `${l} · <b>${v} %</b>`]), 620, 200, 560, W, 26),
        text(`Objetivo 2028: <b style="color:${OR}">22 %</b>`, 620, 550, 560, 50, { fontSize: 30, color: W })],
        notes: 'Gráfico de tarta con la leyenda al lado. Somos terceros; el objetivo es pasar a segundos en dos años.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', fontSize: 32, question: '¿Qué dos estrategias priorizamos este año?', x: 80, y: 50, w: 1120, h: 610,
        options: ['Abrir 3 centros en barrios nuevos', 'App nueva con planes para empresas', 'Bono de clases ilimitadas', 'Placas solares en 6 centros'] })],
        notes: 'Votación de opción múltiple: cada miembro del comité elige dos desde el móvil.' },
      { layout: 'section', title: 'Crecer donde nadie llega', subtitle: 'Propuesta: tres centros nuevos y un plan para empresas en 2027', bg: BG, transition: 'zoom',
        notes: 'Cierre con la conclusión en una frase y la propuesta que se llevará al consejo.' },
    ]));
  } },

  // 8 · Project roadmap: midnight blue, tech type, a toy car that moves along the plan.
  biz_roadmap: { name: 'Hoja de ruta de un proyecto', cat: 'biz', summary: 'Estilo técnico oscuro: galones uno a uno, diagrama de Gantt animado, cronología, coche 3D que avanza con Transformar y tabla de estado', make: () => {
    const BG = '#0b0f19', BLU = '#7aa2f7', VIO = '#bb9af7', GRN = '#9ece6a', AMB = '#e0af68', RED = '#f7768e', CY = '#2ac3de', W = '#e6e9ef', MUTE = '#8a93a8';
    const car = uid(), prog = uid(), status = uid();
    const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], X0 = 340, MW = 70;
    const rows = [['Preparación', 0, 2, BLU], ['Diseño de procesos', 1, 5, VIO], ['Migración de datos', 3, 9, CY], ['Pruebas', 6, 10, AMB], ['Despliegue por oleadas', 8, 12, GRN], ['Formación', 9, 12, RED]];
    const phases = ['Preparar', 'Diseñar', 'Migrar', 'Desplegar', 'Estabilizar'], when = ['Feb', 'May', 'Sep', 'Dic', 'Mar 28'];
    const track = (done, carX, msg) => [
      shape('rounded', 140, 430, 1000, 10, '#ffffff1a', { radius: 5 }),
      { ...shape('rounded', 140, 430, done, 10, GRN, { radius: 5 }), id: prog },
      ...phases.flatMap((p, i) => { const cx = 140 + i * 250;
        return [shape('ellipse', cx - 14, 421, 28, 28, cx <= 140 + done ? GRN : '#2a3045', { stroke: BG, strokeWidth: 4 }),
          text(`<b>${p}</b><br><span style="color:${MUTE}">${when[i]}</span>`, cx - 100, 465, 200, 70, { fontSize: 20, textAlign: 'center', color: W })]; }),
      { ...model('kh-ToyCar', carX, 200, 320, 240, { view: 'side', arrive: 'keep' }), id: car },
      { ...card(`<div>${msg}</div>`, 140, 570, 1000, 90, '#ffffff0d', { fontSize: 24, color: W, vAlign: 'middle' }), id: status }];
    return numbered(build({ name: 'Proyecto Atlas · Hoja de ruta', palette: 'midnight', fonts: 'tech', title: { size: 44, color: W },
      decor: () => Array.from({ length: 12 }, (_, i) => shape('rect', 100 + i * 100, 0, 1, 720, '#ffffff08')) }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(620, -220, 820, BLU, BG, 35), glow(-260, 380, 620, VIO, BG, 25),
        kicker('PROYECTO ATLAS', 90, 190, 600, CY, 22),
        text('Hoja de ruta<br>2027', 84, 230, 760, 260, { fontFamily: head('tech'), fontSize: 104, lineHeight: 1.05, wordart: 'gradient' }),
        text('Migración del ERP a la nube · Oficina de proyectos', 90, 510, 700, 50, { fontSize: 26, color: MUTE }),
        model('kh-ToyCar', 800, 250, 400, 300, { autoRotate: true, view: 'three' })],
        notes: 'Portada con Text Art en degradado y un coche 3D que gira: será nuestro indicador de avance. Proyecto y empresa son inventados.' },
      { title: 'Por qué y para qué', layout: 'titleOnly', bg: BG, extra: [
        withAnims(card(`<div style="font-size:28px;font-weight:700;color:${RED};margin:0 0 10px 64px">Hoy</div>` + ul('Servidores al final de su vida útil', 'Cierre de mes en 6 días', '14 integraciones hechas a mano'), 90, 190, 530, 330, '#ffffff0a', { fontSize: 26, color: W, borderColor: RED }), A('fade-right')),
        withAnims(icon('bolt', 116, 212, 44, RED), A('fade-in', { start: 'withPrev' })),
        withAnims(card(`<div style="font-size:28px;font-weight:700;color:${GRN};margin:0 0 10px 64px">En 2028</div>` + ul('ERP en la nube, sin servidores propios', 'Cierre de mes en 2 días', 'Integraciones estándar y documentadas'), 660, 190, 530, 330, '#ffffff0a', { fontSize: 26, color: W, borderColor: GRN }), A('fade-left', { start: 'afterPrev' })),
        withAnims(icon('check', 686, 212, 44, GRN), A('fade-in', { start: 'withPrev' }))],
        notes: 'Antes y después en dos tarjetas: la segunda entra justo después de la primera.' },
      { title: 'Cinco fases', layout: 'titleOnly', bg: BG, extra: [
        dg('chevrons', 'Preparar\n  Equipo y alcance\nDiseñar\n  Procesos objetivo\nMigrar\n  Datos y pruebas\nDesplegar\n  Por oleadas\nEstabilizar\n  Soporte reforzado', 90, 210, 1100, 380, { oneByOne: true })],
        notes: 'Galones uno a uno: una fase por clic.' },
      { title: 'Cronograma 2027', layout: 'titleOnly', bg: BG, extra: [
        ...MONTHS.map((m, i) => text(m, X0 + i * MW, 180, MW, 30, { fontSize: 18, textAlign: 'center', color: MUTE })),
        shape('rect', X0, 215, MW * 12, 1, '#ffffff30'),
        ...rows.flatMap(([l, a, b, c], i) => { const y = 235 + i * 62;
          return [text(l, 90, y, 240, 40, { fontSize: 21, vAlign: 'middle', color: W }),
            withAnims(shape('rounded', X0 + a * MW + 4, y + 4, (b - a) * MW - 8, 32, c, { radius: 16 }), chain(i, 'fade-right', { duration: 450 }))]; }),
        ...[[5, 1, 'Diseño cerrado'], [8, 4, 'Primera oleada'], [12, 4, 'Arranque general']].map(([m, r, l], i) =>
          withAnims(shape('diamond', X0 + m * MW - 14, 235 + r * 62 + 6, 28, 28, '#ffffff', { alt: l }), A('zoom-in', { start: 'afterPrev', duration: 300 }))),
        text('◆ Hitos: diseño cerrado (31 de mayo) · primera oleada (1 de septiembre) · arranque general (31 de diciembre)', 90, 625, 1100, 36, { fontSize: 19, color: MUTE })],
        notes: 'Diagrama de Gantt hecho con formas: un clic y las barras se dibujan en cadena de izquierda a derecha; después, los rombos de los hitos.' },
      { title: 'Hitos principales', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', 'Febrero\n  Equipo y alcance aprobados\nMayo\n  Diseño de procesos cerrado\nSeptiembre\n  Primera oleada: 3 sedes\nDiciembre\n  Arranque general\nMarzo 2028\n  Fin del soporte reforzado', 90, 190, 1100, 430, { oneByOne: true, colors: 'accent' })],
        notes: 'Cronología en un solo color, un hito por clic.' },
      { title: 'Seguimiento · junio', layout: 'titleOnly', bg: BG, extra: track(330, 310, '<b>Junio:</b> diseño cerrado a tiempo. La migración de datos arranca con dos semanas de retraso.'),
        notes: 'El coche marca dónde está el proyecto. Pasar a la siguiente: con Transformar avanza solo hasta septiembre.' },
      { title: 'Seguimiento · septiembre', layout: 'titleOnly', bg: BG, autoAnimate: true, transition: 'none', extra: track(560, 540, '<b>Septiembre:</b> primera oleada en producción (3 sedes, 420 usuarios). Retraso recuperado.'),
        notes: 'Transformar (autoAnimate): el coche, la barra de avance y la tarjeta tienen el mismo id que en la anterior, así que se desplazan en lugar de aparecer.' },
      { title: 'Estado por área', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 175, w: 1100, h: 430, fontSize: 24, header: true, headBg: BLU, headFg: BG, stroke: '#2a2f45', banded: true, band: BLU,
          rows: [['Área', 'Responsable', 'Avance', 'Estado'], ['Finanzas', 'Laura M.', '80 %', '🟢 En plazo'], ['Compras', 'Diego R.', '65 %', '🟡 Vigilar'], ['Logística', 'Irene S.', '40 %', '🔴 Con retraso'],
            ['Ventas', 'Tomás G.', '70 %', '🟢 En plazo'], ['Sistemas', 'Nuria P.', '75 %', '🟢 En plazo'], ['<b>Media</b>', '', '=PROMEDIO(C2:C6)', '']], colW: [3, 3, 2, 3] }),
        text('El avance medio es una fórmula (=PROMEDIO): se actualiza al cambiar cualquier área.', 90, 620, 1100, 36, { fontSize: 19, color: MUTE })],
        notes: 'Tabla de estado con semáforo. Logística necesita ayuda: proponer reforzar el equipo de datos.' },
      { layout: 'section', title: 'Próxima revisión: 15 de diciembre', subtitle: 'Oficina de proyectos · atlas@empresa.example', bg: BG, transition: 'zoom',
        notes: 'Cierre con la fecha de la próxima revisión del comité.' },
    ]));
  } },

  // 9 · Workplace climate survey: violet, playful, everything voted from phones.
  biz_climate: { name: 'Encuesta de clima laboral', cat: 'biz', summary: 'Violeta y participativo: cuenta atrás, barras al 100 %, valoración de 1 a 5, nube de palabras, elección múltiple y preguntas del público', make: () => {
    const BG = '#1b1030', VI = '#9b5de5', PK = '#f15bb5', YE = '#fee440', CY = '#00bbf9', MI = '#00f5d4', W = '#f3eefe', MUTE = '#c9bde6';
    return numbered(build({ name: 'Encuesta de clima 2026', palette: 'violet', fonts: 'friendly', title: { size: 52, color: '#ffffff' },
      decor: p => [shape('rect', 0, 0, 1280, 8, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        shape('speechround', 760, 110, 400, 270, VI, { fill2: PK, gradAngle: 45 }),
        text('¿Y tú qué opinas?', 790, 160, 340, 130, { fontFamily: head('friendly'), fontSize: 40, fontWeight: 700, textAlign: 'center', vAlign: 'middle', color: '#ffffff' }),
        shape('speech', 960, 400, 220, 150, CY, { opacity: 90 }), shape('thought', 760, 430, 160, 120, YE, { opacity: 90 }),
        kicker('ENCUESTA DE CLIMA 2026', 90, 170, 620, MI),
        text('¿Cómo<br>estamos?', 84, 210, 640, 260, { fontFamily: head('friendly'), fontSize: 110, fontWeight: 800, lineHeight: 1.02, color: '#ffffff' }),
        text('Sesión abierta con toda la plantilla · las respuestas son anónimas', 90, 490, 620, 80, { fontSize: 26, color: MUTE }),
        timer(60, 90, 580, 260, { style: 'digital', color: YE, w: 260, h: 90 })],
        notes: 'Bocadillos de cómic como decoración. La cuenta atrás digital da un minuto para que todo el mundo saque el móvil.' },
      { title: 'Lo que nos dijisteis en 2025', layout: 'titleOnly', bg: BG, extra: [chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'stacked100', color: MI, seriesName: 'De acuerdo', dataLabels: true,
        data: [{ label: 'Equipo', value: 82 }, { label: 'Responsable', value: 74 }, { label: 'Carga', value: 41 }, { label: 'Desarrollo', value: 48 }, { label: 'Comunicación', value: 52 }],
        series: [{ name: 'Neutral', values: [12, 16, 27, 30, 28], color: YE }, { name: 'En desacuerdo', values: [6, 10, 32, 22, 20], color: PK }] })],
        notes: 'Barras apiladas al 100 % con etiquetas: la carga de trabajo fue lo peor valorado. Datos de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'rating', fontSize: 36, question: 'Del 1 al 5: ¿cómo valoras el equilibrio entre tu trabajo y tu vida personal?', x: 80, y: 50, w: 1120, h: 620 })],
        notes: 'Valoración de 1 a 5 desde el móvil: se ve el reparto y la media al momento.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', fontSize: 40, question: '¿Qué palabra describe hoy a tu equipo?', options: [], x: 80, y: 50, w: 1120, h: 620 })],
        notes: 'Nube de palabras: las más repetidas crecen. Comentar las tres más grandes.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', fontSize: 30, question: '¿Qué mejorarías primero? Elige dos', x: 80, y: 50, w: 1120, h: 620,
        options: ['El reparto de la carga de trabajo', 'Los planes de carrera', 'La comunicación entre áreas', 'La flexibilidad horaria', 'El reconocimiento del trabajo bien hecho'] })],
        notes: 'Elección múltiple: cada persona marca dos opciones.' },
      { title: 'Lo que hemos hecho desde 2025', layout: 'titleOnly', bg: BG, extra: [['+6', 'personas en soporte para repartir la carga', MI], ['3', 'planes de carrera para perfiles técnicos', YE],
        ['12', 'reuniones de toda la empresa, una al mes', CY], ['10', 'viernes por la tarde libres en verano', PK]].flatMap(([n, d, c], i) => { const x = 90 + (i % 2) * 560, y = 185 + Math.floor(i / 2) * 230;
        return [withAnims(card(`<div style="font-size:64px;font-weight:800;line-height:1;color:${c}">${n}</div><div style="margin-top:8px">${d}</div>`, x, y, 540, 210, '#ffffff10', { fontSize: 26, color: W, pad: [26, 26, 24, 110] }), chain(i, 'fade-up')),
          withAnims(shape('ellipse', x + 28, y + 30, 56, 56, c), A('zoom-in', { start: 'withPrev' })), withAnims(icon('check', x + 40, y + 42, 32, BG), A('fade-in', { start: 'withPrev' }))]; }),
        notes: 'Cerrar el círculo: lo que se pidió el año pasado y lo que se ha hecho. Las cuatro tarjetas entran en cadena con un clic.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'qa', fontSize: 34, question: 'Preguntas para el comité de dirección', options: [], x: 80, y: 50, w: 1120, h: 620 })],
        notes: 'Preguntas del público, anónimas: se envían desde el móvil y se votan las más interesantes.' },
      { title: 'Qué pasa ahora', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Escuchar\nDecidir\nActuar\nMedir', 90, 170, 560, 480),
        withAnims(text(`<div style="margin-bottom:22px"><b style="color:${MI}">Noviembre</b><br>Resultados completos por áreas</div><div style="margin-bottom:22px"><b style="color:${YE}">Diciembre</b><br>Tres compromisos de la dirección</div><div><b style="color:${PK}">Marzo</b><br>Encuesta corta de seguimiento</div>`,
          720, 200, 470, 420, { fontSize: 28, color: W }), A('fade-left'))],
        notes: 'Diagrama de ciclo: la encuesta no acaba hoy. Clic: las fechas.' },
      { layout: 'section', title: 'Gracias por contarlo', subtitle: 'Los resultados, en la intranet en dos semanas', bg: BG, transition: 'zoom',
        notes: 'Agradecer la participación y recordar que todo es anónimo.' },
    ]));
  } },

  // 10 · Investment pitch: black and gold, a 3D product that moves with Transform.
  biz_investment: { name: 'Presentación para inversores', cat: 'biz', summary: 'Negro y oro: producto 3D que gira y viaja con Transformar, cifras gigantes, mercado en círculos, tracción, uso de fondos y equipo', make: () => {
    const BG = '#0a0a0b', GOLD = '#d4af37', W = '#f5f5f4', MUTE = '#a8a29e', DIM = '#1c1a17';
    const bottle = uid(), name = uid();
    const funds = [['Producto y tecnología', 40], ['Ventas en Europa', 35], ['Operaciones', 15], ['Reserva', 10]];
    const deck = numbered(build({ name: 'Hidra · Serie A', palette: 'grayscale', fonts: 'classic', title: { size: 48, color: GOLD },
      decor: () => [shape('rect', 0, 0, 1280, 4, GOLD)] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(640, 0, 700, '#3a3020', BG, 90),
        kicker('RONDA SERIE A · 2027', 90, 180, 600, GOLD, 20),
        { ...text('Hidra', 80, 200, 660, 230, { fontFamily: head('classic'), fontSize: 190, wordart: 'gold' }), id: name },
        text('La botella que cuida de tu equipo', 90, 440, 640, 60, { fontSize: 36, color: W }),
        text('Dosier para inversores · confidencial', 90, 520, 640, 40, { fontSize: 22, color: MUTE }),
        { ...model('kh-WaterBottle', 780, 90, 400, 560, { autoRotate: true, view: 'three' }), id: bottle }],
        notes: 'Portada en negro y oro: Text Art «Oro» y el producto en 3D girando. Hidra es una empresa inventada; las cifras son de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [
        kicker('EL PROBLEMA', 90, 110, 600, GOLD, 20),
        withAnims(text('3 de 4', 84, 150, 700, 240, { fontFamily: head('classic'), fontSize: 200, color: GOLD }), A('zoom-in', { start: 'afterPrev', duration: 800 })),
        text('personas que trabajan en una oficina beben menos agua de la recomendada', 90, 400, 640, 130, { fontSize: 34, color: W }),
        shape('rect', 800, 160, 1, 400, '#ffffff30'),
        withAnims(text(`<div style="font-size:60px;font-family:${head('classic')};color:${W}">−12 %</div><div>de concentración con una deshidratación leve</div>`, 850, 170, 340, 180, { fontSize: 22, color: MUTE }), A('fade-left')),
        withAnims(text(`<div style="font-size:60px;font-family:${head('classic')};color:${W}">1 de 3</div><div>empresas ya paga programas de bienestar</div>`, 850, 380, 340, 180, { fontSize: 22, color: MUTE }), A('fade-left', { start: 'afterPrev' }))],
        notes: 'Una cifra gigante que entra sola y dos de apoyo con un clic. Cifras de ejemplo: en una presentación real, citar la fuente.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        { ...text('Hidra', 90, 60, 400, 110, { fontFamily: head('classic'), fontSize: 80, wordart: 'gold' }), id: name },
        { ...model('kh-WaterBottle', 90, 170, 340, 480, { autoRotate: true, view: 'three' }), id: bottle },
        ...[['Recuerda beber', 'Una luz suave cuando toca, sin notificaciones.'], ['Mide lo que bebes', 'Y lo envía al móvil sin que hagas nada.'], ['Panel para la empresa', 'Datos agregados y anónimos por oficina.'], ['Hecha para durar', 'Acero, rellenable y con diez años de vida.']].flatMap(([h, d], i) => [
          withAnims(text(`<div style="font-size:30px;font-family:${head('classic')};color:${GOLD}">${h}</div><div>${d}</div>`, 560, 170 + i * 120, 620, 110, { fontSize: 23, color: W }), chain(i, 'fade-left')),
          withAnims(shape('rect', 520, 186 + i * 120, 4, 70, GOLD), A('fade-in', { start: 'withPrev' }))])],
        notes: 'Transformar: el nombre y la botella viajan desde la portada a su sitio. Un clic y las cuatro ventajas entran en cadena.' },
      { title: 'Un mercado que despega', layout: 'titleOnly', bg: BG, extra: [
        ...[[230, '#2a2620'], [160, '#5c4d24'], [90, GOLD]].map(([r, c], i) => withAnims(shape('ellipse', 330 - r, 420 - r, 2 * r, 2 * r, c), chain(i, 'zoom-in', { duration: 500 }))),
        ...[['12.000 M€', 'Bienestar corporativo en Europa', 200], ['1.800 M€', 'Empresas de más de 200 personas', 350], ['90 M€', 'Nuestro objetivo a cinco años (5 %)', 500]].map(([n, l, y], i) =>
          withAnims(text(`<div style="font-size:48px;font-family:${head('classic')};color:${i === 2 ? GOLD : W}">${n}</div><div>${l}</div>`, 640, y, 550, 130, { fontSize: 24, color: MUTE }), A('fade-left', { start: 'withPrev', delay: i * 150 })))],
        notes: 'Mercado total, alcanzable y objetivo como círculos concéntricos hechos con formas. Estimaciones de ejemplo.' },
      { title: 'Tracción', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 700, h: 470, chartType: 'area', grid: true, color: GOLD, seriesName: 'Ingresos recurrentes al mes (k€)',
          data: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => ({ label: m, value: [18, 22, 27, 31, 38, 44, 52, 60, 71, 83, 97, 112][i] })) }),
        ...[['112 k€', 'ingresos recurrentes en diciembre'], ['×6', 'en doce meses'], ['64', 'empresas clientes, 9.800 usuarios']].map(([n, l], i) =>
          withAnims(text(`<div style="font-size:52px;font-family:${head('classic')};color:${GOLD};line-height:1.1">${n}</div><div>${l}</div>`, 840, 180 + i * 150, 350, 140, { fontSize: 22, color: W }), chain(i, 'fade-up')))],
        notes: 'Gráfico de área con cuadrícula: ingresos recurrentes de 2026, en miles de euros al mes.' },
      { title: 'Modelo de negocio', layout: 'titleOnly', bg: BG, extra: [
        ...[['Botella', '49 €', 'por persona, una sola vez'], ['Suscripción', '4 €', 'por persona y mes: app y panel'], ['Instalación', '1.500 €', 'por oficina: fuentes y puesta en marcha']].map(([h, n, d], i) =>
          withAnims(card(`<div style="font-size:26px;color:${MUTE}">${h}</div><div style="font-size:72px;font-family:${head('classic')};color:${GOLD};line-height:1.2">${n}</div><div>${d}</div>`, 90 + i * 380, 190, 340, 300, DIM, { fontSize: 23, color: W, textAlign: 'center', vAlign: 'middle', borderColor: '#d4af3766' }), chain(i, 'zoom-in'))),
        text(`Margen bruto <b style="color:${GOLD}">61 %</b> · coste de captación recuperado en <b style="color:${GOLD}">9 meses</b>`, 90, 540, 1100, 50, { fontSize: 28, textAlign: 'center', color: W })],
        notes: 'Tres fuentes de ingresos; la suscripción es la que da valor a la compañía.' },
      { title: 'Uso de los fondos', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 100, y: 180, w: 440, h: 440, chartType: 'doughnut', color: GOLD, data: funds.map(([label, value]) => ({ label, value })) }),
        legend(funds.map(([l, v], i) => [PIE[i], `${l} · <b>${v} %</b>`]), 620, 210, 570, W, 28),
        text(`Con <b style="color:${GOLD}">3 M€</b>: 18 meses de recorrido y entrada en Francia y Portugal.`, 620, 450, 570, 100, { fontSize: 28, color: W })],
        notes: 'Gráfico de dona con su leyenda: a qué se dedica cada euro de la ronda.' },
      { title: 'Equipo', layout: 'titleOnly', bg: BG, extra: [...[['ED', 'Elena Duarte', 'CEO · 12 años en salud digital'], ['MV', 'Marcos Vidal', 'CTO · dispositivos conectados'], ['SL', 'Sofía Lin', 'Producto · diseño industrial'], ['JO', 'Javier Ortega', 'Ventas · grandes empresas']]
        .flatMap(([ini, n, r], i) => { const x = 90 + i * 280;
          return [withAnims(shape('ellipse', x + 55, 200, 150, 150, DIM, { stroke: GOLD, strokeWidth: 3 }), chain(i, 'fade-up')),
            withAnims(text(ini, x + 55, 240, 150, 70, { fontFamily: head('classic'), fontSize: 52, textAlign: 'center', vAlign: 'middle', color: GOLD }), A('fade-in', { start: 'withPrev' })),
            withAnims(text(`<div style="font-size:26px;font-weight:700;color:${W}">${n}</div><div>${r}</div>`, x, 380, 260, 120, { fontSize: 21, textAlign: 'center', color: MUTE }), A('fade-up', { start: 'withPrev' }))]; }),
        text('Asesoras y asesores: dos exdirectivos de recursos humanos y una médica del trabajo', 90, 560, 1100, 40, { fontSize: 22, textAlign: 'center', color: MUTE })],
        notes: 'Equipo fundador (personas inventadas). Contar en una frase por qué este equipo puede ganar.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-200, 200, 700, '#3a3020', BG, 80),
        kicker('LA RONDA', 90, 170, 600, GOLD, 20),
        text('3 M€', 84, 200, 640, 230, { fontFamily: head('classic'), fontSize: 200, wordart: 'gold' }),
        text('Serie A · 18 meses de recorrido · cierre en junio', 90, 440, 700, 50, { fontSize: 28, color: W }),
        text('inversores@hidra.example', 90, 520, 680, 40, { fontSize: 26, color: GOLD }),
        model('kh-WaterBottle', 840, 120, 340, 500, { motion: 'swing', view: 'three' })],
        notes: 'Cierre: la cifra que pedimos, para qué y hasta cuándo. La botella entra con un balanceo de cámara.' },
    ]));
    deck.textColor = W;
    return deck;
  } },
};
