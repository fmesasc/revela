// Example presentations: Estilos retro (años 20, 50, 60, 70, 80, 90, vaporwave,
// teletexto, máquina de escribir…), each one on a theme of its own.
// Each one: { name, summary, cat: 'creative', make() } → a deck (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';
import { FONTS } from '../../design/fonts.js';

// ---- Helpers of this file ---------------------------------------------------------
// A font of the catalogue by its name (its stack, so the editor and the exports load it).
const F = name => FONTS.find(f => f.name === name).stack;
// (A rectangle edge to edge: the 'rect' shape is drawn 2 % inside its box, so bands and backgrounds use an exact path.)
const R = (x, y, w, h, fill, p = {}) => shape('custom', x, y, w, h, fill, { path: 'M0 0H100V100H0Z', ...p });
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
const withId = (b, id) => ({ ...b, id });
// An SVG drawing of our own as a data URL, and an image object for it.
const svg = (w, h, inner) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const deco = (src, x, y, w, h, alt = 'Decoración') => img(src, x, y, w, h, alt, { decorative: true, fit: 'cover' });
// A 3D model without its caption, and the credit of the CC BY ones in a small line.
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credit = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// The same pseudo-random numbers every time.
const rng = seed => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
// Several objects that enter one after another with a single click (or by themselves: first = 'afterPrev').
const chain = (blocks, effect, props = {}, first = 'click') => blocks.map((b, i) => at(b, effect, { start: i ? 'afterPrev' : first, ...props }));

// ---- Drawings ------------------------------------------------------------------------
// A black-and-white checkerboard floor (diner).
const checker = (w, h, s, a = '#1c1c1c', b = '#fdf8ee') => svg(w, h, `<rect width="${w}" height="${h}" fill="${b}"/>`
  + Array.from({ length: Math.ceil(h / s) }, (_, r) => Array.from({ length: Math.ceil(w / s) }, (_, c) => ((r + c) % 2 ? '' : `<rect x="${c * s}" y="${r * s}" width="${s}" height="${s}" fill="${a}"/>`)).join('')).join(''));
// A striped awning with scalloped edge.
const awning = (w, c1, c2) => svg(w, 130, Array.from({ length: Math.ceil(w / 80) }, (_, i) => { const c = i % 2 ? c2 : c1, x = i * 80;
  return `<rect x="${x}" y="0" width="80" height="90" fill="${c}"/><path d="M${x} 89a40 40 0 0 0 80 0z" fill="${c}"/>`; }).join('')
  + `<rect width="${w}" height="10" fill="#00000022"/>`);
// A milkshake in its glass.
const milkshake = (pink, cherry) => svg(200, 330, `<path d="M118 120L152 8" stroke="#e94e77" stroke-width="12" stroke-linecap="round"/>`
  + `<path d="M118 120L152 8" stroke="#ffffff" stroke-width="12" stroke-dasharray="8 10" opacity=".8"/>`
  + `<path d="M36 112H164L134 300H66Z" fill="#ffffff" opacity=".55" stroke="#c9d1d6" stroke-width="4"/>`
  + `<path d="M46 132H154L128 292H72Z" fill="${pink}"/><path d="M60 140H80L84 280H76Z" fill="#ffffff" opacity=".35"/>`
  + `<circle cx="68" cy="112" r="28" fill="#fffaf0"/><circle cx="132" cy="112" r="28" fill="#fffaf0"/><circle cx="100" cy="94" r="34" fill="#fffaf0"/><circle cx="100" cy="122" r="26" fill="#fffaf0"/>`
  + `<path d="M100 60C104 44 112 34 124 28" stroke="#4a7c3a" stroke-width="4" fill="none"/><circle cx="100" cy="66" r="17" fill="${cherry}"/><circle cx="94" cy="60" r="5" fill="#ffffff" opacity=".6"/>`
  + `<rect x="92" y="300" width="16" height="16" fill="#c9d1d6"/><ellipse cx="100" cy="320" rx="48" ry="9" fill="#c9d1d6"/>`);
// The front of the café, small, at the end of the road.
const cafeFront = (red, mint, cream) => svg(200, 220, `<rect x="10" y="40" width="180" height="180" fill="${cream}" stroke="#2b1d1a" stroke-width="3"/>`
  + `<rect x="0" y="20" width="200" height="34" rx="6" fill="${red}"/><text x="100" y="45" text-anchor="middle" font-family="cursive" font-size="24" fill="#fff4e0" font-weight="700">Lucero</text>`
  + Array.from({ length: 5 }, (_, i) => `<rect x="${10 + i * 36}" y="56" width="36" height="22" fill="${i % 2 ? cream : red}"/>`).join('')
  + `<rect x="24" y="96" width="70" height="60" fill="${mint}" stroke="#2b1d1a" stroke-width="3"/><rect x="112" y="96" width="62" height="124" fill="${mint}" stroke="#2b1d1a" stroke-width="3"/><circle cx="162" cy="160" r="4" fill="#2b1d1a"/>`);
// A typewriter seen from the front (keys, carriage and roller).
const typewriter = () => svg(1000, 250, `<rect x="40" y="4" width="920" height="40" rx="20" fill="#151515"/><circle cx="30" cy="24" r="24" fill="#2b2b2b"/><circle cx="970" cy="24" r="24" fill="#2b2b2b"/>`
  + `<rect x="120" y="44" width="760" height="10" fill="#8c8c8c"/><path d="M60 60H940L1000 250H0Z" fill="#232323"/><path d="M60 60H940L948 84H52Z" fill="#3a3a3a"/>`
  + ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM,.'].map((row, r) => [...row].map((k, i) => { const n = row.length, x = 500 + (i - (n - 1) / 2) * 78, y = 108 + r * 44;
    return `<circle cx="${x}" cy="${y}" r="19" fill="#e9e4d8" stroke="#8c8c8c" stroke-width="3"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-family="monospace" font-size="20" font-weight="700" fill="#222">${k}</text>`; }).join('')).join('')
  + `<rect x="330" y="224" width="340" height="20" rx="10" fill="#e9e4d8" stroke="#8c8c8c" stroke-width="3"/>`);
// Ruled lines of an index card (a red one on top).
const ruled = (w, h, gap = 44, top = 70) => svg(w, h, `<line x1="0" y1="${top}" x2="${w}" y2="${top}" stroke="#e08a8a" stroke-width="3"/>`
  + Array.from({ length: Math.floor((h - top) / gap) }, (_, i) => `<line x1="0" y1="${top + (i + 1) * gap}" x2="${w}" y2="${top + (i + 1) * gap}" stroke="#bcd3ea" stroke-width="2"/>`).join(''));
// A long-playing record from above (grooves, shine, label with its words).
const record = (label, word1, word2, ink = '#fdf3dc') => svg(400, 400, `<circle cx="200" cy="200" r="198" fill="#141414"/>`
  + Array.from({ length: 16 }, (_, i) => `<circle cx="200" cy="200" r="${76 + i * 7.6}" fill="none" stroke="#2a2a2a" stroke-width="1.6"/>`).join('')
  + `<path d="M200 200L40 80A198 198 0 0 1 120 22Z" fill="#ffffff" opacity=".07"/><path d="M200 200L360 320A198 198 0 0 1 280 378Z" fill="#ffffff" opacity=".07"/>`
  + `<circle cx="200" cy="200" r="66" fill="${label}"/><circle cx="200" cy="200" r="58" fill="none" stroke="${ink}" stroke-width="1.5" opacity=".6"/>`
  + `<text x="200" y="178" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="${ink}" letter-spacing="2">${word1}</text>`
  + `<text x="200" y="236" text-anchor="middle" font-family="sans-serif" font-size="13" fill="${ink}" letter-spacing="2">${word2}</text><circle cx="200" cy="200" r="7" fill="#24150c"/>`);
// A 70s rainbow: concentric half rings.
const rainbow = (colors, hole) => svg(800, 400, colors.map((c, i) => { const r = 400 - i * 66; return `<path d="M${400 - r} 400A${r} ${r} 0 0 1 ${400 + r} 400Z" fill="${c}"/>`; }).join('')
  + `<path d="M${400 - (400 - colors.length * 66)} 400A${400 - colors.length * 66} ${400 - colors.length * 66} 0 0 1 ${400 + 400 - colors.length * 66} 400Z" fill="${hole}"/>`);

export default {

  // ============================================================================
  // 1 · Años 50: a diner reopens — neon sign, checkerboard floor, awning, milk truck.
  creative_retro_diner: { name: 'Años 50: la cafetería reabre', cat: 'creative',
    summary: 'Cafetería de los 50: rótulo de neón, suelo de damero, toldo, camión 3D por la carretera, carta con fórmulas, dona, sello que gira y votación',
    make: () => {
      const CH = '#d7263d', MINT = '#a8e6cf', MD = '#1f7a66', CR = '#fff4e0', INK = '#2b1d1a', CHROME = '#c9d1d6', PINK = '#ff8fb1', YEL = '#ffd23f';
      const LOB = F('Lobster'), OS = F('Oswald');
      const SHAKE = milkshake(PINK, CH), FLOOR = checker(1280, 160, 40);
      const head = (t, x, y, w, color = CH, size = 64) => text(t, x, y, w, Math.round(size * 1.35), { fontFamily: LOB, fontSize: size, color });
      const tickets = [['1957', 'Abre la primera barra: seis taburetes, una cafetera y tortitas los domingos.'], ['1974', 'Llega la máquina de discos y nace el batido de fresa de la casa.'],
        ['1999', 'La segunda generación amplía el comedor y abre también por las noches.'], ['2025', 'Reforma completa: la misma barra cromada y una cocina nueva.']];
      const menu = [['BATIDO CLÁSICO', '4,50'], ['BATIDO DE TEMPORADA', '5,00'], ['TORTITAS CON SIROPE', '6,50'], ['SÁNDWICH DE LA CASA', '5,80'], ['TARTA DE QUESO', '4,00'], ['CAFÉ DE FILTRO', '1,50'], ['REFRESCO', '2,40']];
      return numbered(build({ name: 'Cafetería Lucero · reapertura', palette: 'office', fonts: 'friendly', title: { color: CH } }, [
        { layout: 'blank', bg: CR, transition: 'fade', extra: [
          R(0, 0, 1280, 560, MINT), deco(FLOOR, 0, 560, 1280, 160, 'Suelo de damero'), R(0, 548, 1280, 14, CHROME),
          shape('rounded', 100, 70, 700, 400, CH, { stroke: CHROME, strokeWidth: 10, radius: 70, shadow: { x: 0, y: 12, blur: 0, color: '#00000030' } }),
          text('CAFETERÍA · BATIDOS · TORTITAS', 100, 108, 700, 40, { fontSize: 22, color: CR, textAlign: 'center', letterSpacing: 6, fontWeight: 700 }),
          text('Lucero', 100, 150, 700, 190, { fontFamily: LOB, fontSize: 150, textAlign: 'center', wordart: 'neon', wordartColor: YEL }),
          text('desde 1957', 100, 350, 700, 70, { fontFamily: LOB, fontSize: 42, color: YEL, textAlign: 'center' }),
          text('Calle del Olmo, 12 · Reabrimos el sábado 8 de noviembre', 80, 484, 740, 50, { fontSize: 23, color: INK, textAlign: 'center', fontWeight: 700 }),
          at(img(SHAKE, 880, 100, 300, 450, 'Un batido de fresa con nata y guinda'), 'fade-up', { start: 'afterPrev', duration: 700 }),
          withAnims(shape('burst', 740, 14, 230, 230, YEL, { stroke: INK, strokeWidth: 3, rotation: -12, html: '¡HOLA<br>DE NUEVO!', fontFamily: OS, fontSize: 22, color: INK, fontWeight: 700 }),
            A('zoom-in', { duration: 350, sound: 'pop' }), A('teeter', { start: 'afterPrev', duration: 800 }))],
          notes: 'Portada de cafetería de los años 50: rótulo rojo con borde cromado, letras de neón amarillo (Text Art «Neón» con color propio) y suelo de damero hecho con un dibujo SVG. El batido entra solo; con el clic, la pegatina aparece con un «pop» y se balancea.' },
        { layout: 'blank', bg: MINT, transition: 'slide', extra: [
          head('Así empezó todo', 60, 36, 800), text('Casi setenta años sirviendo desayunos en la misma esquina.', 64, 128, 900, 40, { fontSize: 26, color: INK }),
          ...tickets.flatMap(([y, d], i) => { const x = 70 + i * 290;
            return [withAnims(text(`PEDIDO Nº ${i + 1}`, x, 200, 260, 54, { bg: CH, color: CR, fontSize: 20, fontWeight: 700, letterSpacing: 3, textAlign: 'center', vAlign: 'middle', radius: 0 }),
              A('fade-down', { start: i ? 'afterPrev' : 'click', duration: 400 })),
            withAnims(card(`<div style="font-family:${LOB};font-size:72px;line-height:1;color:${MD}">${y}</div><div style="margin-top:18px">${d}</div>`, x, 254, 260, 390, CR,
              { radius: 0, color: INK, fontSize: 26, pad: [22, 22, 22, 22], shadow: { x: 6, y: 6, blur: 0, color: '#00000025' } }), A('fade-down', { start: 'withPrev', duration: 400 }))]; })],
          notes: 'La historia como comandas de camarero: un clic y las cuatro entran una tras otra (cada cabecera con su tarjeta a la vez). Fechas del ejemplo.' },
        { layout: 'blank', bg: CR, transition: 'slide', extra: [
          R(0, 0, 1280, 16, CH), head('La carta de siempre', 60, 36, 800),
          R(60, 150, 500, 530, CHROME, { radius: 6 }), R(74, 164, 472, 502, '#1e1e1e'), deco(svg(472, 502, Array.from({ length: 41 }, (_, i) => `<line x1="0" y1="${i * 12.5}" x2="472" y2="${i * 12.5}" stroke="#2c2c2c" stroke-width="3"/>`).join('')), 74, 164, 472, 502, 'Ranuras del tablero'),
          text('C A R T A', 74, 186, 472, 50, { fontFamily: OS, fontSize: 34, color: YEL, textAlign: 'center', fontWeight: 700 }),
          text(menu.map(m => m[0]).join('<br>'), 100, 260, 330, 380, { fontFamily: OS, fontSize: 25, color: '#f4f4f4', lineHeight: 1.75 }),
          text(menu.map(m => m[1]).join('<br>'), 420, 260, 104, 380, { fontFamily: OS, fontSize: 25, color: '#f4f4f4', lineHeight: 1.75, textAlign: 'right' }),
          text('Merienda para cuatro', 610, 160, 610, 60, { fontFamily: LOB, fontSize: 40, color: MD }),
          tableBlock({ x: 610, y: 236, w: 610, h: 330, fontSize: 24, header: true, banded: true, headBg: CH, headFg: '#ffffff', band: MINT, bandAlpha: 0.45, stroke: '#e3cfae', colW: [5.4, 2.6, 1.8, 2.8],
            rows: [['Producto', 'Precio €', 'Uds.', 'Importe €'], ['Batido clásico', '4,50', '4', '=B2*C2'], ['Tortitas con sirope', '6,50', '2', '=B3*C3'], ['Tarta de queso', '4,00', '1', '=B4*C4'],
              ['Café de filtro', '1,50', '2', '=B5*C5'], ['<b>Total</b>', '', '=SUMA(C2:C5)', '=SUMA(D2:D5)']] }),
          text('Los importes se calculan solos: cambia las unidades y la cuenta se pone al día.', 610, 590, 610, 70, { fontSize: 22, color: INK })],
          notes: 'A la izquierda, un tablero de letras como los de las barras de entonces (formas y un dibujo de ranuras). A la derecha, una tabla con fórmulas: cada importe es precio por unidades y la última fila suma con =SUMA. Precios inventados.' },
        { layout: 'blank', bg: '#c7efe0', transition: 'push', extra: [
          R(0, 0, 1280, 720, '#e6f8f0', { fill2: '#bfe9d6', gradAngle: 90 }),
          E(-240, 380, 900, 300, '#86cdae'), E(560, 400, 1000, 300, '#6dbb98'),
          R(0, 520, 1280, 130, '#4a4a4a'), shape('line', 0, 580, 1280, 10, '#ffffff', { stroke: '#ffffff', strokeWidth: 6, dash: 'dash' }), R(0, 650, 1280, 70, '#6fbf8e'),
          head('De la granja a tu vaso', 60, 30, 900), text('Catorce kilómetros y una sola parada: nuestra puerta.', 64, 120, 900, 40, { fontSize: 26, color: INK }),
          ...[['Cada mañana, a las 7:00', 'la leche llega recién ordeñada'], ['Botellas de vidrio', 'retornables: ni un envase de plástico'], ['Granja Las Encinas', 'vacas de pasto, a 14 km de aquí']]
            .map(([h, d], i) => card(`<b style="color:${CH}">${h}</b><br>${d}`, 60 + i * 400, 186, 370, 104, CR, { fontSize: 22, color: INK, radius: 14, pad: [14, 20, 14, 20] })),
          img(cafeFront(CH, MINT, CR), 40, 318, 180, 200, 'La fachada de la cafetería'),
          withAnims(m3d('kh-CesiumMilkTruck', 880, 350, 380, 270, { view: 'side', autoRotate: false }), path([[-330, 0], [-660, 0]], { duration: 4500 })),
          credit(['kh-CesiumMilkTruck'], 60, 684, 900, '#1f4d3c')],
          notes: 'Un clic y el camión de la leche (modelo 3D) recorre la carretera hasta la cafetería siguiendo una trayectoria. Las colinas son elipses y la línea de la carretera, una línea discontinua.' },
        { layout: 'blank', bg: CR, transition: 'slide', extra: [
          deco(awning(1280, CH, '#fffaf2'), 0, 0, 1280, 130, 'Toldo de rayas'),
          head('Lo que más pedís', 60, 140, 700, CH, 58),
          chartBlock({ x: 60, y: 230, w: 640, h: 450, chartType: 'doughnut', color: CH,
            data: [{ label: 'Fresa', value: 34, color: PINK }, { label: 'Chocolate', value: 26, color: '#6b3e26' }, { label: 'Vainilla', value: 22, color: '#e8c98f' }, { label: 'Plátano', value: 11, color: YEL }, { label: 'Menta', value: 7, color: '#5cc8a4' }] }),
          text('2.300', 760, 230, 460, 150, { fontFamily: LOB, fontSize: 130, color: CH }),
          text('batidos al mes antes de cerrar por la reforma', 764, 390, 440, 80, { fontSize: 28, color: INK, fontWeight: 700 }),
          card('La fresa manda desde 1974. La menta es la favorita de los nietos de los primeros clientes.', 764, 500, 440, 150, MINT, { fontSize: 23, color: INK, radius: 14 })],
          notes: 'Gráfico de dona con un color propio en cada porción (el del sabor). Cifras inventadas para el ejemplo.' },
        { layout: 'blank', bg: MINT, transition: 'slide', extra: [
          deco(checker(1280, 80, 40), 0, 640, 1280, 80, 'Suelo de damero'),
          pollBlock({ fontSize: 34, x: 80, y: 40, w: 1120, h: 570, question: '¿Qué batido nuevo estrenamos el día 8?', options: ['Galleta y canela', 'Mango y yogur', 'Café con caramelo', 'Frutos rojos'] })],
          notes: 'Votación en directo: cada persona elige desde el móvil con el código QR. El ganador entra en la carta el día de la reapertura.' },
        { layout: 'blank', bg: CH, transition: 'zoom', extra: [
          deco(checker(1280, 120, 40), 0, 600, 1280, 120, 'Suelo de damero'), R(0, 588, 1280, 14, CHROME),
          E(90, 90, 400, 400, CR), E(150, 150, 280, 280, YEL),
          withAnims(text('GRAN REAPERTURA · SÁBADO 8 · GRAN REAPERTURA · SÁBADO 8 · ', 96, 96, 388, 388, { curve: 100, fontSize: 25, color: CH, textAlign: 'center', fontWeight: 700, letterSpacing: 2 }),
            A('spin360', { start: 'afterPrev', duration: 4000 })),
          text('¡Te<br>esperamos!', 150, 200, 280, 180, { fontFamily: LOB, fontSize: 50, color: INK, textAlign: 'center', vAlign: 'middle', lineHeight: 1.1 }),
          text('Sábado 8', 560, 90, 660, 140, { fontFamily: LOB, fontSize: 104, color: CR }),
          text('De 8:00 a 21:00 · Calle del Olmo, 12', 564, 250, 640, 50, { fontSize: 30, color: CR, fontWeight: 700 }),
          text('El primer batido corre de nuestra cuenta.', 564, 320, 480, 100, { fontSize: 30, color: YEL, fontWeight: 700 }),
          at(img(SHAKE, 1060, 300, 180, 270, 'Batido de fresa'), 'jump', { duration: 900 })],
          notes: 'Cierre: el sello con texto curvo da una vuelta al llegar (efecto de énfasis «Dar una vuelta»). Con un clic, el batido da un salto.' },
      ]));
    } },

  // ============================================================================
  // 2 · Máquina de escribir: a short-story workshop on paper, at the desk.
  creative_retro_typewriter: { name: 'Máquina de escribir: taller de relato', cat: 'creative',
    summary: 'Folio y máquina de escribir: líneas tecleadas con sonido, tachado y corrección a mano, arco que se dibuja, barras, huecos y cuenta atrás',
    make: () => {
      const DESK = '#2b211a', PAPER = '#fbf7ec', INK = '#222222', RED = '#b3261e', GREY = '#6f675a', CARD = '#fffdf6', SOFT = '#d8cbb8';
      const CO = F('Courier New'), HAND = F('Caveat');
      const tw = (t, x, y, w, h, size, p = {}) => text(t, x, y, w, h, { fontFamily: CO, fontSize: size, color: INK, ...p });
      const sheet = (x, y, w, h) => R(x, y, w, h, PAPER, { shadow: { x: 8, y: 10, blur: 22, color: '#00000088' } });
      const grain = deco(svg(1280, 720, (() => { const r = rng(7); return Array.from({ length: 34 }, () => { const y = Math.round(r() * 720);
        return `<path d="M0 ${y}C320 ${y + 10 - r() * 20} 900 ${y - 12 + r() * 24} 1280 ${y}" stroke="#3a2c22" stroke-width="${1 + Math.round(r() * 3)}" fill="none"/>`; }).join(''); })()), 0, 0, 1280, 720, 'Vetas de madera');
      const arc = [[0, 92, 'Planteamiento', 'quién y dónde'], [20, 86, 'Detonante', 'algo se rompe'], [44, 64, 'Nudo', 'todo se complica'], [72, 8, 'Clímax', 'no hay vuelta atrás'], [100, 78, 'Desenlace', 'qué ha cambiado']];
      const ax = x => 140 + x * 10, ay = y => 210 + y * 3.8;
      const prompts = [['A', 'Una llave que no abre ninguna puerta de la casa.'], ['B', 'Alguien llega tarde a su propia fiesta de despedida.'], ['C', 'La última carta que queda en un buzón abandonado.']];
      return numbered(build({ name: 'Taller de relato breve', palette: 'paper', fonts: 'editorial', title: { color: INK } }, [
        { layout: 'blank', bg: DESK, transition: 'fade', extra: [
          grain, sheet(330, 30, 620, 560),
          tw('TALLER DE', 390, 86, 500, 46, 30, { letterSpacing: 4 }),
          tw('RELATO BREVE', 390, 132, 520, 80, 58, { fontWeight: 700 }),
          R(390, 222, 300, 5, RED),
          ...chain([tw('Sesión 1 de 6 · Biblioteca municipal', 390, 256, 520, 40, 22), tw('Jueves, de 19:00 a 20:30', 390, 296, 520, 40, 22),
            tw('Trae papel, lápiz y una historia que no te deje dormir.', 390, 350, 500, 70, 22, { color: RED })], 'fade-in', { duration: 250, delay: 250, sound: 'click' }, 'afterPrev'),
          deco(typewriter(), 140, 470, 1000, 250, 'Una máquina de escribir')],
          notes: 'Portada: el folio sale de una máquina de escribir dibujada en SVG sobre la madera de la mesa. Las tres líneas se «teclean» solas al llegar, cada una con un clic de máquina (sonido de la animación).' },
        { layout: 'blank', bg: DESK, transition: 'push', extra: [
          grain, sheet(140, 40, 1000, 640), R(196, 40, 3, 640, '#e8a0a0'),
          tw('REGLA 1: EMPIEZA TARDE', 230, 80, 860, 60, 40, { fontWeight: 700 }),
          at(tw('Era un lunes como cualquier otro. Marta se levantó, desayunó un café con leche y salió de casa a las ocho.', 230, 170, 860, 130, 28), 'strike', { duration: 700 }),
          at(text('Marta llevaba tres días sin atreverse a abrir el buzón.', 230, 320, 860, 80, { fontFamily: HAND, fontSize: 44, color: RED, rotation: -1 }), 'fade-in', { start: 'afterPrev', duration: 900 }),
          R(230, 430, 860, 2, '#d9cfbd'),
          tw('Corta todo lo que pasa antes de que pase algo. Quien lee entra en la historia cuando ya está en marcha.', 230, 456, 860, 110, 24, { color: GREY }),
          tw('— Primera frase, borrador 1 y borrador 2', 230, 590, 860, 40, 20, { color: GREY })],
          notes: 'Un clic tacha el primer borrador (efecto de énfasis «Tachar») y aparece la corrección escrita a mano en rojo. Pide al grupo que diga qué información sobraba.' },
        { layout: 'blank', bg: '#3a2d23', transition: 'push', extra: [
          R(80, 50, 1120, 620, CARD, { shadow: { x: 6, y: 8, blur: 16, color: '#00000077' } }), deco(ruled(1120, 620, 46, 96), 80, 50, 1120, 620, 'Rayas de la ficha'),
          tw('EL ARCO DE LA HISTORIA', 120, 70, 900, 50, 34, { fontWeight: 700 }),
          at(shape('custom', 140, 210, 1000, 380, 'none', { path: 'M0 92C8 91 14 89 20 86C28 82 36 76 44 64C54 48 64 22 72 8C80 30 88 62 100 78', stroke: RED, strokeWidth: 6 }), 'draw', { duration: 2600 }),
          ...arc.flatMap(([x, y, n, d], i) => { const cx = ax(x), cy = ay(y), above = i === 1 || i === 3, lw = 230;
            const lx = i === 0 ? 110 : i === 4 ? 1180 - lw : i === 2 ? cx + 20 : cx - lw / 2, ly = above ? cy - 92 : i === 2 ? cy + 8 : cy + 18;
            return [at(E(cx - 13, cy - 13, 26, 26, INK), 'zoom-in', { start: 'afterPrev', duration: 250 }),
              at(text(`<b>${n}</b><br><span style="font-size:19px;color:${GREY}">${d}</span>`, lx, ly, lw, 72, { fontFamily: CO, fontSize: 24, color: INK, textAlign: i === 0 ? 'left' : i === 4 ? 'right' : i === 2 ? 'left' : 'center' }), 'fade-in', { start: 'withPrev', duration: 250 })]; })],
          notes: 'Una ficha rayada con el arco narrativo: la curva roja se dibuja sola (efecto «Dibujar») y después aparecen las cinco paradas. En un relato breve el planteamiento ocupa muy poco: se entra casi en el detonante.' },
        { layout: 'blank', bg: DESK, transition: 'push', extra: [
          grain, sheet(60, 50, 700, 620),
          tw('CORTAR TAMBIÉN ES ESCRIBIR', 100, 80, 640, 50, 30, { fontWeight: 700 }),
          chartBlock({ x: 90, y: 150, w: 640, h: 490, chartType: 'bar', color: INK, grid: true, dataLabels: true, yTitle: 'Palabras',
            data: [{ label: 'Borrador 1', value: 1840 }, { label: 'Borrador 2', value: 1420 }, { label: 'Borrador 3', value: 1110 }, { label: 'Borrador 4', value: 960, color: RED }] }),
          tw('−48 %', 820, 140, 420, 150, 104, { color: PAPER, fontWeight: 700 }),
          tw('de palabras entre el primer borrador y el cuarto. Y la historia mejoró en cada vuelta.', 824, 300, 400, 170, 24, { color: SOFT }),
          withAnims(shape('rect', 880, 500, 300, 110, 'none', { stroke: RED, strokeWidth: 6, rotation: -8, html: 'LISTO PARA<br>ENVIAR', fontFamily: CO, fontSize: 30, fontWeight: 700, color: '#e0574e' }),
            A('zoom-in', { duration: 220, sound: 'click' }))],
          notes: 'Datos de un relato del taller del curso pasado (inventados). Con el clic cae el sello de goma: el cuarto borrador ya se puede mandar al concurso.' },
        { layout: 'blank', bg: '#3a2d23', transition: 'fade', extra: [
          card(`<div style="font-size:40px;line-height:1.45">«El primer borrador es para ti. El segundo, para quien lo lea.»</div><div style="margin-top:28px;font-size:22px;color:${GREY}">— Consejo de taller, sesión 1</div>`,
            190, 180, 900, 360, CARD, { fontFamily: CO, color: INK, radius: 4, pad: [96, 70, 40, 70], shadow: { x: 6, y: 8, blur: 16, color: '#00000077' } }),
          R(190, 250, 900, 3, '#e08a8a'),
          E(620, 158, 40, 40, RED, { shadow: { x: 2, y: 4, blur: 4, color: '#00000066' } })],
          notes: 'Una cita en una ficha clavada con una chincheta. Deja unos segundos en silencio antes de seguir: es la idea de toda la sesión.' },
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          R(0, 0, 1280, 10, RED),
          pollBlock({ kind: 'gaps', fontSize: 40, x: 80, y: 50, w: 1120, h: 610, question: 'Completa las reglas del taller',
            text: 'Un buen relato empieza [tarde] y termina [pronto]. [Muestra], no cuentes. Cada palabra tiene que ganarse su [sitio|lugar].' })],
          notes: 'Actividad «Completar huecos» con nota, desde el móvil. En el último hueco valen «sitio» y «lugar».' },
        { layout: 'blank', bg: DESK, transition: 'push', extra: [
          grain,
          tw('EJERCICIO: CINCO MINUTOS', 60, 40, 900, 56, 40, { color: PAPER, fontWeight: 700 }),
          tw('Elige una tarjeta y escribe sin parar. Prohibido borrar.', 60, 100, 1000, 40, 24, { color: SOFT }),
          ...prompts.map(([k, p], i) => at(card(`<div style="color:${RED};font-weight:700;font-size:22px;letter-spacing:3px">TARJETA ${k}</div><div style="margin-top:16px">${p}</div>`,
            60 + i * 400, 170, 360, 270, CARD, { fontFamily: CO, fontSize: 26, color: INK, radius: 2, rotation: [-3, 2, -1][i], shadow: { x: 5, y: 7, blur: 12, color: '#00000077' } }),
          'fade-down', { start: i ? 'afterPrev' : 'click', duration: 350 })),
          timer(300, 140, 510, 160, { style: 'bar', w: 1000, h: 110, color: RED, auto: false })],
          notes: 'Las tres tarjetas caen con un clic. La barra de cuenta atrás de cinco minutos arranca al pulsarla y suena al terminar.' },
        { layout: 'blank', bg: DESK, transition: 'fade', extra: [
          grain, sheet(240, 50, 800, 620),
          ...chain(['F', 'I', 'N'].map((c, i) => tw(c, 460 + i * 120, 120, 120, 180, 150, { fontWeight: 700, textAlign: 'center' })), 'fade-in', { duration: 120, delay: 280, sound: 'click' }, 'afterPrev'),
          R(540, 330, 200, 5, RED),
          tw('Próxima sesión: los diálogos', 240, 370, 800, 50, 32, { textAlign: 'center', fontWeight: 700 }),
          tw('Trae tu relato impreso, a doble espacio y sin tu nombre: lo leeremos en voz alta.', 300, 432, 680, 90, 22, { textAlign: 'center', color: GREY }),
          tw('taller.relato@biblioteca.example', 240, 580, 800, 40, 22, { textAlign: 'center', color: RED })],
          notes: 'Cierre: las tres letras de FIN se teclean solas, con su sonido. Recuerda pedir los textos sin nombre para que la lectura en voz alta sea anónima.' },
      ]));
    } },

  // ============================================================================
  // 3 · Años 70: a neighbourhood vinyl club — rainbows, records that turn, a listening room.
  creative_retro_vinyl: { name: 'Años 70: el club del vinilo', cat: 'creative',
    summary: 'Estilo setentero: arcoíris de franjas, discos dibujados que giran, cifra gigante, líneas, barras, sofá 3D, actividad de ordenar y pegatina',
    make: () => {
      const BR = '#3b2314', OR = '#e86a1c', MU = '#f2b134', RU = '#b8461b', CR = '#f7e7c6', TAN = '#e9cfa6', DK = '#24150c';
      const ABR = F('Abril Fatface'), MON = F('Montserrat');
      const RAIN = rainbow([MU, OR, RU, '#7a3b1d'], BR), RAIN2 = rainbow([MU, OR, RU, '#7a3b1d'], OR);
      const stripes = y => [R(0, y, 1280, 12, MU), R(0, y + 20, 1280, 12, OR), R(0, y + 40, 1280, 12, RU)];
      const sessions = [['10 OCT', 'Soul de los setenta'], ['17 OCT', 'Jazz modal'], ['24 OCT', 'Rock progresivo'], ['31 OCT', 'Canción de autor']];
      return numbered(build({ name: 'Club del Vinilo de San Lorenzo', palette: 'warm', fonts: 'modern', title: { color: MU } }, [
        { layout: 'blank', bg: BR, transition: 'fade', extra: [
          deco(RAIN, 520, 330, 900, 450, 'Arcoíris de franjas'),
          at(img(record(RU, 'LP', '33 RPM'), 790, 300, 360, 360, 'Un disco de vinilo'), 'spin360', { start: 'afterPrev', duration: 2600 }),
          text('Club del', 70, 110, 640, 110, { fontFamily: ABR, fontSize: 90, color: CR }),
          text('Vinilo', 70, 210, 700, 180, { fontFamily: ABR, fontSize: 160, color: MU }),
          text('Escucha colectiva en el barrio de San Lorenzo', 74, 420, 700, 50, { fontSize: 27, color: CR }),
          R(74, 486, 120, 8, OR),
          text('Viernes a las 20:00 · Local de la asociación vecinal', 74, 512, 560, 80, { fontSize: 24, color: TAN })],
          notes: 'Portada setentera: un arcoíris de franjas (dibujo SVG) del que sale un disco que gira solo al llegar. Letra gruesa con remate (Abril Fatface) y colores tierra.' },
        { layout: 'blank', bg: CR, transition: 'slide', extra: [
          ...stripes(640),
          at(img(record(OR, 'A', '33 RPM'), 690, 90, 520, 520, 'Un disco de vinilo de 30 cm'), 'spin360', { duration: 1800 }),
          text('33⅓', 60, 80, 640, 260, { fontFamily: ABR, fontSize: 220, color: BR, lineHeight: 1 }),
          text('REVOLUCIONES POR MINUTO', 64, 350, 600, 40, { fontFamily: MON, fontSize: 26, color: RU, fontWeight: 800, letterSpacing: 3 }),
          text('Así gira un LP de 30 cm: unos 22 minutos de música por cara. Los sencillos de 18 cm van más deprisa, a 45, con una canción por cara.', 64, 410, 580, 190, { fontSize: 26, color: BR })],
          notes: 'Cifra gigante. Con un clic el disco da una vuelta completa (efecto de énfasis «Dar una vuelta»). Las franjas de abajo son tres rectángulos.' },
        { layout: 'blank', bg: BR, transition: 'slide', extra: [
          ...stripes(0).map(b => ({ ...b, y: b.y + 20 })),
          text('La vuelta del vinilo', 60, 70, 900, 80, { fontFamily: ABR, fontSize: 58, color: MU }),
          text('Discos vendidos al año en el país, en millones (datos inventados)', 64, 150, 820, 40, { fontSize: 22, color: TAN }),
          chartBlock({ x: 60, y: 200, w: 820, h: 480, chartType: 'line', grid: true, labelColor: TAN, color: MU, seriesName: 'Vinilo', yTitle: 'Millones de discos',
            data: [['2010', 0.3], ['2013', 0.5], ['2016', 0.9], ['2019', 1.4], ['2022', 2.1], ['2025', 2.6]].map(([label, value]) => ({ label, value })),
            series: [{ name: 'CD', values: [9.5, 7, 5.1, 3.4, 2.4, 1.9], color: '#c98b6b' }] }),
          card(`<div style="font-family:${ABR};font-size:96px;line-height:1;color:${MU}">×8</div><div style="margin-top:14px">más vinilos vendidos que en 2010</div><div style="margin-top:18px;font-size:22px;color:${TAN}">Y desde 2024 se venden más que los CD.</div>`,
            920, 220, 300, 400, '#4d2e1a', { borderColor: MU, color: CR, fontSize: 28, textAlign: 'center', vAlign: 'middle', radius: 30 })],
          notes: 'Gráfico de líneas con dos series y colores propios. Cifras inventadas: lo importante es el cruce de las dos líneas.' },
        { layout: 'blank', bg: CR, transition: 'slide', extra: [
          text('Qué hay en las estanterías', 60, 40, 900, 80, { fontFamily: ABR, fontSize: 54, color: RU }),
          text('1.240 discos donados por las personas socias, por estilo', 64, 118, 900, 40, { fontSize: 24, color: BR }),
          chartBlock({ x: 60, y: 175, w: 760, h: 500, chartType: 'hbar', color: OR, dataLabels: true, labelColor: BR,
            data: [{ label: 'Rock', value: 380 }, { label: 'Soul y funk', value: 210 }, { label: 'Jazz', value: 180 }, { label: 'Pop', value: 170 }, { label: 'Canción de autor', value: 140 }, { label: 'Clásica', value: 90 }, { label: 'Electrónica', value: 70 }] }),
          img(record(MU, 'LP', '45 RPM', BR), 880, 190, 330, 330, 'Un disco de la colección'),
          text('El préstamo es gratis: dos discos cada dos semanas.', 860, 550, 370, 100, { fontSize: 24, color: BR, fontWeight: 700, textAlign: 'center' })],
          notes: 'Barras horizontales con etiquetas de datos. Recuento inventado.' },
        { layout: 'blank', bg: MU, transition: 'convex', extra: [
          at(deco(record(RU, 'B', '33 RPM'), 660, 60, 560, 560, 'Disco'), 'spin360', { start: 'afterPrev', duration: 3000 }),
          ...stripes(650),
          text('CARA B', 60, 170, 620, 200, { fontFamily: ABR, fontSize: 160, color: BR, lineHeight: 1 }),
          text('ESCUCHAR JUNTOS', 66, 390, 560, 50, { fontFamily: MON, fontSize: 30, color: BR, fontWeight: 800, letterSpacing: 6 }),
          text('La segunda parte de la charla: cómo funcionan las sesiones del viernes.', 66, 450, 540, 100, { fontSize: 26, color: DK })],
          notes: 'Separador como el cambio de cara del disco: gira solo al llegar.' },
        { layout: 'blank', bg: BR, transition: 'slide', extra: [
          E(40, 470, 620, 170, OR, { opacity: 85 }), E(110, 495, 480, 120, MU, { opacity: 70 }),
          m3d('kh-SheenWoodLeatherSofa', 40, 170, 620, 430, { view: 'three', motion: 'swing' }),
          text('La sala de escucha', 700, 50, 540, 80, { fontFamily: ABR, fontSize: 54, color: MU }),
          text('Cada viernes, un disco entero de principio a fin. Sin móviles y sin saltar canciones.', 704, 140, 520, 120, { fontSize: 26, color: CR }),
          ...chain(sessions.map(([d, t], i) => text(`<span style="display:inline-block;width:110px;color:${DK};background:${MU};text-align:center;border-radius:20px;font-weight:800">${d}</span>&nbsp;&nbsp;${t}`,
            704, 290 + i * 80, 520, 56, { fontSize: 26, color: CR, vAlign: 'middle' })), 'fade-left', { duration: 350 }),
          credit(['kh-SheenWoodLeatherSofa'], 60, 684, 1100, '#b48d6c')],
          notes: 'Un sofá 3D que se balancea suavemente sobre una alfombra de elipses. Con un clic entran las cuatro sesiones del mes, una tras otra.' },
        { layout: 'blank', bg: BR, transition: 'slide', extra: [
          ...stripes(0),
          pollBlock({ kind: 'order', fontSize: 30, x: 80, y: 90, w: 1120, h: 600, question: 'Ordena los pasos para poner un disco',
            options: ['Sacar el disco sin tocar los surcos', 'Quitar el polvo con el cepillo', 'Colocarlo en el plato', 'Elegir 33 o 45 revoluciones', 'Bajar la aguja con la palanca'] })],
          notes: 'Actividad «Ordenar» con nota: en el móvil los pasos salen desordenados. Al acabar, un clic muestra la solución.' },
        { layout: 'blank', bg: BR, transition: 'zoom', extra: [
          deco(RAIN2, 190, 380, 900, 450, 'Arcoíris de franjas'),
          text('Hazte socio', 140, 50, 1000, 140, { fontFamily: ABR, fontSize: 110, color: CR, textAlign: 'center' }),
          text('Préstamo de discos · Sesiones de escucha · Feria de intercambio en diciembre', 140, 205, 1000, 80, { fontSize: 26, color: CR, textAlign: 'center' }),
          text('clubdelvinilo@sanlorenzo.example', 190, 290, 900, 50, { fontSize: 28, color: MU, textAlign: 'center', fontWeight: 700 }),
          withAnims(shape('burst', 960, 330, 250, 250, MU, { stroke: DK, strokeWidth: 3, rotation: 10, html: '15 €<br>al año', fontFamily: ABR, fontSize: 30, color: BR }),
            A('zoom-in', { duration: 400, sound: 'pop' }), A('pulse', { start: 'afterPrev', duration: 700 }))],
          notes: 'Cierre: el arcoíris vuelve, ahora con el centro naranja. Con un clic salta la pegatina de la cuota y late una vez.' },
      ]));
    } },
  // ============================================================================
  // 4 · Años 90: a family backup workshop dressed as a 90s desktop — grey windows, dialogs, a progress bar.
  creative_retro_desktop90: { name: 'Años 90: copias de seguridad', cat: 'creative',
    summary: 'Escritorio de los 90: ventanas grises, errores en cascada, barra de progreso, ecuación, tabla con fórmulas, código por pasos y concurso',
    make: () => {
      const TEAL = '#008080', G = '#c0c0c0', D = '#808080', NAVY = '#000080', BL = '#1084d0', W = '#ffffff', K = '#0a0a0a';
      const V = F('Verdana'), MONO = F('Courier New');
      // (Bevels: light on top and left, dark at the bottom and right.)
      const bevel = (x, y, w, h, face = G) => [R(x, y, w, h, K), R(x, y, w - 2, h - 2, W), R(x + 2, y + 2, w - 4, h - 4, D), R(x + 2, y + 2, w - 6, h - 6, '#dfdfdf'), R(x + 4, y + 4, w - 8, h - 8, face)];
      const sunken = (x, y, w, h, face = W) => [R(x, y, w, h, D), R(x + 2, y + 2, w - 2, h - 2, W), R(x + 2, y + 2, w - 4, h - 4, face)];
      const btn = (label, x, y, w, h = 40, p = {}) => [...bevel(x, y, w, h), text(label, x, y, w, h, { fontFamily: V, fontSize: 18, color: K, textAlign: 'center', vAlign: 'middle', ...p })];
      const win = (x, y, w, h, title, active = true) => [...bevel(x, y, w, h),
        R(x + 6, y + 6, w - 12, 34, active ? NAVY : D, { fill2: active ? BL : '#b5b5b5', gradAngle: 0 }),
        text(title, x + 14, y + 6, w - 130, 34, { fontFamily: V, fontSize: 18, color: W, fontWeight: 700, vAlign: 'middle' }),
        ...['_', '□', '×'].flatMap((c, i) => btn(c, x + w - 98 + i * 30, y + 11, 26, 24, { fontSize: 14, fontWeight: 700 }))];
      // A group of objects that appears at once (the first with the click or after the one before).
      const pop = (blocks, effect = 'zoom-in', props = {}) => blocks.map((b, i) => at(b, effect, { duration: 250, ...props, start: i ? 'withPrev' : (props.start || 'click'), ...(i && { sound: undefined }) }));
      const desk = (n = 3) => [...[['monitor', 'Mi equipo', W], ['folder', 'Fotos de la familia', '#ffd75e'], ['database', 'Copia (E:)', W], ['recycle', 'Papelera', W]].slice(0, n).flatMap(([ic, l, c], i) =>
        [icon(ic, 52, 40 + i * 120, 56, c), text(l, 10, 100 + i * 120, 140, 50, { fontFamily: V, fontSize: 15, color: W, textAlign: 'center' })]),
        R(0, 676, 1280, 44, G), R(0, 676, 1280, 2, W), ...btn('<b>Inicio</b>', 6, 682, 112, 34), ...sunken(1150, 682, 124, 34, G), text('19:04', 1150, 682, 124, 34, { fontFamily: V, fontSize: 17, color: K, textAlign: 'center', vAlign: 'middle' })];
      const heading = t => text(t, 180, 34, 1060, 70, { fontFamily: V, fontSize: 40, color: W, fontWeight: 700, shadow: { x: 3, y: 3, blur: 0, color: '#004040' } });
      const errors = [['Disco duro', 'El disco D: hace un ruido extraño y ya no responde.'], ['Teléfono', 'El móvil se cayó a la piscina con 4.000 fotos dentro.'], ['Correo antiguo', 'Nadie recuerda la contraseña de la cuenta donde estaban los vídeos.']];
      return numbered(build({ name: 'Copias de seguridad para toda la familia', palette: 'grayscale', fonts: 'websafe', title: { color: K } }, [
        { layout: 'blank', bg: TEAL, transition: 'fade', extra: [
          ...desk(4),
          ...win(280, 110, 820, 450, 'Asistente para copias de seguridad'),
          R(296, 156, 220, 388, NAVY, { fill2: TEAL, gradAngle: 90 }), icon('shield-check', 356, 290, 100, W),
          text('Que no se pierda ni una foto', 540, 170, 530, 140, { fontFamily: V, fontSize: 40, color: K, fontWeight: 700, lineHeight: 1.15 }),
          text('Taller de copias de seguridad para toda la familia. Centro cívico La Alameda, tres tardes de octubre.', 540, 320, 520, 110, { fontFamily: V, fontSize: 21, color: '#222222' }),
          ...btn('&lt; Atrás', 590, 488, 140), ...btn('<u>S</u>iguiente &gt;', 740, 488, 170), ...btn('Cancelar', 920, 488, 160)],
          notes: 'Portada con aspecto de escritorio de los años 90: fondo verde azulado, iconos, barra de tareas y una ventana de asistente. Todo son formas con biseles (rectángulos claros arriba y oscuros abajo) e iconos.' },
        { layout: 'blank', bg: TEAL, transition: 'none', extra: [
          ...desk(3),
          ...errors.flatMap(([t, m], i) => { const x = 170 + i * 80, y = 60 + i * 130;
            return pop([...win(x, y, 620, 250, 'Error: ' + t, i === 2), E(x + 30, y + 60, 64, 64, '#d40000'), text('×', x + 30, y + 60, 64, 64, { fontSize: 50, color: W, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }),
              text(m, x + 114, y + 54, 480, 70, { fontFamily: V, fontSize: 20, color: K }), ...btn('Aceptar', x + 240, y + 186, 140, 40)], 'zoom-in', { sound: 'pop', start: i ? 'afterPrev' : 'click', delay: i ? 300 : 0 }); }),
          at(text('<div style="font-size:56px;font-weight:700;line-height:1;white-space:nowrap">6 de 10</div><div style="margin-top:14px">familias del taller han perdido fotos alguna vez</div>', 950, 220, 300, 260,
            { fontFamily: V, fontSize: 22, color: W, shadow: { x: 3, y: 3, blur: 0, color: '#004040' } }), 'fade-in', { start: 'afterPrev', duration: 500 })],
          notes: 'Un clic y los tres errores salen en cascada, cada uno con su «pop», como en los ordenadores de entonces. La cifra es de una encuesta inventada para el ejemplo.' },
        { layout: 'blank', bg: TEAL, transition: 'push', extra: [
          ...desk(2), heading('La regla 3-2-1'),
          ...[['3', 'copias de cada archivo', 'La original y dos más.', 'files'], ['2', 'soportes distintos', 'Por ejemplo, el ordenador y un disco externo.', 'database'], ['1', 'copia fuera de casa', 'En la nube o en casa de un familiar.', 'cloud']]
            .flatMap(([n, t, d, ic], i) => { const x = 180 + i * 360;
              return pop([...win(x, 130, 340, 470, n + ' · ' + t.split(' ')[0]), text(n, x + 20, 180, 300, 170, { fontFamily: V, fontSize: 150, color: NAVY, fontWeight: 700, textAlign: 'center' }),
                text(`<b>${t}</b>`, x + 24, 360, 292, 80, { fontFamily: V, fontSize: 25, color: K, textAlign: 'center' }), text(d, x + 24, 450, 292, 110, { fontFamily: V, fontSize: 19, color: '#333333', textAlign: 'center' })],
              'fade-up', { start: i ? 'afterPrev' : 'click', duration: 350 }); })],
          notes: 'La regla que resume el taller, en tres ventanas que se abren una tras otra con un solo clic.' },
        { layout: 'blank', bg: TEAL, transition: 'push', extra: [
          ...desk(2), heading('¿Por qué tres copias?'),
          ...win(200, 130, 1000, 470, 'Calculadora'),
          ...sunken(230, 186, 940, 90), text('0,000001', 250, 192, 900, 78, { fontFamily: MONO, fontSize: 56, color: K, textAlign: 'right', vAlign: 'middle' }),
          mathBlock({ x: 230, y: 300, w: 940, h: 120, fontSize: 33, color: K, latex: 'P(A \\cap B \\cap C) = 0{,}01 \\times 0{,}01 \\times 0{,}01 = 0{,}000\\,001' }),
          text('Si cada copia tiene un 1 % de probabilidad de fallar en un año, y fallan por separado, perder las tres a la vez pasa una vez entre un millón.', 240, 440, 920, 130, { fontFamily: V, fontSize: 23, color: K })],
          notes: 'Ecuación (Insertar ▸ Ecuación) dentro de una «calculadora». El truco está en «por separado»: si las tres copias están en la misma casa, un incendio se las lleva juntas. Por eso una va fuera.' },
        { layout: 'blank', bg: TEAL, transition: 'push', extra: [
          ...desk(2), heading('¿Cuánto ocupa una familia?'),
          ...win(180, 120, 1040, 500, 'Explorador · Fotos de la familia'),
          tableBlock({ x: 200, y: 172, w: 1000, h: 340, fontSize: 24, fontFamily: V, header: true, banded: true, headBg: NAVY, headFg: W, band: '#dfdfdf', bandAlpha: 1, stroke: D, colW: [4, 3, 3, 3],
            rows: [['Tipo de archivo', 'Archivos', 'MB por archivo', 'Total (GB)'], ['Fotos', '18.000', '4', '=B2*C2/1000'], ['Vídeos', '350', '300', '=B3*C3/1000'], ['Documentos', '2.500', '0,5', '=B4*C4/1000'],
              ['Música', '4.000', '8', '=B5*C5/1000'], ['<b>Total</b>', '=SUMA(B2:B5)', '', '=SUMA(D2:D5)']] }),
          ...sunken(196, 530, 1008, 70, G), text('4 tipos · unos 210 GB en total: un disco externo de 1 TB guarda cuatro copias completas.', 210, 534, 980, 62, { fontFamily: V, fontSize: 20, color: K, vAlign: 'middle' })],
          notes: 'Tabla con fórmulas: el total de cada fila es archivos por megas entre mil (gigas) y la última fila suma con =SUMA. Cambia el número de fotos y todo se recalcula. Cantidades de una familia de ejemplo.' },
        { layout: 'blank', bg: TEAL, transition: 'push', extra: [
          ...desk(4), heading('Programa la copia y olvídate'),
          ...win(240, 150, 860, 380, 'Copiando…'),
          icon('folder', 290, 220, 64, '#e0b000'), icon('arrow-right', 380, 232, 40, NAVY), icon('database', 440, 220, 64, NAVY),
          text('Copiando «Fotos de la familia» en Copia (E:)', 540, 214, 520, 40, { fontFamily: V, fontSize: 21, color: K }),
          text('IMG_2014_0712.JPG', 540, 256, 520, 36, { fontFamily: MONO, fontSize: 20, color: '#333333' }),
          ...sunken(290, 320, 760, 50),
          ...Array.from({ length: 24 }, (_, i) => at(R(296 + i * 31, 326, 27, 38, NAVY), 'fade-in', { start: i ? 'afterPrev' : 'click', duration: 60, delay: 40, ...(i === 23 && { sound: 'chime' }) })),
          text('Tiempo restante: unos 2 minutos', 290, 386, 600, 40, { fontFamily: V, fontSize: 19, color: K }),
          ...btn('Cancelar', 900, 456, 150)],
          notes: 'La barra de progreso de toda la vida: un clic y sus 24 bloques se encienden uno tras otro (animaciones encadenadas «después de la anterior»); al terminar suena una campanilla.' },
        { layout: 'blank', bg: TEAL, transition: 'push', extra: [
          ...win(60, 30, 1160, 630, 'copia.sh · Bloc de notas'),
          codeBlock({ x: 76, y: 78, w: 1128, h: 566, fontSize: 26, lang: 'bash', lineSteps: '2-4|6-7|9-10',
            code: '#!/bin/sh\n# Copia diaria de las fotos de la familia\nORIGEN="$HOME/Fotos"\nDESTINO="/media/copia/Fotos"\n\n# Copia solo lo nuevo o lo que ha cambiado\nrsync -av "$ORIGEN/" "$DESTINO/"\n\n# Apunta la fecha en el registro\ndate >> "$HOME/copias.log"' })],
          notes: 'Código con pasos de resaltado: primero las carpetas, luego la copia (rsync solo copia lo nuevo) y al final el registro. Para que se haga sola cada noche, se programa con el planificador del sistema.' },
        { layout: 'blank', bg: TEAL, transition: 'zoom', extra: [
          ...win(40, 24, 1200, 640, 'Concurso · ¿Está a salvo?'),
          pollBlock({ kind: 'quiz', fontSize: 32, x: 70, y: 84, w: 1140, h: 560, time: 20, correct: [1],
            question: '¿Qué fotos NO tienen copia de seguridad?', options: ['Las del móvil que también están en el disco externo', 'Las que están solo en el móvil', 'Las del portátil que se suben a la nube', 'Las del álbum impreso que ya escaneamos'] })],
          notes: 'Concurso con puntos por rapidez desde el móvil. Solo la segunda opción tiene una única copia.' },
        { layout: 'blank', bg: '#000000', transition: 'fade', extra: [
          at(text('Ya puede apagar el equipo.', 90, 250, 1100, 90, { fontFamily: V, fontSize: 58, color: '#ff9a00', textAlign: 'center' }), 'fade-in', { start: 'afterPrev', duration: 1500, delay: 600 }),
          at(text('Próxima sesión: martes a las 18:00. Trae tu móvil y un disco externo.', 90, 380, 1100, 50, { fontFamily: V, fontSize: 26, color: '#bdbdbd', textAlign: 'center' }), 'fade-in', { start: 'afterPrev', duration: 800 }),
          at(text('talleres@laalameda.example', 90, 440, 1100, 50, { fontFamily: V, fontSize: 24, color: '#7fd0d0', textAlign: 'center' }), 'fade-in', { start: 'withPrev', duration: 800 })],
          notes: 'Cierre con la pantalla negra de apagado de aquellos ordenadores. El texto aparece solo, despacio.' },
      ]));
    } },

  // ============================================================================
  // 5 · Vaporwave: background music in shops — pastel sky, moon, palms, a column, glitch titles.
  creative_retro_vapor: { name: 'Vaporwave: la música de las tiendas', cat: 'creative',
    summary: 'Vaporwave pastel: luna que se transforma, palmeras en SVG, títulos glitch, dispersión, lámpara 3D, tabla con media y valoración',
    make: () => {
      const PINK = '#ff71ce', CY = '#01cdfe', MINT = '#05ffa1', LAV = '#b967ff', DEEP = '#2b1b54', W = '#ffffff', PALM = '#3b1f6e';
      const IN = F('Inter'), moon = uid(), p1 = uid(), p2 = uid();
      const palm = svg(300, 520, `<path d="M150 520C164 400 136 280 170 150" stroke="${PALM}" stroke-width="18" fill="none" stroke-linecap="round"/>`
        + [[20, 160, 90, 80], [50, 60, 110, 70], [170, 10, 150, 60], [285, 70, 240, 55], [295, 180, 250, 105], [70, 250, 110, 160], [250, 260, 235, 170]]
          .map(([ex, ey, cx, cy]) => `<path d="M170 150Q${cx} ${cy} ${ex} ${ey}Q${cx + 22} ${cy + 26} 170 150Z" fill="${PALM}"/>`).join(''));
      const column = svg(140, 440, `<rect x="0" y="0" width="140" height="26" fill="#f6efff"/><rect x="12" y="26" width="116" height="16" fill="#e6dcfb"/>`
        + `<rect x="22" y="42" width="96" height="352" fill="#f6efff"/>` + [34, 50, 66, 82, 98, 106].map(x => `<rect x="${x}" y="48" width="5" height="340" rx="2.5" fill="#d9c8f7"/>`).join('')
        + `<rect x="12" y="394" width="116" height="16" fill="#e6dcfb"/><rect x="0" y="410" width="140" height="30" fill="#f6efff"/>`);
      const sky = R(0, 0, 1280, 720, '#f7a8ff', { fill2: '#8ee6ff', gradAngle: 90 });
      const sea = [R(0, 480, 1280, 240, '#7d63e0', { fill2: DEEP, gradAngle: 90 }), ...[[496, 10], [526, 8], [552, 6], [574, 5]].map(([y, h], i) => R(490 + i * 30, y, 300 - i * 60, h, '#ffffff', { opacity: 75 - i * 15 }))];
      const moonAt = (x, y, d) => withId(E(x, y, d, d, '#ffffff', { fill2: '#ffc4ec', gradAngle: 90, shadow: { x: 0, y: 0, blur: 40, color: '#ffffffaa' } }), moon);
      const palms = () => [withId(deco(palm, -30, 160, 300, 520, 'Palmera'), p1), withId(deco(palm, 1010, 190, 280, 485, 'Palmera'), p2)];
      // A title with the cyan and pink copies of a glitch behind it (they appear by themselves).
      const glitch = (t, x, y, w, h, size, color = W, p = {}, start = 'afterPrev') => {
        const o = { fontFamily: IN, fontSize: size, fontWeight: 800, ...p };
        return [at(text(t, x - 6, y + 2, w, h, { ...o, color: CY }), 'fade-in', { start, duration: 120, delay: 500 }), at(text(t, x + 6, y - 2, w, h, { ...o, color: PINK }), 'fade-in', { start: 'withPrev', duration: 120, delay: 560 }),
          text(t, x, y, w, h, { ...o, color })]; };
      return numbered(build({ name: 'Ambiente · el sonido de las tiendas', palette: 'violet', fonts: 'clean', title: { color: W } }, [
        { layout: 'blank', bg: '#f7a8ff', transition: 'fade', extra: [
          sky, moonAt(490, 190, 300), ...sea, ...palms(),
          ...glitch('AMBIENTE', 140, 50, 1000, 170, 130, DEEP, { textAlign: 'center', letterSpacing: 18 }),
          text('環境音楽', 1150, 40, 80, 300, { fontSize: 50, color: DEEP, vertical: true, fontWeight: 700 }),
          text('EL SONIDO DE LAS TIENDAS · CHARLA DE DISEÑO SONORO', 140, 618, 1000, 50, { fontFamily: IN, fontSize: 26, color: W, textAlign: 'center', letterSpacing: 4, fontWeight: 700 })],
          notes: 'Portada vaporwave: cielo con degradado pastel, luna con degradado, reflejo en el agua hecho con franjas y palmeras dibujadas en SVG. Las copias cian y rosa del título aparecen solas: el efecto «glitch». 環境音楽 significa «música de ambiente».' },
        { layout: 'blank', bg: DEEP, transition: 'fade', extra: [
          R(0, 0, 1280, 720, DEEP, { fill2: '#6a3fb5', gradAngle: 90 }),
          ...glitch('Nadie la escucha.<br>Todos la oyen.', 80, 60, 1120, 230, 80, W, { lineHeight: 1.1 }),
          ...chain([['3 de cada 4', 'tiendas ponen música de fondo todo el día', CY], ['40 dB', 'el volumen ideal: una conversación en voz baja', PINK], ['+18 %', 'de tiempo en la tienda con música lenta', MINT]].map(([n, d, c], i) =>
            card(`<div style="font-size:46px;font-weight:800;color:${c};line-height:1.1;white-space:nowrap">${n}</div><div style="margin-top:12px">${d}</div>`, 80 + i * 380, 360, 350, 210, '#ffffff14',
              { borderColor: c, color: W, fontSize: 24, fontFamily: IN, radius: 24 })), 'fade-up', { duration: 450 })],
          notes: 'Tres tarjetas con borde de color que entran con un clic, una tras otra. Cifras inventadas para la charla.' },
        { layout: 'blank', bg: '#f7a8ff', autoAnimate: true, transition: 'fade', extra: [
          sky, moonAt(70, 120, 480), ...sea, palms()[1],
          text('72', 70, 210, 480, 300, { fontFamily: IN, fontSize: 230, fontWeight: 800, color: DEEP, textAlign: 'center', vAlign: 'middle' }),
          text('PULSACIONES POR MINUTO', 600, 150, 600, 40, { fontFamily: IN, fontSize: 26, color: DEEP, fontWeight: 800, letterSpacing: 4 }),
          text('Por debajo del ritmo del corazón en reposo. Con ese tempo, la gente camina más despacio y mira más.', 600, 200, 400, 230, { fontFamily: IN, fontSize: 30, color: DEEP })],
          notes: 'Transformar: la luna de la portada crece y viaja a la izquierda para enmarcar la cifra (mismo objeto en las dos diapositivas).' },
        { layout: 'blank', bg: '#fff0fb', transition: 'slide', extra: [
          deco(svg(1280, 720, Array.from({ length: 33 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="720" stroke="#ffd0ef" stroke-width="2"/>`).join('') + Array.from({ length: 19 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="1280" y2="${i * 40}" stroke="#ffd0ef" stroke-width="2"/>`).join('')), 0, 0, 1280, 720, 'Cuadrícula'),
          ...glitch('Más lenta, más tiempo', 60, 36, 1000, 90, 54, DEEP, {}, 'afterPrev'),
          chartBlock({ x: 60, y: 140, w: 820, h: 540, chartType: 'scatter', color: LAV, grid: true, xTitle: 'Tempo de la música (ppm)', yTitle: 'Minutos en la tienda', xMin: 50, xMax: 130, yMin: 0, yMax: 30, labelColor: DEEP,
            data: [[60, 26], [64, 24], [70, 23], [72, 25], [78, 21], [84, 19], [88, 20], [92, 16], [96, 17], [102, 14], [108, 12], [112, 13], [118, 10], [124, 9]].map(([x, y]) => ({ label: String(x), value: y })) }),
          card('<b>Una tienda, 14 semanas.</b><br>Cada semana, un tempo distinto en la lista de reproducción. Cuanto más lenta la música, más se quedaba la gente.', 920, 200, 300, 330, '#ffffff', { borderColor: LAV, color: DEEP, fontSize: 23, fontFamily: IN, radius: 24 })],
          notes: 'Gráfico de dispersión con escala propia en los dos ejes. Datos simulados de un experimento inventado.' },
        { layout: 'blank', bg: '#ffe3f6', transition: 'slide', extra: [
          R(0, 0, 1280, 720, '#ffe3f6', { fill2: '#d4f4ff', gradAngle: 90 }),
          glow(40, 100, 480, '#c9a6ff', '#ffe3f6', 70),
          img(column, 210, 380, 140, 330, 'Columna clásica'),
          m3d('kh-IridescenceLamp', 120, 60, 320, 360, { autoRotate: true, view: 'front' }),
          ...glitch('La luz también suena', 520, 70, 720, 90, 52, DEEP),
          text(ul('Luz cálida y tenue: la música puede bajar dos o tres decibelios', 'Colores que cambian despacio, como un tempo lento', 'Nada de destellos ni cortes bruscos'), 524, 190, 700, 330, { fontFamily: IN, fontSize: 28, color: DEEP }),
          text('Ambiente = sonido + luz + olor + temperatura', 524, 560, 700, 50, { fontFamily: IN, fontSize: 24, color: '#7a2fd0', fontWeight: 700 }),
          credit(['kh-IridescenceLamp'], 524, 686, 700, '#6a5a8f')],
          notes: 'Una lámpara iridiscente en 3D que gira sola sobre una columna clásica dibujada en SVG, con un brillo detrás.' },
        { layout: 'blank', bg: DEEP, transition: 'slide', extra: [
          R(0, 0, 1280, 720, DEEP, { fill2: '#3d2a7a', gradAngle: 90 }), R(0, 0, 1280, 16, PINK, { fill2: CY, gradAngle: 0 }),
          ...glitch('Un día en la tienda', 60, 40, 1000, 90, 54, W, {}, 'afterPrev'),
          tableBlock({ x: 60, y: 150, w: 1160, h: 400, fontSize: 26, fontFamily: IN, header: true, banded: true, headBg: LAV, headFg: W, band: CY, bandAlpha: 0.12, stroke: '#6d55b0', colW: [3, 3, 3, 5],
            rows: [['Franja', 'Tempo (ppm)', 'Volumen (dB)', 'Estilo'], ['9:00 a 12:00', '90', '38', 'Acústica tranquila'], ['12:00 a 16:00', '100', '42', 'Pop suave'], ['16:00 a 19:00', '80', '40', 'Bossa y lo-fi'],
              ['19:00 a 21:00', '70', '36', 'Ambient'], ['<b>Media del día</b>', '=PROMEDIO(B2:B5)', '=PROMEDIO(C2:C5)', '']] }),
          text('La última fila se calcula sola con =PROMEDIO.', 60, 580, 1160, 50, { fontFamily: IN, fontSize: 24, color: MINT })],
          notes: 'La programación de un día, por franjas. Tabla con fórmulas: la fila de la media usa =PROMEDIO. Valores de ejemplo.' },
        { layout: 'blank', bg: DEEP, transition: 'zoom', extra: [
          R(0, 0, 1280, 720, '#1d2f6b', { fill2: '#6a3fb5', gradAngle: 90 }),
          pollBlock({ kind: 'rating', fontSize: 36, x: 80, y: 60, w: 1120, h: 600, question: 'Del 1 al 5: ¿qué nota le pones a la música de tu supermercado?' })],
          notes: 'Valoración en directo desde el móvil: el público puntúa del 1 al 5 y se ve la media.' },
        { layout: 'blank', bg: '#f7a8ff', autoAnimate: true, transition: 'fade', extra: [
          sky, moonAt(440, 120, 400), ...sea, ...palms(),
          ...glitch('gracias', 140, 200, 1000, 200, 150, DEEP, { textAlign: 'center', letterSpacing: 10 }),
          text('La lista de la charla: ambiente.example/lista', 140, 618, 1000, 50, { fontFamily: IN, fontSize: 28, color: W, textAlign: 'center', fontWeight: 700 })],
          notes: 'Cierre con Transformar: la luna vuelve al centro. El título hace el «glitch» al llegar.' },
      ]));
    } },

  // ============================================================================
  // 6 · Teletexto: a neighbourhood basketball league, told as TV text pages.
  creative_retro_teletext: { name: 'Teletexto: la liga vecinal', cat: 'creative',
    summary: 'Páginas de teletexto: líneas que se cargan solas, marcador y clasificación con fórmulas, barras, columnas, concurso y cuenta atrás',
    make: () => {
      const K = '#000000', W = '#ffffff', RD = '#ff2a2a', GR = '#00e000', YE = '#ffff00', BU = '#1a1aff', MA = '#ff00ff', CY = '#00ffff';
      const M = F('Fira Code');
      const t = (s, x, y, w, h, size, color = W, p = {}) => text(s, x, y, w, h, { fontFamily: M, fontSize: size, color, ...p });
      const header = page => [t(`P${page}`, 40, 14, 120, 36, 24, W), t('TELE·LIGA', 200, 14, 300, 36, 24, YE, { fontWeight: 700 }), t('lun 06 oct  21:04:37', 860, 14, 380, 36, 24, W, { textAlign: 'right' })];
      const band = (s, color, fg = W, sub = '') => [R(40, 64, 1200, 96, color), t(s, 60, 64, 1160, 96, 60, fg, { fontWeight: 700, vAlign: 'middle', letterSpacing: 4 }),
        ...(sub ? [t(sub, 60, 168, 1160, 36, 24, CY)] : [])];
      const fastext = () => [['Resultados', RD], ['Clasificación', GR], ['Anotadores', YE], ['Índice', CY]].map(([s, c], i) => t(s, 40 + i * 300, 668, 290, 36, 24, c, { fontWeight: 700 }));
      // Mosaic graphics: rows of characters, each a block of colour.
      const mosaic = (rows, colors) => svg(rows[0].length * 10, rows.length * 10, rows.flatMap((r, y) => [...r].map((c, x) => (colors[c] ? `<rect x="${x * 10}" y="${y * 10}" width="10.4" height="10.4" fill="${colors[c]}"/>` : ''))).join(''));
      // (A ball of 23 × 23 blocks: a circle with its seams.)
      const BALL = mosaic(Array.from({ length: 23 }, (_, y) => Array.from({ length: 23 }, (_, x) => { const dx = x - 11, dy = y - 11, r = Math.hypot(dx, dy);
        if (r > 11.2) return '.'; if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5 || Math.abs(Math.hypot(x + 5, dy) - 13.5) < 0.55 || Math.abs(Math.hypot(x - 27, dy) - 13.5) < 0.55) return 'K'; return r > 10 ? 'd' : 'o'; }).join('')),
        { o: '#ff8c00', d: '#d06000', K: '#000000' });
      const index = [['101', 'La final', W], ['102', 'Clasificación', GR], ['103', 'Máximos anotadores', YE], ['104', 'Público en el pabellón', CY], ['150', 'Concurso', MA], ['199', 'Próxima temporada', W]];
      const load = (blocks, first = 'afterPrev') => chain(blocks, 'fade-in', { duration: 60, delay: 90 }, first);
      return numbered(build({ name: 'Tele·Liga · liga vecinal de baloncesto', palette: 'midnight', fonts: 'tech', title: { color: YE } }, [
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(100), ...band('LIGA VECINAL', BU, YE, 'DE BALONCESTO · TEMPORADA 2025 · RESUMEN'),
          img(BALL, 960, 230, 240, 240, 'Un balón de baloncesto en mosaico'),
          ...load(index.map(([n, s, c], i) => t(`${s} ${'.'.repeat(30 - s.length)} ${n}`, 60, 236 + i * 64, 860, 50, 32, c))),
          ...fastext()],
          notes: 'La página de índice del teletexto: cabecera con el número de página y la hora, una franja de título y las líneas que se «cargan» solas al llegar. Abajo, los cuatro botones de colores.' },
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(101), ...band('LA FINAL', RD, W, 'PABELLÓN DEL RÍO · SÁBADO 4 DE OCTUBRE'),
          ...load([t('HALCONES', 60, 240, 600, 100, 80, YE, { fontWeight: 700 }), t('68', 760, 240, 200, 100, 80, YE, { fontWeight: 700, textAlign: 'right' }),
            t('TOROS', 60, 340, 600, 100, 80, W, { fontWeight: 700 }), t('64', 760, 340, 200, 100, 80, W, { fontWeight: 700, textAlign: 'right' })], 'click'),
          tableBlock({ x: 60, y: 470, w: 1160, h: 170, fontSize: 28, fontFamily: M, header: true, headBg: '#000000', headFg: CY, stroke: '#444444', colW: [4, 2, 2, 2, 2, 2.4],
            rows: [['Cuarto', '1º', '2º', '3º', '4º', 'Total'], ['Halcones', '16', '18', '15', '19', '=SUMA(IZQUIERDA)'], ['Toros', '20', '14', '17', '13', '=SUMA(IZQUIERDA)']] }),
          ...fastext()],
          notes: 'Clic: el marcador aparece línea a línea. Los totales de la tabla se calculan solos con =SUMA(IZQUIERDA). Liga y resultados inventados.' },
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(102), ...band('CLASIFICACIÓN', GR, K, 'FINAL DE LA LIGA REGULAR · 14 JORNADAS'),
          tableBlock({ x: 60, y: 220, w: 1160, h: 420, fontSize: 30, fontFamily: M, header: true, headBg: '#000000', headFg: YE, stroke: '#333333', colW: [5, 2, 2, 2, 2.4],
            cellBg: { '1,0': '#003300', '1,1': '#003300', '1,2': '#003300', '1,3': '#003300', '1,4': '#003300' },
            rows: [['Equipo', 'PJ', 'G', 'P', 'Puntos'], ['1 Halcones', '14', '11', '3', '=C2*2+D2'], ['2 Toros', '14', '10', '4', '=C3*2+D3'], ['3 Linces', '14', '8', '6', '=C4*2+D4'],
              ['4 Delfines', '14', '6', '8', '=C5*2+D5'], ['5 Castores', '14', '4', '10', '=C6*2+D6'], ['6 Búhos', '14', '3', '11', '=C7*2+D7']] }),
          ...fastext()],
          notes: 'Clasificación con fórmulas: dos puntos por victoria y uno por derrota (=C2*2+D2). Cambia un resultado y la tabla se recalcula.' },
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(103), ...band('MÁXIMOS ANOTADORES', YE, K, 'PUNTOS POR PARTIDO'),
          chartBlock({ x: 60, y: 220, w: 1160, h: 430, chartType: 'hbar', color: CY, dataLabels: true, labelColor: W, labelWidth: 30,
            data: [['Robles · Halcones', 21.4], ['Iriarte · Toros', 19.8], ['Sanz · Linces', 18.1], ['Ochoa · Delfines', 16.9], ['Pardo · Halcones', 15.2]].map(([label, value]) => ({ label, value })) }),
          ...fastext()],
          notes: 'Barras horizontales en cian sobre negro, como en la tele. Nombres y cifras inventados.' },
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(104), ...band('PÚBLICO EN EL PABELLÓN', BU, W, 'ESPECTADORES POR JORNADA'),
          chartBlock({ x: 60, y: 220, w: 820, h: 430, chartType: 'bar', color: GR, grid: true, labelColor: W,
            data: [140, 165, 150, 180, 210, 190, 205, 230, 220, 245, 260, 255, 290, 412].map((value, i) => ({ label: String(i + 1), value })) }),
          t('412', 920, 260, 300, 120, 110, YE, { fontWeight: 700 }),
          t('personas en la final: récord de la liga', 920, 390, 300, 110, 26, W),
          t('Media: 225 por partido', 920, 530, 300, 50, 20, CY)],
          notes: 'Columnas por jornada: el público crece hasta el récord de la final. Cifras inventadas.' },
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(150),
          pollBlock({ kind: 'quiz', fontSize: 34, x: 60, y: 70, w: 1160, h: 580, time: 15, correct: [2],
            question: '¿Cuántos puntos anotaron los Halcones en la final?', options: ['60', '64', '68', '72'] }),
          ...fastext()],
          notes: 'Concurso desde el móvil con puntos por rapidez. La respuesta estaba en la página 101.' },
        { layout: 'blank', bg: K, transition: 'none', extra: [
          ...header(199), ...band('PRÓXIMA TEMPORADA', MA, W, 'INSCRIPCIONES ABIERTAS'),
          ...load([t('Equipos de 8 a 12 personas', 60, 240, 700, 50, 30, W), t('Desde 16 años · mixtos', 60, 300, 700, 50, 30, W), t('Cuota por equipo: 120 €', 60, 360, 700, 50, 30, GR),
            t('Escribe a liga@barriodelrio.example', 60, 440, 700, 50, 28, CY)]),
          t('EL PLAZO CIERRA EN', 800, 230, 420, 40, 24, YE, { textAlign: 'center' }),
          timer(900, 800, 280, 420, { style: 'digital', color: YE, h: 160 }),
          ...fastext()],
          notes: 'Las líneas se cargan solas y la cuenta atrás digital de quince minutos empieza al llegar: lo que queda de inscripción en el descanso.' },
      ]));
    } },

  // ============================================================================
  // 7 · Años 20, art déco: a grand hotel turns one hundred — gold on black, sunbursts, an elevator panel.
  creative_retro_deco: { name: 'Art déco: el Gran Hotel cumple 100', cat: 'creative',
    summary: 'Art déco en oro y negro: abanico que se transforma, Text Art dorado, ascensor como línea del tiempo, sofá 3D, tabla con fórmulas y concurso',
    make: () => {
      const BLK = '#0e0e10', GOLD = '#c9a227', GOLD2 = '#f0d78c', CR = '#f3ead7', EM = '#0f4c3a', EM2 = '#0a3329', INK = '#1b1b1b';
      const JO = F('Josefin Sans'), PF = F('Playfair Display'), sun = uid();
      // A sunburst fan: rays from the middle of the bottom edge and three arcs.
      const fan = (c = GOLD) => svg(800, 400, Array.from({ length: 18 }, (_, i) => { const a1 = Math.PI * i / 18, a2 = Math.PI * (i + 0.5) / 18;
        return `<path d="M400 400L${400 - 390 * Math.cos(a1)} ${400 - 390 * Math.sin(a1)}L${400 - 390 * Math.cos(a2)} ${400 - 390 * Math.sin(a2)}Z" fill="${c}" opacity=".55"/>`; }).join('')
        + [110, 180, 250].map(r => `<path d="M${400 - r} 400A${r} ${r} 0 0 1 ${400 + r} 400" fill="none" stroke="${c}" stroke-width="4"/>`).join('')
        + `<path d="M330 400A70 70 0 0 1 470 400Z" fill="${c}"/>`);
      // A frame with stepped corners, all round the slide.
      const frame = (c = GOLD, m = 26) => deco(svg(1280, 720, `<rect x="${m}" y="${m}" width="${1280 - 2 * m}" height="${720 - 2 * m}" fill="none" stroke="${c}" stroke-width="3"/>`
        + `<rect x="${m + 12}" y="${m + 12}" width="${1280 - 2 * m - 24}" height="${720 - 2 * m - 24}" fill="none" stroke="${c}" stroke-width="1.5"/>`
        + [[m, m, 1, 1], [1280 - m, m, -1, 1], [m, 720 - m, 1, -1], [1280 - m, 720 - m, -1, -1]].map(([x, y, sx, sy]) =>
          `<path d="M${x} ${y + sy * 70}H${x + sx * 30}V${y + sy * 30}H${x + sx * 70}V${y}" fill="none" stroke="${c}" stroke-width="3"/><rect x="${x + sx * 44 - 6}" y="${y + sy * 44 - 6}" width="12" height="12" fill="${c}" transform="rotate(45 ${x + sx * 44} ${y + sy * 44})"/>`).join('')), 0, 0, 1280, 720, 'Marco art déco');
      const rule = (x, y, w, c = GOLD) => deco(svg(w, 24, `<line x1="0" y1="12" x2="${w / 2 - 20}" y2="12" stroke="${c}" stroke-width="2"/><line x1="${w / 2 + 20}" y1="12" x2="${w}" y2="12" stroke="${c}" stroke-width="2"/>`
        + `<rect x="${w / 2 - 8}" y="4" width="16" height="16" fill="${c}" transform="rotate(45 ${w / 2} 12)"/>`), x, y, w, 24, 'Filete');
      const arches = svg(600, 520, [0, 1, 2].map(i => { const x = 20 + i * 190;
        return `<path d="M${x} 520V150A85 85 0 0 1 ${x + 170} 150V520" fill="${EM2}" stroke="${GOLD}" stroke-width="4"/><path d="M${x + 20} 520V160A65 65 0 0 1 ${x + 150} 160V520" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity=".7"/>`
          + Array.from({ length: 7 }, (_, k) => { const a = Math.PI * (k + 1) / 8; return `<line x1="${x + 85}" y1="150" x2="${x + 85 - 60 * Math.cos(a)}" y2="${150 - 60 * Math.sin(a)}" stroke="${GOLD}" stroke-width="2" opacity=".7"/>`; }).join(''); }).join('')
        + `<rect x="0" y="508" width="600" height="12" fill="${GOLD}"/>`);
      const floors = [['1926', 'Inauguración', '120 habitaciones y el primer ascensor de la ciudad.'], ['1931', 'El salón de baile', 'Orquesta en directo todos los sábados por la noche.'],
        ['1958', 'Dos plantas más', '94 habitaciones nuevas sin tocar la fachada.'], ['1987', 'La gran restauración', 'Vuelven las vidrieras y el latón de la escalera.'], ['2026', 'El centenario', 'El vestíbulo recupera sus colores originales.']];
      return numbered(build({ name: 'Gran Hotel Alcázar · centenario', palette: 'midnight', fonts: 'editorial', title: { color: GOLD2 } }, [
        { layout: 'blank', bg: BLK, transition: 'fade', extra: [
          frame(),
          withId(at(deco(fan(), 380, 422, 520, 260, 'Abanico de rayos'), 'grow', { start: 'afterPrev', duration: 1200 }), sun),
          text('G R A N &nbsp; H O T E L', 140, 92, 1000, 50, { fontFamily: JO, fontSize: 34, color: GOLD2, textAlign: 'center', fontWeight: 700 }),
          text('Alcázar', 140, 140, 1000, 200, { fontFamily: PF, fontSize: 160, textAlign: 'center', wordart: 'gold', fontWeight: 700 }),
          rule(440, 352, 400),
          text('1926 · 2026', 140, 384, 1000, 60, { fontFamily: JO, fontSize: 40, color: CR, textAlign: 'center', letterSpacing: 8 })],
          notes: 'Portada art déco: marco con esquinas escalonadas y un abanico de rayos (dibujos SVG propios) que crece al llegar. El nombre lleva el Text Art «Oro». La historia y las cifras del hotel son inventadas.' },
        { layout: 'blank', bg: CR, transition: 'fade', extra: [
          frame(GOLD, 26),
          text('100', 90, 120, 560, 330, { fontFamily: PF, fontSize: 290, color: EM, fontWeight: 700, textAlign: 'center', lineHeight: 1 }),
          rule(150, 460, 440),
          text('AÑOS EN LA PLAZA MAYOR', 90, 500, 560, 50, { fontFamily: JO, fontSize: 30, color: INK, textAlign: 'center', fontWeight: 700, letterSpacing: 4 }),
          ...chain([['214', 'habitaciones hoy, en seis plantas'], ['1', 'ascensor de 1926 que sigue funcionando'], ['3', 'generaciones de la misma familia al frente']].map(([n, d], i) =>
            text(`<div style="font-family:${PF};font-size:64px;font-weight:700;color:${GOLD};line-height:1;margin-bottom:8px">${n}</div>${d}`, 720, 130 + i * 165, 470, 150, { fontFamily: JO, fontSize: 27, color: INK })), 'fade-left', { duration: 450 })],
          notes: 'Una cifra gigante y tres datos que entran con un clic, uno tras otro. Los números son del ejemplo.' },
        { layout: 'blank', bg: EM, transition: 'push', extra: [
          text('Planta a planta', 400, 50, 820, 80, { fontFamily: PF, fontSize: 56, color: GOLD2 }),
          text('Cien años de historia, como los botones del ascensor', 404, 132, 820, 40, { fontFamily: JO, fontSize: 24, color: CR }),
          R(80, 60, 260, 610, GOLD, { radius: 8 }), R(92, 72, 236, 586, EM2),
          deco(svg(200, 110, `<path d="M10 100A90 90 0 0 1 190 100" fill="none" stroke="${GOLD}" stroke-width="4"/>` + Array.from({ length: 6 }, (_, k) => { const a = Math.PI * k / 5;
            return `<line x1="${100 - 78 * Math.cos(a)}" y1="${100 - 78 * Math.sin(a)}" x2="${100 - 90 * Math.cos(a)}" y2="${100 - 90 * Math.sin(a)}" stroke="${GOLD2}" stroke-width="4"/>`; }).join('')
            + `<line x1="100" y1="100" x2="150" y2="40" stroke="${GOLD2}" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="100" r="10" fill="${GOLD}"/>`), 110, 80, 200, 110, 'Indicador de planta'),
          ...floors.flatMap(([y, h, d], i) => { const top = 620 - i * 96;
            return [at(E(160, top - 36, 100, 72, GOLD, { stroke: GOLD2, strokeWidth: 3, html: y, fontFamily: JO, fontSize: 26, color: INK, fontWeight: 700 }), 'zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'click' }),
              at(text(`<b style="color:${GOLD2};font-family:${PF};font-size:28px">${h}</b><br>${d}`, 400, top - 44, 800, 90, { fontFamily: JO, fontSize: 23, color: CR }), 'fade-right', { start: 'withPrev', duration: 400 })]; })],
          notes: 'La línea del tiempo es el panel del ascensor: con un clic se encienden los botones de abajo arriba, cada uno con su «clic», y a su lado aparece lo que pasó ese año.' },
        { layout: 'blank', bg: BLK, transition: 'fade', extra: [
          img(arches, 60, 120, 600, 520, 'Tres arcos del vestíbulo'),
          m3d('kh-GlamVelvetSofa', 80, 330, 560, 320, { view: 'front', motion: 'swing' }),
          text('El vestíbulo, como en 1926', 700, 70, 520, 140, { fontFamily: PF, fontSize: 50, color: GOLD2, lineHeight: 1.1 }),
          rule(700, 220, 300),
          text(ul('Terciopelo verde esmeralda en sofás y cortinas', 'Latón pulido en barandillas y lámparas', 'Suelo de mármol con el dibujo del abanico', 'Cristal tallado en las puertas giratorias'), 700, 270, 520, 330, { fontFamily: JO, fontSize: 26, color: CR }),
          credit(['kh-GlamVelvetSofa'], 60, 670, 1160, '#8c7a4a')],
          notes: 'Sofá en 3D (biblioteca de modelos) que se balancea suavemente bajo tres arcos dibujados en SVG. La restauración ha copiado los colores de las fotos de la inauguración.' },
        { layout: 'blank', bg: CR, transition: 'push', extra: [
          R(0, 0, 1280, 14, GOLD), R(0, 706, 1280, 14, GOLD),
          text('Un siglo de huéspedes', 60, 40, 800, 80, { fontFamily: PF, fontSize: 54, color: EM }),
          text('Ocupación media de cada década, en % (datos del ejemplo)', 64, 118, 800, 40, { fontFamily: JO, fontSize: 23, color: INK }),
          chartBlock({ x: 60, y: 170, w: 820, h: 500, chartType: 'area', color: GOLD, grid: true, yMin: 0, yMax: 100, labelColor: INK, yTitle: '% de ocupación',
            data: [['1930', 62], ['1940', 38], ['1950', 55], ['1960', 71], ['1970', 78], ['1980', 66], ['1990', 74], ['2000', 81], ['2010', 79], ['2020', 84]].map(([label, value]) => ({ label, value })) }),
          card(`<div style="font-family:${PF};font-size:84px;font-weight:700;line-height:1;color:${GOLD2}">84 %</div><div style="margin-top:16px">en los años 2020: la mejor década de su historia</div><div style="margin-top:18px;font-size:20px;color:${GOLD2}">El peor momento, en los 40: un 38 %.</div>`,
            920, 200, 300, 420, EM, { fontFamily: JO, fontSize: 25, color: CR, radius: 0, textAlign: 'center', vAlign: 'middle', borderColor: GOLD })],
          notes: 'Gráfico de área con el eje fijado de 0 a 100. La caída de los años 40 y la subida desde los 90 cuentan la historia del hotel.' },
        { layout: 'blank', bg: BLK, transition: 'push', extra: [
          frame(GOLD, 26),
          text('Escapada del centenario', 90, 64, 1100, 80, { fontFamily: PF, fontSize: 54, color: GOLD2, textAlign: 'center' }),
          text('Dos noches para dos personas · noviembre de 2026', 90, 142, 1100, 40, { fontFamily: JO, fontSize: 24, color: CR, textAlign: 'center', letterSpacing: 2 }),
          tableBlock({ x: 140, y: 210, w: 1000, h: 360, fontSize: 25, fontFamily: JO, color: CR, header: true, banded: true, headBg: GOLD, headFg: BLK, band: GOLD, bandAlpha: 0.12, stroke: '#5a4a1e', colW: [5, 2.4, 1.8, 2.6],
            rows: [['Concepto', 'Precio €', 'Uds.', 'Importe €'], ['Habitación doble de época', '100', '2', '=B2*C2'], ['Cena de gala en el salón', '85', '2', '=B3*C3'], ['Visita guiada al edificio', '12', '2', '=B4*C4'],
              ['Desayuno en la terraza', '18', '4', '=B5*C5'], ['<b>Total</b>', '', '', '=SUMA(D2:D5)']] }),
          text('Cien euros la noche: uno por cada año. Cambia las unidades y el total se recalcula.', 140, 590, 1000, 60, { fontFamily: JO, fontSize: 22, color: GOLD2, textAlign: 'center' })],
          notes: 'Tabla con fórmulas: cada importe multiplica precio por unidades y el total usa =SUMA. Precios inventados para el ejemplo.' },
        { layout: 'blank', bg: EM, transition: 'fade', extra: [
          E(60, 190, 340, 340, GOLD), E(76, 206, 308, 308, EM2),
          withAnims(text('GRAN HOTEL ALCÁZAR · DESDE 1926 · ', 86, 216, 288, 288, { curve: 100, fontFamily: JO, fontSize: 24, color: GOLD2, fontWeight: 700, letterSpacing: 3, textAlign: 'center' }),
            A('spin360', { start: 'afterPrev', duration: 5000 })),
          text('?', 130, 270, 200, 180, { fontFamily: PF, fontSize: 150, color: GOLD, textAlign: 'center', vAlign: 'middle' }),
          pollBlock({ kind: 'quiz', fontSize: 30, x: 440, y: 60, w: 780, h: 600, time: 20, correct: [1],
            question: '¿Cuántas habitaciones tenía el hotel cuando abrió?', options: ['94', '120', '214', '250'] })],
          notes: 'Concurso desde el móvil con puntos por rapidez. El sello de la izquierda es texto curvo que da una vuelta al llegar. La respuesta estaba en el panel del ascensor.' },
        { layout: 'blank', bg: BLK, transition: 'fade', autoAnimate: true, extra: [
          withId(deco(fan(), 380, 40, 520, 260, 'Abanico de rayos'), sun),
          R(240, 300, 800, 380, CR, { stroke: GOLD, strokeWidth: 6 }), R(258, 318, 764, 344, CR, { stroke: GOLD, strokeWidth: 1.5 }),
          text('Gala del centenario', 260, 336, 760, 90, { fontFamily: PF, fontSize: 60, color: EM, textAlign: 'center', fontWeight: 700 }),
          rule(440, 432, 400),
          text('Sábado 14 de noviembre · 20:30<br>Salón de baile · Etiqueta: años 20', 260, 466, 760, 100, { fontFamily: JO, fontSize: 28, color: INK, textAlign: 'center' }),
          text('Confirma tu asistencia: centenario@hotelalcazar.example', 260, 590, 760, 40, { fontFamily: JO, fontSize: 21, color: '#6b5a24', textAlign: 'center' })],
          notes: 'Cierre con Transformar: el abanico de la portada sube y corona la invitación (es el mismo objeto en las dos diapositivas).' },
      ]));
    } },

  // ============================================================================
  // 8 · Años 60, retrofuturismo: a museum show about the future imagined in 1962 — atomic stars, boomerangs, a saucer house.
  creative_retro_atomic: { name: 'Retrofuturismo: el futuro de 1962', cat: 'creative',
    summary: 'Era atómica: casa platillo que se transforma, aciertos y fallos en cadena, robot 3D que anda, radar, matriz, cuenta atrás y nube de palabras',
    make: () => {
      const CRM = '#f4ead5', TEAL = '#2a9d8f', ORG = '#e76f51', MUS = '#e9c46a', NAVY = '#264653', SKY = '#a8dadc', INK = '#1f2a30';
      const PAC = F('Pacifico'), POP = F('Poppins'), BEB = F('Bebas Neue'), house = uid();
      const star = (c, x, y, s, p = {}) => deco(svg(100, 100, `<path d="M50 0L54 46L100 50L54 54L50 100L46 54L0 50L46 46Z" fill="${c}"/><path d="M50 22L52 48L78 50L52 52L50 78L48 52L22 50L48 48Z" fill="${c}" transform="rotate(45 50 50)"/>`), x, y, s, s, 'Estrella atómica');
      const boom = (c, x, y, w, rot = 0) => deco(svg(200, 110, `<path d="M8 96C40 20 90 6 120 30C150 52 170 70 194 60C176 96 120 104 92 82C66 62 40 64 8 96Z" fill="${c}"/>`), x, y, w, w * 0.55, 'Bumerán');
      const saucer = svg(420, 330, `<path d="M150 230L110 320M270 230L310 320M210 236V320" stroke="${NAVY}" stroke-width="10" stroke-linecap="round"/><path d="M80 320H140M280 320H340M180 320H240" stroke="${NAVY}" stroke-width="8" stroke-linecap="round"/>`
        + `<ellipse cx="210" cy="170" rx="200" ry="74" fill="${CRM}" stroke="${NAVY}" stroke-width="6"/><path d="M90 120Q210 -4 330 120" fill="${MUS}" stroke="${NAVY}" stroke-width="6"/>`
        + [-120, -60, 0, 60, 120].map(dx => `<ellipse cx="${210 + dx}" cy="168" rx="22" ry="16" fill="${SKY}" stroke="${NAVY}" stroke-width="4"/>`).join('')
        + `<path d="M24 190Q210 270 396 190" fill="none" stroke="${ORG}" stroke-width="8"/><circle cx="210" cy="56" r="10" fill="${ORG}"/><line x1="210" y1="66" x2="210" y2="40" stroke="${NAVY}" stroke-width="4"/>`);
      const rocket = svg(120, 260, `<path d="M60 4C96 40 100 120 92 190H28C20 120 24 40 60 4Z" fill="${CRM}" stroke="${NAVY}" stroke-width="5"/><circle cx="60" cy="90" r="20" fill="${SKY}" stroke="${NAVY}" stroke-width="5"/>`
        + `<path d="M28 150L4 210L30 196ZM92 150L116 210L90 196Z" fill="${ORG}" stroke="${NAVY}" stroke-width="4"/><path d="M40 196L60 254L80 196Z" fill="${MUS}"/><path d="M50 196L60 230L70 196Z" fill="${ORG}"/>`);
      const preds = [['Videollamadas desde casa', 'Sí, y además en el bolsillo', true], ['Coches que vuelan', 'No: seguimos en el atasco', false],
        ['Comida en pastillas', 'No, y casi mejor así', false], ['Un robot que limpia', 'A medias: de momento, barre el suelo', true]];
      return numbered(build({ name: 'El futuro de 1962 · exposición', palette: 'forest', fonts: 'friendly', title: { color: ORG } }, [
        { layout: 'blank', bg: CRM, transition: 'fade', extra: [
          E(700, -160, 720, 720, SKY, { opacity: 70 }),
          boom(TEAL, 60, 600, 160, 0), boom(ORG, 560, 40, 110), boom(MUS, 1110, 620, 130),
          withId(img(saucer, 720, 150, 480, 377, 'Una casa con forma de platillo volante'), house),
          ...[[650, 90, 70, ORG], [1180, 120, 56, TEAL], [660, 520, 48, MUS], [1160, 470, 40, ORG]].map(([x, y, s, c], i) => at(star(c, x, y, s), 'pulse', { start: i ? 'withPrev' : 'afterPrev', duration: 1200 })),
          text('El futuro', 60, 120, 640, 160, { fontFamily: PAC, fontSize: 110, color: '#c4502f' }),
          text('DE 1962', 66, 280, 600, 160, { fontFamily: BEB, fontSize: 170, color: NAVY, letterSpacing: 6, lineHeight: 1 }),
          text('Lo que soñaron y lo que llegó · Exposición en la sala 3', 66, 460, 560, 90, { fontFamily: POP, fontSize: 26, color: INK })],
          notes: 'Portada de la era atómica: casa platillo, bumeranes y estrellas de cuatro puntas, todo dibujado en SVG. Las estrellas laten solas al llegar (efecto de énfasis «Latido»).' },
        { layout: 'blank', bg: '#fbf5e8', transition: 'slide', extra: [
          text('Lo que imaginaron', 60, 40, 560, 70, { fontFamily: BEB, fontSize: 56, color: NAVY, letterSpacing: 2 }),
          text('Lo que llegó', 700, 40, 520, 70, { fontFamily: BEB, fontSize: 56, color: TEAL, letterSpacing: 2 }),
          ...preds.flatMap(([a, b, ok], i) => { const y = 140 + i * 135;
            return [at(card(a, 60, y, 560, 110, MUS, { fontFamily: POP, fontSize: 27, color: INK, radius: 55, vAlign: 'middle', pad: [14, 36, 14, 36] }), 'fade-right', { start: i ? 'afterPrev' : 'click', duration: 350 }),
              at(E(632, y + 25, 60, 60, ok ? TEAL : ORG), 'zoom-in', { start: 'afterPrev', duration: 250, sound: 'pop' }), at(icon(ok ? 'check' : 'close', 644, y + 37, 36, '#ffffff'), 'zoom-in', { start: 'withPrev', duration: 250 }),
              at(card(b, 704, y, 516, 110, ok ? '#d6eeea' : '#fbe1d9', { fontFamily: POP, fontSize: 25, color: INK, radius: 55, vAlign: 'middle', pad: [14, 36, 14, 36] }), 'fade-left', { start: 'withPrev', duration: 350 })]; })],
          notes: 'Comparativa en cadena: con un clic entra cada predicción, luego su veredicto con un «pop» y lo que pasó de verdad. Las predicciones son las típicas de las revistas de divulgación de la época.' },
        { layout: 'blank', bg: NAVY, transition: 'slide', extra: [
          R(0, 0, 1280, 720, NAVY, { fill2: '#1b343d', gradAngle: 90 }),
          R(0, 600, 1280, 120, '#e9dcc0'), ...Array.from({ length: 16 }, (_, i) => R(i * 80, 600, 40, 120, '#d8c8a6')),
          text('El mayordomo robot', 60, 40, 740, 80, { fontFamily: PAC, fontSize: 58, color: MUS }),
          text('En 1962 lo esperaban para 1985. Sesenta años después sigue en camino.', 64, 140, 640, 90, { fontFamily: POP, fontSize: 26, color: CRM }),
          card('<b>Lo que prometían</b><br>Cocinar, planchar, cuidar a los niños y servir el té a las cinco.', 840, 40, 380, 210, '#ffffff14', { fontFamily: POP, fontSize: 24, color: CRM, borderColor: MUS, radius: 20 }),
          withAnims(m3d('three-RobotExpressive', 60, 280, 260, 330, { walk: { clip: lib3d('three-RobotExpressive').walk, end: lib3d('three-RobotExpressive').arrive, endOnce: true, face: true, look: true } }), path([[300, 0], [600, 0], [780, 0]], { duration: 5000 })),
          text('Clic: el robot cruza la cocina y saluda', 60, 660, 700, 40, { fontFamily: POP, fontSize: 20, color: '#5b4a2a' })],
          notes: 'Robot animado en 3D (biblioteca de modelos) que anda por un recorrido y saluda al llegar. Buen momento para preguntar qué tarea de casa le dejaría cada uno.' },
        { layout: 'blank', bg: CRM, transition: 'slide', extra: [
          text('¿Cuánto acertaron?', 60, 40, 700, 80, { fontFamily: BEB, fontSize: 66, color: NAVY, letterSpacing: 2 }),
          chartBlock({ x: 40, y: 120, w: 720, h: 570, chartType: 'radar', yMax: 10, labelColor: INK,
            color: ORG, seriesName: 'En 1962',
            data: [['Comunicación', 8], ['Transporte', 10], ['Hogar', 9], ['Comida', 8], ['Medicina', 7], ['Espacio', 10]].map(([label, value]) => ({ label, value })),
            series: [{ name: 'En 2026', values: [10, 4, 6, 5, 8, 4], color: TEAL }] }),
          ...chain([['Comunicación', 'Se quedaron cortos: nadie imaginó llevar un ordenador en el bolsillo.', TEAL], ['Transporte y espacio', 'Se pasaron: ni coches voladores ni vacaciones en la Luna.', ORG]].map(([h, d, c], i) =>
            card(`<b style="color:${c}">${h}</b><br>${d}`, 800, 170 + i * 240, 420, 210, '#ffffff', { fontFamily: POP, fontSize: 24, color: INK, radius: 20, borderColor: c })), 'fade-left', { duration: 400 })],
          notes: 'Radar con dos series y colores propios: puntuación de 0 a 10 que da el equipo de la exposición (inventada) a lo imaginado y a lo conseguido. Con un clic, las dos conclusiones.' },
        { layout: 'blank', bg: TEAL, transition: 'convex', extra: [
          text('Cuatro maneras de llegar al futuro', 60, 36, 1060, 80, { fontFamily: BEB, fontSize: 60, color: CRM, letterSpacing: 2 }),
          star(MUS, 1150, 40, 70),
          dg('matrix', 'Lo soñaron y llegó\n  Videollamadas · Cocina con microondas\nLo soñaron y no llegó\n  Coches voladores · Ciudades bajo el mar\nLlegó sin que nadie lo soñara\n  Internet · Mapas en el móvil\nLlegó distinto de lo soñado\n  Robots: en fábricas, no en casa',
            60, 130, 1160, 540, { colors: 'light', oneByOne: true, fontScale: 1.05 })],
          notes: 'Diagrama de matriz que aparece cuadrante a cuadrante. Pide ejemplos al público para cada casilla antes de mostrarla.' },
        { layout: 'blank', bg: NAVY, transition: 'zoom', extra: [
          ...[[90, 80, 40], [300, 520, 30], [1150, 90, 50], [1000, 560, 34], [560, 60, 28]].map(([x, y, s]) => star(CRM, x, y, s)),
          text('Cuenta atrás para el despegue', 60, 160, 640, 160, { fontFamily: PAC, fontSize: 56, color: MUS, lineHeight: 1.3 }),
          text('La visita guiada empieza al llegar a cero. Al terminar, un clic y el cohete despega.', 64, 360, 580, 120, { fontFamily: POP, fontSize: 26, color: CRM }),
          timer(10, 720, 190, 300, { color: ORG, auto: false }),
          withAnims(img(rocket, 1080, 400, 120, 260, 'Un cohete retro'), A('teeter', { duration: 600 }), path([[0, -200], [0, -760]], { start: 'afterPrev', duration: 1400, sound: 'whoosh' }))],
          notes: 'Cuenta atrás de diez segundos (se pulsa para empezar). Luego, un clic: el cohete tiembla y despega con un recorrido hacia arriba y el sonido «whoosh».' },
        { layout: 'blank', bg: CRM, transition: 'slide', extra: [
          boom(ORG, 1080, 20, 150), boom(TEAL, 1110, 600, 120),
          pollBlock({ kind: 'word', fontSize: 34, x: 80, y: 60, w: 1120, h: 580, question: '¿Qué invento del futuro sigues esperando?', options: [], color: NAVY })],
          notes: 'Nube de palabras en directo desde el móvil: las respuestas más repetidas se ven más grandes.' },
        { layout: 'blank', bg: '#1f7a70', transition: 'fade', autoAnimate: true, extra: [
          E(-200, 380, 760, 520, '#1a6b62'),
          withId(img(saucer, 90, 220, 400, 314, 'Una casa con forma de platillo volante'), house),
          text('Te esperamos en el futuro', 560, 120, 660, 170, { fontFamily: PAC, fontSize: 60, color: CRM, lineHeight: 1.3 }),
          text('Sala 3 · Museo de la Ciencia<br>Hasta el 31 de enero · Entrada libre', 564, 330, 640, 100, { fontFamily: POP, fontSize: 28, color: '#ffffff' }),
          text('futuro1962@museo.example', 564, 460, 640, 50, { fontFamily: POP, fontSize: 26, color: '#ffe08a', fontWeight: 700 }),
          star(MUS, 1130, 560, 80)],
          notes: 'Cierre con Transformar: la casa platillo de la portada aterriza a la izquierda (mismo objeto en las dos diapositivas).' },
      ]));
    } },

  // ============================================================================
  // 9 · Álbum sepia: a family history workshop — photo corners, a drawn map with a journey, a family tree.
  creative_retro_sepia: { name: 'Álbum sepia: busca a tus abuelos', cat: 'creative',
    summary: 'Álbum sepia: esquineros, letra a mano, ecuación de antepasados, árbol que crece, mapa con viaje dibujado, tarta, relacionar y Transformar',
    make: () => {
      const PAGE = '#3b2a1e', PAGE2 = '#2c1f16', CRM = '#efe3c8', SEP = '#7a5230', SEP2 = '#a67c52', INK = '#2a1d14', RED = '#8b2e1f', OLD = '#e6d3ad';
      const COR = F('Cormorant Garamond'), CAV = F('Caveat'), photo = uid();
      // A sepia family portrait: a vignette, a backdrop and five figures.
      const portrait = svg(400, 300, `<defs><radialGradient id="v" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#d9b98c"/><stop offset=".7" stop-color="#a67c52"/><stop offset="1" stop-color="#4a2f1a"/></radialGradient></defs>`
        + `<rect width="400" height="300" fill="url(#v)"/><path d="M0 220H400V300H0Z" fill="#6b4a2c" opacity=".55"/><path d="M40 0V220M360 0V220" stroke="#5a3b22" stroke-width="3" opacity=".4"/>`
        + [[90, 120, 22, 70, '#3d2716'], [150, 105, 24, 84, '#2f1d10'], [210, 112, 23, 78, '#4a2f1a'], [270, 104, 25, 86, '#2f1d10'], [325, 140, 17, 54, '#4a2f1a']]
          .map(([x, y, r, h, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#c49a6c"/><path d="M${x - r * 1.6} ${y + r + h + 40}Q${x - r * 1.8} ${y + r + 6} ${x} ${y + r + 4}Q${x + r * 1.8} ${y + r + 6} ${x + r * 1.6} ${y + r + h + 40}Z" fill="${c}"/>`).join(''));
      // The photo with its white deckled border and the four black corners.
      const mounted = (x, y, w, h, alt, rot = 0, id = uid()) => [img(svg(w, h, `<rect width="${w}" height="${h}" fill="#f6efe0"/>`), x, y, w, h, 'Borde de la foto', { decorative: true, rotation: rot, shadow: { x: 4, y: 6, blur: 10, color: '#00000066' } }),
        img(portrait, x + 18, y + 18, w - 36, h - 36, alt, { rotation: rot, fit: 'cover', id }),
        ...[[x - 8, y - 8, 0], [x + w - 42, y - 8, 90], [x + w - 42, y + h - 42, 180], [x - 8, y + h - 42, 270]].map(([cx, cy, r]) =>
          shape('custom', cx, cy, 50, 50, '#1a120c', { path: 'M0 0H100L0 100Z', rotation: r + rot }))];
      const corners = (x, y, w, h, c = '#1a120c') => [[x - 6, y - 6, 0], [x + w - 30, y - 6, 90], [x + w - 30, y + h - 30, 180], [x - 6, y + h - 30, 270]].map(([cx, cy, r]) => shape('custom', cx, cy, 36, 36, c, { path: 'M0 0H100L0 100Z', rotation: r }));
      const map = svg(820, 520, `<rect width="820" height="520" fill="${OLD}"/><path d="M0 0H330C350 80 300 120 340 200C380 280 320 360 360 440C372 470 360 500 370 520H0Z" fill="#d7bf8f" stroke="${SEP}" stroke-width="3"/>`
        + `<path d="M820 120C760 140 720 200 740 260C760 330 700 380 720 440C730 480 760 500 820 520Z" fill="#d7bf8f" stroke="${SEP}" stroke-width="3"/>`
        + Array.from({ length: 6 }, (_, i) => `<path d="M${420 + i * 40} ${80 + i * 70}q14 -10 28 0t28 0" fill="none" stroke="${SEP2}" stroke-width="2"/>`).join('')
        + `<g fill="${INK}" font-family="Georgia,serif" font-style="italic"><text x="24" y="212" font-size="22">Valdeolmos</text><text x="200" y="400" font-size="22">Puerto Alba</text><text x="610" y="470" font-size="22">Nueva Aurora</text></g>`
        + `<circle cx="120" cy="160" r="8" fill="${RED}"/><circle cx="290" cy="370" r="8" fill="${RED}"/><circle cx="720" cy="430" r="8" fill="${RED}"/>`
        + `<g transform="translate(740 70)"><circle r="34" fill="none" stroke="${SEP}" stroke-width="2"/><path d="M0 -40L7 0L0 40L-7 0Z" fill="${SEP}"/><text y="-46" text-anchor="middle" font-size="16" fill="${SEP}" font-family="Georgia,serif">N</text></g>`);
      const sources = [['book-open', 'Archivo parroquial', 'Bautismos, bodas y defunciones desde el siglo XVI.'], ['scale', 'Registro Civil', 'Nacimientos y matrimonios desde 1871.'],
        ['users', 'Padrones municipales', 'Quién vivía en cada casa, con su oficio y su edad.'], ['file-text', 'Archivo militar', 'Los expedientes de quintas: altura, oficio y señas.']];
      return numbered(build({ name: 'Taller de genealogía · Busca a tus abuelos', palette: 'paper', fonts: 'classic', title: { color: CRM } }, [
        { layout: 'blank', bg: PAGE, transition: 'fade', extra: [
          deco(svg(1280, 720, Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 211) % 1280}" cy="${(i * 137) % 720}" r="${1 + (i % 3)}" fill="#ffffff" opacity=".05"/>`).join('')), 0, 0, 1280, 720, 'Textura del álbum'),
          ...mounted(90, 120, 500, 390, 'Retrato de familia en sepia, hacia 1920', -4, photo),
          text('Valdeolmos, 1921', 120, 560, 440, 60, { fontFamily: CAV, fontSize: 40, color: OLD, textAlign: 'center', rotation: -3 }),
          text('TALLER DE GENEALOGÍA', 680, 150, 540, 40, { fontFamily: COR, fontSize: 28, color: SEP2, letterSpacing: 6, fontWeight: 700 }),
          text('Busca a tus abuelos', 676, 200, 560, 230, { fontFamily: CAV, fontSize: 104, color: CRM, lineHeight: 1 }),
          R(680, 440, 160, 3, SEP2),
          text('Archivo municipal · cuatro sábados de noviembre, de 10:00 a 12:00', 680, 466, 520, 90, { fontFamily: COR, fontSize: 28, color: OLD })],
          notes: 'Portada como página de álbum: foto sepia con borde blanco y esquineros negros (dibujos SVG y triángulos), y pie escrito a mano. La familia y el pueblo son inventados.' },
        { layout: 'blank', bg: CRM, transition: 'fade', extra: [
          text('¿Cuántos antepasados tienes?', 60, 40, 1160, 80, { fontFamily: COR, fontSize: 58, color: INK, fontWeight: 700 }),
          text('Cada generación hacia atrás duplica la anterior: dos padres, cuatro abuelos, ocho bisabuelos…', 64, 122, 1100, 40, { fontFamily: COR, fontSize: 28, color: SEP }),
          ...[1, 2, 4, 8, 16, 32].map((n, g) => { const d = n > 8 ? 12 : 22, gap = Math.min(30, 440 / n), w0 = gap * (n - 1) + d;
            return at(deco(svg(Math.ceil(w0), d, Array.from({ length: n }, (_, k) => `<circle cx="${d / 2 + k * gap}" cy="${d / 2}" r="${d / 2 - 1}" fill="${g ? SEP : RED}"/>`).join('')), 440 - w0 / 2, 210 + g * 52, w0, d, `Generación ${g}`),
              'fade-in', { start: g ? 'afterPrev' : 'click', duration: 250 }); }),
          ...['Tú', 'Padres', 'Abuelos', 'Bisabuelos', 'Tatarabuelos', '5.ª generación'].map((l, g) => text(l, 60, 198 + g * 52, 140, 40, { fontFamily: COR, fontSize: 22, color: INK, fontWeight: 700 })),
          R(680, 200, 540, 300, '#f7efdc', { stroke: SEP2, strokeWidth: 2 }),
          mathBlock({ x: 700, y: 230, w: 500, h: 110, fontSize: 40, color: INK, latex: 'A_n = 2^{\\,n}' }),
          mathBlock({ x: 700, y: 350, w: 500, h: 110, fontSize: 34, color: RED, latex: 'A_{10} = 2^{10} = 1024' }),
          text('En diez generaciones (unos 300 años) tienes más de mil antepasados directos. Y muchos se repiten: los pueblos eran pequeños.', 680, 530, 540, 140, { fontFamily: COR, fontSize: 26, color: INK })],
          notes: 'Las filas de puntos se duplican con un clic, una tras otra. Las ecuaciones (Insertar ▸ Ecuación) dan la regla: 2 elevado al número de generaciones.' },
        { layout: 'blank', bg: PAGE, transition: 'slide', extra: [
          R(50, 30, 1180, 660, CRM, { shadow: { x: 4, y: 6, blur: 14, color: '#00000066' } }), ...corners(50, 30, 1180, 660),
          text('El árbol de la familia Ruiz', 100, 52, 1080, 70, { fontFamily: CAV, fontSize: 56, color: INK, textAlign: 'center' }),
          dg('hierarchy', 'Lucía Ruiz Soto\n  Elena · madre\n    Tomás · 1921\n    Carmen · 1924\n  Andrés · padre\n    Julián · 1918\n    Rosa · 1926', 90, 140, 1100, 520,
            { colors: 'outline', oneByOne: true, fontScale: 1.25, textColor: INK })],
          notes: 'Diagrama de jerarquía que crece rama a rama: se empieza por la persona que investiga y se sube hacia atrás. Nombres inventados.' },
        { layout: 'blank', bg: PAGE, transition: 'slide', extra: [
          img(map, 40, 40, 820, 520, 'Mapa dibujado de la costa con tres lugares', { shadow: { x: 4, y: 6, blur: 14, color: '#00000066' } }), ...corners(40, 40, 820, 520),
          at(shape('custom', 160, 200, 600, 270, 'none', { path: 'M0 0C10 40 20 70 28 78C40 86 60 88 80 90C90 92 96 96 100 100', stroke: RED, strokeWidth: 4, dash: 'dash' }), 'draw', { start: 'click', duration: 3000 }),
          withAnims(icon('briefcase', 136, 176, 46, INK), path([[60, 120], [171, 211], [300, 236], [450, 250], [601, 271]], { start: 'withPrev', duration: 3000 })),
          text('El viaje de Tomás', 900, 60, 340, 80, { fontFamily: CAV, fontSize: 52, color: CRM }),
          ...chain([['Marzo de 1923', 'Sale de Valdeolmos a pie con una maleta.'], ['Abril de 1923', 'Embarca en Puerto Alba: veintidós días de travesía.'], ['1931', 'Vuelve con ahorros y compra la casa del molino.']].map(([h, d], i) =>
            text(`<b style="color:${SEP2}">${h}</b><br>${d}`, 900, 170 + i * 130, 340, 120, { fontFamily: COR, fontSize: 25, color: OLD })), 'fade-in', { duration: 400 }, 'afterPrev'),
          text('Mapa dibujado a partir de su pasaporte y de dos cartas', 40, 590, 820, 40, { fontFamily: CAV, fontSize: 28, color: OLD, textAlign: 'center' })],
          notes: 'Un clic: la ruta se dibuja sobre el mapa (efecto «Dibujar») mientras la maleta sigue un recorrido; luego aparecen las tres fechas. Mapa y viaje inventados.' },
        { layout: 'blank', bg: CRM, transition: 'slide', extra: [
          text('Dónde buscar', 60, 36, 800, 80, { fontFamily: COR, fontSize: 60, color: INK, fontWeight: 700 }),
          text('Cuatro archivos y una regla de oro: anota siempre de dónde sale cada dato.', 64, 116, 1100, 40, { fontFamily: COR, fontSize: 27, color: SEP }),
          ...sources.flatMap(([ic, h, d], i) => { const x = 60 + (i % 2) * 590, y = 190 + Math.floor(i / 2) * 250;
            return chain([R(x, y, 560, 220, '#fbf6ea', { shadow: { x: 3, y: 5, blur: 10, color: '#00000033' } }), icon(ic, x + 30, y + 36, 56, SEP),
              text(`<b>${h}</b><div style="font-size:23px;line-height:1.35;color:${SEP};margin-top:8px">${d}</div>`, x + 110, y + 30, 420, 170, { fontFamily: COR, fontSize: 32, color: INK })], 'fade-in', { duration: 350 }, i ? 'afterPrev' : 'click')
              .map((b, k) => (k ? { ...b, animation: { ...b.animation, start: 'withPrev' } } : b)); }),
          ...[0, 1, 2, 3].flatMap(i => corners(60 + (i % 2) * 590, 190 + Math.floor(i / 2) * 250, 560, 220, SEP))],
          notes: 'Cuatro fichas pegadas en el álbum, que entran una tras otra con un clic. Las fechas son las habituales en España, pero cada archivo tiene las suyas.' },
        { layout: 'blank', bg: PAGE, transition: 'slide', extra: [
          text('Lo que encontró el grupo del año pasado', 60, 36, 1160, 70, { fontFamily: COR, fontSize: 50, color: CRM, fontWeight: 700 }),
          text('960 documentos, según de dónde salieron (datos del ejemplo)', 64, 106, 1100, 40, { fontFamily: COR, fontSize: 26, color: '#d2b48c' }),
          chartBlock({ x: 60, y: 160, w: 760, h: 520, chartType: 'pie', color: SEP, labelColor: CRM,
            data: [{ label: 'Parroquias', value: 412, color: '#7a5230' }, { label: 'Registro Civil', value: 268, color: '#946640' }, { label: 'Padrones', value: 154, color: '#a67c52' }, { label: 'Archivo militar', value: 61, color: '#8b2e1f' },
              { label: 'Prensa antigua', value: 38, color: '#3d2716' }, { label: 'Notarías', value: 27, color: '#c9ab78' }] }),
          R(860, 200, 360, 440, '#efe3c8', { shadow: { x: 4, y: 6, blur: 14, color: '#00000066' } }), ...corners(860, 200, 360, 440),
          text('43 %', 880, 240, 320, 130, { fontFamily: COR, fontSize: 110, color: RED, textAlign: 'center', fontWeight: 700 }),
          text('de los datos salieron de los libros de las parroquias: empieza siempre por ahí.', 890, 390, 300, 200, { fontFamily: COR, fontSize: 28, color: INK, textAlign: 'center' })],
          notes: 'Tarta con un tono sepia propio en cada porción y leyenda automática con porcentajes. Las parroquias dan casi la mitad de los datos.' },
        { layout: 'blank', bg: CRM, transition: 'fade', extra: [
          pollBlock({ kind: 'match', fontSize: 30, x: 80, y: 50, w: 1120, h: 620, color: INK, question: 'Une cada abreviatura antigua con su significado',
            options: ['D.ª = Doña', 'Vda. = Viuda', 'Pbro. = Presbítero', 'h. l. = Hijo legítimo', 'nat. = Natural de'] })],
          notes: 'Actividad «Unir parejas» desde el móvil: son abreviaturas que aparecen en casi todas las partidas antiguas. Al acabar, un clic muestra la solución.' },
        { layout: 'blank', bg: PAGE, transition: 'fade', extra: [
          R(170, 60, 940, 560, OLD, { rotation: 1.5, shadow: { x: 6, y: 8, blur: 16, color: '#00000088' } }),
          E(880, 420, 160, 140, '#c9ab78', { opacity: 50 }),
          text('Nueva Aurora, 9 de mayo de 1923', 640, 90, 420, 50, { fontFamily: CAV, fontSize: 32, color: SEP, textAlign: 'right', rotation: 1.5 }),
          text('Querida madre: llegamos bien, aunque el barco se movía tanto que el pan no paraba quieto en la mesa. Ya tengo trabajo en el puerto. Guárdeme la higuera del corral, que vuelvo.',
            230, 160, 820, 330, { fontFamily: CAV, fontSize: 40, color: INK, lineHeight: 1.3, rotation: 1.5 }),
          text('Su hijo, Tomás', 640, 510, 400, 60, { fontFamily: CAV, fontSize: 40, color: INK, textAlign: 'right', rotation: 1.5 }),
          text('Una carta encontrada en una caja de zapatos (texto inventado)', 60, 650, 1160, 40, { fontFamily: COR, fontSize: 22, color: SEP2, textAlign: 'center' })],
          notes: 'Una carta escrita a mano sobre papel envejecido, con una mancha de humedad. Léela en voz alta: las cartas cuentan lo que los registros no dicen.' },
        { layout: 'blank', bg: PAGE, transition: 'fade', autoAnimate: true, extra: [
          withId(img(portrait, 400, 60, 480, 360, 'Retrato de familia en sepia, hacia 1920', { fit: 'cover', shadow: { x: 4, y: 6, blur: 14, color: '#00000088' } }), photo),
          text('Trae tus fotos y tus papeles viejos', 140, 450, 1000, 80, { fontFamily: CAV, fontSize: 60, color: CRM, textAlign: 'center' }),
          text('Primer sábado: 7 de noviembre · Sala de lectura del archivo municipal', 140, 540, 1000, 50, { fontFamily: COR, fontSize: 28, color: OLD, textAlign: 'center' }),
          text('genealogia@archivo.example', 140, 600, 1000, 50, { fontFamily: COR, fontSize: 28, color: SEP2, textAlign: 'center', fontWeight: 700 })],
          notes: 'Cierre con Transformar: el retrato de la portada se endereza, crece y se coloca en el centro (mismo objeto en las dos diapositivas).' },
      ]));
    } },

  // ============================================================================
  // 10 · Cartel de imprenta: neighbourhood fiestas told as a wood-type poster — misregistered inks, ornaments, a proclamation.
  creative_retro_letterpress: { name: 'Cartel de imprenta: fiestas del barrio', cat: 'creative',
    summary: 'Cartel de tipos de madera: tinta desplazada, letras que caen con sonido, programa, barras apiladas, cascada, bando, votación y cuenta atrás',
    make: () => {
      const PAP = '#f1e6cf', RED = '#c1272d', BLK = '#1b1a17', BLUE = '#1f3f73', GREY = '#7d725d', MUS = '#d9a227';
      const ANT = F('Anton'), PTS = F('PT Serif'), word = uid();
      // Wood type: the black letter with a red copy slightly out of register behind it.
      const inked = (t, x, y, w, h, size, color = BLK, p = {}) => [text(t, x + 4, y + 3, w, h, { fontFamily: ANT, fontSize: size, color: RED, opacity: 85, ...p }), text(t, x, y, w, h, { fontFamily: ANT, fontSize: size, color, ...p })];
      const orn = (x, y, w, c = BLK) => deco(svg(w, 30, `<line x1="0" y1="15" x2="${w / 2 - 70}" y2="15" stroke="${c}" stroke-width="3"/><line x1="${w / 2 + 70}" y1="15" x2="${w}" y2="15" stroke="${c}" stroke-width="3"/>`
        + [-46, 0, 46].map(dx => `<path d="M${w / 2 + dx} 3L${w / 2 + dx + 4} 12L${w / 2 + dx + 13} 15L${w / 2 + dx + 4} 18L${w / 2 + dx} 27L${w / 2 + dx - 4} 18L${w / 2 + dx - 13} 15L${w / 2 + dx - 4} 12Z" fill="${c}"/>`).join('')), x, y, w, 30, 'Adorno tipográfico');
      const border = (c = BLK) => deco(svg(1280, 720, `<rect x="30" y="30" width="1220" height="660" fill="none" stroke="${c}" stroke-width="8"/><rect x="46" y="46" width="1188" height="628" fill="none" stroke="${c}" stroke-width="2"/>`), 0, 0, 1280, 720, 'Doble filete');
      const paper = deco(svg(1280, 720, (() => { const r = rng(11); return Array.from({ length: 220 }, () => `<circle cx="${Math.round(r() * 1280)}" cy="${Math.round(r() * 720)}" r="${(r() * 1.6 + 0.4).toFixed(1)}" fill="#8a6d3b" opacity="${(r() * 0.18).toFixed(2)}"/>`).join(''); })()), 0, 0, 1280, 720, 'Grano del papel');
      const days = [['VIERNES 14', RED, ['20:00 Pregón desde el balcón', '21:00 Chupinazo', '23:30 Orquesta en la plaza']], ['SÁBADO 15', BLUE, ['11:00 Gigantes y cabezudos', '14:00 Paella popular', '22:00 Verbena']],
        ['DOMINGO 16', RED, ['10:00 Carrera de sacos', '13:00 Concurso de tortillas', '19:00 Teatro en la calle']], ['LUNES 17', BLUE, ['12:00 Misa y procesión', '18:00 Chocolatada', '23:00 Fuegos artificiales']]];
      return numbered(build({ name: 'Fiestas de San Roque · cartel', palette: 'office', fonts: 'bold', title: { color: BLK } }, [
        { layout: 'blank', bg: PAP, transition: 'fade', extra: [
          paper, border(),
          ...chain([text('GRANDES', 90, 72, 1100, 90, { fontFamily: ANT, fontSize: 72, color: RED, textAlign: 'center', letterSpacing: 18 }),
            withId(text('FIESTAS', 90, 160, 1100, 230, { fontFamily: ANT, fontSize: 210, color: BLK, textAlign: 'center', lineHeight: 1, shadow: { x: 7, y: 5, blur: 0, color: RED + 'd9' } }), word),
            text('del barrio de San Roque', 90, 396, 1100, 70, { fontFamily: PTS, fontSize: 48, color: BLK, textAlign: 'center', fontStyle: 'italic' })], 'fade-down', { duration: 250, delay: 150, sound: 'click' }, 'afterPrev'),
          orn(340, 482, 600),
          text('DEL 14 AL 17 DE AGOSTO DE 2026', 90, 528, 1100, 70, { fontFamily: ANT, fontSize: 50, color: BLUE, textAlign: 'center', letterSpacing: 4 }),
          text('Organiza la Comisión de Fiestas · Colaboran las peñas y el comercio del barrio', 90, 610, 1100, 40, { fontFamily: PTS, fontSize: 22, color: GREY, textAlign: 'center' })],
          notes: 'Portada como un cartel de imprenta de tipos de madera: papel con grano, doble filete, adornos y tinta roja ligeramente desplazada bajo la negra. Las tres líneas caen solas, cada una con su golpe de prensa.' },
        { layout: 'blank', bg: PAP, transition: 'push', extra: [
          paper, border(),
          ...inked('PROGRAMA DE FESTEJOS', 90, 70, 1100, 90, 66, BLK, { textAlign: 'center' }),
          orn(340, 166, 600),
          ...days.flatMap(([d, c, items], i) => { const x = 80 + i * 285;
            return [...(i ? [R(x - 12, 220, 3, 420, BLK)] : []),
              ...chain([text(d, x, 214, 260, 60, { fontFamily: ANT, fontSize: 38, color: c, textAlign: 'center' }),
                text(items.map(s => { const [h, ...r] = s.split(' '); return `<b style="font-family:${ANT};font-weight:400;font-size:28px;color:${BLK}">${h}</b><br>${r.join(' ')}`; }).join('<br><br>'), x + 6, 290, 250, 360, { fontFamily: PTS, fontSize: 23, color: BLK, textAlign: 'center' })],
              'fade-down', { duration: 300 }, i ? 'afterPrev' : 'click').map((b, k) => (k ? { ...b, animation: { ...b.animation, start: 'withPrev' } } : b))]; })],
          notes: 'El programa en cuatro columnas de imprenta. Un clic y los días entran uno tras otro, como si se fueran componiendo.' },
        { layout: 'blank', bg: PAP, transition: 'push', extra: [
          paper,
          R(0, 0, 1280, 120, BLK), text('¿QUIÉN VIENE A LAS FIESTAS?', 60, 0, 1160, 120, { fontFamily: ANT, fontSize: 60, color: PAP, vAlign: 'middle', letterSpacing: 3 }),
          chartBlock({ x: 60, y: 150, w: 780, h: 540, chartType: 'stacked', grid: true, labelColor: BLK, yTitle: 'Personas', dataLabels: false,
            color: BLUE, seriesName: 'Vecinos',
            data: [['Viernes', 1400], ['Sábado', 2100], ['Domingo', 1900], ['Lunes', 1200]].map(([label, value]) => ({ label, value })),
            series: [{ name: 'Visitantes', values: [600, 1500, 1100, 300], color: RED }] }),
          ...inked('10.100', 880, 200, 360, 130, 100, BLK, { textAlign: 'center' }),
          text('personas pasaron por la plaza el año pasado en los cuatro días', 890, 350, 340, 110, { fontFamily: PTS, fontSize: 26, color: BLK, textAlign: 'center' }),
          orn(900, 480, 320),
          text('El sábado se llena: uno de cada tres asistentes viene de fuera.', 890, 530, 340, 120, { fontFamily: PTS, fontSize: 24, color: GREY, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Barras apiladas con dos series: vecinos y visitantes por día. Recuento aproximado de la comisión (datos del ejemplo).' },
        { layout: 'blank', bg: PAP, transition: 'push', extra: [
          paper, border(BLUE),
          ...inked('LAS CUENTAS CLARAS', 80, 64, 1120, 90, 62, BLUE, { textAlign: 'center' }),
          text('Ingresos y gastos de las fiestas, en euros', 80, 150, 1120, 40, { fontFamily: PTS, fontSize: 24, color: GREY, textAlign: 'center', fontStyle: 'italic' }),
          chartBlock({ x: 90, y: 200, w: 1100, h: 460, chartType: 'waterfall', color: BLUE, dataLabels: true, grid: true, labelColor: BLK,
            data: [{ label: 'Ayudas', value: 18000 }, { label: 'Peñas', value: 6500 }, { label: 'Barra', value: 9200 }, { label: 'Orquestas', value: -14000 }, { label: 'Fuegos', value: -7500 },
              { label: 'Seguridad', value: -6800 }, { label: 'Imprenta', value: -1200 }, { label: 'Total sobrante', value: 0 }] })],
          notes: 'Gráfico de cascada: cada barra parte de donde terminó la anterior y la última («Total…») se calcula sola. Sobran 4.200 € para el año que viene. Cifras del ejemplo.' },
        { layout: 'blank', bg: '#e9dcc0', transition: 'fade', extra: [
          paper,
          R(150, 40, 980, 640, PAP, { shadow: { x: 5, y: 7, blur: 14, color: '#00000044' } }),
          deco(svg(980, 640, `<rect x="16" y="16" width="948" height="608" fill="none" stroke="${BLK}" stroke-width="3"/><rect x="26" y="26" width="928" height="588" fill="none" stroke="${BLK}" stroke-width="1"/>`), 150, 40, 980, 640, 'Marco del bando'),
          text('BANDO', 190, 60, 900, 124, { fontFamily: ANT, fontSize: 88, color: RED, textAlign: 'center', letterSpacing: 16 }),
          text('La Comisión de Fiestas hace saber:', 190, 184, 900, 50, { fontFamily: PTS, fontSize: 30, color: BLK, textAlign: 'center', fontStyle: 'italic' }),
          orn(390, 240, 500),
          ...chain(['<b>1.º</b> Que la plaza se cierra al tráfico del jueves por la noche al martes por la mañana.', '<b>2.º</b> Que los vasos son reutilizables: se devuelven en la barra y se recupera el euro.',
            '<b>3.º</b> Que a partir de la una de la madrugada la música baja, por respeto al vecindario.', '<b>4.º</b> Que en la paella popular cada cual trae su plato y su cuchara.'].map((s, i) =>
            text(s, 230, 290 + i * 88, 820, 80, { fontFamily: PTS, fontSize: 25, color: BLK })), 'fade-in', { duration: 400 })],
          notes: 'Un bando a la antigua: cuatro avisos que aparecen uno tras otro con un solo clic. Léelos con tono de pregonero.' },
        { layout: 'blank', bg: PAP, transition: 'push', extra: [
          paper, R(0, 0, 1280, 14, RED), R(0, 706, 1280, 14, RED),
          pollBlock({ kind: 'choice', fontSize: 32, x: 80, y: 50, w: 1120, h: 620, color: BLK, question: '¿Qué cartel imprimimos este año?',
            options: ['A · Tipos de madera en rojo y negro', 'B · Gigantes y cabezudos dibujados a plumilla', 'C · Fotografía antigua de la plaza', 'D · Farolillos de colores'] })],
          notes: 'Votación en directo desde el móvil: el cartel ganador se imprime en la imprenta del barrio para pegar en los portales.' },
        { layout: 'blank', bg: BLK, transition: 'zoom', extra: [
          deco(svg(1280, 720, Array.from({ length: 24 }, (_, i) => { const a = Math.PI * 2 * i / 24; return `<path d="M640 360L${640 + 1000 * Math.cos(a)} ${360 + 1000 * Math.sin(a)}L${640 + 1000 * Math.cos(a + 0.13)} ${360 + 1000 * Math.sin(a + 0.13)}Z" fill="${RED}" opacity=".18"/>`; }).join('')), 0, 0, 1280, 720, 'Rayos'),
          text('¡CHUPINAZO!', 60, 80, 700, 170, { fontFamily: ANT, fontSize: 110, wordart: 'retro', textAlign: 'center' }),
          text('El viernes 14 a las 21:00 en punto, desde el balcón de la plaza. Ensayamos la cuenta atrás: un minuto.', 90, 290, 640, 160, { fontFamily: PTS, fontSize: 30, color: PAP }),
          timer(60, 820, 160, 380, { color: MUS, auto: false, style: 'ring' }),
          text('Pulsa el reloj para empezar', 820, 560, 380, 40, { fontFamily: PTS, fontSize: 22, color: '#c8bba0', textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Text Art «Retro» para el chupinazo y una cuenta atrás de un minuto en anillo, con sonido al terminar. Pide al público que cuente en voz alta los últimos diez segundos.' },
        { layout: 'blank', bg: PAP, transition: 'fade', autoAnimate: true, extra: [
          paper, border(RED),
          text('¡FELICES', 90, 56, 1100, 136, { fontFamily: ANT, fontSize: 100, color: RED, textAlign: 'center', letterSpacing: 6 }),
          withId(text('FIESTAS', 90, 200, 1100, 230, { fontFamily: ANT, fontSize: 210, color: BLK, textAlign: 'center', lineHeight: 1, shadow: { x: 7, y: 5, blur: 0, color: RED + 'd9' } }), word),
          orn(340, 450, 600, RED),
          text('Comisión de Fiestas de San Roque · fiestas@sanroque.example', 90, 500, 1100, 50, { fontFamily: PTS, fontSize: 28, color: BLK, textAlign: 'center' }),
          text('Impreso en la imprenta del barrio, como siempre.', 90, 570, 1100, 40, { fontFamily: PTS, fontSize: 22, color: GREY, textAlign: 'center', fontStyle: 'italic' })],
          notes: 'Cierre con Transformar: la palabra FIESTAS de la portada baja a su sitio y le sale encima el «¡FELICES».' },
      ]));
    } },
};
