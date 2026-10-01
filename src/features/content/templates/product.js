// Example presentations: Producto y tecnología. Each one: { name, summary, cat: 'product', make() } → a deck
// (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (made-up screens for the devices).
const svgURL = (w, h, inner, bg = '#ffffff') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${inner}</svg>`);
const T = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
// An image inside a device (phone, tablet, laptop, monitor, browser).
const device = (src, kind, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', device: kind, ...props });
// The credits of the CC BY models of a deck, in one small line (instead of a caption under each one).
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 40, { fontSize: 12, color });
// A 3D model without its caption (its credit goes on the last slide).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
// Neon text in any colour (the Text Art «Neón» preset is blue).
const neon = (str, c) => `<span style="color:#ffffff;text-shadow:0 0 6px ${c},0 0 16px ${c},0 0 32px ${c}">${str}</span>`;
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:8px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 90), { fontSize: 24, color: fg, ...props });

// A habits app on the phone: rings of progress and today's list.
const habitScreen = (brand, warm) => svgURL(360, 720,
  `<rect width="360" height="200" fill="${brand}"/>` + T(24, 62, 18, '#ffffffcc', 'Martes, 14 de octubre') + T(24, 104, 34, '#ffffff', 'Hola, Irene', ' font-weight="700"')
  + [0, 1, 2].map(i => { const cx = 70 + i * 110, c = [warm, '#ffd166', '#06d6a0'][i], pct = [0.8, 0.55, 0.95][i], r = 34, L = 2 * Math.PI * r;
    return `<circle cx="${cx}" cy="250" r="44" fill="#ffffff"/><circle cx="${cx}" cy="250" r="${r}" fill="none" stroke="#eceaf6" stroke-width="9"/>`
      + `<circle cx="${cx}" cy="250" r="${r}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(L * pct).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 ${cx} 250)"/>`
      + T(cx, 256, 16, '#333', Math.round(pct * 100) + '%', ' text-anchor="middle" font-weight="700"'); }).join('')
  + T(24, 340, 20, '#222', 'Hoy', ' font-weight="700"')
  + [['Beber 2 litros de agua', warm, 1], ['Leer 20 minutos', '#ffd166', 1], ['Paseo de 30 minutos', '#06d6a0', 0], ['Meditar 5 minutos', brand, 0]].map(([t, c, done], i) => { const y = 360 + i * 84;
    return `<rect x="20" y="${y}" width="320" height="70" rx="16" fill="#ffffff" stroke="#e6e4f0"/><circle cx="54" cy="${y + 35}" r="15" fill="${done ? c : 'none'}" stroke="${c}" stroke-width="3"/>`
      + (done ? `<path d="M47 ${y + 35}l5 5 9-10" stroke="#fff" stroke-width="3" fill="none"/>` : '') + T(84, y + 41, 17, '#333', t); }).join('')
  + `<rect x="0" y="664" width="360" height="56" fill="#ffffff"/>` + [0, 1, 2, 3].map(i => `<circle cx="${60 + i * 80}" cy="692" r="10" fill="${i ? '#c9c6d9' : brand}"/>`).join(''), '#f6f5fb');
// Its weekly summary, wide (tablet and laptop).
const habitWide = (brand, warm, w, h) => svgURL(w, h,
  `<rect width="${w}" height="${h * 0.14}" fill="${brand}"/>` + T(w * 0.04, h * 0.09, h * 0.05, '#fff', 'Hábito · Resumen semanal', ' font-weight="700"')
  + ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => { const bw = w * 0.07, x = w * 0.06 + i * w * 0.085, v = [0.6, 0.8, 0.7, 0.95, 0.5, 0.85, 0.9][i], bh = h * 0.45 * v, y0 = h * 0.8;
    return `<rect x="${x}" y="${y0 - bh}" width="${bw}" height="${bh}" rx="${bw * 0.18}" fill="${i === 3 ? warm : brand}" opacity="${i === 3 ? 1 : 0.75}"/>` + T(x + bw / 2, h * 0.87, h * 0.04, '#666', d, ' text-anchor="middle"'); }).join('')
  + `<rect x="${w * 0.66}" y="${h * 0.22}" width="${w * 0.3}" height="${h * 0.26}" rx="${h * 0.03}" fill="#fff" stroke="#e6e4f0"/>` + T(w * 0.68, h * 0.3, h * 0.035, '#777', 'Racha actual')
  + T(w * 0.68, h * 0.42, h * 0.09, warm, '23 días', ' font-weight="700"')
  + `<rect x="${w * 0.66}" y="${h * 0.54}" width="${w * 0.3}" height="${h * 0.26}" rx="${h * 0.03}" fill="#fff" stroke="#e6e4f0"/>` + T(w * 0.68, h * 0.62, h * 0.035, '#777', 'Hábitos cumplidos')
  + T(w * 0.68, h * 0.74, h * 0.09, brand, '86 %', ' font-weight="700"'), '#f6f5fb');

// An analytics dashboard (SaaS) for the browser window.
const dashScreen = (w = 1280, h = 760) => svgURL(w, h,
  `<rect width="220" height="${h}" fill="#111827"/>` + T(28, 52, 28, '#2ac3de', '◆ Pulso', ' font-weight="700"')
  + ['Resumen', 'Embudo', 'Clientes', 'Ingresos', 'Alertas', 'Ajustes'].map((t, i) => (i === 0 ? `<rect x="16" y="${92 + i * 52}" width="188" height="40" rx="8" fill="#1f2a44"/>` : '') + T(36, 118 + i * 52, 18, i ? '#8b93a7' : '#ffffff', t)).join('')
  + T(252, 56, 26, '#e6e9ef', 'Resumen · últimos 30 días', ' font-weight="700"')
  + [['Usuarios activos', '48.210', '+12 %', '#7aa2f7'], ['Conversión', '3,8 %', '+0,6 pt', '#9ece6a'], ['Ingresos (MRR)', '182 k€', '+9 %', '#bb9af7'], ['Cancelaciones', '1,9 %', '−0,4 pt', '#e0af68']].map(([l, v, d, c], i) => { const x = 252 + i * 252;
    return `<rect x="${x}" y="88" width="232" height="130" rx="14" fill="#161d2e"/>` + T(x + 20, 122, 16, '#8b93a7', l) + T(x + 20, 174, 38, '#ffffff', v, ' font-weight="700"') + T(x + 20, 202, 15, c, d); }).join('')
  + `<rect x="252" y="240" width="640" height="${h - 272}" rx="14" fill="#161d2e"/>` + T(276, 276, 18, '#e6e9ef', 'Usuarios activos por día')
  + (() => { const pts = Array.from({ length: 30 }, (_, i) => [276 + i * 20.5, h - 70 - (120 + 90 * Math.sin(i / 4) + i * 6 + (i % 3) * 14)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join(' ');
    return `<path d="${d} L${pts.at(-1)[0].toFixed(0)} ${h - 50} L276 ${h - 50} Z" fill="#7aa2f7" opacity="0.18"/><path d="${d}" fill="none" stroke="#7aa2f7" stroke-width="4"/>`; })()
  + `<rect x="912" y="240" width="340" height="${h - 272}" rx="14" fill="#161d2e"/>` + T(936, 276, 18, '#e6e9ef', 'Por canal')
  + [['Orgánico', 0.82, '#9ece6a'], ['Anuncios', 0.58, '#7aa2f7'], ['Referidos', 0.41, '#bb9af7'], ['Email', 0.27, '#e0af68'], ['Otros', 0.12, '#f7768e']].map(([l, v, c], i) => { const y = 310 + i * 70;
    return T(936, y, 16, '#8b93a7', l) + `<rect x="936" y="${y + 12}" width="290" height="16" rx="8" fill="#232c42"/><rect x="936" y="${y + 12}" width="${290 * v}" height="16" rx="8" fill="${c}"/>`; }).join(''), '#0b0f19');

// A shop screen for the furniture collection (tablet).
const shopScreen = (w, h) => svgURL(w, h,
  T(w * 0.05, h * 0.1, h * 0.05, '#2f2a24', 'Casa Otoño', ' font-weight="700"', 'serif') + T(w * 0.72, h * 0.1, h * 0.03, '#8a7a66', 'Cesta (2)')
  + [['#8c4a2f', 'Sofá Velvet', '1.290 €'], ['#6b7a3a', 'Silla Lino', '189 €'], ['#c9a66b', 'Butaca Damasco', '640 €'], ['#4a3b2f', 'Sofá Nogal', '1.850 €']].map(([c, n, p], i) => {
    const x = w * 0.05 + (i % 2) * w * 0.46, y = h * 0.16 + Math.floor(i / 2) * h * 0.41, cw = w * 0.44, ch = h * 0.38;
    return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="${h * 0.02}" fill="#ffffff"/><rect x="${x + cw * 0.06}" y="${y + ch * 0.06}" width="${cw * 0.88}" height="${ch * 0.6}" rx="${h * 0.015}" fill="${c}" opacity="0.85"/>`
      + T(x + cw * 0.06, y + ch * 0.8, h * 0.032, '#2f2a24', n, ' font-weight="700"') + T(x + cw * 0.06, y + ch * 0.93, h * 0.028, '#8a7a66', p); }).join(''), '#f3ece0');

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · A smartwatch launch: black and gold, the watch travels through three slides (Transform) arriving differently each time.
  product_watch: { name: 'Lanzamiento: reloj inteligente', summary: 'Negro y oro: reloj 3D que viaja por tres diapositivas con Transformar y llegadas distintas, Text Art oro, radar y precios', cat: 'product', make: () => {
    const BG = '#0c0a09', GOLD = '#d4a857', CREAM = '#f5ecdf', DIM = '#a8998a', W = uid(), NAME = uid();
    const watch = (x, y, w, h, props) => ({ ...m3d('kh-ChronographWatch', x, y, w, h, props), id: W });
    const name = (x, y, w, h, size) => ({ ...text('AURA', x, y, w, h, { fontFamily: pairStacks('classic').heading, fontSize: size, wordart: 'gold', letterSpacing: 6 }), id: NAME });
    return numbered(build({ name: 'AURA · reloj inteligente', palette: 'warm', fonts: 'classic', title: { color: GOLD, size: 50 },
      decor: () => [shape('rect', 60, 686, 1160, 1, GOLD, { opacity: 50 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        glow(640, 20, 700, '#6b4a1f', BG, 60),
        text('NUEVA COLECCIÓN · OTOÑO 2026', 90, 190, 560, 40, { fontSize: 20, color: GOLD, letterSpacing: 8 }),
        name(80, 230, 600, 200, 170),
        text('El tiempo, a tu medida', 90, 440, 560, 60, { fontSize: 40, color: CREAM, fontStyle: 'italic' }),
        text('Titanio, zafiro y catorce días de batería', 90, 510, 560, 40, { fontSize: 24, color: DIM }),
        watch(680, 80, 520, 560, { autoRotate: true, spin: 18, view: 'three', edge: 'fade' })],
        notes: 'Portada: el reloj 3D gira despacio (Modelo 3D ▸ Girar solo, 18°/s) con bordes difuminados. El título es Text Art «Oro». Deja unos segundos de silencio antes de empezar.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        watch(40, 100, 500, 540, { autoRotate: false, view: 'front', arrive: 'turn' }),
        name(600, 70, 400, 110, 80),
        text('Diseñado para durar', 604, 180, 600, 50, { fontSize: 30, color: CREAM }),
        ...[['Caja de titanio de 42 mm', 'Un 40 % más ligera que el acero.'], ['Cristal de zafiro', 'Solo el diamante lo raya.'], ['Sumergible a 100 metros', 'Para nadar, bucear o ducharse.']].map(([h, d], i) =>
          withAnims(text(`<div style="font-size:30px;color:${GOLD};font-weight:700">${h}</div><div style="color:${CREAM};opacity:.85">${d}</div>`, 604, 270 + i * 130, 600, 110,
            { fontSize: 24, borderColor: '#d4a85755', pad: [14, 20, 14, 20], radius: 12 }), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 500 })))],
        notes: 'Transformar: el reloj y el nombre viajan desde la portada. El reloj llega «dando una vuelta hasta su vista» (Modelo 3D ▸ Al llegar). Las tres tarjetas entran seguidas con un clic.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        name(90, 60, 400, 110, 80),
        watch(700, 80, 500, 560, { autoRotate: false, view: 'side', arrive: 'view' }),
        anim(stat('14 días', 'de batería en uso normal', 90, 200, 560, GOLD, CREAM, 80), 1, 'fade-up'),
        anim(stat('38 g', 'con la correa de titanio', 90, 400, 270, GOLD, CREAM, 64), 2, 'fade-up'),
        anim(stat('5 ATM', 'resistencia al agua', 380, 400, 270, GOLD, CREAM, 64), 3, 'fade-up')],
        notes: 'Segunda Transformar: ahora el reloj va a la vista de lado de esta diapositiva (Al llegar ▸ Ir a la vista). Cifras de ejemplo, inventadas para la plantilla.' },
      { layout: 'titleOnly', title: 'Autonomía según el uso', bg: BG, autoAnimate: true, extra: [
        watch(1030, 30, 190, 190, { autoRotate: true, spin: 40, view: 'front', arrive: 'front' }),
        chartBlock({ x: 90, y: 190, w: 760, h: 450, chartType: 'hbar', color: GOLD, dataLabels: true, grid: true,
          data: [{ label: 'Solo hora', value: 45 }, { label: 'Uso normal', value: 14 }, { label: 'Deporte diario', value: 8 }, { label: 'GPS continuo', value: 2 }], xTitle: 'Días' }),
        text('Carga completa en <b style="color:#d4a857">55 minutos</b> con la base magnética.', 890, 300, 330, 200, { fontSize: 28, color: CREAM })],
        notes: 'Tercera Transformar: el reloj se encoge a la esquina y llega girando hasta quedar de frente (Al llegar ▸ Girar hasta quedar de frente). Datos de autonomía inventados.' },
      { layout: 'titleOnly', title: 'Tu salud, de un vistazo', bg: BG, transition: 'fade', extra: [
        chartBlock({ x: 90, y: 170, w: 520, h: 490, chartType: 'radar', color: GOLD,
          data: [{ label: 'Pulso', value: 95 }, { label: 'Oxígeno', value: 90 }, { label: 'Sueño', value: 85 }, { label: 'Estrés', value: 70 }, { label: 'Temperatura', value: 75 }, { label: 'Actividad', value: 98 }] }),
        text(ul('Electrocardiograma en 30 segundos', 'Fases del sueño y puntuación diaria', 'Aviso si el pulso se sale de tu rango', 'Todo cifrado y solo en tu móvil'), 660, 200, 560, 400, { fontSize: 28, color: CREAM, lineHeight: 1.5 })],
        notes: 'El radar muestra la precisión de cada sensor frente a un equipo médico de referencia (porcentajes de ejemplo).' },
      { layout: 'titleOnly', title: 'Tres acabados', bg: BG, transition: 'convex', extra: [
        ...[['Titanio natural', '449 €', '#e8e2d6', '#9c9486'], ['Oro champán', '549 €', '#f1d9a0', '#b8860b'], ['Negro carbono', '499 €', '#5a5550', '#15120f']].map(([n, p, c1, c2], i) => [
          anim(shape('ellipse', 180 + i * 380, 180, 160, 160, c1, { fill2: c2, gradType: 'radial', stroke: GOLD, strokeWidth: 2 }), i + 1, 'zoom-in'),
          anim(text(`<div style="font-size:30px;color:${CREAM}">${n}</div><div style="font-size:64px;font-weight:700;color:${GOLD}">${p}</div><div style="color:${DIM}">Correa de piel incluida</div>`,
            90 + i * 380, 370, 340, 220, { fontSize: 22, textAlign: 'center' }), i + 1, 'fade-up')]).flat()],
        notes: 'Cada acabado aparece con un clic: la esfera es una elipse con degradado radial. Precios de ejemplo.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-200, 200, 700, '#6b4a1f', BG, 55),
        text('A la venta el', 90, 170, 600, 60, { fontSize: 36, color: CREAM, fontStyle: 'italic' }),
        text('15 de noviembre', 90, 230, 660, 120, { fontFamily: pairStacks('classic').heading, fontSize: 72, wordart: 'gold' }),
        text('Reservas abiertas hoy · envío gratuito · 30 días de prueba', 90, 380, 600, 80, { fontSize: 26, color: DIM }),
        m3d('kh-ChronographWatch', 760, 110, 440, 480, { autoRotate: false, motion: 'float', view: 'three', edge: 'fade' }),
        credits(['kh-ChronographWatch'], 90, 640, 1100, '#6f6356')],
        notes: 'Cierre: el reloj flota (Modelo 3D ▸ Al llegar a la diapositiva ▸ Flotar). La transición «Zoom» da el remate.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · An electric concept car: edges without a cut, a full orbit on arrival, Transform, numbers, charts and a vote.
  product_car: { name: 'Presentación: coche eléctrico', summary: 'Coche 3D sin corte en los bordes que da la vuelta al entrar, Transformar, cifras, gráficos de área y barras, tabla y votación', cat: 'product', make: () => {
    const BG = '#050d18', CY = '#50e3c2', BL = '#4a90d9', FG = '#f2f6fa', DIM = '#8fa6bf', CAR = uid();
    const car = (x, y, w, h, props) => ({ ...m3d('kh-CarConcept', x, y, w, h, props), id: CAR });
    return numbered(build({ name: 'VOLTA E-1', palette: 'ocean', fonts: 'bold', title: { size: 64, color: FG },
      decor: p => [shape('rect', 0, 714, 1280, 6, p.accents[0], { fill2: CY, gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(240, 200, 800, '#1d4f8a', BG, 55),
        text('VOLTA E-1', 90, 40, 1100, 150, { fontFamily: pairStacks('bold').heading, fontSize: 150, textAlign: 'center', wordart: 'ice', letterSpacing: 8 }),
        text('EL ELÉCTRICO QUE SE CARGA MIENTRAS TOMAS UN CAFÉ', 90, 190, 1100, 40, { fontSize: 24, textAlign: 'center', color: CY, letterSpacing: 5 }),
        car(140, 200, 1000, 540, { autoRotate: false, view: 'three', motion: 'orbit', edge: 'free' })],
        notes: 'El coche da una vuelta completa al llegar (Modelo 3D ▸ Al llegar a la diapositiva ▸ Vuelta completa) y sus bordes son «sin corte»: la vista 3D ocupa más que su marco y nada se recorta.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        car(430, 90, 820, 560, { autoRotate: false, view: 'side', arrive: 'turn', edge: 'fade' }),
        text('Diseñado<br>por el viento', 90, 90, 500, 200, { fontFamily: pairStacks('bold').heading, fontSize: 84, color: FG, lineHeight: 1 }),
        ...[['Cx 0,21', 'Uno de los más aerodinámicos de su clase'], ['Techo solar', 'Hasta 15 km extra al día'], ['Llantas de 20"', 'Tapas que cortan el aire']].map(([h, d], i) =>
          withAnims(text(`<b style="color:${CY};font-size:32px">${h}</b><br>${d}`, 90, 320 + i * 120, 400, 100, { fontSize: 22, color: DIM }), A('fade-right', { start: i ? 'afterPrev' : 'click' })))],
        notes: 'Transformar: el mismo coche (mismo objeto en las dos diapositivas) viaja a la derecha y gira hasta la vista lateral con bordes difuminados.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        car(290, 250, 700, 490, { autoRotate: false, view: 'front', arrive: 'view', edge: 'fade' }),
        ...[['620 km', 'de autonomía (WLTP)'], ['3,2 s', 'de 0 a 100 km/h'], ['15 min', 'del 10 al 80 %'], ['0 g', 'de CO₂ al circular']].map(([n, l], i) =>
          withAnims(stat(n, l, 70 + i * 290, 70, 270, [CY, BL, '#f5a623', '#b8e986'][i], FG, 76, { textAlign: 'center' }), A('grow', { start: i ? 'afterPrev' : 'withPrev', delay: i ? 0 : 300, duration: 450 })))],
        notes: 'Las cuatro cifras entran solas una detrás de otra («después de la anterior») mientras el coche se coloca de frente. Datos de ejemplo.' },
      { layout: 'titleOnly', title: 'Más lejos, más rápido', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 90, y: 180, w: 520, h: 440, chartType: 'bar', color: CY, dataLabels: true,
          data: [{ label: 'Media del segmento', value: 450 }, { label: 'Rival A', value: 530 }, { label: 'VOLTA E-1', value: 620 }], yTitle: 'km' }),
        chartBlock({ x: 670, y: 180, w: 520, h: 440, chartType: 'area', color: BL, grid: true,
          data: [0, 3, 6, 9, 12, 15].map(t => ({ label: t + ' min', value: [10, 28, 45, 60, 71, 80][t / 3] })), yTitle: '% de batería' }),
        text('Autonomía', 90, 620, 520, 40, { fontSize: 22, textAlign: 'center', color: DIM }), text('Curva de carga rápida (350 kW)', 670, 620, 520, 40, { fontSize: 22, textAlign: 'center', color: DIM })],
        notes: 'A la izquierda la autonomía frente a la competencia; a la derecha cuánto se carga en un café. Cifras inventadas para el ejemplo.' },
      { layout: 'titleOnly', title: 'Una parada, un café', bg: BG, extra: [
        dg('chevrons', 'Enchufa\n  Cargador rápido de 350 kW\nDescansa\n  15 minutos de pausa\nSigue\n  +400 km de autonomía', 90, 180, 1100, 300, { oneByOne: true, colors: 'accent' }),
        shape('rounded', 90, 500, 1100, 140, '#0c1d33', { radius: 18 }), icon('bolt', 130, 530, 80, CY),
        text(`<b style="color:${CY}">1.200 puntos de carga rápida</b> en España y Portugal con la tarjeta VOLTA, y el planificador de rutas elige las paradas por ti.`, 240, 515, 920, 110, { fontSize: 28, color: FG, vAlign: 'middle' })],
        notes: 'Diagrama de galones que aparece uno a uno al presentar (Diagrama ▸ Uno a uno).' },
      { layout: 'titleOnly', title: 'Elige tu versión', bg: BG, transition: 'cube', extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 380, fontSize: 28, header: true, headBg: BL, headFg: '#ffffff', stroke: '#1f3a5a', banded: true, band: BL,
          rows: [['Versión', 'Batería', 'Autonomía', 'Tracción', 'Precio'], ['Urban', '58 kWh', '420 km', 'Trasera', '34.900 €'], ['Long Range', '82 kWh', '620 km', 'Trasera', '42.500 €'], ['Performance', '82 kWh', '560 km', 'Total', '51.900 €']], colW: [3, 2, 2, 2, 2] }),
        text('Precios orientativos con ayudas incluidas.', 90, 590, 1100, 40, { fontSize: 22, color: DIM })],
        notes: 'La tabla usa filas alternas y el color de acento de la paleta Océano. Precios de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 34, question: '¿Qué color elegirías para tu VOLTA?', options: ['Azul glaciar', 'Blanco perla', 'Grafito', 'Cobre'], display: 'bar', x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación en directo: el público escanea el QR con el móvil y ve el resultado al momento.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(640, 120, 700, '#1d4f8a', BG, 50),
        m3d('kh-CarConcept', 520, 100, 720, 540, { autoRotate: true, spin: 25, view: 'three', edge: 'free' }),
        text('Reserva<br>el tuyo', 90, 160, 520, 260, { fontFamily: pairStacks('bold').heading, fontSize: 120, color: FG, lineHeight: 1 }),
        text('Primeras entregas en primavera de 2027', 90, 440, 520, 50, { fontSize: 28, color: CY }),
        text('volta.example · pruebas en 12 ciudades', 90, 520, 520, 40, { fontSize: 22, color: DIM }),
        credits(['kh-CarConcept'], 90, 640, 1100, '#4e647c')],
        notes: 'Cierre con el coche girando solo y sin corte en los bordes. Invita a reservar la prueba de conducción.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · A mobile app: screens in a phone, a tablet and a laptop, Transform, the user's journey as chevrons, retention and a word cloud.
  product_app: { name: 'Presentación de app móvil', summary: 'App en móvil, tableta y portátil, Transformar, recorrido en galones, cifras, gráfico de retención y nube de palabras', cat: 'product', make: () => {
    const BR = '#5b4bdb', WARM = '#ff7a59', INK = '#231f3a', SOFT = '#f6f5fb', PH = uid(), LOGO = uid();
    const phone = (x, y, props = {}) => ({ ...device(habitScreen(BR, WARM), 'phone', x, y, 270, 540, 'Pantalla de inicio de la app Hábito'), ...props, id: PH });
    const logo = (x, y, size, color) => ({ ...text('<b>Hábito</b>', x, y, size * 4.2, size * 1.35, { fontSize: size, color, fontFamily: pairStacks('friendly').heading }), id: LOGO });
    return numbered(build({ name: 'Hábito · app', palette: 'office', fonts: 'friendly', title: { color: INK, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: SOFT, transition: 'fade', extra: [
        shape('rect', 0, 0, 1280, 720, BR, { fill2: WARM, gradAngle: 120 }),
        shape('ellipse', 760, -120, 560, 560, '#ffffff', { opacity: 10 }), shape('ellipse', 900, 380, 460, 460, '#ffffff', { opacity: 8 }),
        logo(90, 190, 120, '#ffffff'),
        text('Pequeños pasos, grandes cambios', 96, 360, 620, 60, { fontSize: 38, color: '#ffffff' }),
        text('La app que convierte tus propósitos en costumbres', 96, 430, 600, 80, { fontSize: 26, color: '#ffffffd9' }),
        phone(850, 90, { rotation: 6 })],
        notes: 'Portada con un rectángulo a sangre con degradado y la captura de la app dentro de un móvil (Imagen ▸ Dispositivo ▸ Móvil), algo girado para darle vida.' },
      { layout: 'titleOnly', title: 'Por qué fallan los propósitos', bg: SOFT, extra: [
        shape('rect', 90, 220, 1100, 4, '#e2dff2'),
        anim(stat('92 %', 'abandona sus propósitos antes de febrero', 90, 260, 330, BR, INK, 88, { fontSize: 26 }), 1, 'fade-up'),
        anim(stat('66 días', 'tarda de media en consolidarse un hábito', 475, 260, 330, WARM, INK, 88, { fontSize: 26 }), 2, 'fade-up'),
        anim(stat('3 min', 'al día bastan si el hábito es pequeño', 860, 260, 330, '#06a77d', INK, 88, { fontSize: 26 }), 3, 'fade-up'),
        text('Fuente: encuesta propia a 2.000 personas (datos de ejemplo).', 90, 600, 1100, 40, { fontSize: 20, color: '#6b6780' })],
        notes: 'Tres cifras que aparecen con un clic cada una. Son datos inventados para la plantilla: sustitúyelos por los tuyos.' },
      { layout: 'blank', bg: SOFT, autoAnimate: true, extra: [
        phone(110, 90),
        logo(470, 60, 56, BR),
        ...[['check', 'Registro en un toque', 'Marca el hábito desde la pantalla de bloqueo.', BR], ['bolt', 'Rachas que motivan', 'Cada día seguido suma; un día libre no rompe la racha.', WARM],
          ['user', 'Retos con amigos', 'Compite en pequeño grupo, sin rankings públicos.', '#06a77d'], ['clock', 'Recordatorios listos', 'Aprenden a qué hora sueles cumplir.', '#0f9ed5']].map(([ic, h, d, c], i) => [
          withAnims({ ...icon(ic, 480, 170 + i * 125, 64, c) }, A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 350 })),
          withAnims(text(`<b style="font-size:28px">${h}</b><br>${d}`, 570, 160 + i * 125, 620, 105, { fontSize: 22, color: INK }), A('fade-left', { start: 'withPrev', duration: 400 }))]).flat()],
        notes: 'Transformar: el móvil vuelve recto y se coloca a la izquierda, y el logotipo sube. Luego cada función entra con su icono.' },
      { layout: 'titleOnly', title: 'El recorrido de quien la usa', bg: SOFT, transition: 'push', extra: [
        dg('chevrons', 'Descubre\n  Por recomendación de un amigo\nPrueba\n  7 días gratis, sin tarjeta\nRepite\n  Un recordatorio al día\nRecomienda\n  Invita y ganáis un mes', 90, 180, 1100, 300, { oneByOne: true, colors: 'colorful' }),
        ...[['100 %', 'llegan a la tienda'], ['41 %', 'empiezan la prueba'], ['28 %', 'siguen a los 30 días'], ['9 %', 'invitan a alguien']].map(([n, l], i) =>
          anim(text(`<div style="font-size:48px;font-weight:800;color:${[BR, WARM, '#06a77d', '#0f9ed5'][i]}">${n}</div>${l}`, 100 + i * 275, 500, 255, 130, { fontSize: 22, color: INK, textAlign: 'center' }), i + 1, 'fade-up'))],
        notes: 'Diagrama de galones: se escribe como un esquema y aparece paso a paso al presentar.' },
      { layout: 'titleOnly', title: 'En todas tus pantallas', bg: SOFT, extra: [
        withAnims(device(habitWide(BR, WARM, 1280, 800), 'laptop', 380, 170, 640, 400, 'Resumen semanal en el portátil'), A('fade-up', { duration: 500 })),
        withAnims(device(habitWide(BR, WARM, 1024, 768), 'tablet', 90, 300, 400, 310, 'Resumen semanal en la tableta'), A('fade-right', { start: 'afterPrev', duration: 500 })),
        withAnims(device(habitScreen(BR, WARM), 'phone', 980, 250, 190, 380, 'La app en el móvil'), A('fade-left', { start: 'afterPrev', duration: 500 }))],
        notes: 'La misma app en portátil, tableta y móvil (Imagen ▸ Dispositivo). Entran solos, uno detrás de otro.' },
      { layout: 'titleOnly', title: 'Quien empieza, sigue', bg: SOFT, extra: [
        chartBlock({ x: 90, y: 180, w: 720, h: 460, chartType: 'line', color: BR, grid: true, seriesName: 'Hábito',
          data: ['S1', 'S2', 'S4', 'S8', 'S12'].map((l, i) => ({ label: l, value: [100, 81, 72, 64, 61][i] })), series: [{ name: 'Media de apps', values: [100, 55, 38, 26, 21], color: WARM }], yTitle: '% de usuarios activos' }),
        card(`<div style="font-size:72px;font-weight:800;color:${BR};line-height:1">×3</div>más usuarios activos a los tres meses que la media de apps de hábitos`, 850, 220, 340, 320, '#ffffff', { fontSize: 26, color: INK, borderColor: '#e2dff2' })],
        notes: 'Retención por semanas frente a la media del sector (datos de ejemplo). Destaca la diferencia a los tres meses.' },
      { layout: 'blank', bg: SOFT, extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué hábito te gustaría empezar este año?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras en directo: cada persona escribe un hábito desde el móvil y los más repetidos crecen.' },
      { layout: 'blank', bg: SOFT, transition: 'zoom', autoAnimate: true, extra: [
        shape('rect', 0, 0, 1280, 720, BR, { fill2: WARM, gradAngle: 300 }),
        logo(90, 170, 100, '#ffffff'),
        text('Descárgala gratis', 96, 320, 600, 70, { fontSize: 48, color: '#ffffff', fontWeight: 700 }),
        text('iOS y Android · 7 días de prueba de la versión Plus', 96, 400, 700, 50, { fontSize: 26, color: '#ffffffd9' }),
        text('habito.example', 96, 520, 600, 50, { fontSize: 30, color: '#ffffff', letterSpacing: 2 }),
        phone(850, 90, { rotation: -6 })],
        notes: 'Cierre con el mismo fondo en degradado, girado al revés. Invita a descargar la app y a probar la versión Plus.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · A hardware keynote, white and premium: a lamp and a smart bottle in 3D, Transform, labels, specs and prices.
  product_keynote: { name: 'Keynote de hardware', summary: 'Estilo blanco premium: lámpara iridiscente y botella 3D, Transformar con etiquetas, flotar y acercar, cifras, tabla y precios', cat: 'product', make: () => {
    const INK = '#1d1d1f', GRAY = '#6e6e73', BLUE = '#0071e3', LIGHT = '#f5f5f7', LAMP = uid(), BOT = uid();
    const lamp = (x, y, w, h, props) => ({ ...m3d('kh-IridescenceLamp', x, y, w, h, props), id: LAMP });
    const bottle = (x, y, w, h, props) => ({ ...m3d('kh-WaterBottle', x, y, w, h, props), id: BOT });
    const grad = s => `<span style="background-image:linear-gradient(90deg,#0071e3,#8e44ad 50%,#e84393);-webkit-background-clip:text;background-clip:text;color:transparent">${s}</span>`;
    const label = (str, x, y, w, i, align = 'left') => withAnims(text(str, x, y, w, 90, { fontSize: 22, color: GRAY, textAlign: align }), A('fade-in', { start: i ? 'afterPrev' : 'click', duration: 500 }));
    return numbered(build({ name: 'Keynote · Casa 2026', palette: 'grayscale', fonts: 'clean', title: { color: INK, size: 54 }, body: { color: INK } }, [
      { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
        text('Presentación de otoño', 140, 200, 1000, 50, { fontSize: 28, color: GRAY, textAlign: 'center' }),
        text(`<b>${grad('Luz. Agua. Calma.')}</b>`, 90, 260, 1100, 160, { fontSize: 120, textAlign: 'center', letterSpacing: -2 }),
        text('Dos objetos nuevos para tu casa', 140, 450, 1000, 50, { fontSize: 32, color: INK, textAlign: 'center' })],
        notes: 'Portada tipográfica, mucho aire y un degradado dentro del texto. En un keynote de producto, menos es más.' },
      { layout: 'blank', bg: '#000000', transition: 'fade', extra: [
        glow(620, 60, 600, '#3b2a6b', '#000000', 60),
        text('NUEVO', 90, 230, 500, 40, { fontSize: 24, color: '#f5a623', letterSpacing: 6 }),
        text('Prisma', 90, 270, 520, 140, { fontSize: 120, color: '#f5f5f7', fontWeight: 700 }),
        text('La lámpara que cambia de color según la miras.', 90, 420, 480, 100, { fontSize: 32, color: '#a1a1a6' }),
        lamp(660, 60, 520, 600, { autoRotate: true, spin: 14, view: 'three', edge: 'fade' })],
        notes: 'La lámpara gira despacio sobre negro. Su pantalla tiene un material iridiscente: los colores cambian con el ángulo.' },
      { layout: 'blank', bg: '#000000', autoAnimate: true, extra: [
        lamp(420, 90, 440, 560, { autoRotate: false, view: 'front', arrive: 'turn' }),
        shape('line', 340, 205, 150, 1, 'none', { stroke: '#48484a', strokeWidth: 2 }), label('<b style="color:#f5f5f7">Pantalla iridiscente</b><br>Vidrio con capa dicroica', 50, 165, 280, 0, 'right'),
        shape('line', 800, 400, 150, 1, 'none', { stroke: '#48484a', strokeWidth: 2 }), label('<b style="color:#f5f5f7">Luz regulable</b><br>De 2700 K a 6500 K', 960, 360, 270, 1),
        shape('line', 340, 580, 200, 1, 'none', { stroke: '#48484a', strokeWidth: 2 }), label('<b style="color:#f5f5f7">Base de latón</b><br>Con carga inalámbrica', 50, 540, 280, 2, 'right')],
        notes: 'Transformar: la lámpara viene de la diapositiva anterior dando una vuelta hasta quedar de frente. Las etiquetas aparecen solas, una tras otra.' },
      { layout: 'titleOnly', title: 'Prisma, en cifras', bg: LIGHT, transition: 'slide', extra: [
        ...[['1.200', 'lúmenes'], ['9 W', 'de consumo'], ['25.000', 'horas de vida'], ['100 %', 'aluminio reciclado']].map(([n, l], i) =>
          anim(card(`<div style="font-size:50px;font-weight:700;line-height:1.1">${grad(n)}</div><div style="color:${GRAY}">${l}</div>`, 90 + i * 281, 210, 257, 300, '#ffffff', { fontSize: 24, textAlign: 'center', vAlign: 'middle', radius: 24, shadow: { x: 0, y: 8, blur: 24, color: '#0000001a' } }), i + 1, 'fade-up')),
        text('Cifras de ejemplo.', 90, 600, 1100, 40, { fontSize: 18, color: GRAY })],
        notes: 'Cuatro tarjetas blancas con sombra suave sobre gris claro, el estilo de las presentaciones de hardware.' },
      { layout: 'blank', bg: LIGHT, transition: 'fade', extra: [
        bottle(90, 80, 460, 580, { autoRotate: false, view: 'three', motion: 'float' }),
        text('NUEVO', 640, 200, 500, 40, { fontSize: 24, color: BLUE, letterSpacing: 6 }),
        text('Fuente', 640, 240, 560, 130, { fontSize: 110, color: INK, fontWeight: 700 }),
        text('La botella que sabe cuánto has bebido y te lo recuerda con una luz suave.', 640, 390, 540, 140, { fontSize: 32, color: GRAY })],
        notes: 'La botella flota sobre el fondo gris (Modelo 3D ▸ Al llegar ▸ Flotar).' },
      { layout: 'blank', bg: '#ffffff', autoAnimate: true, extra: [
        bottle(780, 80, 400, 560, { autoRotate: true, spin: 30, view: 'front', arrive: 'front' }),
        text('Se lleva bien con todo', 90, 90, 640, 70, { fontSize: 50, color: INK, fontWeight: 700 }),
        tableBlock({ x: 90, y: 200, w: 640, h: 380, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d2d2d7',
          rows: [['', 'Fuente', 'Fuente Mini'], ['Capacidad', '750 ml', '500 ml'], ['Batería', '3 meses', '2 meses'], ['Sensor de nivel', '✓', '✓'], ['Mantiene el frío', '24 h', '18 h'], ['Precio', '59 €', '45 €']], colW: [3, 2, 2] })],
        notes: 'Transformar: la botella pasa a la derecha y gira hasta quedar de frente. La tabla compara los dos tamaños (datos de ejemplo).' },
      { layout: 'blank', bg: '#000000', transition: 'fade', extra: [
        text('Una cosa más…', 140, 280, 1000, 120, { fontSize: 80, color: '#f5f5f7', textAlign: 'center', fontWeight: 700, animation: A('fade-in', { duration: 1200 }) })],
        notes: 'Pausa dramática: el texto aparece despacio con un clic. Espera un par de segundos antes de pasar.' },
      { layout: 'blank', bg: '#000000', transition: 'zoom', extra: [
        m3d('kh-IridescenceLamp', 60, 120, 340, 460, { autoRotate: false, motion: 'zoom', view: 'three' }),
        m3d('kh-WaterBottle', 880, 120, 340, 460, { autoRotate: false, motion: 'zoom', view: 'three' }),
        text(`<b>${grad('Juntas, 99 €')}</b>`, 400, 260, 480, 90, { fontSize: 60, textAlign: 'center' }),
        text('Pack Calma: Prisma + Fuente<br>Reservas desde hoy<br>Llegan el 8 de octubre', 400, 370, 480, 130, { fontSize: 26, color: '#a1a1a6', textAlign: 'center' }),
        credits(['kh-IridescenceLamp'], 90, 650, 1100, '#6e6e73')],
        notes: 'Remate: las dos piezas se acercan al entrar (Modelo 3D ▸ Al llegar ▸ Acercar) y el precio del pack en el centro.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · A SaaS demo: a dashboard in the browser with call-outs, funnel, KPIs, stacked bars, code with steps, plans and Q&A.
  product_saas: { name: 'Demo de plataforma SaaS', summary: 'Panel en ventana de navegador con llamadas numeradas, radial, embudo, indicadores, barras apiladas, código por pasos y preguntas', cat: 'product', make: () => {
    const BG = '#0b0f19', FG = '#e6e9ef', DIM = '#8b93a7', CY = '#2ac3de', BL = '#7aa2f7', GR = '#9ece6a', PU = '#bb9af7', OR = '#e0af68';
    const pin = (n, x, y, c, str, tx, ty, tw) => [
      withAnims(shape('ellipse', x, y, 52, 52, c, { stroke: '#ffffff', strokeWidth: 3 }), A('zoom-in', { duration: 350, sound: 'pop' })),
      withAnims(text(`<b>${n}</b>`, x, y + 6, 52, 40, { fontSize: 24, color: '#0b0f19', textAlign: 'center' }), A('zoom-in', { start: 'withPrev', duration: 350 })),
      withAnims(text(str, tx, ty, tw, 90, { fontSize: 21, color: '#0b0f19', bg: '#ffffff', radius: 10, pad: [10, 14, 10, 14] }), A('fade-in', { start: 'withPrev', duration: 350 }))];
    return numbered(build({ name: 'Pulso · demo', palette: 'midnight', fonts: 'tech', title: { size: 46, color: FG },
      decor: () => [shape('rect', 60, 40, 8, 8, CY), text('PULSO · DEMO', 76, 32, 300, 24, { fontSize: 14, color: DIM, letterSpacing: 4 })] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-200, 250, 700, '#1f3a6b', BG, 55),
        text(`<b>${neon('Pulso', CY)}</b>`, 90, 200, 520, 150, { fontFamily: pairStacks('tech').heading, fontSize: 130 }),
        text('Todos los datos de tu negocio en un solo panel', 94, 370, 480, 100, { fontSize: 32, color: FG }),
        text('Demo para el equipo comercial · 20 minutos', 94, 490, 480, 40, { fontSize: 22, color: DIM }),
        device(dashScreen(), 'browser', 610, 170, 620, 380, 'Panel de Pulso en el navegador', { rotation: -3 })],
        notes: 'Portada con el nombre en neón de color propio y el producto dentro de una ventana de navegador (Imagen ▸ Dispositivo ▸ Navegador).' },
      { layout: 'titleOnly', title: 'Hoy: los datos, en siete sitios', bg: BG, extra: [
        dg('radial', 'Tu equipo\n  Hojas de cálculo\n  CRM\n  Web\n  Soporte\n  Facturación\n  Anuncios', 90, 160, 700, 510, { colors: 'colorful', oneByOne: true }),
        text('Cada lunes, <b style="color:#e0af68">4 horas</b> juntando cifras a mano para la reunión de ventas.', 830, 280, 360, 220, { fontSize: 30, color: FG })],
        notes: 'Diagrama radial uno a uno: cada herramienta aparece con un clic. Pregunta al público cuántas usan ellos.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        device(dashScreen(), 'browser', 90, 60, 1100, 600, 'El panel de Pulso'),
        ...pin(1, 260, 170, CY, 'Indicadores clave en tiempo real', 320, 150, 300),
        ...pin(2, 470, 380, BL, 'Usuarios activos, día a día', 530, 360, 280),
        ...pin(3, 910, 360, GR, 'De dónde llegan tus clientes', 900, 470, 270)],
        notes: 'La demo: cada clic muestra un punto numerado con su explicación y un pequeño sonido. Recorre el panel en este orden.' },
      { layout: 'titleOnly', title: 'Dónde se pierden los clientes', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 90, y: 170, w: 620, h: 480, chartType: 'funnel', color: BL,
          data: [{ label: 'Visitas', value: 84000 }, { label: 'Registros', value: 9600 }, { label: 'Activados', value: 4100 }, { label: 'De pago', value: 1450 }] }),
        withAnims(card(`<div style="font-size:60px;font-weight:800;color:${OR};line-height:1.1">−57 %</div>entre registro y activación: el paso que Pulso te ayuda a mejorar con avisos automáticos.`,
          760, 250, 430, 320, '#161d2e', { fontSize: 26, color: FG }), A('fade-left'))],
        notes: 'El embudo muestra el mayor salto. Datos de una cuenta de ejemplo.' },
      { layout: 'titleOnly', title: 'Resultados de nuestros clientes', bg: BG, extra: [
        ...[['−80 %', 'tiempo en informes', CY], ['+22 %', 'conversión', GR], ['6 sem.', 'para amortizarlo', PU]].map(([n, l, c], i) =>
          anim(text(`<div style="font-size:52px;font-weight:800;color:${c};line-height:1.1">${n}</div><div>${l}</div>`, 90, 175 + i * 160, 330, 140, { fontSize: 22, color: FG, bg: '#161d2e', radius: 14, pad: [14, 20, 14, 20] }), i + 1, 'fade-right')),
        chartBlock({ x: 470, y: 170, w: 720, h: 480, chartType: 'stacked', color: BL, seriesName: 'Básico', grid: true,
          data: ['T1', 'T2', 'T3', 'T4'].map((l, i) => ({ label: l, value: [120, 150, 170, 190][i] })),
          series: [{ name: 'Equipo', values: [60, 90, 130, 170], color: GR }, { name: 'Empresa', values: [20, 35, 55, 80], color: PU }], yTitle: 'Clientes' })],
        notes: 'Tres resultados medios de los clientes y la evolución de clientes por plan en barras apiladas. Cifras de ejemplo.' },
      { layout: 'titleOnly', title: 'Conectarlo: tres líneas', bg: BG, extra: [
        codeBlock({ x: 90, y: 170, w: 780, h: 380, fontSize: 24, lang: 'javascript', lineSteps: '1|3-5|7-8',
          code: "import { Pulso } from '@pulso/sdk';\n\nconst pulso = new Pulso({\n  clave: process.env.PULSO_CLAVE,\n});\n\npulso.evento('compra', { importe: 49 });\npulso.identificar(usuario.id, { pais: 'ES' });" }),
        text(ul('Importa el SDK', 'Crea el cliente con tu clave', 'Envía eventos: salen en el panel en segundos'), 910, 190, 280, 380, { fontSize: 24, color: FG, lineHeight: 1.5 })],
        notes: 'El código resalta las líneas por pasos: importar, crear el cliente y enviar eventos. El SDK es inventado.' },
      { layout: 'titleOnly', title: 'Planes', bg: BG, transition: 'convex', extra: [
        tableBlock({ x: 90, y: 170, w: 1100, h: 420, fontSize: 26, header: true, headBg: '#1f2a44', headFg: CY, stroke: '#2a3350', banded: true, band: BL,
          rows: [['', 'Básico', 'Equipo', 'Empresa'], ['Precio al mes', '29 €', '99 €', 'A medida'], ['Usuarios', '3', '20', 'Ilimitados'], ['Integraciones', '5', '40', 'Todas'], ['Alertas automáticas', '—', '✓', '✓'], ['Soporte', 'Correo', 'Chat', 'Gestor dedicado']], colW: [3, 2, 2, 2] }),
        text('14 días de prueba gratis en cualquier plan.', 90, 610, 1100, 40, { fontSize: 22, color: DIM })],
        notes: 'Tabla de planes con la cabecera en el color de la marca. Precios de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'qa', fontSize: 34, question: '¿Qué te gustaría ver en la demo?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Preguntas del público desde el móvil: las más votadas suben. Úsalas para decidir qué enseñar en directo.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · A product roadmap: a road that draws itself, pyramid, timeline, now/next/later, matrix, votes to prioritise and to order.
  product_roadmap: { name: 'Hoja de ruta de producto', summary: 'Camino que se dibuja solo, pirámide, cronología uno a uno, ahora y después, matriz, barras apiladas y votación múltiple y de ordenar', cat: 'product', make: () => {
    const BG = '#1b1030', FG = '#f3eefe', DIM = '#b7a9d6', P = '#9b5de5', PK = '#f15bb5', Y = '#fee440', C = '#00bbf9', G = '#00f5d4';
    const road = Array.from({ length: 50 }, (_, i) => { const t = i / 49; return [Math.round(20 + t * 1060), Math.round(150 + 90 * Math.sin(t * Math.PI * 2.2) - t * 60)]; });
    return numbered(build({ name: 'Hoja de ruta 2027', palette: 'violet', fonts: 'websafe', title: { size: 50, color: FG },
      decor: p => [shape('rect', 0, 0, 1280, 6, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        { ...base(100, 360, 1100, 300), type: 'ink', points: road, vw: 1100, vh: 300, color: P, width: 14, animation: A('draw', { duration: 2500, start: 'afterPrev' }) },
        ...[[0.0, Y], [0.33, PK], [0.66, C], [1, G]].map(([t, c], i) => { const [px, py] = road[Math.round(t * 49)];
          return withAnims(shape('ellipse', 100 + px - 18, 360 + py - 18, 36, 36, c, { stroke: BG, strokeWidth: 4 }), A('zoom-in', { start: 'afterPrev', duration: 300, sound: i === 3 ? 'chime' : '' })); }),
        text('Hoja de ruta', 90, 110, 900, 110, { fontSize: 84, color: FG, fontWeight: 700 }),
        text('Producto · 2027', 94, 220, 900, 60, { fontSize: 40, color: Y }),
        text('Qué construiremos, en qué orden y por qué', 94, 290, 900, 40, { fontSize: 24, color: DIM })],
        notes: 'El camino se dibuja solo al llegar (efecto Dibujar sobre un trazo a mano) y los cuatro hitos aparecen encima; el último suena.' },
      { layout: 'titleOnly', title: 'De la visión a las entregas', bg: BG, extra: [
        dg('pyramid', 'Visión\nObjetivos 2027\nIniciativas\nEntregas', 90, 170, 560, 480, { colors: 'colorful', oneByOne: true }),
        text(`<b style="color:${Y}">Visión:</b> que cualquier equipo publique su tienda en una tarde.<br><br><b style="color:${PK}">Objetivo 2027:</b> duplicar las tiendas activas y reducir a la mitad las bajas del primer mes.`, 700, 220, 490, 380, { fontSize: 26, color: FG })],
        notes: 'La pirámide va de lo más estable (la visión) a lo que más cambia (las entregas). Aparece por niveles.' },
      { layout: 'titleOnly', title: 'El año, trimestre a trimestre', bg: BG, transition: 'slide', extra: [
        dg('timeline', 'T1\n  Pagos en 1 clic\nT2\n  App para tiendas\nT3\n  Inventario inteligente\nT4\n  Mercados internacionales', 90, 150, 1100, 300, { oneByOne: true, colors: 'colorful' }),
        ...[['+15 %', 'conversión en el pago', Y], ['30 %', 'de ventas desde el móvil', PK], ['−20 %', 'de roturas de stock', C], ['3', 'países nuevos', G]].map(([n, l, c], i) =>
          withAnims(card(`<div style="font-size:44px;font-weight:700;color:${c}">${n}</div>${l}`, 100 + i * 275, 470, 255, 160, '#ffffff10', { fontSize: 22, color: FG, textAlign: 'center', borderColor: c + '66', pad: [16, 16, 16, 16] }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 400 })))],
        notes: 'Cronología uno a uno. Recuerda que las fechas son una previsión, no una promesa.' },
      { layout: 'titleOnly', title: 'Ahora · Después · Más adelante', bg: BG, extra: [
        ...[['AHORA', 'En desarrollo', ['Pagos en 1 clic', 'Nuevo editor de fichas', 'Informes de ventas'], Y], ['DESPUÉS', 'Diseñado, en cola', ['App para tiendas', 'Cupones y ofertas', 'Envíos con seguimiento'], PK], ['MÁS ADELANTE', 'En exploración', ['Inventario con IA', 'Varias monedas', 'Mercados de terceros'], C]].map(([h, s, items, c], i) =>
          anim(card(`<div style="font-size:26px;letter-spacing:4px;color:${c};font-weight:700">${h}</div><div style="font-size:20px;color:${DIM};margin-bottom:12px">${s}</div>${ul(...items)}`, 90 + i * 375, 190, 350, 380, '#ffffff10',
            { fontSize: 27, color: FG, borderColor: c + '88' }), i + 1, 'fade-up'))],
        notes: 'El formato «ahora, después, más adelante» evita comprometer fechas lejanas. Cada columna aparece con un clic.' },
      { layout: 'titleOnly', title: 'Impacto frente a esfuerzo', bg: BG, extra: [
        dg('matrix', 'Ganancias rápidas\nGrandes apuestas\nPequeñas mejoras\nMejor no hacerlo', 90, 170, 620, 480, { colors: 'colorful' }),
        text(`<b style="color:${Y}">↑ Impacto · → Esfuerzo</b><br><br>Empezamos por las ganancias rápidas (pagos en 1 clic) y reservamos un tercio del equipo para una gran apuesta: la app para tiendas.`, 750, 220, 440, 380, { fontSize: 26, color: FG })],
        notes: 'Matriz 2 × 2 para justificar el orden. Pide al público ejemplos de cada cuadrante.' },
      { layout: 'titleOnly', title: 'Capacidad del equipo', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'stacked100', color: Y, seriesName: 'Funciones', grid: true,
          data: ['T1', 'T2', 'T3', 'T4'].map((l, i) => ({ label: l, value: [50, 45, 40, 45][i] })),
          series: [{ name: 'Mejoras', values: [30, 30, 35, 30], color: C }, { name: 'Incidencias', values: [20, 25, 25, 25], color: PK }] })],
        notes: 'Barras apiladas al 100 %: cómo repartimos el tiempo cada trimestre. Porcentajes de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', fontSize: 32, question: 'Elige las tres iniciativas que más te importan', options: ['Pagos en 1 clic', 'App para tiendas', 'Inventario con IA', 'Cupones y ofertas', 'Varias monedas', 'Envíos con seguimiento'], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación de respuesta múltiple: cada persona marca varias. Sirve para contrastar la hoja de ruta con los clientes.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', fontSize: 32, question: 'Ordena las fases de un lanzamiento', options: ['Investigar con clientes', 'Prototipo', 'Beta cerrada', 'Lanzamiento', 'Medir y ajustar'], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Actividad de ordenar desde el móvil: se corrige sola y da puntos. Explica después el orden correcto.' },
      { layout: 'blank', bg: BG, transition: 'zoom',
        extra: [glow(340, 60, 600, '#3a1f66', BG, 70), text('Gracias', 140, 230, 1000, 130, { fontSize: 100, color: FG, fontWeight: 700, textAlign: 'center' }),
          text('Comentarios sobre la hoja de ruta: <b style="color:#fee440">producto@tienda.example</b>', 140, 390, 1000, 50, { fontSize: 30, color: DIM, textAlign: 'center' }),
          ...[Y, PK, C, G].map((c, i) => shape('ellipse', 556 + i * 48, 500, 24, 24, c))],
        notes: 'Cierre. Recuerda dónde enviar comentarios y cuándo revisaremos la hoja de ruta (cada trimestre).' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · A furniture collection: sofas and chairs in 3D, Transform with different views, swatches, a shop on a tablet and a budget.
  product_furniture: { name: 'Colección de muebles', summary: 'Estilo editorial: sofás y sillas 3D, Transformar con vistas distintas, balanceo y vuelta, muestras de color, tableta y presupuesto', cat: 'product', make: () => {
    const BG = '#f3ece0', INK = '#2f2a24', TER = '#a4532c', OLI = '#6b7a3a', SAND = '#c9a66b', DIM = '#7d6e5d', SOFA = uid();
    const sofa = (x, y, w, h, props) => ({ ...m3d('kh-GlamVelvetSofa', x, y, w, h, props), id: SOFA });
    const serif = pairStacks('editorial').heading;
    return numbered(build({ name: 'Casa Otoño · colección', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 50 }, body: { color: INK },
      decor: () => [shape('rect', 60, 680, 1160, 1, INK, { opacity: 40 }), text('CASA OTOÑO', 60, 688, 300, 24, { fontSize: 13, color: DIM, letterSpacing: 5 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        shape('rect', 700, 0, 580, 720, '#e6dac6'),
        text('COLECCIÓN 2026', 90, 150, 500, 40, { fontSize: 22, color: TER, letterSpacing: 8 }),
        text('Otoño<br>en casa', 84, 190, 600, 280, { fontFamily: serif, fontSize: 120, color: INK, lineHeight: 1.02 }),
        text('Terciopelo, madera y lino para quedarse dentro', 90, 480, 520, 90, { fontSize: 30, color: DIM, fontStyle: 'italic' }),
        sofa(560, 170, 680, 420, { autoRotate: true, spin: 12, view: 'three', edge: 'fade' })],
        notes: 'Portada editorial: un bloque de color a la derecha y el sofá 3D girando despacio con bordes difuminados.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        sofa(40, 170, 640, 400, { autoRotate: false, view: 'front', arrive: 'turn' }),
        text('Sofá Velvet', 730, 120, 480, 90, { fontFamily: serif, fontSize: 64, color: INK }),
        text('1.290 €', 734, 210, 480, 50, { fontSize: 30, color: TER }),
        text(ul('Terciopelo de algodón reciclado', 'Estructura de haya con certificado forestal', 'Fundas lavables a 30 °C', 'Tres plazas · 210 × 92 cm'), 730, 280, 480, 330, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'Transformar: el sofá viene de la portada y da una vuelta hasta quedar de frente (Al llegar ▸ Dar una vuelta).' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        sofa(340, 60, 600, 360, { autoRotate: false, view: 'side', arrive: 'view' }),
        text('Cinco colores de temporada', 90, 420, 1100, 60, { fontFamily: serif, fontSize: 40, color: INK, textAlign: 'center' }),
        ...[['Teja', TER], ['Oliva', OLI], ['Arena', SAND], ['Mostaza', '#c9962b'], ['Carbón', '#3a3633']].map(([n, c], i) => [
          withAnims(shape('ellipse', 175 + i * 200, 500, 110, 110, c, { stroke: '#ffffff', strokeWidth: 4 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 })),
          withAnims(text(n, 140 + i * 200, 620, 180, 40, { fontSize: 22, color: INK, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 300 }))]).flat()],
        notes: 'Segunda Transformar: el sofá sube y va a su vista de lado. Las muestras de color aparecen seguidas con un clic.' },
      { layout: 'titleOnly', title: 'Para sentarse bien', bg: BG, transition: 'slide', extra: [
        m3d('kh-SheenChair', 110, 170, 460, 380, { autoRotate: false, view: 'three', motion: 'swing' }),
        m3d('kh-ChairDamaskPurplegold', 710, 170, 460, 380, { autoRotate: false, view: 'three', motion: 'swing' }),
        text('<b>Silla Lino</b> · 189 €<br><span style="color:#7d6e5d">Tejido con brillo satinado</span>', 110, 560, 460, 90, { fontSize: 24, color: INK, textAlign: 'center' }),
        text('<b>Butaca Damasco</b> · 640 €<br><span style="color:#7d6e5d">Tapizado jacquard hecho a mano</span>', 710, 560, 460, 90, { fontSize: 24, color: INK, textAlign: 'center' })],
        notes: 'Las dos sillas se balancean al llegar (Modelo 3D ▸ Al llegar ▸ Balanceo) para enseñar el volumen del tapizado.' },
      { layout: 'blank', bg: '#2f2a24', transition: 'fade', extra: [
        m3d('kh-SheenWoodLeatherSofa', 520, 130, 700, 460, { autoRotate: false, view: 'three', motion: 'orbit', edge: 'free' }),
        text('EDICIÓN LIMITADA', 90, 170, 420, 40, { fontSize: 20, color: SAND, letterSpacing: 6 }),
        text('Sofá Nogal', 90, 210, 440, 100, { fontFamily: serif, fontSize: 70, color: '#f3ece0' }),
        text('Piel curtida con vegetales y madera de nogal maciza. Numerado: solo 300 unidades.', 90, 330, 400, 170, { fontSize: 26, color: '#d8ccb8' }),
        text('1.850 €', 90, 520, 400, 60, { fontSize: 40, color: SAND })],
        notes: 'Fondo oscuro para la pieza estrella: el sofá da una vuelta completa al entrar, sin corte en los bordes.' },
      { layout: 'titleOnly', title: 'Tres ambientes', bg: BG, extra: [
        m3d('kh-AnisotropyBarnLamp', 1030, 30, 170, 170, { autoRotate: true, spin: 30, view: 'three' }),
        ...[['Salón', 'Sofá Velvet en teja, mesa baja de roble y una alfombra de yute.', TER], ['Rincón de lectura', 'Butaca Damasco, lámpara de latón y una manta de lana.', OLI], ['Estudio', 'Silla Lino, escritorio de nogal y luz cálida regulable.', '#8c6a3a']].map(([h, d, c], i) =>
          anim(card(`<div style="font-family:${serif.replace(/"/g, "'")};font-size:32px;color:${c}">${h}</div><div style="width:60px;height:3px;background:${c};margin:14px 0 18px"></div><div>${d}</div>`, 90 + i * 375, 220, 350, 360, '#fbf7f0', { fontSize: 27, color: INK, borderColor: '#e2d6c0', pad: [30, 30, 30, 30] }), i + 1, 'fade-up'))],
        notes: 'Tres propuestas de ambiente, una por clic. Arriba, la lámpara de granero gira como detalle.' },
      { layout: 'titleOnly', title: 'Compra desde casa', bg: BG, extra: [
        device(shopScreen(1024, 768), 'tablet', 90, 170, 600, 460, 'La tienda de Casa Otoño en una tableta'),
        tableBlock({ x: 740, y: 190, w: 450, h: 360, fontSize: 24, header: true, headBg: TER, headFg: '#ffffff', stroke: '#d9cbb3', banded: true, band: SAND,
          rows: [['Salón tipo', 'Precio'], ['Sofá Velvet', '1.290 €'], ['Butaca Damasco', '640 €'], ['Silla Lino × 2', '378 €'], ['<b>Total</b>', '=SUMA(ARRIBA)']], colW: [3, 2] }),
        text('El total es una fórmula: cambia un precio y se recalcula.', 740, 570, 450, 60, { fontSize: 20, color: DIM })],
        notes: 'La tienda dentro de una tableta y un presupuesto con fórmula =SUMA(ARRIBA). Precios de ejemplo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ fontSize: 34, question: '¿Qué ambiente te llevarías a casa?', options: ['Salón', 'Rincón de lectura', 'Estudio'], display: 'pie', x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Votación en directo con resultado en forma de tarta.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        text('Gracias', 90, 190, 1100, 160, { fontFamily: serif, fontSize: 130, color: INK, textAlign: 'center' }),
        text('Tienda y exposición: calle del Olmo 12 · casaotono.example', 90, 380, 1100, 50, { fontSize: 28, color: DIM, textAlign: 'center' }),
        credits(['kh-GlamVelvetSofa', 'kh-ChairDamaskPurplegold', 'kh-SheenWoodLeatherSofa', 'kh-AnisotropyBarnLamp'], 90, 600, 1100, '#9a8b78')],
        notes: 'Cierre sobrio. Los créditos de los modelos 3D van aquí, en una sola línea.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · A warehouse robot: industrial style, the robot walks a path, several clips in a row, org chart, cycle, chart and a quiz.
  product_robot: { name: 'Robot asistente industrial', summary: 'Estilo industrial: robot 3D que saluda, anda por un recorrido, encadena animaciones y baila; organigrama, ciclo, gráfico y concurso', cat: 'product', make: () => {
    const BG = '#17181b', PANEL = '#232529', Y = '#ffc400', FG = '#f2f2f2', DIM = '#9a9ca3';
    const robot = lib3d('three-RobotExpressive');
    const stripes = Array.from({ length: 18 }, (_, i) => shape('parallelogram', -40 + i * 76, 690, 60, 30, i % 2 ? '#111111' : Y));
    return numbered(build({ name: 'RB-1 · robot asistente', palette: 'warm', fonts: 'bold', title: { size: 60, color: Y }, body: { color: FG },
      decor: () => [shape('rect', 0, 0, 1280, 720, 'none', { stroke: '#2c2e33', strokeWidth: 2 }), ...stripes] }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(640, 40, 640, '#4a3b00', BG, 60),
        text('MODELO RB-1 · LOGÍSTICA', 90, 170, 600, 40, { fontSize: 22, color: DIM, letterSpacing: 6 }),
        text('RB-1', 80, 200, 600, 220, { fontFamily: pairStacks('bold').heading, fontSize: 220, color: Y, lineHeight: 1 }),
        text('El compañero que carga lo pesado', 90, 430, 640, 50, { fontSize: 34, color: FG }),
        text('Presentación a clientes · almacenes y centros de distribución', 90, 500, 640, 40, { fontSize: 22, color: DIM }),
        m3d('three-RobotExpressive', 760, 90, 400, 540, { clip: 'Wave', view: 'front', bleed: 1.5 })],
        notes: 'El robot saluda en bucle (Modelo 3D ▸ Animación ▸ Wave). Tiene margen para moverse, así que la mano no se corta.' },
      { title: 'Se mueve solo por el almacén', layout: 'titleOnly', bg: BG, extra: [
        shape('rect', 60, 600, 1160, 4, '#2c2e33'), ...[0, 1, 2, 3].map(i => shape('rect', 200 + i * 280, 598, 120, 8, Y, { opacity: 60 })),
        withAnims(m3d('three-RobotExpressive', 60, 250, 260, 360, { walk: { clip: robot.walk, end: 'ThumbsUp', endOnce: true, face: true, look: true } }),
          path([[220, -40], [480, 20], [760, -30], [900, 0]], { duration: 4500 })),
        text('Clic: RB-1 sigue su ruta esquivando pasillos y, al llegar, da el visto bueno.', 90, 170, 1100, 50, { fontSize: 26, color: DIM })],
        notes: 'Recorrido dibujado (Animaciones ▸ Dibujar recorrido). Mientras se mueve reproduce «Walking» y al llegar «ThumbsUp» una vez (Modelo 3D ▸ Al moverse).' },
      { title: 'Una tarea completa', layout: 'titleOnly', bg: BG, extra: [
        withAnims(m3d('three-RobotExpressive', 90, 250, 240, 340, { walk: { clip: robot.walk, face: true, look: true } }),
          path([[250, 0], [440, 0]], { duration: 2200 }),
          A('clip3d', { clip: 'Yes', once: true, start: 'afterPrev', duration: 1800 }),
          A('clip3d', { clip: 'Jump', once: true, start: 'click', duration: 1400 }),
          path([[-200, 0], [-440, 0]], { duration: 2200, start: 'click' })),
        card(`<div style="color:${Y};font-size:24px;letter-spacing:3px">SECUENCIA</div>` + ul('Va a la estantería y confirma el pedido', 'Recoge la caja (salto)', 'Vuelve a la zona de envío'), 800, 220, 410, 290, PANEL, { fontSize: 26, color: FG, radius: 6 })],
        notes: 'Un mismo objeto con cuatro animaciones: andar, asentir, saltar y volver. El orden y los inicios se cambian en el Panel de animaciones.' },
      { title: 'Ficha técnica', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        tableBlock({ x: 90, y: 170, w: 1100, h: 440, fontSize: 28, header: true, headBg: Y, headFg: '#111111', stroke: '#34363b', banded: true, band: '#7f7f7f',
          rows: [['Característica', 'RB-1'], ['Carga máxima', '120 kg'], ['Velocidad', '2 m/s (7,2 km/h)'], ['Autonomía', '10 h · cambio de batería en 2 min'], ['Sensores', '6 cámaras, lídar 360° y ultrasonidos'], ['Parada de seguridad', 'A 1,5 m de una persona']], colW: [2, 3] })],
        notes: 'Ficha técnica en tabla con cabecera amarilla industrial. Todas las cifras son de ejemplo.' },
      { title: 'Cómo piensa', layout: 'titleOnly', bg: BG, extra: [
        dg('hierarchy', 'RB-1\n  Percibir\n    Cámaras\n    Lídar\n  Decidir\n    Rutas\n    Seguridad\n  Actuar\n    Ruedas\n    Brazo', 90, 170, 1100, 480, { colors: 'accent', oneByOne: true })],
        notes: 'Organigrama de sus sistemas, escrito como un esquema y mostrado por partes.' },
      { title: 'Seguridad ante todo', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Detectar\nFrenar\nAvisar\nReanudar', 90, 170, 560, 480, { colors: 'colorful' }),
        text(`Si alguien cruza a menos de <b style="color:${Y}">1,5 m</b>, RB-1 frena en menos de medio segundo, avisa con luz y sonido y sigue cuando el paso está libre.`, 700, 250, 490, 300, { fontSize: 30, color: FG })],
        notes: 'El ciclo de seguridad se repite continuamente. Es la pregunta que más hacen los clientes.' },
      { title: 'Pedidos preparados por hora', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'bar', color: '#7f7f7f', seriesName: 'Sin RB-1', dataLabels: true,
          data: ['Turno de mañana', 'Turno de tarde', 'Turno de noche'].map((l, i) => ({ label: l, value: [62, 58, 40][i] })), series: [{ name: 'Con RB-1', values: [104, 99, 91], color: Y }] })],
        notes: 'Piloto de tres meses en un almacén de ejemplo: la mayor mejora es en el turno de noche.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', fontSize: 38, question: '¿A qué distancia de una persona se detiene RB-1?', options: ['0,5 m', '1 m', '1,5 m', '3 m'], correct: [2], time: 20, x: 60, y: 40, w: 1160, h: 620 })],
        notes: 'Pregunta tipo concurso: puntos por acertar y por rapidez. La respuesta estaba en la ficha técnica.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        text('¿Lo probamos<br>en tu almacén?', 90, 180, 660, 260, { fontFamily: pairStacks('bold').heading, fontSize: 104, color: Y, lineHeight: 1 }),
        text('Piloto de 30 días sin coste · rb1.example', 90, 470, 620, 50, { fontSize: 30, color: FG }),
        m3d('three-RobotExpressive', 780, 110, 380, 520, { clip: 'Dance', view: 'three', bleed: 1.6 })],
        notes: 'Cierre con el robot bailando (Animación ▸ Dance) y la propuesta de piloto.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Security of a product: green neon, target, boxes with connectors, code with steps, chart, steps and a matching activity.
  product_security: { name: 'Seguridad del producto', summary: 'Neón verde: diana de capas, flujo con conectores que aparece paso a paso, código resaltado, gráfico, escalera y actividad de emparejar', cat: 'product', make: () => {
    const BG = '#03080a', G = '#39ff88', C = '#3bb3c3', FG = '#e8f5ee', DIM = '#7f9a8c', PANEL = '#0b1a14';
    const boxes = ['Usuario', 'Pasarela', 'Identidad + MFA', 'Servicio', 'Datos cifrados'].map((l, i) =>
      withAnims(text(`<div style="font-size:44px;line-height:1.2">${['👤', '🚪', '🪪', '⚙️', '🗄️'][i]}</div><b>${l}</b>`, 60 + i * 238, 250, 200, 170, { fontSize: 24, textAlign: 'center', vAlign: 'middle', color: FG, bg: PANEL, radius: 12, borderColor: i === 2 ? G : C }),
        A('fade-right', { start: i ? 'afterPrev' : 'click', duration: 400 })));
    const links = boxes.slice(0, -1).map((b, i) => ({ ...base(0, 0, 1280, 720), type: 'connector', from: b.id, to: boxes[i + 1].id, color: G, arrow: true }));
    return numbered(build({ name: 'Seguridad del producto', palette: 'revela', fonts: 'tech', title: { size: 48, color: G },
      decor: () => Array.from({ length: 12 }, (_, i) => shape('rect', 110 * i + 40, 0, 1, 720, '#39ff880a')) }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(340, 60, 600, '#0f5a32', BG, 55),
        shape('hexagon', 490, 120, 300, 260, 'none', { stroke: G, strokeWidth: 3, opacity: 70, animation: A('spin360', { duration: 1600, start: 'afterPrev' }) }),
        text('🔒', 490, 180, 300, 140, { fontSize: 100, textAlign: 'center' }),
        text(`<b>${neon('CONFIANZA CERO', G)}</b>`, 90, 400, 1100, 110, { fontFamily: pairStacks('tech').heading, fontSize: 84, textAlign: 'center', letterSpacing: 4 }),
        text('Cómo protegemos la plataforma y los datos de nuestros clientes', 90, 520, 1100, 50, { fontSize: 28, color: DIM, textAlign: 'center' })],
        notes: 'Portada en neón verde con un color propio. El hexágono da una vuelta al llegar (efecto Girar 360°).' },
      { title: 'Defensa en capas', layout: 'titleOnly', bg: BG, extra: [
        dg('target', 'Datos\nAplicación\nRed\nPersonas', 90, 160, 560, 500, { colors: 'colorful', oneByOne: true }),
        text(ul('<b>Datos:</b> cifrado en reposo y en tránsito', '<b>Aplicación:</b> revisiones de código y pruebas', '<b>Red:</b> segmentada, sin puertos abiertos', '<b>Personas:</b> formación y doble factor'), 690, 200, 500, 420, { fontSize: 26, color: FG, lineHeight: 1.5 })],
        notes: 'Diana uno a uno, de dentro afuera: lo más valioso en el centro.' },
      { title: 'Cada petición se comprueba', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        ...boxes, ...links,
        withAnims(text('Nunca confiar, siempre verificar: identidad, dispositivo y permiso en cada paso.', 90, 460, 1100, 50, { fontSize: 26, color: DIM, textAlign: 'center' }), A('fade-up', { start: 'afterPrev' })),
        ...[['MFA obligatorio', 'para todo el personal'], ['Tokens de 15 min', 'que caducan solos'], ['Registro de cada acceso', 'guardado un año']].map(([h, d], i) =>
          text(`<b style="color:${G}">${h}</b><br>${d}`, 90 + i * 375, 560, 350, 90, { fontSize: 22, color: FG, textAlign: 'center' }))],
        notes: 'Cajas unidas con conectores: si mueves una, la flecha la sigue. Aparecen en orden con un solo clic.' },
      { title: 'Verificar el token', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 90, y: 170, w: 1100, h: 400, fontSize: 24, lang: 'javascript', lineSteps: '1-2|3-5|6-7',
          code: "async function autorizar(peticion) {\n  const token = peticion.headers.get('Authorization')?.slice(7);\n  const datos = await verificarFirma(token, CLAVE_PUBLICA);\n  if (!datos || datos.exp < Date.now() / 1000)\n    throw new Error('Sesión caducada');\n  if (!datos.permisos.includes('leer:informes'))\n    throw new Error('Sin permiso');\n}" }),
        text('Leer el token · comprobar firma y caducidad · comprobar el permiso', 90, 600, 1100, 40, { fontSize: 22, color: DIM })],
        notes: 'Código con pasos de resaltado: cada clic ilumina una parte. Es un ejemplo simplificado.' },
      { title: 'Ataques bloqueados', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 760, h: 480, chartType: 'area', color: G, grid: true,
          data: ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'].map((l, i) => ({ label: l, value: [1200, 1850, 1600, 2900, 2400, 3600][i] })), yTitle: 'Intentos al mes' }),
        anim(stat('0', 'brechas de datos en 2026', 890, 220, 300, G, FG, 96), 1, 'zoom-in'),
        anim(stat('99,98 %', 'disponibilidad', 890, 420, 300, C, FG, 56), 2, 'zoom-in')],
        notes: 'Los intentos crecen, pero ninguno ha llegado a los datos. Cifras de ejemplo.' },
      { title: 'Si algo pasa', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Detectar\n  En menos de 5 minutos\nContener\n  En 30 minutos\nCorregir\n  En 4 horas\nInformar\n  A clientes en 24 horas', 90, 170, 1100, 480, { colors: 'accent', oneByOne: true })],
        notes: 'Escalera de respuesta a incidentes con los tiempos comprometidos.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada medida con lo que evita', options: ['Doble factor = Uso de contraseñas robadas', 'Cifrado = Lectura de datos interceptados', 'Copias de seguridad = Pérdida por secuestro de datos', 'Actualizaciones = Fallos ya conocidos'], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Actividad de emparejar desde el móvil: se corrige sola. Comenta después cada pareja.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(340, 20, 600, '#0f5a32', BG, 45),
        text(`<b>${neon('Seguridad es un hábito', G)}</b>`, 90, 200, 1100, 110, { fontFamily: pairStacks('tech').heading, fontSize: 72, textAlign: 'center' }),
        text(ul('Activa el doble factor en tu cuenta', 'Revisa los permisos de tu equipo cada trimestre', 'Avisa de cualquier cosa rara: seguridad@plataforma.example'), 290, 340, 700, 240, { fontSize: 28, color: FG })],
        notes: 'Cierre con tres acciones concretas para el público.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · A product's sustainability report: green, a plant in 3D with Transform, life cycle, waterfall, doughnut, lines and gaps.
  product_eco: { name: 'Sostenibilidad del producto', summary: 'Verde eco: planta 3D con Transformar, ciclo de vida, cascada de huella, barras de materiales, líneas con objetivo y rellenar huecos', cat: 'product', make: () => {
    const BG = '#f4f8f1', INK = '#1e3320', G = '#2e7d32', LG = '#66bb6a', BR = '#8d6e63', DIM = '#5d7361', PL = uid();
    const plant = (x, y, w, h, props) => ({ ...m3d('kh-DiffuseTransmissionPlant', x, y, w, h, props), id: PL });
    const serif = pairStacks('websafe').heading;
    return numbered(build({ name: 'Sostenibilidad · Kettle Uno', palette: 'forest', fonts: 'websafe', title: { color: G, size: 48 }, body: { color: INK },
      decor: () => [shape('ellipse', 1180, 640, 220, 220, '#d7ebcf'), shape('ellipse', -110, -110, 200, 200, '#e3f0dc')] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(700, 60, 600, '#cfe8c6', BG, 80),
        text('INFORME DE SOSTENIBILIDAD · 2026', 90, 190, 620, 40, { fontSize: 20, color: G, letterSpacing: 6 }),
        text('Diseñado<br>para durar', 84, 230, 640, 230, { fontFamily: serif, fontSize: 96, color: INK, lineHeight: 1.05 }),
        text('El hervidor Kettle Uno,<br>de la cuna a la cuna', 90, 480, 620, 90, { fontSize: 28, color: DIM, fontStyle: 'italic' }),
        plant(760, 70, 440, 580, { autoRotate: true, spin: 10, view: 'three', edge: 'fade' })],
        notes: 'Portada con la planta 3D (material con transmisión de luz: las hojas se ven a contraluz) girando despacio.' },
      { title: 'Todo el ciclo de vida', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Materiales\nFabricación\nTransporte\nUso\nReparación\nReciclaje', 90, 160, 640, 500, { colors: 'colorful', oneByOne: true }),
        text('Medimos el impacto en cada fase, no solo en la fábrica. La reparación cierra el círculo: un hervidor que dura diez años evita fabricar otros dos.', 770, 240, 420, 340, { fontSize: 26, color: INK })],
        notes: 'Ciclo que aparece uno a uno. Insiste en que la fase de uso también cuenta.' },
      { title: 'Dónde está la huella', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 440, chartType: 'waterfall', color: G, dataLabels: true,
          data: [{ label: 'Materiales', value: 42 }, { label: 'Fabricación', value: 18 }, { label: 'Transporte', value: 6 }, { label: 'Uso (10 años)', value: 20 }, { label: 'Reciclaje', value: -9 }, { label: 'Total', value: 0 }] }),
        text('kg de CO₂ equivalente por unidad (estimación de ejemplo)', 90, 620, 1100, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Gráfico de cascada: cada fase suma y el reciclaje resta. La barra final es el total.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        plant(60, 120, 360, 500, { autoRotate: false, view: 'front', arrive: 'turn' }),
        text('Menos que el año pasado', 460, 90, 740, 70, { fontFamily: serif, fontSize: 48, color: G }),
        ...[['−38 %', 'de CO₂ por unidad', G], ['72 %', 'de materiales reciclados', '#43a047'], ['10 años', 'de garantía y piezas de repuesto', BR]].map(([n, l, c], i) =>
          [shape('rect', 460, 300 + i * 120, 740, 2, '#d7ebcf'),
            withAnims(text(n, 460, 190 + i * 120, 290, 100, { fontSize: 54, fontWeight: 700, color: c, vAlign: 'middle' }), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 500 })),
            withAnims(text(l, 760, 190 + i * 120, 440, 100, { fontSize: 28, color: INK, vAlign: 'middle' }), A('fade-in', { start: 'withPrev', duration: 500 }))]).flat(),
        text('Frente al modelo anterior (datos de ejemplo).', 460, 570, 700, 40, { fontSize: 20, color: DIM })],
        notes: 'Transformar: la planta se desplaza a la izquierda y da una vuelta al llegar. Las tres cifras entran seguidas.' },
      { title: '¿De qué está hecho?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 180, w: 600, h: 460, chartType: 'hbar', color: G, dataLabels: true,
          data: [{ label: 'Acero reciclado', value: 46 }, { label: 'Plástico reciclado', value: 26 }, { label: 'Vidrio', value: 14 }, { label: 'Electrónica', value: 10 }, { label: 'Otros', value: 4 }] }),
        text(ul('Sin pegamentos: todo va atornillado', 'Plástico marcado para separarlo bien', 'Embalaje de cartón, sin plástico'), 740, 230, 450, 320, { fontSize: 28, color: INK, lineHeight: 1.5 })],
        notes: 'Composición en peso, en porcentaje (datos de ejemplo).' },
      { title: 'Camino a 2030', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 1100, h: 480, chartType: 'line', color: G, seriesName: 'Real', grid: true, yTitle: 'kg CO₂e por unidad',
          data: ['2022', '2023', '2024', '2025', '2026'].map((l, i) => ({ label: l, value: [124, 118, 98, 86, 77][i] })),
          series: [{ name: 'Objetivo', values: [124, 112, 100, 88, 80], color: BR }] }),
        text('Objetivo 2030: <b>40 kg</b>', 860, 110, 330, 50, { fontSize: 26, color: G, textAlign: 'right' })],
        notes: 'La línea real va por debajo del objetivo desde 2024. Arriba, la meta para 2030 (datos de ejemplo).' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', fontSize: 32, question: 'Completa las frases', text: 'Kettle Uno se desmonta con un solo [destornillador]. El [72] % de sus materiales es reciclado. Tiene [10] años de garantía y piezas.', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Actividad de rellenar huecos desde el móvil, con lo que se ha contado en la presentación.' },
      { layout: 'blank', bg: '#1e3320', transition: 'fade', extra: [
        glow(700, 60, 620, '#2e7d32', '#1e3320', 60),
        text('Lo más sostenible<br>es lo que dura', 90, 200, 700, 220, { fontFamily: serif, fontSize: 72, color: '#f4f8f1', lineHeight: 1.1 }),
        text('Informe completo y datos:<br>sostenibilidad.kettle.example', 90, 450, 700, 90, { fontSize: 26, color: '#a5d6a7' }),
        m3d('kh-DiffuseTransmissionPlant', 820, 120, 360, 480, { autoRotate: false, motion: 'float', view: 'three' }),
        credits(['kh-DiffuseTransmissionPlant'], 90, 640, 1100, '#7fa383')],
        notes: 'Cierre sobre verde oscuro con la planta flotando.' },
    ]));
  } },
};
