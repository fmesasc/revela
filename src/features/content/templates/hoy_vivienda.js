// Example presentation: Actualidad · Vivienda en España (precios, alquiler y acceso). Datos de fuentes oficiales consultados el
// 2026-11-15 (INE, Ministerio de Vivienda, Banco de España, BCE, Eurostat, Registradores, BOE…): cada cifra lleva su organismo, su
// periodo y su fecha de publicación en las notas del orador, y la última diapositiva lista las fuentes. La investigación (cifra →
// fuente → enlace) está en docs/plantillas-actualidad/hoy_vivienda.md. Neutral: datos y varias lecturas, sin tomar partido.
// Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js). Todo el texto va en bloques, para poder traducirlo.
// Iconos 3D (3dicons.co, CC0: assets/icons3d/<id>.webp) sobre luces suaves y paneles de cristal.

import { build, text, shape, ul, A, withAnims, numbered, glow, chartBlock, tableBlock, pollBlock, timer, base, deep } from './kit.js';

const AI = new URL('../../../../assets/icons3d/', import.meta.url).href;
const FF = { head: "'Merriweather', serif" };
const ico = (id, x, y, s, alt, props = {}) => ({ ...base(x, y, s, s), type: 'image', src: `${AI}${id}.webp`, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const seq = (b, i, effect = 'fade-up') => on(b, effect, { start: i ? 'afterPrev' : 'click' });
const along = (b, effect, props = {}) => on(b, effect, { start: 'withPrev', ...props });

// Light "newspaper" theme: warm paper, navy ink, burnt orange, navy, teal and crimson accents.
const T = { dark: false, bg: '#fbf8ef', l: ['#f59e0b', '#38bdf8', '#fb923c'], ink: '#15233f', soft: '#4b5670', acc: '#b45309', cols: ['#b45309', '#1f3b73', '#2e7d6e', '#9d174d'],
  head: '#15233f', headFg: '#ffffff', panel: 'rgba(255,255,255,0.72)', edge: 'rgba(21,35,63,0.18)', line: 'rgba(21,35,63,0.22)', band: '#15233f', op: [34, 28, 22] };
const lights = () => [glow(-160, -180, 640, T.l[0], T.bg, T.op[0]), glow(760, 330, 700, T.l[1], T.bg, T.op[1]), glow(470, -260, 520, T.l[2], T.bg, T.op[2])];
const glass = (html, x, y, w, h, props = {}) => text(html, x, y, w, h, { bg: T.panel, borderColor: T.edge, borderWidth: 1.5, radius: 24,
  pad: [20, 26, 20, 26], glass: 18, color: T.ink, fontSize: 26, ...props });
const heading = t => text(t, 70, 30, 1140, 104, { fontSize: 36, fontWeight: 800, color: T.ink, fontFamily: FF.head, lineHeight: 1.15, vAlign: 'middle' });
const label = (t, x, y, w) => text(t, x, y, w, 30, { fontSize: 20, letterSpacing: 3, fontWeight: 700, color: deep(T.acc, '#ffffff') });
const note = (t, y = 612, x = 70, w = 1140) => text(t, x, y, w, 60, { fontSize: 20, color: T.soft, lineHeight: 1.3 });
const credit = () => text('Iconos 3D: 3dicons.co · Vijay Verma (CC0)', 70, 686, 520, 26, { fontSize: 14, color: T.soft, letterSpacing: 1 });
// The source line, under every slide with figures: who says it, which table, which period.
const src = t => text(t, 70, 654, 1140, 30, { fontSize: 16, color: T.soft, lineHeight: 1.2 });
const slideOf = (extra, notes, o = {}) => ({ layout: 'blank', bg: T.bg, back: lights(), extra, notes, transition: 'fade', ...o });
const tc = c => deep(c, '#ffffff');
const tbl = (rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 22, header: true, headBg: T.head, headFg: T.headFg, stroke: T.line,
  banded: true, band: T.band, bandAlpha: 0.06, color: T.ink, rows, ...o });

// The cover: a glass panel with the kicker, the title and a line, and 3D icons at the right.
const cover = (kicker, title, sub, icons, notes, source, fs = 44) => slideOf([
  glass('', 70, 130, 700, 440, { glass: 22 }), label(kicker, 110, 172, 620),
  text(title, 104, 214, 640, 210, { fontSize: fs, fontWeight: 800, color: T.ink, lineHeight: 1.1, fontFamily: FF.head }),
  text(sub, 110, 345, 620, 200, { fontSize: 23, color: T.soft, lineHeight: 1.35 }),
  ...icons.map(([id, alt, x, y, s], i) => on(ico(id, x, y, s, alt), i ? 'zoom-in' : 'fade-up', { start: 'afterPrev' })), src(source), credit()], notes);

// Three or four cards: a 3D icon over a big figure and a line, on glass.
const cards = (title, items, notes, foot, source) => { const n = items.length, w = n === 4 ? 262 : 360, gap = (1140 - n * w) / (n - 1), big = n === 4 ? 130 : 170;
  return slideOf([heading(title), ...items.flatMap(([id, alt, t, d], i) => { const x = 70 + i * (w + gap);
    return [seq(glass(`<div style="text-align:center"><b style="font-size:${n === 4 ? 36 : 44}px;color:${tc(T.cols[i % 4])};font-family:${FF.head}">${t}</b><br><span style="font-size:${n === 4 ? 20 : 23}px;color:${T.ink}">${d}</span></div>`,
      x, 245, w, 330, { vAlign: 'bottom', pad: [14, 16, 18, 16] }), i), along(ico(id, x + (w - big) / 2, 245 - big * 0.4, big, alt), 'zoom-in')]; }),
    ...(foot ? [note(foot, 596, 70, 1140)] : []), ...(source ? [src(source)] : []), credit()], notes); };

// A table on glass, with a line under it if needed.
const table = (title, rows, notes, o = {}) => slideOf([heading(title),
  tbl(rows, 70, 148, 1140, o.h || rows.length * 54, { fontSize: o.fs || 22, ...(o.colW && { colW: o.colW }) }),
  ...(o.foot ? [note(o.foot, o.footY || 590)] : []), ...(o.source ? [src(o.source)] : [])], notes);

// A chart on glass at the left, and a text at the right.
const chart = (title, chartProps, side, notes, source, foot) => slideOf([heading(title), glass('', 70, 148, 700, foot ? 440 : 480, { glass: 20 }),
  chartBlock({ x: 90, y: 162, w: 660, h: foot ? 412 : 452, labelColor: T.ink, grid: true, ...chartProps }),
  seq(glass(side, 800, 148, 410, foot ? 440 : 480, { fontSize: 22, lineHeight: 1.36, vAlign: 'middle' }), 0, 'fade-left'),
  ...(foot ? [note(foot, 594, 70, 700)] : []), src(source)], notes);

// Two or three columns, each with a coloured title and a body (a list, a line…).
const columns = (title, cols, notes, foot, source) => { const n = cols.length, gap = 24, w = (1140 - gap * (n - 1)) / n;
  return slideOf([heading(title), ...cols.map(([c, t, body], i) => seq(glass(`<div style="font-size:28px;font-weight:800;color:${tc(c)};margin-bottom:.3em;font-family:${FF.head}">${t}</div><div style="font-size:${n === 3 ? 21 : 24}px;color:${T.ink};line-height:1.33">${body}</div>`,
    70 + i * (w + gap), 148, w, foot ? 436 : 480, { pad: [22, 24, 18, 24], borderColor: c }), i, 'fade-up')), ...(foot ? [note(foot, 594)] : []), ...(source ? [src(source)] : [])], notes); };

const pollSlide = (q, opts, notes) => slideOf([pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question: q, options: opts, color: T.ink })], notes);
const reto = (title, body, notes, secs = 480, end = '¡Tiempo!') => slideOf([heading(title), glass(body, 70, 148, 800, 470, { fontSize: 26, lineHeight: 1.4, vAlign: 'middle' }),
  timer(secs, 910, 190, 280, { color: T.acc, endText: end })], notes);

const D = (labels, values) => labels.map((label, i) => ({ label, value: values[i] }));

export default {
  hoy_vivienda: { name: 'Actualidad: vivienda en España', cat: 'edu',
    summary: 'Precios, alquiler y acceso a la vivienda con datos oficiales de noviembre de 2026 (INE, Banco de España, Eurostat, BCE, Registradores, Ministerio): cinco «precios» que no son lo mismo, zonas tensionadas, esfuerzo de acceso, emancipación, déficit de oferta, hipotecas, comparación con la UE, qué dicen y qué no dicen los datos, lecturas distintas, votación y debate',
    make: () => numbered(build({ name: 'Actualidad: vivienda en España', palette: 'mostaza', fonts: 'editorial', title: { color: '#15233f', size: 40 }, body: { color: '#15233f' } }, [

      // 1 · Portada
      cover('ACTUALIDAD · DATOS A NOVIEMBRE DE 2026', 'Vivienda en España: precios, alquiler y acceso', 'Los precios suben un 12,2 % al año, se sale de casa a los 30,2 años y faltan unas 750.000 viviendas. ¿Qué dicen de verdad las cifras?',
        [['key', 'Una llave', 810, 70, 320], ['euro', 'Una moneda de euro', 770, 400, 200], ['location', 'Un marcador de mapa', 1000, 420, 200]],
        'Portada. Presentación para profesorado (Economía, Geografía, Tutoría, FP), empresa y divulgación sobre un tema muy politizado: aquí se muestran datos oficiales, se avisa de qué mide cada cifra y se exponen varias lecturas de causas y de políticas, sin recomendar ninguna. Todas las cifras se consultaron el 15 de noviembre de 2026; cada diapositiva con datos lleva su fuente y fecha en las notas y en la última diapositiva. Antes de presentarla, comprueba si hay datos nuevos. LAS TRES CIFRAS DEL GANCHO: cada una es un dato de una fuente oficial, pero mide una cosa distinta. 12,2 %: índice de precios de compraventa (INE, nota de prensa del 7-9-2026, Índice de Precios de Vivienda base 2025, variación anual del 2.º trimestre de 2026). 30,2 años: la edad a la que la mitad de la población ya no vive con sus padres (Eurostat, noticia del 15-9-2026, datos de 2025; media de la UE, 26,3). 750.000: déficit estimado (Banco de España, Informe Anual 2025, presentación del 18-6-2026: diferencia acumulada de 2021 a 2025 entre viviendas terminadas y creación neta de hogares; es una estimación, no un recuento). Pregunta de gancho: ¿cuál de las tres os parece más preocupante y por qué?',
        'Fuentes: INE (IPV, 2T 2026) · Eurostat (2025) · Banco de España (Informe Anual 2025, déficit estimado de 2021-2025).'),

      // 3 · Cinco «precios» que no son lo mismo
      table('Cinco «precios» que no son lo mismo', [['Fuente', 'Qué mide', 'Último dato'],
        ['INE · Índice de Precios de Vivienda', 'Compraventas reales, corregidas por tipo de vivienda (un índice, no euros)', '+12,2 % anual (2.º trim. 2026)'],
        ['Ministerio de Vivienda · valor tasado', 'Tasaciones para hipotecas, no la venta', '2.355 €/m² · +12,5 % (2.º trim. 2026)'],
        ['Registradores · precio inscrito', 'Escrituras inscritas en el Registro', '2.487 €/m² · +9,2 % (2.º trim. 2026)'],
        ['Notarios · precio escriturado', 'Escrituras firmadas ante notario', '2.049 €/m² · +8,8 % (mayo de 2026)'],
        ['Portal idealista · precio de oferta', 'Anuncios de vivienda usada, no ventas', '2.955 €/m² · +11,2 % (octubre de 2026)']],
        'Clave de lectura de todo el tema. Cada cifra sale de una fuente con otra cobertura y otra fecha, por eso no se pueden restar ni comparar en euros. INE: IPV base 2025, 2.º trimestre 2026, publicado el 7-9-2026, cubre alrededor del 95 % de las compraventas y es definitivo. Ministerio de Vivienda: valor tasado de vivienda libre, 2.º trimestre de 2026, 2.355 €/m² (+12,5 % anual, +1,7 % trimestral); el propio Ministerio ha precisado que es valor de tasación y no precio de mercado (dato conocido por prensa; el trimestre siguiente se publica en noviembre). Registradores: Estadística Registral Inmobiliaria nº 89 (2.º trim. 2026): 2.487 €/m², +9,2 % anual, máximo histórico; es el precio de escrituras ya inscritas, semanas después de firmarlas. Notarios: Centro de Información Estadística del Notariado, mayo de 2026 (publicado el 30-7-2026): 2.049 €/m² y +8,8 %, según la prensa que lo cita (el portal es penotariado.com: comprueba el último mes). idealista: precio de vivienda usada en venta, octubre de 2026 (4-11-2026): 2.955 €/m², +11,2 %, y cambió su método en julio de 2026. Idea para el aula: ¿por qué el precio de anuncio es mayor que el de escritura?',
        { colW: [2.5, 3.2, 2.6], fs: 21, h: 400, foot: 'Miden cosas distintas, en fechas distintas y con otra cobertura: compara cada serie solo consigo misma.', footY: 574,
          source: 'Fuentes: INE, Ministerio de Vivienda, Colegio de Registradores, Notariado e idealista (consultado el 15-11-2026).' }),

      // 4 · Precios: España frente a Europa
      chart('Los precios suben más en España que en la UE',
        { chartType: 'line', color: T.cols[0], seriesName: 'España', data: D(['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'], [100.7, 104.5, 110.4, 117.9, 124.3, 127.0, 131.2, 141.7, 147.0, 158.6, 178.9, 200.6]),
          series: [{ name: 'UE', values: [99.8, 103.8, 108.8, 114.2, 119.8, 126.3, 136.0, 149.6, 148.2, 152.7, 160.9, 168.6], color: T.cols[1] }, { name: 'Alemania', values: [99.9, 106.9, 113.1, 120.6, 127.8, 136.2, 151.8, 167.4, 151.6, 147.8, 152.6, 153.5], color: T.cols[2] },
            { name: 'Francia', values: [99.5, 100.2, 103.5, 106.4, 109.8, 115.5, 122.5, 130.8, 131.7, 125.7, 126.5, 125.5], color: T.cols[3] }, { name: 'Italia', values: [99.8, 100.5, 99.6, 99.2, 99.1, 102.4, 102.8, 108.1, 108.8, 112.0, 116.4, 121.0], color: '#6b7280' }],
          yTitle: 'Índice de precios, 2015 = 100', yMin: 80, alt: 'Gráfico de líneas del índice de precios de la vivienda de 2015 a 2026 en España, la UE, Alemania, Francia e Italia: España llega a 200,6, la UE a 168,6, Alemania a 153,5, Francia a 125,5 e Italia a 121,0.' },
        '<b>2.º trim. 2026</b><br>España: <b>200,6</b><br>UE: 168,6<br>Alemania: 153,5<br>Francia: 125,5<br>Italia: 121,0<br><br>En el último año: España +12,1 %, UE +4,7 %. El INE da +12,2 % (nueva +7,4 %, usada +12,9 %).',
        'Eurostat, índice de precios de la vivienda (prc_hpi_q, base 2015 = 100), 2.º trimestre de cada año; datos publicados el 1-10-2026. Último año (2.º trim. 2026 frente al 2.º de 2025): España +12,1 %, UE +4,7 %, zona euro +4,0 %; el mayor aumento de la UE es el de Portugal (+16,5 %; su índice es 301,4, por eso no está en el gráfico) y bajan Finlandia, Luxemburgo y Francia. El INE da +12,2 % para España (nota del 7-9-2026, datos definitivos): la pequeña diferencia es normal, Eurostat usa los datos que recibe del INE en otra fecha. Desglose INE: vivienda nueva +7,4 %, segunda mano +12,9 %; todas las comunidades suben, de +9,5 % (Navarra) a +15,2 % (Ceuta) y +15,0 % (Asturias). El Banco de España añade que los precios reales han vuelto a niveles de 2005 (por debajo del máximo de 2007) y que su ritmo se aceleró desde 2024. Un índice dice cuánto sube, no cuán cara es una vivienda: Italia o Francia pueden ser más baratas o más caras en euros y aun así subir menos.',
        'Fuente: Eurostat, House Price Index (prc_hpi_q), 2.º trim. de cada año · INE (IPV, 2T 2026).'),

      // 5 · Alquiler
      chart('Alquiler: sube sobre todo el contrato nuevo',
        { chartType: 'bar', color: T.cols[1], seriesName: '% de subida en 2024', dataLabels: true, data: D(['Todos los alquileres', 'Contratos nuevos', 'Contratos ya vigentes'], [3.5, 8.8, 2.8]), yTitle: 'Subida en 2024 (%)', yMin: 0,
          alt: 'Gráfico de barras de la subida del alquiler en 2024 según el INE: todos los alquileres 3,5 por ciento, contratos nuevos 8,8 por ciento y contratos ya vigentes 2,8 por ciento.' },
        '<b>2024, INE:</b> +3,5 % en total; +8,8 % en los contratos firmados ese año.<br><br>Banco de España: el precio de entrada de un contrato nuevo supera en un 16,5 % al del parque ya alquilado.<br><br><b>Ojo:</b> los 1.176 € al mes de otros informes son precios de anuncio (CJE).',
        'INE, Índice de Precios de Vivienda en Alquiler (IPVA, base 2015), año 2024, nota de prensa del 11-5-2026: los precios de la vivienda alquilada subieron un 3,5 % (2,6 % en 2023); los contratos nuevos de 2024, un 8,8 %, y los ya existentes, un 2,8 %. Por comunidades: Comunitat Valenciana +5,0 %, Illes Balears +4,0 %, Andalucía +3,8 %; las menores, Asturias +2,7 % y Castilla y León +3,0 %. Es una estadística experimental, calculada con las declaraciones de la renta (Agencia Tributaria): refleja alquileres declarados, no anuncios, y llega con año y medio de retraso, por eso 2024 es el último año disponible. Banco de España, Informe Anual 2025 (cap. 2): en 2024 los inmuebles que entraban en el mercado se alquilaban un 16,5 % por encima del precio medio del parque (la presentación del 18-6-2026 da 16,6 % en su gráfico); de 2019 a 2024 los nuevos contratos subieron de media un 4,9 % anual, el parque un 3,9 % y las actualizaciones de contratos vigentes un 1,7 %. Atención: los 1.176 €/mes de la diapositiva sobre jóvenes son el precio de oferta que recoge idealista, para 80 m², no lo que paga de media un inquilino. Para el debate: si el precio de entrada sube tanto, ¿quién paga el coste, el que ya tiene contrato o el que busca piso?',
        'Fuentes: INE (IPVA 2024, publicado el 11-5-2026) · Banco de España (Informe Anual 2025).'),

      // 6 · Zonas tensionadas
      table('Zonas tensionadas: dónde hay a 15 de noviembre de 2026', [['Comunidad', 'Zonas declaradas', 'Desde'],
        ['Cataluña', 'Unos 270 municipios', 'Marzo y octubre de 2024'], ['País Vasco', '21 municipios (Bilbao, Vitoria-Gasteiz, San Sebastián…)', 'De enero de 2025 a noviembre de 2026'],
        ['Navarra', '21 municipios (Pamplona, Tudela…)', 'Julio de 2025'], ['Galicia', 'A Coruña y Santiago de Compostela', 'Julio de 2025 y julio de 2026'],
        ['Asturias', 'Partes de 5 concejos (Gijón, Avilés, Gozón, Llanes, Cabrales)', 'Julio de 2026'], ['Resto de España', 'Ninguna (Madrid, Valencia, Andalucía, Baleares…)', '—']],
        'Estado real según el registro del Ministerio de Vivienda (consulta de zonas de mercado residencial tensionado, consultado el 15-11-2026) y la resolución del BOE del 3-11-2026 (BOE-A-2026-23088, tercer trimestre de 2026: Sopela, Urduliz y Bergara). Por la Ley 12/2023, de 24 de mayo, por el derecho a la vivienda (art. 18), la comunidad autónoma declara la zona y el Ministerio publica la relación; cada declaración dura tres años y puede prorrogarse. El recuento de Cataluña (unos 270 municipios, en dos resoluciones) sale de la lista del Ministerio; el Gobierno catalán declaró además 53 municipios más el 19-10-2026 (resolución TER/3740/2026, según la OCU), pendientes de aparecer en el BOE a esta fecha: comprueba si ya figuran. El Banco de España describe el efecto así: en las zonas tensionadas se aplican controles de precio, vinculados al sistema estatal de referencia (SERPAVI), que limitan el precio de los nuevos contratos. En las declaraciones del BOE, gran tenedor es quien posee 5 o más inmuebles urbanos de uso residencial. Las lecturas sobre su eficacia difieren: ver la diapositiva de lecturas distintas. No hay en esta presentación una cifra del efecto sobre los precios porque no hemos encontrado una evaluación oficial con datos; si la hay cuando presentes, añádela con su fuente.',
        { colW: [1.6, 4, 2.4], fs: 21, h: 392, foot: 'En estas zonas se limita el precio de los nuevos contratos de alquiler. Gran tenedor: 5 o más viviendas. Cada declaración dura 3 años y la hace la comunidad autónoma.', footY: 546,
          source: 'Fuente: Ministerio de Vivienda (registro de zonas tensionadas) · BOE del 3-11-2026. Cataluña: 53 municipios más (19-10-2026, según la OCU), aún sin BOE.' }),

      // 7 · Esfuerzo de acceso
      chart('Cuántos años de renta cuesta comprar una vivienda',
        { chartType: 'hbar', color: T.cols[2], seriesName: 'Años de renta neta', dataLabels: true, grid: false, data: D(['Málaga', 'Madrid', 'Barcelona', 'Sevilla', 'Jóvenes (hasta 35 años)', 'Toda España', 'València', 'Zaragoza'], [10.0, 9.7, 9.0, 7.2, 7.1, 6.8, 6.7, 5.7]),
          alt: 'Gráfico de barras horizontales de los años de renta neta media que necesitan para comprar una vivienda los hogares que no son propietarios, en 2024: Málaga 10,0, Madrid 9,7, Barcelona 9,0, Sevilla 7,2, jóvenes 7,1, toda España 6,8, València 6,7 y Zaragoza 5,7.' },
        '<b>6,8 años</b> de renta neta media en toda España (hogares no propietarios, 2024).<br><br>Jóvenes: <b>7,1</b>. En alquiler, un joven no emancipado destinaría el <b>36,3 %</b> de la renta de su hogar.<br><br>Índice precio/renta (OCDE): +88,6 % desde 1980.',
        'Banco de España, Informe Anual 2025 (cap. 2, cuadro 2.4 y gráfico 2.8), datos de 2024: años de renta neta media del hogar para comprar una vivienda al precio medio de compraventa (Notariado), calculados para los hogares que no son propietarios (renta del Panel de Hogares de la Agencia Tributaria, el INE y el Instituto de Estudios Fiscales). España: 6,8; jóvenes hasta 35 años: 7,1; extranjeros: 7,6; Madrid 9,7, Barcelona 9,0, València 6,7, Sevilla 7,2, Zaragoza 5,7 y Málaga 10,0 (precio medio del municipio). Alquiler: un joven no emancipado, en un hogar de dos jóvenes con la misma renta, destinaría de media el 36,3 % de la renta del hogar a alquilar en su municipio (datos de 2024). El indicador de la OCDE precio/renta para España acumula en 2025 un +88,6 % respecto a 1980, está un 18,1 % por debajo del máximo de 2007 y un 40 % por encima de los años noventa. El Banco de España señala que estos esfuerzos son mayores en las grandes ciudades y entre jóvenes y nuevos residentes, y que el problema no es solo de ingresos: solo entre el 10 % y el 15 % de los hogares en alquiler tendrían ahorro o ingresos para una hipoteca con las condiciones prudentes actuales. Aviso: son medias; un hogar concreto puede estar muy lejos de ellas.',
        'Fuente: Banco de España, Informe Anual 2025 (cuadros 2.4 y gráfico 2.8; datos de 2024). Hogares que no son propietarios.'),

      // 8 · Jóvenes y emancipación
      cards('Jóvenes: tarde y con mucho esfuerzo', [['clock', 'Un reloj', '30,2 años', 'Edad media de salida del hogar familiar en 2025 (UE: 26,3)'],
        ['key', 'Una llave', '14,5 %', 'De 16 a 29 años estaban emancipados en 2025: el dato más bajo registrado'],
        ['wallet', 'Una cartera', '98,7 %', 'Del sueldo neto joven para alquilar solo, a precios de anuncio'], ['bag', 'Una bolsa', '33,6 %', 'Del sueldo para compartir piso (una habitación, unos 400 €)']],
        'Eurostat (yth_demo_030, noticia del 15-9-2026): en 2025 la edad a la que la mitad de la población deja de vivir con sus padres fue de 30,2 años en España (30,0 en 2024) y 26,3 en la UE; Croacia 31,5, Finlandia 21,4. Observatorio de Emancipación del Consejo de la Juventud de España (CJE), balance de 2025, publicado el 22-5-2026: tasa de emancipación de 16 a 29 años del 14,5 %, la más baja desde que hay registros comparables; solo el 25,2 % de los jóvenes con empleo estaban emancipados. Esfuerzo de acceso: alquilar sola una vivienda libre costaba 1.176 €/mes de media a finales de 2025 (+8,9 %), el 98,7 % del salario neto de una persona joven asalariada (1.191 € al mes); compartir piso (mediana de una habitación, unos 400 €), el 33,6 %. Comprar: precio medio de 223.000 € (valor tasado del Ministerio), 15,6 años de salario neto íntegro. AVISO METODOLÓGICO: los precios de alquiler del CJE son precios de oferta de idealista (80 m²), no alquileres firmados; el 98,7 % compara una media con un salario medio, no describe a cada joven; y esta edición cambió la fuente de ingresos (de la EPA a la Encuesta de Condiciones de Vida), así que no es comparable con ediciones anteriores. El CJE es una entidad que representa a organizaciones juveniles: su lectura es la de la juventud organizada; compárala con la del Banco de España (diapositiva anterior).',
        'Los datos de ingresos y alquiler son del CJE: precios de oferta de idealista para 80 m², sueldo neto medio de jóvenes asalariados.', 'Fuentes: Eurostat (yth_demo_030, 2025) · Consejo de la Juventud de España, Observatorio de Emancipación (balance de 2025, publicado el 22-5-2026).'),

      // 9 · Oferta y déficit
      chart('Se forman más hogares que viviendas',
        { chartType: 'hbar', color: T.cols[3], seriesName: 'Diferencial acumulado 2021-2025 (% de hogares)', dataLabels: true, grid: false, data: D(['Portugal', 'Países Bajos', 'España', 'Italia', 'Francia', 'Alemania'], [-7.0, -4.7, -3.9, -1.5, 0, 0.5]), yMin: -9, yMax: 2,
          alt: 'Gráfico de barras horizontales del diferencial acumulado entre viviendas construidas y hogares creados de 2021 a 2025, en porcentaje de los hogares: Portugal menos 7,0, Países Bajos menos 4,7, España menos 3,9, Italia menos 1,5, Francia casi cero y Alemania más 0,5.' },
        '<b>2025:</b> +240.000 hogares y 92.000 viviendas terminadas (−9 %). Iniciadas o visadas: unas 140.000.<br><br>Déficit acumulado 2021-2025: <b>unas 750.000</b> viviendas (3,9 % de los hogares).',
        'Banco de España, Informe Anual 2025 (cap. 2) y presentación del 18-6-2026 (gráfico «El crecimiento de los hogares es mayor al de la oferta de vivienda nueva»): el diferencial acumulado 2021-2025 entre viviendas terminadas y creación neta de hogares es de unas 750.000 viviendas, un 3,9 % de los hogares medios del periodo (Portugal −7 %, Países Bajos −4,7 %, España −3,9 %, Italia −1,5 %, Francia −0,02 %, Alemania +0,5 %). Método: para España se usan viviendas terminadas; para los otros países, visados de dos años antes; por eso la comparación es orientativa. En 2025: hogares +240.000 (+1,2 %), población +0,9 %, viviendas terminadas 92.000 (−9 %), compras netas de no residentes unas 30.000, y viviendas iniciadas o visadas de unas 110.000 a finales de 2023 a unas 140.000 en 2025. Causas que cita el Banco de España: suelo edificable escaso, planeamiento y gestión urbanística lentos, menor productividad y falta de mano de obra en la construcción, y demanda no residencial (turística y de no residentes). Es una estimación y depende de cómo se definan «hogar» y «vivienda necesaria»; otros análisis pueden llegar a cifras distintas: si citas uno, anota su fuente y su método. Cuidado: el déficit no es un número de pisos vacíos que falten en todas partes; se concentra en ciertas zonas.',
        'Fuente: Banco de España, Informe Anual 2025 y presentación del 18-6-2026.', 'Diferencial acumulado 2021-2025, en % de los hogares (negativo: faltan viviendas). Método distinto en España y en los demás países.'),

      // 10 · Hipotecas y tipos
      chart('Hipotecas y tipos: el crédito se encarece',
        { chartType: 'bar', color: T.cols[1], seriesName: 'Euríbor a 12 meses (%)', dataLabels: true, data: D(['2021', '2022', '2023', '2024', '2025', 'Oct. 2026'], [-0.502, 3.018, 3.679, 2.436, 2.267, 3.239]), yTitle: 'Euríbor a 12 meses (%, media de diciembre)',
          alt: 'Gráfico de barras del euríbor a 12 meses, media de diciembre: menos 0,50 por ciento en 2021, 3,02 en 2022, 3,68 en 2023, 2,44 en 2024, 2,27 en 2025 y 3,24 en octubre de 2026.' },
        '<b>BCE:</b> depósito al 2,50 % desde el 16-9-2026 (2,00 % hasta junio).<br><br><b>INE, agosto:</b> 33.841 hipotecas (+2,3 %), 181.285 € de media, interés medio 3,08 %.<br><br><b>Compraventas:</b> 49.319 (+3,4 %); de enero a agosto, −2,3 %.',
        'Euríbor a 12 meses, media mensual de diciembre de cada año y de octubre de 2026 (3,239 %; octubre de 2025: 2,187 %): Banco de España, serie del Euríbor (EMMI), tabla BE_19, consultada el 15-11-2026. BCE, tipos de interés oficiales: la facilidad de depósito pasó del 2,00 % (11-6-2025) al 2,25 % (17-6-2026) y al 2,50 % (16-9-2026), y se mantuvo el 29-10-2026; la próxima reunión de política monetaria es el 16-17 de diciembre de 2026. INE, Estadística de Hipotecas (agosto de 2026, datos provisionales publicados el 26-10-2026): 33.841 hipotecas sobre viviendas (+2,3 % anual), importe medio 181.285 € (+7,7 %), interés medio de las nuevas 3,08 %, plazo medio 26 años; el 64,1 % a tipo fijo y el 35,9 % variable. INE, Estadística de Transmisiones de Derechos de la Propiedad (agosto de 2026, publicado el 26-10-2026): 49.319 compraventas de vivienda (+3,4 % anual; nueva 10.521, usada 38.798); de enero a agosto, −2,3 %. El Banco de España ya había mostrado que el tipo medio de las nuevas hipotecas bajó del 3,3 % en 2024 al 2,75 % en 2025 y que sus datos hasta mayo de 2026 apuntaban a una subida. Lectura: los precios suben mientras se venden menos viviendas, y el crédito es más caro que hace un año; las dos cosas pueden tener causas distintas.',
        'Fuentes: Banco de España (Euríbor, EMMI) · BCE (tipos oficiales) · INE (Hipotecas y Transmisiones, agosto de 2026).'),

      // 11 · Qué dicen los datos y qué no
      columns('Qué dicen los datos… y qué no', [[T.cols[2], 'Lo que sí dicen', ul('Precios de compra y alquiler suben más que la renta de los hogares (Banco de España)', 'Un contrato nuevo cuesta mucho más que uno vigente', 'Se terminan muchas menos viviendas que hogares nuevos', 'Quien alquila a precio de mercado soporta más carga que en la UE: el 26,8 % frente al 18,5 %')],
        [T.cols[3], 'Lo que no dicen', ul('Que todo el país esté igual: de 5,7 a 10 años de renta según la ciudad', 'Que haya más gente sobrecargada que en la UE en total: 7,2 % frente a 7,6 %', 'Cuánto bajaría el precio con cada medida: el Banco de España pide evaluarlas', 'Que un precio de anuncio sea lo que se paga')]],
        'Eurostat, tasa de sobrecarga de los costes de la vivienda (ilc_lvho07c, 2025, actualizada el 29-10-2026): porcentaje de la población que vive en hogares donde los gastos de vivienda superan el 40 % de la renta disponible. Total: España 7,2 %, UE 7,6 %. Inquilinos a precio de mercado: España 26,8 %, UE 18,5 % (Portugal 27,2 %, Italia 22,3 %, Francia 18,7 %, Alemania 13,2 %). Propietarios sin hipoteca: España 1,9 %, UE 3,7 %. Mensaje: ambos datos son ciertos a la vez; el problema se concentra en quien alquila a precio de mercado, no en toda la población. Evaluación de políticas: el Banco de España (Informe Anual 2025) recomienda monitorizar y evaluar las medidas para detectar efectos no deseados. Pide al alumnado ejemplos de titulares que mezclen precio de oferta y precio de venta.',
        'Sobrecarga: gastos de vivienda de más del 40 % de la renta disponible del hogar.', 'Fuentes: Eurostat (ilc_lvho07c, 2025) · Banco de España (Informe Anual 2025).'),

      // 12 · Causas y políticas: lecturas distintas
      columns('Causas y medidas: lecturas distintas', [[T.cols[0], 'Más oferta', ul('El Banco de España señala suelo escaso, trámites lentos y poca productividad al construir', 'Pide priorizar medidas que aumenten la oferta', 'Plan Estatal 2026-2030: 7.000 M€, al menos el 40 % para vivienda pública, protegida y asequible')],
        [T.cols[1], 'Frenar el alquiler', ul('Las zonas tensionadas limitan el precio de los nuevos contratos', 'Quien las defiende busca proteger a quien alquila donde el mercado está más tenso', 'El Banco de España reconoce que protegen, pero pide vigilar efectos como una menor oferta')],
        [T.cols[2], 'Ayudar a pagar', ul('Ayudas al alquiler joven, hasta 4 años, en el Plan Estatal', 'Avales públicos para hipotecas', 'El Banco de España: alivian de forma transitoria; en las ciudades más caras llegan menos')]],
        'Se presentan tres familias de respuestas, que no se excluyen. Lo que se atribuye al Banco de España sale de su Informe Anual 2025 (resumen y cap. 2; las políticas de oferta, los controles de precios de alquiler «limitan las situaciones de vulnerabilidad, pero su diseño debe considerar la posible aparición de efectos no deseados», las políticas de demanda «pueden aliviar de manera transitoria» y el aval público es de eficacia limitada en las áreas urbanas donde el precio supera el límite fijado por comunidad). Plan Estatal de Vivienda 2026-2030: Real Decreto 326/2026, de 22 de abril (BOE del 23-4-2026): 7.000 millones de euros en total (60 % del Estado, 40 % de las comunidades); al menos el 40 % cada año a oferta pública, protegida y asequible, un 30 % a rehabilitación y un 30 % a reducir el esfuerzo de acceso y fomentar la emancipación, con ayuda al alquiler joven por un plazo de hasta 4 años. Para equilibrar la lectura, añade en directo las posturas de asociaciones de inquilinos, de propietarios, de promotores y de las administraciones, citadas con su fuente: aquí solo incluimos lo que hemos podido contrastar en documentos oficiales. Pregunta: ¿qué evidencia haría cambiar de opinión a cada postura?',
        'Cada columna recoge lo que dice el Banco de España o la norma; añade las voces de inquilinos, propietarios y promotores con su fuente.', 'Fuentes: Banco de España (Informe Anual 2025) · BOE, Real Decreto 326/2026 (Plan Estatal de Vivienda 2026-2030).'),

      // 13 · Votación
      pollSlide('¿Qué medida crees que ayudaría más a acceder a una vivienda?', ['Construir más vivienda pública', 'Limitar el precio del alquiler', 'Ayudas directas a jóvenes', 'Facilitar suelo y permisos', 'Otra'],
        'Votación en directo (código QR). No hay respuesta correcta: sirve para ver qué lectura domina en el grupo. Después, pide a una persona de cada opción que cuente qué dato de la presentación la apoya y a otra qué dato la matiza. Anonimato: no pedir a nadie que cuente su situación familiar.'),

      // 14 · Debate
      reto('Debate: cuatro preguntas', ul('¿Qué precio usarías para explicar cuánto cuesta una vivienda, y por qué?', '¿Qué medida probarías primero en tu municipio y cómo sabrías si funciona?', '¿Quién gana y quién pierde con cada medida, a corto y a largo plazo?', '¿Qué dato te falta para decidir?'),
        'Debate de ocho minutos en grupos pequeños; cada grupo presenta una conclusión de una frase. Cuidado con la situación de cada persona: no todos tienen la misma relación con la vivienda (propietarios, inquilinos, familias con segunda vivienda). Se puede pedir un trabajo posterior: buscar el dato más reciente de cada fuente de la última diapositiva.', 480, '¡Tiempo!'),

      // 15 · Fuentes y fecha de consulta
      slideOf([heading('Fuentes y fecha de consulta'),
        tbl([['Organismo — documento', 'Dónde', 'Consulta'],
          ['INE — Índice de Precios de Vivienda, 2T 2026 (7-9-2026)', 'ine.es/dyngs/Prensa/IPV2T26.htm', '15-11-2026'],
          ['INE — Precios de vivienda en alquiler 2024 (11-5-2026)', 'ine.es/dyngs/Prensa/IPVA2024.htm', '15-11-2026'],
          ['INE — Compraventas e hipotecas, agosto de 2026 (26-10-2026)', 'ine.es/dyngs/Prensa/ETDP0826.htm y H0826.htm', '15-11-2026'],
          ['Banco de España — Informe Anual 2025 y presentación (18-6-2026)', 'bde.es → Publicaciones → Informe Anual 2025', '15-11-2026'],
          ['Banco de España — Euríbor (EMMI), tabla BE_19', 'bde.es → Estadísticas → be1901.csv', '15-11-2026'],
          ['BCE — Tipos de interés oficiales', 'ecb.europa.eu → key ECB interest rates', '15-11-2026'],
          ['Eurostat — prc_hpi_q, yth_demo_030, ilc_lvho07c', 'ec.europa.eu/eurostat (API de datos)', '15-11-2026'],
          ['Ministerio de Vivienda — zonas tensionadas; BOE 3-11-2026', 'mivau.gob.es · BOE-A-2026-23088', '15-11-2026'],
          ['Registradores — Estadística Registral Inmobiliaria, 2T 2026', 'registradores.org (eri_2t_2026)', '15-11-2026'],
          ['Consejo de la Juventud — Observatorio de Emancipación 2025', 'cje.org/observatorio-de-emancipacion', '15-11-2026'],
          ['BOE — Real Decreto 326/2026, Plan Estatal de Vivienda', 'boe.es · BOE-A-2026-8872', '15-11-2026'],
          ['Notariado (mayo), idealista (octubre), valor tasado, OCU', 'vía prensa y portales: ver notas', '15-11-2026']],
          70, 214, 1140, 396, { fontSize: 15, colW: [4.4, 3.8, 1.1] }),
        text('<b>Antes de presentarla: comprueba si hay datos nuevos.</b> Próximas fechas: valor tasado del 3T (Ministerio, noviembre), BCE 16-17 de diciembre, Eurostat precios 3T el 11-1-2027, e INE (IPV, hipotecas y compraventas): revisa su calendario.',
          70, 134, 1140, 72, { fontSize: 18, color: T.ink, lineHeight: 1.3, bg: T.panel, borderColor: T.acc, borderWidth: 1.5, radius: 14, pad: [8, 16, 8, 16], vAlign: 'middle' }),
        text('El valor tasado, el Notariado, idealista y la OCU se consultaron a través de prensa o portales: confirma la cifra en la fuente primaria antes de citarla.', 70, 622, 1140, 50, { fontSize: 17, color: T.soft, lineHeight: 1.25 })],
        'Última diapositiva: todas las fuentes, con su fecha de consulta (15 de noviembre de 2026). Las cifras más recientes disponibles ese día: INE IPV 2.º trim. 2026 (7-9-2026), alquiler 2024 (11-5-2026), compraventas e hipotecas de agosto (26-10-2026); Banco de España Informe Anual 2025 (junio de 2026); Eurostat (1-10-2026 y 15-9-2026); BCE 29-10-2026; Registradores 2.º trim. 2026. Qué comprobar antes de usarla: (1) si el INE ha publicado el IPV del 3.er trimestre, compraventas e hipotecas de septiembre; (2) si el Ministerio ha publicado el valor tasado del 3.er trimestre; (3) qué municipios figuran en el registro de zonas tensionadas, en especial los 53 de Cataluña pendientes del BOE; (4) los tipos del BCE tras la reunión de diciembre y el Euríbor del mes; (5) las cifras del Notariado, idealista y valor tasado, que aquí se tomaron de prensa. Los datos sobre el déficit de vivienda y el esfuerzo de acceso son estimaciones del Banco de España; los del CJE usan precios de oferta. Detalle de cada cifra: docs/plantillas-actualidad/hoy_vivienda.md.'),
    ])) },
};
