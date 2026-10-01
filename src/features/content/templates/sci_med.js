// Example presentations: Medicina universitaria (casos clínicos, fisiología, farmacología, cardiología,
// neurología, inmunología, anatomía, ensayos clínicos…). Each one: { name, summary, cat: 'sci', make() } → a deck
// (see kit.js for the builders). General, prudent information for teaching; every patient is made up.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A picture drawn in SVG, as a data URL (no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const ST = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'fill', ...props });
const device = (src, kind, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', device: kind, ...props });
// A stroke through points on the slide (an ink object: it can be drawn as you present, effect 'draw').
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
const line = (x1, y1, x2, y2, color, width = 3, props = {}) => ink([[x1, y1], [x2, y2]], color, width, props);
const ring = (cx, cy, r, color, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, 'none', { stroke: color, strokeWidth: 2, ...props });
const sphere = (cx, cy, r, c1, c2, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, c1, { fill2: c2, gradType: 'radial', ...props });
// Points of a curve relative to its first one (for path()).
const rel = pts => pts.map(([x, y]) => [Math.round(x - pts[0][0]), Math.round(y - pts[0][1])]).slice(1);
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

// An ECG trace from x0 to x1 on the baseline y: QRS complexes at the R positions Rs, amplitude a (px).
// p: with P waves; bl(x): something added to the baseline (fibrillation, flutter); w: wider waves.
const ecg = (x0, x1, y, a, Rs, { p = true, bl = () => 0, w = 1, step = 1.5 } = {}) => {
  const g = (d, s) => Math.exp(-(d * d) / (2 * s * s)), pts = [];
  for (let x = x0; x <= x1; x += step) {
    let v = bl(x);
    for (const r of Rs) { const d = (x - r) / w; if (d < -100 || d > 140) continue;
      v += (p ? 0.12 * g(d + 58, 8) : 0) - 0.1 * g(d + 8, 2.5) + g(d, 3.2) - 0.25 * g(d - 8, 3) + 0.3 * g(d - 80, 14); }
    pts.push([x, y - v * a]);
  }
  return pts;
};
const every = (first, rr, to) => { const r = []; for (let x = first - rr; x < to + 140; x += rr) r.push(x); return r; };
// ECG paper: 1 mm squares every 16 px, 5 mm squares every 80 px.
const ECG_PAPER = (() => { let mi = '', ma = '';
  for (let x = 0; x <= 1280; x += 16) (x % 80 ? (s => { mi += s; }) : (s => { ma += s; }))(`M${x} 0V720`);
  for (let y = 0; y <= 720; y += 16) (y % 80 ? (s => { mi += s; }) : (s => { ma += s; }))(`M0 ${y}H1280`);
  return svgURL(1280, 720, `<path d="${mi}" stroke="#f6cfcc" stroke-width="1"/><path d="${ma}" stroke="#eaa29d" stroke-width="1.6"/>`, '#fff6f5'); })();
const ecgPaper = () => img(ECG_PAPER, 0, 0, 1280, 720, 'Papel milimetrado de electrocardiograma', { decorative: true });

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Cardiology: reading an ECG on ECG paper — traces that draw themselves, the impulse through the heart, normal values.
  sci_med_ecg: { name: 'Cardiología: leer un ECG', cat: 'sci', summary: 'Papel de ECG: trazados que se dibujan solos, impulso que recorre el corazón, tabla con fórmulas, ecuación, concurso y cuenta atrás', make: () => {
    const INK = '#1d1b1e', RED = '#c8102e', TEAL = '#0b6e69', DIM = '#6b5b5e', AMB = '#e08a00', H = pairStacks('tech').heading;
    const tr = (pts, w = 4) => ink(pts, INK, w);
    const draw = (b, start = 'click', duration = 2400, more = {}) => withAnims(b, A('draw', { start, duration, ...more }));
    const P = { back: [ecgPaper()] };
    // The heart (front view, simplified), 520 × 470, drawn at (90, 180).
    const HX = 90, HY = 180;
    const heart = svgURL(520, 470, '<path d="M262 92 C 205 18, 62 30, 70 172 C 80 300, 196 382, 270 452 C 362 372, 472 292, 462 160 C 452 40, 322 28, 262 92 Z" fill="#f7d3cf" stroke="#b3343a" stroke-width="5"/>'
      + '<path d="M84 214 Q 262 252 456 206" fill="none" stroke="#b3343a" stroke-width="3" stroke-dasharray="10 8"/>'
      + '<path d="M266 226 Q 280 330 272 446" fill="none" stroke="#b3343a" stroke-width="4"/>'
      + ST(150, 150, 26, '#8a2a2f', 'AD', ' font-weight="700"') + ST(340, 150, 26, '#8a2a2f', 'AI', ' font-weight="700"')
      + ST(160, 320, 26, '#8a2a2f', 'VD', ' font-weight="700"') + ST(345, 320, 26, '#8a2a2f', 'VI', ' font-weight="700"'));
    const at = (x, y) => [HX + x, HY + y];
    const route = [at(160, 104), at(214, 170), at(258, 228), at(272, 300), at(274, 380), at(272, 440)];
    // A magnified 5 mm square.
    const mag = svgURL(300, 300, Array.from({ length: 6 }, (_, i) => `<path d="M${i * 60} 0V300M0 ${i * 60}H300" stroke="#eaa29d" stroke-width="${i % 5 ? 2 : 5}"/>`).join('')
      + '<rect x="0" y="0" width="60" height="60" fill="#c8102e" opacity=".18"/>', '#fff6f5');
    // Brackets for the intervals (a line with end ticks).
    const bracket = (x1, x2, y, c) => [line(x1, y, x2, y, c, 3), line(x1, y - 9, x1, y + 9, c, 3), line(x2, y - 9, x2, y + 9, c, 3)];
    const flutter = x => 0.17 * (((x - 20) % 80) / 80) - 0.1;
    const fib = x => 0.05 * Math.sin(x / 5.5) + 0.035 * Math.sin(x / 2.6 + 1.3) + 0.02 * Math.sin(x / 11 + 0.4);
    const rows = [['Ritmo sinusal', 'Regular, una P antes de cada QRS', ecg(380, 1180, 0, 70, every(400, 220, 1060).filter(r => r <= 1060))],
      ['Fibrilación auricular', 'Irregular, sin ondas P, base temblorosa', ecg(380, 1180, 0, 70, [400, 548, 742, 836, 1010, 1100], { p: false, bl: fib })],
      ['Flutter auricular', 'Ondas F «en dientes de sierra»', ecg(380, 1180, 0, 70, every(420, 320, 1060).filter(r => r <= 1060), { p: false, bl: flutter })]];
    return numbered(build({ name: 'Leer un electrocardiograma', palette: 'forest', fonts: 'tech', title: { color: INK, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        kicker('CARDIOLOGÍA · SEMINARIO DE 3.º DE MEDICINA', 90, 96, 900, RED),
        text('Leer un<br>electrocardiograma', 84, 136, 960, 230, { fontFamily: H, fontSize: 96, fontWeight: 700, color: INK, lineHeight: 1.02 }),
        text('Diez segundos de papel que cuentan cómo late un corazón', 90, 378, 900, 50, { fontSize: 30, color: DIM }),
        text('DII · 25 mm/s · 10 mm/mV · paciente ficticio', 90, 452, 700, 30, { fontFamily: MONO, fontSize: 20, color: RED }),
        withAnims(icon('heart', 1110, 96, 80, RED), A('zoom-in', { start: 'afterPrev', duration: 500 })),
        draw(tr(ecg(0, 1280, 610, 100, every(170, 230, 1280))), 'afterPrev', 3200)],
        notes: 'Portada sobre papel milimetrado de ECG (una imagen SVG propia). El trazado se dibuja solo al llegar (efecto «Dibujar», encadenado). Pregunta inicial al grupo: ¿quién ha leído ya un ECG en prácticas?' },
      { title: 'El sistema de conducción', layout: 'titleOnly', ...P, extra: [
        img(heart, HX, HY, 520, 470, 'Corazón esquemático con sus cuatro cavidades'),
        ink(route.slice(1), AMB, 6, { opacity: 85 }), ink([at(272, 300), at(330, 360), at(380, 420)], AMB, 5, { opacity: 85 }), ink([at(270, 300), at(210, 360), at(170, 400)], AMB, 5, { opacity: 85 }),
        sphere(...at(160, 104), 13, '#ffd27a', AMB), sphere(...at(258, 228), 11, '#ffd27a', AMB),
        ...[['1', 'Nódulo sinusal', 'El marcapasos: 60–100 impulsos por minuto'], ['2', 'Nódulo auriculoventricular', 'Frena el impulso unos 0,1 s'], ['3', 'Haz de His y ramas', 'Lo reparten por el tabique'], ['4', 'Fibras de Purkinje', 'Contraen los ventrículos a la vez']].map(([n, h, d], i) =>
          withAnims(text(`<div style="font-weight:700;color:${RED};font-size:26px">${n} · ${h}</div><div style="color:${DIM}">${d}</div>`, 680, 178 + i * 118, 510, 100,
            { fontSize: 21, bg: '#ffffffe6', radius: 12, pad: [12, 18, 12, 18], borderColor: '#eaa29d' }), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 450 }))),
        withAnims(sphere(route[0][0], route[0][1], 12, '#ffffff', '#ffb000'), path(rel(route), { duration: 2200, start: 'click', ease: 'linear', sound: 'whoosh' }))],
        notes: 'Primer clic: las cuatro estaciones del sistema de conducción, una tras otra. Segundo clic: el impulso sale del nódulo sinusal y recorre el corazón (trayectoria con sonido). El retraso en el nódulo AV es lo que da tiempo a llenar los ventrículos.' },
      { title: 'Anatomía de un latido', layout: 'titleOnly', ...P, extra: [
        draw(tr(ecg(90, 820, 500, 240, [430], { w: 2.6, step: 1 }), 5), 'afterPrev', 2200),
        ...[['P', 280, 400], ['QRS', 400, 200], ['T', 640, 370]].map(([t, x, y], i) => anim(text(t, x - 60, y, 120, 40, { fontFamily: H, fontSize: 30, fontWeight: 700, color: [TEAL, RED, AMB][i], textAlign: 'center' }), i + 1, 'fade-down')),
        ...bracket(238, 405, 590, TEAL).map(b => anim(b, 1, 'fade-in')), anim(text('PR', 412, 574, 80, 32, { fontSize: 20, fontWeight: 700, color: TEAL }), 1, 'fade-in'),
        ...bracket(405, 455, 625, RED).map(b => anim(b, 2, 'fade-in')), anim(text('QRS', 462, 609, 80, 32, { fontSize: 20, fontWeight: 700, color: RED }), 2, 'fade-in'),
        ...bracket(405, 712, 660, AMB).map(b => anim(b, 3, 'fade-in')), anim(text('QT', 720, 644, 80, 32, { fontSize: 20, fontWeight: 700, color: AMB }), 3, 'fade-in'),
        ...[['Onda P', 'Despolarización de las aurículas', TEAL], ['Complejo QRS', 'Despolarización de los ventrículos', RED], ['Onda T', 'Repolarización de los ventrículos', AMB]].map(([h, d, c], i) =>
          anim(text(`<div style="font-weight:700;color:${c};font-size:26px">${h}</div><div>${d}</div>`, 860, 200 + i * 150, 330, 120, { fontSize: 22, color: INK, bg: '#ffffffe6', radius: 12, pad: [14, 18, 14, 18] }), i + 1, 'fade-left'))],
        notes: 'El latido se dibuja al llegar. Tres clics: P y el intervalo PR, el QRS y su anchura, y la T con el QT. Insistir en que el QRS tapa la repolarización auricular.' },
      { title: 'Valores de referencia en el adulto', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 90, y: 190, w: 700, h: 330, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#eaa29d', banded: true, band: '#eaa29d',
          rows: [['Medida', 'Mínimo (ms)', 'Máximo (ms)', 'Cuadritos máx.'], ['Intervalo PR', '120', '200', '=C2/40'], ['Complejo QRS', '80', '120', '=C3/40'], ['Onda P', '80', '120', '=C4/40'], ['QTc (adulto)', '350', '450', '=C5/40']], colW: [3, 2, 2, 2] }),
        text('La última columna es una fórmula: máximo ÷ 40 ms (lo que dura un cuadrito).', 90, 540, 700, 70, { fontSize: 20, color: DIM }),
        img(mag, 880, 190, 300, 300, 'Un cuadro grande de 5 mm ampliado, con un cuadrito resaltado'),
        text('<b style="color:#c8102e">1 cuadrito</b> = 1 mm = 0,04 s<br><b>1 cuadro grande</b> = 5 mm = 0,2 s', 880, 510, 320, 90, { fontSize: 22, color: INK })],
        notes: 'Tabla con fórmulas: si alguien cambia un máximo, los cuadritos se recalculan. Valores orientativos de manuales docentes; cada laboratorio y cada guía usan rangos algo distintos.' },
      { title: 'La frecuencia en cinco segundos', layout: 'titleOnly', ...P, extra: [
        draw(tr(ecg(90, 1190, 330, 120, every(240, 320, 1190))), 'afterPrev', 2000),
        anim(line(560, 200, 560, 420, RED, 2, { dash: '6 6' }), 1, 'fade-in'), anim(line(880, 200, 880, 420, RED, 2, { dash: '6 6' }), 1, 'fade-in'),
        ...bracket(560, 880, 420, RED).map(b => anim(b, 1, 'fade-in')),
        anim(text('R–R = 4 cuadros grandes', 560, 432, 320, 34, { fontSize: 22, fontWeight: 700, color: RED, textAlign: 'center' }), 1, 'fade-in'),
        withAnims(mathBlock({ x: 90, y: 490, w: 520, h: 120, fontSize: 46, color: INK, latex: '\\text{FC} = \\frac{300}{4} = 75\\ \\text{lpm}' }), A('zoom-in', { sound: 'chime' })),
        anim(mathBlock({ x: 640, y: 490, w: 550, h: 120, fontSize: 40, color: TEAL, latex: '\\text{FC} = \\frac{1500}{\\text{cuadritos R–R}}' }), 3, 'fade-up'),
        text('Regla del 300 para ritmos regulares; la de los 1500, más precisa.', 90, 630, 1100, 36, { fontSize: 20, color: DIM })],
        notes: 'El primer clic marca dos ondas R y cuenta los cuadros; el segundo hace la cuenta (con campanilla); el tercero da la fórmula fina. En ritmos irregulares: QRS en 6 segundos × 10.' },
      { title: 'Tres ritmos que hay que reconocer', layout: 'titleOnly', ...P, extra: rows.flatMap(([h, d, pts], i) => { const y = 250 + i * 150;
        return [anim(text(`<div style="font-weight:700;font-size:26px;color:${[TEAL, RED, AMB][i]}">${h}</div><div style="color:${DIM}">${d}</div>`, 90, y - 66, 270, 132, { fontSize: 19, bg: '#ffffffe6', radius: 10, pad: [10, 14, 10, 14] }), i + 1, 'fade-right'),
          withAnims(tr(pts.map(([x, v]) => [x, y + v]), 3), A('draw', { start: 'withPrev', duration: 1800 }))]; }),
        notes: 'Cada clic presenta un ritmo y se dibuja su tira. La fibrilación auricular es «irregularmente irregular»; el flutter típico da unas 300 ondas F por minuto con conducción variable (aquí 4:1).' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'quiz', fontSize: 38, x: 60, y: 40, w: 1160, h: 640, time: 20, correct: [1],
        question: 'R–R irregular, sin ondas P y con la línea de base temblorosa: ¿qué ritmo sugiere?', options: ['Ritmo sinusal', 'Fibrilación auricular', 'Flutter auricular', 'Bloqueo AV de primer grado'] })],
        notes: 'Concurso con 20 segundos desde el móvil. Comentar después el riesgo embólico como motivo de que importe reconocerla.' },
      { title: 'Tu turno: calcula la frecuencia', layout: 'titleOnly', ...P, extra: [
        draw(tr(ecg(90, 1190, 320, 120, every(200, 240, 1190))), 'afterPrev', 1800),
        text('Cuenta los cuadros grandes entre dos ondas R y aplica la regla del 300. Apunta el resultado antes de que acabe el tiempo.', 90, 470, 640, 130, { fontSize: 26, color: INK }),
        timer(60, 840, 470, 330, { style: 'digital', color: RED, w: 330, h: 130, endText: '¡Tiempo!' })],
        notes: 'Solución: 3 cuadros grandes → 300 / 3 = 100 lpm (límite alto de la normalidad). La cuenta atrás de un minuto arranca sola.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        text('Lee siempre en el mismo orden', 90, 110, 1100, 90, { fontFamily: H, fontSize: 60, fontWeight: 700, color: INK }),
        dg('chevrons', 'Ritmo\nFrecuencia\nEje\nIntervalos\nST y onda T', 90, 240, 1100, 170, { colors: 'accent', oneByOne: true }),
        text('Material docente con trazados simulados: no sirve para interpretar el ECG de una persona concreta.', 90, 440, 1100, 40, { fontSize: 20, color: DIM }),
        draw(tr(ecg(0, 1280, 620, 70, every(160, 230, 1280)), 3), 'afterPrev', 2600)],
        notes: 'Cierre con la sistemática de lectura (galones uno a uno). La disciplina de leer siempre igual evita que se escape lo importante.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Pharmacokinetics: a medicine box and a blister pack, LADME, plasma curves, equations, repeated doses in Python, a leaflet.
  sci_med_pk: { name: 'Farmacocinética: la vida media', cat: 'sci', summary: 'Estilo caja de medicamento: blíster que se llena, LADME uno a uno, curvas de dos series, ecuaciones, tabla con fórmulas, código y huecos', make: () => {
    const BG = '#eef3f4', TEAL = '#0f8b8d', ORANGE = '#c45c0a', INK = '#16323a', SOFT = '#5d7680', MINT = '#e3f1f1', H = pairStacks('clean').heading;
    // Plasma levels (mg/L) after 500 mg: IV bolus and by mouth (F = 0,8, ka = 1/h); half-life of 4 h.
    const k = Math.LN2 / 4, ka = 1, hrs = Array.from({ length: 13 }, (_, i) => i);
    const iv = hrs.map(t => +(10 * Math.exp(-k * t)).toFixed(1));
    const oral = hrs.map(t => +(8 * ka / (ka - k) * (Math.exp(-k * t) - Math.exp(-ka * t))).toFixed(1));
    // Repeated IV doses every 8 h, half-life 8 h (peaks build up to twice the first one).
    const k8 = Math.LN2 / 8, rep = Array.from({ length: 25 }, (_, i) => i * 2).map(t => { let c = 0; for (let t0 = 0; t0 <= t && t0 < 48; t0 += 8) c += 10 * Math.exp(-k8 * (t - t0)); return +c.toFixed(1); });
    const capsule = (x, y, i) => [withAnims(shape('ellipse', x - 8, y - 8, 126, 62, '#ffffff', { opacity: 70, stroke: '#b7c3c9', strokeWidth: 1 }), A('fade-in', { start: 'afterPrev', duration: 160 })),
      withAnims(shape('rounded', x, y, 110, 46, '#ffffff', { radius: 23, stroke: '#c9d3d8', strokeWidth: 1 }), A('zoom-in', { start: 'withPrev', duration: 200, ...(i === 9 && { sound: 'pop' }) })),
      withAnims(shape('rounded', x, y, 60, 46, TEAL, { radius: 23 }), A('zoom-in', { start: 'withPrev', duration: 200 })),
      withAnims(shape('rect', x + 34, y, 22, 46, TEAL), A('zoom-in', { start: 'withPrev', duration: 200 }))];
    return numbered(build({ name: 'Farmacocinética: la vida media', palette: 'office', fonts: 'clean', title: { color: INK, size: 46 }, body: { color: INK },
      decor: () => [shape('rect', 0, 0, 14, 720, TEAL), shape('rect', 14, 0, 6, 720, ORANGE)] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        shape('rounded', 80, 100, 720, 520, '#ffffff', { radius: 10, shadow: { x: 0, y: 14, blur: 40, color: '#16323a33' } }),
        shape('rect', 80, 100, 720, 120, TEAL, { fill2: '#13a7a9', gradAngle: 0 }), shape('parallelogram', 560, 100, 240, 120, ORANGE, { opacity: 90 }),
        text('FARMACOLOGÍA · TEMA 3', 120, 140, 440, 40, { fontSize: 22, letterSpacing: 6, color: '#ffffff', fontWeight: 700 }),
        text('Farmacocinética', 116, 250, 660, 100, { fontFamily: H, fontSize: 76, fontWeight: 800, color: INK, letterSpacing: -1 }),
        text('Lo que el cuerpo hace con un fármaco: entrar, repartirse, transformarse y salir', 120, 360, 640, 90, { fontSize: 27, color: SOFT }),
        text('<b>Contiene:</b> LADME · curvas de concentración · vida media · dosis repetidas', 120, 462, 640, 64, { fontSize: 20, color: INK }),
        text('Seminario · 50 minutos · grupo de 2.º curso', 120, 556, 420, 30, { fontSize: 18, color: SOFT }),
        text('VÍA ORAL · VÍA IV', 560, 548, 210, 44, { fontSize: 17, fontWeight: 700, color: '#ffffff', bg: ORANGE, radius: 22, textAlign: 'center', vAlign: 'middle', letterSpacing: 2 }),
        shape('rounded', 860, 100, 340, 520, '#d5dde1', { fill2: '#f4f7f8', gradAngle: 135, radius: 26, stroke: '#b7c3c9', strokeWidth: 2 }),
        ...Array.from({ length: 10 }, (_, i) => capsule(900 + (i % 2) * 150, 140 + Math.floor(i / 2) * 94, i)).flat()],
        notes: 'La portada imita la caja de un medicamento y un blíster que se llena solo, cápsula a cápsula, al llegar (animaciones encadenadas). Todo son formas con degradados.' },
      { title: 'LADME: el viaje de un fármaco', layout: 'titleOnly', bg: '#ffffff', extra: [
        dg('process', 'Liberación\nAbsorción\nDistribución\nMetabolismo\nExcreción', 90, 190, 1100, 170, { colors: 'accent', oneByOne: true }),
        ...['Se disgrega la forma', 'Pasa a la sangre', 'Llega a los tejidos', 'Sobre todo en el hígado', 'Riñón, bilis, aire'].map((t, i) => text(t, 90 + i * 226, 380, 196, 70, { fontSize: 20, color: SOFT, textAlign: 'center' })),
        shape('rounded', 90, 500, 1100, 130, MINT, { radius: 16 }),
        text(`<b style="color:${TEAL}">Farmacocinética</b>: lo que el cuerpo hace al fármaco. <b style="color:${ORANGE}">Farmacodinamia</b>: lo que el fármaco hace al cuerpo.`, 130, 515, 1020, 100, { fontSize: 27, color: INK, vAlign: 'middle' })],
        notes: 'Diagrama de proceso que aparece paso a paso. Por vía intravenosa no hay liberación ni absorción: la biodisponibilidad es del 100 %.' },
      { title: 'La curva de concentración en plasma', layout: 'titleOnly', bg: '#ffffff', extra: [
        chartBlock({ x: 80, y: 170, w: 760, h: 470, chartType: 'line', color: TEAL, seriesName: 'Intravenosa', grid: true, xTitle: 'Horas tras la dosis', yTitle: 'mg/L',
          data: hrs.map((t, i) => ({ label: String(t), value: iv[i] })), series: [{ name: 'Oral', values: oral, color: ORANGE }] }),
        ...[['C<sub>máx</sub>', 'la concentración más alta', ORANGE], ['t<sub>máx</sub>', 'cuándo se alcanza', ORANGE], ['AUC', 'área bajo la curva: exposición total', TEAL], ['F', 'fracción que llega a la sangre (biodisponibilidad)', TEAL]].map(([h, d, c], i) =>
          anim(text(`<span style="font-family:${H};font-weight:800;font-size:30px;color:${c}">${h}</span><br>${d}`, 880, 180 + i * 116, 320, 100, { fontSize: 21, color: INK }), i + 1, 'fade-left'))],
        notes: 'Datos simulados de un fármaco con vida media de 4 horas: 500 mg en bolo frente a la misma dosis oral con una biodisponibilidad del 80 %. Cada clic añade un parámetro.' },
      { title: 'Cuatro ecuaciones que lo explican casi todo', layout: 'titleOnly', bg: '#ffffff', extra: [
        ...[['C(t) = C_0\\, e^{-k\\,t}', 'Eliminación de primer orden'], ['t_{1/2} = \\frac{\\ln 2}{k} \\approx \\frac{0{,}693}{k}', 'Vida media'], ['V_d = \\frac{\\text{Dosis}}{C_0}', 'Volumen de distribución'], ['CL = k \\cdot V_d', 'Aclaramiento']].map(([l, c], i) => {
          const x = 90 + (i % 2) * 560, y = 180 + Math.floor(i / 2) * 235;
          return [withAnims(shape('rounded', x, y, 540, 210, i % 3 ? MINT : '#fff1e4', { radius: 18 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 400 })),
            withAnims(mathBlock({ x: x + 20, y: y + 22, w: 500, h: 120, fontSize: 42, color: INK, latex: l }), A('fade-in', { start: 'withPrev', duration: 400 })),
            withAnims(text(c, x + 20, y + 150, 500, 40, { fontSize: 22, color: i % 3 ? TEAL : ORANGE, fontWeight: 700, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 400 }))]; }).flat()],
        notes: 'Con un clic aparecen las cuatro tarjetas encadenadas. La vida media depende a la vez del volumen de distribución y del aclaramiento: t½ = 0,693 · Vd / CL.' },
      { title: 'Cada vida media, la mitad', layout: 'titleOnly', bg: '#ffffff', extra: [
        tableBlock({ x: 90, y: 180, w: 470, h: 380, fontSize: 24, header: true, headBg: TEAL, headFg: '#ffffff', stroke: '#c9d3d8', banded: true, band: TEAL,
          rows: [['Vidas medias', 'Horas', 'Queda (%)'], ...[0, 1, 2, 3, 4, 5].map(n => [String(n), `=A${n + 2}*4`, `=REDONDEAR(100/2^A${n + 2};1)`])], colW: [3, 2, 3] }),
        text('Las columnas «Horas» y «Queda» son fórmulas (vida media de 4 h).', 90, 575, 470, 60, { fontSize: 18, color: SOFT }),
        anim(chartBlock({ x: 610, y: 180, w: 580, h: 380, chartType: 'bar', color: TEAL, dataLabels: true, xTitle: 'Vidas medias', yTitle: '% que queda',
          data: [100, 50, 25, 12.5, 6.3, 3.1].map((v, i) => ({ label: String(i), value: v, color: i === 5 ? ORANGE : undefined })) }), 1, 'fade-up'),
        anim(text(`Tras <b style="color:${ORANGE}">5 vidas medias</b> queda ≈ 3 %: se considera eliminado.`, 610, 575, 580, 60, { fontSize: 22, color: INK }), 2, 'fade-in')],
        notes: 'La misma regla vale al revés: con dosis repetidas se alcanza el estado estacionario en unas 4–5 vidas medias.' },
      { title: 'Dosis repetidas: simularlo en Python', layout: 'titleOnly', bg: '#ffffff', extra: [
        codeBlock({ x: 80, y: 170, w: 600, h: 470, fontSize: 19, lang: 'python', lineSteps: '1-5|7-10|12',
          code: 'import numpy as np\n\nk = np.log(2) / 8       # vida media: 8 h\ndosis, V = 500, 50      # mg y litros\nhoras = np.arange(0, 49)\n\nC = np.zeros(len(horas))\nfor t0 in range(0, 48, 8):   # cada 8 h\n    dt = horas - t0\n    C += np.where(dt >= 0, dosis / V * np.exp(-k * dt), 0)\n\nprint(C.max().round(1))   # ≈ 19,7 mg/L' }),
        chartBlock({ x: 720, y: 170, w: 480, h: 380, chartType: 'area', color: TEAL, grid: true, xTitle: 'Horas', yTitle: 'mg/L',
          data: rep.map((v, i) => ({ label: (i * 2) % 8 ? '' : String(i * 2), value: v })) }),
        text(`Los picos se acumulan hasta <b style="color:${ORANGE}">el doble</b> del primero: el estado estacionario.`, 720, 570, 480, 70, { fontSize: 21, color: INK })],
        notes: 'Código con pasos de resaltado: parámetros, el bucle que suma cada dosis y el resultado. El gráfico de la derecha está calculado con la misma fórmula (datos de simulación, no de un fármaco real).' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'gaps', fontSize: 34, x: 70, y: 50, w: 1140, h: 620, question: 'Completa los huecos',
        text: 'Tras [5|cinco] vidas medias se ha eliminado casi el 97 % del fármaco. Si la vida media es de 6 horas, la concentración cae a la mitad en [6|seis] horas. El volumen de distribución relaciona la dosis con la [concentración] en plasma. Por vía intravenosa la biodisponibilidad es del [100] %.' })],
        notes: 'Actividad «Completar huecos» con nota desde el móvil (se aceptan número o palabra, separados con barra).' },
      { layout: 'blank', bg: BG, transition: 'page', extra: [
        withAnims(shape('rect', 110, 80, 1060, 560, '#ffffff', { rotation: -1.2, shadow: { x: 0, y: 10, blur: 30, color: '#16323a26' } }), A('fade-in', { start: 'afterPrev', duration: 500 })),
        line(463, 110, 463, 610, '#c9d3d8', 2, { dash: '8 8' }), line(816, 110, 816, 610, '#c9d3d8', 2, { dash: '8 8' }),
        text('PROSPECTO · INFORMACIÓN PARA EL ESTUDIANTE', 150, 106, 980, 36, { fontSize: 18, letterSpacing: 4, color: TEAL, fontWeight: 700 }),
        ...[['1. Qué es la vida media', 'El tiempo que tarda la concentración en plasma en bajar a la mitad.'], ['2. Por qué importa', 'Decide cada cuánto se repite una dosis y cuándo se alcanza el estado estacionario.'], ['3. Recuerde', 'Cinco vidas medias para eliminarlo; cinco para estabilizarlo.']].map(([h, d], i) =>
          [anim(text(`<div style="font-family:${H};font-weight:800;font-size:28px;color:${INK};margin-bottom:12px">${h}</div><div>${d}</div>`, 150 + i * 353, 170, 290, 240, { fontSize: 24, color: SOFT, lineHeight: 1.45 }), i + 1, 'fade-up'),
            anim(text(['t½', '⟳', '5×'][i], 150 + i * 353, 420, 290, 110, { fontFamily: H, fontSize: 88, fontWeight: 800, color: i === 1 ? ORANGE : TEAL }), i + 1, 'zoom-in')]).flat(),
        text('Información general con fines docentes. No sustituye la ficha técnica ni el criterio de un profesional sanitario.', 150, 560, 980, 50, { fontSize: 17, color: SOFT, fontStyle: 'italic' })],
        notes: 'Cierre en forma de prospecto plegado en tres (líneas discontinuas). Cada columna entra con un clic.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Immunology as a fluorescence micrograph: glowing cells, the two arms of the system, the antibody, phagocytosis with Transform.
  sci_med_immune: { name: 'Inmunología: la respuesta inmune', cat: 'sci', summary: 'Microscopio de fluorescencia: células que se encienden, anticuerpo dibujado, fagocitosis con Transformar, organigrama y emparejar', make: () => {
    const BG = '#05060a', BLUE = '#4d7cff', GREEN = '#39e58c', MAG = '#ff4fd8', FG = '#eef0ff', DIM = '#8c92b0', H = pairStacks('modern').heading;
    const cell = (x, y, r, c) => [shape('ellipse', x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6, c, { fill2: BG, gradType: 'radial', opacity: 55 }), sphere(x, y, r * 0.75, '#ffffff', c, { opacity: 90 })];
    const R = rng(11), cells = Array.from({ length: 26 }, () => [810 + R() * 420, 50 + R() * 620, 8 + R() * 16, [BLUE, GREEN, MAG, BLUE][Math.floor(R() * 4)]]);
    const scale = (x, y) => [shape('rect', x, y, 140, 6, FG), text('10 µm', x, y + 12, 140, 30, { fontSize: 18, color: FG, textAlign: 'center' })];
    const meta = t => text(t, 60, 668, 700, 30, { fontFamily: MONO, fontSize: 16, color: DIM });
    // Phagocytosis (Transform): the macrophage and two bacteria keep their ids from one slide to the next.
    const MAC = uid(), B1 = uid(), B2 = uid(), PILL = uid();
    const mac = (x, y, w, h) => ({ ...shape('ellipse', x, y, w, h, GREEN, { fill2: '#0a3a24', gradType: 'radial', opacity: 85 }), id: MAC });
    const bact = (id, x, y, w, rot, op = 100) => ({ ...shape('rounded', x, y, w, w * 0.4, MAG, { radius: 999, fill2: '#7a1060', gradType: 'radial', rotation: rot, opacity: op }), id });
    const steps = active => [...['Reconocer', 'Englobar', 'Destruir'].map((t, i) => text(`${i + 1} · ${t}`, 90 + i * 230, 600, 220, 44, { fontSize: 22, color: FG, textAlign: 'center', vAlign: 'middle' })),
      { ...shape('rounded', 90 + active[0] * 230, 646, (active[1] - active[0] + 1) * 230 - 10, 8, GREEN, { radius: 4 }), id: PILL }];
    return numbered(build({ name: 'La respuesta inmune', palette: 'midnight', fonts: 'modern', title: { color: FG, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...cells.map(([x, y, r, c]) => cell(x, y, r, c).map(b => withAnims(b, A('fade-in', { start: 'afterPrev', duration: 160 })))).flat(),
        kicker('INMUNOLOGÍA · 2.º DE MEDICINA', 90, 190, 520, GREEN),
        text('La respuesta<br>inmune', 84, 230, 640, 220, { fontFamily: H, fontSize: 92, fontWeight: 800, color: FG, lineHeight: 1.02 }),
        text('Cómo distingue el cuerpo lo propio de lo ajeno, y cómo lo recuerda', 90, 460, 520, 90, { fontSize: 28, color: DIM }),
        meta('Fluorescencia · 40× · DAPI / FITC / TRITC · imagen simulada'), ...scale(1080, 640)],
        notes: 'Portada como una micrografía de fluorescencia: las células (elipses con degradado radial) se encienden solas una tras otra al llegar. Los colores imitan los tintes habituales: azul para núcleos, verde y magenta para marcadores.' },
      { title: 'Dos brazos, un sistema', layout: 'titleOnly', bg: BG, extra: [
        ...[['Innata', 'Desde el nacimiento', GREEN, ['Responde en minutos u horas', 'Reconoce patrones comunes', 'No genera memoria', 'Barreras, fagocitos, NK, complemento']],
          ['Adaptativa', 'Se educa con cada encuentro', MAG, ['Tarda días la primera vez', 'Es específica de cada antígeno', 'Deja memoria duradera', 'Linfocitos B y T, anticuerpos']]].map(([h, s, c, items], i) => {
          const x = 90 + i * 570;
          return [anim(shape('rounded', x, 180, 530, 440, '#0d1020', { radius: 22, stroke: c, strokeWidth: 2, shadow: { x: 0, y: 0, blur: 30, color: c + '66' } }), i + 1, i ? 'fade-left' : 'fade-right'),
            anim(text(`<div style="font-family:${H};font-size:44px;font-weight:800;color:${c}">${h}</div><div style="color:${DIM}">${s}</div>`, x + 36, 206, 460, 110, { fontSize: 22 }), i + 1, 'fade-in'),
            anim(text(ul(...items), x + 36, 330, 470, 280, { fontSize: 27, color: FG, lineHeight: 1.6 }), i + 1, 'fade-in')]; }).flat(),
        anim(sphere(640, 410, 26, '#ffffff', BLUE), 3, 'zoom-in'), anim(text('↔', 615, 388, 50, 44, { fontSize: 30, color: BG, textAlign: 'center', fontWeight: 800 }), 3, 'zoom-in')],
        notes: 'Dos clics, un brazo cada uno; el tercero los une: la innata presenta los antígenos y activa a la adaptativa, y los anticuerpos ayudan a la innata.' },
      { title: 'Quién es quién', layout: 'titleOnly', bg: BG, transition: 'concave', extra: [
        dg('hierarchy', 'Sistema inmunitario\n  Innato\n    Fagocitos\n    Células NK\n    Complemento\n  Adaptativo\n    Linfocitos B\n    Linfocitos T CD4\n    Linfocitos T CD8', 90, 180, 1100, 460, { colors: 'colorful', oneByOne: true })],
        notes: 'Organigrama que aparece rama a rama. Las células dendríticas hacen de puente entre los dos brazos.' },
      { title: 'El anticuerpo', layout: 'titleOnly', bg: BG, extra: (() => {
        const cx = 860, base = 620, hinge = 430, tipL = [690, 230], tipR = [1030, 230];
        const arm = (t, dx) => [[cx + dx, hinge], [t[0] + dx * 0.4, t[1] + 20]];
        return [glow(cx - 300, 120, 600, '#3a1a5a', BG, 50),
          withAnims(ink([[cx - 14, base], [cx - 14, hinge], [tipL[0] + 14, tipL[1] + 30]], MAG, 22), A('draw', { start: 'afterPrev', duration: 900 })),
          withAnims(ink([[cx + 14, base], [cx + 14, hinge], [tipR[0] - 14, tipR[1] + 30]], MAG, 22), A('draw', { start: 'withPrev', duration: 900 })),
          withAnims(ink([[cx - 44, hinge - 20], [tipL[0] - 10, tipL[1] + 10]], GREEN, 16), A('draw', { start: 'afterPrev', duration: 600 })),
          withAnims(ink([[cx + 44, hinge - 20], [tipR[0] + 10, tipR[1] + 10]], GREEN, 16), A('draw', { start: 'withPrev', duration: 600 })),
          ...[['Fab<br>reconoce el antígeno', 520, 300, GREEN], ['Fc<br>avisa a otras células', 900, 500, MAG]].map(([t, x, y, c], i) => anim(text(t, x, y, 180, 86, { fontSize: 20, color: c, fontWeight: 700 }), i + 1, 'fade-in')),
          text('Cadenas pesadas', 1000, 600, 200, 30, { fontSize: 18, color: MAG }), text('Cadenas ligeras', 1000, 630, 200, 30, { fontSize: 18, color: GREEN }),
          withAnims(shape('star', 1120, 110, 56, 56, BLUE, { fill2: '#a9c0ff', gradType: 'radial' }), path([[-40, 60], [-100, 92]], { duration: 1400, start: 'click', sound: 'pop' })),
          text('Cada linfocito B fabrica un anticuerpo con una sola especificidad. Las puntas de los brazos encajan con un antígeno como una llave en su cerradura.', 90, 190, 400, 300, { fontSize: 26, color: FG, lineHeight: 1.45 }),
          text('IgG · forma de «Y» · ~150 kDa', 90, 520, 420, 40, { fontSize: 20, color: DIM, fontFamily: MONO })]; })(),
        notes: 'La «Y» se dibuja sola: primero las cadenas pesadas y luego las ligeras. Dos clics para las regiones Fab y Fc; el tercero lleva el antígeno (la estrella) hasta su sitio de unión, con sonido.' },
      { title: 'Fagocitosis', layout: 'titleOnly', bg: BG, extra: [
        mac(160, 200, 380, 320), sphere(320, 330, 40, '#ffffff', BLUE, { opacity: 85 }),
        bact(B1, 820, 270, 110, 20), bact(B2, 900, 420, 96, -30),
        text('El macrófago detecta moléculas típicas de bacterias (patrones) con sus receptores.', 640, 200, 560, 60, { fontSize: 22, color: DIM }),
        ...steps([0, 0])],
        notes: 'Primera de dos diapositivas con Transformar: el macrófago, las bacterias y la barra de progreso tienen el mismo identificador en ambas.' },
      { title: 'Fagocitosis', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        mac(330, 160, 560, 440), sphere(460, 300, 40, '#ffffff', BLUE, { opacity: 85 }),
        ring(660, 420, 92, '#ffd166', { strokeWidth: 4, dash: '8 6' }),
        bact(B1, 610, 390, 70, 60, 70), bact(B2, 640, 430, 62, -10, 70),
        anim(text('Fagolisosoma: enzimas y radicales de oxígeno destruyen la bacteria', 900, 300, 300, 160, { fontSize: 22, color: '#ffd166' }), 1, 'fade-left'),
        ...steps([1, 2])],
        notes: 'Transformar: el macrófago crece y engulle a las dos bacterias, que se encogen dentro del fagolisosoma. Luego presenta trozos de la bacteria a los linfocitos T.' },
      { title: 'La segunda vez, más rápido y más fuerte', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 220, w: 800, h: 420, chartType: 'area', color: MAG, grid: true, xTitle: 'Días', yTitle: 'Anticuerpos (unidades arbitrarias)', seriesName: 'Anticuerpos',
          data: [0, 4, 7, 10, 14, 21, 28, 31, 35, 42, 49, 56].map((d, i) => ({ label: String(d), value: [0, 2, 8, 18, 22, 12, 6, 30, 90, 110, 95, 80][i] })) }),
        anim(text('1.ª exposición', 140, 170, 300, 36, { fontSize: 22, color: GREEN, fontWeight: 700 }), 1, 'fade-down'),
        anim(text('2.ª exposición', 520, 170, 300, 36, { fontSize: 22, color: MAG, fontWeight: 700 }), 2, 'fade-down'),
        anim(text(`La memoria inmunitaria es la base de las <b style="color:${GREEN}">vacunas</b>: un primer encuentro seguro prepara una respuesta secundaria rápida.`, 920, 260, 290, 300, { fontSize: 24, color: FG, lineHeight: 1.45 }), 3, 'fade-left')],
        notes: 'Curva ilustrativa (no son datos reales). La respuesta secundaria tiene menos latencia, más anticuerpos y sobre todo IgG de mayor afinidad.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', fontSize: 30, x: 60, y: 40, w: 1160, h: 640, question: 'Une cada célula con lo que hace',
        options: ['Linfocito B = Produce anticuerpos', 'Linfocito T CD8 = Destruye células infectadas', 'Linfocito T CD4 = Coordina la respuesta', 'Macrófago = Fagocita y presenta antígenos', 'Célula NK = Ataca células que esconden su MHC I'] })],
        notes: 'Actividad «Unir parejas» con nota: en el móvil cada célula tiene un desplegable con las funciones desordenadas.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: 'Resume en una palabra lo que más te ha sorprendido del sistema inmune', options: [] })],
        notes: 'Nube de palabras en directo: las más repetidas crecen. Buen momento para resolver dudas.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        ...cells.slice(0, 14).map(([x, y, r, c]) => cell(x - 710, y, r * 0.8, c)).flat().map(b => ({ ...b, opacity: 35 })),
        text('Lo propio, lo ajeno<br>y la memoria', 90, 220, 1100, 220, { fontFamily: H, fontSize: 80, fontWeight: 800, color: FG, textAlign: 'center', lineHeight: 1.05 }),
        text('Próxima sesión: tolerancia y autoinmunidad', 90, 470, 1100, 50, { fontSize: 28, color: GREEN, textAlign: 'center' }),
        meta('Material docente · imágenes y curvas simuladas'), ...scale(1080, 640)],
        notes: 'Cierre sobre el mismo fondo de microscopio. Anunciar el tema siguiente.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · A clinical case (pneumonia) as a hospital file: a kraft folder, typed sheets, a stamp, an X-ray on a light box, CURB-65.
  sci_med_case: { name: 'Caso clínico: fiebre y tos', cat: 'sci', summary: 'Estilo historia clínica: carpeta, sello, radiografía en negatoscopio con círculo que se dibuja, CURB-65 con fórmula, votación y preguntas', make: () => {
    const KRAFT = '#d8c299', FOLDER = '#c7a76e', SHEET = '#fffdf6', INK = '#2b2620', RED = '#b8322a', BLUE = '#2a4d8f', DIM = '#7a6e5f', AMB = '#c98a12', H = pairStacks('websafe').heading;
    const sheet = (x, y, w, h, rot = 0, props = {}) => shape('rect', x, y, w, h, SHEET, { rotation: rot, shadow: { x: 0, y: 8, blur: 22, color: '#5a452433' }, ...props });
    const typed = (t, x, y, w, h, props = {}) => text(t, x, y, w, h, { fontFamily: MONO, fontSize: 22, color: INK, lineHeight: 1.45, ...props });
    const label = (t, x, y, w, c = RED) => text(t, x, y, w, 30, { fontFamily: MONO, fontSize: 17, color: c, letterSpacing: 3, fontWeight: 700 });
    const head = t => text(t, 90, 70, 900, 70, { fontFamily: H, fontSize: 46, color: INK, fontStyle: 'italic' });
    const clip = (x, y) => ink([[x, y + 90], [x, y + 12], [x + 9, y], [x + 18, y + 12], [x + 18, y + 70], [x + 12, y + 78], [x + 6, y + 70], [x + 6, y + 24]], '#8b8f96', 4);
    // A chest X-ray (posteroanterior): dark lungs, white bones and heart, and the consolidation at the right base (viewer's left).
    const xray = svgURL(500, 440, '<defs><filter id="b"><feGaussianBlur stdDeviation="9"/></filter><filter id="s"><feGaussianBlur stdDeviation="2.5"/></filter>'
      + '<radialGradient id="t" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#6f6f6f"/><stop offset="1" stop-color="#262626"/></radialGradient></defs>'
      + '<path d="M40 440 C 40 250, 80 120, 160 70 L 340 70 C 420 120, 460 250, 460 440 Z" fill="url(#t)"/>'
      + '<path d="M120 120 C 80 200, 76 320, 92 380 C 150 400, 200 392, 226 372 L 226 120 C 190 100, 150 100, 120 120 Z" fill="#141414" filter="url(#s)"/>'
      + '<path d="M380 120 C 420 200, 424 320, 408 380 C 350 400, 300 392, 274 372 L 274 120 C 310 100, 350 100, 380 120 Z" fill="#141414" filter="url(#s)"/>'
      + Array.from({ length: 8 }, (_, i) => { const y = 120 + i * 34; return `<path d="M248 ${y} C 200 ${y - 14}, 130 ${y - 6}, ${96 + i * 2} ${y + 34}" stroke="#d9d9d9" stroke-width="5" fill="none" opacity=".45" filter="url(#s)"/><path d="M252 ${y} C 300 ${y - 14}, 370 ${y - 6}, ${404 - i * 2} ${y + 34}" stroke="#d9d9d9" stroke-width="5" fill="none" opacity=".45" filter="url(#s)"/>`; }).join('')
      + '<rect x="236" y="60" width="28" height="380" rx="8" fill="#d0d0d0" opacity=".7" filter="url(#s)"/>'
      + '<path d="M236 240 C 300 236, 372 270, 380 340 C 330 380, 270 384, 236 372 Z" fill="#cfcfcf" opacity=".75" filter="url(#s)"/>'
      + '<ellipse cx="160" cy="330" rx="62" ry="44" fill="#e6e6e6" opacity=".75" filter="url(#b)"/>'
      + '<path d="M60 95 L 150 70 M 440 95 L 350 70" stroke="#e0e0e0" stroke-width="9" opacity=".6" filter="url(#s)"/>'
      + '<text x="24" y="40" font-family="sans-serif" font-size="28" font-weight="700" fill="#ffffff">D</text>', '#050505');
    return numbered(build({ name: 'Caso clínico: fiebre y tos', palette: 'paper', fonts: 'websafe', title: { color: INK, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', bg: KRAFT, transition: 'fade', extra: [
        shape('rounded', 100, 46, 300, 70, FOLDER, { radius: 14 }), shape('rect', 70, 90, 1140, 600, FOLDER, { shadow: { x: 0, y: 10, blur: 30, color: '#4a371b44' } }),
        text('HC 0042-F', 120, 56, 270, 30, { fontFamily: MONO, fontSize: 17, color: INK, letterSpacing: 2, fontWeight: 700 }),
        sheet(120, 120, 1040, 540, -0.8),
        label('SESIÓN CLÍNICA · SERVICIO DE MEDICINA INTERNA', 170, 160, 800, DIM),
        text('Fiebre, tos y un pulmón<br>que no suena', 166, 210, 760, 190, { fontFamily: H, fontSize: 64, color: INK, lineHeight: 1.12 }),
        typed('Varón de 68 años · acude a Urgencias en enero', 170, 420, 700, 40, { fontSize: 24 }),
        typed('Presenta: residente de 2.º año · Discute: adjunta del servicio', 170, 470, 700, 40, { fontSize: 18, color: DIM }),
        clip(1100, 96),
        withAnims(shape('seal', 890, 380, 230, 230, 'none', { stroke: RED, strokeWidth: 5, rotation: -12, opacity: 85 }), A('zoom-in', { start: 'afterPrev', delay: 600, duration: 300, sound: 'click' })),
        withAnims(text('CASO<br>FICTICIO', 890, 445, 230, 100, { fontFamily: MONO, fontSize: 30, fontWeight: 700, color: RED, textAlign: 'center', vAlign: 'middle', rotation: -12, letterSpacing: 3, opacity: 85 }), A('zoom-in', { start: 'withPrev', duration: 300 }))],
        notes: 'Portada como una historia clínica dentro de su carpeta. El sello «Caso ficticio» cae solo al llegar (con sonido de clic). Todos los datos del paciente son inventados con fines docentes.' },
      { layout: 'blank', bg: KRAFT, extra: [
        head('Anamnesis'), sheet(70, 150, 1140, 530, 0.4),
        ...Array.from({ length: 12 }, (_, i) => line(110, 238 + i * 36, 1170, 238 + i * 36, '#d6e1ef', 1)), line(600, 175, 600, 655, '#e7b7b2', 2),
        anim(label('MOTIVO DE CONSULTA', 110, 180, 460), 1, 'fade-in'),
        anim(typed('Fiebre de 39 °C y tos con expectoración herrumbrosa desde hace 3 días.', 110, 220, 460, 110), 1, 'fade-in'),
        anim(label('ANTECEDENTES', 110, 360, 460), 2, 'fade-in'),
        anim(typed('Exfumador (30 paquetes-año). Hipertensión tratada. Sin alergias. No se vacunó de la gripe este año.', 110, 400, 460, 180), 2, 'fade-in'),
        anim(label('ENFERMEDAD ACTUAL', 640, 180, 520), 3, 'fade-in'),
        anim(typed('Comienzo brusco con escalofríos. Dolor en el costado derecho que aumenta al respirar hondo. Disnea con esfuerzos moderados. Su familia lo nota «más cansado», sin confusión.', 640, 220, 530, 300), 3, 'fade-in'),
        withAnims(ink([[640, 560], [1150, 560]], '#ffe14d', 22, { opacity: 70 }), A('draw', { start: 'afterPrev', duration: 700 })),
        anim(typed('<b>Pista:</b> dolor pleurítico + fiebre + tos productiva', 650, 532, 520, 70, { fontSize: 20 }), 3, 'fade-in')],
        notes: 'Tres clics: motivo, antecedentes y enfermedad actual, como en la hoja de ingreso. El subrayado amarillo se dibuja al final. Pedir al grupo que piense ya un diagnóstico diferencial.' },
      { layout: 'blank', bg: KRAFT, extra: [
        head('Exploración física'),
        ...[['Temperatura', '38,9', '°C', RED], ['Frecuencia cardiaca', '104', 'lpm', RED], ['Frecuencia respiratoria', '26', 'rpm', RED], ['Saturación de O₂', '91', '%', RED], ['Presión arterial', '102/64', 'mmHg', AMB]].map(([l, v, u, c], i) => {
          const x = 90 + i * 222;
          return [withAnims(sheet(x, 170, 200, 230, i % 2 ? 1.2 : -1.2), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 300 })),
            withAnims(shape('rect', x, 170, 200, 14, c, { rotation: i % 2 ? 1.2 : -1.2 }), A('fade-in', { start: 'withPrev', duration: 300 })),
            withAnims(text(`<div style="font-family:${MONO};font-size:15px;color:${DIM};letter-spacing:1px">${l.toUpperCase()}</div><div style="font-family:${H};font-size:${v.length > 4 ? 46 : 60}px;color:${c};margin-top:18px;line-height:1">${v}</div><div style="font-family:${MONO};font-size:20px;color:${INK}">${u}</div>`,
              x + 14, 200, 172, 180, { fontSize: 20, textAlign: 'center', rotation: i % 2 ? 1.2 : -1.2 }), A('fade-in', { start: 'withPrev', duration: 300, sound: 'pop' }))]; }).flat(),
        anim(sheet(90, 440, 1100, 210, 0), 2, 'fade-up'),
        anim(label('AUSCULTACIÓN Y PERCUSIÓN', 130, 465, 600), 2, 'fade-up'),
        anim(typed('Crepitantes y soplo tubárico en la base derecha. Matidez a la percusión en la misma zona. Resto sin hallazgos relevantes. Consciente y orientado.', 130, 505, 1020, 130, { fontSize: 23 }), 2, 'fade-up')],
        notes: 'Primer clic: las cinco constantes entran una tras otra (con sonido); en rojo, las alteradas. Segundo clic: la exploración pulmonar, que localiza el problema.' },
      { layout: 'blank', bg: KRAFT, extra: [
        head('Pruebas complementarias'),
        shape('rounded', 80, 160, 560, 500, '#e8eef2', { radius: 16, stroke: '#9aa4ab', strokeWidth: 3, shadow: { x: 0, y: 10, blur: 24, color: '#00000033' } }),
        img(xray, 110, 190, 500, 440, 'Radiografía de tórax simulada con una condensación en la base derecha'),
        withAnims(ink(Array.from({ length: 41 }, (_, i) => { const a = i / 40 * Math.PI * 2.1; return [110 + 160 + 86 * Math.cos(a), 190 + 330 + 64 * Math.sin(a)]; }), RED, 5), A('draw', { duration: 1200, sound: 'whoosh' })),
        anim(text('Condensación en el lóbulo inferior derecho', 110, 592, 440, 34, { fontSize: 18, color: '#ffffff', bg: '#b8322acc', pad: [4, 10, 4, 10], radius: 6 }), 1, 'fade-in'),
        sheet(680, 160, 520, 500, 0),
        label('ANALÍTICA DE URGENCIAS', 710, 180, 460),
        tableBlock({ x: 700, y: 220, w: 480, h: 360, fontSize: 21, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d9cfbd', lines: true, fontFamily: MONO,
          rows: [['Parámetro', 'Valor', 'Referencia'], ['Leucocitos (/µL)', '<b style="color:#b8322a">16.800</b>', '4.000–11.000'], ['Neutrófilos', '<b style="color:#b8322a">87 %</b>', '40–75 %'], ['PCR (mg/L)', '<b style="color:#b8322a">180</b>', '< 5'], ['Urea (mg/dL)', '<b style="color:#b8322a">48</b>', '15–42'], ['Creatinina (mg/dL)', '1,1', '0,7–1,3'], ['Lactato (mmol/L)', '1,8', '< 2']], colW: [5, 3, 4] }),
        typed('Hemocultivos y antígenos en orina: pendientes.', 710, 596, 470, 56, { fontSize: 17, color: DIM })],
        notes: 'La radiografía es un dibujo SVG (no es de un paciente). Un clic dibuja el círculo rojo sobre la condensación del lóbulo inferior derecho: recordar que en la placa la derecha del paciente queda a nuestra izquierda («D»).' },
      { layout: 'blank', bg: KRAFT, extra: [pollBlock({ kind: 'choice', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, display: 'bar', question: 'Con lo que sabes, ¿cuál es tu primera sospecha?',
        options: ['Neumonía adquirida en la comunidad', 'Tromboembolismo pulmonar', 'Insuficiencia cardiaca', 'Cáncer de pulmón'] })],
        notes: 'Votación en directo con el móvil. Antes de enseñar el resultado, pedir a quien haya votado otra opción que la defienda: el diagnóstico diferencial es lo más formativo de la sesión.' },
      { layout: 'blank', bg: KRAFT, extra: [
        head('Gravedad: escala CURB-65'), sheet(70, 150, 720, 520, -0.3),
        tableBlock({ x: 100, y: 180, w: 660, h: 420, fontSize: 22, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#d9cfbd', banded: true, band: BLUE,
          rows: [['Criterio', 'Umbral', 'Paciente', 'Punto'], ['<b>C</b>onfusión', 'Nueva', 'No', '0'], ['<b>U</b>rea', '> 42 mg/dL', '48', '1'], ['<b>R</b>espiración', '≥ 30 rpm', '26', '0'],
            ['<b>B</b>lood pressure', 'PAS < 90 o PAD ≤ 60', '102/64', '0'], ['Edad', '≥ <b>65</b>', '68', '1'], ['<b>Total</b>', '', '', '=SUMA(ARRIBA)']], colW: [4, 5, 3, 2] }),
        typed('El total es una fórmula: cambia un punto y se recalcula.', 100, 615, 660, 40, { fontSize: 17, color: DIM }),
        ...[['0–1', 'Riesgo bajo', '#4f8a3c'], ['2', 'Riesgo intermedio', AMB], ['3–5', 'Riesgo alto', RED]].map(([n, l, c], i) =>
          anim(text(`<span style="font-family:${H};font-size:44px;font-weight:700">${n}</span><br>${l}`, 840, 190 + i * 140, 340, 120, { fontSize: 22, color: '#ffffff', bg: c, radius: 12, pad: [10, 20, 10, 20] }), 1, 'fade-left')),
        withAnims(shape('leftarrow', 1150, 352, 90, 56, INK), A('fade-in', { start: 'afterPrev', duration: 300 }), path([[-30, 0], [0, 0]], { start: 'afterPrev', duration: 600 }))],
        notes: 'CURB-65 suma un punto por criterio (la B es de «blood pressure»). Nuestro paciente suma 2: riesgo intermedio, en el que las guías suelen aconsejar valorar el ingreso. La decisión real siempre es clínica e individual.' },
      { layout: 'blank', bg: KRAFT, extra: [
        head('Evolución durante el ingreso'),
        dg('timeline', 'Día 1\n  Ingreso y hemocultivos\nDía 2\n  Antibiótico intravenoso\nDía 3\n  Sin fiebre\nDía 5\n  Paso a vía oral\nDía 7\n  Alta y control', 90, 150, 1100, 210, { colors: 'accent', oneByOne: true }),
        sheet(90, 390, 1100, 280, 0),
        chartBlock({ x: 120, y: 400, w: 760, h: 260, chartType: 'line', color: RED, grid: true, yTitle: '°C', seriesName: 'Temperatura máxima', yMin: 36, yMax: 39.5,
          data: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((d, i) => ({ label: d, value: [38.9, 38.4, 37.6, 37.1, 36.9, 36.8, 36.7][i] })) }),
        typed('Curva febril: mejoría en las primeras 72 h, el momento clave para reevaluar.', 910, 440, 260, 200, { fontSize: 20 })],
        notes: 'Cronología que aparece hito a hito. El antibiótico concreto depende de las guías locales y de cada paciente; aquí no se recomienda ninguno.' },
      { layout: 'blank', bg: KRAFT, transition: 'page', extra: [
        head('Mensajes para llevar'), sheet(90, 160, 1100, 470, -0.6),
        ...['Fiebre + tos productiva + dolor pleurítico + crepitantes focales: piensa en neumonía.', 'La radiografía confirma; las escalas (CURB-65) ayudan a decidir dónde tratar.', 'Reevalúa a las 48–72 h: si no mejora, busca complicaciones u otro diagnóstico.'].map((t, i) => [
          anim(text(String(i + 1), 130, 200 + i * 140, 70, 70, { fontFamily: H, fontSize: 40, color: '#ffffff', bg: RED, radius: 35, textAlign: 'center', vAlign: 'middle' }), i + 1, 'zoom-in'),
          anim(typed(t, 230, 200 + i * 140, 900, 110, { fontSize: 25 }), i + 1, 'fade-right')]).flat(),
        clip(1130, 136)],
        notes: 'Tres ideas, una por clic. Recordar que el caso es ficticio y que la información es general.' },
      { layout: 'blank', bg: KRAFT, extra: [pollBlock({ kind: 'qa', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: 'Preguntas para la sesión clínica', options: [] })],
        notes: 'Preguntas del público desde el móvil, con votos a las más interesantes. La adjunta modera.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · How to read a randomised trial, as a journal article: masthead, CONSORT with connectors, Kaplan–Meier, NNT, a forest plot.
  sci_med_trial: { name: 'Ensayo clínico: leer los resultados', cat: 'sci', summary: 'Estilo revista científica: CONSORT con conectores, curvas de supervivencia, tabla con fórmulas, NNT, forest plot en cadena y concurso', make: () => {
    const INK = '#141414', RED = '#b3122e', GREY = '#6d6d6d', RULE = '#cfcfcf', BLUE = '#1f5fa8', PALE = '#f3f1ee', H = pairStacks('editorial').heading;
    const head = t => text(t, 90, 74, 1100, 70, { fontFamily: H, fontSize: 40, fontWeight: 700, color: INK });
    const cap = (t, x, y, w) => text(t, x, y, w, 36, { fontSize: 17, color: GREY, fontStyle: 'italic' });
    const masthead = [text('REVISTA DE MEDICINA BASADA EN PRUEBAS', 60, 22, 700, 26, { fontSize: 14, letterSpacing: 4, color: RED, fontWeight: 700 }),
      text('Club de revistas · vol. 12 · n.º 4', 760, 22, 460, 26, { fontSize: 14, color: GREY, textAlign: 'right' }), shape('rect', 60, 52, 1160, 2, INK), shape('rect', 60, 674, 1160, 1, RULE)];
    // CONSORT boxes (ids kept for the connectors).
    const box = (t, x, y, w, h, props = {}) => text(t, x, y, w, h, { fontSize: 19, color: INK, textAlign: 'center', vAlign: 'middle', bg: '#ffffff', borderColor: INK, pad: [6, 10, 6, 10], ...props });
    const bx = { a: box('Evaluados para elegibilidad<br><b>n = 1.240</b>', 440, 160, 400, 66), x: box('Excluidos <b>n = 440</b><br>No cumplían criterios: 312 · Rechazaron: 128', 890, 222, 330, 80, { fontSize: 17, bg: PALE }),
      b: box('Aleatorizados <b>n = 800</b>', 440, 322, 400, 56, { borderColor: RED, color: RED }),
      c1: box('Intervención <b>n = 400</b>', 150, 422, 400, 56), c2: box('Control <b>n = 400</b>', 730, 422, 400, 56),
      d1: box('Pérdidas de seguimiento: 12', 150, 512, 400, 48, { fontSize: 17, bg: PALE }), d2: box('Pérdidas de seguimiento: 9', 730, 512, 400, 48, { fontSize: 17, bg: PALE }),
      e1: box('Analizados (por intención de tratar) <b>n = 400</b>', 150, 594, 400, 60, { fontSize: 17 }), e2: box('Analizados (por intención de tratar) <b>n = 400</b>', 730, 594, 400, 60, { fontSize: 17 }) };
    const link = (f, t, o) => anim({ ...base(0, 0, 1280, 720), type: 'connector', from: bx[f].id, to: bx[t].id, color: GREY, arrow: true }, o, 'fade-in');
    const step = { a: 1, x: 2, b: 2, c1: 3, c2: 3, d1: 4, d2: 4, e1: 4, e2: 4 };
    // Forest plot: HR and 95 % CI per subgroup, on a linear scale from 0,4 to 1,6.
    const FX = 470, FW = 520, X = v => FX + (v - 0.4) / 1.2 * FW;
    const sub = [['Global', 0.72, 0.58, 0.89, 1], ['Menores de 65 años', 0.70, 0.50, 0.98], ['65 años o más', 0.75, 0.56, 1.01], ['Mujeres', 0.69, 0.48, 0.99], ['Hombres', 0.74, 0.56, 0.98], ['Con diabetes', 0.80, 0.55, 1.17], ['Sin diabetes', 0.68, 0.52, 0.89]];
    return numbered(build({ name: 'Ensayo clínico: leer los resultados', palette: 'grayscale', fonts: 'editorial', title: { color: INK, size: 40 }, body: { color: INK }, decor: () => masthead }, [
      { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
        kicker('ARTÍCULO ORIGINAL · LECTURA CRÍTICA', 90, 100, 700, RED, { fontSize: 18 }),
        text('Cómo leer un ensayo clínico aleatorizado sin perderse en las cifras', 84, 140, 1000, 190, { fontFamily: H, fontSize: 54, fontWeight: 700, color: INK, lineHeight: 1.18 }),
        text('Unidad docente de Medicina Preventiva · sesión para residentes de primer año', 90, 340, 1000, 36, { fontSize: 22, color: GREY }),
        shape('rect', 90, 400, 1100, 230, PALE),
        ...[['Objetivo', 'Aprender a pasar del resumen de un ensayo a una decisión informada.'], ['Métodos', 'Un ensayo ficticio de 800 pacientes, leído de la tabla 1 a la figura 3.'], ['Resultados', 'Riesgo relativo, absoluto, NNT e intervalos de confianza, sin miedo.']].map(([h, d], i) =>
          anim(text(`<div style="font-family:${H};font-weight:700;color:${RED};font-size:24px;margin-bottom:8px">${h}</div>${d}`, 120 + i * 360, 425, 330, 190, { fontSize: 21, color: INK, lineHeight: 1.45 }), i + 1, 'fade-in'))],
        notes: 'Portada con aspecto de artículo: cabecera de revista (ficticia) en todas las diapositivas y un resumen estructurado que aparece por partes.' },
      { layout: 'blank', bg: '#ffffff', extra: [
        head('Dónde está el ensayo en la pirámide'),
        dg('pyramid', 'Revisiones\nEnsayos\nCohortes\nCasos y controles\nSeries de casos\nOpinión experta', 80, 160, 600, 480, { colors: 'accent', oneByOne: true }),
        text(`<p style="margin:0 0 14px"><span style="float:left;font-family:${H};font-size:76px;line-height:.85;color:${RED};padding:4px 10px 0 0">A</span>leatorizar reparte al azar todo lo que no medimos —edad, gravedad, hábitos—, así que la única diferencia sistemática entre los grupos es el tratamiento.</p><p style="margin:0">Por eso el ensayo bien hecho está tan alto en la pirámide: es el diseño que mejor separa la causa de la casualidad.</p>`,
          700, 180, 490, 440, { fontSize: 23, color: INK, lineHeight: 1.5 })],
        notes: 'Pirámide de la evidencia que se construye nivel a nivel. A la derecha, un texto con capitular, como en una revista.' },
      { layout: 'blank', bg: '#ffffff', extra: [
        cap('Figura 1. Diagrama de flujo CONSORT del ensayo (datos ficticios).', 90, 100, 900),
        ...Object.entries(bx).map(([k, b]) => anim(b, step[k], 'fade-in')),
        link('a', 'b', 2), link('a', 'x', 2), link('b', 'c1', 3), link('b', 'c2', 3), link('c1', 'd1', 4), link('d1', 'e1', 4), link('c2', 'd2', 4), link('d2', 'e2', 4)],
        notes: 'Diagrama CONSORT con cajas unidas por conectores, en cuatro clics: cribado, aleatorización, asignación y análisis. Comprobar siempre cuántos se perdieron y si se analizó por intención de tratar.' },
      { layout: 'blank', bg: '#ffffff', extra: [
        head('Supervivencia libre de evento'),
        chartBlock({ x: 80, y: 160, w: 760, h: 450, chartType: 'line', color: BLUE, grid: true, xTitle: 'Meses desde la aleatorización', yTitle: '% sin evento', seriesName: 'Intervención',
          data: [0, 3, 6, 9, 12, 15, 18, 21, 24].map((m, i) => ({ label: String(m), value: [100, 96, 92, 89, 87, 86, 85, 85, 85][i] })),
          series: [{ name: 'Control', values: [100, 94, 88, 84, 81, 80, 79, 78, 78], color: RED }] }),
        cap('Figura 2. Curvas de Kaplan–Meier (simuladas).', 80, 620, 760),
        anim(text(`<div style="font-size:18px;letter-spacing:3px;color:${GREY}">HAZARD RATIO</div><div style="font-family:${H};font-size:64px;font-weight:700;color:${INK};line-height:1.1">0,72</div><div>IC 95 %: 0,58–0,89</div><div style="color:${GREY}">p = 0,003</div>`,
          890, 200, 300, 230, { fontSize: 24, color: INK, borderColor: RULE, pad: [18, 22, 18, 22] }), 1, 'fade-left'),
        anim(text('Un 28 % menos de riesgo instantáneo de evento con la intervención.', 890, 460, 300, 120, { fontSize: 21, color: GREY }), 2, 'fade-in')],
        notes: 'Las curvas se separan pronto y se mantienen. El HR resume la diferencia a lo largo de todo el seguimiento; el intervalo no incluye el 1. Datos ficticios.' },
      { layout: 'blank', bg: '#ffffff', extra: [
        head('Del riesgo relativo al NNT'),
        tableBlock({ x: 90, y: 170, w: 600, h: 230, fontSize: 22, header: true, headBg: INK, headFg: '#ffffff', stroke: RULE, lines: true,
          rows: [['Grupo', 'Eventos', 'Pacientes', 'Riesgo (%)'], ['Control', '88', '400', '=REDONDEAR(B2/C2*100;1)'], ['Intervención', '60', '400', '=REDONDEAR(B3/C3*100;1)'], ['<b>Diferencia (RRA)</b>', '', '', '=D2-D3']], colW: [4, 3, 3, 3] }),
        cap('Tabla 2. La columna de riesgo y la diferencia son fórmulas.', 90, 410, 600),
        anim(mathBlock({ x: 730, y: 170, w: 460, h: 90, fontSize: 30, color: BLUE, latex: 'RRA = 0{,}22 - 0{,}15 = 0{,}07' }), 1, 'fade-left'),
        anim(mathBlock({ x: 730, y: 280, w: 460, h: 110, fontSize: 30, color: GREY, latex: 'RRR = \\frac{0{,}07}{0{,}22} \\approx 0{,}32' }), 2, 'fade-left'),
        anim(mathBlock({ x: 730, y: 410, w: 460, h: 110, fontSize: 30, color: RED, latex: 'NNT = \\frac{1}{0{,}07} \\approx 14{,}3' }), 3, 'fade-left'),
        withAnims(text(`<div style="font-family:${H};font-size:80px;font-weight:700;color:${RED};line-height:1">NNT = 15</div><div style="margin-top:10px">pacientes tratados durante dos años para evitar un evento</div>`, 90, 470, 600, 170, { fontSize: 24, color: INK }), A('zoom-in', { sound: 'drumroll', duration: 700 }))],
        notes: 'Un «32 % menos» suena mejor que «7 puntos menos», pero es la misma diferencia. El NNT se redondea hacia arriba: 15. Datos inventados.' },
      { layout: 'blank', bg: '#ffffff', extra: [
        head('Resultados por subgrupos'),
        line(X(1), 170, X(1), 600, INK, 2, { dash: '6 6' }), line(FX, 600, FX + FW, 600, INK, 2),
        ...[0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(v => text(String(v).replace('.', ','), X(v) - 30, 608, 60, 28, { fontSize: 16, color: GREY, textAlign: 'center' })),
        text('← favorece la intervención', FX, 636, 260, 28, { fontSize: 16, color: BLUE }), text('favorece el control →', X(1) + 10, 636, 250, 28, { fontSize: 16, color: RED }),
        text('Subgrupo', 90, 160, 340, 30, { fontSize: 18, color: GREY, fontWeight: 700 }), text('HR (IC 95 %)', 1010, 160, 200, 30, { fontSize: 18, color: GREY, fontWeight: 700 }),
        ...sub.map(([n, hr, lo, hi, all], i) => { const y = 210 + i * 56, st = { start: i ? 'afterPrev' : 'click', duration: 300 };
          return [withAnims(text(n, 90, y - 16, 360, 32, { fontSize: 20, color: INK, fontWeight: all ? 700 : 400 }), A('fade-in', st)),
            withAnims(line(X(lo), y, X(hi), y, all ? RED : INK, 3), A('fade-in', { start: 'withPrev', duration: 300 })),
            withAnims(shape(all ? 'diamond' : 'rect', X(hr) - (all ? 18 : 8), y - (all ? 14 : 8), all ? 36 : 16, all ? 28 : 16, all ? RED : INK), A('zoom-in', { start: 'withPrev', duration: 300 })),
            withAnims(text(`${String(hr).replace('.', ',')} (${String(lo).replace('.', ',')}–${String(hi).replace('.', ',')})`, 1010, y - 16, 200, 32, { fontSize: 18, color: INK }), A('fade-in', { start: 'withPrev', duration: 300 }))]; }).flat()],
        notes: 'Forest plot dibujado con formas: un clic y los subgrupos aparecen uno tras otro. Los que cruzan el 1 no son significativos por sí solos, pero son coherentes con el global: no hay que «cazar» subgrupos.' },
      { layout: 'blank', bg: '#ffffff', extra: [pollBlock({ kind: 'quiz', fontSize: 36, x: 60, y: 70, w: 1160, h: 590, time: 25, correct: [1],
        question: 'Si el intervalo de confianza del 95 % de un HR incluye el 1, ¿qué podemos decir?', options: ['Que el tratamiento es perjudicial', 'Que la diferencia no es estadísticamente significativa', 'Que el ensayo está mal diseñado', 'Que el efecto es muy grande'] })],
        notes: 'Concurso con 25 segundos. Matiz: «no significativo» no es lo mismo que «no hay efecto»; a veces falta potencia.' },
      { layout: 'blank', bg: '#ffffff', transition: 'fade', extra: [
        head('Antes de creerte un ensayo'),
        ...['¿La asignación fue aleatoria y oculta?', '¿Hubo enmascaramiento de pacientes y evaluadores?', '¿Se perdió menos del 20 % del seguimiento?', '¿Se analizó por intención de tratar?', '¿La variable principal le importa al paciente?', '¿Quién financió el estudio?'].map((t, i) => {
          const x = 90 + (i % 2) * 560, y = 180 + Math.floor(i / 2) * 140;
          return [anim(icon('check', x, y + 8, 44, RED), i + 1, 'zoom-in'), anim(text(t, x + 64, y, 470, 110, { fontFamily: H, fontSize: 25, color: INK, lineHeight: 1.35 }), i + 1, 'fade-in')]; }).flat(),
        text('Ensayo, cifras y revista inventados para la docencia.', 90, 620, 1100, 36, { fontSize: 18, color: GREY, fontStyle: 'italic' })],
        notes: 'Lista de comprobación que se completa con seis clics. Es una versión resumida de las listas de lectura crítica habituales.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Anatomy of the knee as a Renaissance plate: parchment, sepia engraving, curved Latin text, Transform to the tibial plateau, 3D gait.
  sci_med_knee: { name: 'Anatomía: la rodilla', cat: 'sci', summary: 'Estilo lámina anatómica antigua: texto curvo, grabado en sepia, Transformar a los meniscos, matriz, tabla, figura 3D que camina y etiquetar', make: () => {
    const INK = '#3a2614', SEPIA = '#5b3a1e', RUST = '#9c3d1c', DIM = '#8a6f4e', BONE = '#f3e6c8', H = pairStacks('classic').heading, KNEE = uid();
    const vign = () => shape('rect', 0, 0, 1280, 720, '#f6ecd3', { fill2: '#d4bc8c', gradType: 'radial' });
    const P = { back: [vign()] };
    const frame = [shape('rect', 30, 30, 1220, 660, 'none', { stroke: SEPIA, strokeWidth: 2, opacity: 60 }), shape('rect', 40, 40, 1200, 640, 'none', { stroke: SEPIA, strokeWidth: 1, opacity: 40 })];
    const plate = t => text(t, 90, 64, 1100, 70, { fontFamily: H, fontSize: 46, color: INK, fontStyle: 'italic' });
    const hatch = Array.from({ length: 14 }, (_, i) => `<path d="M${150 + (i % 7) * 15} ${20 + Math.floor(i / 7) * 80 + (i % 7) * 4} l12 40" stroke="${SEPIA}" stroke-width="1" opacity=".35"/>`).join('');
    // Right knee, front view (lateral side on the viewer's left), 400 × 560.
    const KNEE_SVG = svgURL(400, 560, `<g stroke="${SEPIA}" stroke-width="3" stroke-linejoin="round">`
      + `<path d="M140 0 L260 0 L262 210 C 300 230, 330 260, 330 300 C 330 340, 300 352, 270 345 C 240 340, 220 330, 200 330 C 180 330, 160 340, 130 345 C 100 352, 70 340, 70 300 C 70 260, 100 230, 138 210 Z" fill="${BONE}"/>`
      + `<path d="M75 374 C 140 366, 260 366, 325 374 C 330 402, 300 420, 270 430 L 262 560 L 150 560 L 140 430 C 100 420, 72 402, 75 374 Z" fill="${BONE}"/>`
      + `<path d="M70 410 C 58 410 50 422 56 434 L 76 560 L 98 560 L 92 434 C 96 422 84 410 70 410 Z" fill="${BONE}"/>`
      + `<path d="M78 360 Q 130 348 190 357 Q 132 374 78 369 Z" fill="${RUST}" opacity=".75"/><path d="M210 357 Q 270 348 322 360 Q 322 369 210 368 Z" fill="${RUST}" opacity=".75"/>`
      + `</g>${hatch}<path d="M214 300 L 186 384 M 186 300 L 214 386" stroke="${RUST}" stroke-width="6"/>`
      + `<path d="M330 290 L 324 450" stroke="#b88a5a" stroke-width="11" opacity=".85"/><path d="M70 296 L 66 418" stroke="#b88a5a" stroke-width="7" opacity=".85"/>`
      + `<ellipse cx="200" cy="255" rx="44" ry="54" fill="#efdcb2" stroke="${SEPIA}" stroke-width="3" opacity=".92"/>`);
    // The tibial plateau seen from above: the menisci and the cruciate insertions, 600 × 400.
    const PLATEAU = svgURL(600, 400, `<path d="M60 200 C 60 90, 200 50, 300 80 C 400 50, 540 90, 540 200 C 540 300, 420 350, 300 320 C 180 350, 60 300, 60 200 Z" fill="${BONE}" stroke="${SEPIA}" stroke-width="3"/>`
      + `<ellipse cx="180" cy="196" rx="92" ry="84" fill="none" stroke="${RUST}" stroke-width="30" opacity=".8" stroke-dasharray="500 28" transform="rotate(-20 180 196)"/>`
      + `<path d="M380 112 C 470 90, 520 150, 515 205 C 510 270, 460 312, 380 292" fill="none" stroke="${RUST}" stroke-width="26" opacity=".8" stroke-linecap="round"/>`
      + `<circle cx="300" cy="140" r="16" fill="#c96f3b"/><circle cx="300" cy="268" r="16" fill="#7a5a3a"/>`
      + Array.from({ length: 10 }, (_, i) => `<path d="M${90 + i * 45} 330 l20 30" stroke="${SEPIA}" stroke-width="1" opacity=".3"/>`).join(''));
    const knee = (x, y, w, h, props = {}) => ({ ...img(KNEE_SVG, x, y, w, h, 'Rodilla derecha en vista anterior, dibujada como un grabado', props), id: KNEE });
    const lead = (x1, y1, x2, y2, t, tx, ty, o, align = 'left', w = 220) => [anim(line(x1, y1, x2, y2, SEPIA, 2), o, 'fade-in'),
      anim(text(t, tx, ty, w, 80, { fontFamily: H, fontSize: 26, fontStyle: 'italic', color: INK, textAlign: align }), o, 'fade-in')];
    const runner = lib3d('kh-CesiumMan');
    return numbered(build({ name: 'Anatomía: la rodilla', palette: 'paper', fonts: 'classic', title: { color: INK, size: 46 }, body: { color: INK }, decor: () => frame }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        kicker('LÁMINA I · APARATO LOCOMOTOR', 90, 150, 600, RUST, { fontSize: 18 }),
        text('La rodilla', 84, 190, 640, 160, { fontFamily: H, fontSize: 120, fontStyle: 'italic', color: INK, lineHeight: 1 }),
        text('Articulatio genus', 90, 350, 600, 50, { fontFamily: H, fontSize: 34, fontStyle: 'italic', color: RUST }),
        shape('rect', 90, 420, 160, 2, SEPIA),
        text('Huesos, ligamentos y meniscos de la articulación más grande del cuerpo', 90, 440, 560, 100, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
        ring(950, 360, 230, SEPIA, { strokeWidth: 2 }), ring(950, 360, 172, SEPIA, { strokeWidth: 1, opacity: 60 }),
        withAnims(text('ARTICULATIO GENUS · FEMUR · PATELLA · TIBIA · FIBULA · MENISCI · ', 730, 140, 440, 440, { fontFamily: H, fontSize: 25, curve: 100, color: SEPIA, letterSpacing: 4, textAlign: 'center' }), A('spin360', { start: 'afterPrev', duration: 4000 })),
        knee(880, 230, 140, 196)],
        notes: 'Portada como una lámina antigua: viñeteado con degradado radial, doble marco y un sello con texto curvo que da una vuelta al llegar (énfasis «Girar 360°»). La rodilla es un dibujo SVG propio.' },
      { layout: 'blank', ...P, extra: [
        plate('Huesos y superficies'),
        knee(160, 150, 360, 504),
        ...lead(330, 200, 560, 200, 'Fémur', 570, 176, 1), ...lead(380, 380, 560, 300, 'Rótula', 570, 276, 2),
        ...lead(430, 476, 560, 410, 'Menisco medial', 570, 386, 3), ...lead(345, 600, 560, 520, 'Tibia', 570, 496, 4), ...lead(226, 600, 150, 630, 'Peroné', 60, 610, 5),
        anim(text(ul('Dos articulaciones en una: femorotibial y femoropatelar', 'Sinovial, en bisagra, con algo de rotación', 'La rótula, el mayor hueso sesamoideo'), 800, 190, 400, 420, { fontSize: 24, color: INK, lineHeight: 1.5 }), 6, 'fade-in')],
        notes: 'Cinco clics para las estructuras, con líneas guía como en un grabado; el sexto, las ideas clave. Vista anterior de la rodilla derecha: el peroné queda a nuestra izquierda.' },
      { layout: 'blank', ...P, autoAnimate: true, extra: [
        plate('Los meniscos, vistos desde arriba'),
        knee(90, 170, 140, 196),
        text('Corte por la interlínea →', 70, 380, 200, 60, { fontSize: 18, color: DIM, fontStyle: 'italic', textAlign: 'center' }),
        img(PLATEAU, 300, 160, 600, 400, 'Meseta tibial vista desde arriba con los dos meniscos'),
        text('Anterior', 560, 140, 80, 30, { fontSize: 18, color: DIM, fontStyle: 'italic', textAlign: 'center' }),
        ...lead(250, 470, 330, 420, 'Menisco lateral<br>en «O»', 30, 470, 1, 'right'),
        ...lead(870, 470, 800, 420, 'Menisco medial<br>en «C»', 890, 470, 2),
        ...lead(600, 300, 940, 250, 'Inserción del LCA', 950, 230, 3, 'left', 270), ...lead(600, 428, 940, 340, 'Inserción del LCP', 950, 320, 4, 'left', 270),
        text('Fibrocartílago que reparte la carga y estabiliza: el medial, más fijo, se lesiona más.', 300, 600, 680, 60, { fontSize: 20, color: INK, textAlign: 'center' })],
        notes: 'Transformar: la rodilla de la lámina anterior se encoge a la esquina (mismo objeto) y aparece la meseta tibial vista desde arriba. Cuatro clics para los nombres.' },
      { layout: 'blank', ...P, transition: 'convex', extra: [
        plate('Cuatro ligamentos, cuatro frenos'),
        dg('matrix', 'Cruzado anterior (LCA)\n  Frena el avance de la tibia\nCruzado posterior (LCP)\n  Frena su retroceso\nColateral medial (LLI)\n  Resiste el valgo\nColateral lateral (LLE)\n  Resiste el varo', 90, 160, 760, 480, { colors: 'accent', oneByOne: true }),
        text('<i>Ligamentum cruciatum anterius</i>: el que más se rompe en el deporte, al girar con el pie apoyado.', 890, 220, 310, 280, { fontFamily: H, fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'Matriz de 2 × 2 que aparece casilla a casilla. Los cruzados controlan el plano anteroposterior; los colaterales, el lateral.' },
      { layout: 'blank', ...P, extra: [
        plate('Exploración: maniobras clásicas'),
        tableBlock({ x: 90, y: 160, w: 1100, h: 430, fontSize: 23, header: true, headBg: SEPIA, headFg: '#fbf4e2', stroke: '#c9b48a', banded: true, band: '#b88a5a',
          rows: [['Maniobra', 'Explora', 'Es positiva si…'], ['Cajón anterior', 'LCA', 'La tibia se desplaza hacia delante con la rodilla a 90°'], ['Lachman', 'LCA', 'Hay desplazamiento anterior a 20–30° de flexión'], ['Cajón posterior', 'LCP', 'La tibia se hunde hacia atrás'], ['Bostezo en valgo', 'LLI', 'Se abre el lado medial de la articulación'], ['McMurray', 'Meniscos', 'Aparece chasquido o dolor al rotar en flexión']], colW: [3, 2, 7] }),
        text('Orientación docente: la exploración se aprende en prácticas supervisadas.', 90, 610, 1100, 36, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Tabla con estilo sepia y filas alternas. Lachman es la maniobra más sensible para el LCA en la lesión aguda.' },
      { layout: 'blank', ...P, extra: [
        plate('La rodilla en la marcha'),
        chartBlock({ x: 560, y: 150, w: 640, h: 270, chartType: 'hbar', color: RUST, dataLabels: true, seriesName: 'Flexión (°)',
          data: [{ label: 'Andar', value: 60 }, { label: 'Subir escaleras', value: 85 }, { label: 'Sentarse', value: 95 }, { label: 'Agacharse', value: 135 }] }),
        text('Flexión aproximada que pide cada actividad (grados).', 560, 424, 640, 30, { fontSize: 18, color: DIM, fontStyle: 'italic' }),
        text('En cada paso la rodilla se flexiona dos veces: al apoyar el talón amortigua, y al balancear la pierna se dobla para no arrastrar el pie.', 90, 160, 430, 260, { fontSize: 24, color: INK, lineHeight: 1.45 }),
        line(60, 672, 1220, 672, SEPIA, 2),
        withAnims(model('kh-CesiumMan', 60, 440, 220, 232, { caption: '', clip: '*', view: 'side', bleed: 1.3 }), path([[760, 0]], { duration: 7000, ease: 'linear' }))],
        notes: 'La figura 3D camina en bucle; con un clic recorre la lámina. Valores de flexión aproximados de la literatura docente.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'label', fontSize: 30, x: 60, y: 50, w: 1160, h: 620, question: 'Pon nombre a cada estructura', image: KNEE_SVG,
        options: ['Fémur', 'Rótula', 'Menisco lateral', 'Tibia', 'Peroné', 'Ligamento colateral medial'],
        points: [{ x: 50, y: 15 }, { x: 50, y: 45 }, { x: 32, y: 64 }, { x: 52, y: 88 }, { x: 18, y: 88 }, { x: 83, y: 66 }] })],
        notes: 'Actividad «Etiquetar una imagen» con nota: cada estudiante arrastra los nombres a los números desde el móvil.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        text('Sin rodilla<br>no hay paso', 90, 170, 640, 260, { fontFamily: H, fontSize: 96, fontStyle: 'italic', color: INK, lineHeight: 1.05 }),
        text('Próxima lámina: el tobillo y el pie', 90, 450, 600, 50, { fontSize: 28, color: RUST }),
        m3d('kk-Skeleton_Minion', 780, 110, 400, 520, { clip: lib3d('kk-Skeleton_Minion').arrive, view: 'front', motion: 'float' }),
        credits(['kh-CesiumMan'], 90, 630, 680, DIM)],
        notes: 'Cierre con un esqueleto 3D que celebra (animación propia del modelo). Su licencia es CC0; la de la figura que camina va en la línea de créditos.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Stroke code against the clock: sirens, hazard stripes, a giant number, BE-FAST, the chain of care, ordering and a countdown.
  sci_med_stroke: { name: 'Neurología: código ictus', cat: 'sci', summary: 'Contrarreloj de urgencias: luces de sirena, cifra gigante con redoble, BE-FAST en cadena, dona, galones, ordenar pasos y cuenta atrás', make: () => {
    const BG = '#0a0a0c', RED = '#ff2d3d', BLUE = '#2d7bff', FG = '#f4f4f6', DIM = '#9a9aa6', YEL = '#ffd23f', H = pairStacks('bold').heading;
    const hazard = y => [shape('rect', 0, y, 1280, 28, '#111111'), ...Array.from({ length: 22 }, (_, i) => shape('parallelogram', -40 + i * 64, y, 52, 28, YEL))];
    const big = (t, x, y, w, h, size, color, props = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1, letterSpacing: 2, ...props });
    const siren = (x, c, o) => withAnims(glow(x, 80, 560, c, BG, 70), A('fade-in-then-semi-out', { start: o ? 'withPrev' : 'afterPrev', duration: 1400, delay: o ? 700 : 0 }));
    return numbered(build({ name: 'Código ictus', palette: 'revela', fonts: 'bold', title: { color: FG, size: 60 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(-200, 80, 560, RED, BG, 35), glow(920, 80, 560, BLUE, BG, 35), siren(-200, RED, 0), siren(920, BLUE, 1),
        kicker('NEUROLOGÍA · MEDICINA DE URGENCIAS', 90, 170, 1100, YEL, { textAlign: 'center' }),
        big('CÓDIGO ICTUS', 90, 210, 1100, 190, 180, RED, { textAlign: 'center', wordart: 'neon', wordartColor: RED }),
        text('El tiempo es cerebro: qué hacer en los primeros minutos', 90, 420, 1100, 50, { fontSize: 30, color: FG, textAlign: 'center' }),
        ...hazard(640)],
        notes: 'Portada con dos brillos de sirena (rojo y azul) que se encienden y se atenúan solos al llegar. «Código ictus» es Text Art neón en rojo. Bandas de aviso hechas con paralelogramos.' },
      { layout: 'blank', bg: BG, extra: [
        withAnims(big('1,9 MILLONES', 90, 150, 1100, 230, 220, FG, { textAlign: 'center' }), A('zoom-in', { start: 'afterPrev', duration: 900, sound: 'drumroll' })),
        withAnims(text('de neuronas se pierden <b style="color:#ff2d3d">cada minuto</b> de un ictus isquémico grande sin tratar', 140, 400, 1000, 110, { fontSize: 34, color: FG, textAlign: 'center' }), A('fade-up', { start: 'afterPrev' })),
        withAnims(text('Y con ellas unos 14.000 millones de sinapsis. Estimación clásica, orientativa.', 140, 540, 1000, 40, { fontSize: 22, color: DIM, textAlign: 'center' }), A('fade-in', { start: 'afterPrev' })),
        ...hazard(692)],
        notes: 'La cifra entra sola con redoble. Sirve para justificar por qué todo el sistema está organizado contra el reloj.' },
      { title: 'Reconocerlo: BE-FAST', layout: 'titleOnly', bg: BG, extra: [
        ...[['B', 'Equilibrio', 'Mareo o inestabilidad brusca'], ['E', 'Ojos', 'Pérdida de visión o visión doble'], ['F', 'Cara', 'Boca torcida al sonreír'], ['A', 'Brazo', 'Debilidad de un lado'], ['S', 'Habla', 'Confusa, o no sale'], ['T', 'Tiempo', 'Llama al 112: anota la hora']].map(([l, h, d], i) => {
          const x = 90 + (i % 3) * 370, y = 180 + Math.floor(i / 3) * 240, last = i === 5, st = { start: i ? 'afterPrev' : 'click', duration: 350, sound: last ? 'chime' : 'pop' };
          return [withAnims(shape('rounded', x, y, 350, 220, last ? RED : '#17171c', { radius: 18, stroke: last ? RED : '#2c2c35', strokeWidth: 2 }), A('zoom-in', st)),
            withAnims(big(l, x + 24, y + 24, 110, 160, 150, last ? '#ffffff' : RED), A('fade-in', { start: 'withPrev', duration: 350 })),
            withAnims(text(`<div style="font-family:${H};font-size:44px;letter-spacing:1px">${h}</div><div style="color:${last ? '#ffe3e6' : DIM}">${d}</div>`, x + 140, y + 40, 190, 160, { fontSize: 21, color: FG }), A('fade-in', { start: 'withPrev', duration: 350 }))]; }).flat()],
        notes: 'Con un clic las seis tarjetas aparecen encadenadas, con sonido. Cualquier signo de aparición brusca basta para avisar: no hay que esperar a que se pase.' },
      { title: 'Dos tipos de ictus', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 80, y: 170, w: 460, h: 460, chartType: 'doughnut', color: RED, labelColor: FG,
          data: [{ label: 'Isquémico', value: 85, color: BLUE }, { label: 'Hemorrágico', value: 15, color: RED }] }),
        anim(text(`<div style="font-family:${H};font-size:52px;color:${BLUE}">Isquémico · 85 %</div>Un trombo o un émbolo tapona una arteria. Se puede intentar abrirla: fármacos trombolíticos o trombectomía.`, 600, 190, 600, 200, { fontSize: 25, color: FG, lineHeight: 1.4 }), 1, 'fade-left'),
        anim(text(`<div style="font-family:${H};font-size:52px;color:${RED}">Hemorrágico · 15 %</div>Se rompe un vaso. Abrir arterias empeoraría el sangrado: por eso la imagen va antes que el tratamiento.`, 600, 420, 600, 200, { fontSize: 25, color: FG, lineHeight: 1.4 }), 2, 'fade-left')],
        notes: 'Proporciones aproximadas en países occidentales. Desde fuera no se distinguen: hace falta un TC.' },
      { title: 'La cadena contra el reloj', layout: 'titleOnly', bg: BG, extra: [
        dg('chevrons', 'Reconocer\n112\nPreaviso\nTC\nReperfusión', 90, 170, 1100, 170, { colors: 'colorful', oneByOne: true }),
        tableBlock({ x: 90, y: 380, w: 760, h: 260, fontSize: 24, header: true, headBg: RED, headFg: '#ffffff', stroke: '#2c2c35', lines: true,
          rows: [['Objetivo orientativo en el hospital', 'Minutos'], ['De la puerta a la imagen (TC)', '≤ 25'], ['De la puerta a la trombólisis', '≤ 60'], ['De la puerta a la trombectomía', '≤ 90']], colW: [5, 2] }),
        text('El <b style="color:#ffd23f">preaviso</b> de la ambulancia hace que el equipo espere en la puerta.', 890, 400, 300, 220, { fontSize: 25, color: FG, lineHeight: 1.4 })],
        notes: 'Galones uno a uno y una tabla con los tiempos de referencia más citados en las guías; cada centro fija los suyos.' },
      { title: 'Cada minuto cuenta', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 170, w: 760, h: 460, chartType: 'area', color: RED, grid: true, xTitle: 'Horas desde el inicio', yTitle: 'Beneficio relativo (%)', seriesName: 'Beneficio',
          data: [['0,5', 100], ['1', 90], ['1,5', 79], ['2', 68], ['2,5', 58], ['3', 48], ['3,5', 39], ['4', 30], ['4,5', 22]].map(([l, v]) => ({ label: l, value: v })) }),
        anim(big('−15 MIN', 890, 220, 320, 120, 110, YEL), 1, 'zoom-in'),
        anim(text('Cada cuarto de hora que se adelanta el tratamiento se traduce en más pacientes independientes a los tres meses.', 890, 350, 320, 220, { fontSize: 24, color: FG, lineHeight: 1.4 }), 1, 'fade-up')],
        notes: 'Curva ilustrativa, no son datos de un estudio concreto: el beneficio de la reperfusión cae a medida que pasa el tiempo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', fontSize: 34, x: 60, y: 50, w: 1160, h: 620, question: 'Ordena la cadena del código ictus',
        options: ['Reconocer los síntomas', 'Llamar al 112', 'Preaviso al hospital', 'TC craneal', 'Tratamiento de reperfusión'] })],
        notes: 'Actividad «Ordenar» con nota: los pasos llegan desordenados al móvil y cada posición correcta puntúa.' },
      { title: 'Simulacro: un minuto', layout: 'titleOnly', bg: BG, extra: [
        text('Escribe en un papel los seis signos de BE-FAST, sin mirar. Cuando suene, comparamos.', 90, 200, 560, 200, { fontSize: 32, color: FG, lineHeight: 1.4 }),
        timer(60, 760, 170, 420, { color: RED, endText: '¡Tiempo!' }), ...hazard(660)],
        notes: 'Cuenta atrás en anillo de un minuto que arranca sola. Luego, corregir en parejas.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(340, 40, 600, RED, BG, 45),
        withAnims(big('112', 90, 120, 1100, 300, 300, FG, { textAlign: 'center', wordart: 'neon', wordartColor: RED }), A('zoom-in', { start: 'afterPrev', duration: 600 })),
        text('Ante la sospecha, no esperes a que se pase', 90, 450, 1100, 60, { fontSize: 36, color: FG, textAlign: 'center' }),
        text('Información general con fines docentes. Ante cualquier síntoma, llama a emergencias.', 90, 530, 1100, 40, { fontSize: 20, color: DIM, textAlign: 'center' }), ...hazard(640)],
        notes: 'Cierre con el número de emergencias en neón. Repetir la idea fuerza: anotar la hora de inicio de los síntomas.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Renal physiology as a blueprint: a grid, the nephron drawn as a plan, a drop that travels it, waterfall, clearance, water balance.
  sci_med_kidney: { name: 'Fisiología renal: la nefrona', cat: 'sci', summary: 'Plano técnico: nefrona que se dibuja, gota que la recorre con sonido, cotas, cascada, ecuación, tabla con fórmulas, botella 3D y ciclo', make: () => {
    const BP = '#0f3460', LINE = '#cfe3ff', CY = '#7fd1ff', YEL = '#ffd166', FG = '#eaf3ff', DIM = '#9fb8d9', H = pairStacks('tech').heading;
    const GRID = svgURL(1280, 720, (() => { let a = '', b = ''; for (let x = 0; x <= 1280; x += 40) (x % 200 ? (s => { a += s; }) : (s => { b += s; }))(`M${x} 0V720`);
      for (let y = 0; y <= 720; y += 40) (y % 200 ? (s => { a += s; }) : (s => { b += s; }))(`M0 ${y}H1280`);
      return `<path d="${a}" stroke="#ffffff" stroke-opacity=".07"/><path d="${b}" stroke="#ffffff" stroke-opacity=".16"/>`; })(), BP);
    const P = { back: [img(GRID, 0, 0, 1280, 720, 'Fondo de plano con cuadrícula', { decorative: true })] };
    const block = (t, x = 880, y = 610) => [shape('rect', x, y, 340, 70, 'none', { stroke: LINE, strokeWidth: 2 }), line(x, y + 30, x + 340, y + 30, LINE, 1), line(x + 220, y + 30, x + 220, y + 70, LINE, 1),
      text(t, x + 10, y + 3, 320, 26, { fontFamily: MONO, fontSize: 14, color: FG, letterSpacing: 1 }), text('ESCALA 1:∞', x + 10, y + 38, 200, 26, { fontFamily: MONO, fontSize: 14, color: DIM }), text('HOJA 3/9', x + 230, y + 38, 100, 26, { fontFamily: MONO, fontSize: 14, color: DIM })];
    const note = (t, x, y, w, h, props = {}) => text(t, x, y, w, h, { fontFamily: MONO, fontSize: 18, color: FG, ...props });
    // The nephron as a plan, shifted by (dx, dy): capsule, proximal tubule, loop of Henle, distal tubule, collecting duct.
    const zig = (x1, x2, y, n, a) => Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y + (i % 2 ? -a : a)]);
    const NEPH = [[262, 262], ...zig(280, 420, 250, 6, 16), [440, 300], [450, 450], [462, 590], [490, 622], [520, 590], [530, 450], [540, 320], ...zig(560, 700, 300, 6, 14), [740, 280], [790, 270], [800, 330], [800, 480], [800, 640]];
    const neph = (dx = 0, dy = 0, props = {}) => ink(NEPH.map(([x, y]) => [x + dx, y + dy]), LINE, 6, props);
    const glom = (dx = 0, dy = 0) => [ring(220 + dx, 262 + dy, 54, LINE, { strokeWidth: 4 }),
      ink(Array.from({ length: 30 }, (_, i) => { const a = i * 0.9; return [220 + dx + (10 + (i % 5) * 6) * Math.cos(a), 262 + dy + (10 + (i % 5) * 6) * Math.sin(a)]; }), '#ff8fa3', 3)];
    const dim = (x1, x2, y, t, c = CY) => [line(x1, y, x2, y, c, 2), line(x1, y - 12, x1, y + 12, c, 2), line(x2, y - 12, x2, y + 12, c, 2), text(t, x1, y - 44, x2 - x1, 34, { fontFamily: MONO, fontSize: 18, color: c, textAlign: 'center' })];
    return numbered(build({ name: 'Fisiología renal: la nefrona', palette: 'ocean', fonts: 'tech', title: { color: FG, size: 44 }, body: { color: FG } }, [
      { layout: 'blank', ...P, transition: 'fade', extra: [
        kicker('FISIOLOGÍA RENAL · PLANO', 90, 170, 480, YEL),
        text('La nefrona', 84, 216, 520, 130, { fontFamily: H, fontSize: 80, fontWeight: 700, color: FG }),
        text('Un filtro, un túbulo y un millón de copias por riñón', 90, 350, 520, 100, { fontSize: 30, color: DIM }),
        ...glom(420, 0).map(b => withAnims(b, A('fade-in', { start: 'afterPrev', duration: 500 }))),
        withAnims(neph(420, 0), A('draw', { start: 'afterPrev', duration: 2600 })),
        ...block('PLANO N.º 3 · NEFRONA', 90, 600)],
        notes: 'Portada de plano técnico: cuadrícula, cajetín abajo a la derecha y la nefrona, que se dibuja sola al llegar.' },
      { title: 'Las cotas del riñón', layout: 'titleOnly', ...P, extra: [
        ...[['1 millón', 'de nefronas en cada riñón', 90], ['180 L', 'de plasma filtrado al día', 470], ['1,5 L', 'de orina al día', 850]].map(([n, l, x], i) => [
          ...dim(x, x + 340, 260, `cota ${i + 1}`).map(b => anim(b, i + 1, 'fade-in')),
          anim(text(`<div style="font-family:${H};font-size:78px;font-weight:700;color:${i === 2 ? YEL : FG};line-height:1.1">${n}</div><div>${l}</div>`, x, 300, 340, 190, { fontSize: 26, color: DIM, textAlign: 'center' }), i + 1, 'zoom-in')]).flat(),
        anim(note('→ se reabsorbe más del 99 % de lo que se filtra', 90, 560, 1100, 40, { color: YEL, textAlign: 'center', fontSize: 24 }), 4, 'fade-in')],
        notes: 'Tres cifras con líneas de cota, como en un plano, una por clic. Valores de un adulto sano, redondeados.' },
      { title: 'Recorrido de una gota', layout: 'titleOnly', ...P, extra: [
        ...glom(-60, 0), neph(-60, 0),
        withAnims(sphere(202, 262, 14, '#ffffff', CY), path(rel(NEPH.map(([x, y]) => [x - 60, y])), { duration: 5200, ease: 'linear', sound: 'whoosh' })),
        ...[['Glomérulo: filtra', 70, 330], ['Túbulo proximal', 240, 170], ['Asa de Henle', 470, 640], ['Túbulo distal', 520, 230], ['Colector', 760, 640]].map(([t, x, y], i) =>
          withAnims(note(t, x, y, 220, 30, { color: YEL }), A('fade-in', { start: 'afterPrev', duration: 300 }))),
        text(ul('Proximal: recupera dos tercios del agua y del sodio, y toda la glucosa', 'Asa: crea el gradiente que concentra la orina', 'Distal y colector: ajuste fino con hormonas'), 860, 170, 340, 460, { fontSize: 22, color: FG, lineHeight: 1.45 })],
        notes: 'Un clic suelta la gota, que recorre la nefrona entera (trayectoria con sonido); después aparecen los nombres de cada tramo, encadenados.' },
      { title: 'De 180 litros a 1,5', layout: 'titleOnly', ...P, extra: [
        chartBlock({ x: 80, y: 160, w: 1120, h: 470, chartType: 'waterfall', color: CY, dataLabels: true, yTitle: 'Litros al día', labelColor: FG,
          data: [{ label: 'Filtrado', value: 180 }, { label: 'Túbulo proximal', value: -117 }, { label: 'Asa de Henle', value: -36 }, { label: 'Distal y colector', value: -25.5 }, { label: 'Orina', value: 0 }] }),
        note('Valores redondeados de un adulto; el colector ajusta según la hormona antidiurética.', 80, 640, 1120, 30, { fontSize: 16, color: DIM })],
        notes: 'Gráfico de cascada: cada tramo resta lo que reabsorbe y la última barra es lo que queda, la orina.' },
      { title: 'Aclaramiento: medir el filtro', layout: 'titleOnly', ...P, extra: [
        mathBlock({ x: 90, y: 180, w: 620, h: 150, fontSize: 56, color: FG, latex: 'C_x = \\frac{U_x \\cdot V}{P_x}' }),
        anim(mathBlock({ x: 90, y: 370, w: 620, h: 130, fontSize: 40, color: CY, latex: 'C_{cr} = \\frac{125 \\cdot 1}{1} = 125\\ \\text{mL/min}' }), 1, 'fade-up'),
        anim(note('U = 125 mg/dL en orina · V = 1 mL/min · P = 1 mg/dL en plasma', 90, 520, 620, 60, { color: DIM }), 1, 'fade-up'),
        anim(shape('rounded', 780, 190, 410, 300, '#0b2747', { radius: 14, stroke: YEL, strokeWidth: 2 }), 2, 'zoom-in'),
        anim(text(`<div style="font-family:${H};font-size:70px;font-weight:700;color:${YEL}">≈ TFG</div>La creatinina se filtra y apenas se secreta, así que su aclaramiento se acerca a la tasa de filtrado glomerular.`, 810, 210, 350, 260, { fontSize: 22, color: FG, lineHeight: 1.4 }), 2, 'fade-in')],
        notes: 'La fórmula general, un ejemplo con números redondos y la conclusión. En la práctica la TFG se estima con ecuaciones que usan la creatinina en sangre.' },
      { title: 'Balance de agua en un día', layout: 'titleOnly', ...P, extra: [
        tableBlock({ x: 90, y: 170, w: 760, h: 400, fontSize: 23, header: true, headBg: CY, headFg: BP, stroke: '#3d6aa3', lines: true,
          rows: [['Entradas', 'mL', 'Salidas', 'mL'], ['Bebida', '1500', 'Orina', '1500'], ['Agua de los alimentos', '800', 'Piel y pulmones', '900'], ['Agua metabólica', '300', 'Heces', '200'], ['<b>Total</b>', '=SUMA(B2:B4)', '<b>Total</b>', '=SUMA(D2:D4)'], ['<b>Balance</b>', '=B5-D5', '', '']], colW: [5, 2, 4, 2] }),
        note('Totales y balance calculados con fórmulas.', 90, 585, 760, 30, { fontSize: 16, color: DIM }),
        m3d('kh-WaterBottle', 900, 150, 300, 480, { autoRotate: true, spin: 20, view: 'three' })],
        notes: 'Tabla con =SUMA y una resta: si se cambia una cifra, el balance se recalcula. La botella 3D gira sola. Cifras orientativas de un adulto en clima templado.' },
      { title: 'Cuando baja la presión', layout: 'titleOnly', ...P, transition: 'concave', extra: [
        dg('cycle', 'Baja la presión\nEl riñón libera renina\nSe forma angiotensina II\nSe libera aldosterona\nSe retienen sodio y agua\nSube la presión', 190, 160, 900, 490, { colors: 'colorful', oneByOne: true })],
        notes: 'Ciclo del sistema renina-angiotensina-aldosterona, paso a paso. Es la diana de varios grupos de fármacos antihipertensivos.' },
      { layout: 'blank', ...P, extra: [pollBlock({ kind: 'quiz', fontSize: 38, x: 60, y: 50, w: 1160, h: 620, time: 20, correct: [0],
        question: '¿Dónde se reabsorbe la mayor parte del sodio filtrado?', options: ['Túbulo proximal', 'Asa de Henle', 'Túbulo distal', 'Conducto colector'] })],
        notes: 'Concurso con 20 segundos. Respuesta: el túbulo proximal, alrededor de dos tercios.' },
      { layout: 'blank', ...P, transition: 'zoom', extra: [
        text('Fin del plano', 90, 200, 1100, 130, { fontFamily: H, fontSize: 110, fontWeight: 700, color: FG, textAlign: 'center' }),
        text('Próxima hoja: equilibrio ácido-base', 90, 350, 1100, 50, { fontSize: 30, color: YEL, textAlign: 'center' }),
        ...dim(340, 940, 470, 'TFG ≈ 125 mL/min', YEL),
        ...block('REVISADO · DOCENCIA DE 2.º')],
        notes: 'Cierre con el cajetín «revisado». Todas las cifras son aproximadas y con fines docentes.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Glucose and insulin like a continuous glucose monitor app: dark violet, a phone, a feedback cycle, curves, HbA1c in a table.
  sci_med_glucose: { name: 'Endocrinología: glucosa e insulina', cat: 'sci', summary: 'Estilo app de sensor de glucosa: móvil con la pantalla, ciclo uno a uno, curvas, dona, tabla con fórmulas, ecuación, aguacate 3D y votación', make: () => {
    const BG = '#1b1030', CARD = '#2a1a4a', VIO = '#9b5de5', PINK = '#f15bb5', MINT = '#00f5d4', YEL = '#fee440', FG = '#f3eefe', DIM = '#b7a8d6', H = pairStacks('friendly').heading;
    // The sensor app: today's glucose with the 70–180 band, the arrow and the time in range.
    const pts = Array.from({ length: 49 }, (_, i) => { const t = i / 2; return 105 + 55 * Math.exp(-((t - 8.5) ** 2) / 1.5) + 70 * Math.exp(-((t - 14.5) ** 2) / 2) + 45 * Math.exp(-((t - 21.5) ** 2) / 1.8) - 12 * Math.sin(t / 3); });
    const Y = v => 470 - (v - 40) * 1.2;
    const cgm = svgURL(360, 720, `<rect width="360" height="720" fill="#140b26"/>` + ST(24, 60, 18, DIM, 'Hoy · 14:32') + ST(24, 150, 84, FG, '112', ' font-weight="700"') + ST(190, 150, 22, DIM, 'mg/dL')
      + `<path d="M300 110 l26 0 m-10 -10 l10 10 l-10 10" stroke="${MINT}" stroke-width="5" fill="none"/>` + ST(24, 190, 18, MINT, 'Estable · en rango')
      + `<rect x="16" y="${Y(180)}" width="328" height="${Y(70) - Y(180)}" fill="${MINT}" opacity=".12"/>`
      + `<path d="${pts.map((v, i) => (i ? 'L' : 'M') + (16 + i * 6.8).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')}" stroke="${PINK}" stroke-width="4" fill="none"/>`
      + ST(24, 510, 15, DIM, '0 h') + ST(300, 510, 15, DIM, '24 h') + ST(24, 570, 18, FG, 'Tiempo en rango', ' font-weight="700"')
      + `<rect x="24" y="590" width="312" height="22" rx="11" fill="#3a2a5c"/><rect x="24" y="590" width="${312 * 0.78}" height="22" rx="11" fill="${MINT}"/>` + ST(24, 650, 32, MINT, '78 %', ' font-weight="700"') + ST(130, 648, 16, DIM, 'objetivo: más del 70 %'));
    const drop = (x, y, s, c, rot = 0) => shape('teardrop', x, y, s, s, c, { fill2: '#ffffff', gradType: 'radial', rotation: rot, opacity: 85 });
    const bars = [['Por debajo', 4, PINK], ['En rango', 78, MINT], ['Por encima', 18, YEL]];
    return numbered(build({ name: 'Glucosa e insulina', palette: 'violet', fonts: 'friendly', title: { color: FG, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        shape('rect', 0, 0, 1280, 720, '#2b1257', { fill2: BG, gradType: 'radial' }),
        glow(700, -120, 640, PINK, BG, 35),
        kicker('ENDOCRINOLOGÍA · FISIOLOGÍA Y CLÍNICA', 90, 190, 620, MINT),
        text('Glucosa<br>e insulina', 84, 230, 640, 230, { fontFamily: H, fontSize: 92, fontWeight: 700, color: FG, lineHeight: 1.05 }),
        text('El equilibrio que el páncreas ajusta en cada comida', 90, 470, 560, 90, { fontSize: 28, color: DIM }),
        drop(700, 140, 70, PINK, 20), drop(1160, 520, 54, VIO, -15), drop(660, 520, 40, MINT, 10),
        withAnims(device(cgm, 'phone', 860, 70, 290, 580, 'App ficticia de un sensor continuo de glucosa', { rotation: 5 }), A('fade-up', { start: 'afterPrev', duration: 800 }))],
        notes: 'Portada con la pantalla (dibujada en SVG) de una app ficticia de sensor de glucosa dentro de un móvil, que sube sola al llegar. Las gotas son formas «lágrima» con degradado.' },
      { title: 'Un termostato hormonal', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Comes\nSube la glucosa\nEl páncreas libera insulina\nLas células captan glucosa\nBaja la glucosa\nEn ayunas: glucagón', 90, 160, 760, 500, { colors: 'colorful', oneByOne: true }),
        card(`<div style="font-family:${H};font-size:30px;font-weight:700;color:${MINT}">Insulina</div>abre la puerta de las células a la glucosa<div style="font-family:${H};font-size:30px;font-weight:700;color:${PINK};margin-top:22px">Glucagón</div>saca glucosa de las reservas del hígado`, 880, 200, 320, 390, CARD, { fontSize: 22, color: FG })],
        notes: 'Ciclo uno a uno. Las dos hormonas del páncreas funcionan como un termostato con dos mandos opuestos.' },
      { title: 'Sobrecarga oral de glucosa', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 170, w: 780, h: 460, chartType: 'line', color: MINT, grid: true, xTitle: 'Minutos tras 75 g de glucosa', yTitle: 'mg/dL', seriesName: 'Sin diabetes',
          data: [0, 30, 60, 90, 120].map((m, i) => ({ label: String(m), value: [85, 140, 125, 108, 95][i] })), series: [{ name: 'Diabetes tipo 2', values: [135, 215, 255, 245, 225], color: PINK }] }),
        anim(text(`<div style="font-family:${H};font-size:56px;font-weight:700;color:${PINK};line-height:1.1">≥ 200</div>mg/dL a las 2 horas es uno de los criterios diagnósticos de diabetes`, 900, 210, 300, 230, { fontSize: 23, color: FG }), 1, 'fade-left'),
        anim(text('Curvas ilustrativas de dos personas ficticias.', 900, 470, 300, 80, { fontSize: 19, color: DIM }), 2, 'fade-in')],
        notes: 'Dos series en líneas. Los criterios diagnósticos reales combinan varias pruebas y siempre los valora un profesional.' },
      { title: 'Tipo 1 y tipo 2', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        chartBlock({ x: 70, y: 170, w: 400, h: 460, chartType: 'doughnut', color: VIO, labelColor: FG,
          data: [{ label: 'Tipo 2', value: 90, color: VIO }, { label: 'Tipo 1', value: 8, color: MINT }, { label: 'Otras', value: 2, color: YEL }] }),
        tableBlock({ x: 510, y: 180, w: 700, h: 420, fontSize: 22, header: true, headBg: VIO, headFg: '#ffffff', stroke: '#45336b', banded: true, band: VIO,
          rows: [['', 'Tipo 1', 'Tipo 2'], ['Causa', 'Autoinmune: se pierden las células β', 'Resistencia a la insulina'], ['Edad típica', 'Infancia y juventud', 'Adultos'], ['Inicio', 'Brusco', 'Lento, a menudo sin síntomas'], ['Tratamiento base', 'Insulina siempre', 'Estilo de vida y fármacos']], colW: [3, 4, 4] })],
        notes: 'Proporciones aproximadas. La tabla resume las diferencias clásicas; hay formas intermedias.' },
      { title: 'Del pinchazo al sensor', layout: 'titleOnly', bg: BG, extra: [
        device(cgm, 'phone', 90, 160, 250, 500, 'App ficticia de un sensor continuo de glucosa'),
        text('Un sensor bajo la piel mide la glucosa del líquido intersticial cada pocos minutos y la envía al móvil.', 400, 180, 800, 100, { fontSize: 26, color: FG, lineHeight: 1.4 }),
        ...bars.map(([l, v, c], i) => [
          text(l, 400, 320 + i * 100, 220, 40, { fontSize: 24, color: DIM }),
          shape('rounded', 620, 324 + i * 100, 480, 30, '#3a2a5c', { radius: 15 }),
          withAnims(shape('rounded', 620, 324 + i * 100, Math.max(30, 480 * v / 100), 30, c, { radius: 15 }), A('grow', { start: i ? 'afterPrev' : 'click', duration: 500 })),
          withAnims(text(v + ' %', 1110, 318 + i * 100, 100, 40, { fontSize: 26, fontWeight: 700, color: c }), A('fade-in', { start: 'withPrev' }))]).flat()],
        notes: 'Un clic y las tres barras del «tiempo en rango» crecen una tras otra. Ejemplo ficticio; los objetivos los fija cada equipo con su paciente.' },
      { title: 'La HbA1c: la memoria de 3 meses', layout: 'titleOnly', bg: BG, extra: [
        mathBlock({ x: 90, y: 170, w: 640, h: 120, fontSize: 40, color: FG, latex: '\\bar{G}\\,(\\text{mg/dL}) = 28{,}7 \\cdot \\text{HbA1c} - 46{,}7' }),
        tableBlock({ x: 90, y: 320, w: 640, h: 320, fontSize: 24, header: true, headBg: PINK, headFg: '#ffffff', stroke: '#45336b', lines: true,
          rows: [['HbA1c (%)', 'Glucosa media estimada (mg/dL)'], ...[5, 6, 7, 8, 9].map((v, i) => [String(v), `=REDONDEAR(28,7*A${i + 2}-46,7;0)`])], colW: [2, 4] }),
        card('La hemoglobina se «azucara» según la glucosa media de los últimos 2–3 meses: por eso no cambia con una sola comida.', 780, 200, 420, 300, CARD, { fontSize: 25, color: FG, lineHeight: 1.45 }),
        text('La columna de la derecha es una fórmula.', 780, 540, 420, 40, { fontSize: 19, color: DIM })],
        notes: 'Ecuación de estimación de la glucosa media a partir de la HbA1c y una tabla que la aplica con fórmulas.' },
      { title: 'Índice glucémico de algunos alimentos', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 80, y: 170, w: 720, h: 460, chartType: 'hbar', color: VIO, dataLabels: true, seriesName: 'Índice glucémico',
          data: [['Pan blanco', 75, PINK], ['Arroz blanco', 73, PINK], ['Plátano', 51, YEL], ['Manzana', 36, MINT], ['Lentejas', 32, MINT], ['Aguacate', 15, MINT]].map(([label, value, color]) => ({ label, value, color })) }),
        m3d('kh-Avocado', 860, 180, 320, 360, { autoRotate: true, spin: 30, view: 'three', motion: 'zoom' }),
        text('Valores aproximados: cambian con la variedad, la cocción y lo que se come a la vez.', 850, 560, 360, 80, { fontSize: 18, color: DIM })],
        notes: 'Barras horizontales con color por barra y un aguacate 3D que se acerca al llegar y gira. No es una recomendación dietética.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', fontSize: 32, x: 80, y: 50, w: 1120, h: 620, question: '¿Cuáles de estos factores de riesgo de diabetes tipo 2 se pueden modificar?',
        options: ['Sedentarismo', 'Antecedentes familiares', 'Exceso de peso abdominal', 'Edad', 'Dieta rica en ultraprocesados'] })],
        notes: 'Votación de respuesta múltiple. Modificables: sedentarismo, peso y dieta; la edad y la familia no.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(340, 60, 600, VIO, BG, 45),
        text('Equilibrio, no perfección', 90, 230, 1100, 120, { fontFamily: H, fontSize: 76, fontWeight: 700, color: FG, textAlign: 'center' }),
        text('Próxima clase: complicaciones crónicas de la diabetes', 90, 370, 1100, 50, { fontSize: 28, color: MINT, textAlign: 'center' }),
        text('Información general con fines docentes; no sustituye la consulta con un profesional sanitario.', 90, 560, 1100, 40, { fontSize: 19, color: DIM, textAlign: 'center' }),
        drop(240, 470, 50, PINK, 15), drop(990, 140, 64, MINT, -20)],
        notes: 'Cierre. El aguacate 3D es CC0 y no necesita crédito.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Antibiotic resistance on a Petri dish: colonies that pop up, exponential growth, selection told with Transform, an antibiogram.
  sci_med_micro: { name: 'Microbiología: resistencia antibiótica', cat: 'sci', summary: 'Placas de Petri: colonias que brotan con sonido, crecimiento exponencial, selección contada con Transformar, antibiograma, radial y nube', make: () => {
    const BG = '#1c1512', AGAR = '#e9b44c', AGAR2 = '#9a5d14', COL = '#fff1cf', RES = '#e4572e', ABX = '#5fb3e8', FG = '#fff4ec', DIM = '#c9b4a3', H = pairStacks('modern').heading;
    const dish = (cx, cy, r) => [shape('ellipse', cx - r - 14, cy - r - 14, (r + 14) * 2, (r + 14) * 2, '#ffffff', { opacity: 14, stroke: '#ffffff', strokeWidth: 2 }),
      shape('ellipse', cx - r, cy - r, r * 2, r * 2, AGAR, { fill2: AGAR2, gradType: 'radial', opacity: 95 }), shape('ellipse', cx - r * 0.7, cy - r * 0.85, r * 0.6, r * 0.25, '#ffffff', { opacity: 18, rotation: -25 })];
    // Bacteria in the dish (fixed points), four of them resistant.
    const RC = rng(99), R = rng(23), CX = 640, CY = 410, RAD = 230;
    const pop = Array.from({ length: 44 }, (_, i) => { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * (RAD - 30); return { id: uid(), x: CX + d * Math.cos(a), y: CY + d * Math.sin(a), res: [5, 17, 28, 39].includes(i) }; });
    const bug = (b, s = 22, props = {}) => ({ ...shape('ellipse', b.x - s / 2, b.y - s / 2, s, s, b.res ? RES : COL, { stroke: b.res ? '#8a1f0a' : '#b08a4a', strokeWidth: 1.5, ...props }), id: b.id });
    const kids = pop.filter(b => b.res).flatMap((b, k) => Array.from({ length: 6 }, (_, j) => { const a = j / 6 * Math.PI * 2 + k; return { x: b.x + 40 * Math.cos(a), y: b.y + 40 * Math.sin(a), res: true }; }));
    const caption = (t, c = FG) => text(t, 90, 640, 1100, 40, { fontSize: 24, color: c, textAlign: 'center' });
    const discs = [['AMP', 6, 'R'], ['CTX', 27, 'S'], ['CIP', 12, 'R'], ['GEN', 19, 'S'], ['IMP', 30, 'S'], ['SXT', 8, 'R']];
    return numbered(build({ name: 'Resistencia a los antibióticos', palette: 'warm', fonts: 'modern', title: { color: FG, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(620, 40, 680, '#5a3416', BG, 50), ...dish(940, 360, 270),
        ...Array.from({ length: 30 }, (_, i) => { const r = RC, a = r() * 6.283, d = Math.sqrt(r()) * 230, s = 10 + r() * 22;
          return withAnims(shape('ellipse', 940 + d * Math.cos(a) - s / 2, 360 + d * Math.sin(a) - s / 2, s, s, i % 9 ? COL : RES, { stroke: '#b08a4a', strokeWidth: 1 }), A('zoom-in', { start: 'afterPrev', duration: 140, ...(i % 6 ? {} : { sound: 'pop' }) })); }),
        kicker('MICROBIOLOGÍA CLÍNICA', 90, 190, 560, AGAR),
        text('Bacterias<br>que se<br>defienden', 84, 230, 560, 330, { fontFamily: H, fontSize: 88, fontWeight: 800, color: FG, lineHeight: 1.02 }),
        text('Por qué los antibióticos dejan de funcionar', 90, 575, 560, 50, { fontSize: 26, color: DIM })],
        notes: 'Portada con una placa de Petri hecha de elipses con degradado; las colonias brotan solas al llegar, con algún «pop».' },
      { title: 'Crecer al doble cada 20 minutos', layout: 'titleOnly', bg: BG, extra: [
        mathBlock({ x: 90, y: 180, w: 480, h: 120, fontSize: 52, color: FG, latex: 'N(t) = N_0 \\cdot 2^{\\,t/g}' }),
        text('g: tiempo de generación (unos 20 minutos para algunas bacterias en condiciones ideales)', 90, 310, 480, 90, { fontSize: 21, color: DIM }),
        withAnims(text(`<div style="font-family:${H};font-size:58px;font-weight:800;color:${AGAR};line-height:1.05">1 → 16 millones</div>en solo 8 horas (2<sup>24</sup>)`, 90, 430, 520, 180, { fontSize: 26, color: FG }), A('zoom-in', { sound: 'drumroll', duration: 800 })),
        chartBlock({ x: 620, y: 170, w: 580, h: 460, chartType: 'line', color: AGAR, grid: true, xTitle: 'Horas', yTitle: 'log₁₀ del número de bacterias', seriesName: 'log₁₀ N',
          data: Array.from({ length: 9 }, (_, h) => ({ label: String(h), value: +(h * 3 * Math.log10(2)).toFixed(1) })) })],
        notes: 'Crecimiento exponencial: en escala logarítmica es una recta. Un clic hace la cuenta (con redoble). En el cuerpo crecen más despacio que en el laboratorio.' },
      { title: 'Una población diversa', layout: 'titleOnly', bg: BG, extra: [
        ...dish(CX, CY, RAD), ...pop.map(b => bug(b)),
        caption(`Por azar, unas pocas bacterias llevan un gen de resistencia (<b style="color:${RES}">en rojo</b>).`)],
        notes: 'Primera de tres diapositivas con Transformar: cada bacteria es el mismo objeto en las tres.' },
      { title: 'Llega el antibiótico', layout: 'titleOnly', bg: BG, autoAnimate: true, extra: [
        ...dish(CX, CY, RAD), shape('ellipse', CX - RAD, CY - RAD, RAD * 2, RAD * 2, ABX, { opacity: 22 }),
        ...pop.map(b => (b.res ? bug(b, 24) : bug(b, 10, { opacity: 30 }))),
        caption('Las sensibles mueren; las resistentes siguen ahí.', DIM)],
        notes: 'Transformar: las bacterias sensibles se encogen y se apagan; la placa se tiñe del antibiótico.' },
      { title: 'Sobreviven… y se multiplican', layout: 'titleOnly', bg: BG, autoAnimate: true, transition: 'none', extra: [
        ...dish(CX, CY, RAD), ...pop.filter(b => b.res).map(b => bug(b, 26)),
        ...kids.map(b => withAnims(bug({ ...b, id: uid() }, 20), A('zoom-in', { start: 'afterPrev', duration: 90 }))),
        caption(`El antibiótico no crea la resistencia: <b style="color:${AGAR}">la selecciona</b>.`)],
        notes: 'Tercera Transformar: las muertas desaparecen y las resistentes se multiplican solas, una tras otra. Por eso usar antibióticos cuando no hacen falta tiene un coste para todos.' },
      { title: 'El antibiograma', layout: 'titleOnly', bg: BG, extra: [
        ...dish(340, 420, 230),
        ...discs.map(([n, mm, r], i) => { const a = i / 6 * Math.PI * 2 - Math.PI / 2, x = 340 + 140 * Math.cos(a), y = 420 + 140 * Math.sin(a), halo = 26 + mm * 2.2;
          return [anim(shape('ellipse', x - halo, y - halo, halo * 2, halo * 2, '#fff8e6', { opacity: 45 }), 1, 'grow'), shape('ellipse', x - 24, y - 24, 48, 48, '#ffffff', { stroke: '#aaaaaa', strokeWidth: 1 }),
            text(n, x - 24, y - 12, 48, 24, { fontSize: 13, fontWeight: 700, color: '#333333', textAlign: 'center' })]; }).flat(),
        tableBlock({ x: 640, y: 180, w: 560, h: 400, fontSize: 22, header: true, headBg: AGAR, headFg: BG, stroke: '#5a4030', lines: true,
          rows: [['Disco', 'Halo (mm)', 'Corte (mm)', 'Resultado'], ...discs.map(([n, mm, r], i) => [n, String(mm), String([14, 20, 21, 15, 22, 11][i]), r === 'S' ? 'Sensible' : 'Resistente'])], colW: [2, 2, 2, 3],
          cellBg: Object.fromEntries(discs.map(([, , r], i) => [`${i + 1},3`, r === 'S' ? '#2f6b3a' : '#8a2a17'])) }),
        text('Datos inventados. Los puntos de corte reales dependen de la bacteria y de las normas del laboratorio.', 640, 600, 560, 60, { fontSize: 18, color: DIM })],
        notes: 'Discos de seis antibióticos (abreviaturas habituales) con su halo de inhibición, que crece con un clic. Cuanto mayor el halo, más sensible. La tabla colorea sensible y resistente.' },
      { title: 'Cómo se defienden', layout: 'titleOnly', bg: BG, transition: 'convex', extra: [
        dg('radial', 'Resistencia\n  Enzimas que destruyen el fármaco\n  Cambiar la diana\n  Bombas que lo expulsan\n  Cerrar la puerta: menos permeables\n  Compartir genes con otras', 190, 160, 900, 490, { colors: 'colorful', oneByOne: true })],
        notes: 'Diagrama radial uno a uno. El último punto, la transferencia horizontal de genes (plásmidos), explica por qué la resistencia se extiende tan deprisa.' },
      { title: 'Una carrera de casi un siglo', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', '1928\n  Se descubre la penicilina\n1940s\n  Uso clínico generalizado\n1960s\n  Primeros estafilococos resistentes a meticilina\n1990s\n  Muy pocas familias nuevas\nHoy\n  Planes de «una sola salud»', 90, 180, 1100, 300, { colors: 'accent', oneByOne: true }),
        anim(text('La resistencia aparece casi siempre pocos años después de que un antibiótico se empiece a usar.', 140, 520, 1000, 80, { fontSize: 26, color: AGAR, textAlign: 'center' }), 6, 'fade-up')],
        notes: 'Cronología que aparece hito a hito; el último clic da la idea principal.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: '¿Qué palabra asocias con el buen uso de los antibióticos?', options: [] })],
        notes: 'Nube de palabras en directo para cerrar la discusión.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        ...dish(640, 360, 300).map(b => ({ ...b, opacity: 30 })),
        text('Solo cuando hacen falta,<br>como se indican', 90, 230, 1100, 200, { fontFamily: H, fontSize: 64, fontWeight: 800, color: FG, textAlign: 'center', lineHeight: 1.15 }),
        text('Información general con fines docentes. Los antibióticos solo con prescripción.', 90, 470, 1100, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Cierre sobre una placa en penumbra. Mensaje de salud pública, sin recomendaciones individuales.' },
    ]));
  } },
};
