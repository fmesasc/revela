// Example presentations: Enfermería y salud pública (cuidados, vacunas, prevención, protocolos, educación
// para la salud…). Each one: { name, summary, cat: 'sci', make() } → a deck (see kit.js for the builders).
// General, prudent information for teaching; every patient, place and figure is made up (orientative).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A picture drawn in SVG, as a data URL (no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const ST = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'fill', ...props });
const deco = (src, x = 0, y = 0, w = 1280, h = 720) => img(src, x, y, w, h, '', { decorative: true });
const device = (src, kind, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', device: kind, ...props });
// A stroke through points on the slide (an ink object: it can be drawn as you present, effect 'draw').
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
const line = (x1, y1, x2, y2, color, width = 3, props = {}) => ink([[x1, y1], [x2, y2]], color, width, props);
const dot = (cx, cy, r, color, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, color, props);
const sphere = (cx, cy, r, c1, c2, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, c1, { fill2: c2, gradType: 'radial', ...props });
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A 3D model without its caption (the credit of CC BY models goes in one small line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 40, { fontSize: 12, color });
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:8px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 90), { fontSize: 24, color: fg, ...props });
// The same pseudo-random numbers every time (so the decks don't change between builds).
const rng = (seed = 7) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const MONO = "'Courier New', Courier, monospace";
// One after another with one click: the first on click (or on its own), the rest after the previous one.
// The deck's text colour (tables, polls and diagrams inherit it), when the slides are lighter or darker than the palette.
const tc = (deck, color) => Object.assign(deck, { textColor: color });
const chain = (blocks, effect = 'fade-up', first = 'click', props = {}) => blocks.map((b, i) => withAnims(b, A(effect, { start: i ? 'afterPrev' : first, duration: 450, ...props })));

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Hand hygiene: bathroom tiles and soap bubbles, the five moments around a bed, a UV lamp that shows what we miss.
  sci_nurse_hands: { name: 'Higiene de manos: los 5 momentos', cat: 'sci', summary: 'Azulejos y burbujas: pompas que suben, los 5 momentos en un plano, lámpara UV con sonido, cuenta atrás de 30 s, barras y concurso', make: () => {
    const BG = '#eef8f9', INK = '#123c46', TEAL = '#0f8a96', AQUA = '#4cc9d6', CORAL = '#ff6b5e', DIM = '#55767d', H = pairStacks('friendly').heading;
    const TILES = svgURL(1280, 720, Array.from({ length: 17 }, (_, i) => `<path d="M${i * 80} 0V720" stroke="#d3e9ec" stroke-width="3"/>`).join('')
      + Array.from({ length: 10 }, (_, i) => `<path d="M0 ${i * 80}H1280" stroke="#d3e9ec" stroke-width="3"/>`).join(''), BG);
    const P = { bg: BG, back: [deco(TILES)] };
    const bubble = (cx, cy, r, props = {}) => sphere(cx, cy, r, '#ffffff', '#bdeef3', { stroke: '#ffffff', strokeWidth: 2, opacity: 75, ...props });
    const rise = (b, dy, start = 'afterPrev', duration = 2600) => withAnims(b, A('fade-in', { start, duration: 400 }), path([[8, -dy * 0.3], [-8, -dy * 0.65], [0, -dy]], { start: 'withPrev', duration }));
    // The five moments: a bed seen from above, the patient's zone, five numbered points around it.
    const BED = svgURL(560, 440, '<ellipse cx="270" cy="220" rx="250" ry="190" fill="#4cc9d6" opacity=".12" stroke="#0f8a96" stroke-width="3" stroke-dasharray="14 10"/>'
      + '<rect x="150" y="70" width="240" height="320" rx="22" fill="#ffffff" stroke="#123c46" stroke-width="4"/><rect x="180" y="86" width="180" height="56" rx="20" fill="#dff3f5" stroke="#123c46" stroke-width="3"/>'
      + '<circle cx="270" cy="170" r="34" fill="#f2c9a8" stroke="#123c46" stroke-width="3"/><rect x="196" y="210" width="148" height="160" rx="30" fill="#b6e3e8" stroke="#123c46" stroke-width="3"/>'
      + '<path d="M196 250 H344" stroke="#123c46" stroke-width="2" opacity=".4"/>'
      + '<rect x="420" y="80" width="80" height="80" rx="8" fill="#ffe2c8" stroke="#123c46" stroke-width="3"/><circle cx="460" cy="120" r="12" fill="#ff6b5e"/>'
      + '<circle cx="90" cy="110" r="14" fill="#123c46"/><path d="M90 110 V300" stroke="#123c46" stroke-width="5"/><rect x="66" y="128" width="48" height="66" rx="10" fill="#d8f1ff" stroke="#123c46" stroke-width="3"/>'
      + '<path d="M90 194 C 110 240 160 250 200 262" fill="none" stroke="#123c46" stroke-width="2" stroke-dasharray="6 5"/>'
      + ST(270, 428, 20, '#0f8a96', 'zona del paciente', ' text-anchor="middle" font-style="italic"'));
    const BX = 80, BY = 190;
    const moments = [[1, 'Antes de tocar al paciente', 'Al entrar en su zona', 40, 290], [2, 'Antes de una tarea limpia o aséptica', 'Vía, sonda, cura, medicación', 150, 70],
      [3, 'Después del riesgo de fluidos', 'Sangre, orina, secreciones', 390, 300], [4, 'Después de tocar al paciente', 'Aunque solo le hayas tomado el pulso', 500, 220], [5, 'Después del entorno', 'Mesilla, barandilla, bomba', 520, 70]];
    // A hand, open, seen from the palm (400 × 470), for the UV lamp.
    const HAND = (fill, stroke) => svgURL(400, 470, `<g fill="${fill}" stroke="${stroke}" stroke-width="4">`
      + '<rect x="96" y="80" width="54" height="230" rx="27"/><rect x="156" y="40" width="56" height="260" rx="28"/><rect x="218" y="60" width="54" height="250" rx="27"/><rect x="278" y="110" width="50" height="210" rx="25"/>'
      + '<rect x="34" y="230" width="58" height="170" rx="29" transform="rotate(-38 63 315)"/><rect x="92" y="230" width="236" height="230" rx="70"/></g>'
      + `<g fill="none" stroke="${stroke}" stroke-width="3" opacity=".5"><path d="M120 330 Q 200 300 300 320"/><path d="M130 380 Q 210 360 290 370"/></g>`);
    const HX = 140, HY = 175;
    const spots = [[183, 54, 30], [244, 76, 26], [122, 94, 24], [303, 124, 22], [40, 268, 34], [150, 296, 28], [268, 300, 22], [212, 420, 30]];
    return numbered(tc(build({ name: 'Higiene de manos', palette: 'ocean', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        shape('rounded', 70, 100, 740, 520, '#ffffff', { opacity: 92, radius: 28, shadow: true }),
        kicker('SEGURIDAD DEL PACIENTE · TALLER DE ENFERMERÍA', 110, 140, 660, TEAL, { fontSize: 16, letterSpacing: 4 }),
        text('Manos limpias,<br>cuidados seguros', 104, 186, 680, 190, { fontFamily: H, fontSize: 66, fontWeight: 700, color: INK, lineHeight: 1.08 }),
        text('Los cinco momentos, la técnica y lo que se nos escapa', 110, 400, 660, 90, { fontSize: 28, color: DIM }),
        icon('hand-heart', 110, 532, 46, CORAL), text('Unidad de Medicina Preventiva · Hospital de ejemplo', 168, 536, 600, 40, { fontSize: 20, color: DIM }),
        bubble(960, 420, 120), bubble(1120, 250, 70), bubble(860, 210, 54), bubble(1080, 560, 46), bubble(1190, 430, 30),
        rise(bubble(900, 690, 34), 420, 'afterPrev', 3200), rise(bubble(1040, 700, 22), 520, 'withPrev', 3600), rise(bubble(1180, 700, 26), 380, 'withPrev', 2800)],
        notes: 'Portada sobre azulejos (una imagen SVG propia de fondo) y pompas de jabón: elipses con degradado radial. Tres pompas suben solas al llegar (aparecer + trayectoria encadenadas). Pregunta de arranque: ¿cuántas veces creéis que os laváis las manos en un turno?' },
      { title: 'Lo que está en juego', layout: 'titleOnly', ...P, extra: [
        img(svgURL(460, 460, Array.from({ length: 100 }, (_, i) => { const r = Math.floor(i / 10), c = i % 10, inf = [13, 27, 44, 58, 66, 81, 95].includes(i);
          return `<circle cx="${23 + c * 46}" cy="${23 + r * 46}" r="17" fill="${inf ? CORAL : '#bfe3e8'}"/>`; }).join('')), 90, 180, 460, 460, 'Cien pacientes representados con puntos: siete en coral'),
        withAnims(text('7 de cada 100', 610, 196, 620, 110, { fontFamily: H, fontSize: 78, fontWeight: 700, color: CORAL }), A('zoom-in', { start: 'afterPrev', sound: 'drumroll', duration: 700 })),
        anim(text('pacientes ingresados contrae una infección relacionada con la asistencia sanitaria.', 624, 316, 560, 130, { fontSize: 30, color: INK }), 1, 'fade-up'),
        anim(card(`<b style="color:${TEAL}">Hasta la mitad</b> se podría evitar con medidas sencillas. La primera: la higiene de manos en el momento justo.`, 624, 460, 560, 160, '#ffffff', { fontSize: 26, color: INK, borderColor: AQUA }), 2, 'fade-up')],
        notes: 'La cifra aparece sola con redoble. Orden de magnitud de los estudios de prevalencia en hospitales de países de renta alta; cifras orientativas para el taller. Insistir: no es la técnica perfecta, es el momento adecuado.' },
      { title: 'Los cinco momentos', layout: 'titleOnly', ...P, extra: [
        shape('rounded', BX - 20, BY - 20, 600, 480, '#ffffff', { opacity: 85, radius: 24 }),
        img(BED, BX, BY, 560, 440, 'Plano de una cama vista desde arriba con la zona del paciente marcada'),
        ...moments.flatMap(([n, h, d, mx, my], i) => [
          withAnims(sphere(BX + mx, BY + my, 24, AQUA, TEAL, { stroke: '#ffffff', strokeWidth: 3 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 350, sound: 'pop' })),
          withAnims(text(String(n), BX + mx - 24, BY + my - 21, 48, 42, { fontSize: 26, fontWeight: 700, color: '#ffffff', textAlign: 'center' }), A('zoom-in', { start: 'withPrev', duration: 350 })),
          withAnims(text(`<div style="font-weight:700;color:${INK};font-size:24px">${n} · ${h}</div><div style="color:${DIM}">${d}</div>`, 700, 176 + i * 96, 500, 86, { fontSize: 19 }), A('fade-left', { start: 'withPrev', duration: 350 }))])],
        notes: 'Un clic y los cinco momentos aparecen en cadena, cada uno con su número en el plano y un «pop». Los dos primeros protegen al paciente; los tres últimos, a ti y al entorno. El 4 y el 5 se confunden: si no has tocado al paciente pero sí su mesilla, es el 5.' },
      { title: 'La técnica: fricción con solución alcohólica', layout: 'titleOnly', ...P, extra: [
        ...chain([['1', 'Palma con palma'], ['2', 'Palma sobre dorso, dedos entrelazados'], ['3', 'Palma con palma, dedos entrelazados'], ['4', 'Dorso de los dedos contra la palma'], ['5', 'Pulgares, con rotación'], ['6', 'Yemas en la palma, en círculos']].map(([n, t], i) =>
          card(`<span style="display:inline-block;width:46px;height:46px;border-radius:23px;background:${TEAL};color:#fff;text-align:center;line-height:46px;font-weight:700;margin-inline-end:12px">${n}</span>${t}`,
            90 + (i % 2) * 380, 180 + Math.floor(i / 2) * 150, 350, 126, '#ffffff', { fontSize: 22, color: INK, vAlign: 'middle', pad: [14, 18, 14, 18], borderColor: '#cde7ea' })), 'fade-up', 'click'),
        shape('rounded', 880, 180, 310, 430, '#ffffff', { radius: 24, opacity: 92 }),
        text('Frota hasta que se seque', 900, 200, 270, 80, { fontSize: 26, fontWeight: 700, color: INK, textAlign: 'center' }),
        timer(30, 925, 290, 220, { style: 'ring', color: TEAL, auto: false, endText: '¡Secas!' }),
        text('20–30 segundos', 900, 530, 270, 50, { fontSize: 26, color: CORAL, textAlign: 'center', fontWeight: 700 })],
        notes: 'Los seis pasos entran seguidos con un clic. La cuenta atrás de 30 segundos se pone en marcha pulsándola: haced la fricción todos a la vez con un frasco y comprobad cuánto parece medio minuto.' },
      { title: '¿Agua y jabón o solución alcohólica?', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 380, fontSize: 24, header: true, headBg: TEAL, headFg: '#ffffff', stroke: '#cde7ea', banded: true, band: AQUA, colW: [2, 3, 3],
          rows: [['', 'Agua y jabón', 'Solución alcohólica'], ['Duración', '40–60 segundos', '20–30 segundos'], ['Cuándo', 'Manos visiblemente sucias, diarrea por C. difficile o norovirus', 'En el resto de momentos, junto a la cama'],
            ['A favor', 'Arrastra la suciedad y las esporas', 'Más rápida, eficaz y está donde se necesita'], ['Ojo con', 'Secar bien con papel', 'No sirve sobre guantes ni manos mojadas']] }),
        icon('droplet', 1100, 96, 56, AQUA)],
        notes: 'La solución alcohólica es la opción por defecto porque está en el punto de atención. El agua y jabón se reserva para suciedad visible y gérmenes que forman esporas, contra los que el alcohol no basta.' },
      { layout: 'blank', bg: '#1b1036', transition: 'fade', extra: [
        glow(200, 60, 700, '#5b2bd6', '#1b1036', 70),
        text('Bajo la lámpara ultravioleta', 90, 60, 900, 70, { fontFamily: H, fontSize: 50, fontWeight: 700, color: '#e9e2ff' }),
        img(HAND('#3a2a6e', '#b9a6ff'), HX, HY, 400, 470, 'Mano abierta vista desde la palma, bajo luz ultravioleta'),
        ...spots.map(([x, y, r], i) => withAnims(sphere(HX + x, HY + y, r, '#e8ff7a', '#3a2a6e', { opacity: 90 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 260, sound: i % 2 ? '' : 'pop' }))),
        anim(text(`<div style="font-size:30px;font-weight:700;color:#e8ff7a">Lo que brilla, no se ha frotado</div><div style="margin-top:12px">Con una crema fluorescente se ve al momento: <b>pulgares</b>, <b>yemas</b> y el espacio <b>entre los dedos</b> son lo que más se olvida.</div>`,
          640, 220, 560, 280, { fontSize: 26, color: '#e9e2ff', lineHeight: 1.45 }), 2, 'fade-left'),
        anim(text('Haz la prueba en el taller: frota, apaga la luz y mira.', 640, 540, 560, 60, { fontSize: 22, color: '#b9a6ff', fontStyle: 'italic' }), 3, 'fade-in')],
        notes: 'Cambio de fondo: la diapositiva «se apaga» como en la sala de la lámpara UV. Un clic y las zonas que más se olvidan se encienden en cadena (con sonido). Los puntos son de ejemplo, no de un estudio concreto.' },
      { title: 'Cumplimiento por momento', layout: 'titleOnly', ...P, extra: [
        shape('rounded', 70, 165, 760, 490, '#ffffff', { radius: 22, opacity: 92 }),
        chartBlock({ x: 90, y: 180, w: 720, h: 460, chartType: 'hbar', color: TEAL, dataLabels: true, labelWidth: 42, xTitle: '% de oportunidades con higiene', xMax: 100,
          data: [{ label: '1 · Antes de tocar', value: 52 }, { label: '2 · Antes de tarea aséptica', value: 61 }, { label: '3 · Tras fluidos', value: 84 }, { label: '4 · Tras tocar', value: 76 }, { label: '5 · Tras el entorno', value: 43 }] }),
        anim(text(`<div style="font-size:30px;font-weight:700;color:${CORAL}">Nos protegemos más<br>de lo que protegemos</div><div style="margin-top:14px">Los momentos «después» (el 3 y el 4) se cumplen más que los «antes», que son los que evitan infecciones al paciente.</div>`,
          870, 210, 330, 380, { fontSize: 23, color: INK, lineHeight: 1.4 }), 1, 'fade-left')],
        notes: 'Datos inventados de una observación directa en una unidad ficticia (n = 400 oportunidades), con un patrón que se repite en muchas auditorías reales: el «antes» falla más que el «después».' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'quiz', fontSize: 34, x: 70, y: 50, w: 1140, h: 620, time: 20, correct: [2],
        question: 'Recoloco la bomba de perfusión de la mesilla y salgo de la habitación sin tocar al paciente. ¿Qué momento es?', options: ['Momento 1', 'Momento 4', 'Momento 5', 'No hace falta higiene'] })],
        notes: 'Concurso de 20 segundos desde el móvil. Respuesta: momento 5, después del contacto con el entorno del paciente. Es el que peor se cumple.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        bubble(200, 360, 150), bubble(1060, 200, 110), bubble(1110, 560, 70), bubble(120, 620, 40),
        text('Tus manos son<br>el primer cuidado', 240, 220, 800, 200, { fontFamily: H, fontSize: 72, fontWeight: 700, color: INK, textAlign: 'center', lineHeight: 1.08 }),
        text('Momento justo · técnica completa · uñas cortas y sin anillos', 240, 440, 800, 50, { fontSize: 26, color: TEAL, textAlign: 'center' }),
        rise(bubble(640, 700, 30), 300, 'afterPrev', 3000)],
        notes: 'Cierre con las tres ideas: el momento, la técnica completa y unas manos preparadas (uñas cortas, sin anillos ni pulseras). Recordad el taller de la lámpara UV a la salida.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Herd immunity: a yellow vaccination booklet with ink stamps, contagion that spreads (and is cut off with Transform).
  sci_nurse_herd: { name: 'Vacunas: la inmunidad de grupo', cat: 'sci', summary: 'Cartilla de vacunas con sellos y texto curvo, contagio en cadena cortado con Transformar, ecuación, tabla con fórmulas, mitos tachados', make: () => {
    const BG = '#f5e7ae', INK = '#2e2a1f', BLUE = '#2a4a9a', RED = '#b8432f', DIM = '#6d6248', GREY = '#cdbf8e', H = pairStacks('classic').heading;
    const PAGE = svgURL(1280, 720, Array.from({ length: 17 }, (_, i) => `<path d="M0 ${40 + i * 40}H1280" stroke="#e6d38f" stroke-width="1.5"/>`).join('')
      + '<path d="M60 0V720" stroke="#d98c7a" stroke-width="2"/><rect x="18" y="18" width="1244" height="684" fill="none" stroke="#b9a466" stroke-width="2" rx="6"/>', BG);
    const P = { bg: BG, back: [deco(PAGE)] };
    // An ink stamp: two rings, the text around and a word in the middle.
    const stamp = (cx, cy, r, around, mid, color, rot = -12, a = null) => {
      const parts = [shape('ellipse', cx - r, cy - r, 2 * r, 2 * r, 'none', { stroke: color, strokeWidth: 5, opacity: 80, rotation: rot }),
        shape('ellipse', cx - r * 0.72, cy - r * 0.72, 1.44 * r, 1.44 * r, 'none', { stroke: color, strokeWidth: 2, opacity: 80, rotation: rot }),
        text(around, cx - r * 0.93, cy - r * 0.93, 1.86 * r, 1.86 * r, { fontSize: Math.round(r * 0.17), curve: 100, color, letterSpacing: 2, textAlign: 'center', fontWeight: 700, opacity: 85, rotation: rot }),
        text(mid, cx - r * 0.7, cy - r * 0.24, 1.4 * r, r * 0.48, { fontSize: Math.round(Math.min(r * 0.26, 1.25 * r / (mid.length * 0.66))), color, fontWeight: 700, textAlign: 'center', vAlign: 'middle', opacity: 85, rotation: rot })];
      return a ? parts.map((b, i) => withAnims(b, A(a.effect || 'zoom-in', { start: i ? 'withPrev' : a.start, duration: 300, ...(i ? {} : { sound: a.sound || 'pop' }) }))) : parts;
    };
    const BOOK = svgURL(440, 520, '<rect x="4" y="4" width="432" height="512" rx="10" fill="#fbf3d2" stroke="#b9a466" stroke-width="3"/>'
      + ST(30, 52, 22, '#2e2a1f', 'CARTILLA DE VACUNACIÓN', ' font-weight="700" letter-spacing="2"', 'Georgia, serif') + '<path d="M30 70H410" stroke="#2e2a1f" stroke-width="2"/>'
      + ['Vacuna', 'Fecha', 'Lote'].map((t, i) => ST([30, 230, 340][i], 100, 15, '#6d6248', t, ' font-style="italic"', 'Georgia, serif')).join('')
      + [['Hexavalente', '12/03/2024', 'A73F'], ['Neumococo', '12/03/2024', 'N219'], ['Meningococo B', '15/05/2024', 'MB04'], ['Hexavalente', '14/05/2024', 'A81K'], ['Triple vírica', '20/02/2025', 'TV33'], ['Varicela', '22/05/2025', 'V118']].map(([v, d, l], i) => {
        const y = 140 + i * 50; return `<path d="M30 ${y + 14}H410" stroke="#e1cf93"/>` + ST(30, y, 21, '#2a4a9a', v, ' font-style="italic"', "'Brush Script MT', 'Segoe Script', cursive")
          + ST(230, y, 17, '#2a4a9a', d, '', "'Courier New', monospace") + ST(340, y, 17, '#2a4a9a', l, '', "'Courier New', monospace"); }).join(''));
    // 60 people (10 × 6). The same ids on both slides, so Transform carries them.
    const COLS = 10, ROWS = 6, GX = 120, GY = 196, SP = 66, IDS = Array.from({ length: COLS * ROWS }, () => uid()), IDX = 2 * COLS + 4;
    const pos = i => [GX + (i % COLS) * SP, GY + Math.floor(i / COLS) * SP];
    const dist = i => Math.hypot(i % COLS - IDX % COLS, Math.floor(i / COLS) - Math.floor(IDX / COLS));
    const people = fillOf => IDS.map((id, i) => { const [x, y] = pos(i); return { ...dot(x, y, 22, fillOf(i)), id }; });
    const wave = (list, first) => list.map((i, k) => { const [x, y] = pos(i);
      return withAnims(dot(x, y, 22, RED, { stroke: '#ffffff', strokeWidth: 3 }), A('zoom-in', { start: k ? 'withPrev' : first, duration: 350, ...(k ? {} : { sound: 'pop' }) })); });
    const all = IDS.map((_, i) => i).filter(i => i !== IDX);
    const UNVAX = [IDX + 1, 7, 41, 55];   // (the 5 % who aren't vaccinated, plus the case who arrives)
    const panel = (html, y = 196) => card(html, 860, y, 340, 380, '#fbf3d2', { fontSize: 23, color: INK, borderColor: '#b9a466', lineHeight: 1.4 });
    return numbered(tc(build({ name: 'La inmunidad de grupo', palette: 'warm', fonts: 'classic', title: { color: INK, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        kicker('EDUCACIÓN PARA LA SALUD · PRIMARIA', 110, 120, 620, RED, { fontSize: 16, letterSpacing: 4 }),
        text('La inmunidad<br>de grupo', 104, 160, 640, 230, { fontFamily: H, fontSize: 88, fontWeight: 700, color: INK, lineHeight: 1.02 }),
        text('Por qué tu vacuna protege también a quien no puede ponérsela', 110, 410, 580, 90, { fontSize: 28, color: DIM, fontStyle: 'italic' }),
        text('Sesión para familias · Consulta de enfermería pediátrica', 110, 540, 580, 40, { fontSize: 20, color: DIM }),
        img(BOOK, 760, 100, 440, 520, 'Página de una cartilla de vacunación con seis vacunas anotadas a mano', { rotation: 4 }),
        ...stamp(1090, 572, 92, 'CENTRO DE SALUD · VACUNADO · ', 'AL DÍA', BLUE, -14, { start: 'afterPrev' })],
        notes: 'Portada de cartilla de vacunación: papel pautado amarillo (SVG propio), anotaciones «a mano» y un sello de tinta con texto curvo que cae solo con un «pop». Pregunta inicial: ¿quién guarda todavía su cartilla?' },
      { title: 'Sin vacunas: el contagio corre', layout: 'titleOnly', ...P, extra: [
        ...people(() => GREY), withAnims({ ...dot(...pos(IDX), 22, RED, { stroke: '#ffffff', strokeWidth: 3 }) }, A('zoom-in', { start: 'afterPrev', duration: 400 })),
        ...wave(all.filter(i => dist(i) <= 1.5), 'click'), ...wave(all.filter(i => dist(i) > 1.5 && dist(i) <= 3.2), 'afterPrev'), ...wave(all.filter(i => dist(i) > 3.2 && i % 7 !== 3), 'afterPrev'),
        panel(`<div style="font-size:30px;font-weight:700;color:${RED}">Sarampión</div><div style="margin-top:10px">Una persona contagiosa en un grupo sin protección contagia a <b>12–18</b> más.</div><div style="margin-top:14px;color:${DIM}">Un clic: tres oleadas y el grupo casi entero ha enfermado.</div>`)],
        notes: 'Sesenta personas, ninguna vacunada. El caso índice aparece solo; con un clic el contagio salta en tres oleadas encadenadas. El R0 del sarampión (12–18) es de los más altos que se conocen.' },
      { title: 'Con un 95 % vacunado: la cadena se corta', layout: 'titleOnly', ...P, autoAnimate: true, extra: [
        ...people(i => (UNVAX.includes(i) || i === IDX ? GREY : BLUE)), withAnims(dot(...pos(IDX), 22, RED, { stroke: '#ffffff', strokeWidth: 3 }), A('zoom-in', { start: 'afterPrev', duration: 400, delay: 600 })),
        ...wave([IDX + 1], 'click'),
        withAnims(shape('ellipse', pos(IDX)[0] - 120, pos(IDX)[1] - 120, 240, 240, 'none', { stroke: BLUE, strokeWidth: 4, dash: '10 8' }), A('zoom-in', { start: 'afterPrev', duration: 500 })),
        panel(`<div style="font-size:30px;font-weight:700;color:${BLUE}">Cortafuegos</div><div style="margin-top:10px">El virus choca con personas inmunes y se apaga tras <b>un solo</b> contagio.</div><div style="margin-top:14px;color:${DIM}">Los puntos grises que quedan sanos son bebés, personas inmunodeprimidas…</div>`)],
        notes: 'Transformar: las mismas sesenta personas (los mismos objetos) se tiñen de azul al pasar de diapositiva. Ahora el contagio solo alcanza a un vecino sin vacunar y el círculo marca dónde se detiene.' },
      { title: '¿Cuánta cobertura hace falta?', layout: 'titleOnly', ...P, extra: [
        withAnims(mathBlock({ x: 90, y: 190, w: 470, h: 130, fontSize: 56, color: INK, latex: 'p_c = 1 - \\frac{1}{R_0}' }), A('fade-in', { start: 'afterPrev', duration: 700 })),
        anim(text(`<b>R<sub>0</sub></b>: a cuántas personas contagia cada caso en un grupo sin inmunidad.<br><b>p<sub>c</sub></b>: la proporción inmune que frena la transmisión.`, 90, 350, 470, 200, { fontSize: 23, color: INK, lineHeight: 1.45 }), 1, 'fade-up'),
        anim(text('Ejemplo: R₀ = 15 → 1 − 1/15 ≈ 0,93', 90, 570, 470, 50, { fontSize: 24, color: RED, fontWeight: 700 }), 2, 'fade-up'),
        tableBlock({ x: 610, y: 190, w: 580, h: 400, fontSize: 23, header: true, headBg: INK, headFg: '#fbf3d2', stroke: '#b9a466', banded: true, band: '#e6d38f', colW: [3, 2, 2],
          rows: [['Enfermedad', 'R₀ orientativo', 'Umbral (%)'], ['Sarampión', '15', '=REDONDEAR((1-1/B2)*100;0)'], ['Tos ferina', '14', '=REDONDEAR((1-1/B3)*100;0)'], ['Varicela', '10', '=REDONDEAR((1-1/B4)*100;0)'],
            ['Paperas', '7', '=REDONDEAR((1-1/B5)*100;0)'], ['Rubéola', '6', '=REDONDEAR((1-1/B6)*100;0)'], ['Gripe', '1,5', '=REDONDEAR((1-1/B7)*100;0)']] })],
        notes: 'La ecuación aparece sola; dos clics para leerla. La última columna de la tabla es una fórmula: cambia un R0 y el umbral se recalcula. Los R0 son valores medios orientativos; dependen de la población y del contacto.' },
      { title: 'Cuando baja la cobertura, vuelve', layout: 'titleOnly', ...P, extra: [
        chartBlock({ x: 80, y: 180, w: 540, h: 400, chartType: 'line', color: BLUE, grid: true, yMin: 85, yMax: 100, yTitle: '% con 2 dosis', seriesName: 'Cobertura',
          data: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y, i) => ({ label: String(y), value: [96, 96, 95, 94, 92, 91, 90, 92, 94][i] })) }),
        chartBlock({ x: 660, y: 180, w: 540, h: 400, chartType: 'bar', color: RED, dataLabels: true, yTitle: 'Casos de sarampión',
          data: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y, i) => ({ label: String(y), value: [4, 6, 9, 14, 38, 112, 205, 96, 31][i] })) }),
        text('Una región ficticia: seis puntos menos de cobertura bastaron para multiplicar los casos por cincuenta.', 80, 610, 1120, 50, { fontSize: 22, color: DIM, fontStyle: 'italic', textAlign: 'center' })],
        notes: 'Datos inventados con un patrón que se ha visto en brotes reales: la bajada de cobertura precede a los casos con uno o dos años de retraso, y la campaña de recaptación los frena.' },
      { title: 'El calendario, de un vistazo', layout: 'titleOnly', ...P, extra: [
        dg('timeline', '2 meses\n  Hexavalente, neumococo, meningococo B\n4 meses\n  Las mismas, segunda dosis\n11 meses\n  Refuerzo de hexavalente y neumococo\n12 meses\n  Triple vírica, meningococo C\n3–4 años\n  Triple vírica y varicela\n12 años\n  VPH y meningococo ACWY',
          80, 190, 1120, 380, { colors: 'accent', oneByOne: true, fontScale: 0.9 }),
        text('Calendario orientativo: cada comunidad publica el suyo y se actualiza cada año.', 80, 600, 1120, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Línea del tiempo que se despliega hito a hito («Uno a uno al presentar»). No memorizar: lo importante es que la cartilla esté al día y saber dónde consultar el calendario oficial vigente.' },
      { title: 'Mitos que conviene desmontar', layout: 'titleOnly', ...P, extra: [
        ...[['«Las vacunas causan autismo»', 'Estudios con millones de niños lo han descartado una y otra vez.'], ['«Mejor pasar la enfermedad»', 'La enfermedad tiene complicaciones graves que la vacuna evita.'], ['«Son demasiadas vacunas a la vez»', 'Un bebé se enfrenta a miles de antígenos nuevos cada día.']].flatMap(([m, f], i) => { const y = 190 + i * 150;
          return [withAnims(text(m, 90, y, 520, 60, { fontFamily: H, fontSize: 32, color: INK, fontStyle: 'italic' }), A('strike', { start: 'click', duration: 500 })),
            withAnims(text(`<b style="color:${BLUE}">✓</b> ${f}`, 640, y - 4, 560, 110, { fontSize: 24, color: INK, bg: '#fbf3d2', radius: 10, pad: [12, 16, 12, 16], borderColor: '#b9a466' }), A('fade-left', { start: 'afterPrev', duration: 450 }))]; })],
        notes: 'Cada clic tacha un mito con una raya roja (efecto «Tachar») y a continuación entra la explicación. Hablar con respeto: la duda de una familia merece una respuesta, no un reproche.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'quiz', fontSize: 36, x: 70, y: 50, w: 1140, h: 620, time: 20, correct: [2],
        question: 'Una enfermedad tiene R₀ = 4. ¿Qué parte de la población debe ser inmune para frenarla?', options: ['25 %', '50 %', '75 %', '100 %'] })],
        notes: 'Concurso de 20 segundos. 1 − 1/4 = 0,75: el 75 %. Buen momento para volver a la ecuación y a la tabla.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        text('Tu vacuna<br>es mi escudo', 110, 170, 640, 250, { fontFamily: H, fontSize: 92, fontWeight: 700, color: INK, lineHeight: 1.02 }),
        text('Revisa tu cartilla y la de tu familia: pide cita en enfermería si falta algo.', 110, 450, 560, 90, { fontSize: 26, color: DIM, fontStyle: 'italic' }),
        ...stamp(960, 360, 170, 'INMUNIDAD DE GRUPO · ENFERMERÍA · ', 'PROTEGIDOS', RED, 10, { start: 'afterPrev', sound: 'chime' })],
        notes: 'Cierre: el sello grande cae solo con una campanilla. Dejar tiempo para preguntas de las familias.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Pressure ulcers: a pressure-mapping mattress (heat map), where it presses, Braden with formulas, the turning clock.
  sci_nurse_pressure: { name: 'Úlceras por presión: prevenir', cat: 'sci', summary: 'Mapa de presión térmico: manchas que se encienden y se apagan, Braden con fórmulas, reloj de cambios que gira, capas de piel y etiquetar', make: () => {
    const BG = '#0a1428', FG = '#eaf2ff', DIM = '#8ea3c4', BLUE = '#2f6bff', CYAN = '#2ee6d6', YEL = '#ffd23f', ORA = '#ff8a2a', RED = '#ff3b3b', H = pairStacks('clean').heading;
    const GRID = svgURL(1280, 720, `<path d="${Array.from({ length: 65 }, (_, i) => `M${i * 20} 0V720`).join('')}${Array.from({ length: 37 }, (_, i) => `M0 ${i * 20}H1280`).join('')}" stroke="#12203c" stroke-width="1"/>`, BG);
    const P = { bg: BG, back: [deco(GRID)] };
    // A hot spot: three rings of colour, from cool to hot.
    const heat = (cx, cy, r, hot = 1) => [sphere(cx, cy, r, CYAN, BG, { opacity: 55 }), sphere(cx, cy, r * 0.62, hot > 0.5 ? YEL : CYAN, BG, { opacity: 80 }), ...(hot > 0.5 ? [sphere(cx, cy, r * 0.34, hot > 0.8 ? RED : ORA, YEL, { opacity: 95 })] : [])];
    // The body lying down, seen from above (head on the left), as a faint outline.
    const TOP = svgURL(640, 300, '<g fill="#14264a" stroke="#3b5b94" stroke-width="3"><ellipse cx="60" cy="150" rx="46" ry="40"/><rect x="104" y="80" width="250" height="140" rx="60"/>'
      + '<rect x="120" y="40" width="190" height="40" rx="20"/><rect x="120" y="220" width="190" height="40" rx="20"/><rect x="340" y="96" width="270" height="50" rx="25"/><rect x="340" y="154" width="270" height="50" rx="25"/></g>');
    const hots = [[60, 150, 46, 0.6], [180, 116, 52, 0.7], [180, 184, 52, 0.7], [350, 150, 84, 1], [592, 121, 40, 0.9], [592, 179, 40, 0.9]];
    // Lying on the back, from the side, on a mattress (1000 × 260).
    const SIDE_BODY = ('<rect x="0" y="206" width="1000" height="40" rx="10" fill="#1c3156" stroke="#3b5b94" stroke-width="2"/>'
      + '<g fill="#22407a" stroke="#6f95d6" stroke-width="3"><circle cx="70" cy="158" r="46"/><path d="M118 150 C 150 112 250 104 330 112 L 560 124 C 610 124 650 150 668 168 L 900 172 C 930 172 940 150 944 112 L 962 112 C 968 150 968 190 958 204 L 120 204 Z"/></g>'
      + '<path d="M260 150 C 330 160 400 170 440 196" fill="none" stroke="#6f95d6" stroke-width="3"/>');
    const SIDE = svgURL(1000, 260, SIDE_BODY);
    // The body seen from behind (lying on the back = these are the points that bear the weight), 520 × 500 for the activity.
    const BACK_PTS = [[150, 62], [118, 150], [68, 236], [150, 288], [121, 488]];   // occiput, shoulder blade, elbow, sacrum, heel
    const BACK = svgURL(520, 500, '<g transform="translate(119 6) scale(0.94)"><g fill="#22407a" stroke="#6f95d6" stroke-width="3">'
      + '<rect x="52" y="118" width="32" height="190" rx="16"/><rect x="216" y="118" width="32" height="190" rx="16"/><rect x="96" y="296" width="50" height="200" rx="22"/><rect x="154" y="296" width="50" height="200" rx="22"/>'
      + '<rect x="88" y="106" width="124" height="204" rx="40"/><rect x="136" y="86" width="28" height="26" rx="8"/><ellipse cx="150" cy="54" rx="36" ry="42"/></g>'
      + '<path d="M150 120V300M104 132 C 112 170 128 176 140 170M196 132 C 188 170 172 176 160 170" fill="none" stroke="#6f95d6" stroke-width="2" opacity=".6"/></g>'
      + ST(500, 490, 18, '#8ea3c4', 'vista posterior', ' text-anchor="end" font-style="italic"'), BG);
    const sideX = 140, sideY = 200;
    const sidePts = [['Occipital', 40, 200], ['Escápulas', 230, 202], ['Codos', 438, 200], ['Sacro', 600, 204], ['Talones', 950, 204]];
    // The turning clock: twelve hours in six turns of two.
    const POS = [['Boca arriba', BLUE], ['De lado, derecho', CYAN], ['Boca arriba', BLUE], ['De lado, izquierdo', YEL], ['Boca arriba', BLUE], ['De lado, derecho', CYAN]];
    const arc = (a0, a1, r, cx = 210, cy = 210) => { const p = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${cx} ${cy}L${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`; };
    const CLOCK = svgURL(420, 420, POS.map(([, c], i) => `<path d="${arc(i * 60, i * 60 + 60, 196)}" fill="${c}" opacity=".85" stroke="${BG}" stroke-width="4"/>`).join('')
      + `<circle cx="210" cy="210" r="120" fill="${BG}"/>` + Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180;
        return ST((210 + 98 * Math.sin(a)).toFixed(1), (218 - 98 * Math.cos(a)).toFixed(1), 22, '#eaf2ff', String(i || 12), ' text-anchor="middle" font-weight="700"'); }).join(''));
    const HAND = svgURL(420, 420, '<path d="M206 214 L210 64 L214 214 Z" fill="#ffffff"/><circle cx="210" cy="210" r="14" fill="#ffffff"/><circle cx="210" cy="210" r="6" fill="#0a1428"/>');
    // The skin in layers, with the four stages side by side (1100 × 300).
    const L = [['Epidermis', 0, 18, '#f1c7a6'], ['Dermis', 18, 78, '#e39b84'], ['Tejido graso', 78, 170, '#f3d98c'], ['Músculo', 170, 250, '#b84a46'], ['Hueso', 250, 300, '#ece5d6']];
    const crater = [null, 'M80 0 C 110 50 170 50 200 0 Z', 'M60 0 C 80 150 200 150 220 0 Z', 'M50 0 C 60 290 220 290 230 0 Z'];
    const SKIN = svgURL(1100, 300, L.map(([, a, b, c]) => `<rect x="0" y="${a}" width="1100" height="${b - a}" fill="${c}"/>`).join('')
      + '<rect x="40" y="0" width="200" height="16" rx="6" fill="#d9483b" opacity=".75"/>'
      + crater.map((d, i) => (d ? `<path transform="translate(${i * 275} 0)" d="${d}" fill="#5a1720" stroke="#2a0a10" stroke-width="2"/>` : '')).join('')
      + [1, 2, 3].map(i => `<path d="M${i * 275} 0V300" stroke="#0a1428" stroke-width="6"/>`).join('')
      + L.slice(1).map(([n, a, b]) => ST(14, (a + b) / 2 + 6, 16, '#2a1a12', n, ' font-weight="700"')).join(''));
    return numbered(build({ name: 'Úlceras por presión', palette: 'revela', fonts: 'clean', title: { color: FG, size: 44 }, body: { color: FG } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        kicker('CUIDADOS DE ENFERMERÍA', 90, 120, 520, CYAN, { fontSize: 18 }),
        text('Úlceras<br>por presión', 84, 160, 520, 230, { fontFamily: H, fontSize: 84, fontWeight: 700, color: FG, lineHeight: 1.02 }),
        text('La piel que soporta todo el peso: dónde aprieta y cómo aliviarla', 90, 400, 470, 100, { fontSize: 26, color: DIM }),
        text('Mapa de presión de un colchón con sensores · paciente simulado', 90, 560, 470, 60, { fontSize: 18, color: '#5d7398' }),
        img(TOP, 600, 210, 640, 300, 'Silueta de una persona tumbada boca arriba vista desde arriba'),
        ...hots.flatMap(([x, y, r, h], i) => heat(600 + x, 210 + y, r, h).map((b, k) => withAnims(b, A('zoom-in', { start: i + k ? (k ? 'withPrev' : 'afterPrev') : 'afterPrev', duration: 450 })))),
        ...[['baja', CYAN], ['media', YEL], ['alta', RED]].map(([t, c], i) => text(`<span style="color:${c}">●</span> ${t}`, 720 + i * 150, 560, 140, 36, { fontSize: 20, color: DIM }))],
        notes: 'Portada con aspecto de mapa de presión (cuadrícula de sensores en SVG y manchas hechas con elipses de degradado radial). Las zonas calientes se encienden solas, una tras otra: el sacro y los talones, en rojo, son las de más presión.' },
      { title: 'Dónde aprieta', layout: 'titleOnly', ...P, extra: [
        img(SIDE, sideX, sideY, 1000, 260, 'Persona tumbada boca arriba, de perfil, sobre un colchón'),
        ...sidePts.flatMap(([n, x, y], i) => [
          withAnims(sphere(sideX + x, sideY + y, 18, RED, YEL), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' })),
          withAnims(line(sideX + x, sideY + y + 20, sideX + x, 530, '#6f95d6', 2), A('fade-in', { start: 'withPrev', duration: 300 })),
          withAnims(text(n, sideX + x - 90, 534, 180, 40, { fontSize: 24, fontWeight: 700, color: FG, textAlign: 'center' }), A('fade-up', { start: 'withPrev', duration: 300 }))]),
        anim(text(`De lado cambian: <b style="color:${YEL}">oreja, hombro, cadera (trocánter), rodilla y tobillo</b>. Sentado, el peso se va a los isquiones.`, 140, 600, 1000, 70, { fontSize: 22, color: DIM, textAlign: 'center' }), 2, 'fade-in')],
        notes: 'Un clic: las cinco zonas de apoyo en decúbito supino aparecen en cadena con un «pop». Segundo clic: las de decúbito lateral y sedestación. Son los relieves óseos con poca grasa encima.' },
      { title: 'Escala de Braden: ¿cuánto riesgo?', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 90, y: 170, w: 660, h: 470, fontSize: 22, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#24406f', banded: true, band: '#2f6bff', colW: [3, 2, 1],
          rows: [['Apartado', 'Paciente', 'Puntos'], ['Percepción sensorial', 'Algo limitada', '3'], ['Humedad', 'A menudo húmeda', '2'], ['Actividad', 'En silla', '2'], ['Movilidad', 'Muy limitada', '2'], ['Nutrición', 'Adecuada', '3'], ['Roce y cizalla', 'Problema', '1'], ['Total', '', '=SUMA(ARRIBA)']] }),
        ...[['≤ 12', 'Riesgo alto', RED], ['13 – 14', 'Riesgo moderado', ORA], ['15 – 16', 'Riesgo bajo', YEL], ['≥ 17', 'Sin riesgo aparente', CYAN]].map(([n, t, c], i) =>
          card(`<b style="font-size:26px">${n}</b>&nbsp;&nbsp;${t}`, 800, 190 + i * 100, 390, 80, c, { fontSize: 22, color: '#0a1428', vAlign: 'middle', radius: 12, pad: [10, 20, 10, 20] })),
        withAnims(shape('leftarrow', 1196, 302, 44, 36, '#ffffff'), A('fade-left', { start: 'click', duration: 400 }), A('pulse', { start: 'afterPrev', duration: 700 })),
        text('De 6 a 23 puntos: cuanto menos, más riesgo.', 800, 590, 390, 60, { fontSize: 19, color: DIM })],
        notes: 'El total de la tabla es una fórmula (=SUMA(ARRIBA)): cambia una puntuación y se recalcula. Este paciente suma 13: riesgo moderado; la flecha lo señala con un clic. Puntos de corte orientativos: cada centro usa los de su protocolo.' },
      { title: 'El reloj de los cambios posturales', layout: 'titleOnly', ...P, extra: [
        img(CLOCK, 110, 180, 420, 420, 'Reloj de doce horas dividido en seis turnos de dos horas con colores por postura'),
        withAnims(img(HAND, 110, 180, 420, 420, 'Aguja del reloj'), A('spin360', { start: 'click', duration: 6000 })),
        ...chain([[BLUE, 'Boca arriba', 'Cabecero a 30° como máximo'], [CYAN, 'De lado, derecho', 'Inclinado 30°, sin apoyar la cadera'], [YEL, 'De lado, izquierdo', 'Almohada entre las rodillas']].map(([c, h, d], i) =>
          text(`<div style="font-size:26px;font-weight:700"><span style="color:${c}">■</span> ${h}</div><div style="color:${DIM}">${d}</div>`, 620, 190 + i * 110, 560, 96, { fontSize: 21, color: FG })), 'fade-left', 'afterPrev'),
        anim(card(`Cada <b style="color:${YEL}">2 a 4 horas</b>, según el riesgo y la superficie. Anota cada cambio en el registro.`, 620, 520, 570, 100, '#13244a', { fontSize: 22, color: FG, vAlign: 'middle' }), 1, 'fade-up')],
        notes: 'Reloj de cambios posturales (SVG propio con sectores). Las posturas entran solas; con un clic la aguja da la vuelta completa al día (efecto «Dar una vuelta») y aparece la frecuencia. Muchas unidades lo cuelgan junto a la cama.' },
      { title: 'Cuatro estadios, cada vez más hondo', layout: 'titleOnly', ...P, extra: [
        img(SKIN, 90, 180, 1100, 300, 'Corte de la piel en capas con los cuatro estadios de úlcera de profundidad creciente'),
        ...chain([['I', 'Piel íntegra, roja, que no palidece al presionar'], ['II', 'Pérdida parcial: ampolla o herida superficial'], ['III', 'Llega al tejido graso, sin ver músculo'], ['IV', 'Expone músculo, tendón o hueso']].map(([n, d], i) =>
          text(`<div style="font-size:30px;font-weight:700;color:${[ORA, ORA, RED, RED][i]}">Estadio ${n}</div><div>${d}</div>`, 96 + i * 275, 500, 255, 140, { fontSize: 20, color: FG, lineHeight: 1.35 })), 'fade-up', 'click')],
        notes: 'Un corte de piel dibujado en SVG con sus capas. Con un clic, los cuatro estadios se describen uno tras otro. Recordar que el estadio I es reversible: detectarlo a tiempo es el objetivo de la vigilancia diaria de la piel.' },
      { title: 'Lo que consigue un programa de prevención', layout: 'titleOnly', ...P, extra: [
        chartBlock({ x: 80, y: 170, w: 780, h: 460, chartType: 'line', color: CYAN, grid: true, labelColor: FG, yTitle: '% de pacientes con úlcera nueva', dataLabels: true,
          data: ['T1 24', 'T2 24', 'T3 24', 'T4 24', 'T1 25', 'T2 25', 'T3 25', 'T4 25'].map((l, i) => ({ label: l, value: [7.9, 8.4, 7.6, 6.1, 4.8, 4.1, 3.6, 3.3][i] })) }),
        withAnims(stat('−58 %', 'úlceras nuevas en dos años', 900, 220, 300, YEL, FG, 84), A('zoom-in', { start: 'afterPrev', duration: 600, sound: 'chime' })),
        anim(text('El programa empezó en el 4.º trimestre de 2024: Braden al ingreso, superficies especiales y registro de cambios.', 900, 430, 300, 200, { fontSize: 20, color: DIM, lineHeight: 1.4 }), 1, 'fade-up')],
        notes: 'Datos inventados de una unidad ficticia, con una forma realista: el descenso tarda un par de trimestres en notarse. La cifra entra sola con campanilla.' },
      { title: 'Cinco frentes a la vez', layout: 'titleOnly', ...P, extra: [
        dg('cycle', 'Superficie\n  Según riesgo\nMovilizar\n  Cambios\nPiel\n  Cada día\nNutrición\n  Proteínas\nHumedad\n  Piel seca', 200, 150, 880, 530, { colors: 'colorful', oneByOne: true, textColor: FG, fontScale: 2.2 })],
        notes: 'Ciclo que aparece paso a paso («Uno a uno al presentar»). Superficie según el riesgo, cambios posturales, revisar la piel cada día, proteínas y líquidos, y proteger de la orina y el sudor. Ninguna medida sola basta: el paquete completo es lo que reduce las úlceras.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'label', fontSize: 30, x: 60, y: 50, w: 1160, h: 620, question: 'Señala las zonas de más presión boca arriba', image: BACK,
        options: sidePts.map(p => p[0]), points: BACK_PTS.map(([x, y]) => ({ x: Math.round((119 + 0.94 * x) / 5.2), y: Math.round((6 + 0.94 * y) / 5) })) })],
        notes: 'Actividad «Etiquetar una imagen» con nota: cada estudiante arrastra desde el móvil los nombres a los puntos del dibujo. El cuerpo se ve por detrás: boca arriba, esas son justo las zonas que cargan el peso.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        img(TOP, 600, 210, 640, 300, 'Silueta tumbada vista desde arriba, ya sin zonas de presión'),
        ...hots.flatMap(([x, y, r, h]) => heat(600 + x, 210 + y, r, h)).map((b, i) => withAnims(b, A('fade-out', { start: i ? 'withPrev' : 'afterPrev', duration: 1600, delay: 600 }))),
        text('Cada cambio<br>postural cuenta', 84, 210, 520, 200, { fontFamily: H, fontSize: 64, fontWeight: 700, color: FG, lineHeight: 1.08 }),
        text('Valorar al ingreso · mover · mirar la piel cada día', 90, 440, 480, 80, { fontSize: 24, color: CYAN })],
        notes: 'Cierre: las zonas de presión se apagan solas, como al cambiar de postura. Repasar las tres ideas: valorar, mover y vigilar.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · IV fluids: a drip set drawn in SVG, drops that fall with a sound, the formula step by step, a table that calculates, a pump.
  sci_nurse_drip: { name: 'Fluidoterapia: calcular el goteo', cat: 'sci', summary: 'Equipo de suero dibujado con gotas que caen con sonido, fórmula paso a paso, ejemplo resuelto, tabla que calcula, bomba y cuenta atrás', make: () => {
    const BG = '#eef3f8', INK = '#14304a', BLUE = '#1f6fb2', CYAN = '#16a3c4', ORANGE = '#e86f2a', DIM = '#5f7489', H = pairStacks('tech').heading;
    const P = { bg: BG };
    // The drip set (240 × 600): the bag, the drip chamber, the roller clamp, the line.
    const SET = svgURL(240, 600, '<path d="M120 0V24" stroke="#5f7489" stroke-width="4"/><circle cx="120" cy="30" r="8" fill="none" stroke="#5f7489" stroke-width="4"/>'
      + '<rect x="30" y="38" width="180" height="290" rx="26" fill="#ffffff" stroke="#9fb3c8" stroke-width="4"/><rect x="34" y="120" width="172" height="204" rx="22" fill="#cfe9f6"/>'
      + '<rect x="56" y="70" width="128" height="104" rx="6" fill="#ffffff" stroke="#1f6fb2" stroke-width="2"/>' + ST(120, 100, 15, '#14304a', 'CLORURO SÓDICO', ' text-anchor="middle" font-weight="700"')
      + ST(120, 126, 22, '#1f6fb2', '0,9 %', ' text-anchor="middle" font-weight="700"') + ST(120, 156, 20, '#14304a', '1000 mL', ' text-anchor="middle"')
      + [0, 1, 2, 3, 4].map(i => `<path d="M186 ${190 + i * 26}h18" stroke="#5f7489" stroke-width="2"/>`).join('')
      + '<path d="M120 328V370" stroke="#9fb3c8" stroke-width="6"/><rect x="96" y="370" width="48" height="110" rx="14" fill="#ffffff" fill-opacity=".6" stroke="#9fb3c8" stroke-width="4"/><rect x="100" y="440" width="40" height="36" rx="10" fill="#cfe9f6"/>'
      + '<path d="M120 480V600" stroke="#9fb3c8" stroke-width="6"/><rect x="100" y="520" width="40" height="44" rx="8" fill="#1f6fb2"/><circle cx="120" cy="542" r="12" fill="#e86f2a"/>');
    const drop = (x, y, s = 14) => shape('teardrop', x, y, s, s * 1.3, CYAN, { rotation: 135 });
    const drops = (sx, sy, n, first = 'afterPrev', sound = 'click', k = 1) => Array.from({ length: n }, (_, i) =>
      withAnims(drop(sx + 113 * k, sy + 384 * k), A('fade-in', { start: i ? 'afterPrev' : first, duration: 200, ...(sound && { sound }) }), path([[0, 44]], { start: 'afterPrev', duration: 450 }), A('fade-out', { start: 'withPrev', duration: 200, delay: 300 })));
    // An infusion pump (420 × 300).
    const PUMP = svgURL(420, 300, '<rect x="6" y="6" width="408" height="288" rx="26" fill="#d9e2ec" stroke="#9fb3c8" stroke-width="4"/><rect x="30" y="30" width="250" height="150" rx="10" fill="#0f2a3d"/>'
      + ST(48, 78, 20, '#7fd6ff', 'VELOCIDAD', ' font-weight="700"', 'monospace') + ST(48, 132, 48, '#ffffff', '125', ' font-weight="700"', 'monospace') + ST(150, 132, 22, '#7fd6ff', 'mL/h', '', 'monospace')
      + ST(48, 166, 17, '#9fe0a8', 'VOL 1000 mL · 8 h', '', 'monospace')
      + ['#2e9e5b', '#e86f2a', '#1f6fb2'].map((c, i) => `<rect x="300" y="${30 + i * 52}" width="90" height="40" rx="10" fill="${c}"/>`).join('')
      + ST(345, 56, 16, '#fff', 'INICIO', ' text-anchor="middle" font-weight="700"') + ST(345, 108, 16, '#fff', 'PAUSA', ' text-anchor="middle" font-weight="700"') + ST(345, 160, 16, '#fff', 'MENÚ', ' text-anchor="middle" font-weight="700"')
      + Array.from({ length: 12 }, (_, i) => `<rect x="${30 + (i % 4) * 64}" y="${200 + Math.floor(i / 4) * 30}" width="54" height="22" rx="6" fill="#ffffff" stroke="#9fb3c8"/>`).join(''));
    return numbered(tc(build({ name: 'Calcular el goteo', palette: 'office', fonts: 'tech', title: { color: INK, size: 44 }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 14, 720, BLUE), shape('rect', 14, 0, 4, 720, CYAN)] }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        shape('rect', 812, 0, 6, 720, '#b7c6d6'), shape('rect', 812, 54, 166, 6, '#b7c6d6'),
        img(SET, 850, 60, 240, 600, 'Bolsa de suero con cámara de goteo, regulador y línea'),
        ...drops(850, 60, 4),
        kicker('FARMACOLOGÍA Y CÁLCULO DE DOSIS', 90, 150, 640, BLUE, { fontSize: 18 }),
        text('¿Cuántas gotas<br>por minuto?', 84, 190, 700, 230, { fontFamily: H, fontSize: 82, fontWeight: 700, color: INK, lineHeight: 1.03 }),
        text('Fluidoterapia: del volumen prescrito al ritmo del gotero', 90, 430, 640, 90, { fontSize: 28, color: DIM }),
        text('Seminario de 1.º de Enfermería · práctica en sala de simulación', 90, 580, 640, 40, { fontSize: 20, color: DIM })],
        notes: 'Portada: el equipo de suero es un dibujo SVG propio; cuatro gotas caen solas en la cámara, cada una con un «clic» (aparecer, trayectoria y desvanecer encadenados).' },
      { title: 'Las piezas del equipo', layout: 'titleOnly', ...P, extra: [
        img(SET, 150, 110, 224, 560, 'Equipo de suero con sus piezas'),
        ...chain([['Bolsa o frasco', 'Volumen y concentración en la etiqueta', 250], ['Cámara de goteo', 'Aquí se cuentan las gotas', 507], ['Regulador de rodillo', 'Abre o cierra el paso', 616]].map(([h, d, y]) => [
          line(310, y, 560, y, BLUE, 2, { dash: '6 6' }), text(`<div style="font-size:28px;font-weight:700;color:${BLUE}">${h}</div><div style="color:${DIM}">${d}</div>`, 580, y - 44, 600, 90, { fontSize: 22 })]).flat(), 'fade-in', 'click'),
        anim(card(`<b>Macrogotero</b>: 20 gotas = 1 mL<br><b>Microgotero</b>: 60 gotas = 1 mL`, 580, 330, 600, 100, '#ffffff', { fontSize: 22, color: INK, borderColor: '#b7c6d6', vAlign: 'middle' }), 2, 'fade-up')],
        notes: 'Un clic y las tres piezas se señalan en cadena (líneas guía y rótulos). El factor de goteo viene en el envase del equipo: compruébalo siempre, no lo supongas.' },
      { title: 'La fórmula', layout: 'titleOnly', ...P, extra: [
        withAnims(mathBlock({ x: 90, y: 190, w: 1100, h: 170, fontSize: 64, color: INK, latex: '\\text{gotas/min} = \\frac{V\\,(\\text{mL}) \\times f}{t\\,(\\text{min})}' }), A('zoom-in', { start: 'afterPrev', duration: 600 })),
        ...chain([['V', 'Volumen que hay que pasar'], ['f', 'Factor de goteo: 20 o 60'], ['t', 'Tiempo en minutos (horas × 60)']].map(([s, d], i) =>
          card(`<div style="font-family:${H};font-size:44px;font-weight:700;color:${[BLUE, ORANGE, CYAN][i]}">${s}</div><div>${d}</div>`, 90 + i * 375, 400, 350, 150, '#ffffff', { fontSize: 22, color: INK, borderColor: '#b7c6d6', textAlign: 'center' })), 'fade-up', 'click'),
        anim(text(`Atajo: con <b>microgotero</b>, gotas por minuto = mL por hora.`, 90, 590, 1100, 50, { fontSize: 24, color: ORANGE, textAlign: 'center' }), 2, 'fade-in')],
        notes: 'La ecuación entra sola. Primer clic: qué es cada letra. Segundo: el atajo del microgotero (60 gotas/mL ÷ 60 min = 1), muy útil en pediatría.' },
      { title: 'Ejemplo: 1000 mL en 8 horas', layout: 'titleOnly', ...P, extra: [
        anim(mathBlock({ x: 90, y: 190, w: 700, h: 90, fontSize: 40, color: DIM, latex: 't = 8 \\times 60 = 480\\ \\text{min}' }), 1, 'fade-up'),
        anim(mathBlock({ x: 90, y: 300, w: 700, h: 120, fontSize: 44, color: INK, latex: '\\frac{1000 \\times 20}{480} = 41{,}7' }), 2, 'fade-up'),
        withAnims(text('≈ 42 gotas/min', 90, 450, 700, 90, { fontFamily: H, fontSize: 60, fontWeight: 700, color: BLUE }), A('zoom-in', { start: 'click', sound: 'chime', duration: 500 })),
        anim(text('Redondea al entero: no se puede contar media gota.', 90, 560, 700, 50, { fontSize: 22, color: DIM }), 3, 'fade-in'),
        shape('rounded', 860, 180, 330, 440, '#ffffff', { radius: 22, stroke: '#b7c6d6', strokeWidth: 2 }),
        text('Macrogotero', 860, 210, 330, 40, { fontSize: 22, color: DIM, textAlign: 'center' }),
        icon('droplet', 965, 270, 120, CYAN),
        text('f = 20', 860, 420, 330, 70, { fontFamily: H, fontSize: 52, fontWeight: 700, color: ORANGE, textAlign: 'center' }),
        text('gotas por mL', 860, 500, 330, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Tres clics: el tiempo en minutos, la cuenta y el resultado con campanilla. Repetidlo en voz alta: «volumen por factor entre minutos».' },
      { title: 'Una tabla que calcula por ti', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 330, fontSize: 24, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#b7c6d6', banded: true, band: CYAN, colW: [4, 2, 2, 2, 3],
          rows: [['Prescripción', 'Volumen (mL)', 'Horas', 'mL/h', 'Gotas/min (f = 20)'], ['Suero fisiológico 0,9 %', '1000', '8', '=REDONDEAR(B2/C2;0)', '=REDONDEAR(B2*20/(C2*60);0)'],
            ['Glucosado 5 %', '500', '6', '=REDONDEAR(B3/C3;0)', '=REDONDEAR(B3*20/(C3*60);0)'], ['Ringer lactato', '1500', '12', '=REDONDEAR(B4/C4;0)', '=REDONDEAR(B4*20/(C4*60);0)'],
            ['Antibiótico diluido', '100', '0,5', '=REDONDEAR(B5/C5;0)', '=REDONDEAR(B5*20/(C5*60);0)']] }),
        text('Las dos últimas columnas son fórmulas: cambia el volumen o las horas y se recalculan.', 90, 540, 1100, 40, { fontSize: 22, color: DIM }),
        anim(card('Doble verificación: otra enfermera repite el cálculo antes de conectar.', 90, 600, 1100, 70, '#fff3ea', { fontSize: 22, color: INK, borderColor: ORANGE, vAlign: 'middle' }), 1, 'fade-up')],
        notes: 'Tabla con fórmulas (=REDONDEAR(B2*20/(C2*60);0)): sirve como hoja de comprobación. Prescripciones de ejemplo, no pautas para un paciente real.' },
      { title: 'Cuando el ritmo lo marca una bomba', layout: 'titleOnly', ...P, extra: [
        img(PUMP, 90, 200, 520, 371, 'Bomba de perfusión que muestra 125 mL por hora'),
        text(ul('Fármacos de margen estrecho: insulina, heparina, potasio', 'Pediatría y neonatos', 'Nutrición parenteral', 'Ritmos muy lentos o muy exactos'), 660, 190, 540, 300, { fontSize: 25, color: INK, lineHeight: 1.45 }),
        anim(card(`La bomba se programa en <b>mL/h</b>: 1000 mL en 8 h → <b style="color:${BLUE}">125 mL/h</b>.`, 660, 510, 540, 100, '#ffffff', { fontSize: 23, color: INK, borderColor: '#b7c6d6', vAlign: 'middle' }), 1, 'fade-up')],
        notes: 'Bomba dibujada en SVG (sin ninguna marca). Las bombas no ahorran comprobar: revisa velocidad, volumen y línea en cada ronda.' },
      { title: 'Práctica: cuenta las gotas', layout: 'titleOnly', ...P, extra: [
        img(SET, 150, 110, 224, 560, 'Equipo de suero goteando'),
        ...drops(150, 110, 6, 'click', '', 0.933),
        text('Cuenta las gotas durante <b>15 segundos</b> y multiplica por 4. ¿Coincide con lo que calculaste?', 460, 190, 720, 130, { fontSize: 28, color: INK }),
        timer(15, 560, 350, 520, { style: 'digital', color: BLUE, w: 520, h: 180, auto: false, endText: '¡Para!' }),
        text('Pulsa la cuenta atrás cuando caiga la primera gota.', 460, 560, 720, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'En el taller, cada pareja ajusta el rodillo hasta el ritmo calculado. Con un clic empiezan a caer gotas; la cuenta atrás de 15 segundos se pone en marcha al pulsarla.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'quiz', fontSize: 36, x: 70, y: 50, w: 1140, h: 620, time: 30, correct: [2],
        question: 'Hay que pasar 500 mL en 4 horas con microgotero. ¿Cuántas gotas por minuto?', options: ['42', '83', '125', '250'] })],
        notes: 'Concurso de 30 segundos. 500 / 4 = 125 mL/h y, con microgotero, 125 gotas/min. Quien eligió 42 usó el factor 20.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        text('Calcula, verifica, observa', 90, 150, 1100, 90, { fontFamily: H, fontSize: 64, fontWeight: 700, color: INK, textAlign: 'center' }),
        dg('chevrons', 'Leer la prescripción\nCalcular\nVerificar con otra persona\nAjustar el ritmo\nVigilar al paciente', 90, 300, 1100, 160, { colors: 'accent', oneByOne: true }),
        text('Material docente: las cifras son de ejemplo y no sustituyen el protocolo de tu unidad.', 90, 540, 1100, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'Cierre con la secuencia segura en galones que se despliegan uno a uno. La vigilancia del paciente (signos de sobrecarga, zona de punción) es parte del cálculo.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Basic life support: green safety signs and white pictograms, hands that compress in rhythm, AED pads that fly to the chest.
  sci_nurse_cpr: { name: 'RCP básica: soporte vital', cat: 'sci', summary: 'Señalética verde de emergencia: manos que comprimen al ritmo, parches del DEA que vuelan con sonido, dos series, cuenta atrás y ordenar', make: () => {
    const GREEN = '#00843d', DKG = '#005a2b', INK = '#14231a', RED = '#d7262e', YEL = '#ffd100', DIM = '#4d6155', LIGHT = '#f2f7f3', H = pairStacks('bold').heading;
    // The AED sign: a heart with a lightning bolt and a small cross (white on green).
    const AED = (c = '#ffffff', bg = GREEN) => svgURL(300, 300, `<rect x="6" y="6" width="288" height="288" rx="30" fill="${bg}" stroke="${c}" stroke-width="10"/>`
      + `<path d="M150 252C92 208 52 172 52 120C52 84 80 58 112 58C130 58 142 66 150 80C158 66 170 58 188 58C220 58 248 84 248 120C248 172 208 208 150 252Z" fill="${c}"/>`
      + `<path d="M160 86L118 160H150L136 220L184 136H152Z" fill="${bg}"/><path d="M236 40h16v-16h14v16h16v14h-16v16h-14v-16h-16z" fill="${c}"/>`);
    // The chest from the side, and the hands with the arms straight (they move on their own).
    const CHEST = svgURL(560, 300, '<rect x="0" y="250" width="560" height="20" rx="6" fill="#c9d8cd"/>'
      + '<path d="M20 250 C 30 170 120 140 260 138 C 400 136 500 170 540 250 Z" fill="#f1d3bd" stroke="#14231a" stroke-width="4"/>'
      + '<path d="M200 150 C 240 146 300 146 330 150" stroke="#14231a" stroke-width="3" fill="none" opacity=".5"/>'
      + '<path d="M420 120 V 150 M410 130 L420 120 L430 130 M420 252 V 222 M410 242 L420 252 L430 242" stroke="#d7262e" stroke-width="4" fill="none"/>'
      + ST(404, 196, 26, '#d7262e', '5–6 cm', ' font-weight="700" text-anchor="end"'));
    const HANDS = svgURL(160, 300, '<rect x="58" y="0" width="44" height="210" rx="20" fill="#2f6f4a"/><rect x="30" y="200" width="100" height="46" rx="20" fill="#f1d3bd" stroke="#14231a" stroke-width="4"/>'
      + '<rect x="40" y="232" width="80" height="36" rx="16" fill="#e8c2a7" stroke="#14231a" stroke-width="4"/>');
    // A torso from the front for the AED pads.
    const TORSO = svgURL(420, 460, '<path d="M120 20 C 150 0 270 0 300 20 L 380 70 C 400 90 404 160 396 260 L 380 440 L 40 440 L 24 260 C 16 160 20 90 40 70 Z" fill="#f1d3bd" stroke="#14231a" stroke-width="4"/>'
      + '<path d="M210 60 V 300" stroke="#14231a" stroke-width="3" opacity=".35"/><path d="M80 90 C 140 110 180 110 210 100 M340 90 C 280 110 240 110 210 100" fill="none" stroke="#14231a" stroke-width="3" opacity=".35"/>'
      + '<circle cx="150" cy="200" r="6" fill="#c08e74"/><circle cx="270" cy="200" r="6" fill="#c08e74"/>');
    const pad = (x, y, rot) => shape('rounded', x, y, 96, 130, '#ffffff', { stroke: '#f08a24', strokeWidth: 5, radius: 14, rotation: rot });
    const sign = (ic, label, x, y) => [shape('rounded', x, y, 300, 300, '#ffffff', { radius: 30 }), icon(ic, x + 90, y + 50, 120, GREEN),
      text(label, x, y + 200, 300, 70, { fontFamily: H, fontSize: 40, fontWeight: 700, color: GREEN, textAlign: 'center' })];
    const SL = (rest) => ({ bg: LIGHT, back: [shape('rect', 0, 0, 1280, 16, GREEN)], ...rest });
    return numbered(tc(build({ name: 'RCP básica', palette: 'forest', fonts: 'bold', title: { color: DKG, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: GREEN, transition: 'fade', extra: [
        shape('rect', 0, 600, 1280, 120, DKG),
        kicker('PRIMEROS AUXILIOS · ENFERMERÍA COMUNITARIA', 90, 110, 700, '#ffffff', { fontSize: 18, opacity: 85 }),
        text('RCP', 80, 140, 640, 240, { fontFamily: H, fontSize: 230, fontWeight: 800, color: '#ffffff', lineHeight: 1, wordart: 'shadow' }),
        text('Soporte vital básico:<br>lo que cualquiera puede hacer', 90, 390, 640, 130, { fontSize: 36, color: '#ffffff', lineHeight: 1.2 }),
        withAnims(img(AED(), 820, 120, 360, 360, 'Señal de desfibrilador: corazón con un rayo y una cruz'), A('zoom-in', { start: 'afterPrev', duration: 500 }), A('pulse', { start: 'afterPrev', duration: 800 })),
        shape('rightarrow', 900, 500, 200, 80, '#ffffff'),
        text('Taller para la comunidad · 2 horas · con maniquí', 90, 630, 900, 50, { fontSize: 24, color: '#ffffff' })],
        notes: 'Portada con el lenguaje de las señales de emergencia: verde, pictograma blanco y flecha. La señal del DEA es un SVG propio que entra y late. Pregunta: ¿sabéis dónde está el desfibrilador más cercano a vuestra casa?' },
      SL({ title: 'La cadena de supervivencia', layout: 'titleOnly', extra: [
        dg('chevrons', 'Reconocer\n  y llamar al 112\nRCP\n  inmediata\nDesfibrilar\n  cuanto antes\nSoporte\n  avanzado\nCuidados\n  tras la parada', 90, 200, 1100, 270, { colors: 'accent', oneByOne: true, fontScale: 1.3 }),
        anim(card(`Los tres primeros eslabones están en manos de <b style="color:${GREEN}">quien está al lado</b>, no de la ambulancia.`, 90, 510, 1100, 110, '#ffffff', { fontSize: 28, color: INK, vAlign: 'middle', borderColor: GREEN }), 6, 'fade-up')],
        notes: 'Los cinco eslabones aparecen uno a uno con cada clic («Uno a uno al presentar»); el último clic subraya que los tres primeros dependen del testigo.' }),
      SL({ title: 'Cada minuto cuenta', layout: 'titleOnly', extra: [
        withAnims(stat('−10 %', 'de probabilidad de sobrevivir por cada minuto sin RCP', 90, 190, 340, RED, INK, 96), A('zoom-in', { start: 'afterPrev', sound: 'drumroll', duration: 700 })),
        anim(text('Con RCP de un testigo la caída se frena a la espera del desfibrilador.', 90, 470, 340, 150, { fontSize: 24, color: DIM }), 1, 'fade-up'),
        chartBlock({ x: 470, y: 170, w: 730, h: 480, chartType: 'line', color: RED, grid: true, seriesName: 'Sin RCP', xTitle: 'Minutos hasta la desfibrilación', yTitle: 'Supervivencia relativa (%)', yMin: 0, yMax: 100,
          data: Array.from({ length: 11 }, (_, m) => ({ label: String(m), value: Math.max(5, 100 - m * 10) })), series: [{ name: 'Con RCP del testigo', values: Array.from({ length: 11 }, (_, m) => 100 - m * 4), color: GREEN }] })],
        notes: 'La cifra aparece sola con redoble. Las curvas son esquemáticas (valores relativos inventados a partir del orden de magnitud que se cita en las guías): lo que importa es la diferencia de pendiente.' }),
      SL({ title: 'Comprimir bien', layout: 'titleOnly', extra: [
        img(CHEST, 90, 330, 560, 300, 'Tórax de perfil con la profundidad de compresión'),
        withAnims(img(HANDS, 270, 196, 160, 300, 'Brazos estirados y manos entrelazadas sobre el esternón'), path(Array.from({ length: 16 }, (_, i) => [0, i % 2 ? 0 : 26]), { start: 'click', duration: 4400, sound: 'click' })),
        ...chain([['100–120', 'compresiones por minuto'], ['5–6 cm', 'de profundidad en el adulto'], ['Dejar', 'que el pecho vuelva arriba del todo'], ['30 : 2', 'si sabes y quieres ventilar']].map(([n, t], i) =>
          card(`<span style="font-family:${H};font-size:36px;font-weight:800;color:${i === 1 ? RED : GREEN}">${n}</span>&nbsp; ${t}`, 700, 180 + i * 115, 500, 96, '#ffffff', { fontSize: 22, color: INK, vAlign: 'middle', borderColor: '#cfe0d4' })), 'fade-left', 'afterPrev')],
        notes: 'Las cuatro claves entran solas. Con un clic, las manos comprimen ocho veces a unos 110 por minuto (una trayectoria de ida y vuelta, con sonido al empezar). Contad en voz alta mientras se mueven.' }),
      SL({ title: 'El desfibrilador hace el resto', layout: 'titleOnly', extra: [
        img(TORSO, 110, 180, 380, 416, 'Torso de frente'),
        img(AED('#ffffff', GREEN), 1005, 170, 200, 200, 'Desfibrilador externo automático'),
        withAnims(pad(1005, 400, 0), path([[-300, -120], [-600, -190], [-843, -185]], { start: 'click', duration: 1400, sound: 'whoosh' }), A('spin360', { start: 'withPrev', duration: 1400 })),
        withAnims(pad(1110, 400, 0), path([[-300, 60], [-560, 30], [-749, -41]], { start: 'afterPrev', duration: 1400, sound: 'whoosh' })),
        ...chain(['Enciéndelo: te habla y te guía', 'Un parche bajo la clavícula derecha, otro bajo la axila izquierda', '«Nadie toque al paciente» durante el análisis y la descarga'].map((t, i) =>
          text(`<b style="color:${GREEN};font-size:32px">${i + 1}</b><br>${t}`, 560, 190 + i * 140, 400, 120, { fontSize: 22, color: INK })), 'fade-up', 'afterPrev')],
        notes: 'Un clic: los dos parches salen del desfibrilador y vuelan a su sitio (trayectorias con silbido) y después aparecen los tres pasos. El DEA está diseñado para que lo use cualquiera: solo descarga si detecta un ritmo que lo necesita.' }),
      { layout: 'blank', bg: DKG, extra: [
        text('Relevo cada dos minutos', 90, 70, 1100, 80, { fontFamily: H, fontSize: 50, fontWeight: 700, color: '#ffffff' }),
        timer(120, 90, 190, 400, { style: 'ring', color: YEL, auto: false, endText: '¡Relevo!' }),
        text(`<div style="font-size:34px;font-weight:700;color:${YEL}">Comprimir cansa</div><div style="margin-top:14px">A los dos minutos la profundidad baja sin que te des cuenta. Cambiad de persona en menos de 10 segundos y sin dejar de contar.</div>`, 580, 200, 610, 300, { fontSize: 27, color: '#ffffff', lineHeight: 1.4 }),
        text('En el taller: pulsa la cuenta atrás y comprime al maniquí hasta el relevo.', 580, 540, 610, 80, { fontSize: 22, color: '#b9dcc6' })],
        notes: 'Fondo verde oscuro para la práctica. La cuenta atrás de 2 minutos (estilo anillo) se pone en marcha al pulsarla y avisa con sonido al final.' },
      SL({ title: 'Adulto, niño y lactante', layout: 'titleOnly', extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 380, fontSize: 24, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#cfe0d4', banded: true, band: GREEN, colW: [3, 3, 3, 3],
          rows: [['', 'Adulto', 'Niño', 'Lactante (< 1 año)'], ['Compresiones : ventilaciones', '30 : 2', '15 : 2 (sanitarios)', '15 : 2 (sanitarios)'], ['Profundidad', '5–6 cm', '⅓ del tórax (≈ 5 cm)', '⅓ del tórax (≈ 4 cm)'],
            ['Con qué', 'Dos manos', 'Una o dos manos', 'Dos dedos o dos pulgares'], ['Antes de empezar', 'Llamar al 112', '5 ventilaciones de rescate', '5 ventilaciones de rescate']] }),
        text('Pauta orientativa basada en las guías de reanimación vigentes; sigue la formación acreditada de tu centro.', 90, 590, 1100, 40, { fontSize: 20, color: DIM })],
        notes: 'En niños la causa suele ser respiratoria: por eso las ventilaciones de rescate van primero. Si no sabes ventilar, comprime igualmente.' }),
      SL({ layout: 'blank', extra: [pollBlock({ kind: 'order', fontSize: 34, x: 60, y: 60, w: 1160, h: 610, question: 'Ordena lo que harías al ver a alguien desplomarse',
        options: ['Comprobar que la zona es segura', 'Ver si responde y respira con normalidad', 'Llamar al 112 y pedir un DEA', 'Empezar las compresiones', 'Colocar el DEA en cuanto llegue'] })],
        notes: 'Actividad «Ordenar» con nota: los pasos llegan desordenados a cada móvil. Comentad los errores más frecuentes (empezar sin llamar, buscar el pulso demasiado tiempo).' }),
      { layout: 'blank', bg: GREEN, transition: 'zoom', extra: [
        ...[['phone', 'Llama', 90], ['heart-pulse', 'Comprime', 490], ['bolt', 'Desfibrila', 890]].flatMap(([ic, t, x], i) => sign(ic, t, x, 150).map(b => withAnims(b, A('zoom-in', { start: i ? 'afterPrev' : 'afterPrev', duration: 400 })))),
        text('Nadie lo hace mal si lo intenta: lo único que no sirve es no hacer nada.', 90, 520, 1100, 80, { fontSize: 30, color: '#ffffff', textAlign: 'center' })],
        notes: 'Cierre con tres señales que entran solas: llama, comprime, desfibrila. La última frase es el mensaje para quitar el miedo a actuar.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · An outbreak investigation: a corkboard with pinned notes and red string, the epidemic curve, attack rates that calculate, code.
  sci_nurse_outbreak: { name: 'Investigar un brote alimentario', cat: 'sci', summary: 'Tablero de corcho: notas con chinchetas e hilo rojo que se dibuja, curva epidémica, tabla con fórmulas, riesgo relativo, código y votación', make: () => {
    const CORK = '#c4925a', INK = '#2b2620', RED = '#c0392b', PAPER = '#fffdf6', NOTE = '#fff1a1', BLUE = '#2f5d8a', DIM = '#6b5f52', H = pairStacks('editorial').heading;
    const r = rng(11);
    const CORKBG = svgURL(1280, 720, Array.from({ length: 900 }, () => `<ellipse cx="${(r() * 1280).toFixed(0)}" cy="${(r() * 720).toFixed(0)}" rx="${(1 + r() * 4).toFixed(1)}" ry="${(1 + r() * 2.5).toFixed(1)}" fill="${r() > 0.5 ? '#9c6c38' : '#e0b27a'}" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`).join(''), CORK);
    const P = { bg: CORK, back: [deco(CORKBG)] };
    const pin = (cx, cy, c = RED) => [dot(cx + 3, cy + 4, 9, '#000000', { opacity: 25 }), sphere(cx, cy, 10, '#ffffff', c)];
    const sheet = (x, y, w, h, rot = 0, fill = PAPER) => shape('rect', x, y, w, h, fill, { rotation: rot, shadow: true });
    const string = (pts, start = 'afterPrev', duration = 900) => withAnims(ink(pts, RED, 3), A('draw', { start, duration }));
    return numbered(tc(build({ name: 'Brote alimentario', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 44 }, body: { color: INK } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        sheet(90, 110, 700, 430, -1.5), ...pin(440, 128),
        kicker('VIGILANCIA EPIDEMIOLÓGICA · SALUD PÚBLICA', 130, 160, 620, RED, { fontSize: 16, rotation: -1.5 }),
        text('Brote en<br>el banquete', 124, 200, 640, 210, { fontFamily: H, fontSize: 84, fontWeight: 700, color: INK, lineHeight: 1.02, rotation: -1.5 }),
        text('Cómo se investiga una intoxicación alimentaria, paso a paso', 130, 430, 620, 80, { fontSize: 26, color: DIM, fontStyle: 'italic', rotation: -1.5 }),
        sheet(880, 100, 290, 210, 4, NOTE), ...pin(1025, 116, BLUE),
        text('<b style="font-size:54px">23</b><br>enfermos de 64 invitados', 900, 140, 250, 150, { fontSize: 24, color: INK, rotation: 4, textAlign: 'center' }),
        sheet(860, 380, 320, 220, -3, PAPER), ...pin(1020, 396),
        text(`<div style="font-family:${MONO};font-size:18px;color:${BLUE}">SÁBADO · 14:00</div><div style="margin-top:8px">Comida de boda en un restaurante de la comarca</div>`, 885, 420, 270, 160, { fontSize: 22, color: INK, rotation: -3 }),
        string([[440, 128], [700, 90], [1025, 116]], 'afterPrev', 900), string([[1025, 116], [1215, 250], [1020, 396]], 'afterPrev', 700)],
        notes: 'Portada de tablero de corcho: textura SVG propia, papeles con sombra y chinchetas (elipses con degradado). El hilo rojo se dibuja solo uniendo las pistas. Caso ficticio: lugares, personas y cifras inventados.' },
      { title: 'Lo que sabemos el lunes a las 9:00', layout: 'titleOnly', ...P, extra: [
        ...[['Sábado 14:00', 'Banquete: 64 comensales', 0], ['Domingo 2:00', 'Primeros vómitos y diarrea', 1], ['Domingo 8:00', 'Urgencias avisa de 9 casos del mismo banquete', 2], ['Lunes 9:00', 'Salud pública abre la investigación', 3]].flatMap(([h, d, i]) => {
          const x = 90 + i * 280, y = 200 + (i % 2) * 150, rot = [-2, 2, -1, 3][i];
          return [withAnims(sheet(x, y, 250, 200, rot, i === 3 ? NOTE : PAPER), A('fade-down', { start: i ? 'afterPrev' : 'click', duration: 400 })),
            withAnims(text(`<div style="font-family:${MONO};font-size:20px;color:${RED};font-weight:700">${h}</div><div style="margin-top:10px">${d}</div>`, x + 18, y + 30, 214, 150, { fontSize: 22, color: INK, rotation: rot }), A('fade-down', { start: 'withPrev', duration: 400 })),
            ...pin(x + 125, y + 14).map(b => withAnims(b, A('zoom-in', { start: 'withPrev', duration: 300, sound: 'click' })))]; }),
        string([[215, 214], [355, 180], [358, 334], [495, 364], [635, 334], [638, 180], [775, 214], [915, 180], [918, 334], [1055, 364]], 'afterPrev', 1800),
        anim(card('Primera tarea: saber <b>quién</b> enfermó, <b>cuándo</b> y <b>qué comió</b>.', 90, 590, 1100, 70, PAPER, { fontSize: 24, color: INK, vAlign: 'middle', radius: 4, shadow: true }), 2, 'fade-up')],
        notes: 'Un clic y las cuatro notas se clavan en el corcho en orden (con sonido de chincheta); el hilo las une al final. El papel de la enfermera de salud pública: entrevistas, encuesta y muestras.' },
      { title: 'Definir el caso y preguntar a todos', layout: 'titleOnly', ...P, extra: [
        sheet(90, 180, 520, 450, -1), ...pin(350, 196),
        text(`<div style="font-family:${H};font-size:30px;font-weight:700;color:${RED}">Definición de caso</div><div style="margin-top:14px">Persona que comió en el banquete del sábado y tuvo <b>diarrea o vómitos</b> entre el domingo a las 0:00 y el lunes a las 24:00.</div>`, 120, 220, 460, 300, { fontSize: 25, color: INK, lineHeight: 1.45, rotation: -1 }),
        text('Clara, sencilla y la misma para todos.', 120, 540, 460, 50, { fontSize: 21, color: DIM, fontStyle: 'italic', rotation: -1 }),
        sheet(660, 170, 530, 480, 1.5), ...pin(925, 186, BLUE),
        text(`<div style="font-family:${MONO};font-size:20px;font-weight:700">ENCUESTA A COMENSALES · Nº 37</div>`
          + ['¿Enfermó?', 'Ensaladilla', 'Arroz con pollo', 'Tarta de queso', 'Agua del grifo'].map((q, i) => `<div style="margin-top:14px;font-family:${MONO};font-size:20px">${q}&nbsp;&nbsp; ${[1, 0, 1, 1, 0][i] ? '<b style="color:#c0392b">☒ sí</b> ☐ no' : '☐ sí <b style="color:#c0392b">☒ no</b>'}</div>`).join(''),
          690, 210, 470, 400, { fontSize: 20, color: INK, rotation: 1.5 })],
        notes: 'A la izquierda la definición de caso; a la derecha una de las 64 encuestas (formulario dibujado con texto monoespaciado). Se pregunta a enfermos y a sanos: sin los sanos no hay comparación posible.' },
      { title: 'La curva epidémica', layout: 'titleOnly', ...P, extra: [
        sheet(80, 170, 760, 480, -0.5), ...pin(460, 184),
        chartBlock({ x: 110, y: 200, w: 700, h: 430, chartType: 'bar', color: RED, dataLabels: true, xTitle: 'Horas desde el banquete', yTitle: 'Casos nuevos',
          data: ['0–4', '4–8', '8–12', '12–16', '16–20', '20–24', '24–28'].map((l, i) => ({ label: l, value: [0, 1, 6, 10, 4, 2, 0][i] })) }),
        sheet(880, 200, 320, 360, 2, NOTE), ...pin(1040, 214, BLUE),
        anim(text(`<div style="font-family:${H};font-size:28px;font-weight:700">Una sola subida</div><div style="margin-top:12px">Todos los casos en unas 20 horas: <b>fuente común puntual</b>. La incubación (8–16 h) orienta hacia una toxina bacteriana.</div>`, 900, 240, 280, 300, { fontSize: 21, color: INK, rotation: 2, lineHeight: 1.4 }), 1, 'fade-in')],
        notes: 'Curva epidémica en barras (intervalos de 4 horas). La forma de un solo pico estrecho indica que todos se expusieron a la vez. Un clic para la interpretación.' },
      { title: '¿Qué comieron los que enfermaron?', layout: 'titleOnly', ...P, extra: [
        sheet(70, 165, 1140, 430, 0), ...pin(640, 178),
        tableBlock({ x: 90, y: 195, w: 1100, h: 330, fontSize: 21, header: true, headBg: INK, headFg: PAPER, stroke: '#d9cdb8', banded: true, band: '#d9cdb8', colW: [3, 2, 2, 2, 2, 2, 2, 2],
          rows: [['Alimento', 'Enfermos (sí)', 'Comieron', 'Tasa sí (%)', 'Enfermos (no)', 'No comieron', 'Tasa no (%)', 'RR'],
            ['Ensaladilla', '12', '34', '=REDONDEAR(B2/C2*100;1)', '11', '30', '=REDONDEAR(E2/F2*100;1)', '=REDONDEAR(D2/G2;1)'],
            ['Arroz con pollo', '21', '40', '=REDONDEAR(B3/C3*100;1)', '2', '24', '=REDONDEAR(E3/F3*100;1)', '=REDONDEAR(D3/G3;1)'],
            ['Tarta de queso', '14', '45', '=REDONDEAR(B4/C4*100;1)', '9', '19', '=REDONDEAR(E4/F4*100;1)', '=REDONDEAR(D4/G4;1)'],
            ['Agua del grifo', '15', '40', '=REDONDEAR(B5/C5*100;1)', '8', '24', '=REDONDEAR(E5/F5*100;1)', '=REDONDEAR(D5/G5;1)']] }),
        withAnims(shape('rounded', 80, 350, 1120, 58, 'none', { stroke: RED, strokeWidth: 4, radius: 30, sketch: true }), A('zoom-in', { start: 'click', duration: 500, sound: 'pop' })),
        text('Tasa de ataque = enfermos ÷ personas que comieron × 100. Todas las columnas calculadas son fórmulas.', 90, 615, 1100, 40, { fontSize: 20, color: '#2b2620', bg: '#fffdf6cc', radius: 6, pad: [4, 10, 4, 10] })],
        notes: 'Tabla con fórmulas: tasas de ataque y riesgo relativo se calculan solas. Un clic rodea a mano alzada (trazo «a mano») la fila del arroz: la tasa entre quienes lo comieron es seis veces mayor.' },
      { title: 'El riesgo relativo', layout: 'titleOnly', ...P, extra: [
        sheet(110, 180, 620, 430, -1), ...pin(420, 196),
        withAnims(mathBlock({ x: 140, y: 230, w: 560, h: 130, fontSize: 46, color: INK, latex: 'RR = \\frac{TA_{\\text{expuestos}}}{TA_{\\text{no expuestos}}}' }), A('fade-in', { start: 'afterPrev', duration: 600 })),
        anim(mathBlock({ x: 140, y: 400, w: 560, h: 110, fontSize: 44, color: RED, latex: '\\frac{52{,}5}{8{,}3} \\approx 6{,}3' }), 1, 'fade-up'),
        sheet(800, 200, 380, 380, 2.5, NOTE), ...pin(990, 214, BLUE),
        anim(text(`<div style="font-size:24px"><b>RR ≈ 1</b>: el alimento no influye</div><div style="font-size:24px;margin-top:16px"><b>RR &gt; 1</b>: más riesgo al comerlo</div><div style="font-size:24px;margin-top:16px"><b>RR &lt; 1</b>: menos riesgo</div><div style="margin-top:22px;color:${RED};font-weight:700">El arroz: seis veces más riesgo.</div>`,
          825, 240, 330, 320, { fontSize: 22, color: INK, rotation: 2.5 }), 2, 'fade-in')],
        notes: 'La ecuación aparece sola; un clic para el cálculo con el arroz y otro para leerlo. Un RR alto no es una prueba: hay que confirmarlo con el laboratorio (muestras de restos y de pacientes).' },
      { title: 'El mismo cálculo, en código', layout: 'titleOnly', ...P, extra: [
        sheet(70, 165, 760, 420, -0.5), ...pin(450, 178),
        codeBlock({ x: 95, y: 195, w: 710, h: 360, fontSize: 18, lang: 'python', lineSteps: '1-3|5-6|8-11',
          code: 'import pandas as pd\n\nencuesta = pd.read_csv("encuesta_banquete.csv")\n\ndef tasa_ataque(grupo):\n    return 100 * grupo["enfermo"].mean()\n\nfor alimento in ["ensaladilla", "arroz", "tarta", "agua"]:\n    si = tasa_ataque(encuesta[encuesta[alimento] == 1])\n    no = tasa_ataque(encuesta[encuesta[alimento] == 0])\n    print(f"{alimento:12} RR = {si / no:4.1f}")' }),
        sheet(880, 220, 320, 320, 2, NOTE), ...pin(1040, 234, BLUE),
        text('Con 64 encuestas basta una hoja de cálculo; con miles, un programa ahorra horas y errores.', 905, 270, 270, 240, { fontSize: 23, color: INK, rotation: 2, lineHeight: 1.4 })],
        notes: 'Código con pasos de resaltado: leer la encuesta, definir la tasa de ataque y recorrer los alimentos (tres clics). Archivo de ejemplo: no existe, es para ilustrar.' },
      { layout: 'blank', ...P, extra: [shape('rect', 50, 40, 1180, 640, PAPER, { shadow: true }), pollBlock({ kind: 'choice', fontSize: 34, x: 80, y: 70, w: 1120, h: 580, question: 'Con lo que has visto, ¿qué alimento investigarías primero?', options: ['Ensaladilla', 'Arroz con pollo', 'Tarta de queso', 'Agua del grifo'] })],
        notes: 'Votación en directo. Si alguien elige la ensaladilla (el «sospechoso habitual»), es buen momento para insistir en que los datos mandan.' },
      { title: 'Conclusión y medidas', layout: 'titleOnly', ...P, extra: [
        ...[['Arroz con pollo', 'Cocinado el viernes, enfriado despacio y recalentado', 90, 190, -2, PAPER], ['Toxina bacteriana', 'Confirmada en restos del arroz y en 6 pacientes', 480, 330, 2, NOTE], ['Medidas', 'Enfriar rápido, recalentar a fondo, formar a la cocina, informar a la red de vigilancia', 870, 190, -1, PAPER]].flatMap(([h, d, x, y, rot, f], i) => [
          withAnims(sheet(x, y, 320, 230, rot, f), A('fade-down', { start: i ? 'afterPrev' : 'click', duration: 400 })),
          withAnims(text(`<div style="font-family:${H};font-size:28px;font-weight:700;color:${RED}">${h}</div><div style="margin-top:10px">${d}</div>`, x + 20, y + 34, 280, 180, { fontSize: 21, color: INK, rotation: rot }), A('fade-down', { start: 'withPrev', duration: 400 })),
          ...pin(x + 160, y + 14).map(b => withAnims(b, A('zoom-in', { start: 'withPrev', duration: 300, sound: 'click' })))]),
        string([[250, 204], [420, 150], [640, 344], [860, 150], [1030, 204]], 'afterPrev', 1300),
        text('Caso docente inventado: cualquier parecido con un brote real es casual.', 90, 620, 1100, 40, { fontSize: 18, color: '#2b2620', bg: '#fffdf6cc', radius: 6, pad: [4, 10, 4, 10] })],
        notes: 'Cierre: tres notas que se clavan con un clic y un hilo rojo que las une (efecto «Dibujar»). Del dato a la medida: la investigación termina cuando se evita el siguiente brote.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Falls in older people: a home at night, a floor plan with hazards that turn into fixes (Transform), a 3D walking test.
  sci_nurse_falls: { name: 'Caídas en mayores: la casa segura', cat: 'sci', summary: 'Casa de noche con lámpara 3D: plano con peligros que se arreglan con Transformar, prueba de marcha con figura 3D, venn, dona y cuenta atrás', make: () => {
    const BG = '#0d1424', FG = '#f3ede2', DIM = '#9aa6bd', WARM = '#ffcf7a', RED = '#ff6b5b', TEAL = '#5fd3c6', H = pairStacks('websafe').heading, LAMP = uid();
    const P = { bg: BG };
    const lamp = (x, y, w, h, props) => ({ ...m3d('kh-AnisotropyBarnLamp', x, y, w, h, props), id: LAMP });
    // The floor plan from above (720 × 500).
    const room = (x, y, w, h, name) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#18223a" stroke="#c9d3e6" stroke-width="6"/>` + ST(x + 14, y + h - 14, 17, '#7f8aa3', name, ' font-style="italic"');
    const PLAN = after => svgURL(720, 500, room(0, 0, 300, 280, 'Dormitorio') + room(300, 0, 180, 190, 'Baño') + room(480, 0, 240, 190, 'Cocina') + room(300, 190, 420, 90, 'Pasillo') + room(0, 280, 480, 220, 'Salón') + room(480, 280, 240, 220, 'Escalera')
      + '<path d="M300 210V260M120 280H200M380 190H440M560 190H620M520 280H600" stroke="#18223a" stroke-width="10"/>'
      + `<rect x="40" y="40" width="170" height="${after ? 190 : 200}" rx="14" fill="#2c3b5e" stroke="#c9d3e6" stroke-width="2"/><rect x="60" y="50" width="130" height="40" rx="10" fill="#c9d3e6"/><rect x="225" y="40" width="50" height="50" rx="6" fill="#2c3b5e"/>`
      + '<rect x="320" y="20" width="140" height="70" rx="30" fill="#2c3b5e" stroke="#c9d3e6" stroke-width="2"/><circle cx="440" cy="150" r="20" fill="#2c3b5e" stroke="#c9d3e6" stroke-width="2"/>'
      + '<rect x="500" y="20" width="200" height="50" fill="#2c3b5e"/><rect x="60" y="430" width="260" height="50" rx="12" fill="#2c3b5e"/><rect x="340" y="300" width="80" height="60" fill="#2c3b5e"/>'
      + Array.from({ length: 8 }, (_, i) => `<path d="M${500 + i * 26} 300V480" stroke="#3d4c70" stroke-width="3"/>`).join('')
      + (after ? '<path d="M320 100H340" stroke="#5fd3c6" stroke-width="10" stroke-linecap="round"/><path d="M490 486H710" stroke="#5fd3c6" stroke-width="8" stroke-linecap="round"/>'
        + [360, 470, 600, 690].map(x => `<circle cx="${x}" cy="262" r="22" fill="#ffcf7a" opacity=".25"/><circle cx="${x}" cy="262" r="7" fill="#ffcf7a"/>`).join('')
        : '<rect x="140" y="330" width="150" height="80" rx="6" fill="#8a4b5c" transform="rotate(-8 215 370)"/><path d="M340 330 C 300 360 260 330 230 360 C 200 390 160 360 120 380" stroke="#c9d3e6" stroke-width="3" fill="none" stroke-dasharray="2 4"/>'));
    const PX = 80, PY = 170;
    const hz = [['Cama demasiado alta', 125, 140], ['Alfombra suelta', 215, 370], ['Baño sin barra de apoyo', 330, 100], ['Pasillo a oscuras', 520, 235], ['Cable por el suelo', 300, 340], ['Escalera sin pasamanos', 600, 470]];
    const fixes = ['Cama a la altura de la rodilla', 'Alfombra fuera', 'Barra junto al inodoro', 'Pilotos de luz nocturna', 'Cable recogido', 'Pasamanos a ambos lados'];
    const MK = hz.map(() => uid()), LBL = hz.map(() => uid());
    const marker = (i, ok) => ({ ...icon(ok ? 'circle-check' : 'triangle-alert', PX + hz[i][1] - 22, PY + hz[i][2] - 22, 44, ok ? TEAL : RED), decorative: false, id: MK[i] });
    const label = (i, ok) => ({ ...text(`<b style="color:${ok ? TEAL : RED}">${i + 1}</b>&nbsp; ${ok ? fixes[i] : hz[i][0]}`, 850, 180 + i * 76, 370, 60, { fontSize: 23, color: FG, vAlign: 'middle' }), id: LBL[i] });
    return numbered(tc(build({ name: 'La casa segura', palette: 'midnight', fonts: 'websafe', title: { color: WARM, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        glow(640, 40, 640, '#7a5520', BG, 70),
        lamp(820, 40, 360, 420, { autoRotate: true, spin: 12, view: 'three', edge: 'fade' }),
        kicker('ENFERMERÍA COMUNITARIA · VISITA A DOMICILIO', 90, 150, 700, WARM, { fontSize: 18 }),
        text('Que nadie<br>se caiga de noche', 84, 190, 760, 220, { fontFamily: H, fontSize: 80, color: FG, lineHeight: 1.05 }),
        text('Prevenir caídas en las personas mayores, empezando por su casa', 90, 430, 640, 90, { fontSize: 28, color: DIM }),
        text('Sesión para cuidadores y familias', 90, 580, 640, 40, { fontSize: 22, color: WARM })],
        notes: 'Portada en penumbra: la lámpara 3D gira despacio con bordes difuminados y un brillo cálido detrás. La idea que vertebra la sesión: muchas caídas pasan de noche, camino del baño.' },
      { layout: 'blank', ...P, extra: [
        text('Cada año se cae…', 90, 90, 1100, 60, { fontSize: 32, color: DIM }),
        withAnims(text('1 de cada 3', 90, 150, 700, 150, { fontFamily: H, fontSize: 130, color: WARM }), A('zoom-in', { start: 'afterPrev', duration: 600 })),
        text('personas de más de 65 años', 90, 310, 700, 50, { fontSize: 32, color: FG }),
        icon('person-standing', 800, 150, 130, FG), icon('person-standing', 930, 150, 130, FG),
        withAnims(icon('person-standing', 1060, 150, 130, RED), A('teeter', { start: 'click', duration: 700 }), A('fade-out', { start: 'afterPrev', duration: 300 })),
        withAnims({ ...icon('person-standing', 1060, 240, 130, RED), rotation: -90 }, A('fade-in', { start: 'withPrev', duration: 300, sound: 'pop' })),
        ...chain([['De noche', 'o al levantarse: muchas caídas pasan camino del baño'], ['Hasta 1 de 10', 'acaba en fractura, a menudo de cadera'], ['El miedo', 'a volver a caer hace que se muevan menos… y se caigan más']].map(([n, t], i) =>
          text(`<div style="font-size:34px;font-weight:700;color:${[WARM, RED, TEAL][i]}">${n}</div><div>${t}</div>`, 90 + i * 375, 430, 340, 200, { fontSize: 22, color: FG })), 'fade-up', 'afterPrev')],
        notes: 'Un clic: la tercera figura se tambalea y cae (énfasis «Balanceo», desaparece y aparece tumbada con un «pop»); luego las tres cifras entran solas. Cifras orientativas del orden de las que publican los estudios de población.' },
      { title: 'La visita: ¿qué ves en esta casa?', layout: 'titleOnly', ...P, extra: [
        img(PLAN(false), PX, PY, 720, 500, 'Plano de una vivienda vista desde arriba, con dormitorio, baño, cocina, pasillo, salón y escalera', { id: uid() }),
        ...hz.flatMap((_, i) => [withAnims(marker(i, false), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' })), withAnims(label(i, false), A('fade-left', { start: 'withPrev', duration: 300 }))])],
        notes: 'Plano dibujado en SVG. Pedid al grupo que encuentre los peligros antes de pulsar; luego un clic los muestra en cadena (con sonido). El orden sigue el recorrido nocturno: de la cama al baño.' },
      { title: 'Y después de la visita', layout: 'titleOnly', ...P, autoAnimate: true, extra: [
        img(PLAN(true), PX, PY, 720, 500, 'El mismo plano con barras de apoyo, pasamanos y luces nocturnas en el pasillo'),
        ...hz.flatMap((_, i) => [marker(i, true), label(i, true)])],
        notes: 'Transformar: los avisos rojos se convierten en marcas verdes y cada peligro en su arreglo (los mismos objetos). En el plano aparecen la barra del baño, el pasamanos y cuatro pilotos de luz en el pasillo. Arreglos baratos y rápidos.' },
      { title: 'Levántate y anda: la prueba de 3 metros', layout: 'titleOnly', ...P, extra: [
        shape('rect', 80, 600, 820, 4, '#3d4c70'),
        text('Cronometra desde «ya» hasta que vuelve a estar sentado: un clic y la figura hace el recorrido.', 90, 180, 800, 80, { fontSize: 23, color: DIM }),
        m3d('kh-SheenChair', 70, 330, 230, 290, { view: 'side', autoRotate: false }),
        withAnims(m3d('kn-character', 260, 410, 150, 200, { walk: { clip: 'walk', face: true, look: true } }), path([[480, 0], [500, -12], [0, 0]], { start: 'click', duration: 7000 })),
        line(335, 640, 830, 640, WARM, 3), line(335, 628, 335, 652, WARM, 3), line(830, 628, 830, 652, WARM, 3),
        text('3 metros', 480, 650, 200, 36, { fontSize: 22, color: WARM, textAlign: 'center' }),
        card(`<div style="font-size:24px;font-weight:700;color:${WARM}">Cómo se hace</div><div style="margin-top:8px">Levantarse de la silla, caminar 3 m, girar, volver y sentarse. Se cronometra.</div><div style="margin-top:14px;font-size:30px;font-weight:700;color:${RED}">&gt; 12 s</div><div>riesgo de caída aumentado</div>`,
          940, 180, 260, 420, '#18223a', { fontSize: 20, color: FG, lineHeight: 1.35 })],
        notes: 'La figura 3D hace el recorrido con un clic (anda por una trayectoria de ida y vuelta y gira mirando hacia donde va). Punto de corte orientativo; fijaos también en cómo se levanta y en cómo gira.' },
      { title: 'Por qué se cae una persona', layout: 'titleOnly', ...P, extra: [
        dg('venn', 'Persona\n  Fuerza, vista\nFármacos\n  Sedantes\nCasa\n  Luz, suelo', 200, 160, 880, 470, { colors: 'colorful', oneByOne: true, textColor: '#ffffff', fontScale: 2.2 })],
        notes: 'Diagrama de Venn que aparece círculo a círculo: la persona (fuerza, vista, mareos), los fármacos (sedantes, los de la tensión) y la casa (luz, suelo, apoyos). Casi siempre se suman varios factores: por eso la intervención eficaz es multifactorial (revisar fármacos, ejercicio, vista y casa).' },
      { title: 'Dónde ocurren dentro de casa', layout: 'titleOnly', ...P, extra: [
        chartBlock({ x: 90, y: 170, w: 640, h: 470, chartType: 'doughnut', color: WARM, labelColor: FG,
          data: [{ label: 'Dormitorio', value: 31, color: WARM }, { label: 'Baño', value: 24, color: RED }, { label: 'Escaleras', value: 16, color: TEAL }, { label: 'Cocina', value: 12, color: '#9b8cff' }, { label: 'Salón', value: 10, color: '#7aa2f7' }, { label: 'Otros', value: 7, color: '#5c6680' }] }),
        anim(text(`<div style="font-size:30px;font-weight:700;color:${WARM}">Más de la mitad</div><div style="margin-top:10px">entre el dormitorio y el baño: el trayecto de la noche.</div>`, 800, 260, 390, 220, { fontSize: 25, color: FG, lineHeight: 1.4 }), 1, 'fade-left')],
        notes: 'Reparto inventado para la plantilla, con la forma que suelen mostrar las encuestas: dormitorio y baño a la cabeza.' },
      { title: 'Prueba de la silla: 30 segundos', layout: 'titleOnly', ...P, extra: [
        timer(30, 90, 190, 380, { style: 'ring', color: WARM, auto: false, endText: '¡Cuenta!' }),
        text('Brazos cruzados sobre el pecho: ¿cuántas veces te levantas y te sientas en 30 segundos?', 520, 180, 670, 100, { fontSize: 26, color: FG }),
        tableBlock({ x: 520, y: 310, w: 670, h: 270, fontSize: 22, header: true, headBg: '#2c3b5e', headFg: WARM, stroke: '#3d4c70', banded: true, band: '#7aa2f7', colW: [2, 2, 2],
          rows: [['Edad', 'Mujeres: menos de', 'Hombres: menos de'], ['65 – 69', '11', '12'], ['70 – 74', '10', '12'], ['75 – 79', '10', '11'], ['80 – 84', '9', '10']] }),
        text('Por debajo de esas cifras, la fuerza de las piernas es baja para su edad (valores orientativos).', 520, 600, 670, 60, { fontSize: 19, color: DIM })],
        notes: 'Haced la prueba en la sala con una silla sin brazos: se pone en marcha pulsando la cuenta atrás. Los valores de referencia son orientativos y varían según la población estudiada.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'multi', fontSize: 32, x: 70, y: 50, w: 1140, h: 620, question: 'Con 60 € de presupuesto, ¿qué tres cambios harías primero en esta casa?', options: ['Luz en el pasillo', 'Barra en el baño', 'Quitar la alfombra', 'Recoger cables', 'Pasamanos', 'Calzado cerrado'] })],
        notes: 'Votación de respuesta múltiple. No hay una única respuesta correcta: sirve para hablar de prioridades (lo barato y rápido primero: luz y alfombra).' },
      { layout: 'blank', ...P, transition: 'fade', extra: [
        glow(-120, 200, 700, '#7a5520', BG, 60),
        lamp(110, 150, 380, 440, { autoRotate: false, motion: 'float', view: 'front', edge: 'fade' }),
        text('Una luz en el pasillo<br>vale más que mil consejos', 540, 210, 680, 200, { fontFamily: H, fontSize: 54, color: FG, lineHeight: 1.15 }),
        text('Pide una visita de enfermería a domicilio si en casa hay alguien que ya se ha caído.', 545, 440, 620, 90, { fontSize: 24, color: WARM }),
        credits(['kh-AnisotropyBarnLamp'], 90, 650, 1100, '#5c6680')],
        notes: 'Cierre con la lámpara flotando. Mensaje práctico: tras una primera caída, pedir valoración. Créditos del modelo 3D en la línea pequeña de abajo.' },
    ]), FG));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Quitting smoking: from smoke to clean air — a cigarette that becomes the timeline, grey lungs that turn pink (Transform).
  sci_nurse_smoking: { name: 'Dejar de fumar: lo que gana tu cuerpo', cat: 'sci', summary: 'Del humo al aire limpio: humo que sube, cigarro que es línea del tiempo, pulmones que cambian con Transformar, tabla de ahorro y respiración', make: () => {
    const BG = '#1c1c1e', FG = '#f5f5f7', DIM = '#a1a1a8', ASH = '#8e8e93', EMBER = '#ff6a2b', SKY = '#4aa8ff', FRESH = '#2fcf8a', AIR = '#e6f3ff', INK = '#1d2733', H = pairStacks('modern').heading;
    const P = { bg: BG };
    const SMOKE = (c = '#ffffff') => svgURL(160, 420, `<path d="M80 410 C 30 340 130 300 80 230 C 30 160 130 120 80 40" stroke="${c}" stroke-width="16" fill="none" stroke-linecap="round" opacity=".35"/><path d="M95 400 C 60 330 140 290 100 210 C 70 150 120 110 96 60" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".25"/>`);
    const wisp = (x, y, start = 'afterPrev', dur = 4000) => withAnims(img(SMOKE(), x, y, 160, 420, '', { decorative: true }), A('fade-in-then-out', { start, duration: dur }), path([[10, -60], [-10, -120]], { start: 'withPrev', duration: dur }));
    const CIG = (w = 1100, h = 56, filter = 180) => svgURL(w, h, `<rect x="0" y="0" width="${w - filter}" height="${h}" fill="#f4f1ea"/><rect x="${w - filter}" y="0" width="${filter}" height="${h}" fill="#d9a35b"/>`
      + Array.from({ length: 40 }, (_, i) => `<circle cx="${w - filter + 8 + (i * 37) % (filter - 16)}" cy="${8 + (i * 13) % (h - 16)}" r="2" fill="#b07d3c"/>`).join('') + `<path d="M${w - filter - 30} 0V${h}" stroke="#e2ddd2" stroke-width="2"/>`);
    // The lungs (400 × 360): grey with spots, or pink.
    const LUNGS = (fill, stroke, spots) => { const r = rng(5);
      return svgURL(400, 360, `<path d="M190 0H210V110H190Z" fill="${stroke}"/><path d="M200 110 L150 160 M200 110 L250 160 M168 140 L130 200 M232 140 L270 200" stroke="${stroke}" stroke-width="8" fill="none" stroke-linecap="round"/>`
        + `<path d="M180 110 C 120 100 40 160 40 260 C 40 330 120 350 170 330 C 190 320 190 200 180 110Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`
        + `<path d="M220 110 C 280 100 360 160 360 260 C 360 330 280 350 230 330 C 210 320 210 200 220 110Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`
        + (spots ? Array.from({ length: 70 }, () => { const left = r() > 0.5, x = left ? 70 + r() * 100 : 230 + r() * 100, y = 170 + r() * 140;
          return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + r() * 6).toFixed(1)}" fill="#2a2a2a" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`; }).join('') : '')); };
    const LG = uid(), LP = uid();
    const marks = [[0.06, '20 minutos', 'Bajan el pulso y la tensión'], [0.2, '12 horas', 'El monóxido de carbono en sangre se normaliza'], [0.38, '2–12 semanas', 'Mejoran la circulación y el pulmón'],
      [0.56, '1 año', 'El riesgo de infarto se reduce a la mitad'], [0.72, '5 años', 'Baja mucho el riesgo de ictus'], [0.86, '10 años', 'El de cáncer de pulmón, a la mitad']];
    const CX = 90, CW = 1100, CY = 330, DUR = 7000;
    return numbered(tc(build({ name: 'Dejar de fumar', palette: 'grayscale', fonts: 'modern', title: { color: FG, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        img(CIG(560, 40, 110), 90, 560, 560, 40, 'Un cigarro encendido'), sphere(92, 580, 22, '#ffd27a', EMBER), glow(40, 520, 120, EMBER, BG, 45),
        wisp(40, 140, 'afterPrev', 5000), wisp(120, 100, 'withPrev', 6000),
        kicker('EDUCACIÓN PARA LA SALUD · CONSULTA DE ENFERMERÍA', 330, 120, 860, ASH, { fontSize: 18 }),
        text('El último<br>cigarro', 324, 160, 860, 260, { fontFamily: H, fontSize: 120, fontWeight: 800, color: FG, lineHeight: 1 }),
        text('Qué gana tu cuerpo desde el primer minuto sin tabaco', 330, 430, 860, 60, { fontSize: 30, color: DIM })],
        notes: 'Portada en gris humo: un cigarro dibujado en SVG con la brasa brillando y dos volutas que suben y se desvanecen solas (aparecer y desaparecer con trayectoria). El color irá aclarándose hasta el cielo azul del final.' },
      { layout: 'blank', ...P, extra: [
        text('Lo que hay en el humo', 90, 80, 1100, 70, { fontFamily: H, fontSize: 46, fontWeight: 700, color: FG }),
        ...chain([['7.000', 'sustancias químicas en el humo del tabaco', FG], ['70', 'de ellas causan cáncer', EMBER], ['1 de 2', 'personas que fuman toda la vida muere por el tabaco', ASH]].map(([n, t, c], i) =>
          stat(n, t, 90 + i * 375, 230, 340, c, DIM, 96)), 'zoom-in', 'afterPrev', { duration: 500 }),
        anim(card('La buena noticia: <b>nunca es tarde</b>. Dejarlo a cualquier edad alarga la vida.', 90, 520, 1100, 90, '#2c2c2e', { fontSize: 28, color: FG, vAlign: 'middle' }), 1, 'fade-up')],
        notes: 'Las tres cifras entran solas, una tras otra. Son las que repiten las organizaciones sanitarias internacionales; la tercera se refiere a quienes fuman toda la vida.' },
      { title: 'El cigarro como reloj', layout: 'titleOnly', ...P, extra: [
        img(CIG(CW, 56, 180), CX, CY, CW, 56, 'Un cigarro muy largo usado como línea del tiempo'),
        withAnims(shape('rect', CX, CY, 1, 56, '#5a5a5e'), A('fade-in', { start: 'click', duration: 10 })),
        withAnims(sphere(CX + 4, CY + 28, 26, '#ffd27a', EMBER), path([[(CW - 200), 0]], { start: 'withPrev', duration: DUR })),
        ...marks.flatMap(([f, h, d], i) => { const x = CX + f * (CW - 180), up = i % 2 === 0, delay = Math.round(f * (CW - 180) / (CW - 200) * DUR);
          return [withAnims(line(x, up ? CY - 50 : CY + 66, x, up ? CY - 8 : CY + 108, FRESH, 3), A('fade-in', { start: 'withPrev', delay, duration: 300 })),
            withAnims(text(`<div style="font-weight:700;color:${FRESH};font-size:24px">${h}</div><div>${d}</div>`, x - 95, up ? CY - 150 : CY + 112, 190, 100, { fontSize: 17, color: FG, textAlign: 'center' }), A('fade-in', { start: 'withPrev', delay, duration: 400 }))]; }),
        text('Con un clic la brasa recorre el cigarro: cada parada es una mejora desde que lo dejas.', 90, 620, 1100, 40, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'La brasa recorre el cigarro en siete segundos (trayectoria) y las mejoras se encienden a su paso: animaciones «con la anterior» con retrasos distintos. Plazos orientativos que citan las guías de deshabituación.' },
      { title: 'El pulmón de quien fuma', layout: 'titleOnly', ...P, extra: [
        { ...img(LUNGS('#7d7d82', '#4a4a4f', true), 110, 180, 440, 396, 'Pulmones grises con manchas oscuras'), id: LG },
        { ...img(LUNGS('#f29ba8', '#c25a6a', false), 110, 180, 440, 396, 'Pulmones rosados y sanos'), id: LP, opacity: 0 },
        ...chain(['Los cilios que barren el moco se paralizan', 'Los alvéolos se rompen y se pierde superficie', 'Tos, flemas y fatiga al subir escaleras'].map(t =>
          text(`<span style="color:${EMBER}">●</span> ${t}`, 620, 0, 570, 80, { fontSize: 26, color: FG })).map((b, i) => ({ ...b, y: 220 + i * 110 })), 'fade-left', 'click')],
        notes: 'Pulmones dibujados en SVG. En la siguiente diapositiva se transforman: hay dos imágenes superpuestas (gris y rosa) y Transformar cambia su transparencia y su sitio.' },
      { title: 'Y cuando lo dejas', layout: 'titleOnly', bg: '#2a3138', autoAnimate: true, extra: [
        { ...img(LUNGS('#7d7d82', '#4a4a4f', true), 730, 180, 440, 396, 'Pulmones grises con manchas oscuras'), id: LG, opacity: 0 },
        { ...img(LUNGS('#f29ba8', '#c25a6a', false), 730, 180, 440, 396, 'Pulmones rosados y sanos'), id: LP },
        ...chain(['Los cilios se recuperan en semanas', 'La tos y las flemas disminuyen', 'Se respira mejor al hacer ejercicio', 'Lo perdido no vuelve: dejarlo pronto importa'].map(t =>
          text(`<span style="color:${FRESH}">●</span> ${t}`, 90, 0, 580, 80, { fontSize: 26, color: FG })).map((b, i) => ({ ...b, y: 200 + i * 100 })), 'fade-right', 'afterPrev')],
        notes: 'Transformar: los pulmones cruzan la diapositiva mientras el gris se desvanece y aparece el rosa. Ojo con la última idea: el enfisema no se revierte, por eso cuanto antes mejor.' },
      { title: 'Lo que ahorras', layout: 'titleOnly', bg: '#2a3138', extra: [
        tableBlock({ x: 90, y: 180, w: 760, h: 300, fontSize: 23, header: true, headBg: FRESH, headFg: INK, stroke: '#44505c', banded: true, band: FRESH, colW: [3, 2, 2, 2, 3],
          rows: [['Paquetes al día', 'Precio', 'Al mes', 'Al año', 'En 10 años'], ['0,5', '5,20 €', '=A2*B2*30', '=A2*B2*365', '=D2*10'], ['1', '5,20 €', '=A3*B3*30', '=A3*B3*365', '=D3*10'], ['1,5', '5,20 €', '=A4*B4*30', '=A4*B4*365', '=D4*10']] }),
        text('Las tres últimas columnas son fórmulas: pon tu precio y tu consumo.', 90, 500, 760, 40, { fontSize: 20, color: DIM }),
        withAnims(stat('1.898 €', 'al año con un paquete diario', 900, 200, 300, FRESH, FG, 72), A('zoom-in', { start: 'click', sound: 'chime', duration: 500 })),
        anim(text('Un viaje, unas gafas nuevas, el gimnasio de todo el año…', 900, 420, 300, 140, { fontSize: 22, color: DIM }), 1, 'fade-up')],
        notes: 'Tabla con fórmulas (=A2*B2*365…): cambia el precio o el consumo y todo se recalcula. Precio de ejemplo. La cifra grande entra con una campanilla.' },
      { title: 'En la consulta: las 5 A', layout: 'titleOnly', bg: '#33414d', extra: [
        sphere(640, 420, 110, '#5d7489', '#33414d', { stroke: AIR, strokeWidth: 3 }), text('5 A', 540, 375, 200, 90, { fontFamily: H, fontSize: 64, fontWeight: 800, color: AIR, textAlign: 'center' }),
        ...[['Averiguar', 'si fuma, en cada visita'], ['Aconsejar', 'dejarlo, con claridad'], ['Apreciar', 'si quiere intentarlo'], ['Ayudar', 'con un plan y fecha'], ['Acordar', 'el seguimiento']].flatMap(([h, d], i) => {
          const a = (-90 + i * 72) * Math.PI / 180, cx = 640 + 330 * Math.cos(a), cy = 420 + 190 * Math.sin(a), c = [SKY, FRESH, '#ffb347', '#c792ea', '#ff7b9c'][i];
          return [withAnims(line(640 + 120 * Math.cos(a), 420 + 115 * Math.sin(a), cx - 80 * Math.cos(a), cy - 50 * Math.sin(a), c, 3), A('draw', { start: i ? 'afterPrev' : 'click', duration: 300 })),
            withAnims(shape('rounded', cx - 115, cy - 52, 230, 104, c, { radius: 52 }), A('zoom-in', { start: 'afterPrev', duration: 300, sound: 'pop' })),
            withAnims(text(`<div style="font-weight:800;font-size:26px">${h}</div><div style="font-size:17px">${d}</div>`, cx - 110, cy - 46, 220, 92, { fontSize: 17, color: INK, textAlign: 'center', vAlign: 'middle' }), A('zoom-in', { start: 'withPrev', duration: 300 }))]; })],
        notes: 'Esquema radial propio que aparece rama a rama con un clic (línea dibujada y «pop»). Es la intervención breve que cabe en cualquier consulta de enfermería; si la persona aún no quiere dejarlo, se trabaja la motivación y se vuelve a ofrecer.' },
      { title: 'Cuando aprieta el antojo', layout: 'titleOnly', bg: '#3d5466', extra: [
        withAnims(sphere(330, 410, 150, '#bfe3ff', SKY, { opacity: 80 }), A('grow', { start: 'click', duration: 4000 }), A('shrink', { start: 'afterPrev', duration: 6000 }), A('grow', { start: 'afterPrev', duration: 4000 }), A('shrink', { start: 'afterPrev', duration: 6000 })),
        text('Inspira 4 s · espira 6 s', 130, 590, 400, 40, { fontSize: 24, color: AIR, textAlign: 'center' }),
        text('Un antojo dura entre <b>3 y 5 minutos</b>. Respira despacio, bebe agua o sal a caminar: pasa.', 620, 180, 580, 140, { fontSize: 27, color: FG }),
        timer(180, 760, 340, 300, { style: 'ring', color: AIR, auto: false, endText: 'Ya pasó' })],
        notes: 'El círculo «respira»: con un clic crece en 4 segundos y se encoge en 6, dos veces (efectos de énfasis encadenados). La cuenta atrás de 3 minutos se pulsa para acompañar el ejercicio.' },
      { layout: 'blank', bg: '#4f7696', extra: [pollBlock({ kind: 'word', fontSize: 36, x: 80, y: 60, w: 1120, h: 600, question: '¿Qué harías con el dinero que ahorras en un año?', options: [] })],
        notes: 'Nube de palabras en directo. Ayuda a convertir el ahorro en una motivación concreta y personal.' },
      { layout: 'blank', bg: AIR, transition: 'zoom', extra: [
        shape('rect', 0, 0, 1280, 720, '#bfe1ff', { fill2: AIR, gradAngle: 90 }),
        m3d('kh-DiffuseTransmissionPlant', 820, 110, 380, 500, { autoRotate: true, spin: 10, view: 'front', edge: 'fade' }),
        text('Hoy es un buen día<br>para dejarlo', 90, 200, 720, 200, { fontFamily: H, fontSize: 70, fontWeight: 800, color: INK, lineHeight: 1.05 }),
        text('Pide cita en tu consulta de enfermería: con ayuda, se duplican las posibilidades.', 90, 430, 660, 90, { fontSize: 26, color: '#35506b' }),
        credits(['kh-DiffuseTransmissionPlant'], 90, 650, 1100, '#5b7389')],
        notes: 'Cierre en aire limpio: el fondo ha ido aclarándose diapositiva a diapositiva, del humo al cielo. La planta 3D gira despacio. Con apoyo profesional y tratamiento, las probabilidades de éxito aumentan claramente.' },
    ]), FG));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Shift handover with SBAR: the ward's whiteboard — marker writing, magnets, sticky notes, an early warning score that adds up.
  sci_nurse_sbar: { name: 'El relevo de turno con SBAR', cat: 'sci', summary: 'Pizarra blanca de planta: rotulador que subraya solo, imanes y notas que se pegan con sonido, diálogo en cadena, escala con fórmula y unir', make: () => {
    const WB = '#f7f8f4', BLUE = '#1f4fbf', RED = '#d62f2f', GREEN = '#1f8a4c', BLACK = '#24262b', DIM = '#6a6f78', YEL = '#ffe66d', H = pairStacks('friendly').heading;
    const MARK = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive";
    const P = { bg: '#d5d9de', back: [shape('rounded', 22, 22, 1236, 676, WB, { radius: 10, stroke: '#aeb5bd', strokeWidth: 10, shadow: true }), shape('rect', 300, 676, 680, 22, '#aeb5bd')] };
    const magnet = (cx, cy, c) => sphere(cx, cy, 15, '#ffffff', c, { shadow: true });
    const note = (x, y, w, h, rot, c = YEL) => shape('rect', x, y, w, h, c, { rotation: rot, shadow: true });
    const marker = (html, x, y, w, h, size, color, props = {}) => text(html, x, y, w, h, { fontFamily: MARK, fontSize: size, color, lineHeight: 1.15, ...props });
    const scribble = (x0, x1, y, color, amp = 6) => ink(Array.from({ length: 30 }, (_, i) => [x0 + (x1 - x0) * i / 29, y + amp * Math.sin(i * 1.3)]), color, 5);
    const S4 = [['S', 'Situación', '¿Qué pasa ahora?', '#ffe66d'], ['B', 'Antecedentes', '¿De dónde venimos?', '#9be7c4'], ['A', 'Evaluación', '¿Qué creo que ocurre?', '#a9d1ff'], ['R', 'Recomendación', '¿Qué necesito que hagas?', '#ffb3c1']];
    return numbered(tc(build({ name: 'Relevo con SBAR', palette: 'violet', fonts: 'friendly', title: { color: BLUE, size: 46, font: MARK }, body: { color: BLACK } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        marker('Relevo de turno', 90, 120, 760, 110, 84, BLUE), marker('con SBAR', 90, 240, 760, 110, 84, RED),
        withAnims(scribble(96, 520, 360, RED), A('draw', { start: 'afterPrev', duration: 900 })),
        text('Cómo pasar la información de un paciente sin que se pierda nada', 96, 400, 640, 90, { fontSize: 28, color: DIM }),
        shape('rect', 860, 90, 330, 230, '#ffffff', { rotation: 2, shadow: true }), magnet(1025, 98, RED),
        text(`<b>Planta 3.ª · Medicina interna</b><br>Sesión de formación continuada<br><span style="color:${DIM}">Martes, 14:30 · sala de enfermería</span>`, 885, 130, 290, 160, { fontSize: 21, color: BLACK, rotation: 2 }),
        ...S4.flatMap(([l, , , c], i) => [withAnims(note(780 + i * 110, 440 + (i % 2) * 30, 96, 96, [-6, 4, -3, 7][i], c), A('zoom-in', { start: 'afterPrev', duration: 250, sound: 'pop' })),
          withAnims(marker(l, 780 + i * 110, 450 + (i % 2) * 30, 96, 80, 54, BLACK, { textAlign: 'center', rotation: [-6, 4, -3, 7][i] }), A('zoom-in', { start: 'withPrev', duration: 250 }))])],
        notes: 'Portada de pizarra blanca de planta: el marco y la bandeja son formas; el título va con letra de rotulador y se subraya solo (trazo con efecto «Dibujar»). Las cuatro notas S-B-A-R se pegan una tras otra con un «pop».' },
      { layout: 'blank', ...P, extra: [
        marker('7 de cada 10', 100, 130, 700, 150, 110, RED),
        withAnims(shape('ellipse', 40, 104, 800, 200, 'none', { stroke: RED, strokeWidth: 5, sketch: true }), A('zoom-in', { start: 'afterPrev', duration: 500 })),
        text('eventos adversos graves tienen detrás un <b>fallo de comunicación</b>, y el relevo es uno de los momentos de más riesgo.', 100, 330, 680, 140, { fontSize: 30, color: BLACK }),
        note(860, 140, 330, 300, 3), magnet(1025, 150, BLUE),
        marker('En un relevo sin estructura es fácil que se quede por el camino algún dato importante.', 885, 190, 280, 240, 28, BLACK, { rotation: 3 }),
        text('Cifras orientativas de estudios sobre eventos adversos y traspasos de información.', 100, 600, 1000, 40, { fontSize: 18, color: DIM })],
        notes: 'La cifra está escrita «a rotulador» y la rodea un trazo a mano (forma con trazo a mano alzada) que aparece solo. Las cifras son orientativas: dan idea del orden de magnitud que recogen los estudios.' },
      { title: 'Cuatro letras, siempre en orden', layout: 'titleOnly', ...P, extra: S4.flatMap(([l, w, q, c], i) => { const x = 80 + i * 285, rot = [-2, 1.5, -1, 2][i];
        return [withAnims(note(x, 200, 255, 330, rot, c), A('fade-down', { start: i ? 'afterPrev' : 'click', duration: 400 })),
          withAnims(magnet(x + 128, 208, [RED, BLUE, GREEN, BLACK][i]), A('zoom-in', { start: 'withPrev', duration: 300, sound: 'pop' })),
          withAnims(marker(`<div style="font-size:96px;line-height:1">${l}</div><div style="font-size:30px;margin-top:6px">${w}</div><div style="font-size:22px;margin-top:16px;color:#3c3f45">${q}</div>`, x + 15, 240, 225, 270, 24, BLACK, { textAlign: 'center', rotation: rot }), A('fade-down', { start: 'withPrev', duration: 400 }))]; })
        .concat([anim(text('Del inglés <i>Situation, Background, Assessment, Recommendation</i>.', 80, 580, 1100, 40, { fontSize: 20, color: DIM }), 2, 'fade-in')]),
        notes: 'Un clic y las cuatro notas se pegan seguidas, cada una con su imán. La clave es la última: terminar diciendo qué necesitas, con un plazo.' },
      { title: 'Así suena un buen relevo', layout: 'titleOnly', ...P, extra: chain([
        ['S', 'Te paso a Antonio, de la 312: desde las 18:00 está más desorientado y tiene 38,4 °C.'],
        ['B', 'Ingresó hace tres días por neumonía; es diabético y toma anticoagulante.'],
        ['A', 'Respira a 24 por minuto, satura al 93 % y la tensión ha bajado a 105/60. Creo que está empeorando.'],
        ['R', 'Avisa ahora al médico de guardia y vuelve a valorarlo en una hora, por favor.']].map(([l, t], i) =>
        card(`<span style="display:inline-block;width:52px;height:52px;border-radius:26px;background:${S4[i][3]};text-align:center;line-height:52px;font-family:${MARK};font-size:30px;margin-inline-end:16px;vertical-align:middle">${l}</span>${t}`,
          i % 2 ? 200 : 90, 180 + i * 115, 990, 100, '#ffffff', { fontSize: 22, color: BLACK, vAlign: 'middle', borderColor: '#cfd3d8', radius: 26, pad: [10, 26, 10, 18] })), 'fade-right', 'click'),
        notes: 'Un clic y el diálogo entra frase a frase, como bocadillos. Paciente inventado. Fijaos en que la evaluación incluye una opinión («creo que empeora»): decirla en voz alta también es parte del relevo.' },
      { title: 'Evaluar con números: alerta temprana', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 80, y: 170, w: 640, h: 450, fontSize: 22, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#cfd3d8', banded: true, band: BLUE, colW: [4, 3, 2],
          rows: [['Parámetro', 'Valor', 'Puntos'], ['Frecuencia respiratoria', '24 /min', '2'], ['Saturación de O₂', '93 %', '2'], ['Presión sistólica', '105 mmHg', '1'], ['Frecuencia cardiaca', '112 lpm', '2'], ['Conciencia', 'Desorientado', '3'], ['Temperatura', '38,4 °C', '1'], ['Total', '', '=SUMA(ARRIBA)']] }),
        ...[['0 – 4', 'Vigilancia habitual', GREEN], ['5 – 6', 'Avisar al médico', '#e08a00'], ['7 o más', 'Respuesta urgente', RED]].map(([n, t, c], i) =>
          card(`<b style="font-size:28px">${n}</b><br>${t}`, 780, 180 + i * 120, 410, 100, c, { fontSize: 22, color: '#ffffff', vAlign: 'middle', radius: 14 })),
        withAnims(shape('ellipse', 760, 410, 450, 140, 'none', { stroke: RED, strokeWidth: 5, sketch: true }), A('zoom-in', { start: 'click', duration: 400, sound: 'pop' })),
        anim(text('Antonio suma 11: el relevo no puede esperar.', 780, 560, 410, 90, { fontFamily: MARK, fontSize: 26, color: RED }), 1, 'fade-in')],
        notes: 'Escala de alerta temprana tipo NEWS2 (simplificada para la sesión). El total es una fórmula (=SUMA(ARRIBA)); un clic rodea a mano el nivel que corresponde. Los umbrales concretos dependen del protocolo del hospital.' },
      { title: 'Lo que cambió en la planta', layout: 'titleOnly', ...P, extra: [
        chartBlock({ x: 80, y: 170, w: 720, h: 470, chartType: 'bar', color: BLUE, dataLabels: true, yTitle: '% de relevos con algún dato clave omitido', labelColor: BLACK,
          data: [{ label: 'Antes', value: 38 }, { label: '1 mes', value: 26 }, { label: '3 meses', value: 17 }, { label: '6 meses', value: 12 }] }),
        note(870, 200, 320, 300, -2), magnet(1030, 208, GREEN),
        anim(marker('De 38 a 12 en medio año, solo con ordenar lo que ya decíamos.', 895, 250, 270, 220, 28, BLACK, { rotation: -2 }), 1, 'fade-in')],
        notes: 'Auditoría inventada de una planta ficticia: se revisaron 50 relevos en cada momento con una lista de datos clave. Un clic para la conclusión en la nota.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'match', fontSize: 28, x: 70, y: 60, w: 1140, h: 600, question: 'Une cada letra con su frase',
        options: ['Situación = Tiene 38,4 °C y está desorientado', 'Antecedentes = Neumonía hace tres días', 'Evaluación = Creo que empeora', 'Recomendación = Avisa ya al médico'] })],
        notes: 'Actividad «Unir parejas» con nota: en el móvil cada letra tiene un desplegable con las frases desordenadas.' },
      { title: 'Práctica en parejas', layout: 'titleOnly', ...P, extra: [
        note(80, 180, 560, 420, -1.5, '#a9d1ff'), magnet(360, 188, RED),
        marker('Lucía, 64 años, hab. 305<br>• Operada ayer de cadera<br>• Dolor 7/10 pese a la analgesia<br>• Orina poco desde la tarde<br>• TA 98/55, FC 104', 110, 230, 500, 340, 27, BLACK, { rotation: -1.5, lineHeight: 1.45 }),
        timer(120, 760, 190, 360, { style: 'ring', color: BLUE, auto: false, endText: '¡Cambio!' }),
        text('Dos minutos para pasar el relevo con SBAR; luego se cambian los papeles.', 700, 580, 490, 70, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Caso inventado para practicar. La cuenta atrás de 2 minutos se pone en marcha al pulsarla. Quien escucha comprueba que la recomendación incluye qué y cuándo.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        marker('Lo que no se dice<br>en el relevo,<br>no existe.', 90, 150, 760, 380, 76, BLUE),
        withAnims(scribble(96, 560, 450, GREEN, 5), A('draw', { start: 'afterPrev', duration: 900 })),
        ...S4.map(([l, , , c], i) => note(940 + (i % 2) * 130, 190 + Math.floor(i / 2) * 150, 110, 110, [-5, 4, 6, -3][i], c)),
        ...S4.map(([l], i) => marker(l, 940 + (i % 2) * 130, 205 + Math.floor(i / 2) * 150, 110, 80, 56, BLACK, { textAlign: 'center', rotation: [-5, 4, -3, 6][i] }))],
        notes: 'Cierre en la pizarra con un subrayado verde que se dibuja solo. Proponed colgar una tarjeta SBAR en el control de enfermería.' },
    ]), BLACK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · A heat wave plan: alert colours and a thermometer, a made-up alert map, heat vs emergencies, a phone with the warning, 3D water.
  sci_nurse_heat: { name: 'Ola de calor: plan de salud', cat: 'sci', summary: 'Colores de alerta: termómetro que sube, Text Art, mapa de avisos dibujado, dispersión, móvil con el SMS, botella 3D, tabla y concurso', make: () => {
    const BG = '#fff4e6', INK = '#3a1d12', RED = '#d7301f', ORA = '#f46d43', YEL = '#fdae61', PALE = '#fee08b', GRN = '#66bd63', BLUE = '#2b7bb9', DIM = '#7a5a4c', H = pairStacks('bold').heading;
    const P = { bg: BG };
    const THERMO = svgURL(140, 520, '<rect x="45" y="10" width="50" height="400" rx="25" fill="#ffffff" stroke="#3a1d12" stroke-width="6"/><circle cx="70" cy="445" r="62" fill="#ffffff" stroke="#3a1d12" stroke-width="6"/>'
      + '<circle cx="70" cy="445" r="48" fill="#d7301f"/>' + Array.from({ length: 9 }, (_, i) => `<path d="M95 ${60 + i * 40}h22" stroke="#3a1d12" stroke-width="4"/>`).join(''));
    // A made-up region with six districts, coloured by alert level.
    const ZONES = [['Sierra Norte', 'M20 30 L250 10 L300 140 L150 190 L30 160 Z', 1, [140, 100]], ['Valle Alto', 'M250 10 L560 30 L580 170 L300 140 Z', 2, [420, 90]], ['Campiña', 'M30 160 L150 190 L300 140 L320 320 L60 340 Z', 3, [180, 260]],
      ['Ribera', 'M300 140 L580 170 L600 330 L320 320 Z', 3, [450, 250]], ['Llanos', 'M60 340 L320 320 L330 470 L40 460 Z', 2, [190, 410]], ['Costa', 'M320 320 L600 330 L590 470 L330 470 Z', 1, [460, 410]]];
    const LV = [GRN, PALE, ORA, RED];
    const MAP = svgURL(620, 480, ZONES.map(([n, d, l, [x, y]]) => `<path d="${d}" fill="${LV[l]}" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"/>` + ST(x, y, 21, l === 3 ? '#ffffff' : '#3a1d12', n, ' text-anchor="middle" font-weight="700"')).join(''));
    const SMS = svgURL(360, 720, '<rect width="360" height="110" fill="#f2f2f5"/>' + ST(180, 62, 20, '#222', 'Salud Pública', ' text-anchor="middle" font-weight="700"') + ST(180, 88, 14, '#888', 'Mensaje de texto · hoy 8:02', ' text-anchor="middle"')
      + '<rect x="20" y="140" width="290" height="300" rx="22" fill="#e9e9ee"/>'
      + ['AVISO ROJO por calor', 'mañana en la Ribera y', 'la Campiña: hasta 44 °C.', '', 'Bebe agua a menudo, evita', 'salir de 12 a 18 h y llama', 'a tus mayores.', '', 'Dudas: 900 000 000'].map((t, i) => ST(38, 176 + i * 28, 17, i ? '#222' : '#d7301f', t, i ? '' : ' font-weight="700"')).join(''), '#ffffff');
    return numbered(tc(build({ name: 'Plan ante la ola de calor', palette: 'office', fonts: 'bold', title: { color: RED, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: RED, transition: 'fade', extra: [
        shape('rect', 0, 0, 1280, 720, YEL, { fill2: RED, gradAngle: 135 }),
        glow(880, -200, 640, '#fff3b0', YEL, 80),
        img(THERMO, 1030, 110, 140, 520, 'Termómetro'),
        withAnims(shape('rounded', 1084, 150, 32, 410, RED, { radius: 16 }), A('fade-up', { start: 'afterPrev', duration: 2200 })),
        withAnims(text('44 °C', 760, 170, 280, 120, { fontFamily: H, fontSize: 96, fontWeight: 800, color: '#ffffff', wordart: 'shadow', textAlign: 'right' }), A('zoom-in', { start: 'afterPrev', duration: 500, sound: 'drumroll' })),
        kicker('SALUD PÚBLICA · VERANO 2026', 90, 170, 600, '#ffffff', { fontSize: 20 }),
        text('Ola de calor', 84, 210, 700, 150, { fontFamily: H, fontSize: 120, fontWeight: 800, color: '#ffffff', lineHeight: 1 }),
        text('Plan de prevención de los efectos del calor en la salud', 90, 380, 620, 100, { fontSize: 32, color: '#fff6ea' }),
        text('Coordinación de enfermería de atención primaria · área de ejemplo', 90, 600, 800, 40, { fontSize: 22, color: '#fff6ea' })],
        notes: 'Portada con degradado de alerta. El mercurio sube solo (forma que aparece desde abajo, dos segundos) y la cifra entra con un redoble (Text Art con sombra, para que se lea sobre el degradado).' },
      { title: 'El mapa de avisos de mañana', layout: 'titleOnly', ...P, extra: [
        img(MAP, 80, 170, 620, 480, 'Mapa de una región inventada con seis comarcas coloreadas por nivel de aviso'),
        withAnims(icon('triangle-alert', 238, 360, 46, '#ffffff'), A('zoom-in', { start: 'afterPrev', duration: 400 }), A('pulse', { start: 'afterPrev', duration: 800 })),
        ...chain([[3, 'Rojo · riesgo alto', 'Campiña y Ribera: más de 42 °C'], [2, 'Naranja · riesgo medio', 'Valle Alto y Llanos'], [1, 'Amarillo · bajo', 'Sierra Norte y Costa'], [0, 'Verde · sin riesgo', 'Ninguna comarca']].map(([l, h, d]) =>
          text(`<div style="font-size:26px;font-weight:700"><span style="display:inline-block;width:26px;height:26px;border-radius:6px;background:${LV[l]};vertical-align:middle;margin-inline-end:12px"></span>${h}</div><div style="color:${DIM};margin-left:38px">${d}</div>`, 760, 0, 440, 90, { fontSize: 21, color: INK })).map((b, i) => ({ ...b, y: 190 + i * 110 })), 'fade-left', 'click')],
        notes: 'Mapa inventado dibujado en SVG (seis comarcas ficticias). El aviso rojo late al llegar; con un clic, la leyenda nivel a nivel. Cada nivel activa medidas distintas en los centros de salud.' },
      { title: 'Más calor, más urgencias', layout: 'titleOnly', ...P, extra: [
        chartBlock({ x: 80, y: 170, w: 800, h: 470, chartType: 'scatter', color: RED, grid: true, xTitle: 'Temperatura máxima del día (°C)', yTitle: 'Urgencias atendidas', xMin: 28, xMax: 46, yMin: 100, yMax: 280,
          data: [[29, 118], [30, 125], [31, 121], [32, 132], [33, 128], [34, 140], [35, 138], [36, 150], [36, 157], [37, 162], [38, 171], [38, 165], [39, 184], [40, 196], [40, 205], [41, 214], [42, 231], [43, 246], [44, 262]].map(([x, y]) => ({ label: String(x), value: y })) }),
        anim(stat('+8 %', 'de urgencias por cada grado por encima de 38&nbsp;°C', 920, 220, 280, RED, INK, 80), 1, 'zoom-in'),
        anim(text('Los efectos llegan el mismo día y hasta tres días después: la vigilancia no acaba cuando baja el termómetro.', 920, 450, 280, 180, { fontSize: 20, color: DIM, lineHeight: 1.4 }), 2, 'fade-up')],
        notes: 'Dispersión con escala propia en los dos ejes: 19 días de verano de un hospital ficticio (datos inventados). La pendiente se empina a partir de un umbral, que es lo que usan los planes para fijar los avisos.' },
      { title: 'A quién hay que proteger primero', layout: 'titleOnly', ...P, extra: [
        dg('cards', 'Mayores de 75\n  Sobre todo si viven solos\nBebés y niños pequeños\n  Se deshidratan antes\nEnfermedades crónicas\n  Corazón, riñón, diabetes\nCiertos fármacos\n  Diuréticos, psicofármacos\nTrabajo al sol\n  Campo, obra, reparto\nSin hogar\n  Sin sombra ni agua a mano', 80, 170, 1120, 470, { colors: 'colorful', oneByOne: true, fontScale: 1.1 })],
        notes: 'Tarjetas que aparecen una a una. En primaria, cada centro mantiene un listado de personas vulnerables a las que llamar cuando hay aviso.' },
      { title: 'Agotamiento o golpe de calor', layout: 'titleOnly', ...P, extra: [
        card(`<div style="font-size:32px;font-weight:800;color:${ORA}">Agotamiento por calor</div><div style="margin-top:12px">${ul('Sudor abundante, piel fría y húmeda', 'Cansancio, mareo, calambres', 'Temperatura normal o algo alta')}</div><div style="margin-top:10px;font-weight:700">A la sombra, agua y descanso</div>`,
          80, 180, 540, 430, '#ffffff', { fontSize: 26, color: INK, borderColor: YEL, lineHeight: 1.4, pad: [24, 28, 24, 28] }),
        withAnims(card(`<div style="font-size:32px;font-weight:800;color:#ffffff">Golpe de calor</div><div style="margin-top:12px">${ul('Piel caliente y seca', 'Confusión, convulsiones', 'Más de 40 °C')}</div><div style="margin-top:10px;font-weight:800;font-size:30px;color:${PALE}">Emergencia: 112 y enfriar ya</div>`,
          660, 180, 540, 430, RED, { fontSize: 26, color: '#ffffff', lineHeight: 1.4, pad: [24, 28, 24, 28] }), A('fade-left', { start: 'click', duration: 500 }), A('pulse', { start: 'afterPrev', duration: 700 })),
        icon('thermometer', 1130, 120, 56, RED)],
        notes: 'Comparativa: el agotamiento se trata en el sitio; el golpe de calor es una emergencia vital. Un clic trae la tarjeta roja y la hace latir. La pista clave: la confusión.' },
      { title: 'Llamadas a personas vulnerables', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 80, y: 170, w: 1120, h: 360, fontSize: 24, header: true, headBg: ORA, headFg: '#ffffff', stroke: '#f3d3bd', banded: true, band: YEL, colW: [3, 2, 2, 2],
          rows: [['Centro de salud', 'Personas en el listado', 'Llamadas hechas', '% contactado'], ['Ribera', '412', '398', '=REDONDEAR(C2/B2*100;0)'], ['Campiña', '356', '301', '=REDONDEAR(C3/B3*100;0)'],
            ['Valle Alto', '228', '219', '=REDONDEAR(C4/B4*100;0)'], ['Llanos', '190', '144', '=REDONDEAR(C5/B5*100;0)'], ['Total', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=REDONDEAR(C6/B6*100;0)']] }),
        anim(card('Llanos no llega al 80 %: refuerzo con voluntariado y visitas a domicilio.', 80, 560, 1120, 80, '#ffffff', { fontSize: 24, color: INK, borderColor: RED, vAlign: 'middle' }), 1, 'fade-up')],
        notes: 'Tabla con fórmulas: sumas y porcentajes se calculan solos (=SUMA(ARRIBA), =REDONDEAR(C2/B2*100;0)). Cifras inventadas. Sirve como cuadro de mando diario durante el aviso.' },
      { title: 'El aviso llega al móvil', layout: 'titleOnly', ...P, extra: [
        device(SMS, 'phone', 120, 160, 250, 500, 'Mensaje de texto con un aviso rojo por calor'),
        ...chain([['bell', 'Inscripción voluntaria', 'En el centro de salud o por teléfono'], ['message-circle', 'Mensaje la víspera', 'Nivel de aviso y consejos claros'], ['phone', 'Llamada de enfermería', 'A quien vive solo o no responde']].map(([ic, h, d], i) => [
          icon(ic, 470, 200 + i * 140, 56, ORA), text(`<div style="font-size:28px;font-weight:700">${h}</div><div style="color:${DIM}">${d}</div>`, 550, 190 + i * 140, 640, 100, { fontSize: 22, color: INK })]).flat(), 'fade-left', 'afterPrev')],
        notes: 'Móvil con una pantalla inventada (imagen SVG dentro del marco de dispositivo). Los tres pasos entran solos. El número de teléfono es ficticio.' },
      { title: 'Bebe antes de tener sed', layout: 'titleOnly', ...P, extra: [
        glow(80, 140, 480, '#cfe6ff', BG, 80),
        m3d('kh-WaterBottle', 120, 160, 400, 480, { autoRotate: true, spin: 20, view: 'front', edge: 'fade' }),
        ...chain(['Agua a menudo, aunque no tengas sed', 'Comidas ligeras: fruta, verdura, gazpacho', 'Sin alcohol ni bebidas muy azucaradas', 'Casa fresca: persianas de día, ventanas de noche', 'Ropa clara y holgada; nunca dejar a nadie en el coche'].map((t, i) =>
          text(`<span style="color:${BLUE};font-weight:800">${i + 1}.</span> ${t}`, 600, 190 + i * 88, 600, 76, { fontSize: 25, color: INK })), 'fade-left', 'click')],
        notes: 'La botella 3D gira sola con bordes difuminados. Un clic y los cinco consejos entran seguidos. En mayores, la sed aparece tarde: hay que ofrecer agua aunque no la pidan.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'quiz', fontSize: 34, x: 70, y: 50, w: 1140, h: 620, time: 20, correct: [1],
        question: 'Una vecina de 82 años está confusa, con la piel caliente y seca. ¿Qué haces primero?', options: ['Darle agua y esperar a ver', 'Llamar al 112 y empezar a enfriarla', 'Darle un antitérmico', 'Llevarla a su médico mañana'] })],
        notes: 'Concurso de 20 segundos. Es un golpe de calor: emergencia. Llamar al 112 y enfriar (sombra, ropa fuera, agua y aire). El antitérmico no sirve en el golpe de calor.' },
      { layout: 'blank', bg: ORA, transition: 'zoom', extra: [
        shape('rect', 0, 0, 1280, 720, YEL, { fill2: '#b2182b', gradAngle: 180 }),
        sphere(640, 760, 260, '#fff3b0', YEL, { opacity: 90 }),
        text('Agua, sombra<br>y una llamada', 90, 120, 1100, 260, { fontFamily: H, fontSize: 104, fontWeight: 800, color: '#ffffff', textAlign: 'center', lineHeight: 1.02 }),
        text('El calor mata en silencio: pregunta hoy por tus mayores.', 90, 400, 1100, 60, { fontSize: 32, color: '#fff6ea', textAlign: 'center' }),
        ...[['droplet', 380], ['sun', 600], ['phone', 820]].map(([ic, x], i) => withAnims(icon(ic, x, 480, 80, '#ffffff'), A('zoom-in', { start: 'afterPrev', duration: 350 })))],
        notes: 'Cierre al atardecer: degradado vertical y un sol que se pone (elipse con degradado radial que asoma por abajo). Los tres iconos resumen el mensaje.' },
    ]), INK));
  } },
};
